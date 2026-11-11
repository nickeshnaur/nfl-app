/* ============================================================================
   NFL — app core: data registry, templating, store, time machine, router,
   overlays, theming, i18n. Classic script (works from file://).
   Everything hangs off window.App; data files call NFL.put(name, payload).
   ========================================================================== */
(function () {
'use strict';

/* ------------------------------------------------------------------ data registry + lazy loader */
const NFL = window.NFL = { d: {}, waiting: {},
  put(name, v) { this.d[name] = v; (this.waiting[name] || []).forEach(f => f(v)); delete this.waiting[name]; },
};
const loading = {};
function load(name) {
  if (NFL.d[name]) return Promise.resolve(NFL.d[name]);
  if (loading[name]) return loading[name];
  return loading[name] = new Promise((res, rej) => {
    (NFL.waiting[name] = NFL.waiting[name] || []).push(res);
    const s = document.createElement('script');
    s.src = 'data/' + name + '.js';
    s.onerror = () => { delete loading[name]; rej(new Error('load ' + name)); };
    document.head.appendChild(s);
  });
}

/* ------------------------------------------------------------------ templating */
class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = s => new Safe(s == null ? '' : String(s));
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);
function val(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(val).join('');
  return esc(v);
}
/** html`<b>${x}</b>` — interpolations are escaped unless they are html`` results / raw() / arrays of them */
function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += val(vals[i]) + strings[i + 1];
  return new Safe(out);
}

/* ------------------------------------------------------------------ icons (24px line set) */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  scores: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M12 4v16M7 10v4M17 10v4"/>',
  watch: '<rect x="2.5" y="5" width="19" height="13" rx="3"/><path d="M10 9.2v4.6l4-2.3z" fill="currentColor"/><path d="M8 21h8"/>',
  // a helmet facing left: it sits at the right end of the tab bar
  teams: '<g transform="matrix(-1 0 0 1 24 0)"><path d="M14 19H7.5A3.5 3.5 0 0 1 4 15.5V12a8.5 8.5 0 0 1 16.4-3.2l.6 2.2h-7z"/><path d="M14 11v8M14 14.5h7M21 11v4.5c0 2-1.5 3.5-3.5 3.5H14"/><circle cx="9" cy="13" r="1.5"/></g>',
  explore: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  back: '<path d="m15 5-7 7 7 7"/>', chev: '<path d="m9 5 7 7-7 7"/>', down: '<path d="m5 9 7 7 7-7"/>', up: '<path d="m5 15 7-7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>', sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  headphones: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-3.2 3.6M6.4 7.4C4.3 9 3 12 3 12s4 6 9 6a8.7 8.7 0 0 0 4-1"/><path d="M9.9 10a3 3 0 0 0 4.2 4.2"/>',
  eye: '<path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="3"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>', pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/>',
  playc: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>', pip: '<rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  cast: '<path d="M3 17a4 4 0 0 1 4 4M3 13a8 8 0 0 1 8 8M3 9V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  radio: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8 17 3"/><circle cx="15" cy="14" r="2.5"/><path d="M6 12h4M6 16h4"/>',
  fire: '<path d="M12 21c-4 0-7-2.8-7-6.8 0-3.6 3-5.6 3.5-9.2 2.5 1.4 4 3.6 4 6 1-.7 1.8-2 2-3.5 2 1.7 3.5 4.3 3.5 6.7 0 4-3 6.8-6 6.8z"/>',
  football: '<ellipse cx="12" cy="12" rx="9.5" ry="6" transform="rotate(-35 12 12)"/><path d="M9 15l6-6M10.5 10.5l1 1M12.5 12.5l1 1M11.5 9.5l1 1M10 12l1 1"/>',
  whistle: '<circle cx="9" cy="14" r="5"/><path d="M12 10h9v3h-5M5 6l2 3"/>',
  stadium: '<ellipse cx="12" cy="8" rx="9" ry="3"/><path d="M3 8v8c0 1.7 4 3 9 3s9-1.3 9-3V8"/><path d="M8 18.7v-4M16 18.7v-4M12 19v-4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M17 14.5c2.5 0 4 1.7 4.6 4.5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  medal: '<circle cx="12" cy="15" r="6"/><path d="M8 3h8l-2 6.5h-4zM12 12.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  plane: '<path d="M10.5 4.5c0-1 .7-1.5 1.5-1.5s1.5.5 1.5 1.5V9l7 4v2l-7-2v4.5l2 1.5v1.5L12 20l-3.5 1.5V20l2-1.5V13l-7 2v-2l7-4z"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3h-3v-1.5M6 18.5V17"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>',
  food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1-3 4-3 7h3"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/>',
  a11y: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5 12 10l7-1.5M12 10v4.5l-3 6.5M12 14.5l3 6.5"/>',
  translate: '<path d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5.5 7M11 5c-.5 3-3 6-7 8"/><path d="M12 21l4-10 4 10M13.5 17.5h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  dots: '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6"/>', rewind: '<path d="M11 6 4 12l7 6zM20 6l-7 6 7 6z" fill="currentColor"/>',
  thumbsup: '<path d="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2.5 2.5V9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>', video: '<rect x="2.5" y="6" width="14" height="12" rx="2"/><path d="m16.5 10 5-3v10l-5-3z"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', game: '<path d="M7.5 7h9A4.5 4.5 0 0 1 21 11.5v3.2a2.8 2.8 0 0 1-5 1.7L14.6 14H9.4L8 16.4a2.8 2.8 0 0 1-5-1.7v-3.2A4.5 4.5 0 0 1 7.5 7z"/><path d="M8 9.5v3M6.5 11h3"/><circle cx="15.5" cy="10.3" r=".6" fill="currentColor"/><circle cx="17.3" cy="12" r=".6" fill="currentColor"/>', crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  dollar: '<path d="M12 3v18M16.5 7.5C16 6 14.3 5 12 5c-2.8 0-4.5 1.3-4.5 3.2 0 4.3 9 2.3 9 6.8 0 2-1.8 3.5-4.5 3.5-2.5 0-4.3-1.1-4.8-2.8"/>',
  pick: '<path d="M4 20 20 4M14 4h6v6"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  weather: '<path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5 4.5 4.5 0 0 1 17 18z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', split: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 12h18"/>',
  baby: '<circle cx="12" cy="8" r="4.5"/><path d="M6 21c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M10.5 7.5h.01M13.5 7.5h.01"/>',
};
// the NFL app's exported icons (app/icons-nfl.js) where we have them, ours for the rest; '-on' (Fill) when active: selected tab or cls 'fill'
const nfIcon = name => window.NFL_ICONS && window.NFL_ICONS[name];
function icon(name, cls = '') { const on = /\bfill\b/.test(cls) && nfIcon(name + '-on'); const nf = on || nfIcon(name); if (nf) return raw(`<svg class="ico nf ${cls}" viewBox="0 0 24 24" aria-hidden="true">${nf}</svg>`);
  return raw(`<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`); }

/* ------------------------------------------------------------------ persistent store */
const KEY = 'nfl-ultimate-v1';
const DEFAULT_PROFILE = () => ({
  onboarded: false, name: '', level: 'casual', depth: 2,
  teams: [], primary: null, players: [], rivals: [],
  location: { country: 'US', zip: '', city: '', tz: 'America/New_York', market: [] },
  sub: 'free', providers: [], lang: 'en',
  spoiler: { on: false, teams: [] },
  notif: { preset: 'smart', scoring: true, final: true, kickoff: true, news: true, injuries: true, players: true, quiet: false },
  a11y: { fs: 1, motion: false, contrast: false, captions: true, ad: false, haptics: true },
  theme: 'dark', themeV: 3, points: 120, streak: 3, badges: ['rookie'], picks: {}, polls: {}, trivia: {},
  saved: [], watched: [], bell: [], seen: null, wallet: [], cart: [], orders: [], passport: [],
  squads: [], lastOpen: null, depthOverride: {},
});
/** one favourite team, always first in the followed list; everyone else is "also following" */
function normTeams(p) {
  if (!p.primary && p.teams.length) p.primary = p.teams[0];
  if (p.primary) p.teams = [p.primary].concat(p.teams.filter(id => id !== p.primary));
  return p;
}
const store = {
  p: null,
  load() { try { this.p = Object.assign(DEFAULT_PROFILE(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { this.p = DEFAULT_PROFILE(); } // dark became the default (Nov 2026): move older saved profiles over once; a later choice sticks
    if ((this.p.themeV || 0) < 3) { this.p.theme = 'dark'; this.p.themeV = 3; }
    return normTeams(this.p); },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.p)); } catch {} },
  set(patch) { Object.assign(this.p, patch); this.save(); emit('profile', this.p); },
  reset() { this.p = DEFAULT_PROFILE(); this.save(); },
  /** session-only scratch (not persisted) */
  tmp: {},
};

/* ------------------------------------------------------------------ events */
const listeners = {};
function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => off(ev, fn); }
function off(ev, fn) { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); }
function emit(ev, ...a) { (listeners[ev] || []).slice().forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); }

/* ------------------------------------------------------------------ time machine
   Every moment is a real instant; the app renders the league exactly as it stood then
   (scores, live play-by-play reconstructed from wallclock stamps, standings, stats). */
const MOMENTS = [
  // the real current instant (live data from ESPN tops up the snapshot, app/live.js)
  { key: 'now', label: 'Right now', get sub() { return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' · live'; }, get at() { return new Date().toISOString(); }, phase: 'regular', icon: 'clock' },
  { key: 'gameday', label: 'Game Day Sunday', sub: 'Sun, Oct 11 2026 · Week 5, 3:55 PM ET', at: '2026-10-11T19:55:00Z', phase: 'regular', icon: 'football', live: true },
  { key: 'snf', label: 'Sunday Night', sub: 'Sun, Oct 11 2026 · BAL @ ATL, 9:40 PM ET', at: '2026-10-12T01:40:00Z', phase: 'regular', icon: 'moon', live: true },
  { key: 'midweek', label: 'Midweek', sub: 'Wed, Oct 14 2026 · Week 6 prep', at: '2026-10-14T16:00:00Z', phase: 'regular', icon: 'calendar' },
  { key: 'deadline', label: 'Trade Deadline', sub: 'Tue, Nov 4 2025 · 30 minutes to the 4 PM ET deadline', at: '2025-11-04T20:30:00Z', phase: 'regular', icon: 'swap' },
  { key: 'kickoff', label: 'Kickoff Week', sub: 'Thu, Sep 10 2026 · Opening night', at: '2026-09-10T22:00:00Z', phase: 'regular', icon: 'flag' },
  { key: 'camp', label: 'Training Camp', sub: 'Tue, Jul 28 2026', at: '2026-07-28T15:00:00Z', phase: 'camp', icon: 'whistle' },
  { key: 'summer', label: 'Summer Lull', sub: 'Sat, Jun 20 2026 · The dead zone', at: '2026-06-20T16:00:00Z', phase: 'summer', icon: 'sun' },
  { key: 'draft', label: 'Draft Night', sub: 'Thu, Apr 23 2026 · Round 1, Pittsburgh', at: '2026-04-24T01:10:00Z', phase: 'draft', icon: 'star' },
  { key: 'fa', label: 'Free Agency', sub: 'Wed, Mar 11 2026 · New league year', at: '2026-03-11T21:00:00Z', phase: 'fa', icon: 'swap' },
  { key: 'sb', label: 'Super Bowl LX', sub: 'Sun, Feb 8 2026 · SEA vs NE, 3rd qtr', at: '2026-02-09T01:45:00Z', phase: 'post', icon: 'trophy', live: true },
  // season and offseason states (time machine groups); each a real instant
  { key: 'bye', label: 'Bye Week', sub: 'Sun, Oct 11 2026 · Week 5, Chiefs and Panthers off', at: '2026-10-11T16:30:00Z', phase: 'regular', icon: 'calendar' },
  { key: 'race', label: 'Playoff Race', sub: 'Sun, Dec 28 2025 · Week 17, before the 1 PM games', at: '2025-12-28T16:30:00Z', phase: 'regular', icon: 'trophy' },
  { key: 'sbover', label: 'Season Over', sub: 'Mon, Feb 9 2026 · The morning after Super Bowl LX', at: '2026-02-09T14:00:00Z', phase: 'post', icon: 'trophy' },
  { key: 'sched', label: 'Schedule Release', sub: 'Wed, May 13 2026 · 8:30 PM ET, all 272 games out', at: '2026-05-14T00:30:00Z', phase: 'summer', icon: 'calendar' },
  { key: 'cuts', label: 'Cut-down Weekend', sub: 'Sun, Aug 30 2026 · Rosters to 53', at: '2026-08-30T20:00:00Z', phase: 'camp', icon: 'users' },
  // not listed in the time machine: where its "Scoring plays" jump lands (5 seconds before a real score)
  { key: 'pregame', label: 'Pregame', sub: 'Gates open, about 100 minutes to kickoff', at: '2026-10-11T18:45:00Z', phase: 'regular', icon: 'stadium' },
  { key: 'replay', label: 'Scoring play', sub: 'Five seconds before a real score', at: '2026-10-11T19:55:00Z', phase: 'regular', icon: 'football', live: true },
  // any day of the season at a time of day, picked from the week selector (its label is written by the time machine)
  { key: 'week', label: 'In season', sub: 'A day and time you picked', at: '2026-10-11T19:55:00Z', phase: 'regular', icon: 'calendar' },
  { key: 'playoffs', label: 'Divisional Round', sub: 'Sun, Jan 18 2026 · Playoffs', at: '2026-01-18T21:20:00Z', phase: 'post', icon: 'trophy', live: true },
];
const FRAME_NOW = '2026-10-18T03:30:00Z';
const time = {
  moments: MOMENTS,
  key: 'now', base: Date.now(), started: Date.now(), speed: 1, paused: false,
  init() {
    try {
      const t = JSON.parse(localStorage.getItem(KEY + '-time') || 'null');
      if (t) { this.key = t.key; this.base = t.base; this.speed = t.speed || 1; this.paused = !!t.paused; }
    } catch {}
    // Right now is always the real now when the app opens
    if (this.key === 'now') { this.base = Date.now(); this.speed = 1; this.paused = false; }
    this.started = Date.now();
  },
  save() { try { localStorage.setItem(KEY + '-time', JSON.stringify({ key: this.key, base: this.now(), speed: this.speed, paused: this.paused })); } catch {} },
  now() { return this.paused ? this.base : this.base + (Date.now() - this.started) * this.speed; },
  date() { return new Date(this.now()); },
  moment() { const m = MOMENTS.find(x => x.key === this.key) || MOMENTS[0]; return m.key === 'week' && this.labelFor ? { ...m, label: this.labelFor(this.now()), phase: this.phaseFor(this.now()) } : m; },
  phase() { return this.moment().phase; },
  set(key, at) {
    const m = MOMENTS.find(x => x.key === key) || MOMENTS[0];
    this.key = m.key; this.base = at != null ? at : m.key === 'now' ? Date.now() : Date.parse(m.at); this.started = Date.now(); this.v = (this.v || 0) + 1;
    this.save(); emit('time', this); App.refreshAll();
  },
  jump(ms) { this.base = this.now() + ms; this.started = Date.now(); this.save(); emit('time', this); App.refreshAll(); },
  setSpeed(s) { this.base = this.now(); this.started = Date.now(); this.speed = s; this.paused = false; this.save(); emit('time', this); },
  togglePause() { this.base = this.now(); this.started = Date.now(); this.paused = !this.paused; this.save(); emit('time', this); },
};

/* ------------------------------------------------------------------ formatting */
const fmt = {
  tz() { return store.p?.location?.tz || 'America/New_York'; },
  d(v) { return v instanceof Date ? v : new Date(v); },
  time(v) { return fmt.d(v).toLocaleTimeString(fmt.locale(), { hour: 'numeric', minute: '2-digit', timeZone: fmt.tz() }); },
  tzAbbr(v) { try { return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone: fmt.tz() }).formatToParts(fmt.d(v)).find(p => p.type === 'timeZoneName').value; } catch { return ''; } },
  day(v) { return fmt.d(v).toLocaleDateString(fmt.locale(), { weekday: 'short', month: 'short', day: 'numeric', timeZone: fmt.tz() }); },
  dayLong(v) { return fmt.d(v).toLocaleDateString(fmt.locale(), { weekday: 'long', month: 'long', day: 'numeric', timeZone: fmt.tz() }); },
  date(v) { return fmt.d(v).toLocaleDateString(fmt.locale(), { month: 'short', day: 'numeric', year: 'numeric', timeZone: fmt.tz() }); },
  weekday(v) { return fmt.d(v).toLocaleDateString(fmt.locale(), { weekday: 'short', timeZone: fmt.tz() }); },
  dayKey(v) { return fmt.d(v).toLocaleDateString('en-CA', { timeZone: fmt.tz() }); },
  ago(v) {
    const s = (time.now() - fmt.d(v).getTime()) / 1000;
    if (s < 0) return fmt.until(v);
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago'; if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
    return fmt.date(v);
  },
  until(v) {
    const s = (fmt.d(v).getTime() - time.now()) / 1000;
    if (s <= 0) return 'now';
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    if (d > 0) return `${d}d ${h}h`; if (h > 0) return `${h}h ${m}m`; return `${m}m`;
  },
  money(n) { if (n == null) return '—'; if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M'; if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'; return '$' + n; },
  n(v, d = 0) { if (v == null || v === '' || isNaN(v)) return '—'; return Number(v).toLocaleString(fmt.locale(), { maximumFractionDigits: d, minimumFractionDigits: d }); },
  pct(v, d = 1) { return v == null || isNaN(v) ? '—' : (v * 100).toFixed(d) + '%'; },
  ord(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); },
  locale() { return { en: 'en-US', es: 'es-US', de: 'de-DE', pt: 'pt-BR', fr: 'fr-FR', ja: 'ja-JP' }[store.p?.lang] || 'en-US'; },
  plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); },
};

/* ------------------------------------------------------------------ i18n (UI chrome) */
const STR = {
  es: { Home: 'Inicio', Scores: 'Marcadores', Watch: 'Ver', Teams: 'Equipos', Explore: 'Explorar', 'For You': 'Para ti', Live: 'En vivo', Final: 'Final', 'See all': 'Ver todo', Standings: 'Clasificación', Schedule: 'Calendario', Roster: 'Plantilla', Stats: 'Estadísticas', News: 'Noticias', Search: 'Buscar', Follow: 'Seguir', Following: 'Siguiendo', 'Where to watch': 'Dónde verlo', 'Catch me up': 'Ponme al día', Settings: 'Ajustes', Today: 'Hoy', Video: 'Video', Players: 'Jugadores', Playoffs: 'Playoffs', Injuries: 'Lesiones', 'Game Center': 'Centro del partido' },
  de: { Home: 'Start', Scores: 'Ergebnisse', Watch: 'Ansehen', Teams: 'Teams', Explore: 'Entdecken', 'For You': 'Für dich', Live: 'Live', Final: 'Ende', 'See all': 'Alle', Standings: 'Tabelle', Schedule: 'Spielplan', Roster: 'Kader', Stats: 'Statistiken', News: 'News', Search: 'Suche', Follow: 'Folgen', Following: 'Folge ich', 'Where to watch': 'Wo läuft das Spiel', 'Catch me up': 'Bring mich auf Stand', Settings: 'Einstellungen', Today: 'Heute', Video: 'Video', Players: 'Spieler', Playoffs: 'Playoffs', Injuries: 'Verletzungen', 'Game Center': 'Spielzentrale' },
  pt: { Home: 'Início', Scores: 'Placar', Watch: 'Assistir', Teams: 'Times', Explore: 'Explorar', 'For You': 'Para você', Live: 'Ao vivo', Final: 'Final', 'See all': 'Ver tudo', Standings: 'Classificação', Schedule: 'Calendário', Roster: 'Elenco', Stats: 'Estatísticas', News: 'Notícias', Search: 'Buscar', Follow: 'Seguir', Following: 'Seguindo', 'Where to watch': 'Onde assistir', 'Catch me up': 'Me atualize', Settings: 'Ajustes', Today: 'Hoje', Video: 'Vídeo', Players: 'Jogadores', Playoffs: 'Playoffs', Injuries: 'Lesões', 'Game Center': 'Central do jogo' },
  fr: { Home: 'Accueil', Scores: 'Scores', Watch: 'Regarder', Teams: 'Équipes', Explore: 'Explorer', 'For You': 'Pour vous', Live: 'En direct', Final: 'Final', 'See all': 'Tout voir', Standings: 'Classement', Schedule: 'Calendrier', Roster: 'Effectif', Stats: 'Stats', News: 'Actus', Search: 'Rechercher', Follow: 'Suivre', Following: 'Suivi', 'Where to watch': 'Où regarder', 'Catch me up': 'Résumé pour moi', Settings: 'Réglages', Today: "Aujourd'hui", Video: 'Vidéo', Players: 'Joueurs', Playoffs: 'Playoffs', Injuries: 'Blessures', 'Game Center': 'Centre du match' },
  ja: { Home: 'ホーム', Scores: 'スコア', Watch: '視聴', Teams: 'チーム', Explore: '探す', 'For You': 'おすすめ', Live: 'ライブ', Final: '試合終了', 'See all': 'すべて', Standings: '順位', Schedule: '日程', Roster: 'ロスター', Stats: 'スタッツ', News: 'ニュース', Search: '検索', Follow: 'フォロー', Following: 'フォロー中', 'Where to watch': '視聴方法', 'Catch me up': '要点まとめ', Settings: '設定', Today: '今日', Video: '動画', Players: '選手', Playoffs: 'プレーオフ', Injuries: '負傷者', 'Game Center': 'ゲームセンター' },
};
const t = s => (STR[store.p?.lang] || {})[s] || s;

/* ------------------------------------------------------------------ colour helpers */
function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function lum(h) { const [r, g, b] = hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
function mix(a, b, p) { const A = hexToRgb(a), B = hexToRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * p).toString(16).padStart(2, '0')).join(''); }
/** team colour roles, all picked from the Team Colors sheet by name and never mixed with black (Foundations › Team colour roles).
    mark: 3:1 on the surface (bars, meters, edges, big numbers) · ink: 4.5:1 (small text) · tint: soft backgrounds
    fill: a solid team colour that carries white text, whatever the theme (avatars, team chips) */
function teamRoles(team, bg) {
  const P = (App.PALETTE || {})[team && team.abbr];
  if (!P) return null;
  const dk = document.documentElement.dataset.theme !== 'light', sh = P.sh || {};
  bg = bg || (dk ? '#151517' : '#ffffff');
  const darkBg = lum(bg) < .5, ladder = darkBg ? [P.p, sh[300], sh[100], '#ffffff'] : [P.p, sh[700], sh[800], '#000000'];
  const pick = (L, b, need) => L.find(c => c && contrast(c, b) >= need) || L[L.length - 1];
  // always the team's own primary (the user's rule; an accessibility pass comes later). The sheet ladder only steps in
  // when the primary would all but disappear on this background (navy or black on the dark theme)
  const own = pick(ladder, bg, 1.6);
  return { primary: P.p, g: P.g, mark: own, ink: own, tint: (darkBg ? sh[800] : sh[100]) || mix(P.p, bg, .85), fill: inkPv() ? whiteOn(team) : P.p };
}
/** white text sits on the team's official primary everywhere (the user's call: official colours over contrast).
    ?pv=teamink keeps the declined accessible-shade proposal viewable; ?pv=teamold the earlier darkened heroes */
const inkPv = () => !(App.pv && App.pv.has('teamold'));
/** ?pv=teamink (cards color-*): the colour white text sits on. The team's primary when white passes 4.5:1 on it,
    otherwise the first sheet shade (700, then 800) that does; never an invented colour */
function whiteOn(team) {
  const P = (App.PALETTE || {})[team && team.abbr]; if (!P) return team && team.color;
  const sh = P.sh || {}; if (!(App.pv && App.pv.has('teamink'))) return P.p;
  return [P.p, sh[700], sh[800]].find(c => c && contrast(c, '#ffffff') >= 4.5) || sh[800] || P.p;
}
const teamFill = tm => { const r = teamRoles(tm); return r ? r.fill : tm.color; };
/** a version of the team's colour that reads on the current background: the sheet's Ink role */
function readable(team, bg) {
  const R = teamRoles(team, bg); if (R) return R.ink;
  bg = bg || (document.documentElement.dataset.theme === 'light' ? '#ffffff' : '#0d1117');
  // the colour fans think of first: primary unless the secondary is the signature (orange Broncos, action-green Seahawks…)
  const pref = { DEN: 'color', CHI: 'alt', HOU: 'alt', SEA: 'alt', CLE: 'color', PIT: 'alt', LV: 'alt', NE: 'alt', TEN: 'color', WAS: 'color', JAX: 'alt', NO: 'alt' }[team.abbr];
  const first = pref === 'alt' ? team.alt : team.color, second = pref === 'alt' ? team.color : team.alt;
  const cands = [first, second].filter(c => c && !/^#(000000|ffffff)$/i.test(c));
  // never darkened (the user's rule): the preferred colour, or the other one if it all but disappears on this background
  let best = cands[0] || '#4aa3ff';
  if (contrast(best, bg) < 1.6 && cands[1]) best = cands[1];
  return best;
}

/* ------------------------------------------------------------------ theming */
function applyTheme() {
  const p = store.p, root = document.documentElement;
  let theme = p.theme;
  if (theme === 'auto') theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  root.dataset.theme = theme;
  root.dataset.platform = p.platform === 'android' ? 'android' : 'ios';
  root.dataset.motion = p.a11y.motion ? 'reduced' : '';
  root.dataset.contrast = p.a11y.contrast ? 'high' : '';
  root.style.setProperty('--fs', p.a11y.fs || 1);
  const tm = p.primary && App.data && App.data.team(p.primary);
  if (tm) {
    const a = readable(tm);
    root.style.setProperty('--accent', a);
    root.style.setProperty('--accent-ink', contrast(a, '#ffffff') >= contrast(a, '#0a0a0a') ? '#ffffff' : '#0a0a0a');
    root.style.setProperty('--accent-soft', `color-mix(in srgb, ${a} 14%, transparent)`);
    root.style.setProperty('--team', tm.color); root.style.setProperty('--team-2', tm.alt);
  } else {
    ['--accent', '--accent-ink', '--accent-soft', '--team', '--team-2'].forEach(v => root.style.removeProperty(v));
  }
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
}
/** inline style that scopes team colours to an element (heroes, cards) */
/** deepen a colour until white text on it passes WCAG AA (4.5:1) */
function onWhite(c, need = 4.5) { let x = c, k = 0; while (contrast(x, '#ffffff') < need && k++ < 40) x = mix(c, '#000000', k * .025); return x; }
function teamVars(tm) {
  if (!tm) return '';
  // the team's own colours from the sheet, never darkened; pure black is lifted slightly so heroes don't vanish
  let base = tm.color;
  if (lum(base) < .004) base = '#16171a';
  let g = tm.grad || [mix(base, '#ffffff', .15), base]; const deep = (tm.shade && tm.shade[800]) || mix(base, '#000000', .55);
  // ?pv=teamink: white-text surfaces sit on the team colour that passes (each gradient stop that fails falls back to it)
  if (inkPv() && lum(tm.color) >= .004) { const w = whiteOn(tm); base = w; g = g.map(c => contrast(c, '#ffffff') >= 4.5 ? c : w); }
  return `--team:${base};--team-2:${tm.alt};--tg-a:${g[0]};--tg-b:${g[1]};--tg-deep:${deep};--hero-logo:url('${tm.logoDark || tm.logo}');--helmet:url('${tm.helmet ? new URL(tm.helmet, document.baseURI).href : ''}');--helmet-l:url('${tm.helmetL ? new URL(tm.helmetL, document.baseURI).href : ''}');--accent:${readable(tm)};${(R => R ? `--tm-mark:${R.mark};--tm-ink:${R.ink};--tm-tint:${R.tint};--tm-fill:${R.fill};` : '')(teamRoles(tm))}`;
}

/* ------------------------------------------------------------------ router with per-tab stacks */
const TABS = [
  { key: 'home', label: 'Home', icon: 'home', root: 'home' },
  { key: 'watch', label: 'Watch', icon: 'watch', root: 'watch' },
  { key: 'scores', label: 'Scores', icon: 'scores', root: 'scores' },
  { key: 'news', label: 'News', icon: 'news', root: 'news' },
  { key: 'teams', label: 'Teams', icon: 'teams', root: 'teams' },
];
const routes = [];
/** App.route('game/:id', (params, query) => ({ title, html, ...hooks })) */
function route(pattern, fn, opts = {}) {
  const keys = []; const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ pattern, re, keys, fn, opts });
}
/** the design cards borrow a screen: resolves to the view a route returns for hash, without mounting a page */
function viewOf(hash) {
  const m = match(hash); if (!m) return Promise.resolve(null);
  return Promise.resolve(m.r.fn(m.params, m.query, { state: {}, params: m.params, query: m.query, cleanup: [], hash })).then(v => v && Object.assign({}, v, { html: String(val(v.html)) }));
}
function match(hash) {
  const [path, qs] = hash.replace(/^#\/?/, '').split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  for (const r of routes) { const m = path.match(r.re); if (m) { const params = {}; r.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1])); return { r, params, query, path }; } }
  return null;
}
const stacks = {}; let curTab = 'home';
function tabFor(path) {
  const first = path.split('/')[0];
  return TABS.find(t => t.root === first)?.key;
}

/** a page object: { hash, el, view, params, query } — view is what the route returned */
function buildPage(hash, isRoot) {
  const m = match(hash);
  const el = document.createElement('section'); el.className = 'page';
  const page = { hash, el, params: m?.params || {}, query: m?.query || {}, cleanup: [], isRoot: !!isRoot };
  page.render = () => renderPage(page, m);
  page.render();
  el.addEventListener('scroll', () => el.classList.toggle('scrolled', el.scrollTop > 4), { passive: true });
  return page;
}
function renderPage(page, m) {
  const el = page.el;
  let view;
  try {
    view = m ? m.r.fn(page.params, page.query, page) : { title: 'Not found', html: html`<div class="empty">That screen doesn't exist yet.</div>` };
  } catch (e) {
    console.error(e);
    view = { title: 'Something broke', html: html`<div class="empty">${icon('info')}<div class="h3">This screen hit an error</div><div class="meta mt8">${e.message}</div></div>` };
  }
  if (view && typeof view.then === 'function') {
    // first paint shows skeleton rows (approved loading atom); a re-render keeps the current screen (and its scroll) until the new one is ready
    if (!page.view) el.innerHTML = header({ title: '' }, page) + '<div class="loading sk-list" aria-busy="true">' + '<div class="sk-row"><i class="sk r"></i><div class="grow"><i class="sk" style="width:70%"></i><i class="sk s" style="width:40%"></i></div></div>'.repeat(4) + '</div>';
    view.then(v => { page.view = v; paint(page, v); }).catch(e => { console.error(e); el.innerHTML = header({ title: 'Error' }, page) + `<div class="empty">${esc(e.message)}</div>`; });
    return;
  }
  page.view = view; paint(page, view);
}
function paint(page, view) {
  const keepScroll = page.el.scrollTop;
  page.cleanup.forEach(f => f()); page.cleanup = [];
  page.el.innerHTML = (view.noHeader ? '' : header(view, page)) + val(view.html);
  if (view.className) page.el.classList.add(...view.className.split(' '));
  page.el.scrollTop = keepScroll;
  if (view.mount) { try { const c = view.mount(page.el, page); if (typeof c === 'function') page.cleanup.push(c); } catch (e) { console.error(e); } }
}
function header(view, page) {
  if (view.header === false) return '';
  const canBack = (page && !page.isRoot) || view.back;
  const right = val(view.right || '');
  const big = view.big && !canBack;
  return `<header class="phead">
    <div class="phead-row ${canBack ? 'has-back' : ''}">
      ${canBack ? `<button class="icon-btn" data-act="back" aria-label="Back">${icon('back')}</button>` : ''}
      ${view.titleHtml ? val(view.titleHtml) : `<div class="phead-title ${big ? 'phead-big' : ''}">${esc(view.title || '')}</div>`}
      ${right}
    </div>${val(view.sub || '')}</header>`;
}

function showTab(key, { reset } = {}) {
  if (!stacks[key] || !stacks[key].length || reset) {
    (stacks[key] || []).forEach(p => { p.cleanup.forEach(f => f()); p.el.remove(); });
    stacks[key] = [];
    const tab = TABS.find(t => t.key === key);
    const page = buildPage('#/' + tab.root, true);
    stacks[key].push(page);
    document.querySelector(`.stack[data-tab=${key}]`).appendChild(page.el);
  }
  curTab = key;
  document.querySelectorAll('.stack').forEach(s => s.classList.toggle('on', s.dataset.tab === key));
  document.querySelectorAll('#device > .tabbar button').forEach(b => { const on = b.dataset.tab === key, tab = TABS.find(x => x.key === b.dataset.tab), svg = b.querySelector('svg.ico');
    b.classList.toggle('on', on); if (tab && svg) svg.outerHTML = String(tabIcon(tab, on)); });
  const tbar = document.querySelector('#device > .tabbar'); if (tbar) tbar.style.setProperty('--i', Math.max(0, TABS.findIndex(x => x.key === key)));
  const top = stacks[key][stacks[key].length - 1];
  syncHash(top.hash);
  emit('nav', top);
}
/** navigate: App.go('#/game/123') pushes onto the current tab (or switches tab for tab roots) */
function go(hash, opts = {}) {
  if (!hash.startsWith('#')) hash = '#/' + hash.replace(/^\//, '');
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const rootTab = TABS.find(t => t.root === path);
  if (rootTab) {
    const already = curTab === rootTab.key;
    showTab(rootTab.key, { reset: already || opts.reset });
    if (already) stacks[curTab][0].el.scrollTo({ top: 0, behavior: 'smooth' });
    if (opts.query) {}
    return;
  }
  const st = stacks[curTab];
  if (opts.replace && st.length > 1) { const old = st.pop(); old.cleanup.forEach(f => f()); old.el.remove(); }
  const page = buildPage(hash);
  const prev = st[st.length - 1];
  st.push(page);
  const host = document.querySelector(`.stack[data-tab=${curTab}]`);
  host.appendChild(page.el);
  if (!opts.instant) page.el.classList.add('enter');
  setTimeout(() => { prev && prev.el.classList.add('hidden'); page.el.classList.remove('enter'); }, opts.instant ? 0 : 330);
  syncHash(hash);
  emit('nav', page);
}
function back() {
  const st = stacks[curTab];
  if (st.length <= 1) return;
  const page = st.pop(); const prev = st[st.length - 1];
  prev.el.classList.remove('hidden');
  page.el.classList.add('leave');
  setTimeout(() => { page.cleanup.forEach(f => f()); page.el.remove(); }, 260);
  syncHash(prev.hash);
  if (prev.view && prev.view.onShow) prev.view.onShow(prev.el, prev);
  emit('nav', prev);
}
let hashLock = false;
function syncHash(h) { hashLock = true; history.replaceState(null, '', h); setTimeout(() => hashLock = false, 0); }
function current() { const st = stacks[curTab]; return st && st[st.length - 1]; }   // none on the design system page
/** re-render every page (after profile/time changes) */
function refreshAll() {
  // a sheet that asks to stay open (the time machine) survives a refresh; everything else closes
  if (sheets.length && sheets[sheets.length - 1].o.keep) closeModal(); else closeOverlays(true);
  Object.values(stacks).forEach(st => st.forEach(p => p.render()));
  renderChrome();
}
function refresh(page) { (page || current()).render(); }

/* ------------------------------------------------------------------ overlays */
function root() { return document.getElementById('device'); }
const sheets = [];
/** App.sheet({ title, html, full, mount(el), onClose }) */
function sheet(o) {
  const bd = document.createElement('div'); bd.className = 'backdrop';
  const sh = document.createElement('div'); sh.className = 'sheet' + (o.full ? ' full' : '');
  sh.innerHTML = `<div class="grab"></div>${o.title !== false ? `<div class="sheet-head"><div class="grow">${o.titleHtml ? val(o.titleHtml) : `<div class="h3">${esc(o.title || '')}</div>`}</div><button class="icon-btn" data-act="close-sheet" aria-label="Close">${icon('close')}</button></div>` : ''}<div class="sheet-body">${val(o.html)}</div>`;
  root().append(bd, sh);
  const entry = { bd, sh, o, cleanup: null };
  sheets.push(entry);
  bd.addEventListener('click', () => closeSheet());
  // swipe down to dismiss
  let y0 = null;
  sh.querySelector('.grab').addEventListener('pointerdown', e => { y0 = e.clientY; });
  sh.addEventListener('pointermove', e => { if (y0 != null && e.clientY - y0 > 0) sh.style.transform = `translateY(${e.clientY - y0}px)`; });
  sh.addEventListener('pointerup', e => { if (y0 != null) { if (e.clientY - y0 > 90) closeSheet(); else sh.style.transform = ''; } y0 = null; });
  if (o.mount) entry.cleanup = o.mount(sh.querySelector('.sheet-body'), entry);
  return entry;
}
function closeSheet(instant) {
  const e = sheets.pop(); if (!e) return;
  if (typeof e.cleanup === 'function') e.cleanup();
  e.o.onClose && e.o.onClose();
  if (instant) { e.bd.remove(); e.sh.remove(); return; }
  e.sh.classList.add('closing'); e.bd.style.opacity = 0; e.bd.style.transition = 'opacity .2s';
  setTimeout(() => { e.bd.remove(); e.sh.remove(); }, 220);
}
function updateSheet(entry, h) { entry.sh.querySelector('.sheet-body').innerHTML = val(h); }
let modalEl = null, modalCleanup = null;
/** full-screen modal (video player, onboarding, stadium mode...) */
function modal(o) {
  closeModal();
  modalEl = document.createElement('div'); modalEl.className = 'modal ' + (o.className || '');
  modalEl.innerHTML = val(o.html);
  root().appendChild(modalEl);
  modalCleanup = o.mount ? o.mount(modalEl) : null;
  return modalEl;
}
function closeModal() { if (modalEl) { if (typeof modalCleanup === 'function') modalCleanup(); modalEl.remove(); modalEl = null; } }
function closeOverlays(instant) { while (sheets.length) closeSheet(instant); closeModal(); }
/** App.toast({ title, body, icon, logo, go, ms }) or App.toast('text') */
function toast(o) {
  if (typeof o === 'string') o = { title: o };
  const box = document.querySelector('.toasts');
  const el = document.createElement('div'); el.className = 'toast' + (o.go ? ' tap' : '');
  el.innerHTML = `${o.logo ? `<img class="logo" src="${o.logo}">` : o.icon ? `<div class="icon-btn solid" style="width:34px;height:34px">${icon(o.icon, 'sm')}</div>` : ''}
    <div class="grow"><div class="b" style="font-size:14px">${val(o.title)}</div>${o.body ? `<div class="meta mt4">${val(o.body)}</div>` : ''}</div>
    ${o.badge ? val(o.badge) : ''}`;
  if (o.go) el.addEventListener('click', () => { el.remove(); go(o.go); });
  box.prepend(el);
  while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, o.ms || 3800);
  if (store.p.a11y.haptics && navigator.vibrate) try { navigator.vibrate(12); } catch {}
}

/* ------------------------------------------------------------------ actions (event delegation)
   <button data-act="name" data-arg="x"> → App.actions.name(el, ev, arg)
   <a data-go="#/route"> → push route ;  data-tab="scores" on tabbar */
const actions = {
  back: () => back(),
  'close-sheet': () => closeSheet(),
  'close-modal': () => closeModal(),
};
function onClick(ev) {
  const goEl = ev.target.closest('[data-go]');
  const actEl = ev.target.closest('[data-act]');
  // the innermost of the two wins
  if (actEl && (!goEl || goEl.contains(actEl))) {
    const fn = actions[actEl.dataset.act];
    if (fn) { ev.preventDefault(); ev.stopPropagation(); fn(actEl, ev, actEl.dataset.arg); }
    else console.warn('no action', actEl.dataset.act);
    return;
  }
  if (goEl) {
    ev.preventDefault();
    if (sheets.length || modalEl) closeOverlays(true);
    go(goEl.dataset.go);
    return;
  }
  const tabEl = ev.target.closest('.tabbar button[data-tab]');
  if (tabEl) { closeOverlays(true); const k = tabEl.dataset.tab; if (k === curTab) showTab(k, { reset: stacks[k].length > 1 }); else showTab(k); if (k === curTab && stacks[k].length === 1) stacks[k][0].el.scrollTo({ top: 0, behavior: 'smooth' }); }
}

/* ------------------------------------------------------------------ chrome: status bar, tab bar, minibar */
/** a tab's icon: the Fill export while it's the current tab, the outline otherwise */
const tabIcon = (tab, on) => icon(on && nfIcon(tab.icon + '-on') ? tab.icon + '-on' : tab.icon);
/** the tab bar's contents (Liquid Glass: a floating capsule with a lens that slides to the current tab). You lives in the header now. */
function tabBarInner(cur) {
  const liveN = App.data ? App.data.liveCount() : 0;
  const ic = tab => tabIcon(tab, tab.key === cur);
  return `<div class="tb-glass"><i class="tb-lens" aria-hidden="true"></i>${TABS.map(tab => `<button data-tab="${tab.key}" class="${tab.key === cur ? 'on' : ''}" aria-label="${esc(t(tab.label))}">${ic(tab)}<span>${esc(t(tab.label))}</span>${tab.key === 'scores' && liveN ? `<span class="tb-badge">${liveN}</span>` : ''}</button>`).join('')}</div>`;
}
function renderChrome() {
  const d = time.date();
  const sb = document.querySelector('.statusbar');
  if (sb) {
    const m = time.moment();
    sb.innerHTML = `<span class="num">${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: fmt.tz() }).replace(/\s?[AP]M/, '')}</span>
      <span class="sb-tm">${time.key !== 'now' || time.speed !== 1 ? '<i class="dot"></i>' : ''}${icon('clock', 'xs')}${esc(fmt.day(d))} · ${esc(m.label)}${time.speed !== 1 ? ' · ' + time.speed + '×' : ''}${time.paused ? ' · paused' : ''}</span>
      <span class="sb-icons"><svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx=".7"/><rect x="4.5" y="5" width="3" height="6" rx=".7"/><rect x="9" y="2.5" width="3" height="8.5" rx=".7"/><rect x="13.5" y="0" width="3" height="11" rx=".7"/></svg><svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor"/><path d="M23 4v4c.8-.3 1.3-1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".4"/></svg></span>`;
  }
  const tb = document.querySelector('#device > .tabbar');
  if (tb) {
    tb.innerHTML = tabBarInner(curTab);
    tb.style.setProperty('--i', Math.max(0, TABS.findIndex(x => x.key === curTab)));
  }
  emit('chrome');
}

/* ------------------------------------------------------------------ clock loop */
let lastSec = 0, lastMin = 0;
function tick() {
  const now = time.now();
  const s = Math.floor(now / 1000);
  if (s !== lastSec) {
    lastSec = s;
    emit('tick', now);
    const page = current();
    if (page && page.view && page.view.tick) { try { page.view.tick(page.el, page, now); } catch (e) { console.error(e); } }
    const mn = Math.floor(now / 60000);
    if (mn !== lastMin) { lastMin = mn; renderChrome(); if (time.speed !== 1 || time.key !== 'now') time.save(); }
  }
}

/* ------------------------------------------------------------------ boot */
function boot() {
  store.load(); time.init();
  frameMode();
  App.data.init();
  applyTheme();
  const dev = root();
  // no drawn status bar (chrome-nosb v2, built Nov 10): the phone's own sits above, so headers pad down to the safe area
  document.documentElement.classList.add('no-sb');
  dev.innerHTML = `<div class="statusbar" data-act="time-machine"></div><div id="stacks">${TABS.map(tb => `<div class="stack" data-tab="${tb.key}"></div>`).join('')}</div>
    <div class="minibar" hidden></div><nav class="tabbar"></nav><div class="toasts"></div>`;
  dev.addEventListener('click', onClick);
  renderChrome();
  // deep link support
  const h = location.hash;
  showTab('home');
  if (h && h.length > 2) {
    const path = h.replace(/^#\/?/, '').split('?')[0];
    const tab = tabFor(path);
    if (tab) { showTab(tab); if (path !== TABS.find(t => t.key === tab).root && match(h)) go(h, { instant: true }); }   // a page under a tab root (teams/all) opens on top of it
    else if (match(h)) go(h, { instant: true });
  }
  if (!store.p.onboarded && App.onboarding) App.onboarding.start();
  setInterval(tick, 250);
  emit('boot');
  store.p.lastOpen = store.p.lastOpen || time.now();
  // merge into whatever is stored (a test/devtools may have replaced the profile) rather than overwrite it
  if (!document.documentElement.classList.contains('in-frame')) window.addEventListener('beforeunload', () => { try { const cur = JSON.parse(localStorage.getItem(KEY) || 'null'); if (cur) { cur.lastOpen = time.now(); localStorage.setItem(KEY, JSON.stringify(cur)); } } catch {} });
}

/* index.html?frame&moment=gameday&team=12&theme=light: the design system's phone frames. The moment, team and
   theme are set in memory and nothing is saved, so a frame never changes the app you have open elsewhere. */
function frameMode() {
  const q = new URLSearchParams(location.search); if (!q.has('frame')) return;
  store.save = () => {}; time.save = () => {};
  const m = MOMENTS.find(x => x.key === q.get('moment'));
  // moment=now in a frame is the instant the Approvals cards were drawn at (Sat Oct 17 2026), so their crops and offsets hold
  if (m) { time.key = m.key; time.base = m.key === 'now' ? Date.parse(FRAME_NOW) : Date.parse(m.at); time.started = Date.now(); time.speed = 1; time.paused = true; }
  // &ts=<ISO instant>: any instant (an Approvals card showing a particular game state), paused, as an in-season day
  if (q.get('ts')) { time.key = 'week'; time.base = Date.parse(q.get('ts')); time.started = Date.now(); time.speed = 1; time.paused = true; }
  const tm = q.get('team');
  if (tm) { store.p.primary = tm; if (!store.p.teams.includes(tm)) store.p.teams = [tm, ...store.p.teams]; }
  if (q.get('theme')) store.p.theme = q.get('theme');
  if (q.get('sub')) store.p.sub = q.get('sub');
  if (q.get('platform')) store.p.platform = q.get('platform');
  store.p.onboarded = true;
  document.documentElement.classList.add('in-frame');
  // the Approvals context screen drives this frame: { dsGo: route, hl: selector } opens the route and outlines the element
  window.addEventListener('message', e => {
    const m = e.data || {}; if (!m.dsGo) return;
    const D = App.data, live = (D.liveGames()[0] || {}).id, next = (D.D.games.find(g => g.ts > time.now() && g.t !== 1) || {}).id,
      post = (D.D.games.filter(g => g.s === 2026 && D.state(g) === 'post').sort((a, b) => b.ts - a.ts)[0] || {}).id;
    const r = m.dsGo.replace('__LIVE__', live || post).replace('__NEXT__', next).replace('__POST__', post).replace('__TEAM__', store.p.primary);
    // a swap from last time is undone first, so the real element is back before this one is found
    const tok = App._dsTok = (App._dsTok || 0) + 1;   // a newer message cancels this one's keep-alive
    const had = document.querySelector('.ds-swap'); document.querySelectorAll('.ds-swap-full').forEach(x => x.remove());
    closeOverlays(true); go('#/' + r.replace(/^#?\/?/, ''), { instant: true }); if (had) refresh();
    // with { swap: html, css: [hrefs] } the picked option is drawn in place of the element (or over the screen when it has none)
    const swap = el => {
      (m.css || []).forEach(h => { if (!document.querySelector(`link[data-ds-css="${h}"]`)) document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="${h}" data-ds-css="${h}">`); });
      if (el && el.classList.contains('page')) { [...el.children].filter(c => !c.classList.contains('phead')).forEach(c => c.remove()); el.insertAdjacentHTML('beforeend', `<div class="ds-swap pad mt8">${m.swap}</div>`); el.scrollTop = 0; }
      else if (el) { const w = document.createElement('div'); w.className = 'ds-swap ds-hl'; w.innerHTML = m.swap; el.replaceWith(w); w.scrollIntoView({ block: 'center' });
        // a live page (RedZone, scores) may redraw that part on its next tick: put the option back a few times
        let k = 0; const keep = setInterval(() => { if (++k > 10 || tok !== App._dsTok || !document.contains(w) && !document.querySelector(m.hl)) return clearInterval(keep); if (!document.contains(w)) { clearInterval(keep); mark(); } }, 700); }
      else { const box = document.getElementById('device') || document.body; box.insertAdjacentHTML('beforeend', `<div class="ds-swap-full"><div class="ds-swap-in">${m.swap}</div></div>`); }
    };
    const mark = (n = 0) => {
      document.querySelectorAll('.ds-hl').forEach(x => x.classList.remove('ds-hl'));
      const el = m.hl === '@page' ? (current() || {}).el : m.hl && [...((current() || {}).el || document).querySelectorAll(m.hl)].find(x => x.getClientRects().length);   // only the page on screen, not ones under it in the stack
      if (el) { if (m.swap) swap(el); else { el.classList.add('ds-hl'); el.scrollIntoView({ block: 'center' }); } }
      else if (m.hl && n < 8) setTimeout(() => mark(n + 1), 250);
      else if (m.swap) swap(null);
    };
    setTimeout(mark, 450);
  });
  // tell a parent page (the Approvals context screen) once the app is up
  if (parent !== window) { const hi = () => App.current && App.current() ? parent.postMessage({ dsReady: true }, '*') : setTimeout(hi, 200); setTimeout(hi, 200); }
}
const App = window.App = {
  NFL, load, html, raw, esc, icon, ICONS, store, time, fmt, t, on, off, emit,
  route, viewOf, go, back, current, refresh, refreshAll, showTab, tabs: TABS, stacks: () => stacks, curTab: () => curTab,
  sheet, closeSheet, updateSheet, modal, closeModal, closeOverlays, toast, actions, renderChrome,
  tabBarInner, applyTheme, teamVars, teamRoles, teamFill, inkPv, readable, mix, lum, contrast, onWhite, boot, val, normTeams,
};
// pages that only borrow the app's code (design-system.html) set APP_NO_BOOT
document.addEventListener('DOMContentLoaded', () => { if (!window.APP_NO_BOOT) setTimeout(boot, 0); });
})();
