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
}
