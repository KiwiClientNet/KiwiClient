import type { EmailContent } from "@KiwiClient/shared";

type DraftFingerprintSource = Pick<EmailContent, "to" | "cc" | "bcc" | "subject" | "html" | "text">;

export function draftFingerprint(draft: DraftFingerprintSource): string {
    return JSON.stringify({
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        html: draft.html ?? "",
        text: draft.text ?? "",
    });
}
