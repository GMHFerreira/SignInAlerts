// src/graph.js
import fetch from "node-fetch";
import { ConfidentialClientApplication } from "@azure/msal-node";

const SIGNINS_URL = "https://graph.microsoft.com/beta/auditLogs/signIns";

/**
 * Acquire a Microsoft Graph access token
 */
export async function getAccessToken() {
    const client = new ConfidentialClientApplication({
        auth: {
            clientId: process.env.CLIENT_ID,
            authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
            clientSecret: process.env.CLIENT_SECRET
        }
    });

    const result = await client.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"]
    });

    if (!result?.accessToken) {
        throw new Error("Failed to acquire access token");
    }

    return result.accessToken;
}

/**
 * Query sign-in logs from Microsoft Graph
 * @param {string} token - Access token
 * @param {string} startTimeIso - ISO string of last run time
 * @returns {Promise<Array>} - Array of sign-ins
 */
export async function getRecentSignIns(token, startTimeIso) {

    // ------------------------------------------------------------
    // FIX: Prevent breakage if lastRun is in the future
    // ------------------------------------------------------------
    const now = Date.now();
    let lastRun = new Date(startTimeIso);

    // If lastRun is more than 2 minutes ahead of real time,
    // reset it to "1 hour ago" so alerts can work again
    if (lastRun.getTime() > now + 2 * 60 * 1000) {
        console.warn(
            `Warning: lastRun timestamp (${startTimeIso}) was in the future. Resetting to 1 hour ago.`
        );
        lastRun = new Date(now - 60 * 60 * 1000);
    }

    // Apply 1-minute overlap to avoid missed logs
    lastRun.setMinutes(lastRun.getMinutes() - 1);
    lastRun.setSeconds(0);
    lastRun.setMilliseconds(0);

    const startStr = lastRun.toISOString();

    // Build filter for suspicious sign-ins
    const filter = [
        `createdDateTime ge ${startStr}`,
        `location/countryOrRegion ne 'PT'`,
        `isInteractive eq true`,
        `status/errorCode eq 0`
    ].join(" and ");

    const params = new URLSearchParams({ "$filter": filter });

    const response = await fetch(`${SIGNINS_URL}?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(
            `Graph API request failed: ${response.status}\n${body}`
        );
    }

    const data = await response.json();
    return data.value ?? [];
}
