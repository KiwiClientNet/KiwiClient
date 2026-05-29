import { ArrowsPointingInIcon, ArrowsPointingOutIcon, MinusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { useComposeEmailStore } from "../../../store/composeEmailStore";

export default function ComposeBox() {
    const [maximized, setMaximized] = useState<boolean>(false);
    const [minimized, setMinimized] = useState<boolean>(false);
    const hidden = useComposeEmailStore(state => state.hidden);
    const setHidden = useComposeEmailStore(state => state.setHidden);

    return (
        <section
            className={[
                hidden ? "hidden" : "flex",
                // mobile: fullscreen sheet
                "fixed inset-0 z-50 flex-col h-dvh w-full overflow-auto",
                // desktop base chrome — overridden by maximized branch
                "md:inset-auto md:bottom-0 md:right-4 md:overflow-hidden",
                // visual chrome
                "bg-kiwi-white text-kiwi-black shadow-2xl border border-kiwi-middle-grey",
                "md:rounded-t-lg transition-all duration-300 ease-out",
                // desktop size state
                maximized
                    ? "md:inset-2 md:bottom-2 md:right-2 md:h-[calc(100dvh-1rem)] md:w-[calc(100vw-1rem)] md:left-2"
                    : minimized
                        ? "md:h-11 md:w-136"
                        : "md:h-160 md:w-136",
                "md:max-h-full md:max-w-full",
            ].join(" ")}
        >
            <header
                className="flex h-11 shrink-0 items-center justify-between bg-kiwi-light-grey px-3"
                onClick={() => minimized && setMinimized(false)}
            >
                <span className="truncate text-sm font-semibold">New message</span>
                <div className="flex items-center gap-4">
                    <MinusIcon
                        className="size-5 cursor-pointer hidden md:block"
                        onClick={(event) => { event.stopPropagation(); setMinimized(previous => !previous); setMaximized(false) }}
                    />
                    {!maximized && (
                        <ArrowsPointingOutIcon
                            className="size-5 cursor-pointer hidden md:block"
                            onClick={(event) => { event.stopPropagation(); setMaximized(previous => !previous); }}
                        />
                    )}
                    {maximized && (
                        <ArrowsPointingInIcon
                            className="size-5 cursor-pointer hidden md:block"
                            onClick={(event) => { event.stopPropagation(); setMaximized(previous => !previous); }}
                        />
                    )}
                    <XMarkIcon
                        className="size-5 cursor-pointer"
                        onClick={(event) => { event.stopPropagation(); setHidden(!hidden); }}
                    />
                </div>
            </header>

            <div className={minimized ? "invisible" : "flex flex-1 flex-col overflow-y-auto p-4"}>
                {/* fields + editor */}
            </div>
        </section>
    );
}

