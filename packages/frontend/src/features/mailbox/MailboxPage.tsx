/**
 * @brief Top-level mailbox view: sidebar, glance list, email pane, status bar.
 *
 * Owns mailbox-list fetching and the currently-selected mailbox; the child
 * panes are dumb in the sense that they receive the selection through props
 * and emit selection changes back through a callback.
 */

import { useCallback, useEffect, useState, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bars3Icon, MagnifyingGlassIcon, PencilIcon } from "@heroicons/react/24/outline";
import { AuthContext } from "../../auth/AuthContext";
import { fetchMailboxes } from "../../api/mailboxes";
import { MailboxPageLoading, StatusComponent } from "../../components/Loading";
import { buildMailboxTree, type MailboxTreeNode } from "../../domain/mailboxTree";
import { useSelectedEmailStore } from "../../store/selectedEmailStore";
import { Emailbox } from "./emailbox/Emailbox";
import { Glance } from "./glance/Glance";
import { Sidebar } from "./sidebar/Sidebar";
import { StatusBar } from "./statusbar/StatusBar";
import type { MailboxSelection } from "./types";
import { mailboxesQueryKey } from "./queryKeys";
import ComposeBox from "./compose/ComposeBox";
import { useComposeEmailStore } from "../../store/composeEmailStore";
import { useMailboxStore } from "../../store/mailboxStore";

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mobileView, setMobileView] = useState<"glance" | "email">("glance");
    const selectedEmail = useSelectedEmailStore(state => state.selected);
    const clearSelectedEmail = useSelectedEmailStore(state => state.clear);
    const [specialTrashFolderPath, setSpecialTrashFolderPath] = useState<undefined | string>(undefined); // Probably should update this to use with zustand too
    const setSentPath = useMailboxStore(state => state.setSentPath);
    const setHidden = useComposeEmailStore(state => state.setHidden);

    const { data: mailboxTree = [], error, isPending } = useQuery({
        queryKey: mailboxesQueryKey(),
        queryFn: ({ signal }) => fetchMailboxes(authFetch, signal),
        select: useCallback((mailboxes: Awaited<ReturnType<typeof fetchMailboxes>>) => buildMailboxTree(mailboxes, setSpecialTrashFolderPath, setSentPath), [])
    });

    useEffect(() => {
        if (selectedMailbox !== null || mailboxTree.length === 0) {
            return;
        }
        setSelectedMailbox(pickDefaultMailbox(mailboxTree));
    }, [mailboxTree, selectedMailbox]);

    useEffect(() => {
        if (selectedEmail) {
            setMobileView("email");
        }
    }, [selectedEmail]);

    const handleSelectMailbox = (selection: MailboxSelection) => {
        setSelectedMailbox(selection);
        setIsSidebarOpen(false);
        setMobileView("glance");
    };

    const handleBackToGlance = () => {
        clearSelectedEmail();
        setMobileView("glance");
    };

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
        <div className="flex flex-row h-dvh overflow-hidden">
            <Sidebar
                mailboxTree={mailboxTree}
                selectedMailboxPath={selectedMailbox.path}
                onSelectMailbox={handleSelectMailbox}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="flex flex-col flex-1 min-w-0 h-dvh">
                <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-kiwi-middle-black border-b border-kiwi-light-black">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        aria-label="Open menu"
                        className="kiwi-icon-btn -ml-2"
                    >
                        <Bars3Icon className="size-6" />
                    </button>
                    <span className="font-bold truncate">{selectedMailbox.name}<span className="text-kiwi-green">.</span></span>
                </header>

                {/* Temporary search field. It is a real, focusable input so the header
                    reads as finished, but it has no submit handler yet — message search
                    is wired up once the backend search endpoint lands. */}
                <div className="hidden md:block m-3 mb-0">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-kiwi-middle-grey">
                            <MagnifyingGlassIcon aria-hidden="true" className="size-5" />
                        </div>
                        <input
                            type="search"
                            placeholder="Search messages…"
                            aria-label="Search messages"
                            className="kiwi-input border-kiwi-light-black bg-kiwi-middle-black py-2 pl-10 text-sm placeholder:text-kiwi-middle-grey"
                        />
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:gap-2 lg:m-3 lg:p-2 lg:kiwi-panel">
                    <div className={`${mobileView === "glance" ? "flex" : "hidden"} lg:flex flex-col flex-1 lg:flex-none lg:w-md xl:w-lg 2xl:w-xl min-h-0`}>
                        <Glance selectedMailbox={selectedMailbox} specialTrashFolderPath={specialTrashFolderPath} />
                    </div>
                    <div className={`${mobileView === "email" ? "flex" : "hidden"} lg:flex flex-col flex-1 min-h-0`}>
                        <Emailbox onBack={handleBackToGlance} />
                    </div>
                </div>

                {!selectedEmail && (
                    <button
                        onClick={() => setHidden(false)}
                        aria-label="Compose a new email"
                        className="w-16 h-16 bg-kiwi-green text-kiwi-black rounded-full hover:bg-kiwi-white flex items-center justify-center transition-colors duration-200 fixed bottom-20 right-4 md:hidden shadow-kiwi-black shadow-lg"
                    >
                        <PencilIcon className="size-8" />
                    </button>
                )}
                <StatusBar />
                <ComposeBox />
            </div>
        </div>
    );
}
