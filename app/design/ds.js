/* ============================================================================
   Design system page. Every specimen here is rendered by the app's own code
   (App.UI components, the app's CSS), never a copy, so a change to a token or a
   component shows up here and in the app at the same time.
   Each specimen has a name to refer to it by, the code that draws it, and where
   the app uses it, so a style change can travel to everything that shares it.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, store, time } = App;
const Dt = App.data, UI = App.UI;
const root = document.documentElement;

/* ------------------------------------------------------------------ boot without the app shell */
store.load();
time.init();
App.data.init();
App.refreshAll = () => render();               // data loads (play-by-play) re-render this page instead
const state = { moment: 'gameday', theme: 'light', team: store.p.primary || '12', tier: 'foundations', device: 'iphone' };
function setMoment(key) {
  const m = time.moments.find(x => x.key === key) || time.moments[0];
  // set the clock in memory only: never touch the app's saved time machine
  time.key = key; time.base = Date.parse(m.at); time.started = Date.now(); time.speed = 1; time.paused = true;
  App.emit('time', time);
}
function applyLook() {
  store.p.theme = state.theme;
  store.p.primary = state.team;
  if (!store.p.teams.includes(state.team)) store.p.teams = [state.team, ...store.p.teams];
  App.applyTheme();                              // in memory; nothing is saved
}

/* ------------------------------------------------------------------ specimen helpers */
const S = x => String(x == null ? '' : x);
/** a component specimen: name to call it by, the code that draws it, where it's used, variants */
function spec(o) {
  return `<article class="ds-spec" id="${o.id}">
    <header class="ds-spec-h"><h3>${o.name}</h3>${o.code ? `<code>${o.code}</code>` : ''}</header>
    ${o.note ? `<p class="ds-note">${o.note}</p>` : ''}
    ${o.used ? `<p class="ds-used"><b>Used in</b> ${o.used}</p>` : ''}
    <div class="ds-vars">${(o.variants || []).map(v => `<figure class="ds-var ${v.wide ? 'wide' : ''}">
      ${v.label ? `<figcaption>${v.label}</figcaption>` : ''}
      <div class="ds-frame ${v.bleed ? 'bleed' : ''} ${v.plain ? 'plain' : ''}" ${v.w ? `style="width:${v.w}px"` : ''}>${S(v.html)}</div></figure>`).join('')}</div>
  </article>`;
}
function section(id, title, intro, body) {
  return `<section class="ds-sec" id="${id}"><div class="ds-sec-h"><h2>${title}</h2>${intro ? `<p>${intro}</p>` : ''}</div>${body}</section>`;
}
const cssVar = n => getComputedStyle(root).getPropertyValue(n).trim();
const isHex = c => /^#[0-9a-f]{6}$/i.test(c);
const aa = (fg, bg, need = 4.5) => {
  if (!isHex(fg) || !isHex(bg)) return '';
  const k = App.contrast(fg, bg);
  return `<span class="ds-aa ${k >= need ? 'ok' : 'no'}">${k.toFixed(1)}:1 ${k >= need ? 'AA' : 'below AA'}</span>`;
};

/* ------------------------------------------------------------------ sample data for the moment */
function games() {
  const all = Dt.D.games, now = time.now();
  const live = Dt.liveGames();
  const post = all.filter(g => g.s === 2026 && Dt.state(g) === 'post').sort((a, b) => b.ts - a.ts);
  const pre = all.filter(g => g.ts > now && g.t !== 1).sort((a, b) => a.ts - b.ts);
  return { live: live[0], live2: live[1], post: post[0], pre: pre[0] };
}

/* ------------------------------------------------------------------ sections */
function principles() {
  const P = [
    ['Gradients', 'Every team surface wears its official 400→500 gradient, deepening into the 800 shade. One recipe, everywhere.'],
    ['Helmets', 'Big helmets on team and matchup surfaces. In a matchup they go head to head, facing each other.'],
    ['Large type', 'All-Pro Display C, heavy italic, uppercase, +2% tracking: headlines, scores, clocks and big numbers.'],
    ['Bold color', 'Solid team and brand colour for accents. Neutrals for everything else, so the colour means something.'],
    ['Logos', 'Team logos and the shield carry identity on their own. No decoration around them.'],
    ['Simple controls', 'Flat fills, round pills, straight underlines. No gloss, no skew, no stripes.'],
    ['Readable, always', 'All text clears WCAG AA. On colour surfaces text is solid white; hierarchy comes from size and weight, never transparency. Colours are deepened automatically until white text passes. Checked by _build/contrast.mjs.'],
    ['Change once, change everywhere', 'Every specimen on this page is drawn by the app\'s own code. Ask for a change by the name shown here; it travels to every place listed under "Used in" unless you say "only here".'],
  ];
  return section('principles', 'Principles', 'Keep it simple: gradients, helmets, large type, bold color, logos, simple controls, sleek design.',
    `<div class="ds-principles">${P.map(([h, p], i) => `<div class="ds-pr"><span>${String(i + 1).padStart(2, '0')}</span><h4>${h}</h4><p>${p}</p></div>`).join('')}</div>`);
}

function color() {
  const surf = cssVar('--surface'), bg = cssVar('--bg');
  const sw = (name, v, note, onBg) => {
    const c = cssVar(v);
    return `<div class="ds-sw"><i style="background:var(${v})"></i><b>${name}</b><code>${v}</code><span class="ds-hex">${c}</span>${note ? `<span class="ds-sw-n">${note}</span>` : ''}${onBg !== false ? aa(c, onBg || surf) : ''}</div>`;
  };
  const neutrals = [['Background', '--bg', 'Page', false], ['Background 2', '--bg-2', '', false], ['Surface', '--surface', 'Cards, sheets', false], ['Surface 2', '--surface-2', '', false], ['Surface 3', '--surface-3', 'Default button, fields', false],
    ['Line', '--line', 'Dividers', false], ['Line 2', '--line-2', 'Borders', false], ['Text', '--text', 'Primary text'], ['Text 2', '--text-2', 'Secondary text'], ['Text 3', '--text-3', 'Captions, labels']];
  const signal = [['Live', '--live', 'Live badges (white text on it)', false], ['RedZone', '--rz', 'RedZone accent', false], ['NFL navy', '--nfl-navy', '', false], ['NFL red', '--nfl-red', '', false], ['NFL+', '--plus', 'NFL+ blue (#004FFF); surfaces use --plus-g', false],
    ['Win', '--win', 'Fills', false], ['Win ink', '--win-ink', 'Win text'], ['Loss', '--loss', 'Fills', false], ['Loss ink', '--loss-ink', 'Loss text'], ['Warn', '--warn', 'Fills, possession dot', false], ['Warn ink', '--warn-ink', 'Warning text'],
    ['Gold', '--gold', 'Fills, level meter', false], ['Gold ink', '--gold-ink', 'Gold text'], ['Accent', '--accent', 'Your team, tuned to read on the page'], ['Accent ink', '--accent-ink', 'Text on accent', false]];
  const teams = Dt.D.teams.slice().sort((a, b) => a.abbr.localeCompare(b.abbr));
  return section('color', 'Color', 'Neutrals carry the interface; team and signal colours are the accents. The ratio shown is text contrast on the surface.',
    spec({ id: 'color-neutrals', name: 'Neutrals', code: 'app/css/forward.css :root', used: 'every screen', variants: [{ plain: true, wide: true, html: `<div class="ds-sws">${neutrals.map(n => sw(...n)).join('')}</div>` }] }) +
    spec({ id: 'color-signal', name: 'Signal & brand colours', code: '--live --rz --win/-ink --loss/-ink --warn/-ink --gold/-ink --accent', note: 'Bright tones are for fills; the *-ink tones are for text, deepened until they pass AA.', used: 'badges, scores, trackers, levels, buttons', variants: [{ plain: true, wide: true, html: `<div class="ds-sws">${signal.map(n => sw(...n)).join('')}</div>` }] }) +
    spec({ id: 'color-teams', name: 'Team gradients', code: 'App.teamVars(team) → .tsurf  ·  App.onWhite()', note: 'From the official team colour sheet. Each stop is deepened automatically if white text would fail AA.', used: 'team hero, matchup hero, You card, onboarding, avatars, headshot fallbacks',
      variants: [{ plain: true, wide: true, html: `<div class="ds-teams">${teams.map(t => `<div class="ds-team tsurf" style="${App.teamVars(t)}"><img src="${t.logoDark || t.logo}" alt=""><b>${t.abbr}</b><span>${t.color} · ${t.alt}</span></div>`).join('')}</div>` }] }) +
    spec({ id: 'color-team-roles', name: 'Team colour roles', code: 'App.teamRoles(team) → { mark, ink, tint, fill }  ·  --tm-mark --tm-ink --tm-tint --tm-fill (set by teamVars)  ·  App.teamFill(team)', note: 'Approved 2026-10-29. Every role is picked from the Team Colors sheet by name, never mixed with black. Mark (3:1 on the surface): bars, meters, edges and big numbers; it is the Primary whenever the Primary passes, so Denver stays orange. Ink (4.5:1): small text in the team colour, stepping down Primary, 700, 800 (300, 100 in dark mode). Tint: soft backgrounds (100; 800 in dark). Fill: a solid team colour carrying white text (avatars, team chips). Switch the theme to see the dark-mode picks.', used: 'accent colour, numbers, bars, avatars, team chips',
      variants: [{ plain: true, wide: true, html: `<div class="ds-roles"><div class="ds-roles-h"><span></span><span>Gradient</span><span>Mark</span><span>Ink</span><span>Tint</span><span>Fill</span></div>${teams.map(t => { const r = App.teamRoles(t); if (!r) return ''; const nm = c => c === r.primary ? 'Primary' : (Object.keys((App.PALETTE[t.abbr] || {}).sh || {}).find(k => App.PALETTE[t.abbr].sh[k] === c) || (c === '#ffffff' ? 'White' : 'Black'));
        return `<div class="ds-roles-r"><span>${S(UI.logo(t.id, 'sm'))}<b>${t.abbr}</b></span><i style="background:linear-gradient(110deg,${r.g[1]},${r.g[0]})"></i>${[r.mark, r.ink, r.tint, r.fill].map((c, k) => `<i style="background:${c}" title="${c}"><em style="color:${App.contrast(c, '#ffffff') >= 3 ? '#fff' : '#0b0d12'}">${k === 2 ? (document.documentElement.dataset.theme === 'light' ? '100' : '800') : nm(c)}</em></i>`).join('')}</div>`; }).join('')}</div>` }] }));
}

function type() {
  const rows = [
    ['Display XL · score', 'score-xl', '<div class="score-xl">31</div>', 'Big scores'],
    ['Display L · page title', 'h1', '<div class="h1">Scores</div>', 'Tab titles: Scores, Watch, Explore'],
    ['Display M · section head', 'sec-head .h2', S(UI.secHead('Live & upcoming', 'All games')), 'Every section header'],
    ['Display · big number', 'big-num', '<div class="big-num">1,284</div>', 'Stat callouts'],
    ['Display · stat tile', 'stat-tile', S(UI.statTile('4,183', 'Pass yds', '2nd in NFL')), 'Player and team stats'],
    ['Sans · headline', 'headline / h3', '<div class="h3">Chiefs beat the Raiders 30-27 to move to 4-0</div>', 'News, cards'],
    ['Sans · body', 'body', '<p style="margin:0">Live games, every stat, every story, tuned to the teams and players you love.</p>', 'Paragraphs'],
    ['Sans · secondary', 'muted', '<div class="muted">Out of your market — Sunday Ticket carries it.</div>', 'Supporting text'],
    ['Sans · caption', 'tiny', '<div class="tiny">Week 5 · CBS</div>', 'Meta lines'],
    ['Sans · eyebrow', 'eyebrow', '<div class="eyebrow">Injury report</div>', 'Labels above content'],
    ['Stats · numbers', 'num / var(--stats)', '<div class="num" style="font:700 22px/1 var(--stats)">27–20 · 3rd &amp; 9 · 64.2%</div>', 'Tables, box scores'],
  ];
  const fams = [['All-Pro Display C', 'var(--display)', 'Headlines, scores, clocks. Heavy italic, uppercase, +2% tracking.', '<div style="font:900 italic 34px/1 var(--display);letter-spacing:.02em;text-transform:uppercase">Football, built around you</div>'],
    ['All-Pro Sans', 'var(--sans)', 'Interface and reading text. Regular to bold.', '<div style="font:400 17px/1.3 var(--sans)">Live games, every stat, every story. <b>Bold for emphasis.</b></div>'],
    ['All-Pro Stats', 'var(--stats)', 'Numbers in tables and box scores.', '<div style="font:700 22px/1 var(--stats)">0123456789 · 98.4 · 3-1</div>']];
  return section('type', 'Typography', 'Three families only: All-Pro Display C, All-Pro Sans and All-Pro Stats.',
    spec({ id: 'type-families', name: 'Families', code: '--display --sans --stats', used: 'everywhere', variants: [{ plain: true, wide: true, html: `<div class="ds-fams">${fams.map(f => `<div class="ds-fam"><div class="ds-fam-h"><b>${f[0]}</b><code>${f[1]}</code></div>${f[3]}<p>${f[2]}</p></div>`).join('')}</div>` }] }) +
    spec({ id: 'type-scale', name: 'Type scale', code: 'classes in app.css + forward.css', note: 'Sizes are measured live from the app\'s CSS.', used: 'see each row',
      variants: [{ plain: true, wide: true, html: `<div class="ds-type">${rows.map(r => `<div class="ds-trow"><div class="ds-tmeta"><b>${r[0]}</b><code>.${r[1]}</code><span class="ds-measure"></span><span class="ds-tuse">${r[3]}</span></div><div class="ds-tsample">${r[2]}</div></div>`).join('')}</div>` }] }) +
    spec({ id: 'type-roles', name: 'Type roles', code: '.t-dxl .t-dl .t-dm .t-ds .t-dxs · .t-title .t-title-s · .t-body .t-body-s · .t-label .t-eyebrow .t-meta .t-stat', note: 'Approved 2026-10-29. Every piece of text uses one of these thirteen roles, by name. Display C (the voice): names, the number that is the moment, section heads and tabs. All-Pro Sans (the information): everything you read and every control label. Metadata (kickoff times, venues, timestamps) is always Meta, never Display. Italic only ever goes with Display. The old classes now point at roles: .h1 is Display L, section heads Display M, .h2 and .h3 Title, .h4 Title S, .meta and .tiny Meta, .eyebrow Eyebrow.', used: 'everywhere',
      variants: [{ plain: true, wide: true, html: `<div class="ds-type">${TYPE_ROLES.map(([n, c, spec, use, t]) => `<div class="ds-trow"><div class="ds-tmeta"><b>${n}</b><code>.${c}</code><span class="ds-tuse">${spec} · ${use}</span></div><div class="ds-tsample ${c}">${t}</div></div>`).join('')}</div>` }] }));
}
const TYPE_ROLES = [
  ['Display XL', 't-dxl', 'Display C 900 italic caps · 44 / 0.9', 'Hero team names, the hero score', 'Chiefs'],
  ['Display L', 't-dl', 'Display C 900 italic caps · 32 / 0.92', 'Page titles, big records and countdowns', '4-0'],
  ['Display M', 't-dm', 'Display C 900 italic caps · 25 / 0.95', 'Section heads', 'Upcoming games'],
  ['Display S', 't-ds', 'Display C 900 italic caps · 19 / 1', 'Team names and scores in cards', 'Packers 31'],
  ['Display XS', 't-dxs', 'Display C 900 italic caps · 15 / 1', 'Tabs', 'Overview'],
  ['Title', 't-title', 'Sans 700 · 17 / 1.25', 'Headlines, card titles, sheet titles', 'Love throws for 367 yards in the win'],
  ['Title S', 't-title-s', 'Sans 700 · 15 / 1.3', 'Row titles, player names, video titles', 'Jordan Love'],
  ['Body', 't-body', 'Sans 400 · 15 / 1.45', 'Paragraphs, play-by-play text', 'Love pass deep right to Watson for 43 yards.'],
  ['Body S', 't-body-s', 'Sans 400 · 13.5 / 1.4', 'Secondary lines, descriptions, notes', "NFL Films tells the story of how today's stars made it"],
  ['Label', 't-label', 'Sans 700 · 14 / 1', 'Buttons, segments, chips', 'Where to watch'],
  ['Eyebrow', 't-eyebrow', 'Sans 700 caps · 11 / 1 · tracked .08em', 'Kickers above a title', 'Next game'],
  ['Meta', 't-meta', 'Sans 500 · 12.5 / 1.3 · text-2', 'Every timestamp, venue and kickoff line', '2h ago · NFL Films'],
  ['Stats', 't-stat', 'Stats 600 tabular · 14 / 1', 'Numbers in tables, durations, clocks', '25/31  367  2  0'],
];

function brand() {
  const teams = Dt.D.teams.slice().sort((a, b) => a.abbr.localeCompare(b.abbr));
  return section('brand', 'Logos & helmets', 'The shield, the 32 team logos and the helmets carry the identity.',
    spec({ id: 'brand-plus', name: 'NFL+ logo', code: 'UI.plusLogo(cls)  ·  assets/brand/nfl-plus.svg  ·  --plus #004FFF  ·  --plus-g #004FFF → #3372FF', note: 'The official logo, inline so it takes the text colour: NFL+ blue (#004FFF) on light surfaces, white on the NFL+ gradient and on dark. Used for tier badges, plan cards and every upsell button. In running text, NFL+ stays a word.', used: 'tier badges, plans, upsell buttons, RedZone call to action',
      variants: [{ plain: true, html: `<div class="ds-center" style="color:#004FFF;font-size:48px">${S(UI.plusLogo())}</div>` }, { label: 'On the gradient', plain: true, html: `<div class="ds-center" style="background:var(--plus-g);color:#fff;font-size:40px;border-radius:14px;padding:24px">${S(UI.plusLogo())}</div>` }, { label: 'Badges', html: `<div class="ds-row">${S(UI.tierBadge('plus'))}${S(UI.tierBadge('premium'))}</div>` }] }) +
    spec({ id: 'brand-shield', name: 'NFL shield', code: 'assets/brand/nfl-shield.webp (never cropped)', used: 'header, onboarding, RedZone mark, mini games, favicon',
      variants: [{ plain: true, html: '<div class="ds-center"><img src="assets/brand/nfl-shield.webp" style="height:96px" alt="NFL"></div>' }, { label: 'On dark', html: '<div class="ds-center ds-dark"><img src="assets/brand/nfl-shield.webp" style="height:64px" alt="NFL"></div>', plain: true }] }) +
    spec({ id: 'brand-logos', name: 'Team logos', code: 'UI.logo(teamId, size)', used: 'scores, rows, ticker, game cards, search', variants: [{ plain: true, wide: true, html: `<div class="ds-logos">${teams.map(t => `<div>${S(UI.logo(t.id, 'lg'))}<span>${t.abbr}</span></div>`).join('')}</div>` }] }) +
    spec({ id: 'brand-helmets', name: 'Helmets', code: 'UI.helmet(teamId, { face, cls })', note: 'Every team has both. The rule: a helmet on the left of a component, or in the middle, faces right (assets/helmets/right facing/ABBR.png); a helmet on the right faces left (face: "left", assets/helmets/left facing/ABBR.png), so both look in toward the content. CSS backgrounds use --helmet and --helmet-l.', used: 'matchup hero (head to head), Game Center hero, team hero, You card, onboarding',
      variants: [{ plain: true, wide: true, html: `<div class="ds-helmets">${teams.map(t => `<div class="ds-hel"><div class="ds-hel-pair">${S(UI.helmet(t.id, { face: 'right' }))}${S(UI.helmet(t.id, { face: 'left' }))}</div><span>${t.abbr}</span></div>`).join('')}</div>` }] }));
}

function icons() {
  const names = Object.keys(App.ICONS).sort();
  return section('icons', 'Icons', '', spec({ id: 'icons-set', name: 'Icon set', code: 'icon(name, size)  ·  sizes: xs sm (default) lg', used: 'buttons, rows, tab bar, headers',
    variants: [{ plain: true, wide: true, html: `<div class="ds-icons">${names.map(n => `<div>${S(icon(n))}<span>${n}</span></div>`).join('')}</div>` }] }));
}

function shape() {
  const radii = [['--r-sm', 'Small'], ['--r', 'Default'], ['--r-lg', 'Cards, lists'], ['--r-xl', 'Heroes, big cards'], ['99px', 'Pills: buttons, chips, badges']];
  const shadows = [['--shadow-card', 'Cards, lists, game cards'], ['--shadow-hero', 'Heroes, RedZone card']];
  return section('shape', 'Shape & depth', '',
    spec({ id: 'shape-radius', name: 'Corner radius', code: '--r-sm --r --r-lg --r-xl', used: 'every surface', variants: [{ plain: true, wide: true, html: `<div class="ds-shapes">${radii.map(([v, n]) => `<div><i style="border-radius:${v.startsWith('--') ? `var(${v})` : v}"></i><b>${n}</b><code>${v}</code></div>`).join('')}</div>` }] }) +
    spec({ id: 'shape-shadow', name: 'Shadows', code: '--shadow-card --shadow-hero', used: 'cards and heroes', variants: [{ wide: true, html: `<div class="ds-shapes">${shadows.map(([v, n]) => `<div><i style="box-shadow:var(${v});background:var(--surface)"></i><b>${n}</b><code>${v}</code></div>`).join('')}</div>` }] }) +
    spec({ id: 'shape-spacing', name: 'Page gutter & section rhythm', code: '--pad (16px) · .sec (34px apart)', used: 'every screen', variants: [{ html: `<div style="background:var(--surface);border-radius:12px;padding:12px var(--pad)"><div class="eyebrow">--pad</div><div class="tiny mt4">16px side gutter on every screen</div></div>` }] }));
}

/* ================================================================== ATOMS: the smallest pieces, one job each */
function atoms() {
  const btn = (cls, label, ic) => `<button class="btn ${cls}">${ic ? S(icon(ic, 'sm')) : ''}${label}</button>`;
  return section('controls', 'Controls', 'One family: if you can press it, it is squared; if it is a label, it is a pill.',
    spec({ id: 'btn', name: 'Buttons', code: '.btn + hierarchy + size  ·  sizes .l (48) · M (40, default) · .sm (32)  ·  .sq for icon-only', note: 'Approved 2026-10-29 (Controls, option A). Buttons, segments and chips are one family: the same sizes, label type (All-Pro Sans bold, sentence case, optically centred), corners (10px; 8px at S) and states. If you can press it, it is squared; if it is only a label, it is a pill. One Primary per view. Upsell is the NFL+ gradient with the NFL+ logo; the RedZone call to action swaps in RedZone red.', used: 'everywhere', variants: [
      { label: 'Hierarchy · Primary · Secondary · Tertiary', html: `<div class="ds-row">${btn('primary', 'Follow', 'plus')}${btn('', 'Listen', 'headphones')}${btn('ghost', 'See plans')}${btn('ink', 'Where to watch', 'tv')}</div>`, w: 393 },
      { label: 'Sizes · L 48 · M 40 · S 32', html: `<div class="ds-row">${btn('primary l', 'Watch live', 'play')}${btn('primary', 'Watch', 'play')}${btn('primary sm', 'Watch', 'play')}${btn('sq', S(icon('bell', 'sm')))}${btn('sm sq', S(icon('share', 'sm')))}</div>`, w: 393 },
      { label: 'Upsell · NFL+ · RedZone', html: `<div class="ds-row">${btn('plus', S(UI.plusLogo()) + 'Try free')}${btn('premium sm', 'See plans')}<button class="btn l cta">${S(UI.plusLogo())}Get RedZone</button></div>`, w: 393 },
      { label: 'On colour', html: `<div class="ds-row tsurf" style="${App.teamVars(Dt.team(state.team))};padding:16px;border-radius:16px">${btn('white', 'Shop', 'bag')}${btn('tm-ghost', 'Tickets', 'ticket')}<button class="icon-btn tm-round">${S(icon('bell', 'sm'))}</button></div>`, w: 393 },
      { label: 'States', html: `<div class="ds-row">${btn('primary', 'Default')}<button class="btn primary" style="transform:scale(.97);filter:brightness(.9)">Pressed</button><button class="btn primary" disabled>Disabled</button></div>`, w: 393 },
    ] }) +
    spec({ id: 'chips', name: 'Chips', note: "Approved 2026-10-30: anything that filters or picks is this squared chip, S 32 (M 40 for the team switcher). Picked fills with the text colour, or the team's primary for a team. Actions (Play, Score calls) are small buttons, never chips.", code: 'UI.chips(items, active)', used: 'filters on Scores, Watch, Stats, News', variants: [{ html: S(UI.chips([{ k: 'all', l: 'All games' }, { k: 'live', l: 'Live · 6' }, { k: 'prime', l: 'Primetime' }], 'all')) }] }) +
    spec({ id: 'seg', name: 'Segmented control', code: 'UI.seg(items, active)', used: 'Scores / Standings / Playoffs, game page Stats (Players / Team) and Fans (React / Predict)', variants: [{ html: S(UI.seg([{ k: 's', l: 'Scores' }, { k: 'st', l: 'Standings' }, { k: 'p', l: 'Playoffs' }], 's')) }, { html: S(UI.seg([{ k: 'pl', l: 'Players' }, { k: 'tm', l: 'Team' }], 'pl')) }] }) +
    spec({ id: 'tabs', name: 'Tabs', code: 'UI.tabs(items, active)', used: 'team page, player page, game page', variants: [{ bleed: true, html: S(UI.tabs([{ k: 'o', l: 'Overview' }, { k: 's', l: 'Schedule' }, { k: 'r', l: 'Roster' }, { k: 'd', l: 'Depth chart' }], 'o')) }, { bleed: true, html: S(UI.tabs([{ k: 'a', l: 'All drives' }, { k: 's', l: 'Scoring drives' }], 'a', '', 'sm')) }] }) +
    spec({ id: 'toggle', name: 'Toggle', note: 'Approved 2026-10-30 (option A): round, Positive green when on. The one pressable thing that stays round.', code: 'UI.toggle(on)', used: 'settings, notifications, red zone alerts', variants: [{ html: `<div class="ds-row">${S(UI.toggle(true))}${S(UI.toggle(false))}</div>` }] }) +
    spec({ id: 'badges', name: 'Badges', note: 'Every label in the app is a .badge: Stats bold caps, 22 px. Soft on the page, solid on colour and pictures. Approved 2026-10-30: the one-off tags (mini-game, Home stage flag, Kickoff in, Ball, Red zone, onboarding reasons) take this shape and face; Free and TV are soft badges.', code: '.badge + variant  ·  UI.tierBadge(tier)', used: 'live status, injuries, plans, new features', variants: [{ html: `<div class="ds-row"><span class="badge live">Live</span><span class="badge live">4th 3:18</span><span class="badge warn">Questionable</span><span class="badge loss">Out</span><span class="badge accent">New</span>${S(UI.tierBadge('free'))}${S(UI.tierBadge('plus'))}${S(UI.tierBadge('premium'))}</div>` }] }) +
    spec({ id: 'follow', name: 'Follow button', note: "Approved 2026-10-30: Follow is primary (the action); Following and Your team are secondary buttons, the star in the team's primary.", code: 'UI.followBtn(kind, id)', used: 'team rows, player pages, search', variants: [{ html: `<div class="ds-row">${S(UI.followBtn('team', state.team))}${S(UI.followBtn('team', state.team === '22' ? '2' : '22'))}</div>` }] }) +
    spec({ id: 'search', name: 'Search field', code: '.search-field', used: 'Search & explore', variants: [{ html: `<div class="search-field">${S(icon('search', 'sm'))}<span>Players, teams, stats, questions…</span></div>` }] })) +
  section('marks', 'Marks & faces', 'Small identity pieces that sit inside bigger components.',
    spec({ id: 'logo-sizes', name: 'Team logo sizes', note: 'Approved 2026-10-30: XS 16, S 24, M 32 (default and md), L 48, XL 72. Never a shadow. On a team colour use the light logo.', code: 'UI.logo(teamId, xs | sm | md | lg | xl)', used: 'rows, chips, game cards, heroes', variants: [{ html: `<div class="ds-row">${['xs', 'sm', 'md', 'lg', 'xl'].map(z => S(UI.logo(state.team, z))).join('')}</div>` }] }) +
    spec({ id: 'headshot', name: 'Headshot', code: 'UI.hs(playerId, size)', note: 'Falls back to initials on the team colour (deepened for AA).', used: 'player rows, leaders, depth charts', variants: [{ html: `<div class="ds-row">${S(UI.hs('3139477', 'lg'))}${S(UI.hs('3139477'))}${S(UI.hs('0000000', 'lg'))}</div>` }] }) +
    spec({ id: 'pr-move', name: 'Power-rank movement', code: 'UI.prMove(change)  ·  .pr-mv', note: 'Up in green, down in red, a dash when it held. Only shown where the rank moved, except in the full list.', used: 'Power rankings, team page, Home stakes, weekly recap', variants: [{ html: `<div class="ds-row">${S(UI.prMove(3))}${S(UI.prMove(-2))}${S(UI.prMove(0))}</div>` }] }) +
    spec({ id: 'rz-logo', name: 'RedZone logo', code: 'UI.rzLogo(size, { light | theme })  ·  assets/brand/redzone(-dark).png', note: 'The official logo, never cropped. White type on dark surfaces, red and navy on light ones; { theme: true } follows the app theme.', used: 'RedZone page, RedZone card, RedZone panel', variants: [{ label: 'On dark', plain: true, html: `<div class="ds-center ds-dark ds-wrap" style="gap:22px">${S(UI.rzLogo('sm'))}${S(UI.rzLogo())}${S(UI.rzLogo('lg'))}</div>` }, { label: 'On light', html: `<div class="ds-center ds-wrap" style="gap:22px">${S(UI.rzLogo('sm', { light: true }))}${S(UI.rzLogo('', { light: true }))}</div>` }] }));
}

/* ================================================================== MOLECULES: a few atoms working as one unit */
function molecules() {
  const G = games(), GP = App.gameParts, H = App.homeParts || {};
  const n = Dt.news().slice(0, 3);
  const v = [];
  if (G.live) v.push({ label: 'Live · with yard tracker', html: UI.gameCard(G.live) });
  if (G.post) v.push({ label: 'Final', html: UI.gameCard(G.post) });
  if (G.pre) v.push({ label: 'Upcoming', html: UI.gameCard(G.pre, { date: true }) });
  const mL = G.live && GP ? GP.model(G.live) : null, mP = G.post && GP ? GP.model(G.post) : null;
  const tk = H.ticker ? S(H.ticker()) : '';
  return section('nav', 'Navigation', 'How you move around: the tab bar, the team picker and the header.',
    spec({ id: 'tabbar', name: 'Tab bar · Liquid Glass', code: 'App.tabBarInner(tab)  ·  .tabbar .tb-glass .tb-lens', note: 'A floating glass capsule over the page, like iOS 26: content scrolls underneath and shows through, blurred and saturated, with a bright rim where light catches the edge. A glass lens slides to the current tab with a little overshoot. Home · Watch · Scores · News · Teams. You lives in the header, as your team\'s logo. Search & explore lives behind the search button in every header. Over dark pages (RedZone) the glass turns dark.', used: 'every screen',
      variants: [{ label: 'Over content', bleed: true, html: `<div class="ds-glass">${n[0] ? S(UI.newsCard(n[0], 'lg')) : ''}<nav class="tabbar" style="--i:1">${App.tabBarInner('scores')}</nav></div>` },
        { label: 'Over a dark page', bleed: true, html: `<div class="ds-glass rz-page"><div class="ds-glass-dark tsurf" style="${App.teamVars(Dt.team(state.team))}"></div><nav class="tabbar tb-dark" style="--i:4">${App.tabBarInner('teams')}</nav></div>` }] }) +
    spec({ id: 'phead', name: 'Page header', code: "header(view)  ·  UI.headRight()  ·  .phead", note: 'Every tab (Home, Scores, News, Watch, Teams) has the same header: a big italic title, then Mini games, Search & explore, and You on the right. You is your team\'s logo as an avatar and opens your profile, where Alerts live; it carries a red dot for unread alerts. Mini games carries one until you open the games that day. Pushed pages swap the title for a back button and their own actions. On You itself, a Settings gear takes the avatar\'s place and jumps to the Settings section.', used: 'every tab root',
      variants: [{ label: 'Every tab', bleed: true, html: `<header class="phead" style="position:relative"><div class="phead-row"><div class="phead-title phead-big">Scores</div>${S(UI.headRight())}</div></header>` }, { label: 'You', bleed: true, html: `<header class="phead" style="position:relative"><div class="phead-row"><div class="phead-title phead-big">You</div>${S(UI.headRight({ me: false }))}</div></header>` }] }) +
    spec({ id: 'tabbar-android', name: 'Tab bar · Android', code: ':root[data-platform=android] .tabbar  ·  store.p.platform', note: 'The only thing that changes on Android. A flat bar docked across the bottom edge instead of the floating glass capsule: the surface colour, a hairline on top, no lens or rim; the current tab in full text colour with a small Live-red dot under its label, the others grey. Same five tabs, labels and badges as iOS (approved round 6). Switch it with Device in the time machine.', used: 'every screen on Android',
      variants: [{ label: 'Light', bleed: true, html: `<div class="ds-glass plat-android">${n[0] ? S(UI.newsCard(n[0], 'lg')) : ''}<nav class="tabbar" style="--i:1">${App.tabBarInner('scores')}</nav></div>` },
        { label: 'Over a dark page', bleed: true, html: `<div class="ds-glass plat-android rz-page"><div class="ds-glass-dark tsurf" style="${App.teamVars(Dt.team(state.team))}"></div><nav class="tabbar tb-dark" style="--i:4">${App.tabBarInner('teams')}</nav></div>` }] }) +
    (App.teamParts ? spec({ id: 'team-picker', name: 'Team picker', code: "switcher(selected, action)  ·  .tm-picker", note: '"All 32" stays put and opens a sheet with every team by division; the chips scroll: your teams first (star on your team), a divider, then the rest with your division first. Switching keeps you on the same section (roster to roster).', used: 'Teams tab, every team page', variants: [{ bleed: true, html: `<div style="padding-top:12px">${S(App.teamParts.switcher(state.team, 'tm-sel'))}</div>` }] }) : '') +
    spec({ id: 'team-tiles', name: 'Team tiles', code: 'UI.teamTile(teamId, { on, act, arg, badge })  ·  .ttiles .ttile', note: 'Every team as a tall tile: abbreviation in big italics, the helmet over it (facing right), the logo under it. The team you have picked fills with its gradient and lifts on a shadow in its colour; a star marks your other teams.', used: '"All 32" sheet, onboarding "Who\'s your team?", Follow another team', variants: [{ html: `<div class="ttiles">${Dt.D.teams.filter(t => t.conf === Dt.team(state.team).conf).slice(0, 8).map(t => S(UI.teamTile(t.id, { on: t.id === state.team, badge: t.id === '22' ? 'star' : '' }))).join('')}</div>` }] }) +
    (App.teamParts ? spec({ id: 'standings', name: 'Standings table', code: "divMini(teamId, season) · stTable(rows, { title })  ·  .st-card  ·  tr.me  ·  UI.stTeam()", note: 'Each table is a white card with its division (or conference) name in italics on top. Teams are logo plus abbreviation in Display italics; numbers stay in Stats. Your team\'s row (on a team page, that team\'s) fills with its gradient and turns white; other teams you follow keep the faint highlight.', used: 'team page Overview, Standings', variants: [{ bleed: true, html: S(App.teamParts.divMini(state.team, Dt.seasonForStats())) }] }) : '') +
    spec({ id: 'sec-head', name: 'Section head', code: 'UI.secHead(title, more, go, sub)', used: 'every section on every screen', variants: [{ html: S(UI.secHead('Catch me up', '6 updates')) }, { html: S(UI.secHead('A Football Life Origins', 'See all', '', "NFL Films tells the story of how today's top players made it to the league")) }] })) +
  section('lists', 'Cards & lists', '',
    spec({ id: 'list', name: 'List & rows', code: '.list + UI.row({ left, title, sub, right, go })', used: 'Search & explore, settings, rosters, search results', variants: [{ html: `<div class="list">${S(UI.row({ left: html`<div class="lr-ic">${icon('zap', 'sm')}</div>`, title: 'Mini games', sub: "Shake & Break and Rank 'Em Rush", right: html`<span class="badge accent">New</span>`, go: '#' }))}${S(UI.row({ left: html`<div class="lr-ic">${icon('target', 'sm')}</div>`, title: "Pick 'em", sub: 'Free weekly picks for points', go: '#' }))}${S(UI.teamRow(state.team))}${S(UI.playerRow('3139477'))}</div>` }] }) +
    spec({ id: 'card', name: 'Card', code: '.card', note: 'A card can be a link (<a class="card">); it is still a block.', used: 'news, prompts, settings groups', variants: [{ html: `<div class="card" style="padding:16px"><div class="h3">Make it yours</div><p class="muted" style="margin:6px 0 0">Follow your teams and players for a home screen, alerts and catch-ups built around you.</p></div>` }] }) +
    spec({ id: 'stat-tiles', name: 'Stat tiles', note: 'Approved 2026-10-30 (option A): one tile on the surface, radius 14, the number in Display L, the label and sub line in Meta (sentence case).', code: 'UI.statTile(value, label, rank)', used: 'player and team stats', variants: [{ html: `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${S(UI.statTile('1,284', 'Pass yds', '3rd'))}${S(UI.statTile('9', 'TD'))}${S(UI.statTile('104.2', 'Rating', '5th'))}</div>` }] }) +
    spec({ id: 'kv', name: 'Key–value list', note: 'Approved 2026-10-30: 44 px rows with a hairline between them, the key in Body, the value in Title S.', code: 'UI.kv(pairs)', used: 'player bio, stadium, contracts', variants: [{ html: `<div class="card" style="padding:12px 16px">${S(UI.kv([['Height', '6\' 2"'], ['College', 'Texas Tech'], ['Drafted', '2017 · Round 1, Pick 10']]))}</div>` }] }) +
    spec({ id: 'notes', name: 'Notice & lock note', code: '.notice  ·  UI.lockNote(tier, what)', used: 'plan gates, tips', variants: [{ html: `<div class="lock-note">${S(icon('lock', 'sm'))}<div class="grow">Every game, live, is included with NFL+.</div><button class="btn xs plus">See plans</button></div>` }] }) +
    spec({ id: 'empty', name: 'Empty state', note: 'Approved 2026-10-30: icon in the secondary text colour, Title, Body S, an optional secondary button. Loading is skeleton rows (option B), on first paint too.', code: 'UI.empty(icon, title, sub, action)', used: 'lists with nothing yet', variants: [{ label: 'Empty', html: S(UI.empty('star', 'No teams yet', 'Follow a team to see it here.')) }, { label: 'Loading', html: S(UI.loading()) }] }) +
    spec({ id: 'meter', name: 'Meter', code: '.meter > i  ·  UI.cmp()  ·  .gl-bar', note: 'Approved 2026-10-30: one bar. 6 px, radius 3, on the surface-3 track; the fill is the team\'s primary or a status colour. Head to head is two meters from the middle. Video progress on pictures is the one exception: 3 px in NFL+ blue.', used: 'stadium fill, compare, season at a glance, rankings, fan pulse', variants: [{ html: `<div class="meter"><i style="width:62%;background:${Dt.team(state.team).color}"></i></div>` }, { label: 'Head to head', html: S(UI.cmp('Yards per game', '412.0', '301.4', Dt.team(state.team).color, '#0080C6')) }] })) +
  section('game-m', 'Game pieces', 'Scores in big italic numbers, team colour only as an accent.',
    spec({ id: 'game-card', name: 'Game card', code: 'UI.gameCard(game, opts)', note: 'Approved 2026-10-29 (v3). The team\'s Mark colour along each row\'s edge, team names in Display S, records only before and after the game. Live cards carry the tracker, then down and distance (Title S) and the drive (Meta); the foot keeps the network and win chance.', used: 'Scores, team pages, Home lists, Watch', variants: v }) +
    (G.live ? spec({ id: 'gamerow', name: 'Game row', code: 'UI.gameRow(game, teamId)', used: 'team schedule', variants: [{ html: `<div class="list">${S(UI.gameRow(G.live, G.live.h))}${G.post ? S(UI.gameRow(G.post, G.post.h)) : ''}</div>` }] }) : '') +
    (G.live ? spec({ id: 'yard', name: 'Yard-line tracker', code: 'UI.yardTrack(game, score)  ·  .yt', note: 'Approved 2026-10-29. One track with an end cap in each team\'s Mark; the red zone being attacked as a soft red tint; the drive so far in the Mark of the team with the ball; an amber tick for the line to gain; the ball with its logo. The abbreviations and the 50 sit under it.', used: 'live game cards', variants: [{ html: `<div class="card" style="padding:12px 16px">${S(UI.yardTrack(G.live, Dt.score(G.live)))}</div>` }] }) : '') +
    (tk ? spec({ id: 'ticker', name: 'Score ticker', code: 'ticker(exclude)  ·  App.scoreTicker(gameId)', note: 'Every live and just-finished game in one strip, like the crawl on a broadcast. On a game page it leaves out the game you are on.', used: 'Home sheet, game page (above the hero)', variants: [{ bleed: true, html: `<div style="padding-top:12px">${tk}</div>` }] }) : '') +
    (mL || mP ? spec({ id: 'pin-bug', name: 'Pinned score bug', code: 'pinBug(model)  ·  .gc-pin .pb-in', note: 'Like the score bug on a broadcast: once the game hero scrolls away it slides up above the tab bar with both teams in their colours, the score, the clock and down & distance. Tap it to jump back to the top. Not shown before kickoff.', used: 'game page (live and final)',
      variants: [mL && { label: 'Live', html: `<div class="gc-pin show ds-pin">${S(GP.pinBug(mL))}</div>` }, mP && { label: 'Final', html: `<div class="gc-pin show ds-pin">${S(GP.pinBug(mP))}</div>` }].filter(Boolean) }) : '') +
    (mL ? spec({ id: 'catch-up', name: 'Catch up', code: 'catchUp(model)  ·  .lv-cu', note: 'Three sentences that tell the story so far, then the numbers that explain it. Written from the play-by-play.', used: 'game page Live tab; Recap when there is no article', variants: [{ html: S(GP.catchUp(mL)) }] }) : '') +
    (mL ? spec({ id: 'key-moments', name: 'Key moments', code: 'keyMoments(model, n)  ·  .km', note: 'The plays that swung it, each with the score after and how much win chance moved. A takeaway is credited to the defense, with its helmet.', used: 'game page Live tab and Recap', variants: [{ bleed: true, html: S(GP.keyMoments(mL, 4)) }] }) : '')) +
  section('content', 'Content', '',
    (n[0] ? spec({ id: 'news', name: 'News cards', code: 'UI.newsCard(article, size)', used: 'Home, News, team and player pages', variants: [{ label: 'Large', html: UI.newsCard(n[0], 'lg') }, { label: 'Row', html: `<div class="list">${S(UI.newsCard(n[1] || n[0], 'sm'))}${S(UI.newsCard(n[2] || n[0], 'sm'))}</div>` }] }) : '') +
    spec({ id: 'video-feature', name: 'Featured video', code: 'UI.videoFeature(video)  ·  .vfeat', note: 'Approved 2026-10-29. Leads a video rail. The same media overlays as the video card (M play button, the length pill), then Eyebrow "Featured", the headline in Title, and the time and source in Meta.', used: 'Home › Watch', variants: [{ html: S(UI.videoFeature({ title: 'Every touchdown from Week 5', sub: '2h ago · NFL Films', team: state.team, dur: '9:12' })), w: 345 }] }) +
    spec({ id: 'video', name: 'Video card', code: 'UI.videoCard(video)', used: 'Watch rails, team and player pages', variants: [{ html: `<div class="ds-row" style="align-items:flex-start">${S(UI.videoCard({ title: 'Every touchdown from Week 5', sub: 'NFL+ · 9 min', team: state.team, dur: '9:12' }, { w: 170 }))}${S(UI.videoCard({ title: 'Condensed game', sub: 'Full game in 40 minutes', team: '22', tier: 'plus', dur: '40:00' }, { w: 170 }))}</div>` }] }));
}

/* ================================================================== ORGANISMS: whole sections of a screen */
function organisms() {
  const tm = Dt.team(state.team), G = games(), GP = App.gameParts, H = App.homeParts;
  const hs = (fn, label) => { try { const v = S(fn()); return v ? { label, html: v, bleed: true } : null; } catch (e) { return null; } };
  const mL = G.live && GP ? GP.model(G.live) : null, mP = G.post && GP ? GP.model(G.post) : null, mR = G.pre && GP ? GP.model(G.pre) : null;
  const L = G.live && Dt.live(G.live);
  const wps = L ? L.plays.slice(0, L.idx + 1).filter(p => p.wp != null).map(p => p.wp) : [];
  const cel = (kind, label) => `<button class="btn ink sm" data-ds-cel="${kind}">${S(icon('play', 'sm'))}${label}</button>`;
  return section('team', 'Team surfaces', 'The team gradient, the helmet and big italic type. Text on colour is always solid white.',
    spec({ id: 'tsurf', name: 'Team gradient surface', code: '.tsurf with App.teamVars(team)', note: 'One recipe for every team surface: linear-gradient(155deg, 400 → 500 → 800). Changing it changes all of the places below.', used: 'team hero, You card, onboarding finish, team CTAs',
      variants: [{ html: `<div class="tsurf" style="${App.teamVars(tm)};border-radius:20px;height:150px;position:relative;overflow:hidden;color:#fff;padding:18px">${S(UI.helmet(tm.id, { cls: 'ds-tsurf-hel', face: 'left' }))}<div class="eyebrow" style="color:#fff;position:relative">${tm.loc}</div><div class="tm-hero-name" style="position:relative;font-size:40px">${tm.name}</div></div>` }] }) +
    (App.teamParts ? spec({ id: 'team-hero', name: 'Team hero', code: 'hero(teamId)  ·  .tm-hero', note: 'Approved 2026-10-29. Location over the big name (Display XL), the record as the big number (Display L) with the division place and head coach beside it, then Your team / alerts / share, Shop and Tickets as two tinted buttons, and the next game as a tinted card inside. Rounded bottom corners. The helmet sits on the right, so it faces left.', used: 'Teams tab, every team page', variants: [{ bleed: true, html: S(App.teamParts.hero(state.team)) }] }) : '') +
    (App.teamParts ? spec({ id: 'injuries', name: 'Injury report', code: 'injuries(teamId, page)  ·  .inj  ·  UI.seg items with style', note: 'Approved 2026-10-29. This team or its next opponent on a segmented control (the picked segment takes that team\'s gradient), then a card per player grouped by status: headshot on the team Fill colour, name and position, the soft status pill (Out and IR red, Questionable and Doubtful amber) and the injury. The report has no practice codes, so the card shows the injury and the expected return instead of DNP / LP / FP.', used: 'team page › Roster › Injuries', variants: [{ bleed: true, html: S(App.teamParts.injuries(state.team, { state: {} })) }] }) : '') +
    spec({ id: 'mx-hero', name: 'Matchup hero', code: 'UI.matchup(game, { kicker, meta, body, actions })  ·  .mx', note: 'Head to head: each team\'s gradient fills its half, the helmets face off across the middle, scores and names above, giant outlined team letters cropped at the diagonal. Details and actions sit on a floating card below.', used: 'Watch hero',
      variants: matchupVariants() })) +
  (H ? section('home', 'Home, made for you', 'Home changes with your team (picked under "Your team" above), the kind of fan you are, and the moment. Its blocks are ranked for right now (homeContext → homeScore): on game day your team and its players lead; the day after, Catch me up and highlights; a quiet midweek, the news and the daily games; a team out of it, Draft watch; late in a playoff race, What\'s at stake; in the offseason, moves and the draft.',
    spec({ id: 'fan-header', name: 'Home stage', code: 'fanHeader()  ·  .fx', note: 'The one hero on Home and the thing that tells you everything. It stays put while the rest of Home slides up over it as a rounded sheet (if it is taller than the screen it scrolls until its bottom shows, then pins). Greeting, record with division, seed and streak, a one-line story of the season, the game that matters now (countdown, live score with win chance, or result), the season strip (one cell per game), three numbers with NFL ranks. What changed since you last looked sits at the top of the sheet. Offseason: the record is labelled Last season; once preseason games are played the preseason record is the big one (labelled Preseason) with "Last season 14-3" in the line below, the game card shows preseason records, the strip is titled Last season, and last season\'s streak line is dropped.', used: 'top of Home (when you have a team). The only hero on Home; the featured game lives on Watch.', variants: [hs(H.fanHeader)].filter(Boolean) }) +
    spec({ id: 'pick-hero', name: 'Pick your team', code: 'pickHero()  ·  .fh.fh-pick', note: 'Home before you follow anyone: NFL navy, three helmets, logo buttons that follow a team in one tap, and set-up.', used: 'top of Home (no team yet)', variants: [hs(H.pickHero)].filter(Boolean) }) +
    spec({ id: 'stakes', name: "What's at stake", code: 'stakesBlock()  ·  .sk', note: 'The division race and playoff position in plain words, the division table with your team highlighted, and rival watch. Regular season and playoffs only: there is no race in the offseason.', used: 'Home', variants: [hs(H.stakesBlock)].filter(Boolean) }) +
    spec({ id: 'for-you', name: 'Made for you modules', code: 'forYou()  ·  by fan type', note: 'Die-hard: injuries and roster moves. Stats fan: EPA, success rate and league ranks. Casual: your weekend viewing plan. International: kickoffs in your time zone. Spoiler shield: replays ready to watch fresh. New fan: Football 101.', used: 'Home', variants: [hs(H.forYou, 'For the current fan type')].filter(Boolean) })) : '') +
  section('game-o', 'Game page', 'One game, before, during and after. Tabs: Preview · Fans before kickoff; Live · Plays · Stats · Fans · Matchup during; Recap · Game flow · Plays · Stats · Fans · Matchup after.',
    (GP ? spec({ id: 'gc-hero', name: 'Game hero', code: 'hero(model)  ·  .gc-hero', note: 'Both team gradients meet at a diagonal; the helmets face each other from the edges (away on the left faces right, home on the right faces left), the score or kickoff time between them. Helmets are clipped by the hero so they never run off the page.', used: 'top of every game page',
      variants: [mR && { label: 'Before kickoff', bleed: true, html: S(GP.hero(mR)) }, mL && { label: 'Live', bleed: true, html: S(GP.hero(mL)) }, mP && { label: 'Final', bleed: true, html: S(GP.hero(mP)) }].filter(Boolean) }) : '') +
    (mL ? spec({ id: 'leaders', name: 'Game leaders', code: 'gameParts.leadersCard(model)  ·  .ldr', note: 'Approved 2026-10-29. Mirrored like a scoreboard: each player is headshot, name (Title S) and the rest of the line (Meta) on the outside; the two yard totals meet in the middle in fixed-width slots, Display in each team\'s Mark, with YDS in Stats under them, so 3- and 2-digit totals line up.', used: 'game page (live, final)', variants: [{ bleed: true, html: S(App.gameParts.leadersCard(mL)) }] }) : '') +
    (mL ? spec({ id: 'drive-summary', name: 'Drive summary', code: 'playsTab(model, page)  ·  .dr2', note: 'Approved 2026-10-29. "All drives · Scoring drives" as small tabs and a quarter picker (32px chips), then a card per drive: logo and result (15px), Plays / Start / Yds / Time in Stats and the score after it. Open, each play sits on the team\'s Mark colour edge; tap a play to have it explained.', used: 'game page Plays tab', variants: [{ bleed: true, html: S(GP.playsTab(mL, { state: { filter: 'all', open: {} } })) }] }) : '') +
    (mR ? spec({ id: 'game-info', name: 'Game info', code: 'infoCard(model)  ·  .gi2', note: 'Approved 2026-10-29. The stadium photo, stadium and city as the big words (Display S) under small Eyebrow labels with icons, then every other fact (kickoff, broadcast, surface, weather, officials, attendance) as label and value.', used: 'game page Preview tab', variants: [{ bleed: true, html: S(GP.infoCard(mR)) }] }) : '') +
    (mR ? (() => { const y = [mR.g.s, mR.g.s - 1].find(x => App.NFL.d['box-' + x]); return y ? spec({ id: 'glance', name: 'Season at a glance', code: 'glanceCard(model, season)  ·  .gl', note: 'Approved 2026-10-29. Each team\'s chip over its own column; the numbers in Display in each team\'s Mark colour (App.teamRoles), the worse side dimmed; the two bars meet in the middle. The season sits on the section head\'s description line.', used: 'game page Preview tab', variants: [{ bleed: true, html: S(GP.glanceCard(mR, y)) }] }) : ''; })() : '') +
    (G.pre && GP.wlRow ? spec({ id: 'watch-rows', name: 'Watch & listen rows', code: "wlRow(game, option)  ·  .wl .wl-r  ·  the Where to watch sheet", note: 'Approved 2026-10-29. An icon tile, the label (Title S) and what it is (Meta), the NFL+ tag on plan rows, and one control: Watch or Listen (Tertiary before kickoff, Primary once it is on), See plans on the NFL+ upsell, or Connect for a service you have not connected. The whole row taps through.', used: 'Where to watch sheet', variants: [{ html: `<div class="wl" style="margin:0">${Dt.watch(G.pre).map(o => S(GP.wlRow(G.pre, o))).join('')}</div>` }] }) : '') +
    (mL ? spec({ id: 'now-card', name: 'Right now', code: 'nowCard(model)', note: 'The situation, the field and the last play, explained.', used: 'game page Live tab', variants: [{ bleed: true, html: S(GP.nowCard(mL)) }] }) : '') +
    (mL || mP ? spec({ id: 'wp-card', name: 'Win probability', code: 'wpCard(model)  ·  UI.wpChart(values, game)', used: 'game page Live tab and Game flow', variants: [{ bleed: true, html: S(GP.wpCard(mL || mP)) }] }) : '') +
    (wps.length > 2 && !GP ? spec({ id: 'wp', name: 'Win probability chart', code: 'UI.wpChart(values, game)', used: 'game page', variants: [{ html: `<div class="card" style="padding:12px">${S(UI.wpChart(wps, G.live))}</div>` }] }) : '') +
    (G.live && UI.fieldViz && L && L.play ? spec({ id: 'fieldviz', name: 'Field view', code: 'UI.fieldViz(game, { L })', used: 'game page Live tab', variants: [{ html: UI.fieldViz(G.live, { L }) }] }) : '') +
    (mL ? spec({ id: 'live-feed', name: 'Live feed', code: 'liveFeed(model)  ·  .lf', note: 'Newest first. Every play, with the swings (12+ points of win chance), runs (10+ unanswered points) and quarter breaks called out, crowd reactions alongside, and a Watch button on the big ones.', used: 'game page Live tab and Game flow', variants: [{ bleed: true, html: `<div class="ds-clip">${S(GP.liveFeed(mL))}</div>` }] }) : '') +
    spec({ id: 'celebrate', name: 'Score celebration', code: "UI.celebrate({ kind: 'td' | 'fg' | 'safety' | 'two', team, away, home, as, hs, was, text })  ·  .cel", note: 'When a team scores while you are watching the game page, the screen fills with their colours, the word slams in letter by letter, the helmet flies in, the score counts up and the play is written underneath. Score calls (spoken "Touchdown!") can be turned on and off from the button on it; the phone buzzes. Tap to dismiss; it leaves on its own after about four seconds. Calmer with reduced motion. Extra points do not trigger it.', used: 'game page while live',
      variants: [{ label: 'Tap to play', html: `<div class="ds-cel-stage" data-ds-stage><div class="ds-row" style="position:relative;z-index:1">${cel('td', 'Touchdown')}${cel('fg', 'Field goal')}${cel('safety', 'Safety')}${cel('two', 'Two-point')}</div></div>` }] })) +
  video() +
  section('redzone', 'RedZone', Dt.liveGames().length ? '' : 'Switch the moment to Game Day to see the trackers with live drives.',
    (App.rzParts ? spec({ id: 'rz-hero', name: 'RedZone player', code: 'redzonePage()  ·  .rzh', note: 'The page is dark, like the channel, and RedZone plays right here: never in a separate player. Over the video: the logo, live badge and viewers on the left, picture-in-picture and Cast on the right (the same pair as the game-page player). The video\'s own controls handle sound and full screen. Under it, a chyron for the game it is on, then one wide Multiview button. With NFL+ Premium it says it is included; without, the lock and "See NFL+ Premium" replace the play button. Off-air, the bar says when it starts next.', used: 'RedZone page', variants: rzVariants() }) : '') +
    (UI.rzPanel() ? spec({ id: 'rz-panel', name: 'RedZone panel', code: 'UI.rzPanel()', note: 'The mini state: logos for every drive inside the 20, a count bubble for drives at the 21–30, a pulse inside the 10. Follows the app theme.', used: 'Top of Scores while games are live', variants: [{ html: UI.rzPanel() }] }) : '') +
    (UI.rzFollowedList().length ? spec({ id: 'rz-followed', name: 'Your players in the red zone', code: 'UI.rzFollowed(max)  ·  .rzf', note: 'Below the tracker, never on it: each player you follow whose team has the ball inside the 20, with how far out they are. Only skill players and kickers.', used: 'RedZone panel on Scores, RedZone page', variants: [{ html: S(UI.rzFollowed(3)) }] }) : '') +
    (UI.rzCard ? spec({ id: 'rz-card', name: 'RedZone card', code: 'UI.rzCard()  ·  .rzc2 .rzc-cd', note: 'Approved 2026-10-29. Live media at 16:9 with a size-M call to action (NFL+ logo when you need Premium), Live beside the RedZone logo, then the tracker. Off the air, a DAYS : HRS : MINS countdown in Display XL with when it starts.', used: 'Watch', variants: [{ html: UI.rzCard() }] }) : '')) +
  section('play', 'Play', 'Daily habits: mini games, picks and points. Just for fun, never money.',
    App.miniGames ? spec({ id: 'mini-games', name: 'Mini games', code: 'App.miniGames.strip() · profile() · card(game) · row(game)  ·  .mgp .mgc .mgr', note: "Each game has its own colour and field art: Rank 'Em Rush green (trivia), Shake & Break purple (puzzle), Gridiron Slate blue (strategy). The profile card is you as a player: fan name, rank this week, a pennant in your team's colours, fan points this week (FP) and games played today. Streaks, ranks and points are sample values until the games keep their own.", used: 'Home strip; the Mini games hub; Search & explore', variants: [{ label: 'Home strip', bleed: true, html: App.miniGames.strip() }, { label: 'Hub list', html: `<div class="list mg-list" style="margin:0">${App.miniGames.GAMES.map(g => S(App.miniGames.row(g))).join('')}</div>` }] }) : '') +
  moments();
}

/* the moments that interrupt you (milestones, the weekly recap) and the pieces that follow the season */
function moments() {
  const tm = Dt.team(state.team), s = Dt.seasonForStats(), G = games(), H = App.homeParts || {}, GP = App.gameParts;
  const MS = UI.MILESTONES, phone = h => `<div class="ds-mphone">${S(h)}</div>`;
  const R = H.recapSlides && H.recapSlides();
  const pr = Dt.powerRank(s);
  const worst = Dt.standings(s).all.slice().sort((a, b) => a.pct - b.pct).map(r => r.tid);
  const dw = App.draftWatch && [state.team, ...worst].map(t => S(App.draftWatch(t))).find(Boolean);
  const dwLow = App.draftWatch && [state.team, ...worst.slice().reverse()].map(t => S(App.draftWatch(t, 'low'))).find(Boolean);
  const mR = G.pre && GP && GP.pregameScene ? GP.model(G.pre) : null, scene = mR ? S(GP.pregameScene(mR)) : '';
  // continue watching needs something you stopped part-way; borrow one in memory if there is none
  const was = store.p.resume;
  if (!(was || []).some(r => r.title)) store.p.resume = [{ key: 'ds', t: 20, len: 50.6, title: `${tm.name} Week 5 highlights`, eyebrow: 'Highlights', big: 'WEEK 5', bg: tm.color, team: tm.id, feat: 'highlights' }];
  const cw = App.watchParts ? S(App.watchParts.continueWatching()) : '';
  store.p.resume = was;
  return section('moments', 'Moments & season pieces', 'Big moments open as full-screen modals so they feel like an event; the rest live where you already look.',
    spec({ id: 'milestone', name: 'Milestone', code: 'UI.milestone(UI.MILESTONES.clinch | stamp | streak)  ·  .ms-card', note: 'A full-screen modal in your team colours with falling confetti, a badge, the headline and up to three numbers, then "Nice!" and Share. Shown once each: clinching a playoff spot, passport stamps (1st, every 10th, all 32) and day streaks.', used: 'Home (clinch), Football passport (stamps), time machine previews',
      variants: [{ label: 'Playoff bound', html: phone(UI.milestoneHtml(MS.clinch(state.team, s))) }, { label: 'Passport stamp', html: phone(UI.milestoneHtml(MS.stamp(10, tm.stadium || 'MetLife Stadium'))) }, { label: 'Streak', html: phone(UI.milestoneHtml(MS.streak(30))) }] }) +
    (R ? spec({ id: 'weekly-recap', name: 'Weekly recap', code: 'App.weeklyRecap()  ·  recapSlides()  ·  .wr', note: 'Your week as a story in a full-screen modal: cover, your game, your players, where you stand, around the league, up next. Tap right for next and left for back; each slide moves on by itself after 6.5 seconds. Spoilers stay hidden if you turned that on.', used: 'Home "Your week" card, time machine previews',
      variants: R.slides.slice(0, 4).map((_, k) => ({ label: `Slide ${k + 1}`, html: phone(H.recapHtml(R, k)) })) }) : '') +
    (pr && App.statsParts ? spec({ id: 'power-rankings', name: 'Power rankings', code: 'prBoard(season)  ·  prRow(rank)  ·  Dt.powerRank(season)', note: 'Rebuilt every week from record, point differential and form. Your teams are highlighted.', used: 'Stats Center (top 5), Power rankings page (all 32)', variants: [{ bleed: true, html: S(App.statsParts.prBoard(s)) }] }) : '') +
    (pr && App.teamParts && App.teamParts.prCard ? spec({ id: 'pr-card', name: 'Power rank card', code: 'prCard(teamId, season)  ·  .tm-pr', used: 'team page Overview', variants: [{ bleed: true, html: S(App.teamParts.prCard(state.team, s)) }] }) : '') +
    (dw || dwLow ? spec({ id: 'draft-watch', name: 'Draft watch', code: "App.draftWatch(teamId, 'top' | 'low')  ·  .dw", note: 'Where the team would pick today, its biggest need and prospects who should be there. Top: a season going badly (1-3 or worse, out of the top 10 seeds after Week 9, or out of the playoffs) puts it high on the page. Low: every other team from Week 4 of the regular season, near the bottom of the page.', used: 'Home (under the stakes, or near the bottom), team page Overview (above leaders, or at the end)', variants: [dw && { label: 'Top · season going badly', bleed: true, html: dw }, dwLow && { label: 'Low · good season', bleed: true, html: dwLow }].filter(Boolean) }) : '') +
    (scene ? spec({ id: 'pregame-scene', name: 'Pregame scene', code: 'pregameScene(model)  ·  .gc-scene', note: 'The four hours before kickoff: gates, warmups, inactives, kickoff on a timeline, fans in the building counting up, weather, and who is out once inactives post 90 minutes before.', used: 'game page Preview tab', variants: [{ bleed: true, html: scene }] }) : '') +
    (cw ? spec({ id: 'continue-watching', name: 'Continue watching', code: 'continueWatching()  ·  wcard(video, w, pct)  ·  .w-cw', note: 'Anything you stopped part-way, newest first, with a progress bar and the time left. Highlights and shows reopen in the video overlay, which picks up where you left off and offers Start over. Full and condensed replays reopen on their game page, docked at the top, at the same spot.', used: 'Watch, under the hero', variants: [{ bleed: true, html: cw }] }) : '') +
    (App.watchParts ? spec({ id: 'team-videos', name: 'Team videos', code: 'App.watchParts.teamVideos(teamId)', note: 'The team\'s recent game highlights first, then its press conferences and team show, and a link to every replay.', used: 'team page Overview, search ("Jets videos")', variants: [{ bleed: true, html: S(App.watchParts.teamVideos(state.team)) }] }) : '') +
    (App.watchSpots ? spec({ id: 'watch-spots', name: 'Watch with fans', code: 'spotsBlock(teamId, city)  ·  .ws-party', note: 'The next watch party on the team gradient with an RSVP, then bars where its fans go. Sample listings.', used: 'Watch with fans page, from Where to watch and Search & explore', variants: [{ bleed: true, html: S(App.watchSpots.block(state.team, (store.p.location && store.p.location.city) || 'New York', [])) }] }) : '') +
    (App.LEARN && App.LEARN.penAnim ? spec({ id: 'pen-anim', name: 'Penalty diagram', code: 'penAnim(kind)  ·  .pen-anim', note: 'A looping play diagram: circles are the offense, crosses the defense, the player at fault turns red and the flag drops. Calmer with reduced motion.', used: 'Learning football · Penalties ("See it happen")', variants: App.LEARN.PEN_ANIMS.map(([k, l]) => ({ label: l, html: `<div style="max-width:360px">${S(App.LEARN.penAnim(k))}</div>` })) }) : '') +
    (App.timeMachine && App.timeMachine.scenarioBlock ? spec({ id: 'tmx-scen', name: 'Time machine: your team', code: 'scenarioBlock()  ·  .tmx-scen', note: 'Prototype tool. Swaps your team for a contender, a bubble team or a struggling one at the chosen moment (in the playoffs: still alive, just missed, bad season); "Mine" brings your teams back.', used: 'time machine sheet', variants: [{ bleed: true, html: S(App.timeMachine.scenarioBlock()) }] }) : '') +
    (App.timeMachine && App.timeMachine.weekBlock ? spec({ id: 'tmx-week', name: 'Time machine: when', code: 'weekBlock()  ·  .tmx-wk  ·  .tmx-list', note: 'Prototype tool, at the top of the time machine. When: the week (named for its games, e.g. "Wild Card & Divisional Round", with arrows to the week before or after), a day (S M T W T F S, a dot under game days) and Morning, Afternoon or Evening. Each time of day lands on the moment in it with the most games on, so Sunday afternoon catches the early and late windows overlapping and the Super Bowl evening lands mid-game; a part of a day with no games uses 10:00 AM, 3:55 PM or 9:40 PM ET. Season: Preseason, Week 1, Week 4, Week 10, Week 16, Divisional Round and Super Bowl, each from the latest season that has played it (Week 10, Week 16 and the playoffs come from 2025). Picking one shows its week, starting on its Sunday, and lands on that Sunday at the busiest time of day. The sheet stays open so you can then pick a day and time; the clock card on top shows where you landed. The status bar names the week (Preseason, Week 10, Divisional Round…) and the app takes that phase. Days after "Right now" are greyed out.', used: 'time machine sheet', variants: [{ bleed: true, html: S(App.timeMachine.weekBlock()) }] }) : '') +
    (App.timeMachine && App.timeMachine.platformBlock ? spec({ id: 'tmx-device', name: 'Time machine: device', code: 'platformBlock()  ·  .tmx-scen', note: 'Prototype tool. iOS shows the Liquid Glass tab bar; Android shows the Material navigation bar. Nothing else changes. Remembered.', used: 'time machine sheet', variants: [{ bleed: true, html: S(App.timeMachine.platformBlock()) }] }) : ''));
}

/* streams on the game page, picture-in-picture and the live bar: one stream at a time, everywhere */
function video() {
  const G = games(), GP = App.gameParts, H = App.homeParts || {};
  if (!GP || !GP.playerHtml) return '';
  const mL = G.live ? GP.model(G.live) : null, mP = G.post ? GP.model(G.post) : null;
  const still = { still: true };
  const dock = (m, mode) => `<div class="gc-page watching ds-watch"><div class="gc-player"><div class="gcp" data-mode="${mode}">${S(GP.playerHtml(mode, 'replay', still))}</div></div><div class="gc-topwrap">${S(GP.hero(m, true))}${S(GP.actionsStrip(m, mode === 'live', true))}</div></div>`;
  const corner = (sc) => `<div class="pip ds-pipv"><div class="gcp">${S(GP.playerHtml('live', null, { still: true, held: true }))}</div>${S(GP.pipChrome()).replace('<div class="pip-sc"></div>', `<div class="pip-sc">${sc}</div>`)}</div>`;
  const strips = [mL && { label: 'Live · not streaming here', bleed: true, html: S(GP.actionsStrip(mL, false, false)) }, mL && { label: 'Live · watching', bleed: true, html: S(GP.actionsStrip(mL, true, true)) },
    mP && { label: 'Final', bleed: true, html: S(GP.actionsStrip(mP, false, false)) }, mP && { label: 'Final · replay playing', bleed: true, html: S(GP.actionsStrip(mP, false, true)) }].filter(Boolean);
  return section('video', 'Video & live streams', 'One rule everywhere: any video you\'d keep watching while doing something else (a live game, RedZone, a replay) gets its own page and can shrink to picture-in-picture; quick clips (highlights, shows) open in the video overlay. Only one stream plays at a time.',
    spec({ id: 'gc-watching', name: 'Docked player', code: "makePlayer(mode, kind)  ·  playerHtml(mode, kind)  ·  .gc-player .gcp", note: 'A stream plays at the top of its game page, under the header, and stays put while the page scrolls under it. The tabs stick right below it. The hero shrinks to its mini version (helmets, score and clock, with down & distance on its own line), and once that scrolls away the pinned score bug takes over. Live: plays on its own, with no Watch live button and no close, for any game you can stream in the app (NFL+, Game Pass, or a streaming service you\'ve connected). Never behind the spoiler shield. Final: with NFL+ Premium (Game Pass abroad), the full replay plays from kickoff two hours after the final whistle, with Full game / Condensed on the video, each keeping its own spot. It plays even with the shield on, since it can\'t spoil anything: the header keeps the score hidden, and finishing it lifts the shield when "Reveal after I watch" is on. The video keeps playing across tab switches and pauses when another tab of the app is showing.', used: 'game page (live, final)',
      variants: [mL && { label: 'Live', bleed: true, html: dock(mL, 'live') }, mP && { label: 'Final · replay', bleed: true, html: dock(mP, 'replay') }].filter(Boolean) }) +
    spec({ id: 'gcp-held', name: 'Waiting player', code: 'App.pip.hold(box)  ·  App.pip.heldBtn()  ·  .held > .gcp-held', note: 'One stream at a time. If something is already playing in picture-in-picture when you open a page with its own stream, the corner keeps playing and this player waits, paused, behind a Play here button. Tapping it closes the corner and plays here. Closing the corner never starts the page by itself.', used: 'game page player, RedZone page',
      variants: [{ label: 'Waiting', bleed: true, html: `<div class="gcp held">${S(GP.playerHtml('live', null, { still: true, held: true }))}</div>` }] }) +
    spec({ id: 'pip', name: 'Picture-in-picture', code: "App.pip.open(gameId | 'redzone', player, 'live' | 'replay')  ·  .pip", note: 'The same video element shrinks to the bottom corner, above the tab bar, and follows you around the app; it never restarts. A strip along the bottom says what\'s on: the live score, "NFL RedZone · Live", or the matchup and "Replay" (never a final score). Tap it to go back to its page and it docks again; × closes it. It closes by itself when a live game ends. The live bar hides while it shows.', used: 'every screen, from the PiP button on any docked player or RedZone',
      variants: [G.live && { label: 'Live game', html: corner(S(GP.bugHtml(mL))) }, { label: 'RedZone', html: corner('<b>NFL RedZone</b> <span>Live</span>') }, G.post && { label: 'Replay', html: corner(`${Dt.team(G.post.a).abbr} @ ${Dt.team(G.post.h).abbr} <span>Replay</span>`) }].filter(Boolean) }) +
    (G.live && H.miniHtml ? spec({ id: 'minibar', name: 'Live bar', code: 'updateMini()  ·  miniHtml({ g })  ·  .minibar', note: 'Your team\'s live game, floating above the tab bar on every screen except Home and game pages. Tap to open the game. Swipe it sideways to dismiss it for the rest of that game. Never shown at the same time as picture-in-picture. Spoiler-safe.', used: 'every screen but Home and game pages',
      variants: [{ html: `<div class="minibar ds-mini">${S(H.miniHtml({ g: G.live }))}</div>` }] }) : '') +
    (strips.length ? spec({ id: 'gc-actions', name: 'Game actions', code: 'actionsStrip(model, watching, docked)  ·  .gc-actions', note: 'The pills under the game hero. Live: Watch live (or where it\'s on TV), RedZone when RedZone is on the air and this game is in it (Sunday afternoons, not primetime), Listen, Catch up. Watch live drops out once the game is playing above. Final: 60-second recap, Highlights (in the overlay) and Replays (dropped once the replay is playing above). All options always ends the row.', used: 'game page',
      variants: strips }) : ''));
}

function matchupVariants() {
  const G = games(), out = [];
  const act = g => html`<button class="btn ink sm">${icon('tv', 'sm')} Where to watch</button><button class="btn sm">Preview</button>`;
  if (G.live) { const L = Dt.live(G.live), S0 = Dt.score(G.live); out.push({ label: 'Live', bleed: true, html: UI.matchup(G.live, { meta: [Dt.weekLabel(G.live.t, G.live.w), (G.live.tv || []).join(' / ')].filter(Boolean).join(' · '), body: html`${S0.dd ? html`<div class="mx-sit">${S0.dd}${S0.redzone ? html`<span class="mx-rz">Red zone</span>` : ''}</div>` : ''}${L && L.play ? html`<div class="mx-play clamp2">${L.play.x}</div>` : ''}`, actions: html`<button class="btn ink sm">${icon('tv', 'sm')} Where to watch</button><button class="btn sm">${icon('headphones', 'sm')} Listen</button><button class="btn sm sq">${icon('scores', 'sm')}</button>`, cls: 'hm-mx' }) }); }
  if (G.pre) out.push({ label: 'Upcoming', bleed: true, html: UI.matchup(G.pre, { kicker: 'Up next', meta: Dt.weekLabel(G.pre.t, G.pre.w), body: html`<div class="mx-when"><div class="mx-big">${App.fmt.until(G.pre.ts)}</div><div class="mx-date">${App.fmt.day(G.pre.ts)} · ${App.fmt.time(G.pre.ts)}</div></div>`, actions: act(G.pre), cls: 'hm-mx' }) });
  if (G.post) out.push({ label: 'Final', bleed: true, html: UI.matchup(G.post, { meta: Dt.weekLabel(G.post.t, G.post.w), actions: html`<button class="btn ink sm">${icon('tv', 'sm')} Where to watch</button><button class="btn sm">Box score</button>`, cls: 'hm-mx' }) });
  return out;
}

function rzVariants() {
  const was = store.p.sub, out = [];
  for (const [sub, label] of [['premium', 'With NFL+ Premium'], ['free', 'No plan']]) { store.p.sub = sub; out.push({ label, bleed: true, html: `<div class="rz-page ds-rz">${S(App.rzParts.page().html)}</div>` }); }
  store.p.sub = was;
  return out;
}

/* ================================================================== SCREENS: the real app in phone frames */
/* devices for the screen frames, at their CSS-pixel viewport (the foldables are approximate) */
const DEVICES = [
  { k: 'iphone', l: 'iPhone 18', w: 402, h: 874, r: 30 },
  { k: 'promax', l: 'iPhone 18 Pro Max', w: 440, h: 956, r: 30 },
  { k: 'fold', l: 'iPhone Fold, open', w: 904, h: 640, r: 22 },
  { k: 'android', l: 'Android phone', w: 412, h: 915, r: 26, os: 'android' },
  { k: 'afold', l: 'Android foldable, open', w: 690, h: 830, r: 20, os: 'android' },
  { k: 'ipad', l: 'iPad 11"', w: 820, h: 1180, r: 18 },
];
const FRAME_H = 560;
function deviceBar() {
  const d = DEVICES.find(x => x.k === state.device) || DEVICES[0];
  return `<div class="ds-devs">${DEVICES.map(x => `<button class="${x.k === d.k ? 'on' : ''}" data-ds-dev="${x.k}">${x.l}</button>`).join('')}</div>
    <p class="ds-devs-n">${d.w} × ${d.h} pt${d.os === 'android' ? ' · Android tab bar' : ''}. The app is built for phones: wider screens get the same single column, stretched.</p>`;
}
function screens() {
  const d = DEVICES.find(x => x.k === state.device) || DEVICES[0], sc = FRAME_H / d.h;
  const q = `frame&moment=${state.moment}&team=${state.team}&theme=${state.theme}${d.os ? '&platform=' + d.os : ''}`;
  const box = `width:${Math.round(d.w * sc)}px;height:${FRAME_H}px;border-radius:${d.r}px`, ifr = `width:${d.w}px;height:${d.h}px;transform:scale(${sc.toFixed(4)})`;
  const phone = (n, r, extra) => `<figure><figcaption>${n}</figcaption><div class="ds-phone" style="${box}"><iframe loading="lazy" style="${ifr}" src="index.html?${q}${extra || ''}#/${r}" title="${n}"></iframe></div></figure>`;
  const app = [['Home', 'home'], ['Scores', 'scores'], ['Watch', 'watch'], ['News', 'news'], ['Teams', 'teams'], ['You', 'you'], ['Search & explore', 'search'], ['RedZone (Premium)', 'channel/redzone', '&sub=premium'], ['RedZone (no plan)', 'channel/redzone', '&sub=free']];
  const G = games(), GP = App.gameParts;
  const gameRow = (label, g) => {
    if (!g || !GP) return '';
    const m = GP.model(g), tabs = GP.tabList(m);
    return `<div class="ds-sec-sub"><h3>${label}</h3><p>${Dt.team(g.a).name} at ${Dt.team(g.h).name} · ${tabs.map(t => t.l).join(' · ')}</p></div>
      <div class="ds-screens">${tabs.map(t => phone(t.l, `game/${g.id}?tab=${t.k}`)).join('')}</div>`;
  };
  return section('app-screens', 'App screens', 'These frames run the real app at the moment, team and theme picked above, on the device picked here. Nothing they do is saved.',
    `${deviceBar()}<div class="ds-screens">${app.map(([n, r, x]) => phone(n, r, x)).join('')}</div>`) +
    section('game-screens', 'Game page', 'Every tab of the game page in each state. Scroll inside a frame to see the score bug pin to the bottom.',
      gameRow('Before kickoff', G.pre) + gameRow('Live', G.live) + gameRow('Final', G.post)) +
    section('video-screens', 'Video & devices', 'The game page with a stream docked on top, the replay a Premium fan gets on a final game, and Android.',
      `<div class="ds-screens">${[G.live && ['Watching live', `game/${G.live.id}?watch=1`, '&sub=premium'], G.post && ['Final · replay (Premium)', `game/${G.post.id}`, '&sub=premium'], ['Home · Android', 'home', '&platform=android'], ['Scores · Android', 'scores', '&platform=android']].filter(Boolean).map(([n, r, x]) => phone(n, r, x)).join('')}</div>`);
}

/* ================================================================== FOUNDATIONS */
function foundations() { return [principles, color, type, brand, icons, shape].map(f => f()).join(''); }

/* ------------------------------------------------------------------ page */
const MOMENTS = [['gameday', 'Game Day'], ['snf', 'Sunday Night'], ['midweek', 'Midweek'], ['sb', 'Super Bowl'], ['draft', 'Draft']];
function chrome() {
  const teams = Dt.D.teams.slice().sort((a, b) => a.full.localeCompare(b.full));
  return `<header class="ds-top">
      <div class="ds-brand"><img src="assets/brand/nfl-shield.webp" alt="NFL"><div><h1>Design system</h1><p>Every specimen is the real component</p></div></div>
      <div class="ds-ctl">
        <label>Moment<select data-ds="moment">${MOMENTS.map(([k, l]) => `<option value="${k}" ${k === state.moment ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Your team<select data-ds="team">${teams.map(t => `<option value="${t.id}" ${t.id === state.team ? 'selected' : ''}>${t.full}</option>`).join('')}</select></label>
        <label>Theme<select data-ds="theme"><option value="light" ${state.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${state.theme === 'dark' ? 'selected' : ''}>Dark</option></select></label>
      </div></header>`;
}
const TIERS = [
  { k: 'foundations', l: 'Foundations', d: 'Colour, type, logos, helmets, icons, shape', fn: foundations },
  { k: 'atoms', l: 'Atoms', d: 'Buttons, chips, toggles, badges, marks', fn: atoms },
  { k: 'molecules', l: 'Molecules', d: 'Tab bar, picker, rows, cards, game pieces', fn: molecules },
  { k: 'organisms', l: 'Organisms', d: 'Heroes, Home stage, game page, RedZone', fn: organisms },
  { k: 'screens', l: 'Screens', d: 'The real app, including every game page tab', fn: screens },
  { k: 'approvals', l: 'Approvals', d: 'Proposed changes, side by side', fn: () => window.DSApprovals ? DSApprovals.render({ state, games }) : '' },
];
function tierFromHash() { const k = location.hash.slice(1).split('/')[0]; return TIERS.find(t => t.k === k) ? k : 'foundations'; }
function render() {
  const main = document.getElementById('ds-main');
  if (!main) return;
  const y = window.scrollY;
  const tier = TIERS.find(t => t.k === state.tier) || TIERS[0];
  try { main.innerHTML = tier.fn(); } catch (e) { console.error(tier.k, e); main.innerHTML = section(tier.k, tier.l, `Could not render: ${e.message}`, ''); }
  document.querySelectorAll('.ds-tier').forEach(b => b.classList.toggle('on', b.dataset.tier === tier.k));
  // the side nav lists this tier's sections and specimens
  document.querySelector('.ds-nav').innerHTML = [...main.querySelectorAll('.ds-sec')].map(sec => `<a class="ds-nav-sec" href="#${tier.k}/${sec.id}">${sec.querySelector('h2').textContent}</a>${[...sec.querySelectorAll(':scope > .ds-spec')].map(sp => `<a href="#${tier.k}/${sp.id}">${sp.querySelector('h3').textContent}</a>`).join('')}`).join('');
  // measure type rows from the real CSS
  main.querySelectorAll('.ds-trow').forEach(r => {
    const el = r.querySelector('.ds-tsample').querySelector('.score-xl,.h1,.h2,.big-num,.v,.h3,p,.muted,.tiny,.eyebrow,.num') || r.querySelector('.ds-tsample').firstElementChild;
    if (!el) return;
    const cs = getComputedStyle(el);
    r.querySelector('.ds-measure').textContent = `${Math.round(parseFloat(cs.fontSize))}px · ${cs.fontWeight}${cs.fontStyle === 'italic' ? ' italic' : ''} · ${cs.fontFamily.split(',')[0].replace(/"/g, '')}`;
  });
  window.scrollTo(0, y);
}
function shell() {
  document.body.innerHTML = `<div class="ds">${chrome()}
    <div class="ds-tiers" role="tablist">${TIERS.map(t => `<button class="ds-tier" role="tab" data-tier="${t.k}"><b>${t.l}</b><span>${t.d}</span></button>`).join('')}</div>
    <nav class="ds-nav"></nav>
    <main id="ds-main"></main></div>`;
  document.body.addEventListener('change', e => {
    const k = e.target.dataset.ds; if (!k) return;
    state[k] = e.target.value;
    if (k === 'moment') setMoment(state.moment); else applyLook();
    render();
  });
  document.body.addEventListener('click', e => {
    const tb = e.target.closest('.ds-tier');
    if (tb) { state.tier = tb.dataset.tier; history.replaceState(null, '', '#' + state.tier); render(); window.scrollTo(0, 0); return; }
    const dv = e.target.closest('[data-ds-dev]');
    if (dv) { state.device = dv.dataset.dsDev; render(); return; }
    const c = e.target.closest('[data-ds-cel]');
    if (c) { playCelebration(c.dataset.dsCel, c.closest('[data-ds-stage]')); return; }
    const a = e.target.closest('.ds-nav a');
    if (a) { e.preventDefault(); const el = document.getElementById(a.getAttribute('href').split('/')[1]); if (el) el.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', a.getAttribute('href')); }
  });
  // components are inert here: links and actions don't navigate
  document.body.addEventListener('click', e => { if (e.target.closest('#ds-main [data-go], #ds-main [data-act], #ds-main a[href="#"]')) e.preventDefault(); }, true);
}
/* plays the real celebration inside the specimen's own frame, with a live game's teams */
function playCelebration(kind, host) {
  const g = games().live || games().post || games().pre; if (!g || !host) return;
  const S0 = Dt.score(g), team = state.team === g.a || state.team === g.h ? state.team : g.h;
  const pts = { td: 6, fg: 3, safety: 2, two: 2 }[kind] || 6, home = team === g.h;
  const as = +S0.as || 0, hs = +S0.hs || 0;
  const text = { td: 'A 14-yard catch in the back of the end zone.', fg: 'A 47-yard field goal, right down the middle.', safety: 'Sacked in his own end zone.', two: 'Pitch and catch for two.' }[kind];
  UI.celebrate({ kind, team, away: g.a, home: g.h, as: home ? as : as + pts, hs: home ? hs + pts : hs, was: { as, hs }, text, host });
}

document.addEventListener('DOMContentLoaded', () => {
  applyLook();
  setMoment(state.moment);
  state.tier = tierFromHash();
  shell();
  render();
  const id = location.hash.split('/')[1]; if (id) setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView(); }, 300);
  App.on('live-ready', render);
});
})();
