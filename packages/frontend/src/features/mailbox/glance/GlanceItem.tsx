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
import { SEEN_FLAG, FLAGGED_FLAG, type EmailGlance } from "@KiwiClient/shared";
import { Checkbox } from "../../../components/Checkbox";
import { useOnScreen } from "../../../hooks/useOnScreen";
import { useSelectedEmailStore } from "../../../store/selectedEmailStore";
import { useMessageFlagsMutation } from "./useMessageFlagsMutation";

interface GlanceItemProps {
    emailGlance: EmailGlance;
    isChecked: boolean;
    onToggleCheck: () => void;
    isFetchTrigger: boolean;
    onFetchTriggered: () => void;
}

export function GlanceItem({ emailGlance, isChecked, onToggleCheck, isFetchTrigger, onFetchTriggered }: GlanceItemProps) {
    const referenceObject = useRef<HTMLDivElement>(null);
    const isVisible = useOnScreen(referenceObject);
    const selectEmail = useSelectedEmailStore(state => state.select);
    const flagsMutation = useMessageFlagsMutation({ mailboxPath: emailGlance.mailboxPath });

    const isRead = emailGlance.flags.seen;
    const isStarred = emailGlance.flags.flagged;
    const senderName = emailGlance.from.name ?? emailGlance.from.address;
    const senderAddress = emailGlance.from.address;
    const formattedDateTime = formatGlanceDateTime(emailGlance.dateIso);

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

    const rowBackground = isRead ? "bg-kiwi-dark-black" : "bg-kiwi-light-black";
    const subjectStyle = isRead ? "font-normal opacity-70" : "font-bold";

    return (
        <div
            ref={referenceObject}
            onClick={handleRowClick}
            className={`flex flex-row items-center h-20 gap-1 my-1 p-3 pl-4 shrink-0 border border-kiwi-dark-black rounded-3xl cursor-pointer transition-colors hover:border-kiwi-dark-grey ${rowBackground}`}
        >
            <div className="flex justify-center px-2">
                <Checkbox checked={isChecked} onChange={onToggleCheck} />
            </div>

            <button
                onClick={handleStarClick}
                title={isStarred ? "Unstar" : "Star"}
                className="shrink-0 cursor-pointer p-1 hover:opacity-80 transition-opacity"
            >
                {isStarred
                    ? <StarIconSolid className="size-5 text-kiwi-info" />
                    : <StarIconOutline className="size-5 opacity-60" />}
            </button>

            <div className="flex flex-col flex-1 min-w-0 ml-2">
                <div className="flex justify-between items-center w-full gap-4">
                    <div className="flex flex-1 min-w-0 items-center gap-2">
                        <span className="font-medium truncate">{senderName}</span>
                        <span className="text-sm opacity-60 truncate">{senderAddress}</span>
                    </div>
                    <div className="shrink-0 text-xs opacity-80 whitespace-nowrap">
                        {formattedDateTime}
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
    return `${datePart} — ${timePart}`;
}
