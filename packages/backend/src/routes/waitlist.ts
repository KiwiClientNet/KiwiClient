/**
 * @brief Adds a user to the landing page waitlist
 */

import { LandingSignupRequest, LandingSignupRequestSchema, LandingUnsubscribeRequest, LandingUnsubscribeRequestSchema } from '@KiwiClient/shared';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFileSync } from 'fs';
import path, { join } from 'path';
import { Resend } from 'resend';
import { getEnv } from '../auth_sessions.js';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { waitlistRateLimiter } from '../middleware/rateLimiter.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const confirmationEmailHtml = readFileSync(join(__dirname, '../emails/waitlist-confirmation.html'), 'utf-8');
const DB_PATH = getEnv("DB_PATH");
const waitlistDatabase = new Database(DB_PATH);


waitlistDatabase.pragma('journal_mode = WAL');
waitlistDatabase.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
        email TEXT PRIMARY KEY NOT NULL,
        date_added INTEGER NOT NULL,
        unsubscribe_token TEXT NOT NULL
    )
`);

const RESEND_API_KEY = getEnv("RESEND_API_KEY");
const resend = new Resend(RESEND_API_KEY);
const router = Router();

const isDevelopment = getEnv("NODE_ENV") === "development";

router.post('/waitlist/add', waitlistRateLimiter, async (request: Request<{}, {}, {}, LandingSignupRequest>, response: Response) => {

    const requestParseResult = LandingSignupRequestSchema.safeParse(request.body);
    if (!requestParseResult.success) {
        response.status(400).json({
            success: false,
            message: requestParseResult.error.issues[0]?.message ?? "Invalid request"
        });
        return;
    }

    try {
        const { email } = requestParseResult.data;

        const frontendUrl = getEnv("FRONTEND_URL");
        const unsubscribeToken = crypto.randomBytes(32).toString('hex');
        const unsubscribeUrl = `${frontendUrl}/api/waitlist/remove?email=${encodeURIComponent(email)}&token=${unsubscribeToken}`;
        const emailHtml = confirmationEmailHtml.replace('{{unsubscribe_url}}', unsubscribeUrl);

        const insert = waitlistDatabase.prepare('INSERT OR IGNORE INTO waitlist (email, date_added, unsubscribe_token) VALUES (?, ?, ?)');
        const result = insert.run(email, Date.now(), unsubscribeToken);
        result.changes // 1 = inserted, 0 = already existed (IGNORE fired)

        if (result.changes === 0) {
            response.status(200).json({ success: true, message: "Already on waitlist" });
            return;
        }

        const { error } = await resend.emails.send({
            from: getEnv("WAITLIST_FROM_EMAIL"),
            replyTo: getEnv("WAITLIST_REPLY_TO"),
            to: isDevelopment ? "delivered@resend.dev" : email,
            subject: "Thanks for your interest in KiwiClient!",
            html: emailHtml,
        });

        if (error) {
            console.error("Resend error:", error);
            response.status(500).json({ success: false, message: "Failed to send confirmation email" });
            return;
        }

        response.status(200).json({ success: true });

    } catch (error: any) {
        console.error("Internal error:", error);
        response.status(500).json({ success: false, message: "Failed to add to waitlist" });
        return;
    }

});

router.get('/waitlist/remove', waitlistRateLimiter, async (request: Request<{}, {}, {}, LandingUnsubscribeRequest>, response: Response) => {
    const frontendUrl = getEnv("FRONTEND_URL");
    const parseResult = LandingUnsubscribeRequestSchema.safeParse(request.query);

    if (!parseResult.success) {
        return response.redirect(303, `${frontendUrl}/unsubscribe-failed`);
    }

    const { email, token } = parseResult.data;

    try {
        const deleteStatement = waitlistDatabase.prepare(
            'DELETE FROM waitlist WHERE email = ? AND unsubscribe_token = ?'
        );
        const result = deleteStatement.run(email, token);

        const target = result.changes === 0 ? 'unsubscribe-failed' : 'unsubscribe';
        return response.redirect(303, `${frontendUrl}/${target}`);
    } catch {
        return response.redirect(303, `${frontendUrl}/unsubscribe-failed`);
    }
});

router.get('/waitlist/count', async (_request: Request, response: Response) => {
    try {
        const countAll = waitlistDatabase.prepare('SELECT COUNT (*) AS count FROM waitlist');
        const { count } = countAll.get() as { count: number };
        response.status(200).json({ count: count });
    } catch (error: any) {
        console.error("Internal error:", error);
        response.status(500).json({ success: false, message: "Could not get count" });
        return;
    }
});

export default router;

