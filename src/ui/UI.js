import { CHARACTERS, BIKES } from '../data/characters.js';
import { MISSION_SETS, MAX_MULTIPLIER, DAILY_REWARDS } from '../data/missions.js';
import { POWERUP_UPGRADE_COST, HOVERBOARD_COST, HEADSTART_COST, SCORE_BOOSTER_COST, MYSTERY_BOX_COST, BUBBLES_PER_TURBO } from '../game/constants.js';
import { ACHIEVEMENTS, rewardText } from '../data/achievements.js';

const fmt = (n) => Math.floor(n).toLocaleString('en-US');
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escHtml = (str) => String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
// Unicode-aware: letters (incl. Urdu/Arabic/Devanagari/etc via \p{L}), combining marks (\p{M},
// needed for diacritics on those scripts), digits (\p{N}) and spaces. Capped at 12 CODE POINTS
// (Array.from, not .length, so surrogate-pair/combining-mark names aren't truncated mid-glyph).
const NAME_ALLOWED_CHAR = /[\p{L}\p{M}\p{N} ]/u;
const NAME_DISALLOWED = /[^\p{L}\p{M}\p{N} ]/u;
const codePointLen = (str) => Array.from(String(str || '')).length;
const cleanName = (raw) => {
  const collapsed = String(raw || '').trim().replace(/\s+/g, ' ');
  const filtered = Array.from(collapsed).filter((ch) => NAME_ALLOWED_CHAR.test(ch)).join('');
  return Array.from(filtered).slice(0, 12).join('');
};
/** Validate a name-editor input value. Returns {valid, error} — error is the exact string to show inline. */
const validateName = (raw) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { valid: false, error: "Name can't be empty" };
  if (NAME_DISALLOWED.test(raw)) return { valid: false, error: 'Letters and numbers only' };
  return { valid: true, error: '' };
};
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
const SHOP_TAB_LABEL = { items: 'Items', characters: 'Riders', bikes: 'Bikes', upgrades: 'Power-ups' };
const hexLuminance = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
/** Small tinted bike silhouette (no image assets) so bike cards read distinctly at a glance.
 * The swatch background is the bike's own body colour, so the frame stroke can't reuse bike_body
 * (invisible on itself) — it uses a fixed light/dark ink chosen for contrast against that swatch,
 * while the wheel rims carry each bike's own rim/dark accent colour for per-card distinction. */
// GAP B fix: one shared geometry made every bike card look identical (only colour differed).
// Each `shape` below draws its own hand-written frame/wheel/accent path so the silhouette itself
// reads as a different bike, matching its perk description — upright classic, classic + tall
// decorated rear panel, knobbly higher trail bike, low faired speed profile, long slammed
// lowrider, tall-suspension bouncer.
const BIKE_SHAPES = {
  // Seventy Classic — upright commuter frame, straight fork, small seat.
  classic: (frame, rim, dark) => `
    <circle cx="14" cy="30" r="9" fill="none" stroke="${rim}" stroke-width="4"/>
    <circle cx="50" cy="30" r="9" fill="none" stroke="${rim}" stroke-width="4"/>
    <path d="M14 30 L26 14 L42 14 L50 30 M26 14 L20 30 M42 14 L34 30 M42 14 L50 8" fill="none" stroke="${frame}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17 8 h11" stroke="${frame}" stroke-width="4" stroke-linecap="round"/>`,
  // Truck Art — same upright frame, plus a tall decorated rear panel + pennant flag.
  truckart: (frame, rim, dark) => `
    <circle cx="14" cy="30" r="9" fill="none" stroke="${rim}" stroke-width="4"/>
    <circle cx="50" cy="30" r="9" fill="none" stroke="${rim}" stroke-width="4"/>
    <path d="M14 30 L26 14 L42 14 L50 30 M26 14 L20 30 M42 14 L34 30" fill="none" stroke="${frame}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="44" y="4" width="9" height="12" rx="1.5" fill="${dark}" stroke="${frame}" stroke-width="2"/>
    <path d="M53 5 L60 8 L53 11 Z" fill="${frame}"/>
    <path d="M17 8 h11" stroke="${frame}" stroke-width="4" stroke-linecap="round"/>`,
  // Margalla Green — knobbly trail bike, higher stance: bigger wheels, dashed knobbly tread, tall frame.
  trail: (frame, rim, dark) => `
    <circle cx="13" cy="28" r="10.5" fill="none" stroke="${rim}" stroke-width="4.5" stroke-dasharray="2.5 3"/>
    <circle cx="51" cy="28" r="10.5" fill="none" stroke="${rim}" stroke-width="4.5" stroke-dasharray="2.5 3"/>
    <circle cx="13" cy="28" r="10.5" fill="none" stroke="${frame}" stroke-width="1"/>
    <circle cx="51" cy="28" r="10.5" fill="none" stroke="${frame}" stroke-width="1"/>
    <path d="M13 28 L24 10 L40 10 L51 28 M24 10 L19 28 M40 10 L36 28 M40 10 L48 4" fill="none" stroke="${frame}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M15 4 h10" stroke="${frame}" stroke-width="4" stroke-linecap="round"/>`,
  // Metro Express — low faired speed profile: long low belly fairing, laid-back stance.
  sport: (frame, rim, dark) => `
    <circle cx="12" cy="32" r="7.5" fill="none" stroke="${rim}" stroke-width="3.5"/>
    <circle cx="52" cy="32" r="7.5" fill="none" stroke="${rim}" stroke-width="3.5"/>
    <path d="M4 32 Q10 20 22 20 L46 20 Q58 20 60 32 Q40 27 32 27 Q20 27 4 32 Z" fill="${dark}" stroke="${frame}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M46 20 L54 10" fill="none" stroke="${frame}" stroke-width="4" stroke-linecap="round"/>
    <path d="M48 9 h9" stroke="${frame}" stroke-width="4" stroke-linecap="round"/>`,
  // Lowrider — long, stretched wheelbase, slammed frame that sits almost on the axles.
  lowrider: (frame, rim, dark) => `
    <circle cx="8" cy="30" r="8" fill="none" stroke="${rim}" stroke-width="4"/>
    <circle cx="56" cy="30" r="8" fill="none" stroke="${rim}" stroke-width="4"/>
    <path d="M8 26 L20 24 L44 24 L56 26 M20 24 L26 30 M44 24 L38 30 M44 24 L52 20" fill="none" stroke="${frame}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M23 22 h9" stroke="${frame}" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="32" cy="18" r="2" fill="${dark}"/>`,
  // Bouncer — tall raised suspension: frame sits well above the axles on visible zig-zag springs.
  bouncer: (frame, rim, dark) => `
    <circle cx="14" cy="32" r="8" fill="none" stroke="${rim}" stroke-width="4"/>
    <circle cx="50" cy="32" r="8" fill="none" stroke="${rim}" stroke-width="4"/>
    <path d="M14 32 L16 24 L12 18 L16 12 L12 6" fill="none" stroke="${dark}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M50 32 L48 24 L52 18 L48 12 L52 6" fill="none" stroke="${dark}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 6 L44 6 L50 32" fill="none" stroke="${frame}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 2 h11" stroke="${frame}" stroke-width="4" stroke-linecap="round"/>`,
};
const bikeSVG = (b) => {
  const bg = b.swatch || (b.palette && b.palette.bike_body) || '#e0382b';
  const rim = (b.palette && b.palette.rim) || (b.palette && b.palette.bike_dark) || '#2b2b2b';
  const dark = (b.palette && b.palette.bike_dark) || (b.palette && b.palette.bike_metal) || rim;
  const frame = hexLuminance(bg) > 0.6 ? '#1a2238' : '#ffffff';
  const draw = BIKE_SHAPES[b.shape] || BIKE_SHAPES.classic;
  return `<svg viewBox="0 0 64 40" width="38" height="26" aria-hidden="true" focusable="false">${draw(frame, rim, dark)}</svg>`;
};
/** Card status badge for locked/owned/selected shop entries. */
const cardBadge = ({ selected, owned, locked }) => {
  if (selected) return '<span class="tag tag-selected">SELECTED</span>';
  if (owned) return '<span class="tag tag-owned">OWNED</span>';
  if (locked) return '<span class="tag tag-locked">🔒</span>';
  return '';
};

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
    game.on('dizzy', (secs) => this._setDizzy(true, secs));
    game.on('dizzyEnd', () => this._setDizzy(false));
    game.on('runStart', () => this._setDizzy(false));
    game.on('revived', () => this._setDizzy(false));
    game.on('dying', () => this._setDizzy(false));      // belt and braces: never let the haze reach a panel
    game.on('gameOver', () => this._setDizzy(false));
    game.on('menu', () => this._setDizzy(false));
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
    game.on('dying', () => { if (this.hud) { const st = h('<div class="arrest-stamp">ARRESTED</div>'); this.hud.appendChild(st); setTimeout(() => st.remove(), 2300); } });
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
        <button class="pill name-pill" data-act="edit-name" aria-label="Edit your name">👤 ${escHtml(s.playerName || 'Guest')} <span class="edit-ico">✎</span></button>
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
        <div class="char-name"><span class="char-label">Rider</span> ${char.name}</div>
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
          <button class="nav-btn" data-act="chars"><span class="em">👤</span>Riders</button>
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
      else if (act === 'edit-name') this.showNameEditor();
      else if (act === 'toggle-headstart') { if (s.headstarts > 0) { this.prerun.headstart = !this.prerun.headstart; this.showMenu(); } else this.showShop('items'); }
      else if (act === 'toggle-booster') { if (s.scoreBoosters > 0) { this.prerun.booster = !this.prerun.booster; this.showMenu(); } else this.showShop('items'); }
    });
    this.root.appendChild(el);
    this.toastEl = el.querySelector('.toasts');
    this._flushToasts();
    if (!this._nameModalOffered && s.totalRuns === 0 && (!s.tutorialDone || s.playerName === 'Guest')) {
      this._nameModalOffered = true;
      this.showNameEditor({ firstRun: true });
    }
  }

  // ------------------------------------------------------------------ player name
  showNameEditor({ firstRun = false } = {}) {
    const s = this.game.save.data;
    const current = s.playerName || 'Guest';
    const el = h(`<div class="overlay ui-block fade-in"><div class="panel" style="width:min(420px,100%)">
      <h2>Your Name</h2>
      <input class="name-input" type="text" value="${escHtml(current === 'Guest' ? '' : current)}" placeholder="Guest" autocomplete="off" spellcheck="false">
      <div class="name-meta"><span class="name-error"></span><span class="name-count">0/12</span></div>
      ${firstRun ? '<div class="small-note">You can change this later in the menu.</div>' : ''}
      <div class="row two-up">
        <button class="btn ghost" data-act="${firstRun ? 'skip' : 'cancel'}">${firstRun ? 'Skip' : 'Cancel'}</button>
        <button class="btn orange" data-act="save">Save</button>
      </div>
    </div></div>`);
    const input = el.querySelector('.name-input');
    const errorEl = el.querySelector('.name-error');
    const countEl = el.querySelector('.name-count');
    const saveBtn = el.querySelector('[data-act=save]');
    // NIT fix: don't show "Name can't be empty" on an untouched field the moment the modal opens.
    // `touched` flips true on the first keystroke or a Save attempt; only then does the error text
    // render. Save stays correctly disabled on the empty field the whole time either way.
    let touched = false;
    const updateValidity = () => {
      // hard cap at 12 code points as the user types, so it's never silently truncated on save
      const chars = Array.from(input.value);
      if (chars.length > 12) input.value = chars.slice(0, 12).join('');
      const { valid, error } = validateName(input.value);
      countEl.textContent = `${codePointLen(input.value.trim())}/12`;
      errorEl.textContent = touched ? error : '';
      saveBtn.disabled = !valid;
      saveBtn.classList.toggle('invalid', touched && !valid);
    };
    input.addEventListener('input', () => { touched = true; updateValidity(); });
    updateValidity();
    const commit = () => {
      touched = true;
      if (!validateName(input.value).valid) { updateValidity(); return; }
      s.playerName = cleanName(input.value) || 'Guest';
      this.game.save.write();
      this.game.audio.click();
      el.remove();
      this.showMenu();
    };
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      if (a.dataset.act === 'save') { commit(); return; }
      this.game.audio.click();
      el.remove();
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
    this.root.appendChild(el);
    input.focus();
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

  /** Teargas haze + a plain warning that steering is inverted, so the reversal reads as a rule, not a glitch. */
  _setDizzy(on, secs = 0) {
    let el = this.root.querySelector('.dizzy-fx');
    if (on) {
      if (!el) { el = h('<div class="dizzy-fx"><div class="dizzy-haze"></div><div class="dizzy-warn">😵‍💫 DIZZY — CONTROLS REVERSED</div></div>'); this.root.appendChild(el); }
      el.style.setProperty('--dizzy-secs', `${secs}s`);
      el.classList.remove('out');
      void el.offsetWidth;
    } else if (el) {
      el.classList.add('out');
      setTimeout(() => el && el.remove(), 400);
    }
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
    // Progress is persisted per-step (Save.tutorialStep) the moment a step is displayed, so a mid-tutorial
    // death/home doesn't lose it and doesn't falsely mark tutorialDone before step 5 has actually been shown.
    const game = this.game;
    const s = game.save.data;
    let i = Math.min(Math.max(0, s.tutorialStep || 0), TUTORIAL_STEPS.length);
    if (i >= TUTORIAL_STEPS.length) {
      // Resume point is already past the last step (e.g. save repaired) — just settle tutorialDone.
      if (!s.tutorialDone) { s.tutorialDone = true; game.save.write(); }
      return;
    }
    const el = h(`<div class="tutorial">${TUTORIAL_STEPS[i].text}</div>`);
    this.hud.appendChild(el);
    let timer = null, offInput = null;
    const finish = () => {
      clearTimeout(timer); if (offInput) offInput();
      if (el.isConnected) el.remove();
    };
    const show = () => {
      if (i >= TUTORIAL_STEPS.length) {
        if (!s.tutorialDone) { s.tutorialDone = true; game.save.write(); }
        return finish();
      }
      // Interrupted (death, home, next run rebuilding the HUD) — whatever step was last shown is
      // already persisted below, so just stop quietly. tutorialDone is NOT set here.
      if (!this.hud || !el.isConnected || game.state !== 'running') return finish();
      const st = TUTORIAL_STEPS[i];
      el.textContent = st.text;
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      s.tutorialStep = i + 1;   // this step has now been shown to the player — advance the resume point
      game.save.write();
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

  /** Cheapest item the player can't yet afford, across items/characters/bikes/upgrades — the "next unlock" tease. */
  _nextUnlock(s, coins) {
    const candidates = [
      { name: 'Turbo', cost: HOVERBOARD_COST },
      { name: 'Headstart', cost: HEADSTART_COST },
      { name: 'Score Booster', cost: SCORE_BOOSTER_COST },
      { name: 'Biryani Box', cost: MYSTERY_BOX_COST },
    ];
    for (const c of CHARACTERS) if (c.cost > 0 && !s.unlockedCharacters.includes(c.id)) candidates.push({ name: c.name, cost: c.cost });
    for (const b of BIKES) if (b.cost > 0 && !s.unlockedBoards.includes(b.id)) candidates.push({ name: b.name, cost: b.cost });
    for (const k of ['jetpack', 'sneakers', 'magnet', 'multiplier']) {
      const lvl = s.upgrades[k] || 0;
      if (lvl < POWERUP_UPGRADE_COST.length) candidates.push({ name: PU_NAME[k], cost: POWERUP_UPGRADE_COST[lvl] });
    }
    const unaffordable = candidates.filter((c) => c.cost > coins).sort((a, b) => a.cost - b.cost);
    return unaffordable[0] || null;
  }

  showGameOver({ run, canRevive, keysNeeded, cause, coinsNeeded, canReviveWithCoins }) {
    const g = this.game, s = g.save.data;
    if (this.hud) this.hud.style.display = 'none';   // don't let pause/turbo/HUD bleed through the game-over overlay
    const isBest = Math.floor(run.score) > s.highScore;
    const dist = Math.floor(g.distance);
    const mult = g.multiplier;                       // captured at death: base + booster + 2X, not baseMultiplier
    const newBestDist = !!run.newBestDistance || dist > (s.bestDistance || 0);   // Game only flags it when a previous best exists
    const closeCalls = run.closeCalls || 0;
    const causeText = { container: 'Straight into a shipping container!', jeep: 'Flattened by an army jeep!', pillar: 'Head first into an overpass pillar!', caught: 'The rangers grabbed you!',
      police_barricade: 'Tripped over a police barricade!', road_closed_gantry: 'Should have ducked under the sign!', teargas: 'Rode straight into the teargas!', barrier_mid: 'Tangled in police tape!' }[cause] || 'Caught!';
    const missions = g.missionProgress();
    const canCoinRevive = typeof g.reviveWithCoins === 'function' && !!canReviveWithCoins;
    const perkBonus = g.characterDef().perk === 'coins' ? Math.ceil(run.coins * 0.1) : 0;
    const bankAfter = s.coins + run.coins + perkBonus;   // what the bank becomes once this run is banked (Home/Play again)
    const nextUnlock = this._nextUnlock(s, bankAfter);
    const bankLine = `<div class="small-note bank-line">Bank ${fmt(bankAfter)}${nextUnlock ? ` · ${fmt(nextUnlock.cost - bankAfter)} to ${escHtml(nextUnlock.name)}` : ''}</div>`;
    const scoreShort = !isBest && s.highScore > 0 ? `<div class="small-note score-short">${fmt(s.highScore - Math.floor(run.score))} pts short of your best</div>` : '';
    const distLine = newBestDist
      ? '<div class="newbest dist">★ NEW BEST DISTANCE ★</div>'
      : (s.bestDistance > dist ? `<div class="small-note dist-short">${fmt(s.bestDistance - dist)} m short of your best distance</div>` : '');
    const el = h(`<div class="overlay ui-block fade-in"><div class="panel gameover">
      <div class="caught-title">ARRESTED!</div>
      <div class="run-owner">👤 ${escHtml(s.playerName || 'Guest')}</div>
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
      ${scoreShort}
      ${bankLine}
      ${closeCalls > 0 ? `<div class="small-note close-calls">⚡ ${closeCalls} close call${closeCalls > 1 ? 's' : ''}</div>` : ''}
      <div class="go-missions">${missions.map((m) => `<div class="mission-card mini ${m.done ? 'done' : ''}"><div class="t"><span>${m.text}</span><span class="${m.done ? 'done' : ''}">${m.done ? '✔' : `${fmt(m.value)}/${fmt(m.target)}`}</span></div><div class="bar"><i style="width:${Math.min(100, m.value / m.target * 100)}%"></i></div></div>`).join('')}</div>
      <div class="row" style="flex-direction:column">
        <button class="btn yellow saveme" data-act="revive" ${canRevive ? '' : 'disabled'}>SAVE ME ⚷${keysNeeded} <small>· you have ${s.keys}</small><span class="timer" style="width:100%"></span></button>
        <button class="btn purple saveme coins-revive" data-act="revive-coins" ${canCoinRevive ? '' : 'disabled'}>${canCoinRevive ? `Save me for ${fmt(coinsNeeded)} coins` : `Need ${fmt(Math.max(0, coinsNeeded - s.coins))} more coins <small>· have ${fmt(s.coins)} of ${fmt(coinsNeeded)}</small>`}</button>
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
        <div class="tabs">${['items', 'characters', 'bikes', 'upgrades'].map((t) => `<button class="tab ${t === tab ? 'active' : ''}" data-tab="${t}">${SHOP_TAB_LABEL[t]}</button>`).join('')}</div>
        <div class="list"></div>
        <div class="scroll-hint" hidden>⌄ scroll for more</div>
      </div></div></div>`);
    const list = el.querySelector('.list');
    const scrollHint = el.querySelector('.scroll-hint');
    const updateScrollHint = () => {
      const overflowing = list.scrollHeight > list.clientHeight + 2;
      const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 4;
      scrollHint.hidden = !overflowing || atBottom;
    };
    list.addEventListener('scroll', updateScrollHint);
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
          const locked = !owned && !sel && (c.tokens ? s.tokens < c.tokens : s.coins < c.cost);
          let btn;
          if (sel) btn = '<span class="btn small" style="background:var(--teal)">Selected</span>';
          else if (owned) btn = `<button class="btn small orange" data-select-char="${c.id}">Select</button>`;
          else if (c.tokens) btn = `<span class="btn small ghost">${locked ? '🔒 ' : ''}${s.tokens}/${c.tokens} tokens</span>`;
          else btn = `<button class="btn small yellow" data-buy-char="${c.id}" ${s.coins < c.cost ? 'disabled' : ''}>${locked ? '🔒 ' : ''}$ ${fmt(c.cost)}</button>`;
          const badge = cardBadge({ selected: sel, owned: owned && !sel, locked });
          list.appendChild(h(`<div class="card ${sel ? 'selected' : ''}"><div class="swatch" style="background:${c.palette.jacket}"><span style="width:26px;height:26px;border-radius:50%;background:${c.palette.skin || '#e8b58a'};border-top:9px solid ${c.palette.helmet};display:block"></span></div><div class="info"><div class="name">${c.name} ${badge}</div><div class="desc">${c.desc}</div>${c.perkText ? `<div class="perk">✦ ${c.perkText}</div>` : ''}</div>${btn}</div>`));
        }
      } else if (tab === 'bikes') {
        for (const b of BIKES) {
          const owned = s.unlockedBoards.includes(b.id);
          const sel = s.board === b.id;
          const locked = !owned && !sel && s.coins < b.cost;
          let btn;
          if (sel) btn = '<span class="btn small" style="background:var(--teal)">Selected</span>';
          else if (owned) btn = `<button class="btn small orange" data-select-board="${b.id}">Select</button>`;
          else btn = `<button class="btn small yellow" data-buy-board="${b.id}" ${s.coins < b.cost ? 'disabled' : ''}>${locked ? '🔒 ' : ''}$ ${fmt(b.cost)}</button>`;
          const badge = cardBadge({ selected: sel, owned: owned && !sel, locked });
          list.appendChild(h(`<div class="card ${sel ? 'selected' : ''}"><div class="swatch bike-swatch" style="background:${b.swatch};border-radius:14px">${bikeSVG(b)}</div><div class="info"><div class="name">${b.name} ${badge}</div><div class="desc">${b.desc}</div>${b.perkText ? `<div class="perk">✦ ${b.perkText}</div>` : ''}</div>${btn}</div>`));
        }
      } else if (tab === 'upgrades') {
        for (const k of ['jetpack', 'sneakers', 'magnet', 'multiplier']) {
          const lvl = s.upgrades[k] || 0;
          const max = POWERUP_UPGRADE_COST.length;
          const cost = lvl < max ? POWERUP_UPGRADE_COST[lvl] : null;
          const locked = cost != null && s.coins < cost;
          list.appendChild(h(`<div class="card"><div class="swatch" style="background:#e3f2ff">${{ jetpack: '🚀', sneakers: '🔩', magnet: '🧲', multiplier: '✖️' }[k]}</div><div class="info"><div class="name">${PU_NAME[k]}</div><div class="desc">Lasts ${10 + lvl * 5} s${cost ? ` → ${15 + lvl * 5} s` : ' (max)'}</div><div class="lvl">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div></div>
            ${cost ? `<button class="btn small yellow" data-upgrade="${k}" ${s.coins < cost ? 'disabled' : ''}>${locked ? '🔒 ' : ''}$ ${fmt(cost)}</button>` : '<span class="btn small ghost">MAX</span>'}</div>`));
        }
      }
      updateScrollHint();
    };
    render();
    requestAnimationFrame(updateScrollHint);
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
      const MEDAL = ['🥇', '🥈', '🥉'];
      const rows = s.leaderboard.length ? s.leaderboard.map((r, i) => {
        const rider = CHARACTERS.find((c) => c.id === r.character);
        const riderName = rider ? rider.name : 'Rider';
        // an entry keeps its own stored `name` only when it differs from the CURRENT playerName —
        // otherwise a renamed player would see their old name repeated on every historic row.
        const oldNameTag = r.name && r.name !== (s.playerName || 'Guest') ? ` <span class="lb-oldname">(${escHtml(r.name)})</span>` : '';
        return `<div class="lb-row run-row"><div class="lb-top"><span class="rank">${MEDAL[i] || `${i + 1}.`}</span><span class="lb-score">${fmt(r.score)}</span></div><div class="lb-sub">${fmt(r.distance)} m · ${escHtml(riderName)} · ${r.date}${oldNameTag}</div></div>`;
      }).join('') : '<div class="small-note">No runs yet. Go run!</div>';
      body = `<div class="stat-grid"><div class="stat"><div class="k">Runs</div><div class="v">${s.totalRuns}</div></div><div class="stat"><div class="k">Best distance</div><div class="v">${fmt(s.bestDistance)} m</div></div><div class="stat"><div class="k">Total coins</div><div class="v">${fmt(s.stats.coins || 0)}</div></div><div class="stat"><div class="k">Jumps</div><div class="v">${fmt(s.stats.jumps || 0)}</div></div></div>
        <div class="list">${rows}</div>`;
    }
    const el = h(`<div class="screen dim scroll ui-block">
      <div class="topbar"><span class="pill">🏆 ${fmt(s.highScore)}</span><span class="pill">🏅 ${done.length}/${ACHIEVEMENTS.length}</span><span class="spacer"></span><button class="icon-btn" data-act="back">✕</button></div>
      <div class="center" style="justify-content:flex-start;margin-top:12px"><div class="panel" style="width:min(460px,100%)">
        <h2>${tab === 'badges' ? 'Badges' : `${escHtml(s.playerName || 'Guest')}'s Top Runs`}</h2>
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
          <div class="setting">Voice<button class="switch ${st.voice !== false ? 'on' : ''}" data-set="voice"></button></div>
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
