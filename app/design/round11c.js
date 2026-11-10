/* Approvals round 11c: a light pass over You, Scores and News. Cards keyed by id in window.R5_CARDS, queued by round5.js. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const phone = (r, x) => DSApprovals.h.phone(r, x || '');
const SH = (t, inner) => `<div style="display:inline-flex;flex-direction:column;gap:6px"><span style="font:600 12px/1.2 var(--sans)">${t}</span>${inner}</div>`;
const AT = sel => '&at=' + encodeURIComponent(sel);
const NOTE = 'You asked for a pass over the screens that haven\'t had a round since the icon and status bar changes.';

R['scores-pass'] = { id: 'scores-pass', v: 1, ready: true, name: 'Scores: tidy pass', target: 'scores.js · .sc-week-head · .sc-tv · .gc-foot',
  changes: [NOTE,
    '"Week 5" is set like every other section title: Display, all caps, italic.',
    'One way to watch per card: the square TV button in the top corner goes; the network in the footer ("CBS ›") is the tap for where to watch.',
    'The footer\'s bare "PIT 98%" now says what it is: "PIT 98% win prob."'],
  options: [{ k: 'a', name: 'Tidied', note: '' }],
  current: () => V('As the app draws it', 'Scores', SH('Scores', phone('scores'))),
  proposed: k => V('Tidied', 'Scores', SH('Scores', phone('scores', '&pv=scoresP'))) };

R['news-pass'] = { id: 'news-pass', v: 1, ready: true, name: 'News: tidy pass', target: 'home.js News route · rankedNews · .nw-thumb',
  changes: [NOTE,
    'Top runs newest first. Today it ranks by your teams first, so 5- and 6-day-old pieces sat above stories from 3 hours ago.',
    'The list splits under two small headers: Latest (the last 24 hours) and Earlier this week.',
    'A story without a photo shows the NFL shield on navy instead of an empty grey box.'],
  options: [{ k: 'a', name: 'Newest first', note: '' }],
  current: () => V('As the app draws it', 'News · Top', SH('News', phone('news'))),
  proposed: k => V('Newest first', 'News · Top', SH('News', phone('news', '&pv=newsP'))) };

/* round 11c, batch 2: Watch, Teams, Player */
R['watch-pass'] = { id: 'watch-pass', v: 1, ready: true, name: 'Watch: tidy pass', target: 'watch.js hero · .w-sc shortcuts',
  changes: [NOTE,
    'The hero\'s icon-only button gets its name: "Gamecast" (it was a square with the scores icon, easy to miss what it does). To fit three named buttons at phone width, Listen and Gamecast drop their icons.',
    'The shortcut row drops "Where to watch": the hero\'s Where it\'s on button and the Live & up next link already go there. The row starts with RedZone.'],
  options: [{ k: 'a', name: 'Labelled, no duplicate', note: '' }],
  current: () => V('As the app draws it', 'Watch', SH('Watch', phone('watch'))),
  proposed: k => V('Labelled, no duplicate', 'Watch', SH('Watch', phone('watch', '&pv=watchP'))) };
R['teams-pass'] = { id: 'teams-pass', v: 1, ready: true, name: 'Team page: tidy pass', target: 'teams.js leaders() · prCard()',
  changes: [NOTE,
    '"2026 leaders" becomes a section title (Display, all caps, italic) like Games, Latest and Videos above it, instead of a small title inside the card.',
    'The power ranking card stops saying the rank twice ("2" and "2nd in the NFL"): the big 2, then "Power ranking" with the move, then "Same as last week · 4-0".'],
  options: [{ k: 'a', name: 'Consistent titles', note: '' }],
  current: () => V('As the app draws it', 'Teams · Chiefs overview', SH('Chiefs', phone('team/12', AT('.ldr!c')))),
  proposed: k => V('Consistent titles', 'Teams · Chiefs overview', SH('Chiefs', phone('team/12', '&pv=teamsP' + AT('.ldr!c')))) };
R['player-pass'] = { id: 'player-pass', v: 1, ready: true, name: 'Player page: tidy pass', target: 'player.js hero · page foot',
  changes: [NOTE,
    'The "Compare Mahomes with another player" button at the foot of Overview goes: Compare already sits in the hero next to Follow and Alerts. (Everything else on the page held up against the built system.)'],
  options: [{ k: 'a', name: 'No duplicate', note: '' }],
  current: () => V('As the app draws it', 'Patrick Mahomes · foot of Overview', SH('Mahomes', phone('player/3139477', AT('.stack.on .page:last-child .nw-row!c')))),
  proposed: k => V('No duplicate', 'Patrick Mahomes · foot of Overview', SH('Mahomes', phone('player/3139477', '&pv=playerP' + AT('.stack.on .page:last-child .nw-row!c')))) };
})();
