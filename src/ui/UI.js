import { CHARACTERS, BOARDS } from '../data/characters.js';
import { MISSION_SETS, MAX_MULTIPLIER, DAILY_REWARDS } from '../data/missions.js';
import { POWERUP_UPGRADE_COST, HOVERBOARD_COST, HEADSTART_COST, SCORE_BOOSTER_COST, MYSTERY_BOX_COST } from '../game/constants.js';

const fmt = (n) => Math.floor(n).toLocaleString('en-US');
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const PU_LABEL = { jetpack: 'J', sneakers: 'S', magnet: 'M', multiplier: '2X', hover: 'H' };
const PU_NAME = { jetpack: 'Jetpack', sneakers: 'Super Sneakers', magnet: 'Coin Magnet', multiplier: '2X Multiplier' };

export class UI {
  constructor(root) {
    this.root = root;
    this.game = null;
    this.prerun = { headstart: false, booster: false };
    this.toastEl = null;
  }

  clear() { this.root.innerHTML = ''; this.hud = null; }

  // ------------------------------------------------------------------ boot screens
  showLoading(p) {
    if (!this.loadingEl) {
      this.loadingEl = h(`<div id="loading" class="screen ui-block">
        <div class="big-title">ISLAMABAD<br>RUNNER<small>3D</small></div>
        <div style="height:24px"></div>
        <div class="progress"><i style="width:0%"></i></div>
        <div style="margin-top:12px;font-weight:900;text-shadow:0 2px 0 #1a2238">Loading the city…</div></div>`);
      this.root.appendChild(this.loadingEl);
    }
    this.loadingEl.querySelector('.progress i').style.width = Math.round(p * 100) + '%';
  }

  showError(e) {
    this.clear();
    this.root.appendChild(h(`<div class="screen dim ui-block"><div class="panel"><h2>Oops</h2><p>${String(e && e.message || e)}</p><p class="small-note">Your device needs WebGL2 to run this game.</p></div></div>`));
  }

  attach(game) {
    this.game = game;
    game.on('tapToPlay', () => this.startFromMenu());
    game.on('hud', (d) => this.updateHUD(d));
    game.on('coins', () => {});
    game.on('powerup', ({ kind, duration }) => { this.toast(PU_NAME[kind].toUpperCase() + '!'); this._ensureBar(kind, duration); });
    game.on('powerupEnd', (k) => this._removeBar(k));
    game.on('hoverboard', ({ time }) => this._ensureBar('hover', time));
    game.on('hoverboardEnd', () => this._removeBar('hover'));
    game.on('toast', (t) => this.toast(t));
    game.on('stumble', () => this.flash());
    game.on('mystery', (r) => this.toast(this._rewardText(r)));
    game.on('letter', ({ letter }) => { this.toast(`LETTER ${letter}!`); this._renderLetters(); });
    game.on('missionComplete', (m) => this.toast(`<b>MISSION COMPLETE</b>${m.text}`, 'mission'));
    game.on('missionSetComplete', ({ multiplier }) => this.toast(`<b>MISSION SET DONE</b>Multiplier is now x${multiplier}!`, 'mission'));
    game.on('gameOver', (d) => this.showGameOver(d));
    game.on('paused', () => this.showPause());
    game.on('resumed', () => this.showHUD());
    game.on('revived', () => this.showHUD());
    game.on('menu', () => this.showMenu());
    document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'running') game.pause(); });
  }

  _rewardText(r) {
    const t = { coins: `+${r.amount} COINS`, keys: '+1 KEY', hoverboard: '+1 HOVERBOARD', token: '+1 CHARACTER TOKEN', headstart: '+1 HEADSTART', booster: '+1 SCORE BOOSTER' }[r.type];
    return r.unlock ? `${t} — ${r.unlock.toUpperCase()} UNLOCKED!` : `MYSTERY BOX: ${t}`;
  }

  // ------------------------------------------------------------------ menu
  showMenu() {
    this.clear();
    const s = this.game.save.data;
    const char = this.game.characterDef();
    const missions = this.game.missionProgress();
    const missionsLeft = missions.filter((m) => !m.done).length;
    const daily = s.daily;
    const el = h(`<div id="menu" class="screen">
      <div class="topbar ui-block">
        <span class="pill"><i class="ico coin">$</i>${fmt(s.coins)}</span>
        <span class="pill"><i class="ico key">⚷</i>${s.keys}</span>
        <span class="spacer"></span>
        <button class="icon-btn" data-act="settings" aria-label="Settings">⚙</button>
      </div>
      <div class="center" data-act="play">
        <div class="big-title fade-in">ISLAMABAD<br>RUNNER<small>3D</small></div>
        <div class="high">Best: ${fmt(s.highScore)} pts · ${fmt(s.bestDistance)} m</div>
        <div class="spacer"></div>
        <div class="tap-to-play">TAP TO PLAY</div>
        <div class="char-name">${char.name}</div>
      </div>
      <div class="menu-bottom ui-block">
        <div class="prerun">
          <button class="toggle-item ${s.headstarts > 0 ? (this.prerun.headstart ? 'on' : '') : 'off'}" data-act="toggle-headstart">🚀 Headstart <b>×${s.headstarts}</b></button>
          <button class="toggle-item ${s.scoreBoosters > 0 ? (this.prerun.booster ? 'on' : '') : 'off'}" data-act="toggle-booster">⭐ Booster <b>×${s.scoreBoosters}</b></button>
          <span class="toggle-item">🛹 <b>×${s.hoverboards}</b></span>
        </div>
        <div class="menu-nav">
          <button class="nav-btn" data-act="shop"><span class="em">🛍️</span>Shop</button>
          <button class="nav-btn" data-act="missions"><span class="em">🎯</span>Missions${missionsLeft ? `<span class="badge">${missionsLeft}</span>` : ''}</button>
          <button class="nav-btn" data-act="daily"><span class="em">🔤</span>Word Hunt${!daily.done ? '<span class="badge">!</span>' : ''}</button>
          <button class="nav-btn" data-act="chars"><span class="em">🧢</span>Me</button>
          <button class="nav-btn" data-act="records"><span class="em">🏆</span>Top</button>
        </div>
      </div></div>`);
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      this.game.audio.init(); this.game.audio.click();
      const act = a.dataset.act;
      if (act === 'play') this.startFromMenu();
      else if (act === 'shop') this.showShop('items');
      else if (act === 'chars') this.showShop('characters');
      else if (act === 'missions') this.showMissions();
      else if (act === 'daily') this.showDaily();
      else if (act === 'records') this.showRecords();
      else if (act === 'settings') this.showSettings();
      else if (act === 'toggle-headstart') { if (s.headstarts > 0) { this.prerun.headstart = !this.prerun.headstart; this.showMenu(); } else this.showShop('items'); }
      else if (act === 'toggle-booster') { if (s.scoreBoosters > 0) { this.prerun.booster = !this.prerun.booster; this.showMenu(); } else this.showShop('items'); }
    });
    this.root.appendChild(el);
  }

  startFromMenu() {
    if (this.game.state !== 'menu') return;
    this.game.startRun({ headstart: this.prerun.headstart, booster: this.prerun.booster });
    this.prerun = { headstart: false, booster: false };
    this.showHUD();
    if (!this.game.save.data.tutorialDone) this.showTutorial();
  }

  // ------------------------------------------------------------------ HUD
  showHUD() {
    this.clear();
    const s = this.game.save.data;
    const word = this.game.dailyWord || '';
    this.hud = h(`<div id="hud">
      <div class="top">
        <div><div class="score">0</div><span class="mult">x${this.game.multiplier}</span></div>
        <div class="right">
          <button class="icon-btn pause" aria-label="Pause">II</button>
          <div class="coins"><i class="ico coin"></i><span class="n">0</span></div>
        </div>
      </div>
      <div class="letters">${[...word].map((c, i) => `<span class="${i < this.game.dailyLettersCollected ? 'got' : ''}">${c}</span>`).join('')}</div>
      <div class="powerbars"></div>
      <button class="hover-btn"><span class="em">🛹</span><span class="n">×${s.hoverboards}</span></button>
      <div class="toasts"></div>
    </div>`);
    this.hud.querySelector('.pause').addEventListener('click', () => this.game.pause());
    this.hud.querySelector('.hover-btn').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.game.useHoverboard(); this._refreshHoverCount(); });
    this.root.appendChild(this.hud);
    this.toastEl = this.hud.querySelector('.toasts');
    this.bars = {};
    this.barsEl = this.hud.querySelector('.powerbars');
    // re-add bars for active powerups (after revive / unpause)
    for (const k of Object.keys(this.game.powerups)) if (this.game.powerups[k] > 0) this._ensureBar(k, this.game.powerups[k]);
    if (this.game.hoverTimer > 0) this._ensureBar('hover', this.game.hoverTimer);
    this._lastScore = -1; this._lastCoins = -1; this._lastMult = -1;
  }

  _refreshHoverCount() { if (this.hud) this.hud.querySelector('.hover-btn .n').textContent = '×' + this.game.save.data.hoverboards; }
  _renderLetters() {
    if (!this.hud) return;
    const spans = this.hud.querySelectorAll('.letters span');
    spans.forEach((sp, i) => sp.classList.toggle('got', i < this.game.dailyLettersCollected));
  }

  _ensureBar(kind, duration) {
    if (!this.barsEl) return;
    if (!this.bars[kind]) {
      const el = h(`<div class="pbar ${kind}"><span class="ico">${PU_LABEL[kind]}</span><div class="bar"><i style="width:100%"></i></div></div>`);
      this.barsEl.appendChild(el);
      this.bars[kind] = { el, duration };
    } else this.bars[kind].duration = duration;
  }

  _removeBar(kind) { if (this.bars && this.bars[kind]) { this.bars[kind].el.remove(); delete this.bars[kind]; } }

  updateHUD(d) {
    if (!this.hud) return;
    if (d.score !== this._lastScore) { this.hud.querySelector('.score').textContent = fmt(d.score); this._lastScore = d.score; }
    if (d.coins !== this._lastCoins) { this.hud.querySelector('.coins .n').textContent = fmt(d.coins); this._lastCoins = d.coins; }
    if (d.multiplier !== this._lastMult) { const m = this.hud.querySelector('.mult'); m.textContent = 'x' + d.multiplier; m.classList.toggle('x2', d.powerups.multiplier > 0); this._lastMult = d.multiplier; }
    for (const k of Object.keys(this.bars)) {
      const b = this.bars[k];
      const remain = k === 'hover' ? d.hover : (d.powerups[k] || 0);
      b.el.querySelector('.bar i').style.width = Math.max(0, Math.min(100, remain / b.duration * 100)) + '%';
    }
  }

  toast(text, cls = '') {
    if (!this.toastEl) return;
    const t = h(`<div class="toast ${cls}">${text}</div>`);
    this.toastEl.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, cls === 'mission' ? 2600 : 1400);
  }

  flash() {
    if (!this.hud) return;
    const f = h('<div class="stumble-flash"></div>');
    this.hud.appendChild(f);
    setTimeout(() => f.remove(), 500);
  }

  showTutorial() {
    if (!this.hud) return;
    const steps = ['SWIPE ⬅ ➡ TO CHANGE LANES', 'SWIPE ⬆ TO JUMP', 'SWIPE ⬇ TO ROLL', 'DOUBLE TAP FOR HOVERBOARD'];
    let i = 0;
    const el = h(`<div class="tutorial">${steps[0]}</div>`);
    this.hud.appendChild(el);
    const iv = setInterval(() => { i++; if (i >= steps.length || !this.hud) { clearInterval(iv); el.remove(); this.game.save.data.tutorialDone = true; this.game.save.write(); return; } el.textContent = steps[i]; }, 2600);
  }

  // ------------------------------------------------------------------ pause
  showPause() {
    const el = h(`<div class="overlay ui-block fade-in"><div class="panel">
      <h2>Paused</h2>
      <div class="stat-grid"><div class="stat"><div class="k">Score</div><div class="v">${fmt(this.game.run.score)}</div></div><div class="stat"><div class="k">Coins</div><div class="v">${fmt(this.game.run.coins)}</div></div></div>
      <div class="row"><button class="btn orange" data-act="resume">Resume</button><button class="btn ghost" data-act="quit">Quit</button></div>
    </div></div>`);
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'resume') { el.remove(); this.game.resume(); }
      if (a.dataset.act === 'quit') { this.game.finishRun(); this.game.goToMenu(); }
    });
    this.root.appendChild(el);
  }

  // ------------------------------------------------------------------ game over
  showGameOver({ run, canRevive, keysNeeded, cause }) {
    const s = this.game.save.data;
    const isBest = Math.floor(run.score) > s.highScore;
    const causeText = { train: 'You ran into a train!', moving_train: 'Flattened by an oncoming train!', pillar: 'Head first into a pillar!', caught: 'The warden grabbed you!',
      barrier_low: 'Tripped over a barrier!', barrier_high: 'Should have rolled under that!', barrier_mid: 'Smacked into the barrier!' }[cause] || 'Caught!';
    const el = h(`<div class="overlay ui-block fade-in"><div class="panel">
      <div class="caught-title">CAUGHT!</div>
      <div class="small-note" style="margin:0 0 8px">${causeText}</div>
      ${isBest ? '<div class="newbest">★ NEW HIGH SCORE ★</div>' : ''}
      <div class="stat-grid">
        <div class="stat"><div class="k">Score</div><div class="v">${fmt(run.score)}</div></div>
        <div class="stat"><div class="k">Coins</div><div class="v">${fmt(run.coins)}</div></div>
        <div class="stat"><div class="k">Distance</div><div class="v">${fmt(this.game.distance)} m</div></div>
        <div class="stat"><div class="k">Multiplier</div><div class="v">x${this.game.baseMultiplier}</div></div>
      </div>
      <div class="row" style="flex-direction:column">
        <button class="btn yellow saveme" data-act="revive" ${canRevive ? '' : 'disabled'}>⚷ Save me! (${keysNeeded} key${keysNeeded > 1 ? 's' : ''} · you have ${s.keys})<span class="timer" style="width:100%"></span></button>
        <div class="row"><button class="btn ghost" data-act="home">Home</button><button class="btn orange" data-act="again">Play again</button></div>
      </div>
    </div></div>`);
    const timer = el.querySelector('.timer');
    let t = 6.0;
    const iv = setInterval(() => { t -= 0.1; timer.style.width = Math.max(0, t / 6 * 100) + '%'; if (t <= 0) { clearInterval(iv); const b = el.querySelector('[data-act=revive]'); b.disabled = true; b.textContent = 'Too late…'; } }, 100);
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      this.game.audio.click();
      if (a.dataset.act === 'revive') { clearInterval(iv); if (this.game.revive()) el.remove(); }
      if (a.dataset.act === 'home') { clearInterval(iv); this.game.goToMenu(); }
      if (a.dataset.act === 'again') { clearInterval(iv); this.game.finishRun(); this.game.startRun(); this.showHUD(); }
    });
    this.root.appendChild(el);
  }

  // ------------------------------------------------------------------ shop
  showShop(tab = 'items') {
    this.clear();
    const s = this.game.save.data;
    const el = h(`<div class="screen dim scroll ui-block">
      <div class="topbar"><span class="pill"><i class="ico coin">$</i>${fmt(s.coins)}</span><span class="pill"><i class="ico key">⚷</i>${s.keys}</span><span class="spacer"></span><button class="icon-btn" data-act="back">✕</button></div>
      <div class="center" style="justify-content:flex-start;margin-top:12px"><div class="panel" style="width:min(460px,100%);position:relative">
        <h2>Shop</h2>
        <div class="tabs">${['items', 'characters', 'boards', 'upgrades'].map((t) => `<button class="tab ${t === tab ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('')}</div>
        <div class="list"></div>
      </div></div></div>`);
    const list = el.querySelector('.list');
    const render = () => {
      list.innerHTML = '';
      if (tab === 'items') {
        const items = [
          { id: 'hoverboard', em: '🛹', name: 'Hoverboard', desc: 'Double-tap to ride for 30 s. Saves you from one crash.', cost: HOVERBOARD_COST, have: s.hoverboards, bg: '#c9f2ef' },
          { id: 'headstart', em: '🚀', name: 'Headstart', desc: 'Blast 300 m ahead at the start of a run.', cost: HEADSTART_COST, have: s.headstarts, bg: '#ffd9c7' },
          { id: 'booster', em: '⭐', name: 'Score Booster', desc: 'Adds +5 to +7 to your multiplier for one run.', cost: SCORE_BOOSTER_COST, have: s.scoreBoosters, bg: '#fff1b8' },
          { id: 'mystery', em: '🎁', name: 'Mystery Box', desc: 'Coins, keys, boards, tokens… open it now!', cost: MYSTERY_BOX_COST, have: s.mysteryBoxes, bg: '#e6d4ff' },
        ];
        for (const it of items) list.appendChild(h(`<div class="card"><div class="swatch" style="background:${it.bg}">${it.em}</div><div class="info"><div class="name">${it.name} <small style="color:#6b7280">×${it.have}</small></div><div class="desc">${it.desc}</div></div>
          <button class="btn yellow small" data-buy="${it.id}" ${s.coins < it.cost ? 'disabled' : ''}>$ ${fmt(it.cost)}</button></div>`));
      } else if (tab === 'characters') {
        for (const c of CHARACTERS) {
          const owned = s.unlockedCharacters.includes(c.id);
          const sel = s.character === c.id;
          let btn;
          if (sel) btn = '<span class="btn small" style="background:var(--teal)">Selected</span>';
          else if (owned) btn = `<button class="btn small orange" data-select-char="${c.id}">Select</button>`;
          else if (c.tokens) btn = `<span class="btn small ghost">${s.tokens}/${c.tokens} tokens</span>`;
          else btn = `<button class="btn small yellow" data-buy-char="${c.id}" ${s.coins < c.cost ? 'disabled' : ''}>$ ${fmt(c.cost)}</button>`;
          list.appendChild(h(`<div class="card ${sel ? 'selected' : ''}"><div class="swatch" style="background:${c.palette.hoodie}"><span style="width:26px;height:26px;border-radius:50%;background:${c.palette.skin || '#e8b58a'};border-top:8px solid ${c.palette.cap};display:block"></span></div><div class="info"><div class="name">${c.name}</div><div class="desc">${c.desc}</div></div>${btn}</div>`));
        }
      } else if (tab === 'boards') {
        for (const b of BOARDS) {
          const owned = s.unlockedBoards.includes(b.id);
          const sel = s.board === b.id;
          let btn;
          if (sel) btn = '<span class="btn small" style="background:var(--teal)">Selected</span>';
          else if (owned) btn = `<button class="btn small orange" data-select-board="${b.id}">Select</button>`;
          else btn = `<button class="btn small yellow" data-buy-board="${b.id}" ${s.coins < b.cost ? 'disabled' : ''}>$ ${fmt(b.cost)}</button>`;
          list.appendChild(h(`<div class="card ${sel ? 'selected' : ''}"><div class="swatch" style="background:linear-gradient(90deg,${b.deck} 40%,${b.stripe} 40%,${b.stripe} 60%,${b.deck} 60%);border-radius:10px"></div><div class="info"><div class="name">${b.name}</div><div class="desc">${b.desc}</div></div>${btn}</div>`));
        }
      } else if (tab === 'upgrades') {
        for (const k of ['jetpack', 'sneakers', 'magnet', 'multiplier']) {
          const lvl = s.upgrades[k] || 0;
          const max = POWERUP_UPGRADE_COST.length;
          const cost = lvl < max ? POWERUP_UPGRADE_COST[lvl] : null;
          list.appendChild(h(`<div class="card"><div class="swatch" style="background:#e3f2ff">${{ jetpack: '🚀', sneakers: '👟', magnet: '🧲', multiplier: '✖️' }[k]}</div><div class="info"><div class="name">${PU_NAME[k]}</div><div class="desc">Lasts ${10 + lvl * 5} s${cost ? ` → ${15 + lvl * 5} s` : ' (max)'}</div><div class="lvl">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div></div>
            ${cost ? `<button class="btn small yellow" data-upgrade="${k}" ${s.coins < cost ? 'disabled' : ''}>$ ${fmt(cost)}</button>` : '<span class="btn small ghost">MAX</span>'}</div>`));
        }
      }
    };
    render();
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]'); if (t) { this.game.audio.click(); this.showShop(t.dataset.tab); return; }
      const a = e.target.closest('[data-act]'); if (a && a.dataset.act === 'back') { this.game.audio.click(); this.showMenu(); return; }
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const g = this.game;
      const spend = (n) => { s.coins -= n; g.save.addStat('spent', n); g.audio.buy(); };
      if (b.dataset.buy) {
        const id = b.dataset.buy;
        if (id === 'hoverboard') { spend(HOVERBOARD_COST); s.hoverboards++; }
        if (id === 'headstart') { spend(HEADSTART_COST); s.headstarts++; }
        if (id === 'booster') { spend(SCORE_BOOSTER_COST); s.scoreBoosters++; }
        if (id === 'mystery') { spend(MYSTERY_BOX_COST); g.save.addStat('boxesBought'); const r = g.openMysteryBox(); this.showMysteryReveal(r); }
      }
      if (b.dataset.buyChar) { const c = CHARACTERS.find((x) => x.id === b.dataset.buyChar); spend(c.cost); s.unlockedCharacters.push(c.id); s.character = c.id; }
      if (b.dataset.selectChar) { s.character = b.dataset.selectChar; g.audio.click(); g.player.setCharacter(g.characterDef()); }
      if (b.dataset.buyBoard) { const bd = BOARDS.find((x) => x.id === b.dataset.buyBoard); spend(bd.cost); s.unlockedBoards.push(bd.id); s.board = bd.id; }
      if (b.dataset.selectBoard) { s.board = b.dataset.selectBoard; g.audio.click(); }
      if (b.dataset.upgrade) { const k = b.dataset.upgrade; spend(POWERUP_UPGRADE_COST[s.upgrades[k] || 0]); s.upgrades[k] = (s.upgrades[k] || 0) + 1; }
      g.save.write(); g._checkMissions();
      if (g.state === 'menu') g.player.setCharacter(g.characterDef());
      this.showShop(tab);
    });
    this.root.appendChild(el);
  }

  showMysteryReveal(r) {
    const em = { coins: '💰', keys: '⚷', hoverboard: '🛹', token: '🎟️', headstart: '🚀', booster: '⭐' }[r.type];
    const el = h(`<div class="overlay ui-block"><div class="panel" style="width:min(320px,100%)"><div class="mystery-reveal"><span class="em">${em}</span>${this._rewardText(r).replace('MYSTERY BOX: ', '')}</div><div class="row"><button class="btn orange" data-act="ok">Nice!</button></div></div></div>`);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-act]')) el.remove(); });
    this.root.appendChild(el);
  }

  // ------------------------------------------------------------------ missions / daily / records / settings
  showMissions() {
    this.clear();
    const s = this.game.save.data;
    const prog = this.game.missionProgress();
    const setNo = Math.min(s.missionSet + 1, MISSION_SETS.length);
    const el = h(`<div class="screen dim scroll ui-block">
      <div class="topbar"><span class="pill">🎯 Set ${setNo}/${MISSION_SETS.length}</span><span class="pill">Multiplier x${Math.min(MAX_MULTIPLIER, 1 + s.missionSet)}</span><span class="spacer"></span><button class="icon-btn" data-act="back">✕</button></div>
      <div class="center" style="justify-content:flex-start;margin-top:12px"><div class="panel" style="width:min(460px,100%)">
        <h2>Missions</h2>
        <div class="list">${prog.map((m) => `<div class="mission-card"><div class="t"><span>${m.text}</span><span class="${m.done ? 'done' : ''}">${m.done ? '✔' : ''}</span></div><div class="bar"><i style="width:${Math.min(100, m.value / m.target * 100)}%"></i></div><div class="p">${fmt(m.value)} / ${fmt(m.target)}${m.scope === 'run' ? ' · in one run' : ''}</div></div>`).join('')}</div>
        <div class="small-note">Complete all three to raise your score multiplier (max x${MAX_MULTIPLIER}).</div>
      </div></div></div>`);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-act=back]')) { this.game.audio.click(); this.showMenu(); } });
    this.root.appendChild(el);
  }

  showDaily() {
    this.clear();
    const s = this.game.save.data;
    const word = this.game.dailyWord;
    const got = this.game.dailyLettersCollected;
    const el = h(`<div class="screen dim scroll ui-block">
      <div class="topbar"><span class="pill">🔥 Streak ${s.daily.streak || 0}</span><span class="spacer"></span><button class="icon-btn" data-act="back">✕</button></div>
      <div class="center" style="justify-content:flex-start;margin-top:12px"><div class="panel" style="width:min(460px,100%)">
        <h2>Daily Word Hunt</h2>
        <div class="small-note" style="margin:0">Collect the floating letters during your runs to spell today's word.</div>
        <div class="word">${[...word].map((c, i) => `<span class="${i < got ? 'got' : ''}">${i < got ? c : '?'}</span>`).join('')}</div>
        <div class="small-note">${s.daily.done ? '✔ Completed today! Come back tomorrow for a new word.' : `${got}/${word.length} letters found`}</div>
        <div style="margin-top:14px;font-weight:900;color:var(--blue)">Streak rewards</div>
        <div class="list" style="max-height:none">${DAILY_REWARDS.map((r, i) => `<div class="lb-row ${i === Math.min(s.daily.streak, DAILY_REWARDS.length - 1) && !s.daily.done ? 'selected' : ''}"><span>Day ${i + 1}</span><span>${typeof r === 'number' ? `$ ${fmt(r)}` : r.keys ? `⚷ ${r.keys} keys` : '🎁 Mystery Box'}</span></div>`).join('')}</div>
      </div></div></div>`);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-act=back]')) { this.game.audio.click(); this.showMenu(); } });
    this.root.appendChild(el);
  }

  showRecords() {
    this.clear();
    const s = this.game.save.data;
    const rows = s.leaderboard.length ? s.leaderboard.map((r, i) => `<div class="lb-row"><span class="rank">${i + 1}.</span><span style="flex:1">${fmt(r.score)}</span><span style="color:#6b7280;font-size:13px">${fmt(r.distance)} m · ${r.date}</span></div>`).join('') : '<div class="small-note">No runs yet. Go run!</div>';
    const el = h(`<div class="screen dim scroll ui-block">
      <div class="topbar"><span class="pill">🏆 ${fmt(s.highScore)}</span><span class="spacer"></span><button class="icon-btn" data-act="back">✕</button></div>
      <div class="center" style="justify-content:flex-start;margin-top:12px"><div class="panel" style="width:min(460px,100%)">
        <h2>Top Runs</h2>
        <div class="stat-grid"><div class="stat"><div class="k">Runs</div><div class="v">${s.totalRuns}</div></div><div class="stat"><div class="k">Best distance</div><div class="v">${fmt(s.bestDistance)} m</div></div><div class="stat"><div class="k">Total coins</div><div class="v">${fmt(s.stats.coins || 0)}</div></div><div class="stat"><div class="k">Jumps</div><div class="v">${fmt(s.stats.jumps || 0)}</div></div></div>
        <div class="list">${rows}</div>
      </div></div></div>`);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-act=back]')) { this.game.audio.click(); this.showMenu(); } });
    this.root.appendChild(el);
  }

  showSettings() {
    this.clear();
    const st = this.game.save.data.settings;
    const el = h(`<div class="screen dim scroll ui-block">
      <div class="topbar"><span class="spacer"></span><button class="icon-btn" data-act="back">✕</button></div>
      <div class="center" style="justify-content:flex-start;margin-top:12px"><div class="panel" style="width:min(420px,100%)">
        <h2>Settings</h2>
        <div class="list" style="max-height:none">
          <div class="setting">Music<button class="switch ${st.music ? 'on' : ''}" data-set="music"></button></div>
          <div class="setting">Sound effects<button class="switch ${st.sfx ? 'on' : ''}" data-set="sfx"></button></div>
          <div class="setting">Vibration<button class="switch ${st.haptics ? 'on' : ''}" data-set="haptics"></button></div>
          <div class="setting" style="justify-content:center"><button class="btn red small" data-act="reset">Reset progress</button></div>
        </div>
        <div class="small-note">Islamabad Runner 3D · v1.0 · Made with love in Islamabad.<br>No ads, no tracking, no data leaves your phone.</div>
      </div></div></div>`);
    el.addEventListener('click', (e) => {
      const sw = e.target.closest('[data-set]');
      if (sw) { st[sw.dataset.set] = !st[sw.dataset.set]; this.game.save.write(); if (sw.dataset.set === 'music' && !st.music) this.game.audio.stopMusic(); this.showSettings(); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'back') { this.game.audio.click(); this.showMenu(); }
      if (a.dataset.act === 'reset') { if (confirm('Reset all progress? This cannot be undone.')) { this.game.save.reset(); location.reload(); } }
    });
    this.root.appendChild(el);
  }
}
