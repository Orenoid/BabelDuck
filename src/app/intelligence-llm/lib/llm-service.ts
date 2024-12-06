import { i18nText } from "@/app/i18n/i18n";
import { generateUUID } from "@/app/lib/uuid";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from 'ai';

// ================================ business logic ================================

export type LLMServiceSettingsRecord = {
    id: string
} & LLMServiceSettings

export type LLMServiceSettings = {
    type: string
    name: i18nText
    deletable: boolean
    settings: object
}

export function getLLMServiceSettings(): LLMServiceSettingsRecord[] {
    // built-in services + user defined services
    return getBuiltInLLMServicesSettings().concat(getCustomLLMServiceSettings())
}

// side effect: if some built-in services missing in local storage, they will be saved to local storage
export function getBuiltInLLMServicesSettings(): LLMServiceSettingsRecord[] {
    const builtInLLMServices: Record<string, LLMServiceSettings> = {
        openai: {
            type: 'openai',
            name: { text: 'OpenAI' },
            deletable: false,
            settings: OpenAIService.defaultSettings,
        },
        // siliconflow: {
        //     type: 'siliconflow',
        //     name: { text: 'SiliconFlow' },
        //     deletable: false,
        //     settings: SiliconFlowService.defaultSettings,
        // }
    }
    const builtInLLMServicesFromStorage = _getBuiltInLLMServicesFromLocalStorage()
    const inStorageServicesNumber = builtInLLMServicesFromStorage.length
    // append the services in builtInLLMServices that are not in builtInLLMServicesFromStorage
    for (const serviceId of Object.keys(builtInLLMServices)) {
        if (!builtInLLMServicesFromStorage.some((s) => s.id === serviceId)) {
            builtInLLMServicesFromStorage.push({ id: serviceId, ...builtInLLMServices[serviceId] })
        }
    }
    if (builtInLLMServicesFromStorage.length !== inStorageServicesNumber) {
        _saveBuiltInLLMServicesToLocalStorage(builtInLLMServicesFromStorage)
    }
    return builtInLLMServicesFromStorage
}

export function updateLLMServiceSettings(serviceId: string, settings: object) {
    const builtInLLMServices = _getBuiltInLLMServicesFromLocalStorage()
    const service = builtInLLMServices.find((s) => s.id === serviceId)
    if (service) {
        service.settings = settings
        _saveBuiltInLLMServicesToLocalStorage(builtInLLMServices)
    }
    const customLLMServices = _getCustomLLMServicesFromLocalStorage()
    const customService = customLLMServices.find((s) => s.id === serviceId)
    if (customService) {
        customService.settings = settings as { name: string } & object
        _saveCustomLLMServicesToLocalStorage(customLLMServices)
    }
}

export function getLLMServiceSettingsRecord(serviceId: string): LLMServiceSettingsRecord | undefined {
    return getLLMServiceSettings().find((s) => s.id === serviceId)
}

export function getCustomLLMServiceSettings(): LLMServiceSettingsRecord[] {
    return _getCustomLLMServicesFromLocalStorage().map((s) => ({
        id: s.id,
        type: s.type,
        name: { text: s.settings.name },
        deletable: true,
        settings: s.settings,
    }))
}

export function addCustomLLMServiceSettings(service: {
    type: string
    settings: { name: string } & object
}): LLMServiceSettingsRecord {
    const customLLMServices = _getCustomLLMServicesFromLocalStorage()
    const newServiceRecord = { id: generateUUID(), ...service }
    customLLMServices.push(newServiceRecord)
    _saveCustomLLMServicesToLocalStorage(customLLMServices)
    return {
        id: newServiceRecord.id,
        type: newServiceRecord.type,
        name: { text: newServiceRecord.settings.name },
        deletable: true,
        settings: newServiceRecord.settings,
    }
}

// ================================ local storage ================================

function _getBuiltInLLMServicesFromLocalStorage(): LLMServiceSettingsRecord[] {
    const builtInLLMServices = localStorage.getItem('builtInLLMServices')
    if (builtInLLMServices) {
        return JSON.parse(builtInLLMServices)
    }
    return []
}

function _saveBuiltInLLMServicesToLocalStorage(builtInLLMServices: LLMServiceSettingsRecord[]) {
    localStorage.setItem('builtInLLMServices', JSON.stringify(builtInLLMServices))
}

function _getCustomLLMServicesFromLocalStorage(): { id: string, type: string, settings: { name: string } & object }[] {
    const customLLMServices = localStorage.getItem('customLLMServices')
    if (customLLMServices) {
        return JSON.parse(customLLMServices)
    }
    return []
}

function _saveCustomLLMServicesToLocalStorage(customLLMServices: { id: string, type: string, settings: { name: string } & object }[]) {
    localStorage.setItem('customLLMServices', JSON.stringify(customLLMServices))
}

// ================================ LLM Service implementations ================================

export type OpenAICompatibleAPISettings = {
    name: string
} & OpenAISettings

function getFetchFunction(url: string): typeof globalThis.fetch {
    return async (input, init) => {
        return fetch(url, init)
    }
}

export class OpenAICompatibleAPIService {
    name: i18nText
    url: string
    apiKey: string
    chatCompletionModel: string
    static type = 'openai-compatible-api'

    constructor(name: i18nText, url: string, apiKey: string, chatCompletionModel: string) {
        this.name = name
        this.url = url
        this.apiKey = apiKey
        this.chatCompletionModel = chatCompletionModel
    }

    chatCompletionInStream(messageList: { role: string, content: string }[]) {
        const openai = createOpenAI({
            baseURL: '',
            apiKey: this.apiKey,
            fetch: getFetchFunction(this.url),
        })

        const stream = streamText({
            model: openai.chat(this.chatCompletionModel),
            messages: convertToCoreMessages(messageList as { role: 'system' | 'user' | 'assistant', content: string }[]),
        })
        return stream
    }

}

export class OpenAIService extends OpenAICompatibleAPIService {
    chatCompletionURL: string = 'https://api.openai.com/v1/chat/completions'
    static type = 'openai'
    static availableChatModels = [
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'gpt-3.5-turbo-1106',
        'gpt-3.5-turbo-0125',
        'gpt-3.5-turbo-0613',
        'gpt-3.5-turbo-16k-0613',
        'gpt-3.5-turbo-0301',
        'gpt-4',
        'gpt-4-0613',
        'gpt-4-0314',
        'gpt-4-32k',
        'gpt-4-32k-0613',
        'gpt-4-32k-0314',
        'gpt-4-turbo',
        'gpt-4-turbo-2024-04-09',
        'gpt-4-turbo-preview',
        'gpt-4-1106-preview',
        'gpt-4-0125-preview',
        'gpt-4-vision-preview',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4o-2024-05-13',
        'gpt-4o-2024-08-06',
        'gpt-4o-mini-2024-07-18',
        'chatgpt-4o-latest',
        'o1-preview',
        'o1-preview-2024-09-12',
        'o1-mini',
        'o1-mini-2024-09-12'
    ]
    static defaultSettings: OpenAISettings = {
        URL: 'https://api.openai.com/v1/chat/completions',
        apiKey: '',
        chatCompletionModel: 'gpt-4o-mini',
    }

    constructor(url: string, apiKey: string, chatCompletionModel: string) {
        super({ text: 'OpenAI' }, url, apiKey, chatCompletionModel)
    }

    static deserialize(settings: object): OpenAIService {
        // Type guard to check if settings matches OpenAISettings structure
        const isOpenAISettings = (obj: object): obj is OpenAISettings => {
            return 'URL' in obj && typeof obj.URL === 'string' &&
                'apiKey' in obj && typeof obj.apiKey === 'string' &&
                'chatCompletionModel' in obj && typeof obj.chatCompletionModel === 'string';
        }

        if (!isOpenAISettings(settings)) {
            throw new Error('Invalid OpenAI settings');
        }

        return new OpenAIService(settings.URL, settings.apiKey, settings.chatCompletionModel);
    }
}

export type OpenAISettings = {
    URL: string
    apiKey: string
    chatCompletionModel: string
}

export class SiliconFlowService extends OpenAICompatibleAPIService {
    static type = 'siliconflow'

    constructor(apiKey: string, chatCompletionModel: string) {
        super({ text: 'SiliconFlow' }, SiliconFlowService.defaultChatCompletionURL, apiKey, chatCompletionModel)
    }

    static defaultChatCompletionURL = 'https://api.siliconflow.cn/v1/chat/completions'

    static availableChatModels = ['deepseek-ai/DeepSeek-V2.5']

    static defaultSettings: OpenAISettings = {
        URL: SiliconFlowService.defaultChatCompletionURL,
        apiKey: '',
        chatCompletionModel: '',
    }
}
