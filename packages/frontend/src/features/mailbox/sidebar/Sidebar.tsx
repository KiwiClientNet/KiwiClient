/**
 * @brief The full left-rail sidebar with the mailbox tree, settings, and logout.
 *
 * Renders the forest of mailbox trees recursively through SidebarTreeNode
 * and exposes a callback so the parent page can swap the selected mailbox
 * without owning the tree-building logic.
 */

import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
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
}

export function Sidebar({ mailboxTree, selectedMailboxPath, onSelectMailbox }: SidebarProps) {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout().then(() => navigate("/login"));
    };

    return (
        <div className="relative flex h-full w-full max-w-56 flex-col">
            <div className="h-9/10 relative flex w-full flex-col">
                <div className="flex justify-center p-4">
                    <ReverseLogo width={100} height={100} />
                </div>
                <nav className="w-9/10 max-w-full justify-center-safe overflow-scroll no-scrollbar">
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
            </div>
            <div className="flex w-full absolute bottom-0 items-center ml-2 pr-2 mb-2 gap-2">
                <BorderlessButton text="Settings?" onClickFunction={handleLogout} />
                <BorderlessButton text="Logout" onClickFunction={handleLogout} />
            </div>
        </div>
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
