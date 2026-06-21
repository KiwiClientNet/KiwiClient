import { TextStyleKit } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import MenuBar from './MenuBar'
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

function messageToPrepend(previousEmailGlance: EmailMessage, type: NewEmailComposeType): string {
    let preface = '';
    const dateObj = new Date(previousEmailGlance.dateIso);
    const day = dateObj.toLocaleDateString(undefined, { weekday: "long" });
    const date = dateObj.toLocaleDateString(); // local locale date format
    const time24 = dateObj.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    switch (type) {
        case 'new':
            break;
        case 'reply':
        case 'reply_all':
            preface = `On ${day}, ${date} at ${time24}, ${previousEmailGlance.from.name ?? ""} &lt;${previousEmailGlance.from.address}&gt; wrote:`;
            break;
        case 'forward':
            preface = `
------- Forwarded Message -------<br><br>
From: ${previousEmailGlance.from.name ?? ""} &lt;${previousEmailGlance.from.address}&gt;<br>
Date: On ${day}, ${date} at ${time24};<br>
Subject: ${previousEmailGlance.subject};<br>
To: ${previousEmailGlance.to.map(recipient => `${recipient.name ?? ""} &lt;${recipient.address}&gt`).join(", ")};<br>
CC: ${previousEmailGlance.cc.map(recipient => `${recipient.name ?? ""} &lt;${recipient.address}&gt`).join(", ")}<br>
`
            break;
    }

    return preface;

}

export interface EmailEditorHandle {
    getHtml: () => string;
    clearEditor: () => void;
    setEditor: (previousEmailGlance: EmailMessage, type: NewEmailComposeType) => void;
}

// const INITIAL_MSG = `\n\nSent using <a target="_blank" rel="noopener noreferrer nofollow" href="https://kiwiclient.net">KiwiClient</a>.`

const EmailEditor = forwardRef<EmailEditorHandle>((_props, ref) => {
    const editor = useEditor({
        extensions,
        // content: INITIAL_MSG,
        parseOptions: {
            preserveWhitespace: 'full',
        }
    });

    useImperativeHandle(ref, () => ({
        getHtml: () => editor?.getHTML() ?? '',
        clearEditor: () => {
            // editor.commands.setContent(INITIAL_MSG);
            editor.commands.clearContent();
        },

        setEditor: (previousEmailGlance, type) => {
            // Clear the content
            editor.commands.clearContent();
            const preface = messageToPrepend(previousEmailGlance, type);
            editor.commands.setContent(preface);
        }
    }), [editor]);

    return (
        <div className="flex flex-1 flex-col gap-2 min-h-0 overflow-y-clip">
            <MenuBar editor={editor} />
            <EditorContent
                editor={editor}
                className={
                    'flex-1 min-h-40 rounded-md border border-kiwi-light-grey ' +
                    'bg-kiwi-white p-3 text-sm leading-relaxed text-kiwi-black ' +
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
        </div>
    )

})

export default EmailEditor;
