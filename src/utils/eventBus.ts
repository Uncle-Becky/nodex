import type {
  BusEvent,
  BusEventType,
  BusMetrics,
  EventAnalysis,
  EventBus,
  EventFilter,
  EventHandler,
  EventLogEntry,
  EventMiddleware,
  EventPriority,
  EventValidator,
} from '../types/bus';

interface EventSubscription {
  handler: EventHandler;
  filter?: (event: BusEvent) => boolean;
  once: boolean;
}

interface EventQueueItem {
  event: BusEvent;
  retryCount: number;
  timestamp: number;
}

// Enhanced intelligent event bus implementation
class IntelligentEventBus implements EventBus {
  private log: EventLogEntry[] = [];
  private subscribers: Map<BusEventType, Set<EventHandler>> = new Map();
  private validators: EventValidator[] = [];
  private middleware: EventMiddleware[] = [];
  private metrics: BusMetrics;
  private isActive = true;
  private startTime = Date.now();
  private eventQueue: EventQueueItem[] = [];
  private processingQueue = false;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly PERSISTENCE_KEY = 'event_bus_queue';
  private readonly MAX_PERSISTED_EVENTS = 100;

  constructor() {
    this.metrics = {
      totalEvents: 0,
      activeSubscribers: 0,
      averageLatency: 0,
      memoryUsage: 0,
      errorCount: 0,
      uptime: 0,
    };

    // Add default validators
    this.addValidator({
      validate: event => {
        if (!event.id || !event.type || !event.timestamp || !event.source) {
          return 'Event must have id, type, timestamp, and source';
        }
        return true;
      },
    });

    // Add default middleware for metrics collection
    this.addMiddleware({
      process: (event, next) => {
        const startTime = performance.now();
        next();
        const processingTime = performance.now() - startTime;
        this.updateMetrics(event, processingTime);
      },
      priority: 1000, // High priority to ensure it runs first
    });

    this.loadPersistedEvents();
    this.startQueueProcessor();
  }

  async publish<T>(event: BusEvent<T>): Promise<void> {
    if (!this.isActive) {
      console.warn('Event bus is paused, event discarded:', event.id);
      return;
    }

    // Validate event
    const validationResult = this.validateEvent(event);
    if (validationResult !== true) {
      this.metrics.errorCount++;
      throw new Error(`Event validation failed: ${validationResult}`);
    }

    // Add to log
    const logEntry: EventLogEntry = {
      ...event,
      processed: false,
      processingTime: 0,
      errors: [],
      retryCount: 0,
    };
    this.log.push(logEntry);

    // Apply middleware and process event
    await this.processEventWithMiddleware(event);

    // Update metrics
    this.metrics.totalEvents++;
    this.metrics.uptime = Date.now() - this.startTime;
  }

  subscribe<T = unknown>(
    type: BusEventType | BusEventType[],
    handler: EventHandler<T> | ((event: BusEvent<T>) => void | Promise<void>),
    options: {
      filter?: (event: BusEvent<T>) => boolean;
      once?: boolean;
    } = {}
  ): () => void {
    const types = Array.isArray(type) ? type : [type];
    const normalizedHandler: EventHandler<T> =
      typeof handler === 'function'
        ? { handler: handler as (event: BusEvent<T>) => void | Promise<void> }
        : handler;

    types.forEach(t => {
      if (!this.subscribers.has(t)) {
        this.subscribers.set(t, new Set());
      }
      this.subscribers.get(t)!.add(normalizedHandler as EventHandler);
    });

    this.updateSubscriberCount();

    // Return unsubscribe function
    return () => {
      types.forEach(t => {
        this.subscribers.get(t)?.delete(normalizedHandler as EventHandler);
      });
      this.updateSubscriberCount();
    };
  }

  unsubscribe<T = unknown>(
    types: BusEventType[],
    handler: EventHandler<T> | ((event: BusEvent<T>) => void | Promise<void>)
  ): void {
    const normalizedHandler: EventHandler<T> =
      typeof handler === 'function'
        ? { handler: handler as (event: BusEvent<T>) => void | Promise<void> }
        : handler;

    types.forEach(type => {
      const handlers = this.subscribers.get(type);
      if (handlers) {
        handlers.delete(normalizedHandler as EventHandler);
      }
    });

    this.updateSubscriberCount();
  }

  query(filter: EventFilter): EventLogEntry[] {
    return this.filterEvents(this.log, filter);
  }

  getLog(filter?: EventFilter): EventLogEntry[] {
    if (!filter) return [...this.log];
    return this.filterEvents(this.log, filter);
  }

  async replay(log: EventLogEntry[]): Promise<void> {
    for (const event of log) {
      const replayEvent: BusEvent = {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        source: event.source,
        target: event.target,
        payload: event.payload,
        priority: event.priority,
        ttl: event.ttl,
        meta: {
          ...event.meta,
          tags: [...(event.meta?.tags ?? []), 'replayed'],
        },
      };
      await this.publish(replayEvent);
    }
  }

  analyze(filter?: EventFilter): EventAnalysis {
    const events = filter ? this.filterEvents(this.log, filter) : this.log;

    const eventsByType: Record<BusEventType, number> = {} as Record<
      BusEventType,
      number
    >;
    const eventsBySource: Record<string, number> = {};
    let totalProcessingTime = 0;
    let errorCount = 0;

    events.forEach(event => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;

      // Count by source
      const source = event.source.toString();
      eventsBySource[source] = (eventsBySource[source] ?? 0) + 1;

      // Processing time
      if (event.processingTime) {
        totalProcessingTime += event.processingTime;
      }

      // Errors
      if (event.errors && event.errors.length > 0) {
        errorCount++;
      }
    });

    // Timeline analysis
    const timelineAnalysis = this.analyzeTimeline(events);

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySource,
      averageProcessingTime:
        events.length > 0 ? totalProcessingTime / events.length : 0,
      errorRate: events.length > 0 ? errorCount / events.length : 0,
      timelineAnalysis,
    };
  }

  getMetrics(): BusMetrics {
    return { ...this.metrics };
  }

  clearLog(olderThan?: number): void {
    if (olderThan) {
      this.log = this.log.filter(event => event.timestamp > olderThan);
    } else {
      this.log = [];
    }
  }

  pause(): void {
    this.isActive = false;
  }

  resume(): void {
    this.isActive = true;
  }

  addValidator(validator: EventValidator): void {
    this.validators.push(validator);
  }

  addMiddleware(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
    // Sort by priority (higher priority first)
    this.middleware.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  // Private methods
  private validateEvent(event: BusEvent): boolean | string {
    for (const validator of this.validators) {
      if (!validator.eventTypes || validator.eventTypes.includes(event.type)) {
        const result = validator.validate(event);
        if (result !== true) {
          return result;
        }
      }
    }
    return true;
  }

  private async processEventWithMiddleware(event: BusEvent): Promise<void> {
    let index = 0;

    const next = async () => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        if (middleware) {
          await new Promise<void>(resolve => {
            middleware.process(event, () => {
              resolve();
            });
          });
        }
        await next();
      } else {
        // Process the actual event
        await this.processEvent(event);
      }
    };

    await next();
  }

  private async processEvent(event: BusEvent): Promise<void> {
    const handlers = this.subscribers.get(event.type);
    if (!handlers) return;

    const promises: Promise<void>[] = [];

    for (const handler of handlers) {
      // Apply handler filter if exists
      if (handler.filter && !handler.filter(event)) {
        continue;
      }

      // Check TTL
      if (event.ttl && Date.now() - event.timestamp > event.ttl) {
        continue;
      }

      const promise = this.executeHandler(handler, event);
      promises.push(promise);

      // Remove handler if it's a one-time handler
      if (handler.once) {
        handlers.delete(handler);
      }
    }

    await Promise.all(promises);
  }

  private async executeHandler(
    handler: EventHandler,
    event: BusEvent
  ): Promise<void> {
    try {
      const result = handler.handler(event);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      this.metrics.errorCount++;

      // Add error to log entry
      const logEntry = this.log.find(entry => entry.id === event.id);
      if (logEntry) {
        logEntry.errors = logEntry.errors ?? [];
        logEntry.errors.push(
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      console.error(`Error in event handler for ${event.type}:`, error);
    }
  }

  private filterEvents(
    events: EventLogEntry[],
    filter: EventFilter
  ): EventLogEntry[] {
    return events.filter(event => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.source && event.source !== filter.source) return false;
      if (filter.target && event.target !== filter.target) return false;
      if (filter.startTime && event.timestamp < filter.startTime) return false;
      if (filter.endTime && event.timestamp > filter.endTime) return false;
      if (filter.hasErrors && (!event.errors || event.errors.length === 0))
        return false;
      if (filter.tags && filter.tags.length > 0) {
        const eventTags = event.meta?.tags ?? [];
        if (!filter.tags.every(tag => eventTags.includes(tag))) return false;
      }
      return true;
    });
  }

  private analyzeTimeline(events: EventLogEntry[]) {
    const timeline: Record<string, number> = {};
    const interval = 60000; // 1 minute intervals

    events.forEach(event => {
      const timeSlot = Math.floor(event.timestamp / interval) * interval;
      timeline[timeSlot] = (timeline[timeSlot] ?? 0) + 1;
    });

    return timeline;
  }

  private updateMetrics(event: BusEvent, processingTime: number): void {
    this.metrics.totalEvents++;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalEvents - 1) +
        processingTime) /
      this.metrics.totalEvents;
    this.metrics.uptime = Date.now() - this.startTime;

    // Update memory usage if available
    if (
      typeof (performance as unknown as { memory: { usedJSHeapSize: number } })
        .memory !== 'undefined'
    ) {
      this.metrics.memoryUsage = (
        performance as unknown as { memory: { usedJSHeapSize: number } }
      ).memory.usedJSHeapSize;
    }
  }

  private updateSubscriberCount(): void {
    let count = 0;
    this.subscribers.forEach(handlers => {
      count += handlers.size;
    });
    this.metrics.activeSubscribers = count;
  }

  private loadPersistedEvents(): void {
    try {
      const stored = localStorage.getItem(this.PERSISTENCE_KEY);
      if (stored) {
        const persistedEvents = JSON.parse(stored) as EventQueueItem[];
        this.eventQueue = persistedEvents.slice(-this.MAX_PERSISTED_EVENTS);
      }
    } catch (error) {
      console.error('Failed to load persisted events:', error);
    }
  }

  private persistEvents(): void {
    try {
      const eventsToPersist = this.eventQueue.slice(-this.MAX_PERSISTED_EVENTS);
      localStorage.setItem(
        this.PERSISTENCE_KEY,
        JSON.stringify(eventsToPersist)
      );
    } catch (error) {
      console.error('Failed to persist events:', error);
    }
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 100);
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) return;

    this.processingQueue = true;
    const now = Date.now();

    try {
      while (this.eventQueue.length > 0) {
        const item = this.eventQueue[0];

        // Skip expired events
        if (item.event.ttl && now - item.timestamp > item.event.ttl) {
          this.eventQueue.shift();
          continue;
        }

        // Process event
        try {
          await this.processEvent(item.event);
          this.eventQueue.shift();
        } catch (error) {
          console.error('Error processing event:', error);

          if (item.retryCount < this.MAX_RETRY_ATTEMPTS) {
            // Move to end of queue for retry
            item.retryCount++;
            this.eventQueue.push(this.eventQueue.shift()!);
          } else {
            // Remove after max retries
            this.eventQueue.shift();
          }
        }

        // Persist queue state periodically
        if (this.eventQueue.length % 10 === 0) {
          this.persistEvents();
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  public getQueueStatus(): {
    queueLength: number;
    processing: boolean;
    oldestEvent: number;
    newestEvent: number;
  } {
    return {
      queueLength: this.eventQueue.length,
      processing: this.processingQueue,
      oldestEvent: this.eventQueue[0]?.timestamp ?? 0,
      newestEvent: this.eventQueue[this.eventQueue.length - 1]?.timestamp ?? 0,
    };
  }

  public clearQueue(): void {
    this.eventQueue = [];
    this.persistEvents();
  }
}

// Create and export the singleton instance
export const eventBus: EventBus = new IntelligentEventBus();

// Export helper functions for type-safe event creation
export function createEvent<T extends BusEventType>(
  type: T,
  source: string,
  payload: unknown,
  options?: {
    target?: string;
    priority?: EventPriority;
    ttl?: number;
    meta?: Record<string, unknown>;
  }
): BusEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: Date.now(),
    source,
    payload,
    target: options?.target,
    priority: options?.priority ?? 'normal',
    ttl: options?.ttl,
    meta: {
      tags: [],
      ...options?.meta,
    },
  };
}

export function createTypedEvent<T extends BusEventType>(
  type: T,
  source: string,
  payload: T extends 'AGENT_MESSAGE'
    ? Record<string, unknown>
    : T extends 'AGENT_STATE_UPDATE'
      ? Record<string, unknown>
      : T extends 'CANVAS_COMMAND'
        ? Record<string, unknown>
        : unknown,
  options?: {
    target?: string;
    priority?: EventPriority;
    ttl?: number;
    meta?: Record<string, unknown>;
  }
): BusEvent {
  return createEvent(type, source, payload, options);
}
