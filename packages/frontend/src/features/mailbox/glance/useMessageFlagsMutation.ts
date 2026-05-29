/**
 * @brief Hook that adds or removes IMAP flags on one or many messages.
 *
 * Updates the cached glance pages optimistically so the row UI reflects the
 * new flag state without waiting on the server, and adjusts the sidebar
 * unseen count when the seen flag flips. On failure the previous cache
 * snapshot is restored so the user sees the original state return.
 */

import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SEEN_FLAG, type EmailFlags } from "@KiwiClient/shared";
import { AuthContext } from "../../../auth/AuthContext";
import { patchMessageFlags } from "../../../api/messages";
import { glanceQueryKey } from "./queryKeys";
import type { CachedGlanceData } from "../types";
import {
    adjustMailboxUnseen,
    cancelGlanceAndMailboxQueries,
    countItemsInGlanceWithSeenState,
    invalidateGlanceAndMailboxes,
    rollbackGlanceAndMailboxes,
    snapshotGlanceAndMailboxes,
    type GlanceMutationSnapshot
} from "./mutationCache";

const FLAG_TO_DTO_KEY: Record<string, keyof EmailFlags> = {
    "\\Seen": "seen",
    "\\Flagged": "flagged",
    "\\Answered": "answered",
    "\\Draft": "draft"
};

interface FlagsMutationVariables {
    uniqueIds: number[];
    flagsToAdd: string[];
    flagsToRemove: string[];
}

interface UseMessageFlagsMutationArguments {
    mailboxPath: string;
}

/**
 * @brief Applies the add/remove sets to a single EmailFlags object.
 *
 * Unknown flag strings are silently ignored because the IMAP server may
 * carry custom keywords that have no boolean counterpart in the domain
 * EmailFlags shape.
 */
function applyFlagChanges(currentFlags: EmailFlags, flagsToAdd: string[], flagsToRemove: string[]): EmailFlags {
    const nextFlags: EmailFlags = { ...currentFlags };

    for (const flag of flagsToAdd) {
        const key = FLAG_TO_DTO_KEY[flag];
        if (key) {
            nextFlags[key] = true;
        }
    }

    for (const flag of flagsToRemove) {
        const key = FLAG_TO_DTO_KEY[flag];
        if (key) {
            nextFlags[key] = false;
        }
    }

    return nextFlags;
}

export function useMessageFlagsMutation({ mailboxPath }: UseMessageFlagsMutationArguments) {
    const { authFetch } = useContext(AuthContext);
    const queryClient = useQueryClient();

    return useMutation<void, Error, FlagsMutationVariables, GlanceMutationSnapshot>({
        mutationFn: ({ uniqueIds, flagsToAdd, flagsToRemove }) =>
            patchMessageFlags({ authFetch, mailboxPath, uniqueIds, flagsToAdd, flagsToRemove }),

        onMutate: async ({ uniqueIds, flagsToAdd, flagsToRemove }) => {
            const affectedMailboxPaths = [mailboxPath];
            await cancelGlanceAndMailboxQueries(queryClient, affectedMailboxPaths);
            const snapshot = snapshotGlanceAndMailboxes(queryClient, affectedMailboxPaths);
            const targetUidSet = new Set(uniqueIds);

            queryClient.setQueryData<CachedGlanceData>(glanceQueryKey(mailboxPath), oldData => {
                if (!oldData) {
                    return oldData;
                }
                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        items: page.items.map(item =>
                            targetUidSet.has(item.uniqueId)
                                ? { ...item, flags: applyFlagChanges(item.flags, flagsToAdd, flagsToRemove) }
                                : item
                        )
                    }))
                };
            });

            const isAddingSeen = flagsToAdd.includes(SEEN_FLAG);
            const isRemovingSeen = flagsToRemove.includes(SEEN_FLAG);
            if (isAddingSeen || isRemovingSeen) {
                const sourceGlance = snapshot.glancesByMailboxPath.get(mailboxPath);
                const unseenDelta = isAddingSeen ? -countItemsInGlanceWithSeenState(sourceGlance, uniqueIds, false) : countItemsInGlanceWithSeenState(sourceGlance, uniqueIds, true);
                adjustMailboxUnseen(queryClient, mailboxPath, unseenDelta);
            }

            return snapshot;
        },

        onError: (_thrownError, _variables, snapshot) => {
            if (snapshot) {
                rollbackGlanceAndMailboxes(queryClient, snapshot);
            }
        },

        onSettled: () => {
            invalidateGlanceAndMailboxes(queryClient, [mailboxPath]);
        }
    });
}
