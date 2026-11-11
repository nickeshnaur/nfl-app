/* ============================================================================
   NFL — data layer. Real ESPN snapshot (2022-2026) re-played against App.time:
   any game after "now" is shown as upcoming, games in progress are rebuilt from
   play-by-play wallclock stamps, and standings/stats only count what has happened.
   ========================================================================== */
(function () {
'use strict';
const { NFL, load, time, store, fmt } = App;

const D = {
  teams: [], teamById: {}, teamByAbbr: {}, players: {}, games: [], gameById: {}, weeks: [],
  live: {},          // gameId -> pbp payload once loaded
};
const HS = id => `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`;
const SCHEDULE_RELEASE = Date.parse('2026-05-14T00:00:00Z');
const GAME_LEN = 3.3 * 3600e3;   // fallback game length when pbp isn't loaded

function init() {
  const c = NFL.d.core;
  D.core = c;
  D.teams = c.teams;
  c.teams.forEach(t => { D.teamById[t.id] = t; D.teamByAbbr[t.abbr] = t; });
  // official palette + helmet art (gradient for surfaces, primary/secondary for accents)
  c.teams.forEach(t => { const P = (App.PALETTE || {})[t.abbr]; if (P) { t.color = P.p; t.alt = P.s; t.ter = P.t; t.grad = P.g; t.shade = P.sh; } t.helmet = `assets/helmets/right%20facing/${t.abbr}.png`; t.helmetL = `assets/helmets/left%20facing/${t.abbr}.png`; });
  // ESPN codes Washington WSH; the NFL's own tricode is WAS. Assets above are keyed on WSH, everything shown says WAS (both look up)
  c.teams.forEach(t => { if (t.abbr === 'WSH') { t.abbr = 'WAS'; D.teamByAbbr.WAS = t; } });
  D.players = c.players;
  D.games = c.games.filter(g => D.teamById[g.h] && D.teamById[g.a]);
  D.games.forEach(g => { g.ts = Date.parse(g.d); D.gameById[g.id] = g; });
  // ESPN's franchise venue records are stale (Reliant, Coliseum, old Highmark): use the latest real home game
  D.teams.forEach(t => {
    const home = D.games.filter(g => g.h === t.id && !g.ns && g.vn && g.t === 2 && g.st === 'post').pop();
    if (home && home.vn !== t.venue.name) { t.venue = Object.assign({}, t.venue, { name: home.vn, city: home.vc || t.venue.city, img: home.v ? `https://a.espncdn.com/i/venues/nfl/day/${home.v}.jpg` : t.venue.img, id: home.v || t.venue.id }); }
  });
  // week index
  const wk = {};
  D.games.forEach(g => {
    const k = `${g.s}-${g.t}-${g.w}`;
    (wk[k] = wk[k] || { key: k, s: g.s, t: g.t, w: g.w, games: [], start: Infinity, end: 0 }).games.push(g);
    wk[k].start = Math.min(wk[k].start, g.ts); wk[k].end = Math.max(wk[k].end, g.ts);
  });
  D.weeks = Object.values(wk).sort((a, b) => a.start - b.start);
  // player name index for search
  D.playerList = Object.entries(D.players).map(([id, p]) => ({ id, ...p, lc: (p.n || '').toLowerCase() }));
  App.on('time', () => prepare());
  prepare();
}

/* ------------------------------------------------------------------ lookups */
const team = id => D.teamById[id] || D.teamByAbbr[id];
const player = id => D.players[id];
const game = id => D.gameById[id];
const logo = (tid, dark) => { const t = team(tid); return t ? (dark ? t.logoDark : t.logo) : ''; };
const opp = (g, tid) => g.h === tid ? g.a : g.h;
const isHome = (g, tid) => g.h === tid;
function weekLabel(t, w, short) {
  if (t === 1) return w === 1 ? 'Hall of Fame Game' : `Preseason Wk ${w - 1}`;
  if (t === 3) return ({ 1: 'Wild Card', 2: 'Divisional', 3: short ? 'Conf. Champ.' : 'Conference Championships', 4: 'Pro Bowl', 5: 'Super Bowl' })[w] || 'Playoffs';
  return (short ? 'Wk ' : 'Week ') + w;
}
const sbNumeral = s => ['LVII', 'LVIII', 'LIX', 'LX', 'LXI'][s - 2022];

/* ------------------------------------------------------------------ game state relative to App.time */
function endTs(g) {
  const pbp = D.live[g.id];
  // a game live right now (app/live.js) runs until the feed calls it final, not until its last play so far
  if (g.lv) return Math.max(pbp && pbp._end || 0, Date.now() + 120e3);
  if (pbp && pbp._end) return pbp._end;
  return g.ts + GAME_LEN + (g.ot ? 1500e3 : 0);
}
/** 'pre' | 'live' | 'post' at the given instant */
function state(g, now = time.now()) {
  if (now < g.ts) return 'pre';
  if (g.st !== 'post') return g.st === 'in' ? 'live' : 'pre';   // not played yet in the snapshot
  if (now >= endTs(g)) return 'post';
  return 'live';
}
/** flatten pbp into a time-ordered play array (cached on the payload) */
function flat(pbp) {
  if (pbp._flat) return pbp._flat;
  const out = [];
  pbp.dr.forEach((dr, di) => dr.p.forEach(p => { out.push(Object.assign({ di, team: p.pt || dr.t }, p, { _wc: p.wc ? Date.parse(p.wc) : null })); }));
  // fill missing wallclocks by interpolation
  let last = null;
  out.forEach(p => { if (p._wc) last = p._wc; else if (last) p._wc = last + 1000; });
  pbp._flat = out;
  pbp._start = out.find(p => p._wc)?._wc;
  pbp._end = (out[out.length - 1]?._wc || 0) + 60e3;
  return out;
}
/** yards to the end zone from 'at NE 39' text (ESPN's numeric field flips on punts/kicks) */
const ABBR_ALIAS = { BLT: 'BAL', CLV: 'CLE', HST: 'HOU', ARZ: 'ARI', LA: 'LAR', WSH: 'WAS', JAC: 'JAX' };
function yzFromText(dd, possTid) {
  const m = /at (?:([A-Z]{2,3}) )?(\d{1,2})\b/.exec(dd || ''); if (!m) return null;
  const n = +m[2]; if (n === 50 || !m[1]) return 50;
  const side = ABBR_ALIAS[m[1]] || m[1], pt = team(possTid);
  return pt && pt.abbr === side ? 100 - n : n;
}
/** current live situation, or null if pbp not loaded. idx = index into flat plays */
function live(g, now = time.now()) {
  const pbp = D.live[g.id];
  if (!pbp) return null;
  const plays = flat(pbp);
  let i = -1;
  for (let k = 0; k < plays.length; k++) { if (plays[k]._wc && plays[k]._wc <= now) i = k; else if (plays[k]._wc > now) break; }
  const st = state(g, now);
  if (i < 0) return { idx: -1, hs: 0, as: 0, q: 1, c: '15:00', poss: null, dd: 'Kickoff', plays, wp: 50, st };
  const p = plays[i];
  // score after play i = last defined score at or before i
  let hs = 0, as = 0;
  for (let k = i; k >= 0; k--) { if (plays[k].hs != null) { hs = plays[k].hs; as = plays[k].as; break; } }
  let wp = 50; for (let k = i; k >= 0; k--) if (plays[k].wp != null) { wp = plays[k].wp; break; }
  const next = plays[i + 1];
  const dr = pbp.dr[p.di];
  const possT = next ? next.team : p.team;
  const ddTxt = ((next ? next.dd : p.dd) || '').replace(/\bWSH\b/g, 'WAS') || (next ? next.dd : p.dd);
  return {
    idx: i, play: p, next, hs, as, q: p.q, c: p.c, st,
    poss: possT, dd: ddTxt, yz: yzFromText(ddTxt, possT) ?? (next ? next.yz : p.ez),
    wp, drive: dr, plays, redzone: !!next && /\d/.test(ddTxt || '') && (yzFromText(ddTxt, possT) ?? next.yz ?? 99) <= 20,
  };
}
/** the drive on the field so far: { n: plays, y: yards, t: 'm:ss' } (null between drives) */
const NOT_SNAP = /Kickoff|Timeout|End Period|End of|Extra Point|Two-minute|Coin Toss/i;
function driveSoFar(L) {
  if (!L || L.idx < 0 || !L.next) return null;
  const di = L.next.di; if (L.plays[L.idx].di !== di) return null;
  const dp = L.plays.slice(0, L.idx + 1).filter(p => p.di === di && !NOT_SNAP.test(p.ty || ''));
  if (!dp.length) return null;
  const sec = c => { const [m, s2] = String(c || '0:00').split(':').map(Number); return m * 60 + (s2 || 0); };
  const el = Math.max(0, (L.q - dp[0].q) * 900 + sec(dp[0].c) - sec(L.c));
  return { n: dp.length, y: dp.reduce((a, p) => a + (p.y || 0), 0), t: `${Math.floor(el / 60)}:${String(el % 60).padStart(2, '0')}` };
}
/** score + label for any game at "now", respecting spoiler shield */
function score(g, now = time.now()) {
  const st = state(g, now);
  if (st === 'pre') return { st, label: preLabel(g, now) };
  if (st === 'post') return { st, hs: g.hs, as: g.as, label: 'Final' + (g.ot ? '/OT' : ''), final: true };
  const L = live(g, now);
  if (L) {
    const qn = L.q > 4 ? 'OT' : fmt.ord(L.q);
    const half = L.q === 2 && L.c === '0:00' ? 'Halftime' : null;
    return { st, hs: L.hs, as: L.as, q: L.q, clock: L.c, poss: L.poss, dd: L.dd, yz: L.yz, wp: L.wp, redzone: L.redzone, label: half || `${qn} ${L.c}`, drv: half ? null : driveSoFar(L), L };
  }
  // live right now but its play-by-play hasn't arrived: the scoreboard's own score and clock
  if (g.lv) { const v = g.lv, q = v.q > 4 ? 'OT' : fmt.ord(v.q || 1); return { st, hs: g.hs, as: g.as, q: v.q, clock: v.c, poss: v.poss, dd: v.dd, label: v.q === 2 && v.c === '0:00' ? 'Halftime' : `${q} ${v.c || ''}`.trim() }; }
  // without pbp: estimate from linescores
  return { st, label: 'In progress', hs: '–', as: '–' };
}
function preLabel(g, now) {
  if (g.tbd) return 'TBD';
  const days = (g.ts - now) / 864e5;
  return days < 6 ? `${fmt.weekday(g.ts)} ${fmt.time(g.ts)}` : `${fmt.day(g.ts)} · ${fmt.time(g.ts)}`;
}
/** Spoiler shield: hide results for shielded teams until the fan marks the game watched */
function spoiled(g) {
  const sp = store.p.spoiler;
  if (!sp || !sp.on) return false;
  if ((store.p.watched || []).includes(g.id)) return false;
  const ts = sp.teams && sp.teams.length ? sp.teams : store.p.teams;
  return ts.includes(g.h) || ts.includes(g.a);
}

/** games live at an instant (by schedule window) */
function liveGames(now = time.now()) { return D.games.filter(g => g.st === 'post' && now >= g.ts && now < endTs(g)); }
function liveCount() { return liveGames().length; }

/** make sure pbp for live/near games is loaded, then repaint */
let prepToken = 0;
function prepare() {
  const now = time.now(), tok = ++prepToken;
  const want = D.games.filter(g => g.st === 'post' && g.s >= 2025 && now >= g.ts - 600e3 && now < g.ts + 5 * 3600e3 && !D.live[g.id]);
  if (!want.length) return Promise.resolve();
  return Promise.all(want.map(g => load('pbp/' + g.id).then(p => { D.live[g.id] = p; flat(p); }).catch(() => {}))).then(() => {
    if (tok === prepToken) { App.refreshAll(); App.emit('live-ready'); }
  });
}
/** load pbp for one game (Game Center) */
function ensurePbp(gid) {
  if (D.live[gid]) return Promise.resolve(D.live[gid]);
  return load('pbp/' + gid).then(p => { D.live[gid] = p; flat(p); return p; });
}
const ensureBox = s => load('box-' + s);
const box = gid => { const g = game(gid); return g && ((D.liveBox && D.liveBox[gid]) || (NFL.d['box-' + g.s] && NFL.d['box-' + g.s][gid])); };

/* ------------------------------------------------------------------ calendar context */
/** the "current" week for the Scores tab default */
function currentWeek(now = time.now()) {
  const vis = D.weeks.filter(w => w.t !== 1 || true);
  // the first week that hasn't fully finished (+ ~36h grace), else the last week
  for (const w of vis) {
    if (w.t === 3 && w.w === 4) continue; // skip Pro Bowl
    if (w.end + GAME_LEN + 36 * 3600e3 > now) {
      // in the offseason, before the next schedule is released, stay on the last played week
      if (w.start > now && now < SCHEDULE_RELEASE && w.s === 2026) return lastPlayedWeek(now) || w;
      return w;
    }
  }
  return vis[vis.length - 1];
}
function lastPlayedWeek(now = time.now()) { let last = null; D.weeks.forEach(w => { if (w.start <= now) last = w; }); return last; }
function week(s, t, w) { return D.weeks.find(x => x.s === s && x.t === t && x.w === w); }
function scheduleVisible(g, now = time.now()) { return !(g.s === 2026 && now < SCHEDULE_RELEASE); }
/** the season considered "current" for stats/standings */
function season(now = time.now()) {
  const d = new Date(now);
  const y = d.getUTCFullYear();
  return d.getUTCMonth() < 2 ? y - 1 : (d.getUTCMonth() < 8 ? y - 1 : y); // Mar-Aug → last season's numbers
}
function seasonForStats(now = time.now()) {
  // once a season's week 1 has kicked off, it's the stats season
  const s = new Date(now).getUTCFullYear();
  const wk1 = week(s, 2, 1);
  return wk1 && wk1.start <= now ? s : s - 1;
}

/* ------------------------------------------------------------------ team schedule / records */
function teamGames(tid, s, opts = {}) {
  return D.games.filter(g => g.s === s && (g.h === tid || g.a === tid) && (opts.pre || g.t !== 1) && g.t !== (opts.noPost ? 3 : -1));
}
function result(g, tid, now = time.now()) {
  if (state(g, now) !== 'post') return null;
  const us = g.h === tid ? g.hs : g.as, them = g.h === tid ? g.as : g.hs;
  return { us, them, r: us > them ? 'W' : us < them ? 'L' : 'T' };
}
const recCache = new Map();
function record(tid, s, now = time.now(), type = 2) {
  const key = tid + s + type + Math.floor(now / 60000);
  if (recCache.has(key)) return recCache.get(key);
  let w = 0, l = 0, tt = 0;
  D.games.forEach(g => { if (g.s === s && g.t === type && (g.h === tid || g.a === tid)) { const r = result(g, tid, now); if (r) r.r === 'W' ? w++ : r.r === 'L' ? l++ : tt++; } });
  const out = { w, l, t: tt, str: tt ? `${w}-${l}-${tt}` : `${w}-${l}` };
  if (recCache.size > 2000) recCache.clear();
  recCache.set(key, out);
  return out;
}
/** next game not yet finished (includes one in progress); preseason only counts in Aug */
function nextGame(tid, now = time.now()) {
  return D.games.find(g => (g.h === tid || g.a === tid) && state(g, now) !== 'post' && g.ts + GAME_LEN > now && scheduleVisible(g, now) && g.st !== 'pre' || ((g.h === tid || g.a === tid) && g.st === 'pre' && g.ts > now && scheduleVisible(g, now)));
}
function lastGame(tid, now = time.now()) { let last = null; D.games.forEach(g => { if ((g.h === tid || g.a === tid) && g.t !== 1 && state(g, now) === 'post') last = g; }); return last; }
function liveGameFor(tid, now = time.now()) { return D.games.find(g => (g.h === tid || g.a === tid) && state(g, now) === 'live'); }

/* ------------------------------------------------------------------ standings (computed, as of now) */
function standings(s, now = time.now()) {
  const rows = {};
  D.teams.forEach(t => rows[t.id] = { t, tid: t.id, w: 0, l: 0, tie: 0, pf: 0, pa: 0, hw: 0, hl: 0, aw: 0, al: 0, dw: 0, dl: 0, cw: 0, cl: 0, streak: '', res: [], h2h: {} });
  D.games.forEach(g => {
    if (g.s !== s || g.t !== 2 || state(g, now) !== 'post') return;
    const H = rows[g.h], A = rows[g.a];
    const th = team(g.h), ta = team(g.a);
    const same = th.conf === ta.conf, div = same && th.div === ta.div;
    [[H, g.hs, g.as, true, g.a], [A, g.as, g.hs, false, g.h]].forEach(([r, us, them, home, o]) => {
      r.pf += us; r.pa += them;
      const res = us > them ? 'W' : us < them ? 'L' : 'T';
      r.res.push(res);
      r.h2h[o] = (r.h2h[o] || 0) + (res === 'W' ? 1 : res === 'L' ? -1 : 0);
      if (res === 'W') { r.w++; home ? r.hw++ : r.aw++; if (div) r.dw++; if (same) r.cw++; }
      else if (res === 'L') { r.l++; home ? r.hl++ : r.al++; if (div) r.dl++; if (same) r.cl++; }
      else r.tie++;
    });
  });
  const all = Object.values(rows);
  all.forEach(r => {
    const gp = r.w + r.l + r.tie;
    r.pct = gp ? (r.w + r.tie / 2) / gp : 0; r.gp = gp; r.diff = r.pf - r.pa;
    let k = r.res.length - 1, n = 0; const last = r.res[k];
    while (k >= 0 && r.res[k] === last) { n++; k--; }
    r.streak = last ? last + n : '—';
    r.l5 = r.res.slice(-5).join('');
    r.dpct = (r.dw + r.dl) ? r.dw / (r.dw + r.dl) : 0; r.cpct = (r.cw + r.cl) ? r.cw / (r.cw + r.cl) : 0;
  });
  // NFL-style tiebreak (simplified): win pct, then within a tied group head-to-head pct among the group,
  // division pct (same division only), conference pct, point differential, points for
  const sortTied = (list, sameDiv) => {
    list.sort((a, b) => b.pct - a.pct);
    const out = [];
    for (let i = 0; i < list.length;) {
      let j = i; while (j < list.length && Math.abs(list[j].pct - list[i].pct) < 1e-9) j++;
      const grp = list.slice(i, j);
      if (grp.length > 1) {
        const ids = grp.map(r => r.tid);
        grp.forEach(r => { let w = 0, n = 0; ids.forEach(o => { if (o !== r.tid && r.h2h[o] != null) { w += r.h2h[o]; n++; } }); r._h2h = n ? w : 0; });
        grp.sort((a, b) => b._h2h - a._h2h || (sameDiv ? b.dpct - a.dpct : 0) || b.cpct - a.cpct || b.diff - a.diff || b.pf - a.pf);
      }
      out.push(...grp); i = j;
    }
    return out;
  };
  const cmp = (a, b) => b.pct - a.pct || b.cpct - a.cpct || b.diff - a.diff;
  const out = { all, conf: {}, div: {} };
  ['AFC', 'NFC'].forEach(cf => {
    const divs = ['East', 'North', 'South', 'West'].map(dv => {
      const list = sortTied(all.filter(r => r.t.conf === cf && r.t.div === dv), true);
      out.div[cf + ' ' + dv] = list;
      return list;
    });
    const winners = sortTied(divs.map(d => d[0]), false);
    // wild cards: best non-winner per division first breaks ties by division order
    const rest = sortTied(all.filter(r => r.t.conf === cf && !winners.includes(r)), false);
    const seeds = winners.concat(rest);
    seeds.forEach((r, i) => { r.seed = i + 1; r.divWinner = i < 4; r.inPlayoffs = i < 7; });
    out.conf[cf] = seeds;
  });
  return out;
}

/** weekly power rankings: record, margin and recent form, re-ranked against where teams stood a week earlier.
    { list: [{ tid, rk, prev, mv, rec, v }], of: { tid: entry } } — null before anyone has played */
const prCache = {};
function powerRank(s, now = time.now()) {
  const key = s + ':' + Math.floor(now / 36e5);
  if (prCache[key] !== undefined) return prCache[key];
  const rank = at => standings(s, at).all.map(r => {
    const l3 = r.res.slice(-3), form = l3.length ? l3.filter(x => x === 'W').length / l3.length : .5;
    const v = r.gp ? r.pct * .55 + Math.max(-1, Math.min(1, r.diff / r.gp / 14)) * .3 + form * .15 : 0;
    return { tid: r.tid, v, gp: r.gp, rec: `${r.w}-${r.l}${r.tie ? '-' + r.tie : ''}`, diff: r.diff, streak: r.streak };
  }).sort((a, b) => b.v - a.v || b.diff - a.diff);
  const cur = rank(now);
  if (!cur.some(r => r.gp)) return prCache[key] = null;
  const before = rank(now - 7 * 864e5), had = before.some(r => r.gp);
  const out = { list: cur.map((r, i) => { const prev = had ? before.findIndex(x => x.tid === r.tid) + 1 : null; return { ...r, rk: i + 1, prev, mv: prev ? prev - (i + 1) : 0 }; }), of: {} };
  out.list.forEach(r => out.of[r.tid] = r);
  return prCache[key] = out;
}

/* ------------------------------------------------------------------ player stat lines from box scores */
/** parse a stored player row [pid, tid, name, ...vals] for category cat into an object of numbers */
function lineObj(cat, row) {
  const keys = (D.core.catKeys[cat] || {}).keys || [];
  const o = { pid: row[0], tid: row[1], n: row[2] };
  keys.forEach((k, i) => {
    const v = row[3 + i];
    if (k.includes('/')) { const [a, b] = k.split('/'); const [x, y] = String(v).split('/'); o[a] = +x || 0; o[b] = +y || 0; }
    else if (k.includes('-') && typeof v === 'string' && v.includes('-')) { const [a, b] = k.split('-'); const [x, y] = v.split('-'); o[a] = +x || 0; o[b] = +y || 0; }
    else o[k] = typeof v === 'number' ? v : (parseFloat(v) || 0);
  });
  return o;
}
const SUMMABLE = /^(completions|passingAttempts|passingYards|passingTouchdowns|interceptions|sacks|sackYardsLost|rushingAttempts|rushingYards|rushingTouchdowns|receptions|receivingYards|receivingTouchdowns|receivingTargets|fumbles|fumblesLost|fumblesRecovered|totalTackles|soloTackles|passesDefended|QBHits|tacklesForLoss|defensiveTouchdowns|kickReturns|kickReturnYards|kickReturnTouchdowns|puntReturns|puntReturnYards|puntReturnTouchdowns|fieldGoalsMade|fieldGoalAttempts|extraPointsMade|extraPointAttempts|totalKickingPoints|punts|puntYards|touchbacks|puntsInside20|interceptionYards|interceptionTouchdowns)$/;
const LONGS = /^(longPassing|longRushing|longReception|longFieldGoalMade|longPunt|longInterception|longKickReturn|longPuntReturn)$/;

/** per-game lines for one player across loaded box files, filtered to games finished by now */
function gameLog(pid, s, now = time.now()) {
  const bx = NFL.d['box-' + s]; if (!bx) return null;
  const out = [];
  D.games.forEach(g => {
    if (g.s !== s || g.t === 1 || state(g, now) !== 'post') return;
    const b = bx[g.id]; if (!b) return;
    let line = null;
    for (const cat in b.pl) for (const row of b.pl[cat]) if (row[0] === pid) {
      line = line || { g, tid: row[1], cats: {} };
      line.cats[cat] = lineObj(cat, row);
    }
    if (line) out.push(line);
  });
  return out;
}
function sumLines(lines) {
  const tot = { gp: lines.length, cats: {} };
  lines.forEach(l => { for (const cat in l.cats) { const t = tot.cats[cat] = tot.cats[cat] || {}; const o = l.cats[cat];
    for (const k in o) { if (SUMMABLE.test(k)) t[k] = (t[k] || 0) + o[k]; else if (LONGS.test(k)) t[k] = Math.max(t[k] || 0, o[k]); } } });
  derive(tot.cats);
  return tot;
}
function derive(c) {
  const p = c.passing; if (p) { p.cmpPct = p.passingAttempts ? p.completions / p.passingAttempts * 100 : 0; p.ypa = p.passingAttempts ? p.passingYards / p.passingAttempts : 0; p.rating = passerRating(p); }
  const r = c.rushing; if (r) r.ypc = r.rushingAttempts ? r.rushingYards / r.rushingAttempts : 0;
  const rc = c.receiving; if (rc) rc.ypr = rc.receptions ? rc.receivingYards / rc.receptions : 0;
}
function passerRating(p) {
  const a = p.passingAttempts; if (!a) return 0;
  const cl = x => Math.max(0, Math.min(2.375, x));
  return (cl((p.completions / a - .3) * 5) + cl((p.passingYards / a - 3) * .25) + cl(p.passingTouchdowns / a * 20) + cl(2.375 - p.interceptions / a * 25)) / 6 * 100;
}
/** PPR fantasy points from a cats object (a footnote, never the headline) */
function fantasy(c) {
  if (!c) return 0;
  const p = c.passing || {}, r = c.rushing || {}, rc = c.receiving || {}, f = c.fumbles || {};
  return Math.round(((p.passingYards || 0) / 25 + (p.passingTouchdowns || 0) * 4 - (p.interceptions || 0) * 2 +
    (r.rushingYards || 0) / 10 + (r.rushingTouchdowns || 0) * 6 + (rc.receptions || 0) + (rc.receivingYards || 0) / 10 +
    (rc.receivingTouchdowns || 0) * 6 - (f.fumblesLost || 0) * 2) * 10) / 10;
}
/** season totals for every player (cached per season + minute) — powers leaders, ranks, compare */
const totCache = {};
function seasonTotals(s, now = time.now(), opts = {}) {
  const bx = NFL.d['box-' + s]; if (!bx) return null;
  const key = s + ':' + Math.floor(now / 60000) + ':' + (opts.post ? 'p' : 'r');
  if (totCache[key]) return totCache[key];
  const lines = {};
  D.games.forEach(g => {
    if (g.s !== s || (opts.post ? g.t !== 3 : g.t !== 2) || state(g, now) !== 'post') return;
    const b = bx[g.id]; if (!b) return;
    const seen = {};
    for (const cat in b.pl) for (const row of b.pl[cat]) {
      const pid = row[0];
      const L = lines[pid] = lines[pid] || { pid, n: row[2], tid: row[1], gp: 0, cats: {} };
      if (!seen[pid]) { seen[pid] = 1; L.gp++; L.tid = row[1]; }
      const o = lineObj(cat, row), t = L.cats[cat] = L.cats[cat] || {};
      for (const k in o) { if (SUMMABLE.test(k)) t[k] = (t[k] || 0) + o[k]; else if (LONGS.test(k)) t[k] = Math.max(t[k] || 0, o[k]); }
    }
  });
  Object.values(lines).forEach(L => { derive(L.cats); L.fpts = fantasy(L.cats); });
  return totCache[key] = lines;
}
/** leaders: stat path like 'passing.passingYards' */
function leaders(s, path, n = 10, now = time.now(), filter) {
  const tot = seasonTotals(s, now); if (!tot) return [];
  const [cat, k] = path.split('.');
  return Object.values(tot).filter(L => L.cats[cat] && (!filter || filter(L))).map(L => ({ ...L, v: L.cats[cat][k] || 0 }))
    .sort((a, b) => b.v - a.v).slice(0, n);
}
/** team season aggregates from box team stats + advanced (EPA etc.) */
function teamSeason(tid, s, now = time.now()) {
  const bx = NFL.d['box-' + s]; if (!bx) return null;
  const o = { g: 0, pts: 0, ptsA: 0, yds: 0, ydsA: 0, pass: 0, rush: 0, to: 0, toF: 0, plays: 0, epa: 0, succ: 0, expl: 0, passN: 0, passEPA: 0, rushN: 0, rushEPA: 0, dPlays: 0, dEpa: 0, dSucc: 0, sacks: 0, pen: 0, top: 0, third: [0, 0], rz: [0, 0] };
  D.games.forEach(g => {
    if (g.s !== s || g.t !== 2 || (g.h !== tid && g.a !== tid) || state(g, now) !== 'post') return;
    const b = bx[g.id]; if (!b) return;
    const oid = opp(g, tid), us = b.tm[tid] || {}, them = b.tm[oid] || {};
    o.g++; o.pts += g.h === tid ? g.hs : g.as; o.ptsA += g.h === tid ? g.as : g.hs;
    o.yds += +String(us.totalYards).replace(/,/g, '') || 0; o.ydsA += +String(them.totalYards).replace(/,/g, '') || 0;
    o.pass += +us.netPassingYards || 0; o.rush += +us.rushingYards || 0;
    o.to += +us.turnovers || 0; o.toF += +them.turnovers || 0;
    const sk = String(them.sacksYardsLost || '0-0').split('-'); o.sacks += +sk[0] || 0;
    const pn = String(us.totalPenaltiesYards || '0-0').split('-'); o.pen += +pn[0] || 0;
    const td = String(us.thirdDownEff || '0-0').split('-'); o.third[0] += +td[0] || 0; o.third[1] += +td[1] || 0;
    const rz = String(us.redZoneAttempts || '0-0').split('-'); o.rz[0] += +rz[0] || 0; o.rz[1] += +rz[1] || 0;
    const top = String(us.possessionTime || '0:00').split(':'); o.top += (+top[0] || 0) * 60 + (+top[1] || 0);
    const a = (b.adv || {})[tid], d = (b.adv || {})[oid];
    if (a) { o.plays += a.plays || 0; o.epa += a.epa || 0; o.succ += a.succ || 0; o.expl += a.expl || 0; o.passN += a.passN || 0; o.passEPA += a.passEPA || 0; o.rushN += a.rushN || 0; o.rushEPA += a.rushEPA || 0; }
    if (d) { o.dPlays += d.plays || 0; o.dEpa += d.epa || 0; o.dSucc += d.succ || 0; }
  });
  o.ppg = o.g ? o.pts / o.g : 0; o.papg = o.g ? o.ptsA / o.g : 0; o.ypg = o.g ? o.yds / o.g : 0; o.yapg = o.g ? o.ydsA / o.g : 0;
  o.epaPlay = o.plays ? o.epa / o.plays : 0; o.succRate = o.plays ? o.succ / o.plays : 0; o.explRate = o.plays ? o.expl / o.plays : 0;
  o.passEpaPlay = o.passN ? o.passEPA / o.passN : 0; o.rushEpaPlay = o.rushN ? o.rushEPA / o.rushN : 0;
  o.dEpaPlay = o.dPlays ? o.dEpa / o.dPlays : 0; o.dSuccRate = o.dPlays ? o.dSucc / o.dPlays : 0;
  o.thirdPct = o.third[1] ? o.third[0] / o.third[1] : 0; o.rzPct = o.rz[1] ? o.rz[0] / o.rz[1] : 0;
  o.toDiff = o.toF - o.to; o.topPg = o.g ? o.top / o.g : 0;
  return o;
}
/** rank of a team among all 32 for a teamSeason key (1 = best). lowerBetter for defence-style stats */
function teamRank(tid, s, key, lowerBetter, now = time.now()) {
  const vals = D.teams.map(t => ({ id: t.id, v: (teamSeason(t.id, s, now) || {})[key] || 0 }));
  vals.sort((a, b) => lowerBetter ? a.v - b.v : b.v - a.v);
  return vals.findIndex(x => x.id === tid) + 1;
}

/* ------------------------------------------------------------------ news, transactions, injuries */
// no gambling / DFS content, and drop the odd non-NFL story the feed carries
const NOT_FOR_US = /\b(odds|betting|bets?|parlay|sportsbook|DraftKings|FanDuel|spread|over\/under|NBA|Thunder|Gilgeous)\b/i;
function news(opts = {}) {
  const now = time.now();
  return D.core.news.filter(a => Date.parse(a.pub) <= now && !NOT_FOR_US.test(a.h + ' ' + (a.d || '')) &&
    (!opts.team || a.tm.includes(opts.team)) && (!opts.player || a.ath.includes(opts.player)) &&
    (!opts.teams || a.tm.some(t => opts.teams.includes(t))) && (opts.fantasy || !a.fan));
}
function tx(opts = {}) {
  const now = time.now(), d = fmt.dayKey(now);
  return D.core.tx.filter(r => r.dt <= d && (!opts.team || r.t === opts.team));
}
/** the injury report is a snapshot from mid-October 2026; only show it when "now" is near it */
function injuries(tid) {
  const dt = time.now() - Date.parse(D.core.built);
  const near = dt > -4 * 864e5 && dt < 10 * 864e5;   // the report was filed Oct 14–17
  return near ? (D.core.injuries[tid] || []) : [];
}
function injuryFor(pid) {
  const p = player(pid); if (!p) return null;
  return injuries(p.t).find(i => i.p === pid) || null;
}
function roster(tid) {
  return Object.entries(D.players).filter(([, p]) => p.t === tid).map(([id, p]) => ({ id, ...p }));
}

/* ------------------------------------------------------------------ search */
function search(q, n = 20) {
  q = q.trim().toLowerCase(); if (!q) return { teams: [], players: [] };
  const teams = D.teams.filter(t => (t.full + ' ' + t.abbr + ' ' + t.loc).toLowerCase().includes(q));
  const starts = [], contains = [];
  D.playerList.forEach(p => { if (p.lc.startsWith(q) || (p.ln || '').toLowerCase().startsWith(q)) starts.push(p); else if (p.lc.includes(q)) contains.push(p); });
  return { teams, players: starts.concat(contains).slice(0, n) };
}

/* ------------------------------------------------------------------ where to watch + entitlements
   2026 rights (per research/competitive-survey.md):
   NFL+ ($6.99): live local + primetime games on phone/tablet, live audio every game, NFL Films/library, ad-free highlights.
   NFL+ Premium ($14.99): + NFL RedZone, full & condensed replays (all devices), All-22.
   NFL Network moved to ESPN (ESPN Unlimited) in 2026. Outside the US: NFL Game Pass on DAZN (every game). */
const NETWORK_STREAM = {
  CBS: ['Paramount+', 'CBS (antenna)'], Fox: ['FOX One', 'FOX (antenna)'], FOX: ['FOX One', 'FOX (antenna)'], NBC: ['Peacock', 'NBC (antenna)'],
  ESPN: ['ESPN Unlimited'], ABC: ['ABC (antenna)', 'ESPN Unlimited'], 'ESPN/ABC': ['ESPN Unlimited', 'ABC (antenna)'], 'Prime Video': ['Prime Video'],
  'NFL Net': ['ESPN Unlimited', 'NFL Network (cable)'], 'NFL Network': ['ESPN Unlimited', 'NFL Network (cable)'], Netflix: ['Netflix'], YouTube: ['YouTube (free)'],
  ESPN2: ['ESPN Unlimited'], 'ESPN+': ['ESPN Unlimited'],
};
const PROVIDERS = [
  { k: 'antenna', n: 'TV antenna (CBS/FOX/NBC/ABC)' }, { k: 'cable', n: 'Cable / satellite' }, { k: 'yttv', n: 'YouTube TV' }, { k: 'ticket', n: 'NFL Sunday Ticket' },
  { k: 'paramount', n: 'Paramount+' }, { k: 'peacock', n: 'Peacock' }, { k: 'prime', n: 'Prime Video' }, { k: 'espn', n: 'ESPN Unlimited' },
  { k: 'netflix', n: 'Netflix' }, { k: 'fox', n: 'FOX One' }, { k: 'dazn', n: 'DAZN (NFL Game Pass)' },
];
const PROV_FOR = { 'Paramount+': 'paramount', 'FOX One': 'fox', Peacock: 'peacock', 'ESPN Unlimited': 'espn', 'Prime Video': 'prime', Netflix: 'netflix',
  'CBS (antenna)': 'antenna', 'FOX (antenna)': 'antenna', 'NBC (antenna)': 'antenna', 'ABC (antenna)': 'antenna', 'NFL Network (cable)': 'cable', 'YouTube (free)': 'free' };
const isIntl = () => (store.p.location.country || 'US') !== 'US';
function nationalWindow(g) {
  const tv = (g.tv || []).join(' ');
  const h = new Date(g.ts).getUTCHours();
  const dow = new Date(g.ts - 5 * 3600e3).getUTCDay();
  return g.t === 3 || /NBC|ESPN|ABC|Prime|Netflix|YouTube/.test(tv) || dow !== 0 || h >= 23 || h < 9 || !!g.ns;
}
function inMarket(g) { const m = store.p.location.market || []; return m.includes(g.h) || m.includes(g.a); }
/** options to watch/listen to a game for this fan: [{k, label, sub, ok, tier, act}] */
/** games NFL+ streams everywhere in the US, not just in their local markets (this prototype's game of the week) */
const PLUS_EVERYWHERE = new Set(['401872990']);
function watch(g, now = time.now()) {
  const sub = store.p.sub, prov = store.p.providers || [], st = state(g, now);
  const out = [];
  if (isIntl()) {
    const has = prov.includes('dazn');
    out.push({ k: 'dazn', label: 'NFL Game Pass on DAZN', sub: has ? 'Every game live & on demand' : 'Every game live — includes 1 free game a week', ok: has, tier: 'dazn' });
    return out;
  }
  const local = inMarket(g) || nationalWindow(g);
  if (st !== 'post') {
    if (local) out.push({ k: 'nflplus', label: 'Watch live on NFL+', sub: 'Your local & primetime games · phone & tablet', ok: sub !== 'free', tier: 'plus' });
    else if (PLUS_EVERYWHERE.has(g.id)) out.push({ k: 'nflplus', label: 'Watch live on NFL+', sub: 'NFL+ game of the week · streams everywhere', ok: sub !== 'free', tier: 'plus' });
    (g.tv || []).forEach(n => (NETWORK_STREAM[n] || [n]).forEach(s => {
      const pk = PROV_FOR[s];
      const ok = pk === 'free' || prov.includes(pk) || (pk === 'antenna' && local && prov.includes('antenna')) || ((pk === 'antenna' || pk === 'cable') && (prov.includes('cable') || prov.includes('yttv')) && local);
      if (pk === 'antenna' && !local) return;
      out.push({ k: s, label: s, sub: pk === 'antenna' ? 'Free over the air in your market' : `${n} broadcast`, ok, tier: 'tv' });
    }));
    if (!local && !nationalWindow(g)) out.push({ k: 'ticket', label: 'NFL Sunday Ticket', sub: 'Out-of-market Sunday games · YouTube', ok: prov.includes('ticket'), tier: 'tv' });
    if (!nationalWindow(g)) out.push({ k: 'redzone', label: 'NFL RedZone', sub: 'Every touchdown from every Sunday afternoon game', ok: sub === 'premium', tier: 'premium' });
    out.push({ k: 'audio', label: 'Listen live — home, away & national radio', sub: 'Every game, any device', ok: sub !== 'free', tier: 'plus' });
  } else {
    out.push({ k: 'condensed', label: 'Condensed replay (~45 min)', sub: 'Every snap, no huddles', ok: sub === 'premium', tier: 'premium' });
    out.push({ k: 'replay', label: 'Full game replay', sub: 'Broadcast feed', ok: sub === 'premium', tier: 'premium' });
    out.push({ k: 'all22', label: 'All-22 coaches film', sub: 'Every player, every snap', ok: sub === 'premium', tier: 'premium' });
    out.push({ k: 'highlights', label: 'Game highlights', sub: 'Free for everyone', ok: true, tier: 'free' });
  }
  const seen = new Set();
  return out.filter(o => !seen.has(o.label) && seen.add(o.label));
}
/** the provider key behind a watch option, and whether it's a streaming service you could sign into from the sheet */
const provFor = o => o.k === 'ticket' ? 'ticket' : PROV_FOR[o.label];
const connectable = o => !o.ok && o.tier === 'tv' && !['antenna', 'cable', 'free', undefined].includes(provFor(o));
function canWatchLive(g) { return watch(g).some(o => o.ok && (o.k === 'nflplus' || o.k === 'dazn' || o.tier === 'tv')); }

/* ------------------------------------------------------------------ locations */
const MARKETS = [
  ['Arizona (Phoenix)', 'America/Phoenix', ['ARI']], ['Atlanta', 'America/New_York', ['ATL']], ['Baltimore', 'America/New_York', ['BAL', 'WAS']], ['Buffalo', 'America/New_York', ['BUF']],
  ['Charlotte', 'America/New_York', ['CAR']], ['Chicago', 'America/Chicago', ['CHI']], ['Cincinnati', 'America/New_York', ['CIN']], ['Cleveland', 'America/New_York', ['CLE']],
  ['Dallas–Fort Worth', 'America/Chicago', ['DAL']], ['Denver', 'America/Denver', ['DEN']], ['Detroit', 'America/Detroit', ['DET']], ['Green Bay / Milwaukee', 'America/Chicago', ['GB']],
  ['Houston', 'America/Chicago', ['HOU']], ['Indianapolis', 'America/Indiana/Indianapolis', ['IND']], ['Jacksonville', 'America/New_York', ['JAX']], ['Kansas City', 'America/Chicago', ['KC']],
  ['Las Vegas', 'America/Los_Angeles', ['LV']], ['Los Angeles', 'America/Los_Angeles', ['LAR', 'LAC']], ['Miami', 'America/New_York', ['MIA']], ['Minneapolis', 'America/Chicago', ['MIN']],
  ['Boston', 'America/New_York', ['NE']], ['New Orleans', 'America/Chicago', ['NO']], ['New York', 'America/New_York', ['NYG', 'NYJ']], ['Philadelphia', 'America/New_York', ['PHI']],
  ['Pittsburgh', 'America/New_York', ['PIT']], ['San Francisco Bay Area', 'America/Los_Angeles', ['SF']], ['Seattle', 'America/Los_Angeles', ['SEA']], ['Tampa', 'America/New_York', ['TB']],
  ['Nashville', 'America/Chicago', ['TEN']], ['Washington, D.C.', 'America/New_York', ['WAS', 'BAL']], ['Salt Lake City', 'America/Denver', ['DEN']], ['Portland', 'America/Los_Angeles', ['SEA']],
  ['Austin / San Antonio', 'America/Chicago', ['DAL', 'HOU']], ['Orlando', 'America/New_York', ['TB', 'JAX']], ['Omaha', 'America/Chicago', ['KC']], ['Honolulu', 'Pacific/Honolulu', []],
];
const COUNTRIES = [
  ['US', 'United States', 'America/New_York', 'en'], ['CA', 'Canada', 'America/Toronto', 'en'], ['MX', 'México', 'America/Mexico_City', 'es'], ['GB', 'United Kingdom', 'Europe/London', 'en'],
  ['IE', 'Ireland', 'Europe/Dublin', 'en'], ['DE', 'Deutschland', 'Europe/Berlin', 'de'], ['AT', 'Österreich', 'Europe/Vienna', 'de'], ['ES', 'España', 'Europe/Madrid', 'es'],
  ['FR', 'France', 'Europe/Paris', 'fr'], ['BR', 'Brasil', 'America/Sao_Paulo', 'pt'], ['AU', 'Australia', 'Australia/Sydney', 'en'], ['JP', '日本', 'Asia/Tokyo', 'ja'],
];
function marketTeams(name) { const m = MARKETS.find(x => x[0] === name); return m ? m[2].map(a => D.teamByAbbr[a].id) : []; }

/* ------------------------------------------------------------------ misc helpers for screens */
const pos = p => p && (p.pos || '');
function headshot(pid) { return HS(pid); }
function teamGamesAsOf(tid, now = time.now()) { const s = seasonForStats(now); return teamGames(tid, s).filter(g => scheduleVisible(g, now)); }
function gamesOn(dayKey) { return D.games.filter(g => fmt.dayKey(g.ts) === dayKey); }
function h2h(a, b, before = time.now()) { return D.games.filter(g => ((g.h === a && g.a === b) || (g.h === b && g.a === a)) && state(g, before) === 'post').reverse(); }

App.data = {
  D, init, team, player, game, logo, opp, isHome, weekLabel, sbNumeral, state, live, score, spoiled, endTs, liveGames, liveCount, prepare, ensurePbp, ensureBox, box,
  currentWeek, lastPlayedWeek, week, scheduleVisible, season, seasonForStats, teamGames, result, record, nextGame, lastGame, liveGameFor, standings,
  lineObj, gameLog, sumLines, fantasy, seasonTotals, leaders, teamSeason, teamRank, passerRating, news, tx, injuries, injuryFor, roster, search,
  watch, canWatchLive, isIntl, provFor, connectable, powerRank, nationalWindow, inMarket, PROVIDERS, MARKETS, COUNTRIES, marketTeams, headshot, pos, teamGamesAsOf, gamesOn, h2h, flat,
  SCHEDULE_RELEASE, GAME_LEN,
};
})();
