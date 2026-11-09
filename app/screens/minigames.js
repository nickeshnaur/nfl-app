/* ============================================================================
   NFL Mini Games: daily games that give fans a reason to open the app every
   day. The games themselves aren't built here; every entry point leads to
   the hub, and a game opens a placeholder there.
   Each game has its own colour and field art (from the Mini Games Figma):
   Shake & Break purple, Rank 'Em Rush green, Gridiron Slate blue.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, fmt, store, time } = App;
const Dt = App.data, UI = App.UI;

const GAMES = [
  { k: 'rank-em-rush', n: "Rank 'Em Rush", tag: 'Trivia', ic: 'list', sub: 'Test your football IQ', cls: 'mg-rem', art: 'rem' },
  { k: 'shake-break', n: 'Shake & Break', tag: 'Puzzle', ic: 'grid', sub: 'Run the perfect route', cls: 'mg-sb', art: 'sb' },
  { k: 'gridiron-slate', n: 'Gridiron Slate', tag: 'Strategy', ic: 'sparkle', sub: 'Call the next big play', cls: 'mg-gs', art: 'gs' },
];
// sample streaks and fan points until the games are built and keep their own
const STREAK = { 'shake-break': 5, 'gridiron-slate': 2 };
const ART = {
  sb: '<svg class="mg-art" viewBox="0 0 140 120" aria-hidden="true"><rect x="0" y="0" width="58" height="120" class="l"/><rect x="0" y="70" width="140" height="50" class="l2"/><path d="M40 22H112V88" class="route"/><circle cx="112" cy="22" r="6" class="dot"/><path d="M98 76h-6v-6M126 76h6v-6M98 100h-6v6M126 100h6v6" class="brk"/><circle cx="112" cy="88" r="8" class="ball"/></svg>',
  rem: '<svg class="mg-art" viewBox="0 0 140 120" aria-hidden="true"><path d="M0 46L70 14L140 46V120H0Z" class="l"/><path d="M0 78L70 50L140 78V120H0Z" class="l2"/><path d="M14 40l14-6M48 26l14-6M80 20l14 6M112 34l14 6" class="dash"/><path d="M60 120Q78 64 98 120M92 120Q110 64 130 120" class="post"/><path d="M50 94H140M54 104H140M58 114H140" class="yard"/></svg>',
  gs: '<svg class="mg-art" viewBox="0 0 140 120" aria-hidden="true"><defs><pattern id="mg-gs-st" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="4" height="8" class="st"/></pattern></defs><rect x="78" y="0" width="62" height="28" rx="12" class="d"/><rect x="0" y="56" width="66" height="64" rx="10" class="d"/><rect x="0" y="56" width="66" height="64" rx="10" fill="url(#mg-gs-st)"/><rect x="74" y="56" width="66" height="64" class="l"/><path d="M110 36V50" class="dash"/></svg>',
};

/** time until tomorrow's games drop (local midnight) */
function untilNext() {
  const now = time.now(), d = new Date(now); d.setHours(24, 0, 0, 0);
  const m = Math.max(0, Math.round((d - now) / 60e3));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}
const today = () => new Date(time.now()).toDateString();
const playedToday = () => { const p = store.p.mgPlayed; return p && p.day === today() ? p.games || [] : []; };
const tag = g => html`<span class="mg-tag">${icon(g.ic, 'xs')}${g.tag}</span>`;

/** a pennant in your team's colours, with its logo and name */
function pennant(tm) {
  const c = tm ? App.teamFill(tm) : '#013369', alt = tm ? tm.alt || '#fff' : '#d50a0a';
  const logo = tm ? tm.logoDark || tm.logo : 'assets/brand/nfl-shield.webp', name = tm ? tm.name.toUpperCase() : 'NFL';
  return raw(`<svg class="mg-pen" viewBox="0 0 170 70" aria-hidden="true"><polygon points="0,2 170,24 0,68" fill="${c}"/><polygon points="0,2 18,4.4 18,65.6 0,68" fill="${alt}"/><image href="${logo}" x="24" y="20" width="30" height="30"/><text x="60" y="41" transform="rotate(-6 60 41)">${esc(name)}</text></svg>`);
}
/** you, as a mini-games player: fan name, rank this week, pennant, fan points this week and games played today */
function profile() {
  const tm = store.p.primary && Dt.team(store.p.primary), played = playedToday().length;
  const name = store.p.name || (tm ? `${tm.name} fan` : 'NFL fan');
  const seed = tm ? +tm.id : 7, rank = 312 + seed * 141, pts = (store.p.mgWeek || 455) + played * 474;
  return html`<a class="mgp tap" data-go="#/mini-games" style="--c:${tm ? App.teamFill(tm) : 'var(--nfl-navy)'}">
    <div class="mgp-top"><div class="grow"><div class="mgp-n">${name}</div><div class="mgp-rk">${icon('trophy', 'xs')}<b>#${fmt.n(rank)}</b> this week</div></div>${pennant(tm)}</div>
    <div class="mgp-nums"><div><span>This week</span><b>${fmt.n(pts)}<i class="mg-fp">FP</i></b></div>
      <div><span>Games played</span><b>${played}/${GAMES.length}<span class="mg-dots">${GAMES.map((g, i) => html`<i class="${i < played ? 'on' : ''}">${i < played ? icon('check', 'xs') : ''}</i>`)}</span></b></div></div></a>`;
}
/** a game as a card in its own colour: type tag, name, a line or your streak, Play now (See results once played today) */
function card(g) {
  const done = playedToday().includes(g.k), st = STREAK[g.k];
  return html`<a class="mgc ${g.cls} tap" data-go="#/mini-games?g=${g.k}">${raw(ART[g.art])}${tag(g)}<span class="mgc-n">${g.n}</span>
    <span class="mgc-s">${st ? html`${icon('bolt', 'xs fill')}<b>${st} day streak</b>` : g.sub}</span><span class="mg-btn">${done ? 'See results' : 'Play now'}</span></a>`;
}
/** a game as a list row (the hub, Search & explore) */
function row(g) {
  return html`<a class="mgr ${g.cls} tap" data-go="#/mini-games?g=${g.k}"><span class="mgr-art">${raw(ART[g.art])}</span><span class="grow">${tag(g)}<span class="mgr-n">${g.n}</span><span class="mgr-s">${g.sub}</span></span>${icon('chev', 'sm')}</a>`;
}
/** Home: the daily strip */
function strip() {
  return html`<section class="sec">${UI.secHead('NFL Mini Games', 'See all', '#/mini-games')}
    <div class="pad">${profile()}</div>
    <div class="hscroll mg-rail mt12">${GAMES.map(card)}</div>
    <div class="tiny pad mt8">Free to play, just for fun and fan points. New games in ${untilNext()}.</div></section>`;
}
/** today's games count as seen once you open the hub (the header's games button drops its dot) */
const seenToday = () => store.p.mgSeen === today();
App.miniGames = { GAMES, strip, profile, card, row, seenToday };

App.route('mini-games', (params, query) => {
  const g = GAMES.find(x => x.k === query.g);
  if (!seenToday()) { store.p.mgSeen = today(); store.save(); setTimeout(() => document.querySelectorAll('.phead [data-go="#/mini-games"]').forEach(b => { b.setAttribute('aria-label', 'Mini games'); const d = b.querySelector('.ib-dot'); if (d) d.remove(); }), 0); }
  // the games themselves aren't built yet: a game lands on a placeholder in its colour
  if (g) return { title: g.n, back: true, html: html`<div class="mg-hold ${g.cls}">${raw(ART[g.art])}${tag(g)}<div class="mgc-n">${g.n}</div><div class="mgc-s">${g.n} will open here.</div></div>` };
  return {
    title: 'Mini games',
    html: html`<div class="pad mt12">${profile()}</div>
      <div class="sec">${UI.secHead("Today's games")}<div class="list mg-list">${GAMES.map(row)}</div>
      <div class="tiny pad mt8">Free to play, just for fun and fan points. New games in ${untilNext()}.</div></div>`,
  };
});
})();
