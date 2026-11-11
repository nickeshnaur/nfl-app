/* ============================================================================
   Approvals: proposed changes to the design system, each one side by side with
   what the app draws today. "Current" is always the app's own component (or the
   real screen in a phone frame); "Proposed" is drawn here with app/design/approvals.css
   and never touches the app until it is approved and built for real.
   Decisions are kept in this browser (localStorage 'nfl-ds-approvals'); Claude
   reads them with `node _build/approvals.mjs`, which writes approvals.json.
   When a proposal is revised after "Not approved", bump its v: the old decision
   and comment stay in its history and it asks for review again.
   ========================================================================== */
(function () {
'use strict';
const { icon, store, time } = App;
const Dt = App.data, UI = App.UI, fmt = App.fmt;
const KEY = 'nfl-ds-approvals';
const S = x => String(x == null ? '' : x);
const esc = s => S(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ------------------------------------------------------------------ decisions */
function load() {
  let d; try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  d = d && d.items ? d : { items: {} };
  // the last decisions Claude pulled (approvals-saved.js) fill in any this browser doesn't have, or has an older version of;
  // a card you reset keeps its history key, so it isn't refilled
  const B = (window.AP_SAVED || {}).items || {};
  for (const [id, x] of Object.entries(B)) { const m = d.items[id]; if (!m || (!m.status && !('history' in m)) || (m.status && (m.v || 1) < (x.v || 1))) d.items[id] = { ...(m || {}), ...x }; }
  // every click is also saved to disk (approvals-live.js, via _build/apserver.mjs), so a browser that wipes its storage
  // gets back every decision and unsent note; the newer of the two wins per card
  const L = (window.AP_LIVE || {}).items || {};
  for (const [id, x] of Object.entries(L)) { const m = d.items[id];
    if (!m || (x.v || 1) > (m.v || 1) || ((x.v || 1) === (m.v || 1) && (x.at || '') > (m.at || '')) || (!m.status && !m.draft && (x.status || x.draft))) d.items[id] = { ...(m || {}), ...x }; }
  return d;
}
function save(d) {
  d.updated = new Date().toISOString();
  d.proposals = Object.fromEntries(PROPOSALS.map(p => [p.id, { v: p.v, tier: p.tier, name: p.name, target: p.target }]));
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* private window: decisions last for this visit only */ }
  try { fetch('http://127.0.0.1:8765/approvals', { method: 'POST', body: JSON.stringify(d) }).then(() => { window.AP_LIVE = d; }, () => {}); } catch (e) {}
}
function decision(p, d) {
  const x = d.items[p.id];
  if (!x || !x.status) return { status: 'pending', draft: x && x.draft, pick: x && x.draftPick };
  if ((x.v || 1) < p.v) return { status: 'revised', prev: x, draft: x.draft, pick: x.draftPick };
  return x;
}

/* ------------------------------------------------------------------ shared bits */
let C = {};                                       // context for the render in progress
const team = id => Dt.team(id);
// team colours come from the sheet's roles (Foundations › Team colour roles): ink for small text, mark for bars and big numbers
const ink = tm => (App.teamRoles(tm) || {}).ink || App.onWhite(tm.color);
const mark = tm => (App.teamRoles(tm) || {}).mark || App.onWhite(tm.color);
const recOf = tid => { const r = C.st.all.find(x => x.tid === tid); return r ? `${r.w}-${r.l}${r.tie ? '-' + r.tie : ''}` : ''; };
const net = g => esc((g.tv || [])[0] || 'TBD');
const when = g => fmt.time(g.ts);
const sep = '<i class="ap-sep"></i>';
const phone = (route, extra = '') => `<div class="ds-phone ap-phone"><iframe loading="lazy" src="index.html?frame&moment=${C.state.moment}&team=${C.state.team}&theme=${C.state.theme}${extra}#/${route}" title="Current"></iframe></div>`;
const none = msg => `<div class="ap-none">${msg}</div>`;
const wl = (n1, n2) => `<span class="ap-wl">${S(icon('play', 'xs fill'))}${n1 != null ? `<b>${n1}</b>` : ''}${S(icon('headphones', 'xs'))}${n2 != null ? `<b>${n2}</b>` : ''}</span>`;
function divRows(tid) {
  const tm = team(tid); return (C.st.div[`${tm.conf} ${tm.div}`] || []).slice().sort((a, b) => b.pct - a.pct || b.diff - a.diff);
}
function divPlace(tid) {
  const tm = team(tid), k = divRows(tid).findIndex(r => r.tid === tid) + 1;
  return k ? `${fmt.ord(k)} in ${tm.conf} ${tm.div}` : `${tm.conf} ${tm.div}`;
}
function teamLeaders(tid, s) {
  const tot = Object.values(Dt.seasonTotals(s) || {}).filter(L => L.tid === tid);
  const top = (cat, k) => tot.filter(L => L.cats[cat] && L.cats[cat][k]).sort((a, b) => b.cats[cat][k] - a.cats[cat][k])[0];
  const out = [];
  const qb = top('passing', 'passingYards'), rb = top('rushing', 'rushingYards'), wr = top('receiving', 'receivingYards');
  if (qb) { const c = qb.cats.passing; out.push({ L: qb, k: 'Passing yards', v: fmt.n(c.passingYards), foot: [['CP%', fmt.n(c.cmpPct, 1)], ['TD', c.passingTouchdowns || 0], ['INT', c.interceptions || 0]] }); }
  if (rb) { const c = rb.cats.rushing; out.push({ L: rb, k: 'Rushing yards', v: fmt.n(c.rushingYards), foot: [['ATT', c.rushingAttempts || 0], ['TD', c.rushingTouchdowns || 0], ['AVG', fmt.n(c.ypc || 0, 1)]] }); }
  if (wr) { const c = wr.cats.receiving; out.push({ L: wr, k: 'Receiving yards', v: fmt.n(c.receivingYards), foot: [['REC', c.receptions || 0], ['TD', c.receivingTouchdowns || 0], ['LONG', c.longReception || '—']] }); }
  return out;
}

const GP = () => App.gameParts || {};
const clamp = x => Math.max(0, Math.min(100, x));

/* ------------------------------------------------------------------ built from approvals (live in the app now) */
const BUILT = [
  { id: 'gc-primary', name: 'Game hero: official primary colours', at: '2026-11-10', where: 'game.js heroSet / mini hero glow · every team glows in its official primary (no swap to the second colour for dark teams)' },
  { id: 'gc-video-scroll', name: 'Game video scrolls with the page', at: '2026-11-10', where: '.gc-player no longer sticky; tabs pin straight under the header' },
  { id: 'side-gutters', name: 'One 16px gutter', at: '2026-11-10', where: '16px from the screen edge and 16px inside cards (forward.css); Teams leaders card back on the gutter' },
  { id: 'head-profile', name: 'Header: profile icon', at: '2026-11-10', where: 'ui.js headRight/avatar · Search · Games · Profile (NFL Avatar icon) on every tab root, no notification dots' },
  { id: 'search-timemachine', name: 'Time machine in Search', at: '2026-11-10', where: 'home.js searchIdle · the You page Time machine row at the top of Search' },
  { id: 'live-data', name: 'Live scores and stats', at: '2026-11-10', where: 'app/live.js · Right now is the real now: ESPN scoreboard + game summaries top up the snapshot (20s while a game is live, else 5 min and on focus); the time machine still replays any past moment' },
  { id: 'color-official', name: 'Team colours: official primary', at: '2026-11-10', where: 'core.js inkPv/whiteOn · white text sits on each team\'s official primary everywhere, heroes included (your call: official colours over contrast)' },
  { id: 'team-tiles', name: 'Team tiles', at: '2026-10-28', where: 'UI.teamTile() · the "All 32" sheet, onboarding "Who\'s your team?" and its rivals, You › Follow another team', spec: 'team-tiles' },
  { id: 'standings', name: 'Standings table', at: '2026-10-28', where: 'UI.stTeam() · .st-card · tr.me · the team page division card and every Standings table', spec: 'standings' },
  { id: 'mini-games', name: 'Mini games', at: '2026-10-28', where: 'App.miniGames.strip() · profile() · card() · row() · the Home strip and the Mini games hub (Gridiron Slate added)', spec: 'mini-games' },
  { id: 'tabs', name: 'Tabs', at: '2026-10-29', where: '.tabs · Display C italic caps, 15px; 13px inside cards and sheets (.tabs.sm) · team, player, game and stats pages', spec: 'tabs' },
  { id: 'sec-head', name: 'Section head', at: '2026-10-29', where: 'UI.secHead(title, more, go, sub) · the optional description line', spec: 'sec-head' },
  { id: 'type-roles', name: 'Type roles', at: '2026-10-29', where: '.t-* role classes · .h1 .h2 .h3 .h4 .meta .tiny .eyebrow now point at roles · kickoff lines are Meta, not Display', spec: 'type-roles' },
  { id: 'team-colors', name: 'Team colour roles', at: '2026-10-29', where: 'App.teamRoles() · App.teamFill() · --tm-mark --tm-ink --tm-tint --tm-fill · the accent colour, avatars, team chips and RedZone rows', spec: 'color-team-roles' },
  { id: 'status-colors', name: 'Status colours', at: '2026-10-29', where: '--status-* tokens (solid, soft, ink) · --live --win --loss --warn now point at them · --plus #004FFF · --plus-g', spec: 'color-signal' },
  { id: 'pills', name: 'Status pills (option B, Stats caps)', at: '2026-10-29', where: '.badge · soft in lists, .solid on pictures · Live always solid with its dot · NFL+ tier tags with the logo', spec: 'badges' },
  { id: 'media', name: 'Media overlays', at: '2026-10-29', where: 'UI.videoCard · Watch cards · .thumb .play / .dur · UI.plusTab() corner tab · .thumb-prog', spec: 'video' },
  { id: 'team-hero', name: 'Team hero', at: '2026-10-29', where: 'teamParts.hero() · .tm-hero2 · record in Display L, Shop and Tickets, the next game as a card inside', spec: 'team-hero' },
  { id: 'injury-row', name: 'Injury row', at: '2026-10-29', where: 'teamParts.injuries() · .inj · team switch on the segmented control, soft status pills', spec: 'injuries' },
  { id: 'drive', name: 'Drive summary', at: '2026-10-29', where: 'gameParts.playsTab() · .dr2 · small tabs, quarter chips, plays on the team Mark edge', spec: 'drive-summary' },
  { id: 'game-info', name: 'Game info', at: '2026-10-29', where: 'gameParts.infoCard() · .gi2 · stadium and city lead', spec: 'game-info' },
  { id: 'countdown', name: 'RedZone card', at: '2026-10-29', where: 'UI.rzCard() · .rzc2 · Live by the logo, countdown off the air', spec: 'rz-card' },
  { id: 'game-card', name: 'Game card', at: '2026-10-29', where: 'UI.gameCard() · UI.yardTrack() (.yt) · team Mark edge, Display S names, records only before and after', spec: 'game-card' },
  { id: 'video-card', name: 'Featured video', at: '2026-10-29', where: 'UI.videoFeature() · leads the Home Watch rail, on the media atoms', spec: 'video-feature' },
  { id: 'h2h', name: 'Season at a glance', at: '2026-10-29', where: 'gameParts.glanceCard() · numbers and bars in each team\'s Mark', spec: 'glance' },
  { id: 'streams', name: 'Watch & listen rows', at: '2026-10-29', where: 'gameParts.wlRow() · the Where to watch sheet', spec: 'watch-rows' },
  { id: 'leader-card', name: 'Game leaders', at: '2026-10-29', where: 'gameParts.leadersCard() · .ldr · mirrored, yards in fixed slots with YDS under them', spec: 'leaders' },
  { id: 'controls', name: 'Controls (option A, Sans)', at: '2026-10-29', where: '.btn sizes L 48 · M 40 · S 32, squared · .seg, .pill-tabs and .chip in the same family · the NFL+ logo on every upsell button (UI.plusLogo)', spec: 'btn' },
  { id: 'you-header', name: 'Fan card', at: '2026-10-29', where: 'fanCard() on You · .fc · team gradient, level ladder, favourite player, stub, fan rank and next badge' },
  { id: 'rankings', name: 'Team rankings', at: '2026-10-29', where: 'teamParts.rankList() · rankTop() on the team Stats tab · .rk · the rank leads in the team\'s Mark, top three as tiles' },
  { id: 'a-logo', name: 'Team logo (light logo on colour)', at: '2026-10-30', where: 'UI.logo() · .logo XS 16 · S 24 · M 32 · L 48 · XL 72, no shadows · atoms.css' },
  { id: 'a-helmet', name: 'Helmet', at: '2026-10-30', where: '.helmet one contact shadow · .helmet.s / .m / .l (64 / 120 / 180)' },
  { id: 'a-avatar', name: 'Avatar', at: '2026-10-30', where: '.av S 24 · M 32 · L 44 · header, Community and watch-party avatars share it, 2 px surface ring' },
  { id: 'a-icon-btn', name: 'Icon button (bare)', at: '2026-10-30', where: '.icon-btn 40 px, 24 px icon, squared press state · squared black 60% on pictures · 8 px Live dot' },
  { id: 'a-toggle', name: 'Toggle (round, Positive)', at: '2026-10-30', where: 'UI.toggle() · .toggle.on in Positive green' },
  { id: 'a-chips', name: 'Chips', at: '2026-10-30', where: 'the ten round chips (team switcher, Home stage links, article tags, bye teams, season picker, onboarding, time-machine scenes, video mode) are the squared .chip; Play and Score calls are .btn.sm' },
  { id: 'a-tags', name: 'Label pills', at: '2026-10-30', where: 'mini-game tag, Home stage flag, Kickoff in, Ball, Red zone, onboarding reasons take the .badge shape and face · key-moment length = video length' },
  { id: 'a-cleanup', name: 'Clean-up: old Live pill and CTA rules', at: '2026-10-30', where: 'deleted the Display .badge.live rule and the 54 px round .btn.cta rules; .btn.cta is only a colour (RedZone red)' },
  { id: 'a-stat-tile', name: 'Stat tile (Display number)', at: '2026-10-30', where: 'UI.statTile() · .stat-tile on the surface, Display L number, Meta label and sub line' },
  { id: 'a-kv', name: 'Key and value list', at: '2026-10-30', where: 'UI.kv() · 44 px rows with hairlines, Body key, Title S value' },
  { id: 'a-row', name: 'List row', at: '2026-10-30', where: 'UI.row() · .row 56 px, Title S over Meta · inbox unread is a Live dot, not a heavier font' },
  { id: 'a-term', name: 'Glossary term and tip', at: '2026-10-30', where: 'UI.term() dotted Info underline · UI.learnTip() on the Info soft surface, no border' },
  { id: 'a-pr-move', name: 'Ranking move (soft label)', at: '2026-10-30', where: 'UI.prMove() · a soft .badge, Positive or Negative, with the up and down chevrons' },
  { id: 'a-empty', name: 'Empty and loading (skeleton)', at: '2026-10-30', where: 'UI.empty() Title + Body S · UI.loading() and the first paint are skeleton rows' },
  { id: 'a-lock', name: 'NFL+ tag and lock note', at: '2026-10-30', where: 'UI.lockNote() leads with the NFL+ logo on Info soft, small button · Free and TV tags are soft .badge labels' },
  { id: 'a-follow', name: 'Follow button', at: '2026-10-30', where: 'UI.followBtn() · Follow primary; Following and Your team secondary, the star in the team primary' },
  { id: 'a-meter', name: 'Meter', at: '2026-10-30', where: '.meter, compare bars, glance bars, rank meter and fan pulse are one 6 px bar, radius 3 · video progress 3 px in NFL+ blue' },
  { id: 'type-content-roles', name: 'Text roles (12 picks)', at: '2026-10-30', where: 'app/css/roles.css + app/roles.js, generated from the crawl by _build/roles.mjs · tricode, score, team name and initials in Display italic; record Stats medium; clock and down & distance Stats bold caps; date and kickoff time Sans medium; player name and button label Sans bold; stat number Stats bold; eyebrow Sans bold caps. Big hero numbers stay Display (moment numbers). Inside a control, text is the control label.' },
  { id: 'a-headshot', name: 'Headshot initials (v2)', at: '2026-10-31', where: '.hs-fallback in atoms.css · Display C italic caps at 40% of the disc, optically centred' },
  { id: 'a-reactions', name: 'Reaction pills (as they were)', at: '2026-10-31', where: 'Game React tab, watch party, squad chat · the original round pills with emoji, kept by your choice (an exception to no-emoji)' },
  { id: 'type-page-title', name: 'Page title', at: '2026-10-31', where: 'every page header (.phead-title) · Display C italic caps, locked by roles.css' },
  { id: 'ticker', name: 'Live score ticker', at: '2026-11-02', where: 'Home, top of the sheet · L5 status over two L1 lines; All scores a squared small button' },
  { id: 'game-row', name: 'Compact game row', at: '2026-11-02', where: 'team schedules · logo M32, opponent in Display, soft W/L/T badge and Display score' },
  { id: 'week-strip', name: 'Week strip + season picker', at: '2026-11-02', where: 'Scores · the season a squared chip (also Standings and Playoffs); dates in Meta; live week the Live dot' },
  { id: 'news-card', name: 'News card', at: '2026-11-02', where: 'UI.newsCard · 56 px row with a squared thumb; card with Eyebrow, logos XS, Title, Meta' },
  { id: 'video-card', name: 'Video card', at: '2026-11-05', where: 'UI.videoCard and the Watch rails · Title S, Meta; NFL+ tab trimmed to 36 × 38 with a 15 px logo' },
  { id: 'continue-watching', name: 'Continue watching', at: '2026-11-02', where: 'Watch, first rail · the approved progress bar, time left in the Meta line' },
  { id: 'plan-card', name: 'Plan card', at: '2026-11-02', where: 'Plans · Display price, soft Your plan badge, focus outlined in NFL+ blue' },
  { id: 'upsell-sheet', name: 'Upsell sheet', at: '2026-11-02', where: 'tapping anything locked · lock note, Eyebrow + Meta, one squared Not now' },
  { id: 'where-resolver', name: 'Where-to-watch header', at: '2026-11-02', where: 'Where to watch · row atom with check or info mark, services as soft badges' },
  { id: 'team-compare', name: 'Team comparison rows', at: '2026-11-02', where: 'game Stats > Team and the Preview record card · the glance card (glHead / glRow); cmpRow deleted' },
  { id: 'game-actions', name: 'Game action strip', at: '2026-11-05', where: 'under the game hero · one inline row that scrolls sideways, main action first, squared small buttons' },
  { id: 'predict', name: 'Predict tab', at: '2026-11-02', where: 'game Fans > Predict · squared cards, 6 px meter in each primary, share as L4, your side outlined' },
  { id: 'react-tab', name: 'React tab', at: '2026-11-02', where: 'game Fans > React · pulse meters in each primary, clock over Title S, squared quick takes, one pill style' },
  { id: 'recap', name: 'Game recap', at: '2026-11-02', where: 'game Recap · L1 line score, Display total, loser at 60%; scoring rows (also the no-play-by-play view)' },
  { id: 'video-player', name: 'Video player + PiP', at: '2026-11-02', where: 'as it was (approved as is)' },
  { id: 'player-row', name: 'Team / player row', at: '2026-11-02', where: 'UI.teamRow (L2) and UI.playerRow (L3, injury badge right), everywhere' },
  { id: 'roster', name: 'Roster', at: '2026-11-05', where: 'team Roster · Stats bold jersey column, L3 line, injury badge right; the depth chart stays: flat field in your colour, then L3 starters with 2nd and 3rd' },
  { id: 'team-switcher', name: 'Team switcher', at: '2026-11-02', where: 'as it was (approved as is)' },
  { id: 'team-pr-card', name: 'Power ranking card', at: '2026-11-02', where: 'team Overview · record in the record face' },
  { id: 'team-leaders', name: 'Team leaders', at: '2026-11-02', where: 'team Overview · the game leaders card, one team; the rail is gone' },
  { id: 'team-moves', name: 'Transactions row', at: '2026-11-02', where: 'Transactions and team moves · one row (App.txRow): logo or kind tile, Body, Meta, headshot' },
  { id: 'cap-table', name: 'Salary cap', at: '2026-11-02', where: 'Contracts & cap and team cap · L3 lines, salaries as L4, small buttons' },
  { id: 'leaders-board', name: 'League leaders', at: '2026-11-02', where: 'Leaders · season and position as select chips, one card list with rank, L3, L4' },
  { id: 'compare', name: 'Player/team compare', at: '2026-11-02', where: 'Compare · squared pickers, Sans caps vs, L3 sides, meters in each primary, loser in text 2' },
  { id: 'poll-card', name: 'Poll card', at: '2026-11-02', where: 'Fan polls and Community · logos or headshots leading, 6 px meters in the team primary' },
  { id: 'community-fan', name: 'Community fan row', at: '2026-11-02', where: 'Community top · 56 px summary row to the You fan card' },
  { id: 'squad-chat', name: 'Squad chat', at: '2026-11-02', where: 'squad Huddle · game updates as L5 + L1 cards, name over time, Meta system notes' },
  { id: 'stadium-cards', name: 'Stadium cards + Your stadiums', at: '2026-11-02', where: 'Stadiums (logo on a white plate, Stats capacity) and the passport, now Your stadiums' },
  { id: 'draft-pick', name: 'Draft pick row/card', at: '2026-11-02', where: 'Draft · Round 1 · Pick 6 over the Traded pill, position meters in your primary' },
  { id: 'bracket', name: 'Playoff bracket + picture', at: '2026-11-02', where: 'Playoffs · L2 banner, seed rows in your tint, bracket tiles as L5 + L1 with seeds' },
  { id: 'multiview-tile', name: 'Multiview tile', at: '2026-11-02', where: 'Multiview · L5 pill, L1 lines, soft Red zone pill, no outline' },
  { id: 'settings-row', name: 'Settings row', at: '2026-11-02', where: 'You and settings · one neutral icon tile, value in Meta' },
  { id: 'search', name: 'Search', at: '2026-11-05', where: 'Search and Explore · 48 px field, squared tiles, L2 team rows with one Follow control (icon in the label colour), L3 players, L4 answers' },
  { id: 'inbox', name: 'Inbox row', at: '2026-11-05', where: 'Notifications · Eyebrow days, logos only for team items, two-line titles; no unread dot, lead top-aligned on a 16 px inset' },
  { id: 'scores-item', name: 'Scores item', at: '2026-11-05', where: 'Scores · yard track without end labels, Sans medium down, squared TV button' },
  { id: 'bye-row', name: 'Bye row', at: '2026-11-05', where: 'Scores · Eyebrow "On bye", logo + tricode chips' },
  { id: 'news-list', name: 'News list + article', at: '2026-11-05', where: 'Article · logo + nickname tag chips, Eyebrow kind over the headline' },
  { id: 'poster', name: 'Watch poster', at: '2026-11-05', where: 'Watch rails · team shows on the team gradient, logo top left, NFL+ tab when locked, Title S + Meta under' },
  { id: 'audio-sheet', name: 'Audio sheet', at: '2026-11-05', where: 'Listen sheet · wave in the feed team colour, L5, squared play, delay as an L4 pair' },
  { id: 'rz-panel', name: 'Red zone panel', at: '2026-11-05', where: 'Red zone panel · Sans count, L3 players with yards out as L4' },
  { id: 'now-card', name: 'Now card', at: '2026-11-05', where: 'Game Live · L2 with the ball, Sans medium down + play/drive seg, drive as three L4 pairs' },
  { id: 'wp-card', name: 'Win probability card', at: '2026-11-05', where: 'Game · Live / Final badge' },
  { id: 'play-row', name: 'Play row', at: '2026-11-05', where: 'Live feed · reaction pills (the old play row is deleted)' },
  { id: 'catch-up', name: 'Catch up', at: '2026-11-05', where: 'Game Live catch-up · Eyebrow + L5, icon in the team colour, surname bold' },
  { id: 'box-score', name: 'Box score', at: '2026-11-05', where: 'Game Box · Eyebrow table heads, L3 first column, team seg in each team colour' },
  { id: 'pregame-scene', name: 'Pregame scene', at: '2026-11-05', where: 'Game Preview · countdown, meter and timeline in the home colour, inactives with logo + tricode' },
  { id: 'celebrate', name: 'Celebration', at: '2026-11-05', where: 'Touchdown and win moments · flat team primary, no stripes' },
  { id: 'milestone', name: 'Milestone', at: '2026-11-05', where: 'Milestone moments · the team gradient, light stat tiles' },
  { id: 'pr-board', name: 'Power rankings', at: '2026-11-05', where: 'Stats Power rankings · rank, L2 with record, move; your team in a primary edge' },
  { id: 'pickem', name: 'Pick\'em', at: '2026-11-05', where: 'Community Pick\'em · side-by-side team tiles, L5 header, fan split footer' },
  { id: 'ticket-picker', name: 'Ticket picker', at: '2026-11-05', where: 'Tickets · L2 header, seating chart in the home colour, L4 price, squared stepper, all-in total' },
  { id: 'shop', name: 'Shop + jersey', at: '2026-11-05', where: 'Shop · white away jersey on the team gradient, flat home jersey in the builder, logo + Display tiles' },
  { id: 'mini-bug', name: 'Header mini game bug', at: '2026-11-05', where: 'Live mini bar · two stacked L1 lines, L5 Live with the clock, Sans medium down, 64 px' },
  { id: 'learn-diagrams', name: 'Learn diagrams', at: '2026-11-05', where: 'Learn · the shared field renderer (app/field.js), HTML scorebug with callouts' },
  { id: 'hero-status', name: 'Matchup hero · status', at: '2026-11-05', where: 'UI.heroStatus in every hero (Home, Watch, game page): Live badge then the clock in Stats bold caps; the date in Sans medium with Kickoff in; Final in Stats caps (option b)' },
  { id: 'hero-surface', name: 'Matchup hero · surface', at: '2026-11-05', where: 'every matchup surface (Home and Watch hero .mx-bg, game page hero .mu-bg, watch party header): away gradient into home gradient across the middle 70% in oklab, under the shared --scrim (black 35%, also on the score bug); the slash and the giant outlined tricodes are gone (v2)' },
  { id: 'hero-score', name: 'Matchup hero · score', at: '2026-11-05', where: 'score over the team name at each edge on every hero: Home and Watch as before; the game page hero now has the status on one line on top and the score over the tricode beside each helmet. A final\'s losing score and name dim to 60%, the record stays full white for AA (option a)' },
  { id: 'hero-names', name: 'Matchup hero · team names and records', at: '2026-11-05', where: 'Home and Watch hero: the full name at one fixed 24 px for every team (no more fit-to-width sizes), the record under it in Stats medium; game page hero: the tricode at 17 px, the record at 12.5 px Stats medium; records full white (option a)' },
  { id: 'app-chrome', name: 'App chrome · moment bar and tab bar', at: '2026-11-05', where: 'iOS keeps the Liquid Glass capsule; Android is a flat docked bar with a Live-red dot under the current tab (labels as on iOS); the moment bar is squared (--r-sm) with the date in Sans medium; the Scores live count in Sans bold (v2)' },
  { id: 'hero-helmets', name: 'Matchup hero · helmets', at: '2026-11-05', where: 'UI.matchup (Home, Watch) 152 px and the game page hero 64 px: face-off on one baseline, fully inside, never cropped (option a)' },
  { id: 'field-viz', name: 'Field', at: '2026-11-05', where: 'app/field.js and the Live drive chart (fieldviz.js): short field, flat turf, lines every 10, no numbers, team end zones with no text, white-dot ball' },
  { id: 'score-bug', name: 'Score bug', at: '2026-11-05', where: 'game page, pins on scroll (game.js pinBug): soft away-to-home blend under a scrim, L1 sides, Live badge and down in the middle' },
  { id: 'key-moments', name: 'Key moments', at: '2026-11-05', where: 'game Live and Recap tabs · slider of moment cards (option b, no picture): team-colour edge, the play, the score after it, play button; 1 of N and dots' },
  { id: 'watch-game-tile', name: 'Watch game tile', at: '2026-11-05', where: 'Watch, Games rail · option b: a 4 × 20 team-colour mark leads each L1 line; L5 status, soft badge foot' },
  { id: 'sheet-toast', name: 'Sheets and toasts (as they were)', at: '2026-11-05', where: 'App.sheet() and App.toast() · kept as they are by your choice ("current is the best")' },
  { id: 'home-pick-hero', name: 'Pick-a-team hero (option C)', at: '2026-11-05', where: 'Home with no team · search, a swipeable line of helmets (tap to follow), Make it mine; NFL navy is now the --nfl-a/--nfl-b token' },
  { id: 'home-moment-heroes', name: 'Draft, free agency and camp (option B)', at: '2026-11-05', where: 'the moment takes the game slot in your stage (leagueMoment + momentBody in home.js); with no team it is a navy card under the pick-a-team hero' },
  { id: 'home-sotd', name: 'Stat of the day (option A)', at: '2026-11-05', where: 'Home sheet · the number on the leader\'s team gradient, the next four as a ladder on glass (.sotd in molecules.css)' },
  { id: 'home-stage', name: 'Home fan stage (v5)', at: '2026-11-05', where: 'fanHeader: gradient top to bottom, no glow or white-tint boxes; next game with a running countdown; season logos with W/L marks (opens on this week); tale of the tape vs the next opponent' },
  { id: 'home-trivia', name: 'Daily trivia (v2, option B)', at: '2026-11-05', where: 'Home sheet · Display question, two-by-two squared answers, logo beside the name (.trv)' },
  { id: 'home-stakes', name: 'What\'s at stake (option A)', at: '2026-11-05', where: 'Home sheet · lead, seed and power ranking, the division with your row in your colour, rival watch (.stk; it was .sk, the skeleton)' },
  { id: 'home-players', name: 'Your players (option A)', at: '2026-11-05', where: 'Home sheet · player lines, stat line in Stats, fantasy in the Meta line (.pl-list .pl-row)' },
  { id: 'home-other-teams', name: 'Your other teams (option B)', at: '2026-11-05', where: 'Home sheet · one row per team: logo, Display name, record, the game on the right (.ot-row)' },
  { id: 'home-recaps', name: 'Recaps v3 (option A)', at: '2026-11-06', where: 'Home sheet · L1 score lockup at 17px, hairline, then the story (.rcp)' },
  { id: 'home-numbers', name: 'By the numbers (option B)', at: '2026-11-06', where: 'Home sheet · rank tiles: rank in Display, value in Stats (.bn-g .bn-t)' },
  { id: 'home-fresh', name: 'Watch it fresh (option A)', at: '2026-11-06', where: 'Home sheet · Shield on pill, logo pair, Watch per row (.fr-pill .fr-pair)' },
  { id: 'home-newfan', name: 'New to football? (option B)', at: '2026-11-06', where: 'Home sheet · featured lesson in NFL blue, rows, words you will hear (.nf-f)' },
  { id: 'home-inside', name: 'Inside the team v2 (option A)', at: '2026-11-06', where: 'Home sheet · injury report then moves, status in the badge pill (.in-list .in-h .in-mv)' },
  { id: 'weekly-recap', name: 'Weekly recap story v2 (option B)', at: '2026-11-06', where: 'Recap story · headline on team colour, data on a white panel; slides about other teams in slate (.wr.gen)' },
  { id: 'home-weekend', name: 'Your weekend v5 (option B)', at: '2026-11-06', where: 'Home sheet · by day, time or Live over the clock, logos, matchup, where to watch (.wk-*); also Kickoffs, your time' },
  { id: 'player-hero', name: 'Player page: hero (option B)', at: '2026-11-06', where: 'player/:id · band on team colour, white card with bio and squared buttons (.ph-band .ph-card)' },
  { id: 'player-season', name: 'Player page: season line (option B)', at: '2026-11-06', where: 'player/:id Overview · lead stat, three small, fantasy footnote (.ps-lead .ps-row)' },
  { id: 'player-advanced', name: 'Player page: advanced (option A)', at: '2026-11-06', where: 'player/:id Advanced · lead number, small tiles, direction meter rows (.ad-g .ad-dir)' },
  { id: 'player-contract', name: 'Player page: contract (option A)', at: '2026-11-06', where: 'player/:id Contract · lead salary, three small tiles, team list with his row marked (.ct-me)' },
  { id: 'team-games', name: 'Team page: games (option A)', at: '2026-11-06', where: 'team/:id Overview · UI.gameRow() schedule rows for live, next and last' },
  { id: 'team-history', name: 'Team page: season by season and rivalries (option A)', at: '2026-11-06', where: 'team/:id History · year in Display, record in Stats, result pill; rivals with a series pill (.hs-r .hs-rv)' },
  { id: 'player-games', name: 'Player page: games (v4 A)', at: '2026-11-06', where: 'player/:id Overview · schedule game row with the logo inline, his stat line as the last game\'s second line (UI.gameRow inline, .pg-line)' },
  { id: 'team-glance', name: 'Team page: season at a glance (v2 B)', at: '2026-11-06', where: 'team/:id Overview · points per game as the lead with its NFL rank, three small tiles (.ps-lead .ps-row)' },
  { id: 'team-schedule', name: 'Team page: schedule (v2 B)', at: '2026-11-06', where: 'team/:id Schedule · Scores season chip + sheet, Preseason toggle, record lead with home / away (.st-bar .sc-season)' },
  { id: 'team-cap', name: 'Team page: contracts (v2 A)', at: '2026-11-06', where: 'team/:id Contracts · lead number, stacked bar in stepped team primary with a key (.cp-bar .cp-key)' },
  { id: 'team-draft', name: 'Team page: draft classes (option B)', at: '2026-11-06', where: 'team/:id More, Draft · season chip picks the class (state.dy, shared tm-season-sheet), pick number column + one badge (.dr-r .dr-n)' },
  { id: 'player-tables', name: 'Player page: stat tables (v5 A)', at: '2026-11-06', where: 'player/:id Game log, Career, Splits · one .tc card: season chip / small tabs, ink bars, pinned first column + fade, 6 rows + Show all, Stats Regular with a bold key column' },
  { id: 'team-views', name: 'Team page: sub-tab picker (v2 B)', at: '2026-11-06', where: 'team/:id Roster, More · small tabs; every .tabs selected underline now 4 px app-wide' },
  { id: 'team-stadium', name: 'Team page: stadium (v2 A)', at: '2026-11-06', where: 'team/:id More, Stadium · Display caps name, surface / roof tiles, schedule game row, link rows (.sd-*)' },
  { id: 'team-stats', name: 'Team page: stat leaders (your call: one table with small tabs)', at: '2026-11-06', where: 'team/:id Stats · the .tc stat-table card with category tabs (tm-scat)' },
  { id: 'stats-pickers', name: 'Stats + Leaders pickers (option A)', at: '2026-11-07', where: 'Stats · one season chip + sheet; Leaders · categories as small tabs, season and position as season chips' },
  { id: 'records-tabs', name: 'Record book switcher (option A)', at: '2026-11-07', where: 'Records · small tabs (Career / Single season / Single game); the segmented control is retired app-wide' },
  { id: 'sb-filter', name: 'Super Bowls filter (option B)', at: '2026-11-07', where: 'Super Bowls · squared season-chip row, logo + tricode, ink when picked (.sb-chips)' },
  { id: 'history-champ', name: 'History: reigning champions (option B)', at: '2026-11-07', where: 'History · champion gradient 180° (full at 42%), Display caps name, squared white Relive Super Bowl button (.hx-champ)' },
  { id: 'hub-tiles', name: 'Hub tiles (option B)', at: '2026-11-07', where: 'Stats shortcuts as list rows with an icon tile and chevron; Explore keeps its tiles' },
  { id: 'you-follow', name: 'You: team + follow rows (option B)', at: '2026-11-07', where: 'You · Sans team names, Change in the section head; Teams to follow · squared + Follow chip, ink Following (.yf-chip, .r-sans)' },
  { id: 'empty-state', name: 'Empty states (option B)', at: '2026-11-07', where: 'UI.empty · centred, 56px squared icon tile, squared button; Wallet adds Next home game' },
  { id: 'learn-hero', name: 'Learn: Football 101 (option A)', at: '2026-11-07', where: 'Learn · on the page, one ladder segment per lesson, squared Start' },
  { id: 'inbox-rows', name: 'Notifications rows (option A)', at: '2026-11-07', where: 'Inbox · 40px squared lead tile, time beside the title, dot on rows that were unread' },
  { id: 'ob-welcome', name: 'Onboarding: welcome (v7)', at: '2026-11-07', where: 'Onboarding welcome · the original faded logo wall in three rows of 11/11/10 (no team twice), solid white copy, outline second button' },
  { id: 'channel-page', name: 'Channel page (option A)', at: '2026-11-07', where: 'NFL Channel / Network · blue 180° player, squared play, schedule rows with a time column, Live badge on the show on air' },
  { id: 'redzone-stats', name: 'RedZone: the day in numbers (option A)', at: '2026-11-07', where: 'RedZone · season-line tiles, only Inside the 20 gets the soft dark-red glow' },
  { id: 'ob-done', name: 'Onboarding: all set (option B)', at: '2026-11-07', where: 'Onboarding done · the You fan card, then your picks, then Open my NFL' },
  { id: 'icon-rows', name: 'Rows that repeat one icon (option B)', at: '2026-11-08', where: 'Hall of Fame (team logo per player), International (home team), Watch with fans (team) · the 40px squared lead tile' },
  { id: 'page-intro', name: 'Page intros (option A)', at: '2026-11-08', where: 'Hall of Fame, International, Stadiums, Watch with fans, Super Bowls · one Body line (.pg-intro), no card, bar or info box' },
  { id: 'franchise-hero', name: 'Franchise header (option A)', at: '2026-11-08', where: 'franchise/:id · full-width gradient 180° full at 42%, founding year + former names in the eyebrow, fan-card stat row' },
  { id: 'franchise-sb', name: 'Franchise Super Bowl rows (option B)', at: '2026-11-08', where: 'franchise/:id · sbRow(): numeral + year, both teams (winner bold), scores in Display, MVP as Meta' },
  { id: 'calendar-rows', name: 'League calendar rows (option B)', at: '2026-11-08', where: 'Calendar · past events in full text with Done as Meta, approx. as Meta, squared date tile, squared filter row' },
  { id: 'finder-filters', name: 'Stat finder filters (option A)', at: '2026-11-08', where: 'Stat finder · Stat / Position / Season / Team chips open sheets, More sheet for rookies + minimum games, suggestions as rows' },
  { id: 'table-mine', name: 'Tables: your row + sort (option A)', at: '2026-11-08', where: 'All .tbl tables · your team\'s team-colour edge (no fill), sorted header bold in the text colour, tricodes Sans bold' },
  { id: 'tickets-filter', name: 'Tickets team filter (option B)', at: '2026-11-08', where: 'Tickets · My teams + your teams as squared logo chips + All teams ▾ sheet; Stadiums filters as the squared row' },
  { id: 'stadium-list', name: 'Stadiums: shorter card (option A)', at: '2026-11-08', where: 'Stadiums · 16:7 photo card, logo beside the name' },
  { id: 'passport', name: 'Stadium passport (option B)', at: '2026-11-08', where: 'Tickets · Stadiums visited row opens Stadiums with Visited picked; #/passport redirects there; Explore + You link the same' },
  { id: 'promo-card', name: 'Team promo cards (option A)', at: '2026-11-08', where: 'Shop jersey builder + Watch with fans watch party · promo(): gradient 180°, Display caps title, squared white button, art right' },
  { id: 'lesson-page', name: 'Learn: lesson page (option A)', at: '2026-11-08', where: 'learn/:id · section heads Display caps, point values Display in the text colour in a 56px column' },
  { id: 'sb-rows', name: 'Super Bowls: game rows (v3 option B)', at: '2026-11-08', where: '#/super-bowls + franchise · shared sbRow(): 30px numeral + year, winner bold, scores Display, MVP Meta, winner\'s team-colour edge' },
  { id: 'ranked-rows', name: 'Ranked team rows (v3 option A)', at: '2026-11-08', where: 'UI.rankRow(): History titles + Power rankings · rank Sans, team name Sans, value Display, move as Meta arrow text, your team\'s edge' },
  { id: 'answer-rows', name: 'Trivia + poll answers (option A)', at: '2026-11-08', where: 'Trivia + Polls · onboarding quiz rows with the squared check, % as Meta after voting, team options with the logo tile + short name' },
  { id: 'grade-picker', name: 'Fan grades (option A)', at: '2026-11-08', where: 'Grades · franchise header, five squared grade buttons ink when picked, fans\' grade in Display' },
  { id: 'pickem-game', name: 'Pick\'em: a game (option B)', at: '2026-11-08', where: 'Pick\'em · two squared outline team buttons, ink outline when picked, Sans names, Display scores, no fading' },
  { id: 'summary-stats', name: 'Summary numbers (option A)', at: '2026-11-08', where: 'UI.statRow(): Pick\'em, Free agency recap, Catch me up · Display numbers, caps labels, dividers, in a white card' },
  { id: 'multi-filter', name: 'Stacked filter rows (option A)', at: '2026-11-08', where: 'Transactions + Free agency · type as small tabs, team and position as dropdown chips opening sheets' },
  { id: 'podcast-rows', name: 'Podcasts (option B)', at: '2026-11-08', where: 'Podcasts · play in the 40px squared lead tile, the squared follow chip (Following when on)' },
  { id: 'catchup-rows', name: 'Catch me up rows (option A)', at: '2026-11-08', where: 'Catch me up · headlines as News list rows, results as the game row, time once, no section counts' },
  { id: 'cap-card', name: 'Contracts & cap payroll (option B)', at: '2026-11-08', where: 'Cap · team dropdown chip, payroll on the franchise-header gradient with stat row (payroll, rank, contracts), players as a plain list, money Sans' },
  { id: 'fan-level', name: 'Community fan level (option A)', at: '2026-11-08', where: 'Community · link row to You: team logo tile, level · points, the fan-card ladder, chevron' },
  { id: 'tx-rows', name: 'Transactions rows (option B)', at: '2026-11-08', where: 'Transactions · team logo in the 40px tile, no headshot, date only in the section head, move clamps at 3 lines' },
  { id: 'hint-box', name: 'Grey hint boxes (option A)', at: '2026-11-08', where: 'every .notice (You, game Predict, box score, playoffs, player, home spoiler) and Live audio · one Body line in the text colour, no box, no icon' },
  { id: 'sub-tabs', name: 'A switcher inside a tab (option A)', at: '2026-11-08', where: 'Game Plays (All drives, Scoring + quarters in one squared chip row), Stats, Fans, box-score team, field view; Team page Roster and More views · the squared chip row' },
  { id: 'mock-draft', name: 'Mock draft (option A)', at: '2026-11-08', where: 'Mock draft · ladder progress, squared Pick chip, Sans team names, team-colour edge on your team, Reset as a squared chip' },
  { id: 'trip-timeline', name: 'Trip timeline (option A)', at: '2026-11-08', where: 'Road trip · franchise header in the home team colours with the stat row; times in a 72px Sans column' },
  { id: 'progress-ring', name: 'Progress rings (option A)', at: '2026-11-08', where: 'UI.ladder() for steps (mock draft), UI.bar() for shares (where-to-watch coverage, downloads); rings removed' },
  { id: 'all-teams', name: 'All teams grid (option B)', at: '2026-11-08', where: 'All teams · no corner badges, tiles open the team; the quiz is a link row with a 40px tile' },
  { id: 'replay-rows', name: 'Replays + Live audio rows (option A)', at: '2026-11-08', where: 'Replays · mode as small tabs, team and week as dropdown chips with sheets; both pages: two logos stacked in the 40px tile, lock inline in Meta, no gold or red text, no lock buttons' },
  { id: 'rule-sweep-1', name: 'Rule sweep 1 (approved rules applied)', at: '2026-11-08', where: 'Language + Time zone as squared-check rows; Where to watch services as the onboarding provider chips; Stadium page, Super Bowls team filter, Draft, Team schedule and Team stats "best in the NFL" as the stat row (capacity no longer truncates); Home What\'s at stake: team-colour edge, no fill, Sans names; Team More tab opens its first view; #/compare and #/watch-party guard unknown ids' },
  { id: 'player-sofar', name: 'Player: season so far (option A)', at: '2026-11-08', where: 'Player overview · one white card: lead stat big with its rank, the other three as the stat row (caps labels, dividers, rank as Meta)' },
  { id: 'article-tags', name: 'Article team tags (option A)', at: '2026-11-08', where: 'Article · squared team chips (logo + short name in Sans) after the story, not above the headline' },
  { id: 'team-hero-actions', name: 'Team page hero (v5, option B)', at: '2026-11-08', where: 'Team hero · today\'s layout kept; white text passes AA on all 32 (light colours deepened just enough: TEN CIN DEN CLE MIA CAR LAC); boxes tint away from the text; one type scale (city 12, name 40 for every team, record 40, lines 13, buttons 14); one left edge; helmet centred on name + record' },
  { id: 'apply-jersey', name: 'Jersey fabric: team page hero (option A)', at: '2026-11-08', where: 'Team page hero: the team colour as a dimpled jersey mesh with long diagonal folds and a soft wave rolling through (1.5x), drawn live on the GPU (app/fabric.js, App.fabric); near-black teams get a satin sheen; Reduce Motion holds one still frame. Not on Home' },
  { id: 'apply-player-num', name: 'Outline number in the player hero', at: '2026-11-08', where: 'Player hero: the jersey number as a fine see-through outline (0.9px, 35% white) cropped off the top right behind the headshot' },
  { id: 'build-faceoff', name: 'Leaders face-off: Game Center', at: '2026-11-09', where: 'Game Center Stats · passing / rushing / receiving leaders head to head, headshots on discs in each team\'s real colour' },
  { id: 'build-bars', name: 'Team stat bars: Game Center', at: '2026-11-09', where: 'Game Center Stats → Team · each stat as two bars in the teams\' real colours meeting in the middle (home uses its second colour if the two are too close); values in Stats, the leader bold' },
  { id: 'build-deck', name: 'Fanned live stack: Home', at: '2026-11-09', where: 'Home · top of the sheet, only when 2+ of your teams\' games are live: a fanned stack of the live games; tap opens Scores' },
  { id: 'build-trend', name: 'Game-by-game bars: player Game log', at: '2026-11-09', where: 'Player · Game log: one bar per game, played games hatched, the picked game (latest by default) in the real team colour with its value in Stats; a chip switches the stat' },
  { id: 'build-glow', name: 'Live glow: game header', at: '2026-11-09', where: 'Game · header while live: black, each team\'s real colour a soft glow from its own edge; near-black teams glow in their second colour' },
  { id: 'build-field', name: 'Drive field: Plays tab', at: '2026-11-09', where: 'Game · Plays: each drive header is the logo, a 58×19 field (goal in the team colour, start-to-end line, dot TD / ring FG / arrow punt / × turnover), then the result' },
  { id: 'watch-hero2', name: 'Watch hero: soft glow (v3 A)', at: '2026-11-09', where: 'Watch · top hero, live and before kickoff: black, each team\'s colour a soft glow from its own side behind its logo (too-dark colours glow in their second colour); scores and names in italic Display caps, clock, records and drive in Stats' },
  { id: 'home-hero-height', name: 'Home hero: taller team top, three short pages (v9 A)', at: '2026-11-09', where: 'Home · fanHeader → homeHero(): the team on the jersey fabric (helmet hanging off the right, record, division place, then the streak or conference place), then Next game, five games around this week and a neutral tale of the tape on the 700 tint; the pinned bar (.hh-mini) under the header on scroll' },
  { id: 'home-offseason-hero', name: 'Home hero in the offseason: pages per phase (v2 A)', at: '2026-11-09', where: 'Home · fanHeader → homeHero() in every league moment: the season top (last season\'s record), then pages built for the phase: Free agency (move counts, your moves, last season), Draft night (on the clock, your picks as tiles, last season), Summer and camp (Week 1 opener countdown, last season); the old tall offseason hero is gone' },
  { id: 'ob-continue', name: 'Onboarding: Continue button, ink then your team (option C)', at: '2026-11-09', where: 'onboarding.js paint() toggles .ob-picked · you.css: .ob-cta is ink (text on bg) until a team is picked, then --accent, the team colour' },
  { id: 'ob-alpha', name: 'Onboarding: team picker A to Z by city (option A)', at: '2026-11-09', where: 'onboarding.js grid() · all 32 in one grid by city, no division heads; the follow-more step uses the same order' },
  { id: 'ob-logos', name: 'Onboarding: welcome logos in full colour (option A)', at: '2026-11-09', where: 'you.css .ob-marq-row .logo · real colours at 35% opacity, no grayscale' },
  { id: 'home-pinbar-live', name: 'Home pinned bar: live score and clock (option A)', at: '2026-11-09', where: 'Home · hhMini(): while your game is live the pinned bar shows a Live badge, the score (yours first) and the quarter and clock, and opens the game; with the spoiler shield on, Score hidden' },
  { id: 'player-stat-bold', name: 'Player stat cards: no bold column (option A)', at: '2026-11-09', where: 'player.js stat cards (.tc) · every stat column the same weight, matching Team stats' },
  { id: 'team-stats', name: 'Stat tables: no bold key column (v4)', at: '2026-11-09', where: 'the .tc stat-table card (Team Stats, and the player stat cards that share it): the key column (Yds…) in the same weight as the others, every tab' },
  { id: 'build-stack', name: 'All 32: tricode tiles (v3 A)', at: '2026-11-09', where: 'Teams → All 32: the original logo grid; each white tile is the logo, the tricode in italic Display caps in ink (no city, no full name, so nothing cuts off), and the record' },
  { id: 'apply-player-fabric', name: 'Jersey fabric in the player hero', at: '2026-11-08', where: 'Player hero: the team-hero jersey fabric (same wave, 1.5x) behind the band, under the outline number and the headshot' },
  { id: 'apply-numbers', name: 'By the numbers: gradient rank tiles', at: '2026-11-08', where: 'Home · By the numbers (Stats fans): each rank tile is the team gradient (180deg, full colour by 42%) with its rank as a faint hairline outline; rank in Display, value in Stats, white text' },
  { id: 'redzone-ask', name: 'RedZone: the NFL+ ask (option B)', at: '2026-11-06', where: 'RedZone page · no red glow, the video stays clear, one lock note with See plans + Free preview (.rzh-note)' },
  { id: 'ob-choice', name: 'Onboarding: pick one (option A)', at: '2026-11-06', where: 'Onboarding level, plans, alerts, cities · 2px ink outline, squared ink check, no tint' },
  { id: 'ob-quiz', name: 'Onboarding: find-your-team questions (option A)', at: '2026-11-06', where: 'Onboarding quiz · answers as one system list, Back to all teams as a text link' },
  { id: 'ob-matches', name: 'Onboarding: your matches (option B)', at: '2026-11-06', where: 'Onboarding quiz result · team gradient 180°/42%, Display caps name, reasons as one line' },
  { id: 'ob-players', name: 'Onboarding: follow players (option A)', at: '2026-11-06', where: 'Onboarding players · squared 40px follow button, ink check once followed' },
  { id: 'ob-providers', name: 'Onboarding: what else you watch on (option A)', at: '2026-11-06', where: 'Onboarding how you watch · squared season chips, ink + check when picked' },
  { id: 'watch-offseason', name: 'Watch: hero with no games (option A)', at: '2026-11-06', where: 'Watch hero off-season · NFL blue 180°/42%, Display caps, white + outline buttons (.w-off)' },
  { id: 'watch-shortcuts', name: 'Watch: shortcuts (option B)', at: '2026-11-06', where: 'Watch · one row of squared .sc-season chips (.w-sc)' },
  { id: 'watch-channels', name: 'Watch: 24/7 channels (option A)', at: '2026-11-06', where: 'Watch · Live 24/7 list, a row per channel with progress, next show, squared play / lock (.w-ch)' },
  { id: 'watch-listen', name: 'Watch: listen live (option A)', at: '2026-11-06', where: 'Watch · Listen live uses gameTile(g, true) with a Listen foot' },
  { id: 'watch-locked', name: 'Watch: what NFL+ adds (option A)', at: '2026-11-06', where: 'Watch · one What NFL+ adds panel with one See plans; locked rails keep only their tier badge (.w-adds)' },
  { id: 'season-bye', name: 'Bye week: division watch (option B)', at: '2026-11-09', where: 'Home hero · statePages(): in a regular-season week your team has no game, page 1 is your division rivals\' games that week with when you\'re back; then Next game, Season and Tale of the tape stay (per your trade-deadline note)' },
  { id: 'season-race', name: 'Playoff race: standings slice (option B)', at: '2026-11-09', where: 'Home hero · statePages(): from Week 15, page 1 is five conference rows around you with the cut line above 8th and a Clinched tag; no Out/Eliminated label; then Next game, Season and Tale of the tape stay (per your trade-deadline note)' },
  { id: 'season-schedule', name: 'Schedule release: all 18 weeks (option B)', at: '2026-11-09', where: 'Home hero · statePages(): for three days after the release, page 1 is 18 opponent tiles (prime time outlined, away darker, bye marked), then the Week 1 opener and the slate' },
  { id: 'season-cuts', name: 'Cut-down: cut tracker (option A)', at: '2026-11-09', where: 'Home hero · statePages() in the Cut-down Weekend moment: cut moves league-wide and yours, your two latest moves, then the Week 1 opener (the next game stays, per your trade-deadline note)' },
  { id: 'trade-deadline', name: 'Trade deadline: a page in front (v2)', at: '2026-11-09', where: 'Home hero · homeHero(): in the week before the deadline (Tue Nov 4 2025, 4 PM ET) and the day after, page 1 is the deadline (Live, the countdown to 4 PM ET, deals so far, your team\'s latest deal), then Next game, Season and Tale of the tape stay' },
  { id: 'season-over', name: 'Season over: your season first (v2)', at: '2026-11-09', where: 'Home hero · statePages() once the Super Bowl is final: page 1 your season framed by what it reached, with your best win; page 2 the Super Bowl final; page 3 what\'s next. No losing streak under the record' },
  { id: 'hero-matchup', name: 'Home hero: the score line (option A, away left)', at: '2026-11-09', where: 'Home hero page 1 (final, live, before kickoff) and the Super Bowl final page · away left, home right; Final or Live and the clock in the centre; losing score and tricode dimmed; record and division place under a final (your note: "away should always be on the left")' },
  { id: 'nfl-icons', name: 'Icons: the NFL app\'s set (v4)', at: '2026-11-09', where: 'Every icon app-wide · NFL exports where they exist, ours redrawn to match the rest · outline at rest, the Fill export when active (selected tab, favourite star, following, liked) · sparkle → football/search/refresh/game, medal → star/check, zap → bolt/game/football, pick → check/football, split → grid' },
  { id: 'pinbar-away', name: 'Home pinned bar: away first (v5, option A)', at: '2026-11-10', where: 'Home top pin · the game page score bug\'s insides (26px logo discs, 17px tricodes, 24px scores) at 46px, edge to edge · away left, home right, away-to-home blend · Live clock / Final / kickoff time in the middle, no down and distance · checked all 32 teams at 393 and 360px' },
  { id: 'chrome-nosb', name: 'No status bar; time machine on You (v2)', at: '2026-11-10', where: 'Every screen · drawn status bar removed; headers pad to the phone safe area (26px min in preview phones), Home hero runs up behind; time machine row on You above Alerts; Prototype section removed' },
  { id: 'mg-plain', name: 'Mini games: plain colour cards (v2)', at: '2026-11-10', where: 'Home Mini Games rail and the Mini games page · no field art, no tag icons, no fan card, no "Free to play" line' },
  { id: 'sec-more', name: 'Section links: bolder, smaller (v2, A at 11px)', at: '2026-11-10', where: 'Every section-head link · extra bold 11px, grey · "1 update" singular' },
  { id: 'home-tuned', name: 'Home: no "tuned for" line', at: '2026-11-10', where: 'Home sheet top · the "Home tuned for" line is gone; the block only shows when there are "Since you last looked" chips' },
  { id: 'hero-lost', name: 'Home hero: no "Lost N straight"', at: '2026-11-10', where: 'Home hero second line · only a winning streak shows; otherwise the conference place · checked all 32 teams' },
  { id: 'app-icon', name: 'Home screen icon', at: '2026-11-10', where: 'index.html apple-touch-icon → assets/brand/nfl-app-icon-180.png (shield at ~60% on near-black); browser tab icon unchanged' },
  { id: 'scores-pass', name: 'Scores: tidy pass (v1)', at: '2026-11-10', where: 'Scores · Week title in Display caps italic; the corner TV button is gone and the footer network ("CBS ›") is the where-to-watch tap in every game card (UI.gameCard); win probability reads "PIT 98% win prob." · footer checked at 360 and 393px with a long network list' },
  { id: 'news-pass', name: 'News: tidy pass (v1)', at: '2026-11-10', where: 'News · Top runs newest first (your teams break ties within the hour; Home\'s Top stories keeps its for-you ranking) under Latest / Earlier this week headers; a story with no photo shows the shield on navy' },
  { id: 'pregame-hero', name: 'Game page hero: before kickoff (v4)', at: '2026-11-10', where: 'Game page before kickoff · tale of the tape: black with each team\'s colour glowing in from its own edge (no blend, no centre line); helmet, tricode, record at each edge; Kickoff in + days/hrs/min countdown (hrs/min/sec on game day) in the middle, day, time and channel under · checked all 32 teams at 393 and 360px' },
  { id: 'game-hero-live', name: 'Game page hero: before, live and final as one set (v3)', at: '2026-11-10', where: 'Game page hero, every state (game.js heroSet, .gh in game.css) · black with each team\'s colour glowing in from its edge; helmets 132px bleeding off each screen edge (a touch smaller under 383px); tricode, record, timeouts at each edge; centre: countdown before, Live + clock over the score live (down & distance, win probability), Final over the score after; losing score and tricode dim · the pre-kickoff hero got the same helmets · checked all 32 teams before, live and final at 393 and 360px' },
  { id: 'watch-pass', name: 'Watch: tidy pass (v1)', at: '2026-11-10', where: 'Watch hero · the icon-only button is a named Gamecast button; the main button is widest and, with three buttons, icons drop so the names fit (checked live and before kickoff at 360 and 393px, long network names) · the shortcut row starts with RedZone (no duplicate Where to watch)' },
  { id: 'teams-pass', name: 'Team page: tidy pass (v1)', at: '2026-11-10', where: 'Team overview · season leaders under a Display section title; power ranking card shows the rank once (big number, "Power ranking" + move, then last week and record) · checked all 32 teams at 360px' },
  { id: 'player-pass', name: 'Player page: tidy pass (v1)', at: '2026-11-10', where: 'Player Overview · no Compare button at the foot (Compare stays in the hero) · checked QB, RB, TE, CB and another team\'s DE' },
  { id: 'btn-family', name: 'Buttons: one family (v3, option B)', at: '2026-11-10', where: 'Every action button and PLAY NOW: All-Pro Display, ALL CAPS, upright (the one non-italic Display, roles.css BUTTON RULE) · chips, segments, pill tabs: Sans bold, sentence case · heights 44 · 40 · 32, corners 8 · 6 · team hero buttons on the scale · checked Home, Teams, Watch, game, onboarding, You at 393 and 360px' },
];

/* ------------------------------------------------------------------ proposed components */
const P = {};
/** display tabs at today's tab size: Display C italic caps, accent underline */
P.dtabs = (items, on, cls = '') => `<div class="ap-dtabs ${cls}">${items.map(l => `<button class="${l === on ? 'on' : ''}">${l}</button>`).join('')}</div>`;
/** segmented control at today's size; the picked segment fills with a gradient, same font everywhere */
P.seg = (items, on, tm) => `<div class="ap-seg">${items.map(l => `<button class="${l === on ? 'on' : ''}" ${l === on && tm ? `style="${App.teamVars(tm)}"` : ''}>${l}</button>`).join('')}</div>`;
/** today's section head, with room for a line of description */
P.head = (title, more, sub) => `<div class="sec-head ap-shd"><div class="grow"><div class="h2">${title}</div>${sub ? `<div class="ap-shd-s">${sub}</div>` : ''}</div>${more ? `<a class="more">${more}${S(icon('chev', 'xs'))}</a>` : ''}</div>`;
P.btn = (label, cls = '', style = '') => `<button class="ap-btn ${cls}" ${style ? `style="${style}"` : ''}>${label}</button>`;

/** today's game card, with a team-colour chip on each team row, names in Display italics and the new field tracker */
P.gcard = g => {
  const Sc = Dt.score(g), now = time.now();
  const line = (tid, sc, other) => {
    const tm = team(tid), lost = Sc.final && sc < other, poss = Sc.st === 'live' && Sc.poss === tid;
    return `<div class="gc-team ap-gct ${lost ? 'lost' : ''}" style="--c:${ink(tm)}"><i class="ap-gct-c"></i>${S(UI.logo(tid))}<div class="nm"><span>${esc(tm.loc === 'New York' || tm.loc === 'Los Angeles' ? tm.short : tm.name)}</span><span class="rec">${Dt.record(tid, g.s, Math.min(now, g.ts - 1)).str}</span>${poss ? '<span class="poss"></span>' : ''}</div>${Sc.st !== 'pre' ? `<div class="sc">${sc}</div>` : ''}</div>`;
  };
  const status = Sc.st === 'live' ? `<span class="badge live">${esc(Sc.label)}</span>${Sc.redzone ? '<span class="badge loss">Red Zone</span>' : ''}` : Sc.st === 'post' ? `<span class="badge final">${esc(Sc.label)}</span>` : `<span class="eyebrow" style="color:var(--text-2)">${esc(Sc.label)}</span>`;
  const tv = (g.tv || []).join(' · ') || 'TBD', b = Dt.box(g.id);
  const foot = Sc.st === 'post' ? `<span class="grow ellipsis">${esc((b && b.rh) || g.vn || '')}</span>` : `<span class="grow ellipsis">${S(icon('tv', 'xs'))} ${esc(tv)}</span>${Sc.st === 'live' && Sc.wp != null ? `<span class="num">${team(Sc.wp >= 50 ? g.h : g.a).abbr} ${Math.max(Sc.wp, 100 - Sc.wp)}%</span>` : ''}`;
  return `<a class="gcard ap-gc2"><div class="gc-top">${status}</div>${line(g.a, Sc.as, Sc.hs)}${line(g.h, Sc.hs, Sc.as)}${P.ftrack(g, Sc)}<div class="gc-foot">${foot}</div></a>`;
};
/** field tracker: a little field, end zones in team colours, the drive so far, the first-down line and the ball */
P.ftrack = (g, Sc) => {
  if (!Sc || Sc.st !== 'live' || Sc.yz == null || !Sc.poss) return '';
  const a = team(g.a), h = team(g.h), tm = team(Sc.poss), right = Sc.poss === g.a;   // away drives toward the home end zone, on the right
  const x = clamp(right ? 100 - Sc.yz : Sc.yz), y = Sc.drv ? +Sc.drv.y || 0 : 0, st = clamp(right ? x - y : x + y);
  const m = /&\s*(\d+)/.exec(Sc.dd || ''), fd = m ? clamp(right ? x + +m[1] : x - +m[1]) : null;
  const lo = Math.min(st, x), hi = Math.max(st, x);
  return `<div class="ap-ft"><div class="ap-ft-f" style="--ez-a:${a.color};--ez-h:${h.color};--tc:${ink(tm)}"><i class="ez a"></i><i class="ez h"></i>
    <div class="ap-ft-in"><i class="mid"></i><i class="rz ${right ? 'r' : 'l'} ${Sc.yz <= 20 ? 'hot' : ''}"></i>${hi - lo > 0 ? `<i class="drv" style="left:${lo}%;width:${hi - lo}%"></i>` : ''}${fd != null ? `<i class="fd" style="left:${fd}%"></i>` : ''}
      <span class="ball" style="left:${x}%"><img src="${tm.logo}" alt=""></span></div></div>
    <div class="ap-ft-k"><b>${S(icon('football', 'xs'))}${esc(Sc.dd)}</b>${Sc.drv ? `<span>Drive: ${Sc.drv.n} ${Sc.drv.n === 1 ? 'play' : 'plays'} · ${Sc.drv.y} yds · ${esc(Sc.drv.t)}</span>` : ''}</div></div>`;
};
/** featured video: the big one on top of a rail */
P.vfeat = n => `<a class="ap-vfeat"><div class="thumb">${n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy">` : ''}<div class="play">${S(icon('play', 'sm'))}</div><div class="dur">3:42</div></div>
  <div class="ap-vfeat-b"><div class="eyebrow">Featured · ${esc(fmt.ago(n.pub))}</div><div class="h3 clamp2 mt6">${esc(n.h)}</div></div></a>`;
/** today's RedZone card, tweaked: smaller call to action, Live next to the logo, and a countdown while it's off the air */
P.rz = (on, ts) => {
  const d = Math.max(0, ts - time.now()), p = v => String(v).padStart(2, '0');
  const cd = `<div class="ap-cdn"><div><b>${p(Math.floor(d / 864e5))}</b><span>Days</span></div><i>:</i><div><b>${p(Math.floor(d / 36e5) % 24)}</b><span>Hrs</span></div><i>:</i><div><b>${p(Math.floor(d / 6e4) % 60)}</b><span>Mins</span></div></div><div class="ap-cdn-cap">Until the action begins · ${fmt.weekday(ts)} ${fmt.time(ts)}</div>`;
  const n = UI.rzEntries().length;
  return `<div class="rzc ap-rzc"><div class="rzc-media"><video src="assets/video/highlights.mp4" autoplay muted loop playsinline preload="metadata"></video><button class="btn cta sm rzc-cta"><span class="nfl-plus">NFL<sup>+</sup></span>Get RedZone</button></div>
    <div class="rzc-body"><div class="ap-rz-mark">${S(UI.rzLogo())}${on ? '<span class="badge live">Live</span>' : ''}</div>${on ? (n ? S(UI.rzTrack()) : '<div class="rzc-empty mt8">Nobody\'s inside the 30 right now.</div>') : cd}</div></div>`;
};
/** the Stats tab's ranked rows, restyled: the rank as an italic ordinal in the team colour, a meter for where that sits in the league */
P.ranks = (h, items) => `<div class="sec">${S(UI.secHead(h))}<div class="list ap-rkl" style="--c:${ink(C.tm)}">${items.map(([l, v, r]) => `<div class="row static ap-rkr"><div class="row-main"><div class="row-title">${S(l)}</div>${r ? `<i class="ap-rk-m"><b style="width:${((33 - r) / 32 * 100).toFixed(1)}%"></b></i>` : ''}</div>
  <span class="ap-rk-v">${S(v)}</span><span class="ap-rk-o">${r ? fmt.ord(r).toUpperCase() : '–'}<small>in NFL</small></span></div>`).join('')}</div></div>`;
/** Season at a glance, restyled: team chips over their columns, numbers in Display italics, bars meeting in the middle */
P.glance = (m, s) => {
  const { g, away, home } = m, ctx = GP().seasonCtx(s), A = ctx.all[g.a] || {}, H = ctx.all[g.h] || {};
  const chip = (tm, r) => `<span class="ap-gl-t ${r ? 'r' : ''}" style="${App.teamVars(tm)}"><img src="${tm.logoDark || tm.logo}" alt=""><b>${tm.abbr}</b></span>`;
  const rows = GP().glanceStats(A, H).map(([l, a, h, d, lower]) => {
    const va = +a || 0, vh = +h || 0, mx = Math.max(Math.abs(va), Math.abs(vh)) || 1, aw = lower ? va < vh : va > vh, hw = lower ? vh < va : vh > va, pc = v => (Math.abs(v) / mx * 100).toFixed(1);
    const f = v => fmt.n(v, d) + (l.includes('%') ? '%' : '');
    return `<div class="ap-gl-r"><b class="${aw ? '' : 'dim'}" style="--c:${ink(away)}">${f(a)}</b><span>${l}</span><b class="r ${hw ? '' : 'dim'}" style="--c:${ink(home)}">${f(h)}</b>
      <div class="ap-gl-bar"><div><i style="width:${pc(va)}%;background:${ink(away)}"></i></div><div><i style="width:${pc(vh)}%;background:${ink(home)}"></i></div></div></div>`;
  }).join('');
  return `<div class="sec-head mt24"><div class="h2">Season at a glance</div><span class="tiny">${s}${s === g.s ? '' : ' (last season)'}</span></div><div class="gc-card ap-gl"><div class="ap-gl-h">${chip(away)}${chip(home, true)}</div>${rows}</div>`;
};
/** game leaders, restyled: each team's logo and abbreviation sits right over its own column; the yards are the big number */
P.leaders = m => {
  const rows = GP().leaderRows(m); if (!rows.length) return '';
  const cell = (x, tm, r) => {
    if (!x) return '<div></div>';
    const yd = /(\d+) YDS/i.exec(x.v || ''), rest = S(x.v).replace(/,?\s*\d+ YDS/i, '').replace(/^,\s*/, '');
    return `<div class="ap-lc ${r ? 'r' : ''}">${S(UI.hs(x.pid, 'sm'))}<div class="grow"><div class="ap-lc-n">${esc(GP().shortName(x.n))}</div>
      <div class="ap-lc-v"><b style="color:${ink(tm)}">${yd ? yd[1] : '–'}</b><span>yds</span></div><div class="ap-lc-s">${esc(rest)}</div></div></div>`;
  };
  return `<div class="gc-card flush ap-lcs"><div class="ap-lc-head"><div class="h4">Game leaders</div><div class="ap-lc-teams"><span>${S(UI.logo(m.away.id, 'sm'))}<b>${m.away.abbr}</b></span><span class="r"><b>${m.home.abbr}</b>${S(UI.logo(m.home.id, 'sm'))}</span></div></div>
    ${rows.map(([l, a, h]) => `<div class="ap-lc-row"><div class="eyebrow">${l}</div><div class="ap-lc-pair">${cell(a, m.away)}${cell(h, m.home, true)}</div></div>`).join('')}</div>`;
};
/** Game info, restyled: stadium and city as big italic words, the rest as label and value */
P.info = m => {
  const { g, home } = m, v = home.venue || {}, city = g.vc || (v.city ? v.city + (v.state ? ', ' + v.state : '') : '');
  const kv = [['Kickoff', `${fmt.dayLong(g.ts)}, ${fmt.time(g.ts)} ${fmt.tzAbbr(g.ts)}`], ['Broadcast', (g.tv || []).join(', ') || 'TBD'], ['Surface', g.ns ? '' : v.grass === false ? 'Artificial turf' : v.grass ? 'Grass' : ''],
    ['Weather', m.box && m.box.wx ? `${m.box.wx.t}° · ${m.box.wx.c}` : v.indoor ? 'Indoors' : 'Forecast closer to kickoff'], ['Officials', m.box && m.box.off && m.box.off.length ? (m.box.off.find(o => o[1] === 'Referee') || [])[0] + ' (referee)' : 'Crew announced later in the week'], ['Attendance', g.att ? fmt.n(g.att) : '']];
  return `<div class="sec-head mt24"><div class="h2">Game info</div></div><div class="gc-card flush ap-gi2">${v.img && !g.ns ? `<div class="thumb" style="border-radius:0"><img src="${esc(v.img)}" alt="" loading="lazy"></div>` : ''}
    <div class="cpad"><div class="ap-gi2-big"><div><span>${S(icon('stadium', 'xs'))}Stadium</span><b>${esc(g.vn || v.name || 'TBD')}</b></div><div><span>${S(icon('pin', 'xs'))}Location</span><b>${esc(city)}</b></div></div>${S(UI.kv(kv))}</div></div>`;
};
/** team hero, today's layout made closer to the screenshots: record as the big number, Shop and Tickets, next game as a card inside */
P.hero = tid => {
  const tm = team(tid), rec = recOf(tid) || '0-0', nx = Dt.liveGameFor(tid) || Dt.nextGame(tid);
  const next = nx ? (() => { const o = Dt.opp(nx, tid), home = Dt.isHome(nx, tid); return `<a class="ap-th2-next">${S(UI.logo(o, 'sm'))}<div class="grow"><span>Next</span><b>${home ? 'vs' : '@'} ${esc(team(o).name)}</b></div><em>${fmt.weekday(nx.ts)} ${fmt.time(nx.ts)} · ${esc((nx.tv || [])[0] || 'TBD')}</em>${S(icon('chev', 'xs'))}</a>`; })() : '';
  return `<section class="hero tm-hero ap-th2" style="${App.teamVars(tm)}">${S(UI.helmet(tid, { cls: 'hero-helmet', face: 'left' }))}
    <div class="tm-hero-loc">${esc(tm.loc)}</div><div class="ap-th2-n">${esc(tm.name)}</div>
    <div class="ap-th2-rec"><b>${rec}</b><span>${divPlace(tid)}${tm.coach ? `<br>HC ${esc(tm.coach)}` : ''}</span></div>
    <div class="ap-th2-row"><button class="btn sm tm-ghost">${S(icon('star', 'sm fill'))}Your team</button><button class="icon-btn tm-round" aria-label="Alerts">${S(icon('bell', 'sm'))}</button><button class="icon-btn tm-round" aria-label="Share">${S(icon('share', 'sm'))}</button></div>
    <div class="ap-th2-btns">${P.btn(`${S(icon('bag', 'sm'))}Shop`, 'tint')}${P.btn(`${S(icon('ticket', 'sm'))}Tickets`, 'tint')}</div>${next}</section>`;
};
/** your fan card: a membership card on your team's gradient, with a ticket tear and everything you've earned */
P.fan = () => {
  const p = store.p, tm = C.tm, Y = App.you || {}, lv = Y.levelInfo ? Y.levelInfo(p.points || 0) : { n: 'Rookie', pct: 0 }, pr = Y.picksRecord ? Y.picksRecord() : { w: 0, l: 0 };
  const name = (p.name || `${tm.name} fan`).trim().split(/\s+/), got = (Y.BADGES || []).filter(b => (p.badges || []).includes(b[0]));
  const no = `${tm.abbr} ${String((+tm.id * 7919) % 90000 + 10000)}`;
  return `<div class="ap-fc" style="${App.teamVars(tm)}">${S(UI.helmet(tm.id, { cls: 'ap-fc-hel', face: 'left' }))}
    <div class="ap-fc-top"><img src="${tm.logoDark || tm.logo}" alt=""><span>Official fan</span><b>No. ${no}</b></div>
    <div class="ap-fc-n">${esc(name[0])}${name.length > 1 ? `<br>${esc(name.slice(1).join(' '))}` : ''}</div>
    <div class="ap-fc-since">${esc(tm.name)} fan since ${p.since || 2019}</div>
    <div class="ap-fc-lv"><span class="ap-fc-chip">${S(icon('star', 'xs fill'))}${lv.n}</span><i class="ap-fc-bar"><b style="width:${Math.round(lv.pct * 100)}%"></b></i><span>${lv.next ? `${lv.need} pts to ${lv.next}` : 'Top level'}</span></div>
    <div class="ap-fc-tear" aria-hidden="true"></div>
    <div class="ap-fc-stats"><div><b>${fmt.n(p.points || 0)}</b><span>Fan points</span></div><div><b>${p.streak || 0}</b><span>Day streak</span></div><div><b>${(p.passport || []).length}</b><span>Stadiums</span></div><div><b>${pr.w}-${pr.l}</b><span>Picks</span></div></div>
    <div class="ap-fc-foot"><div class="ap-fc-badges">${got.slice(0, 4).map(b => `<i title="${esc(b[1])}">${S(icon(b[2], 'sm'))}</i>`).join('')}<span>${got.length} badge${got.length === 1 ? '' : 's'}</span></div>
      <div class="ap-fc-acts">${P.btn(`${S(icon('share', 'sm'))}Share`, 'tint sm')}${P.btn('Edit', 'tint sm')}</div></div></div>`;
};
P.drive = (d, open) => {
  const tm = team(d.t), last = d.p[d.p.length - 1] || {}, [pl, , tt] = S(d.s).split(', ');
  const plays = open ? `<div class="ap-dr-plays" style="--c:${ink(tm)}">${d.p.slice(0, 4).map(p => `<div class="ap-dr-p"><b>${esc(p.ty || 'Play')}</b>${p.dd ? ` · <span>${esc(p.dd)}</span>` : ''}<p>${p.c ? `(${esc(p.c)}) ` : ''}${esc(p.x)}</p></div>`).join('')}</div>` : '';
  return `<div class="ap-dr"><div class="ap-dr-h">${S(UI.logo(tm.id, 'sm'))}<b>${esc(d.r)}</b>${S(icon(open ? 'up' : 'down', 'sm'))}</div>
    <div class="ap-dr-g"><div><span>Plays</span><b>${esc(S(pl).replace(/\D/g, ''))}</b></div><div><span>Start</span><b>${esc(d.st)}</b></div><div><span>Yds</span><b>${d.y}</b></div><div><span>Time</span><b>${esc(tt || '')}</b></div>
      <div class="ap-dr-sc">${S(UI.logo(C.G.live.a, 'xs'))}${S(UI.logo(C.G.live.h, 'xs'))}<b>${last.as ?? 0}</b><b>${last.hs ?? 0}</b></div></div>${plays}</div>`;
};
/* ---- round 3 revisions, built only from the locked atoms */
/** game card v3: today's abstract tracker, refined; records only before and after the game */
P.gcard3 = g => {
  const Sc = Dt.score(g), now = time.now(), live = Sc.st === 'live';
  const line = (tid, sc, other) => {
    const tm = team(tid), lost = Sc.final && sc < other, poss = live && Sc.poss === tid;
    return `<div class="gc-team ap-gct ${lost ? 'lost' : ''}" style="--c:${mark(tm)}"><i class="ap-gct-c"></i>${S(UI.logo(tid))}<div class="nm"><span>${esc(tm.loc === 'New York' || tm.loc === 'Los Angeles' ? tm.short : tm.name)}</span>${live ? '' : `<span class="rec">${Dt.record(tid, g.s, Math.min(now, g.ts - 1)).str}</span>`}${poss ? '<span class="poss"></span>' : ''}</div>${Sc.st !== 'pre' ? `<div class="sc">${sc}</div>` : ''}</div>`;
  };
  const status = live ? `<span class="badge live">${esc(Sc.label)}</span>${Sc.redzone ? '<span class="badge loss">Red zone</span>' : ''}` : Sc.st === 'post' ? `<span class="badge final">${esc(Sc.label)}</span>` : `<span class="badge final">${esc(Sc.label)}</span>`;
  const tv = (g.tv || []).join(' · ') || 'TBD', b = Dt.box(g.id);
  const foot = Sc.st === 'post' ? `<span class="grow ellipsis">${esc((b && b.rh) || g.vn || '')}</span>` : `<span class="grow ellipsis">${S(icon('tv', 'xs'))} ${esc(tv)}</span>${live && Sc.wp != null ? `<span class="num">${team(Sc.wp >= 50 ? g.h : g.a).abbr} ${Math.max(Sc.wp, 100 - Sc.wp)}%</span>` : ''}`;
  return `<a class="gcard ap-gc2"><div class="gc-top">${status}</div>${line(g.a, Sc.as, Sc.hs)}${line(g.h, Sc.hs, Sc.as)}${P.ytrack(g, Sc)}<div class="gc-foot">${foot}</div></a>`;
};
/** the abstract tracker, refined: one track, end caps in each team's Mark, the drive so far in the team with the ball's Mark, the line to gain, the ball */
P.ytrack = (g, Sc) => {
  if (!Sc || Sc.st !== 'live' || Sc.yz == null || !Sc.poss) return '';
  const a = team(g.a), h = team(g.h), tm = team(Sc.poss), right = Sc.poss === g.a;
  const x = clamp(right ? 100 - Sc.yz : Sc.yz), y = Sc.drv ? +Sc.drv.y || 0 : 0, st = clamp(right ? x - y : x + y);
  const m = /&\s*(\d+)/.exec(Sc.dd || ''), fd = m ? clamp(right ? x + +m[1] : x - +m[1]) : null;
  const lo = Math.min(st, x), hi = Math.max(st, x);
  return `<div class="ap-yt" style="--ma:${mark(a)};--mh:${mark(h)};--mp:${mark(tm)}"><div class="ap-yt-bar"><i class="ez a"></i><i class="ez h"></i><i class="rz ${right ? 'r' : 'l'}"></i><i class="mid"></i>
      ${hi - lo > 0 ? `<i class="drv" style="left:${lo}%;width:${hi - lo}%"></i>` : ''}${fd != null ? `<i class="fd" style="left:${fd}%"></i>` : ''}<span class="ball" style="left:${x}%"><img src="${tm.logo}" alt=""></span></div>
    <div class="ap-yt-ends"><span>${a.abbr}</span><span>50</span><span>${h.abbr}</span></div>
    <div class="ap-yt-k"><b>${esc(Sc.dd)}</b>${Sc.drv ? `<span>Drive · ${Sc.drv.n} ${Sc.drv.n === 1 ? 'play' : 'plays'} · ${Sc.drv.y} yds · ${esc(Sc.drv.t)}</span>` : ''}</div></div>`;
};
/** matchup hero v3: metadata in pills (Neutral solid, the way the pills atom does it on a colour), no slash, no line, no fade */
P.mx3 = g => {
  const Sc = Dt.score(g), tv = (g.tv || [])[0];
  let h = S(UI.matchup(g));
  const pills = Sc.st === 'live' ? `<span class="badge live">Live</span><span class="badge solid num">${esc(Sc.label)}</span>` : `<span class="badge solid num">${esc(Sc.label)}</span>${tv ? `<span class="badge solid">${esc(tv)}</span>` : ''}`;
  h = h.replace(/<div class="mx-top">[\s\S]*?<\/div>(\s*<div class="mx-sides">)/, `<div class="mx-top"><div class="ap-mx3-p">${pills}</div></div>$1`);
  return `<div class="ap-mx3">${h}</div>`;
};
/** game page hero v2: same split as the matchup hero, from each team's sheet gradient; metadata in pills; down & distance in Sans */
P.gch3 = m => {
  let h = S(GP().hero(m));
  h = h.replace(/<div class="gc-hero-meta">([\s\S]*?)<\/div>/, (x, t) => `<div class="gc-hero-meta ap-gch3-p"><span class="badge solid">${t}</span></div>`);
  h = h.replace(/<div class="gc-count">[\s\S]*?<\/span><\/div>/, `<span class="badge solid">Kickoff in ${esc(fmt.until(m.g.ts))}</span>`);
  // live: the Live pill carries the clock, the way the game card does
  h = h.replace(/<span class="badge live">Live<\/span><div class="gc-clock num">([\s\S]*?)<\/div>/, (x, t) => `<span class="badge live">${t || 'Live'}</span>`);
  return `<div class="ap-gch3">${h}</div>`;
};
/** featured video v3: built from the media atoms, so it matches the rail beside it */
P.vfeat3 = n => `<a class="ap-vf3"><div class="thumb m">${n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy">` : ''}<div class="play">${S(icon('play', 'sm'))}</div><div class="dur">3:42</div></div>
  <div class="t-eyebrow mt12">Featured</div><div class="t-title clamp2 mt6">${esc(n.h)}</div><div class="t-meta mt4">${esc(fmt.ago(n.pub))} · NFL Films</div></a>`;
/** rankings v3: the ordinal is Display S in the team's Mark, the meter is the team's Mark */
P.ranks3 = (h, items) => `<div class="sec">${S(UI.secHead(h))}<div class="list ap-rkl" style="--c:${mark(C.tm)}">${items.map(([l, v, r]) => `<div class="row static ap-rkr"><div class="row-main"><div class="row-title">${S(l)}</div>${r ? `<i class="ap-rk-m"><b style="width:${((33 - r) / 32 * 100).toFixed(1)}%"></b></i>` : ''}</div>
  <span class="ap-rk-v t-stat">${S(v)}</span><span class="ap-rk-o">${r ? fmt.ord(r).toUpperCase() : '–'}<small>in NFL</small></span></div>`).join('')}</div></div>`;
/** game leaders v3: mirrored like a scoreboard; names and detail outside, the two numbers meet in the middle */
P.leaders3 = m => {
  const rows = GP().leaderRows(m); if (!rows.length) return '';
  const cell = (x, tm, r) => {
    if (!x) return `<div class="ap-l3-p ${r ? 'r' : ''}"></div><div class="ap-l3-v ${r ? 'r' : ''}"><b>–</b><span>YDS</span></div>`;
    const yd = /(\d+) YDS/i.exec(x.v || ''), rest = S(x.v).replace(/,?\s*\d+ YDS/i, '').replace(/^,\s*/, '');
    return `<div class="ap-l3-p ${r ? 'r' : ''}">${S(UI.hs(x.pid, 'sm'))}<div class="ap-l3-t"><div class="t-title-s ellipsis">${esc(GP().shortName(x.n))}</div><div class="t-meta ellipsis">${esc(rest)}</div></div></div><div class="ap-l3-v ${r ? 'r' : ''}"><b style="color:${mark(tm)}">${yd ? yd[1] : '–'}</b><span>YDS</span></div>`;
  };
  const chip = (tm, r) => `<span class="ap-l3-tm ${r ? 'r' : ''}">${S(UI.logo(tm.id, 'sm'))}<b>${tm.abbr}</b></span>`;
  return `<div class="gc-card flush ap-l3"><div class="ap-l3-head"><div class="t-title">Game leaders</div><div class="ap-l3-teams">${chip(m.away)}<span class="t-eyebrow">Yards</span>${chip(m.home, true)}</div></div>
    ${rows.map(([l, a, h]) => `<div class="ap-l3-row"><div class="ap-l3-k t-eyebrow">${l}</div><div class="ap-l3-g">${cell(a, m.away)}${cell(h, m.home, true)}</div></div>`).join('')}</div>`;
};
/** season at a glance v3: same layout, team colours from the sheet's Mark role (Denver stays orange) */
P.glance3 = (m, s) => {
  const { g, away, home } = m, ctx = GP().seasonCtx(s), A = ctx.all[g.a] || {}, H = ctx.all[g.h] || {};
  const chip = (tm, r) => `<span class="ap-gl-t ${r ? 'r' : ''}" style="${App.teamVars(tm)}"><img src="${tm.logoDark || tm.logo}" alt=""><b>${tm.abbr}</b></span>`;
  const rows = GP().glanceStats(A, H).map(([l, a, h, d, lower]) => {
    const va = +a || 0, vh = +h || 0, mx = Math.max(Math.abs(va), Math.abs(vh)) || 1, aw = lower ? va < vh : va > vh, hw = lower ? vh < va : vh > va, pc = v => (Math.abs(v) / mx * 100).toFixed(1);
    const f = v => fmt.n(v, d) + (l.includes('%') ? '%' : '');
    return `<div class="ap-gl-r"><b class="${aw ? '' : 'dim'}" style="--c:${mark(away)}">${f(a)}</b><span>${l}</span><b class="r ${hw ? '' : 'dim'}" style="--c:${mark(home)}">${f(h)}</b>
      <div class="ap-gl-bar"><div><i style="width:${pc(va)}%;background:${mark(away)}"></i></div><div><i style="width:${pc(vh)}%;background:${mark(home)}"></i></div></div></div>`;
  }).join('');
  return `${S(UI.secHead('Season at a glance', '', '', `${s}${s === g.s ? '' : ' (last season)'}`))}<div class="gc-card ap-gl">${(() => { const ra = App.teamRoles(away) || {}, rh = App.teamRoles(home) || {};
    return `<div class="ap-gl-h">${chip(away)}${chip(home, true)}</div>`; })()}${rows}</div>`;
};
/** game heroes v4: one hero, three divergent directions; each draws the Home matchup hero (tall) and the game page hero (compact) */
const HERO_OPTS = [
  { k: 'a', name: 'Face-off', note: 'Keeps the team colours and helmets, but makes it a poster: the helmets meet nose to nose at the seam, the score sits low and huge on each side, and the rest is pills. The loudest; closest to today.' },
  { k: 'b', name: 'Scoreboard', note: 'A dark broadcast stage in neutral black. Team colour is only a band of the team gradient down each outer edge plus the logo, so any two teams look good together and the numbers own it. Calm and premium, like a TV score bug.' },
  { k: 'c', name: 'Light card', note: 'No hero surface at all: a card on the page like everything else, with logos, Display names and scores in the text colour, and each team\'s Mark as a bar under its name. The quietest; lets the content below lead.' },
];
P.hx = (opt, g, size) => {
  const Sc = Dt.score(g), A = team(g.a), H = team(g.h), pre = Sc.st === 'pre', live = Sc.st === 'live';
  const rec = t => Dt.record(t.id, g.s, Math.min(time.now(), g.ts - 1)).str;
  const dk = opt === 'b' ? '#0E1116' : null, mk = t => (App.teamRoles(t, dk || undefined) || {}).mark || mark(t);
  const tv = (g.tv || [])[0], wk = Dt.weekLabel ? Dt.weekLabel(g.t, g.w, true) : '', venue = g.vn || ((H.venue || {}).name) || '';
  const pills = live ? `<span class="badge live num">${esc(Sc.label)}</span>${Sc.redzone ? '<span class="badge solid loss">Red zone</span>' : ''}`
    : pre ? `<span class="badge ${opt === 'c' ? '' : 'solid'}">${esc(wk)}</span>${tv ? `<span class="badge ${opt === 'c' ? '' : 'solid'}">${esc(tv)}</span>` : ''}` : `<span class="badge ${opt === 'c' ? '' : 'solid'}">${esc(Sc.label)}</span>`;
  const lost = (t, sc, o) => Sc.final && sc < o ? 'lost' : '';
  const side = (t, k, sc, o) => `<div class="hx-s ${k} ${lost(t, sc, o)}" style="--m:${mk(t)}">
      ${opt === 'a' ? S(UI.helmet(t.id, { cls: 'hx-hel', face: k === 'h' ? 'left' : 'right' })) : `<span class="hx-logo">${S(UI.logo(t.id, opt === 'b' ? 'md' : 'md'))}</span>`}
      <div class="hx-n t-ds">${esc(t.name)}</div><div class="hx-r t-meta">${rec(t)}${live && Sc.poss === t.id ? ` · <span class="hx-ball">${S(icon('football', 'xs'))}Ball</span>` : ''}</div>${pre ? '' : `<div class="hx-sc">${sc}</div>`}</div>`;
  const mid = pre ? `<div class="hx-c"><div class="hx-time">${esc(fmt.time(g.ts))}</div><div class="t-meta">${esc(fmt.day(g.ts))}</div><span class="badge ${opt === 'c' ? 'info' : 'solid'} mt6">Kickoff in ${esc(fmt.until(g.ts))}</span></div>` : `<div class="hx-c"></div>`;
  const wp = live && Sc.wp != null ? `<div class="hx-wp"><span class="t-stat">${A.abbr} ${100 - Sc.wp}%</span><div class="hx-wpb"><i style="width:${100 - Sc.wp}%;background:${mk(A)}"></i><i style="width:${Sc.wp}%;background:${mk(H)}"></i></div><span class="t-stat">${Sc.wp}% ${H.abbr}</span></div>` : '';
  const foot = `${live && Sc.dd ? `<div class="hx-dd t-title-s">${esc(Sc.dd)}</div>` : ''}${wp}${pre || !live ? `<div class="hx-v t-meta">${esc(venue)}</div>` : ''}`;
  return `<div class="hx ${opt} ${size}" style="${UI.matchVars(g.a, g.h)};${App.teamVars(A).replace(/--/g, '--a-')}${App.teamVars(H).replace(/--/g, '--h-')}"><div class="hx-top">${pills}</div>
    <div class="hx-row">${side(A, 'a', Sc.as, Sc.hs)}${mid}${side(H, 'h', Sc.hs, Sc.as)}</div><div class="hx-foot">${foot}</div></div>`;
};
const heroSet = opt => { const gs = [C.G.live, C.G.pre].filter(Boolean);
  return `<div class="apc-k">Home · matchup hero</div>${gs.map(g => P.hx(opt, g, 'tall')).join('<div class="mt12"></div>')}<div class="apc-k">Game page hero</div>${gs.map(g => P.hx(opt, g, 'compact')).join('<div class="mt12"></div>')}`; };
/** matchup heroes, round 4: three divergent directions, each drawn as the whole family
    (the Home/Watch hero, the game page hero, the score bug that pins on scroll) in every state */
const MH_OPTS = [
  { k: 'a', name: 'Stacked', note: 'No split at all. Each team gets its own full-width band of its own gradient, away on top, home below, like a broadcast scoreboard. Helmet on the left facing right, name and record, score at the right edge. Two colours never fight, any matchup works, and the winner reads instantly.' },
  { k: 'b', name: 'Your team\'s stage', note: 'Fan-first: the whole hero is one team\'s gradient (your team when they play, otherwise the home team). The opponent sits on it as a white logo chip. One colour, one helmet, so it feels like your team\'s page and never clashes.' },
  { k: 'c', name: 'Scoreboard over the seam', note: 'Keeps both colours side by side, but on a straight seam with no giant letters and no glow. A white, squared scoreboard sits on the seam and holds the score, clock and status in the text colour. Helmets are smaller, at the outer edges, facing in.' },
];
const mhRec = (t, g) => Dt.record(t.id, g.s, Math.min(time.now(), g.ts - 1)).str;
const mhStat = (g, Sc, solid) => Sc.st === 'live' ? `<span class="badge live">${esc(Sc.label)}</span>`
  : Sc.st === 'pre' ? `<span class="badge ${solid ? 'solid' : ''}">${esc(fmt.day(g.ts))} · ${esc(fmt.time(g.ts))}</span>` : `<span class="badge ${solid ? 'solid' : ''}">${esc(Sc.label)}</span>`;
const mhMeta = (g, Sc) => { const tv = (g.tv || [])[0], H = team(g.h), venue = g.vn || ((H.venue || {}).name) || '';
  return Sc.st === 'live' ? (Sc.dd || '') : Sc.st === 'pre' ? [`Kickoff in ${fmt.until(g.ts)}`, tv].filter(Boolean).join(' · ') : venue; };
P.mh = (opt, g, size) => {
  const Sc = Dt.score(g), A = team(g.a), H = team(g.h), pre = Sc.st === 'pre', live = Sc.st === 'live', fin = Sc.final;
  const tvA = App.teamVars(A), tvH = App.teamVars(H);
  const lost = (sc, o) => fin && sc < o ? 'lost' : '';
  const ball = t => live && Sc.poss === t.id ? `<span class="mh-ball">${S(icon('football', 'xs'))}</span>` : '';
  if (opt === 'a') {
    const band = (t, k, sc, o, tv) => `<div class="mh-band ${k} ${lost(sc, o)}" style="${tv}">${S(UI.helmet(t.id, { cls: 'mh-hel', face: 'right' }))}
      <div class="mh-who"><span class="${size === 'bug' ? 't-dxs' : 't-ds'}">${esc(size === 'bug' ? t.abbr : t.name)}</span>${size === 'bug' ? '' : `<span class="mh-rec">${mhRec(t, g)}</span>`}</div>${ball(t)}
      ${pre ? '' : `<b class="mh-sc ${size === 'bug' ? 't-ds' : size === 'tall' ? 't-dxl' : 't-dl'}">${sc}</b>`}</div>`;
    if (size === 'bug') return `<div class="mh a bug">${band(A, 'a', Sc.as, Sc.hs, tvA)}${band(H, 'h', Sc.hs, Sc.as, tvH)}<div class="mh-bugst t-stat">${esc(live ? Sc.label : Sc.label)}</div></div>`;
    return `<div class="mh a ${size}"><div class="mh-top">${mhStat(g, Sc)}<span class="t-meta">${esc(mhMeta(g, Sc))}</span></div>${band(A, 'a', Sc.as, Sc.hs, tvA)}${band(H, 'h', Sc.hs, Sc.as, tvH)}</div>`;
  }
  if (opt === 'b') {
    const me = [g.a, g.h].includes(C.tm.id) ? team(C.tm.id) : H, op = me.id === A.id ? H : A;
    const ms = me.id === A.id ? Sc.as : Sc.hs, os = me.id === A.id ? Sc.hs : Sc.as, vs = me.id === A.id ? '@' : 'vs';
    if (size === 'bug') return `<div class="mh b bug" style="${App.teamVars(me)}"><span class="t-dxs">${esc(me.abbr)}</span><b class="t-ds ${lost(ms, os)}">${ms}</b><span class="mh-bugst t-stat">${esc(Sc.label)}</span><b class="t-ds ${lost(os, ms)}">${os}</b><span class="mh-chip sm">${S(UI.logo(op.id, 'xs'))}</span><span class="t-dxs">${esc(op.abbr)}</span></div>`;
    return `<div class="mh b ${size}" style="${App.teamVars(me)}">${S(UI.helmet(me.id, { cls: 'mh-hel', face: 'left' }))}
      <div class="mh-top">${mhStat(g, Sc, true)}</div>
      <div class="mh-name ${size === 'tall' ? 't-dxl' : 't-dl'}">${esc(me.name)}</div>
      <div class="mh-vs"><span class="t-title-s">${vs}</span><span class="mh-chip">${S(UI.logo(op.id, 'sm'))}</span><span class="t-title-s">${esc(op.name)}</span><span class="mh-rec">${mhRec(me, g)} · ${mhRec(op, g)}</span></div>
      ${pre ? '' : `<div class="mh-score ${size === 'tall' ? 't-dxl' : 't-dl'}"><b class="${lost(ms, os)}">${ms}</b><i>–</i><b class="${lost(os, ms)}">${os}</b>${ball(me.id === Sc.poss ? me : op).replace('mh-ball', 'mh-ball ' + (Sc.poss === me.id ? 'l' : 'r'))}</div>`}
      <div class="mh-meta">${esc(mhMeta(g, Sc))}</div></div>`;
  }
  const side = (t, k, tv) => `<div class="mh-half ${k}" style="${tv}">${S(UI.helmet(t.id, { cls: 'mh-hel', face: k === 'a' ? 'right' : 'left' }))}<div class="mh-who"><span class="${size === 'bug' ? 't-dxs' : 't-ds'}">${esc(size === 'bug' ? t.abbr : t.name)}</span>${size === 'bug' ? '' : `<span class="mh-rec">${mhRec(t, g)}</span>`}</div></div>`;
  const board = pre ? `<div class="mh-board"><b class="t-dm">${esc(fmt.time(g.ts))}</b><span class="t-meta">${esc(fmt.day(g.ts))}</span></div>`
    : `<div class="mh-board">${live ? '<span class="badge live">Live</span>' : ''}<div class="mh-bs ${size === 'bug' ? 't-ds' : 't-dl'}"><b class="${lost(Sc.as, Sc.hs)}">${Sc.as}</b><b class="${lost(Sc.hs, Sc.as)}">${Sc.hs}</b></div><span class="t-stat">${esc(live ? Sc.label : 'Final')}</span></div>`;
  if (size === 'bug') return `<div class="mh c bug">${side(A, 'a', tvA)}${side(H, 'h', tvH)}${board}</div>`;
  return `<div class="mh c ${size}">${side(A, 'a', tvA)}${side(H, 'h', tvH)}${board}<div class="mh-foot t-meta">${esc(mhMeta(g, Sc))}</div></div>`;
};
const mhSet = opt => { const gs = [C.G.pre, C.G.live, C.G.post].filter(Boolean), L = ['Before kickoff', 'Live', 'Final'];
  return `<div class="apc-k">Home and Watch hero</div>${gs.map((g, i) => `<p class="ap-tc-n">${L[i]}</p>${P.mh(opt, g, 'tall')}`).join('')}
    <div class="apc-k">Game page hero</div>${gs.map(g => P.mh(opt, g, 'compact')).join('<div class="mt12"></div>')}
    <div class="apc-k">Score bug (pins on scroll)</div><div class="mh-bugs">${gs.filter(g => Dt.score(g).st !== 'pre').map(g => P.mh(opt, g, 'bug')).join('')}</div>`; };
const mhCurrent = () => { const gs = [C.G.pre, C.G.live, C.G.post].filter(Boolean), L = ['Before kickoff', 'Live', 'Final'], GP = App.gameParts;
  return `<div class="apc-k">Home and Watch hero</div>${gs.map((g, i) => `<p class="ap-tc-n">${L[i]}</p>${S(UI.matchup(g))}`).join('')}
    <div class="apc-k">Game page hero</div>${gs.map(g => S(GP.hero(GP.model(g)))).join('<div class="mt12"></div>')}
    <div class="apc-k">Score bug (pins on scroll)</div><div class="mh-bugs ap-pin">${gs.map(g => S(GP.pinBug(GP.model(g)))).filter(Boolean).map(x => `<div class="gc-pin show">${x}</div>`).join('')}</div>`; };
/** the real Where to watch sheet rows, as the app draws them today */
const watchRowsNow = g => `<div class="list">${Dt.watch(g).map(o => `<button class="row tap">${o.ok ? `<span class="gc-ok">${S(icon('check', 'sm'))}</span>` : `<span class="gc-ok no">${S(icon('lock', 'sm'))}</span>`}<div class="row-main"><div class="row-title">${esc(o.label)}</div><div class="row-sub">${esc(o.sub)}</div></div>${o.ok ? `<span class="tiny accent b">${o.k === 'audio' ? 'Listen' : 'Watch'}</span>` : S(UI.tierBadge(o.tier === 'tv' ? 'tv' : o.tier))}</button>`).join('')}</div>`;
/** watch & listen v2: the same rows and data, as one component built from the atoms */
P.streams2 = g => {
  const live = Dt.state(g) === 'live';
  const row = o => { const ic = o.k === 'audio' ? 'headphones' : o.tier === 'tv' ? 'tv' : 'play';
    const act = o.ok ? `<button class="btn sm ${live ? 'primary' : 'ghost'}">${S(icon(ic, 'sm'))}${o.k === 'audio' ? 'Listen' : o.tier === 'tv' ? 'Info' : 'Watch'}</button>` : o.tier === 'premium' || o.tier === 'plus' ? `<button class="btn sm plus">See plans</button>` : `<button class="btn sm ghost">${Dt.connectable && Dt.connectable(o) ? 'Connect' : 'How to watch'}</button>`;
    return `<div class="ap-st2"><span class="ap-st2-i">${S(icon(ic, 'sm'))}</span><div class="grow"><div class="t-title-s">${esc(o.label)}</div><div class="t-meta">${esc(o.sub)}</div>${o.tier === 'plus' || o.tier === 'premium' ? `<div class="mt6">${S(UI.tierBadge(o.tier))}</div>` : ''}</div>${act}</div>`; };
  return `${S(UI.secHead('Watch & listen', '', '', live ? 'On now' : `Kickoff ${fmt.weekday(g.ts)} ${fmt.time(g.ts)} · the buttons light up when it starts`))}<div class="ap-st2s">${Dt.watch(g).map(row).join('')}</div>`;
};
/** fan card v3: no stripes; the card is the team's sheet gradient with a stub, a level ladder and a barcode */
P.fan3 = () => {
  const p = store.p, tm = C.tm, Y = App.you || {}, lv = Y.levelInfo ? Y.levelInfo(p.points || 0) : { n: 'Rookie', pct: 0 }, pr = Y.picksRecord ? Y.picksRecord() : { w: 0, l: 0 };
  const name = (p.name || `${tm.name} fan`).trim().split(/\s+/), got = (Y.BADGES || []).filter(b => (p.badges || []).includes(b[0]));
  const no = String((+tm.id * 7919) % 90000 + 10000), LV = ['Rookie', 'Starter', 'Pro Bowl', 'All-Pro', 'Hall of Fame'], at = Math.max(0, LV.indexOf(lv.n));
  const bars = [...(tm.abbr + no)].map((c, i) => `<i style="width:${1 + (c.charCodeAt(0) * (i + 3)) % 3}px"></i>`).join('');
  const nx = Dt.nextGame ? Dt.nextGame(tm.id) : null;
  return `<div class="ap-f3" style="${App.teamVars(tm)}">${S(UI.helmet(tm.id, { cls: 'ap-f3-hel', face: 'left' }))}
    <div class="ap-f3-top"><img src="${tm.logoDark || tm.logo}" alt=""><span class="t-eyebrow grow">Official fan</span><span class="t-stat">No. ${tm.abbr} ${no}</span></div>
    <div class="ap-f3-n t-dxl ${name.join(' ').length > 12 ? 'long' : ''}">${esc(name[0])}${name.length > 1 ? `<br>${esc(name.slice(1).join(' '))}` : ''}</div>
    <div class="ap-f3-since t-meta">Fan since ${p.since || 2019} · ${fmt.ord(Math.max(1, C.s - (p.since || 2019) + 1))} season${nx ? ` · next: ${Dt.isHome(nx, tm.id) ? 'vs' : '@'} ${esc(team(Dt.opp(nx, tm.id)).name)} ${fmt.weekday(nx.ts)}` : ''}</div>
    <div class="ap-f3-lv"><div class="ap-f3-lad">${LV.map((l, i) => `<i class="${i < at ? 'done' : i === at ? 'on' : ''}">${i === at ? `<b style="width:${Math.round(lv.pct * 100)}%"></b>` : ''}</i>`).join('')}</div>
      <div class="ap-f3-lvk"><span class="badge solid">${esc(lv.n)}</span><span class="t-meta">${lv.next ? `${lv.need} pts to ${esc(lv.next)}` : 'Top level'}</span></div></div>
    ${(() => { const fav = Dt.roster(tm.id).find(x => x.pos === 'QB') || Dt.roster(tm.id)[0]; return fav ? `<div class="ap-f3-fav">${S(UI.hs(fav.id, 'sm'))}<div><span class="t-eyebrow">Favourite player</span><div class="t-title-s">${esc(fav.n)}${fav.num ? ` · #${fav.num}` : ''}</div></div></div>` : ''; })()}
    <div class="ap-f3-tear" aria-hidden="true"></div>
    <div class="ap-f3-stub"><div class="ap-f3-stats"><div><b class="t-dl">${fmt.n(p.points || 0)}</b><span class="t-eyebrow">Points</span></div><div><b class="t-dl">${p.streak || 0}</b><span class="t-eyebrow">Streak</span></div><div><b class="t-dl">${(p.passport || []).length}</b><span class="t-eyebrow">Stadiums</span></div><div><b class="t-dl">${pr.w}-${pr.l}</b><span class="t-eyebrow">Picks</span></div></div>
      <div class="ap-f3-badges">${got.length ? got.slice(0, 5).map(b => `<span class="ap-f3-b">${S(icon(b[2], 'sm'))}${esc(b[1])}</span>`).join('') : '<span class="t-meta">Earn badges by playing mini games and making picks</span>'}</div>
      <div class="ap-f3-fun"><div><span class="t-eyebrow">Fan rank</span><b class="t-ds">Top 12%</b><span class="t-meta">of ${esc(tm.name)} fans</span></div>
        <div><span class="t-eyebrow">Next badge</span><b class="t-title-s">Sharp picker</b><i class="ap-f3-nb"><b style="width:60%"></b></i><span class="t-meta">2 more correct picks</span></div></div>
      <div class="ap-f3-foot"><div class="ap-f3-luck"><span class="t-eyebrow">Lucky charm</span><b class="t-ds">3-1</b><span class="t-meta">when you check in</span></div><div class="flex gap8"><button class="btn sm white">${S(icon('share', 'sm'))}Share</button><button class="btn sm tm-ghost">Edit</button></div></div></div></div>`;
};
const capNote = 'Text sits optically centred: All-Pro Sans puts its capitals 14% of the type size above the middle of the line, so Sans labels get .29em more space on top than underneath. (CSS text-box trimming would do it, but it does not work on flex buttons.)';

/* ------------------------------------------------------------------ round 2: foundations and atoms
   Atoms are settled before anything is built on them, so molecules wait for round 3.
   Everything here is drawn from tokens: status colours, team colour roles, type roles, control sizes. */
const ROUND = 5;
/** the Stats tab's ranked rows for the newest season with games; earlier seasons' box scores load on demand, then the card redraws */
let rankLoading = false;
const rankG = () => {
  for (const y of [C.s, C.s - 1, C.s - 2]) {
    const o = Dt.teamSeason(C.state.team, y);
    if (o && o.g) { try { C.rankS = y; return App.teamParts.rankGroups(C.state.team, y).slice(0, 2); } catch (e) { /* try the season before */ } }
    else if (!App.NFL.d['box-' + y] && !rankLoading && Dt.ensureBox) {
      rankLoading = true;
      Dt.ensureBox(y).then(() => { rankLoading = false; const sel = document.querySelector('[data-ds=moment]'); if (sel) sel.dispatchEvent(new Event('change', { bubbles: true })); }).catch(() => { rankLoading = false; });
      return null;
    }
  }
  return [];
};
const rankCard = (f, best) => { const g = rankG(); if (g === null) return none('Loading last season\'s team stats…'); if (!g.length) return none('No team stats at this moment.');
  const top = best ? g.flatMap(([, items]) => items).filter(x => x[2]).sort((a, b) => a[2] - b[2]).slice(0, 3) : [];
  return `${C.rankS !== C.s ? `<p class="ap-tc-n" style="margin:0 var(--pad) 8px">${C.rankS} season: this moment has no ${C.s} games yet.</p>` : ''}${top.length ? `<div class="ap-rk5-top" style="--c:${mark(C.tm)}">${top.map(([l, v, r]) => `<div><b class="t-dl">${fmt.ord(r).toUpperCase()}</b><span class="t-meta">${S(l)}</span></div>`).join('')}</div>` : ''}${g.map(([h, items]) => f(h, items)).join('')}`; };
/** rankings v5: the rank leads every row */
P.ranks5 = (h, items) => `<div class="sec">${S(UI.secHead(h))}<div class="list ap-rk5" style="--c:${mark(C.tm)}">${items.map(([l, v, r]) => `<div class="row static ap-rk5-r"><b class="t-dm">${r ? fmt.ord(r).toUpperCase() : '–'}</b><div class="row-main"><div class="ap-rk5-l"><span class="t-title-s">${S(l)}</span><span class="t-stat">${S(v)}</span></div>${r ? `<i class="ap-rk-m"><b style="width:${((33 - r) / 32 * 100).toFixed(1)}%"></b></i>` : ''}</div></div>`).join('')}</div></div>`;
const dark = () => document.documentElement.dataset.theme === 'dark';
const surf = () => dark() ? '#151517' : '#ffffff';
const cr = (a, b) => App.contrast(a, b).toFixed(1);
const cssVar = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const sw = (c, label, sub) => `<span class="ap-sw"><i style="background:${c}"></i><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span>`;

/** team colour roles, picked from the team's own sheet (Primary, then its shades), never mixed with black */
function roles(tm) {
  const bg = surf(), P0 = (App.PALETTE || {})[tm.abbr] || {}, sh = P0.sh || {}, dk = dark();
  const primary = P0.p || tm.color;
  const ladder = dk ? [primary, sh[300], sh[100], '#ffffff'] : [primary, sh[700], sh[800], '#000000'];
  const pick = need => ladder.find(c => c && App.contrast(c, bg) >= need) || ladder[ladder.length - 1];
  const name = c => c === primary ? 'Primary' : (Object.keys(sh).find(k => sh[k] === c) || (c === '#ffffff' ? 'White' : 'Black'));
  const mark = pick(3), ink = pick(4.5), tint = dk ? sh[800] : sh[100];
  return { primary, g: P0.g || [tm.color, tm.color], mark, ink, tint: tint || App.mix(primary, bg, .85), markN: name(mark), inkN: name(ink), tintN: dk ? '800' : '100', bg };
}
const SIG = ['DEN', 'CIN', 'CLE', 'MIA', 'KC', 'LAC', 'PIT', 'NO', 'SEA', 'GB'];

/** proposed status tokens: one colour per meaning, a solid and a soft form, each with the text colour that passes on it */
const STATUS = () => {
  const s = surf(), dk = dark();
  return [
    { k: 'live', n: 'Live', c: '#D50A0A', on: '#ffffff', ink: dk ? '#FF6B6B' : '#B30000', use: 'Live games, Live on pictures. Always with the pulsing dot.' },
    { k: 'positive', n: 'Positive', c: '#1A7F37', on: '#ffffff', ink: dk ? '#4CD37F' : '#146C2E', use: 'Active, Win, Clinched, Full practice' },
    { k: 'warning', n: 'Warning', c: '#F5B400', on: '#0B0D12', ink: dk ? '#FFC940' : '#7A4300', use: 'Questionable, Doubtful, Limited practice' },
    { k: 'negative', n: 'Negative', c: '#D50A0A', on: '#ffffff', ink: dk ? '#FF6B6B' : '#B30000', use: 'Out, IR, Loss, Did not practice. Same red as Live (it is NFL red); Live is told apart by its dot.' },
    { k: 'info', n: 'Info · NFL+', c: '#004FFF', on: '#ffffff', ink: dk ? '#8DB0FF' : '#0040D6', use: 'New, tips, and NFL+ in lists. It is NFL+ blue, so the app has one blue.' },
    { k: 'neutral', n: 'Neutral', c: dk ? '#3A3D44' : '#2B2F36', on: '#ffffff', ink: dk ? '#C4C6CC' : '#4C5260', use: 'Final, Bye, TBD, and every label on a picture (video length)' },
  ].map(x => ({ ...x, soft: App.mix(s, x.c, dk ? .22 : .13) }));
};
const pill = (x, form, label, dot) => `<span class="ap-pl ${dot ? 'lv' : ''} ${x.k === 'neutral' || /\d/.test(label || '') ? 'num' : ''}" style="background:${form === 'solid' ? x.c : x.soft};color:${form === 'solid' ? x.on : x.ink}">${label || x.n}</span>`;

/** the NFL+ logo, white on the NFL+ gradient (UI.plusLogo) */
const plusTag = (sub) => `<span class="ap-plustag">${S(UI.plusLogo())}${sub ? `<small>${sub}</small>` : ''}</span>`;
const PILL_OPTS = [{ k: 'a', name: 'Stats', note: 'All-Pro Stats bold, sentence case. Reads like the scoreboard: the same face as the clock and the score it sits next to.' }, { k: 'b', name: 'Stats caps', note: 'All-Pro Stats bold, caps, tracked. More of a stamp; louder in a long injury list.' }];

const R2 = [
];

/* ------------------------------------------------------------------ the proposals */
/* v: bump when a proposal is revised. tier: where it lives once approved.
   changes: what the change is, in plain words. flag: a house rule it would bend. */
const LATER = [
];
const PROPOSALS = [...R2, ...LATER.map(p => ({ round: 6, ...p }))];
/** later rounds register their cards from their own files (app/design/round4.js …) with DSApprovals.add(round, list).
    Helpers they can use: DSApprovals.h = { S, esc, team, phone, none, mark, ink, C: () => C } */
const ROUNDS = { 4: 'Atoms', 5: 'Molecules', 6: 'Organisms' };

/* ------------------------------------------------------------------ context for one render */
function context(ctx) {
  const G = ctx.games(), s = Dt.seasonForStats(), st = Dt.standings(s), tm = team(ctx.state.team);
  const g = G.pre || G.live || G.post;
  const now = time.now();
  const mine = Dt.D.games.filter(x => (x.a === tm.id || x.h === tm.id) && x.ts > now).sort((a, b) => a.ts - b.ts)[0];
  // RedZone is on Sunday 1:00 PM ET; next one from now
  const d = new Date(now); d.setUTCHours(17, 0, 0, 0); while (d.getUTCDay() !== 0 || d.getTime() <= now) d.setUTCDate(d.getUTCDate() + 1);
  const n = Dt.news().filter(x => x.img).slice(0, 6);
  while (n.length < 6) n.push({ h: 'Highlights', img: '', pub: new Date(now).toISOString() });
  const ros = Dt.roster(tm.id).filter(p => p.pg === 'offense' || p.pg === 'defense').slice(0, 5);
  const STAT = [['', 'FP'], ['', 'LP'], ['q', 'LP'], ['', 'DNP'], ['out', 'DNP']];
  const oppId = g.a === tm.id ? g.h : g.h === tm.id ? g.a : (mine ? (mine.a === tm.id ? mine.h : mine.a) : g.h);
  const mPre = G.pre && GP().model ? GP().model(G.pre) : null, mLive = G.live && GP().model ? GP().model(G.live) : null;
  const drives = mLive && mLive.pbp && mLive.pbp.dr ? mLive.pbp.dr.slice(0, 3) : [];
  // Season at a glance reads the box scores of the season the two teams have played most of
  const boxS = mPre ? [mPre.g.s, mPre.g.s - 1].find(y => App.NFL.d['box-' + y]) : null;
  return { ...ctx, G, s, st, tm, ga: team(g.a), gh: team(g.h), mine, rzNext: d.getTime(), n, oppId, mPre, mLive, drives, boxS,
    injs: ros.map((p, i) => [p, ...STAT[i % STAT.length]]) };
}

/* ------------------------------------------------------------------ the tier */
const FILTERS = [['all', 'All'], ['pending', 'Waiting on you'], ['approved', 'Approved'], ['rejected', 'Not approved']];
let filter = 'pending'; // opens on what needs a decision
const inFilter = x => filter === 'all' || (filter === 'pending' ? x.status === 'pending' || x.status === 'revised' : x.status === filter);
let boxWait = false;
function render(ctx) {
  C = context(ctx);
  // the box score, team compare and recap cards read the season's box file; after a reload it may not be loaded yet,
  // so load it and draw again (once) when it arrives
  const gs = [C.G && C.G.post, C.G && C.G.live].filter(Boolean);
  if (!boxWait && gs.some(g => !App.data.box(g.id))) { boxWait = true;
    Promise.all([...new Set(gs.map(g => g.s))].map(s => App.data.ensureBox(s))).then(() => App.emit('live-ready')).catch(() => {}); }
  const d = load();
  // this round, plus any card from a later round that is already drawn (ready): those count and filter like this round's
  const ds = PROPOSALS.filter(p => p.round === ROUND || (p.round > ROUND && p.ready)).map(p => [p, decision(p, d)]);
  const later = PROPOSALS.filter(p => p.round > ROUND).map(p => [p, decision(p, d)]);
  const count = k => ds.filter(([, x]) => k === 'pending' ? x.status === 'pending' || x.status === 'revised' : x.status === k).length;
  const show = ds.filter(([p]) => p.round === ROUND).filter(([, x]) => filter === 'all' || (filter === 'pending' ? x.status === 'pending' || x.status === 'revised' : x.status === filter));
  const tiers = [...new Set(ds.map(([p]) => p.tier))];
  const intro = `<div class="ap-bar"><div class="ap-bar-c">${FILTERS.map(([k, l]) => `<button class="${filter === k ? 'on' : ''}" data-ap-filter="${k}">${l}<b>${k === 'all' ? ds.length : count(k)}</b></button>`).join('')}</div>
    <div class="ap-bar-a"><button data-ap-export>Download approvals.json</button><button data-ap-copy>Copy for Claude</button></div>
    <p class="ap-bar-n">Inspired by the current NFL app screenshots and the Mini Games Figma, rebuilt in our look. Approve, or write what to change and press Not approved. Decisions save in this browser as you click${d.updated ? ` (last saved ${new Date(d.updated).toLocaleString()})` : ''}. Next time, just say "check approvals" and Claude builds the approved ones and revises the rest.</p></div>`;
  setTimeout(fontSpecs, 60);
  const roundH = `<div class="ap-rnd"><b>Round ${ROUND} · ${ROUNDS[ROUND]}</b><p>Every element in the app now gets its own card, from the smallest up: atoms first (this round), then molecules, then organisms. Each card says where the element lives, and the phone on the right opens that screen and outlines it. Where the same kind of thing is drawn more than one way (a tricode in Display here and Sans there), the card shows every version found in the app and asks you to pick one, and that choice is applied everywhere, including in things already built.</p></div>`;
  // collapsed by default; the open state survives re-renders (moment, theme) for this browser
  let bOpen = false; try { bOpen = localStorage.getItem('nfl-ds-built-open') === '1'; } catch (e) {}
  const built = `<details class="ap-built" ${bOpen ? 'open' : ''} ontoggle="try{localStorage.setItem('nfl-ds-built-open',this.open?'1':'0')}catch(e){}"><summary><h3>${S(icon('check', 'sm'))}Built from your approvals <span class="ap-built-n">${BUILT.length}</span></h3>${S(icon('down', 'sm'))}</summary><ul>${BUILT.map(b => `<li><b>${b.name}</b><span>${b.where}</span><em>${new Date(b.at + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</em></li>`).join('')}</ul><p>These are in the app now; their specs are on the Atoms, Molecules and Organisms tabs.</p></details>`;
  setTimeout(ctxWatch, 80);
  const aside = `<aside class="ap-ctx" aria-label="In context"><div class="ap-ctx-h"><b>In context</b><span data-ap-ctx-n>Scroll to a card</span></div><div class="ds-phone ap-ctx-ph"><iframe data-ap-ctx src="index.html?frame&moment=${C.state.moment}&team=${C.state.team}&theme=${C.state.theme}#/home" title="In context"></iframe></div></aside>`;
  // when this round has nothing left waiting on you, the next round's drawn cards come first instead of under it
  const ahead = !ds.some(([p, x]) => p.round === ROUND && (x.status === 'pending' || x.status === 'revised'));
  // the "In context" side phone is off (Nov 10: the user wanted the full width for side-by-side comparisons)
  return `<section class="ds-sec" id="approvals"><div class="ds-sec-h"><h2>Approvals</h2><p>Proposed changes, side by side with what the app draws today. "Current" is the real component or screen; "Proposed" is a mock-up that only lives on this page until you approve it.</p></div>${intro}${built}${ahead ? '' : roundH}</section>` +
    (ahead ? next(later) + `<section class="ds-sec" id="ap-round-${ROUND}"><div class="ds-sec-h"><h2>Round ${ROUND} · ${ROUNDS[ROUND]} (decided)</h2></div>${roundH}</section>` : '') +
    tiers.map(t => { const list = show.filter(([p]) => p.tier === t); return list.length ? `<section class="ds-sec" id="ap-${t.toLowerCase()}"><div class="ds-sec-h"><h2>${t}</h2></div>${list.map(([p, x]) => card(p, x)).join('')}</section>` : ''; }).join('') +
    (show.length ? '' : `<p class="ap-empty">Nothing here.</p>`) + (ahead ? '' : next(later));
}
/** what waits for the next round: approved molecules are built once their atoms are locked; notes are kept for the revision */
function next(list) {
  if (!list.length) return '';
  const row = ([p, x]) => `<div class="ap-q-r"><div class="grow"><b>${p.name}</b><span class="ap-q-t">${p.tier} · v${p.v}</span>${x.comment ? `<p>"${esc(x.comment)}"</p>` : ''}</div>
    <span class="ap-chip ${x.status}">${LABEL[x.status]}</span></div>`;
  const rs = [...new Set(list.map(([p]) => p.round))].sort();
  return rs.map(r => `<section class="ds-sec" id="ap-next-${r}"><div class="ds-sec-h"><h2>Round ${r} · ${ROUNDS[r] || ''}</h2><p>Up next. Cards drawn early (from the pieces you have already locked) are open for your decision now; the rest are drawn once round ${ROUND} is locked, so nothing is built twice.</p></div>
    ${list.filter(([p, x]) => p.round === r && p.ready && inFilter(x)).map(([p, x]) => card(p, x)).join('')}
    <div class="ap-q">${list.filter(([p]) => p.round === r && !p.ready).map(row).join('')}</div></section>`).join('');
}
/** the context screen: the card nearest the top of the view drives the pinned phone. Each proposal (or audit row)
    names where it lives with ctx: [route, selector]; the frame opens the route and outlines the first match */
let ctxOn = null, ctxWant = null;
const ctxPost = m => { ctxWant = m; const f = document.querySelector('[data-ap-ctx]'); if (f && f.dataset.ready) f.contentWindow.postMessage(m, '*'); };
function ctxSend(id) {
  const art = id && document.querySelector(`[data-ap="${id}"]`); if (!art || !art.dataset.apRoute) return;
  const n = document.querySelector('[data-ap-ctx-n]'); if (n) n.textContent = art.querySelector('h3') ? art.querySelector('h3').textContent : id;
  const sw = ctxSwap(art);
  ctxPost({ dsGo: art.dataset.apRoute, hl: art.dataset.apHl, ...(sw ? { swap: sw, css: ctxCss() } : {}) });
}
/** the picked option as the app would draw it: the option's own frame, without the card's label */
function ctxSwap(art) {
  const f = art.querySelector('.ap-opt.on .ds-frame'); if (!f) return null;
  const ph = [...f.querySelectorAll('.r6-ph')]; return ph.length ? ph.map(x => x.innerHTML).join('') : f.innerHTML;
}
const ctxCss = () => [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href')).filter(h => /design\/round/.test(h));
function ctxPick() {
  const arts = [...document.querySelectorAll('[data-ap][data-ap-route]')], mid = innerHeight * .38;
  const a = arts.find(x => { const r = x.getBoundingClientRect(); return r.top < mid && r.bottom > mid; }) || arts.find(x => x.getBoundingClientRect().top >= 0);
  const id = a && a.dataset.ap; if (id && id !== ctxOn) { ctxOn = id; ctxSend(id); }
}
/* the frame says when its app has booted ({ dsReady }); then the latest wish is sent */
window.addEventListener('message', e => {
  if (!(e.data || {}).dsReady) return;
  const f = document.querySelector('[data-ap-ctx]'); if (!f || e.source !== f.contentWindow) return;
  f.dataset.ready = '1'; if (ctxWant) f.contentWindow.postMessage(ctxWant, '*'); else { ctxOn = null; ctxPick(); }
});
let ctxT = 0;
function ctxWatch() { ctxOn = null; }
document.addEventListener('scroll', () => { if (ctxT) return; ctxT = setTimeout(() => { ctxT = 0; ctxPick(); }, 160); }, true);
document.addEventListener('pointerdown', e => { if (e.target.closest('[data-ap-go]')) return; const a = e.target.closest('[data-ap][data-ap-route]'); if (a && a.dataset.ap !== ctxOn) { ctxOn = a.dataset.ap; ctxSend(ctxOn); } });

/** Type roles: write each current specimen's real computed font next to it */
function fontSpecs() {
  document.querySelectorAll('[data-ap-font]').forEach(e => {
    const o = e.parentElement.querySelector('[data-ap-font-out]'); if (!o) return;
    const s = getComputedStyle(e), fam = /APD|Display/i.test(s.fontFamily) ? 'Display C' : /Stats/i.test(s.fontFamily) ? 'Stats' : 'Sans';
    o.textContent = `${fam} ${s.fontWeight}${s.fontStyle === 'italic' ? ' italic' : ''}${s.textTransform === 'uppercase' ? ' caps' : ''} · ${parseFloat(s.fontSize)}px`;
  });
}
const draw = (f, id) => { try { return f(); } catch (e) { console.error(id, e); return none(`Could not draw: ${esc(e.message)}`); } };
const LABEL = { pending: 'Waiting on you', revised: 'Revised · review again', approved: 'Approved', rejected: 'Not approved', built: 'Built' };
function card(p, x) {
  let cur = '', pro = '';
  try { cur = p.current(); } catch (e) { console.error(p.id, e); cur = none(`Could not draw: ${esc(e.message)}`); }
  if (!p.options) pro = draw(() => p.proposed(), p.id);
  const prev = x.prev || (x.history && x.history[x.history.length - 1]);
  const cx = p.ctx ? ` data-ap-route="${esc(p.ctx[0])}" data-ap-hl="${esc(p.ctx[1] || '')}"` : '';
  return `<article class="ds-spec ap ap-${x.status}" id="ap-${p.id}" data-ap="${p.id}"${cx}>
    <header class="ds-spec-h"><h3>${p.name}</h3><code>${p.target}</code><span class="ap-chip ${x.status}">${LABEL[x.status] || x.status}</span><span class="ap-v">v${p.v}</span></header>
    <ul class="ap-changes">${p.changes.map(c => `<li>${c}</li>`).join('')}</ul>
    ${p.flag ? `<p class="ap-flag">${S(icon('info', 'xs'))}${p.flag}</p>` : ''}${p.note ? `<p class="ds-note">${p.note}</p>` : ''}
    ${p.merged ? (() => { const d = load(), N = { shape: 'Control shape', 'btn-display': 'Display button', seg: 'Segmented control' }; return p.merged.map(k => d.items[k] && d.items[k].comment ? `<p class="ap-prev"><b>Your note on ${N[k] || k}:</b> ${esc(d.items[k].comment)}</p>` : '').join(''); })() : ''}
    ${x.status === 'revised' && prev && prev.comment ? `<p class="ap-prev"><b>Your last note (v${prev.v || 1}):</b> ${esc(prev.comment)}</p>` : ''}
    <div class="ap-cmp"><figure class="ds-var"><figcaption>Current</figcaption><div class="ds-frame ${p.bleed ? 'bleed' : ''}">${cur}</div></figure>
      ${p.options ? p.options.map(o => `<figure class="ds-var ap-opt ${x.pick === o.k ? 'on' : ''}"><figcaption class="pro"><label><input type="radio" name="ap-pick-${p.id}" value="${o.k}" data-ap-pick ${x.pick === o.k ? 'checked' : ''}>Option ${o.k.toUpperCase()} · ${o.name}</label></figcaption><p class="ap-opt-n">${o.note}</p><div class="ds-frame ${p.bleed ? 'bleed' : ''}">${draw(() => p.proposed(o.k), p.id)}</div></figure>`).join('') :
      `<figure class="ds-var"><figcaption class="pro">Proposed</figcaption><div class="ds-frame ${p.bleed ? 'bleed' : ''}">${pro}</div></figure>`}</div>
    <div class="ap-dec"><textarea data-ap-note rows="3" placeholder="Comments: what should change? (optional when approving)">${esc(x.status === 'revised' ? (x.draft || '') : (x.draft != null ? x.draft : x.comment || ''))}</textarea>
      <div class="ap-dec-b"><button class="ap-yes" data-ap-do="approved">${S(icon('check', 'sm'))}Approve</button><button class="ap-no" data-ap-do="rejected">${S(icon('close', 'sm'))}Not approved</button>${x.status !== 'pending' ? `<button class="ap-reset" data-ap-do="reset">Reset</button>` : ''}
      ${x.at && x.status !== 'revised' ? `<span class="ap-at">${LABEL[x.status]} ${new Date(x.at).toLocaleString()}</span>` : ''}</div></div>
  </article>`;
}

/* ------------------------------------------------------------------ actions */
function decide(id, status, note, pick) {
  const p = PROPOSALS.find(q => q.id === id); if (!p) return;
  const d = load(), was = d.items[id] || {};
  const history = (was.history || []).concat(was.status ? [{ status: was.status, comment: was.comment || '', v: was.v || 1, at: was.at }] : []);
  d.items[id] = status === 'reset' ? { history } : { status, comment: note.trim(), v: p.v, at: new Date().toISOString(), history, ...(pick ? { pick, draftPick: pick } : {}) };
  save(d);
}
function exportJson() {
  const d = load(); save(d);
  const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'approvals.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function summary() {
  const d = load();
  return PROPOSALS.map(p => { const x = decision(p, d); return `- ${p.name} (${p.tier}, v${p.v}): ${LABEL[x.status]}${x.pick ? ` · option ${x.pick.toUpperCase()}` : ''}${x.comment ? ` — "${x.comment}"` : ''}`; }).join('\n');
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-ap-filter]'); if (f) { filter = f.dataset.apFilter; App.refreshAll(); return; }
  if (e.target.closest('[data-ap-export]')) { exportJson(); return; }
  const cp = e.target.closest('[data-ap-copy]');
  if (cp) { const t = `Approvals:\n${summary()}`; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { cp.textContent = 'Copied'; }, () => { cp.textContent = 'Copy failed'; }); return; }
  const b = e.target.closest('[data-ap-do]'); if (!b) return;
  const art = b.closest('[data-ap]'), note = art.querySelector('[data-ap-note]').value;
  if (b.dataset.apDo === 'rejected' && !note.trim()) { const ta = art.querySelector('[data-ap-note]'); ta.classList.add('need'); ta.placeholder = 'Say what to change, then press Not approved'; ta.focus(); return; }
  const pk = art.querySelector('[data-ap-pick]:checked'), P0 = PROPOSALS.find(q => q.id === art.dataset.ap);
  if (b.dataset.apDo === 'approved' && P0 && P0.options && !pk) { art.querySelector('.ap-cmp').classList.add('need'); return; }
  decide(art.dataset.ap, b.dataset.apDo, note, pk && pk.value);
  App.refreshAll();
});
// picking an option is saved straight away, like a draft comment
document.addEventListener('change', e => {
  const r = e.target.closest('[data-ap-pick]'); if (!r) return;
  const art = r.closest('[data-ap]'), d = load(), id = art.dataset.ap;
  d.items[id] = { ...(d.items[id] || {}), draftPick: r.value }; save(d);
  art.querySelectorAll('.ap-opt').forEach(f => f.classList.toggle('on', f.contains(r)));
  art.querySelector('.ap-cmp').classList.remove('need');
  // and the phone on the right shows it in the app straight away
  if (art.dataset.apRoute) { ctxOn = id; ctxSend(id); }
});
// keep what you type, so a re-render (theme, team, moment) never loses a comment
document.addEventListener('input', e => {
  const ta = e.target.closest('[data-ap-note]'); if (!ta) return;
  ta.classList.remove('need');
  const d = load(), id = ta.closest('[data-ap]').dataset.ap;
  d.items[id] = { ...(d.items[id] || {}), draft: ta.value }; save(d);
});

window.DSApprovals = { render, PROPOSALS, summary, add: (round, list) => list.forEach(p => PROPOSALS.push({ round, ...p })),
  h: { S, esc, team, phone, none, mark, ink, C: () => C }, ctxPost };
})();
