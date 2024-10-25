"use client"
import { LuInfo } from "react-icons/lu";
import { Chat } from "./chat/components/chat";
import { ChatSelectionList, NewChat } from "./chat/components/chatList";
import { AddNewChat, LoadChatByIDFromLocalStorage, LoadChatSelectionListFromLocalStorage } from "./chat/lib/chat";
import { useAppSelector } from "./hooks";
import { SettingsEntry } from "./settings/components/settings";
import { useTranslation } from "react-i18next";
import { Overlay } from "./ui-utils/components/overlay";
import { useState, useEffect } from 'react';
import i18n from './i18n/i18n';
import { FilledButton } from "./ui-utils/components/button";

function AboutLink() {
  const { t } = useTranslation();
  return (
    <a href="https://github.com/Orenoid/BabelDuck" target="_blank" rel="noopener noreferrer" className="flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200">
      <LuInfo className="mr-3" />
      <span>{t('About')}</span>
    </a>
  );
}

function InitializationPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
  };

  const handleConfirm = () => {
    i18n.changeLanguage(selectedLanguage);
    localStorage.setItem('languageSetup', 'true');
    localStorage.setItem('selectedLanguage', selectedLanguage);
    onClose();
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg w-96">
          <h2 className="text-xl font-bold mb-6">{t('Select Your Language')}</h2>
          <div className="mb-6">
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full p-3 border rounded text-lg"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <FilledButton onClick={handleConfirm} className="w-full py-3 text-lg">
            {t('Confirm')}
          </FilledButton>
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

  const handleCloseInitializationPanel = () => {
    setShowInitializationPanel(false);
  };

  return (
    <div className="flex flex-row h-full w-full">
      {showInitializationPanel && <InitializationPanel onClose={handleCloseInitializationPanel} />}
      {/* sidebar */}
      <div className="flex px-2 pb-12 flex-col w-[250px] bg-[#F9F9F9]">
        <ChatSelectionList className="mt-12 flex-1 overflow-y-auto w-[250px]"
          chatSelectionListLoader={LoadChatSelectionListFromLocalStorage} />
        <div className="border-t border-gray-300 my-5 mx-3"></div>
        <div className="flex flex-col">
          <NewChat className="mb-1" addNewChat={AddNewChat} />
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
          loadChatByID={LoadChatByIDFromLocalStorage} />}
      </div>
    </div>
  );
}
