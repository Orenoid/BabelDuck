"use client"

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { DropdownMenu } from "@/app/ui-utils/components/DropdownMenu";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPlus } from "react-icons/fa";
import { FiMoreHorizontal } from "react-icons/fi";
import { PiTrashBold } from "react-icons/pi";
import { SiTheconversation } from "react-icons/si";
import { TbPencil } from "react-icons/tb";
import { AddNewChat, ChatSelectionListLoader, deleteChatData, getNextChatCounter, UpdateChatTitle } from "../lib/chat";
import { unsetCurrentChatSettings } from "./chat-redux";
import { HintMessage, SystemMessage } from "./message";
import { addNewChat, deleteChat, setChatSelectionList, setCurrentChatID, updateChatTitle } from "./chatList-redux";


export function ChatSelectionList({ chatSelectionListLoader, className = "" }: {
    chatSelectionListLoader: ChatSelectionListLoader
    className?: string;
}) {

    const chatSelectionList = useAppSelector((state) => state.chatSelectionList)
    const dispatch = useAppDispatch()


    useEffect(() => {
        const chatSelectionList2 = chatSelectionListLoader()
        dispatch(setChatSelectionList(chatSelectionList2.chatSelectionList))
        let chatIDToSelect: string | undefined
        if (chatSelectionList2.currentSelectedChatID === undefined &&
            chatSelectionList2.chatSelectionList.length > 0) {
            chatIDToSelect = chatSelectionList2.chatSelectionList[0].id
        } else if (chatSelectionList2.currentSelectedChatID) {
            chatIDToSelect = chatSelectionList2.currentSelectedChatID
        }
        if (chatIDToSelect !== undefined) {
            dispatch(setCurrentChatID(chatIDToSelect))
        }
    }, [chatSelectionListLoader, dispatch])

    return <div className={`${className} custom-scrollbar`}>
        {chatSelectionList.selectionList.map((item) => {
            return <ChatSelection selected={item.id === chatSelectionList.currentChatID}
                id={item.id} key={item.id} title={item.title} />
        })}
    </div>

}


export function NewChat({ className = "" }: {
    className?: string
}) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const handleClick = () => {
        const counter = getNextChatCounter();
        const chatTitle = t('Chat {{number}}', { number: counter });
        const chatSelection = AddNewChat(chatTitle, [
            new SystemMessage(t('systemPrompt')),
            new HintMessage({key: 'systemPromptHint'})
        ]);
        dispatch(addNewChat(chatSelection.chatSelection));
        dispatch(unsetCurrentChatSettings()) // clear the state, let the effect hook in chat component to initialize the new chat settings TODO tech-debt: not a good solution
    };

    return (
        <div
            className={`flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200 ${className}`}
            onClick={handleClick}
        >
            <FaPlus className="mr-3" />
            <span>{t('New Chat')}</span>
        </div>
    );
}

export function ChatSelection({ id: chatID, title, className = "", selected = false }: { id: string, title: string, className?: string, selected?: boolean }) {

    const { t } = useTranslation();
    const dispatch = useAppDispatch()
    const [compState, setCompState] = useState<{ type: 'normal', showMoreBtn: boolean } | { type: 'showMore' } | { type: 'titleUnderEdit', titleUnderEdit: string }>({ type: 'normal', showMoreBtn: false })
    const isNormal = (compState.type === 'normal')
    const isEditing = (compState.type === 'titleUnderEdit')
    const showMore = (compState.type === 'showMore')

    const currentChatID = useAppSelector((state) => state.currentChatSettings.currentChatID)

    function _updateChatTitle(chatID: string, newTitle: string) {
        UpdateChatTitle(chatID, newTitle)
        dispatch(updateChatTitle({ chatID, newTitle }))
    }

    function _deleteChat(chatID: string) {
        deleteChatData(chatID)
        dispatch(deleteChat(chatID))
    }

    function switchToChat() {
        if (chatID === currentChatID) {
            return;
        }
        dispatch(setCurrentChatID(chatID))
        dispatch(unsetCurrentChatSettings()) // clear the state, let the effect hook in chat component to initialize the new chat settings
    }

    return (
        <div className={showMore || isEditing ? "relative" : ""}>
            <div className={`pl-4 py-2 pr-2 my-1 cursor-pointer rounded-md hover:bg-gray-200 ${className} ${selected ? "bg-gray-200" : ""}`}
                onClick={switchToChat}
                onMouseEnter={() => {
                    if (isNormal) {
                        setCompState({ type: 'normal', showMoreBtn: true })
                    }
                }}
                onMouseLeave={() => {
                    if (isNormal) {
                        setCompState({ type: 'normal', showMoreBtn: false })
                    }
                }}
            >
                {
                    !isEditing ?
                        <>
                            <div className="flex flex-row justify-between">
                                <div className="flex items-center">
                                    <SiTheconversation className="mr-4" />
                                    <span>{title}</span>
                                </div>
                                <div className={`hover:bg-gray-300 rounded-full p-1 ${showMore && "bg-gray-300"}`}
                                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                        e.stopPropagation()
                                        setCompState({ type: 'showMore' })
                                    }}>
                                    {((isNormal && compState.showMoreBtn) || showMore) && <FiMoreHorizontal className="ml-auto" />}
                                </div>
                            </div>
                        </> :
                        <>
                            <input className="border z-10" type="text" autoFocus
                                value={compState.titleUnderEdit} onChange={(e) => setCompState({ type: 'titleUnderEdit', titleUnderEdit: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        _updateChatTitle(chatID, compState.titleUnderEdit)
                                        setCompState({ type: 'normal', showMoreBtn: false })
                                    }
                                }}
                            />
                        </>
                }
            </div>
            {
                isEditing &&
                <div className="fixed inset-0 bg-white opacity-0"
                    onClick={() => {
                        _updateChatTitle(chatID, compState.titleUnderEdit)
                        setCompState({ type: 'normal', showMoreBtn: false })
                    }}>
                </div>
            }
            {
                showMore && (
                    <>
                        <DropdownMenu
                            className="absolute right-0 top-full"
                            menuItems={[
                                {
                                    label: <><TbPencil className="inline-block mr-2" />{t('Rename')}</>,
                                    onClick: () => setCompState({ type: 'titleUnderEdit', titleUnderEdit: title }),
                                },
                                {
                                    label: <><PiTrashBold className="inline-block mr-2 text-red-500" /><span className="text-red-500">{t('Delete')}</span></>,
                                    onClick: () => _deleteChat(chatID),
                                },
                            ]}
                        />
                        <div className="fixed inset-0 bg-white opacity-0"
                            onClick={() => setCompState({ type: 'normal', showMoreBtn: false })}>
                        </div>
                    </>
                )
            }
        </div>
    )
}

