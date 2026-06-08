import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { TOUCH_REPEAT_DELAY_MS, TOUCH_REPEAT_INTERVAL_MS, TouchControls } from './TouchControls';

describe('TouchControls', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('repeats movement actions while a touch control is held', () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();

    render(<TouchControls dispatch={dispatch} />);
    const leftButton = screen.getByRole('button', { name: 'Left' });

    fireEvent.pointerDown(leftButton);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'move', dx: -1 });

    act(() => {
      vi.advanceTimersByTime(TOUCH_REPEAT_DELAY_MS);
    });

    expect(dispatch).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(TOUCH_REPEAT_INTERVAL_MS * 2);
    });

    expect(dispatch).toHaveBeenCalledTimes(4);

    fireEvent.pointerUp(leftButton);

    act(() => {
      vi.advanceTimersByTime(TOUCH_REPEAT_INTERVAL_MS * 2);
    });

    expect(dispatch).toHaveBeenCalledTimes(4);
  });
});
