import { apiKeyManager } from './ApiKeyManager';
import { executionEngine } from './ExecutionEngine';
import { executionHistoryService } from './ExecutionHistoryService';
import { FlowValidationService } from './FlowValidationService';
import { llmService } from './LLMService';

export class ServiceInitializer {
  private static instance: ServiceInitializer;
  private initialized = false;
  private services: Map<string, boolean> = new Map();
  private serviceDependencies: Map<string, string[]> = new Map();
  private initializationOrder: string[] = [];
  private retryAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;

  private constructor() {
    // Define service dependencies
    this.serviceDependencies.set('apiKeyManager', []);
    this.serviceDependencies.set('llmService', ['apiKeyManager']);
    this.serviceDependencies.set('executionEngine', ['llmService']);
    this.serviceDependencies.set('executionHistoryService', [
      'executionEngine',
    ]);
    this.serviceDependencies.set('flowValidationService', [
      'executionEngine',
      'executionHistoryService',
    ]);

    // Initialize service states
    this.serviceDependencies.forEach((_, service) => {
      this.services.set(service, false);
      this.retryAttempts.set(service, 0);
    });

    // Calculate initial order
    this.calculateInitializationOrder();
  }

  private calculateInitializationOrder(): void {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (service: string) => {
      if (temp.has(service)) {
        throw new Error(`Circular dependency detected involving ${service}`);
      }
      if (visited.has(service)) return;

      temp.add(service);
      const dependencies = this.serviceDependencies.get(service) || [];

      for (const dep of dependencies) {
        if (!this.serviceDependencies.has(dep)) {
          throw new Error(`Unknown dependency ${dep} for service ${service}`);
        }
        visit(dep);
      }

      temp.delete(service);
      visited.add(service);
      order.unshift(service); // Add to start of array to maintain dependency order
    };

    // Visit all services
    for (const service of this.serviceDependencies.keys()) {
      if (!visited.has(service)) {
        visit(service);
      }
    }

    this.initializationOrder = order;
    console.log('ServiceInitializer: Calculated initialization order:', order);
  }

  public static getInstance(): ServiceInitializer {
    if (!ServiceInitializer.instance) {
      ServiceInitializer.instance = new ServiceInitializer();
    }
    return ServiceInitializer.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('ServiceInitializer: Already initialized');
      return;
    }

    console.log('ServiceInitializer: Starting initialization...');
    console.log(
      'ServiceInitializer: Initialization order:',
      this.initializationOrder
    );

    try {
      // Initialize services in reverse order to satisfy dependencies
      for (const service of [...this.initializationOrder].reverse()) {
        await this.initializeService(service);
      }
      this.initialized = true;
      console.log('ServiceInitializer: All services initialized successfully');
    } catch (error) {
      console.error('ServiceInitializer: Initialization failed:', error);
      throw error;
    }
  }

  private async initializeService(serviceName: string): Promise<void> {
    if (this.services.get(serviceName)) {
      console.log(`ServiceInitializer: ${serviceName} already initialized`);
      return;
    }

    const dependencies = this.serviceDependencies.get(serviceName) || [];
    const uninitializedDeps = dependencies.filter(
      dep => !this.services.get(dep)
    );

    if (uninitializedDeps.length > 0) {
      const error = new Error(
        `Dependencies ${uninitializedDeps.join(', ')} not initialized for ${serviceName}`
      );
      console.error(
        `ServiceInitializer: Failed to initialize ${serviceName}:`,
        error
      );
      throw error;
    }

    console.log(`ServiceInitializer: Initializing ${serviceName}...`);

    try {
      switch (serviceName) {
        case 'apiKeyManager':
          await apiKeyManager.initialize();
          break;
        case 'llmService':
          await llmService.initialize();
          break;
        case 'executionEngine':
          await executionEngine.initialize();
          break;
        case 'executionHistoryService':
          await executionHistoryService.initialize();
          break;
        case 'flowValidationService':
          await FlowValidationService.getInstance().initialize();
          break;
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }

      this.services.set(serviceName, true);
      console.log(
        `ServiceInitializer: ${serviceName} initialized successfully`
      );
    } catch (error) {
      const attempts = (this.retryAttempts.get(serviceName) || 0) + 1;
      this.retryAttempts.set(serviceName, attempts);

      if (attempts < this.MAX_RETRY_ATTEMPTS) {
        console.log(
          `ServiceInitializer: Retrying ${serviceName} (attempt ${attempts})...`
        );
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        return this.initializeService(serviceName);
      }

      console.error(
        `ServiceInitializer: Failed to initialize ${serviceName} after ${attempts} attempts:`,
        error
      );
      throw new Error(
        `Failed to initialize ${serviceName} after ${attempts} attempts`
      );
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getServiceStatus(): Record<string, boolean> {
    return Object.fromEntries(this.services);
  }

  public async checkHealth(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
    errors: string[];
    dependencies: Record<string, string[]>;
  }> {
    const errors: string[] = [];
    const serviceStatus: Record<string, boolean> = {};
    const dependencies: Record<string, string[]> = {};

    for (const [service, deps] of this.serviceDependencies.entries()) {
      dependencies[service] = deps;
      try {
        switch (service) {
          case 'apiKeyManager': {
            const { apiKeyManager } = await import('./ApiKeyManager');
            apiKeyManager.getAllProviders();
            break;
          }
          case 'llmService': {
            const { llmService } = await import('./LLMService');
            llmService.getAvailableProviders();
            break;
          }
          case 'executionEngine': {
            const { executionEngine } = await import('./ExecutionEngine');
            executionEngine.getSupportedNodeTypes();
            break;
          }
          case 'executionHistoryService': {
            const { ExecutionHistoryService } = await import(
              './ExecutionHistoryService'
            );
            ExecutionHistoryService.getInstance();
            break;
          }
          case 'flowValidationService': {
            const { FlowValidationService } = await import(
              './FlowValidationService'
            );
            FlowValidationService.getInstance();
            break;
          }
        }
        serviceStatus[service] = true;
      } catch (error) {
        serviceStatus[service] = false;
        errors.push(
          `${service}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      healthy: errors.length === 0,
      services: serviceStatus,
      errors,
      dependencies,
    };
  }
}

export const serviceInitializer = ServiceInitializer.getInstance();
