export class Renderer {
    container: HTMLElement;
    scoreElement: HTMLElement | null = null;
    timeElement: HTMLElement | null = null;
    gridContainer: HTMLElement | null = null;
    handContainer: HTMLElement | null = null;
    interstitialPopup: HTMLElement | null = null;
    initialized: boolean = false;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    initialize(gameState: any) {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';

        const title = document.createElement('h1');
        title.innerHTML = 'Tetroku<span style="color:var(--primary-color)">.io</span>';
        title.style.textAlign = 'center';
        title.style.fontWeight = '300';
        this.container.appendChild(title);

        this.container.appendChild(title);

        const wrapper = document.createElement('div');
        wrapper.className = 'game-wrapper';
        this.container.appendChild(wrapper);

        // Stats Bar (Unified)
        const statsBar = document.createElement('div');
        statsBar.className = 'stats-bar glass-panel';

        this.scoreElement = document.createElement('div');
        this.scoreElement.className = 'score-board';
        this.scoreElement.innerText = `Score: ${gameState.score || 0}`;
        statsBar.appendChild(this.scoreElement);

        this.roundElement = document.createElement('div');
        this.roundElement.className = 'round-board';
        this.roundElement.innerText = `Round: ${gameState.turnCount || 0}`;
        statsBar.appendChild(this.roundElement);

        this.timeElement = document.createElement('div');
        this.timeElement.className = 'time-board';
        this.timeElement.innerText = `0:00`;
        statsBar.appendChild(this.timeElement);

        wrapper.appendChild(statsBar);

        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'grid-container glass-panel';
        this.gridContainer.style.gridTemplateColumns = `repeat(${gameState.GRID_SIZE}, 1fr)`;

        for (let y = 0; y < gameState.GRID_SIZE; y++) {
            for (let x = 0; x < gameState.GRID_SIZE; x++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'grid-cell';
                cellDiv.dataset.x = x.toString();
                cellDiv.dataset.y = y.toString();
                this.gridContainer.appendChild(cellDiv);
            }
        }
        wrapper.appendChild(this.gridContainer);

        this.handContainer = document.createElement('div');
        this.handContainer.className = 'hand-container';
        wrapper.appendChild(this.handContainer);

        this.createGameOverUI();

        this.initialized = true;
    }

    createGameOverUI() {
        // New "Interstitial" Popup style (Centered, better visuals)
        this.interstitialPopup = document.createElement('div');
        this.interstitialPopup.className = 'game-over-interstitial glass-panel';
        this.interstitialPopup.style.display = 'none';
        document.body.appendChild(this.interstitialPopup);
    }

    render(gameState: any) {
        if (!this.initialized) {
            this.initialize(gameState);
        }

        this.updateGrid(gameState);
        this.updateHand(gameState);
        this.updateScore(gameState.score || 0);
        this.updateRounds(gameState.turnCount || 0);
        this.updateTime(gameState.elapsedTime || 0);

        if (!gameState.gameOver) {
            this.hideGameOver();
        }
    }

    updateTime(seconds: number) {
        if (this.timeElement) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            this.timeElement.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }

    updateGrid(gameState: any) {
        if (!this.gridContainer) return;

        const cells = this.gridContainer.children;
        const grid = gameState.grid;
        const gridAges = gameState.gridAges;
        const currentTurn = gameState.turnCount;
        const size = grid.length;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = y * size + x;
                const cellDiv = cells[index] as HTMLElement;
                const val = grid[y][x];

                let ageClass = '';
                if (val !== 0) {
                    const placedTurn = gridAges[y][x];
                    const age = currentTurn - placedTurn;

                    if (age >= 8) ageClass = 'tile-age-red';
                    else if (age >= 5) ageClass = 'tile-age-orange';
                    else if (age >= 2) ageClass = 'tile-age-yellow';
                    else ageClass = 'tile-age-green';
                }

                const isPrefilled = val === 2;
                // prefilled don't age usually? or start at 0. Let them age.

                const baseClass = `grid-cell ${val ? 'filled' : ''} ${isPrefilled ? 'prefilled' : ''} ${ageClass}`;
                cellDiv.className = baseClass;
            }
        }
    }

    updateHand(gameState: any) {
        if (!this.handContainer) return;

        this.handContainer.innerHTML = '';

        gameState.hand.forEach((shape: number[][], index: number) => {
            const pieceDiv = document.createElement('div');
            pieceDiv.className = 'hand-piece glass-panel';
            pieceDiv.dataset.index = index.toString();

            if (shape) {
                const miniGrid = document.createElement('div');
                miniGrid.className = 'piece-grid';
                miniGrid.style.gridTemplateColumns = `repeat(${shape[0].length}, 1fr)`;

                shape.forEach((row: number[]) => {
                    row.forEach((val: number) => {
                        const miniCell = document.createElement('div');
                        miniCell.className = `piece-cell ${val ? 'filled' : ''}`;
                        miniGrid.appendChild(miniCell);
                    });
                });
                pieceDiv.appendChild(miniGrid);
            }

            this.handContainer!.appendChild(pieceDiv);
        });
    }

    animateClears(linesToClear: { rows: number[], cols: number[] }): Promise<void> {
        return new Promise((resolve) => {
            const cellsToAnimate: HTMLElement[] = [];

            linesToClear.rows.forEach(y => {
                const rowCells = this.container.querySelectorAll(`.grid-cell[data-y="${y}"]`);
                rowCells.forEach(el => cellsToAnimate.push(el as HTMLElement));
            });

            linesToClear.cols.forEach(x => {
                const colCells = this.container.querySelectorAll(`.grid-cell[data-x="${x}"]`);
                colCells.forEach(el => cellsToAnimate.push(el as HTMLElement));
            });

            cellsToAnimate.forEach(cell => {
                cell.classList.add('clearing');
            });

            setTimeout(() => {
                resolve();
            }, 500);
        });
    }

    updatePreview(cells: { x: number, y: number }[], isValid: boolean) {
        this.clearPreview();

        cells.forEach(pos => {
            const cell = this.container.querySelector(`.grid-cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
            if (cell) {
                cell.classList.add('preview');
                cell.classList.add(isValid ? 'valid' : 'invalid');
            }
        });
    }

    clearPreview() {
        const previews = this.container.querySelectorAll('.grid-cell.preview');
        previews.forEach(el => {
            el.classList.remove('preview', 'valid', 'invalid');
        });
    }

    updateScore(score: number) {
        if (this.scoreElement) {
            this.scoreElement.innerText = `Score: ${score}`;
        }
    }

    updateRounds(rounds: number) {
        if (this.roundElement) {
            this.roundElement.innerText = `Round: ${rounds}`;
        }
    }

    showInterstitialGameOver(finalScore: number, finalDuration: number) {
        if (this.interstitialPopup) {
            const mins = Math.floor(finalDuration / 60);
            const secs = finalDuration % 60;
            const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

            this.interstitialPopup.innerHTML = `
                <div class="interstitial-content">
                    <h2 class="interstitial-title">Game Over!</h2>
                    <div class="interstitial-stats">
                        <div class="stat-box">
                            <span class="stat-label">Score</span>
                            <span class="stat-value primary">${finalScore}</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-label">Time</span>
                            <span class="stat-value secondary">${timeStr}</span>
                        </div>
                    </div>
                    <button class="restart-btn pulse-btn">Play Again</button>
                </div>
            `;

            const restartBtn = this.interstitialPopup.querySelector('.restart-btn') as HTMLElement;
            restartBtn.onclick = () => {
                window.dispatchEvent(new CustomEvent('request-restart'));
            };

            this.interstitialPopup.style.display = 'flex';
        }
    }

    hideGameOver() {
        if (this.interstitialPopup) this.interstitialPopup.style.display = 'none';
    }
}
