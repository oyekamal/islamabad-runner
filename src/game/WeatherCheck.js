// Real Islamabad weather + day/night, layered on top of the game — never required for it.
// Open-Meteo, no key, CORS-open, free for non-commercial use <10k req/day (verified live 2026-09-24):
//   https://api.open-meteo.com/v1/forecast?latitude=33.6844&longitude=73.0479&current=temperature_2m,weather_code,is_day&timezone=Asia%2FKarachi
// `current.is_day` is computed server-side from the real sun position at Islamabad's coordinates —
// that alone gives correct day/night, no local sunrise/sunset math needed.
//
// Hard rule: this module must NEVER delay boot and must NEVER throw. Every failure path (no
// network, timeout, non-200, malformed JSON) falls back silently to a safe default. The fetch is
// fire-and-forget from the constructor; callers subscribe via `.on()` and get updated whenever
// (if ever) it resolves.

const URL_ = 'https://api.open-meteo.com/v1/forecast?latitude=33.6844&longitude=73.0479&current=temperature_2m,weather_code,is_day&timezone=Asia%2FKarachi';
const CACHE_KEY = 'islamabad-runner-weather-v1';
const CACHE_MS = 45 * 60 * 1000;      // re-fetch at most every 45 min in one sitting
const FETCH_TIMEOUT_MS = 4000;

// WMO weather_code -> a small bucket set the game actually renders differently.
// 0 clear | 1-3 cloud | 45/48 fog-haze (genuinely common in Islamabad) | 51-67,80-82 rain/drizzle
// | 71-77,85-86 snow (rare, low priority) | 95-99 storm.
export function bucketFromCode(code) {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'haze';
  if ((code >= 51 && code <= 67) || code === 80 || code === 81 || code === 82) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  return 'cloudy';   // unknown code: mild, safe middle ground
}

const ICON = { clear: '☀️', cloudy: '🌤️', haze: '🌫️', rain: '🌧️', storm: '⛈️', snow: '❄️' };
export const bucketIcon = (b) => ICON[b] || '☀️';

/** Device-local hour, used ONLY as the last-resort day/night guess when nothing real is known yet. */
const deviceIsDay = () => { const h = new Date().getHours(); return h >= 6 && h < 18; };

export class WeatherCheck {
  constructor() {
    this._listeners = [];
    // state.source: 'none' (never had a real value — UI shows nothing) | 'cache' (last known real
    // value, currently offline) | 'live' (this session's own successful fetch) | 'debug' (forced via querystring)
    this.state = { bucket: null, is_day: null, tempC: null, fetchedAt: null, source: 'none' };
    this._loadCache();
    if (!this._applyDebugOverride()) this._maybeFetch();
  }

  on(fn) { this._listeners.push(fn); }
  _emit() { for (const f of this._listeners) { try { f(this.state); } catch (e) { /* a listener's own bug must never break weather */ } } }

  /** Scene-facing values: always usable, even with zero network history ever. */
  effective() {
    if (this.state.bucket) return { bucket: this.state.bucket, is_day: !!this.state.is_day };
    return { bucket: 'clear', is_day: deviceIsDay() };
  }

  _loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && typeof d.bucket === 'string' && typeof d.fetchedAt === 'number') {
        this.state = { bucket: d.bucket, is_day: !!d.is_day, tempC: typeof d.tempC === 'number' ? d.tempC : null, fetchedAt: d.fetchedAt, source: 'cache' };
      }
    } catch (e) { /* corrupt/blocked storage — stay at defaults */ }
  }

  _saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ bucket: this.state.bucket, is_day: this.state.is_day, tempC: this.state.tempC, fetchedAt: this.state.fetchedAt })); } catch (e) { /* ignore */ }
  }

  /** `?weather=rain&day=0` forces a bucket/day-night for screenshots and QA, no network involved. */
  _applyDebugOverride() {
    try {
      const q = new URLSearchParams(location.search);
      const w = q.get('weather');
      if (!w || !ICON[w]) return false;
      const dayParam = q.get('day');
      const is_day = dayParam === null ? true : dayParam !== '0';
      this.state = { bucket: w, is_day, tempC: this.state.tempC ?? 22, fetchedAt: Date.now(), source: 'debug' };
      this._emit();
      return true;
    } catch (e) { return false; }
  }

  _maybeFetch() {
    if (this.state.fetchedAt && Date.now() - this.state.fetchedAt < CACHE_MS) return;   // cache still fresh
    this._fetch();
  }

  async _fetch() {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
      let res;
      try { res = await fetch(URL_, { signal: ac.signal }); } finally { clearTimeout(timer); }
      if (!res || !res.ok) return;
      const data = await res.json();
      const cur = data && data.current;
      if (!cur || typeof cur.temperature_2m !== 'number' || typeof cur.weather_code !== 'number') return;
      this.state = {
        bucket: bucketFromCode(cur.weather_code),
        is_day: !!cur.is_day,
        tempC: Math.round(cur.temperature_2m),
        fetchedAt: Date.now(),
        source: 'live',
      };
      this._saveCache();
      this._emit();
    } catch (e) { /* offline, aborted, malformed — silent, caller keeps whatever it had */ }
  }
}
