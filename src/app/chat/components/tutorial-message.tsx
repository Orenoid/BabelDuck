import { useTranslation } from "react-i18next";
import { Message } from "../lib/message";
import { Role, SpecialRoles, TextMessage } from "./message";
// import { PiStudentFill } from "react-icons/pi";
import { TmpFilledButton } from "@/app/ui-utils/components/button";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { TutorialStateIDs } from "./tutorial-redux";
import { setTutorialState } from "./tutorial-redux";
import Image from "next/image";
import { useRef, useEffect } from 'react';

abstract class TutorialMessageBase extends Message {

    abstract component(): ({ }: { message: Message; messageID: number; updateMessage: (messageID: number, message: Message) => void; className?: string; }) => JSX.Element

    constructor(type: string) {
        super(type, SpecialRoles.TUTORIAL, true, false)
    }

    serialize(): string {
        return JSON.stringify({
            type: this.type,
        })
    }

    isEmpty(): boolean {
        return false
    }
}

export class NonInteractiveTutorialMessage extends TutorialMessageBase {
    content: string
    static _type = 'non-interactive-tutorial'

    constructor(content: string) {
        super(NonInteractiveTutorialMessage._type)
        this.content = content
    }
    component(): ({ }: { message: Message; messageID: number; updateMessage: (messageID: number, message: Message) => void; className?: string; }) => JSX.Element {
        return NonInteractiveTutorialMessageComponent
    }
    serialize(): string {
        return JSON.stringify({
            type: this.type,
            content: this.content
        })
    }
    static deserialize(serialized: string): NonInteractiveTutorialMessage {
        const { content } = JSON.parse(serialized);
        return new NonInteractiveTutorialMessage(content);
    }
}

function NonInteractiveTutorialMessageComponent({ message: unTypedMsg, className }: { message: Message, messageID: number, updateMessage: (messageID: number, message: Message) => void, className?: string }) {
    const message = unTypedMsg as NonInteractiveTutorialMessage
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    return <div className={`flex flex-row ${className}`}>
        <Role className="mr-3" name={message.role} />
        <div className={`bg-[#F6F5F5] rounded-xl w-fit max-w-[80%] p-4 flex flex-col ${className}`}>
            <div className="mb-2" dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br />') }} />
            <div ref={scrollRef} />
        </div>
    </div>
}

export class NextStepTutorialMessage extends TutorialMessageBase {
    static _type = 'next-step-tutorial'
    currentStateID: TutorialStateIDs
    nextStateID: TutorialStateIDs
    constructor(currentStateID: TutorialStateIDs, nextStateID: TutorialStateIDs) {
        super(NextStepTutorialMessage._type)
        this.currentStateID = currentStateID
        this.nextStateID = nextStateID
    }
    component(): ({ }: { message: Message; messageID: number; updateMessage: (messageID: number, message: Message) => void; className?: string; }) => JSX.Element {
        return NextStepTutorialMessageComponent
    }
    contentNode() {
        const Root = () => {
            const { t } = useTranslation()
            if (this.currentStateID === TutorialStateIDs.introduction) {
                const content = t("BabelDuck 是一款面向各水平层次语言学习者的 AI 口语对话练习应用。除了普通的 AI 对话聊天能力外，我们还提供了一系列为口语练习场景而设计的工具，本教程将为你简单介绍如何使用它们。若你更倾向于自行摸索，可以点击左下角「新建对话」，即可开始体验，之后你依然随时可以回来继续该教程。")
                return <div className="mb-2" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
            }
            if (this.currentStateID === TutorialStateIDs.introduceQuickTranslationInstructions) {
                const content = t(`BabelDuck 提供了一系列快捷指令，协助用户在口语表达上遇到困难时更流畅地推进对话。\n比如有些人练习初期很容易遇到\"卡壳\"的情况，完全不知道某句话该如何表达时，不得不切出去寻求其他工具的帮助。为此系统内置了一个快捷指令，作为初期过渡工具用，允许你先用母语表达一遍，然后帮你转换为对应语言。\n\n接下来我们简单演示下使用方法`)
                return <div className="mb-2" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
            }
            if (this.currentStateID === TutorialStateIDs.startFollowUpDiscussion) {
                const content = t("在子对话中，你可以在当前对话的基础上，向 AI 追问更多问题。")
                return <div className="mb-2" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
            }
            if (this.currentStateID === TutorialStateIDs.clickNextToIllustrateGrammarCheck) {
                const paragraph1 = t("以上便是 BabelDuck 中其中一个快捷指令的基本使用流程，除此之外，我们还提供了其他一系列快捷指令。")
                return <div className="mb-2" dangerouslySetInnerHTML={{ __html: paragraph1.replace(/\n/g, '<br />') }} />
            }
            if (this.currentStateID === TutorialStateIDs.illustrateGrammarCheck) {
                const paragraph1 = t("比如常见的语法纠正需求，也有对应的内置指令，效果如下：\n")
                const paragraph2 = t("\n除此之外，除了内置的快捷指令，你还可以根据自身需求自定义指令。")
                return <>
                    <div className="mb-2" dangerouslySetInnerHTML={{ __html: paragraph1.replace(/\n/g, '<br />') }} />
                    <Image src="/images/tutorial-grammar-check-example.png" alt="tutorial-grammar-check-example" width={600} height={400} className="rounded-xl border border-gray-200" />
                    <div className="mb-2" dangerouslySetInnerHTML={{ __html: paragraph2.replace(/\n/g, '<br />') }} />
                </>
    
            }
            if (this.currentStateID === TutorialStateIDs.illustrateCustomInstructions) {
                const paragraph1 = t("比如说你的口语水平已经达到了一定的流畅度，只是偶尔有些词汇的表达方式不够地道，那么你可以自定义一个快捷指令：\n")
                const paragraph2 = t("\n鉴于自定义指令的使用流程与内置指令类似，我们就不再详细演示整个流程了。")
                return <>
                    <div className="mb-2" dangerouslySetInnerHTML={{ __html: paragraph1.replace(/\n/g, '<br />') }} />
                    <Image src="/images/tutorial-custom-instructions-example.png" alt="tutorial-custom-instructions-example" width={600} height={300} className="rounded-xl border border-gray-200" />
                    <div className="mb-2" dangerouslySetInnerHTML={{ __html: paragraph2.replace(/\n/g, '<br />') }} />
                </>
            }
            return <div></div>
        }
        return Root
        
    }
    serialize(): string {
        return JSON.stringify({
            type: this.type,
            currentStateID: this.currentStateID,
            nextStateID: this.nextStateID
        })
    }
    static deserialize(serialized: string): NextStepTutorialMessage {
        const { currentStateID, nextStateID } = JSON.parse(serialized);
        return new NextStepTutorialMessage(currentStateID, nextStateID);
    }
}

function NextStepTutorialMessageComponent({ message: unTypedMsg, className }: { message: Message, messageID: number, updateMessage: (messageID: number, message: Message) => void, className?: string }) {
    const { t } = useTranslation()
    const dispatch = useAppDispatch();
    const tutorialState = useAppSelector(state => state.tutorialState);
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    const message = unTypedMsg as NextStepTutorialMessage

    function handleNextStep() {
        dispatch(setTutorialState({ stateID: message.nextStateID }))
    }

    const ContentNode = message.contentNode()

    return <div className={`flex flex-row ${className}`}>
        <Role className="mr-3" name={message.role} />
        <div className={`bg-[#F6F5F5] rounded-xl w-fit max-w-[80%] p-4 flex flex-col ${className}`}>
            <ContentNode />
            {tutorialState.stateID === message.currentStateID &&
                <TmpFilledButton className="px-2 py-1 mr-2 rounded-lg self-end" onClick={handleNextStep}>
                    <span className="text-sm">{t('Next Step')}</span>
                </TmpFilledButton>
            }
            <div ref={scrollRef} />
        </div>
    </div>
}

// message for indicating users to click on Translation icon
function IndicateClickOnTranslationMsgComponent({ className }: { className?: string }) {
    const { t } = useTranslation()
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    const tutorialMsg1 = t("假设你正在练习线上会议中的常用表达，这时 AI 问了你一个问题：")
    const aiMsg = t("What do you think about these suggestions?")
    const content3 = t("假设你想回复 \"东西有点多，我晚点提炼一下\"，但不知道如何表达，那么就可以通过快捷指令求助另一个 AI\n")
    const content3_2 = t("现在点一下这个图标试试") // with a screenshot following

    return <div className="flex flex-col">
        {/* tutorial message 2-1*/}
        <div className={`flex flex-row ${className}`}>
            <Role className="mr-3" name={SpecialRoles.TUTORIAL} />
            <div className={`bg-[#F6F5F5] rounded-xl w-fit max-w-[80%] p-4 flex flex-col ${className}`}>
                <div className="mb-2" dangerouslySetInnerHTML={{ __html: tutorialMsg1.replace(/\n/g, '<br />') }} />
            </div>
        </div>
        {/* assistant message */}
        <div className="flex flex-row">
            <Role className="mr-3" name={SpecialRoles.ASSISTANT} />
            <div className={`bg-[#F6F5F5] rounded-xl w-fit max-w-[80%] p-4 flex flex-col ${className}`}>
                <div className="mb-2" dangerouslySetInnerHTML={{ __html: aiMsg.replace(/\n/g, '<br />') }} />
            </div>
        </div>
        {/* tutorial message 2-2 */}
        <div className="flex flex-row mb-8">
            <Role className="mr-3" name={SpecialRoles.TUTORIAL} />
            <div className={`bg-[#F6F5F5] rounded-xl w-fit max-w-[80%] p-4 flex flex-col ${className}`}>
                <div className="mb-2" dangerouslySetInnerHTML={{ __html: content3.replace(/\n/g, '<br />') }} />
                <div className="flex flex-row items-end">
                    <div className="mb-2 mr-2" dangerouslySetInnerHTML={{ __html: content3_2.replace(/\n/g, '<br />') }} />
                    <Image src="/images/tutorial-state2.png" alt="tutorial-2-2" width={300} height={300} className="rounded-xl border border-gray-200" />
                </div>
                <div ref={scrollRef} />
            </div>
        </div>
    </div>
}

export class QueClickOnTranslationMsg extends TutorialMessageBase {
    static _type = 'que-click-on-translation'

    constructor() {
        super(QueClickOnTranslationMsg._type)
    }

    component() {
        return IndicateClickOnTranslationMsgComponent
    }

    static deserialize(): QueClickOnTranslationMsg {
        return new QueClickOnTranslationMsg()
    }

}

// text message with id, can be identified for chat intelligence or input handlers
export class IdentifiedTextMessage extends TextMessage {
    static _type = 'identified-text'
    id: string
    constructor(id: string, role: string, content: string) {
        super(role, content)
        this.id = id
    }
    serialize(): string {
        return JSON.stringify({
            type: this.type,
            id: this.id,
            role: this.role,
            content: this.content
        })
    }
    static deserialize(serialized: string): IdentifiedTextMessage {
        const { id, role, content } = JSON.parse(serialized);
        return new IdentifiedTextMessage(id, role, content);
    }
}
