/**
 * @brief Picks a heroicon for a mailbox based on its display name.
 *
 * Folder semantics are determined by name match rather than IMAP special-use
 * flags because Gmail surfaces those as separate trees and many private
 * servers omit them entirely. The match is case-insensitive and uses
 * substring matching so localised names still pick up the intended icon
 * if they contain the English keyword.
 */

import {
    ArchiveBoxIcon,
    DocumentTextIcon,
    FolderIcon,
    InboxIcon,
    PaperAirplaneIcon,
    ShieldExclamationIcon,
    StarIcon,
    TrashIcon
} from "@heroicons/react/24/outline";

const ICON_SIZE_CLASS = "size-5";

/**
 * @brief Returns the icon element matching the mailbox name.
 *
 * @param mailboxName - The display name of the mailbox, in any case.
 * @returns A JSX icon element ready to render.
 */
export function getMailboxIcon(mailboxName: string): React.JSX.Element {
    const lowerCasedName = mailboxName.toLowerCase();

    if (lowerCasedName.includes("inbox")) {
        return <InboxIcon className={ICON_SIZE_CLASS} />;
    }
    if (lowerCasedName.includes("drafts")) {
        return <DocumentTextIcon className={ICON_SIZE_CLASS} />;
    }
    if (lowerCasedName.includes("sent")) {
        return <PaperAirplaneIcon className={ICON_SIZE_CLASS} />;
    }
    if (lowerCasedName.includes("archive")) {
        return <ArchiveBoxIcon className={ICON_SIZE_CLASS} />;
    }
    if (lowerCasedName.includes("trash") || lowerCasedName.includes("bin") || lowerCasedName.includes("rubbish")) {
        return <TrashIcon className={ICON_SIZE_CLASS} />;
    }
    if (lowerCasedName.includes("starred")) {
        return <StarIcon className={ICON_SIZE_CLASS} />;
    }
    if (lowerCasedName.includes("spam") || lowerCasedName.includes("junk")) {
        return <ShieldExclamationIcon className={ICON_SIZE_CLASS} />;
    }

    return <FolderIcon className={ICON_SIZE_CLASS} />;
}
