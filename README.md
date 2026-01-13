# Tetroku.io

A competitive puzzle game hybrid of Tetris and Sudoku.

## Gameplay
- **Mechanic**: Drag-and-drop Tetrominoes into a grid.
- **Goal**: Fill rows, columns, or subgrids to clear blocks and score points.
- **End Condition**: Game over when no available pieces can fit on the board.

## Multiplayer Architecture (Planned)
- **Mode**: 1v1 Competitive ("Battle Royale" style - who loses first).
- **Synchronization**: Both players receive the **same set of pieces**.
- **Implementation**:
    - The Random Number Generator (RNG) for pieces must be **seeded**.
    - We will use a Pseudorandom Number Generator (PRNG) so both clients can generate the exact same sequence of pieces given a shared seed.
    - Game state must be deterministic based on inputs.

## Tech Stack
- Vanilla JavaScript
- Vite
