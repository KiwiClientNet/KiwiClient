/**
 * @brief The full left-rail sidebar with the compose button and mailbox tree.
 *
 * Renders the forest of mailbox trees recursively through SidebarTreeNode
 * and exposes a callback so the parent page can swap the selected mailbox
 * without owning the tree-building logic.
 */

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../components/Button";
import type { MailboxTreeNode } from "../../../domain/mailboxTree";
import type { MailboxSelection } from "../types";
import { SidebarItem } from "./SidebarItem";
import { useComposeEmailStore } from "../../../store/composeEmailStore";
import Logo from "../../../components/Logo";

interface SidebarProps {
    mailboxTree: MailboxTreeNode[];
    selectedMailboxPath: string;
    onSelectMailbox: (selection: MailboxSelection) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ mailboxTree, selectedMailboxPath, onSelectMailbox, isOpen, onClose }: SidebarProps) {
    const setHidden = useComposeEmailStore(state => state.setHidden);

    return (
        <>
            {/* Backdrop — only visible on mobile when drawer is open */}
            <div
                onClick={onClose}
                aria-hidden="true"
                className={`md:hidden fixed inset-0 z-30 bg-kiwi-black transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            />

            <aside
                className={`
                    fixed md:relative inset-y-0 left-0 z-40
                    flex h-dvh w-64 md:w-56 flex-col
                    bg-kiwi-black md:bg-transparent
                    border-r border-kiwi-light-black md:border-0
                    transform transition-transform duration-200
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    md:translate-x-0
                `}
            >
                <div className="flex items-center justify-between pl-4 md:justify-center">
                    <Logo reverseLogo={true} className="w-25 h-25" linkTo="/mail" />
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close menu"
                        className="md:hidden kiwi-icon-btn"
                    >
                        <XMarkIcon className="size-6" />
                    </button>
                </div>

                <div className="pl-3 pr-1 pb-2 hidden md:block">
                    <Button text="New Message" title="Compose a new email" reverseColours={true} onClickFunction={() => setHidden(false)} />
                </div>

                <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                    <ul className="text-sm">
                        {mailboxTree.map(node => {
                            return <SidebarTreeNode
                                key={node.mailbox.path}
                                node={node}
                                selectedMailboxPath={selectedMailboxPath}
                                onSelectMailbox={onSelectMailbox}
                            />;
                        })}
                    </ul>
                </nav>
            </aside>
        </>
    );
}

interface SidebarTreeNodeProps {
    node: MailboxTreeNode;
    selectedMailboxPath: string;
    onSelectMailbox: (selection: MailboxSelection) => void;
}

/**
 * @brief Recursively renders one tree node and its descendants.
 *
 * Tracks its own expand/collapse state per node because expansion is a UI
 * concern that does not need to live in the parent page's state.
 */
function SidebarTreeNode({ node, selectedMailboxPath, onSelectMailbox }: SidebarTreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const isSelected = node.mailbox.path === selectedMailboxPath;
    const hasChildren = node.children.length > 0;
    const isSelectable = !node.mailbox.flags.includes("\\Noselect");

    const handleFolderClick = () => {
        if (!isSelectable) {
            setIsExpanded(previous => !previous);
            return;
        }
        onSelectMailbox({ name: node.mailbox.name, path: node.mailbox.path });
    };

    // Base case - no children
    if (!hasChildren) {
        return (
            <SidebarItem
                mailboxName={node.mailbox.name}
                unSeenEmails={node.mailbox.unseen}
                isSelected={isSelected}
                isChildrenVisible={isExpanded}
                showChevron={false}
                onChevronClick={() => setIsExpanded(previous => !previous)}
                onFolderClick={handleFolderClick}
            />
        );
    }

    return (
        <>
            <SidebarItem
                mailboxName={node.mailbox.name}
                unSeenEmails={node.mailbox.unseen}
                isSelected={isSelected}
                isChildrenVisible={isExpanded}
                showChevron={true}
                onChevronClick={() => setIsExpanded(previous => !previous)}
                onFolderClick={handleFolderClick}
            />
            <ul className={`ml-2 ${isExpanded ? "visible" : "hidden"}`}>
                {node.children.map(childNode => (
                    <SidebarTreeNode
                        key={childNode.mailbox.path}
                        node={childNode}
                        selectedMailboxPath={selectedMailboxPath}
                        onSelectMailbox={onSelectMailbox}
                    />
                ))}
            </ul>
        </>
    );
}
