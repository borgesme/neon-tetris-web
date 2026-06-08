import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createInitialState } from '../game/rules';
import type { GameAction, GameState } from '../game/types';
import { getSoundEvent, useSoundEffects } from './useSoundEffects';

const playSoundMock = vi.hoisted(() => vi.fn());

vi.mock('../audio/soundEngine', () => ({
  playSound: playSoundMock
}));

function playingState(seed = 1): GameState {
  return {
    ...createInitialState(seed),
    phase: 'playing'
  };
}

function SoundHarness({
  state,
  action,
  actionId,
  soundEnabled = true
}: {
  state: GameState;
  action: GameAction | null;
  actionId: number;
  soundEnabled?: boolean;
}) {
  useSoundEffects({
    state,
    action,
    actionId,
    settings: { theme: 'neon', soundEnabled, volume: 0.4 }
  });

  return null;
}

describe('useSoundEffects', () => {
  afterEach(() => {
    cleanup();
    playSoundMock.mockReset();
  });

  test('getSoundEvent prioritizes gameOver, levelUp, and lineClear transitions', () => {
    const previous = playingState();

    expect(
      getSoundEvent(previous, { ...previous, phase: 'gameOver' }, { type: 'tick' })
    ).toBe('gameOver');
    expect(
      getSoundEvent(
        previous,
        { ...previous, stats: { score: 1200, lines: 10, level: 2 } },
        { type: 'hardDrop' }
      )
    ).toBe('levelUp');
    expect(
      getSoundEvent(
        previous,
        { ...previous, stats: { score: 100, lines: 1, level: 1 } },
        { type: 'tick' }
      )
    ).toBe('lineClear');
  });

  test('getSoundEvent maps successful gameplay actions and ignores no-op moves', () => {
    const previous = playingState();
    const moved = {
      ...previous,
      active: {
        ...previous.active,
        position: { ...previous.active.position, x: previous.active.position.x + 1 }
      }
    };
    const rotated = {
      ...previous,
      active: { ...previous.active, rotation: previous.active.rotation + 1 }
    };

    expect(getSoundEvent(previous, moved, { type: 'move', dx: 1 })).toBe('move');
    expect(getSoundEvent(previous, rotated, { type: 'rotate', direction: 1 })).toBe('rotate');
    expect(getSoundEvent(previous, previous, { type: 'move', dx: 1 })).toBeUndefined();
  });

  test('hook plays detected sound with configured volume', () => {
    const previous = playingState();
    const current = { ...previous, stats: { score: 100, lines: 1, level: 1 } };
    const { rerender } = render(
      <SoundHarness state={previous} action={null} actionId={0} />
    );

    rerender(<SoundHarness state={current} action={{ type: 'tick' }} actionId={1} />);

    expect(playSoundMock).toHaveBeenCalledWith('lineClear', 0.4);
  });

  test('hook does not play when sound is disabled', () => {
    const previous = playingState();
    const current = { ...previous, phase: 'gameOver' as const };
    const { rerender } = render(
      <SoundHarness state={previous} action={null} actionId={0} soundEnabled={false} />
    );

    rerender(
      <SoundHarness
        state={current}
        action={{ type: 'tick' }}
        actionId={1}
        soundEnabled={false}
      />
    );

    expect(playSoundMock).not.toHaveBeenCalled();
  });
});
