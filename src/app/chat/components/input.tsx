"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FaBackspace, FaMicrophone, FaSpellCheck } from "react-icons/fa";
import { LuUserCog2 } from "react-icons/lu";
import { MdGTranslate } from "react-icons/md";
import { Audio, Oval } from "react-loader-spinner";
import { messageAddedCallbackOptions } from "./chat";
import { IconCircleWrapper, TextMessage } from "./message";
import { diffChars } from "diff";
import { LiaComments } from "react-icons/lia";
import { PiKeyReturnBold } from "react-icons/pi";
import { Message } from "../lib/message";
import { chatCompletion } from "../lib/chat-server";
import Switch from "react-switch"
import { IMediaRecorder } from "extendable-media-recorder";
import { Tooltip } from "react-tooltip";
import { TbPencilQuestion } from "react-icons/tb";
import { FiPlus } from "react-icons/fi";
import { addInputHandlerToLocalStorage } from "../lib/chat";
import { IoMdInformationCircleOutline } from "react-icons/io";

enum InputHandlerTypes {
    Generation = "generation",
    Revision = "revision"
}

// 定义全局的 InputHandlerHub
class InputHandlerHub {
    private handlerMap: Map<string, (serialized: string) => InputHandler> = new Map();

    registerHandler(implType: string, deserialize: (serialized: string) => InputHandler) {
        this.handlerMap.set(implType, deserialize);
    }

    getHandlerClassByImplType(implType: string): ((serialized: string) => InputHandler) | undefined {
        return this.handlerMap.get(implType);
    }
}

// 创建一个全局的 InputHandlerHub 实例
export const inputHandlerHub = new InputHandlerHub();

export abstract class InputHandler {
    readonly implType: string
    readonly type: InputHandlerTypes

    iconNode: React.ReactNode
    shortcutKeyCallback?: (e: React.KeyboardEvent) => boolean;
    // TODO declare compatible message types

    constructor(implType: string, type: InputHandlerTypes) {
        this.implType = implType;
        this.type = type;
    }

    abstract tooltip(lang: string): string
    abstract instruction(): string

    abstract serialize(): string;

    static deserialize(serialized: string): InputHandler {
        const { implType } = JSON.parse(serialized);
        const deserialize = inputHandlerHub.getHandlerClassByImplType(implType);
        if (deserialize) {
            return deserialize(serialized);
        } else {
            throw new Error(`未实现 implType 为 ${implType} 的反序列化方法`);
        }
    }
}

export class TranslationHandler extends InputHandler {
    targetLanguage: string

    constructor(targetLanguage: string) {
        super('translation', InputHandlerTypes.Revision)
        this.targetLanguage = targetLanguage
        this.iconNode = <MdGTranslate size={20} />
        this.shortcutKeyCallback = (e: React.KeyboardEvent) => e.key === 'k' && (e.metaKey || e.ctrlKey)
    }

    tooltip(lang: string): string {
        // TODO introduce real i18n solution
        if (lang.startsWith("zh")) {
            return `将消息内容翻译为 ${this.targetLanguage}`
        } else {
            return `Translate the message into ${this.targetLanguage}.`
        }
    }

    instruction(): string {
        return `Translate it into ${this.targetLanguage} to express the same meaning.`
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            targetLanguage: this.targetLanguage
        });
    }

    static deserialize(serialized: string): TranslationHandler {
        const { targetLanguage } = JSON.parse(serialized);
        return new TranslationHandler(targetLanguage);
    }
}

export class RespGenerationHandler extends InputHandler {
    constructor() {
        super('respGeneration', InputHandlerTypes.Generation);
        this.iconNode = <TbPencilQuestion size={20} />;
        this.shortcutKeyCallback = (e: React.KeyboardEvent) => e.key === '/' && (e.metaKey || e.ctrlKey);
    }

    tooltip(lang: string): string {
        if (lang.startsWith("zh")) {
            return "协助生成对应的回复";
        } else {
            return "Help generate a response.";
        }
    }

    instruction(): string {
        return "Help me respond it.";
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type
        });
    }

    static deserialize(): RespGenerationHandler {
        return new RespGenerationHandler();
    }
}

export class CommonGenerationHandler extends InputHandler {
    _instruction: string
    _tooltip: string
    _toolTipKey?: string
    _iconChar: string

    constructor(instruction: string, tooltip: string, iconChar: string, toolTipKey?: string) {
        super('commonGeneration', InputHandlerTypes.Generation);
        this._instruction = instruction;
        this._tooltip = tooltip;
        this._toolTipKey = toolTipKey;
        this._iconChar = iconChar;
        this.iconNode = <span>{iconChar}</span>;
    }

    tooltip(): string {
        return this._tooltip;
    }

    instruction(): string {
        return this._instruction;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            instruction: this._instruction,
            tooltip: this._tooltip,
            toolTipKey: this._toolTipKey,
            iconChar: this._iconChar
        });
    }

    static deserialize(serialized: string): CommonGenerationHandler {
        const { instruction, tooltip, iconChar, toolTipKey } = JSON.parse(serialized);
        return new CommonGenerationHandler(instruction, tooltip, iconChar, toolTipKey);
    }
}

export class CommonRevisionHandler extends InputHandler {
    _instruction: string
    _tooltip: string
    _iconChar: string
    _toolTipKey?: string

    constructor(instruction: string, tooltip: string, iconChar: string, toolTipKey?: string) {
        super('commonRevision', InputHandlerTypes.Revision);
        this._instruction = instruction;
        this._tooltip = tooltip;
        this._iconChar = iconChar;
        this._toolTipKey = toolTipKey;
    }

    tooltip(): string {
        return this._tooltip;
    }

    instruction(): string {
        return this._instruction;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            instruction: this._instruction,
            tooltip: this._tooltip,
            toolTipKey: this._toolTipKey,
            iconChar: this._iconChar
        });
    }

    static deserialize(serialized: string): CommonRevisionHandler {
        const { instruction, tooltip, iconChar, toolTipKey } = JSON.parse(serialized);
        return new CommonRevisionHandler(instruction, tooltip, iconChar, toolTipKey);
    }
}

export class GrammarCheckingHandler extends InputHandler {
    constructor() {
        super('grammarChecking', InputHandlerTypes.Revision);
        this.iconNode = <FaSpellCheck size={20} className="ml-[-2px]" />;
        this.shortcutKeyCallback = (e: React.KeyboardEvent) => e.key === 'g' && (e.metaKey || e.ctrlKey);
    }

    tooltip(lang: string): string {
        // TODO introduce real i18n solution
        if (lang.startsWith("zh")) {
            return "检查并修正可能存在的语法问题";
        } else {
            return "Correct potential grammar issues";
        }
    }

    instruction(): string {
        return "Correct potential grammar issues.";
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type
        });
    }

    static deserialize(): GrammarCheckingHandler {
        return new GrammarCheckingHandler();
    }
}

// 在这里注册所有的 InputHandler 子类
inputHandlerHub.registerHandler('translation', TranslationHandler.deserialize);
inputHandlerHub.registerHandler('respGeneration', RespGenerationHandler.deserialize);
inputHandlerHub.registerHandler('grammarChecking', GrammarCheckingHandler.deserialize);
inputHandlerHub.registerHandler('commonGeneration', CommonGenerationHandler.deserialize);
inputHandlerHub.registerHandler('commonRevision', CommonRevisionHandler.deserialize);

export async function reviseMessage(
    messageToRevise: string,
    userInstruction: string,
    historyMessages: Message[],
    includeHistory: boolean = true,
    historyMessageCount: number | undefined = undefined) {

    const historyContext = includeHistory ?
        historyMessages.slice(-(historyMessageCount ?? historyMessages.length)).
            filter((msg) => msg.includedInChatCompletion).
            map(msg => `[START]${msg.role}: ${msg.toJSON().content}[END]`).join('\n') : "";

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
    const rawJson = await chatCompletion(messages);
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
            map(msg => `[START]${msg.role}: ${msg.toJSON().content}[END]`).join('\n') : "";

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
    const rawJson = await chatCompletion(messages);
    const recommended = JSON.parse(rawJson).recommended;
    return recommended;
}


// Temporarily use this to convert message to text for revision
function messageToText(message: Message): string {
    return message.toJSON().content
}

export type MessageInputState =
    | { type: 'init' }
    | { type: 'normal'; message: Message; fromRevision: boolean }
    | { type: 'addingCustomInputHandler', previousState: MessageInputState }
    | { type: 'revising'; message: Message; revisingIndex: number; }
    | { type: 'waitingApproval'; message: Message; revisedMsg: Message; revisionInstruction: string; };

export function MessageInput({
    chatID, messageList, inputHandlers, addMesssage, chatKey, allowFollowUpDiscussion, startFollowUpDiscussion, className = ""
}: {
    chatID: string
    messageList: Message[];
    inputHandlers: InputHandler[]
    addMesssage: (message: Message, callbackOpts?: messageAddedCallbackOptions) => void;
    chatKey: number,
    allowFollowUpDiscussion: boolean;
    startFollowUpDiscussion: (userInstruction: string, messageToRevise: string, revisedText: string) => void;
    className?: string;
}) {

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
    async function startRevising(triggeredIndex: number) {
        if (!isNormal) {
            return;
        }
        const handler = inputHandlers[triggeredIndex]
        if (handler.type === InputHandlerTypes.Generation && !compState.message.isEmpty()) {
            return // TODO raise error
        }
        if (handler.type === InputHandlerTypes.Revision && compState.message.isEmpty()) {
            return
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
    function approveRevision(revisedText: string) {
        if (!waitingForApproval) {
            return;
        }
        setCompState({ type: 'normal', message: new TextMessage(compState.message.role, revisedText), fromRevision: true });
    }
    function rejectRevision() {
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
    function inputHandlerAdded(handler: InputHandler) {
        if (compState.type !== 'addingCustomInputHandler') {
            return;
        }
        addInputHandlerToLocalStorage(chatID, [handler]);
        setCompState(compState.previousState);
        inputHandlers.push(handler);
    }
    function calculateTextAreaHeight(): number {
        // TODO
        // if (textAreaRef.current) {
        //     const textAreaRect = textAreaRef.current.getBoundingClientRect();
        //     return window.innerHeight - textAreaRect.top;
        // }
        return 170; // by default
    }

    return <div className={`flex flex-col relative border rounded-2xl py-2 px-2 ${className}`}
        onKeyDown={(e) => {
            inputHandlers.forEach((handler, i) => {
                if (handler.shortcutKeyCallback && handler.shortcutKeyCallback(e)) {
                    const ii = i;
                    e.preventDefault();
                    startRevising(ii);
                    return;
                }
            });
        }}>
        {/* top bar */}
        <div className="flex flex-row px-2 mb-1">
            {/* top bar - revision entry icons */}
            <div className="flex flex-row">
                {inputHandlers.map((h, index) => {
                    // loading effect while revising
                    if (compState.type === 'revising' && compState.revisingIndex === index) {
                        return <div key={index} id={`input-handler-${index}`}>
                            <IconCircleWrapper width={35} height={35}>
                                <Oval height={17} width={17} color="#959595" secondaryColor="#959595" strokeWidth={4} strokeWidthSecondary={4} />
                            </IconCircleWrapper>
                        </div>
                    }
                    // icons to display in normal status
                    return <div key={index}>
                        <div id={`input-handler-${index}`}>
                            <IconCircleWrapper
                                width={35}
                                height={35}
                                onClick={() => {
                                    console.log(`startRevising ${index}`); // TODO remove
                                    const ii = index;
                                    startRevising(ii);
                                }}
                            >
                                {h.iconNode}
                            </IconCircleWrapper>
                        </div>
                        <Tooltip anchorSelect={`#input-handler-${index}`} clickable delayShow={300} delayHide={0} style={{ borderRadius: '0.75rem' }}>
                            <span>{h.tooltip(navigator.language)}</span>
                        </Tooltip>
                    </div>
                })}
                <div id="input-handler-creator-entry">
                    <IconCircleWrapper width={35} height={35} onClick={startAddingCustomInputHandler}>
                        <FiPlus />
                    </IconCircleWrapper>
                </div>
                <Tooltip anchorSelect="#input-handler-creator-entry" clickable delayShow={300} delayHide={0} style={{ borderRadius: '0.75rem' }}>
                    <span>Add your custom instruction</span>
                </Tooltip>
                {compState.type === 'addingCustomInputHandler' && <InputHandlerCreator cancelCallback={cancelAddingCustomInputHandler} inputHandlerAdded={inputHandlerAdded} />}
            </div >
        </div>
        {/* revision DiffView pop-up */}
        {
            // TODO 1. more appropriate max-width 2. line wrapping for content
            waitingForApproval && <DiffView className={`absolute w-fit min-w-[700px] max-w-[1000px] bg-white`} style={{ bottom: `${calculateTextAreaHeight()}px` }}
                originalText={messageToText(compState.message)} revisedText={messageToText(compState.revisedMsg)} allowFollowUpDiscussion={allowFollowUpDiscussion}
                approveRevisionCallback={approveRevision} rejectRevisionCallback={rejectRevision}
                startFollowUpDiscussion={(messageToRevise: string, revisedText: string) => {
                    if (!waitingForApproval) return
                    setCompState({ type: 'normal', message: new TextMessage(compState.message.role, ''), fromRevision: false });
                    // TODO
                    // textAreaRef.current?.focus();
                    startFollowUpDiscussion(compState.revisionInstruction, messageToRevise, revisedText);
                }} />}
        {/* message input area (perhaps calling it 'message constructor' would be more appropriate) */}
        <TextInput chatKey={chatKey} allowEdit={isNormal}
            addMessage={addMesssage} updateMessage={updateMessage}
            revisionMessage={isNormal ? [compState.message, compState.fromRevision] : undefined} rejectionSignal={rejectionSignal} />
    </div>;
}

let enableVoiceModeShortcutTimer: NodeJS.Timeout

function InputHandlerCreator({ cancelCallback, inputHandlerAdded }: { cancelCallback: () => void, inputHandlerAdded: (handler: InputHandler) => void }) {
    const [type, setType] = useState<InputHandlerTypes>(InputHandlerTypes.Generation);
    const [instruction, setInstruction] = useState('');
    const [tooltip, setTooltip] = useState('');
    const [icon, setIcon] = useState('');

    return (
        <>
            <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={cancelCallback}></div>
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50">
                {/* type selector */}
                <h2 className="text-2xl font-bold mb-4">Custom Instruction</h2>
                <div className="mb-4">
                    <label htmlFor="type" className="block text-gray-700 font-bold mb-2">Type</label>
                    <select id="type" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={type} onChange={(e) => setType(e.target.value as InputHandlerTypes)}>
                        <option value="generation">Generation</option>
                        <option value="revision">Modification</option>
                    </select>
                    <div className="flex flex-row items-start mt-1">
                        <IoMdInformationCircleOutline className="text-gray-400 mr-2 mt-1" />
                        {type === InputHandlerTypes.Generation && <p className="text-gray-400 text-base italic">
                            A generation instruction is to tell the AI to generate a response for you. It can only work while your input is empty. <br />
                            Try to keep the instruction concise and specific, telling the AI what the response should be like.
                        </p>}
                        {type === InputHandlerTypes.Revision && <p className="text-gray-400 text-base italic">
                            A modification instruction is to tell the AI to modify your current input. It can work while your input is not empty. <br />
                            You can use it to do something like correcting a grammar mistake, polishing your expression, or translating your input into another language.
                        </p>}
                    </div>
                </div>
                {/* instruction */}
                <div className="mb-4">
                    <label htmlFor="instruction" className="block text-gray-700 font-bold mb-2">Instruction</label>
                    <textarea id="instruction" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={instruction} onChange={(e) => setInstruction(e.target.value)}></textarea>
                </div>
                {/* tooltip */}
                <div className="mb-4">
                    <div className="flex flex-row items-center mb-2">
                        <label htmlFor="tooltip" className="block text-gray-700 font-bold mr-2">Tooltip</label>
                        <IoMdInformationCircleOutline className="text-gray-400" id="tooltip-info" />
                        <Tooltip anchorSelect="#tooltip-info" clickable delayShow={300} delayHide={0} style={{ borderRadius: '0.75rem' }}>
                            <span>The tooltip is the text that will be shown when you hover over the icon, like what you see here.</span>
                        </Tooltip>
                    </div>
                    <input type="text" id="tooltip" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={tooltip} onChange={(e) => setTooltip(e.target.value)}></input>
                </div>
                {/* icon */}
                <div className="mb-4">
                    <label htmlFor="icon" className="block text-gray-700 font-bold mb-2">Icon</label>
                    <input type="text" id="icon" maxLength={1} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="please enter only one character"
                        onChange={(e) => {
                            const value = Array.from(e.target.value)[0] || "";
                            setIcon(value);
                        }}></input>
                    <p className="text-gray-400 text-xs italic mt-1">Custom icon feature will be available soon. For now, please use a single character as icon.</p>
                </div>
                {/* add button */}
                <div className="flex items-center justify-end">
                    <button className="text-gray-400 font-bold py-2 px-4 rounded-lg bg-transparent mr-2" type="button" onClick={cancelCallback}>
                        Cancel
                    </button>
                    <button className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg" type="button"
                        onClick={() => {
                            if (type === InputHandlerTypes.Generation) {
                                inputHandlerAdded(new CommonGenerationHandler(instruction, tooltip, icon));
                            } else {
                                inputHandlerAdded(new CommonRevisionHandler(instruction, tooltip, icon));
                            }
                        }}>
                        Add
                    </button>
                </div>
            </div>
        </>
    );

}

function TextInput(
    { allowEdit, chatKey, addMessage, updateMessage, revisionMessage }: {
        allowEdit: boolean
        chatKey: number
        updateMessage: (message: Message) => void
        addMessage: (message: Message, opts: messageAddedCallbackOptions) => void
        revisionMessage: [Message, boolean] | undefined // Updated when a revision is provided, initialized as undefined
        rejectionSignal: number, // Signal to indicate rejection of a revision
    }
) {
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

    const defaultRole = 'user'
    const [role, setRole] = useState<'system' | 'user' | 'assistant'>(defaultRole);
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
        setMsg(new TextMessage(role, ''))
        setTimeout(() => {
            if (inputState.type === 'voiceMode') {
                inputDivRef.current?.focus()
            } else {
                textAreaRef.current?.focus()
            }
        }, 100);
    }, [chatKey]) // TODO fix the warning

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const inputDivRef = useRef<HTMLDivElement>(null);

    // inputState convertors
    function handleSend(msg: TextMessage, callbackOpts: messageAddedCallbackOptions = { generateAssistantMsg: true }) {
        if (inputState.type !== 'typing' && inputState.type !== 'voiceMode') return;
        if (msg.content.trim() === "") return;
        addMessage(msg, callbackOpts);
        setMsg(new TextMessage(role, ''));
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
        // TODO switch to server actions
        const form = new FormData();
        form.append("model", "FunAudioLLM/SenseVoiceSmall");
        form.append("file", audioBlob, "recording.wav");
        const options = {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
            },
            body: form
        };
        const apiUrl = process.env.NEXT_PUBLIC_STT_API_URL;
        if (!apiUrl) {
            throw new Error('API URL is not defined');
        }
        fetch(apiUrl, options)
            .then(response => {
                response.json().then(data => {
                    const newMsg = msg.updateContent(msg.content + data.text);
                    setMsg(newMsg);
                    setInputState(previousState)
                    if (previousState.type === 'voiceMode' && previousState.autoSend) {
                        handleSend(newMsg)
                    }
                    if (previousState.type === 'typing') {
                        textAreaRef.current?.focus();
                    }
                });
            }).catch(err => {
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
            placeholder={isTyping ? `Type your message here...\nPress Enter to send, Ctrl+Enter to add the message, Shift+Enter to add a new line` : `Press Space to start recording, release to stop`}
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
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleSend(msg, { generateAssistantMsg: false });
                    return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(msg);
                    return;
                }
            }} rows={2} />
        {/* Bottom Bar */}
        <div className="flex flex-row items-center justify-between">
            {/* current message role */}
            <div className="relative flex flex-row rounded-full hover:bg-gray-300">
                <div className="flex flex-row p-1 px-3 cursor-pointer" onClick={() => setShowRoleMenu(!showRoleMenu)}>
                    <LuUserCog2 className="mr-2" size={25} /> <span className="font-bold">{role}</span>
                </div>
                {showRoleMenu && (
                    <>
                        <div className="fixed inset-0 z-10 bg-black opacity-0" onClick={() => setShowRoleMenu(false)}></div>
                        <div className="absolute bottom-full left-0 mb-1 p-2 bg-white border border-gray-300 rounded-lg z-20">
                            {/* Add role options here */}
                            <div className="cursor-pointer hover:bg-gray-200 p-2" onClick={() => { setRole('system'); setShowRoleMenu(false); }}>system</div>
                            <div className="cursor-pointer hover:bg-gray-200 p-2" onClick={() => { setRole('assistant'); setShowRoleMenu(false); }}>assistant</div>
                            <div className="cursor-pointer hover:bg-gray-200 p-2" onClick={() => { setRole('user'); setShowRoleMenu(false); }}>user</div>
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
                    && <label className={`flex items-center mr-2`}>
                        <span className="mr-1">Auto Send</span>
                        <Switch
                            disabled={!isVoiceMode}
                            checked={isVoiceMode && inputState.autoSend
                                // while recording and transcribing, keep what was set before
                                || (inputState.type === 'recording' && inputState.previousState.type === 'voiceMode' && inputState.previousState.autoSend)
                                || (inputState.type === 'transcribing' && inputState.previousState.type === 'voiceMode' && inputState.previousState.autoSend)
                                || (inputState.type === 'noEdit' && inputState.recoverState.type === 'voiceMode' && inputState.recoverState.autoSend)
                            }
                            onChange={toggleAutoSend}
                            className={`mr-2`} width={34} height={17} uncheckedIcon={false} checkedIcon={false}
                        />
                    </label>
                }
                <label className="flex items-center mr-2">
                    <span className="mr-1">Voice Mode</span>
                    <Switch checked={
                        isVoiceMode
                        // while recording and transcribing, keep what was set before
                        || (inputState.type === 'recording' && inputState.previousState.type === 'voiceMode')
                        || (inputState.type === 'transcribing' && inputState.previousState.type === 'voiceMode')
                        || (inputState.type === 'noEdit' && inputState.recoverState.type === 'voiceMode')
                    }
                        onChange={(checked) => { return checked ? enableVoiceMode() : disableVoiceMode() }}
                        className="mr-2" width={34} height={17} uncheckedIcon={false} checkedIcon={false} />
                </label>
                <button
                    className="rounded-full bg-black hover:bg-gray-700 focus:outline-none"
                    onClick={isRecording ? stopRecording : startRecording}
                >
                    {isRecording ?
                        <div className="flex items-center justify-center w-16 h-8">
                            <Audio height={17} width={34} color="white" wrapperClass="p-2" />
                        </div> :
                        <div className="flex items-center justify-center w-16 h-8">
                            <FaMicrophone size={17} color="white" />
                        </div>
                    }
                </button>
            </div>
        </div>
    </div>
}

export function DiffView(
    { originalText, revisedText, approveRevisionCallback, rejectRevisionCallback, allowFollowUpDiscussion, startFollowUpDiscussion, style, className = "" }: {
        originalText: string;
        revisedText: string;
        allowFollowUpDiscussion: boolean;
        approveRevisionCallback: (revisedText: string) => void;
        rejectRevisionCallback: () => void;
        startFollowUpDiscussion: (messageToRevise: string, revisedText: string) => void;
        className?: string;
        style: object;
    }
) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, []);
    const changes = diffChars(originalText, revisedText);
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
                    approveRevisionCallback(revisedText);
                } else if (e.key === 'Backspace') {
                    rejectRevisionCallback();
                } else if (e.key === 'Tab') {
                    startFollowUpDiscussion(originalText, revisedText);
                }
            }}>
            {changes.length > 0 && (
                <div className="flex flex-col relative">
                    {/* diff text */}
                    <div className="flex flex-wrap mb-4">
                        {changes.map((change, index) => (
                            <div key={index} className={`inline-block whitespace-pre-wrap break-words ${change.added ? 'bg-green-200' : change.removed ? 'bg-red-200 line-through text-gray-500' : ''}`}>
                                {/* TODO fix displaying line break issue */}
                                {change.value}
                                {/* <div className="w-full whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{
                                __html: change.value.replace(/\n/g, '<br />').replace(/ /g, '&nbsp;'),
                            }} /> */}
                            </div>
                        ))}
                    </div>
                    {/* buttons */}
                    <div className="flex flex-row self-end">
                        <button className="mr-2 py-0 px-2 bg-gray-800 rounded-md text-[12px] text-white" onClick={() => { approveRevisionCallback(revisedText); }}>
                            <PiKeyReturnBold className="inline-block mr-1" color="white" /> Approve
                        </button>
                        <button className="mr-2 py-0 px-1 rounded-lg text-[15px] text-gray-500" onClick={rejectRevisionCallback}>
                            <FaBackspace className="inline-block mr-1" color="6b7280" /> Reject
                        </button>
                        {allowFollowUpDiscussion && <button className="mr-2 py-0 px-1 rounded-lg text-[15px] text-gray-500"
                            onClick={() => startFollowUpDiscussion(originalText, revisedText)}>
                            <LiaComments className="inline-block mr-1" color="6b7280" /> Follow-up discussions
                        </button>}
                    </div>
                </div>
            )}

        </div>
    );
}










