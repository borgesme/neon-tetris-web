export interface AppSettings {
  theme: 'neon';
  soundEnabled: boolean;
}

const SETTINGS_KEY = 'tetris:settings';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'neon',
  soundEnabled: true
};

let memorySettings: AppSettings = DEFAULT_SETTINGS;
let useMemoryFallback = false;

function isAppSettings(value: unknown): value is AppSettings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const settings = value as AppSettings;
  return settings.theme === 'neon' && typeof settings.soundEnabled === 'boolean';
}

export function readSettings(): AppSettings {
  let storedSettings: string | null;

  try {
    storedSettings = localStorage.getItem(SETTINGS_KEY);
  } catch {
    return memorySettings;
  }

  if (storedSettings === null) {
    return useMemoryFallback ? memorySettings : DEFAULT_SETTINGS;
  }

  try {
    const parsedSettings: unknown = JSON.parse(storedSettings);
    return isAppSettings(parsedSettings) ? parsedSettings : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: AppSettings): void {
  memorySettings = settings;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    useMemoryFallback = false;
  } catch {
    useMemoryFallback = true;
    // Keep the in-memory fallback updated when storage writes are blocked.
  }
}
