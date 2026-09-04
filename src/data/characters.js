// Playable characters. Palette keys are material names inside runner.glb.
export const CHARACTERS = [
  { id: 'zain', name: 'Zain', desc: 'Sector G-9 street runner. Never misses a chai break.', cost: 0,
    palette: { hoodie: '#1fb2a6', hoodie_dark: '#158f86', shorts: '#2c3e8f', cap: '#ff7a1a', backpack: '#ffcc33', shoe_sole: '#e0382b' } },
  { id: 'noor', name: 'Noor', desc: 'Fastest in F-7. Parkour queen of the Margalla trails.', cost: 3000,
    palette: { hoodie: '#e83e8c', hoodie_dark: '#b82c6c', shorts: '#2b2b2b', cap: '#ffffff', backpack: '#1fb2a6', shoe_sole: '#e83e8c', hair: '#3b2a1a', skin: '#f1c9a5' } },
  { id: 'guddu', name: 'Guddu', desc: 'Rickshaw mechanic. Runs on Pepsi and paratha rolls.', cost: 6000,
    palette: { hoodie: '#f5c400', hoodie_dark: '#c99f00', shorts: '#1f6b3a', cap: '#2b2b2b', backpack: '#d6202b', shoe_sole: '#1f6b3a', skin: '#b87a52' } },
  { id: 'rida', name: 'Rida', desc: 'Medical student at PIMS. Sprints between lectures.', cost: 12000,
    palette: { hoodie: '#7b3fe4', hoodie_dark: '#5e2eb3', shorts: '#f7f7f7', cap: '#7b3fe4', backpack: '#ffcc33', shoe_sole: '#7b3fe4', hair: '#1a1a1a', skin: '#dba97e' } },
  { id: 'sardar', name: 'Sardar Ji', desc: 'Retired truck artist. Paints while he runs.', cost: 20000,
    palette: { hoodie: '#ff5722', hoodie_dark: '#c4401a', shorts: '#2c3e8f', cap: '#1fb2a6', backpack: '#2a8c4a', shoe_sole: '#ffcc33', skin: '#a86a45', hair: '#e0e0e0' } },
  { id: 'chacha', name: 'Chacha Riaz', desc: 'Legend of the Aabpara bazaar. Runs from nobody.', cost: 35000,
    palette: { hoodie: '#f7f7f7', hoodie_dark: '#cfcfcf', shorts: '#8b5a2b', cap: '#8b5a2b', backpack: '#1f6b3a', shoe_sole: '#8b5a2b', skin: '#c48a5a', hair: '#8a8a8a' } },
  { id: 'ranger', name: 'Captain Bolt', desc: 'Unlock with 25 mystery-box tokens.', cost: 0, tokens: 25,
    palette: { hoodie: '#1e2a44', hoodie_dark: '#0f1a30', shorts: '#1e2a44', cap: '#f5c400', backpack: '#f5c400', shoe_sole: '#f5c400', skin: '#d9a57a' } },
];

export const BOARDS = [
  { id: 'default', name: 'Islamabad Classic', desc: 'The trusty teal board.', cost: 0, deck: '#1fb2a6', stripe: '#ff7a1a', glow: '#7cf2ff' },
  { id: 'truckart', name: 'Truck Art', desc: 'Painted in Rawalpindi. Loud and proud.', cost: 5000, deck: '#d6202b', stripe: '#f5c400', glow: '#ffd53d' },
  { id: 'margalla', name: 'Margalla Green', desc: 'Leaves a trail of pine needles.', cost: 8000, deck: '#1f6b3a', stripe: '#8fb47a', glow: '#8fff9a' },
  { id: 'metro', name: 'Metro Express', desc: 'Painted in Metro Bus red.', cost: 12000, deck: '#f7f7f7', stripe: '#d6202b', glow: '#ff9aa0', bonus: 'speed' },
  { id: 'lowrider', name: 'Lowrider', desc: 'Slides under any barrier automatically.', cost: 25000, deck: '#2b2b2b', stripe: '#7b3fe4', glow: '#c39bff', bonus: 'lowrider' },
  { id: 'bouncer', name: 'Bouncer', desc: 'Jumps twice as high while riding.', cost: 30000, deck: '#ffcc33', stripe: '#2c3e8f', glow: '#fff1a0', bonus: 'bouncer' },
];
