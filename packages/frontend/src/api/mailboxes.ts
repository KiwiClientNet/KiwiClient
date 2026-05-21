/**
 * @brief Typed API calls for the mailbox folder list.
 */

import type { Mailbox, MailboxesResponse } from "@KiwiClient/shared";
import type { ApiFetchOptions } from "./client";

type AuthFetch = (endpoint: string, options?: ApiFetchOptions) => Promise<Response>;

/**
 * @brief Fetches the user's mailbox folder list.
 *
 * Throws on a non-success envelope so React Query treats the response as an
 * error rather than a successful empty result.
 *
 * @param authFetch - The auth-aware fetch helper from AuthContext.
 * @returns The flat list of mailboxes from the server.
 */
export async function fetchMailboxes(authFetch: AuthFetch): Promise<Mailbox[]> {
    const response = await authFetch("/api/mailboxes");
    const body = (await response.json()) as MailboxesResponse;

    if (!body.success) {
        throw new Error(body.message);
    }

    return body.data;
}
