import { TextStyleKit } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import MenuBar from './MenuBar'
import DOMPurify from "dompurify";
import { forwardRef, useImperativeHandle } from 'react'
import type { EmailMessage } from '@KiwiClient/shared'
import type { NewEmailComposeType } from './ComposeBox'

// See https://tiptap.dev/docs/editor/extensions/marks/link for link information
const extensions = [TextStyleKit, StarterKit, Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: 'https',
    protocols: ['http', 'https'],
    isAllowedUri: (url, ctx) => {
        try {
            // Construct URL
            const parsedUrl = url.includes(':') ? new URL(url) : new URL(`${ctx.defaultProtocol}://${url}`)

            // Use default validation
            if (!ctx.defaultValidate(parsedUrl.href)) {
                return false
            }

            // Disallowed protocols
            const disallowedProtocols = ['ftp', 'file']
            const protocol = parsedUrl.protocol.replace(':', '')

            if (disallowedProtocols.includes(protocol)) {
                return false
            }

            // Only allow protocols specified in ctx.protocols
            const allowedProtocols = ctx.protocols.map(p => (typeof p === 'string' ? p : p.scheme))

            if (!allowedProtocols.includes(protocol)) {
                return false
            }

            // Disallowed domains
            const disallowedDomains = [""]
            const domain = parsedUrl.hostname

            if (disallowedDomains.includes(domain)) {
                return false
            }

            // all checks have passed
            return true
        } catch {
            return false
        }
    },
    shouldAutoLink: url => {
        try {
            // construct URL
            const parsedUrl = url.includes(':') ? new URL(url) : new URL(`https://${url}`)

            // Only autolink if the domain is not in the disallowed list
            const disallowedDomains = [""]
            const domain = parsedUrl.hostname

            return !disallowedDomains.includes(domain)
        } catch {
            return false
        }
    },
})]

function formatRecipients(recipients: EmailMessage["to"]): string {
    return recipients.map(recipient => `${recipient.name ?? ""} &lt;${recipient.address}&gt;`).join(", ");
}

function messageToPrepend(previousEmail: EmailMessage, type: NewEmailComposeType): string {
    const dateObj = new Date(previousEmail.dateIso);
    const day = dateObj.toLocaleDateString(undefined, { weekday: "long" });
    const date = dateObj.toLocaleDateString(); // local locale date format
    const time24 = dateObj.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    const sender = `${previousEmail.from.name ?? ""} &lt;${previousEmail.from.address}&gt;`;

    switch (type) {
        case 'new':
            return '';
        case 'reply':
        case 'reply_all':
            return `<p>On ${day}, ${date} at ${time24}, ${sender} wrote:</p>`;
        case 'forward':
            const ccLine = previousEmail.cc.length > 0 ? `CC: ${formatRecipients(previousEmail.cc)}</p>` : '';
            return `<p>------- Forwarded Message -------<br><br>` +
                `From: ${sender}<br>` +
                `Date: ${day}, ${date} at ${time24}<br>` +
                `Subject: ${previousEmail.subject}<br>` +
                `To: ${formatRecipients(previousEmail.to)}<br>` +
                ccLine
    }
}

export interface EmailEditorHandle {
    getHtml: () => string;
    getText: () => string;
    clearEditor: () => void;
    setEditor: (previousEmail: EmailMessage, type: NewEmailComposeType) => void;
    focusInput: () => void;
}

const EmailEditor = forwardRef<EmailEditorHandle>((_props, ref) => {

    const editor = useEditor({
        extensions,
        parseOptions: {
            preserveWhitespace: 'full',
        }
    });

    useImperativeHandle(ref, () => ({
        getHtml: () => editor?.getHTML() ?? '',
        getText: () => editor?.getText() ?? '',
        clearEditor: () => {
            editor.commands.clearContent();
        },

        setEditor: (previousEmail, type) => {
            editor.commands.clearContent(); // Clear the content
            let message = `${DOMPurify.sanitize(previousEmail.html ?? previousEmail.text ?? "")}`;

            if (type === "reply" || type === "reply_all") {
                message = `<blockquote>${message}</blockquote>`
            }

            if (type !== "new") {
                const preface = messageToPrepend(previousEmail, type);
                message = `<br>${preface}${message}`
            }
            editor.commands.setContent(message);
        },

        focusInput: () => { editor.commands.focus('start') }
    }), [editor]);

    return (
        <div className="flex flex-1 flex-col gap-2 min-h-0">
            <EditorContent
                editor={editor}
                className={
                    'flex-1 min-h-0 md:min-h-40 rounded-md border border-kiwi-light-grey ' +
                    'bg-kiwi-white p-3 text-base md:text-sm leading-relaxed text-kiwi-black ' +
                    'overflow-y-auto kiwi-scrollbar ' +
                    'focus-within:border-kiwi-green ' +
                    '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full ' +
                    '[&_.ProseMirror_a]:text-kiwi-info ' +
                    '[&_.ProseMirror_a]:underline ' +
                    '[&_.ProseMirror_a]:underline-offset-2 ' +
                    '[&_.ProseMirror_a]:decoration-kiwi-info/40 ' +
                    '[&_.ProseMirror_a]:cursor-pointer ' +
                    '[&_.ProseMirror_a]:transition-colors ' +
                    'hover:[&_.ProseMirror_a]:text-kiwi-info/80 ' +
                    'hover:[&_.ProseMirror_a]:decoration-kiwi-info'
                }
            />
            <MenuBar editor={editor} />
        </div>
    )

})

export default EmailEditor;
