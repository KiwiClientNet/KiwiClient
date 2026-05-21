/**
 * @brief Hook that adds or removes IMAP flags on one or many messages.
 *
 * Updates the cached glance pages optimistically so the row UI reflects the
 * new flag state without waiting on the server. On failure the previous
 * cache snapshot is restored so the user sees the original state return.
 */

import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { EmailFlags, GlancePage } from "@KiwiClient/shared";
import { AuthContext } from "../../../auth/AuthContext";
import { patchMessageFlags } from "../../../api/messages";
import { glanceQueryKey } from "./queryKeys";

const FLAG_TO_DTO_KEY: Record<string, keyof EmailFlags> = {
    "\\Seen": "seen",
    "\\Flagged": "flagged",
    "\\Answered": "answered",
    "\\Draft": "draft"
};

interface CachedGlanceData {
    pages: GlancePage[];
    pageParams: unknown[];
}

interface FlagsMutationVariables {
    uniqueIds: number[];
    flagsToAdd: string[];
    flagsToRemove: string[];
}

interface UseMessageFlagsMutationArguments {
    mailboxPath: string;
}

/**
 * @brief Applies the add/remove sets to a single EmailFlags object.
 *
 * Unknown flag strings are silently ignored because the IMAP server may
 * carry custom keywords that have no boolean counterpart in the domain
 * EmailFlags shape.
 */
function applyFlagChanges(currentFlags: EmailFlags, flagsToAdd: string[], flagsToRemove: string[]): EmailFlags {
    const nextFlags: EmailFlags = { ...currentFlags };

    for (const flag of flagsToAdd) {
        const key = FLAG_TO_DTO_KEY[flag];
        if (key) {
            nextFlags[key] = true;
        }
    }

    for (const flag of flagsToRemove) {
        const key = FLAG_TO_DTO_KEY[flag];
        if (key) {
            nextFlags[key] = false;
        }
    }

    return nextFlags;
}

export function useMessageFlagsMutation({ mailboxPath }: UseMessageFlagsMutationArguments) {
    const { authFetch } = useContext(AuthContext);
    const queryClient = useQueryClient();

    return useMutation<void, Error, FlagsMutationVariables, { previousData?: CachedGlanceData }>({
        mutationFn: ({ uniqueIds, flagsToAdd, flagsToRemove }) =>
            patchMessageFlags({ authFetch, mailboxPath, uniqueIds, flagsToAdd, flagsToRemove }),

        onMutate: async ({ uniqueIds, flagsToAdd, flagsToRemove }) => {
            const queryKey = glanceQueryKey(mailboxPath);
            await queryClient.cancelQueries({ queryKey });

            const previousData = queryClient.getQueryData<CachedGlanceData>(queryKey);
            const targetUidSet = new Set(uniqueIds);

            queryClient.setQueryData<CachedGlanceData>(queryKey, oldData => {
                if (!oldData) {
                    return oldData;
                }

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        items: page.items.map(item => {
                            if (!targetUidSet.has(item.uniqueId)) {
                                return item;
                            }
                            return { ...item, flags: applyFlagChanges(item.flags, flagsToAdd, flagsToRemove) };
                        })
                    }))
                };
            });

            return { previousData };
        },

        onError: (_thrownError, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(glanceQueryKey(mailboxPath), context.previousData);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: glanceQueryKey(mailboxPath) });
        }
    });
}
