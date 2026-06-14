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
 * - body overflow is hidden because the email never scrolls inside the
 *   iframe: the document is zoomed to fit the pane width and the iframe is
 *   sized to full content height, so the outer pane owns all scrolling.
 * - No `* { max-width }` or `table-layout: fixed`: those corrupt fixed-width
 *   table layouts. The email's own widths are left intact and the whole
 *   document is scaled instead.
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
body {
    margin: 0;
    background: #ffffff;
    overflow: hidden;
}
#${EMAIL_ROOT_ID} { box-sizing: content-box; }
.kiwi-email-content { width: 100%; padding: 8px; box-sizing: border-box; }
/* Free-standing photos (e.g. a huge image pasted into a reply) are capped to
 * the pane so they cannot define the document's natural width and shrink the
 * rest of the email. Images inside tables keep their sizes because sliced
 * table layouts in marketing email break when their cells rescale; those
 * emails are handled by the whole-document zoom instead. */
img:not(table *) { max-width: 100%; height: auto; }
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
    const naturalWidthRef = useRef<number>(0);
    const appliedScaleRef = useRef<number>(1);
    const postFitScrollWidthRef = useRef<number>(0);

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
            return buildIframeDocument(`<pre>${DOMPurify.sanitize(data.text)}</pre>`);
        }

        return buildIframeDocument("<pre>Email not found</pre>");
    }, [status, data]);

    /**
     * @brief Fits the email to the pane and grows the iframe to content height.
     *
     * Wide emails are scaled down with CSS zoom (layout-affecting, so heights
     * recompute and text stays crisp, unlike transform: scale) so the message
     * always fits the pane width on any screen. The natural width is measured
     * at zoom 1 and cached; the zoom property is only written when the scale
     * actually changes, because every write resizes the root and would
     * otherwise re-trigger the ResizeObserver in an endless loop.
     */
    const syncIframeSize = useCallback((forceRemeasure: boolean) => {
        const iframe = iframeRef.current;
        const root = iframe?.contentDocument?.getElementById(EMAIL_ROOT_ID);
        if (!iframe || !root) {
            return;
        }

        // Re-measure only when the content genuinely changed since the last
        // fit (e.g. a late image widened the email). Comparing against the
        // recorded post-fit width makes this function idempotent, so the
        // resize events caused by its own zoom writes settle instead of
        // looping forever.
        const contentChangedSinceLastFit = root.scrollWidth !== postFitScrollWidthRef.current;
        if (forceRemeasure || contentChangedSinceLastFit) {
            root.style.zoom = "1";
            appliedScaleRef.current = 1;
            naturalWidthRef.current = root.scrollWidth;
        }

        const availableWidth = iframe.clientWidth;
        const scale = naturalWidthRef.current > availableWidth ? availableWidth / naturalWidthRef.current : 1;
        if (scale !== appliedScaleRef.current) {
            appliedScaleRef.current = scale;
            root.style.zoom = String(scale);
        }
        postFitScrollWidthRef.current = root.scrollWidth;

        const height = root.getBoundingClientRect().height;
        if (Math.abs(height - previousHeightRef.current) < HEIGHT_CHANGE_THRESHOLD_PX) {
            return;
        }
        previousHeightRef.current = height;
        iframe.style.height = `${height}px`;
    }, []);

    // On each document load, fit the email once, then watch two things: the
    // email root (late-loading images change the content size) and the iframe
    // itself (pane resizes and orientation changes change the available
    // width). rAF batches bursts of mutations into one measurement. A content
    // observation re-measures the natural width because an image can widen
    // the email after the first fit.
    const handleIframeLoad = useCallback(() => {
        previousHeightRef.current = 0;
        naturalWidthRef.current = 0;
        postFitScrollWidthRef.current = 0;
        syncIframeSize(true);

        rootObserverRef.current?.disconnect();
        const root = iframeRef.current?.contentDocument?.getElementById(EMAIL_ROOT_ID);
        if (root) {
            const observer = new ResizeObserver(() => requestAnimationFrame(() => syncIframeSize(false)));
            observer.observe(root);
            rootObserverRef.current = observer;
        }
    }, [syncIframeSize]);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) {
            return;
        }
        const paneObserver = new ResizeObserver(() => requestAnimationFrame(() => syncIframeSize(false)));
        paneObserver.observe(iframe);
        return () => {
            paneObserver.disconnect();
            rootObserverRef.current?.disconnect();
        };
    }, [syncIframeSize]);

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
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                className="w-full border-none block"
            />
        </div>
    );
}
