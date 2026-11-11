/* ============================================================================
   Home (For You), Catch me up, Search, Inbox, News + Article reader,
   live-alert engine and the bottom live mini-bar.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, fmt, store, time, t } = App;
const UI = App.UI, Dt = App.data;
const A = App.actions;

/* ------------------------------------------------------------------ helpers */
const P = () => store.p;
const team = id => Dt.team(id);
const myTeams = () => P().teams || [];
const primary = () => P().primary && team(P().primary) ? P().primary : myTeams()[0] || null;
/** teams a fan cares about: followed teams + teams of followed players */
function caredTeams() {
  const s = new Set(myTeams());
  (P().players || []).forEach(pid => { const p = Dt.player(pid); if (p && p.t) s.add(p.t); });
  return [...s];
}
const involves = (g, ids) => ids.includes(g.h) || ids.includes(g.a);
const short = tm => (tm.loc === 'New York' || tm.loc === 'Los Angeles') ? tm.short : tm.name;
const DAY = 864e5;
function hashSeed(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function dayIndex() { return Math.floor(time.now() / DAY); }

/** a play's scoring label + the scoring team, derived from the score change */
function scoreInfo(plays, k, g) {
  const p = plays[k];
  let ph = 0, pa = 0;
  for (let j = k - 1; j >= 0; j--) if (plays[j].hs != null) { ph = plays[j].hs; pa = plays[j].as; break; }
  const dh = (p.hs ?? ph) - ph, da = (p.as ?? pa) - pa;
  const tid = dh > da ? g.h : da > dh ? g.a : p.team;
  const pts = Math.max(dh, da);
  const label = /Touchdown/.test(p.ty) || pts >= 6 ? 'Touchdown' : /Field Goal/.test(p.ty) || pts === 3 ? 'Field goal' : /Safety/.test(p.ty) || pts === 2 && !/Two/.test(p.ty) ? 'Safety' : p.ty || 'Score';
  return { tid, label, pts };
}

/* ------------------------------------------------------------------ live player lines from play-by-play text */
function playerKey(pid) {
  const p = Dt.player(pid); if (!p) return null;
  const ln = (p.ln || '').replace(/\s+(Jr\.?|Sr\.?|II|III|IV|V)$/, '');
  return ((p.fn || '')[0] || '') + '.' + ln;
}
function liveLine(pid, g) {
  const L = Dt.live(g); if (!L || L.idx < 0) return null;
  const key = playerKey(pid); if (!key) return null;
  const o = { cmp: 0, att: 0, pyd: 0, ptd: 0, int: 0, car: 0, ryd: 0, rtd: 0, rec: 0, yds: 0, tdr: 0, touched: false };
  const startsWith = s => s.startsWith(key + ' ') || s.startsWith('(Shotgun) ' + key + ' ') || s.startsWith('(No Huddle, Shotgun) ' + key + ' ') || s.startsWith('(No Huddle) ' + key + ' ');
  for (let k = 0; k <= L.idx; k++) {
    const p = L.plays[k], x = p.x || '', ty = p.ty || '', y = p.y || 0;
    if (p.pen && !/Pass|Rush/.test(ty)) continue;
    const passer = startsWith(x) && / pass /.test(x);
    const target = x.includes(' to ' + key + ' ') || x.includes(' to ' + key + '.');
    if (/Pass Reception|Passing Touchdown/.test(ty)) {
      if (passer) { o.cmp++; o.att++; o.pyd += y; if (/Touchdown/.test(ty)) o.ptd++; o.touched = true; }
      if (target) { o.rec++; o.yds += y; if (/Touchdown/.test(ty)) o.tdr++; o.touched = true; }
    } else if (/Pass Incompletion/.test(ty)) { if (passer) { o.att++; o.touched = true; } }
    else if (/Interception/.test(ty)) { if (passer) { o.att++; o.int++; o.touched = true; } }
    else if (/^Rush|Rushing Touchdown/.test(ty)) {
      if (startsWith(x)) { o.car++; o.ryd += y; if (/Touchdown/.test(ty)) o.rtd++; o.touched = true; }
    }
  }
  const fp = Math.round((o.pyd / 25 + o.ptd * 4 - o.int * 2 + o.ryd / 10 + o.rtd * 6 + o.rec + o.yds / 10 + o.tdr * 6) * 10) / 10;
  const parts = [];
  if (o.att) parts.push(`${o.cmp}/${o.att}, ${o.pyd} yds${o.ptd ? `, ${o.ptd} TD` : ''}${o.int ? `, ${o.int} INT` : ''}`);
  if (o.car) parts.push(`${o.car} car, ${o.ryd} yds${o.rtd ? `, ${o.rtd} TD` : ''}`);
  if (o.rec) parts.push(`${o.rec} rec, ${o.yds} yds${o.tdr ? `, ${o.tdr} TD` : ''}`);
  return { text: parts.join(' · ') || 'No touches yet', fp, touched: o.touched };
}
/** final line from a box score line object */
function boxLine(cats) {
  const parts = [];
  const p = cats.passing, r = cats.rushing, rc = cats.receiving, d = cats.defensive, k = cats.kicking, it = cats.interceptions;
  if (p && p.passingAttempts) parts.push(`${p.completions}/${p.passingAttempts}, ${p.passingYards} yds${p.passingTouchdowns ? `, ${p.passingTouchdowns} TD` : ''}${p.interceptions ? `, ${p.interceptions} INT` : ''}`);
  if (r && r.rushingAttempts) parts.push(`${r.rushingAttempts} car, ${r.rushingYards} yds${r.rushingTouchdowns ? `, ${r.rushingTouchdowns} TD` : ''}`);
  if (rc && rc.receptions) parts.push(`${rc.receptions} rec, ${rc.receivingYards} yds${rc.receivingTouchdowns ? `, ${rc.receivingTouchdowns} TD` : ''}`);
  if (!parts.length && d) parts.push(`${d.totalTackles || 0} tkl${d.sacks ? `, ${d.sacks} sk` : ''}${it && it.interceptions ? `, ${it.interceptions} INT` : ''}${d.passesDefended ? `, ${d.passesDefended} PD` : ''}`);
  if (!parts.length && k) parts.push(`${k.fieldGoalsMade || 0}/${k.fieldGoalAttempts || 0} FG, ${k.extraPointsMade || 0} XP`);
  return parts.join(' · ') || 'Played';
}

/* ------------------------------------------------------------------ draft clock (Apr 23–25 2026, Pittsburgh) */
const DRAFT_DAYS = [
  { from: 1, to: 32, start: Date.parse('2026-04-24T00:00:00Z'), per: 9.5 },
  { from: 33, to: 100, start: Date.parse('2026-04-24T23:00:00Z'), per: 6 },
  { from: 101, to: 260, start: Date.parse('2026-04-25T16:00:00Z'), per: 4.2 },
];
function pickTime(o) { const d = DRAFT_DAYS.find(x => o >= x.from && o <= x.to) || DRAFT_DAYS[2]; return d.start + (o - d.from + 1) * d.per * 60e3; }
function draftState(now = time.now()) {
  const picks = (Dt.D.core.drafts[2026] || []).slice().sort((a, b) => a.o - b.o);
  const made = picks.filter(p => pickTime(p.o) <= now);
  const next = picks.find(p => pickTime(p.o) > now);
  return { picks, made, next, live: next && now >= DRAFT_DAYS[0].start && (now < DRAFT_DAYS[0].start + 6 * 3600e3 || (now >= DRAFT_DAYS[1].start && now < DRAFT_DAYS[1].start + 7 * 3600e3) || now >= DRAFT_DAYS[2].start), before: now < DRAFT_DAYS[0].start };
}

/* ------------------------------------------------------------------ hero blocks */
const injShort = s => /Injured Reserve/i.test(s) ? 'IR' : /Physically Unable/i.test(s) ? 'PUP' : s;
function countdownHtml(ts) {
  return html`<div class="hm-count" data-countdown="${ts}">${countParts(ts)}</div>`;
}
/* ------------------------------------------------------------------ trade deadline (trade-deadline v2, built 2026-11-09: a deadline page added in front of the hero's pages)
   The deadline is 4 PM ET; deals are the real moves in the data around it, one per player who changed teams. */
const DEADLINES = [Date.parse('2025-11-04T21:00:00Z')];
function deadlineNow(now = time.now()) { return DEADLINES.find(d => now > d - 7 * DAY && now < d + DAY) || null; }
function deadlineDeals(dl, now = time.now()) {
  const from = new Date(dl - 14 * DAY).toISOString().slice(0, 10), to = fmt.dayKey(now), T = Dt.D.core.teams;
  const find = x => { x = x.trim(); const l = T.filter(t => t.loc === x); return (T.find(t => t.full === x) || T.find(t => t.name === x) || (l.length === 1 ? l[0] : {})).id; };
  const P = "([A-Z]{1,3}) ([A-Z][\\w'.-]+(?: [A-Z][\\w'.-]+)+)", TM = '(?:the )?([A-Z][A-Za-z. ]+?)', END = '(?: in exchange| for|$)';
  const seen = new Set(), out = [];
  Dt.D.core.tx.filter(r => r.dt >= from && r.dt <= to).forEach(r => r.x.replace(/\.$/, '').split(/\.\s+/).forEach(x => {
    let m, d;
    if ((m = x.match(new RegExp(`^(?:Acquired|Received) ${P}.*? from (?:a trade with )?${TM}${END}`)))) d = { pos: m[1], n: m[2], to: r.t, fr: find(m[3]) };
    else if ((m = x.match(new RegExp(`^Traded ${P}.*? to ${TM}${END}`)))) d = { pos: m[1], n: m[2], fr: r.t, to: find(m[3]) };
    else if ((m = x.match(new RegExp(`^Acquired .*? from ${TM} (?:in exchange )?for ${P}`)))) d = { pos: m[2], n: m[3], fr: r.t, to: find(m[1]) };
    if (d && d.to && d.fr && !seen.has(d.n)) { seen.add(d.n); out.push({ ...d, dt: r.dt }); }
  }));
  return out;
}
function countParts(ts) {
  let s = Math.max(0, Math.floor((ts - time.now()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); const sec = s % 60;
  const cell = (v, l) => `<div><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`;
  return raw((d ? cell(d, d === 1 ? 'day' : 'days') : '') + cell(h, 'hrs') + cell(m, 'min') + (d ? '' : cell(sec, 'sec')));
}
function bestWatch(g) {
  const opts = Dt.watch(g);
  const ok = opts.find(o => o.ok && o.k !== 'audio' && o.k !== 'highlights');
  return { ok, first: opts.find(o => o.k !== 'audio'), opts };
}
/* ------------------------------------------------------------------ the league's offseason moments (approved round 6, option B):
   each is data, drawn by momentBody() in your stage's game slot, or as a card under the pick-a-team hero when you have no team */
function draftMoment() {
  const ds = draftState(), now = time.now(), mine = primary();
  const myPicks = ds.picks.filter(p => p.t === mine), recent = ds.made.slice(-3).reverse();
  const M = ds.before ? { kick: 'NFL Draft · Pittsburgh', title: 'Round 1 starts in', ts: DRAFT_DAYS[0].start }
    : ds.next ? { live: true, kick: `Round ${ds.next.r} · Pick ${ds.next.p}`, otc: { tid: ds.next.t, name: team(ds.next.t).full, sub: `#${ds.next.o} overall${ds.next.tr ? ' · via trade' : ''}` } }
    : { kick: '2026 NFL Draft', title: `All ${ds.picks.length} picks are in` };
  M.tid = mine || (ds.next && ds.next.t) || '13';
  M.rows = recent.map(p => ({ no: p.o, tid: p.t, title: p.n, sub: `${p.pos} · ${p.col || ''}`, go: p.pid ? `#/player/${p.pid}` : '' }));
  if (myPicks.length) M.rows.push({ eb: `${team(mine).name} picks`, title: myPicks.slice(0, 8).map(p => pickTime(p.o) <= now ? `#${p.o} ${p.n.split(' ').slice(-1)[0]}` : `#${p.o}`).join(' · ') });
  M.acts = [['Draft tracker', '#/draft?y=2026'], ['Mock draft', '#/mock-draft']];
  return M;
}
function faMoment() {
  const mine = primary(), nly = Date.parse('2026-03-11T20:00:00Z'), open = time.now() >= nly;
  const rows = Dt.tx().filter(r => /Signed|Agreed|Re-signed|Traded|Acquired/i.test(r.x) && r.dt >= '2026-03-01');
  const top = (mine ? rows.filter(r => r.t === mine) : []).concat(rows.filter(r => r.t !== mine)).slice(0, 4);
  return { tid: mine || '17', live: open, kick: 'Free agency', title: open ? 'The new league year is open' : 'The new league year opens in', ts: open ? null : nly,
    rows: top.length ? top.map(r => ({ tid: r.t, title: r.x, sub: fmt.date(r.dt + 'T12:00:00Z').replace(/, \d{4}/, '') })) : [{ title: 'Signings will appear here the moment they\'re official.' }],
    acts: [['FA tracker', '#/free-agency'], ['Cap space', '#/cap']] };
}
function kickoffMoment(phase) {
  const mine = primary(), wk1 = Dt.week(2026, 2, 1);
  const kickoff = wk1 ? wk1.start : Date.parse('2026-09-10T00:20:00Z'), released = time.now() >= Dt.SCHEDULE_RELEASE;
  const opener = mine && released ? Dt.D.games.find(g => g.s === 2026 && g.t === 2 && involves(g, [mine])) : null;
  const firstNfl = released && wk1 ? wk1.games[0] : null;
  const pre = mine && released ? Dt.D.games.find(g => g.s === 2026 && g.t === 1 && involves(g, [mine]) && g.ts > time.now()) : null;
  const row = (g, eb, when) => ({ eb, tid: Dt.opp(g, mine), title: `${Dt.isHome(g, mine) ? 'vs' : 'at'} ${team(Dt.opp(g, mine)).full}`, sub: when, go: `#/game/${g.id}` });
  return { tid: mine || '12', kick: phase === 'camp' ? 'Training camp is open' : 'The offseason', title: 'Kickoff 2026 in', ts: kickoff,
    note: firstNfl ? `${team(firstNfl.a).name} at ${team(firstNfl.h).name} · ${fmt.dayLong(firstNfl.ts)}` : 'The 2026 schedule drops mid-May.',
    rows: [opener && row(opener, `${team(mine).name} open`, `${fmt.dayLong(opener.ts)}${(opener.tv || []).length ? ' · ' + opener.tv.join('/') : ''}`), pre && row(pre, `Next up · ${Dt.weekLabel(pre.t, pre.w)}`, fmt.dayLong(pre.ts))].filter(Boolean),
    acts: [[released ? 'Full schedule' : 'Last season', mine ? `#/team/${mine}?tab=schedule` : '#/scores'], ['Moves', '#/transactions']] };
}
/** the league's moment right now, or null in season */
function leagueMoment() {
  const phase = time.phase();
  return phase === 'draft' ? draftMoment() : phase === 'fa' ? faMoment() : phase === 'summer' || phase === 'camp' ? kickoffMoment(phase) : null;
}
/** a moment drawn on glass: eyebrow (with Live), who is on the clock or the title and countdown, the list, two squared buttons */
function momentBody(M) {
  const disc = (tid, cls = '') => html`<span class="fxm-disc ${cls}"><img src="${team(tid).logo}" alt=""></span>`;
  const head = M.otc ? html`<div class="fxm-otc">${disc(M.otc.tid, 'l')}<span class="fxm-tx"><span class="fxm-eb">On the clock</span><b class="fxm-otn">${M.otc.name}</b><span>${M.otc.sub}</span></span></div>`
    : html`<div class="fxm-t">${M.title}</div>${M.ts ? html`<div class="fxm-cd" data-countdown="${M.ts}">${countParts(M.ts)}</div>` : ''}${M.note ? html`<div class="fxm-note">${M.note}</div>` : ''}`;
  const rows = (M.rows || []).map(r => html`<a class="fxm-r ${r.go ? 'tap' : ''}" ${raw(r.go ? `data-go="${r.go}"` : '')}>${r.no ? html`<span class="fxm-no">${r.no}</span>` : ''}${r.tid ? disc(r.tid) : ''}<span class="fxm-tx">${r.eb ? html`<span class="fxm-eb">${r.eb}</span>` : ''}<b>${r.title}</b>${r.sub ? html`<span>${r.sub}</span>` : ''}</span></a>`);
  return html`<div class="fxm-k">${M.live ? raw('<span class="badge live solid">Live</span>') : ''}<span class="fxm-eb">${M.kick}</span></div>${head}
    ${rows.length ? html`<div class="fxm-list">${rows}</div>` : ''}
    <div class="fx-g-acts"><a class="btn white" data-go="${M.acts[0][1]}">${M.acts[0][0]}</a><a class="btn fx-line" data-go="${M.acts[1][1]}">${M.acts[1][0]}</a></div>`;
}
/** with no team, the moment sits under the pick-a-team hero as a card in the league's navy */
function momentCard() {
  if (primary()) return '';   // with a team, the moment lives in the stage's game slot
  const M = leagueMoment(); if (!M) return '';
  return html`<section class="fxm-card">${momentBody(M)}</section>`;
}

/* ------------------------------------------------------------------ ticker */
function tickerGames() {
  const now = time.now(), ph = time.phase();
  if (!['regular', 'post'].includes(ph)) return [];
  const w = Dt.currentWeek(); if (!w) return [];
  const near = w.games.filter(g => Math.abs(g.ts - now) < 2.5 * DAY || Dt.state(g) === 'live');
  if (!near.length) return [];
  const rank = g => { const s = Dt.state(g); return s === 'live' ? 0 : s === 'pre' ? 1 : 2; };
  const cared = caredTeams();
  return w.games.slice().sort((a, b) => ((rank(a) === 0) !== (rank(b) === 0) ? rank(a) - rank(b) : 0) || (involves(b, cared) - involves(a, cared)) || rank(a) - rank(b) || (rank(a) === 2 ? b.ts - a.ts : a.ts - b.ts));
}
/** approved round 5: each cell is the L5 status over two L1 lines; "All scores" a squared small button, since it is pressable */
function ticker(exclude) {
  const games = tickerGames().filter(g => g.id !== exclude); if (!games.length) return '';
  return html`<nav class="ticker hm-ticker">${games.map(g => {
    const S = Dt.score(g), hide = Dt.spoiled(g) && S.st !== 'pre';
    return html`<a data-go="#/game/${g.id}" class="tap tk-cell">${UI.lk5(S, hide)}${UI.lk1Game(g)}</a>`;
  })}<div class="tk-cell end"><button class="btn sm ghost" data-go="#/scores">All scores ${icon('chev', 'xs')}</button></div></nav>`;
}

/* ------------------------------------------------------------------ catch me up */
function catchupItems(windowMs = 3 * DAY) {
  const now = time.now(), since = now - windowMs;
  const cared = caredTeams(), mine = myTeams();
  const items = [];
  // results
  Dt.D.games.forEach(g => {
    if (g.t === 1 || !involves(g, mine.length ? mine : cared) || Dt.state(g) !== 'post') return;
    const end = g.ts + Dt.GAME_LEN; if (end < since || end > now) return;
    const tid = mine.find(id => involves(g, [id])) || (involves(g, [g.h]) ? g.h : g.a);
    const r = Dt.result(g, tid); const hide = Dt.spoiled(g);
    items.push({ ts: end, kind: 'result', tid, g, go: `#/game/${g.id}`, title: hide ? `${team(tid).name} played ${team(Dt.opp(g, tid)).name}` : `${team(tid).name} ${r.r === 'W' ? 'beat' : r.r === 'L' ? 'lost to' : 'tied'} the ${team(Dt.opp(g, tid)).name} ${r.us}–${r.them}`, sub: hide ? 'Result hidden by spoiler shield' : (Dt.box(g.id) || {}).rh || Dt.weekLabel(g.t, g.w), icon: 'scores' });
  });
  // live right now
  Dt.liveGames().filter(g => involves(g, cared)).forEach(g => {
    const S = Dt.score(g), hide = Dt.spoiled(g);
    items.push({ ts: now, kind: 'live', tid: involves(g, mine) ? mine.find(id => involves(g, [id])) : g.h, go: `#/game/${g.id}`, title: `${team(g.a).abbr} ${hide ? '' : S.as} – ${team(g.h).abbr} ${hide ? '' : S.hs}`, sub: hide ? 'Live now' : `Live · ${S.label}`, icon: 'bolt' });
  });
  // transactions
  const dk = fmt.dayKey(since);
  Dt.tx().filter(r => r.dt >= dk && cared.includes(r.t)).slice(0, 6).forEach(r => items.push({ ts: Date.parse(r.dt + 'T16:00:00Z'), kind: 'move', tid: r.t, title: r.x, sub: `${team(r.t).name} · roster move`, go: `#/team/${r.t}?tab=moves`, icon: 'swap' }));
  // injuries
  cared.forEach(tid => Dt.injuries(tid).filter(i => /Out|Reserve|Doubtful/.test(i.s) && (!i.dt || Date.parse(i.dt) >= since - DAY)).slice(0, 2)
    .forEach(i => items.push({ ts: Date.parse((i.dt || fmt.dayKey(now)) + 'T15:00:00Z'), kind: 'injury', tid, pid: i.p, title: `${i.n} (${i.pos}) — ${injShort(i.s)}`, sub: `${team(tid).name} · ${[i.ty, i.side && i.side !== 'Not Specified' ? i.side : ''].filter(Boolean).join(', ')}`, go: `#/player/${i.p}`, icon: 'info' })));
  // news
  const nw = news({ teams: cared }).filter(a => Date.parse(a.pub) >= since).slice(0, 4);
  (nw.length ? nw : news().filter(a => Date.parse(a.pub) >= since).slice(0, 3))
    .forEach(a => items.push({ ts: Date.parse(a.pub), kind: 'news', a, tid: a.tm[0], title: a.h, sub: fmt.ago(a.pub), go: `#/article/${a.id}`, icon: 'news' }));
  return items.filter(i => i.ts <= now + 1000).sort((a, b) => b.ts - a.ts);
}
function catchupCard() {
  const items = catchupItems();
  if (!items.length) return '';
  const top = items.slice(0, 4);
  return html`<section class="sec"><div class="sec-head"><div class="h2">${t('Catch me up')}</div><a class="more" data-go="#/catchup">${items.length} ${items.length === 1 ? 'update' : 'updates'}${icon('chev', 'xs')}</a></div>
    <div class="list">${top.map(i => html`<a class="row tap hm-cu" data-go="${i.go}">${i.tid ? UI.logo(i.tid, 'sm') : icon(i.icon, 'sm')}<div class="row-main"><div class="row-title clamp2">${i.title}</div><div class="row-sub">${i.sub}</div></div></a>`)}</div></section>`;
}

/* ------------------------------------------------------------------ made for you: Home tuned to the fan */
/** what Home is tuned for: the fan's level plus where they are and how they watch */
function fanTraits() {
  const p = P(), out = [p.level || 'casual'];
  if (p.location && p.location.country && p.location.country !== 'US') out.push('intl');
  if (p.spoiler && p.spoiler.on) out.push('spoiler');
  return out;
}
const TRAIT = { new: 'New fan', casual: 'Fan', diehard: 'Die-hard', analyst: 'Stats fan', intl: 'International', spoiler: 'Watches later' };
const gb = (a, b) => ((a.w - b.w) + (b.l - a.l)) / 2;
const games = n => `${n % 1 ? n : n.toFixed(0)} game${n === 1 ? '' : 's'}`;

/** your team owns the top of Home: one stage that says everything that matters right now.
 *  It stays put while the rest of Home slides up over it as a sheet (see mountStage). */
function fanHeader() {
  const mine = primary(); if (!mine) return '';
  const tm = team(mine), s = Dt.seasonForStats(), now = time.now();
  const st = Dt.standings(s), row = st.all.find(r => r.tid === mine);
  const div = st.div[tm.conf + ' ' + tm.div] || [], dr = div.findIndex(r => r.tid === mine) + 1;
  let hr = 12; try { hr = +new Date(now).toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: fmt.tz() }) % 24; } catch {}
  const hello = hr < 5 ? 'Up late' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const who = P().name ? P().name.split(' ')[0] : `${tm.name} fan`;
  // in the offseason the same hero carries the league's moment in its pages
  return homeHero({ mine, tm, s, st, row, div, dr, hello, who, moment: leagueMoment() });
}

/** the top of the sheet that slides over the stage: what changed since you last looked */
function sheetTop() {
  const mine = primary(); if (!mine) return '';
  const now = time.now();
  // since you last opened (at least the last day, at most a week)
  const since = Math.min(7 * DAY, Math.max(DAY, now - (P().lastOpen || now - 3 * DAY)));
  const items = catchupItems(since).filter(i => i.tid === mine);
  const chips = [];
  const inj = items.filter(i => i.kind === 'injury').length; if (inj) chips.push([`${inj} injury update${inj > 1 ? 's' : ''}`, '#/catchup']);
  const mv = items.filter(i => i.kind === 'move').length; if (mv) chips.push([`${mv} roster move${mv > 1 ? 's' : ''}`, '#/catchup']);
  const nw = items.filter(i => i.kind === 'news').length; if (nw) chips.push([`${nw} stor${nw > 1 ? 'ies' : 'y'}`, '#/catchup']);
  return html`${chips.length ? html`<div class="hm-st"><div class="hm-st-k">Since you last looked</div><div class="hm-st-chips">${chips.slice(0, 3).map(([l, go]) => html`<a class="hm-st-chip tap" data-go="${go}">${l}</a>`)}</div></div>` : ''}`;
}

/** one sentence: form plus the race */

/** the Home hero (home-hero-height v9): your team on the fabric up top, then three short pages on the team's 700 tint:
 *  the game that matters now, five games around this week, and the tale of the tape against the next opponent */
/* ------------------------------------------------------------------ season states (built 2026-11-09: bye week B, playoff race B, schedule release B, cut-down A, season over v2). Each returns the hero's pages, or null to leave them as they are. A state's page goes
   in front and the next game and the season stay after it (your trade-deadline note). */
const ROUND_NAME = { 1: 'Wild Card', 2: 'Divisional Round', 3: 'Conference Championship', 5: 'Super Bowl' };
function primeTime(g) { return +new Date(g.ts).toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }) >= 19; }
function raceRows(s, now) {
  // regular-season games left per team; clinched / out by plain win counts (ties ignored): out when your best possible
  // total is below both the 7th seed's wins today and your division leader's, in when your wins today beat the best possible total of every team 8th or lower
  const st = Dt.standings(s, now), left = {};
  Dt.D.games.forEach(g => { if (g.s === s && g.t === 2 && Dt.state(g, now) !== 'post') [g.h, g.a].forEach(t => { left[t] = (left[t] || 0) + 1; }); });
  const conf = cf => (st.conf[cf] || []).map(r => ({ ...r, left: left[r.tid] || 0 }));
  const status = (r, rows) => { const seventh = rows[6], below = rows.slice(7);
    const lead = Math.max(...rows.filter(x => x.t.div === r.t.div).map(x => x.w));   // the division title is a way in too
    if (r.w + r.left < seventh.w && r.w + r.left < lead) return 'out';
    if (rows.indexOf(r) < 7 && below.every(x => r.w > x.w + x.left)) return 'in';
    return 'hunt'; };
  return { conf, status };
}
function statePages(c, P3) {
  const { mine, tm, s } = c, now = time.now(), key = time.key;
  const disc = (id, cls = '') => html`<span class="fx-disc ${cls}"><img src="${team(id).logo}" alt="" loading="lazy"></span>`;
  const head = (k, more, go) => html`<div class="hh8-ph"><span>${k}</span>${more ? html`<a class="tap" data-go="${go}">${more}${icon('chev', 'xs')}</a>` : ''}</div>`;
  const btn = (t, go) => html`<a class="btn sm white" data-go="${go}">${t}</a>`;
  const cd = (ts, sub) => html`<span class="hh8-mid hho-cd"><span class="hh8-big" data-countdown="${ts}">${countParts(ts)}</span>${sub ? html`<small>${sub}</small>` : ''}</span>`;
  const md = ts => fmt.date(ts).replace(/, \d{4}/, '');
  const opp = g => html`${Dt.isHome(g, mine) ? 'vs' : 'at'} ${team(Dt.opp(g, mine)).name}`;
  // bye week: your team has no game in this week of the regular season
  {
    const w = Dt.currentWeek(now);
    if (w && w.t === 2 && !w.games.some(g => involves(g, [mine]))) {
      const nx = Dt.nextGame(mine), div = Dt.D.core.teams.filter(t => t.conf === tm.conf && t.div === tm.div && t.id !== mine).map(t => t.id);
      const dg = w.games.filter(g => involves(g, div)).sort((a, b) => a.ts - b.ts);
      const row = g => { const S = Dt.score(g), rid = div.find(t => involves(g, [t])), hide = Dt.spoiled(g) && S.st !== 'pre';
        const r = S.st === 'post' && !hide ? Dt.result(g, rid) : null;
        return html`<a class="hhs-r tap" data-go="#/game/${g.id}">${disc(rid)}<b>${team(rid).name}</b><span>${Dt.isHome(g, rid) ? 'vs' : 'at'} ${team(Dt.opp(g, rid)).abbr}</span><em>${S.st === 'live' ? html`<span class="badge live">Live</span>` : r ? `${r.r} ${r.us}-${r.them}` : `${fmt.weekday(g.ts)} ${fmt.time(g.ts)}`}</em></a>`; };
      const o1 = html`${head(`Bye week · ${tm.conf} ${tm.div} watch`, 'Standings', '#/standings')}<div class="hhs-list">${dg.slice(0, 3).map(row)}</div>
        ${nx ? html`<div class="hhs-foot">Back ${md(nx.ts)} ${opp(nx)}</div>` : ''}`;
      return [o1, ...P3];
    }
  }
  // playoff race: from Week 15 on, the race for the seven seeds in your conference
  {
    const w = Dt.currentWeek(now);
    if (w && w.t === 2 && w.w >= 15) {
      const R = raceRows(s, now), rows = R.conf(tm.conf), me = rows.find(r => r.tid === mine);
      if (me) {
        const i = rows.indexOf(me), from = Math.max(0, Math.min(i - 2, rows.length - 5)), sl = rows.slice(from, from + 5);
        const o1 = html`${head(`${tm.conf} race · ${Dt.weekLabel(w.t, w.w)}`, 'Playoff picture', '#/playoffs')}<div class="hhs-tbl">${sl.map(r => { const k = R.status(r, rows);
            return html`<a class="hhs-sr tap ${r.tid === mine ? 'me' : ''} ${r.seed === 8 ? 'cut' : ''}" data-go="#/team/${r.tid}"><i>${r.seed}</i>${disc(r.tid)}<b>${r.t.name}</b><span>${r.w}-${r.l}${r.tie ? '-' + r.tie : ''}</span><em>${k === 'in' ? 'Clinched' : ''}</em></a>`; })}</div>`;
        return [o1, ...P3];
      }
    }
  }
  // season over: the Super Bowl has been played and nothing is left
  if (time.phase() === 'post') {
    const sb = Dt.D.games.find(g => g.s === s && g.t === 3 && g.w === 5);
    if (sb && Dt.state(sb, now) === 'post') {
      const w = sb.hs > sb.as ? sb.h : sb.a, l = Dt.opp(sb, w), r = Dt.result(sb, w);
      const champ = html`${head(`Super Bowl ${Dt.sbNumeral(s) || ''} · Final`, 'Recap', `#/game/${sb.id}?tab=recap`)}
        <a class="hm-line tap" data-go="#/game/${sb.id}?tab=recap"><span class="hh8-ms hm-ms ${sb.a !== w ? 'lo' : ''}">${disc(sb.a)}<b>${team(sb.a).abbr}</b></span><strong class="hm-n ${sb.a !== w ? 'lo' : ''}">${sb.as}</strong><span class="hm-st"><b>Final</b></span><strong class="hm-n ${sb.h !== w ? 'lo' : ''}">${sb.hs}</strong><span class="hh8-ms hm-ms r ${sb.h !== w ? 'lo' : ''}">${disc(sb.h)}<b>${team(sb.h).abbr}</b></span></a>
        <div class="hh8-row"><div class="hh8-kick"><b>The ${team(w).name} are champions</b><span>${fmt.day(sb.ts)} · ${sb.vn || ''}</span></div>${btn('Highlights', `#/game/${sb.id}?tab=recap`)}</div>`;
      const post = Dt.D.games.filter(g => g.s === s && g.t === 3 && g.w !== 4 && involves(g, [mine])).sort((a, b) => a.ts - b.ts), lastP = post[post.length - 1];
      // season-over v2 (your note: "maybe less negative"): every season ends on what it reached, never on how it ended
      const fin = !post.length ? `${s} in the books` : lastP.w === 5 ? (Dt.result(lastP, mine).r === 'W' ? 'Super Bowl champions' : `${tm.conf} champions`) : lastP.w === 3 ? `${tm.conf} Championship run` : 'Playoff team';
      const wins = Dt.D.games.filter(g => g.s === s && g.t >= 2 && involves(g, [mine]) && Dt.state(g, now) === 'post').map(g => ({ g, r: Dt.result(g, mine) })).filter(x => x.r.r === 'W').sort((x, y) => (y.r.us - y.r.them) - (x.r.us - x.r.them)), bw = wins[0];
      const reg = Dt.record(mine, s), st = Dt.standings(s, now), me = st.all.find(x => x.tid === mine), a = fxStats(mine, s, st);
      const wrap = html`${head(`${tm.name} · ${s} season`, 'Schedule', `#/team/${mine}?tab=schedule`)}
        <div class="hho-f"><span class="hhs-st"><small>${reg.str} · ${fmt.ord(me ? me.seed : 0)} in the ${tm.conf}</small><b>${fin}</b></span></div>
        <div class="hh8-row"><div class="hh8-kick">${a ? html`<b>${a[0][0]} ${a[0][1].toLowerCase()} · ${fmt.ord(a[0][2])} in NFL</b>` : ''}<span>${bw ? `Best win: ${bw.r.us}-${bw.r.them} ${Dt.isHome(bw.g, mine) ? 'vs' : 'at'} ${team(Dt.opp(bw.g, mine)).abbr}` : `${reg.str} season`}</span></div>${btn('Season stats', `#/team/${mine}?tab=stats`)}</div>`;
      const nly = Date.parse(`${s + 1}-03-11T20:00:00Z`);
      const next = html`${head('What\'s next', 'Free agency', '#/free-agency')}<div class="hho-f">${cd(nly, 'until free agency opens')}</div>
        <div class="hh8-row"><div class="hh8-kick"><b>New league year · ${md(nly)}</b><span>4:00 PM ET · then the draft, Apr 23–25</span></div>${btn('Draft order', '#/draft?y=' + (s + 1))}</div>`;
      return [wrap, champ, next];
    }
  }
  // schedule release (the three days after it): your 2026 schedule as a reveal
  if (now >= Dt.SCHEDULE_RELEASE && now < Dt.SCHEDULE_RELEASE + 3 * DAY) {
    const G = Dt.D.games.filter(g => g.s === 2026 && g.t === 2 && involves(g, [mine])).sort((a, b) => a.ts - b.ts); if (!G.length) return null;
    const op = G[0], prime = G.filter(primeTime), weeks = G.map(g => g.w), bye = [...Array(18)].map((x, i) => i + 1).find(w => !weeks.includes(w));
    const opener = html`${head(html`<span class="hh8-lv"><span class="badge live">New</span>2026 schedule</span>`, 'Full schedule', `#/team/${mine}?tab=schedule`)}
      <a class="hh8-mu tap" data-go="#/game/${op.id}"><span class="hh8-ms">${disc(op.a)}<b>${team(op.a).abbr}</b></span>${cd(op.ts, html`Week 1 ${opp(op)}`)}<span class="hh8-ms r">${disc(op.h)}<b>${team(op.h).abbr}</b></span></a>
      <div class="hh8-row"><div class="hh8-kick"><b>${fmt.day(op.ts)}</b><span>${fmt.time(op.ts)}${(op.tv || []).length ? ' · ' + op.tv.join(' / ') : ''}</span></div>${btn('Add to calendar', `#/team/${mine}?tab=schedule`)}</div>`;
    const slate = html`${head('The slate', 'Full schedule', `#/team/${mine}?tab=schedule`)}<div class="hho-n">
        <span><b>${prime.length}</b><small>Prime time</small><em>Night kickoffs</em></span><span><b>${G.filter(g => Dt.isHome(g, mine)).length}</b><small>At home</small><em>${G.filter(g => !Dt.isHome(g, mine)).length} away</em></span><span><b>${bye || '–'}</b><small>Bye week</small><em>${bye ? 'Week ' + bye : ''}</em></span></div>`;
    // all 18 weeks at a glance, prime time marked, then the opener
    const grid = html`${head(html`<span class="hh8-lv"><span class="badge live">New</span>2026 schedule</span>`, 'Full schedule', `#/team/${mine}?tab=schedule`)}<div class="hhs-grid">${[...Array(18)].map((x, i) => { const g = G.find(y => y.w === i + 1);
        return g ? html`<a class="tap ${primeTime(g) ? 'pt' : ''} ${Dt.isHome(g, mine) ? '' : 'aw'}" data-go="#/game/${g.id}"><i>${i + 1}</i>${disc(Dt.opp(g, mine))}</a>` : html`<span class="by"><i>${i + 1}</i><b>Bye</b></span>`; })}</div>
      <div class="hhs-key"><span><i class="pt"></i>Prime time</span><span><i class="aw"></i>Away</span></div>`;
    return [grid, opener, slate];
  }
  // cut-down: the last week of August, when rosters go to 53
  if (key === 'cuts') {
    const from = '2026-08-24', to = new Date(now).toISOString().slice(0, 10), CUT = /\b(Waived|Released|Placed .* on (?:injured reserve|reserve))/;
    const rows = Dt.tx().filter(r => r.dt >= from && r.dt <= to && CUT.test(r.x)), my = Dt.tx().filter(r => r.dt >= from && r.dt <= to && r.t === mine);
    const op = Dt.D.games.find(g => g.s === 2026 && g.t === 2 && involves(g, [mine]));
    const count = html`${head(html`<span class="hh8-lv"><span class="badge live">Live</span>Cut-down weekend</span>`, 'Tracker', '#/transactions')}
      <div class="hho-f"><span class="hho-no l"><b>${rows.length}</b><small>Cut moves league-wide</small></span><span class="hho-no"><b>${my.length}</b><small>${tm.name} moves</small></span></div>
      <div class="hh8-row"><div class="hh8-kick"><b>Every roster goes to 53</b><span>Since Mon, Aug 24</span></div>${btn('Your roster', `#/team/${mine}?tab=roster`)}</div>`;
    const mv = my.length ? html`${head(`${tm.name} moves`, 'All', '#/transactions')}<div class="hho-mv">${my.slice(0, 2).map(r => html`<span><b>${r.x}</b><small>${md(r.dt + 'T12:00:00Z')}</small></span>`)}</div>` : '';
    const opn = op ? html`${head('Week 1 opener', 'Full schedule', `#/team/${mine}?tab=schedule`)}
      <a class="hh8-mu tap" data-go="#/game/${op.id}"><span class="hh8-ms">${disc(op.a)}<b>${team(op.a).abbr}</b></span>${cd(op.ts, opp(op))}<span class="hh8-ms r">${disc(op.h)}<b>${team(op.h).abbr}</b></span></a>
      <div class="hh8-row"><div class="hh8-kick"><b>${fmt.day(op.ts)}</b><span>${fmt.time(op.ts)}${(op.tv || []).length ? ' · ' + op.tv.join(' / ') : ''}</span></div>${btn('Where to watch', '#/watch')}</div>` : '';
    return [count, mv, opn].filter(x => String(x).trim());
  }
  return null;
}
function homeHero(c) {
  const { mine, tm, s, st, row, div, dr, hello, who } = c, now = time.now();
  const rec = row && row.gp ? `${row.w}-${row.l}${row.tie ? '-' + row.tie : ''}` : '0-0';
  const n = row ? parseInt(row.streak.slice(1)) || 0 : 0;
  // under the record: the division place, then the streak (2+) or the conference place
  // season over (v2): no losing streak under the record once the season is over, the conference place instead
  const over = time.phase() === 'post' && Dt.D.games.some(g => g.s === s && g.t === 3 && g.w === 5 && Dt.state(g, now) === 'post');
  const l2 = c.moment ? 'Last season' : row && row.gp ? // only a winning run shows (hero-lost, built Nov 10: positive framing); otherwise the conference place
    (n >= 2 && row.streak[0] === 'W' ? `Won ${n} straight` : `${fmt.ord(row.seed)} in the ${tm.conf}`) : '';
  // ?pv=teamink: the hero shows the team's real primary (or the sheet shade that carries white text) instead of shade 700
  // the hero's bottom area sits on the sheet's shade 700 (the user's call, 2026-11-10)
  const t7 = (tm.shade && tm.shade[700]) || App.mix(tm.color, '#000000', .4);
  const G = Dt.teamGamesAsOf(mine).filter(g => g.t === 2), nx = G.find(g => Dt.state(g, now) !== 'post');
  const recOf = (id, g) => (g && g.t === 1 ? Dt.record(id, g.s, now, 1) : Dt.record(id, s)).str;
  const disc = (id, cls = '') => html`<span class="fx-disc ${cls}"><img src="${team(id).logo}" alt="" loading="lazy"></span>`;
  const head = (k, more, go) => html`<div class="hh8-ph"><span>${k}</span>${more ? html`<a class="tap" data-go="${go}">${more}${icon('chev', 'xs')}</a>` : ''}</div>`;
  const tv = g => (g.tv || []).join(' / ');
  const md = ts => new Date(ts).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: fmt.tz() });
  const res = x => Dt.state(x, now) === 'post' && !Dt.spoiled(x) ? Dt.result(x, mine) : null;
  // page 1: the game that matters now
  const live = Dt.liveGameFor(mine), last = Dt.lastGame(mine), next = Dt.nextGame(mine);
  const g = live || (last && now - last.ts < 2.2 * DAY && (!next || next.ts - now > 1.2 * DAY) ? last : null) || (next && next.ts - now < 12 * DAY ? next : null);
  let p1 = '';
  if (g) {
    const S = Dt.score(g), oid = Dt.opp(g, mine), o = team(oid), home = Dt.isHome(g, mine), hide = Dt.spoiled(g) && S.st !== 'pre';
    const divGame = o.conf === tm.conf && o.div === tm.div, us = home ? S.hs : S.as, them = home ? S.as : S.hs;
    const k = S.st === 'pre' ? `Next up · ${Dt.weekLabel(g.t, g.w)}` : `${Dt.weekLabel(g.t, g.w)}${tv(g) ? ' · ' + tv(g) : ''}`;
    const flag = S.st === 'pre' && divGame ? html`<span class="hh8-flag">Division game</span>` : '';
    let body;
    if (S.st !== 'pre') {
      // live and final: one score line, then the down (or the result) and one button
      const wp = S.st === 'live' && !hide && S.wp != null ? Math.round(home ? S.wp : 100 - S.wp) : null;
      const btn = S.st === 'live' ? html`<button class="btn sm white" data-act="gc-watch-id" data-arg="${g.id}">${icon('play', 'sm')}Watch live</button>` : html`<a class="btn sm white" data-go="#/game/${g.id}?tab=recap">${icon('play', 'sm')}Recap</a>`;
      const sub = hide ? 'Spoiler shield is on' : S.st === 'live' ? (S.dd ? `${S.poss ? team(S.poss).abbr + ' ball · ' : ''}${S.dd}` : S.label) : `${recOf(mine, g)} · ${fmt.ord(dr)} in ${tm.conf} ${tm.div}`;
      // the score line (hero-matchup A, approved 2026-11-09) is built like the game page header: away left, home right,
      // the status in the centre (Final, or Live and the clock), the losing score and tricode dimmed, no letter between the scores
      const lo = id => S.st === 'post' && !hide && (id === mine ? us < them : them < us) ? 'lo' : '';
      const scOf = id => id === mine ? us : them;
      const mid = html`<span class="hm-st">${S.st === 'live' ? html`<span class="badge live">Live</span><b class="r-clock-status">${hide ? '' : S.label}</b>` : html`<b>Final${g.ot ? '/OT' : ''}</b>`}</span>`;
      const sc = id => hide ? '' : html`<strong class="hm-n ${lo(id)}">${scOf(id)}</strong>`;
      const edge = (id, rt) => html`<span class="hh8-ms hm-ms ${rt ? 'r' : ''} ${lo(id)}">${disc(id)}<b>${team(id).abbr}</b></span>`;
      const nxt = S.st === 'post' && next && next !== g ? html`<span>Next: ${Dt.isHome(next, mine) ? 'vs' : 'at'} ${team(Dt.opp(next, mine)).name} · ${fmt.weekday(next.ts)}</span>` : '';
      body = html`<a class="hm-line tap" data-go="#/game/${g.id}">${edge(g.a)}${sc(g.a)}${mid}${sc(g.h)}${edge(g.h, 1)}</a>
        <div class="hh8-row"><div class="hh8-kick"><b>${sub}</b>${nxt}${wp != null ? html`<span class="hh8-wp"><span>Win chance <b>${wp}%</b></span><i><i style="width:${wp}%"></i></i></span>` : ''}</div>${btn}</div>`;
    } else {
      // before kickoff: the time to kickoff is the big thing, both teams small either side of it
      const side = (id, rt) => html`<span class="hh8-ms ${rt ? 'r' : ''}">${disc(id)}<b>${team(id).abbr}</b></span>`;
      body = html`<a class="hh8-mu tap" data-go="#/game/${g.id}?tab=preview">${side(g.a)}<span class="hh8-mid"><span class="hh8-big" data-countdown="${g.ts}">${countParts(g.ts)}</span><small>${team(g.a).abbr} at ${team(g.h).abbr} · <span class="hh8-n">${recOf(oid, g)}</span></small></span>${side(g.h, 1)}</a>
        <div class="hh8-row"><div class="hh8-kick"><b>${fmt.day(g.ts)}</b><span>${fmt.time(g.ts)}${tv(g) ? ' · ' + tv(g) : ''}</span></div>
          <a class="btn sm white" data-go="#/watch">${icon('tv', 'sm')}Where to watch</a></div>`;
    }
    p1 = html`${head(k)}${flag}<div class="hh8-g ${S.st}">${body}</div>`;
  }
  const dlB = deadlineNow();
  let pd = '';
  if (dlB && !c.moment) {
    const deals = deadlineDeals(dlB), my = deals.filter(d => d.to === mine || d.fr === mine), open = now < dlB, d0 = my[0];
    pd = html`${head(open ? html`<span class="hh8-lv"><span class="badge live">Live</span>Trade deadline</span>` : 'Trade deadline · closed', 'All moves', '#/transactions')}
      <div class="hho-f">${open ? html`<span class="hh8-mid hho-cd"><span class="hh8-big" data-countdown="${dlB}">${countParts(dlB)}</span><small>until 4 PM ET</small></span>` : html`<span class="hho-no l"><b>${deals.length}</b><small>Deals league-wide</small></span>`}${open ? html`<span class="hho-no"><b>${deals.length}</b><small>Deals so far</small></span>` : ''}</div>
      <div class="hh8-row"><div class="hh8-kick">${d0 ? html`<b>${d0.to === mine ? 'Added' : 'Sent away'}: ${d0.pos} ${d0.n}</b><span>${d0.to === mine ? 'from' : 'to'} ${team(d0.to === mine ? d0.fr : d0.to).name}${my.length > 1 ? ` · +${my.length - 1} more` : ''}</span>` : html`<b>${tm.name}: no deals yet</b><span>Latest: ${deals[0] ? `${deals[0].n} to ${team(deals[0].to).abbr}` : '—'}</span>`}</div>
        <a class="btn sm white" data-go="#/transactions">Tracker</a></div>`;
  }
  // page 2: the season
  const done = G.filter(x => Dt.state(x, now) === 'post').length;
  let p2 = '';
  if (G.length >= 4) {
    const sched = head(`Season · ${rec}`, 'Schedule', `#/team/${mine}?tab=schedule`);
    // five games around this week as squared tiles: the last two with their scores, this week lit, then two more
    const i = nx ? G.indexOf(nx) : G.length, from = Math.max(0, Math.min(i - 2, G.length - 5)), gs = G.slice(from, from + 5);
    p2 = html`${sched}<div class="hh8-five">${gs.map(x => { const r = res(x), stt = Dt.state(x, now);
        return html`<a class="hh8-t tap ${x === nx ? 'nx' : ''} ${r ? r.r.toLowerCase() : stt}" data-go="#/game/${x.id}"><i>Wk ${x.w}</i>${disc(Dt.opp(x, mine))}<em>${Dt.isHome(x, mine) ? 'vs' : 'at'} ${team(Dt.opp(x, mine)).abbr}</em><b>${r ? `${r.r} ${r.us}-${r.them}` : stt === 'live' ? 'Live' : x === nx ? fmt.weekday(x.ts).slice(0, 3) + ' ' + fmt.time(x.ts).replace(/ (AM|PM)/, '') : md(x.ts)}</b></a>`; })}</div>`;
  }
  // page 3: tale of the tape against the next opponent
  const a = fxStats(mine, s, st), tg = live || next, oid = tg && tg.t !== 1 && tg.ts - now < 12 * DAY ? Dt.opp(tg, mine) : null, ob = oid && fxStats(oid, s, st);
  let p3 = '';
  if (a && ob) {
    const ot = team(oid), better = (x, y) => (x[3] - y[3]) * x[4] > 0;
    const hd = head(`Tale of the tape · ${Dt.isHome(tg, mine) ? 'vs' : 'at'} ${ot.abbr}`, 'Preview', `#/game/${tg.id}?tab=preview`);
    const short = { 'Points a game': 'Points / game', 'Allowed a game': 'Allowed / game', 'Point diff': 'Point diff' };
    // tight split bars: your number, the category, theirs; the bar neutral, the leader's side white and the other dim
    const bar = (x, y) => { const lo = Math.min(x[3], y[3], 0), pad = (Math.abs(x[3] - y[3]) + 1) * .3, u = x[3] - lo + pad, v = y[3] - lo + pad, inv = x[4] < 0;
      const pu = inv ? v / (u + v) : u / (u + v);
      return html`<span class="hh8-sb"><i class="${better(x, y) ? 'on' : ''}" style="flex:${pu.toFixed(3)}"></i><i class="${better(y, x) ? 'on' : ''}" style="flex:${(1 - pu).toFixed(3)}"></i></span>`; };
    p3 = html`${hd}<div class="hh8-key"><span>${disc(mine)}<b>${tm.abbr}</b></span><span class="r"><b>${ot.abbr}</b>${disc(oid)}</span></div>
      ${a.map((x, i) => { const y = ob[i]; return html`<div class="hh8-tr"><span class="${better(x, y) ? 'on' : ''}">${x[0]}</span><small>${short[x[1]] || x[1]}</small><span class="r ${better(y, x) ? 'on' : ''}">${y[0]}</span>${bar(x, y)}</div>`; })}`;
  } else if (a) p3 = html`${head('Your numbers')}${fxNums(mine, s, st)}`;
  let off = null;
  if (c.moment) {
    // offseason pages (home-offseason-hero v2), built like the season pages: eyebrow, one focal row, info + one button
    const ph = time.phase(), btn = (t, go) => html`<a class="btn sm white" data-go="${go}">${t}</a>`;
    const nums = a ? html`${head(`Last season · ${rec}`, 'Schedule', `#/team/${mine}?tab=schedule`)}<div class="hho-n">${a.map(x => html`<span><b>${x[0]}</b><small>${x[1]}</small><em>${fmt.ord(x[2])} in NFL</em></span>`)}</div>` : '';
    const cd = (ts, sub) => html`<span class="hh8-mid hho-cd"><span class="hh8-big" data-countdown="${ts}">${countParts(ts)}</span>${sub ? html`<small>${sub}</small>` : ''}</span>`;
    if (ph === 'draft') {
      const ds = draftState(), mp = ds.picks.filter(p => p.t === mine), last = ds.made[ds.made.length - 1];
      const nx = ds.next, mineNext = mp.find(p => pickTime(p.o) > now);
      const o1 = ds.before ? html`${head('NFL Draft · Pittsburgh')}<div class="hho-f">${cd(DRAFT_DAYS[0].start, 'until Round 1')}</div>
          <div class="hh8-row"><div class="hh8-kick"><b>${mp.length ? `${mp.length} picks · first at No. ${mp[0].o}` : 'No picks yet'}</b></div>${btn('Mock draft', '#/mock-draft')}</div>`
        : nx ? html`${head(html`<span class="hh8-lv"><span class="badge live">Live</span>Round ${nx.r} · Pick ${nx.p}</span>`)}
          <div class="hho-f"><span class="hho-otc">${disc(nx.t)}<span><small>On the clock</small><b>${team(nx.t).name}</b></span></span><span class="hho-no"><b>${nx.o}</b><small>Overall</small></span></div>
          <div class="hh8-row"><div class="hh8-kick">${last ? html`<b>Last pick: ${last.n}</b><span>${team(last.t).abbr} · ${last.pos}${last.col ? ' · ' + last.col : ''}</span>` : ''}</div>${btn('Draft tracker', '#/draft?y=2026')}</div>`
        : html`${head('2026 NFL Draft')}<div class="hho-f"><span class="hho-t">All ${ds.picks.length} picks are in</span></div><div class="hh8-row"><div class="hh8-kick"></div>${btn('Draft tracker', '#/draft?y=2026')}</div>`;
      // page 2: your picks as tiles, made ones with the player, the next one lit
      const o2 = mp.length ? html`${head(`${tm.name} picks`, 'All picks', '#/draft?y=2026')}<div class="hho-pk">${mp.slice(0, 5).map(p => { const done = pickTime(p.o) <= now;
          return html`<span class="${p === mineNext ? 'nx' : done ? '' : 'pre'}"><i>R${p.r} · ${p.o}</i>${done ? html`<b>${p.n.split(' ').slice(-1)[0]}</b><em>${p.pos}</em>` : html`<b>No. ${p.o}</b><em>${p === mineNext ? 'Next' : 'To come'}</em>`}</span>`; })}</div>` : '';
      off = [o1, o2, nums];
    } else if (ph === 'fa') {
      const nly = Date.parse('2026-03-11T20:00:00Z'), open = now >= nly;
      const rows = Dt.tx().filter(r => r.dt >= '2026-03-01' && r.dt <= new Date(now).toISOString().slice(0, 10)), my = rows.filter(r => r.t === mine);
      const o1 = open ? html`${head(html`<span class="hh8-lv"><span class="badge live">Live</span>Free agency</span>`, 'Tracker', '#/free-agency')}
          <div class="hho-f"><span class="hho-no l"><b>${rows.length}</b><small>Moves league-wide</small></span><span class="hho-no"><b>${my.length}</b><small>${tm.name}</small></span></div>
          <div class="hh8-row"><div class="hh8-kick"><b>The new league year is open</b><span>Since Mar 11</span></div>${btn('Cap space', '#/cap')}</div>`
        : html`${head('Free agency')}<div class="hho-f">${cd(nly, 'until the new league year')}</div><div class="hh8-row"><div class="hh8-kick"><b>Wed, Mar 11 · 4:00 PM ET</b></div>${btn('FA tracker', '#/free-agency')}</div>`;
      // page 2: your team's latest moves, two rows (left out until there is one)
      const o2 = my.length ? html`${head(`${tm.name} moves`, 'All', '#/transactions')}<div class="hho-mv">${my.slice(0, 2).map(r => html`<span><b>${r.x}</b><small>${fmt.date(r.dt + 'T12:00:00Z').replace(/, \d{4}/, '')}</small></span>`)}</div>` : '';
      off = [o1, o2, nums];
    } else {
      // summer and camp: the opener, like the next-game page, counting down to it
      const released = now >= Dt.SCHEDULE_RELEASE, op = released ? Dt.D.games.find(g => g.s === 2026 && g.t === 2 && (g.h === mine || g.a === mine)) : null;
      const wk1 = Dt.week(2026, 2, 1), ko = wk1 ? wk1.start : Date.parse('2026-09-10T00:20:00Z');
      const o1 = op ? html`${head(ph === 'camp' ? 'Training camp · Week 1 opener' : 'Week 1 opener')}
          <a class="hh8-mu tap" data-go="#/game/${op.id}"><span class="hh8-ms">${disc(op.a)}<b>${team(op.a).abbr}</b></span>${cd(op.ts, `${Dt.isHome(op, mine) ? 'vs' : 'at'} ${team(Dt.opp(op, mine)).name}`)}<span class="hh8-ms r">${disc(op.h)}<b>${team(op.h).abbr}</b></span></a>
          <div class="hh8-row"><div class="hh8-kick"><b>${fmt.day(op.ts)}</b><span>${fmt.time(op.ts)}${tv(op) ? ' · ' + tv(op) : ''}</span></div>${btn('Full schedule', `#/team/${mine}?tab=schedule`)}</div>`
        : html`${head('The offseason')}<div class="hho-f">${cd(ko, 'until kickoff 2026')}</div><div class="hh8-row"><div class="hh8-kick"><b>The 2026 schedule drops mid-May</b></div>${btn('Last season', `#/team/${mine}?tab=schedule`)}</div>`;
      off = [o1, nums];
    }
  }
  const sp = statePages(c, [p1, p2, p3]);
  const pages = (sp ? [pd, ...sp] : off || [pd, p1, p2, p3]).filter(x => String(x).trim());
  const pg = html`<div class="hh8-pg" onscroll="const i=Math.round(this.scrollLeft/this.clientWidth);this.parentNode.querySelectorAll('.hh8-dots i').forEach((d,n)=>d.classList.toggle('on',n===i))">${pages.map(p => html`<div class="hh8-p">${p}</div>`)}</div>
    <div class="hh8-dots">${pages.map((p, i) => html`<i class="${i ? '' : 'on'}"></i>`)}</div>`;
  return html`<section class="fx hm-stage hh hh8" style="${raw(App.teamVars(tm))};--t7:${t7}">
    <div class="hh8-id">${raw(App.fabric('1.5,.1,150,.5,50,0', App.inkPv() ? App.teamFill(tm) : App.heroCol ? App.heroCol(tm.color) : tm.color, tm.alt))}${UI.helmet(mine, { cls: 'fx-hel', face: 'left' })}
      <div class="fx-in"><div class="hh6-hi">${hello}, ${who}</div>
        <a class="fx-name tap" data-go="#/team/${mine}" style="font-size:min(72px, ${(50 / tm.name.length / .62).toFixed(1)}cqi)">${tm.name}</a>
        <div class="hh6-rec"><b>${rec}</b><span>${fmt.ord(dr)} in ${tm.conf} ${tm.div}${l2 ? html`<br>${l2}` : ''}</span></div></div></div>
    ${off && !pages.length ? '' : html`<div class="hh8-band">${pg}</div>`}</section>`;
}
/** the hero's essentials as a bar that pins under the header once the sheet covers the hero */
function hhMini() {
  const mine = primary(); if (!mine || leagueMoment()) return '';
  const tm = team(mine), r = Dt.record(mine, Dt.seasonForStats()), nx = Dt.nextGame(mine), o = nx && team(Dt.opp(nx, mine));
  // ?pv=pb2a / pb2b, pb3a / pb3b (Approvals preview, pinbar-away v2/v3: B's one row at 40 / 42px): the game page's pinned score bug, slimmer: away first,
  // logos on white discs, the away-to-home colour blend under the scrim; the game is picked like hero page 1
  // the game page bug's own sizes (26px discs, 24px scores; no down & distance), 46px edge to edge / 48px inset with its rounded corners
  // built (pinbar-away v5, Nov 10): A, the bug's insides at 46px edge to edge; older preview flags still draw v2/v3
  const old = ['pb2a', 'pb2b', 'pb3a', 'pb3b'].some(k => App.pv.has(k)), pb4 = old ? '' : App.pv.has('pb4b') ? ' p4 h48' : ' p4 h46';
  {
    const now = time.now(), live = Dt.liveGameFor(mine), last = Dt.lastGame(mine);
    const g = live || (last && now - last.ts < 2.2 * DAY && (!nx || nx.ts - now > 1.2 * DAY) ? last : null) || nx;
    if (g) {
      const S = Dt.score(g), st = S.st, hide = Dt.spoiled(g) && st !== 'pre', slim = !App.pv.has('pb2a'), tall = pb4 || (App.pv.has('pb3a') ? ' h40' : App.pv.has('pb3b') ? ' h42' : '');
      const away = team(g.a), home = team(g.h);
      const lost = (a, b) => st === 'post' && !hide && a < b ? ' lost' : '';
      const ball = tid => st === 'live' && !hide && S.poss === tid ? html`<i class="pb-poss" title="Has the ball"></i>` : '';
      const side = (t, v, o, right) => html`<div class="pb-t${right ? ' h' : ''}${lost(v, o)}"><span class="pb-disc"><img src="${t.logo}" alt=""></span><b class="lk-tri">${t.abbr}</b>${ball(t.id)}${st === 'pre' ? '' : html`<b class="lk-sc">${hide ? '–' : v}</b>`}</div>`;
      const mid = st === 'live' ? html`<span class="badge live">${hide ? 'Live' : S.label}</span>${!slim && !hide && S.dd ? html`<span class="pb-dd r-down-distance">${S.dd}</span>` : ''}`
        : st === 'post' ? html`<span class="badge">Final${g.ot ? '/OT' : ''}</span>` : html`<span class="badge">${fmt.weekday(g.ts)} ${fmt.time(g.ts)}</span>`;
      const go = st === 'pre' ? `#/game/${g.id}?tab=preview` : `#/game/${g.id}`;
      return html`<a class="hh-mini pb2 ${pb4 ? '' : slim ? 'b' : 'a'}${tall} tap" data-go="${go}" style="${raw(`--ca:${App.teamFill(away)};--ch:${App.teamFill(home)}`)}">${side(away, S.as, S.hs)}<div class="pb-mid">${mid}</div>${side(home, S.hs, S.as, true)}</a>`;
    }
  }
  // while your game is live, the bar carries the score and the clock instead of the kickoff time
  const lg = Dt.liveGameFor(mine);
  if (lg) {
    const S = Dt.score(lg), home = Dt.isHome(lg, mine), hide = Dt.spoiled(lg);
    const sc = hide ? '' : `${home ? S.hs : S.as}–${home ? S.as : S.hs}`;
    const right = html`<span class="badge live">Live</span><span class="hh-mini-sc">${sc}</span><span class="hh-mini-n">${hide ? 'Score hidden' : S.label}</span>`;
    return html`<a class="hh-mini v3 lv tap" data-go="#/game/${lg.id}" style="${raw(App.teamVars(tm))}"><img class="hh-mini-lg" src="${tm.logo}" alt=""><b>${tm.abbr}</b><em>${r.str}</em><span class="grow"></span>${right}${icon('chev', 'xs')}</a>`;
  }
  return html`<a class="hh-mini v3 tap" data-go="#/team/${mine}" style="${raw(App.teamVars(tm))}"><img class="hh-mini-lg" src="${tm.logo}" alt=""><b>${tm.abbr}</b><em>${r.str}</em><span class="grow"></span>${o ? html`<span class="hh-mini-n">${Dt.isHome(nx, mine) ? 'vs' : 'at'} ${o.abbr} · ${fmt.weekday(nx.ts)} ${fmt.time(nx.ts)}</span>` : ''}${icon('chev', 'xs')}</a>`;
}


/** live now (apply-deck A, approved build-deck 2026-11-09): only when two or more of your games are on at once, a fanned stack,
 *  your team's game on top, then followed teams. Each card blends the two teams' colours, deepened only as far as the
 *  white type on it needs. Tap for Scores. */
function liveDeck() {
  // ?pv=deckdemo (Approvals preview): pretend you also follow the first two teams playing, so the stack has 2+ games to show
  const mine = primary(), cared = App.pv.has('deckdemo') ? [...caredTeams(), ...Dt.liveGames().slice(0, 2).map(g => g.a)] : caredTeams();
  const L = Dt.liveGames().filter(g => involves(g, cared) && !Dt.spoiled(g)).sort((x, y) => (involves(y, [mine]) ? 1 : 0) - (involves(x, [mine]) ? 1 : 0));
  if (L.length < 2) return '';
  const card = g => { const S = Dt.score(g), a = team(g.a), h = team(g.h), side = t => html`<div><span class="fx-disc"><img src="${t.logo}" alt=""></span><b>${t.name}</b></div>`;
    return html`<div class="dk" style="--ma:${App.onWhite(a.color)};--mb:${App.onWhite(h.color)}"><span class="dk-st"><span class="badge live">Live</span>${S.label}</span><div class="dk-sc">${side(a)}<em>${S.as}</em><span>–</span><em>${S.hs}</em>${side(h)}</div></div>`; };
  const top = L.slice(0, 3);
  return html`<section class="sec"><div class="sec-head"><div class="h2">Live now · your games</div><a class="more" data-go="#/scores">${L.length} on${icon('chev', 'xs')}</a></div>
    <a class="pad dk-stack tap" data-go="#/scores" aria-label="${L.length} of your games live, open Scores">${top.map((g, i) => html`<div class="dk-fan f${i}">${card(g)}</div>`).reverse()}</a>
    ${L.length > 3 ? html`<div class="meta center mt8">+${L.length - 3} more</div>` : ''}</section>`;
}

/** your next game (apply-strip B; preview only, ?pv=strip, until approved on its placement card): the last two results and the next three games as game days, month,
 *  date, the opponent's logo, then W / L or vs / @. The next game is the white day; its card sits under the strip. */

/** the season (approved round 6 v5): a row of opponent logos, the result as a W or L on the corner, next week ringed.
 *  It scrolls sideways and opens on this week (see scrollSeason). */
/** open the season row on this week */
function scrollSeason(el) {
  const row = el.querySelector('.fxr-row'), nx = row && (row.querySelector('.fxr-c.nx') || row.querySelector('.fxr-c.live'));
  if (nx) row.scrollLeft = Math.max(0, nx.offsetLeft - row.offsetLeft - 2 * (nx.offsetWidth + 8));
}

/** the numbers (approved round 6 v5): with a game coming, the tale of the tape against that opponent, each rank under its
 *  number and the better side underlined; otherwise your three numbers. No boxes, nothing faded. */
function fxStats(id, s, st) {
  const ts = Dt.teamSeason(id, s); if (!ts || ts.g < 2) return null;
  const by = st.all.slice().sort((a, b) => b.diff - a.diff), dr = by.findIndex(r => r.tid === id) + 1, df = by[dr - 1].diff;
  return [[ts.ppg.toFixed(1), 'Points a game', Dt.teamRank(id, s, 'ppg'), ts.ppg, 1], [ts.papg.toFixed(1), 'Allowed a game', Dt.teamRank(id, s, 'papg', true), ts.papg, -1], [(df > 0 ? '+' : '') + df, 'Point diff', dr, df, 1]];
}
function fxNums(mine, s, st) {
  const a = fxStats(mine, s, st); if (!a) return '';
  const g = Dt.liveGameFor(mine) || Dt.nextGame(mine), oid = g && g.t !== 1 && g.ts - time.now() < 12 * DAY ? Dt.opp(g, mine) : null, o = oid && fxStats(oid, s, st);
  if (!o) return html`<div class="fx-big">${a.map(([v, l, r]) => html`<div><b>${v}</b><span>${l}</span><em>${fmt.ord(r)} in NFL</em></div>`)}</div>`;
  const side = (x, y, r) => html`<div class="fx-tv ${r ? 'r' : ''}"><b class="${(x[3] - y[3]) * x[4] > 0 ? 'up' : ''}">${x[0]}</b><span>${fmt.ord(x[2])} in NFL</span></div>`;
  const tm = (id, r) => html`<span class="fx-tm ${r ? 'r' : ''}">${r ? '' : html`<span class="fx-disc"><img src="${team(id).logo}" alt=""></span>`}<b>${team(id).abbr}</b>${r ? html`<span class="fx-disc"><img src="${team(id).logo}" alt=""></span>` : ''}</span>`;
  return html`<a class="fx-tape tap" data-go="#/game/${g.id}?tab=preview"><div class="fx-tape-h">${tm(mine)}<span class="fx-k">Tale of the tape</span>${tm(oid, 1)}</div>
    ${a.map((x, i) => html`<div class="fx-tr">${side(x, o[i])}<span class="fx-tl">${x[1]}</span>${side(o[i], x, 1)}</div>`)}</a>`;
}

/** the stage stays put and the sheet slides up over it. A stage taller than the screen scrolls until its
 *  bottom is in view, then pins. The header stays clear while it sits over the stage. */
function mountStage(el) {
  const st = el.querySelector('.hm-stage'), sh = el.querySelector('.hm-sheet'); if (!st || !sh) return null;
  const head = el.querySelector('.phead');
  const fit = () => {
    const tab = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tab-h')) || 0;
    st.style.top = Math.min(0, el.clientHeight - tab - st.offsetHeight) + 'px';
  };
  const on = () => el.classList.toggle('on-stage', sh.getBoundingClientRect().top > (head ? head.getBoundingClientRect().bottom : 0));
  fit(); on();
  el.addEventListener('scroll', on, { passive: true }); addEventListener('resize', fit);
  return () => { el.removeEventListener('scroll', on); removeEventListener('resize', fit); };
}

/** no team yet: Home's hero asks you to make it yours (approved round 6, option C): search, then a swipeable line of helmets.
 *  Tapping a helmet follows that team; Make it mine starts setup. */
const PICK_TEAMS = ['12', '2', '21', '26', '6', '9', '25', '33'];
function pickHero() {
  return html`<section class="fh fh-pick hm-stage">
    <div class="fh-in"><div class="fh-hello">Welcome to the NFL app</div><div class="fh-name">Who's your team?</div>
      <a class="fh-search tap" data-go="#/teams/all">${icon('search', 'sm')}<span>Search 32 teams or a city</span></a>
      <div class="fh-row">${PICK_TEAMS.map(id => { const t = team(id); return html`<button class="fh-h tap" data-act="follow" data-arg="team:${id}" aria-label="Follow the ${t.full}">${UI.helmet(id, { face: 'left' })}<b>${t.name}</b><span>${t.full.replace(' ' + t.name, '')}</span></button>`; })}</div>
      <div class="fh-acts"><button class="btn white" data-act="home-onboard">Make it mine</button><a class="btn fh-ghost" data-go="#/teams/all">Not sure yet</a></div></div></section>`;
}

/** the race your team is in (approved round 6, option A): three facts (the lead, the seed, the power ranking),
 *  the division table with your row in your colour, and your rival */
function stakesBlock() {
  const mine = primary(); if (!mine) return '';
  if (!['regular', 'post'].includes(time.phase())) return '';   // no race to talk about in the offseason
  const tm = team(mine), s = Dt.seasonForStats(), st = Dt.standings(s);
  const div = st.div[tm.conf + ' ' + tm.div] || []; if (!div.some(r => r.gp)) return '';
  const me = div.find(r => r.tid === mine), i = div.indexOf(me);
  const lead = i === 0 ? (div[1] ? gb(me, div[1]) : 0) : -gb(div[0], me);
  const pr = Dt.powerRank(s), prr = pr && pr.of[mine];
  const facts = [[lead > 0 ? `+${lead}` : lead < 0 ? `${lead}` : 'Tied', lead > 0 ? `game${lead === 1 ? '' : 's'} clear atop the ${tm.div}` : lead < 0 ? `back of the ${div[0].t.name}` : `atop the ${tm.div}`],
    [`No. ${me.seed}`, me.seed === 1 ? 'seed, the only bye' : me.seed <= 7 ? `seed in the ${tm.conf}` : `in the ${tm.conf}, out today`], prr ? [`No. ${prr.rk}`, 'power ranking', '#/power-rankings'] : null].filter(Boolean);
  const rec = r => `${r.w}-${r.l}${r.tie ? '-' + r.tie : ''}`;
  // rival: one they picked, else the closest division challenger
  const rid = (P().rivals || []).find(id => team(id) && id !== mine) || (div.filter(r => r.tid !== mine).sort((a, b) => Math.abs(gb(a, me)) - Math.abs(gb(b, me)))[0] || {}).tid;
  let rival = '';
  if (rid) {
    const rl = Dt.liveGameFor(rid), rlast = Dt.lastGame(rid), rnx = Dt.nextGame(rid), hide = (rl || rlast) && Dt.spoiled(rl || rlast);
    let txt = '';
    if (rl) { const S = Dt.score(rl); txt = hide ? 'Playing now' : `Live: ${S.as}-${S.hs} · ${S.label}`; }
    else if (rlast) { const r = Dt.result(rlast, rid); txt = hide ? `Played ${team(Dt.opp(rlast, rid)).name}` : `${r.r} ${r.us}-${r.them} ${Dt.isHome(rlast, rid) ? 'vs' : 'at'} ${team(Dt.opp(rlast, rid)).name}`; }
    rival = html`<a class="stk-rival tap" data-go="#/team/${rid}">${UI.logo(rid, 'md')}<span class="stk-tx"><span class="stk-eb">Rival watch</span><b>${team(rid).name} <span class="stk-rec">${Dt.record(rid, s).str}</span></b><span>${txt}${rnx && !rl ? ` · next ${Dt.isHome(rnx, rid) ? 'vs' : 'at'} ${team(Dt.opp(rnx, rid)).abbr} ${fmt.day(rnx.ts)}` : ''}</span></span>${icon('chev', 'sm')}</a>`;
  }
  return html`<section class="sec"><div class="sec-head"><div class="h2">What's at stake</div><a class="more" data-go="#/playoffs">Playoff picture${icon('chev', 'xs')}</a></div>
    <div class="pad"><div class="stk">
      <div class="stk-facts">${facts.map(([v, l, go]) => html`<a class="${go ? 'tap' : ''}" ${raw(go ? `data-go="${go}"` : '')}><b>${v}</b><span>${l}</span></a>`)}</div>
      <div class="stk-tbl">${div.map((r, k) => html`<a class="stk-row tap r-sans ${r.tid === mine ? 'me' : ''}" data-go="#/team/${r.tid}" style="--e:${App.teamFill(r.t)}"><span class="stk-n">${k + 1}</span>${UI.logo(r.tid, 'sm')}<b class="stk-nm">${r.t.name}</b><span class="stk-rec">${rec(r)}</span><span class="stk-gb">${k ? (gb(div[0], r) || '—') : '—'}</span></a>`)}</div>
      ${rival}</div></div></section>`;
}

/** "No. 6 in the power rankings ▲3" */
function prLine(tid, s) {
  const pr = Dt.powerRank(s), r = pr && pr.of[tid]; if (!r) return '';
  return html`<a class="sk-line tap" data-go="#/power-rankings"><b>No. ${r.rk}</b> in the power rankings ${UI.prMove(r.mv)}${r.prev && r.mv ? html` <span class="dim">from ${fmt.ord(r.prev)}</span>` : ''}</a>`;
}
/** once the regular season is done, a team that made it gets its "Playoff bound" milestone (once per season) */
function clinchCheck() {
  const mine = primary(); if (!mine || document.documentElement.classList.contains('in-frame')) return;
  const s = Dt.seasonForStats(), reg = Dt.D.games.filter(g => g.s === s && g.t === 2);
  if (!reg.length || reg.some(g => Dt.state(g) !== 'post')) return;
  const r = Dt.standings(s).all.find(x => x.tid === mine), key = `clinch-${s}-${mine}`, seen = P().msSeen = P().msSeen || [];
  if (!r || !r.inPlayoffs || seen.includes(key)) return;
  seen.push(key); store.save();
  setTimeout(() => UI.milestone(UI.MILESTONES.clinch(mine)), 700);
}
/** a module shaped by the kind of fan you are */
function forYou() {
  const mine = primary(); if (!mine) return '';
  const tm = team(mine), tr = fanTraits(), out = [];
  const head = (title, more, go) => html`<div class="sec-head"><div class="h2">${title}</div>${more ? html`<a class="more" data-go="${go}">${more}${icon('chev', 'xs')}</a>` : ''}</div>`;
  if (tr.includes('spoiler')) {
    const fin = Dt.D.games.filter(g => involves(g, myTeams()) && Dt.state(g) === 'post' && time.now() - g.ts < 9 * DAY).slice(-3).reverse();
    if (fin.length) out.push(html`<section class="sec"><div class="sec-head"><div class="h2">Watch it fresh</div><span class="fr-pill">${icon('eyeoff', 'xs')}Shield on</span></div><div class="list">
      ${fin.map(g => { const me = involves(g, [mine]) ? mine : myTeams().find(id => involves(g, [id])); return UI.row({ left: html`<span class="fr-pair">${UI.logo(me, 'sm')}${UI.logo(Dt.opp(g, me), 'sm')}</span>`, title: `${team(g.a).name} at ${team(g.h).name}`, sub: `${Dt.weekLabel(g.t, g.w)} · Full replay`, right: html`<span class="btn xs ink">${icon('play', 'xs')}Watch</span>`, go: `#/game/${g.id}`, chev: false }); })}</div></section>`);
  }
  if (tr.includes('diehard')) {
    const recent = fmt.dayKey(time.now() - 30 * DAY), inj = Dt.injuries(mine).slice(0, 5), mv = Dt.tx({ team: mine }).filter(r => r.dt >= recent).sort((a, b) => b.dt.localeCompare(a.dt)).slice(0, 3);
    const sev = st => /Out|Reserve|Physically/i.test(st) ? 'loss' : 'warn';
    if (inj.length || mv.length) out.push(html`<section class="sec">${head(`Inside the ${tm.name}`, 'Depth chart', `#/team/${mine}?tab=depth`)}<div class="list in-list">
      ${inj.length ? html`<div class="in-h">Injury report</div>${inj.map(i => UI.row({ left: UI.hs(i.p, 'sm'), title: i.n, sub: `${i.pos} · ${i.ty || 'Injury'}`, right: html`<span class="badge ${sev(i.s)}">${injShort(i.s)}</span>`, go: `#/player/${i.p}`, chev: false }))}` : ''}
      ${mv.length ? html`<div class="in-h">Moves</div>${mv.map(r => html`<div class="in-mv"><b>${fmt.date(r.dt + 'T12:00:00Z')}</b><span>${r.x}</span></div>`)}` : ''}</div></section>`);
  }
  if (tr.includes('analyst')) {
    const s = Dt.seasonForStats(), ts = Dt.teamSeason(mine, s);
    if (ts && ts.g) {
      // gradient rank tiles: approved apply-numbers A (2026-11-08): each tile is the team gradient (180°, full colour by 42%) with its rank as a
      // hairline outline behind; the colour is deepened only as far as the white text needs to pass 4.5:1
      let c = tm.color; for (let n = 0; n < 40 && App.contrast('#ffffff', c) < 4.5; n++) c = App.mix(c, '#000000', .05);
      const bg = `linear-gradient(180deg,${App.mix(c, '#ffffff', .22)} 0%,${c} 42%,${c} 100%)`;
      const tile = (v, l, key, low) => { const r = Dt.teamRank(mine, s, key, low);
        return html`<div class="bn-t" style="background:${bg}"><svg class="bn-bg" viewBox="0 0 200 160" aria-hidden="true"><text x="-6" y="140" font-family="APD C, sans-serif" font-weight="900" font-style="italic" font-size="150" fill="none" stroke="rgba(255,255,255,.18)" stroke-width=".5">${r}</text></svg><b>${fmt.ord(r)}</b><span class="bn-l">${l}</span><span class="bn-v">${v}</span></div>`; };
      const sgn = v => (v >= 0 ? '+' : '') + v.toFixed(2);
      out.push(html`<section class="sec">${head('By the numbers', 'Team rankings', '#/team-rankings')}<div class="pad bn-g">
        ${tile(sgn(ts.epaPlay), 'Offense EPA per play', 'epaPlay')}${tile((ts.succRate * 100).toFixed(1) + '%', 'Success rate', 'succRate')}
        ${tile(sgn(ts.dPlays ? ts.dEpa / ts.dPlays : 0), 'Defense EPA per play', 'dEpa', true)}${tile((ts.explRate * 100).toFixed(1) + '%', 'Explosive plays', 'explRate')}</div></section>`);
    }
  }
  // Your weekend / Kickoffs, your time (approved round 6, v5 B): by day, time or Live over the clock, logos, the matchup, where to watch
  const weekend = (title, more, go, wk, watch) => {
    const days = [...new Set(wk.map(g => fmt.day(g.ts)))];
    return html`<section class="sec"><div class="sec-head wk-head"><div class="h2">${title}</div><a class="more" data-go="${go}">${more}${icon('chev', 'xs')}</a></div>
      ${days.map(dy => html`<div class="wk-day">${dy}</div><div class="list">${wk.filter(g => fmt.day(g.ts) === dy).map(g => { const lv = Dt.state(g) === 'live';
        return html`<a class="row tap wk-r" data-go="#/game/${g.id}"><div class="wk-t">${lv ? html`<span class="badge live">Live</span><span class="wk-clk">${Dt.score(g).label || ''}</span>` : html`<b>${fmt.time(g.ts)}</b>`}</div>
          <span class="wk-lg">${UI.logo(g.a, 'sm')}${UI.logo(g.h, 'sm')}</span><div class="row-main"><div class="wk-mu">${team(g.a).name} at ${team(g.h).name}</div><div class="wk-m">${watch(g, lv)}</div></div></a>`; })}</div>`)}</section>`;
  };
  if (tr.includes('intl')) {
    const now = time.now(), wk = Dt.D.games.filter(g => g.ts > now - 3 * 3600e3 && g.ts < now + 7 * DAY && g.t !== 1).sort((a, b) => (involves(b, caredTeams()) - involves(a, caredTeams())) || a.ts - b.ts).slice(0, 4).sort((a, b) => a.ts - b.ts);
    if (wk.length) out.push(weekend('Kickoffs, your time', fmt.tzAbbr(time.now()), '#/scores', wk, g => involves(g, myTeams()) ? 'Your team · Game Pass' : 'Game Pass'));
  }
  if (tr.includes('casual') && !tr.includes('spoiler')) {
    const now = time.now(), wk = Dt.D.games.filter(g => involves(g, caredTeams()) && g.ts > now - 3 * 3600e3 && g.ts < now + 7 * DAY && g.t !== 1).sort((a, b) => a.ts - b.ts).slice(0, 4);
    if (wk.length) out.push(weekend('Your weekend', 'Where to watch', '#/watch', wk, (g, lv) => { const w = Dt.watch(g).find(o => o.ok); return lv ? `On ${(g.tv || []).join('/')}` : w ? w.label : (g.tv || []).join('/'); }));
  }

  if (tr.includes('new')) out.push(newFanCards());
  return out;
}

function trackerRows() {
  const pids = (P().players || []).filter(pid => Dt.player(pid)).slice(0, 8);
  const s = Dt.seasonForStats();
  return pids.map(pid => {
    const p = Dt.player(pid);
    const g = Dt.liveGameFor(p.t);
    if (g) {
      const hide = Dt.spoiled(g);
      const ln = hide ? null : liveLine(pid, g);
      return { pid, p, g, live: true, text: hide ? 'Live — hidden by spoiler shield' : ln ? ln.text : 'Live', fp: ln && ln.touched ? ln.fp : null, sub: `${team(Dt.opp(g, p.t)).abbr} · ${Dt.score(g).label}` };
    }
    const log = Dt.gameLog(pid, s) || [];
    const last = log[log.length - 1];
    if (last) {
      const hide = Dt.spoiled(last.g);
      return { pid, p, g: last.g, text: hide ? 'Hidden by spoiler shield' : boxLine(last.cats), fp: hide ? null : Dt.fantasy(last.cats), sub: `${Dt.isHome(last.g, p.t) ? 'vs' : '@'} ${team(Dt.opp(last.g, p.t)).abbr} · ${Dt.weekLabel(last.g.t, last.g.w, true)}` };
    }
    const nx = Dt.nextGame(p.t);
    return { pid, p, text: nx ? `Next: ${Dt.isHome(nx, p.t) ? 'vs' : '@'} ${team(Dt.opp(nx, p.t)).abbr} · ${fmt.day(nx.ts)}` : 'No games yet this season', sub: '' };
  });
}
/** your players (approved round 6, option A): one player line each, the stat line in Stats, fantasy only as a footnote in Meta */
function tracker() {
  const rows = trackerRows(); if (!rows.length) return '';
  const anyLive = rows.some(r => r.live);
  return html`<section class="sec"><div class="sec-head"><div class="h2">${anyLive ? 'Your players, live' : 'Your players'}</div><a class="more" data-go="#/you?f=players">Edit${icon('chev', 'xs')}</a></div>
    <div class="pad"><div class="pl-list">${rows.map(r => html`<a class="pl-row tap" data-go="#/player/${r.pid}">${UI.hs(r.pid, 'sm')}<span class="pl-tx"><b>${r.p.n}${r.live ? raw(' <span class="badge live solid">Live</span>') : ''}</b><span class="pl-line">${r.text}</span><span>${[r.p.pos, team(r.p.t).abbr, r.sub].filter(Boolean).join(' · ')}${r.fp != null ? ` · ${r.fp.toFixed(1)} fantasy pts` : ''}</span></span></a>`)}</div></div></section>`;
}

/* ------------------------------------------------------------------ other followed teams strip */
/** your other teams (approved round 6, option B): one row each on the surface: logo, Display name, record, the game on the right */
function otherTeams() {
  const mine = primary();
  const others = myTeams().filter(id => id !== mine && team(id));
  if (!others.length) return '';
  return html`<section class="sec"><div class="sec-head"><div class="h2">Your other teams</div></div>
    <div class="pad"><div class="pl-list">${others.map(tid => {
      const g = Dt.liveGameFor(tid) || Dt.nextGame(tid) || Dt.lastGame(tid);
      const rec = Dt.record(tid, Dt.seasonForStats()).str;
      let line = 'No games scheduled';
      if (g) {
        const S = Dt.score(g), hide = Dt.spoiled(g) && S.st !== 'pre', o = team(Dt.opp(g, tid));
        line = S.st === 'pre' ? `${Dt.isHome(g, tid) ? 'vs' : '@'} ${o.abbr} · ${S.label}` : S.st === 'live' ? `${hide ? 'Live' : (Dt.isHome(g, tid) ? S.hs + '–' + S.as : S.as + '–' + S.hs) + ' · ' + S.label} vs ${o.abbr}` : hide ? `Final vs ${o.abbr}` : (() => { const r = Dt.result(g, tid); return `${r.r} ${r.us}–${r.them} ${Dt.isHome(g, tid) ? 'vs' : '@'} ${o.abbr}`; })();
      }
      const live = g && Dt.state(g) === 'live';
      return html`<a class="ot-row tap" data-go="${g ? '#/game/' + g.id : '#/team/' + tid}">${UI.logo(tid, 'md')}<span class="pl-tx"><b class="ot-nm">${team(tid).name}</b><span class="pl-line">${rec}</span></span><span class="ot-r">${live ? raw('<span class="badge live solid">Live</span>') : ''}${line}</span></a>`;
    })}</div></div></section>`;
}

/* ------------------------------------------------------------------ feed blocks */
/** this app never surfaces gambling content */
const BET = /\b(bet|bets|betting|odds|parlays?|sportsbooks?|wagers?|spreads?|over\/under|moneyline|prop bets?)\b/i;
function clean(list) { return list.filter(a => !BET.test(a.h || '') && !BET.test(a.d || '')); }
function news(o) { return clean(Dt.news(o)); }
function rankedNews() {
  const cared = caredTeams(), pl = P().players || [], pr = primary();
  return news().map(a => ({ a, sc: (pr && a.tm.includes(pr) ? 4 : 0) + (a.tm.some(t => cared.includes(t)) ? 2 : 0) + (a.ath.some(x => pl.includes(x)) ? 3 : 0) - (time.now() - Date.parse(a.pub)) / (2 * DAY) }))
    .sort((x, y) => y.sc - x.sc).map(x => x.a);
}
/** the News tab's Top (news-pass, built Nov 10): newest first; your team, teams and players only break ties within the same hour */
function latestNews() {
  const cared = caredTeams(), pl = P().players || [], pr = primary();
  return news().map(a => ({ a, t: Math.floor(Date.parse(a.pub) / 3.6e6), sc: (pr && a.tm.includes(pr) ? 4 : 0) + (a.tm.some(t => cared.includes(t)) ? 2 : 0) + (a.ath.some(x => pl.includes(x)) ? 3 : 0) }))
    .sort((x, y) => (y.t - x.t) || (y.sc - x.sc)).map(x => x.a);
}
function recentFinals(n = 8) {
  const now = time.now();
  return Dt.D.games.filter(g => g.t !== 1 && g.st === 'post' && Dt.state(g) === 'post' && now - g.ts < 30 * DAY).sort((a, b) => b.ts - a.ts).slice(0, n);
}
function videoItems() {
  const cared = caredTeams();
  const fin = recentFinals(16).sort((a, b) => involves(b, cared) - involves(a, cared));
  const out = [];
  fin.slice(0, 6).forEach(g => {
    const b = Dt.box(g.id) || {}; const hide = Dt.spoiled(g);
    const win = g.hs > g.as ? g.h : g.a;
    out.push({ title: hide ? `${team(g.a).name} at ${team(g.h).name}: highlights` : `${team(g.a).name} vs. ${team(g.h).name} highlights`, sub: `${Dt.weekLabel(g.t, g.w)} · ${fmt.ago(g.ts + Dt.GAME_LEN)}`, img: hide ? null : b.ri, team: win, dur: `${3 + hashSeed(g.id) % 9}:${String(10 + hashSeed(g.id + 'x') % 49)}`, tier: 'free', kind: 'Highlights', start: hashSeed(g.id) % 200 });
  });
  const myLast = primary() && Dt.lastGame(primary());
  if (myLast) out.splice(1, 0, { title: `Condensed game: ${team(myLast.a).abbr} at ${team(myLast.h).abbr}`, sub: 'Every snap in ~45 min', team: primary(), dur: '44:12', tier: 'premium', kind: 'Condensed replay' });
  out.splice(2, 0, { title: 'NFL Channel — free, 24/7', sub: 'Films, classic games and highlight shows', team: null, tier: 'free', kind: 'Live channel', live: null });
  return out;
}
function statOfDay() {
  const s = Dt.seasonForStats();
  const tot = Dt.seasonTotals(s); if (!tot) return '';
  const opts = [['passing.passingYards', 'passing yards', 'Passing'], ['rushing.rushingYards', 'rushing yards', 'Rushing'], ['receiving.receivingYards', 'receiving yards', 'Receiving'], ['defensive.sacks', 'sacks', 'Pass rush'], ['passing.passingTouchdowns', 'touchdown passes', 'Passing'], ['receiving.receptions', 'catches', 'Receiving'], ['rushing.rushingTouchdowns', 'rushing touchdowns', 'Rushing']];
  const [path, noun, cat] = opts[dayIndex() % opts.length];
  const L = Dt.leaders(s, path, 5); if (!L.length || !L[0].v) return '';
  const lead = L[0], gap = lead.v - (L[1] ? L[1].v : 0);
  const p = Dt.player(lead.pid) || { n: lead.n };
  const v = n => Number.isInteger(n) ? fmt.n(n) : fmt.n(n, 1);
  // approved round 6, option A: the number is the picture on the leader's team gradient, the next four as a ladder on glass
  const tm = team(lead.tid);
  return html`<section class="sec"><div class="sec-head"><div class="h2">Stat of the day</div><a class="more" data-go="#/leaders?stat=${path}&s=${s}">Leaders${icon('chev', 'xs')}</a></div>
    <div class="pad"><a class="sotd tap" data-go="#/player/${lead.pid}" style="${raw(App.teamVars(tm))}"><div class="sotd-eb">${cat} · ${s} season</div>
      <div class="sotd-big">${v(lead.v)}</div><div class="sotd-noun">${noun}, most in the NFL${gap > 0 ? ` · ${v(gap)} ahead` : ''}</div>
      <div class="sotd-who">${UI.hs(lead.pid, 'lg')}<span class="sotd-tx"><b>${p.n || lead.n}</b><span>${tm.name} · ${lead.gp} games</span></span></div>
      <div class="sotd-lad">${L.slice(1).map((x, i) => html`<div class="sotd-lr"><span class="sotd-no">${i + 2}</span><span class="sotd-ln">${(Dt.player(x.pid) || { n: x.n }).n || x.n}</span><i class="sotd-m"><i style="width:${Math.round(x.v / lead.v * 100)}%"></i></i><b>${v(x.v)}</b></div>`)}</div></a></div></section>`;
}
function divisionBlock() {
  const mine = primary(); if (!mine) return '';
  const s = Dt.seasonForStats();
  const st = Dt.standings(s); const tm = team(mine);
  const rows = st.div[tm.conf + ' ' + tm.div] || [];
  if (!rows.some(r => r.gp)) return '';
  return html`<section class="sec"><div class="sec-head"><div class="h2">${tm.conf} ${tm.div}</div><a class="more" data-go="#/standings">Standings${icon('chev', 'xs')}</a></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Team</th><th>W-L${rows.some(r => r.tie) ? '-T' : ''}</th><th>Pct</th><th>Div</th><th>Diff</th><th>Strk</th></tr></thead><tbody>
    ${rows.map(r => html`<tr class="${r.tid === mine ? 'hl' : ''}" data-go="#/team/${r.tid}"><td><span class="flex gap8">${UI.logo(r.tid, 'sm')}${r.t.name}${r.inPlayoffs ? html`<span class="tiny">${r.seed}</span>` : ''}</span></td><td>${r.w}-${r.l}${rows.some(x => x.tie) ? '-' + r.tie : ''}</td><td>${r.pct.toFixed(3).replace(/^0/, '')}</td><td>${r.dw}-${r.dl}</td><td class="${r.diff > 0 ? 'c-win' : r.diff < 0 ? 'c-loss' : ''}">${r.diff > 0 ? '+' : ''}${r.diff}</td><td>${r.streak}</td></tr>`)}
    </tbody></table></div></section>`;
}
function recapsBlock(skipIds) {
  const cared = caredTeams();
  const fin = recentFinals(20).filter(g => !skipIds.has(g.id) && (Dt.box(g.id) || {}).rh).sort((a, b) => (involves(b, cared) - involves(a, cared)) || b.ts - a.ts).slice(0, 4);
  if (!fin.length) return '';
  return html`<section class="sec"><div class="sec-head"><div class="h2">Recaps</div><a class="more" data-go="#/scores">All scores${icon('chev', 'xs')}</a></div>
    <div class="list">${fin.map(g => {
      const b = Dt.box(g.id), hide = Dt.spoiled(g);
      return html`<a class="row tap hm-recap rcp" data-go="#/article/recap-${g.id}"><div class="rcp-sc">${UI.lk1Game(g)}</div>
        <div class="row-main"><div class="row-title clamp2">${hide ? `${team(g.a).name} at ${team(g.h).name}` : b.rh}</div><div class="row-sub">${Dt.weekLabel(g.t, g.w)} · ${fmt.day(g.ts)}${hide ? ' · spoiler shield' : ''}</div></div></a>`;
    })}</div></section>`;
}
function triviaTeaser() {
  // a real-data question: who won a recent Super Bowl
  const sbs = Dt.D.games.filter(g => g.t === 3 && g.w === 5 && Dt.state(g) === 'post');
  if (!sbs.length) return '';
  const g = sbs[dayIndex() % sbs.length];
  const win = g.hs > g.as ? g.h : g.a, lose = Dt.opp(g, win);
  const decoys = Dt.D.teams.map(x => x.id).filter(id => id !== win && id !== lose).sort((a, b) => hashSeed(a + dayIndex()) - hashSeed(b + dayIndex())).slice(0, 2);
  const opts = [win, lose, ...decoys].sort((a, b) => hashSeed(a + 'o' + g.id) - hashSeed(b + 'o' + g.id));
  const ans = (P().trivia || {})['home-' + g.id];
  return html`<section class="sec"><div class="sec-head"><div class="h2">Daily trivia</div><a class="more" data-go="#/trivia">Play more${icon('chev', 'xs')}</a></div>
    <div class="pad"><div class="trv hm-trivia"><div class="trv-eb">${P().streak || 0}-day streak · +10 pts</div><div class="trv-q">Who won Super Bowl ${Dt.sbNumeral(g.s)}?</div>
      <div class="trv-opts">${opts.map(id => html`<button class="trv-o hm-opt ${ans ? (id === win ? 'right' : id === ans ? 'wrong' : '') : ''}" data-act="home-trivia" data-arg="${g.id}:${id}:${win}" ${ans ? raw('disabled') : ''}><img src="${team(id).logo}" alt=""><b>${team(id).name}</b></button>`)}</div>
      ${ans ? html`<div class="trv-res">${ans === win ? raw('<span class="badge win">Correct</span>') : raw('<span class="badge loss">Not quite</span>')}<span>${ans === win ? '+10 points · ' : ''}${team(win).full} beat the ${team(lose).name} ${Math.max(g.hs, g.as)}–${Math.min(g.hs, g.as)} at ${g.vn}.</span></div>` : ''}</div></div></section>`;
}
function newFanCards() {
  if (P().level !== 'new') return '';
  const cards = [
    { ic: 'football', t: 'How a game works', s: 'Four quarters, four downs, ten yards. The 60-second version.', m: '1 min', go: '#/learn' },
    { ic: 'trophy', t: 'How the playoffs work', s: '14 teams, one bye per conference, one Super Bowl.', m: '2 min', go: '#/learn' },
    { ic: 'users', t: 'Who to watch', s: 'The players everyone will be talking about on Monday.', m: '2 min', go: '#/stats' },
  ], [f, ...rest] = cards;
  return html`<section class="sec"><div class="sec-head"><div class="h2">New to football?</div><a class="more" data-go="#/learn">Football 101${icon('chev', 'xs')}</a></div>
    <div class="pad"><a class="nf-f tap" data-go="${f.go}">${icon(f.ic)}<span class="nf-eb">Start here · ${f.m}</span><b>${f.t}</b><span>${f.s}</span><span class="btn sm white">Start</span></a></div>
    <div class="list mt8">${rest.map(c => UI.row({ left: html`<div class="lr-ic">${icon(c.ic, 'sm')}</div>`, title: c.t, sub: c.s, right: html`<span class="meta">${c.m}</span>`, go: c.go }))}</div>
    <div class="pad mt12"><div class="nf-words">Words you'll hear</div><div class="flex wrap gap6">${['Down & distance', 'Red Zone', 'Turnover', 'Wild Card', 'Bye week'].map(w => html`<button class="chip" data-act="term" data-arg="${w}">${icon('help', 'sm')}${w}</button>`)}</div></div></section>`;
}
function offseasonBlocks() {
  const ph = time.phase(); if (!['fa', 'draft', 'summer', 'camp'].includes(ph)) return '';
  const cared = caredTeams();
  const moves = Dt.tx().filter(r => !cared.length || cared.includes(r.t)).slice(0, 5);
  const champ = Dt.D.games.filter(g => g.t === 3 && g.w === 5 && Dt.state(g) === 'post').pop();
  return html`${moves.length ? html`<section class="sec"><div class="sec-head"><div class="h2">${cared.length ? 'Your teams’ moves' : 'Latest moves'}</div><a class="more" data-go="#/transactions">All${icon('chev', 'xs')}</a></div>
      <div class="list">${moves.map(r => html`<div class="row static">${UI.logo(r.t, 'sm')}<div class="row-main"><div class="row-title" style="font-weight:500">${r.x}</div><div class="row-sub">${team(r.t).name} · ${fmt.date(r.dt + 'T12:00:00Z')}</div></div></div>`)}</div></section>` : ''}
    ${champ ? html`<section class="sec"><a class="card hm-champ tap" data-go="#/game/${champ.id}" style="${raw(App.teamVars(team(champ.hs > champ.as ? champ.h : champ.a)))}"><div class="cpad flex gap12">${UI.logo(champ.hs > champ.as ? champ.h : champ.a, 'lg')}<div class="grow"><div class="eyebrow">Reigning champions</div><div class="h2 display mt6">${team(champ.hs > champ.as ? champ.h : champ.a).full}</div><div class="meta mt6">Super Bowl ${Dt.sbNumeral(champ.s)} · ${Math.max(champ.hs, champ.as)}–${Math.min(champ.hs, champ.as)} over the ${team(champ.hs > champ.as ? champ.a : champ.h).name}</div></div></div></a></section>` : ''}`;
}
/* ------------------------------------------------------------------ weekly recap: a short story of the week that just finished */
/** the last week whose games are all final (null before the season) */
function lastFinishedWeek(now = time.now()) {
  let last = null;
  Dt.D.weeks.forEach(w => { if (w.t !== 1 && !(w.t === 3 && w.w === 4) && w.games.every(g => Dt.state(g, now) === 'post')) last = w; });
  return last;
}
/** a team's best passer, rusher and receiver in one game, from the box score */
function gameStars(g, tid) {
  const b = Dt.box(g.id); if (!b || !b.pl) return [];
  const pick = (cat, key) => (b.pl[cat] || []).filter(r => r[1] === tid).map(r => Dt.lineObj(cat, r)).sort((x, y) => (y[key] || 0) - (x[key] || 0))[0];
  return [['passing', 'passingYards'], ['rushing', 'rushingYards'], ['receiving', 'receivingYards']].map(([c, k]) => { const L = pick(c, k); return L && L[k] ? { pid: L.pid, n: L.n, line: boxLine({ [c]: L }) } : null; }).filter(Boolean);
}
function recapSlides() {
  const now = time.now(), wk = lastFinishedWeek(now); if (!wk) return null;
  const mine = primary(), tm = mine && team(mine), slides = [], gen = new Set();   // gen: slides about other teams, drawn in neutral slate
  const wl = Dt.weekLabel(wk.t, wk.w), before = wk.start - 36e5, after = now;
  // 1 · cover
  slides.push(html`<div class="wr-cover">${tm ? html`<img class="wr-logo" src="${tm.logo}" alt="">` : ''}<div class="wr-eb">${tm ? tm.name : 'Around the league'}</div>
    <div class="wr-big">${wl}<br>recap</div><div class="wr-sub">${fmt.date(wk.start).replace(/, \d{4}$/, '')} – ${fmt.date(wk.end).replace(/, \d{4}$/, '')} · ${wk.games.length} games</div><div class="wr-hint">Tap to continue</div></div>`);
  if (tm) {
    // 2 · your game
    const g = wk.games.find(x => x.h === mine || x.a === mine);
    if (g && !Dt.spoiled(g)) {
      const r = Dt.result(g, mine), b = Dt.box(g.id) || {}, stars = gameStars(g, mine);
      slides.push(html`<div><div class="wr-eb">Your game</div><div class="wr-big ${r.r === 'W' ? 'win' : ''}">${r.r === 'W' ? 'Win' : r.r === 'L' ? 'Loss' : 'Tie'}</div>
        <div class="wr-score">${UI.logo(g.a, 'md')}<b>${g.as}</b><i>–</i><b>${g.hs}</b>${UI.logo(g.h, 'md')}</div>
        ${b.rh ? html`<div class="wr-sub">${b.rh}</div>` : ''}
        ${stars.length ? html`<div class="wr-list">${stars.map(x => html`<div class="wr-row">${UI.hs(x.pid, 'sm')}<span class="grow"><b>${x.n}</b><span>${x.line}</span></span></div>`)}</div>` : ''}</div>`);
    } else if (!g) slides.push(html`<div><div class="wr-eb">Your game</div><div class="wr-big">Bye week</div><div class="wr-sub">The ${tm.name} were off. Back at it next week.</div></div>`);
    // 3 · your players
    const lines = (P().players || []).map(pid => { const p = Dt.player(pid); if (!p) return null; const L = (Dt.gameLog(pid, wk.s, now) || []).find(x => wk.games.includes(x.g)); return L && !Dt.spoiled(L.g) ? { pid, p, line: boxLine(L.cats) } : null; }).filter(Boolean).slice(0, 5);
    if (lines.length) slides.push(html`<div><div class="wr-eb">Your players</div><div class="wr-big sm">How they did</div>
      <div class="wr-list">${lines.map(x => html`<div class="wr-row">${UI.hs(x.pid, 'sm')}<span class="grow"><b>${x.p.n}</b><span>${x.line}</span></span><span class="wr-tm">${team(x.p.t).abbr}</span></div>`)}</div></div>`);
    if (lines.some(x => x.p.t !== mine)) gen.add(slides.length - 1);
    // 4 · the standings, before and after
    if (wk.t === 2) {
      const s = wk.s, A = Dt.standings(s, before), B = Dt.standings(s, after);
      const a = A.all.find(x => x.tid === mine), b = B.all.find(x => x.tid === mine), pr = Dt.powerRank(s, after), r = pr && pr.of[mine];
      const div = B.div[tm.conf + ' ' + tm.div], place = div.findIndex(x => x.tid === mine) + 1;
      slides.push(html`<div><div class="wr-eb">Where you stand</div><div class="wr-big">${b.w}-${b.l}${b.tie ? '-' + b.tie : ''}</div>
        <div class="wr-stats"><div><b>${fmt.ord(place)}</b><span>${tm.conf} ${tm.div}</span></div><div><b>${fmt.ord(b.seed)}</b><span>${tm.conf} seed${a && a.gp && a.seed !== b.seed ? ` · was ${fmt.ord(a.seed)}` : ''}</span></div>${r ? html`<div><b>${r.rk}</b><span>Power rank${r.mv ? html` ${UI.prMove(r.mv)}` : ''}</span></div>` : ''}</div>
        <div class="wr-sub">${b.seed <= 7 ? `In the playoffs if it ended today.` : `${games(Math.max(0, gb(B.conf[tm.conf][6], b)))} out of the last playoff spot.`}</div></div>`);
    }
  }
  // 5 · around the league: the closest finish and the biggest upset
  const fin = wk.games.filter(g => !Dt.spoiled(g)), prior = wk.t === 2 ? Dt.standings(wk.s, before) : null;
  const close = fin.slice().sort((a, b) => Math.abs(a.hs - a.as) - Math.abs(b.hs - b.as))[0];
  const upset = prior && fin.map(g => { const w = g.hs > g.as ? g.h : g.a, l = w === g.h ? g.a : g.h; const pw = prior.all.find(x => x.tid === w), pl = prior.all.find(x => x.tid === l); return { g, w, l, gap: pl.gp && pw.gp ? pl.pct - pw.pct : 0 }; }).sort((a, b) => b.gap - a.gap)[0];
  const lg = [close && { k: 'Closest finish', g: close }, upset && upset.gap > .2 && upset.g !== close && { k: 'Biggest upset', g: upset.g }].filter(Boolean);
  if (lg.length) slides.push(html`<div><div class="wr-eb">Around the league</div><div class="wr-big sm">Don't miss</div>
    <div class="wr-list">${lg.map(x => html`<a class="wr-row tap" data-act="wr-go" data-arg="#/game/${x.g.id}"><span class="grow"><span class="wr-k">${x.k}</span><b>${team(x.g.a).abbr} ${x.g.as} – ${x.g.hs} ${team(x.g.h).abbr}</b><span>${(Dt.box(x.g.id) || {}).rh || ''}</span></span>${icon('chev', 'sm')}</a>`)}</div></div>`);
  if (lg.length) gen.add(slides.length - 1);
  // 6 · up next
  const nx = tm && Dt.nextGame(mine, now);
  slides.push(html`<div><div class="wr-eb">Up next</div>${nx ? html`<div class="wr-big sm">${Dt.isHome(nx, mine) ? 'vs' : 'at'} ${team(Dt.opp(nx, mine)).name}</div>
      <div class="wr-score">${UI.logo(Dt.opp(nx, mine), 'lg')}</div><div class="wr-sub">${fmt.dayLong(nx.ts)} · ${fmt.time(nx.ts)}${(nx.tv || []).length ? ' · ' + nx.tv.join('/') : ''} · ${Dt.record(Dt.opp(nx, mine), nx.s).str}</div>
      <div class="wr-actions"><button class="btn white" data-act="wr-go" data-arg="#/game/${nx.id}">Preview the game</button></div>`
    : html`<div class="wr-big sm">That's the week</div><div class="wr-actions"><button class="btn white" data-act="close-modal">Done</button></div>`}</div>`);
  return { slides, tm, wl, gen };
}
/** open the recap as a full-screen story: tap right for next, left for back; it advances on its own */
function weeklyRecap() {
  const R = recapSlides(); if (!R) return App.toast({ title: 'No finished week yet', icon: 'info' });
  let i = 0, timer = null;
  const el = App.modal({ className: 'wr-modal', html: recapHtml(R),
    mount(m) {
      const show = k => {
        i = Math.max(0, Math.min(R.slides.length - 1, k));
        m.querySelectorAll('.wr-slide').forEach((s2, n) => s2.classList.toggle('on', n === i));
        m.querySelector('.wr').classList.toggle('gen', R.gen.has(i));
        m.querySelectorAll('.wr-bars i').forEach((b, n) => { b.className = n < i ? 'done' : n === i ? 'on' : ''; });
        clearTimeout(timer); if (i < R.slides.length - 1) timer = setTimeout(() => show(i + 1), 6500);
      };
      m.querySelector('.wr-tap.l').addEventListener('click', () => show(i - 1));
      m.querySelector('.wr-tap.r').addEventListener('click', () => show(i + 1));
      show(0);
      return () => clearTimeout(timer);
    } });
  return el;
}
/** the story frame; `on` marks one slide as showing (the design system draws it still) */
function recapHtml(R, on = -1) {
  return html`<div class="wr ${R.gen && R.gen.has(on) ? 'gen' : ''}" style="${raw(R.tm ? App.teamVars(R.tm) : '')}">
      <div class="wr-bars">${R.slides.map((_, k) => raw(`<i class="${k < on ? 'done' : k === on ? 'on' : ''}"><b></b></i>`))}</div>
      <button class="icon-btn wr-x" data-act="close-modal" aria-label="Close">${icon('close')}</button>
      <div class="wr-stage">${R.slides.map((sl, k) => html`<section class="wr-slide ${k === on ? 'on' : ''}" data-k="${k}">${sl}</section>`)}</div>
      <button class="wr-tap l" aria-label="Back"></button><button class="wr-tap r" aria-label="Next"></button></div>`;
}
App.weeklyRecap = weeklyRecap;
A['wr-go'] = (el, ev, hash) => { App.closeModal(); App.go(hash); };

/* ------------------------------------------------------------------ what's relevant right now
   Home re-orders itself for the moment: a game day leads with your team and its players, the day after with
   the recap and highlights, a quiet midweek with the news and the daily games, the offseason with moves and
   the draft, and a team out of it with the draft. Late in the season a team in the race leads with the stakes. */
function homeContext(playersLive) {
  const mine = primary(), now = time.now(), ph = time.phase();
  const live = !!(mine && Dt.liveGameFor(mine));
  const next = mine && Dt.nextGame(mine), last = mine && Dt.lastGame(mine);
  const gameDay = live || !!(next && next.ts > now && next.ts - now < 12 * 36e5);   // kicks off within 12 hours
  const dayAfter = !gameDay && !!(last && now - last.ts < 40 * 36e5);              // the day after a game
  const off = ['fa', 'draft', 'summer', 'camp'].includes(ph);
  // out: the same test that puts Draft watch on screen, so a lost season leads with the draft
  const so = mine && App.seasonOver ? App.seasonOver(mine) : null, out = !!(so && so.out);
  const race = !!(so && !out && ph === 'regular' && so.r.gp >= 10 && so.r.seed <= 10);
  return { mine: !!mine, live, gameDay, dayAfter, off, race, out, playersLive, quiet: !gameDay && !dayAfter && !off };
}
/** higher comes first; ties keep the order of the list */
function homeScore(k, C) {
  switch (k) {
    case 'moment': return 100;                                                  // draft night, free agency, kickoff countdowns
    case 'offseason': return 96;                                                // only renders in the offseason
    case 'tracker': return C.playersLive ? 95 : C.gameDay ? 72 : 40;
    case 'catchup': return C.dayAfter ? 92 : C.gameDay ? 50 : 62;
    case 'stakes': return C.race ? 90 : C.out ? 34 : C.dayAfter ? 80 : 66;
    case 'draft': return C.out ? 88 : 30;                                        // only renders when the season's going badly
    case 'video': return C.dayAfter ? 84 : 46;                                   // the highlights of your game
    case 'foryou': return C.gameDay ? 70 : 74;
    case 'newfan': return 86;
    case 'stories': return C.quiet || C.off ? 85 : C.dayAfter ? 70 : 58;
    case 'recaps': return C.dayAfter ? 68 : 42;
    case 'others': return C.gameDay ? 60 : 44;
    case 'division': return 55;
    case 'games': return C.quiet ? 64 : C.off ? 60 : 32;                         // the daily habit, when nothing else is on
    case 'trivia': return C.quiet ? 50 : 28;
    case 'stat': return 38;
    default: return 0;
  }
}

/* ------------------------------------------------------------------ the Home route */
function liveSig() { return Dt.liveGames().map(g => { const L = Dt.live(g); return g.id + ':' + (L ? L.idx : '-'); }).join('|') + '|' + time.phase(); }
// the personal Home pieces, for the design system page
/** the same strip at the top of a Game Center, minus that game (only for this week's games) */
App.scoreTicker = gid => tickerGames().some(g => g.id === gid) ? ticker(gid) : '';
App.homeParts = { fanHeader, pickHero, newFanCards, recapSlides, leagueMoment, momentBody, statOfDay, triviaTeaser, recapsBlock, tracker, trackerRows, otherTeams, stakesBlock, forYou, ticker, homeContext, homeScore, sheetTop, recapSlides, recapHtml, miniHtml };

App.route('home', () => {
  const s = Dt.seasonForStats();
  const need = [Dt.ensureBox(s)];
  if (time.phase() !== 'regular' && s > 2022) need.push(Dt.ensureBox(s - 1).catch(() => {}));
  return Promise.all(need).catch(() => {}).then(() => {
    const ranked = rankedNews();
    const usedRecap = new Set();
    const lead = ranked[0], more = ranked.slice(1, 5), later = ranked.slice(5, 11);
    const vids = videoItems();
    const playersLive = trackerRows().some(r => r.live);
    const C = homeContext(playersLive);
    // every block gets a score for this moment; Home is those blocks, most relevant first
    const ranked2 = [
      ['moment', momentCard],
      ['tracker', tracker],
      ['stakes', stakesBlock],
      ['draft', () => primary() && App.draftWatch ? App.draftWatch(primary()) : ''],
      ['foryou', forYou],
      ['newfan', () => primary() ? '' : newFanCards()],
      ['catchup', catchupCard],
      ['others', otherTeams],
      ['stories', () => lead ? html`<section class="sec"><div class="sec-head"><div class="h2">${myTeams().length ? 'Top stories for you' : 'Top stories'}</div><a class="more" data-go="#/news">${t('News')}${icon('chev', 'xs')}</a></div><div class="pad">${UI.newsCard(lead, 'lg')}</div>
        ${more.length ? html`<div class="list mt12">${more.map(a => UI.newsCard(a, 'sm'))}</div>` : ''}</section>` : ''],
      ['offseason', offseasonBlocks],
      ['video', () => vids.length ? html`<section class="sec"><div class="sec-head"><div class="h2">Watch</div><a class="more" data-go="#/watch">${t('Video')}${icon('chev', 'xs')}</a></div><div class="pad">${UI.videoFeature(vids[0])}</div>${vids.length > 1 ? html`<div class="hscroll mt16">${vids.slice(1).map(v => UI.videoCard(v, { w: 232 }))}</div>` : ''}</section>` : ''],
      ['stat', statOfDay],
      ['division', () => primary() ? '' : divisionBlock()],
      ['recaps', () => recapsBlock(usedRecap)],
      ['games', () => App.miniGames ? App.miniGames.strip() : ''],
      ['trivia', triviaTeaser],
    ].map(([k, f], i) => ({ k, f, i, sc: homeScore(k, C) })).sort((a, b) => b.sc - a.sc || a.i - b.i);
    const blocks = html`
      ${primary() ? fanHeader() : pickHero()}
      <div class="hm-sheet">${hhMini()}
      ${liveDeck()}
      ${ticker()}
      ${sheetTop()}
      ${ranked2.map(b => b.f())}
      ${later.length ? html`<section class="sec"><div class="sec-head"><div class="h2">More news</div></div><div class="list">${later.map(a => UI.newsCard(a, 'sm'))}</div></section>` : ''}
      <div class="hm-foot tiny center">Scores, stats and news: real data as of ${fmt.date(Dt.D.core.built)} · Time machine: ${esc(time.moment().label)}</div></div>`;
    let sig = liveSig();
    return {
      titleHtml: html`<div class="phead-title"><img class="nfl-shield hm-shield" src="assets/brand/nfl-shield.webp" alt="NFL"></div>`,
      right: UI.headRight(), html: blocks, className: 'hm-page',
      mount: el => { clinchCheck(); scrollSeason(el); return mountStage(el); },
      tick(el, page) {
        el.querySelectorAll('[data-countdown]').forEach(n => { n.innerHTML = countParts(+n.dataset.countdown); });
        const ns = liveSig();
        if (ns !== sig) { sig = ns; page.render(); }
      },
    };
  });
});

/* ------------------------------------------------------------------ Catch me up screen */
App.route('catchup', () => {
  const s = Dt.seasonForStats();
  return Dt.ensureBox(s).catch(() => {}).then(() => {
    const items = catchupItems(7 * DAY);
    const groups = [['live', 'Live now'], ['result', 'Results'], ['injury', 'Injuries'], ['move', 'Roster moves'], ['news', 'Headlines']];
    const mine = primary();
    const nx = mine && Dt.nextGame(mine);
    const st = mine ? Dt.standings(s).all.find(r => r.tid === mine) : null;
    // summary-stats A (2026-11-08): the stat row in a white card instead of the red block
    const stats = [st && st.gp ? [`${st.w}-${st.l}${st.tie ? '-' + st.tie : ''}`, `${fmt.ord(st.seed)} in the ${team(mine).conf}`] : null, nx ? [Dt.state(nx) === 'live' ? 'LIVE' : fmt.until(nx.ts), `${Dt.isHome(nx, mine) ? 'vs' : 'at'} ${team(Dt.opp(nx, mine)).name}`] : null].filter(Boolean);
    const intro = mine && stats.length ? html`<div class="pad mt8">${UI.statRow(stats, `Last 7 days · ${team(mine).name}`)}</div>` : html`<p class="pg-intro">The last 7 days around the league.</p>`;
    const body = groups.map(([k, label]) => {
      const list = items.filter(i => i.kind === k); if (!list.length) return '';
      // catchup-rows A (2026-11-08): headlines are the News list row, results the game row, the time once, no counts
      return html`<section class="sec"><div class="sec-head"><div class="h2">${label}</div></div>
        <div class="list">${list.slice(0, 10).map(i => i.a ? UI.newsCard(i.a, 'sm') : i.g ? UI.gameRow(i.g, i.tid) : html`<a class="row tap" data-go="${i.go}">${i.pid ? UI.hs(i.pid, 'sm') : i.tid ? UI.logo(i.tid, 'sm') : icon(i.icon, 'sm')}<div class="row-main"><div class="row-title">${i.title}</div><div class="row-sub">${i.sub}${i.kind !== 'live' ? ' · ' + fmt.ago(i.ts) : ''}</div></div>${icon('chev', 'sm chev')}</a>`)}</div></section>`;
    });
    // league-wide: biggest results of the last week
    const fin = recentFinals(40).filter(g => time.now() - g.ts < 7 * DAY && !Dt.spoiled(g));
    const close = fin.filter(g => Math.abs(g.hs - g.as) <= 3).slice(0, 3);
    const blow = fin.slice().sort((a, b) => Math.abs(b.hs - b.as) - Math.abs(a.hs - a.as)).slice(0, 1);
    const league = fin.length ? html`<section class="sec"><div class="sec-head"><div class="h2">Around the league</div></div><div class="cards">
      ${close.length ? html`<div class="card pad-all"><div class="eyebrow">Down to the wire</div>${close.map(g => html`<a class="flex gap8 mt10 tap" data-go="#/game/${g.id}" style="margin-top:10px">${UI.logo(g.a, 'sm')}<span class="num b">${g.as}</span><span class="dim">–</span><span class="num b">${g.hs}</span>${UI.logo(g.h, 'sm')}<span class="meta grow ellipsis">${(Dt.box(g.id) || {}).rh || ''}</span></a>`)}</div>` : ''}
      ${blow.map(g => html`<a class="card pad-all tap" data-go="#/game/${g.id}"><div class="eyebrow">Statement win</div><div class="h4 mt8">${(Dt.box(g.id) || {}).rh || `${team(g.a).name} ${g.as}, ${team(g.h).name} ${g.hs}`}</div><div class="meta mt6">${team(g.a).abbr} ${g.as} – ${team(g.h).abbr} ${g.hs} · ${Dt.weekLabel(g.t, g.w)}</div></a>`)}
    </div></section>` : '';
    return { title: t('Catch me up'), html: html`${intro}${items.length ? body : UI.empty('check', 'You\'re all caught up', 'Nothing new for your teams in the last week.')}${league}<div class="spacer"></div>` };
  });
});

/* ------------------------------------------------------------------ Search */
const STAT_WORDS = [
  [/pass(ing)?\s*(yards|yds)|passing$/, 'passing.passingYards', 'Passing yards'], [/(pass(ing)?\s*)?(td|touchdown)s?\s*pass|pass(ing)?\s*(td|touchdown)/, 'passing.passingTouchdowns', 'Passing TDs'],
  [/rush(ing)?\s*(td|touchdown)/, 'rushing.rushingTouchdowns', 'Rushing TDs'], [/rush(ing)?\s*(yards|yds)?|rushing/, 'rushing.rushingYards', 'Rushing yards'],
  [/(rec(eiving)?)\s*(td|touchdown)/, 'receiving.receivingTouchdowns', 'Receiving TDs'], [/rec(eiving)?\s*(yards|yds)|receiving/, 'receiving.receivingYards', 'Receiving yards'],
  [/catches|receptions/, 'receiving.receptions', 'Receptions'], [/sacks?/, 'defensive.sacks', 'Sacks'], [/tackles?/, 'defensive.totalTackles', 'Tackles'],
  [/interceptions|ints\b|picks/, 'interceptions.interceptions', 'Interceptions'], [/field goals?|fgs?\b/, 'kicking.fieldGoalsMade', 'Field goals'],
];
function parseQuery(q) {
  const lq = q.toLowerCase().trim();
  const out = {};
  const yr = lq.match(/\b(20(2[2-6]))\b/); if (yr) out.season = +yr[1];
  const wk = lq.match(/^week\s*(\d{1,2})(?:\s+(20\d\d))?$/); if (wk) out.week = { w: +wk[1], s: wk[2] ? +wk[2] : Dt.currentWeek().s };
  if (/most|leader|leading|top|best|who has|lead/.test(lq) || STAT_WORDS.some(([re]) => re.test(lq)) && lq.split(' ').length > 1) {
    const sw = STAT_WORDS.find(([re]) => re.test(lq)); if (sw) out.stat = { path: sw[1], label: sw[2] };
  }
  const vs = lq.split(/\s+(?:vs\.?|v\.?|versus|or|and)\s+/);
  if (vs.length === 2) {
    const a = Dt.search(vs[0].replace(/\b20\d\d\b/, ''), 40), b = Dt.search(vs[1].replace(/\b20\d\d\b/, ''), 40);
    // resolve ambiguous names ("Allen") toward the other side's position, then prominence (salary)
    const best = (list, pos) => list.slice().sort((x, y) => ((y.pos === pos) - (x.pos === pos)) || ((y.sal || 0) - (x.sal || 0)))[0];
    if (a.players[0] && b.players[0] && !a.teams.length) {
      const pa = best(a.players, b.players.length === 1 ? b.players[0].pos : null);
      const pb = best(b.players, pa.pos);
      out.cmpPlayers = [best(a.players, pb.pos), pb];
    }
    else if (a.teams[0] && b.teams[0]) out.cmpTeams = [a.teams[0], b.teams[0]];
  }
  return out;
}
/** search results (approved round 5): teams are L2 rows (nickname in Display, record in Stats) with the Follow button, players L3, stat answers
    with the value as L4 */
function searchResults(q) {
  if (!q.trim()) return '';
  const pq = parseQuery(q);
  const parts = [];
  if (pq.stat) {
    const s = pq.season || Dt.seasonForStats();
    const L = NFL.d['box-' + s] ? Dt.leaders(s, pq.stat.path, 5) : null;
    parts.push(html`<section class="sec"><div class="sec-head"><div class="h2">${pq.stat.label}, ${s}</div><a class="more" data-go="#/leaders?stat=${pq.stat.path}&s=${s}">Full list${icon('chev', 'xs')}</a></div>
      ${L ? html`<div class="list">${L.map((x, i) => UI.playerRow(x.pid, { sub: `${team(x.tid) ? team(x.tid).abbr : ''} · ${x.gp} games`, right: UI.lk4(Number.isInteger(x.v) ? fmt.n(x.v) : fmt.n(x.v, 1), '', { r: true }) }))}</div>`
        : html`<div class="pad" data-srch-load="${s}">${UI.loading()}</div>`}</section>`);
  }
  if (pq.cmpPlayers) {
    const [a, b] = pq.cmpPlayers;
    parts.push(html`<section class="sec"><a class="card pad-all tap flex gap12" style="margin:0 var(--pad)" data-go="#/compare?a=${a.id}&b=${b.id}">${UI.hs(a.id)}<div class="grow center"><div class="eyebrow">Compare</div><div class="h4 mt4">${a.n} vs ${b.n}</div></div>${UI.hs(b.id)}</a></section>`);
  }
  if (pq.cmpTeams) {
    const [a, b] = pq.cmpTeams; const games = Dt.h2h(a.id, b.id).slice(0, 6);
    parts.push(html`<section class="sec"><div class="sec-head"><div class="h2">${a.name} vs ${b.name}</div></div>${games.length ? html`<div class="list">${games.map(g => UI.gameRow(g, a.id))}</div>` : html`<div class="pad meta">No meetings since 2022.</div>`}</section>`);
  }
  if (pq.week) parts.push(html`<section class="sec"><div class="list">${UI.row({ left: icon('calendar'), title: `Week ${pq.week.w} scores · ${pq.week.s}`, go: `#/scores?s=${pq.week.s}&t=2&w=${pq.week.w}` })}</div></section>`);
  const r = Dt.search(q.replace(/\b20\d\d\b/, ''), 12);
  if (!pq.stat && !pq.cmpPlayers && !pq.cmpTeams) {
    if (r.teams.length) parts.push(html`<section class="sec"><div class="sec-head"><div class="h2">Teams</div></div><div class="list">${r.teams.slice(0, 6).map(tm => UI.teamRow(tm.id, { nick: true, right: UI.followBtn('team', tm.id, 'sm') }))}</div></section>`);
    if (r.players.length) parts.push(html`<section class="sec"><div class="sec-head"><div class="h2">${t('Players')}</div></div><div class="list">${r.players.slice(0, 12).map(p => UI.playerRow(p.id))}</div></section>`);
    if (r.teams.length && App.watchParts) parts.push(html`<section class="sec"><div class="sec-head"><div class="h2">${team(r.teams[0].id).name} videos</div></div>${App.watchParts.teamVideos(r.teams[0].id)}</section>`);
    const lq = q.toLowerCase();
    const arts = news().filter(a => a.h.toLowerCase().includes(lq)).slice(0, 5);
    if (arts.length) parts.push(html`<section class="sec"><div class="sec-head"><div class="h2">${t('News')}</div></div><div class="list">${arts.map(a => UI.newsCard(a, 'sm'))}</div></section>`);
  }
  return parts.length ? parts : UI.empty('search', 'No matches', 'Try a team, a player, or a question like "most rushing yards 2025".');
}
function searchIdle() {
  const recent = (P().recent || []).slice(0, 6);
  const counts = {};
  news().slice(0, 80).forEach(a => a.ath.forEach(x => { if (Dt.player(x)) counts[x] = (counts[x] || 0) + 1; }));
  const trending = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  const ideas = ['Most passing yards 2025', 'Mahomes vs Allen', 'Rushing TD leaders', 'Week 5 2026'];
  // the You page's Time machine row, at the top of Search too (search-timemachine, built 2026-11-10)
  const tmRow = true ? html`<section class="sec"><div class="list">${UI.row({ left: html`<span class="set-ic">${icon('clock')}</span>`, title: 'Time machine', sub: `${fmt.day(time.date())} · ${time.moment().label}`, act: 'time-machine', chev: true })}</div></section>` : '';
  return html`${tmRow}${recent.length ? html`<section class="sec"><div class="sec-head"><div class="h2">Recent</div><a class="more" data-act="srch-clear">Clear</a></div><div class="chips">${recent.map(q => html`<button class="chip" data-act="srch-set" data-arg="${q}">${icon('clock', 'sm')}${q}</button>`)}</div></section>` : ''}
    <section class="sec"><div class="sec-head"><div class="h2">Ask anything</div></div><div class="chips">${ideas.map(q => html`<button class="chip" data-act="srch-set" data-arg="${q}">${icon('search', 'sm')}${q}</button>`)}</div></section>
    ${App.exploreDirectory ? html`<section class="sec"><div class="sec-head"><div class="h2">Explore</div></div></section>${App.exploreDirectory()}` : ''}
    ${trending.length ? html`<section class="sec"><div class="sec-head"><div class="h2">Trending players</div></div><div class="list">${trending.map(pid => UI.playerRow(pid))}</div></section>` : ''}
    <section class="sec"><div class="sec-head"><div class="h2">Browse teams</div><a class="more" data-go="#/teams/all">All 32${icon('chev', 'xs')}</a></div>
      <div class="hm-grid32 pad">${Dt.D.teams.map(tm => html`<a class="tap" data-go="#/team/${tm.id}">${UI.logo(tm.id, 'md')}</a>`)}</div></section>`;
}
App.route('search', (params, query) => {
  const q0 = query.q || '';
  return {
    title: 'Search & explore',
    sub: html`<div class="pad" style="padding-bottom:10px"><label class="search-field">${icon('search', 'sm')}<input type="search" class="hm-q" placeholder="Teams, players, stats, games…" value="${q0}" autocomplete="off" enterkeyhint="search"></label></div>`,
    html: html`<div class="hm-srch">${q0 ? searchResults(q0) : searchIdle()}</div>`,
    mount(el) {
      const inp = el.querySelector('.hm-q'), box = el.querySelector('.hm-srch');
      let tm = null;
      const run = () => {
        const q = inp.value;
        box.innerHTML = App.val(q.trim() ? searchResults(q) : searchIdle());
        const ld = box.querySelector('[data-srch-load]');
        if (ld) Dt.ensureBox(+ld.dataset.srchLoad).then(() => { if (inp.value === q) box.innerHTML = App.val(searchResults(q)); });
      };
      const remember = () => { const q = inp.value.trim(); if (q.length < 2) return; const r = (P().recent || []).filter(x => x.toLowerCase() !== q.toLowerCase()); r.unshift(q); P().recent = r.slice(0, 8); store.save(); };
      inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(run, 120); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { remember(); inp.blur(); } });
      box.addEventListener('click', e => { if (e.target.closest('[data-go]')) remember(); }, true);
      el._srchSet = q => { inp.value = q; run(); remember(); };
      if (q0) run(); else setTimeout(() => inp.focus(), 350);
    },
  };
});
A['srch-set'] = (el, ev, q) => { const pg = App.current().el; pg._srchSet && pg._srchSet(q); };
A['srch-clear'] = () => { P().recent = []; store.save(); App.refresh(); };

/* ------------------------------------------------------------------ Inbox */
function inboxItems() {
  const now = time.now(), since = now - 7 * DAY;
  const cared = caredTeams(), pl = P().players || [];
  const n = P().notif || {};
  const items = [];
  Dt.D.games.forEach(g => {
    if (g.t === 1 || !involves(g, cared)) return;
    const st = Dt.state(g); const hide = Dt.spoiled(g);
    if (st === 'post' && n.final !== false) {
      const end = g.ts + Dt.GAME_LEN; if (end < since || end > now) return;
      items.push({ id: 'f' + g.id, ts: end, logo: g.hs > g.as ? g.h : g.a, title: hide ? `Final: ${team(g.a).name} at ${team(g.h).name}` : `Final${g.ot ? '/OT' : ''}: ${team(g.a).abbr} ${g.as}, ${team(g.h).abbr} ${g.hs}`, body: hide ? 'Score hidden — spoiler shield is on' : (Dt.box(g.id) || {}).rh || Dt.weekLabel(g.t, g.w), go: `#/game/${g.id}` });
    } else if (st === 'live') {
      items.push({ id: 'l' + g.id, ts: g.ts, logo: g.h, title: `Kickoff: ${team(g.a).name} at ${team(g.h).name}`, body: `${(g.tv || []).join(' / ')} · tap for Game Center`, go: `#/game/${g.id}`, live: true });
      if (!hide && n.scoring !== false) {
        const L = Dt.live(g);
        if (L) L.plays.slice(0, L.idx + 1).forEach((p, k) => { if (p.sc) { const si = scoreInfo(L.plays, k, g); items.push({ id: 's' + g.id + k, ts: p._wc, logo: si.tid, title: `${si.label}, ${team(si.tid).name}`, body: `${team(g.a).abbr} ${p.as} – ${team(g.h).abbr} ${p.hs} · ${(p.x || '').slice(0, 90)}`, go: `#/game/${g.id}` }); } });
      }
    } else if (st === 'pre' && g.ts - now < 26 * 3600e3 && g.ts > now && n.kickoff !== false) {
      const w = bestWatch(g);
      items.push({ id: 'k' + g.id, ts: Math.max(since, g.ts - 24 * 3600e3), logo: g.h, title: `Game day: ${team(g.a).name} at ${team(g.h).name}`, body: `${fmt.time(g.ts)} ${fmt.tzAbbr(g.ts)} · ${w.ok ? 'Watch on ' + w.ok.label : (g.tv || []).join(' / ')}`, go: `#/game/${g.id}` });
    }
  });
  if (n.news !== false) news().filter(a => Date.parse(a.pub) >= since && (a.tm.some(x => cared.includes(x)) || a.ath.some(x => pl.includes(x)))).slice(0, 12)
    .forEach(a => items.push({ id: 'n' + a.id, ts: Date.parse(a.pub), logo: a.tm.find(x => cared.includes(x)) || (a.tm.length === 1 ? a.tm[0] : null), icon: 'news', title: a.h, /* the team you follow it for; a league story gets the news icon */ body: a.d ? a.d.slice(0, 120) : '', go: `#/article/${a.id}` }));
  if (n.injuries !== false) cared.forEach(tid => Dt.injuries(tid).filter(i => (/Out|Reserve/.test(i.s) || pl.includes(i.p)) && i.dt && Date.parse(i.dt + 'T15:00:00Z') <= now && Date.parse(i.dt) >= since).slice(0, 4)
    .forEach(i => items.push({ id: 'i' + i.p + i.dt, ts: Date.parse(i.dt + 'T15:00:00Z'), logo: tid, icon: 'info', title: `Injury: ${i.n} is ${i.s.toLowerCase()}`, body: `${team(tid).name} · ${[i.pos, i.ty].filter(Boolean).join(' · ')}${i.ret ? ' · return ~' + fmt.date(i.ret + 'T12:00:00Z') : ''}`, go: `#/player/${i.p}` })));
  const dk = fmt.dayKey(since);
  Dt.tx().filter(r => r.dt >= dk && cared.includes(r.t)).slice(0, 8)
    .forEach((r, k) => items.push({ id: 't' + r.dt + r.t + k, ts: Date.parse(r.dt + 'T16:00:00Z'), logo: r.t, icon: 'swap', title: `${team(r.t).name} move`, body: r.x, go: `#/team/${r.t}?tab=moves` }));
  return items.filter(i => i.ts <= now).sort((a, b) => b.ts - a.ts).slice(0, 60);
}
/** keep store.p.bell in sync so the header pip shows unread items */
function syncBell() {
  const items = inboxItems();
  const read = new Set((P().bell || []).filter(b => b.read).map(b => b.id));
  P().bell = items.slice(0, 40).map(i => ({ id: i.id, read: read.has(i.id) }));
  store.save();
  return items;
}
App.route('inbox', () => {
  const s = Dt.seasonForStats();
  return Dt.ensureBox(s).catch(() => {}).then(() => {
    const items = syncBell();
    const unread = new Set(P().bell.filter(b => !b.read).map(b => b.id)); // shown once, then everything is read
    P().bell.forEach(b => b.read = true); store.save();
    App.renderChrome();
    const byDay = {};
    const today = fmt.dayKey(time.now()), yest = fmt.dayKey(time.now() - 864e5);
    const dayLabel = ts => { const k = fmt.dayKey(ts); return k === today ? t('Today') : k === yest ? 'Yesterday' : time.now() - ts < 6 * 864e5 ? new Date(ts).toLocaleDateString('en-US', { weekday: 'long' }) : 'Earlier'; };
    items.forEach(i => { const k = dayLabel(i.ts); (byDay[k] = byDay[k] || []).push(i); });
    // approved round 5: the day is an eyebrow ("Today", "Yesterday" in words: a date is metadata, never Display); a row shows a team logo
    // only for that team's game, injury or move, news gets the news icon in a squared tile; the headline clamps to two lines, the summary to one
    // inbox-rows A (approved 2026-11-07): every row leads with one 40px squared tile (logo or icon), the time sits next to the title, unread rows get a dot
    // round 5 v2 (superseded on the dot): no unread dot (opening the inbox marks everything read, and the header pip already says something is new); the row is the lead
    // (logo or squared icon tile) top-aligned with the headline, on one 16px inset and 4px text rhythm, and day groups sit 24px apart
    const body = Object.entries(byDay).map(([k, list]) => html`<section class="ib-day"><div class="pad"><div class="t-eyebrow">${k}</div></div>
      <div class="list mt8">${list.map(i => html`<a class="row tap ib-row ${unread.has(i.id) ? 'un' : ''}" data-go="${i.go}"><span class="ib-lead">${i.icon !== 'news' && i.logo && team(i.logo) ? UI.logo(i.logo, 'sm') : icon(i.icon || 'bell', 'sm')}</span>
        <div class="row-main"><div class="ib-h"><span class="row-title clamp2">${i.title}</span><span class="t-meta">${i.live ? raw('<span class="badge live">Live</span> ') : ''}${fmt.ago(i.ts)}</span></div>${i.body ? html`<div class="row-sub ellipsis">${i.body}</div>` : ''}${unread.has(i.id) ? raw('<i class="ib-un"></i>') : ''}</div></a>`)}</div></section>`);
    return {
      title: 'Notifications', right: html`<button class="icon-btn" data-go="#/settings/notifications" aria-label="Notification settings">${icon('sliders')}</button>`,
      html: html`${P().spoiler && P().spoiler.on ? html`<div class="notice mt8">${icon('eyeoff', 'sm')}<div class="grow">Spoiler shield is on — results for shielded teams stay hidden.</div></div>` : ''}
        ${items.length ? body : UI.empty('bell', 'All quiet', caredTeams().length ? 'Scores, injuries, moves and news for your teams land here.' : 'Follow teams and players to get alerts that matter to you.', caredTeams().length ? '' : html`<button class="btn primary sm mt16" data-go="#/teams/all">Find your team</button>`)}
        <div class="pad mt24"><a class="row tap" data-go="#/settings/notifications" style="background:var(--surface);border-radius:var(--r-lg)">${icon('gear')}<div class="row-main"><div class="row-title">Alert settings</div><div class="row-sub">Choose what buzzes your phone: scores, finals, injuries, news</div></div>${icon('chev', 'sm chev')}</a></div>`,
    };
  });
});

/* ------------------------------------------------------------------ News list */
/** the News list under two small headers: Latest (the last 24 hours) and Earlier this week (news-pass, built Nov 10) */
function newsGroups(items) {
  const now = time.now(), fresh = items.filter(a => now - Date.parse(a.pub) < DAY), older = items.filter(a => now - Date.parse(a.pub) >= DAY), both = fresh.length && older.length;
  const grp = (h, xs) => xs.length ? html`${both ? html`<div class="nw-grp">${h}</div>` : ''}<div class="list ${both ? '' : 'mt12'}">${xs.map(a => UI.newsCard(a, 'sm'))}</div>` : '';
  return html`${grp('Latest', fresh)}${grp('Earlier this week', older)}`;
}
App.route('news', (params, query, page) => {
  const ftab = query.team || (store.tmp.newsTab) || 'all';
  const cared = caredTeams();
  const tabsList = [{ k: 'all', l: 'Top' }].concat(cared.length ? [{ k: 'mine', l: 'My teams' }] : []).concat(cared.slice(0, 4).map(id => ({ k: id, l: team(id).name }))).concat([{ k: 'analysis', l: 'Analysis' }, { k: 'fantasy', l: 'Fantasy' }]);
  if (query.team && !tabsList.find(x => x.k === query.team)) tabsList.splice(1, 0, { k: query.team, l: team(query.team).name });
  let list;
  if (ftab === 'all') list = latestNews();
  else if (ftab === 'mine') list = news({ teams: cared });
  else if (ftab === 'analysis') list = news().filter(a => a.ty === 'Story');
  else if (ftab === 'fantasy') list = news({ fantasy: true }).filter(a => a.fan);
  else list = news({ team: ftab });
  // a chip that comes up empty (a quiet team, no fantasy stories yet) shows Top rather than nothing
  if (!list.length && ftab !== 'all') list = latestNews();
  const lead = list[0];
  return {
    // the News tab: big title and the shared header; pushed (a team's news) it gets a back button instead
    title: query.team ? team(query.team).name + ' news' : t('News'), big: page.isRoot, right: page.isRoot ? UI.headRight() : '',
    sub: UI.chips(tabsList, ftab, 'news-tab'),
    html: html`<div class="mt12"></div>${lead ? html`<div class="pad">${UI.newsCard(lead, 'lg')}</div>${newsGroups(list.slice(1, 40))}`
      : UI.empty('news', 'No stories yet', time.now() < Date.parse('2026-10-01') ? 'The news archive in this snapshot starts in October 2026 — try the time machine\'s "Right now".' : 'Nothing here right now.')}`,
  };
});
A['news-tab'] = (el, ev, k) => { store.tmp.newsTab = k; const pg = App.current(); pg.query.team = k === 'all' || k === 'mine' || k === 'analysis' || k === 'fantasy' ? undefined : k; if (!pg.query.team) delete pg.query.team; App.refresh(); };

/* ------------------------------------------------------------------ Article reader */
App.route('article/:id', (params) => {
  const id = params.id;
  if (id.startsWith('recap-')) {
    const gid = id.slice(6), g = Dt.game(gid);
    if (!g) return { title: '', html: UI.empty('news', 'Story not found') };
    return Promise.all([App.load('recaps-' + g.s), Dt.ensureBox(g.s)]).then(() => {
      const r = (NFL.d['recaps-' + g.s] || {})[gid];
      if (!r) return { title: '', html: UI.empty('news', 'No recap for this game') };
      if (Dt.spoiled(g)) return { title: 'Recap', html: html`<div class="empty">${icon('eyeoff')}<div class="h3">Spoiler shield is on</div><div class="meta mt6">This recap gives away the ${team(g.a).name}–${team(g.h).name} result.</div><button class="btn primary sm mt16" data-act="home-reveal" data-arg="${g.id}">Reveal the result</button></div>` };
      return articleView({ h: r.h, d: r.d, img: r.img, b: r.b, by: r.by, pub: new Date(g.ts + Dt.GAME_LEN).toISOString(), tm: [g.a, g.h], kind: 'Game recap', g });
    });
  }
  const meta = Dt.D.core.news.find(a => a.id === id);
  if (!meta) return { title: '', html: UI.empty('news', 'Story not found') };
  return App.load('articles').catch(() => ({})).then(() => {
    const body = (NFL.d.articles || {})[id] || {};
    return articleView({ id, h: meta.h, d: meta.d, img: meta.img, b: body.b, by: body.by, src: body.src, pub: meta.pub, tm: meta.tm, ath: meta.ath, kind: meta.ty === 'Story' ? 'Analysis' : 'News' });
  });
});
function readMins(b) { return Math.max(1, Math.round(((b || '').replace(/<[^>]+>/g, '').split(/\s+/).length) / 230)); }
function articleView(a) {
  const saved = (P().saved || []).includes(a.id || ('recap-' + (a.g && a.g.id)));
  const key = a.id || 'recap-' + a.g.id;
  const related = news().filter(x => x.id !== a.id && x.tm.some(t => (a.tm || []).includes(t))).slice(0, 4);
  const players = (a.ath || []).filter(pid => Dt.player(pid)).slice(0, 4);
  return {
    title: '', className: 'ar-page',
    right: html`<button class="icon-btn" data-act="home-save" data-arg="${key}" aria-label="Save">${icon(saved ? 'check' : 'plus')}</button><button class="icon-btn" data-act="toast" data-arg="Link copied" aria-label="Share">${icon('share')}</button>`,
    html: html`<article class="ar">
      ${a.img ? html`<div class="ar-img">${UI.img(a.img)}</div>` : ''}
      <div class="pad ar-head"><div class="t-eyebrow ar-kind">${a.kind}</div>
        <h1 class="headline mt6">${a.h}</h1>${a.d ? html`<p class="ar-dek">${a.d.replace(/^[\s—–-]+/, '')}</p>` : ''}
        <div class="ar-by"><span>${a.by || 'NFL Staff'}${a.src ? ' · ' + a.src : ''}</span><span>${fmt.ago(a.pub)} · ${readMins(a.b)} min read</span></div></div>
      ${a.g ? html`<div class="pad mb16">${UI.gameCard(a.g)}</div>` : ''}
      <div class="pad article-body">${a.b ? raw(a.b) : html`<p>${a.d || ''}</p><p class="meta">The full story isn't in this offline snapshot.</p>`}</div>
      ${(a.tm || []).length ? html`<div class="pad ar-tags2">${(a.tm || []).slice(0, 3).map(tid => team(tid) ? html`<a class="sc-season ar-tag2 tap" data-go="#/team/${tid}">${UI.logo(tid, 'xs')}<span class="r-sans">${team(tid).name}</span></a>` : '')}</div>` : ''}
      ${players.length ? html`<section class="sec"><div class="sec-head"><div class="h2">In this story</div></div><div class="list">${players.map(pid => UI.playerRow(pid, { right: UI.followBtn('player', pid, 'xs') }))}</div></section>` : ''}
      ${related.length ? html`<section class="sec"><div class="sec-head"><div class="h2">Related</div></div><div class="list">${related.map(x => UI.newsCard(x, 'sm'))}</div></section>` : ''}
      <div class="spacer"></div></article>`,
  };
}
A['home-save'] = (el, ev, id) => {
  const s = P().saved = P().saved || []; const i = s.indexOf(id);
  if (i >= 0) s.splice(i, 1); else s.push(id);
  store.save(); App.toast({ title: i >= 0 ? 'Removed from saved' : 'Saved for later', icon: i >= 0 ? 'close' : 'check' }); App.refresh();
};

/* ------------------------------------------------------------------ home actions */
A['home-reveal'] = (el, ev, gid) => { const w = P().watched = P().watched || []; if (!w.includes(gid)) w.push(gid); store.save(); App.refreshAll(); };
A['home-listen'] = (el, ev, gid) => {
  const g = Dt.game(gid);
  App.sheet({ title: 'Listen live', html: html`<div class="pad"><div class="meta mb12">${team(g.a).name} at ${team(g.h).name} · every call, any device</div>
    <div class="list" style="margin:0">${[[g.h, 'Home radio'], [g.a, 'Away radio'], [null, 'National broadcast (Westwood One)'], [null, 'En español']].map(([tid, l], i) => html`<button class="row tap" data-act="toast" data-arg="Now playing: ${l}">${tid ? UI.logo(tid, 'sm') : icon(i === 3 ? 'translate' : 'radio', 'sm')}<div class="row-main"><div class="row-title">${l}</div>${tid ? html`<div class="row-sub">${team(tid).full} radio network</div>` : ''}</div>${icon('play', 'sm')}</button>`)}</div>
    <div class="learn-tip mt12" style="background:var(--surface-2);border-color:var(--line)">${icon('timer', 'sm')}<div>Watching on TV? Use <b>Sync to TV</b> in the player to delay the radio call so it lines up with your picture.</div></div></div>` });
};
A['home-trivia'] = (el, ev, arg) => {
  const [gid, pick, win] = arg.split(':');
  const tr = P().trivia = P().trivia || {};
  if (tr['home-' + gid]) return;
  tr['home-' + gid] = pick;
  if (pick === win) P().points = (P().points || 0) + 10;
  store.save();
  App.toast({ title: pick === win ? 'Correct! +10 points' : 'Not quite', icon: pick === win ? 'check' : 'close' });
  App.refresh();
};
A['home-onboard'] = () => { if (App.onboarding && App.onboarding.start) App.onboarding.start(); else App.go('#/teams/all'); };

/* ------------------------------------------------------------------ live alert engine */
const AL = { idx: {}, st: {}, tok: 0 };
function resetAlerts() {
  AL.idx = {}; AL.st = {};
  Dt.liveGames().forEach(g => { const L = Dt.live(g); if (L) AL.idx[g.id] = L.idx; AL.st[g.id] = 'live'; });
  Dt.D.games.forEach(g => { if (AL.st[g.id] == null && Math.abs(g.ts - time.now()) < 6 * 3600e3) AL.st[g.id] = Dt.state(g); });
}
function alertTick() {
  const cared = caredTeams();
  if (!cared.length) return;
  const n = P().notif || {};
  if (n.quiet) return;
  let fired = 0;
  const now = time.now();
  Dt.D.games.forEach(g => {
    if (fired > 2 || !involves(g, cared) || g.st !== 'post' || Math.abs(g.ts - now) > 6 * 3600e3) return;
    const st = Dt.state(g);
    const prevSt = AL.st[g.id];
    AL.st[g.id] = st;
    if (Dt.spoiled(g)) return;
    const onGame = (App.current() || {}).hash === '#/game/' + g.id;
    if (prevSt === 'pre' && st === 'live' && n.kickoff !== false) {
      App.toast({ title: `Kickoff: ${team(g.a).abbr} at ${team(g.h).abbr}`, body: (g.tv || []).join(' / '), logo: team(g.h).logoDark, go: '#/game/' + g.id }); fired++;
    }
    if (st === 'live') {
      const L = Dt.live(g); if (!L) return;
      const prev = AL.idx[g.id];
      AL.idx[g.id] = L.idx;
      if (prev == null || L.idx <= prev || onGame) return;
      for (let k = prev + 1; k <= L.idx && fired < 3; k++) {
        const p = L.plays[k];
        if (p.sc && n.scoring !== false) {
          const si = scoreInfo(L.plays, k, g);
          App.toast({ title: `${si.label}, ${team(si.tid).name}`, body: html`<span class="num b">${team(g.a).abbr} ${p.as ?? L.as} – ${team(g.h).abbr} ${p.hs ?? L.hs}</span> · ${(p.x || '').replace(/\s*\(.*?\)\s*/g, ' ').slice(0, 70)}`, logo: team(si.tid).logoDark, go: '#/game/' + g.id, ms: 5200 }); fired++;
        } else if (p.to && n.scoring !== false) {
          const tm = (p.x || '').match(/(INTERCEPTED|FUMBLES|MUFFS|RECOVERED|blocked).*/i);
          App.toast({ title: `Turnover! ${team(p.team).name} give it away`, body: (tm ? tm[0] : p.x || '').slice(0, 90), logo: team(Dt.opp(g, p.team)).logoDark, go: '#/game/' + g.id }); fired++;
        }
      }
    }
    if (prevSt === 'live' && st === 'post' && n.final !== false) {
      const w = g.hs > g.as ? g.h : g.a;
      App.toast({ title: `Final${g.ot ? '/OT' : ''}: ${team(w).name} win`, body: html`<span class="num b">${team(g.a).abbr} ${g.as} – ${team(g.h).abbr} ${g.hs}</span>`, logo: team(w).logoDark, go: '#/game/' + g.id, ms: 6000 }); fired++;
    }
  });
}

/* ------------------------------------------------------------------ live mini-bar */
function miniGame() {
  const mine = primary();
  const ids = mine ? [mine].concat(myTeams().filter(x => x !== mine)) : [];
  for (const id of ids) { const g = Dt.liveGameFor(id); if (g) return { g, tid: id }; }
  return null;
}
function updateMini() {
  const bar = document.querySelector('#device > .minibar'); const dev = document.getElementById('device');
  if (!bar) return;
  const m = miniGame();
  const cur = App.current();
  // not on Home or any game page, not once you've swiped it away, and never alongside picture-in-picture
  const onGame = cur && (cur.hash || '').startsWith('#/game/');
  const isHome = cur && cur.hash === '#/home';
  if (!m || onGame || isHome || (App.pip && App.pip.gid) || App.store.tmp.miniGone === m.g.id) { bar.hidden = true; dev && dev.classList.remove('has-mini'); return; }
  bar.hidden = false; dev && dev.classList.add('has-mini');
  bar.dataset.go = '#/game/' + m.g.id;
  bar.innerHTML = App.val(miniHtml(m));
}
/** the bar's contents (round 5 v2): a small two-line scoreboard. Both teams stacked as L1 lines on the left; on the right the
    L5 Live pill carrying the clock, with the down & distance under it in full; a hairline between (spoiler-safe) */
function miniHtml(m) {
  const g = m.g, S = Dt.score(g), hide = Dt.spoiled(g);
  return html`<div class="mb-tms">${UI.lk1Game(g)}</div>
    <div class="mb-st">${UI.lk5(S, hide)}${!hide && S.dd ? html`<span class="r-down-distance">${S.dd}</span>` : ''}</div>${icon('chev', 'sm')}`;
}

App.on('boot', () => { resetAlerts(); updateMini(); setTimeout(syncBellQuiet, 50); });
App.on('time', () => { resetAlerts(); setTimeout(() => { resetAlerts(); updateMini(); syncBellQuiet(); }, 600); });
App.on('live-ready', () => { resetAlerts(); updateMini(); });
App.on('tick', () => { try { alertTick(); } catch (e) { console.error(e); } updateMini(); });
App.on('nav', () => setTimeout(updateMini, 0));
App.on('profile', () => updateMini());
App.on('pip', () => updateMini());
/* swipe the bar sideways to dismiss it for this game */
App.on('boot', () => {
  const bar = document.querySelector('#device > .minibar'); if (!bar) return;
  let x0 = null, dx = 0, moved = false;
  bar.addEventListener('pointerdown', e => { x0 = e.clientX; dx = 0; moved = false; bar.style.transition = 'none'; try { bar.setPointerCapture(e.pointerId); } catch {} });
  bar.addEventListener('pointermove', e => { if (x0 == null) return; dx = e.clientX - x0; if (Math.abs(dx) > 6) moved = true; bar.style.transform = `translateX(${dx}px)`; bar.style.opacity = String(1 - Math.min(.9, Math.abs(dx) / 260)); });
  const end = () => {
    if (x0 == null) return; x0 = null; bar.style.transition = 'transform .25s ease, opacity .25s ease';
    if (Math.abs(dx) > 80) {
      const m = miniGame(); App.store.tmp.miniGone = m && m.g.id;
      bar.style.transform = `translateX(${dx > 0 ? 110 : -110}%)`; bar.style.opacity = '0';
      setTimeout(() => { bar.style.cssText = ''; updateMini(); }, 260);
    } else { bar.style.transform = ''; bar.style.opacity = ''; }
  };
  bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
  bar.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
});
function syncBellQuiet() {
  const s = Dt.seasonForStats();
  const go = () => { try { syncBell(); App.renderChrome(); refreshHeadPip(); } catch (e) { console.error(e); } };
  if (NFL.d['box-' + s]) go(); else Dt.ensureBox(s).then(go).catch(() => {});
}
function refreshHeadPip() {
  // alerts settle after the first paint: redraw You if it's showing, so its Alerts row is current
  const cur = App.current(); if (cur && cur.hash === '#/you') App.refresh(cur);
  // the header's profile carries no dot (head-profile, 2026-11-10); unread alerts show on You
}

App.home = { catchupItems, inboxItems, liveLine, draftState, pickTime };
})();
