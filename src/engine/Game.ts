import { Renderer } from '../renderer/Renderer';
import { InputHandler } from './InputHandler';
import { SHAPES, Shape } from './Pieces';

export class Game {
    renderer: Renderer;
    GRID_SIZE: number;
    grid: number[][];
    hand: Shape[];
    inputHandler: InputHandler;
    score: number;
    gameOver: boolean;
    timerInterval: number | undefined;
    isProcessing: boolean;
    startTime: number;
    elapsedTime: number;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.GRID_SIZE = 9;
        this.grid = Array(this.GRID_SIZE).fill(null).map(() => Array(this.GRID_SIZE).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.isProcessing = false;
        this.hand = [];
        this.startTime = Date.now();
        this.elapsedTime = 0;

        this.generateInitialBlocks();
        this.refillHand();

        this.inputHandler = new InputHandler(this, renderer);
    }

    start() {
        console.log('Game started');
        this.score = 0;
        this.gameOver = false;
        this.isProcessing = false;
        this.startTime = Date.now();
        this.elapsedTime = 0;

        this.generateInitialBlocks();
        this.refillHand();
        this.renderer.render(this);

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.gameOver) {
                this.elapsedTime++;
                this.renderer.updateTime(this.elapsedTime);
            }
        }, 1000) as unknown as number;
    }

    restart() {
        this.start();
        this.renderer.hideGameOver();
    }

    rotateShape(shape: Shape): Shape {
        const rows = shape.length;
        const cols = shape[0].length;
        const newShape: number[][] = Array(cols).fill(null).map(() => Array(rows).fill(0));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                newShape[c][rows - 1 - r] = shape[r][c];
            }
        }
        return newShape;
    }

    bag: string[] = [];

    refillBag() {
        const keys = Object.keys(SHAPES);
        // Add 2 of each shape to the bag to ensure variety
        this.bag = [...keys, ...keys];
        // Fisher-Yates shuffle
        for (let i = this.bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
    }

    getRandomPiece(): Shape {
        if (this.bag.length === 0) {
            this.refillBag();
        }

        // Remove undefined check by asserting pop returns string if length > 0
        const key = this.bag.pop()!;

        let shape = SHAPES[key];
        // Double check shape exists
        if (!shape) shape = SHAPES['T'];

        const rotations = Math.floor(Math.random() * 4);
        for (let i = 0; i < rotations; i++) {
            shape = this.rotateShape(shape);
        }
        return shape;
    }

    refillHand() {
        this.hand = [];
        for (let i = 0; i < 3; i++) {
            this.hand.push(this.getRandomPiece());
        }
    }

    validatePlacement(gridX: number, gridY: number, shape: Shape): boolean {
        const rows = shape.length;
        const cols = shape[0].length;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (shape[r][c] === 1) {
                    const targetX = gridX + c;
                    const targetY = gridY + r;
                    if (targetX < 0 || targetX >= this.GRID_SIZE || targetY < 0 || targetY >= this.GRID_SIZE) return false;
                    if (this.grid[targetY][targetX] !== 0) return false;
                }
            }
        }
        return true;
    }

    async placePiece(gridX: number, gridY: number, shapeIndex: number): Promise<boolean> {
        if (this.gameOver || this.isProcessing) return false;

        const shape = this.hand[shapeIndex];
        if (!shape) return false;

        if (!this.validatePlacement(gridX, gridY, shape)) {
            return false;
        }

        this.isProcessing = true;

        // successful placement -> increment turn
        this.turnCount++;

        const rows = shape.length;
        const cols = shape[0].length;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (shape[r][c] === 1) {
                    this.grid[gridY + r][gridX + c] = 1;
                    // Mark Age
                    this.gridAges[gridY + r][gridX + c] = this.turnCount;
                }
            }
        }

        this.hand.splice(shapeIndex, 1);

        this.renderer.updateGrid(this); // Pass full state for ages
        this.renderer.updateRounds(this.turnCount);
        this.renderer.updateHand(this);

        await this.checkClears();

        if (this.hand.length === 0) {
            this.refillHand();
            this.renderer.updateHand(this);
        }

        if (this.checkGameOver()) {
            console.log("Game Over state detected!");
            this.gameOver = true;
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.renderer.showInterstitialGameOver(this.score, this.elapsedTime);
        } else {
            this.isProcessing = false;
        }

        return true;
    }

    async checkClears() {
        const linesToClear = {
            rows: [] as number[],
            cols: [] as number[]
        };

        for (let y = 0; y < this.GRID_SIZE; y++) {
            if (this.grid[y].every(cell => cell !== 0)) {
                linesToClear.rows.push(y);
            }
        }

        for (let x = 0; x < this.GRID_SIZE; x++) {
            let colFilled = true;
            for (let y = 0; y < this.GRID_SIZE; y++) {
                if (this.grid[y][x] === 0) {
                    colFilled = false;
                    break;
                }
            }
            if (colFilled) {
                linesToClear.cols.push(x);
            }
        }

        const totalClears = linesToClear.rows.length + linesToClear.cols.length;

        if (totalClears > 0) {
            console.log('Clearing with Aging:', linesToClear);

            await this.renderer.animateClears(linesToClear);

            let points = 0;

            // Calculate score per unique tile cleared based on age
            const clearedCells = new Set<string>();

            const processCell = (x: number, y: number) => {
                const key = `${x},${y}`;
                if (clearedCells.has(key)) return;
                clearedCells.add(key);

                const placeTurn = this.gridAges[y][x];
                const age = this.turnCount - placeTurn;

                // Scoring System:
                // Green (0-1): 0
                // Yellow (2-4): 20
                // Orange (5-7): 30
                // Red (8+): 50
                let tilePoints = 0;
                if (age >= 8) tilePoints = 50;
                else if (age >= 5) tilePoints = 30;
                else if (age >= 2) tilePoints = 20;
                else tilePoints = 0;

                points += tilePoints;
            };

            linesToClear.rows.forEach(y => {
                for (let x = 0; x < this.GRID_SIZE; x++) processCell(x, y);
                this.grid[y].fill(0);
                this.gridAges[y].fill(0);
            });

            linesToClear.cols.forEach(x => {
                for (let y = 0; y < this.GRID_SIZE; y++) processCell(x, y);
                for (let y = 0; y < this.GRID_SIZE; y++) {
                    this.grid[y][x] = 0;
                    this.gridAges[y][x] = 0;
                }
            });

            this.score += points;
            this.renderer.updateScore(this.score);

            this.renderer.updateGrid(this);
        }
    }

    generateInitialBlocks() {
        this.grid = Array(this.GRID_SIZE).fill(null).map(() => Array(this.GRID_SIZE).fill(0));
        this.gridAges = Array(this.GRID_SIZE).fill(null).map(() => Array(this.GRID_SIZE).fill(0)); // Reset ages
        let placed = 0;
        let attempts = 0;
        while (placed < 5 && attempts < 100) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            if (this.grid[y][x] === 0) {
                this.grid[y][x] = 2;
                this.gridAges[y][x] = 0; // Prefilled are age 0
                placed++;
            }
            attempts++;
        }
    }

    checkGameOver(): boolean {
        if (this.hand.length === 0) return false;

        for (const shape of this.hand) {
            for (let y = 0; y < this.GRID_SIZE; y++) {
                for (let x = 0; x < this.GRID_SIZE; x++) {
                    if (this.validatePlacement(x, y, shape)) {
                        return false;
                    }
                }
            }
        }

        console.log("GAME OVER");
        return true;
    }

    previewPlacement(gridX: number, gridY: number, shapeIndex: number) {
        if (this.isProcessing) return;

        const shape = this.hand[shapeIndex];
        if (!shape) return;

        const isValid = this.validatePlacement(gridX, gridY, shape);

        const affected: { x: number, y: number }[] = [];
        const rows = shape.length;
        const cols = shape[0].length;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (shape[r][c] === 1) {
                    affected.push({ x: gridX + c, y: gridY + r });
                }
            }
        }

        this.renderer.updatePreview(affected, isValid);
    }

    clearPreview() {
        this.renderer.clearPreview();
    }
}
