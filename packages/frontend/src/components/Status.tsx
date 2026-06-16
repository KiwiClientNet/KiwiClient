/**
 * @brief Status component for sharing across components which need to display some sort of status UI
 *
 */

import { ArrowPathIcon, CheckIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { Inbox } from "lucide-react";

export type StatusKind = "loading" | "error" | "empty" | "info" | "success" | "none";

interface StatusProps {
    status: StatusKind;
    iconSize: number;
}

/**
 * @brief Renders an icon reflecting the given status kind.
 */
export function Status({ status, iconSize }: StatusProps) {
    const iconByStatus = {
        loading: <ArrowPathIcon className={`text-kiwi-green size-${iconSize} animate-spin`} />,
        error: <XMarkIcon className={`text-kiwi-failure size-${iconSize}`} />,
        empty: <Inbox className={`text-kiwi-middle-grey size-${iconSize}`} />,
        info: <InformationCircleIcon className={`text-kiwi-middle-grey size-${iconSize}`} />,
        success: <CheckIcon className={`text-kiwi-success size-${iconSize}`} />,
        none: <></>
    };

    return (
        <span>{iconByStatus[status]}</span>
    );
}
