/**
 * @brief Holds the currently selected email so the email pane can render it.
 *
 * Selection is global UI state because the mailbox list and email pane are
 * sibling components that need to share the value without prop drilling.
 * Zustand is preferred over React context here so that changing the
 * selection does not force a re-render of the mailbox tree.
 */

import { create } from "zustand";

interface SelectedEmail {
    uniqueId: number;
    mailboxPath: string;
}

interface SelectedEmailStore {
    selected: SelectedEmail | null;
    select: (uniqueId: number, mailboxPath: string) => void;
    clear: () => void;
}

export const useSelectedEmailStore = create<SelectedEmailStore>((set) => ({
    selected: null,
    select: (uniqueId, mailboxPath) => set({ selected: { uniqueId, mailboxPath } }),
    clear: () => set({ selected: null })
}));
