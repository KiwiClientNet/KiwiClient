import { TextStyleKit } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import Emoji from '@tiptap/extension-emoji'
import MenuBar from './MenuBar'

// See https://tiptap.dev/docs/editor/extensions/marks/link for link information
const extensions = [TextStyleKit, StarterKit, Emoji, Link.configure({
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
}),]

export default function EmailEditor() {
    const editor = useEditor({
        extensions,
        content: `\n\nSent using <a target="_blank" rel="noopener noreferrer nofollow" href="https://kiwiclient.net">KiwiClient</a>.`,
        parseOptions: {
            preserveWhitespace: 'full',
        },
    })

    return (
        <div className="flex flex-1 flex-col gap-2 min-h-0">
            <EditorContent
                editor={editor}
                className={
                    'flex-1 min-h-40 rounded-md border border-kiwi-light-grey ' +
                    'bg-kiwi-white p-3 text-sm leading-relaxed text-kiwi-black ' +
                    'overflow-y-auto kiwi-scrollbar ' +
                    'focus-within:border-kiwi-dark-grey ' +
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
}
