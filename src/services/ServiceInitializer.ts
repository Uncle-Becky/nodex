export class ServiceInitializer {
  private static instance: ServiceInitializer;
  private initialized = false;
  private services: Map<string, boolean> = new Map();

  private constructor() {}

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

    try {
      // Import and check all services
      const { apiKeyManager } = await import('./ApiKeyManager');
      const { executionEngine } = await import('./ExecutionEngine');
      const { llmService } = await import('./LLMService');

      // Check ApiKeyManager
      console.log('ServiceInitializer: Checking ApiKeyManager...');
      const providers = apiKeyManager.getAllProviders();
      console.log('ServiceInitializer: ApiKeyManager providers:', providers);
      this.services.set('apiKeyManager', true);

      // Check ExecutionEngine
      console.log('ServiceInitializer: Checking ExecutionEngine...');
      const supportedTypes = executionEngine.getSupportedNodeTypes();
      console.log(
        'ServiceInitializer: ExecutionEngine supported types:',
        supportedTypes
      );
      this.services.set('executionEngine', true);

      // Check LLMService
      console.log('ServiceInitializer: Checking LLMService...');
      const availableProviders = llmService.getAvailableProviders();
      console.log(
        'ServiceInitializer: LLMService available providers:',
        availableProviders
      );
      this.services.set('llmService', true);

      this.initialized = true;
      console.log('ServiceInitializer: All services initialized successfully');
    } catch (error) {
      console.error(
        'ServiceInitializer: Failed to initialize services:',
        error
      );
      throw error;
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
  }> {
    const errors: string[] = [];
    const serviceStatus: Record<string, boolean> = {};

    try {
      const { apiKeyManager } = await import('./ApiKeyManager');
      const { executionEngine } = await import('./ExecutionEngine');
      const { llmService } = await import('./LLMService');

      // Check each service
      try {
        apiKeyManager.getAllProviders();
        serviceStatus['apiKeyManager'] = true;
      } catch (error) {
        serviceStatus['apiKeyManager'] = false;
        errors.push(
          `ApiKeyManager: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      try {
        executionEngine.getSupportedNodeTypes();
        serviceStatus['executionEngine'] = true;
      } catch (error) {
        serviceStatus['executionEngine'] = false;
        errors.push(
          `ExecutionEngine: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      try {
        llmService.getAvailableProviders();
        serviceStatus['llmService'] = true;
      } catch (error) {
        serviceStatus['llmService'] = false;
        errors.push(
          `LLMService: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } catch (error) {
      errors.push(
        `Service import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      healthy: errors.length === 0,
      services: serviceStatus,
      errors,
    };
  }
}

export const serviceInitializer = ServiceInitializer.getInstance();
