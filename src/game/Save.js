// Persistent player progress. Uses localStorage (works inside the Capacitor WebView too).
const KEY = 'islamabad-runner-save-v1';

const DEFAULTS = () => ({
  coins: 0,
  keys: 1,          // a brand-new player starts with one revive in hand (see GAP A: early-death softlock)
  tokens: 0,
  hoverboards: 2,
  headstarts: 0,
  scoreBoosters: 0,
  mysteryBoxes: 0,
  highScore: 0,
  bestDistance: 0,
  totalRuns: 0,
  character: 'zain',
  board: 'default',
  unlockedCharacters: ['zain'],
  unlockedBoards: ['default'],
  upgrades: { jetpack: 0, sneakers: 0, magnet: 0, multiplier: 0 },
  missionSet: 0,               // index of current set
  missionProgress: [0, 0, 0],  // progress values for run-scoped missions are recomputed each run
  missionDone: [false, false, false],
  stats: {},                   // lifetime stats
  daily: { date: '', letters: 0, done: false, streak: 0, lastDone: '' },
  settings: { music: true, sfx: true, voice: true, haptics: true, quality: 'auto' },
  leaderboard: [],             // [{score, coins, distance, date, character}]
  tutorialDone: false,
  tutorialStep: 0,             // index of the next tutorial caption to show; advances the moment a step is displayed
  achievementsDone: [],        // ids from data/achievements.js already awarded
  bubbleCharge: 0,
  lastLogin: '',               // local date of the last daily login gift
  playerName: 'Guest',         // player's own display name, separate from the rider character
});

export class Save {
  constructor() {
    this.data = DEFAULTS();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // A stored key can be present but null (hand-edited or half-written save). Spreading a null
        // leaves the field null and the game white-screens on boot, so fall back per field rather
        // than trusting the merge. `?? undefined` makes the spread use the default.
        const d = this.data;
        this.data = { ...d, ...parsed,
          upgrades: { ...d.upgrades, ...(parsed.upgrades || {}) },
          settings: { ...d.settings, ...(parsed.settings || {}) },
          daily: { ...d.daily, ...(parsed.daily || {}) },
          stats: parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : d.stats,
          leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : d.leaderboard,
          unlockedCharacters: Array.isArray(parsed.unlockedCharacters) ? parsed.unlockedCharacters : d.unlockedCharacters,
          unlockedBoards: Array.isArray(parsed.unlockedBoards) ? parsed.unlockedBoards : d.unlockedBoards,
          achievementsDone: Array.isArray(parsed.achievementsDone) ? parsed.achievementsDone : d.achievementsDone,
          missionProgress: Array.isArray(parsed.missionProgress) ? parsed.missionProgress : d.missionProgress,
          missionDone: Array.isArray(parsed.missionDone) ? parsed.missionDone : d.missionDone,
          missionBase: parsed.missionBase && typeof parsed.missionBase === 'object' ? parsed.missionBase : undefined,
        };
      }
    } catch (e) { /* first run / private mode */ }
  }

  write() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  }

  addStat(key, n = 1) {
    this.data.stats[key] = (this.data.stats[key] || 0) + n;
  }

  maxStat(key, v) {
    if ((this.data.stats[key] || 0) < v) this.data.stats[key] = v;
  }

  addScore(entry) {
    this.data.leaderboard.push(entry);
    this.data.leaderboard.sort((a, b) => b.score - a.score);
    this.data.leaderboard = this.data.leaderboard.slice(0, 10);
    if (entry.score > this.data.highScore) this.data.highScore = entry.score;
    if (entry.distance > this.data.bestDistance) this.data.bestDistance = entry.distance;
    this.data.totalRuns++;
  }

  reset() { this.data = DEFAULTS(); this.write(); }
}
