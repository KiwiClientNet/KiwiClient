import { ArrowsPointingInIcon, ArrowsPointingOutIcon, MinusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { PaperAirplaneIcon, PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useContext, useEffect, useRef, useState } from "react";
import { useComposeEmailStore } from "../../../store/composeEmailStore";
import EmailEditor, { type EmailEditorHandle } from "./EmailEditor";
import MessageForm, { type MessageFormHandle } from "./MessageForm";
import { Button } from "../../../components/Button";
import { type EmailToSend } from "@KiwiClient/shared";
import { AuthContext } from "../../../auth/AuthContext";
import { useToastStore } from "../../../store/toastStore";

export default function ComposeBox() {
    const [fullScreen, setFullScreen] = useState<boolean>(false);
    const [minimized, setMinimized] = useState<boolean>(false);
    const hidden = useComposeEmailStore(state => state.hidden);
    const setHidden = useComposeEmailStore(state => state.setHidden);
    const editorRef = useRef<EmailEditorHandle>(null);
    const formRef = useRef<MessageFormHandle>(null);
    const { authFetch, email, name } = useContext(AuthContext);
    const setMessage = useToastStore((state) => state.setMessage);

    async function handleSend(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();

        // TODO: Handle the UI when the user forgets to add stuff like a recipient, subject
        const draft = formRef.current?.getDraft();

        if (!draft) {
            return;
        }

        const emailToSend: EmailToSend = {
            from: { name: name, address: email },
            ...draft,
            replyTo: [{ name: name, address: email }],
            html: editorRef.current?.getHtml() ?? '',
        };

        setMessage(`Sending message '${draft.subject}'...`);

        // Backend call to send here
        const response = await authFetch('/api/messages/send', {
            method: 'POST',
            body: emailToSend
        })

        if (response.ok) {
            setHidden(true);
            setMinimized(false);
            setFullScreen(false);

            // Clear the content of the email after it's been sent
            formRef.current?.clearDraft();
            editorRef.current?.clearEditor();

            // TODO: Also make it obvious to the user that the mail is sending
            // TODO: Handle what happens when the emails get rejected
            setMessage("Message sent!", 3000);
        }
    }

    useEffect(() => {
        return () => setHidden(true);
    }, [])

    return (
        <section
            className={[
                hidden ? "hidden" : "flex",
                "fixed inset-0 z-50 flex-col h-dvh w-full overflow-auto",
                "md:inset-auto md:bottom-0 md:right-4 md:overflow-hidden",
                "bg-kiwi-white text-kiwi-black shadow-2xl border border-kiwi-middle-grey",
                "md:rounded-t-2xl transition-all duration-300 ease-out",
                // desktop size state
                fullScreen ? "md:inset-2 md:bottom-2 md:right-2 md:h-[calc(100dvh-1rem)] md:w-[calc(100vw-1rem)] md:left-2" : minimized ? "md:h-11 md:w-160" : "md:h-160 md:w-160", "md:max-h-full md:max-w-full",].join(" ")}
        >
            <header
                className="flex h-11 shrink-0 items-center justify-between bg-kiwi-light-grey px-3 cursor-pointer"
                onClick={() => minimized && setMinimized(false)}
            >
                <span className="truncate text-sm font-semibold">New message</span>
                <div className="flex items-center gap-4">
                    <MinusIcon
                        className="size-5 cursor-pointer hidden md:block hover:bg-kiwi-white duration-100 transition-colors rounded-sm"
                        onClick={(event) => { event.stopPropagation(); setMinimized(previous => !previous); setFullScreen(false) }}
                    />
                    {!fullScreen && (
                        <ArrowsPointingOutIcon
                            className="size-5 cursor-pointer hidden md:block hover:bg-kiwi-white duration-100 transition-colors rounded-sm"
                            onClick={(event) => { event.stopPropagation(); setMinimized(false); setFullScreen(previous => !previous); }}
                        />
                    )}
                    {fullScreen && (
                        <ArrowsPointingInIcon
                            className="size-5 cursor-pointer hidden md:block hover:bg-kiwi-white duration-100 transition-colors rounded-sm"
                            onClick={(event) => { event.stopPropagation(); setFullScreen(previous => !previous); }}
                        />
                    )}
                    <XMarkIcon
                        className="size-5 cursor-pointer hover:bg-kiwi-white duration-100 transition-colors rounded-sm"
                        onClick={(event) => { event.stopPropagation(); setHidden(!hidden); }}
                    />
                </div>
            </header>
            <MessageForm ref={formRef} />
            <div className={minimized ? "invisible" : "flex flex-1 flex-col overflow-y-auto p-4"}>
                <EmailEditor ref={editorRef} />
            </div>
            {!minimized && <Footer onSend={handleSend} />}
        </section>
    );
}

interface FooterProps {
    onSend: (event: React.MouseEvent<HTMLButtonElement>) => void
}

function Footer({ onSend }: FooterProps) {
    return (
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-kiwi-light-grey bg-kiwi-light-grey/20 px-3 py-2">
            <div className="flex items-center gap-2">
                <Button
                    text="Send"
                    buttonSize="md"
                    reverseColours
                    icon={<PaperAirplaneIcon className="size-4 -rotate-45" aria-hidden="true" />}
                    onClick={(event) => onSend(event)}
                />
                <Button
                    text=""
                    buttonSize="sm"
                    title="Attach file"
                    icon={<PaperClipIcon className="size-5" aria-hidden="true" />}
                    onClick={() => alert("Attachments coming soon!")}
                />
            </div>
            <Button
                text=""
                buttonSize="sm"
                title="Discard draft"
                icon={<TrashIcon className="size-5" aria-hidden="true" />}
                onClick={() => alert("Drafts coming soon!")}
            />
        </footer>
    );
}
