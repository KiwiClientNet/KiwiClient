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

export function StatusBar() {
    const { email } = useContext(AuthContext);
    const message = useToastStore((state) => state.message);

    return (
        <div className="text-sm row-span-1 col-span-12 m-2 px-5 bg-kiwi-middle-black rounded-3xl flex items-center">
            <span className="font-bold">
                {`${email}${message !== "" ? ":" : ""}`}
            </span>
            <span>
                &nbsp;{message}
            </span>
        </div>
    );
}
