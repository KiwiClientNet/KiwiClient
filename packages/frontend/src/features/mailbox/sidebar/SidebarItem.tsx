/**
 * @brief A single row in the sidebar, with optional expand chevron for parents.
 *
 * Visual state is driven entirely by props so the same component renders
 * both leaf folders and expandable parents; the parent component decides
 * whether to render the children indented below the row.
 */

import type { MouseEventHandler } from "react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { getMailboxIcon } from "./mailboxIcon";

interface SidebarItemProps {
    mailboxName: string;
    unSeenEmails: number;
    isSelected: boolean;
    isChildrenVisible: boolean;
    showChevron: boolean;
    onChevronClick: MouseEventHandler<SVGSVGElement>;
    onFolderClick: MouseEventHandler<HTMLButtonElement>;
}

export function SidebarItem({ mailboxName, unSeenEmails, isSelected, isChildrenVisible, showChevron, onChevronClick, onFolderClick }: SidebarItemProps) {
    const selectedStyle = isSelected ? "bg-kiwi-light-black text-kiwi-green font-bold" : "";
    const icon = getMailboxIcon(mailboxName);

    return (
        <li className="flex flex-row items-center">
            {showChevron && (
                <ChevronDownIcon
                    className={`opacity-60 hover:opacity-100 transition duration-200 cursor-pointer shrink-0 size-5 ml-5 ${isChildrenVisible ? "rotate-0" : "-rotate-90"}`}
                    onClick={onChevronClick}
                />
            )}
            <button
                onClick={onFolderClick}
                title={mailboxName}
                className={`flex items-center w-full truncate px-2 py-1 my-1 mr-1 rounded-xl border border-transparent ${showChevron ? "" : "ml-3"} ${selectedStyle} hover:bg-kiwi-light-black active:bg-kiwi-light-black transition-colors duration-200 cursor-pointer outline-none focus-visible:border-kiwi-green`}
            >
                <span className="shrink-0 mr-3">{icon}</span>
                <span className="flex-1 text-left truncate">{mailboxName}</span>
                {mailboxName !== "Spam" && unSeenEmails > 0 && <span className="kiwi-badge shrink-0">{unSeenEmails}</span>}
            </button>
        </li>
    );
}
