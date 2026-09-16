// Persistent player progress. Uses localStorage (works inside the Capacitor WebView too).
const KEY = 'islamabad-runner-save-v1';

const DEFAULTS = () => ({
  coins: 0,
  keys: 0,
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
  settings: { music: true, sfx: true, haptics: true, quality: 'auto' },
  leaderboard: [],             // [{score, coins, distance, date, character}]
  tutorialDone: false,
  achievementsDone: [],        // ids from data/achievements.js already awarded
  bubbleCharge: 0,
  lastLogin: '',               // local date of the last daily login gift
});

export class Save {
  constructor() {
    this.data = DEFAULTS();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed, upgrades: { ...this.data.upgrades, ...(parsed.upgrades || {}) },
          settings: { ...this.data.settings, ...(parsed.settings || {}) }, daily: { ...this.data.daily, ...(parsed.daily || {}) } };
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
