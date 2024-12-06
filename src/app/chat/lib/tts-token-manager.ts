interface TokenInfo {
  token: string;
  expiresAt: number;
}

export class TTSTokenManager {
  private static instance: TTSTokenManager;
  private tokenInfo: TokenInfo | null = null;
  private readonly TOKEN_EXPIRY_MINUTES = 9; // 设为9分钟，留出1分钟的安全边界

  private constructor() {}

  public static getInstance(): TTSTokenManager {
    if (!TTSTokenManager.instance) {
      TTSTokenManager.instance = new TTSTokenManager();
    }
    return TTSTokenManager.instance;
  }

  public async getToken(): Promise<string> {
    // 检查是否有未过期的token
    if (this.tokenInfo && Date.now() < this.tokenInfo.expiresAt) {
      return this.tokenInfo.token;
    }

    // 获取新token
    const response = await fetch('/api/tts', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch TTS token');
    }

    const { token } = await response.json();
    
    // 保存token和过期时间
    this.tokenInfo = {
      token,
      expiresAt: Date.now() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000
    };

    return token;
  }
} 