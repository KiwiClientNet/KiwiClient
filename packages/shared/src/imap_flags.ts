/**
 * @brief IMAP system flag wire constants.
 *
 * RFC 3501 system flags are escaped strings beginning with a backslash. They
 * are shared between the backend (parsing flag sets from imapflow) and the
 * frontend (sending mark-read / star mutations) so that a typo on one side
 * cannot silently disagree with the other.
 */

export const SEEN_FLAG = "\\Seen";
export const FLAGGED_FLAG = "\\Flagged";
export const ANSWERED_FLAG = "\\Answered";
export const DRAFT_FLAG = "\\Draft";
