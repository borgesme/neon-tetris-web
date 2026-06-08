# Tetris Sound Effects And Volume Design

## Context

Neon Tetris already has a `soundEnabled` setting in `src/storage/settings.ts`, but there is no audio engine, volume setting, or gameplay sound wiring yet. The game core in `src/game` is intentionally pure TypeScript and should remain free of DOM, browser audio, React, and storage dependencies.

This design adds lightweight generated sound effects through the Web Audio API. It does not introduce audio asset files, external sound libraries, or changes to pure game rules.

## Goals

- Add short arcade-style sound feedback for important gameplay and UI events.
- Add a user-adjustable volume setting.
- Preserve the existing sound on/off setting.
- Persist sound settings through the existing settings storage layer.
- Keep audio side effects outside `src/game`.
- Handle browser autoplay restrictions by unlocking audio from a user gesture.
- Keep the feature testable without requiring real audio playback in tests.

## Non-Goals

- No imported music tracks or sound effect files.
- No background music in the first sound iteration.
- No per-effect mixer, equalizer, or advanced audio settings.
- No dependency on a third-party audio library.
- No mutation of reducer behavior solely for audio.

## Recommended Approach

Use Web Audio API synthesis in a small audio module:

- `src/audio/soundEngine.ts` owns `AudioContext`, oscillator/envelope creation, volume clamping, sound event names, and audio unlock.
- `src/hooks/useSoundEffects.ts` observes the latest game state, previous game state, latest dispatched action, and app settings to decide which sound event should play.
- `src/App.tsx` records the latest dispatched action and calls the sound hook.
- `src/storage/settings.ts` adds a `volume` field while remaining backward compatible with older settings data.
- `src/components/SettingsDialog.tsx` adds a slider for volume.

The sound engine is deliberately independent from React. The hook is responsible for mapping app/game changes into sound events.

## Sound Events

The first iteration should support these events:

- `start`: game starts or restarts into active play.
- `pause`: game is paused.
- `resume`: game resumes from paused.
- `move`: successful left or right move.
- `rotate`: successful rotation.
- `softDrop`: successful soft drop.
- `hardDrop`: hard drop locks or moves a piece.
- `hold`: hold action changes the held piece.
- `lock`: piece locks due to gravity or soft drop reaching the stack.
- `lineClear`: one or more lines are cleared.
- `levelUp`: level increases after line clears.
- `gameOver`: phase changes to `gameOver`.
- `button`: non-game UI button feedback, optional for settings/open dialogs.

If multiple events happen in the same transition, priority should avoid noisy overlaps:

1. `gameOver`
2. `levelUp`
3. `lineClear`
4. action-specific sounds such as `hardDrop`, `hold`, or `rotate`
5. `lock`

## Settings Model

Extend `AppSettings`:

```ts
export interface AppSettings {
  theme: 'neon';
  soundEnabled: boolean;
  volume: number;
}
```

Default settings:

```ts
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'neon',
  soundEnabled: true,
  volume: 0.7
};
```

Storage migration rules:

- Existing valid settings with `{ theme: 'neon', soundEnabled: boolean }` remain valid and receive `volume: 0.7`.
- `volume` must be a finite number in the range `0..1`.
- Invalid stored data falls back to `DEFAULT_SETTINGS`.
- Writes persist the normalized full settings object.

## Settings UI

The settings dialog should keep the existing sound checkbox and add a volume row:

- Label: `Volume`
- Control: range input with `min="0"`, `max="1"`, `step="0.05"`
- Text display: rounded percentage, for example `70%`
- Disabled when `soundEnabled` is false

This preserves the existing settings surface while adding a clear volume control.

## Audio Engine Behavior

`soundEngine.ts` should export:

```ts
export type SoundEvent =
  | 'start'
  | 'pause'
  | 'resume'
  | 'move'
  | 'rotate'
  | 'softDrop'
  | 'hardDrop'
  | 'hold'
  | 'lock'
  | 'lineClear'
  | 'levelUp'
  | 'gameOver'
  | 'button';

export function unlockAudio(): void;
export function playSound(event: SoundEvent, volume: number): void;
export function disposeAudio(): void;
```

Implementation notes:

- Lazily create `AudioContext` on first unlock or play attempt.
- If Web Audio is unavailable, functions should no-op.
- Clamp volume to `0..1`.
- Use short oscillator envelopes to avoid lingering tones.
- Prefer simple waveforms and frequencies that match the Neon Dark arcade feel.
- Keep sounds short enough that rapid inputs do not create muddy playback.

## Data Flow

1. User presses a key, clicks a game button, or taps a touch control.
2. App dispatch wrapper records the latest `GameAction`.
3. Game reducer computes the next `GameState`.
4. `useSoundEffects` receives previous state, current state, latest action, and settings.
5. Hook decides whether a `SoundEvent` occurred.
6. If `settings.soundEnabled` is true, `playSound(event, settings.volume)` runs.

The reducer should not return audio events. This keeps the current pure core boundary intact.

## Browser Autoplay Handling

Browsers usually require audio to start from a user gesture. The app should call `unlockAudio()` from user-driven events:

- Start / restart / pause / resume buttons.
- Touch control taps.
- Keyboard dispatch path on recognized game keys.
- Settings sound toggle or volume slider interaction.

If unlock fails or audio remains suspended, playback should no-op without breaking gameplay.

## Testing Strategy

Add tests without requiring real sound playback:

- Settings storage tests:
  - New settings persist `volume`.
  - Old settings without `volume` migrate to default volume.
  - Invalid volume values fall back to defaults.
  - Memory fallback preserves full settings including volume.
- Settings dialog tests:
  - Slider displays the current percentage.
  - Slider calls `onChange` with updated `volume`.
  - Slider is disabled when sound is off.
- Sound engine tests:
  - `playSound` no-ops when Web Audio is unavailable.
  - Volume is clamped before gain is applied.
  - Known sound events are accepted.
- Hook tests:
  - `lineClear`, `levelUp`, and `gameOver` are detected from state transitions.
  - `soundEnabled: false` prevents playback.

Final verification remains:

```powershell
pnpm.cmd test
pnpm.cmd build
```

## Risks And Constraints

- Web Audio support varies slightly across browsers; unavailable audio must degrade to no-op.
- AudioContext unlock can be blocked until a user gesture; the implementation must not assume sound is immediately playable.
- Rapid repeated moves can overlap many short sounds; keep move sounds quiet and very short.
- Detecting action success by state comparison is safer than playing on every dispatched action because invalid moves should not sound successful.
- The implementation should avoid adding sound events to `GameState` unless state comparison proves insufficient.

## Acceptance Criteria

- Settings include a working sound toggle and volume slider.
- Sound settings persist and migrate old stored settings.
- Gameplay remains usable if Web Audio is unavailable.
- Start, movement, rotation, drops, hold, line clear, level up, pause/resume, and game over have distinct lightweight sound feedback.
- Game core remains free of browser audio and React dependencies.
- Automated tests and production build pass.

## Self-Review

- Completeness scan: all sections are concrete and actionable.
- Scope check: focused on generated sound effects and volume only; no background music or online systems.
- Boundary check: reducer purity is preserved; audio is handled by UI-side modules.
- Ambiguity check: volume range, default value, migration behavior, event priority, and acceptance criteria are explicit.
