/* Approvals round 11b: the game page hero (before kickoff; live and final). Cards keyed by id in window.R5_CARDS, queued by round5.js. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const phone = (r, x) => DSApprovals.h.phone(r, x || '');
const SH = (t, inner) => `<div style="display:inline-flex;flex-direction:column;gap:6px"><span style="font:600 12px/1.2 var(--sans)">${t}</span>${inner}</div>`;
const ROW = inner => `<div style="display:flex;flex-wrap:wrap;gap:16px 20px">${inner}</div>`;
// moment / team swaps on the phone URL (same as round 9's AS9)
const at = (route, extra, moment) => { let h = phone(route, extra); if (moment) h = h.replace(/moment=\w+/, 'moment=' + moment); return h.replace(/team=\d+/, 'team=12'); };
const PRE = pv => SH('Chargers at Chiefs · before kickoff', at('game/401873006?tab=preview', pv ? '&pv=' + pv : '', 'gameday'));
const LIVE = pv => SH('Giants at Commanders · live', at('game/401872988', pv ? '&pv=' + pv : '', 'gameday'));
const FIN = pv => SH('Chiefs at Raiders · final', at('game/401872976', (pv ? '&pv=' + pv : '') + '&ts=2026-10-05T14:00:00Z'));

const PRE3 = pv => SH('Before kickoff · Chargers at Chiefs', at('game/401873006?tab=preview', pv ? '&pv=' + pv : '', 'gameday'));
R['pregame-hero'] = { id: 'pregame-hero', v: 4, ready: true, name: 'Game page hero: before kickoff', target: 'game.js hero() · pre',
  changes: ['Your note on v3 (A picked): "this with a countdown"',
    'A, tale of the tape (black, each team\'s colour glowing in from its own edge, helmet, tricode and record at each edge), with the countdown as the centre piece: days, hours, minutes in Display (hours, minutes, seconds on game day). The day, time and channel sit under it.'],
  options: [{ k: 'a', name: 'Tale of the tape + countdown', note: '' }],
  current: () => V('As the app draws it', 'game page · Preview tab', PRE3('')),
  proposed: k => V('Tale of the tape + countdown', 'game page · Preview tab', PRE3('pgD')) };

R['game-hero-live'] = { id: 'game-hero-live', v: 3, ready: true, name: 'Game page hero: before, live and final as one set', target: 'game.js hero() · pre, live, post',
  changes: ['Your note on v2 (A picked): "the helmets are too small. make them larger and bleed off the page"',
    'Helmets about 1.6 times bigger, running off the left and right screen edges (cropped at the edge), in all three states so the set still matches. Tricodes a step bigger to hold their own beside them.',
    'Everything else as v2: black with each team\'s colour glowing in from its edge, tricode and record at each edge, the centre piece changing by state (countdown, Live and score, Final and score).',
    'The before-kickoff hero you approved is built today with the smaller helmets; if you approve this, it gets the same bigger helmets.'],
  options: [{ k: 'a', name: 'One set, helmets bleeding off the edges', note: '' }],
  current: () => V('As the app draws it', 'game page · three states', ROW(PRE3('') + LIVE('') + FIN(''))),
  proposed: k => V('One set, helmets bleeding off the edges', 'game page · three states', ROW(PRE3('hb') + LIVE('ghC,hb') + FIN('ghC,hb'))) };
})();
