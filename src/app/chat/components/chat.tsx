"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AddMesssageInChat, ChatLoader, updateInputHandlerInLocalStorage, persistMessageUpdateInChat as updateMessageInChat } from "../lib/chat";
import { loadChatSettings } from "@/app/settings/lib/settings";
import { LocalChatSettings } from "../components/chat-settings";
import { useImmer } from "use-immer";
import { isOpenAILikeMessage, OpenAILikeMessage, type Message } from "../lib/message";
import { RecommendedRespMessage, SpecialRoles as SpecialRoles, TextMessage } from "./message";
import { MessageInput, MsgListSwitchSignal } from "./input";
import { InputHandler } from "./input-handlers";
import { SiTheconversation } from "react-icons/si";
import { BabelDuckChatIntelligence, ChatIntelligence, CustomLLMChatIntelligence, CustomLLMServiceChatISettings, FreeTrialChatIntelligence, getChatIntelligenceSettingsByID, OpenAIChatIntelligence, OpenAIChatISettings, TutorialChatIntelligence } from "@/app/intelligence-llm/lib/intelligence";
import { InvalidModelSettingsError } from "@/app/error/error";
import { FreeTrialChatError } from "@/app/error/error";
import { MdKeyboardArrowRight } from "react-icons/md";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { LuSettings } from "react-icons/lu";
import { LocalChatSettingsComponent } from "@/app/settings/components/settings";
import { ChatSettingsContext } from "./chat-settings";
import { toast } from "react-hot-toast";
import { setCurrentChatSettings } from "./chat-redux";

export function Chat({ chatID, chatTitle, loadChatByID, className = "" }: {
    chatID: string,
    chatTitle: string,
    loadChatByID: ChatLoader,
    className?: string;
}) {
    const { t } = useTranslation();

    const [showSettings, setShowSettings] = useState(false);

    const [messageListStack, updateMessageListStack] = useImmer<Message[][]>([])
    const isTopLevel = messageListStack.length <= 1
    const previousMessageList = messageListStack.length > 1 ? messageListStack[messageListStack.length - 2] : undefined
    const currentMessageList = messageListStack.length > 0 ? messageListStack[messageListStack.length - 1] : []

    const [msgListSwitchSignal, setMsgListSwitchSignal] = useState<MsgListSwitchSignal>({ type: 'init', key: 0 })
    const betweenMsgListCache = useRef<{ message: Message, handledMsg: Message, handlerInstruction: string }>()

    const chatSettingsRaw = useAppSelector((state) => state.currentChatSettings)
    const chatSettings: LocalChatSettings | undefined = chatSettingsRaw.currentChatSettings !== undefined ? {
        ...chatSettingsRaw.currentChatSettings,
        inputHandlers: chatSettingsRaw.currentChatSettings.inputHandlers.map((rawHandler) => ({
            handler: InputHandler.deserialize(rawHandler.handler),
            display: rawHandler.display
        }))
    } : undefined

    const dispatch = useAppDispatch()
    // TODO read from redux instead
    let chatIntelligence: ChatIntelligence
    if (chatSettings !== undefined) {
        const { type } = getChatIntelligenceSettingsByID(chatSettings.ChatISettings.id)
        // TODO tech-debt: dynamic load from registry
        if (type === OpenAIChatIntelligence.type) {
            const settings = chatSettings.ChatISettings.settings as OpenAIChatISettings
            chatIntelligence = new OpenAIChatIntelligence(settings.settingsType, settings.localSettings)
        } else if (type === FreeTrialChatIntelligence.type) {
            chatIntelligence = new FreeTrialChatIntelligence()
        } else if (type === CustomLLMChatIntelligence.type) {
            const settings = chatSettings.ChatISettings.settings as CustomLLMServiceChatISettings
            chatIntelligence = new CustomLLMChatIntelligence(settings.settingsType, settings.svcID, settings.localSettings)
        } else if (type === BabelDuckChatIntelligence.type) {
            chatIntelligence = new BabelDuckChatIntelligence()
        } else if (type === TutorialChatIntelligence.type) {
            chatIntelligence = new TutorialChatIntelligence()
        } else {
            throw new Error(`Chat intelligence with type ${type} not found`)
        }
    }
    const visibleInputHandlers = chatSettings !== undefined ?
        chatSettings.inputHandlers
            .filter((handler) => handler.display)
            .map((handler) => handler.handler)
        : []

    useEffect(() => {
        const messageList = loadChatByID(chatID)
        updateMessageListStack([messageList])

        const chatSettings: LocalChatSettings = loadChatSettings(chatID)
        dispatch(setCurrentChatSettings({
            chatID, chatSettings: {
                ...chatSettings,
                inputHandlers: chatSettings.inputHandlers.map((handler) => ({
                    handler: handler.handler.serialize(),
                    display: handler.display
                }))
            }
        }))

        setMsgListSwitchSignal(prev => ({ type: 'switchChat', key: prev.key + 1 }))
    }, [chatID, loadChatByID, updateMessageListStack])

    const messageAddedCallbacks: (({ }: { messageList: Message[], opts?: messageAddedCallbackOptions }) => void)[] = [
        // generate assistant message
        async ({ messageList, opts = { generateAssistantMsg: true } }: { messageList: Message[], opts?: messageAddedCallbackOptions }) => {
            if (!opts.generateAssistantMsg) return
            // only generate assistant message if the last message is from the user
            if (messageList.length === 0 || messageList[messageList.length - 1].role !== SpecialRoles.USER) return

            try {
                const newMessages = chatIntelligence.completeChat(messageList)
                if (isTopLevel) {
                    // only top level chat need to be persisted
                    AddMesssageInChat(chatID, newMessages)
                }
                updateMessageListStack(draft => {
                    draft[draft.length - 1].push(...newMessages)
                })
            } catch (error) {
                // TODO tech-debt: 错误处理分散
                console.error(error)
                if (error instanceof FreeTrialChatError) {
                    toast.error(t('trialChatUnavailable'))
                } else if (error instanceof InvalidModelSettingsError) {
                    toast.error(t('modelSettingsInvalid', { message: error.message }))
                } else {
                    toast.error(t('chatUnavailable'))
                }
            }
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

    function startFollowUpDiscussion(userInstruction: string, originalMsg: Message, suggestedMsg: Message) {
        // TODO integrate message abstraction mechanism, so far just assuming all messages are OpenAILikeMessage (they are)
        const originalTextMsg: string = (originalMsg as unknown as OpenAILikeMessage).toOpenAIMessage().content
        const suggestedTextMsg: string = (suggestedMsg as unknown as OpenAILikeMessage).toOpenAIMessage().content
        const historyContext = true ?
            currentMessageList.slice(-currentMessageList.length).
                filter((msg) => msg.includedInChatCompletion).
                filter((msg) => isOpenAILikeMessage(msg)).
                map(msg => `[START]${msg.role}: ${msg.toOpenAIMessage().content}[END]`).join('\n') : ""
        const instructionType = originalTextMsg.trim() === "" ? "generation" : "modification"
        const handlerPrompt = `${true ? `I am having a conversation with someone:
        """
        ${historyContext}
        """` : ""}
        ${instructionType === 'modification' && `This is the message I'm about to send, but I'm not sure if it's good enough and I need you to do some modifications on it:`}
        ${instructionType === 'modification' && `"""
        ${originalTextMsg}
        """`}
        ${instructionType === 'generation' && `I don't have any message to send, please generate one for me:`}
        Here is my request:
        """
        ${userInstruction}
        """
        Please provide a recommended response based on my request, considering the context of the ongoing conversation, and preserving the line breaks and formatting if any.`
        const nextLevelMessages: Message[] = [
            // 1. revise prompt with chat history, included in chat completion, but not displayed to users
            new TextMessage('user', handlerPrompt, false, true),
            // 2. json response from ai, included in chat completion but not displayed to users
            new TextMessage('assistant', `The recommended response is as follows:
            """
            ${suggestedTextMsg}
            """
            if you have any more questions or requests, feel free to reach out to me.`, false, true),
            // 3. the revised text, displayed but not included in chat completion
            new RecommendedRespMessage('assistant', suggestedTextMsg, true, false)
        ]
        updateMessageListStack(draft => { draft.push(nextLevelMessages) })
        setMsgListSwitchSignal({ type: 'followUpDiscussion', key: msgListSwitchSignal.key + 1 })
        betweenMsgListCache.current = { message: originalMsg, handledMsg: suggestedMsg, handlerInstruction: userInstruction }
    }

    function goBackToPreviousLevel() {
        updateMessageListStack(draft => { draft.pop() });
        setMsgListSwitchSignal({ type: 'backFromFollowUpDiscussion', key: msgListSwitchSignal.key + 1, ...betweenMsgListCache.current! })
    }

    return <div className={`flex flex-col items-center rounded-lg pb-4 ${className}`}>
        {/* top bar */}
        <div className="flex flex-row self-start justify-start items-center mb-12 mt-6">
            {/* Chat title */}
            <div className="flex flex-row items-center ml-12 mr-2">
                <SiTheconversation className="mr-3 relative top-[1.5px]" />
                <div className={`font-bold text-xl text-[#5f5f5f]`}>{chatTitle}</div>
            </div>
            {/* Chat Settings entry */}
            <LuSettings className="cursor-pointer" color="#898989" size={15}
                onClick={() => setShowSettings(true)} />
            {showSettings && chatSettings !== undefined &&
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div
                        className="absolute inset-0 bg-black opacity-50"
                        onClick={() => setShowSettings(false)}
                    ></div>
                    <div className="bg-white rounded-2xl z-10 w-11/12 md:w-3/4 lg:w-1/2 max-w-4xl h-[90vh] flex flex-col p-6 pr-8">
                        <LocalChatSettingsComponent chatID={chatID} chatSettings={chatSettings} />
                    </div>
                </div>
            }
        </div>

        <ChatSettingsContext.Provider value={chatSettings ?? null}>
            <div className="w-4/5 h-full relative overflow-auto custom-scrollbar">
                {/* current message list */}
                <MessageList key={msgListSwitchSignal.key + 1}
                    className={`absolute bg-white h-full overflow-auto custom-scrollbar pb-6 ${!isTopLevel && 'left-24 pl-10'} ${!isTopLevel ? 'w-[calc(100%-96px)]' : 'w-full'}`}
                    messageList={currentMessageList} updateMessage={updateMessage} />
                {
                    !isTopLevel && <>
                        {/* previous message list in the background */}
                        <MessageList key={msgListSwitchSignal.key} className="absolute top-0 left-0 h-full z-[-1] overflow-hidden" messageList={previousMessageList!} updateMessage={() => { }} />
                        {/* button for jumping back to previous level */}
                        <div className="absolute top-0 left-0 border-r bg-white bg-opacity-80 w-24 h-full 
                    flex items-center justify-end shadow-[inset_-4px_0_6px_-4px_rgba(0,0,0,0.1)]"
                            onClick={goBackToPreviousLevel}
                        >
                            <div id="back-to-previous-level" className="relative left-5">
                                <MdKeyboardArrowRight className="cursor-pointer" size={20} color="#898989" onClick={(e) => { goBackToPreviousLevel(); e.stopPropagation() }} />
                            </div>
                            <Tooltip anchorSelect="#back-to-previous-level"
                                delayShow={100} delayHide={0} place="top" offset={5} style={{ borderRadius: '0.75rem' }}>
                                {t('chat.backToPreviousLevel')}
                            </Tooltip>
                        </div>
                    </>

                }
            </div>
            {/* input */}
            <MessageInput addInputHandler={(handler) => {
                if (chatSettings === undefined) return
                updateInputHandlerInLocalStorage(chatID, visibleInputHandlers?.length ?? 0, handler)
                const originalInputHandlers = chatSettings.inputHandlers
                dispatch(setCurrentChatSettings({
                    chatID,
                    chatSettings: {
                        ...chatSettings,
                        inputHandlers: [
                            ...originalInputHandlers.map((handler) => ({ handler: handler.handler.serialize(), display: handler.display })),
                            { handler: handler.serialize(), display: true }
                        ],
                    }
                }))
            }}
            updateInputHandler={(index, handler) => {
                if (chatSettings === undefined) return
                updateInputHandlerInLocalStorage(chatID, index, handler)
                const originalInputHandlers = chatSettings.inputHandlers
                dispatch(setCurrentChatSettings({
                    chatID,
                    chatSettings: {
                        ...chatSettings,
                        inputHandlers: originalInputHandlers.map((h, i) => 
                            i === index 
                                ? { handler: handler.serialize(), display: h.display }
                                : { handler: h.handler.serialize(), display: h.display }
                        ),
                    }
                }))
            }}
                className="w-4/5"
                chatID={chatID}
                msgListSwitchSignal={msgListSwitchSignal}
                inputHandlers={visibleInputHandlers}
                addMesssage={addMesssage} messageList={currentMessageList}
                // Temporarily forbid nested multi-level discussions, the component has already supported, 
                // it's just the AI might be unable to handle too many levels
                allowFollowUpDiscussion={isTopLevel}
                startFollowUpDiscussion={startFollowUpDiscussion}
            />
        </ChatSettingsContext.Provider>
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
    }, []);

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