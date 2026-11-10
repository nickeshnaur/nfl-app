/* ============================================================================
   Stats Center, leaders, team rankings, stat finder, compare.
   Routes: stats, leaders (?stat=&s=&grp=), team-rankings (?s=), stat-finder, compare (?a=&b=&s= | ?ta=&tb=&s=)
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, fmt, store, time, NFL } = App;
const UI = App.UI, Dt = App.data, PS = App.PS;

const needBox = (s, build) => NFL.d['box-' + s] ? build() : Dt.ensureBox(s).then(build);
// season picker (stats-pickers, approved 2026-11-07): the Scores season chip, opening a sheet; every season action sets state.s
const seasonChips = (s, act, l) => html`<div class="pad"><button class="sc-season" data-act="ld-pick" data-arg="s">${l || s}${icon('down', 'xs')}</button></div>`;
const mineP = pid => store.p.players.includes(pid);
const mineT = tid => store.p.teams.includes(tid);

/* ------------------------------------------------------------------ stats center */
const CATS = [
  { k: 'passing', l: 'Passing', boards: ['passYds', 'passTD', 'rating', 'ypa'] },
  { k: 'rushing', l: 'Rushing', boards: ['rushYds', 'rushTD', 'ypc', 'scrYds'] },
  { k: 'receiving', l: 'Receiving', boards: ['recYds', 'rec', 'recTD', 'ypr'] },
  { k: 'defense', l: 'Defense', boards: ['sacks', 'tackles', 'defInt', 'tfl'] },
  { k: 'kicking', l: 'Kicking', boards: ['fgm', 'fgPct', 'kPts', 'puntAvg'] },
];
/** the Stats Center body — its own route, and the Stats view of the Scores tab (frame = title/header overrides) */
function statsCenter(page, frame) {
  const st = page.state = page.state || {};
  if (!st.s) Object.assign(st, { s: Dt.seasonForStats(), cat: 'passing' });
  return needBox(st.s, () => {
    const cat = CATS.find(c => c.k === st.cat);
    const done = Dt.D.weeks.filter(w => w.s === st.s && w.t === 2 && w.end + Dt.GAME_LEN < time.now()).length;
    return {
      title: 'Stats', right: html`<button class="icon-btn" data-go="#/stat-finder" aria-label="Stat finder">${icon('search')}</button>`, ...frame,
      html: html`<div class="mt8">${seasonChips(st.s, 'stc-season', `${st.s} regular season`)}</div>
        <div class="pad mt8 t-meta">${done >= 18 ? 'Final' : `Through Week ${done}`}</div>
        <div class="sec" style="margin-top:16px"><div class="list">
          ${tool('search', 'Stat finder', 'Ask any question: "most sacks by a rookie"', '#/stat-finder')}
          ${tool('swap', 'Compare', 'Two players or two teams, side by side', '#/compare')}
          ${tool('chart', 'Team rankings', 'Offense, defense and EPA for all 32', `#/team-rankings?s=${st.s}`)}
          ${tool('trophy', 'Records', 'All-time and single-season marks', '#/records')}
        </div></div>
        ${prBoard(st.s)}
        <div class="sec">${UI.secHead('League leaders')}${UI.tabs(CATS.map(c => ({ k: c.k, l: c.l })), st.cat, 'sc-cat')}
          <div class="sc-boards mt16">${cat.boards.map(k => board(k, st.s, 5))}</div></div>
        <div class="sec">${UI.secHead('Team efficiency', 'All 32', `#/team-rankings?s=${st.s}`)}${teamMini(st.s)}</div>`,
    };
  });
}
App.route('stats', (params, query, page) => statsCenter(page));
App.statsView = statsCenter;
App.statsParts = { prRow: (r, s) => prRow(r, s), prBoard: s => prBoard(s) };
/* ------------------------------------------------------------------ power rankings */
/** a power-rankings row (approved ranked-rows v3 A, 2026-11-08): the shared ranked row, record in Display on the right,
    the move as Meta text with an arrow under it, your team on its team-colour edge */
function prRow(r, s) {
  const mv = r.mv > 0 ? `▲ ${r.mv}` : r.mv < 0 ? `▼ ${-r.mv}` : 'No change';
  return UI.rankRow({ rank: r.rk, tid: r.tid, sub: `${r.diff > 0 ? '+' : ''}${r.diff} point diff · ${esc(r.streak)}`, value: r.rec, note: mv, noteCls: r.mv > 0 ? 'up' : r.mv < 0 ? 'down' : '', mine: mineT(r.tid), go: `#/team/${r.tid}` });
}
function prBoard(s) {
  const pr = s === Dt.seasonForStats() ? Dt.powerRank(s) : null; if (!pr) return '';
  return html`<div class="sec">${UI.secHead('Power rankings', 'All 32', '#/power-rankings')}<div class="list">${pr.list.slice(0, 5).map(r => prRow(r, s))}</div></div>`;
}
App.route('power-rankings', () => {
  const s = Dt.seasonForStats(), pr = Dt.powerRank(s);
  return { title: 'Power rankings', html: pr ? html`<div class="pad mt8 meta">Record, scoring margin and the last three games, re-ranked every week. Arrows show the move since last week.</div>
    <div class="sec" style="margin-top:14px"><div class="list">${pr.list.map(r => prRow(r, s))}</div></div>` : UI.empty('chart', 'No rankings yet', 'They start after Week 1.') };
});
// hub-tiles B (approved 2026-11-07): Stats' shortcuts are list rows (icon tile, title, line, chevron); tiles stay on Explore
const tool = (ic, t, d, go) => html`<a class="row tap sc-tool-r" data-go="${go}"><span class="sc-tool-i">${icon(ic, 'sm')}</span><div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${d}</div></div>${icon('chev', 'sm chev')}</a>`;
function board(statKey, s, n) {
  const stt = PS.STAT[statKey];
  const list = PS.ranked(s, statKey).slice(0, n);
  return html`<div class="sc-board"><div class="sc-board-h"><div class="t">${stt.term ? UI.term(stt.term, stt.l) : stt.l}</div><a class="tiny" data-go="#/leaders?stat=${statKey}&s=${s}">See all ${icon('chev', 'xs')}</a></div>
    ${list.length ? list.map((x, i) => leadRow(x, i, stt)) : html`<div class="pad-all meta">No qualified players yet.</div>`}</div>`;
}
function leadRow(x, i, stt) {
  const L = x.L, p = Dt.player(L.pid), tm = Dt.team(L.tid);
  return html`<a class="sc-lead tap ${i === 0 ? 'first' : ''} ${mineP(L.pid) ? 'mine' : ''}" data-go="#/player/${L.pid}">
    <span class="rank">${i + 1}</span>${UI.hs(L.pid, i === 0 ? '' : 'sm')}
    <div class="grow"><div class="nm ellipsis">${p ? p.n : L.n}</div><div class="sub">${UI.logo(L.tid, 'sm')}${tm ? tm.abbr : ''} · ${p ? p.pos : L.grp} · ${L.gp} G</div></div>
    <div class="v">${PS.fmtStat(x.v, stt)}</div></a>`;
}
function teamMini(s) {
  const rows = allTeams(s).sort((a, b) => b.epaPlay - a.epaPlay).slice(0, 5);
  return html`<div class="sc-board"><div class="sc-board-h"><div class="t">Offense ${UI.term('EPA', 'EPA')} per play</div></div>
    ${rows.map((r, i) => html`<a class="sc-lead tap ${i === 0 ? 'first' : ''} ${mineT(r.tid) ? 'mine' : ''}" data-go="#/team/${r.tid}"><span class="rank">${i + 1}</span>${UI.logo(r.tid, i === 0 ? 'md' : '')}<div class="grow"><div class="nm">${Dt.team(r.tid).full}</div><div class="sub">${Dt.record(r.tid, s).str} · ${fmt.n(r.ppg, 1)} pts/g</div></div><div class="v">${sign(r.epaPlay)}</div></a>`)}</div>`;
}
const sign = (v, d = 2) => (v > 0 ? '+' : '') + fmt.n(v, d);
const tcache = {};
function allTeams(s) {
  const key = s + ':' + Math.floor(time.now() / 60000);
  if (tcache[key]) return tcache[key];
  return tcache[key] = Dt.D.teams.map(t => ({ tid: t.id, ...Dt.teamSeason(t.id, s) }));
}

/* ------------------------------------------------------------------ leaders (full list) */
const GROUPS = [['', 'All'], ['QB', 'QB'], ['RB', 'RB'], ['WR', 'WR'], ['TE', 'TE'], ['DL', 'DL'], ['LB', 'LB'], ['DB', 'DB'], ['K', 'K'], ['P', 'P']];
/** league leaders (approved round 5): the stat stays a chip row; season and position fold into two squared select chips on one line.
    The list is one card: rank in Stats bold (text 2), the L3 line with the team in its meta, the value as L4 */
App.route('leaders', (params, query, page) => {
  const st = page.state = page.state || { s: +query.s || Dt.seasonForStats(), stat: query.stat || 'passYds', grp: query.grp || '' };
  return needBox(st.s, () => {
    const stt = PS.STAT[st.stat];
    const list = PS.ranked(st.s, st.stat, { grp: st.grp || null }).slice(0, 60);
    const grpL = (GROUPS.find(([k]) => k === (st.grp || '')) || [0, 'All'])[1];
    return {
      title: stt.l,
      html: html`<div class="mt8">${UI.tabs(PS.STATS.map(x => ({ k: x.k, l: x.s })), st.stat, 'ld-stat', 'sm')}</div>
        <div class="pad mt12 flex gap8"><button class="sc-season" data-act="ld-pick" data-arg="s">${st.s}${icon('down', 'xs')}</button><button class="sc-season" data-act="ld-pick" data-arg="grp">${st.grp ? grpL : 'All positions'}${icon('down', 'xs')}</button></div>
        ${stt.q ? html`<div class="pad mt12 t-meta">Rate stat — players need a minimum volume per team game to qualify.</div>` : ''}
        <div class="pad mt12"><div class="card ld-card"><div class="ld-th"><span>Player</span><span>${stt.s}</span></div>
          ${list.length ? list.map((x, i) => { const p = Dt.player(x.L.pid) || {}; return html`<a class="ld-row tap ${mineP(x.L.pid) ? 'hl' : ''}" data-go="#/player/${x.L.pid}"><span class="ld-rk">${i + 1}</span>${UI.lk3(x.L.pid, { name: p.n || x.L.n, meta: `${p.pos || x.L.grp || ''} · ${(Dt.team(x.L.tid) || {}).abbr || ''} · ${x.L.gp} G` })}${UI.lk4(PS.fmtStat(x.v, stt), '', { r: true })}</a>`; }) : html`<div class="ld-row t-meta">No qualified players.</div>`}
        </div></div>`,
    };
  });
});

/* ------------------------------------------------------------------ team rankings */
const TR_SETS = {
  offense: [['ppg', 'PTS/G', 1], ['ypg', 'YDS/G', 1], ['pass', 'PASS', 0, g => g.pass / (g.g || 1)], ['rush', 'RUSH', 0, g => g.rush / (g.g || 1)], ['thirdPct', '3RD%', 'pct'], ['rzPct', 'RZ%', 'pct'], ['toDiff', 'TO±', 0]],
  defense: [['papg', 'PTS/G', 1, null, true], ['yapg', 'YDS/G', 1, null, true], ['sacks', 'SACKS', 0], ['toF', 'TAKEAWAYS', 0], ['dEpaPlay', 'EPA/PLAY', 'epa', null, true], ['dSuccRate', 'SUCC%', 'pct', null, true]],
  advanced: [['epaPlay', 'EPA/PLAY', 'epa'], ['passEpaPlay', 'PASS EPA', 'epa'], ['rushEpaPlay', 'RUSH EPA', 'epa'], ['succRate', 'SUCC%', 'pct'], ['explRate', 'EXPL%', 'pct'], ['dEpaPlay', 'DEF EPA', 'epa', null, true]],
};
App.route('team-rankings', (params, query, page) => {
  const st = page.state = page.state || { s: +query.s || Dt.seasonForStats(), set: 'advanced', sort: null, asc: false };
  return needBox(st.s, () => {
    const cols = TR_SETS[st.set];
    const sortKey = st.sort && cols.find(c => c[0] === st.sort) ? st.sort : cols[0][0];
    const col = cols.find(c => c[0] === sortKey);
    const get = (r, c) => c[3] ? c[3](r) : r[c[0]];
    const lowerBetter = !!col[4];
    const rows = allTeams(st.s).slice().sort((a, b) => (lowerBetter !== st.asc ? 1 : -1) * (get(a, col) - get(b, col)));
    const show = (r, c) => { const v = get(r, c); return c[2] === 'pct' ? fmt.n(v * 100, 1) : c[2] === 'epa' ? sign(v) : fmt.n(v, c[2] || 0); };
    return {
      title: 'Team rankings',
      sub: html`<div style="padding-bottom:8px">${seasonChips(st.s, 'tr-season')}</div>`,
      html: html`<div class="mt12">${UI.seg([{ k: 'advanced', l: 'Advanced' }, { k: 'offense', l: 'Offense' }, { k: 'defense', l: 'Defense' }], st.set, 'tr-set')}</div>
        ${st.set === 'advanced' ? html`<div class="pad mt12 meta">${UI.term('EPA')} shows how much each play changes a team's expected points; ${UI.term('Success rate')} shows how often it stays on schedule. Higher is better on offense, lower on defense.</div>` : ''}
        <div class="tbl-wrap mt12"><table class="tbl"><thead><tr><th>Team</th>${cols.map(c => html`<th class="${c[0] === sortKey ? 'sort' : ''}" data-act="tr-sort" data-arg="${c[0]}">${c[1]}${c[0] === sortKey ? (st.asc ? ' ↑' : ' ↓') : ''}</th>`)}</tr></thead><tbody>
          ${rows.map((r, i) => html`<tr class="tap ${mineT(r.tid) ? 'hl' : ''}" data-go="#/team/${r.tid}"><td><span class="flex gap8"><span class="rank">${i + 1}</span>${UI.logo(r.tid, 'sm')}<b class="tbl-tri r-sans">${Dt.team(r.tid).abbr}</b></span></td>${cols.map(c => html`<td class="${c[0] === sortKey ? 'b' : ''}">${show(r, c)}</td>`)}</tr>`)}
        </tbody></table></div>
        <div class="tiny pad mt8">Regular season through ${fmt.date(time.now())}. EPA and success rate are computed by us from play-by-play with a simple expected-points model.</div>`,
    };
  });
});

/* ------------------------------------------------------------------ stat finder */
const PRESETS = [
  { q: 'Most passing TDs', stat: 'passTD' },
  { q: 'Rookie rushing leaders', stat: 'rushYds', rookie: true },
  { q: 'Most sacks by a linebacker', stat: 'sacks', grp: 'LB' },
  { q: 'Best yards per carry', stat: 'ypc' },
  { q: 'Tight ends by receiving yards', stat: 'recYds', grp: 'TE' },
  { q: 'Interceptions by DBs', stat: 'defInt', grp: 'DB' },
  { q: 'Longest field goals', stat: 'fgLong' },
];
App.route('stat-finder', (params, query, page) => {
  const st = page.state = page.state || { s: Dt.seasonForStats(), stat: 'passYds', grp: '', team: '', minG: 0, rookie: false, q: '' };
  return needBox(st.s, () => {
    const stt = PS.STAT[st.stat];
    const cur = Dt.seasonForStats();
    const list = PS.ranked(st.s, st.stat, { grp: st.grp || null, filter: L => (!st.team || L.tid === st.team) && L.gp >= (st.minG || 0) && (!st.rookie || isRookie(L.pid, st.s)) }).slice(0, 50);
    const desc = [st.rookie ? 'Rookie' : '', st.grp ? PS.GROUP_NAME[st.grp] : 'players', st.team ? `on the ${Dt.team(st.team).name}` : '', `by ${stt.l.toLowerCase()}`, `· ${st.s}`].filter(Boolean).join(' ');
    return {
      title: 'Stat finder',
      html: html`<div class="mt12"><label class="sf-q">${icon('search', 'sm')}<input class="sf-input" placeholder="Try: most rushing yards by a rookie 2025" value="${st.q}" enterkeyhint="search"></label></div>
        <div class="pad mt12 sq-chips">${[['stat', stt.l], ['grp', st.grp ? (GROUPS.find(([k]) => k === st.grp) || [0, st.grp])[1] : 'All positions'], ['s', st.s], ['team', st.team ? Dt.team(st.team).name : 'All teams']].map(([k, l]) => html`<button class="sc-season" data-act="sf-pick" data-arg="${k}">${l}${icon('down', 'xs')}</button>`)}
          <button class="sc-season ${st.minG || st.rookie ? 'on' : ''}" data-act="sf-more">${icon('filter', 'xs')}More${st.minG || st.rookie ? ` · ${(st.minG ? 1 : 0) + (st.rookie ? 1 : 0)}` : ''}</button></div>
        ${st.q || st.grp || st.team || st.rookie || st.stat !== 'passYds' ? '' : html`<div class="list mt12">${PRESETS.slice(0, 4).map((p, i) => UI.row({ left: html`<span class="lead-tile">${icon('search', 'sm')}</span>`, title: p.q, act: 'sf-preset', arg: String(i) }))}</div>`}
        <div class="sf-note"><b>${list.length}</b> ${desc}${stt.q ? ' · qualified players only' : ''}</div>
        <div class="tbl-wrap mt12"><table class="tbl"><thead><tr><th>Player</th><th>Team</th><th>G</th><th class="sort">${stt.s}</th></tr></thead><tbody>
          ${list.length ? list.map((x, i) => html`<tr class="tap ${mineP(x.L.pid) ? 'hl' : ''}" data-go="#/player/${x.L.pid}"><td><span class="flex gap8"><span class="rank">${i + 1}</span>${UI.hs(x.L.pid, 'sm')}<span class="ellipsis" style="max-width:130px">${(Dt.player(x.L.pid) || x.L).n}</span></span></td><td><b class="tbl-tri r-sans">${Dt.team(x.L.tid)?.abbr}</b></td><td>${x.L.gp}</td><td class="b">${PS.fmtStat(x.v, stt)}</td></tr>`) : html`<tr><td colspan="4" class="dim">Nobody matches — loosen a filter.</td></tr>`}
        </tbody></table></div>
        ${st.rookie && st.s !== cur ? html`<div class="tiny pad mt8">"Rookie" uses each player's draft year, so it only works for players still on a roster.</div>` : ''}`,
      mount(el, pg) {
        el.querySelectorAll('[data-sf]').forEach(inp => inp.addEventListener('change', () => {
          const k = inp.dataset.sf; let v = inp.value;
          if (k === 's' || k === 'minG') v = +v || (k === 's' ? cur : 0);
          pg.state[k] = v; if (k === 's') { Dt.ensureBox(v).then(() => App.refresh(pg)); } else App.refresh(pg);
        }));
        const q = el.querySelector('.sf-input');
        q.addEventListener('keydown', e => { if (e.key === 'Enter') { parseQuery(q.value, pg.state); pg.state.q = q.value; Dt.ensureBox(pg.state.s).then(() => App.refresh(pg)); } });
      },
    };
  });
});
function isRookie(pid, s) { const p = Dt.player(pid); if (!p || !p.dr) return p && p.exp === 0 && s === 2026; const y = +p.dr.slice(0, 4); return y === s; }
/** tiny natural-language parser: "most rushing yards by a rookie 2025 chiefs" */
function parseQuery(q, st) {
  q = q.toLowerCase();
  const yr = q.match(/20(2[2-6])/); if (yr) st.s = +yr[0];
  st.rookie = /rookie/.test(q);
  const grps = { quarterback: 'QB', ' qb': 'QB', 'running back': 'RB', ' rb': 'RB', receiver: 'WR', ' wr': 'WR', 'tight end': 'TE', ' te': 'TE', linebacker: 'LB', ' lb': 'LB', 'defensive back': 'DB', cornerback: 'DB', safet: 'DB', ' cb': 'DB', 'd-line': 'DL', 'defensive line': 'DL', edge: 'DL', kicker: 'K', punter: 'P' };
  st.grp = ''; for (const k in grps) if ((' ' + q).includes(k)) { st.grp = grps[k]; break; }
  st.team = ''; for (const t of Dt.D.teams) if (q.includes(t.name.toLowerCase()) || new RegExp('\\b' + t.abbr.toLowerCase() + '\\b').test(q)) { st.team = t.id; break; }
  const map = [[/passing (td|touchdown)|td pass/, 'passTD'], [/passer rating|rating/, 'rating'], [/completion/, 'cmpPct'], [/yards per attempt|y\/a/, 'ypa'], [/interception.*thrown|picks thrown/, 'int'],
    [/passing|pass yards|throwing/, 'passYds'], [/rushing (td|touchdown)/, 'rushTD'], [/per carry|ypc/, 'ypc'], [/carries/, 'carries'], [/rushing|rush yards|running/, 'rushYds'],
    [/receiving (td|touchdown)/, 'recTD'], [/target/, 'tgt'], [/catches|receptions/, 'rec'], [/per catch|per reception/, 'ypr'], [/receiving|rec yards/, 'recYds'],
    [/scrimmage/, 'scrYds'], [/total (td|touchdown)|touchdowns/, 'tds'], [/sack/, 'sacks'], [/tackles for loss|tfl/, 'tfl'], [/tackle/, 'tackles'], [/qb hit/, 'qbh'], [/passes defended|pass breakup/, 'pd'],
    [/interception|picks/, 'defInt'], [/longest field goal|long fg/, 'fgLong'], [/field goal %|fg%|accuracy/, 'fgPct'], [/field goal/, 'fgm'], [/punt/, 'puntAvg']];
  for (const [re, k] of map) if (re.test(q)) { st.stat = k; break; }
}

/* ------------------------------------------------------------------ compare */
App.route('compare', (params, query, page) => {
  // unknown ids in the link fall back to empty pickers instead of throwing
  const okP = id => id && Dt.player(id) ? id : null, okT = id => id && Dt.team(id) ? id : null;
  const st = page.state = page.state || { mode: query.ta || query.tb ? 'teams' : 'players', a: okP(query.a), b: okP(query.b), ta: okT(query.ta) || store.p.primary || null, tb: okT(query.tb), s: +query.s || Dt.seasonForStats(), span: 'season' };
  const needs = [Dt.ensureBox(st.s)]; if (st.span === 'career') needs.push(App.load('careers'));
  const ready = NFL.d['box-' + st.s] && (st.span !== 'career' || NFL.d.careers);
  const build = () => ({
    title: 'Compare',
    html: html`<div class="mt8">${UI.seg([{ k: 'players', l: 'Players' }, { k: 'teams', l: 'Teams' }], st.mode, 'cp-mode')}</div>
      ${st.mode === 'players' ? comparePlayers(st) : compareTeams(st)}`,
  });
  return ready ? build() : Promise.all(needs).then(build);
});
/* compare (approved round 5): empty pickers are squared tiles, "vs" a Sans bold caps eyebrow, each picked side the L3 line at M44 stacked
   and centred; the meters are the 6 px meter in each team's own primary (text 2 when both share a colour), the losing value in text 2 */
const cmpTile = (act, slot, what) => html`<button class="cmp-tile" data-act="${act}" data-arg="${slot}">${icon('plus')}<span>Pick a ${what}</span></button>`;
const cmpChange = (act, slot) => html`<button class="btn sm ghost" data-act="${act}" data-arg="${slot}">${icon('swap', 'sm')} Change</button>`;
const cmpColors = (ta, tb) => { const ca = ta ? ta.color : 'var(--text)', cb = tb ? tb.color : 'var(--text-2)'; return [ca, cb === ca ? 'var(--text-2)' : cb]; };
function sideP(pid, slot) {
  if (!pid) return cmpTile('cp-pick', slot, 'player');
  return html`<div class="cmp-side"><a data-go="#/player/${pid}">${UI.lk3(pid, { big: true })}</a>${cmpChange('cp-pick', slot)}</div>`;
}
function comparePlayers(st) {
  const head = html`<div class="cmp-head mt12">${sideP(st.a, 'a')}<div class="t-eyebrow">vs</div>${sideP(st.b, 'b')}</div>`;
  if (!st.a || !st.b) return html`${head}<div class="pad mt16 meta center">Pick two players — any positions, any teams.</div>${suggest(st)}`;
  const pa = Dt.player(st.a), pb = Dt.player(st.b);
  const ta = Dt.team(pa.t), tb = Dt.team(pb.t);
  const [ca, cb] = cmpColors(ta, tb);
  const ga = PS.groupOf(st.a), gb = PS.groupOf(st.b);
  const spanSeg = UI.seg([{ k: 'season', l: `${st.s} season` }, { k: 'career', l: 'Career' }], st.span, 'cp-span');
  let sections = [];
  let wins = [0, 0];
  const row = (label, va, vb, fa = v => fmt.n(v), lower) => { if (va > vb) wins[lower ? 1 : 0]++; else if (vb > va) wins[lower ? 0 : 1]++; return UI.cmp(label, fa(va), fa(vb), ca, cb, { lower }); };
  if (st.span === 'season') {
    const T = PS.totals(st.s) || {}; const La = T[st.a], Lb = T[st.b];
    if (!La && !Lb) sections.push(html`<div class="pad mt16">${UI.empty('chart', `No ${st.s} stats for either player`, 'Try another season or the career view.')}</div>`);
    else {
      const z = { cats: {} };
      const A = La || z, B = Lb || z;
      const keys = [...new Set([...(PS.KEY_STATS[ga] || []), ...(PS.KEY_STATS[gb] || [])])];
      const groupsOf = {};
      keys.forEach(k => { const c = PS.STAT[k].cat.split('|')[0]; (groupsOf[c] = groupsOf[c] || []).push(k); });
      sections.push(html`<div class="cmp-sec"><div class="t-eyebrow">Games</div>${row('Games played', A.gp || 0, B.gp || 0)}</div>`);
      for (const c in groupsOf) {
        const extra = { passing: ['cmpPct', 'ypa', 'int'], rushing: ['carries', 'ypc'], receiving: ['tgt', 'ypr', 'catchPct'], defensive: ['qbh', 'pd'] }[c] || [];
        const ks = [...new Set(groupsOf[c].concat(UI.depth() >= 2 ? extra : []))];
        sections.push(html`<div class="cmp-sec"><div class="t-eyebrow">${PS.CAT_NAME[c] || c}</div>${ks.map(k => { const s = PS.STAT[k]; return row(s.l, PS.sval(A, s), PS.sval(B, s), v => PS.fmtStat(v, s), k === 'int' || k === 'sacked'); })}</div>`);
      }
      if (['QB', 'RB', 'WR', 'TE'].includes(ga) && ['QB', 'RB', 'WR', 'TE'].includes(gb)) sections.push(html`<div class="pad mt8 tiny right">Fantasy (PPR): ${fmt.n(A.fpts || 0, 1)} vs ${fmt.n(B.fpts || 0, 1)}</div>`);
    }
  } else {
    const C = NFL.d.careers || {}; const A = C[st.a] || {}, B = C[st.b] || {};
    const cats = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(c => c !== 'scoring');
    if (!cats.length) sections.push(html`<div class="pad mt16">${UI.empty('chart', 'No career stats', '')}</div>`);
    cats.forEach(c => {
      const cc = A[c] || B[c]; const pick = { passing: ['YDS', 'TD', 'INT', 'RTG', 'CMP%'], rushing: ['CAR', 'YDS', 'TD', 'AVG'], receiving: ['REC', 'YDS', 'TD', 'AVG'], defensive: ['TOT', 'SACK', 'INT', 'FF', 'PD'], kicking: ['FGM', 'FG%', 'LNG', 'PTS'], punting: ['PUNTS', 'AVG'] }[c] || cc.l.slice(1, 5);
      const val = (X, lab) => { if (!X[c]) return 0; const i = X[c].l.indexOf(lab); return i < 0 ? 0 : +X[c].tot[i] || 0; };
      const seasons = X => X[c] ? X[c].r.length : 0;
      sections.push(html`<div class="cmp-sec"><div class="t-eyebrow">${PS.CAT_NAME[c] || c} · career</div>${row('Seasons', seasons(A), seasons(B))}${pick.filter(l => cc.l.includes(l)).map(l => row(l, val(A, l), val(B, l), v => fmt.n(v, /%|AVG|RTG/.test(l) ? 1 : 0), l === 'INT' && c === 'passing'))}</div>`);
    });
  }
  const verdict = wins[0] === wins[1] ? 'Dead even' : `${(wins[0] > wins[1] ? pa : pb).ln} leads ${Math.max(...wins)}–${Math.min(...wins)} in these categories`;
  return html`${head}<div class="mt12">${spanSeg}</div>${st.span === 'season' ? html`<div class="mt12">${seasonChips(st.s, 'cp-season')}</div>` : ''}
    <div class="cmp-wins"><span>${pa.ln}</span><span>${verdict}</span><span>${pb.ln}</span></div>${sections}`;
}
function suggest(st) {
  const base = st.a || st.b; const p = base && Dt.player(base);
  const grp = p ? PS.groupOf(base) : 'QB';
  const s = Dt.seasonForStats();
  const key = (PS.KEY_STATS[grp] || ['passYds'])[0];
  const list = PS.ranked(s, key, { grp }).filter(x => x.L.pid !== base).slice(0, 6);
  if (!list.length) return '';
  return html`<div class="sec">${UI.secHead(p ? `Top ${PS.GROUP_NAME[grp]} to compare` : 'Popular comparisons')}<div class="list">${list.map(x => UI.playerRow(x.L.pid, { go: false, right: html`<button class="btn xs ghost" data-act="cp-set" data-arg="${st.a ? 'b' : 'a'}:${x.L.pid}">Add</button>` }))}</div></div>`;
}
function compareTeams(st) {
  const side = (tid, slot) => tid ? html`<div class="cmp-side"><a data-go="#/team/${tid}">${UI.logo(tid, 'lg')}<span class="lk-nm">${Dt.team(tid).name}</span><span class="lk-rec">${Dt.record(tid, st.s).str}</span></a>${cmpChange('cp-tpick', slot)}</div>`
    : cmpTile('cp-tpick', slot, 'team');
  const head = html`<div class="cmp-head mt12">${side(st.ta, 'ta')}<div class="t-eyebrow">vs</div>${side(st.tb, 'tb')}</div>`;
  if (!st.ta || !st.tb) return html`${head}<div class="pad mt16 meta center">Pick two teams.</div>`;
  const A = Dt.teamSeason(st.ta, st.s), B = Dt.teamSeason(st.tb, st.s);
  const [ca, cb] = cmpColors(Dt.team(st.ta), Dt.team(st.tb));
  const c = (l, a, b, f = v => fmt.n(v, 1), lower) => UI.cmp(l, f(a), f(b), ca, cb, { lower });
  const pct = v => fmt.n(v * 100, 1) + '%';
  const h2h = Dt.h2h(st.ta, st.tb).slice(0, 5);
  return html`${head}<div class="mt12">${seasonChips(st.s, 'cp-season')}</div>
    <div class="cmp-sec"><div class="t-eyebrow">Scoring</div>${c('Points per game', A.ppg, B.ppg)}${c('Points allowed', A.papg, B.papg, undefined, true)}${c('Point differential', A.pts - A.ptsA, B.pts - B.ptsA, v => (v > 0 ? '+' : '') + v)}</div>
    <div class="cmp-sec"><div class="t-eyebrow">Offense</div>${c('Yards per game', A.ypg, B.ypg)}${c('Passing yards / game', A.pass / (A.g || 1), B.pass / (B.g || 1))}${c('Rushing yards / game', A.rush / (A.g || 1), B.rush / (B.g || 1))}${c('3rd-down rate', A.thirdPct, B.thirdPct, pct)}${c('Red-zone TD rate', A.rzPct, B.rzPct, pct)}</div>
    <div class="cmp-sec"><div class="t-eyebrow">Defense</div>${c('Yards allowed / game', A.yapg, B.yapg, undefined, true)}${c('Sacks', A.sacks, B.sacks, v => fmt.n(v))}${c('Takeaways', A.toF, B.toF, v => fmt.n(v))}${c('Turnover margin', A.toDiff, B.toDiff, v => (v > 0 ? '+' : '') + v)}</div>
    ${UI.depth() >= 2 ? html`<div class="cmp-sec"><div class="t-eyebrow">Advanced</div>${c(html`${UI.term('EPA', 'EPA')} / play`, A.epaPlay, B.epaPlay, v => sign(v))}${c('Success rate', A.succRate, B.succRate, pct)}${c('Explosive play rate', A.explRate, B.explRate, pct)}${c('Defensive EPA / play', A.dEpaPlay, B.dEpaPlay, v => sign(v), true)}</div>` : ''}
    ${h2h.length ? html`<div class="sec">${UI.secHead('Recent meetings')}<div class="list">${h2h.map(g => UI.gameRow(g, st.ta))}</div></div>` : ''}`;
}
/** player picker sheet with live search */
function pickPlayer(slot) {
  const pg = App.current();
  const list = q => {
    const r = q ? Dt.search(q, 25).players : store.p.players.map(id => ({ id, ...Dt.player(id) })).filter(p => p.n);
    return html`<div class="list">${r.length ? r.map(p => UI.row({ left: UI.hs(p.id, 'sm'), title: p.n, sub: `${p.pos || ''} · ${Dt.team(p.t)?.abbr || ''}`, act: 'cp-set', arg: `${slot}:${p.id}` })) : html`<div class="pad-all meta">${q ? 'No players found' : 'Search any player'}</div>`}</div>`;
  };
  App.sheet({ title: 'Choose a player', full: true, html: html`<div class="pad mb12"><label class="search-field">${icon('search', 'sm')}<input class="cp-q" placeholder="Search players" autofocus></label></div>${!store.p.players.length ? '' : html`<div class="pad eyebrow mb8">Players you follow</div>`}<div class="cp-res">${list('')}</div>`,
    mount(el) { const inp = el.querySelector('.cp-q'); inp.addEventListener('input', () => { el.querySelector('.cp-res').innerHTML = App.val(list(inp.value)); }); setTimeout(() => inp.focus(), 300); } });
  App.store.tmp.cpPage = pg;
}
function pickTeam(slot) {
  App.store.tmp.cpPage = App.current();
  App.sheet({ title: 'Choose a team', html: html`<div class="cmp-team-grid">${Dt.D.teams.map(t => html`<button data-act="cp-tset" data-arg="${slot}:${t.id}">${UI.logo(t.id, 'md')}${t.abbr}</button>`)}</div>` });
}

/* ------------------------------------------------------------------ actions */
const A = App.actions;
const ps = (k, v, reload) => { const pg = App.current(); pg.state[k] = v; if (reload) return Promise.resolve(reload()).then(() => App.refresh(pg)); App.refresh(pg); };
A['stc-season'] = (el, ev, y) => ps('s', +y, () => Dt.ensureBox(+y));
A['sc-cat'] = (el, ev, k) => ps('cat', k);
A['ld-season'] = A['stc-season'];
A['ld-stat'] = (el, ev, k) => ps('stat', k);
A['ld-grp'] = (el, ev, k) => ps('grp', k === 'all' ? '' : k);
A['ld-pick'] = (el, ev, which) => {
  const st = App.current().state;
  const items = which === 's' ? PS.seasonsSoFar().map(y => [String(y), String(y), +y === st.s]) : GROUPS.map(([k, l]) => [k || 'all', k ? l : 'All positions', (st.grp || '') === k]);
  App.sheet({ title: which === 's' ? 'Season' : 'Position', html: html`<div class="list">${items.map(([k, l, on]) => UI.row({ title: l, act: 'ld-set', arg: which + ':' + k, right: on ? icon('check', 'sm') : '' }))}</div>` });
};
A['ld-set'] = (el, ev, arg) => { const [w, k] = arg.split(':'); App.closeSheet(); A[w === 's' ? 'ld-season' : 'ld-grp'](el, ev, k); };
A['tr-season'] = A['stc-season'];
A['tr-set'] = (el, ev, k) => { const pg = App.current(); pg.state.sort = null; pg.state.asc = false; ps('set', k); };
A['tr-sort'] = (el, ev, k) => { const pg = App.current(); if (pg.state.sort === k || (!pg.state.sort && TR_SETS[pg.state.set][0][0] === k)) pg.state.asc = !pg.state.asc; else pg.state.asc = false; ps('sort', k); };
A['sf-preset'] = (el, ev, i) => { const p = PRESETS[+i]; const pg = App.current(); Object.assign(pg.state, { stat: p.stat, grp: p.grp || '', rookie: !!p.rookie, team: '', q: '', s: p.rookie ? Dt.seasonForStats() : pg.state.s }); App.refresh(pg); };
A['sf-rookie'] = () => { const pg = App.current(); ps('rookie', !pg.state.rookie); if (document.querySelector('.sheet .sf-more')) A['sf-more'](); };
A['sf-pick'] = (el, ev, k) => {
  const st = App.current().state;
  const items = k === 'stat' ? PS.STATS.map(x => [x.k, x.l]) : k === 'grp' ? GROUPS.map(([g, l]) => [g || 'all', g ? l : 'All positions']) : k === 's' ? PS.seasonsSoFar().map(y => [String(y), String(y)])
    : [['all', 'All teams'], ...Dt.D.teams.slice().sort((a, b) => a.full.localeCompare(b.full)).map(t => [t.id, t.full])];
  const cur = String(k === 'grp' ? st.grp || 'all' : k === 'team' ? st.team || 'all' : st[k]);
  App.sheet({ title: { stat: 'Stat', grp: 'Position', s: 'Season', team: 'Team' }[k], html: html`<div class="list r-sans">${items.map(([v, l]) => UI.row({ left: k === 'team' && v !== 'all' ? UI.logo(v, 'sm') : '', title: l, act: 'sf-set', arg: k + ':' + v, right: v === cur ? icon('check', 'sm') : '' }))}</div>` });
};
A['sf-set'] = (el, ev, arg) => { const i = arg.indexOf(':'), k = arg.slice(0, i), v = arg.slice(i + 1); App.closeSheet();
  if (k === 's') return ps('s', +v, () => Dt.ensureBox(+v));
  ps(k, (k === 'grp' || k === 'team') && v === 'all' ? '' : v); };
A['sf-more'] = () => { const st = App.current().state;
  App.sheet({ title: 'More filters', html: html`<div class="list sf-more">${UI.row({ title: 'Rookies only', right: UI.toggle(st.rookie, 'sf-rookie') })}
    ${UI.row({ title: 'Minimum games', sub: st.minG ? `At least ${st.minG}` : 'Any', right: html`<span class="flex gap8"><button class="btn sm sq" data-act="sf-min" data-arg="-1" aria-label="Fewer">${icon('minus', 'sm')}</button><button class="btn sm sq" data-act="sf-min" data-arg="1" aria-label="More">${icon('plus', 'sm')}</button></span>` })}</div>` }); };
A['sf-min'] = (el, ev, d) => { const st = App.current().state; st.minG = Math.max(0, Math.min(17, (st.minG || 0) + +d)); App.refresh(); A['sf-more'](); };
A['cp-mode'] = (el, ev, k) => ps('mode', k);
A['cp-span'] = (el, ev, k) => ps('span', k, k === 'career' ? () => App.load('careers') : null);
A['cp-season'] = A['stc-season'];
A['cp-pick'] = (el, ev, slot) => pickPlayer(slot);
A['cp-tpick'] = (el, ev, slot) => pickTeam(slot);
A['cp-set'] = (el, ev, arg) => { const [slot, id] = arg.split(':'); const pg = App.store.tmp.cpPage && App.store.tmp.cpPage.el.isConnected ? App.store.tmp.cpPage : App.current(); App.closeOverlays(true); pg.state[slot] = id; App.refresh(pg); };
A['cp-tset'] = A['cp-set'];
})();
