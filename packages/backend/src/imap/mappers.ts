/**
 * @brief Pure mappers from imapflow wire shapes into the shared DTOs.
 *
 * These functions exist so that no consumer outside this folder ever sees an
 * imapflow type directly. Keeping the mappers pure makes them testable in
 * isolation and lets the client code orchestrate fetches without mixing in
 * transformation logic.
 */

import type { FetchMessageObject, ListResponse } from "imapflow";
import type { EmailAddress, EmailGlance, EmailMessage, Mailbox } from "@KiwiClient/shared";
import { parseImapFlags } from "./flags.js";

interface RawAddress {
    name?: string;
    address?: string;
}

/**
 * @brief Maps a single imapflow address entry into the domain EmailAddress.
 *
 * Returns null when no address is present because the schema requires a
 * non-empty address string; callers filter out the nulls before storing
 * the result.
 *
 * @param rawAddress - The address entry as supplied by imapflow.
 * @returns An EmailAddress with a guaranteed address, or null.
 */
function mapAddress(rawAddress: RawAddress | undefined): EmailAddress | null {
    if (!rawAddress || !rawAddress.address) {
        return null;
    }

    return {
        name: rawAddress.name && rawAddress.name.length > 0 ? rawAddress.name : undefined,
        address: rawAddress.address
    };
}

/**
 * @brief Maps a list of imapflow addresses, dropping any that lack an address.
 *
 * @param rawAddresses - The list of address entries supplied by imapflow.
 * @returns A list of valid EmailAddress entries, possibly empty.
 */
function mapAddressList(rawAddresses: RawAddress[] | undefined): EmailAddress[] {
    if (!rawAddresses) {
        return [];
    }

    const result: EmailAddress[] = [];
    for (const rawAddress of rawAddresses) {
        const mapped = mapAddress(rawAddress);
        if (mapped) {
            result.push(mapped);
        }
    }
    return result;
}

/**
 * @brief Maps an imapflow mailbox listing entry into the domain Mailbox.
 *
 * @param listResponse - A single entry from imapflow client.list().
 * @returns The Mailbox shape consumed by the frontend.
 */
export function mapMailbox(listResponse: ListResponse): Mailbox {
    return {
        path: listResponse.path,
        name: listResponse.name,
        parentPath: listResponse.parentPath ? listResponse.parentPath : undefined,
        specialUse: listResponse.specialUse ? listResponse.specialUse : undefined,
        flags: listResponse.flags ? Array.from(listResponse.flags) : [],
        delimiter: listResponse.delimiter ?? "/",
        // LIST does not report unseen counts; the route fills this in with a
        // STATUS query per mailbox after listing.
        unseen: 0
    };
}

/**
 * @brief Coerces an envelope date value to an ISO string, tolerating string inputs.
 *
 * imapflow's type declares envelope.date as Date but real responses can yield
 * a string for messages whose RFC 5322 Date header could not be parsed into a
 * Date instance. Falling back to the epoch keeps the schema satisfied and the
 * frontend able to render the row instead of dropping the entire message.
 */
function toIsoStringSafe(rawDate: unknown): string {
    if (rawDate instanceof Date) {
        const epochMillis = rawDate.getTime();
        return Number.isNaN(epochMillis) ? new Date(0).toISOString() : rawDate.toISOString();
    }
    if (typeof rawDate === "string" || typeof rawDate === "number") {
        const parsedDate = new Date(rawDate);
        if (!Number.isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString();
        }
    }
    return new Date(0).toISOString();
}

/**
 * @brief Maps a fetched message into the lightweight EmailGlance DTO.
 *
 * Returns null when the message has no envelope or no sender address; the
 * frontend cannot display such messages so they are filtered out at the
 * boundary rather than producing partial entries.
 *
 * @param message - A single message returned by imapflow fetch.
 * @param mailboxPath - The IMAP path of the mailbox this message belongs to.
 * @returns A populated EmailGlance, or null when the data is unusable.
 */
export function mapEmailGlance(message: FetchMessageObject, mailboxPath: string): EmailGlance | null {
    if (!message.envelope || !message.envelope.from || message.envelope.from.length === 0) {
        return null;
    }

    const firstSender = mapAddress(message.envelope.from[0]);
    if (!firstSender) {
        return null;
    }

    const firstRecipient = message.envelope.to && message.envelope.to.length > 0
        ? mapAddress(message.envelope.to[0])
        : null;

    const dateIso = toIsoStringSafe(message.envelope.date);

    return {
        uniqueId: message.uid,
        mailboxPath,
        from: firstSender,
        firstRecipient: firstRecipient ?? undefined,
        subject: message.envelope.subject && message.envelope.subject.length > 0 ? message.envelope.subject : "(No Subject)",
        dateIso,
        flags: parseImapFlags(message.flags),
        hasAttachments: false
    };
}

interface EmailMessageMapperInput {
    message: FetchMessageObject;
    mailboxPath: string;
    html?: string;
    text?: string;
}

/**
 * @brief Maps a fetched message plus extracted body parts into EmailMessage.
 *
 * The body extraction is performed by the client because it requires
 * additional IMAP fetches; this mapper takes the already-decoded html and
 * text strings as inputs so it stays pure.
 *
 * @param input - The message, mailbox path, and extracted body parts.
 * @returns The full EmailMessage DTO, or null when the envelope is unusable.
 */
export function mapEmailMessage(input: EmailMessageMapperInput): EmailMessage | null {
    const glance = mapEmailGlance(input.message, input.mailboxPath);
    if (!glance) {
        return null;
    }

    const envelope = input.message.envelope!;

    return {
        ...glance,
        to: mapAddressList(envelope.to),
        cc: mapAddressList(envelope.cc),
        bcc: mapAddressList(envelope.bcc),
        replyTo: mapAddressList(envelope.replyTo),
        html: input.html,
        text: input.text
    };
}
