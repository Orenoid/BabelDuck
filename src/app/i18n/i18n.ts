'use client';

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

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
                    'Select Your Language': 'Select Your Language',
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
                    'Select Your Language': '选择你的语言',
                    'Confirm': '确认',
                    'Untitled Chat': '未命名对话',
                    'Chat {{number}}': '对话 {{number}}',
                    'translateInputInto': '将你的当前输入翻译为',
                    'save': '保存',
                    'instruction': '指令',
                    'tooltip': '提示文本',
                    'tooltipInfo': '用于在你将鼠标悬停在图标上时显示的文案，就像现在这样的效果',
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
                    'generationExplanation': '指示 AI 为你生成回复内容，当你的输入为空时才能触发。\n尽量把指令写得简洁和具体一些，指示 AI 生成你想要的回复内容。',
                    'modificationExplanation': '指示 AI 修改你当前的输入内容，当你的输入不为空时才能触发。\n你可以用它来纠正语法错误、润色表达方式，或将你的输入翻译成另一种语言。',
                }
            },
            // translated using LLM, pull requests welcome / LLMを使用して翻訳されました。プルリクエスト歓迎します
            ja: {
                translation: {
                    'About': 'について',
                    'New Chat': '新しいチャット',
                    'Settings': '設定',
                    'General': '一般',
                    'Chat': 'チャット',
                    'Speech': '音声',
                    'Models': 'モデル',
                    'Select Your Language': '言語を選択してください',
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
                }
            }
        }
    });

export default i18n;
