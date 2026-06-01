/**
 * @brief Routes for streaming raw message body parts back to the client.
 *
 * Used for attachment downloads. Inline images embedded in HTML bodies are
 * resolved at the boundary inside getSingleMessage; this route covers the
 * separate case of fetching a part by identifier on demand.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import type { ApiError } from "@KiwiClient/shared";
import { decrypt, type TokenPayload } from "../auth_sessions.js";
import { getLoginRequestBodyFromResponseCookie } from "../utils/email.js";
import { imapPool } from "../connection_pool.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

router.get("/mailboxes/:mailboxPath/messages/:uniqueId/parts/:partId", async (request: Request, response: Response<ApiError>) => {
    const rawMailboxPath = request.params.mailboxPath;
    const rawUniqueId = request.params.uniqueId;
    const rawPartId = request.params.partId;

    if (typeof rawMailboxPath !== "string" || typeof rawUniqueId !== "string" || typeof rawPartId !== "string") {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Invalid path parameters" });
        return;
    }

    const mailboxPath = decodeURIComponent(rawMailboxPath);
    const uniqueId = Number(rawUniqueId);
    const partId = rawPartId;

    if (!mailboxPath || !Number.isFinite(uniqueId) || uniqueId < 0 || !partId) {
        response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Invalid path parameters" });
        return;
    }

    const tokenPayload = response.locals.user as TokenPayload;

    try {
        const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
        const imapInstance = await imapPool.acquire(loginBody);

        try {
            const downloadObject = await imapInstance.downloadMessagePart(mailboxPath, uniqueId, partId);

            if (!downloadObject) {
                response.status(404).json({ success: false, code: "MESSAGE_NOT_FOUND", message: "Message part not found" });
                return;
            }

            const { content, meta } = downloadObject;
            response.setHeader("Content-Type", meta.contentType || "application/octet-stream");

            for await (const chunk of content) {
                response.write(chunk);
            }

            response.end();
        } finally {
            imapPool.release(loginBody);
        }

    } catch (thrownError: any) {
        console.error(thrownError);
        response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to download message part" });
    }
});

export default router;
