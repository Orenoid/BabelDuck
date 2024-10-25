import { LuSettings } from "react-icons/lu";
import { useState } from 'react';
import { IoMdClose } from "react-icons/io";
import { useTranslation } from "react-i18next";
import i18n from '../../i18n/i18n';

export function SettingsEntry({ className = "" }: { className?: string }) {
    const [showSettings, setShowSettings] = useState(false);
    const { t } = useTranslation();

    return (
        <>
            <div
                className={`flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200 ${className}`}
                onClick={() => setShowSettings(true)}
            >
                <LuSettings className="mr-3" />
                <span>{t('Settings')}</span>
            </div>
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </>
    );
}

function FirstLevelMenuEntry({
    menuKey,
    menuName,
    selected,
    onSelect,
    className = "",
}: {
    menuKey: string;
    menuName: string;
    selected: boolean;
    onSelect: (item: string) => void;
    className?: string;
}) {
    return (
        <div
            className={`py-2 px-4 cursor-pointer rounded-lg hover:bg-gray-100 ${
                selected ? 'bg-gray-200 font-semibold' : ''
            } ${className}`}
            onClick={() => onSelect(menuKey)}
        >
            {menuName}
        </div>
    );
}

export function Settings({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const [selectedItem, setSelectedItem] = useState('General');

    const firstLevelMenuEntries = [
        { key: 'General', name: t('General') },
        { key: 'Chat', name: t('Chat') },
        { key: 'Speech', name: t('Speech') },
        { key: 'Models', name: t('Models') },
    ];

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Semi-transparent mask */}
            <div
                className="absolute inset-0 bg-black opacity-50"
                onClick={onClose}
            ></div>
            {/* Settings content */}
            <div className="bg-white rounded-2xl z-10 w-1/3">
                {/* Header */}
                <div className="flex justify-between items-center p-4">
                    <h2 className="text-xl font-semibold">{t('Settings')}</h2>
                    <IoMdClose
                        className="text-2xl cursor-pointer"
                        onClick={onClose}
                    />
                </div>
                {/* Content */}
                <div className="p-6">
                    <div className="flex flex-row">
                        <div className="w-1/4 ">
                            {firstLevelMenuEntries.map((item) => (
                                <FirstLevelMenuEntry
                                    className="my-2"
                                    key={item.key}
                                    menuKey={item.key}
                                    menuName={item.name}
                                    selected={selectedItem === item.key}
                                    onSelect={setSelectedItem}
                                />
                            ))}
                        </div>
                        <div className="w-3/4 p-4">
                            {selectedItem === 'General' && <GeneralSettings />}
                            {/* {selectedItem === 'Chat' && <ChatSettings />} */}
                            {/* {selectedItem === 'Speech' && <SpeechSettings />} */}
                            {/* {selectedItem === 'Models' && <ModelsSettings />} */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GeneralSettings() {
    const { t } = useTranslation();

    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

    const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = event.target.value;
        setSelectedLanguage(newLanguage);
        i18n.changeLanguage(newLanguage);
        localStorage.setItem('selectedLanguage', newLanguage);
    };

    return (
        <div className="flex flex-col">
            <label htmlFor="language-select" className="mb-2 font-medium">
                {t('Select Your Language')}
            </label>
            <select
                id="language-select"
                value={selectedLanguage}
                onChange={handleLanguageChange}
                className="p-2 border rounded"
            >
                <option value="en">English</option>
                <option value="zh">中文</option>
            </select>
        </div>
    );
}
