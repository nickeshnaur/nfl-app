/* Approvals round 6 (organisms): cards keyed by id in window.R5_CARDS, picked up by round5.js (it queues rounds 5 and 6).
   Drawn one at a time, smallest first, each from the locked molecules: the lockups (app/css/lockups.css), the Live badge,
   the text roles. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const { fmt } = App, UI = App.UI, Dt = App.data;
const { S, esc, none, C } = DSApprovals.h;
const GP = () => App.gameParts;
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const PH = inner => `<div class="r6-ph">${inner}</div>`;
const live = () => C().mLive, post = () => GP().model(C().G.post);
const disc = t => `<span class="r6-disc"><img src="${t.logo}" alt=""></span>`;

/* ------------------------------------------------------------------ score bug */
/** one proposed bug for a game model m, in option k */
function bug(m, k) {
  const { S: Sc, away: A, home: H, st, hide } = m;
  const sc = v => hide ? '–' : v, isLive = st === 'live';
  const lost = (a, b) => Sc.final && a < b ? ' lost' : '';
  const poss = t => isLive && !hide && Sc.poss === t.id ? '<i class="r6-poss" title="Has the ball"></i>' : '';
  const clock = isLive ? `<span class="badge live">${esc(hide ? 'Live' : Sc.label)}</span>` : `<span class="badge">${esc(Sc.label)}</span>`;
  const dd = isLive && !hide && Sc.dd ? `<span class="r6-dd r-down-distance">${esc(Sc.dd)}</span>` : '';
  if (k === 'a') { // v2: one soft blend from the away colour to the home colour, a scrim over it, everything in white on top
    const side = (t, v, o, h) => `<div class="r6a-t${h ? ' h' : ''}${lost(v, o)}">${disc(t)}<b class="lk-tri">${esc(t.abbr)}</b>${poss(t)}<b class="lk-sc">${sc(v)}</b></div>`;
    return `<div class="r6-bug r6a" style="--ca:${App.teamFill(A)};--ch:${App.teamFill(H)}">${side(A, Sc.as, Sc.hs)}<div class="r6-mid">${clock}${dd}</div>${side(H, Sc.hs, Sc.as, true)}</div>`;
  }
  if (k === 'b') { // the surface, two L1 lines with a team edge, status on the right
    const line = (t, v, o) => `<div class="r6b-l${lost(v, o)}" style="--e:${App.teamFill(t)}">${S(UI.logo(t.id, 'sm'))}<b class="lk-tri">${esc(t.abbr)}</b>${poss(t)}<b class="lk-sc">${sc(v)}</b></div>`;
    return `<div class="r6-bug r6b"><div class="r6b-teams">${line(A, Sc.as, Sc.hs)}${line(H, Sc.hs, Sc.as)}</div><div class="r6-mid r">${clock}${dd}</div></div>`;
  }
  // c: the two colours meet on a straight seam, a squared white scoreboard on top of it
  const half = (t, h) => `<div class="r6c-h${h ? ' h' : ''}" style="background:${App.teamFill(t)}">${disc(t)}<b class="lk-tri">${esc(t.abbr)}</b>${poss(t)}</div>`;
  return `<div class="r6-bug r6c">${half(A)}${half(H, true)}<div class="r6c-board"><div class="r6c-sc"><b class="lk-sc${lost(Sc.as, Sc.hs)}">${sc(Sc.as)}</b><i>–</i><b class="lk-sc${lost(Sc.hs, Sc.as)}">${sc(Sc.hs)}</b></div>${clock}</div></div>`;
}
const states = k => [['Live', live()], ['Final', post()]].filter(([, m]) => m && m.st !== 'pre')
  .map(([l, m]) => `<p class="r6-k">${l}</p>${bug(m, k)}`).join('');

R['score-bug'] = { id: 'score-bug', v: 2, ready: true, name: 'Score bug (pins on scroll)', target: 'game.js pinBug() · .gc-pin .pb-in',
  changes: [
    'v2, from your note ("a but make it a soft gradient, maybe the two colors with a scrim on top, and then the stuff in the center shouldn\'t be on white, but the gradient scrim"): option A only. The bar is one soft blend from the away team\'s primary on the left to the home team\'s on the right, both at full strength at their ends, with an even dark scrim over the whole bar (black at 28%) so white text reads on any pair. The middle is no longer a white block: the Live badge and the down and distance sit straight on the scrim, the down in white at 85%. Options B and C are gone.',
    'The first organism, drawn on its own so you can judge one before the rest. It is the bar that pins to the bottom of a game page once the hero scrolls away; tapping it goes back to the top. It is not shown before kickoff.',
    'Today it does not use any approved piece: tricodes are Sans 800 (the tricode role is Display), the clock is Sans bold (the clock role is Stats bold caps), the Live tag is its own 9.5 px label instead of the Live badge, possession is a 7 px yellow dot, and the logos sit in white circles on a near-black bar.',
    'It uses the locked pieces: tricode and score in Display from the L1 lockup, the approved Live badge carrying the clock (a soft badge for Final), down and distance in Sans medium, the loser\'s text at 60% when final. It stays a squared, pressable bar (52 px, 12 px radius).'],
  current: () => { const ms = [live(), post()].filter(m => m && m.st !== 'pre');
    return V('As the app draws it', 'gameParts.pinBug() · Live, then Final', PH(ms.map(m => `<div class="gc-pin show r6-cur">${S(GP().pinBug(m))}</div>`).join('')) || none('No game in progress.')); },
  proposed: () => V('Pinned bar', 'Live, then Final · soft two-team blend · scrim · 52 px · squared', PH(states('a'))) };
/* ------------------------------------------------------------------ matchup hero · helmets */
/** a bare stage in the two primaries (the surface itself is its own card), only to judge the helmets on */
function helStage(g, k, size) {
  const A = Dt.team(g.a), H = Dt.team(g.h), me = [g.a, g.h].includes(C().tm.id) ? C().tm.id : g.h;
  const hel = (tid, face, cls) => S(UI.helmet(tid, { face, cls: 'r6h-hel ' + cls }));
  const name = (t, cls) => `<span class="r6h-nm ${cls}"><b class="lk-tri">${esc(t.abbr)}</b></span>`;
  let inner;
  if (k === 'a') inner = hel(g.a, 'right', 'a') + hel(g.h, 'left', 'h') + name(A, 'a') + name(H, 'h');
  else if (k === 'b') inner = `<div class="r6h-row">${hel(g.a, 'right', '')}${name(A, '')}<span class="r6h-vs">at</span>${name(H, '')}${hel(g.h, 'left', '')}</div>`;
  else { const op = me === g.a ? H : A, M = Dt.team(me);
    inner = hel(me, 'right', 'me') + `<div class="r6h-solo">${name(M, '')}<span class="r6h-vs">${me === g.a ? 'at' : 'vs'}</span><span class="r6-disc">${S(UI.logo(op.id, 'sm'))}</span>${name(op, '')}</div>`; }
  const bg = k === 'c' ? `background:${App.teamFill(Dt.team(me))}` : `background:linear-gradient(100deg,${App.teamFill(A)} 0 50%,${App.teamFill(H)} 50% 100%)`;
  return `<div class="r6h-st ${size} k${k}" style="${bg}">${inner}</div>`;
}
const helSet = k => { const gs = [C().G.live, C().G.pre].filter(Boolean);
  return `<p class="r6-k">Home and Watch hero</p>${gs.map(g => helStage(g, k, 'tall')).join('')}<p class="r6-k">Game page hero</p>${helStage(gs[0], k, 'compact')}`; };

R['hero-helmets'] = { id: 'hero-helmets', v: 1, ready: true, name: 'Matchup hero · helmets', target: 'UI.matchup() .mx-helmets · gameParts.hero() .gc-hel',
  changes: [
    'The second organism, and the first of the six matchup hero parts you asked to judge separately: only the helmets here (size, placement, which way each faces). The surface, names, score and status are their own cards next, so the stages below are plain team primaries just to judge the helmets on.',
    'Today: on Home and Watch the helmets are about 184 px, sit at different heights from the names and bleed past the edges; on the game page they are about 64 px over the tricode. The home helmet faces left in the heroes but right everywhere else, so there is no one rule.',
    'Every option: the helmet image keeps its proportions, the whole shell and logo are always inside the frame (never cropped), a helmet on the left or in the middle faces right, and the same option sets one size for each hero size (tall 152 px, compact 64 px) so the heroes match.',
    'A, face-off: both helmets the same size, sitting on one baseline at the bottom corners, facing each other, fully inside. B, beside the names: small helmets (64 px) as part of the name line, away facing right, home facing left, no big helmets behind. C, one helmet: only your team\'s (or the home team\'s), large on the left facing right, with the opponent as a logo chip, like hero option B from before.'],
  options: [
    { k: 'a', name: 'Face-off', note: 'Both helmets the same size on one baseline at the bottom corners, facing each other, fully inside the frame.' },
    { k: 'b', name: 'Beside the names', note: 'Small helmets as part of each name line, facing each other. No big helmets in the background.' },
    { k: 'c', name: 'One helmet', note: 'Only your team\'s (or the home team\'s) helmet, large on the left facing right; the opponent as a logo chip.' }],
  current: () => { const D = Dt, G = C().G, lv = G.live, pr = G.pre;
    return V('As the app draws it', 'UI.matchup() on Home and Watch · gameParts.hero() on the game page', PH(`<p class="r6-k">Home and Watch hero</p><div class="r6h-cur">${S(UI.matchup(lv, { S: D.score(lv) }))}</div>${pr ? `<div class="r6h-cur">${S(UI.matchup(pr, { S: D.score(pr) }))}</div>` : ''}<p class="r6-k">Game page hero</p><div class="r6h-cur">${S(GP().hero(live()))}</div>`)); },
  proposed: k => V('Helmets only', 'tall 152 px · compact 64 px · never cropped', PH(helSet(k))) };

/* ------------------------------------------------------------------ matchup hero · status */
/** the status for one game in option k: a = the badge carries it (as the ticker and score bug), b = badge then a clock line,
    c = no badge, a dot and the clock as one Stats line */
function statusOf(g, k) {
  const Sc = Dt.score(g), st = Sc.st, when = `${fmt.day(g.ts)} · ${fmt.time(g.ts)}`;
  if (k === 'a') return st === 'live' ? `<span class="badge live">${esc(Sc.label)}</span>` : `<span class="badge r6s-soft">${esc(st === 'pre' ? when : Sc.label)}</span>`;
  if (k === 'b') return st === 'live' ? `<span class="badge live">Live</span><b class="r6s-clk r-clock-status">${esc(Sc.label)}</b>`
    : st === 'pre' ? `<span class="r6s-date r-date">${esc(when)}</span><span class="r6s-sub">Kickoff in ${esc(fmt.until(g.ts))}</span>` : `<b class="r6s-clk r-clock-status">${esc(Sc.label)}</b>`;
  return st === 'live' ? `<b class="r6s-clk r-clock-status"><i class="r6s-dot"></i>${esc(Sc.label)}</b>` : st === 'pre' ? `<span class="r6s-date r-date">${esc(when)}</span>` : `<b class="r6s-clk r-clock-status">${esc(Sc.label)}</b>`;
}
/** a plain stage with the approved helmets (face-off) and the scores, so only the status changes between options */
function statStage(g, k, size) {
  const A = Dt.team(g.a), H = Dt.team(g.h), Sc = Dt.score(g), pre = Sc.st === 'pre';
  const hel = (tid, face, cls) => S(UI.helmet(tid, { face, cls: 'r6h-hel ' + cls }));
  const sc = (v, o) => pre ? '' : `<b class="lk-sc r6s-sc${Sc.final && v < o ? ' lost' : ''}">${v}</b>`;
  return `<div class="r6h-st r6s ${size} ka s${k}" style="background:linear-gradient(100deg,${App.teamFill(A)} 0 50%,${App.teamFill(H)} 50% 100%)">
    ${hel(g.a, 'right', 'a')}${hel(g.h, 'left', 'h')}<div class="r6s-row">${sc(Sc.as, Sc.hs)}<div class="r6s-st">${statusOf(g, k)}</div>${sc(Sc.hs, Sc.as)}</div></div>`;
}
const statSet = k => { const G = C().G, gs = [G.pre, G.live, G.post].filter(Boolean);
  return `<p class="r6-k">Home and Watch hero · before, live, final</p>${gs.map(g => statStage(g, k, 'tall')).join('')}<p class="r6-k">Game page hero · live</p>${statStage(G.live || gs[0], k, 'compact')}`; };

R['hero-status'] = { id: 'hero-status', v: 1, ready: true, name: 'Matchup hero · status', target: 'UI.matchup() .mx-live .mx-clock .mx-kicker · gameParts.hero() .gc-mid',
  changes: [
    'The second hero part: only the status (Live, the clock, the kickoff time, Final). The stages use the helmets you just approved and plain team primaries, so only the status changes between options; the surface, names and score are their own cards.',
    'Today the heroes set it three ways, none of them the approved roles: on Home and Watch the clock and the kickoff time are Display italic 20 px (the clock role is Stats bold caps, the date role Sans medium), "Final" is Display too, and the game page puts the Live badge over a Stats clock. The score bug and ticker you approved carry the clock inside the Live badge.',
    'A, the badge carries it: the same as the score bug and ticker. Live is the Live badge with the clock in it, before kickoff a soft badge with the day and time, Final a soft badge. B, badge then clock: the Live badge alone, the clock under it in Stats bold caps at 20 px; before kickoff the date in Sans medium with "Kickoff in …" under it. C, no badge: a Live-red dot and the clock as one Stats bold caps line, the date in Sans medium, Final in Stats caps.',
    'Soft badges on a team colour are white at 18% with white text, the same tint as the approved Milestone and the score bug.'],
  options: [
    { k: 'a', name: 'The badge carries it', note: 'Live badge with the clock inside, soft badge for the kickoff time and Final. Matches the score bug and ticker.' },
    { k: 'b', name: 'Badge, then clock', note: 'The Live badge, the clock under it in Stats bold caps; the date in Sans medium with "Kickoff in …".' },
    { k: 'c', name: 'No badge', note: 'A Live-red dot and the clock as one Stats line; the date in Sans medium; Final in Stats caps.' }],
  current: () => { const G = C().G, gs = [G.pre, G.live, G.post].filter(Boolean);
    return V('As the app draws it', 'UI.matchup() on Home and Watch · gameParts.hero() on the game page', PH(`<p class="r6-k">Home and Watch hero</p>${gs.map(g => `<div class="r6h-cur r6s-cur">${S(UI.matchup(g, { S: Dt.score(g) }))}</div>`).join('')}<p class="r6-k">Game page hero</p><div class="r6h-cur">${S(GP().hero(live()))}</div>`)); },
  proposed: k => V('Status only', 'centred between the scores · approved helmets', PH(statSet(k))) };

/* ------------------------------------------------------------------ matchup hero · surface */
const grad = t => (t.grad && t.grad.length > 1) ? t.grad : [t.color, t.color];
/** the surface: away gradient into home gradient, blended across the middle 70% in oklab (no muddy midpoint); the 35% scrim is its own layer */
function surfBg(g) {
  const a = grad(Dt.team(g.a)), h = grad(Dt.team(g.h));
  return `linear-gradient(90deg in oklab,${a[0]} 0%,${a[1]} 15%,${h[1]} 85%,${h[0]} 100%)`;
}
/** a whole hero on that surface, built from the approved parts: helmets (face-off), status (badge then clock) */
function surfStage(g, size) {
  const A = Dt.team(g.a), H = Dt.team(g.h), Sc = Dt.score(g), pre = Sc.st === 'pre';
  const hel = (tid, face, cls) => S(UI.helmet(tid, { face, cls: 'r6h-hel ' + cls }));
  const side = (t, v, o, cls) => `<div class="r6f-side ${cls}${Sc.final && v < o ? ' lost' : ''}">${pre ? '' : `<b class="lk-sc">${v}</b>`}<b class="lk-name">${esc(size === 'compact' ? t.abbr : t.name)}</b><span class="r6f-rec">${esc(Dt.record(t.id, g.s, Math.min(App.time.now(), g.ts - 1)).str)}</span></div>`;
  return `<div class="r6h-st r6f ${size} ka" style="background:${surfBg(g)}"><i class="r6f-scrim"></i>${hel(g.a, 'right', 'a')}${hel(g.h, 'left', 'h')}
    <div class="r6f-top">${S(UI.heroStatus(g, Sc, false))}</div>${side(A, Sc.as, Sc.hs, 'a')}${side(H, Sc.hs, Sc.as, 'h')}</div>`;
}
const surfSet = () => { const G = C().G, gs = [G.live, G.pre, G.post].filter(Boolean);
  return `<p class="r6-k">Home and Watch hero · live, before, final</p>${gs.map(g => surfStage(g, 'tall')).join('')}<p class="r6-k">Game page hero</p>${surfStage(gs[0], 'compact')}`; };

R['hero-surface'] = { id: 'hero-surface', v: 2, ready: true, name: 'Matchup hero · surface', target: 'UI.matchup() .mx-bg · gameParts.hero() .mu-bg · UI.matchVars()',
  changes: [
    'v2, from your note on A ("make the gradient wider, it looks ugly when it transforms too quick. we can also darken the scrim a bit more"): option A only. The blend between the two teams now runs across the middle 70% of the hero instead of 24%, so the colour changes slowly from one side to the other. Each team keeps its own gradient at its outer edge (its two stops over the outer 15%).',
    'The blend is mixed in oklab, a colour space that keeps the midpoint clean: a pair that clashes, like Broncos orange into Chargers blue, passes through a soft grey-violet instead of the muddy brown a plain blend gives.',
    'The scrim is darker: black at 35%, up from 28%. Measured on all 32 team gradients, white text now reaches at least 5.4:1 (the Titans, the lightest), up from 4.6:1, so everything on the hero passes AA with room. Team colours themselves are never darkened; the scrim is one even layer over them.',
    'On approval the score bug moves to the same 35% scrim, so every team surface in the app uses one scrim.',
    'Built from what you have approved: the face-off helmets and the badge-then-clock status. Names, records and scores are still as the app draws them; they are the next cards.'],
  options: [{ k: 'a', name: 'Wide soft blend', note: 'Away gradient into home gradient across the middle 70%, mixed in oklab. 35% scrim.' }],
  current: () => { const G = C().G, gs = [G.live, G.pre, G.post].filter(Boolean);
    return V('As the app draws it', 'the slash, the giant outlined tricodes', PH(`<p class="r6-k">Home and Watch hero</p>${gs.map(g => `<div class="r6h-cur r6s-cur">${S(UI.matchup(g, { S: Dt.score(g) }))}</div>`).join('')}<p class="r6-k">Game page hero</p><div class="r6h-cur">${S(GP().hero(live()))}</div>`)); },
  proposed: () => V('Surface', 'team gradients blended across 70% · 35% scrim · no slash · AA for all 32', PH(surfSet())) };

/* ------------------------------------------------------------------ matchup hero · score */
/** a hero on the approved surface with the approved helmets and status; only where the score sits and how a loss reads change */
function scoreStage(g, k, size) {
  const A = Dt.team(g.a), H = Dt.team(g.h), Sc = Dt.score(g), pre = Sc.st === 'pre', small = size === 'compact';
  const hel = (tid, face, cls) => S(UI.helmet(tid, { face, cls: 'r6h-hel ' + cls }));
  const lost = (v, o) => Sc.final && v < o, won = (v, o) => Sc.final && v > o;
  const rec = t => `<span class="r6f-rec">${esc(Dt.record(t.id, g.s, Math.min(App.time.now(), g.ts - 1)).str)}</span>`;
  const nm = t => `<b class="lk-name">${esc(small ? t.abbr : t.name)}</b>`;
  // the score; in c the winner's carries a caret that points at it, and the loser keeps full white
  const sc = (v, o, cls) => pre ? '' : `<b class="lk-sc r6k-sc${k !== 'c' && lost(v, o) ? ' lost' : ''}">${k === 'c' && won(v, o) ? `<i class="r6k-win ${cls}" aria-label="Winner"></i>` : ''}${v}</b>`;
  const st = `<div class="r6f-top">${S(UI.heroStatus(g, Sc, false))}</div>`;
  let body;
  if (k === 'b') { // the scores flank the status; names and records at the edges under them
    const side = (t, v, o, cls) => `<div class="r6k-nm ${cls}${k !== 'c' && lost(v, o) ? ' lost' : ''}">${nm(t)}${rec(t)}</div>`;
    body = `<div class="r6k-row">${sc(Sc.as, Sc.hs, 'a')}${S(UI.heroStatus(g, Sc, false))}${sc(Sc.hs, Sc.as, 'h')}</div>${side(A, Sc.as, Sc.hs, 'a')}${side(H, Sc.hs, Sc.as, 'h')}`;
  } else { // a and c: the score over the name at each edge, the status centred above
    const side = (t, v, o, cls) => `<div class="r6f-side ${cls}${k === 'a' && lost(v, o) ? ' lost' : ''}">${sc(v, o, cls)}${nm(t)}${rec(t)}</div>`;
    body = `${st}${side(A, Sc.as, Sc.hs, 'a')}${side(H, Sc.hs, Sc.as, 'h')}`;
  }
  return `<div class="r6h-st r6f r6k r6k-${k} ${size} ka" style="background:${surfBg(g)}"><i class="r6f-scrim"></i>${hel(g.a, 'right', 'a')}${hel(g.h, 'left', 'h')}${body}</div>`;
}
const scoreSet = k => { const G = C().G, gs = [G.live, G.post, G.pre].filter(Boolean);
  return `<p class="r6-k">Home and Watch hero · live, final, before</p>${gs.map(g => scoreStage(g, k, 'tall')).join('')}<p class="r6-k">Game page hero · live, final</p>${[G.live, G.post].filter(Boolean).map(g => scoreStage(g, k, 'compact')).join('')}`; };

R['hero-score'] = { id: 'hero-score', v: 1, ready: true, name: 'Matchup hero · score', target: 'UI.matchup() .mx-sc .mx-side.lost · gameParts.hero() .gc-bug .gc-side.lost',
  changes: [
    'The next hero part: where the two scores sit and how a loss reads. Every stage uses what you have approved: the wide-blend surface with its 35% scrim, the face-off helmets, and the badge-then-clock status. Names and records are drawn as they are today; they are the next card.',
    'Today the two heroes disagree. On Home and Watch the score sits over the team name at each edge; on the game page it sits in the middle, beside the clock. Whichever you pick goes on both, so a game looks the same wherever you meet it.',
    'A, over the name: the score at each edge above the team name (the Home and Watch way). A final\'s losing score and name drop to 60%; the record stays full white. B, beside the status: the two scores flank the status in the middle (the game page way), names and records at the edges under them; the loser\'s score and name drop to 60%, the record stays full. C, winner marked: A\'s layout, but nothing dims; a small white caret points at the winning score instead.',
    'The score face is the approved score role (Display) at 52 px on the tall hero and 36 px on the game page hero. Measured: 60% white on the scrimmed surface is at least 3.05:1 (Titans), which passes AA for large text (scores, names) but not for small text, so the record never dims. Today the app dims the record too; that changes in A and B.'],
  options: [
    { k: 'a', name: 'Over the name', note: 'Score at each edge above the team name. The losing score and name dim to 60%.' },
    { k: 'b', name: 'Beside the status', note: 'The scores flank the status in the middle; names and records at the edges. The loser dims to 60%.' },
    { k: 'c', name: 'Winner marked', note: 'A\'s layout; nothing dims, a white caret points at the winning score.' }],
  current: () => { const G = C().G, gs = [G.live, G.post, G.pre].filter(Boolean);
    return V('As the app draws it', 'UI.matchup() on Home and Watch · gameParts.hero() on the game page', PH(`<p class="r6-k">Home and Watch hero</p>${gs.map(g => `<div class="r6h-cur r6s-cur">${S(UI.matchup(g, { S: Dt.score(g) }))}</div>`).join('')}<p class="r6-k">Game page hero</p><div class="r6h-cur">${S(GP().hero(live()))}</div><div class="r6h-cur">${S(GP().hero(post()))}</div>`)); },
  proposed: k => V('Score only', 'approved surface, helmets and status', PH(scoreSet(k))) };

/* ------------------------------------------------------------------ matchup hero · names and records */
/** the approved hero (surface, helmets, status, score over the name); only the team's name and record change */
function nameStage(g, k, size) {
  const A = Dt.team(g.a), H = Dt.team(g.h), Sc = Dt.score(g), pre = Sc.st === 'pre', small = size === 'compact';
  const hel = (tid, face, cls) => S(UI.helmet(tid, { face, cls: 'r6h-hel ' + cls }));
  const tri = k === 'b' || (k === 'a' && small);
  // c on the game page hero: the full name fitted to the room beside the helmet (about 80 px, leaving a gap between the two names), never cut
  const fit = t => small && !tri ? ` style="font-size:min(17px,${(80 / t.name.length / .62).toFixed(1)}px)"` : '';
  const side = (t, v, o, cls) => `<div class="r6f-side ${cls}${Sc.final && v < o ? ' lost' : ''}">${pre ? '' : `<b class="lk-sc">${v}</b>`}<b class="${tri ? 'lk-tri' : 'lk-name'} r6n-nm"${fit(t)}>${esc(tri ? t.abbr : t.name)}</b><span class="r6f-rec r6n-rec">${esc(Dt.record(t.id, g.s, Math.min(App.time.now(), g.ts - 1)).str)}</span></div>`;
  return `<div class="r6h-st r6f r6n r6n-${k} ${size} ka" style="background:${surfBg(g)}"><i class="r6f-scrim"></i>${hel(g.a, 'right', 'a')}${hel(g.h, 'left', 'h')}
    <div class="r6f-top">${S(UI.heroStatus(g, Sc, false))}</div>${side(A, Sc.as, Sc.hs, 'a')}${side(H, Sc.hs, Sc.as, 'h')}</div>`;
}
/** a game with the longest names in the league, so the fit is tested */
const longGame = () => { const long = t => ['WAS', 'TB'].includes(Dt.team(t).abbr); return App.data.D.games.find(g => g.s === C().G.live?.s && long(g.a) && long(g.h)) || App.data.D.games.find(g => g.s === C().G.live?.s && g.t === 2 && g.ts < App.time.now() && (long(g.a) || long(g.h))) || App.data.D.games.find(g => long(g.a) || long(g.h)); };
const nameSet = k => { const G = C().G, gs = [G.live, G.post, G.pre, longGame()].filter(Boolean);
  return `<p class="r6-k">Home and Watch hero · live, final, before, longest names</p>${gs.map(g => nameStage(g, k, 'tall')).join('')}<p class="r6-k">Game page hero · live, longest names</p>${[G.live, longGame()].filter(Boolean).map(g => nameStage(g, k, 'compact')).join('')}`; };

R['hero-names'] = { id: 'hero-names', v: 1, ready: true, name: 'Matchup hero · team names and records', target: 'UI.matchup() .mx-name .mx-rec · gameParts.hero() .gc-ab .gc-rec',
  changes: [
    'The last hero part: how each team is named and where its record sits. Every stage is the hero as approved so far: the wide-blend surface, face-off helmets, badge-then-clock status, the score over the name. The last stage of each set is a game with the longest names in the league, so you can see they fit.',
    'Today: Home and Watch write the full name, sized to fit its half, so two teams in one hero can be two different sizes (Bears bigger than Commanders). The game page writes the tricode. Both are the approved team-name and tricode role (Display). The record is in two faces: Stats medium on the game page (the approved record role), Sans semibold on Home and Watch, which no card approved.',
    'In every option the record sits under the name in the record role, Stats medium, full white (it is small text, so it never dims), and the name is one fixed size per hero: 24 px on Home and Watch, 17 px on the game page.',
    'A, name, then tricode: the full name on Home and Watch, the tricode on the game page where there is less room (today\'s split, with the fixed size). B, tricode everywhere: the tricode on both heroes. C, name everywhere: the full name on both; on the game page a long name (Commanders, Buccaneers) steps down in size to fit beside the helmet instead of being cut.'],
  options: [
    { k: 'a', name: 'Name, then tricode', note: 'Full name on Home and Watch, the tricode on the game page. One size per hero.' },
    { k: 'b', name: 'Tricode everywhere', note: 'The tricode on both heroes.' },
    { k: 'c', name: 'Name everywhere', note: 'The full name on both heroes; a long name steps down on the game page to fit.' }],
  current: () => { const G = C().G, gs = [G.live, G.post, G.pre, longGame()].filter(Boolean);
    return V('As the app draws it', 'UI.matchup() on Home and Watch · gameParts.hero() on the game page', PH(`<p class="r6-k">Home and Watch hero</p>${gs.map(g => `<div class="r6h-cur r6s-cur">${S(UI.matchup(g, { S: Dt.score(g) }))}</div>`).join('')}<p class="r6-k">Game page hero</p><div class="r6h-cur">${S(GP().hero(live()))}</div>`)); },
  proposed: k => V('Names and records only', 'approved surface, helmets, status and score', PH(nameSet(k))) };

/* ------------------------------------------------------------------ app chrome: moment bar + tab bar */
/** a phone's top and bottom edge in option k: the real status bar and tab bar markup, over a slice of Home */
function chromeStage(k, tab) {
  const d = App.time.date(), m = App.time.moment();
  const sb = `<span class="num">${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: fmt.tz() }).replace(/\s?[AP]M/, '')}</span><span class="sb-tm"><i class="dot"></i>${S(App.icon('clock', 'xs'))}${esc(fmt.day(d))} · ${esc(m.label)}</span><span class="sb-icons"></span>`;
  const behind = `<div class="r6t-fill"><div class="r6t-hero" style="background:${App.teamFill(Dt.team(C().tm.id))}"></div><div class="r6t-row"></div><div class="r6t-row"></div><div class="r6t-row s"></div></div>`;
  return `<div class="r6t r6t-${k}"><div class="statusbar r6t-sb">${sb}</div>${behind}<nav class="tabbar" style="--i:${App.tabs.findIndex(x => x.key === tab)}">${App.tabBarInner(tab)}</nav></div>`;
}
const chromeSet = () => `<p class="r6-k">iOS · Home selected</p>${chromeStage('a', 'home')}<p class="r6-k">iOS · Scores selected, games live</p>${chromeStage('a', 'scores')}<p class="r6-k">Android · Home selected</p>${chromeStage('d', 'home')}<p class="r6-k">Android · Scores selected, games live</p>${chromeStage('d', 'scores')}`;

R['app-chrome'] = { id: 'app-chrome', v: 2, ready: true, name: 'App chrome · moment bar and tab bar', target: '.statusbar .sb-tm · .tabbar .tb-glass .tb-lens .tb-badge · :root[data-platform=android] .tabbar',
  changes: [
    'v2, from your note ("we\'re using the ios default and then for android we can do something similar to option b but maybe a dot below instead of a line above"): one option, split by platform.',
    'iOS keeps the default: the floating Liquid Glass capsule with the soft lens behind the current tab, as today.',
    'Android becomes B with a dot: a flat bar docked across the bottom on the surface colour with a hairline on top; the current tab in full text colour with a small red dot under its label, the others grey. It replaces today\'s Material pill (the 64 by 32 tinted pill behind the current icon). Labels stay Sans bold 10 px on both, as on iOS.',
    'On both platforms the moment bar is squared (6 px corners, the small-radius token), because it is pressable, and its date is the approved date role, Sans medium. The live count on Scores stays Live red with the number in Sans bold (it was extra-bold, which is on no sheet).',
    'Switch platforms in the time machine under Device, as today.'],
  options: [{ k: 'a', name: 'iOS default, Android dot', note: 'Glass capsule on iOS; a docked flat bar with a dot under the current tab on Android.' }],
  current: () => V('As the app draws it', 'renderChrome() in core.js · Android via Device in the time machine', PH(`<p class="r6-k">iOS · Home selected</p>${chromeStage('cur', 'home')}<p class="r6-k">Android · Home selected</p>${chromeStage('cur plat-android', 'home')}`)),
  proposed: () => V('Chrome', 'top and bottom edge of every screen, by platform', PH(chromeSet())) };

/* ------------------------------------------------------------------ sheets and toasts */
/** a phone with a toast at the top and a sheet open at the bottom, built from the real markup (App.sheet, App.toast) */
function sheetStage(k) {
  const I = n => S(App.icon(n, 'sm'));
  const ic = k === 'cur' ? `<div class="icon-btn solid" style="width:34px;height:34px">${I('check')}</div>` : `<span class="r6q-ic">${I('check')}</span>`;
  const toast = `<div class="toasts r6q-toasts"><div class="toast r6q-t">${ic}<div class="grow"><div class="b r6q-tt"${k === 'cur' ? ' style="font-size:14px"' : ''}>Filled 4 picks</div><div class="meta mt4 r6q-tb">Change any of them until kickoff.</div></div></div></div>`;
  const rows = [['Maya', 'Bears fan'], ['Dre', 'Chiefs fan'], ['Priya', 'Packers fan']].map(([n, sub]) => S(UI.row({ left: App.raw(`<span class="w-av" style="background:#5b6cff">${n[0]}</span>`), title: n, sub })) ).join('');
  const sheet = `<div class="sheet r6q-sh"><div class="grab"></div><div class="sheet-head"><div class="grow"><div class="h3 r6q-h">Sunday squad</div></div><button class="icon-btn" aria-label="Close">${S(App.icon('close'))}</button></div><div class="sheet-body"><div class="list">${rows}</div></div></div>`;
  return `<div class="r6q r6q-${k}" style="${App.teamVars(Dt.team(C().tm.id))}"><div class="r6t-fill"><div class="r6t-hero" style="background:${App.teamFill(Dt.team(C().tm.id))}"></div><div class="r6t-row"></div></div><i class="r6q-dim"></i>${toast}${sheet}</div>`;
}

R['sheet-toast'] = { id: 'sheet-toast', v: 1, ready: true, name: 'Sheets and toasts', target: 'App.sheet() .sheet .sheet-head · App.toast() .toast',
  changes: [
    'The two surfaces that sit over any screen: the sheet that slides up (squad members, filters, where to watch, the time machine) and the toast that drops in at the top ("Filled 4 picks", "Badge unlocked"). 71 places in the app raise a toast.',
    'In every option the sheet gets three fixes. Its title is the approved page-title role, Display, because a sheet is a page of its own (today it is Sans bold, like a section heading). The close button is the approved squared icon button. The sheet keeps its grab handle and 22 px top corners, the platform default.',
    'In every option the toast loses two things that are on no sheet: its icon sits in a circular icon button, which reads as pressable, and its title has an inline 14 px size. The icon now sits in a plain 34 px square (6 px corners), the title is Sans bold 14 from a class, the body Sans medium 13. A toast is a card, not a button, so it takes the card corner (12 px) instead of 18.',
    'A, surface: the toast on the raised surface colour with a hairline, like a card. B, inverse: a near-black toast with white text in light mode (white on near-black is 18:1), the way iOS and Android drop system banners. C, your team: the toast in your team colour under the shared 35% scrim, white text (AA on all 32 teams).'],
  options: [
    { k: 'a', name: 'Surface', note: 'The toast is a raised card on the surface colour with a hairline.' },
    { k: 'b', name: 'Inverse', note: 'A near-black toast with white text, like a system banner.' },
    { k: 'c', name: 'Your team', note: 'The toast in your team colour under the shared scrim, white text.' }],
  current: () => V('As the app draws it', 'App.sheet() and App.toast() in core.js', PH(sheetStage('cur'))),
  proposed: k => V('Sheet and toast', 'over any screen', PH(sheetStage(k))) };

/* ------------------------------------------------------------------ home stage */
/** the real Home stage (homeParts.fanHeader) at the time machine's moment */
const stage = k => `<div class="r6s r6s-${k}">${S(App.homeParts.fanHeader())}</div>`;
/** what the stage says, read from the real one so the words never drift, plus the season week by week */
function hsData() {
  const d = document.createElement('div'); d.innerHTML = stage('x');
  const q = s => { const e = d.querySelector(s); return e ? e.textContent.trim() : ''; };
  const mine = d.querySelector('.fx-name').dataset.go.split('/').pop(), tm = Dt.team(mine), now = App.time.now();
  const G = Dt.teamGamesAsOf(mine).filter(g => g.t === 2), next = Dt.nextGame(mine), last = Dt.lastGame(mine);
  const cells = [];
  for (let w = 1; w <= Math.max(18, ...G.map(g => g.w)); w++) {
    const g = G.find(x => x.w === w); if (!g) { cells.push({ w, k: 'bye' }); continue; }
    const st = Dt.state(g, now), r = st === 'post' && !Dt.spoiled(g) ? Dt.result(g, mine) : null;
    cells.push({ w, g, opp: Dt.team(Dt.opp(g, mine)), r, nx: g === next, k: st === 'live' ? 'live' : r ? r.r.toLowerCase() : st === 'post' ? 'hid' : 'pre' });
  }
  return { mine, tm, hello: q('.fx-hello'), wl: q('.fx-wl'), meta: q('.fx-meta'), say: q('.fx-say'), cells, next, last,
    played: G.filter(g => Dt.state(g, now) === 'post').length, n: G.length };
}
/** the game a stage leads with, in words: before kickoff (next) or after the whistle (last) */
function hsFocus(D, g) {
  if (!g) return null;
  const I = n => S(App.icon(n, 'sm')), opp = Dt.team(Dt.opp(g, D.mine)), home = Dt.isHome(g, D.mine);
  const div = opp.conf === D.tm.conf && opp.div === D.tm.div, wk = Dt.weekLabel(g.t, g.w), Sc = Dt.score(g);
  if (Sc.st === 'pre') return { g, opp, pre: true, kick: `Next up · ${wk}${div ? ' · Division game' : ''}`, vs: home ? 'vs' : 'at',
    when: `${fmt.day(g.ts)} · ${fmt.time(g.ts)}${(g.tv || []).length ? ' · ' + g.tv.join(' / ') : ''}`, big: fmt.until(g.ts), bigL: 'to kickoff',
    acts: [`${I('tv')}Where to watch`, 'Preview'] };
  const r = Dt.result(g, D.mine);
  return { g, opp, pre: false, kick: `${wk} · Final${g.ot ? '/OT' : ''}${div ? ' · Division game' : ''}`, vs: r.r === 'W' ? 'Beat' : r.r === 'L' ? 'Lost to' : 'Tied',
    when: `${fmt.day(g.ts)} · ${home ? 'at home' : 'away'}`, big: `${r.us}–${r.them}`, bigL: r.r === 'W' ? 'Win' : r.r === 'L' ? 'Loss' : 'Tie',
    acts: [`${I('play')}Recap`, 'Game center'] };
}
const disc6 = (t, s) => `<span class="r6v-disc${s ? ' s' : ''}"><img src="${t.logo}" alt=""></span>`;
/** the season as one row of squares with the result letter inside: no logos, so it never crowds itself */
const hsBars = D => `<div class="r6v-run"><div class="r6v-runh"><span class="r6v-eb">Season</span><span class="r6v-meta">${D.played} of ${D.n} played</span></div>
  <div class="r6v-bars">${D.cells.map(c => `<i class="${c.k}${c.nx ? ' nx' : ''}" title="Week ${c.w}${c.opp ? ' · ' + esc(c.opp.name) : ' · bye'}">${c.r ? c.r.r : ''}</i>`).join('')}</div></div>`;

/** the week slider (v2 option B, which you liked) on the stage's glass: Wk, logo, result or opponent, Bye; next week solid white.
 *  The app opens it scrolled to two weeks before this one. */
function hsSlider(D) {
  const at = Math.max(0, D.cells.findIndex(c => c.nx || c.k === 'live') - 2);
  const chips = D.cells.slice(at).map(c => c.k === 'bye' ? `<span class="r6w-c bye"><span class="r6w-w">Wk ${c.w}</span><b>Bye</b></span>`
    : `<span class="r6w-c ${c.k}${c.nx ? ' nx' : ''}"><span class="r6w-w">Wk ${c.w}</span>${disc6(c.opp, 1)}<b>${c.r ? `${c.r.r} ${c.r.us}–${c.r.them}` : c.nx ? 'Next' : c.k === 'live' ? 'Live' : esc(c.opp.abbr)}</b></span>`).join('');
  return `<div class="r6w"><div class="r6v-runh"><span class="r6v-eb">Season</span><span class="r6v-meta">${D.played} of ${D.n} played</span></div><div class="r6w-row">${chips}</div></div>`;
}
/** v3: the real stage, its layout kept, with the fixes and the week slider */
function hsV3() {
  const d = document.createElement('div'); d.innerHTML = stage('v3');
  const fl = d.querySelector('.fx-flag'); if (fl) { const k = fl.previousElementSibling; if (k) k.textContent += ' · Division game'; fl.remove(); }
  const run = d.querySelector('.fx-run'); if (run) run.outerHTML = hsSlider(hsData());
  return d.innerHTML;
}
/* home stage v4: today's layout kept; the next game, the season slider and the numbers redrawn three ways */
function hsStats(id) {
  const s = Dt.seasonForStats(), st = Dt.standings(s), ts = Dt.teamSeason(id, s); if (!ts || ts.g < 1) return null;
  const by = st.all.slice().sort((x, y) => y.diff - x.diff), dr = by.findIndex(r => r.tid === id) + 1, df = by[dr - 1].diff;
  return [[ts.ppg.toFixed(1), 'Points a game', Dt.teamRank(id, s, 'ppg'), ts.ppg, 1], [ts.papg.toFixed(1), 'Allowed a game', Dt.teamRank(id, s, 'papg', true), ts.papg, -1], [(df > 0 ? '+' : '') + df, 'Point diff', dr, df, 1]];
}
function hsGame(D, g) {
  const oid = Dt.opp(g, D.mine), opp = Dt.team(oid), s = Dt.seasonForStats(), div = opp.conf === D.tm.conf && opp.div === D.tm.div;
  return { g, oid, opp, home: Dt.isHome(g, D.mine), kick: `Next up · ${Dt.weekLabel(g.t, g.w)}${div ? ' · Division game' : ''}`, tv: (g.tv || []).join(' / '),
    when: `${fmt.day(g.ts)} · ${fmt.time(g.ts)}`, until: fmt.until(g.ts), rec: id => Dt.record(id, s).str };
}
const acts4 = `<div class="fx-g-acts"><button class="btn white">${S(App.icon('tv', 'sm'))}Where to watch</button><button class="btn fx-ghost">Preview</button></div>`;
const ord = n => fmt.ord(n);
const GAME4 = {
  // a: the two helmets face off, kickoff and the countdown between them
  a: (D, G) => `<div class="fx-game r4-g"><div class="r4-k"><span class="r6v-eb">${esc(G.kick)}</span><span class="r6v-meta">${esc(G.tv)}</span></div>
    <div class="r4-fo"><div class="r4-sd">${S(UI.helmet(D.mine, { cls: 'r4-hel' }))}<b class="r4-tri">${esc(D.tm.abbr)}</b><span class="r4-rec">${G.rec(D.mine)}</span></div>
      <div class="r4-mid"><span class="r6v-meta">${esc(G.when)}</span><b class="r4-cd">${esc(G.until)}</b><span class="r6v-meta">to kickoff</span></div>
      <div class="r4-sd r">${S(UI.helmet(G.oid, { cls: 'r4-hel', face: 'left' }))}<b class="r4-tri">${esc(G.opp.abbr)}</b><span class="r4-rec">${G.rec(G.oid)}</span></div></div>${acts4}</div>`,
  // b: the opponent and a big running countdown
  b: (D, G) => `<div class="fx-game r4-g"><div class="r4-k"><span class="r6v-eb">${esc(G.kick)}</span></div>
    <div class="r4-vs">${disc6(G.opp)}<span class="r4-v">${G.home ? 'vs' : 'at'}</span><b class="r4-on">${esc(G.opp.name)}</b><span class="r4-rec">${G.rec(G.oid)}</span></div>
    ${cdown(G.g.ts)}<div class="r6v-meta mt">${esc(G.when)}${G.tv ? ' · ' + esc(G.tv) : ''}</div>${acts4}</div>`,
  // c: a ticket: the date block, the game, a perforation, the countdown
  c: (D, G) => { const dt = new Date(G.g.ts), p = o => dt.toLocaleDateString('en-US', { ...o, timeZone: fmt.tz() });
    return `<div class="fx-game r4-g r4-tk"><div class="r4-tk-top"><div class="r4-date"><span>${p({ weekday: 'short' })}</span><b>${p({ day: 'numeric' })}</b><span>${p({ month: 'short' })}</span></div>
      <div class="r4-tk-r"><span class="r6v-eb">${esc(G.kick.replace("Next up · ", ""))}</span><div class="r4-vs">${disc6(G.opp, 1)}<span class="r4-v">${G.home ? 'vs' : 'at'}</span><b class="r4-on">${esc(G.opp.name)}</b></div><span class="r6v-meta">${esc(fmt.time(G.g.ts))}${G.tv ? ' · ' + esc(G.tv) : ''} · ${G.home ? 'Home' : 'Away'}</span></div></div>
      <div class="r4-perf"></div><div class="r4-tk-b"><span class="r6v-meta">Kickoff in</span><b class="r4-cd">${esc(G.until)}</b></div>${acts4}</div>`; },
};
const RUN4 = {
  // a: a form guide: logo discs with a result bar under each, the next week ringed
  a: D => `<div class="r6w"><div class="r6v-runh"><span class="r6v-eb">Season</span><span class="r6v-meta">${D.played} of ${D.n} played</span></div><div class="r4-row">${D.cells.map(c => c.k === 'bye' ? `<span class="r4a-c bye" title="Week ${c.w} · bye"><i>Bye</i></span>` : `<span class="r4a-c ${c.k}${c.nx ? ' nx' : ''}" title="Week ${c.w}">${disc6(c.opp, 1)}<i>${c.r ? c.r.r : c.nx ? 'Next' : ''}</i></span>`).join('')}</div></div>`,
  // b: logo discs only, the result as a small mark on the corner
  b: D => `<div class="r6w"><div class="r6v-runh"><span class="r6v-eb">Season</span><span class="r6v-meta">${D.played} of ${D.n} played</span></div><div class="r4-row">${D.cells.map(c => c.k === 'bye' ? `<span class="r4b-c bye">Bye</span>` : `<span class="r4b-c ${c.k}${c.nx ? ' nx' : ''}">${disc6(c.opp)}${c.r ? `<em>${c.r.r}</em>` : ''}</span>`).join('')}</div></div>`,
  // c: one line per week: logo and the score, 36 px tall
  c: D => `<div class="r6w"><div class="r6v-runh"><span class="r6v-eb">Season</span><span class="r6v-meta">${D.played} of ${D.n} played</span></div><div class="r4-row">${D.cells.map(c => c.k === 'bye' ? `<span class="r4c-c bye">Wk ${c.w} · Bye</span>` : `<span class="r4c-c ${c.k}${c.nx ? ' nx' : ''}">${disc6(c.opp, 1)}<b>${c.r ? `${c.r.r} ${c.r.us}–${c.r.them}` : c.nx ? 'Next' : 'Wk ' + c.w}</b></span>`).join('')}</div></div>`,
};
const NUMS4 = {
  // a: three numbers with a rank meter (the approved 6 px meter), rank 1 = full
  a: (D) => { const st = hsStats(D.mine); return st ? `<div class="r4-nums">${st.map(([v, l, r]) => `<div class="r4-n"><b>${v}</b><span>${l}</span><i class="r4-m"><i style="width:${Math.round((33 - r) / 32 * 100)}%"></i></i><em>${ord(r)} in NFL</em></div>`).join('')}</div>` : ''; },
  // b: tale of the tape against this week's opponent; the better side full white, the other at 60%
  b: (D, G) => { const a = hsStats(D.mine), o = hsStats(G.oid); if (!a || !o) return '';
    return `<div class="r4-tape"><div class="r4-tape-h">${disc6(D.tm, 1)}<span class="r6v-eb">Tale of the tape</span>${disc6(G.opp, 1)}</div>${a.map((x, i) => { const y = o[i], better = (x[3] - y[3]) * x[4];
      return `<div class="r4-tr"><b class="${better < 0 ? 'lo' : ''}">${x[0]}</b><span>${x[1]}<em>${ord(x[2])} · ${ord(y[2])}</em></span><b class="${better > 0 ? 'lo' : ''}">${y[0]}</b></div>`; }).join('')}</div>`; },
  // c: three big numbers with hairlines between them, no tiles
  c: (D) => { const st = hsStats(D.mine); return st ? `<div class="r4-big">${st.map(([v, l, r]) => `<div><b>${v}</b><span>${l}</span><em>${ord(r)} in NFL</em></div>`).join('')}</div>` : ''; },
};
function hsV4(k) {
  const d = document.createElement('div'), D = hsData(); d.innerHTML = stage('v3 r6s-v4');
  const g = D.next && Dt.score(D.next).st === 'pre' ? D.next : null, G = g && hsGame(D, g);
  const ge = d.querySelector('.fx-game'), run = d.querySelector('.fx-run'), nums = d.querySelector('.fx-nums');
  if (ge && G) ge.outerHTML = GAME4[k](D, G);
  if (run) run.outerHTML = RUN4[k](D);
  if (nums) nums.outerHTML = G ? NUMS4[k](D, G) : NUMS4.a(D);
  return d.innerHTML;
}

/* v5 (from v4 B): no glass boxes; the game and the tape sit on the team colour between white rules, full white text only */
function tapeV5(D, G) {
  const a = hsStats(D.mine), o = hsStats(G.oid); if (!a || !o) return '';
  const side = (x, y, r) => { const better = (x[3] - y[3]) * x[4] > 0;
    return `<div class="r5t-v${r ? ' r' : ''}"><b class="${better ? 'up' : ''}">${x[0]}</b><span>${ord(x[2])} in NFL</span></div>`; };
  return `<div class="r5-tape"><div class="r5-tape-h"><span class="r5-tm">${disc6(D.tm, 1)}<b>${esc(D.tm.abbr)}</b></span><span class="r6v-eb">Tale of the tape</span><span class="r5-tm r"><b>${esc(G.opp.abbr)}</b>${disc6(G.opp, 1)}</span></div>
    ${a.map((x, i) => `<div class="r5-tr">${side(x, o[i])}<span class="r5-tl">${x[1]}</span>${side(o[i], x, 1)}</div>`).join('')}</div>`;
}
function hsV5() {
  const d = document.createElement('div'), D = hsData(); d.innerHTML = stage('v3 r6s-v4 r6s-v5');
  const g = D.next && Dt.score(D.next).st === 'pre' ? D.next : null, G = g && hsGame(D, g);
  const ge = d.querySelector('.fx-game'), run = d.querySelector('.fx-run'), nums = d.querySelector('.fx-nums');
  if (ge && G) ge.outerHTML = GAME4.b(D, G).replace('class="fx-game r4-g"', 'class="fx-game r4-g r5-g"').replace('btn fx-ghost', 'btn r5-line');
  if (run) run.outerHTML = RUN4.b(D);
  if (nums) nums.outerHTML = G ? tapeV5(D, G) : NUMS4.a(D);
  return d.innerHTML;
}

R['home-stage'] = { id: 'home-stage', v: 5, ready: true, name: 'Home fan stage', target: 'homeParts.fanHeader() · fxGame() fxRun() fxNums()',
  was: ['v1: CSS-only restyles.', 'v2: poster, matchup-first, season board.', 'v3: today\'s layout with the glass week slider.', 'v4: face-off, countdown + tale of the tape, ticket.'],
  changes: [
    'v5, from your note on v4 B ("the circle around chargers is getting cut off, and the white box to signify the container area doesnt work for accessibility and looks a little drab… the 5th and 29th rankings should be below the stat (and the faded text is also not accessible)").',
    'No more white boxes: the next game and the tale of the tape sit straight on the team colour, separated by white rules. Every word is full white on the team colour; nothing is faded.',
    'Preview is an outlined button (white border and text), not a translucent one.',
    'The ring around next week\'s logo has room and is no longer clipped. Upcoming weeks are full strength.',
    'Tale of the tape: each team\'s rank sits under its number ("5th in NFL", "29th in NFL"); the label is in the middle. The better side is marked by a white bar under the number instead of fading the other.'],
  options: [{ k: 'a', name: 'Countdown + tale of the tape, refined', note: 'On the team colour, no boxes, nothing faded.' }],
  current: () => V('As the app draws it', 'homeParts.fanHeader() in home.js', PH(stage('cur'))),
  proposed: () => V('Home stage', 'top of Home, under the sheet', PH(hsV5())) };

/* ------------------------------------------------------------------ pick-a-team hero (Home with no team) */
const NFL_SURF = 'style="--tg-a:#0b3d80;--tg-b:#013369"';
const POP = ['12', '2', '21', '26', '6', '9', '25', '33'];
function pickA() {
  return `<section class="r6p r6p-a" ${NFL_SURF}><div class="r6v-hello">Welcome to the NFL app</div><div class="r6p-t">Pick your team</div>
    <p class="r6v-say">Home becomes yours: your team's colours, its race, your players and the stories you care about.</p>
    <div class="ttiles r6p-tiles">${POP.map(id => S(UI.teamTile(id))).join('')}</div>
    <div class="r6v-acts"><button class="btn white">Set up my app</button><button class="btn hm-glass">All 32 teams</button></div></section>`;
}
function pickB() {
  const T = Dt.D.teams, DIVS = ['East', 'North', 'South', 'West'];
  const conf = c => `<div class="r6p-conf"><div class="r6v-eb">${c}</div>${DIVS.map(dv => `<div class="r6p-div"><span class="r6p-dl">${dv}</span>${T.filter(t => t.conf === c && t.div === dv).map(t => `<button class="r6p-lg" aria-label="${esc(t.full)}"><img src="${t.logo}" alt=""></button>`).join('')}</div>`).join('')}</div>`;
  return `<section class="r6p r6p-b" ${NFL_SURF}><div class="r6v-hello">Welcome to the NFL app</div><div class="r6p-t">Pick your team</div>
    <p class="r6v-say">All 32, by division. Tap yours.</p><div class="r6p-confs">${conf('AFC')}${conf('NFC')}</div>
    <div class="r6v-acts"><button class="btn white">Set up my app</button></div></section>`;
}
function pickC() {
  const helm = POP.map(id => { const t = Dt.team(id); return `<div class="r6p-h">${S(UI.helmet(id, { face: 'left' }))}<b>${esc(t.name)}</b><span>${esc(t.city || t.full.replace(' ' + t.name, ''))}</span></div>`; }).join('');
  return `<section class="r6p r6p-c" ${NFL_SURF}><div class="r6v-hello">Welcome to the NFL app</div><div class="r6p-t">Who's your team?</div>
    <div class="r6p-search">${S(App.icon('search', 'sm'))}<span>Search 32 teams or a city</span></div>
    <div class="r6p-row">${helm}</div>
    <div class="r6v-acts"><button class="btn white">Make it mine</button><button class="btn hm-glass">Not sure yet</button></div></section>`;
}
const PICK = { a: pickA, b: pickB, c: pickC };
R['home-pick-hero'] = { id: 'home-pick-hero', v: 1, ready: true, name: 'Pick-a-team hero', target: 'homeParts.pickHero() · .fh-pick .fh-logo',
  changes: [
    'Home before you pick a team. Today: three floating helmets, round logo buttons, two buttons.',
    'Every option: the NFL navy (#0B3D80 to #013369) becomes a token instead of an inline style; the title is the page-title role; anything you can press is squared.',
    'A, team tiles: eight approved team tiles (helmet, Display abbreviation, logo) in a 4 × 2 grid, the same tiles as onboarding.',
    'B, all 32 by division: AFC and NFC side by side, one row per division, every logo a squared glass button. No "All 32" step.',
    'C, helmet line-up: a search field, then a swipeable line of big helmets with the team name in Display.'],
  options: [{ k: 'a', name: 'Team tiles', note: 'Eight approved team tiles, 4 × 2.' }, { k: 'b', name: 'All 32 by division', note: 'Every team on the stage, by conference and division.' }, { k: 'c', name: 'Helmet line-up', note: 'Search, then a swipeable row of helmets.' }],
  current: () => V('As the app draws it', 'homeParts.pickHero() in home.js', PH(`<div class="r6s r6s-cur">${S(App.homeParts.pickHero())}</div>`)),
  proposed: k => V('Pick-a-team hero', 'Home with no team', PH(PICK[k]())) };

/* ------------------------------------------------------------------ offseason moment heroes (draft, free agency, camp) */
/** run fn as if the time machine sat on moment key (paused), then put it back */
function atMoment(key, fn) {
  const T = App.time, keep = { key: T.key, base: T.base, started: T.started, paused: T.paused }, m = T.moments.find(x => x.key === key);
  Object.assign(T, { key, base: Date.parse(m.at), started: Date.now(), paused: true });
  try { return fn(); } finally { Object.assign(T, keep); }
}
const momNow = () => `<section class="fxm-card">${S(App.homeParts.momentBody(App.homeParts.leagueMoment()))}</section>`; // built: the app's own moment renderer
const MOMS = [['draft', 'Draft night', momNow], ['fa', 'Free agency', momNow], ['camp', 'Training camp', momNow]];
/** what a moment hero says, read from the real one */
function momData(html) {
  const d = document.createElement('div'); d.innerHTML = html;
  const t = (e, s) => { const x = e.querySelector(s); return x ? x.textContent.trim() : ''; };
  const cd = d.querySelector('[data-countdown]'), otc = d.querySelector('.hm-otc');
  return { live: !!d.querySelector('.badge.live'), kick: [...d.querySelectorAll('.hm-kicker')].map(x => x.textContent.trim()).join(' · '), title: t(d, '.hm-display'),
    ts: cd ? +cd.dataset.countdown : null, otc: otc ? { logo: otc.querySelector('img').src, name: t(otc, '.hm-display'), sub: [...otc.querySelectorAll('.hm-sub')].map(x => x.textContent.trim()) } : null,
    rows: [...d.querySelectorAll('.hm-pick')].map(r => ({ no: t(r, '.hm-pno'), logo: (r.querySelector('img') || {}).src, title: t(r, '.b') || t(r, '.grow'), sub: t(r, '.grow .tiny') || t(r, ':scope > .tiny') })),
    lasts: [...d.querySelectorAll('.hm-last')].map(r => ({ eb: t(r, '.eyebrow'), logo: (r.querySelector('img') || {}).src, title: t(r, '.b') || (r.querySelector('.eyebrow') ? t(r, '.num') : r.textContent.trim()), sub: t(r, '.tiny') })),
    acts: [...d.querySelectorAll('.hm-actions .btn')].map(x => x.textContent.trim()) };
}
const cdown = ts => { if (!ts) return ''; let s = Math.max(0, Math.floor((ts - App.time.now()) / 1000)); const dd = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600), mi = Math.floor(s % 3600 / 60);
  return `<div class="r6m-cd">${(dd ? [[dd, dd === 1 ? 'day' : 'days'], [h, 'hrs'], [mi, 'min']] : [[h, 'hrs'], [mi, 'min'], [Math.floor(s % 60), 'sec']]).map(([v, l]) => `<div><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`).join('')}</div>`; };
const mrow = r => `<div class="r6m-r">${r.no ? `<span class="r6m-no">${esc(r.no)}</span>` : ''}${r.logo ? `<span class="r6v-disc s"><img src="${r.logo}" alt=""></span>` : ''}<span class="r6m-rt"><b>${esc(r.title)}</b>${r.sub ? `<span>${esc(r.sub)}</span>` : ''}</span></div>`;
const mlast = l => `<div class="r6m-r">${l.logo ? `<span class="r6v-disc s"><img src="${l.logo}" alt=""></span>` : ''}<span class="r6m-rt">${l.eb ? `<span class="r6v-eb">${esc(l.eb)}</span>` : ''}<b>${esc(l.title)}</b>${l.sub ? `<span>${esc(l.sub)}</span>` : ''}</span></div>`;
/** the moment's body, shared by every option: eyebrow, title, countdown or who is on the clock, the list, the buttons */
function momBody(M, glass) {
  const otc = M.otc ? `<div class="r6m-otc"><span class="r6v-disc"><img src="${M.otc.logo}" alt=""></span><span class="r6m-rt"><span class="r6v-eb">On the clock</span><b class="r6m-otn">${esc(M.otc.name)}</b><span>${esc(M.otc.sub.slice(1).join(' · '))}</span></span></div>` : '';
  const list = M.rows.length || M.lasts.length ? `<div class="r6m-list">${M.rows.map(mrow).join('')}${M.lasts.map(mlast).join('')}</div>` : '';
  return `<div class="r6m-k">${M.live ? '<span class="badge live solid">Live</span>' : ''}<span class="r6v-eb">${esc(M.kick)}</span></div>
    ${M.otc ? otc : `<div class="r6m-t">${esc(M.title)}</div>${cdown(M.ts)}`}${list}
    <div class="r6v-acts"><button class="btn white">${esc(M.acts[0] || '')}</button>${M.acts[1] ? `<button class="btn ${glass ? 'hm-glass' : ''}">${esc(M.acts[1])}</button>` : ''}</div>`;
}
const MOM_OPTS = {
  // a: the card under the stage, on the approved parts
  a: (M, key) => `<section class="r6v r6m-a" style="${App.teamVars(Dt.team(App.store.p.primary || '12'))}">${momBody(M, 1)}</section>`,
  // b: the moment takes the game-card slot inside your team's stage
  b: (M, key) => { const d = document.createElement('div'); d.innerHTML = atMoment(key, () => stage('v3'));
    const g = d.querySelector('.fx-game'), slot = `<div class="fx-game r6m-slot">${momBody(M, 1)}</div>`;
    if (g) g.outerHTML = slot; else { const n = d.querySelector('.fx-nums, .fx-run'); if (n) n.insertAdjacentHTML('beforebegin', slot); else d.querySelector('.fx-in').insertAdjacentHTML('beforeend', slot); }
    d.querySelectorAll('.fx-run,.fx-nums').forEach(x => x.remove()); return d.innerHTML; },
  // c: the league's poster: NFL navy, the moment huge, your team in a white strip at the bottom
  c: (M, key) => `<section class="r6v r6m-c" ${NFL_SURF}>${momBody(M, 1)}</section>`,
};
const momSet = k => MOMS.map(([key, l, fn]) => { const M = atMoment(key, () => momData(S(fn()))); return `<p class="r6-k">${l}</p>${atMoment(key, () => MOM_OPTS[k](M, key))}`; }).join('');
R['home-moment-heroes'] = { id: 'home-moment-heroes', v: 1, ready: true, name: 'Draft, free agency and camp heroes', target: 'home.js draftHero() faHero() kickoffHero() · .hm-hero',
  changes: [
    'The card Home shows in the offseason, each at its real moment from the time machine: Draft night (Round 1 live), Free agency (league year open) and Training camp (countdown to kickoff).',
    'Every option: the kicker is the Eyebrow role (today Display italic 15); the countdown is Display numbers with Meta labels; rows are logo, Sans bold title, Meta line; the faint logo watermark goes; buttons are squared M.',
    'A, card on the approved parts: the same card under your stage, in your team gradient, rebuilt from those parts.',
    'B, inside your stage: no second hero. The moment takes the game card\'s slot in your team\'s stage, like a game does in season.',
    'C, league poster: the moment in NFL navy, the countdown at poster size; your team\'s line stays in the list.'],
  options: [{ k: 'a', name: 'Card on approved parts', note: 'Same place, rebuilt.' }, { k: 'b', name: 'Inside your stage', note: 'The moment replaces the game card in the stage.' }, { k: 'c', name: 'League poster', note: 'NFL navy, poster-size countdown.' }],
  current: () => V('As the app draws it', 'momentCard() in home.js', PH(MOMS.map(([key, l, fn]) => `<p class="r6-k">${l}</p>${S(atMoment(key, fn))}`).join(''))),
  proposed: k => V('Moment hero', 'Home in the offseason', PH(momSet(k))) };



/* ------------------------------------------------------------------ stat of the day */
/** what today's stat is, read from the real module (it rotates by day), then the top five from the data */
function sotdData() {
  const d = document.createElement('div'); d.innerHTML = S(App.homeParts.statOfDay()); const a = d.querySelector('.more'); if (!a || !d.querySelector('.h3')) return null; // built: the module no longer has the sentence
  const q = new URLSearchParams(a.dataset.go.split('?')[1]), path = q.get('stat'), s = +q.get('s');
  const h = d.querySelector('.h3').textContent, noun = h.replace(/^.* with [\d,.]+\s*/, ''), cat = d.querySelector('.eyebrow').textContent.split(' · ')[0];
  const L = Dt.leaders(s, path, 5), v = n => Number.isInteger(n) ? fmt.n(n) : fmt.n(n, 1);
  return { s, cat, noun, L: L.map(x => ({ ...x, p: Dt.player(x.pid) || { n: x.n }, tm: Dt.team(x.tid), vs: v(x.v) })), v };
}
const hs6 = (pid, c = '') => S(UI.hs(pid, c));
const SOTD = {
  // a: the number is the picture, on the leader's team gradient; the chasers as a ladder on glass
  a: D => { const L = D.L, top = L[0];
    return `<div class="r6d r6d-a" style="${App.teamVars(top.tm)}"><div class="r6v-eb">Stat of the day · ${esc(D.cat)}</div>
      <div class="r6d-big">${top.vs}</div><div class="r6d-noun">${esc(D.noun)}, most in the NFL</div>
      <div class="r6d-who">${hs6(top.pid, 'lg')}<span class="r6m-rt"><b>${esc(top.p.n)}</b><span>${esc(top.tm.name)} · ${top.gp} games</span></span></div>
      <div class="r6d-lad">${L.slice(1).map((x, i) => `<div class="r6d-lr"><span class="r6m-no">${i + 2}</span><span class="r6d-ln">${esc(x.p.n)}</span><i class="r4-m"><i style="width:${Math.round(x.v / top.v * 100)}%"></i></i><b>${x.vs}</b></div>`).join('')}</div></div>`; },
  // b: a leaderboard card on the surface: the sentence, then five player lines with a meter in each team's colour
  b: D => { const L = D.L, top = L[0];
    return `<div class="r6d r6d-b"><div class="r6d-bh"><span class="r6v-eb">Stat of the day · ${esc(D.cat)}</span></div>
      <div class="r6d-sent"><b>${esc(top.p.n)}</b> leads the NFL with <b>${top.vs}</b> ${esc(D.noun)}</div>
      ${L.map((x, i) => `<div class="r6d-br${i ? '' : ' on'}" style="--c:${App.teamFill(x.tm)}"><span class="r6m-no">${i + 1}</span>${hs6(x.pid, 'sm')}<span class="r6d-bt"><b>${esc(x.p.n)}</b><i class="r6d-bm"><i style="width:${Math.round(x.v / top.v * 100)}%"></i></i></span><b class="r6d-bv">${x.vs}</b></div>`).join('')}</div>`; },
  // c: the race: the leader and the chaser face off, the gap between them in the middle
  c: D => { const [a, b] = D.L; if (!b) return SOTD.a(D); const gap = D.v(a.v - b.v);
    const side = (x, r) => `<div class="r6d-cs${r ? ' r' : ''}">${hs6(x.pid, 'lg')}<b class="r6d-cv">${x.vs}</b><span class="r6m-rt"><b>${esc(x.p.n)}</b><span>${esc(x.tm.abbr)} · ${x.gp} games</span></span></div>`;
    return `<div class="r6d r6d-c" style="--ca:${App.teamFill(a.tm)};--cb:${App.teamFill(b.tm)}"><div class="r6v-eb">Stat of the day · ${esc(D.cat)}</div>
      <div class="r6d-q">The ${esc(D.noun)} race</div><div class="r6d-race">${side(a)}<div class="r6d-gap"><b>+${gap}</b><span>ahead</span></div>${side(b, 1)}</div>
      <i class="r6d-split"><i style="width:${Math.round(a.v / (a.v + b.v) * 100)}%"></i></i></div>`; },
};
R['home-sotd'] = { id: 'home-sotd', v: 1, ready: true, name: 'Stat of the day', target: 'homeParts.statOfDay() · .hm-sotd',
  changes: ['Today\'s real stat and its real top five. Every option: section head as today, 12 px card, headshots on the approved headshot atom, numbers in Display or Stats bold by role, meters on the 6 px meter atom.',
    'A, big number: the number is the picture on the leader\'s team gradient, the next four as a ladder.',
    'B, leaderboard: the sentence, then five player lines with a meter in each player\'s team colour.',
    'C, the race: the leader and the chaser face off, the gap in the middle, a split bar in both teams\' colours.'],
  options: [{ k: 'a', name: 'Big number', note: 'Team gradient, huge number, ladder.' }, { k: 'b', name: 'Leaderboard', note: 'Five lines, team-colour meters.' }, { k: 'c', name: 'The race', note: 'Leader vs chaser, the gap.' }],
  current: () => V('As the app draws it', 'homeParts.statOfDay() in home.js', PH(S(App.homeParts.statOfDay()))),
  proposed: k => { const D = sotdData(); return V('Stat of the day', 'Home sheet', PH(D ? SOTD[k](D) : none('No stat at this moment.'))); } };

/* ------------------------------------------------------------------ daily trivia */
function triviaData() {
  const d = document.createElement('div'); d.innerHTML = S(App.homeParts.triviaTeaser()); const q = d.querySelector('.h3'); if (!q) return null;
  const opts = [...d.querySelectorAll('.hm-opt')].map(b => { const [, id, win] = b.dataset.arg.split(':'); return { id, win: id === win, t: Dt.team(id) }; });
  return { q: q.textContent.trim(), eb: d.querySelector('.eyebrow').textContent.trim(), opts };
}
/* v2: A's styling (white card, Display question, squared tiles), no helmets */
const TRIV = {
  // a: four tiles across: Display abbreviation over a big logo
  a: (T, ans) => `<div class="r6q6 r6q6-a"><div class="r6v-eb">${esc(T.eb)}</div><div class="r6q6-q">${esc(T.q)}</div>
    <div class="r6q6-4">${T.opts.map(o => `<button class="r6q6-t${ans && o.win ? ' right' : ''}"><b>${esc(o.t.abbr)}</b><img src="${o.t.logo}" alt=""></button>`).join('')}</div>${ans ? res6(T) : ''}</div>`,
  // b: two by two: big logo and the team name in Display side by side
  b: (T, ans) => `<div class="r6q6 r6q6-a"><div class="r6v-eb">${esc(T.eb)}</div><div class="r6q6-q">${esc(T.q)}</div>
    <div class="r6q6-2">${T.opts.map(o => `<button class="r6q6-w${ans && o.win ? ' right' : ''}"><img src="${o.t.logo}" alt=""><b>${esc(o.t.name)}</b></button>`).join('')}</div>${ans ? res6(T) : ''}</div>`,
};
const res6 = T => `<div class="r6q6-res"><span class="badge win">Correct</span><span class="r6v-meta">+10 points · ${esc(T.opts.find(o => o.win).t.full)}</span></div>`;
R['home-trivia'] = { id: 'home-trivia', v: 2, ready: true, name: 'Daily trivia', target: 'homeParts.triviaTeaser() · .hm-trivia .hm-opt',
  was: ['v1: team tiles with helmets, navy quiz card, logos only.'],
  changes: ['v2, from your note ("We use the helmets too much, but i like the styling of this"): v1 A\'s card, Display question and squared tiles, with no helmets. Each is shown before you answer and after a right answer (Positive outline, Correct badge).',
    'A, four across: the Display abbreviation over a big logo.',
    'B, two by two: a big logo beside the team name in Display.'],
  options: [{ k: 'a', name: 'Four across', note: 'Abbreviation over a big logo.' }, { k: 'b', name: 'Two by two', note: 'Logo beside the team name.' }],
  current: () => V('As the app draws it', 'homeParts.triviaTeaser() in home.js', PH(S(App.homeParts.triviaTeaser()))),
  proposed: k => { const T = triviaData(); return V('Daily trivia', 'Home sheet', PH(T ? `<p class="r6-k">Before you answer</p>${TRIV[k](T)}<p class="r6-k">After a right answer</p>${TRIV[k](T, 1)}` : none('No question at this moment.'))); } };


/* ------------------------------------------------------------------ what's at stake */
const gb6 = (a, b) => ((a.w - b.w) + (b.l - a.l)) / 2, gms = n => `${n % 1 ? n : n.toFixed(0)} game${n === 1 ? '' : 's'}`;
/** your team, as the stage shows it */
const myTeam6 = () => { const d = document.createElement('div'); d.innerHTML = S(App.homeParts.fanHeader()); const a = d.querySelector('.fx-name'); return a ? a.dataset.go.split('/').pop() : null; };
function stakeData() {
  const mine = myTeam6(); if (!mine) return null;
  const tm = Dt.team(mine), s = Dt.seasonForStats(), st = Dt.standings(s), div = st.div[tm.conf + ' ' + tm.div] || [];
  if (!div.some(r => r.gp)) return null;
  const me = div.find(r => r.tid === mine), conf = st.conf[tm.conf].slice().sort((a, b) => a.seed - b.seed), pr = Dt.powerRank(s), r = pr && pr.of[mine];
  const lead = div.indexOf(me) === 0 ? (div[1] ? gb6(me, div[1]) : 0) : -gb6(div[0], me);
  const rid = ((App.store.p || {}).rivals || []).find(id => id !== mine) || (div.filter(x => x.tid !== mine).sort((a, b) => Math.abs(gb6(a, me)) - Math.abs(gb6(b, me)))[0] || {}).tid;
  return { mine, tm, s, div, me, conf, pr: r, lead, rid };
}
const recOf = r => `${r.w}-${r.l}${r.tie ? '-' + r.tie : ''}`;
function stakeTable(K, cls = '') {
  return `<div class="r6x-tbl ${cls}">${K.div.map((r, i) => `<div class="r6x-row${r.tid === K.mine ? ' me' : ''}" style="${r.tid === K.mine ? App.teamVars(K.tm) : ''}"><span class="r6x-n">${i + 1}</span>${S(UI.logo(r.tid, 'sm'))}<b class="r6x-nm">${esc(r.t.name)}</b><span class="r6x-rec">${recOf(r)}</span><span class="r6x-gb">${i ? (gb6(K.div[0], r) || '—') : '—'}</span></div>`).join('')}</div>`;
}
function rivalRow(K) {
  if (!K.rid) return ''; const last = Dt.lastGame(K.rid), nx = Dt.nextGame(K.rid), r = last && !Dt.spoiled(last) ? Dt.result(last, K.rid) : null;
  return `<div class="r6x-rival">${S(UI.logo(K.rid, 'md'))}<span class="r6m-rt"><span class="r6v-eb">Rival watch</span><b>${esc(Dt.team(K.rid).name)} <span class="r6x-rec">${Dt.record(K.rid, K.s).str}</span></b><span>${r ? `${r.r} ${r.us}-${r.them} ${Dt.isHome(last, K.rid) ? 'vs' : 'at'} ${esc(Dt.team(Dt.opp(last, K.rid)).name)}` : ''}${nx ? ` · next ${Dt.isHome(nx, K.rid) ? 'vs' : 'at'} ${Dt.team(Dt.opp(nx, K.rid)).abbr} ${fmt.day(nx.ts)}` : ''}</span></span>${S(App.icon('chev', 'sm'))}</div>`;
}
const STAKE = {
  // a: three big facts (the race, the seed, the power ranking), then the division and your rival
  a: K => { const f = [[K.lead > 0 ? `+${K.lead}` : K.lead < 0 ? `${K.lead}` : 'Tied', K.lead > 0 ? `games clear atop the ${K.tm.div}` : K.lead < 0 ? `back of the ${K.div[0].t.name}` : `atop the ${K.tm.div}`],
      [`No. ${K.me.seed}`, K.me.seed === 1 ? 'seed, the only bye' : K.me.seed <= 7 ? `seed in the ${K.tm.conf}` : `in the ${K.tm.conf}, out today`], K.pr ? [`No. ${K.pr.rk}`, 'power ranking'] : null].filter(Boolean);
    return `<div class="r6x">${`<div class="r6x-facts">${f.map(([v, l]) => `<div><b>${v}</b><span>${esc(l)}</span></div>`).join('')}</div>`}${stakeTable(K)}${rivalRow(K)}</div>`; },
  // b: the conference seed ladder, 1 to 10, the playoff line after 7, you in your colour
  b: K => { const L = K.conf.slice(0, 10);
    return `<div class="r6x"><div class="r6x-say">${K.me.seed <= 7 ? `In the playoffs today as the <b>No. ${K.me.seed} seed</b>` : `<b>${gms(Math.max(0, gb6(K.conf[6], K.me)))} out</b> of the last spot`}</div>
      <div class="r6x-lad">${L.map((r, i) => `${i === 7 ? '<div class="r6x-line"><span>Playoff line</span></div>' : ''}<div class="r6x-row${r.tid === K.mine ? ' me' : ''}" style="${r.tid === K.mine ? App.teamVars(K.tm) : ''}"><span class="r6x-n">${r.seed}</span>${S(UI.logo(r.tid, 'sm'))}<b class="r6x-nm">${esc(r.t.name)}</b><span class="r6x-rec">${recOf(r)}</span>${i < 4 ? '<span class="badge">Div</span>' : '<span class="badge">WC</span>'}</div>`).join('')}</div>${rivalRow(K)}</div>`; },
  // c: one Display sentence, then the division
  c: K => `<div class="r6x"><div class="r6x-head">${K.lead > 0 ? `${gms(K.lead)} clear.` : K.lead < 0 ? `${gms(-K.lead)} back.` : 'Tied atop.'} ${K.me.seed <= 7 ? `No. ${K.me.seed} seed.` : 'Out today.'}</div><div class="r6v-meta r6x-sub">${esc(K.tm.conf + ' ' + K.tm.div)}${K.pr ? ` · No. ${K.pr.rk} in the power rankings` : ''}</div>${stakeTable(K)}${rivalRow(K)}</div>`,
};
R['home-stakes'] = { id: 'home-stakes', v: 1, ready: true, name: 'What\'s at stake', target: 'homeParts.stakesBlock() · .sk .sk-tbl .sk-rival',
  changes: ['Your team\'s race, from the real standings. Today the card uses the class .sk, which is also the loading skeleton, so it picks up the skeleton\'s pulse and 12 px height; every option renames it.',
    'Every option: rows on the approved L2 pieces (logo S, Display name, Stats record), your row in your team colour, rival watch as one row atom.',
    'A, three facts: the lead, the seed and the power ranking as Display numbers, then the division and your rival.',
    'B, seed ladder: the conference 1 to 10 with the playoff line drawn after 7, division winners and wild cards labelled.',
    'C, one sentence: the race in Display ("1 game clear. No. 1 seed."), then the division.'],
  options: [{ k: 'a', name: 'Three facts', note: 'Lead, seed, rank, then the table.' }, { k: 'b', name: 'Seed ladder', note: 'Conference 1–10, playoff line.' }, { k: 'c', name: 'One sentence', note: 'Display headline, then the table.' }],
  current: () => V('As the app draws it', 'homeParts.stakesBlock() in home.js', PH(S(App.homeParts.stakesBlock()))),
  proposed: k => { const K = stakeData(); return V('What\'s at stake', 'Home sheet', PH(K ? `<div class="r6x-sec"><h3 class="r6x-h">What's at stake</h3></div>${STAKE[k](K)}` : none('No race at this moment.'))); } };

/* ------------------------------------------------------------------ recaps */
function recapData() {
  const now = App.time.now(), mine = myTeam6();
  return Dt.D.games.filter(g => g.t !== 1 && g.st === 'post' && Dt.state(g) === 'post' && now - g.ts < 30 * 864e5 && (Dt.box(g.id) || {}).rh)
    .sort((a, b) => ((b.a === mine || b.h === mine) - (a.a === mine || a.h === mine)) || b.ts - a.ts).slice(0, 4).map(g => ({ g, b: Dt.box(g.id), hide: Dt.spoiled(g) }));
}
/* v3: logo and score only, smaller, with clear space between the score and the story */
const recRow = (cls, { g, b, hide }) => `<div class="r6r-a ${cls}"><div class="r6r-sc r6r-notri">${UI.lk1Game(g).map(S).join('')}</div><span class="r6m-rt"><b>${esc(hide ? `${Dt.team(g.a).name} at ${Dt.team(g.h).name}` : b.rh)}</b><span>${esc(Dt.weekLabel(g.t, g.w))} · ${esc(fmt.day(g.ts))}</span></span></div>`;
const RECAP = {
  // a: a hairline between the score and the story
  a: R6 => `<div class="r6r-list">${R6.map(x => recRow('v3 rule', x)).join('')}</div>`,
  // b: the score in its own small tile
  b: R6 => `<div class="r6r-list">${R6.map(x => recRow('v3 tile', x)).join('')}</div>`,
};
R['home-recaps'] = { id: 'home-recaps', v: 3, ready: true, name: 'Recaps', target: 'home.js recapsBlock() · .hm-recap .hm-mini-sc',
  was: ['v1: rows with L1 lines, picture rail, featured.', 'v2: rows, logo and score.'],
  changes: ['v3, from your note on v2 ("the score size is a little big and… there needs to be more separation between the score and the rest of the content"): the score drops from 22 to 17 px, and the score block gets 16 px of clear space before the story.',
    'A, a hairline: a vertical rule between the score and the story.',
    'B, a tile: the score sits in its own small squared tile.'],
  options: [{ k: 'a', name: 'Hairline', note: 'A rule between score and story.' }, { k: 'b', name: 'Score tile', note: 'The score in its own tile.' }],
  current: () => V('As the app draws it', 'recapsBlock() in home.js', PH(S(App.homeParts.recapsBlock(new Set())))),
  proposed: k => V('Recaps', 'Home sheet', PH(`<div class="r6x-sec"><h3 class="r6x-h">Recaps</h3></div>${RECAP[k](recapData())}`)) };


/* ------------------------------------------------------------------ your players */
const PL = {
  // a: player lines (L3) with the stat line in Stats; fantasy is a footnote in Meta
  a: rows => `<div class="r6pl-list">${rows.map(r => `<div class="r6pl-a">${hs6(r.pid, 'sm')}<span class="r6m-rt"><b>${esc(r.p.n)}${r.live ? ' <span class="badge live solid">Live</span>' : ''}</b><span class="r6pl-line">${esc(r.text)}</span><span>${esc([r.p.pos, Dt.team(r.p.t).abbr, r.sub].filter(Boolean).join(' · '))}${r.fp != null ? ` · ${r.fp.toFixed(1)} fantasy pts` : ''}</span></span></div>`).join('')}</div>`,
  // b: a rail of player cards: headshot on the team gradient, name, the stat line
  b: rows => `<div class="r6r-rail">${rows.map(r => `<div class="r6pl-b"><div class="r6pl-top" style="${App.teamVars(Dt.team(r.p.t))}">${hs6(r.pid, 'lg')}${r.live ? '<span class="badge live solid">Live</span>' : ''}</div><div class="r6pl-bb"><b>${esc(r.p.n)}</b><span class="r6pl-line">${esc(r.text)}</span><span class="r6v-meta">${esc(r.sub || r.p.pos)}</span></div></div>`).join('')}</div>`,
  // c: live first: players in a game now get a live block with the score status, the rest a compact list
  c: rows => { const L = rows.filter(r => r.live), O = rows.filter(r => !r.live);
    return `${L.length ? `<div class="r6pl-live">${L.map(r => `<div class="r6pl-a">${hs6(r.pid, 'sm')}<span class="r6m-rt"><b>${esc(r.p.n)}</b><span class="r6pl-line">${esc(r.text)}</span></span><span class="badge live solid">${esc(r.sub.split(' · ').pop())}</span></div>`).join('')}</div>` : ''}
      <div class="r6pl-list">${O.map(r => `<div class="r6pl-c">${hs6(r.pid, 'sm')}<b>${esc(r.p.n)}</b><span class="r6pl-line">${esc(r.text)}</span></div>`).join('')}</div>`; },
};
/** run fn with a sample profile patch (this page's profile follows no players or extra teams), then put it back */
function withProfile(patch, fn) { const P = App.store.p, keep = {}; Object.keys(patch).forEach(k => { keep[k] = P[k]; P[k] = patch[k]; }); try { return fn(); } finally { Object.assign(P, keep); } }
const samplePlayers = () => { const s = Dt.seasonForStats(); return ['passing.passingYards', 'rushing.rushingYards', 'receiving.receivingYards', 'defensive.sacks'].map(k => (Dt.leaders(s, k, 1)[0] || {}).pid).filter(Boolean); };
const sampleTeams = () => { const m = myTeam6() || '12'; return [m, ...['2', '21', '9'].filter(x => x !== m)]; };
const plRows = () => { const r = withProfile({ players: samplePlayers() }, () => App.homeParts.trackerRows()); return r.length ? r : null; };
R['home-players'] = { id: 'home-players', v: 1, ready: true, name: 'Your players', target: 'home.js tracker() trackerRows()',
  changes: ['The players you follow, with their last or live game. Fantasy stays a footnote (your rule). Every option: headshots on the approved atom, names Sans bold, stat lines in Stats.',
    'A, player lines: one L3 line each, the stat line under the name, fantasy points in the Meta line.',
    'B, player rail: swipeable cards, headshot on the team gradient, Live badge on the picture.',
    'C, live first: players in a game right now in their own block with the clock, the rest as one-line rows.'],
  options: [{ k: 'a', name: 'Player lines', note: 'L3 lines, fantasy in Meta.' }, { k: 'b', name: 'Player rail', note: 'Cards on team gradients.' }, { k: 'c', name: 'Live first', note: 'Live block, then the rest.' }],
  current: () => V('As the app draws it', 'tracker() in home.js · with four sample players', PH(withProfile({ players: samplePlayers() }, () => S(App.homeParts.tracker())))),
  proposed: k => { const rows = plRows(); return V('Your players', 'Home sheet', PH(rows ? `<div class="r6x-sec"><h3 class="r6x-h">Your players</h3></div>${PL[k](rows)}` : none('No followed players in this profile.'))); } };

/* ------------------------------------------------------------------ your other teams */
function otData() {
  const d = document.createElement('div'); d.innerHTML = withProfile({ teams: sampleTeams() }, () => S(App.homeParts.otherTeams()));
  return [...d.querySelectorAll('.hm-tm')].map(a => { const nm = a.querySelector('.b').textContent.trim(), t = Dt.D.teams.find(x => x.name === nm);
    return t && { tid: t.id, line: (a.querySelector('.meta') || {}).textContent || '', live: !!a.querySelector('.badge.live') }; }).filter(Boolean);
}
const OT = {
  // a: small cards in each team's gradient: logo, Display name, record, the game line
  a: T => `<div class="r6r-rail">${T.map(x => { const t = Dt.team(x.tid); return `<div class="r6ot-a" style="${App.teamVars(t)}">${disc6(t)}<b>${esc(t.name)}</b><span>${Dt.record(x.tid, Dt.seasonForStats()).str}</span><span>${esc(x.line)}</span>${x.live ? '<span class="badge live solid">Live</span>' : ''}</div>`; }).join('')}</div>`,
  // b: L2 rows: logo, Display name and record, the game line on the right
  b: T => `<div class="r6pl-list">${T.map(x => { const t = Dt.team(x.tid); return `<div class="r6ot-b">${S(UI.logo(x.tid, 'md'))}<span class="r6m-rt"><b class="r6ot-nm">${esc(t.name)}</b><span class="r6pl-line">${Dt.record(x.tid, Dt.seasonForStats()).str}</span></span><span class="r6ot-r">${x.live ? '<span class="badge live solid">Live</span>' : ''}${esc(x.line)}</span></div>`; }).join('')}</div>`,
};
R['home-other-teams'] = { id: 'home-other-teams', v: 1, ready: true, name: 'Your other teams', target: 'home.js otherTeams() · .hm-tm',
  changes: ['Teams you follow besides your own, each with its live, next or last game. Every option: logos on the approved atom, team names in Display, records in Stats.',
    'A, colour cards: a swipeable row of small cards, each in its team\'s gradient.',
    'B, rows: one L2 row per team on the surface, the game on the right.'],
  options: [{ k: 'a', name: 'Colour cards', note: 'Swipeable, team gradients.' }, { k: 'b', name: 'Rows', note: 'L2 rows on the surface.' }],
  current: () => V('As the app draws it', 'otherTeams() in home.js · with three sample teams', PH(withProfile({ teams: sampleTeams() }, () => S(App.homeParts.otherTeams())))),
  proposed: k => { const T = otData(); return V('Your other teams', 'Home sheet', PH(T.length ? `<div class="r6x-sec"><h3 class="r6x-h">Your other teams</h3></div>${OT[k](T)}` : none('This profile follows only one team.'))); } };


/* ------------------------------------------------------------------ your weekend / kickoffs, your time */
function weekendData(level, extra) {
  const d = document.createElement('div'); d.innerHTML = withProfile({ level, ...(extra || {}) }, () => App.homeParts.forYou().map(S).join(''));
  const sec = [...d.querySelectorAll('section')].find(x => x.querySelector('.fy-when')); if (!sec) return null;
  return { title: sec.querySelector('.h2').textContent, rows: [...sec.querySelectorAll('.row')].map(r => ({ g: Dt.game((r.dataset.go || '').split('/').pop()), sub: (r.querySelector('.row-sub') || {}).textContent || '' })).filter(x => x.g) };
}
const { html, raw, icon } = App;
/* v2, from your note on v1 ("i like how the app currently draws it but wish you'd use the team logos"): the app's own rows, with the logos added */
const wkWhen = g => html`<div class="fy-when"><b>${fmt.time(g.ts)}</b><span>${fmt.day(g.ts)}</span></div>`;
/* v5, from your note on v4 ("still looks off, and now the 'live' looks weird by itself"): rebuilt from the row up. The Live pill always has the game clock under it, so it never stands alone */
const wkTv = sub => esc(sub.replace(/^Watch on /, '').replace(' / ', '/'));
const wkLive = g => { const sc = Dt.score(g); return `<span class="badge live">Live</span><span class="r6wa-clk">${esc(sc.label || '')}</span>`; };
const WK = {
  // a: a schedule row: logos, the matchup with where to watch under it, the kickoff on the right (time over day), or Live over the clock
  a: W => `<div class="list">${W.rows.map(({ g, sub }) => { const lv = /^Live/.test(sub);
    return `<div class="row tap r6wa-r"><span class="r6wa-lg">${S(UI.logo(g.a, 'sm'))}${S(UI.logo(g.h, 'sm'))}</span><div class="row-main"><div class="r6wa-mu">${esc(Dt.team(g.a).name)} at ${esc(Dt.team(g.h).name)}</div><div class="r6wa-m">${lv ? 'On ' + esc((g.tv || []).join('/')) : wkTv(sub)}</div></div><div class="r6wa-k">${lv ? wkLive(g) : `<b>${esc(fmt.time(g.ts))}</b><span>${esc(fmt.day(g.ts))}</span>`}</div></div>`; }).join('')}</div>`,
  // b: grouped by day: a day heading, then each game with the time (or Live over the clock) on the left, logos and the matchup, where to watch under it
  b: W => { const days = [...new Set(W.rows.map(r => fmt.day(r.g.ts)))];
    return days.map(dy => `<div class="r6wa-day">${esc(dy)}</div><div class="list">${W.rows.filter(r => fmt.day(r.g.ts) === dy).map(({ g, sub }) => { const lv = /^Live/.test(sub);
      return `<div class="row tap r6wa-r"><div class="r6wa-t">${lv ? wkLive(g) : `<b>${esc(fmt.time(g.ts))}</b>`}</div><span class="r6wa-lg">${S(UI.logo(g.a, 'sm'))}${S(UI.logo(g.h, 'sm'))}</span><div class="row-main"><div class="r6wa-mu">${esc(Dt.team(g.a).name)} at ${esc(Dt.team(g.h).name)}</div><div class="r6wa-m">${lv ? 'On ' + esc((g.tv || []).join('/')) : wkTv(sub)}</div></div></div>`; }).join('')}</div>`).join(''); },
};
R['home-weekend'] = { id: 'home-weekend', v: 5, ready: true, name: 'Your weekend / Kickoffs, your time', target: 'home.js forYou() casual and intl · .fy-when',
  was: ['v1: rows by day / kickoff cards.', 'v2: logo pair after the time / logos on the right.', 'v3: logos above the matchup.', 'v4: Live alone in the left column; partner as text or pill.'],
  changes: ['v5, from your note on v4 ("still looks off, and now the \'live\' looks weird by itself"): rebuilt from the row up. Each row is: the two logos side by side, the matchup (Sans bold 15), where to watch under it (Meta), and the kickoff. A live game shows the Live pill with the game clock under it, so it never stands alone. Where to watch stays under the heading.',
    'A, kickoff on the right: time in Display over the day in Meta, like a schedule; Live over the clock in the same spot.',
    'B, by day: a day heading, then each game with the time on the left; Live over the clock in the time slot.'],
  options: [{ k: 'a', name: 'Kickoff on the right', note: 'Time over day, right-aligned.' }, { k: 'b', name: 'By day', note: 'Day headings, time on the left.' }],
  current: () => V('As the app draws it', 'forYou() for a casual fan', PH(withProfile({ level: 'casual', teams: sampleTeams() }, () => App.homeParts.forYou().map(S).join('')) || none('No games this week.'))),
  proposed: k => { const W = weekendData('casual', { teams: sampleTeams() }); return V('Your weekend', 'Home sheet', PH(W && W.rows.length ? `<div class="sec-head r6w9-head"><div class="h2">${esc(W.title)}</div><a class="more">Where to watch${S(icon('chev', 'xs'))}</a></div>${WK[k](W)}` : none('No games this week.'))); } };

/* ------------------------------------------------------------------ by the numbers (stats fans) */
function numData() {
  const mine = myTeam6(), s = Dt.seasonForStats(), ts = Dt.teamSeason(mine, s); if (!ts || !ts.g) return null;
  const sg = v => (v >= 0 ? '+' : '') + v.toFixed(2);
  return [[sg(ts.epaPlay), 'Offense EPA per play', Dt.teamRank(mine, s, 'epaPlay')], [(ts.succRate * 100).toFixed(1) + '%', 'Success rate', Dt.teamRank(mine, s, 'succRate')],
    [sg(ts.dPlays ? ts.dEpa / ts.dPlays : 0), 'Defense EPA per play', Dt.teamRank(mine, s, 'dEpa', true)], [(ts.explRate * 100).toFixed(1) + '%', 'Explosive plays', Dt.teamRank(mine, s, 'explRate')]];
}
const NUM = {
  // a: four rows: the label, the value in Stats, a league-rank meter and the rank
  a: N => `<div class="r6pl-list">${N.map(([v, l, r]) => `<div class="r6n6-r"><span class="r6m-rt"><b>${esc(l)}</b><span>${ord(r)} in NFL</span></span><i class="r6d-bm r6n6-m"><i style="width:${Math.round((33 - r) / 32 * 100)}%;--c:var(--text)"></i></i><b class="r6n6-v">${v}</b></div>`).join('')}</div>`,
  // b: two by two tiles led by the rank in Display, the value under it
  b: N => `<div class="r6n6-g">${N.map(([v, l, r]) => `<div class="r6n6-t"><b>${ord(r)}</b><span class="r6n6-l">${esc(l)}</span><span class="r6pl-line">${v}</span></div>`).join('')}</div>`,
};
R['home-numbers'] = { id: 'home-numbers', v: 1, ready: true, name: 'By the numbers', target: 'home.js forYou() analyst · .fy-tiles',
  changes: ['For stats fans: four advanced numbers for your team with their league rank. Today they are four stat tiles.',
    'A, rank rows: the label and rank on the left, a rank meter, the value in Stats on the right.',
    'B, rank tiles: two by two, the rank leads in Display, the value under it in Stats.'],
  options: [{ k: 'a', name: 'Rank rows', note: 'Label, meter, value.' }, { k: 'b', name: 'Rank tiles', note: 'Rank first, value under.' }],
  current: () => V('As the app draws it', 'forYou() for a stats fan', PH(withProfile({ level: 'analyst' }, () => App.homeParts.forYou().map(S).join('')) || none('No numbers yet.'))),
  proposed: k => { const N = numData(); return V('By the numbers', 'Home sheet', PH(N ? `<div class="r6x-sec"><h3 class="r6x-h">By the numbers</h3></div>${NUM[k](N)}` : none('No numbers yet.'))); } };

/* ------------------------------------------------------------------ inside the team (die-hards) */
const injS = st => /Injured Reserve/i.test(st) ? 'IR' : /Physically Unable/i.test(st) ? 'PUP' : st;
function insideData() {
  const mine = myTeam6(); if (!mine) return null;
  const recent = fmt.dayKey(App.time.now() - 30 * 864e5);
  return { tm: Dt.team(mine), inj: Dt.injuries(mine).slice(0, 5), mv: Dt.tx({ team: mine }).filter(r => r.dt >= recent).sort((a, b) => b.dt.localeCompare(a.dt)).slice(0, 3) };
}
const sev = st => /Out|Reserve|Physically/i.test(st) ? 'loss' : 'warn';
/* v2, from your note on v1 A ("put Out or Questionable in a pill"): two groups as you picked, the status in a pill */
const pill = st => `<span class="badge ${sev(st)}">${esc(injS(st))}</span>`;
const mvRows = D => D.mv.length ? `<div class="r6w6-day">Moves</div>${D.mv.map(r => `<div class="r6in-mv"><b class="r6in-dt">${esc(fmt.date(r.dt + 'T12:00:00Z'))}</b><span>${esc(r.x)}</span></div>`).join('')}` : '';
const IN = {
  // a: the pill on the right of each player
  a: D => `<div class="r6pl-list">${D.inj.length ? `<div class="r6w6-day">Injury report</div>${D.inj.map(i => `<div class="r6pl-a">${S(UI.hs(i.p, 'sm'))}<span class="r6m-rt"><b>${esc(i.n)}</b><span>${esc(i.pos)} · ${esc(i.ty || 'Injury')}</span></span>${pill(i.s)}</div>`).join('')}` : ''}${mvRows(D)}</div>`,
  // b: the pill leads the Meta line under the name
  b: D => `<div class="r6pl-list">${D.inj.length ? `<div class="r6w6-day">Injury report</div>${D.inj.map(i => `<div class="r6pl-a">${S(UI.hs(i.p, 'sm'))}<span class="r6m-rt"><b>${esc(i.n)}</b><span class="r6in-ml">${pill(i.s)}${esc(i.pos)} · ${esc(i.ty || 'Injury')}</span></span></div>`).join('')}` : ''}${mvRows(D)}</div>`,
};
R['home-inside'] = { id: 'home-inside', v: 2, ready: true, name: 'Inside the team', target: 'home.js forYou() diehard',
  was: ['v1: A two groups with the status as a coloured word / B a status board.'],
  changes: ['v2, from your note on v1 A ("put Out or Questionable in a pill"): your pick, two groups (injury report, then moves), with the status in the app\'s badge pill: red for Out and IR, amber for Questionable.',
    'A, the pill on the right.',
    'B, the pill at the start of the line under the name.'],
  options: [{ k: 'a', name: 'Pill on the right', note: 'Status at the row end.' }, { k: 'b', name: 'Pill under the name', note: 'Status leads the Meta line.' }],
  current: () => atMoment('now', () => V('As the app draws it', 'forYou() for a die-hard, Week 6 eve', PH(withProfile({ level: 'diehard' }, () => App.homeParts.forYou().map(S).join('')) || none('Nothing new inside the team.')))),
  proposed: k => { const D = atMoment('now', insideData); return V('Inside the team', 'Home sheet', PH(D && (D.inj.length || D.mv.length) ? `<div class="r6x-sec"><h3 class="r6x-h">Inside the ${esc(D.tm.name)}</h3></div>${IN[k](D)}` : none('Nothing new inside the team.'))); } };

/* ------------------------------------------------------------------ watch it fresh (spoiler shield on) */
function freshData() {
  const T = sampleTeams(), mine = T[0];
  const fin = Dt.D.games.filter(g => (T.includes(g.h) || T.includes(g.a)) && Dt.state(g) === 'post' && App.time.now() - g.ts < 9 * 864e5).slice(-3).reverse();
  return fin.map(g => { const me = [g.a, g.h].find(id => T.includes(id)); return { g, me, opp: Dt.opp(g, me) }; });
}
const FR = {
  // a: no paragraph; the shield is a pill in the header; one row per game: your logo vs theirs, the week, a Watch button
  a: F => `<div class="list">${F.map(({ g, me, opp }) => S(UI.row({ left: html`<span class="r6w7-pair">${UI.logo(me, 'sm')}${UI.logo(opp, 'sm')}</span>`, title: `${Dt.team(g.a).name} at ${Dt.team(g.h).name}`, sub: `${Dt.weekLabel(g.t, g.w)} · Full replay`, right: html`<span class="btn xs ink">${icon('play', 'xs')}Watch</span>` }))).join('')}</div>`,
  // b: replay cards in a rail: a scoreless L1 lockup (– for the score), the week, a full-width Watch button
  b: F => `<div class="r6r-rail">${F.map(({ g }) => `<div class="r6w6-c r6fr-c"><span class="r6v-eb">${esc(Dt.weekLabel(g.t, g.w))} · ${esc(fmt.day(g.ts))}</span><div class="r6fr-l">${[g.a, g.h].map(id => S(UI.lk1(id, '–'))).join('')}</div><span class="btn sm ink">${S(icon('play', 'xs'))}Watch replay</span></div>`).join('')}</div>`,
};
R['home-fresh'] = { id: 'home-fresh', v: 1, ready: true, name: 'Watch it fresh', target: 'home.js forYou() spoiler',
  changes: ['For fans who watch later (spoiler shield on): their teams\' finished games, ready to replay, with no scores. Today a grey card explains the shield, then lists the games.',
    'A, rows: the explanation becomes a "Shield on" pill in the header; one row per game with both logos and a Watch button.',
    'B, replay cards: a rail, each card with the L1 lockup with scores hidden (–), the week, and a Watch replay button.'],
  options: [{ k: 'a', name: 'Rows', note: 'Pill in the header, Watch per row.' }, { k: 'b', name: 'Replay cards', note: 'A rail with hidden scores.' }],
  current: () => V('As the app draws it', 'forYou() with the spoiler shield on', PH(withProfile({ spoiler: { on: true }, teams: sampleTeams() }, () => App.homeParts.forYou().map(S).join('')) || none('No games to watch.'))),
  proposed: k => { const F = freshData(); return V('Watch it fresh', 'Home sheet', PH(F.length ? `<div class="sec-head"><div class="h2">Watch it fresh</div><span class="r6fr-pill">${S(icon('eyeoff', 'xs'))}Shield on</span></div>${FR[k](F)}` : none('No games to watch.'))); } };

/* ------------------------------------------------------------------ new to football */
const NF = [['football', 'How a game works', 'Four quarters, four downs, ten yards. The 60-second version.', '1 min'], ['trophy', 'How the playoffs work', '14 teams, one bye per conference, one Super Bowl.', '2 min'], ['users', 'Who to watch', 'The players everyone will be talking about on Monday.', '2 min']];
const NFT = ['Down & distance', 'Red Zone', 'Turnover', 'Wild Card', 'Bye week'];
const NEW = {
  // a: a numbered lesson list, the time each takes on the right, the words to know under it
  a: () => `<div class="r6pl-list">${NF.map(([ic, t, s, m], i) => `<div class="r6pl-a"><b class="r6nf-n">${i + 1}</b><span class="r6m-rt" style="flex:1"><b>${esc(t)}</b><span>${esc(s)}</span></span><span class="r6v-meta">${m}</span></div>`).join('')}</div>
    <div class="r6w6-day">Words you'll hear</div><div class="flex wrap gap6">${NFT.map(w => `<button class="chip">${S(icon('help', 'sm'))}${esc(w)}</button>`).join('')}</div>`,
  // b: one featured lesson in the NFL shield blue, the other two as rows, then the words
  b: () => `<div class="r6nf-f">${S(icon(NF[0][0]))}<span class="r6v-eb">Start here · ${NF[0][3]}</span><b>${esc(NF[0][1])}</b><span>${esc(NF[0][2])}</span><span class="btn sm white">Start</span></div>
    <div class="r6pl-list" style="margin-top:8px">${NF.slice(1).map(([ic, t, s, m]) => `<div class="r6pl-a">${S(icon(ic))}<span class="r6m-rt" style="flex:1"><b>${esc(t)}</b><span>${esc(s)}</span></span><span class="r6v-meta">${m}</span></div>`).join('')}</div>
    <div class="r6w6-day">Words you'll hear</div><div class="flex wrap gap6">${NFT.map(w => `<button class="chip">${S(icon('help', 'sm'))}${esc(w)}</button>`).join('')}</div>`,
};
R['home-newfan'] = { id: 'home-newfan', v: 1, ready: true, name: 'New to football?', target: 'home.js newFanCards()',
  changes: ['For new fans: three short lessons and the words they\'ll hear. Today three icon cards in a scrolling row plus term chips.',
    'A, a numbered list: lessons 1, 2, 3 with how long each takes, then "Words you\'ll hear".',
    'B, start here: the first lesson as a featured card in NFL blue, the other two as rows, then the words.'],
  options: [{ k: 'a', name: 'Numbered list', note: 'Lessons in order.' }, { k: 'b', name: 'Start here', note: 'One featured lesson.' }],
  current: () => V('As the app draws it', 'newFanCards()', PH(withProfile({ level: 'new' }, () => S(App.homeParts.newFanCards ? App.homeParts.newFanCards() : '')) || none('Only for new fans.'))),
  proposed: k => V('New to football?', 'Home sheet', PH(`<div class="sec-head"><div class="h2">New to football?</div><a class="more">Football 101${S(icon('chev', 'xs'))}</a></div>${NEW[k]()}`)) };

/* ------------------------------------------------------------------ weekly recap story */
const wrData = () => atMoment('now', () => withProfile({ primary: '21', teams: ['21'], players: samplePlayers() }, () => App.homeParts.recapSlides()));
/* v2, from your note on v1 B: a slide about your team keeps your colours; a slide about other teams or players (players off your team, around the league) goes to the NFL blue */
const wrGeneric = (R, k) => { const t = S(R.slides[k]); return /Around the league/.test(t) || (/Your players/.test(t) && /class="wr-tm"/.test(t) && [...t.matchAll(/class="wr-tm">([^<]+)</g)].some(m => m[1] !== R.tm.abbr)); };
const wrFrames = (R, cls, all) => `<div class="r6wr-grid">${R.slides.slice(0, all ? 6 : 4).map((_, k) => `<div class="r6wr-ph ${cls}${all && wrGeneric(R, k) ? ' gen' : ''}"><div class="r6wr-in">${S(App.homeParts.recapHtml(R, k))}</div></div>`).join('')}</div>`;
R['weekly-recap'] = { id: 'weekly-recap', v: 2, ready: true, name: 'Weekly recap story', target: 'homeParts.recapHtml() recapSlides() · .wr',
  was: ['v1: A clean on colour / B white panel (headline on colour, data on a white panel).'],
  changes: ['v2, from your note on v1 B ("if i follow other teams or players not on my favorite team, there should be a more generic color for those screens"): your pick, the white panel. Slides about your team (cover, your game, where you stand, up next) keep your team\'s colours; "Your players" goes to NFL blue when any of them plays for another team, and "Around the league" is always NFL blue. All six slides, Eagles after Week 5.',
    'A, NFL blue: the league\'s shield blue, 180° to 42%, the same as the pick-your-team hero.',
    'B, neutral ink: a near-black slate, so the only colour on those slides is the logos and headshots.'],
  options: [{ k: 'a', name: 'NFL blue', note: 'The shield blue for league slides.' }, { k: 'b', name: 'Neutral ink', note: 'Slate for league slides.' }],
  current: () => { const R = wrData(); return V('As the app draws it', 'recapHtml(), first four slides', PH(R ? wrFrames(R, 'cur') : none('No finished week.'))); },
  proposed: k => { const R = wrData(); return V(k === 'a' ? 'NFL blue' : 'Neutral ink', 'Weekly recap', PH(R ? wrFrames(R, 'b g' + k, true) : none('No finished week.'))); } };

/* ------------------------------------------------------------------ player page: hero, season, games (Matthew Stafford, the league's passing leader, at Week 6 eve) */
const PS = () => App.PS;
function plData() {
  const s = Dt.seasonForStats(), pid = (Dt.leaders(s, 'passing.passingYards', 1)[0] || {}).pid, p = Dt.player(pid); if (!p) return null;
  const L = (PS().totals(s) || {})[pid], grp = PS().groupOf(pid, L), tm = Dt.team(p.t);
  const keys = PS().KEY_STATS[grp] || [];
  const stats = keys.map(k => { const st = PS().STAT[k], rk = PS().rankOf(pid, s, k, grp); return { v: PS().fmtStat(PS().sval(L, st), st), l: st.l, rk: rk && (!st.q || st.q(L)) ? rk.r : null }; });
  const log = Dt.gameLog(pid, s) || [], last = log.slice(-1)[0], next = Dt.nextGame(p.t, App.time.now());
  return { s, pid, p, L, grp, tm, stats, last, next, fr: PS().fantasyRank(pid, s, grp), gn: PS().GROUP_NAME[grp] };
}
const atNow = fn => atMoment('now', fn);
const lnSize = D => Math.min(48, Math.floor(165 / Math.max(4, (D.p.ln || D.p.n).length) / .56));   // the app's own fit rule
const plBtns = (D, solid) => `<div class="r6ph-btns"><span class="btn sm ${solid ? 'ink' : 'white'}">${S(icon('plus', 'sm'))}Follow</span><span class="btn sm ${solid ? 'ghost r6ph-sq' : 'fx-line'}">${S(icon('bell', 'sm'))}Alerts</span><span class="btn sm ${solid ? 'ghost r6ph-sq' : 'fx-line'}">${S(icon('swap', 'sm'))}Compare</span></div>`;
const plBio = D => [['Age', D.p.age ?? '—', ''], ['Height', (D.p.ht || '—').replace(/\s/g, ''), ''], ['Weight', (D.p.wt || '—').replace(' lbs', ''), 'lbs'], ['Exp', D.p.exp ?? '—', 'yrs']];
const PH6 = {
  // a: poster on team colour: 180deg to 42%, every word full white, white buttons (no tints), the bio as four cells on the colour split by white hairlines
  a: D => `<div class="r6ph-a" style="${App.teamVars(D.tm)}"><div class="r6ph-in"><div class="r6ph-tx"><div class="r6ph-meta">#${esc(D.p.j || '–')} · ${esc(D.p.pos)} · <u>${esc(D.tm.name)}</u></div><div class="r6ph-fn">${esc(D.p.fn || '')}</div><div class="r6ph-ln" style="font-size:${lnSize(D)}px">${esc(D.p.ln || D.p.n)}</div></div><img class="r6ph-shot" src="${Dt.headshot(D.pid)}" alt=""></div>
    ${plBtns(D)}<div class="r6ph-bio">${plBio(D).map(([l, v, u]) => `<div><b>${esc(v)}${u ? `<small>${u}</small>` : ''}</b><span>${l}</span></div>`).join('')}</div></div>`,
  // b: a shorter band on team colour for the name and headshot; a white card overlaps it with the bio and the buttons, squared, in the app's normal colours
  b: D => `<div class="r6ph-b"><div class="r6ph-band" style="${App.teamVars(D.tm)}"><div class="r6ph-in"><div class="r6ph-tx"><div class="r6ph-meta">#${esc(D.p.j || '–')} · ${esc(D.p.pos)} · <u>${esc(D.tm.name)}</u></div><div class="r6ph-fn">${esc(D.p.fn || '')}</div><div class="r6ph-ln" style="font-size:${lnSize(D)}px">${esc(D.p.ln || D.p.n)}</div></div><img class="r6ph-shot" src="${Dt.headshot(D.pid)}" alt=""></div></div>
    <div class="r6ph-card"><div class="r6ph-cbio">${plBio(D).map(([l, v, u]) => `<div><b>${esc(v)}${u ? `<small>${u}</small>` : ''}</b><span>${l}</span></div>`).join('')}</div>${plBtns(D, true)}</div></div>`,
};
R['player-hero'] = { id: 'player-hero', v: 1, ready: true, name: 'Player page: hero', target: 'player.js hero() · .pl-hero .pl-bio',
  changes: ['The top of every player page. Today: a dark 90° shade over the team gradient, faded white meta and first name, translucent ghost buttons, and the bio as a separate strip under it. Those break your rules (no faded text, no white tints, 180° gradients).',
    'A, poster: the gradient runs 180° to 42%; all text full white; Follow in white and Alerts / Compare as outline buttons (the approved stage buttons); the bio sits on the colour as four cells split by white hairlines.',
    'B, band and card: a shorter colour band holds the name and headshot; a white squared card overlaps it with the bio and the three buttons in the app\'s normal colours.'],
  options: [{ k: 'a', name: 'Poster', note: 'Everything on colour, white and outline buttons.' }, { k: 'b', name: 'Band and card', note: 'Bio and buttons on a white card.' }],
  current: () => atNow(() => { const D = plData(); return V('As the app draws it', 'player.js hero()', D ? `<div class="r6ph-cur">${S(PS().hero(D.pid, D.p, D.tm, D.grp, D.L, D.s))}</div>` : none('No player.')); }),
  proposed: k => atNow(() => { const D = plData(); return V(k === 'a' ? 'Poster' : 'Band and card', 'Player page', D ? PH6[k](D) : none('No player.')); }) };

const PSN = {
  // a: rank rows: label and rank on the left, a league-rank meter, the value in Stats on the right (the By the numbers A pattern)
  a: D => `<div class="r6pl-list">${D.stats.map(x => `<div class="r6n6-r"><span class="r6m-rt"><b>${esc(x.l)}</b><span>${x.rk ? `${ord(x.rk)} among ${esc(D.gn)}` : 'Not ranked'}</span></span><i class="r6d-bm r6n6-m"><i style="width:${x.rk ? Math.max(4, Math.round((33 - Math.min(x.rk, 32)) / 32 * 100)) : 0}%;--c:var(--text)"></i></i><b class="r6n6-v">${esc(x.v)}</b></div>`).join('')}</div>`,
  // b: lead stat: the first stat big in Display with its rank, the other three in a row of small tiles
  b: D => { const [h, ...r] = D.stats; return `<div class="r6ps-lead"><span class="r6v-eb">${esc(h.l)}</span><b>${esc(h.v)}</b><span>${h.rk ? `${ord(h.rk)} among ${esc(D.gn)}` : ''}</span></div><div class="r6ps-row">${r.map(x => `<div><b>${esc(x.v)}</b><span>${esc(x.l)}</span><em>${x.rk ? ord(x.rk) : '—'}</em></div>`).join('')}</div>`; },
};
const psFoot = D => `<div class="r6ps-foot">${D.L.gp} games${D.L.fpts ? ` · Fantasy (PPR) ${D.L.fpts.toFixed(1)}${D.fr ? `, ${ord(D.fr)} ${esc(D.grp)}` : ''}` : ''}</div>`;
R['player-season'] = { id: 'player-season', v: 1, ready: true, name: 'Player page: season line', target: 'player.js overview() · season tiles',
  changes: ['The first block on Overview: the season\'s four key numbers with league rank. Today four stat tiles with the rank in green when top 5, and a footer with games and fantasy.',
    'A, rank rows: label and rank, a rank meter, the value in Stats (the same pattern as By the numbers A).',
    'B, lead stat: the headline number big in Display with its rank, the other three in a row underneath.',
    'Both: fantasy stays a footnote in the Meta line.'],
  options: [{ k: 'a', name: 'Rank rows', note: 'Label, meter, value.' }, { k: 'b', name: 'Lead stat', note: 'One big number, three small.' }],
  current: () => atNow(() => { const D = plData(); if (!D) return none('No player.'); const d = document.createElement('div'); d.innerHTML = PS().overview(D.pid, D.p, D.tm, D.grp, D.s, D.L, {}, { state: {} }, D.s).map(S).join(''); const sec = d.querySelector('.sec'); return V('As the app draws it', 'overview() season block', PH(sec ? sec.outerHTML : none('No season.'))); }),
  proposed: k => atNow(() => { const D = plData(); return V(k === 'a' ? 'Rank rows' : 'Lead stat', 'Player page · Overview', PH(D ? `<div class="r6x-sec"><h3 class="r6x-h">${esc(PS().seasonLabel(D.s))}</h3></div>${PSN[k](D)}${psFoot(D)}` : none('No player.'))); }) };

/* v4, from your note on v3 B ("the alignment of the logo, vs, and bills is off"): one centre line for all three, and the logo sized to the name's cap height */
const pgRow = (g, tid, nm, sub, k) => { const d = document.createElement('div'); d.innerHTML = S(UI.gameRow(g, tid)); const r = d.firstElementChild, o = Dt.opp(g, tid);
  const lg = r.querySelector(':scope > .logo, :scope > img'); if (lg) lg.remove();
  const vs = `<span class="r6pg4-vs">${Dt.isHome(g, tid) ? 'vs' : '@'}</span>`, logo = `<span class="r6pg4-lg">${S(UI.logo(o, 'sm'))}</span>`, name = `<span class="lk-nm r6pg4-nm">${esc(nm(Dt.team(o)))}</span>`;
  const t = r.querySelector('.row-title'); t.innerHTML = k === 'a' ? vs + logo + name : logo + vs + name; t.className = 'row-title r6pg4-t';
  if (sub != null) { const sb = r.querySelector('.row-sub'); sb.textContent = sub; sb.classList.add('r6pg3-line'); }
  return r.outerHTML; };
const pgName = t => (t.loc === 'New York' || t.loc === 'Los Angeles') ? t.short : t.name;
const pgList = (D, k) => `<div class="r6pg-lb">Last game · Week ${D.last ? D.last.g.w : ''}</div><div class="list">${D.last ? pgRow(D.last.g, D.p.t, pgName, PS().lineSummary(D.last.cats, D.grp), k) : ''}</div>
  <div class="r6pg-lb">Next</div><div class="list">${D.next ? pgRow(D.next, D.p.t, pgName, null, k) : ''}</div>`;
R['player-games'] = { id: 'player-games', v: 4, ready: true, name: 'Player page: last and next game', target: 'player.js overview() liveRow() lastRow() nextRow()',
  was: ['v1: two tiles / L1 rows.', 'v2: UI.gameRow(); B his line as the second line.', 'v3: logo beside the team; B with the team name.'],
  changes: ['v4, from your note on v3 B ("the alignment of the logo, vs, and bills is off"): "vs", the logo and the name now share one centre line. The logo is 20 px (the name\'s cap height plus a little), "vs" is Meta 12 px nudged to the Display face\'s optical centre, and the gaps are an even 6 px.',
    'A, "vs [logo] Bills", as v3.',
    'B, "[logo] vs Bills", so the logo leads the row like the schedule.'],
  options: [{ k: 'a', name: 'vs, logo, name', note: 'As v3, aligned.' }, { k: 'b', name: 'Logo, vs, name', note: 'Logo leads.' }],
  current: () => atNow(() => { const D = plData(); if (!D) return none('No player.'); const d = document.createElement('div'); d.innerHTML = PS().overview(D.pid, D.p, D.tm, D.grp, D.s, D.L, {}, { state: {} }, D.s).map(S).join(''); const sec = [...d.querySelectorAll('.sec')].find(x => /Games|Live now/.test(x.textContent.slice(0, 40))); return V('As the app draws it', 'overview() games block', PH(sec ? sec.outerHTML : none('No games.'))); }),
  proposed: k => atNow(() => { const D = plData(); return V(k === 'a' ? 'vs, logo, name' : 'Logo, vs, name', 'Player page · Overview', PH(D ? `<div class="r6x-sec"><h3 class="r6x-h">Games</h3></div>${pgList(D, k)}` : none('No player.'))); }) };

/* ------------------------------------------------------------------ player tables: game log, career, splits (one decision for all three) */
const plTab = (fn, D) => { const pg = { state: {} }; return S(PS()[fn](D.pid, D.p, D.tm, D.grp, D.s, D.L, (NFL.d.careers || {})[D.pid] || {}, pg)); };
/* the career and splits files load on demand (as on the real page): draw a placeholder, then paint when they arrive */
let tbN = 0;
const tbLater = (D, k) => { const id = 'tb' + (++tbN), at = App.time.key;
  setTimeout(() => Promise.all([App.load('careers'), App.load('splits')]).then(() => { const el = document.getElementById(id); if (el) el.innerHTML = atMoment(at, () => tbSet(D, k)); }), 0);
  return `<div id="${id}">${S(UI.loading())}</div>`; };
/* v2, from your note on v1 B ("this needs some spacing and other minor improvements. do good work"): rebuilt from the real tab markup into one card per tab */
/* v3 pickers, from the design system: a season is the Scores season chip (squared, a down chevron, opens a sheet); a category is the small tabs from the game page's Plays tab (UI.tabs sm) in A, or UI.seg in B */
function tcHead(title, chips, k) {
  const items = chips ? [...chips.querySelectorAll('.chip')].map(c => ({ k: c.textContent.trim(), l: c.textContent.trim(), on: c.classList.contains('on') })) : [];
  const years = items.length && items.every(x => /^\d{4}$/.test(x.l)), on = (items.find(x => x.on) || items[0] || {}).k;
  const season = years ? `<button class="sc-season r6tc-sea">${esc(on)}${S(icon('down', 'xs'))}</button>` : '';
  // v4 B: the category is a chip too (the same chip as the season, opening a sheet), so every table has one picker in the same place
  const catChip = k === 'v4b' && !years && items.length ? `<button class="sc-season r6tc-sea">${esc(on)}${S(icon('down', 'xs'))}</button>` : '';
  const cats = !years && items.length && !catChip ? `<div class="r6tc-cat">${S(k === 'b' ? UI.seg(items, on, 'x') : UI.tabs(items, on, 'x', 'sm'))}</div>` : '';
  return `<div class="r6tc-h"><span class="r6tc-t">${title}</span>${season}${catChip}</div>${cats}`;
}
function tbCard(title, html, k) {
  const d = document.createElement('div'); d.innerHTML = html;
  const chips = d.querySelector('.chips'), chart = d.querySelector('svg'), wrap = d.querySelector('.tbl-wrap'), foot = d.querySelector('.tiny'), empty = d.querySelector('.empty');
  if (empty) return `<div class="r6tc"><div class="r6tc-h"><span class="r6tc-t">${title}</span></div>${empty.outerHTML}</div>`;
  if (chart) { // ink bars, the best in the team colour with its value on top; readable week labels
    const rects = [...chart.querySelectorAll('rect')], vals = rects.map(r => +r.getAttribute('height')), mx = Math.max(...vals);
    rects.forEach(r => { r.removeAttribute('opacity'); r.setAttribute('fill', +r.getAttribute('height') === mx ? 'var(--tg-b)' : 'var(--text)'); r.setAttribute('rx', 3); });
    chart.querySelectorAll('text').forEach(t => { t.setAttribute('font-size', 10.5); t.setAttribute('fill', 'var(--text-2)'); });
  }
  const tbl = wrap && wrap.querySelector('table');
  if (tbl) {
    tbl.querySelectorAll('.c-win,.c-loss').forEach(x => x.classList.add('r6tc-pill'));
    const sep = tbl.querySelector('tr.sep td'); if (sep) sep.innerHTML = sep.textContent.replace(/^Total · (\d+) G$/, 'Total <span>$1 games</span>').replace(/^Career$/, 'Career');
    if (/v4/.test(k)) { // v4: the first header says what the rows are, never repeats the picked category; the first column stays put while the rest scroll
      const th = tbl.querySelector('th'), on = chips && chips.querySelector('.chip.on'); if (th && on && th.textContent.trim().toLowerCase() === on.textContent.trim().toLowerCase()) th.textContent = 'Split';
      tbl.querySelectorAll('tr').forEach(r => r.firstElementChild && r.firstElementChild.classList.add('r6tc-stick'));
      // v5 A: one key column (yards, else tackles / points) stays bold
      const ths = [...tbl.querySelectorAll('thead th')].map(x => x.textContent.trim().toUpperCase()), ki = ['YDS', 'TKL', 'PTS'].map(h => ths.indexOf(h)).find(i => i > 0);
      if (ki > 0) tbl.querySelectorAll('tbody tr').forEach(r => r.children[ki] && r.children[ki].classList.add('k')); }
    const body = [...tbl.querySelectorAll('tbody tr:not(.sep)')];
    if (body.length > 6) { body.slice(6).forEach(r => r.classList.add('r6tc-more')); tbl.querySelector('tbody').insertAdjacentHTML('beforeend', ''); }
    var more = body.length > 6 ? `<button class="r6tc-all">Show all ${body.length} ${/Season/.test(tbl.querySelector('th').textContent) ? 'seasons' : 'games'}${S(icon('chev', 'xs'))}</button>` : '';
  }
  const label = chart && (chart.previousElementSibling || chart.parentElement.previousElementSibling);
  const lab = d.querySelector('.eyebrow');
  return `<div class="r6tc r6tc-${k.split(' ').join(' r6tc-')}">${tcHead(title, chips, k)}
    ${chart ? `<div class="r6tc-chart">${lab ? `<span class="r6tc-eb">${esc(lab.textContent)}</span>` : ''}${chart.outerHTML}</div>` : ''}
    ${tbl ? `<div class="r6tc-tbl">${tbl.outerHTML}</div>${/v4/.test(k) ? '<div class="r6tc-hint">Swipe the table for more columns</div>' : ''}${more}` : ''}</div>${foot ? `<div class="r6tc-foot">${esc(foot.textContent)}</div>` : ''}`;
}
const tbSet = (D, k) => [['Game log', plTab('gamelog', D)], ['Career', plTab('careerTab', D)], ['Splits', plTab('splits', D)]].map(([t, h]) => k === 'cur' ? `<div class="r6tb-t">${t}</div><div class="r6tb-cur">${h}</div>` : tbCard(t, h, k.split(' ').pop())).join('');
R['player-tables'] = { id: 'player-tables', v: 5, ready: true, name: 'Player page: stat tables', target: 'player.js gamelog() careerTab() splits() · .tbl, barChart() · roles.css',
  was: ['v1: quiet table / in a card.', 'v2: one card per tab, a squared segmented picker.', 'v3: small tabs / UI.seg.', 'v4: pinned first column, sideways scroll, aligned tabs; you picked A (small tabs).'],
  changes: ['v5, from your note on v4 A ("the all bolded text is a bit much"). Why it stayed bold: the app tags every number with the stat-number type role (Stats Bold, approved in round 5), and that role beat the table CSS. Tables now get their own exception: numbers in a table body are Stats Regular.',
    'Opponent tricodes and season years drop to medium too. Layout, tabs and scrolling are v4 A unchanged.',
    'A, one bold column: the category\'s key stat (YDS) and the totals row stay Stats Bold, so the eye has one column to run down.',
    'B, all regular: only the totals row is bold.'],
  options: [{ k: 'a', name: 'Key column bold', note: 'YDS and totals bold.' }, { k: 'b', name: 'All regular', note: 'Totals bold only.' }],
  current: () => atNow(() => { const D = plData(); return V('As the app draws it', 'Game log, Career, Splits tabs', D ? PH(tbLater(D, 'cur')) : none('No player.')); }),
  proposed: k => atNow(() => { const D = plData(); return V(k === 'a' ? 'Key column bold' : 'All regular', 'Player page tabs', D ? PH(`<div class="r6tc-reg ${k === 'b' ? 'r6tc-reg-all' : ''}" style="${App.teamVars(D.tm)}">${tbLater(D, 'b v4a')}</div>`) : none('No player.')); }) };

/* ------------------------------------------------------------------ player advanced */
const advFill = (D, k) => { const key = 'adv-' + D.pid + '-' + D.s;
  const paint = A => document.querySelectorAll(`.r6adv[data-key="${key}"][data-k="${k}"]`).forEach(el => { el.innerHTML = ADV[k] ? ADV[k](A, D) : S(PS().renderAdv(A, D.grp, D.pid, D.s)); });
  (window.__adv = window.__adv || {})[key] = window.__adv[key] || PS().advanced(D.pid, D.s);
  setTimeout(() => window.__adv[key].then(paint), 0);
  return `<div class="r6adv" data-key="${key}" data-k="${k}">${S(UI.loading())}</div>`; };
const advTiles = (A, D) => { const d = document.createElement('div'); d.innerHTML = S(PS().renderAdv(A, D.grp, D.pid, D.s));
  return { games: A.games, tiles: [...d.querySelectorAll('.stat-tile')].map(t => ({ v: (t.querySelector('.v') || {}).textContent || '', l: (t.querySelector('.l') || {}).textContent || '', sub: (t.querySelector('.r') || {}).textContent || '' })), dir: [A.dirL || 0, A.dirM || 0, A.dirR || 0] }; };
const ADV = {
  // a: the season-line pattern you approved: the headline number (EPA per dropback) big, the rest as small tiles; where he throws as three ink meters
  a: (A, D) => { const T = advTiles(A, D); if (!T.tiles.length) return none('No play-by-play.'); const [h, ...r] = T.tiles, t = T.dir.reduce((a, b) => a + b, 0);
    return `<div class="r6ps-lead"><span class="r6v-eb">${esc(h.l)}</span><b>${esc(h.v)}</b><span>${esc(h.sub)}</span></div><div class="r6ad-g">${r.map(x => `<div><b>${esc(x.v)}</b><span>${esc(x.l)}</span><em>${esc(x.sub)}</em></div>`).join('')}</div>
      ${t ? `<div class="r6ad-dir"><span class="r6v-eb">Where he throws</span>${['Left', 'Middle', 'Right'].map((l, i) => `<div class="r6n6-r"><span class="r6m-rt"><b>${l}</b></span><i class="r6d-bm r6n6-m"><i style="width:${Math.round(T.dir[i] / t * 100)}%;--c:var(--text)"></i></i><b class="r6n6-v">${Math.round(T.dir[i] / t * 100)}%</b></div>`).join('')}</div>` : ''}<div class="r6ps-foot">${T.games} games with play-by-play</div>`; },
  // b: one list of rows: the label with its context in Meta, the value in Stats on the right; where he throws as one split bar
  b: (A, D) => { const T = advTiles(A, D); if (!T.tiles.length) return none('No play-by-play.'); const t = T.dir.reduce((a, b) => a + b, 0);
    return `<div class="r6pl-list">${T.tiles.map(x => `<div class="r6n6-r r6ad-r"><span class="r6m-rt"><b>${esc(x.l)}</b><span>${esc(x.sub)}</span></span><b class="r6n6-v">${esc(x.v)}</b></div>`).join('')}</div>
      ${t ? `<div class="r6ad-split"><span class="r6v-eb">Where he throws</span><div class="r6ad-bar">${T.dir.map((v, i) => `<i style="flex:${v}"><b>${['Left', 'Middle', 'Right'][i]}</b><span>${Math.round(v / t * 100)}%</span></i>`).join('')}</div></div>` : ''}<div class="r6ps-foot">${T.games} games with play-by-play</div>`; },
};
R['player-advanced'] = { id: 'player-advanced', v: 1, ready: true, name: 'Player page: advanced', target: 'player.js advancedTab() renderAdv() dirBars()',
  changes: ['The Advanced tab: numbers we compute from play-by-play (EPA, success rate, sack rate, deep throws…) and where he throws. Today six identical stat tiles and three blue meters.',
    'A, the season-line pattern you approved for Overview: the headline number big with its context, the rest as small tiles; where he throws as three ink meter rows.',
    'B, a list: one row per number with its context in Meta and the value in Stats; where he throws as one split bar.'],
  options: [{ k: 'a', name: 'Lead number', note: 'Same pattern as the season line.' }, { k: 'b', name: 'Rows', note: 'Label, context, value.' }],
  current: () => atNow(() => { const D = plData(); return V('As the app draws it', 'renderAdv()', D ? PH(advFill(D, 'cur')) : none('No player.')); }),
  proposed: k => atNow(() => { const D = plData(); return V(k === 'a' ? 'Lead number' : 'Rows', 'Player page · Advanced', D ? PH(advFill(D, k)) : none('No player.')); }) };

/* ------------------------------------------------------------------ player contract */
function ctData(D) {
  const p = D.p; if (!p.sal) return null; const G = PS().GROUP;
  const peers = Object.entries(Dt.D.players).filter(([, x]) => x.sal && G[x.pos] === D.grp).sort((a, b) => b[1].sal - a[1].sal);
  const team = Object.entries(Dt.D.players).filter(([, x]) => x.t === p.t && x.sal).sort((a, b) => b[1].sal - a[1].sal);
  return { sal: fmt.money(p.sal), rk: peers.findIndex(([id]) => id === D.pid) + 1, of: peers.length, tr: team.findIndex(([id]) => id === D.pid) + 1, thru: p.thru, left: p.yr, top: team.slice(0, 5) };
}
const ctFoot = '<div class="r6ps-foot">Cash salary for the 2026 league year from ESPN. Salary-cap hits can differ because of bonuses and restructures.</div>';
const CT = {
  // a: the season-line pattern: the salary big with its rank among his position, then three small tiles; the team's top salaries as rows with the amount in Stats
  a: (C, D) => `<div class="r6ps-lead"><span class="r6v-eb">2026 salary</span><b>${esc(C.sal)}</b><span>${ord(C.rk)} of ${C.of} ${esc(D.gn)}</span></div>
    <div class="r6ps-row"><div><b>${ord(C.tr)}</b><span>On the ${esc(D.tm.name)}</span></div><div><b>${C.thru}</b><span>Signed through</span></div><div><b>${C.thru + 1}</b><span>Free agent</span></div></div>
    <div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">Top ${esc(D.tm.name)} salaries</h3></div><div class="r6pl-list">${C.top.map(([id, x]) => `<div class="r6pl-a${id === D.pid ? ' r6ct-me' : ''}">${S(UI.hs(id, 'sm'))}<span class="r6m-rt" style="flex:1"><b>${esc(x.n)}</b><span>${esc(x.pos)}</span></span><b class="r6n6-v">${esc(fmt.money(x.sal))}</b></div>`).join('')}</div>${ctFoot}`,
  // b: rank rows: where his salary ranks among his position, on his team, and his years left, each with a meter; then the same team list
  b: (C, D) => `<div class="r6pl-list"><div class="r6n6-r"><span class="r6m-rt"><b>2026 salary</b><span>${ord(C.rk)} of ${C.of} ${esc(D.gn)}</span></span><i class="r6d-bm r6n6-m"><i style="width:${Math.round((1 - (C.rk - 1) / C.of) * 100)}%;--c:var(--text)"></i></i><b class="r6n6-v">${esc(C.sal)}</b></div>
    <div class="r6n6-r"><span class="r6m-rt"><b>On the ${esc(D.tm.name)}</b><span>Contract size</span></span><i></i><b class="r6n6-v">${ord(C.tr)}</b></div>
    <div class="r6n6-r"><span class="r6m-rt"><b>Signed through ${C.thru}</b><span>Free agent in ${C.thru + 1}</span></span><i></i><b class="r6n6-v">${C.left != null ? C.left + ' yr left' : ''}</b></div></div>
    <div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">Top ${esc(D.tm.name)} salaries</h3></div><div class="r6pl-list">${C.top.map(([id, x], i) => `<div class="r6pl-a${id === D.pid ? ' r6ct-me' : ''}"><b class="r6ct-n">${i + 1}</b><span class="r6m-rt" style="flex:1"><b>${esc(x.n)}</b><span>${esc(x.pos)}</span></span><b class="r6n6-v">${esc(fmt.money(x.sal))}</b></div>`).join('')}</div>${ctFoot}`,
};
R['player-contract'] = { id: 'player-contract', v: 1, ready: true, name: 'Player page: contract', target: 'player.js contract()',
  changes: ['The Contract tab: his 2026 salary, how it ranks, when he can leave, and his team\'s top salaries. Today a big number card, a blue meter and two stat tiles, then a list.',
    'Copy: no "highest paid" language and no money talk beyond the facts (salary, rank, years); the footnote about cap hits stays.',
    'A, the season-line pattern: salary big with its rank among his position, three small tiles (rank on his team, signed through, free agent year), then the team list with headshots.',
    'B, rank rows: salary, team rank and years left as rows with one meter; the team list numbered 1–5.',
    'Both: his own row in the team list is marked with a bar in the team colour.'],
  options: [{ k: 'a', name: 'Lead number', note: 'Same pattern as the season line.' }, { k: 'b', name: 'Rank rows', note: 'Rows with a meter.' }],
  current: () => atNow(() => { const D = plData(); return V('As the app draws it', 'contract()', D ? PH(plTab('contract', D)) : none('No player.')); }),
  proposed: k => atNow(() => { const D = plData(), C = D && ctData(D); return V(k === 'a' ? 'Lead number' : 'Rank rows', 'Player page · Contract', C ? PH(`<div style="${App.teamVars(D.tm)}">${CT[k](C, D)}</div>`) : none('No contract on file.')); }) };

/* draw a placeholder, then paint once the data a card needs has loaded (the design page doesn't preload every season) */
let lzN = 0;
const lazy = (ready, fn) => { const id = 'lz' + (++lzN), at = App.time.key; setTimeout(() => Promise.resolve(ready()).then(() => { const el = document.getElementById(id); if (el) el.innerHTML = atMoment(at, fn); }), 0); return `<div id="${id}">${S(UI.loading())}</div>`; };
/* ------------------------------------------------------------------ team page: each card reuses a pattern you already approved (Chiefs, Week 6 eve) */
const TP = () => App.teamParts, TID = '12';
const tmD = () => { const s = Dt.seasonForStats(), tm = Dt.team(TID); return { s, tm, tid: TID }; };
const secOf = (html, re) => { const d = document.createElement('div'); d.innerHTML = html; const sec = [...d.querySelectorAll('.sec')].find(x => re.test((x.querySelector('.sec-head,.h2,h2') || x).textContent)); return sec ? sec.outerHTML : null; };

/* games on the team overview: the same rows as everywhere else */
R['team-games'] = { id: 'team-games', v: 1, ready: true, name: 'Team page: games', target: 'teams.js overview() · UI.gameCard()',
  changes: ['The first block on a team\'s Overview: live, next and last game. Today three Scores cards stacked, each with a week label.',
    'Same rule as your note on the player page: a team\'s game is drawn the way it is everywhere else.',
    'A, schedule rows: UI.gameRow(), the row the team schedule uses: opponent logo, vs / @ and the name, week · date · TV, result pill and score or kickoff on the right.',
    'B, Scores cards in a row: the Scores-tab card (both teams, both scores), side by side and swipeable, next game first.'],
  options: [{ k: 'a', name: 'Schedule rows', note: 'UI.gameRow(), as on the schedule.' }, { k: 'b', name: 'Scores cards rail', note: 'UI.gameCard(), swipeable.' }],
  current: () => atNow(() => { const D = tmD(); return V('As the app draws it', 'overview() games block', PH(secOf(S(TP().overview(TID, D.s)), /Games|Live now/) || none('No games.'))); }),
  proposed: k => atNow(() => { const live = Dt.liveGameFor(TID), next = Dt.nextGame(TID), last = Dt.lastGame(TID), G = [live, next && next !== live ? next : null, last].filter(Boolean);
    return V(k === 'a' ? 'Schedule rows' : 'Scores cards rail', 'Team page · Overview', PH(`<div class="r6x-sec"><h3 class="r6x-h">Games</h3></div>${k === 'a' ? `<div class="list">${G.map(g => S(UI.gameRow(g, TID))).join('')}</div>` : `<div class="r6r-rail">${G.map(g => `<div class="r6tg-c">${S(UI.gameCard(g, { weekLabel: true }))}</div>`).join('')}</div>`}`)); }) };

/* at a glance: the By the numbers pattern you approved on Home */
const glData = () => { const D = tmD(), o = TP().allSeasons(D.s)[TID]; if (!o || !o.g) return null; const rk = (k, l) => TP().rankOf(TID, D.s, k, l);
  return [[fmt.n(o.ppg, 1), 'Points per game', rk('ppg')], [fmt.n(o.papg, 1), 'Points allowed per game', rk('papg', true)], [fmt.n(o.ypg, 0), 'Yards per game', rk('ypg')], [(o.toDiff > 0 ? '+' : '') + o.toDiff, 'Turnover differential', rk('toDiff')]]; };
R['team-glance'] = { id: 'team-glance', v: 2, was: ['v1 drew "No stats" in your browser: the season\'s box scores hadn\'t loaded yet. The card now waits for them.'], ready: true, name: 'Team page: at a glance', target: 'teams.js statTiles()',
  changes: ['"2026 at a glance" on a team\'s Overview: four numbers with league rank. It\'s the same job as By the numbers on Home, which you approved as rank tiles.',
    'A, rank tiles, exactly the Home pattern: the rank leads in Display, the label, the value in Stats.',
    'B, the season-line pattern from the player page: points per game big with its rank, the other three small.'],
  options: [{ k: 'a', name: 'Rank tiles', note: 'Same as By the numbers.' }, { k: 'b', name: 'Lead number', note: 'Same as the player season line.' }],
  current: () => atNow(() => V('As the app draws it', 'statTiles()', PH(lazy(() => Dt.ensureBox(Dt.seasonForStats()), () => S(TP().statTiles(TID, tmD().s)) || none('No stats.'))))),
  proposed: k => atNow(() => V(k === 'a' ? 'Rank tiles' : 'Lead number', 'Team page · Overview', PH(lazy(() => Dt.ensureBox(Dt.seasonForStats()), () => glBody(k))))) };
const glBody = k => { const G = glData(), D = tmD(); if (!G) return none('No stats.');
    const body = k === 'a' ? `<div class="r6n6-g">${G.map(([v, l, r]) => `<div class="r6n6-t"><b>${ord(r)}</b><span class="r6n6-l">${esc(l)}</span><span class="r6pl-line">${esc(v)}</span></div>`).join('')}</div>`
      : `<div class="r6ps-lead"><span class="r6v-eb">${esc(G[0][1])}</span><b>${esc(G[0][0])}</b><span>${ord(G[0][2])} in the NFL</span></div><div class="r6ps-row">${G.slice(1).map(([v, l, r]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span><em>${ord(r)}</em></div>`).join('')}</div>`;
    return `<div class="r6x-sec"><h3 class="r6x-h">${D.s} at a glance</h3></div>${body}`; };

/* rivals and season by season: one row pattern for a team's record against something */
function rvData() { const tm = Dt.team(TID); return Dt.D.teams.filter(t => t.conf === tm.conf && t.div === tm.div && t.id !== TID).map(r => { const games = Dt.h2h(TID, r.id).filter(g => g.s >= 2022); let w = 0, l = 0; games.forEach(g => { const x = Dt.result(g, TID); if (x.r === 'W') w++; else if (x.r === 'L') l++; }); return { r, w, l, last: games[0] }; }); }
function histData() { return [2026, 2025, 2024, 2023, 2022].map(s => { const games = Dt.teamGames(TID, s).filter(g => g.t === 2 && Dt.state(g) === 'post'); if (!games.length) return null; const rec = Dt.record(TID, s), { place } = TP().divPlace(TID, s), post = Dt.teamGames(TID, s).filter(g => g.t === 3 && Dt.state(g) === 'post');
  let res, kind; if (post.length) { const last = post[post.length - 1], r = Dt.result(last, TID); if (r.r === 'W' && last.w === 5) { res = 'Won SB ' + Dt.sbNumeral(s); kind = 'gold'; } else { res = 'Lost ' + Dt.weekLabel(last.t, last.w, true).replace('Conf. Champ.', 'AFC title').replace('Super Bowl', 'SB'); kind = 'post'; } } else if (games.length >= 17) { res = 'Missed playoffs'; kind = 'out'; } else { res = 'In progress'; kind = 'now'; }
  return { s, rec: rec.str, place, res, kind }; }).filter(Boolean); }
const HS = {
  // a: rows: the year in Display, the record in Stats and the division finish in Meta; the result as a badge pill (gold for a title)
  a: H => `<div class="r6pl-list">${H.map(r => `<div class="r6hs-r"><b class="r6hs-y">${r.s}</b><span class="r6m-rt" style="flex:1"><b class="r6pl-line">${esc(r.rec)}</b><span>${ord(r.place)} in the ${esc(Dt.team(TID).div)}</span></span><span class="badge r6hs-${r.kind}">${r.kind === 'gold' ? S(icon('trophy', 'xs')) : ''}${esc(r.res)}</span></div>`).join('')}</div>`,
  // b: a timeline: one tile per season left to right, the record big, the result under it; a title season filled in gold
  b: H => `<div class="r6r-rail">${H.map(r => `<div class="r6hs-t r6hs-${r.kind}"><span class="r6v-eb">${r.s}</span><b>${esc(r.rec)}</b><span>${ord(r.place)} in the ${esc(Dt.team(TID).div)}</span><em>${r.kind === 'gold' ? S(icon('trophy', 'xs')) : ''}${esc(r.res)}</em></div>`).join('')}</div>`,
};
const RV = {
  a: V2 => `<div class="r6pl-list">${V2.map(({ r, w, l, last }) => { const lr = last && Dt.result(last, TID); return `<div class="r6hs-r">${S(UI.logo(r.id, 'md'))}<span class="r6m-rt" style="flex:1"><b>${esc(r.name)}</b><span>${last ? `Last: ${lr.r} ${lr.us}–${lr.them}, ${esc(Dt.weekLabel(last.t, last.w))} ${last.s}` : 'No meetings yet'}</span></span><span class="badge ${w > l ? 'win' : w < l ? 'loss' : ''}">${w}–${l}</span></div>`; }).join('')}</div>`,
  b: V2 => `<div class="r6rv-g">${V2.map(({ r, w, l }) => `<div class="r6rv-t">${S(UI.logo(r.id, 'md'))}<b>${w}–${l}</b><span>vs ${esc(r.name)}</span><i class="r6rv-m"><i style="flex:${w || 0.001}"></i><i style="flex:${l || 0.001}"></i></i></div>`).join('')}</div>`,
};
R['team-history'] = { id: 'team-history', v: 1, ready: true, name: 'Team page: season by season and rivalries', target: 'teams.js history() rivals()',
  changes: ['History tab (and the end of Overview): the last five seasons and the record against each division rival since 2022. Today generic rows with a coloured year and the result as plain text; the rivals\' records are coloured numbers.',
    'A, rows with result pills: the year in Display, the record in Stats, the finish in Meta, and the result in the badge pill (gold with a trophy for a title, grey for missed playoffs); rivals the same way, the series record in a win / loss pill.',
    'B, tiles: seasons as a swipeable timeline, the record big; rivals as three tiles with the series record big and a win–loss bar.'],
  options: [{ k: 'a', name: 'Rows with pills', note: 'Same pill as the schedule rows.' }, { k: 'b', name: 'Tiles', note: 'Timeline and rival tiles.' }],
  current: () => atNow(() => V('As the app draws it', 'history()', PH(S(TP().history(TID))))),
  proposed: k => atNow(() => V(k === 'a' ? 'Rows with pills' : 'Tiles', 'Team page · History', PH(`<div class="r6x-sec"><h3 class="r6x-h">Season by season</h3></div>${HS[k](histData())}<div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">Rivalries since 2022</h3></div>${RV[k](rvData())}`))) };

/* schedule: the rows are already the system; this is the summary and the season picker above them */
function scData() { const s = Dt.seasonForStats(), reg = Dt.teamGames(TID, s).filter(g => g.t === 2), rec = Dt.record(TID, s); let hm = [0, 0], aw = [0, 0]; reg.forEach(g => { const r = Dt.result(g, TID); if (!r) return; const b = Dt.isHome(g, TID) ? hm : aw; r.r === 'W' ? b[0]++ : b[1]++; }); return { s, rec: rec.str, hm: hm.join('-'), aw: aw.join('-'), reg }; }
R['team-schedule'] = { id: 'team-schedule', v: 2, ready: true, name: 'Team page: schedule', target: 'teams.js schedule()',
  was: ['v1: a squared segmented control for the years; A lead record / B one line.'],
  changes: ['v2, from your note on v1 A ("same note on the tabs, this one for the different years, are we sure that\'s the right treatment?"): no new control. The year uses the Scores season chip ("2026 ▾", squared, opens the season sheet), the one approved in round 5 for Scores and Standings. Your pick stays: the record big with the division finish, home and away small.',
    'A, the chip on the section heading\'s line, right-aligned, with Preseason as a row in the season sheet instead of a separate toggle.',
    'B, the chip and a Preseason toggle together on a bar above the record, like the Standings bar.'],
  options: [{ k: 'a', name: 'Chip on the heading', note: 'Preseason inside the sheet.' }, { k: 'b', name: 'Bar above', note: 'Like the Standings bar.' }],
  current: () => atNow(() => { const d = document.createElement('div'); d.innerHTML = S(TP().schedule(TID, { state: {} })); [...d.querySelectorAll('.list .row')].slice(6).forEach(r => r.remove()); return V('As the app draws it', 'schedule() (first 6 weeks)', PH(d.innerHTML)); }),
  proposed: k => atNow(() => { const C = scData(), d = document.createElement('div'); d.innerHTML = S(TP().schedule(TID, { state: {} })); const list = d.querySelector('.sec .list'); if (list) [...list.children].slice(6).forEach(r => r.remove());
    const chip = `<button class="sc-season">${C.s}${S(icon('down', 'xs'))}</button>`;
    const rec = `<div class="r6ps-lead"><span class="r6v-eb">${C.s} record</span><b>${esc(C.rec)}</b><span>${ord(TP().divPlace(TID, C.s).place)} in the ${esc(Dt.team(TID).conf + ' ' + Dt.team(TID).div)}</span></div><div class="r6ps-row r6sc-2"><div><b>${C.hm}</b><span>Home</span></div><div><b>${C.aw}</b><span>Away</span></div></div>`;
    const body = k === 'a' ? `${rec}<div class="r6sc-h"><h3 class="r6x-h">Regular season</h3>${chip}</div>`
      : `<div class="r6sc-bar">${chip}<span class="r6sc-pre">Preseason <i></i></span></div><div style="margin-top:12px">${rec}</div><div class="r6sc-h"><h3 class="r6x-h">Regular season</h3></div>`;
    return V(k === 'a' ? 'Chip on the heading' : 'Bar above', 'Team page · Schedule', PH(`${body}${list ? list.outerHTML : ''}`)); }) };

/* contracts: the contract pattern you approved on the player page */
function capData() { const pl = Dt.roster(TID).filter(p => p.sal && p.st !== 'Practice Squad'); if (!pl.length) return null; const total = pl.reduce((a, p) => a + p.sal, 0), top = pl.slice().sort((a, b) => b.sal - a.sal).slice(0, 5);
  const G = { QB: 'Quarterbacks', RB: 'Running backs', WR: 'Receivers', TE: 'Tight ends', OL: 'Offensive line', DL: 'Defensive line', LB: 'Linebackers', DB: 'Secondary', ST: 'Special teams' };
  const grp = p => ({ QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OT: 'OL', G: 'OL', C: 'OL', OL: 'OL', T: 'OL', DE: 'DL', DT: 'DL', NT: 'DL', DL: 'DL', LB: 'LB', ILB: 'LB', OLB: 'LB', MLB: 'LB', CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB', DB: 'DB', K: 'ST', P: 'ST', LS: 'ST', PK: 'ST' })[p.pos] || 'ST';
  const by = Object.keys(G).map(k => ({ l: G[k], v: pl.filter(p => grp(p) === k).reduce((a, p) => a + p.sal, 0) })).filter(x => x.v).sort((a, b) => b.v - a.v);
  return { total, top, by, n: pl.length }; }
const capShade = (i, n, k) => k === 'a' ? `color-mix(in srgb, var(--team) ${100 - Math.round(i / Math.max(1, n - 1) * 70)}%, #ffffff)` : [`var(--team)`, `var(--team-2)`][i] || `color-mix(in srgb, var(--text) ${70 - i * 7}%, #ffffff)`;
R['team-cap'] = { id: 'team-cap', v: 2, ready: true, name: 'Team page: contracts', target: 'teams.js cap()',
  was: ['v1: A lead number + meter rows / B lead number + one stacked bar in ink.'],
  changes: ['v2, from your note on v1 B ("this is nice but let\'s use the team colors on \'where the money goes\'"): your pick, the stacked bar, now in the team\'s colours, with a key under it that uses the same colours (every group, not just the top three). Solid colours only, no transparency.',
    'A, one colour: the team primary for the biggest group, stepping lighter (mixed toward white) for each smaller one.',
    'B, two colours: primary for the biggest group, secondary for the next, then neutral greys for the rest.'],
  options: [{ k: 'a', name: 'Primary, stepped', note: 'One team colour, lighter steps.' }, { k: 'b', name: 'Primary + secondary', note: 'Then greys.' }],
  current: () => atNow(() => V('As the app draws it', 'cap()', PH(S(TP().cap(TID))))),
  proposed: k => atNow(() => { const C = capData(); if (!C) return V('', '', none('No contract data.')); const n = C.by.length;
    const split = `<div class="r6cp-bar">${C.by.map((x, i) => `<i style="flex:${x.v};background:${capShade(i, n, k)}"></i>`).join('')}</div><div class="r6cp-key">${C.by.map((x, i) => `<span><i style="background:${capShade(i, n, k)}"></i><b>${Math.round(x.v / C.total * 100)}%</b> ${esc(x.l)}</span>`).join('')}</div>`;
    return V(k === 'a' ? 'Primary, stepped' : 'Primary + secondary', 'Team page · Contracts', PH(`<div style="${App.teamVars(Dt.team(TID))}"><div class="r6ps-lead"><span class="r6v-eb">2026 cash, active roster</span><b>${esc(fmt.money(C.total))}</b><span>${C.n} players under contract</span></div>
      <div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">Where the money goes</h3></div>${split}
      <div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">Top contracts</h3></div><div class="r6pl-list">${C.top.map(p => `<div class="r6pl-a">${S(UI.hs(p.id, 'sm'))}<span class="r6m-rt" style="flex:1"><b>${esc(p.n)}</b><span>${esc(p.pos)} · through ${p.thru || '—'}</span></span><b class="r6n6-v">${esc(fmt.money(p.sal))}</b></div>`).join('')}</div>
      <div class="r6ps-foot">Each player\'s listed 2026 salary; not official salary-cap hits (bonus proration, dead money and rollover aren\'t included).</div></div>`)); }) };


/* ------------------------------------------------------------------ team page: the last tabs, each reusing an approved pattern */
/* sub-views (Players · Depth chart · Injuries, Transactions · Contracts · …): the same picker question as the player stat tables */
const TVIEWS = { roster: [['roster', 'Players'], ['depth', 'Depth chart'], ['injuries', 'Injuries']], more: [['moves', 'Transactions'], ['cap', 'Contracts'], ['draft', 'Draft'], ['history', 'History'], ['stadium', 'Stadium']] };
const tvItems = g => TVIEWS[g].map(([k, l]) => ({ k, l }));
const tvMain = on => S(UI.tabs([{ k: 'overview', l: 'Overview' }, { k: 'schedule', l: 'Schedule' }, { k: 'roster', l: 'Roster' }, { k: 'stats', l: 'Stats' }, { k: 'more', l: 'More' }], on, 'x'));
const TV = {
  cur: (g, on) => `${tvMain(g)}<div class="r6tv-cur">${S(UI.chips(tvItems(g), on, 'x'))}</div>`,
  a: (g, on) => `${tvMain(g)}<div class="r6tv-a">${S(UI.tabs(tvItems(g), on, 'x', 'sm'))}</div>`,
  b: (g, on) => `${tvMain(g)}<div class="r6tv-b"><button class="sc-season">${esc(TVIEWS[g].find(x => x[0] === on)[1])}${S(icon('down', 'xs'))}</button></div>`,
};
R['team-views'] = { id: 'team-views', v: 2, ready: true, name: 'Team page: sub-tab picker', target: 'teams.js teamBody() VIEWS · .tm-views',
  was: ['v1: A small tabs (your pick) / B chip + sheet.'],
  changes: ['v2, from your note on v1 A ("make the selected tab maybe 1px taller"): the small tabs, with the selected underline 1 px thicker.',
    'A, 4 px under the selected small tab only (the page tabs above stay 3 px).',
    'B, 4 px on both rows, so the page tabs and the small tabs match.'],
  options: [{ k: 'a', name: 'Small tabs 4 px', note: 'Page tabs stay 3 px.' }, { k: 'b', name: 'Both rows 4 px', note: 'Page tabs match.' }],
  current: () => V('As the app draws it', 'tm-views chips', PH(`<div class="r6tv">${TV.cur('more', 'cap')}</div><div class="r6tv" style="margin-top:24px">${TV.cur('roster', 'roster')}</div>`)),
  proposed: k => V(k === 'a' ? 'Small tabs 4 px' : 'Both rows 4 px', 'Team page · More, Roster', PH(`<div class="r6tv r6tv-4${k}">${TV.a('more', 'cap')}</div><div class="r6tv r6tv-4${k}" style="margin-top:24px">${TV.a('roster', 'roster')}</div>`)) };

R['team-stats'] = { id: 'team-stats', v: 4, ready: true, name: 'Team page: stat leaders table', target: 'teams.js stats() · tbl()',
  was: ['v1 showed no tables in your browser.', 'v2 showed "No stats yet": the card looked for the old five stacked tables, which the built page no longer draws.', 'v3 showed the table as built, with the key column (Yds, Tkl, Pts) in bold.'],
  changes: ['v4, from your note on v3 ("why is yds bold? it should be teh same as others"): Yds is bold because the built table marks one key column per tab as the lead and sets it in bold. That emphasis is removed: every stat column is the same weight, in every tab (Passing Yds, Rushing Yds, Receiving Yds, Defense Tkl, Kicking Pts). The player name column and the team total row are unchanged.',
    'Kept from v3: one Player stats card, the small category tabs, the pinned name column and the sideways scroll.',
    'Shown for the Chiefs and the Commanders; current is the table as built today.'],
  options: [{ k: 'a', name: 'Same weight', note: 'No bold key column.' }],
  current: () => atNow(() => V('As the app draws it', 'Team page · Stats · Chiefs', PH(lazy(() => Dt.ensureBox(Dt.seasonForStats()), () => tsCard(TID))))),
  proposed: () => atNow(() => V('Same weight', 'Team page · Stats · Chiefs and Commanders', `<div class="r6-tsnk">${PH(lazy(() => Dt.ensureBox(Dt.seasonForStats()), () => tsCard(TID)))}${PH(lazy(() => Dt.ensureBox(Dt.seasonForStats()), () => tsCard(String(Dt.team('WAS').id))))}</div>`)) };
/* the built Stats tab's player-stats card, as stats() draws it */
function tsCard(tid) { const d = document.createElement('div'); d.innerHTML = S(TP().stats(tid, Dt.seasonForStats()));
  const c = d.querySelector('.tc'); return c ? c.closest('.pad').outerHTML : S(UI.empty('chart', 'No stats yet')); }

/* draft: the roster row (number column in Stats bold, L3 player line) with the pick as the number */
function drData() { const d = NFL.d.core.drafts, now = App.time.now();
  return [2026, 2025, 2024].filter(y => Date.parse(`${y}-04-23T23:00:00Z`) <= now).map(y => ({ y, picks: (d[y] || []).filter(p => p.t === TID) })); }
const drRow = p => { const inNfl = p.pid && Dt.player(p.pid), now = inNfl && Dt.player(p.pid).t !== TID ? Dt.team(Dt.player(p.pid).t) : null;
  return `<div class="r6dr-r"><span class="r6dr-n"><b>${p.o}</b><span>Rd ${p.r}</span></span>${inNfl ? S(UI.hs(p.pid, 'sm')) : '<span class="r6dr-hs"></span>'}<span class="r6m-rt" style="flex:1"><b>${esc(p.n || 'TBD')}</b><span>${esc([p.pos, p.col].filter(Boolean).join(' · '))}</span></span>${now ? `<span class="badge">Now ${esc(now.abbr)}</span>` : p.tr ? '<span class="badge">Via trade</span>' : ''}</div>`; };
R['team-draft'] = { id: 'team-draft', v: 1, ready: true, name: 'Team page: draft classes', target: 'teams.js draft()',
  changes: ['The Draft view: each recent class, pick by pick. Today "Rd 1" sits over "#6" in a two-line column, and "via trade" is buried in the Meta line.',
    'Rows reuse the roster row you approved in round 5: the overall pick in Stats bold in a fixed column (like the jersey number), the round under it, the L3 player line, and "Via trade" / "Now DEN" as badge pills on the right.',
    'A, every class stacked (2026, 2025, 2024), each with "Full draft" in its header.',
    'B, one class at a time with the Scores season chip ("2026 ▾"), the same year picker as Schedule.'],
  options: [{ k: 'a', name: 'All classes', note: 'Stacked by year.' }, { k: 'b', name: 'Season chip', note: 'Same picker as Schedule.' }],
  current: () => atNow(() => V('As the app draws it', 'draft()', PH(S(TP().draft(TID))))),
  proposed: k => atNow(() => { const C = drData(); if (!C.length) return V('', '', none('No drafts yet.'));
    const cls = c => `<div class="r6pl-list">${c.picks.length ? c.picks.map(drRow).join('') : '<div class="r6dr-r">No picks.</div>'}</div>`;
    return V(k === 'a' ? 'All classes' : 'Season chip', 'Team page · Draft', PH(k === 'a' ? C.map(c => `<div class="r6x-sec" style="margin-top:16px"><h3 class="r6x-h">${c.y} draft class</h3><span class="r6dr-more">Full draft ›</span></div>${cls(c)}`).join('')
      : `<div class="r6dr-bar"><button class="sc-season">${C[0].y}${S(icon('down', 'xs'))}</button><span class="r6dr-more">Full draft ›</span></div><div class="r6dr-sum">${C[0].picks.length} picks · ${C[0].picks.filter(p => p.r === 1).length} in round 1</div>${cls(C[0])}`)); }) };

/* stadium: the lead-tile pattern for the facts, the schedule game row for the next home game */
function stData() { const tm = Dt.team(TID), v = tm.venue || {}; const next = Dt.D.games.find(g => g.h === TID && g.ts > App.time.now() && g.st === 'pre' && Dt.scheduleVisible(g)); return { tm, v, next }; }
const stLinks = (D, sq) => [['map', 'Stadium guide', 'Seating, gates, food, parking'], ['ticket', 'Tickets', D.next ? `${Dt.team(D.next.a).name} at ${D.tm.name}` : 'Home games'], ['plane', 'Plan a road trip', 'Travel and hotels'], ['bag', `${D.tm.name} shop`, 'Jerseys, hats and gear']]
  .map(([i, t, sub]) => sq ? `<div class="r6st-sq">${S(icon(i))}<b>${esc(t)}</b><span>${esc(sub)}</span></div>` : S(UI.row({ left: icon(i), title: t, sub }))).join('');
R['team-stadium'] = { id: 'team-stadium', v: 2, ready: true, name: 'Team page: stadium', target: 'teams.js stadium()',
  was: ['v1: A link rows (your pick) / B link tiles.'],
  changes: ['v2, from your note on v1 A ("we shouldn\'t do sentence case for all pro display, only all caps. also the spacing is a bit odd"): the surface and roof tiles are now GRASS / OPEN AIR in caps, and everything sits on one spacing scale: the photo, then 16 px to the name, 4 px to the city, 16 px to the tiles, 28 px before each section, 12 px under each section title. Every block is now full width (the game row and the links were inset 16 px narrower than the tiles).',
    'The Stadium view. Today: photo, the name in Body bold, a key-value list that repeats the team name, a big game card, then four link rows.',
    'Both: the stadium name in Display under the photo; "Home team" is dropped (you are on the team page); surface and roof become two small tiles (the season-line tiles); the next home game is the schedule game row, not the big card.',
    'A, the four links stay as rows (the system row with an icon).',
    'B, the four links as a 2 × 2 grid of squared tiles, so tickets and the guide sit above the fold.'],
  options: [{ k: 'a', name: 'Link rows', note: 'System rows.' }, { k: 'b', name: 'Link tiles', note: '2 × 2 squared tiles.' }],
  current: () => atNow(() => V('As the app draws it', 'stadium()', PH(S(TP().stadium(TID))))),
  proposed: k => atNow(() => { const D = stData();
    return V(k === 'a' ? 'Link rows' : 'Link tiles', 'Team page · Stadium', PH(`<div class="r6st">${D.v.img ? `<div class="r6st-img">${S(UI.img(D.v.img, D.v.name))}</div>` : ''}
      <div class="r6st-name">${esc(D.v.name || 'Home stadium')}</div><div class="r6st-city">${esc([D.v.city, D.v.state].filter(Boolean).join(', '))}</div>
      <div class="r6ps-row r6st-2"><div><b>${D.v.grass === false ? 'TURF' : 'GRASS'}</b><span>Surface</span></div><div><b>${D.v.indoor ? 'DOME' : 'OPEN AIR'}</b><span>Roof</span></div></div>
      ${D.next ? `<div class="r6st-sec"><h3 class="r6x-h">Next home game</h3></div><div class="list">${S(UI.gameRow(D.next, TID))}</div>` : ''}
      <div class="r6st-links">${k === 'a' ? `<div class="list">${stLinks(D)}</div>` : `<div class="r6st-g">${stLinks(D, true)}</div>`}</div></div>`)); }) };

/* ------------------------------------------------------------------ Watch tab: the five patterns never approved (the hero, game tiles, posters, continue watching and RedZone were) */
const WP = () => App.watchParts;
const wAll = () => { const d = document.createElement('div'); d.innerHTML = WP().renderWatch().map(x => S(x)).join(''); return d; };
const wSec = re => { const d = wAll(); const s = [...d.querySelectorAll('.sec')].find(x => re.test((x.querySelector('.sec-head') || {}).textContent || '')); return s ? s.outerHTML : ''; };

/* shortcuts: the six ways in under the hero */
const WSC = [['tv', 'Where to watch'], ['zap', 'RedZone'], ['rewind', 'Replays'], ['headphones', 'Audio'], ['mic', 'Podcasts'], ['download', 'Downloads']];
R['watch-shortcuts'] = { id: 'watch-shortcuts', v: 1, ready: true, name: 'Watch: shortcuts', target: 'watch.js renderWatch() quick entry chips',
  changes: ['The six ways in under the hero (Where to watch, RedZone, Replays, Audio, Podcasts, Downloads). Today rounded outline chips with an icon, a shape used nowhere else, and half of them scroll off the screen.',
    'Both squared, per the pressables rule, with the icon and label in Sans.',
    'A, a 3 × 2 grid of squared tiles: all six visible at once, icon over label.',
    'B, one scrolling row of the squared chip (the Scores season chip shape) with the icon before the label.'],
  options: [{ k: 'a', name: '3 × 2 tiles', note: 'All six visible.' }, { k: 'b', name: 'Squared chips', note: 'One row, scrolls.' }],
  current: () => atNow(() => { const d = wAll(), c = d.querySelector('.chips'); return V('As the app draws it', 'Watch tab', PH(c ? c.outerHTML : none('No chips.'))); }),
  proposed: k => V(k === 'a' ? '3 × 2 tiles' : 'Squared chips', 'Watch tab', PH(k === 'a'
    ? `<div class="r6ws-g">${WSC.map(([i, l]) => `<div class="r6ws-t">${S(icon(i))}<span>${l}</span></div>`).join('')}</div>`
    : `<div class="r6ws-row">${WSC.map(([i, l]) => `<button class="sc-season r6ws-c">${S(icon(i, 'sm'))}${l}</button>`).join('')}</div>`)) };

/* the 24/7 channels: NFL Channel (free) and NFL Network (NFL+) */
function chData() { const W = WP(), n = App.time.now();
  return [['NFL Channel', 'CHANNEL', W.CHANNEL_SHOWS, 0, 'channel', '#013369'], ['NFL Network', 'NETWORK', W.NETWORK_SHOWS, 3, 'network', '#1d1d1f']].map(([name, sub, list, seed, f, bg]) => {
    const sch = W.schedule(list, 2, seed); return { name, sub, now: sch[0].title, next: sch[1].title, at: sch[1].start, pct: Math.max(4, Math.min(100, (n - sch[0].start) / 3600e3 * 100)), ok: W.can(f), tier: W.tierOf(f), bg };
  }); }
const chLogo = c => `<div class="r6ch-logo" style="background:${c.bg}">NFL<span>${c.sub}</span></div>`;
const chTag = c => c.tier === 'free' ? '<span class="badge win">Free</span>' : S(UI.tierBadge(c.tier));
R['watch-channels'] = { id: 'watch-channels', v: 1, ready: true, name: 'Watch: 24/7 channels', target: 'watch.js renderWatch() .w-chan · grid()',
  changes: ['NFL Channel (free) and NFL Network (NFL+). Today two separate sections far apart on the page, each a card with a text logo, "Now:" and "Then", and a round play or lock button; NFL Network sits down in the locked area.',
    'Both put the two channels together in one "Live 24/7" section, with how far into the show we are as a thin meter and the next show\'s start time. The play button is squared; a locked channel gets the NFL+ tab instead of a lock icon, as on the posters.',
    'A, one list card, a row per channel.',
    'B, two tiles side by side.'],
  options: [{ k: 'a', name: 'Rows', note: 'One list card.' }, { k: 'b', name: 'Tiles', note: 'Side by side.' }],
  current: () => atNow(() => V('As the app draws it', 'Watch tab', PH(wSec(/NFL Channel/) + wSec(/NFL Network/)))),
  proposed: k => atNow(() => { const C2 = chData();
    const body = k === 'a'
      ? `<div class="list">${C2.map(c => `<div class="row static r6ch-r">${chLogo(c)}<div class="row-main"><div class="r6ch-tag">${chTag(c)}<span class="t-meta">${c.name}</span></div><div class="row-title">${esc(c.now)}</div><i class="r6ch-m"><b style="width:${c.pct}%"></b></i><div class="row-sub">Next ${esc(c.next)} · ${fmt.time(c.at)}</div></div><span class="r6ch-btn ${c.ok ? '' : 'lock'}">${S(icon(c.ok ? 'play' : 'lock', 'sm'))}</span></div>`).join('')}</div>`
      : `<div class="r6ch-g">${C2.map(c => `<div class="r6ch-t">${c.ok ? '' : S(UI.plusTab(c.tier))}${chLogo(c)}<div class="r6ch-tag">${chTag(c)}</div><b>${esc(c.now)}</b><i class="r6ch-m"><b style="width:${c.pct}%"></b></i><span>Next ${esc(c.next)} · ${fmt.time(c.at)}</span></div>`).join('')}</div>`;
    return V(k === 'a' ? 'Rows' : 'Tiles', 'Watch tab · Live 24/7', PH(`<div class="r6x-sec"><h3 class="r6x-h">Live 24/7</h3><span class="r6dr-more">Guide ›</span></div>${body}`)); }) };

/* listen live: radio calls for the games on now (drawn on Game Day Sunday) */
R['watch-listen'] = { id: 'watch-listen', v: 1, ready: true, name: 'Watch: listen live', target: 'watch.js renderWatch() .w-aud',
  changes: ['The live radio rail. Today its own tile: two small logos, "LAC @ KC" and a headphones icon floating in the corner, a third tile style on the page. Drawn on Game Day Sunday so the games are live.',
    'A, the approved Watch game tile (status, the two team lines, the foot) with "Listen" and the three feeds in the foot, so live video and live audio read as the same object.',
    'B, a list: a headphones tile, "Bears at Packers", the feeds in Meta, the Live pill and clock on the right; denser, and nothing to scroll sideways.'],
  options: [{ k: 'a', name: 'Game tiles', note: 'Same tile as Live & up next.' }, { k: 'b', name: 'Rows', note: 'One list.' }],
  current: () => atMoment('gameday', () => V('As the app draws it', 'Watch tab, Sunday 3:55 PM', PH(wSec(/Listen live/) || none('No games.')))),
  proposed: k => atMoment('gameday', () => { const W = WP(), L = (W.liveNow().length ? W.liveNow() : W.upcoming(7)).slice(0, 6);
    const tile = g => { const d = document.createElement('div'); d.innerHTML = S(W.gameTile(g)); const f = d.querySelector('.w-gfoot'); if (f) f.innerHTML = `<span class="badge">${S(icon('headphones', 'xs'))} Listen</span><span class="t-meta">Home · Away · National</span>`; const a = d.firstElementChild; a.removeAttribute('data-go'); return a.outerHTML; };
    const row = g => { const Sc = Dt.score(g), live = Dt.state(g) === 'live'; return `<div class="row static r6ls-r"><span class="r6ls-i">${S(icon('headphones', 'sm'))}</span><div class="row-main"><div class="row-title">${esc(Dt.team(g.a).name)} at ${esc(Dt.team(g.h).name)}</div><div class="row-sub">Home · Away · National radio</div></div><span class="r6ls-st">${live ? '<span class="badge live">Live</span>' : ''}<span class="t-meta">${esc(Sc.label || '')}</span></span></div>`; };
    return V(k === 'a' ? 'Game tiles' : 'Rows', 'Watch tab · Listen live', PH(`<div class="r6x-sec"><h3 class="r6x-h">Listen live</h3><span class="r6dr-more">All games ›</span></div>${k === 'a' ? `<div class="r6ls-rail">${L.map(tile).join('')}</div>` : `<div class="list">${L.map(row).join('')}</div>`}`)); }) };

/* what a free fan can't open yet: today every locked rail repeats its own lock line under a small "More with NFL+" eyebrow */
const LOCKED = [['tv', 'NFL Network 24/7', 'Live TV on your phone', 'plus'], ['headphones', 'Listen live', 'Radio calls for every game', 'plus'], ['rewind', 'Condensed games', 'Every snap in about 40 minutes', 'premium'], ['layers', 'All-22 coaches film', 'The film coaches study', 'premium']];
R['watch-locked'] = { id: 'watch-locked', v: 1, ready: true, name: 'Watch: what NFL+ adds', target: 'watch.js renderWatch() later[] · softLock() · .w-more-head',
  changes: ['For a free fan, the locked sections go last under a small "More with NFL+" eyebrow, and each repeats its own lock line ("… comes with NFL+ Premium. See plans") above content they can\'t play: four "See plans" in a row.',
    'Both say it once, with the approved lock-note pieces (the NFL+ logo, the plus / premium buttons), and never in betting or "best value" language.',
    'A, one panel that lists what NFL+ adds (each with its tier badge) and one "See plans"; the locked rails still follow it, each with only the tier badge in its heading so you can preview what is there.',
    'B, the panel only: the locked rails are not drawn at all for a free fan; each line in the panel opens that feature\'s preview sheet. A much shorter page.'],
  options: [{ k: 'a', name: 'Panel + previews', note: 'Rails stay, badges only.' }, { k: 'b', name: 'Panel only', note: 'Locked rails hidden.' }],
  current: () => atNow(() => { const d = wAll(), secs = [...d.querySelectorAll('.sec')]; const i = secs.findIndex(x => x.querySelector('.w-more-head')); return V('As the app draws it', 'Watch tab, free plan', PH(i >= 0 ? secs.slice(i, i + 3).map(x => x.outerHTML).join('') : none('No locked sections on this plan.'))); }),
  proposed: k => atNow(() => { const panel = `<div class="r6lk-p"><div class="r6lk-h"><span class="ln-logo">${S(UI.plusLogo())}</span><b>What NFL+ adds</b></div>
      <div class="r6lk-l">${LOCKED.map(([i, t, sub, tier]) => `<div class="r6lk-r">${S(icon(i, 'sm'))}<span class="r6m-rt" style="flex:1"><b>${t}</b><span>${sub}</span></span>${S(UI.tierBadge(tier))}${k === 'b' ? S(icon('chev', 'xs')) : ''}</div>`).join('')}</div>
      <button class="btn plus block">See plans</button></div>`;
    const rails = k === 'a' ? `<div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">NFL Network</h3>${S(UI.tierBadge('plus'))}</div><div class="r6lk-ghost">Now: ${esc(chData()[1].now)}</div><div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">Condensed games</h3>${S(UI.tierBadge('premium'))}</div><div class="r6lk-ghost">Every snap in about 40 minutes, spoiler-free titles</div>` : '';
    return V(k === 'a' ? 'Panel + previews' : 'Panel only', 'Watch tab, free plan', PH(panel + rails)); }) };

/* the hero when nothing is on: drawn in the summer lull (the Draft and Training Camp moments use the same hero) */
R['watch-offseason'] = { id: 'watch-offseason', v: 1, ready: true, name: 'Watch: hero with no games', target: 'watch.js hero() offseason · .w-hero-off',
  changes: ['When no game is live or this week (draft, free agency, the summer, camp), the hero is a navy card: a date, a title in Display, a line, "Watch now" and a translucent "Relive Super Bowl LX" button. Drawn at the Summer Lull moment.',
    'Both drop the translucent button (no white-tint boxes on colour); buttons are white solid and white outline, squared, and the title is Display caps.',
    'A, the NFL blue gradient at 180°, reaching full colour at 42% like the team heroes, with the date eyebrow, title, line and the two buttons.',
    'B, the champion\'s card: the reigning Super Bowl champion\'s gradient and logo, "Relive Super Bowl LX" as the main action, and the phase line ("The dead zone, filled") under it with "Watch now" as the second button.'],
  options: [{ k: 'a', name: 'NFL blue', note: 'Same shape as team heroes.' }, { k: 'b', name: 'Champion\'s card', note: 'Leads with the Super Bowl.' }],
  current: () => atMoment('summer', () => V('As the app draws it', 'Watch tab, Jun 20', PH(S(WP().hero())))),
  proposed: k => atMoment('summer', () => { const sb = Dt.D.games.filter(g => g.t === 3 && g.w === 5 && Dt.state(g) === 'post').pop();
    const champ = sb && (Dt.result(sb, sb.h).r === 'W' ? sb.h : sb.a), tm = champ && Dt.team(champ), n = sb ? Dt.sbNumeral(sb.s) : '';
    const day = fmt.dayLong(App.time.now());
    return V(k === 'a' ? 'NFL blue' : 'Champion\'s card', 'Watch tab, Jun 20', PH(k === 'a' || !tm
      ? `<div class="r6wo r6wo-nfl"><span class="r6wo-eb">${esc(day)}</span><div class="r6wo-t">THE DEAD ZONE, FILLED</div><p>Relive last season, binge NFL Films, and count down to kickoff.</p><div class="r6wo-b"><button class="btn white">${S(icon('play', 'sm'))} Watch now</button>${sb ? `<button class="btn r6wo-line">Relive Super Bowl ${n}</button>` : ''}</div></div>`
      : `<div class="r6wo" style="${App.teamVars(tm)};background:linear-gradient(180deg,var(--tg-a) 0%,var(--tg-b) 42%)"><div class="r6wo-logo">${S(UI.logo(champ, 'lg'))}</div><span class="r6wo-eb">Super Bowl ${n} champions</span><div class="r6wo-t">${esc(tm.name.toUpperCase())}</div><p>The dead zone, filled: relive the title run, binge NFL Films, count down to kickoff.</p><div class="r6wo-b"><button class="btn white">${S(icon('play', 'sm'))} Relive Super Bowl ${n}</button><button class="btn r6wo-line">Watch now</button></div></div>`)); }) };


/* ------------------------------------------------------------------ channel pages (NFL Channel, NFL Network) */
R['channel-page'] = { id: 'channel-page', v: 2, ready: true, name: 'Channel page', target: 'watch.js channelPage() grid() · .w-player .w-grid',
  was: 'v1 · A, time column', changes: ['Note: "shouldn\'t it say live? again, think systematically". v2: "Now" and "On now" are gone; the show on air gets the approved Live badge, the same one games and the Live 24/7 rows use.', '#/channel/nfl and #/channel/nfl-network. Today a navy player with "NFL CHANNEL" in type, a round white play button, then a Schedule card of stacked slots where only "Now" is in red.',
    'Both square the play button (the Live 24/7 row\'s button, white on the player) and keep the free / NFL+ tag right under the player.',
    'A, the schedule as rows with a fixed time column on the left, the show on air with the Live badge with the meter under the show.',
    'B, the show on air as its own card (Live badge) with the meter and Next, then "Later today" as plain rows.'],
  options: [{ k: 'a', name: 'Time column', note: 'One list, times on the left.' }, { k: 'b', name: 'Now, then later', note: 'Now gets its own card.' }],
  current: () => atNow(() => V('As the app draws it', '#/channel/nfl', PH(S(WP().channelPage('nfl').html)))),
  proposed: k => atNow(() => { const W = WP(), sch = W.schedule(W.CHANNEL_SHOWS, 6, 0), n = App.time.now(), pct = Math.max(4, Math.min(100, (n - sch[0].start) / 3600e3 * 100));
    const player = `<div class="r6cp-pl"><div class="r6cp-logo">NFL<span>CHANNEL</span></div><div class="r6cp-ov"><span class="badge live">Live</span><b>${esc(sch[0].title)}</b></div><span class="r6cp-play">${S(icon('play'))}</span></div>
      <div class="r6cp-tag"><span class="badge win">Free</span><span class="t-meta">Streams 24/7 for everyone, no account needed</span></div>`;
    const body = k === 'a'
      ? `<div class="list">${sch.map((p, i) => `<div class="row static r6cp-r"><span class="r6cp-t">${i ? fmt.time(p.start) : '<span class="badge live">Live</span>'}</span><div class="row-main"><div class="row-title">${esc(p.title)}</div>${i ? '' : `<i class="r6ch-m"><b style="width:${pct}%"></b></i>`}</div></div>`).join('')}</div>`
      : `<div class="r6cp-now"><span class="badge live">Live</span><b>${esc(sch[0].title)}</b><i class="r6ch-m"><b style="width:${pct}%"></b></i><span class="t-meta">Next ${esc(sch[1].title)} · ${fmt.time(sch[1].start)}</span></div>
         <div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">Later today</h3></div><div class="list">${sch.slice(2).map(p => `<div class="row static"><div class="row-main"><div class="row-title">${esc(p.title)}</div><div class="row-sub">${fmt.time(p.start)}</div></div></div>`).join('')}</div>`;
    return V(k === 'a' ? 'Time column' : 'Now, then later', '#/channel/nfl', PH(player + `<div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">Schedule</h3></div>` + (k === 'a' ? body : body.replace('<div class="r6x-sec" style="margin-top:20px"><h3 class="r6x-h">Later today</h3></div>', '<h4 class="r6cp-h4">Later today</h4>')))); }) };

/* ------------------------------------------------------------------ RedZone page, free plan (drawn on Game Day Sunday) */
const rzDom = () => { const d = document.createElement('div'); d.innerHTML = S(App.rzParts.page().html); return d; };
R['redzone-ask'] = { id: 'redzone-ask', v: 1, ready: true, name: 'RedZone: the NFL+ ask', target: 'watch.js redzonePage() · .rzh .rzh-cta .rzh-bar',
  changes: ['The top of #/channel/redzone for a free fan. Today a red radial glow behind the page, a round red "Get RedZone with NFL+ Premium" pill over the video, then "See NFL+ Premium" and "Free preview" under the chyron: the same ask twice.',
    'Both drop the glow (the page is plain black) and ask once, squared.',
    'A, the ask stays on the video as a squared size-M button with the lock; under the chyron only "Free preview", outlined.',
    'B, the video stays clear; under the chyron the approved lock note (NFL+ logo, one line, "See plans") with "Free preview" beside it.'],
  options: [{ k: 'a', name: 'Ask on the video', note: 'One squared CTA over the stream.' }, { k: 'b', name: 'Lock note', note: 'Video clear, ask below.' }],
  current: () => atMoment('gameday', () => { const h = rzDom().querySelector('.rzh'); return V('As the app draws it', 'RedZone, Sunday 3:55 PM, free plan', PH(`<div class="rz-page r6rz">${h ? h.outerHTML : none('Nothing drawn.')}</div>`)); }),
  proposed: k => atMoment('gameday', () => { const d = rzDom(), h = d.querySelector('.rzh'); if (!h) return none('Nothing drawn.');
    h.classList.add('r6rz-flat'); const cta = h.querySelector('.rzh-cta'), bar = h.querySelector('.rzh-bar');
    const prev = `<button class="btn r6rz-line">${S(icon('play', 'sm'))}Free preview</button>`;
    if (k === 'a') { if (cta) cta.className = 'btn r6rz-cta'; if (bar) bar.innerHTML = prev; }
    else { if (cta) cta.remove(); if (bar) bar.outerHTML = `<div class="r6rz-note"><div class="r6rz-nh"><span class="ln-logo">${S(UI.plusLogo())}</span><span>RedZone comes with NFL+ Premium: every touchdown from every Sunday afternoon game.</span></div><div class="r6rz-nb"><button class="btn plus">See plans</button>${prev}</div></div>`; }
    return V(k === 'a' ? 'Ask on the video' : 'Lock note', 'RedZone, Sunday 3:55 PM, free plan', PH(`<div class="rz-page r6rz">${h.outerHTML}</div>`)); }) };

R['redzone-stats'] = { id: 'redzone-stats', v: 2, ready: true, name: 'RedZone: the day in numbers', target: 'watch.js rzLive() · .rz-stats', was: 'v1 · A, season-line tiles',
  changes: ['Note: "I like the dark red gradient you use, make it subtle". v2: the dark red from today\'s "Inside the 20" tile stays, as a soft 180° gradient into the tile (no outline, no 16px corners).',
    'Both use the approved season-line tiles (.ps-row) on the dark page.',
    'A, only "Inside the 20" gets the red, so the hot number stands out.',
    'B, all three tiles share it, so the row reads as RedZone\'s own.'],
  options: [{ k: 'a', name: 'Hot tile only', note: 'Red on Inside the 20.' }, { k: 'b', name: 'All three', note: 'The whole row.' }],
  current: () => atMoment('gameday', () => { const d = document.createElement('div'); d.innerHTML = S(App.rzParts.live()); const x = d.querySelector('.rz-stats'); return V('As the app draws it', 'RedZone, Sunday 3:55 PM', PH(`<div class="rz-page r6rz">${x ? x.outerHTML : none('No games on.')}</div>`)); }),
  proposed: k => atMoment('gameday', () => { const d = document.createElement('div'); d.innerHTML = S(App.rzParts.live()); const n = [...d.querySelectorAll('.rz-stats b')].map(b => b.textContent);
    if (!n.length) return none('No games on.'); const [td, on, in20] = n, hot = c => k === 'b' || c ? ' class="r6rz-glow"' : '';
    return V(k === 'a' ? 'Hot tile only' : 'All three', 'RedZone, Sunday 3:55 PM', PH(`<div class="rz-page r6rz" style="padding:16px"><div class="ps-row" style="margin:0"><div${hot(0)}><b>${td}</b><span>Touchdowns today</span></div><div${hot(0)}><b>${on}</b><span>Games on now</span></div><div${hot(+in20)}><b>${in20}</b><span>Inside the 20</span></div></div></div>`)); }) };

/* ------------------------------------------------------------------ onboarding (drawn with a fresh draft, nothing saved) */
const OB = () => App.onboarding;
const obPart = (k, sel, over, qz) => { const d = document.createElement('div'); d.innerHTML = OB().view(k, over, qz); const x = sel ? [...d.querySelectorAll(sel)] : [d]; return x.length ? x.map(e => e.outerHTML).join('') : none('Nothing drawn.'); };
const box = (on, b) => `<span class="r6oc-box ${on ? 'on' : ''} ${b || ''}">${on ? S(icon('check', 'xs')) : ''}</span>`;

R['ob-welcome'] = { id: 'ob-welcome', v: 7, ready: true, name: 'Onboarding: welcome', target: 'onboarding.js welcome() · .ob-welcome .ob-marq', was: 'v6 · B, original + rules',
  changes: ['Note: "no duplicate logos between rows. 10-11 logos per row to fix that". v7 is v6 B (the original with faded logos, solid white copy, outline button) with the wall split into three rows of 11, 11 and 10 teams: every team appears in exactly one row.',
    'Each row still loops on its own, but at 11 logos a row is wider than the screen, so you never see a team twice at once.'],
  current: () => V('As the app draws it', 'First run', PH(`<div class="r6ob-wel-cur">${obPart('welcome', '.ob-welcome')}</div>`)),
  proposed: () => { const d = document.createElement('div'); d.innerHTML = OB().view('welcome'); const ids = Dt.D.teams.map(t => t.id), mq = d.querySelector('.ob-marq');
    if (mq) mq.innerHTML = [ids.slice(0, 11), ids.slice(11, 22), ids.slice(22)].map(r => `<div class="ob-marq-row">${r.concat(r).map(id => S(UI.logo(id, 'lg'))).join('')}</div>`).join('');
    const w = d.querySelector('.ob-welcome'); return V('v7', 'First run', PH(`<div class="r6ob-wel-cur r6ow6">${w ? w.outerHTML : none('Nothing drawn.')}</div>`)); } };

R['ob-choice'] = { id: 'ob-choice', v: 1, ready: true, name: 'Onboarding: pick one', target: 'onboarding.js level() alerts() watch() marketList() · .ob-opt .ob-tier .ob-loc .ob-radio',
  changes: ['Every "pick one" in onboarding: fan level, alerts, how you watch, your city. Today a white card with a round radio; the picked one gets a red outline and a pink tint.',
    'Both drop the tint and the round radio for a squared check box, so it matches the rest of the app\'s pressables. Drawn with the fan levels; plans, alerts and cities take the same card.',
    'A, the picked card gets a 2px ink outline and a filled ink check.',
    'B, the picked card fills with the accent (your team\'s colour once you\'ve picked one), white text.'],
  options: [{ k: 'a', name: 'Ink outline', note: 'Outline + check.' }, { k: 'b', name: 'Accent fill', note: 'The picked card fills.' }],
  current: () => V('As the app draws it', 'Onboarding · fan level', PH(obPart('level', '.ob-opts', { level: 'casual' }))),
  proposed: k => V(k === 'a' ? 'Ink outline' : 'Accent fill', 'Onboarding · fan level', PH(`<div class="r6oc ${k}">${OB().LEVELS.map(l => { const on = l.k === 'casual';
    return `<div class="r6oc-o ${on ? 'on' : ''}"><span class="r6oc-ic">${S(icon(l.ic))}</span><span class="r6m-rt" style="flex:1"><b>${esc(l.t)}</b><span>${esc(l.d)}</span></span>${box(on)}</div>`; }).join('')}</div>`)) };

const QZ = [['Northeast'], ['South'], ['Midwest'], ['West'], ['Outside the US']];
R['ob-quiz'] = { id: 'ob-quiz', v: 1, ready: true, name: 'Onboarding: find-your-team questions', target: 'onboarding.js quizView() questions · .ob-opt.compact',
  changes: ['"I don\'t have a team yet": four quick questions. Today each answer is its own white card with a chevron, and "Back to all teams" is a small outlined button under them.',
    'A, the answers as one list card (rows with chevrons, the system list), and "Back to all teams" as a plain text link under it.',
    'B, the answers as squared tiles, two across, so most questions fit without scrolling.'],
  options: [{ k: 'a', name: 'One list', note: 'System rows.' }, { k: 'b', name: 'Tiles', note: 'Two across.' }],
  current: () => V('As the app draws it', 'Onboarding · find your team, 1 of 4', PH(obPart('team', '.ob-body > *', {}, {}))),
  proposed: k => V(k === 'a' ? 'One list' : 'Tiles', 'Onboarding · find your team, 1 of 4', PH(`<div class="eyebrow">Find your team · 1 of 4</div><div class="r6oq-h">WHERE DO YOU LIVE?</div>${k === 'a'
    ? `<div class="list mt16">${QZ.map(([t]) => `<div class="row static"><div class="row-main"><div class="row-title">${t}</div></div>${S(icon('chev', 'sm'))}</div>`).join('')}</div><button class="r6oq-link">Back to all teams</button>`
    : `<div class="r6oq-g">${QZ.map(([t]) => `<button class="r6oq-t">${t}</button>`).join('')}</div><button class="r6oq-link">Back to all teams</button>`}`)) };

const MATCH = { region: 'mw', style: 'win', color: 'red', story: 'storied' };
R['ob-matches'] = { id: 'ob-matches', v: 1, ready: true, name: 'Onboarding: your matches', target: 'onboarding.js quizView() results · .ob-match .ob-match-why',
  changes: ['The quiz result: three teams. Today each is a card on the team\'s colour with the reasons as small rounded pills and a white rounded "Make them my team".',
    'Both drop the pills; the card is the team gradient at 180° (full colour at 42%), name in Display caps, buttons squared.',
    'A, the reasons as a short list with checks, in white.',
    'B, the reasons as one line of copy under the name, and the record beside "Best match".'],
  options: [{ k: 'a', name: 'Reasons list', note: 'Checks, one per line.' }, { k: 'b', name: 'One line', note: 'Shorter cards.' }],
  current: () => V('As the app draws it', 'Onboarding · your matches', PH(obPart('team', '.ob-match', {}, MATCH))),
  proposed: k => { const d = document.createElement('div'); d.innerHTML = OB().view('team', {}, MATCH);
    const ms = [...d.querySelectorAll('.ob-match')].map(m => ({ id: m.querySelector('[data-act="ob-pick"]').dataset.arg, r: m.querySelector('.ob-match-r').textContent.trim(), why: (m.querySelectorAll('.ob-match-why span').length ? [...m.querySelectorAll('.ob-match-why span')].map(x => x.textContent.trim()) : (m.querySelector('.ob-match-why') || {}).textContent.split(' · ')).filter(Boolean) }));
    return V(k === 'a' ? 'Reasons list' : 'One line', 'Onboarding · your matches', PH(`<div class="r6om">${ms.map(m => { const tm = Dt.team(m.id);
      return `<div class="r6om-c" style="${App.teamVars(tm)}"><div class="r6om-top">${S(UI.logo(m.id, 'lg'))}<div><span class="r6om-eb">${esc(m.r)}</span><div class="r6om-n">${esc(tm.name.toUpperCase())}</div></div></div>
        ${k === 'a' ? `<ul class="r6om-w">${m.why.map(w => `<li>${S(icon('check', 'xs'))}${esc(w)}</li>`).join('')}</ul>` : `<p class="r6om-p">${esc(m.why.map(w => w.replace(/\.$/, '')).join(' · '))}</p>`}
        <button class="btn white sm">${S(icon('plus', 'sm'))}Make them my team</button></div>`; }).join('')}</div>`)); } };

R['ob-players'] = { id: 'ob-players', v: 1, ready: true, name: 'Onboarding: follow players', target: 'onboarding.js pTile() · .ob-player .ob-tog',
  changes: ['"Any players you follow?". Today each row has a round outlined + on the right; followed turns it into a filled round check.',
    'A, the button squared (40px, the Live 24/7 row\'s button): outlined +, followed is ink with a check.',
    'B, the whole row is the toggle with the squared check box from "pick one" on the right.'],
  options: [{ k: 'a', name: 'Squared button', note: '+ then check.' }, { k: 'b', name: 'Check box', note: 'Whole row toggles.' }],
  current: () => lazy(() => Dt.ensureBox(Dt.seasonForStats()), () => V('As the app draws it', 'Onboarding · players', PH(obPart('players', '.ob-pgroup', { primary: TID, teams: [TID] }).split('</button>').slice(0, 4).join('</button>') + '</button></div>'))),
  proposed: k => lazy(() => Dt.ensureBox(Dt.seasonForStats()), () => { const d = document.createElement('div'); d.innerHTML = OB().view('players', { primary: TID, teams: [TID] });
    const rows = [...d.querySelectorAll('.ob-player')].slice(0, 4).map((r, i) => { const on = i === 1; return `<div class="row static r6op-r">${r.querySelector('.hs, img') ? r.querySelector('.hs, img').outerHTML : ''}<div class="row-main"><div class="row-title">${esc(r.querySelector('.ob-pn').textContent)}</div><div class="row-sub">${esc(r.querySelector('.ob-pm').textContent)}</div></div>${k === 'a' ? `<span class="r6op-b ${on ? 'on' : ''}">${S(icon(on ? 'check' : 'plus', 'sm'))}</span>` : box(on)}</div>`; });
    return V(k === 'a' ? 'Squared button' : 'Check box', 'Onboarding · players', PH(`<div class="eyebrow">From the Chiefs</div><div class="list mt8">${rows.join('')}</div>`)); }) };

R['ob-providers'] = { id: 'ob-providers', v: 1, ready: true, name: 'Onboarding: what else you watch on', target: 'onboarding.js watch() · .ob-provs .chip',
  changes: ['Under the plans: "Anything else you watch on?" (antenna, cable, YouTube TV, Sunday Ticket, Paramount+, Peacock, Prime Video, ESPN). Today rounded outline chips; picked ones fill.',
    'A, the squared chip (the Scores season chip shape); picked is ink with a check.',
    'B, a list card with the squared check box per row, one service per line.'],
  options: [{ k: 'a', name: 'Squared chips', note: 'Wraps, ink when picked.' }, { k: 'b', name: 'Checklist', note: 'One per row.' }],
  current: () => V('As the app draws it', 'Onboarding · how you watch', PH(obPart('watch', '.ob-provs', { providers: ['yttv'] }))),
  proposed: k => { const d = document.createElement('div'); d.innerHTML = OB().view('watch', { providers: [] }); const P = [...d.querySelectorAll('.ob-provs .chip')].map((c, i) => [c.textContent.trim(), i === 2]);
    return V(k === 'a' ? 'Squared chips' : 'Checklist', 'Onboarding · how you watch', PH(`<div class="eyebrow">Anything else you watch on?</div>${k === 'a'
      ? `<div class="r6pv-w">${P.map(([t, on]) => `<button class="sc-season r6pv-c ${on ? 'on' : ''}">${on ? S(icon('check', 'xs')) : ''}${esc(t)}</button>`).join('')}</div>`
      : `<div class="list mt8">${P.map(([t, on]) => `<div class="row static"><div class="row-main"><div class="row-title">${esc(t)}</div></div>${box(on)}</div>`).join('')}</div>`}`)); } };

R['ob-done'] = { id: 'ob-done', v: 2, ready: true, name: 'Onboarding: all set', target: 'onboarding.js done() · .ob-done-hero .ob-sum', was: 'v1',
  changes: ['Note: "we should match what is on the profile page for this". v2 ends onboarding on the approved fan card from You (fanCard() in you.js), so the first thing a new fan sees is the card they\'ll keep. Drawn with your profile; a brand-new fan gets the same card at Rookie with 0 points.',
    'A, the fan card, then "Open my NFL"; everything else is already on the card or in Settings.',
    'B, the fan card, then what you picked as the system list (team, following, players, location, watching, spoiler shield), then "Open my NFL".'],
  options: [{ k: 'a', name: 'Fan card', note: 'Card, then the button.' }, { k: 'b', name: 'Fan card + picks', note: 'Adds the summary list.' }],
  current: () => V('As the app draws it', 'Onboarding · done', PH(obPart('done', '.ob-done', { primary: TID, teams: [TID] }))),
  proposed: k => { const tm = Dt.team(TID), Y = App.youParts, card = S(Y.fanCard(tm, Y.levelInfo(App.store.p.points || 0), Y.picksRecord()));
    const d = document.createElement('div'); d.innerHTML = OB().view('done', { primary: TID, teams: [TID] });
    const rows = [...d.querySelectorAll('.ob-sum-row')].map(r => `<div class="row static">${r.querySelector('svg') ? r.querySelector('svg').outerHTML : ''}<div class="row-main"><span class="r6od-k">${esc(r.querySelector('.grow').textContent)}</span></div><b class="r6od-v">${esc(r.querySelector('b').textContent)}</b></div>`).join('');
    return V(k === 'a' ? 'Fan card' : 'Fan card + picks', 'Onboarding · done', PH(`<div class="r6od-c">${card}</div>${k === 'b' ? `<div class="list mt16">${rows}</div>` : ''}<button class="btn primary block mt16">Open my NFL</button><div class="tiny center mt12">Change any of this in You → Settings.</div>`)); } };

/* ------------------------------------------------------------------ batch: Stats, Records, Super Bowls, History, Explore, You, Learn, Inbox */
const phoneAt = r => DSApprovals.h.phone(r);
const TA = a => Dt.D.teams.find(t => t.abbr === a) || {};
const chev = () => S(icon('chev', 'sm'));
const seasonChip = (t) => `<button class="sc-season r6pk-c">${esc(t)}${S(icon('down', 'xs'))}</button>`;

R['stats-pickers'] = { id: 'stats-pickers', v: 1, ready: true, name: 'Stats + Leaders: pickers', target: 'stats.js stats() leaders() · .chips',
  changes: ['Stats opens on a row of five year chips (2026 … 2022, ink when picked); Leaders has a row of category chips (Pass YDS, Pass TD, RTG…) and two dropdown chips (2026 ▾, All positions ▾). Three picker shapes on two pages.',
    'Both use the approved system pickers: the season is the Scores season chip ("2026 ▾", opens a sheet), and so is position.',
    'A, Leaders\' categories become the small tabs (as on the player and team tables).',
    'B, the categories stay a chip row but in the squared season-chip shape, ink when picked.'],
  options: [{ k: 'a', name: 'Tabs', note: 'Categories as small tabs.' }, { k: 'b', name: 'Chip row', note: 'Categories as squared chips.' }],
  current: () => V('As the app draws it', '#/stats and #/leaders', PH(phoneAt('stats') + phoneAt('leaders'))),
  proposed: k => { const cats = ['Pass YDS', 'Pass TD', 'RTG', 'CMP%', 'Y/A', 'INT'];
    return V(k === 'a' ? 'Tabs' : 'Chip row', 'Stats, then Leaders', PH(`<div class="r6pk-row">${seasonChip('2026 regular season')}</div><div class="t-meta mt8">Through Week 5</div>
      <div class="r6x-sec" style="margin-top:24px"><h3 class="r6x-h">Passing yards</h3></div>
      ${k === 'a' ? S(UI.tabs(cats.map(c => [c, c]), 'Pass YDS', '', 'sm')) : `<div class="r6pk-row">${cats.map((c, i) => `<button class="sc-season r6pk-c ${i ? '' : 'on'}">${c}</button>`).join('')}</div>`}
      <div class="r6pk-row mt12">${seasonChip('2026')}${seasonChip('All positions')}</div>`)); } };

R['records-tabs'] = { id: 'records-tabs', v: 1, ready: true, name: 'Record book: switcher + rows', target: 'stats.js records() · .seg',
  changes: ['Career / Single season / Single game. Today a segmented control whose picked segment is a dark gradient pill, a shape used nowhere else; the record value is Stats Bold on the right.',
    'A, the small tabs (the app\'s one category switcher), the list rows unchanged.',
    'B, the squared ink segmented control (solid ink, no gradient), the list rows unchanged.'],
  options: [{ k: 'a', name: 'Small tabs', note: 'Same as tables.' }, { k: 'b', name: 'Ink segments', note: 'Solid, squared.' }],
  current: () => V('As the app draws it', '#/records', PH(phoneAt('records'))),
  proposed: k => { const rows = [['Passing yards', 'Tom Brady · 2000-22', '89,214'], ['Passing touchdowns', 'Tom Brady · 2000-22', '649'], ['Rushing yards', 'Emmitt Smith · 1990-2004', '18,355']];
    const sw = k === 'a' ? S(UI.tabs([{ k: 'c', l: 'Career' }, { k: 's', l: 'Single season' }, { k: 'g', l: 'Single game' }], 'c', '', 'sm')) : `<div class="r6rb-seg"><button class="on">Career</button><button>Single season</button><button>Single game</button></div>`;
    return V(k === 'a' ? 'Small tabs' : 'Ink segments', '#/records', PH(`${sw}<div class="list mt12">${rows.map(r => `<div class="row static"><div class="row-main"><div class="row-title">${r[0]}</div><div class="row-sub">${r[1]}</div></div><b class="r6rb-v">${r[2]}</b></div>`).join('')}</div>`)); } };

R['sb-filter'] = { id: 'sb-filter', v: 1, ready: true, name: 'Super Bowls: team filter', target: 'history.js superBowls() · .chips .chip',
  changes: ['A row of rounded chips with a logo and tricode (All, KC, NE, PIT, SF, DAL…) that runs off the screen.',
    'A, one squared season-style chip, "All teams ▾", that opens a sheet of the teams with Super Bowl appearances.',
    'B, keep the row, squared like the season chip, logo + tricode, ink when picked.'],
  options: [{ k: 'a', name: 'One chip + sheet', note: 'Nothing runs off screen.' }, { k: 'b', name: 'Squared row', note: 'Logos stay visible.' }],
  current: () => V('As the app draws it', '#/super-bowls', PH(phoneAt('super-bowls'))),
  proposed: k => V(k === 'a' ? 'One chip + sheet' : 'Squared row', '#/super-bowls', PH(k === 'a' ? `<div class="r6pk-row">${seasonChip('All teams')}</div><div class="t-meta mt8">60 games since January 1967</div>`
    : `<div class="r6pk-row"><button class="sc-season r6pk-c on">All</button>${['KC', 'NE', 'PIT', 'SF', 'DAL'].map(a => `<button class="sc-season r6pk-c">${S(UI.logo(TA(a).id, 'xs'))}${a}</button>`).join('')}</div>`)) };

const SBS = [['LX', 2026, 'SEA', 29, 'NE', 13, "Levi's Stadium, Santa Clara", ''], ['LIX', 2025, 'PHI', 40, 'KC', 22, 'Caesars Superdome, New Orleans', 'Jalen Hurts'], ['LVIII', 2024, 'KC', 25, 'SF', 22, 'Allegiant Stadium, Las Vegas · OT', 'Patrick Mahomes']];
R['sb-rows'] = { id: 'sb-rows', v: 3, ready: true, name: 'Super Bowls: game rows', target: 'history.js superBowls() rows',
  changes: ['Your note on v2: "are these all sans for the score? stats is just small stats yeah? Or is final score also all pro display? again, think systematically." The rule now, applied app-wide: every score is Display (as on the game card); Stats is only for numbers that line up in tables, box scores and clocks; every other number (ranks, records, dates) is Sans. So the scores here are Display.',
    'Your note on v1: "merge these two. i like the MVP and i don\'t think you need location, but i like the big LX or LIX on the left".',
    'Both: the numeral big in Display on the left with the year under it, then the two team lines (logo, team name in Sans, score; winner bold), MVP as Meta, no venue, chevron.',
    'A, the numeral at 22px in a 56px column.',
    'B, the numeral at 30px, and the winner\'s team-colour edge on the left of the row (the approved Scores lockup edge).'],
  options: [{ k: 'a', name: 'Numeral column', note: 'Even, calm.' }, { k: 'b', name: 'Big numeral + edge', note: 'Winner\'s colour.' }],
  current: () => V('As the app draws it', '#/super-bowls', PH(phoneAt('super-bowls'))),
  proposed: k => V(k === 'a' ? 'Numeral column' : 'Big numeral + edge', '#/super-bowls', PH(`<div class="list">${SBS.map(([n, y, w, ws, l, ls, ven, mvp]) =>
    `<div class="row static r6sb2 ${k}" style="--e:${App.teamFill(TA(w))}"><div class="r6sb2-n"><b>${n}</b><span>${y}</span></div><div class="row-main">${[[w, ws, 1], [l, ls, 0]].map(([a, sc, win]) => `<div class="r6sb-l ${win ? 'w' : ''}">${S(UI.logo(TA(a).id, 'sm'))}<span>${esc(TA(a).name)}</span><b>${sc}</b></div>`).join('')}${mvp ? `<div class="row-sub">MVP ${esc(mvp)}</div>` : ''}</div>${chev()}</div>`).join('')}</div>`)) };

const TITLES = [['PIT', 6, 8], ['NE', 6, 12], ['DAL', 5, 8], ['SF', 5, 8], ['GB', 4, 5]], PWR = [['SF', '5-0', '+61', 0], ['KC', '4-0', '+41', 0], ['MIN', '5-0', '+45', 0], ['JAX', '4-1', '+53', 0], ['BAL', '4-1', '+27', 4]];
R['ranked-rows'] = { id: 'ranked-rows', v: 3, ready: true, name: 'Ranked team rows', target: 'history.js titles · stats.js powerRankings() · .pr-row',
  changes: ['Your note on v2: "shouldn\'t these all be all pro sans not all pro stats?" Yes: by the number rule (Stats only in tables, box scores and clocks) the rank is now Sans bold; the big value on the right stays Display; Meta lines are Sans.',
    'Your note on v1: "we use all pro display for large numbers". The value on the right (titles, record) is now Display; the rank stays small.',
    'Two ranked lists of teams: Most Super Bowl titles (History) and Power rankings (Stats). Titles: rank in Sans, full name in Display caps, count, chevron. Power rankings: rank in Display italic, short name in Display caps, a round grey "–" or a green pill for movement, a red bar on your team.',
    'Both: one ranked row for both lists, the team name (Steelers) in Sans, rank in Stats, the value in Display (big number), movement as Meta text with an arrow, no round pills.',
    'A, rank, logo, name with Meta under, value on the right; your team gets the team-colour edge (approved on the Scores lockup).',
    'B, the same with the rank inside a squared 32px tile, ink for the top three.'],
  options: [{ k: 'a', name: 'Plain rank', note: 'Rank as a number.' }, { k: 'b', name: 'Rank tile', note: 'Top three in ink.' }],
  current: () => V('As the app draws it', '#/history, #/stats', PH(phoneAt('history') + phoneAt('stats'))),
  proposed: k => { const rk = i => k === 'b' ? `<span class="r6rk-t ${i < 3 ? 'top' : ''}">${i + 1}</span>` : `<b class="r6rk-n">${i + 1}</b>`;
    const row = (a, i, sub, val, mine) => `<div class="row static r6rk ${mine ? 'mine' : ''}" style="--e:${App.teamFill(TA(a))}">${rk(i)}${S(UI.logo(TA(a).id, 'sm'))}<div class="row-main"><div class="row-title">${esc(TA(a).name)}</div><div class="row-sub">${sub}</div></div>${val}</div>`;
    return V(k === 'a' ? 'Plain rank' : 'Rank tile', 'History, then Stats', PH(`<div class="r6x-sec"><h3 class="r6x-h">Most Super Bowl titles</h3></div><div class="list">${TITLES.map(([a, t, ap], i) => row(a, i, ap + ' appearances', `<b class="r6rk-v r6rk-d">${t}</b>`)).join('')}</div>
      <div class="r6x-sec" style="margin-top:24px"><h3 class="r6x-h">Power rankings</h3></div><div class="list">${PWR.map(([a, rec, pd, mv], i) => row(a, i, `${pd} point diff`, `<span class="r6rk-r"><b class="r6rk-d">${rec}</b><span class="r6rk-mv ${mv ? 'up' : ''}">${mv ? '▲ ' + mv : 'No change'}</span></span>`, a === 'KC')).join('')}</div>`)); } };

R['history-champ'] = { id: 'history-champ', v: 1, ready: true, name: 'History: reigning champions', target: 'history.js · .hx-feature',
  changes: ['The top of #/history: a navy card (not the champion\'s colours), "REIGNING CHAMPIONS", SEAHAWKS in Display, the score line, the logo on the right, a grey bar under it.',
    'Both: the champion\'s gradient at 180° (full colour at 42%), Display caps name, no bar, white text only.',
    'A, the card as today with those changes.',
    'B, adds a white "Relive Super Bowl LX" button, squared.'],
  options: [{ k: 'a', name: 'Champion card', note: 'Gradient, no button.' }, { k: 'b', name: 'With replay', note: 'Adds the button.' }],
  current: () => V('As the app draws it', '#/history', PH(phoneAt('history'))),
  proposed: k => { const tm = TA('SEA');
    return V(k === 'a' ? 'Champion card' : 'With replay', '#/history', PH(`<div class="r6hc" style="${App.teamVars(tm)}"><div class="r6hc-t"><div><span class="r6hc-eb">Reigning champions</span><div class="r6hc-n">${esc(tm.name.toUpperCase())}</div><p>Super Bowl LX · SEA 29-13 NE</p></div>${S(UI.logo(tm.id, 'lg'))}</div>${k === 'b' ? `<button class="btn white sm mt12">${S(icon('play', 'sm'))}Relive Super Bowl LX</button>` : ''}</div>`)); } };

R['hub-tiles'] = { id: 'hub-tiles', v: 1, ready: true, name: 'Hub shortcut tiles', target: 'explore.js .ex-quick · stats.js .sc-tools',
  changes: ['Two shortcut-tile styles: Explore has four squared tiles (icon in a grey tile over a label); Stats has a 2 × 2 of white cards with a blue icon, a title and a line.',
    'A, one tile everywhere: the Explore tile (ink icon in a grey tile, label under), four across on Explore, and the same tile with a Meta line, two across, on Stats.',
    'B, no tiles on Stats: its four shortcuts become a list (icon tile, title, line, chevron) like the rest of Explore; Explore keeps its four tiles.'],
  options: [{ k: 'a', name: 'One tile', note: 'Explore\'s tile on Stats too.' }, { k: 'b', name: 'Stats as a list', note: 'Tiles only on Explore.' }],
  current: () => V('As the app draws it', '#/explore, #/stats', PH(phoneAt('explore') + phoneAt('stats'))),
  proposed: k => { const ST = [['search', 'Stat finder', 'Ask any question'], ['swap', 'Compare', 'Two players or teams'], ['chart', 'Team rankings', 'Offense, defense, EPA'], ['trophy', 'Records', 'All-time and single-season']];
    const tile = ([ic, t, sub]) => `<div class="r6hb-t"><span class="r6hb-i">${S(icon(ic))}</span><b>${t}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    return V(k === 'a' ? 'One tile' : 'Stats as a list', 'Explore, then Stats', PH(`<div class="r6hb-g4">${[['list', 'Standings'], ['chart', 'Stats'], ['trophy', 'Playoffs'], ['ticket', 'Tickets']].map(x => tile([x[0], x[1], ''])).join('')}</div>
      <div class="r6x-sec" style="margin-top:24px"><h3 class="r6x-h">Stats</h3></div>${k === 'a' ? `<div class="r6hb-g2">${ST.map(tile).join('')}</div>`
      : `<div class="list">${ST.map(([ic, t, sub]) => `<div class="row static"><span class="r6oc-ic">${S(icon(ic, 'sm'))}</span><div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${sub}</div></div>${chev()}</div>`).join('')}</div>`}`)); } };

R['you-follow'] = { id: 'you-follow', v: 1, ready: true, name: 'You: your team and teams to follow', target: 'you.js · Your team, Teams to follow',
  changes: ['Under the fan card. "Your team": logo, full name in Display caps, record, an outlined "Change" and a chevron. "Teams to follow": each rival with a filled "+ Follow" pill and a chevron, both in one row.',
    'Both: team names in Sans (Broncos, not DENVER BRONCOS), one action per row, the row itself opens the team.',
    'A, the approved squared 40px follow button from onboarding (outline +, ink check when followed); "Change" becomes a text link in the section head.',
    'B, a squared "+ Follow" chip (season-chip shape) that turns ink "Following".'],
  options: [{ k: 'a', name: 'Follow button', note: 'Same as onboarding.' }, { k: 'b', name: 'Follow chip', note: 'Labelled.' }],
  current: () => V('As the app draws it', '#/you', PH(phoneAt('you'))),
  proposed: k => { const tm = Dt.team(TID), rv = Dt.D.teams.filter(t => t.conf === tm.conf && t.div === tm.div && t.id !== TID);
    const btn = on => k === 'a' ? `<span class="r6op-b ${on ? 'on' : ''}">${S(icon(on ? 'check' : 'plus', 'sm'))}</span>` : `<button class="sc-season r6pk-c ${on ? 'on' : ''}">${S(icon(on ? 'check' : 'plus', 'xs'))}${on ? 'Following' : 'Follow'}</button>`;
    return V(k === 'a' ? 'Follow button' : 'Follow chip', '#/you', PH(`<div class="r6x-sec"><h3 class="r6x-h">Your team</h3><span class="r6dr-more">Change</span></div><div class="list"><div class="row static r6rk">${S(UI.logo(TID, 'sm'))}<div class="row-main"><div class="row-title">${esc(tm.name)}</div><div class="row-sub">4-0 · ${tm.conf} ${tm.div}</div></div>${chev()}</div></div>
      <div class="r6x-sec" style="margin-top:24px"><h3 class="r6x-h">Teams to follow</h3></div><div class="list">${rv.map((t, i) => `<div class="row static r6rk">${S(UI.logo(t.id, 'sm'))}<div class="row-main"><div class="row-title">${esc(t.name)}</div><div class="row-sub">Division rival</div></div>${btn(i === 1)}</div>`).join('')}</div>`)); } };

R['empty-state'] = { id: 'empty-state', v: 1, ready: true, name: 'Empty states', target: 'UI .empty (wallet, tickets, inbox, following…)',
  changes: ['When a page has nothing yet (no tickets in the wallet, no alerts): a grey icon, a bold line, a sentence and a button, centred in the empty page.',
    'A, a card at the top of the page: the icon in a squared grey tile, the title, the line, and a squared primary button, left-aligned like the rest of the app.',
    'B, stays centred but the icon sits in a 56px squared tile and the button is squared, with the page\'s next-best content (upcoming home games) under it.'],
  options: [{ k: 'a', name: 'Card', note: 'Left-aligned card.' }, { k: 'b', name: 'Centred + next step', note: 'Adds something to do.' }],
  current: () => V('As the app draws it', '#/wallet', PH(phoneAt('wallet'))),
  proposed: k => { const ng = Dt.nextGame(TID);
    return V(k === 'a' ? 'Card' : 'Centred + next step', '#/wallet', PH(k === 'a'
      ? `<div class="r6es-c"><span class="r6oc-ic">${S(icon('wallet'))}</span><div><b>No upcoming tickets</b><p>Tickets you buy or receive show up here, ready to scan.</p><button class="btn primary sm">Find tickets</button></div></div>`
      : `<div class="r6es-m"><span class="r6es-i">${S(icon('wallet'))}</span><b>No upcoming tickets</b><p>Tickets you buy or receive show up here, ready to scan.</p><button class="btn primary">Find tickets</button></div>${ng ? `<div class="r6x-sec" style="margin-top:24px"><h3 class="r6x-h">Next home game</h3></div><div class="list"><div class="row static">${S(UI.logo(Dt.opp(ng, TID), 'sm'))}<div class="row-main"><div class="row-title">${Dt.isHome(ng, TID) ? 'vs' : 'at'} ${esc(Dt.team(Dt.opp(ng, TID)).name)}</div><div class="row-sub">${fmt.day(ng.ts)} · ${fmt.time(ng.ts)}</div></div>${chev()}</div></div>` : ''}`)); } };

R['learn-hero'] = { id: 'learn-hero', v: 1, ready: true, name: 'Learn: Football 101', target: 'learn.js · .lr-hero',
  changes: ['The top of #/learn: "LEARN THE GAME", FOOTBALL 101 in Display, a line, then a round progress ring (0/9), "Start in 3 minutes / Next: The basics" and a Start button.',
    'Both: progress as the segmented ladder from the fan card (one segment per lesson) instead of a ring, the button squared.',
    'A, on the page (no card), as today.',
    'B, as a card in NFL blue at 180° (full at 42%), white text, white Start.'],
  options: [{ k: 'a', name: 'On the page', note: 'Ladder, squared Start.' }, { k: 'b', name: 'NFL blue card', note: 'Hero card.' }],
  current: () => V('As the app draws it', '#/learn', PH(phoneAt('learn'))),
  proposed: k => V(k === 'a' ? 'On the page' : 'NFL blue card', '#/learn', PH(`<div class="r6lh ${k}"><span class="r6lh-eb">Learn the game</span><div class="r6lh-t">FOOTBALL 101</div><p>Short lessons that make every Sunday make sense. No jargon left unexplained.</p>
    <div class="r6lh-lad">${Array.from({ length: 9 }, () => '<i></i>').join('')}</div><div class="r6lh-f"><div><b>0 of 9 lessons</b><span>Next: The basics · 3 min</span></div><button class="btn ${k === 'b' ? 'white' : 'primary'} sm">Start</button></div></div>`)) };

R['inbox-rows'] = { id: 'inbox-rows', v: 1, ready: true, name: 'Notifications: rows', target: 'community.js inbox · .ib-day',
  changes: ['#/inbox. Team alerts show a bare logo; news alerts show an icon in a grey tile, so the left edge zig-zags. Time sits on its own third line.',
    'A, every row leads with the same 40px squared tile (the team logo or the icon inside it), the time moves up next to the title, unread rows get a dot.',
    'B, no tiles: a 28px logo or icon, unread rows bold, time as Meta on the right.'],
  options: [{ k: 'a', name: 'Tiles', note: 'One even edge.' }, { k: 'b', name: 'Bare', note: 'Lighter.' }],
  current: () => V('As the app draws it', '#/inbox', PH(phoneAt('inbox'))),
  proposed: k => { const N = [[1, 'logo', 'Game day: Chargers at Chiefs', '4:25 PM EDT · CBS', '7h'], [1, 'news', 'NFL Week 6 uniforms: Broncos, Seahawks throw it back', 'What each team is wearing', '10h'], [0, 'logo', 'Injury: Josh Simmons is out', 'Chiefs · OT · Back · return ~Oct 25', '12h']];
    const lead = t => t === 'logo' ? S(UI.logo(TID, 'sm')) : S(icon('news', 'sm'));
    return V(k === 'a' ? 'Tiles' : 'Bare', '#/inbox', PH(`<div class="eyebrow">Today</div><div class="list mt8">${N.map(([un, t, ti, sub, ago]) => `<div class="row static r6ib ${k} ${un ? 'un' : ''}">${k === 'a' ? `<span class="r6ib-t">${lead(t)}</span>` : `<span class="r6ib-b">${lead(t)}</span>`}<div class="row-main"><div class="r6ib-h"><span class="row-title">${esc(ti)}</span><span class="t-meta">${ago}</span></div><div class="row-sub">${esc(sub)}</div></div>${k === 'a' && un ? '<i class="r6ib-d"></i>' : ''}</div>`).join('')}</div>`)); } };

/* ---------------- batch 2026-11-07 b: icon rows, intros, franchise, calendar, finder, tables, tickets, stadiums, passport, promos, lessons */
const SEC = t => `<div class="r6x-sec"><h3 class="r6x-h">${t}</h3></div>`;
const HOF = [['Eric Allen', 'CB', 'PHI'], ['Jared Allen', 'DE', 'MIN'], ['Antonio Gates', 'TE', 'LAC'], ['Sterling Sharpe', 'WR', 'GB']];
const INTL = [['49ers vs Rams', 'Melbourne · Melbourne Cricket Ground', 'Thu, Sep 10 · Final SF 27-7 LAR', 'SF'], ['Ravens vs Cowboys', 'Rio · Maracanã Stadium', 'Sun, Sep 27 · Final BAL 34-31 DAL', 'BAL'], ['Eagles vs Jaguars', 'London · Tottenham Hotspur Stadium', 'Sun, Oct 11 · Final PHI 17-19 JAX', 'JAX']];

R['icon-rows'] = { id: 'icon-rows', v: 1, ready: true, name: 'Rows that repeat one icon', target: 'history.js hof() · intl.js · fanlife.js watchSpots()',
  changes: ['Three lists put the same grey icon tile on every row: a medal on each Hall of Famer, a globe on each international game, a pin on each watch spot. The icon says nothing the section head doesn\'t.',
    'A, drop the repeated icon: name in Sans, a Meta line, chevron. A logo leads only when it tells you something (the player\'s team, the home team).',
    'B, swap the icon for that row\'s logo in the approved 40px squared tile (as on Notifications), so the left edge stays even.'],
  options: [{ k: 'a', name: 'No icon', note: 'Lighter.' }, { k: 'b', name: 'Logo tile', note: 'Even left edge.' }],
  current: () => V('As the app draws it', '#/hof, #/international', PH(phoneAt('hof') + phoneAt('international'))),
  proposed: k => { const lead = a => k === 'b' ? `<span class="r6ir-t">${S(UI.logo(TA(a).id, 'sm'))}</span>` : '';
    return V(k === 'a' ? 'No icon' : 'Logo tile', 'Hall of Fame, then International', PH(`${SEC('Class of 2025')}<div class="list">${HOF.map(([n, p, a]) => `<div class="row static r6ir">${lead(a)}<div class="row-main"><div class="row-title">${n}</div><div class="row-sub">${p} · ${esc(TA(a).name)}</div></div>${chev()}</div>`).join('')}</div>
      <div style="margin-top:24px">${SEC('2026 international games')}</div><div class="list">${INTL.map(([t, w, d, a]) => `<div class="row static r6ir">${lead(a)}<div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${w}<br>${d}</div></div>${chev()}</div>`).join('')}</div>`)); } };

R['page-intro'] = { id: 'page-intro', v: 1, ready: true, name: 'Page intros', target: 'hof · international · stadiums · watch-spots · super-bowls',
  changes: ['Five ways to open a page: Hall of Fame has a white card with a yellow left bar and a Display title; International has an eyebrow, a Display headline and a grey info box; Stadiums, Watch with fans and Super Bowls open with a grey paragraph.',
    'A, one plain intro for every page: a single Body line in the text colour under the page title, no card, no bar, no info box. Settings links become a text link in that line.',
    'B, no intro: the page title says it; anything the fan must know (local kickoff times) moves to where it applies, as Meta.'],
  options: [{ k: 'a', name: 'One line', note: 'Same everywhere.' }, { k: 'b', name: 'No intro', note: 'Straight to content.' }],
  current: () => V('As the app draws it', '#/hof, #/international', PH(phoneAt('hof') + phoneAt('international'))),
  proposed: k => V(k === 'a' ? 'One line' : 'No intro', '#/hof, #/international', PH(`${k === 'a' ? `<p class="r6pi">Every class is chosen the night before the Super Bowl and enshrined each August in Canton, Ohio.</p>` : ''}${SEC('Class of 2025')}<div class="list">${HOF.slice(0, 2).map(([n, p, a]) => `<div class="row static"><div class="row-main"><div class="row-title">${n}</div><div class="row-sub">${p} · ${esc(TA(a).name)}</div></div>${chev()}</div>`).join('')}</div>
    <div class="r6-div"></div>${k === 'a' ? `<p class="r6pi">Every kickoff is shown in your local time. Watching from outside the US? <a class="r6pi-l">Set your country</a>.</p>` : ''}${SEC('2026 international games')}<div class="list"><div class="row static"><div class="row-main"><div class="row-title">Eagles vs Jaguars</div><div class="row-sub">London · Sun, Oct 11${k === 'b' ? ' · 9:30 AM your time' : ''}</div></div>${chev()}</div></div>`)) };

R['franchise-hero'] = { id: 'franchise-hero', v: 1, ready: true, name: 'Franchise page header', target: 'history.js franchise/:id · .fr-hero',
  changes: ['#/franchise/:id opens on a full-width team block (diagonal gradient), EST. 1960, CHIEFS, then three stats (4 NFL titles, 4 Super Bowl wins, 7 SB appearances) in Display, and "Formerly: Dallas Texans" as grey text under the block.',
    'Both: the gradient at 180°, full colour at 42%, white text only, "Formerly" moves inside with the founding year.',
    'A, the block as today with the three stats as the fan-card stat row (Display number, caps label, thin dividers).',
    'B, the approved champion card shape (rounded card on the page), the stat row inside it.'],
  options: [{ k: 'a', name: 'Full width', note: 'Like a team page.' }, { k: 'b', name: 'Card', note: 'Like History.' }],
  current: () => V('As the app draws it', '#/franchise/12', PH(phoneAt('franchise/12'))),
  proposed: k => { const tm = Dt.team(TID);
    return V(k === 'a' ? 'Full width' : 'Card', '#/franchise/12', PH(`<div class="r6fh ${k}" style="${App.teamVars(tm)}"><div class="r6hc-t"><div><span class="r6hc-eb">Est. 1960 · formerly Dallas Texans</span><div class="r6hc-n">${esc(tm.name.toUpperCase())}</div></div>${S(UI.logo(tm.id, 'lg'))}</div>
      <div class="r6fh-s">${[[4, 'NFL titles'], [4, 'SB wins'], [7, 'SB apps']].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div></div>`)); } };

R['franchise-sb'] = { id: 'franchise-sb', v: 1, ready: true, name: 'Franchise: Super Bowl history rows', target: 'history.js franchise/:id rows',
  changes: ['Each row: numeral in a left column, a green W or red L with the score and opponent, season · city · MVP under. A third way to draw a Super Bowl (History has two).',
    'Both reuse the Super Bowls row being revised now (numeral big on the left in Display, year under it, MVP as Meta, no city).',
    'A, the result as a word in Display caps ("WON 25-22", "LOST 22-40"), opponent logo + name in Sans. No green or red text.',
    'B, the two team lines exactly as on #/super-bowls (winner bold), so a Chiefs Super Bowl looks the same in both places.'],
  options: [{ k: 'a', name: 'Result line', note: 'From the team\'s side.' }, { k: 'b', name: 'Same as Super Bowls', note: 'One row everywhere.' }],
  current: () => V('As the app draws it', '#/franchise/12', PH(phoneAt('franchise/12'))),
  proposed: k => { const G = [['LIX', 2025, 0, '22-40', 'PHI', ''], ['LVIII', 2024, 1, '25-22', 'SF', 'Patrick Mahomes'], ['LVII', 2023, 1, '38-35', 'PHI', 'Patrick Mahomes']];
    return V(k === 'a' ? 'Result line' : 'Same as Super Bowls', '#/franchise/12', PH(`${SEC('Super Bowl history')}<div class="list">${G.map(([n, y, w, sc, o, mvp]) => { const [a, b] = sc.split('-');
      const body = k === 'a' ? `<div class="r6fs-r">${w ? 'WON' : 'LOST'} ${sc}</div><div class="r6sb-l">${S(UI.logo(TA(o).id, 'sm'))}<span>vs ${esc(TA(o).name)}</span></div>`
        : [[w ? 'KC' : o, w ? a : b, 1], [w ? o : 'KC', w ? b : a, 0]].map(([t, s2, win]) => `<div class="r6sb-l ${win ? 'w' : ''}">${S(UI.logo(TA(t).id, 'sm'))}<span>${esc(TA(t).name)}</span><b>${s2}</b></div>`).join('');
      return `<div class="row static r6sb2 a"><div class="r6sb2-n"><b>${n}</b><span>${y}</span></div><div class="row-main">${body}${mvp ? `<div class="row-sub">MVP ${mvp}</div>` : ''}</div>${chev()}</div>`; }).join('')}</div>`)); } };

R['calendar-rows'] = { id: 'calendar-rows', v: 1, ready: true, name: 'League calendar rows', target: 'scores.js calendar · .cal-*',
  changes: ['Past events are greyed out (faded text) with a grey tick; dates sit in a grey tile; "APPROX." is a rounded outline pill; the filter is a rounded chip row (Everything, Games, Offseason, My teams).',
    'Both: no faded text, the date tile squared, "Approx." as Meta after the date, the filter as the approved squared chip row.',
    'A, the calendar opens at today: past events fold into one "Earlier this year" row at the top that expands.',
    'B, past events stay in place in full text, with "Done" as Meta on the right instead of the tick.'],
  options: [{ k: 'a', name: 'Fold the past', note: 'Opens at today.' }, { k: 'b', name: 'Done label', note: 'Everything visible.' }],
  current: () => V('As the app draws it', '#/calendar', PH(phoneAt('calendar'))),
  proposed: k => { const ev = (d, m, t, s, done) => `<div class="row static r6cal"><span class="r6cal-d"><span>${d}</span><b>${m}</b></span><div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${s}</div></div>${done && k === 'b' ? '<span class="t-meta">Done</span>' : chev()}</div>`;
    const chips = `<div class="r6pk-row">${['Everything', 'Games', 'Offseason', 'My teams'].map((c, i) => `<button class="sc-season r6pk-c ${i ? '' : 'on'}">${c}</button>`).join('')}</div>`;
    return V(k === 'a' ? 'Fold the past' : 'Done label', '#/calendar', PH(`${chips}${k === 'a' ? `<div class="list mt12"><div class="row static"><span class="r6cal-d"><span>${S(icon('clock', 'sm'))}</span></span><div class="row-main"><div class="row-title">Earlier this year</div><div class="row-sub">Super Bowl LX, Combine, free agency, Draft · 9 events</div></div>${S(icon('down', 'sm'))}</div></div>${SEC('Coming up')}<div class="list">${ev('SUN', 18, 'Week 7', '15 games · Chiefs vs Chargers 4:25 PM')}${ev('TUE', 3, 'Trade deadline', '4 PM ET · approx.')}</div>`
      : `${SEC('February 2026')}<div class="list">${ev('SUN', 8, 'Super Bowl LX', 'SEA vs NE · Levi\'s Stadium', 1)}${ev('THU', 26, 'Scouting Combine', 'Indianapolis · Feb 23-Mar 2 · approx.', 1)}</div>`}`)); } };

R['finder-filters'] = { id: 'finder-filters', v: 1, ready: true, name: 'Stat finder filters', target: 'stats.js stat-finder · selects',
  changes: ['Stat finder has four grey form selects (Stat, Position, Season, Team), a Min. games field and a Rookies toggle, above a row of rounded suggestion pills. Form fields used nowhere else in the app.',
    'Both follow the switcher rule: every pick is the season chip that opens a sheet ("Passing yards ▾", "All positions ▾", "2026 ▾", "All teams ▾"). Suggestions become plain rows under the search.',
    'A, the four chips in a wrapping row; Min. games and Rookies move into a "More filters" sheet.',
    'B, one chip, "Passing yards ▾", plus a "Filters" chip with a count that opens one sheet holding the rest.'],
  options: [{ k: 'a', name: 'Chip per filter', note: 'All visible.' }, { k: 'b', name: 'Stat + Filters', note: 'Two chips.' }],
  current: () => V('As the app draws it', '#/stat-finder', PH(phoneAt('stat-finder'))),
  proposed: k => V(k === 'a' ? 'Chip per filter' : 'Stat + Filters', '#/stat-finder', PH(`<div class="r6ff-s">${S(icon('search', 'sm'))}<span>Try: most rushing yards by a rookie</span></div>
    <div class="r6pk-row mt12">${k === 'a' ? ['Passing yards', 'All positions', '2026', 'All teams'].map(seasonChip).join('') + `<button class="sc-season r6pk-c">${S(icon('filter', 'xs'))}More</button>` : seasonChip('Passing yards') + `<button class="sc-season r6pk-c">${S(icon('filter', 'xs'))}Filters · 2</button>`}</div>
    <div class="t-meta mt12">47 players by passing yards · 2026</div><div class="list mt8">${[['C.J. Stroud', 'HOU', '1,402'], ['Dak Prescott', 'DAL', '1,381'], ['Tyler Shough', 'NO', '1,299']].map(([n, a, v], i) => `<div class="row static r6rk"><b class="r6rk-n">${i + 1}</b>${S(UI.logo(TA(a).id, 'sm'))}<div class="row-main"><div class="row-title">${n}</div><div class="row-sub">${esc(TA(a).name)} · 5 games</div></div><b class="r6rk-v">${v}</b></div>`).join('')}</div>`)) };

R['table-mine'] = { id: 'table-mine', v: 1, ready: true, name: 'Tables: your team\'s row + sorted column', target: 'UI table · team-rankings, standings, leaders',
  changes: ['In big tables your team\'s row is filled pale pink, and the sorted column header is red with a ↓. Team cells are tricodes in Display italic.',
    'Both: your team gets the team-colour edge on the left (the approved Scores lockup edge) instead of a fill; team cells are the tricode in Sans bold.',
    'A, the sorted header in the text colour, bold, with the ↓; other headers Meta.',
    'B, the sorted column\'s numbers bold too, header with an underline in the accent.'],
  options: [{ k: 'a', name: 'Bold header', note: 'Quiet.' }, { k: 'b', name: 'Bold column', note: 'The sort is obvious.' }],
  current: () => V('As the app draws it', '#/team-rankings', PH(phoneAt('team-rankings'))),
  proposed: k => { const T = [['SF', '+0.41', '+0.63', '+0.19'], ['BUF', '+0.32', '+0.35', '+0.29'], ['KC', '+0.32', '+0.40', '+0.24'], ['DET', '+0.31', '+0.41', '+0.15']];
    return V(k === 'a' ? 'Bold header' : 'Bold column', '#/team-rankings', PH(`<div class="card r6tm ${k}"><div class="r6tm-r h"><span>#</span><span>Team</span><span class="s">EPA/play ↓</span><span>Pass</span><span>Rush</span></div>${T.map(([a, ...v], i) => `<div class="r6tm-r ${a === 'KC' ? 'mine' : ''}" style="--e:${App.teamFill(TA(a))}"><span>${i + 1}</span><span class="tm">${S(UI.logo(TA(a).id, 'xs'))}${a}</span>${v.map((x, j) => `<span class="${j ? '' : 's'}">${x}</span>`).join('')}</div>`).join('')}</div>`)); } };

R['tickets-filter'] = { id: 'tickets-filter', v: 1, ready: true, name: 'Tickets: team filter', target: 'fanlife.js tickets · .chips',
  changes: ['Tickets opens on a rounded chip row: My teams, then all 32 tricodes (KC, ARI, ATL…) running off the screen. Stadiums has a second rounded row (All, Roof or dome, Open air, Visited).',
    'By the switcher rule a team is a long set, so it\'s the season chip + sheet; a short filter is the approved squared chip row (as on Super Bowls).',
    'A, "My teams ▾" opens a sheet of all 32; Stadiums\' four filters become the squared row.',
    'B, the squared logo row for your teams only (KC + followed) plus "All teams ▾" at the end.'],
  options: [{ k: 'a', name: 'One chip', note: 'Nothing runs off.' }, { k: 'b', name: 'Your teams + more', note: 'Logos for yours.' }],
  current: () => V('As the app draws it', '#/tickets, #/stadiums', PH(phoneAt('tickets') + phoneAt('stadiums'))),
  proposed: k => V(k === 'a' ? 'One chip' : 'Your teams + more', '#/tickets, #/stadiums', PH(`<div class="r6pk-row">${k === 'a' ? seasonChip('My teams') : ['KC', 'DEN', 'LV'].map((a, i) => `<button class="sc-season r6pk-c ${i ? '' : 'on'}">${S(UI.logo(TA(a).id, 'xs'))}${a}</button>`).join('') + seasonChip('All teams')}</div>
    ${SEC('Home games for your teams')}<div class="list">${[['OCT', 18, 'Chargers at Chiefs', '$120'], ['NOV', 8, 'Jets at Chiefs', '$110']].map(([m, d, t, p]) => `<div class="row static r6cal"><span class="r6cal-d"><span>${m}</span><b>${d}</b></span><div class="row-main"><div class="row-title">${t}</div><div class="row-sub">Arrowhead Stadium · from ${p}</div></div>${chev()}</div>`).join('')}</div>
    <div class="r6-div"></div><div class="r6pk-row">${['All', 'Roof or dome', 'Open air', 'Visited'].map((c, i) => `<button class="sc-season r6pk-c ${i ? '' : 'on'}">${c}</button>`).join('')}</div>`)) };

R['stadium-list'] = { id: 'stadium-list', v: 1, ready: true, name: 'Stadiums: card or list', target: 'fanlife.js stadiums · .stad-card',
  changes: ['Each stadium is a big photo card with the team logo in a white badge overlapping the photo, then the name and a Meta line. 30 tall cards to scroll.',
    'A, keep the photo card but shorter (16:7), the logo moves next to the name instead of on the photo.',
    'B, a list row: 72px squared photo, name, city · roof · seats, chevron. Your teams\' stadiums first under "Your teams".'],
  options: [{ k: 'a', name: 'Shorter card', note: 'Photo stays big.' }, { k: 'b', name: 'Photo rows', note: 'Scannable.' }],
  current: () => V('As the app draws it', '#/stadiums', PH(phoneAt('stadiums'))),
  proposed: k => { const S2 = [['KC', 'GEHA Field at Arrowhead Stadium', 'Kansas City, MO · Open air · 76,416 seats'], ['PIT', 'Acrisure Stadium', 'Pittsburgh, PA · Open air · 68,400 seats']];
    const ph = a => { const t = TA(a); return (App.data.stadiumImg && App.data.stadiumImg(t.id)) || ''; };
    return V(k === 'a' ? 'Shorter card' : 'Photo rows', '#/stadiums', PH(k === 'a' ? S2.map(([a, n, m]) => `<div class="card r6st"><div class="r6st-p" style="background-image:url('${(TA(a).venue || {}).img}')"></div><div class="r6st-b">${S(UI.logo(TA(a).id, 'sm'))}<div><b>${n}</b><span>${m}</span></div></div></div>`).join('')
      : `${SEC('Your teams')}<div class="list">${S2.map(([a, n, m]) => `<div class="row static"><span class="r6st-th" style="background-image:url('${(TA(a).venue || {}).img}')"></span><div class="row-main"><div class="row-title">${n}</div><div class="row-sub">${m}</div></div>${chev()}</div>`).join('')}</div>`)); } };

R['passport'] = { id: 'passport', v: 1, ready: true, name: 'Stadium passport', target: 'fanlife.js passport · fan card Stadiums stat',
  changes: ['A whole page, "Your stadiums", for a count most fans keep at 1 or 2: home, the next away stadium with Plan a trip, a link to all 30, and "0 visited".',
    'A, no passport page: the fan card\'s Stadiums stat opens #/stadiums with "Visited" picked; a check-in marks the stadium there with a squared check.',
    'B, keep it as one row on Tickets ("Stadiums visited · 1 of 30") that opens the same filtered list; the Plan a trip card moves to the away game.'],
  options: [{ k: 'a', name: 'No page', note: 'Lives on Stadiums.' }, { k: 'b', name: 'One row', note: 'On Tickets.' }],
  current: () => V('As the app draws it', '#/passport', PH(phoneAt('passport'))),
  proposed: k => V(k === 'a' ? 'No page' : 'One row', k === 'a' ? '#/stadiums (Visited)' : '#/tickets', PH(k === 'a' ? `<div class="r6pk-row">${['All', 'Roof or dome', 'Open air', 'Visited · 1'].map((c, i) => `<button class="sc-season r6pk-c ${i === 3 ? 'on' : ''}">${c}</button>`).join('')}</div><div class="list mt12"><div class="row static"><span class="r6st-th" style="background-image:url('${(TA('KC').venue || {}).img}')"></span><div class="row-main"><div class="row-title">GEHA Field at Arrowhead Stadium</div><div class="row-sub">Checked in Sep 14 · Chiefs vs Ravens</div></div><span class="ob-radio r6on"></span></div></div>`
    : `${SEC('Game-day tools')}<div class="list"><div class="row static"><span class="r6oc-ic">${S(icon('wallet'))}</span><div class="row-main"><div class="row-title">Ticket wallet</div><div class="row-sub">Your mobile tickets</div></div>${chev()}</div><div class="row static"><span class="r6oc-ic">${S(icon('stadium'))}</span><div class="row-main"><div class="row-title">Stadiums visited</div><div class="row-sub">1 of 30 · guides for all of them</div></div>${chev()}</div></div>`)) };

R['promo-card'] = { id: 'promo-card', v: 1, ready: true, name: 'Team promo cards', target: 'shop .sh-hero · watch-spots party card',
  changes: ['Two team-coloured promo cards drawn differently: Shop\'s jersey builder (diagonal gradient, three-line Display headline, white rounded button, jersey art) and Watch with fans\' next watch party (gradient, Sans title, white "I\'m going").',
    'Both: one promo card, the team gradient at 180° full at 42%, eyebrow, a Display caps title, one Body line, a squared white button, white text only. The approved champion card is the same card.',
    'A, title at 28px, art (jersey, logo) on the right.',
    'B, no art: title and button only, so it reads as one family with the champion card.'],
  options: [{ k: 'a', name: 'With art', note: 'Jersey stays.' }, { k: 'b', name: 'Type only', note: 'Cleaner.' }],
  current: () => V('As the app draws it', '#/shop, #/watch-spots', PH(phoneAt('shop') + phoneAt('watch-spots'))),
  proposed: k => { const tm = Dt.team(TID), card = (eb, t, p, b, art) => `<div class="r6hc r6pc" style="${App.teamVars(tm)}"><div class="r6hc-t"><div><span class="r6hc-eb">${eb}</span><div class="r6hc-n">${t}</div><p>${p}</p></div>${k === 'a' ? art : ''}</div><button class="btn white sm mt12">${b}</button></div>`;
    return V(k === 'a' ? 'With art' : 'Type only', '#/shop, #/watch-spots', PH(card('Jersey builder', 'YOUR NAME. YOUR NUMBER.', 'Build a Chiefs jersey with your name on the back.', 'Build a jersey', `<span class="r6pc-j">${S(icon('user', 'lg'))}</span>`) + '<div style="height:16px"></div>' + card('Next watch party', 'VS CHARGERS', 'Sun, Oct 18 · 4:25 PM · hosted by your city\'s Chiefs fan club', `${S(icon('calendar', 'sm'))}I'm going`, S(UI.logo(tm.id, 'lg'))))); } };

R['lesson-page'] = { id: 'lesson-page', v: 1, ready: true, name: 'Learn: lesson page', target: 'learn.js learn/:id',
  changes: ['A lesson: eyebrow, Display title, body copy, a field diagram, then "How points are scored" as a Sans bold heading over rows with red point values ("+1 / +2" wrapping).',
    'Both: section heads in Display caps like every other page; point values in Display in the text colour (big numbers are Display), not red.',
    'A, the values in a 56px left column, the play and its line to the right.',
    'B, the values in the approved 40px squared tile (as on Notifications).'],
  options: [{ k: 'a', name: 'Value column', note: 'Like a table.' }, { k: 'b', name: 'Value tile', note: 'Like Notifications.' }],
  current: () => V('As the app draws it', '#/learn/basics', PH(phoneAt('learn/basics'))),
  proposed: k => V(k === 'a' ? 'Value column' : 'Value tile', '#/learn/basics', PH(`${SEC('How points are scored')}<div class="list">${[['6', 'Touchdown', 'Ball crosses into the end zone'], ['1-2', 'Try after a TD', 'Kick from the 15 for 1, or run/pass from the 2 for 2'], ['3', 'Field goal', 'Kick the ball through the uprights'], ['2', 'Safety', 'Defense tackles the ball carrier in his own end zone']].map(([v, t, s]) => `<div class="row static r6lp ${k}"><b class="r6lp-v">${v}</b><div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${s}</div></div></div>`).join('')}</div>`)) };


/* ---------------- batch 2026-11-08: community, offseason, podcasts, catch-up */
const QA = ['Baker Mayfield', 'Geno Smith', 'Jared Goff', 'Joe Burrow'];
R['answer-rows'] = { id: 'answer-rows', v: 1, ready: true, name: 'Trivia + poll answers', target: 'community.js trivia · polls',
  changes: ['Trivia answers and poll options are rounded outline boxes stacked inside a card; poll team options put the full name in Display caps (SAN FRANCISCO 49ERS). Onboarding\'s quiz (approved) answers the same kind of question with list rows and a squared check.',
    'Both use the onboarding quiz row: answer in Sans, squared check on the right, team options lead with the logo and use the short name (49ers).',
    'A, the rows as on onboarding; after you answer, the right one gets the ink check and the percentage shows as Meta.',
    'B, the same rows, but the picked row fills ink with white text (no check).'],
  options: [{ k: 'a', name: 'Quiz rows', note: 'Same as onboarding.' }, { k: 'b', name: 'Ink row', note: 'Picked row fills.' }],
  current: () => V('As the app draws it', '#/trivia, #/polls', PH(phoneAt('trivia') + phoneAt('polls'))),
  proposed: k => V(k === 'a' ? 'Quiz rows' : 'Ink row', '#/trivia, #/polls', PH(`<div class="t-meta">Question 1 of 5</div><div class="r6aq">Who led the NFL in passing yards in the 2024 regular season?</div><div class="list">${QA.map((q, i) => `<div class="row tap ob-qa r6ar ${k} ${i === 3 ? 'on' : ''}"><div class="row-main"><div class="row-title">${q}</div></div>${k === 'a' ? `<span class="t-meta">${[12, 9, 21, 58][i]}%</span><span class="ob-radio ${i === 3 ? 'r6on' : ''}"></span>` : ''}</div>`).join('')}</div>
    <div class="r6aq" style="margin-top:24px">Best team in football right now?</div><div class="list">${['SF', 'MIN', 'KC'].map(a => `<div class="row tap ob-qa r6ar ${k}"><span class="r6ir-t">${S(UI.logo(TA(a).id, 'sm'))}</span><div class="row-main"><div class="row-title">${esc(TA(a).name)}</div></div>${k === 'a' ? '<span class="ob-radio"></span>' : ''}</div>`).join('')}</div>`)) };

R['grade-picker'] = { id: 'grade-picker', v: 1, ready: true, name: 'Fan grades', target: 'community.js grades',
  changes: ['Each category is a card with a row of five rounded grey A–F buttons, and "Fans say A" in Display top right. The header is a team block.',
    'Both: the fans\' grade stays Display (a big headline value), the header uses the approved franchise header.',
    'A, the five grades as squared outline buttons (the season-chip shape), ink when picked.',
    'B, one row per category (title, line, fans\' grade) with a "Grade ▾" chip that opens a sheet of A–F.'],
  options: [{ k: 'a', name: 'Five buttons', note: 'One tap.' }, { k: 'b', name: 'Row + sheet', note: 'Compact list.' }],
  current: () => V('As the app draws it', '#/grades', PH(phoneAt('grades'))),
  proposed: k => { const C = [['Head coach', 'Andy Reid', 'A', 1], ['Quarterback', 'Patrick Mahomes', 'B', -1], ['Offense', 'Play-calling & execution', 'B', 2]];
    return V(k === 'a' ? 'Five buttons' : 'Row + sheet', '#/grades', PH(k === 'a' ? C.map(([t, s, g, my]) => `<div class="card r6gp"><div class="flex between"><div><b>${t}</b><span>${s}</span></div><div class="r6gp-f"><span>Fans say</span><b>${g}</b></div></div><div class="r6gp-row">${'ABCDF'.split('').map((x, i) => `<button class="sc-season r6pk-c ${i === my ? 'on' : ''}">${x}</button>`).join('')}</div></div>`).join('')
      : `<div class="list">${C.map(([t, s, g, my]) => `<div class="row static"><div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${s} · fans say ${g}</div></div>${seasonChip(my >= 0 ? 'ABCDF'[my] : 'Grade')}</div>`).join('')}</div>`)); } };

R['pickem-game'] = { id: 'pickem-game', v: 1, ready: true, name: 'Pick\'em: a game', target: 'community.js pickem',
  changes: ['Each game is a card holding two big rounded team boxes (logo, full name in Display caps, record, score), "at" between them, a grey FINAL pill and "No pick".',
    'Both: team names in Sans, scores in Display (the number rule), the approved status badge, no grey pill.',
    'A, the game as two team rows (logo, name, record, score) with the squared check on the right of each; tap a row to pick.',
    'B, the two teams side by side as squared outline buttons (logo, name, record), ink outline when picked, score under each once final.'],
  options: [{ k: 'a', name: 'Team rows', note: 'Like a game row.' }, { k: 'b', name: 'Two buttons', note: 'Side by side.' }],
  current: () => V('As the app draws it', '#/pickem', PH(phoneAt('pickem'))),
  proposed: k => { const G = [['TB', '0-4', 24, 0], ['DAL', '2-2', 16, 1]];
    return V(k === 'a' ? 'Team rows' : 'Two buttons', '#/pickem', PH(`<div class="flex between r6pg-h"><span class="badge final">Final</span><span class="t-meta">Your pick: Cowboys</span></div>${k === 'a' ? `<div class="list">${G.map(([a, r, sc, on]) => `<div class="row tap ob-qa ${on ? 'on' : ''}"><span class="r6ir-t">${S(UI.logo(TA(a).id, 'sm'))}</span><div class="row-main"><div class="row-title">${esc(TA(a).name)}</div><div class="row-sub">${r}</div></div><b class="r6pg-sc">${sc}</b><span class="ob-radio ${on ? 'r6on' : ''}"></span></div>`).join('')}</div>`
      : `<div class="r6pg-b">${G.map(([a, r, sc, on]) => `<button class="r6pg-t ${on ? 'on' : ''}">${S(UI.logo(TA(a).id, 'md'))}<b>${esc(TA(a).name)}</b><span>${r}</span><em>${sc}</em></button>`).join('<span class="t-meta">at</span>')}</div>`}`)); } };

R['summary-stats'] = { id: 'summary-stats', v: 1, ready: true, name: 'Summary numbers at the top of a page', target: 'pickem · free-agency recap · catchup hero',
  changes: ['Three pages open on a few big numbers drawn three ways: Pick\'em has three white tiles (0-0 Season, 0 Pick points, 0 Streak), Free agency a white card with a RECAP pill (208 Signings, 20 Trades, 24 Releases), Catch me up a red block (4-0, 7d 0h).',
    'All three use the fan-card stat row (approved on the franchise header): Display number, caps label, thin dividers.',
    'A, the row in a white card on the page.',
    'B, the row straight on the page, no card, under the page title.'],
  options: [{ k: 'a', name: 'In a card', note: 'Grouped.' }, { k: 'b', name: 'On the page', note: 'Lighter.' }],
  current: () => V('As the app draws it', '#/pickem, #/free-agency', PH(phoneAt('pickem') + phoneAt('free-agency'))),
  proposed: k => { const row = (eb, xs) => `<div class="r6ss ${k}">${eb ? `<span class="r6ss-eb">${eb}</span>` : ''}<div class="r6ss-r">${xs.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div></div>`;
    return V(k === 'a' ? 'In a card' : 'On the page', 'Pick\'em, Free agency, Catch me up', PH(row('Week 5 · 2026', [['0-0', 'Season'], [0, 'Points'], [0, 'Streak']]) + '<div class="r6-div"></div>' + row('The 2026 market is open', [[208, 'Signings'], [20, 'Trades'], [24, 'Releases']]) + '<div class="r6-div"></div>' + row('Last 7 days', [['4-0', '1st in AFC'], ['7d 0h', 'to Chargers']]))); } };

R['multi-filter'] = { id: 'multi-filter', v: 1, ready: true, name: 'Stacked filter rows', target: 'offseason.js transactions · free-agency',
  changes: ['Transactions stacks two rounded chip rows (All teams, My teams, KC, Choose team… / All, Signings, Trades, Releases, Injury lists); Free agency stacks three (type, position, team). All run off the screen.',
    'By the switcher rule: the team and the position are long sets, so dropdown chips ("All teams ▾", "Any position ▾"); the type is a short set that changes the list.',
    'A, the type as small tabs, the dropdown chips under them.',
    'B, one squared chip row: the type chips, then the dropdown chips at the end.'],
  options: [{ k: 'a', name: 'Tabs + dropdowns', note: 'Two lines.' }, { k: 'b', name: 'One row', note: 'All in one line.' }],
  current: () => V('As the app draws it', '#/transactions, #/free-agency', PH(phoneAt('transactions') + phoneAt('free-agency'))),
  proposed: k => V(k === 'a' ? 'Tabs + dropdowns' : 'One row', '#/transactions', PH(k === 'a' ? `${S(UI.tabs(['All', 'Signings', 'Trades', 'Releases', 'Injuries'].map(l => ({ k: l, l })), 'All', '', 'sm flush'))}<div class="r6pk-row mt12">${seasonChip('All teams')}${seasonChip('Any position')}</div>`
    : `<div class="r6pk-row">${['All', 'Signings', 'Trades', 'Releases'].map((c, i) => `<button class="sc-season r6pk-c ${i ? '' : 'on'}">${c}</button>`).join('')}${seasonChip('All teams')}${seasonChip('Any position')}</div>`)) };

R['podcast-rows'] = { id: 'podcast-rows', v: 1, ready: true, name: 'Podcasts: show + episodes', target: 'watch.js podcasts',
  changes: ['Each show: square art, name, line and a rounded "+ Follow" pill; then episode rows with a grey rounded play square on the right.',
    'Both: Follow is the approved follow chip (squared, ink "Following" when on, from You).',
    'A, the play button as a squared 40px outline button on the right, duration in Meta.',
    'B, the play button leads the row in the 40px squared tile (as on Notifications), so every list starts the same way.'],
  options: [{ k: 'a', name: 'Play on right', note: 'As today, squared.' }, { k: 'b', name: 'Play tile left', note: 'Even left edge.' }],
  current: () => V('As the app draws it', '#/podcasts', PH(phoneAt('podcasts'))),
  proposed: k => { const E = [['Week 5 reactions: Titans and Texans', '5h ago · 33 min'], ['Mailbag: what\'s next for the Falcons?', '4d ago · 42 min'], ['Overreaction Monday: the 49ers', '4d ago · 51 min']];
    const play = `<span class="r6pr-p">${S(icon('play', 'sm'))}</span>`;
    return V(k === 'a' ? 'Play on right' : 'Play tile left', '#/podcasts', PH(`<div class="flex gap12 center r6pr-h"><span class="r6pr-art">AROUND THE NFL</span><div class="grow"><b>Around the NFL</b><span>News, takes, and the week in football</span></div><button class="sc-season r6pk-c">${S(icon('plus', 'xs'))}Follow</button></div><div class="list mt12">${E.map(([t, m]) => `<div class="row static r6ir">${k === 'b' ? play : ''}<div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${m}</div></div>${k === 'a' ? play : ''}</div>`).join('')}</div>`)); } };

R['catchup-rows'] = { id: 'catchup-rows', v: 1, ready: true, name: 'Catch me up: result + headline rows', target: 'home.js catchup',
  changes: ['Catch me up lists results and headlines with a team logo leading each row (the Falcons logo on general NFL stories), the time twice ("1h ago · 1h ago") and a count to the right of each section head.',
    'Both: the time once, no count, and the result row is the approved game row.',
    'A, headlines as the News list row (title, Meta, thumbnail on the right), so a story looks the same everywhere.',
    'B, headlines with the 40px squared tile (team logo only when the story is about one team; the NFL shield otherwise).'],
  options: [{ k: 'a', name: 'News rows', note: 'Thumbnails.' }, { k: 'b', name: 'Tile rows', note: 'Like Notifications.' }],
  current: () => V('As the app draws it', '#/catchup', PH(phoneAt('catchup'))),
  proposed: k => { const H = [['NFL Week 5 uniforms: Packers debut Rivalries look, Patriots wearing throwbacks', 'Analysis · 1h ago', ''], ['2026 NFL quarter-season awards: MVP picks, top rookies, OPOY', 'Analysis · 3d ago', ''], ['Chiefs beat the Raiders 30-27 to move to 4-0', 'Chiefs · 6d ago', 'KC']];
    return V(k === 'a' ? 'News rows' : 'Tile rows', '#/catchup', PH(`${SEC('Headlines')}<div class="list">${H.map(([t, m, a]) => `<div class="row static r6ir">${k === 'b' ? `<span class="r6ir-t">${a ? S(UI.logo(TA(a).id, 'sm')) : S(icon('news', 'sm'))}</span>` : ''}<div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${m}</div></div>${k === 'a' ? `<span class="r6cr-th"></span>` : ''}</div>`).join('')}</div>`)); } };

R['cap-card'] = { id: 'cap-card', v: 1, ready: true, name: 'Contracts & cap: your team\'s payroll', target: 'offseason.js cap · .ct-*',
  changes: ['A white card: logo, CHIEFS PAYROLL, $281.8M in Display, "23rd in the NFL", five player rows with money in Sans bold, then two grey rounded buttons (Change team, Full team cap).',
    'Both: "Change team" becomes the dropdown chip ("Chiefs ▾") by the switcher rule; money in rows is Sans (the number rule), the payroll stays Display.',
    'A, the card stays white; "Full team cap" becomes a "See all" link in the section head.',
    'B, the payroll on the approved franchise header (team gradient, stat row: payroll, rank, cap space), the player rows under it as a plain list.'],
  options: [{ k: 'a', name: 'White card', note: 'Quiet.' }, { k: 'b', name: 'Team header', note: 'Like Franchise.' }],
  current: () => V('As the app draws it', '#/cap', PH(phoneAt('cap'))),
  proposed: k => { const tm = Dt.team(TID), P = [['Patrick Mahomes', 'QB · thru 2033', '$56.8M'], ['Chris Jones', 'DT · thru 2029', '$35.1M'], ['Trey Smith', 'G · thru 2028', '$20M']];
    const rows = `<div class="list${k === 'a' ? ' r6cc-l' : ' mt12'}">${P.map(([n, s, v]) => `<div class="row static"><div class="row-main"><div class="row-title">${n}</div><div class="row-sub">${s}</div></div><b class="r6cc-v">${v}</b></div>`).join('')}</div>`;
    return V(k === 'a' ? 'White card' : 'Team header', '#/cap', PH(`<div class="r6pk-row">${seasonChip(tm.name)}</div><div class="mt12">${k === 'a' ? `<div class="card r6cc"><div class="r6x-sec"><span class="r6ss-eb">Chiefs payroll</span><span class="r6dr-more">See all</span></div><div class="flex between center"><b class="r6cc-big">$281.8M</b><span class="t-meta">23rd in the NFL</span></div>${rows}</div>`
      : `<div class="r6fh b" style="${App.teamVars(tm)}"><span class="r6hc-eb">Chiefs payroll</span><div class="r6fh-s">${[['$281.8M', 'Payroll'], ['23rd', 'In the NFL'], ['$12.4M', 'Cap space']].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div></div>${rows}`}</div>`)); } };

R['fan-level'] = { id: 'fan-level', v: 1, ready: true, name: 'Fan level row (Community)', target: 'community.js · .cm-level',
  changes: ['Community opens on a "Fan level" card: a grey initial avatar, a grey ROOKIE pill, a thin red progress bar, "80 points to Starter", 120 fan points on the right. The fan card already shows all of this.',
    'A, a link row to You: your team logo, "Rookie · 120 points", the fan-card ladder under it (one segment per tier), chevron.',
    'B, drop it: Community starts at Your squads; your level lives on the fan card only.'],
  options: [{ k: 'a', name: 'Ladder row', note: 'Same ladder as the card.' }, { k: 'b', name: 'Remove', note: 'One home for it.' }],
  current: () => V('As the app draws it', '#/community', PH(phoneAt('community'))),
  proposed: k => V(k === 'a' ? 'Ladder row' : 'Remove', '#/community', PH(`${k === 'a' ? `<div class="list"><div class="row static r6ir"><span class="r6ir-t">${S(UI.logo(TID, 'sm'))}</span><div class="row-main"><div class="row-title">Rookie · 120 points</div><div class="row-sub">80 points to Starter</div><div class="r6lh-lad">${[1, 0, 0, 0, 0].map(on => `<i style="${on ? 'background:var(--text)' : ''}"></i>`).join('')}</div></div>${chev()}</div></div>` : ''}${SEC('Your squads')}<div class="list"><div class="row static"><div class="row-main"><div class="row-title">Sunday Crew</div><div class="row-sub">6 members · picks & watch parties</div></div>${chev()}</div></div>`)) };

R['tx-rows'] = { id: 'tx-rows', v: 1, ready: true, name: 'Transactions rows', target: 'offseason.js transactions',
  changes: ['Each move: a bare team logo on the left, the move as a long Sans paragraph, "Falcons · Oct 10, 2026" under it, and a round headshot on the right.',
    'Both: the date is the section head only (no repeat per row), long moves clamp at three lines.',
    'A, the player\'s headshot leads in a 40px squared tile, the team in Meta ("Falcons · Signed"), no logo.',
    'B, the team logo leads in the 40px squared tile, no headshot.'],
  options: [{ k: 'a', name: 'Headshot tile', note: 'About the player.' }, { k: 'b', name: 'Logo tile', note: 'About the team.' }],
  current: () => V('As the app draws it', '#/transactions', PH(phoneAt('transactions'))),
  proposed: k => { const T = [['ATL', 'Placed LB Yasir Abdullah on injured reserve. Signed S Jammie Robinson from the practice squad.', 'Reserve'], ['CHI', 'Activated LB Noah Sewell from the physically unable to perform list.', 'Activated'], ['CIN', 'Elevated DB Russ Yeast from the practice squad.', 'Elevated']];
    return V(k === 'a' ? 'Headshot tile' : 'Logo tile', '#/transactions', PH(`<div class="eyebrow">Saturday, October 10</div><div class="list mt8">${T.map(([a, t, ty]) => `<div class="row static r6ir"><span class="r6ir-t ${k === 'a' ? 'hs' : ''}">${k === 'a' ? S(icon('user', 'sm')) : S(UI.logo(TA(a).id, 'sm'))}</span><div class="row-main"><div class="row-title r6tx">${t}</div><div class="row-sub">${esc(TA(a).name)} · ${ty}</div></div></div>`).join('')}</div>`)); } };


/* ---------------- batch 2026-11-08 b: hints, nested tabs, mock draft, trip, progress, all teams, replays */
R['hint-box'] = { id: 'hint-box', v: 1, ready: true, name: 'Grey hint boxes', target: 'you.js Also following / Your players · watch.js audio · where-to-watch',
  changes: ['Several pages put a grey rounded box with an icon and a sentence above content: "Follow a rival, a second favourite…" (You), "Follow players on any team…" (You), the NFL tag + "works with the screen off" (Live audio), "Pick your market…" (Where to watch).',
    'A, the approved page-intro treatment: one Body line in the text colour, no box, no icon; the action (Follow another team) stays as the squared button under it.',
    'B, no hint at all when the section has content; the line shows only in the empty state (the approved centred empty state).'],
  options: [{ k: 'a', name: 'One line', note: 'Like page intros.' }, { k: 'b', name: 'Only when empty', note: 'Quietest.' }],
  current: () => V('As the app draws it', '#/you, #/audio', PH(phoneAt('you') + phoneAt('audio'))),
  proposed: k => V(k === 'a' ? 'One line' : 'Only when empty', '#/you', PH(`${SEC('Also following')}${k === 'a' ? `<p class="r6pi">Follow a rival, a second favourite or anyone fun to watch. They show up in scores and alerts too.</p>` : ''}<button class="sc-season r6pk-c">${S(icon('plus', 'xs'))}Follow another team</button>
    <div style="margin-top:24px">${SEC('Live now')}</div>${k === 'a' ? `<p class="r6pi">Home, away and national radio for every game. Keeps playing with the screen off.</p>` : ''}<div class="list"><div class="row static r6ir"><span class="r6ir-t">${S(UI.logo(TA('CHI').id, 'sm'))}</span><div class="row-main"><div class="row-title">Bears at Packers</div><div class="row-sub">Live · 4th 3:18</div></div>${chev()}</div></div>`)) };

R['sub-tabs'] = { id: 'sub-tabs', v: 1, ready: true, name: 'A switcher inside a tab', target: 'game.js Plays (All drives / Scoring drives + quarters) · Fans (React / Predict)',
  changes: ['Inside the game page\'s tabs, Plays opens a second row of small tabs (All drives, Scoring drives) and then a rounded chip row (All quarters, 1st, 2nd, 3rd, 4th). Fans opens a second row of tabs (React, Predict). Two rows of identical underlined tabs read as one broken row.',
    'Rule this card sets: the page\'s tabs are the only small tabs on the screen; anything that switches inside a tab is the squared chip row.',
    'A, one squared chip row holding both: All drives, Scoring, then the quarters after a gap.',
    'B, two squared rows: the view (All drives, Scoring drives), then the quarters.'],
  options: [{ k: 'a', name: 'One row', note: 'Compact.' }, { k: 'b', name: 'Two rows', note: 'View, then filter.' }],
  current: () => V('As the app draws it', '#/game · Plays', PH(phoneAt('game/401772988?tab=plays'))),
  proposed: k => { const c = (xs, on) => xs.map((x, i) => `<button class="sc-season r6pk-c ${i === on ? 'on' : ''}">${x}</button>`).join('');
    return V(k === 'a' ? 'One row' : 'Two rows', '#/game · Plays', PH(`${S(UI.tabs(['Recap', 'Game flow', 'Plays', 'Stats', 'Fans'].map(l => ({ k: l, l })), 'Plays', '', 'sm flush'))}<div class="r6pk-row mt12">${k === 'a' ? c(['All drives', 'Scoring'], 0) + '<span style="width:8px"></span>' + c(['All', '1st', '2nd', '3rd', '4th'], 0) : c(['All drives', 'Scoring drives'], 0)}</div>${k === 'b' ? `<div class="r6pk-row mt8">${c(['All quarters', '1st', '2nd', '3rd', '4th'], 0)}</div>` : ''}<div class="card mt12 r6sp"><b>End of game</b><span>6 plays · 65 yds · 1:49</span></div>`)); } };

R['mock-draft'] = { id: 'mock-draft', v: 1, ready: true, name: 'Mock draft', target: 'offseason.js mock-draft',
  changes: ['A white card with "0 of 32 picks made", a grey progress ring, a red "Sim to my pick" and an outline Reset; then 32 rows: pick number, logo, team name in Display caps, record, and a grey "+".',
    'Both: progress as the approved ladder (learn hero), team names in Sans, the number rule (pick numbers Sans).',
    'A, each row ends with a squared "Pick" chip; your team\'s row gets the team-colour edge.',
    'B, the row itself opens the pick sheet (chevron), and the summary card becomes the summary-stats row (Picks made, Your pick, Round).'],
  options: [{ k: 'a', name: 'Pick chip', note: 'Action on each row.' }, { k: 'b', name: 'Row opens sheet', note: 'Cleaner rows.' }],
  current: () => V('As the app draws it', '#/mock-draft', PH(phoneAt('mock-draft'))),
  proposed: k => { const T = [['MIA', '0-4'], ['TEN', '0-5'], ['LAC', '0-4'], ['NO', '1-4']];
    const top = k === 'a' ? `<div class="card r6cc"><span class="r6ss-eb">Round 1 · your mock</span><div class="r6aq" style="margin:8px 0 0">0 of 32 picks made</div><div class="r6lh-lad">${Array.from({ length: 8 }, () => '<i></i>').join('')}</div><div class="flex gap8 mt12"><button class="btn primary sm">Sim to my pick</button><button class="sc-season r6pk-c">Reset</button></div></div>`
      : `<div class="r6ss a"><span class="r6ss-eb">Round 1 · your mock</span><div class="r6ss-r"><div><b>0/32</b><span>Picks made</span></div><div><b>23</b><span>Your pick</span></div><div><b>1</b><span>Round</span></div></div></div>`;
    return V(k === 'a' ? 'Pick chip' : 'Row opens sheet', '#/mock-draft', PH(`${top}<div class="list mt12">${T.map(([a, r], i) => `<div class="row static r6rk"><b class="r6rk-n">${i + 1}</b>${S(UI.logo(TA(a).id, 'sm'))}<div class="row-main"><div class="row-title">${esc(TA(a).name)}</div><div class="row-sub">${r}</div></div>${k === 'a' ? '<button class="sc-season r6pk-c">Pick</button>' : chev()}</div>`).join('')}</div>`)); } };

R['trip-timeline'] = { id: 'trip-timeline', v: 1, ready: true, name: 'Trip: game-day timeline', target: 'fanlife.js trip/:gid',
  changes: ['The away-trip page: a navy block, three white tiles (1,233 Miles away / FLY / 6:30 PM), then a timeline of rows with the time in a bold left column ("Day before", "3:00 PM").',
    'Both: the header is the approved franchise header in the home team\'s colours with the stat row (miles, how, kickoff in your time); times are Sans (number rule).',
    'A, times in a 72px left column, as the lesson values.',
    'B, the time as an eyebrow over each step\'s title, with a thin line joining the steps.'],
  options: [{ k: 'a', name: 'Time column', note: 'Like a table.' }, { k: 'b', name: 'Time eyebrow', note: 'Like a timeline.' }],
  current: () => V('As the app draws it', '#/trip', PH(phoneAt('trip/401772988'))),
  proposed: k => { const tm = TA('NE'), ST = [['Day before', 'Arrive & check in', 'Get settled the day before, less stress.'], ['3:00 PM', 'Tailgate / pregame meetup', 'Find fellow Seahawks fans near the stadium.'], ['4:30 PM', 'Gates open', 'Clear-bag policy applies.']];
    return V(k === 'a' ? 'Time column' : 'Time eyebrow', '#/trip', PH(`<div class="r6fh b" style="${App.teamVars(tm)}"><span class="r6hc-eb">Road trip · Super Bowl</span><div class="r6hc-n" style="font-size:26px">SEAHAWKS AT PATRIOTS</div><div class="r6fh-s">${[['1,233', 'Miles away'], ['Fly', 'Best way'], ['6:30 PM', 'Kickoff']].map(([v, l]) => `<div><b>${v.toUpperCase()}</b><span>${l}</span></div>`).join('')}</div></div>
      ${SEC('Game-day timeline')}<div class="list ${k === 'b' ? 'r6tl' : ''}">${ST.map(([t, h, s]) => k === 'a' ? `<div class="row static"><b class="r6tl-t">${t}</b><div class="row-main"><div class="row-title">${h}</div><div class="row-sub">${s}</div></div></div>` : `<div class="row static"><span class="r6tl-dot"></span><div class="row-main"><span class="r6sb-eb">${t}</span><div class="row-title">${h}</div><div class="row-sub">${s}</div></div></div>`).join('')}</div>`)); } };

R['progress-ring'] = { id: 'progress-ring', v: 1, ready: true, name: 'Progress rings', target: 'where-to-watch coverage · mock-draft · downloads',
  changes: ['Three pages show progress as a grey ring with a number inside (0% of games you can watch, 0 picks, storage used as a thin bar). Learn\'s ring was replaced by the ladder you approved.',
    'A, the ladder everywhere progress has steps (picks, lessons, badges); a plain 6px bar where it\'s a share (games you can watch, storage). The number sits above in Display.',
    'B, the plain bar everywhere except the fan card and Learn, which keep the ladder.'],
  options: [{ k: 'a', name: 'Ladder or bar', note: 'Steps vs share.' }, { k: 'b', name: 'Bar', note: 'One shape.' }],
  current: () => V('As the app draws it', '#/where-to-watch, #/downloads', PH(phoneAt('where-to-watch') + phoneAt('downloads'))),
  proposed: k => { const bar = p => `<div class="r6pb"><i style="width:${p}%"></i></div>`, lad = (n, on) => `<div class="r6lh-lad">${Array.from({ length: n }, (_, i) => `<i style="${i < on ? 'background:var(--text)' : ''}"></i>`).join('')}</div>`;
    return V(k === 'a' ? 'Ladder or bar' : 'Bar', 'Where to watch, Mock draft, Downloads', PH(`<div class="card r6cc"><span class="r6ss-eb">Every Chiefs game</span><div class="flex between center mt8"><b class="r6cc-big">11/17</b><span class="t-meta">with what you have</span></div>${bar(65)}</div><div class="card r6cc mt12"><span class="r6ss-eb">Your mock</span><div class="flex between center mt8"><b class="r6cc-big">3/32</b><span class="t-meta">picks made</span></div>${k === 'a' ? lad(8, 1) : bar(9)}</div><div class="card r6cc mt12"><span class="r6ss-eb">Downloads</span><div class="flex between center mt8"><b class="r6cc-big">1.2 GB</b><span class="t-meta">of 8 GB</span></div>${bar(15)}</div>`)); } };

R['all-teams'] = { id: 'all-teams', v: 1, ready: true, name: 'All teams: follow from the grid', target: 'teams.js teams/all',
  changes: ['#/teams/all: the approved team tiles, each with a round grey "+" badge in the corner (a red round check when followed), and a "Not sure who to follow?" card on top with a sparkle icon.',
    'Both: the quiz card becomes a plain link row (40px squared tile, title, line, chevron).',
    'A, the corner badge squared (24px), outline "+" or ink check.',
    'B, no badge: tapping a tile opens the team; following happens on the team page and in the approved follow chip on You.'],
  options: [{ k: 'a', name: 'Squared badge', note: 'Follow from here.' }, { k: 'b', name: 'No badge', note: 'Tiles just open.' }],
  current: () => V('As the app draws it', '#/teams/all', PH(phoneAt('teams/all'))),
  proposed: k => V(k === 'a' ? 'Squared badge' : 'No badge', '#/teams/all', PH(`<div class="list"><div class="row static r6ir"><span class="r6ir-t">${S(icon('sparkle', 'sm'))}</span><div class="row-main"><div class="row-title">Not sure who to follow?</div><div class="row-sub">Four quick questions and we\'ll match you</div></div>${chev()}</div></div><div class="eyebrow mt16">AFC East</div><div class="r6at">${['BUF', 'MIA', 'NE', 'NYJ'].map((a, i) => `<div class="r6at-t">${k === 'a' ? `<span class="r6at-b ${i === 0 ? 'on' : ''}">${S(icon(i === 0 ? 'check' : 'plus', 'xs'))}</span>` : ''}${S(UI.logo(TA(a).id, 'md'))}<b>${esc(TA(a).name.toUpperCase())}</b><span>${['3-1', '0-4', '2-2', '1-3'][i]}</span></div>`).join('')}</div>`)) };

R['replay-rows'] = { id: 'replay-rows', v: 1, ready: true, name: 'Replays + Live audio rows', target: 'watch.js replays · audio',
  changes: ['Replays and Live audio: two logos side by side, the matchup, a Meta line ("ready in 58m" in gold, "Live" in red), and a grey rounded lock button on the right of every row. The filters are two rounded chip rows (teams, weeks).',
    'Both: the filters follow the approved stacked-filter fix (small tabs for the mode, "All teams ▾" and "Week 5 ▾" dropdown chips); "ready in 58m" is Meta (no gold); the approved lock (a-lock) sits as a small icon in the Meta line instead of a button.',
    'A, the two logos stacked in the 40px squared tile.',
    'B, the approved game row (two team lines with logos), lock + time on the right.'],
  options: [{ k: 'a', name: 'Matchup tile', note: 'One line.' }, { k: 'b', name: 'Game row', note: 'Like Scores.' }],
  current: () => V('As the app draws it', '#/replays, #/audio', PH(phoneAt('replays') + phoneAt('audio'))),
  proposed: k => { const G = [['MIN', 'NO', 'Week 5 · Oct 11 · ready in 58m'], ['HOU', 'TEN', 'Week 5 · Oct 11 · ready in 59m'], ['PHI', 'JAX', 'Week 5 · Oct 11']];
    return V(k === 'a' ? 'Matchup tile' : 'Game row', '#/replays', PH(`${S(UI.tabs(['Condensed', 'Full game', 'All-22', 'Highlights'].map(l => ({ k: l, l })), 'Condensed', '', 'sm flush'))}<div class="r6pk-row mt12">${seasonChip('All teams')}${seasonChip('Week 5')}</div><div class="list mt12">${G.map(([a, b, m]) => k === 'a' ? `<div class="row static r6ir"><span class="r6ir-t r6rp">${S(UI.logo(TA(a).id, 'xs'))}${S(UI.logo(TA(b).id, 'xs'))}</span><div class="row-main"><div class="row-title">${esc(TA(a).name)} at ${esc(TA(b).name)}</div><div class="row-sub">${S(icon('lock', 'xs'))} ${m}</div></div>${chev()}</div>`
      : `<div class="row static"><div class="row-main">${[a, b].map(t => `<div class="r6sb-l">${S(UI.logo(TA(t).id, 'sm'))}<span>${esc(TA(t).name)}</span></div>`).join('')}</div><span class="t-meta">${S(icon('lock', 'xs'))} ${m.split(' · ').pop()}</span></div>`).join('')}</div>`)); } };


/* ---------------- batch 2026-11-08 c: team hero buttons, article tags, player season, game actions */
R['team-hero-actions'] = { id: 'team-hero-actions', v: 5, ready: true, name: 'Team page hero', target: 'teams.js team/:id hero · .tm-hero2',
  changes: ['Your note on v4: "a the best as long as things pass accessibility. there\'s also some weird text sizes and alignment issues". So this is v4 A (today\'s hero) with three fixes, shown on the Chiefs and the three hardest teams (Titans, Bengals, Raiders).',
    'Accessibility: I measured white text on all 32 team colours. 7 teams fail AA for small text (Titans 3.2, Bengals 3.4, Broncos 3.4, Browns 3.6, Dolphins 4.0, Panthers 4.0, Chargers 4.3) and the white-tint buttons drop the Chiefs to 3.9. The fix: the button boxes tint away from the text (a dark tint under white text, a light tint under dark text or on near-black teams like the Raiders), so they keep or add contrast. Every pair shown passes 4.5:1.',
    'Text sizes, one scale: city 12 caps; name 40 Display for every team (today it is resized by name length, so Chiefs is 44 and Commanders 32); record 40 Display, the same size as the name; record lines 13; buttons 14; Next eyebrow 11, opponent 15, time 13.',
    'Alignment: one 16px left edge for everything; the helmet centred on the name + record block; "Your team", alert and share all 36px tall; Shop and Tickets 44px; the next-game row starts with the logo on the same left edge.',
    'A, light teams switch to dark text (the ink colour) on their real colour.',
    'B, keep white text everywhere and darken only the light teams\' colour until it passes (Titans, Bengals… get a deeper shade).'],
  options: [{ k: 'a', name: 'Dark text on light teams', note: 'Real colours.' }, { k: 'b', name: 'Deeper colour', note: 'White text always.' }],
  current: () => V('As the app draws it', '#/team/12', PH(phoneAt('team/12'))),
  proposed: k => { const L = App.lum, ok = c => 1.05 / (L(c) + .05) >= 4.5;
    const deepen = c => { let h = c.replace('#', ''), rgb = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); for (let n = 0; n < 40; n++) { const x = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join(''); if (ok(x)) return x; rgb = rgb.map(v => Math.round(v * .95)); } return '#000000'; };
    const hero = (abbr, oa) => { const tm = TA(abbr), o = TA(oa), base = tm.color, light = !ok(base), col = k === 'b' && light ? deepen(base) : base, ink = k === 'a' && light ? '#0b0d12' : '#ffffff', dark = ink !== '#ffffff';
      const v = `${App.teamVars(tm)};--team:${col};--tg-a:${col};--tg-b:${col};--ink:${ink};--tint:${dark || L(col) < .03 ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.22)'}`;
      return `<section class="hero tm-hero tm-hero2 r6w" style="${v}">${S(UI.helmet(tm.id, { cls: 'hero-helmet', face: 'left' }))}<div class="r6w-id"><div class="tm-hero-loc">${tm.loc}</div><div class="tm-hero-name">${esc(tm.name)}</div><div class="tm-rec"><b>${abbr === 'KC' ? '4-0' : abbr === 'LV' ? '3-1' : '1-4'}</b><span>${abbr === 'KC' ? '1st in AFC West' : '3rd in division'}<br>HC ${esc(tm.coach || '')}</span></div></div>
        <div class="r6w-row"><button class="btn tm-ghost">${S(icon(abbr === 'KC' ? 'star' : 'plus', abbr === 'KC' ? 'sm fill' : 'sm'))}${abbr === 'KC' ? 'Your team' : 'Follow'}</button><button class="icon-btn tm-round">${S(icon('bell', 'sm'))}</button><button class="icon-btn tm-round">${S(icon('share', 'sm'))}</button></div>
        <div class="tm-hero-btns"><button class="btn tm-tint">${S(icon('bag', 'sm'))}Shop</button><button class="btn tm-tint">${S(icon('ticket', 'sm'))}Tickets</button></div>
        <a class="tm-next">${S(UI.logo(o.id, 'sm'))}<div class="grow"><span class="tm-next-k">Next</span><b>vs ${esc(o.name)}</b></div><em>Sun 4:25 PM · CBS</em>${S(icon('chev', 'xs'))}</a></section>`; };
    return V(k === 'a' ? 'Dark text on light teams' : 'Deeper colour', 'Chiefs, Titans, Bengals, Raiders', PH(['KC:LAC', 'TEN:HOU', 'CIN:PIT', 'LV:DEN'].map(p => hero(...p.split(':'))).join('<div style="height:14px"></div>'))); } };

R['article-tags'] = { id: 'article-tags', v: 1, ready: true, name: 'Article: team tags', target: 'news.js article/:id · .art-tags',
  changes: ['Under the article photo: rounded outline chips with a logo and the team name in Display caps (FALCONS, TITANS, COLTS), before the headline.',
    'A, squared chips (season-chip shape), logo + short name in Sans, under the article instead of above the headline.',
    'B, no chips: the teams as a Meta line under the byline ("Falcons · Titans · Colts"), each a text link.'],
  options: [{ k: 'a', name: 'Chips at the end', note: 'Tap to a team.' }, { k: 'b', name: 'Meta line', note: 'Lightest.' }],
  current: () => V('As the app draws it', '#/article', PH(phoneAt('news'))),
  proposed: k => V(k === 'a' ? 'Chips at the end' : 'Meta line', '#/article', PH(`<span class="r6ss-eb">Analysis</span><div class="r6aq" style="font-size:22px">NFL Week 5 uniforms: Packers debut Rivalries look, Patriots wearing throwbacks</div><div class="t-meta">Anthony Gharib · 1h ago · 2 min read${k === 'b' ? `<br><span class="r6at-l">Falcons</span> · <span class="r6at-l">Titans</span> · <span class="r6at-l">Colts</span>` : ''}</div><p class="r6pi mt12">The Green Bay Packers have had their fair share of alternate uniforms throughout their distinguished history…</p>${k === 'a' ? `<div class="r6pk-row mt12">${['ATL', 'TEN', 'IND'].map(a => `<button class="sc-season r6pk-c">${S(UI.logo(TA(a).id, 'xs'))}${esc(TA(a).name)}</button>`).join('')}</div>` : ''}`)) };

R['player-sofar'] = { id: 'player-sofar', v: 1, ready: true, name: 'Player: season so far (stat row)', target: 'player.js overview · .pl-bv / .pl-cv',
  changes: ['"2026 season so far": one big white card (PASSING YARDS, 1,037, 11th among QBs), then three tiles (9 Passing TDs 6th, 2 Interceptions 23rd, 106.2 Passer rating 6th), then a grey Meta line.',
    'Both use the approved summary-stats row (Display numbers, caps labels, dividers); the league rank sits under each number as Meta.',
    'A, the lead stat big on its own line, then a three-stat row under it, in one white card.',
    'B, four stats in two rows of the stat row, all the same size.'],
  options: [{ k: 'a', name: 'Lead + row', note: 'One stat leads.' }, { k: 'b', name: 'Four equal', note: 'A grid.' }],
  current: () => V('As the app draws it', '#/player', PH(phoneAt('player/3139477'))),
  proposed: k => { const st = (xs) => `<div class="r6ss-r">${xs.map(([v, l, r]) => `<div><b>${v}</b><span>${l}</span><em class="r6ps-r">${r}</em></div>`).join('')}</div>`;
    return V(k === 'a' ? 'Lead + row' : 'Four equal', '#/player', PH(`${SEC('2026 season so far')}<div class="r6ss a">${k === 'a' ? `<span class="r6ss-eb">Passing yards</span><div class="flex between center"><b class="r6cc-big" style="font-size:44px">1,037</b><span class="t-meta">11th among QBs</span></div><div class="r6-div" style="margin:14px 0 0"></div>${st([['9', 'Pass TD', '6th'], ['2', 'INT', '23rd'], ['106.2', 'Rating', '6th']])}`
      : st([['1,037', 'Pass yds', '11th'], ['9', 'Pass TD', '6th']]) + st([['2', 'INT', '23rd'], ['106.2', 'Rating', '6th']])}</div>`)); } };



/* ---------------- IDEAS 2026-11-08: direction checks drawn from ~/Desktop/Visual Inspo (one card per idea) */
const DIR = 'Direction check, not a final design. Approve = "yes, go this way" and I design it properly screen by screen; Not approved + a note = drop it or steer it.';
const dp = c => { let x = c; for (let n = 0; n < 40 && App.contrast('#ffffff', x) < 4.5; n++) x = App.mix(x, '#000000', .05); return x; };
const IHS = (pid, cls = '') => `<img class="r6i-hs ${cls}" src="${Dt.headshot(pid)}" alt="">`;
const MESH = (a, b, cls, inner) => `<div class="r6-mesh ${cls}" style="--ma:${dp(a)};--mb:${dp(b)}"><i class="r6-mesh-t"></i><i class="r6-mesh-s"></i><div class="r6-mesh-in">${inner}</div></div>`;
const KC = () => Dt.team(TID), LAC = () => TA('LAC');

/* the jersey fabric now lives in app/fabric.js (App.fabric); the cards pass the colour on the parent's --c / --alt */
const CLOTH = m => App.fabric(m);

R['idea-jersey'] = { id: 'idea-jersey', v: 11, ready: true, name: 'Idea: jersey fabric in the wind', target: 'team page hero',
  changes: [DIR, 'Your note on v10: "the raiders is basically impossible to see. please add the titans and the broncos too"',
    'On a black jersey the light can\'t darken the folds any further, so for near-black teams only the light now also brightens the crests and the mesh rims, like light catching black satin. The Raiders stay black; the fabric now reads. Every other team is unchanged.',
    'Titans and Broncos added: seven teams, each in its real primary colour (deepened only where the white text needs it, the team hero rule). The 1.5x wave from v9 B. Open the card in the browser to see them move.'],
  options: [{ k: 'a', name: 'Seven teams', note: '' }],
  current: () => V('As the app draws it', '#/team/12', PH(phoneAt('team/12'))),
  proposed: () => { const s = Dt.seasonForStats(), tp = App.teamParts;
    const hero = a => { const t = TA(a), r = Dt.record(t.id, s), pl = tp.divPlace(t.id, s).place, played = r.w + r.l + r.t > 0;
      return `<div class="jw jw-x" style="--c:${dp(t.color)};--alt:${t.alt}">${CLOTH('1.5,.1,150,.5,50,0')}<i class="jw-mesh"></i><i class="jw-spk"></i><div class="jw-in"><span class="r6i-eb">${esc(t.loc)}</span><div class="r6i-nm">${esc(t.name).toUpperCase()}</div><div class="r6i-rec"><b>${played ? r.str : '0-0'}</b><span>${played ? fmt.ord(pl) + ' in ' : ''}${t.conf} ${t.div}${t.coach ? `<br>HC ${esc(t.coach)}` : ''}</span></div></div>${S(UI.helmet(t.id, { cls: 'jw-hel', face: 'left' }))}</div>`; };
    return V('Seven teams, 1.5x wave', '#/team', PH(['KC', 'PHI', 'DAL', 'MIA', 'LV', 'TEN', 'DEN'].map(hero).join(''))); } };

R['idea-glow'] = { id: 'idea-glow', v: 1, ready: true, name: 'Idea: team colour glows in from each side', target: 'game.js header · score rows',
  changes: [DIR, 'From ESPN (sports/IMG_0999, IMG_0997): the game header stays neutral, and each team\'s colour glows in from its own edge; the winner gets a small ◂ arrow by the score, the loser\'s score in the secondary text colour (solid, not faded).',
    'A, on the light page.', 'B, on black (the dark mode version).'],
  options: [{ k: 'a', name: 'Light', note: '' }, { k: 'b', name: 'Dark', note: '' }],
  current: () => V('As the app draws it', '#/game', PH(phoneAt('game/401772988'))),
  proposed: k => { const kc = KC(), lac = LAC();
    return V(k === 'a' ? 'Light' : 'Dark', '#/game', PH(`<div class="r6i-gl ${k}" style="--ga:${kc.color};--gb:${lac.color}"><div class="r6i-gs"><div>${S(UI.logo(kc.id, 'lg'))}<span>KC · 5-0</span></div><b class="w">31</b><span class="r6i-ar">◂</span><span class="r6i-st2">Final</span><b class="l">17</b><div>${S(UI.logo(lac.id, 'lg'))}<span>LAC · 0-5</span></div></div></div>`)); } };

R['idea-stack'] = { id: 'idea-stack', v: 1, ready: true, name: 'Idea: two-tone stacked names', target: 'game preview title · team switcher · Draft',
  changes: [DIR, 'From the Inter Miami concept (11) and the architecture site (05): the name set huge and stacked in two tones, the second word in the team\'s second colour. Big type as the art instead of photos.',
    'A, a game preview: CHIEFS in red, VS small, CHARGERS in blue, stacked full width with the kickoff under it.',
    'B, the team switcher sheet: each team as a stacked city/name pair in its colours, so 32 teams scan like posters.'],
  options: [{ k: 'a', name: 'Matchup title', note: '' }, { k: 'b', name: 'Team list', note: '' }],
  current: () => V('As the app draws it', '#/game (pre-game)', PH(phoneAt('teams/all'))),
  proposed: k => { const kc = KC(), lac = LAC();
    return V(k === 'a' ? 'Matchup title' : 'Team list', k === 'a' ? '#/game' : 'Team switcher', PH(k === 'a' ? `<div class="r6i-mt"><b style="color:${dp(kc.color)}">CHIEFS</b><span>vs</span><b style="color:${dp(lac.color)}">CHARGERS</b></div><div class="t-meta">Sun, Oct 18 · 4:25 PM · CBS · Arrowhead</div>`
      : ['KC', 'LAC', 'DEN', 'LV'].map(a => { const t = TA(a); return `<div class="r6i-tl"><span style="color:${dp(t.color)}">${esc(t.loc).toUpperCase()}</span><b>${esc(t.name).toUpperCase()}</b>${S(UI.logo(t.id, 'md'))}</div>`; }).join(''))); } };

R['idea-player'] = { id: 'idea-player', v: 4, ready: true, name: 'Idea: player hero with the number as art', target: 'player.js hero',
  changes: [DIR, 'Your note on v3: "a little less fine, a little larger, and a little more white". v4: stroke 0.5px → 0.9px, the number about 15% larger, white 22% → 35%.', 'Your note on v2: "a bit smaller of a number, more faded, and maybe even thinner". v3: about a third smaller, 0.5px stroke at 22% white.', 'Your note on v1: "this should be an outlined number. like really fine stroke and white transparent". v2: the number is a hairline white outline only (no fill), see-through so the team colour shows inside it. It\'s decoration, so the no-faded-text rule doesn\'t apply; the name and facts stay solid white.',
    'A, the fine outline, the number cropped off the top right behind the headshot.',
    'B, the same, plus the moving jersey fabric (jersey idea v4) behind everything.'],
  options: [{ k: 'a', name: 'Fine outline', note: '' }, { k: 'b', name: 'Outline on fabric', note: '' }],
  current: () => V('As the app draws it', '#/player', PH(phoneAt('player/3139477'))),
  proposed: k => { const kc = KC(), A = dp(kc.color);
    const inner = `<svg class="r6p-num" viewBox="0 0 300 260" aria-hidden="true"><text x="0" y="240" font-family="APD C, sans-serif" font-weight="900" font-style="italic" font-size="290" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".9">15</text></svg>${IHS(3139477, 'big')}<div class="r6i-pn"><span>#15 · QB · Chiefs</span><b>PATRICK<br>MAHOMES</b></div>`;
    return V(k === 'a' ? 'Fine outline' : 'Outline on fabric', '#/player', PH(k === 'a' ? `<div class="r6i-ph" style="--ma:${A}">${inner}</div>` : `<div class="jw r6i-ph" style="--c:${kc.color};margin:-16px -16px 0;border-radius:0">${CLOTH()}<i class="jw-mesh"></i><i class="jw-spk"></i>${inner}</div>`)); } };

R['idea-faceoff'] = { id: 'idea-faceoff', v: 1, ready: true, name: 'Idea: the face-off', target: 'game preview · live game',
  changes: [DIR, 'From MLB (sports/IMG_0393: pitcher vs batter, headshots in team-colour circles with the day\'s line under), NHL (17: team leaders side by side) and ESPN (21: leaders as headshot + big number).',
    'A, the key matchup: the two QBs facing each other, season line under each, "QB duel" between them.',
    'B, a leaders strip: passing, rushing, receiving; each row the two teams\' leaders and their number in Display.'],
  options: [{ k: 'a', name: 'QB vs QB', note: '' }, { k: 'b', name: 'Leaders', note: '' }],
  current: () => V('As the app draws it', '#/game (pre-game)', PH(phoneAt('game/401772988'))),
  proposed: k => { const kc = KC(), lac = LAC(), c = (pid, t) => `<span class="r6i-fc2" style="background:${dp(t.color)}">${IHS(pid)}</span>`;
    return V(k === 'a' ? 'QB vs QB' : 'Leaders', '#/game', PH(k === 'a' ? `<div class="r6i-fo"><div>${c(3139477, kc)}<b>Mahomes</b><span>1,037 yds · 9 TD</span></div><em>QB<br>duel</em><div>${c(4038941, lac)}<b>Herbert</b><span>1,112 yds · 7 TD</span></div></div>`
      : `<div class="list">${[['Passing yds', 3139477, '1,037', 4038941, '1,112'], ['Receiving yds', 4428331, '388', 4612826, '402'], ['Sacks', 3044859, '4.5', 3691739, '3.0']].map(([l, a, x, b, y]) => `<div class="row static r6i-lr">${c(a, kc)}<b class="r6i-lv">${x}</b><span class="grow t-meta" style="text-align:center">${l}</span><b class="r6i-lv">${y}</b>${c(b, lac)}</div>`).join('')}</div>`)); } };

R['idea-bars'] = { id: 'idea-bars', v: 1, ready: true, name: 'Idea: two-sided team stat bars', target: 'game.js Team stats · team compare',
  changes: [DIR, 'From Apple Sports (sports/IMG_1002): each stat is one line, the away value left, the home value right, with two bars in the teams\' colours meeting under the label; whoever leads has the longer bar.',
    'A, the bars meet in the middle.', 'B, both bars grow from the outside edges in.'],
  options: [{ k: 'a', name: 'Meet in middle', note: '' }, { k: 'b', name: 'From edges', note: '' }],
  current: () => V('As the app draws it', '#/game · Stats', PH(phoneAt('game/401772988?tab=stats'))),
  proposed: k => { const kc = KC(), lac = LAC(), S2 = [['Total yards', 412, 288], ['Passing yards', 301, 214], ['Rushing yards', 111, 74], ['3rd down %', 58, 36], ['Time of possession', '34:10', '25:50', 57]];
    return V(k === 'a' ? 'Meet in middle' : 'From edges', '#/game · Stats', PH(`<div class="card r6i-bc ${k}" style="--ga:${dp(kc.color)};--gb:${dp(lac.color)}">${S2.map(([l, a, b, p]) => { const pa = p || Math.round(a / (a + b) * 100); return `<div class="r6i-br"><div class="flex between"><b>${a}</b><span>${l}</span><b>${b}</b></div><div class="r6i-bb">${k === 'a' ? `<i style="flex:${pa}"></i><i style="flex:${100 - pa}"></i>` : `<i style="width:${pa / 2}%"></i><span class="grow"></span><i style="width:${(100 - pa) / 2}%"></i>`}</div></div>`; }).join('')}</div>`)); } };

R['idea-strip'] = { id: 'idea-strip', v: 1, ready: true, name: 'Idea: schedule strip with the opponent', target: 'team page Schedule · Home',
  changes: [DIR, 'From the Bruins app (sports/IMG_0994: a date strip with "@CAR" under each date, the picked day underlined, that game\'s card under it) and the cricket schedule (10: the picked day as a solid pill).',
    'A, dates with the opponent\'s tricode under each, picked game in ink; the picked game\'s card under the strip.',
    'B, the opponent\'s logo instead of the tricode, results (W/L) as the second line for played games.'],
  options: [{ k: 'a', name: 'Tricodes', note: '' }, { k: 'b', name: 'Logos + results', note: '' }],
  current: () => V('As the app draws it', '#/team/12 · Schedule', PH(phoneAt('team/12?tab=schedule'))),
  proposed: k => { const G = [['SEP', 7, 'LAC', 0, 'W'], ['SEP', 14, 'BAL', 1, 'W'], ['SEP', 21, 'NYG', 0, 'W'], ['OCT', 4, 'LV', 0, 'W'], ['OCT', 18, 'LAC', 1, ''], ['OCT', 26, 'WAS', 1, '']];
    return V(k === 'a' ? 'Tricodes' : 'Logos + results', '#/team/12', PH(`<div class="r6i-ds">${G.map(([m, d, o, h, r], i) => `<div class="${i === 4 ? 'on' : ''}"><span>${m}</span><b>${d}</b>${k === 'a' ? `<em>${h ? '' : '@'}${o}</em>` : `${S(UI.logo(TA(o).id, 'xs'))}<em>${r || (h ? 'vs' : '@')}</em>`}</div>`).join('')}</div><div class="card r6cc mt12"><span class="r6ss-eb">Week 6 · Sun, Oct 18 · 4:25 PM · CBS</span><div class="r6sb-l w mt8">${S(UI.logo(TID, 'sm'))}<span>Chiefs</span><span class="t-meta">4-0</span></div><div class="r6sb-l">${S(UI.logo(TA('LAC').id, 'sm'))}<span>Chargers</span><span class="t-meta">0-4</span></div></div>`)); } };

R['idea-numbers'] = { id: 'idea-numbers', v: 3, ready: true, name: 'Idea: by the numbers', target: 'Stats hub · Home · game recap',
  changes: [DIR, 'Your note on v2: "both look bad. use the gradients and no logo. maybe large number outline but very subtle and very thin in the background". v3: no logo, no fabric, no headshot. Each card is a team gradient with the stat\'s number repeated huge behind it as a hairline outline (0.5px, 18% white), cropped by the card; the real number sits on top in Display, the label and player under it.',
    'A, the app\'s gradient: lighter at the top, full team colour by 42%, at 180°.',
    'B, a two-colour gradient: the team colour into its second colour, corner to corner (Chiefs red into a deeper red-gold, Chargers blue into gold).'],
  options: [{ k: 'a', name: 'Team gradient', note: '' }, { k: 'b', name: 'Two-colour', note: '' }],
  current: () => V('As the app draws it', '#/stats', PH(phoneAt('stats'))),
  proposed: k => { const F = [['22.4', 'mph', 'Fastest ball carrier', 'Rashee Rice', 'KC'], ['78', 'yds', 'Longest TD', 'Ladd McConkey', 'LAC'], ['61.2', 'air yds', 'Deepest completion', 'Josh Allen', 'BUF']];
    const card = ([v, u, l, n, a]) => { const t = TA(a), c = t.color, bg = k === 'a' ? `linear-gradient(180deg,${App.mix(c, '#ffffff', .22)} 0%,${c} 42%,${c} 100%)` : `linear-gradient(140deg,${c} 0%,${c} 35%,${App.mix(c, t.alt, .55)} 100%)`;
      return `<div class="r6n" style="background:${bg}"><svg class="r6n-bg" viewBox="0 0 200 160" aria-hidden="true"><text x="-6" y="140" font-family="APD C, sans-serif" font-weight="900" font-style="italic" font-size="150" fill="none" stroke="rgba(255,255,255,.18)" stroke-width=".5">${v.split('.')[0]}</text></svg><div class="r6n-in"><b>${v}<small>${u}</small></b><span>${l}</span><em>${n} · ${t.abbr}</em></div></div>`; };
    return V(k === 'a' ? 'Team gradient' : 'Two-colour', '#/stats', PH(`${SEC('Week 6 by the numbers')}<div class="r6i-nr">${F.map(card).join('')}</div>`)); } };

R['idea-photo'] = { id: 'idea-photo', v: 1, ready: true, name: 'Idea: the result on the photo', target: 'Scores finals · Home last result · recap',
  changes: [DIR, 'From MLB (sports/IMG_0993: the World Series final, the celebration photo running down into the winner\'s navy with the score set over it), the Masters (22: photo sitting on a solid brand slab) and the tennis app (01: photo with a curved edge into the stats).',
    'A, the photo fades into the winner\'s colour (the 180° / 42% gradient rule), the score and line score over the colour.',
    'B, the photo stops on a hard edge and the winner\'s colour is a solid slab under it.', 'The snapshot has no game photos, so the stadium stands in; the real thing would use the game\'s lead photo.'],
  options: [{ k: 'a', name: 'Fade', note: '' }, { k: 'b', name: 'Slab', note: '' }],
  current: () => V('As the app draws it', '#/scores', PH(phoneAt('scores'))),
  proposed: k => { const kc = KC(), n = { img: (kc.venue || {}).img };
    return V(k === 'a' ? 'Fade' : 'Slab', '#/scores', PH(`<div class="r6i-pf ${k}" style="--ma:${dp(kc.color)}"><div class="r6i-pf-p" style="background-image:url('${n.img}')"></div><div class="r6i-pf-b"><span class="r6i-eb">Final · Week 5</span><div class="r6i-pf-r">${S(UI.logo(kc.id, 'sm'))}<b>Chiefs</b><span>4-0</span><em>30</em></div><div class="r6i-pf-r">${S(UI.logo(TA('LV').id, 'sm'))}<b>Raiders</b><span>3-1</span><em>27</em></div><p>Mahomes 312 yds, 3 TD · Walker 104 rush yds</p></div></div>`)); } };

R['idea-field'] = { id: 'idea-field', v: 1, ready: true, name: 'Idea: little field diagrams', target: 'game Plays drives · team Depth chart',
  changes: [DIR, 'From the football lineup (07: players placed on the pitch), the cricket field (10: helmets on an aerial field), the tennis shot map (04: a small court with dots beside the stats) and ESPN (13: possession on a drawn court).',
    'A, every drive gets a thumbnail field: where it started, where it ended, the result colour; tap opens the plays.',
    'B, the depth chart drawn as the formation: starters\' headshots in position on a field, tap a spot for the backups.'],
  options: [{ k: 'a', name: 'Drive thumbnails', note: '' }, { k: 'b', name: 'Formation', note: '' }],
  current: () => V('As the app draws it', '#/game · Plays', PH(phoneAt('game/401772988?tab=plays'))),
  proposed: k => { const fld = (s, e, td) => `<svg class="r6i-fd" viewBox="0 0 120 40"><rect width="120" height="40" rx="4" fill="#2f7d3b"/>${Array.from({ length: 11 }, (_, i) => `<line x1="${10 + i * 10}" y1="0" x2="${10 + i * 10}" y2="40" stroke="#fff" stroke-width=".6"/>`).join('')}<rect x="0" width="10" height="40" fill="#1f5e2b"/><rect x="110" width="10" height="40" fill="#1f5e2b"/><line x1="${10 + s}" y1="20" x2="${10 + e}" y2="20" stroke="${td ? '#fff' : '#ffd84d'}" stroke-width="3" stroke-linecap="round"/><circle cx="${10 + e}" cy="20" r="3.5" fill="#fff"/></svg>`;
    if (k === 'a') return V('Drive thumbnails', '#/game · Plays', PH(`<div class="list">${[['Touchdown', '8 plays · 75 yds · 4:12', 25, 100, 1], ['Punt', '3 plays · 6 yds · 1:30', 20, 26, 0], ['Field goal', '10 plays · 52 yds · 5:01', 30, 82, 0]].map(([r, m, s, e, td]) => `<div class="row static r6i-dr">${fld(s, e, td)}<div class="row-main"><div class="row-title">${r}</div><div class="row-sub">${m}</div></div>${chev()}</div>`).join('')}</div>`));
    const P = [[50, 18, 3139477], [50, 34, 4428331], [18, 26, 15847], [82, 26, 4612826]];
    return V('Formation', '#/team/12 · Depth chart', PH(`<div class="r6i-fm">${P.map(([x, y, pid]) => `<span style="left:${x}%;top:${y * 2}%">${IHS(pid)}</span>`).join('')}<i class="r6i-los"></i></div>`)); } };

R['idea-deck'] = { id: 'idea-deck', v: 1, ready: true, name: 'Idea: today\'s games as a card deck', target: 'Scores · Home',
  changes: [DIR, 'From Apple Sports (sports/IMG_1001: one full-height card per game, the next and previous cards peeking at the sides, swipe between them) and the travel app (08: the next card fanned behind).',
    'A, swipe sideways through today\'s games; each card is the jersey mesh in the two teams\' colours with the score, then the plays and stats underneath as you scroll the card.',
    'B, the same cards fanned as a stack on Home ("3 games on now"), tap to open the deck.'],
  options: [{ k: 'a', name: 'Swipe deck', note: '' }, { k: 'b', name: 'Fanned stack', note: '' }],
  current: () => V('As the app draws it', '#/scores', PH(phoneAt('scores'))),
  proposed: k => { const card = (a, b, x, y, st) => MESH(TA(a).color, TA(b).color, 'r6i-dk', `<span class="r6i-eb">${st}</span><div class="r6i-sc"><div>${S(UI.logo(TA(a).id, 'md'))}<b>${esc(TA(a).name)}</b></div><em>${x}</em><span class="r6i-mid">–</span><em>${y}</em><div>${S(UI.logo(TA(b).id, 'md'))}<b>${esc(TA(b).name)}</b></div></div>`);
    return V(k === 'a' ? 'Swipe deck' : 'Fanned stack', k === 'a' ? '#/scores' : '#/home', PH(`<div class="r6i-deck ${k}"><div class="p">${card('BUF', 'NE', 14, 10, 'Q2 3:40')}</div><div class="c">${card('KC', 'LAC', 24, 17, 'Q3 4:12')}</div><div class="n">${card('DAL', 'PHI', 7, 21, 'Q3 9:02')}</div></div>`)); } };

R['idea-trend'] = { id: 'idea-trend', v: 1, ready: true, name: 'Idea: game-by-game bars', target: 'player Game log · team trends',
  changes: [DIR, 'From the real-estate dashboard (03: hatched grey bars, the picked month solid with a label above it) and the tennis stats (04: a tight run of thin bars with the latest picked out).',
    'A, one bar per game, past games hatched in grey, the latest (or the tapped one) solid in the team colour with its number over it in Display.',
    'B, thin bars with a dashed season-average line across them.'],
  options: [{ k: 'a', name: 'Hatched + picked', note: '' }, { k: 'b', name: 'Average line', note: '' }],
  current: () => V('As the app draws it', '#/player', PH(phoneAt('player/3139477'))),
  proposed: k => { const kc = KC(), v = [245, 318, 201, 273, 312], mx = 340;
    return V(k === 'a' ? 'Hatched + picked' : 'Average line', '#/player · Game log', PH(`${SEC('Passing yards')}<div class="card r6i-tr ${k}" style="--ma:${dp(kc.color)}">${k === 'b' ? `<i class="r6i-avg" style="bottom:${Math.round(270 / mx * 100)}%"><span>Avg 270</span></i>` : ''}${v.map((x, i) => `<div class="r6i-tb ${i === 4 ? 'on' : ''}">${i === 4 && k === 'a' ? `<b>${x}</b>` : ''}<i style="height:${Math.round(x / mx * 100)}%"></i><span>W${i + 1}</span></div>`).join('')}</div>`)); } };

})();
