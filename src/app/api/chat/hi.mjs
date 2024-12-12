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
