import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import type { EditorStateSnapshot } from '@tiptap/react'
import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
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
 * The block types the editor can switch between via the style picker.
 * `paragraph` is normal body text; `h1`–`h6` are heading levels.
 */
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
type HeadingLevel = (typeof HEADING_LEVELS)[number];
type BlockType = 'paragraph' | `h${HeadingLevel}`;

/**
 * Collapse the editor's active block into a single value for the picker.
 * Only one block type can be active at the caret, so we return the first
 * heading match or fall back to paragraph.
 */
function activeBlockType(editor: Editor): BlockType {
    for (const level of HEADING_LEVELS) {
        if (editor.isActive('heading', { level })) {
            return `h${level}`;
        }
    }
    return 'paragraph';
}

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

        // Active block type, collapsed to one value for the style picker
        blockType: activeBlockType(ctx.editor),

        // Lists and blocks
        isBulletList: ctx.editor.isActive('bulletList') ?? false,
        isOrderedList: ctx.editor.isActive('orderedList') ?? false,
        isCodeBlock: ctx.editor.isActive('codeBlock') ?? false,
        isBlockquote: ctx.editor.isActive('blockquote') ?? false,

        isLink: ctx.editor.isActive('link'),

        // Font
        currentFontFamily: (ctx.editor.getAttributes('textStyle').fontFamily as string | undefined) ?? '',
        currentFontSize: (ctx.editor.getAttributes('textStyle').fontSize as string | undefined) ?? '',

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
    { key: 'default', label: 'Font', stack: '' },
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

/**
 * Labels for the block-style picker. `h4`–`h6` are kept distinct rather
 * than collapsed: the editor stylesheet renders each at its own size so
 * every level produces visibly different output.
 */
const BLOCK_OPTIONS: ReadonlyArray<{ key: BlockType; label: string }> = [
    { key: 'paragraph', label: 'Normal text' },
    { key: 'h1', label: 'Heading 1' },
    { key: 'h2', label: 'Heading 2' },
    { key: 'h3', label: 'Heading 3' },
    { key: 'h4', label: 'Heading 4' },
    { key: 'h5', label: 'Heading 5' },
    { key: 'h6', label: 'Label heading' },
];

/**
 * Shared styling for the three dropdown pickers (block type, font, size).
 * Keeping it in one place means the pickers stay visually identical to each
 * other and to the icon buttons without three copies drifting apart.
 */
const selectBase =
    'h-8 cursor-pointer rounded-lg border border-transparent bg-transparent px-2 ' +
    'text-xs font-medium text-kiwi-dark-black ' +
    'transition-colors duration-150 ' +
    'hover:bg-kiwi-light-grey/40 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kiwi-green/60';

interface BlockTypePickerProps {
    value: BlockType;
    onChange: (next: BlockType) => void;
}

/**
 * Single control for the active block type. Replaces a row of seven
 * heading/paragraph buttons — the same idiom as the style menu in Gmail,
 * Google Docs, and Notion. A native `<select>` keeps it keyboard- and
 * screen-reader-friendly for free.
 */
function BlockTypePicker({ value, onChange }: BlockTypePickerProps) {
    return (
        <select
            value={value}
            onChange={event => onChange(event.target.value as BlockType)}
            title="Text style"
            aria-label="Text style"
            className={`${selectBase} min-w-28`}
        >
            {BLOCK_OPTIONS.map(option => (
                <option key={option.key} value={option.key}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

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
            className={selectBase}
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
 * Point sizes for the size picker. An empty value clears the inline size and
 * lets the text fall back to the editor's base size. Values are `px` strings
 * because that is what the FontSize mark stores and what renders reliably in
 * email clients (relative units like `em` compound unpredictably there).
 */
const FONT_SIZES: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Size', value: '' },
    { label: '12', value: '12px' },
    { label: '14', value: '14px' },
    { label: '16', value: '16px' },
    { label: '18', value: '18px' },
    { label: '24', value: '24px' },
    { label: '32', value: '32px' },
];

interface FontSizePickerProps {
    value: string;
    onChange: (size: string) => void;
}

function FontSizePicker({ value, onChange }: FontSizePickerProps) {
    const current = FONT_SIZES.find(size => size.value === value)?.value ?? '';

    return (
        <select
            value={current}
            onChange={event => onChange(event.target.value)}
            title="Font size"
            aria-label="Font size"
            className={`${selectBase} min-w-16`}
        >
            {FONT_SIZES.map(size => (
                <option key={size.value} value={size.value}>
                    {size.label}
                </option>
            ))}
        </select>
    );
}

/**
 * Shape of the object emoji-mart returns on selection. The library ships no
 * type declarations, so we declare only the field we use: the native unicode
 * glyph, which we insert directly so it renders in any email client.
 */
interface EmojiMartSelection {
    native: string;
}

interface EmojiMartPickerProps {
    onEmojiSelect: (emoji: EmojiMartSelection) => void;
    theme?: 'light' | 'dark' | 'auto';
    perLine?: number;
    previewPosition?: 'none' | 'top' | 'bottom';
    skinTonePosition?: 'none' | 'preview' | 'search';
    navPosition?: 'top' | 'bottom' | 'none';
}

/**
 * emoji-mart's picker and its emoji dataset are heavy, and most messages are
 * sent without ever opening it. `lazy` + dynamic `import()` pull the picker
 * and its data into a separate chunk the bundler only fetches the first time
 * the picker mounts — keeping them out of the initial composer bundle.
 */
const LazyEmojiPicker = lazy(async () => {
    const [pickerModule, dataModule] = await Promise.all([
        import('@emoji-mart/react'),
        import('@emoji-mart/data'),
    ]);
    const Picker = pickerModule.default as ComponentType<EmojiMartPickerProps & { data: unknown }>;
    const data = dataModule.default;
    return {
        default: (props: EmojiMartPickerProps) => <Picker data={data} {...props} />,
    };
});

interface EmojiPickerProps {
    onPick: (native: string) => void;
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
                    className="absolute left-0 top-full z-20 mt-1.5"
                >
                    <Suspense fallback={null}>
                        <LazyEmojiPicker
                            theme="light"
                            perLine={8}
                            previewPosition="none"
                            skinTonePosition="search"
                            navPosition="top"
                            onEmojiSelect={emoji => {
                                onPick(emoji.native);
                                setOpen(false);
                            }}
                        />
                    </Suspense>
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
    'flex items-center justify-center h-8 min-w-8 px-1.5 rounded-lg text-kiwi-dark-grey ' +
    'transition-colors duration-150 ' +
    'hover:bg-kiwi-light-grey/40 hover:text-kiwi-black ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kiwi-green/60 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-kiwi-dark-grey';

const toolButtonActive = 'bg-kiwi-green/20 text-kiwi-black';

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
                'flex flex-wrap items-center gap-x-3 gap-y-1 ' +
                'rounded-xl border border-kiwi-light-grey/60 bg-kiwi-white ' +
                'px-2 py-1.5'
            }
        >

            <ToolGroup>
                <BlockTypePicker
                    value={editorState.blockType}
                    onChange={next => {
                        if (next === 'paragraph') {
                            editor.chain().focus().setParagraph().run();
                            return;
                        }
                        const level = Number(next.slice(1)) as HeadingLevel;
                        editor.chain().focus().setHeading({ level }).run();
                    }}
                />
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
                <FontSizePicker
                    value={editorState.currentFontSize}
                    onChange={size => {
                        if (size) {
                            editor.chain().focus().setFontSize(size).run();
                        } else {
                            editor.chain().focus().unsetFontSize().run();
                        }
                    }}
                />
            </ToolGroup>

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
            </ToolGroup>

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
                    label="Blockquote"
                    icon={ChatBubbleBottomCenterTextIcon}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editorState.isBlockquote}
                />
                <ToolButton
                    label="Code block"
                    icon={CodeBracketSquareIcon}
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editorState.isCodeBlock}
                />
            </ToolGroup>

            <ToolGroup>
                <ToolButton
                    label="Insert link"
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
                <ToolButton
                    label="Insert horizontal rule"
                    icon={MinusIcon}
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                />
                <ToolButton
                    label="Insert line break"
                    icon={ArrowUturnDownIcon}
                    onClick={() => editor.chain().focus().setHardBreak().run()}
                />
                <EmojiPicker
                    onPick={native => {
                        editor.chain().focus().insertContent(native).run();
                    }}
                />
            </ToolGroup>

            <ToolGroup>
                <ToolButton
                    label="Clear inline formatting"
                    icon={BackspaceIcon}
                    onClick={() => editor.chain().focus().unsetAllMarks().run()}
                />
                <ToolButton
                    label="Reset to normal text"
                    onClick={() => editor.chain().focus().clearNodes().run()}
                >
                    ¶✕
                </ToolButton>
            </ToolGroup>

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
