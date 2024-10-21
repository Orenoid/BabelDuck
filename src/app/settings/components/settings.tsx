
import { LuSettings } from "react-icons/lu";

export function SettingEntry({ className = "" }: { className?: string }) {
    return <div className={`flex flex-row py-2 pl-3 items-center cursor-pointer rounded-md hover:bg-gray-200 ${className}`}>
        <LuSettings className="mr-3" />
        <span>Settings</span>
    </div>
}