/**
 * @brief Domain schemas for email and mailbox data shared between frontend and backend.
 *
 * These schemas define the wire format. The backend maps raw IMAP responses
 * into these shapes; the frontend consumes them directly without needing
 * any knowledge of the underlying IMAP protocol.
 */

import { z } from 'zod';

/**
 * @brief A single email address with an optional display name.
 *
 * The address is the only required field because some senders omit the
 * display name entirely (machine-generated mail in particular).
 */
export const EmailAddressSchema = z.object({
    name: z.string().optional(),
    address: z.string().email()
});

/**
 * @brief Flags attached to an email, mapped from the IMAP standard set.
 *
 * Booleans are easier to consume in UI code than parsing IMAP flag strings
 * such as "\\Seen" or "\\Flagged" everywhere.
 */
export const EmailFlagsSchema = z.object({
    seen: z.boolean(),
    flagged: z.boolean(),
    answered: z.boolean(),
    draft: z.boolean()
});

/**
 * @brief Lightweight email summary used in mailbox listings.
 *
 * Excludes the message body so that paged listings remain small over the wire.
 * The full body is fetched separately via the single-message endpoint.
 *
 * firstRecipient carries only the first To address (not the full list) so
 * sent-folder listings can lead with the recipient without bloating the page.
 */
export const EmailGlanceSchema = z.object({
    uniqueId: z.number(),
    mailboxPath: z.string(),
    from: EmailAddressSchema,
    firstRecipient: EmailAddressSchema.optional(),
    subject: z.string(),
    dateIso: z.string(),
    flags: EmailFlagsSchema,
    hasAttachments: z.boolean()
});

/**
 * @brief Full email message including body and all recipients.
 *
 * Extends EmailGlance so that any consumer with an EmailMessage can also use
 * it everywhere an EmailGlance is expected.
 */
export const EmailMessageSchema = EmailGlanceSchema.extend({
    to: z.array(EmailAddressSchema),
    cc: z.array(EmailAddressSchema),
    bcc: z.array(EmailAddressSchema),
    replyTo: z.array(EmailAddressSchema),
    html: z.string().optional(),
    text: z.string().optional()
});

/**
 * @brief A single mailbox folder as exposed by the IMAP server.
 *
 * The path is the IMAP-native identifier; the name is the display label.
 * The parent path is absent for top-level mailboxes and used to reconstruct
 * the folder tree on the frontend.
 */
export const MailboxSchema = z.object({
    path: z.string(),
    name: z.string(),
    parentPath: z.string().optional(),
    specialUse: z.string().optional(),
    flags: z.array(z.string()),
    delimiter: z.string(),
    unseen: z.number()
});

/** @brief Schema for sending a an email message
 *
 * Extends the email message schema and adds who the email is from
 * */
export const EmailToSendSchema = EmailMessageSchema.extend({
    from: z.array(EmailAddressSchema)
})

export type EmailAddress = z.infer<typeof EmailAddressSchema>;
export type EmailFlags = z.infer<typeof EmailFlagsSchema>;
export type EmailGlance = z.infer<typeof EmailGlanceSchema>;
export type EmailMessage = z.infer<typeof EmailMessageSchema>;
export type EmailToSend = z.infer<typeof EmailToSendSchema>;
export type Mailbox = z.infer<typeof MailboxSchema>;
