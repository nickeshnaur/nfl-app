/* ============================================================================
   Offseason: Draft center (+ Draft Night live playback), mock draft,
   free agency tracker, transactions wire, contracts & cap views.
   Draft picks, transactions and contracts are real (ESPN snapshot).
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, fmt, store, time, esc } = App;
const UI = App.UI, Dt = App.data;
const sh = (...a) => html`<div class="sec">${UI.secHead(...a)}</div>`;

/* ------------------------------------------------------------------ draft timing (2026 draft, Pittsburgh) */
const DRAFT = {
  2024: { city: 'Detroit', start: Date.parse('2024-04-26T00:00:00Z') },
  2025: { city: 'Green Bay', start: Date.parse('2025-04-25T00:00:00Z') },
  2026: { city: 'Pittsburgh', start: Date.parse('2026-04-24T00:00:00Z') },
};
const R1 = Date.parse('2026-04-24T00:00:00Z'), R2 = Date.parse('2026-04-24T23:00:00Z'), R4 = Date.parse('2026-04-25T16:00:00Z');
/** when a pick is announced (approximate cadence: 8 min in R1, 6 in R2, 5 in R3, 4 in R4–7) */
function revealAt(y, pk) {
  if (y !== 2026) return DRAFT[y].start;
  if (pk.r === 1) return R1 + (pk.o - 1) * 8 * 60e3;
  const picks = Dt.D.core.drafts[2026];
  const firstOf = r => (picks.find(x => x.r === r) || {}).o || 1;
  if (pk.r === 2) return R2 + (pk.o - firstOf(2)) * 6 * 60e3;
  if (pk.r === 3) return R2 + 32 * 6 * 60e3 + 10 * 60e3 + (pk.o - firstOf(3)) * 5 * 60e3;
  return R4 + (pk.o - firstOf(4)) * 4 * 60e3;
}
const revealed = (y, pk, now = time.now()) => revealAt(y, pk) <= now;
function defaultDraftYear(now = time.now()) { return now >= R1 - 7 * 864e5 ? 2026 : 2025; }
const htStr = h => h ? `${Math.floor(h / 12)}'${Math.round(h % 12)}"` : '';

App.route('draft', (p, q, page) => {
  const now = time.now();
  const st = page.state = page.state || { y: +q.y || defaultDraftYear(now), r: 1, team: 'all' };
  const y = st.y, picks = Dt.D.core.drafts[y] || [];
  const live = y === 2026 && now >= R1 - 3600e3 && now < R4 + 300 * 4 * 60e3;
  const done = picks.filter(pk => revealed(y, pk, now));
  const upcoming = y === 2026 && now < R1;
  const onClock = picks.find(pk => !revealed(y, pk, now));
  const last = done[done.length - 1];
  const mine = store.p.teams;
  page.state.nDone = done.length;
  const rounds = [...new Set(picks.map(x => x.r))];
  let list = picks.filter(pk => pk.r === st.r);
  if (st.team === 'mine') list = picks.filter(pk => mine.includes(pk.t));
  // position counts among revealed picks
  const posCount = {}; done.forEach(pk => { const ps = (pk.pos || '?').replace(/^(OT|OG|G|C|IOL)$/, 'OL').replace(/^(DT|NT|DE|DL)$/, 'DL'); posCount[ps] = (posCount[ps] || 0) + 1; });
  const posTop = Object.entries(posCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxPos = posTop[0] ? posTop[0][1] : 1;
  const yourPicks = picks.filter(pk => store.p.primary && pk.t === store.p.primary);

  return { title: `${y} NFL Draft`, html: html`
    <div class="pad mt8"><button class="sc-season" data-act="dr-year-sheet">${y}${icon('down', 'xs')}</button></div>
    ${upcoming ? html`<div class="pad mt16"><div class="card pad-all ox-count">
        <div class="eyebrow">Round 1 · ${DRAFT[2026].city}</div>
        <div class="h1 mt8 num">${fmt.until(R1)}</div>
        <div class="meta mt8">Until the first pick. The order below is set; names appear as picks are made.</div></div></div>` : ''}
    ${live && onClock ? html`<div class="pad mt16"><div class="card ox-clock" style="${raw(App.teamVars(Dt.team(onClock.t)))}">
        <div class="ox-clock-top"><span class="badge live">On the clock</span><span class="num ox-timer" data-due="${revealAt(y, onClock)}">${clockLeft(revealAt(y, onClock), now)}</span></div>
        <div class="flex gap12 mt12">${UI.logo(onClock.t, 'lg')}<div class="grow"><div class="h2 display" style="color:#fff">${Dt.team(onClock.t).name}</div>
          <div class="meta" style="color:rgba(255,255,255,.75)">Round ${onClock.r}, pick ${onClock.p} · #${onClock.o} overall${onClock.tn ? ' · ' + onClock.tn : ''}</div></div></div>
        ${last ? html`<div class="ox-last mt12"><span class="tiny" style="color:rgba(255,255,255,.7)">Last pick</span> <b>#${last.o} ${Dt.team(last.t).abbr}</b> — ${last.n}, ${last.pos}, ${last.col || ''}</div>` : ''}
      </div></div>` : ''}
    ${!upcoming ? html`<div class="pad mt16">${UI.statRow([[`${done.length}/${picks.length}`, 'Picks made'], [posTop[0] ? posTop[0][0] : '—', 'Top position'], [new Set(done.map(x => x.col)).size, 'Schools']])}</div>` : ''}
    ${yourPicks.length ? html`${sh(`${Dt.team(store.p.primary).name} picks`)}
      <div class="hscroll">${yourPicks.map(pk => pickCard(y, pk, now))}</div>` : ''}
    ${posTop.length ? html`${sh('By position')}<div class="pad ox-pos">${posTop.map(([ps, n]) => html`<div class="ox-pos-row"><span class="b">${ps}</span><div class="meter grow"><i style="width:${n / maxPos * 100}%;background:${(Dt.team(store.p.primary) || {}).color || 'var(--text)'}"></i></div><b class="ox-n">${n}</b></div>`)}</div>` : ''}
    ${sh('Draft board')}
    ${UI.chips([...rounds.map(r => ({ k: 'r' + r, l: 'Round ' + r })), ...(mine.length ? [{ k: 'mine', l: 'My teams' }] : [])], st.team === 'mine' ? 'mine' : 'r' + st.r, 'dr-round')}
    <div class="list mt12">${list.map(pk => pickRow(y, pk, now, onClock))}</div>
    <div class="pad mt16 flex gap8 wrap"><button class="btn sm ghost" data-go="#/mock-draft">${icon('edit', 'sm')} Build a 2027 mock</button></div>`,
    tick(el, pg, nowT) {
      const t = el.querySelector('.ox-timer'); if (t) t.textContent = clockLeft(+t.dataset.due, nowT);
      const n = picks.filter(pk => revealed(y, pk, nowT)).length;
      if (n !== pg.state.nDone) App.refresh(pg);
    } };
});
function clockLeft(due, now) { const s = Math.max(0, Math.round((due - now) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function pickRow(y, pk, now, onClock) {
  const shown = revealed(y, pk, now);
  const isClock = onClock === pk;
  const has = shown && pk.pid && Dt.player(pk.pid);
  return html`<div class="row ${has ? 'tap' : 'static'} ${isClock ? 'ox-onclock' : ''}" ${has ? raw(`data-go="#/player/${pk.pid}"`) : ''}>
    <div class="ox-ov num">${pk.o}</div>${UI.logo(pk.t, 'md')}
    <div class="row-main">${shown ? html`<div class="row-title">${pk.n}</div><div class="row-sub">${[pk.pos, pk.col, htStr(pk.ht), pk.wt ? pk.wt + ' lbs' : ''].filter(Boolean).join(' · ')}</div>`
      : html`<div class="row-title ${isClock ? '' : 'dim'}">${isClock ? 'On the clock' : Dt.team(pk.t).full}</div><div class="row-sub">${isClock ? Dt.team(pk.t).full : 'Pick ' + pk.p}</div>`}
      ${pk.tn ? html`<div class="tiny mt4">${pk.tn}</div>` : ''}</div>${has ? icon('chev', 'sm chev') : ''}</div>`;
}
/** pick card (approved round 5): "Round 1 · Pick 6" on its own line and the Traded pill under it, the L64 headshot, the name over "CB · LSU" */
function pickCard(y, pk, now) {
  const shown = revealed(y, pk, now);
  return html`<a class="card ox-pick tap" ${shown && pk.pid ? raw(`data-go="#/player/${pk.pid}"`) : ''}>
    <span class="t-eyebrow">Round ${pk.r} · Pick ${pk.o}</span>${pk.tr ? html`<span class="badge mt6">Traded</span>` : ''}
    ${shown ? html`${pk.pid ? UI.hs(pk.pid, 'lg') : html`<div class="hs lg hs-fallback" style="background:var(--team)">${pk.pos}</div>`}<div class="lk-pn mt8 clamp2">${pk.n}</div><div class="t-meta">${pk.pos} · ${pk.col || ''}</div>`
      : html`<div class="hs lg hs-fallback" style="background:var(--surface-3)">?</div><div class="lk-pn mt8 dim">Pick ${pk.p}</div><div class="t-meta">${y === 2026 ? fmt.day(revealAt(y, pk)) : ''}</div>`}</a>`;
}
App.actions['dr-year-sheet'] = () => App.sheet({ title: 'Draft year', html: html`<div class="list">${[2026, 2025, 2024].map(k => UI.row({ title: `${k} NFL Draft`, act: 'dr-year', arg: k, right: k === App.current().state.y ? icon('check', 'sm accent') : '' }))}</div>` });
App.actions['dr-year'] = (el, ev, y) => { App.closeSheet(); const s = App.current().state; s.y = +y; s.r = 1; s.team = 'all'; App.refresh(); };
App.actions['dr-round'] = (el, ev, k) => { const s = App.current().state; if (k === 'mine') s.team = 'mine'; else { s.team = 'all'; s.r = +k.slice(1); } App.refresh(); };

/* ------------------------------------------------------------------ mock draft (2027 Round 1) */
// Prototype prospects — fictional players for the mock-draft sandbox (not real people).
const PROSPECTS = [
  ['Jalen Whitaker', 'QB', 'Texas'], ['Marcus Odell', 'EDGE', 'Ohio State'], ['DeShawn Kellum', 'OT', 'Georgia'], ['Tavian Brooks', 'WR', 'LSU'],
  ['Caleb Rourke', 'QB', 'Oregon'], ['Isaiah Montero', 'CB', 'Alabama'], ['Grant Feeney', 'OT', 'Michigan'], ['Kobe Lassiter', 'DT', 'Clemson'],
  ['Andre Vaughn', 'S', 'Miami'], ['Tre Hollis', 'WR', 'USC'], ['Malik Dupree', 'EDGE', 'Penn State'], ['Bryce Tolliver', 'RB', 'Notre Dame'],
  ['Elijah Crum', 'CB', 'Florida State'], ['Nate Kowalski', 'IOL', 'Iowa'], ['Jordan Pace', 'LB', 'Texas A&M'], ['Cam Ridley', 'TE', 'Tennessee'],
  ['Darius Fenn', 'DT', 'Ole Miss'], ['Xavier Lyle', 'WR', 'Washington'], ['Luke Brennan', 'QB', 'Miami'], ['Omar Haskins', 'EDGE', 'Oklahoma'],
  ['Reggie Tate', 'CB', 'Georgia'], ['Wes Calloway', 'OT', 'Notre Dame'], ['Javon Petty', 'LB', 'Ohio State'], ['Micah Strand', 'S', 'Texas'],
  ['Corey Banks', 'WR', 'Florida'], ['Devin Ashby', 'IOL', 'Alabama'], ['Trent Marlow', 'DT', 'Michigan'], ['Aaron Keel', 'CB', 'Oregon'],
  ['Mason Greer', 'EDGE', 'LSU'], ['Ty Beaumont', 'RB', 'Ohio State'], ['Ray Vincent', 'TE', 'Penn State'], ['Hunter Doyle', 'OT', 'Texas A&M'],
  ['Kendall Shore', 'WR', 'Clemson'], ['Bo Whitfield', 'LB', 'Georgia'], ['Sean Mercer', 'S', 'USC'], ['Zion Galloway', 'CB', 'Tennessee'],
].map((r, i) => ({ id: 'pp' + i, n: r[0], pos: r[1], col: r[2], rk: i + 1 }));

function mockOrder(now = time.now()) {
  const s = Dt.seasonForStats(now), sd = Dt.standings(s, now);
  return sd.all.slice().sort((a, b) => a.pct - b.pct || a.diff - b.diff).map((r, i) => ({ o: i + 1, t: r.tid, rec: `${r.w}-${r.l}${r.tie ? '-' + r.tie : ''}` }));
}
App.route('mock-draft', () => {
  const order = mockOrder();
  const mock = store.p.mock = store.p.mock || {};
  const taken = new Set(Object.values(mock));
  const filled = Object.keys(mock).length;
  const nextSlot = order.find(o => !mock[o.o]);
  return { title: '2027 Mock Draft', right: html`<button class="icon-btn" data-act="mk-share" aria-label="Share">${icon('share')}</button>`, html: html`
    <div class="pad mt8"><div class="card pad-all">
      <div class="eyebrow">Round 1 · Your mock</div><div class="h2 mt6">${filled} of 32 picks made</div>${UI.ladder(8, Math.floor(filled / 4))}
      <div class="meta mt8">Order is "if the season ended today": worst record picks first. Prospects are prototype players for this sandbox, not real people.</div>
      <div class="flex gap8 mt12 wrap">
        ${nextSlot ? html`<button class="btn sm primary" data-act="mk-sim">${store.p.primary && order.some(o => o.t === store.p.primary && !mock[o.o]) ? 'Sim to my pick' : 'Sim the rest'}</button>` : ''}
        <button class="chip" data-act="mk-reset">Reset</button></div></div></div>
    <div class="list mt16">${order.map(o => {
      const pk = mock[o.o] && PROSPECTS.find(x => x.id === mock[o.o]);
      const mineT = store.p.teams.includes(o.t);
      return html`<div class="row tap rk-row r-sans mk-row ${mineT ? 'mine' : ''}" style="--e:${App.teamFill(Dt.team(o.t))}" data-act="mk-pick" data-arg="${o.o}">
        <b class="rk-n">${o.o}</b>${UI.logo(o.t, 'sm')}
        <div class="row-main">${pk ? html`<div class="row-title">${pk.n}</div><div class="row-sub">${Dt.team(o.t).name} · ${pk.pos} · ${pk.col}</div>` : html`<div class="row-title">${Dt.team(o.t).name}</div><div class="row-sub">${o.rec}${o === nextSlot ? ' · on the clock' : ''}</div>`}</div>
        <span class="chip ${pk ? 'on' : ''}">${pk ? pk.pos : 'Pick'}</span></div>`;
    })}</div>
    <div class="pad mt12 tiny">${taken.size} prospects off the board · ${PROSPECTS.length - taken.size} remaining</div>` };
});
App.actions['mk-pick'] = (el, ev, o) => {
  const mock = store.p.mock = store.p.mock || {};
  const order = mockOrder(); const slot = order.find(x => x.o === +o);
  const taken = new Set(Object.entries(mock).filter(([k]) => k !== o).map(([, v]) => v));
  const avail = PROSPECTS.filter(p => !taken.has(p.id));
  App.sheet({ titleHtml: html`<div class="flex gap8">${UI.logo(slot.t, 'sm')}<div class="h3">Pick ${o} · ${Dt.team(slot.t).name}</div></div>`, html: html`
    ${mock[o] ? html`<div class="pad mb12"><button class="btn sm ghost" data-act="mk-clear" data-arg="${o}">Clear this pick</button></div>` : ''}
    <div class="list">${avail.map(p => UI.row({ left: html`<span class="rank">${p.rk}</span>`, title: p.n, sub: `${p.pos} · ${p.col}`, act: 'mk-choose', arg: o + ':' + p.id, right: html`<span class="badge">${p.pos}</span>` }))}</div>` });
};
App.actions['mk-choose'] = (el, ev, arg) => { const [o, id] = arg.split(':'); store.p.mock[o] = id; store.save(); App.closeSheet(); App.refresh(); };
App.actions['mk-clear'] = (el, ev, o) => { delete store.p.mock[o]; store.save(); App.closeSheet(); App.refresh(); };
App.actions['mk-reset'] = () => { store.p.mock = {}; store.save(); App.refresh(); };
App.actions['mk-sim'] = () => {
  const mock = store.p.mock = store.p.mock || {}; const order = mockOrder();
  const taken = new Set(Object.values(mock));
  for (const o of order) {
    if (mock[o.o]) continue;
    if (store.p.primary && o.t === store.p.primary) break;     // stop at the fan's pick
    // best available with a little positional variety
    const avail = PROSPECTS.filter(p => !taken.has(p.id));
    const pick = avail[Math.min(avail.length - 1, (o.o * 7) % 3)];
    mock[o.o] = pick.id; taken.add(pick.id);
  }
  store.save(); App.refresh();
  App.toast({ title: 'Simulated', body: store.p.primary ? `You're on the clock` : 'Round 1 complete', icon: 'bolt' });
};
App.actions['mk-share'] = () => App.toast({ title: 'Mock draft link copied', body: 'Share it with your squad', icon: 'share' });

/* ------------------------------------------------------------------ transactions */
const POS_RE = /\b(QB|RB|FB|WR|TE|OT|OG|OL|T|G|C|DE|DT|NT|DL|EDGE|LB|ILB|OLB|MLB|CB|S|FS|SS|DB|K|P|LS)s?\b/;
function kind(x) {
  if (/^(Signed|SIgned|Singed|Re-sign|Re-Sign|Re-sigend|Agreed|Extended|Tendered|Exercised|Restructured)/i.test(x)) return /practice squad/i.test(x) ? 'ps' : 'sign';
  if (/^(Released|Release|Waived|Waiving|Terminated)/i.test(x)) return 'release';
  if (/^(Traded|Trade|Acquired|Acquire|Received)/i.test(x)) return 'trade';
  if (/^(Placed|Places)/i.test(x)) return 'ir';
  if (/^(Hired|Fired|Named|Announced)/i.test(x)) return 'staff';
  if (/^Claimed/i.test(x)) return 'claim';
  return 'roster';
}
const KINDS = [{ k: 'all', l: 'All' }, { k: 'sign', l: 'Signings' }, { k: 'trade', l: 'Trades' }, { k: 'release', l: 'Releases' }, { k: 'ir', l: 'Injury lists' }, { k: 'claim', l: 'Claims' }, { k: 'staff', l: 'Coaches & staff' }, { k: 'ps', l: 'Practice squad' }];
const KIND_ICON = { sign: 'edit', trade: 'swap', release: 'close', ir: 'plus', staff: 'whistle', claim: 'check', ps: 'users', roster: 'list' };
let nameIdx = null;
function playerIn(x) {
  if (!nameIdx) nameIdx = Object.entries(Dt.D.players).filter(([, p]) => (p.n || '').length > 6).map(([id, p]) => [p.n, id]);
  for (const [n, id] of nameIdx) if (x.includes(n)) return id;
  return null;
}
const pidCache = new Map();
const pidOf = r => { if (!pidCache.has(r)) pidCache.set(r, playerIn(r.x || '')); return pidCache.get(r); };
/** a transaction (approved round 5), the one row for every move: logo M32 on the league page or the kind of move in a 32 px squared tile on
    a team's page, the move in Body, "Falcons · Oct 10, 2026" in Meta, the headshot S32 right when one player is named (the row opens him) */
/* tx-rows B (2026-11-08): the team logo leads in the 40px squared tile, no headshot, the date only in the section head, the move clamps at three lines */
function txRow(r, showTeam = true) {
  const k = kind(r.x || ''), pid = pidOf(r), tm = Dt.team(r.t);
  const kl = (KINDS.find(x => x.k === k) || {}).l;
  return html`<div class="row ${pid ? 'tap' : 'static'} tx-row" ${pid ? raw(`data-go="#/player/${pid}"`) : ''}>
    <span class="lead-tile">${showTeam && tm ? UI.logo(r.t, 'sm') : icon(KIND_ICON[k] || 'list', 'sm')}</span>
    <div class="row-main"><div class="t-body tx-x">${r.x}</div><div class="t-meta">${[showTeam && tm ? tm.name : '', kl && k !== 'all' ? kl.replace(/s$/, '') : ''].filter(Boolean).join(' · ')}</div></div></div>`;
}
App.txRow = txRow;
/* multi-filter A (2026-11-08): the move type is small tabs; the team and the position are dropdown chips that open a sheet */
function teamLabel(k) { return k === 'all' ? 'All teams' : k === 'mine' ? 'My teams' : Dt.team(k) ? Dt.team(k).name : 'All teams'; }
function ddChip(label, act, arg = '') { return html`<button class="sc-season" data-act="${act}" ${arg ? raw(`data-arg="${arg}"`) : ''}>${label}${icon('down', 'xs')}</button>`; }
function optSheet(title, items, active, cb) {
  App.sheet({ title, html: html`<div class="list">${items.map(i => UI.row({ left: i.left || '', title: html`<span class="r-sans">${i.l}</span>`, act: 'ox-opt-pick', arg: i.k, right: String(i.k) === String(active) ? icon('check', 'sm accent') : '' }))}</div>` });
  App.actions['ox-opt-pick'] = (el, ev, k) => { App.closeSheet(); cb(k); };
}
function teamSheet(active, cb, groups = true) {
  const items = (groups ? [{ k: 'all', l: 'All teams' }].concat(store.p.teams.length ? [{ k: 'mine', l: 'My teams' }] : []) : []).concat( Dt.D.teams.slice().sort((a, b) => a.name.localeCompare(b.name)).map(t => ({ k: t.id, l: t.name, left: UI.logo(t.id, 'sm') })));
  optSheet('Team', items, active, cb);
}
const TX_TABS = [{ k: 'all', l: 'All' }, { k: 'sign', l: 'Signings' }, { k: 'trade', l: 'Trades' }, { k: 'release', l: 'Releases' }, { k: 'ir', l: 'Injuries' }, { k: 'claim', l: 'Claims' }, { k: 'staff', l: 'Staff' }, { k: 'ps', l: 'Practice squad' }];
function pickTeamSheet(cb) {
  App.sheet({ title: 'Choose a team', html: html`<div class="list">${Dt.D.teams.map(t => UI.row({ left: UI.logo(t.id, 'md'), title: t.full, act: 'ox-team-pick', arg: t.id }))}</div>` });
  App.actions['ox-team-pick'] = (el, ev, id) => { App.closeSheet(); cb(id); };
}
App.route('transactions', (p, q, page) => {
  const st = page.state = page.state || { k: q.k || 'all', team: q.team || 'all', n: 60 };
  let rows = Dt.tx();
  if (st.team === 'mine') rows = rows.filter(r => store.p.teams.includes(r.t));
  else if (st.team !== 'all') rows = rows.filter(r => r.t === st.team);
  if (st.k !== 'all') rows = rows.filter(r => kind(r.x || '') === st.k);
  const shown = rows.slice(0, st.n);
  const groups = []; shown.forEach(r => { const g = groups[groups.length - 1]; if (g && g.dt === r.dt) g.rows.push(r); else groups.push({ dt: r.dt, rows: [r] }); });
  return { title: 'Transactions', html: html`
    <div class="mt8">${UI.tabs(TX_TABS, st.k, 'tx-kind', 'sm')}</div>
    <div class="pad mt12 ox-dd">${ddChip(teamLabel(st.team), 'tx-team')}</div>
    ${groups.length ? groups.map(g => html`<div class="pad ox-date">${fmt.dayLong(g.dt + 'T16:00:00Z')}</div><div class="list">${g.rows.map(r => txRow(r))}</div>`) : UI.empty('list', 'No moves match', 'Try another team or filter.')}
    ${rows.length > st.n ? html`<div class="pad mt16"><button class="btn ghost block" data-act="tx-more">Show more (${rows.length - st.n} left)</button></div>` : ''}
    <div class="pad mt16 tiny">The official wire: ${fmt.n(Dt.D.core.tx.length)} moves since January 2025, shown as of ${fmt.date(time.now())}.</div>` };
});
App.actions['tx-kind'] = (el, ev, k) => { const s = App.current().state; s.k = k; s.n = 60; App.refresh(); };
App.actions['tx-team'] = () => { const s = App.current().state; teamSheet(s.team, k => { s.team = k; s.n = 60; App.refresh(); }); };
App.actions['tx-more'] = () => { App.current().state.n += 80; App.refresh(); };

/* ------------------------------------------------------------------ free agency */
const FA = {
  2026: { open: Date.parse('2026-03-09T16:00:00Z'), year: Date.parse('2026-03-11T20:00:00Z'), from: '2026-03-09', to: '2026-04-22' },
  2025: { open: Date.parse('2025-03-10T16:00:00Z'), year: Date.parse('2025-03-12T20:00:00Z'), from: '2025-03-10', to: '2025-04-23' },
};
App.route('free-agency', (p, q, page) => {
  const now = time.now();
  const y = now >= FA[2026].open ? 2026 : 2025;
  const F = FA[y];
  const st = page.state = page.state || { k: 'sign', pos: 'all', team: 'all' };
  const today = fmt.dayKey(now);
  let rows = Dt.D.core.tx.filter(r => r.dt >= F.from && r.dt <= F.to && r.dt <= today);
  const counts = { sign: 0, trade: 0, release: 0 }; rows.forEach(r => { const k = kind(r.x || ''); if (counts[k] != null) counts[k]++; });
  if (st.k !== 'all') rows = rows.filter(r => kind(r.x || '') === st.k);
  if (st.team === 'mine') rows = rows.filter(r => store.p.teams.includes(r.t)); else if (st.team !== 'all') rows = rows.filter(r => r.t === st.team);
  if (st.pos !== 'all') rows = rows.filter(r => { const m = POS_RE.exec(r.x || ''); return m && posGroup(m[1]) === st.pos; });
  // the biggest names: signings matched to a current contract
  const notable = Dt.D.core.tx.filter(r => r.dt >= F.from && r.dt <= F.to && r.dt <= today && kind(r.x || '') === 'sign' && !/exclusive rights|futures|reserve\/future/i.test(r.x))
    .map(r => ({ r, pid: pidOf(r) })).filter(x => x.pid && Dt.player(x.pid).sal && Dt.player(x.pid).t === x.r.t && new RegExp('Signed[^.]*' + Dt.player(x.pid).n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(x.r.x)).sort((a, b) => Dt.player(b.pid).sal - Dt.player(a.pid).sal).slice(0, 10);
  const phaseNote = now < F.open ? `Negotiating window opens in ${fmt.until(F.open)}` : now < F.year ? `New league year begins in ${fmt.until(F.year)} — deals can be agreed, not signed` : `The ${y} market is open`;
  return { title: `${y} Free Agency`, html: html`
    <div class="pad mt8">${UI.statRow([[counts.sign, 'Signings'], [counts.trade, 'Trades'], [counts.release, 'Releases']], `${now >= F.open && now < Date.parse(F.to + 'T23:00:00Z') ? 'Live · ' : ''}${phaseNote}`)}</div>
    ${notable.length ? html`${sh('Biggest names to sign')}<div class="hscroll">${notable.map(({ r, pid }) => {
      const pl = Dt.player(pid);
      return html`<a class="card ox-fa tap" data-go="#/player/${pid}">${UI.hs(pid, 'lg')}<div class="h4 mt8 clamp2">${pl.n}</div>
        <div class="flex gap6 mt6">${UI.logo(r.t, 'sm')}<span class="tiny">${pl.pos} · ${Dt.team(r.t).abbr}</span></div>
        <div class="num b mt8">${fmt.money(pl.sal)}<span class="tiny"> / ${pl.thru ? 'thru ' + pl.thru : 'yr'}</span></div></a>`;
    })}</div><div class="pad tiny mt8">Players still with the team that signed them. Salary is the current 2026 contract figure.</div>` : ''}
    ${sh('Every move')}
    ${UI.tabs([{ k: 'all', l: 'All' }, { k: 'sign', l: 'Signings' }, { k: 'trade', l: 'Trades' }, { k: 'release', l: 'Releases' }], st.k, 'fa-kind', 'sm')}
    <div class="pad mt12 ox-dd">${ddChip(teamLabel(st.team), 'fa-team')}${ddChip(st.pos === 'all' ? 'Any position' : st.pos, 'fa-pos')}</div>
    <div class="list mt12">${rows.slice(0, 80).map(r => txRow(r))}</div>
    ${!rows.length ? UI.empty('swap', now < F.open ? 'The market hasn\'t opened yet' : 'No moves match', now < F.open ? 'Check back when the negotiating window opens.' : 'Try another filter.') : ''}` };
});
function posGroup(p) {
  if (/^(OT|OG|OL|T|G|C)$/.test(p)) return 'OL'; if (/^(DE|DT|NT|DL|EDGE)$/.test(p)) return 'DL';
  if (/^(LB|ILB|OLB|MLB)$/.test(p)) return 'LB'; if (/^(CB|S|FS|SS|DB)$/.test(p)) return 'DB'; if (/^(K|P|LS)$/.test(p)) return 'ST';
  if (p === 'FB') return 'RB'; return p;
}
App.actions['fa-kind'] = (el, ev, k) => { App.current().state.k = k; App.refresh(); };
App.actions['fa-pos'] = () => { const s = App.current().state; optSheet('Position', ['all', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'ST'].map(k => ({ k, l: k === 'all' ? 'Any position' : k })), s.pos, k => { s.pos = k; App.refresh(); }); };
App.actions['fa-team'] = () => { const s = App.current().state; teamSheet(s.team, k => { s.team = k; App.refresh(); }); };

/* ------------------------------------------------------------------ contracts & cap */
/* approved round 5: the payroll card as L3 lines with each salary an L4 value (Stats bold), the total the card's one Display number;
   S32 secondary buttons. Top deals and expiring rows are the player row with the salary as L4 */
App.route('cap', (p, q, page) => {
  const st = page.state = page.state || { v: 'top', team: store.p.primary || null };
  const all = Object.entries(Dt.D.players).filter(([, x]) => x.sal).map(([id, x]) => ({ id, ...x }));
  const byTeam = {}; all.forEach(x => { (byTeam[x.t] = byTeam[x.t] || []).push(x); });
  const payroll = Dt.D.teams.map(t => ({ t, sum: (byTeam[t.id] || []).reduce((a, b) => a + b.sal, 0) })).sort((a, b) => b.sum - a.sum);
  const maxPay = payroll[0].sum;
  let body;
  if (st.v === 'top') {
    body = html`<div class="list">${all.sort((a, b) => b.sal - a.sal).slice(0, 40).map((x, i) => UI.playerRow(x.id, { sub: `${x.pos} · ${Dt.team(x.t).abbr} · signed thru ${x.thru || '—'}`, right: UI.lk4(fmt.money(x.sal), '', { r: true }) }))}</div>`;
  } else if (st.v === 'teams') {
    body = html`<div class="list">${payroll.map((r, i) => html`<div class="row tap" data-act="cap-team" data-arg="${r.t.id}"><span class="rank">${i + 1}</span>${UI.logo(r.t.id, 'md')}
      <div class="row-main"><div class="row-title">${r.t.name}</div><div class="meter mt6"><i style="width:${r.sum / maxPay * 100}%;background:${r.t.color}"></i></div></div>${UI.lk4(fmt.money(r.sum), '', { r: true })}</div>`)}</div>`;
  } else if (st.v === 'pos') {
    const groups = {}; all.forEach(x => { const g = posGroup(x.pos || '?'); (groups[g] = groups[g] || []).push(x.sal); });
    const rows = Object.entries(groups).filter(([g]) => /^(QB|RB|WR|TE|OL|DL|LB|DB|ST)$/.test(g)).map(([g, arr]) => { arr.sort((a, b) => b - a); return { g, top: arr[0], avgTop10: arr.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, arr.length), total: arr.reduce((a, b) => a + b, 0) }; }).sort((a, b) => b.avgTop10 - a.avgTop10);
    body = html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Position</th><th>Top deal</th><th>Avg top 10</th><th>League total</th></tr></thead><tbody>${rows.map(r => html`<tr><td>${r.g}</td><td>${fmt.money(r.top)}</td><td>${fmt.money(r.avgTop10)}</td><td>${fmt.money(r.total)}</td></tr>`)}</tbody></table></div>`;
  } else {
    const yr = all.filter(x => x.thru === 2026).sort((a, b) => b.sal - a.sal).slice(0, 40);
    body = html`<div class="pad meta mb12">Deals that run out after this season — next March's free-agent class, unless extended.</div><div class="list">${yr.map(x => UI.playerRow(x.id, { sub: `${x.pos} · ${Dt.team(x.t).abbr} · age ${x.age || '—'}`, right: UI.lk4(fmt.money(x.sal), '', { r: true }) }))}</div>`;
  }
  const tm = st.team && Dt.team(st.team);
  const mineList = tm ? (byTeam[tm.id] || []).sort((a, b) => b.sal - a.sal) : [];
  return { title: 'Contracts & cap', html: html`
    ${tm ? (() => { const sum = mineList.reduce((a, b) => a + b.sal, 0), rk = payroll.findIndex(r => r.t.id === tm.id) + 1;
      // cap-card B (2026-11-08): the team is a dropdown chip; the payroll on the franchise header's gradient + stat row; players as a plain list, money in Sans
      return html`<div class="pad mt8 ox-dd">${ddChip(tm.name, 'cap-team-pick')}</div>
      <div class="pad mt12"><div class="fr-hero fr-card" style="${raw(App.teamVars(tm))}"><div class="fr-hero-eb">${tm.name} payroll</div>
        <div class="fr-hero-s">${[[fmt.money(sum), 'Payroll'], [fmt.ord(rk), 'In the NFL'], [mineList.length, 'Contracts']].map(([v, l]) => html`<div><b>${v}</b><span>${l}</span></div>`)}</div></div></div>
      ${UI.secHead('Biggest deals', 'Full team cap', `#/team/${tm.id}?tab=cap`)}
      <div class="list">${mineList.slice(0, 5).map(x => html`<a class="row tap" data-go="#/player/${x.id}"><div class="row-main"><div class="row-title r-sans">${x.n}</div><div class="row-sub">${x.pos} · thru ${x.thru || '—'}</div></div><b class="cap-v">${fmt.money(x.sal)}</b></a>`)}</div>`; })()
      : html`<div class="pad mt8"><button class="btn ghost block" data-act="cap-team-pick">${icon('teams', 'sm')} See a team's payroll</button></div>`}
    <div class="mt16">${UI.seg([{ k: 'top', l: 'Top deals' }, { k: 'teams', l: 'Teams' }, { k: 'pos', l: 'Positions' }, { k: 'exp', l: 'Expiring' }], st.v, 'cap-view')}</div>
    <div class="mt12">${body}</div>
    <div class="pad mt16 tiny">${UI.term('Cap space', 'What is cap space?')} Figures are each player's 2026 contract salary from ESPN, summed across the full roster (including practice squad and reserve lists). That's an approximation of cash spending, not official cap accounting — bonuses, dead money and rollover aren't included.</div>` };
});
App.actions['cap-view'] = (el, ev, k) => { App.current().state.v = k; App.refresh(); };
App.actions['cap-team'] = (el, ev, id) => { const s = App.current().state; s.team = id; App.refresh(); App.current().el.scrollTo({ top: 0, behavior: 'smooth' }); };
App.actions['cap-team-pick'] = () => { const s = App.current().state; teamSheet(s.team, id => { s.team = id; App.refresh(); }, false); };

App.offseason = { DRAFT, revealAt, revealed, defaultDraftYear, kind, FA, mockOrder, R1 };

/* ------------------------------------------------------------------ draft watch: for a team out of the race, where it would pick */
const NEEDS = [
  { l: 'Passing game', pos: ['QB', 'WR'], v: o => o.passEPA / (o.passN || 1) },
  { l: 'Run game', pos: ['RB', 'OT', 'IOL'], v: o => o.rushEPA / (o.rushN || 1) },
  { l: 'Pass rush', pos: ['EDGE', 'DT'], v: o => o.sacks / (o.g || 1) },
  { l: 'Pass defense', pos: ['CB', 'S', 'LB'], v: o => -(o.dEpa / (o.dPlays || 1)) },
];
const needCache = {};
/** the unit that ranks worst in the league this season: { l, pos, rk } */
function biggestNeed(tid, s) {
  const key = s + ':' + Math.floor(time.now() / 36e5);
  const all = needCache[key] = needCache[key] || Object.fromEntries(Dt.D.teams.map(t => [t.id, Dt.teamSeason(t.id, s)]));
  if (!all[tid] || !all[tid].g) return null;
  return NEEDS.map(n => { const v = n.v(all[tid]); const rk = 1 + Dt.D.teams.filter(t => all[t.id] && all[t.id].g && n.v(all[t.id]) > v).length; return { ...n, rk }; }).sort((a, b) => b.rk - a.rk)[0];
}
/** where your team would pick. slot 'top': only when the team is clearly out of it (winless-ish a month in, outside the
    top 10 seeds from Week 10, or out of the playoffs), placed high on the page. slot 'low': every other team from Week 4
    of the regular season, placed near the bottom, because a good season still ends in a draft. */
/** a season that's slipping away: out of the playoffs, a bad start, or past midseason and out of the race or under .350 */
function seasonOver(tid) {
  const now = time.now(), ph = time.phase(), s = Dt.seasonForStats(now);
  if (!App.NFL.d['box-' + s] || !['regular', 'post'].includes(ph)) return null;
  const r = Dt.standings(s, now).all.find(x => x.tid === tid); if (!r || !r.gp) return null;
  return { r, out: ph === 'post' ? !r.inPlayoffs : (r.gp >= 4 && r.pct <= .25) || (r.gp >= 9 && (r.seed > 10 || r.pct <= .35)) };
}
function draftWatch(tid, slot = 'top') {
  const now = time.now(), ph = time.phase(), s = Dt.seasonForStats(now);
  const so = seasonOver(tid); if (!so) return '';
  const { r, out } = so;
  if (slot === 'top' ? !out : out || ph !== 'regular' || r.gp < 4) return '';
  const pick = (mockOrder(now).find(o => o.t === tid) || {}).o; if (!pick) return '';
  const need = biggestNeed(tid, s);
  // prospects at the need who should still be there; late picks fall back to the best left near the pick
  let fits = need ? PROSPECTS.filter(p => need.pos.includes(p.pos) && p.rk >= pick - 3).slice(0, 3) : [];
  if (!fits.length) fits = PROSPECTS.filter(p => p.rk >= Math.min(pick, PROSPECTS.length) - 4).slice(0, 3);
  const late = pick > 20;
  return html`<section class="sec"><div class="sec-head"><div class="h2">Draft watch</div><a class="more" data-go="#/mock-draft">Mock draft${icon('chev', 'xs')}</a></div>
    <div class="card dw" style="margin:0 var(--pad)"><div class="cpad flex gap12"><div class="dw-n"><span>No.</span>${pick}</div>
      <div class="grow"><div class="eyebrow">${ph === 'post' ? (s + 1) + ' NFL Draft' : 'If the season ended today'}</div><div class="h3 mt4">${Dt.team(tid).name} ${ph === 'post' ? 'pick' : 'would pick'} ${fmt.ord(pick)}</div>
        ${late ? html`<div class="tiny mt4">A late first-rounder: the reward for a good season.</div>` : ''}
        ${need ? html`<div class="tiny mt4">Biggest need: <b>${need.l}</b>, ${fmt.ord(need.rk)} of 32 this season</div>` : ''}</div></div>
      ${fits.length ? html`<div class="list dw-list">${fits.map(p => html`<div class="row static"><span class="dw-rk">${p.rk}</span><div class="row-main"><div class="row-title">${p.n}</div><div class="row-sub">${p.pos} · ${p.col}</div></div></div>`)}</div>
        <div class="tiny cpad" style="padding-top:8px">Prototype prospects for this sandbox, ranked by a consensus board.</div>` : ''}</div></section>`;
}
App.draftWatch = draftWatch; App.seasonOver = seasonOver;
})();
