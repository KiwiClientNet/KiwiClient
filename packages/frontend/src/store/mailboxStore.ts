import type { MailboxNamePathDepth } from "@KiwiClient/shared";
import { create } from "zustand";

interface MailboxStore {
    sentPath: string;
    setSentPath: (path: string) => void;
    possibleMailboxDestinations: MailboxNamePathDepth[];
    setPossibleMailboxDestinations: (mailboxes: MailboxNamePathDepth[]) => void;
    specialDraftFolderPath: string;
    setSpecialDraftFolderPath: (path: string) => void;
}

export const useMailboxStore = create<MailboxStore>((set) => ({
    sentPath: "",
    setSentPath: path => set({ sentPath: path }),
    possibleMailboxDestinations: [],
    setPossibleMailboxDestinations: mailboxes => set({ possibleMailboxDestinations: mailboxes }),
    specialDraftFolderPath: "",
    setSpecialDraftFolderPath: path => set({ specialDraftFolderPath: path })
}));
