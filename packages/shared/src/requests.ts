/**
 * @brief Request schemas for non-authentication endpoints.
 *
 * Each schema is the source of truth for one route's input. The backend uses
 * safeParse for validation and the frontend can use the inferred types when
 * constructing requests.
 */

import { z } from 'zod';

/**
 * @brief Query parameters for paginated mailbox listings.
 *
 * Page numbers are 1-indexed because that is the convention surfaced to the
 * user; the backend converts to whatever sequence number IMAP needs.
 *
 * Coerced from string because Express query parameters always arrive as
 * strings even when the value is numeric.
 */
export const GlancePageRequestSchema = z.object({
    pageNumber: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

/**
 * @brief Body of a flag update request covering one or many messages.
 *
 * Accepts an array of UIDs so a single round trip can flip flags on a bulk
 * selection from the glance list. Splitting flags into add and remove
 * arrays lets the same request toggle in either direction.
 */
export const MessageFlagsUpdateSchema = z.object({
    uniqueIds: z.array(z.number().int().nonnegative()).min(1),
    add: z.array(z.string()).default([]),
    remove: z.array(z.string()).default([])
});

export type GlancePageRequest = z.infer<typeof GlancePageRequestSchema>;
export type MessageFlagsUpdate = z.infer<typeof MessageFlagsUpdateSchema>;
