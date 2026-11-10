/* ============================================================================
   Scores tab: week-by-week scores, standings, playoff picture / bracket /
   Playoff Machine, Multiview and the league calendar.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, fmt, store, time, NFL } = App;
const UI = App.UI, Dt = App.data, A = App.actions;

/* ------------------------------------------------------------------ helpers */
const tmp = store.tmp;
const mine = g => store.p.teams.includes(g.h) || store.p.teams.includes(g.a);
const etHour = ts => +new Date(ts).toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }) % 24;
const primetime = g => etHour(g.ts) >= 19 || g.t === 3;
const SEASONS = [2026, 2025, 2024, 2023, 2022];

function weeksOf(s, now = time.now()) {
  return Dt.D.weeks.filter(w => w.s === s && !(w.t === 3 && w.w === 4) && w.games.some(g => Dt.scheduleVisible(g, now)))
    .sort((a, b) => a.start - b.start);
}
function weekShort(w) {
  if (w.t === 1) return w.w === 1 ? 'HOF' : 'Pre ' + (w.w - 1);
  if (w.t === 3) return { 1: 'Wild Card', 2: 'Divisional', 3: 'Conf', 5: 'Super Bowl' }[w.w];
  return 'Wk ' + w.w;
}
function range(a, b) {
  const o = { month: 'short', day: 'numeric', timeZone: fmt.tz() };
  const x = new Date(a).toLocaleDateString(fmt.locale(), o), y = new Date(b).toLocaleDateString(fmt.locale(), o);
  if (x === y) return x;
  const [m1] = x.split(' '), [m2, d2] = y.split(' ');
  return m1 === m2 ? `${x}–${d2}` : `${x} – ${y}`;
}
/** scores selection survives re-renders, but resets when the time machine moves */
function sel() {
  const tk = time.key + ':' + (time.v || 0);
  if (!tmp.scores || tmp.scores.tk !== tk) {
    const w = Dt.currentWeek();
    tmp.scores = { tk, s: w.s, t: w.t, w: w.w, filter: 'all', view: 'scores' };
  }
  return tmp.scores;
}
function curPage() { return App.current(); }

/* ------------------------------------------------------------------ sub navigation */
function subnav(view) {
  return html`<div class="sc-subnav">${UI.seg([{ k: 'scores', l: App.t('Scores') }, { k: 'standings', l: App.t('Standings') }, { k: 'stats', l: App.t('Stats') }, { k: 'playoffs', l: App.t('Playoffs') }], view, 'sc-view')}</div>`;
}
A['sc-pm'] = () => { const S = sel(); S.view = 'playoffs'; S.poMode = 'machine'; App.refresh(); curPage().el.scrollTop = 0; };
A['sc-view'] = (el, ev, v) => { sel().view = v; App.refresh(); curPage().el.scrollTop = 0; };

/* ================================================================== SCORES */
/** approved round 5: the season picker is a squared chip; each week is Sans bold over its dates in Meta, the live week marked by the Live-red dot */
function weekStrip(S) {
  const weeks = weeksOf(S.s);
  return html`<div class="sc-strip">
    <button class="sc-season" data-act="sc-season">${S.s}${icon('down', 'xs')}</button>
    <div class="sc-weeks">${weeks.map(w => {
      const on = w.t === S.t && w.w === S.w;
      const live = w.games.some(g => Dt.state(g) === 'live');
      return html`<button class="sc-wk ${on ? 'on' : ''}" data-act="sc-week" data-arg="${w.s}-${w.t}-${w.w}">
        <span class="l">${weekShort(w)}${live ? raw('<i class="lk-poss" title="Live"></i>') : ''}</span><span class="t-meta">${range(w.start, w.end)}</span></button>`;
    })}</div></div>`;
}
function filterChips(S, games) {
  const nLive = games.filter(g => Dt.state(g) === 'live').length;
  const items = [{ k: 'all', l: 'All games' }];
  if (store.p.teams.length) items.push({ k: 'mine', l: 'My teams' });
  if (nLive) items.push({ k: 'live', l: `Live · ${nLive}` });
  items.push({ k: 'prime', l: 'Primetime' });
  if (!items.find(i => i.k === S.filter)) S.filter = 'all';
  return UI.chips(items, S.filter, 'sc-filter', 'sc-filters');
}
function scoresList(S) {
  const wk = Dt.week(S.s, S.t, S.w);
  if (!wk) return UI.empty('calendar', 'No games this week');
  let games = wk.games.filter(g => Dt.scheduleVisible(g)).slice().sort((a, b) => a.ts - b.ts);
  const all = games;
  if (S.filter === 'mine') games = games.filter(mine);
  if (S.filter === 'live') games = games.filter(g => Dt.state(g) === 'live');
  if (S.filter === 'prime') games = games.filter(primetime);
  // live games lead the list (my teams first); everything else groups by day, my teams first
  const liveNow = S.filter === 'live' ? [] : games.filter(g => Dt.state(g) === 'live').sort((a, b) => (mine(b) - mine(a)) || a.ts - b.ts);
  if (liveNow.length) games = games.filter(g => !liveNow.includes(g));
  const days = [];
  games.forEach(g => { const k = fmt.dayKey(g.ts); let d = days.find(x => x.k === k); if (!d) days.push(d = { k, ts: g.ts, games: [] }); d.games.push(g); });
  days.forEach(d => d.games.sort((a, b) => (mine(b) - mine(a)) || a.ts - b.ts));
  const live = all.filter(g => Dt.state(g) === 'live');
  const post = all.filter(g => Dt.state(g) === 'post').length;
  const summary = live.length ? `${live.length} live · ${post} final · ${all.length - post - live.length} to come`
    : post === all.length ? `All ${all.length} games final` : post ? `${post} of ${all.length} final` : fmt.plural(all.length, 'game');
  const byes = S.t === 2 ? Dt.D.teams.filter(tm => !wk.games.some(g => g.h === tm.id || g.a === tm.id)) : [];
  return html`
    <div class="sc-week-head pad"><div><div class="h2 display">${Dt.weekLabel(S.t, S.w)}${S.t === 3 && S.w === 5 ? ' ' + Dt.sbNumeral(S.s) : ''}</div><div class="meta mt4">${range(wk.start, wk.end)} · ${summary}</div></div>
      ${live.length > 1 ? html`<button class="btn xs ghost" data-go="#/multiview">${icon('grid', 'sm')}Multiview</button>` : ''}</div>
    ${live.length ? html`<div class="sc-rz">${UI.rzPanel()}</div>` : ''}
    ${liveNow.length ? html`<div class="sc-day sc-live"><div class="sc-day-h"><i class="sc-live-dot"></i>Live now</div>
      <div class="sc-games">${liveNow.map(g => gameItem(g))}</div></div>` : ''}
    ${UI.learnTip(S.t === 2 ? 'Each team plays 17 games over 18 weeks. Tap any game for live stats, plays and where to watch.' : 'Playoffs are single elimination: win and advance, lose and the season is over.')}
    ${days.length || liveNow.length ? days.map(d => html`<div class="sc-day"><div class="sc-day-h">${fmt.dayLong(d.ts)}</div>
      <div class="sc-games">${d.games.map(g => gameItem(g))}</div></div>`) : UI.empty('filter', S.filter === 'mine' ? 'Your teams don\'t play this week' : 'No games match', 'Try another filter.')}
    ${byes.length ? html`<div class="sc-byes pad"><div class="t-eyebrow">On bye</div><div class="flex gap8 wrap mt8">${byes.map(t => html`<a class="sc-bye" data-go="#/team/${t.id}">${UI.logo(t.id, 'sm')}<span class="lk-tri">${t.abbr}</span></a>`)}</div></div>` : ''}
    <div class="sc-more pad">
      <button class="row tap" data-go="#/calendar">${icon('calendar')}<div class="row-main"><div class="row-title">League calendar</div><div class="row-sub">Key dates, holidays, international games</div></div>${icon('chev', 'sm chev')}</button>
      ${S.s === 2026 && S.t === 2 ? html`<button class="row tap" data-act="sc-pm">${icon('trophy')}<div class="row-main"><div class="row-title">Playoff Machine</div><div class="row-sub">Pick the rest of the season, see the seeds</div></div>${icon('chev', 'sm chev')}</button>` : ''}
    </div>`;
}
function gameItem(g) {
  // scores-pass (built Nov 10): the footer's network is the where-to-watch tap (UI.gameCard), so no corner TV button
  return html`<div class="sc-item">${UI.gameCard(g)}</div>`;
}

function scoresView(page) {
  const S = sel();
  const wk = Dt.week(S.s, S.t, S.w) || Dt.currentWeek();
  if (!NFL.d['box-' + S.s] && !page._boxReq) { page._boxReq = 1; Dt.ensureBox(S.s).then(() => page.render()).catch(() => {}); }
  return {
    title: App.t('Scores'), big: true, right: UI.headRight(),
    sub: html`${subnav('scores')}${weekStrip(S)}${filterChips(S, wk.games)}<div style="height:10px"></div>`,
    html: html`<div class="sc-list">${scoresList(S)}</div>`,
    mount(el) {
      // center the selected week; retry while the page is still hidden (offsetWidth 0)
      let n = 0;
      const center = () => {
        const on = el.querySelector('.sc-wk.on'); if (!on) return;
        const strip = on.parentElement;
        if (!strip.offsetWidth && n++ < 20) return setTimeout(center, 150);
        strip.style.scrollBehavior = 'auto';
        strip.scrollLeft = on.offsetLeft - strip.offsetWidth / 2 + on.offsetWidth / 2;
        strip.style.scrollBehavior = '';
      };
      center();
    },
    tick(el) {
      if (!wk.games.some(g => { const st = Dt.state(g); return st === 'live' || (st === 'pre' && g.ts - time.now() < 60e3 && g.st === 'post'); })) return;
      const box = el.querySelector('.sc-list'); if (box) box.innerHTML = App.val(scoresList(S));
    },
  };
}
A['sc-week'] = (el, ev, arg) => { const [s, t, w] = arg.split('-').map(Number); Object.assign(sel(), { s, t, w }); App.refresh(); curPage().el.scrollTop = 0; };
A['sc-filter'] = (el, ev, f) => { sel().filter = f; App.refresh(); };
A['sc-season'] = () => {
  const S = sel();
  App.sheet({ title: 'Season', html: html`<div class="list">${SEASONS.map(s => UI.row({ title: `${s} season`, sub: s === 2026 ? 'In progress' : `Super Bowl ${Dt.sbNumeral(s)}`, act: 'sc-season-pick', arg: s, right: s === S.s ? icon('check', 'sm accent') : '' }))}</div>` });
};
A['sc-season-pick'] = (el, ev, s) => {
  s = +s; App.closeSheet();
  const S = sel(); S.s = s;
  if (S.view === 'scores') {
    const cw = Dt.currentWeek();
    const w = cw.s === s ? cw : (weeksOf(s).find(x => x.t === 2 && x.w === 1) || weeksOf(s)[0]);
    if (w) { S.t = w.t; S.w = w.w; }
  }
  S.stSeason = s; S.poSeason = s;
  App.refresh();
};

/* ------------------------------------------------------------------ where to watch quick sheet */
A['sc-watch'] = (el, ev, gid) => {
  const g = Dt.game(gid), ha = Dt.team(g.h), aa = Dt.team(g.a);
  const seen = new Set(); const opts = Dt.watch(g).filter(o => !seen.has(o.label) && seen.add(o.label));
  const st = Dt.state(g);
  App.sheet({
    titleHtml: html`<div class="flex gap8">${UI.logo(g.a, 'sm')}<span class="h3">${aa.abbr} @ ${ha.abbr}</span>${UI.logo(g.h, 'sm')}</div><div class="tiny mt4">${st === 'live' ? 'Live now' : fmt.dayLong(g.ts) + ' · ' + fmt.time(g.ts) + ' ' + fmt.tzAbbr(g.ts)}${g.vn ? ' · ' + g.vn : ''}</div>`,
    html: html`<div class="pad"><div class="eyebrow mb8">Where to watch for you</div></div>
      <div class="list">${opts.map(o => UI.row({
        left: html`<div class="sc-wopt ${o.ok ? 'ok' : ''}">${icon(o.ok ? 'check' : o.tier === 'tv' ? 'tv' : 'lock', 'sm')}</div>`,
        title: o.label, sub: o.sub, right: o.tier !== 'tv' ? UI.tierBadge(o.tier) : connectable(o) ? html`<span class="btn xs">Connect</span>` : '',
        act: o.ok ? 'sc-watch-go' : connectable(o) ? 'sc-connect' : (o.tier === 'plus' || o.tier === 'premium' ? 'upsell' : 'sc-watch-go'), arg: o.ok ? `${g.id}|${o.k}` : connectable(o) ? `${g.id}|${Dt.provFor(o)}` : (o.tier === 'plus' || o.tier === 'premium' ? o.tier : `${g.id}|${o.k}`),
      }))}</div>
      <div class="pad mt12 tiny">${Dt.isIntl() ? 'Outside the US, every game streams on NFL Game Pass on DAZN.' : Dt.inMarket(g) ? 'This game is on in your local market.' : Dt.nationalWindow(g) ? 'National broadcast — available everywhere in the US.' : 'Out of your local market.'}</div>
      <div class="pad mt16 flex gap8">
        ${st === 'pre' ? html`<button class="btn sm ghost grow" data-act="sc-cal" data-arg="${g.id}">${icon('calendar', 'sm')}Add to calendar</button>` : ''}
        <button class="btn sm ghost grow" data-go="#/settings/providers">${icon('sliders', 'sm')}My services</button>
        <button class="btn sm ghost grow" data-go="#/watch-spots">${icon('users', 'sm')}Watch with fans</button>
      </div>`,
  });
};
const connectable = Dt.connectable;
A['sc-connect'] = (el, ev, arg) => {
  const [gid, pk] = arg.split('|'), P = Dt.PROVIDERS.find(x => x.k === pk);
  App.sheet({ title: `Connect ${P ? P.n : pk}`, html: html`<div class="pad"><p class="meta" style="margin:0">Sign in once and the app opens your games straight into ${P ? P.n : pk}. You can disconnect any time in Settings.</p>
    <button class="btn block mt16" data-act="sc-connect-ok" data-arg="${arg}">${icon('check', 'sm')}Sign in to ${P ? P.n : pk}</button>
    <button class="btn ghost block mt8" data-act="close-sheet">Not now</button></div>` });
};
A['sc-connect-ok'] = (el, ev, arg) => {
  const [gid, pk] = arg.split('|'), P = Dt.PROVIDERS.find(x => x.k === pk);
  store.p.providers = [...new Set([...(store.p.providers || []), pk])]; store.save();
  App.closeOverlays(true); App.refreshAll();
  App.toast({ title: `${P ? P.n : pk} connected`, body: 'Games on it now open right there.', icon: 'check' });
  if (/^#\/game\//.test(App.current().hash)) A['gc-where'](); else A['sc-watch'](null, null, gid);
};
A['sc-watch-go'] = (el, ev, arg) => {
  const [gid, k] = arg.split('|'); const g = Dt.game(gid);
  App.closeSheet();
  if (k === 'redzone') return App.go('#/channel/redzone');
  if ((k === 'nflplus' || k === 'dazn') && Dt.state(g) === 'live') return App.watchGame(gid, true);
  if (k === 'nflplus' || k === 'dazn') return App.video.play({ title: `${Dt.team(g.a).name} at ${Dt.team(g.h).name}`, sub: k === 'redzone' ? 'NFL RedZone' : 'Live game stream', live: gid, kind: 'Live game', tier: k === 'redzone' ? 'premium' : null });
  if (k === 'audio') return App.toast({ title: 'Live audio', body: `${Dt.team(g.h).abbr} home radio call · tap to switch feeds`, icon: 'headphones' });
  App.toast({ title: `Opening ${k}`, body: 'You\'d jump straight to the game in that app.', icon: 'tv' });
};
A['sc-cal'] = (el, ev, gid) => {
  const g = Dt.game(gid); store.p.calAdds = store.p.calAdds || []; if (!store.p.calAdds.includes(gid)) store.p.calAdds.push(gid); store.save();
  App.toast({ title: 'Added to your calendar', body: `${Dt.team(g.a).abbr} @ ${Dt.team(g.h).abbr} · ${fmt.day(g.ts)} ${fmt.time(g.ts)}${g.tv ? ' · ' + g.tv.join('/') : ''}`, icon: 'calendar' });
};

/* ================================================================== STANDINGS */
function seasonDone(s, now = time.now()) {
  const reg = Dt.D.games.filter(g => g.s === s && g.t === 2);
  return reg.length && reg.every(g => Dt.state(g, now) === 'post');
}
function clinchMark(r, done) {
  if (!done) return '';
  if (r.seed === 1) return '*';
  if (r.divWinner) return 'z';
  if (r.inPlayoffs) return 'x';
  return 'e';
}
const pct = v => v.toFixed(3).replace(/^0/, '');
function cols() {
  const d = UI.depth();
  const c = [['W', r => r.w], ['L', r => r.l]];
  if (d >= 2 || true) c.push(['T', r => r.tie]);
  c.push(['PCT', r => pct(r.pct)]);
  if (d >= 2) c.push(['PF', r => r.pf], ['PA', r => r.pa], ['DIFF', r => html`<span class="${r.diff > 0 ? 'c-win' : r.diff < 0 ? 'c-loss' : ''}">${r.diff > 0 ? '+' : ''}${r.diff}</span>`], ['STRK', r => r.streak]);
  if (d >= 3) c.push(['HOME', r => `${r.hw}-${r.hl}`], ['AWAY', r => `${r.aw}-${r.al}`], ['DIV', r => `${r.dw}-${r.dl}`], ['CONF', r => `${r.cw}-${r.cl}`], ['L5', r => html`<span class="st-l5">${r.l5.split('').map(x => html`<i class="${x}"></i>`)}</span>`]);
  return c;
}
function stTable(rows, opts = {}) {
  const C = cols(), done = opts.done;
  return html`<div class="st-card">${opts.title ? html`<div class="st-card-h"><span>${opts.title}</span></div>` : ''}<div class="tbl-wrap st-tbl"><table class="tbl"><thead><tr><th>${opts.label || 'Team'}</th>${C.map(c => html`<th>${c[0]}</th>`)}</tr></thead><tbody>
    ${rows.map((r, i) => {
      const cm = clinchMark(r, done);
      const sep = opts.cut && i === opts.cut ? 'sep' : '';
      const me = r.tid === store.p.primary, hl = me ? 'me' : store.p.teams.includes(r.tid) ? 'hl' : '';
      return html`${opts.cut && i === opts.cut ? html`<tr class="st-cut"><td colspan="${C.length + 1}"><span>${done ? 'Eliminated' : 'In the hunt'}</span></td></tr>` : ''}
      <tr class="${hl} ${sep} tap" data-go="#/team/${r.tid}" ${me ? raw(`style="${App.teamVars(r.t)}"`) : ''}><td><span class="st-team">${opts.seeds ? html`<span class="st-seed">${r.seed}</span>` : ''}${UI.stTeam(r.tid, r.t.abbr, me)}${cm ? html`<sup class="st-cm">${cm}</sup>` : ''}</span></td>${C.map(c => html`<td>${c[1](r)}</td>`)}</tr>`;
    })}</tbody></table></div></div>`;
}
function standingsBody(s, mode) {
  const now = time.now(), st = Dt.standings(s, now), done = seasonDone(s, now);
  const played = st.all.some(r => r.gp);
  if (!played) {
    return UI.empty('calendar', `The ${s} season hasn't started`, `Kickoff is ${fmt.dayLong((Dt.week(s, 2, 1) || {}).start || now)}. Here's how ${s - 1} finished.`, html`<button class="btn sm ghost mt16" data-act="st-season" data-arg="${s - 1}">See ${s - 1} standings</button>`);
  }
  const legend = done ? html`<div class="tiny pad mt12">* home field &amp; bye · z division · x wild card · e eliminated</div>` : '';
  if (mode === 'conf') return html`${['AFC', 'NFC'].map(cf => html`<div class="sec">${stTable(st.conf[cf], { title: cf, seeds: true, cut: 7, done, label: 'Seed · Team' })}</div>`)}${legend}`;
  if (mode === 'league') {
    const rows = st.all.slice().sort((a, b) => b.pct - a.pct || b.diff - a.diff);
    rows.forEach((r, i) => r.lrank = i + 1);
    return html`<div class="sec">${stTable(rows, { title: 'NFL', done })}</div>${legend}`;
  }
  // division (your divisions first)
  const myDivs = store.p.teams.map(id => { const t = Dt.team(id); return t.conf + ' ' + t.div; });
  const names = Object.keys(st.div).sort((a, b) => (myDivs.includes(b) - myDivs.includes(a)) || a.localeCompare(b));
  return html`${names.map(n => html`<div class="sec">${stTable(st.div[n], { title: n, done })}</div>`)}${legend}`;
}
function standingsView(page, pushed) {
  const S = sel();
  const s = S.stSeason || Dt.seasonForStats();
  const mode = S.stMode || 'div';
  const body = html`<div class="st-bar pad"><button class="sc-season" data-act="sc-season">${s}${icon('down', 'xs')}</button>
      <span class="grow"></span><button class="icon-btn" data-act="st-depth" aria-label="Columns">${icon('sliders', 'sm')}</button></div>
      <div class="pad mt8">${UI.seg([['div', 'Division'], ['conf', 'Conference'], ['league', 'League']].map(([k, l]) => ({ k, l })), mode, 'st-mode')}</div>
    ${UI.learnTip('The top team in each of the 4 divisions makes the playoffs, plus 3 wild cards per conference. Tap a team for its schedule and stats.')}
    ${standingsBody(s, mode)}
    <div class="pad mt20"><button class="btn ghost block" data-act="${pushed ? 'st-to-po' : 'sc-view'}" data-arg="playoffs">${icon('trophy', 'sm')}Playoff picture</button></div>`;
  return { title: App.t('Standings'), big: !pushed, back: pushed, right: pushed ? '' : UI.headRight(), sub: pushed ? '' : subnav('standings'), html: body };
}
A['st-mode'] = (el, ev, m) => { sel().stMode = m; App.refresh(); };
A['st-season'] = (el, ev, s) => { sel().stSeason = +s; App.refresh(); };
A['st-depth'] = () => {
  const d = UI.depth();
  App.sheet({ title: 'Columns', html: html`<div class="list">${[[1, 'Simple', 'W-L and win %'], [2, 'Standard', 'Points, differential, streak'], [3, 'Deep', 'Home/away, division, conference, last 5']].map(([k, t, s]) => UI.row({ title: t, sub: s, act: 'st-depth-set', arg: k, right: d === k ? icon('check', 'sm accent') : '' }))}</div>` });
};
A['st-depth-set'] = (el, ev, k) => { store.set({ depth: +k }); App.closeSheet(); App.refreshAll(); };
A['st-to-po'] = () => App.go('#/playoffs');

/* ================================================================== PLAYOFFS */
/** standings with Playoff-Machine picks layered on top of real results */
function standingsWith(s, now, picks) {
  const rows = {};
  Dt.D.teams.forEach(t => rows[t.id] = { t, tid: t.id, w: 0, l: 0, tie: 0, pf: 0, pa: 0, dw: 0, dl: 0, cw: 0, cl: 0, h2h: {} });
  Dt.D.games.forEach(g => {
    if (g.s !== s || g.t !== 2) return;
    let hs, as;
    if (Dt.state(g, now) === 'post') { hs = g.hs; as = g.as; }
    else if (picks[g.id]) { hs = picks[g.id] === g.h ? 1 : 0; as = 1 - hs; }
    else return;
    const th = Dt.team(g.h), ta = Dt.team(g.a), same = th.conf === ta.conf, div = same && th.div === ta.div;
    [[rows[g.h], hs, as, g.a], [rows[g.a], as, hs, g.h]].forEach(([r, us, them, o]) => {
      if (Dt.state(g, now) === 'post') { r.pf += us; r.pa += them; }
      const res = us > them ? 1 : us < them ? -1 : 0;
      r.h2h[o] = (r.h2h[o] || 0) + res;
      if (res > 0) { r.w++; if (div) r.dw++; if (same) r.cw++; } else if (res < 0) { r.l++; if (div) r.dl++; if (same) r.cl++; } else r.tie++;
    });
  });
  const all = Object.values(rows);
  all.forEach(r => { const gp = r.w + r.l + r.tie; r.pct = gp ? (r.w + r.tie / 2) / gp : 0; r.diff = r.pf - r.pa; r.dpct = r.dw + r.dl ? r.dw / (r.dw + r.dl) : 0; r.cpct = r.cw + r.cl ? r.cw / (r.cw + r.cl) : 0; r.str = r.tie ? `${r.w}-${r.l}-${r.tie}` : `${r.w}-${r.l}`; });
  const cmp = (a, b) => b.pct - a.pct || (a.h2h[b.tid] ? -a.h2h[b.tid] : 0) || b.dpct - a.dpct || b.cpct - a.cpct || b.diff - a.diff;
  const conf = {};
  ['AFC', 'NFC'].forEach(cf => {
    const winners = ['East', 'North', 'South', 'West'].map(dv => all.filter(r => r.t.conf === cf && r.t.div === dv).sort(cmp)[0]).sort(cmp);
    const rest = all.filter(r => r.t.conf === cf && !winners.includes(r)).sort(cmp);
    conf[cf] = winners.concat(rest);
    conf[cf].forEach((r, i) => { r.seed = i + 1; r.divWinner = i < 4; });
  });
  return { all, conf };
}
const ROUNDS = [[1, 'Wild Card'], [2, 'Divisional'], [3, 'Conference'], [5, 'Super Bowl']];
function poGames(s, w) { return Dt.D.games.filter(g => g.s === s && g.t === 3 && g.w === w); }
function roundOpen(s, w, now) {
  if (w === 1) return seasonDone(s, now);
  const prev = w === 5 ? 3 : w - 1;
  const pg = poGames(s, prev);
  return pg.length && pg.every(g => Dt.state(g, now) === 'post');
}
function seedOf(conf, tid) { const r = conf.find(x => x.tid === tid); return r ? r.seed : ''; }

function matchup(g, seeds, opts = {}) {
  if (!g) return html`<div class="br-m tbd"><div class="br-t"><span class="br-seed"></span><span class="nm dim">${opts.a || 'TBD'}</span></div><div class="br-t"><span class="br-seed"></span><span class="nm dim">${opts.h || 'TBD'}</span></div></div>`;
  // approved round 5: the status is the L5 pill, each team an L1 line with its seed in Stats bold before it, the loser at 60%
  const S = Dt.score(g), hide = Dt.spoiled(g) && S.st !== 'pre';
  const seedMap = seeds ? { [g.a]: seedOf(seeds, g.a), [g.h]: seedOf(seeds, g.h) } : null;
  const status = S.st === 'pre' ? html`<span class="badge">${fmt.day(g.ts)} · ${fmt.time(g.ts)}</span>` : UI.lk5(S, hide);
  // higher seed (home) listed second
  return html`<a class="br-m tap" data-go="#/game/${g.id}"><div class="br-st">${status}</div>${UI.lk1Game(g, { seeds: seedMap })}</a>`;
}

/** once the field is set, take seeds from the real Wild Card matchups (home = higher seed, 2v7 3v6 4v5),
    which also corrects the simplified tiebreakers in Dt.standings */
function confSeeds(s, conf, now) {
  const st = Dt.standings(s, now), base = st.conf[conf];
  const wc = poGames(s, 1).filter(g => Dt.team(g.h).conf === conf);
  if (!seasonDone(s, now) || wc.length !== 3) return base;
  const dv = poGames(s, 2).filter(g => Dt.team(g.h).conf === conf);
  const inWc = new Set(wc.flatMap(g => [g.h, g.a]));
  const byeId = dv.flatMap(g => [g.h, g.a]).find(id => !inWc.has(id)) || base[0].tid;
  const rank = id => base.findIndex(r => r.tid === id);
  const homes = wc.map(g => g.h).sort((a, b) => rank(a) - rank(b));
  const order = [byeId, ...homes];
  homes.forEach((h, i) => { const g = wc.find(x => x.h === h); order[7 - 1 - i] = g.a; });
  const out = order.map((id, i) => Object.assign({}, base.find(r => r.tid === id), { seed: i + 1, divWinner: i < 4, inPlayoffs: true }));
  return out.concat(base.filter(r => !order.includes(r.tid)).map((r, i) => Object.assign({}, r, { seed: 8 + i, inPlayoffs: false, divWinner: false })));
}
function bracket(s, conf) {
  const now = time.now(), seeds = confSeeds(s, conf, now);
  const inConf = g => Dt.team(g.h).conf === conf;
  const col = (w, label) => {
    const open = roundOpen(s, w, now);
    let games = open ? poGames(s, w).filter(inConf) : [];
    const n = { 1: 3, 2: 2, 3: 1 }[w];
    const tiles = games.sort((a, b) => seedOf(seeds, a.h) - seedOf(seeds, b.h)).map(g => matchup(g, seeds));
    if (w === 1 && !open) [[2, 7], [3, 6], [4, 5]].forEach(([h, a]) => tiles.push(matchup(null, null, { h: projected(seeds, h), a: projected(seeds, a) })));
    while (tiles.length < n) tiles.push(matchup(null, null, w === 2 && tiles.length === 0 ? { h: projected(seeds, 1), a: 'Lowest seed left' } : {}));
    return html`<div class="br-col"><div class="br-h">${label}</div><div class="br-tiles">${w === 1 ? html`<div class="br-bye">${seeds[0] ? html`${UI.logo(seeds[0].tid, 'sm')}<span><b>1</b> ${seeds[0].t.abbr} · bye</span>` : ''}</div>` : ''}${tiles}</div></div>`;
  };
  return html`<div class="br">${col(1, 'Wild Card')}${col(2, 'Divisional')}${col(3, conf + ' Championship')}</div>`;
}
const projected = (seeds, n) => seeds[n - 1] ? `${n} ${seeds[n - 1].t.abbr}` : `#${n}`;
function superBowl(s) {
  const now = time.now();
  const g = roundOpen(s, 5, now) ? poGames(s, 5)[0] : null;
  const num = Dt.sbNumeral(s);
  if (!g) return html`<div class="sb-card"><div class="sb-h">Super Bowl ${num}</div><div class="meta mt8">${s === 2026 ? 'Sun, Feb 14 2027 · SoFi Stadium, Inglewood' : 'Matchup to be decided'}</div></div>`;
  const S = Dt.score(g), hide = Dt.spoiled(g) && S.st !== 'pre';
  const champ = S.final && !hide ? (S.hs > S.as ? g.h : g.a) : null;
  const side = (tid, sc) => html`<div class="sb-team ${champ && champ !== tid ? 'lost' : ''}">${UI.logo(tid, 'lg')}<div class="ab">${Dt.team(tid).abbr}</div>${S.st !== 'pre' ? html`<div class="sc num ${hide ? 'spoiler' : ''}">${hide ? '00' : sc}</div>` : ''}</div>`;
  return html`<a class="sb-card tap" data-go="#/game/${g.id}" style="${raw(champ ? App.teamVars(Dt.team(champ)) : '')}">
    <div class="sb-h">Super Bowl ${num}</div><div class="tiny mt4">${g.vn || ''}${g.vc ? ' · ' + g.vc : ''} · ${fmt.date(g.ts)}</div>
    <div class="sb-row">${side(g.a, S.as)}<div class="sb-mid">${S.st === 'live' ? raw(`<span class="badge live">${esc(S.label)}</span>`) : S.st === 'post' ? (hide ? 'Final' : '') : fmt.time(g.ts)}</div>${side(g.h, S.hs)}</div>
    ${champ ? html`<div class="sb-champ">${icon('trophy', 'sm')} ${Dt.team(champ).full} — champions</div>` : ''}</a>`;
}

function pictureBody(s) {
  const now = time.now(), st = Dt.standings(s, now);
  const played = st.all.some(r => r.gp);
  const yours = store.p.teams.map(id => {
    const cf = Dt.team(id).conf, r = st.conf[cf].find(x => x.tid === id), seventh = st.conf[cf][6];
    let line;
    if (r.seed <= 7) {
      const opp = r.seed === 1 ? null : st.conf[cf][9 - r.seed - 1];
      line = r.seed === 1 ? 'Would earn the only first-round bye and home field' : `Would ${r.seed <= 4 ? 'host' : 'visit'} #${opp.seed} ${opp.t.name} on Wild Card weekend`;
    } else {
      const gb = ((seventh.w - r.w) + (r.l - seventh.l)) / 2;
      line = `${gb <= 0 ? 'Level with' : gb + (gb === 1 ? ' game' : ' games') + ' behind'} #7 ${seventh.t.name}`;
    }
    // approved round 5: an L2 row with a soft seed pill, the bye or the matchup in Meta
    return html`<div class="po-you"><div class="flex between gap8">${UI.lk2(id, { rec: r.str || `${r.w}-${r.l}` })}${r.seed <= 7 ? html`<span class="badge">${r.seed} seed</span>` : ''}</div><div class="t-meta mt8">${line}</div></div>`;
  });
  const confBlock = cf => {
    const L = st.conf[cf];
    // approved round 5: the seed in Stats bold, an L2 line with the division next to the record, your team in its own tint
    const seedRow = r => html`<a class="po-seed tap ${store.p.teams.includes(r.tid) ? 'mine' : ''}" data-go="#/team/${r.tid}" ${store.p.teams.includes(r.tid) ? raw(`style="--po-tint:${(App.teamRoles(r.t) || {}).tint || 'var(--surface-2)'}"`) : ''}><span class="n">${r.seed}</span>${UI.lk2(r.tid, { rec: r.tie ? `${r.w}-${r.l}-${r.tie}` : `${r.w}-${r.l}`, more: r.divWinner ? r.t.div : 'Wild card' })}${r.seed === 1 ? html`<span class="badge">Bye</span>` : ''}</a>`;
    const wc = [[2, 7], [3, 6], [4, 5]];
    return html`<div class="sec"><div class="sec-head"><div class="h2">${cf}</div></div>
      <div class="list po-list">${L.slice(0, 7).map(seedRow)}<div class="po-cut">In the hunt</div>${L.slice(7, 10).map(seedRow)}</div>
      ${UI.depth() >= 2 ? html`<div class="pad mt12"><div class="eyebrow mb8">If the season ended today</div><div class="po-wc">${wc.map(([h, a]) => html`<div class="po-wcm">${UI.logo(L[a - 1].tid, 'sm')}<span class="num">${a}</span><span class="dim">@</span><span class="num">${h}</span>${UI.logo(L[h - 1].tid, 'sm')}</div>`)}</div></div>` : ''}</div>`;
  };
  if (!played) return UI.empty('trophy', 'No games played yet', 'The playoff picture fills in once the season kicks off.');
  return html`${yours.length ? html`<div class="pad mt16 col gap8">${yours}</div>` : ''}${confBlock('AFC')}${confBlock('NFC')}
    <div class="pad mt16"><button class="row tap po-tb" data-act="po-tb">${icon('help')}<div class="row-main"><div class="row-title">How ties are broken</div><div class="row-sub">Head-to-head, division record, conference record…</div></div>${icon('chev', 'sm chev')}</button></div>`;
}

/* ---- Playoff Machine */
function pmPicks(s) { tmp.pm = tmp.pm || {}; return tmp.pm[s] = tmp.pm[s] || {}; }
function remaining(s, now = time.now()) { return Dt.D.games.filter(g => g.s === s && g.t === 2 && Dt.state(g, now) !== 'post').sort((a, b) => a.ts - b.ts); }
function machineBody(s) {
  const now = time.now(), picks = pmPicks(s), rem = remaining(s, now);
  if (!rem.length) return UI.empty('trophy', 'The regular season is over', 'Every game has been decided — see the bracket.');
  const st = standingsWith(s, now, picks);
  const nPicked = rem.filter(g => picks[g.id]).length;
  const byWeek = {};
  rem.forEach(g => (byWeek[g.w] = byWeek[g.w] || []).push(g));
  tmp.pmOpen = tmp.pmOpen || {};
  const firstWk = Math.min(...Object.keys(byWeek).map(Number));
  const seedCol = cf => html`<div class="pm-col"><div class="eyebrow mb8">${cf}</div>${st.conf[cf].slice(0, 7).map(r => html`<div class="pm-seed ${store.p.teams.includes(r.tid) ? 'mine' : ''}"><span class="num n">${r.seed}</span>${UI.logo(r.tid, 'sm')}<span class="grow">${r.t.abbr}</span><span class="num tiny">${r.str}</span></div>`)}</div>`;
  const yours = store.p.teams.map(id => {
    const cf = Dt.team(id).conf, r = st.conf[cf].find(x => x.tid === id);
    const L = st.conf[cf];
    let path;
    if (r.seed === 1) path = `Bye, then hosts the lowest seed left in the Divisional round`;
    else if (r.seed <= 7) { const o = L[9 - r.seed - 1]; path = `Wild Card: ${r.seed <= 4 ? 'hosts' : 'at'} #${o.seed} ${o.t.name}` + (r.seed <= 4 ? '' : ''); }
    else path = `Out at #${r.seed} — ${r.str}`;
    return html`<div class="pm-you">${UI.logo(id, 'sm')}<span class="grow"><b>${Dt.team(id).name}</b> · projected ${r.seed <= 7 ? '#' + r.seed : 'out'}</span><span class="tiny">${path}</span></div>`;
  });
  return html`<div class="pm-panel">
      <div class="pad"><div class="flex between"><div class="h3">Your projection</div><div class="tiny">${nPicked} of ${rem.length} games picked</div></div>
        <div class="flex gap6 mt12"><button class="btn xs ghost" data-act="pm-favs">Favorites</button><button class="btn xs ghost" data-act="pm-sim">${icon('refresh', 'sm')}Sim rest</button><button class="btn xs ghost" data-act="pm-reset">Reset</button></div></div>
      <div class="meter pad-meter"><i style="width:${nPicked / rem.length * 100}%"></i></div>
      ${yours.length ? html`<div class="pad mt12 col gap6">${yours}</div>` : ''}
      <div class="pm-seeds pad mt12">${seedCol('AFC')}${seedCol('NFC')}</div>
    </div>
    ${Object.entries(byWeek).map(([w, games]) => {
      const open = tmp.pmOpen[w] != null ? tmp.pmOpen[w] : +w === firstWk;
      const done = games.filter(g => picks[g.id]).length;
      return html`<div class="pm-week"><button class="pm-wh" data-act="pm-open" data-arg="${w}"><span class="h4 grow">Week ${w}</span><span class="tiny">${done}/${games.length} picked</span>${icon(open ? 'up' : 'down', 'sm')}</button>
        ${open ? html`<div class="pm-games">${games.map(g => {
          const p = picks[g.id];
          const side = tid => html`<button class="pm-side ${p === tid ? 'on' : p ? 'off' : ''}" data-act="pm-pick" data-arg="${g.id}:${tid}">${UI.logo(tid, 'sm')}<span>${Dt.team(tid).abbr}</span><span class="tiny num">${(st.all.find(r => r.tid === tid) || {}).str}</span></button>`;
          return html`<div class="pm-game">${side(g.a)}<span class="pm-at">@</span>${side(g.h)}</div>`;
        })}</div>` : ''}</div>`;
    })}`;
}
A['pm-pick'] = (el, ev, arg) => { const [gid, tid] = arg.split(':'); const s = Dt.game(gid).s; const P = pmPicks(s); P[gid] = P[gid] === tid ? undefined : tid; if (!P[gid]) delete P[gid]; App.refresh(); };
A['pm-open'] = (el, ev, w) => { tmp.pmOpen = tmp.pmOpen || {}; const rem = remaining(poSeason()); const first = Math.min(...rem.map(g => g.w)); const cur = tmp.pmOpen[w] != null ? tmp.pmOpen[w] : +w === first; tmp.pmOpen[w] = !cur; App.refresh(); };
A['pm-reset'] = () => { tmp.pm[poSeason()] = {}; App.refresh(); App.toast({ title: 'Picks cleared', icon: 'refresh' }); };
A['pm-sim'] = () => {
  const s = poSeason(), P = pmPicks(s), now = time.now(), st = Dt.standings(s, now);
  const pctOf = tid => { const r = st.all.find(x => x.tid === tid); return r.gp ? r.pct : .5; };
  remaining(s, now).forEach(g => { if (P[g.id]) return; const ph = pctOf(g.h) + .06, pa = pctOf(g.a); P[g.id] = Math.random() < ph / (ph + pa || 1) ? g.h : g.a; });
  App.refresh(); App.toast({ title: 'Simulated the rest of the season', body: 'Based on each team\'s record so far, with a little home-field edge.', icon: 'refresh' });
};
A['pm-favs'] = () => {
  const s = poSeason(), P = pmPicks(s), now = time.now(), st = Dt.standings(s, now);
  const pctOf = tid => st.all.find(x => x.tid === tid).pct;
  remaining(s, now).forEach(g => { if (!P[g.id]) P[g.id] = pctOf(g.h) >= pctOf(g.a) ? g.h : g.a; });
  App.refresh(); App.toast({ title: 'Picked every favorite', body: 'Better record wins; ties go to the home team.', icon: 'check' });
};
A['po-tb'] = () => App.sheet({ title: 'How ties are broken', html: html`<div class="pad article-body" style="font-size:15px">
  <p>When teams finish with the same record, the NFL goes down a list until one comes out ahead:</p>
  <ol style="padding-left:20px;margin:0 0 12px"><li><b>Head-to-head</b> — who won when they played each other.</li><li><b>Division record</b> (for teams in the same division).</li><li><b>Common games</b> — record against shared opponents.</li><li><b>Conference record</b>.</li><li><b>Strength of victory</b> — how good the teams you beat were.</li><li><b>Strength of schedule</b>, then point-differential rankings… and eventually a coin toss.</li></ol>
  <p class="meta">This app applies head-to-head, division, conference and point differential, which settles almost every real race. The official procedure has 12 steps.</p></div>` });

function poSeason() {
  const S = sel();
  if (S.poSeason) return S.poSeason;
  const now = time.now(), d = new Date(now), y = d.getUTCFullYear();
  return d.getUTCMonth() < 7 ? y - 1 : y;   // Jan–Jul: last season's playoffs
}
function playoffsView(page, pushed) {
  const S = sel(), s = poSeason(), now = time.now();
  const done = seasonDone(s, now);
  const hasPost = poGames(s, 1).some(g => Dt.state(g, now) !== 'pre') || done;
  const rem = s === 2026 && remaining(s, now).length;
  const modes = [];
  if (!done) modes.push(['picture', 'Picture']);
  modes.push(['bracket', 'Bracket']);
  if (rem) modes.push(['machine', 'Machine']);
  let mode = S.poMode && modes.some(m => m[0] === S.poMode) ? S.poMode : (hasPost ? 'bracket' : 'picture');
  const conf = S.poConf || (store.p.primary ? Dt.team(store.p.primary).conf : 'AFC');
  let body;
  if (mode === 'picture') body = pictureBody(s);
  else if (mode === 'machine') body = html`${UI.learnTip('Tap the team you think wins each game. Seeds update instantly.')}${machineBody(s)}`;
  else body = html`<div class="pad mt12">${UI.seg([{ k: 'AFC', l: 'AFC' }, { k: 'NFC', l: 'NFC' }], conf, 'po-conf')}</div>
    ${!done ? html`<div class="notice mt12">${icon('info', 'sm')}<span>Projected from today's standings — the bracket locks after Week 18.</span></div>` : ''}
    <div class="br-scroll">${bracket(s, conf)}</div><div class="pad">${superBowl(s)}</div>`;
  const bar = html`<div class="st-bar pad"><button class="sc-season" data-act="sc-season">${s}${icon('down', 'xs')}</button>
    </div>${modes.length < 2 ? '' : html`<div class="pad mt8">${UI.seg(modes.map(([k, l]) => ({ k, l })), mode, 'po-mode')}</div>`}`;
  return { title: App.t('Playoffs'), big: !pushed, back: pushed, right: pushed ? '' : UI.headRight(), sub: pushed ? '' : subnav('playoffs'), html: html`${bar}${body}`,
    tick(el, pg) { if (mode === 'bracket' && poGames(s, 1).concat(poGames(s, 2), poGames(s, 3), poGames(s, 5)).some(g => Dt.state(g) === 'live')) pg.render(); } };
}
A['po-mode'] = (el, ev, m) => { sel().poMode = m; App.refresh(); };
A['po-conf'] = (el, ev, c) => { sel().poConf = c; App.refresh(); };

/* ================================================================== routes */
App.route('scores', (params, query, page) => {
  const S = sel();
  if (query.s) { S.s = +query.s; S.t = +(query.t || 2); S.w = +(query.w || 1); }
  if (S.view === 'standings') return standingsView(page);
  if (S.view === 'playoffs') return playoffsView(page);
  if (S.view === 'stats') return App.statsView(page, { title: App.t('Stats'), big: true, right: UI.headRight(), sub: subnav('stats') });
  return scoresView(page);
});
App.route('standings', (p, q, page) => standingsView(page, true));
App.route('playoffs', (p, q, page) => { if (q.mode) sel().poMode = q.mode; return playoffsView(page, true); });

/* ================================================================== MULTIVIEW */
/** multiview tile (approved round 5): the L5 Live pill, a soft "Red zone" pill (no outline), each team an L1 line with the Live-red
    possession dot, the approved field, then the down and distance */
function mvTile(g) {
  const S = Dt.score(g), hide = Dt.spoiled(g);
  const L = S.L;
  return html`<a class="mv-tile tap" data-go="#/game/${g.id}">
    <div class="flex between">${UI.lk5(S, hide)}${S.redzone && !hide ? raw('<span class="badge loss">Red zone</span>') : ''}</div>
    <div class="mt8">${UI.lk1Game(g)}</div>
    ${S.st === 'live' && !hide ? html`<div class="mt8">${UI.fieldViz(g, { L, compact: true }) || ''}</div>
      <div class="mv-dd mt6">${S.dd || ''}</div>` : html`<div class="t-meta mt8">${hide ? 'Spoiler shield on' : ''}</div>`}</a>`;
}
App.route('multiview', (p, q, page) => {
  const live = Dt.liveGames();
  tmp.mv = (tmp.mv || []).filter(id => live.some(g => g.id === id));
  if (!tmp.mv.length) tmp.mv = live.slice().sort((a, b) => mine(b) - mine(a)).slice(0, 4).map(g => g.id);
  const chosen = tmp.mv.map(id => Dt.game(id));
  const grid = () => html`<div class="mv-grid ${chosen.length <= 2 ? 'one' : ''}">${chosen.map(mvTile)}</div>`;
  if (!live.length) return { title: 'Multiview', back: true, html: UI.empty('grid', 'No games are live right now', 'Multiview follows up to four live games at once.', html`<button class="btn primary mt16" data-act="sc-jump" data-arg="gameday">${icon('clock', 'sm')}Jump to a live Sunday</button>`) };
  return {
    title: 'Multiview', back: true,
    sub: html`<div class="chips mv-chips">${live.map(g => html`<button class="chip ${tmp.mv.includes(g.id) ? 'on' : ''}" data-act="mv-toggle" data-arg="${g.id}">${Dt.team(g.a).abbr} @ ${Dt.team(g.h).abbr}</button>`)}</div><div style="height:10px"></div>`,
    html: html`<div class="pad mt12 tiny">Following ${chosen.length} of ${live.length} live games · updates every play</div><div class="mv-body">${grid()}</div>
      <div class="pad mt16">${UI.lockNote('premium', 'Watching every touchdown live on NFL RedZone')}</div>`,
    tick(el) { const b = el.querySelector('.mv-body'); if (b) b.innerHTML = App.val(grid()); },
  };
});
A['mv-toggle'] = (el, ev, gid) => {
  const i = tmp.mv.indexOf(gid);
  if (i >= 0) { if (tmp.mv.length > 1) tmp.mv.splice(i, 1); }
  else { if (tmp.mv.length >= 4) { App.toast({ title: 'Multiview shows up to 4 games', body: 'Remove one first.', icon: 'grid' }); return; } tmp.mv.push(gid); }
  App.refresh();
};
A['sc-jump'] = (el, ev, k) => App.time.set(k);

/* ================================================================== CALENDAR */
function calEvents() {
  const ev = [];
  const add = (d, title, sub, kind, extra = {}) => ev.push({ ts: typeof d === 'number' ? d : Date.parse(d), title, sub, kind, ...extra });
  const raw26 = NFL.d.core.games.filter(g => g.s === 2026);
  const sb60 = Dt.D.games.find(g => g.s === 2025 && g.t === 3 && g.w === 5);
  if (sb60) add(sb60.ts, 'Super Bowl LX', `${Dt.team(sb60.a).abbr} vs ${Dt.team(sb60.h).abbr} · ${sb60.vn}`, 'post', { gid: sb60.id });
  add('2026-02-26T14:00:00Z', 'Scouting Combine', 'Indianapolis · Feb 23 – Mar 2', 'off', { approx: 1 });
  add('2026-03-09T16:00:00Z', 'Free-agent negotiating window opens', 'Teams may talk with pending free agents', 'off');
  add('2026-03-11T20:00:00Z', 'New league year · free agency begins', '4 PM ET — signings and trades become official', 'off');
  add('2026-04-24T00:00:00Z', '2026 NFL Draft', 'Pittsburgh · Apr 23–25', 'off', { go: '#/draft' });
  add(Dt.SCHEDULE_RELEASE - 3600e3 * 4, '2026 schedule release', 'All 272 games revealed', 'off', { approx: 1 });
  add('2026-07-21T14:00:00Z', 'Training camps open', 'Rookies report first; veterans about a week later', 'off', { approx: 1 });
  const hof = raw26.find(g => g.t === 1 && g.w === 1);
  if (hof && Dt.team(hof.h)) add(Date.parse(hof.d), 'Hall of Fame Game', `${Dt.team(hof.a).abbr} vs ${Dt.team(hof.h).abbr} · Canton, Ohio`, 'game', { gid: hof.id });
  add('2026-08-25T20:00:00Z', 'Roster cut-down to 53', '4 PM ET', 'off', { approx: 1 });
  const k = raw26.filter(g => g.t === 2 && g.w === 1).sort((a, b) => a.d.localeCompare(b.d))[0];
  if (k) add(Date.parse(k.d), 'Kickoff', `${Dt.team(k.a).name} at ${Dt.team(k.h).name} — the 2026 opener`, 'game', { gid: k.id, big: 1 });
  Dt.D.games.filter(g => g.s === 2026 && g.ns && g.t === 2).forEach(g => add(g.ts, g.note ? g.note.replace(/^NFL /, '').replace(/ Games?$/, '') + ' game' : 'International game', `${Dt.team(g.a).abbr} vs ${Dt.team(g.h).abbr} · ${g.vn}`, 'intl', { gid: g.id }));
  add('2026-11-03T21:00:00Z', 'Trade deadline', 'Typically the Tuesday after Week 9', 'off', { approx: 1, go: '#/transactions' });
  const holi = (from, to, title) => {
    const gs = Dt.D.games.filter(g => g.s === 2026 && g.ts >= Date.parse(from) && g.ts < Date.parse(to));
    if (gs.length) add(gs[0].ts, title, gs.map(g => `${Dt.team(g.a).abbr} @ ${Dt.team(g.h).abbr}`).join(' · '), 'game', { gid: gs[0].id });
  };
  holi('2026-11-26T08:00:00Z', '2026-11-27T10:00:00Z', 'Thanksgiving');
  holi('2026-11-27T10:00:00Z', '2026-11-28T08:00:00Z', 'Black Friday');
  holi('2026-12-25T08:00:00Z', '2026-12-26T10:00:00Z', 'Christmas');
  const w18 = raw26.filter(g => g.t === 2 && g.w === 18).sort((a, b) => a.d.localeCompare(b.d))[0];
  if (w18) add(Date.parse(w18.d), 'Week 18', 'The final weekend of the regular season', 'game', { approx: 1 });
  [['1', 'Wild Card weekend'], ['2', 'Divisional round'], ['3', 'Conference Championships']].forEach(([w, t]) => {
    const g = raw26.filter(x => x.t === 3 && x.w === +w).sort((a, b) => a.d.localeCompare(b.d))[0];
    if (g) add(Date.parse(g.d) + 18 * 3600e3, t, 'Matchups set by the regular season', 'post', { approx: 1 });
  });
  add('2027-02-03T00:00:00Z', 'Pro Bowl Games', 'AFC vs NFC skills & flag football', 'off', { approx: 1 });
  const sb61 = raw26.find(x => x.t === 3 && x.w === 4 && /Super Bowl/.test(x.note || ''));
  add(sb61 ? Date.parse(sb61.d) : Date.parse('2027-02-14T23:30:00Z'), 'Super Bowl LXI', 'SoFi Stadium · Inglewood, California', 'post', { big: 1 });
  add('2027-03-10T20:00:00Z', '2027 league year & free agency', 'Exact date announced in the spring', 'off', { approx: 1 });
  add('2027-04-22T23:00:00Z', '2027 NFL Draft', 'Washington, D.C.', 'off', { approx: 1 });
  // followed teams: byes and openers
  store.p.teams.forEach(tid => {
    const tm = Dt.team(tid);
    const games = Dt.D.games.filter(g => g.s === 2026 && g.t === 2 && (g.h === tid || g.a === tid));
    const weeks = new Set(games.map(g => g.w));
    for (let w = 1; w <= 18; w++) if (!weeks.has(w)) { const wk = Dt.week(2026, 2, w); if (wk) add(wk.start, `${tm.name} bye`, `Week ${w} — no game`, 'mine', { tid }); }
    const op = games.sort((a, b) => a.ts - b.ts)[0];
    if (op) add(op.ts, `${tm.name} season opener`, `${Dt.isHome(op, tid) ? 'vs' : 'at'} ${Dt.team(Dt.opp(op, tid)).name}`, 'mine', { tid, gid: op.id });
  });
  return ev.sort((a, b) => a.ts - b.ts);
}
App.route('calendar', () => {
  const f = tmp.calF || 'all', now = time.now();
  let ev = calEvents();
  if (f === 'games') ev = ev.filter(e => e.kind === 'game' || e.kind === 'intl' || e.kind === 'post');
  if (f === 'off') ev = ev.filter(e => e.kind === 'off');
  if (f === 'mine') ev = ev.filter(e => e.kind === 'mine' || (e.gid && mine(Dt.game(e.gid) || {})));
  const months = [];
  ev.forEach(e => { const k = new Date(e.ts).toLocaleDateString(fmt.locale(), { month: 'long', year: 'numeric', timeZone: fmt.tz() }); let m = months.find(x => x.k === k); if (!m) months.push(m = { k, ev: [] }); m.ev.push(e); });
  const added = store.p.calAdds || [];
  let markerDone = false;
  const item = (e, i) => {
    const past = e.ts < now;
    let marker = '';
    if (!past && !markerDone) { markerDone = true; marker = html`<div class="cal-today"><span>Today · ${fmt.day(now)}</span></div>`; }
    const d = new Date(e.ts);
    const key = 'ev' + e.ts + e.title;
    const tm = e.tid ? Dt.team(e.tid) : e.gid && Dt.game(e.gid) ? null : null;
    return html`${marker}<div class="cal-ev ${past ? 'past' : ''} ${e.big ? 'big' : ''}" ${raw(e.gid ? `data-go="#/game/${e.gid}"` : e.go ? `data-go="${e.go}"` : '')}>
      <div class="cal-d"><div class="dw">${d.toLocaleDateString(fmt.locale(), { weekday: 'short', timeZone: fmt.tz() })}</div><div class="dn num">${d.toLocaleDateString(fmt.locale(), { day: 'numeric', timeZone: fmt.tz() })}</div></div>
      <div class="grow"><div class="h4">${e.title}</div><div class="meta mt4">${e.sub}${e.gid ? ` · ${fmt.time(e.ts)} ${fmt.tzAbbr(e.ts)}` : ''}${e.approx ? ' · approx.' : ''}</div></div>
      ${past ? html`<span class="t-meta cal-done">Done</span>` : html`<button class="icon-btn" data-act="cal-add" data-arg="${esc(key)}|${esc(e.title)}" aria-label="Add to calendar">${icon(added.includes(key) ? 'check' : 'plus', 'sm')}</button>`}</div>`;
  };
  const chipsL = [{ k: 'all', l: 'Everything' }, { k: 'games', l: 'Games' }, { k: 'off', l: 'Offseason' }];
  if (store.p.teams.length) chipsL.push({ k: 'mine', l: 'My teams' });
  return {
    title: 'League calendar', back: true,
    sub: html`<div class="pad sq-chips">${chipsL.map(c => html`<button class="sc-season ${c.k === f ? 'on' : ''}" data-act="cal-f" data-arg="${c.k}">${c.l}</button>`)}</div><div style="height:10px"></div>`,
    html: html`${months.map(m => {
      // if "today" falls right before this month's first event, show the marker above the month heading
      let pre = '';
      if (!markerDone && m.ev[0].ts >= now) { markerDone = true; pre = html`<div class="cal-today cal-today-sec"><span>Today · ${fmt.day(now)}</span></div>`; }
      return html`${pre}<div class="sec"><div class="sec-head"><div class="h2">${m.k}</div></div><div class="list cal-list">${m.ev.map(item)}</div></div>`;
    })}
      <div class="pad mt16"><button class="btn ghost block" data-act="cal-sub">${icon('calendar', 'sm')}Subscribe to the whole calendar</button><div class="tiny center mt8">Times shown in ${fmt.tzAbbr(now)}. Dates marked approx. are typical but not yet announced.</div></div>`,
    mount(el) { const t = el.querySelector('.cal-today'); if (t) el.scrollTop = Math.max(0, t.offsetTop - 140); },
  };
});
A['cal-f'] = (el, ev, f) => { tmp.calF = f; App.refresh(); };
A['cal-add'] = (el, ev, arg) => {
  const [key, title] = arg.split('|'); store.p.calAdds = store.p.calAdds || [];
  const i = store.p.calAdds.indexOf(key);
  if (i >= 0) store.p.calAdds.splice(i, 1); else store.p.calAdds.push(key);
  store.save(); App.refresh();
  App.toast({ title: i >= 0 ? 'Removed from calendar' : 'Added to your calendar', body: i >= 0 ? '' : title, icon: 'calendar' });
};
A['cal-sub'] = () => App.toast({ title: 'Subscribed', body: 'Key dates and your teams\' games will appear in your phone\'s calendar and update automatically.', icon: 'calendar' });
})();
