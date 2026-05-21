/**
 * @brief Centralises React Query keys for the glance feature.
 *
 * Defining keys in one place keeps the container component, the mutation
 * hook, and any future invalidation calls in sync; a typo in any single
 * location would otherwise silently fail to invalidate the cache.
 */

export const glanceQueryKey = (mailboxPath: string) => ["emails", mailboxPath] as const;
