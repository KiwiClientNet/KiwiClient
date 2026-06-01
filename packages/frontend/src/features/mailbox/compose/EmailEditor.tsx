import { TextStyleKit } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import MenuBar from './MenuBar'

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
}),]

export default function EmailEditor() {
    const editor = useEditor({
        extensions,
        content: `\n\nSent using KiwiClient.`,
        parseOptions: {
            preserveWhitespace: 'full',
        },
    })

    return (
        <>
            <MenuBar editor={editor} />
            <EditorContent className='p-2' editor={editor} />
        </>
    )
}
