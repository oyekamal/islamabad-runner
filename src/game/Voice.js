/**
 * Voice stingers. Two sources, in order:
 *   1. a recorded clip at public/voice/<id>.webm  (optional — record with tools/voice-recorder.html)
 *   2. a procedural cartoon stinger, so the game is never silent and ships with zero audio bytes
 *
 * Everything here is fail-soft: no files, a 404, a blocked AudioContext or a decode error must all
 * leave the game playing normally. Voice never throws into the game loop.
 */
import { VOICE_LINES } from '../data/voicelines.js';

const MIN_GAP = 1.8;        // seconds between ANY two voice lines, so they punctuate instead of chatter
// Per-trigger cooldowns. Pickups and near-misses cluster (a magnet can sweep three pickups in a
// few seconds), so the frequent ones need their own, longer gap or they turn into chatter.
const TRIGGER_GAP = { powerup: 6, closeCall: 5, dizzy: 6, turbo: 4, milestone: 0, highScore: 0, death: 0, revive: 0 };
const BASE = 'voice/';

export class Voice {
  constructor(audio, settings) {
    this.audio = audio;
    this.settings = settings;
    this.buffers = new Map();     // id -> AudioBuffer | null (null = known missing, do not retry)
    this.missing = new Set();
    this._last = new Map();       // trigger -> last variant index, so it never repeats back to back
    this._lastAt = -Infinity;
    this._lastPer = new Map();    // trigger -> when that trigger last spoke
    this._playing = null;
    this.available = 0;           // how many recorded clips actually loaded
  }

  get enabled() {
    const s = this.settings;
    return !!(this.audio && this.audio.ctx && s.sfx && s.voice !== false);
  }

  /** Pull every clip that exists. Safe to call repeatedly; missing files are remembered, not retried. */
  async preload() {
    if (!this.audio || !this.audio.ctx) return;
    const ids = Object.values(VOICE_LINES).flat().map((l) => l.id);
    await Promise.all(ids.map((id) => this._load(id)));
  }

  async _load(id) {
    if (this.buffers.has(id) || this.missing.has(id)) return this.buffers.get(id) || null;
    try {
      const res = await fetch(`${BASE}${id}.webm`);
      if (!res.ok) { this.missing.add(id); return null; }
      const buf = await this.audio.ctx.decodeAudioData(await res.arrayBuffer());
      this.buffers.set(id, buf);
      this.available++;
      return buf;
    } catch (e) {
      this.missing.add(id);              // offline, blocked, or not recorded yet — fall back quietly
      return null;
    }
  }

  /** Play one random variant for a trigger. Never overlaps, never repeats the previous variant. */
  say(trigger) {
    if (!this.enabled) return false;
    const lines = VOICE_LINES[trigger];
    if (!lines || !lines.length) return false;
    const now = this.audio.ctx.currentTime;
    if (now - this._lastAt < MIN_GAP) return false;
    if (now - (this._lastPer.get(trigger) ?? -Infinity) < (TRIGGER_GAP[trigger] || 0)) return false;

    const i = this._pick(trigger, lines.length);
    this._lastAt = now;
    this._lastPer.set(trigger, now);
    const line = lines[i];
    const buf = this.buffers.get(line.id);
    if (buf) this._playBuffer(buf);
    else { this._load(line.id); this._fallback(trigger); }   // fetch for next time, stinger for now
    return true;
  }

  /** Random variant that is never the same as the one before it (needs >= 2 variants to matter). */
  _pick(trigger, n) {
    if (n === 1) return 0;
    const prev = this._last.get(trigger);
    let i = Math.floor(Math.random() * n);
    if (i === prev) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
    this._last.set(trigger, i);
    return i;
  }

  _playBuffer(buf) {
    const ctx = this.audio.ctx;
    try {
      if (this._playing) { try { this._playing.stop(); } catch (e) { /* already ended */ } }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 1.0;
      src.connect(g); g.connect(this.audio.sfxBus || ctx.destination);
      // duck the music under the line, then bring it back
      const m = this.audio.musicBus;
      if (m) {
        const t = ctx.currentTime, back = t + buf.duration + 0.15;
        m.gain.cancelScheduledValues(t);
        m.gain.setTargetAtTime(0.16, t, 0.05);
        m.gain.setTargetAtTime(0.45, back, 0.12);
      }
      src.start();
      this._playing = src;
      src.onended = () => { if (this._playing === src) this._playing = null; };
    } catch (e) { /* audio is a nicety, never a crash */ }
  }

  /** Cartoon vocal-ish stingers: pure WebAudio, zero bytes, no rights attached. */
  _fallback(trigger) {
    const a = this.audio, ctx = a.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    // a short two-formant "voice" shape reads as a spoken syllable without being speech
    const syl = (t0, f0, f1, dur = 0.16, gain = 0.2) => {
      a._osc('sawtooth', f0, t0, dur, gain * 0.5, f1);
      a._osc('triangle', f0 * 2, t0, dur * 0.8, gain * 0.25, f1 * 2);
    };
    switch (trigger) {
      case 'powerup':                                      // rising "wah-wah!"
        syl(t, 320, 500); syl(t + 0.17, 420, 700, 0.22); break;
      case 'closeCall':                                    // sharp "arre!"
        syl(t, 600, 300, 0.12, 0.24); break;
      case 'turbo':                                        // three quick "chalo chalo chalo"
        syl(t, 380, 460, 0.1); syl(t + 0.12, 400, 480, 0.1); syl(t + 0.24, 420, 620, 0.14); break;
      case 'milestone':                                    // commentary lift
        [300, 400, 520, 680].forEach((f, i) => syl(t + i * 0.1, f, f * 1.25, 0.13, 0.18)); break;
      case 'highScore':                                    // little fanfare
        [523, 659, 784, 1046].forEach((f, i) => a._osc('square', f, t + i * 0.09, 0.22, 0.14)); break;
      case 'death':                                        // deflating slide
        a._osc('sawtooth', 300, t, 0.55, 0.22, 90); a._osc('triangle', 150, t, 0.6, 0.14, 45); break;
      case 'revive':
        syl(t, 260, 520, 0.2); break;
      case 'dizzy':                                        // woozy wobble
        a._osc('sine', 420, t, 0.5, 0.16, 300); a._osc('sine', 300, t + 0.1, 0.5, 0.14, 440); break;
      default: syl(t, 360, 480);
    }
  }
}
