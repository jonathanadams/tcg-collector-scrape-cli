#!/usr/bin/env node
import { Command } from "commander";
import { scrapeCommand } from "./commands/scrape.js";
import { multiCommand } from "./commands/multi.js";
const program = new Command();
program
    .name("tcgscrape")
    .description("CLI for scraping and managing TCGCollector")
    .addCommand(scrapeCommand)
    .addCommand(multiCommand)
    .parseAsync(process.argv);
