import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CachedGlanceData } from "../types";
import { useContext } from "react";
import { AuthContext } from "../../../auth/AuthContext";
import { patchMoveMessages } from "../../../api/messages";
import { glanceQueryKey } from "./queryKeys";

interface MoveMutationVariables {
    uniqueIds: number[];
    mailboxPathTarget: string;
    mailboxPathSource: string;
}

interface UseMessageMoveMutationArguments {
    mailboxPath: string;
}

export function useMessageMoveMutation({ mailboxPath }: UseMessageMoveMutationArguments) {
    const { authFetch } = useContext(AuthContext);
    const queryClient = useQueryClient();

    return useMutation<void, Error, MoveMutationVariables, { previousData?: CachedGlanceData }>({
        mutationFn: ({ mailboxPathSource, mailboxPathTarget, uniqueIds }) => patchMoveMessages({ authFetch, mailboxPathSource, mailboxPathTarget, uniqueIds }),

        onMutate: async ({ uniqueIds, mailboxPathSource, mailboxPathTarget }) => {
            // Cancel any queries that have already gone out
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

                            if (mailboxPathTarget === mailboxPathSource) {
                                return item;
                            }

                            return { ...item, mailboxPath: mailboxPathTarget };
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
