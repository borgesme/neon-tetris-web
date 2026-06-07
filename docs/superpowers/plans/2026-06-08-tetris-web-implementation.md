# Tetris Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive React + TypeScript + Canvas Tetris web app for PC and H5 with local leaderboard, Neon Dark theme, share, and PWA support.

**Architecture:** Keep Tetris rules in a pure TypeScript core with no React, DOM, Canvas, or storage dependency. React owns screen state and controls, Canvas owns drawing, and local storage/PWA are thin adapters around the game shell.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, Canvas 2D API, vite-plugin-pwa, CSS modules/plain CSS.

---

## Scope Check

This is one frontend app with several bounded modules. It does not need backend decomposition because the confirmed leaderboard is local-only and PWA is app-shell infrastructure.

## File Structure

Create these files:

- `package.json`: scripts and dependencies.
- `index.html`: app entry document.
- `vite.config.ts`: Vite, React, Vitest, and PWA configuration.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript configuration.
- `src/main.tsx`: React entry.
- `src/App.tsx`: top-level app composition.
- `src/styles.css`: global layout, responsive shell, controls, dialogs, theme variables.
- `src/game/types.ts`: game state, pieces, actions, scoring, and storage types.
- `src/game/constants.ts`: board dimensions, tetromino definitions, colors, scoring table, level speed table.
- `src/game/random.ts`: deterministic RNG and 7-bag generation helpers.
- `src/game/board.ts`: board creation, collision, merge, line clear, and spawn helpers.
- `src/game/rules.ts`: reducer-style game actions and phase transitions.
- `src/game/selectors.ts`: derived state such as ghost piece and render cells.
- `src/game/core.test.ts`: core gameplay tests.
- `src/hooks/useGameLoop.ts`: animation/tick loop.
- `src/hooks/useKeyboardControls.ts`: keyboard action mapping.
- `src/hooks/usePersistentState.ts`: localStorage with memory fallback.
- `src/components/GameCanvas.tsx`: Canvas renderer component.
- `src/components/GamePanel.tsx`: score, level, lines, Next, Hold, and actions.
- `src/components/TouchControls.tsx`: H5 virtual controls.
- `src/components/Dialog.tsx`: shared modal shell.
- `src/components/LeaderboardDialog.tsx`: local leaderboard UI.
- `src/components/SettingsDialog.tsx`: theme and sound settings UI.
- `src/components/PwaInstallButton.tsx`: PWA install prompt handling.
- `src/storage/leaderboard.ts`: local leaderboard persistence.
- `src/storage/settings.ts`: settings persistence.
- `src/share/shareScore.ts`: Web Share API and clipboard fallback.
- `src/vite-env.d.ts`: Vite types.
- `public/manifest.webmanifest`: PWA manifest.
- `public/icons/icon.svg`: install icon.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Create package metadata and scripts**

Write `package.json`:

```json
{
  "name": "tetris-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b tsconfig.json tsconfig.node.json && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0",
    "vite-plugin-pwa": "^1.0.0",
    "typescript": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^26.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```powershell
pnpm.cmd install
```

Expected: lockfile is created and dependencies install without errors.

- [ ] **Step 3: Add Vite config**

Write `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Neon Tetris',
        short_name: 'Tetris',
        description: 'A responsive neon Tetris game for desktop and mobile.',
        theme_color: '#070a12',
        background_color: '#070a12',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}']
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  }
});
```

- [ ] **Step 4: Add TypeScript config**

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Write `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Add the React shell**

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#070a12" />
    <title>Neon Tetris</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Write `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <section className="game-stage" aria-label="Tetris game">
        <h1>Neon Tetris</h1>
        <div className="board-placeholder">Game board loads here</div>
      </section>
    </main>
  );
}
```

Write `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 6: Add baseline styles**

Write `src/styles.css`:

```css
:root {
  color-scheme: dark;
  --bg: #070a12;
  --panel: #101827;
  --panel-strong: #111827;
  --text: #e5e7eb;
  --muted: #94a3b8;
  --cyan: #22d3ee;
  --purple: #a78bfa;
  --yellow: #facc15;
  --danger: #fb7185;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
}

button {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 20px;
}

.game-stage {
  width: min(100%, 960px);
}

.game-stage h1 {
  margin: 0 0 16px;
  font-size: clamp(1.5rem, 3vw, 2.4rem);
}

.board-placeholder {
  display: grid;
  place-items: center;
  min-height: 420px;
  border: 2px solid var(--cyan);
  background: var(--panel);
  box-shadow: 0 0 28px rgba(34, 211, 238, 0.24);
}
```

- [ ] **Step 7: Verify scaffold**

Run:

```powershell
pnpm.cmd build
```

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 8: Commit scaffold**

Run:

```powershell
git add package.json pnpm-lock.yaml index.html vite.config.ts tsconfig.json tsconfig.node.json src
git commit -m "chore: 搭建俄罗斯方块前端工程"
```

---

### Task 2: Game Types, Constants, And 7-Bag Randomizer

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/constants.ts`
- Create: `src/game/random.ts`
- Create: `src/game/core.test.ts`

- [ ] **Step 1: Write failing tests for pieces and 7-bag**

Write `src/game/core.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH, TETROMINOES } from './constants';
import { createSeededRng, createSevenBag } from './random';

describe('game constants', () => {
  it('uses a standard 10x20 board', () => {
    expect(BOARD_WIDTH).toBe(10);
    expect(BOARD_HEIGHT).toBe(20);
  });

  it('defines all seven tetrominoes', () => {
    expect(Object.keys(TETROMINOES).sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });
});

describe('seven bag randomizer', () => {
  it('returns every tetromino once before repeating', () => {
    const bag = createSevenBag(createSeededRng(42));
    const firstSeven = Array.from({ length: 7 }, () => bag.next());
    expect(new Set(firstSeven).size).toBe(7);
    expect(firstSeven.sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });

  it('is deterministic for the same seed', () => {
    const a = createSevenBag(createSeededRng(7));
    const b = createSevenBag(createSeededRng(7));
    expect(Array.from({ length: 12 }, () => a.next())).toEqual(
      Array.from({ length: 12 }, () => b.next())
    );
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
pnpm.cmd test -- src/game/core.test.ts
```

Expected: FAIL because `constants` and `random` modules do not exist.

- [ ] **Step 3: Add game types**

Write `src/game/types.ts`:

```ts
export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type GamePhase = 'ready' | 'playing' | 'paused' | 'gameOver';
export type Cell = PieceType | null;
export type Board = Cell[][];

export interface Point {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: PieceType;
  position: Point;
  rotation: number;
}

export interface GameStats {
  score: number;
  level: number;
  lines: number;
}

export interface GameState {
  phase: GamePhase;
  board: Board;
  active: ActivePiece;
  hold: PieceType | null;
  canHold: boolean;
  nextQueue: PieceType[];
  stats: GameStats;
}

export type GameAction =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'tick' }
  | { type: 'move'; dx: -1 | 1 }
  | { type: 'softDrop' }
  | { type: 'hardDrop' }
  | { type: 'rotate'; direction: -1 | 1 }
  | { type: 'hold' };
```

- [ ] **Step 4: Add constants**

Write `src/game/constants.ts`:

```ts
import type { PieceType, Point } from './types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const VISIBLE_QUEUE_SIZE = 5;

export const TETROMINOES: Record<PieceType, Point[][]> = {
  I: [
    [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    [{ x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }]
  ],
  J: [
    [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
    [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
    [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }]
  ],
  L: [
    [{ x: 1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }],
    [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }]
  ],
  O: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]
  ],
  S: [
    [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }],
    [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }],
    [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }]
  ],
  T: [
    [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }]
  ],
  Z: [
    [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: -1, y: 1 }]
  ]
};

export const PIECE_TYPES = Object.keys(TETROMINOES) as PieceType[];

export const SCORE_BY_LINES: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800
};

export function getGravityMs(level: number): number {
  return Math.max(80, 900 - (level - 1) * 70);
}
```

- [ ] **Step 5: Add deterministic randomizer and seven-bag**

Write `src/game/random.ts`:

```ts
import { PIECE_TYPES } from './constants';
import type { PieceType } from './types';

export type Rng = () => number;

export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createSevenBag(rng: Rng = Math.random) {
  let bag: PieceType[] = [];

  function refill() {
    bag = [...PIECE_TYPES];
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }

  return {
    next(): PieceType {
      if (bag.length === 0) {
        refill();
      }
      return bag.pop()!;
    }
  };
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
pnpm.cmd test -- src/game/core.test.ts
```

Expected: PASS for constants and 7-bag tests.

- [ ] **Step 7: Commit game constants**

Run:

```powershell
git add src/game
git commit -m "feat: 添加俄罗斯方块核心类型与随机袋"
```

---

### Task 3: Board Operations And Selectors

**Files:**
- Modify: `src/game/core.test.ts`
- Create: `src/game/board.ts`
- Create: `src/game/selectors.ts`

- [ ] **Step 1: Add failing board tests**

Append to `src/game/core.test.ts`:

```ts
import type { ActivePiece, Board } from './types';
import {
  clearFullLines,
  createEmptyBoard,
  getPieceCells,
  isValidPosition,
  mergePiece
} from './board';
import { getGhostPiece } from './selectors';

describe('board operations', () => {
  it('creates an empty board', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(20);
    expect(board.every((row) => row.length === 10)).toBe(true);
    expect(board.flat().every((cell) => cell === null)).toBe(true);
  });

  it('detects collision with walls', () => {
    const board = createEmptyBoard();
    const piece: ActivePiece = { type: 'I', position: { x: 0, y: 1 }, rotation: 0 };
    expect(isValidPosition(board, piece)).toBe(false);
  });

  it('merges a piece into a new board', () => {
    const board = createEmptyBoard();
    const piece: ActivePiece = { type: 'O', position: { x: 4, y: 0 }, rotation: 0 };
    const merged = mergePiece(board, piece);
    expect(merged[0][4]).toBe('O');
    expect(board[0][4]).toBeNull();
  });

  it('clears full lines and inserts empty rows at the top', () => {
    const board: Board = createEmptyBoard();
    board[19] = Array.from({ length: 10 }, () => 'T');
    const result = clearFullLines(board);
    expect(result.linesCleared).toBe(1);
    expect(result.board[0].every((cell) => cell === null)).toBe(true);
    expect(result.board[19].every((cell) => cell === null)).toBe(true);
  });

  it('computes a ghost piece landing position', () => {
    const board = createEmptyBoard();
    const active: ActivePiece = { type: 'O', position: { x: 4, y: 0 }, rotation: 0 };
    const ghost = getGhostPiece(board, active);
    expect(ghost.position.y).toBe(18);
  });
});

describe('piece cells', () => {
  it('maps local tetromino points to board cells', () => {
    const piece: ActivePiece = { type: 'O', position: { x: 4, y: 3 }, rotation: 0 };
    expect(getPieceCells(piece)).toEqual([
      { x: 4, y: 3, type: 'O' },
      { x: 5, y: 3, type: 'O' },
      { x: 4, y: 4, type: 'O' },
      { x: 5, y: 4, type: 'O' }
    ]);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
pnpm.cmd test -- src/game/core.test.ts
```

Expected: FAIL because `board` and `selectors` modules do not exist.

- [ ] **Step 3: Implement board helpers**

Write `src/game/board.ts`:

```ts
import { BOARD_HEIGHT, BOARD_WIDTH, TETROMINOES } from './constants';
import type { ActivePiece, Board, Cell, PieceType } from './types';

export interface RenderCell {
  x: number;
  y: number;
  type: PieceType;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(null));
}

export function getPieceCells(piece: ActivePiece): RenderCell[] {
  return TETROMINOES[piece.type][piece.rotation % 4].map((point) => ({
    x: piece.position.x + point.x,
    y: piece.position.y + point.y,
    type: piece.type
  }));
}

export function isValidPosition(board: Board, piece: ActivePiece): boolean {
  return getPieceCells(piece).every((cell) => {
    if (cell.x < 0 || cell.x >= BOARD_WIDTH || cell.y >= BOARD_HEIGHT) {
      return false;
    }
    if (cell.y < 0) {
      return true;
    }
    return board[cell.y][cell.x] === null;
  });
}

export function mergePiece(board: Board, piece: ActivePiece): Board {
  const next = board.map((row) => [...row]);
  for (const cell of getPieceCells(piece)) {
    if (cell.y >= 0 && cell.y < BOARD_HEIGHT) {
      next[cell.y][cell.x] = cell.type;
    }
  }
  return next;
}

export function clearFullLines(board: Board): { board: Board; linesCleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const linesCleared = BOARD_HEIGHT - remaining.length;
  const emptyRows = Array.from({ length: linesCleared }, () => Array<Cell>(BOARD_WIDTH).fill(null));
  return {
    board: [...emptyRows, ...remaining],
    linesCleared
  };
}
```

- [ ] **Step 4: Implement selectors**

Write `src/game/selectors.ts`:

```ts
import { isValidPosition } from './board';
import type { ActivePiece, Board } from './types';

export function getGhostPiece(board: Board, active: ActivePiece): ActivePiece {
  let ghost = active;
  while (isValidPosition(board, { ...ghost, position: { ...ghost.position, y: ghost.position.y + 1 } })) {
    ghost = { ...ghost, position: { ...ghost.position, y: ghost.position.y + 1 } };
  }
  return ghost;
}
```

- [ ] **Step 5: Run board tests**

Run:

```powershell
pnpm.cmd test -- src/game/core.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit board helpers**

Run:

```powershell
git add src/game
git commit -m "feat: 添加棋盘碰撞与消行逻辑"
```

---

### Task 4: Game Reducer, Scoring, Hold, And Game Over

**Files:**
- Modify: `src/game/core.test.ts`
- Create: `src/game/rules.ts`

- [ ] **Step 1: Add failing reducer tests**

Append to `src/game/core.test.ts`:

```ts
import { createInitialState, gameReducer } from './rules';

describe('game reducer', () => {
  it('starts in ready phase and moves to playing', () => {
    const state = createInitialState(1);
    expect(state.phase).toBe('ready');
    expect(gameReducer(state, { type: 'start' }).phase).toBe('playing');
  });

  it('moves the active piece left when valid', () => {
    const state = gameReducer(createInitialState(1), { type: 'start' });
    const next = gameReducer(state, { type: 'move', dx: -1 });
    expect(next.active.position.x).toBe(state.active.position.x - 1);
  });

  it('hard drops and increases score', () => {
    const state = gameReducer(createInitialState(1), { type: 'start' });
    const next = gameReducer(state, { type: 'hardDrop' });
    expect(next.stats.score).toBeGreaterThan(state.stats.score);
    expect(next.canHold).toBe(true);
  });

  it('allows hold only once before locking a piece', () => {
    const state = gameReducer(createInitialState(1), { type: 'start' });
    const held = gameReducer(state, { type: 'hold' });
    const heldAgain = gameReducer(held, { type: 'hold' });
    expect(held.hold).toBe(state.active.type);
    expect(heldAgain).toBe(held);
  });

  it('pauses and resumes without mutating the board', () => {
    const state = gameReducer(createInitialState(1), { type: 'start' });
    const paused = gameReducer(state, { type: 'pause' });
    const resumed = gameReducer(paused, { type: 'resume' });
    expect(paused.phase).toBe('paused');
    expect(resumed.phase).toBe('playing');
    expect(resumed.board).toEqual(state.board);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
pnpm.cmd test -- src/game/core.test.ts
```

Expected: FAIL because `rules` module does not exist.

- [ ] **Step 3: Implement game reducer**

Write `src/game/rules.ts`:

```ts
import { BOARD_WIDTH, SCORE_BY_LINES, VISIBLE_QUEUE_SIZE, getGravityMs } from './constants';
import { clearFullLines, createEmptyBoard, isValidPosition, mergePiece } from './board';
import { createSeededRng, createSevenBag } from './random';
import type { ActivePiece, GameAction, GameState, PieceType } from './types';

function spawnPiece(type: PieceType): ActivePiece {
  return {
    type,
    position: { x: Math.floor(BOARD_WIDTH / 2), y: 1 },
    rotation: 0
  };
}

function createQueue(seed: number): PieceType[] {
  const bag = createSevenBag(createSeededRng(seed));
  return Array.from({ length: VISIBLE_QUEUE_SIZE + 1 }, () => bag.next());
}

function pullNext(state: GameState): GameState {
  const [nextType, ...rest] = state.nextQueue;
  const refillSeed = state.stats.score + state.stats.lines + rest.length + 17;
  const queue = rest.length >= VISIBLE_QUEUE_SIZE ? rest : [...rest, ...createQueue(refillSeed)].slice(0, VISIBLE_QUEUE_SIZE);
  return {
    ...state,
    active: spawnPiece(nextType),
    nextQueue: queue,
    canHold: true
  };
}

function scoreLines(linesCleared: number, level: number): number {
  return (SCORE_BY_LINES[linesCleared] ?? 0) * level;
}

function levelForLines(lines: number): number {
  return Math.floor(lines / 10) + 1;
}

function lockPiece(state: GameState): GameState {
  const merged = mergePiece(state.board, state.active);
  const cleared = clearFullLines(merged);
  const lines = state.stats.lines + cleared.linesCleared;
  const level = levelForLines(lines);
  const afterScore: GameState = {
    ...state,
    board: cleared.board,
    stats: {
      score: state.stats.score + scoreLines(cleared.linesCleared, state.stats.level),
      lines,
      level
    }
  };
  const next = pullNext(afterScore);
  return isValidPosition(next.board, next.active) ? next : { ...next, phase: 'gameOver' };
}

function moveBy(state: GameState, dx: number, dy: number): GameState {
  const active = {
    ...state.active,
    position: { x: state.active.position.x + dx, y: state.active.position.y + dy }
  };
  return isValidPosition(state.board, active) ? { ...state, active } : state;
}

function rotateBy(state: GameState, direction: -1 | 1): GameState {
  const rotation = (state.active.rotation + direction + 4) % 4;
  const candidates = [0, -1, 1, -2, 2].map((dx) => ({
    ...state.active,
    rotation,
    position: { x: state.active.position.x + dx, y: state.active.position.y }
  }));
  const valid = candidates.find((candidate) => isValidPosition(state.board, candidate));
  return valid ? { ...state, active: valid } : state;
}

function hardDrop(state: GameState): GameState {
  let dropped = state;
  let distance = 0;
  while (true) {
    const next = moveBy(dropped, 0, 1);
    if (next === dropped) {
      break;
    }
    dropped = next;
    distance += 1;
  }
  return lockPiece({
    ...dropped,
    stats: { ...dropped.stats, score: dropped.stats.score + distance * 2 }
  });
}

export function createInitialState(seed = Date.now()): GameState {
  const queue = createQueue(seed);
  const [first, ...nextQueue] = queue;
  return {
    phase: 'ready',
    board: createEmptyBoard(),
    active: spawnPiece(first),
    hold: null,
    canHold: true,
    nextQueue,
    stats: {
      score: 0,
      level: 1,
      lines: 0
    }
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'restart') {
    return { ...createInitialState(Date.now()), phase: 'playing' };
  }
  if (action.type === 'start' && state.phase === 'ready') {
    return { ...state, phase: 'playing' };
  }
  if (action.type === 'pause' && state.phase === 'playing') {
    return { ...state, phase: 'paused' };
  }
  if (action.type === 'resume' && state.phase === 'paused') {
    return { ...state, phase: 'playing' };
  }
  if (state.phase !== 'playing') {
    return state;
  }

  switch (action.type) {
    case 'tick': {
      const moved = moveBy(state, 0, 1);
      return moved === state ? lockPiece(state) : moved;
    }
    case 'move':
      return moveBy(state, action.dx, 0);
    case 'softDrop': {
      const moved = moveBy(state, 0, 1);
      return moved === state ? lockPiece(state) : { ...moved, stats: { ...moved.stats, score: moved.stats.score + 1 } };
    }
    case 'hardDrop':
      return hardDrop(state);
    case 'rotate':
      return rotateBy(state, action.direction);
    case 'hold': {
      if (!state.canHold) {
        return state;
      }
      if (state.hold === null) {
        return { ...pullNext({ ...state, hold: state.active.type }), canHold: false };
      }
      return {
        ...state,
        active: spawnPiece(state.hold),
        hold: state.active.type,
        canHold: false
      };
    }
    default:
      return state;
  }
}

export { getGravityMs };
```

- [ ] **Step 4: Run reducer tests**

Run:

```powershell
pnpm.cmd test -- src/game/core.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit reducer**

Run:

```powershell
git add src/game
git commit -m "feat: 实现俄罗斯方块核心规则"
```

---

### Task 5: Local Storage, Leaderboard, Settings, And Share

**Files:**
- Create: `src/hooks/usePersistentState.ts`
- Create: `src/storage/leaderboard.ts`
- Create: `src/storage/settings.ts`
- Create: `src/share/shareScore.ts`
- Create: `src/storage/storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Write `src/storage/storage.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { addScore, readScores } from './leaderboard';
import { readSettings, writeSettings } from './settings';

describe('leaderboard storage', () => {
  it('keeps top scores sorted descending', () => {
    localStorage.clear();
    addScore({ score: 100, level: 1, lines: 2, createdAt: '2026-06-08T00:00:00.000Z' });
    addScore({ score: 500, level: 3, lines: 8, createdAt: '2026-06-08T00:01:00.000Z' });
    expect(readScores().map((entry) => entry.score)).toEqual([500, 100]);
  });

  it('returns an empty list if stored data is invalid', () => {
    localStorage.setItem('tetris:leaderboard', '{broken');
    expect(readScores()).toEqual([]);
  });
});

describe('settings storage', () => {
  it('persists theme and sound preference', () => {
    localStorage.clear();
    writeSettings({ theme: 'neon', soundEnabled: false });
    expect(readSettings()).toEqual({ theme: 'neon', soundEnabled: false });
  });

  it('falls back to defaults on invalid data', () => {
    localStorage.setItem('tetris:settings', 'null');
    expect(readSettings()).toEqual({ theme: 'neon', soundEnabled: true });
  });
});

describe('storage fallback', () => {
  it('does not throw when localStorage setItem fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => addScore({ score: 10, level: 1, lines: 0, createdAt: '2026-06-08T00:00:00.000Z' })).not.toThrow();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
pnpm.cmd test -- src/storage/storage.test.ts
```

Expected: FAIL because storage modules do not exist.

- [ ] **Step 3: Implement leaderboard storage**

Write `src/storage/leaderboard.ts`:

```ts
export interface ScoreEntry {
  score: number;
  level: number;
  lines: number;
  createdAt: string;
}

const KEY = 'tetris:leaderboard';
const MAX_ENTRIES = 10;
let memoryScores: ScoreEntry[] = [];

function isScoreEntry(value: unknown): value is ScoreEntry {
  const entry = value as ScoreEntry;
  return Boolean(
    entry &&
      typeof entry.score === 'number' &&
      typeof entry.level === 'number' &&
      typeof entry.lines === 'number' &&
      typeof entry.createdAt === 'string'
  );
}

export function readScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return memoryScores;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every(isScoreEntry) ? parsed : [];
  } catch {
    return memoryScores;
  }
}

export function writeScores(scores: ScoreEntry[]) {
  const normalized = [...scores].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  memoryScores = normalized;
  try {
    localStorage.setItem(KEY, JSON.stringify(normalized));
  } catch {
    memoryScores = normalized;
  }
}

export function addScore(score: ScoreEntry) {
  writeScores([...readScores(), score]);
}
```

- [ ] **Step 4: Implement settings storage**

Write `src/storage/settings.ts`:

```ts
export interface AppSettings {
  theme: 'neon';
  soundEnabled: boolean;
}

const KEY = 'tetris:settings';
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'neon',
  soundEnabled: true
};

let memorySettings = DEFAULT_SETTINGS;

function isSettings(value: unknown): value is AppSettings {
  const settings = value as AppSettings;
  return Boolean(settings && settings.theme === 'neon' && typeof settings.soundEnabled === 'boolean');
}

export function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return memorySettings;
    }
    const parsed = JSON.parse(raw);
    return isSettings(parsed) ? parsed : DEFAULT_SETTINGS;
  } catch {
    return memorySettings;
  }
}

export function writeSettings(settings: AppSettings) {
  memorySettings = settings;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    memorySettings = settings;
  }
}
```

- [ ] **Step 5: Implement share helper**

Write `src/share/shareScore.ts`:

```ts
import type { ScoreEntry } from '../storage/leaderboard';

export function formatScoreShare(entry: ScoreEntry): string {
  return `I scored ${entry.score} in Neon Tetris at level ${entry.level} with ${entry.lines} lines cleared.`;
}

export async function shareScore(entry: ScoreEntry): Promise<'shared' | 'copied' | 'unsupported'> {
  const text = formatScoreShare(entry);
  if (navigator.share) {
    await navigator.share({ title: 'Neon Tetris Score', text });
    return 'shared';
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return 'copied';
  }
  return 'unsupported';
}
```

- [ ] **Step 6: Add persistent React hook**

Write `src/hooks/usePersistentState.ts`:

```ts
import { useEffect, useState } from 'react';

export function usePersistentState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }, [key, value]);

  return [value, setValue] as const;
}
```

- [ ] **Step 7: Run storage tests**

Run:

```powershell
pnpm.cmd test -- src/storage/storage.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit storage and share helpers**

Run:

```powershell
git add src/hooks src/storage src/share
git commit -m "feat: 添加本地排行榜与分享能力"
```

---

### Task 6: Canvas Renderer And Game Loop Hooks

**Files:**
- Create: `src/components/GameCanvas.tsx`
- Create: `src/hooks/useGameLoop.ts`
- Create: `src/hooks/useKeyboardControls.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Implement game loop hook**

Write `src/hooks/useGameLoop.ts`:

```ts
import { useEffect, useRef } from 'react';
import { getGravityMs } from '../game/rules';
import type { GameAction, GamePhase } from '../game/types';

interface UseGameLoopOptions {
  phase: GamePhase;
  level: number;
  dispatch: (action: GameAction) => void;
}

export function useGameLoop({ phase, level, dispatch }: UseGameLoopOptions) {
  const lastTick = useRef(0);

  useEffect(() => {
    if (phase !== 'playing') {
      return;
    }

    let frameId = 0;
    const gravityMs = getGravityMs(level);

    function frame(timestamp: number) {
      if (timestamp - lastTick.current >= gravityMs) {
        dispatch({ type: 'tick' });
        lastTick.current = timestamp;
      }
      frameId = requestAnimationFrame(frame);
    }

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [dispatch, level, phase]);
}
```

- [ ] **Step 2: Implement keyboard controls**

Write `src/hooks/useKeyboardControls.ts`:

```ts
import { useEffect } from 'react';
import type { GameAction } from '../game/types';

export function useKeyboardControls(dispatch: (action: GameAction) => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        return;
      }

      const actionByKey: Record<string, GameAction | undefined> = {
        ArrowLeft: { type: 'move', dx: -1 },
        ArrowRight: { type: 'move', dx: 1 },
        ArrowDown: { type: 'softDrop' },
        ArrowUp: { type: 'rotate', direction: 1 },
        x: { type: 'rotate', direction: 1 },
        X: { type: 'rotate', direction: 1 },
        z: { type: 'rotate', direction: -1 },
        Z: { type: 'rotate', direction: -1 },
        c: { type: 'hold' },
        C: { type: 'hold' },
        p: { type: 'pause' },
        P: { type: 'pause' },
        r: { type: 'restart' },
        R: { type: 'restart' },
        ' ': { type: 'hardDrop' }
      };

      const action = actionByKey[event.key];
      if (action) {
        event.preventDefault();
        dispatch(action);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch]);
}
```

- [ ] **Step 3: Implement Canvas renderer**

Write `src/components/GameCanvas.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../game/constants';
import { getPieceCells } from '../game/board';
import { getGhostPiece } from '../game/selectors';
import type { GameState, PieceType } from '../game/types';

const COLORS: Record<PieceType, string> = {
  I: '#22d3ee',
  J: '#60a5fa',
  L: '#fb923c',
  O: '#facc15',
  S: '#34d399',
  T: '#a78bfa',
  Z: '#fb7185'
};

interface GameCanvasProps {
  state: GameState;
}

export function GameCanvas({ state }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = Math.min(rect.width / BOARD_WIDTH, rect.height / BOARD_HEIGHT);
    context.clearRect(0, 0, rect.width, rect.height);
    context.fillStyle = '#0b1020';
    context.fillRect(0, 0, cell * BOARD_WIDTH, cell * BOARD_HEIGHT);

    context.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    for (let x = 0; x <= BOARD_WIDTH; x += 1) {
      context.beginPath();
      context.moveTo(x * cell, 0);
      context.lineTo(x * cell, BOARD_HEIGHT * cell);
      context.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y += 1) {
      context.beginPath();
      context.moveTo(0, y * cell);
      context.lineTo(BOARD_WIDTH * cell, y * cell);
      context.stroke();
    }

    function drawCell(x: number, y: number, type: PieceType, alpha = 1) {
      if (y < 0) {
        return;
      }
      context.globalAlpha = alpha;
      context.fillStyle = COLORS[type];
      context.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      context.shadowColor = COLORS[type];
      context.shadowBlur = 8;
      context.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      context.strokeRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    }

    state.board.forEach((row, y) => {
      row.forEach((type, x) => {
        if (type) {
          drawCell(x, y, type);
        }
      });
    });

    getPieceCells(getGhostPiece(state.board, state.active)).forEach((piece) => {
      drawCell(piece.x, piece.y, piece.type, 0.25);
    });

    getPieceCells(state.active).forEach((piece) => {
      drawCell(piece.x, piece.y, piece.type);
    });
  }, [state]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Tetris board" />;
}
```

- [ ] **Step 4: Add Canvas styles**

Append to `src/styles.css`:

```css
.game-canvas {
  display: block;
  width: min(70vw, 420px);
  max-width: 100%;
  aspect-ratio: 10 / 20;
  border: 2px solid var(--cyan);
  border-radius: 8px;
  background: #0b1020;
  box-shadow: 0 0 30px rgba(34, 211, 238, 0.24);
  touch-action: none;
}
```

- [ ] **Step 5: Run build**

Run:

```powershell
pnpm.cmd build
```

Expected: PASS.

- [ ] **Step 6: Commit renderer and hooks**

Run:

```powershell
git add src/components/GameCanvas.tsx src/hooks/useGameLoop.ts src/hooks/useKeyboardControls.ts src/styles.css
git commit -m "feat: 添加画布渲染与游戏循环"
```

---

### Task 7: Main Game Screen, Panels, And Touch Controls

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/GamePanel.tsx`
- Create: `src/components/TouchControls.tsx`
- Create: `src/components/Dialog.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Implement game panel**

Write `src/components/GamePanel.tsx`:

```tsx
import type { GameAction, GameState, PieceType } from '../game/types';

interface GamePanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

function PiecePreview({ label, type }: { label: string; type: PieceType | null }) {
  return (
    <section className="panel-card">
      <span className="panel-label">{label}</span>
      <strong>{type ?? '-'}</strong>
    </section>
  );
}

export function GamePanel({ state, dispatch }: GamePanelProps) {
  const pauseAction: GameAction =
    state.phase === 'paused' ? { type: 'resume' } : state.phase === 'ready' ? { type: 'start' } : { type: 'pause' };

  return (
    <aside className="game-panel">
      <PiecePreview label="Hold" type={state.hold} />
      <section className="panel-card">
        <span className="panel-label">Next</span>
        <div className="next-list">{state.nextQueue.slice(0, 5).join(' ')}</div>
      </section>
      <section className="panel-card stats-card">
        <span className="panel-label">Score</span>
        <strong>{state.stats.score}</strong>
        <span>Level {state.stats.level}</span>
        <span>{state.stats.lines} lines</span>
      </section>
      <div className="panel-actions">
        <button type="button" onClick={() => dispatch(pauseAction)}>
          {state.phase === 'ready' ? 'Start' : state.phase === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button type="button" onClick={() => dispatch({ type: 'restart' })}>
          Restart
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Implement touch controls**

Write `src/components/TouchControls.tsx`:

```tsx
import type { GameAction } from '../game/types';

interface TouchControlsProps {
  dispatch: (action: GameAction) => void;
}

const controls: Array<{ label: string; action: GameAction; className?: string }> = [
  { label: 'Left', action: { type: 'move', dx: -1 } },
  { label: 'Right', action: { type: 'move', dx: 1 } },
  { label: 'Rotate', action: { type: 'rotate', direction: 1 } },
  { label: 'Soft', action: { type: 'softDrop' } },
  { label: 'Drop', action: { type: 'hardDrop' }, className: 'primary' },
  { label: 'Hold', action: { type: 'hold' } }
];

export function TouchControls({ dispatch }: TouchControlsProps) {
  return (
    <nav className="touch-controls" aria-label="Mobile game controls">
      {controls.map((control) => (
        <button
          key={control.label}
          type="button"
          className={control.className}
          onPointerDown={(event) => {
            event.preventDefault();
            dispatch(control.action);
          }}
        >
          {control.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Implement shared dialog shell**

Write `src/components/Dialog.tsx`:

```tsx
import type { ReactNode } from 'react';

interface DialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ title, open, onClose, children }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="dialog-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            Close
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Compose game screen**

Replace `src/App.tsx`:

```tsx
import { useCallback, useEffect, useReducer } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GamePanel } from './components/GamePanel';
import { TouchControls } from './components/TouchControls';
import { addScore } from './storage/leaderboard';
import { createInitialState, gameReducer } from './game/rules';
import type { GameAction } from './game/types';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardControls } from './hooks/useKeyboardControls';

export default function App() {
  const [state, baseDispatch] = useReducer(gameReducer, undefined, () => createInitialState());
  const dispatch = useCallback((action: GameAction) => baseDispatch(action), []);

  useGameLoop({ phase: state.phase, level: state.stats.level, dispatch });
  useKeyboardControls(dispatch);

  useEffect(() => {
    if (state.phase === 'gameOver') {
      addScore({
        score: state.stats.score,
        level: state.stats.level,
        lines: state.stats.lines,
        createdAt: new Date().toISOString()
      });
    }
  }, [state.phase, state.stats.level, state.stats.lines, state.stats.score]);

  return (
    <main className="app-shell">
      <section className="game-layout" aria-label="Neon Tetris game">
        <header className="game-header">
          <div>
            <p>Neon Tetris</p>
            <h1>{state.phase === 'gameOver' ? 'Game Over' : state.phase === 'paused' ? 'Paused' : 'Ready'}</h1>
          </div>
          <button type="button" onClick={() => dispatch({ type: state.phase === 'ready' ? 'start' : 'pause' })}>
            {state.phase === 'ready' ? 'Start' : 'Pause'}
          </button>
        </header>
        <div className="game-main">
          <GameCanvas state={state} />
          <GamePanel state={state} dispatch={dispatch} />
        </div>
        <TouchControls dispatch={dispatch} />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Replace responsive styles**

Replace `src/styles.css` with a complete app stylesheet:

```css
:root {
  color-scheme: dark;
  --bg: #070a12;
  --panel: #101827;
  --panel-strong: #111827;
  --line: rgba(148, 163, 184, 0.24);
  --text: #e5e7eb;
  --muted: #94a3b8;
  --cyan: #22d3ee;
  --purple: #a78bfa;
  --yellow: #facc15;
  --danger: #fb7185;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
}

body {
  background: radial-gradient(circle at top, rgba(34, 211, 238, 0.16), transparent 34%), var(--bg);
  color: var(--text);
  overflow-x: hidden;
}

button {
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #121a2b;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

button:active {
  transform: translateY(1px);
}

.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 16px;
}

.game-layout {
  width: min(100%, 980px);
  display: grid;
  gap: 14px;
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.game-header p,
.game-header h1 {
  margin: 0;
}

.game-header p,
.panel-label {
  color: var(--muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0;
}

.game-main {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(180px, 260px);
  justify-content: center;
  align-items: start;
  gap: 18px;
}

.game-canvas {
  display: block;
  width: min(70vw, 420px);
  max-width: 100%;
  aspect-ratio: 10 / 20;
  border: 2px solid var(--cyan);
  border-radius: 8px;
  background: #0b1020;
  box-shadow: 0 0 30px rgba(34, 211, 238, 0.24);
  touch-action: none;
}

.game-panel {
  display: grid;
  gap: 10px;
}

.panel-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(16, 24, 39, 0.9);
}

.panel-card strong {
  font-size: 1.4rem;
}

.next-list {
  color: var(--cyan);
  font-weight: 700;
  word-spacing: 8px;
}

.stats-card span:not(.panel-label) {
  color: var(--muted);
}

.panel-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.touch-controls {
  display: none;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.touch-controls .primary {
  border-color: var(--cyan);
  color: var(--cyan);
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(7, 10, 18, 0.78);
}

.dialog {
  width: min(100%, 420px);
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog-header h2 {
  margin: 0;
}

@media (max-width: 720px) {
  .app-shell {
    align-items: start;
    padding: 10px;
  }

  .game-main {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .game-canvas {
    width: min(92vw, 44vh, 380px);
  }

  .game-panel {
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .panel-card {
    min-width: 0;
  }

  .panel-actions {
    grid-column: 1 / -1;
  }

  .touch-controls {
    display: grid;
    position: sticky;
    bottom: 8px;
    padding: 8px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: rgba(7, 10, 18, 0.92);
    backdrop-filter: blur(10px);
  }
}
```

- [ ] **Step 6: Run build**

Run:

```powershell
pnpm.cmd build
```

Expected: PASS.

- [ ] **Step 7: Commit game screen**

Run:

```powershell
git add src
git commit -m "feat: 实现俄罗斯方块主界面"
```

---

### Task 8: Leaderboard, Settings, Share, And PWA UI

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/LeaderboardDialog.tsx`
- Create: `src/components/SettingsDialog.tsx`
- Create: `src/components/PwaInstallButton.tsx`
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon.svg`
- Modify: `src/styles.css`

- [ ] **Step 1: Implement leaderboard dialog**

Write `src/components/LeaderboardDialog.tsx`:

```tsx
import { readScores } from '../storage/leaderboard';
import { Dialog } from './Dialog';

interface LeaderboardDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LeaderboardDialog({ open, onClose }: LeaderboardDialogProps) {
  const scores = readScores();

  return (
    <Dialog title="Local Leaderboard" open={open} onClose={onClose}>
      {scores.length === 0 ? (
        <p className="muted">No scores yet.</p>
      ) : (
        <ol className="leaderboard-list">
          {scores.map((score) => (
            <li key={`${score.createdAt}-${score.score}`}>
              <strong>{score.score}</strong>
              <span>Level {score.level}</span>
              <span>{score.lines} lines</span>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
```

- [ ] **Step 2: Implement settings dialog**

Write `src/components/SettingsDialog.tsx`:

```tsx
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
```

- [ ] **Step 3: Implement PWA install button**

Write `src/components/PwaInstallButton.tsx`:

```tsx
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  if (!promptEvent) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await promptEvent.prompt();
        await promptEvent.userChoice;
        setPromptEvent(null);
      }}
    >
      Install
    </button>
  );
}
```

- [ ] **Step 4: Update App with dialogs and sharing**

Replace `src/App.tsx`:

```tsx
import { useCallback, useEffect, useReducer, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GamePanel } from './components/GamePanel';
import { LeaderboardDialog } from './components/LeaderboardDialog';
import { PwaInstallButton } from './components/PwaInstallButton';
import { SettingsDialog } from './components/SettingsDialog';
import { TouchControls } from './components/TouchControls';
import { addScore } from './storage/leaderboard';
import { readSettings, writeSettings } from './storage/settings';
import { shareScore } from './share/shareScore';
import { createInitialState, gameReducer } from './game/rules';
import type { GameAction } from './game/types';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardControls } from './hooks/useKeyboardControls';

export default function App() {
  const [state, baseDispatch] = useReducer(gameReducer, undefined, () => createInitialState());
  const [settings, setSettings] = useState(readSettings);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastSavedPhase, setLastSavedPhase] = useState(state.phase);
  const dispatch = useCallback((action: GameAction) => baseDispatch(action), []);

  useGameLoop({ phase: state.phase, level: state.stats.level, dispatch });
  useKeyboardControls(dispatch);

  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (state.phase === 'gameOver' && lastSavedPhase !== 'gameOver') {
      addScore({
        score: state.stats.score,
        level: state.stats.level,
        lines: state.stats.lines,
        createdAt: new Date().toISOString()
      });
    }
    setLastSavedPhase(state.phase);
  }, [lastSavedPhase, state.phase, state.stats.level, state.stats.lines, state.stats.score]);

  const currentScore = {
    score: state.stats.score,
    level: state.stats.level,
    lines: state.stats.lines,
    createdAt: new Date().toISOString()
  };

  return (
    <main className="app-shell">
      <section className="game-layout" aria-label="Neon Tetris game">
        <header className="game-header">
          <div>
            <p>Neon Tetris</p>
            <h1>{state.phase === 'gameOver' ? 'Game Over' : state.phase === 'paused' ? 'Paused' : 'Ready'}</h1>
          </div>
          <div className="header-actions">
            <button type="button" onClick={() => setLeaderboardOpen(true)}>
              Scores
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
            <button type="button" onClick={() => void shareScore(currentScore)}>
              Share
            </button>
            <PwaInstallButton />
          </div>
        </header>
        <div className="game-main">
          <GameCanvas state={state} />
          <GamePanel state={state} dispatch={dispatch} />
        </div>
        <TouchControls dispatch={dispatch} />
      </section>

      <LeaderboardDialog open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
```

- [ ] **Step 5: Add PWA manifest and icon**

Write `public/manifest.webmanifest`:

```json
{
  "name": "Neon Tetris",
  "short_name": "Tetris",
  "description": "A responsive neon Tetris game for desktop and mobile.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#070a12",
  "theme_color": "#070a12",
  "icons": [
    {
      "src": "/icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

Write `public/icons/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#070a12"/>
  <g fill="#22d3ee">
    <rect x="128" y="96" width="72" height="72" rx="12"/>
    <rect x="204" y="96" width="72" height="72" rx="12"/>
    <rect x="280" y="96" width="72" height="72" rx="12"/>
    <rect x="204" y="172" width="72" height="72" rx="12"/>
  </g>
  <g fill="#a78bfa">
    <rect x="128" y="292" width="72" height="72" rx="12"/>
    <rect x="204" y="292" width="72" height="72" rx="12"/>
    <rect x="280" y="292" width="72" height="72" rx="12"/>
    <rect x="356" y="292" width="72" height="72" rx="12"/>
  </g>
  <rect x="82" y="82" width="348" height="348" rx="36" fill="none" stroke="#22d3ee" stroke-width="18"/>
</svg>
```

- [ ] **Step 6: Add dialog and header styles**

Append to `src/styles.css`:

```css
.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.muted {
  color: var(--muted);
}

.leaderboard-list {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding-left: 20px;
}

.leaderboard-list li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
}

.setting-row select,
.setting-row input {
  min-height: 36px;
}

@media (max-width: 720px) {
  .game-header {
    align-items: flex-start;
  }

  .header-actions {
    max-width: 190px;
  }

  .header-actions button {
    min-height: 36px;
    padding: 0 10px;
  }
}
```

- [ ] **Step 7: Run tests and build**

Run:

```powershell
pnpm.cmd test
pnpm.cmd build
```

Expected: PASS for tests and production build.

- [ ] **Step 8: Commit product features**

Run:

```powershell
git add src public
git commit -m "feat: 添加排行榜设置分享与 PWA"
```

---

### Task 9: Final Verification And Smoke Test

**Files:**
- Modify: files only if verification finds concrete defects.

- [ ] **Step 1: Run full automated verification**

Run:

```powershell
pnpm.cmd test
pnpm.cmd build
```

Expected: both commands PASS.

- [ ] **Step 2: Start local dev server**

Run:

```powershell
pnpm.cmd dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 3: Desktop smoke test**

Open the local URL in a desktop-width browser and verify:

- The board is visible and centered.
- Start begins the game.
- Arrow keys move pieces.
- Space hard drops.
- `C` holds.
- Pause and restart work.
- Scores dialog opens.
- Settings dialog opens.
- Share button does not crash.

- [ ] **Step 4: H5 smoke test**

Use browser mobile emulation at 390x844 and verify:

- Full board is visible.
- Bottom controls do not cover the board.
- Left, right, rotate, soft drop, hard drop, and hold buttons work.
- Header buttons fit without overlapping.

- [ ] **Step 5: PWA smoke test**

Run:

```powershell
pnpm.cmd build
pnpm.cmd preview -- --host 127.0.0.1
```

Expected: preview server starts. In browser devtools, verify the manifest loads and a service worker is registered.

- [ ] **Step 6: Fix concrete defects**

If a verification step fails, make the smallest targeted edit in the failing module and rerun the failed command. Example fix pattern for a layout overflow:

```css
@media (max-width: 380px) {
  .game-canvas {
    width: min(90vw, 40vh, 340px);
  }
}
```

- [ ] **Step 7: Commit verification fixes**

If Step 6 changed files, run:

```powershell
git add src public
git commit -m "fix: 修复俄罗斯方块验收问题"
```

If Step 6 changed no files, do not create an empty commit.

---

## Self-Review

Spec coverage:

- React + TypeScript + Canvas scaffold: Task 1.
- Pure game core: Tasks 2, 3, and 4.
- 7-bag, movement, rotation, collision, line clear, scoring, level, Hold, Next, Ghost Piece, Game Over: Tasks 2, 3, 4, and 6.
- PC controls and H5 virtual buttons: Tasks 6 and 7.
- Local leaderboard, settings, share, PWA: Tasks 5 and 8.
- Responsive desktop/mobile layout: Tasks 7, 8, and 9.
- Verification: Task 9.

Placeholder scan:

- No placeholder markers.
- No deferred backend work in scope.
- No unresolved task references.

Type consistency:

- `GameState`, `GameAction`, `PieceType`, `Board`, and `ActivePiece` are introduced before use.
- Core modules use the same action names as UI controls.
- Storage types are shared by leaderboard and share helpers.
