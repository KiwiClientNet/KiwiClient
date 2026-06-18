import { deduplicate } from "@KiwiClient/shared";
import { getEnv } from "../auth_sessions.js";
import crypto from 'crypto';

const GOOGLE_CLIENT_ID = getEnv('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = getEnv('GOOGLE_CLIENT_SECRET');

const FALLBACK_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface CachedAccessToken {
    accessToken: string;
    expiresAtMs: number;
}

const accessTokenCache: Map<string, CachedAccessToken> = new Map();
const pendingRefresh: Map<string, Promise<string>> = new Map();

/**
 * @brief Returns a valid Google access token for the given refresh token.
 *
 * Caches the resolved access token until shortly before Google's stated
 * expiry so repeated callers within a single token lifetime do not hit
 * Google's /token endpoint. Concurrent cache-misses are coalesced through
 * deduplicate so only one upstream call ever runs per refresh token.
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
    const cacheKey = hashRefreshToken(refreshToken);
    const cached = accessTokenCache.get(cacheKey);
    const nowMs = Date.now();

    if (cached && nowMs < cached.expiresAtMs - ACCESS_TOKEN_REFRESH_BUFFER_MS) {
        return cached.accessToken;
    }

    return deduplicate(pendingRefresh, cacheKey, () => fetchFreshAccessToken(refreshToken, cacheKey));
}

/**
 * @brief Derives a non-reversible cache key from the refresh token.
 *
 * The map key ends up in heap dumps and stray console.logs; hashing means
 * a leak of the cache cannot be turned back into a usable refresh token.
 */
function hashRefreshToken(refreshToken: string): string {
    return crypto.createHash("sha256").update(refreshToken).digest("hex");
}

/**
 * @brief Sends the refresh_token grant to Google and caches the result.
 *
 * Trusts Google's expires_in but falls back to a 1-hour TTL if the field is
 * missing, since Google has shipped that value on every successful response
 * for years and the fallback only matters on protocol surprises.
 */
async function fetchFreshAccessToken(refreshToken: string, cacheKey: string): Promise<string> {
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

    const expiresInMs = (Number(data.expires_in) || 0) * 1000 || FALLBACK_ACCESS_TOKEN_TTL_MS;
    accessTokenCache.set(cacheKey, {
        accessToken: data.access_token,
        expiresAtMs: Date.now() + expiresInMs,
    });

    return data.access_token;
}
