import { ArrowPathIcon, ArrowsPointingInIcon, ArrowsPointingOutIcon, MinusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { PaperAirplaneIcon, PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useContext, useEffect, useRef, useState } from "react";
import { useComposeEmailStore } from "../../../store/composeEmailStore";
import EmailEditor, { type EmailEditorHandle } from "./EmailEditor";
import MessageForm, { type MessageFormHandle } from "./MessageForm";
import { Button } from "../../../components/Button";
import { type EmailToDraft, type EmailToSend, type EmailToSendResponse, type EmailUidResponse } from "@KiwiClient/shared";
import { AuthContext } from "../../../auth/AuthContext";
import { useToastStore } from "../../../store/toastStore";
import { useQueryClient } from "@tanstack/react-query";
import { glanceQueryKey } from "../glance/queryKeys";
import { useMailboxStore } from "../../../store/mailboxStore";
import { useDebounce } from "../../../hooks/useDebounce";
import { draftFingerprint } from "./draftFingerprint";

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
    const specialDraftFolderPath = useMailboxStore(state => state.specialDraftFolderPath);
    const setFormRef = useComposeEmailStore(state => state.setFormRef);
    const setEditorRef = useComposeEmailStore(state => state.setEditorRef);
    const setDraftUid = useComposeEmailStore(state => state.setDraftUid);
    const draftUid = useComposeEmailStore(state => state.draftUid);
    const setDraftBaseline = useComposeEmailStore(state => state.setDraftBaseline);
    const draftSaveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));

    function buildDraftPayload(): EmailToDraft | null {
        const draft = formRef.current?.getDraft();

        if (!draft || (draft?.subject.length === 0 && draft.to.length === 0 && draft?.cc.length === 0 && draft.bcc.length === 0)) {
            return null;
        }

        return {
            from: { name: name, address: email },
            ...draft,
            replyTo: [{ name: name, address: email }],
            html: editorRef.current?.getHtml() ?? '',
            text: editorRef.current?.getText() ?? '',
            draftFolder: specialDraftFolderPath
        };
    }

    async function saveDraftPayload(emailToSaveToDrafts: EmailToDraft, draftUidOverride?: number, backgroundSave = false): Promise<boolean> {
        if (!backgroundSave && useComposeEmailStore.getState().hidden) {
            return false;
        }

        const displaySubject = emailToSaveToDrafts.subject.length === 0 ? "(No subject)" : emailToSaveToDrafts.subject;

        setMessage(`Saving draft '${displaySubject}'...`, "loading");

        const currentDraftUid = draftUidOverride ?? useComposeEmailStore.getState().draftUid;

        if (!backgroundSave && useComposeEmailStore.getState().hidden) {
            return false;
        }

        let response;
        if (currentDraftUid === undefined) {
            response = await authFetch('/api/messages/draft', {
                method: 'POST',
                body: emailToSaveToDrafts
            })
        } else {
            response = await authFetch(`/api/messages/draft/${encodeURIComponent(currentDraftUid)}`, {
                method: 'PUT',
                body: emailToSaveToDrafts
            })
        }

        if (response.ok) {
            setMessage(`Draft saved at ${new Date().toLocaleTimeString()}`, "success", 3000);
            const data = await response.json() as EmailUidResponse;
            if (data.success && !useComposeEmailStore.getState().hidden) {
                setDraftUid(Number(data.data.uid));
                // Now we can update the URL using the unique ID
            }
            setDraftBaseline(draftFingerprint(emailToSaveToDrafts));
            queryClient.invalidateQueries({ queryKey: glanceQueryKey(specialDraftFolderPath) });
            return true;
        }

        setMessage(`Failed to save draft '${displaySubject}', trying again later`, "error", 3000);

        return false;
    }

    async function handleSavingDraft(): Promise<boolean> {
        if (useComposeEmailStore.getState().hidden) {
            return false;
        }

        const emailToSaveToDrafts = buildDraftPayload();

        if (!emailToSaveToDrafts) {
            return false;
        }

        return saveDraftPayload(emailToSaveToDrafts);
    }

    function queueDraftSave(draftPayload?: EmailToDraft, draftUidOverride?: number, backgroundSave = false): Promise<boolean> {
        const nextSave = draftSaveQueueRef.current
            .catch(() => false)
            .then(() => {
                if (draftPayload) {
                    return saveDraftPayload(draftPayload, draftUidOverride, backgroundSave);
                }
                return handleSavingDraft();
            });
        draftSaveQueueRef.current = nextSave;
        return nextSave;
    }

    function hasUnsavedDraftChanges(draftPayload: EmailToDraft): boolean {
        return draftFingerprint(draftPayload) !== useComposeEmailStore.getState().draftBaseline;
    }

    const [debounceDraftSave, cancelDebouncedDraftSave] = useDebounce(queueDraftSave, 2000);

    function resetComposeBox(): void {
        setHidden(true);
        setMinimized(false);
        setFullScreen(false);
        setComposeBoxTitle("New message");
        formRef.current?.clearDraft();
        editorRef.current?.clearEditor();
        setDraftUid(undefined);
        setDraftBaseline("");
    }

    function handleClosingComposeBox(event: React.MouseEvent<SVGSVGElement, MouseEvent>): void {
        event.stopPropagation();
        cancelDebouncedDraftSave();
        const draftPayload = buildDraftPayload();
        const draftUidToSave = useComposeEmailStore.getState().draftUid;
        resetComposeBox();
        if (draftPayload && hasUnsavedDraftChanges(draftPayload)) {
            queueDraftSave(draftPayload, draftUidToSave, true);
        }
    }

    async function handleSend(): Promise<boolean> {
        cancelDebouncedDraftSave();

        const draft = formRef.current?.getDraft();

        if (!draft) {
            return false;
        }

        const draftUidToDelete = useComposeEmailStore.getState().draftUid;

        const emailToSend: EmailToSend = {
            from: { name: name, address: email },
            ...draft,
            replyTo: [{ name: name, address: email }],
            html: editorRef.current?.getHtml() ?? '',
            text: editorRef.current?.getText() ?? '',
            sentFolder: sentPath
        };

        setMessage(`Sending message '${draft.subject}'...`, "loading");

        const response = await authFetch('/api/messages/send', {
            method: 'POST',
            body: emailToSend
        })

        if (response.ok) {
            resetComposeBox();

            if (draftUidToDelete !== undefined) {
                void authFetch(`/api/messages/draft/${encodeURIComponent(draftUidToDelete)}`, {
                    method: 'DELETE',
                    body: { draftFolder: specialDraftFolderPath }
                }).then(() => {
                    queryClient.invalidateQueries({ queryKey: glanceQueryKey(specialDraftFolderPath) });
                });
            }

            setMessage("Message sent!", "success", 3000);

            queryClient.invalidateQueries({ queryKey: glanceQueryKey(sentPath) });
            return true;
        }

        const errorResponse = await response.json() as EmailToSendResponse;
        if (!errorResponse.success && errorResponse.code === "MESSAGE_SEND_FAILED") {
            alert("Could not send the message due to a protocol error"); // TODO: Should make the alerts nice with the UI
        } else if (!errorResponse.success && errorResponse.code === "INTERNAL_ERROR") {
            alert("Could not send message due to an internal server error");
        }

        setMessage(`Failed to send message '${draft.subject}'`, "error", 3000);

        return false;
    }

    useEffect(() => {
        setFormRef(formRef.current);
        setEditorRef(editorRef.current);
    }, []);

    useEffect(() => {
        if (hidden || draftUid !== undefined) {
            return;
        }

        requestAnimationFrame(() => {
            const payload = buildDraftPayload();
            setDraftBaseline(payload ? draftFingerprint(payload) : "");
        });
    }, [hidden, draftUid]);

    return (
        <section
            className={[
                hidden ? "hidden" : "flex",
                "fixed inset-0 z-50 flex-col h-dvh w-full",
                "md:inset-auto md:bottom-0 md:right-4",
                "bg-kiwi-white text-kiwi-black shadow-2xl border border-kiwi-middle-grey",
                "rounded-t-2xl transition-all duration-300 ease-out",
                // desktop size state
                fullScreen ? "md:inset-2 md:bottom-2 md:right-2 md:h-[calc(100dvh-1rem)] md:w-[calc(100vw-1rem)] md:left-2" : minimized ? "md:h-11 md:w-160" : "md:h-160 md:w-160", "md:max-h-full md:max-w-full",].join(" ")}
        >
            <header
                className="flex h-11 shrink-0 items-center justify-between bg-kiwi-light-grey px-3 rounded-t-2xl cursor-pointer"
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
            <span className="flex flex-col flex-1 overflow-y-scroll no-scrollbar" onInput={() => { debounceDraftSave(); }}>
                <MessageForm setComposeBoxTitle={setComposeBoxTitle} ref={formRef} />
                <div className={minimized ? "invisible" : "flex min-h-0 flex-1 flex-col p-4"}>
                    <EmailEditor ref={editorRef} />
                </div>
            </span>
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
            <div className="flex items-center gap-4">
                <Button
                    text=""
                    buttonSize="sm"
                    title="Discard draft"
                    icon={<TrashIcon className="size-5" aria-hidden="true" />}
                    onClick={() => alert("Drafts coming soon!")}
                />
            </div>
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
