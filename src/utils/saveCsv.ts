import path from "path";
import fs from "node:fs";

import { TCGCollectorScrapedData } from "../scrapers/tcgCollectorScraper.js";
import chalk from "chalk";

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
