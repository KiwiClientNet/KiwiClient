/**
 * @brief Hook that moves one or many messages from a source to a target mailbox.
 *
 * Removes the moved rows from the source glance optimistically and adjusts
 * the sidebar unseen counts on both source and target so the user sees the
 * change immediately. On failure the previous cache snapshot is restored.
 */

import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../../../auth/AuthContext";
import { patchMoveMessages } from "../../../api/messages";
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

interface MoveMutationVariables {
    uniqueIds: number[];
    mailboxPathTarget: string;
    mailboxPathSource: string;
}

export function useMessageMoveMutation() {
    const { authFetch } = useContext(AuthContext);
    const queryClient = useQueryClient();

    return useMutation<void, Error, MoveMutationVariables, GlanceMutationSnapshot>({
        mutationFn: ({ mailboxPathSource, mailboxPathTarget, uniqueIds }) =>
            patchMoveMessages({ authFetch, mailboxPathSource, mailboxPathTarget, uniqueIds }),

        onMutate: async ({ uniqueIds, mailboxPathSource, mailboxPathTarget }) => {
            const affectedMailboxPaths = [mailboxPathSource, mailboxPathTarget];
            await cancelGlanceAndMailboxQueries(queryClient, affectedMailboxPaths);
            const snapshot = snapshotGlanceAndMailboxes(queryClient, affectedMailboxPaths);
            const targetUidSet = new Set(uniqueIds);

            queryClient.setQueryData<CachedGlanceData>(glanceQueryKey(mailboxPathSource), oldData => {
                if (!oldData) {
                    return oldData;
                }
                 
                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        items: page.items.filter(item => !targetUidSet.has(item.uniqueId))
                    }))
                };
            });

            const previouslyUnseenInSource = countItemsInGlanceWithSeenState(snapshot.glancesByMailboxPath.get(mailboxPathSource), uniqueIds, false);
            adjustMailboxUnseen(queryClient, mailboxPathSource, -previouslyUnseenInSource);
            adjustMailboxUnseen(queryClient, mailboxPathTarget, previouslyUnseenInSource);

            // Invalidate the cache once everything has moved
            invalidateGlanceAndMailboxes(queryClient, [mailboxPathSource, mailboxPathTarget]);

            return snapshot;
        },

        onError: (_thrownError, _variables, snapshot) => {
            if (snapshot) {
                rollbackGlanceAndMailboxes(queryClient, snapshot);
            }
        },

        onSettled: (_data, _error, { mailboxPathSource, mailboxPathTarget }) => {
            invalidateGlanceAndMailboxes(queryClient, [mailboxPathSource, mailboxPathTarget]);
        }
    });
}
