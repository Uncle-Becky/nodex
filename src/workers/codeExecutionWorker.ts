self.onmessage = async (
  event: MessageEvent<{
    code: string;
    env: Record<string, unknown>;
    timeout: number;
  }>
) => {
  const { code, env, timeout } = event.data;

  // Ensure env is a clean object
  const cleanEnv = { ...env };
  const envKeys = Object.keys(cleanEnv);
  const envValues = Object.values(cleanEnv);

  let timeoutId: number | undefined;

  const executionPromise = new Promise((resolve, reject) => {
    try {
      // Construct the function with strict mode and provided environment variables
      const func = new Function(...envKeys, '"use strict";' + code);
      const result = func(...envValues);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });

  const timeoutPromise = new Promise((_resolve, reject) => {
    timeoutId = self.setTimeout(() => {
      reject(new Error(`Execution timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    const result = await Promise.race([executionPromise, timeoutPromise]);
    self.postMessage({ status: 'success', result });
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    self.postMessage({ status: 'error', error: errorMessage });
  } finally {
    if (timeoutId !== undefined) {
      self.clearTimeout(timeoutId);
    }
  }
};

// Optional: Add an error handler for unhandled errors in the worker itself
self.onerror = (event: ErrorEvent) => {
  self.postMessage({
    status: 'error',
    error: `Unhandled error in worker: ${event.message}`,
  });
  return true; // Prevents the default browser error handling
};
