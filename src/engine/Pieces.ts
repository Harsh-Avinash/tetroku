export type Shape = number[][];

export const SHAPES: Record<string, Shape> = {
    // Classic Tetrominoes
    I: [[1, 1, 1, 1]],
    J: [
        [1, 0, 0],
        [1, 1, 1],
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
    ],
    O: [
        [1, 1],
        [1, 1],
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
    ],
};

export const COLORS: Record<string, string> = {
    I: '#00ccff', // Cyan
    J: '#0066ff', // Blue
    L: '#ffaa00', // Orange
    O: '#ffff00', // Yellow
    S: '#00ff00', // Green
    T: '#cc00ff', // Purple
    Z: '#ff0000', // Red
};
