import type { LLMProvider } from '../types/llm';

interface ApiKeyConfig {
  provider: LLMProvider;
  key: string;
  encrypted: boolean;
  createdAt: number;
  lastUsed?: number;
  usageCount: number;
  isValid: boolean;
}

interface RateLimitConfig {
  provider: LLMProvider;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerHour: number;
  tokensPerDay: number;
}

interface UsageTracker {
  provider: LLMProvider;
  requests: Array<{ timestamp: number; tokens: number }>;
  dailyUsage: number;
  hourlyUsage: number;
  minuteUsage: number;
  lastReset: number;
}

class ApiKeyManager {
  private keys: Map<LLMProvider, ApiKeyConfig> = new Map();
  private rateLimits: Map<LLMProvider, RateLimitConfig> = new Map();
  private usage: Map<LLMProvider, UsageTracker> = new Map();
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = this.generateEncryptionKey();
    this.initializeRateLimits();
    this.loadKeysFromStorage();
  }

  private generateEncryptionKey(): string {
    // In production, this should be derived from a secure source
    return btoa(crypto.getRandomValues(new Uint8Array(32)).toString());
  }

  private initializeRateLimits(): void {
    const defaultLimits: Record<LLMProvider, RateLimitConfig> = {
      openai: {
        provider: 'openai',
        requestsPerMinute: 60,
        requestsPerHour: 3600,
        requestsPerDay: 10000,
        tokensPerMinute: 90000,
        tokensPerHour: 1000000,
        tokensPerDay: 10000000,
      },
      claude: {
        provider: 'claude',
        requestsPerMinute: 50,
        requestsPerHour: 1000,
        requestsPerDay: 5000,
        tokensPerMinute: 40000,
        tokensPerHour: 400000,
        tokensPerDay: 1000000,
      },
      gemini: {
        provider: 'gemini',
        requestsPerMinute: 60,
        requestsPerHour: 1500,
        requestsPerDay: 15000,
        tokensPerMinute: 32000,
        tokensPerHour: 1000000,
        tokensPerDay: 50000000,
      },
      perplexity: {
        provider: 'perplexity',
        requestsPerMinute: 20,
        requestsPerHour: 500,
        requestsPerDay: 5000,
        tokensPerMinute: 10000,
        tokensPerHour: 200000,
        tokensPerDay: 1000000,
      },
    };

    Object.values(defaultLimits).forEach(limit => {
      this.rateLimits.set(limit.provider, limit);
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

  private encrypt(text: string): string {
    // Simple XOR encryption for demo - use proper encryption in production
    return btoa(
      text
        .split('')
        .map((char, i) =>
          String.fromCharCode(
            char.charCodeAt(0) ^
              this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
          )
        )
        .join('')
    );
  }

  private decrypt(encryptedText: string): string {
    try {
      const decoded = atob(encryptedText);
      return decoded
        .split('')
        .map((char, i) =>
          String.fromCharCode(
            char.charCodeAt(0) ^
              this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
          )
        )
        .join('');
    } catch {
      return '';
    }
  }

  public setApiKey(provider: LLMProvider, key: string): void {
    const encryptedKey = this.encrypt(key);
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
      provider,
      requests: [],
      dailyUsage: 0,
      hourlyUsage: 0,
      minuteUsage: 0,
      lastReset: Date.now(),
    });
  }

  public getApiKey(provider: LLMProvider): string | null {
    const config = this.keys.get(provider);
    if (!config?.isValid) {
      return null;
    }

    return config.encrypted ? this.decrypt(config.key) : config.key;
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

export const apiKeyManager = new ApiKeyManager();
