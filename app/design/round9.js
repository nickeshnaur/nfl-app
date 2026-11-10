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
/* ------------------------------------------------------------------ trade deadline (the 2025 deadline, the Trade Deadline moment) */
const TDL = { b: ['Deadline page in front', 'The deadline is added as the hero\'s first page: Live, the countdown to 4 PM ET big, the deals so far on the right, then your team\'s latest deal (or "no deals yet" and the league\'s latest) and a Tracker button. After it, the hero keeps its usual pages: Next game, Season (the schedule tiles) and Tale of the tape, so four pages on deadline day. After 4 PM it shows the final count.', 'tdB', ''] };
R['trade-deadline'] = { id: 'trade-deadline', v: 2, ready: true, name: 'Trade deadline day', target: 'home.js homeHero() page 1 · Trade Deadline moment',
  changes: ['Your note on v1 (picked B): "If we add a component to the hero, which is nice, for a given moment like the trade deadline, we should still feature the next upcoming game and the schedule."',
    'v2 keeps B\'s deadline page and adds it in front instead of replacing Next game. The Home section (A) is gone. The same rule is now built into bye week, playoff race and cut-down.',
    'Your ask: "can we include a \'trade deadline\' part of the season so i can see what that\'s like?"',
    'New in the time machine (In season › Trade Deadline): Tue, Nov 4 2025 at 3:30 PM ET, 30 minutes before the real 2025 deadline. Standings, scores and records are the real 2025 Week 9 ones (Chiefs 5-4, Commanders 3-6).',
    'Every deal is real, from the league transaction wire: 13 in the two weeks up to the deadline (Sauce Gardner to IND, Quinnen Williams and Logan Wilson to DAL, Jakobi Meyers to JAX, Rashid Shaheed to SEA, Jaire Alexander to PHI and more). Neither the Chiefs nor the Commanders made one.',
    ...Object.entries(TDL).map(([k, x]) => `${k.toUpperCase()}, ${x[0]}: ${x[1]}`),
    'A dedicated deadline tracker page isn\'t drawn; "All moves" opens Transactions for now.'],
  options: Object.entries(TDL).map(([k, x]) => ({ k, name: x[0], note: '' })),
  current: () => V('As the app draws it', '#/ · Trade Deadline · Chiefs', PH(AS9('', '', 'deadline'))),
  proposed: k => V(TDL[k][0], '#/ · Trade Deadline · Chiefs, Commanders', ROW9([12, 28].map(t => SH9(t === 12 ? 'Chiefs' : 'Commanders', AS9('', '&pv=' + TDL[k][2] + TDL[k][3], 'deadline', t))).join(''))) };

/* season and offseason states (the user's ask, after the trade deadline: "are there other states of the season / offseason that we should consider?", then "i like your suggestions") */
const ASK = 'Your ask: "are there other states of the season / offseason that we should consider?" and then "i like your suggestions".';
const SWIPE = 'Each phone is the real Home at that moment; swipe the hero to see its pages.';
const stateCard = (id, name, target, moment, other, intro, OPTS, v = 1) => {
  R[id] = { id, v, ready: true, name, target,
    changes: [ASK, ...intro, ...Object.entries(OPTS).map(([k, x]) => `${k.toUpperCase()}, ${x[0]}: ${x[1]}`), SWIPE],
    options: Object.entries(OPTS).map(([k, x]) => ({ k, name: x[0], note: '' })),
    current: () => V('As the app draws it', `#/ · ${name} · Chiefs`, PH(AS9('', '', moment, 12))),
    proposed: k => V(OPTS[k][0], `#/ · ${name} · Chiefs, ${other[1]}`, ROW9([[12, 'Chiefs'], other].map(([t, n]) => SH9(n, AS9('', '&pv=' + OPTS[k][2], moment, t))).join(''))) };
};
stateCard('season-bye', 'Bye week', 'home.js statePages() · Bye Week moment', 'bye', [29, 'Panthers'],
  ['New in the time machine (In season › Bye Week): Sun, Oct 11 2026 at 12:30 PM ET, Week 5. The Chiefs and Panthers are the two teams off that week. Today the hero just shows the next game, as if nothing were different.'],
  { a: ['Back next week', 'Page 1 says it\'s your bye: "Week 5 · Bye week", then the countdown to your next game with both logos, the number of games around the league today and a Scores button. Pages 2 and 3 stay Season and Tale of the tape.', 'byeA'],
    b: ['Division watch', 'Page 1 turns to your division rivals\' games this week (time, live, or the result), with when you\'re back at the bottom. Pages 2 and 3 stay.', 'byeB'] });
stateCard('season-race', 'Playoff race', 'home.js statePages() · Playoff Race moment', 'race', [33, 'Ravens'],
  ['New in the time machine (In season › Playoff Race): Sun, Dec 28 2025 at 11:30 AM ET, Week 17, before the 1 PM games (Christmas and Saturday games already played). Real 2025 standings: the Chiefs are 6-10 and out; the Ravens are 8-8 with one game left, out of the wild cards but still alive for the AFC North behind the 9-6 Steelers.',
    'Clinched and Eliminated are plain win-count math (ties ignored): out when your best possible total can\'t reach the 7th seed\'s wins today or your division leader\'s; clinched when no team 8th or lower can catch you. Shown from Week 15 on.'],
  { a: ['Your status', 'Page 1 is your status word big (Clinched, In the hunt, Eliminated) with games left, your seed today on the right, then how far you are from the cut line and who\'s 7th.', 'raceA'],
    b: ['Standings slice', 'Page 1 is your conference standings around you: five rows with seed and record, your row lit white, a line above 8th where the playoffs stop, and Clinched / Out tags.', 'raceB'] });
stateCard('season-over', 'Season over', 'home.js statePages() · Season Over moment', 'sbover', [17, 'Patriots'],
  ['Your note on v1 (picked B): "maybe less negative... "missed the playoffs" or "lost the super bowl" sucks to see"',
    'v2 is B with every season framed by what it reached: Super Bowl champions, AFC/NFC champions (a Super Bowl team that lost), Conference Championship run, Playoff team, or "2025 in the books" with the record. The line under it is your best win of the season. The Super Bowl page drops the W between the scores, and under the record a losing streak ("Lost 6 straight") gives way to the conference place. Chiefs (no playoffs) and Patriots (lost Super Bowl LX) shown.',
    'New in the time machine (Offseason › Season Over): Mon, Feb 9 2026 at 9 AM ET, the morning after Super Bowl LX (Seahawks 29, Patriots 13). Today the hero still shows the season pages with nothing left to play.'],
  { b: ['Your season first', 'Page 1 your season, framed by what it reached, big, with the record and seed above and your best win below; page 2 the Super Bowl final; page 3 what\'s next (countdown to free agency, then the draft).', 'overB'] }, 2);
stateCard('season-schedule', 'Schedule release', 'home.js statePages() · Schedule Release moment', 'sched', [28, 'Commanders'],
  ['New in the time machine (Offseason › Schedule Release): Wed, May 13 2026 at 8:30 PM ET, just after all 272 games came out (the app\'s release time). Today the hero shows the Week 1 opener and last season. The pages below show for three days after the release.',
    'Prime time is a kickoff at 7 PM ET or later. Toughest stretch is the three games in a row whose opponents had the best 2025 records.'],
  { a: ['Opener, slate, stretch', 'Page 1 the Week 1 opener with a New tag and the countdown; page 2 the slate as three numbers (prime-time games, home games, the bye week); page 3 the toughest stretch as three tiles with each opponent\'s 2025 record.', 'schA'],
    b: ['All 18 weeks', 'Page 1 the whole season at a glance: 18 squares with each opponent\'s logo, prime time outlined, away games darker, the bye marked; page 2 the opener; page 3 the slate.', 'schB'] });
stateCard('season-cuts', 'Roster cut-down', 'home.js statePages() · Cut-down Weekend moment', 'cuts', [28, 'Commanders'],
  ['New in the time machine (Offseason › Cut-down Weekend): Sun, Aug 30 2026 at 4 PM ET, the day after the last preseason game and the busiest cut day in the transaction wire. Today the hero shows the Week 1 opener and last season.',
    'Data gap: the league\'s transaction wire only carries part of the cuts (the Chiefs show a handful of moves that week, not their full trim to 53), so there\'s no true 53-man count to show. The pages count what the wire has.'],
  { a: ['Cut tracker', 'Page 1 the cut moves league-wide and your team\'s, big, with a Your roster button; page 2 your team\'s two latest moves; page 3 the Week 1 opener.', 'cutA'],
    b: ['Your moves first', 'Page 1 your team\'s latest moves; page 2 the Week 1 opener. No league count.', 'cutB'] });
/* ------------------------------------------------------------------ the Home hero's score line, like the other matchup banners */
const HMX = {
  a: ['Like the game page', 'Each team at its edge as on the Next game page (logo over tricode), its score big beside it, and the status in the centre: Final, or Live and the clock. The losing score and tricode dim, as on the game page header. Your team stays on the left.', 'hmA'],
  b: ['Today\'s line, status in the centre', 'The current one-row layout (logo, tricode, score each side) with the lone letter replaced by the status in the centre, and the losing score and tricode dimmed.', 'hmB'],
  c: ['Away left, home right', 'A\'s layout, but the teams sit away on the left and home on the right, the way the game page, Watch and Scores do it, before and after kickoff.', 'hmC'],
};
const HMS = [['Final, a win', '', 'ts=2026-10-05T14:00:00Z', '12'], ['Final, a loss', '', 'ts=2025-09-15T14:00:00Z', '12'], ['Live', '', 'ts=2026-10-04T22:10:00Z', '12'], ['Before kickoff', '', 'now', '12'], ['Commanders, live', '', 'gameday', '28']];
const hmPh = pv => ROW9(HMS.map(([t, x, m, tid]) => SH9(t, m.startsWith('ts=') ? AS9('', (pv ? '&pv=' + pv : '') + '&' + m, null, tid) : AS9('', pv ? '&pv=' + pv : '', m, tid))).join(''));
R['hero-matchup'] = { id: 'hero-matchup', v: 1, ready: true, name: 'Home hero: the score line', target: 'home.js homeHero() page 1 · statePages() Super Bowl final',
  changes: ['Your note: "this design is different than what we do on other matchup banner, particularly the L in the center is a bit weird. can you work on this and any other matchup designs in the home page hero?"',
    'The other matchup banners (the game page header, Watch, the Next game page) put the status between the teams (Final, or Live and the clock) and dim the losing score and tricode. None puts a W or L between the scores. Every option here does the same; the eyebrow now carries the week and network instead of repeating Final.',
    'The line under a final no longer leads with Win or Loss: your record, your division place and your next game.',
    'The same treatment goes on the Super Bowl final page in Season over (winner and loser, Final in the centre).',
    ...Object.entries(HMX).map(([k, x]) => `${k.toUpperCase()}, ${x[0]}: ${x[1]}`),
    'Each phone is the real Home: the Chiefs after the Week 4 win at Las Vegas (2026), after the Week 2 loss to Philadelphia (2025; the Week 9 loss in your screenshot sits behind the deadline page on deadline day), live in the Week 4 game, before the Chargers game, and the Commanders live on Game Day.'],
  options: Object.entries(HMX).map(([k, x]) => ({ k, name: x[0], note: '' })),
  current: () => V('As the app draws it', '#/ · Home hero page 1', hmPh('')),
  proposed: k => V(HMX[k][0], '#/ · Home hero page 1', hmPh(HMX[k][2])) };
const PBX = {
  a: ['46px, edge to edge', 'The game page bug\'s own insides at the same sizes: 26px logo discs, 17px tricodes, 24px scores. In the middle, just the Live clock, Final or the kickoff time; no down and distance. 46px tall (the bug is 52px), edge to edge under the status bar, like the Home pin today.', 'pb4a'],
};
// each state: the Home phone scrolled so the bar is pinned, beside the game page for the same game at the same moment, scrolled so its score bug is pinned
const PBS = [['Live · Chiefs', null, '12', '&ts=2026-10-04T22:10:00Z', '401872976'], ['Live · Commanders', 'gameday', '28', '', '401872988']];
const pbPh = pv => PBS.map(([t, m, tid, ts, gid]) => `<div style="margin-bottom:22px"><div style="font:700 13px/1.2 var(--sans);margin-bottom:8px">${t}</div>${ROW9(
  SH9('Home · pinned bar', PH(AS9('', (pv ? '&pv=' + pv : '') + ts + AT9('.hm-sheet .sec'), m, tid))) +
  (gid ? SH9('Game page · pinned score bug (52px)', PH(AS9('game/' + gid, ts + AT9('.gc-body > :last-child'), m, tid))) : SH9('Game page', '<div style="width:220px;font:500 12px/1.4 var(--sans);opacity:.7">Before kickoff the game page has no pinned score bug, so there is nothing to set beside it.</div>')))}</div>`).join('');
R['pinbar-away'] = { id: 'pinbar-away', v: 5, ready: true, name: 'Home pinned bar: away first', target: 'home.js hhMini · .hh-mini',
  changes: ['Your note on v4 (A picked): "we don\'t need down and distance"',
    'A, with the down and distance taken out; nothing else changed.',
    ...Object.entries(PBX).map(([k, x]) => `${k.toUpperCase()}, ${x[0]}: ${x[1]}`),
    'Each shows the real Home with the bar pinned, beside the game page with its bug pinned, same game, same moment, same scale: the Chiefs live at Las Vegas, and the Commanders live on Game Day.'],
  options: Object.entries(PBX).map(([k, x]) => ({ k, name: x[0], note: '' })),
  current: () => V('As the app draws it', '#/ · scrolled', pbPh('')),
  proposed: k => V(PBX[k][0], '#/ · scrolled · beside the game page', pbPh(PBX[k][2])) };
})();
