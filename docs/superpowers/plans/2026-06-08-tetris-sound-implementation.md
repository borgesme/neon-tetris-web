# Tetris Sound Effects And Volume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add generated arcade sound effects and a persisted user-adjustable volume setting to Neon Tetris.

**Architecture:** Keep browser audio side effects outside `src/game`. `src/audio/soundEngine.ts` owns Web Audio synthesis and volume clamping, `src/hooks/useSoundEffects.ts` maps game state transitions to sound events, and `src/App.tsx` records the latest action and unlocks audio from user gestures.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, Web Audio API, plain CSS.

## Current Execution Status

- 2026-06-08: Implementation was completed before this plan document was backfilled.
- Implemented in commit `a776609 feat: 增加音效和音量设置`.
- Verification passed with `pnpm.cmd test`; result: 6 test files and 54 tests passed.
- Production build passed with `pnpm.cmd build`; Vite and PWA generation completed successfully.

---

## Scope Check

This is one bounded frontend feature. It adds audio feedback and sound settings only; it does not add imported audio assets, background music, a mixer, third-party audio libraries, or reducer-owned audio events.

## File Structure

Create these files:

- `src/audio/soundEngine.ts`: Web Audio context lifecycle, sound event names, oscillator envelopes, volume clamping, audio unlock, and disposal.
- `src/audio/soundEngine.test.ts`: fake `AudioContext` tests for no-op behavior, volume clamping, and known sound events.
- `src/hooks/useSoundEffects.ts`: pure event detection plus React hook that plays sounds from previous/current game state and latest action.
- `src/hooks/useSoundEffects.test.tsx`: sound event priority, no-op action, hook playback, and sound-disabled tests.

Modify these files:

- `src/App.tsx`: wrap reducer state with `lastAction` and `actionId`, call `useSoundEffects`, and call `unlockAudio()` from user-driven dispatch/settings changes.
- `src/storage/settings.ts`: add `volume`, default `0.7`, migration for old settings, validation, and normalized writes.
- `src/storage/storage.test.ts`: cover volume persistence, migration, invalid volume fallback, and memory fallback.
- `src/components/SettingsDialog.tsx`: add a volume range control with a stable accessible name and disabled state when sound is off.
- `src/components/task8.test.tsx`: cover sound toggle preservation and volume slider behavior.
- `src/styles.css`: style the volume slider row.
- `README.md`: document sound effects, volume setting, audio module structure, and verification coverage.

---

### Task 1: Settings Storage Volume Migration

**Files:**
- Modify: `src/storage/settings.ts`
- Modify: `src/storage/storage.test.ts`

- [x] **Step 1: Write settings storage tests for volume**

Add coverage to `src/storage/storage.test.ts`:

```ts
test('settings persist theme/sound and invalid data falls back to defaults', async () => {
  const { settings } = await loadStorageModules();

  settings.writeSettings({ theme: 'neon', soundEnabled: false, volume: 0.45 });

  expect(settings.readSettings()).toEqual({ theme: 'neon', soundEnabled: false, volume: 0.45 });

  localStorage.setItem('tetris:settings', '{"theme":"retro","soundEnabled":"yes"}');

  expect(settings.readSettings()).toEqual({ theme: 'neon', soundEnabled: true, volume: 0.7 });
});

test('settings migrate missing volume and reject invalid volume values', async () => {
  const { settings } = await loadStorageModules();

  localStorage.setItem('tetris:settings', '{"theme":"neon","soundEnabled":false}');

  expect(settings.readSettings()).toEqual({ theme: 'neon', soundEnabled: false, volume: 0.7 });

  localStorage.setItem('tetris:settings', '{"theme":"neon","soundEnabled":false,"volume":2}');

  expect(settings.readSettings()).toEqual({ theme: 'neon', soundEnabled: true, volume: 0.7 });
});
```

- [x] **Step 2: Run storage tests and verify they fail before implementation**

Run:

```powershell
pnpm.cmd test -- src/storage/storage.test.ts
```

Expected before implementation: TypeScript or assertion failure because `AppSettings` has no `volume`.

- [x] **Step 3: Add volume to settings model and normalize reads/writes**

Implement `src/storage/settings.ts` with these behaviors:

```ts
export interface AppSettings {
  theme: 'neon';
  soundEnabled: boolean;
  volume: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'neon',
  soundEnabled: true,
  volume: 0.7
};
```

Required normalization rules:

- A stored value with `theme: 'neon'` and boolean `soundEnabled` is valid base settings.
- Missing `volume` migrates to `DEFAULT_SETTINGS.volume`.
- Non-finite, negative, or greater-than-one `volume` falls back to `DEFAULT_SETTINGS`.
- `writeSettings()` persists the normalized full object and keeps the memory fallback synchronized.

- [x] **Step 4: Run storage tests and verify they pass**

Run:

```powershell
pnpm.cmd test -- src/storage/storage.test.ts
```

Expected after implementation: storage settings tests pass, including legacy migration and memory fallback.

---

### Task 2: Web Audio Sound Engine

**Files:**
- Create: `src/audio/soundEngine.ts`
- Create: `src/audio/soundEngine.test.ts`

- [x] **Step 1: Write sound engine tests with fake AudioContext**

Create `src/audio/soundEngine.test.ts` covering:

```ts
test('playSound no-ops when Web Audio is unavailable', () => {
  vi.stubGlobal('AudioContext', undefined);

  expect(() => playSound('move', 0.7)).not.toThrow();
});

test('playSound clamps volume before applying gain', () => {
  vi.stubGlobal('AudioContext', FakeAudioContext);

  playSound('move', 4);

  expect(Math.max(...gainValues)).toBe(0.08);

  gainValues.length = 0;
  playSound('move', -1);

  expect(gainValues).toHaveLength(0);
});
```

Also loop through every `SoundEvent` to ensure known events are accepted without throwing.

- [x] **Step 2: Run sound engine tests and verify they fail before implementation**

Run:

```powershell
pnpm.cmd test -- src/audio/soundEngine.test.ts
```

Expected before implementation: module import fails because `src/audio/soundEngine.ts` does not exist.

- [x] **Step 3: Implement sound event type and public engine API**

Create `src/audio/soundEngine.ts` exporting:

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

Implementation requirements:

- Lazily construct `window.AudioContext` or `window.webkitAudioContext`.
- Return without throwing if the browser API is missing or context construction fails.
- Clamp volume into `0..1`.
- Do not schedule playback when volume is `0` or context state is `suspended`.
- Use short oscillator/gain envelopes and stop each oscillator shortly after the envelope ends.
- `disposeAudio()` closes and clears the cached context for tests and cleanup.

- [x] **Step 4: Run sound engine tests and verify they pass**

Run:

```powershell
pnpm.cmd test -- src/audio/soundEngine.test.ts
```

Expected after implementation: all sound engine tests pass using fake Web Audio objects.

---

### Task 3: Sound Event Mapping Hook

**Files:**
- Create: `src/hooks/useSoundEffects.ts`
- Create: `src/hooks/useSoundEffects.test.tsx`

- [x] **Step 1: Write event mapping and hook tests**

Create `src/hooks/useSoundEffects.test.tsx` with tests for priority and gating:

```tsx
expect(getSoundEvent(previous, { ...previous, phase: 'gameOver' }, { type: 'tick' })).toBe(
  'gameOver'
);

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
```

Add hook-level tests that mock `playSound`:

```tsx
rerender(<SoundHarness state={current} action={{ type: 'tick' }} actionId={1} />);

expect(playSoundMock).toHaveBeenCalledWith('lineClear', 0.4);
```

Add a disabled sound test:

```tsx
expect(playSoundMock).not.toHaveBeenCalled();
```

- [x] **Step 2: Run hook tests and verify they fail before implementation**

Run:

```powershell
pnpm.cmd test -- src/hooks/useSoundEffects.test.tsx
```

Expected before implementation: module import fails because `src/hooks/useSoundEffects.ts` does not exist.

- [x] **Step 3: Implement pure sound event detection**

Create `getSoundEvent(previous, current, action)` in `src/hooks/useSoundEffects.ts`.

Priority order:

```ts
if (current.phase === 'gameOver' && previous.phase !== 'gameOver') return 'gameOver';
if (current.stats.level > previous.stats.level) return 'levelUp';
if (current.stats.lines > previous.stats.lines) return 'lineClear';
```

Then map action-specific successful transitions:

- `start` or `restart` into `playing` returns `start`.
- `pause` from `playing` to `paused` returns `pause`.
- `resume` from `paused` to `playing` returns `resume`.
- `move` returns `move` only when the active position changes.
- `rotate` returns `rotate` only when active position or rotation changes.
- `softDrop` returns `softDrop` only when active `y` increases.
- `hardDrop` returns `hardDrop` when state changed and higher-priority events did not occur.
- `hold` returns `hold` when state changed and higher-priority events did not occur.
- `tick` or locking `softDrop` returns `lock` when the board or lock-related state changed.

- [x] **Step 4: Implement React hook playback**

Implement `useSoundEffects()`:

```ts
export function useSoundEffects({ state, action, actionId, settings }: UseSoundEffectsOptions) {
  const previousStateRef = useRef<GameState | null>(null);

  useEffect(() => {
    const previousState = previousStateRef.current;
    previousStateRef.current = state;
    if (!previousState || !settings.soundEnabled) {
      return;
    }

    const soundEvent = getSoundEvent(previousState, state, action);
    if (soundEvent) {
      playSound(soundEvent, settings.volume);
    }
  }, [action, actionId, settings.soundEnabled, settings.volume, state]);
}
```

Use `actionId` in dependencies so no-op actions still refresh the previous state/action boundary and do not leak stale actions into the next render.

- [x] **Step 5: Run hook tests and verify they pass**

Run:

```powershell
pnpm.cmd test -- src/hooks/useSoundEffects.test.tsx
```

Expected after implementation: event priority, no-op action, hook playback, and disabled sound tests pass.

---

### Task 4: App Integration And Audio Unlock

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: Add app-level reducer snapshot**

Wrap the existing game reducer so the app records each dispatched action:

```ts
interface GameSnapshot {
  game: ReturnType<typeof createInitialState>;
  lastAction: GameAction | null;
  actionId: number;
}

function createInitialSnapshot(): GameSnapshot {
  return {
    game: createInitialState(),
    lastAction: null,
    actionId: 0
  };
}

function appReducer(snapshot: GameSnapshot, action: GameAction): GameSnapshot {
  return {
    game: gameReducer(snapshot.game, action),
    lastAction: action,
    actionId: snapshot.actionId + 1
  };
}
```

- [x] **Step 2: Call unlockAudio from user-driven dispatch**

Use a dispatch wrapper that unlocks audio before reducing game actions:

```ts
const dispatch = useCallback(
  (action: GameAction) => {
    if (settings.soundEnabled) {
      unlockAudio();
    }
    rawDispatch(action);
  },
  [settings.soundEnabled]
);
```

This covers keyboard controls, touch controls, and game panel buttons because they all receive the same `dispatch`.

- [x] **Step 3: Unlock audio from settings changes**

Use a settings change wrapper:

```ts
const handleSettingsChange = useCallback((nextSettings: AppSettings) => {
  if (nextSettings.soundEnabled) {
    unlockAudio();
  }
  setSettings(nextSettings);
}, []);
```

- [x] **Step 4: Wire useSoundEffects**

Call:

```ts
useSoundEffects({
  state,
  action: snapshot.lastAction,
  actionId: snapshot.actionId,
  settings
});
```

Expected behavior: successful gameplay transitions play sound when sound is enabled; invalid moves do not play sound; the reducer remains pure.

---

### Task 5: Settings Dialog Volume UI

**Files:**
- Modify: `src/components/SettingsDialog.tsx`
- Modify: `src/components/task8.test.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Write dialog tests for volume control**

Add `src/components/task8.test.tsx` coverage:

```tsx
const slider = screen.getByRole('slider', { name: 'Volume' });
expect(screen.getByText('70%')).toBeTruthy();

fireEvent.change(slider, { target: { value: '0.35' } });

expect(onChange).toHaveBeenCalledWith({ theme: 'neon', soundEnabled: true, volume: 0.35 });
```

Also verify disabled behavior:

```tsx
expect((screen.getByRole('slider', { name: 'Volume' }) as HTMLInputElement).disabled).toBe(true);
```

- [x] **Step 2: Run dialog tests and verify they fail before implementation**

Run:

```powershell
pnpm.cmd test -- src/components/task8.test.tsx
```

Expected before implementation: slider lookup fails because the Volume control does not exist.

- [x] **Step 3: Add accessible volume slider**

Modify `src/components/SettingsDialog.tsx`:

```tsx
const volumePercent = Math.round(settings.volume * 100);

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
      onChange={(event) => onChange({ ...settings, volume: Number(event.currentTarget.value) })}
    />
    <span aria-live="polite">{volumePercent}%</span>
  </span>
</div>
```

Use `aria-labelledby` so the slider accessible name stays `Volume`; the percentage is status text and should not become part of the control name.

- [x] **Step 4: Style the volume control**

Add to `src/styles.css`:

```css
.volume-control {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 44px;
  align-items: center;
  gap: 10px;
  min-width: 190px;
}

.volume-control input[type="range"] {
  width: 100%;
  accent-color: var(--cyan);
}

.volume-control span {
  color: var(--muted);
  font-weight: 800;
  text-align: right;
}
```

- [x] **Step 5: Run dialog tests and verify they pass**

Run:

```powershell
pnpm.cmd test -- src/components/task8.test.tsx
```

Expected after implementation: settings dialog tests pass, including slider display, update callback, and disabled state.

---

### Task 6: README And Final Verification

**Files:**
- Modify: `README.md`

- [x] **Step 1: Update README feature list**

Document that the app now includes:

- Web Audio generated arcade sound effects.
- Sound events for start, pause, movement, rotation, drops, Hold, line clear, level up, and Game Over.
- Settings dialog with sound toggle and adjustable volume.

- [x] **Step 2: Update README architecture and structure**

Add:

```text
src/
  audio/           Web Audio 音效合成和播放控制
  hooks/           游戏循环、键盘控制、音效映射和持久化状态 Hook
```

Mention that `src/audio` and `src/hooks/useSoundEffects.ts` keep browser audio effects in the UI layer rather than in `src/game`.

- [x] **Step 3: Run full automated verification**

Run:

```powershell
pnpm.cmd test
pnpm.cmd build
git diff --check
```

Expected:

- `pnpm.cmd test`: 6 test files and 54 tests pass.
- `pnpm.cmd build`: TypeScript and production build pass.
- `git diff --check`: no whitespace errors.

- [x] **Step 4: Commit implementation**

Run:

```powershell
git add README.md src/App.tsx src/audio src/components/SettingsDialog.tsx src/components/task8.test.tsx src/hooks/useSoundEffects.ts src/hooks/useSoundEffects.test.tsx src/storage/settings.ts src/storage/storage.test.ts src/styles.css
git commit -m "feat: 增加音效和音量设置"
```

Expected: commit `a776609 feat: 增加音效和音量设置` or equivalent feature commit exists.

---

## Acceptance Checklist

- [x] Settings include a working sound toggle and volume slider.
- [x] Sound settings persist and migrate old stored settings.
- [x] Gameplay remains usable if Web Audio is unavailable.
- [x] Start, movement, rotation, drops, hold, line clear, level up, pause/resume, and game over have lightweight sound feedback.
- [x] Game core remains free of browser audio and React dependencies.
- [x] Automated tests and production build pass.

## Self-Review

- Spec coverage: all goals, non-goals, settings model, Web Audio behavior, data flow, autoplay handling, testing strategy, risks, and acceptance criteria are mapped to tasks above.
- Placeholder scan: no unresolved placeholder markers or open-ended implementation steps remain.
- Type consistency: `AppSettings.volume`, `SoundEvent`, `unlockAudio()`, `playSound()`, `disposeAudio()`, `getSoundEvent()`, and `useSoundEffects()` names match the implemented code.
