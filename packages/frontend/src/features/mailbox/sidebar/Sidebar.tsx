/**
 * @brief The full left-rail sidebar with the mailbox tree, settings, and logout.
 *
 * Renders the forest of mailbox trees recursively through SidebarTreeNode
 * and exposes a callback so the parent page can swap the selected mailbox
 * without owning the tree-building logic.
 */

import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { AuthContext } from "../../../auth/AuthContext";
import { BorderlessButton } from "../../../components/Button";
import { ReverseLogo } from "../../../components/Logo";
import type { MailboxTreeNode } from "../../../domain/mailboxTree";
import type { MailboxSelection } from "../types";
import { SidebarItem } from "./SidebarItem";

interface SidebarProps {
    mailboxTree: MailboxTreeNode[];
    selectedMailboxPath: string;
    onSelectMailbox: (selection: MailboxSelection) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ mailboxTree, selectedMailboxPath, onSelectMailbox, isOpen, onClose }: SidebarProps) {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout().then(() => navigate("/login"));
    };

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
                    transform transition-transform duration-200
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    md:translate-x-0
                `}
            >
                <div className="flex items-center justify-between p-4 md:justify-center">
                    <ReverseLogo className="w-16 h-16 md:w-24 md:h-24" />
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close menu"
                        className="md:hidden p-2 rounded-lg hover:bg-kiwi-light-black active:bg-kiwi-light-black transition-colors"
                    >
                        <XMarkIcon className="size-6" />
                    </button>
                </div>

                <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                    <ul className="text-sm">
                        {mailboxTree.map(node => (
                            <SidebarTreeNode
                                key={node.mailbox.path}
                                node={node}
                                selectedMailboxPath={selectedMailboxPath}
                                onSelectMailbox={onSelectMailbox}
                            />
                        ))}
                    </ul>
                </nav>

                <div className="flex w-full items-center gap-2 px-2 pb-2 pt-2 border-t border-kiwi-light-black md:border-0">
                    <BorderlessButton text="Settings?" onClickFunction={handleLogout} />
                    <BorderlessButton text="Logout" onClickFunction={handleLogout} />
                </div>
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

    if (!hasChildren) {
        return (
            <SidebarItem
                mailboxName={node.mailbox.name}
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
