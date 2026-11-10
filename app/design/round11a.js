/* Approvals round 11a: one family for every button, keyed by id in window.R5_CARDS, queued by round5.js. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const phone = (r, x) => DSApprovals.h.phone(r, x || '');
const SH = (t, inner) => `<div style="display:inline-flex;flex-direction:column;gap:6px"><span style="font:600 12px/1.2 var(--sans)">${t}</span>${inner}</div>`;
const AT = sel => '&at=' + encodeURIComponent(sel);
const ic = k => { try { return String(App.icon(k, 'sm')); } catch (e) { return ''; } };

/* every control the app draws, in one strip; the wrapper class (btn-a/b/c) switches the option on, none = today */
const strip = cls => `<div class="r11a-strip ${cls}">
  <div class="r11a-k">Large · onboarding, sheets</div>
  <div class="r11a-row"><button class="btn l primary">Get started</button><button class="btn l ghost">Look around first</button></div>
  <div class="r11a-k">Medium · the default</div>
  <div class="r11a-row"><button class="btn primary">${ic('play')}Watch now</button><button class="btn">${ic('headphones')}Listen</button><button class="btn ghost">Details</button><button class="btn ink">Pick for me</button><button class="btn cta">${ic('bolt')}RedZone</button><button class="btn plus">Try NFL+</button></div>
  <div class="r11a-k">Small · inline, cards</div>
  <div class="r11a-row"><button class="btn sm primary">${ic('plus')}Follow</button><button class="btn sm ghost">${ic('share')}Share</button><button class="btn xs">Edit</button><button class="btn sm sq ghost">${ic('dots')}</button></div>
  <div class="r11a-k">The Display button (Mini games)</div>
  <div class="r11a-row"><div class="r11a-mg"><span class="mg-btn">Play now</span></div></div>
  <div class="r11a-k">On team colour</div>
  <div class="r11a-tm" style="background:linear-gradient(110deg,#E31837,#a3001b)"><button class="btn white">${ic('star')}Your team</button><button class="btn hm-glass">${ic('bag')}Shop</button><button class="btn sm hm-glass">Tickets</button></div>
  <div class="r11a-k">Chips · filters</div>
  <div class="r11a-row"><button class="chip on">All</button><button class="chip">AFC</button><button class="chip">NFC</button><button class="chip">Live now</button></div>
  <div class="r11a-k">Segments · pill tabs</div>
  <div class="seg" style="margin:0"><button class="on">Division</button><button>Conference</button><button>League</button></div>
  <div class="r11a-row"><span class="pill-tabs"><button class="on">Overview</button><button>Box score</button></span></div>
</div>`;

const OPT = {
  a: ['Display italic actions', 'btn-d', 'btnD', 'B as first drawn. Every action button, PLAY NOW included, in All-Pro Display, ALL CAPS ITALIC, like the screen tabs and page titles. Chips, segments and pill tabs stay All-Pro Sans bold, sentence case. Heights 44 · 40 · 32px, corners 8 · 6px.'],
  b: ['Display upright actions', 'btn-e', 'btnE', 'The same, in All-Pro Display ALL CAPS but upright, no italics. This would be the one exception to the rule that Display is always italic: picking it changes that rule for buttons (titles, scores and tabs stay italic). Chips, segments and pill tabs stay Sans sentence case.'],
};
R['btn-family'] = { id: 'btn-family', v: 3, ready: true, name: 'Buttons: one family', target: '.btn · .mg-btn · .chip · .seg · .pill-tabs (forward.css Controls)',
  changes: [
    'Your note on v2: "wait i thought i selected teh all pro display?"',
    'Back to All-Pro Display for every action button. Your v1 note also said no italics, and Display is only ever drawn italic, so here are both: A in Display italic (as B was first drawn), B in Display upright.',
    'Segmented controls: yes, they stay. They\'re used today on Scores (Scores / Standings / Stats, Division / Conference / League, AFC / NFC), Stats (Players / Teams, Offense / Defense / Advanced, This week / Season), the player page (season / Career), Teams, Watch, the offseason pages (Top deals / Teams / Positions / Expiring), Community and the NFL+ plans (Monthly / Yearly). They stay Sans bold, sentence case, and never change font between on and off.',
    ...Object.values(OPT).map(([n, , , d], i) => `${"AB"[i]}, ${n}: ${d}`),
    'It shows every control in one strip, then the real Teams screen and the Mini games rail on Home, Chiefs, 393px.'],
  options: Object.entries(OPT).map(([k, x]) => ({ k, name: x[0], note: '' })),
  current: () => V('As the app draws it', 'Sans bold 40 · 32px, PLAY NOW in Display', `<div class="r11a-cols">${strip('')}${SH('Teams', phone('teams'))}${SH('Home · Mini games', phone('', AT('.mg-rail!c')))}</div>`),
  proposed: k => { const [n, cls, pv] = OPT[k];
    return V(n, 'every control · Teams · Home', `<div class="r11a-cols">${strip(cls)}${SH('Teams', phone('teams', '&pv=' + pv))}${SH('Home · Mini games', phone('', '&pv=' + pv + AT('.mg-rail!c')))}</div>`); } };
})();
