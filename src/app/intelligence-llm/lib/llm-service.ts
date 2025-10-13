import { i18nText } from "@/app/i18n/i18n";
import { generateUUID } from "@/app/lib/uuid";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

// ================================ business logic ================================

export type LLMServiceSettingsRecord = {
  id: string;
} & LLMServiceSettings;

export type LLMServiceSettings = {
  type: string;
  name: i18nText;
  deletable: boolean;
  settings: object;
};

export function getLLMServiceSettings(): LLMServiceSettingsRecord[] {
  // built-in services + user defined services
  return getBuiltInLLMServicesSettings().concat(getCustomLLMServiceSettings());
}

// side effect: if some built-in services missing in local storage, they will be saved to local storage
export function getBuiltInLLMServicesSettings(): LLMServiceSettingsRecord[] {
  const builtInLLMServices: Record<string, LLMServiceSettings> = {
    openai: {
      type: "openai",
      name: { text: "OpenAI" },
      deletable: false,
      settings: OpenAIService.defaultSettings,
    },
    // siliconflow: {
    //     type: 'siliconflow',
    //     name: { text: 'SiliconFlow' },
    //     deletable: false,
    //     settings: SiliconFlowService.defaultSettings,
    // }
    "302ai": {
      type: "302ai",
      name: { text: "302.AI" },
      deletable: false,
      settings: {
        apiKey: "",
        chatCompletionModel: "qwen3-14b",
      },
    },
  };
  const builtInLLMServicesFromStorage =
    _getBuiltInLLMServicesFromLocalStorage();
  const inStorageServicesNumber = builtInLLMServicesFromStorage.length;
  // append the services in builtInLLMServices that are not in builtInLLMServicesFromStorage
  for (const serviceId of Object.keys(builtInLLMServices)) {
    if (!builtInLLMServicesFromStorage.some((s) => s.id === serviceId)) {
      builtInLLMServicesFromStorage.push({
        id: serviceId,
        ...builtInLLMServices[serviceId],
      });
    }
  }
  if (builtInLLMServicesFromStorage.length !== inStorageServicesNumber) {
    _saveBuiltInLLMServicesToLocalStorage(builtInLLMServicesFromStorage);
  }
  return builtInLLMServicesFromStorage;
}

export function updateLLMServiceSettings(serviceId: string, settings: object) {
  const builtInLLMServices = _getBuiltInLLMServicesFromLocalStorage();
  const service = builtInLLMServices.find((s) => s.id === serviceId);
  if (service) {
    service.settings = settings;
    _saveBuiltInLLMServicesToLocalStorage(builtInLLMServices);
  }
  const customLLMServices = _getCustomLLMServicesFromLocalStorage();
  const customService = customLLMServices.find((s) => s.id === serviceId);
  if (customService) {
    customService.settings = settings as { name: string } & object;
    _saveCustomLLMServicesToLocalStorage(customLLMServices);
  }
}

export function getLLMServiceSettingsRecord(
  serviceId: string
): LLMServiceSettingsRecord | undefined {
  return getLLMServiceSettings().find((s) => s.id === serviceId);
}

export function getCustomLLMServiceSettings(): LLMServiceSettingsRecord[] {
  return _getCustomLLMServicesFromLocalStorage().map((s) => ({
    id: s.id,
    type: s.type,
    name: { text: s.settings.name },
    deletable: true,
    settings: s.settings,
  }));
}

export function addCustomLLMServiceSettings(service: {
  type: string;
  settings: { name: string } & object;
}): LLMServiceSettingsRecord {
  const customLLMServices = _getCustomLLMServicesFromLocalStorage();
  const newServiceRecord = { id: generateUUID(), ...service };
  customLLMServices.push(newServiceRecord);
  _saveCustomLLMServicesToLocalStorage(customLLMServices);
  return {
    id: newServiceRecord.id,
    type: newServiceRecord.type,
    name: { text: newServiceRecord.settings.name },
    deletable: true,
    settings: newServiceRecord.settings,
  };
}

// ================================ local storage ================================

function _getBuiltInLLMServicesFromLocalStorage(): LLMServiceSettingsRecord[] {
  const builtInLLMServices = localStorage.getItem("builtInLLMServices");
  if (builtInLLMServices) {
    return JSON.parse(builtInLLMServices);
  }
  return [];
}

function _saveBuiltInLLMServicesToLocalStorage(
  builtInLLMServices: LLMServiceSettingsRecord[]
) {
  localStorage.setItem(
    "builtInLLMServices",
    JSON.stringify(builtInLLMServices)
  );
}

function _getCustomLLMServicesFromLocalStorage(): {
  id: string;
  type: string;
  settings: { name: string } & object;
}[] {
  const customLLMServices = localStorage.getItem("customLLMServices");
  if (customLLMServices) {
    return JSON.parse(customLLMServices);
  }
  return [];
}

function _saveCustomLLMServicesToLocalStorage(
  customLLMServices: {
    id: string;
    type: string;
    settings: { name: string } & object;
  }[]
) {
  localStorage.setItem("customLLMServices", JSON.stringify(customLLMServices));
}

// ================================ LLM Service implementations ================================

export type OpenAICompatibleAPISettings = {
  name: string;
} & OpenAISettings;

function getFetchFunction(url: string): typeof globalThis.fetch {
  return async (input, init) => {
    return fetch(url, init);
  };
}

export class OpenAICompatibleAPIService {
  name: i18nText;
  url: string;
  apiKey: string;
  chatCompletionModel: string;
  static type = "openai-compatible-api";

  constructor(
    name: i18nText,
    url: string,
    apiKey: string,
    chatCompletionModel: string
  ) {
    this.name = name;
    this.url = url;
    this.apiKey = apiKey;
    this.chatCompletionModel = chatCompletionModel;
  }

  chatCompletionInStream(messageList: { role: string; content: string }[]) {
    const openai = createOpenAI({
      baseURL: "",
      apiKey: this.apiKey,
      fetch: getFetchFunction(this.url),
    });

    const stream = streamText({
      model: openai.chat(this.chatCompletionModel),
      messages: convertToCoreMessages(
        messageList as {
          role: "system" | "user" | "assistant";
          content: string;
        }[]
      ),
    });
    return stream;
  }
}

export class OpenAIService extends OpenAICompatibleAPIService {
  chatCompletionURL: string = "https://api.openai.com/v1/chat/completions";
  static type = "openai";
  static availableChatModels = [
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-16k",
    "gpt-3.5-turbo-1106",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-0613",
    "gpt-3.5-turbo-16k-0613",
    "gpt-3.5-turbo-0301",
    "gpt-4",
    "gpt-4-0613",
    "gpt-4-0314",
    "gpt-4-32k",
    "gpt-4-32k-0613",
    "gpt-4-32k-0314",
    "gpt-4-turbo",
    "gpt-4-turbo-2024-04-09",
    "gpt-4-turbo-preview",
    "gpt-4-1106-preview",
    "gpt-4-0125-preview",
    "gpt-4-vision-preview",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4o-2024-05-13",
    "gpt-4o-2024-08-06",
    "gpt-4o-mini-2024-07-18",
    "chatgpt-4o-latest",
    "o1-preview",
    "o1-preview-2024-09-12",
    "o1-mini",
    "o1-mini-2024-09-12",
  ];
  static defaultSettings: OpenAISettings = {
    URL: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
    chatCompletionModel: "gpt-4o-mini",
  };

  constructor(url: string, apiKey: string, chatCompletionModel: string) {
    super({ text: "OpenAI" }, url, apiKey, chatCompletionModel);
  }

  static deserialize(settings: object): OpenAIService {
    // Type guard to check if settings matches OpenAISettings structure
    const isOpenAISettings = (obj: object): obj is OpenAISettings => {
      return (
        "URL" in obj &&
        typeof obj.URL === "string" &&
        "apiKey" in obj &&
        typeof obj.apiKey === "string" &&
        "chatCompletionModel" in obj &&
        typeof obj.chatCompletionModel === "string"
      );
    };

    if (!isOpenAISettings(settings)) {
      throw new Error("Invalid OpenAI settings");
    }

    return new OpenAIService(
      settings.URL,
      settings.apiKey,
      settings.chatCompletionModel
    );
  }
}

export type OpenAISettings = {
  URL: string;
  apiKey: string;
  chatCompletionModel: string;
};

export class SiliconFlowService extends OpenAICompatibleAPIService {
  static type = "siliconflow";

  constructor(apiKey: string, chatCompletionModel: string) {
    super(
      { text: "SiliconFlow" },
      SiliconFlowService.defaultChatCompletionURL,
      apiKey,
      chatCompletionModel
    );
  }

  static defaultChatCompletionURL =
    "https://api.siliconflow.cn/v1/chat/completions";

  static availableChatModels = ["deepseek-ai/DeepSeek-V2.5"];

  static defaultSettings: OpenAISettings = {
    URL: SiliconFlowService.defaultChatCompletionURL,
    apiKey: "",
    chatCompletionModel: "",
  };
}

export type ThreeZeroTwoAISettings = {
  apiKey: string;
  chatCompletionModel: string;
};

export class ThreeZeroTwoAIService extends OpenAICompatibleAPIService {
  static chatCompletionURL = "https://api.302.ai/v1/chat/completions";
  static type = "302ai";
  static availableChatModels = [
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-1106",
    "gpt-3.5-turbo-16k",
    "gpt-4",
    "gpt-4-0125-preview",
    "gpt-4-0613",
    "gpt-4-1106-preview",
    "gpt-4-32k",
    "gpt-4-32k-0613",
    "gpt-4-turbo-preview",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-instruct",
    "gpt-4-gizmo-*",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
    "qwen-turbo",
    "qwen-plus",
    "qwen-max",
    "qwen-max-latest",
    "glm-4-0520",
    "glm-4v",
    "Baichuan2-53B",
    "Baichuan2-Turbo",
    "Baichuan2-Turbo-192k",
    "moonshot-v1-128k",
    "moonshot-v1-32k",
    "moonshot-v1-8k",
    "ernie-4.0-8k",
    "gpt-4-turbo",
    "command-r-plus",
    "deepseek-chat",
    "gpt-4o",
    "qwen-long",
    "glm-4-air",
    "glm-4-flash",
    "qwen2-72b-instruct",
    "qwen2-7b-instruct",
    "Doubao-pro-32k",
    "Doubao-pro-128k",
    "qwen-vl-max",
    "qwen-vl-plus",
    "claude-3-5-sonnet-20240620",
    "step-1v-32k",
    "step-1v-8k",
    "yi-vision-v2",
    "generalv3.5",
    "ernie-4.0-turbo-8k",
    "Baichuan3-Turbo",
    "Baichuan3-Turbo-128k",
    "Baichuan4",
    "SenseChat-5",
    "SenseChat-Turbo",
    "codegeex-4",
    "gpt-4o-mini",
    "gpt-4o-mini-2024-07-18",
    "llama3.1-405b",
    "llama3.1-70b",
    "llama3.1-8b",
    "mistral-large-2",
    "deepseek-ai/DeepSeek-V2.5",
    "step-2-16k",
    "command-r",
    "gpt-4-plus",
    "abab6.5s-chat",
    "gpt-4o-2024-08-06",
    "chatgpt-4o-latest",
    "glm-4-long",
    "hunyuan-lite",
    "hunyuan-standard",
    "hunyuan-standard-256K",
    "hunyuan-pro",
    "hunyuan-code",
    "hunyuan-role",
    "hunyuan-functioncall",
    "hunyuan-vision",
    "Qwen/Qwen2-7B-Instruct",
    "gpt-3.5-sonnet-cursor",
    "glm-4-plus",
    "glm-4v-plus",
    "o1-preview",
    "o1-mini",
    "o1-mini-2024-09-12",
    "qwen-math-plus",
    "qwen2.5-72b-instruct",
    "qwen2.5-32b-instruct",
    "qwen2.5-14b-instruct",
    "qwen2.5-3b-instruct",
    "qwen2.5-math-72b-instruct",
    "qwen2.5-coder-7b-instruct",
    "llama3.2-90b",
    "llama3.2-11b",
    "gpt-4o-2024-05-13",
    "yi-lightning",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-latest",
    "claude-3-5-haiku-20241022",
    "grok-beta",
    "gpt-4-turbo-2024-04-09",
    "qwen-turbo-latest",
    "qwen-turbo-2024-11-01",
    "pixtral-large-2411",
    "mistral-large-2411",
    "gpt-4o-2024-11-20",
    "gpt-4o-plus",
    "ernie-4.0-turbo-128k",
    "grok-vision-beta",
    "Doubao-vision-pro-32k",
    "abab7-chat-preview",
    "coder-claude-3-5-sonnet-20240620",
    "coder-claude-3-5-sonnet-20241022",
    "nova-pro",
    "nova-lite",
    "nova-micro",
    "qwq-32b-preview",
    "llama3.3-70b",
    "qwen-vl-ocr",
    "o1-plus",
    "gemini-2.0-flash-exp",
    "Doubao-Vision-Lite-32k",
    "qwen2.5-coder-32b-instruct",
    "o1",
    "grok-2-1212",
    "grok-2-vision-1212",
    "deepseek-ai/deepseek-vl2",
    "deepseek-vl2",
    "gemini-2.0-flash-thinking-exp-1219",
    "qwen2.5-7b-instruct",
    "o1-2024-12-17",
    "Qwen/QVQ-72B-Preview",
    "QVQ-72B-Preview",
    "Qwen/Qwen2.5-Coder-32B-Instruct",
    "Qwen/Qwen2-VL-72B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct-128K",
    "Qwen/Qwen2.5-32B-Instruct",
    "Qwen/Qwen2.5-14B-Instruct",
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen2.5-Coder-7B-Instruct",
    "internlm/internlm2_5-7b-chat",
    "THUDM/glm-4-9b-chat",
    "Pro/Qwen/Qwen2.5-Coder-7B-Instruct",
    "Pro/Qwen/Qwen2.5-7B-Instruct",
    "Pro/Qwen/Qwen2-7B-Instruct",
    "Pro/THUDM/glm-4-9b-chat",
    "MiniMax-Text-01",
    "moonshot-v1-8k-vision-preview",
    "moonshot-v1-32k-vision-preview",
    "moonshot-v1-128k-vision-preview",
    "claude-3-5-haiku-latest",
    "claude-3-5-haiku",
    "step-2-16k-exp",
    "step-2-mini",
    "deepseek-reasoner",
    "Doubao-1.5-vision-pro-32k",
    "Doubao-1.5-pro-32k",
    "Doubao-1.5-lite-32k",
    "Doubao-1.5-pro-256k",
    "sonar-pro",
    "sonar",
    "gemini-2.0-flash-thinking-exp-01-21",
    "step-1o-vision-32k",
    "gemini-2.0-flash-exp-search",
    "deepseek-r1",
    "deepseek-ai/DeepSeek-V3",
    "deepseek-ai/DeepSeek-R1",
    "sonar-reasoning",
    "o3-mini",
    "o3-mini-2025-01-31",
    "gpt-3.5-sonnet-20241022-cursor",
    "gpt-3.5-sonnet-20240620-cursor",
    "gpt-4o-sonnet-cursor",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B",
    "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    "deepseek-r1-huoshan",
    "deepseek-v3-huoshan",
    "deepseek-r1-baidu",
    "deepseek-v3-baidu",
    "deepseek-v3",
    "gemini-2.0-flash",
    "gemini-2.0-pro-exp-02-05",
    "Pro/deepseek-ai/DeepSeek-V3",
    "Pro/deepseek-ai/DeepSeek-R1",
    "gemini-2.0-flash-search",
    "deepseek-r1-aliyun",
    "deepseek-v3-aliyun",
    "zzkj",
    "zzkj-think",
    "zzkj-lite",
    "zzkj-genetics",
    "sonar-reasoning-pro",
    "grok-3",
    "grok-3-reasoner",
    "grok-3-deepsearch",
    "qwen2.5-vl-72b-instruct",
    "qwen2.5-vl-7b-instruct",
    "qwen2.5-vl-3b-instruct",
    "qwen-omni-turbo",
    "claude-3-7-sonnet-20250219",
    "claude-3-7-sonnet-latest",
    "claude-3-7-sonnet-20250219-thinking",
    "kimi-latest",
    "sonar-deep-research",
    "hunyuan-turbos-20250226",
    "gpt-3.7-sonnet-20250219-cursor",
    "qwq-plus",
    "qwq-32b",
    "Qwen/QwQ-32B",
    "deepseek-r1-distill-llama-70b",
    "mistral-small-latest",
    "mistral-large-latest",
    "pixtral-large-latest",
    "mistral-small-2503",
    "gemini-2.0-flash-exp-image-generation",
    "doubao-seededit",
    "hunyuan-t1-latest",
    "hunyuan-t1-20250321",
    "qwen2.5-vl-32b-instruct",
    "ernie-4.5-8k-preview",
    "qwen2.5-omni-7b",
    "qvq-max",
    "step-r1-v-mini",
    "grok-3-beta",
    "grok-3-fast-beta",
    "grok-3-mini-beta",
    "grok-3-mini-fast-beta",
    "glm-z1-air",
    "glm-z1-airx",
    "glm-z1-flash",
    "glm-4-air-250414",
    "glm-4-flash-250414",
    "gpt-4.1",
    "gpt-4.1-2025-04-14",
    "gpt-4.1-mini",
    "gpt-4.1-mini-2025-04-14",
    "gpt-4.1-nano",
    "gpt-4.1-nano-2025-04-14",
    "THUDM/GLM-Z1-32B-0414",
    "THUDM/GLM-Z1-Rumination-32B-0414",
    "THUDM/GLM-Z1-9B-0414",
    "THUDM/GLM-4-9B-0414",
    "THUDM/GLM-4-32B-0414",
    "o3",
    "o4-mini",
    "o4-mini-2025-04-16",
    "o3-2025-04-16",
    "doubao-1-5-thinking-pro-250415",
    "doubao-1-5-thinking-pro-vision-250415",
    "qwen3-235b-a22b",
    "qwen3-32b",
    "qwen3-30b-a3b",
    "qwen3-14b",
    "qwen3-8b",
    "qwen3-4b",
    "qwen3-1.7b",
    "qwen3-0.6b",
    "gpt-4o-search-preview",
    "gpt-4o-mini-search-preview",
    "kimi-thinking-preview",
    "doubao-1.5-ui-tars-250328",
    "llama-4-scout",
    "llama-4-maverick",
    "mistral-medium-latest",
    "SenseNova-V6-Pro",
    "SenseNova-V6-Turbo",
    "SenseNova-V6-Reasoner",
    "ernie-x1-turbo-32k",
    "ernie-4.5-turbo-vl-32k",
    "ernie-4.5-turbo-128k",
    "doubao-1-5-thinking-vision-pro-250428",
    "devstral-small-2505",
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-sonnet-4-20250514-thinking",
    "claude-opus-4-20250514-thinking",
    "gemini-2.0-flash-preview-image-generation",
    "DeepSeek-R1-0528",
    "deepseek-r1-huoshan-0528",
    "deepseek/deepseek-r1-0528",
    "gemini-2.5-flash-deepsearch",
    "gemini-2.5-pro-deepsearch",
    "deepseek/deepseek-r1-0528-qwen3-8b",
    "deepseek/deepseek-v3-0324",
    "qwen/qwen3-235b-a22b-fp8",
    "qwen/qwen3-32b-fp8",
    "qwen/qwen3-30b-a3b-fp8",
    "deepseek/deepseek-prover-v2-671b",
    "deepseek/deepseek-r1-turbo",
    "deepseek/deepseek-v3-turbo",
    "deepseek/deepseek-v3/community",
    "deepseek/deepseek-r1/community",
    "deepseek/deepseek-r1-distill-qwen-32b",
    "deepseek/deepseek-r1-distill-qwen-14b",
    "deepseek/deepseek-r1-distill-llama-70b",
    "deepseek/deepseek-r1-distill-llama-8b",
    "qwen/qwen-2.5-72b-instruct",
    "qwen/qwen3-8b-fp8",
    "meta-llama/llama-3.2-3b-instruct",
    "qwen/qwen3-4b-fp8",
    "o3-pro",
    "o3-pro-2025-06-10",
    "doubao-seed-1-6-thinking-250615",
    "doubao-seed-1-6-250615",
    "doubao-seed-1-6-flash-250615",
    "codex-mini-latest",
    "gemini-2.0-flash-lite",
    "MiniMax-M1",
    "MiniMaxAI/MiniMax-M1-80k",
    "Tongyi-Zhiwen/QwenLong-L1-32B",
    "Qwen/Qwen3-30B-A3B",
    "Qwen/Qwen3-32B",
    "Qwen/Qwen3-14B",
    "Qwen/Qwen3-8B",
    "Qwen/Qwen2.5-VL-32B-Instruct",
    "Qwen/Qwen3-235B-A22B",
    "Pro/Qwen/Qwen2.5-VL-7B-Instruct",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite-preview-06-17",
    "v0-1.5-md",
    "v0-1.5-lg",
    "v0-1.0-md",
    "gemini-2.5-flash-nothink",
    "gpt-4-sonnet-20250514-cursor",
    "gpt-4-opus-4-20250514-cursor",
    "gpt-4-opus-20250514-cursor",
    "o3-deep-research",
    "o3-deep-research-2025-06-26",
    "o4-mini-deep-research",
    "o4-mini-deep-research-2025-06-26",
    "baidu/ERNIE-4.5-300B-A47B",
    "tencent/Hunyuan-A13B-Instruct",
    "moonshotai/Kimi-Dev-72B",
    "doubao-1.5-vision-pro-250328",
    "doubao-1.5-vision-lite-250315",
    "glm-4.1v-thinking-flash",
    "glm-4.1v-thinking-flashx",
    "sophnet/DeepSeek-R1-0528",
    "sophnet/DeepSeek-R1",
    "sophnet/DeepSeek-V3-Fast",
    "sophnet/DeepSeek-v3",
    "sophnet/DeepSeek-Prover-V2",
    "sophnet/Qwen3-14B",
    "sophnet/Qwen3-235B-A22B",
    "sophnet/QwQ-32B",
    "sophnet/Qwen2.5-72B-Instruct",
    "sophnet/Qwen2.5-32B-Instruct",
    "sophnet/Qwen2.5-7B-Instruct",
    "sophnet/DeepSeek-R1-Distill-Llama-70B",
    "sophnet/DeepSeek-R1-Distill-Qwen-32B",
    "sophnet/DeepSeek-R1-Distill-Qwen-7B",
    "sophnet/Qwen2.5-VL-72B-Instruct",
    "sophnet/Qwen2.5-VL-32B-Instruct",
    "sophnet/Qwen2.5-VL-7B-Instruct",
    "sophnet/Qwen2-VL-72B-Instruct",
    "sophnet/Qwen2-VL-7B-Instruct",
    "grok-4",
    "kimi-k2-0711-preview",
    "devstral-small-2507",
    "devstral-medium-2507",
    "grok-4-0709",
    "gemini-2.5-pro-search",
    "gemini-2.5-flash-search",
    "sophnet/Kimi-K2",
    "qwen3-coder-480b-a35b-instruct",
    "qwen3-coder-plus",
    "gemini-2.5-flash-lite",
    "qwen/qwen3-coder-480b-a35b-instruct",
    "Qwen/Qwen3-235B-A22B-Instruct-2507",
    "qwen-mt-plus",
    "qwen-mt-turbo",
    "glm-4.5",
    "glm-4.5-x",
    "glm-4.5-air",
    "glm-4.5-airx",
    "glm-4.5-flash",
    "zai-org/glm-4.5",
    "sf/zai-org/GLM-4.5-Air",
    "Qwen/Qwen3-235B-A22B-Thinking-2507",
    "qwen3-30b-a3b-instruct-2507",
    "qwen3-235b-a22b-thinking-2507",
    "qwen3-30b-a3b-thinking-2507",
    "qwen3-235b-a22b-instruct-2507",
    "step-3",
    "qwen3-coder-30b-a3b-instruct",
    "kimi-k2-turbo-preview",
    "sophnet/Qwen3-Coder",
    "sophnet/Qwen3-32B",
    "sophnet/Qwen3-235B-A22B-Instruct-2507",
    "sophnet/GLM-4.5",
    "Qwen/Qwen3-Coder-30B-A3B-Instruct",
    "baidu/ernie-4.5-300b-a47b-paddle",
    "baidu/ernie-4.5-vl-424b-a47b",
    "baidu/ernie-4.5-0.3b",
    "baidu/ernie-4.5-21B-a3b",
    "thudm/glm-4.1v-9b-thinking",
    "claude-opus-4-1-20250805",
    "gpt-oss-120b",
    "gpt-oss-20b",
    "claude-opus-4-1-20250805-thinking",
    "cc-sonnet-4-20250514",
    "gpt-5",
    "gpt-5-2025-08-07",
    "gpt-5-mini",
    "gpt-5-mini-2025-08-07",
    "gpt-5-nano",
    "gpt-5-nano-2025-08-07",
    "gpt-5-chat-latest",
    "glm-4.5v",
    "gpt-5-thinking",
    "SenseNova-V6-5-Turbo",
    "SenseNova-V6-5-Pro",
    "doubao-seed-1-6-flash-250715",
    "doubao-seed-1-6-thinking-250715",
    "qwen-vl-max-latest",
    "qwen-vl-plus-latest",
    "kimi-k2-250711",
    "Baichuan-M2",
    "Baichuan4-Air",
    "Baichuan4-Turbo",
    "deepseek-v3.1",
    "hunyuan-turbos-20250716",
    "hunyuan-t1-20250711",
    "u1-pro",
    "u1",
    "Qwen/Qwen3-30B-A3B-Instruct-2507",
    "Qwen/Qwen3-30B-A3B-Thinking-2507",
    "deepseek-v3.1-thinking",
    "deepseek/deepseek-v3.1",
    "baichuan/baichuan-m2-32b",
    "zai-org/glm-4.5v",
    "stepfun-ai/step3",
    "cc-opus-4-1-20250805",
    "cc-3-5-haiku-20241022",
    "Pro/deepseek-ai/DeepSeek-V3.1",
    "gemini-2.5-flash-image-preview",
    "grok-code-fast-1",
    "LongCat-Flash-Chat",
    "kimi-k2-0905-turbo-preview",
    "kimi-k2-0905-preview",
    "ByteDance-Seed/Seed-OSS-36B-Instruct",
    "qwen3-max-preview",
    "Pro/moonshotai/Kimi-K2-Instruct-0905",
    "sophnet/DeepSeek-V3.1-Fast",
    "sophnet/DeepSeek-V3.1",
    "sophnet/Qwen3-30B-A3B-Instruct-2507",
    "sophnet/Seed-OSS-36B-Instruct",
    "sophnet/LongCat-Flash-Chat",
    "sophnet/Kimi-K2-0905",
    "sophnet/Qwen3-30B-A3B-Thinking-2507",
    "inclusionAI/Ling-mini-2.0",
    "qwen3-next-80b-a3b-instruct",
    "qwen3-next-80b-a3b-thinking",
    "sf/zai-org/GLM-4.5V",
    "sf/zai-org/GLM-4.5",
    "gpt-5-codex-low",
    "gpt-5-codex-medium",
    "gpt-5-codex-high",
    "gpt-5-codex",
    "grok-4-fast-reasoning",
    "grok-4-fast-non-reasoning",
    "sophnet/Qwen3-Next-80B-A3B-Instruct",
    "sophnet/Qwen3-Next-80B-A3B-Thinking",
    "qwen3-max-2025-09-23",
    "qwen3-vl-235b-a22b-thinking",
    "qwen3-vl-235b-a22b-instruct",
    "gemini-2.5-flash-preview-09-2025",
    "gemini-2.5-flash-lite-preview-09-2025",
    "sophnet/GLM-4.5V",
    "sophnet/Qwen3-VL-235B-A22B-Thinking",
    "sophnet/Qwen3-VL-235B-A22B-Instruct",
    "sophnet/Qwen3-235B-A22B-Thinking-2507",
    "deepseek-v3.2-exp",
    "deepseek-v3.2-exp-thinking",
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-5-20250929-thinking",
    "cc-sonnet-4-5-20250929",
    "deepseek/deepseek-v3.2-exp",
    "deepseek/deepseek-v3.1-terminus",
    "qwen/qwen3-vl-235b-a22b-thinking",
    "qwen/qwen3-vl-235b-a22b-instruct",
    "kwaipilot/kat-dev",
    "Pro/deepseek-ai/DeepSeek-V3.1-Terminus",
    "Qwen/Qwen3-Next-80B-A3B-Instruct",
    "Qwen/Qwen3-Next-80B-A3B-Thinking",
    "inclusionAI/Ring-flash-2.0",
    "inclusionAI/Ling-flash-2.0",
    "glm-4.6",
    "doubao-seed-1-6-vision-250815",
    "sora-2",
    "gemini-2.5-flash-image",
    "gpt-5-pro",
    "gpt-5-pro-2025-10-06",
  ];
  static defaultSettings: ThreeZeroTwoAISettings = {
    apiKey: "",
    chatCompletionModel: "",
  };

  constructor(apiKey: string, chatCompletionModel: string) {
    super(
      { text: "302.AI" },
      ThreeZeroTwoAIService.chatCompletionURL,
      apiKey,
      chatCompletionModel
    );
  }

  async testAPIKey() {
    const response = await fetch(ThreeZeroTwoAIService.chatCompletionURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen2.5-3b-instruct", // not all models on 302.ai support non-stream response, that's why we need to specify a model here
        messages: [{ role: "user", content: "Hello!" }],
      }),
    });

    const responseData = await response.json();
    console.log(responseData);

    if (response.ok) {
      return { success: true };
    } else {
      // Handle error response with proper error message
      if (responseData.error && responseData.error.message) {
        return { success: false, error: responseData.error.message };
      } else {
        return { success: false, error: "API test failed" };
      }
    }
  }

  static deserialize(settings: object): ThreeZeroTwoAIService {
    const isThreeZeroTwoAISettings = (
      obj: object
    ): obj is ThreeZeroTwoAISettings => {
      return (
        "apiKey" in obj &&
        typeof obj.apiKey === "string" &&
        "chatCompletionModel" in obj &&
        typeof obj.chatCompletionModel === "string"
      );
    };

    if (!isThreeZeroTwoAISettings(settings)) {
      throw new Error("Invalid 302.AI settings");
    }

    return new ThreeZeroTwoAIService(
      settings.apiKey,
      settings.chatCompletionModel
    );
  }
}
