import type { AgentId } from '../types/bus';
import { eventBus } from '../utils/eventBus';

export interface WorkerMetrics {
  id: string;
  agentId: AgentId;
  messagesProcessed: number;
  avgProcessingTime: number;
  lastActivity: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface WorkerPoolConfig {
  maxWorkers: number;
  minWorkers: number;
  idleTimeout: number;
  maxMessagesPerWorker: number;
}

export interface WorkerMessage {
  type: string;
  timestamp: number;
  queueId: string;
  [key: string]: unknown;
}

export class WorkerPool {
  private workers: Map<AgentId, Worker> = new Map();
  private workerMetrics: Map<AgentId, WorkerMetrics> = new Map();
  private messageQueue: Map<AgentId, WorkerMessage[]> = new Map();
  private config: WorkerPoolConfig;
  private monitoringInterval: number | null = null;

  constructor(
    config: WorkerPoolConfig = {
      maxWorkers: 8,
      minWorkers: 2,
      idleTimeout: 30000,
      maxMessagesPerWorker: 1000,
    }
  ) {
    this.config = config;
    this.startMonitoring();
  }

  public async createWorker(
    agentId: AgentId,
    workerScript: string
  ): Promise<Worker> {
    if (this.workers.has(agentId)) {
      throw new Error(`Worker for agent ${agentId} already exists`);
    }

    if (this.workers.size >= this.config.maxWorkers) {
      await this.scaleDown();
    }

    const worker = new Worker(new URL(workerScript, import.meta.url), {
      type: 'module',
      name: `agent-${agentId}`,
    });

    // Initialize worker metrics
    this.workerMetrics.set(agentId, {
      id: `worker-${agentId}`,
      agentId,
      messagesProcessed: 0,
      avgProcessingTime: 0,
      lastActivity: Date.now(),
      memoryUsage: 0,
      cpuUsage: 0,
    });

    // Set up worker message handling
    worker.onmessage = event => {
      this.handleWorkerMessage(agentId, event);
    };

    worker.onerror = error => {
      this.handleWorkerError(agentId, error);
    };

    this.workers.set(agentId, worker);
    this.messageQueue.set(agentId, []);

    // Send initialization message
    worker.postMessage({
      type: 'WORKER_INIT',
      agentId,
      config: this.config,
    });

    eventBus.publish({
      id: `worker-created-${agentId}-${Date.now()}`,
      type: 'SYSTEM_EVENT',
      timestamp: Date.now(),
      source: 'worker-pool',
      payload: { agentId, action: 'worker_created' },
    });

    return worker;
  }

  public async terminateWorker(agentId: AgentId): Promise<void> {
    const worker = this.workers.get(agentId);
    if (!worker) return;

    // Process remaining messages
    const queue = this.messageQueue.get(agentId) ?? [];
    if (queue.length > 0) {
      console.warn(
        `Terminating worker ${agentId} with ${queue.length} pending messages`
      );
    }

    worker.terminate();
    this.workers.delete(agentId);
    this.workerMetrics.delete(agentId);
    this.messageQueue.delete(agentId);

    eventBus.publish({
      id: `worker-terminated-${agentId}-${Date.now()}`,
      type: 'SYSTEM_EVENT',
      timestamp: Date.now(),
      source: 'worker-pool',
      payload: { agentId, action: 'worker_terminated' },
    });
  }

  public sendMessage(
    agentId: AgentId,
    message: Record<string, unknown>
  ): boolean {
    const worker = this.workers.get(agentId);
    if (!worker) return false;

    const queue = this.messageQueue.get(agentId) ?? [];
    const metrics = this.workerMetrics.get(agentId);

    if (queue.length >= this.config.maxMessagesPerWorker) {
      console.warn(`Message queue full for agent ${agentId}`);
      return false;
    }

    const messageWithTimestamp: WorkerMessage = {
      type: 'WORKER_MESSAGE',
      ...message,
      timestamp: Date.now(),
      queueId: `msg-${agentId}-${Date.now()}-${Math.random()}`,
    };

    queue.push(messageWithTimestamp);
    worker.postMessage(messageWithTimestamp);

    if (metrics) {
      metrics.lastActivity = Date.now();
    }

    return true;
  }

  private handleWorkerMessage(agentId: AgentId, event: MessageEvent): void {
    const metrics = this.workerMetrics.get(agentId);
    if (metrics) {
      metrics.messagesProcessed++;
      metrics.lastActivity = Date.now();

      // Update processing time
      if (event.data.processingTime) {
        metrics.avgProcessingTime =
          (metrics.avgProcessingTime + event.data.processingTime) / 2;
      }
    }

    // Remove message from queue
    const queue = this.messageQueue.get(agentId) ?? [];
    const messageIndex = queue.findIndex(
      msg => msg.queueId === event.data.queueId
    );
    if (messageIndex >= 0) {
      queue.splice(messageIndex, 1);
    }

    // Forward message to event bus
    if (event.data.busEvent) {
      eventBus.publish(event.data.busEvent);
    }
  }

  private handleWorkerError(agentId: AgentId, error: ErrorEvent): void {
    console.error(`Worker error for agent ${agentId}:`, error);

    eventBus.publish({
      id: `worker-error-${agentId}-${Date.now()}`,
      type: 'AGENT_ERROR',
      timestamp: Date.now(),
      source: agentId,
      payload: {
        error: error.message,
        filename: error.filename,
        lineno: error.lineno,
      },
    });
  }

  private async scaleDown(): Promise<void> {
    const workers = Array.from(this.workerMetrics.values()).sort(
      (a, b) => a.lastActivity - b.lastActivity
    );

    const idleWorkers = workers.filter(
      w => Date.now() - w.lastActivity > this.config.idleTimeout
    );

    if (idleWorkers.length > 0) {
      const workerToTerminate = idleWorkers[0];
      if (workerToTerminate) {
        await this.terminateWorker(workerToTerminate.agentId);
      }
    }
  }

  private startMonitoring(): void {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, 5000) as unknown as number;
  }

  private updateMetrics(): void {
    this.workerMetrics.forEach((metrics, agentId) => {
      const worker = this.workers.get(agentId);
      if (worker) {
        // Update memory usage if available
        if (typeof (performance as any).memory !== 'undefined') {
          metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
        }

        // Update CPU usage (estimated based on message processing)
        const timeSinceLastActivity = Date.now() - metrics.lastActivity;
        metrics.cpuUsage = timeSinceLastActivity < 1000 ? 100 : 0;
      }
    });
  }

  public getMetrics(): WorkerMetrics[] {
    return Array.from(this.workerMetrics.values());
  }

  public getWorkerCount(): number {
    return this.workers.size;
  }

  public async shutdown(): Promise<void> {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    const terminationPromises = Array.from(this.workers.keys()).map(agentId =>
      this.terminateWorker(agentId)
    );

    await Promise.all(terminationPromises);
  }
}

// Singleton instance
export const workerPool = new WorkerPool();
