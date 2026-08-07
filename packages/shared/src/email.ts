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
 *
 * TODO: I'm repeating some code here with types
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
 * @brief Mailbox name and path.
 *
 * The path will always uniquely identify the mailbox
 */
export const MailboxNamePathSchema = z.object({
    path: z.string(),
    name: z.string(),
})

/** 
 * @brief Mailbox name and path.
 *
 * The path will always uniquely identify the mailbox
 */
export const MailboxNamePathDepthSchema = MailboxNamePathSchema.extend({
    depth: z.number()
})

/**
 * @brief A single mailbox folder as exposed by the IMAP server.
 */
export const MailboxSchema = MailboxNamePathSchema.extend({
    parentPath: z.string().optional(),
    specialUse: z.string().optional(),
    flags: z.array(z.string()),
    delimiter: z.string(),
    unseen: z.number()
});

/** 
 * @brief General Email body which is sent to a draft and eventually the sent mail
 */
export const EmailBodySchema = z.object({
    from: EmailAddressSchema,
    to: z.array(EmailAddressSchema),
    cc: z.array(EmailAddressSchema),
    bcc: z.array(EmailAddressSchema),
    replyTo: z.array(EmailAddressSchema),
    subject: z.string(),
    html: z.string().optional(),
    text: z.string().optional(),
});

/** 
 * @brief Schema for sending a an email message
 */
export const EmailToSendSchema = EmailBodySchema.extend({
    sentFolder: z.string()
});

/** 
 * @brief Schema for draftinging a an email message
 */
export const EmailToDraftSchema = EmailBodySchema.extend({
    draftFolder: z.string()
});

export const EmailUidSchema = z.object({
    uid: Number
});

export type EmailAddress = z.infer<typeof EmailAddressSchema>;
export type EmailFlags = z.infer<typeof EmailFlagsSchema>;
export type EmailGlance = z.infer<typeof EmailGlanceSchema>;
export type EmailMessage = z.infer<typeof EmailMessageSchema>;
export type EmailBody = z.infer<typeof EmailBodySchema>;
export type EmailToSend = z.infer<typeof EmailToSendSchema>;
export type EmailToDraft = z.infer<typeof EmailToDraftSchema>;
export type MailboxNamePath = z.infer<typeof MailboxNamePathSchema>;
export type MailboxNamePathDepth = z.infer<typeof MailboxNamePathDepthSchema>;
export type Mailbox = z.infer<typeof MailboxSchema>;
