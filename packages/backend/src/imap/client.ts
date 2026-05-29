/**
 * @brief IMAP client wrapper that returns shared DTOs instead of imapflow types.
 *
 * No code outside this folder should import from imapflow. The wrapper owns
 * connection lifecycle, login dispatch by server type, and conversion of
 * raw IMAP responses into the shapes consumed by the rest of the system.
 */

import {
    DEFAULT_PORT,
    type EmailGlance,
    type EmailMessage,
    type GlancePage,
    type GoogleLoginBody,
    type Mailbox,
    type ServerLoginBody
} from "@KiwiClient/shared";
import {
    type DownloadObject,
    ImapFlow,
    type ImapFlowOptions,
    type ListResponse,
    type MessageStructureObject
} from "imapflow";
import { strict as assert } from "node:assert";
import { mapEmailGlance, mapEmailMessage, mapMailbox } from "./mappers.js";

interface InlineImageResolutionResult {
    html: string;
}

export class ImapInstance {

    private imapClient: undefined | ImapFlow;
    private status: ImapInstance.Status;

    constructor() {
        this.imapClient = undefined;
        this.status = ImapInstance.Status.UNDEFINED;
    }

    /**
     * @brief Reports whether the instance is currently authenticated.
     */
    private isAuthenticated(): boolean {
        return this.status === ImapInstance.Status.LOGGED_IN && this.imapClient !== undefined;
    }

    /**
     * @brief Maps a thrown imapflow error onto the internal status taxonomy.
     */
    private setStatusFromError(thrownError: any): void {
        if (thrownError.code === "ENOTFOUND") {
            this.status = ImapInstance.Status.NO_SERVER;
            return;
        }
        if (thrownError.code === "NoConnection") {
            this.status = ImapInstance.Status.NOT_CONNECTED;
            return;
        }
        if (thrownError.authenticationFailed) {
            this.status = ImapInstance.Status.AUTH_ERROR;
            return;
        }
        this.status = ImapInstance.Status.UNKNOWN_ERROR;
    }

    /**
     * @brief Builds the imapflow options for a private IMAP server login.
     *
     * Derives the host from the email domain by prefixing "mail." which is
     * the convention used by the cPanel-style hosts this client targets.
     */
    private buildPrivateLoginOptions(loginRequest: ServerLoginBody): ImapFlowOptions {
        const advancedConfiguration = loginRequest.advancedConfig ?? { port: DEFAULT_PORT };
        const [user, hostname] = loginRequest.email.split("@");

        return {
            host: `mail.${hostname}`,
            port: advancedConfiguration.port,
            secure: true,
            auth: {
                user: `${user}`,
                pass: loginRequest.password
            },
            logger: false
        };
    }

    /**
     * @brief Builds the imapflow options for a Gmail OAuth2 login.
     */
    private buildGmailLoginOptions(loginRequest: GoogleLoginBody): ImapFlowOptions {
        const advancedConfiguration = loginRequest.advancedConfig ?? { port: DEFAULT_PORT };

        return {
            host: "imap.gmail.com",
            port: advancedConfiguration.port,
            secure: true,
            auth: {
                user: loginRequest.email,
                accessToken: loginRequest.accessCode
            },
            logger: false
        };
    }

    /**
     * @brief Connects to the email server using the supplied login body.
     *
     * @param loginRequest - The validated login body for either Gmail or a private server.
     * @returns True on a successful connect; false when the credentials are rejected or unreachable.
     */
    async loginToEmailServer(loginRequest: ServerLoginBody | GoogleLoginBody): Promise<ImapInstance.Status> {
        if (this.isAuthenticated()) {
            return this.status;
        }

        let loginOptions: ImapFlowOptions;
        switch (loginRequest.serverType) {
            case "PRIVATE":
                loginOptions = this.buildPrivateLoginOptions(loginRequest);
                break;
            case "GMAIL":
                loginOptions = this.buildGmailLoginOptions(loginRequest);
                break;
            default:
                this.status = ImapInstance.Status.UNDEFINED;
                return this.status;
        }

        try {
            this.imapClient = new ImapFlow(loginOptions);
            this.imapClient.on("error", (socketError: any) => {
                console.warn(`[ImapFlow] socket error:`, socketError?.code ?? socketError?.message ?? socketError);
            });
            await this.imapClient.connect();
            this.status = ImapInstance.Status.LOGGED_IN;
        } catch (thrownError: any) {
            this.imapClient = undefined;
            this.setStatusFromError(thrownError);
        }

        return this.status;
    }

    /**
     * @brief Politely closes the IMAP session and clears local state.
     */
    async logoutFromEmailServer(): Promise<boolean> {
        if (this.status === ImapInstance.Status.LOGGED_OUT || !this.imapClient) {
            return false;
        }

        try {
            await this.imapClient.logout();
        } catch (thrownError: any) {
            console.warn("IMAP logout encountered an error (likely already disconnected):", thrownError);
        } finally {
            this.imapClient = undefined;
            this.status = ImapInstance.Status.LOGGED_OUT;
        }

        return true;
    }

    /**
     * @brief Sends a NOOP to keep the connection warm and detect dead sockets.
     */
    async isAlive(): Promise<boolean> {
        if (!this.imapClient) {
            return false;
        }

        try {
            await this.imapClient.noop();
            return true;
        } catch {
            return false;
        }
    }

    getStatus(): ImapInstance.Status {
        return this.status;
    }

    /**
     * @brief Lists every mailbox visible to the authenticated user.
     */
    async getMailboxes(): Promise<Mailbox[]> {
        if (!this.isAuthenticated()) {
            return [];
        }

        const listResponses = await this.imapClient!.list();
        return listResponses.map(mapMailbox);
    }

    /**
     * @brief Gets the number of unseen messages in a mailbox
     * @param mailboxPath - The mailbox path to get the unseen count 
     * @returns The unseen count, a negative number indicates an error
     */
    async getUnseenCount(mailboxPath: string): Promise<number> {
        const ERROR = -1;
        if (!this.isAuthenticated()) {
            return ERROR;
        }

        try {
            const status = await this.imapClient!.status(mailboxPath, { unseen: true });
            return status.unseen ?? ERROR;

        } catch (error: any) {
            console.error(error);
            return -1;
        }
    }

    /**
     * @brief Finds the raw listing entry for a mailbox path, or null when absent.
     *
     * Used so callers can inspect the mailbox flags before attempting to
     * select it; some IMAP namespaces such as "[Gmail]" appear in LIST but
     * carry the "\\Noselect" flag and reject SELECT commands outright.
     */
    private async findMailbox(mailboxPath: string): Promise<ListResponse | null> {
        if (!this.isAuthenticated()) {
            return null;
        }

        const availableMailboxes = await this.imapClient!.list();
        for (const mailbox of availableMailboxes) {
            if (mailbox.path === mailboxPath) {
                return mailbox;
            }
        }
        return null;
    }

    /**
     * @brief Reports whether the given mailbox can be selected for read operations.
     *
     * A mailbox is selectable when it exists in the listing and does not
     * carry the IMAP "\\Noselect" flag.
     */
    private async isMailboxSelectable(mailboxPath: string): Promise<boolean> {
        const mailbox = await this.findMailbox(mailboxPath);
        if (!mailbox) {
            return false;
        }

        const noSelectFlagSet = mailbox.flags && (mailbox.flags as Set<string>).has("\\Noselect");
        return !noSelectFlagSet;
    }

    /**
     * @brief Fetches one page of message glances from the given mailbox.
     *
     * IMAP sequence numbers are 1-indexed and run from the oldest message
     * upwards, so the most recent messages live at the highest sequence
     * numbers. This method computes the slice corresponding to a 1-indexed
     * page where page 1 is the newest set of messages.
     *
     * @param mailboxPath - The IMAP path of the mailbox to read.
     * @param pageNumber - The 1-indexed page of results to return.
     * @param pageSize - The maximum number of messages per page.
     * @returns The glance page DTO, possibly empty.
     */
    async getMessages(mailboxPath: string, pageNumber: number = 1, pageSize: number = 25): Promise<GlancePage> {
        const emptyPage: GlancePage = { items: [], currentPage: 0, lastPage: 0 };

        if (!this.isAuthenticated()) {
            return emptyPage;
        }

        if (!await this.isMailboxSelectable(mailboxPath)) {
            return emptyPage;
        }

        const mailboxLock = await this.imapClient!.getMailboxLock(mailboxPath);

        try {
            if (!this.imapClient!.mailbox) {
                return emptyPage;
            }

            const totalMessages = this.imapClient!.mailbox.exists;
            if (totalMessages === 0) {
                return emptyPage;
            }

            const safePageSize = Math.max(1, Math.abs(pageSize));
            const safePageNumber = Math.max(1, Math.abs(pageNumber));

            const messagesToSkip = (safePageNumber - 1) * safePageSize;
            const sequenceEnd = Math.max(0, totalMessages - messagesToSkip);
            const sequenceStart = Math.max(1, sequenceEnd - safePageSize + 1);

            const lastPageNumber = Math.ceil(totalMessages / safePageSize);
            const nextPageNumber = safePageNumber < lastPageNumber ? safePageNumber + 1 : undefined;

            if (sequenceEnd <= 0 || sequenceStart > totalMessages) {
                return { items: [], currentPage: safePageNumber, lastPage: lastPageNumber };
            }

            const fetchRange = `${sequenceStart}:${sequenceEnd}`;
            const glances: EmailGlance[] = [];
            for await (const message of this.imapClient!.fetch(fetchRange, { envelope: true, flags: true })) {
                const glance = mapEmailGlance(message, mailboxPath);
                if (glance) {
                    glances.push(glance);
                }
            }

            return {
                items: glances,
                currentPage: safePageNumber,
                lastPage: lastPageNumber,
                nextPage: nextPageNumber
            };

        } finally {
            mailboxLock.release();
        }
    }

    /**
     * @brief Adds and removes flags on one or many messages in one round trip.
     *
     * The UIDs are joined into a comma-delimited IMAP sequence set so the
     * backend issues at most two STORE commands regardless of how many
     * messages were selected, which is cheaper than looping per message.
     * A mailbox lock is acquired for the duration so the STORE commands
     * run inside a guaranteed SELECT context.
     *
     * @param mailboxPath - The IMAP path of the mailbox containing the messages.
     * @param uniqueIds - The message UIDs to update; must be non-empty.
     * @param flagsToAdd - Flags to set on each message.
     * @param flagsToRemove - Flags to clear from each message.
     * @returns True on success; false when no client is connected.
     */
    async updateMessageFlags(mailboxPath: string, uniqueIds: number[], flagsToAdd: string[], flagsToRemove: string[]): Promise<boolean> {
        assert(uniqueIds.length > 0, "uniqueIds must contain at least one value");
        for (const uniqueId of uniqueIds) {
            assert(!isNaN(uniqueId) && uniqueId >= 0, "every uniqueId must be a non-negative number");
        }

        if (!this.imapClient || !this.isAuthenticated()) {
            return false;
        }

        if (flagsToAdd.length === 0 && flagsToRemove.length === 0) {
            return true;
        }

        const uidRange = uniqueIds.join(",");
        const mailboxLock = await this.imapClient.getMailboxLock(mailboxPath);

        try {
            if (flagsToAdd.length > 0) {
                await this.imapClient.messageFlagsAdd(uidRange, flagsToAdd, { uid: true });
            }
            if (flagsToRemove.length > 0) {
                await this.imapClient.messageFlagsRemove(uidRange, flagsToRemove, { uid: true });
            }
        } finally {
            mailboxLock.release();
        }

        return true;
    }

    /**
     * @param mailboxPathSource - The source mailbox.
     * @param mailboxPathDestination - The destination mailbox.
     * @param uniqueIds - The message UIDs to update; must be non-empty.
     * @returns A boolean on if the move was successful or not
     */
    async moveMessages(mailboxPathSource: string, mailboxPathDestination: string, uniqueIds: number[]): Promise<boolean> {
        assert(uniqueIds.length > 0, "uniqueIds must contain at least one value");
        for (const uniqueId of uniqueIds) {
            assert(!isNaN(uniqueId) && uniqueId >= 0, "every uniqueId must be a non-negative number");
        }

        if (!this.imapClient || !this.isAuthenticated()) {
            return false;
        }

        if (mailboxPathSource.length === 0 || mailboxPathDestination.length === 0) {
            return false;
        }

        const uidRange = uniqueIds.join(",");
        const mailboxLock = await this.imapClient.getMailboxLock(mailboxPathSource);

        try {
            const result = await this.imapClient.messageMove(uidRange, mailboxPathDestination, { uid: true });
            if (!result) {
                return false;
            }
        } catch {
            return false;
        }
        finally {
            mailboxLock.release();
        }

        return true;
    }

    /**
     * @brief Walks the body structure tree to find a part with the given MIME type.
     *
     * @param node - The current body structure node, or undefined.
     * @param mimeType - The MIME type to search for, for example "text/html".
     * @returns The IMAP part identifier of the matching part, or null.
     */
    private findMessagePartByType(node: MessageStructureObject | undefined, mimeType: string): string | null {
        if (!node) {
            return null;
        }

        if (node.type === mimeType) {
            return node.part ?? "1";
        }

        if (!node.childNodes) {
            return null;
        }

        for (const child of node.childNodes) {
            const found = this.findMessagePartByType(child, mimeType);
            if (found) {
                return found;
            }
        }
        return null;
    }

    /**
     * @brief Collects every inline image referenced from the message body.
     */
    private findInlineImages(rootNode: MessageStructureObject): MessageStructureObject[] {
        const result: MessageStructureObject[] = [];

        const recurseIntoNode = (node: MessageStructureObject): void => {
            if (!node) {
                return;
            }

            if (node.id && node.part && node.type.startsWith("image")) {
                result.push(node);
            }

            if (!node.childNodes) {
                return;
            }

            for (const childNode of node.childNodes) {
                recurseIntoNode(childNode);
            }
        };

        recurseIntoNode(rootNode);
        return result;
    }

    /**
     * @brief Downloads a body part and decodes it as a UTF-8 string.
     *
     * Returns an empty string on any failure path because the surrounding
     * email view tolerates a missing body better than an unhandled rejection
     * that bubbles up to the route handler.
     */
    private async readMessagePartAsString(messageUid: number, partId: string): Promise<string> {
        if (!this.imapClient || !this.isAuthenticated()) {
            return "";
        }

        try {
            const downloadResult = await this.imapClient.download(messageUid, partId, { uid: true });
            if (!downloadResult || !downloadResult.content) {
                return "";
            }

            const chunks: Buffer[] = [];
            for await (const chunk of downloadResult.content) {
                chunks.push(chunk);
            }

            return Buffer.concat(chunks).toString("utf-8");
        } catch (thrownError: any) {
            console.warn(`Failed to download part ${partId} for uid ${messageUid}:`, thrownError?.message ?? thrownError);
            return "";
        }
    }

    /**
     * @brief Replaces every `cid:` reference in the HTML with an embedded data URI.
     *
     * Pure synchronous companion to the parallel IMAP fetch; given the already
     * downloaded image part buffers it walks the inline image node list and
     * substitutes each `cid:<contentId>` occurrence with a base64 data URI so
     * the frontend iframe can render inline images without further requests.
     *
     * @param html - The sanitised HTML body of the message, containing zero or more `cid:` references.
     * @param inlineImages - The image body-structure nodes discovered earlier, each carrying a `part` id, MIME `type`, and content `id`.
     * @param bodyParts - The map of body-part id to raw buffer returned by the parallel `fetchOne` call, or undefined when the fetch was skipped.
     * @returns The HTML with every resolvable `cid:` reference rewritten to a data URI; unresolved references are left untouched.
     */
    private applyInlineImages(html: string, inlineImages: MessageStructureObject[], bodyParts: Map<string, Buffer> | undefined): string {
        if (!bodyParts) {
            return html;
        }

        let resolvedHtml = html;
        for (const imageNode of inlineImages) {
            if (!imageNode.part || !imageNode.id) {
                continue;
            }

            const partBuffer = bodyParts.get(imageNode.part);
            if (!partBuffer) {
                continue;
            }

            const cleanContentId = imageNode.id.replace(/^<|>$/g, "");
            const base64Payload = partBuffer.toString("utf-8").trim();
            const dataUri = `data:${imageNode.type};base64,${base64Payload}`;

            resolvedHtml = resolvedHtml.replaceAll(`cid:${cleanContentId}`, dataUri);
        }

        return resolvedHtml;
    }

    /**
     * @brief Fetches envelope, flags, and body content for one UID assuming the mailbox lock is held.
     *
     * Carved out of getSingleMessage so getManyMessages can reuse the body-extraction
     * logic without re-acquiring the mailbox lock for every UID. Callers must
     * ensure the lock is acquired before invoking and released afterwards.
     *
     * @param messageUid - The IMAP UID of the message to fetch.
     * @param mailboxPath - The IMAP path of the mailbox; used only to populate the returned DTO.
     * @returns The full EmailMessage DTO, or null when the message has no envelope or cannot be fetched.
     */
    private async fetchMessageContent(messageUid: number, mailboxPath: string): Promise<EmailMessage | null> {
        const fetchedMessage = await this.imapClient!.fetchOne(messageUid, {
            envelope: true,
            flags: true,
            bodyStructure: true
        }, { uid: true });

        if (!fetchedMessage || !fetchedMessage.bodyStructure) {
            return null;
        }

        const htmlPartId = this.findMessagePartByType(fetchedMessage.bodyStructure, "text/html");
        const textPartId = this.findMessagePartByType(fetchedMessage.bodyStructure, "text/plain");

        let htmlContent: string | undefined;
        let textContent: string | undefined;

        // Check for HTML part first, if it's there then use it otherwise look for the text part
        if (htmlPartId) {
            const inlineImages = this.findInlineImages(fetchedMessage.bodyStructure);
            const inlineImagePartIds = inlineImages.filter(inlineImageNode => inlineImageNode.part).map(inlineImageNode => inlineImageNode.part!);

            const [rawHtml, inlineFetched] = await Promise.all([
                this.readMessagePartAsString(messageUid, htmlPartId),
                inlineImagePartIds.length > 0 ? this.imapClient!.fetchOne(messageUid, { bodyParts: inlineImagePartIds }, { uid: true }) : Promise.resolve(null)
            ]);

            htmlContent = inlineFetched ? this.applyInlineImages(rawHtml, inlineImages, inlineFetched.bodyParts) : rawHtml;
        } else if (textPartId) {
            textContent = await this.readMessagePartAsString(messageUid, textPartId);
        }

        return mapEmailMessage({
            message: fetchedMessage,
            mailboxPath,
            html: htmlContent,
            text: textContent
        });
    }

    /**
     * @brief Fetches a single message including envelope, flags, and body content.
     *
     * Returns null when the message cannot be located or has no envelope.
     *
     * @param mailboxPath - The IMAP path of the containing mailbox.
     * @param uniqueId - The IMAP UID of the message to fetch.
     * @returns The full EmailMessage DTO, or null when unavailable.
     */
    async getSingleMessage(mailboxPath: string, uniqueId: number): Promise<EmailMessage | null> {
        assert(uniqueId >= 0, "uniqueId must be non-negative");
        const messageUid = Math.round(uniqueId);

        if (!this.imapClient || !this.isAuthenticated()) {
            return null;
        }

        if (!await this.isMailboxSelectable(mailboxPath)) {
            return null;
        }

        const mailboxLock = await this.imapClient.getMailboxLock(mailboxPath);

        try {
            return await this.fetchMessageContent(messageUid, mailboxPath);
        } finally {
            mailboxLock.release();
        }
    }

    /**
     * @brief Fetches several messages within a single mailbox lock.
     *
     * Acquires the IMAP mailbox lock once and iterates the UIDs serially,
     * reusing fetchMessageContent for each. Useful for prefetch flows that
     * warm a frontend cache without paying one HTTP round trip and one lock
     * acquire per message. Messages that fail to fetch are skipped silently
     * so a single broken UID does not abort the whole batch.
     *
     * IMAP is a serial protocol per connection, so the loop cannot be
     * parallelised by spawning concurrent fetchMessageContent calls on the
     * same imapflow client.
     *
     * @param mailboxPath - The IMAP path of the containing mailbox.
     * @param uniqueIds - The IMAP UIDs to fetch; an empty array is a no-op.
     * @returns The resolved EmailMessage DTOs in the same order as uniqueIds, with any null entries dropped.
     */
    async getManyMessages(mailboxPath: string, uniqueIds: number[]): Promise<EmailMessage[]> {
        for (const uniqueId of uniqueIds) {
            assert(!isNaN(uniqueId) && uniqueId >= 0, "every uniqueId must be a non-negative number");
        }

        if (uniqueIds.length === 0) {
            return [];
        }

        if (!this.imapClient || !this.isAuthenticated()) {
            return [];
        }

        if (!await this.isMailboxSelectable(mailboxPath)) {
            return [];
        }

        const mailboxLock = await this.imapClient.getMailboxLock(mailboxPath);
        const results: EmailMessage[] = [];

        try {
            for (const uniqueId of uniqueIds) {
                const messageUid = Math.round(uniqueId);
                const message = await this.fetchMessageContent(messageUid, mailboxPath);
                if (message) {
                    results.push(message);
                }
            }
        } finally {
            mailboxLock.release();
        }

        return results;
    }

    /**
     * @brief Downloads a single message body part for streaming back to the client.
     *
     * Used for inline image and attachment routes where the response is the
     * raw byte stream rather than an embedded data URI.
     */
    async downloadMessagePart(mailboxPath: string, uniqueId: number, partId: string): Promise<DownloadObject | null> {
        assert(uniqueId >= 0, "uniqueId must be non-negative");

        if (!this.imapClient) {
            return null;
        }

        const mailboxLock = await this.imapClient.getMailboxLock(mailboxPath);

        try {
            return await this.imapClient.download(uniqueId, partId, { uid: true });
        } catch (thrownError: any) {
            console.error("downloadMessagePart failed:", thrownError);
            return null;
        } finally {
            mailboxLock.release();
        }
    }
}

export namespace ImapInstance {
    export enum Status {
        LOGGED_IN,
        LOGGED_OUT,
        AUTH_ERROR,
        NO_SERVER,
        NOT_CONNECTED,
        UNDEFINED,
        UNKNOWN_ERROR,
    }
}
