import { getEnv } from "../auth_sessions.js";

const GOOGLE_CLIENT_ID = getEnv('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = getEnv('GOOGLE_CLIENT_SECRET');

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {

    // Exchanges a long-lived refresh token for a new short-lived access token
    // Google access tokens expire after 1 hour so this is called before any reconnect attempt
   
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    const data = await response.json();

    if (!data.access_token) {
        throw new Error("Failed to refresh Google access token");
    }

    return data.access_token;
}
