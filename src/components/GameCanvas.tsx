import { useEffect, useRef } from 'react';
import { getPieceCells } from '../game/board';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../game/constants';
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

function drawCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  color: string,
  alpha = 1
) {
  if (y < 0) {
    return;
  }

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 8;
  context.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
  context.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  context.strokeRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
  context.restore();
}

function drawGrid(context: CanvasRenderingContext2D, cellSize: number) {
  context.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  context.lineWidth = 1;

  for (let x = 0; x <= BOARD_WIDTH; x += 1) {
    context.beginPath();
    context.moveTo(x * cellSize + 0.5, 0);
    context.lineTo(x * cellSize + 0.5, BOARD_HEIGHT * cellSize);
    context.stroke();
  }

  for (let y = 0; y <= BOARD_HEIGHT; y += 1) {
    context.beginPath();
    context.moveTo(0, y * cellSize + 0.5);
    context.lineTo(BOARD_WIDTH * cellSize, y * cellSize + 0.5);
    context.stroke();
  }
}

export function GameCanvas({ state }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * pixelRatio);
    canvas.height = Math.floor(rect.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const cellSize = Math.min(rect.width / BOARD_WIDTH, rect.height / BOARD_HEIGHT);
    const width = BOARD_WIDTH * cellSize;
    const height = BOARD_HEIGHT * cellSize;

    context.fillStyle = '#0b1020';
    context.fillRect(0, 0, width, height);
    drawGrid(context, cellSize);

    state.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          drawCell(context, x, y, cellSize, COLORS[cell]);
        }
      });
    });

    const ghost = getGhostPiece(state.board, state.active);
    getPieceCells(ghost).forEach((cell) =>
      drawCell(context, cell.x, cell.y, cellSize, COLORS[cell.type], 0.25)
    );
    getPieceCells(state.active).forEach((cell) =>
      drawCell(context, cell.x, cell.y, cellSize, COLORS[cell.type])
    );
  }, [state]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Tetris board" />;
}
