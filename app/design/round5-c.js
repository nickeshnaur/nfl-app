/* Approvals round 5 (molecules), batch c: cards keyed by id in window.R5_CARDS, picked up by round5.js.
   Current is the component as the app draws it (its own builder where one is exported, else the screen in a phone).
   Proposed is built only from the locked atoms (atoms.css), the text roles (r-* from roles.css), controls option A,
   .badge and team colours, through the shared lockups L1 to L5 below. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const { S, esc, team, phone, none, C } = DSApprovals.h;
const { icon, fmt, store, time } = App, UI = App.UI, Dt = App.data;

/* ------------------------------------------------------------------ helpers */
const V = (label, where, inner) => `<div class="r5c-v"><div class="r5c-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r5c-vb">${inner}</div></div>`;
/** a phone-width piece of page, on the page background */
const F = (inner, cls = '') => `<div class="r5c-f ${cls}">${inner}</div>`;
const card = (inner, cls = '') => `<div class="r5c-card ${cls}">${inner}</div>`;
const tm = () => C().tm;
const s4 = () => Dt.seasonForStats();
const prim = t => (App.teamRoles(t) || {}).primary || t.color;
const tint = t => (App.teamRoles(t) || {}).tint || 'var(--surface-2)';
const grad = t => { const g = (App.teamRoles(t) || {}).g; return g ? `linear-gradient(135deg,${g[0]},${g[1]})` : prim(t); };
const shade = (t, k) => (((App.PALETTE || {})[t.abbr] || {}).sh || {})[k] || prim(t);
const lg = (id, cls = 'sm') => S(UI.logo(id, cls));
const pid = p => p && (p.id || p.pid);
const rec = tid => Dt.record(tid, s4()).str;
const qb = tid => { const r = Dt.roster(tid) || []; return r.find(p => p.pos === 'QB') || r[0] || {}; };
const opp = () => team(C().oppId) || team(C().gh.id === tm().id ? C().ga.id : C().gh.id);
const eb = t => `<div class="r5c-eb">${t}</div>`;
const chev = () => S(icon('chev', 'sm chev'));
/** the app has no minus icon: the plus icon's stroke, one line */
const MINUS = '<svg class="ico sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>';
const live = () => C().G.live || Dt.liveGames()[0];
const nextG = () => C().mine || Dt.nextGame(tm().id);

/* ------------------------------------------------------------------ the shared lockups (identical in every batch) */
/** L1 team-score line: logo S24, tricode (Display), possession dot, score (Display) right; the loser at 60% when final */
function L1(tid, sc, o = {}) {
  const t = team(tid);
  return `<div class="lk-l1${o.lost ? ' lost' : ''}">${o.seed != null ? `<span class="lk-seed r-stat-number">${o.seed}</span>` : ''}${lg(tid, 'sm')}<span class="lk-tri r-tricode">${t.abbr}</span>${o.poss ? '<i class="lk-poss" aria-label="Has the ball"></i>' : ''}<span class="lk-sc r-score">${sc == null ? '' : sc}</span></div>`;
}
/** L2 team row: logo M32, team name (Display), record (Stats medium, Meta size) */
function L2(tid, o = {}) {
  const t = team(tid);
  return `<div class="lk-l2">${lg(tid, 'md')}<div class="lk-l2t"><span class="lk-nm r-team-name">${esc(o.name || t.name)}</span>${o.rec === false ? '' : `<span class="lk-rec"><span class="r-record">${esc(o.rec || rec(tid))}</span>${o.more ? `<span class="lk-more"> · ${o.more}</span>` : ''}</span>`}</div></div>`;
}
/** L3 player line: headshot S32 or M44, name (Sans bold), meta "POS · TEAM" (Sans medium, text-2) */
function L3(id, o = {}) {
  const p = Dt.player(id) || {}, t = team(o.tid || p.t);
  const meta = o.meta || [p.pos, t && t.abbr].filter(Boolean).join(' · ');
  return `<div class="lk-l3${o.m ? ' m' : ''}">${S(UI.hs(id, o.m ? '' : 'sm'))}<div class="lk-l3t"><span class="lk-pn r-player-name">${esc(o.name || p.n || '')}</span><span class="lk-meta">${esc(meta)}</span></div></div>`;
}
/** L4 stat pair: value (Stats bold) over a Meta label */
const L4 = (v, l, cls = '') => `<div class="lk-l4 r ${cls}"><b class="r-stat-number">${v}</b>${l ? `<span>${l}</span>` : ''}</div>`;
/** L5 status: Live (with the dot) solid; Final, kickoff and Bye soft neutral */
function L5(g) {
  if (g === 'bye') return '<span class="badge">Bye</span>';
  const sc = Dt.score(g);
  if (sc.st === 'live') return `<span class="badge live">${esc(sc.label)}</span>`;
  if (sc.st === 'post') return `<span class="badge">${esc(sc.label || 'Final')}</span>`;
  return `<span class="badge">${esc(fmt.time(g.ts))}</span>`;
}

/* ================================================================== cap-table */
R['cap-table'] = { id: 'cap-table', v: 1, name: 'Salary cap',
  target: 'offseason.js cap route (payroll card, Top deals rows) · teams.js cap()',
  ctx: ['cap', '.card'],
  changes: ['The payroll card lists five players as "Patrick Mahomes QB", the position run into the name in a dim span. Each becomes an L3 player line (headshot S32, name, "QB · thru 2033") with the salary as an L4 value.',
    'Change team and Full team cap are xs ghost buttons at 28px. They become squared S32 secondary buttons (controls option A).',
    'Salaries are three different faces today (.num, .num b, .big-num). Every salary is Stats bold; only the payroll total stays Display, as the card\'s one moment number.',
    'Top deals rows already read as L3 ("QB · KC · signed thru 2033"); they keep that, with the value as L4 so it lines up with the payroll card.'],
  current: () => phone('cap'),
  proposed: () => {
    const t = tm(), list = Object.entries(Dt.D.players).filter(([, x]) => x.sal).map(([id, x]) => ({ id, ...x }));
    const mine = list.filter(x => x.t === t.id).sort((a, b) => b.sal - a.sal);
    const pay = Dt.D.teams.map(x => ({ id: x.id, sum: list.filter(p => p.t === x.id).reduce((a, p) => a + p.sal, 0) })).sort((a, b) => b.sum - a.sum);
    const rk = pay.findIndex(r => r.id === t.id) + 1;
    const top = list.slice().sort((a, b) => b.sal - a.sal).slice(0, 3);
    return V('Payroll card', 'logo M32 · eyebrow · Display total · L3 lines · S32 buttons', F(card(`<div class="r5c-row">${lg(t.id, 'md')}<div class="grow">${eb(`${esc(t.name)} payroll`)}<div class="r5c-big r-score">${fmt.money(mine.reduce((a, p) => a + p.sal, 0))}</div></div>${L4(fmt.ord(rk), 'in the NFL')}</div>
      <div class="r5c-lines">${mine.slice(0, 5).map(x => `<div class="r5c-line">${L3(x.id, { meta: `${x.pos} · thru ${x.thru || '—'}` })}${L4(fmt.money(x.sal))}</div>`).join('')}</div>
      <div class="r5c-row gap8 mt12"><button class="btn sm">Change team</button><button class="btn sm">Full team cap</button></div>`)))
      + V('Top deals row', 'UI.row 56 · L3 · L4', F(`<div class="list r5c-list">${top.map(x => `<div class="row static">${L3(x.id, { meta: `${x.pos} · ${team(x.t).abbr} · thru ${x.thru || '—'}` })}<div class="grow"></div>${L4(fmt.money(x.sal))}</div>`).join('')}</div>`));
  } };

/* ================================================================== pr-board */
R['pr-board'] = { id: 'pr-board', v: 2, name: 'Power rankings board',
  target: 'stats.js prBoard() prRow() · .sc-board .sc-lead.pr-row',
  ctx: ['stats', '.sc-board'],
  changes: ['From your note: the pink row was hard to read. Your team\'s row no longer sits on a tint. Every row has the same surface, and yours is marked by a 4px bar in your team\'s primary on its leading edge, with its rank in the text colour (the others are text-2).',
    'Contrast on your row is now the same as on every row, measured on the rendered page. Light theme: name and rank 19.4:1, stats line 7.8:1. Dark theme: 16.7:1 and 7.8:1. Every text on the row passes AA; the old pink tint is gone. The Chiefs bar is 4.7:1 (light) and 3.9:1 (dark), which passes the 3:1 for non-text marks. Other teams\' bars wait for the accessibility audit, as agreed.',
    'One thing this check found that v1 hid: the neutral "–" move pill (no change this week) is 2.7:1 in the light theme, under AA. That is the approved pill atom itself, so the fix belongs in the atom (its text colour) and is flagged for the build, not patched here. Use the theme switch to see the dark board.',
    'Unchanged from v1: an L2 team row (logo M32, nickname in Display, record in Stats medium), "4-0 · +58 pts · W4" in Stats medium at Meta size, the rank in Stats bold, and the approved soft move pill.'],
  current: () => V('As the app draws it', 'App.statsParts.prBoard(season)', `<div class="r5c-real">${S(App.statsParts.prBoard(s4())) || none('No rankings this week.')}</div>`),
  proposed: () => {
    const pr = Dt.powerRank(s4()); if (!pr) return none('No rankings this week.');
    const list = pr.list.slice(0, 5); const me = pr.list.find(r => r.tid === tm().id);
    if (me && !list.includes(me)) list[4] = me;
    const board = () => F(`<div class="r5c-card flush">${list.map(r => `<div class="r5c-prow${r.tid === tm().id ? ' mine' : ''}" style="--tc:${prim(team(r.tid))}"><span class="r5c-rk r-stat-number">${r.rk}</span>${L2(r.tid, { rec: r.rec, more: `<span class="r5c-stm">${r.diff > 0 ? '+' : ''}${r.diff} pts · ${esc(r.streak)}</span>` })}<div class="grow"></div>${S(UI.prMove(r.mv))}</div>`).join('')}</div>`);
    return V('Board', 'one surface · team bar on your row · rank in the text colour', board());
  } };

/* ================================================================== leaders-board */
const leadList = (stat, n, grp) => { const s = C().boxS || s4(); if (!App.NFL.d['box-' + s] || !App.PS) return null; return { s, stt: App.PS.STAT[stat], list: App.PS.ranked(s, stat, { grp: grp || null }).slice(0, n) }; };
R['leaders-board'] = { id: 'leaders-board', v: 1, name: 'League leaders',
  target: 'stats.js leaders route (season, stat and position chips, .tbl) · board() leadRow()',
  ctx: ['leaders', '.tbl'],
  changes: ['Three rows of chips (season, stat, position) stack above the list. The stat stays a chip row; season and position fold into two squared S32 select chips on one line, so the list starts higher.',
    'The table has a Team column of Display tricodes beside each name and a red "PASS YDS" header. The team moves into the L3 meta ("QB · HOU · 5 G"), the column goes, and the header is a text-2 eyebrow.',
    'Rank numbers are Sans; they become Stats bold in text-2, the same as power rankings.',
    'Values are already Stats bold; they stay, right-aligned, as L4.'],
  current: () => phone('leaders'),
  proposed: () => {
    const L = leadList('passYds', 6); if (!L) return none('Box scores are still loading; open the card again in a moment.');
    return V('Filters', 'stat chips · season and position as select chips', F(`<div class="chips r5c-chips">${S(UI.chips(['Pass yds', 'Pass TD', 'Rating', 'Rush yds', 'Rec yds'].map((l, i) => ({ k: String(i), l })), '0', ''))}</div>
      <div class="r5c-row gap8 mt8"><button class="chip">${L.s}${S(icon('down', 'xs'))}</button><button class="chip">All positions${S(icon('down', 'xs'))}</button></div>`))
      + V('List', 'rank Stats bold · L3 with team in meta · L4 value', F(`<div class="r5c-card flush"><div class="r5c-th"><span>Player</span><span>${esc(L.stt.s)}</span></div>${L.list.map((x, i) => { const p = Dt.player(x.L.pid) || {}; return `<div class="r5c-prow"><span class="r5c-rk r-stat-number">${i + 1}</span>${L3(x.L.pid, { tid: x.L.tid, name: p.n || x.L.n, meta: `${p.pos || x.L.grp} · ${team(x.L.tid).abbr} · ${x.L.gp} G` })}<div class="grow"></div>${L4(App.PS.fmtStat(x.v, L.stt))}</div>`; }).join('')}</div>`));
  } };

/* ================================================================== compare */
R['compare'] = { id: 'compare', v: 1, name: 'Player/team compare',
  target: 'stats.js comparePlayers() compareTeams() · .cmp-head .cmp-vs · UI.cmp()',
  ctx: ['compare', '.cmp-head'],
  changes: ['The empty pickers are dashed circles, and "VS" between them is Display at a small size. The pickers become squared tiles (radius 10, a line, a plus and a Sans bold "Pick a player"), and "vs" is a Sans bold caps eyebrow.',
    'Once both are picked, each side is an L3 player line at M44, stacked and centred, so the names read the same as everywhere else.',
    'The meters use App.readable(), which can step to a darker shade. They become the approved 6px meter in each team\'s own primary; when both teams share a colour the right side takes text-2.',
    'The stat values stay Stats bold; the losing side drops to text-2 (not a lighter opacity), so it still passes AA.'],
  current: () => {
    const a = qb(tm().id), b = qb(opp().id);
    return V('Picker, empty', 'compare route', phone('compare'))
      + V('Head-to-head rows', 'UI.cmp(label, l, r, lc, rc)', F(card(['Pass yards', 'Touchdowns', 'Rating'].map((l, i) => S(UI.cmp(l, [1430, 11, 104.2][i], [1288, 9, 98.6][i], App.readable(tm()), App.readable(opp())))).join('')) + `<div class="r5c-note">Sample values on ${esc(a.n || 'QB')} and ${esc(b.n || 'QB')}.</div>`));
  },
  proposed: () => {
    const a = qb(tm().id), b = qb(opp().id), ca = prim(tm()), cb0 = prim(opp()), cb = cb0 === ca ? 'var(--text-2)' : cb0;
    const row = (l, x, y) => { const mx = Math.max(x, y) || 1; return `<div class="r5c-cmp"><div class="r5c-cv${x >= y ? '' : ' lo'}"><b class="r-stat-number">${x}</b><div class="meter"><i style="width:${x / mx * 100}%;background:${ca};margin-left:auto"></i></div></div><span class="r5c-cl">${l}</span><div class="r5c-cv r${y >= x ? '' : ' lo'}"><b class="r-stat-number">${y}</b><div class="meter"><i style="width:${y / mx * 100}%;background:${cb}"></i></div></div></div>`; };
    return V('Picker, empty', 'squared tiles · Sans caps "vs"', F(`<div class="r5c-vs"><button class="r5c-pick">${S(icon('plus'))}<span>Pick a player</span></button><span class="r5c-eb">vs</span><button class="r5c-pick">${S(icon('plus'))}<span>Pick a player</span></button></div>`))
      + V('Picked', 'L3 at M44 · 6px meters in each primary · Stats bold', F(card(`<div class="r5c-vs">${L3(pid(a), { m: true })}<span class="r5c-eb">vs</span>${L3(pid(b), { m: true })}</div><div class="mt12">${row('Pass yards', 1430, 1288)}${row('Touchdowns', 11, 9)}${row('Rating', 104.2, 98.6)}</div>`, 'r5c-cmpc')));
  } };

/* ================================================================== poll-card */
const bestPoll = () => Dt.standings(s4()).all.slice().sort((a, b) => b.pct - a.pct || b.diff - a.diff).slice(0, 4).map(r => r.tid || r.t.id);
R['poll-card'] = { id: 'poll-card', v: 1, name: 'Poll card',
  target: 'community.js pollCard() · polls route · .lr-opt .cm-res',
  ctx: ['polls', '.card'],
  changes: ['The page says its name twice: "Fan polls" in the header, then a 28px "Fan polls" heading. The heading goes; the one-line intro stays.',
    'Options are outlined text buttons. When the options are teams or players, each becomes a squared L48 option with its logo S24 or headshot S32 leading, so you vote for a team, not a string.',
    'Results draw their own fill behind the text (.cm-res). They become a label over the approved 6px meter in the team\'s own primary (text colour for plain options), with the % as Stats bold. Your pick gets a check, not a different fill.',
    'The vote count ("12,407 votes") is Stats medium at Meta size.'],
  current: () => phone('polls'),
  proposed: () => {
    const ids = bestPoll(), base = [41, 27, 19, 13], tot = 12407;
    const q = `<div class="r5c-q">Best team in football right now?</div>`;
    return V('Before you vote', 'squared L48 options with a logo', F(card(`${q}<div class="r5c-opts mt12">${ids.map(id => `<button class="r5c-opt">${lg(id, 'sm')}<span>${esc(team(id).full)}</span></button>`).join('')}</div><div class="r5c-foot"><span class="r-record">${fmt.n(tot)}</span> votes · vote to see results</div>`)))
      + V('After you vote', 'label · 6px meter in the team primary · % Stats bold', F(card(`${q}<div class="r5c-res mt12">${ids.map((id, i) => `<div class="r5c-ri"><div class="r5c-row between">${lg(id, 'xs')}<span class="grow r5c-rl">${esc(team(id).full)}${i === 1 ? ` ${S(icon('check', 'xs'))}` : ''}</span><b class="r-stat-number">${base[i]}%</b></div><div class="meter mt6"><i style="width:${base[i]}%;background:${prim(team(id))}"></i></div></div>`).join('')}</div><div class="r5c-foot"><span class="r-record">${fmt.n(tot + 1)}</span> votes</div>`)));
  } };

/* ================================================================== community-fan */
R['community-fan'] = { id: 'community-fan', v: 1, name: 'Community fan level card',
  target: 'community.js fanCard() · .cm-fan · community route top',
  ctx: ['community', '.cm-fan'],
  changes: ['Community opens with a second fan card that is not the one you approved on You: a red slab with a Display initial, a thick bar, and round badge and "more" buttons (round pressables break the squared rule).',
    'One fan card in the app. Community gets a 56px summary row instead: your avatar, the level as a soft .badge, points as an L4 pair, the approved 6px meter in your team\'s primary, and a chevron to the You fan card.',
    'Badges are not repeated here; they live on the You fan card.'],
  current: () => phone('community'),
  proposed: () => {
    const t = tm(), pts = 120, pct = 60;
    return V('Summary row', 'avatar M32 · level badge · L4 points · 6px meter · to You', F(`<div class="r5c-card flush"><div class="row tap r5c-fan"><span class="av" style="background:${prim(t)}">${lg(t.id, '')}</span><div class="row-main"><div class="r5c-row gap8 r5c-nw"><span class="row-title">Fan level</span><span class="badge">Rookie</span></div><div class="meter mt6"><i style="width:${pct}%;background:${prim(t)}"></i></div><div class="row-sub"><span class="r-record">80</span> points to Starter</div></div>${L4(pts, 'fan points')}${chev()}</div></div>`));
  } };

/* ================================================================== squad-chat */
const FR = { Maya: 'PHI', Jordan: 'DAL', Sam: 'KC', Priya: 'SF', Dev: 'DET' };
R['squad-chat'] = { id: 'squad-chat', v: 1, name: 'Squad chat',
  target: 'community.js squad/:id Huddle · .cm-msg .cm-bub .cm-bot .cm-sys',
  ctx: ['squad/sunday-crew', '.cm-chat'],
  changes: ['Game updates are a Sans string ("Game update · KC 30 – LV 27"). They become a small card: an L5 status pill and two L1 team-score lines, the loser at 60%.',
    'System lines ("Next up: Chiefs vs Chargers · Sunday, October 18") are centred grey Sans of mixed sizes. They become one Meta line with the date in the Date role.',
    'Each message: the avatar atom (initial on the friend\'s team colour, M32), the name in Sans bold over the time in Sans medium text-2, then the bubble. Today the name and time share one grey line.',
    'The reaction pills keep their emoji, as you chose. The quick takes are already squared chips; as is.'],
  current: () => phone('squad/sunday-crew'),
  proposed: () => {
    const g = Dt.D.games.filter(x => Dt.state(x) === 'post' && (x.h === tm().id || x.a === tm().id)).sort((a, b) => b.ts - a.ts)[0] || C().G.post;
    const sc = g && Dt.score(g);
    const av = n => `<span class="av" style="background:${prim(team(FR[n]) || tm())}">${n[0]}</span>`;
    const msg = (n, ago, body) => `<div class="r5c-msg">${av(n)}<div><div class="r5c-who"><b>${n}</b><span>${ago}</span></div><div class="r5c-bub">${body}</div></div></div>`;
    const n = nextG();
    return V('Huddle', 'avatar M32 · Sans bold name · Date-role time · bubble', F(`<div class="r5c-chat">
      ${g ? card(`<div class="r5c-row between">${eb('Game update')}${L5(g)}</div><div class="mt8">${L1(g.a, sc.as, { lost: sc.as < sc.hs })}${L1(g.h, sc.hs, { lost: sc.hs < sc.as })}</div>`, 'r5c-bot') : ''}
      ${msg('Maya', '3h ago', '<span class="r5c-emo">🔥🔥🔥</span>')}${msg('Jordan', '2h ago', 'Picks are in')}
      ${n ? `<div class="r5c-sys">Next up: ${esc(team(n.a).name)} at ${esc(team(n.h).name)} · <span class="r-date">${esc(fmt.dayLong(n.ts))}</span></div>` : ''}
      ${msg('Sam', '2h ago', 'Watch party at mine?')}</div>`));
  } };

/* ================================================================== pickem */
R['pickem'] = { id: 'pickem', v: 2, name: 'Pick\'em',
  target: 'community.js pickem route · pickRow() · .cm-pick',
  ctx: ['pickem', '.cards .card'],
  changes: ['From your note: the two teams sit side by side again, away on the left and home on the right with "at" between, as the current page does. Each side is a squared tile (pressable): logo L48 over the nickname in Display and the record in Stats medium, centred, so the longest nickname ("Buccaneers") fits without truncating.',
    'Your pick is a 2px ring in that team\'s own primary with a check disc in the corner, not a fill. The fan split sits under the tiles as one line in Meta ("44% of fans picked DEN").',
    'The header is the L5 status pill on the left and "Locks in 2d" in Meta on the right. After the final, each tile adds its score in Display under the record, the losing side drops to 60%, and the header adds a soft Right or Wrong pill.',
    'The stat tiles and the copy ("Free to play. 10 points for each correct pick") are unchanged.'],
  current: () => phone('pickem'),
  proposed: () => {
    const w = Dt.currentWeek(), now = time.now(), gs = (w && w.games) || [];
    const pre = gs.find(g => Dt.state(g, now) === 'pre') || gs[0], post = gs.find(g => Dt.state(g, now) === 'post');
    const tile = (g, tid, o = {}) => { const t = team(tid); return `<button class="r5c-pk${o.on ? ' on' : ''}${o.lost ? ' lost' : ''}" style="--tc:${prim(t)}">${o.on ? `<span class="r5c-ck">${S(icon('check', 'xs'))}</span>` : ''}${lg(tid, 'lg')}<span class="lk-nm r-team-name">${esc(t.name)}</span><span class="lk-rec"><span class="r-record">${esc(Dt.record(tid, g.s, g.ts - 1).str)}</span></span>${o.sc != null ? `<span class="r5c-pksc r-score">${o.sc}</span>` : ''}</button>`; };
    const pc = g => { const sc = Dt.score(g), fin = sc.st === 'post', wa = sc.as > sc.hs;
      return card(`<div class="r5c-row between">${L5(g)}${fin ? `<span class="badge ${wa ? 'win' : 'loss'}">${wa ? 'Right' : 'Wrong'}</span>` : `<span class="r5c-meta">Locks in ${esc(fmt.until(g.ts))}</span>`}</div>
        <div class="r5c-pks mt12">${tile(g, g.a, fin ? { on: true, sc: sc.as, lost: !wa } : { on: true })}<span class="r5c-at">at</span>${tile(g, g.h, fin ? { sc: sc.hs, lost: wa } : {})}</div>
        <div class="r5c-meta r5c-pkf">${fin ? `You picked ${team(g.a).abbr}` : `44% of fans picked ${team(g.a).abbr}`}</div>`); };
    return (pre ? V('Open', 'L5 kickoff · side-by-side tiles · ring for your pick', F(pc(pre))) : '') + (post ? V('Final', 'scores in Display · the loser at 60% · right or wrong pill', F(pc(post))) : '');
  } };

/* ================================================================== ticket-picker */
/** a seating chart the way box offices draw one: a rounded-rectangle bowl around the field, two levels of flat sections,
    sold-out sections pale, one accent (the home team's primary) for the section you picked */
const SEAT = {
  W: 340, H: 260, a: 72, b: 40, r: 14, // the inner edge of the lower level: half width, half height, corner radius
  levels: [{ base: 100, in: 0, out: 36, n: [5, 2, 2] }, { base: 300, in: 44, out: 84, n: [6, 3, 2] }], // n: sections per sideline, corner, end
};
function seatMap(home, sel, soldOut) {
  const { W, H, a, b, r } = SEAT, cx = W / 2, cy = H / 2, sx = a - r, sy = b - r;
  const Lc = d => Math.PI / 2 * (r + d); // a quarter corner at offset d
  // the perimeter, clockwise from the top-left end of the top sideline: sideline, corner, end, corner …
  const segs = d => [['h', -sx, sx, -1], ['c', -90, 0, sx, -sy], ['v', -sy, sy, 1], ['c', 0, 90, sx, sy], ['h', sx, -sx, 1], ['c', 90, 180, -sx, sy], ['v', sy, -sy, -1], ['c', 180, 270, -sx, -sy]];
  const at = (s, u, d) => { // a point u (0…1) along segment s, at offset d outside the inner edge
    if (s[0] === 'h') return [cx + s[1] + (s[2] - s[1]) * u, cy + s[3] * (b + d)];
    if (s[0] === 'v') return [cx + s[3] * (a + d), cy + s[1] + (s[2] - s[1]) * u];
    const t = (s[1] + (s[2] - s[1]) * u) * Math.PI / 180; return [cx + s[3] + Math.cos(t) * (r + d), cy + s[4] + Math.sin(t) * (r + d)];
  };
  const P = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" class="r5c-seat" role="img" aria-label="Seating chart, ${esc(home.name)} home field">`;
  SEAT.levels.forEach(L => {
    let no = L.base + 1;
    segs(0).forEach((sg, i) => {
      const n = sg[0] === 'c' ? L.n[1] : i % 4 === 0 ? L.n[0] : L.n[2], k = sg[0] === 'c' ? 6 : 1;
      for (let j = 0; j < n; j++, no++) {
        const u0 = j / n, u1 = (j + 1) / n, inner = [], outer = [];
        for (let q = 0; q <= k; q++) { const u = u0 + (u1 - u0) * q / k; inner.push(at(sg, u, L.in)); outer.push(at(sg, u, L.out)); }
        const pts = inner.concat(outer.reverse()), on = no === sel, out = soldOut.has(no);
        const [mx, my] = at(sg, (u0 + u1) / 2, (L.in + L.out) / 2);
        s += `<path d="M${pts.map(P).join('L')}Z" fill="${on ? prim(home) : out ? 'var(--surface-2)' : 'var(--line-2)'}" stroke="var(--surface)" stroke-width="2.5" stroke-linejoin="round"/>`;
        s += `<text x="${mx.toFixed(1)}" y="${(my + 3).toFixed(1)}" text-anchor="middle" class="r5c-seat-n${on ? ' on' : out ? ' out' : ''}">${no}</text>`;
      }
    });
  });
  // the field: flat turf, the end zones a shade deeper, yard lines every ten; no marks, no logos
  const fw = 2 * (a - 12), fh = 2 * (b - 12), fx = cx - fw / 2, fy = cy - fh / 2, ez = fw / 12;
  s += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="2" fill="#3f7d4f"/><rect x="${fx}" y="${fy}" width="${ez}" height="${fh}" fill="#356c44"/><rect x="${fx + fw - ez}" y="${fy}" width="${ez}" height="${fh}" fill="#356c44"/>`;
  for (let i = 1; i < 12; i++) s += `<line x1="${(fx + ez * i).toFixed(1)}" x2="${(fx + ez * i).toFixed(1)}" y1="${fy}" y2="${fy + fh}" stroke="#fff" stroke-opacity="${i === 1 || i === 11 ? .75 : i === 6 ? .5 : .2}"/>`;
  return s + '</svg>';
}
R['ticket-picker'] = { id: 'ticket-picker', v: 2, name: 'Ticket seat map',
  target: 'fanlife.js tickets/:gid bowlSvg() secPrice() · tickets list row (.fl-date) · .fl-qty',
  ctx: ['tickets/__NEXT__', '.fl-bowl'],
  changes: ['From your note: the stadium is redrawn as a plain seating chart, the kind a box office prints. The bowl follows the shape of a real stadium: straight sidelines, rounded corners and flat ends. There are two levels, the 100s and the 300s, with the concourse as a gap between them. Every section is a flat shape with its number in Stats bold.',
    'There is one accent. Available sections are one neutral (line-2), sold-out sections are pale (surface-2) with a lighter number, and the section you picked fills with the home team\'s primary and a white number. The v1 price bands are gone, so the map stops looking like a heat map; prices move to the legend line ("Lower from $140 · Upper from $85") and the section detail.',
    'The field is flat turf with slightly deeper end zones and the yard lines every ten yards: no gloss, no logos, no shadow.',
    'Unchanged from v1, which you liked: the L2 matchup header with the date and kickoff, the section detail (eyebrow, Stats bold price, squared stepper, L48 primary), and the tickets list row.'],
  current: () => { const g = nextG(); return g ? V('Seat map', `tickets/${g.id}`, phone(`tickets/${g.id}`)) + V('Tickets list', 'tickets route', phone('tickets')) : phone('tickets'); },
  proposed: () => {
    const g = nextG(); if (!g) return none('No upcoming game to sell.');
    const h = team(g.h), a = team(g.a), sel = 114, sold = new Set([103, 104, 116, 117, 121, 305, 306, 307, 320, 321, 326]);
    return V('Map', 'L2 header · two levels of flat sections · one accent for your section', F(`<div class="r5c-row between">${L2(a.id, { rec: false })}<span class="r5c-eb">at</span>${L2(h.id, { rec: false })}</div><div class="r5c-meta mt6"><span class="r-date">${esc(fmt.dayLong(g.ts))} · ${esc(fmt.time(g.ts))}</span></div>
      ${card(`${seatMap(h, sel, sold)}<div class="r5c-legend"><span><i style="background:var(--line-2)"></i>Available</span><span><i style="background:var(--surface-2);box-shadow:inset 0 0 0 1px var(--line)"></i>Sold out</span><span><i style="background:${prim(h)}"></i>Section ${sel}</span></div><div class="r5c-meta mt8 r5c-c">Lower from <b class="r-stat-number">$140</b> · Upper from <b class="r-stat-number">$85</b></div>`, 'mt12')}`))
      + V('Section detail', 'eyebrow · Stats bold price · squared stepper · L48 primary', F(card(`<div class="r5c-row between"><div>${eb('Lower level')}<div class="r5c-q mt4">Section ${sel}</div><div class="r5c-meta">Row 14 · seats together</div></div>${L4('$' + 210, 'each')}</div>
        <div class="r5c-row between mt16"><b class="r5c-lbl">Tickets</b><div class="r5c-step"><button class="btn sm sq" aria-label="One fewer">${MINUS}</button><b class="r-stat-number">2</b><button class="btn sm sq" aria-label="One more">${S(icon('plus', 'sm'))}</button></div></div>
        <div class="r5c-tot"><span>Total, all-in</span><b class="r-stat-number">$495.60</b></div><button class="btn primary l block mt12">Continue to checkout</button>`)))
      + V('Tickets list row', 'month eyebrow over Stats bold day · L4 price', F(`<div class="list r5c-list"><div class="row tap"><div class="r5c-date"><span>${esc(new Date(g.ts).toLocaleDateString('en-US', { month: 'short' }))}</span><b class="r-stat-number">${new Date(g.ts).getDate()}</b></div><div class="row-main"><div class="row-title">${esc(a.name)} at ${esc(h.name)}</div><div class="row-sub"><span class="r-date">${esc(fmt.weekday ? fmt.weekday(g.ts) : '')} ${esc(fmt.time(g.ts))}</span></div></div>${L4('$140', 'from')}${chev()}</div></div>`));
  } };

/* ================================================================== shop */
/** a football jersey drawn flat, the way a team store shows one: wide shoulders over short cap sleeves, a V neck in front
    and a round neck behind, sleeve stripes, side panels and seams in a shade of the body. The number is the Display face
    upright (block numerals, not italic), with an outline in the trim colour. kind: 'home' (team colour) or 'away' (white). */
let JN = 0;
/** the left half of the outline, neck to hem centre; the right half is its mirror, so the garment is always symmetrical */
const JL = [['M', 94, 14], ['C', 80, 16, 62, 20, 50, 26], ['C', 38, 32, 30, 42, 24, 56], ['L', 9, 98], ['L', 47, 112], ['C', 53, 106, 58, 100, 62, 95], ['C', 63, 140, 64, 190, 66, 238], ['L', 120, 238]];
const jMir = x => (240 - x);
function jOutline(back) {
  const f = n => +n.toFixed(1), L = JL.map(c => c[0] + c.slice(1).map(f).join(' ')).join(' ');
  // the right half: walk the left half backwards, mirrored (each curve's control points reversed)
  let R = ''; for (let i = JL.length - 1; i > 0; i--) { const c = JL[i], prev = JL[i - 1], end = [jMir(prev[prev.length - 2]), prev[prev.length - 1]];
    R += c[0] === 'C' ? ` C${f(jMir(c[3]))} ${c[4]} ${f(jMir(c[1]))} ${c[2]} ${f(end[0])} ${end[1]}` : ` L${f(end[0])} ${end[1]}`; }
  return L + R + (back ? ' Q120 30 94 14Z' : ' L120 50 L94 14Z');
}
function jersey(t, o = {}) {
  const id = 'r5cj' + (++JN), away = o.kind === 'away', back = !!o.back;
  const trim = t.alt && !/^#(000000|ffffff)$/i.test(t.alt) && t.alt.toLowerCase() !== t.color.toLowerCase() ? t.alt : (App.lum(t.color) > .4 ? '#111114' : '#ffffff');
  const body = away ? '#f7f7f8' : t.color, ink = away ? t.color : (App.lum(t.color) > .5 ? '#111114' : '#ffffff'), line = away ? t.color : trim;
  const out = jOutline(back), n = String(o.num == null ? 1 : o.num), name = (o.name || '').toUpperCase();
  // sleeve stripes run parallel to the sleeve hem, stepped up the sleeve
  const st = k => { const ux = .34, uy = -.94, x0 = 9 + ux * k, y0 = 98 + uy * k, dx = 38, dy = 14; return `M${(x0 - dx * .3).toFixed(1)} ${(y0 - dy * .3).toFixed(1)} L${(x0 + dx * 1.3).toFixed(1)} ${(y0 + dy * 1.3).toFixed(1)}`; };
  const stripes = [9, 16].map(st).join(' ');
  return `<svg viewBox="0 0 240 250" class="r5c-jsy" role="img" aria-label="${esc(t.name)} ${away ? 'away' : 'home'} jersey${name ? ', ' + esc(name) : ''}, number ${esc(n)}">
    <defs><clipPath id="${id}"><path d="${out}"/></clipPath></defs>
    <path d="${out}" fill="${body}"/>
    <g clip-path="url(#${id})">
      <path d="${stripes}" stroke="${line}" stroke-width="4" fill="none"/>
      <path d="${stripes}" stroke="${line}" stroke-width="4" fill="none" transform="translate(240 0) scale(-1 1)"/>
      <path d="M50 26 C56 50 60 72 62 95 M190 26 C184 50 180 72 178 95" stroke="#000" stroke-opacity="${away ? .16 : .18}" stroke-width="1" fill="none"/>
      ${back ? '' : `<text x="34" y="70" text-anchor="middle" class="r5c-jsy-tv" fill="${ink}" transform="rotate(-22 34 70)">${esc(n)}</text><text x="206" y="70" text-anchor="middle" class="r5c-jsy-tv" fill="${ink}" transform="rotate(22 206 70)">${esc(n)}</text>`}
    </g>
    ${back ? '' : `<path d="M94 14 Q120 22 146 14 L120 50Z" fill="${body}"/><path d="M94 14 Q120 22 146 14 L120 50Z" fill="#000" fill-opacity="${away ? .1 : .28}"/>`}
    <path d="${back ? 'M92 13 Q120 33 148 13' : 'M92 13 L120 51 L148 13'}" stroke="${line}" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    ${back && name ? `<text x="120" y="80" text-anchor="middle" class="r5c-jsy-nm" fill="${ink}" font-size="${Math.min(18, 170 / Math.max(4, name.length))}">${esc(name)}</text>` : ''}
    <text x="120" y="${back ? 186 : 176}" text-anchor="middle" class="r5c-jsy-no" fill="${ink}" stroke="${line}" font-size="${back ? 92 : 80}">${esc(n)}</text>
    <path d="${out}" fill="none" stroke="#000" stroke-opacity="${away ? .2 : .12}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
}
R['shop'] = { id: 'shop', v: 2, name: 'Shop + jersey',
  target: 'fanlife.js shop route · shop/:tid jerseySvg() · .fl-jwrap .fl-qty',
  ctx: ['shop', '.card'],
  changes: ['From your note: the jersey is redrawn from scratch as a real football jersey. Broad shoulders run into short cap sleeves, with a V neck in front and a round neck behind. It has two sleeve stripes in the trim colour, a darker inner collar behind the V, small TV numbers on the shoulders, and a faint armhole seam. It is flat: no gloss and no shadow, and the right half is a mirror of the left, so it is always symmetrical.',
    'The number is the Display face set upright, the block numerals a jersey uses (v1 used the italic), outlined in the team\'s trim colour. On the back, the name sits over the number in the same face.',
    'The builder hero shows the white away jersey on the team\'s sheet gradient: a team-colour jersey vanished into a gradient of the same colour. The jersey page shows the home jersey, back and front, on the surface.',
    'Unchanged from v1: team tiles (logo M32, nickname in Display in the text colour) and the squared S32 stepper.'],
  current: () => V('Shop', 'shop route', phone('shop')) + V('Jersey and quantity', `shop/${tm().id}`, phone(`shop/${tm().id}`)),
  proposed: () => {
    const t = tm();
    const ids = ['ARI', 'ATL', 'BAL', 'BUF'].map(ab => (Dt.D.teams.find(x => x.abbr === ab) || {}).id).filter(Boolean);
    return V('Jersey builder hero', 'sheet gradient · white away jersey, back · white secondary', F(`<div class="r5c-hero" style="background:${grad(t)}"><div class="grow">${eb('Jersey builder')}<div class="r5c-hero-h r-team-name">Your name.<br>Your number.</div><button class="btn white sm mt12">Build a ${esc(t.name)} jersey</button></div><div class="r5c-jer">${jersey(t, { kind: 'away', back: true, name: 'Fan', num: 1 })}</div></div>`))
      + V('Jersey', 'home jersey, back and front, on the surface', F(card(`<div class="r5c-jsys"><div>${jersey(t, { back: true, name: 'Mahomes', num: 15 })}<span class="r5c-meta">Back</span></div><div>${jersey(t, { num: 15 })}<span class="r5c-meta">Front</span></div></div>`)))
      + V('Other teams', 'the same drawing in each team\'s own colours', F(`<div class="r5c-jsys four">${ids.map(id => `<div>${jersey(team(id), { num: 1 })}</div>`).join('')}</div>`))
      + V('Team tiles', 'logo M32 · Display nickname in the text colour', F(`<div class="r5c-tiles">${ids.map(id => `<div class="r5c-tile">${lg(id, 'md')}<span class="r-team-name">${esc(team(id).name)}</span></div>`).join('')}</div>`))
      + V('Quantity', 'squared S32 stepper', F(card(`<div class="r5c-row between"><b class="r5c-lbl">Quantity</b><div class="r5c-step"><button class="btn sm sq" aria-label="One fewer">${MINUS}</button><b class="r-stat-number">1</b><button class="btn sm sq" aria-label="One more">${S(icon('plus', 'sm'))}</button></div></div>`)));
  } };

/* ================================================================== stadium-cards */
R['stadium-cards'] = { id: 'stadium-cards', v: 1, name: 'Stadium cards + mode',
  target: 'fanlife.js stadiums route (.fl-vcard) · passport route (.fl-stamps, ring) · stadium/:tid',
  ctx: ['stadiums', '.fl-vcard'],
  changes: ['Most fans visit one or two stadiums, but the passport leads with a "0 of 30" ring and a 30-stamp grid, so nearly everyone sees an empty collection. It becomes "Your stadiums": your home stadium first, then the ones you have checked in at, then one suggestion (your team\'s next road game), with all 30 behind one row.',
    'The count is "1 visited" as an L4 pair, never "of 30".',
    'The stadium card\'s logo sits on a dark translucent square over the photo. It becomes the logo S24 on a white squared plate, so every team\'s mark reads on any photo.',
    'The card meta mixes a city, roof, capacity and year in one Sans line. Capacity becomes Stats medium; the rest stays Meta. Visited is a soft Positive .badge.'],
  current: () => V('Stadiums', 'stadiums route', phone('stadiums')) + V('Passport', 'passport route', phone('passport')),
  proposed: () => {
    const FL = App.FANLIFE; if (!FL) return none('Stadium data has not loaded.');
    const t = tm(), S0 = FL.stad(t.abbr), nx = Dt.D.games.find(g => g.a === t.id && g.ts > time.now()), awayT = nx && team(nx.h), S1 = awayT && FL.stad(awayT.abbr);
    const pic = (tt, st, on) => `<div class="r5c-vcard"><div class="r5c-vpic">${S(UI.img(FL.venueImg(tt)))}<span class="r5c-plate">${lg(tt.id, 'sm')}</span>${on ? `<span class="badge win r5c-vis">${S(icon('check', 'xs'))}Visited</span>` : ''}</div><div class="r5c-vb2"><div class="r5c-q">${esc(st.name)}</div><div class="r5c-meta">${esc(st.city)} · ${esc(st.roof)} · <span class="r-record">${fmt.n(st.cap)}</span> seats</div></div></div>`;
    return V('Stadium card', 'logo S24 on a white plate · Stats capacity · soft Visited', F(pic(t, S0, true)))
      + V('Your stadiums (was the passport)', 'home first · L4 count · one suggestion · all 30 behind a row', F(`<div class="r5c-row between">${eb('Your stadiums')}${L4(1, 'visited')}</div>
        <div class="r5c-card flush mt8"><div class="row static">${lg(t.id, 'md')}<div class="row-main"><div class="row-title">${esc(S0.name)}</div><div class="row-sub">Home · checked in</div></div><span class="badge win">${S(icon('check', 'xs'))}Visited</span></div>
        ${S1 ? `<div class="row tap">${lg(awayT.id, 'md')}<div class="row-main"><div class="row-title">${esc(S1.name)}</div><div class="row-sub">${esc(t.name)} play here <span class="r-date">${esc(fmt.day(nx.ts))}</span></div></div><button class="btn sm">Plan a trip</button></div>` : ''}
        <div class="row tap">${S(icon('stadium'))}<div class="row-main"><div class="row-title">All 30 stadiums</div><div class="row-sub">Guides for getting there, gates and food</div></div>${chev()}</div></div>`));
  } };

/* ================================================================== draft-pick */
R['draft-pick'] = { id: 'draft-pick', v: 1, name: 'Draft pick row/card',
  target: 'offseason.js pickRow() pickCard() · .ox-pick .ox-ov · By position meters',
  ctx: ['draft', '.ox-pick'],
  changes: ['On the pick card the "Traded" pill runs into the eyebrow ("RD 1 · #6 TRADED", touching). The eyebrow reads "Round 1 · Pick 6" on its own line and the pill sits under it, so neither crops.',
    'The name and school are a Sans h4 over tiny text. They become an L3 line at its headshot (the card keeps its L64 headshot above), meta "CB · LSU".',
    'In the list row the overall pick is a .num block; it becomes Stats bold in text-2, then logo M32, then the L3-style title and meta.',
    'The By position bars are thick NFL red bars. They become the approved 6px meter in your team\'s primary, with the count as Stats bold.'],
  current: () => phone('draft'),
  proposed: () => {
    const d = ((App.NFL.d.core || {}).drafts || {})[2026] || [], t = tm();
    const mine = d.filter(p => p.t === t.id).slice(0, 2), all = d.slice(0, 3);
    if (!d.length) return none('No 2026 draft data.');
    const pc = p => card(`${eb(`Round ${p.r} · Pick ${p.o}`)}${p.tr ? '<span class="badge mt6">Traded</span>' : ''}<div class="mt12">${p.pid ? S(UI.hs(p.pid, 'lg')) : `<div class="hs lg hs-fallback" style="background:${prim(t)}">${esc(p.pos)}</div>`}</div><div class="r5c-pn r-player-name mt8">${esc(p.n)}</div><div class="r5c-meta">${esc(p.pos)} · ${esc(p.col || '')}</div>`, 'r5c-pick-c');
    const pos = [['OL', 50], ['WR', 36], ['CB', 27]];
    return V('Pick card', 'eyebrow on its own line · pill under it · L64 headshot · name and meta', F(`<div class="r5c-row gap8 start">${mine.map(pc).join('')}</div>`))
      + V('Pick row', 'overall Stats bold · logo M32 · title over meta', F(`<div class="list r5c-list">${all.map(p => `<div class="row static"><span class="r5c-rk r-stat-number">${p.o}</span>${lg(p.t, 'md')}<div class="row-main"><div class="row-title r-player-name">${esc(p.n)}</div><div class="row-sub">${esc([p.pos, p.col].filter(Boolean).join(' · '))}</div></div></div>`).join('')}</div>`))
      + V('By position', '6px meter in your team\'s primary · Stats bold count', F(card(pos.map(([k, n]) => `<div class="r5c-bar"><span class="r5c-lbl">${k}</span><div class="meter grow"><i style="width:${n / 50 * 100}%;background:${prim(t)}"></i></div><b class="r-stat-number">${n}</b></div>`).join(''))));
  } };

/* ================================================================== bracket */
R['bracket'] = { id: 'bracket', v: 1, name: 'Playoff bracket + picture',
  target: 'scores.js playoffsView() seed rows · bracket() matchup() superBowl() · .br-m .sb-card',
  ctx: ['playoffs', '.card'],
  changes: ['The banner reads "Kansas City Chiefs · #1 seed" with the seed in red text beside Sans. It becomes an L2 row with a soft "1 seed" pill and the bye in Meta.',
    'Seed rows put the division ("West", "Wild card") in a grey Sans column far from the team. It moves into the L2 meta next to the record ("4-0 · West").',
    'Your team\'s row is a pink tint. It becomes your team\'s own tint from the sheet, the same as power rankings.',
    'Bracket tiles draw seed, logo, tricode and score in their own styles. Each team becomes an L1 line with the seed in Stats bold before it, and the status is the L5 pill.'],
  current: () => V('Picture', 'playoffs route', phone('playoffs')) + V('Bracket', 'playoffs?mode=bracket', phone('playoffs?mode=bracket')),
  proposed: () => {
    const st = Dt.standings(s4()), cf = tm().conf, seeds = (st.conf && st.conf[cf]) || [];
    if (!seeds.length) return none('No standings yet.');
    const div = (r, i) => i < 4 ? r.t.div : 'Wild card';
    const top = seeds[0];
    const g = live() || C().G.post;
    const sc = g && Dt.score(g);
    return V('Seed banner', 'L2 · soft seed pill', F(card(`<div class="r5c-row between">${L2(top.tid, { name: top.t.name })}<span class="badge">1 seed</span></div><div class="r5c-meta mt8">Would earn the only first-round bye and home field</div>`)))
      + V('Seed rows', 'seed Stats bold · L2 with division in the meta · your tint', F(`<div class="r5c-card flush">${seeds.slice(0, 5).map((r, i) => `<div class="r5c-prow${r.tid === tm().id ? ' mine' : ''}" style="${r.tid === tm().id ? `--r5c-tint:${tint(team(r.tid))}` : ''}"><span class="r5c-rk r-stat-number">${i + 1}</span>${L2(r.tid, { rec: `${r.w}-${r.l}${r.tie ? '-' + r.tie : ''}`, more: esc(div(r, i)) })}<div class="grow"></div>${i === 0 ? L5('bye') : ''}</div>`).join('')}</div>`))
      + (g ? V('Bracket tile', 'L1 lines with seeds · L5 status', F(card(`<div class="r5c-row between">${eb('Wild Card')}${L5(g)}</div><div class="mt8">${L1(g.a, sc.as, { seed: 7, lost: sc.final && sc.as < sc.hs })}${L1(g.h, sc.hs, { seed: 2, lost: sc.final && sc.hs < sc.as })}</div>`, 'r5c-narrow'))) : '');
  } };

/* ================================================================== multiview-tile */
R['multiview-tile'] = { id: 'multiview-tile', v: 1, name: 'Multiview tile',
  target: 'scores.js mvTile() · .mv-tile .mv-poss .mv-sc · multiview chips',
  ctx: ['multiview', '.mv-tile'],
  changes: ['The clock is red Sans text ("4TH 3:18"). It becomes the L5 Live pill with its dot; the clock inside is Stats bold caps.',
    'Possession is a yellow dot. It becomes the 6px Live red dot of L1, between tricode and score; each team is an L1 line.',
    'A red-zone tile gets a red outline around the whole card on top of the RZ pill. The outline goes; the soft Negative "Red zone" pill carries it.',
    'Down and distance under the field is already Stats bold caps; as is. The field diagram stays the approved one.',
    'The game chips at the top are filled black when picked; picked chips take the text colour, as the chip atom says.'],
  current: () => phone('multiview'),
  proposed: () => {
    const gs = Dt.liveGames().slice(0, 2); if (!gs.length) return none('No live games at this moment; switch the moment to Game day.');
    const tile = g => { const sc = Dt.score(g), viz = UI.fieldViz ? S(UI.fieldViz(g, { L: sc.L, compact: true })) : '';
      return card(`<div class="r5c-row between">${L5(g)}${sc.redzone ? '<span class="badge loss">Red zone</span>' : ''}</div><div class="mt8">${L1(g.a, sc.as, { poss: sc.poss === g.a })}${L1(g.h, sc.hs, { poss: sc.poss === g.h })}</div>${viz ? `<div class="mt8">${viz}</div>` : ''}${sc.dd ? `<div class="r5c-dd r-down-distance mt8">${esc(sc.dd)}</div>` : ''}`, 'r5c-mv'); };
    return V('Tiles', 'L5 Live pill · L1 lines with the red dot · soft Red zone pill', F(`<div class="r5c-mvg">${gs.map(tile).join('')}</div>`));
  } };

/* ================================================================== mini-bug */
R['mini-bug'] = { id: 'mini-bug', v: 2, name: 'Header mini game bug',
  target: 'home.js miniHtml() · .minibar .mb-tm .mb-st',
  ctx: ['home', '.minibar'],
  changes: ['From your note: v1 put seven things on one line, so the down and distance got squeezed. The bug becomes a small two-line scoreboard: the two teams are stacked on the left, and the game state is on the right.',
    'Primary: the scores. Each team is a compact L1 (logo S24, tricode in Display, score in Display 20, right-aligned so the two scores line up), with possession as the 6px Live red dot.',
    'Secondary: the L5 Live pill carries the clock ("4th 3:18"), so "Live" and the clock are no longer two separate things. Under it is the down and distance in Sans medium (the role is now Sans app-wide) in text-2, with the whole line shown.',
    'A hairline divides scores from state; the chevron stays. It fits a 390px header at 64px tall.'],
  current: () => { const g = live(); return g ? V('As the app draws it', 'App.homeParts.miniHtml({ g })', `<div class="r5c-mb minibar">${S(App.homeParts.miniHtml({ g }))}</div>`) : none('No live game at this moment.'); },
  proposed: () => {
    const g = live(); if (!g) return none('No live game at this moment.');
    const sc = Dt.score(g), side = tid => `<div class="lk-l1 r5c-mb3t">${lg(tid, 'sm')}<span class="lk-tri r-tricode">${team(tid).abbr}</span>${sc.poss === tid ? '<i class="lk-poss" aria-label="Has the ball"></i>' : ''}<span class="lk-sc r-score">${tid === g.a ? sc.as : sc.hs}</span></div>`;
    return V('Bug at 390px', 'two stacked L1 · L5 Live with the clock · Sans medium down', `<div class="r5c-mb3">${'<div class="r5c-mb3l">' + side(g.a) + side(g.h) + '</div>'}<div class="r5c-mb3r">${L5(g)}${sc.dd ? `<span class="r-down-distance">${esc(sc.dd)}</span>` : ''}</div>${chev()}</div>`);
  } };

/* ================================================================== settings-row */
const setRow = (ic, title, val, bg) => S(UI.row({ left: App.raw(`<span class="set-ic" style="${bg ? `background:${bg};color:#fff` : ''}">${S(icon(ic))}</span>`), title, right: val != null ? App.raw(`<span class="set-val">${val}</span>`) : '', go: '#/' }));
R['settings-row'] = { id: 'settings-row', v: 1, name: 'Settings row + group',
  target: 'you.js setRow() setIc() · SETTINGS groups (.set-group .set-label) · timemachine set-group',
  ctx: ['settings/notifications', '.set-group'],
  changes: ['The You settings list gives every row its own icon colour (#e5484d, #6e56cf, #3a3a3f, #0090ff, #12a594, #f76b15…), none of them on your sheets. Every icon sits in one squared 32px tile on surface-2 in the text colour.',
    'The value on the right is 13.5px in text-3, which is under AA on the surface. It becomes Sans medium at Meta size in text-2.',
    'Group labels (.set-label) already draw as the eyebrow role through roles.css; as is. The proposed list sits in one card with the same label above it.',
    'Toggle rows are the approved 56px row with the approved toggle; as is. Note: the inventory route settings/alerts does not exist ("Unknown setting"); the context screen opens Notifications instead.'],
  current: () => V('You · Settings list', 'setRow(icon, title, value, colour)', F(`<div class="list r5c-list">${setRow('bell', 'Notifications', 'Essentials', '#e5484d')}${setRow('eyeoff', 'Spoiler shield', 'Off', '#6e56cf')}${setRow('sun', 'Appearance', 'Light', '#3a3a3f')}${setRow('a11y', 'Accessibility', null, '#0090ff')}${setRow('translate', 'Language & region', 'English', '#12a594')}</div>`))
    + V('Settings group', 'settings/notifications', F(`<div class="set-group" style="margin-top:0"><div class="set-label">Game alerts</div><div class="list r5c-list">${S(UI.row({ title: 'Kickoff', sub: 'When your teams\' games start, with where to watch', right: UI.toggle(true, '', '') }))}${S(UI.row({ title: 'Scoring plays', sub: 'Touchdowns and field goals as they happen', right: UI.toggle(false, '', '') }))}</div></div>`)),
  proposed: () => {
    const r = (ic, title, val) => `<div class="row tap"><span class="r5c-ic">${S(icon(ic))}</span><div class="row-main"><div class="row-title">${title}</div></div>${val != null ? `<span class="r5c-val">${val}</span>` : ''}${chev()}</div>`;
    return V('Settings list', 'one neutral icon tile · Sans medium text-2 value', F(`<div class="r5c-card flush">${r('bell', 'Notifications', 'Essentials')}${r('eyeoff', 'Spoiler shield', 'Off')}${r('sun', 'Appearance', 'Light')}${r('a11y', 'Accessibility')}${r('translate', 'Language & region', 'English')}</div>`))
      + V('Settings group', 'eyebrow label · 56px rows · approved toggle', F(`${eb('Game alerts')}<div class="r5c-card flush mt8">${S(UI.row({ title: 'Kickoff', sub: 'When your teams\' games start, with where to watch', right: UI.toggle(true, '', '') }))}${S(UI.row({ title: 'Scoring plays', sub: 'Touchdowns and field goals as they happen', right: UI.toggle(false, '', '') }))}</div>`));
  } };

/* ================================================================== search */
R['search'] = { id: 'search', v: 2, name: 'Search results/idle',
  target: 'home.js search route · searchIdle() searchResults() · .search-field · exploreDirectory()',
  ctx: ['search', '.search-field'],
  changes: ['From your note ("follow icon is grey but with a red container for \'chargers\'?"): a card-row rule was greying every icon in the row, including the one inside the button, so Follow drew a grey plus on red and Your team lost its team-colour star. There is now one follow control, UI.followBtn, built from the button and icon atoms: the icon always takes the label colour (white plus on the primary Follow, a check in the text colour on the secondary Following), and only the Your team star is wrapped in the team primary. The same rule is in the app (.btn .ico inherits), so no row can grey a button icon again.',
    'The Explore tiles put each icon in a round pink disc (NFL red at a tint). Icons sit in the same squared surface-2 tile as the rows below, in the text colour; the label stays Sans bold.',
    'The search field is a 44px soft rectangle. It becomes the L48 control height with radius 10, the same family as the buttons.',
    'Team results are UI.teamRow with the full name in Sans; they become L2 rows (nickname in Display, record in Stats) with the approved Follow button.',
    'Player results become L3 lines; stat answers ("Most passing yards 2025") put the value as an L4 pair. The "Ask anything" chips are already squared chips; as is.'],
  current: () => phone('search'),
  proposed: () => {
    const t = tm(), o = opp(), p = qb(t.id);
    const tile = (ic, l) => `<div class="r5c-ex"><span class="r5c-ic">${S(icon(ic))}</span><b>${l}</b></div>`;
    return V('Idle', 'L48 field · chips · squared icon tiles', F(`<label class="r5c-field">${S(icon('search', 'sm'))}<span>Teams, players, stats, games…</span></label>
      <div class="chips r5c-chips mt12"><button class="chip">${S(icon('sparkle', 'sm'))}Most passing yards 2025</button><button class="chip">${S(icon('sparkle', 'sm'))}Mahomes vs Allen</button></div>
      <div class="r5c-exg mt12">${tile('list', 'Standings')}${tile('chart', 'Stats')}${tile('trophy', 'Playoffs')}${tile('ticket', 'Tickets')}</div>`))
      + V('Results', 'L2 with Follow · L3', F(`${eb('Teams')}<div class="r5c-card flush mt8">${[t.id, o.id].map(id => `<div class="row tap">${L2(id)}<div class="grow"></div>${S(UI.followBtn('team', id, 'sm'))}</div>`).join('')}</div>
      ${eb('Players')}<div class="r5c-card flush mt8"><div class="row tap">${L3(pid(p))}<div class="grow"></div>${chev()}</div></div>`));
  } };

/* ================================================================== inbox */
R['inbox'] = { id: 'inbox', v: 2, name: 'Inbox row',
  target: 'home.js inbox route · inboxItems() · .ib-row .ib-lead',
  ctx: ['inbox', '.ib-row'],
  changes: ['From your note ("spacing is a little off on these, as well as the spacing. let\'s remove the red dot, or add it above/below the icon"): the red dot is removed. Opening the inbox marks everything read and the header pip already says something is new, and a dot in its own column was what pushed the icon off the row\'s left edge. The row now has one 16px inset and 14px top and bottom; the logo or icon tile is top-aligned with the headline\'s first line; the headline, summary and time step down on a 4px rhythm; and day groups sit 24px apart instead of 28px plus the header gap.',
    'Day headers ("THURSDAY, OCTOBER 8") are 25px Display. A date is metadata, and metadata is never Display: they become the eyebrow role, with "Today" and "Yesterday" in words.',
    'Every league story shows the Falcons logo, because the row takes the story\'s first team tag (a.tm[0]) whether or not the story is about that team. A row shows a team logo only for a game, injury or move for that team; news gets the news icon in a squared surface-2 tile.',
    'Headlines run to three lines in Title S and the summary to two more. The headline clamps to two lines and the summary to one, so a screen shows five rows instead of three.',
    'Unread is already the approved Live-red dot, not a heavier font; as is. The time is the Date role.'],
  current: () => phone('inbox'),
  proposed: () => {
    const items = (App.home && App.home.inboxItems ? App.home.inboxItems() : []).slice(0, 5);
    if (!items.length) return none('The inbox is empty at this moment.');
    const today = fmt.dayKey(time.now());
    const by = {}; items.forEach(i => { const k = fmt.dayKey(i.ts); (by[k] = by[k] || []).push(i); });
    const lead = i => i.icon === 'news' || !i.logo || !team(i.logo) ? `<span class="ib-ic">${S(icon(i.icon || 'bell', 'sm'))}</span>` : lg(i.logo, 'md');
    return V('Inbox', 'no dot · lead top-aligned · 16px inset · 4px text rhythm', F(Object.entries(by).map(([k, list], n) => `${eb(k === today ? 'Today' : fmt.dayLong(list[0].ts))}<div class="r5c-card flush mt8${n ? '' : ''}">${list.map((i, j) => `<div class="row tap ib-row"><span class="ib-lead">${lead(i)}</span><div class="row-main"><div class="row-title r5c-c2">${esc(S(i.title).replace(/<[^>]+>/g, ''))}</div>${i.body ? `<div class="row-sub r5c-c1">${esc(S(i.body).replace(/<[^>]+>/g, ''))}</div>` : ''}<div class="t-meta ib-time">${esc(fmt.ago(i.ts))}</div></div></div>`).join('')}</div>`).join('<div class="mt16"></div>')));
  } };
})();
