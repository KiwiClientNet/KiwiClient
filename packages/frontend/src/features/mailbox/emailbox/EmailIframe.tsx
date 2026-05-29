/**
 * @brief Renders a single email body in an isolated iframe.
 *
 * Email HTML is hostile to the surrounding page; using an iframe with a
 * sandbox attribute lets foreign markup render without leaking styles into
 * the app shell or executing scripts. The body is also passed through
 * DOMPurify before being assigned to the iframe document.
 */

import { useContext, useMemo } from "react";
import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "../../../auth/AuthContext";
import { fetchSingleMessage } from "../../../api/messages";
import { emailQueryKey } from "../glance/queryKeys";
import { EmailLoading } from "./EmailLoading";

interface SelectedEmailReference {
    uniqueId: number;
    mailboxPath: string;
}

/**
 * @brief Wraps body content in a minimal HTML document for the iframe srcDoc.
 *
 * Targeting external links to a new tab is done with a base tag so the
 * sandboxed page does not need to set rel attributes on every anchor.
 */
function buildIframeDocument(bodyContent: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<base target="_blank">
<meta charset="utf-8" />
<style>
html { height: 100%; overflow: hidden; }
body { margin: 0; padding: 8px; height: 100%; overflow-y: auto; overflow-x: hidden; box-sizing: border-box; scrollbar-width: thin; scrollbar-color: rgba(100, 100, 100, 0.3) transparent; word-wrap: break-word; }
body::-webkit-scrollbar { width: 6px; }
body::-webkit-scrollbar-thumb { background-color: rgba(100, 100, 100, 0.25); border-radius: 9999px; }
body::-webkit-scrollbar-track { background: transparent; }
img, video { max-width: 100% !important; height: auto !important; }
table { max-width: 100% !important; table-layout: fixed !important; }
td, th { word-break: break-word; overflow-wrap: anywhere; }
pre, code { white-space: pre-wrap; word-break: break-word; }
* { max-width: 100% !important; box-sizing: border-box; }
</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

export function EmailIframe({ selected }: { selected: SelectedEmailReference }) {
    const { authFetch } = useContext(AuthContext);

    const { data, status, isLoading } = useQuery({
        queryKey: emailQueryKey(selected.mailboxPath, selected.uniqueId),
        queryFn: () => fetchSingleMessage({
            authFetch,
            mailboxPath: selected.mailboxPath,
            uniqueId: selected.uniqueId
        }),
        staleTime: 1000 * 60 * 5
    });

    const iframeDocument = useMemo(() => {
        if (status === "pending") {
            return buildIframeDocument("");
        }
        if (status === "error") {
            return buildIframeDocument("<pre>Failed to load email.</pre>");
        }

        if (data?.html) {
            return buildIframeDocument(DOMPurify.sanitize(data.html));
        }
        if (data?.text) {
            return buildIframeDocument(`<pre>${data.text}</pre>`);
        }
        return buildIframeDocument("<pre>Email not found</pre>");
    }, [status, data]);

    return (
        <div className="h-full w-full relative rounded-3xl overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 z-10">
                    <EmailLoading />
                </div>
            )}
            <iframe
                title="Email Content"
                srcDoc={iframeDocument}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                className="w-full h-full border-none"
            />
        </div>
    );
}
