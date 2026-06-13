/**
 * @brief Rate limiters used to slow down credential guessing on auth endpoints.
 *
 * The login endpoints accept user-supplied credentials and so are the primary
 * target for brute force attacks. Refresh is limited less aggressively because
 * a legitimate client may rotate access tokens many times in normal use.
 */

import rateLimit from "express-rate-limit";

const ONE_MINUTE_MS = 60 * 1000;

/**
 * @brief Five attempts per minute per IP for the credentialed login endpoints.
 *
 * Aggressive enough to discourage brute force without rejecting a user who
 * mistypes their password a couple of times.
 */
export const loginRateLimiter = rateLimit({
    windowMs: ONE_MINUTE_MS,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, code: "AUTH_INVALID", message: "Too many login attempts; try again shortly" }
});

/**
 * @brief Five attempts per minute per IP for sending emails.
 *
 * Aggressive enough to discourage people from spamming the API however.
 *
 * TODO: Is it possible to have a queue of messages from the client that are sent to the API which have gone over the rate limit?
 */
export const sendRateLimiter = rateLimit({
    windowMs: ONE_MINUTE_MS,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, code: "SMTP_TOO_MANY_MESSAGES_SENT", message: "Too many messages already sent; please try again shortly" }
});

/**
 * @brief Higher ceiling for refresh because a single browsing session triggers many.
 *
 * Refresh tokens are httpOnly cookies and not user-typed, so brute force is
 * not the threat model; this limit exists to bound damage if the cookie leaks.
 */
export const refreshRateLimiter = rateLimit({
    windowMs: ONE_MINUTE_MS,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, code: "AUTH_EXPIRED", message: "Too many refresh requests" }
});
