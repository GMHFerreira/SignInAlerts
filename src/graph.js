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
 * @param {string} startTimeIso - ISO string of start time
 * @returns {Promise<Array>} - Array of sign-ins
 */
export async function getRecentSignIns(token, startTimeIso) {
    // Apply 1-minute overlap to avoid missed logs
    const start = new Date(startTimeIso);
    start.setMinutes(start.getMinutes() - 5);
    start.setSeconds(0);
    start.setMilliseconds(0);
    const startStr = start.toISOString();

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
        throw new Error(`Graph API request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.value ?? [];
}
