/**
 * @brief Transient status message rendered in the status bar.
 *
 * Auto-clears after the requested duration so callers do not need to track
 * timers themselves. A new message replaces any pending clear timer to
 * avoid an earlier timeout wiping a later message.
 */

import { create } from "zustand";

interface ToastStore {
    message: string;
    setMessage: (message: string, durationMs?: number) => void;
}

export const useToastStore = create<ToastStore>((set) => {
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

    return {
        message: "",
        setMessage: (message, durationMs) => {
            if (pendingTimeout) {
                clearTimeout(pendingTimeout);
                pendingTimeout = null;
            }

            set({ message });

            if (!durationMs) {
                return;
            }

            pendingTimeout = setTimeout(() => {
                set({ message: "" });
                pendingTimeout = null;
            }, durationMs);
        }
    };
});
