/**
 * @brief Top-level mailbox view: sidebar, glance list, email pane, status bar.
 *
 * Owns mailbox-list fetching and the currently-selected mailbox; the child
 * panes are dumb in the sense that they receive the selection through props
 * and emit selection changes back through a callback.
 */

import { useCallback, useEffect, useState, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "../../auth/AuthContext";
import { fetchMailboxes } from "../../api/mailboxes";
import { MailboxPageLoading, StatusComponent } from "../../components/Loading";
import { buildMailboxTree, type MailboxTreeNode } from "../../domain/mailboxTree";
import { Emailbox } from "./emailbox/Emailbox";
import { Glance } from "./glance/Glance";
import { Sidebar } from "./sidebar/Sidebar";
import { StatusBar } from "./statusbar/StatusBar";
import type { MailboxSelection } from "./types";

/**
 * @brief Picks a sensible default selection from the freshly-fetched tree.
 *
 * Inbox is preferred when present because that matches user expectations
 * across every email client; the first root is the fallback when Inbox is
 * absent, which can happen on private servers that use a different name.
 *
 * @param mailboxTree - The forest of mailbox roots to choose from.
 * @returns The chosen selection, or null when the tree is empty.
 */
function pickDefaultMailbox(mailboxTree: MailboxTreeNode[]): MailboxSelection | null {
    if (mailboxTree.length === 0) {
        return null;
    }

    for (const rootNode of mailboxTree) {
        if (rootNode.mailbox.name === "Inbox") {
            return { name: rootNode.mailbox.name, path: rootNode.mailbox.path };
        }
    }

    const firstRoot = mailboxTree[0];
    return { name: firstRoot.mailbox.name, path: firstRoot.mailbox.path };
}

export function MailboxPage() {
    const { authFetch } = useContext(AuthContext);
    const [selectedMailbox, setSelectedMailbox] = useState<MailboxSelection | null>(null);

    const { data: mailboxTree = [], error, isPending } = useQuery({
        queryKey: ["mailboxes"],
        queryFn: () => fetchMailboxes(authFetch),
        select: useCallback((mailboxes: Awaited<ReturnType<typeof fetchMailboxes>>) => buildMailboxTree(mailboxes), [])
    });

    useEffect(() => {
        if (selectedMailbox !== null || mailboxTree.length === 0) {
            return;
        }
        setSelectedMailbox(pickDefaultMailbox(mailboxTree));
    }, [mailboxTree, selectedMailbox]);

    if (isPending) {
        return <MailboxPageLoading Status={<StatusComponent message="loading..." status="loading" />} />;
    }

    if (error) {
        return <MailboxPageLoading Status={<StatusComponent message={error.message} status="error" />} />;
    }

    if (mailboxTree.length === 0) {
        return <MailboxPageLoading Status={<StatusComponent message="No mailboxes found" status="info" />} />;
    }

    if (selectedMailbox === null) {
        return <MailboxPageLoading Status={<StatusComponent message="loading..." status="loading" />} />;
    }

    return (
        <div className="flex flex-row h-screen">
            <Sidebar
                mailboxTree={mailboxTree}
                selectedMailboxPath={selectedMailbox.path}
                onSelectMailbox={setSelectedMailbox}
            />
            <div className="grid h-screen grid-cols-12 grid-rows-16 w-full">
                <div className="row-span-2 col-span-12 m-3 p-2 bg-kiwi-middle-black rounded-3xl">
                    ====&gt; Message search div to be implemented here
                </div>
                <div className="row-span-13 col-span-12 grid grid-cols-12 grid-rows-12 rounded-t-3xl rounded-b-3xl bg-kiwi-middle-black m-3 p-2">
                    <Glance selectedMailbox={selectedMailbox} />
                    <Emailbox />
                </div>
                <StatusBar />
            </div>
        </div>
    );
}
