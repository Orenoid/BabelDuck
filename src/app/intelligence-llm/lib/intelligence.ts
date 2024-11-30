import { i18nText } from "@/app/i18n/i18n"
import { isOpenAILikeMessage, Message } from "@/app/chat/lib/message"
import { BabelDuckMessage, FreeTrialMessage, SpecialRoles } from "@/app/chat/components/message"
import { StreamingTextMessage } from "@/app/chat/components/message"
import { getCustomLLMServiceSettings, getLLMServiceSettingsRecord, OpenAICompatibleAPIService, OpenAIService, OpenAISettings } from "./llm-service"
import { IdentifiedTextMessage, NextStepTutorialMessage, TutorialMessage1 } from "@/app/chat/components/tutorial-message"
import { TutorialStateIDs } from "@/app/chat/components/tutorial-input"

// ============================= business logic =============================

export type chatIntelligenceSettingsRecord = {
    id: string
} & chatIntelligenceSettings

export type chatIntelligenceSettings = {
    name: i18nText
    type: string
    settings: object
}

export function getChatIntelligenceSettingsByID(id: string): chatIntelligenceSettingsRecord {
    const availableIntelligences = getAvailableChatIntelligenceSettings()
    const intelligenceSettings = availableIntelligences.find(i => i.id === id)
    if (!intelligenceSettings) {
        throw new Error(`Intelligence with id ${id} not found`)
    }
    return intelligenceSettings
}

// the settings of these records are more like default settings, they are not actually stored
// selectable means the user can choose to use them in the UI
export function getSelectableChatIntelligenceSettings(): chatIntelligenceSettingsRecord[] {
    return getBuiltInChatIntelligenceSettings().concat(getCustomLLMChatISettings()).concat([babelDuckSettings])
}

// available intelligence settings includes all the selectable, and some other built-in ones that can't be seen by users
export function getAvailableChatIntelligenceSettings(): chatIntelligenceSettingsRecord[] {
    return getBuiltInChatIntelligenceSettings().concat(getCustomLLMChatISettings()).concat([{ id: TutorialChatIntelligence.id, ...TutorialChatIntelligence.settings }])
}

export function getBuiltInChatIntelligenceSettings(): chatIntelligenceSettingsRecord[] {
    return Object.keys(builtinIntelligenceSettings).map((id) => ({ id, ...builtinIntelligenceSettings[id] }))
    // const builtinIntelligencesFromStorage = _getBuiltinChatIntelligencesFromLocalStorage()
    // const inStorageIntelligencesNumber = builtinIntelligencesFromStorage.length
    // // append the intelligences in builtinIntelligenceSettings that are not in builtinIntelligencesFromStorage
    // for (const intelligenceId of Object.keys(builtinIntelligenceSettings)) {
    //     if (!builtinIntelligencesFromStorage.some((s) => s.id === intelligenceId)) {
    //         builtinIntelligencesFromStorage.push({ id: intelligenceId, ...builtinIntelligenceSettings[intelligenceId] })
    //     }
    // }
    // if (builtinIntelligencesFromStorage.length !== inStorageIntelligencesNumber) {
    //     _saveBuiltInChatIntelligencesToLocalStorage(builtinIntelligencesFromStorage)
    // }
    // return builtinIntelligencesFromStorage
}

function getCustomLLMChatISettings(): chatIntelligenceSettingsRecord[] {
    const customLLMServiceSettings = getCustomLLMServiceSettings()
    return customLLMServiceSettings.map((s) => ({
        id: s.id,
        name: s.name,
        type: 'customLLMSvc',
        // TODO tech-debt: 1. declare const 2. define at some other place
        settings: {
            settingsType: 'link',
            svcID: s.id,
        }
    }))
}

export class ChatIntelligenceRegistry {
    private intelligenceMap: Map<string, (serialized: string) => ChatIntelligenceBase> = new Map();

    registerChatIntelligenceSerializer(type: string, deserializer: (serialized: string) => ChatIntelligenceBase) {
        if (this.intelligenceMap.has(type)) {
            throw new Error(`Chat intelligence with type ${type} already registered`)
        }
        this.intelligenceMap.set(type, deserializer);
    }

    getChatIntelligenceSerializer(type: string): ((serialized: string) => ChatIntelligenceBase) | undefined {
        return this.intelligenceMap.get(type);
    }
}

export const intelligenceRegistry = new ChatIntelligenceRegistry();

export interface ChatIntelligence {
    completeChat(messageList: Message[]): Message[];
}

export abstract class ChatIntelligenceBase implements ChatIntelligence {
    type: string;
    name: i18nText;

    constructor(type: string, name: i18nText) {
        this.type = type;
        this.name = name;
    }

    abstract completeChat(messageList: Message[]): Message[];

    abstract serialize(): string;
}

export class FreeTrialChatIntelligence extends ChatIntelligenceBase {
    static readonly id = 'free_trial'
    static readonly type = 'free_trial'
    static readonly _name: i18nText = { key: 'Free Trial' }

    completeChat(messageList: Message[]): Message[] {
        // Check if there's already a FreeTrialMessage in the message list
        const hasFreeTrialMessage = messageList.some(msg => msg instanceof FreeTrialMessage)
        async function* genFunc() {
            // Fetch the stream from the server
            const response = await fetch('/api/chat/quick-trial', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messageList: messageList

                        .filter((msg) => msg.includedInChatCompletion)
                        .filter((msg) => isOpenAILikeMessage(msg))
                        .map((msg) => (msg.toOpenAIMessage()))
                }),
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                yield decoder.decode(value);
            }
        }
        const gen = genFunc()
        return hasFreeTrialMessage
            ? [new StreamingTextMessage(SpecialRoles.ASSISTANT, gen)]
            : [new FreeTrialMessage(), new StreamingTextMessage(SpecialRoles.ASSISTANT, gen)]
    }

    serialize(): string {
        return JSON.stringify({ type: this.type })
    }

    static deserialize(): FreeTrialChatIntelligence {
        return new FreeTrialChatIntelligence()
    }

    constructor() {
        super(FreeTrialChatIntelligence.type, FreeTrialChatIntelligence._name)
    }
}

export type OpenAIChatISettings = {
    settingsType: 'link' | 'local'
    localSettings?: OpenAISettings // only makes sense when settingsType is 'local'
}

export class OpenAIChatIntelligence extends ChatIntelligenceBase {
    static readonly id = 'openai'
    static readonly type = 'openai'
    static readonly _name: i18nText = { text: 'OpenAI' }

    static defaultSettings: OpenAIChatISettings = {
        settingsType: 'link'
    }

    settingsType: 'link' | 'local'
    localSettings?: OpenAISettings // only makes sense when settingsType is 'local'

    constructor(settingsType: 'link' | 'local', settings?: OpenAISettings) {
        super(OpenAIChatIntelligence.type, OpenAIChatIntelligence._name)
        if (settingsType === 'local' && !settings) {
            throw new Error('settings is required when settingsType is local')
        }
        this.settingsType = settingsType
        this.localSettings = settings
    }

    private getOpenAIService(): OpenAIService {
        if (this.settingsType === 'link') {
            const openAIServiceSettingsRecord = getLLMServiceSettingsRecord('openai')
            if (!openAIServiceSettingsRecord) {
                throw new Error('default OpenAI service settings not found')
            }
            const openAIService = OpenAIService.deserialize(openAIServiceSettingsRecord.settings)
            return openAIService
        } else {
            return OpenAIService.deserialize(this.localSettings!)
        }
    }

    completeChat(messageList: Message[]): Message[] {
        const openAIService = this.getOpenAIService()
        async function* genFunc() {
            const { textStream } = await openAIService.chatCompletionInStream(
                messageList.filter((msg) => msg.includedInChatCompletion)
                    .filter((msg) => isOpenAILikeMessage(msg))
                    .map((msg) => (msg.toOpenAIMessage()))
            )
            for await (const value of textStream) {
                yield value
            }
            return
        }
        const gen = genFunc()
        return [new StreamingTextMessage(SpecialRoles.ASSISTANT, gen)]
    }

    serialize(): string {
        return JSON.stringify({ type: this.type, settingsType: this.settingsType, settings: this.localSettings })
    }

    static deserialize(serialized: string): OpenAIChatIntelligence {
        const { settingsType, settings } = JSON.parse(serialized)
        return new OpenAIChatIntelligence(settingsType, settings)
    }

}

export type CustomLLMServiceChatISettings = {
    settingsType: 'link' | 'local'
    svcID: string
    localSettings?: { name: string } & object // only accessible when settingsType is 'local'
}

export class CustomLLMChatIntelligence extends ChatIntelligenceBase {
    static readonly type = 'customLLMSvc'

    settingsType: 'link' | 'local'
    svcID: string
    localSettings?: { name: string } & object // only makes sense when settingsType is 'local'

    constructor(settingsType: 'link' | 'local', svcID: string, settings?: { name: string } & object) {

        super(CustomLLMChatIntelligence.type, { text: settings?.name ?? '' })
        if (settingsType === 'local' && !settings) {
            throw new Error('settings is required when settingsType is local')
        }
        this.settingsType = settingsType
        this.svcID = svcID
        this.localSettings = settings
    }

    private getOpenAICompatibleService(): OpenAICompatibleAPIService {
        if (this.settingsType === 'link') {
            const customLLMServiceSettingsRecord = getLLMServiceSettingsRecord(this.svcID)
            if (!customLLMServiceSettingsRecord) {
                throw new Error('custom LLM service settings not found')
            }
            const openAIService = OpenAIService.deserialize(customLLMServiceSettingsRecord.settings)
            return openAIService
        } else {
            return OpenAIService.deserialize(this.localSettings!)
        }
    }

    completeChat(messageList: Message[]): Message[] {
        const customLLMService = this.getOpenAICompatibleService()
        async function* genFunc() {
            const { textStream } = await customLLMService.chatCompletionInStream(
                messageList.filter((msg) => msg.includedInChatCompletion)
                    .filter((msg) => isOpenAILikeMessage(msg))
                    .map((msg) => (msg.toOpenAIMessage()))
            )
            for await (const value of textStream) {
                yield value
            }
            return
        }
        const gen = genFunc()
        return [new StreamingTextMessage(SpecialRoles.ASSISTANT, gen)]
    }

    serialize(): string {
        return JSON.stringify({ type: this.type, settingsType: this.settingsType, svcID: this.svcID, settings: this.localSettings })
    }

    static deserialize(serialized: string): CustomLLMChatIntelligence {
        const { settingsType, settings } = JSON.parse(serialized)
        return new CustomLLMChatIntelligence(settingsType, settings.svcID, settings.localSettings)
    }
}

// BabelDuck intelligence (just for fun :D)
export class BabelDuckChatIntelligence extends ChatIntelligenceBase {
    static readonly id = 'babel_duck'
    static readonly type = 'babel_duck'

    constructor() {
        super(BabelDuckChatIntelligence.type, { text: 'Babel Duck' })
    }

    completeChat(): Message[] {
        return [new BabelDuckMessage(SpecialRoles.ASSISTANT)]
    }

    serialize(): string {
        return JSON.stringify({ type: this.type })
    }

    static deserialize(): BabelDuckChatIntelligence {
        return new BabelDuckChatIntelligence()
    }
}

export class TutorialChatIntelligence extends ChatIntelligenceBase {
    static readonly id = 'tutorial'
    static readonly type = 'tutorial'
    static readonly _name: i18nText = { key: 'Tutorial Model' }

    static readonly settings: chatIntelligenceSettings = {
        name: TutorialChatIntelligence._name,
        type: TutorialChatIntelligence.type,
        settings: {}
    }

    constructor() {
        super(TutorialChatIntelligence.type, TutorialChatIntelligence._name)
    }

    completeChat(messageList: Message[]): Message[] {
        if (messageList.length === 0) {
            return []
        }
        const lastMessage = messageList[messageList.length - 1]
        if (lastMessage instanceof IdentifiedTextMessage && lastMessage.id === 'users-translated-msg') {
            return [
                new IdentifiedTextMessage('ai-resp-on-users-translated-msg', SpecialRoles.ASSISTANT, 'Sure, take your time! There\'s no rush.'),
                new NextStepTutorialMessage(TutorialStateIDs.clickNextToIllustrateGrammarCheck, TutorialStateIDs.illustrateGrammarCheck)
            ]
        }
        return []
    }

    serialize(): string {
        return JSON.stringify({ type: this.type })
    }

    static deserialize(): TutorialChatIntelligence {
        return new TutorialChatIntelligence()
    }
}

intelligenceRegistry.registerChatIntelligenceSerializer(FreeTrialChatIntelligence.type, FreeTrialChatIntelligence.deserialize);
intelligenceRegistry.registerChatIntelligenceSerializer(OpenAIChatIntelligence.type, OpenAIChatIntelligence.deserialize);
intelligenceRegistry.registerChatIntelligenceSerializer(BabelDuckChatIntelligence.type, BabelDuckChatIntelligence.deserialize);
intelligenceRegistry.registerChatIntelligenceSerializer(TutorialChatIntelligence.type, TutorialChatIntelligence.deserialize);

export const builtinIntelligenceSettings: Record<string, chatIntelligenceSettings> = {
    [FreeTrialChatIntelligence.id]: { name: { key: 'Free Trial' }, type: FreeTrialChatIntelligence.type, settings: {} },
    [OpenAIChatIntelligence.id]: { name: OpenAIChatIntelligence._name, type: OpenAIChatIntelligence.type, settings: OpenAIChatIntelligence.defaultSettings },
}

const babelDuckSettings = {
    id: BabelDuckChatIntelligence.id,
    name: { key: 'BabelDuck' },
    type: BabelDuckChatIntelligence.type,
    settings: {}
}
