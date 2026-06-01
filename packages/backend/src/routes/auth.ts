/**
 * @brief Authentication routes: login, refresh, logout, and OAuth2 callback.
 *
 * Successful authentication issues a short-lived access token in the JSON
 * body and a long-lived refresh token in an httpOnly cookie. The access
 * token carries the encrypted IMAP credentials so that downstream routes
 * can rebuild the login body without any server-side session storage.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import {
    type AuthResponse,
    GoogleLoginRequestSchema,
    type GoogleLoginRequestBody,
    type GoogleLoginBody,
    LoginServerRequestSchema,
    type ServerLoginBody,
    type ServerLoginRequestBody
} from "@KiwiClient/shared";
import {
    encrypt,
    getEnv,
    issueAccessToken,
    issueRefreshToken,
    type TokenPayload,
    verifyRefreshToken
} from "../auth_sessions.js";
import { ImapInstance } from "../imap/client.js";
import { OAuth2Client } from "google-auth-library";
import { getErrorResponseFromStatus } from "../utils/status.js";
import { loginRateLimiter, refreshRateLimiter } from "../middleware/rateLimiter.js";
import { imapPool } from "../connection_pool.js";
import { getLoginRequestBodyFromResponseCookie } from "../utils/email.js";
import { decrypt } from "../auth_sessions.js";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const GOOGLE_CLIENT_ID = getEnv("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = getEnv("GOOGLE_CLIENT_SECRET");

const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface GoogleTokenExchangeResult {
    accessToken: string;
    refreshToken: string;
    idToken: string;
}

const router = Router();

/**
 * @brief Issues both auth tokens for a verified user and sets the refresh cookie.
 *
 * Extracted because the login, OAuth callback, and refresh handlers all need
 * the identical follow-up steps once they have a valid TokenPayload to hand out.
 *
 * @param response - The Express response that receives the cookie and JSON body.
 * @param payload - The signed payload that becomes both tokens.
 * @param rememberMe - When false the refresh cookie expires at session end.
 */
function sendAuthSuccessResponse(
    response: Response<AuthResponse>,
    payload: TokenPayload,
    rememberMe: boolean
): void {
    const accessToken = issueAccessToken(payload);
    const refreshToken = issueRefreshToken(payload);

    response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: getEnv("NODE_ENV") === "production",
        sameSite: "strict",
        maxAge: rememberMe ? REFRESH_COOKIE_MAX_AGE_MS : 0
    });

    response.json({ success: true, accessToken, email: payload.email });
}

/**
 * @brief Probes the IMAP server with the given credentials.
 *
 * Used at login time to fail fast on bad credentials before any token is
 * issued. The connection itself is discarded; the connection pool will
 * establish a fresh one on the first authenticated request.
 *
 * @param loginBody - The server-specific login payload to test.
 * @returns The terminal IMAP status reached during the probe.
 */
async function probeImapCredentials(loginBody: ServerLoginBody | GoogleLoginBody): Promise<ImapInstance.Status> {
    const imapInstance = new ImapInstance();
    const status = await imapInstance.loginToEmailServer(loginBody);
    await imapInstance.logoutFromEmailServer();
    return status;
}

/**
 * @brief Exchanges a Google OAuth2 authorisation code for access and id tokens.
 *
 * The redirect URI is "postmessage" because the frontend uses the popup
 * variant of the auth-code flow; Google requires this exact literal so the
 * token endpoint accepts the code that was issued to the popup window.
 *
 * Throws when either token is missing in the response so the caller can
 * surface a uniform error to the user.
 */
async function exchangeGoogleAuthCode(authorisationCode: string): Promise<GoogleTokenExchangeResult> {
    const googleResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code: authorisationCode,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: "postmessage",
            grant_type: "authorization_code",
            access_type: "offline"
        })
    });

    const googleTokens = await googleResponse.json();

    if (!googleTokens.access_token || !googleTokens.id_token || !googleTokens.refresh_token) {
        throw new Error("Google did not return both access and id tokens");
    }

    return {
        accessToken: googleTokens.access_token,
        refreshToken: googleTokens.refresh_token,
        idToken: googleTokens.id_token
    };
}

router.post("/login", loginRateLimiter, async (request: Request<{}, {}, ServerLoginRequestBody>, response: Response<AuthResponse>) => {

    const requestParseResult = LoginServerRequestSchema.safeParse(request.body);
    if (!requestParseResult.success) {
        response.status(400).json({
            success: false,
            message: requestParseResult.error.issues[0]?.message ?? "Invalid request"
        });
        return;
    }

    const { rememberMe, email, password } = requestParseResult.data;

    const loginBody: ServerLoginBody = { serverType: "PRIVATE", email, password };
    const imapStatus = await probeImapCredentials(loginBody);

    if (imapStatus !== ImapInstance.Status.LOGGED_IN) {
        const { statusCode, returnResponse } = getErrorResponseFromStatus(imapStatus);
        response.status(statusCode).json(returnResponse);
        return;
    }

    const payload: TokenPayload = {
        email,
        encryptedPassword: encrypt(password),
        serverType: "PRIVATE"
    };

    sendAuthSuccessResponse(response, payload, rememberMe);
});

router.post("/google/callback", loginRateLimiter, async (request: Request<{}, {}, GoogleLoginRequestBody>, response: Response<AuthResponse>) => {

    const requestParseResult = GoogleLoginRequestSchema.safeParse(request.body);
    if (!requestParseResult.success) {
        response.status(400).json({
            success: false,
            message: requestParseResult.error.issues[0]?.message ?? "Invalid Google OAuth2 request"
        });
        return;
    }

    try {
        const { accessToken: googleAccessToken, refreshToken: googleRefreshToken, idToken } = await exchangeGoogleAuthCode(requestParseResult.data.accessCode);

        const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await oauthClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        const verifiedPayload = ticket.getPayload();

        if (!verifiedPayload || !verifiedPayload.email) {
            response.status(400).json({ success: false, message: "Google login failed - invalid id token payload" });
            return;
        }

        const userEmail = verifiedPayload.email;

        const loginBody: GoogleLoginBody = {
            serverType: "GMAIL",
            email: userEmail,
            googleRefreshToken: googleRefreshToken,
            accessCode: googleAccessToken
        };

        const imapStatus = await probeImapCredentials(loginBody);
        if (imapStatus !== ImapInstance.Status.LOGGED_IN) {
            const { statusCode, returnResponse } = getErrorResponseFromStatus(imapStatus);
            response.status(statusCode).json(returnResponse);
            return;
        }

        const payload: TokenPayload = {
            email: userEmail,
            encryptedPassword: encrypt(googleAccessToken),
            oAuth2RefreshToken: googleRefreshToken ? encrypt(googleRefreshToken) : undefined,
            serverType: "GMAIL"
        };

        sendAuthSuccessResponse(response, payload, true);

    } catch (thrownError: any) {
        console.error(thrownError);
        response.status(500).json({ success: false, message: "Google login failed" });
    }
});

router.post("/logout", async (request: Request, response: Response<AuthResponse>) => {

    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];

    // Logout must feel instant from the client's point of view: clearing the
    // cookie and returning success is enough to end the user-facing session.
    // The IMAP eviction can be slow because imapflow's LOGOUT command queues
    // behind any in-flight FETCH (e.g. a background prefetch chunk), so it is
    // fired without await and any failure is logged rather than surfaced.
    if (refreshToken) {
        try {
            const tokenPayload = verifyRefreshToken(refreshToken);
            const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
            imapPool.evict(loginBody).catch(thrownError => {
                console.warn("Logout could not evict pool entry:", thrownError);
            });
        } catch (thrownError: any) {
            console.warn("Logout could not decode session for eviction:", thrownError);
        }
    }

    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
    response.json({ success: true });
});

router.post("/refresh", refreshRateLimiter, (request: Request, response: Response<AuthResponse>) => {
    const refreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (!refreshToken) {
        response.status(401).json({ success: false, message: "No refresh token" });
        return;
    }

    try {
        const tokenPayload = verifyRefreshToken(refreshToken);
        sendAuthSuccessResponse(response, tokenPayload, true);
    } catch (thrownError: any) {
        response.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
        response.status(401).json({ success: false, message: "Session expired" });
        console.error(thrownError);
    }
});

export default router;
