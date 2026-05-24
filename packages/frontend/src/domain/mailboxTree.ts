/**
 * @brief Pure builder that arranges a flat mailbox list into a parent-child tree.
 *
 * The IMAP server returns mailboxes as a flat list with a parentPath pointer
 * on each entry. The frontend renders them as a folder tree, so this module
 * converts between the two representations. Keeping it pure (no state, no
 * mutation of inputs) makes the conversion easy to reason about and easy
 * to test independently of any UI code.
 */

import type { Mailbox } from "@KiwiClient/shared";

export interface MailboxTreeNode {
    mailbox: Mailbox;
    children: MailboxTreeNode[];
}

/**
 * @brief Titalises a mailbox name for display.
 *
 * @param rawName - The raw mailbox name as returned by the server.
 * @returns The display-cased name.
 */
function formatMailboxName(rawName: string): string {
    if (rawName.length === 0) {
        return "";
    }

    if (rawName.startsWith("[")) {
        return rawName;
    }

    const lowerCased = rawName.toLowerCase();
    return lowerCased.charAt(0).toUpperCase() + lowerCased.slice(1);
}

/**
 * @brief Builds a forest of mailbox trees from a flat list of mailboxes.
 *
 * Mailboxes whose parent is not present in the input are promoted to roots
 * rather than being silently dropped; this matches the legacy behaviour of
 * the old class-based builder.
 *
 * @param mailboxes - The flat list of mailboxes from the API.
 * @returns The roots of every tree in the forest.
 */
export function buildMailboxTree(mailboxes: Mailbox[], setSpecialTrashFolderPath: (path: string) => void): MailboxTreeNode[] {
    const nodeByPath = new Map<string, MailboxTreeNode>();

    for (const mailbox of mailboxes) {
        const displayMailbox: Mailbox = { ...mailbox, name: mailbox.specialUse === '\\Inbox' ? formatMailboxName(mailbox.name) : mailbox.name };
        if (displayMailbox.specialUse === "\\Trash") {
            setSpecialTrashFolderPath(displayMailbox.path);
        }
        nodeByPath.set(mailbox.path, { mailbox: displayMailbox, children: [] });
    }

    const rootNodes: MailboxTreeNode[] = [];

    for (const node of nodeByPath.values()) {
        const parentPath = node.mailbox.parentPath;

        if (!parentPath) {
            rootNodes.push(node);
            continue;
        }

        const parentNode = nodeByPath.get(parentPath);

        if (!parentNode) {
            rootNodes.push(node);
            continue;
        }

        parentNode.children.push(node);
    }

    return rootNodes;
}
