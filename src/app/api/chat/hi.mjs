import puppeteer from "puppeteer";
import axios from "axios";
import * as cheerio from "cheerio";

async function scrapeUrl(url) {
  // const browser = await puppeteer.launch();
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // Adjust the path if necessary
  });
  const page = await browser.newPage();
  await page.goto(url);
  const content = await page.content();
  await browser.close();
  // return content;
}

export async function getTextFromUrl(url) {
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
// const url = "https://cheerio.js.org/docs/basics/loading";
// // await scrapeUrl(url);
// console.log(await getText(url));

async function searchBrowser(message) {
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // Adjust the path if necessary
  });
  const page = await browser.newPage();
  const encoded_message = encodeURIComponent(message);
  await page.goto("https://google.com/search?q=" + encoded_message);

  // Search for the message
  const links = await page.$$eval("a:has(br)", links =>
    links.map((link, index) => {
      const h3 = link.querySelector("h3"); // Select the first <h3> tag within the <a> tag
      return {
        url: link.href,
        title: h3 ? h3.innerText : "", // Get the inner text of the <h3> if it exists
        result_number: index,
      };
    })
  );
  console.log(links);
  console.log(links.length);

  await browser.close();
}

import fs from "fs";

fs.writeFileSync("sample.md", "Your text here");

searchBrowser("bfs");
