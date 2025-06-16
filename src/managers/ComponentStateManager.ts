import { eventBus } from '../utils/eventBus';

export interface ComponentState {
  id: string;
  state: Record<string, unknown>;
  subscribers: Set<(state: Record<string, unknown>) => void>;
  lastUpdate: number;
  version: number;
  isPersistent: boolean;
}

export class ComponentStateManager {
  private static instance: ComponentStateManager;
  private states: Map<string, ComponentState> = new Map();
  private readonly PERSISTENCE_KEY = 'component_states';
  private readonly MAX_STATE_SIZE = 1024 * 1024; // 1MB
  private readonly STATE_VERSION = 1;

  private constructor() {
    this.loadPersistedStates();
    this.setupEventHandling();
  }

  public static getInstance(): ComponentStateManager {
    if (!ComponentStateManager.instance) {
      ComponentStateManager.instance = new ComponentStateManager();
    }
    return ComponentStateManager.instance;
  }

  private setupEventHandling(): void {
    // Subscribe to state reset events
    eventBus.subscribe(['COMPONENT_STATE_RESET'], event => {
      const { componentId } = event.payload as { componentId: string };
      this.resetState(componentId);
    });

    // Subscribe to state change events
    eventBus.subscribe(['COMPONENT_STATE_CHANGED'], event => {
      const { componentId, state } = event.payload as {
        componentId: string;
        state: Record<string, unknown>;
      };
      this.updateComponentState(componentId, state);
    });
  }

  private loadPersistedStates(): void {
    try {
      const stored = localStorage.getItem(this.PERSISTENCE_KEY);
      if (stored) {
        const persistedStates = JSON.parse(stored) as Record<
          string,
          { state: Record<string, unknown>; version: number }
        >;

        Object.entries(persistedStates).forEach(([id, data]) => {
          if (data.version === this.STATE_VERSION) {
            this.states.set(id, {
              id,
              state: data.state,
              subscribers: new Set(),
              lastUpdate: Date.now(),
              version: data.version,
              isPersistent: true,
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to load persisted component states:', error);
    }
  }

  private persistStates(): void {
    try {
      const statesToPersist: Record<
        string,
        { state: Record<string, unknown>; version: number }
      > = {};

      this.states.forEach((componentState, id) => {
        if (componentState.isPersistent) {
          statesToPersist[id] = {
            state: componentState.state,
            version: componentState.version,
          };
        }
      });

      const serialized = JSON.stringify(statesToPersist);
      if (serialized.length > this.MAX_STATE_SIZE) {
        console.warn('Component state size exceeds maximum allowed size');
        return;
      }

      localStorage.setItem(this.PERSISTENCE_KEY, serialized);
    } catch (error) {
      console.error('Failed to persist component states:', error);
    }
  }

  public getState(componentId: string): Record<string, unknown> {
    const componentState = this.states.get(componentId);
    return componentState?.state ?? {};
  }

  public setState(
    componentId: string,
    state: Record<string, unknown>,
    options: { isPersistent?: boolean } = {}
  ): void {
    const existingState = this.states.get(componentId);
    const newState: ComponentState = {
      id: componentId,
      state,
      subscribers: existingState?.subscribers ?? new Set(),
      lastUpdate: Date.now(),
      version: this.STATE_VERSION,
      isPersistent:
        options.isPersistent ?? existingState?.isPersistent ?? false,
    };

    this.states.set(componentId, newState);

    // Notify subscribers
    newState.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error(
          `Error in component state subscriber for ${componentId}:`,
          error
        );
      }
    });

    // Publish state change event
    eventBus.publish({
      id: `state-change-${Date.now()}`,
      type: 'COMPONENT_STATE_CHANGED',
      timestamp: Date.now(),
      source: 'component-state-manager',
      payload: { componentId, state },
    });

    // Persist if needed
    if (newState.isPersistent) {
      this.persistStates();
    }
  }

  public updateComponentState(
    componentId: string,
    stateUpdate: Record<string, unknown>
  ): void {
    const currentState = this.getState(componentId);
    this.setState(componentId, { ...currentState, ...stateUpdate });
  }

  public resetState(componentId: string): void {
    const componentState = this.states.get(componentId);
    if (componentState) {
      this.setState(
        componentId,
        {},
        {
          isPersistent: componentState.isPersistent,
        }
      );
    }
  }

  public subscribe(
    componentId: string,
    callback: (state: Record<string, unknown>) => void
  ): () => void {
    const componentState = this.states.get(componentId);
    if (!componentState) {
      this.states.set(componentId, {
        id: componentId,
        state: {},
        subscribers: new Set([callback]),
        lastUpdate: Date.now(),
        version: this.STATE_VERSION,
        isPersistent: false,
      });
    } else {
      componentState.subscribers.add(callback);
    }

    // Initial callback with current state
    callback(this.getState(componentId));

    // Return unsubscribe function
    return () => {
      const state = this.states.get(componentId);
      if (state) {
        state.subscribers.delete(callback);
        if (state.subscribers.size === 0) {
          this.states.delete(componentId);
        }
      }
    };
  }

  public getComponentStateInfo(componentId: string): {
    hasState: boolean;
    lastUpdate: number;
    subscriberCount: number;
    isPersistent: boolean;
    stateSize: number;
  } {
    const state = this.states.get(componentId);
    if (!state) {
      return {
        hasState: false,
        lastUpdate: 0,
        subscriberCount: 0,
        isPersistent: false,
        stateSize: 0,
      };
    }

    return {
      hasState: true,
      lastUpdate: state.lastUpdate,
      subscriberCount: state.subscribers.size,
      isPersistent: state.isPersistent,
      stateSize: JSON.stringify(state.state).length,
    };
  }

  public clearAllStates(): void {
    this.states.clear();
    localStorage.removeItem(this.PERSISTENCE_KEY);
  }
}

export const componentStateManager = ComponentStateManager.getInstance();
