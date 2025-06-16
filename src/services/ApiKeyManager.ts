import type { LLMProvider, UsageTracker } from '../types/llm';

interface ApiKeyConfig {
  provider: LLMProvider;
  key: string;
  encrypted: boolean;
  createdAt: number;
  lastUsed?: number;
  usageCount: number;
  isValid: boolean;
}

interface ApiRateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerHour: number;
  tokensPerDay: number;
}

class ApiKeyManager {
  private static instance: ApiKeyManager | null = null;
  private keys: Map<LLMProvider, ApiKeyConfig> = new Map();
  private rateLimits: Map<LLMProvider, ApiRateLimitConfig> = new Map();
  private usage: Map<LLMProvider, UsageTracker> = new Map();
  private encryptionKey!: CryptoKey; // Definite assignment assertion
  private isInitialized = false;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): ApiKeyManager {
    ApiKeyManager.instance ??= new ApiKeyManager();
    return ApiKeyManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('ApiKeyManager: Already initialized');
      return;
    }

    try {
      await this.initEncryptionKey();
      this.initializeRateLimits();
      await this.loadKeysFromStorage();
      this.isInitialized = true;
      console.log('ApiKeyManager: Initialized successfully');
    } catch (error) {
      console.error('ApiKeyManager: Initialization failed:', error);
      throw error;
    }
  }

  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  private async initEncryptionKey(): Promise<void> {
    const storedKey = localStorage.getItem('aesEncryptionKey');
    if (storedKey) {
      try {
        const jwk = JSON.parse(storedKey);
        this.encryptionKey = await crypto.subtle.importKey(
          'jwk',
          jwk,
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt']
        );
      } catch (error) {
        console.error(
          'Failed to import stored AES key, generating a new one:',
          error
        );
        // Fallback to generating a new key if import fails
        await this.generateAndStoreEncryptionKey();
      }
    } else {
      await this.generateAndStoreEncryptionKey();
    }
  }

  private async generateAndStoreEncryptionKey(): Promise<void> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // exportable
      ['encrypt', 'decrypt']
    );
    const jwk = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem('aesEncryptionKey', JSON.stringify(jwk));
    this.encryptionKey = key;
  }

  private initializeRateLimits(): void {
    const defaultLimits: Record<LLMProvider, ApiRateLimitConfig> = {
      openai: {
        // GPT-4 Turbo: 500 RPM, 200K TPM
        // GPT-3.5 Turbo: 3,500 RPM, 90K TPM
        // Using conservative limits for mixed usage
        requestsPerMinute: 500,
        requestsPerHour: 15000,
        requestsPerDay: 200000,
        tokensPerMinute: 90000,
        tokensPerHour: 2000000,
        tokensPerDay: 20000000,
      },
      claude: {
        // Claude 3 Opus: 100 RPM, 100K TPM
        // Claude 3 Sonnet: 200 RPM, 100K TPM
        // Claude 3 Haiku: 500 RPM, 100K TPM
        // Using conservative limits for mixed usage
        requestsPerMinute: 100,
        requestsPerHour: 5000,
        requestsPerDay: 100000,
        tokensPerMinute: 100000,
        tokensPerHour: 2000000,
        tokensPerDay: 20000000,
      },
      gemini: {
        // Gemini Pro: 60 RPM, 32K TPM
        // Gemini Ultra: 60 RPM, 32K TPM
        // Using documented limits
        requestsPerMinute: 60,
        requestsPerHour: 1500,
        requestsPerDay: 15000,
        tokensPerMinute: 32000,
        tokensPerHour: 1000000,
        tokensPerDay: 50000000,
      },
      perplexity: {
        // Perplexity API: 20 RPM, 10K TPM
        // Using documented limits
        requestsPerMinute: 20,
        requestsPerHour: 500,
        requestsPerDay: 5000,
        tokensPerMinute: 10000,
        tokensPerHour: 200000,
        tokensPerDay: 1000000,
      },
    };

    // Add comments explaining the limits
    console.log(
      'ApiKeyManager: Initializing rate limits with the following configurations:'
    );
    Object.entries(defaultLimits).forEach(([provider, limits]) => {
      console.log(`${provider.toUpperCase()} Rate Limits:
        - Requests: ${limits.requestsPerMinute}/min, ${limits.requestsPerHour}/hour, ${limits.requestsPerDay}/day
        - Tokens: ${limits.tokensPerMinute}/min, ${limits.tokensPerHour}/hour, ${limits.tokensPerDay}/day
      `);
      this.rateLimits.set(provider as LLMProvider, limits);
    });
  }

  private loadKeysFromStorage(): void {
    try {
      const stored = localStorage.getItem('llm_api_keys');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([provider, config]) => {
          this.keys.set(provider as LLMProvider, config as ApiKeyConfig);
        });
      }
    } catch (error) {
      console.warn('Failed to load API keys from storage:', error);
    }
  }

  private saveKeysToStorage(): void {
    try {
      const keysObject = Object.fromEntries(this.keys);
      localStorage.setItem('llm_api_keys', JSON.stringify(keysObject));
    } catch (error) {
      console.warn('Failed to save API keys to storage:', error);
    }
  }

  private async encrypt(text: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key is not initialized.');
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encodedText
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert ArrayBuffer to string of chars, then to base64
    let binary = '';
    const bytes = combined; // combined is already Uint8Array
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  private async decrypt(encryptedTextBase64: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key is not initialized.');
    }
    // Convert base64 to string of chars, then to Uint8Array
    const binary_string = atob(encryptedTextBase64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        ciphertext
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      // It's important to handle decryption errors, as they can indicate tampering
      // or a wrong key. Returning an empty string or a specific error indicator might be needed.
      return ''; // Or throw error, or return a more specific error object
    }
  }

  public async setApiKey(provider: LLMProvider, key: string): Promise<void> {
    const encryptedKey = await this.encrypt(key);
    const config: ApiKeyConfig = {
      provider,
      key: encryptedKey,
      encrypted: true,
      createdAt: Date.now(),
      usageCount: 0,
      isValid: true,
    };

    this.keys.set(provider, config);
    this.saveKeysToStorage();

    // Initialize usage tracker
    this.usage.set(provider, {
      requests: [],
    });
  }

  public async getApiKey(provider: LLMProvider): Promise<string | null> {
    const config = this.keys.get(provider);
    if (!config?.isValid) {
      return null;
    }

    if (!this.encryptionKey && config.encrypted) {
      // Key might not be initialized yet if initEncryptionKey() is still running or failed.
      // Handle this by perhaps waiting for the key or returning an error/specific status.
      // For now, log an error and return null if decryption is needed but key is unavailable.
      console.error('Encryption key not available for decrypting API key.');
      return null;
    }

    return config.encrypted ? await this.decrypt(config.key) : config.key;
  }

  public hasValidKey(provider: LLMProvider): boolean {
    const config = this.keys.get(provider);
    const hasValid = config?.isValid === true;
    console.log(
      `ApiKeyManager: hasValidKey(${provider}) = ${hasValid}`,
      config
    );
    return hasValid;
  }

  public removeApiKey(provider: LLMProvider): void {
    this.keys.delete(provider);
    this.usage.delete(provider);
    this.saveKeysToStorage();
  }

  public validateApiKey(provider: LLMProvider): Promise<boolean> {
    return new Promise(resolve => {
      // Simulate API key validation
      setTimeout(() => {
        const config = this.keys.get(provider);
        if (config) {
          config.isValid = true;
          config.lastUsed = Date.now();
          this.saveKeysToStorage();
        }
        resolve(true);
      }, 1000);
    });
  }

  public checkRateLimit(provider: LLMProvider, tokens: number = 0): boolean {
    const limits = this.rateLimits.get(provider);
    const usage = this.usage.get(provider);

    if (!limits || !usage) {
      return false;
    }

    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * oneMinute;
    const oneDay = 24 * oneHour;

    // Clean old requests
    usage.requests = usage.requests.filter(req => now - req.timestamp < oneDay);

    // Count recent requests
    const minuteRequests = usage.requests.filter(
      req => now - req.timestamp < oneMinute
    );
    const hourRequests = usage.requests.filter(
      req => now - req.timestamp < oneHour
    );
    const dayRequests = usage.requests;

    const minuteTokens = minuteRequests.reduce(
      (sum, req) => sum + req.tokens,
      0
    );
    const hourTokens = hourRequests.reduce((sum, req) => sum + req.tokens, 0);
    const dayTokens = dayRequests.reduce((sum, req) => sum + req.tokens, 0);

    // Check limits
    if (minuteRequests.length >= limits.requestsPerMinute) return false;
    if (hourRequests.length >= limits.requestsPerHour) return false;
    if (dayRequests.length >= limits.requestsPerDay) return false;
    if (minuteTokens + tokens > limits.tokensPerMinute) return false;
    if (hourTokens + tokens > limits.tokensPerHour) return false;
    if (dayTokens + tokens > limits.tokensPerDay) return false;

    return true;
  }

  public recordUsage(provider: LLMProvider, tokens: number): void {
    const usage = this.usage.get(provider);
    const config = this.keys.get(provider);

    if (usage && config) {
      usage.requests.push({ timestamp: Date.now(), tokens });
      config.usageCount++;
      config.lastUsed = Date.now();
      this.saveKeysToStorage();
    }
  }

  public getUsageStats(provider: LLMProvider): UsageTracker | null {
    return this.usage.get(provider) ?? null;
  }

  public getAllProviders(): LLMProvider[] {
    return Array.from(this.keys.keys());
  }

  public getRateLimitsForProvider(
    provider: LLMProvider
  ): ApiRateLimitConfig | null {
    return this.rateLimits.get(provider) ?? null;
  }

  public getProviderStatus(provider: LLMProvider): {
    hasKey: boolean;
    isValid: boolean;
    lastUsed?: number;
    usageCount: number;
    rateLimitStatus: {
      canMakeRequest: boolean;
      minuteUsage: number;
      hourUsage: number;
      dayUsage: number;
    };
  } {
    const config = this.keys.get(provider);
    const usage = this.usage.get(provider);
    const limits = this.rateLimits.get(provider);

    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * oneMinute;
    const oneDay = 24 * oneHour;

    let rateLimitStatus = {
      canMakeRequest: false,
      minuteUsage: 0,
      hourUsage: 0,
      dayUsage: 0,
    };

    if (usage && limits) {
      const minuteRequests = usage.requests.filter(
        req => now - req.timestamp < oneMinute
      );
      const hourRequests = usage.requests.filter(
        req => now - req.timestamp < oneHour
      );
      const dayRequests = usage.requests.filter(
        req => now - req.timestamp < oneDay
      );

      rateLimitStatus = {
        canMakeRequest: this.checkRateLimit(provider),
        minuteUsage: minuteRequests.length,
        hourUsage: hourRequests.length,
        dayUsage: dayRequests.length,
      };
    }

    return {
      hasKey: !!config,
      isValid: config?.isValid ?? false,
      lastUsed: config?.lastUsed,
      usageCount: config?.usageCount ?? 0,
      rateLimitStatus,
    };
  }
}

// Export the singleton instance
export const apiKeyManager = ApiKeyManager.getInstance();
