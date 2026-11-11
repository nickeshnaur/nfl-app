/* ============================================================================
   NFL — live layer. At the real "now" (time machine on Right now, 1×, not paused)
   the bundled snapshot is topped up from ESPN's public feeds: the current
   scoreboard (kickoffs, states, finals) and each live or just-finished game's
   summary (play-by-play with wallclocks, box score). Polls every 20s while a game
   is live, otherwise every 5 minutes and whenever the app comes back into view.
   Any failure is silent: the bundled data stands. Past moments never touch this.
   ========================================================================== */
(function () {
'use strict';
const { time } = App;
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const FAST = 20e3, SLOW = 5 * 60e3;
const sums = {};          // gameId -> last summary signature, so a final game is fetched once
let timer = null, busy = false, anyLive = false;

const isReal = () => time.key === 'now' && time.speed === 1 && !time.paused && Math.abs(time.now() - Date.now()) < 120e3
  && !document.documentElement.classList.contains('in-frame');
const getJson = url => fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
const num = v => { const n = Number(v); return v === '' || v == null || isNaN(n) ? v : n; };

/** ESPN summary drives -> the app's pbp payload (same shape as _build/process.py writes) */
function pbpFrom(d, gid) {
  const drives = ((d.drives || {}).previous || []).concat((d.drives || {}).current ? [d.drives.current] : []);
  const seen = new Set();
  const wpmap = {}; (d.winprobability || []).forEach(x => { wpmap[x.playId] = Math.round(x.homeWinPercentage * 100); });
  const dr = drives.filter(x => x && !seen.has(x.id) && seen.add(x.id)).map(x => {
    const tid = (x.team || {}).id;
    const p = (x.plays || []).map(p => {
      const st = p.start || {}, en = p.end || {};
      const row = { x: p.text, ty: (p.type || {}).text || '', q: (p.period || {}).number, c: (p.clock || {}).displayValue,
        dn: st.down, ds: st.distance, yz: st.yardsToEndzone, ez: en.yardsToEndzone, dd: st.downDistanceText || st.shortDownDistanceText,
        y: p.statYardage, hs: p.homeScore, as: p.awayScore };
      if (p.wallclock) row.wc = p.wallclock;
      if (p.scoringPlay) row.sc = 1;
      if (p.isTurnover) row.to = 1;
      if (p.isPenalty) row.pen = 1;
      if (wpmap[p.id] != null) row.wp = wpmap[p.id];
      const pt = (st.team || {}).id || tid; if (pt && pt !== tid) row.pt = pt;
      Object.keys(row).forEach(k => row[k] == null && delete row[k]);
      return row;
    });
    return { t: tid, r: x.displayResult || x.result, s: x.description, y: x.yards, sc: x.isScore ? 1 : 0, p, st: (x.start || {}).text, q: ((x.start || {}).period || {}).number };
  });
  return dr.length ? { g: gid, dr } : null;
}

/** ESPN summary -> the app's box score entry (team stats, player lines, linescores, scoring plays, leaders, win prob) */
const TEXT_STATS = ['completionAttempts', 'sacksYardsLost', 'totalPenaltiesYards', 'thirdDownEff', 'fourthDownEff', 'redZoneAttempts', 'possessionTime', 'totalYards'];
function boxFrom(d) {
  const bx = { tm: {}, pl: {} };
  ((d.boxscore || {}).teams || []).forEach(t => { const s = {};
    (t.statistics || []).forEach(x => { const v = x.value; s[x.name] = v == null || v === '-' || typeof v === 'string' ? x.displayValue : num(v); if (TEXT_STATS.includes(x.name)) s[x.name] = x.displayValue; });
    bx.tm[t.team.id] = s; });
  ((d.boxscore || {}).players || []).forEach(t => (t.statistics || []).forEach(cat => {
    const rows = bx.pl[cat.name] = bx.pl[cat.name] || [];
    (cat.athletes || []).forEach(a => rows.push([a.athlete.id, t.team.id, a.athlete.displayName].concat((a.stats || []).map(num))));
  }));
  const hdr = ((d.header || {}).competitions || [{}])[0]; bx.ls = {};
  (hdr.competitors || []).forEach(c => { bx.ls[c.team.id] = (c.linescores || []).map(x => num(x.displayValue)); });
  bx.sp = (d.scoringPlays || []).map(p => ({ q: p.period.number, c: p.clock.displayValue, t: (p.team || {}).id, x: p.text, ty: (p.type || {}).abbreviation || (p.type || {}).text, hs: p.homeScore, as: p.awayScore }));
  bx.ld = []; (d.leaders || []).forEach(t => (t.leaders || []).forEach(cat => { const top = (cat.leaders || [])[0]; if (top) bx.ld.push([t.team.id, cat.name, top.athlete.id, top.athlete.displayName, top.displayValue]); }));
  let wp = (d.winprobability || []).map(x => Math.round(x.homeWinPercentage * 100));
  if (wp.length > 60) { const step = wp.length / 60; wp = Array.from({ length: 60 }, (_, i) => wp[Math.floor(i * step)]).concat(wp[wp.length - 1]); }
  bx.wp = wp; bx.pbp = 1; bx.live = 1;
  const art = d.article || {}; if (art.headline) { bx.rh = art.headline; bx.rd = art.description; }
  return bx;
}

async function summary(g) {
  const d = await getJson(`${SITE}/summary?event=${g.id}`);
  const D = App.data.D, pbp = pbpFrom(d, g.id);
  if (pbp) { D.live[g.id] = pbp; App.data.flat(pbp); }
  (D.liveBox = D.liveBox || {})[g.id] = boxFrom(d);
}

/** ESPN news (league + the fan's teams) merged into the bundled list, same shape as _build/process.py writes */
let newsAt = 0;
const artFrom = a => ({ id: String(a.id), h: a.headline, d: a.description, ty: a.type, pub: a.published,
  img: ((a.images || []).find(i => i.url) || {}).url || null,
  tm: [...new Set((a.categories || []).filter(c => c.type === 'team' && c.teamId).map(c => String(c.teamId)))].sort(),
  ath: [...new Set((a.categories || []).filter(c => c.type === 'athlete' && c.athleteId).map(c => String(c.athleteId)))].sort(),
  fan: /antasy/.test(a.headline || '') ? 1 : 0 });
async function liveNews() {
  if (Date.now() - newsAt < 4 * 60e3) return false;
  newsAt = Date.now();
  const p = App.store.p, teams = [...new Set([p.primary].concat(p.teams || []).filter(Boolean))].slice(0, 6);
  const feeds = await Promise.all([`${SITE}/news?limit=50`].concat(teams.map(t => `${SITE}/news?limit=30&team=${t}`)).map(u => getJson(u).catch(() => null)));
  const list = App.data.D.core.news, have = new Map(list.map(a => [a.id, a])); let added = 0;
  feeds.forEach(f => ((f && f.articles) || []).forEach(a => { if (!a.id || !a.published) return; const x = artFrom(a); if (!have.has(x.id)) { have.set(x.id, x); list.push(x); added++; } }));
  if (added) list.sort((a, b) => (b.pub || '').localeCompare(a.pub || ''));
  return added > 0;
}

async function refresh() {
  if (busy || !isReal() || !App.data || !App.data.D) return schedule();
  busy = true; let changed = false;
  try {
    const sb = await getJson(`${SITE}/scoreboard`);
    const D = App.data.D, need = [];
    anyLive = false;
    (sb.events || []).forEach(e => {
      const g = D.gameById[e.id]; if (!g) return;
      const c = e.competitions[0], comp = {}; c.competitors.forEach(x => { comp[x.homeAway] = x; });
      const st = e.status.type.state, ts = Date.parse(e.date);
      if (ts && ts !== g.ts) { g.d = e.date; g.ts = ts; changed = true; }
      if (st === 'in') anyLive = true;
      if (st === 'post' && (g.st !== 'post' || g.lv) || st === 'in') {
        const was = g.st + g.hs + '-' + g.as;
        g.st = 'post';   // 'post' + pbp wallclocks = rebuilt at the real instant, like any past game; g.lv holds it live until the final
        if (st === 'in') g.lv = { q: (c.status || {}).period, c: (c.status || {}).displayClock, dd: (c.situation || {}).downDistanceText, poss: (c.situation || {}).possession }; else delete g.lv;
        g.hs = +comp.home.score || 0; g.as = +comp.away.score || 0;
        if ((c.status || {}).period > 4 || /OT/.test(e.status.type.detail || '')) g.ot = 1;
        if (was !== g.st + g.hs + '-' + g.as) changed = true;
        // a game finished after the snapshot: fetch its summary once; a live one on every pass
        const sig = st + g.hs + '-' + g.as + ((c.situation || {}).lastPlay || {}).id;
        if (st === 'in' || sums[g.id] !== sig) { sums[g.id] = sig; need.push(g); }
      }
    });
    await Promise.all(need.map(g => summary(g).then(() => { changed = true; }).catch(() => {})));
    if (await liveNews().catch(() => false)) changed = true;
    App.data.D.liveAt = Date.now();
  } catch (e) { /* offline or the feed moved: the bundled data stands */ }
  busy = false;
  if (changed && isReal()) { App.refreshAll(); App.emit('live-ready'); }
  schedule();
}
function schedule() { clearTimeout(timer); timer = setTimeout(refresh, anyLive ? FAST : SLOW); }

App.liveFeed = { refresh, isReal, pbpFrom, boxFrom };
App.on('time', () => { if (isReal()) refresh(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
window.addEventListener('focus', () => refresh());
App.on('boot', () => refresh());
})();
