/* ============================================================================
   Player pages + shared stat helpers (App.PS) used by stats.js / compare.
   Routes: player/:id (?tab=)
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, fmt, store, time, NFL } = App;
const UI = App.UI, Dt = App.data;

/* ------------------------------------------------------------------ stat catalogue */
// v(L) reads a value from a season-totals entry; q = qualifier for rate stats (per team game)
const STATS = [
  { k: 'passYds', l: 'Passing yards', s: 'Pass YDS', cat: 'passing', f: 'passingYards' },
  { k: 'passTD', l: 'Passing TDs', s: 'Pass TD', cat: 'passing', f: 'passingTouchdowns' },
  { k: 'rating', l: 'Passer rating', s: 'RTG', cat: 'passing', f: 'rating', d: 1, q: L => att(L) >= 14 * L._tg, term: 'Passer rating' },
  { k: 'cmpPct', l: 'Completion %', s: 'CMP%', cat: 'passing', f: 'cmpPct', d: 1, q: L => att(L) >= 14 * L._tg },
  { k: 'ypa', l: 'Yards per attempt', s: 'Y/A', cat: 'passing', f: 'ypa', d: 1, q: L => att(L) >= 14 * L._tg },
  { k: 'int', l: 'Interceptions thrown', s: 'INT', cat: 'passing', f: 'interceptions' },
  { k: 'sacked', l: 'Times sacked', s: 'SCK', cat: 'passing', f: 'sacks' },
  { k: 'rushYds', l: 'Rushing yards', s: 'Rush YDS', cat: 'rushing', f: 'rushingYards' },
  { k: 'rushTD', l: 'Rushing TDs', s: 'Rush TD', cat: 'rushing', f: 'rushingTouchdowns' },
  { k: 'ypc', l: 'Yards per carry', s: 'Y/C', cat: 'rushing', f: 'ypc', d: 1, q: L => (L.cats.rushing?.rushingAttempts || 0) >= 6.25 * L._tg },
  { k: 'carries', l: 'Carries', s: 'CAR', cat: 'rushing', f: 'rushingAttempts' },
  { k: 'rec', l: 'Receptions', s: 'REC', cat: 'receiving', f: 'receptions' },
  { k: 'recYds', l: 'Receiving yards', s: 'Rec YDS', cat: 'receiving', f: 'receivingYards' },
  { k: 'recTD', l: 'Receiving TDs', s: 'Rec TD', cat: 'receiving', f: 'receivingTouchdowns' },
  { k: 'tgt', l: 'Targets', s: 'TGT', cat: 'receiving', f: 'receivingTargets' },
  { k: 'ypr', l: 'Yards per catch', s: 'Y/R', cat: 'receiving', f: 'ypr', d: 1, q: L => (L.cats.receiving?.receptions || 0) >= 1.875 * L._tg },
  { k: 'catchPct', l: 'Catch rate', s: 'CTCH%', cat: 'receiving', f: 'catchPct', d: 1, q: L => (L.cats.receiving?.receivingTargets || 0) >= 2.5 * L._tg },
  { k: 'scrYds', l: 'Scrimmage yards', s: 'SCRM', cat: 'rushing|receiving', f: 'scrYds' },
  { k: 'tds', l: 'Total TDs', s: 'TD', cat: 'rushing|receiving', f: 'tds' },
  { k: 'tackles', l: 'Tackles', s: 'TCKL', cat: 'defensive', f: 'totalTackles' },
  { k: 'sacks', l: 'Sacks', s: 'SACK', cat: 'defensive', f: 'sacks', d: 1 },
  { k: 'tfl', l: 'Tackles for loss', s: 'TFL', cat: 'defensive', f: 'tacklesForLoss' },
  { k: 'qbh', l: 'QB hits', s: 'QBH', cat: 'defensive', f: 'QBHits' },
  { k: 'pd', l: 'Passes defended', s: 'PD', cat: 'defensive', f: 'passesDefended' },
  { k: 'defInt', l: 'Interceptions', s: 'INT', cat: 'interceptions', f: 'interceptions' },
  { k: 'fgm', l: 'Field goals made', s: 'FGM', cat: 'kicking', f: 'fieldGoalsMade' },
  { k: 'fgPct', l: 'Field goal %', s: 'FG%', cat: 'kicking', f: 'fgPct', d: 1, q: L => (L.cats.kicking?.fieldGoalAttempts || 0) >= 0.9 * L._tg },
  { k: 'fgLong', l: 'Longest field goal', s: 'LNG', cat: 'kicking', f: 'longFieldGoalMade' },
  { k: 'kPts', l: 'Kicking points', s: 'PTS', cat: 'kicking', f: 'totalKickingPoints' },
  { k: 'puntAvg', l: 'Punting average', s: 'AVG', cat: 'punting', f: 'puntAvg', d: 1, q: L => (L.cats.punting?.punts || 0) >= 2 * L._tg },
  { k: 'in20', l: 'Punts inside 20', s: 'IN20', cat: 'punting', f: 'puntsInside20' },
];
const STAT = Object.fromEntries(STATS.map(s => [s.k, s]));
const att = L => L.cats.passing?.passingAttempts || 0;
function sval(L, st) {
  if (st.f === 'scrYds') return (L.cats.rushing?.rushingYards || 0) + (L.cats.receiving?.receivingYards || 0);
  if (st.f === 'tds') return (L.cats.rushing?.rushingTouchdowns || 0) + (L.cats.receiving?.receivingTouchdowns || 0);
  const c = L.cats[st.cat]; return c ? (c[st.f] || 0) : 0;
}
const fmtStat = (v, st) => st.d ? fmt.n(v, st.d) : fmt.n(v);

/* ------------------------------------------------------------------ position groups */
const GROUP = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', PK: 'K', K: 'K', P: 'P', DE: 'DL', DT: 'DL', NT: 'DL', LB: 'LB', OLB: 'LB', ILB: 'LB', CB: 'DB', S: 'DB', DB: 'DB', FS: 'DB', SS: 'DB', OT: 'OL', G: 'OL', C: 'OL', OL: 'OL', LS: 'LS' };
const GROUP_NAME = { QB: 'QBs', RB: 'RBs', WR: 'WRs', TE: 'TEs', K: 'kickers', P: 'punters', DL: 'D-linemen', LB: 'linebackers', DB: 'DBs', OL: 'O-linemen', LS: 'long snappers' };
const PRIMARY = { QB: 'passing', RB: 'rushing', WR: 'receiving', TE: 'receiving', K: 'kicking', P: 'punting', DL: 'defensive', LB: 'defensive', DB: 'defensive' };
/** headline stats per group (first is the trend stat) */
const KEY_STATS = {
  QB: ['passYds', 'passTD', 'int', 'rating'], RB: ['rushYds', 'rushTD', 'ypc', 'rec'], WR: ['recYds', 'rec', 'recTD', 'ypr'], TE: ['recYds', 'rec', 'recTD', 'ypr'],
  K: ['fgm', 'fgPct', 'fgLong', 'kPts'], P: ['puntAvg', 'in20'], DL: ['sacks', 'tackles', 'tfl', 'qbh'], LB: ['tackles', 'sacks', 'tfl', 'pd'], DB: ['tackles', 'defInt', 'pd', 'sacks'],
};
function groupOf(pid, L) {
  const p = Dt.player(pid);
  if (p && GROUP[p.pos]) return GROUP[p.pos];
  if (!L) return 'OL';
  const c = L.cats;
  if ((c.passing?.passingAttempts || 0) >= 10) return 'QB';
  if (c.kicking) return 'K'; if (c.punting) return 'P';
  if ((c.rushing?.rushingAttempts || 0) > (c.receiving?.receptions || 0) * 1.5) return 'RB';
  if (c.receiving) return 'WR';
  if (c.defensive) return 'LB';
  return 'OL';
}

/* ------------------------------------------------------------------ season totals (full key set) */
const NOSUM = /^(yardsPer|fieldGoalPct|grossAvg|adjQBR|QBRating|long)/;
const totCache = {};
/** every player's regular-season (or post) totals as of now; adds derived rates + fpts + _tg (team games) */
function totals(s, now = time.now(), post = false) {
  const bx = NFL.d['box-' + s]; if (!bx) return null;
  const key = s + ':' + Math.floor(now / 60000) + (post ? 'p' : '');
  if (totCache[key]) return totCache[key];
  const lines = {}, teamG = {};
  Dt.D.games.forEach(g => {
    if (g.s !== s || g.t !== (post ? 3 : 2) || Dt.state(g, now) !== 'post') return;
    const b = bx[g.id]; if (!b) return;
    teamG[g.h] = (teamG[g.h] || 0) + 1; teamG[g.a] = (teamG[g.a] || 0) + 1;
    const seen = {};
    for (const cat in b.pl) for (const row of b.pl[cat]) {
      const pid = row[0];
      const L = lines[pid] = lines[pid] || { pid, n: row[2], tid: row[1], gp: 0, cats: {}, games: [] };
      if (!seen[pid]) { seen[pid] = 1; L.gp++; L.tid = row[1]; L.games.push(g.id); }
      const o = Dt.lineObj(cat, row), t = L.cats[cat] = L.cats[cat] || {};
      for (const k in o) {
        if (k === 'pid' || k === 'tid' || k === 'n') continue;
        if (/^long/.test(k)) t[k] = Math.max(t[k] || 0, o[k]);
        else if (!NOSUM.test(k)) t[k] = (t[k] || 0) + (+o[k] || 0);
      }
    }
  });
  const maxTg = Math.max(1, ...Object.values(teamG));
  Object.values(lines).forEach(L => {
    derive(L.cats); L.fpts = Dt.fantasy(L.cats); L._tg = teamG[L.tid] || maxTg; L.grp = groupOf(L.pid, L);
  });
  return totCache[key] = lines;
}
function derive(c) {
  const p = c.passing; if (p) { p.cmpPct = p.passingAttempts ? p.completions / p.passingAttempts * 100 : 0; p.ypa = p.passingAttempts ? p.passingYards / p.passingAttempts : 0; p.rating = Dt.passerRating(p); }
  const r = c.rushing; if (r) r.ypc = r.rushingAttempts ? r.rushingYards / r.rushingAttempts : 0;
  const rc = c.receiving; if (rc) { rc.ypr = rc.receptions ? rc.receivingYards / rc.receptions : 0; rc.catchPct = rc.receivingTargets ? rc.receptions / rc.receivingTargets * 100 : 0; }
  const k = c.kicking; if (k) k.fgPct = k.fieldGoalAttempts ? k.fieldGoalsMade / k.fieldGoalAttempts * 100 : 0;
  const pu = c.punting; if (pu) pu.puntAvg = pu.punts ? pu.puntYards / pu.punts : 0;
}
/** ranked list for a stat (qualified only for rate stats). lower = INT etc. sorted ascending? we keep "most" semantics */
function ranked(s, statKey, opts = {}) {
  const T = totals(s, opts.now, opts.post); if (!T) return [];
  const st = STAT[statKey];
  return Object.values(T).filter(L => (!st.q || st.q(L)) && sval(L, st) > 0 && (!opts.grp || L.grp === opts.grp) && (!opts.filter || opts.filter(L)))
    .map(L => ({ L, v: sval(L, st) })).sort((a, b) => opts.asc ? a.v - b.v : b.v - a.v);
}
function rankOf(pid, s, statKey, grp) {
  const list = ranked(s, statKey, { grp });
  const i = list.findIndex(x => x.L.pid === pid);
  return i < 0 ? null : { r: i + 1, of: list.length };
}
function fantasyRank(pid, s, grp) {
  const T = totals(s); if (!T) return null;
  const list = Object.values(T).filter(L => L.grp === grp && L.fpts > 0).sort((a, b) => b.fpts - a.fpts);
  const i = list.findIndex(L => L.pid === pid); return i < 0 ? null : i + 1;
}
/** seasons that have started by now */
function seasonsSoFar() { const now = time.now(); return [2026, 2025, 2024, 2023, 2022].filter(s => { const w = Dt.week(s, 2, 1); return w && w.start <= now; }); }

/* ------------------------------------------------------------------ simple expected points (mirrors _build/process.py) */
function ep(dn, ds, yz) {
  if (yz == null || !dn) return null;
  const y = Math.max(1, Math.min(99, yz));
  let adj = { 1: 0, 2: -.35, 3: -.85, 4: -1.5 }[dn] || 0;
  adj -= .04 * Math.max(0, (ds || 10) - 10);
  if (dn >= 2) adj += .03 * Math.max(0, 10 - (ds || 10));
  return 6.3 - .0755 * y + adj;
}
/** EPA + success for a play given the next play (from Dt.flat) */
function playEPA(p, nx) {
  const e0 = ep(p.dn, p.ds, p.yz); if (e0 == null) return null;
  let e1;
  if (p.sc && /Touchdown/.test(p.ty) && !/Interception|Fumble/.test(p.ty)) e1 = 7;
  else if (p.to) e1 = p.ez != null ? -ep(1, 10, 100 - p.ez) : -1.5;
  else if (nx && nx.di === p.di && nx.dn) e1 = ep(nx.dn, nx.ds, nx.yz);
  else if (p.ez != null) e1 = -ep(1, 10, 100 - p.ez);
  if (e1 == null) return null;
  const y = p.y || 0, ds = p.ds || 10;
  const succ = (p.dn === 1 && y >= .4 * ds) || (p.dn === 2 && y >= .6 * ds) || (p.dn >= 3 && y >= ds);
  return { epa: e1 - e0, succ };
}
function shortName(p) {
  const ln = (p.ln || p.n.split(' ').slice(1).join(' ')).replace(/\s+(Jr\.?|Sr\.?|II|III|IV|V)$/, '');
  return (p.fn || p.n)[0] + '.' + ln;
}
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** advanced profile computed from play-by-play text for one player-season (2025/2026 only) */
async function advanced(pid, s) {
  const p = Dt.player(pid); if (!p) return null;
  const log = Dt.gameLog(pid, s) || [];
  const games = log.map(l => l.g).filter(g => g.s >= 2025);
  if (!games.length) return { games: 0 };
  await Promise.all(games.map(g => Dt.ensurePbp(g.id).catch(() => null)));
  const ab = shortName(p), re = new RegExp('\\b' + reEsc(ab) + '\\b');
  const grp = groupOf(pid);
  const A = { games: games.length, grp, n: 0, epa: 0, succ: 0, plays: [] };
  const add = (k, v = 1) => A[k] = (A[k] || 0) + v;
  for (const g of games) {
    const pbp = Dt.D.live[g.id]; if (!pbp) continue;
    const plays = Dt.flat(pbp);
    plays.forEach((pl, i) => {
      if (!pl.x || pl.pen && !/Pass|Rush|Sack/.test(pl.ty)) return;
      const txt = pl.x.replace(/\([^)]*\)/g, ' ');           // drop formation + tackler parens
      const tacklers = (pl.x.match(/\(([^)]*)\)/g) || []).join(' ');
      const isPass = /Pass|Sack|Interception/.test(pl.ty) && !/Fumble Recovery/.test(pl.ty);
      const isRush = /^Rush|Rushing Touchdown/.test(pl.ty);
      const R = () => playEPA(pl, plays[i + 1]);
      if (grp === 'QB') {
        if (isPass && (new RegExp(reEsc(ab) + ' (pass|sacked)')).test(txt)) {
          const r = R(); add('db');
          if (pl.ty === 'Sack' || /sacked/.test(txt)) add('sk');
          if (/deep/.test(txt)) { add('deep'); if (/Reception|Touchdown/.test(pl.ty)) add('deepC'); }
          if (/ short /.test(txt)) { add('short'); if (/Reception|Touchdown/.test(pl.ty)) add('shortC'); }
          if (pl.dn === 3) { add('third'); if ((pl.y || 0) >= (pl.ds || 99)) add('thirdC'); }
          if (pl.yz <= 20) { add('rz'); if (pl.sc) add('rzTD'); }
          if (/left/.test(txt.split(' to ')[0])) add('dirL'); else if (/right/.test(txt.split(' to ')[0])) add('dirR'); else if (/middle/.test(txt.split(' to ')[0])) add('dirM');
          if (r) { A.n++; A.epa += r.epa; if (r.succ) A.succ++; }
        } else if (isRush && re.test(txt)) { add('scr'); add('scrY', pl.y || 0); }
      } else if (grp === 'RB' || ((grp === 'WR' || grp === 'TE') && isRush && re.test(txt))) {
        if (isRush && re.test(txt) && !/ pass /.test(txt)) {
          const r = R(); add('car'); add('carY', pl.y || 0);
          if ((pl.y || 0) >= 10) add('expl'); if ((pl.y || 0) <= 0) add('stuff');
          if (/left (end|tackle|guard)/.test(txt)) add('dirL'); else if (/right (end|tackle|guard)/.test(txt)) add('dirR'); else if (/middle/.test(txt)) add('dirM');
          if (pl.yz <= 20) add('rz');
          if (r) { A.n++; A.epa += r.epa; if (r.succ) A.succ++; }
        }
      }
      if ((grp === 'WR' || grp === 'TE' || grp === 'RB') && isPass && new RegExp('(to|for) ' + reEsc(ab) + '\\b').test(txt)) {
        const r = playEPA(pl, plays[i + 1]); add('tgt');
        const caught = /Reception|Passing Touchdown/.test(pl.ty) && !/incomplete/.test(txt);
        if (caught) { add('catch'); add('recY', pl.y || 0); }
        if (/deep/.test(txt)) { add('deep'); if (caught) add('deepC'); }
        if (pl.dn === 3) { add('third'); if (caught && (pl.y || 0) >= (pl.ds || 99)) add('thirdC'); }
        if (pl.yz <= 20) add('rz');
        if (r) { A.tN = (A.tN || 0) + 1; A.tEpa = (A.tEpa || 0) + r.epa; if (r.succ) A.tSucc = (A.tSucc || 0) + 1; }
      }
      if (grp === 'DL' || grp === 'LB' || grp === 'DB') {
        if (re.test(tacklers)) { add('tk'); if (isRush && (pl.y || 0) <= 2) add('stop'); if (isPass) add('tkPass'); if (isRush) add('tkRun'); }
        if (pl.ty === 'Sack' && re.test(tacklers + ' ' + txt)) add('sk');
        if (new RegExp('INTERCEPTED by ' + reEsc(ab)).test(pl.x)) add('int');
        if (new RegExp('\\[' + reEsc(ab)).test(pl.x)) add('pres');
        if (new RegExp('FUMBLES.*forced by ' + reEsc(ab)).test(pl.x)) add('ff');
      }
      if (grp === 'K' && re.test(pl.x)) {
        const m = pl.x.match(/(\d+) yard field goal is (GOOD|No Good|BLOCKED)/i);
        if (m) { const d = +m[1], b = d < 30 ? '<30' : d < 40 ? '30–39' : d < 50 ? '40–49' : '50+'; A.fg = A.fg || {}; const x = A.fg[b] = A.fg[b] || [0, 0]; x[1]++; if (/GOOD/i.test(m[2])) x[0]++; }
      }
      if (grp === 'P' && re.test(pl.x)) { const m = pl.x.match(/punts (\d+) yards/); if (m) { add('punts'); add('puntY', +m[1]); if (pl.ez != null && /fair catch|downed|out of bounds/i.test(pl.x)) add('fc'); } }
    });
  }
  return A;
}

/* ------------------------------------------------------------------ position explainers for new fans */
const POS_TIP = {
  QB: 'The quarterback runs the offense: he gets the ball on every snap and throws, hands off or runs.',
  RB: 'Running backs carry the ball on run plays, catch short passes and help protect the quarterback.',
  WR: 'Wide receivers line up near the sideline and run routes to catch passes downfield.',
  TE: 'Tight ends are hybrids: they block like linemen and catch passes like receivers.',
  OL: 'Offensive linemen block — they protect the quarterback and open lanes for runners. They rarely touch the ball, so their stats don\'t show up in the box score.',
  DL: 'Defensive linemen battle the offensive line to stop the run and pressure the quarterback.',
  LB: 'Linebackers play behind the defensive line: they tackle runners, cover receivers and blitz.',
  DB: 'Defensive backs (cornerbacks and safeties) cover receivers and are the last line of defense.',
  K: 'The kicker handles field goals, extra points and kickoffs.', P: 'The punter kicks the ball away on 4th down to pin the other team deep.',
  LS: 'The long snapper fires the ball back on punts, field goals and extra points.',
};

/* ------------------------------------------------------------------ page helpers */
function seasonLabel(s) { const now = time.now(); const last = Dt.D.weeks.filter(w => w.s === s && w.t === 2).pop(); return last && last.end + Dt.GAME_LEN < now ? `${s} season` : `${s} season so far`; }
function oppLabel(g, tid) { const o = Dt.team(Dt.opp(g, tid)); return html`<span class="pl-opp">${Dt.isHome(g, tid) ? 'vs' : '@'} ${UI.logo(o.id, 'sm')}${o.abbr}</span>`; }
function wkShort(g) { return g.t === 3 ? Dt.weekLabel(3, g.w, true).replace('Conf. Champ.', 'CC').replace('Super Bowl', 'SB').replace('Wild Card', 'WC').replace('Divisional', 'DIV') : String(g.w); }
/** stat columns for a category in the game log */
const LOG_COLS = {
  passing: [['C/A', c => `${c.completions}/${c.passingAttempts}`], ['YDS', c => c.passingYards], ['TD', c => c.passingTouchdowns], ['INT', c => c.interceptions], ['SCK', c => c.sacks], ['RTG', c => fmt.n(Dt.passerRating(c), 1)]],
  rushing: [['CAR', c => c.rushingAttempts], ['YDS', c => c.rushingYards], ['AVG', c => fmt.n(c.rushingAttempts ? c.rushingYards / c.rushingAttempts : 0, 1)], ['TD', c => c.rushingTouchdowns], ['LNG', c => c.longRushing]],
  receiving: [['TGT', c => c.receivingTargets], ['REC', c => c.receptions], ['YDS', c => c.receivingYards], ['AVG', c => fmt.n(c.receptions ? c.receivingYards / c.receptions : 0, 1)], ['TD', c => c.receivingTouchdowns], ['LNG', c => c.longReception]],
  defensive: [['TOT', c => c.totalTackles], ['SOLO', c => c.soloTackles], ['SACK', c => c.sacks], ['TFL', c => c.tacklesForLoss], ['PD', c => c.passesDefended], ['QBH', c => c.QBHits]],
  kicking: [['FG', c => `${c.fieldGoalsMade}/${c.fieldGoalAttempts}`], ['LNG', c => c.longFieldGoalMade], ['XP', c => `${c.extraPointsMade}/${c.extraPointAttempts}`], ['PTS', c => c.totalKickingPoints]],
  punting: [['NO', c => c.punts], ['YDS', c => c.puntYards], ['AVG', c => fmt.n(c.punts ? c.puntYards / c.punts : 0, 1)], ['IN20', c => c.puntsInside20], ['LNG', c => c.longPunt]],
};
const CAT_NAME = { passing: 'Passing', rushing: 'Rushing', receiving: 'Receiving', defensive: 'Defense', interceptions: 'Interceptions', kicking: 'Kicking', punting: 'Punting', fumbles: 'Fumbles', kickReturns: 'Kick returns', puntReturns: 'Punt returns', scoring: 'Scoring' };
/** categories a player has data in, ordered with their primary first */
function catsFor(grp, cats) {
  const order = ['passing', 'rushing', 'receiving', 'defensive', 'kicking', 'punting'];
  const prim = PRIMARY[grp];
  return order.filter(c => cats.includes(c)).sort((a, b) => (b === prim) - (a === prim));
}

/* ------------------------------------------------------------------ route */
App.route('player/:id', (params, query, page) => {
  const pid = params.id, p = Dt.player(pid);
  const st = page.state = page.state || { tab: query.tab || 'overview', logS: null, careerCat: null, splitCat: 0, advS: null };
  const now = time.now(), s = Dt.seasonForStats(now);
  const need = [Dt.ensureBox(s), App.load('careers')];
  if (st.tab === 'gamelog' && st.logS) need.push(Dt.ensureBox(st.logS));
  if (st.tab === 'splits') need.push(App.load('splits'));
  if (st.tab === 'compare') need.push(Dt.ensureBox(s));
  const missing = [NFL.d['box-' + s], NFL.d.careers, st.tab !== 'gamelog' || !st.logS || NFL.d['box-' + st.logS], st.tab !== 'splits' || NFL.d.splits].some(x => !x);
  if (missing) return Promise.all(need).then(() => build(pid, p, page, s));
  return build(pid, p, page, s);
});

function build(pid, p, page, s) {
  const st = page.state;
  // no snaps yet this season (injured, rookie, early weeks) → fall back to last season's line on Overview
  if (st.tab === 'overview' && p && !(totals(s) || {})[pid] && s > 2022 && (NFL.d.careers[pid] || {})) {
    const prev = s - 1;
    if (!NFL.d['box-' + prev]) return Dt.ensureBox(prev).then(() => build(pid, p, page, s));
    if ((totals(prev) || {})[pid]) page.state.fallbackS = prev;
  }
  if (!p) {
    // historical players (not on a current roster) — use box name
    const T = totals(s) || {}; const L = T[pid];
    return { title: L ? L.n : 'Player', html: UI.empty('user', L ? L.n : 'Player not found', 'This player isn\'t on a current NFL roster, so we only have box-score lines for him.') };
  }
  const tm = Dt.team(p.t);
  const T = totals(s) || {}; const L0 = T[pid];
  const ovS = st.tab === 'overview' && !L0 && st.fallbackS ? st.fallbackS : s;
  const L = L0 || (ovS !== s ? (totals(ovS) || {})[pid] : null);
  const grp = groupOf(pid, L);
  const career = NFL.d.careers[pid] || {};
  const deep = UI.depth();
  const tabsList = [
    { k: 'overview', l: 'Overview' }, { k: 'gamelog', l: 'Game log' }, { k: 'career', l: 'Career' },
    deep >= 2 && { k: 'splits', l: 'Splits' }, deep >= 2 && grp !== 'OL' && grp !== 'LS' && { k: 'advanced', l: 'Advanced' },
    { k: 'contract', l: 'Contract' }, { k: 'video', l: 'Video' },
  ].filter(Boolean);
  if (!tabsList.find(t => t.k === st.tab)) st.tab = 'overview';
  const body = { overview, gamelog, career: careerTab, splits, advanced: advancedTab, contract, video }[st.tab](pid, p, tm, grp, st.tab === 'overview' ? ovS : s, L, career, page, s);
  return {
    title: p.n, className: 'pl-page',
    right: html`<button class="icon-btn" data-act="pl-share" data-arg="${pid}" aria-label="Share">${icon('share')}</button>`,
    html: html`${hero(pid, p, tm, grp, L, s)}
      <div class="pl-tabs sticky-sub">${UI.tabs(tabsList, st.tab, 'pl-tab')}</div>
      <div class="pl-body">${body}</div>`,
    mount: st.tab === 'advanced' ? (el, pg) => mountAdvanced(el, pg, pid, grp) : null,
  };
}

function hero(pid, p, tm, grp, L, s) {
  const inj = Dt.injuryFor(pid) || (p.inj && Math.abs(time.now() - Date.parse(Dt.D.core.built)) < 12 * 864e5 ? { s: p.inj.s } : null);
  const exp = p.exp === 0 ? 'Rookie' : p.exp != null ? fmt.plural(p.exp + 1, 'season').replace(/^(\d+) seasons?/, (m, n) => fmt.ord(+n) + ' season') : '';
  const alertsOn = (store.p.playerAlerts || {})[pid];
  // jersey fabric (apply-player-fabric A) and the outline jersey number behind the headshot (apply-player-num A), approved 2026-11-08
  // approved round 6 (player-hero B): a band on team colour for the name and headshot; a white card overlaps it with the bio and the buttons
  return html`<div class="hero pl-hero ph-band" style="${raw(App.teamVars(tm))}">
    ${raw(App.fabric('1.5,.1,150,.5,50,0', App.heroCol ? App.heroCol(tm.color) : tm.color, tm.alt))}
    ${p.j ? html`<svg class="ph-num" viewBox="0 0 300 260" aria-hidden="true"><text x="0" y="240">${p.j}</text></svg>` : ''}
    <div class="pl-hero-in">
      <div class="pl-hero-txt">
        <div class="pl-meta"><span>#${p.j || '–'}</span><span>·</span><span>${p.pos}</span><span>·</span><a data-go="#/team/${tm.id}" class="pl-tm">${tm.name}</a></div>
        <div class="pl-fn">${p.fn || ''}</div>
        <div class="pl-ln" style="font-size:${Math.min(48, Math.floor(165 / Math.max(4, (p.ln || p.n).length) / .56))}px">${p.ln || p.n}</div>
        ${inj ? html`<span class="badge loss pl-inj">${inj.s}${inj.ty ? ' · ' + inj.ty : ''}</span>` : ''}
      </div>
      <div class="pl-shot"><div class="pl-ini">${(p.fn || '')[0] || ''}${(p.ln || '')[0] || ''}</div><img src="${Dt.headshot(pid)}" alt="" onload="this.previousElementSibling&&this.previousElementSibling.remove()" onerror="this.remove()"></div>
    </div>
  </div>
  <div class="ph-card">
    <div class="pl-bio">${bioCell('Age', p.age ?? '—')}${bioCell('Height', (p.ht || '—').replace(/\s/g, ''))}${bioCell('Weight', (p.wt || '—').replace(' lbs', ''), 'lbs')}${bioCell('Exp', p.exp === 0 ? 'R' : p.exp ?? '—', p.exp === 0 ? 'rookie' : 'yrs')}</div>
    <div class="ph-btns">
      ${UI.followBtn('player', pid, 'sm')}
      <button class="btn sm ph-sq" data-act="pl-alerts" data-arg="${pid}">${icon('bell', 'sm')}${alertsOn ? 'Alerts on' : 'Alerts'}</button>
      <button class="btn sm ph-sq" data-go="#/compare?a=${pid}">${icon('swap', 'sm')}Compare</button>
    </div>
  </div>`;
}
const bioCell = (l, v, u) => html`<div><div class="pl-bv num">${v}${u ? html`<small>${u}</small>` : ''}</div><div class="pl-bl">${l}</div></div>`;

/* ------------------------------------------------------------------ overview */
function overview(pid, p, tm, grp, s, L, career, page, curS) {
  const now = time.now();
  const fellBack = curS && s !== curS;
  const keys = KEY_STATS[grp];
  const out = [];
  if (store.p.level === 'new' && POS_TIP[grp]) out.push(html`<div class="pad mt16">${UI.learnTip(html`<b>${p.pos === 'PK' ? 'Kicker' : p.pos}:</b> ${POS_TIP[grp]}`)}</div>`);
  // season line
  if (keys && L) {
    // player-sofar A (2026-11-08): one white card, lead stat big with its rank, the other three as the stat row; was player-season B: the headline number big with its rank, the other three in a row under it; fantasy as a footnote
    const cells = keys.map(k => { const stt = STAT[k], rk = rankOf(pid, s, k, grp), qual = !stt.q || stt.q(L); return { v: fmtStat(sval(L, stt), stt), l: stt.l, rk: rk && qual ? rk.r : null }; });
    const [lead, ...rest] = cells;
    const fr = fantasyRank(pid, s, grp);
    out.push(html`<div class="sec">${UI.secHead(seasonLabel(s))}
      ${fellBack ? html`<div class="pad"><div class="notice pl-fb">${icon('info', 'sm')}<span>${/injured|out/i.test(p.pg + ' ' + (p.st || '')) ? `${p.ln} hasn't played in ${curS} — he's on the injury report.` : `No ${curS} stats yet — here's his ${s} season.`}</span></div></div>` : ''}
      <div class="pad ${fellBack ? 'mt12' : ''}"><div class="ps-card"><div class="ps-lead"><span class="ps-eb">${lead.l}</span><b>${lead.v}</b><span>${lead.rk ? `${fmt.ord(lead.rk)} among ${GROUP_NAME[grp]}` : ''}</span></div>
        <div class="ps-row">${rest.map(x => html`<div><b>${x.v}</b><span>${x.l}</span><em>${x.rk ? fmt.ord(x.rk) : '—'}</em></div>`)}</div></div>
        <div class="ps-foot">${fmt.plural(L.gp, 'game')}${L.tid !== p.t ? ` · with ${Dt.team(L.tid)?.abbr}` : ''}${['QB', 'RB', 'WR', 'TE'].includes(grp) && L.fpts ? ` · Fantasy (PPR) ${fmt.n(L.fpts, 1)}${fr ? `, ${fmt.ord(fr)} ${grp}` : ''}` : ''}</div></div></div>`);
    // trend
    const log = Dt.gameLog(pid, s) || [];
    const stt = STAT[keys[0]];
    const vals = log.filter(l => l.g.t === 2).map(l => { const c = l.cats; const x = { cats: c }; return sval(x, stt); });
    if (vals.length >= 3) out.push(html`<div class="pad mt12"><div class="card pad-all"><div class="flex between"><div><div class="eyebrow">${stt.l} by game</div><div class="h3 mt6 num">${fmt.n(vals.reduce((a, b) => a + b, 0) / vals.length, stt.d || 1)} <span class="meta">per game</span></div></div>${UI.spark(vals, { w: 150, h: 40 })}</div></div></div>`);
  } else if (grp === 'OL' || grp === 'LS') {
    out.push(html`<div class="sec">${UI.secHead(seasonLabel(s))}<div class="pad"><div class="card pad-all pl-noline">${icon('users')}<div><div class="h4">${grp === 'OL' ? 'Linemen don\'t pile up box-score stats' : 'Specialists rarely show up in the box score'}</div><div class="meta mt4">${grp === 'OL' ? html`Track ${p.ln}'s availability, snaps and the offense he anchors instead.` : 'Their work shows up in clean snaps on every kick.'} ${Dt.liveGameFor(p.t) ? '' : ''}</div>
      <div class="flex gap8 mt12"><button class="btn xs ghost" data-go="#/team/${tm.id}?tab=depth">Depth chart</button><button class="btn xs ghost" data-go="#/team/${tm.id}?tab=stats">Team offense</button></div></div></div></div></div>`);
  } else {
    out.push(html`<div class="sec">${UI.secHead(seasonLabel(s))}<div class="pad"><div class="card pad-all pl-noline">${icon('clock')}<div><div class="h4">No ${s} stats yet</div><div class="meta mt4">${p.exp === 0 ? 'Rookie season — stats will appear once he logs snaps.' : 'He hasn\'t recorded a stat this season.'}</div></div></div></div></div>`);
  }
  // last + next game
  const log = (Dt.gameLog(pid, s) || []).slice(-1)[0];
  const ng = Dt.nextGame(p.t, now);
  const live = Dt.liveGameFor(p.t, now);
  // approved round 6 (player-games v4 A): the schedule's game row with the logo inline; his stat line is the last game's second line
  if (live || log || ng) {
    const lastG = log && !live && log.g, nextG = ng && (!live || ng.id !== live.id) ? ng : null;
    out.push(html`<div class="sec">${UI.secHead('Games')}
      ${live ? html`<div class="pg-lb">Live now</div><div class="list">${UI.gameRow(live, p.t, { inline: true })}</div>` : ''}
      ${lastG ? html`<div class="pg-lb">Last game · ${Dt.weekLabel(lastG.t, lastG.w)}</div><div class="list">${UI.gameRow(lastG, log.tid, { inline: true, sub: Dt.spoiled(lastG) ? 'Result hidden · spoiler shield' : lineSummary(log.cats, grp), cls: 'pg-line' })}</div>` : ''}
      ${nextG ? html`<div class="pg-lb">Next</div><div class="list">${UI.gameRow(nextG, p.t, { inline: true })}</div>` : ''}</div>`);
  }
  // career snapshot
  const prim = PRIMARY[grp];
  const cc = career[prim] || career[Object.keys(career)[0]];
  if (cc && cc.r.length) out.push(careerSnap(cc, prim, p));
  // bio
  out.push(html`<div class="sec">${UI.secHead('Bio')}<div class="pad"><div class="card pad-all">${UI.kv([
    ['Born', p.dob ? `${fmt.date(p.dob + 'T12:00:00Z')}${p.bp ? ' · ' + p.bp : ''}` : p.bp],
    ['College', p.col], ['Drafted', p.dr || (p.deb ? 'Undrafted' : null)], ['NFL debut', p.deb],
    ['Experience', p.exp === 0 ? 'Rookie' : p.exp != null ? fmt.plural(p.exp, 'year') : null],
    ['Status', p.st], ['Contract', p.sal ? html`${fmt.money(p.sal)} in 2026 · through ${p.thru}` : null],
  ])}</div></div></div>`);
  // news
  const news = Dt.news({ player: pid }).slice(0, 4);
  const teamNews = news.length ? [] : Dt.news({ team: p.t }).slice(0, 3);
  if (news.length || teamNews.length) out.push(html`<div class="sec">${UI.secHead(news.length ? 'News' : `Latest on the ${tm.name}`)}<div class="list">${(news.length ? news : teamNews).map(a => UI.newsCard(a, 'sm'))}</div></div>`);
  // player-pass (built Nov 10): no Compare button at the foot; Compare sits in the hero
  return out;
}
function liveRow(pid, g, p) {
  const S = Dt.score(g);
  const hide = Dt.spoiled(g);
  return UI.row({ left: html`<span class="badge live">Live</span>`, title: html`${oppLabel(g, p.t)}`, sub: hide ? 'Spoiler shield on' : `${S.label} · ${Dt.team(g.a).abbr} ${S.as}–${S.hs} ${Dt.team(g.h).abbr}`, go: `#/game/${g.id}` });
}
function lastRow(l, grp) {
  const g = l.g, r = Dt.result(g, l.tid), hide = Dt.spoiled(g);
  return UI.row({ left: html`<div class="pl-wk">${g.t === 3 ? wkShort(g) : 'W' + g.w}</div>`, title: html`Last game ${oppLabel(g, l.tid)}`,
    sub: hide ? 'Result hidden · spoiler shield' : html`<span class="${r.r === 'W' ? 'c-win' : r.r === 'L' ? 'c-loss' : ''} b">${r.r} ${r.us}-${r.them}</span> · ${lineSummary(l.cats, grp)}`, go: `#/game/${g.id}` });
}
function nextRow(g, tid) {
  const o = Dt.team(Dt.opp(g, tid));
  return UI.row({ left: html`<div class="pl-wk">${g.t === 3 ? wkShort(g) : g.t === 1 ? 'PS' : 'W' + g.w}</div>`, title: html`Next ${oppLabel(g, tid)}`, sub: `${fmt.day(g.ts)} · ${g.tbd ? 'TBD' : fmt.time(g.ts)}${(g.tv || []).length ? ' · ' + g.tv.join('/') : ''}`, go: `#/game/${g.id}` });
}
/** one-line stat summary like "24/33, 284 yds, 2 TD" */
function lineSummary(c, grp) {
  const parts = [];
  const p = c.passing, r = c.rushing, rc = c.receiving, d = c.defensive, k = c.kicking, i = c.interceptions;
  if (p && p.passingAttempts) parts.push(`${p.completions}/${p.passingAttempts}, ${p.passingYards} yds${p.passingTouchdowns ? `, ${p.passingTouchdowns} TD` : ''}${p.interceptions ? `, ${p.interceptions} INT` : ''}`);
  if (r && r.rushingAttempts && (grp !== 'QB' || r.rushingYards >= 20 || r.rushingTouchdowns)) parts.push(`${r.rushingAttempts} car, ${r.rushingYards} yds${r.rushingTouchdowns ? `, ${r.rushingTouchdowns} TD` : ''}`);
  if (rc && rc.receptions) parts.push(`${rc.receptions} rec, ${rc.receivingYards} yds${rc.receivingTouchdowns ? `, ${rc.receivingTouchdowns} TD` : ''}`);
  if (d && (d.totalTackles || d.sacks)) parts.push(`${d.totalTackles} tkl${d.sacks ? `, ${d.sacks} sk` : ''}${d.tacklesForLoss ? `, ${d.tacklesForLoss} TFL` : ''}`);
  if (i && i.interceptions) parts.push(`${i.interceptions} INT`);
  if (k && (k.fieldGoalAttempts || k.extraPointAttempts)) parts.push(`${k.fieldGoalsMade}/${k.fieldGoalAttempts} FG${k.longFieldGoalMade ? ` (long ${k.longFieldGoalMade})` : ''}`);
  return parts.slice(0, 2).join(' · ') || 'Played';
}
function careerSnap(cc, cat, p) {
  const L = cc.l; const idx = n => L.indexOf(n);
  const pick = { passing: ['YDS', 'TD', 'INT', 'RTG'], rushing: ['YDS', 'TD', 'AVG', 'CAR'], receiving: ['REC', 'YDS', 'TD', 'AVG'], defensive: ['TOT', 'SACK', 'INT', 'FF'], kicking: ['FGM', 'FG%', 'LNG', 'PTS'], punting: ['PUNTS', 'AVG', 'LNG', 'IN20'] }[cat] || L.slice(1, 5);
  const cols = pick.filter(x => idx(x) >= 0).slice(0, 4);
  const best = (() => { const yi = idx(cols[0]); if (yi < 0) return null; let b = null; cc.r.forEach(r => { const v = +r[2 + yi]; if (!b || v > b.v) b = { v, y: r[0] }; }); return b; })();
  const seasons = cc.r.length, first = cc.r[0][0];
  return html`<div class="sec">${UI.secHead('Career', 'All seasons', null)}<div class="pad"><div class="card pad-all" data-act="pl-tab" data-arg="career">
    <div class="flex between"><div class="eyebrow">${fmt.plural(seasons, 'season')} · since ${first}</div><div class="tiny">${CAT_NAME[cat] || cat}</div></div>
    <div class="grid4 mt12">${cols.map(c => html`<div><div class="pl-cv num">${fmt.n(cc.tot[idx(c)], /\.|%|AVG|RTG/.test(c) ? 1 : 0)}</div><div class="pl-bl">${c}</div></div>`)}</div>
    ${best && seasons > 1 ? html`<div class="meta mt12">Career high: <b class="num">${fmt.n(best.v)}</b> ${cols[0].toLowerCase()} in ${best.y}</div>` : ''}</div></div></div>`;
}

/* ------------------------------------------------------------------ game log */
/* approved round 6 (player-tables v5 A): every stat table is one card: the title with its picker (season chip or small tabs),
   ink bars with the best in the team colour, the first column pinned while the rest scroll under an edge fade, six rows then
   "Show all"; body numbers are Stats Regular (the table exception to the stat-number role) with one key column bold */
function tcard(tm, title, right, cats, chart, table, foot, more) {
  return html`<div class="pad mt16" style="${raw(App.teamVars(tm))}"><div class="tc">
    <div class="tc-h"><span class="tc-t">${title}</span>${right || ''}</div>
    ${cats ? html`<div class="tc-cat">${cats}</div>` : ''}
    ${chart ? html`<div class="tc-chart">${chart[2] ? html`<div class="tc-ebr">${chart[2]}</div>` : html`<span class="tc-eb">${chart[0]}</span>`}${chart[1]}</div>` : ''}
    <div class="tc-tbl">${table}</div><div class="tc-hint">Swipe the table for more columns</div>${more || ''}</div>
    <div class="tc-foot">${foot}</div></div>`;
}
const seasonChip = (years, on, act) => html`<button class="sc-season" data-act="pl-year-sheet" data-arg="${act}:${years.join(',')}">${on}${icon('down', 'xs')}</button>`;
const keyCol = (heads, ...want) => { const i = want.map(h => heads.indexOf(h)).find(x => x >= 0); return i == null ? -1 : i; };
const showAll = (n, what, st) => n > 6 && !st.allRows ? html`<button class="tc-all" data-act="pl-allrows">Show all ${n} ${what}${icon('chev', 'xs')}</button>` : '';
const cut = (i, st) => i >= 6 && !st.allRows ? 'tc-more' : '';

function gamelog(pid, p, tm, grp, s, L, career, page) {
  const st = page.state;
  const seasons = seasonsSoFar().filter(y => Object.values(career).some(c => c.r.some(r => r[0] === y)) || y === s);
  const ls = st.logS || s;
  if (!NFL.d['box-' + ls]) { st.logS = ls; Dt.ensureBox(ls).then(() => App.refresh()); return UI.loading(); }
  const log = Dt.gameLog(pid, ls) || [];
  const chip = seasonChip(seasons, ls, 'logS');
  if (!log.length) return tcard(tm, 'Game log', chip, '', null, '', `No games in ${ls}: he didn't record a stat in any game that season.`);
  const cats = catsFor(grp, [...new Set(log.flatMap(l => Object.keys(l.cats)))]);
  const prim = cats[0] || 'defensive';
  const second = cats[1];
  const cols = (LOG_COLS[prim] || []).concat(second && UI.depth() >= 2 && ['rushing', 'receiving'].includes(second) && ['passing', 'rushing', 'receiving'].includes(prim) ? LOG_COLS[second].slice(0, 3).map(([l, f]) => [l === 'YDS' ? (second === 'rushing' ? 'RuYD' : 'ReYD') : (second === 'rushing' ? 'Ru' : 'Re') + l, f]) : []);
  const keys = (KEY_STATS[grp] || []).filter(k => STAT[k]), stt = STAT[keys.includes(st.logStat) ? st.logStat : keys[0]];
  const vals = stt ? log.map(l => sval({ cats: l.cats }, stt)) : [];
  const tot = Dt.sumLines(log);
  const ki = keyCol(cols.map(c => c[0]), 'YDS', 'TOT', 'TKL', 'PTS');
  const catOf = c => c[0].startsWith('Ru') ? 'rushing' : c[0].startsWith('Re') ? 'receiving' : prim;
  const table = html`<table class="tbl"><thead><tr><th>Game</th><th>Result</th>${cols.map(c => html`<th>${c[0]}</th>`)}</tr></thead><tbody>
      ${log.map((l, i) => {
        const g = l.g, r = Dt.result(g, l.tid), hide = Dt.spoiled(g);
        return html`<tr data-go="#/game/${g.id}" class="tap ${cut(i, page.state)}"><td><span class="flex gap6"><span class="pl-wkc">${g.t === 3 ? wkShort(g) : g.w}</span>${Dt.isHome(g, l.tid) ? '' : '@'}${UI.logo(Dt.opp(g, l.tid), 'sm')}${Dt.team(Dt.opp(g, l.tid)).abbr}</span></td>
          ${hide ? html`<td colspan="${cols.length + 1}" class="dim">${icon('eyeoff', 'xs')} hidden</td>` : html`<td><span class="tc-pill ${r.r === 'W' ? 'c-win' : r.r === 'L' ? 'c-loss' : ''}">${r.r}</span>${r.us}-${r.them}</td>${cols.map((c, j) => html`<td class="${j === ki ? 'k' : ''}">${l.cats[catOf(c)] ? c[1](l.cats[catOf(c)]) ?? '–' : '–'}</td>`)}`}</tr>`;
      })}
      <tr class="sep"><td>Total <span>${log.length} games</span></td><td></td>${cols.map(c => { const cc = tot.cats[catOf(c)]; return html`<td>${cc ? safeTot(c, cc) : '–'}</td>`; })}</tr>
    </tbody></table>`;
  const foot = ['Regular season and playoffs. Tap a game for the full box score.', showAll(log.length, 'games', page.state)];
  const statChip = keys.length > 1 ? html`<button class="sc-season" data-act="pl-logstat-sheet" data-arg="${keys.join(',')}">${stt.l}${icon('down', 'xs')}</button>` : '';
  return tcard(tm, 'Game log', chip, '', vals.length >= 2 ? [stt.l, trendBars(vals, log, tm, st), statChip] : null, table, ...foot);
}
/* Game-by-game bars (approved build-trend, 2026-11-09): one bar per game, played games hatched, the picked game (latest by default)
   solid in the real team colour with its value over it; values in Stats (small chart numbers), opponents in Sans; tap to pick */
function trendBars(vals, log, tm, st) {
  const n = vals.length, pick = st.logPick != null && st.logPick < n ? st.logPick : n - 1, mx = Math.max(...vals, 1) * 1.12;
  const shown = log.map(l => !Dt.spoiled(l.g)), ok = vals.filter((v, i) => shown[i]);
  const avg = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : 0, fmtV = v => Number.isInteger(v) ? String(v) : v.toFixed(1);
  const lab = l => n > 9 ? wkShort(l.g) : (Dt.isHome(l.g, l.tid) ? '' : '@') + Dt.team(Dt.opp(l.g, l.tid)).abbr;
  return html`<div class="tb-row ${n > 9 ? 'dense' : ''}" style="--tb-c:${tm.color}">${vals.map((v, i) => html`<button class="tb-b ${i === pick ? 'on' : ''}" data-act="pl-logpick" data-arg="${i}" aria-label="${lab(log[i])}: ${shown[i] ? fmtV(v) : 'hidden'}">
      ${i === pick && shown[i] ? html`<b>${fmtV(v)}</b>` : ''}<i style="height:${shown[i] ? Math.max(3, Math.round(v / mx * 100)) : 3}%"></i><span>${lab(log[i])}</span></button>`)}</div>
    <div class="tb-f"><span>Average</span><b>${ok.every(Number.isInteger) ? Math.round(avg) : avg.toFixed(1)}</b><span>· tap a bar for that game</span></div>`;
}
function safeTot(c, cc) { try { const v = c[1](cc); return v == null || Number.isNaN(v) ? '–' : v; } catch { return '–'; } }
function barChart(vals, labels) {
  const W = 340, H = 80, n = vals.length, mx = Math.max(...vals, 1), bw = Math.min(26, W / n - 4);
  return html`<svg viewBox="0 0 ${W} ${H + 14}" width="100%">${vals.map((v, i) => {
    const x = i * (W / n) + (W / n - bw) / 2, h = Math.max(2, v / mx * H);
    return raw(`<rect x="${x}" y="${H - h}" width="${bw}" height="${h}" rx="3" fill="${v === mx ? 'var(--tg-b, var(--accent))' : 'var(--text)'}"/><text x="${x + bw / 2}" y="${H + 12}" font-size="10.5" fill="var(--text-2)" text-anchor="middle" font-family="AP Stats">${esc(labels[i])}</text>`);
  })}</svg>`;
}

/* ------------------------------------------------------------------ career */
function careerTab(pid, p, tm, grp, s, L, career, page) {
  const st = page.state;
  const cats = Object.keys(career).filter(c => career[c].r.length);
  if (!cats.length) return UI.empty('chart', 'No career stats', grp === 'OL' ? 'Offensive linemen don\'t accumulate traditional stats.' : 'He hasn\'t recorded a regular-season stat yet.');
  const order = ['passing', 'rushing', 'receiving', 'defensive', 'kicking', 'punting', 'scoring'];
  cats.sort((a, b) => (a === PRIMARY[grp] ? -1 : 0) - (b === PRIMARY[grp] ? -1 : 0) || order.indexOf(a) - order.indexOf(b));
  const cat = st.careerCat && cats.includes(st.careerCat) ? st.careerCat : cats[0];
  const cc = career[cat];
  const yi = cc.l.indexOf(({ passing: 'YDS', rushing: 'YDS', receiving: 'YDS', defensive: 'TOT', kicking: 'PTS', punting: 'AVG', scoring: 'PTS' })[cat]);
  const ki = cc.l.indexOf(({ passing: 'YDS', rushing: 'YDS', receiving: 'YDS', defensive: 'TOT', kicking: 'PTS', punting: 'AVG', scoring: 'PTS' })[cat]) + 1;
  const num = v => typeof v === 'number' ? fmt.n(v, Number.isInteger(v) ? 0 : 1) : v;
  const rows = cc.r.slice().reverse();
  const table = html`<table class="tbl"><thead><tr><th>Season</th>${cc.l.map(l => html`<th>${l}</th>`)}</tr></thead><tbody>
      ${rows.map((r, i) => html`<tr class="${cut(i, st)}"><td><span class="flex gap6">${r[0]} ${UI.logo(r[1], 'sm')}</span></td>${r.slice(2).map((v, j) => html`<td class="${j + 1 === ki ? 'k' : ''}">${num(v)}</td>`)}</tr>`)}
      <tr class="sep"><td>Career</td>${cc.tot.map(v => html`<td>${num(v)}</td>`)}</tr>
    </tbody></table>`;
  return tcard(tm, 'Career', '', cats.length > 1 ? UI.tabs(cats.map(c => ({ k: c, l: CAT_NAME[c] || c })), cat, 'pl-ccat', 'sm') : '',
    yi >= 0 && cc.r.length > 1 ? [`${cc.l[yi]} by season`, barChart(cc.r.map(r => +r[2 + yi] || 0), cc.r.map(r => "'" + String(r[0]).slice(2)))] : null, table,
    'Regular season. Source: ESPN.', showAll(rows.length, 'seasons', st));
}

/* ------------------------------------------------------------------ splits */
function splits(pid, p, tm, grp, s, L, career, page) {
  const sp = (NFL.d.splits || {})[pid];
  if (!sp) return UI.empty('layers', 'No splits yet', 'Splits appear once he has recorded stats this season.');
  const st = page.state; const i = Math.min(st.splitCat || 0, sp.c.length - 1);
  const nice = n => n === 'split' ? 'Overview' : n;
  const c = sp.c[i];
  const ki = keyCol(sp.l.map(x => String(x).toUpperCase()), 'YDS', 'TOT', 'PTS') + 1;
  const table = html`<table class="tbl"><thead><tr><th>Split</th>${sp.l.map(l => html`<th>${l}</th>`)}</tr></thead><tbody>
    ${c.r.map(r => html`<tr><td>${r[0] === 'All Splits' ? 'All' : r[0]}</td>${(r[1] || []).map((v, j) => html`<td class="${j + 1 === ki ? 'k' : ''}">${v}</td>`)}</tr>`)}</tbody></table>`;
  return tcard(tm, 'Splits', '', UI.tabs(sp.c.map((x, k) => ({ k: String(k), l: nice(x.n) })), String(i), 'pl-split', 'sm'), null, table, 'Current season splits. Source: ESPN.');
}

/* ------------------------------------------------------------------ advanced */
function advancedTab(pid, p, tm, grp, s, L, career, page) {
  const st = page.state;
  const opts = [2026, 2025].filter(y => seasonsSoFar().includes(y));
  if (!opts.length) return UI.empty('chart', 'Advanced stats need play-by-play', 'They\'re available for the 2025 and 2026 seasons.');
  const as = st.advS && opts.includes(st.advS) ? st.advS : opts[0];
  st.advS = as;
  return html`${opts.length > 1 ? UI.chips(opts.map(y => ({ k: String(y), l: String(y) })), String(as), 'pl-advs', 'mt12') : ''}
    <div class="pl-adv" data-s="${as}">${UI.loading()}</div>
    <div class="pad mt12"><div class="tiny">Computed by us from official play-by-play using a simple ${UI.term('EPA', 'expected-points model')}. Treat these as close estimates, not official figures.</div></div>`;
}
function mountAdvanced(el, page, pid, grp) {
  const box = el.querySelector('.pl-adv'); if (!box) return;
  const s = +box.dataset.s;
  const run = () => advanced(pid, s).then(A => { if (box.isConnected) box.innerHTML = App.val(renderAdv(A, grp, pid, s)); });
  if (!NFL.d['box-' + s]) Dt.ensureBox(s).then(run); else run();
}
const pct = (a, b) => b ? fmt.n(a / b * 100, 1) + '%' : '—';
const per = (a, b, d = 2) => b ? (a / b >= 0 && d === 2 ? '+' : '') + fmt.n(a / b, d) : '—';
function renderAdv(A, grp, pid, s) {
  if (!A || !A.games) return UI.empty('chart', 'No play-by-play involvement', `We couldn't find him in ${s} play-by-play.`);
  const tiles = [], bars = [];
  const T = (v, l, sub) => tiles.push({ v, l, sub });
  if (grp === 'QB') {
    T(per(A.epa, A.n), html`${UI.term('EPA', 'EPA')} / dropback`, `${A.db || 0} dropbacks`);
    T(pct(A.succ, A.n), html`${UI.term('Success rate')}`, 'Plays that stayed on schedule');
    T(pct(A.sk || 0, A.db), 'Sack rate', `${A.sk || 0} sacks`);
    T(pct(A.deepC || 0, A.deep), 'Deep completion %', `${A.deep || 0} deep throws`);
    T(pct(A.thirdC || 0, A.third), '3rd-down conversion', `${A.third || 0} dropbacks on 3rd`);
    T(A.rzTD || 0, 'Red-zone TD passes', `${A.rz || 0} red-zone dropbacks`);
    bars.push(dirBars('Where he throws', A));
    if (A.scr) T(A.scr, 'QB runs', `${A.scrY || 0} yards`);
  } else if (grp === 'RB') {
    T(per(A.epa, A.n), html`${UI.term('EPA', 'EPA')} / carry`, `${A.car || 0} carries`);
    T(pct(A.succ, A.n), html`${UI.term('Success rate')}`, 'Runs that stayed on schedule');
    T(pct(A.expl || 0, A.car), 'Explosive run rate', '10+ yard carries');
    T(pct(A.stuff || 0, A.car), 'Stuffed rate', 'Carries for 0 or less');
    if (A.tgt) T(pct(A.catch || 0, A.tgt), 'Catch rate', `${A.tgt} targets`);
    T(A.rz || 0, 'Red-zone carries', 'Inside the 20');
    bars.push(dirBars('Where he runs', A));
  } else if (grp === 'WR' || grp === 'TE') {
    T(per(A.tEpa || 0, A.tN), html`${UI.term('EPA', 'EPA')} / target`, `${A.tgt || 0} targets`);
    T(pct(A.catch || 0, A.tgt), 'Catch rate', `${A.catch || 0} catches`);
    T(A.tgt ? fmt.n((A.recY || 0) / A.tgt, 1) : '—', 'Yards per target', '');
    T(pct(A.deep || 0, A.tgt), 'Deep target share', `${A.deepC || 0} deep catches`);
    T(pct(A.thirdC || 0, A.third), '3rd-down conversions', `${A.third || 0} targets on 3rd`);
    T(A.rz || 0, 'Red-zone targets', 'Inside the 20');
    const tt = totals(s); const team = tt && Object.values(tt).filter(x => x.tid === Dt.player(pid)?.t);
    const teamTgt = team ? team.reduce((a, x) => a + (x.cats.receiving?.receivingTargets || 0), 0) : 0;
    const mine = tt && tt[pid] ? tt[pid].cats.receiving?.receivingTargets || 0 : 0;
    if (teamTgt) T(pct(mine, teamTgt), html`${UI.term('Target share')}`, 'Of team targets');
  } else if (grp === 'K') {
    const b = A.fg || {};
    ['<30', '30–39', '40–49', '50+'].forEach(k => T(b[k] ? `${b[k][0]}/${b[k][1]}` : '—', `${k} yards`, b[k] ? pct(b[k][0], b[k][1]) : 'No attempts'));
  } else if (grp === 'P') {
    T(A.punts ? fmt.n(A.puntY / A.punts, 1) : '—', 'Gross average', `${A.punts || 0} punts`);
  } else {
    T(A.tk || 0, 'Tackles in play-by-play', `${A.tkRun || 0} vs run · ${A.tkPass || 0} vs pass`);
    T(A.stop || 0, 'Run stops', 'Tackles holding a run to ≤2 yds');
    T(A.sk || 0, 'Sacks credited', '');
    T(A.pres || 0, 'Hits & breakups', 'Bracketed in play-by-play');
    T(A.int || 0, 'Interceptions', '');
    if (A.ff) T(A.ff, 'Forced fumbles', '');
  }
  // approved round 6 (player-advanced A): the season-line pattern, the headline number big, the rest as small tiles, direction as meter rows
  const [lead, ...rest] = tiles;
  return html`<div class="pad mt12"><div class="ps-lead"><span class="ps-eb">${lead.l}</span><b>${lead.v}</b><span>${lead.sub || ''}</span></div>
    ${rest.length ? html`<div class="ad-g">${rest.map(x => html`<div><b>${x.v}</b><span>${x.l}</span>${x.sub ? html`<em>${x.sub}</em>` : ''}</div>`)}</div>` : ''}${bars}
    <div class="ps-foot">${fmt.plural(A.games, 'game')} with play-by-play</div></div>`;
}
function dirBars(title, A) {
  const L = A.dirL || 0, M = A.dirM || 0, R = A.dirR || 0, t = L + M + R; if (!t) return '';
  const b = (l, v) => html`<div class="ad-dr"><b>${l}</b><i class="ad-m"><i style="width:${v / t * 100}%"></i></i><span>${Math.round(v / t * 100)}%</span></div>`;
  return html`<div class="ad-dir"><div class="ps-eb">${title}</div>${b('Left', L)}${b('Middle', M)}${b('Right', R)}</div>`;
}

/* ------------------------------------------------------------------ contract */
function contract(pid, p, tm, grp) {
  if (!p.sal) return UI.empty('dollar', 'No contract on file', 'We don\'t have salary data for this player.');
  const peers = Object.entries(Dt.D.players).filter(([, x]) => x.sal && GROUP[x.pos] === grp).sort((a, b) => b[1].sal - a[1].sal);
  const rk = peers.findIndex(([id]) => id === pid) + 1;
  const pctile = peers.length ? Math.round((1 - (rk - 1) / peers.length) * 100) : 0;
  const teamTop = Object.entries(Dt.D.players).filter(([, x]) => x.t === p.t && x.sal).sort((a, b) => b[1].sal - a[1].sal).slice(0, 5);
  const tr = Object.entries(Dt.D.players).filter(([, x]) => x.t === p.t && x.sal).sort((a, b) => b[1].sal - a[1].sal).findIndex(([id]) => id === pid) + 1;
  const rookie = p.dr && p.dr.startsWith(String(2026 - (p.exp || 0))) && (p.exp || 0) <= 3 && /Rd 1|Rd 2|Rd 3|Rd 4|Rd 5|Rd 6|Rd 7/.test(p.dr) && p.thru - (2026 - (p.exp || 0)) <= 4;
  // approved round 6 (player-contract A): the season-line pattern; facts only, no "highest paid" language; his row marked in the team list
  return html`<div class="pad mt16"><div class="ps-lead"><span class="ps-eb">2026 salary</span><b>${fmt.money(p.sal)}</b><span>${fmt.ord(rk)} of ${peers.length} ${GROUP_NAME[grp] || 'players'}${rookie ? ' · rookie contract' : ''}</span></div>
      <div class="ps-row"><div><b>${fmt.ord(tr)}</b><span>On the ${tm.name}</span></div><div><b>${p.thru || '—'}</b><span>Signed through</span></div><div><b>${p.thru ? p.thru + 1 : '—'}</b><span>Free agent</span></div></div></div>
    <div class="sec">${UI.secHead(`Top ${tm.name} salaries`, 'Cap', `#/team/${tm.id}?tab=cap`)}<div class="list" style="--tg-b:${raw(App.teamVars(tm).match(/--tg-b:([^;]+)/)[1])}">
      ${teamTop.map(([id, x]) => UI.playerRow(id, { cls: id === pid ? 'ct-me' : '', noInj: true, sub: x.pos, right: html`<span class="ct-sal">${fmt.money(x.sal)}</span>` }))}</div></div>
    <div class="ps-foot pad">Cash salary for the 2026 league year from ESPN. Salary-cap hits can differ because of bonuses and restructures.</div>`;
}

/* ------------------------------------------------------------------ video */
function video(pid, p, tm, grp, s) {
  const log = (Dt.gameLog(pid, s) || []).slice().reverse();
  const items = log.slice(0, 6).map(l => {
    const o = Dt.team(Dt.opp(l.g, l.tid)), hide = Dt.spoiled(l.g);
    return { title: `${p.ln}${hide ? '' : ': ' + lineSummary(l.cats, grp)}`, sub: `${Dt.weekLabel(l.g.t, l.g.w)} ${Dt.isHome(l.g, l.tid) ? 'vs' : '@'} ${o.name}`, team: p.t, dur: '1:' + String(20 + (l.g.w * 7) % 39).padStart(2, '0'), tier: 'free', kind: 'Highlights' };
  });
  const prem = [
    { title: `Every ${p.ln} snap — All-22`, sub: `${s} season cut-up · coaches film`, team: p.t, dur: '18:40', tier: 'premium', kind: 'All-22' },
    { title: `${p.n}: season so far`, sub: 'NFL Films mini-doc', team: p.t, dur: '6:12', tier: 'plus', kind: 'NFL Films' },
  ];
  if (!items.length) return html`${UI.empty('video', 'No highlights yet', 'Highlights appear after he plays.')}<div class="hscroll">${prem.map(v => UI.videoCard(v, { w: 260 }))}</div>`;
  return html`<div class="sec">${UI.secHead('Game highlights')}<div class="pad pl-vgrid">${items.map(v => UI.videoCard(v, { w: '100%' }))}</div></div>
    <div class="sec">${UI.secHead('Go deeper')}<div class="hscroll">${prem.map(v => UI.videoCard(v, { w: 260 }))}</div></div>`;
}

/* ------------------------------------------------------------------ actions */
const A = App.actions;
const setState = (k, v) => { const pg = App.current(); pg.state[k] = v; if (k === 'tab') pg.el.scrollTop = Math.min(pg.el.scrollTop, 230); App.refresh(); };
A['pl-tab'] = (el, ev, k) => setState('tab', k);
A['pl-logs'] = (el, ev, y) => setState('logS', +y);
A['pl-year-sheet'] = (el, ev, arg) => {
  const [key, list] = arg.split(':'), cur = +el.textContent.trim().slice(0, 4);
  App.sheet({ title: 'Season', html: html`<div class="list">${list.split(',').map(y => UI.row({ title: `${y} season`, act: 'pl-year-pick', arg: `${key}:${y}`, right: +y === cur ? icon('check', 'sm accent') : '' }))}</div>` });
};
A['pl-year-pick'] = (el, ev, arg) => { const [key, y] = arg.split(':'); App.closeSheet(); App.current().state.logPick = null; setState(key, +y); };
A['pl-allrows'] = () => setState('allRows', true);
A['pl-logpick'] = (el, ev, i) => setState('logPick', +i);
A['pl-logstat-sheet'] = (el, ev, arg) => {
  const cur = App.current().state.logStat || arg.split(',')[0];
  App.sheet({ title: 'Stat', html: html`<div class="list">${arg.split(',').map(k => UI.row({ title: STAT[k].l, act: 'pl-logstat', arg: k, right: k === cur ? icon('check', 'sm accent') : '' }))}</div>` });
};
A['pl-logstat'] = (el, ev, k) => { App.closeSheet(); setState('logStat', k); };
A['pl-ccat'] = (el, ev, c) => setState('careerCat', c);
A['pl-split'] = (el, ev, i) => setState('splitCat', +i);
A['pl-advs'] = (el, ev, y) => setState('advS', +y);
A['pl-share'] = (el, ev, pid) => App.toast({ title: 'Player card copied', body: `${Dt.player(pid)?.n} — share it anywhere`, icon: 'share' });
A['pl-alerts'] = (el, ev, pid) => {
  const p = Dt.player(pid);
  const all = store.p.playerAlerts = store.p.playerAlerts || {};
  const cur = all[pid] || {};
  const opts = [['td', 'Every touchdown'], ['big', 'Big plays (20+ yards, sacks, turnovers)'], ['line', 'Live stat line during games'], ['inj', 'Injury & status updates'], ['news', 'Breaking news'], ['ms', 'Milestones & records']];
  const body = () => html`<div class="list">${opts.map(([k, l]) => UI.row({ title: l, right: UI.toggle(!!cur[k], 'pl-alert-t', pid + ':' + k) }))}</div>
    <div class="tiny pad mt12">Alerts respect your spoiler shield and quiet hours.</div>`;
  App.sheet({ title: `${p.n} alerts`, html: body(), mount(elx, entry) { App.store.tmp.plAlertSheet = { entry, body }; } });
};
A['pl-alert-t'] = (el, ev, arg) => {
  const [pid, k] = arg.split(':');
  const all = store.p.playerAlerts = store.p.playerAlerts || {};
  const cur = all[pid] = all[pid] || {};
  cur[k] = !cur[k];
  if (!Object.values(cur).some(Boolean)) delete all[pid];
  else if (!store.p.players.includes(pid)) store.p.players.push(pid);
  store.save();
  el.classList.toggle('on', !!cur[k]);
};

App.PS = { hero, overview, gamelog, careerTab, splits, contract, advanced, renderAdv, lastRow, nextRow, liveRow, fantasyRank, seasonLabel, STATS, STAT, sval, fmtStat, totals, ranked, rankOf, groupOf, GROUP, GROUP_NAME, KEY_STATS, PRIMARY, seasonsSoFar, lineSummary, barChart, ep, playEPA, CAT_NAME, LOG_COLS };
})();
