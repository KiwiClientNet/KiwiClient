/**
 * @brief Shared types used by multiple mailbox feature components.
 *
 * Lifted out of the page component to break the import cycle that arises
 * when Sidebar, Glance, and MailboxPage all need to refer to the same
 * selection shape.
 */

import type { GlancePage } from "@KiwiClient/shared";

export interface MailboxSelection {
    name: string;
    path: string;
}

export interface CachedGlanceData {
    pages: GlancePage[];
    pageParams: unknown[];
}
