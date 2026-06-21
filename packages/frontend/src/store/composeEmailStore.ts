import { create } from "zustand";
import type { MessageFormHandle } from "../features/mailbox/compose/MessageForm";
import type { EmailEditorHandle } from "../features/mailbox/compose/EmailEditor";

interface ComposeEmailStore {
    hidden: boolean;
    setHidden: (value: boolean) => void;
    formRef: MessageFormHandle | null;
    setFormRef: (ref: MessageFormHandle | null) => void;
    editorRef: EmailEditorHandle | null;
    setEditorRef: (ref: EmailEditorHandle | null) => void;
}

export const useComposeEmailStore = create<ComposeEmailStore>((set) => ({
    hidden: true,
    setHidden: value => set({ hidden: value }),
    formRef: null,
    setFormRef: ref => set({ formRef: ref }),
    editorRef: null,
    setEditorRef: ref => set({ editorRef: ref })
}));
