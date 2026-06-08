import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { GameAction } from '../game/types';
import { createInitialState } from '../game/rules';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { Dialog } from './Dialog';
import { GamePanel } from './GamePanel';

describe('final interaction regressions', () => {
  afterEach(() => {
    cleanup();
  });

  test('keyboard game controls still work when a normal button has focus', () => {
    const dispatch = vi.fn((_: GameAction) => undefined);

    function Harness() {
      useKeyboardControls({ phase: 'playing', dispatch });
      return <button type="button">Start</button>;
    }

    render(<Harness />);
    const startButton = screen.getByRole('button', { name: 'Start' });
    startButton.focus();

    fireEvent.keyDown(startButton, { key: 'ArrowLeft', code: 'ArrowLeft' });

    expect(dispatch).toHaveBeenCalledWith({ type: 'move', dx: -1 });
  });

  test('Space keeps native and ARIA button activation available', () => {
    const dispatch = vi.fn((_: GameAction) => undefined);

    function Harness() {
      useKeyboardControls({ phase: 'playing', dispatch });
      return (
        <>
          <button type="button">Scores</button>
          <span role="button" tabIndex={0}>
            Custom button
          </span>
        </>
      );
    }

    render(<Harness />);

    for (const button of [
      screen.getByRole('button', { name: 'Scores' }),
      screen.getByRole('button', { name: 'Custom button' })
    ]) {
      button.focus();
      const event = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
        bubbles: true,
        cancelable: true
      });

      button.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    }

    expect(dispatch).not.toHaveBeenCalled();
  });

  test('Start click blur allows the next game keyboard action', () => {
    const dispatch = vi.fn((_: GameAction) => undefined);

    function Harness() {
      useKeyboardControls({ phase: 'playing', dispatch });
      return <GamePanel state={createInitialState(1)} dispatch={dispatch} />;
    }

    render(<Harness />);
    const startButton = screen.getByRole('button', { name: 'Start' });
    startButton.focus();

    fireEvent.click(startButton);
    fireEvent.keyDown(window, { key: 'ArrowLeft', code: 'ArrowLeft' });

    expect(dispatch).toHaveBeenCalledWith({ type: 'start' });
    expect(startButton).not.toBe(document.activeElement);
    expect(dispatch).toHaveBeenCalledWith({ type: 'move', dx: -1 });
  });

  test('dialog Tab and Shift+Tab loop within modal controls', () => {
    render(
      <Dialog title="Settings" open onClose={() => undefined}>
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Dialog>
    );

    const closeButton = screen.getByRole('button', { name: 'Close dialog' });
    const firstButton = screen.getByRole('button', { name: 'First action' });
    const lastButton = screen.getByRole('button', { name: 'Last action' });

    expect(closeButton).toBe(document.activeElement);

    lastButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(closeButton).toBe(document.activeElement);

    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(lastButton).toBe(document.activeElement);
    expect(firstButton).not.toBe(document.activeElement);
  });

  test('touch controls have a coarse pointer media rule for mobile landscape', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

    expect(css).toMatch(/@media[^{]*\(pointer:\s*coarse\)[^{]*\{/);
    expect(css).toMatch(/@media[^{]*\(hover:\s*none\)[^{]*\{/);
  });
});
