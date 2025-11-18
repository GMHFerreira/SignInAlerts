// src/index.js
import 'dotenv/config'; // loads .env locally
import { getAccessToken, getRecentSignIns } from "./graph.js";
import { sendAlertEmail } from "./email.js";

async function main() {
    console.log("=== Running Sign-In Alerts ===", new Date().toISOString());

    let token;
    try {
        token = await getAccessToken();
    } catch (err) {
        console.error("Failed to acquire access token:", err);
        return;
    }

    // Look back 1 hour (adjust for testing if you want 1 minute)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lastScheduled = new Date(oneHourAgo);
    lastScheduled.setMinutes(0, 0, 0); // truncate minutes/seconds/milliseconds
    const startTimeIso = lastScheduled.toISOString();

    let signins;
    try {
        signins = await getRecentSignIns(token, startTimeIso);
    } catch (err) {
        console.error("Failed to fetch sign-in logs:", err);
        return;
    }

    if (!signins.length) {
        console.log("No suspicious sign-ins detected.");
        return;
    }

    console.log(`Detected ${signins.length} suspicious sign-ins.`);

    try {
        await sendAlertEmail(token, signins);
        console.log("Alert email sent successfully.");
    } catch (err) {
        console.error("Failed to send alert email:", err);
    }
}

// Run main
main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
