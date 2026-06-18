/**
 * @brief Status component for sharing across components which need to display some sort of status UI
 *
 */

import { ArrowPathIcon, CheckIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { Inbox } from "lucide-react";

export type StatusKind = "loading" | "error" | "empty" | "info" | "success" | "none";

/**
 * Tailwind scans source for complete class strings, so a class built by
 * interpolation (`size-${n}`) is never generated. Every supported size must
 * therefore appear here as a literal, and the prop is keyed to this map so an
 * unsupported size is a compile error rather than an invisible icon.
 */
const ICON_SIZE_CLASS = {
    5: "size-5",
    10: "size-10",
} as const;

interface StatusProps {
    status: StatusKind;
    iconSize: keyof typeof ICON_SIZE_CLASS;
}

/**
 * @brief Renders an icon reflecting the given status kind.
 */
export function Status({ status, iconSize }: StatusProps) {
    const sizeClass = ICON_SIZE_CLASS[iconSize];
    const iconByStatus = {
        loading: <ArrowPathIcon className={`text-kiwi-green ${sizeClass} animate-spin`} />,
        error: <XMarkIcon className={`text-kiwi-failure ${sizeClass}`} />,
        empty: <Inbox className={`text-kiwi-middle-grey ${sizeClass}`} />,
        info: <InformationCircleIcon className={`text-kiwi-middle-grey ${sizeClass}`} />,
        success: <CheckIcon className={`text-kiwi-success ${sizeClass}`} />,
        none: <></>
    };

    return (
        <span>{iconByStatus[status]}</span>
    );
}
