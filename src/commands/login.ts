#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import puppeteer from "puppeteer";

import { saveCookies } from "../utils/session.js";

interface LoginOptions {
  email: string;
  password: string;
}

export const loginCommand = new Command("login")
  .description("Logs into tcgcollector.com and saves session cookies")
  .requiredOption("-e, --email <email>", "Account email")
  .requiredOption("-p, --password <password>", "Account password")
  .action(async ({ email, password }: LoginOptions) => {
    const LOGIN_URL = "https://www.tcgcollector.com/account/sign-in";
    console.log(chalk.blue(`Logging into TCG Collector`));

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
      await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
      await page.type('input[type="email"]', email);
      await page.type('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle0" });

      const cookies = await browser.cookies();
      await saveCookies(cookies);

      console.log(chalk.green("✅ Logged in and cookies saved."));
    } catch (err) {
      console.error(chalk.red(`❌ Login failed: ${(err as Error).message}`));
    } finally {
      await browser.close();
    }
  });
