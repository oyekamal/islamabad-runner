import { CHARACTERS, BIKES } from '../data/characters.js';
import { MISSION_SETS, MAX_MULTIPLIER, DAILY_REWARDS } from '../data/missions.js';
import { POWERUP_UPGRADE_COST, HOVERBOARD_COST, HEADSTART_COST, SCORE_BOOSTER_COST, MYSTERY_BOX_COST, BUBBLES_PER_TURBO } from '../game/constants.js';
import { ACHIEVEMENTS, rewardText } from '../data/achievements.js';

const fmt = (n) => Math.floor(n).toLocaleString('en-US');
// Satirical protest-day death lines. Generic pool rotates; cause-keyed lines fire ~half the time.
const DEATH_LINES = [
  '954 others join you today. Section 144 is still in effect.',
  'Mobile internet is down in the twin cities. Your run was not uploaded anyway.',
  'Route diverted via Srinagar Highway. Estimated delay: forever.',
  'The biryani at the thana is reportedly decent.',
  'Containers on every exit. Even the Metro bus gave up.',
  'Your FIR has been drafted. Spelling of your name: creative.',
  'Islamabad Traffic Police thanks you for your cooperation.',
  'Schools closed tomorrow. Not for you — you are in the lockup.',
  'Section 144: no gatherings of more than one motorcycle.',
  'Red Zone sealed. Blue Area confused. You: arrested.',
];
const DEATH_LINES_BY_CAUSE = {
  container: 'That container was placed there for exactly this purpose.',
  jeep: 'The jeep had right of way. The jeep always has right of way.',
  teargas: 'Onions in the pocket next time. Ask any regular.',
  caught: 'Rangers say you "looked suspicious". It was the helmet.',
  police_barricade: 'Barricade 1, motorcycle 0.',
  road_closed_gantry: 'ROAD CLOSED means the road is closed. Even for you.',
  pillar: 'Overpass pillars: undefeated since 2009.',
  barrier_mid: 'Police tape: the most effective weapon in Islamabad.',
};
const TUTORIAL_STEPS = [
  { text: 'SWIPE ⬅ ➡ TO CHANGE LANES', acts: ['left', 'right'] },
  { text: 'SWIPE ⬆ TO JUMP', acts: ['up'] },
  { text: 'SWIPE ⬇ TO DUCK', acts: ['down'] },
  { text: 'RIDE UP RAMPS ONTO CONTAINERS', acts: [], ms: 3500 },
  { text: 'DOUBLE TAP FOR TURBO ⚡', acts: ['doubletap'] },
];
const TUTORIAL_CAP_MS = 6000;
/** Count a number up from 0 to `to` inside `el` over `ms` (eased). */
const countUp = (el, to, ms = 800, suffix = '') => {
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(to * e) + suffix;
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const PU_LABEL = { jetpack: 'J', sneakers: 'N', magnet: 'M', multiplier: '2X', hover: 'T' };
const PU_NAME = { jetpack: 'Jetpack', sneakers: 'Nitro Springs', magnet: 'Coin Magnet', multiplier: '2X Multiplier' };

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
        <div class="logo"><span class="l1">ISLAMABAD</span><span class="l2">RUNNER</span></div>
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
    game.on('zone', (z) => this.zoneBanner(z));
    game.on('milestone', ({ lap, bonus }) => this.toast(`<b>YOU REACHED D-CHOWK!</b>Mobile internet still blocked. But you made it. +${bonus} coins`, 'mission'));
    game.on('bubbles', (n) => this._refreshHoverCount());
    game.on('letter', ({ letter }) => { this.toast(`LETTER ${letter}!`); this._renderLetters(); });
    game.on('missionComplete', (m) => this.toast(`<b>MISSION COMPLETE</b>${m.text}`, 'mission'));
    game.on('missionSetComplete', ({ multiplier }) => this.toast(`<b>MISSION SET DONE</b>Multiplier is now x${multiplier}!`, 'mission'));
    game.on('dying', () => { if (this.hud) { const st = h('<div class="arrest-stamp">ARRESTED</div>'); this.hud.appendChild(st); setTimeout(() => st.remove(), 1700); } });
    game.on('gameOver', (d) => this.showGameOver(d));
    game.on('paused', () => this.showPause());
    game.on('resumed', () => this.showHUD());
    game.on('revived', () => this.showHUD());
    game.on('menu', () => this.showMenu());
    game.on('runStart', () => { this._closeCallsStatAtStart = game.save.data.stats.closeCalls || 0; });
    game.on('runFinished', (r) => this._onRunFinished(r));
    document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'running') game.pause(); });
  }

  /** Lifetime stats Game doesn't track + badge awards. Runs on every 'runFinished'. */
  _onRunFinished(r) {
    const g = this.game, save = g.save, s = save.data;
    save.addStat('distance', Math.floor(g.distance));
    save.maxStat('bestStreak', (s.daily && s.daily.streak) || 0);
    // closeCalls: Game may or may not roll run.closeCalls into stats — only add if it hasn't moved.
    const cc = (r && r.closeCalls) || 0;
    if (cc > 0 && (s.stats.closeCalls || 0) <= (this._closeCallsStatAtStart || 0)) save.addStat('closeCalls', cc);
    s.achievementsDone = s.achievementsDone || [];
    let awarded = false;
    for (const a of ACHIEVEMENTS) {
      if (s.achievementsDone.includes(a.id)) continue;
      let v = 0;
      try { v = a.value(s) || 0; } catch (e) { continue; }
      if (v < a.target) continue;
      s.achievementsDone.push(a.id);
      if (a.reward.coins) s.coins += a.reward.coins;
      if (a.reward.keys) s.keys += a.reward.keys;
      awarded = true;
      this._queueToast(`<b>BADGE: ${a.name}</b>${rewardText(a.reward)}`, 'mission');
    }
    save.write();
    if (awarded && g.audio && g.audio.mission) g.audio.mission();
  }

  /** Toasts fired while no toast container exists (e.g. during runFinished) are replayed on the next screen. */
  _queueToast(text, cls) { (this._pendingToasts = this._pendingToasts || []).push([text, cls]); this._flushToasts(); }
  _flushToasts() {
    if (!this.toastEl || !this._pendingToasts || !this._pendingToasts.length) return;
    const q = this._pendingToasts; this._pendingToasts = [];
    q.forEach(([t, c], i) => setTimeout(() => this.toast(t, c), 350 + i * 900));
  }

  _rewardText(r) {
    const t = { coins: `+${r.amount} COINS`, keys: '+1 KEY', hoverboard: '+1 TURBO', token: '+1 CHARACTER TOKEN', headstart: '+1 HEADSTART', booster: '+1 SCORE BOOSTER' }[r.type];
    return r.unlock ? `${t} — ${r.unlock.toUpperCase()} UNLOCKED!` : `BIRYANI BOX: ${t}`;
  }

  // ------------------------------------------------------------------ menu
  showMenu() {
    this.clear();
    const s = this.game.save.data;
    this._dailyLogin(s);
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
        <div class="logo fade-in"><span class="l1">ISLAMABAD</span><span class="l2">RUNNER</span></div>
        <div class="high">Best: ${fmt(s.highScore)} pts · ${fmt(s.bestDistance)} m</div>
        <div class="spacer"></div>
        <div class="tap-to-play">TAP TO PLAY</div>
        <div class="char-name">${char.name}</div>
        ${char.perkText ? `<div class="perk-line">✦ ${char.perkText}</div>` : ''}
      </div>
      <div class="toasts"></div>
      <div class="menu-bottom ui-block">
        <div class="prerun">
          <button class="toggle-item ${s.headstarts > 0 ? (this.prerun.headstart ? 'on' : '') : 'off'}" data-act="toggle-headstart">🚀 Headstart <b>×${s.headstarts}</b></button>
          <button class="toggle-item ${s.scoreBoosters > 0 ? (this.prerun.booster ? 'on' : '') : 'off'}" data-act="toggle-booster">⭐ Booster <b>×${s.scoreBoosters}</b></button>
          <span class="toggle-item">⚡ Turbo <b>×${s.hoverboards}</b></span>
        </div>
        <div class="menu-nav">
          <button class="nav-btn" data-act="shop"><span class="em">🛍️</span>Shop</button>
          <button class="nav-btn" data-act="missions"><span class="em">🎯</span>Missions${missionsLeft ? `<span class="badge">${missionsLeft}</span>` : ''}</button>
          <button class="nav-btn" data-act="daily"><span class="em">🔤</span>Word Hunt${!daily.done ? '<span class="badge">!</span>' : ''}</button>
          <button class="nav-btn" data-act="chars"><span class="em">🏍️</span>Garage</button>
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
    this.toastEl = el.querySelector('.toasts');
    this._flushToasts();
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
        <div><div class="score">0</div><span class="mult">x${this.game.multiplier}</span><div class="dist"><span class="n">0</span> m</div><div class="zone"></div></div>
        <div class="right">
          <button class="icon-btn pause" aria-label="Pause">II</button>
          <div class="coins"><i class="ico coin"></i><span class="n">0</span></div>
        </div>
      </div>
      <div class="letters">${[...word].map((c, i) => `<span class="${i < this.game.dailyLettersCollected ? 'got' : ''}">${c}</span>`).join('')}</div>
      <div class="powerbars"></div>
      <button class="hover-btn"><span class="em">⚡</span><span class="n">×${s.hoverboards}</span><span class="charge">${'●'.repeat(this.game.bubbleCharge || 0)}${'○'.repeat(BUBBLES_PER_TURBO - (this.game.bubbleCharge || 0))}</span></button>
      <div class="toasts"></div>
      <div class="speed-fx"></div>
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
    this._flushToasts();
  }

  _refreshHoverCount() {
    if (!this.hud) return;
    this.hud.querySelector('.hover-btn .n').textContent = '×' + this.game.save.data.hoverboards;
    const c = this.game.bubbleCharge || 0;
    this.hud.querySelector('.hover-btn .charge').textContent = '●'.repeat(c) + '○'.repeat(Math.max(0, BUBBLES_PER_TURBO - c));
  }

  /** Offline daily login gift: 100 coins the first time the menu is shown each local day. */
  _dailyLogin(s) {
    const d = new Date(); const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (s.lastLogin === today) return;
    s.lastLogin = today; s.coins += 100; this.game.save.write();
    (this._pendingToasts = this._pendingToasts || []).push(['<b>DAILY BONUS</b>+100 coins for showing up', 'mission']);
  }

  zoneBanner(z) {
    if (!this.hud) return;
    this.hud.querySelector('.zone').textContent = z.name;
    const b = h(`<div class="zone-banner">${z.name}</div>`);
    this.hud.appendChild(b);
    setTimeout(() => b.remove(), 2600);
  }
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
    const fx = this.hud.querySelector('.speed-fx');
    const fast = !!d.fast || d.hover > 0 || (d.powerups.jetpack || 0) > 0;
    if (fast !== this._lastFast) { fx.classList.toggle('on', fast); this._lastFast = fast; }
    const dist = Math.floor(d.distance);
    if (dist !== this._lastDist) { this.hud.querySelector('.dist .n').textContent = fmt(dist); this._lastDist = dist; }
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
    // Each caption stays until the player performs that action once (capped at TUTORIAL_CAP_MS), then advances.
    const game = this.game;
    const el = h(`<div class="tutorial">${TUTORIAL_STEPS[0].text}</div>`);
    this.hud.appendChild(el);
    let i = 0, timer = null, offInput = null;
    const finish = () => {
      clearTimeout(timer); if (offInput) offInput();
      el.remove(); game.save.data.tutorialDone = true; game.save.write();
    };
    const show = () => {
      if (i >= TUTORIAL_STEPS.length || !this.hud || !el.isConnected) return finish();
      const st = TUTORIAL_STEPS[i];
      el.textContent = st.text;
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      clearTimeout(timer);
      timer = setTimeout(next, Math.min(TUTORIAL_CAP_MS, st.ms || TUTORIAL_CAP_MS));
    };
    const next = () => { i++; show(); };
    const onAct = (t) => { if (!el.isConnected) return; const st = TUTORIAL_STEPS[i]; if (st && st.acts.includes(t)) next(); };
    if (game.input && typeof game.input.on === 'function') offInput = game.input.on(onAct);   // otherwise the time cap alone advances
    // Turbo also counts if triggered via the HUD button rather than a double tap (game.on has no off; onAct no-ops once detached).
    game.on('hoverboard', () => onAct('doubletap'));
    show();
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
  _deathLine(cause) {
    const keyed = DEATH_LINES_BY_CAUSE[cause];
    let line;
    if (keyed && this._lastDeathLine !== keyed && Math.random() < 0.5) line = keyed;
    else {
      const pool = DEATH_LINES.filter((l) => l !== this._lastDeathLine);
      line = pool[(this.game.save.data.totalRuns + Math.floor(Math.random() * 3)) % pool.length];
    }
    this._lastDeathLine = line;
    return line;
  }

  showGameOver({ run, canRevive, keysNeeded, cause, coinsNeeded }) {
    const g = this.game, s = g.save.data;
    const isBest = Math.floor(run.score) > s.highScore;
    const dist = Math.floor(g.distance);
    const mult = g.multiplier;                       // captured at death: base + booster + 2X, not baseMultiplier
    const newBestDist = !!run.newBestDistance || dist > (s.bestDistance || 0);   // Game only flags it when a previous best exists
    const closeCalls = run.closeCalls || 0;
    const causeText = { container: 'Straight into a shipping container!', jeep: 'Flattened by an army jeep!', pillar: 'Head first into an overpass pillar!', caught: 'The rangers grabbed you!',
      police_barricade: 'Tripped over a police barricade!', road_closed_gantry: 'Should have ducked under the sign!', teargas: 'Rode straight into the teargas!', barrier_mid: 'Tangled in police tape!' }[cause] || 'Caught!';
    const missions = g.missionProgress();
    const canCoinRevive = typeof g.reviveWithCoins === 'function' && coinsNeeded > 0 && s.coins >= coinsNeeded;
    const perkBonus = g.characterDef().perk === 'coins' ? Math.ceil(run.coins * 0.1) : 0;
    const distLine = newBestDist
      ? '<div class="newbest dist">★ NEW BEST DISTANCE ★</div>'
      : (s.bestDistance > dist ? `<div class="small-note dist-short">${fmt(s.bestDistance - dist)} m short of your best distance</div>` : '');
    const el = h(`<div class="overlay ui-block fade-in"><div class="panel gameover">
      <div class="caught-title">ARRESTED!</div>
      <div class="small-note" style="margin:0 0 4px">${causeText}</div>
      <div class="small-note death-line">${this._deathLine(cause)}</div>
      ${isBest ? '<div class="newbest">★ NEW HIGH SCORE ★</div>' : ''}
      <div class="stat-grid">
        <div class="stat"><div class="k">Score</div><div class="v" data-count="score">0</div></div>
        <div class="stat"><div class="k">Coins</div><div class="v" data-count="coins">0</div>${perkBonus ? `<div class="k perk-bonus">+${perkBonus} ${g.characterDef().name} bonus</div>` : ''}</div>
        <div class="stat"><div class="k">Distance</div><div class="v">${fmt(dist)} m</div></div>
        <div class="stat"><div class="k">Multiplier</div><div class="v">x${mult}</div></div>
      </div>
      ${distLine}
      ${closeCalls > 0 ? `<div class="small-note close-calls">⚡ ${closeCalls} close call${closeCalls > 1 ? 's' : ''}</div>` : ''}
      <div class="go-missions">${missions.map((m) => `<div class="mission-card mini ${m.done ? 'done' : ''}"><div class="t"><span>${m.text}</span><span class="${m.done ? 'done' : ''}">${m.done ? '✔' : `${fmt(m.value)}/${fmt(m.target)}`}</span></div><div class="bar"><i style="width:${Math.min(100, m.value / m.target * 100)}%"></i></div></div>`).join('')}</div>
      <div class="row" style="flex-direction:column">
        <button class="btn yellow saveme" data-act="revive" ${canRevive ? '' : 'disabled'}>SAVE ME ⚷${keysNeeded} <small>· you have ${s.keys}</small><span class="timer" style="width:100%"></span></button>
        ${canCoinRevive ? `<button class="btn purple saveme coins-revive" data-act="revive-coins">Save me for ${fmt(coinsNeeded)} coins</button>` : ''}
        <div class="row"><button class="btn ghost" data-act="home">Home</button><button class="btn orange" data-act="again">Play again</button></div>
      </div>
    </div></div>`);
    countUp(el.querySelector('[data-count=score]'), Math.floor(run.score));
    countUp(el.querySelector('[data-count=coins]'), run.coins);
    const timer = el.querySelector('.timer');
    let t = 6.0;
    const iv = setInterval(() => {
      t -= 0.1; timer.style.width = Math.max(0, t / 6 * 100) + '%';
      if (t <= 0) {
        clearInterval(iv);
        const b = el.querySelector('[data-act=revive]'); b.disabled = true; b.textContent = 'Too late…';
        const c = el.querySelector('[data-act=revive-coins]'); if (c) c.remove();
      }
    }, 100);
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]'); if (!a || a.disabled) return;
      g.audio.click();
      const act = a.dataset.act;
      if (act === 'revive') { clearInterval(iv); if (g.revive()) el.remove(); }
      if (act === 'revive-coins') { clearInterval(iv); if (typeof g.reviveWithCoins === 'function' && g.reviveWithCoins()) el.remove(); }
      if (act === 'home') { clearInterval(iv); g.goToMenu(); }
      if (act === 'again') { clearInterval(iv); g.finishRun(); g.startRun(); this.showHUD(); }
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
        <div class="tabs">${['items', 'characters', 'bikes', 'upgrades'].map((t) => `<button class="tab ${t === tab ? 'active' : ''}" data-tab="${t}">${t === 'characters' ? 'riders' : t}</button>`).join('')}</div>
        <div class="list"></div>
      </div></div></div>`);
    const list = el.querySelector('.list');
    const render = () => {
      list.innerHTML = '';
      if (tab === 'items') {
        const items = [
          { id: 'hoverboard', em: '⚡', name: 'Turbo', desc: `Double-tap for 30 s of Turbo. Saves you from one crash. Also earned from every ${BUBBLES_PER_TURBO} signal bubbles.`, cost: HOVERBOARD_COST, have: s.hoverboards, bg: '#c9f2ef' },
          { id: 'headstart', em: '🚀', name: 'Headstart', desc: 'Blast 300 m ahead at the start of a run.', cost: HEADSTART_COST, have: s.headstarts, bg: '#ffd9c7' },
          { id: 'booster', em: '⭐', name: 'Score Booster', desc: 'Adds +5 to +7 to your multiplier for one run.', cost: SCORE_BOOSTER_COST, have: s.scoreBoosters, bg: '#fff1b8' },
          { id: 'mystery', em: '🍛', name: 'Biryani Box', desc: 'Coins, keys, Turbos, tokens… open it now!', cost: MYSTERY_BOX_COST, have: s.mysteryBoxes, bg: '#ffe4c4' },
        ];
        for (const it of items) {
          const openBtn = it.id === 'mystery' && it.have > 0 ? `<button class="btn orange small" data-open="mystery">OPEN ×${it.have}</button>` : '';
          list.appendChild(h(`<div class="card"><div class="swatch" style="background:${it.bg}">${it.em}</div><div class="info"><div class="name">${it.name} <small style="color:#6b7280">×${it.have}</small></div><div class="desc">${it.desc}</div></div>
            <div class="card-btns"><button class="btn yellow small" data-buy="${it.id}" ${s.coins < it.cost ? 'disabled' : ''}>$ ${fmt(it.cost)}</button>${openBtn}</div></div>`));
        }
      } else if (tab === 'characters') {
        for (const c of CHARACTERS) {
          const owned = s.unlockedCharacters.includes(c.id);
          const sel = s.character === c.id;
          let btn;
          if (sel) btn = '<span class="btn small" style="background:var(--teal)">Selected</span>';
          else if (owned) btn = `<button class="btn small orange" data-select-char="${c.id}">Select</button>`;
          else if (c.tokens) btn = `<span class="btn small ghost">${s.tokens}/${c.tokens} tokens</span>`;
          else btn = `<button class="btn small yellow" data-buy-char="${c.id}" ${s.coins < c.cost ? 'disabled' : ''}>$ ${fmt(c.cost)}</button>`;
          list.appendChild(h(`<div class="card ${sel ? 'selected' : ''}"><div class="swatch" style="background:${c.palette.jacket}"><span style="width:26px;height:26px;border-radius:50%;background:${c.palette.skin || '#e8b58a'};border-top:9px solid ${c.palette.helmet};display:block"></span></div><div class="info"><div class="name">${c.name}</div><div class="desc">${c.desc}</div>${c.perkText ? `<div class="perk">✦ ${c.perkText}</div>` : ''}</div>${btn}</div>`));
        }
      } else if (tab === 'bikes') {
        for (const b of BIKES) {
          const owned = s.unlockedBoards.includes(b.id);
          const sel = s.board === b.id;
          let btn;
          if (sel) btn = '<span class="btn small" style="background:var(--teal)">Selected</span>';
          else if (owned) btn = `<button class="btn small orange" data-select-board="${b.id}">Select</button>`;
          else btn = `<button class="btn small yellow" data-buy-board="${b.id}" ${s.coins < b.cost ? 'disabled' : ''}>$ ${fmt(b.cost)}</button>`;
          list.appendChild(h(`<div class="card ${sel ? 'selected' : ''}"><div class="swatch" style="background:${b.swatch};border-radius:14px">🏍️</div><div class="info"><div class="name">${b.name}</div><div class="desc">${b.desc}</div></div>${btn}</div>`));
        }
      } else if (tab === 'upgrades') {
        for (const k of ['jetpack', 'sneakers', 'magnet', 'multiplier']) {
          const lvl = s.upgrades[k] || 0;
          const max = POWERUP_UPGRADE_COST.length;
          const cost = lvl < max ? POWERUP_UPGRADE_COST[lvl] : null;
          list.appendChild(h(`<div class="card"><div class="swatch" style="background:#e3f2ff">${{ jetpack: '🚀', sneakers: '🔩', magnet: '🧲', multiplier: '✖️' }[k]}</div><div class="info"><div class="name">${PU_NAME[k]}</div><div class="desc">Lasts ${10 + lvl * 5} s${cost ? ` → ${15 + lvl * 5} s` : ' (max)'}</div><div class="lvl">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div></div>
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
      let reveal = null;   // shown AFTER showShop(tab) below — showShop clears the root, so appending first would wipe it
      if (b.dataset.buy) {
        const id = b.dataset.buy;
        if (id === 'hoverboard') { spend(HOVERBOARD_COST); s.hoverboards++; }
        if (id === 'headstart') { spend(HEADSTART_COST); s.headstarts++; }
        if (id === 'booster') { spend(SCORE_BOOSTER_COST); s.scoreBoosters++; }
        if (id === 'mystery') { spend(MYSTERY_BOX_COST); g.save.addStat('boxesBought'); reveal = g.openMysteryBox(); }
      }
      if (b.dataset.open === 'mystery' && s.mysteryBoxes > 0) { s.mysteryBoxes--; g.audio.buy(); reveal = g.openMysteryBox(); }
      if (b.dataset.buyChar) { const c = CHARACTERS.find((x) => x.id === b.dataset.buyChar); spend(c.cost); s.unlockedCharacters.push(c.id); s.character = c.id; }
      if (b.dataset.selectChar) { s.character = b.dataset.selectChar; g.audio.click(); }
      if (b.dataset.buyBoard) { const bd = BIKES.find((x) => x.id === b.dataset.buyBoard); spend(bd.cost); s.unlockedBoards.push(bd.id); s.board = bd.id; }
      if (b.dataset.selectBoard) { s.board = b.dataset.selectBoard; g.audio.click(); }
      if (b.dataset.upgrade) { const k = b.dataset.upgrade; spend(POWERUP_UPGRADE_COST[s.upgrades[k] || 0]); s.upgrades[k] = (s.upgrades[k] || 0) + 1; }
      g.save.write(); g._checkMissions();
      if (g.state === 'menu') g.player.setCharacter(g.characterDef(), g.bikeDef());
      this.showShop(tab);
      if (reveal) this.showMysteryReveal(reveal);
    });
    this.root.appendChild(el);
  }

  showMysteryReveal(r) {
    const em = { coins: '💰', keys: '⚷', hoverboard: '⚡', token: '🎟️', headstart: '🚀', booster: '⭐' }[r.type];
    const el = h(`<div class="overlay ui-block"><div class="panel" style="width:min(320px,100%)"><div class="mystery-reveal"><span class="em">${em}</span>${this._rewardText(r).replace('BIRYANI BOX: ', '')}</div><div class="row"><button class="btn orange" data-act="ok">Nice!</button></div></div></div>`);
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

  showRecords(tab = 'runs') {
    this.clear();
    const s = this.game.save.data;
    const done = s.achievementsDone || [];
    let body;
    if (tab === 'badges') {
      const cards = ACHIEVEMENTS.map((a) => {
        const earned = done.includes(a.id);
        let v = 0; try { v = a.value(s) || 0; } catch (e) { /* stat missing */ }
        const shown = Math.min(a.target, earned ? a.target : v);
        return `<div class="mission-card badge ${earned ? 'earned' : ''}"><div class="t"><span>${earned ? '🏅 ' : ''}${a.name}</span><span class="${earned ? 'done' : 'rw'}">${earned ? '✔' : rewardText(a.reward)}</span></div>
          <div class="d">${a.desc}</div><div class="bar"><i style="width:${Math.min(100, shown / a.target * 100)}%"></i></div><div class="p">${fmt(shown)} / ${fmt(a.target)}</div></div>`;
      }).join('');
      body = `<div class="small-note" style="margin:0 0 8px">${done.length}/${ACHIEVEMENTS.length} badges earned</div><div class="list">${cards}</div>`;
    } else {
      const rows = s.leaderboard.length ? s.leaderboard.map((r, i) => `<div class="lb-row"><span class="rank">${i + 1}.</span><span style="flex:1">${fmt(r.score)}</span><span style="color:#6b7280;font-size:13px">${fmt(r.distance)} m · ${r.date}</span></div>`).join('') : '<div class="small-note">No runs yet. Go run!</div>';
      body = `<div class="stat-grid"><div class="stat"><div class="k">Runs</div><div class="v">${s.totalRuns}</div></div><div class="stat"><div class="k">Best distance</div><div class="v">${fmt(s.bestDistance)} m</div></div><div class="stat"><div class="k">Total coins</div><div class="v">${fmt(s.stats.coins || 0)}</div></div><div class="stat"><div class="k">Jumps</div><div class="v">${fmt(s.stats.jumps || 0)}</div></div></div>
        <div class="list">${rows}</div>`;
    }
    const el = h(`<div class="screen dim scroll ui-block">
      <div class="topbar"><span class="pill">🏆 ${fmt(s.highScore)}</span><span class="pill">🏅 ${done.length}/${ACHIEVEMENTS.length}</span><span class="spacer"></span><button class="icon-btn" data-act="back">✕</button></div>
      <div class="center" style="justify-content:flex-start;margin-top:12px"><div class="panel" style="width:min(460px,100%)">
        <h2>${tab === 'badges' ? 'Badges' : 'Top Runs'}</h2>
        <div class="tabs"><button class="tab ${tab === 'runs' ? 'active' : ''}" data-tab="runs">Top runs</button><button class="tab ${tab === 'badges' ? 'active' : ''}" data-tab="badges">Badges</button></div>
        ${body}
      </div></div></div>`);
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]'); if (t) { this.game.audio.click(); this.showRecords(t.dataset.tab); return; }
      if (e.target.closest('[data-act=back]')) { this.game.audio.click(); this.showMenu(); }
    });
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
          <div class="setting">Quality<div class="seg">${['low', 'auto', 'high'].map((q) => `<button class="segb ${(st.quality || 'auto') === q ? 'on' : ''}" data-quality="${q}">${q}</button>`).join('')}</div></div>
          <div class="setting" style="justify-content:center"><button class="btn red small" data-act="reset">Reset progress</button></div>
        </div>
        <div class="small-note">Islamabad Runner 3D · v1.0 · Made with love in Islamabad.<br>No ads, no tracking, no data leaves your phone.</div>
      </div></div></div>`);
    el.addEventListener('click', (e) => {
      const sw = e.target.closest('[data-set]');
      if (sw) { st[sw.dataset.set] = !st[sw.dataset.set]; this.game.save.write(); if (sw.dataset.set === 'music' && !st.music) this.game.audio.stopMusic(); this.showSettings(); return; }
      const q = e.target.closest('[data-quality]');
      if (q) { st.quality = q.dataset.quality; this.game.save.write(); this.game.audio.click(); if (typeof this.game.setQuality === 'function') this.game.setQuality(st.quality); this.showSettings(); return; }
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'back') { this.game.audio.click(); this.showMenu(); }
      if (a.dataset.act === 'reset') { if (confirm('Reset all progress? This cannot be undone.')) { this.game.save.reset(); location.reload(); } }
    });
    this.root.appendChild(el);
  }
}
