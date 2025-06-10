import type { AgentId, BusEvent, CanvasId } from '../types/bus';
import { eventBus } from '../utils/eventBus';
import { AgentBase } from './AgentBase';

export class CanvasMetaAgent extends AgentBase {
  public override readonly id: CanvasId = 'canvas';
  private observedEvents: BusEvent[] = [];
  private agentInitCounts: Map<AgentId, number> = new Map();

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
        // Part 1: For Edge Awareness
        'REQUEST_EDGE_DATA',
      ],
      (event: BusEvent) => {
        // Changed _event to event for clarity
        this.observedEvents.push(event);
        this.onObserve(event); // General observation logic

        // Part 1: Handle REQUEST_EDGE_DATA
        if (
          event.type === 'REQUEST_EDGE_DATA' &&
          (event.payload as { edgeId: string }).edgeId &&
          event.source
        ) {
          this.handleRequestEdgeData(event);
        }

        // Part 2: Handle AGENT_INIT for counting
        if (event.type === 'AGENT_INIT' && event.source) {
          const agentId = event.source;
          this.agentInitCounts.set(
            agentId,
            (this.agentInitCounts.get(agentId) ?? 0) + 1
          );
          (window as Window & { console: Console }).console.log(
            `[CanvasMetaAgent] Updated agentInitCounts:`,
            this.agentInitCounts
          );
        }
      }
    );
  }

  // Part 1: Handler for REQUEST_EDGE_DATA
  private handleRequestEdgeData(event: BusEvent): void {
    const edgeId = (event.payload as { edgeId: string }).edgeId;
    const requestingAgentId = event.source as AgentId;

    // Simulate fetching edge data
    const mockEdgeData = {
      id: edgeId,
      type: 'text_stream', // Example data type
      customInfo: `Mock data for edge ${edgeId}`,
      connectedToNode: 'some_node_id', // Example additional info
      value: `Value flowing through ${edgeId} at ${new Date().toLocaleTimeString()}`,
      sourceAgent: requestingAgentId, // For verification
    };

    eventBus.publish({
      id: `resp-edge-${edgeId}-${Date.now()}`,
      type: 'EDGE_DATA_RESPONSE',
      timestamp: Date.now(),
      source: this.id, // CanvasMetaAgent is the source of the response
      target: requestingAgentId, // The original agent
      payload: { edgeId, data: mockEdgeData },
    });
    (window as Window & { console: Console }).console.log(
      `[CanvasMetaAgent] Sent EDGE_DATA_RESPONSE for ${edgeId} to ${requestingAgentId}`
    );
  }

  // Part 2: Getter for agent initialization counts
  public getAgentInitializationCounts(): Map<AgentId, number> {
    return new Map(this.agentInitCounts);
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
      (window as Window & { console: Console }).console.warn(
        '[CanvasMetaAgent] Agent error observed:',
        event
      );
    }
    // Optional: Log agent init counts periodically or on demand
    // if (event.type === 'AGENT_INIT') {
    //   console.log('[CanvasMetaAgent] Agent Init Counts:', this.getAgentInitializationCounts());
    // }
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
