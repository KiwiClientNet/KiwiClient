/**
 * @brief Top bar of the glance list with the master checkbox and bulk actions.
 *
 * The bulk actions stay in the DOM so the mailbox name does not shift when a
 * selection appears; they fade in and out instead. Read and starred are
 * toggles: when every selected message is already read (or starred) the
 * button offers the reverse action, so two buttons cover all four states.
 * Each bulk button fires a single API call covering every selected UID.
 */

import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { SEEN_FLAG, FLAGGED_FLAG, type EmailGlance } from "@KiwiClient/shared";
import { Checkbox } from "../../../components/Checkbox";
import { useMessageFlagsMutation } from "./useMessageFlagsMutation";
import { useMessageMoveMutation } from "./useMessageMoveMutation";
import { FolderInput, MailOpen, Trash2 } from "lucide-react";
import markUnreadIconRaw from "../../../assets/icons/mark-unread.svg?raw";

interface GlanceToolbarProps {
    selectedMailboxName: string;
    selectedMailboxPath: string;
    areAllSelected: boolean;
    onToggleSelectAll: () => void;
    selectedGlances: EmailGlance[];
    specialTrashFolderPath?: string;
    clearGlanceSelection?: () => void;
    onEmailsRemoved?: (removedUniqueIds: Set<number>) => void;
}

export function GlanceToolbar({
    selectedMailboxName,
    selectedMailboxPath,
    areAllSelected,
    onToggleSelectAll,
    selectedGlances,
    specialTrashFolderPath = undefined,
    clearGlanceSelection = undefined,
    onEmailsRemoved = undefined
}: GlanceToolbarProps) {
    const flagsMutation = useMessageFlagsMutation({ mailboxPath: selectedMailboxPath });
    const moveMutation = useMessageMoveMutation();

    const selectedUniqueIds = selectedGlances.map(glance => glance.uniqueId);
    const hasSelection = selectedUniqueIds.length > 0;
    const areAllSelectedRead = hasSelection && selectedGlances.every(glance => glance.flags.seen);
    const areAllSelectedStarred = hasSelection && selectedGlances.every(glance => glance.flags.flagged);

    const toggleReadState = () => {
        if (!hasSelection) {
            return;
        }
        flagsMutation.mutate({
            uniqueIds: selectedUniqueIds,
            flagsToAdd: areAllSelectedRead ? [] : [SEEN_FLAG],
            flagsToRemove: areAllSelectedRead ? [SEEN_FLAG] : []
        });
    };

    const toggleStarredState = () => {
        if (!hasSelection) {
            return;
        }
        flagsMutation.mutate({
            uniqueIds: selectedUniqueIds,
            flagsToAdd: areAllSelectedStarred ? [] : [FLAGGED_FLAG],
            flagsToRemove: areAllSelectedStarred ? [FLAGGED_FLAG] : []
        });
    };

    const moveSelectionToTrash = () => {
        if (!hasSelection || !specialTrashFolderPath) {
            return;
        }
        moveMutation.mutate({
            uniqueIds: selectedUniqueIds,
            mailboxPathSource: selectedMailboxPath,
            mailboxPathTarget: specialTrashFolderPath
        });
        onEmailsRemoved?.(new Set(selectedUniqueIds));
        clearGlanceSelection?.();
    };

    return (
        <div className="kiwi-panel bg-kiwi-black shrink-0 mb-2 flex flex-row items-center gap-2 my-1 p-3 pl-4">
            <div className="flex justify-center px-2">
                <Checkbox checked={areAllSelected} onChange={onToggleSelectAll} />
            </div>

            <div
                aria-hidden={!hasSelection}
                className={`flex flex-row items-center gap-1 min-w-0 transition-opacity duration-200 ${hasSelection ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
                <span className="text-xs font-bold text-kiwi-green border border-kiwi-green/40 rounded-full px-2 py-0.5 mr-1 whitespace-nowrap">
                    {selectedUniqueIds.length} selected
                </span>
                <ToolbarIconButton title={areAllSelectedRead ? "Mark unread" : "Mark read"} onClick={toggleReadState}>
                    {areAllSelectedRead
                        ? <span aria-hidden="true" className="block size-5 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: markUnreadIconRaw }} />
                        : <MailOpen className="size-5" />}
                </ToolbarIconButton>
                <ToolbarIconButton title={areAllSelectedStarred ? "Unstar" : "Star"} onClick={toggleStarredState}>
                    {areAllSelectedStarred
                        ? <StarIconOutline className="size-5" />
                        : <StarIconSolid className="size-5 text-kiwi-warning" />}
                </ToolbarIconButton>
                <ToolbarIconButton title="Move mail to" onClick={() => alert("Moving mail coming soon!")}>
                    <FolderInput className="size-5" />
                </ToolbarIconButton>
                {/* TODO: If in the bin/trash folder, do not need to show that the user can bin an item/ add a delete forever */}
                <ToolbarIconButton title="Move to trash" onClick={moveSelectionToTrash} additionalStyles={["hover:text-kiwi-failure"]}>
                    <Trash2 className="size-5" />
                </ToolbarIconButton>
            </div>

            {/* TODO: Add a refresh button to fetch new emails in the inbox (invalidate the query) */}
            <div className="flex-col flex-1 min-w-0 mr-2 font-bold hidden md:block text-right">
                {selectedMailboxName}<span className="text-kiwi-green">.</span>
            </div>
        </div >
    );
}

interface ToolbarIconButtonProps {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    additionalStyles?: string[]
}

function ToolbarIconButton({ title, onClick, children, additionalStyles }: ToolbarIconButtonProps) {
    const additionalStylesFormatted = additionalStyles ? additionalStyles.join(" ") : "hover:text-kiwi-green";

    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`kiwi-icon-btn p-1 rounded-md ${additionalStylesFormatted}`}
        >
            {children}
        </button>
    );
}
