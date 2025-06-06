import type { AgentId, BusEvent } from '../types/bus';
import { eventBus } from '../utils/eventBus';
import { AgentBase } from './AgentBase';

export interface Memory {
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
  private memories: Memory[] = [];
  private reasoningHistory: Reasoning[] = [];
  private knowledgeBase: Map<string, unknown> = new Map();

  constructor(id: AgentId) {
    super(id);
    this.initialize();
  }

  private initialize(): void {
    // Initialize with basic reasoning capabilities
    this.knowledgeBase.set('reasoning_methods', [
      'deductive',
      'inductive',
      'abductive',
    ]);
    this.knowledgeBase.set('confidence_threshold', 0.7);
  }

  protected override onMessage(event: BusEvent): void {
    const startTime = Date.now();

    try {
      this.storeMemory({
        id: `memory-${Date.now()}`,
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

  private processAgentMessage(event: BusEvent): void {
    const message = event.payload as { message: string; data?: unknown };

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

  private storeMemory(memory: Memory): void {
    this.memories.push(memory);

    // Limit memory size and remove least important memories
    if (this.memories.length > 1000) {
      this.memories.sort((a, b) => b.importance - a.importance);
      this.memories = this.memories.slice(0, 1000);
    }

    this.remember('memory_count', this.memories.length);
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

  private clearMemory(): void {
    this.memories = [];
    this.reasoningHistory = [];
    this.updateState({
      memoryCount: 0,
      reasoningCount: 0,
    });
  }

  private observeEvent(event: BusEvent): void {
    // Store event in memory for future reference
    this.storeMemory({
      id: `observation-${Date.now()}`,
      content: event,
      timestamp: event.timestamp,
      importance: 0.3,
      tags: ['observation', event.type],
    });
  }

  private handleError(error: unknown): void {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ReasoningAgent] Error: ${errorMessage}`);

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
