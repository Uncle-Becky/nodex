import type { ComponentState } from '../types/components';
import { eventBus } from '../utils/eventBus';

export class ComponentStateManager {
  private static instance: ComponentStateManager;
  private states: Map<string, ComponentState> = new Map();

  private constructor() {
    this.initialize();
  }

  public static getInstance(): ComponentStateManager {
    if (!ComponentStateManager.instance) {
      ComponentStateManager.instance = new ComponentStateManager();
    }
    return ComponentStateManager.instance;
  }

  private initialize(): void {
    const handleEvent = (event: {
      type: string;
      payload: {
        componentId: string;
        state?: Record<string, unknown>;
        path?: string[];
      };
    }): void => {
      if (event.type === 'COMPONENT_STATE_UPDATE') {
        const { componentId, state, path } = event.payload;
        if (state) {
          this.updateComponentState(componentId, state, path);
        }
      } else if (event.type === 'COMPONENT_STATE_RESET') {
        const { componentId } = event.payload;
        this.resetComponentState(componentId);
      }
    };

    eventBus.subscribe(
      ['COMPONENT_STATE_UPDATE', 'COMPONENT_STATE_RESET'],
      handleEvent
    );
  }

  public getComponentState<T = Record<string, unknown>>(
    componentId: string
  ): T {
    if (!this.states.has(componentId)) {
      this.states.set(componentId, {
        id: componentId,
        state: {},
        subscribers: new Set(),
      });
    }

    return this.states.get(componentId)?.state as T;
  }

  public updateComponentState(
    componentId: string,
    stateUpdate: Record<string, unknown>,
    path?: string[]
  ): void {
    if (!this.states.has(componentId)) {
      this.states.set(componentId, {
        id: componentId,
        state: {},
        subscribers: new Set(),
      });
    }

    const componentState = this.states.get(componentId)!;
    let newState: Record<string, unknown>;

    if (path && path.length > 0) {
      // Update nested state
      newState = { ...componentState.state };
      let current: Record<string, unknown> = newState;

      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (key) {
          current[key] = current[key]
            ? { ...(current[key] as Record<string, unknown>) }
            : {};
          current = current[key] as Record<string, unknown>;
        }
      }

      const lastKey = path[path.length - 1];
      if (lastKey) {
        current[lastKey] = stateUpdate;
      }
    } else {
      // Update root state
      newState = { ...componentState.state, ...stateUpdate };
    }

    // Update state
    componentState.state = newState;

    // Notify subscribers
    componentState.subscribers.forEach(subscriber => {
      subscriber(newState);
    });

    // Publish state change event
    eventBus.publish({
      id: `state-change-${Date.now()}`,
      type: 'COMPONENT_STATE_CHANGED',
      timestamp: Date.now(),
      source: 'component-state-manager',
      target: componentId,
      payload: {
        componentId,
        state: newState,
      },
    });
  }

  public resetComponentState(componentId: string): void {
    if (this.states.has(componentId)) {
      const componentState = this.states.get(componentId)!;
      componentState.state = {};

      // Notify subscribers
      componentState.subscribers.forEach(subscriber => {
        subscriber({});
      });

      // Publish state reset event
      eventBus.publish({
        id: `state-reset-${Date.now()}`,
        type: 'COMPONENT_STATE_RESET',
        timestamp: Date.now(),
        source: 'component-state-manager',
        target: componentId,
        payload: {
          componentId,
        },
      });
    }
  }

  public subscribe(
    componentId: string,
    callback: (state: Record<string, unknown>) => void
  ): () => void {
    if (!this.states.has(componentId)) {
      this.states.set(componentId, {
        id: componentId,
        state: {},
        subscribers: new Set(),
      });
    }

    const componentState = this.states.get(componentId)!;
    componentState.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      componentState.subscribers.delete(callback);
    };
  }

  public persistState(): Record<string, unknown> {
    const persistedState: Record<string, unknown> = {};

    this.states.forEach((state, componentId) => {
      persistedState[componentId] = state.state;
    });

    return persistedState;
  }

  public loadPersistedState(persistedState: Record<string, unknown>): void {
    Object.entries(persistedState).forEach(([componentId, state]) => {
      if (typeof state === 'object' && state !== null) {
        this.updateComponentState(
          componentId,
          state as Record<string, unknown>
        );
      }
    });
  }
}
