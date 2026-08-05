import type { MailboxTreeNode } from "../../domain/mailboxTree";
import type { MailboxSelection } from "./types";

export function mailboxPathToSlug(path: string): string {
    const replacedPath = path.replace(/\./g, '/');
    return replacedPath.toLowerCase();
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
