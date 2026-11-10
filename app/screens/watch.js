/* ============================================================================
   Watch — live games, RedZone, NFL Channel, replays, All-22, highlights,
   audio, podcasts, watch parties, downloads, plans and the where-to-watch resolver.
   Entitlements: Free · NFL+ · NFL+ Premium (US) and NFL Game Pass on DAZN (international).
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, fmt, store, time } = App;
const UI = App.UI, Dt = App.data;
const A = App.actions;

/* ------------------------------------------------------------------ entitlements */
// feature → minimum US tier
const FEAT = {
  highlights: 'free', channel: 'free', podcasts: 'free',
  live: 'plus', audio: 'plus', network: 'plus', films: 'plus', preseason: 'plus',
  redzone: 'premium', replay: 'premium', condensed: 'premium', all22: 'premium',
};
const FEAT_NAME = { live: 'Live local & primetime games', audio: 'Live game audio', network: 'NFL Network 24/7', films: 'The NFL Films library',
  redzone: 'NFL RedZone', replay: 'Full game replays', condensed: 'Condensed replays', all22: 'All-22 coaches film', preseason: 'Out-of-market preseason' };
const intl = () => Dt.isIntl();
const SHORT = { condensed: 'Condensed', replay: 'Full replay', all22: 'All-22', highlights: 'Highlights', nflplus: 'NFL+', audio: 'Radio', redzone: 'RedZone', dazn: 'Game Pass' };
const hasDazn = () => (store.p.providers || []).includes('dazn');
function can(f) {
  if (!FEAT[f]) return true;
  if (intl()) return FEAT[f] === 'free' || hasDazn();
  return UI.hasTier(FEAT[f]);
}
function tierOf(f) { if (!FEAT[f]) return 'free'; return intl() ? (FEAT[f] === 'free' ? 'free' : 'dazn') : FEAT[f]; }
function badgeFor(f) { const t = tierOf(f); return t === 'free' ? '' : UI.tierBadge(t); }
/** DAZN streams one game free each week outside the US — pick it deterministically */
function intlFree(g) {
  if (!intl() || hasDazn()) return false;
  const w = Dt.week(g.s, g.t, g.w); if (!w) return false;
  const pick = w.games.filter(x => !Dt.nationalWindow(x)).sort((a, b) => a.id - b.id)[0] || w.games[0];
  return pick && pick.id === g.id;
}
const tvLabel = g => intl() ? (intlFree(g) ? 'Free on DAZN' : 'DAZN') : (g.tv || []).join(' · ');
const subName = () => intl() ? (hasDazn() ? 'Game Pass' : 'Free') : UI.TIER[store.p.sub].n;

/* ------------------------------------------------------------------ helpers */
const now = () => time.now();
const T = id => Dt.team(id);
const mineFirst = (a, b) => (isMine(b) - isMine(a)) || a.ts - b.ts;
const isMine = g => (store.p.teams.includes(g.h) || store.p.teams.includes(g.a)) ? 1 : 0;
const ended = g => (Dt.D.live[g.id] && Dt.D.live[g.id]._end) || g.ts + Dt.GAME_LEN + (g.ot ? 1500e3 : 0);
const matchup = g => `${T(g.a).abbr} @ ${T(g.h).abbr}`;
const nm = id => { const t = T(id); return t.loc === 'New York' || t.loc === 'Los Angeles' ? t.short : t.name; };
function etParts(ts) {
  const d = new Date(ts);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hourCycle: 'h23', minute: 'numeric' }).formatToParts(d).map(x => [x.type, x.value]));
  return { wd: p.weekday, h: +p.hour, m: +p.minute };
}
/** games finished by now, newest first, regular + post season */
function finished(limit = 40) {
  const n = now(); const out = [];
  const gs = Dt.D.games;
  for (let i = gs.length - 1; i >= 0 && out.length < limit; i--) { const g = gs[i]; if (g.t !== 1 && Dt.state(g, n) === 'post') out.push(g); }
  return out;
}
function upcoming(days = 7) {
  const n = now();
  return Dt.D.games.filter(g => g.ts > n && g.ts < n + days * 864e5 && Dt.scheduleVisible(g, n) && g.t !== 3 || (g.t === 3 && g.ts > n && g.ts < n + days * 864e5 && g.w !== 4)).sort(mineFirst);
}
function liveNow() { return Dt.liveGames().sort(mineFirst); }
function redzoneOn() { return liveNow().some(g => !Dt.nationalWindow(g) && g.t === 2); }
function nextRedzone() {
  const n = now();
  const g = Dt.D.games.find(x => x.ts > n && x.t === 2 && !Dt.nationalWindow(x) && Dt.scheduleVisible(x, n));
  return g ? g.ts : null;
}
/** video item for a finished game */
function gameVideo(g, kind = 'highlights') {
  const b = Dt.box(g.id) || {};
  const hide = Dt.spoiled(g);
  const titles = {
    highlights: hide || !b.rh ? `${T(g.a).name} at ${T(g.h).name} · Highlights` : b.rh,
    condensed: `${T(g.a).name} at ${T(g.h).name} · Condensed game`,
    replay: `${T(g.a).name} at ${T(g.h).name} · Full game replay`,
    all22: `${T(g.a).name} at ${T(g.h).name} · All-22`,
  };
  const dur = { highlights: hl(g), condensed: `${38 + (+g.id % 12)}:${String(+g.id % 60).padStart(2, '0')}`, replay: `3:${String(5 + (+g.id % 40)).padStart(2, '0')}:00`, all22: 'Every snap' }[kind];
  const feat = kind === 'highlights' ? 'highlights' : kind;
  return { id: g.id + kind, game: g.id, kind: { highlights: 'Highlights', condensed: 'Condensed game', replay: 'Full replay', all22: 'All-22 coaches film' }[kind],
    title: titles[kind], sub: `${Dt.weekLabel(g.t, g.w)} · ${fmt.date(g.ts)}`, img: b.ri, dur, feat, team: g.h };
}
const hl = g => `${8 + (+g.id % 6)}:${String((+g.id * 7) % 60).padStart(2, '0')}`;

/* ------------------------------------------------------------------ cards */
/** the approved 3 px progress atom on the picture */
const progBar = pct => pct == null ? '' : raw(`<i class="thumb-prog" style="width:${pct.toFixed(1)}%"></i>`);
function wcard(v, w = 236, pct) {
  const ok = can(v.feat || 'highlights');
  const fb = v.feat === 'all22' && v.game ? all22(Dt.game(v.game)) : v.team ? raw(`<div class="w-ph" style="${App.teamVars(T(v.team))}">${UI.logo(v.team, 'lg')}</div>`) : '';
  return html`<a class="w-card tap" style="width:${w}px" data-act="w-play" data-arg="${JSON.stringify(v)}">
    <div class="thumb">${fb}${v.img ? UI.img(v.img) : ''}
      <div class="play">${icon(ok ? 'play' : 'lock', 'sm')}</div>${v.dur ? html`<div class="dur">${v.dur}</div>` : ''}
      ${v.live ? raw('<div class="w-tl"><span class="badge live">Live</span></div>') : ''}${ok ? '' : UI.plusTab(tierOf(v.feat || 'highlights'))}${progBar(pct)}
      </div>
    <div class="t-title-s mt8 clamp2">${v.title}</div>${v.sub ? html`<div class="t-meta mt4 ellipsis">${v.sub}</div>` : ''}</a>`;
}
/** overhead "coaches film" still: both teams' 11 as dots on a wide field */
function all22(g) {
  const ca = App.readable(T(g.a), '#1f4d2c'), ch = App.readable(T(g.h), '#1f4d2c');
  let seed = +g.id % 997; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const los = 90 + r() * 60;
  const off = [[0, 0], [0, -12], [0, 12], [0, -24], [0, 24], [-14, 0], [-28, 4], [0, -62], [0, 58], [-6, 40], [-4, -44]];
  const dfn = [[8, -18], [8, -6], [8, 6], [8, 18], [16, -32], [16, 30], [30, 0], [26, -60], [26, 56], [58, -26], [58, 24]];
  const dots = off.map(([x, y]) => `<circle cx="${los + x}" cy="${68 + y}" r="3.6" fill="${ca}" stroke="#fff" stroke-width=".8"/>`).join('') +
    dfn.map(([x, y]) => `<circle cx="${los + x + r() * 3}" cy="${68 + y + r() * 3}" r="3.6" fill="${ch}" stroke="#fff" stroke-width=".8"/>`).join('');
  const yl = Array.from({ length: 11 }, (_, i) => `<line x1="${10 + i * 22}" x2="${10 + i * 22}" y1="0" y2="136" stroke="rgba(255,255,255,.18)"/>`).join('');
  return raw(`<svg viewBox="0 0 240 136" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;background:#24563a">${yl}<line x1="${los}" x2="${los}" y1="0" y2="136" stroke="#4aa3ff" stroke-width="1.4"/>${dots}</svg>`);
}
/** flat typographic poster for shows / films / podcasts (no stock art) */
/** videos you stopped part-way through, newest first, with how far in you got */
function continueWatching() {
  const list = (store.p.resume || []).filter(r => r.title);
  if (!list.length) return '';
  return html`<div class="sec">${sh('Continue watching')}${hrow(list.map(r => {
    const { key, t, len, at, ...v } = r;
    const pct = Math.min(100, t / len * 100);
    // approved round 5: the time left joins the source line in Meta, so the card is the height of every other rail
    const left = `${App.video.clock(Math.max(0, len - t))} left`, sub = [v.sub, left].filter(Boolean).join(' · ');
    return v.big ? poster({ ...v, sub }, 236, '16/9', pct) : wcard({ ...v, sub }, 236, pct);
  }))}</div>`;
}
/** a show poster (round 5 v2): a team's show sits on its sheet gradient, others on their own colour; the logo at an even
    12 px inset, the 10 px eyebrow and the show name in Display at the foot, the approved NFL+ tab when it is locked */
function poster(p, w = 150, ratio = '3/4', pct) {
  const fs = w < 140 ? 16 : 21;
  const ok = can(p.feat || 'free'), tier = tierOf(p.feat);
  const surf = p.team ? `${App.teamVars(T(p.team))}` : `background:${p.bg};color:${p.fg || '#fff'}`;
  return html`<a class="w-poster tap" style="width:${w}px" data-act="${p.act || 'w-play'}" data-arg="${p.arg || JSON.stringify(p)}">
    <div class="w-pimg ${p.team ? 'tsurf' : ''}" style="aspect-ratio:${ratio};${raw(surf)}">
      ${p.team ? html`<div class="w-plogo">${UI.logo(p.team, 'md')}</div>` : ''}
      ${!ok ? (tier === 'plus' || tier === 'premium' ? UI.plusTab(tier) : html`<div class="w-tr">${badgeFor(p.feat)}</div>`) : ''}
      <div class="w-peb">${p.eyebrow || ''}</div><div class="w-pt" style="font-size:${fs}px">${p.big || p.title}</div>${progBar(pct)}</div>
    <div class="t-title-s mt8 clamp2">${p.title}</div>${p.sub ? html`<div class="t-meta mt4 ellipsis">${p.sub}</div>` : ''}</a>`;
}
function sh(title, feat, more, go) {
  return html`<div class="sec-head"><div class="h2 flex gap8">${title}${feat ? badgeFor(feat) : ''}</div>${more ? html`<a class="more" data-go="${go}">${more}${icon('chev', 'xs')}</a>` : ''}</div>`;
}
/** gentle, single-line note shown under a locked section */
let lockSeen = null;   // set per render so each tier's note shows once
function softLock(f, text) {
  return '';   // approved round 6 (watch-locked A): said once, in the "What NFL+ adds" panel; each locked rail keeps only its tier badge
  if (can(f)) return '';
  if (lockSeen) { const t = tierOf(f); if (lockSeen.has(t)) return ''; lockSeen.add(t); }
  if (intl()) return html`<div class="w-soft tap" data-go="#/plans">${icon('lock', 'xs')}<span>${text || FEAT_NAME[f]} comes with NFL Game Pass on DAZN.</span><b>Learn more</b></div>`;
  return html`<div class="w-soft tap" data-go="#/plans?t=${FEAT[f]}">${icon('lock', 'xs')}<span>${text || FEAT_NAME[f]} comes with ${UI.TIER[FEAT[f]].n}.</span><b>See plans</b></div>`;
}
const hrow = items => html`<div class="hscroll">${items}</div>`;

/** live game tile for the "Live & upcoming" rail */
function gameTile(g, listen) {
  const S = Dt.score(g), hide = Dt.spoiled(g) && S.st !== 'pre';
  const opts = Dt.watch(g), best = opts.find(o => o.ok) || (intlFree(g) ? { k: 'dazn', label: 'Free this week' } : null);
  // the foot: a soft badge with a check when this fan can watch it, Meta when it is elsewhere
  let pill = best ? html`<span class="badge">${icon('check', 'xs')} ${best.k === 'audio' ? 'Listen on NFL+' : best.label === 'Free this week' ? 'Free this week' : SHORT[best.k] || best.label}</span>` :
    html`<span class="t-meta">${opts.find(o => o.k === 'ticket') ? 'Out of market · Sunday Ticket' : opts.find(o => o.tier === 'tv') ? 'On ' + opts.find(o => o.tier === 'tv').label : intl() ? 'Game Pass on DAZN' : 'See options'}</span>`;
  // round 5 watch-game-tile v3 option b: no bar; a 4 x 20 mark in each team's own primary leads its line
  // approved round 6 (watch-listen A): the same tile for live audio, "Listen" and the three feeds in the foot
  if (listen) pill = html`<span class="badge">${icon('headphones', 'xs')} Listen</span><span class="t-meta">Home · Away · National</span>`;
  return html`<a class="w-game tap" ${raw(listen ? `data-act="w-listen" data-arg="${g.id}"` : `data-go="#/game/${g.id}"`)} style=""${raw(`--ca:${App.teamFill(T(g.a))};--ch:${App.teamFill(T(g.h))}`)}">
    <div class="flex between">${UI.lk5(S, hide)}<span class="t-meta">${tvLabel(g)}</span></div>
    <div class="w-gl">${UI.lk1Game(g)}</div>
    <div class="w-gfoot">${pill}</div></a>`;
}

/* ------------------------------------------------------------------ hero */
/* approved watch-hero2 v3 option A (soft glow): black, each team's colour glowing in softly from its own side behind its logo,
   the scores between; ?pv=whpre forces the before-kickoff state for the Approvals frames */
const whGlow = t => App.contrast(t.color, '#07080b') < 2.2 ? t.alt : t.color;   // colours too dark to glow on black use their second colour
const whLogo = (t, cls = '') => html`<img class="wh-logo ${cls}" src="${t.logoDark || t.logo}" alt="${t.abbr}">`;
function whHero(g, c) {
  const S = c.S, hide = c.hide, live = S.st === 'live', A = Dt.team(g.a), H = Dt.team(g.h);
  const status = UI.heroStatus(g, S, hide), net = tvLabel(g);
  const rec = t => Dt.record(t.id, g.s, Math.min(time.now(), g.ts - 1)).str;
  const sc = side => live && !hide ? (side === 'a' ? S.as : S.hs) : '';
  const ball = t => live && !hide && S.poss === t.id;
  const sit = live && !hide && S.dd ? html`<div class="wh-sit">${S.dd}${S.redzone ? html`<span class="wh-rz">Red zone</span>` : ''}${S.drv ? html`<span class="wh-drv">Drive: ${S.drv.n} plays · <b>${S.drv.y}</b> yds · <b>${S.drv.t}</b></span>` : ''}</div>`
    : !live ? html`<div class="wh-sit">${[c.mine ? 'Your game' : '', Dt.weekLabel(g.t, g.w)].filter(Boolean).join(' · ')}</div>` : '';
  const acts = html`<div class="wh-acts">${c.actions}</div>${c.note ? html`<div class="wh-note">${c.note}</div>` : ''}`;
  const name = t => t.name.toUpperCase();
  const side = (t, s) => html`<a class="wh-side wh-${s} tap" data-go="#/game/${g.id}">
    ${whLogo(t)}
    ${sc(s) !== '' ? html`<b class="wh-sc">${sc(s)}</b>` : ''}<span class="wh-nm">${name(t)}</span>
    <span class="wh-rec">${ball(t) ? html`<span class="wh-ball">${icon('football', 'xs')}Ball</span>` : ''}${rec(t)}</span></a>`;
  const top = html`<div class="wh-top">${status}<span class="wh-net">${net}</span></div>`;
  return html`<section class="wh wh2" style="--ga:${whGlow(A)};--gh:${whGlow(H)}">${top}<div class="wh-sides">${side(A, 'a')}${side(H, 'h')}</div>${sit}${acts}</section>`;
}
/** can this fan actually watch it (their plan, providers or a free window), not just listen */
const watchable = g => intlFree(g) || Dt.watch(g).some(o => o.ok && o.k !== 'audio' && o.k !== 'highlights');
/** the hero is the next game this fan can watch: their team's live game they can see, then any live game
    they can see, then their team's live game anyway (we show where it's on), then the next one coming up */
function hero() {
  const rank = g => isMine(g) * 2 + (watchable(g) ? 3 : 0);
  const L = App.pv && App.pv.has('whpre') ? [] : liveNow().sort((a, b) => rank(b) - rank(a));
  if (L.length) {
    const g = L[0], S = Dt.score(g), hide = Dt.spoiled(g);
    const opts = Dt.watch(g);
    const watchOpt = opts.find(o => o.ok && (o.k === 'nflplus' || o.k === 'dazn')) || (intlFree(g) ? { k: 'dazn' } : null);
    const tvOpt = opts.find(o => o.ok && o.tier === 'tv');
    const audio = opts.find(o => o.k === 'audio');
    let cta;
    if (watchOpt) cta = html`<button class="btn ink" data-act="w-live" data-arg="${g.id}">${icon('play', 'sm')} ${intlFree(g) ? 'Watch free' : 'Watch live'}</button>`;
    else if (tvOpt) cta = html`<button class="btn ink" data-act="w-wtw" data-arg="${g.id}">${icon('tv', 'sm')} On ${tvOpt.label}</button>`;
    else if (opts.find(o => o.ok && o.k === 'redzone')) cta = html`<button class="btn ink" data-go="#/channel/redzone">${icon('bolt', 'sm')} Watch RedZone</button>`;
    else cta = html`<button class="btn ink" data-act="w-wtw" data-arg="${g.id}">${icon('tv', 'sm')} Where it's on</button>`;
    const note = !watchOpt && !tvOpt && !opts.find(o => o.ok && o.k === 'redzone') ? (intl() ? 'Every game streams live with NFL Game Pass on DAZN.' : Dt.inMarket(g) || Dt.nationalWindow(g) ? 'Stream it on your phone with NFL+, or on TV via the network.' : 'Out of your market — Sunday Ticket carries it, RedZone shows every score.') : '';
    const acts = html`${cta}${audio ? html`<button class="btn" data-act="w-listen" data-arg="${g.id}">${icon('headphones', 'sm')} Listen</button>` : ''}<button class="btn" data-go="#/game/${g.id}">${icon('scores', 'sm')} Gamecast</button>`;
    return whHero(g, { S, hide, actions: acts, note, mine: isMine(g) });
  }
  // nothing live: phase-aware feature
  const ph = time.phase();
  const up = upcoming(8);
  if (up.length && (ph === 'regular' || ph === 'post')) {
    const g = up.slice().sort((a, b) => isMine(b) - isMine(a) || watchable(b) - watchable(a) || a.ts - b.ts)[0];
    const best = Dt.watch(g).find(o => o.ok);
    return whHero(g, { S: Dt.score(g), hide: false, mine: isMine(g), note: best ? `You can watch on ${best.k === 'nflplus' ? 'NFL+' : best.k === 'dazn' ? 'Game Pass' : best.label}.` : '',
      actions: html`<button class="btn ink" data-act="w-wtw" data-arg="${g.id}">${icon('tv', 'sm')} Where to watch</button><button class="btn" data-act="w-remind" data-arg="${g.id}">${icon('bell', 'sm')} Remind me</button>` });
  }
  // offseason
  const sb = Dt.D.games.filter(g => g.t === 3 && g.w === 5 && Dt.state(g) === 'post').pop();
  const lines = {
    fa: ['Free agency, live', 'NFL Network is tracking every signing as the new league year opens.', 'network'],
    draft: ['The NFL Draft is live', 'Round 1 from Pittsburgh — every pick, every trade, live on NFL Network.', 'network'],
    summer: ['The dead zone, filled', 'Relive last season, binge NFL Films, and count down to kickoff.', 'films'],
    camp: ['Inside training camp', 'Daily live look-ins from all 32 camps on NFL Network.', 'network'],
  }[ph] || ['Watch', 'Highlights, replays and more.', 'channel'];
  // approved round 6 (watch-offseason A): NFL blue at 180° reaching full colour at 42%, Display caps title, white solid + white outline buttons
  return html`<div class="w-off">
    <div class="w-off-in">
      <span class="w-off-eb">${fmt.dayLong(now())}</span>
      <div class="w-off-t">${lines[0].toUpperCase()}</div><p>${lines[1]}</p>
      <div class="w-off-b"><button class="btn white" data-act="w-play" data-arg="${JSON.stringify({ title: lines[0], kind: lines[2] === 'films' ? 'NFL Films' : 'NFL Network · Live', feat: lines[2], live: null })}">${icon('play', 'sm')} Watch now</button>
      ${sb ? html`<button class="btn w-off-line" data-act="w-play" data-arg="${JSON.stringify(gameVideo(sb, 'highlights'))}">Relive Super Bowl ${Dt.sbNumeral(sb.s)}</button>` : ''}</div>
    </div></div>`;
}

/* ------------------------------------------------------------------ NFL Channel / Network schedule */
const CHANNEL_SHOWS = ['NFL Films Presents', 'Classic Game Replay', 'NFL Throwback', 'Top 10', 'Mic\'d Up Classics', 'Hard Count', 'Inside the Huddle', 'Game of the Week Rewind', 'The Timeline', 'Sound FX'];
const NETWORK_SHOWS = ['Good Morning Football', 'NFL Now', 'The Insiders', 'NFL Total Access', 'Path to the Draft', 'A Football Life', 'NFL GameDay Morning', 'NFL GameDay Final', 'Inside Training Camp Live', 'Playbook'];
function schedule(list, n = 6, seed = 0) {
  const t0 = Math.floor(now() / 1800e3) * 1800e3;
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = t0 + i * 1800e3 * (i % 3 === 0 ? 2 : 1) - (i ? 0 : 0);
    out.push({ start: t0 + i * 3600e3, title: list[(Math.floor(t0 / 3600e3) + i + seed) % list.length] });
  }
  return out;
}
function nowPlaying(list, seed) { return schedule(list, 1, seed)[0].title; }
function grid(list, seed, feat) {
  const sch = schedule(list, 6, seed), n = now();
  const pct = Math.min(100, (n - sch[0].start) / 3600e3 * 100);
  // approved round 6 (channel-page A): a time column on the left; the show on air gets the Live badge and the meter
  return html`<div class="list w-grid">${sch.map((p, i) => html`<div class="row static w-slot">
    <span class="w-slot-t">${i === 0 ? html`<span class="badge live">Live</span>` : fmt.time(p.start)}</span>
    <div class="row-main"><div class="row-title">${p.title}</div>${i === 0 ? html`<i class="w-ch-m"><b style="width:${Math.max(4, pct)}%"></b></i>` : ''}</div></div>`)}</div>`;
}

/* ------------------------------------------------------------------ watch tab */
App.route('watch', (params, query, page) => {
  const ph = time.phase();
  const seasons = [Dt.seasonForStats(), Dt.seasonForStats() - 1];
  return Promise.all(seasons.map(s => Dt.ensureBox(s).catch(() => {}))).then(() => ({
    title: App.t('Watch'), big: true, right: UI.headRight(),
    html: html`<div class="w-root">${renderWatch()}</div>`,
    tick(el) { if (Math.floor(now() / 1000) % 15 === 0) { const r = el.querySelector('.w-root'); if (r) r.innerHTML = String(html`${renderWatch()}`); } },
  }));
});

function renderWatch() {
  const ph = time.phase();
  lockSeen = new Set();
  const later = [];   // sections this fan can't open yet go after everything free
  const L = liveNow(), up = upcoming(7), fin = finished(30);
  const mine = store.p.teams;
  const myFin = fin.filter(isMine).slice(0, 8);
  const highlights = [...myFin, ...fin.filter(g => !isMine(g))].slice(0, 12).map(g => gameVideo(g));
  const playerTeams = [...new Set(store.p.players.map(id => (Dt.player(id) || {}).t).filter(Boolean))];
  const playerHl = store.p.players.slice(0, 6).map(pid => {
    const p = Dt.player(pid); if (!p) return null;
    const g = fin.find(x => x.h === p.t || x.a === p.t); if (!g) return null;
    return { ...gameVideo(g), id: 'p' + pid + g.id, title: `${p.n}: every play vs ${T(Dt.opp(g, p.t)).name}`, kind: 'Player cut-up', team: p.t, img: null };
  }).filter(Boolean);
  const rzOn = redzoneOn(), rzNext = nextRedzone();
  const s = [];

  s.push(html`<div class="w-sub flex between pad"><span class="tiny">Your plan: <b>${subName()}</b>${intl() ? html` · ${(Dt.COUNTRIES.find(c => c[0] === store.p.location.country) || [])[1] || ''}` : ''}</span><a class="tiny w-link" data-go="#/plans">${intl() ? 'Game Pass' : 'Plans'} ${icon('chev', 'xs')}</a></div>`);
  s.push(html`<div class="pad mt8">${hero()}</div>`);
  const cw = continueWatching();
  if (cw) s.push(cw);

  // quick entry chips
  // approved round 6 (watch-shortcuts B): one scrolling row of the squared chip (the Scores season chip shape)
  // watch-pass (built Nov 10): the hero's CTA and the Live & up next link already go to Where to watch, so the row starts with RedZone
  s.push(html`<div class="w-sc mt16">${[['#/channel/redzone', 'bolt', 'RedZone'], ['#/replays', 'rewind', 'Replays'], ['#/audio', 'headphones', 'Audio'], ['#/podcasts', 'mic', 'Podcasts'], ['#/downloads', 'download', 'Downloads']]
    .map(([go, i, l]) => html`<button class="sc-season" data-go="${go}">${icon(i, 'sm')}${l}</button>`)}</div>`);

  // live now, then what's on soon: the next 24 hours, or the next game day if nothing's that close (Scores has the whole week)
  const rest = up.filter(g => !L.includes(g)), soon = rest.filter(g => g.ts - now() < 864e5);
  const nextDay = soon.length || !rest.length ? [] : rest.filter(g => fmt.dayKey(g.ts) === fmt.dayKey(rest[0].ts));
  const games = [...L, ...soon, ...nextDay].slice(0, 16);
  if (games.length) {
    s.push(html`<div class="sec">${sh(L.length ? 'Live & up next' : 'Up next', null, 'Where to watch', '#/where-to-watch')}${hrow(games.map(gameTile))}</div>`);
  }

  // RedZone banner (Sunday afternoons in season)
  if (ph === 'regular') {
    s.push(html`<div class="sec">${sh(rzOn ? 'RedZone, live' : 'RedZone', null, 'Channel', '#/channel/redzone')}<div class="pad">${rzCard()}</div></div>`);
  }

  // free: highlights for you
  if (highlights.length) s.push(html`<div class="sec">${sh(mine.length ? 'Highlights for you' : 'Latest highlights', null, 'All', '#/replays?mode=highlights')}${hrow(highlights.map(v => wcard(v)))}</div>`);
  if (playerHl.length) s.push(html`<div class="sec">${sh('Your players')}${hrow(playerHl.map(v => wcard(v, 200)))}</div>`);

  // approved round 6 (watch-channels A): both 24/7 channels in one list, a row each: how far into the show, what's next, a squared play (or lock)
  s.push(html`<div class="sec">${sh('Live 24/7', null, 'Guide', '#/channel/nfl-channel')}<div class="list">${[['NFL Channel', 'CHANNEL', CHANNEL_SHOWS, 0, 'channel', '#013369', '#/channel/nfl-channel'], ['NFL Network', 'NETWORK', NETWORK_SHOWS, 3, 'network', '#1d1d1f', '#/channel/nfl-network']].map(([name, sub, list, seed, f, bg, go]) => {
    const sch = schedule(list, 2, seed), pct = Math.max(4, Math.min(100, (now() - sch[0].start) / 3600e3 * 100)), ok = can(f), tier = tierOf(f);
    return html`<a class="row tap w-ch" ${raw(ok ? `data-go="${go}"` : `data-act="upsell" data-arg="${tier === 'free' ? 'plus' : tier}"`)}><div class="w-ch-logo" style="background:${bg}">NFL<span>${sub}</span></div>
      <div class="row-main"><div class="w-ch-tag">${tier === 'free' ? html`<span class="badge win">Free</span>` : UI.tierBadge(tier)}<span class="t-meta">${name}</span></div><div class="row-title">${sch[0].title}</div>
        <i class="w-ch-m"><b style="width:${pct}%"></b></i><div class="row-sub">Next ${sch[1].title} · ${fmt.time(sch[1].start)}</div></div>
      <span class="w-ch-btn ${ok ? '' : 'lock'}">${icon(ok ? 'play' : 'lock', 'sm')}</span></a>`;
  })}</div></div>`);

  if (L.length || up.length) {
    const ag = (L.length ? L : up).slice(0, 8);
    (can('audio') ? s : later).push(html`<div class="sec">${sh('Listen live', 'audio', 'All games', '#/audio')}${softLock('audio', 'Live radio calls for every game')}
      ${hrow(ag.map(g => gameTile(g, true)))}</div>`);
  }

  // Premium: condensed + replays + all-22
  const rep = (myFin.length ? myFin : fin).slice(0, 10);
  if (rep.length) {
    (can('condensed') ? s : later).push(html`<div class="sec">${sh('Condensed games', 'condensed', 'Browse', '#/replays?mode=condensed')}${softLock('condensed', 'Every snap in about 40 minutes')}
      <div class="tiny pad mb8 w-sf">${icon('eyeoff', 'xs')} Spoiler-free: replay titles never show the score</div>
      ${hrow(rep.map(g => wcard(gameVideo(g, 'condensed'), 200)))}</div>`);
    (can('all22') ? s : later).push(html`<div class="sec">${sh('All-22 coaches film', 'all22', 'Browse', '#/replays?mode=all22')}${softLock('all22', 'The film coaches study')}
      ${hrow(rep.slice(0, 6).map(g => wcard({ ...gameVideo(g, 'all22'), img: null }, 180)))}</div>`);
  }

  // shows & films
  const showP = [
    { title: 'A Football Life', eyebrow: 'NFL Films', big: 'A FOOTBALL LIFE', bg: '#1d1d1f', feat: 'films', kind: 'NFL Films', sub: 'Documentary series' },
    { title: time.phase() === 'regular' ? 'Mic\'d Up: Week ' + Dt.currentWeek().w : 'Mic\'d Up: Best of ' + Dt.season(), eyebrow: 'Sound FX', big: 'MIC\'D UP', bg: '#b3261e', feat: 'highlights', kind: 'Show', sub: 'Free · ' + '12 min' },
    { title: 'NFL Turning Point', eyebrow: 'NFL Films', big: 'TURNING POINT', bg: '#0b3d2e', feat: 'films', kind: 'NFL Films', sub: 'The plays that decided it' },
    { title: 'Inside the NFL', eyebrow: 'Weekly', big: 'INSIDE THE NFL', bg: '#13294b', feat: 'films', kind: 'Show', sub: 'Analysis & film' },
    { title: 'Top 10 Plays of the Week', eyebrow: 'Free', big: 'TOP 10', bg: '#2a2a2e', feat: 'highlights', kind: 'Show', sub: 'Free · 9 min' },
    { title: 'Super Bowl Champions', eyebrow: 'NFL Films', big: 'CHAMPIONS', bg: '#6b5320', feat: 'films', kind: 'NFL Films', sub: 'Every title team\'s film' },
  ];
  s.push(html`<div class="sec">${sh('Shows & NFL Films')}${hrow(showP.map(p => poster(p)))}</div>`);
  if (mine.length) {
    s.push(html`<div class="sec">${sh('From your teams')}${hrow(mine.slice(0, 4).flatMap(tid => [
      { title: `${T(tid).name} All Access`, eyebrow: T(tid).abbr, big: T(tid).name.toUpperCase(), bg: T(tid).color, team: tid, feat: 'highlights', kind: 'Team show', sub: 'Free · new episode weekly' },
      { title: `${T(tid).name} press conference`, eyebrow: 'Live & on demand', big: 'PRESSER', bg: T(tid).color, team: tid, feat: 'highlights', kind: 'Press conference', sub: `${T(tid).coach || 'Head coach'} · Wednesday` },
    ]).map(p => poster(p, 150)))}</div>`);
  }

  // podcasts
  s.push(html`<div class="sec">${sh('Podcasts', null, 'All', '#/podcasts')}${hrow(PODCASTS.slice(0, 6).map(p => poster({ ...p, act: 'w-pod', arg: p.k }, 128, '1/1')))}</div>`);

  // watch parties + downloads
  const party = L.find(isMine) || L[0] || up.find(isMine) || up[0];
  if (later.length) {
    const adds = [['audio', 'headphones', 'Listen live', 'Radio calls for every game'], ['condensed', 'rewind', 'Condensed games', 'Every snap in about 40 minutes'], ['all22', 'layers', 'All-22 coaches film', 'The film coaches study'], ['redzone', 'bolt', 'NFL RedZone', 'Every touchdown from every game']].filter(([f]) => !can(f));
    const top = adds.some(([f]) => tierOf(f) === 'premium') ? 'premium' : 'plus';
    s.push(html`<div class="sec pad"><div class="w-adds"><div class="w-adds-h"><span class="ln-logo">${UI.plusLogo()}</span><b>${intl() ? 'What Game Pass adds' : 'What NFL+ adds'}</b></div>
      <div class="w-adds-l">${adds.map(([f, i, t, sub]) => html`<div class="w-adds-r">${icon(i, 'sm')}<span class="grow"><b>${t}</b><span>${sub}</span></span>${badgeFor(f)}</div>`)}</div>
      <button class="btn ${top} block" data-act="upsell" data-arg="${top}">See plans</button></div></div>`, ...later);
  }
  s.push(html`<div class="sec">${sh('Watch together')}
    <div class="list">${party ? UI.row({ left: html`<div class="w-ic">${icon('users')}</div>`, title: `Start a watch party · ${matchup(party)}`, sub: 'Synced reactions with friends — nobody gets spoiled', go: `#/watch-party/${party.id}` }) : ''}
      ${UI.row({ left: html`<div class="w-ic">${icon('download')}</div>`, title: 'Downloads', sub: `${(store.p.downloads || []).length} saved for offline`, go: '#/downloads' })}
      ${UI.row({ left: html`<div class="w-ic">${icon('tv')}</div>`, title: 'Where to watch every game', sub: 'Based on where you are and what you subscribe to', go: '#/where-to-watch' })}</div></div>`);
  lockSeen = null;
  s.push(html`<div class="sec pad"><div class="tiny center">Proof of concept: video plays a sample NFL+ highlights reel. Scores and recaps are real.</div></div>`);
  return s;
}

/* ------------------------------------------------------------------ actions */
A['w-play'] = (el, ev, arg) => {
  let v = {}; try { v = JSON.parse(arg); } catch {}
  const f = v.feat || 'highlights';
  if (!can(f)) return upsellSheet(f);
  // condensed/all-22 availability windows (1h / 24h after the game)
  if (v.game && (f === 'condensed' || f === 'all22' || f === 'replay')) {
    const g = Dt.game(v.game), wait = { condensed: 3600e3, replay: 1800e3, all22: 86400e3 }[f];
    if (now() < ended(g) + wait) return App.toast({ title: `${v.kind} isn't ready yet`, body: `Available ${fmt.until(ended(g) + wait)} from now — we'll notify you.`, icon: 'clock' });
  }
  App.video.play({ ...v, tier: undefined, shownTier: tierOf(f) });
};
A['w-live'] = (el, ev, gid) => {
  const g = Dt.game(gid);
  const o = Dt.watch(g).find(x => x.ok && (x.k === 'nflplus' || x.k === 'dazn')) || (intlFree(g) ? { k: 'dazn' } : null);
  if (!o) return A['w-wtw'](el, ev, gid);
  App.watchGame(gid, true);
};
A['w-wtw'] = (el, ev, gid) => {
  const g = Dt.game(gid);
  App.sheet({ title: `${T(g.a).name} at ${T(g.h).name}`, html: html`<div class="pad"><div class="meta mb12">${fmt.dayLong(g.ts)} · ${fmt.time(g.ts)} ${fmt.tzAbbr(g.ts)}${g.vn ? ' · ' + g.vn : ''}</div>${resolver(g, true)}
    <button class="btn ghost block mt16" data-go="#/where-to-watch">${icon('sliders', 'sm')} Edit my services & location</button></div>` });
};
A['w-remind'] = (el, ev, gid) => {
  const g = Dt.game(gid);
  App.toast({ title: 'Reminder set', body: `We'll ping you 15 min before ${matchup(g)} with where to watch.`, icon: 'bell' });
};
A['w-listen'] = (el, ev, gid) => {
  if (!can('audio')) return upsellSheet('audio');
  audioSheet(gid);
};
/** approved round 5: the title, then the lock note atom with its own "See plans", "Still free for you" as an Eyebrow over Meta,
    and one squared full-width "Not now", so there is only one "See plans" */
function upsellSheet(f) {
  const t = tierOf(f);
  App.sheet({ title: FEAT_NAME[f] || 'Included with a plan', html: html`<div class="pad">
    ${intl() ? html`<div class="lock-note flex"><span class="ln-logo">${UI.plusLogo()}</span><div class="grow t-body-s">${FEAT_NAME[f]} is part of NFL Game Pass on DAZN, which streams every game live in your country.</div><button class="btn sm plus" data-go="#/plans">See plans</button></div>` : UI.lockNote(t, FEAT_NAME[f])}
    <div class="w-free mt12"><div class="t-eyebrow">Still free for you</div><div class="t-meta mt6">Highlights, the NFL Channel, podcasts, live Gamecast, and a guide to where every game is on.</div></div>
    <button class="btn ghost block mt16" data-act="close-sheet">Not now</button></div>` });
}

/* ------------------------------------------------------------------ where-to-watch resolver */
function resolver(g, full) {
  const opts = Dt.watch(g);
  const ok = opts.filter(o => o.ok), no = opts.filter(o => !o.ok);
  const lbl = o => o.k === 'nflplus' ? 'NFL+' : o.label;
  const post = Dt.state(g) === 'post';
  const watchable = ok.filter(o => o.k !== 'audio');
  // approved round 5: the header is the row atom. A check in Positive or an info mark, the title in Title S, the services as soft labels
  const badges = list => html`<div class="w-res-b mt6">${list.map(o => html`<span class="badge">${o}</span>`)}</div>`;
  return html`${ok.length ? html`<div class="row static w-res"><span class="w-res-i ok">${icon('check', 'sm')}</span><div class="row-main"><div class="row-title">${post ? 'Final — rewatch it' : watchable.length ? (watchable.length === 1 && watchable[0].k === 'redzone' ? 'Catch the big moments on' : 'Watch on') : 'Listen on'}</div>
      ${badges((post ? ok : watchable.length ? watchable : ok).map(o => SHORT[o.k] || o.label))}</div></div>` :
    html`<div class="row static w-res"><span class="w-res-i">${icon('info', 'sm')}</span><div class="row-main"><div class="row-title">Not on your current services</div><div class="row-sub">Here's every way to get it</div>${full ? '' : badges(no.slice(0, 3).map(lbl))}</div></div>`}
    ${full ? html`<div class="list mt12" style="margin:12px 0 0">${opts.map(o => UI.row({
      left: html`<span class="w-dot ${o.ok ? 'ok' : ''}">${icon(o.ok ? 'check' : o.tier === 'premium' || o.tier === 'plus' || o.tier === 'dazn' ? 'lock' : 'tv', 'xs')}</span>`,
      title: lbl(o), sub: o.sub, right: o.tier !== 'tv' ? UI.tierBadge(o.tier) : '', act: o.ok ? (o.k === 'nflplus' || o.k === 'dazn' ? 'w-live' : o.k === 'audio' ? 'w-listen' : o.k === 'redzone' ? 'w-go' : 'w-tvinfo') : 'w-get', arg: o.ok && (o.k === 'nflplus' || o.k === 'dazn' || o.k === 'audio') ? g.id : o.k === 'redzone' ? '#/channel/redzone' : o.k,
    }))}</div>` : ''}`;
}
A['w-go'] = (el, ev, h) => { App.closeOverlays(true); App.go(h); };
A['w-tvinfo'] = (el, ev, k) => App.toast({ title: `Opening ${k}`, body: 'Hands off to the network\'s app', icon: 'tv' });
A['w-get'] = (el, ev, k) => {
  App.closeOverlays(true);
  if (k === 'nflplus' || k === 'audio') return App.go('#/plans?t=plus');
  if (k === 'redzone' || k === 'condensed' || k === 'replay' || k === 'all22') return App.go('#/plans?t=premium');
  if (k === 'dazn') return App.go('#/plans');
  App.go('#/where-to-watch');
  App.toast({ title: `Add ${k} to your services`, body: 'Tap it under "My services" if you have it.', icon: 'tv' });
};

App.route('where-to-watch', (params, query, page) => {
  const st = page.state = page.state || {};
  const p = store.p, loc = p.location;
  const cw = Dt.currentWeek();
  const wk = st.week || cw;
  const games = wk.games.filter(g => Dt.scheduleVisible(g)).slice().sort(mineFirst);
  const country = Dt.COUNTRIES.find(c => c[0] === (loc.country || 'US')) || Dt.COUNTRIES[0];
  const where = intl() ? country[1] : (loc.city || 'Set your market');
  const prov = p.providers || [];
  const provList = intl() ? Dt.PROVIDERS.filter(x => x.k === 'dazn') : Dt.PROVIDERS.filter(x => x.k !== 'dazn');
  const weeks = Dt.D.weeks.filter(w => w.s === wk.s && w.t !== 1 && !(w.t === 3 && w.w === 4));
  const ix = weeks.indexOf(wk);
  return {
    title: 'Where to watch',
    html: html`
      <div class="pad mt8"><div class="w-loc">
        <div class="grow"><div class="eyebrow">You're watching from</div><div class="h3 mt6">${where}</div>
          <div class="tiny mt4">${intl() ? 'NFL+ is US-only — NFL Game Pass on DAZN streams every game here.' : (loc.market || []).length ? `Local teams: ${(loc.market || []).map(id => T(id).abbr).join(', ')} · times in ${fmt.tzAbbr(now())}` : 'Pick your market to see your local games'}</div></div>
        <button class="btn sm ghost" data-act="w-loc">Change</button></div></div>
      <div class="sec" style="margin-top:20px"><div class="sec-head"><div class="h2">My services</div><span class="tiny">${subName()}</span></div>
        <div class="ob-provs pad">${provList.map(x => html`<button class="sc-season ob-prov ${prov.includes(x.k) ? 'on' : ''}" data-act="w-prov" data-arg="${x.k}">${prov.includes(x.k) ? icon('check', 'xs') : ''}${x.n}</button>`)}
        ${!intl() ? html`<button class="sc-season ob-prov" data-go="#/plans">${icon('plus', 'xs')}NFL+ plan</button>` : ''}</div></div>
      ${!intl() && p.primary ? seasonPlan(p.primary) : ''}
      <div class="sec"><div class="sec-head"><button class="icon-btn" data-act="w-wk" data-arg="${ix - 1}" ${raw(ix <= 0 ? 'disabled' : '')}>${icon('back', 'sm')}</button>
        <div class="h2 center grow">${Dt.weekLabel(wk.t, wk.w)} · ${wk.s}</div>
        <button class="icon-btn" data-act="w-wk" data-arg="${ix + 1}" ${raw(ix >= weeks.length - 1 ? 'disabled' : '')}>${icon('chev', 'sm')}</button></div>
        ${games.length ? html`<div class="cards">${games.map(g => html`<div class="card w-wcard ${isMine(g) ? 'mine' : ''}">
          <a class="flex gap10 tap" data-go="#/game/${g.id}">${UI.logo(g.a)}<div class="grow"><div class="h4">${T(g.a).name} at ${T(g.h).name}</div>
            <div class="tiny mt4">${fmt.day(g.ts)} · ${fmt.time(g.ts)} ${fmt.tzAbbr(g.ts)} · ${(g.tv || []).join('/') || 'TBD'}${g.note ? ' · ' + g.note : ''}</div></div>${UI.logo(g.h)}</a>
          <div class="mt12">${resolver(g, false)}</div>
          <button class="w-more" data-act="w-wtw" data-arg="${g.id}">All options ${icon('chev', 'xs')}</button></div>`)}</div>` :
          UI.empty('calendar', 'Schedule not released yet', 'The 2026 schedule drops in mid-May.')}</div>`,
    mount(el, pg) { pg.state = st; },
  };
});
/** "how to watch your team all season" — the cost-of-fandom calculator */
function seasonPlan(tid) {
  const s = Dt.seasonForStats(Math.max(now(), Dt.SCHEDULE_RELEASE));
  const gs = Dt.teamGames(tid, s).filter(g => g.t === 2);
  if (!gs.length) return '';
  const nets = {};
  gs.forEach(g => (g.tv || ['TBD']).forEach(n => nets[n] = (nets[n] || 0) + 1));
  const covered = gs.filter(g => Dt.watch(g, g.ts - 1).some(o => o.ok && o.k !== 'audio' && o.k !== 'redzone')).length;
  return html`<div class="sec"><div class="sec-head"><div class="h2">Every ${T(tid).name} game</div><span class="tiny">${s} season</span></div>
    <div class="card pad-all" style="margin:0 var(--pad)"><div class="flex between center"><div class="big-num">${covered}/${gs.length}</div><span class="t-meta">${Math.round(covered / gs.length * 100)}% with what you have</span></div>${UI.bar(covered / gs.length * 100)}
      <div class="w-nets mt12">${Object.entries(nets).sort((a, b) => b[1] - a[1]).map(([n, c]) => html`<span class="w-net"><b class="num">${c}</b> ${n}</span>`)}</div></div></div>`;
}
A['w-prov'] = (el, ev, k) => {
  const p = store.p; p.providers = p.providers || [];
  const i = p.providers.indexOf(k); i >= 0 ? p.providers.splice(i, 1) : p.providers.push(k);
  store.save(); App.refresh();
};
A['w-wk'] = (el, ev, i) => {
  const pg = App.current(); const cw = (pg.state && pg.state.week) || Dt.currentWeek();
  const weeks = Dt.D.weeks.filter(w => w.s === cw.s && w.t !== 1 && !(w.t === 3 && w.w === 4));
  const w = weeks[+i]; if (!w) return;
  pg.state.week = w; App.refresh();
};
A['w-loc'] = () => {
  const loc = store.p.location;
  App.sheet({ title: 'Where are you watching from?', html: html`<div class="pad">
    <div class="eyebrow mb8">Country</div>
    <div class="chips wrapchips" style="padding:0">${Dt.COUNTRIES.map(c => html`<button class="chip ${loc.country === c[0] ? 'on' : ''}" data-act="w-country" data-arg="${c[0]}">${c[1]}</button>`)}</div>
    ${!intl() ? html`<div class="eyebrow mb8 mt20">TV market</div><div class="list" style="margin:0">${Dt.MARKETS.map(m => UI.row({ title: m[0], sub: m[2].join(' · ') || 'No local team', act: 'w-market', arg: m[0], right: loc.city === m[0] ? icon('check', 'sm accent') : '' }))}</div>` : ''}</div>` });
};
A['w-country'] = (el, ev, cc) => {
  const c = Dt.COUNTRIES.find(x => x[0] === cc);
  Object.assign(store.p.location, { country: cc, tz: c[2] });
  if (cc !== 'US') { store.p.location.market = []; store.p.location.city = ''; }
  store.save(); App.closeSheet(true); App.refreshAll();
  App.toast({ title: `Watching from ${c[1]}`, body: cc === 'US' ? 'Pick your TV market next.' : 'Kickoffs now show in your local time.', icon: 'globe' });
  if (cc === 'US') setTimeout(() => A['w-loc'](), 50);
};
A['w-market'] = (el, ev, name) => {
  const m = Dt.MARKETS.find(x => x[0] === name);
  Object.assign(store.p.location, { city: name, tz: m[1], market: Dt.marketTeams(name), country: 'US' });
  store.save(); App.closeSheet(true); App.refreshAll();
};

/* ------------------------------------------------------------------ plans */
const PLAN_ROWS = [
  ['Scores, Gamecast, stats & news', 'free', 'free', 'free'],
  ['Highlights', 'With ads', 'Ad-free', 'Ad-free'],
  ['NFL Channel (24/7)', 'free', 'free', 'free'],
  ['Live local & primetime games', '', 'Mobile', 'Mobile'],
  ['Live audio — every game', '', 'free', 'free'],
  ['NFL Network 24/7', 'TV login', 'free', 'free'],
  ['Out-of-market preseason', '', 'free', 'free'],
  ['NFL Films library', 'Limited', 'free', 'free'],
  ['NFL RedZone', '', '', 'free'],
  ['Full & condensed replays', '', '', 'free'],
  ['All-22 coaches film', '', '', 'free'],
  ['NFL Pro advanced stats', '', '', 'free'],
];
App.route('plans', (params, query, page) => {
  const st = page.state = page.state || { yr: false };
  const cur = store.p.sub, focus = query.t;
  const price = { free: ['$0', '$0'], plus: ['$6.99/mo', '$49.99/yr'], premium: ['$14.99/mo', '$99.99/yr'] };
  const plans = [
    { k: 'free', n: 'Free', line: 'Everything you need to follow the game.' },
    { k: 'plus', n: 'NFL+', line: 'Your local & primetime games live, plus every radio call.' },
    { k: 'premium', n: 'NFL+ Premium', line: 'RedZone, every replay and All-22 — on any screen.' },
  ];
  const cell = v => v === 'free' ? icon('check', 'sm c-win') : v ? html`<span class="tiny">${v}</span>` : html`<span class="dim">—</span>`;
  return {
    title: 'Plans',
    html: html`
      ${intl() ? html`<div class="pad mt8"><div class="w-dazn"><div class="eyebrow" style="color:#f8ff13">Outside the US</div><div class="h2 mt8">NFL Game Pass on DAZN</div>
        <p class="meta mt8">NFL+ is only sold in the US. Where you are, Game Pass streams every game live and on demand — RedZone, condensed replays and All-22 included — with local-language commentary on selected games, and one free game every week.</p>
        <button class="btn ${hasDazn() ? 'ghost' : 'white'} block mt12" data-act="w-dazn">${hasDazn() ? html`${icon('check', 'sm')} I have Game Pass` : 'I have Game Pass on DAZN'}</button></div></div>` : ''}
      ${!intl() ? html`<div class="pad mt8">${UI.seg([{ k: 0, l: 'Monthly' }, { k: 1, l: 'Yearly · save 40%' }], st.yr ? 1 : 0, 'w-yr')}</div>
      <div class="w-plans mt12">${plans.map(p => html`<div class="w-plan ${p.k} ${cur === p.k ? 'cur' : ''} ${focus === p.k ? 'focus' : ''}">
        <div class="flex between">${p.k === 'free' ? html`<div class="t-title">${p.n}</div>` : html`<div class="w-plan-n">${UI.plusLogo()}${p.k === 'premium' ? html`<span>Premium</span>` : ''}</div>`}${cur === p.k ? html`<span class="badge">Your plan</span>` : ''}</div>
        <div class="mt8">${(([v, per]) => html`<span class="t-dl">${v}</span>${per ? html`<span class="t-meta"> /${per}</span>` : ''}`)(price[p.k][st.yr ? 1 : 0].split('/'))}</div><div class="t-meta mt6">${p.line}</div>
        ${cur !== p.k ? html`<button class="btn block mt12 ${p.k === 'premium' ? 'premium' : p.k === 'plus' ? 'plus' : 'ghost'}" data-act="w-plan" data-arg="${p.k}">${p.k === 'free' ? 'Switch to Free' : (cur === 'premium' && p.k === 'plus' ? 'Switch to NFL+' : `Try ${p.n} free for 7 days`)}</button>` : html`<div class="t-meta mt12">${p.k === 'free' ? 'No card needed, ever.' : 'Renews ' + fmt.date(now() + 30 * 864e5) + ' · cancel anytime'}</div>`}</div>`)}</div>
      <div class="sec">${UI.secHead('Compare')}<div class="tbl-wrap"><table class="tbl w-cmp"><thead><tr><th></th><th>Free</th><th>NFL+</th><th>Prem.</th></tr></thead>
        <tbody>${PLAN_ROWS.map(r => html`<tr><td>${r[0]}</td><td>${cell(r[1])}</td><td>${cell(r[2])}</td><td>${cell(r[3])}</td></tr>`)}</tbody></table></div></div>
      <div class="sec pad"><div class="w-promise"><div class="flex gap8">${icon('check', 'sm c-win')}<div class="h4">Fan-first promise</div></div>
        <p class="meta mt8">If a live stream fails at kickoff, we credit your account automatically — no support ticket. Annual plans remind you a week before they renew.</p></div></div>
      <div class="sec">${UI.secHead('Other ways to watch')}<div class="list">
        ${[['Your local channels', 'CBS, FOX, NBC & ABC are free over the air in your market'], ['NFL Sunday Ticket', 'Out-of-market Sunday afternoon games · YouTube'], ['ESPN Unlimited', 'Monday Night Football, NFL Network and ESPN-exclusive games'], ['Prime Video', 'Thursday Night Football'], ['Peacock', 'Sunday Night Football and exclusive games'], ['Netflix', 'Christmas Day games']]
          .map(([t, s]) => UI.row({ title: t, sub: s }))}</div></div>` : ''}
      <div class="sec">${UI.secHead('Questions')}<div class="list">${FAQ.map((f, i) => UI.row({ title: f[0], act: 'w-faq', arg: String(i), chev: true }))}</div></div>
      <div class="spacer"></div>`,
  };
});
const FAQ = [
  ['Can I watch NFL+ games on my TV?', 'Live games on NFL+ are phone and tablet only — that\'s how the TV-rights deals work. Replays, condensed games and All-22 on NFL+ Premium play on any device, including TVs.'],
  ['Why is a game blacked out?', 'NFL+ streams the games airing on TV in your market (your local CBS/FOX games) plus national primetime games. Out-of-market Sunday afternoon games are on NFL Sunday Ticket. Use Where to watch to see every option for every game.'],
  ['Does NFL+ include RedZone?', 'NFL RedZone is included with NFL+ Premium, on phone, tablet and connected TV.'],
  ['When do replays show up?', 'Full replays are available shortly after the game, condensed games about an hour after, and All-22 within 24–48 hours.'],
  ['Can I cast?', 'You can cast highlights, NFL Films and Premium replays. Live NFL+ games can\'t be cast or mirrored.'],
  ['I live outside the US', 'NFL+ is US-only. NFL Game Pass on DAZN streams every game live in 200+ countries — set your country under Where to watch.'],
];
A['w-faq'] = (el, ev, i) => { const f = FAQ[+i]; App.sheet({ title: f[0], html: html`<div class="pad"><p class="article-body" style="font-size:16px">${f[1]}</p></div>` }); };
A['w-yr'] = (el, ev, v) => { App.current().state.yr = v === '1'; App.refresh(); };
A['w-plan'] = (el, ev, k) => {
  store.set({ sub: k });
  App.toast({ title: k === 'free' ? 'You\'re on Free' : `Welcome to ${UI.TIER[k].n}`, body: k === 'free' ? 'Scores, highlights and the NFL Channel stay free.' : 'Prototype: no charge. Everything unlocks now.', icon: 'check' });
  App.refreshAll();
};
A['w-dazn'] = () => {
  const p = store.p; p.providers = p.providers || [];
  const i = p.providers.indexOf('dazn'); i >= 0 ? p.providers.splice(i, 1) : p.providers.push('dazn');
  store.save(); App.refreshAll();
};

/* ------------------------------------------------------------------ channels */
App.route('channel/:k', ({ k }) => channelPage(k));
function channelPage(k) {
  if (k === 'redzone') return redzonePage();
  const net = k === 'nfl-network';
  const list = net ? NETWORK_SHOWS : CHANNEL_SHOWS, seed = net ? 3 : 0, feat = net ? 'network' : 'channel';
  const ok = can(feat);
  return {
    title: net ? 'NFL Network' : 'NFL Channel',
    html: html`<div class="pad mt8"><a class="w-player tap" data-act="w-play" data-arg="${JSON.stringify({ title: nowPlaying(list, seed), kind: net ? 'NFL Network · Live' : 'NFL Channel · Live', feat, sub: 'Live now' })}">
        <div class="w-chan-logo big ${net ? 'net' : ''}">NFL<br><span>${net ? 'NETWORK' : 'CHANNEL'}</span></div>
        <div class="w-player-ov"><span class="badge live">Live</span><div class="h3 mt6">${nowPlaying(list, seed)}</div></div>
        <div class="w-player-btn">${icon(ok ? 'play' : 'lock')}</div></a></div>
      <div class="pad mt12">${net ? html`<div class="flex gap8">${badgeFor('network')}<span class="tiny">Also on ESPN Unlimited and with your TV provider</span></div>${softLock('network')}` :
        html`<div class="flex gap8"><span class="badge free">Free</span><span class="t-meta">Streams 24/7 for everyone, no account needed</span></div>`}</div>
      <div class="sec">${UI.secHead('Schedule')}${grid(list, seed, feat)}</div>`,
  };
}
/** the RedZone card (approved 2026-10-29): live media with a size-M call to action, Live beside the RedZone logo,
    the tracker of who's knocking on the door, and off the air a DAYS : HRS : MINS countdown to the next window */
function rzCard(opts = {}) {
  const on = redzoneOn(), ok = can('redzone'), next = nextRedzone();
  const L = liveNow().filter(g => !Dt.nationalWindow(g));
  const cta = ok ? html`<button class="btn white rzc-cta" data-go="#/channel/redzone">${icon('play', 'sm')}${on ? 'Watch RedZone' : 'RedZone'}</button>`
    : html`<button class="btn cta rzc-cta" data-go="#/plans?t=premium">${UI.plusLogo()}Get RedZone</button>`;
  const n = UI.rzEntries().length;
  const cd = ts => { const d = Math.max(0, ts - time.now()), p = v => String(v).padStart(2, '0');
    return html`<div class="rzc-cd"><div><b class="t-dxl">${p(Math.floor(d / 864e5))}</b><span>Days</span></div><i>:</i><div><b class="t-dxl">${p(Math.floor(d / 36e5) % 24)}</b><span>Hrs</span></div><i>:</i><div><b class="t-dxl">${p(Math.floor(d / 6e4) % 60)}</b><span>Mins</span></div></div>
      <div class="rzc-cd-cap">Until the action begins · ${fmt.weekday(ts)} ${fmt.time(ts)}</div>`; };
  return html`<div class="rzc rzc2">
    ${opts.media !== false ? html`<div class="rzc-media"><video src="assets/video/highlights.mp4" autoplay muted loop playsinline preload="metadata"></video>${cta}</div>` : ''}
    <div class="rzc-body"><div class="rz-mark">${UI.rzLogo()}${on ? raw('<span class="badge live">Live</span>') : ''}</div>
      ${on ? (n ? UI.rzTrack() : html`<div class="rzc-empty mt8">Nobody's inside the 30 right now. RedZone is whipping around ${L.length} games.</div>`)
        : next ? cd(next) : html`<div class="rzc-empty mt8">Every touchdown from every Sunday afternoon game.</div>`}
      ${opts.media === false ? html`<div class="pad mt12">${cta}</div>` : ''}</div></div>`;
}
App.UI.rzCard = rzCard;
/* ---------- RedZone: a channel page that feels like the broadcast. The player leads; everything below
   tracks what RedZone is about: who's on the doorstep, every touchdown, and the whip-around. */
function rzGames() { return liveNow().filter(g => !Dt.nationalWindow(g) && g.t === 2); }
/** today's RedZone touchdowns (live plays up to now, plus finished afternoon games), newest first; spoiled games are skipped */
function rzTouchdowns() {
  const n = now(), day = fmt.dayKey(n), out = [];
  Dt.D.games.forEach(g => {
    if (g.t !== 2 || Dt.nationalWindow(g) || fmt.dayKey(g.ts) !== day || Dt.state(g, n) === 'pre' || Dt.spoiled(g)) return;
    if (Dt.state(g, n) === 'live') {
      const L = Dt.live(g, n); if (!L) return;
      let as = 0, hs = 0;
      L.plays.slice(0, L.idx + 1).forEach(p => { if (p.as != null) { as = p.as; hs = p.hs; } if (p.sc && /TOUCHDOWN/.test(p.x || '') && !/extra point|TWO-POINT/i.test(p.x || '')) out.push({ g, ts: p._wc || g.ts, t: p.team, text: App.playCaption ? App.playCaption(p, g) : p.x, as, hs, q: p.q, c: p.c }); });
    } else ((Dt.box(g.id) || {}).sp || []).filter(s => /touchdown/i.test(s.ty || '') || /TD/.test(s.ty || '')).forEach((s, i) => out.push({ g, ts: g.ts + i * 600e3, t: s.t, text: (s.x || '').replace(/\s*\([^)]*\)/g, ''), as: s.as, hs: s.hs, q: s.q, c: s.c }));
  });
  return out.sort((a, b) => b.ts - a.ts);
}
function rzChyron(g) {
  if (!g) return '';
  const S = Dt.score(g), pos = S.poss && T(S.poss), hide = Dt.spoiled(g);
  return html`<div class="rzh-chy" style="${raw('--tc:' + App.teamFill(pos || T(g.h)))}">
    <span class="rzh-chy-k">${S.redzone ? 'In the red zone' : 'On now'}</span>
    <span class="rzh-chy-sc">${UI.logo(g.a, 'xs')}<b>${T(g.a).abbr} ${hide ? '' : S.as}</b><i>–</i><b>${hide ? '' : S.hs} ${T(g.h).abbr}</b>${UI.logo(g.h, 'xs')}</span>
    <span class="rzh-chy-dd">${S.label}${!hide && S.dd ? ' · ' + S.dd : ''}</span></div>`;
}
function rzLive() {
  const L = rzGames(), on = L.length > 0, ok = can('redzone');
  const es = UI.rzEntries(30), tds = rzTouchdowns(), inside20 = es.filter(e => e.yz <= 20).length;
  const out = [];
  // the day in three numbers
  if (L.length || tds.length) out.push(html`<div class="rz-stats"><div><b>${tds.length}</b><span>Touchdowns today</span></div><div><b>${L.length}</b><span>Games on now</span></div><div class="${inside20 ? 'hot' : ''}"><b>${inside20}</b><span>Inside the 20</span></div></div>`);
  // on the doorstep
  if (on) out.push(html`<section class="rz-sec"><div class="rz-h"><span>On the doorstep</span><em>Every drive inside the 30</em></div>
    <div class="rz-box">${es.length ? html`${UI.rzTrack()}${UI.rzFollowed()}` : html`<div class="rz-calm">Nobody's inside the 30 right now. RedZone is whipping around ${L.length} games.</div>`}
    ${es.length ? html`<div class="rz-drives">${es.slice().sort((a, b) => a.yz - b.yz).map(e => { const S = e.S, t = T(e.t); return html`<a class="rz-drive tap ${e.yz <= 20 ? 'hot' : ''}" data-go="#/game/${e.g.id}" style="${raw('--tc:' + App.teamFill(t))}">
      <span class="rz-dl"><img src="${t.logo}" alt=""></span><div class="grow"><div class="rz-d1">${t.name} <span>at the ${e.yz}</span></div><div class="rz-d2">${S.dd} · ${S.label}</div></div>
      <div class="rz-dsc"><b>${S.as}</b><i>${T(e.g.a).abbr}</i></div><div class="rz-dsc"><b>${S.hs}</b><i>${T(e.g.h).abbr}</i></div></a>`; })}</div>` : ''}</div></section>`);
  // every touchdown
  if (tds.length) out.push(html`<section class="rz-sec"><div class="rz-h"><span>Every touchdown</span><em>${tds.length} today, newest first</em></div>
    <div class="rz-tds">${tds.slice(0, 10).map(x => { const t = T(x.t) || T(x.g.h); return html`<button class="rz-td tap" data-act="play-video" data-arg="${JSON.stringify({ title: x.text, sub: `${T(x.g.a).abbr} at ${T(x.g.h).abbr} · Q${x.q} ${x.c || ''}`, kind: 'RedZone touchdown', team: t.id })}" style="${raw('--tc:' + App.teamFill(t))}">
      <span class="rz-td-l"><img src="${t.logo}" alt=""></span><div class="grow"><div class="rz-td-t">${x.text}</div><div class="rz-td-s">${T(x.g.a).abbr} ${x.as} · ${T(x.g.h).abbr} ${x.hs} · Q${x.q} ${x.c || ''}</div></div><span class="rz-td-p">${icon('play', 'xs')}</span></button>`; })}</div></section>`);
  // the whip-around
  if (on) out.push(html`<section class="rz-sec"><div class="rz-h"><span>The whip-around</span><em>${L.length} afternoon games</em></div>
    <div class="rz-grid">${L.map(g => { const S = Dt.score(g), hide = Dt.spoiled(g), side = (tid, v) => html`<div class="rz-gt ${!hide && S.poss === tid ? 'ball' : ''}" style="${raw('--tc:' + App.teamFill(T(tid)))}"><img src="${T(tid).logo}" alt=""><span>${T(tid).abbr}</span><b>${hide ? '–' : v}</b></div>`;
      return html`<a class="rz-g tap ${S.redzone && !hide ? 'hot' : ''}" data-go="#/game/${g.id}">${side(g.a, S.as)}${side(g.h, S.hs)}<div class="rz-gf"><span>${S.label}</span>${S.redzone && !hide ? html`<em>Red zone</em>` : html`<span>${(g.tv || [])[0] || ''}</span>`}</div></a>`; })}</div></section>`);
  // alerts for your team
  const mine = store.p.primary && T(store.p.primary);
  if (mine) out.push(html`<section class="rz-sec"><div class="rz-alert"><span class="rz-dl" style="${raw('--tc:' + App.teamFill(mine))}"><img src="${mine.logo}" alt=""></span><div class="grow"><div class="b">Red zone alerts for the ${mine.name}</div><div class="rz-d2">A nudge the moment they get inside the 20, so you can switch to RedZone.</div></div>${UI.toggle(!!store.p.rzAlert, 'rz-alert')}</div></section>`);
  out.push(html`<div class="rz-about">${icon('info', 'xs')}<span>RedZone jumps live to every touchdown from every Sunday afternoon game, commercial-free, from 1:00 to 8:00 PM ET. Primetime games aren't included.${ok ? '' : ' It comes with NFL+ Premium.'}</span></div>`);
  return html`${out}`;
}
function redzonePage() {
  const L = rzGames(), on = L.length > 0, ok = can('redzone'), next = nextRedzone();
  const focus = L.find(g => Dt.score(g).redzone && !Dt.spoiled(g)) || L.find(g => !Dt.spoiled(g)) || L[0];
  const play = JSON.stringify({ title: 'NFL RedZone', kind: 'RedZone · Live', feat: 'redzone', live: focus ? focus.id : null, sub: 'Every touchdown from every game' });
  const live = ok && on;   // it plays right here; no separate player
  // approved round 6 (redzone-ask B): the video stays clear; a free fan is asked once, in the lock note under the chyron
  const centre = !ok || on ? ''
    : html`<div class="rzh-off"><div class="rzh-off-k">Next on RedZone</div><div class="rzh-off-t">${next ? fmt.dayLong(next).split(',')[0] + ' · ' + fmt.time(next) : 'Next Sunday'}</div></div>`;
  const viewers = on ? fmt.n(900000 + (Math.floor(now() / 600e3) % 40) * 23000) : '';
  return {
    title: 'NFL RedZone', className: 'rz-page',
    html: html`<section class="rzh">
        <div class="rzh-player ${live ? 'playing' : ''}">
          <video src="assets/video/highlights.mp4" autoplay muted loop playsinline preload="metadata" ${raw(live ? 'controls' : '')}></video>
          <div class="rzh-shade"></div>
          <div class="rzh-top">${UI.rzLogo('sm')}${on ? html`<span class="badge live">Live</span><span class="rzh-v">${icon('users', 'xs')}${viewers}</span>` : ''}
            ${live ? html`<span class="rzh-tools"><button class="icon-btn" data-act="rz-pip" aria-label="Picture in picture">${icon('pip', 'sm')}</button><button class="icon-btn" data-act="toast" data-arg="Casting RedZone to Living Room TV" aria-label="Cast">${icon('cast', 'sm')}</button></span>` : ''}</div>
          ${centre}
          ${live ? App.pip.heldBtn() : ''}
        </div>
        ${on ? html`<div class="rzh-chyw">${rzChyron(focus)}</div>` : ''}
        ${ok ? html`<div class="rzh-bar">
            ${on ? '' : html`<button class="btn white" disabled>${icon('play', 'sm')}Starts ${next ? fmt.dayLong(next).split(',')[0] : 'Sunday'}</button>`}
            <button class="btn ${on ? 'white' : 'rzh-ghost'}" data-go="#/multiview">${icon('grid', 'sm')}Multiview</button>
          </div>
          <div class="rzh-inc">${icon('check', 'xs')}Included with your ${subName()} · commercial-free</div>`
        : html`<div class="rzh-note"><div class="rzh-nh"><span class="ln-logo">${UI.plusLogo()}</span><span>RedZone comes with NFL+ Premium: every touchdown from every Sunday afternoon game.</span></div><div class="rzh-nb"><button class="btn plus" data-go="#/plans?t=premium">See plans</button><button class="btn rzh-line" data-act="w-play" data-arg="${JSON.stringify({ title: 'RedZone: last week\'s touchdowns', kind: 'Free preview', feat: 'highlights' })}">${icon('play', 'sm')}Free preview</button></div>`}
      </section>
      <div class="rz-live">${rzLive()}</div>`,
    mount(el) {
      // coming back from picture-in-picture: keep the same stream going
      const box = el.querySelector('.rzh-player.playing'); if (!box) return;
      const back = App.pip.take('redzone');
      if (back) { const v = back.querySelector('video'); box.querySelector('video').replaceWith(v); v.controls = true; v.play().catch(() => {}); }
      else if (App.pip.gid) App.pip.hold(box);   // something's in the corner: it keeps playing, this waits
      App.pip.claim(box);
    },
    tick(el) {
      const sig = rzEntries30Sig();
      if (sig === el._rzSig) return; el._rzSig = sig;
      const box = el.querySelector('.rz-live'); if (box) box.innerHTML = rzLive().toString();
      const chy = el.querySelector('.rzh-chyw'); if (chy) { const L2 = rzGames(); const f = L2.find(g => Dt.score(g).redzone && !Dt.spoiled(g)) || L2.find(g => !Dt.spoiled(g)) || L2[0]; chy.innerHTML = rzChyron(f).toString(); }
    },
  };
}
/** a team's videos: its last few games' highlights, then its press conference and team show (team page, search) */
function teamVideos(tid) {
  const games = finished(400).filter(g => g.h === tid || g.a === tid).slice(0, 4);
  return html`${hrow([
    ...games.map(g => wcard(gameVideo(g), 220)),
    poster({ title: `${T(tid).name} press conference`, eyebrow: 'Live & on demand', big: 'PRESSER', bg: T(tid).color, team: tid, feat: 'highlights', kind: 'Press conference', sub: `${T(tid).coach || 'Head coach'} · Wednesday` }, 220, '16/9'),
    poster({ title: `${T(tid).name} All Access`, eyebrow: T(tid).abbr, big: T(tid).name.toUpperCase(), bg: T(tid).color, team: tid, feat: 'highlights', kind: 'Team show', sub: 'Free · new episode weekly' }, 220, '16/9'),
  ])}<div class="pad mt8"><a class="tiny w-link" data-go="#/replays?mode=highlights">${icon('rewind', 'xs')} Every replay, by team and week</a></div>`;
}
App.watchParts = { teamVideos, continueWatching, gameVideo, hero, renderWatch, gameTile, schedule, nowPlaying, CHANNEL_SHOWS, NETWORK_SHOWS, can, tierOf, liveNow, upcoming, matchup, channelPage, grid };
App.rzParts = { page: redzonePage, live: rzLive };
function rzEntries30Sig() { return rzGames().map(g => { const S = Dt.score(g); return g.id + ':' + S.as + '-' + S.hs + ':' + S.dd + ':' + S.label; }).join('|'); }
const rzVideo = () => { const p = App.current(); return p && p.el.querySelector('.rzh-player.playing video'); };
A['rz-pip'] = () => { const v = rzVideo(); if (!v) return; const d = document.createElement('div'); d.className = 'gcp'; v.replaceWith(document.createElement('video')); d.appendChild(v); App.pip.open('redzone', d); App.back(); };
A['rz-alert'] = (el) => { store.p.rzAlert = !store.p.rzAlert; store.save(); el.classList.toggle('on', store.p.rzAlert); el.setAttribute('aria-pressed', store.p.rzAlert ? 'true' : 'false'); App.toast({ title: store.p.rzAlert ? 'Red zone alerts on' : 'Red zone alerts off', icon: 'bell' }); };

/* ------------------------------------------------------------------ replays */
App.route('replays', (params, query, page) => {
  const st = page.state = page.state || { mode: query.mode || 'condensed', team: null, scores: false };
  return Promise.all([Dt.ensureBox(Dt.seasonForStats()), Dt.ensureBox(Dt.seasonForStats() - 1)].map(p => p.catch(() => {}))).then(() => {
    let fin = finished(400);
    const wkKeys = [...new Set(fin.map(g => `${g.s}-${g.t}-${g.w}`))].slice(0, 24);
    st.wk = st.wk || wkKeys[0];
    const teamF = st.team;
    let list = teamF ? fin.filter(g => g.h === teamF || g.a === teamF).slice(0, 25) : fin.filter(g => `${g.s}-${g.t}-${g.w}` === st.wk);
    const feat = st.mode === 'highlights' ? 'highlights' : st.mode;
    const tchips = [{ k: '', l: 'All teams' }, ...store.p.teams.map(id => ({ k: id, l: T(id).abbr })), ...Dt.D.teams.filter(t => !store.p.teams.includes(t.id)).map(t => ({ k: t.id, l: t.abbr }))];
    return {
      title: 'Replays',
      html: html`<div class="mt8">${UI.tabs([{ k: 'condensed', l: 'Condensed' }, { k: 'replay', l: 'Full game' }, { k: 'all22', l: 'All-22' }, { k: 'highlights', l: 'Highlights' }], st.mode, 'w-rmode', 'sm')}</div>
        <div class="pad mt12">${softLock(feat)}</div>
        <div class="chips mt12"><button class="sc-season" data-act="w-rteam-sheet">${teamF ? T(teamF).name : 'All teams'}${icon('down', 'xs')}</button>${!teamF ? html`<button class="sc-season" data-act="w-rwk-sheet" data-arg="${wkKeys.join(',')}">${(() => { const [s2, t, w] = st.wk.split('-').map(Number); return Dt.weekLabel(t, w, true) + (s2 !== Dt.seasonForStats() ? ' ’' + String(s2).slice(2) : ''); })()}${icon('down', 'xs')}</button>` : ''}</div>
        <div class="flex between pad mt16"><span class="tiny">${icon('eyeoff', 'xs')} Scores ${st.scores ? 'shown' : 'hidden — no spoilers'}</span><button class="btn xs ghost" data-act="w-rscores">${st.scores ? 'Hide scores' : 'Show scores'}</button></div>
        <div class="list mt8">${list.length ? list.map(g => {
          const v = gameVideo(g, st.mode); const wait = { condensed: 3600e3, replay: 1800e3, all22: 86400e3, highlights: 0 }[st.mode];
          const ready = now() >= ended(g) + wait;
          return UI.row({ left: html`<span class="mu-tile">${UI.logo(g.a, 'xs')}${UI.logo(g.h, 'xs')}</span>`,
            title: st.mode === 'highlights' && st.scores ? v.title : `${T(g.a).name} at ${T(g.h).name}`,
            sub: html`${Dt.weekLabel(g.t, g.w)} · ${fmt.date(g.ts)}${st.scores && !Dt.spoiled(g) ? html` · <b class="num">${g.as}–${g.hs}</b>` : ''}${!ready ? html` · ready in ${fmt.until(ended(g) + wait)}` : ''}${can(feat) ? '' : html` · ${icon('lock', 'xs')} NFL+`}`,
            right: can(feat) ? html`<button class="icon-btn" data-act="w-dl" data-arg="${JSON.stringify(v)}" aria-label="Download">${icon('download', 'sm')}</button>` : '',
            act: 'w-play', arg: JSON.stringify(v) });
        }) : UI.empty('video', 'No games', 'Try another week.')}</div>`,
    };
  });
});
A['w-rmode'] = (el, ev, m) => { App.current().state.mode = m; App.refresh(); };
A['w-rteam'] = (el, ev, t) => { App.closeSheet(); App.current().state.team = t || null; App.refresh(); };
A['w-rwk'] = (el, ev, k) => { App.closeSheet(); App.current().state.wk = k; App.refresh(); };
// replay-rows A (approved 2026-11-08): team and week are dropdown chips that open sheets
A['w-rteam-sheet'] = () => { const cur = App.current().state.team || '';
  App.sheet({ title: 'Team', html: html`<div class="list">${[{ id: '', name: 'All teams' }, ...store.p.teams.map(T), ...Dt.D.teams.filter(t => !store.p.teams.includes(t.id))].map(t => UI.row({ left: t.id ? UI.logo(t.id, 'sm') : '', title: t.name, act: 'w-rteam', arg: t.id, right: (t.id || '') === cur ? icon('check', 'sm') : '' }))}</div>` }); };
A['w-rwk-sheet'] = (el, ev, keys) => { const cur = App.current().state.wk;
  App.sheet({ title: 'Week', html: html`<div class="list">${keys.split(',').map(k => { const [s2, t, w] = k.split('-').map(Number); return UI.row({ title: `${Dt.weekLabel(t, w)}${s2 !== Dt.seasonForStats() ? ' · ' + s2 : ''}`, act: 'w-rwk', arg: k, right: k === cur ? icon('check', 'sm') : '' }); })}</div>` }); };
A['w-rscores'] = () => { const s = App.current().state; s.scores = !s.scores; App.refresh(); };

/* ------------------------------------------------------------------ downloads */
A['w-dl'] = (el, ev, arg) => {
  const v = JSON.parse(arg); const p = store.p; p.downloads = p.downloads || [];
  if (p.downloads.find(d => d.id === v.id)) return App.toast({ title: 'Already downloaded', icon: 'download' });
  p.downloads.unshift({ ...v, at: now(), mb: v.feat === 'replay' ? 2400 : v.feat === 'condensed' ? 620 : 90 + (+String(v.game || 7).slice(-2)) });
  store.save(); App.toast({ title: 'Downloading', body: v.title, icon: 'download', go: '#/downloads' });
};
App.route('downloads', () => {
  const p = store.p, dl = p.downloads || [];
  const used = dl.reduce((a, d) => a + (d.mb || 0), 0);
  return {
    title: 'Downloads',
    html: html`<div class="pad mt8"><div class="card pad-all"><div class="flex between center"><div class="big-num">${(used / 1024).toFixed(1)} GB</div><span class="t-meta">of 8 GB on this device</span></div>${UI.bar(used / 8192 * 100)}</div></div>
      <div class="sec"><div class="list">
        ${UI.row({ title: 'Auto-download your team\'s condensed game', sub: 'Every Monday on Wi-Fi — perfect for the commute', right: UI.toggle(!!p.autoDl, 'w-autodl') })}
        ${UI.row({ title: 'Download quality', sub: 'High (720p)', act: 'toast', arg: 'Quality: Data saver · Standard · High' })}</div></div>
      <div class="sec">${UI.secHead('Saved')}${dl.length ? html`<div class="list">${dl.map(d => UI.row({ left: d.game ? html`<div class="flex" style="gap:2px">${UI.logo(Dt.game(d.game).a, 'sm')}${UI.logo(Dt.game(d.game).h, 'sm')}</div>` : html`<div class="w-ic">${icon('video')}</div>`,
        title: d.title, sub: `${d.kind || 'Video'} · ${d.mb} MB · ${fmt.ago(d.at)}`, right: html`<button class="icon-btn" data-act="w-dldel" data-arg="${d.id}">${icon('close', 'sm')}</button>`, act: 'w-play', arg: JSON.stringify(d) }))}</div>` :
        UI.empty('download', 'Nothing downloaded yet', 'Tap the download icon on any replay or highlight to watch it offline — on a plane, in a tunnel, or abroad.', html`<button class="btn sm ghost mt16" data-go="#/replays">Browse replays</button>`)}</div>`,
  };
});
A['w-dldel'] = (el, ev, id) => { store.p.downloads = (store.p.downloads || []).filter(d => d.id !== id); store.save(); App.refresh(); };
A['w-autodl'] = () => { store.p.autoDl = !store.p.autoDl; store.save(); App.refresh(); };

/* ------------------------------------------------------------------ audio */
let audio = { gid: null, feed: 'home', delay: 0, playing: false };
function feeds(g) {
  const h = T(g.h), a = T(g.a);
  const f = [{ k: 'home', n: `${h.name} Radio Network`, s: 'Home call' }, { k: 'away', n: `${a.name} Radio Network`, s: 'Away call' }, { k: 'national', n: 'National radio', s: 'Westwood One' }];
  if (['DAL', 'HOU', 'MIA', 'ARI', 'SF', 'LAR', 'LAC', 'SEA', 'DEN', 'KC', 'NYJ', 'NYG'].some(x => x === h.abbr || x === a.abbr)) f.push({ k: 'es', n: 'En español', s: `${(['DAL', 'HOU', 'MIA', 'ARI', 'SF', 'LAR', 'LAC', 'SEA', 'DEN', 'KC', 'NYJ', 'NYG'].includes(h.abbr) ? h : a).name} radio en español` });
  return f;
}
function audioSheet(gid) {
  const g = Dt.game(gid);
  if (audio.gid !== gid) audio = { gid, feed: store.p.teams.includes(g.a) ? 'away' : 'home', delay: audio.delay, playing: true };
  const draw = () => {
    const S = Dt.score(g), fs = feeds(g);
    // the wave is in the feed team's own primary (the league's for national); each bar has its own ceiling, loudest in the middle
    const tm = audio.feed === 'away' ? T(g.a) : audio.feed === 'national' ? null : T(g.h), wc = tm ? App.teamFill(tm) : 'var(--text)', n = 32;
    const bars = Array.from({ length: n }, (_, i) => { const env = .35 + .65 * Math.sin(Math.PI * (i + .5) / n), m = Math.max(.22, env * (.62 + .38 * Math.abs(Math.sin(i * 1.7)))); return raw(`<i style="--m:${m.toFixed(2)};animation-delay:${(i * 73) % 900}ms"></i>`); });
    return html`<div class="pad">
      <div class="w-aplayer"><div class="w-wave ${audio.playing ? 'on' : ''}" style="--w:${wc}">${bars}</div>
        <div class="flex between mt12"><div><div class="t-title-s">${fs.find(f => f.k === audio.feed).n}</div><div class="mt6">${S.st === 'live' ? UI.lk5(S) : html`<span class="t-meta">${S.st === 'pre' ? 'Pregame show starts 1 hour before kickoff' : 'Final · replay of the radio call'}</span>`}</div></div>
        <button class="btn l sq" data-act="w-aplay" aria-label="${audio.playing ? 'Pause' : 'Play'}">${icon(audio.playing ? 'pause' : 'play')}</button></div></div>
      <div class="t-eyebrow mt20 mb8">Broadcast</div>
      <div class="list" style="margin:0">${fs.map(f => UI.row({ title: f.n, sub: f.s, act: 'w-afeed', arg: f.k, right: audio.feed === f.k ? icon('check', 'sm') : '' }))}</div>
      <div class="t-eyebrow mt20 mb8">Sync radio to your TV</div>
      <div class="w-apdelay"><div class="flex between"><span class="t-meta">Delay the radio call</span>${UI.lk4(audio.delay + 's', 'behind live', { side: 1 })}</div>
        <input type="range" min="0" max="60" value="${audio.delay}" class="mt8 w-delay">
        <div class="t-meta mt6">Love your team's radio call but watching on TV? Slide until the call lines up with the picture.</div></div></div>`;
  };
  const sh = App.sheet({ title: matchup(g), html: draw(), mount(body) {
    const redraw = () => App.updateSheet(sh, draw());
    body.addEventListener('input', e => { if (e.target.classList.contains('w-delay')) { audio.delay = +e.target.value; e.target.previousElementSibling.querySelector('b').textContent = audio.delay + 's'; } });
    App.actions['w-aplay'] = () => { audio.playing = !audio.playing; redraw(); };
    App.actions['w-afeed'] = (el, ev, k) => { audio.feed = k; audio.playing = true; redraw(); App.toast({ title: 'Switched broadcast', body: feeds(g).find(f => f.k === k).n, icon: 'headphones' }); };
  } });
  return sh;
}
App.route('audio', () => {
  const L = liveNow(), up = upcoming(7), fin = finished(8);
  const sec = (t, gs) => gs.length ? html`<div class="sec">${UI.secHead(t)}<div class="list">${gs.map(g => { const S = Dt.score(g); return UI.row({
    left: html`<span class="mu-tile">${UI.logo(g.a, 'xs')}${UI.logo(g.h, 'xs')}</span>`, title: `${T(g.a).name} at ${T(g.h).name}`,
    sub: html`${can('audio') ? '' : html`${icon('lock', 'xs')} `}${S.st === 'live' ? html`Live · ${Dt.spoiled(g) ? 'score hidden' : S.label}` : S.st === 'pre' ? `${fmt.day(g.ts)} · ${fmt.time(g.ts)}` : 'Final · full radio call'}`,
    act: 'w-listen', arg: g.id }); })}</div></div>` : '';
  return {
    title: 'Live audio',
    html: html`<p class="pg-intro">Home, away and national radio for every game. Keeps playing with the screen off.</p><div class="pad">${softLock('audio')}</div>
      ${sec('Live now', L)}${sec('Coming up', up.slice(0, 12))}${!L.length && !up.length ? sec('Recent games', fin) : ''}`,
  };
});

/* ------------------------------------------------------------------ podcasts */
const PODCASTS = [
  { k: 'atn', title: 'Around the NFL', eyebrow: 'Daily', big: 'AROUND THE NFL', bg: '#013369', sub: 'News, takes, and the week in football' },
  { k: 'mts', title: 'Move the Sticks', eyebrow: 'Scouting', big: 'MOVE THE STICKS', bg: '#2a5d34', sub: 'Draft and roster building' },
  { k: 'daily', title: 'NFL Daily', eyebrow: '15 min', big: 'NFL DAILY', bg: '#d50a0a', sub: 'The one story you need today' },
  { k: 'films', title: 'NFL Films Presents: The Podcast', eyebrow: 'Stories', big: 'NFL FILMS', bg: '#3a3a3f', sub: 'Voices from the vault' },
  { k: 'rules', title: 'Rulebook Explained', eyebrow: 'Learn', big: 'RULEBOOK', bg: '#5b3a8c', sub: 'Officiating calls in plain English' },
  { k: 'world', title: 'Global Football Hour', eyebrow: 'International', big: 'GLOBAL', bg: '#0b6b6b', sub: 'For fans watching from everywhere' },
];
const EP_T = {
  atn: [g => `${Dt.weekLabel(g.t, g.w)} reactions: ${T(g.h).name} and ${T(g.a).name}`, g => `Mailbag: what's next for the ${T(g.a).name}?`, g => `Overreaction Monday: the ${T(g.h).name}`],
  mts: [g => `Film room: how the ${T(g.h).name} attacked ${T(g.a).name}`, g => `Rookie report: ${T(g.a).name} first-years`, g => `Roster check: ${T(g.h).name} depth after ${Dt.weekLabel(g.t, g.w)}`],
  daily: [g => `${T(g.a).name} at ${T(g.h).name}: the one thing that mattered`, g => `The ${T(g.h).name}' turning point`, g => `Is it time to worry about the ${T(g.a).name}?`],
  films: [g => `Voices of the ${T(g.h).name}`, g => `The ${T(g.a).name} team that changed everything`, g => `Behind the sideline mic`],
  world: [g => `${T(g.h).name} explained for new fans`, g => `Watching the ${T(g.a).name} from abroad`, g => `How to follow the ${T(g.h).name} in your time zone`],
};
function episodes(k) {
  const fin = finished(30), n = now(), off = Object.keys(EP_T).indexOf(k) + 1;
  const base = (EP_T[k] || EP_T.atn).map((fn, i) => { const g = fin[(i * 3 + off) % Math.max(1, fin.length)]; return g ? { t: fn(g), d: Math.min(ended(g) + (6 + i * 20) * 3600e3, n - (i + 1) * 5 * 3600e3), len: 24 + ((i + off) * 9) % 30 } : null; }).filter(Boolean);
  if (k === 'rules') return [{ t: 'Why that catch was overturned', d: now() - 864e5, len: 14 }, { t: 'The dynamic kickoff, explained', d: now() - 4 * 864e5, len: 19 }, { t: 'Pass interference vs. incidental contact', d: now() - 8 * 864e5, len: 17 }];
  return base;
}
App.route('podcasts', (params, query) => Dt.ensureBox(Dt.seasonForStats()).catch(() => {}).then(() => ({
  title: 'Podcasts',
  html: html`<div class="pad mt8 tiny">Free for everyone · listen in the background or download for later</div>
    ${PODCASTS.map(p => html`<div class="sec"><div class="pad flex gap12"><div class="w-pimg sq" style="background:${p.bg};width:64px;aspect-ratio:1"><div class="w-pt" style="font-size:10px">${p.big}</div></div>
      <div class="grow"><div class="h3">${p.title}</div><div class="tiny mt4">${p.sub}</div></div>${(() => { const on = (store.p.podFollow || []).includes(p.k); return html`<button class="sc-season yf-chip ${on ? 'on' : ''}" data-act="w-pod-follow" data-arg="${p.k}">${icon(on ? 'check' : 'plus', 'xs')}${on ? 'Following' : 'Follow'}</button>`; })()}</div>
      <div class="list mt12">${episodes(p.k).slice(0, 3).map(e => UI.row({ left: html`<span class="lead-tile pod-play">${icon('play', 'sm')}</span>`, title: e.t, sub: `${fmt.ago(e.d)} · ${e.len} min`, act: 'w-ep', arg: JSON.stringify({ p: p.title, t: e.t }) }))}</div></div>`)}`,
})));
A['w-pod'] = (el, ev, k) => App.go('#/podcasts');
// podcast-rows B (2026-11-08): the approved squared follow chip; the play button leads each episode in the 40px tile
A['w-pod-follow'] = (el, ev, k) => { const f = store.p.podFollow = store.p.podFollow || []; const i = f.indexOf(k); if (i < 0) f.push(k); else f.splice(i, 1); store.save(); App.refresh(); };
A['w-ep'] = (el, ev, arg) => { const e = JSON.parse(arg); App.toast({ title: 'Now playing', body: `${e.p} · ${e.t}`, icon: 'mic' }); };

/* ------------------------------------------------------------------ watch party */
const FRIENDS = [['Maya', '#e85d75'], ['Dre', '#4aa3ff'], ['Sam', '#f5a524'], ['Jordan', '#2fd17a'], ['Priya', '#b48cff']];
// the room speaks only in emoji and preset takes: no free text, so every party stays SFW
const TAKES = ['Let\'s go!', 'What a play!', 'Defense!', 'Need a stop', 'Great call', 'Flag?', 'Can\'t watch', 'Big drive', 'Unreal catch', 'Clock!'];
const EMO = ['🔥', '🙌', '👏', '😱', '😤', '😩', '🏈'];
App.route('watch-party/:id', ({ id }, query, page) => {
  const g = Dt.game(id);
  if (!g) return { title: 'Watch party', html: UI.empty('users', 'Watch party not found', 'The game for this party isn\'t in the schedule.', html`<button class="btn sm ghost mt16" data-go="#/watch">Back to Watch</button>`) };
  const st = page.state = page.state || { msgs: seedMsgs(g), lastIdx: null, invited: false };
  const draw = () => {
    const S = Dt.score(g), hide = Dt.spoiled(g);
    return html`<div class="w-party-top" style="${raw(UI.matchVars(g.a, g.h))}">
        <div class="flex between"><div class="flex gap8">${UI.logo(g.a, 'md')}<span class="num b" style="font-size:24px">${S.st === 'pre' ? '' : hide ? '–' : S.as}</span></div>
          <div class="center"><div class="badge ${S.st === 'live' ? 'live' : ''}">${S.label}</div><div class="tiny mt4" style="color:#fff;opacity:.8">${S.st === 'live' && !hide ? S.dd || '' : ''}</div></div>
          <div class="flex gap8"><span class="num b" style="font-size:24px">${S.st === 'pre' ? '' : hide ? '–' : S.hs}</span>${UI.logo(g.h, 'md')}</div></div>
        <div class="w-sync mt12">${icon('refresh', 'xs')} Synced — everyone sees the same moment, so nobody gets spoiled</div></div>
      <div class="pad mt12 flex between"><div class="flex">${FRIENDS.map((f, i) => html`<span class="w-av" style="background:${f[1]};margin-left:${i ? -8 : 0}px">${f[0][0]}</span>`)}<span class="tiny" style="margin-left:8px">${FRIENDS.length + 1} watching</span></div>
        <button class="btn xs ghost" data-act="w-invite">${icon('share', 'xs')} Invite</button></div>
      <div class="w-chat mt12">${st.msgs.slice(-40).map(m => m.sys ? html`<div class="w-sys">${m.t}</div>` : html`<div class="w-msg ${m.me ? 'me' : ''}">${!m.me ? html`<span class="w-av sm" style="background:${m.c}">${m.n[0]}</span>` : ''}<div><div class="tiny">${m.me ? '' : m.n}</div><div class="w-bub">${m.t}</div></div></div>`)}</div>
      <div class="w-react">${EMO.map(e => html`<button data-act="w-react" data-arg="${e}">${e}</button>`)}</div>
      <div class="w-takes hscroll">${TAKES.map(t => html`<button class="chip" data-act="w-send" data-arg="${t}">${t}</button>`)}</div>`;
  };
  return {
    title: 'Watch party', className: 'w-party-page',
    right: html`<button class="icon-btn" data-act="w-invite">${icon('users')}</button>`,
    html: html`<div class="w-party">${draw()}</div>`,
    mount(el) { const c = el.querySelector('.w-chat'); if (c) c.scrollTop = c.scrollHeight; },
    tick(el) {
      // the room reacts to real scoring plays as the game clock advances
      const S = Dt.score(g); let changed = false;
      if (S.L && S.L.idx !== st.lastIdx) {
        if (st.lastIdx != null && S.L.idx > st.lastIdx) {
          for (let i = st.lastIdx + 1; i <= S.L.idx; i++) { const p = S.L.plays[i]; if (p.sc && !Dt.spoiled(g)) { st.msgs.push({ sys: 1, t: `${T(p.team).abbr} ${p.ty}: ${p.x}` }); const f = FRIENDS[i % FRIENDS.length]; st.msgs.push({ n: f[0], c: f[1], t: store.p.teams.includes(p.team) ? '🙌🙌🙌' : '😩' }); changed = true; } }
        }
        st.lastIdx = S.L.idx;
      }
      if (Math.random() < 0.06) { const f = FRIENDS[Math.floor(Math.random() * FRIENDS.length)]; st.msgs.push({ n: f[0], c: f[1], t: Math.random() < .5 ? EMO[Math.floor(Math.random() * EMO.length)] : TAKES[Math.floor(Math.random() * TAKES.length)] }); changed = true; }
      if (changed) repaintParty(el, draw);
    },
  };
});
function repaintParty(el, draw) {
  const box = el.querySelector('.w-party'), tk = el.querySelector('.w-takes'), sx = tk ? tk.scrollLeft : 0;
  box.innerHTML = String(draw());
  const nt = el.querySelector('.w-takes'); if (nt) nt.scrollLeft = sx;
  const c = el.querySelector('.w-chat'); if (c) c.scrollTop = c.scrollHeight;
}
function seedMsgs(g) {
  return [{ sys: 1, t: `You started a watch party for ${T(g.a).name} at ${T(g.h).name}` }, { n: 'Maya', c: FRIENDS[0][1], t: '🏈🏈' }, { n: 'Dre', c: FRIENDS[1][1], t: 'Let\'s go!' }];
}
A['w-send'] = (el, ev, t) => {
  const pg = App.current(); if (!t) return;
  pg.state.msgs.push({ me: 1, t });
  App.refresh();
  const c = pg.el.querySelector('.w-chat'); if (c) c.scrollTop = c.scrollHeight;
};
A['w-react'] = (el, ev, e) => {
  const pg = App.current(); pg.state.msgs.push({ me: 1, t: e });
  const b = document.createElement('div'); b.className = 'w-float'; b.textContent = e; pg.el.appendChild(b); setTimeout(() => b.remove(), 1400);
  App.refresh();
};
A['w-invite'] = () => App.sheet({ title: 'Invite friends', html: html`<div class="pad"><div class="w-link-box num">nfl.app/party/${(App.current().params.id || '').slice(-6)}</div>
  <div class="tiny mt8">Friends join at your exact moment in the game — even if they're watching on a delay.</div>
  <div class="grid2 mt16"><button class="btn ghost" data-act="toast" data-arg="Link copied">${icon('share', 'sm')} Copy link</button><button class="btn primary" data-act="toast" data-arg="Invites sent to your squad">${icon('users', 'sm')} Invite squad</button></div></div>` });

/* ------------------------------------------------------------------ below-player extras */
App.video.extra = (el, v) => {
  const gid = v.live || v.game;
  const g = gid && Dt.game(gid);
  const draw = () => {
    if (g && v.live && Dt.state(g) !== 'pre') {
      const S = Dt.score(g), L = S.L, hide = Dt.spoiled(g);
      if (hide) return html`<div class="pad tiny">${icon('eyeoff', 'xs')} Spoiler shield is on — stats are hidden for this game.</div>`;
      const plays = L ? L.plays.slice(Math.max(0, L.idx - 5), L.idx + 1).reverse() : [];
      return html`<div class="sec" style="margin-top:8px">${UI.secHead('Live stats')}
        <div class="pad"><div class="card pad-all">${L ? UI.wpChart(L.plays.slice(0, L.idx + 1).filter(p => p.wp != null).map(p => p.wp), g, { h: 70 }) : ''}
          <div class="flex between"><span class="tiny">Win probability</span><span class="num b">${T(S.wp >= 50 ? g.h : g.a).abbr} ${Math.max(S.wp, 100 - S.wp)}%</span></div>
          <div class="w-wpbar mt8"><i style="width:${100 - S.wp}%;background:${App.readable(T(g.a))}"></i><i style="width:${S.wp}%;background:${App.readable(T(g.h))}"></i></div></div></div>
        ${plays.length ? html`<div class="sec">${UI.secHead('Last plays')}<div class="list">${plays.map(p => UI.row({ left: UI.logo(p.team, 'sm'), title: html`<span style="font-weight:500;font-size:13.5px">${p.x}</span>`, sub: `${p.q > 4 ? 'OT' : 'Q' + p.q} ${p.c}${p.dd ? ' · ' + p.dd : ''}` }))}</div></div>` : ''}
        <div class="pad mt16"><button class="btn ghost block" data-go="#/game/${g.id}">${icon('scores', 'sm')} Open Gamecast</button></div></div>`;
    }
    const b = g && Dt.box(g.id);
    const sp = b && !Dt.spoiled(g) ? b.sp : [];
    const more = finished(14).filter(x => !g || x.id !== g.id).slice(0, 6).map(x => gameVideo(x));
    return html`${sp && sp.length ? html`<div class="sec" style="margin-top:8px">${UI.secHead('Key plays')}<div class="list">${sp.map((p, i) => UI.row({ left: UI.logo(p.t, 'sm'), title: html`<span style="font-weight:500;font-size:13.5px">${p.x}</span>`, sub: `Q${p.q} ${p.c} · ${p.ty}`, right: html`<span class="tiny num">0:${String(i * 6 % 50).padStart(2, '0')}</span>`, act: 'w-seek', arg: String(i * 6 % 50) }))}</div></div>` : ''}
      ${more.length ? html`<div class="sec">${UI.secHead('Up next')}${hrow(more.map(x => wcard(x, 200)))}</div>` : ''}<div class="spacer"></div>`;
  };
  el.innerHTML = String(draw());
  if (v.live) { const off = App.on('tick', () => { if (!el.isConnected) return off(); if (Math.floor(time.now() / 1000) % 5 === 0) el.innerHTML = String(draw()); }); }
};
A['w-seek'] = (el, ev, s) => { const v = document.querySelector('.modal video'); if (v) { v.currentTime = +s; v.play().catch(() => {}); } };
})();
