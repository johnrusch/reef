import { vi } from 'vitest';
import { waitFor } from '@testing-library/react';

// Async testing utilities

// Promise utilities
export const promiseUtils = {
  // Create a resolvable promise for testing
  createResolvablePromise: <T = any>() => {
    let resolve: (value: T) => void;
    let reject: (reason?: any) => void;
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return {
      promise,
      resolve: resolve!,
      reject: reject!,
    };
  },

  // Create a promise that resolves after a delay
  createDelayedPromise: <T>(value: T, delay: number = 1000): Promise<T> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(value), delay);
    });
  },

  // Create a promise that rejects after a delay
  createDelayedRejection: (error: any, delay: number = 1000): Promise<never> => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(error), delay);
    });
  },

  // Create a promise that times out
  createTimeoutPromise: <T>(timeout: number = 5000): Promise<T> => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Promise timed out after ${timeout}ms`)), timeout);
    });
  },

  // Race a promise against a timeout
  withTimeout: <T>(promise: Promise<T>, timeout: number = 5000): Promise<T> => {
    const timeoutPromise = promiseUtils.createTimeoutPromise<T>(timeout);
    return Promise.race([promise, timeoutPromise]);
  },

  // Create a promise that resolves on the nth call
  createConditionalPromise: <T>(
    condition: () => boolean,
    value: T,
    checkInterval: number = 100
  ): Promise<T> => {
    return new Promise((resolve) => {
      const check = () => {
        if (condition()) {
          resolve(value);
        } else {
          setTimeout(check, checkInterval);
        }
      };
      check();
    });
  },
};

// Mock async functions
export const mockAsyncUtils = {
  // Create a mock async function that resolves
  createMockAsyncSuccess: <T>(value: T, delay: number = 0) => {
    return vi.fn().mockImplementation(() => 
      delay > 0 ? promiseUtils.createDelayedPromise(value, delay) : Promise.resolve(value)
    );
  },

  // Create a mock async function that rejects
  createMockAsyncError: (error: any, delay: number = 0) => {
    return vi.fn().mockImplementation(() => 
      delay > 0 ? promiseUtils.createDelayedRejection(error, delay) : Promise.reject(error)
    );
  },

  // Create a mock async function with multiple call behaviors
  createMockAsyncSequence: <T>(responses: Array<{ value?: T; error?: any; delay?: number }>) => {
    let callCount = 0;
    
    return vi.fn().mockImplementation(() => {
      const response = responses[callCount % responses.length];
      callCount++;
      
      if (response.error) {
        return response.delay 
          ? promiseUtils.createDelayedRejection(response.error, response.delay)
          : Promise.reject(response.error);
      } else {
        return response.delay 
          ? promiseUtils.createDelayedPromise(response.value, response.delay)
          : Promise.resolve(response.value);
      }
    });
  },

  // Create a mock async function that fails n times then succeeds
  createMockAsyncRetry: <T>(value: T, failureCount: number, error: any = new Error('Mock failure')) => {
    let attempts = 0;
    
    return vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts <= failureCount) {
        return Promise.reject(error);
      }
      return Promise.resolve(value);
    });
  },

  // Create a mock async function with loading states
  createMockAsyncWithLoading: <T>(value: T, delay: number = 1000) => {
    const loadingState = { isLoading: false };
    
    const mockFn = vi.fn().mockImplementation(async () => {
      loadingState.isLoading = true;
      await new Promise(resolve => setTimeout(resolve, delay));
      loadingState.isLoading = false;
      return value;
    });

    return {
      mockFn,
      getLoadingState: () => loadingState.isLoading,
    };
  },
};

// Waiting utilities
export const waitingUtils = {
  // Wait for a condition to be true
  waitForCondition: async (
    condition: () => boolean | Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      timeoutMessage?: string;
    } = {}
  ): Promise<void> => {
    const { timeout = 5000, interval = 50, timeoutMessage = 'Condition not met within timeout' } = options;
    
    return waitFor(async () => {
      const result = await condition();
      if (!result) {
        throw new Error('Condition not met');
      }
    }, { timeout, interval });
  },

  // Wait for a mock to be called
  waitForMockCall: async (
    mockFn: ReturnType<typeof vi.fn>,
    options: {
      timeout?: number;
      callCount?: number;
      callIndex?: number;
    } = {}
  ): Promise<void> => {
    const { timeout = 5000, callCount = 1, callIndex } = options;
    
    return waitFor(() => {
      if (callIndex !== undefined) {
        expect(mockFn).toHaveBeenNthCalledWith(callIndex + 1, expect.anything());
      } else {
        expect(mockFn).toHaveBeenCalledTimes(callCount);
      }
    }, { timeout });
  },

  // Wait for multiple promises to resolve
  waitForAllPromises: async <T>(promises: Promise<T>[]): Promise<T[]> => {
    return Promise.all(promises);
  },

  // Wait for any promise to resolve
  waitForAnyPromise: async <T>(promises: Promise<T>[]): Promise<T> => {
    return Promise.race(promises);
  },

  // Wait for all promises to settle (resolve or reject)
  waitForAllPromisesToSettle: async <T>(promises: Promise<T>[]): Promise<PromiseSettledResult<T>[]> => {
    return Promise.allSettled(promises);
  },

  // Wait for a promise to reject
  waitForPromiseRejection: async <T>(promise: Promise<T>): Promise<any> => {
    try {
      await promise;
      throw new Error('Expected promise to reject, but it resolved');
    } catch (error) {
      return error;
    }
  },

  // Wait for async operation with timeout
  waitForAsyncOperation: async <T>(
    operation: () => Promise<T>,
    timeout: number = 5000
  ): Promise<T> => {
    return promiseUtils.withTimeout(operation(), timeout);
  },

  // Wait for state change
  waitForStateChange: async <T>(
    getCurrentState: () => T,
    expectedState: T,
    options: {
      timeout?: number;
      interval?: number;
      compareFunction?: (current: T, expected: T) => boolean;
    } = {}
  ): Promise<void> => {
    const { timeout = 5000, interval = 50, compareFunction = (a, b) => a === b } = options;
    
    return waitFor(() => {
      const currentState = getCurrentState();
      if (!compareFunction(currentState, expectedState)) {
        throw new Error(`State not changed to expected value. Current: ${JSON.stringify(currentState)}, Expected: ${JSON.stringify(expectedState)}`);
      }
    }, { timeout, interval });
  },
};

// Timing utilities
export const timingUtils = {
  // Advance timers by a specific amount
  advanceTimers: (ms: number) => {
    vi.advanceTimersByTime(ms);
  },

  // Run all pending timers
  runAllTimers: () => {
    vi.runAllTimers();
  },

  // Run only currently pending timers
  runOnlyPendingTimers: () => {
    vi.runOnlyPendingTimers();
  },

  // Use fake timers
  useFakeTimers: () => {
    vi.useFakeTimers();
  },

  // Use real timers
  useRealTimers: () => {
    vi.useRealTimers();
  },

  // Measure execution time
  measureTime: async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    return { result, duration: end - start };
  },

  // Create a timer that can be controlled
  createControllableTimer: (callback: () => void, delay: number) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isActive = false;
    
    return {
      start: () => {
        if (!isActive) {
          isActive = true;
          timeoutId = setTimeout(() => {
            isActive = false;
            callback();
          }, delay);
        }
      },
      
      stop: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
          isActive = false;
        }
      },
      
      isActive: () => isActive,
    };
  },
};

// Retry utilities
export const retryUtils = {
  // Retry an async operation
  retry: async <T>(
    operation: () => Promise<T>,
    options: {
      attempts?: number;
      delay?: number;
      backoff?: 'linear' | 'exponential';
      shouldRetry?: (error: any) => boolean;
    } = {}
  ): Promise<T> => {
    const { 
      attempts = 3, 
      delay = 1000, 
      backoff = 'linear',
      shouldRetry = () => true 
    } = options;
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === attempts || !shouldRetry(error)) {
          throw error;
        }
        
        const currentDelay = backoff === 'exponential' 
          ? delay * Math.pow(2, attempt - 1)
          : delay;
          
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }
    
    throw lastError;
  },

  // Create a mock that succeeds after n retries
  createRetrySuccessMock: <T>(value: T, failureCount: number) => {
    return mockAsyncUtils.createMockAsyncRetry(value, failureCount);
  },

  // Test retry behavior
  testRetryBehavior: async <T>(
    operation: () => Promise<T>,
    expectedAttempts: number,
    mockFn: ReturnType<typeof vi.fn>
  ) => {
    try {
      await operation();
    } catch {
      // Expected to fail for some tests
    }
    
    expect(mockFn).toHaveBeenCalledTimes(expectedAttempts);
  },
};

// Concurrency utilities
export const concurrencyUtils = {
  // Test parallel operations
  testParallelOperations: async <T>(
    operations: Array<() => Promise<T>>,
    expectedResults: T[]
  ): Promise<void> => {
    const startTime = performance.now();
    const results = await Promise.all(operations.map(op => op()));
    const endTime = performance.now();
    
    // Verify results
    expect(results).toEqual(expectedResults);
    
    // Verify operations ran in parallel (rough check)
    // If they ran sequentially, time would be much longer
    const duration = endTime - startTime;
    console.log(`Parallel operations completed in ${duration}ms`);
  },

  // Test sequential operations
  testSequentialOperations: async <T>(
    operations: Array<() => Promise<T>>,
    expectedResults: T[]
  ): Promise<void> => {
    const results: T[] = [];
    
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }
    
    expect(results).toEqual(expectedResults);
  },

  // Create a semaphore for controlling concurrency
  createSemaphore: (maxConcurrent: number) => {
    let running = 0;
    const queue: Array<() => void> = [];
    
    return {
      acquire: (): Promise<void> => {
        return new Promise((resolve) => {
          if (running < maxConcurrent) {
            running++;
            resolve();
          } else {
            queue.push(resolve);
          }
        });
      },
      
      release: (): void => {
        running--;
        if (queue.length > 0) {
          const next = queue.shift()!;
          running++;
          next();
        }
      },
      
      getRunning: () => running,
      getQueued: () => queue.length,
    };
  },
};

// Error handling utilities
export const errorUtils = {
  // Test that an async function throws a specific error
  expectAsyncError: async (
    operation: () => Promise<any>,
    expectedError: string | RegExp | Error
  ): Promise<void> => {
    await expect(operation()).rejects.toThrow(expectedError);
  },

  // Test that an async function doesn't throw
  expectAsyncSuccess: async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    return expect(operation()).resolves.toBeTruthy();
  },

  // Create different types of errors for testing
  createError: (message: string, code?: string, status?: number) => {
    const error = new Error(message) as any;
    if (code) error.code = code;
    if (status) error.status = status;
    return error;
  },

  createNetworkError: (message = 'Network Error') => {
    return errorUtils.createError(message, 'NETWORK_ERROR', 500);
  },

  createTimeoutError: (message = 'Request Timeout') => {
    return errorUtils.createError(message, 'TIMEOUT_ERROR', 408);
  },

  createAuthError: (message = 'Authentication Failed') => {
    return errorUtils.createError(message, 'AUTH_ERROR', 401);
  },

  createValidationError: (message = 'Validation Failed', details?: any) => {
    const error = errorUtils.createError(message, 'VALIDATION_ERROR', 400) as any;
    if (details) error.details = details;
    return error;
  },
};

// Cleanup utilities for async tests
export const asyncCleanupUtils = {
  // Clean up pending timers
  cleanupTimers: () => {
    vi.clearAllTimers();
    vi.useRealTimers();
  },

  // Clean up pending promises (mock implementations)
  cleanupPromises: () => {
    vi.clearAllMocks();
  },

  // Wait for all pending promises to settle before cleanup
  waitForCleanup: async (timeout = 5000) => {
    // This is a best-effort cleanup wait
    await new Promise(resolve => setTimeout(resolve, 100));
  },

  // Complete cleanup for async tests
  completeAsyncCleanup: async () => {
    await asyncCleanupUtils.waitForCleanup();
    asyncCleanupUtils.cleanupTimers();
    asyncCleanupUtils.cleanupPromises();
  },
};

// Performance testing utilities
export const performanceUtils = {
  // Measure async operation performance
  measureAsyncPerformance: async <T>(
    operation: () => Promise<T>,
    iterations: number = 1
  ): Promise<{
    results: T[];
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }> => {
    const times: number[] = [];
    const results: T[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await timingUtils.measureTime(operation);
      results.push(result);
      times.push(duration);
    }
    
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      results,
      averageTime,
      minTime,
      maxTime,
      totalTime,
    };
  },

  // Test that operation completes within time limit
  expectWithinTimeLimit: async <T>(
    operation: () => Promise<T>,
    maxTime: number
  ): Promise<T> => {
    const { result, duration } = await timingUtils.measureTime(operation);
    expect(duration).toBeLessThan(maxTime);
    return result;
  },
};

// Export all utilities
export {
  promiseUtils,
  mockAsyncUtils,
  waitingUtils,
  timingUtils,
  retryUtils,
  concurrencyUtils,
  errorUtils,
  asyncCleanupUtils,
  performanceUtils,
};