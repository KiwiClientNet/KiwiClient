/**
 * @brief Holds the currently selected email so the email pane can render it.
 *
 * Selection is a global UI state because the mailbox list and email pane are
 * sibling components that need to share the value without prop drilling.
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
