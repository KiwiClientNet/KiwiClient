import { create } from "zustand";

interface ComposeEmailStore {
    hidden: boolean;
    setHidden: (value: boolean) => void;
}

export const useComposeEmailStore = create<ComposeEmailStore>((set) => ({
    hidden: true,
    setHidden: (value) => set({ hidden: value }),
}));
