/**
 * @brief Entry point for the shared package, re-exporting every schema and type.
 *
 * Importers should bring symbols in from "@KiwiClient/shared" rather than
 * reaching into individual files so that internal reorganisation does not
 * break consumers.
 */

import { z } from 'zod';
import { DEFAULT_IMAP_PORT, DEFAULT_SMTP_PORT } from './defaults.js';

export * from './email.js';
export * from './api.js';
export * from './requests.js';
export * from './imap_flags.js';
export * from './defaults.js';

/**
 * @brief Optional server overrides collected by the login wizard.
 *
 * Hosts are optional because the backend derives them from the email domain
 * ("mail." prefix) when absent; ports default to the standard secure ports
 * so the wizard can prefill them.
 */
export const AdvancedEmailServerConfigSchema = z.object({
    imapHost: z.string().min(1).optional(),
    imapPort: z.coerce.number().int().min(1).max(65535).default(DEFAULT_IMAP_PORT),
    smtpHost: z.string().min(1).optional(),
    smtpPort: z.coerce.number().int().min(1).max(65535).default(DEFAULT_SMTP_PORT)
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
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(1),
    rememberMe: z.boolean().default(false),
    advancedConfig: AdvancedEmailServerConfigSchema.optional()
});

/**
 * @brief Stored credentials for a Gmail login obtained via Google OAuth2.
 *
 * Holds both the current access code and the optional refresh token so the
 * connection pool can renew expired access codes without forcing the user
 * to log in again.
 */
export const GoogleLoginSchema = z.object({
    name: z.string(),
    serverType: z.literal('GMAIL'),
    email: z.string().email(),
    accessCode: z.string(),
    googleRefreshToken: z.string().optional()
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
    name: z.string().optional(),
    message: z.string().optional(),
    protocol: z.enum(['IMAP', 'SMTP']).optional(),
    field: z.enum(['host', 'port']).optional()
});

export type AdvancedEmailServerConfig = z.infer<typeof AdvancedEmailServerConfigSchema>;
export type ServerLoginBody = z.infer<typeof ServerLoginSchema>;
export type ServerLoginRequestBody = z.infer<typeof LoginServerRequestSchema>;
export type GoogleLoginBody = z.infer<typeof GoogleLoginSchema>;
export type GoogleLoginRequestBody = z.infer<typeof GoogleLoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
