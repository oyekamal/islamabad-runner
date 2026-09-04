/** Swipe + keyboard input. Emits 'left' | 'right' | 'up' | 'down' | 'tap' | 'doubletap'. */
export class Input {
  constructor(el) {
    this.el = el;
    this.handlers = [];
    this.enabled = true;
    this.threshold = 28;
    this._down = null;
    this._swiped = false;
    this._lastTap = 0;
    this._moved = false;

    el.addEventListener('pointerdown', (e) => this._onDown(e), { passive: true });
    el.addEventListener('pointermove', (e) => this._onMove(e), { passive: true });
    el.addEventListener('pointerup', (e) => this._onUp(e), { passive: true });
    el.addEventListener('pointercancel', () => { this._down = null; }, { passive: true });
    window.addEventListener('keydown', (e) => this._onKey(e));
  }

  on(fn) { this.handlers.push(fn); return () => { this.handlers = this.handlers.filter((h) => h !== fn); }; }
  emit(type) { if (!this.enabled) return; for (const h of this.handlers) h(type); }

  _onDown(e) {
    if (e.target.closest && e.target.closest('.ui-block')) return;   // clicks on menus are not swipes
    this._down = { x: e.clientX, y: e.clientY, t: performance.now() };
    this._swiped = false;
    this._moved = false;
  }

  _onMove(e) {
    if (!this._down || this._swiped) return;
    const dx = e.clientX - this._down.x;
    const dy = e.clientY - this._down.y;
    if (Math.abs(dx) < this.threshold && Math.abs(dy) < this.threshold) return;
    this._swiped = true;
    this._moved = true;
    if (Math.abs(dx) > Math.abs(dy)) this.emit(dx > 0 ? 'right' : 'left');
    else this.emit(dy > 0 ? 'down' : 'up');
  }

  _onUp(e) {
    if (!this._down) return;
    const d = this._down;
    this._down = null;
    if (this._swiped) return;
    const dt = performance.now() - d.t;
    if (dt < 350) {
      const now = performance.now();
      if (now - this._lastTap < 320) { this._lastTap = 0; this.emit('doubletap'); }
      else { this._lastTap = now; this.emit('tap'); }
    }
  }

  _onKey(e) {
    if (e.repeat) return;
    const map = {
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
      ArrowUp: 'up', w: 'up', W: 'up', ' ': 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      Enter: 'tap', h: 'doubletap', H: 'doubletap',
      Escape: 'pause', p: 'pause', P: 'pause',
    };
    const t = map[e.key];
    if (t) { e.preventDefault(); this.emit(t); }
  }
}
