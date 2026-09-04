import { Assets } from './game/Assets.js';
import { Game } from './game/Game.js';
import { UI } from './ui/UI.js';

const canvas = document.getElementById('game');
const uiRoot = document.getElementById('ui');
const assets = new Assets();
const ui = new UI(uiRoot);
ui.showLoading(0);

assets.load((p) => ui.showLoading(p)).then(() => {
  const game = new Game(canvas, assets);
  ui.attach(game);
  window.__game = game;
  window.__ui = ui;
  const q = new URLSearchParams(location.search);
  if (q.get('auto')) { game.startRun(); ui.showHUD(); if (q.get('pu')) setTimeout(() => game._pickup(q.get('pu')), 1500); if (q.get('hover')) setTimeout(() => game.useHoverboard(), 1200); if (q.get('coins')) game.save.data.coins = +q.get('coins'); }
  else ui.showMenu();
  window.__ready = true;
}).catch((e) => {
  ui.showError(e);
  console.error(e);
});

// PWA service worker (only in production builds served over https)
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
