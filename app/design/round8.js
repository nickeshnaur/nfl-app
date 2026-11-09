/* Approvals round 8: cards keyed by id in window.R5_CARDS, queued by round5.js. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const PH = inner => `<div class="r6-ph">${inner}</div>`;
const phone = (route, extra = '') => DSApprovals.h.phone(route, extra);
const PIN = '&at=' + encodeURIComponent('.hm-sheet .sec');
const WAS = (route, extra) => phone(route, extra).replace(/team=\d+/, 'team=28');   // the Commanders, the longest name
const ROW = inner => `<div style="display:flex;flex-wrap:wrap;gap:16px 20px">${inner}</div>`;
const SH = (t, inner) => `<div style="display:inline-flex;flex-direction:column;gap:6px"><span style="font:600 12px/1.2 var(--sans)">${t}</span>${inner}</div>`;
const N8 = { a: 'Two lines under the name' };
R['home-hero-height'] = { id: 'home-hero-height', v: 9, ready: true, name: 'Home top hero: height', target: 'home.js fanHeader · .fx.hm-stage · .hh-mini',
  changes: ['Your note on v8: "let\'s just make it like this: 1st in AFC West / Won 4 straight · 4th in NFC East / 13th in the NFC"',
    'Under the name and record, exactly two lines: the division place, then the streak when it is 2 or more games, otherwise the conference place. The seed line is gone.',
    'Everything else is v8: the text still stops before the helmet (rechecked on all 32 teams), the top stays 280 px and the pages 136 px.',
    'Built 2026-11-09: this is now the Home hero for every team.'],
  options: ['a'].map(k => ({ k, name: N8[k], note: '' })),
  current: () => V('As the app draws it', '#/ (Home, game day)', PH(phone(''))),
  proposed: k => V(N8[k], '#/ (Home, game day) · Chiefs and Commanders, and scrolled', ROW(
    SH('Chiefs', phone('')) + SH('Chiefs · scrolled', phone('', PIN)) + SH('Commanders (live)', WAS('')) + SH('Commanders · scrolled', WAS('', PIN)))) };

})();
