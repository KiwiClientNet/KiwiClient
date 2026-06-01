/**
 * @brief Bearer token middleware shared by every authenticated route.
 *
 * Verifies the access token on the Authorization header, attaches the decoded
 * payload to response.locals.user, and short-circuits with a uniform API
 * error envelope when the token is missing or invalid.
 */

import type { Request, Response, NextFunction } from "express";
import type { ApiError } from "@KiwiClient/shared";
import { type TokenPayload, verifyAccessToken } from "../auth_sessions.js";

const BEARER_PREFIX = "Bearer ";

/**
 * @brief Express middleware that enforces a valid access token on the request.
 *
 * Stores the verified token payload on response.locals.user so downstream
 * handlers can read the user's identity without repeating the verification.
 */
export function requireAuth(request: Request, response: Response<ApiError>, next: NextFunction): void {
    const authorisationHeader = request.headers.authorization;
    if (!authorisationHeader || !authorisationHeader.startsWith(BEARER_PREFIX)) {
        response.status(401).json({ success: false, code: "AUTH_REQUIRED", message: "Missing or malformed authorisation header" });
        return;
    }

    const accessToken = authorisationHeader.slice(BEARER_PREFIX.length);

    try {
        const payload: TokenPayload = verifyAccessToken(accessToken);
        response.locals.user = payload;
        next();
    } catch {
        response.status(401).json({ success: false, code: "AUTH_EXPIRED", message: "Access token expired or invalid" });
    }
}
