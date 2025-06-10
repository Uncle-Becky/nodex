import {
  mcpApiService,
  type Memory as McpMemory,
} from '../services/McpApiService'; // Fixed import
import type { AgentId, BusEvent } from '../types/bus';
import { eventBus } from '../utils/eventBus';
import { AgentBase } from './AgentBase';

export interface Memory {
  // This interface is used internally by ReasoningAgent
  id: string;
  content: unknown;
  timestamp: number;
  importance: number;
  tags: string[];
  embedding?: number[]; // For semantic similarity
}

export interface Reasoning {
  premise: string[];
  conclusion: string;
  confidence: number;
  method: 'deductive' | 'inductive' | 'abductive';
}

export class ReasoningAgent extends AgentBase {
  private memories: Memory[] = []; // Still uses the local Memory interface
  private reasoningHistory: Reasoning[] = [];
  private knowledgeBase: Map<string, unknown> = new Map();
  // private idbService: IndexedDBService; // Removed
  private mcpContextId: string | null = null;
  private readonly mcpContextType = 'reasoning_agent_memories';

  constructor(id: AgentId) {
    super(id);
    // this.idbService = new IndexedDBService(); // Removed
    // Call async initialize. The promise is not awaited here.
    this.initialize().catch(error => {
      (window as Window & { console: Console }).console.error(
        `[${this.id}] Error during async initialization:`,
        error
      );
      this.updateState({ initializationError: true, mcpError: error.message });
    });
  }

  private async initialize(): Promise<void> {
    // Initialize with basic reasoning capabilities first (offline mode)
    this.knowledgeBase.set('reasoning_methods', [
      'deductive',
      'inductive',
      'abductive',
    ]);
    this.knowledgeBase.set('confidence_threshold', 0.7);
    this.memories = []; // Start with empty memories

    // Part 3: Example Goal Usage
    this.addGoal('analyze_initial_input');
    (window as Window & { console: Console }).console.log(
      `[${this.id}] Initial goal added: analyze_initial_input. Current goals:`,
      this.getCurrentGoals()
    );

    // Try to initialize MCP context with timeout and fallback
    this.mcpContextId = `agent_${this.id}_${this.mcpContextType}`;

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('MCP initialization timeout')), 5000);
      });

      const initPromise = this.initializeMcpContext();

      await Promise.race([initPromise, timeoutPromise]);

      (window as Window & { console: Console }).console.log(
        `[${this.id}] MCP context initialized successfully`
      );
    } catch (error: unknown) {
      (window as Window & { console: Console }).console.warn(
        `[${this.id}] MCP context initialization failed, continuing in offline mode:`,
        error
      );
      this.mcpContextId = null; // Disable MCP functionality
      this.updateState({
        mcpInitializationError:
          error instanceof Error ? error.message : String(error),
        mcpOfflineMode: true,
      });
    }
  }

  private async initializeMcpContext(): Promise<void> {
    if (!this.mcpContextId) return;

    let context = await mcpApiService.getContext(this.mcpContextId);
    if (!context) {
      (window as Window & { console: Console }).console.log(
        `[${this.id}] No existing MCP context found for ${this.mcpContextId}, creating new one.`
      );
      // Pass an empty memories array as part of initialData
      context = await mcpApiService.createContext(
        this.id,
        this.mcpContextType,
        { memories: [] }
      );
      this.mcpContextId = context.id;
    }

    if (context?.data && Array.isArray(context.data.memories)) {
      this.memories = context.data.memories.map((mem: McpMemory) => ({
        ...mem, // Spread properties from McpMemory (which should be compatible)
        timestamp: new Date(mem.timestamp).getTime(), // Convert ISO string from server to number
      }));
      this.remember('memory_count', this.memories.length);
      (window as Window & { console: Console }).console.log(
        `[${this.id}] Loaded ${this.memories.length} memories from MCP server for context ${this.mcpContextId}.`
      );
    } else {
      this.memories = []; // Ensure it's an array
      (window as Window & { console: Console }).console.log(
        `[${this.id}] MCP context ${this.mcpContextId} has no 'memories' array or context is empty/malformed.`
      );
    }
  }

  protected override async onMessage(event: BusEvent): Promise<void> {
    // Made async
    const startTime = Date.now();

    try {
      // storeMemory is now async
      await this.storeMemory({
        id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Added randomness to ID
        content: event.payload,
        timestamp: event.timestamp,
        importance: this.calculateImportance(event),
        tags: this.extractTags(event),
      });

      this.processMessage(event);
    } catch (error) {
      this.handleError(error);
    } finally {
      const processingTime = Date.now() - startTime;
      this.updateMetrics({ processingTime });
    }
  }

  public override processMessage(event: BusEvent): void {
    switch (event.type) {
      case 'AGENT_MESSAGE':
        this.processAgentMessage(event);
        break;
      case 'CANVAS_COMMAND':
        this.processCanvasCommand(event);
        break;
      default:
        this.observeEvent(event);
    }
  }

  private async processAgentMessage(event: BusEvent): Promise<void> {
    // Made async
    const message = event.payload as { message: string; data?: unknown };

    // Part 1 & 3: Example Usage of requestEdgeData and Goals
    if (this.hasGoal('analyze_initial_input')) {
      (window as Window & { console: Console }).console.log(
        `[${this.id}] Goal "analyze_initial_input" is active.`
      );
      try {
        (window as Window & { console: Console }).console.log(
          `[${this.id}] Requesting data for edge_input_1 as part of analyze_initial_input goal.`
        );
        const edgeData = await this.requestEdgeData('edge_input_1');
        if (edgeData) {
          (window as Window & { console: Console }).console.log(
            `[${this.id}] Received edge data for edge_input_1:`,
            edgeData
          );
          this.remember('last_edge_data_edge_input_1', edgeData);
          // Incorporate edgeData into reasoning or message processing if needed
          // For example, add it to the message data:
          // message.data = { ...message.data, edge_input_1_data: edgeData };
        }
      } catch (error) {
        (window as Window & { console: Console }).console.warn(
          `[${this.id}] Failed to get edge data for edge_input_1:`,
          error
        );
      }
      // ... existing logic for processing the message ...

      // Achieve and remove the goal
      this.achieveGoal('analyze_initial_input', true);
      (window as Window & { console: Console }).console.log(
        `[${this.id}] Achieved goal: analyze_initial_input. State:`,
        this.state[`goal_analyze_initial_input_achieved`]
      );
      this.removeGoal('analyze_initial_input');
      (window as Window & { console: Console }).console.log(
        `[${this.id}] Removed goal: analyze_initial_input. Current goals:`,
        this.getCurrentGoals()
      );
    } else {
      (window as Window & { console: Console }).console.log(
        `[${this.id}] Goal "analyze_initial_input" is not active or already achieved. Current goals:`,
        this.getCurrentGoals()
      );
    }

    // Perform reasoning based on message content
    const reasoning = this.reason(message.message);

    if (
      reasoning.confidence >
      (this.knowledgeBase.get('confidence_threshold') as number)
    ) {
      // Respond with reasoned conclusion
      eventBus.publish({
        id: `${this.id}-response-${Date.now()}`,
        type: 'AGENT_MESSAGE',
        timestamp: Date.now(),
        source: this.id,
        target: event.source,
        payload: {
          message: reasoning.conclusion,
          reasoning,
          context: this.getRelevantMemories(message.message, 3),
          // Include edge data if it was fetched and considered relevant
          // edgeData: this.memory['last_edge_data_edge_input_1']
        },
      });
    }

    this.reasoningHistory.push(reasoning);
    this.updateState({
      lastReasoning: reasoning,
      totalReasonings: this.reasoningHistory.length,
    });
  }

  private processCanvasCommand(event: BusEvent): void {
    const command = event.payload as { command: string; args?: unknown[] };

    switch (command.command) {
      case 'analyze_pattern':
        this.analyzePattern(command.args?.[0] as string);
        break;
      case 'get_insights':
        this.shareInsights();
        break;
      case 'clear_memory':
        this.clearMemory();
        break;
    }
  }

  private reason(input: string): Reasoning {
    // Simple reasoning simulation - in a real system, this would be much more sophisticated
    const premises = this.extractPremises(input);
    const method = this.selectReasoningMethod(premises);

    let conclusion: string;
    let confidence: number;

    switch (method) {
      case 'deductive':
        ({ conclusion, confidence } = this.deductiveReasoning(premises));
        break;
      case 'inductive':
        ({ conclusion, confidence } = this.inductiveReasoning(premises));
        break;
      case 'abductive':
        ({ conclusion, confidence } = this.abductiveReasoning(premises));
        break;
    }

    return { premise: premises, conclusion, confidence, method };
  }

  private deductiveReasoning(premises: string[]): {
    conclusion: string;
    confidence: number;
  } {
    // Simplified deductive reasoning
    const relevantMemories = premises.flatMap(p =>
      this.getRelevantMemories(p, 2)
    );
    const patterns = this.findPatterns(relevantMemories);

    return {
      conclusion: `Based on ${premises.length} premises and ${patterns.length} patterns, I deduce...`,
      confidence: Math.min(0.9, 0.5 + patterns.length * 0.1),
    };
  }

  private inductiveReasoning(premises: string[]): {
    conclusion: string;
    confidence: number;
  } {
    // Pattern-based inductive reasoning
    const similarCases = this.findSimilarCases(premises);

    return {
      conclusion: `Observing ${similarCases.length} similar cases, I infer...`,
      confidence: Math.min(0.8, 0.3 + similarCases.length * 0.1),
    };
  }

  private abductiveReasoning(premises: string[]): {
    conclusion: string;
    confidence: number;
  } {
    // Best explanation reasoning
    const possibleExplanations = this.generateExplanations(premises);

    return {
      conclusion: `The most likely explanation among ${possibleExplanations.length} possibilities is...`,
      confidence: Math.min(0.7, 0.4 + possibleExplanations.length * 0.05),
    };
  }

  private async storeMemory(memory: Memory): Promise<void> {
    // Made async
    this.memories.push(memory);

    // Limit memory size and remove least important memories (in-memory only)
    // Persistence layer doesn't have this limit directly but stores what's given.
    if (this.memories.length > 1000) {
      // Note: This doesn't remove from IDB, only from the in-memory array for current session performance.
      // A more robust solution might involve selective deletion from IDB based on importance/age.
      this.memories.sort((a, b) => b.importance - a.importance);
      this.memories = this.memories.slice(0, 1000);
    }
    this.remember('memory_count', this.memories.length);

    if (this.mcpContextId) {
      try {
        // Convert timestamp to ISO string for MCP server
        const memoryToStore: McpMemory = {
          ...memory,
          timestamp: new Date(memory.timestamp).toISOString() as any,
        };
        await mcpApiService.appendToListInContext(
          this.mcpContextId,
          'memories',
          memoryToStore
        );
        (window as Window & { console: Console }).console.log(
          `[${this.id}] Appended memory ${memory.id} to MCP server context ${this.mcpContextId}.`
        );
      } catch (error) {
        (window as Window & { console: Console }).console.error(
          `[${this.id}] Error storing memory ${memory.id} to MCP server:`,
          error
        );
        // Handle error: e.g., retry logic, or mark agent as degraded
        this.updateState({
          mcpStoreError: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      (window as Window & { console: Console }).console.warn(
        `[${this.id}] mcpContextId is null, cannot store memory ${memory.id} to MCP server.`
      );
      this.updateState({ mcpStoreWarning: 'mcpContextId is null' });
    }
  }

  private calculateImportance(event: BusEvent): number {
    // Simple importance calculation based on event type and content
    let importance = 0.5; // Base importance

    switch (event.type) {
      case 'AGENT_MESSAGE':
        importance += 0.2;
        break;
      case 'AGENT_ERROR':
        importance += 0.3;
        break;
      case 'CANVAS_COMMAND':
        importance += 0.1;
        break;
    }

    // Adjust based on payload complexity
    if (event.payload && typeof event.payload === 'object') {
      importance += Object.keys(event.payload).length * 0.05;
    }

    return Math.min(1, importance);
  }

  private extractTags(event: BusEvent): string[] {
    const tags: string[] = [event.type];

    if (event.source) {
      tags.push(`source:${event.source}`);
    }
    if (event.target) {
      tags.push(`target:${event.target}`);
    }

    return tags;
  }

  private extractPremises(input: string): string[] {
    // Simple premise extraction - split by common conjunctions
    return input
      .split(/[,;]|\band\b|\bbut\b|\bor\b/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  private selectReasoningMethod(
    premises: string[]
  ): 'deductive' | 'inductive' | 'abductive' {
    // Simple method selection based on premise count and content
    if (premises.length >= 3) {
      return 'deductive';
    } else if (
      premises.some(p => p.includes('similar') || p.includes('like'))
    ) {
      return 'inductive';
    } else {
      return 'abductive';
    }
  }

  private getRelevantMemories(query: string, limit: number): Memory[] {
    return this.memories
      .map(memory => ({
        memory,
        relevance: this.calculateRelevance(memory, query),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit)
      .map(({ memory }) => memory);
  }

  private calculateRelevance(memory: Memory, query: string): number {
    // Simple relevance calculation based on content matching
    let relevance = 0;

    // Check content
    if (typeof memory.content === 'string') {
      const content = memory.content.toLowerCase();
      const queryLower = query.toLowerCase();
      if (content.includes(queryLower)) {
        relevance += 0.5;
      }
    }

    // Check tags
    const matchingTags = memory.tags.filter(tag =>
      query.toLowerCase().includes(tag.toLowerCase())
    );
    relevance += matchingTags.length * 0.1;

    // Consider recency
    const age = Date.now() - memory.timestamp;
    const recencyFactor = Math.max(0, 1 - age / (1000 * 60 * 60 * 24)); // Decay over 24 hours
    relevance *= 0.5 + recencyFactor * 0.5;

    return Math.min(1, relevance);
  }

  private findPatterns(memories: Memory[]): string[] {
    const patterns: string[] = [];

    // Simple pattern detection based on content similarity
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memory1 = memories[i];
        const memory2 = memories[j];
        if (memory1 && memory2 && typeof memory2.content === 'string') {
          const similarity = this.calculateRelevance(memory1, memory2.content);
          if (similarity > 0.7) {
            patterns.push(`pattern-${i}-${j}`);
          }
        }
      }
    }

    return patterns;
  }

  private findSimilarCases(premises: string[]): Memory[] {
    return this.memories.filter(memory =>
      premises.some(premise => this.calculateRelevance(memory, premise) > 0.6)
    );
  }

  private generateExplanations(premises: string[]): string[] {
    // Simple explanation generation based on premises
    return premises.map(
      premise => `explanation-${premise.substring(0, 20)}...`
    );
  }

  private analyzePattern(pattern: string): void {
    const relevantMemories = this.getRelevantMemories(pattern, 5);
    const analysis = {
      pattern,
      occurrences: relevantMemories.length,
      confidence: this.calculatePatternConfidence(relevantMemories),
      relatedPatterns: this.findRelatedPatterns(pattern),
    };

    eventBus.publish({
      id: `${this.id}-pattern-analysis-${Date.now()}`,
      type: 'AGENT_MESSAGE',
      timestamp: Date.now(),
      source: this.id,
      payload: {
        message: 'Pattern analysis complete',
        analysis,
      },
    });
  }

  private calculatePatternConfidence(memories: Memory[]): number {
    return Math.min(1, memories.length * 0.2);
  }

  private findRelatedPatterns(pattern: string): string[] {
    return this.memories
      .filter(memory => this.calculateRelevance(memory, pattern) > 0.5)
      .map(memory => `related-${memory.id}`);
  }

  private shareInsights(): void {
    const insights = {
      totalMemories: this.memories.length,
      reasoningHistory: this.reasoningHistory.length,
      recentPatterns: this.findRecentPatterns(),
      confidenceTrends: this.analyzeConfidenceTrends(),
    };

    eventBus.publish({
      id: `${this.id}-insights-${Date.now()}`,
      type: 'AGENT_MESSAGE',
      timestamp: Date.now(),
      source: this.id,
      payload: {
        message: 'Sharing insights',
        insights,
      },
    });
  }

  private findRecentPatterns(): string[] {
    const recentMemories = this.memories
      .filter(m => Date.now() - m.timestamp < 1000 * 60 * 60) // Last hour
      .slice(0, 5);
    return this.findPatterns(recentMemories);
  }

  private analyzeConfidenceTrends(): Record<string, number> {
    const recentReasonings = this.reasoningHistory.slice(-10);
    return {
      average: this.calculateAverageConfidence(recentReasonings),
      trend: this.calculateConfidenceTrend(recentReasonings),
    };
  }

  private calculateAverageConfidence(reasonings: Reasoning[]): number {
    return (
      reasonings.reduce((sum, r) => sum + r.confidence, 0) / reasonings.length
    );
  }

  private calculateConfidenceTrend(reasonings: Reasoning[]): number {
    if (reasonings.length < 2) return 0;
    const firstHalf = this.calculateAverageConfidence(
      reasonings.slice(0, Math.floor(reasonings.length / 2))
    );
    const secondHalf = this.calculateAverageConfidence(
      reasonings.slice(Math.floor(reasonings.length / 2))
    );
    return secondHalf - firstHalf;
  }

  private async clearMemory(): Promise<void> {
    // Made async
    this.memories = [];
    this.reasoningHistory = []; // Keep reasoning history separate, or clear it based on different logic
    this.updateState({
      memoryCount: 0,
    });

    if (this.mcpContextId) {
      try {
        // To clear memories, we update the context with an empty 'memories' list
        await mcpApiService.updateContext(this.mcpContextId, { memories: [] });
        (window as Window & { console: Console }).console.log(
          `[${this.id}] Cleared memories on MCP server for context ${this.mcpContextId}.`
        );
      } catch (error: unknown) {
        (window as Window & { console: Console }).console.error(
          `[${this.id}] Error clearing memories on MCP server for ${this.mcpContextId}:`,
          error
        );
        this.updateState({
          mcpClearError: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      (window as Window & { console: Console }).console.warn(
        `[${this.id}] mcpContextId is null, cannot clear memories on MCP server.`
      );
      this.updateState({ mcpClearWarning: 'mcpContextId is null' });
    }
  }

  private async observeEvent(event: BusEvent): Promise<void> {
    // Store event in memory for future reference
    // storeMemory is now async
    await this.storeMemory({
      id: `observation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Added randomness
      content: event,
      timestamp: event.timestamp,
      importance: 0.3,
      tags: ['observation', event.type],
    });
  }

  private handleError(error: unknown): void {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    (window as Window & { console: Console }).console.error(
      `[ReasoningAgent] Error: ${errorMessage}`
    );

    eventBus.publish({
      id: `${this.id}-error-${Date.now()}`,
      type: 'AGENT_ERROR',
      timestamp: Date.now(),
      source: this.id,
      payload: {
        error: errorMessage,
        context: this.getContext(),
      },
    });
  }

  private updateMetrics(metrics: { processingTime: number }): void {
    const currentAvg = (this.state['averageProcessingTime'] as number) ?? 0;
    this.updateState({
      lastProcessingTime: metrics.processingTime,
      averageProcessingTime: currentAvg * 0.9 + metrics.processingTime * 0.1,
    });
  }

  private getCurrentState(): Record<string, unknown> {
    return {
      ...this.state,
      memoryCount: this.memories.length,
      reasoningCount: this.reasoningHistory.length,
      lastReasoning: this.reasoningHistory[this.reasoningHistory.length - 1],
      knowledgeBaseSize: this.knowledgeBase.size,
    };
  }
}
