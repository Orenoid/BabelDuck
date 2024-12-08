"use client";

import { useState, useRef, useEffect, useCallback, useContext } from "react";
import { FaBackspace, FaMicrophone } from "react-icons/fa";
import { LuSettings, LuUserCog2 } from "react-icons/lu";
import { Audio, Oval } from "react-loader-spinner";
import { messageAddedCallbackOptions } from "./chat";
import { ChatSettingsContext } from "./chat-settings";
import { SpecialRoles, TextMessage } from "./message";
import { IconCircleWrapper } from "@/app/ui-utils/components/wrapper";
import { diffChars } from "diff";
import { LiaComments } from "react-icons/lia";
import { PiKeyReturnBold } from "react-icons/pi";
import { isOpenAILikeMessage, Message, OpenAILikeMessage } from "../lib/message";
import Switch from "react-switch";
import { IMediaRecorder } from "extendable-media-recorder";
import { Tooltip } from "react-tooltip";
import { FiPlus } from "react-icons/fi";
import { updateInputHandlerInLocalStorage, updateInputSettingsPayloadInLocalStorage } from "../lib/chat";
import {
    InputHandler,
    CustomInputHandlerCreator
} from "./input-handlers";
import { SemiTransparentOverlay } from "@/app/ui-utils/components/overlay";
import { useTranslation } from "react-i18next";
import { I18nText } from "@/app/i18n/i18n";
import { TmpFilledButton, TmpTransparentButton } from "@/app/ui-utils/components/button";
import { TbPencil } from "react-icons/tb";
import { TutorialDiffView, TutorialInput } from "./tutorial-input";

export async function reviseMessage(
    messageToRevise: string,
    userInstruction: string,
    historyMessages: Message[],
    includeHistory: boolean = true,
    historyMessageCount: number | undefined = undefined) {

    // TODO tech-dept: to make sure the tutorial 100% works, temporarily hardcode the response to avoid unreliable network issues
    if (userInstruction.includes("7m1WTDpAuhttWRPfF5LPV0Tgktw7")) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return "That's a lot of information. I'll summarize it later."
    }

    const historyContext = includeHistory ?
        historyMessages.slice(-(historyMessageCount ?? historyMessages.length)).
            filter((msg) => msg.includedInChatCompletion).
            filter((msg) => isOpenAILikeMessage(msg)).
            map(msg => `[START]${msg.role}: ${msg.toOpenAIMessage().content}[END]`).join('\n') : "";

    const systemPrompt = `You're a helpful assistant. Your duty is to assist users in a conversation, and sometimes users will provide you with the message they are about to send, asking you to help modify, correct, translate or rewrite the provided message.First, the user will send you the ongoing conversation history in the following format:
"""
[START]somebody: ...[END]
[START]user: ...[END]
[START]somebody: ...[END]
"""
Then, the user will provide the message text they are about to send:
"""
message content about to send
"""
Next, the user will give an instruction:
"""
instruction about the revision you should do on the message above
"""
Please follow the user's instruction, considering the historical context of the conversation, and revise or rewrite the message. Then, return the revised message in the following JSON format:
"""
{"revision": "..."}
"""
IMPORTANT: The revision you generate is intended for the user to respond the ongoing conversation, not to reply to the user's current instruction.
`

    const fewShotMessages = [
        `here is the ongoing conversation history:
"""
[START]assistant: Hello, how can I assist you?[END]
[START]user: I want to book a room.[END]
[START]assistant: Sure, what kind of room do you need?[END]
"""
here is the message I'm about to send:
"""
我需要一个双人房，住两晚。
"""
here is what you shoud do with the message:
"""
translate it into English
"""`,
        `{"revision": "I need a double room for two nights."}`
    ]
    const userMessage = `here is the ongoing conversation history:
"""
${historyContext}
"""
here is the message I'm about to send:
"""
${messageToRevise}
"""
here is what you shoud do with the message:
"""
${userInstruction}
"""`
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fewShotMessages[0] },
        { role: 'assistant', content: fewShotMessages[1] },
        { role: 'user', content: userMessage }
    ]


    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, action: 'revise' }),
    });

    if (!response.ok) {
        throw new Error('Failed to get chat completion');
    }

    const rawJson = await response.text();
    const revision = JSON.parse(rawJson).revision;
    return revision;
}

export async function generateMessage(
    userInstruction: string,
    historyMessages: Message[],
    includeHistory: boolean = true,
    historyMessageCount: number | undefined = undefined
) {
    const historyContext = includeHistory ?
        historyMessages.slice(-(historyMessageCount ?? historyMessages.length)).
            filter((msg) => msg.includedInChatCompletion).
            filter((msg) => isOpenAILikeMessage(msg)).
            map(msg => `[START]${msg.role}: ${msg.toOpenAIMessage().content}[END]`).join('\n') : "";

    const systemPrompt = `You're a helpful assistant. Your duty is to assist users in a conversation, and sometimes users don't know how to respond, you need to help the user provide a response for reference. First, the user will send you the ongoing conversation history in the following format:
"""
[START]somebody: ...[END]
[START]user: ...[END]
[START]somebody: ...[END]
"""
Next, the user will give an instruction:
"""
instruction on how you should generate relevant repl
"""
Please follow the user's instruction, considering the historical context of the conversation, and provide a recommended response for the user's reference. Then, return the recommended response in the following JSON format:
"""
{"recommended": "..."}
"""
IMPORTANT: The response you generate is intended for the user to respond the ongoing conversation, not to reply to the user's current instruction.
`

    const fewShotMessages = [
        `here is the ongoing conversation history:
"""
[START]assistant: Hello, welcome to our interview. Can you please introduce yourself?[END]
[START]user: Sure, my name is John Doe and I have a background in software development.[END]
[START]assistant: Great, John. Can you briefly tell me what data types are in Python?[END]
"""
here is my instruction:
"""
help me answer it
"""`,
        `{"recommended": "In Python, data types include integers, floats, strings, lists, tuples, sets, and dictionaries."}`
    ]
    const userMessage = `here is the ongoing conversation history:
"""
${historyContext}
"""
here is my instruction:
"""
${userInstruction}
"""`
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fewShotMessages[0] },
        { role: 'assistant', content: fewShotMessages[1] },
        { role: 'user', content: userMessage }
    ]

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, action: 'generate' }),
    });

    if (!response.ok) {
        throw new Error('Failed to get chat completion');
    }

    const rawJson = await response.text();
    const recommended = JSON.parse(rawJson).recommended;
    return recommended;
}


// Temporarily use this to convert message to text for revision
function messageToText(message: Message): string {
    if (isOpenAILikeMessage(message)) {
        return message.toOpenAIMessage().content
    }
    return message.toString()
}

export type MessageInputState =
    | { type: 'init' }
    | { type: 'normal'; message: Message; fromRevision: boolean }
    | { type: 'addingCustomInputHandler', previousState: MessageInputState }
    | { type: 'settingsPanel'; handlerIndex: number; previousState: MessageInputState }
    | { type: 'revising'; message: Message; revisingIndex: number; }
    | { type: 'waitingApproval'; message: Message; revisedMsg: Message; revisionInstruction: string; };

export type MsgListSwitchSignal =
    | { type: 'init', key: number }
    | { type: 'switchChat', key: number }
    | { type: 'followUpDiscussion', key: number }
    | { type: 'backFromFollowUpDiscussion', message: Message, handledMsg: Message, handlerInstruction: string, key: number }

export function MessageInput({
    chatID, messageList, inputHandlers, addMesssage, addInputHandler: pAddInputHandler, msgListSwitchSignal, allowFollowUpDiscussion, startFollowUpDiscussion, className = ""
}: {
    chatID: string
    messageList: Message[];
    inputHandlers: InputHandler[]
    allowFollowUpDiscussion: boolean;
    // callback functions
    addMesssage: (message: Message, callbackOpts?: messageAddedCallbackOptions) => void;
    // TODO tech-debt: 新增 inputHandler 应该通过更新 chatSettings 来实现
    addInputHandler: (handler: InputHandler) => void;
    startFollowUpDiscussion: (userInstruction: string, messageToRevise: Message, revisedText: Message) => void;
    // signals
    msgListSwitchSignal: MsgListSwitchSignal,
    className?: string;
}) {
    const { t } = useTranslation();
    const [compState, setCompState] = useState<MessageInputState>({ type: 'init' });

    const isNormal = compState.type === 'normal';
    const waitingForApproval = compState.type === 'waitingApproval';
    const [rejectionSignal, setRejectionSignal] = useState(0)

    // state convertors
    const updateMessage = useCallback((message: Message) => {
        if (compState.type !== 'init' && compState.type !== 'normal') {
            return
        }
        setCompState({ type: 'normal', message, fromRevision: false });
    }, [compState.type])
    async function startHandler(triggeredIndex: number) {
        if (!isNormal) {
            return;
        }
        const handler = inputHandlers[triggeredIndex]
        if (!handler.isCompatibleWith(compState.message)) {
            console.error(`Input handler ${handler.type} is not compatible with message ${compState.message.type}`)
            return; // TODO raise error
        }
        setCompState({ type: 'revising', revisingIndex: triggeredIndex, message: compState.message });
        const userInstruction = handler.instruction();
        let result: string;
        try {
            if (compState.message.isEmpty()) {
                result = await generateMessage(userInstruction, messageList);
            } else {
                result = await reviseMessage(messageToText(compState.message), userInstruction, messageList);
            }
        } catch (error) {
            setCompState({ type: 'normal', message: compState.message, fromRevision: false });
            throw error; // TODO unified error handling
        }
        setCompState({
            type: 'waitingApproval',
            revisedMsg: new TextMessage(compState.message.role, result),
            revisionInstruction: userInstruction,
            message: compState.message
        });
    }
    function approveHandlerResult(revisedText: string) {
        if (!waitingForApproval) {
            return;
        }
        setCompState({ type: 'normal', message: new TextMessage(compState.message.role, revisedText), fromRevision: true });
    }
    function rejectHandlerResult() {
        if (!waitingForApproval) {
            return;
        }
        setCompState({ type: 'normal', message: compState.message, fromRevision: false });
        setRejectionSignal(prev => prev + 1)
    }
    function startAddingCustomInputHandler() {
        if (!isNormal) {
            return;
        }
        setCompState({ type: 'addingCustomInputHandler', previousState: compState });
    }
    function cancelAddingCustomInputHandler() {
        if (compState.type !== 'addingCustomInputHandler') {
            return;
        }
        setCompState(compState.previousState);
    }
    function startUpdatingInputHandler(handlerIndex: number) {
        if (!isNormal) {
            return;
        }
        setCompState({ type: 'settingsPanel', handlerIndex, previousState: compState });
    }
    function cancelUpdatingInputHandler() {
        if (compState.type !== 'settingsPanel') {
            return;
        }
        setCompState(compState.previousState);
    }
    function inputHandlerAdded(handler: InputHandler) {
        if (compState.type !== 'addingCustomInputHandler') {
            return;
        }
        pAddInputHandler(handler);
        setCompState(compState.previousState);
        inputHandlers.push(handler); // TODO need to find out why this would work...
    }
    function updateInputHandler(handler: InputHandler) {
        if (compState.type !== 'settingsPanel') {
            return;
        }
        updateInputHandlerInLocalStorage(chatID, compState.handlerIndex, handler);
        inputHandlers[compState.handlerIndex] = handler;
        setCompState(compState.previousState);
    }
    function updateInputSettingsPayload(payload: object) {
        updateInputSettingsPayloadInLocalStorage(chatID, payload);
    }

    useEffect(() => {
        if (msgListSwitchSignal.type === 'backFromFollowUpDiscussion') {
            setCompState({ type: 'waitingApproval', message: msgListSwitchSignal.message, revisedMsg: msgListSwitchSignal.handledMsg, revisionInstruction: msgListSwitchSignal.handlerInstruction });
        }
    }, [msgListSwitchSignal])

    function calculateTextAreaHeight(): number {
        // TODO
        // if (textAreaRef.current) {
        //     const textAreaRect = textAreaRef.current.getBoundingClientRect();
        //     return window.innerHeight - textAreaRect.top;
        // }
        return 170; // by default
    }
    const chatSettings = useContext(ChatSettingsContext)
    const inputComponentType = chatSettings?.inputComponent.type
    return <div className={`flex flex-col relative border rounded-2xl py-2 px-2 ${className}`}
        onKeyDown={(e) => {
            inputHandlers.forEach((handler, i) => {
                if (handler.shortcutKeyCallback && handler.shortcutKeyCallback(e)) {
                    const ii = i;
                    e.preventDefault();
                    startHandler(ii);
                    return;
                }
            });
        }}>
        {/* top bar */}
        <div className="flex flex-row px-2 mb-1">
            {/* top bar - input handler icons */}
            <div className="flex flex-row">
                {inputHandlers.map((h, index) => {
                    // loading effect while handling input
                    if (compState.type === 'revising' && compState.revisingIndex === index) {
                        return <div key={index} id={`input-handler-${index}`}>
                            <IconCircleWrapper width={35} height={35}>
                                <Oval height={17} width={17} color="#959595" secondaryColor="#959595" strokeWidth={4} strokeWidthSecondary={4} />
                            </IconCircleWrapper>
                        </div>
                    }
                    const SettingsPanel = h.settingsPanel();
                    const configurable = SettingsPanel !== undefined;
                    // icons to display in normal status
                    return <div key={index}>
                        <div id={`input-handler-${index}`}>
                            <IconCircleWrapper
                                width={35}
                                height={35}
                                onClick={() => {
                                    const ii = index;
                                    startHandler(ii);
                                }}
                                allowClick={compState.type === 'normal' && h.isCompatibleWith(compState.message)}
                            >
                                {h.iconNode}
                            </IconCircleWrapper>
                        </div>
                        <Tooltip anchorSelect={`#input-handler-${index}`} clickable delayShow={300} delayHide={0} style={{ borderRadius: '0.75rem' }}>
                            <I18nText i18nText={h.tooltip()} />
                            {configurable && <div className="flex flex-row justify-end items-center mt-3">
                                <LuSettings className="text-white cursor-pointer" onClick={() => startUpdatingInputHandler(index)} />
                            </div>}
                        </Tooltip>
                        {compState.type === 'settingsPanel' && compState.handlerIndex === index && configurable &&
                            <>
                                <SemiTransparentOverlay onClick={cancelUpdatingInputHandler} />
                                <SettingsPanel updateHandler={updateInputHandler} />
                            </>
                        }
                    </div>
                })}
                <div id="input-handler-creator-entry">
                    <IconCircleWrapper width={35} height={35} onClick={startAddingCustomInputHandler}>
                        <FiPlus />
                    </IconCircleWrapper>
                </div>
                <Tooltip anchorSelect="#input-handler-creator-entry" clickable delayShow={300} delayHide={0} style={{ borderRadius: '0.75rem' }}>
                    <span>{t('addCustomInstruction')}</span>
                </Tooltip>
                {compState.type === 'addingCustomInputHandler' && <CustomInputHandlerCreator cancelCallback={cancelAddingCustomInputHandler} inputHandlerAdded={inputHandlerAdded} />}
            </div >
        </div>
        {/* revision DiffView pop-up */}
        {
            // TODO bug: line wrapping for content
            waitingForApproval && (inputComponentType === 'textInput' ?
                <DiffView className={`absolute w-fit min-w-[700px] max-w-[1300px] bg-white`} style={{ bottom: `${calculateTextAreaHeight()}px` }}
                    originalMsg={compState.message} revisedMsg={compState.revisedMsg} allowFollowUpDiscussion={allowFollowUpDiscussion}
                    approveRevisionCallback={approveHandlerResult} rejectRevisionCallback={rejectHandlerResult}
                    startFollowUpDiscussion={(messageToRevise: Message, revisedText: Message) => {
                        if (!waitingForApproval) return
                        setCompState({ type: 'normal', message: new TextMessage(compState.message.role, ''), fromRevision: false });
                        // TODO feat: focus on the text area after the follow up discussion is started
                        // textAreaRef.current?.focus();
                        startFollowUpDiscussion(compState.revisionInstruction, messageToRevise, revisedText);
                    }} /> : <TutorialDiffView className={`absolute w-fit min-w-[700px] max-w-[1300px] bg-white`} style={{ bottom: `${calculateTextAreaHeight()}px` }}
                        originalMsg={compState.message} revisedMsg={compState.revisedMsg} allowFollowUpDiscussion={allowFollowUpDiscussion}
                        approveRevisionCallback={approveHandlerResult} rejectRevisionCallback={rejectHandlerResult}
                        startFollowUpDiscussion={(messageToRevise: Message, revisedText: Message) => {
                            if (!waitingForApproval) return
                            setCompState({ type: 'normal', message: new TextMessage(compState.message.role, ''), fromRevision: false });
                            startFollowUpDiscussion(compState.revisionInstruction, messageToRevise, revisedText);
                        }} />)
        }
        {/* message input area */}
        {inputComponentType === 'textInput' && <TextInput msgListSwitchSignal={msgListSwitchSignal} allowEdit={isNormal}
            addMessage={addMesssage} updateMessage={updateMessage}
            revisionMessage={isNormal ? [compState.message, compState.fromRevision] : undefined} rejectionSignal={rejectionSignal} />}
        {inputComponentType === 'tutorialInput' && <TutorialInput msgListSwitchSignal={msgListSwitchSignal} allowEdit={isNormal}
            addMessage={addMesssage} updateMessage={updateMessage} updateInputSettingsPayload={updateInputSettingsPayload}
            revisionMessage={isNormal ? [compState.message, compState.fromRevision] : undefined} rejectionSignal={rejectionSignal} />}
    </div>;
}

let enableVoiceModeShortcutTimer: NodeJS.Timeout

function TextInput(
    { allowEdit, msgListSwitchSignal, addMessage, updateMessage, revisionMessage }: {
        allowEdit: boolean
        msgListSwitchSignal: MsgListSwitchSignal
        updateMessage: (message: Message) => void
        addMessage: (message: Message, opts: messageAddedCallbackOptions) => void
        revisionMessage: [Message, boolean] | undefined // Updated when a revision is provided, initialized as undefined
        rejectionSignal: number, // Signal to indicate rejection of a revision
    }
) {
    const { t } = useTranslation();
    type typingOrVoiceMode = { type: 'typing' } | { type: 'voiceMode', autoSend: boolean };
    const [inputState, setInputState] = useState<
        | { type: 'noEdit', recoverState: typingOrVoiceMode }
        | { type: 'typing' }
        | { type: 'voiceMode', autoSend: boolean }
        | { type: 'recording', recorder: IMediaRecorder, stream: MediaStream, previousState: typingOrVoiceMode }
        | { type: 'transcribing', previousState: typingOrVoiceMode }
    >(allowEdit ? { type: 'typing' } : { type: 'noEdit', recoverState: { type: 'typing' } });
    const allowEditRef = useRef(allowEdit)
    useEffect(() => {
        // only trigger when allowEdit changes
        if (allowEdit == allowEditRef.current) { return }
        allowEditRef.current = allowEdit
        if (inputState.type !== 'noEdit' && !allowEdit) {
            let recoverState: typingOrVoiceMode
            if (inputState.type === 'typing') {
                recoverState = { type: 'typing' }
            } else if (inputState.type === 'voiceMode') {
                recoverState = { type: 'voiceMode', autoSend: inputState.autoSend }
            } else {
                recoverState = inputState.previousState
            }
            setInputState({ type: 'noEdit', recoverState: recoverState })
        } else if (inputState.type === 'noEdit' && allowEdit) {
            setInputState(inputState.recoverState)
            setTimeout(() => {
                if (inputState.recoverState.type === 'voiceMode') {
                    inputDivRef.current?.focus()
                } else {
                    textAreaRef.current?.focus()
                }
            }, 100);
        }
    }, [allowEdit, inputState])

    const isTyping = inputState.type === 'typing'
    const isVoiceMode = inputState.type === 'voiceMode'
    const isRecording = inputState.type === 'recording'
    const isTranscribing = inputState.type === 'transcribing'

    const defaultRole = 'user'
    const [showRoleMenu, setShowRoleMenu] = useState(false);

    const [msg, setMsg] = useState<TextMessage>(new TextMessage(defaultRole, ''))
    // Sync msg changes to the parent component
    useEffect(() => {
        updateMessage(msg)
    }, [msg, updateMessage])

    // update msg when a revision is provided
    useEffect(() => {
        if (revisionMessage && revisionMessage[0] instanceof TextMessage && revisionMessage[1]) {
            setMsg(revisionMessage[0]);
            textAreaRef.current?.focus() // After the revision is applied, for convenience, focus the text area for the user to continue typing
        }
    }, [msg.content, revisionMessage])

    useEffect(() => {
        if (msgListSwitchSignal.type === 'switchChat' || msgListSwitchSignal.type === 'followUpDiscussion') {
            setMsg(new TextMessage(defaultRole, ''))
            setTimeout(() => {
                if (inputState.type === 'voiceMode') {
                    inputDivRef.current?.focus()
                } else {
                    textAreaRef.current?.focus()
                }
            }, 100);
        }
    }, [msgListSwitchSignal])

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const inputDivRef = useRef<HTMLDivElement>(null);

    // inputState convertors
    function handleSend(msg: TextMessage, callbackOpts: messageAddedCallbackOptions = { generateAssistantMsg: true }) {
        if (inputState.type !== 'typing' && inputState.type !== 'voiceMode') return;
        if (msg.content.trim() === "") return;
        addMessage(msg, callbackOpts);
        setMsg(prev => new TextMessage(prev.role, ''));
        if (inputState.type === 'typing') {
            textAreaRef.current?.focus();
        }
    }
    const startRecording = async () => {
        if (inputState.type !== 'typing' && inputState.type !== 'voiceMode') {
            return
        }
        const { MediaRecorder, register } = await import("extendable-media-recorder");
        const { connect } = await import("extendable-media-recorder-wav-encoder");
        if (!MediaRecorder.isTypeSupported('audio/wav')) {
            await register(await connect());
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/wav' })
        setInputState(prev => ({ type: 'recording', recorder: recorder, stream: stream, previousState: prev as typingOrVoiceMode }))

        const audioChunks: Blob[] = []
        recorder.addEventListener("dataavailable", event => {
            audioChunks.push(event.data)
        })
        recorder.addEventListener("stop", () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
            startTranscribing(audioBlob, inputState)
        })
        recorder.start()
    }
    const stopRecording = async () => {
        if (inputState.type !== 'recording') {
            return
        }
        inputState.recorder.stop();
        // https://stackoverflow.com/questions/44274410/mediarecorder-stop-doesnt-clear-the-recording-icon-in-the-tab
        inputState.stream.getTracks().forEach(track => track.stop())
        setInputState({ type: 'transcribing', previousState: inputState.previousState })
    }
    const startTranscribing = (audioBlob: Blob, previousState: typingOrVoiceMode) => {
        const form = new FormData();
        form.append("model", "FunAudioLLM/SenseVoiceSmall");
        form.append("file", audioBlob, "recording.wav");

        fetch('/api/stt', {
            method: 'POST',
            body: form
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const newMsg = msg.updateContent(msg.content + data.text);
                setMsg(newMsg);
                setInputState(previousState)
                if (previousState.type === 'voiceMode' && previousState.autoSend) {
                    handleSend(newMsg)
                }
                if (previousState.type === 'typing') {
                    textAreaRef.current?.focus();
                }
            })
            .catch(err => {
                console.error(err);
                stopRecording();
            });
    };
    const enableVoiceMode = () => {
        if (inputState.type !== 'typing') return;
        setInputState({ type: 'voiceMode', autoSend: false })
        inputDivRef.current?.focus();
    }
    const disableVoiceMode = () => {
        if (inputState.type !== 'voiceMode') return;
        setInputState({ type: 'typing' })
        textAreaRef.current?.focus();
    }
    const clearMessageInVoiceMode = () => {
        if (inputState.type !== 'voiceMode') return;
        setMsg(msg.updateContent(''))
    }
    const toggleAutoSend = () => {
        if (inputState.type !== 'voiceMode') return;
        setInputState({ type: 'voiceMode', autoSend: !inputState.autoSend })
    }

    return <div ref={inputDivRef} tabIndex={0} className="flex flex-col focus:outline-none"
        onKeyDown={(e) => e.key === ' ' && isVoiceMode && startRecording()}
        // TODO bug: if the space key is released too soon right after pressing it, the recording will not stop
        onKeyUp={
            (e) => {
                if (e.key === ' ' && isRecording && inputState.previousState.type === 'voiceMode') { stopRecording() }
                if (e.key === 'i' && isVoiceMode) { disableVoiceMode() }
                if (e.key === 'Enter' && isVoiceMode) { handleSend(msg) }
                if (e.key === 'Backspace' && isVoiceMode) { clearMessageInVoiceMode() }
            }
        }
    >
        {/* Text input and preview area */}
        <textarea
            className={`flex-1 p-4 resize-none focus:outline-none ${!isTyping && "cursor-default"}`}
            ref={textAreaRef}
            placeholder={
                (isVoiceMode
                    || (inputState.type === 'recording' && inputState.previousState.type === 'voiceMode')
                    || (inputState.type === 'transcribing' && inputState.previousState.type === 'voiceMode')
                    || (inputState.type === 'noEdit' && inputState.recoverState.type === 'voiceMode')
                )
                    ? t('recordingTips')
                    : `${t('typeMessage')}\n${t('sendTips')}`
            }
            value={msg.content} onChange={(e) => setMsg(msg.updateContent(e.target.value))}
            readOnly={!isTyping}
            onKeyUp={(e) => {
                if (e.key === 'v') {
                    clearTimeout(enableVoiceModeShortcutTimer)
                    setMsg(msg.updateContent(msg.content + 'v'))
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'v' && !(e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    enableVoiceModeShortcutTimer = setTimeout(() => {
                        enableVoiceMode()
                    }, 1000)
                }
                // if (e.key === 'Enter' && e.ctrlKey) {
                //     e.preventDefault();
                //     handleSend(msg, { generateAssistantMsg: false });
                //     return;
                // }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(msg);
                    return;
                }
            }} rows={2} />
        {/* Bottom Bar */}
        <div className="flex flex-row items-center justify-between">
            {/* current message role */}
            <div className="relative flex flex-row rounded-full hover:bg-gray-300 invisible">
                <div className="flex flex-row p-1 px-3" onClick={() => {}}>
                    <LuUserCog2 className="mr-2" size={25} /> <span className="font-bold">{msg.role}</span>
                </div>
                {showRoleMenu && (
                    <>
                        <div className="fixed inset-0 z-10 bg-black opacity-0" onClick={() => setShowRoleMenu(false)}></div>
                        <div className="absolute bottom-full left-0 mb-1 p-2 bg-white border border-gray-300 rounded-lg z-20">
                            {/* Add role options here */}
                            <div className="cursor-pointer hover:bg-gray-200 p-2" onClick={() => { setMsg(prev => new TextMessage(SpecialRoles.SYSTEM, prev.content)); setShowRoleMenu(false); }}>{t('system')}</div>
                            <div className="cursor-pointer hover:bg-gray-200 p-2" onClick={() => { setMsg(prev => new TextMessage(SpecialRoles.ASSISTANT, prev.content)); setShowRoleMenu(false); }}>{t('assistant')}</div>
                            <div className="cursor-pointer hover:bg-gray-200 p-2" onClick={() => { setMsg(prev => new TextMessage(SpecialRoles.USER, prev.content)); setShowRoleMenu(false); }}>{t('user')}</div>
                        </div>
                    </>
                )}
            </div>
            {/* voice control buttons */}
            <div className="flex flex-row items-center">
                {(isVoiceMode
                    || (inputState.type === 'recording' && inputState.previousState.type === 'voiceMode')
                    || (inputState.type === 'transcribing' && inputState.previousState.type === 'voiceMode')
                    || (inputState.type === 'noEdit' && inputState.recoverState.type === 'voiceMode')
                )
                    && <label id="auto-send-label" className={`flex items-center mr-2 cursor-pointer`}>
                        <span className="mr-1">{t('Auto Send')}</span>
                        <Switch
                            disabled={!isVoiceMode}
                            checked={isVoiceMode && inputState.autoSend
                                // while recording and transcribing, keep what was set before
                                || (inputState.type === 'recording' && inputState.previousState.type === 'voiceMode' && inputState.previousState.autoSend)
                                || (inputState.type === 'transcribing' && inputState.previousState.type === 'voiceMode' && inputState.previousState.autoSend)
                                || (inputState.type === 'noEdit' && inputState.recoverState.type === 'voiceMode' && inputState.recoverState.autoSend)
                            }
                            onChange={toggleAutoSend}
                            className={`mr-2`} width={28} height={17} uncheckedIcon={false} checkedIcon={false} onColor="#000000"
                        />
                    </label>
                }
                <Tooltip
                    anchorSelect="#auto-send-label" delayShow={100} delayHide={0} place="top" style={{ borderRadius: '0.75rem' }}
                >{t('autoSendTips')}</Tooltip>
                <label id="voice-mode-label" className="flex items-center mr-2 cursor-pointer">
                    <span className="mr-1">{t('Voice Mode')}</span>
                    <Switch checked={
                        isVoiceMode
                        // while recording and transcribing, keep what was set before
                        || (inputState.type === 'recording' && inputState.previousState.type === 'voiceMode')
                        || (inputState.type === 'transcribing' && inputState.previousState.type === 'voiceMode')
                        || (inputState.type === 'noEdit' && inputState.recoverState.type === 'voiceMode')
                    }
                        onChange={(checked) => { return checked ? enableVoiceMode() : disableVoiceMode() }}
                        className="mr-2" width={28} height={17} uncheckedIcon={false} checkedIcon={false} onColor="#000000" />
                </label>
                <Tooltip
                    anchorSelect="#voice-mode-label"
                    delayShow={100}
                    delayHide={0}
                    place="top"
                    style={{ borderRadius: '0.75rem' }}
                >{t('voiceModeTips')}</Tooltip>
                <button
                    id="recording-button"
                    className="rounded-full bg-black hover:bg-gray-700 focus:outline-none"
                    onClick={isRecording ? stopRecording : startRecording}
                >
                    {isRecording ?
                        <div className="flex items-center justify-center w-16 h-8">
                            <Audio height={17} width={34} color="white" wrapperClass="p-2" />
                        </div> : (
                            isTranscribing ?
                                <div className="flex items-center justify-center w-16 h-8">
                                    <Oval height={17} width={17} color="#959595" secondaryColor="#959595" strokeWidth={4} strokeWidthSecondary={4} />
                                </div> :
                                <div className="flex items-center justify-center w-16 h-8">
                                    <FaMicrophone size={17} color="white" />
                                </div>
                        )
                    }
                </button>
                <Tooltip
                    anchorSelect="#recording-button" delayShow={100} delayHide={0} place="top" style={{ borderRadius: '0.75rem' }}
                >{t('recordingButtonTips')}</Tooltip>
            </div>
        </div>
    </div>
}

export function DiffView(
    { originalMsg, revisedMsg, approveRevisionCallback, rejectRevisionCallback, allowFollowUpDiscussion, startFollowUpDiscussion, style, className = "" }: {
        originalMsg: Message;
        revisedMsg: Message;
        allowFollowUpDiscussion: boolean;
        approveRevisionCallback: (revisedText: string) => void;
        rejectRevisionCallback: () => void;
        startFollowUpDiscussion: (messageToRevise: Message, revisedText: Message) => void;
        className?: string;
        style: object;
    }
) {
    const { t } = useTranslation();

    const [editedText, setEditedText] = useState((revisedMsg as unknown as OpenAILikeMessage).toOpenAIMessage().content);
    const originalText = (originalMsg as unknown as OpenAILikeMessage).toOpenAIMessage().content

    const changes = diffChars(originalText, editedText);
    const hasOnlyAdditions = changes.every(change => !change.removed);
    const [showDiff, setShowDiff] = useState(!hasOnlyAdditions);

    const [isEditing, setIsEditing] = useState(false);
    const [tempEditText, setTempEditText] = useState(editedText);

    const [blurText, setBlurText] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, []);

    // 当切换到编辑模式时，初始化临时编辑文本
    useEffect(() => {
        if (isEditing) {
            setTempEditText(editedText);
        }
    }, [isEditing, editedText]);

    const handleSave = () => {
        setEditedText(tempEditText);
        setIsEditing(false);
    };

    return (
        <div className={`p-4 pb-2 rounded-lg border-2 shadow-md focus:outline-none ${className}`} style={style}
            tabIndex={0} ref={containerRef}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }}
            onKeyUp={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (e.key === 'Enter') {
                    approveRevisionCallback(editedText);
                } else if (e.key === 'Backspace') {
                    rejectRevisionCallback();
                } else if (e.key === 'Tab') {
                    startFollowUpDiscussion(originalMsg, new TextMessage(revisedMsg.role, editedText));
                }
            }}>
            {changes.length > 0 && (
                <div className="flex flex-col relative">
                    {/* 文本显示区域 */}
                    <div className="mb-4">
                        {isEditing ? (
                            <textarea
                                className="w-full min-h-[100px] p-2 rounded bg-[#F6F5F5] focus:outline-none resize-none"
                                value={tempEditText}
                                onChange={(e) => setTempEditText(e.target.value)}
                                autoFocus
                            />
                        ) : (
                            <div className={`${blurText ? 'blur-sm' : ''}`}>
                                {showDiff ? (
                                    changes.map((change, index) => (
                                        <span key={index} className={`${change.added ? 'bg-green-200' : change.removed ? 'bg-red-200 line-through text-gray-500' : ''}`}>
                                            {change.value}
                                        </span>
                                    ))
                                ) : (
                                    <div className="whitespace-pre-wrap break-words">
                                        {editedText}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* 按钮和其他控件 */}
                    <div className="flex flex-row justify-between items-center">
                        {/* 左侧控制项 */}
                        <div className="flex flex-row items-center">
                            {/* show diff */}
                            <span className="mr-1 text-sm text-gray-600">{t('Show Diff')}</span>
                            <Switch
                                checked={showDiff}
                                onChange={setShowDiff}
                                width={28}
                                height={17}
                                uncheckedIcon={false}
                                checkedIcon={false}
                                disabled={isEditing}
                                className="mr-2"
                                onColor="#000000"
                            />
                            {/* blur text */}
                            <>
                                <span className="mr-1 text-sm text-gray-600">{t('Blur Text')}</span>
                                <Switch
                                    checked={blurText}
                                    onChange={setBlurText}
                                    width={28}
                                    height={17}
                                    uncheckedIcon={false}
                                    checkedIcon={false}
                                    className="mr-2"
                                    onColor="#000000"
                                />
                            </>
                            {/* 编辑按钮 */}
                            {isEditing ? (
                                <TmpFilledButton
                                    className="py-0 px-2 rounded-md text-[13px]"
                                    onClick={handleSave}
                                > {t('Save')}</TmpFilledButton>
                            ) : (
                                <>
                                    <div id="edit-button" className="flex flex-row items-center">
                                        <TmpTransparentButton
                                            className={`py-0 px-2 text-[13px] ${showDiff ? 'cursor-not-allowed opacity-50' : ''}`}
                                            onClick={() => !showDiff && setIsEditing(true)}
                                        >
                                            <TbPencil className="inline-block mr-1" size={16} /> {t('Edit')}
                                        </TmpTransparentButton>
                                    </div>
                                    {showDiff && (
                                        <Tooltip
                                            anchorSelect="#edit-button"
                                            delayShow={100}
                                            delayHide={0}
                                            place="top"
                                            style={{ borderRadius: '0.75rem' }}
                                        >
                                            {t('Please turn off diff view to edit')}
                                        </Tooltip>
                                    )}
                                </>
                            )}
                        </div>
                        {/* 右侧操作按钮 */}
                        <div className="flex flex-row">
                            <TmpFilledButton
                                className="py-0 px-2 mr-2 rounded-md text-[13px]"
                                onClick={() => { approveRevisionCallback(editedText); }}
                            >
                                <PiKeyReturnBold className="inline-block mr-1" size={20} color="white" /> {t('Approve')}
                            </TmpFilledButton>
                            <TmpTransparentButton
                                className="py-0 px-1 mr-2 rounded-lg text-gray-500 text-[15px]"
                                onClick={rejectRevisionCallback}
                            >
                                <FaBackspace className="inline-block mr-1" color="6b7280" /> {t('Reject')}
                            </TmpTransparentButton>
                            {allowFollowUpDiscussion &&
                                <button
                                    className="mr-2 py-0 px-1 rounded-lg text-[15px] text-gray-500"
                                    onClick={() => startFollowUpDiscussion(originalMsg, new TextMessage(revisedMsg.role, editedText))}
                                >
                                    <LiaComments className="inline-block mr-1" color="6b7280" /> {t('Follow-up discussions')}
                                </button>
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
