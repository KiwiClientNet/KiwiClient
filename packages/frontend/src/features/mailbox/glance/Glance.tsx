/**
 * @brief Container component for the mailbox glance pane.
 *
 * Drives the paged listing via React Query, owns selection state for bulk
 * operations, and renders the toolbar and list. The list itself is split
 * out so that this component stays focused on data orchestration rather
 * than presentation details.
 */

import { useCallback, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { GlancePage } from "@KiwiClient/shared";
import { AuthContext } from "../../../auth/AuthContext";
import { fetchGlancePage } from "../../../api/messages";
import { StatusComponent } from "../../../components/Loading";
import { useToastStore } from "../../../store/toastStore";
import { useSelectedEmailStore } from "../../../store/selectedEmailStore";
import type { MailboxSelection } from "../types";
import { GlanceList } from "./GlanceList";
import { GlanceToolbar } from "./GlanceToolbar";
import { glanceQueryKey } from "./queryKeys";
import { useSelectedGlanceItems } from "./useSelectedGlanceItems";
import { mailboxesQueryKey } from "../queryKeys";
import { mailPathToUrl } from "../mailboxRouting";

const PAGE_SIZE = 25;

interface GlanceProps {
    selectedMailbox: MailboxSelection;
    specialTrashFolderPath?: string;
}

export function Glance({ selectedMailbox, specialTrashFolderPath = undefined }: GlanceProps) {
    const { authFetch } = useContext(AuthContext);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const setToastMessage = useToastStore(state => state.setMessage);
    const selection = useSelectedGlanceItems();

    useEffect(() => {
        selection.clearSelection();
    }, [selectedMailbox.path]);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
        queryKey: glanceQueryKey(selectedMailbox.path),
        queryFn: async ({ pageParam }) => {
            setToastMessage(`Fetching ${selectedMailbox.name}...`, "loading", 3000);

            // Invalidate the main mailbox tree node so that we catch any new mail when the inbox has been fetched
            queryClient.invalidateQueries({ queryKey: mailboxesQueryKey() });
            // TODO: As the main side-bar node gets invalidated, we update the
            // unseen-count of messages, so now we will need to invalidate the
            // first page if the count has changed so the first page is
            // refetched again with the updated new messages

            const page = await fetchGlancePage({
                authFetch,
                mailboxPath: selectedMailbox.path,
                pageNumber: pageParam,
                pageSize: PAGE_SIZE
            });
            setToastMessage(`Fetched ${selectedMailbox.name}`, "success", 3000);
            return page;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: GlancePage) => lastPage.nextPage,
        select: useCallback((queryResult: InfiniteData<GlancePage>) => ({
            pages: [...queryResult.pages].reverse(),
            pageParams: [...queryResult.pageParams].reverse()
        }), [])
    });

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
            navigate(mailPathToUrl(nextEmail.mailboxPath, nextEmail.uniqueId));
            return;
        }
        navigate(mailPathToUrl(selectedMailbox.path));
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
