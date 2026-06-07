import { useEffect, useState } from 'react';

function readStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue === null ? defaultValue : (JSON.parse(storedValue) as T);
  } catch {
    return defaultValue;
  }
}

export function usePersistentState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => readStoredValue(key, defaultValue));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Persistence is best-effort; callers still keep in-memory state.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
