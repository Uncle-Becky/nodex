import type {
  LLMConfig,
  LLMError,
  LLMExecutionContext,
  LLMMetrics,
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMTask,
  RateLimitConfig,
  UsageTracker,
} from '../types/llm';
import { apiKeyManager } from './ApiKeyManager';

interface ProviderAdapter {
  makeRequest(config: LLMConfig, request: LLMRequest): Promise<LLMResponse>;
  makeStreamRequest(
    config: LLMConfig,
    request: LLMRequest
  ): AsyncGenerator<LLMStreamChunk>;
  validateConfig(config: LLMConfig): boolean;
  getDefaultModel(): string;
  getCostPerToken(): { input: number; output: number };
}

class OpenAIAdapter implements ProviderAdapter {
  async makeRequest(
    config: LLMConfig,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        functions: request.functions,
        function_call: request.function_call,
        max_tokens: request.maxTokens ?? config.maxTokens,
        temperature: request.temperature ?? config.temperature ?? 0.7,
        top_p: request.topP ?? config.topP,
        frequency_penalty: request.frequencyPenalty ?? config.frequencyPenalty,
        presence_penalty: request.presencePenalty ?? config.presencePenalty,
        stop: request.stop,
        user: request.user,
      }),
    });

    if (!response.ok) {
      const error: LLMError = await response.json();
      throw new Error(error.error.message);
    }

    return response.json();
  }

  async *makeStreamRequest(
    config: LLMConfig,
    request: LLMRequest
  ): AsyncGenerator<LLMStreamChunk> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        model: config.model,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error: LLMError = await response.json();
      throw new Error(error.error.message);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const chunk: LLMStreamChunk = JSON.parse(data);
              yield chunk;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  validateConfig(config: LLMConfig): boolean {
    return !!(config.apiKey && config.model);
  }

  getDefaultModel(): string {
    return 'gpt-4o-mini';
  }

  getCostPerToken(): { input: number; output: number } {
    return { input: 0.00015, output: 0.0006 }; // GPT-4o-mini pricing
  }
}

class ClaudeAdapter implements ProviderAdapter {
  async makeRequest(
    config: LLMConfig,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages.filter(m => m.role !== 'system'),
        system: request.messages.find(m => m.role === 'system')?.content,
        max_tokens: request.maxTokens ?? config.maxTokens ?? 4096,
        temperature: request.temperature ?? config.temperature ?? 0.7,
        top_p: request.topP ?? config.topP,
        stop_sequences: request.stop,
      }),
    });

    if (!response.ok) {
      const error: LLMError = await response.json();
      throw new Error(error.error.message);
    }

    const claudeResponse = await response.json();

    // Convert Claude response to OpenAI format
    return {
      id: claudeResponse.id,
      object: 'chat.completion',
      created: Date.now() / 1000,
      model: config.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: claudeResponse.content[0]?.text ?? '',
          },
          finish_reason: claudeResponse.stop_reason,
        },
      ],
      usage: {
        prompt_tokens: claudeResponse.usage.input_tokens,
        completion_tokens: claudeResponse.usage.output_tokens,
        total_tokens:
          claudeResponse.usage.input_tokens +
          claudeResponse.usage.output_tokens,
      },
    };
  }

  async *makeStreamRequest(
    _config: LLMConfig,
    _request: LLMRequest
  ): AsyncGenerator<LLMStreamChunk> {
    // Claude streaming implementation would go here
    yield* []; // Empty generator to satisfy linter
    throw new Error('Claude streaming not implemented yet');
  }

  validateConfig(config: LLMConfig): boolean {
    return !!(config.apiKey && config.model);
  }

  getDefaultModel(): string {
    return 'claude-3-5-haiku-20241022';
  }

  getCostPerToken(): { input: number; output: number } {
    return { input: 0.00025, output: 0.00125 }; // Claude 3.5 Haiku pricing
  }
}

class GeminiAdapter implements ProviderAdapter {
  async makeRequest(
    config: LLMConfig,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: request.messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          })),
          generationConfig: {
            maxOutputTokens: request.maxTokens ?? config.maxTokens,
            temperature: request.temperature ?? config.temperature ?? 0.7,
            topP: request.topP ?? config.topP,
          },
        }),
      }
    );

    if (!response.ok) {
      const error: LLMError = await response.json();
      throw new Error(error.error.message);
    }

    const geminiResponse = await response.json();

    // Convert Gemini response to OpenAI format
    return {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now() / 1000,
      model: config.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              geminiResponse.candidates[0]?.content?.parts[0]?.text ?? '',
          },
          finish_reason:
            geminiResponse.candidates[0]?.finishReason?.toLowerCase() ?? 'stop',
        },
      ],
      usage: {
        prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount ?? 0,
        completion_tokens:
          geminiResponse.usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens: geminiResponse.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }

  async *makeStreamRequest(
    config: LLMConfig,
    request: LLMRequest
  ): AsyncGenerator<LLMStreamChunk> {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          contents: request.messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          })),
          generationConfig: {
            maxOutputTokens: request.maxTokens ?? config.maxTokens,
            temperature: request.temperature ?? config.temperature ?? 0.7,
            topP: request.topP ?? config.topP,
          },
        }),
      }
    );

    if (!response.ok) {
      const error: LLMError = await response.json();
      throw new Error(error.error.message);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              yield {
                id: `gemini-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Date.now() / 1000,
                model: config.model ?? this.getDefaultModel(),
                choices: [
                  {
                    index: 0,
                    delta: {
                      content: data.candidates[0].content.parts[0].text,
                    },
                  },
                ],
              };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private checkRateLimits(provider: LLMProvider, tokens: number): boolean {
    const limits = this.getRateLimits(provider);
    if (!limits) return true;

    const usage = this.getUsage(provider);
    if (!usage) return true;

    const now = Date.now();
    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const minuteRequests = usage.requests.filter(
      (r: { timestamp: number }) => r.timestamp > minuteAgo
    );
    const hourRequests = usage.requests.filter(
      (r: { timestamp: number }) => r.timestamp > hourAgo
    );
    const dayRequests = usage.requests.filter(
      (r: { timestamp: number }) => r.timestamp > dayAgo
    );

    const minuteTokens = minuteRequests.reduce(
      (sum: number, r: { tokens: number }) => sum + r.tokens,
      0
    );
    const hourTokens = hourRequests.reduce(
      (sum: number, r: { tokens: number }) => sum + r.tokens,
      0
    );
    const dayTokens = dayRequests.reduce(
      (sum: number, r: { tokens: number }) => sum + r.tokens,
      0
    );

    const canRequest =
      minuteRequests.length < limits.requestsPerMinute &&
      hourRequests.length < limits.requestsPerHour &&
      dayRequests.length < limits.tokensPerDay.length &&
      minuteTokens + tokens < limits.tokensPerMinute.length &&
      hourTokens + tokens < limits.tokensPerHour.length &&
      dayTokens + tokens < limits.tokensPerDay.length;

    if (!canRequest) {
      const metrics = llmService.getMetrics(provider) as LLMMetrics;
      if (metrics) {
        metrics.rateLimitHits++;
      }
    }

    return canRequest;
  }

  public recordUsage(provider: LLMProvider, tokens: number): void {
    const usage = this.getUsage(provider);
    if (usage) {
      usage.requests.push({ timestamp: Date.now(), tokens });
    }
  }

  public getRateLimits(provider: LLMProvider): RateLimitConfig | undefined {
    const limits = this.getRateLimits(provider);
    if (limits) {
      this.recordUsage(provider, 0); // Record the request even if no tokens used
    }
    return limits;
  }

  public getUsage(provider: LLMProvider): UsageTracker | undefined {
    const usage = this.getUsage(provider);
    if (usage) {
      this.recordUsage(provider, 0); // Record the request even if no tokens used
    }
    return usage;
  }

  public getAllProviders(): LLMProvider[] {
    return llmService.getAvailableProviders() as LLMProvider[];
  }

  validateConfig(config: LLMConfig): boolean {
    return !!(config.apiKey && config.model);
  }

  getDefaultModel(): string {
    return 'gemini-1.5-flash';
  }

  getCostPerToken(): { input: number; output: number } {
    return { input: 0.000075, output: 0.0003 }; // Gemini 1.5 Flash pricing
  }
}

class PerplexityAdapter implements ProviderAdapter {
  async makeRequest(
    config: LLMConfig,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? config.maxTokens,
        temperature: request.temperature ?? config.temperature ?? 0.7,
        top_p: request.topP ?? config.topP,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error: LLMError = await response.json();
      throw new Error(error.error.message);
    }

    return response.json();
  }

  async *makeStreamRequest(
    _config: LLMConfig,
    _request: LLMRequest
  ): AsyncGenerator<LLMStreamChunk> {
    // Perplexity streaming implementation would go here
    yield* []; // Empty generator to satisfy linter
    throw new Error('Perplexity streaming not implemented yet');
  }

  validateConfig(config: LLMConfig): boolean {
    return !!(config.apiKey && config.model);
  }

  getDefaultModel(): string {
    return 'llama-3.1-sonar-small-128k-online';
  }

  getCostPerToken(): { input: number; output: number } {
    return { input: 0.0002, output: 0.0002 }; // Perplexity pricing
  }
}

class LLMService {
  private adapters: Map<LLMProvider, ProviderAdapter> = new Map();
  private taskQueue: LLMTask[] = [];
  private runningTasks: Map<string, LLMTask> = new Map();
  private metrics: Map<LLMProvider, LLMMetrics> = new Map();
  private maxConcurrentTasks = 5;
  private getRateLimits: (
    provider: LLMProvider
  ) => RateLimitConfig | undefined = () => undefined;
  private getUsage: (provider: LLMProvider) => UsageTracker | undefined = () =>
    undefined;

  constructor() {
    this.adapters.set('openai', new OpenAIAdapter());
    this.adapters.set('claude', new ClaudeAdapter());
    this.adapters.set('gemini', new GeminiAdapter());
    this.adapters.set('perplexity', new PerplexityAdapter());

    this.initializeMetrics();
    this.startTaskProcessor();
  }

  private initializeMetrics(): void {
    const providers: LLMProvider[] = [
      'openai',
      'claude',
      'gemini',
      'perplexity',
    ];
    providers.forEach(provider => {
      this.metrics.set(provider, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        tokensUsed: 0,
        costEstimate: 0,
        rateLimitHits: 0,
        lastActivity: 0,
      });
    });
  }

  private startTaskProcessor(): void {
    setInterval(() => {
      this.processTaskQueue();
    }, 100);
  }

  private async processTaskQueue(): Promise<void> {
    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      return;
    }

    const task = this.taskQueue.find(t => t.status === 'pending');
    if (!task) return;

    task.status = 'running';
    this.runningTasks.set(task.id, task);

    try {
      const result = await this.executeTask(task);
      task.result = result;
      task.status = 'completed';
      this.updateMetrics(task.context.nodeId, true, result.usage.total_tokens);
    } catch (error) {
      task.error = error as LLMError;
      task.status = 'failed';
      this.updateMetrics(task.context.nodeId, false, 0);
    } finally {
      this.runningTasks.delete(task.id);
      task.metadata.updatedAt = Date.now();
    }
  }

  private async executeTask(task: LLMTask): Promise<LLMResponse> {
    const provider = this.selectBestProvider(task);
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new Error(`No adapter found for provider: ${provider}`);
    }

    const apiKey = apiKeyManager.getApiKey(provider);
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${provider}`);
    }

    if (!apiKeyManager.checkRateLimit(provider)) {
      throw new Error(`Rate limit exceeded for provider: ${provider}`);
    }

    const config: LLMConfig = {
      provider,
      model: adapter.getDefaultModel(),
      apiKey,
      maxTokens: task.context.constraints.maxTokens,
    };

    const startTime = Date.now();
    const result = await adapter.makeRequest(config, task.input);
    const endTime = Date.now();

    // Record usage
    apiKeyManager.recordUsage(provider, result.usage.total_tokens);

    // Update metrics
    const metrics = this.metrics.get(provider);
    if (metrics) {
      metrics.totalRequests++;
      metrics.successfulRequests++;
      metrics.averageLatency =
        (metrics.averageLatency + (endTime - startTime)) / 2;
      metrics.tokensUsed += result.usage.total_tokens;
      metrics.costEstimate += this.calculateCost(provider, result.usage);
      metrics.lastActivity = Date.now();
    }

    return result;
  }

  private selectBestProvider(_task: LLMTask): LLMProvider {
    // Simple provider selection logic - can be enhanced
    const providersWithKeys = apiKeyManager
      .getAllProviders()
      .filter(provider => apiKeyManager.hasValidKey(provider));

    if (providersWithKeys.length === 0) {
      throw new Error(
        'No API keys configured. Please add API keys in the settings.'
      );
    }

    const availableProviders = providersWithKeys.filter(provider =>
      apiKeyManager.checkRateLimit(provider)
    );

    if (availableProviders.length === 0) {
      // If all providers are rate limited, use the first one with a key
      // The rate limit check will handle the error
      return providersWithKeys[0] as LLMProvider;
    }

    // For now, prefer OpenAI, then Claude, then others
    const preferenceOrder: LLMProvider[] = [
      'openai',
      'claude',
      'gemini',
      'perplexity',
    ];

    for (const preferred of preferenceOrder) {
      if (availableProviders.includes(preferred)) {
        return preferred;
      }
    }

    return availableProviders[0] as LLMProvider;
  }

  private calculateCost(
    provider: LLMProvider,
    usage: { prompt_tokens: number; completion_tokens: number }
  ): number {
    const adapter = this.adapters.get(provider);
    if (!adapter) return 0;

    const costs = adapter.getCostPerToken();
    return (
      usage.prompt_tokens * costs.input + usage.completion_tokens * costs.output
    );
  }

  private updateMetrics(
    _nodeId: string,
    _success: boolean,
    _tokens: number
  ): void {
    // Update node-specific metrics if needed
  }

  public async makeRequest(
    provider: LLMProvider,
    request: LLMRequest,
    context: Partial<LLMExecutionContext> = {}
  ): Promise<LLMResponse> {
    console.log('LLMService: makeRequest called with provider:', provider);
    console.log(
      'LLMService: Available providers:',
      this.getAvailableProviders()
    );
    const task: LLMTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'completion',
      priority: 'medium',
      input: request,
      context: {
        nodeId: context.nodeId ?? 'unknown',
        sessionId: context.sessionId ?? 'default',
        capabilities: context.capabilities ?? [],
        memory: context.memory ?? {},
        tools: context.tools ?? [],
        constraints: {
          maxTokens: 4096,
          timeout: 30000,
          rateLimits: {},
          ...context.constraints,
        },
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attempts: 0,
        maxAttempts: 3,
      },
      status: 'pending',
    };

    this.taskQueue.push(task);

    // Wait for task completion
    return new Promise((resolve, reject) => {
      const checkTask = () => {
        if (task.status === 'completed' && task.result) {
          resolve(task.result);
        } else if (task.status === 'failed' && task.error) {
          reject(new Error(task.error.error.message));
        } else {
          setTimeout(checkTask, 100);
        }
      };
      checkTask();
    });
  }

  public async *makeStreamRequest(
    provider: LLMProvider,
    request: LLMRequest,
    context: Partial<LLMExecutionContext> = {}
  ): AsyncGenerator<LLMStreamChunk> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter found for provider: ${provider}`);
    }

    const apiKey = apiKeyManager.getApiKey(provider);
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${provider}`);
    }

    const config: LLMConfig = {
      provider,
      model: adapter.getDefaultModel(),
      apiKey,
      maxTokens: context.constraints?.maxTokens ?? 4096,
    };

    yield* adapter.makeStreamRequest(config, request);
  }

  public getMetrics(
    provider?: LLMProvider
  ): LLMMetrics | Map<LLMProvider, LLMMetrics> {
    if (provider) {
      return this.metrics.get(provider) ?? this.createEmptyMetrics();
    }
    return this.metrics;
  }

  private createEmptyMetrics(): LLMMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      tokensUsed: 0,
      costEstimate: 0,
      rateLimitHits: 0,
      lastActivity: 0,
    };
  }

  public getAvailableProviders(): LLMProvider[] {
    return Array.from(this.adapters.keys()).filter(provider =>
      apiKeyManager.hasValidKey(provider)
    );
  }

  public getTaskQueue(): LLMTask[] {
    return [...this.taskQueue];
  }

  public cancelTask(taskId: string): boolean {
    const taskIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = this.taskQueue[taskIndex];
      if (task) {
        task.status = 'cancelled';
      }
      return true;
    }
    return false;
  }
}

export const llmService = new LLMService();
