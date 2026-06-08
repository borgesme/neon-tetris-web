import type { AppSettings } from '../storage/settings';
import { Dialog } from './Dialog';

interface SettingsDialogProps {
  open: boolean;
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

export function SettingsDialog({ open, settings, onChange, onClose }: SettingsDialogProps) {
  const volumePercent = Math.round(settings.volume * 100);

  return (
    <Dialog title="Settings" open={open} onClose={onClose}>
      <label className="setting-row">
        <span>Theme</span>
        <select value={settings.theme} onChange={() => onChange({ ...settings, theme: 'neon' })}>
          <option value="neon">Neon Dark</option>
        </select>
      </label>
      <label className="setting-row">
        <span>Sound</span>
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(event) => onChange({ ...settings, soundEnabled: event.currentTarget.checked })}
        />
      </label>
      <div className="setting-row">
        <span id="volume-setting-label">Volume</span>
        <span className="volume-control">
          <input
            aria-labelledby="volume-setting-label"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            disabled={!settings.soundEnabled}
            onChange={(event) =>
              onChange({ ...settings, volume: Number(event.currentTarget.value) })
            }
          />
          <span aria-live="polite">{volumePercent}%</span>
        </span>
      </div>
    </Dialog>
  );
}
