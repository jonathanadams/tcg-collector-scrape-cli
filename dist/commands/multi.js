import { Command } from "commander";
import inquirer from "inquirer";
import puppeteer from "puppeteer";
import chalk from "chalk";
import path from "path";
import fs from "node:fs";
import { runConcurrent } from "../utils/concurrency.js";
import { tcgCollectorScraper } from "../scrapers/tcgCollectorScraper.js";
import { saveCsv } from "../utils/saveCsv.js";
export const multiCommand = new Command("multi")
    .description("Select sets from TCGCollector and scrape each in its own folder")
    .requiredOption("-o, --output <path>", "Output root folder to save sets")
    .option("-c, --concurrency <n>", "How many sets to scrape at the same time", "3")
    .option("-f, --force", "Overwrite existing files (default: skip existing)", false)
    .action(async ({ output, concurrency, force, }) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://www.tcgcollector.com/sets/intl?setMode=regularCardVariants&releaseDateOrder=newToOld&displayAs=list", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".set-list", { timeout: 20000 });
    const seriesData = await page.$$eval(".set-list", (seriesEls) => {
        return seriesEls.map((el) => {
            const title = el.querySelector("h2.set-list-title")?.textContent?.trim() || "";
            const setLinks = Array.from(el.querySelectorAll("a.set-list-item-set-name")).map((a) => ({
                name: a.textContent?.trim() || "",
                href: a.href + "?displayAs=list",
            }));
            return { title, sets: setLinks };
        });
    });
    await page.close();
    const { chosenSeries } = await inquirer.prompt([
        {
            type: "checkbox",
            name: "chosenSeries",
            message: "Select a series:",
            choices: seriesData.map((s) => ({
                name: `${s.title} (${s.sets.length} sets)`,
                value: s,
            })),
            pageSize: 10,
        },
    ]);
    const allSelectedSets = [];
    for (const series of chosenSeries) {
        const { selectedSets } = await inquirer.prompt([
            {
                type: "checkbox",
                name: "selectedSets",
                message: `Select expansions from "${series.title}" to scrape:`,
                choices: series.sets.map((set) => ({
                    name: set.name,
                    value: set,
                })),
                pageSize: 15,
            },
        ]);
        for (const set of selectedSets) {
            allSelectedSets.push({
                seriesName: series.title,
                ...set,
            });
        }
    }
    await runConcurrent(allSelectedSets, async (set, index) => {
        const page = await browser.newPage();
        const sanitiseName = (name) => name.replace(/[<>:"/\\|?*]+/g, "").trim();
        const seriesName = sanitiseName(set.seriesName);
        const setName = sanitiseName(set.name);
        const dir = path.join(path.resolve(output), seriesName, setName);
        const jsonPath = path.join(dir, `${setName}.json`);
        if (fs.existsSync(dir) && force) {
            console.log(chalk.redBright(`⚠️  Removing old ${seriesName}/${setName} before re-scraping`));
            fs.rmSync(dir, { recursive: true, force: true });
        }
        else if (fs.existsSync(jsonPath) && !force) {
            console.log(chalk.yellow(`⏭️  Skipping ${seriesName}/${setName} (already scraped)`));
            await page.close();
            return;
        }
        fs.mkdirSync(dir, { recursive: true });
        try {
            console.log(chalk.blue(`[${index + 1}] Scraping ${set.name}...`));
            await page.goto(set.href, { waitUntil: "networkidle0" });
            await page.waitForSelector("#card-search-result", {
                visible: true,
                timeout: 20000,
            });
            const data = await tcgCollectorScraper(page);
            fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
            saveCsv(data, jsonPath.replace(/\.json$/, ".csv"));
            console.log(chalk.green(`✅ Finished ${seriesName}/${setName}`));
        }
        catch (err) {
            console.error(chalk.red(`❌ Failed ${set.name}: ${err.message}`));
        }
        finally {
            await page.close(); // ✅ close tab when done
        }
    }, parseInt(concurrency, 10));
    await browser.close();
});
