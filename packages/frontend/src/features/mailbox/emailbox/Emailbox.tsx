/**
 * @brief Right-hand email pane that either welcomes the user or renders a message.
 *
 * Delegates the actual rendering to EmailIframe when there is a selection
 * and to WelcomeMessage otherwise; the outer wrapper exists only to provide
 * the layout grid placement and the header strip.
 */

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useSelectedEmailStore } from "../../../store/selectedEmailStore";
import { EmailIframe } from "./EmailIframe";
import { WelcomeMessage } from "./WelcomeMessage";

interface EmailboxProps {
    onBack?: () => void;
}

export function Emailbox({ onBack }: EmailboxProps) {
    const selected = useSelectedEmailStore(state => state.selected);

    return (
        <div className="h-full w-full rounded-none md:rounded-3xl bg-kiwi-black p-2 flex flex-col min-h-0">
            <div className="flex items-center gap-2 rounded-3xl bg-kiwi-black p-2 shrink-0">
                {selected && onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to inbox"
                        className="md:hidden p-2 -ml-1 rounded-lg hover:bg-kiwi-light-black active:bg-kiwi-light-black transition-colors"
                    >
                        <ArrowLeftIcon className="size-6" />
                    </button>
                )}
                <span className="text-sm opacity-70">
                    ====&gt; Selection and tooling bar 2
                </span>
            </div>
            <div className="flex-1 min-h-0 rounded-3xl mt-2 bg-kiwi-light-grey p-3 text-kiwi-black overflow-auto">
                {selected ? (
                    <EmailIframe selected={selected} />
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-kiwi-light-grey rounded-3xl">
                        <WelcomeMessage />
                    </div>
                )}
            </div>
        </div>
    );
}
