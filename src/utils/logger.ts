const isDev = import.meta.env.DEV;

export class Logger {
  static log(...args: unknown[]) {
    if (isDev) {
      console.log(...args);
    }
  }

  static error(e: unknown) {
    if (isDev) {
      console.error(e);
    }
  }

  static warn(...args: unknown[]) {
    if (isDev) {
      console.warn(...args);
    }
  }

  static info(...args: unknown[]) {
    if (isDev) {
      console.info(...args);
    }
  }

  static debug(...args: unknown[]) {
    if (isDev) {
      console.debug(...args);
    }
  }

  static group(label: string) {
    if (isDev) {
      console.group(label);
    }
  }

  static groupEnd() {
    if (isDev) {
      console.groupEnd();
    }
  }

  static time(label: string) {
    if (isDev) {
      console.time(label);
    }
  }

  static timeEnd(label: string) {
    if (isDev) {
      console.timeEnd(label);
    }
  }

  // Service-specific loggers
  static service(serviceName: string, ...args: unknown[]) {
    if (isDev) {
      console.log(`[${serviceName}]`, ...args);
    }
  }

  static execution(nodeType: string, ...args: unknown[]) {
    if (isDev) {
      console.log(`[Execution:${nodeType}]`, ...args);
    }
  }

  static llm(provider: string, ...args: unknown[]) {
    if (isDev) {
      console.log(`[LLM:${provider}]`, ...args);
    }
  }

  static apiKey(provider: string, ...args: unknown[]) {
    if (isDev) {
      console.log(`[ApiKey:${provider}]`, ...args);
    }
  }

  // Force logging even in production (for critical errors)
  static forceError(e: unknown) {
    console.error(e);
  }

  static forceLog(...args: unknown[]) {
    console.log(...args);
  }
}
