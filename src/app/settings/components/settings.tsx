import { LuSettings } from "react-icons/lu";
import { useState } from 'react';
import { IoMdClose } from "react-icons/io";

export function SettingsEntry({ className = "" }: { className?: string }) {
    const [showSettings, setShowSettings] = useState(false);

    return (
        <>
            <div
                className={`flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200 ${className}`}
                onClick={() => setShowSettings(true)}
            >
                <LuSettings className="mr-3" />
                <span>Settings</span>
            </div>
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </>
    );
}


// 添加一级菜单组件
function FirstLevelMenuEntry({
    menuName,
    selected,
    onSelect,
    className = "",
}: {
    menuName: string;
    selected: boolean;
    onSelect: (item: string) => void;
    className?: string;
}) {
    return (
        <div key={menuName}
            className={`py-2 px-4 cursor-pointer rounded-lg hover:bg-gray-100 ${selected ? 'bg-gray-200 font-semibold' : ''
                } ${className}`}
            onClick={() => onSelect(menuName)}
        >
            {menuName}
        </div>
    );
}

// 修改 Settings 组件
export function Settings({ onClose }: { onClose: () => void }) {
    const [selectedItem, setSelectedItem] = useState('General');

    const firstLevelMenuEntries = ['General', 'Chat', 'Speech', 'Models'];

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
                    <h2 className="text-xl font-semibold">Settings</h2>
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
                                <FirstLevelMenuEntry className="my-2" key={item} menuName={item} selected={selectedItem === item} onSelect={setSelectedItem} />
                            ))}
                        </div>
                        {/* <div className="w-3/4 p-4">
                            {selectedItem === 'General' && <GeneralSettings />}
                            {selectedItem === 'Chat' && <ChatSettings />}
                            {selectedItem === 'Speech' && <SpeechSettings />}
                            {selectedItem === 'Models' && <ModelsSettings />}
                        </div> */}
                    </div>
                </div>
            </div>
        </div>
    );
}
