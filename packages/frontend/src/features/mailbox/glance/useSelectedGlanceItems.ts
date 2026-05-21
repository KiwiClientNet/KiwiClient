/**
 * @brief Hook tracking which glance rows are checked for bulk operations.
 *
 * Selection is keyed by message UID and stored in a Set so membership
 * checks stay O(1). The hook also exposes a single computed flag that
 * reports whether every visible row is currently selected so the toolbar
 * can render the appropriate master-checkbox state.
 */

import { useCallback, useState } from "react";

interface UseSelectedGlanceItemsResult {
    selectedUniqueIds: Set<number>;
    toggleSelection: (uniqueId: number) => void;
    selectAll: (uniqueIds: number[]) => void;
    clearSelection: () => void;
    areAllSelected: (uniqueIds: number[]) => boolean;
}

export function useSelectedGlanceItems(): UseSelectedGlanceItemsResult {
    const [selectedUniqueIds, setSelectedUniqueIds] = useState<Set<number>>(new Set());

    const toggleSelection = useCallback((uniqueId: number) => {
        setSelectedUniqueIds(previous => {
            const next = new Set(previous);
            if (next.has(uniqueId)) {
                next.delete(uniqueId);
            } else {
                next.add(uniqueId);
            }
            return next;
        });
    }, []);

    const selectAll = useCallback((uniqueIds: number[]) => {
        setSelectedUniqueIds(new Set(uniqueIds));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedUniqueIds(new Set());
    }, []);

    const areAllSelected = useCallback((uniqueIds: number[]) => {
        if (uniqueIds.length === 0) {
            return false;
        }

        for (const uniqueId of uniqueIds) {
            if (!selectedUniqueIds.has(uniqueId)) {
                return false;
            }
        }
        return true;
    }, [selectedUniqueIds]);

    return { selectedUniqueIds, toggleSelection, selectAll, clearSelection, areAllSelected };
}
