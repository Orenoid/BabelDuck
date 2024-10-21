"use client"

import { useEffect, useRef, useState } from "react";
import { Message } from "../lib/message";
import { CgChevronDoubleDown } from "react-icons/cg";
import { TbPencil } from "react-icons/tb";
import React from "react";
import { ThreeDots } from "react-loader-spinner";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { FaStopCircle } from "react-icons/fa";
import { IoStopCircleOutline } from "react-icons/io5";
import { PiSpeakerHighBold } from "react-icons/pi";

export const MessageTypes = {
    SYSTEM: 'systemMessage',
    TEXT: 'text',
    STREAMING_TEXT: 'streamingText',
    AUDIO: 'audio',
    SUGGESTED_ANSWER: 'suggested_answer'
};

export const SpecialRoleTypes = {
    SYSTEM: 'system',
    USER: 'user',
    ASSISTANT: 'assistant'
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
            const [compState, setCompState] = useState<systemMessgeState>({ type: 'normal', showMore: false, content: this._systemPrompt })
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

            return <div className={`flex flex-col ${className}`}
                onMouseEnter={toggleShowMore} onMouseLeave={toggleShowMore}>
                <Role className="mb-2" name={this.role} />
                {!isEditing && <MessageContent content={compState.content} />}
                {isEditing &&
                    <div className="bg-[#F6F5F5] rounded-lg max-w-[80%] p-4">
                        <textarea className="w-full bg-[#F6F5F5] h-32 resize-none focus:outline-none"
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
        }
        return Root
    }

    toJSON(): { role: string, content: string } {
        return { role: 'system', content: this._systemPrompt }
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
    const showMore = (compState.type === 'normal' && compState.showMore)
        || compState.type === 'playingAudio' // you will want to keep the buttons showing while playing the audio
    const isEditing = (compState.type === 'editing')
    const isPlaying = compState.type === 'playingAudio'

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
            return
        }
        const utterance = new SpeechSynthesisUtterance();
        // TODO detect the text language
        utterance.lang = 'en-US';
        const allVoices: SpeechSynthesisVoice[] = [];
        const getVoices = () => {
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                allVoices.push(...voices);
            } else {
                setTimeout(getVoices, 100);
            }
        };
        getVoices();
        let prefferedVoice: SpeechSynthesisVoice | undefined = undefined;
        const preferredVoices = ['Google US English', 'Nicky', 'Karen', 'Aaron', 'Gordon', 'Google UK English Male', 'Google UK English Female', 'Catherine']
        while (allVoices.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        for (const name of preferredVoices) {
            for (const voice of allVoices) {
                if (voice.name === name) {
                    prefferedVoice = voice;
                    break;
                }
            }
            if (prefferedVoice !== undefined) {
                break;
            }
        }
        if (prefferedVoice !== undefined) {
            utterance.voice = prefferedVoice;
        }
        // https://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
        let myTimeout: NodeJS.Timeout
        function myTimer() {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
            myTimeout = setTimeout(myTimer, 10000);
        }
        window.speechSynthesis.cancel()
        myTimeout = setTimeout(myTimer, 10000)
        utterance.text = compState.content
        utterance.onend = () => {
            clearTimeout(myTimeout)
            setCompState({ type: 'normal', content: compState.content, showMore: true })
        }
        setCompState({ ...compState, type: 'playingAudio' })
        window.speechSynthesis.speak(utterance)
    }
    async function stopPlaying() {
        if (!isPlaying) {
            return
        }
        window.speechSynthesis.cancel()
        setCompState({ type: 'normal', showMore: true, content: compState.content })
    }

    return <div className={`flex flex-col ${className}`}
        onMouseEnter={() => { setShowMore(true) }} onMouseLeave={() => { setShowMore(false) }}>
        <Role className="mb-2" name={messageIns.role} />
        {!isEditing && <MessageContent content={compState.content} />}
        {isEditing &&
            <div className="bg-[#F6F5F5] rounded-lg max-w-[80%] p-4">
                <textarea className="w-full bg-[#F6F5F5] h-32 resize-none focus:outline-none"
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
        <div className={`flex flex-row pt-2 pl-1 ${showMore ? 'visible' : 'invisible'}`}>
            {/* audio control */}
            <IconSquareWrapper width={24} height={24} className="mr-1">
                <div className="cursor-pointer" onClick={!isPlaying ? startPlaying : stopPlaying}>
                    {isPlaying ? <IoStopCircleOutline color="#898989" size={20} /> : <PiSpeakerHighBold color="#898989" size={18} />}
                </div>
            </IconSquareWrapper>
            {/* edit message */}
            <IconSquareWrapper width={24} height={24} className="mr-1">
                <TbPencil className="cursor-pointer" size={21} color="#898989" onClick={() => { toEditingState() }} />
            </IconSquareWrapper>
        </div>
    </div>
}

export function IconSquareWrapper({ children, width = 24, height = 24, className = "" }:
    { children: React.ReactNode, width?: number, height?: number, className?: string }): JSX.Element {
    return <div className={`flex items-center cursor-pointer justify-center w-[${width}px] h-[${height}px] rounded-md hover:bg-gray-50 ${className}`} style={{ width: `${width}px`, height: `${height}px` }}>
        {children}
    </div>
}

export function IconCircleWrapper({ children, width = 24, height = 24, className = "" }:
    { children: React.ReactNode, width?: number, height?: number, className?: string }): JSX.Element {
    return <div className={`flex items-center cursor-pointer justify-center w-[${width}px] h-[${height}px] rounded-full hover:bg-gray-300 ${className}`} style={{width: `${width}px`, height: `${height}px`}}>
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

    // make it reusable for other message components
    renderControlled = ({ compState, setCompState, messageID, updateMessage, className }: {
        compState: textMessageState,
        setCompState: React.Dispatch<React.SetStateAction<textMessageState>>,
        messageID: number,
        updateMessage: (messageID: number, message: Message) => void,
        className?: string
    }) => {
        const showMore = (compState.type === 'normal' && compState.showMore)
            || compState.type === 'playingAudio' // you will want to keep the buttons showing while playing the audio
        const isEditing = (compState.type === 'editing')
        const isPlaying = compState.type === 'playingAudio'

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
                return
            }
            const utterance = new SpeechSynthesisUtterance();
            // TODO detect the text language
            utterance.lang = 'en-US';
            const allVoices: SpeechSynthesisVoice[] = [];
            const getVoices = () => {
                const voices = speechSynthesis.getVoices();
                if (voices.length > 0) {
                    allVoices.push(...voices);
                } else {
                    setTimeout(getVoices, 100);
                }
            };
            getVoices();
            let prefferedVoice: SpeechSynthesisVoice | undefined = undefined;
            const preferredVoices = ['Google US English', 'Nicky', 'Karen', 'Aaron', 'Gordon', 'Google UK English Male', 'Google UK English Female', 'Catherine']
            while (allVoices.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            for (const name of preferredVoices) {
                for (const voice of allVoices) {
                    if (voice.name === name) {
                        prefferedVoice = voice;
                        break;
                    }
                }
                if (prefferedVoice !== undefined) {
                    break;
                }
            }
            if (prefferedVoice !== undefined) {
                utterance.voice = prefferedVoice;
            }
            // https://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
            let myTimeout: NodeJS.Timeout
            function myTimer() {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
                myTimeout = setTimeout(myTimer, 10000);
            }
            window.speechSynthesis.cancel()
            myTimeout = setTimeout(myTimer, 10000)
            utterance.text = compState.content
            utterance.onend = () => {
                clearTimeout(myTimeout)
                setCompState({ type: 'normal', content: compState.content, showMore: true })
            }
            setCompState({ ...compState, type: 'playingAudio' })
            window.speechSynthesis.speak(utterance)
        }
        async function stopPlaying() {
            if (!isPlaying) {
                return
            }
            window.speechSynthesis.cancel()
            setCompState({ type: 'normal', showMore: true, content: compState.content })
        }

        return <div className={`flex flex-col ${className}`}
            onMouseEnter={() => { setShowMore(true) }} onMouseLeave={() => { setShowMore(false) }}>
            <Role className="mb-2" name={this.role} />
            {!isEditing && <MessageContent content={compState.content} />}
            {isEditing &&
                <div className="bg-[#F6F5F5] rounded-lg max-w-[80%] p-4">
                    <textarea className="w-full bg-[#F6F5F5] h-32 resize-none focus:outline-none"
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
                                updateMessage(messageID, this.updateContent(compState.editingContent)) // TODO error handling
                                saveEdit()
                            }}>Save</button>
                    </div>
                </div>
            }
            <div className={`flex flex-row mt-1 pl-1 ${showMore ? 'visible' : 'invisible'}`}>
                <div className="mr-2 cursor-pointer" onClick={!isPlaying ? startPlaying : stopPlaying}>
                    {isPlaying ? <FaStopCircle color="#898989" size={25} /> : <HiMiniSpeakerWave color="#898989" size={25} />}
                </div>
                <TbPencil className="cursor-pointer" size={25} color="#898989"
                    onClick={() => {
                        toEditingState()
                    }} />
            </div>
        </div>
    }

    component() {
        return TextMessageComponent
    }

    toJSON(): { role: string, content: string } {
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
        super(MessageTypes.STREAMING_TEXT, role, true, false)
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

    toJSON(): { role: string; content: string; } {
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

    const [textMsgState, setTextMsgState] = useState<textMessageState>({ type: 'normal', showMore: false, content: '' }) // TODO maybe useRef?

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

    // TODO: Issues exist with strict mode
    useEffect(() => {
        const startStreaming = () => {
            const iterator = message.streamingGenerator[Symbol.asyncIterator]();

            const autoPlay = true // TODO read from settings
            let _finished = false
            let unmounted = false
            const buffer: string[] = []
            const splited: string[] = []

            const processChunk = async () => {
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
                        // try to split the first sentence from buffer, if so, send it to splited channel
                        const sentenceEndings = /([.!?。！？,，;；:：\n])/g;
                        const sentences = buffer.join('').split(sentenceEndings);
                        if (sentences.length > 1) {
                            const firstSentence = sentences[0] + sentences[1];
                            if (firstSentence !== '') {
                                splited.push(firstSentence)
                                buffer.length = 0
                                buffer.push(sentences.slice(2).join(''))
                            }
                        }
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
                }
                stateRef.current = { type: 'finished', content: message.consumedChunks.join('') }
            };

            const playAudioFromBuffer = async () => {
                // avoid garbage collection issues
                // https://stackoverflow.com/questions/23483990/speechsynthesis-api-onend-callback-not-working
                const utterances = [];
                const allVoices: SpeechSynthesisVoice[] = [];
                let prefferedVoice: SpeechSynthesisVoice | undefined = undefined
                const tryLoadingVoices = () => {
                    // https://stackoverflow.com/questions/49506716/speechsynthesis-getvoices-returns-empty-array-on-windows
                    if (allVoices.length > 0) { return }
                    const voices = speechSynthesis.getVoices();
                    if (voices.length > 0) {
                        allVoices.push(...voices);
                    } else {
                        setTimeout(tryLoadingVoices, 100);
                    }
                };
                tryLoadingVoices();
                // https://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
                let myTimeout: NodeJS.Timeout
                function myTimer() {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                    myTimeout = setTimeout(myTimer, 10000);
                }
                window.speechSynthesis.cancel()
                myTimeout = setTimeout(myTimer, 10000)

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
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = 'en-US';
                    if (prefferedVoice === undefined) {
                        const preferredVoices = ['Google US English', 'Nicky', 'Karen', 'Aaron', 'Gordon', 'Google UK English Male', 'Google UK English Female', 'Catherine']
                        // wait until voices have been loaded
                        while (allVoices.length === 0) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        for (const name of preferredVoices) {
                            for (const voice of allVoices) {
                                if (voice.name === name) {
                                    prefferedVoice = voice
                                    break
                                }
                            }
                            if (prefferedVoice !== undefined) {
                                break
                            }
                        }
                    }
                    if (prefferedVoice !== undefined) {
                        utterance.voice = prefferedVoice
                    }
                    utterances.push(utterance)
                    utterance.text = text
                    utterance.onend = () => {
                        clearTimeout(myTimeout)
                    }
                    if (isFirstUtt) {
                        // when the first utterance starts speaking, set playing=true
                        setMsgState({ ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: true })
                        stateRef.current = { ...stateRef.current as { type: 'streaming', streamingContent: string, playing: boolean }, playing: true }
                        isFirstUtt = false
                    }
                    if (_finished && buffer.length === 0) {
                        // when the last utterance is finished, set the text message to normal state
                        // the reason why not use utterance.onend callback:
                        // https://stackoverflow.com/questions/23483990/speechsynthesis-api-onend-callback-not-working
                        // BECAUSE IT DOES NOT WORK !
                        utterance.addEventListener('end', () => {
                            if (!window.speechSynthesis.speaking) {
                                setTextMsgState((prev) => {
                                    if (prev.type === 'playingAudio') {
                                        return { type: 'normal', content: prev.content, showMore: false }
                                    }
                                    return prev
                                })
                                return;
                            }
                        })
                        // const _wait = () => {
                        //     if (!window.speechSynthesis.speaking) {
                        //         setTextMsgState((prev) => {
                        //             if (prev.type === 'playingAudio') {
                        //                 return { type: 'normal', content: prev.content, showMore: false }
                        //             }
                        //             return prev
                        //         })
                        //         return;
                        //     }
                        //     window.setTimeout(_wait, 200);
                        // }
                        // _wait();
                    }
                    window.speechSynthesis.speak(utterance)
                    await new Promise(resolve => {
                        utterance.onend = resolve;
                    });
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
            if (informUnmounted) { informUnmounted() }
        }
    }, [message, messageID, persistMessage]);

    return (
        <>
            {/* if not finished, render as streaming message */}
            {!finished &&
                <div className={`flex flex-col ${className}`}>
                    {/* message content */}

                    <Role className="mb-2" name={message.role} />
                    <div className={`bg-[#F6F5F5] rounded-lg w-fit max-w-[80%] p-2`}>
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
            return <div className={`flex flex-col ${className}`}>
                <Role className="mb-2" name={this.role} />
                <div className={`bg-[#F6F5F5] rounded-lg w-fit max-w-[80%] p-2 ${className}`}>
                    <div className="">{`The recommended response is as follow:`}</div>
                    <div className="flex flex-col p-3 m-4 ml-0 bg-white shadow-sm border-2 rounded-md">
                        <div dangerouslySetInnerHTML={{ __html: this.recommendedContent.replace(/\n/g, '<br />') }} />
                        <div className="flex flex-row self-end">
                            <button className="mr-2 py-0 px-2 bg-gray-800 rounded-md text-[15px] text-white" >
                                <CgChevronDoubleDown className="inline-block mr-1" color="white" /> Apply
                            </button>
                        </div>
                    </div>

                    <div className="">{`If you have any more questions, feel free to continue the discussion with me.`}</div>
                </div>
                <div>
                    {/* 
                    <div className="flex bg-gray-400 flex-wrap mb-4 h-fit min-h-8">
                        {this.recommendedContent}
                    </div> */}

                </div>
            </div>
        }
        return Root
    }

    toJSON(): { role: string, content: string } {
        return { role: this.role, content: this.recommendedContent }
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

export function Role({ name, className }: {
    name: string;
    className?: string;
    avatarUrl?: string;
}) {
    return (
        <div className={`flex items-center p-1 ${className}`}>
            <span className="font-semibold">{name}</span>
        </div>
    );
}

export function MessageContent({ content, className = "" }: {
    content: string;
    className?: string;
}) {
    return (
        <div className={`bg-[#F6F5F5] rounded-xl w-fit max-w-[80%] p-4 ${className}`}>
            <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
        </div>
    );
}

