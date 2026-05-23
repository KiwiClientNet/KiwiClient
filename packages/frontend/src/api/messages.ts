/**
 * @brief Typed API calls for email messages: listing, fetching, flag updates.
 *
 * The mailbox path arrives from IMAP with characters that need escaping in
 * URL segments, so every call URL-encodes the path component before
 * concatenating it into the endpoint path.
 */

import type { EmailMessage, EmailMessageResponse, EmptyResponse, GlancePage, GlancePageResponse } from "@KiwiClient/shared";
import type { ApiFetchOptions } from "./client";

type AuthFetch = (endpoint: string, options?: ApiFetchOptions) => Promise<Response>;

interface FetchGlancePageArguments {
    authFetch: AuthFetch;
    mailboxPath: string;
    pageNumber: number;
    pageSize: number;
}

/**
 * @brief Fetches one paginated page of message summaries for a mailbox.
 *
 * @param arguments - The authFetch helper, the mailbox path, and the page parameters.
 * @returns The page of EmailGlance items plus pagination metadata.
 */
export async function fetchGlancePage({ authFetch, mailboxPath, pageNumber, pageSize }: FetchGlancePageArguments): Promise<GlancePage> {
    const response = await authFetch(`/api/mailboxes/${encodeURIComponent(mailboxPath)}/messages`, {
        queryParameters: { pageNumber, pageSize }
    });

    const body = (await response.json()) as GlancePageResponse;

    if (!body.success) {
        throw new Error(body.message);
    }

    return body.data;
}

interface FetchSingleMessageArguments {
    authFetch: AuthFetch;
    mailboxPath: string;
    uniqueId: number;
}

/**
 * @brief Fetches the full content of a single message including body and recipients.
 */
export async function fetchSingleMessage({ authFetch, mailboxPath, uniqueId }: FetchSingleMessageArguments): Promise<EmailMessage> {
    const response = await authFetch(`/api/mailboxes/${encodeURIComponent(mailboxPath)}/messages/${uniqueId}`);
    const body = (await response.json()) as EmailMessageResponse;

    if (!body.success) {
        throw new Error(body.message);
    }

    return body.data;
}

interface PatchMessageFlagsArguments {
    authFetch: AuthFetch;
    mailboxPath: string;
    uniqueIds: number[];
    flagsToAdd: string[];
    flagsToRemove: string[];
}

interface PatchMessageMoveArguments {
    authFetch: AuthFetch;
    mailboxPathSource: string;
    mailboxPathTarget: string;
    uniqueIds: number[];
}

/**
 * @brief Adds and removes IMAP flags on one or many messages in one request.
 *
 * Sending UIDs as an array lets a bulk toolbar action update the whole
 * selection in a single round trip rather than firing one call per row.
 */
export async function patchMessageFlags({ authFetch, mailboxPath, uniqueIds, flagsToAdd, flagsToRemove }: PatchMessageFlagsArguments): Promise<void> {
    const response = await authFetch(`/api/mailboxes/${encodeURIComponent(mailboxPath)}/messages/flags/change`, {
        method: "PATCH",
        body: { uniqueIds, add: flagsToAdd, remove: flagsToRemove }
    });

    const body = (await response.json()) as EmptyResponse;

    if (!body.success) {
        throw new Error(body.message);
    }
}

export async function patchMoveMessages({ authFetch, mailboxPathSource, mailboxPathTarget, uniqueIds }: PatchMessageMoveArguments): Promise<void> {
    const response = await authFetch(`/api/mailboxes/${encodeURIComponent(mailboxPathSource)}/messages/move`, {
        method: "PATCH",
        body: { uniqueIds, mailboxPathTarget }
    });

    const body = (await response.json()) as EmptyResponse;

    if (!body.success) {
        throw new Error(body.message);
    }
}
