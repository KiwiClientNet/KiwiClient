import { AuthResponse } from "@KiwiClient/shared";
import { ImapInstance } from "../imap/client.js";

interface ErrorResponse {
    statusCode: number;
    returnResponse: AuthResponse;
}

export function getErrorResponseFromStatus(imapStatus: ImapInstance.Status): ErrorResponse {
    let statusCode = 500;
    let returnResponse: AuthResponse = {
        success: false,
        message: "Unknown error"
    };

    switch (imapStatus) {
        case ImapInstance.Status.AUTH_ERROR:
            statusCode = 401;
            returnResponse.message = "Invalid credentials";
            break;
        case ImapInstance.Status.NO_SERVER:
            statusCode = 400
            returnResponse.message = "Could not resolve hostname to IP address";
            break;
        case ImapInstance.Status.NOT_CONNECTED:
            statusCode = 400
            returnResponse.message = "Could not connect to email server";
            break;
        case ImapInstance.Status.LOGGED_IN:
            statusCode = 409
            returnResponse.message = "Already logged in";
            break;
        default:
            break;
    }

    return { statusCode, returnResponse };
}
