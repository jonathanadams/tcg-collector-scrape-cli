import { Command } from "commander";
import puppeteer from "puppeteer";
import chalk from "chalk";
import fs from "fs";
import path from "path";

import { loadCookies, hasSession } from "../utils/session.js";
import { tcgCollectorScraper } from "../scrapers/tcgCollectorScraper.js";
import { saveCsv } from "../utils/saveCsv.js";

export const scrapeCommand = new Command("run")
  .argument("<url>", "URL to scrape")
  .requiredOption(
    "-o, --output <path>",
    "Output path (file or directory, required)"
  )
  .description("Scrape the desired page")
  .action(async (url: string, options: { output: string }) => {
    if (!options.output) {
      console.error(chalk.red("Error: --output option is required"));
      process.exit(1);
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    if (hasSession()) {
      const cookies = loadCookies();
      if (cookies)
        await browser.setCookie(
          ...(cookies as any),
          // Add a cookie to ensure displayed as list
          {
            name: "cards_displayAs",
            value: "list",
            domain: "www.tcgcollector.com",
          }
        );
      console.log(chalk.cyan("Using saved session cookies..."));
    }

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    console.log(chalk.blue(`Navigating to ${url}...`));
    await page.goto(url, { waitUntil: "domcontentloaded" });

    console.log(chalk.blue("Beginning scrape..."));
    const scrapedData = await tcgCollectorScraper(page);

    // Determine save location and filename
    let outputPath = path.resolve(options.output);

    const stats = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;

    if (stats?.isDirectory()) {
      const dirName = outputPath;
      const fileName = `${scrapedData.name} Scrape` + ".json";
      outputPath = path.join(dirName, fileName);
    }

    // Ensure parent directory exists
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });

    // Write files
    // Save JSON
    fs.writeFileSync(outputPath, JSON.stringify(scrapedData, null, 2), "utf8");
    console.log(chalk.green(`✅ JSON saved: ${outputPath}`));

    // Also save CSV version
    const csvPath = outputPath.replace(/\.json$/i, ".csv");
    saveCsv(scrapedData, csvPath);

    await browser.close();
  });
