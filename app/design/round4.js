/* Approvals round 4: atoms. The 17 approved on 2026-10-30 are built (atoms.css, listed in BUILT); the two left are revised. One card per atom. "Current" shows every version of the atom the app draws today,
   labelled with where it lives; "Proposed" is one atom built only from the locked tokens (type roles, status colours,
   team colours, controls option A, .badge, the NFL+ logo). Registered with DSApprovals.add(4, [...]). */
(function () {
'use strict';
const { icon, fmt, store } = App, UI = App.UI, Dt = App.data;
const { S, esc, team, none, mark, C } = DSApprovals.h;

/* ------------------------------------------------------------------ helpers */
/** one labelled specimen: what it is, where it lives, then the real markup */
const V = (label, where, inner) => `<div class="r4-v"><div class="r4-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r4-vb">${inner}</div></div>`;
const tm = () => C().tm;
const opp = () => team(C().oppId) || team(C().gh.id === tm().id ? C().ga.id : C().gh.id);
const prim = t => (App.teamRoles(t) || {}).primary || t.color;
const surf = (t, inner, cls = '') => `<div class="tsurf r4-surf ${cls}" style="${App.teamVars(t)}">${inner}</div>`;
const lg = (t, cls) => S(UI.logo(t.id, cls));
const light = t => `<img class="logo" src="${t.logoDark || t.logo}" alt="">`;
const ini = n => n.split(' ').map(w => w[0]).slice(0, 2).join('');
const QB = () => { const r = Dt.roster(tm().id) || []; return r.find(p => p.pos === 'QB') || r[0] || {}; };
const pid = p => p.id || p.pid;
/** draw something with a different plan for a moment (lock notes only show when you lack the tier) */
const asSub = (sub, f) => { const was = store.p.sub; store.p.sub = sub; try { return f(); } finally { store.p.sub = was; } };

/* ------------------------------------------------------------------ the cards */
const CARDS = [
  { id: 'a-headshot', v: 2, name: 'Player headshot', target: 'UI.hs(player, size) · .hs',
    ctx: ['team/__TEAM__?tab=roster', '.hs'],
    changes: ['From your note ("the PM sits a little high"): the initials are now centred on the disc by the font\'s real cap height, not its line box.', 'You approved Display italic for initials (text roles), so they are Display C italic caps here. Display caps sit a little low in their line box, so they get .12em of bottom padding to land in the optical centre; the old Sans version sat high for the opposite reason.', 'Four sizes: S 32, M 44, L 64, XL 104, on the team\'s own primary. The initials scale with the disc (40% of its size).'],
    current: () => { const p = QB(); return V('Photo', 'sm 32 · 44 · lg 64 · xl 104', `<div class="r4-row end">${['sm', '', 'lg', 'xl'].map(c => S(UI.hs(pid(p), c))).join('')}</div>`)
      + V('No photo, as the app draws it', '.hs-fallback', `<div class="r4-row end">${[32, 44, 64, 104].map(n => `<div class="hs hs-fallback" style="width:${n}px;height:${n}px;background:${prim(tm())}">${ini(p.n || 'Pat Mahomes')}</div>`).join('')}</div>`); },
    proposed: () => { const p = QB(); return V('Photo on the team colour', 'S 32 · M 44 · L 64 · XL 104', `<div class="r4-row end">${[32, 44, 64, 104].map(n => `<span class="r4-hs" style="width:${n}px;height:${n}px;background:${prim(tm())}"><img src="${Dt.headshot(pid(p))}" alt="" onerror="this.remove()"></span>`).join('')}</div>`)
      + V('No photo', 'Display C italic caps, optically centred', `<div class="r4-row end">${[32, 44, 64, 104].map(n => `<span class="r4-hs r4-ini" style="width:${n}px;height:${n}px;background:${prim(tm())};font-size:${Math.round(n * .4)}px"><b>${ini(p.n || 'Pat Mahomes')}</b></span>`).join('')}</div>`)
      + V('Centring guide', 'the cap height sits on the disc\'s middle line', `<div class="r4-row end"><span class="r4-hs r4-ini r4-guide" style="width:104px;height:104px;background:${prim(tm())};font-size:42px"><b>${ini(p.n || 'Pat Mahomes')}</b></span></div>`); } },

  { id: 'a-reactions', v: 2, name: 'Reactions', target: 'game React tab (RX) · watch party (EMO) · squad chat (SQ_EMO)',
    ctx: ['game/__LIVE__?tab=react', '.rx-tally'],
    changes: ['From your note ("I like the original reaction pills better"): the original round pills are back exactly as they are, same size, shape, spacing and count style. The squared icon chips are gone.', 'One open question, and it is yours: the originals use emoji, and your house rule says no emoji. Option A keeps the pills exactly as they are, emoji and all (reactions become the one place emoji are allowed). Option B keeps the same pills with the app\'s own icons inside instead.', 'Either way the same set is used on the React tab, in the watch party and in squad chat, so a reaction means the same thing everywhere.'],
    options: [{ k: 'a', name: 'Original pills, emoji', note: 'Unchanged. Reactions are the one exception to the no-emoji rule; everywhere else stays emoji-free.' }, { k: 'b', name: 'Original pills, icons', note: 'The same round pills and counts, with the app\'s own line icons instead of emoji, so the no-emoji rule has no exception.' }],
    current: () => V('Game React tab', 'RX · .rx-chip', `<div class="rx-tally r4-row wrap">${RX.map(([e], i) => `<span class="rx-chip ${i ? '' : 'on'}">${e} <b class="num">${fmt.n(RXN[i])}</b></span>`).join('')}</div>`)
      + V('Watch party · squad chat', 'EMO · SQ_EMO', `<div class="r4-row wrap r4-emo">${['&#x1F525;', '&#x1F64C;', '&#x1F44F;', '&#x1F631;', '&#x1F624;', '&#x1F629;', '&#x1F602;', '&#x1F3C8;'].map(e => `<span>${e}</span>`).join('')}</div>`),
    proposed: k => V(k === 'a' ? 'The original pills' : 'The original pills, icons inside', 'one set in all three places', `<div class="rx-tally r4-row wrap">${RX.map(([e, ic, l], i) => `<span class="rx-chip ${i ? '' : 'on'}" aria-label="${l}">${k === 'a' ? e : `<span class="r4-rx-ic">${S(icon(ic, 'sm'))}</span>`} <b class="num">${fmt.n(RXN[i])}</b></span>`).join('')}</div>`)
      + V('Names', 'shown on long-press', `<p class="t-meta">${RX.map(x => x[2]).join(' · ')}</p>`) },
];
/* the reaction set: emoji, the matching app icon, and its name */
const RX = [['&#x1F525;', 'fire', 'Fire'], ['&#x1F64C;', 'zap', 'Hype'], ['&#x1F44F;', 'thumbsup', 'Respect'], ['&#x1F4AA;', 'medal', 'Strong'], ['&#x1F631;', 'eye', 'Shook'], ['&#x1F92F;', 'sparkle', 'Mind blown']];
const RXN = [1240, 860, 512, 300, 210, 96];

// all built (2026-10-31); kept for the record, not registered
// DSApprovals.add(4, CARDS.map(c => ({ tier: 'Atoms', ...c })));
})();
