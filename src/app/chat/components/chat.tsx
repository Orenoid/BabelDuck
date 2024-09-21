"use client";

import { useState } from "react";

interface Message {
    role: string;
    content: string;
}

export function Chat({ className = "" }: {
    className?: string;
}) {
    const defaultMessageList: Message[] = [
        { role: "system", content: "You're a helpful assistant." },
        // { role: "user", content: "Hello, how are you?" },
        // { role: "assistant", content: "I'm fine, thank you!" },
        // { role: "user", content: "What's your name?" },
        // { role: "assistant", content: "I'm BabelFish." },
        // { role: "user", content: "What's your favorite color?" },
        // { role: "assistant", content: "I'm blue." },
        // { role: "user", content: "What's your favorite food?" },
        // { role: "assistant", content: "I'm pizza." },
        // { role: "user", content: "What's your favorite drink?" },
        // { role: "assistant", content: "I'm coffee." },
        // { role: "user", content: "What's your favorite movie?" },
        // { role: "assistant", content: "I'm The Matrix." },
        // { role: "user", content: "What's your favorite book?" },
        // { role: "assistant", content: "I'm The Bible." },
        // { role: "user", content: "What's your favorite game?" },
        // { role: "assistant", content: "I'm The Matrix." },
    ];
    const [messageList, setMessageList] = useState<Message[]>(defaultMessageList);

    async function addMesssage({ content, role = "user" }: { content: string, role?: string }) {
        setMessageList(prev => [...prev, { role, content }]);
        const response = await fetch("https://chat.orenoid.com/v1/chat/completions", {
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
        console.log(data);
        setMessageList(prev => [...prev, { role: "assistant", content: data.choices[0].message.content }]);
    }

    return <div className={`w-1/2 flex flex-col ${className}`}>
        {/* <MessageList className="flex-grow overflow-y-auto" messageList={messageList} /> */}
        <MessageList className="flex-1 overflow-y-auto" messageList={messageList} />
        {/* <MessageInput className="bottom-0" addMesssage={addMesssage} /> */}
        <MessageInput className="" addMesssage={addMesssage} messageList={messageList} />
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
    console.log(content);
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

    function translateInput() {
        const historyContext = messageList.map(message => message.content).join('\n');
        const translatePrompt = `This is an ongoing conversation:
        """
        ${historyContext}
        """
        This is the message the user is about to send:
        """
        ${messageContent}
        """
        Please translate this message into English, considering the context of the conversation, and return it in JSON format:
        {
            "translated": "..."
        }`
        const translateMessage = async () => {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': "Bearer " + process.env.NEXT_PUBLIC_OPENAI_API_KEY,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // or the model you are using
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
            const translatedTextInJson = data.choices[0].message.content; // Assuming the translated text is in the first choice
            const translatedText = JSON.parse(translatedTextInJson).translated;
            console.log('Translated message:', translatedText);
            setMessageContent(translatedText);
        };

        translateMessage();

    }

    return <div className={`flex flex-row border-t pt-2 ${className}`}>
        <textarea
            className="flex-1"
            placeholder="Type the message content here..."
            value={messageContent} onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent default behavior of Enter key
                    handleSend();
                }
            }} rows={4} />
        <div className="flex flex-col justify-around">
            <button onClick={handleSend}>Send</button>
            <button onClick={translateInput}>Translate</button>
        </div>
    </div>
}
