import { Command } from "commander";
import puppeteer from "puppeteer";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import camelCase from "lodash/camelCase.js";

import { loadCookies, hasSession } from "../utils/session.js";
import {
  TCGCollectorScrapedData,
  tcgCollectorScraper,
} from "../scrapers/tcgCollectorScraper.js";

export function saveCsv(data: TCGCollectorScrapedData, outputFile: string) {
  const { cards } = data;

  // Get all unique variants across all cards
  const variantSet = new Set<string>();
  cards.forEach((card) => {
    card.variants.forEach((v) => variantSet.add(v.trim()));
  });
  const variants = Array.from(variantSet);

  // Define CSV header
  const header = ["Card Name", "Number", "Rarity", "Energy Type", ...variants];

  // Build CSV rows
  const rows = cards.map((card) => {
    const base = [card.name, card.number, card.rarity, card.energyType];
    const variantFlags = variants.map((variant) =>
      card.variants.includes(variant) ? "true" : "false"
    );
    return [...base, ...variantFlags];
  });

  // Combine into CSV string
  const csvString = [header, ...rows]
    .map((row) =>
      row
        .map((cell) =>
          typeof cell === "string" && cell.includes(",")
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        )
        .join(",")
    )
    .join("\n");

  // Save CSV
  const outDir = path.dirname(outputFile);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outputFile, csvString, "utf8");
  console.log(chalk.green(`✅ CSV saved: ${outputFile}`));
}

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
      const fileName = camelCase(`${scrapedData.name}scrape`) + ".json";
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
