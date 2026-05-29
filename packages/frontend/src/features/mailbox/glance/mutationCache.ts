/**
 * @brief Shared optimistic-update helpers for glance + mailboxes cache mutations.
 *
 * Both the flag and move mutations follow the same lifecycle: cancel any
 * in-flight refetches for the caches they are about to write to, snapshot
 * the previous values so a failure can roll them back, optimistically write
 * new data, then on settle invalidate to reconcile with the server.
 *
 * The optimistic write itself differs per mutation, so it stays inline in
 * each hook. The plumbing around it lives here. This keeps the per-mutation
 * file focused on "what changes" rather than "how the bookkeeping works",
 * and means a future cache key or invalidation change touches one file.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { Mailbox } from "@KiwiClient/shared";
import type { CachedGlanceData } from "../types";
import { mailboxesQueryKey } from "../queryKeys";
import { glanceQueryKey } from "./queryKeys";

/**
 * @brief Snapshot of cache state captured before an optimistic write.
 *
 * Holds the glance pages for every mailbox path the mutation will touch and
 * the full mailbox list. The mutation hook returns this object from
 * `onMutate` so that `onError` can restore it.
 */
export interface GlanceMutationSnapshot {
    glancesByMailboxPath: Map<string, CachedGlanceData | undefined>;
    mailboxes: Mailbox[] | undefined;
}

/**
 * @brief Cancels in-flight refetches for the glance pages and mailbox list.
 *
 * React Query will discard the optimistic write if a refetch lands after it,
 * so the cancellation has to happen before any setQueryData call. Without
 * this the user can see the row briefly revert before the server response
 * arrives.
 */
export async function cancelGlanceAndMailboxQueries(queryClient: QueryClient, mailboxPaths: string[]): Promise<void> {
    await queryClient.cancelQueries({ queryKey: mailboxesQueryKey() });
    await Promise.all(mailboxPaths.map(path => queryClient.cancelQueries({ queryKey: glanceQueryKey(path) })));
}

/**
 * @brief Captures the current cache state for the given mailbox paths.
 *
 * Reads from the cache synchronously; assumes the caller has already awaited
 * `cancelGlanceAndMailboxQueries` so no in-flight write can race the read.
 */
export function snapshotGlanceAndMailboxes(queryClient: QueryClient, mailboxPaths: string[]): GlanceMutationSnapshot {
    const glancesByMailboxPath = new Map<string, CachedGlanceData | undefined>();
    for (const mailboxPath of mailboxPaths) {
        glancesByMailboxPath.set(mailboxPath, queryClient.getQueryData<CachedGlanceData>(glanceQueryKey(mailboxPath)));
    }
    return {
        glancesByMailboxPath,
        mailboxes: queryClient.getQueryData<Mailbox[]>(mailboxesQueryKey())
    };
}

/**
 * @brief Restores a snapshot taken by `snapshotGlanceAndMailboxes`.
 *
 * Used in `onError` to undo the optimistic write when the server rejects the
 * mutation. Skips entries whose snapshot was undefined to avoid clobbering
 * any newer cache value that the user may have triggered in the meantime.
 */
export function rollbackGlanceAndMailboxes(queryClient: QueryClient, snapshot: GlanceMutationSnapshot): void {
    for (const [mailboxPath, glance] of snapshot.glancesByMailboxPath) {
        if (glance) {
            queryClient.setQueryData(glanceQueryKey(mailboxPath), glance);
        }
    }
    if (snapshot.mailboxes) {
        queryClient.setQueryData(mailboxesQueryKey(), snapshot.mailboxes);
    }
}

/**
 * @brief Marks the affected caches stale so React Query refetches authoritative data.
 *
 * Called from `onSettled` regardless of success or failure: on success it
 * reconciles any drift between the optimistic write and the server, on
 * failure it ensures the post-rollback state is reverified.
 */
export function invalidateGlanceAndMailboxes(queryClient: QueryClient, mailboxPaths: string[]): void {
    queryClient.invalidateQueries({ queryKey: mailboxesQueryKey() });
    for (const mailboxPath of mailboxPaths) {
        queryClient.invalidateQueries({ queryKey: glanceQueryKey(mailboxPath) });
    }
}

/**
 * @brief Applies a delta to the unseen count of a single mailbox in the cache.
 *
 * Clamped at zero because the optimistic count can drift if a mutation acts
 * on UIDs the cache had not yet seen; a negative count would render as -1
 * in the sidebar instead of failing closed at zero.
 */
export function adjustMailboxUnseen(queryClient: QueryClient, mailboxPath: string, delta: number): void {
    queryClient.setQueryData<Mailbox[]>(mailboxesQueryKey(), mailboxes =>
        mailboxes?.map(mailbox =>
            mailbox.path === mailboxPath
                ? { ...mailbox, unseen: Math.max(0, mailbox.unseen + delta) }
                : mailbox
        )
    );
}

/**
 * @brief Counts how many of the given UIDs had the requested seen state in the snapshot.
 *
 * Reads from the pre-mutation snapshot so the answer reflects the truth as
 * the server still sees it. Sizing the unseen-count delta off the snapshot
 * is essential because a bulk seen/unseen action can target a mix of rows
 * whose state is already correct (those are no-ops for the sidebar count)
 * and rows that actually flip. Counting blind on uniqueIds.length
 * over-counts in the mixed case and the sidebar flashes the wrong number
 * until the server invalidation refetches.
 *
 * @param glance - The cached glance pages captured before the optimistic write.
 * @param uniqueIds - The UIDs the mutation is touching.
 * @param requiredSeen - The seen state to match in the snapshot.
 * @returns Number of snapshot items whose UID is in uniqueIds and whose
 *          flags.seen equals requiredSeen.
 */
export function countItemsInGlanceWithSeenState(glance: CachedGlanceData | undefined, uniqueIds: number[], requiredSeen: boolean): number {
    if (!glance) {
        return 0;
    }
    const targetUidSet = new Set(uniqueIds);
    let matchingCount = 0;
    for (const page of glance.pages) {
        for (const item of page.items) {
            if (targetUidSet.has(item.uniqueId) && item.flags.seen === requiredSeen) {
                matchingCount += 1;
            }
        }
    }
    return matchingCount;
}
