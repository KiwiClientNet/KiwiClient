/**
 * @brief Parsing helpers for IMAP message flags.
 *
 * IMAP flags are wire strings such as "\\Seen" or "\\Flagged"; the frontend
 * only ever needs the four standard booleans, so all string-level parsing
 * lives here behind a single function.
 */

import { SEEN_FLAG, FLAGGED_FLAG, ANSWERED_FLAG, DRAFT_FLAG, type EmailFlags } from "@KiwiClient/shared";

/**
 * @brief Converts a raw IMAP flag set into the domain EmailFlags shape.
 *
 * A missing flag set is treated as no flags set rather than an error because
 * some IMAP servers omit the field entirely for messages with no flags.
 *
 * @param flagsFromImap - The flag set returned by imapflow, or undefined.
 * @returns The four standard boolean flags consumed by the frontend.
 */
export function parseImapFlags(flagsFromImap: Set<string> | undefined): EmailFlags {
    const flagSet = flagsFromImap ?? new Set<string>();
    return {
        seen: flagSet.has(SEEN_FLAG),
        flagged: flagSet.has(FLAGGED_FLAG),
        answered: flagSet.has(ANSWERED_FLAG),
        draft: flagSet.has(DRAFT_FLAG)
    };
}
