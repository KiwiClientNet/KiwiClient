/**
 * @brief Right-hand email pane that either welcomes the user or renders a message.
 *
 * Delegates the actual rendering to EmailIframe when there is a selection
 * and to WelcomeMessage otherwise; the outer wrapper exists only to provide
 * the layout grid placement and the header strip.
 */

import { useSelectedEmailStore } from "../../../store/selectedEmailStore";
import { EmailIframe } from "./EmailIframe";
import { WelcomeMessage } from "./WelcomeMessage";

export function Emailbox() {
    const selected = useSelectedEmailStore(state => state.selected);

    return (
        <div className="row-span-12 col-span-7 rounded-3xl bg-kiwi-black p-2 ml-1 flex flex-col">
            <div className="col-span-8 row-span-1 rounded-3xl bg-kiwi-black p-2">
                ====&gt; Selection and tooling bar 2
            </div>
            <div className="col-span-8 row-span-11 rounded-3xl mt-2 bg-kiwi-light-grey p-3 text-kiwi-black flex-1">
                {selected ? (
                    <EmailIframe selected={selected} />
                ) : (
                    <div className="h-full max-h-full w-full flex items-center justify-center bg-kiwi-light-grey rounded-3xl">
                        <WelcomeMessage />
                    </div>
                )}
            </div>
        </div>
    );
}
