// Playable riders. Palette keys are material names inside biker.glb.
// perk: 'coins' | 'shield' | 'powerups' — read by Game; perkText is shown on cards + menu.
export const CHARACTERS = [
  { id: 'zain', name: 'Zain', desc: 'Sector G-9 courier. Knows every service road in the city.', cost: 0,
    palette: { jacket: '#1fb2a6', jacket_dark: '#158f86', pants: '#2c3e8f', helmet: '#ff7a1a', backpack: '#ffcc33', gloves: '#2b2b2b' } },
  { id: 'noor', name: 'Noor', desc: 'Fastest in F-7. Rides the Margalla trails on weekends.', cost: 3000, perk: 'coins', perkText: '+10% coins on every run',
    palette: { jacket: '#e83e8c', jacket_dark: '#b82c6c', pants: '#2b2b2b', helmet: '#ffffff', backpack: '#1fb2a6', skin: '#f1c9a5' } },
  { id: 'guddu', name: 'Guddu', desc: 'Rickshaw mechanic. Runs on Pepsi and paratha rolls.', cost: 6000, perk: 'shield', perkText: 'First stumble of every run is free',
    palette: { jacket: '#f5c400', jacket_dark: '#c99f00', pants: '#1f6b3a', helmet: '#2b2b2b', backpack: '#d6202b', skin: '#b87a52' } },
  { id: 'rida', name: 'Rida', desc: 'Medical student at PIMS. Never late for a lecture.', cost: 12000, perk: 'powerups', perkText: 'Power-ups last +3 s',
    palette: { jacket: '#7b3fe4', jacket_dark: '#5e2eb3', pants: '#f7f7f7', helmet: '#7b3fe4', backpack: '#ffcc33', skin: '#dba97e' } },
  { id: 'sardar', name: 'Sardar Ji', desc: 'Retired truck artist. His bike is a rolling canvas.', cost: 20000,
    palette: { jacket: '#ff5722', jacket_dark: '#c4401a', pants: '#2c3e8f', helmet: '#1fb2a6', backpack: '#2a8c4a', skin: '#a86a45' } },
  { id: 'chacha', name: 'Chacha Riaz', desc: 'Legend of the Aabpara bazaar. Runs from nobody.', cost: 35000,
    palette: { jacket: '#f7f7f7', jacket_dark: '#cfcfcf', pants: '#8b5a2b', helmet: '#8b5a2b', backpack: '#1f6b3a', skin: '#c48a5a' } },
  { id: 'ranger', name: 'Captain Bolt', desc: 'Unlock with 25 biryani-box tokens.', cost: 0, tokens: 25,
    palette: { jacket: '#1e2a44', jacket_dark: '#0f1a30', pants: '#1e2a44', helmet: '#f5c400', backpack: '#f5c400', skin: '#d9a57a' } },
];

// Bikes (the "hoverboard" catalogue): recolour the bike and change Turbo behaviour.
export const BIKES = [
  { id: 'default', name: 'Seventy Classic', desc: 'The trusty red seventy. Never dies.', cost: 0, palette: { bike_body: '#e0382b' }, swatch: '#e0382b' },
  { id: 'truckart', name: 'Truck Art', desc: 'Painted in Rawalpindi. Loud and proud.', cost: 5000, palette: { bike_body: '#f5c400', bike_dark: '#1f6b3a', rim: '#ff7a1a' }, swatch: '#f5c400' },
  { id: 'margalla', name: 'Margalla Green', desc: 'Trail bike for the hills.', cost: 8000, palette: { bike_body: '#1f6b3a', rim: '#8fb47a' }, swatch: '#1f6b3a' },
  { id: 'metro', name: 'Metro Express', desc: 'Turbo runs 10% faster.', cost: 12000, palette: { bike_body: '#f7f7f7', bike_dark: '#d6202b' }, swatch: '#f7f7f7', bonus: 'speed' },
  { id: 'lowrider', name: 'Lowrider', desc: 'During Turbo, slides under tape, gantries and teargas automatically.', cost: 25000, palette: { bike_body: '#2b2b2b', rim: '#7b3fe4', bike_metal: '#7b3fe4' }, swatch: '#7b3fe4', bonus: 'lowrider' },
  { id: 'bouncer', name: 'Bouncer', desc: 'Jumps twice as high while Turbo is active.', cost: 30000, palette: { bike_body: '#ffcc33', bike_dark: '#2c3e8f' }, swatch: '#ffcc33', bonus: 'bouncer' },
];
