/**
 * @brief Routes that expose the user's mailbox folder list.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import type { MailboxesResponse } from "@KiwiClient/shared";
import { decrypt, type TokenPayload_t } from "../auth_sessions.js";
import { getLoginRequestBodyFromResponseCookie } from "../utils/email.js";
import { imapPool } from "../connection_pool.js";
import { ImapInstance } from "../imap/client.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

router.get("/mailboxes", async (_request: Request, response: Response<MailboxesResponse>) => {
    const tokenPayload = response.locals.user as TokenPayload_t;

    try {
        const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
        const imapInstance = await imapPool.acquire(loginBody);

        if (imapInstance.getStatus() !== ImapInstance.Status.LOGGED_IN) {
            response.status(401).json({ success: false, code: "AUTH_EXPIRED", message: "IMAP session expired" });
            return;
        }

        const mailboxes = await imapInstance.getMailboxes();

        // Get the number of unread messages in each mailbox
        for (const mailbox of mailboxes) {
            mailbox.unseen = await imapInstance.getUnseenCount(mailbox.path);
        }

        imapPool.release(loginBody);

        response.json({ success: true, data: mailboxes });

    } catch (thrownError: any) {
        console.error(thrownError);
        response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to list mailboxes" });
    }
});

export default router;
