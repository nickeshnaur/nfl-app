/* ============================================================================
   NFL — shared UI components. All return html`` (Safe) strings.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, fmt, store, time, t } = App;
const Dt = App.data;

/* ------------------------------------------------------------------ media */
function logo(tid, cls = '') {
  const tm = Dt.team(tid); if (!tm) return '';
  const dark = document.documentElement.dataset.theme !== 'light';
  return html`<img class="logo ${cls}" src="${dark ? tm.logoDark : tm.logo}" alt="${tm.abbr}" loading="lazy">`;
}
/** player headshot with team-coloured initials fallback (works offline) */
function hs(pid, cls = '') {
  const p = Dt.player(pid) || {};
  const tm = Dt.team(p.t) || { color: '#334' };
  const ini = (p.n || '?').split(' ').map(w => w[0]).slice(0, 2).join('');
  return html`<div class="hs ${cls} hs-fallback" style="background:${App.teamFill(tm)}">${ini}<img src="${Dt.headshot(pid)}" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top" onerror="this.remove()"></div>`;
}
function img(src, alt = '', cls = '') {
  return src ? html`<img class="${cls}" src="${src}" alt="${alt}" loading="lazy" onerror="this.style.display='none'">` : '';
}

/* ------------------------------------------------------------------ structure */
/** section head: Display title, optional "See all" link, optional line of description under the title */
function secHead(title, more, go, sub) {
  const link = more ? html`<a class="more" ${go ? raw(`data-go="${esc(go)}"`) : ''}>${more}${icon('chev', 'xs')}</a>` : '';
  if (sub) return html`<div class="sec-head has-sub"><div class="grow"><div class="h2">${title}</div><div class="sec-head-s">${sub}</div></div>${link}</div>`;
  return html`<div class="sec-head"><div class="h2">${title}</div>${link}</div>`;
}
/** tabs bound to an action: tabs([{k,l}], active, 'act-name') */
function tabs(items, active, act, cls = '') {
  return html`<div class="tabs ${cls}">${items.map(i => html`<button class="${i.k === active ? 'on' : ''}" data-act="${act}" data-arg="${i.k}">${i.l}</button>`)}</div>`;
}
// switcher rule (2026-11-07): small tabs switch views of the same content (2-5 short labels);
// a season chip + sheet picks from an ordered or long set (season, year, week, team);
// a squared chip row filters a list; choice() picks a setting. No segmented control.
function seg(items, active, act) { return tabs(items, active, act, 'sm flush'); }
/** a setting with a few values: list rows with the squared check (the onboarding pattern) */
function choice(items, active, act) {
  return html`<div class="list">${items.map(i => html`<button class="row tap ob-qa ${i.k === active ? 'on' : ''}" data-act="${act}" data-arg="${i.k}"><span class="row-main"><span class="row-title">${i.l}</span></span><span class="ob-radio"></span></button>`)}</div>`;
}
function chips(items, active, act, cls = '') {
  return html`<div class="chips ${cls}">${items.map(i => html`<button class="chip ${i.k === active || (Array.isArray(active) && active.includes(i.k)) ? 'on' : ''}" data-act="${act}" data-arg="${i.k}">${i.icon ? icon(i.icon, 'sm') : ''}${i.img ? raw(i.img) : ''}${i.l}</button>`)}</div>`;
}
/** ranked team row (approved ranked-rows v3 A, 2026-11-08): rank in Sans bold, logo, team name in Sans with a Meta line, the value in Display,
    an optional Meta line under the value (movement); your team gets its team-colour edge */
function rankRow({ rank, tid, title, sub, value, note, noteCls = '', mine, go }) {
  const tm = Dt.team(tid);
  return html`<div class="row ${go ? 'tap' : 'static'} rk-row r-sans ${mine ? 'mine' : ''}" style="--e:${App.teamFill(tm)}" ${go ? raw(`data-go="${go}"`) : ''}><b class="rk-n">${rank}</b>${logo(tm.id, 'sm')}
    <div class="row-main"><div class="row-title">${title || tm.name}</div>${sub ? html`<div class="row-sub">${sub}</div>` : ''}</div>
    <span class="rk-r"><b class="rk-v">${value}</b>${note ? html`<span class="rk-mv ${noteCls}">${note}</span>` : ''}</span></div>`;
}
/** summary numbers (approved summary-stats A, 2026-11-08): the fan-card stat row in a white card, Display number, caps label, thin dividers */
function statRow(items, eyebrow = '', cls = '') {
  return html`<div class="stat-row ${cls}">${eyebrow ? html`<div class="stat-row-eb">${eyebrow}</div>` : ''}<div class="stat-row-r">${items.map(([v, l]) => html`<div><b>${v}</b><span>${l}</span></div>`)}</div></div>`;
}
/** progress-ring A (approved 2026-11-08): a ladder when progress has steps, a plain 6px bar when it's a share; no rings */
function ladder(n, done) { return html`<div class="p-lad">${Array.from({ length: n }, (_, i) => html`<i class="${i < done ? 'on' : ''}"></i>`)}</div>`; }
function bar(pct) { return html`<div class="p-bar"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`; }
function statTile(v, l, r, cls = '') { return html`<div class="stat-tile ${cls}"><div class="v">${v}</div><div class="l">${l}</div>${r ? html`<div class="r">${r}</div>` : ''}</div>`; }
/** empty state (approved 2026-10-30): icon in the secondary text colour, Title, Body S, an optional secondary button */
function empty(ic, title, sub, action) {
  // empty-state B (approved 2026-11-07): centred, the icon in a 56px squared grey tile, a squared button; pages add their next step under it
  return html`<div class="empty"><span class="empty-i">${icon(ic)}</span><div class="t-title">${title}</div>${sub ? html`<div class="t-body-s">${sub}</div>` : ''}${action || ''}</div>`;
}
/** loading (approved 2026-10-30): skeleton rows where the content will be, so the page doesn't jump */
function loading(n = 3) { return html`<div class="loading sk-list" aria-busy="true" aria-label="Loading">${Array.from({ length: n }, () => raw('<div class="sk-row"><i class="sk r"></i><div class="grow"><i class="sk" style="width:70%"></i><i class="sk s" style="width:40%"></i></div></div>'))}</div>`; }
/** key and value list (approved 2026-10-30): 44 px rows with a hairline, key in Body, value in Title S */
function kv(pairs) { return html`<dl class="kv">${pairs.filter(p => p && p[1] != null && p[1] !== '').map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>`; }
function row({ left, title, sub, right, go, act, arg, cls = '', chev = !!go }) {
  const attrs = go ? raw(`data-go="${esc(go)}"`) : act ? raw(`data-act="${esc(act)}" data-arg="${esc(arg || '')}"`) : '';
  return html`<div class="row ${go || act ? 'tap' : 'static'} ${cls}" ${attrs}>${left || ''}<div class="row-main"><div class="row-title">${title}</div>${sub ? html`<div class="row-sub">${sub}</div>` : ''}</div>${right || ''}${chev ? icon('chev', 'sm chev') : ''}</div>`;
}
function toggle(on, act, arg) { return html`<button class="toggle ${on ? 'on' : ''}" data-act="${act}" data-arg="${arg || ''}" aria-pressed="${on ? 'true' : 'false'}"></button>`; }

/* ------------------------------------------------------------------ tiers / upsell (never nagging) */
const TIER = {
  free: { n: 'Free', cls: 'free' }, plus: { n: 'NFL+', cls: 'plus' }, premium: { n: 'NFL+ Premium', cls: 'premium' }, dazn: { n: 'Game Pass', cls: 'plus' }, tv: { n: 'TV', cls: 'outline' },
};
/** the official NFL+ logo (assets/brand/nfl-plus.svg), inline so it takes the text colour: #004FFF on light surfaces, white on the NFL+ gradient */
const PLUS_PATHS = '<path d="M99.23 141.905L85.32 134.015V105.225H148.38V134.005L135.17 141.895V362.565L99.23 350.215L52.4 201.705V294.205L67.93 309.845V339.455L0 316.105V291.205L15.77 285.075V141.665L0 134.005V105.225H52.4L99.23 241.165V141.905V141.905ZM215.38 349.165L228.83 362.305V394.775L161.6 371.665V346.565L176.44 340.525V141.675L161.6 134.245V105.225H278.21V163.725H252.48L244.6 139.815H214.92V207.825H237.18L245.99 195.055H263.84V254.715H245.99L237.64 242.645H214.92V349.165H215.38ZM289.57 345.175L306.26 331.475V141.675L292.12 134.245V105.225H359.35V134.245L346.14 141.675V316.635L374.76 306.795L380.68 259.855H408.04V333.165L289.57 373.895V345.185V345.175Z"/><path d="M455.07 150.155L447.7 105.225H432.98L425.61 150.155L380.68 157.525V172.245L425.61 179.615L432.98 224.545H447.7L455.07 179.615L500 172.245V157.525L455.07 150.155Z"/>';
function plusLogo(cls = '') { return raw(`<svg class="plus-logo ${cls}" viewBox="0 105.225 500 289.55" role="img" aria-label="NFL+">${PLUS_PATHS}</svg>`); }
/** the NFL+ corner tab on pictures: the logo, white on the NFL+ gradient; Premium adds the word under it */
function plusTab(tier) { return tier === 'plus' || tier === 'premium' ? html`<span class="plus-tab">${plusLogo()}${tier === 'premium' ? html`<small>Premium</small>` : ''}</span>` : ''; }
function tierBadge(tier) {
  const x = TIER[tier] || TIER.free;
  if (tier === 'plus') return html`<span class="badge plus">${plusLogo()}</span>`;
  if (tier === 'premium') return html`<span class="badge premium">${plusLogo()}Premium</span>`;
  return html`<span class="badge ${tier === 'free' ? 'win' : ''}">${x.n}</span>`;
}
function hasTier(tier) { const s = store.p.sub; return tier === 'free' || (tier === 'plus' && s !== 'free') || (tier === 'premium' && s === 'premium'); }
function lockNote(tier, what) {
  if (hasTier(tier)) return '';
  // approved 2026-10-30: leads with the NFL+ logo on the Info soft surface, so it reads as NFL+, not an error
  return html`<div class="lock-note"><span class="ln-logo">${plusLogo()}</span><div class="grow t-body-s">${what || 'This'} is included with ${TIER[tier].n}.</div><button class="btn sm ${tier === 'premium' ? 'premium' : 'plus'}" data-act="upsell" data-arg="${tier}">See plans</button></div>`;
}

/* ------------------------------------------------------------------ teams / players */
/** team row (approved round 5): the L2 lockup in the 56 px row, the full name in Display, the record in Stats medium, then the division in Meta */
function teamRow(tid, opts = {}) {
  const tm = Dt.team(tid); const s = Dt.seasonForStats();
  const go = opts.go || `#/team/${tid}`;
  const full = !opts.nick, inner = opts.sub ? lk2(tid, { full, more: opts.sub }) : lk2(tid, { full, rec: Dt.record(tid, s).str, more: `${tm.conf} ${tm.div}` });
  return html`<div class="row tap lk-row" data-go="${go}">${inner}${opts.right || ''}${icon('chev', 'sm chev')}</div>`;
}
/** player row (approved round 5): the L3 line at M44 (name in Sans bold, "POS · #J · TEAM" in Meta), the injury a soft warning badge on the right */
function playerRow(pid, opts = {}) {
  const p = Dt.player(pid) || { n: opts.name || 'Unknown' };
  const tm = Dt.team(p.t);
  const inj = Dt.injuryFor(pid);
  const meta = opts.sub || [p.pos, p.j ? '#' + p.j : '', tm ? tm.abbr : ''].filter(Boolean).join(' · ');
  const go = opts.go === false ? null : `#/player/${pid}`;
  return html`<div class="row ${go ? 'tap' : 'static'} lk-row ${opts.cls || ''}" ${go ? raw(`data-go="${go}"`) : ''}>${lk3(pid, { big: true, name: p.n, meta })}${inj && !opts.noInj ? html`<span class="badge warn">${inj.s}</span>` : ''}${opts.right || ''}${go ? icon('chev', 'sm chev') : ''}</div>`;
}
function following(kind, id) { return kind === 'team' ? store.p.teams.includes(id) : store.p.players.includes(id); }
function followBtn(kind, id, cls = 'sm') {
  // approved 2026-10-30: Follow is primary (the action); Following and Your team are secondary, the star in the team's primary
  if (kind === 'team' && id === store.p.primary) { const tm = Dt.team(id); return html`<button class="btn ${cls}" data-act="my-team" data-arg="${id}"><span class="fb-star" style="${raw('color:' + (tm ? tm.color : 'inherit'))}">${icon('star', 'sm fill')}</span>${t('Your team')}</button>`; }
  const on = following(kind, id);
  return html`<button class="btn ${cls} ${on ? '' : 'primary'}" data-act="follow" data-arg="${kind}:${id}">${icon(on ? 'check' : 'plus', 'sm')}${on ? t('Following') : t('Follow')}</button>`;
}

/* ------------------------------------------------------------------ games */
/** standard game card used on Scores, Home, Team schedule */
function gameCard(g, opts = {}) {
  const S = Dt.score(g);
  const hide = Dt.spoiled(g) && S.st !== 'pre';
  const mine = store.p.teams.includes(g.h) || store.p.teams.includes(g.a);
  const s = g.s, now = time.now();
  const teamLine = (tid, sc, other) => {
    const tm = Dt.team(tid);
    const lost = S.final && !hide && sc < other;
    const poss = S.st === 'live' && S.poss === tid && !hide;
    // the team's Mark colour along the row's edge; records only before and after the game, so the live score leads
    return html`<div class="gc-team ${lost ? 'lost' : ''}"><i class="gc-edge" style="--c:${teamMark(tm)}"></i>${logo(tid)}<div class="nm"><span>${opts.full ? tm.full : tm.loc === 'New York' || tm.loc === 'Los Angeles' ? tm.short : tm.name}</span>${S.st === 'live' ? '' : html`<span class="rec">${Dt.record(tid, s, Math.min(now, g.ts - 1)).str}</span>`}${poss ? html`<span class="poss" title="Possession"></span>` : ''}</div>
      ${S.st !== 'pre' ? html`<div class="sc ${hide ? 'spoiler' : ''}">${hide ? '00' : sc}</div>` : ''}</div>`;
  };
  let status;
  if (S.st === 'live') status = html`<span class="badge live">${hide ? 'Live' : S.label}</span>${S.redzone && !hide ? html`<span class="badge loss">Red Zone</span>` : ''}`;
  else if (S.st === 'post') status = html`<span class="badge final">${S.label}</span>`;
  else status = html`<span class="badge final">${S.label}</span>`;
  const tv = (g.tv || []).join(' · ');
  const foot = opts.foot !== false ? html`<div class="gc-foot">
      ${S.st === 'live' && !hide && S.dd && !(S.yz != null && S.poss) ? html`<span class="grow gc-now"><span class="ellipsis">${icon('football', 'xs')} ${S.dd}</span>${S.drv ? html`<span class="gc-drv">Drive: ${S.drv.n} ${S.drv.n === 1 ? 'play' : 'plays'} · ${S.drv.y} yds · ${S.drv.t}</span>` : ''}</span>` :
        S.st === 'pre' || S.st === 'live' ? html`<span class="grow gc-net"><span class="gc-watch" data-act="sc-watch" data-arg="${g.id}" role="button" aria-label="Where to watch">${icon('tv', 'xs')}<span class="ellipsis">${tv || 'TBD'}</span>${icon('chev', 'xs')}</span>${g.note ? html`<span class="ellipsis gc-note">${g.note}</span>` : ''}</span>` :
        html`<span class="grow ellipsis">${hide ? html`${icon('eyeoff', 'xs')} Spoiler shield on` : (box1(g) || g.vn || '')}</span>`}
      ${S.st === 'live' && !hide && S.wp != null ? html`<span class="num gc-wp">${Dt.team(S.wp >= 50 ? g.h : g.a).abbr} ${Math.max(S.wp, 100 - S.wp)}%<span>win prob.</span></span>` : ''}
    </div>` : '';
  return html`<a class="gcard tap ${mine ? 'mine' : ''}" data-go="#/game/${g.id}">
    <div class="gc-top">${status}<span class="tiny">${opts.weekLabel ? Dt.weekLabel(g.t, g.w) : ''}${S.st === 'pre' && opts.date ? fmt.day(g.ts) : ''}</span></div>
    ${teamLine(g.a, S.as, S.hs)}${teamLine(g.h, S.hs, S.as)}${!hide ? yardTrack(g, S) : ''}${foot}</a>`;
}
function box1(g) {
  const b = Dt.box(g.id); if (!b || !b.rh) return '';
  return b.rh;
}
/** compact game row (schedules), approved round 5: the 56 px row atom. Logo M32; "vs"/"@" in Meta and the opponent in Display;
    week, date and network in Meta. Right: a soft W/L/T badge beside the score in Display, the L5 live badge, or the kickoff in Sans medium */
function gameRow(g, tid, opts = {}) {
  const S = Dt.score(g), o = Dt.opp(g, tid), home = Dt.isHome(g, tid);
  const hide = Dt.spoiled(g) && S.st !== 'pre';
  const us = home ? S.hs : S.as, them = home ? S.as : S.hs;
  let right;
  if (S.st === 'post') {
    const r = Dt.result(g, tid);
    right = hide ? html`<span class="badge">${icon('eyeoff', 'xs')}</span>` : html`<span class="badge">${r.r}</span><span class="lk-sc">${r.us}–${r.them}</span>`;
  } else if (S.st === 'live') right = html`${lk5(S, hide)}${hide ? '' : html`<span class="lk-sc">${us}–${them}</span>`}`;
  else right = html`<span class="gr-time">${g.tbd ? 'TBD' : fmt.time(g.ts)}</span>`;
  const wk = g.t === 3 ? Dt.weekLabel(g.t, g.w, true) : g.t === 1 ? 'Pre ' + (g.w - 1) : 'Wk ' + g.w;
  // opts.inline (approved round 6, player-games v4 A): the logo sits between "vs" and the name on one centre line; opts.sub replaces the second line
  return row({ cls: (opts.inline ? 'gr gr-in' : 'gr') + (opts.cls ? ' ' + opts.cls : ''), left: opts.inline ? '' : logo(o, 'md'),
    title: opts.inline ? html`<span class="t-meta">${home ? 'vs' : '@'}</span>${logo(o, 'sm')}<span class="lk-nm">${Dt.team(o).name}</span>` : html`<span class="t-meta">${home ? 'vs' : '@'}</span> <span class="lk-nm">${Dt.team(o).name}</span>`,
    sub: opts.sub != null ? opts.sub : `${wk} · ${fmt.day(g.ts)}${(g.tv || []).length ? ' · ' + g.tv[0] : ''}${g.note ? ' · ' + g.note : ''}`, right: html`<span class="gr-r">${right}</span>`, go: `#/game/${g.id}` });
}

/* ------------------------------------------------------------------ charts */
/** win probability line chart; wp = array of home win % */
function wpChart(wp, g, opts = {}) {
  if (!wp || wp.length < 2) return '';
  const W = 340, H = opts.h || 90, n = wp.length;
  const hc = App.readable(Dt.team(g.h)), ac = App.readable(Dt.team(g.a));
  const pts = wp.map((v, i) => [i / (n - 1) * W, H - v / 100 * H]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  return html`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="display:block">
    <defs><clipPath id="wpt${g.id}"><rect x="0" y="0" width="${W}" height="${H / 2}"/></clipPath><clipPath id="wpb${g.id}"><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath></defs>
    <line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="var(--line-2)" stroke-dasharray="3 3"/>
    ${[1, 2, 3].map(q => raw(`<line x1="${W * q / 4}" x2="${W * q / 4}" y1="0" y2="${H}" stroke="var(--line)"/>`))}
    <path d="${d}L${W} ${H / 2}L0 ${H / 2}Z" fill="${hc}" opacity=".18" clip-path="url(#wpt${g.id})"/>
    <path d="${d}L${W} ${H / 2}L0 ${H / 2}Z" fill="${ac}" opacity=".18" clip-path="url(#wpb${g.id})"/>
    <path d="${d}" fill="none" stroke="var(--text)" stroke-width="2" vector-effect="non-scaling-stroke"/>
    <circle cx="${pts[n - 1][0]}" cy="${pts[n - 1][1]}" r="4" fill="var(--text)"/></svg>`;
}
function spark(vals, opts = {}) {
  if (!vals || vals.length < 2) return '';
  const W = opts.w || 100, H = opts.h || 28, mn = Math.min(...vals), mx = Math.max(...vals), r = mx - mn || 1;
  const d = vals.map((v, i) => (i ? 'L' : 'M') + (i / (vals.length - 1) * W).toFixed(1) + ' ' + (H - (v - mn) / r * (H - 4) - 2).toFixed(1)).join('');
  return html`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><path d="${d}" fill="none" stroke="${opts.color || 'var(--accent)'}" stroke-width="2" stroke-linecap="round"/></svg>`;
}
/** comparison row: values + label + two bars coloured per team */
/** a head-to-head row (approved round 5): Stats bold values, the losing side in text 2, 6 px meters in each side's colour */
function cmp(label, lv, rv, lc, rc, opts = {}) {
  const ln = parseFloat(String(lv).replace(/[^\d.-]/g, '')) || 0, rn = parseFloat(String(rv).replace(/[^\d.-]/g, '')) || 0;
  const mx = Math.max(Math.abs(ln), Math.abs(rn)) || 1;
  const better = opts.lower ? (ln < rn ? 'l' : rn < ln ? 'r' : '') : (ln > rn ? 'l' : rn > ln ? 'r' : '');
  return html`<div class="cmp"><div class="l"><div class="v ${better === 'l' ? '' : 'lo'}">${lv}</div><div class="bar"><i style="width:${Math.abs(ln) / mx * 100}%;background:${lc}"></i></div></div>
    <div class="lbl">${label}</div><div class="r right"><div class="v ${better === 'r' ? '' : 'lo'}">${rv}</div><div class="bar"><i style="width:${Math.abs(rn) / mx * 100}%;background:${rc}"></i></div></div></div>`;
}
/** horizontal mini field: yz = yards to end zone for the offense; dir = offense moving right? */
function field(opts) {
  const { yz, possColor = 'var(--warn)', dist, homeColor, awayColor, homeAbbr, awayAbbr, dirRight = true, h = 110 } = opts;
  const W = 340, ez = 28, play = W - ez * 2;
  const x = yz == null ? null : dirRight ? ez + play * (1 - yz / 100) : ez + play * (yz / 100);
  const fd = yz != null && dist ? (dirRight ? x + play * (Math.min(dist, yz) / 100) : x - play * (Math.min(dist, yz) / 100)) : null;
  const lines = []; for (let i = 1; i < 10; i++) lines.push(`<line x1="${ez + play * i / 10}" x2="${ez + play * i / 10}" y1="0" y2="${h}" stroke="rgba(255,255,255,.22)"/>`);
  const nums = [10, 20, 30, 40, 50, 40, 30, 20, 10].map((n, i) => `<text x="${ez + play * (i + 1) / 10}" y="${h - 8}" fill="rgba(255,255,255,.45)" font-size="10" text-anchor="middle" font-family="AP Stats">${n}</text>`);
  return html`<svg viewBox="0 0 ${W} ${h}" width="100%" style="display:block;border-radius:12px;background:linear-gradient(#2c6b3f,#235a34)">
    <rect x="0" y="0" width="${ez}" height="${h}" fill="${awayColor || '#333'}" opacity=".85"/><rect x="${W - ez}" y="0" width="${ez}" height="${h}" fill="${homeColor || '#333'}" opacity=".85"/>
    <text x="${ez / 2}" y="${h / 2}" fill="#fff" font-size="11" font-family="APD C" font-weight="700" text-anchor="middle" transform="rotate(-90 ${ez / 2} ${h / 2})" letter-spacing="2">${esc(awayAbbr || '')}</text>
    <text x="${W - ez / 2}" y="${h / 2}" fill="#fff" font-size="11" font-family="APD C" font-weight="700" text-anchor="middle" transform="rotate(90 ${W - ez / 2} ${h / 2})" letter-spacing="2">${esc(homeAbbr || '')}</text>
    ${raw(lines.join(''))}${raw(nums.join(''))}
    ${fd != null ? raw(`<line x1="${fd}" x2="${fd}" y1="0" y2="${h}" stroke="#ffd60a" stroke-width="2.5"/>`) : ''}
    ${x != null ? raw(`<line x1="${x}" x2="${x}" y1="0" y2="${h}" stroke="#4aa3ff" stroke-width="2.5"/><g transform="translate(${x} ${h / 2 - 6})"><ellipse rx="9" ry="5.5" fill="#8b4a22" stroke="#fff" stroke-width="1"/><line x1="-3" x2="3" y1="0" y2="0" stroke="#fff"/></g>`) : ''}
  </svg>`;
}

/* ------------------------------------------------------------------ news + video cards */
/** news, approved round 5 as one family. The row: the 56 px row atom, the headline in Title S on two lines, Meta "News · 2h ago",
    a squared 4:3 thumb at 88 px. The card: the picture, Eyebrow with logos XS16, the headline in Title, Meta for the time */
function newsCard(a, size = 'md') {
  const kind = a.ty === 'Story' ? 'Analysis' : 'News';
  if (size === 'sm') return html`<a class="row tap nw-row" data-go="#/article/${a.id}">
      <div class="row-main"><div class="row-title clamp2">${a.h}</div><div class="row-sub">${kind} · ${fmt.ago(a.pub)}</div></div>
      ${a.img ? html`<div class="nw-thumb">${img(a.img)}</div>` : ''}</a>`;
  return html`<a class="card story tap" data-go="#/article/${a.id}">${a.img ? html`<div class="thumb">${img(a.img)}</div>` : ''}
    <div class="cpad"><div class="nw-src">${(a.tm || []).slice(0, 2).map(t => logo(t, 'xs'))}<span class="t-eyebrow">${kind}</span></div>
    <div class="t-title clamp3 mt6">${a.h}</div>${size === 'lg' && a.d ? html`<div class="t-meta mt6 clamp2">${a.d}</div>` : ''}<div class="t-meta mt4">${fmt.ago(a.pub)}</div></div></a>`;
}
/** video item: {id, title, sub, img, dur, tier, game, kind} */
/** the featured video that leads a rail (approved 2026-10-29): built from the same media overlays as videoCard (M play button,
    the length pill), then Eyebrow "Featured", the headline in Title and the time and source in Meta */
function videoFeature(v) {
  const locked = v.tier && !hasTier(v.tier);
  return html`<a class="vfeat tap" data-act="play-video" data-arg="${esc(JSON.stringify(v))}">
    <div class="thumb m">${v.img ? img(v.img) : html`<div class="ph-img" style="position:absolute;inset:0;${raw(v.team ? App.teamVars(Dt.team(v.team)) : '')}">${v.team ? logo(v.team, 'lg') : icon('video', 'lg')}</div>`}
      <div class="play">${icon(locked ? 'lock' : 'play', 'sm')}</div>${v.dur ? html`<div class="dur">${v.dur}</div>` : ''}
      ${v.tier && v.tier !== 'free' ? plusTab(v.tier) : ''}${v.live ? html`<div class="lock" style="left:10px;right:auto">${raw('<span class="badge live">Live</span>')}</div>` : ''}</div>
    <div class="t-eyebrow mt12">Featured</div><div class="t-title clamp2 mt6">${v.title}</div>${v.sub ? html`<div class="t-meta mt4">${v.sub}</div>` : ''}</a>`;
}
/** video card (approved round 5): the approved media overlays, the title in Title S, the source in Meta */
function videoCard(v, opts = {}) {
  const locked = v.tier && !hasTier(v.tier);
  const w = opts.w || 240;
  return html`<a class="tap" style="width:${w}px;display:block" data-act="play-video" data-arg="${esc(JSON.stringify(v))}">
    <div class="thumb">${v.img ? img(v.img) : html`<div class="ph-img" style="position:absolute;inset:0;${raw(v.team ? App.teamVars(Dt.team(v.team)) : '')}">${v.team ? logo(v.team, 'lg') : icon('video', 'lg')}</div>`}
      <div class="play">${icon(locked ? 'lock' : 'play', 'sm')}</div>${v.dur ? html`<div class="dur">${v.dur}</div>` : ''}
      ${v.tier && v.tier !== 'free' ? plusTab(v.tier) : ''}${v.prog ? raw(`<i class="thumb-prog" style="width:${v.prog}%"></i>`) : ''}${v.live ? html`<div class="lock" style="left:8px;right:auto">${raw('<span class="badge live">Live</span>')}</div>` : ''}</div>
    <div class="t-title-s mt8 clamp2">${v.title}</div>${v.sub ? html`<div class="t-meta mt4 ellipsis">${v.sub}</div>` : ''}</a>`;
}

/* ------------------------------------------------------------------ learn / glossary (Learn screens extend App.GLOSSARY) */
App.GLOSSARY = Object.assign({
  'EPA': 'Expected Points Added: how much a play changed a team\'s expected points. A 15-yard catch on 3rd down might be +2.1; a sack might be −1.5. Positive is good for the offense.',
  'Success rate': 'Share of plays that kept the offense "on schedule": 40% of the yards needed on 1st down, 60% on 2nd, all of it on 3rd/4th.',
  'Red Zone': 'The area inside the opponent\'s 20-yard line. Scoring touchdowns (not field goals) here separates good offenses from great ones.',
  'Win probability': 'The chance each team wins from this exact situation (score, time, field position, down & distance), based on thousands of past games.',
  'Passer rating': 'A 0–158.3 scale combining completion %, yards per attempt, TD rate and INT rate. 100+ is excellent.',
  'QBR': 'ESPN\'s Total QBR: a 0–100 rating of all of a quarterback\'s plays (passing, running, sacks, penalties), weighted by game situation.',
  'Bye week': 'Each team gets one week off during the regular season. No game that week.',
  'Wild Card': 'The three best teams in each conference that didn\'t win their division make the playoffs as Wild Cards (seeds 5–7).',
  'Turnover': 'When the offense loses the ball to the defense: an interception or a lost fumble (also failing on 4th down).',
  'Down & distance': 'The offense has 4 tries ("downs") to gain 10 yards. "3rd & 4" means it\'s the third try and 4 yards are still needed.',
  'Two-minute warning': 'An automatic timeout when the clock hits 2:00 in the 2nd and 4th quarters.',
  'Snap count': 'How many offensive or defensive plays a player was on the field for.',
  'Target share': 'Share of a team\'s pass attempts thrown to a given receiver.',
  'PPR': 'Points Per Reception — a fantasy scoring format: 1 pt per catch, 0.1 per yard, 6 per TD (4 per passing TD).',
  'Cap space': 'How far under the league\'s salary cap a team is. More space = more room to sign or extend players.',
  'All-22': 'The wide coaches\' film that shows all 22 players on every snap — what teams study.',
  'RedZone': 'NFL RedZone: a live whip-around channel that shows every touchdown from every Sunday afternoon game.',
  'Touchback': 'A kick or punt downed in (or through) the end zone. The receiving team starts at its own 25 on punts / 35 on kickoffs (2025 rule).',
  'Safety': 'The defense tackles a ball carrier in his own end zone: 2 points to the defense, and the scored-on team kicks off.',
  'Field goal': 'A kick through the uprights: 3 points.',
  'Extra point': 'After a touchdown, a kick from the 15-yard line for 1 point — or go for 2 from the 2-yard line.',
  'Seed': 'Playoff ranking within a conference. The #1 seed gets the only bye and home field throughout.',
  'Practice squad': 'Up to 16–17 players who practice with the team but aren\'t on the 53-man roster; they can be elevated for games.',
});
function term(word, label) { return html`<span class="term" data-act="term" data-arg="${word}">${label || word}</span>`; }
function learnTip(text) {
  if (store.p.level !== 'new' && !store.p.learnTips) return '';
  return html`<div class="learn-tip">${icon('info', 'sm')}<div class="t-body-s">${text}</div></div>`;
}
/** depth: 1 = surface, 2 = standard, 3 = deep */
function depth() { return store.p.depth || 2; }
/** standard right side of a tab-root header: search · inbox · avatar */
/** the header's right side on every tab root: search, mini games and you (head-profile v2, built 2026-11-10: the NFL app's
 *  profile icon instead of your team's logo, no notification dots). On You itself ({ me: false }) the profile gives way to Settings. */
function headRight(o = {}) {
  return html`<button class="icon-btn" data-go="#/search" aria-label="Search">${icon('search')}</button>
    <button class="icon-btn" data-go="#/mini-games" aria-label="Mini games">${icon('game-on')}</button>
    ${o.me === false ? html`<button class="icon-btn" data-act="you-settings" aria-label="Settings">${icon('gear')}</button>` : html`<button class="icon-btn ph-av" data-go="#/you" aria-label="You">${avatar()}</button>`}`;
}
/** you: the NFL app's profile icon (Avatar · Signed In), filled once you've given a fan name */
function avatar() {
  return icon(store.p.name ? 'user-on' : 'user');
}

/* ---------------------------------------------------------------- Forward design system */
// helmet art faces right (forward). Mirror only helmets whose decals carry no lettering.
/** a helmet on the left of a component or in the middle faces right (the default); one on the right faces left */
function helmet(tid, opts = {}) {
  const tm = Dt.team(tid); if (!tm || !tm.helmet) return '';
  return html`<img class="helmet ${opts.cls || ''}" src="${opts.face === 'left' ? tm.helmetL : tm.helmet}" alt="" aria-hidden="true">`;
}
/** a team as a tall tile: the abbreviation in big italics, the helmet over it, the logo under it.
    o: { on (picked: fills with the team gradient), act, arg, badge (icon name, top right), disabled } */
function teamTile(tid, o = {}) {
  const tm = Dt.team(tid); if (!tm) return '';
  return html`<button class="ttile tap ${o.on ? 'on' : ''}" data-act="${o.act || ''}" data-arg="${o.arg != null ? o.arg : tid}" style="${raw(App.teamVars(tm))}" aria-label="${tm.full}${o.on ? ', picked' : ''}" ${o.disabled ? raw('disabled') : ''}>
    <b>${tm.abbr}</b>${helmet(tid)}${o.on ? html`<img class="logo" src="${tm.logoDark || tm.logo}" alt="">` : logo(tid)}${o.badge ? html`<i class="ttile-badge">${icon(o.badge, o.badge === 'star' ? 'xs fill' : 'xs')}</i>` : ''}</button>`;
}
/** a team in a standings table: logo and abbreviation in Display italics; on its own gradient row (me) the logo turns white */
function stTeam(tid, label, me) {
  const tm = Dt.team(tid);
  return html`<span class="st-tm">${me ? html`<img class="logo sm" src="${tm.logoDark || tm.logo}" alt="">` : logo(tid, 'sm')}<b>${label || tm.abbr}</b></span>`;
}
/** the matchup hero: a head-to-head stage. Each team's gradient fills its half, the helmets face off
    across the middle, giant outlined team letters cropped at the diagonal, scores and names sit above them. Details and actions float below on a plain
    card, where small text reads best. o: { S, hide, kicker, meta, body, actions, cls } */
function matchup(g, o = {}) {
  const S = o.S || Dt.score(g), hide = o.hide != null ? o.hide : Dt.spoiled(g) && S.st !== 'pre';
  const live = S.st === 'live', pre = S.st === 'pre';
  const A = Dt.team(g.a), H = Dt.team(g.h);
  const side = (tm, sc, lost, k) => {
    const rec = Dt.record(tm.id, g.s, Math.min(time.now(), g.ts - 1)).str;
    const ball = live && !hide && S.poss === tm.id;
    return html`<a class="mx-side ${k} ${lost ? 'lost' : ''} tap" data-go="#/game/${g.id}" aria-label="${tm.full}${pre || hide ? '' : ', ' + sc}">
      ${pre ? '' : html`<div class="mx-sc">${hide ? '–' : sc}</div>`}
      <div class="mx-name">${tm.name}</div>
      <div class="mx-rec">${ball ? html`<span class="mx-ball">${icon('football', 'xs')}Ball</span>` : ''}${rec}</div></a>`;
  };
  const top = html`${o.kicker ? html`<div class="hst-kick">${o.kicker}</div>` : ''}${heroStatus(g, S, hide)}`;
  const foot = o.body || o.actions ? html`<div class="mx-body">${o.body || ''}${o.actions ? html`<div class="mx-actions">${o.actions}</div>` : ''}</div>` : '';
  return html`<section class="mx ${o.cls || ''}" style="${raw(matchVars(g.a, g.h))}">
    <div class="mx-stage">
      <div class="mx-bg" aria-hidden="true"></div>
      <div class="mx-helmets">${helmet(g.a, { cls: 'a' })}${helmet(g.h, { cls: 'h', face: 'left' })}</div>
      <div class="mx-top">${top}${o.meta ? html`<div class="mx-meta">${o.meta}</div>` : ''}</div>
      <div class="mx-sides">${side(A, S.as, S.final && S.as < S.hs, 'a')}${side(H, S.hs, S.final && S.hs < S.as, 'h')}</div>
    </div>${foot}</section>`;
}
/** a matchup hero's status (round 6, option B): live = the Live badge with the clock under it (Stats bold caps);
    before kickoff = the day and time (Sans medium) with "Kickoff in …" under it; final = "Final" (Stats bold caps).
    One helper for every hero (Home, Watch, the game page) so they never drift apart. */
function heroStatus(g, S, hide) {
  if (S.st === 'live') return html`<div class="hst"><span class="badge live">Live</span>${hide ? '' : html`<b class="hst-clk r-clock-status">${S.label}</b>`}</div>`;
  if (S.st === 'pre') return html`<div class="hst"><span class="hst-date r-date">${g.tbd ? 'Time TBD' : `${fmt.day(g.ts)} · ${fmt.time(g.ts)}`}</span><span class="hst-sub">Kickoff in ${fmt.until(g.ts)}</span></div>`;
  return html`<div class="hst"><b class="hst-clk r-clock-status">${S.label}</b></div>`;
}
/** away/home gradient stops for the matchup surface (.mu-bg, .mx-bg) and the score bug */
function matchVars(a, h) {
  const v = (t, k) => { const T = Dt.team(t), g = T.grad || [T.color, T.color]; return `--${k}a:${g[0]};--${k}b:${g[1]};--${k}d:${T.color};--${k}c:${T.color};`; };
  return v(a, 'a') + v(h, 'h');
}
/** drives inside the opponent's 30, for the RedZone tracker */
function rzEntries(range = 30) {
  return Dt.liveGames().map(g => {
    const S = Dt.score(g);
    if (Dt.spoiled(g) || S.yz == null || !S.poss || !/\d/.test(S.dd || '')) return null;
    return { g, S, t: S.poss, yz: S.yz };
  }).filter(e => e && e.yz >= 0 && e.yz <= range).sort((a, b) => b.yz - a.yz);
}
/** the official NFL RedZone logo (assets/brand/redzone*.png): white type for dark surfaces, red and navy for light ones.
    opts.light forces the light-surface version; opts.theme follows the app theme (both are rendered, CSS shows one) */
function rzLogo(size = '', opts = {}) {
  const img = (f, c = '') => html`<img class="rz-logo ${size} ${c}" src="assets/brand/${f}.png" alt="NFL RedZone">`;
  if (opts.theme) return html`${img('redzone-dark', 'rz-on-dark')}${img('redzone', 'rz-on-light')}`;
  return img(opts.light ? 'redzone' : 'redzone-dark');
}
function rzTrack(opts = {}) {
  const range = 30, es = rzEntries(range);
  const x = yz => ((range - yz) / range * 100).toFixed(2);
  const groups = [];
  // inside the 20 every team keeps its logo (nodes may overlap like a stack); approaching drives bunch into a count
  es.forEach(e => { const last = groups[groups.length - 1]; if (last && e.yz > 20 && last[0].yz > 20 && last[last.length - 1].yz - e.yz < 2.6) last.push(e); else groups.push([e]); });
  const ticks = []; for (let y = range; y >= 0; y -= 2) ticks.push(html`<i class="rzt-tick ${y % 10 === 0 ? 'major' : ''}" style="left:${x(y)}%"></i>`);
  const labels = [30, 20, 10, 0].map(y => html`<span style="left:${x(y)}%">${y ? y : 'TD'}</span>`);
  const nodes = groups.map(gr => {
    const e = gr[0], tm = Dt.team(e.t), at = x(gr.reduce((a, b) => a + b.yz, 0) / gr.length);
    const go = `#/game/${e.g.id}`;
    if (gr.length > 1) return html`<a class="rzt-node count" style="left:${at}%" data-go="${go}" aria-label="${gr.length} drives">${gr.length}</a>`;
    if (e.yz > 20) return html`<a class="rzt-node dot" style="left:${at}%" data-go="${go}" aria-label="${tm.name} at the ${e.yz}"></a>`;
    return html`<a class="rzt-node team ${e.yz <= 10 ? 'hot' : ''}" style="left:${at}%;--tc:${tm.color}" data-go="${go}" aria-label="${tm.name}, ${e.yz} yards out"><img src="${tm.logo}" alt=""></a>`;
  });
  return html`<div class="rzt ${opts.cls || ''}"><div class="rzt-track"><i class="rzt-line"></i><i class="rzt-hot" style="left:${x(20)}%"></i>${ticks}${nodes}</div><div class="rzt-labels">${labels}</div></div>`;
}
/** compact yard-line tracker for a live game: ball spot, red zone, end zones in team colours */
/** compact RedZone panel (top of Scores): wordmark, count, a short tracker; follows the app theme; taps through to the channel */
function rzPanel() {
  const n = rzEntries().length; if (!n) return '';
  const hot = rzEntries(20).length;
  return html`<div class="rz-panel rzp"><a class="rzp-head tap" data-go="#/channel/redzone">${rzLogo('sm', { theme: true })}<span class="rzp-n">${hot ? `${hot} in the red zone` : `${n} driving inside the 30`}</span>${icon('chev', 'sm')}</a>${rzTrack()}${rzFollowed(3)}</div>`;
}
/** players you follow on a drive inside the 30, closest to the end zone first */
const RZ_POS = new Set(['QB', 'RB', 'FB', 'WR', 'TE', 'PK']);
function rzFollowedList() {
  const mine = store.p.players || []; if (!mine.length) return [];
  return rzEntries(30).slice().reverse().flatMap(e => mine.map(pid => ({ pid, p: Dt.player(pid) })).filter(x => x.p && x.p.t === e.t && RZ_POS.has(x.p.pos)).map(x => ({ ...x, e })));
}
/** round 5 v2: under a hairline, one quiet row per player: the L3 player line, then "8 yds out" as one L4 pair */
function rzFollowed(max = 6) {
  const list = rzFollowedList(); if (!list.length) return '';
  return html`<div class="rzf">${list.slice(0, max).map(({ pid, e }) => html`<a class="rzf-row tap" data-go="#/game/${e.g.id}">${lk3(pid, { meta: `${Dt.team(e.t).abbr} ball · ${e.S.dd}` })}${lk4(e.yz, 'yds out', { side: 1 })}</a>`)}
    ${list.length > max ? html`<div class="rzf-more">+${list.length - max} more</div>` : ''}</div>`;
}
const teamMark = tm => (App.teamRoles(tm) || {}).mark || App.teamFill(tm);
/** live tracker (approved 2026-10-29): one track with an end cap in each team's Mark, the red zone being attacked as a soft tint,
    the drive so far in the Mark of the team with the ball, an amber tick for the line to gain and the ball with its logo.
    Nothing is written on the track (round 5 v2); down & distance (Sans medium) and the drive (Meta) sit under it. */
function yardTrack(g, S) {
  if (!S || S.st !== 'live' || S.yz == null || !S.poss) return '';
  const a = Dt.team(g.a), h = Dt.team(g.h), tm = Dt.team(S.poss), right = S.poss === g.a;
  const cl = x => Math.max(0, Math.min(100, x));
  const x = cl(right ? 100 - S.yz : S.yz), y = S.drv ? +S.drv.y || 0 : 0, st = cl(right ? x - y : x + y);
  const m = /&\s*(\d+)/.exec(S.dd || ''), fd = m ? cl(right ? x + +m[1] : x - +m[1]) : null;
  const lo = Math.min(st, x), hi = Math.max(st, x);
  return html`<div class="yt" style="--ma:${teamMark(a)};--mh:${teamMark(h)};--mp:${teamMark(tm)}"><div class="yt-bar"><i class="ez a"></i><i class="ez h"></i><i class="rz ${right ? 'r' : 'l'}"></i><i class="mid"></i>
      ${hi - lo > 0 ? raw(`<i class="drv" style="left:${lo}%;width:${hi - lo}%"></i>`) : ''}${fd != null ? raw(`<i class="fd" style="left:${fd}%"></i>`) : ''}<span class="ball" style="left:${x}%"><img src="${tm.logo}" alt=""></span></div>
    <div class="yt-k"><b>${S.dd}</b>${S.drv ? html`<span>Drive · ${S.drv.n} ${S.drv.n === 1 ? 'play' : 'plays'} · ${S.drv.y} yds · ${S.drv.t}</span>` : ''}</div></div>`;
}


/* ---------- score celebration: the moment a team scores, the screen says so (and, with sound on, out loud) */
const CEL = { td: 'Touchdown', fg: 'Field goal', safety: 'Safety', two: 'Two-point conversion' };
/** o = { kind: 'td'|'fg'|'safety'|'two', team, away, home, as, hs, was: {as, hs}, text, host } */
function celebrate(o) {
  // on the phone frame, not inside the scrolling page, so it covers the screen wherever you've scrolled to
  const host = o.host || document.getElementById('device') || document.body;
  const tm = Dt.team(o.team); if (!tm) return;
  host.querySelectorAll('.cel').forEach(n => n.remove());
  const word = CEL[o.kind] || 'Score';
  const reduced = document.documentElement.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const side = (tid, now, was) => html`<div class="cel-sd ${tid === o.team ? 'on' : ''}"><img src="${Dt.team(tid).logo}" alt=""><span>${Dt.team(tid).abbr}</span><b data-to="${now}" data-from="${was}">${was}</b></div>`;
  const el = document.createElement('div');
  el.className = 'cel' + (reduced ? ' calm' : '');
  el.setAttribute('role', 'status');
  el.style.cssText = `--tc:${App.teamFill(tm)}`;
  el.innerHTML = App.val(html`<div class="cel-bg"></div>
    <div class="cel-in">
      <div class="cel-hel">${helmet(o.team)}</div>
      <div class="cel-word" aria-label="${word}" style="font-size:min(76px, ${(82 / Math.max(...word.split(' ').map(w => w.length)) / .66).toFixed(1)}cqi)">${word.toUpperCase().split(' ').map((w, j, all) => html`<span class="cel-w">${[...w].map((c, i) => html`<span style="--i:${all.slice(0, j).join('').length + i}">${c}</span>`)}</span>`)}</div>
      <div class="cel-team">${tm.full || tm.name}</div>
      <div class="cel-score">${side(o.away, o.as, o.was ? o.was.as : o.as)}${side(o.home, o.hs, o.was ? o.was.hs : o.hs)}</div>
      ${o.text ? html`<div class="cel-play">${o.text}</div>` : ''}
    </div>
    <button class="btn sm white cel-snd" data-act="cel-sound" aria-label="${store.p.celSound ? 'Turn off score calls' : 'Turn on score calls'}">${icon('headphones', 'sm')}<span>Score calls ${store.p.celSound ? 'on' : 'off'}</span></button>`);
  // in the app it sits under the header and the tab bar, so both stay put while the moment plays
  if (host.id === 'device') {
    const hd = App.current()?.el.querySelector('.phead'), sb = host.querySelector('.statusbar');
    const top = Math.max(hd ? hd.getBoundingClientRect().bottom : 0, sb ? sb.getBoundingClientRect().bottom : 0) - host.getBoundingClientRect().top;
    el.classList.add('in-app'); el.style.top = Math.max(0, Math.round(top)) + 'px';
  }
  host.appendChild(el);
  // count the scoring side up
  setTimeout(() => el.querySelectorAll('.cel-sd b').forEach(b => {
    const to = +b.dataset.to, from = +b.dataset.from; if (to === from) return;
    let v = from; const step = () => { v++; b.textContent = v; b.classList.add('tick'); setTimeout(() => b.classList.remove('tick'), 90); if (v < to) setTimeout(step, 110); };
    step();
  }), reduced ? 0 : 900);
  if (store.p.a11y.haptics && navigator.vibrate) try { navigator.vibrate([30, 60, 30, 60, 120]); } catch {}
  if (store.p.celSound && 'speechSynthesis' in window) try { const u = new SpeechSynthesisUtterance(`${word}, ${tm.name}!`); u.rate = 1.05; u.pitch = 1.1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 380); };
  el.addEventListener('click', e => { if (!e.target.closest('.cel-snd')) close(); });
  setTimeout(close, reduced ? 2600 : 3800);
}
/* ---------- milestone: a fan's own moment (clinch, stadium stamps, streaks). Unlike the score takeover it stays until you close it */
/** o = { kind: 'clinch'|'stamp'|'streak', tid, title, sub, stats: [[value, label]], cta } */
function milestone(o) {
  App.modal({ className: 'ms-modal', html: milestoneHtml(o) });
  if (store.p.a11y.haptics && navigator.vibrate) try { navigator.vibrate([20, 40, 20]); } catch {}
}
/** the milestone card itself (also drawn on the design system page) */
function milestoneHtml(o) {
  const tm = o.tid ? Dt.team(o.tid) : (store.p.primary && Dt.team(store.p.primary));
  const ic = { clinch: 'trophy', stamp: 'pin', streak: 'fire' }[o.kind] || 'star';
  const confetti = Array.from({ length: 26 }, (_, i) => raw(`<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * .12}s;--r:${(i * 53) % 360}deg;--c:${i % 3 === 0 ? 'var(--ms-a)' : i % 3 === 1 ? 'var(--ms-b)' : '#fff'}"></i>`));
  return html`<div class="ms-card" style="${raw(tm ? `${App.teamVars(tm)};--ms-a:${App.teamFill(tm)};--ms-b:${tm.alt || '#ffffff'}` : '--ms-a:var(--accent);--ms-b:#fff')}">
      <div class="ms-bg"></div><div class="ms-confetti" aria-hidden="true">${confetti}</div>
      <button class="icon-btn ms-x" data-act="close-modal" aria-label="Close">${icon('close')}</button>
      <div class="ms-in">
        <div class="ms-badge">${o.kind === 'clinch' && tm ? html`<img src="${tm.logo}" alt="">` : icon(ic)}</div>
        <div class="ms-eb">${o.eyebrow || 'Milestone'}</div>
        <div class="ms-title">${o.title}</div>
        <div class="ms-sub">${o.sub}</div>
        ${o.stats && o.stats.length ? html`<div class="ms-stats">${o.stats.map(([v, l]) => html`<div><b>${v}</b><span>${l}</span></div>`)}</div>` : ''}
        <div class="ms-actions"><button class="btn white" data-act="close-modal">${o.cta || 'Nice!'}</button><button class="btn ms-share" data-act="toast" data-arg="Share card saved to Photos">${icon('share', 'sm')}Share</button></div>
      </div></div>`;
}
/** the milestones the app knows how to build, by kind (also what the time machine previews) */
const MILESTONES = {
  clinch(tid, s = Dt.seasonForStats()) {
    const st = Dt.standings(s), tm = Dt.team(tid), r = st.all.find(x => x.tid === tid) || {};
    return { kind: 'clinch', tid, eyebrow: `${s} playoffs`, title: 'Playoff bound', sub: `The ${tm.full} are in. ${r.divWinner ? `${tm.conf} ${tm.div} champions, ` : ''}${r.seed ? fmt.ord(r.seed) + ' seed in the ' + tm.conf + '.' : ''}`,
      stats: [[`${r.w || 0}-${r.l || 0}${r.tie ? '-' + r.tie : ''}`, 'Record'], [r.seed ? fmt.ord(r.seed) : '–', 'Seed'], [r.diff > 0 ? '+' + r.diff : String(r.diff || 0), 'Point diff']], cta: 'Let\'s go' };
  },
  stamp(n, name) { return { kind: 'stamp', eyebrow: 'Football passport', title: n === 1 ? 'First stamp' : `${n} stadiums`, sub: n === 1 ? `${name || 'Your first stadium'} is in your passport. 31 to go.` : `${name ? name + ' makes it ' : ''}${n} of 32 NFL stadiums. ${32 - n} left.`, stats: [[n, 'Stamped'], [32 - n, 'To go'], [`+${n === 1 ? 50 : 250}`, 'Fan points']] }; },
  streak(n) { return { kind: 'streak', eyebrow: 'Daily streak', title: `${n} days straight`, sub: `You've checked in on football every day for ${n} days. Keep it going tomorrow.`, stats: [[n, 'Days'], [`+${n * 5}`, 'Fan points']] }; },
};
App.actions['cel-sound'] = (el) => { store.p.celSound = !store.p.celSound; store.save(); const b = el.closest('.cel-snd'); if (b) b.innerHTML = App.val(html`${icon('headphones', 'sm')}<span>Score calls ${store.p.celSound ? 'on' : 'off'}</span>`); };

/** power-ranking movement since last week: ▲3 / ▼2 / – */
/** ranking move (approved 2026-10-30, option B): a soft label, Positive or Negative, with the app's chevrons */
function prMove(mv) { return mv > 0 ? html`<span class="badge win pr-mv">${icon('up', 'xs')}${mv}</span>` : mv < 0 ? html`<span class="badge loss pr-mv">${icon('down', 'xs')}${-mv}</span>` : html`<span class="badge pr-mv">–</span>`; }
/* ------------------------------------------------------------------ lockups (approved round 5): one definition, css/lockups.css.
   L1 team-score line · L2 team row · L3 player line · L4 stat pair · L5 status. Components place and size them; they never restyle them. */
/** L1: logo S24, tricode, possession dot, score right; the loser at 60% when final */
function lk1(tid, sc, o = {}) {
  const tm = Dt.team(tid) || {};
  return html`<div class="lk-l1 ${o.lost ? 'lost' : ''}">${o.seed != null ? html`<span class="lk-seed">${o.seed}</span>` : ''}${logo(tid)}<span class="lk-tri">${tm.abbr || ''}</span>${o.poss ? raw('<i class="lk-poss" title="Possession"></i>') : ''}${sc == null || sc === '' ? '' : html`<span class="lk-sc">${sc}</span>`}</div>`;
}
/** both teams of a game as L1 lines, away first; scores hidden by the spoiler shield */
function lk1Game(g, o = {}) {
  const S = Dt.score(g), hide = Dt.spoiled(g) && S.st !== 'pre', pre = S.st === 'pre';
  return [g.a, g.h].map(id => { const me = id === g.h ? S.hs : S.as, them = id === g.h ? S.as : S.hs;
    return lk1(id, pre ? '' : hide ? '–' : me, { poss: S.st === 'live' && !hide && S.poss === id, lost: S.final && !hide && me < them, seed: o.seeds ? o.seeds[id] : null }); });
}
/** L2: logo M32, the team name in Display, the record (Stats medium) and more Meta after it */
function lk2(tid, o = {}) {
  const tm = Dt.team(tid) || {}, nm = o.full ? tm.full : tm.name;
  const sub = o.rec != null || o.more ? html`<span class="lk-l2s">${o.rec ? html`<span class="lk-rec">${o.rec}</span>` : ''}${o.more ? html`<span class="lk-meta">${o.rec ? ' · ' : ''}${o.more}</span>` : ''}</span>` : '';
  return html`<div class="lk-l2">${logo(tid, 'md')}<span class="lk-l2t"><span class="lk-nm">${nm || ''}</span>${sub}</span>${o.right ? html`<span class="lk-r">${o.right}</span>` : ''}</div>`;
}
/** L3: headshot (S32, or M44 with big), the name in Sans bold, "POS · TEAM" in Sans medium */
function lk3(pid, o = {}) {
  const p = Dt.player(pid) || { n: o.name || '' }, tm = Dt.team(p.t);
  const meta = o.meta != null ? o.meta : [p.pos, tm ? tm.abbr : ''].filter(Boolean).join(' · ');
  return html`<div class="lk-l3">${hs(pid, o.big ? '' : 'sm')}<span class="lk-l3t"><span class="lk-pn">${o.name || p.n}</span>${meta ? html`<span class="lk-meta">${meta}</span>` : ''}</span>${o.right ? html`<span class="lk-r">${o.right}</span>` : ''}</div>`;
}
/** L4: a value in Stats bold over (or beside) its label in Meta */
function lk4(v, l, o = {}) { return html`<span class="lk-l4 ${o.r ? 'r' : ''} ${o.side ? 'side' : ''}"><b>${v}</b>${l ? html`<span>${l}</span>` : ''}</span>`; }
/** L5: the live badge with its clock, or a soft neutral badge for Final, kickoff and Bye */
function lk5(S, hide) { return S.st === 'live' ? html`<span class="badge live">${hide ? 'Live' : S.label}</span>` : html`<span class="badge">${S.label}</span>`; }

App.UI = { heroStatus, lk1, lk1Game, lk2, lk3, lk4, lk5, plusLogo, plusTab, videoFeature, rzFollowed, rzFollowedList, milestone, milestoneHtml, MILESTONES, prMove, celebrate, helmet, teamTile, stTeam, matchup, matchVars, rzEntries, rzLogo, rzTrack, rzPanel, yardTrack, logo, hs, img, secHead, tabs, seg, choice, rankRow, statRow, ladder, bar, chips, statTile, empty, loading, kv, row, toggle, tierBadge, hasTier, lockNote, TIER,
  teamRow, playerRow, following, followBtn, gameCard, gameRow, wpChart, spark, cmp, field, newsCard, videoCard, term, learnTip, depth, headRight, avatar };

/* ------------------------------------------------------------------ global actions */
const A = App.actions;
A.follow = (el, ev, arg) => {
  const [kind, id] = arg.split(':');
  const p = store.p, key = kind === 'team' ? 'teams' : 'players';
  const list = p[key];
  const i = list.indexOf(id);
  // your team can't be unfollowed by accident: switch it instead
  if (kind === 'team' && i >= 0 && id === p.primary) return A['my-team'](el, ev, id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  if (kind === 'team') { const first = !p.primary; App.normTeams(p); App.applyTheme(); if (first) { store.save(); App.toast({ title: `The ${Dt.team(id).name} are your team`, body: 'Home, alerts and the app\'s colours now centre on them.', logo: Dt.team(id).logo }); return App.refreshAll(); } }
  store.save();
  const name = kind === 'team' ? Dt.team(id).full : (Dt.player(id) || {}).n;
  App.toast({ title: i >= 0 ? `Unfollowed ${name}` : `Following ${name}`, body: i >= 0 ? '' : 'You\'ll see them across Home, Scores and alerts.', icon: i >= 0 ? 'close' : 'check' });
  App.refreshAll();
};
/** make a team your favourite; the old favourite stays followed */
App.setPrimary = (id, quiet) => {
  const p = store.p; if (!p.teams.includes(id)) p.teams.push(id);
  p.primary = id; App.normTeams(p); store.save(); App.applyTheme();
  if (!quiet) App.toast({ title: `The ${Dt.team(id).name} are your team`, body: 'Home, alerts and the app\'s colours now centre on them.', logo: Dt.team(id).logo });
  App.refreshAll();
};
A['set-primary'] = (el, ev, id) => { App.closeSheet && App.closeSheet(); App.setPrimary(id); };
A['my-team'] = (el, ev, id) => {
  const T = Dt.team(id), others = store.p.teams.filter(x => x !== id);
  App.sheet({ title: 'Your team', html: html`<div class="pad"><div class="flex gap12">${logo(id, 'lg')}<div class="grow"><div class="h3">${T.full}</div><div class="meta mt4">Your team leads Home, Scores and alerts, and colours the app.</div></div></div></div>
    ${others.length ? html`<div class="eyebrow pad mt16">Switch to a team you follow</div><div class="list mt8">${others.map(o => row({ left: logo(o, 'md'), title: Dt.team(o).full, sub: 'Make them your team', act: 'set-primary', arg: o, right: icon('star', 'sm') }))}</div>` : ''}
    <div class="pad mt16"><button class="btn ghost block" data-go="#/teams/all">${icon('swap', 'sm')} Choose a different team</button>
    <div class="tiny center mt8">The ${T.name} stay followed if you switch. Every fan keeps one team.</div></div>` });
};
A.term = (el, ev, word) => {
  App.sheet({ title: word, html: html`<div class="pad"><p class="article-body" style="font-size:16px">${App.GLOSSARY[word] || 'Definition coming soon.'}</p>
    <button class="btn ghost block mt12" data-go="#/learn">${icon('book', 'sm')} Open Football 101</button></div>` });
};
A['play-video'] = (el, ev, arg) => { let v = {}; try { v = JSON.parse(arg); } catch {} App.video.play(v); };
A.upsell = (el, ev, tier) => App.go('#/plans' + (tier ? '?t=' + tier : ''));

/* ------------------------------------------------------------------ video player (shared) */
App.video = {
  /** v: {title, sub, tier, live (gameId), kind, img} */
  play(v) {
    // live games and RedZone play where they live (the game page, the RedZone page), never in this overlay
    if (v.feat === 'redzone' || /redzone/i.test(v.kind || '')) return App.go('#/channel/redzone');
    if (v.live && App.watchGame && Dt.state(Dt.game(v.live)) === 'live') return App.watchGame(v.live, true);
    // full and condensed replays play at the top of their game page
    if (v.game && /^(Full replay|Condensed game)$/.test(v.kind || '') && App.replayReady && App.replayReady(Dt.game(v.game))) { App.closeOverlays && App.closeOverlays(true); return App.go('#/game/' + v.game + (v.kind === 'Condensed game' ? '?rp=condensed' : '')); }
    if (v.tier && !hasTier(v.tier)) return App.go('#/plans?t=' + v.tier);
    const g = v.live ? Dt.game(v.live) : null;
    // pick up where you left off (on-demand video only)
    const key = App.video.key(v), was = !v.live && v.start == null ? (store.p.resume || []).find(r => r.key === key) : null;
    if (was) v = { ...v, start: was.t };
    App.modal({ html: html`<div style="position:relative;flex:none;margin-top:var(--status-h);background:#000">
        <video src="assets/video/highlights.mp4" ${raw(v.start ? `data-start="${v.start}"` : '')} autoplay playsinline ${raw(store.p.a11y.captions ? '' : '')} controls style="width:100%;aspect-ratio:16/9;background:#000;display:block"></video>
        ${g ? html`<div class="vid-bug" style="position:absolute;left:10px;top:10px;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);border-radius:10px;padding:6px 10px;display:flex;gap:8px;align-items:center;font:700 13px/1 var(--stats);color:#fff"></div>` : ''}
        ${store.p.a11y.captions ? html`<div style="position:absolute;left:0;right:0;bottom:46px;text-align:center"><span style="background:rgba(0,0,0,.75);color:#fff;font-size:13px;padding:3px 8px;border-radius:4px">[CC] ${v.title || ''}</span></div>` : ''}
      </div>
      <div style="flex:1;overflow:auto;background:var(--bg);color:var(--text)" class="vid-below">
        <div class="pad-all"><div class="flex gap8">${v.live ? raw('<span class="badge live">Live</span>') : ''}${v.tier ? tierBadge(v.tier) : ''}<span class="tiny">${v.kind || 'Video'}</span></div>
          <div class="h2 mt8">${v.title || 'Highlights'}</div>${v.sub ? html`<div class="meta mt6">${v.sub}</div>` : ''}
          ${was ? html`<div class="vid-resume mt12">${icon('rewind', 'sm')}<span class="grow">Picked up where you left off, at ${App.video.clock(was.t)}</span><button class="btn xs ghost" data-act="vid-restart">Start over</button></div>` : ''}
          <div class="flex gap8 mt16 wrap"><button class="btn sm ghost" data-act="toast" data-arg="Casting to Living Room TV">${icon('cast', 'sm')} Cast</button><button class="btn sm ghost" data-act="toast" data-arg="Saved for offline">${icon('download', 'sm')} Download</button><button class="btn sm ghost" data-act="toast" data-arg="Link copied">${icon('share', 'sm')} Share</button><button class="btn sm ghost" data-act="toast" data-arg="Audio: English · Español · Deutsch available">${icon('translate', 'sm')} Audio</button></div>
          <div class="tiny mt16">Proof-of-concept: every video plays the same NFL+ highlights reel.</div>
        </div><div class="vid-extra"></div></div>
      <button class="icon-btn" data-act="close-modal" style="position:absolute;right:10px;top:calc(var(--status-h) + 8px);background:rgba(0,0,0,.6);color:#fff;z-index:3">${icon('close')}</button>`,
      mount(el) {
        const vid = el.querySelector('video'); if (v.start) vid.currentTime = v.start;
        vid.play().catch(() => {});
        const bug = el.querySelector('.vid-bug');
        const upd = () => { if (!bug || !g) return; const S = Dt.score(g); bug.innerHTML = `${Dt.team(g.a).abbr} ${S.as ?? ''} &nbsp; ${Dt.team(g.h).abbr} ${S.hs ?? ''} <span style="opacity:.7;font-weight:500">${S.label}</span>`; };
        upd(); const off = App.on('tick', upd);
        if (App.video.extra) App.video.extra(el.querySelector('.vid-extra'), v);
        return () => { off(); App.video.remember(v, vid); vid.pause(); };
      } });
  },
  key: v => v.id || v.title || '',
  clock: t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`,
  /** keep the spot for Continue watching; drop it once the video is (nearly) finished */
  remember(v, vid) {
    if (v.live || !vid || !isFinite(vid.duration)) return;
    const key = App.video.key(v); if (!key) return;
    const list = (store.p.resume || []).filter(r => r.key !== key);
    const t = vid.currentTime, len = vid.duration;
    if (t > 3 && t < len - 5) { const { start, ...rest } = v; list.unshift({ ...rest, key, t, len, at: time.now() }); }
    store.p.resume = list.slice(0, 12); store.save();
  },
};
A['vid-restart'] = (el) => { const vid = el.closest('.modal').querySelector('video'); if (vid) { vid.currentTime = 0; vid.play().catch(() => {}); } el.closest('.vid-resume').remove(); };
A.toast = (el, ev, arg) => App.toast({ title: arg, icon: 'check' });
})();
