// Speech synthesis settings persistence
export function saveTTSServiceID(serviceId: string) {
    localStorage.setItem('selectedSpeechServiceId', serviceId);
}

export function loadTTSServiceID(): string | null {
    return localStorage.getItem('selectedSpeechServiceId');
}

export function saveTTSSettings(serviceId: string, settings: object) {
    localStorage.setItem(`speechSettings-${serviceId}`, JSON.stringify(settings));
}

export function loadTTSSettings(serviceId: string): object | null {
    const saved = localStorage.getItem(`speechSettings-${serviceId}`);
    return saved ? JSON.parse(saved) : null;
}

// Speech recognition settings persistence
export function saveSTTServiceID(serviceId: string) {
    localStorage.setItem('selectedSTTSvcID', serviceId);
}

export function loadSTTServiceID(): string | null {
    return localStorage.getItem('selectedSTTSvcID');
}

export function saveSTTSettings(serviceId: string, settings: object) {
    localStorage.setItem(`sttSettings-${serviceId}`, JSON.stringify(settings));
}

export function loadSTTSettings(serviceId: string): object | null {
    const saved = localStorage.getItem(`sttSettings-${serviceId}`);
    return saved ? JSON.parse(saved) : null;
}
