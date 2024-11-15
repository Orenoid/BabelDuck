'use client';

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next, useTranslation } from "react-i18next";

export type i18nText =
    | { text: string }
    | { key: string, values?: Record<string, string> }

export function I18nText({ i18nText, className }: { i18nText: i18nText, className?: string }) {
    const { t } = useTranslation();
    return <span className={className}>{('key' in i18nText ? t(i18nText.key, i18nText.values) : i18nText.text)}</span>
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: "en",
        interpolation: { escapeValue: false },
        resources: {
            en: {
                translation: {
                    'About': 'About',
                    'New Chat': 'New Chat',
                    'Settings': 'Settings',
                    'General': 'General',
                    'Chat': 'Chat',
                    'Speech': 'Speech',
                    'Models': 'Models',
                    'Model-Single-Form': 'Model',
                    'Select Your Language': 'Language',
                    'Confirm': 'Confirm',
                    'Untitled Chat': 'Untitled Chat',
                    'Chat {{number}}': 'Chat {{number}}',
                    'translateInputInto': 'Translate your input into',
                    'save': 'Save',
                    'instruction': 'Instruction',
                    'tooltip': 'Tooltip',
                    'tooltipInfo': 'The tooltip is the text that will be shown when you hover over the icon, like what you see here.',
                    'icon': 'Icon',
                    'singleCharacterIcon': 'Please use a single character as icon',
                    'editInstruction': 'Edit Instruction',
                    'customInstruction': 'Custom Instruction',
                    'type': 'Instruction Type',
                    'generation': 'Generation',
                    'modification': 'Modification',
                    'cancel': 'Cancel',
                    'add': 'Add',
                    'enterOneCharacter': 'Only one character is supported',
                    'customIconNote': 'Custom icon feature will be available in the future. For now, please use a single character as icon.',
                    'generationExplanation': 'A generation instruction tells the AI to generate a response for you. It can only work when your input is empty.\nTry to keep the instruction concise and specific, telling the AI what the response should be like.',
                    'modificationExplanation': 'A modification instruction tells the AI to modify your current input. It works when your input is not empty.\nYou can use it to correct grammar mistakes, polish your expression, or translate your input into another language.',
                    'typeMessage': 'Type your message here...',
                    'sendTips': 'Press Enter to send, Ctrl+Enter to add the message, Shift+Enter to add a new line',
                    'recordingTips': 'Press Space to start recording, release to stop',
                    'system': 'system',
                    'assistant': 'assistant',
                    'user': 'user',
                    'Auto Send': 'Auto Send',
                    'Voice Mode': 'Voice Mode',
                    'Rename': 'Rename',
                    'Delete': 'Delete',
                    'Free Trial': 'Free Trial',
                    'Models Service': 'Models Service',
                    'baseURL': 'Base URL',
                    'Chat Model': 'Chat Service',
                    'translateTooltip': 'Ask AI to translate your input into {{targetLanguage}}',
                    'generateResponseTooltip': 'Ask AI to help generate a response',
                    'grammarCheckTooltip': 'Ask AI to help correct potential grammar issues',
                    'The recommended response is as follows': 'The recommended response is as follows',
                    'If you have any more questions or requests, feel free to reach out to me': 'If you have any more questions or requests, feel free to reach out to me',
                    'chat.backToPreviousLevel': 'Back to previous conversation',
                    'addCustomInstruction': 'Add your custom instruction',
                    'Auto Play Audio': 'Auto Play Audio',
                }
            },
            zh: {
                translation: {
                    'About': '关于',
                    'New Chat': '新建对话',
                    'Settings': '设置',
                    'General': '通用',
                    'Chat': '对话',
                    'Speech': '语音',
                    'Models': '模型',
                    'Model-Single-Form': '模型',
                    'Select Your Language': '语言',
                    'Confirm': '确认',
                    'Untitled Chat': '未命名对话',
                    'Chat {{number}}': '对话 {{number}}',
                    'translateInputInto': '将当前输入翻译为',
                    'save': '保存',
                    'instruction': '指令',
                    'tooltip': '提示文本',
                    'tooltipInfo': '鼠标悬停在图标上时显示的文案，就像现在这样的效果',
                    'icon': '图标',
                    'singleCharacterIcon': '请使用一个字符作为图标',
                    'editInstruction': '编辑指令',
                    'customInstruction': '自定义指令',
                    'type': '指令类型',
                    'generation': '生成',
                    'modification': '修改',
                    'cancel': '取消',
                    'add': '添加',
                    'enterOneCharacter': '仅支持输入一个字符',
                    'customIconNote': '自定义图标功能后续会推出，目前仅支持使用一个字符作为图标',
                    'generationExplanation': '生成指令可以让 AI 帮你生成回复内容，例如帮你回答你答不上来的问题。该指令类型只有输入为空时才能触发。\n尽量把指令写得简洁和具体一些，指示 AI 生成你想要的回复内容。',
                    'modificationExplanation': '修改指令可以让 AI 帮你修改当前的输入内容，只有输入内容不为空时才能触发。\n可以用它来纠正语法错误、润色表达方式，或将你的输入翻译成另一种语言。',
                    'typeMessage': '在这里输入你的消息...',
                    'sendTips': '按 Enter 发送，Ctrl+Enter 添加消息，Shift+Enter 换行',
                    'recordingTips': '按空格开始录音，松开停止',
                    'system': '系统',
                    'assistant': '助手',
                    'user': '用户',
                    'Auto Send': '自动发送',
                    'Voice Mode': '语音模式',
                    'Rename': '重命名',
                    'Delete': '删除',
                    'Free Trial': '免费体验',
                    'Models Service': '模型服务',
                    'baseURL': '基础 URL',
                    'Chat Model': '对话服务',
                    'translateTooltip': '让 AI 将消息内容翻译为 {{targetLanguage}}',
                    'generateResponseTooltip': '让 AI 帮忙回复当前消息',
                    'grammarCheckTooltip': '让 AI 检查并修复潜在的语法问题',
                    'The recommended response is as follows': '根据你的要求调整后的消息如下',
                    'If you have any more questions or requests, feel free to reach out to me': '如果你还有什么疑问或要求，欢迎进一步找我讨论',
                    'chat.backToPreviousLevel': '返回上一层对话',
                    'addCustomInstruction': '添加自定义指令',
                    'Auto Play Audio': '自动播放音频',
                }
            },
            ja: {
                translation: {
                    'About': 'について',
                    'New Chat': '新しいチャット',
                    'Settings': '設定',
                    'General': '一般',
                    'Chat': 'チャット',
                    'Speech': '音声',
                    'Models': 'モデル',
                    'Model-Single-Form': 'モデル',
                    'Select Your Language': '言語',
                    'Confirm': '確認',
                    'Untitled Chat': '無題のチャット',
                    'Chat {{number}}': 'チャット {{number}}',
                    'translateInputInto': 'あなたの入力を次の言語に翻訳します',
                    'save': '保存',
                    'instruction': '指示',
                    'tooltip': 'ツールチップ',
                    'tooltipInfo': 'ツールチップは、アイコンにマウスを乗せたときに表示されるテキストです。今見ているもののように。',
                    'icon': 'アイコン',
                    'singleCharacterIcon': 'アイコンには1文字のみを使用してください。',
                    'editInstruction': '指示を編集',
                    'customInstruction': 'カスタム指示',
                    'type': 'タイプ',
                    'generation': '生成',
                    'modification': '修正',
                    'cancel': 'キャンセル',
                    'add': '追加',
                    'enterOneCharacter': '1文字のみを入力してください',
                    'customIconNote': 'カスタムアイコン機能はまもなく利用可能になります。現在は1文字のみをアイコンとして使用してください。',
                    'generationExplanation': '生成指示は、AIにあなたのために応答を生成するよう指示します。それはあなたの入力が空のときにのみ機能します。\n指示は簡潔で具体的にし、AIにどのような応答が欲しいかを伝えてください。',
                    'modificationExplanation': '修正指示は、AIに現在の入力を修正するよう指示します。それはあなたの入力が空でないときに機能します。\n文法ミスの修正、表現の磨き上げ、または入力を別の言語に翻訳するために使用できます。',
                    'typeMessage': 'ここにメッセージを入力してください...',
                    'sendTips': 'Enterキーで送信、Ctrl+Enterでメッセージを追加、Shift+Enterで改行',
                    'recordingTips': 'スペースキーを押して録音開始、離して停止',
                    'system': 'システム',
                    'assistant': 'アシスタント',
                    'user': 'ユーザー',
                    'Auto Send': '自動送信',
                    'Voice Mode': '音声モード',
                    'Rename': '名前を変更',
                    'Delete': '削除',
                    'Free Trial': '無料試用',
                    'Models Service': 'モデルサービス',
                    'baseURL': 'ベースURL',
                    'Chat Model': 'チャットサービス',
                    'translateTooltip': '入力を{{targetLanguage}}に翻訳',
                    'generateResponseTooltip': '応答の生成を支援',
                    'grammarCheckTooltip': '文法の問題を修正',
                    'The recommended response is as follows': '根拠に基づく推奨応答は次のとおりです',
                    'If you have any more questions or requests, feel free to reach out to me': 'もし、さらなる質問や要望があれば、お気軽にお問い合わせください。',
                    'chat.backToPreviousLevel': '前の会話に戻る',
                    'addCustomInstruction': 'カスタム指示を追加',
                    'Auto Play Audio': '自動再生',
                }
            }
        }
    });

export default i18n;