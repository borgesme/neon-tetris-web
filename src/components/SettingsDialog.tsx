import type { AppSettings } from '../storage/settings';
import { Dialog } from './Dialog';

interface SettingsDialogProps {
  open: boolean;
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

export function SettingsDialog({ open, settings, onChange, onClose }: SettingsDialogProps) {
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
    </Dialog>
  );
}
