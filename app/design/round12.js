/* Approvals round 12: the team colour pass (white text on the team colour). Cards keyed by id in window.R5_CARDS, queued by round5.js.
   Preview flag: &pv=teamink (core.js whiteOn / teamRoles / teamVars, the hero fabrics in home.js, teams.js, player.js). */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const phone = (r, x) => DSApprovals.h.phone(r, x || '');
const SH = (t, inner) => `<div style="display:inline-flex;flex-direction:column;gap:6px"><span style="font:600 12px/1.2 var(--sans)">${t}</span>${inner}</div>`;
const ROW = inner => `<div style="display:flex;flex-wrap:wrap;gap:16px 20px;align-items:flex-start">${inner}</div>`;

const BRIEF = 'Your note: "just identify each space where white text lives on the team color, then for problematic teams show white text against the color background and then your darker team color proposal where it passes accessibility. for example, the home page jersey texture wave for broncos is a darker shade of their actual team color. it should use the team orange but probably fails accessibility so that would be one example. then i\'ll check on approvals the actual team color vs your proposal for those places."';
// every place white text sits on the team colour (crawled for the Chiefs and the Broncos: Home, team page, Scores, game page before/live/final, Watch, News, You, player page)
const PLACES = [
  ['Home hero', 'the jersey fabric with the team name, record and lines under it (today the fabric shades the colour, and the pages under it use the sheet\'s 700)'],
  ['Home hero pages', 'Next up / the score line / the deadline and race pages under the fabric'],
  ['Home pinned bar', 'the away-to-home blend when you scroll'],
  ['Team picker chip', 'your selected team at the top of Teams'],
  ['Team page hero', 'city, name, record, Your team / Shop / Tickets / Next game'],
  ['Team page tables', 'your team\'s highlighted row and cells in Stats and standings'],
  ['Initials discs', 'player and coach initials when there is no headshot (team page, You)'],
  ['Team video and show tiles', 'Watch and the team page Videos rail'],
  ['You: Official fan card', 'the fan card on You'],
  ['Player page hero', 'number, name and position on the jersey fabric'],
];
const ESPN = { ARI: 22, ATL: 1, BAL: 33, BUF: 2, CAR: 29, CHI: 3, CIN: 4, CLE: 5, DAL: 6, DEN: 7, DET: 8, GB: 9, HOU: 34, IND: 11, JAX: 30, KC: 12, LAC: 24, LAR: 14, LV: 13, MIA: 15, MIN: 16, NE: 17, NO: 18, NYG: 19, NYJ: 20, PHI: 21, PIT: 23, SEA: 26, SF: 25, TB: 27, TEN: 10, WSH: 28 };
const NAME = { ARI: 'Cardinals', ATL: 'Falcons', BAL: 'Ravens', BUF: 'Bills', CAR: 'Panthers', CHI: 'Bears', CIN: 'Bengals', CLE: 'Browns', DAL: 'Cowboys', DEN: 'Broncos', DET: 'Lions', GB: 'Packers', HOU: 'Texans', IND: 'Colts', JAX: 'Jaguars', KC: 'Chiefs', LAC: 'Chargers', LAR: 'Rams', LV: 'Raiders', MIA: 'Dolphins', MIN: 'Vikings', NE: 'Patriots', NO: 'Saints', NYG: 'Giants', NYJ: 'Jets', PHI: 'Eagles', PIT: 'Steelers', SEA: 'Seahawks', SF: '49ers', TB: 'Buccaneers', TEN: 'Titans', WSH: 'Commanders' };
const ratio = c => App.contrast(c, '#ffffff');
const prop = k => { const P = App.PALETTE[k], sh = P.sh || {}; const c = [P.p, sh[700], sh[800]].find(x => x && ratio(x) >= 4.5); return { c: c || sh[800] || P.p, which: c === P.p ? 'primary' : c === sh[700] ? 'shade 700' : c === sh[800] ? 'shade 800' : 'none passes' }; };
const fails = () => Object.keys(ESPN).filter(k => ratio(App.PALETTE[k].p) < 4.5).sort((a, b) => NAME[a].localeCompare(NAME[b]));
const sw = (c, label, n) => `<div style="width:220px;border-radius:12px;padding:14px 16px;background:${c};color:#fff">
  <div style="font:900 italic 26px/1 var(--display);text-transform:uppercase">${n}</div><div style="font:600 14px/1.3 var(--sans);margin-top:6px">Aa · 4-0 · 1st in the AFC</div>
  <div style="font:700 12px/1 var(--stats);margin-top:10px;opacity:.95">${label} ${c.toUpperCase()} · ${ratio(c).toFixed(2)}:1 ${ratio(c) >= 4.5 ? '✓ passes' : '✗ fails 4.5'}</div></div>`;
const list = () => `<ul style="margin:6px 0 0;padding-left:18px;font:500 13px/1.45 var(--sans)">${PLACES.map(([n, d]) => `<li><b>${n}</b>: ${d}</li>`).join('')}</ul>`;
const home = (k, x) => phone('', x || '').replace(/team=\d+/, 'team=' + ESPN[k]);

R['color-pass'] = { id: 'color-pass', v: 1, ready: true, name: 'Team colours: white text pass', target: 'core.js whiteOn · teamRoles · teamVars · hero fabrics',
  changes: [BRIEF,
    'Where white text sits on a team colour: ' + PLACES.map(p => p[0]).join(', ') + ' (' + PLACES.length + ' places).',
    'Rule proposed: white text sits on the team\'s real primary when it passes 4.5:1; otherwise on the first sheet shade that does (700, then 800). Never an invented colour.',
    'Teams that pass keep their primary everywhere, and the Home hero pages move from shade 700 to the real primary. Teams that fail get their own card next.'],
  options: [{ k: 'a', name: 'Primary when it passes, else the sheet shade', note: '' }],
  current: () => V('Every place white text sits on the team colour', 'crawled on the Chiefs and Broncos', list()),
  proposed: k => { const rows = Object.keys(ESPN).sort((a, b) => NAME[a].localeCompare(NAME[b])).map(t => { const P = App.PALETTE[t], r = ratio(P.p), pr = prop(t);
      return `<tr><td style="padding:4px 8px"><b>${NAME[t]}</b></td><td style="padding:4px 8px"><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${P.p};vertical-align:-2px"></span> ${P.p}</td><td style="padding:4px 8px;font-family:var(--stats)">${r.toFixed(2)}</td><td style="padding:4px 8px">${r >= 4.5 ? 'passes' : `<b>fails</b> → ${pr.which} <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${pr.c};vertical-align:-2px"></span> ${pr.c} (${ratio(pr.c).toFixed(2)})`}</td></tr>`; }).join('');
    return V('White on primary, all 32', 'from your Team Colors sheet', `<table style="border-collapse:collapse;font:500 13px/1.3 var(--sans)"><tr style="text-align:left"><th style="padding:4px 8px">Team</th><th style="padding:4px 8px">Primary</th><th style="padding:4px 8px">White :1</th><th style="padding:4px 8px">Result</th></tr>${rows}</table>`); } };

/* v2+: each place as a real cropped component, the app at 393px scrolled to it (always moment=now, dark: the offsets, games and players were measured there); [label, route, &at= selector (or ''), top offset in the 852px frame, crop height] */
const NOTE3 = 'Your note: "i need to see the components that fail with white text and then the version with the proposed new color next to it"';
const qb = tid => { const r = App.data.roster(String(tid)); const p = r.find(x => x.pos === 'QB' && x.st === 'Active') || r[0]; return p && p.id; };
const CROPS = (k, gid) => { const id = ESPN[k], c = h => 426 - h / 2; return [
  ['Home hero', '', '', 0, 310],
  ['Home hero pages', '', '', 296, 230],
  ['Team picker chip', 'teams', '', 72, 62],
  ['Team page hero', 'teams', '', 132, 320],
  ['Team page tables: your row', 'teams', 'tr.me!c', c(120), 120],
  ['Team video tiles (Watch)', 'watch', '.w-pimg.tsurf!c', c(230), 230],
  ['You: Official fan card', 'you', '', 80, 400],
  ['Player page hero', 'player/' + qb(id), '', 70, 230]]; };
const src = (route, x) => (phone(route, x).match(/src="([^"]+)"/) || [])[1];
const LIVE = /[?&]live\b/.test(location.search);  // ?live: draw live iframes (only _build/colorshots.mjs uses this, to capture the stills)
const slug = x => x.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const crop = (label, route, at, top, h, k, pv) => { const u = src(route, (at ? '&at=' + encodeURIComponent(at) : '') + pv).replace(/team=\d+/, 'team=' + ESPN[k]).replace(/moment=[^&]*/, 'moment=now').replace(/theme=[^&]*/, 'theme=dark'),
    name = `${k}-${slug(label)}-${pv.replace('&pv=', '')}`;
  return `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:18px"><span style="font:600 12px/1.2 var(--sans)">${label}</span>
  <div style="width:393px;max-width:100%;height:${h}px;overflow:hidden;border-radius:10px;background:#000">${LIVE ? `<iframe data-shot="${name}" data-top="${top}" data-h="${h}" src="${u}" style="display:block;width:393px;height:852px;border:0;margin-top:-${top}px" title="${label}"></iframe>` : `<img src="app/design/shots/color/${name}.png" alt="${label}" style="display:block;width:393px;height:${h}px">`}</div></div>`; };
const swRow = (c, label, n) => `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:18px"><span style="font:600 12px/1.2 var(--sans)">White text on the colour</span>${sw(c, label, n)}</div>`;
// each team's last played game (App.data.lastGame at moment=now): the pinned score bug only draws once a game has started
const GAME = { CAR: '401872978', CIN: '401872982', CLE: '401872983', DEN: '401872995', LAC: '401872989', MIA: '401872982', TEN: '401872984' };

fails().forEach(k => { const P = App.PALETTE[k], pr = prop(k), n = NAME[k];
  R['color-' + k] = { id: 'color-' + k, v: 3, ready: true, name: n + ': white on team colour', target: 'App.PALETTE.' + k + ' · whiteOn',
    changes: [NOTE3,
      `Each place white text sits on the ${n}' colour, as the real component cropped from the app: on the actual team colour on the left, on the proposed colour on the right, row for row.`,
      `The left column now uses the real primary ${P.p} in every place, including the three jersey heroes and the Home hero pages, which today the app darkens or draws on shade 700.`,
      `White on the primary ${P.p} is ${ratio(P.p).toFixed(2)}:1, under 4.5. Proposal: the sheet's ${pr.which} ${pr.c} at ${ratio(pr.c).toFixed(2)}:1.`,
      'Not shown: the Home pinned bar and the game page pinned score bug (both animate in on scroll, so they do not capture cleanly; same colour treatment as the rows above), initials discs (every player here has a headshot, so none draw) and the team page Videos rail (its team tiles sit off to the right; the same tiles are shown from Watch). Coloured marks with no text on them (bars, edges, logos) keep the primary.'],
    options: [{ k: 'a', name: `${pr.which} ${pr.c}`, note: '' }],
    current: () => V('Actual team colour', `${n} · ${P.p}`, swRow(P.p, 'primary', n) + CROPS(k, GAME[k]).map(x => crop(...x, k, '&pv=teamraw')).join('')),
    proposed: () => V(`White on ${pr.which}`, `${n} · ${pr.c}`, swRow(pr.c, pr.which, n) + CROPS(k, GAME[k]).map(x => crop(...x, k, '&pv=teamink')).join('')) };
});
})();
