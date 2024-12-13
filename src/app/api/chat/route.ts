// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import puppeteer from "puppeteer";
import axios from "axios";
import * as cheerio from "cheerio";
import { marked } from "marked";

function extractUrls(text: string): string[] {
  const urlRegex =
    /https?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/g;
  const urls = text.match(urlRegex);
  return urls || [];
}

async function getTextFromUrl(url: string) {
  try {
    const response = await axios.get(url);
    const content = response.data;
    const $ = cheerio.load(content);
    $("script").remove(); // Remove script tags
    return $.text().trim(); // Return the text content excluding script tags
  } catch (error) {
    console.error(`Error fetching HTML from ${url}: ${error}`);
    return "";
  }
}

async function getSummariesFromCache(urls: string[]) {
  // Look for urls in cache
  const cache: { [key: string]: string | undefined } = {};
  // Map each URL to its content in the cache or fetch the content if not in the cache
  const augmentedUrls = await Promise.all(
    urls.map(async url => {
      if (url in cache) {
        // If the URL is in the cache, return its content
        return { url, content: cache[url] };
      } else {
        // If the URL is not in the cache, fetch its content and update the cache
        const text = await getTextFromUrl(url);
        if (text === "") {
          return { url, content: "Could not fetch content" };
        }
        const summarizedText = await summarizeText(text);
        if (summarizedText) {
          // TODO: Add the summarized text to the cache
          cache[url] = text; // Update the cache with the new URL and its content
          return { url, content: summarizedText };
        }
        return { url, content: "Could not fetch content" };
      }
    })
  );
  return augmentedUrls;
}
const genAI = new GoogleGenerativeAI(process.env["GEMINI_API_KEY"] || "");

const summary_model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: "Summarize the text given to you\n",
});

const simple_answer_model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: "Answer the question given to you\n",
});

const answer_model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction:
    "You are a helpful assistant that can help shape the context to URLs given to you. A list of urls and URL Contexts will be provided to you. You should use the context to answer the Question. Please include citations of sources in your response. You can do this with hyperlinks within the response to the question. You can also include a section at the end of your response with the sources you used to answer the question. Give your response in markdown format.",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function summarizeText(contentText: string | undefined) {
  if (!contentText) {
    return "";
  }
  console.log("Starting summarization process...");
  const chatSession = summary_model.startChat({
    generationConfig,
    history: [],
  });

  const result = await chatSession.sendMessage(contentText);
  console.log("Summarization completed.");
  return result.response.text();
}

async function responseFromModel(
  model: GenerativeModel,
  query: string | undefined
) {
  if (!query) {
    return "";
  }
  console.log(`Processing query: ${query}`);
  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

  const result = await chatSession.sendMessage(query);
  console.log("Model response received.");
  return result.response.text();
}

async function searchBrowser(message: string) {
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // Adjust the path if necessary
  });
  const page = await browser.newPage();
  const encoded_message = encodeURIComponent(message);
  await page.goto("https://google.com/search?q=" + encoded_message);

  // Search for the message
  const urls = await page.$$eval("a:has(br)", links =>
    links.map(link => link.href)
  );
  console.log(urls);
  console.log(urls.length);

  await browser.close();
  return urls;
}

export async function POST(req: Request) {
  try {
    const res = await req.json();
    const { message } = res;
    console.log(message);
    const initialUrls = extractUrls(message);
    if (initialUrls.length === 0) {
      const isSimpleRequest = message.split(" ").length <= 5;
      if (isSimpleRequest) {
        console.log("This is a simple request.");
        const answer_model_response = await responseFromModel(
          simple_answer_model,
          message
        );
        return Response.json({
          response: answer_model_response,
        });
      } else {
        console.log("This query needs additional context.");
      }
    }
    const urls =
      initialUrls.length > 0 ? initialUrls : await searchBrowser(message);

    // Create a context string from the URL contents
    const urlContexts = (await getSummariesFromCache(urls))
      .map(
        (urlData: { url: string; content: string | undefined }) =>
          `URL: ${urlData.url}\nContent: ${urlData.content || "No content available"}`
      )
      .join("\n\n");

    // Combine the original message with URL contexts
    const augmentedMessage = `---Question---\n${message}\n\n--- URL Contexts ---\n${urlContexts}`;

    console.log(augmentedMessage);

    const answer_model_response = await responseFromModel(
      answer_model,
      augmentedMessage
    );
    console.log(answer_model_response);

    return Response.json({
      response: answer_model_response,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "An error occurred" });
  }
}
