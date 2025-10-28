import { Command } from "commander";
import chalk from "chalk";
import { clearSession } from "../utils/session.js";

export const logoutCommand = new Command("logout")
  .description("Logs out by removing saved session data")
  .action(() => {
    const result = clearSession();

    if (result.error) {
      console.error(chalk.red(`❌ ${result.message} ${result.error}`));
      process.exit(1);
    }

    if (result.removedCookies || result.removedDir) {
      console.log(chalk.green(`✅ ${result.message}`));
    } else {
      console.log(chalk.cyan(`ℹ️  ${result.message}`));
    }
  });
