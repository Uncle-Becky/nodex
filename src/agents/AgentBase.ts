import type { AgentId, BusEvent } from '../types/bus';
import { eventBus } from '../utils/eventBus';

export interface AgentContext {
  id: AgentId;
  state: Record<string, unknown>;
  memory: Record<string, unknown>;
}

export abstract class AgentBase {
  public readonly id: AgentId;
  protected state: Record<string, unknown> = {};
  protected memory: Record<string, unknown> = {};

  constructor(id: AgentId) {
    this.id = id;
    this.onInit();
  }

  protected onInit(): void {
    // Subscribe to relevant events
    eventBus.subscribe('AGENT_MESSAGE', (_event: BusEvent) => {
      if (_event.target === this.id) {
        this.onMessage(_event);
      }
    });
    eventBus.subscribe('CANVAS_COMMAND', (_event: BusEvent) => {
      if (_event.target === this.id) {
        this.onCanvasCommand(_event);
      }
    });
  }

  protected abstract onMessage(event: BusEvent): void;
  protected onCanvasCommand(_event: BusEvent): void {
    // Optional: override in subclass
  }

  public getContext(): AgentContext {
    return {
      id: this.id,
      state: { ...this.state },
      memory: { ...this.memory },
    };
  }

  public updateState(newState: Record<string, unknown>): void {
    this.state = { ...this.state, ...newState };
    eventBus.publish({
      id: `${this.id}-state-update-${Date.now()}`,
      type: 'AGENT_STATE_UPDATE',
      timestamp: Date.now(),
      source: this.id,
      payload: { state: this.state, memory: this.memory },
    });
  }

  public remember(key: string, value: unknown): void {
    this.memory[key] = value;
  }

  public processMessage(event: BusEvent): void {
    this.onMessage(event);
  }

  public processCommand(event: BusEvent): void {
    this.onCanvasCommand(event);
  }

  // Part 1: Basic Edge Awareness Primitive
  async requestEdgeData(edgeId: string): Promise<any | null> {
    const requestId = `req-edge-${this.id}-${edgeId}-${Date.now()}`;
    return new Promise((resolve, reject) => {
      const timeoutDuration = 5000; // 5 seconds

      const unsubscribe = eventBus.subscribe(
        'EDGE_DATA_RESPONSE',
        (event: BusEvent<{ edgeId: string; data: any }>) => {
          if (event.target === this.id && event.payload?.edgeId === edgeId) {
            clearTimeout(timeoutHandle);
            unsubscribe();
            resolve(event.payload.data);
          }
        }
      );

      const timeoutHandle = setTimeout(() => {
        unsubscribe();
        reject(
          new Error(`Timeout waiting for EDGE_DATA_RESPONSE for edge ${edgeId}`)
        );
      }, timeoutDuration);

      eventBus.publish({
        id: requestId,
        type: 'REQUEST_EDGE_DATA',
        timestamp: Date.now(),
        source: this.id,
        payload: { edgeId },
      });
    });
  }

  // Part 3: Simple "Goal" Concept
  protected currentGoals: Set<string> = new Set();

  public addGoal(goalDescription: string): void {
    this.currentGoals.add(goalDescription);
    this.publishGoalsUpdate();
    // Optionally, log or update state about the new goal
    this.updateState({ [`goal_added_${goalDescription}`]: Date.now() });
  }

  public removeGoal(goalDescription: string): void {
    if (this.currentGoals.has(goalDescription)) {
      this.currentGoals.delete(goalDescription);
      this.publishGoalsUpdate();
      // Optionally, log or update state about goal removal
      this.updateState({ [`goal_removed_${goalDescription}`]: Date.now() });
    }
  }

  public getCurrentGoals(): string[] {
    return Array.from(this.currentGoals);
  }

  public hasGoal(goalDescription: string): boolean {
    return this.currentGoals.has(goalDescription);
  }

  public achieveGoal(goalDescription: string, achieved: boolean = true): void {
    if (this.hasGoal(goalDescription)) {
      this.updateState({ [`goal_${goalDescription}_achieved`]: achieved });
      // Optionally, publish a specific event for goal achievement
      eventBus.publish({
        id: `goal-achieved-${this.id}-${goalDescription}-${Date.now()}`,
        type: 'AGENT_GOAL_ACHIEVED',
        timestamp: Date.now(),
        source: this.id,
        payload: { goal: goalDescription, achieved },
      });
      // Decide if the goal should be automatically removed upon achievement
      // For this PoC, we'll leave it unless explicitly removed.
    }
  }

  protected publishGoalsUpdate(): void {
    eventBus.publish({
      id: `goals-update-${this.id}-${Date.now()}`,
      type: 'AGENT_GOALS_UPDATE', // Ensure this event type is defined or handled
      timestamp: Date.now(),
      source: this.id,
      payload: { goals: this.getCurrentGoals() },
    });
  }
}
