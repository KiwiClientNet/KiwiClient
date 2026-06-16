/**
 * @brief Loading and status indicators shared across pages.
 *
 * StatusComponent renders a single icon and message in one of four states.
 * MailboxPageLoading centres the indicator on the full-screen layout used
 * before the mailbox tree has been fetched.
 */

import Logo from "./Logo";
import { Status, type StatusKind } from "./Status";

interface StatusComponentProps {
    message: string;
    status: StatusKind
}

/**
 * @brief Renders an icon and message reflecting the given status kind.
 */
export function StatusComponent({ message, status }: StatusComponentProps) {

    const textColourByStatus = {
        loading: "text-kiwi-white opacity-70",
        error: "text-kiwi-failure",
        empty: "text-kiwi-middle-grey",
        info: "text-kiwi-middle-grey",
        success: "text-kiwi-success",
        none: "text-kiwi-middle-grey"
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <Status status={status} iconSize={10} />
            <p className={`text-center text-lg font-bold ${textColourByStatus[status]}`}>{message}</p>
        </div>
    );
}

export function MailboxPageLoading({ Status }: { Status: React.JSX.Element }) {
    return (
        <div className="grid h-screen place-items-center">
            <div className="flex flex-col items-center gap-6">
                <Logo link={false} className="w-75 h-75" reverseLogo={true} />
                <div className="flex items-center">
                    {Status}
                </div>
            </div>
        </div>
    );
}
