"use client"
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { FaGithub } from "react-icons/fa";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { LuInfo } from "react-icons/lu";
import Switch from "react-switch";
import { Chat } from "./chat/components/chat";
import { ChatSelectionList, NewChat } from "./chat/components/chatList";
import { addNewChat, addNewChatWithoutSettingCurrentChat } from "./chat/components/chatList-redux";
import { GrammarCheckingHandler, RespGenerationHandler, TranscriptionImprovementHandler, TranslationHandler } from "./chat/components/input-handlers";
import { DisableHandlerDecorator, TutorialTranslationHandler } from "./chat/components/tutorial-input-handlers";
import { NextStepTutorialMessage } from "./chat/components/tutorial-message";
import { TutorialStateIDs } from "./chat/components/tutorial-redux";
import { AddNewChat, loadChatMessages, loadChatSelectionList } from "./chat/lib/chat";
import { chatTemplates } from "./chat/lib/template";
import { useAppDispatch, useAppSelector } from "./hooks";
import i18n from './i18n/i18n';
import { TutorialChatIntelligence } from "./intelligence-llm/lib/intelligence";
import { SettingsEntry, SpeechSettings } from "./settings/components/settings";
import { defaultGlobalChatSettings, setGlobalChatSettings } from "./settings/lib/settings";
import { FilledButton } from "./ui-utils/components/button";
import { DropdownMenu, DropdownMenuEntry } from "./ui-utils/components/DropdownMenu";
import { SemiTransparentOverlay, TransparentOverlay } from "./ui-utils/components/overlay";
function AboutPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        {/* semi-transparent mask */}
        <div className="absolute inset-0 bg-black opacity-50"
          onClick={onClose}
        ></div>
        {/* about panel */}
        <div className="bg-white rounded-2xl z-10 w-[500px] p-6">
          <div className="flex flex-col items-center">
            {/* Logo and Title */}
            <div className="flex flex-row items-center mb-1">
              <Image
                src="/images/babel-duck-logo.png"
                alt="BabelDuck Logo"
                width={48}
                height={48}
                className="mr-4"
              />
              <span className="text-2xl font-bold text-gray-800">BabelDuck</span>
            </div>
            {/* Logo Attribution */}
            <div className="text-sm text-gray-400 mb-6">
              <a
                href="https://www.flaticon.com/free-icon/duck_1635803?related_id=1635905"
                title="duck icons"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-500"
              >
                {t('logoAttribution')}
              </a>
            </div>

            {/* GitHub Link */}
            <a
              href="https://github.com/Orenoid/BabelDuck"
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <FilledButton className="flex items-center space-x-2"
                onClick={() => { }}>
                <FaGithub size={20} />
                <span>{t('viewOnGitHub')}</span>
              </FilledButton>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function AboutLink() {
  const { t } = useTranslation();
  const [showAboutPanel, setShowAboutPanel] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowAboutPanel(true)}
        className="flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200"
      >
        <LuInfo className="mr-3" />
        <span>{t('About')}</span>
      </div>
      {showAboutPanel && (
        <AboutPanel onClose={() => { setShowAboutPanel(false) }} />
      )}
    </>
  );
}

function InitializationPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [selectedPracticeLanguage, setSelectedPracticeLanguage] = useState('en');
  const [showPracticeDropdown, setShowPracticeDropdown] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);

  // List of supported languages
  const supportedLanguages = ['en', 'zh', 'ja'] as const;

  // Native language names mapping
  const nativeLanguageNames = {
    en: 'English',
    zh: '中文',
    ja: '日本語',
  } as const;

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setSelectedLanguage(lang);
    setShowLanguageDropdown(false);
  };

  const handlePracticeLanguageChange = (lang: string) => {
    setSelectedPracticeLanguage(lang);
    setShowPracticeDropdown(false);
  };

  const defaultHandlers = [
    new TranslationHandler(nativeLanguageNames[selectedPracticeLanguage as keyof typeof nativeLanguageNames]),
    new GrammarCheckingHandler(),
    new TranscriptionImprovementHandler(),
    new RespGenerationHandler(),
  ]

  const handleConfirm = () => {
    i18n.changeLanguage(selectedLanguage);
    localStorage.setItem('languageSetup', 'true');
    localStorage.setItem('selectedLanguage', selectedLanguage);
    setGlobalChatSettings({
      ...defaultGlobalChatSettings,
      autoPlayAudio: autoPlayAudio,
      inputHandlers: defaultHandlers.map((handler) => ({ handler, display: true }))
    });
    // add template chats
    chatTemplates.forEach((template) => {
      const newChatSelection = AddNewChat(t(template.title.key), template.messages);
      dispatch(addNewChatWithoutSettingCurrentChat(newChatSelection.chatSelection));
    });
    // add the tutorial chat
    const newChatSelection = AddNewChat(
      t('Tutorial'),
      [new NextStepTutorialMessage(TutorialStateIDs.introduction, TutorialStateIDs.introduceQuickTranslationInstructions)],
      {
        usingGlobalSettings: false,
        inputHandlers: [
          { handler: new TutorialTranslationHandler('English'), display: true },
          { handler: new DisableHandlerDecorator(new GrammarCheckingHandler()), display: true },
          { handler: new DisableHandlerDecorator(new TranscriptionImprovementHandler()), display: true },
          { handler: new DisableHandlerDecorator(new RespGenerationHandler()), display: true },
        ],
        autoPlayAudio: false,
        inputComponent: {
          type: 'tutorialInput',
          payload: {
            stateID: TutorialStateIDs.introduction
          }
        },
        ChatISettings: {
          id: TutorialChatIntelligence.id, // TODO tech-debt: need to deal with the situation where the counterpart chatI doesn't exist
          settings: {}
        }
      }
    );
    dispatch(addNewChat(newChatSelection.chatSelection));
    onClose();
  };

  return (
    <>
      <SemiTransparentOverlay onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl z-10 w-11/12 md:w-3/4 lg:w-1/2 max-w-4xl max-h-screen overflow-y-auto custom-scrollbar p-8">
          <div className="flex flex-col">
            {/* Beta warning */}
            {/* <div className="flex flex-row items-start mb-4 p-4 bg-yellow-50 rounded-lg">
              <IoMdInformationCircleOutline size={20} className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-yellow-700">{t('betaWarning')}</span>
            </div> */}
            {/* Welcome message */}
            <div className="flex flex-col items-center">
              {/* Logo and Title */}
              <div className="flex flex-row items-center mb-2">
                <Image
                  src="/images/babel-duck-logo.png"
                  alt="BabelDuck Logo"
                  width={36}
                  height={36}
                  className="mr-3"
                />
                <h2 className="text-2xl font-bold text-gray-800">{t('Welcome to BabelDuck')}</h2>
              </div>
              <p className="text-gray-400 mb-12">{t('welcomeMessage')}</p>
              <p className="text-gray-600 self-start mb-4">{t('Please set up your preferences to get started')}</p>
            </div>
            {/* Interface language selection */}
            <div className="flex flex-col mb-8">
              <div className="flex flex-row items-center justify-between relative">
                <span className="text-gray-700 font-bold">{t('Select Your Language')}</span>
                <div className="relative">
                  <DropdownMenuEntry
                    label={nativeLanguageNames[selectedLanguage as keyof typeof nativeLanguageNames]}
                    onClick={() => setShowLanguageDropdown(true)}
                  />
                  {showLanguageDropdown && (
                    <>
                      <DropdownMenu
                        className="absolute right-0 top-full"
                        menuItems={supportedLanguages.map(lang => ({
                          label: nativeLanguageNames[lang as keyof typeof nativeLanguageNames],
                          onClick: () => handleLanguageChange(lang)
                        }))}
                      />
                      <TransparentOverlay onClick={() => setShowLanguageDropdown(false)} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-row items-center">
                <IoMdInformationCircleOutline size={14} className="text-gray-400 mr-1" />
                <span className="text-gray-400 text-sm">{t('interfaceLanguageHint')}</span>
              </div>
            </div>

            {/* Practice language selection */}
            <div className="flex flex-col relative mb-8">
              <div className="flex flex-row items-center justify-between">
                <span className="text-gray-700 font-bold">{t('Select Practice Language')}</span>
                <div className="relative">
                  <DropdownMenuEntry
                    label={t(`lang.${selectedPracticeLanguage}`)}
                    onClick={() => setShowPracticeDropdown(true)}
                  />
                  {showPracticeDropdown && (
                    <>
                      <DropdownMenu
                        className="absolute right-0 top-full"
                        menuItems={supportedLanguages.map(lang => ({
                          label: t(`lang.${lang}`),
                          onClick: () => handlePracticeLanguageChange(lang)
                        }))}
                      />
                      <TransparentOverlay onClick={() => setShowPracticeDropdown(false)} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-row items-center">
                <IoMdInformationCircleOutline size={14} className="text-gray-400 mr-1" />
                <span className="text-gray-400 text-sm">{t('practiceLanguageHint')}</span>
              </div>
            </div>

            {/* TTS settings */}
            <SpeechSettings className="mb-4" />

            {/* Auto play audio settings */}
            <div className="flex flex-col mb-8">
              <div className="flex flex-row items-center justify-between">
                <span className="text-gray-700 font-bold">{t('Auto Play Audio')}</span>
                <Switch checked={autoPlayAudio}
                  width={28} height={17} uncheckedIcon={false} checkedIcon={false} onColor="#000000"
                  onChange={(checked) => { setAutoPlayAudio(checked) }} />
              </div>
              {/* Add description */}
              <div className="flex flex-row items-start">
                <IoMdInformationCircleOutline size={16} className="text-gray-400 mr-1 mt-1" />
                <span className="text-gray-400 text-sm">{t('autoPlayAudioDescription')}</span>
              </div>
            </div>

            {/* Confirm button */}
            <div className="flex justify-end">
              <FilledButton onClick={handleConfirm} className="px-8 py-2">
                {t('Confirm')}
              </FilledButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  const [showInitializationPanel, setShowInitializationPanel] = useState(false);
  const chatSelectionList = useAppSelector((state) => state.chatSelectionList)
  const chatSelected = chatSelectionList.currentChatID !== undefined

  useEffect(() => {
    const languageSetup = localStorage.getItem('languageSetup');
    if (!languageSetup) {
      setShowInitializationPanel(true);
    } else {
      const savedLanguage = localStorage.getItem('selectedLanguage');
      if (savedLanguage) {
        i18n.changeLanguage(savedLanguage);
      }
    }
  }, []);

  const finishInitialization = () => {
    setShowInitializationPanel(false);
  };

  return (
    <>

      <div className="flex flex-row h-full w-full">
        {showInitializationPanel && <InitializationPanel onClose={finishInitialization} />}
        {/* sidebar */}
        <div className="flex px-2 pb-12 pt-4 flex-col w-[250px] bg-[#F9F9F9]">
          {/* logo */}
          <div className="flex flex-row pl-4 items-center justify-start">
            <Image
              src="/images/babel-duck-logo.png" alt="BabelDuck Logo"
              width={36} height={36} className="mr-3"
            />
            <span className="text-gray-600 text-2xl">BabelDuck</span>
          </div>
          {/* chat  */}
          <ChatSelectionList className="mt-8 flex-1 overflow-y-auto w-[250px]"
            chatSelectionListLoader={loadChatSelectionList} />
          <div className="border-t border-gray-300 my-5 mx-3"></div>
          {/* settings, odds and ends */}
          <div className="flex flex-col">
            <NewChat className="mb-1" />
            <SettingsEntry />
            <AboutLink />
          </div>
        </div>
        {/* content */}
        <div className="w-full">
          {chatSelected && <Chat className="h-full w-full"
            chatID={chatSelectionList.currentChatID as string}
            chatTitle={chatSelectionList.selectionList.find(chat => chat.id === chatSelectionList.currentChatID)?.title as string}
            key={chatSelectionList.currentChatID as string}
            loadChatByID={loadChatMessages} />}
        </div>
      </div>
      <Toaster />
    </>
  );
}
