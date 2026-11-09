/* Approvals round 5 (molecules), batch a: cards keyed by id in window.R5_CARDS, picked up by round5.js.
   "Current" is the real component (its builder when one is exported, its markup copied from the screen when not, and the
   screen on the right). "Proposed" is the same molecule rebuilt only from the locked atoms, type roles and the shared lockups L1–L5. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const { icon, store } = App, UI = App.UI, Dt = App.data;
const { S, esc, phone, none, C } = DSApprovals.h;

/* ------------------------------------------------------------------ helpers */
const V = (label, where, inner) => `<div class="r4-v"><div class="r4-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r4-vb">${inner}</div></div>`;
const T = id => Dt.team(id) || {};
const prim = t => (App.teamRoles(t) || {}).primary || t.color;
const lg = (id, c = 'sm') => S(UI.logo(id, c));
const ic = (n, c = 'xs') => S(icon(n, c));
const G = () => C().G || {};
const any = () => G().live || G().post || G().pre;
const rec = (tid, g) => { try { return (Dt.record(tid, g ? g.s : undefined, g ? g.ts : undefined) || {}).str || ''; } catch (e) { return ''; } };
const QB = tid => { const r = Dt.roster(tid) || []; return r.find(p => p.pos === 'QB') || r[0] || {}; };
const pidOf = p => p.id || p.pid;
const safe = f => { try { const x = S(f()); return x.trim() ? x : ''; } catch (e) { return ''; } };
const frame = (inner, cls = '') => `<div class="r5a-frame ${cls}">${inner}</div>`;

/* ------------------------------------------------------------------ shared lockups (identical across batches) */
/** L1 team-score line: logo S24, tricode (Display), possession, score (Display) right; the loser at 60% when final */
const L1 = (tid, sc, o = {}) => `<div class="lk-l1 ${o.lost ? 'lost' : ''}">${lg(tid)}<span class="lk-tri">${esc(T(tid).abbr || '')}</span>${o.poss ? (o.ball ? `<span class="lk-ball">${ic('football')}</span>` : '<i class="lk-poss"></i>') : ''}<span class="lk-sc">${sc == null ? '' : sc}</span></div>`;
/** L2 team row: logo M32, team name (Display), record (Stats medium, Meta size) */
const L2 = (tid, r, right = '') => `<div class="lk-l2">${lg(tid, 'md')}<span class="lk-nm">${esc(T(tid).name || '')}</span>${r ? `<span class="lk-rec">${esc(r)}</span>` : ''}${right ? `<span class="lk-r">${right}</span>` : ''}</div>`;
/** L3 player line: headshot S32 or M44, name (Sans bold), "POS · TEAM" (Sans medium, text 2) */
const L3 = (p, meta, big) => `<div class="lk-l3">${S(UI.hs(pidOf(p), big ? '' : 'sm'))}<span class="lk-pn"><b>${esc(p.n || '')}</b><span>${esc(meta != null ? meta : [p.pos, T(p.t).abbr].filter(Boolean).join(' · '))}</span></span></div>`;
/** L4 stat pair: value (Stats bold) over, or beside, a label (Meta) */
const L4 = (v, l, side) => `<span class="lk-l4 ${side ? 'side' : ''}"><b>${v}</b><span>${l}</span></span>`;
/** L5 status: the live badge with its dot; a soft neutral badge for Final, kickoff and Bye */
const L5 = (Sc, hide) => Sc.st === 'live' ? `<span class="badge live">${hide ? 'Live' : esc(Sc.label)}</span>` : `<span class="badge">${esc(Sc.label)}</span>`;
const lines = (g, o = {}) => { const Sc = Dt.score(g), hide = Dt.spoiled(g) && Sc.st !== 'pre', pre = Sc.st === 'pre';
  return [g.a, g.h].map(id => { const me = id === g.h ? Sc.hs : Sc.as, them = id === g.h ? Sc.as : Sc.hs;
    return L1(id, pre ? '' : hide ? '–' : me, { poss: Sc.st === 'live' && !hide && Sc.poss === id, ball: o.ball, lost: Sc.final && !hide && me < them }); }).join(''); };

/* ------------------------------------------------------------------ the cards */
R.ticker = { id: 'ticker', v: 2, name: 'Live score ticker', target: 'homeParts.ticker() · .ticker .tk-row', ctx: ['home', '.ticker'],
  changes: ['v2, from your note ("the text is a little big"): the ticker uses a compact L1. Tricode 17 → 14 px, score 22 → 17 px, logo 24 → 20 px, line 28 → 22 px, cell 132 → 116 px wide. Faces are unchanged. This is already live in the app, so Current and Proposed both show v2.',
    'Today: tricodes and scores are already Display (the type lock), but the status line is red text on the surface (10.5 px, under AA), logos are 16 px (XS) and the possession mark is a 5 px amber dot, not the Live-red one used everywhere else.',
    'Proposed: each cell is the L5 status (the live badge with its dot and clock, a soft neutral badge for Final or kickoff) over two L1 lines: logo S24, tricode and score in Display, the 6 px Live-red possession dot, the loser at 60% when final.',
    '"All scores" becomes a squared small button at the end of the rail, since it is pressable.'],
  current: () => V('Home, top of the sheet', 'homeParts.ticker()', frame(safe(() => App.homeParts.ticker()) || none('No games on the ticker at this moment.'), 'flush')),
  proposed: () => { const gs = [G().live, G().live2, G().post, G().pre].filter(Boolean).filter((g, i, a) => a.indexOf(g) === i);
    return V('Ticker cells', 'L5 status · L1 × 2 · squared "All scores"', frame(`<div class="r5a-tk">${gs.map(g => `<div class="r5a-tkc">${L5(Dt.score(g), Dt.spoiled(g))}${lines(g)}</div>`).join('')}<div class="r5a-tkc end"><button class="btn sm ghost">All scores ${ic('chev')}</button></div></div>`, 'flush')); } };

R['game-row'] = { id: 'game-row', v: 1, name: 'Compact game row', target: 'UI.gameRow() · schedules', ctx: ['team/__TEAM__?tab=schedule', '.row'],
  changes: ['Today: a second game-summary style. "W1" in its own column, a 24 px logo, "vs Broncos" in Sans bold, the result as a green or red W/L letter beside a Stats score, the network in the Meta line; live is a red badge with the score inside it.',
    'Proposed: the 56 px row atom. Left, logo M32; title, the opponent ("vs" / "@" in Meta, team name in Display); Meta below, week and date in Sans medium.',
    'Right: the result as a soft badge (W / L / T) beside the score in Display; live is the L5 live badge with the clock and the score beside it; upcoming shows the kickoff time in Sans medium. The chevron stays.'],
  current: () => { const tid = C().tm.id, gs = Dt.teamGames(tid, any() ? any().s : undefined).filter(g => g.t === 2);
    const pick = [gs.find(g => Dt.state(g) === 'post'), gs.find(g => Dt.state(g) === 'live'), gs.find(g => Dt.state(g) === 'pre')].filter(Boolean);
    return V('Team schedule', 'UI.gameRow(g, team)', frame(`<div class="list">${pick.map(g => S(UI.gameRow(g, tid))).join('')}</div>`)); },
  proposed: () => { const tid = C().tm.id, gs = Dt.teamGames(tid, any() ? any().s : undefined).filter(g => g.t === 2);
    const pick = [gs.find(g => Dt.state(g) === 'post'), gs.find(g => Dt.state(g) === 'live'), gs.find(g => Dt.state(g) === 'pre')].filter(Boolean);
    const one = g => { const Sc = Dt.score(g), home = g.h === tid, opp = home ? g.a : g.h, st = Sc.st, us = home ? Sc.hs : Sc.as, them = home ? Sc.as : Sc.hs;
      const right = st === 'post' ? `<span class="badge">${us > them ? 'W' : us < them ? 'L' : 'T'}</span><span class="lk-sc">${us}–${them}</span>` : st === 'live' ? `<span class="badge live">${esc(Sc.label)}</span><span class="lk-sc">${us}–${them}</span>` : `<span class="r5a-time">${esc(new Date(g.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}</span>`;
      return `<div class="row r5a-row">${lg(opp, 'md')}<div class="grow"><div class="r5a-rt"><span class="t-meta">${home ? 'vs' : '@'}</span> <span class="lk-nm">${esc(T(opp).name)}</span></div><div class="row-sub">${esc(Dt.weekLabel(g.t, g.w, true))} · ${esc(new Date(g.ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))}${(g.tv || [])[0] ? ' · ' + esc(g.tv[0]) : ''}</div></div><span class="r5a-rr">${right}</span>${ic('chev', 'sm')}</div>`; };
    return V('Final · live · upcoming', 'row atom · logo M32 · Display name · soft badge', frame(`<div class="list">${pick.map(one).join('')}</div>`)); } };

R['scores-item'] = { id: 'scores-item', v: 2, name: 'Scores list item', target: 'scores.js gameItem() · .sc-item .sc-tv · UI.yardTrack()', ctx: ['scores', '.sc-item'],
  changes: ['From your note, "1st & 10 at CHI 7" was too large. It is now 13.5 px, down from 15 px, in Sans medium. Down & distance is now Sans everywhere in the app. It sits under the score as a supporting line and no longer competes with it.',
    'The yardage tracker drops its "CHI · 50 · GB" line. The end caps are already in each team\'s colour, so the track needs no words.',
    'Kept from v1: the approved game card, with the Scores-only overrides gone and logos back to M32, and the squared, outlined TV button in the card\'s top row.'],
  current: () => { const gs = [G().live, G().pre, G().post].filter(Boolean);
    return V('Scores tab', 'gameItem(g) = .sc-item + UI.gameCard(g) + .sc-tv (markup from scores.js; not exported)', frame(`<div class="sc-games r5a-pad0">${gs.map(g => `<div class="sc-item">${S(UI.gameCard(g))}${Dt.state(g) !== 'post' ? `<button class="sc-tv" aria-label="Where to watch">${ic('tv', 'sm')}</button>` : ''}</div>`).join('')}</div>`)); },
  proposed: () => { const gs = [G().live, G().pre, G().post].filter(Boolean);
    return V('Scores tab', 'approved game card · tracker with no end labels · 13.5 px down & distance · squared TV button', frame(`<div class="r5a-col">${gs.map(g => `<div class="r5a-scitem">${S(UI.gameCard(g))}${Dt.state(g) !== 'post' ? `<button class="btn sm sq ghost r5a-tv" aria-label="Where to watch">${ic('tv', 'sm')}</button>` : ''}</div>`).join('')}</div>`)); } };

const WEEKS = () => { const g = any(); const s = g ? g.s : 2026, cur = g ? g.w : 8; return [-2, -1, 0, 1, 2].map(d => cur + d).filter(w => w > 0 && w < 19).map(w => ({ w, on: w === cur, live: w === cur && !!G().live, d: Dt.week(s, 2, w) })); };
const rng = w => w.d ? `${new Date(w.d.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${new Date(w.d.end).getDate()}` : '';
R['week-strip'] = { id: 'week-strip', v: 1, name: 'Week strip + season picker', target: 'scores.js weekStrip() · .sc-strip .sc-season', ctx: ['scores', '.sc-strip'],
  changes: ['Today: the season picker is a bare Stats 15 px number with a chevron behind a hairline, not a control from the family. The week labels are Sans 13.5 px, the dates 10.5 px in text 3 (under AA), and the live week has a pulsing pink dot.',
    'Proposed: the season picker is a squared chip (Sans bold year, chevron), the same family as the filter chips below it.',
    'Weeks: "Wk 8" in Sans bold over the date range in Sans medium Meta (text 2, AA), the selected week underlined in the accent, the live week marked by the 6 px Live-red dot.'],
  current: () => { const ws = WEEKS(), g = any();
    return V('Scores, under the header', 'weekStrip(S) (markup from scores.js; not exported)', frame(`<div class="sc-strip"><button class="sc-season"><span class="num">${g ? g.s : 2026}</span>${ic('down')}</button><div class="sc-weeks">${ws.map(w => `<button class="sc-wk ${w.on ? 'on' : ''}"><span class="l">Wk ${w.w}${w.live ? '<i class="sc-live-dot"></i>' : ''}</span><span class="d">${rng(w)}</span></button>`).join('')}</div></div>`, 'flush')); },
  proposed: () => { const ws = WEEKS(), g = any();
    return V('Scores, under the header', 'squared chip · Sans bold over Meta · accent underline', frame(`<div class="r5a-ws"><button class="chip r5a-season">${g ? g.s : 2026} ${ic('down')}</button><div class="r5a-wks">${ws.map(w => `<button class="r5a-wk ${w.on ? 'on' : ''}"><span class="l">Wk ${w.w}${w.live ? '<i class="lk-poss"></i>' : ''}</span><span class="t-meta">${rng(w)}</span></button>`).join('')}</div></div>`, 'flush')); } };

const BYES = () => { const tid = C().tm.id; const ids = [tid].concat((Dt.D && Dt.D.teams || []).map(t => t.id).filter(x => x !== tid).slice(0, 3)); return ids; };
R['bye-row'] = { id: 'bye-row', v: 2, name: 'Bye teams', target: 'scores.js · .sc-bye', ctx: ['scores', '.sc-byes'],
  changes: ['From your note, the tricodes sat low in the chips. Display italic caps carry the font\'s descender space under them, so centring the line box puts the capitals about 1.5 px under the middle. The tricode now sets with no extra space underneath and is nudged up to the chip\'s optical centre, level with the middle of the logo. The fix is in the chip, so every chip with a Display label (bye teams, article tags) uses it.',
    'Kept from v1: "On bye" as an Eyebrow, and squared chips with a 24 px logo (S24) that open the team.'],
  current: () => V('Scores, after the games', '.sc-byes .sc-bye (markup from scores.js; not exported)', frame(`<div class="sc-byes r5a-pad0" style="margin:0"><span class="tiny">On bye</span><div class="flex gap8 wrap mt8">${BYES().map(id => `<a class="sc-bye">${lg(id)}<span>${esc(T(id).abbr)}</span></a>`).join('')}</div></div>`)),
  proposed: () => V('Scores, after the games', 'Eyebrow · squared chips · logo S24 · Display tricode on the optical centre', frame(`<div class="t-eyebrow">On bye</div><div class="r4-row wrap mt8">${BYES().map(id => `<button class="chip r5a-bye">${lg(id)}<span class="lk-tri">${esc(T(id).abbr)}</span></button>`).join('')}</div>`)) };

const ART = () => { const tid = C().tm.id; const a = Dt.news({ team: tid }); return a.length ? a : Dt.news(); };
R['news-card'] = { id: 'news-card', v: 1, name: 'News card', target: 'UI.newsCard() · .row.tap .h4.clamp3 · .card.story', ctx: ['team/__TEAM__', '.story'],
  changes: ['Today: two layouts. The small row is the headline in .h4 (Title S) clamped to three lines with a 96 px thumb; the card is a picture, a source line with 24 px logos, and the headline in .h3.',
    'Both source lines use .src, a one-off. The row has no fixed height.',
    'Proposed: one family. The row is the 56 px row atom (Title S headline, 2 lines, Meta "News · 2h ago"), thumb 4:3 at 88 px, squared. The card is the picture, Eyebrow "Analysis" or "News" with logos XS16, the headline in Title, and Meta for the time.'],
  current: () => { const a = ART(); if (!a.length) return none('No news at this moment.');
    return V('Small row', 'UI.newsCard(a, "sm") · Home, team, search', frame(`<div class="list">${S(UI.newsCard(a[1] || a[0], 'sm'))}</div>`)) + V('Card', 'UI.newsCard(a) · Home lead, News', frame(S(UI.newsCard(a[0])), 'w340')); },
  proposed: () => { const a = ART(); if (!a.length) return none('No news at this moment.'); const x = a[1] || a[0], y = a[0];
    const kind = z => z.ty === 'Story' ? 'Analysis' : 'News', ago = z => App.fmt.ago(z.pub);
    return V('Small row', 'row atom · Title S · Meta · squared 4:3 thumb', frame(`<a class="row r5a-nrow"><div class="grow"><div class="row-title clamp2">${esc(x.h)}</div><div class="row-sub">${kind(x)} · ${ago(x)}</div></div>${x.img ? `<div class="r5a-nthumb"><img src="${esc(x.img)}" alt=""></div>` : ''}</a>`))
      + V('Card', 'picture · Eyebrow + logos XS16 · Title · Meta', frame(`<a class="r5a-ncard">${y.img ? `<div class="r5a-npic"><img src="${esc(y.img)}" alt=""></div>` : ''}<div class="r5a-nbody"><div class="r4-row" style="gap:6px">${(y.tm || []).slice(0, 2).map(t => lg(t, 'xs')).join('')}<span class="t-eyebrow">${kind(y)}</span></div><div class="t-title clamp3 mt6">${esc(y.h)}</div><div class="t-meta mt4">${ago(y)}</div></div></a>`, 'w340')); } };

R['news-list'] = { id: 'news-list', v: 2, name: 'Article header tags', target: 'home.js articleView() · .ar-head .ar-tag', ctx: ['news', '.ar-tag'],
  changes: ['From your note, the team names sat low in the tags. They use the same chip fix as the bye teams: no extra space under the Display caps, so the name sits on the chip\'s optical centre, level with the logo.',
    'Also from your note, "Analysis" was too close to the tags. It moves off the tag row onto its own line, 16 px under the tags and directly over the headline, the same Eyebrow-over-headline pairing as the news card. With three teams the row would have wrapped anyway; it now reads as the kind of story, not as a fourth tag.',
    'Kept from v1: squared chips (pressable) with logo XS16 and the team name in Display; the date under the headline in Meta.'],
  current: () => { const a = ART()[0]; if (!a) return none('No news at this moment.');
    return V('Article, above the headline', 'articleView() · .ar-tag (markup from home.js; not exported)', frame(`<div class="ar-head"><div class="flex gap8 wrap">${(a.tm || [C().tm.id]).slice(0, 3).map(t => `<a class="ar-tag tap">${lg(t)}${esc(T(t).name)}</a>`).join('')}<span class="eyebrow">${a.ty === 'Story' ? 'Analysis' : 'News'}</span></div></div>`)); },
  proposed: () => { const a = ART()[0]; if (!a) return none('No news at this moment.');
    return V('Article, above the headline', 'squared chips on the optical centre · Eyebrow on its own line over the headline · Meta', frame(`<div class="r5a-tags">${(a.tm || [C().tm.id]).slice(0, 3).map(t => `<button class="chip r5a-bye tm">${lg(t, 'xs')}<span class="lk-nm">${esc(T(t).name)}</span></button>`).join('')}</div><div class="t-eyebrow r5a-kind">${a.ty === 'Story' ? 'Analysis' : 'News'}</div><div class="t-title mt6 clamp2">${esc(a.h)}</div><div class="t-meta mt6">${App.fmt.ago(a.pub)}</div>`)); } };

const VID = (o = {}) => { const a = ART()[0] || {}; return { id: 'v1', title: a.h || 'Every touchdown from Sunday', sub: 'NFL Network · 2h ago', img: a.img, dur: '4:12', team: C().tm.id, ...o }; };
R['video-card'] = { id: 'video-card', v: 2, name: 'Video card', target: 'UI.videoCard() · watch wcard() · UI.plusTab()', ctx: ['watch', '.thumb'],
  changes: ['v2, from your note ("the text looks broken? also the NFL+ banner looks a little big and the logo looks a tad bit small"). The broken text was this card\'s Proposed side: it tried to rebuild the title from markup that had already changed, so the title and the Meta line printed twice, beside the picture. The Proposed side is now the real card, so what you see is what the app draws.',
    'The NFL+ tab is smaller: 36 × 38 px, down from 44 × 46. The NFL+ mark inside it is bigger: 15 px tall (26 px wide), up from 13 px, so the mark fills the tab instead of floating in it. The Premium tab keeps room for its word. The tab is the one atom on every locked picture, so the change is app-wide.',
    'Unchanged: the play button, the length pill, the progress line, Title S (2 lines) and Meta under the picture.'],
  current: () => V('Watch rails, team videos (v1)', 'UI.videoCard(v) with the 44 × 46 tab', `<div class="r5a-v1tab">${frame(`<div class="r4-row" style="align-items:flex-start">${S(UI.videoCard(VID(), { w: 220 }))}${S(UI.videoCard(VID({ tier: 'plus', prog: 40 }), { w: 220 }))}</div>`)}</div>`),
  proposed: () => V('Watch rails, team videos', 'UI.videoCard(v) · 36 × 38 tab · 15 px mark', frame(`<div class="r4-row" style="align-items:flex-start">${S(UI.videoCard(VID(), { w: 220 }))}${S(UI.videoCard(VID({ tier: 'plus', prog: 40 }), { w: 220 }))}</div>`)) };

/** continue watching needs something in progress: lend it one for the drawing */
const withResume = f => { const was = store.p.resume; const v = VID(); store.p.resume = [{ key: 'v1', t: 610, len: 1500, ...v }]; try { return f(); } finally { store.p.resume = was; } };
R['continue-watching'] = { id: 'continue-watching', v: 1, name: 'Continue watching', target: 'watchParts.continueWatching() · .w-cw', ctx: ['watch', '.w-cw'],
  changes: ['Today: the Watch card at 236 px with its own progress bar (progBar, not the approved .thumb-prog), then "14:50 left" in .tiny under the title.',
    'Proposed: the video card as above (Title S, Meta), with the approved 3 px .thumb-prog on the picture and the time left in Meta in the same line as the source ("NFL Network · 14:50 left"), so the card is the same height as every other rail.'],
  current: () => V('Watch, first rail', 'watchParts.continueWatching()', frame(safe(() => withResume(() => App.watchParts.continueWatching())) || none('Nothing in progress.'))),
  proposed: () => { const v = VID({ prog: 41 }); const pic = S(UI.videoCard(v, { w: 236 })).replace(/<div class="h4[^"]*">[\s\S]*$/, '').replace(/^<a[^>]*>/, '');
    return V('Watch, first rail', 'video card · .thumb-prog · time left in Meta', frame(`<a class="r5a-vc" style="width:236px">${pic}<div class="t-title-s clamp2 mt8">${esc(v.title)}</div><div class="t-meta mt4">NFL Network · 14:50 left</div></a>`)); } };

const SHOW = () => ({ eyebrow: 'Original series', big: 'Hard Knocks', title: 'Hard Knocks: In Season', sub: '6 episodes', team: C().tm.id });
R.poster = { id: 'poster', v: 2, name: 'Show poster', target: 'watch.js poster() · .w-poster', ctx: ['watch', '.w-poster'],
  changes: ['From your note, "Original series" was too large. It is now 10 px, down from the 11 px Eyebrow, with a little more tracking, so the show name leads.',
    'Also from your note, the NFL+ pill looked bad next to the logo, and the two had different insets. The pill is replaced by the approved NFL+ tab, the same one on every locked video thumbnail. It hangs from the top edge, so it needs no inset of its own.',
    'The logo is 28 px, 12 px from the top and left edges, the same inset as the words at the bottom, so the tile has one margin all round.',
    'Kept from v1: the team\'s sheet gradient, the show name in white Display italic caps, and Title S and Meta under the tile.'],
  current: () => { const p = SHOW(), t = T(p.team);
    return V('Watch shows', 'poster(p) (markup from watch.js; not exported)', frame(`<div class="r4-row" style="align-items:flex-start"><a class="w-poster" style="width:150px"><div class="w-pimg" style="aspect-ratio:3/4;background:${t.color};color:#fff"><div class="w-peb">${p.eyebrow}</div><div class="w-pt" style="font-size:21px">${p.big}</div><div class="w-plogo">${lg(p.team, 'md')}</div><div class="w-tr">${S(UI.tierBadge('plus'))}</div></div><div class="h4 mt8 clamp2">${p.title}</div><div class="tiny mt4 ellipsis">${p.sub}</div></a></div>`)); },
  proposed: () => { const p = SHOW(), t = T(p.team);
    return V('Watch shows', 'sheet gradient · 10 px Eyebrow · Display · logo at an even 12 px · the approved NFL+ tab', frame(`<a class="r5a-poster" style="width:150px"><div class="tsurf r5a-pimg" style="${App.teamVars(t)}">${lg(p.team, 'md')}${S(UI.plusTab('plus'))}<span class="t-eyebrow">${p.eyebrow}</span><span class="t-ds">${p.big}</span></div><div class="t-title-s clamp2 mt8">${p.title}</div><div class="t-meta mt4">${p.sub}</div></a>`)); } };

R['watch-game-tile'] = { id: 'watch-game-tile', v: 3, name: 'Watch game tile', target: 'watch.js gameTile() · .w-game .w-ok/.w-no', ctx: ['watch', '.w-game'],
  changes: ['v3, from your note ("gradients looks a little gross. propose something else"): the blend is gone. Each team\'s colour is now solid and stays with that team, its own primary, never mixed or darkened. Three ways to show it; pick one.',
    'Option A, split bar: the 6 px bar across the top in two solid halves, away on the left and home on the right, with a crisp edge where they meet. It is the bar the app has today, now at 6 px with the real primaries.',
    'Option B, team marks: no bar. A 4 × 20 px mark in each team\'s primary leads its line, before the logo, so the colour sits with the team it belongs to.',
    'Option C, underline: no bar. A 3 px underline in each team\'s primary under its tricode.',
    'Kept from v2: the L5 status with the network in Meta, two L1 lines (tricode and score in Display, the possession dot, the loser at 60%), and the foot: a soft badge with a check ("On NFL+"), or Meta when the game is elsewhere.'],
  options: [{ k: 'a', name: 'Split bar', note: 'Two solid team-colour halves across the top, with a crisp edge.' },
    { k: 'b', name: 'Team marks', note: 'A small solid mark in each team\'s colour at the start of its line.' },
    { k: 'c', name: 'Underline', note: 'A thin underline in each team\'s colour under its tricode.' }],
  current: () => { const gs = [G().live, G().pre].filter(Boolean);
    return V('Watch, "Games" rail', 'gameTile(g) (markup from watch.js; not exported)', frame(`<div class="r4-row" style="align-items:stretch">${gs.map(g => { const Sc = Dt.score(g);
      return `<a class="w-game" style="width:200px"><div class="w-gbar"><i style="background:${T(g.a).color}"></i><i style="background:${T(g.h).color}"></i></div><div class="flex between"><span>${Sc.st === 'live' ? `<span class="badge live">${esc(Sc.label)}</span>` : `<span class="eyebrow">${esc(Sc.label)}</span>`}</span><span class="tiny">${esc((g.tv || [])[0] || '')}</span></div>${[g.a, g.h].map(id => `<div class="w-gt">${lg(id)}<span class="grow">${esc(T(id).name)}</span>${Sc.st !== 'pre' ? `<b class="num">${id === g.h ? Sc.hs : Sc.as}</b>` : ''}</div>`).join('')}<div class="w-gfoot">${Sc.st === 'live' ? `<span class="w-ok">${ic('check')} NFL+</span>` : `<span class="w-no">On ${esc((g.tv || ['TV'])[0])}</span>`}</div></a>`; }).join('')}</div>`)); },
  proposed: k => { const gs = [G().live, G().pre].filter(Boolean); k = k || 'a';
    return V('Watch, "Games" rail', { a: 'split bar, two solid halves', b: 'a team-colour mark leads each line', c: 'a team-colour underline under each tricode' }[k] + ' · L5 + Meta · L1 × 2 · soft badge foot', frame(`<div class="r4-row" style="align-items:stretch">${gs.map(g => { const Sc = Dt.score(g);
      return `<div class="r5a-gt v3 ${k}" style="--ca:${prim(T(g.a))};--ch:${prim(T(g.h))}">${k === 'a' ? '<div class="r5a-gbar"><i style="background:var(--ca)"></i><i style="background:var(--ch)"></i></div>' : ''}<div class="r4-row between">${L5(Sc)}<span class="t-meta">${esc((g.tv || [])[0] || '')}</span></div><div class="mt8 r5a-gl">${lines(g)}</div><div class="mt8">${Sc.st === 'live' ? `<span class="badge">${ic('check')} On NFL+</span>` : `<span class="t-meta">On ${esc((g.tv || ['TV'])[0])} · see options</span>`}</div></div>`; }).join('')}</div>`)); } };

const PLANS = [{ k: 'free', n: 'Free', p: '$0', line: 'Everything you need to follow the game.' }, { k: 'plus', n: 'NFL+', p: '$6.99', line: 'Your local & primetime games live, plus every radio call.' }, { k: 'premium', n: 'NFL+ Premium', p: '$14.99', line: 'RedZone, every replay and All-22, on any screen.' }];
R['plan-card'] = { id: 'plan-card', v: 1, name: 'Plan card', target: 'watch.js plans route · .w-plan', ctx: ['plans', '.w-plan'],
  changes: ['Today: the plan in focus has an inset 2 px ring in the app accent (not the plan\'s colour); "Your plan" is an outline badge; the price is .w-price; the card layout itself was never approved.',
    'Proposed: one card per plan on the surface. Top row: "Free" in Title or the NFL+ logo (with "Premium"), and "Your plan" as a soft .badge. The price is a big hero number in Display with "/mo" in Meta; the line in Meta; a squared full-width button in NFL+ blue (both paid plans, as today).',
    'The plan in focus gets a 2 px border in NFL+ blue, the colour of its button, instead of the red accent ring.'],
  current: () => V('Plans', 'plans route (markup from watch.js; not exported)', frame(`<div class="w-plans">${PLANS.map((p, i) => `<div class="w-plan ${p.k} ${i === 0 ? 'cur' : ''} ${i === 1 ? 'focus' : ''}"><div class="flex between">${p.k === 'free' ? `<div class="h3">${p.n}</div>` : `<div class="w-plan-n">${S(UI.plusLogo())}${p.k === 'premium' ? '<span>Premium</span>' : ''}</div>`}${i === 0 ? '<span class="badge outline">Your plan</span>' : ''}</div><div class="w-price num mt8">${p.p}${p.k === 'free' ? '' : '/mo'}</div><div class="meta mt6">${p.line}</div>${i ? `<button class="btn block mt12 ${p.k}">Try ${p.n} free for 7 days</button>` : '<div class="tiny mt12">No card needed, ever.</div>'}</div>`).join('')}</div>`)),
  proposed: () => V('Plans', 'surface card · Display price · squared button · focus in NFL+ blue', frame(`<div class="r5a-col">${PLANS.map((p, i) => `<div class="r5a-plan ${p.k} ${i === 1 ? 'focus' : ''}"><div class="r4-row between">${p.k === 'free' ? '<span class="t-title">Free</span>' : `<span class="r5a-pn">${S(UI.plusLogo())}${p.k === 'premium' ? '<span class="t-title">Premium</span>' : ''}</span>`}${i === 0 ? '<span class="badge">Your plan</span>' : ''}</div><div class="mt8"><span class="t-dl">${p.p}</span>${p.k === 'free' ? '' : '<span class="t-meta"> /mo</span>'}</div><div class="t-meta mt6">${p.line}</div>${i ? `<button class="btn ${p.k} r5a-block mt12">Try ${p.n} free for 7 days</button>` : '<div class="t-meta mt12">No card needed, ever.</div>'}</div>`).join('')}</div>`)) };

R['upsell-sheet'] = { id: 'upsell-sheet', v: 1, name: 'Upsell sheet', target: 'watch.js upsellSheet() · .sheet', ctx: ['watch', '.w-hero'],
  changes: ['Today: a sheet with the tier badge, the reason in .muted body text, a one-off "Still free for you" box (.w-free), and two round 44 px buttons ("See plans" in NFL+ blue, "Not now" ghost).',
    'Proposed: the sheet title in Title, then the approved lock note atom (NFL+ logo, what it is included with, and its own squared "See plans" button), "Still free for you" as an Eyebrow over Meta on the surface, and one squared full-width "Not now" ghost button, so there is only one "See plans".'],
  current: () => V('Tapping a locked video', 'upsellSheet(f) (markup from watch.js; it opens in a sheet)', frame(`<div class="t-title mb12">Live games</div><div class="flex gap8 mb12">${S(UI.tierBadge('plus'))}</div><p class="muted">Live games comes with NFL+ ($6.99/mo) and NFL+ Premium.</p><div class="w-free mt12"><div class="eyebrow">Still free for you</div><div class="meta mt6">Highlights, the NFL Channel, podcasts, live Gamecast, and a guide to where every game is on.</div></div><div class="flex gap8 mt16"><button class="btn plus grow">See plans</button><button class="btn ghost grow">Not now</button></div>`, 'r5a-sheet')),
  proposed: () => V('Tapping a locked video', 'Title · lock note · Eyebrow + Meta · squared ghost button', frame(`<div class="t-title">Live games</div><div class="mt12">${safe(() => UI.lockNote('plus', 'Live games')) || `<div class="lock-note flex">${S(UI.plusLogo())}<span>Live games come with NFL+ ($6.99/mo) and NFL+ Premium.</span></div>`}</div><div class="r5a-free mt12"><div class="t-eyebrow">Still free for you</div><div class="t-meta mt6">Highlights, the NFL Channel, podcasts, live Gamecast, and a guide to where every game is on.</div></div><button class="btn ghost r5a-block mt16">Not now</button>`, 'r5a-sheet')) };

R['where-resolver'] = { id: 'where-resolver', v: 1, name: 'Where-to-watch header', target: 'watch.js resolver() · .w-res', ctx: ['where-to-watch', '.w-res'],
  changes: ['Today: the rows below are approved, but the header block is a one-off: a tinted box with a check, "Watch on" in bold and the services as one-off round pills (.w-okc); when nothing matches, an info box and grey round pills (.w-chip).',
    'Proposed: the header is the 56 px row atom. Can watch: a check in Positive, title "Watch on" (Title S), then the services as soft .badge labels. Can\'t: an info icon, "Not on your current services" over Meta "Here\'s every way to get it", and the first three options as soft .badge labels.'],
  current: () => V('Where to watch', 'resolver(g) (markup from watch.js; not exported)', frame(`<div class="w-res ok">${ic('check', 'sm')}<div class="grow"><div class="b">Watch on</div><div class="w-oks mt6"><span class="w-okc">NFL+</span><span class="w-okc">CBS</span></div></div></div><div class="w-res no mt12">${ic('info', 'sm')}<div class="grow"><div class="b">Not on your current services</div><div class="tiny mt4">Here's every way to get it</div></div></div><div class="w-chips mt8"><span class="w-chip">NFL Sunday Ticket</span><span class="w-chip">NFL RedZone</span></div>`)),
  proposed: () => V('Where to watch', 'row atom · Positive check / info · soft badges', frame(`<div class="row r5a-res"><span class="r5a-ok">${ic('check', 'sm')}</span><div class="grow"><div class="row-title">Watch on</div><div class="r4-row wrap mt6" style="gap:6px"><span class="badge">NFL+</span><span class="badge">CBS</span></div></div></div><div class="row r5a-res mt8"><span class="r5a-info">${ic('info', 'sm')}</span><div class="grow"><div class="row-title">Not on your current services</div><div class="row-sub">Here's every way to get it</div><div class="r4-row wrap mt6" style="gap:6px"><span class="badge">NFL Sunday Ticket</span><span class="badge">NFL RedZone</span></div></div></div>`)) };

R['audio-sheet'] = { id: 'audio-sheet', v: 2, name: 'Audio player sheet', target: 'watch.js audioSheet() · .w-aplayer .w-wave', ctx: ['watch', '.w-hero'],
  changes: ['From your note, the waveform keeps the original motion: the bars rise and fall out of step, 900 ms, one after another. It also gets these improvements:',
    '1. The bars are in the team\'s own primary instead of the app accent.',
    '2. The bars are rounded and grow from the centre line with a scale rather than a height change, so the motion is smooth.',
    '3. Each bar has its own ceiling, louder in the middle and quieter at the ends, so it reads as a voice rather than an equaliser.',
    '4. With reduced motion, the bars stand still at those heights.',
    'Kept from v1, which you liked: the feed name in Title S with the L5 live badge under it, the squared 48 px play button, the feed list in row atoms with a check, and the delay as an L4 stat pair.'],
  current: () => { const g = G().live || any(); const Sc = g ? Dt.score(g) : { label: 'Q3 8:12' };
    return V('Watch → Listen', 'audioSheet(gid) (markup from watch.js; it opens in a sheet)', frame(`<div class="w-aplayer"><div class="w-wave on">${Array.from({ length: 28 }, (_, i) => `<i style="animation-delay:${(i * 73) % 900}ms"></i>`).join('')}</div><div class="flex between mt12"><div><div class="h4">${esc(T(C().tm.id).name)} radio</div><div class="tiny mt4"><span class="c-live b">LIVE</span> · ${esc(Sc.label)}</div></div><button class="icon-btn solid" style="width:52px;height:52px">${ic('pause', '')}</button></div></div><div class="eyebrow mt20 mb8">Broadcast</div><div class="list" style="margin:0">${S(UI.row({ title: 'Home radio', sub: 'Team flagship', right: icon('check', 'sm accent') }))}${S(UI.row({ title: 'National radio', sub: 'Westwood One' }))}</div><div class="card pad-all mt12"><div class="flex between"><span class="meta">Delay the radio call</span><b class="num">8s</b></div></div>`, 'r5a-sheet')); },
  proposed: () => { const g = G().live || any(); const Sc = g ? Dt.score(g) : { st: 'live', label: 'Q3 8:12' }, t = C().tm, n = 32;
    const bars = Array.from({ length: n }, (_, i) => { const env = .35 + .65 * Math.sin(Math.PI * (i + .5) / n), m = Math.max(.22, env * (.62 + .38 * Math.abs(Math.sin(i * 1.7)))); return `<i style="--m:${m.toFixed(2)};animation-delay:${(i * 73) % 900}ms"></i>`; }).join('');
    return V('Watch → Listen', 'the original wave motion, refined · team primary · Title S + L5 · squared play · rows · L4', frame(`<div class="r5a-ap"><div class="r5a-wave2" style="--w:${prim(t)}">${bars}</div><div class="r4-row between mt12"><div><div class="t-title-s">${esc(t.name)} radio</div><div class="mt6">${L5({ st: 'live', label: Sc.st === 'live' ? Sc.label : 'Q3 8:12' })}</div></div><button class="btn l sq" aria-label="Pause">${ic('pause', '')}</button></div></div><div class="t-eyebrow mt20 mb8">Broadcast</div><div class="list" style="margin:0">${S(UI.row({ title: 'Home radio', sub: 'Team flagship', right: icon('check', 'sm') }))}${S(UI.row({ title: 'National radio', sub: 'Westwood One' }))}</div><div class="r5a-free mt12 r4-row between"><span class="t-meta">Delay the radio call</span>${L4('8s', 'behind live', true)}</div>`, 'r5a-sheet')); } };

const rzFake = () => { const g = G().live || any(); if (!g) return []; const qb = QB(g.a); return qb.n ? [{ p: { ...qb, t: g.a }, yd: 8, dd: '2nd & 6' }] : []; };
R['rz-panel'] = { id: 'rz-panel', v: 2, name: 'RedZone panel', target: 'UI.rzPanel() · .rzp · rzFollowed() .rzf', ctx: ['scores', '.rzp'],
  changes: ['From your note, this starts again from the original panel (logo, count, chevron, the track) and only fixes its hierarchy, top to bottom. 1. The RedZone logo leads.',
    '2. The count was a faint 11 px caps label that lost to the logo and the track. It is now one Sans bold line in the text colour beside the logo ("1 in the red zone").',
    '3. The track\'s yard labels (30, 20, 10, TD) were the loudest words on the panel, 13 px Display italic. They are metadata, so they become 11.5 px Stats bold in text 2 and let the ball and the red line lead.',
    '4. A player you follow, when one is in range, gets a quiet row under a hairline: the L3 player line, then "8 yds out" on the right as one L4 pair, the number in Stats bold with the label beside it. The original stacked a big number over tiny text.'],
  current: () => { const x = safe(() => UI.rzPanel()); return x ? V('Scores, top', 'UI.rzPanel()', frame(x)) : V('Scores, top', 'UI.rzPanel() (no drives inside the 30 at this moment: the screen)', phone('scores')); },
  proposed: () => { const f = rzFake(), cur = safe(() => UI.rzPanel());
    if (!cur) return V('Scores, top', 'no drives inside the 30 at this moment: pick the Live moment', none('Nothing inside the 30 right now.'));
    const row = f.map(x => `<div class="r5a-rzf2">${L3(x.p, T(x.p.t).abbr + ' ball · ' + x.dd)}${L4(x.yd, 'yds out', true)}</div>`).join('');
    return V('Scores, top', 'the original panel · Sans bold count · Stats yard labels · L3 + L4 (the player is an example: you follow nobody in range right now)', frame(`<div class="r5a-rz2">${cur.replace(/<\/div>\s*$/, row + '</div>')}</div>`)); } };

const mL = () => C().mLive;
/** the drive so far, counted the way nowCard counts it */
const drive = m => { try { const L = m.L, di = L.next ? L.next.di : L.play.di, d = (m.pbp.dr || [])[di] || {};
  const ps = (m.plays || []).filter(p => p.di === di && /rush|pass|sack/i.test(p.ty || '')); return { n: ps.length, y: ps.reduce((a, p) => a + (p.y || 0), 0), st: ps.length ? (d.st || '') : 'New' }; } catch (e) { return { n: 0, y: 0, st: 'New' }; } };
R['now-card'] = { id: 'now-card', v: 2, name: 'Now card (live situation)', target: 'gameParts.nowCard() · .gc-card .gc-dd', ctx: ['game/__LIVE__', '.gc-dd'],
  changes: ['From your note, "1st & 10 at CHI 7" was much too big and in the wrong face. It is now 15 px Sans medium, down from 24 px, in the text colour. The down & distance role is now Sans everywhere in the app, not just here. It reads as the line under the team with the ball, not a headline.',
    'Also from your note, the "Last play / Drive" switch moves to the right, on the same line as the down & distance, as the squared small .seg. Who has the ball and the situation read on the left; the control to change the view sits on the right.',
    'Kept from v1: L2 for the team with the ball (logo M32, name in Display, "ball" in Meta) with the L5 status right; the drive chart as is; the drive as three L4 stat pairs; "Explain this play" as a squared small ghost button.'],
  current: () => { const m = mL(); return m ? V('Game, Live tab', 'gameParts.nowCard(m)', frame(safe(() => App.gameParts.nowCard(m)) || none('No live play at this moment.'), 'w380')) : none('No live game at this moment: pick the Live moment.'); },
  proposed: () => { const m = mL(); if (!m || !m.S) return none('No live game at this moment: pick the Live moment.');
    const Sc = m.S, g = m.g, poss = T(Sc.poss || g.a), dr = drive(m);
    return V('Game, Live tab', 'L2 + L5 · 15 px Sans down & distance with the switch on the right · drive chart · L4 × 3', frame(`<div class="r5a-card">${L2(poss.id, '', L5(Sc)).replace('</span><span class="lk-r">', '</span><span class="t-meta">ball</span><span class="lk-r">')}<div class="r5a-ddrow mt12"><span class="r-down-distance r5a-dd2">${esc(Sc.dd || 'Between plays')}</span><div class="seg sm r5a-seg"><button class="on">Last play</button><button>Drive</button></div></div><div class="mt12">${safe(() => UI.fieldViz(g, { L: m.L, mode: 'play' }))}</div><div class="r4-row mt12" style="gap:24px">${L4(dr.n, 'plays')}${L4(dr.y, 'yards')}${L4(esc(dr.st), dr.n ? 'started' : 'possession')}</div><button class="btn sm ghost mt12">${ic('help')} Explain this play</button></div>`, 'w380')); } };

const wps = m => { const pl = (m.st === 'live' ? m.plays : (m.pbp ? Dt.flat(m.pbp) : [])) || []; return pl.filter(p => p.wp != null).map(p => p.wp); };
/** the same line as wpChart, filled in each team's own primary (no readable/darkened shades) */
const wpSvg = (wp, g) => { const W = 340, H = 110, n = wp.length; const hc = prim(T(g.h)), ac = prim(T(g.a));
  const pts = wp.map((v, i) => [i / (n - 1) * W, H - v / 100 * H]); const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="display:block"><defs><clipPath id="r5wt"><rect width="${W}" height="${H / 2}"/></clipPath><clipPath id="r5wb"><rect y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath></defs>
    <line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="var(--line-2)" stroke-dasharray="3 3"/>${[1, 2, 3].map(q => `<line x1="${W * q / 4}" x2="${W * q / 4}" y1="0" y2="${H}" stroke="var(--line)"/>`).join('')}
    <path d="${d}L${W} ${H / 2}L0 ${H / 2}Z" fill="${hc}" clip-path="url(#r5wt)"/><path d="${d}L${W} ${H / 2}L0 ${H / 2}Z" fill="${ac}" clip-path="url(#r5wb)"/>
    <path d="${d}" fill="none" stroke="var(--text)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`; };
R['wp-card'] = { id: 'wp-card', v: 2, name: 'Win probability card', target: 'gameParts.wpCard() · UI.wpChart()', ctx: ['game/__LIVE__', '.gc-wpchart'],
  changes: ['From your note, the current card stays: the title, the two percentages beside the logos, the chart and the quarter labels, all as they are today.',
    'The one change is the status in the top right. "Updated live" in small grey text becomes the approved live badge, red with its dot. After the game it shows the soft neutral "Final" badge.'],
  current: () => { const m = mL() || C().mPre; const x = m && safe(() => App.gameParts.wpCard(m)); return x ? V('Game, Live and Recap tabs', 'gameParts.wpCard(m)', frame(x, 'w380')) : none('No win probability at this moment.'); },
  proposed: () => { const m = mL() || C().mPre; const x = m && safe(() => App.gameParts.wpCard(m)); if (!x) return none('No win probability at this moment.');
    const fin = m.st === 'post';
    return V('Game, Live and Recap tabs', 'the current card · the approved live badge for the status', frame(x.replace(/<div class="tiny">\s*(Updated live|Final)\s*<\/div>/, fin ? '<span class="badge">Final</span>' : '<span class="badge live">Live</span>'), 'w380')); } };

const fieldOpts = () => { const g = G().live || any(); if (!g) return null; const a = T(g.a), h = T(g.h); return { g, yz: 35, dist: 7, dirRight: true, awayColor: a.color, homeColor: h.color, awayAbbr: a.abbr, homeAbbr: h.abbr }; };
R['field-viz'] = { id: 'field-viz', v: 4, name: 'Field', target: 'UI.field() · learn.js fieldSvg() · app/field.js', ctx: ['game/__LIVE__', '.fv-svg'],
  changes: ['v4, from your note ("football with the outline looks a bit weird, maybe just a white dot. do some competitive analysis… the field feels a little tall, so make it shorter. also have no text for yardage markers"): the ball is a plain white dot on the line of scrimmage, the field is a third shorter (62 px deep, was 92), and the yardage numbers are gone, so nothing on the turf is text.',
    'What the others do: ESPN Gamecast draws a flat top-down strip with the ball as a dot and the drive as a team-colour bar; Apple Sports a thin, unmarked field with a dot; Yahoo and CBS drive trackers likewise mark only the ball, the line to gain and the end zones. The common thread is a wide, short field, almost no markings, and the ball as a dot, which is where v4 lands, keeping the drive chart\'s slight perspective so it still matches the Live tab.',
    'Kept from v3: yard lines every 10 (the 50 a touch brighter), no hash marks.',
    'Unchanged from v2: the drive-chart perspective on the flat dark plate, flat turf, end zones in each team\'s own primary with nothing written in them, the line of scrimmage in broadcast blue and the line to gain in broadcast yellow.',
    'It is still one drawing for the whole app, so the approved Learn diagrams get the same quieter field.'],
  current: () => { const o = fieldOpts(); return o ? V('Game Live, explainer sheet', 'UI.field(opts)', frame(S(UI.field(o)), 'w380')) : none('No game at this moment.'); },
  proposed: () => { const o = fieldOpts(); if (!o) return none('No game at this moment.');
    const los = o.dirRight ? 100 - o.yz : o.yz, fd = o.dirRight ? los + o.dist : los - o.dist;
    return V('Game Live, explainer sheet', 'the one field: lines every 10 · no numbers · team end zones · blue and yellow lines · white dot', frame(DSField.plate({ a: T(o.g.a), h: T(o.g.h), los, fd, label: 'The field' }), 'w380')); } };

/* learn-diagrams moved here from batch c (v2) so the lessons use the same field as the field sheet and the drive chart */
const lessonDia = id => { const L = ((App.LEARN || {}).LESSONS || []).find(x => x.id === id); if (!L) return ''; try { const t = document.createElement('template'); t.innerHTML = App.val(L.body()); const d = t.content.querySelector('.lr-dia'); return d ? d.outerHTML : ''; } catch (e) { return ''; } };
const pair = () => { const g = G().live || any(); if (g) return [T(g.a), T(g.h), g]; const a = C().tm; return [a, T((Dt.D.teams.find(t => t.id !== a.id) || {}).id), null]; };
R['learn-diagrams'] = { id: 'learn-diagrams', v: 2, name: 'Learn diagrams', target: 'learn.js fieldSvg() scorebugSvg() · .lr-dia · app/field.js', ctx: ['learn/scoreboard', '.lr-dia'],
  changes: ['From your note, the lesson fields are now the same field as the Live drive chart and the field sheet, drawn by one shared drawing. They use the same perspective, the same flat dark plate, and the same lines and numbers. When the field changes (field v3 is waiting on you), the lessons change with it.',
    'Both end zones are team colours. Today one is NFL red and the other a grey that belongs to no team. They are your team\'s and its opponent\'s primaries, with nothing written in them; the stencilled "END ZONE" goes.',
    'The basics field measures itself with a thin dimension line above the field, from goal line to goal line, labelled "100 yards". This replaces a caption floating on the turf.',
    'On the downs field, the lines are broadcast blue and yellow. The labels "Line of scrimmage" and "First down" sit above the far sideline in white Sans bold, each on a short tick in its line\'s colour. None of the text is on the turf, and the ball is the field\'s flat football silhouette, not the cartoon ball.',
    'The score bug diagram, which you did not comment on, stays the v1 proposal: the app\'s own bug built from L1 lines, the L5 pill and the down & distance, with the same callouts.'],
  current: () => ['basics', 'downs', 'scoreboard'].map(id => V(id === 'scoreboard' ? 'Score bug' : id === 'downs' ? 'Downs' : 'Field', `learn/${id}`, `<div class="r5a-dia">${lessonDia(id) || none('Lesson not found.')}</div>`)).join(''),
  proposed: () => { const [a, h, g] = pair();
    const sc = g ? Dt.score(g) : { as: 17, hs: 14, label: '3rd 4:12', dd: '2nd & 6', poss: a.id };
    const A = a.id, H = h.id, call = t => `<span class="r5a-call">${t}</span>`;
    return V('Field', 'the one field · team end zones, no text · a goal-to-goal dimension line', `<div class="r5a-dia">${DSField.plate({ a, h, span: [0, 100, '100 yards'], label: '100 yards between the end zones' })}</div>`)
      + V('Downs', 'the one field · blue and yellow lines · labels above the far sideline · ball spot', `<div class="r5a-dia">${DSField.plate({ a, h, los: 35, fd: 45, notes: { los: 'Line of scrimmage', fd: 'First down' }, label: 'Line of scrimmage at the 35, first down at the 45' })}</div>`)
      + V('Score bug', 'the app\'s own bug: L1 lines · L5 · down & distance', `<div class="r5a-sb"><div class="r5a-sbr">${call('Team &amp; score')}${call('Quarter &amp; clock')}</div>
        <div class="r5a-sbc"><div class="r5a-sbt">${L1(A, sc.as, { poss: sc.poss === A })}${L1(H, sc.hs, { poss: sc.poss === H })}</div><div class="r5a-sbs"><span class="badge live">${esc(sc.label)}</span><b class="r-down-distance">${esc(sc.dd || '1st & 10')}</b></div></div>
        <div class="r5a-sbr">${call('Has the ball')}${call('Down &amp; distance')}</div></div>`); } };

})();
