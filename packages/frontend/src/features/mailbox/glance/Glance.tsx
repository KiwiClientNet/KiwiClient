/**
 * @brief Container component for the mailbox glance pane.
 *
 * Drives the paged listing via React Query, owns selection state for bulk
 * operations, and renders the toolbar and list. The list itself is split
 * out so that this component stays focused on data orchestration rather
 * than presentation details.
 */

import { useCallback, useContext, useEffect } from "react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { EmailMessage, GlancePage } from "@KiwiClient/shared";
import { AuthContext } from "../../../auth/AuthContext";
import { fetchBulkBodies, fetchGlancePage } from "../../../api/messages";
import { StatusComponent } from "../../../components/Loading";
import { useToastStore } from "../../../store/toastStore";
import { useSelectedEmailStore } from "../../../store/selectedEmailStore";
import type { MailboxSelection } from "../types";
import { GlanceList } from "./GlanceList";
import { GlanceToolbar } from "./GlanceToolbar";
import { emailQueryKey, glanceQueryKey } from "./queryKeys";
import { useSelectedGlanceItems } from "./useSelectedGlanceItems";
import { mailboxesQueryKey } from "../queryKeys";

/**
 * Configuration for the glance background prefetch.
 *
 * - PAGE_SIZE: total number of glance items requested per page.
 * - BACKGROUND_CHUNK_SIZE: how many bodies are fetched in each background
 *   batch after the page renders. Smaller batches keep the IMAP connection
 *   responsive between batches because each batch holds the mailbox lock
 *   only for its own duration.
 * - BACKGROUND_CHUNK_DELAY_MS: pause inserted between background chunks.
 *   Set above zero to throttle bandwidth or to leave gaps for other IMAP
 *   commands to interleave; zero means chunks fire back-to-back.
 * - USER_ACTION_POLL_INTERVAL_MS: how often the background loop checks
 *   whether the user has fired an interactive request; while one is in
 *   flight the loop pauses so the single IMAP connection stays free.
 */
const PAGE_SIZE = 25;
const BACKGROUND_CHUNK_SIZE = 1;
const BACKGROUND_CHUNK_DELAY_MS = 0;
const USER_ACTION_POLL_INTERVAL_MS = 100;

interface GlanceProps {
    selectedMailbox: MailboxSelection;
    specialTrashFolderPath?: string;
}

export function Glance({ selectedMailbox, specialTrashFolderPath = undefined }: GlanceProps) {
    const { authFetch } = useContext(AuthContext);
    const queryClient = useQueryClient();
    const setToastMessage = useToastStore(state => state.setMessage);
    const selection = useSelectedGlanceItems();

    useEffect(() => {
        selection.clearSelection();
    }, [selectedMailbox.path]);

    const hydrateBodyCache = (mailboxPath: string, messages: EmailMessage[]) => {
        for (const message of messages) {
            queryClient.setQueryData(emailQueryKey(mailboxPath, message.uniqueId), message);
        }
    };

    const collectUncachedUniqueIds = (mailboxPath: string, candidateUniqueIds: number[]): number[] => {
        return candidateUniqueIds.filter(uniqueId => queryClient.getQueryData(emailQueryKey(mailboxPath, uniqueId)) === undefined);
    };

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
        queryKey: glanceQueryKey(selectedMailbox.path),
        queryFn: async ({ pageParam }) => {
            setToastMessage(`Fetching ${selectedMailbox.name}...`, 3000);

            // Invalidate the main mailbox tree node so that we catch any new mail when the inbox has been fetched
            queryClient.invalidateQueries({ queryKey: mailboxesQueryKey() });

            const page = await fetchGlancePage({
                authFetch,
                mailboxPath: selectedMailbox.path,
                pageNumber: pageParam,
                pageSize: PAGE_SIZE
            });
            setToastMessage(`Fetched ${selectedMailbox.name}`, 3000);
            return page;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: GlancePage) => lastPage.nextPage,
        select: useCallback((queryResult: InfiniteData<GlancePage>) => ({
            pages: [...queryResult.pages].reverse(),
            pageParams: [...queryResult.pageParams].reverse()
        }), [])
    });

    // Background prefetch: once a page lands, walk the remaining UIDs in
    // chunks so the IMAP connection is freed between batches and other user
    // actions (mark read, move, click) can interleave. The abort controller
    // tears the chain down when the user switches mailbox or unmounts.
    //
    // The effect re-runs every time `data` changes, which includes the refetch
    // that follows a mutation (move, flag, etc.). Per-UID body cache lookups
    // skip anything still warm, so the re-run only refetches bodies whose
    // entries were evicted or whose UIDs are new since the last pass.
    useEffect(() => {
        if (status !== "success" || !data) {
            return;
        }

        const mailboxPathForEffect = selectedMailbox.path;
        const abortController = new AbortController();

        // Background prefetch defers to anything the user actually asked for:
        // a click that fired fetchSingleMessage shows up as an in-flight query
        // under the ["email", ...] prefix, and a move/flag mutation shows up
        // via isMutating. While either is running, sleeping here keeps the
        // single IMAP connection free so the user's action takes the lock as
        // soon as the in-flight chunk releases it.
        const waitForUserActionIdle = async (): Promise<void> => {
            while (!abortController.signal.aborted) {
                const isUserBusy =
                    queryClient.isFetching({ queryKey: ["email"] }) > 0 ||
                    queryClient.isMutating() > 0;
                if (!isUserBusy) {
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, USER_ACTION_POLL_INTERVAL_MS));
            }
        };

        const runChunkedPrefetch = async (): Promise<void> => {
            for (const page of data.pages) {
                // page.items arrives oldest-first; flip to newest-first so the
                // background warms the rows the user actually sees at the top
                // of the list before working its way down.
                const itemsNewestFirst = [...page.items].reverse();
                const remainingUniqueIds = collectUncachedUniqueIds(
                    mailboxPathForEffect,
                    itemsNewestFirst.map(item => item.uniqueId)
                );

                for (let chunkStart = 0; chunkStart < remainingUniqueIds.length; chunkStart += BACKGROUND_CHUNK_SIZE) {
                    await waitForUserActionIdle();
                    if (abortController.signal.aborted) {
                        return;
                    }

                    const chunkUniqueIds = remainingUniqueIds.slice(chunkStart, chunkStart + BACKGROUND_CHUNK_SIZE);

                    try {
                        const prefetchedMessages = await fetchBulkBodies({
                            authFetch,
                            mailboxPath: mailboxPathForEffect,
                            uniqueIds: chunkUniqueIds,
                            signal: abortController.signal
                        });
                        hydrateBodyCache(mailboxPathForEffect, prefetchedMessages);
                    } catch (thrownError: any) {
                        if (abortController.signal.aborted) {
                            return;
                        }
                        console.warn("Background prefetch chunk failed:", thrownError?.message ?? thrownError);
                    }

                    if (BACKGROUND_CHUNK_DELAY_MS > 0 && chunkStart + BACKGROUND_CHUNK_SIZE < remainingUniqueIds.length) {
                        await new Promise(resolve => setTimeout(resolve, BACKGROUND_CHUNK_DELAY_MS));
                    }
                }
            }
        };

        runChunkedPrefetch();

        return () => {
            abortController.abort();
        };
    }, [data, status, selectedMailbox.path]);

    if (status === "pending") {
        return <GlanceShell selectedMailboxName={selectedMailbox.name} selectedMailboxPath={selectedMailbox.path} statusElement={<StatusComponent status="loading" message="fetching emails..." />} />;
    }

    if (status === "error") {
        return <GlanceShell selectedMailboxName={selectedMailbox.name} selectedMailboxPath={selectedMailbox.path} statusElement={<StatusComponent status="error" message="something went wrong" />} />;
    }

    const emailGlances = data.pages.flatMap(page => page.items).reverse();

    // If there are no emails in the mailbox then notify the user
    if (emailGlances.length === 0) {
        return <GlanceShell selectedMailboxName={selectedMailbox.name} selectedMailboxPath={selectedMailbox.path} statusElement={<StatusComponent status="empty" message="no messages found" />} />;
    }

    const allLoadedEmailIds = emailGlances.map(item => item.uniqueId);
    const areAllSelected = selection.areAllSelected(allLoadedEmailIds);
    const selectedGlances = emailGlances.filter(glance => selection.selectedUniqueIds.has(glance.uniqueId));

    const handleToggleSelectAll = () => {
        if (areAllSelected) {
            selection.clearSelection();
            return;
        }
        selection.selectAll(allLoadedEmailIds);
    };

    /**
     * @brief Keeps the reading pane valid when the open email is removed.
     *
     * Picks the next email below the removed one in the list (matching the
     * reading order), falling back to the nearest one above, so the pane
     * never shows a message that no longer exists in this mailbox.
     */
    const handleEmailsRemoved = (removedUniqueIds: Set<number>) => {
        const openEmail = useSelectedEmailStore.getState().selected;
        if (!openEmail || openEmail.mailboxPath !== selectedMailbox.path || !removedUniqueIds.has(openEmail.uniqueId)) {
            return;
        }

        const openIndex = emailGlances.findIndex(glance => glance.uniqueId === openEmail.uniqueId);
        const nextBelow = emailGlances.slice(openIndex + 1).find(glance => !removedUniqueIds.has(glance.uniqueId));
        const nextAbove = [...emailGlances.slice(0, Math.max(openIndex, 0))].reverse().find(glance => !removedUniqueIds.has(glance.uniqueId));
        const nextEmail = nextBelow ?? nextAbove;

        if (nextEmail) {
            useSelectedEmailStore.getState().select(nextEmail.uniqueId, nextEmail.mailboxPath);
            return;
        }
        useSelectedEmailStore.getState().clear();
    };

    return (
        <GlanceLayout
            toolbar={
                <GlanceToolbar
                    selectedMailboxName={selectedMailbox.name}
                    selectedMailboxPath={selectedMailbox.path}
                    areAllSelected={areAllSelected}
                    onToggleSelectAll={handleToggleSelectAll}
                    selectedGlances={selectedGlances}
                    specialTrashFolderPath={specialTrashFolderPath}
                    clearGlanceSelection={() => { selection.clearSelection() }}
                    onEmailsRemoved={handleEmailsRemoved}
                />
            }
        >
            <GlanceList
                emailGlances={emailGlances}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                onFetchNextPage={fetchNextPage}
                selectedUniqueIds={selection.selectedUniqueIds}
                onToggleSelection={selection.toggleSelection}
                specialTrashFolderPath={specialTrashFolderPath}
                onEmailsRemoved={handleEmailsRemoved}
            />
        </GlanceLayout>
    );
}

interface GlanceShellProps {
    selectedMailboxName: string;
    selectedMailboxPath: string;
    statusElement: React.JSX.Element;
}

/**
 * @brief Renders the toolbar and centred status element when the list is empty or pending.
 */
function GlanceShell({ selectedMailboxName, selectedMailboxPath, statusElement }: GlanceShellProps) {
    return (
        <GlanceLayout
            toolbar={
                <GlanceToolbar
                    selectedMailboxName={selectedMailboxName}
                    selectedMailboxPath={selectedMailboxPath}
                    areAllSelected={false}
                    onToggleSelectAll={() => undefined}
                    selectedGlances={[]}
                />
            }
        >
            <div className="flex items-center justify-center h-full">{statusElement}</div>
        </GlanceLayout>
    );
}

interface GlanceLayoutProps {
    toolbar: React.JSX.Element;
    children: React.ReactNode;
}

/**
 * @brief Pure layout container for the glance pane.
 */
function GlanceLayout({ toolbar, children }: GlanceLayoutProps) {
    return (
        <div className="h-full w-full flex flex-col min-h-0">
            {toolbar}
            {children}
        </div>
    );
}
