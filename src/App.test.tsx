import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import App from './App';

const shareScoreMock = vi.hoisted(() => vi.fn());

vi.mock('./components/GameCanvas', () => ({
  GameCanvas: () => <div aria-label="Tetris board" />
}));

vi.mock('./share/shareScore', () => ({
  shareScore: shareScoreMock
}));

describe('App share feedback', () => {
  afterEach(() => {
    cleanup();
    shareScoreMock.mockReset();
  });

  test('shows a copied message when score sharing falls back to clipboard', async () => {
    shareScoreMock.mockResolvedValue('copied');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(shareScoreMock).toHaveBeenCalled());
    expect(screen.getByText('Score copied to clipboard.')).toBeTruthy();
  });
});
