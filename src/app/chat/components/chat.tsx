"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { AddMesssageInChat, ChatLoader, UpdateMessageInChat as updateMessageInChat } from "../lib/chat"; // Changed to type-only import
import { MdGTranslate } from "react-icons/md";
import { chatCompletion, reviseMessageAction } from "../lib/chat-server";
import { TbPencilQuestion } from "react-icons/tb";
import { diffChars } from "diff";
import { PiKeyReturnBold } from "react-icons/pi";
import { FaBackspace, FaSpellCheck } from "react-icons/fa";
import { Oval } from "react-loader-spinner";
import { useImmer } from "use-immer";
import { type Message } from "../lib/message";
import { RecommendedRespMessage, TextMessage } from "./message";
import { LiaComments } from "react-icons/lia";
import { IoIosArrowDown } from "react-icons/io";

export function Chat({ chatID, loadChatByID, className = "" }: {
    chatID: string,
    loadChatByID: ChatLoader
    className?: string;
}) {
    // compState: normal, stacking
    const [messageListStack, updateMessageListStack] = useImmer<Message[][]>([])
    const [inputState, setInputState] = useState<MessageInputState>({ type: 'normal', messageContent: '' })
    const isTopLevel = messageListStack.length <= 1
    const currentMessageList = messageListStack.length > 0 ? messageListStack[messageListStack.length - 1] : []

    useEffect(() => {
        const messageList = loadChatByID(chatID)
        updateMessageListStack([messageList])
        setInputState({ type: 'normal', messageContent: '' })
    }, [chatID, loadChatByID, updateMessageListStack])

    async function addMesssage({ content, role = "user" }: { content: string, role?: string }) {
        const newInpuMessage = new TextMessage(role, content)
        if (isTopLevel) {
            AddMesssageInChat(chatID, newInpuMessage)
        }
        updateMessageListStack(draft => {
            draft[draft.length - 1].push(newInpuMessage)
        })
        // TODO consider how to trigger chat completion, note that in the future, we need to support adding messages without triggering chat completion
        const answer = await chatCompletion(
            [...currentMessageList, newInpuMessage].
                filter((msg) => msg.includedInChatCompletion).
                map((msg) => (msg.toJSON() as { role: string, content: string }))
        )
        if (isTopLevel) {
            AddMesssageInChat(chatID, new TextMessage('assistant', answer))
        }
        updateMessageListStack(draft => {
            draft[draft.length - 1].push(new TextMessage('assistant', answer))
        })
    }
    async function updateMessage(messageID: number, newMessage: Message) {
        if (!isTopLevel) {
            // only persist top-level messages
            return
        }
        const serialized = newMessage.serialize()
        updateMessageInChat(chatID, messageID, serialized)
    }

    function startFollowUpDiscussion(userInstruction: string, messageToRevise: string, revisedText: string) {
        const historyContext = true ?
            currentMessageList.slice(-currentMessageList.length).
                filter((msg) => msg.includedInChatCompletion).
                map(msg => `[START]${msg.role}: ${msg.toJSON().content}[END]`).join('\n') : ""
        const revisePrompt = `${true ? `This is an ongoing conversation:
        """
        ${historyContext}
        """` : ""}
        This is a message the user is about to send in conversation:
        """
        ${messageToRevise}
        """
        If the message is empty, it potentially means the user needs a answer suggestion.
    
        This is the user's instruction or question:
        """
        ${userInstruction}
        """

        Please provide a recommended response based on the user's instruction or question, considering the context of the conversation, and preserving the user's line breaks and formatting if any.

        IMPORTANT: The suggested_answer you generate is intended for the user to respond to a previous conversation, not to reply to the user's current instruction or question.
        `
        const nextLevelMessages: Message[] = [
            // 1. revise prompt with chat history, included in chat completion, but not displaying to users
            new TextMessage('user', revisePrompt, false, true),
            // 2. ai's json response, included in request but not displaying either
            new TextMessage('assistant', revisedText, false, true),
            // 3. the revised text, displaying but not included
            new RecommendedRespMessage('assistant', revisedText, true, false)
        ]
        updateMessageListStack(draft => { draft.push(nextLevelMessages) })
    }

    return <div className={`flex flex-col flex-grow items-center rounded-lg ${className}`}>
        {/* <div className={`self-start ml-[100px] font-bold text-xl pt-2 w-4/5 text-[#5f5f5f]`}>New Chat</div> */}
        {!isTopLevel &&
            <div className="hover:bg-gray-200 cursor-pointer py-2 w-4/5 flex justify-center"
                onClick={() => { updateMessageListStack(draft => { draft.pop() }); }}>
                <IoIosArrowDown size={30} color="#5f5f5f" />
            </div>}
        {/* <MessageList className="flex-grow overflow-y-auto" messageList={messageList} /> */}
        <MessageList className="flex-initial overflow-auto w-4/5 h-full" messageList={currentMessageList} updateMessage={updateMessage} />
        {/* <MessageInput className="bottom-0" addMesssage={addMesssage} /> */}
        <MessageInput className="w-4/5" addMesssage={addMesssage} messageList={currentMessageList}
            state={inputState} setState={setInputState}
            // Temporarily disallow nested multi-level discussions, the component has already supported, 
            // it's just the AI might be unable to handle too many levels
            allowFollowUpDiscussion={isTopLevel}
            startFollowUpDiscussion={startFollowUpDiscussion}
        />
    </div>
}

export function MessageList({ messageList, updateMessage, className }: {
    messageList: Message[]
    updateMessage: (messageID: number, newMessage: Message) => void,
    className?: string
}) {
    return <div className={`flex flex-col pb-5 ${className}`}>
        {messageList.
            filter((msg) => msg.displayToUser).
            map((message, index) => {
                const messageID = index
                const Comp = message.render()
                return <Comp key={index} className="mb-5"
                    updateMessage={(message: Message) => {
                        updateMessage(messageID, message)
                    }} />
            })}
    </div>
}


export function Role({ name, className }: {
    name: string;
    className?: string;
    avatarUrl?: string;
}) {
    return (
        <div className={`flex items-center p-1 ${className}`}>
            <span className="font-semibold">{name}</span>
        </div>
    );
}

export function MessageContent({ content, className = "" }: {
    content: string;
    className?: string;
}) {
    return (
        <div className={`bg-[#F6F5F5] rounded-lg w-fit max-w-[80%] p-2 ${className}`}>
            <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
        </div>
    );
}

// TODO consider where to put these types and functions

interface RevisionEntry {
    iconNode: React.ReactNode;
    userInstruction: string;
    // allow the icon to specify a callback to handle its custom shortcut 
    shortcutCallback?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

async function reviseMessage(
    messageToRevise: string,
    userInstruction: string,
    historyMessages: Message[],
    includeHistory: boolean = true,
    historyMessageCount: number | undefined = undefined
) {

    const historyContext = includeHistory ?
        historyMessages.slice(-(historyMessageCount ?? historyMessages.length)).
            filter((msg) => msg.includedInChatCompletion).
            map(msg => `[START]${msg.role}: ${msg.toJSON().content}[END]`).join('\n') : ""
    const translatePrompt = `${includeHistory ? `This is an ongoing conversation:
    """
    ${historyContext}
    """` : ""}
    This is a message the user is about to send in conversation:
    """
    ${messageToRevise}
    """
    If the message is empty, it potentially means the user needs a answer suggestion.

    This is the user's instruction or question:
    """
    ${userInstruction}
    """
    
    Please generate a suggestion based on the user's instruction or question, considering the context of the conversation, and return it in the following JSON format, while preserving the user's line breaks and formatting if any:
    """
    {
        "suggested_answer": "..."
    }
    """

    IMPORTANT: The suggested_answer you generate is intended for the user to respond to another conversation, not to reply to the user's current instruction or question.
    `
    const revisedText = await reviseMessageAction({ role: 'user', content: translatePrompt })
    return revisedText
}

type MessageInputState =
    | { type: 'normal', messageContent: string }
    | { type: 'revising', messageContent: string, revisingIndex: number }
    | { type: 'waitingApproval', messageContent: string, revisedText: string, revisingInstruction: string };

export function MessageInput({
    state: compState, setState: setCompState, messageList, addMesssage, allowFollowUpDiscussion, startFollowUpDiscussion, className = ""
}: {
    state: MessageInputState,
    setState: Dispatch<SetStateAction<MessageInputState>>
    messageList: Message[],
    addMesssage: (message: { content: string, role?: string }) => void,
    allowFollowUpDiscussion: boolean
    startFollowUpDiscussion: (userInstruction: string, messageToRevise: string, revisedText: string) => void
    className?: string,
}) {

    const messageContent = compState.messageContent
    const textAreaRef = useRef<HTMLTextAreaElement>(null)
    const isNormal = compState.type === 'normal'
    const waitingForApproval = compState.type === 'waitingApproval'

    function handleSend() {
        if (!isNormal) {
            return
        }
        if (messageContent.trim() === "") return;
        addMesssage({ content: messageContent });
        setCompState({ type: 'normal', messageContent: '' })
    }

    async function startRevising(triggeredIndex: number) {
        if (!isNormal) {
            return
        }
        setCompState({ type: 'revising', revisingIndex: triggeredIndex, messageContent: compState.messageContent })
        const userInstruction = icons[triggeredIndex].userInstruction
        const revisedText = await reviseMessage(messageContent, userInstruction, messageList)
        setCompState({
            type: 'waitingApproval',
            revisedText: revisedText,
            revisingInstruction: userInstruction,
            messageContent: compState.messageContent
        })
    }

    function approveRevision(revisedText: string) {
        if (!waitingForApproval) {
            return
        }
        setCompState({ type: 'normal', messageContent: revisedText })
        textAreaRef.current?.focus()
    }

    function rejectRevision() {
        if (!waitingForApproval) {
            return
        }
        setCompState({ type: 'normal', messageContent: compState.messageContent })
        textAreaRef.current?.focus()
    }

    // TODO pass from props
    const icons: RevisionEntry[] = [
        {
            iconNode: <MdGTranslate size={20} />, userInstruction: "How do I say it in English to express the same meaning?",
            shortcutCallback: (e: React.KeyboardEvent<HTMLTextAreaElement>) => e.key === 'k' && (e.metaKey || e.ctrlKey)
        },
        {
            iconNode: <TbPencilQuestion size={20} title="Ask AI to answer this question" />, userInstruction: "Help me respond to this message",
            shortcutCallback: (e: React.KeyboardEvent<HTMLTextAreaElement>) => e.key === '/' && (e.metaKey || e.ctrlKey)
        },
        {
            iconNode: <FaSpellCheck size={20} className="ml-[-2px]" />, userInstruction: "Correct grammar issue",
            shortcutCallback: (e: React.KeyboardEvent<HTMLTextAreaElement>) => e.key === 'g' && (e.metaKey || e.ctrlKey)
        }
    ]

    function calculateTextAreaHeight(): number {
        if (textAreaRef.current) {
            const textAreaRect = textAreaRef.current.getBoundingClientRect();
            return window.innerHeight - textAreaRect.top
        }
        return 170 // by default
    }

    return <div className={`flex flex-col relative border-t pt-4 pb-2 px-4 ${className}`}>
        {/* top bar */}
        <div className="flex flex-row px-4 mb-2">
            {icons.map((icon, index) => {
                if (compState.type === 'revising' && compState.revisingIndex === index) {
                    return <div className="p-1 mr-1 w-[28px]" key={index}>
                        <Oval height={17} width={17} color="#959595" secondaryColor="#959595" strokeWidth={4} strokeWidthSecondary={4} />
                    </div>
                }
                return <div className="p-1 mr-1 w-[28px] bg-transparent hover:bg-gray-300 rounded" key={index}><button className="" key={index}
                    onClick={() => {
                        const ii = index
                        startRevising(ii)
                    }}>{icon.iconNode}
                </button></div>
            })}
        </div>
        {
            // TODO 
            // 1. more appropriate max-width
            // 2. line wrapping for content
            waitingForApproval && <DiffView className={`absolute w-fit min-w-[700px] max-w-[1000px] bg-white`} style={{ bottom: `${calculateTextAreaHeight()}px` }}
                originalText={messageContent} revisedText={compState.revisedText} allowFollowUpDiscussion={allowFollowUpDiscussion}
                approveRevisionCallback={approveRevision} rejectRevisionCallback={rejectRevision}
                startFollowUpDiscussion={(messageToRevise: string, revisedText: string) => {
                    setCompState({ type: 'normal', messageContent: '' })
                    textAreaRef.current?.focus()
                    startFollowUpDiscussion(compState.revisingInstruction, messageToRevise, revisedText)
                }} />
        }
        {/* Input Box */}
        <textarea
            className="flex-1 p-4 resize-none focus:outline-none"
            ref={textAreaRef}
            placeholder={`Type your message here...\n\nPress Enter to send, Shift+Enter to add a new line`}
            value={messageContent} onChange={(e) => setCompState({ type: 'normal', messageContent: e.target.value })}
            readOnly={!isNormal}

            onKeyDown={(e) => {
                icons.forEach((icon, i) => {
                    if (icon.shortcutCallback && icon.shortcutCallback(e)) {
                        const ii = i
                        e.preventDefault();
                        startRevising(ii)
                    }
                });
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }} rows={4} />
    </div >
}

export function DiffView(
    { originalText, revisedText, approveRevisionCallback, rejectRevisionCallback, allowFollowUpDiscussion, startFollowUpDiscussion, style, className = "" }: {
        originalText: string,
        revisedText: string,
        allowFollowUpDiscussion: boolean
        approveRevisionCallback: (revisedText: string) => void,
        rejectRevisionCallback: () => void
        startFollowUpDiscussion: (messageToRevise: string, revisedText: string) => void
        className?: string,
        style: object
    }
) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, []);
    const changes = diffChars(originalText, revisedText)
    return (
        <div className={`p-4 pb-2 rounded-lg border-2 shadow-md focus:outline-none ${className}`} style={style}
            tabIndex={0} ref={containerRef}
            onKeyDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (e.key === 'Enter') {
                    approveRevisionCallback(revisedText);
                } else if (e.key === 'Backspace') {
                    rejectRevisionCallback();
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
                        <button className="mr-2 py-0 px-2 bg-gray-800 rounded-md text-[12px] text-white" onClick={() => { approveRevisionCallback(revisedText) }}>
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
    )
}