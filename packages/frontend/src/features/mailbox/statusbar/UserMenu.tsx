/**
 * @brief Bottom-right account button that opens an upward popover for the
 * signed-in user.
 *
 * Identity lives in AuthContext, so this reads it rather than duplicating it.
 * The menu closes on any outside click through a full-screen transparent
 * backdrop — the same idiom the sidebar drawer uses on mobile — which avoids a
 * document-level listener and keeps the open/close state local to this widget.
 */

import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightStartOnRectangleIcon, ChevronUpIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { AuthContext } from "../../../auth/AuthContext";

export function UserMenu() {
    const { name, email, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const initial = (name || email).trim().charAt(0).toUpperCase() || "?";

    const handleLogout = () => {
        setIsOpen(false);
        logout().then(() => navigate("/login"));
    };

    return (
        <div className="relative z-50 ml-auto shrink-0">
            {isOpen && (
                <div
                    aria-hidden="true"
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 z-30"
                />
            )}

            {isOpen && (
                <div role="menu" className="absolute bottom-full right-0 z-40 mb-2 w-56 kiwi-panel overflow-hidden shadow-kiwi-black shadow-lg">
                    <div className="px-4 py-3 border-b border-kiwi-light-black">
                        <p className="font-bold truncate">{name || "Signed in"}</p>
                        <p className="text-xs opacity-60 truncate">{email}</p>
                    </div>
                    <button
                        type="button"
                        role="menuitem"
                        disabled
                        title="Settings coming soon"
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm opacity-40 cursor-not-allowed"
                    >
                        <Cog6ToothIcon className="size-4" />
                        Settings
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm cursor-pointer hover:bg-kiwi-light-black transition-colors duration-200"
                    >
                        <ArrowRightStartOnRectangleIcon className="size-4" />
                        Logout
                    </button>
                </div>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(previous => !previous)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-lg p-1 pr-2 cursor-pointer hover:bg-kiwi-light-black transition-colors duration-200"
            >
                <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-kiwi-green text-kiwi-black font-bold text-sm">
                    {initial}
                </span>
                <ChevronUpIcon className={`size-4 opacity-60 transition-transform duration-200 ${isOpen ? "" : "rotate-180"}`} />
            </button>
        </div>
    );
}
