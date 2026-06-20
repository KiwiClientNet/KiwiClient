/**
 * @brief Bottom status bar that shows the signed-in email and a transient message.
 *
 * Reads the signed-in email from AuthContext rather than duplicating it into
 * a separate store, and the message from the toast store so that any other
 * component can surface a status without prop drilling.
 */

import { useContext } from "react";
import { AuthContext } from "../../../auth/AuthContext";
import { useToastStore } from "../../../store/toastStore";
import { Status } from "../../../components/Status";
import { UserMenu } from "./UserMenu";

export function StatusBar() {
    const { email } = useContext(AuthContext);
    const message = useToastStore((state) => state.message);
    const status = useToastStore((state) => state.status);

    return (
        <div className="shrink-0 text-sm mx-2 mb-2 mt-1 md:mx-3 md:mb-3 px-4 md:px-5 py-2.5 min-h-10 kiwi-panel flex items-center gap-2">
            <UserMenu />
            <span className="font-bold truncate shrink-0 max-w-[55%] sm:max-w-[40%]">
                {`${email}${message !== "" ? ":" : ""}`}
            </span>
            <span className="truncate opacity-70">
                {message}
            </span>
            <Status status={status} iconSize={5} />
        </div>
    );
}
