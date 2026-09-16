// Mission sets. Completing all 3 missions of a set raises the score multiplier by 1 (max 30).
// stat: key in the run/total stats objects. scope 'run' = in a single run, 'total' = lifetime.
// Pacing: sets 1–6 are skill / cumulative only and a casual player clears each in 2–4 runs.
// Anything that needs spending real coins (Biryani Boxes, tokens) starts at set 12+.
// Score targets assume SCORE_PER_METRE = 10.
const M = (text, stat, target, scope = 'total') => ({ text, stat, target, scope });

export const MISSION_SETS = [
  // 1–6: onboarding, no paywalls
  [M('Collect 300 coins', 'coins', 300), M('Score 5,000 points in one run', 'score', 5000, 'run'), M('Jump 15 times', 'jumps', 15)],
  [M('Collect 200 coins in one run', 'coins', 200, 'run'), M('Pick up 2 power-ups', 'powerups', 2), M('Collect 6 signal bubbles', 'bubbles', 6)],
  [M('Jump 50 times', 'jumps', 50), M('Collect 12 signal bubbles', 'bubbles', 12), M('Collect 1,000 coins', 'coins', 1000)],
  [M('Roll 30 times in total', 'rolls', 30), M('Dodge 20 barricades', 'barriersDodged', 20), M('Score 15,000 points in one run', 'score', 15000, 'run')],
  [M('Collect 2,500 coins', 'coins', 2500), M('Jump 30 times in one run', 'jumps', 30, 'run'), M('3 close calls in one run', 'closeCalls', 3, 'run')],
  [M('Use 1 Turbo', 'hoverboards', 1), M('Reach D-Chowk once', 'dchowk', 1), M('Complete 1 Daily Word Hunt', 'daily', 1)],
  // 7–11: mid game
  [M('Pick up 2 Jetpacks', 'jetpacks', 2), M('Score 50,000 points in one run', 'score', 50000, 'run'), M('5 close calls in one run', 'closeCalls', 5, 'run')],
  [M('Bump into 3 containers in one run', 'trainBumps', 3, 'run'), M('Pick up 40 coins with a Magnet', 'magnetCoins', 40), M('Get caught in the first 10 seconds', 'earlyCaught', 1)],
  [M('Use 1 Turbo without crashing', 'hoverNoCrash', 1), M('Knock over 3 rangers', 'rangers', 3), M('Roll 30 times in one run', 'rolls', 30, 'run')],
  [M('Score 100,000 points in one run', 'score', 100000, 'run'), M('Pick up 12 power-ups', 'powerups', 12), M('Jump onto 2 containers', 'trainJumps', 2)],
  [M('Score 20,000 points without collecting coins', 'noCoinScore', 20000, 'run'), M('Roll 50 times in the centre lane', 'centerRolls', 50), M('Spend 2,000 coins', 'spent', 2000)],
  // 12+: economy missions allowed
  [M('Buy 1 Biryani Box', 'boxesBought', 1), M('Dodge 40 barricades', 'barriersDodged', 40), M('Pick up 5 Nitro Springs', 'sneakers', 5)],
  [M('Bump 2 tyre piles', 'bushes', 2), M('Pick up 160 coins with a Magnet', 'magnetCoins', 160), M('25 close calls', 'closeCalls', 25)],
  [M('Get 2 character tokens from Biryani Boxes', 'tokens', 2), M('Roll 40 times in one run', 'rolls', 40, 'run'), M('Collect 400 coins in one run', 'coins', 400, 'run')],
  [M('Collect 500,000 points', 'score', 500000), M('Pick up 5 Jetpacks', 'jetpacks', 5), M('Bump into 12 cone rows', 'signals', 12)],
  [M('Complete 2 Daily Word Hunts', 'daily', 2), M('Pick up 3 Nitro Springs in one run', 'sneakers', 3, 'run'), M('Jump onto 4 containers', 'trainJumps', 4)],
  [M('Score 250,000 points in one run', 'score', 250000, 'run'), M('Spend 4,000 coins', 'spent', 4000), M('Pick up 15 Coin Magnets', 'magnets', 15)],
  [M('Pick up 2 Jetpacks in one run', 'jetpacks', 2, 'run'), M('Bump into 8 containers in one run', 'trainBumps', 8, 'run'), M('Use 3 Turbos without crashing', 'hoverNoCrash', 3)],
  [M('Use 5 Turbos', 'hoverboards', 5), M('Pick up 3 Magnets in one run', 'magnets', 3, 'run'), M('Get 5 character tokens from Biryani Boxes', 'tokens', 5)],
  [M('Collect 1,250,000 points', 'score', 1250000), M('Jump 40 times in one run', 'jumps', 40, 'run'), M('Pick up 25 power-ups', 'powerups', 25)],
  [M('Stumble into 15 obstacles', 'stumbles', 15), M('Buy 3 Biryani Boxes', 'boxesBought', 3), M('Pick up 240 coins with a Magnet', 'magnetCoins', 240)],
  [M('Dodge 80 barricades', 'barriersDodged', 80), M('Spend 8,000 coins', 'spent', 8000), M('Pick up 4 Nitro Springs in one run', 'sneakers', 4, 'run')],
  [M('Use 8 Headstarts', 'headstarts', 8), M('Jump onto 10 containers', 'trainJumps', 10), M('Pick up 15 Jetpacks', 'jetpacks', 15)],
  [M('Pick up 8 Biryani Boxes', 'boxes', 8), M('Roll 200 times in the centre lane', 'centerRolls', 200), M('Complete 4 Daily Word Hunts', 'daily', 4)],
  [M('Collect 15,000 coins', 'coins', 15000), M('Score 600,000 points in one run', 'score', 600000, 'run'), M('Jump onto 3 containers in one run', 'trainJumps', 3, 'run')],
  [M('Roll 50 times in one run', 'rolls', 50, 'run'), M('Collect 2,500,000 points', 'score', 2500000), M('Score 60,000 points without collecting coins', 'noCoinScore', 60000, 'run')],
  [M('Get 10 character tokens', 'tokens', 10), M('Buy 6 Biryani Boxes', 'boxesBought', 6), M('Bump into 20 cone rows', 'signals', 20)],
  [M('Jump 50 times in one run', 'jumps', 50, 'run'), M('Use 12 Turbos', 'hoverboards', 12), M('Use 4 Turbos without crashing', 'hoverNoCrash', 4)],
  [M('Collect 750 coins in one run', 'coins', 750, 'run'), M('Stumble into 25 obstacles', 'stumbles', 25), M('Score 1,250,000 points in one run', 'score', 1250000, 'run')],
  [M('Jump onto 4 containers in one run', 'trainJumps', 4, 'run'), M('Pick up 3 Jetpacks in one run', 'jetpacks', 3, 'run'), M('Pick up 1,200 coins with a Magnet', 'magnetCoins', 1200)],
  [M('Dodge 30 barricades in one run', 'barriersDodged', 30, 'run'), M('Pick up 5 Magnets in one run', 'magnets', 5, 'run'), M('Use 10 Headstarts', 'headstarts', 10)],
  [M('Pick up 4 2X Multipliers in one run', 'multipliers', 4, 'run'), M('Complete 6 Daily Word Hunts', 'daily', 6), M('Score 125,000 points without jumping', 'noJumpScore', 125000, 'run')],
  [M('Bump 5 tyre piles', 'bushes', 5), M('Pick up 10 Biryani Boxes', 'boxes', 10), M('Roll 300 times in total', 'rolls', 300)],
  [M('Jump 70 times in one run', 'jumps', 70, 'run'), M('Pick up 5 Nitro Springs in one run', 'sneakers', 5, 'run'), M('Score 600,000 points without power-ups', 'noPowerupScore', 600000, 'run')],
  [M('Stay in the same lane for 20 seconds', 'sameLane', 20, 'run'), M('Bump into 12 containers in one run', 'trainBumps', 12, 'run'), M('Spend 9,000 coins', 'spent', 9000)],
  [M('Score 1,500,000 points in one run', 'score', 1500000, 'run'), M('Score 125,000 points without rolling', 'noRollScore', 125000, 'run'), M('Collect 25,000,000 points', 'score', 25000000)],
  [M('Stumble into 40 obstacles', 'stumbles', 40), M('Stumble 4 times in one run', 'stumbles', 4, 'run'), M('Jump 300 times', 'jumps', 300)],
  [M('Collect 800 coins in one run', 'coins', 800, 'run'), M('Pick up at least 1 of each power-up in one run', 'allPowerups', 1, 'run'), M('Pick up 12 Daily Letters', 'letters', 12)],
  [M('Roll 70 times in one run', 'rolls', 70, 'run'), M('Buy 10 Biryani Boxes', 'boxesBought', 10), M('Collect 20,000 coins', 'coins', 20000)],
  [M('Land on containers 10 times in a row', 'trainStreak', 10, 'run'), M('200 close calls', 'closeCalls', 200), M('Dodge 150 barricades', 'barriersDodged', 150)],
  [M('Use 20 Turbos', 'hoverboards', 20), M('Use 8 Turbos without crashing', 'hoverNoCrash', 8), M('Pick up 50 power-ups', 'powerups', 50)],
  [M('Bump into 5 cone rows in one run', 'signals', 5, 'run'), M('Roll 200 times in the centre lane', 'centerRolls', 200), M('Bump into 40 cone rows', 'signals', 40)],
  [M('Pick up 5 2X Multipliers in one run', 'multipliers', 5, 'run'), M('Score 700,000 points without power-ups', 'noPowerupScore', 700000, 'run'), M('Collect 30,000 coins', 'coins', 30000)],
  [M('Pick up 12 Jetpacks', 'jetpacks', 12), M('Pick up 4 Jetpacks in one run', 'jetpacks', 4, 'run'), M('Use 12 Headstarts', 'headstarts', 12)],
  [M('Collect 1,000 coins in one run', 'coins', 1000, 'run'), M('Pick up 1,500 coins with a Magnet', 'magnetCoins', 1500), M('Collect 40,000 coins', 'coins', 40000)],
  [M('Use 5 Turbos in one run without crashing', 'hoverNoCrash', 5, 'run'), M('Buy 10 Biryani Boxes', 'boxesBought', 10), M('Spend 12,000 coins', 'spent', 12000)],
  [M('Stay in the same lane for 30 seconds', 'sameLane', 30, 'run'), M('Pick up 5 Magnets in one run', 'magnets', 5, 'run'), M('Pick up 20 Coin Magnets', 'magnets', 20)],
  [M('Score 150,000 points without jumping', 'noJumpScore', 150000, 'run'), M('Score 150,000 points without rolling', 'noRollScore', 150000, 'run'), M('Score 800,000 points without power-ups', 'noPowerupScore', 800000, 'run')],
  [M('Land on containers 12 times in a row', 'trainStreak', 12, 'run'), M('Use 10 Turbos without crashing', 'hoverNoCrash', 10), M('Pick up 40 power-ups', 'powerups', 40)],
  [M('Score 2,500,000 points in one run', 'score', 2500000, 'run'), M('Collect 60,000 coins', 'coins', 60000), M('Complete 10 Daily Word Hunts', 'daily', 10)],
];

export const MAX_MULTIPLIER = 30;

// Daily word hunt words (Islamabad flavoured). Picked by day-of-year.
export const DAILY_WORDS = [
  'CHAI', 'METRO', 'MARGALLA', 'BIRYANI', 'FAISAL', 'RUNNER', 'JINNAH', 'PARATHA', 'MONAL', 'DCHOWK',
  'SAIDPUR', 'RAWAL', 'CENTAURUS', 'SHAKAR', 'LOKVIRSA', 'PIRSOHAWA', 'BLUEAREA', 'KARACHI', 'LAHORE', 'CRICKET',
  'SAMOSA', 'TRUCKART', 'SECTOR', 'AABPARA', 'NIHARI', 'GOLGAPPA', 'KEHKASHAN', 'SIGNAL', 'SHALIMAR', 'JASMINE',
];

export const DAILY_REWARDS = [500, 800, 1200, 2000, 3000, { keys: 3 }, { mystery: 1 }];
