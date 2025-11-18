// src/email.js
import fetch from "node-fetch";

/**
 * Send an alert email via Microsoft Graph
 * @param {string} token - Access token from getAccessToken()
 * @param {Array} signins - Array of suspicious sign-ins
 */
export async function sendAlertEmail(token, signins) {
    if (!signins.length) return;

    const recipients = process.env.ALERT_EMAILS.split(";");

    const subject = `[Alert] ${signins.length} suspicious sign-ins detected`;

    let body = "Suspicious sign-ins detected outside Portugal:\n\n";

    for (const s of signins) {
        body += `- User: ${s.userDisplayName} (${s.userPrincipalName}), `;
        body += `Location: ${s.location?.city ?? "N/A"}, `;
        body += `Time: ${s.createdDateTime}\n`;
    }

    const message = {
        message: {
            subject,
            body: { contentType: "Text", content: body },
            toRecipients: recipients.map(email => ({
                emailAddress: { address: email }
            }))
        }
    };

    const url = `https://graph.microsoft.com/v1.0/users/${process.env.SENDER_EMAIL}/sendMail`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(message)
        });

        if (response.status !== 202) {
            throw new Error(`Failed to send email: ${response.status} ${await response.text()}`);
        }

        console.log(`Alert email sent to: ${recipients.join(", ")}`);
    } catch (err) {
        console.error("Error sending email:", err);
    }
}
