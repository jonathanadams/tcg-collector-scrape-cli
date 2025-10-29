import fs from "fs";
import path from "path";
import envPaths from "env-paths";
const paths = envPaths("tcg-collector-scrape-cli");
const SESSION_DIR = path.join(paths.data, "sessions");
const COOKIE_FILE = path.join(SESSION_DIR, "cookies.json");
export async function saveCookies(cookies) {
    if (!fs.existsSync(SESSION_DIR))
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
}
export function loadCookies() {
    if (fs.existsSync(COOKIE_FILE)) {
        const cookieStr = fs.readFileSync(COOKIE_FILE, "utf-8");
        try {
            return JSON.parse(cookieStr);
        }
        catch {
            return null;
        }
    }
    return null;
}
export function hasSession() {
    return fs.existsSync(COOKIE_FILE);
}
export function clearSession() {
    let removedCookies = false;
    let removedDir = false;
    try {
        if (fs.existsSync(COOKIE_FILE)) {
            fs.rmSync(COOKIE_FILE, { force: true });
            removedCookies = true;
        }
        if (fs.existsSync(SESSION_DIR) &&
            fs.readdirSync(SESSION_DIR).length === 0) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            removedDir = true;
        }
        const message = removedCookies || removedDir
            ? "Session cleared successfully."
            : "No session data found.";
        return { removedCookies, removedDir, message };
    }
    catch (err) {
        return {
            removedCookies,
            removedDir,
            message: "Failed to clear session.",
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
