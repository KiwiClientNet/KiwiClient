/**
 * @brief Right-hand email pane that either welcomes the user or renders a message.
 *
 * Delegates the actual rendering to EmailIframe when there is a selection
 * and to WelcomeMessage otherwise; the outer wrapper exists only to provide
 * the layout grid placement and the header strip.
 */

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useSelectedEmailStore } from "../../../store/selectedEmailStore";
import { EmailHeader } from "./EmailHeader";
import { EmailIframe } from "./EmailIframe";
import { WelcomeMessage } from "./WelcomeMessage";

interface EmailboxProps {
    onBack?: () => void;
}

export function Emailbox({ onBack }: EmailboxProps) {
    const selected = useSelectedEmailStore(state => state.selected);

    return (
        <div className="h-full w-full rounded-none lg:rounded-2xl bg-kiwi-black p-2 flex flex-col min-h-0">
            {selected && onBack && (
                <div className="lg:hidden flex items-center gap-2 pb-2 shrink-0">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to inbox"
                        className="kiwi-icon-btn -ml-1"
                    >
                        <ArrowLeftIcon className="size-6" />
                    </button>
                    <span className="text-sm font-bold">Back</span>
                </div>
            )}
            {selected ? (
                <>
                    <EmailHeader selected={selected} />
                    <div className="flex-1 min-h-0 rounded-xl bg-kiwi-white text-kiwi-black overflow-hidden">
                        <EmailIframe selected={selected} />
                    </div>
                </>
            ) : (
                <div className="flex-1 min-h-0 rounded-xl flex items-center justify-center overflow-auto">
                    <WelcomeMessage />
                </div>
            )}
        </div>
    );
}
