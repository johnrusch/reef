/**
 * A custom React hook for testing function extraction and significance heuristic
 */
export function useTestHook(initialValue: number): { value: number; increment: () => void } {
  return {
    value: initialValue,
    increment: () => {},
  };
}
