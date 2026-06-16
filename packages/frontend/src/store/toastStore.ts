/**
 * @brief Transient status message rendered in the status bar.
 *
 * Auto-clears after the requested duration so callers do not need to track
 * timers themselves. A new message replaces any pending clear timer to
 * avoid an earlier timeout wiping a later message.
 */

import { create } from "zustand";
import type { StatusKind } from "../components/Status";

interface ToastStore {
    message: string;
    setMessage: (message: string, status: StatusKind, durationMs?: number) => void;
    status: StatusKind
}

export const useToastStore = create<ToastStore>((set) => {
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

    return {
        message: "",
        setMessage: (message, status, durationMs) => {
            if (pendingTimeout) {
                clearTimeout(pendingTimeout);
                pendingTimeout = null;
            }

            set({ message });
            set({ status });

            if (!durationMs) {
                return;
            }

            pendingTimeout = setTimeout(() => {
                set({ message: "" });
                set({ status: "none" });
                pendingTimeout = null;
            }, durationMs);
        },
        status: "success"
    };
});
