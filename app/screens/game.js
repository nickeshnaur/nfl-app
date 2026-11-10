/* ============================================================================
   NFL — Game Center  (#/game/:id?tab=)
   Pre / live / final, rebuilt at App.time.now(). Live box scores and team stats
   are reconstructed from the play-by-play up to "now" so nothing is spoiled.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, fmt, store, time } = App;
const UI = App.UI, Dt = App.data;

/* ------------------------------------------------------------------ small helpers */
const ORD = ['', '1st', '2nd', '3rd', '4th'];
const PASS_T = /^(Pass Reception|Pass Incompletion|Passing Touchdown|Pass Interception Return|Interception Return Touchdown)$/;
const RUSH_T = /^(Rush|Rushing Touchdown)$/;
const NAME = "([A-Z][A-Za-z'\\-]*\\.(?:St\\. )?[A-Za-z'\\-]+(?:\\s(?:Jr\\.|Sr\\.|II|III|IV|V))?)";
const RE_PASSER = new RegExp('^' + NAME + ' (?:pass|sacked)');
const RE_RECV = new RegExp('(?:pass[^.]*? to|intended for) ' + NAME);
const RE_RUSHER = new RegExp('^' + NAME + ' ');
// play text uses league (GSIS) codes; map them to the app's abbreviations
const ALIAS = { BLT: 'BAL', CLV: 'CLE', HST: 'HOU', ARZ: 'ARI', LA: 'LAR', WSH: 'WAS', JAC: 'JAX', SD: 'LAC', OAK: 'LV', STL: 'LAR' };
const norm = s => (s || '').replace(/\b(BLT|CLV|HST|ARZ|LA|WAS|JAC)\b(?=[\s\-.,)]|$)/g, c => ALIAS[c]);
const clean = s => norm(s).replace(/^(\([^)]*\)\s*)+/, '');
const keyOf = n => n.toLowerCase().replace(/\s(jr\.|sr\.|ii|iii|iv|v)$/i, '').replace(/[\s.]/g, '');
const abbrKey = full => { const w = full.replace(/\s(Jr\.|Sr\.|II|III|IV|V)$/, '').split(' '); return keyOf(w[0][0] + '.' + w.slice(1).join(' ')); };
const shortName = full => { if (!full) return ''; const w = full.split(' '); return w.length > 1 ? w[0][0] + '. ' + w.slice(1).join(' ') : full; };
const plural = (n, w) => `${n} ${w}${Math.abs(n) === 1 ? '' : 's'}`;
function rng(seed) { let a = 0; for (const c of String(seed)) a = (a * 31 + c.charCodeAt(0)) | 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const tm = id => Dt.team(id);
const weekName = g => Dt.weekLabel(g.t, g.w) + (g.t === 3 && g.w === 5 ? ' ' + Dt.sbNumeral(g.s) : '');

/* ------------------------------------------------------------------ model */
/** everything the page needs at "now" */
function model(g) {
  const now = time.now();
  const st = Dt.state(g, now);
  const S = Dt.score(g, now);
  const pbp = Dt.D.live[g.id];
  const L = pbp ? Dt.live(g, now) : null;
  const plays = L ? (st === 'pre' ? [] : L.plays.slice(0, L.idx + 1)) : [];
  const box = Dt.box(g.id);
  return { g, now, st, S, pbp, L, plays, box, hide: Dt.spoiled(g) && st !== 'pre', away: tm(g.a), home: tm(g.h) };
}
/** timeouts left per team in the current half, from "Timeout #n by ABC" plays */
function timeouts(m) {
  if (m.st !== 'live' || !m.plays.length) return null;
  const q = m.L.q, half = q <= 2 ? [1, 2] : q <= 4 ? [3, 4] : [5, 6];
  const used = {}; used[m.away.abbr] = 0; used[m.home.abbr] = 0;
  m.plays.forEach(p => { if (p.ty === 'Timeout' && half.includes(p.q)) { const mm = /by ([A-Z]{2,3})/.exec(norm(p.x)); if (mm && used[mm[1]] != null) used[mm[1]]++; } });
  const per = q > 4 ? 2 : 3;
  return { a: Math.max(0, per - used[m.away.abbr]), h: Math.max(0, per - used[m.home.abbr]) };
}

/* ---------- live box score reconstructed from plays (no spoilers mid-game) */
function liveBox(m) {
  const names = {};
  if (m.box) for (const cat in m.box.pl) m.box.pl[cat].forEach(r => { names[r[1] + ':' + abbrKey(r[2])] = { pid: r[0], n: r[2], tid: r[1] }; });
  const P = {}, T = {};
  const who = (abbr, tid) => { const k = tid + ':' + keyOf(abbr); return names[k] || { pid: null, n: abbr, tid }; };
  const get = (cat, abbr, tid) => { const w = who(abbr, tid); const k = cat + ':' + tid + ':' + (w.pid || abbr); return P[k] = P[k] || { cat, tid, pid: w.pid, n: w.n }; };
  const team = tid => T[tid] = T[tid] || { plays: 0, yds: 0, pass: 0, rush: 0, fd: 0, to: 0, third: [0, 0], fourth: [0, 0], sacks: 0, pen: 0, penY: 0, rz: 0, expl: 0 };
  [m.g.a, m.g.h].forEach(team);
  m.plays.forEach(p => {
    const t = clean(p.x), ty = p.ty, off = p.team;
    const pen = /PENALTY on ([A-Z]{2,3})-?[^,]*, [^,]+, (\d+) yards/.exec(norm(p.x));
    if (pen) { const ab = Dt.team(pen[1]); if (ab) { team(ab.id).pen++; team(ab.id).penY += +pen[2]; } }
    if (/No Play|TWO-POINT/i.test(p.x || '') || !off || !T[off]) return;
    const isPass = PASS_T.test(ty) || /^Sack/.test(ty), isRush = RUSH_T.test(ty);
    if (!isPass && !isRush) { if (/Fumble Recovery \(Opponent\)/.test(ty)) team(off).to++; return; }
    const tt = team(off), y = p.y || 0;
    tt.plays++;
    if (p.dn === 3) { tt.third[1]++; if (y >= p.ds || /TOUCHDOWN/.test(p.x)) tt.third[0]++; }
    if (p.dn === 4) { tt.fourth[1]++; if (y >= p.ds || /TOUCHDOWN/.test(p.x)) tt.fourth[0]++; }
    if (p.dn && (y >= p.ds || /TOUCHDOWN/.test(p.x)) && !/INTERCEPT/.test(p.x)) tt.fd++;
    if (p.to || /INTERCEPT/.test(p.x)) tt.to++;
    if ((isPass && y >= 20) || (isRush && y >= 10)) tt.expl++;
    if (/^Sack/.test(ty)) {
      tt.sacks++; tt.yds += y; tt.pass += y;
      const qb = RE_PASSER.exec(t); if (qb) { const s = get('passing', qb[1], off); s.sk = (s.sk || 0) + 1; }
      return;
    }
    if (isPass) {
      const qb = RE_PASSER.exec(t); const rc = RE_RECV.exec(t);
      const comp = ty !== 'Pass Incompletion' && !/INTERCEPT/.test(t);
      const td = /TOUCHDOWN/.test(t) && !/INTERCEPT/.test(t);
      if (qb) { const s = get('passing', qb[1], off); s.att = (s.att || 0) + 1; if (comp) { s.cmp = (s.cmp || 0) + 1; s.yds = (s.yds || 0) + y; } if (td) s.td = (s.td || 0) + 1; if (/INTERCEPT/.test(t)) s.int = (s.int || 0) + 1; }
      if (rc) { const s = get('receiving', rc[1], off); s.tgt = (s.tgt || 0) + 1; if (comp) { s.rec = (s.rec || 0) + 1; s.yds = (s.yds || 0) + y; s.lng = Math.max(s.lng || 0, y); } if (td) s.td = (s.td || 0) + 1; }
      if (comp) { tt.yds += y; tt.pass += y; }
    } else {
      const ru = RE_RUSHER.exec(t);
      if (ru) { const s = get('rushing', ru[1], off); s.car = (s.car || 0) + 1; s.yds = (s.yds || 0) + y; s.lng = Math.max(s.lng || 0, y); if (/TOUCHDOWN/.test(t)) s.td = (s.td || 0) + 1; }
      tt.yds += y; tt.rush += y;
    }
  });
  return { P: Object.values(P), T };
}

/* ---------- final box helpers */
function catRows(box, cat, tid) { return (box.pl[cat] || []).filter(r => r[1] === tid); }
const CAT_ORDER = [['passing', 'Passing'], ['rushing', 'Rushing'], ['receiving', 'Receiving'], ['defensive', 'Defense'], ['interceptions', 'Interceptions'], ['kicking', 'Kicking'], ['punting', 'Punting'], ['kickReturns', 'Kick returns'], ['puntReturns', 'Punt returns'], ['fumbles', 'Fumbles']];
function fptsFor(box, pid) {
  const cats = {};
  for (const c of ['passing', 'rushing', 'receiving', 'fumbles']) { const r = (box.pl[c] || []).find(x => x[0] === pid); if (r) cats[c] = Dt.lineObj(c, r); }
  return Dt.fantasy(cats);
}

/* ---------- season context for previews (cached per minute) */
const seasonCache = {};
function seasonCtx(s) {
  const k = s + ':' + Math.floor(time.now() / 60000);
  if (seasonCache[k]) return seasonCache[k];
  const all = {}; Dt.D.teams.forEach(t => all[t.id] = Dt.teamSeason(t.id, s));
  const rank = (tid, key, lower) => { const arr = Object.entries(all).filter(([, v]) => v && v.g).sort((a, b) => lower ? a[1][key] - b[1][key] : b[1][key] - a[1][key]); const i = arr.findIndex(([id]) => id === tid); return i < 0 ? null : i + 1; };
  return seasonCache[k] = { all, rank };
}

/* ------------------------------------------------------------------ explain a play in plain language */
function explain(p, next, prevWp, g) {
  const off = tm(p.team) || {}, t = clean(p.x), y = p.y || 0, ty = p.ty || '';
  const out = [], terms = [];
  let title = ty;
  if (p.dn > 0) {
    const where = p.yz <= 20 ? `inside the ${UI.term('Red Zone', 'red zone')}` : p.yz >= 80 ? 'deep in their own territory' : `${p.yz} yards from the end zone`;
    out.push(html`It was <b>${ORD[p.dn]} down with ${p.ds >= p.yz ? 'goal to go' : plural(p.ds, 'yard') + ' to go'}</b> for ${off.name}, ${raw(String(where))}.`);
    terms.push('Down & distance');
    if (p.yz <= 20) terms.push('Red Zone');
  }
  const qb = RE_PASSER.exec(t), rc = RE_RECV.exec(t), ru = RE_RUSHER.exec(t);
  if (/Passing Touchdown|Rushing Touchdown/.test(ty) || (/TOUCHDOWN/.test(t) && !/INTERCEPT|FUMBLE/.test(t))) {
    title = 'Touchdown';
    out.push(html`${qb && rc ? `${qb[1]} threw it to ${rc[1]}` : ru ? `${ru[1]} carried it` : 'The offense got it'} into the end zone from ${plural(Math.abs(y) || p.yz, 'yard')} out. <b>Touchdown: 6 points</b>, then a try for 1 more (a kick) or 2 (a play from the 2-yard line).`);
    terms.push('Extra point');
  } else if (/INTERCEPT/.test(t)) {
    title = 'Interception';
    const by = /INTERCEPTED by ([A-Z][\w.'-]+(?: [\w.'-]+)?)/.exec(t);
    out.push(html`${qb ? qb[1] : 'The quarterback'}'s pass was <b>intercepted</b>${by ? ' by ' + by[1] : ''}: the defense caught it. That's a ${UI.term('Turnover', 'turnover')}, and the other team's offense takes over.`);
    terms.push('Turnover');
  } else if (/FUMBLE/.test(t) && /RECOVERED by/.test(t)) {
    const lost = p.to || /Opponent|Opp/.test(ty);
    title = lost ? 'Fumble lost' : 'Fumble';
    out.push(html`The ball came loose: a <b>fumble</b>. ${lost ? 'The defense recovered it, a turnover.' : 'The offense fell on it and kept possession.'}`);
    if (lost) terms.push('Turnover');
  } else if (/^Sack/.test(ty)) {
    title = 'Sack';
    out.push(html`The quarterback was <b>sacked</b>: tackled behind the line of scrimmage before he could throw, losing ${plural(Math.abs(y), 'yard')}.`);
  } else if (ty === 'Pass Reception') {
    title = y >= 20 ? 'Big play' : 'Completed pass';
    out.push(html`${qb ? qb[1] : 'The QB'} completed a pass to ${rc ? rc[1] : 'a receiver'} for <b>${plural(y, 'yard')}</b>.`);
  } else if (ty === 'Pass Incompletion') {
    title = 'Incomplete pass';
    out.push(html`The pass ${rc ? 'to ' + rc[1] + ' ' : ''}fell <b>incomplete</b>. No yards, and an incomplete pass stops the game clock.`);
  } else if (ty === 'Rush') {
    title = y >= 10 ? 'Big run' : 'Run';
    out.push(html`${ru ? ru[1] : 'The runner'} ran the ball for <b>${y > 0 ? plural(y, 'yard') : y < 0 ? 'a loss of ' + plural(-y, 'yard') : 'no gain'}</b>.`);
  } else if (ty === 'Punt') {
    title = 'Punt';
    out.push(html`Facing 4th down, the offense <b>punted</b>: kicked it away to push the other team back rather than risk failing and handing over the ball right there.${/Touchback/.test(t) ? raw(' It went into the end zone for a ' + UI.term('Touchback', 'touchback') + '.') : ''}`);
    if (/Touchback/.test(t)) terms.push('Touchback');
  } else if (/Field Goal Good/.test(ty)) {
    title = 'Field goal';
    const d = /(\d+) yard field goal/.exec(t);
    out.push(html`A <b>${d ? d[1] + '-yard ' : ''}field goal</b> is good: 3 points. Teams kick when they're close enough but a touchdown looks unlikely.`); terms.push('Field goal');
  } else if (/Field Goal Missed|Blocked Field Goal/.test(ty)) {
    title = 'Missed field goal';
    out.push(html`The field goal <b>missed</b>. No points, and the other team takes over at the spot of the kick.`); terms.push('Field goal');
  } else if (ty === 'Kickoff') {
    title = 'Kickoff';
    out.push(html`A <b>kickoff</b> starts each half and follows every score. ${/Touchback/.test(t) ? 'This one was a touchback, so the receiving team starts at its own 35.' : 'The returner brought it out.'}`);
  } else if (ty === 'Penalty' || /PENALTY/.test(t)) {
    title = 'Penalty';
    const pm = /PENALTY on ([A-Z]{2,3})-?([^,]*), ([^,]+), (\d+) yards/.exec(t);
    out.push(html`A <b>flag</b>: ${pm ? `${pm[3]} on ${tm(pm[1]) ? tm(pm[1]).name : pm[1]}${pm[2] ? ' (' + pm[2] + ')' : ''}, ${pm[4]} yards` : 'a penalty was called'}. ${/No Play/i.test(t) ? 'The play doesn\'t count, and the down is replayed from the new spot.' : 'The yards are added to the result of the play.'}`);
  } else if (ty === 'Timeout') {
    title = 'Timeout';
    out.push(html`A <b>timeout</b> stops the clock. Each team gets three per half, so they're precious late in games.`);
  } else if (/Two-minute/i.test(ty)) {
    title = 'Two-minute warning'; out.push(html`The automatic ${UI.term('Two-minute warning', 'two-minute warning')}: the clock stops with 2:00 left in the half.`); terms.push('Two-minute warning');
  } else if (/Safety/.test(ty)) {
    title = 'Safety'; out.push(html`A <b>${UI.term('Safety', 'safety')}</b>: the ball carrier was tackled in his own end zone. 2 points for the defense, and they get the ball back.`); terms.push('Safety');
  } else {
    out.push(html`${t}`);
  }
  // result vs. the line to gain
  if (p.dn > 0 && (PASS_T.test(ty) || RUSH_T.test(ty)) && !/TOUCHDOWN|INTERCEPT/.test(t) && !p.to) {
    if (y >= p.ds) out.push(html`That's enough to <b>move the chains</b>: a first down, with a fresh set of four downs.`);
    else if (p.dn === 4) { out.push(html`Short on 4th down: a <b>turnover on downs</b>, and the other team takes over.`); terms.push('Turnover'); }
    else if (next && next.dd && next.dn) out.push(html`That sets up <b>${next.dd}</b>.`);
  }
  if (p.wp != null && prevWp != null && Math.abs(p.wp - prevWp) >= 1) {
    const homeGain = p.wp - prevWp, ben = homeGain > 0 ? tm(g.h) : tm(g.a), pct = Math.abs(homeGain);
    out.push(html`${UI.term('Win probability', 'Win probability')} swung <b>${plural(pct, 'point')} toward ${ben.name}</b> (${tm(g.h).abbr} ${prevWp}% → ${p.wp}%).`);
    terms.push('Win probability');
  }
  return { title, out, terms: [...new Set(terms)] };
}

/* ------------------------------------------------------------------ fan reactions (emoji + preset takes only: no free text, always SFW) */
const RX = [{ k: 'fire', e: '🔥', l: 'Fire' }, { k: 'hype', e: '🙌', l: 'Hype' }, { k: 'clap', e: '👏', l: 'Respect' }, { k: 'flex', e: '💪', l: 'Strong' }, { k: 'shock', e: '😱', l: 'Shook' }, { k: 'mind', e: '🤯', l: 'Mind blown' }, { k: 'mad', e: '😤', l: 'Fired up' }, { k: 'ugh', e: '😩', l: 'Ugh' }];
const RXE = Object.fromEntries(RX.map(x => [x.k, x.e]));
/** what each play type makes each fanbase feel: [intensity, offense weights, defense weights] */
const MOOD = {
  td: [1, { fire: 5, hype: 4, mind: 2, flex: 1 }, { ugh: 4, mad: 3, shock: 1 }],
  to: [.9, { ugh: 5, mad: 3, shock: 2 }, { hype: 4, fire: 3, flex: 3, shock: 1 }],
  big: [.6, { fire: 4, mind: 3, clap: 2, hype: 1 }, { shock: 3, mad: 3, ugh: 2 }],
  sack: [.45, { mad: 4, ugh: 3 }, { flex: 5, fire: 3, hype: 1 }],
  fg: [.35, { clap: 4, hype: 1 }, { ugh: 2 }], miss: [.5, { ugh: 5, shock: 2 }, { hype: 4, clap: 1 }],
  stop: [.3, { ugh: 2, mad: 1 }, { flex: 4, clap: 3 }], pen: [.25, { mad: 3 }, { mad: 3 }],
  play: [.08, { clap: 3, fire: 1 }, { flex: 2, mad: 1 }],
};
const TAKES = {
  pre: ['Feeling good', 'Must-win game', 'Nervous', 'Trap game', 'Statement game'],
  td: ['What a play!', 'Great call', 'Never in doubt', 'Need a stop now'], to: ['Huge momentum swing', 'Defense!', 'Protect the ball', 'Game changer'],
  big: ['What a play!', 'Great call', 'Who was covering?', 'Keep it rolling'], sack: ['Defense!', 'Block somebody', 'Get home!', 'Held it too long'],
  kick: ['Points are points', 'Clutch', 'Had to happen', 'Should have gone for it'], stop: ['Defense!', 'Big stop', 'Flip the field', 'Need points next'],
  pen: ['Flag?', 'Fair call', 'Let them play', 'Costly'], play: ['Let\'s go!', 'Need a first down', 'Good tempo', 'Trust the plan'],
  post: ['What a game', 'Tough one', 'Statement win', 'On to next week'],
};
function playKind(p) {
  const x = p.x || '', y = p.y || 0;
  if (p.sc && /TOUCHDOWN/.test(x) && !/INTERCEPT|FUMBLE/.test(x)) return 'td';
  if (p.to || /INTERCEPT/.test(x)) return 'to';
  if (/^Sack/.test(p.ty)) return 'sack';
  if (/Field Goal Good/.test(p.ty)) return 'fg';
  if (/Field Goal Missed|Blocked Field Goal/.test(p.ty)) return 'miss';
  if ((PASS_T.test(p.ty) || RUSH_T.test(p.ty)) && y >= 20) return 'big';
  if (p.ty === 'Punt') return 'stop';
  if (p.pen || /PENALTY/.test(x)) return 'pen';
  if (PASS_T.test(p.ty) || RUSH_T.test(p.ty)) return 'play';
  return null;
}
/** seeded crowd reactions per play, keyed to the play's wallclock so nothing arrives before the play does */
function crowd(m) {
  const g = m.g, r0 = rng('rx' + g.id);
  const fans = 9000 + Math.floor(r0() * 70000), hShare = .52 + r0() * .14;
  const mine = (store.tmp.rx || {})[g.id] || {}, takes = (store.tmp.takes || {})[g.id] || {};
  const mk = (key, t, kind, team, p) => {
    const r = rng('rx' + g.id + key), [inten, offW, defW] = MOOD[kind] || MOOD.play;
    const offFans = fans * (team === g.h ? hShare : 1 - hShare), defFans = fans - offFans;
    const c = {}, noise = { [g.a]: 0, [g.h]: 0 };
    const add = (w, n, who) => { for (const k in w) { const v = Math.round(n * inten * w[k] / 10 * (.7 + r() * .6)); c[k] = (c[k] || 0) + v; noise[who] += v; } };
    if (team) { add(offW, offFans, team); add(defW, defFans, team === g.h ? g.a : g.h); } else { add({ fire: 3, hype: 3, clap: 1 }, fans * hShare, g.h); add({ fire: 3, hype: 2, mad: 1 }, fans * (1 - hShare), g.a); }
    for (const k in mine[key] || {}) c[k] = (c[k] || 0) + mine[key][k];
    const tk = TAKES[kind === 'fg' || kind === 'miss' ? 'kick' : kind] || TAKES.play;
    const tw = tk.map(() => .3 + r()), tsum = tw.reduce((a, b) => a + b, 0);
    return { key, t, kind, team, p, c, noise, total: Object.values(c).reduce((a, b) => a + b, 0), takes: tk.map((l, i) => ({ l, pct: Math.round(tw[i] / tsum * 100) })), take: takes[key] };
  };
  const out = [mk('pre', g.ts - 30 * 60e3, 'pre', null)];
  out[0].c = Object.fromEntries(Object.entries(out[0].c).map(([k, v]) => [k, v * 6])); out[0].total *= 6;
  const plays = m.pbp && m.st !== 'pre' ? (m.st === 'live' ? m.plays : Dt.flat(m.pbp)) : [];
  plays.forEach((p, i) => { const k = playKind(p); if (k && p._wc) out.push(mk('p' + i, p._wc + 4e3, k, p.team, p)); });
  if (m.st === 'post') { const end = m.pbp ? m.pbp._end : g.ts + Dt.GAME_LEN; const f = mk('post', end + 30e3, 'post', null); f.final = true; out.push(f); }
  return { fans, list: out.filter(x => x.t <= m.now) };
}

/* ------------------------------------------------------------------ render: hero */
/* ---------- the game page hero (built Nov 10: pregame-hero v4 + game-hero-live v3): one set across before, live and final.
   Tale of the tape: black with each team's colour glowing in from its own edge (near-black teams glow in their second colour),
   a big helmet bleeding off each screen edge over tricode and record (timeouts once the game starts), and one centre piece:
   the countdown before kickoff, Live and the clock over the score while live, Final over the score after. Away always left. */
function heroSet(m) {
  const { g, S, away, home, st, hide } = m;
  const glow = t => App.lum(t.color) < .04 ? t.alt : t.color;
  const vars = `${UI.matchVars(g.a, g.h)};--ga:${glow(away)};--gb:${glow(home)}`;
  const rec = t => Dt.record(t.id, g.s, Math.min(m.now, g.ts - 1)).str;
  const tv = (g.tv || [])[0];
  const to = st === 'pre' ? null : timeouts(m), lost = (a, b) => st === 'post' && !hide && a < b ? 'lo' : '';
  const dots = n => n == null ? '' : html`<span class="gh-to">${[0, 1, 2].map(i => html`<i class="${i < n ? 'on' : ''}"></i>`)}</span>`;
  const side = (t, h) => html`<div class="gh-s ${h ? 'h' : ''} ${st === 'pre' ? '' : lost(h ? S.hs : S.as, h ? S.as : S.hs)}"><a class="gh-hel" data-go="#/team/${t.id}">${UI.helmet(t.id, { face: h ? 'left' : 'right' })}</a><b class="gh-tri">${t.abbr}</b><span class="gh-rec">${rec(t)}</span>${dots(to && (h ? to.h : to.a))}</div>`;
  let mid;
  if (st === 'pre') {
    const u = Math.max(0, g.ts - m.now), d = Math.floor(u / 864e5), hh = Math.floor(u / 36e5) % 24, mm = Math.floor(u / 6e4) % 60;
    const cd = d ? [[d, 'Days'], [hh, 'Hrs'], [mm, 'Min']] : [[hh, 'Hrs'], [mm, 'Min'], [Math.floor(u / 1e3) % 60, 'Sec']];
    mid = html`<span class="gh-k">Kickoff in</span><div class="gh-cd">${cd.map(([v, l]) => html`<div><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`)}</div><span class="gh-sub">${g.tbd ? 'Time TBD' : `${fmt.weekday(g.ts)} ${fmt.time(g.ts)}`}${tv ? ' · ' + tv : ''}</span>`;
  } else {
    const ball = t => st === 'live' && !hide && S.poss === t.id ? html`<i class="gh-ball" title="Has the ball"></i>` : '';
    const top = st === 'live' ? html`<span class="gh-st"><span class="badge live">Live</span>${hide ? '' : html`<b class="gh-clk r-clock-status">${S.label}</b>`}</span>` : html`<span class="gh-st"><b class="gh-clk r-clock-status">${S.label}</b></span>`;
    mid = html`${top}<div class="gh-sc"><b class="${lost(S.as, S.hs)}">${hide ? '–' : S.as}${ball(away)}</b><b class="${lost(S.hs, S.as)}">${hide ? '–' : S.hs}${ball(home)}</b></div>${st === 'live' && !hide && S.dd ? html`<span class="gh-sub"><span>${S.dd}</span>${S.redzone ? html` · <span>Red zone</span>` : ''}</span>` : ''}`;
  }
  const wp = st === 'live' && !hide && S.wp != null ? S.wp : null;
  const note = g.note && !/super bowl/i.test(g.note) ? ' · ' + g.note : '';
  return html`<div class="gc-hero gh" style="${raw(vars)}"><div class="gh-meta">${weekName(g)} · ${g.vn || home.venue.name}${note}</div>
    <div class="gh-row">${side(away, false)}<div class="gh-mid">${mid}</div>${side(home, true)}</div>
    ${hide ? html`<div class="gc-shield">${icon('eyeoff', 'sm')}<span>Spoiler shield is on for this game</span><button class="btn xs white" data-act="gc-reveal">Reveal</button></div>` : ''}
    ${wp != null ? html`<div class="gh-wp"><span>${away.abbr} ${100 - wp}%</span><div class="gh-wpbar"><i style="width:${100 - wp}%;background:${App.readable(away, '#111111')}"></i><i style="width:${wp}%;background:${App.readable(home, '#111111')}"></i></div><span>${wp}% ${home.abbr}</span></div>` : ''}</div>`;
}

/** mini: the slim version that sits under the live stream (no venue line, records or timeouts) */
function hero(m, mini) {
  if (!mini) return heroSet(m);
  const { g, S, away, home, st, hide } = m;
  const to = timeouts(m);
  const dots = n => n == null ? '' : html`<div class="gc-to">${[0, 1, 2].map(i => html`<i class="${i < n ? 'on' : ''}"></i>`)}</div>`;
  // approved round 6 (hero-score A): the score sits over the tricode at each edge, beside the helmet; a final's losing score and tricode dim, the record stays full
  const score = (isHome) => {
    if (st === 'pre') return '';
    const v = isHome ? S.hs : S.as, poss = st === 'live' && !hide && S.poss === (isHome ? g.h : g.a);
    return html`<div class="gc-sc ${hide ? 'spoiler' : ''}">${hide ? '00' : v}${poss ? html`<span class="gc-poss" title="Has the ball">${icon('football', 'sm')}</span>` : ''}</div>`;
  };
  const side = (t, isHome) => {
    const sc = isHome ? S.hs : S.as, other = isHome ? S.as : S.hs;
    const lost = st === 'post' && !hide && sc < other;
    return html`<div class="gc-side ${isHome ? 'h' : 'a'} ${lost ? 'lost' : ''}"><a class="gc-hel" data-go="#/team/${t.id}">${UI.helmet(t.id, { face: isHome ? 'left' : 'right' })}</a>
      <div class="gc-tx">${score(isHome)}<div class="gc-ab">${t.abbr}</div><div class="gc-rec">${Dt.record(t.id, g.s, Math.min(m.now, g.ts - 1)).str}</div>${dots(to && (isHome ? to.h : to.a))}</div></div>`;
  };
  const mid = UI.heroStatus(g, S, hide);
  const wp = st === 'live' && !hide && S.wp != null ? S.wp : null;
  const note = g.note && !/super bowl/i.test(g.note) ? ' · ' + g.note : '';
  // apply-glow v3 A (approved build-glow, 2026-11-09): while live the header turns black and each team's
  // real colour glows in softly from its own edge (near-black teams glow in their second colour)
  const glow = t => App.lum(t.color) < .04 ? t.alt : t.color, glowOn = st === 'live'; // live glow header (approved build-glow, 2026-11-09)
  const gl = glowOn ? `;--ga:${glow(away)};--gb:${glow(home)}` : '';
  return html`<div class="gc-hero mu ${mini ? 'gc-mini' : ''} ${glowOn ? 'gc-glow' : ''}" style="${raw(UI.matchVars(g.a, g.h) + gl)}"><div class="mu-bg"></div>
    <div class="gc-hero-meta">${weekName(g)} · ${g.vn || home.venue.name}${note}</div>
    <div class="gc-st">${mid}</div>
    <div class="gc-bug">${side(away, false)}${side(home, true)}</div>
    ${hide ? html`<div class="gc-shield">${icon('eyeoff', 'sm')}<span>Spoiler shield is on for this game</span><button class="btn xs white" data-act="gc-reveal">Reveal</button></div>` :
      st === 'live' && S.dd ? html`<div class="gc-sit"><span class="b">${S.dd}</span>${S.redzone ? raw(' <span class="badge loss">Red zone</span>') : ''}</div>` : ''}
    ${wp != null ? html`<div class="gc-wp"><span>${away.abbr} ${100 - wp}%</span><div class="gc-wpbar"><i style="width:${100 - wp}%;background:${App.readable(away, '#111111')}"></i><i style="width:${wp}%;background:${App.readable(home, '#111111')}"></i></div><span>${wp}% ${home.abbr}</span></div>` : ''}
  </div>`;
}

/* ---------- action strip under the hero */
/** approved round 5: two rows that always fit. The main action full width (red Watch live while live, otherwise the white button),
    then the other actions as equal ghost buttons in one row of two or three, a 2 by 2 grid when there are four */
function actionsStrip(m, watching, docked) {
  const { g, st } = m;
  const opts = Dt.watch(g);
  const live = opts.find(o => o.ok && (o.k === 'nflplus' || o.k === 'dazn'));
  const tv = opts.filter(o => o.tier === 'tv').map(o => o.label);
  let main = '';
  const rest = [];
  if (st === 'live') {
    if (watching) {}
    else if (live) main = html`<button class="btn sm live" data-act="gc-watch">${icon('play', 'sm')} Watch live</button>`;
    else main = html`<button class="btn sm white" data-act="gc-where">${icon('tv', 'sm')} ${(g.tv || [])[0] ? 'On ' + g.tv[0] : 'Where to watch'}</button>`;
    if (!Dt.nationalWindow(g) && g.t === 2) rest.push(html`<button class="btn sm ghost gc-rz" data-go="#/channel/redzone" aria-label="NFL RedZone">${UI.rzLogo('', { theme: true })}</button>`);
    rest.push(html`<button class="btn sm ghost" data-act="gc-listen">${icon('headphones', 'sm')} Listen</button>`);
    rest.push(html`<button class="btn sm ghost" data-act="gc-catchup">${icon('rewind', 'sm')} Catch up</button>`);
  } else if (st === 'post') {
    main = html`<button class="btn sm white" data-act="gc-catchup">${icon('rewind', 'sm')} 60-second recap</button>`;
    rest.push(html`<button class="btn sm ghost" data-act="play-video" data-arg="${JSON.stringify({ title: `${m.away.name} at ${m.home.name}: highlights`, sub: Dt.weekLabel(g.t, g.w) + ' · ' + g.s, kind: 'Highlights', team: g.h })}">${icon('play', 'sm')} Highlights</button>`);
    if (!docked) rest.push(html`<button class="btn sm ghost" data-act="gc-where">${icon('layers', 'sm')} Replays</button>`);
  } else {
    main = html`<button class="btn sm white" data-act="gc-where">${icon('tv', 'sm')} ${tv[0] ? 'Watch on ' + (g.tv || [])[0] : 'Where to watch'}</button>`;
    rest.push(html`<button class="btn sm ghost" data-act="gc-remind">${icon('calendar', 'sm')} Add to calendar</button>`);
  }
  rest.push(html`<button class="btn sm ghost" data-act="gc-where">${icon('info', 'sm')} All options</button>`);
  // one inline row that scrolls sideways (round 5 game-actions v2): the main action first, then the rest; the page gutter on both ends
  return html`<div class="gc-actions"><div class="gc-act-row">${main}${rest}</div></div>`;
}

/* ------------------------------------------------------------------ tabs */
/** five tabs at most: the story (Recap / Live), every play, every stat, the fans, the matchup */
function tabList(m) {
  if (m.st === 'pre') return [{ k: 'preview', l: 'Preview' }, { k: 'fans', l: 'Fans' }];
  const t = [];
  if (m.st === 'post') t.push({ k: 'recap', l: 'Recap' });
  t.push({ k: 'live', l: m.st === 'live' ? 'Live' : 'Game flow' }, { k: 'plays', l: 'Plays' }, { k: 'stats', l: 'Stats' }, { k: 'fans', l: 'Fans' });
  if (m.st === 'post') t.push({ k: 'preview', l: 'Matchup' });
  return t;
}
// old tab names still work in links (?tab=box etc.)
const OLD_TAB = { gamecast: ['live'], box: ['stats', 'players'], team: ['stats', 'team'], react: ['fans', 'react'], predict: ['fans', 'predict'] };
// sub-tabs A (approved 2026-11-08): inside the game's tabs a switcher is the squared chip row; the page tabs stay the only small tabs
function seg2(items, on, act) { return html`<div class="mt16">${UI.chips(items, on, act)}</div>`; }
function statsTab(m, page) {
  const v = page.state.statsView || 'players';
  return html`${m.st === 'live' || m.st === 'post' ? html`<div class="mt16">${leadersCard(m)}</div>` : ''}${seg2([{ k: 'players', l: 'Players' }, { k: 'team', l: 'Team' }], v, 'gc-statsview')}${v === 'team' ? teamTab(m) : boxTab(m, page)}`;
}
function fansView(m, page) { return page.state.fansView || (m.st === 'pre' ? 'predict' : 'react'); }
function fansTab(m, page) {
  const v = fansView(m, page), items = [{ k: 'react', l: 'React' }, { k: 'predict', l: 'Predict' }];
  if (m.st === 'pre') items.reverse();
  if (v === 'react' && m.hide) return html`${seg2(items, v, 'gc-fansview')}<div class="empty">${icon('eyeoff')}<div class="h3">Reactions hidden</div><div class="meta mt6">How fans reacted would spoil the result.</div><button class="btn primary mt16" data-act="gc-reveal">Reveal</button></div>`;
  return html`${seg2(items, v, 'gc-fansview')}${v === 'react' ? reactTab(m) : predictTab(m)}`;
}

/* ---------- Gamecast */
const fvMode = () => App.store.tmp.fvMode || 'play';
App.actions['gc-fv'] = (el, ev, k) => { App.store.tmp.fvMode = k; App.refresh(); };
/** live only: who has the ball, down and distance, the field and the drive */
function nowCard(m) {
  const { g, L, plays, S, st, away } = m;
  const out = [];
  if (st === 'live' && L && L.idx >= 0) {
    // between a score and the kickoff there's no down & distance — show the kickoff instead of a blank
    const kick = (L.next && /kickoff/i.test(L.next.ty || '')) || (!S.dd && L.play && (L.play.sc || /extra point|two-point/i.test(L.play.x || '')));
    const kicker = kick ? (L.next && /kickoff/i.test(L.next.ty || '') ? L.next.team : L.play.team) : null;
    const poss = tm(kick ? kicker : S.poss) || away;
    const dirRight = (kick ? kicker : S.poss) === g.a;
    const di = L.next ? L.next.di : L.play.di, drv = m.pbp.dr[di];
    const dplays = plays.filter(p => p.di === di && (RUSH_T.test(p.ty) || PASS_T.test(p.ty) || /^Sack/.test(p.ty)));
    const dyds = dplays.reduce((a, p) => a + (p.y || 0), 0);
    // round 5 v2: L2 for the team with the ball and L5 right; the down & distance a 15 px Sans line with the view switch on its
    // right; the drive as three L4 pairs; "Explain this play" a squared small ghost button
    const right = S.redzone ? raw('<span class="badge loss">Red zone</span>') : UI.lk5(S);
    out.push(html`<div class="gc-card">
      ${UI.lk2(poss.id, { more: kick ? 'kicking off' : 'ball', right })}
      <div class="gc-ddrow mt12"><span class="gc-dd">${kick ? 'Kickoff' : S.dd || 'Between plays'}</span>${UI.chips([{ k: 'play', l: 'Last play' }, { k: 'drive', l: 'Drive' }], fvMode(), 'gc-fv', 'gc-fv-c')}</div>
      <div class="mt12">${UI.fieldViz(g, { L, mode: fvMode() })}</div>
      <div class="gc-drive mt12">${UI.lk4(dplays.length, dplays.length === 1 ? 'play' : 'plays')}${UI.lk4(dyds, dyds === 1 ? 'yard' : 'yards')}${UI.lk4(dplays.length ? (drv && drv.st ? drv.st : '–') : 'New', dplays.length ? 'started' : 'possession')}</div>
      ${L.play ? html`<button class="btn sm ghost mt12" data-act="gc-play" data-arg="${L.idx}">${icon('help', 'xs')} Explain this play</button>` : ''}
    </div>`);
  }
  return html`${out}`;
}
/** win probability across the game so far */
function wpCard(m) {
  const { g, plays, st, away, home } = m;
  const out = [];
  const wps = (st === 'live' ? plays : (m.pbp ? Dt.flat(m.pbp) : [])).filter(p => p.wp != null).map(p => p.wp);
  if (wps.length > 1) {
    const cur = wps[wps.length - 1];
    out.push(html`<div class="gc-card"><div class="flex between"><div class="h4">${UI.term('Win probability', 'Win probability')}</div>${raw(st === 'post' ? '<span class="badge">Final</span>' : '<span class="badge live">Live</span>')}</div>
      <div class="gc-wplegend mt8"><span>${UI.logo(home.id, 'sm')} <b class="num">${cur}%</b></span><span><b class="num">${100 - cur}%</b> ${UI.logo(away.id, 'sm')}</span></div>
      <div class="mt8 gc-wpchart">${UI.wpChart(downsample(wps, 120), g, { h: 110 })}<div class="gc-qlabels"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div></div></div>`);
  }
  return html`${out}`;
}
function downsample(a, n) { if (a.length <= n) return a; const s = a.length / n, o = []; for (let i = 0; i < n; i++) o.push(a[Math.floor(i * s)]); o.push(a[a.length - 1]); return o; }
const qLabel = p => `${p.q > 4 ? 'OT' : 'Q' + p.q} ${p.c || ''}${p.dd && p.dn ? ' · ' + p.dd : ''}`;
/** the same line as two roles: the clock in Stats bold caps, the down and distance after it in Sans medium */
const qLine = p => html`<span class="rx-clk">${p.q > 4 ? 'OT' : 'Q' + p.q} ${p.c || ''}</span>${p.dd && p.dn ? html`<span class="t-meta"> · ${p.dd}</span>` : ''}`;
/* ---------- Plays (drive by drive)
   Approved 2026-10-29: "All drives · Scoring drives" as small tabs, a quarter picker (32px chips), and a card per drive:
   logo and result, then Plays / Start / Yds / Time and the score after it; open, each play sits on a team-colour edge. */
/* apply-field v4 B (approved build-field, 2026-11-09): a drive as a tiny field (58×19): own end zone grey, the goal they're driving at in the team's real colour,
   one line from the first snap to where it ended (dot TD, ring FG, arrow punt, × turnover; a live drive ends in a plain dot) */
const DKIND = r => /touchdown/i.test(r) ? 'td' : /field goal/i.test(r) && !/miss|block/i.test(r) ? 'fg' : /interception|fumble|downs|safety|blocked|missed/i.test(r) ? 'to' : 'pt';
function driveField(ps, r, col, live) {
  const sn = ps.filter(p => !/Kickoff|Timeout|End Period|Punt|Field Goal|Extra Point|Two-Point/i.test(p.ty)), kind = live ? 'live' : DKIND(r);
  const a = sn.find(p => p.yz != null), z = [...sn].reverse().find(p => p.ez != null || p.yz != null);
  const from = a ? a.yz : 75, to = kind === 'td' ? 0 : z ? (z.ez != null ? z.ez : z.yz) : from;
  const W = 72, H = 24, e = 7, f = W - 2 * e, X = yz => e + (100 - Math.max(0, Math.min(100, yz))) / 100 * f, y = 12;
  const x0 = X(from), x1 = kind === 'td' ? W - e / 2 : X(to), on = kind === 'td' || kind === 'fg' || kind === 'live', lc = on ? col : '#6b717c';
  const mk = kind === 'td' || kind === 'live' ? `<circle cx="${x1}" cy="${y}" r="3.2" fill="#fff"${kind === 'live' ? ` stroke="${col}" stroke-width="1.5"` : ''}/>` : kind === 'fg' ? `<circle cx="${x1}" cy="${y}" r="3.6" fill="#fff" stroke="${col}" stroke-width="2"/>`
    : kind === 'to' ? `<path d="M${x1 - 3} ${y - 3}l6 6M${x1 + 3} ${y - 3}l-6 6" stroke="#5b616c" stroke-width="2" stroke-linecap="round"/>` : `<path d="M${x1 - 3} ${y - 3.5}l3.5 3.5-3.5 3.5" stroke="#5b616c" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return raw(`<svg class="dr2-fv" viewBox="0 0 ${W} ${H}" width="58" height="19" aria-hidden="true"><rect width="${W}" height="${H}" rx="4" fill="var(--surface-2)"/><rect width="${e}" height="${H}" rx="2" fill="var(--line-2)"/><rect x="${W - e}" width="${e}" height="${H}" rx="2" fill="${col}"/><line x1="${W / 2}" y1="4" x2="${W / 2}" y2="${H - 4}" stroke="var(--line-2)"/><line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${lc}" stroke-width="3" stroke-linecap="round"/><circle cx="${x0}" cy="${y}" r="2.4" fill="${lc}"/>${mk}</svg>`);
}
function playsTab(m, page) {
  const { g, plays, st } = m;
  if (!m.pbp) return scoringOnly(m, 'Full play-by-play is available for 2025 and 2026 games.');
  const all = st === 'live' ? plays : Dt.flat(m.pbp);
  const flt = page.state.filter === 'scoring' ? 'scoring' : 'all', qf = page.state.q || 0;
  const index = new Map(); Dt.flat(m.pbp).forEach((p, i) => index.set(p, i));
  const drives = [];
  all.forEach(p => { if (p.ty === 'Official Timeout') return; let d = drives[drives.length - 1]; if (!d || d.di !== p.di) drives.push(d = { di: p.di, dr: m.pbp.dr[p.di], plays: [] }); d.plays.push(p); });
  const qs = [...new Set(drives.map(d => Math.min(5, d.plays[0].q || d.dr.q || 1)))].sort();
  const lastDi = drives.length ? drives[drives.length - 1].di : -1;
  const liveDi = st === 'live' && m.L && m.L.next ? m.L.next.di : -1;
  const rows = drives.slice().reverse().map(d => {
    if (qf && Math.min(5, d.plays[0].q || d.dr.q || 1) !== qf) return '';
    const ps = flt === 'scoring' ? d.plays.filter(p => p.sc) : d.plays;
    if (!ps.length) return '';
    const t = tm(d.dr.t) || {}, R = App.teamRoles(t) || {};
    const inProg = d.di === liveDi;
    const open = page.state.open[d.di] != null ? page.state.open[d.di] : flt === 'scoring' || d.di === lastDi;
    const last = d.plays[d.plays.length - 1];
    const res = inProg ? 'In progress' : d.dr.r || '';
    const [pl, , tt] = String(d.dr.s || '').split(', ');
    const nPlays = inProg ? d.plays.filter(p => PASS_T.test(p.ty) || RUSH_T.test(p.ty)).length : String(pl || '').replace(/\D/g, '');
    const yds = inProg ? d.plays.reduce((a, p) => a + (PASS_T.test(p.ty) || RUSH_T.test(p.ty) ? p.y || 0 : 0), 0) : d.dr.y;
    return html`<div class="dr2 gc-drive-card ${open ? 'open' : ''}">
      <button class="dr2-h" data-act="gc-drive" data-arg="${d.di}">${UI.logo(d.dr.t, 'sm')}${driveField(d.plays, d.dr.r || '', t.color || '#888', inProg)}<b>${res}</b>${inProg ? raw('<span class="badge live">Live</span>') : ''}${icon(open ? 'up' : 'down', 'sm')}</button>
      <div class="dr2-g"><div><span>Plays</span><b>${nPlays || '–'}</b></div><div><span>Start</span><b>${d.dr.st || '–'}</b></div><div><span>Yds</span><b>${yds ?? '–'}</b></div><div><span>Time</span><b>${inProg ? '–' : tt || '–'}</b></div>
        <div class="dr2-sc">${UI.logo(g.a, 'xs')}${UI.logo(g.h, 'xs')}<b>${last.as ?? 0}</b><b>${last.hs ?? 0}</b></div></div>
      ${open ? html`<div class="dr2-plays" style="--c:${R.mark || 'var(--line-2)'}">${ps.slice().reverse().map(p => html`<div class="dr2-p tap" data-act="gc-play" data-arg="${index.get(p)}"><div class="dr2-pk"><b>${p.ty || 'Play'}</b>${p.dd ? html` · <span>${p.dd}</span>` : ''}<em>${p.q > 4 ? "OT" : "Q" + p.q} ${p.c || ""}</em></div><p>${clean(p.x)}</p></div>`)}</div>` : ''}</div>`;
  });
  const qItems = [{ k: '0', l: 'All quarters' }, ...qs.map(q => ({ k: String(q), l: q > 4 ? 'OT' : ORD[q] }))];
  const ch = (items, on, act) => items.map(i => html`<button class="chip ${i.k === on ? 'on' : ''}" data-act="${act}" data-arg="${i.k}">${i.l}</button>`);
  return html`<div class="chips mt12 dr2-filt">${ch([{ k: 'all', l: 'All drives' }, { k: 'scoring', l: 'Scoring' }], flt, 'gc-filter')}<span class="chips-gap"></span>${ch(qItems.map(q => q.k === '0' ? { k: '0', l: 'All' } : q), String(qf), 'gc-q')}</div>${UI.learnTip('Tap any play to have it explained in plain English.')}<div class="gc-drives">${rows}</div>`;
}
function scoringOnly(m, note) {
  const b = m.box;
  // no box score: not started, or (preseason) a game the data only has the final score for
  if (!b) return m.st === 'live' ? UI.empty('football', 'No play-by-play for this game', m.g.t === 1 ? 'Preseason games have the final score only. It shows here when the game ends.' : 'The score updates when the game ends.') : UI.empty('football', 'No plays yet', 'Check back at kickoff.');
  if (m.st === 'live') return UI.empty('football', 'Tracking unavailable', note);
  const byQ = {};
  b.sp.forEach(s => (byQ[s.q] = byQ[s.q] || []).push(s));
  return html`<div class="notice mt12">${icon('info', 'sm')}<span>${note}</span></div>${Object.keys(byQ).map(q => html`<div class="sec-head mt16"><div class="h4">${q > 4 ? 'Overtime' : ORD[q] + ' quarter'}</div></div>
    <div class="list">${byQ[q].map(s => spRow(s))}</div>`)}`;
}
/** a scoring play (approved round 5): the 56 px row as it is. Logo S24, the play in Title S, the clock in Stats bold caps with the kind
    of score in Meta, the running score right in Display */
function spRow(s, withQ) {
  return html`<div class="row static gc-sp">${UI.logo(s.t, 'sm')}<div class="row-main"><div class="row-title">${s.x}</div><div class="row-sub"><span class="gc-sp-clk">${withQ ? (s.q > 4 ? 'OT ' : 'Q' + s.q + ' ') : ''}${s.c}</span> · ${s.ty}</div></div><span class="lk-sc">${s.as}-${s.hs}</span></div>`;
}

/* ---------- Box score */
/** the box score (round 5 v2): the team switch fills the picked side with that team's gradient; per group an eyebrow, then one
    table whose first column is an L3 player line that stays put while the numbers scroll; every number Stats bold, the yards
    column (the one people read first) in the text colour */
function boxTab(m, page) {
  const { g, st, away, home } = m;
  const tid = page.state.boxTeam === 'home' ? g.h : g.a, on = page.state.boxTeam === 'home' ? 'home' : 'away';
  const sw = UI.chips([{ k: 'away', l: away.name, img: String(UI.logo(away.id, 'xs')) }, { k: 'home', l: home.name, img: String(UI.logo(home.id, 'xs')) }], on, 'gc-boxteam');
  const who = (pid, n) => { const p = Dt.player(pid), line = UI.lk3(pid, { name: shortName(n), meta: p ? p.pos : '' }); return p ? html`<a data-go="#/player/${pid}">${line}</a>` : line; };
  const table = (label, heads, rows) => html`<div class="t-eyebrow pad bx-h">${label}</div><div class="tbl-wrap bx-wrap"><table class="tbl bx"><thead><tr><th>Player</th>${heads.map(h => html`<th class="${h === 'YDS' ? 'k' : ''}">${h}</th>`)}</tr></thead>
    <tbody>${rows.map(([pid, n, vals]) => html`<tr><td>${who(pid, n)}</td>${vals.map((v, i) => html`<td class="${heads[i] === 'YDS' ? 'k' : ''}">${v == null ? '–' : v}</td>`)}</tr>`)}</tbody></table></div>`;
  if (st === 'live' || !m.box) {
    if (!m.pbp) return UI.empty('chart', 'Box score not available', '');
    const LB = liveBox(m);
    const P = LB.P.filter(p => p.tid === tid);
    const tbl = (cat, label, cols) => {
      const rows = P.filter(p => p.cat === cat).sort((a, b) => (b.yds || 0) - (a.yds || 0));
      return rows.length ? table(label, cols.map(c => c[0]), rows.map(r => [r.pid, r.n, cols.map(c => c[1](r))])) : '';
    };
    return html`<div class="mt12 pad">${sw}</div><div class="notice mt12">${icon('bolt', 'sm')}<span>Live box score, built from every play so far.</span></div>
      ${tbl('passing', 'Passing', [['C/ATT', r => `${r.cmp || 0}/${r.att || 0}`], ['YDS', r => r.yds || 0], ['TD', r => r.td || 0], ['INT', r => r.int || 0], ['SK', r => r.sk || 0]])}
      ${tbl('rushing', 'Rushing', [['CAR', r => r.car || 0], ['YDS', r => r.yds || 0], ['AVG', r => r.car ? (r.yds / r.car).toFixed(1) : '0.0'], ['TD', r => r.td || 0], ['LNG', r => r.lng || 0]])}
      ${tbl('receiving', 'Receiving', [['REC', r => r.rec || 0], ['TGT', r => r.tgt || 0], ['YDS', r => r.yds || 0], ['TD', r => r.td || 0], ['LNG', r => r.lng || 0]])}`;
  }
  const b = m.box, ck = Dt.D.core.catKeys;
  const cats = CAT_ORDER.filter(([c]) => UI.depth() >= 2 || ['passing', 'rushing', 'receiving'].includes(c));
  const fp = page.state.fpts;
  const tables = cats.map(([c, label]) => {
    const rows = catRows(b, c, tid);
    if (!rows.length) return '';
    const labels = (ck[c] || {}).labels || [];
    const showF = fp && ['passing', 'rushing', 'receiving'].includes(c);
    return table(label, showF ? [...labels, 'FPTS'] : labels, rows.map(r => [r[0], r[2], showF ? [...r.slice(3), fptsFor(b, r[0]).toFixed(1)] : r.slice(3)]));
  });
  return html`<div class="mt12 pad">${sw}</div>${tables}
    <div class="gc-foot-note"><button class="flex gap8" data-act="gc-fpts">${UI.toggle(fp, 'gc-fpts')}<span class="tiny">Show fantasy points (PPR) for reference</span></button></div>`;
}

/* ---------- Team stats */
const frac = s => { const [a, b] = String(s || '0-0').split('-').map(Number); return b ? a / b : 0; };
function teamTab(m) {
  const { g, away, home, st } = m;
  // two-sided bars in the teams' real colours meeting in the middle (approved build-bars, 2026-11-09)
  const cc = 'tb', head = barHead(away, home);
  const row = (l, sa, sh, va, vh, lower) => barRow(m, l, sa, sh, va, vh, lower);
  let rows = [];
  if (st === 'live' || !m.box) {
    if (!m.pbp) return UI.empty('chart', 'No team stats', '');
    const T = liveBox(m).T, A = T[g.a], H = T[g.h];
    rows = [
      ['Total yards', A.yds, H.yds], ['Passing', A.pass, H.pass], ['Rushing', A.rush, H.rush], ['Plays', A.plays, H.plays],
      ['Yards per play', (A.plays ? A.yds / A.plays : 0).toFixed(1), (H.plays ? H.yds / H.plays : 0).toFixed(1)],
      ['First downs', A.fd, H.fd], ['3rd down', `${A.third[0]}-${A.third[1]}`, `${H.third[0]}-${H.third[1]}`, A.third[1] ? A.third[0] / A.third[1] : 0, H.third[1] ? H.third[0] / H.third[1] : 0],
      ['Turnovers', A.to, H.to, null, null, true], ['Sacks allowed', A.sacks, H.sacks, null, null, true], ['Explosive plays', A.expl, H.expl], ['Penalties', `${A.pen}-${A.penY}`, `${H.pen}-${H.penY}`, A.pen, H.pen, true],
    ];
  } else {
    const A = m.box.tm[g.a] || {}, H = m.box.tm[g.h] || {};
    const n = v => +String(v ?? 0).replace(/,/g, '') || 0;
    rows = [
      ['Total yards', A.totalYards, H.totalYards, n(A.totalYards), n(H.totalYards)], ['Passing', A.netPassingYards, H.netPassingYards], ['Rushing', A.rushingYards, H.rushingYards],
      ['First downs', A.firstDowns, H.firstDowns], ['Yards per play', A.yardsPerPlay, H.yardsPerPlay],
      ['3rd down', A.thirdDownEff, H.thirdDownEff, frac(A.thirdDownEff), frac(H.thirdDownEff)], ['4th down', A.fourthDownEff, H.fourthDownEff, frac(A.fourthDownEff), frac(H.fourthDownEff)],
      ['Red zone (TD-att)', A.redZoneAttempts, H.redZoneAttempts, frac(A.redZoneAttempts), frac(H.redZoneAttempts)],
      ['Turnovers', A.turnovers, H.turnovers, n(A.turnovers), n(H.turnovers), true], ['Sacks-yards lost', A.sacksYardsLost, H.sacksYardsLost, n(String(A.sacksYardsLost).split('-')[0]), n(String(H.sacksYardsLost).split('-')[0]), true],
      ['Penalties-yards', A.totalPenaltiesYards, H.totalPenaltiesYards, n(String(A.totalPenaltiesYards).split('-')[0]), n(String(H.totalPenaltiesYards).split('-')[0]), true],
      ['Possession', A.possessionTime, H.possessionTime, n(String(A.possessionTime).replace(':', '.')), n(String(H.possessionTime).replace(':', '.'))],
    ];
    if (UI.depth() === 1) rows = rows.slice(0, 5).concat([rows[8]]);
  }
  const body = rows.map(r => row(r[0], r[1] ?? 0, r[2] ?? 0, r[3] ?? (+String(r[1]).replace(/,/g, '') || 0), r[4] ?? (+String(r[2]).replace(/,/g, '') || 0), r[5]));
  let adv = '';
  if (st === 'post' && m.box && m.box.adv && UI.depth() >= 2) {
    const a = m.box.adv[g.a] || {}, h = m.box.adv[g.h] || {};
    const per = (o, k, n) => o[n] ? o[k] / o[n] : 0;
    const f = v => (v >= 0 ? '+' : '') + v.toFixed(2);
    const p = v => (v * 100).toFixed(0) + '%';
    adv = html`<div class="sec-head mt24"><div class="h2">Advanced</div><span class="tiny">${UI.term('EPA', 'What\'s EPA?')}</span></div><div class="gc-card ${cc}">${head}
      ${row(raw(UI.term('EPA', 'EPA per play')), f(per(a, 'epa', 'plays')), f(per(h, 'epa', 'plays')), per(a, 'epa', 'plays'), per(h, 'epa', 'plays'))}
      ${row('Dropback EPA', f(per(a, 'passEPA', 'passN')), f(per(h, 'passEPA', 'passN')), per(a, 'passEPA', 'passN'), per(h, 'passEPA', 'passN'))}
      ${row('Rush EPA', f(per(a, 'rushEPA', 'rushN')), f(per(h, 'rushEPA', 'rushN')), per(a, 'rushEPA', 'rushN'), per(h, 'rushEPA', 'rushN'))}
      ${row(raw(UI.term('Success rate', 'Success rate')), p(per(a, 'succ', 'plays')), p(per(h, 'succ', 'plays')), per(a, 'succ', 'plays'), per(h, 'succ', 'plays'))}
      ${row('Explosive plays', a.expl || 0, h.expl || 0, a.expl || 0, h.expl || 0)}
      ${UI.depth() >= 3 ? row('Red zone plays', a.rzPlays || 0, h.rzPlays || 0, a.rzPlays || 0, h.rzPlays || 0) : ''}
      <div class="tiny mt8">EPA from a simple expected-points model over every run and pass. Positive is good for the offense.</div></div>`;
  }
  return html`<div class="sec-head mt20"><div class="h2">Team stats</div>${st === 'live' ? html`<span class="badge live">Live</span>` : ''}</div><div class="gc-card ${cc}">${head}${body}</div>${adv}`;
}

/* ---------- leaders card (final: box leaders; live: from plays) */
/** game leaders: [category, away {pid, n, v}, home {pid, n, v}] */
function leaderRows(m) {
  const { g } = m;
  let rows = [];
  if (m.st === 'post' && m.box && m.box.ld.length) {
    const cats = [['passingYards', 'Passing'], ['rushingYards', 'Rushing'], ['receivingYards', 'Receiving']];
    rows = cats.map(([c, l]) => [l, m.box.ld.find(x => x[0] === g.a && x[1] === c), m.box.ld.find(x => x[0] === g.h && x[1] === c)]).filter(r => r[1] || r[2])
      .map(([l, a, h]) => [l, a && { pid: a[2], n: a[3], v: a[4] }, h && { pid: h[2], n: h[3], v: h[4] }]);
  } else if (m.st === 'live' && m.pbp) {
    const P = liveBox(m).P;
    const top = (cat, tid) => P.filter(p => p.cat === cat && p.tid === tid).sort((a, b) => (b.yds || 0) - (a.yds || 0))[0];
    const fmtL = (cat, p) => !p ? null : { pid: p.pid, n: p.n, v: cat === 'passing' ? `${p.cmp || 0}/${p.att || 0}, ${p.yds || 0} YDS${p.td ? ', ' + p.td + ' TD' : ''}${p.int ? ', ' + p.int + ' INT' : ''}` : cat === 'rushing' ? `${p.car} CAR, ${p.yds || 0} YDS${p.td ? ', ' + p.td + ' TD' : ''}` : `${p.rec || 0} REC, ${p.yds || 0} YDS${p.td ? ', ' + p.td + ' TD' : ''}` };
    rows = [['passing', 'Passing'], ['rushing', 'Rushing'], ['receiving', 'Receiving']].map(([c, l]) => [l, fmtL(c, top(c, g.a)), fmtL(c, top(c, g.h))]).filter(r => r[1] || r[2]);
  }
  return rows;
}
/** game leaders (approved 2026-10-29): mirrored like a scoreboard. Each player is headshot, name (Title S) and the rest of the line (Meta)
    on the outside; the two yard totals meet in the middle in fixed slots, Display in each team's Mark, with YDS in Stats under them */
function leadersCard(m) {
  return leadersFO(m); // leaders face-off (approved build-faceoff, 2026-11-09); the scoreboard layout below is kept unused
  const { away, home } = m, rows = leaderRows(m);
  if (!rows.length) return '';
  const mk = t => (App.teamRoles(t) || {}).mark || App.teamFill(t);
  const cell = (x, tm, r) => {
    if (!x) return html`<div class="ldr-p ${r ? 'r' : ''}"></div><div class="ldr-v ${r ? 'r' : ''}"><b>–</b><span>YDS</span></div>`;
    const yd = /(\d+) YDS/i.exec(x.v || ''), rest = String(x.v || '').replace(/,?\s*\d+ YDS/i, '').replace(/^,\s*/, '');
    const go = x.pid && Dt.player(x.pid) ? raw(`data-go="#/player/${x.pid}"`) : '';
    return html`<a class="ldr-p ${r ? 'r' : ''}" ${go}>${UI.hs(x.pid, 'sm')}<div class="ldr-t"><div class="t-title-s ellipsis">${shortName(x.n)}</div><div class="t-meta ellipsis">${rest}</div></div></a><div class="ldr-v ${r ? 'r' : ''}"><b style="color:${mk(tm)}">${yd ? yd[1] : '–'}</b><span>YDS</span></div>`;
  };
  const chip = (tm, r) => html`<span class="ldr-tm ${r ? 'r' : ''}">${UI.logo(tm.id, 'sm')}<b>${tm.abbr}</b></span>`;
  return html`<div class="gc-card flush ldr"><div class="ldr-head"><div class="t-title">Game leaders</div><div class="ldr-teams">${chip(away)}<span class="t-eyebrow">Yards</span>${chip(home, true)}</div></div>
    ${rows.map(([l, a, h]) => html`<div class="ldr-row"><div class="ldr-k t-eyebrow">${l}</div><div class="ldr-g">${cell(a, away)}${cell(h, home, true)}</div></div>`)}</div>`;
}
/** game leaders face-off, apply-faceoff A (approved build-faceoff, 2026-11-09): one row per category, each leader's headshot in a circle of their
    team's real colour, their yards in Display beside it, the category between; the home side mirrored. Name and line as Meta */
function leadersFO(m) {
  const { away, home } = m, rows = leaderRows(m);
  if (!rows.length) return '';
  const disc = (x, tm) => html`<span class="fo-disc" style="background:${tm.color}">${UI.hs(x.pid, 'fo')}</span>`;
  const side = (x, tm, r) => {
    if (!x) return html`<span class="fo-disc fo-none"></span><div class="fo-v ${r ? 'r' : ''}"><b>–</b></div>`;
    const yd = /(\d+) YDS/i.exec(x.v || ''), rest = String(x.v || '').replace(/,?\s*\d+ YDS/i, '').replace(/^,\s*/, '');
    const go = x.pid && Dt.player(x.pid) ? raw(`data-go="#/player/${x.pid}"`) : '';
    const v = html`<div class="fo-v ${r ? 'r' : ''}"><b>${yd ? yd[1] : '–'}</b><span class="ellipsis">${shortName(x.n)}</span><span class="ellipsis">${rest}</span></div>`;
    return r ? html`${v}<a class="tap" ${go}>${disc(x, tm)}</a>` : html`<a class="tap" ${go}>${disc(x, tm)}</a>${v}`;
  };
  return html`<div class="gc-card fo"><div class="fo-h">${UI.logo(away.id, 'sm')}<span>${away.name}</span><span class="grow"></span><span>${home.name}</span>${UI.logo(home.id, 'sm')}</div>
    ${rows.map(([l, a, h]) => html`<div class="fo-r">${side(a, away)}<span class="fo-l">${l}<br>yards</span>${side(h, home, true)}</div>`)}</div>`;
}

/* ---------- Preview / matchup */
/** the last few hours before kickoff: the building filling up, the gameday timeline, weather and inactives */
const PRE = [[150, 'Gates open'], [90, 'Inactives'], [60, 'Warmups'], [6, 'Anthem'], [0, 'Kickoff']];
function pregameScene(m) {
  const { g, home, away } = m, now = time.now(), mins = (g.ts - now) / 60000;
  if (g.tbd || mins > 240 || mins <= 0) return '';
  const sd = !g.ns && App.stadium ? App.stadium(home.abbr) : null;
  const full = g.att || Math.round(((sd && sd.cap) || 65000) * .97), cap = (sd && sd.cap) || full;
  const p = Math.max(0, Math.min(1, (150 - mins) / 145)), fans = Math.round(full * p * p * (3 - 2 * p));
  // "Covered (open sides)" already says it is a roof: only bare words ("Retractable", "Fixed") get "roof" after them
  const wx = m.box && m.box.wx ? `${m.box.wx.t}° · ${m.box.wx.c}` : sd && !/Open/.test(sd.roof) ? (/\)$/.test(sd.roof) ? sd.roof : `${sd.roof} roof`) : (home.venue || {}).indoor ? 'Indoors' : 'Forecast at kickoff';
  const nextStep = PRE.find(([t]) => mins > t);
  const out = mins <= 90 ? [g.a, g.h].map(tid => Dt.injuries(tid).filter(i => /^Out|Injured Reserve/.test(i.s || '')).slice(0, 4)) : null;
  // round 5 v2: the original scene in the home team's own primary; before the gates open the big number is the countdown
  const left = Math.max(1, Math.round(mins - 150)), lh = Math.floor(left / 60), lm = left % 60;
  const big = fans ? html`<b class="num">${fmt.n(fans)}</b><span>fans in the building</span>`
    : html`<b class="num">${lh ? `${lh}:${String(lm).padStart(2, '0')}` : lm}</b><span>${lh ? '' : 'minutes '}until the gates open at ${fmt.time(g.ts - 150 * 60000)}</span>`;
  return html`<div class="gc-scene mt16" style="--tc:${App.teamFill(home)}"><div class="cpad">
      <div class="t-eyebrow">Gameday at ${g.vn || (home.venue || {}).name || 'the stadium'}</div>
      <div class="gc-scene-fans mt8">${big}</div>
      <div class="gc-scene-meter mt8"><i style="width:${(fans / cap * 100).toFixed(1)}%"></i></div>
      <div class="t-meta mt6">${fans ? `${Math.round(fans / cap * 100)}% full · ` : ''}${fmt.n(cap)} seats · ${wx}</div></div>
    <div class="gc-scene-tl">${PRE.map(([t, l]) => html`<div class="${mins <= t ? 'done' : nextStep && nextStep[0] === t ? 'next' : ''}"><i></i><b>${l}</b><span>${fmt.time(g.ts - t * 60000)}</span></div>`)}</div>
    ${out ? html`<div class="cpad gc-scene-inact"><div class="t-eyebrow">Inactive today</div>${[away, home].map((t, k) => html`<div class="gc-scene-in mt8">${UI.logo(t.id, 'sm')}<b class="lk-tri">${t.abbr}</b><span class="grow">${out[k].length ? out[k].map(i => `${i.n} (${i.pos})`).join(', ') : 'No one ruled out'}</span></div>`)}</div>`
      : html`<div class="cpad gc-scene-inact t-meta">Inactives are announced 90 minutes before kickoff.</div>`}
  </div>`;
}
/** the season stats side by side (Preview tab). s: the season the numbers come from */
/** Season at a glance (approved 2026-10-29): each team's chip over its own column, the numbers in Display in each team's Mark
    colour (from the Team Colors sheet) with the worse side dimmed, and the two bars meeting in the middle */
/** the comparison card (approved): team chips on top, then rows with each number in Display in its team's colour, the worse side dimmed,
    the label in the middle and two meters meeting in the middle. The one way the app compares two teams (Season at a glance, Team stats) */
const glMark = tm => (App.teamRoles(tm) || {}).mark || App.teamFill(tm);
/** apply-bars A (approved build-bars, 2026-11-09): the teams' real colours fill the bars (no text on them); if the two are too close to tell apart the home
    team uses its second colour. Values in Stats (small numbers), the leader's bold; lower-is-better flips the lead */
function barCols(away, home) { const a = away.color, h = App.contrast(away.color, home.color) < 1.6 ? home.alt : home.color; return [a, h]; }
function barHead(away, home) { return html`<div class="tb-h">${UI.logo(away.id, 'sm')}<span>${away.name}</span><span class="grow"></span><span>${home.name}</span>${UI.logo(home.id, 'sm')}</div>`; }
function barRow(m, label, sa, sh, va, vh, lower) {
  const [ca, ch] = barCols(m.away, m.home), x = Math.abs(+va || 0), y = Math.abs(+vh || 0), t = x + y, pa = t ? Math.round(x / t * 100) : 50;
  const aw = lower ? va < vh : va > vh, hw = lower ? vh < va : vh > va;
  return html`<div class="tb-r"><div class="tb-t"><b class="${aw ? 'on' : ''}">${sa}</b><span>${label}</span><b class="${hw ? 'on' : ''}">${sh}</b></div><div class="tb-b"><i style="flex:${pa};background:${ca}"></i><i style="flex:${100 - pa};background:${ch}"></i></div></div>`;
}
function glHead(away, home) {
  const chip = (tm, r) => html`<span class="gl-t ${r ? 'r' : ''}" style="${raw(App.teamVars(tm))}"><img src="${tm.logoDark || tm.logo}" alt=""><b>${tm.abbr}</b></span>`;
  return html`<div class="gl-h">${chip(away)}${chip(home, true)}</div>`;
}
/** one row: label, the shown values, the numbers behind them (for the meters and who is better), lower is better */
function glRow(m, label, sa, sh, va, vh, lower) {
  const ma = glMark(m.away), mh = glMark(m.home), mx = Math.max(Math.abs(va), Math.abs(vh)) || 1, pc = v => (Math.abs(v) / mx * 100).toFixed(1);
  const aw = lower ? va < vh : va > vh, hw = lower ? vh < va : vh > va;
  return html`<div class="gl-r"><b class="${aw ? '' : 'dim'}" style="--c:${ma}">${sa}</b><span>${label}</span><b class="r ${hw ? '' : 'dim'}" style="--c:${mh}">${sh}</b>
      <div class="gl-bar"><div><i style="width:${pc(va)}%;background:${ma}"></i></div><div><i style="width:${pc(vh)}%;background:${mh}"></i></div></div></div>`;
}
function glanceCard(m, s) {
  const { g, away, home } = m, ctx = seasonCtx(s), A = ctx.all[g.a] || {}, H = ctx.all[g.h] || {};
  const rows = glanceStats(A, H).map(([l, a, h, d, lower]) => { const f = v => fmt.n(v, d) + (l.includes('%') ? '%' : ''); return glRow(m, l, f(a), f(h), +a || 0, +h || 0, lower); });
  return html`<div class="mt24">${UI.secHead('Season at a glance', '', '', `${s}${s === g.s ? '' : ' (last season)'}`)}</div>
    <div class="gc-card gl">${glHead(away, home)}${rows}</div>`;
}
/** [label, away, home, decimals, lower is better] */
function glanceStats(A, H) {
  const stats = [
    ['Points per game', A.ppg, H.ppg, 1], ['Points allowed', A.papg, H.papg, 1, true], ['Yards per game', A.ypg, H.ypg, 0], ['Yards allowed', A.yapg, H.yapg, 0, true],
    ['Turnover margin', A.toDiff, H.toDiff, 0], ['3rd down %', A.thirdPct * 100, H.thirdPct * 100, 0], ['Red zone TD %', A.rzPct * 100, H.rzPct * 100, 0],
  ];
  if (UI.depth() >= 2) stats.push(['EPA / play (off)', A.epaPlay, H.epaPlay, 2], ['EPA / play (def)', A.dEpaPlay, H.dEpaPlay, 2, true]);
  return stats;
}
/** kickoff, venue, broadcast and the rest (Preview tab) */
/** Game info (approved 2026-10-29): the stadium photo, then stadium and city as the big words (Display S) with small labels,
    and every other fact as label and value under them */
function infoCard(m) {
  const { g, home } = m, venue = home.venue || {};
  const city = g.vc || (venue.city ? venue.city + (venue.state ? ', ' + venue.state : '') : '');
  return html`<div class="sec-head mt24"><div class="h2">Game info</div></div>
    <div class="gc-card flush gi2">${venue.img && !g.ns ? html`<div class="thumb" style="border-radius:0">${UI.img(venue.img)}</div>` : ''}
      <div class="cpad"><div class="gi2-big"><div><span class="t-eyebrow">${icon('stadium', 'xs')}Stadium</span><b class="t-ds">${g.vn || venue.name || 'TBD'}</b></div>${city ? html`<div><span class="t-eyebrow">${icon('pin', 'xs')}Location</span><b class="t-ds">${city}</b></div>` : ''}</div>
      ${UI.kv([['Kickoff', `${fmt.dayLong(g.ts)}, ${fmt.time(g.ts)} ${fmt.tzAbbr(g.ts)}`],
        ['Broadcast', (g.tv || []).join(', ') || 'TBD'], ['Surface', g.ns ? '' : venue.grass === false ? 'Artificial turf' : venue.grass ? 'Grass' : ''],
        ['Weather', m.box && m.box.wx ? `${m.box.wx.t}° · ${m.box.wx.c}` : venue.indoor ? 'Indoors' : 'Forecast closer to kickoff'],
        ['Officials', m.box && m.box.off && m.box.off.length ? (m.box.off.find(o => o[1] === 'Referee') || [])[0] + ' (referee)' : 'Crew announced later in the week'], ['Attendance', g.att ? fmt.n(g.att) : '']])}</div></div>`;
}
function previewTab(m) {
  const { g, away, home } = m;
  const now = time.now();
  const s = Dt.record(g.h, g.s, now).w + Dt.record(g.h, g.s, now).l + Dt.record(g.a, g.s, now).w + Dt.record(g.a, g.s, now).l > 2 ? g.s : g.s - 1;
  if (!App.NFL.d['box-' + s]) { Dt.ensureBox(s).then(() => App.refresh()); return UI.loading(); }
  const ctx = seasonCtx(s);
  const A = ctx.all[g.a] || {}, H = ctx.all[g.h] || {};
  const ac = App.readable(away), hc = App.readable(home);
  const rk = (tid, k, lower) => { const r = ctx.rank(tid, k, lower); return r ? fmt.ord(r) : '—'; };
  const sameSeason = s === g.s;
  // three things to watch
  const things = [];
  const pairs = [
    [g.h, g.a, 'epaPlay', 'dEpaPlay', 'offense', 'defense'], [g.a, g.h, 'epaPlay', 'dEpaPlay', 'offense', 'defense'],
  ];
  pairs.forEach(([o, d]) => {
    const ro = ctx.rank(o, 'epaPlay'), rd = ctx.rank(d, 'dEpaPlay', true);
    if (ro && rd) {
      if (ro <= 10 && rd >= 20) things.push(html`<b>${tm(o).name}' offense vs. a leaky defense.</b> ${tm(o).abbr} ranks ${fmt.ord(ro)} in ${UI.term('EPA', 'EPA')} per play; ${tm(d).abbr}'s defense is ${fmt.ord(rd)}.`);
      else if (ro >= 22 && rd <= 8) things.push(html`<b>Can ${tm(o).name} move the ball?</b> Their offense is ${fmt.ord(ro)} in EPA per play, and ${tm(d).abbr} has the league's ${fmt.ord(rd)}-ranked defense.`);
    }
  });
  [[g.a, A], [g.h, H]].forEach(([tid, T]) => {
    if (T.g && Math.abs(T.toDiff) >= 4) things.push(html`<b>Turnover battle.</b> ${tm(tid).name} are ${T.toDiff > 0 ? '+' : ''}${T.toDiff} in turnover margin${sameSeason ? ' this season' : ' last season'} (${rk(tid, 'toDiff')} in the NFL).`);
  });
  // star players
  const tot = Dt.seasonTotals(s, now);
  if (tot) {
    [g.a, g.h].forEach(tid => {
      const best = Object.values(tot).filter(L => L.tid === tid).map(L => ({ L, v: (L.cats.passing ? L.cats.passing.passingYards * .5 : 0) + (L.cats.rushing ? L.cats.rushing.rushingYards : 0) + (L.cats.receiving ? L.cats.receiving.receivingYards : 0) })).sort((a, b) => b.v - a.v)[0];
      if (!best) return;
      const L = best.L, c = L.cats;
      const line = c.passing && c.passing.passingYards > 300 ? `${fmt.n(c.passing.passingYards)} passing yards and ${c.passing.passingTouchdowns} TD` : c.rushing && c.rushing.rushingYards > (c.receiving ? c.receiving.receivingYards : 0) ? `${fmt.n(c.rushing.rushingYards)} rushing yards and ${c.rushing.rushingTouchdowns} TD` : c.receiving ? `${c.receiving.receptions} catches for ${fmt.n(c.receiving.receivingYards)} yards` : '';
      if (line) things.push(html`<b>Watch ${L.n}.</b> ${tm(tid).abbr}'s engine has ${line} in ${plural(L.gp, 'game')}${sameSeason ? '' : ' last season'}.`);
    });
  }
  const h2h = Dt.h2h(g.h, g.a, Math.min(now, g.ts - 1)).slice(0, 5);
  if (h2h.length >= 2) { const w = h2h.filter(x => (x.hs > x.as ? x.h : x.a) === g.h).length; things.push(html`<b>Recent history.</b> ${home.name} have won ${w} of the last ${h2h.length} meetings.`); }
  const inj = [g.a, g.h].map(tid => Dt.injuries(tid).filter(i => /Out|Doubtful|Questionable|Injured Reserve/.test(i.s || '')).slice(0, UI.depth() >= 3 ? 12 : 6));

  return html`${pregameScene(m)}
    <div class="gc-card gl mt16">${glHead(away, home)}
      <div class="gc-recs"><div><div class="big-num">${Dt.record(g.a, g.s, Math.min(now, g.ts - 1)).str}</div><div class="tiny">${away.conf} ${away.div}</div></div>
      <div class="tiny center">${sameSeason ? g.s + ' record' : 'Season opener'}</div>
      <div class="right"><div class="big-num">${Dt.record(g.h, g.s, Math.min(now, g.ts - 1)).str}</div><div class="tiny">${home.conf} ${home.div}</div></div></div></div>
    ${things.length ? html`<div class="sec-head mt24"><div class="h2">${Math.min(things.length, 3)} things to watch</div></div>
      <div class="gc-card flush">${things.slice(0, UI.depth() >= 3 ? 5 : 3).map((t, i) => html`<div class="gc-thing"><span class="gc-n">${i + 1}</span><div>${t}</div></div>`)}</div>` : ''}
    ${glanceCard(m, s)}
    ${h2h.length ? html`<div class="sec-head mt24"><div class="h2">Last meetings</div></div><div class="list">${h2h.map(x => { const w = x.hs > x.as ? x.h : x.as > x.hs ? x.a : null; return html`<a class="row tap" data-go="#/game/${x.id}"><div class="row-main"><div class="row-title">${tm(x.a).abbr} ${x.as} @ ${tm(x.h).abbr} ${x.hs}</div><div class="row-sub">${weekName(x)} · ${x.s}${w ? '' : ' · Tie'}</div></div>${w ? UI.logo(w, 'sm') : html`<span class="badge">Tie</span>`}${icon('chev', 'sm chev')}</a>`; })}</div>` : ''}
    ${inj.some(x => x.length) ? html`<div class="sec-head mt24"><div class="h2">Injury report</div></div><div class="gc-injgrid">${[g.a, g.h].map((tid, k) => html`<div class="list" style="margin:0">${html`<div class="row static">${UI.logo(tid, 'sm')}<div class="row-main b">${tm(tid).abbr}</div></div>`}${inj[k].length ? inj[k].map(i => html`<a class="row tap" data-go="#/player/${i.p}"><div class="row-main"><div class="row-title" style="font-size:13.5px">${shortName(i.n)} <span class="tiny">${i.pos}</span></div><div class="row-sub">${i.ty || ''}</div></div><span class="badge ${/Out|Reserve/.test(i.s) ? 'loss' : 'warn'}" title="${i.s}">${/Reserve/.test(i.s) ? 'IR' : /Question/.test(i.s) ? 'Q' : /Doubt/.test(i.s) ? 'D' : /Out/.test(i.s) ? 'OUT' : i.s}</span></a>`) : html`<div class="row static tiny">No listed injuries</div>`}</div>`)}</div>` : ''}
    ${infoCard(m)}`;
}

/* ---------- Recap */
function recapTab(m) {
  const { g, away, home } = m;
  const rc = (App.NFL.d['recaps-' + g.s] || {})[g.id];
  if (!App.NFL.d['recaps-' + g.s]) { App.load('recaps-' + g.s).then(() => App.refresh()); }
  const b = m.box;
  const qs = Math.max(4, (b && b.ls[g.h] || []).length);
  // approved round 5: each team an L1 line, the quarters in Stats bold under Stats bold caps heads, the total in Display, the loser's row at 60%
  const ls = b ? html`<div class="gc-card flush mt16"><table class="gc-ls"><thead><tr><th></th>${Array.from({ length: qs }, (_, i) => html`<th>${i < 4 ? i + 1 : 'OT'}</th>`)}<th>T</th></tr></thead>
    <tbody>${[g.a, g.h].map(tid => { const arr = b.ls[tid] || []; const tot = tid === g.h ? g.hs : g.as; const win = tot === Math.max(g.hs, g.as); return html`<tr class="${win ? '' : 'lost'}"><td>${UI.lk1(tid)}</td>${Array.from({ length: qs }, (_, i) => html`<td>${arr[i] ?? '–'}</td>`)}<td class="t"><span class="lk-sc">${tot}</span></td></tr>`; })}</tbody></table></div>` : '';
  const story = rc ? html`<div class="gc-card flush mt16 gc-story">${rc.img ? html`<div class="thumb" style="border-radius:0">${UI.img(rc.img)}</div>` : ''}
    <div class="cpad"><div class="eyebrow">Recap</div><div class="headline mt8">${rc.h}</div>${rc.by ? html`<div class="tiny mt8">By ${rc.by}</div>` : ''}
    <div class="article-body mt12 ${App.store.tmp.gcStory === g.id ? '' : 'gc-clamp'}">${raw(rc.b || '<p>' + esc(rc.d || '') + '</p>')}</div>
    ${App.store.tmp.gcStory === g.id ? '' : html`<button class="btn sm ghost mt8" data-act="gc-more">Read full story</button>`}</div></div>`
    : m.pbp && catchUp(m) ? catchUp(m) : b && b.rh ? html`<div class="gc-card mt16"><div class="eyebrow">Recap</div><div class="headline mt8">${b.rh}</div><div class="meta mt8">${b.rd || ''}</div></div>` : genRecap(m);
  const opts = Dt.watch(g);
  const watchList = html`<div class="sec-head mt24"><div class="h2">Watch it back</div></div><div class="list">${opts.map(o => html`<button class="row tap" ${raw(Dt.connectable(o) ? `data-act="sc-connect" data-arg="${g.id}|${Dt.provFor(o)}"` : `data-act="gc-opt" data-arg="${o.k}"`)}>${icon(o.k === 'highlights' ? 'play' : o.k === 'all22' ? 'grid' : 'layers', '')}<div class="row-main"><div class="row-title">${o.label}</div><div class="row-sub">${o.sub}</div></div>${o.ok ? icon('chev', 'sm chev') : UI.tierBadge(o.tier)}</button>`)}</div>`;
  const scoring = b && b.sp.length ? html`<div class="sec-head mt24"><div class="h2">Scoring summary</div></div><div class="list">${b.sp.map(s => spRow(s, true))}</div>` : '';
  return html`${ls}${m.pbp ? html`<div class="mt16">${keyMoments(m)}</div>` : ''}${story}${leadersCard(m) ? html`<div class="mt16">${leadersCard(m)}</div>` : ''}${scoring}${watchList}`;
}

function genRecap(m) {
  const { g, away, home } = m, b = m.box;
  if (g.hs == null) return '';
  const w = g.hs > g.as ? home : g.as > g.hs ? away : null, l = w === home ? away : home;
  const ws = Math.max(g.hs, g.as), ls = Math.min(g.hs, g.as);
  const lead = b ? b.ld.filter(x => w && x[0] === w.id).slice(0, 3) : [];
  const head = w ? `${w.name} beat ${l.name} ${ws}-${ls}${g.t === 3 && g.w === 5 ? ' to win Super Bowl ' + Dt.sbNumeral(g.s) : ''}` : `${away.name} and ${home.name} tie ${ws}-${ls}`;
  return html`<div class="gc-card mt16"><div class="eyebrow">Game summary</div><div class="headline mt8">${head}</div>
    <div class="meta mt8" style="font-size:14.5px;line-height:1.5">${g.vn ? `At ${g.vn}${g.vc ? ', ' + g.vc : ''}. ` : ''}${lead.map(x => `${x[3]}: ${x[4]}.`).join(' ')}</div></div>`;
}

/* ---------- React (emoji + preset takes; no free text) */
function rxTop(c, n) { return Object.entries(c).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, n); }
function rxPulse(m, list) {
  const { g, away, home } = m; let a = 1, h = 1;
  list.slice(-8).forEach((x, i, arr) => { const w = Math.pow(.7, arr.length - 1 - i); a += x.noise[g.a] * w; h += x.noise[g.h] * w; });
  const pa = Math.round(a / (a + h) * 100), louder = pa > 50 ? away : home;
  // approved round 5: two meters meeting in the middle in each team's own primary; each side is logo, Display tricode and the share in Stats bold
  const side = (t, v, r) => html`<span class="rx-side ${r ? 'r' : ''}">${UI.logo(t.id, 'sm')}<span class="lk-tri">${t.abbr}</span><b class="rx-num">${v}%</b></span>`;
  return html`<div class="rx-pulse"><div class="flex between"><span class="t-eyebrow">Fan pulse</span><span class="t-meta">${Math.abs(pa - 50) < 4 ? 'Dead even' : `${louder.name} fans are louder`}</span></div>
    <div class="rx-pmeters"><div class="meter r"><i style="width:${pa}%;background:${away.color}"></i></div><div class="meter"><i style="width:${100 - pa}%;background:${home.color}"></i></div></div>
    <div class="flex between mt8">${side(away, pa)}${side(home, 100 - pa, true)}</div></div>`;
}
function rxTitle(x, m) {
  if (x.key === 'pre') return m.st === 'pre' ? 'Kickoff hype' : 'Pregame hype';
  if (x.final) return 'Final whistle';
  const t = clean(x.p.x).replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+([.,])/g, '$1').replace(/\s*\[[^\]]*\]/g, '').trim();
  return t.length > 110 ? t.slice(0, t.lastIndexOf(' ', 108)) + '…' : t;
}
function rxNow(m, C) {
  const x = C.list[C.list.length - 1];
  if (!x) return '';
  const t = x.team ? tm(x.team) : null, mine = ((store.tmp.rx || {})[m.g.id] || {})[x.key] || {};
  // approved round 5: the clock in Stats bold caps over the play in Title S, the pills, then quick takes as squared buttons with the share as a 6 px meter
  return html`<div class="rx-now card">
    <div class="flex gap8">${t ? UI.logo(t.id, 'sm') : icon('users', 'sm')}<span class="rx-when">${x.p ? qLine(x.p) : html`<span class="rx-clk">${m.st === 'pre' ? `Kickoff ${fmt.until(m.g.ts)}` : 'Game over'}</span>`}</span></div>
    <div class="t-title-s mt6">${rxTitle(x, m)}</div>
    <div class="rx-tally">${rxTop(x.c, 5).map(([k, v]) => html`<span class="rx-chip ${mine[k] ? 'on' : ''}">${RXE[k]} <b class="num">${fmt.n(v)}</b></span>`)}</div>
    <div class="t-eyebrow mt12">Quick take</div>
    <div class="rx-takes">${x.takes.map(tk => { const on = x.take === tk.l; const pct = x.take ? Math.round(tk.pct * .97 + (on ? 3 : 0)) : null; return html`<button class="rx-take ${on ? 'on' : ''}" data-act="gc-take" data-arg="${x.key}|${tk.l}"><span class="rx-take-l"><span>${tk.l}</span>${pct != null ? html`<b class="rx-num">${pct}%</b>` : ''}</span>${pct != null ? html`<span class="meter"><i style="width:${pct}%;background:var(--text)"></i></span>` : ''}</button>`; })}</div>
  </div>`;
}
function rxFeed(m, C) {
  const keys = C.list.slice(0, -1).filter(x => x.key === 'pre' || x.final || ['td', 'to', 'big', 'sack', 'fg', 'miss'].includes(x.kind)).reverse().slice(0, 30);
  if (!keys.length) return '';
  const max = Math.max(...C.list.map(x => x.total));
  return html`<div style="margin-top:24px">${UI.secHead('Biggest reactions')}</div><div class="rx-feed">${keys.map(x => html`<div class="rx-row">
    <div class="rx-heat"><i style="height:${Math.max(8, Math.round(x.total / max * 100))}%"></i></div>
    <div class="grow"><div class="rx-when">${x.p ? qLine(x.p) : ''}${x.p && x.p.sc ? html`<span class="t-meta"> · ${x.p.as}-${x.p.hs}</span>` : ''}</div><div class="t-title-s mt4">${rxTitle(x, m)}</div>
      <div class="rx-tally">${rxTop(x.c, 3).map(([k, v]) => html`<span class="rx-chip">${RXE[k]} <b class="num">${fmt.n(v)}</b></span>`)}${x.take ? html`<span class="badge">You: ${x.take}</span>` : ''}</div></div></div>`)}</div>`;
}
function reactTab(m) {
  const C = crowd(m);
  return html`<div class="rx">
    <div class="rx-head pad"><div><div class="t-title">React with ${fmt.n(C.fans)} fans</div><div class="t-meta mt4">${icon('eyeoff', 'xs')} Emoji and quick takes only. Reactions land in step with your game clock.</div></div></div>
    <div class="rx-stage" aria-hidden="true"></div>
    <div class="rx-bar">${RX.map(x => html`<button class="rx-btn" data-act="gc-rx" data-arg="${x.k}" aria-label="${x.l}">${x.e}</button>`)}</div>
    <div class="rx-live">${rxLive(m, C)}</div></div>`;
}
function rxLive(m, C) { return html`<div class="pad mt12">${rxNow(m, C)}</div><div class="pad mt12">${rxPulse(m, C.list)}</div>${rxFeed(m, C)}`; }
/** float emoji up out of the reaction bar */
function rxBurst(el, k, n, from) {
  const stage = el && el.querySelector('.rx-stage'); if (!stage || document.documentElement.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const bar = el.querySelector('.rx-bar').getBoundingClientRect(), sr = stage.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span'); s.className = 'rx-float'; s.textContent = RXE[k];
    const x0 = from ? from.left + from.width / 2 - sr.left : 20 + Math.random() * (bar.width - 40);
    s.style.left = (x0 + (Math.random() - .5) * 30) + 'px'; s.style.setProperty('--dx', ((Math.random() - .5) * 60) + 'px');
    s.style.animationDelay = (i * 70 + Math.random() * 60) + 'ms'; s.style.fontSize = (20 + Math.random() * 12) + 'px';
    s.addEventListener('animationend', () => s.remove()); stage.appendChild(s);
  }
}

/* ---------- Predict (free picks for points) */
function predictTab(m) {
  const { g, away, home, st, hide } = m;
  const mine = store.p.picks[g.id];
  const r = rng('pk' + g.id);
  const rh = Dt.record(g.h, g.s, Math.min(time.now(), g.ts - 1)), ra = Dt.record(g.a, g.s, Math.min(time.now(), g.ts - 1));
  const pct = (x) => x.w + x.l ? x.w / (x.w + x.l) : .5;
  let ph = Math.round(Math.min(85, Math.max(15, 54 + (pct(rh) - pct(ra)) * 45 + (r() - .5) * 12)));
  const fanCount = 20000 + Math.floor(r() * 180000);
  const card = (t, p, isHome) => {
    const chosen = mine && mine.team === t.id;
    // approved round 5: squared, logo L48; after you pick, the 6 px meter in the team's own primary and the share as an L4 stat pair;
    // your side outlined 2 px in its primary with the soft "Your pick" badge
    return html`<button class="gc-pick ${chosen ? 'on' : ''}" style="--tc:${t.color}" data-act="gc-pick" data-arg="${t.id}" ${st !== 'pre' ? raw('disabled') : ''}>
      ${UI.logo(t.id, 'lg')}<span class="lk-nm">${t.name}</span><span class="t-meta">${isHome ? 'Home' : 'Away'} · <span class="lk-rec">${(isHome ? rh : ra).str}</span></span>
      ${mine || st !== 'pre' ? html`<div class="meter"><i style="width:${p}%;background:${t.color}"></i></div>${UI.lk4(p + '%', 'of fans')}` : ''}${chosen ? html`<span class="badge">Your pick</span>` : ''}</button>`;
  };
  let status;
  if (st === 'pre') status = mine ? html`<div class="notice">${icon('check', 'sm')}<span>Locked in. Correct picks earn <b>+10 fan points</b>. You can change it until kickoff (${fmt.until(g.ts)}).</span></div>`
    : html`<div class="notice">${icon('target', 'sm')}<span>Who wins? Pick before kickoff to earn <b>+10 fan points</b>, just for fun.</span></div>`;
  else if (st === 'live') status = html`<div class="notice">${icon('lock', 'sm')}<span>Picks locked at kickoff. ${mine ? `You picked ${tm(mine.team).name}.` : 'You didn\'t make a pick for this one.'}</span></div>`;
  else {
    const winner = g.hs > g.as ? g.h : g.as > g.hs ? g.a : null;
    if (hide) status = html`<div class="notice">${icon('eyeoff', 'sm')}<span>Result hidden by your spoiler shield.</span></div>`;
    else if (mine) { const ok = mine.team === winner; status = html`<div class="notice">${icon(ok ? 'trophy' : 'refresh', 'sm')}<span>${ok ? html`<b>Nailed it.</b> You picked ${tm(mine.team).name}: +10 fan points.` : html`You picked ${tm(mine.team).name}. Not this time, but there's always next week.`}</span></div>`; }
    else status = html`<div class="notice">${icon('info', 'sm')}<span>${fmt.n(fanCount)} fans made picks. ${Math.round(winner === g.h ? ph : 100 - ph)}% called it.</span></div>`;
  }
  return html`<div class="mt16">${status}</div><div class="gc-picks">${card(away, 100 - ph, false)}${card(home, ph, true)}</div>
    <div class="tiny pad center mt12">${fmt.n(fanCount)} fans have picked · Picks are free and only for fan points and bragging rights.</div>
    <div class="pad mt16"><button class="btn ghost block" data-go="#/pickem">${icon('list', 'sm')} Make all your picks for the week</button></div>`;
}

/* ------------------------------------------------------------------ page */
/* ---------- Live: catch up, key moments and a running feed (after Google's live game feed and X's Gametime) */
// "J.Herbert" / "A.St. Brown" / "Patrick Mahomes" -> surname
const sur = n => !n ? '' : /^[A-Z][a-z]?\./.test(n) ? n.replace(/^[A-Z][a-z]?\./, '') : n.split(' ').slice(1).join(' ') || n;
const times = n => n === 1 ? 'once' : n === 2 ? 'twice' : n + ' times';
const RE_INT = /INTERCEPTED by ([A-Z][A-Za-z'\-]*\.[A-Za-z'\-]+)/;
/** every visible play with the score before it, its win-chance swing and what kind of moment it was */
function annotate(m) {
  if (!m.pbp) return [];
  const vis = m.st === 'live' ? m.plays : Dt.flat(m.pbp);
  let as = 0, hs = 0, wp = null;
  return vis.map((p, i) => {
    const o = { p, i, as, hs, kind: playKind(p), dwp: p.wp != null && wp != null && p.ty !== 'Kickoff' ? p.wp - wp : 0 };
    if (p.wp != null) wp = p.wp;
    if (p.as != null) { as = p.as; hs = p.hs; }
    o.as2 = as; o.hs2 = hs;
    return o;
  });
}
/** a short caption for a play, like a highlight title */
function momentText(p, g) {
  const t = clean(p.x), y = Math.abs(p.y || 0), k = playKind(p);
  const qb = RE_PASSER.exec(t), rc = RE_RECV.exec(t), ru = RE_RUSHER.exec(t);
  const td = /TOUCHDOWN/.test(t) && !/INTERCEPT|FUMBLE/.test(t);
  if (/INTERCEPT/.test(t)) { const by = RE_INT.exec(t); return `${by ? sur(by[1]) + ' picks off ' : 'Interception thrown by '}${qb ? sur(qb[1]) : 'the quarterback'}`; }
  if (p.to && /FUMBLE/.test(t)) { const d = g && tm(p.team === g.a ? g.h : g.a); return `${ru ? sur(ru[1]) + ' fumbles' : 'Fumble'}, and ${d ? 'the ' + d.name + ' recover' : 'the defense recovers'}`; }
  if (k === 'fg' || k === 'miss') { const d = /(\d+) yard field goal/.exec(t); const kk = RE_RUSHER.exec(t); return `${kk ? sur(kk[1]) + "'s " : ''}${d ? d[1] + '-yard ' : ''}field goal ${k === 'fg' ? 'is good' : 'is no good'}`; }
  if (/^Sack/.test(p.ty)) return `${qb ? sur(qb[1]) : 'The quarterback'} is sacked for a loss of ${y}`;
  if (PASS_T.test(p.ty) && qb && rc) return td ? `${sur(qb[1])} hits ${sur(rc[1])} for a ${y}-yard touchdown` : `${sur(qb[1])} connects with ${sur(rc[1])} for ${y} yards`;
  if (RUSH_T.test(p.ty) && ru) return td ? `${sur(ru[1])} scores on a ${y}-yard run` : `${sur(ru[1])} breaks off a ${y}-yard run`;
  const s = t.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+([.,])/g, '$1').trim();
  return s.length > 90 ? s.slice(0, s.lastIndexOf(' ', 88)) + '…' : s;
}
/** the story so far in three sentences, plus three standout lines */
function catchUp(m) {
  const A = annotate(m); if (A.length < 12) return '';
  const { g, away, home, st } = m, live = st === 'live';
  const as = live ? m.S.as : g.as, hs = live ? m.S.hs : g.hs;
  const lead = as > hs ? away : hs > as ? home : null, trail = lead === away ? home : lead ? away : null;
  const hi = Math.max(as, hs), lo = Math.min(as, hs);
  const v = (now, then) => live ? now : then;
  const B = liveBox(st === 'live' ? m : { ...m, plays: Dt.flat(m.pbp) }), P = B.P, T = B.T;
  const scores = A.filter(x => x.p.sc && x.p.team);
  const how = tid => {
    const mine = scores.filter(x => x.p.team === tid);
    const rush = mine.filter(x => RUSH_T.test(x.p.ty)), pass = mine.filter(x => /Passing Touchdown/.test(x.p.ty)), fgs = mine.filter(x => x.kind === 'fg');
    return { mine, rush, pass, fgs };
  };
  const out = [];
  if (lead) {
    const H = how(lead.id);
    let s = v(`The ${lead.name} lead ${hi}-${lo}`, `The ${lead.name} beat the ${trail.name} ${hi}-${lo}`);
    if (H.rush.length > H.pass.length) {
      const top = P.filter(p => p.cat === 'rushing' && p.tid === lead.id && p.td).sort((a, b) => b.td - a.td || b.yds - a.yds)[0];
      s += top ? `, leaning on the ground game as ${sur(top.n)} found the end zone ${times(top.td)}` : ', leaning on the ground game';
    } else if (H.pass.length) {
      const qb = P.filter(p => p.cat === 'passing' && p.tid === lead.id).sort((a, b) => (b.td || 0) - (a.td || 0))[0];
      s += qb && qb.td ? `, with ${sur(qb.n)} throwing ${plural(qb.td, 'touchdown pass').replace('touchdown passs', 'touchdown passes')}` : ' through the air';
    } else if (H.fgs.length && H.fgs.length === H.mine.length) s += ', every point from field goals';
    out.push(s + '.');
  } else out.push(v(`The ${away.name} and ${home.name} are tied at ${as}.`, `The ${away.name} and ${home.name} finished tied at ${as}.`));
  const side = trail || home;
  const big = A.filter(x => x.p.team === side.id && (PASS_T.test(x.p.ty) || RUSH_T.test(x.p.ty)) && !/INTERCEPT/.test(x.p.x || '')).sort((a, b) => (b.p.y || 0) - (a.p.y || 0))[0];
  const tos = (T[side.id] || {}).to || 0, H2 = how(side.id);
  if (big && (big.p.y || 0) >= 20) {
    const t = clean(big.p.x), rc = RE_RECV.exec(t), ru = RE_RUSHER.exec(t);
    const what = PASS_T.test(big.p.ty) && rc ? `a ${big.p.y}-yard catch by ${sur(rc[1])}` : ru ? `a ${big.p.y}-yard run by ${sur(ru[1])}` : `a ${big.p.y}-yard gain`;
    const but = tos ? `, but ${v('have', '')}${v(' turned it over', 'turned it over')} ${times(tos)}` : H2.fgs.length && H2.fgs.length === H2.mine.length ? `, but ${v('have had', 'had')} to settle for field goals` : '';
    out.push(`The ${side.name} ${v('have had', 'had')} their moments, including ${what}${but}.`);
  } else if (tos) out.push(`The ${side.name} ${v('have', '')}${v(' turned it over', 'turned it over')} ${times(tos)}.`);
  if (lead) {
    const sacks = (T[trail.id] || {}).sacks || 0, take = (T[trail.id] || {}).to || 0;
    const bits = [sacks ? plural(sacks, 'sack') : '', take ? plural(take, 'takeaway') : ''].filter(Boolean);
    if (bits.length) out.push(`The ${lead.name} defense ${v('has', 'had')} ${bits.join(' and ')}.`);
  }
  const best = (cat, k) => P.filter(p => p.cat === cat).sort((a, b) => (b[k] || 0) - (a[k] || 0))[0];
  const qb = best('passing', 'yds'), wr = best('receiving', 'yds'), rb = best('rushing', 'yds');
  // round 5 v2: each point is a bare 20 px icon in its player's team colour (the second sheet colour when the primary is near
  // black, so it still reads as a colour), the player's name in Sans bold
  const col = tid => { const t = tm(tid) || home, p = App.teamFill(t); return App.lum(p) < .045 && t.alt && App.lum(t.alt) > .045 && App.lum(t.alt) < .9 ? t.alt : p; };
  const lines = [];
  if (qb && qb.att >= 5) lines.push(['football', qb, `${v('is', 'went')} ${qb.cmp || 0} of ${qb.att} for ${qb.yds || 0} yards${qb.td ? ' and ' + plural(qb.td, 'touchdown') : ''}${qb.int ? ', with ' + plural(qb.int, 'interception') : ''}.`]);
  if (wr && wr.rec >= 2) lines.push(['target', wr, `${v('is', 'was')} the top target: ${plural(wr.rec, 'catch').replace('catchs', 'catches')} for ${wr.yds || 0} yards.`]);
  if (rb && rb.car >= 4) lines.push(['bolt', rb, `${v('has', 'had')} ${rb.car} carries for ${rb.yds || 0} yards${rb.td ? ' and ' + plural(rb.td, 'touchdown') : ''}.`]);
  return html`<section class="lv-cu"><div class="lv-cu-top"><span class="t-eyebrow">${v('Catch up', 'How it went')}</span>${UI.lk5(live ? m.S : { st: 'post', label: 'Final' })}</div><p class="lv-story">${out.join(' ')}</p>
    ${lines.length ? html`<ul class="lv-pts">${lines.map(([ic, p, t]) => html`<li><span class="lv-ic" style="color:${col(p.tid)}">${icon(ic, 'sm')}</span><span><b class="lk-pn">${sur(p.n)}</b> ${t}</span></li>`)}</ul>` : ''}</section>`;
}
/** key moments: a slider of moment cards (round 5, option b "No picture"). One card per moment, newest first: a team-colour
 *  edge on top, the logo and "kind · quarter clock", the play in Sans bold, then the score after it as the big number beside a
 *  squared play button. Snap scroll, the next card peeks, "1 of N" and dots follow the scroll. */
const KM_KIND = { td: 'Touchdown', to: 'Takeaway', big: 'Big play', fg: 'Field goal' };
function keyMoments(m, n = 6) {
  const A = annotate(m); if (!A.length) return '';
  const { g, away, home } = m;
  const weight = x => Math.abs(x.dwp) + (x.kind === 'td' ? 12 : x.kind === 'to' ? 10 : x.kind === 'big' ? 5 : x.kind === 'fg' ? 3 : 0);
  const pick = A.filter(x => KM_KIND[x.kind]).sort((a, b) => weight(b) - weight(a)).slice(0, n).sort((a, b) => b.i - a.i);
  if (pick.length < 2) return '';
  const card = x => {
    const off = x.kind === 'to' ? (x.p.team === g.a ? home : away) : tm(x.p.team) || home, r = rng('km' + g.id + x.i);
    const dur = `0:${String(8 + Math.floor(r() * 14)).padStart(2, '0')}`, cap = momentText(x.p, g);
    const arg = JSON.stringify({ title: cap, sub: `${away.abbr} at ${home.abbr} · ${qLabel(x.p).split(' · ')[0]}`, kind: 'Highlight', team: off.id });
    const s = (t, v) => html`<span class="km3-s${t.id === off.id ? '' : ' dim'}"><b class="lk-tri">${t.abbr}</b><b class="lk-sc">${v}</b></span>`;
    return html`<div class="km3" style="${raw('--tp:' + App.teamFill(off))}"><span class="km3-k">${UI.logo(off.id, 'sm')}<span>${KM_KIND[x.kind]} · ${x.p.q > 4 ? 'OT' : 'Q' + x.p.q} ${x.p.c || ''}</span></span>
      <b class="km3-play">${cap}</b>
      <div class="km3-foot"><span class="km3-sc">${s(away, x.as2)}${s(home, x.hs2)}</span><button class="btn sm" data-act="play-video" data-arg="${arg}">${icon('play', 'sm')} ${dur}</button></div></div>`;
  };
  return html`<section class="lv-km"><div class="lv-h pad flex between km3-head"><span>Key moments</span><span class="km3-n">1 of ${pick.length}</span></div>
    <div class="km3-rail">${pick.map(card)}</div><div class="km3-dots">${pick.map((_, i) => html`<i class="${i ? '' : 'on'}"></i>`)}</div></section>`;
}
/* the slider's count and dots follow the card snapped to the left edge */
document.addEventListener('scroll', e => {
  const r = e.target; if (!(r instanceof Element) || !r.classList.contains('km3-rail')) return;
  const c = r.firstElementChild; if (!c) return;
  const i = Math.round(r.scrollLeft / (c.offsetWidth + 12)), sec = r.closest('.lv-km'), n = r.children.length;
  const k = Math.min(n - 1, r.scrollLeft + r.clientWidth >= r.scrollWidth - 2 ? n - 1 : i);
  const lab = sec.querySelector('.km3-n'); if (lab) lab.textContent = `${k + 1} of ${n}`;
  sec.querySelectorAll('.km3-dots i').forEach((d, j) => d.classList.toggle('on', j === k));
}, true);
/** the running feed: big plays, quarter breaks, win-chance swings, scoring runs and how fans reacted */
function liveFeed(m) {
  const A = annotate(m); if (!A.length) return '';
  const { g, away, home, st } = m;
  const C = crowd(m), rx = Object.fromEntries(C.list.map(x => [x.key, x]));
  const items = [];
  let run = { tid: null, pts: 0, n: 0 };
  A.forEach((x, k) => {
    const nx = A[k + 1];
    if (['td', 'to', 'big', 'fg', 'miss', 'sack'].includes(x.kind)) items.push({ t: 'play', x });
    if (Math.abs(x.dwp) >= 12) items.push({ t: 'swing', x });
    if (x.p.sc && x.p.team) {
      const pts = (x.as2 + x.hs2) - (x.as + x.hs);
      if (pts > 0) { const scorer = x.as2 > x.as ? g.a : g.h; run = run.tid === scorer ? { tid: scorer, pts: run.pts + pts, n: run.n + 1 } : { tid: scorer, pts, n: 1 }; if (run.n >= 2 && run.pts >= 10) items.push({ t: 'run', x, run: { ...run } }); }
    }
    if (nx && nx.p.q !== x.p.q && x.p.q <= 4) items.push({ t: 'q', x });
  });
  const shown = items.reverse().slice(0, 28);
  const team = id => tm(id) || home;
  const row = it => {
    const x = it.x, p = x.p;
    if (it.t === 'q') return html`<div class="lf-q"><span>End of the ${ORD[p.q]} quarter</span><b>${away.abbr} ${x.as2} · ${home.abbr} ${x.hs2}</b></div>`;
    if (it.t === 'swing') {
      const ben = x.dwp > 0 ? home : away, now = x.dwp > 0 ? p.wp : 100 - p.wp, was = now - Math.abs(x.dwp);
      return html`<div class="lf-item lf-ins"><div class="lf-dot">${icon('chart', 'xs')}</div><div class="lf-card"><div class="lf-k">Win chance swing</div>
        <div class="lf-t">That play moved the ${ben.name} from ${was}% to ${now}%.</div><div class="lf-bar"><i style="${raw(`width:${now}%;background:${App.readable(ben, '#111111')}`)}"></i></div></div></div>`;
    }
    if (it.t === 'run') { const t = team(it.run.tid); return html`<div class="lf-item lf-ins"><div class="lf-dot">${icon('fire', 'xs')}</div><div class="lf-card"><div class="lf-k">Momentum</div><div class="lf-t">The ${t.name} ${st === 'live' ? 'have' : 'had'} scored ${it.run.pts} straight points.</div></div></div>`; }
    const t = x.kind === 'to' ? (p.team === g.a ? home : away) : team(p.team), big = x.kind === 'td' || x.kind === 'to', r = rx['p' + x.i];
    const head = x.kind === 'td' ? `Touchdown, ${t.name}` : x.kind === 'to' ? `Takeaway, ${t.name}` : x.kind === 'fg' ? `Field goal, ${t.name}` : x.kind === 'miss' ? 'Missed field goal' : x.kind === 'sack' ? 'Sack' : 'Big play';
    const arg = JSON.stringify({ title: momentText(p, g), sub: `${away.abbr} at ${home.abbr} · ${qLabel(p).split(' · ')[0]}`, kind: 'Highlight', team: t.id });
    return html`<div class="lf-item ${big ? 'big' : ''}" style="${raw('--tc:' + App.readable(t))}"><div class="lf-dot">${UI.logo(t.id, 'xs')}</div>
      <div class="lf-card tap" data-act="gc-play" data-arg="${x.i}"><div class="lf-top"><span class="lf-k">${head}</span><span class="lf-when">${p.q > 4 ? 'OT' : 'Q' + p.q} ${p.c || ''}</span></div>
        <div class="lf-t">${momentText(p, g)}</div>
        <div class="lf-foot">${p.sc ? html`<span class="lf-sc">${away.abbr} ${x.as2} · ${home.abbr} ${x.hs2}</span>` : ''}${r ? html`<span class="lf-rx">${rxTop(r.c, 3).map(([k2, n]) => html`<span class="rx-chip">${raw(RXE[k2])} <b class="num">${fmt.n(n)}</b></span>`)}</span>` : ''}
          ${big || x.kind === 'big' ? html`<button class="btn sm lf-play" data-act="play-video" data-arg="${arg}">${icon('play', 'xs')}Watch</button>` : ''}</div></div></div>`;
  };
  return html`<section class="lv-feed"><div class="lv-h pad flex between"><span>${st === 'live' ? 'Live feed' : 'Timeline'}</span>${st === 'live' ? html`<span class="lf-live"><i></i>Updating</span>` : ''}</div>
    <div class="lf">${shown.map(row)}</div><div class="pad mt12"><button class="btn sm ghost" data-act="gc-tab" data-arg="plays">Every play, drive by drive ${icon('chev', 'xs')}</button></div></section>`;
}
/** Live (in progress): the situation now, the story so far, win chance, key moments, the feed.
 *  Game flow (final): win chance and the full timeline. The recap carries the story and key moments. */
App.playCaption = (p, g) => momentText(p, g);
// the design system draws these from a game id
App.gameParts = { playScoreKind, pregameScene, model, hero, actionsStrip, nowCard, wpCard, catchUp, keyMoments, liveFeed, pinBug, tabList, leadersCard, leaderRows, shortName, glanceCard, glanceStats, infoCard, playsTab, seasonCtx };
function liveTab(m) {
  if (!m.pbp) return scoringOnly(m, 'Play-by-play tracking is available for 2025 and 2026 games. Here\'s every score.');
  if (!annotate(m).length) return UI.empty('football', 'Kickoff is moments away', 'The feed fills in as plays happen.');
  if (m.st === 'live') return html`<div class="mt12">${nowCard(m)}</div>${catchUp(m)}<div class="mt16">${wpCard(m)}</div>${keyMoments(m)}${liveFeed(m)}`;
  return html`<div class="mt12">${wpCard(m)}</div>${liveFeed(m)}`;
}

function body(m, page) {
  const tab = page.state.tab;
  if (m.hide && !['preview', 'fans'].includes(tab)) {
    return html`<div class="empty">${icon('eyeoff')}<div class="h3">Spoiler shield is on</div><div class="meta mt6">Results for ${m.away.name} and ${m.home.name} are hidden until you've watched.</div>
      <button class="btn primary mt16" data-act="gc-reveal">${icon('eye', 'sm')} Reveal everything</button></div>`;
  }
  switch (tab) {
    case 'live': return liveTab(m);
    case 'plays': return playsTab(m, page);
    case 'stats': return statsTab(m, page);
    case 'fans': return fansTab(m, page);
    case 'preview': return previewTab(m);
    case 'recap': return recapTab(m);
  }
  return '';
}
/** the broadcast-style score bug pinned to the bottom once the hero scrolls away */
function pinBug(m) {
  // the approved score bug (round 6 v2): one soft blend from the away primary to the home primary under a flat scrim,
  // each side an L1 (logo disc, Display tricode and score), the Live badge with the clock and the down in the middle
  const { g, S, away, home, st, hide } = m;
  if (st === 'pre') return '';
  const sc = v => hide ? '–' : v;
  const lost = (a, b) => S.final && a < b ? ' lost' : '';
  const ball = tid => st === 'live' && !hide && S.poss === tid ? html`<i class="pb-poss" title="Has the ball"></i>` : '';
  const side = (t, v, o, right) => html`<div class="pb-t${right ? ' h' : ''}${lost(v, o)}"><span class="pb-disc"><img src="${t.logo}" alt=""></span><b class="lk-tri">${t.abbr}</b>${ball(t.id)}<b class="lk-sc">${sc(v)}</b></div>`;
  const mid = st === 'live' ? html`<span class="badge live">${hide ? 'Live' : S.label}</span>${!hide && S.dd ? html`<span class="pb-dd r-down-distance">${S.dd}</span>` : ''}` : html`<span class="badge">${S.label}</span>`;
  return html`<button class="pb-in" data-act="gc-top" aria-label="Back to the top" style="${raw(`--ca:${App.teamFill(away)};--ch:${App.teamFill(home)}`)}">${side(away, S.as, S.hs)}<div class="pb-mid">${mid}</div>${side(home, S.hs, S.as, true)}</button>`;
}
/** what kind of score one play is: 'td' | 'fg' | 'two' | 'safety' | null (extra points don't count) */
function playScoreKind(p) {
  const x = p.x || '', ty = p.ty || '';
  if (/TWO-POINT CONVERSION ATTEMPT.*SUCCEEDS/i.test(x)) return 'two';
  if (/Touchdown/i.test(ty) || /TOUCHDOWN/.test(x)) return 'td';
  if (/extra point/i.test(x) || /Extra Point/.test(ty)) return null;
  if (/Field Goal Good|field goal is GOOD/i.test(ty + ' ' + x)) return 'fg';
  if (/Safety/i.test(ty) || /SAFETY/.test(x)) return 'safety';
  return null;
}
/** what kind of score just happened between two play indexes */
function scoreKind(m, fromIdx) {
  const ps = m.plays.slice(fromIdx + 1).filter(p => p.sc).reverse();
  for (const p of ps) { const kind = playScoreKind(p); if (kind) return { kind, p }; }
  return null;
}
function defaultTab(m) { return m.st === 'pre' ? 'preview' : m.st === 'live' ? 'live' : 'recap'; }
function sig(m) { return m.st + ':' + (m.L ? m.L.idx : '') + ':' + m.hide; }

/* ---------- watching live: the stream docks at the top of the game page, the tabs scroll under it */
/** a stream the app can play right here: NFL+ / DAZN, or a streaming service you've connected (not antenna or cable) */
const liveSource = g => { const ok = Dt.watch(g).filter(o => o.ok); return ok.find(o => o.k === 'nflplus' || o.k === 'dazn') || ok.find(o => o.tier === 'tv' && !['antenna', 'cable'].includes(Dt.provFor(o))); };
/** a final game's full replay: NFL+ Premium (Game Pass abroad), ready a couple of hours after the final whistle */
const REPLAY_LAG = 2 * 3600e3;
const replayReady = g => !!g && g.t !== 1 && Dt.state(g) === 'post' && time.now() - Dt.endTs(g) >= REPLAY_LAG
  && (Dt.isIntl() ? (store.p.providers || []).includes('dazn') : UI.hasTier('premium'));
App.replayReady = replayReady;
const RP_KINDS = { replay: 'Full game', condensed: 'Condensed' };
/** the replay as a Continue watching entry (same id as the Replays library uses) */
const rpVideo = (g, kind) => App.watchParts && App.watchParts.gameVideo ? App.watchParts.gameVideo(g, kind) : { id: g.id + kind, game: g.id, title: `${tm(g.a).name} at ${tm(g.h).name}`, kind: RP_KINDS[kind] };
function bugHtml(m) {
  const { S } = m;
  return m.hide ? 'Live' : `${esc(m.away.abbr)} <b>${S.as ?? ''}</b> &nbsp;${esc(m.home.abbr)} <b>${S.hs ?? ''}</b> <span>${esc(S.label || '')}</span>`;
}
/* ---------- picture in picture: the stream shrinks to a corner and follows you around the app */
const pip = App.pip = {
  gid: null, el: null, mode: null,
  box() {
    let b = document.querySelector('#device > .pip');
    if (!b) { b = document.createElement('div'); b.className = 'pip'; b.hidden = true; document.getElementById('device').appendChild(b); }
    return b;
  },
  open(gid, player, mode = 'live') {
    const b = pip.box(); pip.gid = gid; pip.el = player; pip.mode = mode;
    b.innerHTML = pipChrome().toString();
    player.querySelector('video').controls = false;
    b.prepend(player); b.hidden = false; pip.update(); App.emit('pip');
  },
  /** hand the player back to its game page */
  take(gid, mode = 'live') { if (pip.gid !== gid || pip.mode !== mode) return null; const el = pip.el; pip.gid = null; pip.el = null; pip.mode = null; pip.box().hidden = true; App.emit('pip'); return el; },
  close() { if (pip.el) { const v = pip.el.querySelector('video'); if (v) v.pause(); pip.el.remove(); } pip.gid = null; pip.el = null; pip.mode = null; pip.box().hidden = true; App.emit('pip'); },
  update() {
    if (!pip.gid) return; const sc = pip.box().querySelector('.pip-sc'); if (!sc) return;
    const g = Dt.game(pip.gid);
    sc.innerHTML = pip.gid === 'redzone' ? `<b>NFL RedZone</b> <span>Live</span>` : pip.mode === 'replay' ? `${esc(tm(g.a).abbr)} @ ${esc(tm(g.h).abbr)} <span>Replay</span>` : bugHtml(model(g));
  },
  live: gid => gid === 'redzone' ? Dt.liveGames().some(g => !Dt.nationalWindow(g) && g.t === 2) : Dt.state(Dt.game(gid)) === 'live',
  /** one stream at a time: while something plays in the corner, a page's own player waits, paused, behind a play button */
  hold(box) { const v = box.querySelector('video'); if (v) { v.autoplay = false; v.pause(); v.controls = false; } box.classList.add('held'); },
  /** the play button on a waiting player (game page or RedZone page) */
  heldBtn: () => html`<button class="gcp-held" data-act="gcp-resume"><span class="gcp-held-i">${icon('play')}</span><span class="gcp-held-t">Play here</span><span class="gcp-held-s">Picture-in-picture is playing</span></button>`,
  /** starting a page's stream ends whatever is in the corner */
  claim(box) { const v = box.querySelector('video'); v.addEventListener('play', () => { if (box.classList.contains('held')) { box.classList.remove('held'); v.controls = true; } if (pip.gid && !box.closest('.pip')) pip.close(); }); },
};
App.on('tick', () => { pip.update(); if (pip.gid && pip.mode === 'live' && !pip.live(pip.gid)) pip.close(); });

/** the video lives outside the page's markup so re-renders (tab switches, ticks) never restart it */
/** the corner player's own controls: tap to go back to the stream's page, the score (or what's playing), close */
const pipChrome = () => html`<button class="pip-open" data-act="pip-open" aria-label="Back to the game"></button><div class="pip-sc"></div>
  <button class="icon-btn pip-x" data-act="pip-close" aria-label="Close">${icon('close', 'sm')}</button>`;
/** what's inside the docked player (.gcp): the video, Full game / Condensed on a replay, PiP and Cast, and the waiting cover.
 *  The design system draws it with { still: true } so nothing autoplays there. */
function playerHtml(mode, kind, o = {}) {
  return html`<video src="assets/video/highlights.mp4${o.still ? '#t=6' : ''}" ${raw(o.still ? 'muted preload="auto"' : 'autoplay')} playsinline ${raw(mode === 'live' ? 'loop' : '')} ${raw(o.held ? '' : 'controls')}></video>
    ${mode === 'replay' ? html`<div class="gcp-mode" role="group" aria-label="Replay">${Object.entries(RP_KINDS).map(([k, l]) => html`<button class="${k === kind ? 'on' : ''}" data-act="gc-rp" data-arg="${k}" aria-pressed="${k === kind ? 'true' : 'false'}">${l}</button>`)}</div>` : ''}
    <button class="icon-btn gcp-pip" data-act="gc-pip" aria-label="Picture in picture">${icon('pip', 'sm')}</button>
    <button class="icon-btn gcp-cast" data-act="toast" data-arg="Casting to Living Room TV" aria-label="Cast">${icon('cast', 'sm')}</button>
    ${pip.heldBtn()}`;
}
function makePlayer(mode, kind) {
  const d = document.createElement('div'); d.className = 'gcp'; d.dataset.mode = mode;
  d.innerHTML = playerHtml(mode, kind).toString();
  pip.claim(d);
  return d;
}
Object.assign(App.gameParts, { playerHtml, pipChrome, bugHtml, wlRow });
/** a replay picks up where you left off, and every pause saves the spot for Continue watching */
function replayResume(g, kind, v) {
  const key = App.video.key(rpVideo(g, kind)), was = (store.p.resume || []).find(r => r.key === key);
  const go = () => { v.currentTime = was ? was.t : 0; };
  if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
}
const topHtml = (m, docked, watching) => html`${hero(m, docked)}${actionsStrip(m, watching, docked)}`;
function dropPlayer(st) { if (st.player) { const v = st.player.querySelector('video'); if (v) v.pause(); st.player.remove(); st.player = null; } }

function view(g, page) {
  const m = model(g);
  if (!page.state) {
    const q = OLD_TAB[page.query.tab] || [page.query.tab];
    page.state = { tab: q[0] || defaultTab(m), filter: 'all', open: {}, boxTeam: 'away', fpts: false };
    if (q[0] === 'stats' && q[1]) page.state.statsView = q[1];
    if (q[0] === 'fans' && q[1]) page.state.fansView = q[1];
  }
  if (!tabList(m).some(t => t.k === page.state.tab)) page.state.tab = defaultTab(m);
  page.state.sig = sig(m); page.state.st = m.st;
  // a live game you can stream plays on its own, under the header (not behind the spoiler shield)
  const watching = m.st === 'live' && !m.hide && (!!liveSource(g) || page.query.watch === '1');
  // a final game's replay docks in the same spot. It starts at kickoff, so it plays behind the spoiler shield too
  // (the header just keeps the score hidden), which is exactly how you'd catch up on a game you missed
  const mode = watching ? 'live' : replayReady(g) ? 'replay' : null;
  if (page.state.player && page.state.player.dataset.mode !== mode) dropPlayer(page.state);
  if (mode === 'replay' && !page.state.rpKind) page.state.rpKind = page.query.rp === 'condensed' ? 'condensed' : 'replay';
  page.state.rp = mode === 'replay';
  m.watching = watching;
  if (m.st === 'live' && !page.state.score && typeof m.S.as === 'number') { page.state.score = { as: m.S.as, hs: m.S.hs }; page.state.idx = m.L ? m.L.idx : -1; }
  const following = (store.p.followGames || []).includes(g.id);
  return {
    titleHtml: html`<div class="phead-title center" style="margin-right:-40px"><div style="font-size:15px">${m.away.abbr} @ ${m.home.abbr}</div><div class="tiny" style="font-weight:500">${weekName(g)} · ${g.t === 3 ? g.s + ' season' : g.s}</div></div>`,
    right: html`<button class="icon-btn" data-act="gc-follow" aria-label="Alerts">${icon('bell', following ? 'fill' : '')}</button><button class="icon-btn" data-act="gc-share" aria-label="Share">${icon('share')}</button>`,
    className: 'gc-page',
    html: html`${m.st !== 'pre' && App.scoreTicker ? App.scoreTicker(g.id) : ''}${mode ? html`<div class="gc-player"></div>` : ''}<div class="gc-topwrap">${topHtml(m, !!mode, watching)}</div>
      <div class="sticky-sub gc-tabs">${UI.tabs(tabList(m), page.state.tab, 'gc-tab')}</div>
      <div class="gc-body">${body(m, page)}</div>
      <div class="gc-pin" aria-hidden="true">${pinBug(m)}</div>`,
    mount(el) {
      el.classList.toggle('watching', !!mode);
      const slot = el.querySelector('.gc-player');
      if (slot) {
        const st = page.state, fresh = !st.player;
        // reclaim this game from picture-in-picture; anything else in the corner keeps playing and this player waits
        let back = null;
        if (fresh) {
          back = pip.take(g.id, mode); st.player = back || makePlayer(mode, st.rpKind);
          const rv = st.player.querySelector('video');
          if (!back && mode === 'replay') {
            replayResume(g, st.rpKind, rv); rv.addEventListener('pause', () => App.video.remember(rpVideo(g, st.rpKind), rv));
            // finishing the replay lifts the spoiler shield, if "Reveal after I watch" is on
            rv.addEventListener('ended', () => {
              const sp = store.p.spoiler; if (!Dt.spoiled(g) || (sp && sp.autoReveal === false)) return;
              (store.p.watched = store.p.watched || []).push(g.id); store.save();
              App.toast({ title: 'Score revealed', body: 'You finished the replay, so the spoiler shield is off for this game.', icon: 'eye' }); App.refreshAll();
            });
          }
        }
        slot.appendChild(st.player); st.player.querySelector('video').controls = true;
        const v = st.player.querySelector('video');
        if (fresh && !back && pip.gid) pip.hold(st.player);
        else if (fresh || !v.paused) v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });  // no sound allowed yet: start muted
        // the tabs stick under the stream, and the score bug pins once the mini header slides under it;
        // both depend on the player's height, which is only known once the page is on screen
        const mini = el.querySelector('.gc-mini'), pin = el.querySelector('.gc-pin'); let io2 = null;
        const fit = () => {
          const h = slot.offsetHeight; if (!h) return;
          el.style.setProperty('--plh', h + 'px');
          if (io2) io2.disconnect();
          if (mini && 'IntersectionObserver' in window) { io2 = new IntersectionObserver(([e]) => pin && pin.classList.toggle('show', !e.isIntersecting && e.rootBounds && e.boundingClientRect.top < e.rootBounds.top), { root: el, rootMargin: `-${52 + h}px 0px 0px 0px`, threshold: 0 }); io2.observe(mini); }
        };
        const ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null; if (ro) ro.observe(slot); fit();
        page.cleanup.push(() => { if (ro) ro.disconnect(); if (io2) io2.disconnect(); });
        return null;
      }
      const top = el.querySelector('.gc-topwrap'), pin = el.querySelector('.gc-pin'); if (!top || !pin || !('IntersectionObserver' in window)) return null;
      const io = new IntersectionObserver(([e]) => pin.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0), { root: el, threshold: 0 });
      io.observe(top);
      return () => io.disconnect();
    },
    tick(el, pg) {
      const m2 = model(g);
      if (m2.st !== pg.state.st || replayReady(g) !== pg.state.rp) return pg.render();
      const s2 = sig(m2);
      if (m2.st === 'pre') { const cd = el.querySelector('.hst-sub'); if (cd) cd.textContent = 'Kickoff in ' + fmt.until(g.ts); const sc = el.querySelector('.gc-scene'); if (sc) sc.outerHTML = pregameScene(m2).toString(); return; }
      const watching2 = m2.st === 'live' && !m2.hide && (!!liveSource(g) || pg.query.watch === '1'); m2.watching = watching2;
      if (pg.state.player) {
        // another tab of the app is showing: don't keep playing behind it, and pick back up on return
        const v = pg.state.player.querySelector('video');
        if (App.current() !== pg) { if (!v.paused) { v.pause(); v.dataset.auto = '1'; } }
        else if (v.dataset.auto) { delete v.dataset.auto; if (pip.gid) pip.hold(pg.state.player); else v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); }
      }
      if (s2 === pg.state.sig) return;
      pg.state.sig = s2;
      el.querySelector('.gc-topwrap').innerHTML = topHtml(m2, !!pg.state.player, watching2).toString();
      const pin = el.querySelector('.gc-pin'); if (pin) pin.innerHTML = pinBug(m2).toString();
      // a score since the last tick: celebrate it
      const was = pg.state.score, idx0 = pg.state.idx;
      if (m2.st === 'live' && !m2.hide && was && typeof m2.S.as === 'number' && (m2.S.as > was.as || m2.S.hs > was.hs)) {
        const k = scoreKind(m2, idx0 == null ? -1 : idx0);
        if (k) UI.celebrate({ kind: k.kind, team: m2.S.as > was.as ? g.a : g.h, away: g.a, home: g.h, as: m2.S.as, hs: m2.S.hs, was, text: momentText(k.p, g) });
      }
      if (m2.st === 'live' && typeof m2.S.as === 'number') { pg.state.score = { as: m2.S.as, hs: m2.S.hs }; pg.state.idx = m2.L ? m2.L.idx : -1; }
      const fv = pg.state.tab === 'fans' ? fansView(m2, pg) : '';
      if (fv === 'react') { const lv = el.querySelector('.rx-live'); if (lv) { const C = crowd(m2); lv.innerHTML = rxLive(m2, C).toString(); const x = C.list[C.list.length - 1]; if (x && x.key !== pg.state.rxLast) { pg.state.rxLast = x.key; rxTop(x.c, 3).forEach(([k], i) => rxBurst(el, k, 4 - i)); } } }
      else if (fv !== 'predict' && pg.state.tab !== 'preview') el.querySelector('.gc-body').innerHTML = body(m2, pg).toString();
    },
  };
}

App.route('game/:id', (params, query, page) => {
  const g = Dt.game(params.id);
  if (!g) return { title: 'Game', html: UI.empty('football', 'Game not found', 'This game isn\'t in the schedule.') };
  const need = [];
  if (!App.NFL.d['box-' + g.s]) need.push(Dt.ensureBox(g.s));
  if (g.s >= 2025 && g.st === 'post' && !Dt.D.live[g.id]) need.push(Dt.ensurePbp(g.id).catch(() => null));
  if (need.length) return Promise.all(need).then(() => view(g, page));
  return view(g, page);
});

/* ------------------------------------------------------------------ actions */
const A = App.actions;
const cur = () => App.current();
const curGame = () => Dt.game(cur().params.id);
A['gc-tab'] = (el, ev, k) => { const p = cur(); p.state.tab = k; p.render(); const t = p.el.querySelector('.gc-tabs'); if (t && p.el.scrollTop > t.offsetTop) p.el.scrollTop = t.offsetTop - 52; };
A['gc-filter'] = (el, ev, k) => { cur().state.filter = k; cur().render(); };
A['gc-drive'] = (el, ev, di) => { const s = cur().state; const node = el.closest('.gc-drive-card'); s.open[di] = !node.classList.contains('open'); cur().render(); };
A['gc-q'] = (el, ev, k) => { cur().state.q = +k; cur().render(); };
A['gc-boxteam'] = (el, ev, k) => { cur().state.boxTeam = k; cur().render(); };
A['gc-top'] = () => { const p = cur(); if (p) p.el.scrollTo({ top: 0, behavior: 'smooth' }); };
A['gc-statsview'] = (el, ev, k) => { cur().state.statsView = k; cur().render(); };
A['gc-fansview'] = (el, ev, k) => { cur().state.fansView = k; cur().render(); };
A['gc-fpts'] = () => { cur().state.fpts = !cur().state.fpts; cur().render(); };
A['gc-more'] = () => { App.store.tmp.gcStory = cur().params.id; cur().render(); };
A['gc-reveal'] = () => { const g = curGame(); store.p.watched = store.p.watched || []; store.p.watched.push(g.id); store.save(); App.toast({ title: 'Revealed', body: 'Spoiler shield lifted for this game.', icon: 'eye' }); cur().render(); };
A['gc-follow'] = () => {
  const g = curGame(); const l = store.p.followGames = store.p.followGames || [];
  const i = l.indexOf(g.id); if (i >= 0) l.splice(i, 1); else l.push(g.id); store.save();
  App.toast({ title: i >= 0 ? 'Game alerts off' : 'Game alerts on', body: i >= 0 ? '' : 'Kickoff, scoring plays, big moments and the final.', icon: 'bell' });
  cur().render();
};
A['gc-share'] = () => { const g = curGame(); try { navigator.clipboard && navigator.clipboard.writeText(location.href.split('#')[0] + '#/game/' + g.id); } catch {} App.toast({ title: 'Link copied', body: `${tm(g.a).name} at ${tm(g.h).name}`, icon: 'share' }); };
A['gc-remind'] = () => { const g = curGame(); App.toast({ title: 'Added to your calendar', body: `${tm(g.a).abbr} @ ${tm(g.h).abbr} · ${fmt.day(g.ts)} ${fmt.time(g.ts)}`, icon: 'calendar' }); };
/** every "Watch live" in the app lands here: the game page with the stream docked on top */
App.watchGame = (gid, checked) => {
  const g = Dt.game(gid); if (!g) return;
  App.closeOverlays && App.closeOverlays(true);
  if (Dt.state(g) !== 'live') return App.go('#/game/' + gid);
  if (!checked && !liveSource(g)) return App.go('#/game/' + gid), setTimeout(() => A['gc-where'](), 350);
  const p = cur();
  if (p && /^#\/game\//.test(p.hash) && p.params.id === gid) { p.el.scrollTop = 0; return; }
  App.go('#/game/' + gid + (liveSource(g) ? '' : '?watch=1'));
};
A['gc-watch'] = () => App.watchGame(curGame().id);
A['gc-pip'] = () => { const p = cur(), st = p.state; if (!st.player) return; pip.open(p.params.id, st.player, st.player.dataset.mode); st.player = null; App.back(); };
A['pip-open'] = () => { const gid = pip.gid; if (gid === 'redzone') App.go('#/channel/redzone'); else if (pip.mode === 'replay') App.go('#/game/' + gid); else if (gid) App.watchGame(gid, true); };
A['gcp-resume'] = (el) => { const v = el.parentElement.querySelector('video'); if (v) v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); };
/** full game or condensed: each keeps its own spot */
A['gc-rp'] = (el, ev, k) => {
  const p = cur(), st = p.state, g = curGame(); if (!st.player || st.rpKind === k) return;
  const v = st.player.querySelector('video'); App.video.remember(rpVideo(g, st.rpKind), v);
  st.rpKind = k; st.player.querySelectorAll('.gcp-mode button').forEach(b => { const on = b.dataset.arg === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  replayResume(g, k, v); v.play().catch(() => {});
};
A['pip-close'] = () => pip.close();
App.on('nav', () => document.querySelectorAll('.page .gcp video').forEach(v => { const pg = v.closest('.page'); if (!v.paused && (!App.current() || App.current().el !== pg)) { v.pause(); v.dataset.auto = '1'; } }));
A['gc-watch-id'] = (el, ev, gid) => App.watchGame(gid);
A['gc-full'] = () => { const v = cur().state.player && cur().state.player.querySelector('video'); if (!v) return; try { (v.requestFullscreen || v.webkitEnterFullscreen).call(v); } catch {} };
A['gc-opt'] = (el, ev, k) => {
  const g = curGame(); const o = Dt.watch(g).find(x => x.k === k);
  if (!o) return;
  if (!o.ok) return App.go('#/plans?t=' + (o.tier === 'premium' ? 'premium' : 'plus'));
  if (k === 'audio') return A['gc-listen']();
  if (k === 'redzone') return App.go('#/channel/redzone');
  if (Dt.state(g) === 'live' && k !== 'audio') return App.watchGame(g.id, true);
  App.video.play({ title: `${tm(g.a).name} at ${tm(g.h).name}`, sub: o.label, kind: o.label, live: Dt.state(g) === 'live' ? g.id : null, tier: o.tier === 'premium' || o.tier === 'plus' ? o.tier : undefined });
};
/** a Watch & listen row (approved 2026-10-29): icon tile, label (Title S), what it is (Meta), the NFL+ tag on plan rows,
    and one control from the Controls family. Watch / Listen is Tertiary before kickoff and Primary once it's on;
    a plan you don't have is See plans on the NFL+ upsell; a service you haven't connected is Connect. The whole row taps through. */
function wlRow(g, o) {
  const live = Dt.state(g) === 'live', plan = o.tier === 'plus' || o.tier === 'premium';
  const ic = o.k === 'audio' ? 'headphones' : o.tier === 'tv' ? 'tv' : 'play';
  const act = o.ok ? html`<span class="btn sm ${live ? 'primary' : 'ghost'}">${icon(ic, 'sm')}${o.k === 'audio' ? 'Listen' : 'Watch'}</span>`
    : plan ? html`<span class="btn sm plus">See plans</span>` : html`<span class="btn sm ghost">${Dt.connectable(o) ? 'Connect' : 'How to watch'}</span>`;
  return html`<button class="wl-r tap" data-act="gc-opt" data-arg="${o.k}"><span class="wl-i">${icon(ic, 'sm')}</span><div class="grow"><div class="t-title-s">${o.label}</div><div class="t-meta">${o.sub}</div>${plan ? html`<div class="mt6">${UI.tierBadge(o.tier)}</div>` : ''}</div>${act}</button>`;
}
A['gc-where'] = () => {
  const g = curGame(); const opts = Dt.watch(g);
  const intl = Dt.isIntl();
  App.sheet({ title: 'Where to watch', html: html`<div class="pad"><div class="flex gap10 mb12">${UI.logo(g.a)}<div class="grow"><div class="b">${tm(g.a).name} at ${tm(g.h).name}</div><div class="tiny">${fmt.dayLong(g.ts)} · ${fmt.time(g.ts)} ${fmt.tzAbbr(g.ts)}${(g.tv || []).length ? ' · ' + g.tv.join(', ') : ''}</div></div>${UI.logo(g.h)}</div>
    <div class="tiny mb8">${intl ? 'Outside the US, every game streams on NFL Game Pass on DAZN.' : Dt.inMarket(g) ? 'This is a local game in your market.' : Dt.nationalWindow(g) ? 'This is a national broadcast, available everywhere.' : 'This game is out of your local market.'} Based on your location and the services you've told us about.</div></div>
    <div class="wl">${opts.map(o => wlRow(g, o))}</div>
    <div class="pad mt16"><button class="btn ghost block" data-go="#/settings/services">${icon('sliders', 'sm')} Update my services & location</button>
      <button class="btn ghost block mt8" data-go="#/watch-spots">${icon('users', 'sm')} Watch with fans near you</button></div>` });
};
A['gc-listen'] = () => {
  const g = curGame();
  if (!UI.hasTier('plus') && !Dt.isIntl()) return App.go('#/plans?t=plus');
  const feeds = [[g.h, `${tm(g.h).name} Radio Network`, 'Home call'], [g.a, `${tm(g.a).name} Radio Network`, 'Away call'], [null, 'Westwood One', 'National call'], [null, 'Spanish-language call', 'Español']];
  let on = 0;
  const draw = () => html`<div class="pad"><div class="gc-audio"><div class="gc-eq">${[0, 1, 2, 3, 4].map(i => html`<i style="animation-delay:${i * .12}s"></i>`)}</div><div class="grow"><div class="b">${feeds[on][1]}</div><div class="tiny">${feeds[on][2]} · live</div></div><button class="icon-btn solid" data-act="close-sheet">${icon('pause')}</button></div>
    <div class="tiny mt12 mb8">Choose a broadcast</div></div><div class="list">${feeds.map((f, i) => html`<button class="row tap" data-act="gc-feed" data-arg="${i}">${f[0] ? UI.logo(f[0], 'sm') : icon('radio')}<div class="row-main"><div class="row-title">${f[1]}</div><div class="row-sub">${f[2]}</div></div>${i === on ? icon('check', 'sm accent') : ''}</button>`)}</div>
    <div class="pad mt12 tiny">Tip: radio usually runs a few seconds ahead of TV. Use "Sync to TV" to delay it to match your screen.</div><div class="pad mt8"><button class="btn ghost block" data-act="toast" data-arg="Synced to your TV (+6 sec)">${icon('clock', 'sm')} Sync to TV</button></div>`;
  const sh = App.sheet({ title: 'Listen live', html: draw() });
  A['gc-feed'] = (el, ev, i) => { on = +i; App.updateSheet(sh, draw()); };
};
A['gc-play'] = (el, ev, idx) => {
  const g = curGame(); const pbp = Dt.D.live[g.id]; if (!pbp) return;
  const all = Dt.flat(pbp); const i = +idx, p = all[i]; if (!p) return;
  let prevWp = null; for (let k = i - 1; k >= 0; k--) if (all[k].wp != null) { prevWp = all[k].wp; break; }
  const nx = all.slice(i + 1).find(x => x.dn);
  const ex = explain(p, nx, prevWp, g);
  const off = tm(p.team) || tm(g.h);
  App.sheet({ titleHtml: html`<div class="flex gap8">${UI.logo(off.id, 'sm')}<div><div class="h3">${ex.title}</div><div class="tiny">${qLabel(p)}</div></div></div>`,
    html: html`<div class="pad"><div class="mb12">${UI.fieldViz(g, { L: Dt.live(g), playIdx: i, compact: true, animate: true })}</div><div class="gc-ptext-big">${clean(p.x)}</div>
      <div class="eyebrow mt20">In plain English</div>
      <div class="gc-explain mt8">${ex.out.map(s => html`<p>${s}</p>`)}</div>
      ${ex.terms.length ? html`<div class="eyebrow mt16">Learn the terms</div><div class="flex wrap gap8 mt8">${ex.terms.map(t => html`<button class="chip" data-act="term" data-arg="${t}">${icon('book', 'xs')}${t}</button>`)}</div>` : ''}
      <div class="flex gap8 mt20"><button class="btn sm ghost grow" data-act="play-video" data-arg="${JSON.stringify({ title: ex.title + ': ' + off.name, sub: qLabel(p), kind: 'Play clip', team: off.id })}">${icon('play', 'sm')} Watch the play</button><button class="btn sm ghost grow" data-act="toast" data-arg="Clip shared">${icon('share', 'sm')} Share</button></div></div>` });
};
A['gc-catchup'] = () => {
  const g = curGame(); const m = model(g);
  if (m.hide) { store.p.watched = store.p.watched || []; store.p.watched.push(g.id); store.save(); }
  let items = [];
  if (m.pbp) {
    const all = Dt.flat(m.pbp), vis = m.st === 'live' ? m.plays : all;
    let prev = 50;
    vis.forEach((p, i) => {
      const d = p.wp != null ? p.wp - prev : 0; if (p.wp != null) prev = p.wp;
      const big = (PASS_T.test(p.ty) || RUSH_T.test(p.ty)) && (p.y || 0) >= 25;
      if (p.sc || p.to || /INTERCEPT/.test(p.x || '') || big || Math.abs(d) >= 15) items.push({ p, i, d });
    });
  } else if (m.box) items = m.box.sp.map(s => ({ p: { x: s.x, q: s.q, c: s.c, team: s.t, hs: s.hs, as: s.as, sc: 1, ty: s.ty } }));
  items = items.slice(-14);
  if (!items.length) return App.toast({ title: 'Nothing big yet', body: 'Check back after the first big play.', icon: 'clock' });
  const headline = p => p.sc ? (/Field Goal|FG/.test(p.ty) ? 'Field goal' : /Safety|SF/.test(p.ty) ? 'Safety' : 'Touchdown') : (p.to || /INTERCEPT/.test(p.x || '')) ? (/INTERCEPT/.test(p.x || '') ? 'Interception' : 'Turnover') : (p.y || 0) >= 25 ? `${p.y}-yard ${RUSH_T.test(p.ty) ? 'run' : 'catch'}` : 'Momentum swing';
  let idx = 0, timer;
  const benefit = p => { const lost = p.to || /INTERCEPT/.test(p.x || '') || (/FUMBLE/.test(p.x || '') && /RECOVERED by/.test(p.x || '') && !p.sc); if (lost && p.team) return p.team === g.h ? g.a : g.h; if (!p.sc && p.d) return p.d > 0 ? g.h : g.a; return p.team; };
  items.forEach(it => { it.p = Object.assign({}, it.p, { d: it.d }); });
  const slide = (it, k) => { const t = tm(benefit(it.p)) || tm(g.h); return html`<div class="cu-slide" style="background:${t.color}"><img class="cu-mark" src="${t.logoDark || t.logo}" alt="">
      <div class="cu-top">${UI.logo(t.id, 'md')}<div><div class="cu-q">${it.p.q > 4 ? 'OT' : 'Q' + it.p.q} · ${it.p.c || ''}</div><div class="cu-team">${t.name}</div></div></div>
      <div class="cu-head">${headline(it.p)}</div><div class="cu-text">${clean(it.p.x)}</div>
      <div class="cu-score"><span>${tm(g.a).abbr} <b>${it.p.as ?? ''}</b></span><span>${tm(g.h).abbr} <b>${it.p.hs ?? ''}</b></span>${it.p.wp != null ? html`<span class="cu-wp">${tm(g.h).abbr} win prob ${it.p.wp}%</span>` : ''}</div>
      <div class="cu-n">${k + 1} / ${items.length}</div></div>`; };
  App.modal({ className: 'cu-modal', html: html`<div class="cu-bars">${items.map(() => html`<i><b></b></i>`)}</div>
      <div class="cu-head-row"><div class="b">Catch up in 60 seconds</div><button class="icon-btn" data-act="close-modal" style="color:#fff">${icon('close')}</button></div>
      <div class="cu-track">${items.map(slide)}</div>
      <div class="cu-nav"><button data-cu="-1" aria-label="Previous"></button><button data-cu="1" aria-label="Next"></button></div>`,
    mount(el) {
      const track = el.querySelector('.cu-track'), bars = [...el.querySelectorAll('.cu-bars i')];
      const per = Math.max(3000, 60000 / items.length);
      const show = k => { idx = Math.max(0, Math.min(items.length - 1, k)); track.style.transform = `translateX(${-idx * 100}%)`; bars.forEach((b, j) => { b.className = j < idx ? 'done' : j === idx ? 'on' : ''; b.firstChild.style.animationDuration = per + 'ms'; }); clearTimeout(timer); timer = setTimeout(() => { if (idx < items.length - 1) show(idx + 1); }, per); };
      el.querySelectorAll('[data-cu]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); show(idx + (+b.dataset.cu)); }));
      show(0);
      return () => clearTimeout(timer);
    } });
};
A['gc-pick'] = (el, ev, tid) => {
  const g = curGame(); if (Dt.state(g) !== 'pre') return;
  const had = store.p.picks[g.id];
  store.p.picks[g.id] = { team: tid, at: time.now() };
  if (!had) store.p.points = (store.p.points || 0) + 1;
  store.save();
  App.toast({ title: `You picked ${tm(tid).name}`, body: had ? 'Pick updated.' : '+1 fan point for playing. +10 more if you\'re right.', logo: tm(tid).logo });
  cur().render();
};
const rxLatest = () => { const m = model(curGame()); return crowd(m).list.slice(-1)[0]; };
A['gc-rx'] = (el, ev, k) => {
  const g = curGame(), x = rxLatest(); if (!x) return;
  const R = store.tmp.rx = store.tmp.rx || {}, mine = (R[g.id] = R[g.id] || {})[x.key] = R[g.id][x.key] || {};
  mine[k] = (mine[k] || 0) + 1;
  const pg = cur(); rxBurst(pg.el, k, 5, el.getBoundingClientRect());
  const lv = pg.el.querySelector('.rx-live'); const m = model(g); if (lv) lv.innerHTML = rxLive(m, crowd(m)).toString();
  if (navigator.vibrate) navigator.vibrate(8);
};
A['gc-take'] = (el, ev, arg) => {
  const g = curGame(), [key, l] = arg.split('|'); const T = store.tmp.takes = store.tmp.takes || {}; const t = T[g.id] = T[g.id] || {};
  t[key] = t[key] === l ? undefined : l;
  const pg = cur(), lv = pg.el.querySelector('.rx-live'), m = model(g); if (lv) lv.innerHTML = rxLive(m, crowd(m)).toString();
};
})();
