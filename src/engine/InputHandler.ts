import { Game } from './Game';
import { Renderer } from '../renderer/Renderer';

export class InputHandler {
    game: Game;
    renderer: Renderer;
    isDragging: boolean;
    draggedPiece: { index: number } | null;
    dragElement: HTMLElement | null;
    startPos: { x: number, y: number };
    lastValidPos: { x: number, y: number } | null;

    constructor(game: Game, renderer: Renderer) {
        this.game = game;
        this.renderer = renderer;
        this.isDragging = false;
        this.draggedPiece = null;
        this.dragElement = null;
        this.startPos = { x: 0, y: 0 };
        this.lastValidPos = null;

        this.setupEventListeners();
    }



    setupEventListeners() {
        // Mouse
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Touch
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleMouseDown(e: MouseEvent) {
        if (this.game.gameOver || this.game.isProcessing) return;

        const target = (e.target as HTMLElement).closest('.hand-piece') as HTMLElement;
        if (!target) return;

        e.preventDefault();

        const indexStr = target.dataset.index;
        if (indexStr) {
            const index = parseInt(indexStr);
            this.startDrag(index, e.clientX, e.clientY);
        }
    }

    handleTouchStart(e: TouchEvent) {
        if (this.game.gameOver || this.game.isProcessing) return;

        const touch = e.touches[0];
        const target = (touch.target as HTMLElement).closest('.hand-piece') as HTMLElement;
        if (!target) return;

        e.preventDefault(); // Critical: Prevent scrolling while playing

        const indexStr = target.dataset.index;
        if (indexStr) {
            const index = parseInt(indexStr);
            this.startDrag(index, touch.clientX, touch.clientY);
        }
    }

    startDrag(index: number, clientX: number, clientY: number) {
        this.isDragging = true;
        this.draggedPiece = { index: index };
        this.lastValidPos = null;

        // Hide original
        const handPieces = document.querySelectorAll('.hand-piece');
        const original = handPieces[index] as HTMLElement;
        if (original) original.classList.add('dragging');

        // Trigger initial preview
        this.handleDragMove(clientX, clientY);
    }

    getGridPosition(clientX: number, clientY: number): { x: number, y: number } | null {
        // ... same logic ...
        const gridContainer = this.renderer.gridContainer;
        if (!gridContainer) return null;

        const rect = gridContainer.getBoundingClientRect();

        // Forgiving boundary
        const buffer = 30;
        if (clientX < rect.left - buffer || clientX > rect.right + buffer ||
            clientY < rect.top - buffer || clientY > rect.bottom + buffer) {
            return null;
        }

        const style = window.getComputedStyle(gridContainer);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const gap = parseFloat(style.gap) || 3;

        let cellSize = 38;
        const firstCell = gridContainer.querySelector('.grid-cell') as HTMLElement;
        if (firstCell) {
            cellSize = firstCell.offsetWidth;
        }

        const totalCellSize = cellSize + gap;

        const relativeX = clientX - rect.left - paddingLeft;
        const relativeY = clientY - rect.top - paddingTop;

        let gridX = Math.floor(relativeX / totalCellSize);
        let gridY = Math.floor(relativeY / totalCellSize);

        if (gridX < 0) gridX = 0;
        if (gridX >= this.game.GRID_SIZE) gridX = this.game.GRID_SIZE - 1;

        if (gridY < 0) gridY = 0;
        if (gridY >= this.game.GRID_SIZE) gridY = this.game.GRID_SIZE - 1;

        return { x: gridX, y: gridY };
    }

    handleMouseMove(e: MouseEvent) {
        if (!this.isDragging || !this.draggedPiece) return;
        this.handleDragMove(e.clientX, e.clientY);
    }

    handleTouchMove(e: TouchEvent) {
        if (!this.isDragging || !this.draggedPiece) return;
        e.preventDefault(); // Stop scroll
        const touch = e.touches[0];
        this.handleDragMove(touch.clientX, touch.clientY);
    }

    handleDragMove(clientX: number, clientY: number) {
        const pos = this.getGridPosition(clientX, clientY);
        const shape = this.game.hand[this.draggedPiece!.index];
        const rows = shape.length;
        const cols = shape[0].length;

        // Helper to check validity at a specific grid coordinate
        const checkValidity = (gx: number, gy: number) => {
            const tx = gx - Math.floor(cols / 2);
            const ty = gy - Math.floor(rows / 2);
            return {
                isValid: this.game.validatePlacement(tx, ty, shape),
                targetX: tx,
                targetY: ty
            };
        };

        let bestCandidate: { x: number, y: number, dist: number } | null = null;

        if (pos) {
            // Check direct position first
            const direct = checkValidity(pos.x, pos.y);
            if (direct.isValid) {
                bestCandidate = { x: direct.targetX, y: direct.targetY, dist: 0 };
            } else {
                // Search neighborhood (radius 2)
                const radius = 2;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        if (dx === 0 && dy === 0) continue; // Already checked

                        const nx = pos.x + dx;
                        const ny = pos.y + dy;

                        // Bounds check optimization (though validatePlacement handles it)
                        if (nx < 0 || nx >= this.game.GRID_SIZE || ny < 0 || ny >= this.game.GRID_SIZE) continue;

                        const neighbor = checkValidity(nx, ny);
                        if (neighbor.isValid) {
                            // Simple distance metric (Manhattan is fine for grid, Euclidean for precision)
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (!bestCandidate || dist < bestCandidate.dist) {
                                bestCandidate = { x: neighbor.targetX, y: neighbor.targetY, dist: dist };
                            }
                        }
                    }
                }
            }
        }

        if (bestCandidate) {
            this.lastValidPos = { x: bestCandidate.x, y: bestCandidate.y };
            this.game.previewPlacement(bestCandidate.x, bestCandidate.y, this.draggedPiece!.index);
        } else {
            // Fallback to sticky last valid pos if no neighbor found
            if (this.lastValidPos) {
                this.game.previewPlacement(this.lastValidPos.x, this.lastValidPos.y, this.draggedPiece!.index);
            } else {
                this.game.clearPreview();
            }
        }
    }

    updateDragPosition(x: number, y: number) {
        // No-op
    }

    async handleMouseUp(e: MouseEvent) {
        await this.handleDragEnd(e.clientX, e.clientY);
    }

    async handleTouchEnd(e: TouchEvent) {
        if (!this.isDragging) return;
        e.preventDefault();

        const touch = e.changedTouches[0];
        await this.handleDragEnd(touch.clientX, touch.clientY);
    }

    async handleDragEnd(clientX: number, clientY: number) {
        if (!this.isDragging || !this.draggedPiece) return;

        const pieceIndex = this.draggedPiece.index;

        // Show original again
        const handPieces = document.querySelectorAll('.hand-piece');
        const original = handPieces[pieceIndex] as HTMLElement;
        if (original) original.classList.remove('dragging');

        this.isDragging = false;
        this.draggedPiece = null;
        this.dragElement = null; // Ensure null even if not used
        this.game.clearPreview();

        // Use lastValidPos for placement if available
        if (this.lastValidPos) {
            await this.game.placePiece(this.lastValidPos.x, this.lastValidPos.y, pieceIndex);
        }

        this.lastValidPos = null;
    }
}
