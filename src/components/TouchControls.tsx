import type { PointerEvent } from 'react';
import type { GameAction } from '../game/types';

interface TouchControlsProps {
  dispatch: (action: GameAction) => void;
}

interface TouchButton {
  label: string;
  action: GameAction;
  className?: string;
}

const TOUCH_BUTTONS: TouchButton[] = [
  { label: 'Left', action: { type: 'move', dx: -1 } },
  { label: 'Right', action: { type: 'move', dx: 1 } },
  { label: 'Rotate', action: { type: 'rotate', direction: 1 } },
  { label: 'Soft', action: { type: 'softDrop' } },
  { label: 'Drop', action: { type: 'hardDrop' }, className: 'primary' },
  { label: 'Hold', action: { type: 'hold' } }
];

export function TouchControls({ dispatch }: TouchControlsProps) {
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, action: GameAction) {
    event.preventDefault();
    dispatch(action);
  }

  return (
    <nav className="touch-controls" aria-label="Touch controls">
      {TOUCH_BUTTONS.map((button) => (
        <button
          className={button.className}
          key={button.label}
          type="button"
          onPointerDown={(event) => handlePointerDown(event, button.action)}
        >
          {button.label}
        </button>
      ))}
    </nav>
  );
}
