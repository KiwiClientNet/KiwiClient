import { create } from "zustand";

interface MailboxStore {
    sentPath: string;
    setSentPath: (path: string) => void;
}

export const useMailboxStore = create<MailboxStore>((set) => ({
    sentPath: "",
    setSentPath: (path) => set({ sentPath: path }),
}));
