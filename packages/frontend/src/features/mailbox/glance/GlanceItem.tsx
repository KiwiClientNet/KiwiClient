/**
 * @brief A single row in the mailbox glance list.
 *
 * Owns four concerns: rendering the sender, subject, and timestamp;
 * triggering the mark-as-read mutation when the row is opened; toggling
 * the starred state with the star button; and acting as the infinite-scroll
 * sentinel when the item is near the bottom of the already-loaded set.
 */

import { useEffect, useRef, type MouseEvent } from "react";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { FolderInput, Trash2 } from "lucide-react";
import { SEEN_FLAG, FLAGGED_FLAG, type EmailGlance } from "@KiwiClient/shared";
import { Checkbox } from "../../../components/Checkbox";
import { useOnScreen } from "../../../hooks/useOnScreen";
import { useSelectedEmailStore } from "../../../store/selectedEmailStore";
import { useMessageFlagsMutation } from "./useMessageFlagsMutation";
import { useMessageMoveMutation } from "./useMessageMoveMutation";

interface GlanceItemProps {
    emailGlance: EmailGlance;
    isChecked: boolean;
    onToggleCheck: () => void;
    isFetchTrigger: boolean;
    onFetchTriggered: () => void;
    specialTrashFolderPath?: string;
    onEmailsRemoved?: (removedUniqueIds: Set<number>) => void;
}

export function GlanceItem({ emailGlance, isChecked, onToggleCheck, isFetchTrigger, onFetchTriggered, specialTrashFolderPath = undefined, onEmailsRemoved = undefined }: GlanceItemProps) {
    const referenceObject = useRef<HTMLDivElement>(null);
    const isVisible = useOnScreen(referenceObject);
    const selectEmail = useSelectedEmailStore(state => state.select);
    const openEmail = useSelectedEmailStore(state => state.selected);
    const flagsMutation = useMessageFlagsMutation({ mailboxPath: emailGlance.mailboxPath });
    const moveMutation = useMessageMoveMutation();

    const isRead = emailGlance.flags.seen;
    const isStarred = emailGlance.flags.flagged;
    const formattedDateTime = formatGlanceDateTime(emailGlance.dateIso);

    // In a sent folder every row is from the user, so the recipient is the
    // useful identity; everywhere else the sender is.
    const isSentMailbox = emailGlance.mailboxPath.toLowerCase().includes("sent");
    const counterpart = isSentMailbox && emailGlance.firstRecipient ? emailGlance.firstRecipient : emailGlance.from;
    const counterpartName = `${isSentMailbox ? "To: " : ""}${counterpart.name ?? counterpart.address}`;
    const counterpartAddress = counterpart.address;

    useEffect(() => {
        if (isVisible && isFetchTrigger) {
            onFetchTriggered();
        }
    }, [isVisible, isFetchTrigger, onFetchTriggered]);

    const handleRowClick = () => {
        if (!isRead) {
            flagsMutation.mutate({ uniqueIds: [emailGlance.uniqueId], flagsToAdd: [SEEN_FLAG], flagsToRemove: [] });
        }
        selectEmail(emailGlance.uniqueId, emailGlance.mailboxPath);
    };

    const handleStarClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        flagsMutation.mutate({
            uniqueIds: [emailGlance.uniqueId],
            flagsToAdd: isStarred ? [] : [FLAGGED_FLAG],
            flagsToRemove: isStarred ? [FLAGGED_FLAG] : []
        });
    };

    // The trash hover action is hidden inside the trash folder itself, where
    // a move to the same mailbox would be meaningless.
    const canMoveToTrash = specialTrashFolderPath !== undefined && specialTrashFolderPath !== emailGlance.mailboxPath;

    const handleTrashClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!canMoveToTrash) {
            return;
        }
        moveMutation.mutate({
            uniqueIds: [emailGlance.uniqueId],
            mailboxPathSource: emailGlance.mailboxPath,
            mailboxPathTarget: specialTrashFolderPath
        });
        onEmailsRemoved?.(new Set([emailGlance.uniqueId]));
    };

    const handleMoveClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        alert("Moving mail coming soon!");
    };

    const isOpen = openEmail?.uniqueId === emailGlance.uniqueId && openEmail.mailboxPath === emailGlance.mailboxPath;

    // Unread rows carry a green left edge and a raised background; checked
    // rows get a full green border so a bulk selection is scannable at a
    // glance; the row of the currently open email stays highlighted.
    const rowState = isChecked
        ? "border-kiwi-green/60 bg-kiwi-middle-black"
        : isOpen
            ? "border-kiwi-green/40 bg-kiwi-light-black"
            : isRead
                ? "border-transparent bg-kiwi-dark-black"
                : "border-transparent border-l-kiwi-green bg-kiwi-middle-black border-r-kiwi-green";
    const subjectStyle = isRead ? "font-normal opacity-70" : "font-bold";

    return (
        <div
            ref={referenceObject}
            onClick={handleRowClick}
            className={`group flex flex-row items-center h-20 gap-1 my-1 p-3 pl-4 shrink-0 border border-l-2 border-r-2 rounded-2xl cursor-pointer transition-colors hover:bg-kiwi-light-black ${rowState}`}
        >
            <div className="flex justify-center px-2">
                <Checkbox checked={isChecked} onChange={onToggleCheck} />
            </div>

            <div className="flex flex-col flex-1 min-w-0 ml-2">
                <div className="flex justify-between items-center w-full gap-4">
                    <div className="flex flex-1 min-w-0 max-w-9/12 items-center gap-2">
                        <span className="font-medium truncate">{counterpartName}</span>
                        <span className="text-sm opacity-60 truncate hidden md:block">{counterpartAddress}</span>
                    </div>
                    <div className="shrink-0 text-xs opacity-80 whitespace-nowrap flex items-center h-8">
                        <span className="group-hover:hidden">{formattedDateTime}</span>
                        <span className="hidden group-hover:flex items-center gap-x-1">
                            <button
                                onClick={handleStarClick}
                                title={isStarred ? "Unstar" : "Star"}
                                className="kiwi-icon-btn rounded-md hover:text-kiwi-green hover:bg-kiwi-middle-black"
                            >
                                {isStarred
                                    ? <StarIconSolid className="size-4 text-kiwi-warning" />
                                    : <StarIconOutline className="size-4 " />}
                            </button>
                            <button
                                type="button"
                                title="Move mail to"
                                onClick={handleMoveClick}
                                className="kiwi-icon-btn rounded-md hover:text-kiwi-green hover:bg-kiwi-middle-black"
                            >
                                <FolderInput className="size-4" />
                            </button>
                            {canMoveToTrash && (
                                <button
                                    type="button"
                                    title="Move to trash"
                                    onClick={handleTrashClick}
                                    className="kiwi-icon-btn rounded-md hover:text-kiwi-failure hover:bg-kiwi-middle-black"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            )}
                        </span>
                    </div>
                </div>

                <div className="w-full mt-0.5">
                    <p className={`text-sm truncate ${subjectStyle}`}>{emailGlance.subject}</p>
                </div>
            </div>
        </div>
    );
}

/**
 * @brief Formats an ISO timestamp using the browser locale.
 *
 * Renders date and time on the same line because the row is shallow and
 * vertical space is tight.
 */
function formatGlanceDateTime(dateIso: string): string {
    const emailDateTime = new Date(dateIso);
    const datePart = emailDateTime.toLocaleDateString(navigator.language);
    const timePart = emailDateTime.toLocaleTimeString(navigator.language, { hour12: false, hour: "2-digit", minute: "2-digit" });
    return `${datePart} ${timePart}`;
}
