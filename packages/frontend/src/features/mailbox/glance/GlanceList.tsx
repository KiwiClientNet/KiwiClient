/**
 * @brief Scrollable list of glance rows with an infinite-scroll sentinel.
 *
 * The sentinel is placed a fixed number of rows from the bottom rather
 * than at the bottom so the next page begins loading before the user
 * reaches the visible end.
 */

import type { EmailGlance } from "@KiwiClient/shared";
import { StatusComponent } from "../../../components/Loading";
import { GlanceItem } from "./GlanceItem";

const REMAINING_ITEMS_BEFORE_FETCH = 10;

interface GlanceListProps {
    emailGlances: EmailGlance[];
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    onFetchNextPage: () => void;
    selectedUniqueIds: Set<number>;
    onToggleSelection: (uniqueId: number) => void;
}

export function GlanceList({ emailGlances, isFetchingNextPage, hasNextPage, onFetchNextPage, selectedUniqueIds, onToggleSelection }: GlanceListProps) {
    const triggerIndex = Math.max(0, emailGlances.length - REMAINING_ITEMS_BEFORE_FETCH);

    const handleFetchTriggered = () => {
        if (!hasNextPage || isFetchingNextPage) {
            return;
        }
        onFetchNextPage();
    };

    // TODO: If no emails, return something to say that!

    return (
        <div className="flex flex-col no-scrollbar overflow-y-scroll h-full max-w-full flex-1 pr-1 min-h-0 shrink-0">
            {emailGlances.map((emailGlance, index) => (
                <GlanceItem
                    key={emailGlance.uniqueId}
                    emailGlance={emailGlance}
                    isChecked={selectedUniqueIds.has(emailGlance.uniqueId)}
                    onToggleCheck={() => onToggleSelection(emailGlance.uniqueId)}
                    isFetchTrigger={index === triggerIndex}
                    onFetchTriggered={handleFetchTriggered}
                />
            ))}
            {isFetchingNextPage && (
                <div className="my-3">
                    <StatusComponent status="loading" message="" />
                </div>
            )}
        </div>
    );
}
