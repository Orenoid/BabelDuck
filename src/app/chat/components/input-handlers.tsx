import { MdGTranslate } from "react-icons/md";
import { TbPencilQuestion } from "react-icons/tb";
import { FaSpellCheck } from "react-icons/fa";
import { useState } from "react";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { Tooltip } from "react-tooltip";

// Define InputHandlerTypes enum
export enum InputHandlerTypes {
    Generation = "generation",
    Revision = "revision"
}

// Define InputHandlerHub class
class InputHandlerHub {
    private handlerMap: Map<string, (serialized: string) => InputHandler> = new Map();

    registerHandler(implType: string, deserialize: (serialized: string) => InputHandler) {
        this.handlerMap.set(implType, deserialize);
    }

    getHandlerClassByImplType(implType: string): ((serialized: string) => InputHandler) | undefined {
        return this.handlerMap.get(implType);
    }
}

// Create a global instance of InputHandlerHub
export const inputHandlerHub = new InputHandlerHub();

// Define InputHandler abstract class
export abstract class InputHandler {
    readonly implType: string;
    readonly type: InputHandlerTypes;
    iconNode: React.ReactNode;
    shortcutKeyCallback?: (e: React.KeyboardEvent) => boolean;

    constructor(implType: string, type: InputHandlerTypes) {
        this.implType = implType;
        this.type = type;
    }

    abstract tooltip(lang: string): string;
    abstract instruction(): string;
    abstract serialize(): string;

    static deserialize(serialized: string): InputHandler {
        const { implType } = JSON.parse(serialized);
        const deserialize = inputHandlerHub.getHandlerClassByImplType(implType);
        if (deserialize) {
            return deserialize(serialized);
        } else {
            throw new Error(`Deserialization method for implType ${implType} is not implemented`);
        }
    }
}

// Define TranslationHandler class
export class TranslationHandler extends InputHandler {
    targetLanguage: string;

    constructor(targetLanguage: string) {
        super('translation', InputHandlerTypes.Revision);
        this.targetLanguage = targetLanguage;
        this.iconNode = <MdGTranslate size={20} />;
        this.shortcutKeyCallback = (e: React.KeyboardEvent) => e.key === 'k' && (e.metaKey || e.ctrlKey);
    }

    tooltip(lang: string): string {
        if (lang.startsWith("zh")) {
            return `将消息内容翻译为 ${this.targetLanguage}`;
        } else {
            return `Translate the message into ${this.targetLanguage}.`;
        }
    }

    instruction(): string {
        return `Translate it into ${this.targetLanguage} to express the same meaning.`;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            targetLanguage: this.targetLanguage
        });
    }

    static deserialize(serialized: string): TranslationHandler {
        const { targetLanguage } = JSON.parse(serialized);
        return new TranslationHandler(targetLanguage);
    }
}

// Define RespGenerationHandler class
export class RespGenerationHandler extends InputHandler {
    constructor() {
        super('respGeneration', InputHandlerTypes.Generation);
        this.iconNode = <TbPencilQuestion size={20} />;
        this.shortcutKeyCallback = (e: React.KeyboardEvent) => e.key === '/' && (e.metaKey || e.ctrlKey);
    }

    tooltip(lang: string): string {
        if (lang.startsWith("zh")) {
            return "协助生成对应的回复";
        } else {
            return "Help generate a response.";
        }
    }

    instruction(): string {
        return "Help me respond it.";
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type
        });
    }

    static deserialize(): RespGenerationHandler {
        return new RespGenerationHandler();
    }
}

// Define CommonGenerationHandler class
export class CommonGenerationHandler extends InputHandler {
    _instruction: string;
    _tooltip: string;
    _toolTipKey?: string;
    _iconChar: string;

    constructor(instruction: string, tooltip: string, iconChar: string, toolTipKey?: string) {
        super('commonGeneration', InputHandlerTypes.Generation);
        this._instruction = instruction;
        this._tooltip = tooltip;
        this._toolTipKey = toolTipKey;
        this._iconChar = iconChar;
        this.iconNode = <span>{iconChar}</span>;
    }

    tooltip(): string {
        return this._tooltip;
    }

    instruction(): string {
        return this._instruction;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            instruction: this._instruction,
            tooltip: this._tooltip,
            toolTipKey: this._toolTipKey,
            iconChar: this._iconChar
        });
    }

    static deserialize(serialized: string): CommonGenerationHandler {
        const { instruction, tooltip, iconChar, toolTipKey } = JSON.parse(serialized);
        return new CommonGenerationHandler(instruction, tooltip, iconChar, toolTipKey);
    }
}

// Define CommonRevisionHandler class
export class CommonRevisionHandler extends InputHandler {
    _instruction: string;
    _tooltip: string;
    _iconChar: string;
    _toolTipKey?: string;

    constructor(instruction: string, tooltip: string, iconChar: string, toolTipKey?: string) {
        super('commonRevision', InputHandlerTypes.Revision);
        this._instruction = instruction;
        this._tooltip = tooltip;
        this._iconChar = iconChar;
        this._toolTipKey = toolTipKey;
    }

    tooltip(): string {
        return this._tooltip;
    }

    instruction(): string {
        return this._instruction;
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type,
            instruction: this._instruction,
            tooltip: this._tooltip,
            toolTipKey: this._toolTipKey,
            iconChar: this._iconChar
        });
    }

    static deserialize(serialized: string): CommonRevisionHandler {
        const { instruction, tooltip, iconChar, toolTipKey } = JSON.parse(serialized);
        return new CommonRevisionHandler(instruction, tooltip, iconChar, toolTipKey);
    }
}

// Define GrammarCheckingHandler class
export class GrammarCheckingHandler extends InputHandler {
    constructor() {
        super('grammarChecking', InputHandlerTypes.Revision);
        this.iconNode = <FaSpellCheck size={20} className="ml-[-2px]" />;
        this.shortcutKeyCallback = (e: React.KeyboardEvent) => e.key === 'g' && (e.metaKey || e.ctrlKey);
    }

    tooltip(lang: string): string {
        if (lang.startsWith("zh")) {
            return "检查并修正可能存在的语法问题";
        } else {
            return "Correct potential grammar issues";
        }
    }

    instruction(): string {
        return "Correct potential grammar issues.";
    }

    serialize(): string {
        return JSON.stringify({
            implType: this.implType,
            type: this.type
        });
    }

    static deserialize(): GrammarCheckingHandler {
        return new GrammarCheckingHandler();
    }
}

// Register all InputHandler subclasses
inputHandlerHub.registerHandler('translation', TranslationHandler.deserialize);
inputHandlerHub.registerHandler('respGeneration', RespGenerationHandler.deserialize);
inputHandlerHub.registerHandler('grammarChecking', GrammarCheckingHandler.deserialize);
inputHandlerHub.registerHandler('commonGeneration', CommonGenerationHandler.deserialize);
inputHandlerHub.registerHandler('commonRevision', CommonRevisionHandler.deserialize);

export function InputHandlerCreator({
    cancelCallback,
    inputHandlerAdded
}: {
    cancelCallback: () => void;
    inputHandlerAdded: (handler: InputHandler) => void;
}) {
    const [type, setType] = useState<InputHandlerTypes>(InputHandlerTypes.Generation);
    const [instruction, setInstruction] = useState('');
    const [tooltip, setTooltip] = useState('');
    const [icon, setIcon] = useState('');

    return (
        <>
            <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={cancelCallback}></div>
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50">
                {/* type selector */}
                <h2 className="text-2xl font-bold mb-4">Custom Instruction</h2>
                <div className="mb-4">
                    <label htmlFor="type" className="block text-gray-700 font-bold mb-2">Type</label>
                    <select id="type" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={type} onChange={(e) => setType(e.target.value as InputHandlerTypes)}>
                        <option value="generation">Generation</option>
                        <option value="revision">Modification</option>
                    </select>
                    <div className="flex flex-row items-start mt-1">
                        <IoMdInformationCircleOutline className="text-gray-400 mr-2 mt-1" />
                        {type === InputHandlerTypes.Generation && <p className="text-gray-400 text-base italic">
                            A generation instruction is to tell the AI to generate a response for you. It can only work while your input is empty. <br />
                            Try to keep the instruction concise and specific, telling the AI what the response should be like.
                        </p>}
                        {type === InputHandlerTypes.Revision && <p className="text-gray-400 text-base italic">
                            A modification instruction is to tell the AI to modify your current input. It can work while your input is not empty. <br />
                            You can use it to do something like correcting a grammar mistake, polishing your expression, or translating your input into another language.
                        </p>}
                    </div>
                </div>
                {/* instruction */}
                <div className="mb-4">
                    <label htmlFor="instruction" className="block text-gray-700 font-bold mb-2">Instruction</label>
                    <textarea id="instruction" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={instruction} onChange={(e) => setInstruction(e.target.value)}></textarea>
                </div>
                {/* tooltip */}
                <div className="mb-4">
                    <div className="flex flex-row items-center mb-2">
                        <label htmlFor="tooltip" className="block text-gray-700 font-bold mr-2">Tooltip</label>
                        <IoMdInformationCircleOutline className="text-gray-400" id="tooltip-info" />
                        <Tooltip anchorSelect="#tooltip-info" clickable delayShow={300} delayHide={0} style={{ borderRadius: '0.75rem' }}>
                            <span>The tooltip is the text that will be shown when you hover over the icon, like what you see here.</span>
                        </Tooltip>
                    </div>
                    <input type="text" id="tooltip" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={tooltip} onChange={(e) => setTooltip(e.target.value)}></input>
                </div>
                {/* icon */}
                <div className="mb-4">
                    <label htmlFor="icon" className="block text-gray-700 font-bold mb-2">Icon</label>
                    <input type="text" id="icon" maxLength={1} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        placeholder="please enter only one character"
                        onChange={(e) => {
                            const value = Array.from(e.target.value)[0] || "";
                            setIcon(value);
                        }}></input>
                    <p className="text-gray-400 text-xs italic mt-1">Custom icon feature will be available soon. For now, please use a single character as icon.</p>
                </div>
                {/* add button */}
                <div className="flex items-center justify-end">
                    <button className="text-gray-400 font-bold py-2 px-4 rounded-lg bg-transparent mr-2" type="button" onClick={cancelCallback}>
                        Cancel
                    </button>
                    <button className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg" type="button"
                        onClick={() => {
                            if (type === InputHandlerTypes.Generation) {
                                inputHandlerAdded(new CommonGenerationHandler(instruction, tooltip, icon));
                            } else {
                                inputHandlerAdded(new CommonRevisionHandler(instruction, tooltip, icon));
                            }
                        }}>
                        Add
                    </button>
                </div>
            </div>
        </>
    );
}
