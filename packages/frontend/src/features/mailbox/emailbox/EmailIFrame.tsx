/**
 * @brief Renders a single email body in an isolated iframe.
 *
 * Email HTML is hostile to the surrounding page; using an iframe with a
 * sandbox attribute lets foreign markup render without leaking styles into
 * the app shell or executing scripts. The body is also passed through
 * DOMPurify before being assigned to the iframe document.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import DOMPurify from "dompurify";
import type { EmailMessage } from "@KiwiClient/shared";
import buildIframeDocument, { EMAIL_ROOT_ID } from "./buildIFrameDocument";

// Height changes smaller than this are ignored to stop sub-pixel reflow churn
// from looping the ResizeObserver.
const HEIGHT_CHANGE_THRESHOLD_PX = 8;


interface EmailIFrameProps {
    status: "error" | "success" | "pending";
    data: EmailMessage
}

export function EmailIFrame({ status, data }: EmailIFrameProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const rootObserverRef = useRef<ResizeObserver | null>(null);
    const previousHeightRef = useRef<number>(0);
    const naturalWidthRef = useRef<number>(0);
    const appliedScaleRef = useRef<number>(1);
    const postFitScrollWidthRef = useRef<number>(0);

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
        <div className="h-full w-full relative rounded bg-kiwi-white overflow-y-auto overflow-x-hidden kiwi-scrollbar-on-light" >
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
