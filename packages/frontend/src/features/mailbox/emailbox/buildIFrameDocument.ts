// The element whose scrollHeight drives the iframe height. Kept as an id so the
// parent can find it inside the iframe document after each load.
export const EMAIL_ROOT_ID = "kiwi-email-root";

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
export default function buildIframeDocument(bodyContent: string): string {
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

