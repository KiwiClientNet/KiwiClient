/**
 * @brief Loading and status indicators shared across pages.
 *
 * StatusComponent renders a single icon and message in one of four states.
 * MailboxPageLoading centres the indicator on the full-screen layout used
 * before the mailbox tree has been fetched.
 */

import { ArrowPathIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { Inbox } from "lucide-react";
import Logo from "./Logo";

type StatusKind = "loading" | "error" | "empty" | "info";

interface StatusComponentProps {
    message: string;
    status: StatusKind;
}

/**
 * @brief Renders an icon and message reflecting the given status kind.
 */
export function StatusComponent({ message, status }: StatusComponentProps) {
    const iconBySize = "size-10";

    const iconByStatus = {
        loading: <ArrowPathIcon className={`text-foreground ${iconBySize} animate-spin`} />,
        error: <XMarkIcon className={`text-kiwi-failure ${iconBySize}`} />,
        empty: <Inbox className={`text-kiwi-info ${iconBySize}`} />,
        info: <InformationCircleIcon className={`text-kiwi-info ${iconBySize}`} />
    };

    const textColourByStatus = {
        loading: "text-foreground",
        error: "text-kiwi-failure",
        empty: "text-kiwi-info",
        info: "text-kiwi-info"
    };

    return (
        <div className="flex flex-col items-center">
            <span>{iconByStatus[status]}</span>
            <p className={`whitespace text-center text-3xl ml-4 ${textColourByStatus[status]}`}> {message} </p>
        </div>
    );
}

export function MailboxPageLoading({ Status }: { Status: React.JSX.Element }) {
    return (
        <div className="grid h-screen place-items-center bg-background">
            <div className="flex flex-col items-center gap-6">
                <Logo width={300} height={300} reverseLogo={true} />
                <div className="flex items-center">
                    {Status}
                </div>
            </div>
        </div>
    );
}
