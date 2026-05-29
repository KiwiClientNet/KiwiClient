/**
 * @brief Centralises React Query keys for the glance and email cache.
 */

export const glanceQueryKey = (mailboxPath: string) => ["emails", mailboxPath] as const;
export const emailQueryKey = (mailboxPath: string, uniqueId: number) => ["email", mailboxPath, uniqueId] as const;
