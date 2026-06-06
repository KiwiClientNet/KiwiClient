/**
 * @brief Renders a single email body in an isolated iframe.
 *
 * Email HTML is hostile to the surrounding page; using an iframe with a
 * sandbox attribute lets foreign markup render without leaking styles into
 * the app shell or executing scripts. The body is also passed through
 * DOMPurify before being assigned to the iframe document.
 */

import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
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

// The element whose scrollHeight drives the iframe height. Kept as an id so the
// parent can find it inside the iframe document after each load.
const EMAIL_ROOT_ID = "kiwi-email-root";

// Height changes smaller than this are ignored to stop sub-pixel reflow churn
// from looping the ResizeObserver.
const HEIGHT_CHANGE_THRESHOLD_PX = 8;

/**
 * @brief Wraps body content in a minimal HTML document for the iframe srcDoc.
 *
 * - The base tag sends external links to a new tab without rel attributes.
 * - body { overflow: auto hidden } gives horizontal scroll only; the iframe is
 *   sized to full content height so there is never vertical scroll inside it.
 * - The content wrapper reserves padding-bottom so the horizontal scrollbar
 *   never sits on top of the last line.
 * - No `* { max-width }` or `table-layout: fixed`: those corrupt fixed-width
 *   table layouts. The email's own widths are left intact.
 */
function buildIframeDocument(bodyContent: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<base target="_blank">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<style>
html { margin: 0; }
html, body { scrollbar-width: thin; scrollbar-color: rgba(0, 0, 0, 0.28) transparent; }
body {
    margin: 0;
    background: #ffffff;
    overflow: auto hidden;
}
/* Universal so it styles whichever element owns the scroll (the root, not
 * always body), matching the outer pane's vertical scrollbar width. */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.25); border-radius: 9999px; }
::-webkit-scrollbar-track { background: transparent; }
#${EMAIL_ROOT_ID} { box-sizing: content-box; }
.kiwi-email-content { width: 100%; padding: 8px; padding-bottom: 18px; box-sizing: border-box; }
img { max-width: none; }
table { table-layout: auto; }
pre { white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
<div id="${EMAIL_ROOT_ID}">
<div class="kiwi-email-content">
${bodyContent}
</div>
</div>
</body>
</html>`;
}

export function EmailIframe({ selected }: { selected: SelectedEmailReference }) {
    const { authFetch } = useContext(AuthContext);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const rootObserverRef = useRef<ResizeObserver | null>(null);
    const previousHeightRef = useRef<number>(0);

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

    // Grow the iframe to its content's height so the outer pane owns vertical
    // scroll and the email is never clipped. Horizontal scroll stays inside the
    // iframe (scrolling="yes"). The threshold guards against reflow churn.
    const syncIframeHeight = useCallback(() => {
        const iframe = iframeRef.current;
        const root = iframe?.contentDocument?.getElementById(EMAIL_ROOT_ID);
        if (!iframe || !root) {
            return;
        }
        const height = root.scrollHeight;
        if (Math.abs(height - previousHeightRef.current) < HEIGHT_CHANGE_THRESHOLD_PX) {
            return;
        }
        previousHeightRef.current = height;
        iframe.style.height = `${height}px`;
    }, []);

    // On each document load, size the iframe once and then watch the email root
    // so late-loading images and width-driven reflows (pane resize) keep the
    // height in sync. rAF batches bursts of mutations into one measurement.
    const handleIframeLoad = useCallback(() => {
        previousHeightRef.current = 0;
        syncIframeHeight();

        rootObserverRef.current?.disconnect();
        const root = iframeRef.current?.contentDocument?.getElementById(EMAIL_ROOT_ID);
        if (root) {
            const observer = new ResizeObserver(() => requestAnimationFrame(syncIframeHeight));
            observer.observe(root);
            rootObserverRef.current = observer;
        }
    }, [syncIframeHeight]);

    useEffect(() => {
        return () => rootObserverRef.current?.disconnect();
    }, []);

    return (
        <div className="h-full w-full relative rounded bg-kiwi-white overflow-y-auto overflow-x-hidden kiwi-scrollbar-on-light">
            {isLoading && (
                <div className="absolute inset-0 z-10">
                    <EmailLoading />
                </div>
            )}
            <iframe
                ref={iframeRef}
                title="Email Content"
                srcDoc={iframeDocument}
                onLoad={handleIframeLoad}
                scrolling="yes"
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                className="w-full border-none block"
            />
        </div>
    );
}
