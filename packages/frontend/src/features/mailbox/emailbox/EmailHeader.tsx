/**
 * @brief Header strip above the reading pane: envelope details and actions.
 *
 * Uses the same query key as EmailIframe, so React Query serves both from
 * one cache entry and no extra network request is made. The action buttons
 * are UI only for now; their handlers are placeholders.
 */

import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Forward, Reply, ReplyAll } from "lucide-react";
import type { EmailAddress } from "@KiwiClient/shared";
import { AuthContext } from "../../../auth/AuthContext";
import { fetchSingleMessage } from "../../../api/messages";
import { emailQueryKey } from "../glance/queryKeys";

interface SelectedEmailReference {
    uniqueId: number;
    mailboxPath: string;
}

function formatFullDateTime(dateIso: string): string {
    return new Date(dateIso).toLocaleString(navigator.language, { dateStyle: "long", timeStyle: "short" });
}

interface AddressRowProps {
    label: string;
    addresses: EmailAddress[];
}

function AddressRow({ label, addresses }: AddressRowProps) {
    if (addresses.length === 0) {
        return null;
    }

    return (
        <div className="flex gap-2 min-w-0 text-sm">
            <span className="shrink-0 w-10 font-bold opacity-50">{label}</span>
            <span className="truncate">
                {addresses.map((address, addressIndex) => (
                    <span key={`${address.address}-${addressIndex}`}>
                        {addressIndex > 0 && ", "}
                        <span className="font-medium">{address.name ?? address.address}</span>
                        {address.name && <span className="opacity-50"> &lt;{address.address}&gt;</span>}
                    </span>
                ))}
            </span>
        </div>
    );
}

interface HeaderActionButtonProps {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
}

function HeaderActionButton({ label, icon, onClick }: HeaderActionButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg border border-kiwi-light-black cursor-pointer hover:border-kiwi-green hover:text-kiwi-green transition-colors duration-200"
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

export function EmailHeader({ selected }: { selected: SelectedEmailReference }) {
    const { authFetch } = useContext(AuthContext);

    const { data } = useQuery({
        queryKey: emailQueryKey(selected.mailboxPath, selected.uniqueId),
        queryFn: () => fetchSingleMessage({
            authFetch,
            mailboxPath: selected.mailboxPath,
            uniqueId: selected.uniqueId
        }),
        staleTime: 1000 * 60 * 5
    });

    if (!data) {
        return (
            <div className="kiwi-panel p-4 mb-2 shrink-0 space-y-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-kiwi-light-black" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-kiwi-light-black" />
            </div>
        );
    }

    return (
        <div className="kiwi-panel p-4 mb-2 shrink-0">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <h2 className="font-bold text-lg leading-snug min-w-0 line-clamp-2">{data.subject}</h2>
                <span className="shrink-0 text-xs opacity-60 whitespace-nowrap sm:mt-1.5">{formatFullDateTime(data.dateIso)}</span>
            </div>

            <div className="mt-2 space-y-0.5">
                <AddressRow label="From" addresses={[data.from]} />
                <AddressRow label="To" addresses={data.to} />
                <AddressRow label="Cc" addresses={data.cc} />
            </div>

            <div className="mt-3 flex items-center gap-2">
                <HeaderActionButton label="Reply" icon={<Reply className="size-4" />} onClick={() => alert("Replying coming soon!")} />
                <HeaderActionButton label="Reply all" icon={<ReplyAll className="size-4" />} onClick={() => alert("Replying coming soon!")} />
                <HeaderActionButton label="Forward" icon={<Forward className="size-4" />} onClick={() => alert("Forwarding coming soon!")} />
            </div>
        </div>
    );
}
