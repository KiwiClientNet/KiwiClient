/**
 * @brief Container component for the mailbox glance pane.
 *
 * Drives the paged listing via React Query, owns selection state for bulk
 * operations, and renders the toolbar and list. The list itself is split
 * out so that this component stays focused on data orchestration rather
 * than presentation details.
 */

import { useContext, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { GlancePage } from "@KiwiClient/shared";
import { AuthContext } from "../../../auth/AuthContext";
import { fetchGlancePage } from "../../../api/messages";
import { StatusComponent } from "../../../components/Loading";
import { useToastStore } from "../../../store/toastStore";
import type { MailboxSelection } from "../types";
import { GlanceList } from "./GlanceList";
import { GlanceToolbar } from "./GlanceToolbar";
import { glanceQueryKey } from "./queryKeys";
import { useSelectedGlanceItems } from "./useSelectedGlanceItems";

const PAGE_SIZE = 25;

interface GlanceProps {
    selectedMailbox: MailboxSelection;
    specialTrashFolderPath?: string;
}

export function Glance({ selectedMailbox, specialTrashFolderPath = undefined }: GlanceProps) {
    const { authFetch } = useContext(AuthContext);
    const setToastMessage = useToastStore(state => state.setMessage);
    const selection = useSelectedGlanceItems();

    useEffect(() => {
        selection.clearSelection();
    }, [selectedMailbox.path]);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
        queryKey: glanceQueryKey(selectedMailbox.path),
        queryFn: async ({ pageParam }) => {
            setToastMessage(`Fetching ${selectedMailbox.name}...`, 3000);
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
        select: (queryResult) => ({
            pages: [...queryResult.pages].reverse(),
            pageParams: [...queryResult.pageParams].reverse()
        })
    });

    if (status === "pending") {
        return <GlanceShell selectedMailboxName={selectedMailbox.name} selectedMailboxPath={selectedMailbox.path} statusElement={<StatusComponent status="loading" message="fetching emails..." />} />;
    }

    if (status === "error") {
        return <GlanceShell selectedMailboxName={selectedMailbox.name} selectedMailboxPath={selectedMailbox.path} statusElement={<StatusComponent status="error" message="something went wrong" />} />;
    }

    const emailGlances = data.pages.flatMap(page => page.items).reverse();
    const allVisibleIds = emailGlances.map(item => item.uniqueId);
    const areAllSelected = selection.areAllSelected(allVisibleIds);

    const handleToggleSelectAll = () => {
        if (areAllSelected) {
            selection.clearSelection();
            return;
        }
        selection.selectAll(allVisibleIds);
    };

    return (
        <GlanceLayout
            toolbar={
                <GlanceToolbar
                    selectedMailboxName={selectedMailbox.name}
                    selectedMailboxPath={selectedMailbox.path}
                    areAllSelected={areAllSelected}
                    onToggleSelectAll={handleToggleSelectAll}
                    selectedUniqueIds={selection.selectedUniqueIds}
                    specialTrashFolderPath={specialTrashFolderPath}
                    clearGlanceSelection={() => { selection.clearSelection() }}
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
                    selectedUniqueIds={new Set()}
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
