import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useComposeEmailStore } from '../../../store/composeEmailStore';
import type { EmailAddress } from '@KiwiClient/shared';

/**
 * Permissive but not RFC-5322 strict. Catches typos like missing `@` or TLD,
 * accepts everything else. Server-side validation is the source of truth on
 * send; the chip "invalid" state is just a visual nudge.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Characters that split a pasted recipient string into multiple addresses.
 * Whitespace, comma, semicolon — covers Outlook/Gmail clipboard formats.
 */
const PASTE_SPLIT_REGEX = /[\s,;]+/;

interface Recipient {
    id: string;
    address: string;
    valid: boolean;
}

function makeRecipient(address: string): Recipient {
    return {
        id: crypto.randomUUID(),
        address,
        valid: EMAIL_REGEX.test(address),
    };
}

interface RecipientsRowProps {
    id: string;
    label: string;
    value: Recipient[];
    onChange: (next: Recipient[]) => void;
    rightSlot?: ReactNode;
    inputRef?: RefObject<HTMLInputElement | null>;
}

function RecipientsRow({ id, label, value, onChange, rightSlot, inputRef }: RecipientsRowProps) {
    const [draft, setDraft] = useState('');

    function commitDraft() {
        const address = draft.trim();
        if (!address) {
            return;
        }
        onChange([...value, makeRecipient(address)]);
        setDraft('');
    }

    function removeChip(chipId: string) {
        onChange(value.filter(chip => chip.id !== chipId));
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
            if (draft.trim()) {
                event.preventDefault();
                commitDraft();
            }
            return;
        }
        if (event.key === 'Tab' && draft.trim()) {
            // Commit but don't preventDefault — Tab should still move focus.
            commitDraft();
            return;
        }
        if (event.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
        const text = event.clipboardData.getData('text');
        if (!PASTE_SPLIT_REGEX.test(text)) {
            return;
        }
        event.preventDefault();
        const parts = text.split(PASTE_SPLIT_REGEX).map(part => part.trim()).filter(Boolean);
        if (parts.length === 0) {
            return;
        }
        onChange([...value, ...parts.map(makeRecipient)]);
        setDraft('');
    }

    return (
        <div className="flex items-start gap-4 border-b border-kiwi-light-grey px-3 py-2 focus-within:bg-kiwi-light-grey/10">
            <label htmlFor={id} className="mt-1 w-16 shrink-0 text-sm font-semibold uppercase tracking-wide text-kiwi-dark-grey" >
                {label}
            </label>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {value.map(chip => (
                    <span
                        key={chip.id}
                        className={
                            'inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-sm ' +
                            (chip.valid
                                ? 'bg-kiwi-light-grey/60 text-kiwi-black'
                                : 'bg-kiwi-failure/10 text-kiwi-failure ring-1 ring-kiwi-failure/50')
                        }
                        title={chip.valid ? chip.address : `${chip.address} — not a valid email`}
                    >
                        <span className="max-w-48 truncate">{chip.address}</span>
                        <button
                            type="button"
                            onClick={() => removeChip(chip.id)}
                            aria-label={`Remove ${chip.address}`}
                            className="rounded-full p-0.5 hover:bg-kiwi-middle-grey/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kiwi-green/60"
                        >
                            <XMarkIcon className="size-3" aria-hidden="true" />
                        </button>
                    </span>
                ))}
                <input
                    id={id}
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onBlur={() => draft.trim() && commitDraft()}
                    autoComplete="off"
                    spellCheck={false}
                    data-form-type="other"
                    data-1p-ignore
                    data-lpignore="true"
                    data-bwignore
                    className="min-w-24 flex-1 bg-transparent text-sm leading-6 outline-none placeholder:text-kiwi-middle-grey"
                    placeholder={value.length === 0 ? 'name@example.com' : ''}
                />
            </div>
            {rightSlot ? <div className="mt-1 shrink-0">{rightSlot}</div> : null}
        </div>
    );
}

interface MessageFormValues {
    to: EmailAddress[];
    cc: EmailAddress[];
    bcc: EmailAddress[];
    subject: string;
}

export interface MessageFormHandle {
    getDraft: () => MessageFormValues;
    clearDraft: () => void;
}

interface MessageFormProps {
    setComposeBoxTitle: (newSubject: string) => void;
}

const MessageForm = forwardRef<MessageFormHandle, MessageFormProps>(({ setComposeBoxTitle }, ref) => {
    const [to, setTo] = useState<Recipient[]>([]);
    const [cc, setCc] = useState<Recipient[]>([]);
    const [bcc, setBcc] = useState<Recipient[]>([]);
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [subject, setSubject] = useState('');
    const hidden = useComposeEmailStore(state => state.hidden);
    const toInputRef = useRef<HTMLInputElement>(null);

    function handleSubjectInput(event: React.ChangeEvent<HTMLInputElement>): void {
        event.preventDefault();
        if (event.target.value.length === 0) {
            setComposeBoxTitle("New message");
            setSubject("");
            return;
        }

        setSubject(event.target.value);
        setComposeBoxTitle(event.target.value);
    }

    useEffect(() => {
        if (!hidden) {
            toInputRef.current?.focus();
        }
    }, [hidden]);

    useImperativeHandle(ref, () => ({
        getDraft: () => ({
            to: to.filter(chip => chip.valid).map(chip => ({ address: chip.address })),
            cc: cc.filter(chip => chip.valid).map(chip => ({ address: chip.address })),
            bcc: bcc.filter(chip => chip.valid).map(chip => ({ address: chip.address })),
            subject: subject
        }),

        clearDraft: () => {
            setTo([]);
            setCc([]);
            setBcc([]);
            setSubject('')
        },

    }), [to, cc, bcc, subject])

    return (
        <form
            className="mx-4 mt-4 flex flex-col rounded-md border border-kiwi-light-grey bg-kiwi-white text-kiwi-black overflow-hidden"
            data-form-type="other"
            autoComplete="off"
        >
            <RecipientsRow
                id="recipients-to"
                label="To"
                value={to}
                inputRef={toInputRef}
                onChange={setTo}
                rightSlot={
                    showCc && showBcc ? null : (
                        <div className="flex items-center gap-3 text-sm font-medium text-kiwi-dark-grey">
                            {!showCc && (
                                <button
                                    type="button"
                                    onClick={() => setShowCc(true)}
                                    className="hover:text-kiwi-black focus-visible:outline-none focus-visible:underline"
                                >
                                    Cc
                                </button>
                            )}
                            {!showBcc && (
                                <button
                                    type="button"
                                    onClick={() => setShowBcc(true)}
                                    className="hover:text-kiwi-black focus-visible:outline-none focus-visible:underline"
                                >
                                    Bcc
                                </button>
                            )}
                        </div>
                    )
                }
            />
            {showCc && (
                <RecipientsRow id="recipients-cc" label="Cc" value={cc} onChange={setCc} />
            )}
            {showBcc && (
                <RecipientsRow id="recipients-bcc" label="Bcc" value={bcc} onChange={setBcc} />
            )}
            <div className="flex items-center gap-4 px-3 py-2 focus-within:bg-kiwi-light-grey/10">
                <label htmlFor="subject" className="w-16 shrink-0 text-sm font-semibold uppercase tracking-wide text-kiwi-dark-grey">Subject</label>
                <input
                    id="subject"
                    name="subject"
                    type="text"
                    value={subject}
                    onChange={event => handleSubjectInput(event)}
                    autoComplete="off"
                    data-form-type="other"
                    data-1p-ignore
                    data-lpignore="true"
                    data-bwignore
                    className="flex-1 bg-transparent text-sm leading-6 outline-none placeholder:text-kiwi-middle-grey"
                    placeholder="Subject"
                />
            </div>
        </form>
    );
})

export default MessageForm;
