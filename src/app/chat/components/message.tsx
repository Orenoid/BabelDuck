"use client"

import { useContext, useEffect, useRef, useState } from "react";
import { Message } from "../lib/message";
// import { CgChevronDoubleDown } from "react-icons/cg";
import { TbPencil } from "react-icons/tb";
import React from "react";
import { ThreeDots } from "react-loader-spinner";
import { IoStopCircleOutline } from "react-icons/io5";
import { PiSpeakerHighBold } from "react-icons/pi";
import { i18nText, I18nText } from "@/app/i18n/i18n";
import { ChatSettingsContext } from "./chat-settings";
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { WebSpeechTTS } from '../lib/tts-service';
import { getTTSSvcSettings } from "@/app/settings/components/speech-settings";
import { getSelectedTTSSvcID } from "@/app/settings/components/speech-settings";
import { useTranslation } from "react-i18next";
import { GoDependabot } from "react-icons/go";
import { Tooltip } from "react-tooltip";
import { FaGraduationCap } from "react-icons/fa6";
import { GrSystem } from "react-icons/gr";
import { InvalidModelSettingsError } from "@/app/error/error";
import { FreeTrialChatError } from "@/app/error/error";
import toast from "react-hot-toast";
import { TTSTokenManager } from '../lib/tts-token-manager';

export function Role({ name, className }: { name: string, className?: string }) {
    const tooltipId = `role-tooltip-${Math.random().toString(36).substring(2, 11)}`;

    return (
        <>
            <div
                id={tooltipId}
                className={`rounded-full w-8 h-8 mt-1 border-gray-200 flex items-center justify-center text-gray-600 transition-colors ${className}`}
            >
                {name === SpecialRoles.TUTORIAL ? (
                    <FaGraduationCap size={20} />
                ) : name === SpecialRoles.ASSISTANT ? (
                    <GoDependabot size={20} />
                ) : name === SpecialRoles.SYSTEM ? (
                    <GrSystem size={17} />
                ) : (
                    <span className="text-sm">{name.charAt(0).toUpperCase()}</span>
                )}
            </div>
            {name !== SpecialRoles.TUTORIAL && <Tooltip
                anchorSelect={`#${tooltipId}`} content={name} delayShow={100} delayHide={0} place="top" style={{ borderRadius: '0.75rem' }}
            />}
        </>
    );
}

export const MessageTypes = {
    SYSTEM: 'systemMessage',
    TEXT: 'text',
    STREAMING_TEXT: 'streamingText',
    AUDIO: 'audio',
    SUGGESTED_ANSWER: 'suggested_answer'
};

export const SpecialRoles = {
    SYSTEM: 'system',
    USER: 'user',
    ASSISTANT: 'assistant',
    FREE_TRIAL: 'freeTrial',
    TUTORIAL: 'tutorial',
    HINT: 'hint'
};


type systemMessgeState =
    | { type: 'normal', showMore: boolean, content: string }
    | { type: 'folded', showMore: boolean, content: string }
    | { type: 'editing', editingContent: string, originalContent: string }
export class SystemMessage extends Message {
    isEmpty(): boolean {
        return this._systemPrompt.trim() === '';
    }

    private _systemPrompt: string
    private _fold: boolean

    constructor(systemPrompt: string, fold: boolean = true, displayToUser: boolean = true, includedInChatCompletion: boolean = true) {
        super('systemMessage', 'system', displayToUser, includedInChatCompletion)
        this._systemPrompt = systemPrompt
        this._fold = fold
    }

    component() {
        const Root = ({ messageID, updateMessage, className }: { messageID: number, updateMessage: (messageID: number, message: Message) => void, className?: string }) => {
            const { t } = useTranslation();
            const [compState, setCompState] = useState<systemMessgeState>(
                { type: 'normal', showMore: false, content: this._systemPrompt }
            )

            const isContentLong = this._systemPrompt.length > 100 // 判断文本是否过长（这里以字符数为判断标准，可根据需求调整）

            const [isFolded, setIsFolded] = useState(isContentLong) // 初始状态根据内容长度决定是否折叠

            const toggleFold = () => {
                if (compState.type === 'editing') {
                    return
                }
                setIsFolded(!isFolded)
            }

            const showMore = (compState.type !== 'editing' && compState.showMore)
            const isEditing = (compState.type === 'editing')

            // state convertors
            function toggleShowMore(): void {
                if (compState.type === 'editing') {
                    return
                }
                setCompState({ type: compState.type, showMore: !compState.showMore, content: compState.content })
            }
            const toEditingState = () => {
                if (compState.type === 'editing') {
                    return
                }
                setCompState({ type: 'editing', editingContent: compState.content, originalContent: compState.content })
            }
            function saveEdit() {
                if (compState.type !== 'editing') {
                    return
                }
                setCompState({ type: 'normal', showMore: false, content: compState.editingContent })
            }
            function cancelEdit() {
                if (compState.type !== 'editing') {
                    return
                }
                setCompState({ type: 'normal', showMore: false, content: compState.originalContent })
            }

            return <div className={`flex flex-row w-fit max-w-[80%] ${className}`}>
                <Role className="mr-2" name={this.role} />
                <div className={`flex flex-col w-fit`} onMouseEnter={toggleShowMore} onMouseLeave={toggleShowMore}>
                    {!isEditing &&
                        <div className="bg-[#F6F5F5] rounded-xl w-fit p-4 flex flex-col">
                            <div
                                className={`whitespace-pre-wrap ${isFolded ? 'line-clamp-1' : ''}`}
                                style={isFolded ? {
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                } : {}}
                                dangerouslySetInnerHTML={{ __html: compState.content.replace(/\n/g, '<br />') }}
                            />
                            {isContentLong && (
                                <button onClick={toggleFold} className="text-blue-500 underline mt-1 self-end">
                                    {isFolded ? t('Expand') : t('Collapse')}
                                </button>
                            )}
                        </div>
                    }
                    {isEditing &&
                        <div className="bg-[#F6F5F5] rounded-lg p-4 w-fit">
                            <textarea className="w-full min-w-[600px] bg-[#F6F5F5] h-32 resize-none focus:outline-none"
                                value={compState.editingContent} onChange={(e) => { setCompState({ type: 'editing', editingContent: e.target.value, originalContent: compState.originalContent }) }
                                } />
                            <div className="flex flex-row">
                                <button className="rounded-2xl border border-gray-300 bg-white p-2 mr-2"
                                    onClick={() => {
                                        cancelEdit()
                                    }}>
                                    Cancel
                                </button>
                                <button className="rounded-2xl bg-black text-white p-2"
                                    onClick={() => {
                                        this._systemPrompt = compState.editingContent
                                        updateMessage(messageID, this) // TODO error handling
                                        saveEdit()
                                    }}>Save</button>

                            </div>

                        </div>}
                    <div className={`flex flex-row mt-1 pl-1 ${showMore ? 'visible' : 'invisible'}`}>
                        <TbPencil className="cursor-pointer" size={20}
                            onClick={() => {
                                toEditingState()
                            }} />
                    </div>
                </div>
            </div>
        }
        return Root
    }

    toOpenAIMessage(): { role: string, content: string } {
        return { role: SpecialRoles.SYSTEM, content: this._systemPrompt }
    }

    serialize(): string {
        return JSON.stringify({
            type: this.type,
            systemPrompt: this._systemPrompt,
            fold: this._fold,
            displayToUser: this.displayToUser,
            includedInChatCompletion: this.includedInChatCompletion,
        })
    }

    static deserialize(serialized: string): SystemMessage {
        const { systemPrompt, fold, displayToUser, includedInChatCompletion } = JSON.parse(serialized)
        return new SystemMessage(systemPrompt, fold, displayToUser, includedInChatCompletion)
    }
}

// make it reusable for other message components
export function ControlledTextMessageComponent({ messageIns, compState, setCompState, messageID, updateMessage, className }: {
    compState: textMessageState,
    setCompState: React.Dispatch<React.SetStateAction<textMessageState>>,
    messageIns: TextMessage,
    messageID: number,
    updateMessage: (messageID: number, message: Message) => void,
    className?: string
}) {
    const { t } = useTranslation();

    const showMore = (compState.type === 'normal' && compState.showMore)
        || compState.type === 'playingAudio' // you will want to keep the buttons showing while playing the audio
    const isEditing = (compState.type === 'editing')
    const isPlaying = compState.type === 'playingAudio'

    const alignRight = messageIns.role === SpecialRoles.USER
    const showRole = messageIns.role !== SpecialRoles.USER

    // const { serviceId, settings } = getSpeechServiceSettings();
    const ttsService = useRef<WebSpeechTTS | null>(null);
    const playerRef = useRef<sdk.SpeakerAudioDestination | null>(null);
    const synthesizerRef = useRef<sdk.SpeechSynthesizer | null>(null);

    // state convertors
    function setShowMore(showMore: boolean): void {
        if (compState.type !== 'normal') {
            return
        }
        setCompState({ ...compState, showMore: showMore })
    }
    const toEditingState = () => {
        if (compState.type === 'editing') {
            return
        }
        setCompState({ type: 'editing', editingContent: compState.content, originalContent: compState.content })
    }
    function saveEdit() {
        if (compState.type !== 'editing') {
            return
        }
        setCompState({ type: 'normal', showMore: false, content: compState.editingContent })
    }
    function cancelEdit() {
        if (compState.type !== 'editing') {
            return
        }
        setCompState({ type: 'normal', showMore: false, content: compState.originalContent })
    }
    async function startPlaying() {
        if (compState.type !== 'normal') {
            return;
        }
        const { serviceId, settings } = await getSpeechServiceSettings();
        if (serviceId === 'azure') {
            try {
                const azureSettings = settings as { region: string; subscriptionKey: string; lang: string; voiceName: string };
                const subscriptionKey = azureSettings.subscriptionKey;
                const region = azureSettings.region;

                if (!subscriptionKey || !region) {
                    console.error('Azure Speech subscription key or region not found in settings');
                    setCompState({ type: 'normal', content: compState.content, showMore: true });
                    return;
                }

                const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
                speechConfig.speechRecognitionLanguage = azureSettings.lang || 'en-US';
                speechConfig.speechSynthesisVoiceName = azureSettings.voiceName || 'en-US-JennyNeural';

                playerRef.current = new sdk.SpeakerAudioDestination();
                const audioConfig = sdk.AudioConfig.fromSpeakerOutput(playerRef.current);
                synthesizerRef.current = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

                if (playerRef.current) {
                    playerRef.current.onAudioEnd = () => {
                        setCompState({ type: 'normal', content: compState.content, showMore: true });
                    };
                }

                synthesizerRef.current.speakTextAsync(
                    compState.content,
                    () => {
                        if (synthesizerRef.current) {
                            synthesizerRef.current.close();
                            synthesizerRef.current = null;
                        }
                    },
                    error => {
                        console.error('Speech synthesis error:', error);
                        if (synthesizerRef.current) {
                            synthesizerRef.current.close();
                            synthesizerRef.current = null;
                        }
                        setCompState({ type: 'normal', content: compState.content, showMore: true });
                    }
                );
                setCompState({ ...compState, type: 'playingAudio' });
            } catch (error) {
                console.error('Failed to initialize speech synthesis:', error);
                setCompState({ type: 'normal', content: compState.content, showMore: true });
            }
            // TODO 不知道为什么如果用封装的 azure ttsService，就会遇到一个很奇怪的现象：
            // 点击播放音频的时候，macOS 会加载这段音频，但是却自动暂停
            // 如果直接用上面这段，就能直接自动播放
        } else if (serviceId === 'webSpeech') {
            try {
                if (!ttsService.current) {
                    const { lang, voiceURI } = settings as { lang: string; voiceURI: string };
                    ttsService.current = new WebSpeechTTS(lang, voiceURI);
                }
                setCompState({ ...compState, type: 'playingAudio' });
                await ttsService.current.speak(compState.content);
                setCompState({ type: 'normal', content: compState.content, showMore: true });
            } catch (error) {
                console.error('Speech synthesis error:', error);
                setCompState({ type: 'normal', content: compState.content, showMore: true });
            }
        } else if (serviceId === 'freeTrial') {
            try {
                const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;
                if (!region) {
                    throw new Error('Azure Speech region not found');
                }

                // 使用 TokenManager 获取 token
                const token = await TTSTokenManager.getInstance().getToken();
                
                const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
                speechConfig.speechRecognitionLanguage = 'en-US';
                speechConfig.speechSynthesisVoiceName = 'en-US-JennyMultilingualNeural';

                playerRef.current = new sdk.SpeakerAudioDestination();
                const audioConfig = sdk.AudioConfig.fromSpeakerOutput(playerRef.current);
                synthesizerRef.current = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

                if (playerRef.current) {
                    playerRef.current.onAudioEnd = () => {
                        setCompState({ type: 'normal', content: compState.content, showMore: true });
                    };
                }
                synthesizerRef.current.speakTextAsync(
                    compState.content,
                    () => {
                        if (synthesizerRef.current) {
                            synthesizerRef.current.close();
                            synthesizerRef.current = null;
                        }
                    },
                    error => {
                        console.error('Speech synthesis error:', error);
                        if (synthesizerRef.current) {
                            synthesizerRef.current.close();
                            synthesizerRef.current = null;
                        }
                        setCompState({ type: 'normal', content: compState.content, showMore: true });
                    }
                );
                setCompState({ ...compState, type: 'playingAudio' });
            } catch (error) {
                console.error('free trial TTS error:', error);
                toast.error(t('trialTTSUnavailable'))
                setCompState({ type: 'normal', content: compState.content, showMore: true });
            }
        }
    }

    async function stopPlaying() {
        if (!isPlaying) {
            return;
        }
        if (ttsService.current) {
            ttsService.current.stop();
        }
        if (playerRef.current) {
            playerRef.current.pause();
            playerRef.current.close();
            playerRef.current = null;
        }
        if (synthesizerRef.current) {
            synthesizerRef.current.close();
            synthesizerRef.current = null;
        }
        setCompState({ type: 'normal', showMore: true, content: compState.content });
    }

    return <div className={`flex flex-row w-fit max-w-[80%] ${alignRight ? 'self-end' : ''} ${className}`}>
        {showRole && <Role className="mr-2" name={messageIns.role} />}
        <div className={`flex flex-col w-fit`} onMouseEnter={() => { setShowMore(true) }} onMouseLeave={() => { setShowMore(false) }}>
            {!isEditing && <MessageContent content={compState.content} />}
            {isEditing &&
                <div className="bg-[#F6F5F5] rounded-lg p-4 w-fit">
                    <textarea className="w-full min-w-[600px] bg-[#F6F5F5] h-32 resize-none focus:outline-none"
                        value={compState.editingContent} onChange={(e) => { setCompState({ type: 'editing', editingContent: e.target.value, originalContent: compState.originalContent }) }
                        } />
                    <div className="flex flex-row">
                        <button className="rounded-2xl border border-gray-300 bg-white p-2 mr-2"
                            onClick={() => {
                                cancelEdit()
                            }}>
                            Cancel
                        </button>
                        <button className="rounded-2xl bg-black text-white p-2"
                            onClick={() => {
                                updateMessage(messageID, messageIns.updateContent(compState.editingContent)) // TODO error handling
                                saveEdit()
                            }}>Save</button>
                    </div>
                </div>
            }
            {/* options */}
            <div className={`flex flex-row pt-1 pl-1 ${showMore ? 'visible' : 'invisible'}`}>
                {/* edit message */}
                <IconSquareWrapper width={24} height={24} className="mr-1">
                    <TbPencil size={20} className="cursor-pointer" onClick={() => { toEditingState() }} />
                </IconSquareWrapper>
                {/* audio playing control */}
                <IconSquareWrapper width={24} height={24} className="mr-1">
                    <div className="cursor-pointer" onClick={!isPlaying ? startPlaying : stopPlaying}>
                        {isPlaying ? <IoStopCircleOutline size={20} /> : <PiSpeakerHighBold size={18} />}
                    </div>
                </IconSquareWrapper>
            </div>
        </div>
    </div>

}

export function IconSquareWrapper({ children, width = 24, height = 24, className = "" }:
    { children: React.ReactNode, width?: number, height?: number, className?: string }): JSX.Element {
    return <div className={`flex items-center cursor-pointer justify-center w-[${width}px] h-[${height}px] rounded-md hover:bg-gray-50 ${className}`} style={{ width: `${width}px`, height: `${height}px` }}>
        {children}
    </div>
}

export function TextMessageComponent({ message, messageID, updateMessage, className }: { message: Message, messageID: number, updateMessage: (messageID: number, message: Message) => void, className?: string }) {
    const textMessage = message as TextMessage
    const [compState, setCompState] = useState<textMessageState>({ type: 'normal', showMore: false, content: textMessage.content })
    return <ControlledTextMessageComponent messageIns={textMessage} compState={compState} setCompState={setCompState} messageID={messageID} updateMessage={updateMessage} className={className} />
}

type textMessageState =
    | { type: 'normal', showMore: boolean, content: string }
    | { type: 'playingAudio', content: string }
    | { type: 'editing', editingContent: string, originalContent: string };

export class TextMessage extends Message {
    readonly content: string

    constructor(role: string, content: string, displayToUser: boolean = true, includedInChatCompletion: boolean = true) {
        super('text', role, displayToUser, includedInChatCompletion)
        this.content = content
    }

    updateContent(content: string): TextMessage {
        return new TextMessage(this.role, content, this.displayToUser, this.includedInChatCompletion)
    }

    component() {
        return TextMessageComponent
    }

    toOpenAIMessage(): { role: string, content: string } {
        return { role: this.role, content: this.content }
    }

    serialize(): string {
        return JSON.stringify({
            type: this.type,
            role: this.role,
            content: this.content,
            displayToUser: this.displayToUser,
            includedInChatCompletion: this.includedInChatCompletion,
        });
    }

    static deserialize(serialized: string): TextMessage {
        const { role, content, displayToUser, includedInChatCompletion } = JSON.parse(serialized);
        return new TextMessage(role, content, displayToUser, includedInChatCompletion);
    }

    isEmpty(): boolean {
        return this.content.trim() === '';
    }
}

export class StreamingTextMessage extends Message {
    streamingGenerator: AsyncGenerator<string, void, unknown>
    consumedChunks: string[] = []
    finished: boolean = false

    constructor(role: string, streamingGenerator: AsyncGenerator<string, void, unknown>) {
        super(MessageTypes.STREAMING_TEXT, role, true, true)
        this.streamingGenerator = streamingGenerator
    }

    component() {
        return StreamingTextMessageComponent
    }

    static deserialize(serialized: string): TextMessage {
        const { role, consumedChunks } = JSON.parse(serialized);
        // it's pointless to deserialize into a streaming message, since the stream will be lost while serializing
        // so just return a normal text message with already consumed chunks, 
        // regardless of whether the previous stream has finished or not
        return new TextMessage(role, consumedChunks.join(''), true, true);
    }

    serialize(): string {
        return JSON.stringify({
            type: 'streamingText',
            role: this.role,
            consumedChunks: this.consumedChunks,
            finished: this.finished
        })
    }

    toOpenAIMessage(): { role: string; content: string; } {
        return {
            role: this.role,
            content: this.consumedChunks.join('')
        }
    }

    isEmpty(): boolean {
        return this.consumedChunks.join('').trim() === '';
    }
}

const StreamingTextMessageComponent = ({ message: _message, messageID, updateMessage: persistMessage, className }: { message: Message, messageID: number, updateMessage: (messageID: number, message: Message) => void, className?: string }) => {
    const { t } = useTranslation()
    const message = _message as StreamingTextMessage
    const containerRef = useRef<HTMLDivElement>(null); // Ref for the container
    type MessageState =
        | { type: 'init' }
        | { type: 'streaming', streamingContent: string, playing: boolean }
        | { type: 'finished', content: string }
    const [msgState, setMsgState] = useState<MessageState>({ type: 'init' })
    const stateRef = useRef(msgState)
    const finished = msgState.type === 'finished'
    const isPlaying = msgState.type === 'streaming' && msgState.playing

    const alignRight = message.role === SpecialRoles.USER
    const showRole = message.role !== SpecialRoles.USER

    const [textMsgState, setTextMsgState] = useState<textMessageState>({ type: 'normal', showMore: false, content: '' }) // TODO performance: maybe useRef?
    const chatSettings = useContext(ChatSettingsContext)

    // state convertors
    const stopPlaying = () => {
        if (msgState.type !== 'streaming' || !msgState.playing) {
            return
        }
        window.speechSynthesis.cancel()
        setMsgState({ ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: false })
        stateRef.current = { ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: false }
    }

    // scroll to the bottom of the container when the message state changes
    useEffect(() => {
        containerRef.current?.scrollIntoView({ behavior: 'instant' })
    }, [msgState]);

    const azurePlayer = useRef<sdk.SpeakerAudioDestination | null>(null)
    const azureSynthesizer = useRef<sdk.SpeechSynthesizer | null>(null)
    // TODO: Issues exist with strict mode
    useEffect(() => {
        const startStreaming = () => {
            const iterator = message.streamingGenerator[Symbol.asyncIterator]();

            const autoPlay = chatSettings?.autoPlayAudio ?? false
            let _finished = false
            let unmounted = false
            const buffer: string[] = []
            const splited: string[] = []

            // split the streaming content into sentences for tts
            const processChunk = async () => {
                try {
                    for await (const value of iterator) {
                        if (unmounted) {
                            return
                        }
                        message.consumedChunks.push(value);
                        persistMessage(messageID, message);
                        if (stateRef.current.type === 'init') {
                            setMsgState({ 'type': 'streaming', streamingContent: value, playing: false })
                            stateRef.current = { 'type': 'streaming', streamingContent: value, playing: false }
                        } else if (stateRef.current.type === 'streaming') {
                            setMsgState({ 'type': 'streaming', streamingContent: stateRef.current.streamingContent + value, playing: stateRef.current.playing })
                            stateRef.current = { 'type': 'streaming', streamingContent: stateRef.current.streamingContent + value, playing: stateRef.current.playing }
                        }
                        if (autoPlay) {
                            buffer.push(value)
                            // 目前尝试对流按句子截断，但是效果并不好，第一句之后会有很长的停顿，所以暂时不使用
                            // try to split the first sentence from buffer, if so, send it to splited channel
                            // const sentenceEndings = /([.!?。！？,，;；:：\n])/g;
                            // const sentences = buffer.join('').split(sentenceEndings);
                            // if (sentences.length > 1) {
                            //     const firstSentence = sentences[0] + sentences[1];
                            //     if (firstSentence !== '') {
                            //         splited.push(firstSentence)
                            //         buffer.length = 0
                            //         buffer.push(sentences.slice(2).join(''))
                            //     }
                            // }
                        }
                    }
                } catch (error) {
                    console.error(error)
                    if (error instanceof FreeTrialChatError) {
                        toast.error(t('trialChatUnavailable'))
                    } else if (error instanceof InvalidModelSettingsError) {
                        toast.error(t('modelSettingsInvalid', { message: error.message }))
                    } else {
                        toast.error(t('chatUnavailable'))
                    }
                }

                if (autoPlay && buffer.length > 0) {
                    splited.push(buffer.join(''))
                    buffer.length = 0
                }
                if (autoPlay && splited.length > 0) {
                    const left = splited.join('')
                    splited.length = 0
                    splited.push(left)
                }
                persistMessage(messageID, message)
                _finished = true
                setMsgState({ type: 'finished', content: message.consumedChunks.join('') })
                // if autoPlay is on, the TextMessage component should be in 'playingAudio' mode while rendering
                if (autoPlay) {
                    setTextMsgState({ type: 'playingAudio', content: message.consumedChunks.join('') })
                } else {
                    setTextMsgState({ type: 'normal', content: message.consumedChunks.join(''), showMore: false })
                }
                stateRef.current = { type: 'finished', content: message.consumedChunks.join('') }
            };

            const playAudioFromBuffer = async () => {

                let isFirstUtt = true
                while (!_finished || splited.length > 0) {
                    if (unmounted) {
                        return
                    }
                    if (splited.length === 0) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                        continue
                    }
                    const text = splited.shift()!
                    // TODO tech-debt: abstraction and layering
                    const { serviceId, settings } = await getSpeechServiceSettings();
                    if (serviceId === 'azure') {
                        const azureSettings = settings as { subscriptionKey: string; region: string; lang: string; voiceName: string };
                        const subscriptionKey = azureSettings.subscriptionKey;
                        const region = azureSettings.region;
                        if (!subscriptionKey || !region) {
                            console.error('Azure Speech subscription key or region not found');
                            setMsgState({ ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: false });
                            return;
                        }
                        const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
                        speechConfig.speechRecognitionLanguage = azureSettings.lang || 'en-US';
                        speechConfig.speechSynthesisVoiceName = azureSettings.voiceName || 'en-US-JennyNeural';
                        const player = new sdk.SpeakerAudioDestination();
                        azurePlayer.current = player
                        const audioConfig = sdk.AudioConfig.fromSpeakerOutput(player);
                        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
                        azureSynthesizer.current = synthesizer

                        if (isFirstUtt) {
                            // when the first utterance starts speaking, set playing=true
                            setMsgState({ ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: true })
                            stateRef.current = { ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: true }
                            isFirstUtt = false
                        }
                        synthesizer.speakTextAsync(text,
                            () => {
                                if (synthesizer) {
                                    synthesizer.close();
                                    azureSynthesizer.current = null
                                }
                            },
                            error => {
                                console.error(error)
                                if (synthesizer) {
                                    synthesizer.close();
                                    azureSynthesizer.current = null
                                }
                            }
                        );
                        await new Promise(resolve => {
                            if (_finished && buffer.length === 0) {
                                player.onAudioEnd = () => {
                                    setTextMsgState((prev) => {
                                        if (prev.type === 'playingAudio') {
                                            return { type: 'normal', content: prev.content, showMore: false }
                                        }
                                        return prev
                                    })
                                    resolve(void 0);
                                }
                            } else {
                                player.onAudioEnd = resolve;
                            }
                        });
                    } else if (serviceId === 'webSpeech') {
                        const webSpeechSettings = settings as { lang: string; voiceURI: string };
                        const ttsService = new WebSpeechTTS(webSpeechSettings.lang, webSpeechSettings.voiceURI)
                        if (isFirstUtt) {
                            // when the first utterance starts speaking, set playing=true
                            setMsgState({ ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: true })
                            stateRef.current = { ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: true }
                            isFirstUtt = false
                        }
                        await ttsService.speak(text)
                        if (_finished && buffer.length === 0) {
                            setTextMsgState((prev) => {
                                if (!window.speechSynthesis.speaking) {
                                    if (prev.type === 'playingAudio') {
                                        return { type: 'normal', content: prev.content, showMore: false }
                                    }
                                }
                                return prev
                            })
                            return;
                            // when the last utterance is finished, set the text message to normal state
                            // for some reason utterance.onend callback does not work:
                            // https://stackoverflow.com/questions/23483990/speechsynthesis-api-onend-callback-not-working
                            // utterance.addEventListener('end', () => {
                            // })
                        }
                    } else if (serviceId === 'freeTrial') {
                        try {
                            const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;
                            if (!region) {
                                throw new Error('Azure Speech region not found');
                            }

                            // 使用 TokenManager 获取 token
                            const token = await TTSTokenManager.getInstance().getToken();
                            
                            const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
                            speechConfig.speechRecognitionLanguage = 'en-US';
                            speechConfig.speechSynthesisVoiceName = 'en-US-JennyMultilingualNeural';

                            const player = new sdk.SpeakerAudioDestination();
                            azurePlayer.current = player;
                            const audioConfig = sdk.AudioConfig.fromSpeakerOutput(player);
                            const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
                            azureSynthesizer.current = synthesizer;

                            if (isFirstUtt) {
                                setMsgState({ ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: true })
                                stateRef.current = { ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: true }
                                isFirstUtt = false
                            }
                            synthesizer.speakTextAsync(text,
                                () => {
                                    if (synthesizer) {
                                        synthesizer.close();
                                        azureSynthesizer.current = null
                                    }
                                },
                                error => {
                                    console.error(error)
                                    if (synthesizer) {
                                        synthesizer.close();
                                        azureSynthesizer.current = null
                                    }
                                }
                            );
                            await new Promise(resolve => {
                                if (_finished && buffer.length === 0) {
                                    player.onAudioEnd = () => {
                                        setTextMsgState((prev) => {
                                            if (prev.type === 'playingAudio') {
                                                return { type: 'normal', content: prev.content, showMore: false }
                                            }
                                            return prev
                                        })
                                        resolve(void 0);
                                    }
                                } else {
                                    player.onAudioEnd = resolve;
                                }
                            });
                        } catch (error) {
                            console.error('Free trial Azure TTS error:', error);
                            setMsgState({ ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: false });
                            toast.error(t('trialTTSUnavailable'))
                            return;
                        }
                    }
                }
            }

            processChunk()
            if (autoPlay) {
                playAudioFromBuffer()
            }
            return () => {
                unmounted = true
            }
        }
        const informUnmounted = startStreaming()
        return () => {
            window.speechSynthesis.cancel()
            if (azurePlayer.current) {
                azurePlayer.current.pause()
                if (!azurePlayer.current.isClosed) {
                    azurePlayer.current.close()
                }
                azurePlayer.current = null
            }
            if (azureSynthesizer.current) {
                azureSynthesizer.current.close()
                azureSynthesizer.current = null
            }
            if (informUnmounted) { informUnmounted() }
        }
    }, [chatSettings?.autoPlayAudio, message, messageID, persistMessage]);

    return (
        <>
            {/* if not finished, render as streaming message */}
            {!finished &&
                <div className={`flex flex-row w-fit max-w-[80%] ${alignRight ? 'self-end' : ''} ${className}`}>
                    {showRole && <Role className="mr-2" name={message.role} />}
                    <div className={`flex flex-col w-fit ${className}`}>
                        {/* message content */}
                        <div className={`bg-[#F6F5F5] rounded-lg w-fit p-2`}>
                            {msgState.type === 'init' &&
                                <ThreeDots color="#959595" height={15} width={15} />
                            }
                            {msgState.type === 'streaming' &&
                                <MessageContent content={msgState.streamingContent} />
                            }
                        </div>
                        {/* control buttons */}
                        <div className={`flex flex-row pt-2 pl-1 ${isPlaying ? 'visible' : 'invisible'}`}>
                            {isPlaying &&
                                <IconSquareWrapper width={24} height={24} className="mr-1">
                                    <IoStopCircleOutline onClick={stopPlaying} color="#898989" size={20} />
                                </IconSquareWrapper>
                            }
                        </div>
                        <div ref={containerRef} /> {/* scroll to the bottom of the container when the message state changes */}
                    </div>
                </div>
            }
            {/* if finished, render as normal text message */}
            {finished && <ControlledTextMessageComponent
                messageIns={new TextMessage(message.role, finished ? msgState.content : '', true, true)}
                compState={textMsgState} setCompState={setTextMsgState} messageID={messageID} updateMessage={persistMessage} className={className} />
            }
        </>
    );
}

export class RecommendedRespMessage extends Message {
    recommendedContent: string

    constructor(role: string, recommendedContent: string, displayToUser: boolean = true, includedInChatCompletion: boolean = true) {
        super('recommendedResponse', role, displayToUser, includedInChatCompletion)
        this.recommendedContent = recommendedContent
    }

    component() {
        const Root = ({ className }: { className?: string }) => {
            return <div className={`flex flex-row w-fit max-w-[80%] ${className}`}>
                <Role className="mr-2" name={this.role} />
                <div className={`flex flex-col w-fit ${className}`}>
                    <div className={`bg-[#F6F5F5] rounded-lg w-fit p-2 ${className}`}>
                        <I18nText i18nText={{ key: 'The recommended response is as follows' }} />
                        <div className="flex flex-col p-3 m-4 ml-0 bg-white shadow-sm border-2 rounded-md">
                            <div dangerouslySetInnerHTML={{ __html: this.recommendedContent.replace(/\n/g, '<br />') }} />
                            {/* <div className="flex flex-row self-end">
                            <button className="mr-2 py-0 px-2 bg-gray-800 rounded-md text-[15px] text-white" >
                                <CgChevronDoubleDown className="inline-block mr-1" color="white" /> Apply
                            </button>
                        </div> */}
                        </div>
                        <I18nText i18nText={{ key: 'If you have any more questions or requests, feel free to reach out to me' }} />
                    </div>
                </div>
            </div>
        }
        return Root
    }

    serialize(): string {
        return JSON.stringify({
            type: this.type,
            role: this.role,
            recommendedContent: this.recommendedContent,
            displayToUser: this.displayToUser,
            includedInChatCompletion: this.includedInChatCompletion
        });
    }

    static deserialize(serialized: string): RecommendedRespMessage {
        const { role, recommendedContent, displayToUser, includedInChatCompletion } = JSON.parse(serialized);
        return new RecommendedRespMessage(role, recommendedContent, displayToUser, includedInChatCompletion);
    }

    isEmpty(): boolean {
        return false
    }
}

export function MessageContent({ content, className = "" }: {
    content: string;
    className?: string;
}) {
    return (
        <div className={`bg-[#F6F5F5] rounded-xl w-fit p-4 ${className}`}>
            <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
        </div>
    );
}

async function getSpeechServiceSettings() {
    const selectedSvcId = getSelectedTTSSvcID()
    const settings = await getTTSSvcSettings(selectedSvcId)
    return {
        serviceId: selectedSvcId,
        settings: settings
    };
}

export class BabelDuckMessage extends Message {
    quackCount: number
    static readonly type = 'babelDuck'

    constructor(role: string, displayToUser: boolean = true, includedInChatCompletion: boolean = true, quackCount?: number) {
        super(BabelDuckMessage.type, role, displayToUser, includedInChatCompletion)
        this.quackCount = quackCount || Math.floor(Math.random() * 10)
    }

    serialize(): string {
        return JSON.stringify({
            type: this.type,
            role: this.role,
            displayToUser: this.displayToUser,
            includedInChatCompletion: this.includedInChatCompletion,
            quackCount: this.quackCount
        });
    }

    static deserialize(serialized: string): BabelDuckMessage {
        const { role, displayToUser, includedInChatCompletion, quackCount } = JSON.parse(serialized);
        return new BabelDuckMessage(role, displayToUser, includedInChatCompletion, quackCount);
    }

    component() {
        return BabelDuckMessageComponent
    }

    isEmpty(): boolean {
        return false
    }

    toOpenAIMessage(): { role: string, content: string } {
        return { role: this.role, content: Array(this.quackCount).fill('Quack!').join(' ') }
    }
}

export const BabelDuckMessageComponent = ({ message: untypedMessage, messageID, updateMessage, className }: {
    message: Message; messageID: number; updateMessage: (messageID: number, message: Message) => void; className?: string;
}) => {
    const { t } = useTranslation()
    const message = untypedMessage as unknown as BabelDuckMessage
    const translatedQuack = t('Quack!')
    const quackCount = message.quackCount
    const messageContent = Array(quackCount).fill(translatedQuack).join(' ')
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messageContent])

    return <>
        <TextMessageComponent message={new TextMessage(message.role, messageContent)} messageID={messageID} updateMessage={updateMessage} className={className} />
        <div ref={scrollRef} className="invisible" />
    </>
}

export class HintMessage extends Message {
    static readonly type = 'hint'
    hint: i18nText

    constructor(hint: i18nText) {
        super(HintMessage.type, SpecialRoles.HINT, true, false)
        this.hint = hint
    }

    component(): ({ }: { message: Message; messageID: number; updateMessage: (messageID: number, message: Message) => void; className?: string; }) => JSX.Element {
        const Root = ({ }: { message: Message; messageID: number; updateMessage: (messageID: number, message: Message) => void; className?: string; }) => {
            return <HintMessageComponent hint={this.hint} />
        }
        return Root
    }

    serialize(): string {
        return JSON.stringify({ type: this.type, hint: this.hint });
    }

    static deserialize(serialized: string): HintMessage {
        const { hint } = JSON.parse(serialized);
        return new HintMessage(hint)
    }

    isEmpty(): boolean {
        return true
    }

}

export class FreeTrialMessage extends Message {
    static readonly type = 'freeTrial'

    constructor() {
        super(FreeTrialMessage.type, SpecialRoles.HINT, true, false)
    }

    component(): ({ }: { message: Message; messageID: number; updateMessage: (messageID: number, message: Message) => void; className?: string; }) => JSX.Element {
        return FreeTrialMessageComponent
    }

    serialize(): string {
        return JSON.stringify({ type: this.type });
    }

    static deserialize(): FreeTrialMessage {
        return new FreeTrialMessage()
    }

    isEmpty(): boolean {
        return true
    }

}

export const FreeTrialMessageComponent = ({ }: { message: Message; messageID: number; updateMessage: (messageID: number, message: Message) => void; className?: string; }) => {
    return (
        <HintMessageComponent hint={{ key: 'freeTrialHintMessage' }} />
    )
}

export const HintMessageComponent = ({ hint }: { hint: i18nText }) => {
    return (
        <div className="w-fit self-center bg-transparent mb-3">
            <p className="text-xs text-gray-400 text-center">
                <I18nText i18nText={hint} />
            </p>
        </div>
    )
}