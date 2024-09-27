"use client";

import { useEffect, useState } from "react";
import { AddMesssageInChat, ChatLoader, type Message } from "../lib/chat"; // Changed to type-only import

export function Chat({ chatID, loadChatByID, className = "" }: {
    chatID: string,
    loadChatByID: ChatLoader
    className?: string;
}) {
    const [messageList, setMessageList] = useState<Message[]>([]);

    useEffect(() => {
        const messageList = loadChatByID(chatID)
        setMessageList(messageList)
    }, [chatID, loadChatByID])

    async function addMesssage({ content, role = "user" }: { content: string, role?: string }) {
        setMessageList(prev => [...prev, { role, content }]);
        AddMesssageInChat(chatID, { role, content })
        const url = process.env.NEXT_PUBLIC_OPENAI_CHAT_COMPLETION_URL;
        if (!url) {
            console.error('API URL is not defined');
            return;
        }
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role, content },
                ],
            }),
        });
        const data = await response.json();
        // TODO
        AddMesssageInChat(chatID, { role: "assistant", content: data.choices[0].message.content })
        setMessageList(prev => [...prev, { role: "assistant", content: data.choices[0].message.content }]);
    }

    return <div className={`flex flex-col items-center ${className}`}>
        {/* <MessageList className="flex-grow overflow-y-auto" messageList={messageList} /> */}
        <MessageList className="flex-1 overflow-y-auto w-4/5" messageList={messageList} />
        {/* <MessageInput className="bottom-0" addMesssage={addMesssage} /> */}
        <MessageInput className="w-4/5 px-5 pt-5" addMesssage={addMesssage} messageList={messageList} />
    </div>
}

export interface MessageProps {
    role: string;
    content: string;
    className?: string;
}

interface MessageListProps {
    messageList: { role: string; content: string; }[];
    className?: string;
}

export function MessageList({ messageList, className }: MessageListProps) {
    return <div className={`flex flex-col ${className}`}>
        {messageList.map((message, index) => (
            <Message key={index} role={message.role} content={message.content}
                // TODO 改成 not last child
                className={index < messageList.length - 1 ? "mb-5" : ""} />
        ))}
    </div>
}


export function Message({ role, content, className }: MessageProps) {
    return <>
        <div className={`flex flex-col ${className}`}>
            <Role className="mb-2" name={role} />
            <MessageContent content={content} />
        </div>
    </>
}

export interface RoleProps {
    name: string;
    className?: string;
    avatarUrl?: string;
}

export function Role({ name, className }: RoleProps) {
    return (
        <div className={`flex items-center p-1 ${className}`}>
            <span className="font-semibold">{name}</span>
        </div>
    );
}

export interface MessageContentProps {
    content: string;
    className?: string;
}

export function MessageContent({ content, className = "" }: MessageContentProps) {
    return (
        <div className={`bg-[#F6F5F5] rounded-lg w-fit max-w-[80%] p-2 ${className}`}>
            <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
        </div>
    );
}


export function MessageInput({ messageList, addMesssage, className = "" }: {
    messageList: Message[],
    addMesssage: (message: { content: string, role?: string }) => void,
    className?: string;
}) {
    const [messageContent, setMessageContent] = useState("");

    function handleSend() {
        if (messageContent.trim() === "") return;
        addMesssage({ content: messageContent });
        setMessageContent("");
    }

    function translateInput(targetLanguage: string = "English", includeHistory: boolean = true, historyMessageCount: number | undefined = undefined) {
        const historyContext = includeHistory ?
            messageList.slice(-(historyMessageCount ?? messageList.length)).map(message => `[START]${message.role}: ${message.content}[END]`).join('\n') : ""
        const translatePrompt = `${includeHistory ? `This is an ongoing conversation:
        """
        ${historyContext}
        """` : ""}
        This is a message the user is about to send in conversation:
        """
        ${messageContent}
        """
        Please translate this message into ${targetLanguage}, considering the context of the conversation, and return it in JSON format, while preserving the user's line breaks and formatting:
        {
            "translated": "..."
        }`
        const translateMessage = async () => {
            const url = process.env.NEXT_PUBLIC_OPENAI_CHAT_COMPLETION_URL;
            if (!url) {
                console.error('API URL is not defined');
                return;
            }
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': "Bearer " + process.env.NEXT_PUBLIC_OPENAI_API_KEY,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: translatePrompt }],
                    temperature: 0.7,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                console.error('Error translating message:', response.statusText);
                return;
            }

            const data = await response.json();
            const translatedTextInJson = data.choices[0].message.content;
            const translatedText = JSON.parse(translatedTextInJson).translated;
            setMessageContent(translatedText);
        };

        translateMessage();

    }

    return <div className={`flex flex-row border-t pt-2 pb-2 ${className}`}>
        <textarea
            className="flex-1 mr-4 p-4"
            placeholder={`Type your message here...\nPress Enter to send, Shift+Enter to add a new line`}
            value={messageContent} onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent default behavior of Enter key
                    handleSend();
                }
            }} rows={4} />
        <div className="flex flex-col justify-around">
            {/* <button onClick={handleSend}>Send</button> */}
            <button onClick={() => { translateInput("English", false) }}>Translate</button>
        </div>
    </div>
}
