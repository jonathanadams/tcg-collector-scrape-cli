#!/usr/bin/env node
import { Command } from "commander";

import { loginCommand } from "./commands/login.js";
import { scrapeCommand } from "./commands/scrape.js";
import { logoutCommand } from "./commands/logout.js";

const program = new Command();

program
  .name("tcgscrape")
  .description("CLI for scraping and managing TCGCollector")
  .addCommand(loginCommand)
  .addCommand(logoutCommand)
  .addCommand(scrapeCommand)
  .parseAsync(process.argv);
