"use client";

import { useTranslation } from "react-i18next";
import {
  OpenAICompatibleAPIService,
  OpenAICompatibleAPISettings,
  OpenAIService,
  OpenAISettings,
  SiliconFlowService,
  ThreeZeroTwoAIService,
  ThreeZeroTwoAISettings,
} from "../lib/llm-service";
import {
  DropdownMenu,
  DropdownMenuEntry,
} from "@/app/ui-utils/components/DropdownMenu";
import { useState } from "react";
import { TransparentOverlay } from "@/app/ui-utils/components/overlay";
import {
  FilledButton,
  TmpFilledButton,
} from "@/app/ui-utils/components/button";
import { IoMdInformationCircleOutline } from "react-icons/io";
import Link from "next/link";
import toast from "react-hot-toast";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface LLMSettingsProps<T> {
  settings: T;
  updateSettings: (settings: T) => void;
}
export type LLMSettingsComponent<T> = (
  props: LLMSettingsProps<T>
) => React.ReactNode;

const settingsRegistry: Record<string, LLMSettingsComponent<object>> = {};
export function getLLMSettingsComponent(
  type: string
): LLMSettingsComponent<object> {
  const component = settingsRegistry[type];
  if (!component) {
    throw new Error(`Settings component for ${type} not found`);
  }
  return component;
}
export function registerLLMSettingsComponent(
  type: string,
  component: LLMSettingsComponent<object>
) {
  if (settingsRegistry[type]) {
    throw new Error(`Settings component for ${type} already registered`);
  }
  settingsRegistry[type] = component;
}

// ============================= LLM Service Settings Components =============================

export function OpenAICompatibleAPIServiceSettings({
  settings: unTypedSettings,
  updateSettings,
}: LLMSettingsProps<object>) {
  const settings = unTypedSettings as OpenAICompatibleAPISettings;
  const { t } = useTranslation();

  const [name, setName] = useState(settings.name);
  const [ChatURL, setChatURL] = useState(settings.URL);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [chatCompletionModel, setChatCompletionModel] = useState(
    settings.chatCompletionModel
  );

  const [lastTimeSavedSettings, setLastTimeSavedSettings] = useState(settings);
  const settingsChanged: boolean =
    lastTimeSavedSettings.URL !== ChatURL ||
    lastTimeSavedSettings.apiKey !== apiKey ||
    lastTimeSavedSettings.name !== name ||
    lastTimeSavedSettings.chatCompletionModel !== chatCompletionModel;

  return (
    <div className="flex flex-col">
      {/* name */}
      <div className="flex flex-col mb-8">
        <span className="text-gray-700 font-bold mb-2">{t("Name")}</span>
        <input
          type="text"
          placeholder="Service Name"
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {/* model */}
      <div className="flex flex-col mb-8">
        <span className="text-gray-700 font-bold mb-2">
          {t("Model-Single-Form")}
        </span>
        <input
          type="text"
          placeholder="gpt-3.5-turbo"
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={chatCompletionModel}
          onChange={(e) => setChatCompletionModel(e.target.value)}
        />
      </div>
      {/* base url */}
      <div className="mb-8 flex flex-col">
        <span className="text-gray-700 font-bold mb-2">{"URL"}</span>
        <div className="flex flex-row items-center mb-2 text-sm text-gray-400">
          <IoMdInformationCircleOutline size={14} className="mr-1" />
          <span>{t("Please enter the complete URL including the path")}</span>
        </div>
        <input
          type="text"
          id="base-url"
          placeholder="https://api.openai.com/v1/chat/completions"
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={ChatURL}
          onChange={(e) => setChatURL(e.target.value)}
        />
      </div>
      {/* api key */}
      <div className="mb-8 flex flex-col">
        <span className="text-gray-700 font-bold mb-2">{t("API Key")}</span>
        <input
          type="text"
          id="api-key"
          placeholder="sk-..."
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      {/* save button */}
      {settingsChanged && (
        <FilledButton
          className="w-fit self-end"
          onClick={() => {
            const newSettings = {
              name,
              URL: ChatURL,
              apiKey,
              chatCompletionModel,
            };
            setLastTimeSavedSettings(newSettings);
            updateSettings(newSettings);
          }}
        >
          {t("Save")}
        </FilledButton>
      )}
    </div>
  );
}

export function OpenAIServiceSettings({
  settings: unTypedSettings,
  updateSettings,
}: LLMSettingsProps<object>) {
  const settings = unTypedSettings as OpenAISettings;
  const { t } = useTranslation();

  const [chatURL, setChatURL] = useState(settings.URL);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [chatCompletionModel, setChatCompletionModel] = useState(
    settings.chatCompletionModel
  );

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const toggleModelDropdown = () => setShowModelDropdown(!showModelDropdown);

  const [lastTimeSavedSettings, setLastTimeSavedSettings] = useState(settings);
  const settingsChanged: boolean =
    lastTimeSavedSettings.URL !== chatURL ||
    lastTimeSavedSettings.apiKey !== apiKey ||
    lastTimeSavedSettings.chatCompletionModel !== chatCompletionModel;

  return (
    <div className="flex flex-col">
      {/* model */}
      <div className="flex flex-col mb-8">
        <span className="text-gray-700 font-bold mb-2">
          {t("Model-Single-Form")}
        </span>
        <div className="relative">
          <DropdownMenuEntry
            className="w-fit bg-gray-100"
            label={chatCompletionModel}
            onClick={toggleModelDropdown}
          />
          {showModelDropdown && (
            <>
              {" "}
              <DropdownMenu
                className="absolute left-0 top-full"
                menuItems={OpenAIService.availableChatModels.map((model) => ({
                  label: model,
                  onClick: () => {
                    setChatCompletionModel(model);
                    toggleModelDropdown();
                  },
                }))}
              />
              <TransparentOverlay onClick={toggleModelDropdown} />
            </>
          )}
        </div>
      </div>
      {/* base url */}
      <div className="mb-8 flex flex-col">
        <span className="text-gray-700 font-bold mb-2">{"URL"}</span>
        <div className="flex flex-row items-center mb-2 text-sm text-gray-400">
          <IoMdInformationCircleOutline size={14} className="mr-1" />
          <span>{t("Please enter the complete URL including the path")}</span>
        </div>
        <input
          type="text"
          id="base-url"
          placeholder="https://api.openai.com/v1/chat/completions"
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={chatURL}
          onChange={(e) => setChatURL(e.target.value)}
        />
      </div>
      {/* api key */}
      <div className="mb-8 flex flex-col">
        <span className="text-gray-700 font-bold mb-2">{t("API Key")}</span>
        <input
          type="text"
          id="api-key"
          placeholder="sk-..."
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      {/* save button */}
      {settingsChanged && (
        <FilledButton
          className="w-fit self-end"
          onClick={() => {
            setLastTimeSavedSettings({
              URL: chatURL,
              apiKey,
              chatCompletionModel,
            });
            updateSettings({ URL: chatURL, apiKey, chatCompletionModel });
          }}
        >
          {t("Save")}
        </FilledButton>
      )}
    </div>
  );
}

export function SiliconFlowServiceSettings({
  settings: unTypedSettings,
  updateSettings,
}: LLMSettingsProps<object>) {
  const settings = unTypedSettings as OpenAISettings;
  const { t } = useTranslation();

  const [chatURL, setChatURL] = useState(settings.URL);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [chatCompletionModel, setChatCompletionModel] = useState(
    settings.chatCompletionModel
  );

  const [lastTimeSavedSettings, setLastTimeSavedSettings] = useState(settings);
  const settingsChanged: boolean =
    lastTimeSavedSettings.URL !== chatURL ||
    lastTimeSavedSettings.apiKey !== apiKey ||
    lastTimeSavedSettings.chatCompletionModel !== chatCompletionModel;

  return (
    <div className="flex flex-col">
      {/* model */}
      <div className="flex flex-col mb-8">
        <span className="text-gray-700 font-bold mb-2">
          {t("Model-Single-Form")}
        </span>
        <input
          type="text"
          placeholder="gpt-3.5-turbo"
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={chatCompletionModel}
          onChange={(e) => setChatCompletionModel(e.target.value)}
        />
      </div>
      {/* base url */}
      <div className="mb-8 flex flex-col">
        <span className="text-gray-700 font-bold mb-2">{"URL"}</span>
        <div className="flex flex-row items-center mb-2 text-sm text-gray-400">
          <IoMdInformationCircleOutline size={14} className="mr-1" />
          <span>{t("Please enter the complete URL including the path")}</span>
        </div>
        <input
          type="text"
          id="base-url"
          placeholder={SiliconFlowService.defaultChatCompletionURL}
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={chatURL}
          onChange={(e) => setChatURL(e.target.value)}
        />
      </div>
      {/* api key */}
      <div className="mb-8 flex flex-col">
        <span className="text-gray-700 font-bold mb-2">{t("API Key")}</span>
        <input
          type="text"
          id="api-key"
          placeholder="sk-..."
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      {/* save button */}
      {settingsChanged && (
        <FilledButton
          className="w-fit self-end"
          onClick={() => {
            setLastTimeSavedSettings({
              URL: chatURL,
              apiKey,
              chatCompletionModel,
            });
            updateSettings({ URL: chatURL, apiKey, chatCompletionModel });
          }}
        >
          {t("Save")}
        </FilledButton>
      )}
    </div>
  );
}

export function ThreeZeroTwoAIServiceSettings({
  settings: unTypedSettings,
  updateSettings,
}: LLMSettingsProps<object>) {
  const settings = unTypedSettings as ThreeZeroTwoAISettings;
  const { t } = useTranslation();
  const getApiKeyLink = "https://302.ai";

  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [chatCompletionModel, setChatCompletionModel] = useState(
    settings.chatCompletionModel
  );
  const [open, setOpen] = useState(false);

  const [isTesting, setIsTesting] = useState(false);

  const [lastTimeSavedSettings, setLastTimeSavedSettings] = useState(settings);
  const settingsChanged: boolean =
    lastTimeSavedSettings.apiKey !== apiKey ||
    lastTimeSavedSettings.chatCompletionModel !== chatCompletionModel;

  const handleTestAPI = async () => {
    if (!apiKey.trim()) {
      toast.error(t("Please enter an API key first"));
      return;
    }

    setIsTesting(true);

    try {
      const service = new ThreeZeroTwoAIService(apiKey, chatCompletionModel);
      const result = await service.testAPIKey();

      if (result.success) {
        toast.success(t("API test successful"));
      } else {
        toast.error(result.error || t("API test failed"));
      }
    } catch (error) {
      console.error("API test error:", error);
      toast.error(t("API test failed"));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* 302.AI product introduction */}
      <div className="flex flex-col mb-4">
        <span className="text-gray-400 text-sm">
          {t("302.AI Product Introduction")}
        </span>
      </div>
      {/* model */}
      <div className="flex flex-col mb-8">
        <span className="text-gray-700 font-bold mb-2">
          {t("Model-Single-Form")}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-fit min-w-[200px] justify-between"
            >
              {chatCompletionModel || t("Select Model")}
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder={t("Search model...")} />
              <CommandList>
                <CommandEmpty>{t("No model found.")}</CommandEmpty>
                <CommandGroup>
                  {ThreeZeroTwoAIService.availableChatModels.map((model) => (
                    <CommandItem
                      key={model}
                      value={model}
                      onSelect={(currentValue) => {
                        setChatCompletionModel(
                          currentValue === chatCompletionModel ? "" : currentValue
                        );
                        setOpen(false);
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          "mr-2 h-4 w-4",
                          chatCompletionModel === model ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {model}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {/* api key */}
      <div className="mb-8 flex flex-col">
        <div className="flex flex-row items-center justify-between mb-2">
          <div className="flex flex-row items-center">
            <span className="text-gray-700 font-bold">{t("API Key")}</span>
            <Link
              href={getApiKeyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 text-sm ml-2"
            >
              {t("Get API Key")}
            </Link>
          </div>
          <TmpFilledButton
            className={`py-0 px-2 mr-2 rounded-md text-[13px] flex items-center ${
              isTesting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => {
              if (!isTesting) handleTestAPI();
            }}
          >
            {isTesting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-1"></div>
                {t("Testing...")}
              </>
            ) : (
              t("Test")
            )}
          </TmpFilledButton>
        </div>
        <input
          type="text"
          id="api-key"
          placeholder="sk-..."
          className="border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      {/* save button */}
      {settingsChanged && (
        <FilledButton
          className="w-fit self-end"
          onClick={() => {
            setLastTimeSavedSettings({ apiKey, chatCompletionModel });
            updateSettings({ apiKey, chatCompletionModel });
          }}
        >
          {t("Save")}
        </FilledButton>
      )}
    </div>
  );
}

registerLLMSettingsComponent(OpenAIService.type, OpenAIServiceSettings);
registerLLMSettingsComponent(
  SiliconFlowService.type,
  SiliconFlowServiceSettings
);
registerLLMSettingsComponent(
  OpenAICompatibleAPIService.type,
  OpenAICompatibleAPIServiceSettings
);
registerLLMSettingsComponent(
  ThreeZeroTwoAIService.type,
  ThreeZeroTwoAIServiceSettings
);
