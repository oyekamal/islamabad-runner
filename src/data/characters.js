// Playable riders. Palette keys are material names inside biker.glb.
// perk: 'coins' | 'shield' | 'powerups' — read by Game; perkText is shown on cards + menu.
export const CHARACTERS = [
  { id: 'zain', name: 'Zain', desc: 'Sector G-9 courier. Knows every service road in the city.', cost: 0,
    palette: { jacket: '#1fb2a6', jacket_dark: '#158f86', pants: '#2c3e8f', helmet: '#ff7a1a', backpack: '#ffcc33', gloves: '#2b2b2b' } },
  { id: 'noor', name: 'Noor', desc: 'Fastest in F-7. Rides the Margalla trails on weekends.', cost: 900, perk: 'coins', perkText: '+10% coins on every run',
    palette: { jacket: '#e83e8c', jacket_dark: '#b82c6c', pants: '#2b2b2b', helmet: '#ffffff', backpack: '#1fb2a6', skin: '#f1c9a5' } },
  { id: 'guddu', name: 'Guddu', desc: 'Rickshaw mechanic. Runs on Pepsi and paratha rolls.', cost: 2500, perk: 'shield', perkText: 'First stumble of every run is free',
    palette: { jacket: '#f5c400', jacket_dark: '#c99f00', pants: '#1f6b3a', helmet: '#2b2b2b', backpack: '#d6202b', skin: '#b87a52' } },
  { id: 'rida', name: 'Rida', desc: 'Medical student at PIMS. Never late for a lecture.', cost: 6000, perk: 'powerups', perkText: 'Power-ups last +3 s',
    palette: { jacket: '#7b3fe4', jacket_dark: '#5e2eb3', pants: '#f7f7f7', helmet: '#7b3fe4', backpack: '#ffcc33', skin: '#dba97e' } },
  { id: 'sardar', name: 'Sardar Ji', desc: 'Retired truck artist. His bike is a rolling canvas.', cost: 12000, perk: 'coins', perkText: '+10% coins on every run',
    palette: { jacket: '#ff5722', jacket_dark: '#c4401a', pants: '#2c3e8f', helmet: '#1fb2a6', backpack: '#2a8c4a', skin: '#a86a45' } },
  { id: 'chacha', name: 'Chacha Riaz', desc: 'Legend of the Aabpara bazaar. Runs from nobody.', cost: 20000, perk: 'shield', perkText: 'First stumble of every run is free',
    palette: { jacket: '#f7f7f7', jacket_dark: '#cfcfcf', pants: '#8b5a2b', helmet: '#8b5a2b', backpack: '#1f6b3a', skin: '#c48a5a' } },
  { id: 'ranger', name: 'Captain Bolt', desc: 'Unlock with 25 biryani-box tokens.', cost: 0, tokens: 25,
    palette: { jacket: '#1e2a44', jacket_dark: '#0f1a30', pants: '#1e2a44', helmet: '#f5c400', backpack: '#f5c400', skin: '#d9a57a' } },
];

// Bikes (the "hoverboard" catalogue): recolour the bike and change Turbo behaviour.
// bonus: 'extraHover' | 'doubleCoins' | 'laneSpeed' | 'speed' | 'lowrider' | 'bouncer' — read by Game/Player; perkText is shown on shop cards.
// shape: key into the bikeSVG geometry table in ui/UI.js — each bike gets its own silhouette
// matching its description (upright classic / tall decorated panel / knobbly trail / low faired
// speed / slammed lowrider / raised-suspension bouncer) instead of one shared outline.
export const BIKES = [
  { id: 'default', name: 'Seventy Classic', desc: 'The trusty red seventy. Never dies.', cost: 0, perkText: '+5 s Turbo', palette: { bike_body: '#e0382b' }, swatch: '#e0382b', bonus: 'extraHover', shape: 'classic' },
  { id: 'truckart', name: 'Truck Art', desc: 'Painted in Rawalpindi. Loud and proud.', cost: 2000, perkText: 'Coins collected during Turbo count double', palette: { bike_body: '#f5c400', bike_dark: '#1f6b3a', rim: '#ff7a1a' }, swatch: '#f5c400', bonus: 'doubleCoins', shape: 'truckart' },
  { id: 'margalla', name: 'Margalla Green', desc: 'Trail bike for the hills.', cost: 4000, perkText: 'Lane changes 25% faster', palette: { bike_body: '#1f6b3a', rim: '#8fb47a' }, swatch: '#1f6b3a', bonus: 'laneSpeed', shape: 'trail' },
  { id: 'metro', name: 'Metro Express', desc: 'White-and-red like the Metro bus. Made for open road.', cost: 12000, perkText: 'Turbo speed boost: +50% instead of +35%', palette: { bike_body: '#f7f7f7', bike_dark: '#d6202b' }, swatch: '#f7f7f7', bonus: 'speed', shape: 'sport' },
  { id: 'lowrider', name: 'Lowrider', desc: 'Slammed to the tarmac. Barely clears a speed bump.', cost: 25000, perkText: 'Auto-slides under obstacles during Turbo', palette: { bike_body: '#2b2b2b', rim: '#7b3fe4', bike_metal: '#7b3fe4' }, swatch: '#7b3fe4', bonus: 'lowrider', shape: 'lowrider' },
  { id: 'bouncer', name: 'Bouncer', desc: 'Stiff springs, fearless rider. Built off a rickshaw axle.', cost: 30000, perkText: '+70% jump height during Turbo', palette: { bike_body: '#ffcc33', bike_dark: '#2c3e8f' }, swatch: '#ffcc33', bonus: 'bouncer', shape: 'bouncer' },
];
