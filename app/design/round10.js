/* Approvals round 10: cards keyed by id in window.R5_CARDS, queued by round5.js. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const PH = inner => `<div class="r6-ph">${inner}</div>`;
const phone = (r, x) => DSApprovals.h.phone(r, x || '');
const ROW = inner => `<div style="display:flex;flex-wrap:wrap;gap:16px 20px">${inner}</div>`;
const SH = (t, inner) => `<div style="display:inline-flex;flex-direction:column;gap:6px"><span style="font:600 12px/1.2 var(--sans)">${t}</span>${inner}</div>`;

/* ------------------------------------------------------------------ the NFL app's icons (assets/icons/nfl-export → app/icons-nfl.js) */
const ICN = 'Your note: "there are two types of flags, generic flag and a penalty flag. For weather, i did a cloud with a sun. Then I couldn\'t find an icon for minus, sliders, expand, layers, split, explore, rewind, tv, video, radio, mic, whistle, medal, crown, pick, game, chart, fire, zap, users, book, wallet, dollar, map, plane, car, food, qr, globe, translate, a11y, sparkle, or baby."';
const svg = (inner, nf) => `<svg class="ico${nf ? ' nf' : ''}" viewBox="0 0 24 24" aria-hidden="true" style="width:24px;height:24px">${inner}</svg>`;
const NOTE = { penalty: 'new', playc: 'Watch outline', timer: 'Combine', bolt: 'Lightning Round', target: 'Precision Passing', sun: 'Clear Day', moon: 'Clear Night', weather: 'Partly Cloudy Day' };
const sheet = () => { const I = App.ICONS, N = window.NFL_ICONS || {};
  const keys = Object.keys(N).filter(k => !k.endsWith('-on'));
  const cell = k => `<div class="r10ic-c"><div class="r10ic-p">${I[k] ? svg(I[k]) : '<span class="r10ic-new">new</span>'}<span class="r10ic-ar">→</span>${svg(N[k], true)}${N[k + '-on'] ? svg(N[k + '-on'], true) : ''}</div><b>${k}</b>${NOTE[k] ? `<small>${NOTE[k]}</small>` : ''}</div>`;
  return `<div class="r10ic"><div class="r10ic-h">Ours → the NFL app's (${keys.length})</div><div class="r10ic-g">${keys.map(cell).join('')}</div></div>`; };
/* still needed: each icon with no NFL version, drawn big as the app draws it today, with where it shows, so it can be found in the NFL set by eye */
const USED = {
  minus: 'One fewer: ticket quantity, Stat finder steppers', sliders: 'Home "tuned for" line; game page "Update my services"',
  map: 'Stadium guide (team page, game day)', pin: 'Game info "Location"; passport stamp toast', chart: 'Stats Center, Fan polls, Record book; "Stats nerd" in onboarding',
  book: 'Franchise history card; Football 101', tv: 'Where to watch on game cards; "Casual fan" in onboarding', globe: 'International fans; country / time zone',
  mic: 'Live audio "Now playing"', radio: 'Game audio feeds list', fire: '"Die-hard" in onboarding; hot-streak notes in the live feed',
  whistle: 'Preseason in the time machine; rule-change lessons', users: 'Watch with fans near you; Squads & chat',
  sparkle: '"Help me pick a team"', medal: 'Hall of Fame; Pro Bowl voting', plane: 'Plan a road trip', car: 'Transit & parking',
  food: 'Local favourites near the stadium', qr: 'Ticket QR code', wallet: 'Ticket wallet', a11y: 'Stadium accessibility',
  translate: 'Language setting', rewind: 'Catch up / 60-second recap on game cards', video: 'Video rows and video placeholders',
  zap: 'Mini games in Explore; Watch RedZone button', game: 'The game controller in the Home header that opens Mini Games',
  dollar: 'Contracts & cap', pick: 'Weekly picks card', layers: 'Replays on game cards; Team rankings', split: 'Multiview',
  explore: 'Not on a screen today', expand: 'Not on a screen today', crown: 'Not on a screen today', baby: 'Not on a screen today' };
const needed = () => { const I = App.ICONS, N = window.NFL_ICONS || {}, kept = Object.keys(I).filter(k => !N[k]);
  return `<div class="r10ic"><div class="r10ic-h">Still needed (${kept.length}): as we draw them today, big, with where they show</div>
    <div class="r10ic-n">${kept.map(k => `<div class="r10ic-nc">${svg(I[k]).replace('width:24px;height:24px', 'width:44px;height:44px')}<b>${k}</b><small>${USED[k] || ''}</small></div>`).join('')}</div></div>`; };
/* v2: the second export, ours matched to the NFL set, alternatives for sparkle and medal, and what to retire */
const Q2 = t => `Your note: "${t}"`;
const big = (inner, nf, px) => svg(inner, nf).replace('width:24px;height:24px', `width:${px}px;height:${px}px`);
const NEW2 = { game: 'Controller', pin: 'new Pin export', minus: 'Minus Symbol', chart: 'Standings', fire: 'Hot', superbowl: 'Super Bowl trophy (new)', sliders: 'uses Filter' };
const OURS = ['explore', 'map', 'book', 'tv', 'globe', 'mic', 'radio', 'whistle', 'users', 'qr', 'wallet', 'translate', 'rewind', 'video', 'dollar', 'layers'];
const REDO = ['plane', 'car', 'food', 'a11y'];
const NEIGH = ['search', 'calendar', 'stadium', 'ticket', 'chat', 'gear'];
const sheet2 = () => { const I = App.ICONS, N = window.NFL_ICONS || {};
  const keys = Object.keys(N).filter(k => !k.endsWith('-on') && !OURS.includes(k) && !REDO.includes(k));
  const cell = k => `<div class="r10ic-c${NEW2[k] ? ' r10ic-hot' : ''}"><div class="r10ic-p">${I[k] ? svg(I[k]) : '<span class="r10ic-new">new</span>'}<span class="r10ic-ar">→</span>${svg(N[k], true)}${N[k + '-on'] ? svg(N[k + '-on'], true) : ''}</div><b>${k}</b>${NEW2[k] || NOTE[k] ? `<small>${NEW2[k] || NOTE[k]}</small>` : ''}</div>`;
  return `<div class="r10ic"><div class="r10ic-h">NFL icons (${keys.length}) · new in this round outlined</div><div class="r10ic-g">${keys.map(cell).join('')}</div></div>`; };
/* ours next to NFL neighbours, at 24 and 44, so weight and size can be judged side by side */
const matched = (list, title) => { const I = App.ICONS, N = window.NFL_ICONS || {};
  const row = k => `<div class="r10m-r"><b>${k}</b><span class="r10m-was">${big(I[k], false, 24)}${big(I[k], false, 44)}</span><span class="r10ic-ar">→</span><span class="r10m-now">${big(N[k], true, 24)}${big(N[k], true, 44)}</span></div>`;
  return `<div class="r10ic"><div class="r10ic-h">${title}</div>
    <div class="r10m-nb"><span>NFL neighbours for weight:</span>${NEIGH.map(k => big(N[k], true, 24)).join('')}${NEIGH.map(k => big(N[k], true, 44)).join('')}</div>
    <div class="r10m">${list.map(row).join('')}</div></div>`; };
/* sparkle and medal: where each shows, and two alternatives from icons we already have */
const ALT = [
  ['sparkle', '"Help me pick a team" (Teams), "New to football" (onboarding)', 'help', 'football'],
  ['sparkle', 'Stat finder, "Ask anything" chips (search)', 'search', 'chat'],
  ['sparkle', '"Pick the rest with fan favourites" (Pick\'em)', 'refresh', 'star'],
  ['sparkle', 'Gridiron Slate (Mini Games)', 'game', 'football'],
  ['medal', 'Hall of Fame (Explore, History, inductee rows)', 'star', 'stadium'],
  ['medal', 'Pro Bowl voting (Explore)', 'bolt', 'star'],
  ['medal', '"Student of the Game" badge, lesson-complete toast', 'book', 'check'] ];
const alts = () => { const I = App.ICONS, N = window.NFL_ICONS || {}, ic = k => N[k] ? big(N[k], true, 28) : big(I[k], false, 28);
  return `<div class="r10ic"><div class="r10ic-h">Sparkle and medal: where they show, two options each</div>
    <div class="r10a">${ALT.map(([k, w, a, b]) => `<div class="r10a-r"><span class="r10a-o">${big(I[k], false, 28)}<small>${k}</small></span><span class="r10a-w">${w}</span><span class="r10a-x">${ic(a)}<small>1 · ${a}</small></span><span class="r10a-x">${ic(b)}<small>2 · ${b}</small></span></div>`).join('')}</div></div>`; };
/* zap, crown, pick, baby, split, expand: every use and what it becomes */
const RET = [
  ['zap', 'Watch RedZone button and tile', 'bolt'], ['zap', 'Mini games in Explore', 'game'], ['zap', 'Sack marker on the field view', 'football'],
  ['crown', 'Not on a screen; retire. Where the app means the Super Bowl or champions, the new Super Bowl trophy goes instead', 'superbowl'],
  ['pick', '"Picker" badge', 'check'], ['pick', 'Pick\'em "resting" empty state', 'football'],
  ['split', 'Multiview (Scores button, Explore row, empty state, toast)', 'grid'],
  ['baby', 'Not on a screen; retire', ''], ['expand', 'Not on a screen; retire (your call)', ''] ];
const SB = 'Super Bowl trophy goes on: the Super Bowl LX and Season Over moments in the time machine, "Every Super Bowl" (Explore, History), the champions line on the Super Bowl bracket card, and the gold Super Bowl-season badge on team history. Playoff picture, playoff machine and clinch notes keep the regular trophy.';
const retire = () => { const I = App.ICONS, N = window.NFL_ICONS || {}, ic = k => N[k] ? big(N[k], true, 28) : I[k] ? big(I[k], false, 28) : '';
  return `<div class="r10ic"><div class="r10ic-h">Zap, crown, pick, baby, split, expand: retire, and what each use becomes</div>
    <div class="r10a">${RET.map(([k, w, to]) => `<div class="r10a-r"><span class="r10a-o">${big(I[k], false, 28)}<small>${k}</small></span><span class="r10a-w">${w}</span><span class="r10a-x">${to ? `${ic(to)}<small>${to}</small>` : '<small>removed</small>'}</span></div>`).join('')}</div>
    <p class="r10a-n">${SB}</p></div>`; };
const RETIRED = ['sparkle', 'medal', 'zap', 'crown', 'pick', 'baby', 'split', 'expand'];
const needed2 = () => { const I = App.ICONS, N = window.NFL_ICONS || {}, kept = Object.keys(I).filter(k => !N[k] && !RETIRED.includes(k));
  return `<div class="r10ic"><div class="r10ic-h">Still needed (${kept.length})${kept.length ? '' : ': nothing; every icon is covered'}</div>${kept.length ? `<div class="r10ic-n">${kept.map(k => `<div class="r10ic-nc">${big(I[k], false, 44)}<b>${k}</b><small>${USED[k] || ''}</small></div>`).join('')}</div>` : ''}</div>`; };
/* v3: three plain sections: swapped, ours drawn to match, your call */
const swapped3 = () => { const N = window.NFL_ICONS || {};
  const keys = Object.keys(N).filter(k => !k.endsWith('-on') && !OURS.includes(k) && !REDO.includes(k));
  return `<div class="r10s"><h4 class="r10s-h">1 · Swapped to your NFL icons (${keys.length})</h4><div class="r10s-g">${keys.map(k => `<div class="r10s-c">${big(N[k], true, 32)}<span>${k}</span></div>`).join('')}</div></div>`; };
const PAIR = { explore: 'search', map: 'stadium', book: 'news', tv: 'watch', globe: 'search', mic: 'headphones', radio: 'headphones', whistle: 'football', users: 'user',
  qr: 'ticket', wallet: 'ticket', translate: 'chat', rewind: 'play', video: 'play', dollar: 'ticket', layers: 'grid', plane: 'stadium', car: 'stadium', food: 'bag', a11y: 'help' };
const tile = (inner, nf, label, cls) => `<div class="r10s-t ${cls || ''}">${big(inner, nf, 44)}<small>${label}</small></div>`;
const ours3 = () => { const N = window.NFL_ICONS || {}, A = window.NFL_ICON_ALTS || {};
  const row = (k, extra) => `<div class="r10s-r"><b>${k}</b>${tile(N[k], true, 'ours, matched', 'me')}${extra || ''}${tile(N[PAIR[k]], true, 'NFL: ' + PAIR[k], 'nb')}</div>`;
  const plain = OURS.filter(k => k !== 'whistle' && k !== 'layers');
  return `<div class="r10s"><h4 class="r10s-h">2 · Ours, drawn to match (next to one NFL icon)</h4>
    <div class="r10s-sub">Redrawn this round</div>
    <div class="r10s-rs">
      ${row('whistle', tile(A['whistle-v1'], true, 'v1, your pick'))}
      ${row('layers')}
      ${row('food', tile(A['food-cup'], true, 'option: cup') + tile(A['food-hotdog'], true, 'option: hot dog'))}
      ${row('a11y', tile(A['a11y-figure'], true, 'option: no circle'))}
    </div>
    <div class="r10s-sub">Already fine, matched in size and weight</div>
    <div class="r10s-rs">${plain.concat(['plane', 'car']).map(k => row(k)).join('')}</div></div>`; };
const CALL = [
  ['sparkle', '"Help me pick a team", "New to football"', 'football', 'help'],
  ['sparkle', 'Stat finder, "Ask anything"', 'search', 'chat'],
  ['sparkle', 'Pick\'em autopick', 'refresh', 'star'],
  ['sparkle', 'Gridiron Slate', 'game', 'football'],
  ['medal', 'Hall of Fame', 'star', 'stadium'],
  ['medal', 'Pro Bowl voting', 'star', 'bolt'],
  ['medal', '"Student of the Game" badge, lesson toast', 'check', 'book'] ];
const call3 = () => { const I = App.ICONS, N = window.NFL_ICONS || {}, ic = k => N[k] ? big(N[k], true, 28) : big(I[k], false, 28);
  const r = ([k, w, rec, alt]) => `<div class="r10s-q"><span class="r10s-w"><b>${k}</b> · ${w}</span><span class="r10s-o rec">${ic(rec)}<small>${rec} (recommended)</small></span><span class="r10s-o">${ic(alt)}<small>or ${alt}</small></span></div>`;
  return `<div class="r10s"><h4 class="r10s-h">3 · Your call</h4>${CALL.map(r).join('')}
    <div class="r10s-q"><span class="r10s-w"><b>Retire</b> · zap → bolt (RedZone), game (Mini games), football (sack marker) · pick → check (badge), football (Pick'em empty) · split → grid (Multiview) · crown, baby, expand removed (not on a screen)</span><span class="r10s-o rec"><small>(recommended)</small></span></div></div>`; };
/* v4: outline at rest, the Fill export when active */
const fills4 = () => { const N = window.NFL_ICONS || {}, keys = Object.keys(N).filter(k => k.endsWith('-on')).map(k => k.slice(0, -3)).filter(k => N[k]);
  return `<div class="r10s"><h4 class="r10s-h">4 · Outline at rest, fill when active (${keys.length})</h4><div class="r10s-g">${keys.map(k => `<div class="r10s-c"><span style="display:inline-flex;gap:6px">${big(N[k], true, 28)}${big(N[k + '-on'], true, 28)}</span><span>${k}</span></div>`).join('')}</div></div>`; };
R['nfl-icons'] = { id: 'nfl-icons', v: 4, ready: true, name: 'Icons: the NFL app\'s set', target: 'core.js icon() · app/icons-nfl.js (from assets/icons/nfl-export, built by _build/nficons.mjs)',
  changes: [
    Q2('sounds good but use the fill vs outline depending on what\'s active on the tabs and other icons. so if im on the teams tab use the fill helmet, but if im not use the outline'),
    'Every icon with a Fill export now has two states: outline at rest, fill when active. Tabs: the selected tab fills (Teams shown). Elsewhere: favourites, following, liked, saved and the other "on" states fill. New section 4 shows each pair.',
    'Kept as one shape: the bell (your Off export is the slashed one, so it stays for muted only) and the icons with no Fill export.',
  ],
  options: [{ k: 'a', name: 'NFL set + ours matched to it', note: '' }],
  current: () => V('Today\'s icons', 'Teams tab', SH('Teams', phone('teams'))),
  proposed: k => V('NFL set + ours matched to it', 'every icon the app draws', `${swapped3()}${ours3()}${call3()}${fills4()}${SH('Teams tab active: filled helmet', phone('teams', '&pv=nficons'))}`) };
/* Nov 10: status bar off + time machine on You; mini games as plain colour cards */
const AT10 = sel => '&at=' + encodeURIComponent(sel);
const NOTE10 = 'Your note: "remove the time and status bar from the top. let\'s put the \'time machine\' in the profile page. just above the \'alerts\' section. as for mini games, remove graphics (because they look bad) and just do text on a colored background and remove the \'chiefs fan\' component on mini games, just have the game card sliders. you can remove the description as well"';
R['chrome-nosb'] = { id: 'chrome-nosb', v: 2, ready: true, name: 'No status bar; time machine on You', target: 'core.js boot · .statusbar · you.js',
  changes: ['Your note on v1: "now on device, the icons in the top get cut off by the device\'s rounded corners. fix this"',
    'The top header now drops below the phone\'s status bar and corners (the phone\'s safe area; at least 26px in these previews), with its frosted background running up behind them, so the logo and icons sit clear of the corners.',
    'The drawn status bar (clock, date pill, signal and battery) is gone; every screen starts right at the top, under the phone\'s own status bar.',
    'The time machine is now a row on You, just above Alerts, showing the date and moment it\'s set to. Its old row under Prototype is removed.'],
  options: [{ k: 'a', name: 'No status bar', note: '' }],
  current: () => V('As the app draws it', 'Home · You', `${SH('Home', phone(''))}${SH('You', phone('you'))}`),
  proposed: k => V('No status bar', 'Home · You', `${SH('Home', phone('', '&pv=nosb'))}${SH('You: time machine above Alerts', phone('you', '&pv=nosb'))}`) };
R['mg-plain'] = { id: 'mg-plain', v: 2, ready: true, name: 'Mini games: plain colour cards', target: 'minigames.js strip() · card() · row()',
  changes: ['Your note on v1: "remove the icons next to \'trivia\' \'puzzle\' and \'strategy\'"',
    'The tags are now just the word: Trivia, Puzzle, Strategy.',
    'Home\'s Mini Games section is now just the card rail: no fan card (name, rank, pennant, points) and no "Free to play…" line under it.',
    'Each card is text on its game\'s colour (tag, name, line or streak, Play now) with the field art removed. The Mini games page loses the fan card and the line too, and its rows lose the art.'],
  options: [{ k: 'a', name: 'Text on colour', note: '' }],
  current: () => V('As the app draws it', 'Home · Mini Games', SH('Home', phone('', AT10('.mg-rail!c')))),
  proposed: k => V('Text on colour', 'Home · Mini Games', `${SH('Home', phone('', '&pv=mgplain' + AT10('.mg-rail!c')))}${SH('Mini games page', phone('mini-games', '&pv=mgplain'))}`) };
R['sec-more'] = { id: 'sec-more', v: 2, ready: true, name: 'Section links: bolder, smaller', target: '.sec-head .more · home.js catchUp',
  changes: ['Your note on v1 (A picked): "make this 11px"',
    'A at 11px: every section-head link (See all, Standings, Play more, N updates) extra bold, 11px, grey as now. "1 updates" says "1 update".'],
  options: [{ k: 'a', name: '800, 11px, grey', note: '' }],
  current: () => V('As the app draws it', 'Home', SH('Home', phone('', AT10('.mg-rail!c')))),
  proposed: k => V('Extra bold 11px, grey as now', 'Home', SH('Home', phone('', '&pv=moreA' + AT10('.mg-rail!c')))) };
R['home-tuned'] = { id: 'home-tuned', v: 1, ready: true, name: 'Home: no "tuned for" line', target: 'home.js sheetTop · .hm-st-tuned',
  changes: ['Your note: "we don\'t need \'home tuned for: fan\' on the home page"',
    'The "Home tuned for: Fan" line at the top of the sheet is gone. "Since you last looked" chips still show there when something changed; how Home is tuned stays in You.'],
  options: [{ k: 'a', name: 'Removed', note: '' }],
  current: () => V('As the app draws it', 'Home', SH('Home', phone(''))),
  proposed: k => V('Removed', 'Home', SH('Home', phone('', '&pv=notuned'))) };
R['hero-lost'] = { id: 'hero-lost', v: 1, ready: true, name: 'Home hero: no "Lost N straight"', target: 'home.js homeHero · second line',
  changes: ['From your rule: positive framing (no "lost" or "missed the playoffs" labels).',
    'The hero\'s second line only shows a streak when it\'s a winning one. On a losing run it shows the conference place instead ("13th in the NFC"), as it already does with no streak.'],
  options: [{ k: 'a', name: 'Conference place on a losing run', note: '' }],
  current: () => V('As the app draws it', 'Home · Chargers (0-4)', SH('Home', phone('').replace(/team=\d+/, 'team=24'))),
  proposed: k => V('Conference place on a losing run', 'Home · Chargers', SH('Home', phone('', '&pv=nolost').replace(/team=\d+/, 'team=24'))) };
const ICO = (src, label) => `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:6px;padding:18px 22px;border-radius:18px;background:linear-gradient(160deg,#2b3a55,#141a26)"><img src="${src}" alt="" style="width:60px;height:60px;border-radius:13.5px;box-shadow:0 2px 6px rgba(0,0,0,.35)"><span style="font:500 11px/1 var(--sans);color:#fff">${label}</span></div>`;
R['app-icon'] = { id: 'app-icon', v: 1, ready: true, name: 'Home screen icon', target: 'index.html apple-touch-icon · assets/brand/nfl-app-icon-180.png',
  changes: ['Your note: "when i add this web app to my desktop, the nfl logo is a little big and should be scaled down so it looks better as an app icon"',
    'The shield now sits at about 60% of the tile on the app\'s near-black, centred, instead of filling the whole square edge to edge. Shown at iPhone home screen size (60px, rounded corners).'],
  options: [{ k: 'a', name: 'Shield at 60% on black', note: '' }],
  current: () => V('Today', 'iPhone home screen', ICO('assets/brand/nfl-shield-180.png', 'NFL')),
  proposed: k => V('Shield at 60% on black', 'iPhone home screen', ICO('assets/brand/nfl-app-icon-180.png', 'NFL')) };
})();
