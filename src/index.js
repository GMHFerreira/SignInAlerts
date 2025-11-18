import fs from "fs";
import path from "path";
import 'dotenv/config';
import { getAccessToken, getRecentSignIns } from "./graph.js";
import { sendAlertEmail } from "./email.js";

const LAST_RUN_FILE = path.resolve("./last-run.json");

async function main() {
    console.log("=== Running Sign-In Alerts ===", new Date().toISOString());

    // Read last run timestamp
    let lastRunIso = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // default 1 hour ago
    try {
        if (fs.existsSync(LAST_RUN_FILE)) {
            const json = fs.readFileSync(LAST_RUN_FILE, "utf-8");
            const data = JSON.parse(json);
            if (data.lastRun) lastRunIso = data.lastRun;
        }
    } catch (err) {
        console.warn("Could not read last run file, defaulting to 1 hour ago:", err);
    }

    let token;
    try {
        token = await getAccessToken();
    } catch (err) {
        console.error("Failed to acquire access token:", err);
        return;
    }

    let signins;
    try {
        signins = await getRecentSignIns(token, lastRunIso);
    } catch (err) {
        console.error("Failed to fetch sign-in logs:", err);
        return;
    }

    if (!signins.length) {
        console.log("No suspicious sign-ins detected.");
    } else {
        console.log(`Detected ${signins.length} suspicious sign-ins.`);
        try {
            await sendAlertEmail(token, signins);
            console.log("Alert email sent successfully.");
        } catch (err) {
            console.error("Failed to send alert email:", err);
        }
    }

    // Update last run timestamp to current time
    try {
        fs.writeFileSync(LAST_RUN_FILE, JSON.stringify({ lastRun: new Date().toISOString() }));
    } catch (err) {
        console.error("Failed to update last run file:", err);
    }
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
