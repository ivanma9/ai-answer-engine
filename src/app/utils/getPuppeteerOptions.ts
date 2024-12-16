import chromium from "@sparticuz/chromium-min";

const executablePath = await chromium.executablePath(
  `https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar`
);
const getPuppeteerOptions = async () => {
  return {
    args: [
      ...chromium.args,
      "--hide-scrollbars",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
      "--disable-font-subpixel-positioning",
      "--disable-font-antialiasing",
      "--no-first-run",
      "--disable-features=site-per-process",
      "--disable-features=IsolateOrigins",
      "--disable-features=site-isolation",
      "--force-color-profile=srgb",
      "--disable-remote-fonts",
      "--disable-features=FontAccess",
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
    ignoreDefaultArgs: ["--disable-extensions"],
  };
};
export async function launchPuppeteer() {
  if (process.env.NODE_ENV === "development") {
    console.log("Launching puppeteer on development");
    const puppeteer = await import("puppeteer");
    return await puppeteer.launch({
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // Adjust the path if necessary
    });
  } else {
    console.log("Getting puppeteer options on production with puppeteer-core");
    const puppeteer = await import("puppeteer-core");

    // Log version information
    console.log(`Node version: ${process.version}`);

    console.log("Getting puppeteer options on production");
    const launchOptions = await getPuppeteerOptions();
    console.log("Launching puppeteer-core browser on production");
    return await puppeteer.launch(launchOptions);
  }
}
