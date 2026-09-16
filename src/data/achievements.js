// Lifetime badges. `value(s)` reads save.data; `reward` is { coins } or { keys }.
// Awarded by the UI on 'runFinished' (ids stored in save.data.achievementsDone).
const A = (id, name, desc, value, target, reward) => ({ id, name, desc, value, target, reward });
const st = (k) => (s) => s.stats[k] || 0;
const dist = (s) => Math.max(s.stats.distance || 0, s.bestDistance || 0);
const streak = (s) => Math.max(s.stats.bestStreak || 0, (s.daily && s.daily.streak) || 0);

export const ACHIEVEMENTS = [
  A('runs_10', 'Regular', 'Finish 10 runs', (s) => s.totalRuns || 0, 10, { coins: 300 }),
  A('runs_100', 'Faisal Avenue Local', 'Finish 100 runs', (s) => s.totalRuns || 0, 100, { coins: 2000 }),
  A('dist_10k', 'Marathon Courier', 'Ride 10 km in total', dist, 10000, { coins: 500 }),
  A('dist_50k', 'Islamabad to Lahore', 'Ride 50 km in total', dist, 50000, { coins: 2500 }),
  A('jumps_100', 'Springy', 'Jump 100 times', st('jumps'), 100, { coins: 300 }),
  A('jumps_1000', 'Kangaroo', 'Jump 1,000 times', st('jumps'), 1000, { coins: 1500 }),
  A('rolls_500', 'Low Rider', 'Roll 500 times', st('rolls'), 500, { coins: 600 }),
  A('coins_10k', 'Pocket Money', 'Collect 10,000 coins', st('coins'), 10000, { coins: 500 }),
  A('coins_100k', 'Blue Area Banker', 'Collect 100,000 coins', st('coins'), 100000, { coins: 3000 }),
  A('dchowk_1', 'Made It', 'Reach D-Chowk once', st('dchowk'), 1, { keys: 2 }),
  A('dchowk_5', 'Regular Protester', 'Reach D-Chowk 5 times', st('dchowk'), 5, { coins: 1000 }),
  A('dchowk_20', 'Section 144 Veteran', 'Reach D-Chowk 20 times', st('dchowk'), 20, { keys: 5 }),
  A('close_25', 'Hair’s Breadth', '25 close calls', st('closeCalls'), 25, { coins: 400 }),
  A('close_200', 'Nerves of Steel', '200 close calls', st('closeCalls'), 200, { coins: 2000 }),
  A('streak_3', 'Three Days Running', '3-day Word Hunt streak', streak, 3, { keys: 1 }),
  A('streak_7', 'Week of Words', '7-day Word Hunt streak', streak, 7, { keys: 3 }),
  A('streak_30', 'Dictionary', '30-day Word Hunt streak', streak, 30, { keys: 10 }),
  A('rangers_50', 'Bowling Ball', 'Knock over 50 rangers', st('rangers'), 50, { coins: 800 }),
  A('trainjumps_50', 'Container King', 'Jump onto 50 containers', st('trainJumps'), 50, { coins: 800 }),
  A('bubbles_100', 'Signal Found', 'Collect 100 signal bubbles', st('bubbles'), 100, { coins: 500 }),
  A('powerups_100', 'Fully Charged', 'Pick up 100 power-ups', st('powerups'), 100, { coins: 800 }),
];

export const rewardText = (r) => (r.coins ? `+${r.coins.toLocaleString('en-US')} coins` : `+${r.keys} key${r.keys > 1 ? 's' : ''}`);
