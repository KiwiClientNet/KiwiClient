/**
 * @brief Right-hand email pane that renders the selected message.
 */

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useSelectedEmailStore } from "../../../store/selectedEmailStore";
import { EmailHeader } from "./EmailHeader";
import { EmailIFrame } from "./EmailIFrame";
import { useQuery } from "@tanstack/react-query";
import { emailQueryKey } from "../glance/queryKeys";
import { fetchSingleMessage } from "../../../api/messages";
import { useContext } from "react";
import { AuthContext } from "../../../auth/AuthContext";
import { EmailLoading } from "./EmailLoading";
import EmailHeaderLoading from "./EmailHeaderLoading";

interface EmailboxProps {
    onBack?: () => void;
}

export function Emailbox({ onBack }: EmailboxProps) {
    const { authFetch } = useContext(AuthContext);
    const selected = useSelectedEmailStore(state => state.selected);

    const { data, status, isLoading } = useQuery({
        queryKey: emailQueryKey(selected!.mailboxPath, selected!.uniqueId),
        queryFn: () => fetchSingleMessage({
            authFetch,
            mailboxPath: selected!.mailboxPath,
            uniqueId: selected!.uniqueId
        }),
        staleTime: 1000 * 60 * 5
    });

    if (isLoading || data === undefined) {
        return (
            <div className="h-full w-full rounded-none lg:rounded-2xl bg-kiwi-black p-2 flex flex-col min-h-0">
                <EmailHeaderLoading />
                <EmailLoading />
            </div>
        );
    }

    return (
        <div className="h-full w-full rounded-none lg:rounded-2xl bg-kiwi-black p-2 flex flex-col min-h-0">
            {onBack && (
                <div className="lg:hidden flex items-center gap-2 pb-2 shrink-0">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to inbox"
                        className="kiwi-icon-btn -ml-1"
                    >
                        <ArrowLeftIcon className="size-6" />
                    </button>
                    <span className="text-sm font-bold">Back</span>
                </div>
            )}
            <EmailHeader data={data} />
            <div className="flex-1 min-h-0 rounded-xl bg-kiwi-white text-kiwi-black overflow-hidden">
                <EmailIFrame status={status} data={data} />
            </div>
        </div>
    );
}
