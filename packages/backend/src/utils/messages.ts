import { ClientStatus, ConnectionLoginError } from "../utils/status.js";
import {
    EmailToDraft,
    EmailToDraftSchema,
    EmailToSend,
    EmailToSendSchema,
    EmailUidResponse,
    GoogleLoginBody,
    ServerLoginBody
} from "@KiwiClient/shared";
import { SmtpInstance } from "../smtp/client.js";
import { ImapInstance } from "../imap/client.js";
import { imapPool, smtpPool } from "../connection_pool.js";
import {
    decrypt,
    REFRESH_TOKEN_COOKIE_NAME,
    TokenPayload
} from "../auth_sessions.js";
import { getLoginRequestBodyFromResponseCookie } from "./email.js";
import type { Request, Response } from "express";

export function parseMessageRequest(requestBody: EmailToSend | EmailToDraft, schema: typeof EmailToSendSchema | typeof EmailToDraftSchema, response: Response<EmailUidResponse>): EmailToSend | EmailToDraft | null {
    const result = schema.safeParse(requestBody);

    if (!result.success) {
        response.status(400).json({
            success: false,
            code: "SMTP_MESSAGE_INVALID",
            message: result.error.message
        });
        return null;
    }

    return result.data;
}

type LoginResult = {
    loginBody: ServerLoginBody | GoogleLoginBody;
    imapInstance: ImapInstance;
    smtpInstance: SmtpInstance;
} | null;

export async function loginToPools(token: TokenPayload, response: Response<EmailUidResponse>): Promise<LoginResult> {
    const loginBody = getLoginRequestBodyFromResponseCookie(token, decrypt);

    try {
        return {
            loginBody,
            imapInstance: await imapPool.acquire(loginBody),
            smtpInstance: await smtpPool.acquire(loginBody)
        };
    } catch (thrownError: any) {
        console.error(thrownError);

        response.clearCookie(REFRESH_TOKEN_COOKIE_NAME);

        if (
            thrownError instanceof ConnectionLoginError &&
            thrownError.status === ClientStatus.AUTH_ERROR
        ) {
            response.status(401).json({
                success: false,
                code: "AUTH_INVALID",
                message: "Stored credentials were rejected by the email server"
            });
        } else {
            response.status(500).json({
                success: false,
                code: "INTERNAL_ERROR",
                message: "Unknown internal error"
            });
        }

        return null;
    }
}

export function logoutOfPools(loginBody: ServerLoginBody | GoogleLoginBody): void {
    smtpPool.release(loginBody);
    imapPool.release(loginBody);
}

/**
 * @brief Reads a URL-encoded mailbox path parameter from the request.
 *
 * @returns The decoded IMAP-native path, or null when the parameter is absent or malformed.
 */
export function decodeMailboxPath(rawMailboxPath: string | string[] | undefined): string | null {
    if (typeof rawMailboxPath !== "string" || rawMailboxPath.length === 0) {
        return null;
    }

    return decodeURIComponent(rawMailboxPath);
}

export function decodeUid(uid: string | number): number | null {
    const parsedUid = typeof uid === "string" ? Number(uid) : uid;
    return Number.isFinite(parsedUid) && parsedUid >= 0 ? parsedUid : null;
}

export async function handleRequestAndLogin(request: Request<{}, {}, EmailToDraft | EmailToSend>, response: Response<EmailUidResponse>, schema: typeof EmailToDraftSchema | typeof EmailToSendSchema) {
    const email = parseMessageRequest(request.body, schema, response);

    if (!email) {
        return null;
    }

    const login = await loginToPools(response.locals.user as TokenPayload, response);

    if (!login) {
        return null;
    }

    return {
        email,
        ...login
    };
}

export async function writeDraft(email: EmailToDraft, imapInstance: ImapInstance, smtpInstance: SmtpInstance): Promise<number | null> {

    const requestEmail = email as EmailToDraft;

    // Compile the message and add to the IMAP server so it appears in the draft folder
    const { draftFolder: _, ...emailToSendBody } = requestEmail;
    const messageMime = smtpInstance.compileEmail(emailToSendBody);

    return await imapInstance.addRawMimeToMailbox(messageMime, requestEmail.draftFolder, ["\\Draft", "\\Seen"]);
}
