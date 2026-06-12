import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import type { EditorStateSnapshot } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import {
    ArrowUturnDownIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    BackspaceIcon,
    BoldIcon,
    ChatBubbleBottomCenterTextIcon,
    CodeBracketIcon,
    CodeBracketSquareIcon,
    FaceSmileIcon,
    ItalicIcon,
    LinkIcon,
    LinkSlashIcon,
    ListBulletIcon,
    MinusIcon,
    NumberedListIcon,
    StrikethroughIcon,
} from '@heroicons/react/24/outline';

/**
 * State selector for the MenuBar component.
 * Extracts the relevant editor state for rendering menu buttons.
 */
function menuBarStateSelector(ctx: EditorStateSnapshot<Editor>) {
    return {
        // Text formatting
        isBold: ctx.editor.isActive('bold') ?? false,
        canBold: ctx.editor.can().chain().toggleBold().run() ?? false,
        isItalic: ctx.editor.isActive('italic') ?? false,
        canItalic: ctx.editor.can().chain().toggleItalic().run() ?? false,
        isStrike: ctx.editor.isActive('strike') ?? false,
        canStrike: ctx.editor.can().chain().toggleStrike().run() ?? false,
        isCode: ctx.editor.isActive('code') ?? false,
        canCode: ctx.editor.can().chain().toggleCode().run() ?? false,
        canClearMarks: ctx.editor.can().chain().unsetAllMarks().run() ?? false,

        // Block types
        isParagraph: ctx.editor.isActive('paragraph') ?? false,
        isHeading1: ctx.editor.isActive('heading', { level: 1 }) ?? false,
        isHeading2: ctx.editor.isActive('heading', { level: 2 }) ?? false,
        isHeading3: ctx.editor.isActive('heading', { level: 3 }) ?? false,
        isHeading4: ctx.editor.isActive('heading', { level: 4 }) ?? false,
        isHeading5: ctx.editor.isActive('heading', { level: 5 }) ?? false,
        isHeading6: ctx.editor.isActive('heading', { level: 6 }) ?? false,

        // Lists and blocks
        isBulletList: ctx.editor.isActive('bulletList') ?? false,
        isOrderedList: ctx.editor.isActive('orderedList') ?? false,
        isCodeBlock: ctx.editor.isActive('codeBlock') ?? false,
        isBlockquote: ctx.editor.isActive('blockquote') ?? false,

        isLink: ctx.editor.isActive('link'),

        // Font
        currentFontFamily: (ctx.editor.getAttributes('textStyle').fontFamily as string | undefined) ?? '',

        // History
        canUndo: ctx.editor.can().chain().undo().run() ?? false,
        canRedo: ctx.editor.can().chain().redo().run() ?? false,

    }
}

/**
 * System-font stacks chosen to render in every email client.
 * Email recipients see fallbacks if the first font is missing —
 * each stack ends in a generic family (sans-serif/serif/monospace)
 * so something always renders.
 */
const FONT_STACKS = [
    { key: 'default', label: 'Default', stack: '' },
    {
        key: 'sans',
        label: 'Sans',
        stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    {
        key: 'serif',
        label: 'Serif',
        stack: 'Georgia, "Times New Roman", Times, serif',
    },
    {
        key: 'mono',
        label: 'Mono',
        stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    },
    {
        key: 'rounded',
        label: 'Rounded',
        stack: '"SF Pro Rounded", "Nunito", system-ui, sans-serif',
    },
    {
        key: 'slab',
        label: 'Slab',
        stack: '"Roboto Slab", "Rockwell", Georgia, serif',
    },
] as const;

type FontKey = (typeof FONT_STACKS)[number]['key'];

interface FontPickerProps {
    value: string;
    onChange: (stack: string) => void;
}

function FontPicker({ value, onChange }: FontPickerProps) {
    const currentKey: FontKey =
        FONT_STACKS.find(font => font.stack === value)?.key ?? 'default';

    return (
        <select
            value={currentKey}
            onChange={event => {
                const next = FONT_STACKS.find(font => font.key === event.target.value);
                if (next) onChange(next.stack);
            }}
            title="Font family"
            aria-label="Font family"
            className={
                'h-8 rounded-md border border-kiwi-light-grey bg-kiwi-white px-2 ' +
                'text-xs font-medium text-kiwi-dark-black ' +
                'transition-colors duration-150 ' +
                'hover:bg-kiwi-light-grey/40 ' +
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kiwi-green/60'
            }
            style={{ fontFamily: value || undefined }}
        >
            {FONT_STACKS.map(font => (
                <option
                    key={font.key}
                    value={font.key}
                    style={{ fontFamily: font.stack || undefined }}
                >
                    {font.label}
                </option>
            ))}
        </select>
    );
}

/**
 * Curated common emojis. Each `shortcode` must exist in the default
 * `@tiptap/extension-emoji` data set — `setEmoji(shortcode)` no-ops on
 * unknown shortcodes. Body input rules (typing `:smile:`) also work
 * without this picker; this is just for quick discovery.
 */
const QUICK_EMOJIS: ReadonlyArray<{ shortcode: string; glyph: string; label: string }> = [
    { shortcode: 'smile', glyph: '😄', label: 'Smile' },
    { shortcode: 'grin', glyph: '😁', label: 'Grin' },
    { shortcode: 'joy', glyph: '😂', label: 'Joy' },
    { shortcode: 'wink', glyph: '😉', label: 'Wink' },
    { shortcode: 'blush', glyph: '😊', label: 'Blush' },
    { shortcode: 'heart_eyes', glyph: '😍', label: 'Heart eyes' },
    { shortcode: 'thinking', glyph: '🤔', label: 'Thinking' },
    { shortcode: 'sob', glyph: '😭', label: 'Sob' },
    { shortcode: 'heart', glyph: '❤️', label: 'Heart' },
    { shortcode: 'fire', glyph: '🔥', label: 'Fire' },
    { shortcode: 'sparkles', glyph: '✨', label: 'Sparkles' },
    { shortcode: 'tada', glyph: '🎉', label: 'Tada' },
    { shortcode: 'rocket', glyph: '🚀', label: 'Rocket' },
    { shortcode: 'eyes', glyph: '👀', label: 'Eyes' },
    { shortcode: '+1', glyph: '👍', label: 'Thumbs up' },
    { shortcode: '-1', glyph: '👎', label: 'Thumbs down' },
    { shortcode: 'pray', glyph: '🙏', label: 'Pray' },
    { shortcode: 'clap', glyph: '👏', label: 'Clap' },
    { shortcode: 'ok_hand', glyph: '👌', label: 'OK hand' },
    { shortcode: 'wave', glyph: '👋', label: 'Wave' },
    { shortcode: 'muscle', glyph: '💪', label: 'Muscle' },
    { shortcode: 'brain', glyph: '🧠', label: 'Brain' },
    { shortcode: 'check', glyph: '✅', label: 'Check' },
    { shortcode: 'x', glyph: '❌', label: 'Cross' },
];

interface EmojiPickerProps {
    onPick: (shortcode: string) => void;
}

function EmojiPicker({ onPick }: EmojiPickerProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleOutside(event: MouseEvent) {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(previous => !previous)}
                title="Insert emoji"
                aria-label="Insert emoji"
                aria-haspopup="dialog"
                aria-expanded={open}
                className={`${toolButtonBase} ${open ? toolButtonActive : ''}`}
            >
                <FaceSmileIcon className="size-4" aria-hidden="true" />
            </button>
            {open ? (
                <div
                    role="dialog"
                    aria-label="Emoji picker"
                    className={
                        'absolute left-0 bottom-full z-20 mb-1.5 w-72 ' +
                        'grid grid-cols-6 gap-1.5 ' +
                        'rounded-lg border border-kiwi-light-grey bg-kiwi-white p-2.5 ' +
                        'shadow-lg'
                    }
                >
                    {QUICK_EMOJIS.map(item => (
                        <button
                            key={item.shortcode}
                            type="button"
                            onClick={() => {
                                onPick(item.shortcode);
                                setOpen(false);
                            }}
                            title={item.label}
                            aria-label={item.label}
                            className={
                                'flex size-9 items-center justify-center rounded-md ' +
                                'text-xl leading-none ' +
                                'transition-colors duration-100 ' +
                                'hover:bg-kiwi-light-grey/60 ' +
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kiwi-green/60'
                            }
                        >
                            {item.glyph}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

interface MenuBarProps {
    editor: Editor | null;
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;

interface ToolButtonProps {
    onClick: () => void;
    label: string;
    isActive?: boolean;
    disabled?: boolean;
    icon?: IconComponent;
    children?: ReactNode;
}

const toolButtonBase =
    'flex items-center justify-center h-8 min-w-8 px-1.5 rounded-md text-kiwi-dark-black ' +
    'transition-colors duration-150 ' +
    'hover:bg-kiwi-light-grey/70 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kiwi-green/60 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent';

const toolButtonActive = 'bg-kiwi-green/25 text-kiwi-black';

function ToolButton({ onClick, label, isActive, disabled, icon: Icon, children }: ToolButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            className={`${toolButtonBase} ${isActive ? toolButtonActive : ''}`}
        >
            {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
            {children ? <span className="text-xs font-semibold leading-none">{children}</span> : null}
        </button>
    );
}

function ToolGroup({ children }: { children: ReactNode }) {
    return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolDivider() {
    return <div aria-hidden="true" className="mx-1 h-5 w-px self-center bg-kiwi-middle-grey/40" />;
}

export default function MenuBar({ editor }: MenuBarProps) {
    const editorState = useEditorState({
        editor,
        selector: menuBarStateSelector,
    })

    const setLink = useCallback(() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        // Cancelled
        if (url === null) {
            return
        }

        // Empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()

            return
        }

        // Update link
        try {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        } catch (error: any) {
            alert(error.message)
        }
    }, [editor])

    if (!editor || !editorState) {
        return null
    }

    return (
        <div
            role="toolbar"
            aria-label="Email formatting toolbar"
            className={
                'flex flex-wrap items-center gap-x-0.5 gap-y-1 ' +
                'rounded-md border border-kiwi-light-grey bg-kiwi-light-grey/30 ' +
                'p-1.5'
            }
        >

            <ToolGroup>
                <FontPicker
                    value={editorState.currentFontFamily}
                    onChange={stack => {
                        if (stack) {
                            editor.chain().focus().setFontFamily(stack).run();
                        } else {
                            editor.chain().focus().unsetFontFamily().run();
                        }
                    }}
                />
                <EmojiPicker
                    onPick={shortcode => {
                        editor.chain().focus().setEmoji(shortcode).run();
                    }}
                />
            </ToolGroup>

            <ToolDivider />

            <ToolGroup>
                <ToolButton
                    label="Bold"
                    icon={BoldIcon}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editorState.canBold}
                    isActive={editorState.isBold}
                />
                <ToolButton
                    label="Italic"
                    icon={ItalicIcon}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editorState.canItalic}
                    isActive={editorState.isItalic}
                />
                <ToolButton
                    label="Strikethrough"
                    icon={StrikethroughIcon}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editorState.canStrike}
                    isActive={editorState.isStrike}
                />
                <ToolButton
                    label="Inline code"
                    icon={CodeBracketIcon}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    disabled={!editorState.canCode}
                    isActive={editorState.isCode}
                />
                <ToolButton
                    label="Clear formatting"
                    icon={BackspaceIcon}
                    onClick={() => editor.chain().focus().unsetAllMarks().run()}
                />
                <ToolButton
                    label="Reset block to paragraph"
                    onClick={() => editor.chain().focus().clearNodes().run()}
                >
                    ¶✕
                </ToolButton>
            </ToolGroup>

            <ToolDivider />

            <ToolGroup>
                <ToolButton
                    label="Paragraph"
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    isActive={editorState.isParagraph}
                >
                    ¶
                </ToolButton>
                <ToolButton
                    label="Heading 1"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editorState.isHeading1}
                >
                    H1
                </ToolButton>
                <ToolButton
                    label="Heading 2"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editorState.isHeading2}
                >
                    H2
                </ToolButton>
                <ToolButton
                    label="Heading 3"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editorState.isHeading3}
                >
                    H3
                </ToolButton>
                <ToolButton
                    label="Heading 4"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                    isActive={editorState.isHeading4}
                >
                    H4
                </ToolButton>
                <ToolButton
                    label="Heading 5"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
                    isActive={editorState.isHeading5}
                >
                    H5
                </ToolButton>
                <ToolButton
                    label="Heading 6"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
                    isActive={editorState.isHeading6}
                >
                    H6
                </ToolButton>
            </ToolGroup>

            <ToolDivider />

            <ToolGroup>
                <ToolButton
                    label="Bullet list"
                    icon={ListBulletIcon}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editorState.isBulletList}
                />
                <ToolButton
                    label="Ordered list"
                    icon={NumberedListIcon}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editorState.isOrderedList}
                />
                <ToolButton
                    label="Code block"
                    icon={CodeBracketSquareIcon}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editorState.isCodeBlock}
                />
                <ToolButton
                    label="Blockquote"
                    icon={ChatBubbleBottomCenterTextIcon}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editorState.isBlockquote}
                />
                <ToolButton
                    label="Horizontal rule"
                    icon={MinusIcon}
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                />
                <ToolButton
                    label="Hard break"
                    icon={ArrowUturnDownIcon}
                    onClick={() => editor.chain().focus().setHardBreak().run()}
                />
            </ToolGroup>

            <ToolDivider />

            <ToolGroup>
                <ToolButton
                    label="Set link"
                    icon={LinkIcon}
                    onClick={setLink}
                    isActive={editorState.isLink}
                />
                <ToolButton
                    label="Remove link"
                    icon={LinkSlashIcon}
                    onClick={() => editor.chain().focus().unsetLink().run()}
                    disabled={!editorState.isLink}
                />
            </ToolGroup>

            <ToolDivider />

            <ToolGroup>
                <ToolButton
                    label="Undo"
                    icon={ArrowUturnLeftIcon}
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editorState.canUndo}
                />
                <ToolButton
                    label="Redo"
                    icon={ArrowUturnRightIcon}
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editorState.canRedo}
                />
            </ToolGroup>
        </div>
    )
}
