"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AddMesssageInChat, ChatLoader, loadChatSettings, LocalChatSettings, updateInputHandlerInLocalStorage, persistMessageUpdateInChat as updateMessageInChat } from "../lib/chat";
import { useImmer } from "use-immer";
import { isOpenAILikeMessage, type Message } from "../lib/message";
import { RecommendedRespMessage, SpecialRoles as SpecialRoles, TextMessage } from "./message";
import { IoIosArrowDown } from "react-icons/io";
import { MessageInput } from "./input";
import { InputHandler } from "./input-handlers";
import { SiTheconversation } from "react-icons/si";
import { ChatIntelligence, getChatIntelligenceSettingsByID, intelligenceRegistry, OpenAIChatIntelligence, OpenAIChatISettings } from "@/app/intelligence-llm/lib/intelligence";

export function Chat({ chatID, chatTitle, loadChatByID, className = "" }: {
    chatID: string,
    chatTitle: string,
    loadChatByID: ChatLoader,
    className?: string;
}) {
    // compState: normal, stacking
    const [messageListStack, updateMessageListStack] = useImmer<Message[][]>([])
    const isTopLevel = messageListStack.length <= 1
    const currentMessageList = messageListStack.length > 0 ? messageListStack[messageListStack.length - 1] : []
    const [inputHandlers, setInputHandlers] = useState<InputHandler[]>([])
    const [inputCompKey, setInputCompKey] = useState(0) // for force reset
    const [chatKey, setChatKey] = useState(0) // for informing children that current chat has switched
    const chatIntelligenceRef = useRef<ChatIntelligence>()

    useEffect(() => {

        const messageList = loadChatByID(chatID)
        updateMessageListStack([messageList])

        const chatSettings: LocalChatSettings = loadChatSettings(chatID)
        setInputHandlers(chatSettings.inputHandlers)
        const tmp = getChatIntelligenceSettingsByID(chatSettings.ChatISettings.id)
        if (tmp.type === OpenAIChatIntelligence.type) {
            const settings = tmp.settings as OpenAIChatISettings
            chatIntelligenceRef.current = new OpenAIChatIntelligence(settings.settingsType, settings.localSettings)
        } else {
            throw new Error(`Chat intelligence with type ${tmp.type} not found`)
        }

        setInputCompKey(prev => prev + 1)
    }, [chatID, loadChatByID, updateMessageListStack])

    const messageAddedCallbacks: (({ }: { messageList: Message[], opts?: messageAddedCallbackOptions }) => void)[] = [
        // generate assistant message
        async ({ messageList, opts = { generateAssistantMsg: true } }: { messageList: Message[], opts?: messageAddedCallbackOptions }) => {
            if (!opts.generateAssistantMsg) return
            // only generate assistant message if the last message is from the user
            if (messageList.length === 0 || messageList[messageList.length - 1].role !== SpecialRoles.USER) return

            const newMessages = chatIntelligenceRef.current!.completeChat(messageList.filter((msg) => msg.includedInChatCompletion))
            if (isTopLevel) {
                // only top level chat need to be persisted
                AddMesssageInChat(chatID, newMessages)
            }
            updateMessageListStack(draft => {
                draft[draft.length - 1].push(...newMessages)
            })
        }
        // TODO rename chat based on messages while the number of messages is greater than 1

    ]

    async function addMesssage(newMessage: Message, callbackOpts?: messageAddedCallbackOptions) {
        if (isTopLevel) {
            AddMesssageInChat(chatID, [newMessage])
        }
        updateMessageListStack(draft => {
            draft[draft.length - 1].push(newMessage)
        })
        for (const callback of messageAddedCallbacks) {
            callback({ messageList: [...currentMessageList, newMessage], opts: callbackOpts });
        }
    }

    async function _updateMessage(messageID: number, newMessage: Message) {
        if (!isTopLevel) {
            // only persist top-level messages
            return
        }
        updateMessageInChat(chatID, messageID, newMessage)
        updateMessageListStack(draft => {
            draft[draft.length - 1][messageID] = newMessage
        })
    }
    const updateMessage = useCallback(_updateMessage, [chatID, isTopLevel, updateMessageListStack])

    function startFollowUpDiscussion(userInstruction: string, messageToRevise: string, revisedText: string) {
        const historyContext = true ?
            currentMessageList.slice(-currentMessageList.length).
                filter((msg) => msg.includedInChatCompletion).
                filter((msg) => isOpenAILikeMessage(msg)).
                map(msg => `[START]${msg.role}: ${msg.toOpenAIMessage().content}[END]`).join('\n') : ""
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
        setChatKey(prev => prev + 1)
    }

    return <div className={`flex flex-col flex-grow items-center rounded-lg pb-4 ${className}`}>
        {/* top bar */}
        <div className="flex flex-row self-start justify-start mb-12 mt-6">
            {/* Chat title */}
            <div className="flex flex-row items-center ml-12">
                <SiTheconversation className="mr-3 relative top-[1.5px]" />
                <div className={`font-bold text-xl text-[#5f5f5f]`}>{chatTitle}</div>
            </div>
        </div>

        {/* button for jumping back to top level while in follow-up discussions */}
        {!isTopLevel &&
            <div className="hover:bg-gray-200 cursor-pointer py-2 w-4/5 flex justify-center"
                onClick={() => { updateMessageListStack(draft => { draft.pop() }); setChatKey(prev => prev + 1) }}>
                <IoIosArrowDown size={30} color="#5f5f5f" />
            </div>}

        <MessageList className="flex-initial overflow-auto w-4/5 h-full" messageList={currentMessageList} updateMessage={updateMessage} />
        <MessageInput addInputHandler={(handler) => {
            updateInputHandlerInLocalStorage(chatID, inputHandlers.length, handler)
        }} className="w-4/5"
            chatID={chatID}
            key={inputCompKey} chatKey={chatKey}
            inputHandlers={inputHandlers}
            addMesssage={addMesssage} messageList={currentMessageList}
            // Temporarily forbid nested multi-level discussions, the component has already supported, 
            // it's just the AI might be unable to handle too many levels
            allowFollowUpDiscussion={isTopLevel}
            startFollowUpDiscussion={startFollowUpDiscussion}
        />
    </div>
}

export type messageAddedCallbackOptions = {
    generateAssistantMsg?: boolean
}

export function MessageList({ messageList, updateMessage, className }: {
    messageList: Message[]
    updateMessage: (messageID: number, newMessage: Message) => void,
    className?: string
}) {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Briefly delay the scrolling operation after the component is first loaded
        const timer = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
        }, 10);
        // Clear the timer to prevent memory leaks
        return () => clearTimeout(timer);
    }, []); // Empty dependency array

    return <div className={`flex flex-col ${className} custom-scrollbar`}>
        {messageList.
            filter((msg) => msg.displayToUser).
            map((message, index) => {
                const messageID = index
                const MsgComponent = message.component()
                return <MsgComponent message={message} key={index} className="mb-1"
                    messageID={messageID}
                    updateMessage={updateMessage} />
            })}
        <div ref={messagesEndRef} />
    </div>
}
