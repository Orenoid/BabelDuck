"use client"
import { LuInfo } from "react-icons/lu";
import { Chat } from "./chat/components/chat";
import { ChatSelectionList, NewChat } from "./chat/components/chatList";
import { AddNewChat, LoadChatByIDFromLocalStorage, LoadChatSelectionListFromLocalStorage } from "./chat/lib/chat";
import { useAppSelector } from "./hooks";
import { SettingsEntry } from "./settings/components/settings";

// New AboutLink component
function AboutLink() {
  return (
    <a href="https://github.com/Orenoid/BabelDuck" target="_blank" rel="noopener noreferrer" className="flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200">
      <LuInfo className="mr-3" />
      <span>About</span>
    </a>
  );
}

export default function Home() {

  const chatSelectionList = useAppSelector((state) => state.chatSelectionList)
  const chatSelected = chatSelectionList.currentChatID !== undefined

  return (
    <div className="flex flex-row h-full w-full">
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
      {/* can't figure out why using mt-12 here stretches the page height, 
          while the mt-12 on ChatSelectionList does not... */}
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
