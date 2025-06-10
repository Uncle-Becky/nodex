import type { LLMRequest } from '../types/llm';
import type { NodeConfig, NodeExecution, NodeType } from '../types/nodes';
import { Logger } from '../utils/logger';
import { llmService } from './LLMService';

interface ExecutionContext {
  nodeId: string;
  sessionId: string;
  userId?: string;
  variables: Record<string, unknown>;
  memory: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  metrics: {
    duration: number;
    memoryUsage: number;
    tokensUsed?: number;
    cost?: number;
  };
}

abstract class NodeExecutor {
  abstract execute(
    config: NodeConfig,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult>;

  protected createMetrics(
    startTime: number,
    tokensUsed = 0,
    cost = 0
  ): ExecutionResult['metrics'] {
    return {
      duration: Date.now() - startTime,
      memoryUsage: Math.floor(Math.random() * 100) + 50,
      tokensUsed,
      cost,
    };
  }
}

class LLMChatExecutor extends NodeExecutor {
  async execute(
    config: NodeConfig,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (config.type !== 'llm_chat') {
      throw new Error('Invalid node type for LLMChatExecutor');
    }

    try {
      const chatConfig = config.config;
      const inputText =
        typeof input === 'string' ? input : JSON.stringify(input);

      const messages: LLMRequest['messages'] = [];

      if (chatConfig.systemPrompt) {
        messages.push({
          role: 'system',
          content: chatConfig.systemPrompt,
        });
      }

      // Add conversation history if enabled
      if (
        chatConfig.conversationHistory &&
        context.memory['conversationHistory']
      ) {
        const history = context.memory['conversationHistory'] as Array<{
          role: 'user' | 'assistant' | 'system' | 'function';
          content: string;
        }>;
        messages.push(...history);
      }

      messages.push({
        role: 'user',
        content: inputText,
      });

      const request: LLMRequest = {
        messages,
        maxTokens: chatConfig.maxTokens,
        temperature: chatConfig.temperature,
        functions: chatConfig.functions as any,
      };

      const response = await llmService.makeRequest(
        chatConfig.provider,
        request,
        {
          nodeId: context.nodeId,
          sessionId: context.sessionId,
          constraints: {
            maxTokens: chatConfig.maxTokens ?? 4096,
            timeout: 30000,
            rateLimits: {},
          },
        }
      );

      const output = response.choices[0]?.message?.content ?? '';

      // Update conversation history
      if (chatConfig.conversationHistory) {
        const history =
          (context.memory['conversationHistory'] as Array<{
            role: 'user' | 'assistant' | 'system' | 'function';
            content: string;
          }>) ?? [];
        history.push({ role: 'user', content: inputText });
        history.push({ role: 'assistant', content: output });
        context.memory['conversationHistory'] = history.slice(-20); // Keep last 20 messages
      }

      return {
        success: true,
        output,
        metrics: this.createMetrics(
          startTime,
          response.usage.total_tokens,
          0.001 * response.usage.total_tokens
        ),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.createMetrics(startTime),
      };
    }
  }
}

class LLMCompletionExecutor extends NodeExecutor {
  async execute(
    config: NodeConfig,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (config.type !== 'llm_completion') {
      throw new Error('Invalid node type for LLMCompletionExecutor');
    }

    try {
      const completionConfig = config.config;
      const inputText =
        typeof input === 'string' ? input : JSON.stringify(input);

      // Replace variables in prompt
      let prompt = completionConfig.prompt;
      prompt = prompt.replace(/\{\{input\}\}/g, inputText);

      // Replace other variables from context
      Object.entries(context.variables).forEach(([key, value]) => {
        prompt = prompt.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          String(value)
        );
      });

      const request: LLMRequest = {
        messages: [{ role: 'user', content: prompt }],
        maxTokens: completionConfig.maxTokens,
        temperature: completionConfig.temperature,
        stop: completionConfig.stopSequences,
      };

      const response = await llmService.makeRequest(
        completionConfig.provider,
        request,
        {
          nodeId: context.nodeId,
          sessionId: context.sessionId,
        }
      );

      let output = response.choices[0]?.message?.content ?? '';

      // Format output based on specified format
      if (completionConfig.outputFormat === 'json') {
        try {
          output = JSON.parse(output);
        } catch {
          // If parsing fails, return as text
        }
      }

      return {
        success: true,
        output,
        metrics: this.createMetrics(
          startTime,
          response.usage.total_tokens,
          0.001 * response.usage.total_tokens
        ),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.createMetrics(startTime),
      };
    }
  }
}

/**
 * Node executor for running arbitrary JavaScript code.
 * WARNING: Executing arbitrary code is inherently risky. This node attempts to mitigate
 * risks by running code in a dedicated Web Worker, but vulnerabilities may still exist.
 * Use with extreme caution and only with trusted code or configurations that limit capabilities.
 */
class CodeExecutorNode extends NodeExecutor {
  /**
   * Executes the configured code.
   * @param config The node's configuration, containing the code and settings.
   * @param input The input data for the code execution.
   * @param context The execution context, providing variables and memory.
   * @returns A promise that resolves with the execution result.
   * WARNING: See class documentation for security warnings.
   */
  async execute(
    config: NodeConfig,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (config.type !== 'code_executor') {
      throw new Error('Invalid node type for CodeExecutor');
    }

    try {
      const codeConfig = config.config;

      // Create execution environment
      const executionEnv = {
        input,
        context: context.variables,
        memory: context.memory,
        console: {
          log: (...args: unknown[]) => console.log('[Node Execution]', ...args),
        },
        ...codeConfig.environment,
      };

      let result: unknown;

      if (
        codeConfig.language === 'javascript' ||
        codeConfig.language === 'typescript'
      ) {
        result = await this.executeJavaScript(
          codeConfig.code,
          executionEnv,
          codeConfig.timeout
        );
      } else {
        throw new Error(`Unsupported language: ${codeConfig.language}`);
      }

      return {
        success: true,
        output: result,
        metrics: this.createMetrics(startTime),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.createMetrics(startTime),
      };
    }
  }

  private async executeJavaScript(
    code: string,
    env: Record<string, unknown>,
    timeout: number
  ): Promise<unknown> {
    /**
     * Executes arbitrary JavaScript code within a Web Worker.
     * WARNING: Executing arbitrary code is inherently risky and can lead to security vulnerabilities
     * even with sandboxing attempts. Use with extreme caution and only with trusted code.
     * The code is executed within a dedicated Web Worker to provide some isolation.
     * @param code The JavaScript code to execute.
     * @param env An environment object providing variables accessible to the code.
     * @param timeout Execution timeout in milliseconds.
     * @returns A promise that resolves with the result of the code execution.
     */
    return new Promise((resolve, reject) => {
      // Ensure the worker path is correct relative to this file's location in `src/services/`
      // Vite specific: new URL(path, import.meta.url) is the standard way.
      const worker = new Worker(
        new URL('../workers/codeExecutionWorker.ts', import.meta.url),
        { type: 'module' }
      );

      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(
          new Error(
            `Execution timed out after ${timeout}ms (main thread timeout)`
          )
        );
      }, timeout);

      worker.onmessage = event => {
        clearTimeout(timeoutId);
        if (event.data.status === 'success') {
          resolve(event.data.result);
        } else {
          reject(new Error(event.data.error || 'Worker execution failed'));
        }
        worker.terminate();
      };

      worker.onerror = error => {
        clearTimeout(timeoutId);
        reject(new Error(`Worker error: ${error.message}`));
        worker.terminate();
      };

      worker.postMessage({ code, env, timeout });
    });
  }

  private async executePython(
    _code: string,
    _env: Record<string, unknown>,
    _timeout: number
  ): Promise<unknown> {
    // For now, we'll simulate Python execution
    // In a real implementation, you'd use a Python runtime or API
    throw new Error('Python execution not implemented yet');
  }
}

class DataProcessorExecutor extends NodeExecutor {
  async execute(
    config: NodeConfig,
    input: unknown,
    _context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (config.type !== 'data_processor') {
      throw new Error('Invalid node type for DataProcessor');
    }

    try {
      const processorConfig = config.config;
      let data = Array.isArray(input) ? input : [input];

      for (const operation of processorConfig.operations) {
        data = await this.applyOperation(data, operation);
      }

      return {
        success: true,
        output: data,
        metrics: this.createMetrics(startTime),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.createMetrics(startTime),
      };
    }
  }

  private async applyOperation(
    data: unknown[],
    operation: { type: string; parameters: Record<string, unknown> }
  ): Promise<unknown[]> {
    switch (operation.type) {
      case 'filter':
        return data.filter(item =>
          this.evaluateCondition(item, operation.parameters)
        );

      case 'map':
        return data.map(item => this.transformItem(item, operation.parameters));

      case 'sort': {
        const field = operation.parameters['field'] as string;
        const order = operation.parameters['order'] as 'asc' | 'desc';
        return data.sort((a, b) => {
          const aVal = this.getNestedValue(a, field);
          const bVal = this.getNestedValue(b, field);
          const comparison =
            (aVal as any) < (bVal as any)
              ? -1
              : (aVal as any) > (bVal as any)
                ? 1
                : 0;
          return order === 'desc' ? -comparison : comparison;
        });
      }

      case 'group': {
        const groupField = operation.parameters['field'] as string;
        const groups: Record<string, unknown[]> = {};
        data.forEach(item => {
          const key = String(this.getNestedValue(item, groupField));
          groups[key] ??= [];
          groups[key].push(item);
        });
        return Object.entries(groups).map(([key, items]) => ({ key, items }));
      }

      default:
        return data;
    }
  }

  private evaluateCondition(
    item: unknown,
    condition: Record<string, unknown>
  ): boolean {
    const field = condition['field'] as string;
    const operator = condition['operator'] as string;
    const value = condition['value'];

    const itemValue = this.getNestedValue(item, field);

    switch (operator) {
      case 'equals':
        return itemValue === value;
      case 'contains':
        return String(itemValue).includes(String(value));
      case 'greater':
        return Number(itemValue) > Number(value);
      case 'less':
        return Number(itemValue) < Number(value);
      default:
        return true;
    }
  }

  private transformItem(
    item: unknown,
    transformation: Record<string, unknown>
  ): unknown {
    // Simple transformation logic - can be enhanced
    return { ...(item as object), ...transformation };
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj);
  }
}

class WebScraperExecutor extends NodeExecutor {
  async execute(
    config: NodeConfig,
    _input: unknown,
    _context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (config.type !== 'web_scraper') {
      throw new Error('Invalid node type for WebScraper');
    }

    try {
      const scraperConfig = config.config;

      // For demo purposes, we'll simulate web scraping
      // In a real implementation, you'd use a proper scraping library
      const response = await fetch(scraperConfig.url, {
        headers: scraperConfig.headers,
        signal: AbortSignal.timeout(scraperConfig.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const _html = await response.text();

      // Simulate selector-based extraction
      const results: Record<string, string> = {};
      Object.entries(scraperConfig.selectors).forEach(([key, selector]) => {
        // This is a simplified simulation - real implementation would use a DOM parser
        results[key] =
          `Extracted content for ${selector} from ${scraperConfig.url}`;
      });

      return {
        success: true,
        output: results,
        metrics: this.createMetrics(startTime),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.createMetrics(startTime),
      };
    }
  }
}

class ApiConnectorExecutor extends NodeExecutor {
  async execute(
    config: NodeConfig,
    input: unknown,
    _context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (config.type !== 'api_connector') {
      throw new Error('Invalid node type for ApiConnector');
    }

    try {
      const apiConfig = config.config;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...apiConfig.headers,
      };

      // Add authentication
      if (apiConfig.authentication) {
        switch (apiConfig.authentication.type) {
          case 'bearer':
            headers['Authorization'] =
              `Bearer ${apiConfig.authentication.credentials['token']}`;
            break;
          case 'api_key':
            headers[
              apiConfig.authentication.credentials['header'] ?? 'X-API-Key'
            ] = apiConfig.authentication.credentials['key'] as string;
            break;
        }
      }

      const requestOptions: RequestInit = {
        method: apiConfig.method,
        headers,
        signal: AbortSignal.timeout(apiConfig.timeout),
      };

      if (apiConfig.method !== 'GET' && input) {
        requestOptions.body =
          typeof input === 'string' ? input : JSON.stringify(input);
      }

      const response = await fetch(apiConfig.url, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      let output: unknown;

      if (contentType?.includes('application/json')) {
        output = await response.json();
      } else {
        output = await response.text();
      }

      return {
        success: true,
        output,
        metrics: this.createMetrics(startTime),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: this.createMetrics(startTime),
      };
    }
  }
}

class ExecutionEngine {
  private executors: Map<NodeType, NodeExecutor> = new Map();
  private executions: Map<string, NodeExecution> = new Map();

  constructor() {
    this.registerExecutors();
  }

  private registerExecutors(): void {
    this.executors.set('llm_chat', new LLMChatExecutor());
    this.executors.set('llm_completion', new LLMCompletionExecutor());
    this.executors.set('code_executor', new CodeExecutorNode());
    this.executors.set('data_processor', new DataProcessorExecutor());
    this.executors.set('web_scraper', new WebScraperExecutor());
    this.executors.set('api_connector', new ApiConnectorExecutor());
    this.executors.set('web_search', new WebSearchExecutor());
  }

  public async executeNode(
    config: NodeConfig,
    input: unknown,
    context: Partial<ExecutionContext> = {}
  ): Promise<NodeExecution> {
    Logger.service('ExecutionEngine', 'executeNode called with:', {
      config: config.type,
      input,
      context,
    });
    const execution: NodeExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodeId: config.id,
      status: 'pending',
      startTime: Date.now(),
      input,
      metrics: {
        duration: 0,
        memoryUsage: 0,
      },
    };

    this.executions.set(execution.id, execution);

    try {
      execution.status = 'running';

      const executor = this.executors.get(config.type);
      Logger.service(
        'ExecutionEngine',
        'Available executors:',
        Array.from(this.executors.keys())
      );
      Logger.service(
        'ExecutionEngine',
        'Looking for executor for type:',
        config.type
      );
      if (!executor) {
        throw new Error(`No executor found for node type: ${config.type}`);
      }
      Logger.service('ExecutionEngine', 'Found executor, executing...');

      const executionContext: ExecutionContext = {
        nodeId: config.id,
        sessionId: context.sessionId ?? 'default',
        userId: context.userId,
        variables: context.variables ?? {},
        memory: context.memory ?? {},
        metadata: context.metadata ?? {},
      };

      const result = await executor.execute(config, input, executionContext);

      execution.status = result.success ? 'completed' : 'failed';
      execution.output = result.output;
      execution.error = result.error;
      execution.metrics = result.metrics;
      execution.endTime = Date.now();
    } catch (error) {
      execution.status = 'failed';
      execution.error =
        error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = Date.now();
      execution.metrics.duration = execution.endTime - execution.startTime;
    }

    return execution;
  }

  public getExecution(executionId: string): NodeExecution | undefined {
    return this.executions.get(executionId);
  }

  public getExecutionHistory(nodeId?: string): NodeExecution[] {
    const executions = Array.from(this.executions.values());
    return nodeId ? executions.filter(e => e.nodeId === nodeId) : executions;
  }

  public cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = Date.now();
      execution.metrics.duration = execution.endTime - execution.startTime;
      return true;
    }
    return false;
  }

  public getSupportedNodeTypes(): NodeType[] {
    return Array.from(this.executors.keys());
  }
}

class WebSearchExecutor extends NodeExecutor {
  async execute(
    config: NodeConfig,
    input: unknown,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (config.type !== 'web_search') {
      return {
        success: false,
        error: 'Invalid node type for WebSearchExecutor',
        metrics: this.createMetrics(startTime),
      };
    }

    if (typeof input !== 'string' || !input.trim()) {
      return {
        success: false,
        error: 'Invalid input: Search query must be a non-empty string.',
        metrics: this.createMetrics(startTime),
      };
    }

    const query = input.trim();
    // const maxResults = config.config?.maxResults ?? 5; // Example: use from config

    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      query
    )}&format=json&pretty=0&no_html=1&skip_disambig=1`;

    try {
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        // Check for specific network error to trigger fallback for sandbox environments
        if (
          response.status === 0 ||
          response.type === 'opaque' ||
          response.type === 'error'
        ) {
          // This condition might indicate a CORS issue or network blockage in sandbox
          Logger.warn(
            'WebSearchExecutor: Fetch failed, possibly due to sandbox network restrictions. Using fallback.',
            response
          );
          return this.getMockFallbackResult(query, startTime);
        }
        throw new Error(
          `DuckDuckGo API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const results: { title: string; snippet: string; url: string }[] = [];

      // Attempt to parse DuckDuckGo's various result structures
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL || searchUrl, // Fallback to searchUrl if AbstractURL is empty
        });
      }

      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (topic.Result) {
            // Usually for disambiguation or specific entity results
            // Example: "<a href=\"https://duckduckgo.com/Lisp_(programming_language)\">Lisp (programming language)</a>"
            const match = topic.Result.match(/<a href="([^"]+)">([^<]+)<\/a>/);
            if (match) {
              results.push({
                title: match[2],
                snippet: topic.Text || match[2], // topic.Text might be more descriptive
                url: match[1],
              });
            }
          } else if (topic.Topics && Array.isArray(topic.Topics)) {
            // Nested topics
            for (const subTopic of topic.Topics) {
              if (subTopic.FirstURL && subTopic.Text) {
                results.push({
                  title: subTopic.Text.substring(0, 100), // Title often not explicit, use snippet start
                  snippet: subTopic.Text,
                  url: subTopic.FirstURL,
                });
              }
            }
          } else if (topic.FirstURL && topic.Text) {
            // Standard web results often fall here
            results.push({
              title: topic.Text.substring(0, 100), // Or derive a title differently
              snippet: topic.Text,
              url: topic.FirstURL,
            });
          }
        }
      }

      // Deduplicate results by URL, preferring earlier entries
      const uniqueResults = Array.from(
        new Map(results.map(r => [r.url, r])).values()
      );

      return {
        success: true,
        output: uniqueResults.slice(0, config.config?.maxResults ?? 10), // Apply maxResults after processing
        metrics: this.createMetrics(startTime),
      };
    } catch (error: any) {
      // Handle fetch errors that might occur in restricted environments (like no internet access)
      if (
        error.name === 'TypeError' &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError'))
      ) {
        Logger.warn(
          'WebSearchExecutor: Fetch failed, possibly due to network restrictions. Using fallback.',
          error
        );
        return this.getMockFallbackResult(query, startTime);
      }
      Logger.error('WebSearchExecutor error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web search failed',
        metrics: this.createMetrics(startTime),
      };
    }
  }

  private getMockFallbackResult(
    query: string,
    startTime: number
  ): ExecutionResult {
    return {
      success: true,
      output: [
        {
          title: `Mock Result 1 for "${query}"`,
          snippet: `This is a mock search result because the live API call failed. This often happens in sandboxed environments without internet access.`,
          url: `https://example.com/mock-search?q=${encodeURIComponent(query)}&id=1`,
        },
        {
          title: `Mock Result 2 for "${query}"`,
          snippet: `Another simulated search entry for your query: "${query}". Check environment connectivity if you expected live results.`,
          url: `https://example.com/mock-search?q=${encodeURIComponent(query)}&id=2`,
        },
      ],
      metrics: this.createMetrics(startTime),
      error: 'Using mock fallback data due to fetch failure.', // Add an indicator that this is fallback data
    };
  }
}

export const executionEngine = new ExecutionEngine();
