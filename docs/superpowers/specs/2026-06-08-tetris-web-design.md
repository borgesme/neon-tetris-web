# Tetris Web Design

## Context

Build a responsive Tetris web application for PC and H5/mobile. The repository is a new git project with no application source yet.

Confirmed product direction:

- Scope: full productized single-player version.
- Layout: classic arcade-focused gameplay screen.
- Leaderboard: local-only leaderboard for the first version.
- Default theme: Neon Dark.
- H5 input: virtual buttons first.
- Technical route: React + TypeScript + Canvas.

## Goals

- Provide a playable classic Tetris experience on desktop and mobile browsers.
- Keep the game screen focused on the board, with product features available through non-intrusive panels and dialogs.
- Support local score persistence, theme settings, sharing, and PWA install/offline behavior.
- Keep game rules independent from React and DOM so the core can be tested directly.

## Non-Goals

- No online leaderboard, backend API, user accounts, or database in the first version.
- No multiplayer.
- No marketing landing page before the game screen.
- No heavy game engine dependency.

## Architecture

The application is split into a pure game core and a product UI shell.

### Game Core

Pure TypeScript module with no React, DOM, Canvas, or storage dependency.

Responsibilities:

- Board state and dimensions.
- Tetromino definitions and 7-bag random generation.
- Movement, rotation, wall-kick handling, collision checks, soft drop, hard drop.
- Piece locking, line clear detection, scoring, level progression, and game-over detection.
- Hold and Next queue rules.

The core exposes action-style functions that take the current state and return the next state.

### Game Loop

Coordinates time-based progression.

Responsibilities:

- Start, pause, resume, restart.
- Apply gravity ticks based on the current level.
- Convert keyboard and touch input into core actions.
- Throttle repeated input where needed.

### Renderer

Canvas-based renderer that consumes game state and theme tokens.

Responsibilities:

- Draw board cells, active piece, ghost piece, locked blocks, grid, and simple effects.
- Resize cleanly for desktop and mobile layouts.
- Avoid owning gameplay rules.

### React UI

Product shell and screen layout.

Responsibilities:

- Main responsive game screen.
- Score, level, lines, Next, Hold, and status panels.
- H5 virtual controls.
- Pause, settings, leaderboard, share, theme, sound, and PWA install UI.

### Storage

Local persistence layer based on `localStorage`, with in-memory fallback when storage is unavailable.

Persisted data:

- Local high scores.
- Selected theme.
- Sound preference.
- Optional control preference.

## Feature Set

### Core Gameplay

- Standard 10x20 board.
- Seven tetrominoes with 7-bag generation.
- Move left/right, rotate, soft drop, hard drop.
- Hold piece.
- Next queue.
- Ghost Piece.
- Pause and restart.
- Game Over.

### Scoring And Progression

- Different score values for clearing 1, 2, 3, or 4 lines.
- Soft drop and hard drop add small score bonuses.
- Level increases by cleared lines.
- Gravity speed increases as level increases.

### PC Controls

- Left/right arrows: move.
- Down arrow: soft drop.
- Space: hard drop.
- Up arrow or `X`: rotate clockwise.
- `Z`: rotate counter-clockwise.
- `C`: hold.
- `P`: pause.
- `R`: restart.

### H5 Controls

Bottom virtual control area:

- Left.
- Right.
- Rotate.
- Soft drop.
- Hard drop.
- Hold.

Controls must be large enough for thumb use and must not cover the board.

### Product Features

- Local leaderboard.
- Neon Dark default theme.
- Theme switching structure for future skins.
- Sound on/off setting.
- Share score as text.
- PWA install prompt when supported.
- Offline cache for the app shell.

## Responsive Layout

### Desktop

- Board is the central focus.
- Side panels show Hold, Next queue, score, level, lines, and actions.
- Product actions are visible but secondary.

### Mobile/H5

- Top area shows compact score/status.
- Center area shows a fully visible board.
- Bottom area shows virtual controls.
- Extreme narrow screens shrink the board before allowing overlap.

## State Model

Primary game phases:

- `ready`: waiting to start.
- `playing`: active game.
- `paused`: tick progression stopped.
- `gameOver`: final score locked and leaderboard update attempted.

UI overlays such as settings and leaderboard are separate UI state and do not mutate board state.

Input flow:

1. Keyboard or touch input is received.
2. UI/input layer maps it to a core action.
3. Game loop applies the action or gravity tick.
4. Core returns the next game state.
5. Canvas redraws from state.
6. React UI updates panels and overlays from the same state.

## Error Handling And Edge Cases

- If `localStorage` fails, use in-memory storage and keep gameplay available.
- If PWA install is unsupported, hide the install action.
- If sharing API is unsupported, fall back to copying or displaying share text.
- Ignore invalid gameplay actions for the current phase.
- Throttle repeated inputs to prevent accidental double actions on mobile.
- Preserve board visibility on both portrait and landscape mobile screens.

## Testing And Verification

Unit tests should cover:

- 7-bag generation.
- Movement and collision.
- Rotation and wall kicks.
- Line clear logic.
- Scoring and level progression.
- Hold behavior.
- Game Over detection.
- Storage fallback behavior.

Manual verification should cover:

- Desktop keyboard play.
- H5 virtual controls.
- Pause, restart, Hold, hard drop, and Ghost Piece.
- Local leaderboard persistence.
- Theme switching.
- Share behavior.
- PWA build/install/offline behavior where supported.
- Responsive layout on desktop and mobile widths.

Completion verification should include:

- Core test suite.
- Production build.
- Browser smoke test for desktop and mobile viewports.
