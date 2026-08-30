import type { MailboxTreeNode } from "../../domain/mailboxTree";
import type { MailboxSelection } from "./types";

export function mailboxPathToSlug(path: string): string {
    const replacedPath = path.replace(/\./g, '/');
    return replacedPath.toLowerCase();
}

export function parseMailRoute(splat: string | undefined): { mailboxSlug: string | null; messageId: number | null; } {
    if (!splat) {
        return { mailboxSlug: null, messageId: null };
    }

    const parts = splat.split("/");
    const lastSegment = parts.at(-1);
    const messageId = lastSegment !== undefined && /^\d+$/.test(lastSegment) ? Number(lastSegment) : null;

    if (messageId === null) {
        return { mailboxSlug: splat, messageId: null };
    }

    const mailboxSlug = parts.slice(0, -1).join("/");
    return { mailboxSlug: mailboxSlug.length > 0 ? mailboxSlug : null, messageId };
}

export function mailPathToUrl(mailboxPath: string, messageId?: number): string {
    const slug = mailboxPathToSlug(mailboxPath);
    return messageId === undefined ? `/mail/${slug}` : `/mail/${slug}/${messageId}`;
}

export function findMailboxBySlug(tree: MailboxTreeNode[], slug: string): MailboxSelection | null {
    const target = slug.toLowerCase().replace(/\//g, '.');

    const walk = (nodes: MailboxTreeNode[]): MailboxSelection | null => {
        for (const node of nodes) {
            // Base case
            const adjustedPath = node.mailbox.path.toLowerCase().replace(/\//g, '.');
            if (adjustedPath === target) {
                return { name: node.mailbox.name, path: node.mailbox.path };
            }

            const hit = walk(node.children)
            if (hit) {
                return hit;
            }
        }
        return null;
    }
    return walk(tree);
}
