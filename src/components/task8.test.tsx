import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { AppSettings } from '../storage/settings';
import { Dialog } from './Dialog';
import { LeaderboardDialog } from './LeaderboardDialog';
import { PwaInstallButton } from './PwaInstallButton';
import { SettingsDialog } from './SettingsDialog';

const readScoresMock = vi.hoisted(() => vi.fn());

vi.mock('../storage/leaderboard', () => ({
  readScores: readScoresMock
}));

describe('Task 8 dialogs and PWA controls', () => {
  afterEach(() => {
    cleanup();
    readScoresMock.mockReset();
  });

  test('leaderboard dialog renders an empty state', () => {
    readScoresMock.mockReturnValue([]);

    render(<LeaderboardDialog open refreshKey={0} onClose={() => undefined} />);

    expect(screen.getByRole('dialog', { name: 'Local Leaderboard' })).toBeTruthy();
    expect(screen.getByText('No scores yet.')).toBeTruthy();
  });

  test('leaderboard dialog renders scores with level and lines', () => {
    readScoresMock.mockReturnValue([
      { score: 12000, level: 8, lines: 64, createdAt: '2026-06-08T00:00:00.000Z' }
    ]);

    render(<LeaderboardDialog open refreshKey={0} onClose={() => undefined} />);

    expect(screen.getByText('12000')).toBeTruthy();
    expect(screen.getByText('Level 8')).toBeTruthy();
    expect(screen.getByText('64 lines')).toBeTruthy();
  });

  test('settings dialog changes sound setting', () => {
    const settings: AppSettings = { theme: 'neon', soundEnabled: true };
    const onChange = vi.fn();

    render(
      <SettingsDialog open settings={settings} onChange={onChange} onClose={() => undefined} />
    );

    expect(screen.getByRole('option', { name: 'Neon Dark' })).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sound' }));

    expect(onChange).toHaveBeenCalledWith({ theme: 'neon', soundEnabled: false });
  });

  test('PWA install button appears after beforeinstallprompt and clears after choice', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    render(<PwaInstallButton />);

    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull();
    act(() => {
      window.dispatchEvent(event);
    });

    const button = await screen.findByRole('button', { name: 'Install' });
    expect(preventDefault).toHaveBeenCalled();

    fireEvent.click(button);

    await waitFor(() => expect(prompt).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Install' })).toBeNull());
  });

  test('dialog closes on Escape and restores focus', () => {
    function DialogHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open trigger
          </button>
          <Dialog title="Settings" open={open} onClose={() => setOpen(false)}>
            <button type="button">Inside dialog</button>
          </Dialog>
        </>
      );
    }

    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Open trigger' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('button', { name: 'Close dialog' })).toBe(document.activeElement);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
    expect(trigger).toBe(document.activeElement);
  });

  test('dialog keeps focus when only onClose identity changes', () => {
    function DialogHarness() {
      const [version, setVersion] = useState(0);
      const onClose = version === 0 ? () => undefined : () => undefined;
      return (
        <>
          <button type="button" onClick={() => setVersion((value) => value + 1)}>
            Rerender
          </button>
          <Dialog title="Settings" open onClose={onClose}>
            <button type="button">Inside dialog</button>
          </Dialog>
        </>
      );
    }

    render(<DialogHarness />);

    const inside = screen.getByRole('button', { name: 'Inside dialog' });
    inside.focus();

    fireEvent.click(screen.getByRole('button', { name: 'Rerender' }));

    expect(inside).toBe(document.activeElement);
  });

  test('leaderboard dialog updates when refreshKey changes', () => {
    let scores = [
      { score: 900, level: 3, lines: 18, createdAt: '2026-06-08T00:07:00.000Z' }
    ];
    readScoresMock.mockImplementation(() => scores);

    const { rerender } = render(
      <LeaderboardDialog open refreshKey={0} onClose={() => undefined} />
    );

    expect(screen.getByText('900')).toBeTruthy();

    scores = [
      { score: 1800, level: 5, lines: 32, createdAt: '2026-06-08T00:08:00.000Z' }
    ];
    rerender(<LeaderboardDialog open refreshKey={1} onClose={() => undefined} />);

    expect(screen.getByText('1800')).toBeTruthy();
  });
});
