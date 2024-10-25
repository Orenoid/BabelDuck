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
                    'Select Your Language': '选择您的语言',
                    'Confirm': '确认',
                    'Untitled Chat': '未命名对话',
                }
            }
        }
    });

export default i18n;
