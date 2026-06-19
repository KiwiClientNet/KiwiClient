/**
 * @brief Routes for paginated mailbox listings and individual message access.
 *
 * The mailbox path is URL-encoded into a single path segment by the frontend;
 * routes decode it before passing to the IMAP client because the IMAP path
 * may contain characters that are awkward in URLs.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import {
    type EmailMessageResponse,
    type EmailMessagesResponse,
    type EmptyResponse,
    type GlancePageResponse,
    GlancePageRequestSchema,
    MessageFlagsUpdateSchema,
    MessageMoveUpdateSchema,
    MessageMoveUpdate,
    EmailToSend,
    EmailToSendSchema
} from "@KiwiClient/shared";
import { decrypt, type TokenPayload } from "../auth_sessions.js";
import { getLoginRequestBodyFromResponseCookie } from "../utils/email.js";
import { imapPool, smtpPool } from "../connection_pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { respondIfCredentialsRejected } from "../utils/status.js";
import { sendRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.use(requireAuth);

/**
 * @brief Reads a URL-encoded mailbox path parameter from the request.
 *
 * Express 5 types path parameters as string or string array; only the
 * single-string form is meaningful here so the array form is rejected.
 *
 * @returns The decoded IMAP-native path, or null when the parameter is absent or malformed.
 */
function decodeMailboxPath(rawMailboxPath: string | string[] | undefined): string | null {
    if (typeof rawMailboxPath !== "string" || rawMailboxPath.length === 0) {
        return null;
    }
    return decodeURIComponent(rawMailboxPath);
}

router.get("/mailboxes/:mailboxPath/messages", async (request: Request, response: Response<GlancePageResponse>) => {
    const mailboxPath = decodeMailboxPath(request.params.mailboxPath);
    if (!mailboxPath) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "mailboxPath is required" });
        return;
    }

    const queryParseResult = GlancePageRequestSchema.safeParse(request.query);
    if (!queryParseResult.success) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: queryParseResult.error.issues[0]?.message ?? "Invalid query" });
        return;
    }

    const tokenPayload = response.locals.user as TokenPayload;

    try {
        const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
        const imapInstance = await imapPool.acquire(loginBody);

        try {
            const glancePage = await imapInstance.getMessages(
                mailboxPath,
                queryParseResult.data.pageNumber,
                queryParseResult.data.pageSize
            );

            response.json({ success: true, data: glancePage });
        } finally {
            imapPool.release(loginBody);
        }

    } catch (thrownError: any) {
        if (respondIfCredentialsRejected(thrownError, response)) {
            return;
        }
        console.error(thrownError);
        response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to list messages" });
    }
});

router.get("/mailboxes/:mailboxPath/messages/bodies", async (request: Request, response: Response<EmailMessagesResponse>) => {
    const mailboxPath = decodeMailboxPath(request.params.mailboxPath);
    if (!mailboxPath) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "mailboxPath is required" });
        return;
    }

    const rawUniqueIds = request.query.uniqueIds;
    if (typeof rawUniqueIds !== "string" || rawUniqueIds.length === 0) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "uniqueIds query parameter is required" });
        return;
    }

    const parsedUniqueIds = rawUniqueIds
        .split(",")
        .map(rawUniqueId => Number(rawUniqueId))
        .filter(parsedUniqueId => Number.isFinite(parsedUniqueId) && parsedUniqueId >= 0);

    if (parsedUniqueIds.length === 0) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "uniqueIds must contain at least one non-negative number" });
        return;
    }

    const tokenPayload = response.locals.user as TokenPayload;

    try {
        const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
        const imapInstance = await imapPool.acquire(loginBody);

        try {
            const messages = await imapInstance.getManyMessages(mailboxPath, parsedUniqueIds);
            response.json({ success: true, data: messages });
        } finally {
            imapPool.release(loginBody);
        }
    } catch (thrownError: any) {
        if (respondIfCredentialsRejected(thrownError, response)) {
            return;
        }
        console.error(thrownError);
        response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to fetch messages" });
    }
});

router.get("/mailboxes/:mailboxPath/messages/:uniqueId", async (request: Request, response: Response<EmailMessageResponse>) => {
    const mailboxPath = decodeMailboxPath(request.params.mailboxPath);
    if (!mailboxPath) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "mailboxPath is required" });
        return;
    }

    const uniqueId = Number(request.params.uniqueId);
    if (!Number.isFinite(uniqueId) || uniqueId < 0) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "uniqueId must be a non-negative number" });
        return;
    }

    const tokenPayload = response.locals.user as TokenPayload;

    try {
        const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
        const imapInstance = await imapPool.acquire(loginBody);

        try {
            const message = await imapInstance.getSingleMessage(mailboxPath, uniqueId);

            if (!message) {
                response.status(404).json({ success: false, code: "MESSAGE_NOT_FOUND", message: "Message not found" });
                return;
            }

            response.json({ success: true, data: message });
        } finally {
            imapPool.release(loginBody);
        }

    } catch (thrownError: any) {
        if (respondIfCredentialsRejected(thrownError, response)) {
            return;
        }
        console.error(thrownError);
        response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to fetch message" });
    }
});

router.patch("/mailboxes/:mailboxPath/messages/flags/change", async (request: Request, response: Response<EmptyResponse>) => {
    const mailboxPath = decodeMailboxPath(request.params.mailboxPath);
    if (!mailboxPath) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "mailboxPath is required" });
        return;
    }

    const bodyParseResult = MessageFlagsUpdateSchema.safeParse(request.body);
    if (!bodyParseResult.success) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: bodyParseResult.error.issues[0]?.message ?? "Invalid body" });
        return;
    }

    const tokenPayload = response.locals.user as TokenPayload;

    try {
        const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
        const imapInstance = await imapPool.acquire(loginBody);

        try {
            const succeeded = await imapInstance.updateMessageFlags(
                mailboxPath,
                bodyParseResult.data.uniqueIds,
                bodyParseResult.data.add,
                bodyParseResult.data.remove
            );

            if (!succeeded) {
                response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to update flags" });
                return;
            }

            response.json({ success: true, data: {} });
        } finally {
            imapPool.release(loginBody);
        }

    } catch (thrownError: any) {
        if (respondIfCredentialsRejected(thrownError, response)) {
            return;
        }
        console.error(thrownError);
        response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to update flags" });
    }
});

router.patch("/mailboxes/:mailboxPath/messages/move", async (request: Request<{ mailboxPath: string }, EmptyResponse, MessageMoveUpdate>, response: Response<EmptyResponse>) => {
    const mailboxPathSource = decodeMailboxPath(request.params.mailboxPath);
    if (!mailboxPathSource) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "A source mailbox path is required" });
        return;
    }

    const bodyParseResult = MessageMoveUpdateSchema.safeParse(request.body);
    if (!bodyParseResult.success) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: bodyParseResult.error.issues[0]?.message ?? "Invalid body" });
        return;
    }

    const tokenPayload = response.locals.user as TokenPayload;

    try {
        const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
        const imapInstance = await imapPool.acquire(loginBody);

        try {
            const succeeded = await imapInstance.moveMessages(
                mailboxPathSource,
                bodyParseResult.data.mailboxPathTarget,
                bodyParseResult.data.uniqueIds
            );

            if (!succeeded) {
                response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to move messages" });
                return;
            }

            response.json({ success: true, data: {} });
        } finally {
            imapPool.release(loginBody);
        }

    } catch (thrownError: any) {
        if (respondIfCredentialsRejected(thrownError, response)) {
            return;
        }
        console.error(thrownError);
        response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to move messages" });
    }
});

router.post("/messages/send", sendRateLimiter, async (request: Request<{}, {}, EmailToSend>, response: Response<EmptyResponse>) => {

    // Get the email to send the request
    const emailToSendParseResult = EmailToSendSchema.safeParse(request.body);

    if (!emailToSendParseResult.success) {
        response.status(400).json({
            success: false,
            code: "SMTP_MESSAGE_INVALID",
            message: emailToSendParseResult.error.message
        })
        return;
    }

    const tokenPayload = response.locals.user as TokenPayload;

    try {
        const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
        const imapInstance = await imapPool.acquire(loginBody);
        const smtpInstance = await smtpPool.acquire(loginBody);

        try {

            const succeeded = await smtpInstance.sendEmail(emailToSendParseResult.data);

            if (!succeeded) {
                response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Server failed to send message" });
                return;
            }

            // Can compile the message and add to the IMAP server so it appears in the sent folder
            const messageMime = smtpInstance.compileEmail(emailToSendParseResult.data);
            // Google seems to already add the sent email to the folder for you? 
            if (loginBody.serverType !== "GMAIL") {
                const addedToSent = await imapInstance.addRawMimeToMailbox(messageMime, emailToSendParseResult.data.sentFolder, ["\\Seen"]);
                if (!addedToSent) {
                    response.status(500).json({ success: false, code: "IMAP_COULD_NOT_MOVE_MESSAGE", message: "Server failed to add message to the sent folder" });
                    return;
                }
            }

            response.json({ success: true, data: {} });
        } finally {
            smtpPool.release(loginBody);
            imapPool.release(loginBody);
        }

    } catch (thrownError: any) {
        if (respondIfCredentialsRejected(thrownError, response)) {
            return;
        }
        console.error(thrownError);
        response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to send message" });
    }

});

export default router;
