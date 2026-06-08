export interface AppSettings {
  theme: 'neon';
  soundEnabled: boolean;
  volume: number;
}

const SETTINGS_KEY = 'tetris:settings';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'neon',
  soundEnabled: true,
  volume: 0.7
};

let memorySettings: AppSettings = DEFAULT_SETTINGS;
let useMemoryFallback = false;

function isBaseSettings(
  value: unknown
): value is Pick<AppSettings, 'theme' | 'soundEnabled'> & Partial<Pick<AppSettings, 'volume'>> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const settings = value as Partial<AppSettings>;
  return settings.theme === 'neon' && typeof settings.soundEnabled === 'boolean';
}

function normalizeSettings(value: unknown): AppSettings {
  if (!isBaseSettings(value)) {
    return DEFAULT_SETTINGS;
  }

  if (value.volume === undefined) {
    return {
      ...value,
      volume: DEFAULT_SETTINGS.volume
    };
  }

  if (!Number.isFinite(value.volume) || value.volume < 0 || value.volume > 1) {
    return DEFAULT_SETTINGS;
  }

  return {
    theme: value.theme,
    soundEnabled: value.soundEnabled,
    volume: value.volume
  };
}

export function readSettings(): AppSettings {
  if (useMemoryFallback) {
    return memorySettings;
  }

  let storedSettings: string | null;

  try {
    storedSettings = localStorage.getItem(SETTINGS_KEY);
  } catch {
    return memorySettings;
  }

  if (storedSettings === null) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsedSettings: unknown = JSON.parse(storedSettings);
    return normalizeSettings(parsedSettings);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: AppSettings): void {
  const normalizedSettings = normalizeSettings(settings);
  memorySettings = normalizedSettings;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizedSettings));
    useMemoryFallback = false;
  } catch {
    useMemoryFallback = true;
    // Keep the in-memory fallback updated when storage writes are blocked.
  }
}
