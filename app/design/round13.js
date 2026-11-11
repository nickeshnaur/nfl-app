/* Approvals round 13: game video scrolls away, one side gutter, no cut-off text, live data, Time machine in Search.
   Cards keyed by id in window.R5_CARDS, queued by round5.js. Crops are stills (_build/stills.mjs) in app/design/shots/r13/.
   Preview flags: &pv=vidscroll, gutter, noclip (app/css/pv13.css), searchtm (home.js searchIdle). */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const IMG = (name, label, w = 393) => `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:18px">${label ? `<span style="font:600 12px/1.2 var(--sans)">${label}</span>` : ''}<img src="app/design/shots/r13/${name}.png" alt="${label || name}" style="display:block;width:${w}px;max-width:100%;border-radius:10px;background:#000"></div>`;
const PH = (name, label) => IMG(name, label, 300);
const pair = (rows, tag) => rows.map(([n, label, w]) => IMG(`${n}-${tag}`, label, w || 393)).join('');

R['gc-video-scroll'] = { id: 'gc-video-scroll', v: 1, ready: true, name: 'Game page: video scrolls away', target: 'game.css · .gc-player',
  changes: ['Your note: "on game details, don\'t make the video pin."',
    'The live stream (or the replay) sits at the top of the game page and scrolls up with everything else, instead of staying stuck under the header.',
    'It still only appears on games you can watch: a live game you can stream on NFL+, DAZN or a connected TV provider, or a final game\'s replay with NFL+ Premium.',
    'Picture-in-picture stays: the corner player is still there if you leave the page.'],
  current: () => V('Today: pinned', 'Bears at Packers, live · scrolled down', `<div style="display:flex;gap:16px;flex-wrap:wrap">${PH('vidtop-cur', 'Top of the page')}${PH('vid-cur', 'Scrolled: the video stays')}</div>`),
  proposed: () => V('Scrolls away', 'same game, same scroll', `<div style="display:flex;gap:16px;flex-wrap:wrap">${PH('vidtop-pro', 'Top of the page')}${PH('vid-pro', 'Scrolled: the video has gone up')}</div>`) };

const GUT = [['gut-teams', 'Teams: Leaders card (sits at 32px, double the gutter)'], ['gut-tmnext', 'Teams: Next game card (12px inside)'], ['gut-game', 'Game page: cards (14px inside)'], ['gut-scores', 'Scores: game cards (14px inside)']];
R['side-gutters'] = { id: 'side-gutters', v: 1, ready: true, name: 'One side gutter', target: 'pv13.css → app.css / molecules.css',
  changes: ['Your note: "some components look to be different widths on the app. make sure everything is the same in terms of side padding within the device."',
    'Measured every screen at 393px (Home, Scores, game page, Teams, team page, player, Watch, You, Mini games, Stats, News). Cards sit 16px from the screen edge everywhere except one: the Teams and team page Leaders card, at 32px.',
    'Inside cards the padding drifts: 12px (team page Next game), 14px (game page cards, Scores game cards, team page cards, player cards), 16px (Home cards, Watch, You, Mini games), 18px (game page Catch up).',
    'Proposed: one rule. 16px from the screen edge, 16px inside every card. Rails still start at 16px and run off the right edge. Indented timelines (game page feed) keep their indent.'],
  current: () => V('Today', 'Chiefs · 393px', pair(GUT, 'cur')),
  proposed: () => V('16px out, 16px in', 'Chiefs · 393px', pair(GUT, 'pro')) };

const CLIP = [['clip-scores', 'Scores: game recap headline (360px)', 360], ['clip-news', 'News: headlines stop at 2 lines (360px)', 360], ['clip-watchpod', 'Watch: podcast descriptions'], ['clip-homefilms', 'Home: Watch rail description'], ['clip-sotd', 'Home: Sack leaders name (360px)', 360]];
R['text-clip'] = { id: 'text-clip', v: 1, ready: true, name: 'No cut-off text', target: 'pv13.css → atoms.css / molecules.css',
  changes: ['Your note: "i noticed a few bits where text was cut off."',
    'Found at 393px and 360px: Scores recap headlines cut to one line with "…", News, Home and team page headlines cut at 2 lines, Watch podcast and rail descriptions cut with "…", and long names in Home\'s Sack leaders at 360px.',
    'Proposed: list headlines and one-line descriptions wrap in full; video tile headlines get a third line (the tiles stay the same width); names wrap rather than end in "…".',
    'Checked: the Home hero "Where to watch" button is not cut (that was only the crop on the colour cards).'],
  current: () => V('Today', 'Chiefs', pair(CLIP, 'cur')),
  proposed: () => V('Nothing cut off', 'Chiefs', pair(CLIP, 'pro')) };

R['search-timemachine'] = { id: 'search-timemachine', v: 1, ready: true, name: 'Time machine in Search', target: 'home.js · searchIdle',
  changes: ['Your note: "can we also put time machine in search"',
    'The same Time machine row as on You (clock icon, today\'s date and moment, opens the same sheet) sits at the top of Search, above Recent and Ask anything.',
    'It stays on You as well.'],
  current: () => V('Today', 'Search · Chiefs and Broncos', `<div style="display:flex;gap:16px;flex-wrap:wrap">${PH('srch-cur-kc', 'Chiefs')}${PH('srch-cur-den', 'Broncos')}</div>`),
  proposed: () => V('Time machine at the top', 'Search · Chiefs and Broncos', `<div style="display:flex;gap:16px;flex-wrap:wrap">${PH('srch-pro-kc', 'Chiefs')}${PH('srch-pro-den', 'Broncos')}</div>`) };

})();
