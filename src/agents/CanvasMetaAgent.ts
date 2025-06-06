import type { AgentId, BusEvent, CanvasId } from '../types/bus';
import { eventBus } from '../utils/eventBus';
import { AgentBase } from './AgentBase';

export class CanvasMetaAgent extends AgentBase {
  public override readonly id: CanvasId = 'canvas';
  private observedEvents: BusEvent[] = [];

  constructor() {
    super('canvas');
    this.observeAll();
  }

  private observeAll(): void {
    // Observe all events
    eventBus.subscribe(
      [
        'AGENT_INIT',
        'AGENT_MESSAGE',
        'AGENT_STATE_UPDATE',
        'AGENT_ERROR',
        'EDGE_UPDATE',
        'SYSTEM_EVENT',
      ],
      (_event: BusEvent) => {
        this.observedEvents.push(_event);
        this.onObserve(_event);
      }
    );
  }

  protected override onMessage(_event: BusEvent): void {
    // Canvas can receive direct messages if needed
    // (e.g., agents reporting status)
  }

  protected override onCanvasCommand(_event: BusEvent): void {
    // Canvas can receive commands (e.g., from UI)
  }

  protected onObserve(event: BusEvent): void {
    // React to observed events (e.g., log, orchestrate, intervene)
    // Example: log all agent errors
    if (event.type === 'AGENT_ERROR') {
      console.warn('[CanvasMetaAgent] Agent error observed:', event);
    }
  }

  public sendCommandToAgent(
    agentId: AgentId,
    command: string,
    args?: unknown[]
  ): void {
    eventBus.publish({
      id: `canvas-cmd-${agentId}-${Date.now()}`,
      type: 'CANVAS_COMMAND',
      timestamp: Date.now(),
      source: this.id,
      target: agentId,
      payload: { command, args },
    });
  }

  public getObservedEvents(): BusEvent[] {
    return [...this.observedEvents];
  }
}
