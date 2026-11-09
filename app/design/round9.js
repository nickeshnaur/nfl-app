/* Approvals round 9: cards keyed by id in window.R5_CARDS, queued by round5.js. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const PH = inner => `<div class="r6-ph">${inner}</div>`;
const phone = (r, x) => DSApprovals.h.phone(r, x || '');
const WH2 = [
  ['a', 'Soft glow', 'Each team\'s colour eases in from its own side behind its logo and is gone before the middle, so the scores and the buttons sit on black.', 'wh2'],
  ['b', 'Fuller glow', 'The same light, stronger and reaching further: the two colours nearly meet behind the scores and carry down behind the buttons.', 'wh2f'],
];
R['watch-hero2'] = { id: 'watch-hero2', v: 3, ready: true, name: 'Watch page hero', target: 'watch.js hero()',
  changes: ['Your note on v2: "no let\'s remove the jersey fabric."',
    'v3 is the v1 B dark glow with no fabric, polished: the glow now fades out over many steps (no hard band at its edge) and sits behind each logo; more room at the top so the status is never tight; bigger logos; the Ball tag is a quiet chip instead of a white block.',
    'Type: scores and team names in italic Display caps; the clock, records and drive numbers in All-Pro Stats; everything else in Sans, with the secondary lines (network, records, the watch note) a step quieter than the main ones.',
    'Each option is drawn inside the real app. Left phone: live (Bears at Packers, 4th quarter). Right phone: before kickoff (Chargers at Chiefs; the Chiefs don\'t play in the Game Day moment). Teams whose main colour is too dark to glow on black (the Packers\' green) glow in their second colour.',
    ...WH2.map(([k, n, d]) => `${k.toUpperCase()}, ${n}: ${d}`)],
  options: WH2.map(([k, n]) => ({ k, name: n, note: '' })),
  current: () => V('As the app draws it', '#/watch', PH(phone('watch'))),
  proposed: k => { const w = WH2.find(x => x[0] === k);
    return V(w[1], '#/watch · live, then before kickoff', PH(phone('watch', '&pv=' + w[3]) + phone('watch', '&pv=' + w[3] + ',whpre'))); } };
const ROW9 = inner => `<div style="display:flex;flex-wrap:wrap;gap:16px 20px">${inner}</div>`;
const SH9 = (t, inner) => `<div style="display:inline-flex;flex-direction:column;gap:6px"><span style="font:600 12px/1.2 var(--sans)">${t}</span>${inner}</div>`;
const AT9 = sel => '&at=' + encodeURIComponent(sel);
const AS9 = (route, extra, moment, tid) => { let h = phone(route, extra); if (moment) h = h.replace(/moment=\w+/, 'moment=' + moment); if (tid) h = h.replace(/team=\d+/, 'team=' + tid); return h; };

const PSB = { a: ['As built now', 'Every stat column the same weight on the player cards too, the same as the Team stats table you approved.', ''],
  b: ['Lead column bold on player cards', 'The player cards keep their one bold column (Yds on Passing); only the Team stats table loses it.', 'pbold'] };
R['player-stat-bold'] = { id: 'player-stat-bold', v: 1, ready: true, name: 'Player stat cards: the bold column', target: 'player.js stat card .tc · td.k',
  changes: ['Building Team stats v4 ("why is yds bold? it should be teh same as others") also took the bold off the player stat cards, because they share the same table. Pick whether the player cards should keep it.',
    ...Object.entries(PSB).map(([k, x]) => `${k.toUpperCase()}, ${x[0]}: ${x[1]}`)],
  options: Object.entries(PSB).map(([k, x]) => ({ k, name: x[0], note: '' })),
  current: () => V('As the app draws it', '#/player · Mahomes · Game log', PH(phone('player/3139477?tab=gamelog', AT9('.tc')))),
  proposed: k => V(PSB[k][0], '#/player · Mahomes · Game log', PH(phone('player/3139477?tab=gamelog', (PSB[k][2] ? '&pv=' + PSB[k][2] : '') + AT9('.tc')))) };

const HOF = [['fa', 'Free Agency', 12], ['draft', 'Draft Night', 12], ['summer', 'Summer', 12], ['camp', 'Training Camp', 12], ['fa', 'Free Agency', 28], ['camp', 'Training Camp', 28]];
R['home-offseason-hero'] = { id: 'home-offseason-hero', v: 2, ready: true, name: 'Home hero in the offseason', target: 'home.js homeHero() offseason pages (league moments)',
  changes: ['Your note on v1: "off season pages are great, but need better execution. also there\'s a lot of different parts of the offseason so show those so i can give notes"',
    'v2 keeps A (the season hero top, pages under it) and rebuilds each page the way the season pages are built: an eyebrow with a link, one big focal thing, then a line of info and one white button. Swipe each phone to see its pages.',
    'Free agency: page 1 the league\'s move count and yours, big; page 2 your team\'s two latest moves (left out until there is one); page 3 last season.',
    'Draft night: page 1 who is on the clock, big, with the overall pick and the last pick under it; page 2 your picks as five tiles (made ones show the player, the next one lit white); page 3 last season.',
    'Summer and training camp: page 1 your Week 1 opener, built like Next game, counting down to it; page 2 last season. Before the schedule comes out (mid-May) page 1 counts down to kickoff instead.',
    'Last season (every phase): the record in the eyebrow, three numbers in Display with their NFL rank, split by thin rules (no boxes).',
    'Phases the time machine has no moment for, so not shown: right after the Super Bowl and the Combine (late Feb), schedule release day (mid-May), OTAs and minicamp (late May to mid-June), and preseason games (August). The Super Bowl moment itself still shows the season hero. Say which of these should get a moment and I\'ll draw it.'],
  options: [{ k: 'a', name: 'Offseason pages, per phase', note: '' }],
  current: () => V('As the app draws it', '#/ · Draft Night · Chiefs', PH(AS9('', '&pv=hhoffa', 'draft'))),
  proposed: () => V('Offseason pages, per phase', '#/ · Chiefs in four phases, Commanders in two', ROW9(HOF.map(([m, n, t]) => SH9(`${t === 28 ? 'Commanders' : 'Chiefs'} · ${n}`, AS9('', '&pv=hhoffa', m, t))).join(''))) };

const PBL = { a: ['Score and clock', 'While your game is live the right side of the bar shows a Live badge, the score (yours first) and the quarter and clock. Tapping it opens the game.', 'pinlva'],
  b: ['Live, opponent, score', 'A live dot, "Live · vs NYG", then the score. Quieter; no clock. Tapping it opens the game.', 'pinlvb'] };
R['home-pinbar-live'] = { id: 'home-pinbar-live', v: 1, ready: true, name: 'Home pinned bar during a live game', target: 'home.js hhMini · .hh-mini',
  changes: ['The bar that pins when you scroll Home still says "vs NYG · Sun 1:00 PM" while that game is live.',
    ...Object.entries(PBL).map(([k, x]) => `${k.toUpperCase()}, ${x[0]}: ${x[1]}`), 'With the spoiler shield on, the score is left out.'],
  options: Object.entries(PBL).map(([k, x]) => ({ k, name: x[0], note: '' })),
  current: () => V('As the app draws it', '#/ · Game Day · Commanders, scrolled', PH(AS9('', AT9('.hm-sheet .sec'), 'gameday', 28))),
  proposed: k => V(PBL[k][0], '#/ · Game Day · Commanders, scrolled', PH(AS9('', '&pv=' + PBL[k][2] + AT9('.hm-sheet .sec'), 'gameday', 28))) };

/* ------------------------------------------------------------------ onboarding notes (drawn with a fresh draft, nothing saved) */
const OBN = '"the \'continue\' button looks off, maybe color or the style, also the fave team selector should be alphabetical. also the grayed out logos in the initial animation looks weird, make them full color but they\'re just dropped in opacity"';
const obV = (k, sel, over) => { const d = document.createElement('div'); d.innerHTML = App.onboarding.view(k, over || {}); const x = sel ? [...d.querySelectorAll(sel)] : [d]; return x.map(e => e.outerHTML).join(''); };
const obAcc = tid => { const tm = App.data.team(tid), a = App.readable(tm); return `--accent:${a};--accent-ink:${App.lum(a) > .45 ? '#0a0a0a' : '#fff'}`; };
const obFoot = (cls, tid) => `<div class="r9ob-foot ${cls} ${tid ? '' : 'none'}" style="${tid ? obAcc(tid) : '--accent:#4aa3ff;--accent-ink:#fff'}">${obV(tid ? 'team' : 'level', '.ob-foot', tid ? { primary: tid, teams: [tid] } : { level: 'casual' })}</div>`;
const OBC = { a: ['Ink', 'Black with white text in light mode, white with black text in dark, before and after you pick a team. The same ink as the picked fan-level card and its check right above it.', 'ink'],
  b: ['NFL navy', 'The NFL shield navy (#013369) with white text on every step, before and after you pick. Ties the button to the shield on the welcome screen.', 'navy'],
  c: ['Ink, then your team', 'Ink until you pick a team, then your team\'s real colour from the team step on (Chiefs red, Commanders burgundy), so the app starts wearing it.', 'team'] };
R['ob-continue'] = { id: 'ob-continue', v: 1, ready: true, name: 'Onboarding: the Continue button', target: 'onboarding.js ctaFor() · .ob-foot .ob-cta',
  changes: [`Your note: ${OBN}`,
    'Today it is the app accent: a light blue before you pick a team (the default accent, nothing to do with the NFL or you), then your team\'s colour. Same size and squared shape as the rest of the buttons (L, 48 tall); only the colour changes below.',
    ...Object.entries(OBC).map(([k, x]) => `${k.toUpperCase()}, ${x[0]}: ${x[1]}`)],
  options: Object.entries(OBC).map(([k, x]) => ({ k, name: x[0], note: '' })),
  current: () => V('As the app draws it', 'Onboarding · fan level, then Chiefs picked, then Commanders picked', PH(`${obFoot('cur', 0)}${obFoot('cur', 12)}${obFoot('cur', 28)}`)),
  proposed: k => V(OBC[k][0], 'Onboarding · fan level, then Chiefs picked, then Commanders picked', PH(`${obFoot(OBC[k][2], 0)}${obFoot(OBC[k][2], 12)}${obFoot(OBC[k][2], 28)}`)) };

const OBA = { a: ['A to Z by city', 'Arizona Cardinals first, Washington Commanders last (Los Angeles Chargers before Los Angeles Rams, New York Giants before New York Jets). No division headings.', 'full'],
  b: ['A to Z by nickname', '49ers, Bears, Bengals … Vikings. No division headings.', 'name'] };
R['ob-alpha'] = { id: 'ob-alpha', v: 1, ready: true, name: 'Onboarding: team picker order', target: 'onboarding.js grid() · .ob-teams',
  changes: [`Your note: ${OBN}`, 'Today the 32 tiles are grouped by division (AFC East, AFC North …). Both options list them alphabetically in one grid, four across; the tiles themselves are unchanged. The "Follow other teams too?" step uses the same order.',
    ...Object.entries(OBA).map(([k, x]) => `${k.toUpperCase()}, ${x[0]}: ${x[1]}`)],
  options: Object.entries(OBA).map(([k, x]) => ({ k, name: x[0], note: '' })),
  current: () => V('As the app draws it', 'Onboarding · who\'s your team', PH(`<div class="r9ob-grid">${obV('team', '.ob-teams')}</div>`)),
  proposed: k => V(OBA[k][0], 'Onboarding · who\'s your team', PH(`<div class="r9ob-grid">${obV('team', '.ob-teams', { sortBy: OBA[k][2] })}</div>`)) };

const OBL = { a: ['Full colour, 35%', 'Every logo in its real colours at 35% opacity. Quieter; the headline and buttons stay the focus.', 'o35'],
  b: ['Full colour, 55%', 'Every logo in its real colours at 55% opacity. The wall reads as the league at a glance.', 'o55'] };
R['ob-logos'] = { id: 'ob-logos', v: 1, ready: true, name: 'Onboarding: welcome logo wall', target: 'you.css .ob-marq-row .logo',
  changes: [`Your note: ${OBN}`, 'Today the logos are turned grey (grayscale, brightened) at 24% opacity. Both options keep the real logo colours and only drop the opacity. Rows, speed and the fade at the top and bottom are unchanged; the phones are a still frame of the moving wall.',
    ...Object.entries(OBL).map(([k, x]) => `${k.toUpperCase()}, ${x[0]}: ${x[1]}`)],
  options: Object.entries(OBL).map(([k, x]) => ({ k, name: x[0], note: '' })),
  current: () => V('As the app draws it', 'First run', PH(`<div class="r6ob-wel-cur r9ob-wel">${obV('welcome', '.ob-welcome')}</div>`)),
  proposed: k => V(OBL[k][0], 'First run', PH(`<div class="r6ob-wel-cur r9ob-wel ${OBL[k][2]}">${obV('welcome', '.ob-welcome')}</div>`)) };
})();
