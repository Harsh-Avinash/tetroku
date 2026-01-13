import './style.css';
import { Game } from './engine/Game';
import { Renderer } from './renderer/Renderer';

console.log('Tetroku.io initializing...');

const app = document.querySelector('#app') as HTMLElement;
const renderer = new Renderer(app);
const game = new Game(renderer);

game.start();

window.addEventListener('request-restart', () => {
    game.restart();
});
