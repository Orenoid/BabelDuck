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
                    'Select Your Language': 'Interface Language',
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
                    'instructionType': 'Instruction Type',
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
                    'Voice Mode': 'Voice Input',
                    'Rename': 'Rename',
                    'Delete': 'Delete',
                    'Free Trial': 'Free Trial',
                    'Models Service': 'Models Service',
                    'baseURL': 'Base URL',
                    'Chat Model': 'Chat Service',
                    'Add Service': 'Add Service',
                    'translateTooltip': 'Ask AI to translate your input into {{targetLanguage}}',
                    'generateResponseTooltip': 'Ask AI to help generate a response',
                    'grammarCheckTooltip': 'Ask AI to help correct potential grammar issues',
                    'The recommended response is as follows': 'The recommended response is as follows',
                    'If you have any more questions or requests, feel free to reach out to me': 'If you have any more questions or requests, feel free to reach out to me',
                    'chat.backToPreviousLevel': 'Back to previous conversation',
                    'addCustomInstruction': 'Add your custom instruction',
                    'Auto Play Audio': 'Auto Play Speech',
                    'Shortcut Instructions': 'Shortcut Instructions',
                    'cannotDeleteBuiltInInstruction': 'Cannot delete built-in instruction',
                    'deleteInstruction': 'Delete instruction',
                    'toggleInstructionDisplay': 'Toggle instruction display',
                    'Select Practice Language': 'Language You Want to Practice',
                    'lang.en': 'English',
                    'lang.zh': 'Chinese',
                    'lang.ja': 'Japanese',
                    'practiceLanguageHint': 'This is just for configuring shortcuts. You can change it later',
                    'betaWarning': 'This application is currently in beta testing. Please do not store any important data in it.',
                    'Approve': 'Approve',
                    'Reject': 'Reject',
                    'Follow-up discussions': 'Follow-up discussions',
                    'Show Diff': 'Show Diff',
                    'Edit': 'Edit',
                    'Save': 'Save',
                    'Please turn off diff view to edit': 'Turn off diff view to edit',
                    'voiceModeTips': `Press the backspace key to clear the current input, press the I key to exit voice input mode`,
                    'autoSendTips': 'When enabled, the message will be sent automatically after voice recording ends',
                    'recordingButtonTips': 'Click to start recording, click again to stop',
                    'Welcome to BabelDuck': 'Welcome to BabelDuck',
                    'Please set up your preferences to get started': 'Please set up your preferences to get started',
                    'Custom Service': 'Custom Service',
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
                    'Select Your Language': '界面语言',
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
                    'instructionType': '指令类型',
                    'generation': '生成',
                    'modification': '修改',
                    'cancel': '取消',
                    'add': '添加',
                    'enterOneCharacter': '仅支持输入一个字符',
                    'customIconNote': '自定义图标功能后续会推出，目前仅支持使用一个字符作为图标',
                    'generationExplanation': '生成指令可以让 AI 帮你生成回复内容，例如帮你回答你答不上来的问题。该指令类型只有输入为空时才能触发。\n尽量把指令写得简洁和具体一些，指示 AI 生成你想要的回复内容。',
                    'modificationExplanation': '修改指令可以让 AI 帮你修改当前的输入内容，只有输入内容不为空时才能触发。\n可以用它来纠正语法错误、润色表达方式，或将你的输入翻译成另一种语言。',
                    'typeMessage': '在这里输入消息内容...',
                    'sendTips': '按 Enter 发送，Ctrl+Enter 添加消息但不触发回复，Shift+Enter 换行',
                    'recordingTips': '按空格开始录音，松开则停止录音',
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
                    'Add Service': '添加服务',
                    'translateTooltip': '让 AI 将消息内容翻译为 {{targetLanguage}}',
                    'generateResponseTooltip': '让 AI 帮忙回复当前消息',
                    'grammarCheckTooltip': '让 AI 检查并修复潜在的语法问题',
                    'The recommended response is as follows': '根据你的要求调整后的消息如下',
                    'If you have any more questions or requests, feel free to reach out to me': '如果你还有什么疑问或要求，欢迎进一步找我讨论',
                    'chat.backToPreviousLevel': '返回上一层对话',
                    'addCustomInstruction': '添加自定义指令',
                    'Auto Play Audio': '自动播放语音',
                    'Shortcut Instructions': '快捷指令',
                    'cannotDeleteBuiltInInstruction': '内置指令不可删除',
                    'deleteInstruction': '删除指令',
                    'toggleInstructionDisplay': '切换指令显示',
                    'Select Practice Language': '你想要练习的语言',
                    'lang.en': '英语',
                    'lang.zh': '中文',
                    'lang.ja': '日语',
                    'practiceLanguageHint': '仅用于配置一些快捷操作，之后随时可以更改',
                    'betaWarning': '该应用目前尚处于 beta 测试阶段，请勿将重要数据保存于应用中。',
                    'Approve': '采纳',
                    'Reject': '取消',
                    'Follow-up discussions': '讨论｜追问',
                    'Show Diff': '显示差异',
                    'Edit': '编辑',
                    'Save': '保存',
                    'Please turn off diff view to edit': '仅允许在差异视图关闭时进行编辑',
                    'voiceModeTips': `按退格键清空当前输入，按 I 键退出语音模式`,
                    'autoSendTips': '开启后，语音录制结束时会自动发送消息',
                    'recordingButtonTips': '点击开始录音，再次点击停止录音',
                    'Welcome to BabelDuck': '欢迎使用 BabelDuck',
                    'Please set up your preferences to get started': '完成以下偏好设置后即可开始使用',
                    'Custom Service': '自定义服务',
                }
            },
            // the Japanese translation is generated using LLM, PRs are welcomed to improve it.
            // 日本語の翻訳はLLMを使用して生成されています。より良い翻訳のPRを歓迎します。
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
                    'Select Your Language': 'インターフェイス言語',
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
                    'instructionType': '指示タイプ',
                    'generation': '生成',
                    'modification': '修正',
                    'cancel': 'キャンセル',
                    'add': '追加',
                    'enterOneCharacter': '1文字のみを入力してください',
                    'customIconNote': 'カスタムアイコン機能はまもなく利用可能になります。現在は1文字のみをアイコンとして使用してください。',
                    'generationExplanation': '生成指示は、AIにあなたのために応答を生成するよう指示します。それはあなたの入力が空のときにのみ機能します。\n指示は簡潔で具体的にし、AIにどのような応答が欲しいかを伝えてください。',
                    'modificationExplanation': '修正指示は、AIに現在の入力を修正するよう指示します。それはあなたの入力が空でないときに機能します。\n文法ミスの修正、表現の磨き上げ、または入力を別の言語に翻訳するために使用できます。',
                    'typeMessage': 'ここにメッセージを入力してください...',
                    'sendTips': 'Enterキーで信、Ctrl+Enterでメッセージを追加、Shift+Enterで改行',
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
                    'Add Service': 'サービスを追加',
                    'translateTooltip': '入力を{{targetLanguage}}に翻訳',
                    'generateResponseTooltip': '応答の生成を支援',
                    'grammarCheckTooltip': '文法の問題を修正',
                    'The recommended response is as follows': '根拠に基づく推奨応答は次のとおりです',
                    'If you have any more questions or requests, feel free to reach out to me': 'もし、さらなる質問や要望があれば、お気軽にお問い合わせください。',
                    'chat.backToPreviousLevel': '前の会話に戻る',
                    'addCustomInstruction': 'カスタム指示を追加',
                    'Auto Play Audio': '音声自動再生',
                    'Shortcut Instructions': 'ショートカット指示',
                    'cannotDeleteBuiltInInstruction': '組み込み指示は削除できません',
                    'deleteInstruction': '指示を削除',
                    'toggleInstructionDisplay': '指示の表示を切り替える',
                    'Select Practice Language': '練習したい言語',
                    'lang.en': '英語',
                    'lang.zh': '中国語',
                    'lang.ja': '日本語',
                    'practiceLanguageHint': 'これはショートカット設定用です。後で変更できます',
                    'betaWarning': 'このアプリケーションは現在ベータテスト中です。重要なデータを保存しないでください。',
                    'Approve': '承認',
                    'Reject': '拒否',
                    'Follow-up discussions': 'フォローアップ討論',
                    'Show Diff': '差分表示',
                    'Edit': '編集',
                    'Save': '保存',
                    'Please turn off diff view to edit': '編集するには差分表示をオフにしてください',
                    'voiceModeTips': `バックスペースキーを押して現在の入力をクリアし、I キーを押して音声入力モードを終了します`,
                    'autoSendTips': '有効にすると、音声録音終了後にメッセージが自動的に送信されます',
                    'recordingButtonTips': 'クリックして録音を開始し、もう一度クリックして停止します',
                    'Welcome to BabelDuck': 'BabelDuck へようこそ',
                    'Please set up your preferences to get started': '始めるには設定を行ってください',
                    'Custom Service': 'カスタムサービス',
                }
            }
        }
    });

export default i18n;
