import { useEffect, useRef } from 'react';
import type { GameAction } from '../game/types';

interface TouchControlsProps {
  dispatch: (action: GameAction) => void;
}

interface TouchButton {
  label: string;
  action: GameAction;
  className?: string;
  repeat?: boolean;
}

export const TOUCH_REPEAT_DELAY_MS = 180;
export const TOUCH_REPEAT_INTERVAL_MS = 80;

const TOUCH_BUTTONS: TouchButton[] = [
  { label: 'Left', action: { type: 'move', dx: -1 }, repeat: true },
  { label: 'Right', action: { type: 'move', dx: 1 }, repeat: true },
  { label: 'Rotate', action: { type: 'rotate', direction: 1 } },
  { label: 'Soft', action: { type: 'softDrop' }, repeat: true },
  { label: 'Drop', action: { type: 'hardDrop' }, className: 'primary' },
  { label: 'Hold', action: { type: 'hold' } }
];

interface RepeatTimers {
  delayId: number;
  intervalId: number | null;
}

export function TouchControls({ dispatch }: TouchControlsProps) {
  const repeatTimersRef = useRef<RepeatTimers | null>(null);
  const suppressNextClickRef = useRef(false);

  const stopRepeat = () => {
    const timers = repeatTimersRef.current;
    if (!timers) {
      return;
    }

    window.clearTimeout(timers.delayId);
    if (timers.intervalId !== null) {
      window.clearInterval(timers.intervalId);
    }
    repeatTimersRef.current = null;
  };

  const startRepeat = (button: TouchButton) => {
    if (!button.repeat) {
      return;
    }

    stopRepeat();
    suppressNextClickRef.current = true;
    dispatch(button.action);

    const timers: RepeatTimers = {
      delayId: window.setTimeout(() => {
        dispatch(button.action);
        timers.intervalId = window.setInterval(
          () => dispatch(button.action),
          TOUCH_REPEAT_INTERVAL_MS
        );
      }, TOUCH_REPEAT_DELAY_MS),
      intervalId: null
    };

    repeatTimersRef.current = timers;
  };

  useEffect(() => stopRepeat, []);

  return (
    <nav className="touch-controls" aria-label="Touch controls">
      {TOUCH_BUTTONS.map((button) => (
        <button
          className={button.className}
          key={button.label}
          type="button"
          onBlur={stopRepeat}
          onClick={() => {
            if (suppressNextClickRef.current) {
              suppressNextClickRef.current = false;
              return;
            }
            dispatch(button.action);
          }}
          onPointerCancel={stopRepeat}
          onPointerDown={() => startRepeat(button)}
          onPointerLeave={stopRepeat}
          onPointerUp={stopRepeat}
        >
          {button.label}
        </button>
      ))}
    </nav>
  );
}
