/**
 * @brief Entry point for the shared package, re-exporting every schema and type.
 *
 * Importers should bring symbols in from "@KiwiClient/shared" rather than
 * reaching into individual files so that internal reorganisation does not
 * break consumers.
 */

import { z } from 'zod';
import { DEFAULT_PORT } from './defaults.js';

export * from './email.js';
export * from './api.js';
export * from './requests.js';
export * from './imap_flags.js';
export { DEFAULT_PORT } from './defaults.js';

/**
 * @brief Optional advanced overrides passed during login.
 *
 * Currently only the IMAP port is exposed but the schema is intentionally an
 * object so additional fields can be added without breaking the wire format.
 */
export const AdvancedEmailServerConfigSchema = z.object({
    port: z.number().default(DEFAULT_PORT)
});

/**
 * @brief Stored credentials and server identity for a private IMAP login.
 *
 * Used internally on the backend after a login request has been validated;
 * carries the plaintext password through the connection pool key path.
 */
export const ServerLoginSchema = z.object({
    serverType: z.literal('PRIVATE'),
    email: z.string().email(),
    password: z.string(),
    advancedConfig: AdvancedEmailServerConfigSchema.optional()
});

/**
 * @brief Request body for the private email server login endpoint.
 */
export const LoginServerRequestSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    rememberMe: z.boolean().default(false)
});

/** @brief Request body for signing up to the waitlist */
export const LandingSignupRequestSchema = z.object({
    email: z.string().email(),
})

/** @brief URL params for unsubscribing from the waitlist */
export const LandingUnsubscribeRequestSchema = z.object({
    email: z.string().email(),
    token: z.string()
})

/**
 * @brief Stored credentials for a Gmail login obtained via Google OAuth2.
 *
 * Holds both the current access code and the optional refresh token so the
 * connection pool can renew expired access codes without forcing the user
 * to log in again.
 */
export const GoogleLoginSchema = z.object({
    serverType: z.literal('GMAIL'),
    email: z.string().email(),
    accessCode: z.string(),
    googleRefreshToken: z.string().optional(),
    advancedConfig: AdvancedEmailServerConfigSchema.optional()
});

/**
 * @brief Request body for the Google OAuth2 callback endpoint.
 */
export const GoogleLoginRequestSchema = z.object({
    accessCode: z.string()
});

/**
 * @brief Response body for the authentication endpoints.
 *
 * Pre-dates the standard apiResult envelope and is retained because the
 * auth flow has its own shape with the access token returned in the body.
 */
export const AuthResponseSchema = z.object({
    success: z.boolean(),
    accessToken: z.string().optional(),
    email: z.string().email().optional(),
    message: z.string().optional()
});

export type AdvancedEmailServerConfig = z.infer<typeof AdvancedEmailServerConfigSchema>;
export type ServerLoginBody = z.infer<typeof ServerLoginSchema>;
export type ServerLoginRequestBody = z.infer<typeof LoginServerRequestSchema>;
export type LandingSignupRequest = z.infer<typeof LandingSignupRequestSchema>;
export type LandingUnsubscribeRequest = z.infer<typeof LandingUnsubscribeRequestSchema>;
export type GoogleLoginBody = z.infer<typeof GoogleLoginSchema>;
export type GoogleLoginRequestBody = z.infer<typeof GoogleLoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
