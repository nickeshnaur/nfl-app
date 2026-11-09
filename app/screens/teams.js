/* ============================================================================
   Teams tab — "My teams" (multi-team fans), all 32, and the deep team hub.
   Routes: teams · teams/all · team/:id (?tab=)
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, fmt, store, time } = App;
const UI = App.UI, Dt = App.data;
const A = App.actions;

/** teamVars, but near-black primaries become charcoal so heroes don't vanish into the page */
/* team-hero v5 B (approved 2026-11-08): white text always passes AA (4.5:1). A team colour too light for that is deepened
   just enough (Titans, Bengals, Broncos, Browns, Dolphins, Panthers, Chargers); the boxes tint away from the text
   (darker, or lighter on near-black teams) so they never lose contrast. */
function heroCol(c) {
  let x = c;
  for (let n = 0; n < 40 && App.contrast('#ffffff', x) < 4.5; n++) x = App.mix(x, '#000000', .05);
  return x;
}
function heroVars(tm) {
  const c = heroCol(tm.color);
  return `;--team:${c};--tg-a:${c};--tg-b:${c};--tm-tint:${App.lum(c) < .03 ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.22)'};`;
}
function tv(tm) {
  let v = App.teamVars(tm);
  if (App.lum(tm.color) < 0.012) v += '--team:#1d1d21;';
  return v;
}
const CONF_DIVS = ['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'];
const POS_GROUPS = [
  ['QB', 'Quarterbacks', ['QB']], ['RB', 'Running backs', ['RB', 'FB']], ['WR', 'Wide receivers', ['WR']], ['TE', 'Tight ends', ['TE']],
  ['OL', 'Offensive line', ['OT', 'G', 'C', 'OL']], ['DL', 'Defensive line', ['DE', 'DT', 'NT']], ['LB', 'Linebackers', ['LB', 'OLB', 'ILB', 'MLB']],
  ['DB', 'Defensive backs', ['CB', 'S', 'DB', 'FS', 'SS']], ['ST', 'Special teams', ['PK', 'K', 'P', 'LS']],
];
const groupOf = pos => (POS_GROUPS.find(g => g[2].includes(pos)) || ['OT'])[0];
/** five tabs; Roster and More each hold a few views, picked with chips under the tabs.
 *  page.state.tab is always the view (old ?tab=depth / ?tab=cap links still land in the right place). */
const TABS = [{ k: 'overview', l: 'Overview' }, { k: 'schedule', l: 'Schedule' }, { k: 'roster', l: 'Roster' }, { k: 'stats', l: 'Stats' }, { k: 'more', l: 'More' }];
const VIEWS = {
  roster: [{ k: 'roster', l: 'Players' }, { k: 'depth', l: 'Depth chart' }, { k: 'injuries', l: 'Injuries' }],
  more: [{ k: 'moves', l: 'Transactions' }, { k: 'cap', l: 'Contracts' }, { k: 'draft', l: 'Draft' }, { k: 'history', l: 'History' }, { k: 'stadium', l: 'Stadium' }],
};
const tabOf = v => Object.keys(VIEWS).find(g => VIEWS[g].some(x => x.k === v)) || v;
App.ICONS.bellon = '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" fill="currentColor"/><path d="M10 21h4"/>';

/* ------------------------------------------------------------------ helpers */
const nowS = () => Dt.seasonForStats();
const short = tm => (tm.loc === 'New York' || tm.loc === 'Los Angeles') ? tm.short : tm.name;
function divKey(tm) { return tm.conf + ' ' + tm.div; }
function divPlace(tid, s) {
  const tm = Dt.team(tid), st = Dt.standings(s);
  let list = (st.div[divKey(tm)] || []).slice();
  // simplified tiebreakers can miss; once a season's playoffs have started, the team that actually got in wins the tie
  const madePost = id => Dt.D.games.some(g => g.s === s && g.t === 3 && g.w <= 3 && (g.h === id || g.a === id) && Dt.state(g) !== 'pre');
  if (Dt.D.games.some(g => g.s === s && g.t === 3 && Dt.state(g) !== 'pre')) {
    list = list.map((r, i) => ({ r, i })).sort((a, b) => b.r.pct - a.r.pct || madePost(b.r.tid) - madePost(a.r.tid) || a.i - b.i).map(x => x.r);
  }
  const i = list.findIndex(r => r.tid === tid);
  return { place: i + 1, list, row: list[i], st };
}
function playerLine(L) {
  if (!L) return '';
  const c = L.cats, p = c.passing, r = c.rushing, rc = c.receiving, d = c.defensive, k = c.kicking, it = c.interceptions;
  if (p && p.passingAttempts >= 15) return `${fmt.n(p.passingYards)} yds · ${p.passingTouchdowns} TD · ${p.interceptions} INT`;
  if (r && (!rc || r.rushingYards >= (rc.receivingYards || 0))) return `${fmt.n(r.rushingYards)} rush yds · ${r.rushingTouchdowns} TD`;
  if (rc) return `${rc.receptions} rec · ${fmt.n(rc.receivingYards)} yds · ${rc.receivingTouchdowns} TD`;
  if (k) return `${k.fieldGoalsMade}/${k.fieldGoalAttempts} FG · ${k.totalKickingPoints} pts`;
  if (d) return `${d.totalTackles} tkl · ${d.sacks || 0} sk${it ? ` · ${it.interceptions} INT` : ''}`;
  return `${L.gp} games`;
}
/** every team's season aggregates once per minute, so ranks are cheap */
const seasonCache = {};
function allSeasons(s) {
  const key = s + ':' + Math.floor(time.now() / 60000);
  if (seasonCache[key]) return seasonCache[key];
  const o = {}; Dt.D.teams.forEach(t => o[t.id] = Dt.teamSeason(t.id, s));
  // Dt.teamSeason concatenates turnovers when the box stores them as strings — recount numerically
  const bx = NFL.d['box-' + s];
  if (bx) {
    Object.values(o).forEach(x => { if (x) { x.to = 0; x.toF = 0; } });
    Dt.D.games.forEach(g => {
      if (g.s !== s || g.t !== 2 || Dt.state(g) !== 'post' || !bx[g.id]) return;
      const tm = bx[g.id].tm, th = +(tm[g.h] || {}).turnovers || 0, ta = +(tm[g.a] || {}).turnovers || 0;
      if (o[g.h]) { o[g.h].to += th; o[g.h].toF += ta; }
      if (o[g.a]) { o[g.a].to += ta; o[g.a].toF += th; }
    });
    Object.values(o).forEach(x => { if (x) x.toDiff = x.toF - x.to; });
  }
  return seasonCache[key] = o;
}
function rankOf(tid, s, key, lower) {
  const all = allSeasons(s);
  const vals = Object.entries(all).map(([id, v]) => ({ id, v: (v || {})[key] || 0 })).sort((a, b) => lower ? a.v - b.v : b.v - a.v);
  return vals.findIndex(x => x.id === tid) + 1;
}
function alertsOn(tid) { return !!(store.p.teamAlerts || {})[tid] || (store.p.teams.includes(tid) && (store.p.teamAlerts || {})[tid] !== false); }
function watchLine(g) {
  const opts = Dt.watch(g);
  const ok = opts.find(o => o.ok && o.k !== 'audio');
  if (ok) return ok.label;
  return (g.tv || []).join(' / ') || (opts[0] && opts[0].label) || '';
}

/* ------------------------------------------------------------------ team tiles + all-32 grid */
function teamTile(tid) {
  const tm = Dt.team(tid), on = store.p.teams.includes(tid);
  // all-teams B (approved 2026-11-08): no corner badge, a tile just opens the team; following lives on the team page and You.
  // build-stack v3 A (approved 2026-11-09): the tricode alone in italic Display, ink, so long names never cut off
  return html`<div class="tm-tile tap" data-go="#/team/${tid}" aria-label="${tm.full}${on ? ', following' : ''}">
    ${UI.logo(tid, 'lg')}<div class="tm-tile-n tm-tile-tri">${tm.abbr}</div><div class="tiny num">${Dt.record(tid, nowS()).str}</div></div>`;
}
function allGrid() {
  return html`${['AFC', 'NFC'].map(cf => html`<div class="tm-conf">${cf}</div>
    ${CONF_DIVS.filter(d => d.startsWith(cf)).map(d => html`<div class="tm-div"><div class="tm-div-h">${d}</div>
      <div class="grid4 pad">${Dt.D.teams.filter(t => divKey(t) === d).map(t => teamTile(t.id))}</div></div>`)}`)}`;
}

/* ------------------------------------------------------------------ "help me pick a team" quiz */
const TRAITS = {
  fireworks: 'KC BUF MIA CIN DET LAR TB DAL ATL WAS SF', defense: 'BAL PIT CLE DEN HOU NYJ MIN SEA CHI LAC NE',
  ground: 'PHI BAL ATL DET SF TEN GB NYG IND JAX LV', chaos: 'BUF MIN ARI CAR NO LV NYJ CHI JAX TEN IND',
  history: 'GB PIT NE DAL SF KC NYG CHI WAS LV MIA DEN', rising: 'HOU DET WAS CHI ARI JAX LAC SEA NE DEN',
  underdog: 'CLE DET BUF CAR ARI TEN NYJ ATL MIN CIN JAX NO', spotlight: 'DAL NYG NYJ LAR LAC PHI CHI MIA LV SF KC',
  red: 'KC ARI ATL TB SF HOU', blue: 'BUF DAL IND LAC LAR DET NYG NE TEN SEA CHI DEN', green: 'GB NYJ PHI SEA',
  blackgold: 'PIT NO LV JAX', orange: 'CIN CLE DEN MIA CHI', purple: 'BAL MIN', teal: 'MIA JAX PHI CAR',
};
const QUIZ = [
  { k: 'home', q: 'Where\'s home?', sub: 'A local team means friends, bars and games on local TV.', type: 'market' },
  { k: 'style', q: 'What kind of football gets you out of your seat?', opts: [['fireworks', 'Big plays & shootouts'], ['defense', 'Defense that hits'], ['ground', 'Run the ball, win the trenches'], ['chaos', 'Chaos & comebacks']] },
  { k: 'vibe', q: 'Pick a story to be part of', opts: [['history', 'A storied franchise'], ['rising', 'A young team on the rise'], ['underdog', 'The lovable underdog'], ['spotlight', 'Big city, bright lights']] },
  { k: 'color', q: 'And the colours you\'d wear', opts: [['red', 'Red'], ['blue', 'Blue'], ['green', 'Green'], ['blackgold', 'Black & gold'], ['orange', 'Orange'], ['purple', 'Purple'], ['teal', 'Teal']] },
];
function quizScore(ans) {
  const sc = {}; Dt.D.teams.forEach(t => sc[t.abbr] = 0);
  const why = {}; Dt.D.teams.forEach(t => why[t.abbr] = []);
  if (ans.home) Dt.marketTeams(ans.home).forEach(id => { const a = Dt.team(id).abbr; sc[a] += 5; why[a].push('your local team'); });
  [['style', 3], ['vibe', 2], ['color', 1]].forEach(([k, w]) => {
    const v = ans[k]; if (!v) return;
    const label = (QUIZ.find(q => q.k === k).opts.find(o => o[0] === v) || [])[1];
    TRAITS[v].split(' ').forEach(a => { sc[a] += w; why[a].push(label.toLowerCase()); });
  });
  return Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => ({ tm: Dt.team(a), why: why[a] }));
}
function quizHtml(st) {
  const i = st.i;
  if (i >= QUIZ.length) {
    const res = quizScore(st.ans);
    return html`<div class="pad"><div class="eyebrow">Your matches</div><div class="h2 mt8">Teams that fit you</div>
      <div class="tm-quiz-res mt16">${res.map((r, n) => html`<div class="tm-match" style="${raw(tv(r.tm))}">
        <div class="tm-match-rank num">${n + 1}</div>${UI.logo(r.tm.id, 'lg')}
        <div class="grow"><div class="h3">${r.tm.full}</div><div class="meta mt4">${r.why.length ? 'Because: ' + r.why.slice(0, 3).join(', ') : 'A great place to start'}</div></div>
        ${UI.followBtn('team', r.tm.id, 'xs')}</div>`)}</div>
      <p class="meta mt16">No wrong answers: you can follow as many teams as you like and change any time.</p>
      <button class="btn ghost block mt8" data-act="tm-quiz" data-arg="restart">Start over</button></div>`;
  }
  const q = QUIZ[i];
  return html`<div class="pad"><div class="flex gap6">${QUIZ.map((x, n) => html`<i class="tm-step ${n <= i ? 'on' : ''}"></i>`)}</div>
    <div class="h2 mt16">${q.q}</div>${q.sub ? html`<div class="meta mt6">${q.sub}</div>` : ''}
    <div class="col gap8 mt16">${q.type === 'market'
      ? html`<select class="input tm-quiz-sel"><option value="">Pick a city…</option>${Dt.MARKETS.map(m => html`<option>${m[0]}</option>`)}<option value="">Somewhere else / outside the US</option></select>
        <button class="btn primary block mt8" data-act="tm-quiz" data-arg="next">Continue</button>`
      : q.opts.map(o => html`<button class="tm-opt tap" data-act="tm-quiz" data-arg="ans:${o[0]}">${o[1]}${icon('chev', 'sm')}</button>`)}</div>
    ${i > 0 ? html`<button class="btn ghost sm mt16" data-act="tm-quiz" data-arg="back">${icon('back', 'sm')} Back</button>` : ''}</div>`;
}
let quiz = null;
A['tm-quiz-open'] = () => {
  quiz = { i: 0, ans: {} };
  quiz.sheet = App.sheet({ title: 'Find your team', full: true, html: quizHtml(quiz), onClose: () => { quiz = null; App.refresh(); } });
};
A['tm-quiz'] = (el, ev, arg) => {
  if (!quiz) return;
  if (arg === 'restart') { quiz.i = 0; quiz.ans = {}; }
  else if (arg === 'back') quiz.i = Math.max(0, quiz.i - 1);
  else if (arg === 'next') { const sel = quiz.sheet.sh.querySelector('.tm-quiz-sel'); quiz.ans.home = sel ? sel.value : ''; quiz.i++; }
  else if (arg.startsWith('ans:')) { quiz.ans[QUIZ[quiz.i].k] = arg.slice(4); quiz.i++; }
  App.updateSheet(quiz.sheet, quizHtml(quiz));
};
// the quiz result's follow buttons should update in place, not close the sheet
const baseFollow = A.follow;
A.follow = (el, ev, arg) => { baseFollow(el, ev, arg); if (quiz) App.updateSheet(quiz.sheet, quizHtml(quiz)); };

/* ------------------------------------------------------------------ hero */
/** team hero (approved 2026-10-29; jersey fabric behind it approved apply-jersey A 2026-11-08, app/fabric.js): location over the big name, the helmet on the right facing left, the record as the big number
    with the division place and coach beside it, Your team / alerts / share, Shop and Tickets, and the next game as a card inside */
function hero(tid, opts = {}) {
  const tm = Dt.team(tid), s = nowS();
  const rec = Dt.record(tid, s), dp = divPlace(tid, s);
  const on = store.p.teams.includes(tid);
  const live = Dt.liveGameFor(tid);
  const next = live || Dt.nextGame(tid);
  const phase = time.phase();
  const played = rec.w + rec.l + rec.t > 0;
  const place = played ? `${fmt.ord(dp.place)} in ${divKey(tm)}` : divKey(tm);
  let card = '';
  if (next) {
    const S = Dt.score(next), o = Dt.opp(next, tid), home = Dt.isHome(next, tid), hide = Dt.spoiled(next);
    const k = S.st === 'live' ? html`<span class="badge live">${hide ? 'Live' : S.label}</span>` : html`<span class="tm-next-k">Next</span>`;
    const r = S.st === 'live' ? (hide ? 'Watch' : `${home ? S.hs : S.as}–${home ? S.as : S.hs}`) : next.tbd ? 'TBD' : `${fmt.weekday(next.ts)} ${fmt.time(next.ts)} · ${watchLine(next)}`;
    card = html`<a class="tm-next tap" data-go="#/game/${next.id}">${UI.logo(o, 'sm')}<div class="grow">${k}<b>${home ? 'vs' : '@'} ${Dt.team(o).name}</b></div><em class="${S.st === 'live' && !hide ? 'num' : ''}">${r}</em>${icon('chev', 'xs')}</a>`;
  } else if (phase !== 'regular' && phase !== 'post') {
    const [label, go] = phase === 'draft' ? ['Draft week: see the war room', '#/draft'] : phase === 'fa' ? ['Free agency is open: track every move', '#/free-agency'] : ['Countdown to kickoff: see the schedule', `#/team/${tid}?tab=schedule`];
    card = html`<a class="tm-next tap" data-go="${go}"><div class="grow"><span class="tm-next-k">Offseason</span><b>${label}</b></div>${icon('chev', 'xs')}</a>`;
  }
  return html`<section class="hero tm-hero tm-hero2" style="${raw(tv(tm) + heroVars(tm))}">${raw(App.fabric('1.5,.1,150,.5,50,0', heroCol(tm.color), tm.alt))}${UI.helmet(tid, { cls: 'hero-helmet', face: 'left' })}
    <div class="tm-hero-loc">${tm.loc}</div>
    <div class="tm-hero-name t-dxl">${tm.name}</div>
    <div class="tm-rec"><b class="t-dl">${played ? rec.str : '0-0'}</b><span>${place}${tm.coach ? html`<br>HC ${tm.coach}` : ''}</span></div>
    <div class="flex gap8 mt16">
      ${tid === store.p.primary ? html`<button class="btn sm tm-ghost" data-act="my-team" data-arg="${tid}">${icon('star', 'sm fill')}Your team</button>`
        : html`<button class="btn sm ${on ? 'tm-ghost' : 'white'}" data-act="follow" data-arg="team:${tid}">${icon(on ? 'check' : 'plus', 'sm')}${on ? 'Following' : 'Follow'}</button>`}
      <button class="icon-btn tm-round" data-act="tm-alerts" data-arg="${tid}" aria-label="Alerts">${icon(alertsOn(tid) ? 'bellon' : 'bell', 'sm')}</button>
      <button class="icon-btn tm-round" data-act="toast" data-arg="Link to the ${tm.name} hub copied" aria-label="Share">${icon('share', 'sm')}</button>
    </div>
    <div class="tm-hero-btns"><button class="btn tm-tint" data-go="#/shop/${tid}">${icon('bag', 'sm')}Shop</button><button class="btn tm-tint" data-go="#/tickets">${icon('ticket', 'sm')}Tickets</button></div>
    ${card}</section>`;
}
A['tm-alerts'] = (el, ev, tid) => {
  const m = store.p.teamAlerts = store.p.teamAlerts || {};
  m[tid] = !alertsOn(tid); store.save();
  const tm = Dt.team(tid);
  App.toast({ title: m[tid] ? `${tm.name} alerts on` : `${tm.name} alerts off`, body: m[tid] ? 'Kickoff, scoring plays, finals, injuries and big moves.' : '', logo: tm.logo });
  App.refresh();
};

/* ------------------------------------------------------------------ overview */
/** team leaders (approved round 5): one card in the approved game leaders layout (.ldr), one team. A row per category: the eyebrow,
    the L3 line (S32, "QB · 7 games") and the number right in the leaders' Display in the team's colour, its unit under it */
function leaders(tid, s) {
  const tot = Dt.seasonTotals(s); if (!tot) return '';
  const mine = Object.values(tot).filter(L => L.tid === tid), t = Dt.team(tid), mk = (App.teamRoles(t) || {}).mark || App.teamFill(t);
  const pick = (cat, k, label, unit) => {
    const top = mine.filter(L => L.cats[cat]).sort((a, b) => (b.cats[cat][k] || 0) - (a.cats[cat][k] || 0))[0];
    if (!top || !top.cats[cat][k]) return null;
    const v = top.cats[cat][k];
    return { L: top, label, unit, v: fmt.n(v, v % 1 ? 1 : 0) };
  };
  const rows = [
    pick('passing', 'passingYards', 'Passing', 'YDS'), pick('rushing', 'rushingYards', 'Rushing', 'YDS'), pick('receiving', 'receivingYards', 'Receiving', 'YDS'),
    pick('defensive', 'sacks', 'Sacks', 'SACKS'), pick('defensive', 'totalTackles', 'Tackles', 'TKL'), pick('interceptions', 'interceptions', 'Interceptions', 'INT'),
  ].filter(Boolean);
  if (!rows.length) return '';
  return html`<div class="sec"><div class="pad"><div class="gc-card flush ldr"><div class="ldr-head"><div class="t-title">${s} leaders</div></div>
    ${rows.map(r => html`<a class="ldr-row tm-ldr tap" data-go="#/player/${r.L.pid}"><div class="t-eyebrow">${r.label}</div><div class="tm-ldr-g">${UI.lk3(r.L.pid, { meta: `${(Dt.player(r.L.pid) || {}).pos || ''} · ${r.L.gp} games` })}<div class="ldr-v"><b style="color:${mk}">${r.v}</b><span>${r.unit}</span></div></div></a>`)}</div></div></div>`;
}
function divMini(tid, s) {
  const { list } = divPlace(tid, s);
  // the division as a card: its name on top, the team you're looking at filled with its gradient
  return html`<div class="sec"><div class="st-card"><div class="st-card-h"><span>${divKey(Dt.team(tid))}</span><a class="more" data-go="#/standings">Standings${icon('chev', 'xs')}</a></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Team</th><th>W-L</th><th>Pct</th><th>Div</th><th>Diff</th><th>Strk</th></tr></thead><tbody>
    ${list.map(r => { const me = r.tid === tid; return html`<tr class="${me ? 'me' : ''} tap" data-go="#/team/${r.tid}" ${me ? raw(`style="${App.teamVars(r.t)}"`) : ''}><td>${UI.stTeam(r.tid, r.t.abbr, me)}</td>
      <td>${r.tie ? `${r.w}-${r.l}-${r.tie}` : `${r.w}-${r.l}`}</td><td>${r.pct.toFixed(3).replace(/^0/, '')}</td><td>${r.dw}-${r.dl}</td>
      <td class="${me ? '' : r.diff > 0 ? 'c-win' : r.diff < 0 ? 'c-loss' : ''}">${r.diff > 0 ? '+' : ''}${r.diff}</td><td>${r.streak}</td></tr>`; })}</tbody></table></div></div></div>`;
}
/** where the team sits in this week's power rankings */
/** power ranking card (approved round 5): as it was, the record in the record face (Stats medium) */
function prCard(tid, s) {
  const pr = s === Dt.seasonForStats() && Dt.powerRank(s), r = pr && pr.of[tid]; if (!r) return '';
  return html`<div class="sec"><a class="card cpad tap tm-pr" data-go="#/power-rankings"><div class="tm-pr-n">${r.rk}</div>
    <div class="grow"><div class="eyebrow">Power rankings</div><div class="b mt4">${fmt.ord(r.rk)} in the NFL ${UI.prMove(r.mv)}</div><div class="tiny mt4">${r.prev ? (r.mv ? `${r.mv > 0 ? 'Up' : 'Down'} from ${fmt.ord(r.prev)} last week` : `Same as last week`) : 'First rankings of the season'} · <span class="lk-rec">${r.rec}</span></div></div>${icon('chev', 'sm chev')}</a></div>`;
}
function statTiles(tid, s) {
  const o = allSeasons(s)[tid]; if (!o || !o.g) return '';
  const tiles = [
    [fmt.n(o.ppg, 1), 'Points per game', rankOf(tid, s, 'ppg')], [fmt.n(o.papg, 1), 'Points allowed per game', rankOf(tid, s, 'papg', true)],
    [fmt.n(o.ypg, 0), 'Yards per game', rankOf(tid, s, 'ypg')], [(o.toDiff > 0 ? '+' : '') + o.toDiff, 'Turnover differential', rankOf(tid, s, 'toDiff')],
  ];
  // approved round 6 (team-glance B): the season-line pattern, points per game big with its rank, the other three small
  const [lead, ...rest] = tiles;
  return html`<div class="sec">${UI.secHead(`${s} at a glance`, 'All stats', `#/team/${tid}?tab=stats`)}
    <div class="pad"><div class="ps-lead"><span class="ps-eb">${lead[1]}</span><b>${lead[0]}</b><span>${fmt.ord(lead[2])} in the NFL</span></div>
    <div class="ps-row">${rest.map(([v, l, r]) => html`<div><b>${v}</b><span>${l}</span><em>${fmt.ord(r)}</em></div>`)}</div></div></div>`;
}
function rivals(tid) {
  // approved round 6 (team-history A): logo, name, the last meeting in Meta, the series record in the win / loss pill
  const tm = Dt.team(tid);
  const divRivals = Dt.D.teams.filter(t => divKey(t) === divKey(tm) && t.id !== tid);
  return html`<div class="sec">${UI.secHead('Rivalries since 2022')}<div class="list">${divRivals.map(r => {
    const games = Dt.h2h(tid, r.id).filter(g => g.s >= 2022);
    let w = 0, l = 0; games.forEach(g => { const x = Dt.result(g, tid); if (x.r === 'W') w++; else if (x.r === 'L') l++; });
    const last = games[0], lr = last && Dt.result(last, tid);
    return UI.row({ left: UI.logo(r.id, 'md'), title: r.name,
      sub: last ? (Dt.spoiled(last) ? 'Last meeting hidden (spoiler shield)' : `Last: ${lr.r} ${lr.us}–${lr.them}, ${Dt.weekLabel(last.t, last.w)} ${last.s}`) : 'No meetings yet',
      right: html`<span class="badge ${w > l ? 'win' : w < l ? 'loss' : ''}">${w}–${l}</span>`, go: `#/team/${r.id}`, cls: 'hs-rv' });
  })}</div></div>`;
}
function overview(tid, s) {
  const live = Dt.liveGameFor(tid), last = Dt.lastGame(tid), next = Dt.nextGame(tid);
  const news = Dt.news({ team: tid }).slice(0, 4);
  const games = [live, next && next !== live ? next : null, last].filter(Boolean);
  return html`
    ${games.length ? html`<div class="sec">${UI.secHead(live ? 'Live now' : 'Games')}<div class="list">${games.map(g => UI.gameRow(g, tid))}</div></div>` : ''}
    ${UI.learnTip(`Every team plays 17 regular-season games. The 4 division winners and 3 wild cards from each conference make the playoffs. ${UI.term('Wild Card')}`)}
    ${news.length ? html`<div class="sec">${UI.secHead('Latest', 'More news', '#/news')}<div class="cards">${UI.newsCard(news[0], 'lg')}</div>
      ${news.length > 1 ? html`<div class="list mt8">${news.slice(1).map(a => UI.newsCard(a, 'sm'))}</div>` : ''}</div>` : ''}
    ${App.watchParts ? html`<div class="sec">${UI.secHead('Videos')}${App.watchParts.teamVideos(tid)}</div>` : ''}
    ${App.draftWatch ? App.draftWatch(tid) : ''}${leaders(tid, s)}${prCard(tid, s)}${statTiles(tid, s)}${divMini(tid, s)}${rivals(tid)}${App.draftWatch ? App.draftWatch(tid, 'low') : ''}`;
}

/* ------------------------------------------------------------------ schedule */
function schedule(tid, page) {
  const now = time.now();
  const seasons = [2026, 2025, 2024, 2023, 2022].filter(s => Dt.teamGames(tid, s).some(g => Dt.scheduleVisible(g, now)) && (Dt.week(s, 2, 1) || {}).start - 120 * 864e5 < now);
  const s = page.state.season && seasons.includes(page.state.season) ? page.state.season : seasons[0];
  const all = Dt.teamGames(tid, s, { pre: page.state.pre }).filter(g => Dt.scheduleVisible(g, now));
  const reg = all.filter(g => g.t === 2), post = all.filter(g => g.t === 3), pre = all.filter(g => g.t === 1);
  const rec = Dt.record(tid, s);
  const weeks = new Set(reg.map(g => g.w));
  const maxW = Math.max(18, ...weeks);
  const regRows = [];
  for (let w = 1; w <= maxW; w++) {
    const g = reg.find(x => x.w === w);
    if (g) regRows.push(UI.gameRow(g, tid));
    else if (w <= 18) regRows.push(html`<div class="row static gr tm-bye"><span class="gr-blank"></span><div class="row-main"><div class="row-title">${UI.term('Bye week')}</div><div class="row-sub">Wk ${w}</div></div></div>`);
  }
  let hm = [0, 0], aw = [0, 0];
  reg.forEach(g => { const r = Dt.result(g, tid); if (!r) return; const b = Dt.isHome(g, tid) ? hm : aw; r.r === 'W' ? b[0]++ : b[1]++; });
  // approved round 6 (team-schedule v2 B): the Scores season chip and a Preseason toggle on a bar; the record big, home and away small
  const tm = Dt.team(tid), place = divPlace(tid, s).place;
  return html`<div class="st-bar pad"><button class="sc-season" data-act="tm-season-sheet" data-arg="${seasons.join(',')}">${s}${icon('down', 'xs')}</button>
      <span class="sc-pre">Preseason ${UI.toggle(!!page.state.pre, 'tm-pre')}</span></div>
    ${!seasons.length ? UI.empty('calendar', 'Schedule not released yet', 'The 2026 schedule drops in mid-May.') : html`
    <div class="pad mt12">${UI.statRow([[rec.str, 'Record'], [`${hm[0]}-${hm[1]}`, 'Home'], [`${aw[0]}-${aw[1]}`, 'Away']], `${s}${place ? ` · ${fmt.ord(place)} in the ${tm.conf} ${tm.div}` : ''}`)}</div>
    ${pre.length ? html`<div class="sec">${UI.secHead('Preseason')}<div class="list">${pre.map(g => UI.gameRow(g, tid))}</div></div>` : ''}
    <div class="sec">${UI.secHead('Regular season')}<div class="list">${regRows}</div></div>
    ${post.length ? html`<div class="sec">${UI.secHead('Playoffs')}<div class="list">${post.map(g => UI.gameRow(g, tid))}</div></div>` : ''}
    <div class="pad mt16"><button class="btn ghost block" data-act="toast" data-arg="Schedule added to your calendar — with where-to-watch in every event">${icon('calendar', 'sm')} Add schedule to calendar</button></div>`}`;
}

/* ------------------------------------------------------------------ roster */
function roster(tid, page) {
  const sort = page.state.sort || 'num';
  const players = Dt.roster(tid);
  const active = players.filter(p => p.st !== 'Practice Squad');
  const ps = players.filter(p => p.st === 'Practice Squad');
  const sorter = {
    num: (a, b) => (+a.j || 999) - (+b.j || 999), name: (a, b) => (a.ln || '').localeCompare(b.ln || ''),
    age: (a, b) => (a.age || 0) - (b.age || 0), sal: (a, b) => (b.sal || 0) - (a.sal || 0),
  }[sort];
  const rowFor = p => {
    const inj = p.inj || Dt.injuryFor(p.id);
    const right = sort === 'sal' ? html`<span class="num">${fmt.money(p.sal)}</span>` : sort === 'age' ? html`<span class="num">${p.age || '—'}</span>` : '';
    // approved round 5: the jersey number in Stats bold in a fixed column, the L3 line (meta on one line, cut with an ellipsis), the injury badge right
    const meta = [p.pos, p.age ? p.age + ' yrs' : '', p.exp != null ? (p.exp ? fmt.ord(p.exp + 0) + ' season' : 'Rookie') : '', p.col].filter(Boolean).join(' · ');
    return html`<a class="row tap tm-pl lk-row" data-go="#/player/${p.id}" data-name="${(p.n + ' ' + p.pos + ' ' + (p.col || '')).toLowerCase()}">
      <b class="tm-jersey">${p.j || '–'}</b>${UI.lk3(p.id, { meta })}${inj && inj.s ? html`<span class="badge warn">${inj.s}</span>` : ''}${right}</a>`;
  };
  const groups = POS_GROUPS.map(([k, label]) => {
    const list = active.filter(p => groupOf(p.pos) === k).sort(sorter);
    return list.length ? html`<div class="sec tm-group">${UI.secHead(`${label} (${list.length})`)}<div class="list">${list.map(rowFor)}</div></div>` : '';
  });
  return html`<div class="pad mt16"><div class="search-field">${icon('search', 'sm')}<input class="tm-search" placeholder="Search ${active.length} players by name, position, college" value="${page.state.q || ''}"></div></div>
    <div class="chips mt12">${[['num', 'Number'], ['name', 'Name'], ['age', 'Age'], ['sal', 'Salary']].map(([k, l]) => html`<button class="chip ${k === sort ? 'on' : ''}" data-act="tm-sort" data-arg="${k}">${l}</button>`)}</div>
    ${groups}
    ${ps.length ? html`<div class="sec tm-group">${UI.secHead(`Practice squad (${ps.length})`)}<div class="list">${ps.sort(sorter).map(rowFor)}</div></div>` : ''}`;
}

/* ------------------------------------------------------------------ depth chart */
const SPOTS = {
  off: { LT: [27, 32], LG: [38.5, 32], C: [50, 32], RG: [61.5, 32], RT: [73, 32], TE: [84, 36], QB: [50, 56], RB: [50, 82], FB: [38, 70], WR: [[8, 32], [93, 32], [17, 46]] },
  def: { LDE: [27, 68], LDT: [42, 68], NT: [50, 68], RDT: [58, 68], RDE: [73, 68], WLB: [28, 42], MLB: [50, 42], SLB: [70, 42], LILB: [40, 42], RILB: [60, 42],
    LCB: [8, 58], RCB: [92, 58], NB: [86, 30], FS: [36, 12], SS: [64, 12] },
};
function depthChart(tid, page) {
  const forms = (NFL.d.core.depth[tid] || []);
  if (!forms.length) return UI.empty('layers', 'No depth chart published');
  const order = f => /WR|TE/.test(f.n) ? 0 : /D$/.test(f.n) ? 1 : 2;
  const sorted = forms.slice().sort((a, b) => order(a) - order(b));
  const fi = Math.min(page.state.form || 0, sorted.length - 1);
  const f = sorted[fi];
  const isOff = order(f) === 0, isDef = order(f) === 1;
  const name = id => { const p = Dt.player(id); return p ? p : null; };
  const chip = (pos, id, xy, up) => {
    const p = name(id);
    if (!p) return '';
    const inj = Dt.injuryFor(id);
    return html`<a class="tm-spot tap ${up ? 'stag' : ''}" style="left:${xy[0]}%;top:${xy[1]}%" data-go="#/player/${id}"><b>${p.j || ''}${inj ? raw('<em class="tm-spot-inj"></em>') : ''}</b><span>${p.ln || p.n}</span><i>${pos}</i></a>`;
  };
  let diagram = '';
  if (isOff || isDef) {
    const map = isOff ? SPOTS.off : SPOTS.def;
    let wr = 0;
    const wrEntries = f.pos.filter(ps => ps.k === 'WR');
    const spots = f.pos.map(ps => {
      if (ps.k === 'WR') {
        // ESPN sometimes lists all receivers under one WR slot, sometimes one slot each
        const ids = wrEntries.length === 1 ? ps.ids.slice(0, 3) : [ps.ids[0]];
        return ids.map(id => wr < 3 && id ? chip('WR', id, SPOTS.off.WR[wr++]) : '');
      }
      const xy = map[ps.k];
      if (!xy || !ps.ids[0]) return '';
      return chip(ps.k, ps.ids[0], xy, /^(LG|RG|LDT|RDT|LILB|RILB)$/.test(ps.k));
    });
    diagram = html`<div class="tm-field ${isDef ? 'def' : ''}"><i class="tm-los"></i>${spots}</div>`;
  }
  // round 5 roster v2: under the field, one row per position: the position in Stats bold, the starter as an L3 player line
  // with the backups in its Meta line, and an injury badge on the right
  const ln = p => p.ln || (p.n || '').split(' ').slice(1).join(' ') || p.n;
  const row = ps => {
    const pid = ps.ids[0], p = name(pid); if (!p) return '';
    const back = [1, 2].map(i => name(ps.ids[i])).filter(Boolean), inj = Dt.injuryFor(pid);
    const meta = [p.j ? '#' + p.j : '', back.length ? back.map((b, i) => `${i ? '3rd' : '2nd'} ${ln(b)}`).join(' · ') : 'No backup listed'].filter(Boolean).join(' · ');
    return html`<a class="row tap tm-dc" data-go="#/player/${pid}"><b class="tm-dc-pos">${ps.k}</b>${UI.lk3(pid, { meta })}${inj && inj.s ? html`<span class="badge warn">${inj.s}</span>` : ''}</a>`;
  };
  return html`<div class="chips mt16">${sorted.map((x, i) => html`<button class="chip ${i === fi ? 'on' : ''}" data-act="tm-form" data-arg="${i}">${x.n}</button>`)}</div>
    ${diagram ? html`<div class="pad mt16">${diagram}<div class="t-meta mt8">Starters on the field. Tap anyone for their player page.</div></div>` : ''}
    <div class="sec">${UI.secHead(isOff ? 'Offense' : isDef ? 'Defense' : 'Special teams')}
      <div class="list">${f.pos.map(row)}</div></div>`;
}

/* ------------------------------------------------------------------ stats */
let statsCat = '';
function stats(tid, s) {
  const o = allSeasons(s)[tid];
  if (!o || !o.g) return UI.empty('chart', `No ${s} games yet`, 'Stats appear after week 1.');
  const rows = rankGroups(tid, s, o);
  const tot = Dt.seasonTotals(s) || {};
  const mine = Object.values(tot).filter(L => L.tid === tid);
  const cat = (c, cols, sortK, min) => mine.filter(L => L.cats[c] && (L.cats[c][sortK] || 0) >= (min || 1)).sort((a, b) => (b.cats[c][sortK] || 0) - (a.cats[c][sortK] || 0)).slice(0, 6);
  // approved round 6 (team-stats, my call per your note): one stat-table card with the small tabs for the category, as on the player page
  const T = [['Passing', 'passing', [['Cmp', 'completions'], ['Att', 'passingAttempts'], ['Yds', 'passingYards'], ['TD', 'passingTouchdowns'], ['Int', 'interceptions'], ['Rtg', 'rating', c => c.rating.toFixed(1)]], 'passingAttempts', 5],
    ['Rushing', 'rushing', [['Att', 'rushingAttempts'], ['Yds', 'rushingYards'], ['Avg', 'ypc', c => c.ypc.toFixed(1)], ['TD', 'rushingTouchdowns'], ['Long', 'longRushing']], 'rushingYards'],
    ['Receiving', 'receiving', [['Tgt', 'receivingTargets'], ['Rec', 'receptions'], ['Yds', 'receivingYards'], ['Avg', 'ypr', c => c.ypr.toFixed(1)], ['TD', 'receivingTouchdowns']], 'receivingYards'],
    ['Defense', 'defensive', [['Tkl', 'totalTackles'], ['Solo', 'soloTackles'], ['Sacks', 'sacks', c => fmt.n(c.sacks, c.sacks % 1 ? 1 : 0)], ['QB hits', 'QBHits'], ['PD', 'passesDefended']], 'totalTackles'],
    ['Kicking', 'kicking', [['FG', 'fieldGoalsMade', c => `${c.fieldGoalsMade}/${c.fieldGoalAttempts}`], ['Long', 'longFieldGoalMade'], ['XP', 'extraPointsMade', c => `${c.extraPointsMade}/${c.extraPointAttempts}`], ['Pts', 'totalKickingPoints']], 'fieldGoalAttempts']]
    .map(([t, c, cols, k, min]) => ({ t, c, cols, list: cat(c, cols, k, min) })).filter(x => x.list.length);
  const pick = T.find(x => x.t === statsCat) || T[0];
  const ki = pick ? pick.cols.findIndex(x => /^(Yds|Tkl|Pts)$/.test(x[0])) : -1;
  const card = pick ? html`<div class="pad mt16" style="${raw(App.teamVars(Dt.team(tid)))}"><div class="tc">
      <div class="tc-h"><span class="tc-t">Player stats</span></div>
      <div class="tc-cat">${UI.tabs(T.map(x => ({ k: x.t, l: x.t })), pick.t, 'tm-scat', 'sm')}</div>
      <div class="tc-tbl"><table class="tbl"><thead><tr><th>Player</th>${pick.cols.map(x => html`<th>${x[0]}</th>`)}</tr></thead><tbody>
        ${pick.list.map(L => html`<tr class="tap" data-go="#/player/${L.pid}"><td>${L.n}</td>${pick.cols.map((x, j) => html`<td class="${j === ki ? 'k' : ''}">${x[2] ? x[2](L.cats[pick.c]) : fmt.n(L.cats[pick.c][x[1]])}</td>`)}</tr>`)}</tbody></table></div>
      <div class="tc-hint">Swipe the table for more columns</div></div>
      <div class="tc-foot">Top six on the team in each category, regular season.</div></div>` : '';
  return html`<div class="pad mt16 flex between"><div class="meta">${s} regular season · ${o.g} games</div>${UI.depth() < 2 ? html`<button class="btn xs ghost" data-act="tm-deep">Show advanced</button>` : ''}</div>
    ${rankTop(tid, rows)}
    ${rows.map(([h, items]) => rankList(h, items, tid))}
    ${card}`;
}

/** the Stats tab's ranked rows: [[group, [[label, value, rank]]]] */
function rankGroups(tid, s, o = allSeasons(s)[tid]) {
  const pg = (v) => fmt.n(o.g ? v / o.g : 0, 1);
  const rows = [
    ['Scoring', [['Points per game', fmt.n(o.ppg, 1), rankOf(tid, s, 'ppg')], ['Points allowed per game', fmt.n(o.papg, 1), rankOf(tid, s, 'papg', true)]]],
    ['Offense', [['Total yards per game', fmt.n(o.ypg, 1), rankOf(tid, s, 'ypg')], ['Passing yards per game', pg(o.pass), rankOf(tid, s, 'pass')], ['Rushing yards per game', pg(o.rush), rankOf(tid, s, 'rush')],
      ['3rd down conversion', fmt.pct(o.thirdPct), rankOf(tid, s, 'thirdPct')], ['Red zone TD rate', fmt.pct(o.rzPct), rankOf(tid, s, 'rzPct')], ['Time of possession', `${Math.floor(o.topPg / 60)}:${String(Math.round(o.topPg % 60)).padStart(2, '0')}`, rankOf(tid, s, 'topPg')]]],
    ['Defense', [['Yards allowed per game', fmt.n(o.yapg, 1), rankOf(tid, s, 'yapg', true)], ['Sacks', fmt.n(o.sacks), rankOf(tid, s, 'sacks')], ['Takeaways', fmt.n(o.toF), rankOf(tid, s, 'toF')]]],
    ['Discipline', [['Giveaways', fmt.n(o.to), rankOf(tid, s, 'to', true)], ['Turnover differential', (o.toDiff > 0 ? '+' : '') + o.toDiff, rankOf(tid, s, 'toDiff')], ['Penalties', fmt.n(o.pen), rankOf(tid, s, 'pen', true)]]],
  ];
  if (UI.depth() >= 2) rows.push(['Advanced', [
    [html`${UI.term('EPA')} per play`, (o.epaPlay >= 0 ? '+' : '') + o.epaPlay.toFixed(3), rankOf(tid, s, 'epaPlay')],
    ['Pass EPA per play', (o.passEpaPlay >= 0 ? '+' : '') + o.passEpaPlay.toFixed(3), rankOf(tid, s, 'passEpaPlay')],
    ['Rush EPA per play', (o.rushEpaPlay >= 0 ? '+' : '') + o.rushEpaPlay.toFixed(3), rankOf(tid, s, 'rushEpaPlay')],
    [UI.term('Success rate'), fmt.pct(o.succRate), rankOf(tid, s, 'succRate')], ['Explosive play rate', fmt.pct(o.explRate), rankOf(tid, s, 'explRate')],
    ['Defensive EPA allowed per play', (o.dEpaPlay >= 0 ? '+' : '') + o.dEpaPlay.toFixed(3), rankOf(tid, s, 'dEpaPlay', true)],
    ['Defensive success rate allowed', fmt.pct(o.dSuccRate), rankOf(tid, s, 'dSuccRate', true)],
  ]]);
  return rows;
}
/** team rankings (approved 2026-10-29): the rank leads every row in Display M, always in the team's Mark;
    then the stat in Title S, its value in Stats, and the league meter under both */
function rankList(h, items, tid) {
  const tm = tid && Dt.team(tid);
  return html`<div class="sec">${UI.secHead(h)}<div class="list rk" ${tm ? raw(`style="${App.teamVars(tm)}"`) : ''}>${items.map(([l, v, r]) => html`<div class="row static rk-r"><b class="t-dm">${r ? fmt.ord(r).toUpperCase() : '–'}</b><div class="row-main"><div class="rk-l"><span class="t-title-s">${l}</span><span class="t-stat">${v}</span></div>${r ? html`<i class="rk-m"><b style="width:${((33 - r) / 32 * 100).toFixed(1)}%"></b></i>` : ''}</div></div>`)}</div></div>`;
}
/** the team's three best ranks as tiles, at the top of the Stats tab */
function rankTop(tid, groups) {
  const top = groups.flatMap(([, items]) => items).filter(x => x[2]).sort((a, b) => a[2] - b[2]).slice(0, 3);
  // summary-stats A (approved 2026-11-08): the stat row, not tiles
  return top.length ? html`<div class="pad mt12">${UI.statRow(top.map(([l, , r]) => [fmt.ord(r).toUpperCase(), l]), 'Best in the NFL')}</div>` : '';
}

/* ------------------------------------------------------------------ injuries */
/** injury report (approved 2026-10-29): this team or its next opponent on a segmented control; an outlined card per player
    with the headshot on the team colour, name and position, the status pill (soft) and the injury */
function injuries(tid, page) {
  const nx = Dt.liveGameFor(tid) || Dt.nextGame(tid), opp = nx ? Dt.opp(nx, tid) : null;
  const st = page && page.state || {}, who = opp && st.injT === opp ? opp : tid, tm = Dt.team(who);
  const sw = opp ? html`<div class="mt16">${UI.seg([tid, opp].map(t => ({ k: t, l: Dt.team(t).name, style: App.teamVars(Dt.team(t)) })), who, 'tm-inj-team')}</div>` : '';
  const list = Dt.injuries(who);
  if (!list.length) return html`${sw}${UI.empty('layers', 'No injury report right now', 'Teams file it during game week, Wednesday to Friday.')}`;
  const sev = s => /Out|Reserve|Physically/i.test(s) ? 'loss' : 'warn';
  const short = s => /Injured Reserve/i.test(s) ? 'IR' : /Physically Unable/i.test(s) ? 'PUP' : s;
  return html`${sw}<div class="inj-list mt12" style="${raw(App.teamVars(tm))}">${list.map(i => html`<a class="inj tap" data-go="#/player/${i.p}">
      <div class="inj-hs" style="background:var(--team)"><img src="${Dt.headshot(i.p)}" alt="" loading="lazy" onerror="this.remove()"></div>
      <div class="grow"><div class="inj-n">${i.n}<span>${i.pos}</span></div><div class="inj-s"><span class="badge ${sev(i.s)}">${short(i.s)}</span><span class="t-meta">${i.ty || 'Injury'}</span></div></div></a>`)}</div>
    <div class="tiny pad mt8">Official injury report${list[0].dt ? `, filed ${fmt.date(list[0].dt + 'T12:00:00Z')}` : ''}.</div>`;
}

/* ------------------------------------------------------------------ moves */
function moves(tid) {
  const list = Dt.tx({ team: tid }).slice(0, 120);
  if (!list.length) return UI.empty('swap', 'No moves yet');
  const groups = [];
  list.forEach(r => { const m = r.dt.slice(0, 7); let g = groups[groups.length - 1]; if (!g || g.m !== m) groups.push(g = { m, rows: [] }); g.rows.push(r); });
  return html`${groups.map(g => html`<div class="sec">${UI.secHead(new Date(g.m + '-15T12:00:00Z').toLocaleDateString(fmt.locale(), { month: 'long', year: 'numeric' }))}
    <div class="list">${g.rows.map(r => App.txRow(r, false))}</div></div>`)}`;
}

/* ------------------------------------------------------------------ contracts */
function cap(tid) {
  const players = Dt.roster(tid).filter(p => p.sal && p.st !== 'Practice Squad');
  if (!players.length) return UI.empty('dollar', 'No contract data');
  const total = players.reduce((a, p) => a + p.sal, 0);
  const top = players.slice().sort((a, b) => b.sal - a.sal).slice(0, 12);
  const yr = new Date(time.now()).getUTCFullYear();
  const expiring = players.filter(p => p.thru && p.thru <= Math.max(yr, 2026)).sort((a, b) => b.sal - a.sal).slice(0, 10);
  const bySpend = POS_GROUPS.map(([k, label]) => ({ k, label, v: players.filter(p => groupOf(p.pos) === k).reduce((a, p) => a + p.sal, 0) })).filter(x => x.v).sort((a, b) => b.v - a.v);
  // approved round 6 (team-cap v2 A): the lead number, then one stacked bar in the team primary stepping lighter, keyed underneath
  const shade = i => `color-mix(in srgb, var(--team) ${100 - Math.round(i / Math.max(1, bySpend.length - 1) * 70)}%, #ffffff)`;
  return html`<div style="${App.teamVars(Dt.team(tid))}"><div class="pad mt16"><div class="ps-lead"><span class="ps-eb">2026 cash, active roster</span><b>${fmt.money(total)}</b><span>${players.length} players under contract</span></div></div>
    <div class="sec">${UI.secHead('Where the money goes')}<div class="pad"><div class="cp-bar">${bySpend.map((x, i) => html`<i style="flex:${x.v};background:${shade(i)}"></i>`)}</div>
      <div class="cp-key">${bySpend.map((x, i) => html`<span><i style="background:${shade(i)}"></i><b>${Math.round(x.v / total * 100)}%</b> ${x.label}</span>`)}</div></div></div></div>
    <div class="sec">${UI.secHead('Top contracts')}<div class="list">${top.map(p => UI.playerRow(p.id, { sub: `${p.pos} · through ${p.thru || '—'}`, right: html`<span class="ct-sal">${fmt.money(p.sal)}</span>` }))}</div></div>
    ${expiring.length ? html`<div class="sec">${UI.secHead('Expiring after this season')}<div class="list">${expiring.map(p => UI.playerRow(p.id, { right: UI.lk4(fmt.money(p.sal), '', { r: true }) }))}</div></div>` : ''}
    <div class="ps-foot pad mt16">Each player's listed 2026 salary; they aren't official salary-cap hits (bonus proration, dead money and rollover aren't included).</div>`;
}

/* ------------------------------------------------------------------ draft */
function draft(tid, page = { state: {} }) {
  const now = time.now();
  const yrs = [2026, 2025, 2024].filter(y => Date.parse(`${y}-04-23T23:00:00Z`) <= now);
  const d = NFL.d.core.drafts;
  if (!yrs.length) return UI.empty('star', 'No drafts yet');
  // approved round 6 (team-draft B): one class at a time on the Scores season chip; the roster row with the overall pick as the number
  const y = yrs.includes(page.state.dy) ? page.state.dy : yrs[0];
  const picks = (d[y] || []).filter(p => p.t === tid && (y < 2026 || Date.parse('2026-04-24T00:00:00Z') + (p.o || 0) * 600e3 <= now || now > Date.parse('2026-04-27T00:00:00Z')));
  const row = p => {
    const inNfl = p.pid && Dt.player(p.pid), gone = inNfl && Dt.player(p.pid).t !== tid ? Dt.team(Dt.player(p.pid).t) : null;
    return html`<${raw(inNfl ? 'a' : 'div')} class="row ${inNfl ? 'tap' : 'static'} dr-r" ${raw(inNfl ? `data-go="#/player/${p.pid}"` : '')}>
      <span class="dr-n"><b>${p.o}</b><span>Rd ${p.r}</span></span>${inNfl ? UI.hs(p.pid, 'sm') : ''}
      <div class="row-main"><div class="row-title">${p.n || 'TBD'}</div><div class="row-sub">${[p.pos, p.col].filter(Boolean).join(' · ')}</div></div>
      ${gone ? html`<span class="badge">Now ${gone.abbr}</span>` : p.tr ? html`<span class="badge">Via trade</span>` : ''}</${raw(inNfl ? 'a' : 'div')}>`;
  };
  return html`<div class="st-bar pad"><button class="sc-season" data-act="tm-season-sheet" data-arg="${yrs.join(',')}" data-key="dy">${y}${icon('down', 'xs')}</button>
      <a class="dr-more" data-go="#/draft?y=${y}">Full draft${icon('chev', 'xs')}</a></div>
    ${picks.length ? html`<div class="meta pad mt12">${picks.length} picks · ${picks.filter(p => p.r === 1).length} in round 1</div><div class="list mt8">${picks.map(row)}</div>`
      : html`<div class="meta pad mt12">No picks${y === 2026 && now < Date.parse('2026-04-27T00:00:00Z') ? ' yet' : ''}.</div>`}`;
}

/* ------------------------------------------------------------------ history */
function history(tid) {
  const now = time.now();
  const rows = [2026, 2025, 2024, 2023, 2022].map(s => {
    const games = Dt.teamGames(tid, s).filter(g => g.t === 2 && Dt.state(g) === 'post');
    if (!games.length) return null;
    const rec = Dt.record(tid, s);
    const { place } = divPlace(tid, s);
    const post = Dt.teamGames(tid, s).filter(g => g.t === 3 && Dt.state(g) === 'post');
    let res = '';
    if (post.length) {
      const last = post[post.length - 1], r = Dt.result(last, tid);
      res = r.r === 'W' && last.w === 5 ? 'Won Super Bowl ' + Dt.sbNumeral(s) : `Lost ${Dt.weekLabel(last.t, last.w).replace('Conference Championships', 'conference title game')}`;
    } else if (games.length >= 17) res = 'Missed playoffs';
    else res = 'In progress';
    const champ = /Won Super/.test(res);
    const short = champ ? 'Won SB ' + Dt.sbNumeral(s) : res === 'Missed playoffs' ? 'Missed playoffs' : res === 'In progress' ? 'In progress' : res.replace('Lost ', 'Lost ').replace('conference title game', Dt.team(tid).conf + ' title').replace('Super Bowl', 'SB').replace('Wild Card Round', 'Wild Card').replace('Divisional Round', 'Divisional');
    return { s, rec, place, res, champ, short, kind: champ ? 'gold' : res === 'In progress' ? 'now' : 'out' };
  }).filter(Boolean);
  const tm = Dt.team(tid);
  // approved round 6 (team-history A): the year in Display, the record in Stats, the finish in Meta, the result in the badge pill (gold for a title)
  return html`<div class="sec">${UI.secHead('Season by season')}<div class="list">${rows.map(r => html`<a class="row tap hs-r" data-go="#/scores?s=${r.s}&t=2&w=1"><b class="hs-y">${r.s}</b>
      <div class="row-main"><div class="hs-rec">${r.rec.str}</div><div class="row-sub">${fmt.ord(r.place)} in the ${tm.div}</div></div>
      <span class="badge hs-${r.kind}">${r.kind === 'gold' ? icon('trophy', 'xs') : ''}${r.short}</span></a>`)}</div></div>
    ${rivals(tid)}
    <div class="pad mt20"><a class="card pad-all tap flex gap12" data-go="#/franchise/${tid}">${icon('book')}<div class="grow"><div class="h4">${tm.name} franchise history</div><div class="meta mt4">Titles, legends, Hall of Famers and all-time records</div></div>${icon('chev', 'sm')}</a></div>`;
}

/* ------------------------------------------------------------------ stadium */
function stadium(tid) {
  const tm = Dt.team(tid), v = tm.venue || {};
  const next = Dt.D.games.find(g => g.h === tid && g.ts > time.now() && g.st === 'pre' && Dt.scheduleVisible(g));
  // approved round 6 (team-stadium v2 A): name in Display caps, surface and roof as two small tiles, the schedule game row, system link rows
  return html`<div class="pad mt16 sd">${v.img ? html`<div class="sd-img">${UI.img(v.img, v.name)}</div>` : ''}
      <div class="sd-name">${v.name || 'Home stadium'}</div><div class="sd-city">${[v.city, v.state].filter(Boolean).join(', ')}</div>
      ${v.grass != null || v.indoor != null ? html`<div class="ps-row sc-2 sd-facts">${v.grass != null ? html`<div><b>${v.grass ? 'GRASS' : 'TURF'}</b><span>Surface</span></div>` : ''}${v.indoor != null ? html`<div><b>${v.indoor ? 'DOME' : 'OPEN AIR'}</b><span>Roof</span></div>` : ''}</div>` : ''}</div>
    ${next ? html`<div class="sec">${UI.secHead('Next home game')}<div class="list">${UI.gameRow(next, tid)}</div></div>` : ''}
    <div class="sec"><div class="list">
      ${UI.row({ left: icon('map'), title: 'Stadium guide', sub: 'Seating, gates, food, parking', go: `#/stadium/${tid}` })}
      ${UI.row({ left: icon('ticket'), title: 'Tickets', sub: next ? `${Dt.team(next.a).name} at ${tm.name}` : 'Home games', go: next ? `#/tickets/${next.id}` : '#/tickets' })}
      ${UI.row({ left: icon('plane'), title: 'Plan a road trip', sub: 'Travel and hotels', go: next ? `#/trip/${next.id}` : '#/stadiums' })}
      ${UI.row({ left: icon('bag'), title: `${tm.name} shop`, sub: 'Jerseys, hats and gear', go: `#/shop/${tid}` })}
    </div></div>`;
}

/* ------------------------------------------------------------------ the team page
   One page for every team. The Teams tab shows it for your team (or whichever you pick in the switcher);
   #/team/:id shows the same page pushed from anywhere else. Both have the picker for all 32. */
function teamBody(tid, page, s, extra) {
  const tm = Dt.team(tid);
  // a link or state that names a tab group (?tab=more) opens its first view instead of a blank body
  if (VIEWS[page.state.tab]) page.state.tab = page.state.tab === 'more' ? (page.state.lastMore || 'moves') : VIEWS[page.state.tab][0].k;
  const tab = page.state.tab;
  const body = {
    overview: () => html`${overview(tid, s)}${extra || ''}`, schedule: () => schedule(tid, page), roster: () => roster(tid, page), depth: () => depthChart(tid, page),
    stats: () => stats(tid, s), injuries: () => injuries(tid, page), moves: () => moves(tid), cap: () => cap(tid), draft: () => draft(tid, page),
    history: () => history(tid), stadium: () => stadium(tid),
  }[tab] || (() => '');
  const views = VIEWS[tabOf(tab)];
  return html`${hero(tid)}<div class="sticky-sub tm-tabs">${UI.tabs(TABS, tabOf(tab), 'tm-tab')}</div>
    ${views ? html`<div class="tm-views mt12">${UI.chips(views, tab, 'tm-view')}</div>` : ''}<div class="tm-body" style="${raw(tv(tm))}">${body()}</div>`;
}
function teamMount(el, page) {
  const inp = el.querySelector('.tm-search');
  if (inp) {
    const filt = () => {
      const q = inp.value.trim().toLowerCase(); page.state.q = inp.value;
      el.querySelectorAll('.tm-pl').forEach(r => { r.style.display = !q || r.dataset.name.includes(q) ? '' : 'none'; });
      el.querySelectorAll('.tm-group').forEach(g => { g.style.display = [...g.querySelectorAll('.tm-pl')].some(r => r.style.display !== 'none') ? '' : 'none'; });
    };
    inp.addEventListener('input', filt); if (inp.value) filt();
  }
  const on = el.querySelector('.tm-tabs .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  const sw = el.querySelector('.tm-sw.on'); if (sw) sw.scrollIntoView({ inline: 'center', block: 'nearest' });
}
/* the switcher: your teams first, then every other team by division, with "All 32" opening the full picker */
function switcher(sel, act) {
  const mine = store.p.teams.filter(id => Dt.team(id));
  const prim = store.p.primary && Dt.team(store.p.primary);
  const rest = Dt.D.teams.filter(t => !mine.includes(t.id)).sort((a, b) => (prim && (divKey(b) === divKey(prim)) - (divKey(a) === divKey(prim))) || divKey(a).localeCompare(divKey(b)) || a.name.localeCompare(b.name)).map(t => t.id);
  const chip = id => { const t = Dt.team(id); return html`<button class="tm-sw ${id === sel ? 'on' : ''} ${mine.includes(id) ? '' : 'tm-sw-other'}" data-act="${act}" data-arg="${id}" style="${raw(tv(t))}" aria-label="${t.full}">${id === sel ? html`<img class="logo sm" src="${t.logoDark || t.logo}" alt="${t.abbr}">` : UI.logo(id, 'sm')}<span>${short(t)}</span>${id === store.p.primary ? html`<i class="tm-star">${icon('star', 'xs')}</i>` : ''}</button>`; };
  return html`<div class="tm-picker"><button class="tm-sw tm-sw-all" data-act="tm-all" data-arg="${act}" aria-label="All 32 teams">${icon('grid', 'sm')}<span>All 32</span></button>
    <div class="tm-switch">${mine.map(chip)}${mine.length ? html`<i class="tm-sw-div" aria-hidden="true"></i>` : ''}${rest.map(chip)}</div></div>`;
}
A['tm-all'] = (el, ev, act) => {
  const mine = store.p.teams;
  App.sheet({ title: 'Jump to a team', full: true, html: html`${['AFC', 'NFC'].map(cf => CONF_DIVS.filter(d => d.startsWith(cf)).map(d => html`<div class="tm-div"><div class="tm-div-h">${d}</div>
    <div class="ttiles tm-jump">${Dt.D.teams.filter(t => divKey(t) === d).map(t => UI.teamTile(t.id, { act, on: t.id === store.p.primary, badge: mine.includes(t.id) && t.id !== store.p.primary ? 'star' : '' }))}</div></div>`))}` });
};
// switching inside the Teams tab keeps you on the same section (roster → roster), so comparing teams is quick
A['tm-sel'] = (el, ev, id) => { App.closeSheet && App.closeSheet(true); App.store.tmp.teamSel = id; const p = App.current(); App.refresh(p); p.el.scrollTo({ top: 0 }); };
A['tm-go'] = (el, ev, id) => { App.closeSheet && App.closeSheet(true); const p = App.current(); App.go(`#/team/${id}${p.state && p.state.tab && p.state.tab !== 'overview' ? '?tab=' + p.state.tab : ''}`, { replace: true, instant: true }); };

App.route('team/:id', (params, query, page) => {
  const tm = Dt.team(params.id);
  if (!tm) return { title: 'Team', html: UI.empty('teams', 'Team not found') };
  page.state = page.state || { tab: query.tab || 'overview' };
  const s = nowS();
  return Dt.ensureBox(s).then(() => ({
    title: tm.full,
    right: html`<button class="icon-btn" data-go="#/search" aria-label="Search">${icon('search')}</button>`,
    html: html`${switcher(tm.id, 'tm-go')}<div class="mt12">${teamBody(tm.id, page, s)}</div>`,
    mount: el => teamMount(el, page),
  }));
});
const pageState = () => { const p = App.current(); p.state = p.state || {}; return p; };
A['tm-tab'] = (el, ev, k) => {
  const p = pageState();
  // More reopens on whichever of its views you last looked at
  p.state.tab = k === 'more' ? (p.state.lastMore || 'moves') : k;
  tmScroll(p);
};
A['tm-view'] = (el, ev, k) => {
  const p = pageState(); p.state.tab = k;
  if (tabOf(k) === 'more') p.state.lastMore = k;
  tmScroll(p);
};
function tmScroll(p) {
  const sub = p.el.querySelector('.tm-tabs');
  const top = sub ? sub.offsetTop - 52 : 0;
  App.refresh(p);
  setTimeout(() => { if (p.el.scrollTop > top) p.el.scrollTop = top; }, 30);
}
A['tm-season'] = (el, ev, s) => { const p = pageState(); p.state.season = +s; App.refresh(p); };
A['tm-season-sheet'] = (el, ev, list) => {
  // the season chip's sheet, for the schedule (state.season) and the draft (state.dy, data-key)
  const key = el.dataset.key || 'season', cur = +el.textContent.trim().slice(0, 4);
  App.sheet({ title: key === 'dy' ? 'Draft class' : 'Season', html: html`<div class="list">${list.split(',').map(s => UI.row({ title: key === 'dy' ? `${s} draft class` : `${s} season`, sub: key === 'dy' ? '' : +s === 2026 ? 'In progress' : `Super Bowl ${Dt.sbNumeral(+s)}`, act: 'tm-season-pick', arg: `${key}:${s}`, right: +s === cur ? icon('check', 'sm accent') : '' }))}</div>` });
};
A['tm-season-pick'] = (el, ev, arg) => { const [key, s] = arg.split(':'); App.closeSheet(); const p = pageState(); p.state[key] = +s; App.refresh(p); };
A['tm-scat'] = (el, ev, k) => { statsCat = k; App.refresh(pageState()); };
A['tm-inj-team'] = (el, ev, k) => { const p = pageState(); p.state.injT = k; App.refresh(p); };
A['tm-pre'] = () => { const p = pageState(); p.state.pre = !p.state.pre; App.refresh(p); };
A['tm-sort'] = (el, ev, k) => { const p = pageState(); p.state.sort = k; App.refresh(p); };
A['tm-form'] = (el, ev, i) => { const p = pageState(); p.state.form = +i; App.refresh(p); };
A['tm-deep'] = () => { store.set({ depth: 3 }); App.toast({ title: 'Advanced stats on', body: 'Change depth any time in Settings.', icon: 'chart' }); App.refresh(); };

/* ------------------------------------------------------------------ teams (tab root) */
function suggestions() {
  const mine = store.p.teams;
  const prim = store.p.primary && Dt.team(store.p.primary);
  let pool = [];
  if (prim) pool = Dt.D.teams.filter(t => divKey(t) === divKey(prim) && !mine.includes(t.id)).map(t => ({ t, why: 'Division rival' }));
  const loc = Dt.marketTeams((Dt.MARKETS.find(m => m[0] === store.p.location.city) || [])[0] || '').filter(id => !mine.includes(id)).map(id => ({ t: Dt.team(id), why: 'Near you' }));
  pool = loc.concat(pool).slice(0, 4);
  if (!pool.length) return '';
  // you-follow B (approved 2026-11-07): Sans team name, one squared "+ Follow" chip that turns ink "Following"; the row opens the team
  return html`<div class="sec">${UI.secHead('Teams to follow')}<div class="list">${pool.map(x => { const on = store.p.teams.includes(x.t.id);
    return UI.row({ left: UI.logo(x.t.id, 'md'), title: x.t.name, sub: `${x.why} · ${Dt.record(x.t.id, nowS()).str}`, go: `#/team/${x.t.id}`, chev: false, cls: 'r-sans',
      right: html`<button class="sc-season yf-chip ${on ? 'on' : ''}" data-act="follow" data-arg="team:${x.t.id}">${icon(on ? 'check' : 'plus', 'xs')}${on ? 'Following' : 'Follow'}</button>` }); })}</div></div>`;
}
App.route('teams', (params, query, page) => {
  const s = nowS();
  page.state = page.state || { tab: 'overview' };
  return Dt.ensureBox(s).then(() => {
    const mine = store.p.teams.filter(id => Dt.team(id));
    if (!mine.length && !Dt.team(App.store.tmp.teamSel)) {
      return { title: 'Teams', big: true, right: UI.headRight(), html: html`
        <div class="pad mt8"><div class="tm-intro"><div class="h2">Who's your team?</div>
          <div class="meta mt6">Pick one team to build Home, scores and alerts around. You can follow as many others as you like after that.</div>
          <button class="btn primary mt16" data-act="tm-quiz-open">${icon('sparkle', 'sm')} Help me pick a team</button></div></div>
        <div class="sec">${allGrid()}</div>` };
    }
    const sel = Dt.team(App.store.tmp.teamSel) ? App.store.tmp.teamSel : (mine.includes(store.p.primary) ? store.p.primary : mine[0]);
    const tm = Dt.team(sel);
    // players you follow and teams to follow are about you, not this team: they live on You
    const extra = html`
      ${mine.includes(sel) && mine.length > 1 && store.p.primary !== sel ? html`<div class="pad mt20"><button class="btn ghost block" data-act="tm-primary" data-arg="${sel}">${icon('star', 'sm')} Make the ${tm.name} my team instead</button></div>` : ''}`;
    return {
      title: 'Teams', big: true, right: UI.headRight(),
      html: html`${switcher(sel, 'tm-sel')}<div class="mt12">${teamBody(sel, page, s, extra)}</div>`,
      mount: el => teamMount(el, page),
    };
  });
});
A['tm-primary'] = (el, ev, id) => App.setPrimary(id);

App.route('teams/all', () => ({
  title: 'All teams',
  html: html`<div class="list mt8">${UI.row({ left: html`<span class="ic-tile">${icon('sparkle', 'sm')}</span>`, title: 'Not sure who to follow?', sub: 'Four quick questions and we\'ll match you', act: 'tm-quiz-open', chev: true })}</div>
    <div class="sec">${allGrid()}</div>`,
}));
App.heroCol = heroCol;
App.teamParts = { overview, schedule, statTiles, stats, rivals, history, stadium, cap, draft, allSeasons, divPlace, depthChart, hero, switcher, prCard, suggestions, leaders, injuries, divMini, rankGroups, rankList, rankTop, rankOf };
})();
