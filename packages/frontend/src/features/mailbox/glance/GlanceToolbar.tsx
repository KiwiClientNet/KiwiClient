/**
 * @brief Top bar of the glance list with the master checkbox and bulk actions.
 *
 * The bulk action buttons are always present in the DOM so the mailbox name
 * does not shift horizontally when the user toggles a selection; they are
 * visually hidden when nothing is selected. Each bulk button fires a single
 * API call covering every selected UID.
 */

import { EnvelopeIcon, EnvelopeOpenIcon, TrashIcon, StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { SEEN_FLAG, FLAGGED_FLAG } from "@KiwiClient/shared";
import { Checkbox } from "../../../components/Checkbox";
import { useMessageFlagsMutation } from "./useMessageFlagsMutation";
import { useMessageMoveMutation } from "./useMessageMoveMutation";

interface GlanceToolbarProps {
    selectedMailboxName: string;
    selectedMailboxPath: string;
    areAllSelected: boolean;
    onToggleSelectAll: () => void;
    selectedUniqueIds: Set<number>;
    specialTrashFolderPath?: string;
    clearGlanceSelection?: () => void;
}

export function GlanceToolbar({
    selectedMailboxName,
    selectedMailboxPath,
    areAllSelected,
    onToggleSelectAll,
    selectedUniqueIds,
    specialTrashFolderPath = undefined,
    clearGlanceSelection = undefined
}: GlanceToolbarProps) {
    const flagsMutation = useMessageFlagsMutation({ mailboxPath: selectedMailboxPath });
    const moveMutation = useMessageMoveMutation({ mailboxPath: selectedMailboxPath });
    const hasSelection = selectedUniqueIds.size > 0;

    const runBulkFlagUpdate = (flagsToAdd: string[], flagsToRemove: string[]) => {
        if (selectedUniqueIds.size === 0) {
            return;
        }

        flagsMutation.mutate({ uniqueIds: Array.from(selectedUniqueIds), flagsToAdd, flagsToRemove });
    };

    const runBulkMove = (mailboxPathTarget: string) => {
        if (selectedUniqueIds.size === 0) {
            return;
        }

        // The emails all selected should be in the same mailbox already and can only accept one source anyway
        moveMutation.mutate({ uniqueIds: Array.from(selectedUniqueIds), mailboxPathSource: selectedMailboxPath, mailboxPathTarget });
        if (clearGlanceSelection) {
            clearGlanceSelection();
        }
    };

    return (
        <div className="rounded-3xl bg-kiwi-black shrink-0 mb-2 flex flex-row items-center gap-2 my-1 p-3 pl-4">
            <div className="flex justify-center px-2">
                <Checkbox checked={areAllSelected} onChange={onToggleSelectAll} />
            </div>

            <div
                aria-hidden={!hasSelection}
                className={`flex flex-row items-center gap-2 ml-2 ${hasSelection ? "visible" : "invisible"}`}
            >
                <ToolbarIconButton title="Mark read" onClick={() => runBulkFlagUpdate([SEEN_FLAG], [])}>
                    <EnvelopeOpenIcon className="size-5" />
                </ToolbarIconButton>
                <ToolbarIconButton title="Mark unread" onClick={() => runBulkFlagUpdate([], [SEEN_FLAG])}>
                    <EnvelopeIcon className="size-5" />
                </ToolbarIconButton>
                <ToolbarIconButton title="Star" onClick={() => runBulkFlagUpdate([FLAGGED_FLAG], [])}>
                    <StarIconSolid className="size-5 text-kiwi-info" />
                </ToolbarIconButton>
                <ToolbarIconButton title="Unstar" onClick={() => runBulkFlagUpdate([], [FLAGGED_FLAG])}>
                    <StarIconOutline className="size-5" />
                </ToolbarIconButton>
                <ToolbarIconButton title="Trash" onClick={() => { specialTrashFolderPath ? runBulkMove(specialTrashFolderPath) : { /* Don't do anything */ } }}>
                    <TrashIcon className="size-5" />
                </ToolbarIconButton>
                <span className="text-xs opacity-70 ml-1 w-20 inline-block">
                    {hasSelection ? `${selectedUniqueIds.size} selected` : ""}
                </span>
            </div>

            <div className="flex flex-col flex-1 min-w-0 mr-2 font-bold text-right">
                {selectedMailboxName}
            </div>
        </div >
    );
}

interface ToolbarIconButtonProps {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
}

function ToolbarIconButton({ title, onClick, children }: ToolbarIconButtonProps) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className="cursor-pointer p-1 rounded hover:bg-kiwi-light-black transition-colors"
        >
            {children}
        </button>
    );
}
