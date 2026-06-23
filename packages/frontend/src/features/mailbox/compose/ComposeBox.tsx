import { ArrowPathIcon, ArrowsPointingInIcon, ArrowsPointingOutIcon, MinusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { PaperAirplaneIcon, PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useContext, useEffect, useRef, useState } from "react";
import { useComposeEmailStore } from "../../../store/composeEmailStore";
import EmailEditor, { type EmailEditorHandle } from "./EmailEditor";
import MessageForm, { type MessageFormHandle } from "./MessageForm";
import { Button } from "../../../components/Button";
import { type EmailToSend, type EmailToSendResponse } from "@KiwiClient/shared";
import { AuthContext } from "../../../auth/AuthContext";
import { useToastStore } from "../../../store/toastStore";
import { useQueryClient } from "@tanstack/react-query";
import { glanceQueryKey } from "../glance/queryKeys";
import { useMailboxStore } from "../../../store/mailboxStore";

export type NewEmailComposeType = 'new' | 'reply' | 'reply_all' | 'forward';

export default function ComposeBox() {
    const [fullScreen, setFullScreen] = useState<boolean>(false);
    const [minimized, setMinimized] = useState<boolean>(false);
    const hidden = useComposeEmailStore(state => state.hidden);
    const setHidden = useComposeEmailStore(state => state.setHidden);
    const editorRef = useRef<EmailEditorHandle>(null);
    const formRef = useRef<MessageFormHandle>(null);
    const { authFetch, email, name } = useContext(AuthContext);
    const queryClient = useQueryClient();
    const setMessage = useToastStore(state => state.setMessage);
    const [composeBoxTitle, setComposeBoxTitle] = useState("New message");
    const sentPath = useMailboxStore(state => state.sentPath);
    const setFormRef = useComposeEmailStore(state => state.setFormRef);
    const setEditorRef = useComposeEmailStore(state => state.setEditorRef);

    // const [editing, setEditing] = useState(false);

    // useEffect(() => {
    //     // Draft functionality?
    //
    // }, [editing]);

    function handleClosingComposeBox(event: React.MouseEvent<SVGSVGElement, MouseEvent>): void {
        event.stopPropagation();
        setHidden(true);
        setMinimized(false);
        setFullScreen(false);
        setComposeBoxTitle("New message");
        formRef.current?.clearDraft();
        editorRef.current?.clearEditor();
    }

    async function handleSend(): Promise<boolean> {
        // TODO: Handle the UI/prompt the user when the user forgets to add stuff like a recipient, subject
        const draft = formRef.current?.getDraft();

        if (!draft) {
            return false;
        }

        const emailToSend: EmailToSend = {
            from: { name: name, address: email },
            ...draft,
            replyTo: [{ name: name, address: email }],
            html: editorRef.current?.getHtml() ?? '',
            sentFolder: sentPath
        };

        setMessage(`Sending message '${draft.subject}'...`, "loading");

        // Backend call to send here
        const response = await authFetch('/api/messages/send', {
            method: 'POST',
            body: emailToSend
        })

        if (response.ok) {
            setHidden(true);
            setMinimized(false);
            setFullScreen(false);
            setComposeBoxTitle("New message");

            // Clear the content of the email after it's been sent
            formRef.current?.clearDraft();
            editorRef.current?.clearEditor();

            // TODO: Also make it obvious to the user that the mail is sending with an alert or notfication as well as the status bar?
            setMessage("Message sent!", "success", 3000);

            queryClient.invalidateQueries({ queryKey: glanceQueryKey(sentPath) });
            return true;
        }

        const errorResponse = await response.json() as EmailToSendResponse;
        if (!errorResponse.success && errorResponse.code === "IMAP_COULD_NOT_MOVE_MESSAGE") {
            alert("Could not move sent message to sent folder"); // TODO: Should make the alerts nice with the UI
        } else if (!errorResponse.success && errorResponse.code === "INTERNAL_ERROR") {
            alert("Could not send message due to an internal server error");
        }

        setMessage(`Failed to send message '${draft.subject}'`, "error", 3000);

        return false;
    }

    useEffect(() => {
        return () => setHidden(true);
    }, [])

    useEffect(() => {
        setFormRef(formRef.current);
        setEditorRef(editorRef.current);
    }, []);

    return (
        <section
            className={[
                hidden ? "hidden" : "flex",
                "fixed inset-0 z-50 flex-col h-dvh w-full overflow-hidden",
                "md:inset-auto md:bottom-0 md:right-4",
                "bg-kiwi-white text-kiwi-black shadow-2xl border border-kiwi-middle-grey",
                "md:rounded-t-2xl transition-all duration-300 ease-out",
                // desktop size state
                fullScreen ? "md:inset-2 md:bottom-2 md:right-2 md:h-[calc(100dvh-1rem)] md:w-[calc(100vw-1rem)] md:left-2" : minimized ? "md:h-11 md:w-160" : "md:h-160 md:w-160", "md:max-h-full md:max-w-full",].join(" ")}
        >
            <header
                className="flex h-11 shrink-0 items-center justify-between bg-kiwi-light-grey px-3 cursor-pointer"
                onClick={() => minimized && setMinimized(false)}
            >
                <span className="truncate text-sm font-semibold">{composeBoxTitle}</span>
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
                        onClick={event => handleClosingComposeBox(event)}
                    />
                </div>
            </header>
            <MessageForm setComposeBoxTitle={setComposeBoxTitle} ref={formRef} />
            <div className={minimized ? "invisible" : "flex min-h-0 flex-1 flex-col overflow-y-auto p-4"}>
                <EmailEditor ref={editorRef} />
            </div>
            {!minimized && <Footer sendEmail={handleSend} />}
        </section>
    );
}

interface FooterProps {
    sendEmail: () => Promise<boolean>
}

type SendingStatus = 'drafting' | 'sending' | 'succeeded' | 'failed';

function Footer({ sendEmail }: FooterProps) {

    const [sendingStatus, setSendingStatus] = useState<SendingStatus>('drafting');

    async function handleSend(event: React.MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        setSendingStatus('sending');
        const sent = await sendEmail();

        if (sent) {
            setSendingStatus('drafting'); // Return back to the default behaviour
        }
        setSendingStatus('failed');
    }


    return (
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-kiwi-light-grey bg-kiwi-light-grey/20 px-3 py-2">
            <div className="flex items-center gap-2">
                <Button
                    text="Send"
                    buttonSize="md"
                    reverseColours
                    icon={getStatusIcon(sendingStatus)}
                    disabled={sendingStatus === 'sending'}
                    onClick={(event) => handleSend(event)}
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

function getStatusIcon(status: SendingStatus) {
    switch (status) {
        case 'succeeded': // I guess just reset it back to the default if there has been an error
        case 'failed':
        case 'drafting':
            return (<PaperAirplaneIcon aria-hidden="true" className="size-4 -rotate-45" />);
        default:
        case 'sending':
            return (<ArrowPathIcon aria-hidden="true" className="size-4 animate-spin" />);
    }
}
