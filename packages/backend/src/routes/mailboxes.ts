/**
 * @brief Routes that expose the user's mailbox folder list.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import type { MailboxesResponse } from "@KiwiClient/shared";
import { decrypt, type TokenPayload } from "../auth_sessions.js";
import { getLoginRequestBodyFromResponseCookie } from "../utils/email.js";
import { imapPool } from "../connection_pool.js";
import { ImapInstance } from "../imap/client.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { ClientStatus, respondIfCredentialsRejected } from "../utils/status.js";

const router = Router();
router.use(requireAuth);

router.get("/mailboxes", async (_request: Request, response: Response<MailboxesResponse>) => {
    const tokenPayload = response.locals.user as TokenPayload;

    try {

        performance.mark("start");
        const loginBody = getLoginRequestBodyFromResponseCookie(tokenPayload, decrypt);
        const imapInstance = await imapPool.acquire(loginBody);
        performance.mark("login");

        if (imapInstance.getStatus() !== ClientStatus.LOGGED_IN) {
            response.status(401).json({ success: false, code: "AUTH_EXPIRED", message: "IMAP session expired" });
            return;
        }

        const mailboxes = await imapInstance.getMailboxes();
        performance.mark("mailboxes");

        // Get the number of unread messages in each mailbox
        const unseenResult = await imapInstance.getUnseenCount(mailboxes.map(mailbox => mailbox.path));
        mailboxes.forEach(mailbox => mailbox.unseen = unseenResult[mailbox.path]);

        performance.mark("unread");

        imapPool.release(loginBody);
        performance.mark("end");
        console.log('toLogin', performance.measure('toLogin', 'start', 'login').duration);
        console.log('toMailboxes', performance.measure('toMailboxes', 'login', 'mailboxes').duration);
        console.log('toUnread', performance.measure('toUnread', 'mailboxes', 'unread').duration);
        console.log('toEnd', performance.measure('toEnd', 'unread', 'end').duration);

        response.json({ success: true, data: mailboxes });

    } catch (thrownError: any) {
        if (respondIfCredentialsRejected(thrownError, response)) {
            return;
        }
        console.error(thrownError);
        response.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Failed to list mailboxes" });
    }
});

export default router;
