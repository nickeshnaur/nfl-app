/* ============================================================================
   Explore tab root: everything that isn't a main tab, ordered by the football
   calendar (draft week → draft first, free agency → market first, etc.).
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, fmt, store, time } = App;
const UI = App.UI, Dt = App.data;
const sh = (...a) => html`<div class="sec">${UI.secHead(...a)}</div>`;

const L = (go, ic, title, sub, badge) => ({ go, ic, title, sub, badge });
function groups(phase) {
  const G = {
    stats: { title: 'Stats & standings', items: [
      L('#/standings', 'list', 'Standings', 'Divisions, conferences, the whole league'),
      L('#/playoffs', 'trophy', phase === 'post' ? 'Playoff bracket' : 'Playoff picture & machine', 'Seeds today — then play out the rest'),
      L('#/stats', 'chart', 'Stats Center', 'Leaders, records chases, every category'),
      L('#/team-rankings', 'layers', 'Team rankings', 'Offense, defense, EPA, success rate'),
      L('#/stat-finder', 'search', 'Stat finder', 'Ask a question, get the numbers'),
      L('#/compare', 'swap', 'Compare players', 'Side by side, any two players'),
      L('#/calendar', 'calendar', 'League calendar', 'Key dates from kickoff to the draft'),
    ] },
    off: { title: 'Offseason & roster moves', items: [
      L('#/draft', 'star', phase === 'draft' ? 'Draft Night' : 'NFL Draft', 'Every pick, 2024–2026', phase === 'draft' ? 'live' : null),
      L('#/mock-draft', 'edit', 'Mock draft', 'Build your own 2027 first round'),
      L('#/free-agency', 'swap', 'Free agency', 'Signings, trades and releases', phase === 'fa' ? 'live' : null),
      L('#/transactions', 'news', 'Transactions wire', 'Every move, every team'),
      L('#/cap', 'dollar', 'Contracts & cap', 'Top deals, payrolls, expiring contracts'),
    ] },
    gameday: { title: 'Go to a game', items: [
      L('#/tickets', 'ticket', 'Tickets', 'Find seats for any game'),
      L('#/wallet', 'wallet', 'Ticket wallet', 'Your tickets, parking and passes'),
      L('#/stadiums', 'stadium', 'Stadium guides', 'Food, bags, transit, seats'),
      L('#/stadiums?f=visited', 'flag', 'Stadiums visited', 'The venues you\'ve checked in at'),
      L('#/watch-spots', 'users', 'Watch with fans near you', 'Team bars and watch parties in your city'),
      L('#/shop', 'bag', 'Shop', 'Jerseys and gear for your team'),
      L('#/international', 'globe', 'International fans', 'Games abroad, kickoff in your time zone'),
    ] },
    community: { title: 'Play & community', items: [
      L('#/mini-games', 'game', 'Mini games', "Shake & Break and Rank 'Em Rush, new every day", 'new'),
      L('#/pickem', 'target', "Pick 'em", 'Free weekly picks for points — never money'),
      L('#/trivia', 'help', 'Daily trivia', 'Keep your streak alive'),
      L('#/polls', 'chart', 'Fan polls', 'What the fanbase thinks'),
      L('#/community', 'users', 'Squads & chat', 'Your crew, your game threads'),
      L('#/pro-bowl', 'star', 'Pro Bowl voting', 'Send your guys to the Games'),
    ] },
    learn: { title: 'Learn the game', items: [
      L('#/learn', 'book', 'Football 101', 'Short lessons for new fans'),
      L('#/glossary', 'help', 'Glossary', 'Every term, in plain English'),
    ] },
    history: { title: 'History', items: [
      L('#/super-bowls', 'trophy', 'Every Super Bowl', 'I through LX'),
      L('#/records', 'chart', 'Record book', 'Career, season, single game'),
      L('#/hof', 'star', 'Hall of Fame', 'Recent classes'),
      L('#/history', 'clock', 'Franchise histories', 'All 32 teams'),
    ] },
    watch: { title: 'Watch & listen', items: [
      L('#/where-to-watch', 'tv', 'Where to watch', 'Every game, matched to your services'),
      L('#/multiview', 'grid', 'Multi-game view', 'Follow up to four games at once'),
    ] },
  };
  const order = {
    regular: ['stats', 'watch', 'community', 'gameday', 'off', 'learn', 'history'],
    post: ['stats', 'watch', 'community', 'history', 'off', 'gameday', 'learn'],
    fa: ['off', 'stats', 'history', 'community', 'learn', 'gameday', 'watch'],
    draft: ['off', 'stats', 'community', 'history', 'learn', 'gameday', 'watch'],
    summer: ['off', 'gameday', 'learn', 'history', 'stats', 'community', 'watch'],
    camp: ['off', 'gameday', 'stats', 'learn', 'community', 'history', 'watch'],
  }[phase] || ['stats', 'off', 'gameday', 'community', 'learn', 'history', 'watch'];
  if (store.p.level === 'new') { order.splice(order.indexOf('learn'), 1); order.unshift('learn'); }
  return order.map(k => G[k]);
}

function groupList(g) {
  return html`${sh(g.title)}<div class="list">${g.items.map(i => UI.row({
    left: html`<div class="hx-ic">${icon(i.ic)}</div>`, title: i.title, sub: i.sub,
    right: i.badge === 'live' ? raw('<span class="badge live">Live</span>') : i.badge === 'new' ? raw('<span class="badge accent">New</span>') : '', go: i.go }))}</div>`;
}

/* ------------------------------------------------------------------ the directory: lives in Search & explore (the header's search
   button on every main screen); #/explore still opens it as a page for old links */
function directory() {
  const phase = time.phase();
  const quick = [
    ['#/standings', 'list', 'Standings'], ['#/stats', 'chart', 'Stats'],
    phase === 'draft' || phase === 'fa' || phase === 'summer' ? ['#/draft', 'star', 'Draft'] : ['#/playoffs', 'trophy', 'Playoffs'],
    ['#/tickets', 'ticket', 'Tickets'],
  ];
  return html`<div class="ex-quick pad mt16">${quick.map(([go, ic, l]) => html`<a class="ex-q tap" data-go="${go}"><span class="ex-q-ic">${icon(ic)}</span><span>${l}</span></a>`)}</div>
    ${groups(phase).map(groupList)}`;
}
App.exploreDirectory = directory;
App.route('explore', () => {
  return { title: App.t('Explore'), big: true, right: UI.headRight(), html: html`
    <div class="pad mt4"><a class="search-field tap" data-go="#/search">${icon('search', 'sm')}<span>Players, teams, stats, questions…</span></a></div>
    ${directory()}
    <div class="pad mt24 tiny center">Data as of ${fmt.date(time.now())} · ${App.time.moment().label}</div>` };
});
})();
