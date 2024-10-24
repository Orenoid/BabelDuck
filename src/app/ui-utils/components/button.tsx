
export function FilledButton({ children, onClick, className = "" }: { children: React.ReactNode, onClick: () => void, className?: string }) {
    return <button className={`bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg ${className}`} type="button" onClick={onClick}>
        {children}
    </button>
}

{/* <button className="text-gray-400 font-bold py-2 px-4 rounded-lg bg-transparent mr-2" type="button" onClick={cancelCallback}>
                        Cancel
                    </button> */}

export function TransparentButton({ children, onClick, className = "" }: { children: React.ReactNode, onClick: () => void, className?: string }) {
    return <button className={`text-gray-400 font-bold py-2 px-4 rounded-lg bg-transparent ${className}`} type="button" onClick={onClick}>
        {children}
    </button>
}