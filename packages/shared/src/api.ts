/**
 * @brief Shared response envelope for every API endpoint.
 *
 * Every response is either a success carrying data or an error carrying a
 * stable machine-readable code and a human-readable message. The frontend
 * switches on the code; the message is for display only and may change.
 */

import { z } from 'zod';
import { EmailGlanceSchema, EmailMessageSchema, EmailToSendSchema, MailboxSchema } from './email.js';

/**
 * @brief Stable error codes for client-side switching.
 *
 * Adding a code is safe; renaming or removing one is a breaking change
 * because the frontend matches against these literal strings.
 */
export const ApiErrorCodeSchema = z.enum([
    'AUTH_INVALID',
    'AUTH_EXPIRED',
    'AUTH_REQUIRED',
    'VALIDATION_ERROR',
    'IMAP_NO_SERVER',
    'IMAP_NOT_CONNECTED',
    'IMAP_AUTH_ERROR',
    'IMAP_UNKNOWN_ERROR',
    'IMAP_COULD_NOT_MOVE_MESSAGE',
    "SMTP_TOO_MANY_MESSAGES_SENT",
    "SMTP_MESSAGE_INVALID",
    'MAILBOX_NOT_FOUND',
    'MESSAGE_NOT_FOUND',
    'INTERNAL_ERROR'
]);

export const ApiErrorSchema = z.object({
    success: z.literal(false),
    code: ApiErrorCodeSchema,
    message: z.string()
});

/**
 * @brief Builds a discriminated union of success-with-data or error.
 *
 * Using a helper here means every endpoint response shares the same outer
 * shape and the frontend can narrow with a single check on response.success.
 *
 * @param dataSchema - The schema for the payload returned on success.
 * @returns A zod schema for the full response envelope.
 */
export function apiResult<DataSchema extends z.ZodTypeAny>(dataSchema: DataSchema) {
    return z.discriminatedUnion('success', [
        z.object({ success: z.literal(true), data: dataSchema }),
        ApiErrorSchema
    ]);
}

/**
 * @brief A single page of email glances inside a paginated listing.
 *
 * nextPage is omitted on the last page so the frontend can detect end of
 * data without comparing currentPage against lastPage.
 */
export const GlancePageSchema = z.object({
    items: z.array(EmailGlanceSchema),
    currentPage: z.number(),
    lastPage: z.number(),
    nextPage: z.number().optional()
});

export const MailboxesResponseSchema = apiResult(z.array(MailboxSchema));
export const GlancePageResponseSchema = apiResult(GlancePageSchema);
export const EmailMessageResponseSchema = apiResult(EmailMessageSchema);
export const EmailMessagesResponseSchema = apiResult(z.array(EmailMessageSchema));
export const EmailToSendResponseSchema = apiResult(EmailToSendSchema);
export const EmptyResponseSchema = apiResult(z.object({}));

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type GlancePage = z.infer<typeof GlancePageSchema>;
export type MailboxesResponse = z.infer<typeof MailboxesResponseSchema>;
export type GlancePageResponse = z.infer<typeof GlancePageResponseSchema>;
export type EmailMessageResponse = z.infer<typeof EmailMessageResponseSchema>;
export type EmailMessagesResponse = z.infer<typeof EmailMessagesResponseSchema>;
export type EmailToSendResponse = z.infer<typeof EmailToSendResponseSchema>;
export type EmptyResponse = z.infer<typeof EmptyResponseSchema>;
