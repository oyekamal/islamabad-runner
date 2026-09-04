/** Procedural WebAudio sound: SFX + an upbeat looping soundtrack. No audio files needed. */
export class Audio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.musicOn = false;
    this._next = 0;
    this._step = 0;
    this._timer = null;
    this.intensity = 0;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.45; this.musicBus.connect(this.master);
    // noise buffer for hats / whooshes
    const len = this.ctx.sampleRate * 1;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  get sfxEnabled() { return this.ctx && this.settings.sfx; }

  _osc(type, freq, t0, dur, gain = 0.3, freqEnd = null, bus = null) {
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t0); o.stop(t0 + dur + 0.02);
  }

  _noise(t0, dur, gain = 0.2, hp = 1000, bus = null) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus); s.start(t0); s.stop(t0 + dur + 0.02);
  }

  // ------------------------------------------------------------------ SFX
  coin() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._osc('square', 1320, t, 0.08, 0.12); this._osc('square', 1760, t + 0.06, 0.12, 0.12); }
  jump() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._noise(t, 0.18, 0.12, 600); this._osc('sine', 300, t, 0.2, 0.15, 700); }
  roll() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._noise(t, 0.25, 0.18, 300); }
  swipe() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._noise(t, 0.1, 0.06, 1500); }
  stumble() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._osc('sawtooth', 200, t, 0.25, 0.25, 80); this._noise(t, 0.2, 0.2, 200); }
  crash() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._noise(t, 0.6, 0.5, 100); this._osc('sawtooth', 120, t, 0.5, 0.4, 40); this._osc('square', 90, t, 0.4, 0.3, 30); }
  boardBreak() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._noise(t, 0.4, 0.4, 2000); this._osc('triangle', 800, t, 0.3, 0.25, 200); }
  powerup() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => this._osc('square', f, t + i * 0.07, 0.18, 0.14)); }
  hover() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._osc('sine', 200, t, 0.5, 0.2, 900); this._noise(t, 0.4, 0.1, 3000); }
  jetpack() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._noise(t, 1.2, 0.25, 200); this._osc('sawtooth', 80, t, 1.0, 0.2, 200); }
  key() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; [880, 1174, 1568].forEach((f, i) => this._osc('triangle', f, t + i * 0.09, 0.3, 0.15)); }
  mission() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; [659, 784, 988, 1318, 1568].forEach((f, i) => this._osc('square', f, t + i * 0.08, 0.25, 0.12)); }
  click() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._osc('square', 900, t, 0.05, 0.08); }
  buy() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; [784, 1046, 1318].forEach((f, i) => this._osc('triangle', f, t + i * 0.06, 0.2, 0.15)); }
  whistle() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._osc('sine', 2200, t, 0.35, 0.15, 2600); this._osc('sine', 2200, t + 0.4, 0.5, 0.15, 2600); }
  letter() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; [1046, 1318, 1568, 2093].forEach((f, i) => this._osc('sine', f, t + i * 0.05, 0.25, 0.14)); }
  landing() { if (!this.sfxEnabled) return; const t = this.ctx.currentTime; this._noise(t, 0.08, 0.1, 400); }

  // ------------------------------------------------------------------ music
  startMusic() {
    if (!this.ctx || !this.settings.music) return;
    if (this.musicOn) return;
    this.musicOn = true;
    this._next = this.ctx.currentTime + 0.05;
    this._step = 0;
    this._tick();
  }

  stopMusic() {
    this.musicOn = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }

  _tick() {
    if (!this.musicOn) return;
    const bpm = 132;
    const stepLen = 60 / bpm / 4;     // 16th notes
    while (this._next < this.ctx.currentTime + 0.25) {
      this._playStep(this._step, this._next, stepLen);
      this._next += stepLen;
      this._step = (this._step + 1) % 128;
    }
    this._timer = setTimeout(() => this._tick(), 60);
  }

  _playStep(step, t, len) {
    const bar = Math.floor(step / 16) % 8;
    const s16 = step % 16;
    const bus = this.musicBus;
    // chord progression (Phrygian dominant flavour): E - F - G - E / E - D - F - E
    const roots = [82.41, 87.31, 98.0, 82.41, 82.41, 73.42, 87.31, 82.41];
    const root = roots[bar];
    // kick
    if (s16 % 4 === 0) { this._osc('sine', 150, t, 0.18, 0.7, 40, bus); }
    // snare / clap
    if (s16 === 4 || s16 === 12) { this._noise(t, 0.12, 0.25, 1500, bus); }
    // hats
    if (s16 % 2 === 1) { this._noise(t, 0.04, 0.08 + (this.intensity * 0.05), 6000, bus); }
    // bass: root on off-beats with octave bounce
    if (s16 % 4 === 0 || s16 % 4 === 3) {
      const f = (s16 % 8 === 3) ? root * 2 : root;
      this._osc('sawtooth', f, t, len * 1.8, 0.16, null, bus);
    }
    // arpeggio lead (scale: 1, b2, 3, 4, 5, b6, b7 -> Phrygian dominant)
    const scale = [1, 1.0595, 1.26, 1.335, 1.498, 1.587, 1.782, 2];
    const pattern = [0, 2, 4, 7, 4, 2, 5, 4, 0, 2, 4, 6, 4, 2, 1, 0];
    if (s16 % 2 === 0 || bar >= 4) {
      const deg = pattern[(s16 + bar * 3) % 16];
      const f = root * 4 * scale[deg % 8];
      this._osc(bar % 2 ? 'square' : 'triangle', f, t, len * 1.5, 0.05, null, bus);
    }
    // pad every bar
    if (s16 === 0) {
      this._osc('triangle', root * 2 * 1.26, t, len * 16, 0.03, null, bus);
      this._osc('triangle', root * 2 * 1.498, t, len * 16, 0.03, null, bus);
    }
  }
}
