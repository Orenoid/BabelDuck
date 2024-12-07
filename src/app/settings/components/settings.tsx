'use client'

import { LuSettings } from "react-icons/lu";
import { useEffect, useState, useMemo } from 'react';
import { IoMdClose, IoMdInformationCircleOutline } from "react-icons/io";
import { useTranslation } from "react-i18next";
import i18n, { i18nText, I18nText } from '../../i18n/i18n';
import { DropDownMenuV2 } from "@/app/ui-utils/components/DropdownMenu";
import { addCustomLLMServiceSettings, getLLMServiceSettings, LLMServiceSettingsRecord, OpenAICompatibleAPIService, updateLLMServiceSettings } from "@/app/intelligence-llm/lib/llm-service";
import { getLLMSettingsComponent } from "@/app/intelligence-llm/components/llm-service";
import { loadGlobalChatSettings, switchToLocalChatSettings, switchToGlobalChatSettings, setLocalChatSettings, setGlobalChatSettings, loadChatSettings } from "../lib/settings";
import { ChatSettings } from "@/app/chat/components/chat-settings";
import { LocalChatSettings } from "@/app/chat/components/chat-settings";
import { BabelDuckChatIntelligence, CustomLLMChatIntelligence, FreeTrialChatIntelligence, getSelectableChatIntelligenceSettings, getChatIntelligenceSettingsByID, OpenAIChatIntelligence } from "@/app/intelligence-llm/lib/intelligence";
import { InputHandler } from "@/app/chat/components/input-handlers";
import { BabelDuckChatISettings, CustomLLMChatISettings, FreeTrialChatISettings, OpenAIChatISettings } from "@/app/intelligence-llm/components/intelligence";
import Switch from "react-switch";
import { IconCircleWrapper } from "@/app/ui-utils/components/wrapper";
import { PiTrashBold } from "react-icons/pi";
import { Tooltip } from "react-tooltip";
import { TbCloud, TbCloudPlus } from "react-icons/tb";
import { IoStopCircleOutline } from "react-icons/io5";
import { PiSpeakerHighBold } from "react-icons/pi";
import { WebSpeechTTS } from "@/app/chat/lib/tts-service";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setCurrentChatSettings } from "@/app/chat/components/chat-redux";
import { azureRegions, azureSpeechSynthesisLanguagesLocale, azureSpeechSynthesisVoices, getSelectedSpeechSvcID, getSpeechSvcSettings, speechSynthesisSystemLanguages } from "./speech-settings";

// settings entry in the sidebar
export function SettingsEntry({ className = "" }: { className?: string }) {
    const [showSettings, setShowSettings] = useState(false);
    const { t } = useTranslation();

    return (
        <>
            <div
                className={`flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200 ${className}`}
                onClick={() => setShowSettings(true)}
            >
                <LuSettings className="mr-3" />
                <span>{t('Settings')}</span>
            </div>
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </>
    );
}

export function Settings({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const [selectedItem, setSelectedItem] = useState('Chat');

    const firstLevelMenuEntries = [
        { key: 'Chat', name: t('Chat') },
        { key: 'Speech', name: t('Speech') },
        { key: 'Models', name: t('Models') },
        { key: 'General', name: t('General') }, // Currently there are few options to set, so it's placed at the end, though it should normally be at the front
    ];

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Semi-transparent mask */}
            <div
                className="absolute inset-0 bg-black opacity-50"
                onClick={onClose}
            ></div>
            {/* Settings content */}
            <div className="bg-white rounded-2xl z-10 w-11/12 md:w-3/4 lg:w-1/2 max-w-4xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4">
                    <h2 className="text-xl font-semibold">{t('Settings')}</h2>
                    <IoMdClose
                        className="text-2xl cursor-pointer"
                        onClick={onClose}
                    />
                </div>
                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="flex flex-row h-full">
                        <div className="w-1/4">
                            {firstLevelMenuEntries.map((item) => (
                                <FirstLevelMenuEntry
                                    className="my-2"
                                    key={item.key}
                                    menuKey={item.key}
                                    menuName={item.name}
                                    selected={selectedItem === item.key}
                                    onSelect={setSelectedItem}
                                />
                            ))}
                        </div>
                        <div className="w-3/4 p-4">
                            {selectedItem === 'Chat' && <GlobalChatSettings />}
                            {selectedItem === 'Speech' && <SpeechSettings />}
                            {selectedItem === 'Models' && <LLMSettings />}
                            {selectedItem === 'General' && <GeneralSettings />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// first level menu entry in the settings pannel
function FirstLevelMenuEntry({
    menuKey,
    menuName,
    selected,
    onSelect,
    className = "",
}: {
    menuKey: string;
    menuName: string;
    selected: boolean;
    onSelect: (item: string) => void;
    className?: string;
}) {
    return (
        <div
            className={`py-2 px-4 cursor-pointer rounded-lg hover:bg-gray-100 ${selected ? 'bg-gray-200 font-semibold' : ''
                } ${className}`}
            onClick={() => onSelect(menuKey)}
        >
            {menuName}
        </div>
    );
}


// ============================= Sub Category Settings Components =============================


function GeneralSettings() {
    const { t } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
    const langNameMapping = {
        en: 'English',
        zh: '中文',
        ja: '日本語',
    }
    const langName = langNameMapping[selectedLanguage as keyof typeof langNameMapping];

    const handleLanguageChange = (newLanguage: string) => {
        setSelectedLanguage(newLanguage);
        i18n.changeLanguage(newLanguage);
        localStorage.setItem('selectedLanguage', newLanguage);
    };

    return (
        <div className="flex flex-col pl-8">
            {/* language settings */}
            <div className="flex flex-row items-center justify-between">
                <span className="text-gray-700 font-bold">{t('Select Your Language')}</span>
                <DropDownMenuV2
                    entryLabel={langName}
                    menuItems={[
                        { label: 'English', onClick: () => handleLanguageChange('en') },
                        { label: '中文', onClick: () => handleLanguageChange('zh') },
                        { label: '日本語', onClick: () => handleLanguageChange('ja') },
                    ]}
                    menuClassName="right-0"
                />
            </div>
        </div>
    );
}

function GlobalChatSettings() {

    const dispatch = useAppDispatch()
    const [chatSettings, setChatSettings] = useState(loadGlobalChatSettings())
    const { currentChatID, currentChatSettings } = useAppSelector((state) => state.currentChatSettings)

    return <CommonChatSettings chatSettings={chatSettings} updateChatSettings={(newChatSettings) => {
        setChatSettings(newChatSettings)
        setGlobalChatSettings(newChatSettings)
        if (currentChatID !== undefined && currentChatSettings !== undefined) {
            const localChatSettings = loadChatSettings(currentChatID)
            // only when the current chat is using global settings, then update redux states
            if (localChatSettings.usingGlobalSettings) {
                dispatch(setCurrentChatSettings({
                    chatID: currentChatID,
                    chatSettings: {
                        ...newChatSettings,
                        usingGlobalSettings: true,
                        inputHandlers: newChatSettings.inputHandlers.map((handler) => ({
                            handler: handler.handler.serialize(),
                            display: handler.display
                        }))
                    }
                }))
            }
        }
    }} />
}

export function LocalChatSettingsComponent({ chatID, chatSettings }: {
    chatID: string,
    chatSettings: LocalChatSettings,
}) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch()

    // if no local chat settings have been set up for this chat before, then create one
    // otherwise, switch back to the existing local chat settings
    function createOrSwitchBackToLocalChatSettings() {
        switchToLocalChatSettings(chatID)
        const localChatSettings = loadChatSettings(chatID)
        dispatch(setCurrentChatSettings({
            chatID: chatID,
            chatSettings: {
                ...localChatSettings,
                usingGlobalSettings: false,
                inputHandlers: localChatSettings.inputHandlers.map((handler) => ({
                    handler: handler.handler.serialize(),
                    display: handler.display
                })),
            }
        }))
    }

    function _switchToGlobalChatSettings() {
        switchToGlobalChatSettings(chatID)
        const globalChatSettings = loadGlobalChatSettings()
        dispatch(setCurrentChatSettings({
            chatID: chatID,
            chatSettings: {
                usingGlobalSettings: true,
                ...globalChatSettings,
                inputHandlers: globalChatSettings.inputHandlers.map((handler) => ({
                    handler: handler.handler.serialize(),
                    display: handler.display
                })),
            }
        }))
    }

    function updateChatSettings(newChatSettings: ChatSettings) {
        if (chatSettings.usingGlobalSettings) {
            // if using global settings, then update the global settings
            setGlobalChatSettings(newChatSettings)
            dispatch(setCurrentChatSettings({
                chatID: chatID,
                chatSettings: {
                    ...newChatSettings,
                    usingGlobalSettings: true,
                    inputHandlers: newChatSettings.inputHandlers.map((handler) => ({
                        handler: handler.handler.serialize(),
                        display: handler.display
                    }))
                }
            }))
        } else {
            // if using local settings, then update the local settings
            setLocalChatSettings(chatID, newChatSettings)
            dispatch(setCurrentChatSettings({
                chatID: chatID,
                chatSettings: {
                    ...newChatSettings,
                    usingGlobalSettings: false,
                    inputHandlers: newChatSettings.inputHandlers.map((handler) => ({
                        handler: handler.handler.serialize(),
                        display: handler.display
                    })),
                }
            }))
        }
    }

    return <div className="flex flex-col">
        <div className="flex flex-col mb-8">
            {/* switch for setting whether to use global settings */}
            <div className="flex flex-row items-center justify-between mb-2">
                <span className="text-gray-700 font-bold">{t('useGlobalSettings')}</span>
                <Switch className={`mr-3`} width={28} height={17} uncheckedIcon={false} checkedIcon={false} onColor="#000000"
                    checked={chatSettings.usingGlobalSettings} onChange={(checked) => {
                        if (checked) {
                            _switchToGlobalChatSettings()
                        } else {
                            createOrSwitchBackToLocalChatSettings()
                        }
                    }} />
            </div>
            {/* description */}
            <div className="flex flex-row items-start">
                <IoMdInformationCircleOutline size={16} className="text-gray-400 mr-1 mt-1" />
                {chatSettings.usingGlobalSettings ?
                    <span className="text-gray-400 text-sm">{t('globalSettingsDescription.enabled')}</span> :
                    <span className="text-gray-400 text-sm">{t('globalSettingsDescription.disabled')}</span>
                }
            </div>
        </div>
        <CommonChatSettings chatSettings={chatSettings} updateChatSettings={updateChatSettings} />
    </div>
}

// TODO documentation for naming abbreviations
// RO = Rendering Object [this might be a bad design...]
// chatI = chatIntelligence

type ChatSettingsRO = {
    chatISettings: {
        id: string
        name: i18nText,
        chatIType: string
        settings: object
    }
    availableChatIs: { id: string, name: i18nText }[]
    inputHandlers: { handler: InputHandler, display: boolean }[]
}

function assembleChatSettingsRO(chatSettings: ChatSettings): ChatSettingsRO {
    const availableChatIs = getSelectableChatIntelligenceSettings()
    const chatIID = chatSettings.ChatISettings.id
    const rawChatISettings = chatSettings.ChatISettings.settings
    const currentChatISettingsRecord = getChatIntelligenceSettingsByID(chatIID)

    // let chatISettingsRO: object = {}
    // if (currentChatISettingsRecord.type === OpenAIService.type) {
    //     const _openAISettings = rawChatISettings as OpenAIChatIntelligenceSettings
    //     if (_openAISettings.settingsType === 'local') {
    //         chatISettingsRO = _openAISettings.localSettings!
    //     } else {
    //         const llmServiceSettings = getLLMServiceSettingsRecord('openai')
    //         if (!llmServiceSettings) {
    //             throw new Error(`LLM service settings not found: ${_openAISettings.settingsType}`)
    //         }
    //         chatISettingsRO = llmServiceSettings.settings
    //     }
    // }

    return {
        chatISettings: {
            id: currentChatISettingsRecord.id,
            name: currentChatISettingsRecord.name,
            chatIType: currentChatISettingsRecord.type,
            settings: rawChatISettings,
        },
        availableChatIs: availableChatIs,
        inputHandlers: chatSettings.inputHandlers
    }
}

function CommonChatSettings({ chatSettings, updateChatSettings, className = "" }:
    { chatSettings: ChatSettings, updateChatSettings: (payload: ChatSettings) => void, className?: string }) {

    const { t } = useTranslation();

    const chatSettingsRO = assembleChatSettingsRO(chatSettings)

    function switchChatI(chatIID: string) {
        const chatISettingsRecord = getChatIntelligenceSettingsByID(chatIID)
        updateChatSettings({
            ChatISettings: {
                id: chatIID,
                settings: chatISettingsRecord.settings,
            },
            inputHandlers: chatSettings.inputHandlers,
            autoPlayAudio: chatSettings.autoPlayAudio,
            inputComponent: chatSettings.inputComponent,
        })
    }
    function updateSelectedChatISettings(newChatIsettings: object) {
        updateChatSettings({
            ChatISettings: {
                id: chatSettings.ChatISettings.id,
                settings: newChatIsettings,
            },
            inputHandlers: chatSettings.inputHandlers,
            autoPlayAudio: chatSettings.autoPlayAudio,
            inputComponent: chatSettings.inputComponent,
        })
    }

    return <div className={`flex flex-col pl-8 ${className}`}>
        {/* chat intelligence settings */}
        <div className="flex flex-row items-center justify-between mb-8">
            <span className="text-gray-700 font-bold">{t('Chat Model')}</span>
            <DropDownMenuV2
                entryLabel={<I18nText i18nText={chatSettingsRO.chatISettings.name} />}
                menuItems={chatSettingsRO.availableChatIs.map((intelligence) => ({
                    label: <I18nText i18nText={intelligence.name} />,
                    onClick: () => switchChatI(intelligence.id)
                }))}
                menuClassName="right-0"
            />
        </div>
        {/* TODO tech-debt: dynamically load the settings component based on the chatIType */}
        {chatSettingsRO.chatISettings.chatIType === OpenAIChatIntelligence.type &&
            <div className="flex flex-col mb-4">
                <OpenAIChatISettings settings={chatSettingsRO.chatISettings.settings}
                    updateChatISettings={updateSelectedChatISettings} />
            </div>
        }
        {chatSettingsRO.chatISettings.chatIType === CustomLLMChatIntelligence.type &&
            <div className="flex flex-col mb-4">
                <CustomLLMChatISettings key={chatSettingsRO.chatISettings.id} settings={chatSettingsRO.chatISettings.settings}
                    updateChatISettings={updateSelectedChatISettings} />
            </div>
        }
        {chatSettingsRO.chatISettings.chatIType === FreeTrialChatIntelligence.type &&
            <div className="flex flex-col mb-4">
                <FreeTrialChatISettings settings={chatSettingsRO.chatISettings.settings}
                    updateChatISettings={updateSelectedChatISettings} />
            </div>
        }
        {chatSettingsRO.chatISettings.chatIType === BabelDuckChatIntelligence.type &&
            <div className="flex flex-col mb-4">
                <BabelDuckChatISettings settings={chatSettingsRO.chatISettings.settings}
                    updateChatISettings={updateSelectedChatISettings} />
            </div>
        }
        {/* input handlers settings */}
        <div className="flex flex-col mb-8">
            <span className="text-gray-700 font-bold mb-4">{t('Shortcut Instructions')}</span>
            {/* handlers */}
            {chatSettingsRO.inputHandlers.map((handler, index) => (
                <div key={index} className="flex flex-row justify-between">
                    {/* handler icon and tooltip */}
                    <div className="flex flex-row justify-start items-center mb-2">
                        <IconCircleWrapper
                            width={24} height={24} className="mr-2"
                            onClick={() => { }}
                        >
                            {handler.handler.iconNode}
                        </IconCircleWrapper>
                        <I18nText className="text-gray-500 text-sm" i18nText={handler.handler.tooltip()} />
                    </div>
                    {/* toggle display and delete button */}
                    <div className="flex flex-row items-center">
                        <div id={`toggle-instruction-${index}`}>
                            <Switch className={`mr-3`} width={28} height={17} uncheckedIcon={false} checkedIcon={false} onColor="#000000"
                                checked={handler.display} onChange={(checked) => { updateChatSettings({ ...chatSettings, inputHandlers: chatSettings.inputHandlers.map((h) => h.handler.implType === handler.handler.implType ? { ...h, display: checked } : h) }) }} />
                        </div>
                        <Tooltip
                            anchorSelect={`#toggle-instruction-${index}`}
                            delayShow={100} delayHide={0} place="top" style={{ borderRadius: '0.75rem' }}
                        > {t('toggleInstructionDisplay')}</Tooltip>
                        <div id={`delete-instruction-${index}`}>
                            <PiTrashBold
                                className={`${handler.handler.deletable ? 'cursor-pointer text-red-500' : 'cursor-not-allowed text-gray-400'}`}
                                onClick={() => {
                                    if (handler.handler.deletable) {
                                        updateChatSettings({
                                            ...chatSettings,
                                            inputHandlers: chatSettings.inputHandlers.filter((h) =>
                                                h.handler.implType !== handler.handler.implType
                                            )
                                        })
                                    }
                                }}
                            />
                        </div>
                        <Tooltip anchorSelect={`#delete-instruction-${index}`}
                            delayShow={100} delayHide={0} place="top" style={{ borderRadius: '0.75rem' }}>
                            {t(handler.handler.deletable ? 'deleteInstruction' : 'cannotDeleteBuiltInInstruction')}
                        </Tooltip>
                    </div>
                </div>
            ))}
        </div>
        {/* auto play audio settings */}
        <div className="flex flex-col mb-8">
            <div className="flex flex-row items-center justify-between">
                <span className="text-gray-700 font-bold">{t('Auto Play Audio')}</span>
                <Switch checked={chatSettings.autoPlayAudio}
                    width={28} height={17} uncheckedIcon={false} checkedIcon={false} onColor="#000000"
                    onChange={(checked) => { updateChatSettings({ ...chatSettings, autoPlayAudio: checked }) }} />
            </div>
            {/* Add description */}
            <div className="flex flex-row items-start">
                <IoMdInformationCircleOutline size={16} className="text-gray-400 mr-1 mt-1" />
                <span className="text-gray-400 text-sm">{t('autoPlayAudioDescription')}</span>
            </div>
        </div>
    </div>
}


// 修改 SpeechSettings 组件，添加状态管理
export function SpeechSettings({ className = "" }: { className?: string }) {
    const { t } = useTranslation();

    const availableSpeechSvcs = [
        { id: 'webSpeech', name: { key: 'speechSvc.webSpeech' } },
        { id: 'azure', name: { key: 'speechSvc.azure' } },
    ]

    const freeTrialSvcEnabled = !!(process.env.NEXT_PUBLIC_ENABLE_FREE_TRIAL_TTS && process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION)
    if (freeTrialSvcEnabled) {
        availableSpeechSvcs.unshift({ id: 'freeTrial', name: { key: 'speechSvc.freeTrial' } })
    }

    const [selectedSvcId, setSelectedSvcId] = useState(getSelectedSpeechSvcID());
    const [speechSettings, setSpeechSettings] = useState<object | null>(null);

    useEffect(() => {
        async function loadSettings() {
            const settings = await getSpeechSvcSettings(selectedSvcId);
            setSpeechSettings(settings);
        }
        loadSettings();
    }, [selectedSvcId]);

    function changeSpeechSvc(svcId: string) {
        setSelectedSvcId(svcId);
        localStorage.setItem('selectedSpeechServiceId', svcId);
    }

    const updateSpeechSettings = (svcId: string, newSettings: Partial<object>) => {
        const updatedSettings = { ...speechSettings, ...newSettings };
        localStorage.setItem(`speechSettings-${svcId}`, JSON.stringify(updatedSettings));
        setSpeechSettings(updatedSettings);
    };

    if (speechSettings === null) {
        return <div></div>;
    }

    return (
        <div className={className}>
            {/* service selector */}
            <div className="flex flex-row items-center justify-between mb-4">
                <span className="text-gray-700 font-bold">{t('Speech Synthesis Service')}</span>
                <DropDownMenuV2
                    entryLabel={<I18nText i18nText={availableSpeechSvcs.find((svc) => svc.id === selectedSvcId)?.name || availableSpeechSvcs[0].name} />}
                    menuItems={availableSpeechSvcs.map((svc) => ({
                        label: <I18nText i18nText={svc.name} />,
                        onClick: () => { changeSpeechSvc(svc.id) }
                    }))}
                    menuClassName="right-0"
                />
            </div>
            {/* settings */}
            {selectedSvcId === 'webSpeech' &&
                <WebSpeechSettingsPanel
                    unTypedSettings={speechSettings}
                    updateSettings={(newSettings) => { updateSpeechSettings(selectedSvcId, newSettings); }}
                />
            }
            {selectedSvcId === 'azure' &&
                <AzureTTSSettingsPanel
                    unTypedSettings={speechSettings}
                    updateSettings={(newSettings) => updateSpeechSettings(selectedSvcId, newSettings)}
                />
            }
            {selectedSvcId === 'freeTrial' &&
                <FreeTrialSettings />
            }
        </div>
    );
}

export function WebSpeechSettingsPanel({
    unTypedSettings,
    updateSettings
}: {
    unTypedSettings: object,
    updateSettings: (settings: Partial<{ lang: string; voiceURI: string }>) => void
}) {
    const { t } = useTranslation();
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const settings = unTypedSettings as {
        lang: string;
        voiceURI: string;
    };

    // Load available voices
    useEffect(() => {
        async function loadVoices() {
            const allVoices = await WebSpeechTTS.getVoices();
            setVoices(allVoices);
        }
        loadVoices();
    }, []);

    const [testText, setTestText] = useState(t('What is the answer to life, the universe and everything?'));
    const [isPlaying, setIsPlaying] = useState(false);

    const playTestAudio = async () => {
        if (!window.speechSynthesis) return;

        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(testText);
        const voices = speechSynthesis.getVoices();

        if (settings.voiceURI) {
            const voice = voices.find(v => v.voiceURI === settings.voiceURI);
            if (voice) utterance.voice = voice;
        }

        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
    };

    async function switchLang(lang: string) {
        const voices = await WebSpeechTTS.getVoices()
        const availableVoices = voices.filter(voice => voice.lang.split('-')[0] === lang);
        if (availableVoices.length === 0) {
            throw new Error(`No available voices for lang: ${lang}`)
        }
        updateSettings({ lang, voiceURI: availableVoices[0].voiceURI })
    }

    return <div className="flex flex-col pl-8">
        <div className="flex flex-row items-start mt-2 mb-4 text-sm text-gray-500">
            <IoMdInformationCircleOutline size={15} className="mr-2 mt-1 flex-shrink-0" />
            <span>{t('webSpeech.serviceTip')}</span>
        </div>

        {/* Language selector */}
        <div className="flex flex-row items-center justify-between mb-4">
            <span className="text-gray-700 font-bold">{t('Speech Language')}</span>
            <DropDownMenuV2
                entryLabel={speechSynthesisSystemLanguages[settings.lang as keyof typeof speechSynthesisSystemLanguages]}
                menuItems={Object.entries(speechSynthesisSystemLanguages).map(([key, value]) => ({
                    label: value,
                    onClick: () => { switchLang(key) }
                }))}
                menuClassName="right-0 max-h-96 overflow-y-auto"
            />
        </div>

        {/* Voice selector */}
        <div className="flex flex-row items-center justify-between mb-4">
            <span className="text-gray-700 font-bold">{t('Speech Voice')}</span>
            <DropDownMenuV2
                entryLabel={voices.length > 0 ? voices.find(v => v.voiceURI === settings.voiceURI)?.name : 'Loading...'}
                menuItems={voices.filter(voice => voice.lang.split('-')[0] === settings.lang).map((voice) => ({
                    label: voice.name,
                    onClick: () => updateSettings({ ...settings, voiceURI: voice.voiceURI })
                }))}
                menuClassName="right-0"
            />
        </div>

        {/* Test area */}
        <div className="flex flex-col mt-6">
            <span className="text-gray-700 font-bold mb-2">{t('Test Speech')}</span>
            <div className="flex flex-row items-center gap-2">
                <input
                    type="text"
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder={t('Enter text to test speech')}
                    className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                <div
                    onClick={playTestAudio}
                    className="cursor-pointer p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {isPlaying
                        ? <IoStopCircleOutline size={24} />
                        : <PiSpeakerHighBold size={24} />
                    }
                </div>
            </div>
            <div className="flex flex-row items-center mt-2 text-sm text-gray-400">
                <IoMdInformationCircleOutline size={20} className="mr-2" />
                <span>{t('speechVoiceTestTip')}</span>
            </div>
        </div>
    </div>
}

function AzureTTSSettingsPanel({
    unTypedSettings,
    updateSettings
}: {
    unTypedSettings: object,
    updateSettings: (settings: Partial<{ region: string; subscriptionKey: string; lang: string; voiceName: string }>) => void
}) {
    const { t } = useTranslation();

    const settings = unTypedSettings as { region: string; subscriptionKey: string; lang: string; voiceName: string };

    // Get available voices based on selected language
    const availableVoices = useMemo(() => {
        return azureSpeechSynthesisVoices[settings.lang] || [];
    }, [settings.lang]);

    return (
        <div className="flex flex-col pl-8">
            <div className="flex flex-row items-start mt-2 mb-4 text-sm text-gray-500">
                <IoMdInformationCircleOutline size={15} className="mr-2 mt-1 flex-shrink-0" />
                <span>{t('azureTTS.serviceTip')}</span>
            </div>

            {/* Azure Region */}
            <div className="flex flex-row items-center justify-between mb-4">
                <span className="text-gray-700 font-bold">{t('Azure Region')}</span>
                <DropDownMenuV2
                    entryLabel={settings.region}
                    menuItems={azureRegions.map((region) => ({
                        label: region,
                        onClick: () => updateSettings({ region })
                    }))}
                    menuClassName="right-0"
                />
            </div>
            {/* Subscription Key */}
            <div className="flex flex-col mb-4">
                <label className="text-gray-700 font-bold mb-2">{t('Subscription Key')}</label>
                <input
                    type="password"
                    value={settings.subscriptionKey || ''}
                    onChange={(e) => updateSettings({ subscriptionKey: e.target.value })}
                    className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder={t('Enter your Azure subscription key')}
                />
            </div>
            {/* Language Selection */}
            <div className="flex flex-row items-center justify-between mb-4">
                <span className="text-gray-700 font-bold">{t('Language')}</span>
                <DropDownMenuV2
                    entryLabel={azureSpeechSynthesisLanguagesLocale[settings.lang]}
                    menuItems={Object.entries(azureSpeechSynthesisLanguagesLocale).map(([langCode, langName]) => ({
                        label: langName,
                        onClick: () => updateSettings({ lang: langCode })
                    }))}
                    menuClassName="right-0 max-h-96 overflow-y-auto"
                />
            </div>
            {/* Voice Selection */}
            <div className="flex flex-row items-center justify-between mb-4">
                <span className="text-gray-700 font-bold">{t('Voice')}</span>
                <DropDownMenuV2
                    entryLabel={settings.voiceName || t('Default')}
                    menuItems={availableVoices.map((voice) => ({
                        label: voice,
                        onClick: () => updateSettings({ voiceName: voice })
                    }))}
                    menuClassName="right-0 max-h-96 overflow-y-auto"
                />
            </div>
        </div>
    );
}

function FreeTrialSettings() {
    const { t } = useTranslation();
    return <div className="flex flex-col">
        <div className="flex flex-row items-start mt-2 mb-4 text-sm text-gray-500">
            <IoMdInformationCircleOutline size={15} className="mr-2 mt-1 flex-shrink-0" />
            <span>{t('freeTrial.ttsServiceTip')}</span>
        </div>
    </div>
}

function LLMSettings() {

    const { t } = useTranslation();
    const [compState, setCompState] = useState<{
        llmServices: LLMServiceSettingsRecord[],
        selectedSvcId: string | null,
    }>({ llmServices: [], selectedSvcId: null })

    const selectedSvc = compState.llmServices.find((svc) => svc.id === compState.selectedSvcId)
    const SettingsComponent = selectedSvc?.type ? getLLMSettingsComponent(selectedSvc.type) : null;

    useEffect(() => {
        const defaultSvcs = getLLMServiceSettings()
        setCompState({ llmServices: defaultSvcs, selectedSvcId: defaultSvcs.length > 0 ? defaultSvcs[0].id : null })
    }, [])

    const updateSettings = (serviceId: string, settings: object) => {
        updateLLMServiceSettings(serviceId, settings)
        setCompState({
            llmServices: compState.llmServices.map((svc) => svc.id === serviceId ? { ...svc, settings } : svc),
            selectedSvcId: compState.selectedSvcId,
        })
    }
    function addLLMServiceAndSwitchToIt() {
        const serviceName = t('Custom Service')
        // save data
        const newServiceRecord = addCustomLLMServiceSettings({
            type: OpenAICompatibleAPIService.type,
            settings: { name: serviceName },
        })
        // load the new service
        setCompState({
            llmServices: compState.llmServices.concat(newServiceRecord),
            selectedSvcId: newServiceRecord.id,
        })
    }

    return <div className="flex flex-col pl-8">
        <div className="flex flex-row items-center justify-between mb-4">
            <span className="text-gray-700 font-bold">{t('Models Service')}</span>
            <DropDownMenuV2
                entryLabel={selectedSvc ? <I18nText i18nText={selectedSvc.name} /> : 'No LLM Service'}
                menuItems={
                    [
                        ...compState.llmServices.map((service) => ({
                            label: <div className="flex flex-row items-center"><TbCloud color="gray" className="mr-2" /><I18nText i18nText={service.name} /></div>,
                            onClick: () => { setCompState({ ...compState, selectedSvcId: service.id }) }
                        })),
                        {
                            label: <div className="flex flex-row items-center">
                                <TbCloudPlus className="mr-2" color="gray" />
                                <span className="text-gray-500">{t('Add Service')}</span>
                            </div>, onClick: () => { addLLMServiceAndSwitchToIt() }
                        }
                    ]}
                menuClassName="right-0"
            />
        </div>
        {selectedSvc?.type && SettingsComponent && <SettingsComponent key={selectedSvc.id} settings={selectedSvc.settings}
            updateSettings={(settings) => { updateSettings(selectedSvc.id, settings) }} />}
    </div>
}