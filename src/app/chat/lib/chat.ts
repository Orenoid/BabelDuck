'use client'
import { FreeTrialChatIntelligence } from "@/app/intelligence-llm/lib/intelligence";
import { GrammarCheckingHandler, InputHandler, RespGenerationHandler, TranslationHandler } from "../components/input-handlers";
import { BabelDuckMessage, FreeTrialMessage, StreamingTextMessage, SystemMessage, TextMessage } from "../components/message";
import { Message } from "./message";
import { loadChatSettingsData, setChatSettingsData } from "./chat-persistence";
import { generateUUID } from "@/app/lib/uuid";

// ============================= business logic =============================


// ===== Chat Messages =====

export function loadChatMessages(chatID: string): Message[] {
    // 从 localStorage 根据 chatID 读取消息列表
    const messageListJSON = localStorage.getItem(`chat_${chatID}`);

    // 如果 localStorage 中没有数据，返回空数组
    if (!messageListJSON) {
        return [];
    }

    const rawMessages: string[] = JSON.parse(messageListJSON)
    // TODO set up a global hub to manage message constructors
    const messageList: Message[] = rawMessages.map((rawMsg) => {
        const { type, ...rest } = JSON.parse(rawMsg);
        switch (type) {
            case 'systemMessage':
                return SystemMessage.deserialize(JSON.stringify(rest));
            case 'text':
                return TextMessage.deserialize(JSON.stringify(rest));
            case 'streamingText':
                return StreamingTextMessage.deserialize(JSON.stringify(rest));
            case 'babelDuck':
                return BabelDuckMessage.deserialize(JSON.stringify(rest));
            case FreeTrialMessage.type:
                return FreeTrialMessage.deserialize();
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    });

    return messageList;
}

// ===== Chat Settings =====

export type ChatSettings = {
    ChatISettings: {
        id: string
        settings: object
    }
    inputHandlers: { handler: InputHandler, display: boolean }[];
    autoPlayAudio: boolean;
}

export type LocalChatSettings = {
    usingGlobalSettings: boolean;
} & ChatSettings


// read chat settings, if not found, create from global settings
export function loadChatSettings(chatID: string): LocalChatSettings {

    // check if the chat is using global settings
    const chatMetadataJSON = localStorage.getItem(`chatMetadata_${chatID}`);
    if (!chatMetadataJSON) {
        return { usingGlobalSettings: true, ...loadGlobalChatSettings() };
    }
    // if so, return global settings
    const chatMetadata: { usingGlobalSettings: boolean } = JSON.parse(chatMetadataJSON);
    if (chatMetadata.usingGlobalSettings) {
        return { usingGlobalSettings: true, ...loadGlobalChatSettings() };
    }
    // if not, return the chat local settings
    const rawChatSettings = loadChatSettingsData(`chatSettings_${chatID}`);
    if (!rawChatSettings) {
        const globalSettings = loadGlobalChatSettings()
        localStorage.setItem(`chatMetadata_${chatID}`, JSON.stringify({ usingGlobalSettings: false }));
        setChatSettingsData(`chatSettings_${chatID}`, {
            rawInputHandlers: globalSettings.inputHandlers.map((handler) => ({
                payload: handler.handler.serialize(),
                display: handler.display
            })),
            ...globalSettings
        });
        return { usingGlobalSettings: false, ...globalSettings };
    }
    // TODO tech-dept: ts 类型检查不够严格，rawInputHandlers 被传递到 LocalChatSettings 中也没有报错，看下有什么办法可以解决
    const { rawInputHandlers, ...rest } = rawChatSettings
    return {
        usingGlobalSettings: false,
        ...rest,
        inputHandlers: rawInputHandlers.map((rawHandler) => ({
            handler: InputHandler.deserialize(rawHandler.payload),
            display: rawHandler.display
    })) };
}

export function switchToGlobalChatSettings(chatID: string): void {
    localStorage.setItem(`chatMetadata_${chatID}`, JSON.stringify({ usingGlobalSettings: true }));
}

export function switchToLocalChatSettings(chatID: string): void {
    localStorage.setItem(`chatMetadata_${chatID}`, JSON.stringify({ usingGlobalSettings: false }));
}

// mark the chat as using local settings and save the settings
export function setLocalChatSettings(chatID: string, chatSettings: ChatSettings): void {
    // TODO tech-debt: move to chat-persistence.ts
    localStorage.setItem(`chatMetadata_${chatID}`, JSON.stringify({ usingGlobalSettings: false }));
    const { inputHandlers, ...rest } = chatSettings // exclude unserializable `inputHandlers` from the settings
    setChatSettingsData(`chatSettings_${chatID}`, {
        rawInputHandlers: inputHandlers.map((handler) => ({
            payload: handler.handler.serialize(),
            display: handler.display
        })),
        ...rest
    });
}

export const defaultGlobalChatSettings: ChatSettings = {
    ChatISettings: {
        id: FreeTrialChatIntelligence.id,
        settings: {}
    },
    autoPlayAudio: false,
    inputHandlers: [
        { handler: new TranslationHandler("English"), display: true },
        { handler: new RespGenerationHandler(), display: true },
        { handler: new GrammarCheckingHandler(), display: true }
    ]
}

export const GlobalDefaultChatSettingID = 'global_default_chat_settings'
// side effect: if the global settings are not found, set them to the default value
export function loadGlobalChatSettings(): ChatSettings {
    const chatSettingsData = loadChatSettingsData(GlobalDefaultChatSettingID);
    if (!chatSettingsData) {
        setGlobalChatSettings(defaultGlobalChatSettings);
        return defaultGlobalChatSettings;
    }
    const inputHandlers = chatSettingsData.rawInputHandlers.map((rawHandler) => ({
        handler: InputHandler.deserialize(rawHandler.payload),
        display: rawHandler.display
    }))
    return {
        autoPlayAudio: chatSettingsData.autoPlayAudio,
        ChatISettings: chatSettingsData.ChatISettings,
        inputHandlers: inputHandlers
    };
}

export function setGlobalChatSettings(settings: ChatSettings): void {
    setChatSettingsData(GlobalDefaultChatSettingID, {
        rawInputHandlers: settings.inputHandlers.map((handler) => ({
            payload: handler.handler.serialize(),
            display: handler.display
        })),
        ChatISettings: settings.ChatISettings,
        autoPlayAudio: settings.autoPlayAudio
    });
}

export function addInputHandlersInChat(chatID: string, handlers: InputHandler[]): void {
    // first check if the chat is using global settings
    const chatSettings = loadChatSettings(chatID);
    if (chatSettings.usingGlobalSettings) {
        // add the handlers to the global settings
        const globalSettings = loadGlobalChatSettings();
        globalSettings.inputHandlers.push(...handlers.map((handler) => ({
            handler: handler,
            display: true
        })));
        setGlobalChatSettings(globalSettings);
    } else {
        // add the handlers to the chat local settings
        chatSettings.inputHandlers.push(...handlers.map((handler) => ({
            handler: handler,
            display: true
        })));
        setChatSettingsData(`chatSettings_${chatID}`, {
            rawInputHandlers: chatSettings.inputHandlers.map((handler) => ({
                payload: handler.handler.serialize(),
                display: handler.display
            })),
            ChatISettings: chatSettings.ChatISettings,
            autoPlayAudio: chatSettings.autoPlayAudio
        });
    }
}

export function updateInputHandlerInLocalStorage(chatID: string, handlerIndex: number, handler: InputHandler): void {
    const chatSettings = loadChatSettings(chatID);
    if (chatSettings.usingGlobalSettings) {
        // update the global settings
        const globalSettings = loadGlobalChatSettings();
        globalSettings.inputHandlers[handlerIndex] = { handler: handler, display: true };
        setChatSettingsData(GlobalDefaultChatSettingID, {
            rawInputHandlers: globalSettings.inputHandlers.map((handler) => ({
                payload: handler.handler.serialize(),
                display: handler.display
            })),
            ChatISettings: globalSettings.ChatISettings,
            autoPlayAudio: globalSettings.autoPlayAudio
        });
    } else {
        // update the chat local settings
        chatSettings.inputHandlers[handlerIndex] = { handler: handler, display: true };
        setChatSettingsData(`chatSettings_${chatID}`, {
            rawInputHandlers: chatSettings.inputHandlers.map((handler) => ({
                payload: handler.handler.serialize(),
                display: handler.display
            })),
            ChatISettings: chatSettings.ChatISettings,
            autoPlayAudio: chatSettings.autoPlayAudio
        });
    }
}


export function loadChatSelectionList(): {
    chatSelectionList: ChatSelection[], currentSelectedChatID?: string
} {
    // 从 localStorage 读取 chat selection list 和当前选择的 chat ID
    const chatSelectionListJSON = localStorage.getItem('chatSelectionList');
    const currentSelectedChatID = localStorage.getItem('currentSelectedChatID');

    // 如果 localStorage 中没有数据，返回默认值
    if (!chatSelectionListJSON) {
        return {
            chatSelectionList: [],
            currentSelectedChatID: undefined
        };
    }

    return {
        chatSelectionList: JSON.parse(chatSelectionListJSON),
        currentSelectedChatID: currentSelectedChatID || undefined
    };
}

// ============================= persistence =============================

export function persistMessageUpdateInChat(chatID: string, messageID: number, updateMessage: Message): void {
    // 从 localStorage 读取现有的消息列表
    const messageListJSON = localStorage.getItem(`chat_${chatID}`);
    const messageList: string[] = messageListJSON ? JSON.parse(messageListJSON) : [];

    // 检查消ID是否存在
    if (messageID < 0 || messageID >= messageList.length) {
        console.error("Invalid message ID");
        return;
    }

    // 更新消息
    messageList[messageID] = updateMessage.serialize();

    // 更新 localStorage 中的消息列表
    localStorage.setItem(`chat_${chatID}`, JSON.stringify(messageList));
}

export function getNextChatCounter(): number {
    let chatCounter = parseInt(localStorage.getItem('chatCounter') || '0', 10);
    chatCounter += 1;
    localStorage.setItem('chatCounter', chatCounter.toString());
    return chatCounter;
}

export function AddNewChat(
    chatTitle: string,
    initialMessageList: Message[] = []
): {
    chatSelection: ChatSelection,
} {
    // 从 localStorage 读取现有的 chat selection list
    const chatSelectionListJSON = localStorage.getItem('chatSelectionList');
    const chatSelectionList: ChatSelection[] = chatSelectionListJSON ? JSON.parse(chatSelectionListJSON) : [];

    // 新的 chat ID
    const newChatID = generateUUID();

    // 新的聊天选择项
    const newChatSelection: ChatSelection = { id: newChatID, title: chatTitle };

    // 将新聊天添加到列表中
    chatSelectionList.unshift(newChatSelection);

    // 更新 localStorage 中的 chat selection list
    localStorage.setItem('chatSelectionList', JSON.stringify(chatSelectionList));

    // 将初始消息列表保存到 localStorage 中
    localStorage.setItem(`chat_${newChatID}`, JSON.stringify(initialMessageList.map((msg) => msg.serialize())));

    return {
        chatSelection: newChatSelection
    };
}

export function AddMesssageInChat(chatID: string, messages: Message[]): void {
    if (messages.length === 0) {
        return
    }
    // 从 localStorage 读取现有的消息列表
    const messageListJSON = localStorage.getItem(`chat_${chatID}`);
    const messageList: string[] = messageListJSON ? JSON.parse(messageListJSON) : [];

    // 将新的消息添加到消息列表中
    messageList.push(...messages.map((msg) => msg.serialize()));

    // 更新 localStorage 中的消息列表
    localStorage.setItem(`chat_${chatID}`, JSON.stringify(messageList));
}

export function UpdateChatTitle(chatID: string, newTitle: string): void {
    // 从 localStorage 读取现有的 chat selection list
    const chatSelectionListJSON = localStorage.getItem('chatSelectionList');
    const chatSelectionList: ChatSelection[] = chatSelectionListJSON ? JSON.parse(chatSelectionListJSON) : [];

    // 更新 chat selection list 中的 title
    const chatSelection = chatSelectionList.find(chat => chat.id === chatID);
    if (chatSelection) {
        chatSelection.title = newTitle;
    }

    // 更新 localStorage 中的 chat selection list
    localStorage.setItem('chatSelectionList', JSON.stringify(chatSelectionList));
}

export interface ChatSelectionListLoader {
    (): { chatSelectionList: ChatSelection[], currentSelectedChatID?: string };
}

export interface ChatLoader {
    (chatID: string): Message[]
}

export interface AddNewChat {
    (chatTitle?: string, initialMessageList?: Message[]): {
        chatSelection: ChatSelection
    }
}

export interface AddMesssageInChat {
    (chatID: string, message: Message): void
}

export interface ChatSelection {
    id: string;
    title: string;
}

export function deleteChatData(chatID: string) {
    // Remove chat from chatSelectionList
    const chatSelectionListJSON = localStorage.getItem('chatSelectionList');
    if (chatSelectionListJSON) {
        const chatSelectionList: ChatSelection[] = JSON.parse(chatSelectionListJSON);
        const updatedChatSelectionList = chatSelectionList.filter(chat => chat.id !== chatID);
        localStorage.setItem('chatSelectionList', JSON.stringify(updatedChatSelectionList));
    }

    // Remove chat messages
    localStorage.removeItem(`chat_${chatID}`);

    // Remove input handlers
    localStorage.removeItem(`inputHandlers_${chatID}`);

    // Update currentSelectedChatID if necessary
    const currentSelectedChatID = localStorage.getItem('currentSelectedChatID');
    if (currentSelectedChatID === chatID) {
        localStorage.removeItem('currentSelectedChatID');
    }
}
