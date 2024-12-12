// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer

import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import puppeteer from "puppeteer";
import axios from "axios";
import * as cheerio from "cheerio";

const client = new Groq({
  apiKey: process.env["GROQ_API_KEY"], // This is the default and can be omitted
});

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
    console.error(`Error fetching HTML: ${error}`);
  }
}

const apiKey = process.env["GEMINI_API_KEY"] as string;
const genAI = new GoogleGenerativeAI(apiKey);

const summary_model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: "Summarize the text given to you\n",
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
  const chatSession = summary_model.startChat({
    generationConfig,
    history: [],
  });

  const result = await chatSession.sendMessage(contentText);
  return result.response.text();
}

async function visitUrl(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  // const content = await page.content();
  await page.screenshot({ path: "amazing.png" });
  await browser.close();
  // return content;
}

export async function POST(req: Request) {
  try {
    const res = await req.json();
    const { message } = res;
    console.log(message);
    const urls = extractUrls(message);

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
          const summarized = await summarizeText(text);
          if (text) {
            cache[url] = text; // Update the cache with the new URL and its content
            return { url, content: text };
          }
          return { url, content: "Could not fetch content" };
        }
      })
    );

    // Create a context string from the URL contents
    const urlContexts = augmentedUrls
      .map(
        (urlData: { url: any; content: any }) =>
          `URL: ${urlData.url}\nContent: ${urlData.content}`
      )
      .join("\n\n");

    // Combine the original message with URL contexts
    const augmentedMessage = `${message}\n\n--- URL Contexts ---\n${urlContexts}`;

    const params: Groq.Chat.CompletionCreateParams = {
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that can help provide context to URLs given to you. If a question is asked, you should provide an answer with sources cited. Please include the URL in your response and explain the context of the URL from the user. A list of URLs is provided to you to help you understand the context of the user's question or to just research the user's question. If a URL is provided, you should visit the url and understand the context of this page. You should provide an answer about the context of the URLs.",
        },
        { role: "user", content: augmentedMessage },
      ],
      model: "llama3-70b-8192",
    };

    const chatCompletion: Groq.Chat.ChatCompletion =
      await client.chat.completions.create(params);

    return Response.json({
      response: chatCompletion.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "An error occurred" });
  }
}
