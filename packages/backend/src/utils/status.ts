import type { ApiError, AuthResponse } from "@KiwiClient/shared";
import type { Response } from "express";
import { REFRESH_TOKEN_COOKIE_NAME } from "../auth_sessions.js";

export enum ClientStatus {
    LOGGED_IN,
    LOGGED_OUT,
    AUTH_ERROR,
    NO_SERVER,
    NOT_CONNECTED,
    UNDEFINED,
    UNKNOWN_ERROR,
}

/**
 * @brief Thrown by the connection pool factories when a login attempt fails.
 *
 * Carries the terminal ClientStatus so route handlers can distinguish
 * rejected credentials from transient network failures without parsing the
 * error message.
 */
export class ConnectionLoginError extends Error {
    constructor(
        public readonly status: ClientStatus,
        protocolName: string,
        serverType: string
    ) {
        super(`${protocolName} login failed: serverType=${serverType} status=${ClientStatus[status]}`);
    }
}

/**
 * @brief Ends the session when the email server rejected the stored credentials.
 *
 * The stored password becomes stale when the user changes it at the provider;
 * the JWTs stay cryptographically valid, so the only revocation point is
 * clearing the refresh cookie here. The frontend's failed silent refresh then
 * redirects to the login page.
 *
 * @param thrownError - The error caught by the route handler.
 * @param response - The Express response that receives the 401 and cookie clear.
 * @returns True when the error was a credential rejection and the response was sent.
 */
export function respondIfCredentialsRejected(thrownError: unknown, response: Response<ApiError>): boolean {
    if (!(thrownError instanceof ConnectionLoginError) || thrownError.status !== ClientStatus.AUTH_ERROR) {
        return false;
    }

    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
    response.status(401).json({ success: false, code: "AUTH_INVALID", message: "Stored credentials were rejected by the email server" });
    return true;
}

interface ErrorResponse {
    statusCode: number;
    returnResponse: AuthResponse;
}

/**
 * @brief Maps a terminal client status onto an HTTP status and response body.
 *
 * NO_SERVER means DNS could not resolve the host, so the host name is wrong;
 * NOT_CONNECTED means the host resolved but nothing answered (or the
 * connection was refused), which almost always means a wrong port. The field
 * hint lets the login wizard highlight the exact input to fix.
 */
export function getErrorResponseFromStatus(clientStatus: ClientStatus): ErrorResponse {
    switch (clientStatus) {
        case ClientStatus.AUTH_ERROR:
            return { statusCode: 401, returnResponse: { success: false, message: "Invalid credentials" } };
        case ClientStatus.NO_SERVER:
            return { statusCode: 400, returnResponse: { success: false, message: "Could not find that server - check the host name", field: "host" } };
        case ClientStatus.NOT_CONNECTED:
            return { statusCode: 400, returnResponse: { success: false, message: "The server did not respond on that port - check the port number", field: "port" } };
        case ClientStatus.LOGGED_IN:
            return { statusCode: 409, returnResponse: { success: false, message: "Already logged in" } };
        default:
            return { statusCode: 500, returnResponse: { success: false, message: "Unknown error" } };
    }
}
