/* ============================================================================
   Onboarding — "tell us what kind of fan you are". Full-screen modal, every
   step skippable. Builds a draft profile and commits it on the final step.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, store, fmt } = App;
const UI = App.UI, Dt = App.data;

const STEPS = ['welcome', 'level', 'team', 'more', 'players', 'location', 'watch', 'alerts', 'done'];
const LEVELS = [
  { k: 'new', ic: 'football', t: 'New to football', d: 'Explain things as I go. Rules, terms, why that just happened.', depth: 1 },
  { k: 'casual', ic: 'tv', t: 'Casual fan', d: 'Scores, highlights and the big stories. Keep it simple.', depth: 2 },
  { k: 'diehard', ic: 'fire', t: 'Die-hard', d: 'Every snap, every injury report, every roster move.', depth: 3 },
  { k: 'analyst', ic: 'chart', t: 'Stats nerd', d: 'EPA, splits, All-22, advanced numbers. Give me everything.', depth: 3 },
];
const ALERTS = [
  { k: 'essentials', t: 'Essentials', d: 'Kickoff and final scores for your teams, plus breaking news.', n: { scoring: false, final: true, kickoff: true, news: true, injuries: false, players: false } },
  { k: 'scores', t: 'Every score', d: 'Each touchdown and field goal as it happens, and finals.', n: { scoring: true, final: true, kickoff: true, news: false, injuries: false, players: false } },
  { k: 'all', t: 'All in', d: 'Scores, injuries, roster moves and your players\' big plays.', n: { scoring: true, final: true, kickoff: true, news: true, injuries: true, players: true } },
  { k: 'quiet', t: 'Quiet', d: 'No push alerts. Everything is still in your inbox.', n: { scoring: false, final: false, kickoff: false, news: false, injuries: false, players: false } },
];
const TIERS = [
  { k: 'free', n: 'No subscription', price: 'Free', inc: ['Live scores, drive charts & stats', 'Highlights and the free NFL Channel', 'Where-to-watch for every game'] },
  { k: 'plus', n: 'NFL+', price: '$6.99/mo', inc: ['Live local & primetime games on your phone', 'Live audio for every game', 'NFL Films & ad-free highlights'] },
  { k: 'premium', n: 'NFL+ Premium', price: '$14.99/mo', inc: ['Everything in NFL+', 'NFL RedZone', 'Full & condensed replays, All-22'] },
];

/* ---------------------------------------------------------------- team-finder quiz */
const QUIZ = [
  { k: 'region', q: 'Where do you live?', o: [
    ['ne', 'Northeast', 'BUF NE NYJ NYG PHI PIT BAL WAS'], ['south', 'South', 'ATL CAR NO TB JAX MIA HOU DAL TEN'],
    ['mw', 'Midwest', 'CHI DET GB MIN CIN CLE IND KC'], ['west', 'West', 'DEN LV LAC LAR SF SEA ARI'],
    ['intl', 'Outside the US', 'JAX KC DAL GB PIT SF PHI MIA'] ] },
  { k: 'style', q: 'What gets you off the couch?', o: [
    ['off', 'Points. Lots of them.', '@off'], ['def', 'A defense that hits hard', '@def'],
    ['rise', 'A team on the rise', '@rise'], ['win', 'Winning. Now.', '@win'] ] },
  { k: 'color', q: 'Pick a colour', o: [
    ['red', 'Red', 'ARI ATL KC SF TB HOU WAS'], ['blue', 'Blue', 'DAL NYG IND BUF LAR LAC DET TEN NE CHI DEN SEA'],
    ['green', 'Green', 'GB NYJ PHI SEA'], ['gold', 'Black & gold', 'PIT NO JAX LAR'], ['orange', 'Orange', 'CIN CLE DEN CHI MIA'],
    ['purple', 'Purple', 'BAL MIN'], ['silver', 'Silver & black', 'LV DAL'] ] },
  { k: 'story', q: 'Which story do you want to be part of?', o: [
    ['storied', 'A storied dynasty', 'GB PIT DAL SF NE NYG CHI KC'], ['new', 'A new era starting now', 'HOU WAS CHI JAX LAC DEN ARI NE'],
    ['under', 'The long-suffering underdog', 'DET CLE CIN BUF MIN LV NYJ TEN CAR'] ] },
];
function quizResult(ans) {
  const end = Date.parse('2026-02-20T00:00:00Z');
  const st25 = Dt.standings(2025, end).all, st24 = Dt.standings(2024, Date.parse('2025-02-20T00:00:00Z')).all;
  const by = {}; st25.forEach(r => by[r.t.abbr] = r); const prev = {}; st24.forEach(r => prev[r.t.abbr] = r);
  const ranked = key => Object.values(by).sort(key).slice(0, 8).map(r => r.t.abbr);
  const dyn = { '@off': ranked((a, b) => b.pf - a.pf), '@def': ranked((a, b) => a.pa - b.pa),
    '@rise': ranked((a, b) => (b.w - (prev[b.t.abbr]?.w || 0)) - (a.w - (prev[a.t.abbr]?.w || 0))), '@win': ranked((a, b) => b.w - a.w) };
  const score = {}, why = {};
  QUIZ.forEach(q => {
    const pick = q.o.find(o => o[0] === ans[q.k]); if (!pick) return;
    const list = pick[2].startsWith('@') ? dyn[pick[2]] : pick[2].split(' ');
    list.forEach((a, i) => { score[a] = (score[a] || 0) + (pick[2].startsWith('@') ? 2 - i * 0.12 : 1.5); (why[a] = why[a] || []).push(pick[1]); });
  });
  return Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => ({ t: Dt.team(a), why: why[a], r: by[a] }));
}

/* ---------------------------------------------------------------- state */
let M = null, ob = null, step = 0, quiz = null, q = '', locMode = 'us';
function fresh() {
  const p = JSON.parse(JSON.stringify(store.p));
  return p;
}
function start(opts = {}) {
  ob = fresh(); step = opts.step || 0; quiz = null; q = ''; locMode = (ob.location.country || 'US') === 'US' ? 'us' : 'intl';
  App.closeOverlays(true);
  M = App.modal({ className: 'ob', html: '', mount: () => () => { M = null; } });
  Dt.ensureBox(Dt.seasonForStats()).then(() => { if (M && STEPS[step] === 'players') paint(); }).catch(() => {});
  paint();
}
function paint() {
  if (!M) return;
  const keep = M.querySelector('.ob-body')?.scrollTop || 0;
  const k = STEPS[step];
  M.innerHTML = String(App.val(frame(k)));
  // preview the fan's #1 team colours as they pick
  const tm = ob.primary && Dt.team(ob.primary);
  if (tm) { const a = App.readable(tm); M.style.setProperty('--accent', a); M.style.setProperty('--accent-ink', App.lum(a) > .45 ? '#0a0a0a' : '#fff'); }
  else { M.style.removeProperty('--accent'); M.style.removeProperty('--accent-ink'); }
  // the Continue button is ink until a team is picked, then the team's real colour with white text, deepened only where white fails 4.5:1 (ob-continue C)
  M.classList.toggle('ob-picked', !!tm); M.classList.toggle('ob-cta-black', !!tm && App.lum(App.teamFill(tm)) < .004);
  if (tm) M.style.setProperty('--ob-cta', App.onWhite(App.teamFill(tm))); else M.style.removeProperty('--ob-cta');
  const body = M.querySelector('.ob-body'); if (body && !paint.reset) body.scrollTop = keep; paint.reset = false;
  const inp = M.querySelector('input[data-ob-search]');
  if (inp) { inp.value = q; inp.addEventListener('input', () => { q = inp.value; const sel = inp.selectionStart; paintList(); }); }
}
/** re-render only the searchable list (keeps keyboard focus) */
function paintList() {
  const box = M.querySelector('.ob-list'); if (!box) return;
  box.innerHTML = String(App.val(STEPS[step] === 'players' ? playerList() : marketList()));
}
function go(n) {
  // no team picked: there's nothing to add "more" to, so hop over that step
  if (STEPS[n] === 'more' && !ob.primary) n += n > step ? 1 : -1;
  step = Math.max(0, Math.min(STEPS.length - 1, n)); q = ''; paint.reset = true; if (STEPS[step] === 'done') commit(); paint(); }

/* ---------------------------------------------------------------- frame */
function frame(k) {
  if (k === 'welcome') return welcome();
  if (k === 'done') return done();
  const idx = step - 1, total = STEPS.length - 2;
  const body = quiz ? quizView() : ({ level, team: teamStep, more, players, location, watch, alerts })[k]();
  const cta = quiz ? '' : ctaFor(k);
  return html`<div class="ob-top">
      <button class="icon-btn" data-act="ob-back" aria-label="Back">${icon('back')}</button>
      <div class="ob-prog">${Array.from({ length: total }, (_, i) => html`<i class="${i < idx ? 'done' : i === idx ? 'on' : ''}"></i>`)}</div>
      <button class="ob-skip" data-act="ob-next">Skip</button></div>
    <div class="ob-body">${body}</div>${cta}`;
}
function ctaFor(k) {
  const extra = ob.teams.filter(id => id !== ob.primary).length, mine = ob.primary && Dt.team(ob.primary);
  const label = { level: 'Continue', team: mine ? `Continue with the ${mine.name}` : 'Continue', more: extra ? `Follow ${extra} more team${extra > 1 ? 's' : ''}` : 'Not now', players: ob.players.length ? `Follow ${ob.players.length} player${ob.players.length > 1 ? 's' : ''}` : 'Continue', location: 'Continue', watch: 'Continue', alerts: 'Finish' }[k];
  const sel = k === 'more' && mine ? html`<div class="ob-picked"><span class="ob-pchip prim" style="--tc:${App.readable(mine)}">${UI.logo(mine.id, 'sm')}${mine.abbr}${icon('star', 'xs fill')}</span>${ob.teams.filter(id => id !== mine.id).map(id => html`<span class="ob-pchip">${UI.logo(id, 'sm')}${Dt.team(id).abbr}</span>`)}</div>` : '';
  return html`<div class="ob-foot">${sel}<button class="btn primary block ob-cta" data-act="ob-next">${label}</button></div>`;
}

/* ---------------------------------------------------------------- steps */
function welcome() {
  const logos = Dt.D.teams.map(t => t.id);
  // approved round 6 (ob-welcome v7): three rows of 11, 11 and 10, every team in exactly one row; each row loops on its own
  const rowL = (a) => html`<div class="ob-marq-row">${a.concat(a).map(id => UI.logo(id, 'lg'))}</div>`;
  return html`<div class="ob-welcome">
    <div class="ob-marq">${rowL(logos.slice(0, 11))}${rowL(logos.slice(11, 22))}${rowL(logos.slice(22))}</div>
    <div class="ob-wel-copy">
      <img class="nfl-shield ob-shield" src="assets/brand/nfl-shield.webp" alt="NFL">
      <div class="ob-wel-h">Football, built<br>around you.</div>
      <div class="ob-wel-s">Live games, every stat, every story, tuned to the teams and players you love. Takes about a minute.</div>
      <button class="btn white block mt24" data-act="ob-next">Get started</button>
      <button class="btn block ob-ghost mt8" data-act="ob-explore">I'll look around first</button>
    </div></div>`;
}
function level() {
  return html`<div class="ob-h">What kind of fan are you?</div><div class="ob-s">We'll set how deep the app goes. You can change it any time.</div>
    <div class="ob-opts">${LEVELS.map(l => html`<button class="ob-opt ${ob.level === l.k ? 'on' : ''}" data-act="ob-level" data-arg="${l.k}">
      <span class="ob-opt-ic">${icon(l.ic)}</span><span class="grow"><span class="ob-opt-t">${l.t}</span><span class="ob-opt-d">${l.d}</span></span>
      <span class="ob-radio"></span></button>`)}</div>
    <div class="ob-depth"><div class="eyebrow">Detail level</div><div class="ob-depth-bar">${[1, 2, 3].map(d => html`<button class="${ob.depth === d ? 'on' : ''}" data-act="ob-depth" data-arg="${d}">${['Surface', 'Standard', 'Deep'][d - 1]}</button>`)}</div></div>`;
}
/** all 32 A to Z by city, one grid (ob-alpha A). 'team' picks your one team; 'more' toggles the extras */
function grid(mode) {
  return html`<div class="ob-teams">${[...Dt.D.teams].sort((a, b) => a.full.localeCompare(b.full)).map(tm => {
    const prim = ob.primary === tm.id, on = mode === 'team' ? prim : ob.teams.includes(tm.id);
    return UI.teamTile(tm.id, { on, act: mode === 'team' ? 'ob-pick' : 'ob-team', badge: prim ? 'star' : '', disabled: mode === 'more' && prim });
  })}</div>`;
}
function teamStep() {
  return html`<div class="ob-h">Who's your team?</div><div class="ob-s">Pick one. Home, scores and alerts are built around them, and the app wears their colours. You can follow more teams next.</div>
    ${grid('team')}
    <button class="ob-noteam" data-act="ob-quiz">${icon('help', 'sm')}<span class="grow"><b>I don't have a team yet</b><span>Answer four quick questions and we'll find your match.</span></span>${icon('chev', 'sm')}</button>`;
}
function more() {
  const mine = Dt.team(ob.primary);
  const rivals = Dt.D.teams.filter(t => t.conf === mine.conf && t.div === mine.div && t.id !== mine.id);
  return html`<div class="ob-h">Follow other teams too?</div><div class="ob-s">Optional. A rival, a second favourite, the team you grew up with. They show up in your scores and alerts. The ${mine.name} stay your team.</div>
    <div class="ob-div" style="margin-top:18px">${mine.name} rivals</div>
    <div class="ob-teams" style="grid-template-columns:repeat(3,1fr)">${rivals.map(tm => UI.teamTile(tm.id, { on: ob.teams.includes(tm.id), act: 'ob-team' }))}</div>
    ${grid('more')}`;
}
function quizView() {
  const qi = QUIZ.findIndex(x => !quiz[x.k]);
  if (qi >= 0) {
    const Q = QUIZ[qi];
    return html`<div class="eyebrow">Find your team · ${qi + 1} of ${QUIZ.length}</div><div class="ob-h mt8">${Q.q}</div>
      <div class="list mt16">${Q.o.map(o => html`<button class="row tap ob-qa" data-act="ob-quiz-ans" data-arg="${Q.k}:${o[0]}"><div class="row-main"><div class="row-title">${o[1]}</div></div>${icon('chev', 'sm')}</button>`)}</div>
      <button class="ob-qlink" data-act="ob-quiz-exit">Back to all teams</button>`;
  }
  const res = quizResult(quiz);
  return html`<div class="eyebrow">Your matches</div><div class="ob-h mt8">Meet your new teams</div><div class="ob-s">Pick the one that feels right. You can follow the others next, and switch any time.</div>
    <div class="ob-matches">${res.map((m, i) => { const on = ob.primary === m.t.id; return html`<div class="ob-match" style="${raw(App.teamVars(m.t))}">
      <div class="ob-match-top">${UI.logo(m.t.id, 'lg')}<div class="grow"><div class="ob-match-r">${i === 0 ? 'Best match · ' : ''}${m.r ? `2025: ${m.r.w}-${m.r.l}${m.r.tie ? '-' + m.r.tie : ''}` : ''}</div><div class="ob-match-n">${m.t.name.toUpperCase()}</div></div></div>
      <p class="ob-match-why">${(m.why || []).slice(0, 3).map(w => w.replace(/\.$/, '')).join(' · ')}</p>
      <button class="btn sm ${on ? 'ob-match-on' : 'white'}" data-act="ob-pick" data-arg="${m.t.id}">${icon(on ? 'star' : 'plus', 'sm' + (on ? ' fill' : ''))}${on ? 'Your team' : 'Make them my team'}</button></div>`; })}</div>
    <div class="flex gap8 mt16"><button class="btn ghost sm" data-act="ob-quiz">Retake</button><button class="btn primary sm grow" data-act="ob-quiz-exit">Done</button></div>`;
}
function suggestions() {
  const s = Dt.seasonForStats();
  const tot = Dt.seasonTotals(s);
  if (!tot) return null;
  const L = Object.values(tot).filter(x => Dt.player(x.pid));
  const top = (arr, f, n) => arr.filter(f).sort((a, b) => b.fpts - a.fpts).slice(0, n);
  const groups = ob.teams.map(tid => ({ title: 'From the ' + Dt.team(tid).name, ids: [
    ...top(L, x => Dt.player(x.pid).t === tid && ['QB', 'RB', 'WR', 'TE'].includes(Dt.player(x.pid).pos), 5).map(x => x.pid),
    ...L.filter(x => Dt.player(x.pid).t === tid && x.cats.defensive).sort((a, b) => ((b.cats.defensive.sacks || 0) * 6 + (b.cats.defensive.totalTackles || 0)) - ((a.cats.defensive.sacks || 0) * 6 + (a.cats.defensive.totalTackles || 0))).slice(0, 2).map(x => x.pid)] }));
  groups.push({ title: 'League stars this season', ids: top(L, x => !ob.teams.includes(Dt.player(x.pid).t), 10).map(x => x.pid) });
  return groups;
}
function pTile(pid) {
  const p = Dt.player(pid); if (!p) return '';
  const on = ob.players.includes(pid), tm = Dt.team(p.t);
  const line = statLine(pid);
  return html`<button class="ob-player ${on ? 'on' : ''}" data-act="ob-player" data-arg="${pid}">${UI.hs(pid)}<span class="grow"><span class="ob-pn">${p.n}</span><span class="ob-pm">${p.pos} · ${tm ? tm.name : ''}${line ? html` · <span class="num">${line}</span>` : ''}</span></span><span class="ob-tog">${icon(on ? 'check' : 'plus', 'sm')}</span></button>`;
}
/** one headline number for the current season, e.g. "1,381 pass yds" */
function statLine(pid) {
  const tot = Dt.seasonTotals(Dt.seasonForStats()); const L = tot && tot[pid]; if (!L) return '';
  const c = L.cats, n = v => fmt.n(v);
  if (c.passing && c.passing.passingAttempts > 20) return `${n(c.passing.passingYards)} pass yds, ${c.passing.passingTouchdowns} TD`;
  if (c.rushing && (!c.receiving || c.rushing.rushingYards > c.receiving.receivingYards)) return `${n(c.rushing.rushingYards)} rush yds, ${c.rushing.rushingTouchdowns} TD`;
  if (c.receiving) return `${c.receiving.receptions} rec, ${n(c.receiving.receivingYards)} yds`;
  if (c.defensive) return `${c.defensive.totalTackles || 0} tkl, ${c.defensive.sacks || 0} sacks`;
  return '';
}
function playerList() {
  if (q.trim().length >= 2) {
    const r = Dt.search(q, 12).players;
    return r.length ? html`<div class="ob-pgroup">${r.map(p => pTile(p.id))}</div>` : html`<div class="meta center mt16">No players match "${q}"</div>`;
  }
  const g = suggestions();
  if (!g) return UI.loading();
  const extra = ob.players.filter(id => !g.some(x => x.ids.includes(id)));
  return html`${extra.length ? html`<div class="ob-div">Following</div><div class="ob-pgroup">${extra.map(pTile)}</div>` : ''}
    ${g.filter(x => x.ids.length).map(x => html`<div class="ob-div">${x.title}</div><div class="ob-pgroup">${x.ids.map(pTile)}</div>`)}`;
}
function players() {
  return html`<div class="ob-h">Any players you follow?</div><div class="ob-s">On any team. You'll get their highlights, live stat lines and news.</div>
    <div class="search-field mt16">${icon('search', 'sm')}<input data-ob-search placeholder="Search 2,500+ players" autocomplete="off"></div>
    <div class="ob-list">${playerList()}</div>`;
}
function marketList() {
  if (locMode === 'us') {
    const list = Dt.MARKETS.filter(m => !q || m[0].toLowerCase().includes(q.toLowerCase()));
    return html`${list.map(m => { const on = ob.location.city === m[0] && ob.location.country === 'US'; return html`<button class="ob-loc ${on ? 'on' : ''}" data-act="ob-market" data-arg="${m[0]}">
      <span class="grow"><span class="ob-pn">${m[0]}</span><span class="ob-pm">${m[2].length ? 'Local team' + (m[2].length > 1 ? 's' : '') + ': ' + m[2].join(', ') : 'No local team'}</span></span>
      <span class="flex gap4">${m[2].map(a => UI.logo(Dt.team(a).id, 'sm'))}</span><span class="ob-radio"></span></button>`; })}`;
  }
  const list = Dt.COUNTRIES.filter(c => c[0] !== 'US' && (!q || c[1].toLowerCase().includes(q.toLowerCase())));
  return html`${list.map(c => { const on = ob.location.country === c[0]; return html`<button class="ob-loc ${on ? 'on' : ''}" data-act="ob-country" data-arg="${c[0]}">
    <span class="ob-cc">${c[0]}</span><span class="grow"><span class="ob-pn">${c[1]}</span><span class="ob-pm">${tzNote(c[2])}</span></span><span class="ob-radio"></span></button>`; })}`;
}
function tzNote(tz) {
  // Sunday 1:00 PM ET kickoff, shown locally
  const d = new Date('2026-10-18T17:00:00Z');
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz, weekday: 'short' });
  return `1:00 PM ET kickoffs show as ${t}`;
}
function location() {
  return html`<div class="ob-h">Where are you watching from?</div><div class="ob-s">So we can show your local games, kickoff times in your time zone, and how to watch.</div>
    <div class="ob-seg mt16"><button class="${locMode === 'us' ? 'on' : ''}" data-act="ob-locmode" data-arg="us">In the US</button><button class="${locMode === 'intl' ? 'on' : ''}" data-act="ob-locmode" data-arg="intl">Outside the US</button></div>
    <div class="search-field mt12">${icon('search', 'sm')}<input data-ob-search placeholder="${locMode === 'us' ? 'Search cities' : 'Search countries'}" autocomplete="off"></div>
    <div class="ob-list mt8">${marketList()}</div>`;
}
function watch() {
  const intl = (ob.location.country || 'US') !== 'US';
  const provs = Dt.PROVIDERS.filter(p => intl ? p.k === 'dazn' : p.k !== 'dazn');
  if (intl) {
    const has = ob.providers.includes('dazn');
    return html`<div class="ob-h">How do you watch?</div><div class="ob-s">Outside the US, every game streams live on NFL Game Pass on DAZN.</div>
      <div class="ob-tiers">
        <button class="ob-tier ${has ? 'on' : ''}" data-act="ob-prov" data-arg="dazn"><div class="flex between"><span class="ob-tier-n">I have Game Pass on DAZN</span><span class="ob-radio"></span></div>
          <ul><li>Every game live and on demand</li><li>NFL RedZone and condensed replays</li><li>Commentary in some local languages</li></ul></button>
        <button class="ob-tier ${!has ? 'on' : ''}" data-act="ob-prov-none"><div class="flex between"><span class="ob-tier-n">Not yet</span><span class="ob-radio"></span></div>
          <ul><li>You still get scores, stats, highlights and news</li><li>DAZN includes one free live game a week</li></ul></button>
      </div><div class="ob-note">${icon('info', 'sm')}<span>NFL+ isn't available outside the US. Nothing here locks you out of the app.</span></div>`;
  }
  return html`<div class="ob-h">How do you watch?</div><div class="ob-s">We'll show you exactly where every game is on. No subscription needed to use the app.</div>
    <div class="ob-tiers">${TIERS.map(tr => html`<button class="ob-tier ${ob.sub === tr.k ? 'on' : ''} t-${tr.k}" data-act="ob-sub" data-arg="${tr.k}">
      <div class="flex between gap8"><span class="ob-tier-n">${tr.n}</span><span class="flex gap8"><span class="ob-price">${tr.price}</span><span class="ob-radio"></span></span></div>
      <ul>${tr.inc.map(i => html`<li>${i}</li>`)}</ul></button>`)}</div>
    <div class="ob-div">Anything else you watch on?</div>
    <div class="ob-provs">${provs.map(p => html`<button class="sc-season ob-prov ${ob.providers.includes(p.k) ? 'on' : ''}" data-act="ob-prov" data-arg="${p.k}">${ob.providers.includes(p.k) ? icon('check', 'xs') : ''}${p.n}</button>`)}</div>`;
}
function alerts() {
  const cur = ob.notif.preset;
  return html`<div class="ob-h">How much should we buzz you?</div><div class="ob-s">Alerts for ${ob.teams.length ? ob.teams.map(id => Dt.team(id).name).join(', ') : 'your teams'}${ob.players.length ? ' and ' + ob.players.length + ' players' : ''}.</div>
    <div class="ob-opts">${ALERTS.map(a => html`<button class="ob-opt ${cur === a.k ? 'on' : ''}" data-act="ob-alert" data-arg="${a.k}"><span class="grow"><span class="ob-opt-t">${a.t}</span><span class="ob-opt-d">${a.d}</span></span><span class="ob-radio"></span></button>`)}</div>
    <button class="ob-spoil ${ob.spoiler.on ? 'on' : ''}" data-act="ob-spoiler">
      <span class="ob-opt-ic">${icon('eyeoff')}</span><span class="grow"><span class="ob-opt-t">Spoiler shield</span><span class="ob-opt-d">Watching later? We'll hide your teams' scores everywhere, alerts included, until you've seen the game.</span></span>
      <span class="toggle ${ob.spoiler.on ? 'on' : ''}"></span></button>`;
}
function done() {
  const tm = ob.primary && Dt.team(ob.primary);
  // approved round 6 (ob-done B): with a team, onboarding ends on the fan card from You, then what you picked
  const Y = App.youParts;
  return html`<div class="ob-done" style="${raw(tm ? App.teamVars(tm) : '')}">
    ${tm && Y ? html`<div class="ob-done-card">${Y.fanCard(tm, Y.levelInfo(store.p.points || 0), Y.picksRecord())}</div>` : html`<div class="ob-done-hero">
      <img class="nfl-shield ob-shield" src="assets/brand/nfl-shield.webp" alt="NFL">
      <div class="ob-done-h">You're all set.</div>
      <div class="ob-done-s">Your app is tuned and ready.</div>
    </div>`}
    <div class="ob-done-body">
      <div class="ob-sum">
        ${sumRow('star', 'Your team', tm ? tm.full : 'None yet')}
        ${tm ? sumRow('teams', 'Also following', ob.teams.length > 1 ? ob.teams.filter(id => id !== tm.id).map(id => Dt.team(id).abbr).join(' · ') : 'Just them') : ''}
        ${sumRow('users', 'Players', ob.players.length ? ob.players.length + ' followed' : 'None yet')}
        ${sumRow('pin', 'Location', ob.location.country === 'US' ? (ob.location.city || 'United States') : (Dt.COUNTRIES.find(c => c[0] === ob.location.country) || [])[1])}
        ${sumRow('tv', 'Watching', (ob.location.country || 'US') !== 'US' ? (ob.providers.includes('dazn') ? 'Game Pass on DAZN' : 'Free') : (TIERS.find(x => x.k === ob.sub) || TIERS[0]).n)}
        ${sumRow('eyeoff', 'Spoiler shield', ob.spoiler.on ? 'On' : 'Off')}
      </div>
      ${ob.level === 'new' ? html`<div class="ob-learn"><div class="ob-opt-ic">${icon('book')}</div><div class="grow"><div class="ob-opt-t">New to football? Start here.</div><div class="ob-opt-d">Football 101: five short lessons. Then tap any dotted word in the app for a quick explanation.</div>
        <button class="btn sm ghost mt12" data-go="#/learn">Open Football 101</button></div></div>` : ''}
      <button class="btn primary block mt20 ob-cta" data-act="ob-finish">Open my NFL</button>
      <div class="tiny center mt12">Change any of this in You → Settings, or restart onboarding.</div>
    </div></div>`;
}
const sumRow = (ic, k, v) => html`<div class="ob-sum-row">${icon(ic, 'sm')}<span class="grow">${k}</span><b>${v}</b></div>`;

/* ---------------------------------------------------------------- commit */
function commit() {
  App.normTeams(ob);
  const intl = (ob.location.country || 'US') !== 'US';
  if (intl) ob.sub = 'free';
  Object.assign(store.p, ob, { onboarded: true, lastOpen: App.time.now() });
  store.save(); App.applyTheme();
}
function finish() {
  commit();
  App.closeModal();
  App.refreshAll(); App.showTab('home', { reset: true });
  const tm = store.p.primary && Dt.team(store.p.primary);
  App.toast({ title: tm ? `Your NFL is ready` : 'Welcome to the NFL', body: tm ? `Built around the ${tm.name}${store.p.teams.length > 1 ? `, plus ${store.p.teams.length - 1} more` : ''}` : 'Follow teams any time from Teams.', logo: tm ? tm.logoDark : null, icon: 'check' });
}

/* ---------------------------------------------------------------- actions */
const A = App.actions;
A['ob-next'] = () => { if (STEPS[step] === 'alerts' && !ob.notif.preset) ob.notif.preset = 'essentials'; go(step + 1); };
A['ob-back'] = () => { if (quiz) { quiz = null; return paint(); } go(step - 1); };
A['ob-explore'] = () => { ob.notif.preset = ob.notif.preset || 'essentials'; finish(); };
A['ob-finish'] = () => finish();
A['ob-level'] = (el, ev, k) => { ob.level = k; ob.depth = LEVELS.find(l => l.k === k).depth; ob.learnTips = k === 'new'; paint(); };
A['ob-depth'] = (el, ev, d) => { ob.depth = +d; paint(); };
A['ob-team'] = (el, ev, id) => {
  const i = ob.teams.indexOf(id);
  if (id === ob.primary) return;
  if (i >= 0) ob.teams.splice(i, 1); else ob.teams.push(id);
  paint();
};
A['ob-pick'] = (el, ev, id) => {
  const was = ob.primary;
  ob.primary = was === id ? null : id;
  ob.teams = (ob.primary ? [ob.primary] : []).concat(ob.teams.filter(x => x !== id && x !== was));
  paint();
};
A['ob-quiz'] = () => { quiz = {}; paint.reset = true; paint(); };
A['ob-quiz-ans'] = (el, ev, arg) => { const [k, v] = arg.split(':'); quiz[k] = v; paint.reset = true; paint(); };
A['ob-quiz-exit'] = () => { quiz = null; paint(); };
A['ob-player'] = (el, ev, id) => {
  const i = ob.players.indexOf(id); if (i >= 0) ob.players.splice(i, 1); else ob.players.push(id);
  const btn = el; btn.classList.toggle('on', i < 0); btn.querySelector('.ob-tog').innerHTML = String(icon(i < 0 ? 'check' : 'plus', 'sm'));
  const cta = M.querySelector('.ob-cta'); if (cta) cta.textContent = ob.players.length ? `Follow ${ob.players.length} player${ob.players.length > 1 ? 's' : ''}` : 'Continue';
  // keep duplicate tiles (same player in two groups) in sync
  M.querySelectorAll(`.ob-player[data-arg="${id}"]`).forEach(b => { if (b !== btn) { b.classList.toggle('on', i < 0); b.querySelector('.ob-tog').innerHTML = String(icon(i < 0 ? 'check' : 'plus', 'sm')); } });
};
A['ob-locmode'] = (el, ev, m) => { locMode = m; q = ''; paint(); };
A['ob-market'] = (el, ev, name) => {
  const m = Dt.MARKETS.find(x => x[0] === name);
  ob.location = { country: 'US', city: name, zip: '', tz: m[1], market: Dt.marketTeams(name) };
  ob.providers = ob.providers.filter(p => p !== 'dazn');
  // suggest local teams if none picked yet
  if (!ob.teams.length) {}
  paintList();
};
A['ob-country'] = (el, ev, cc) => {
  const c = Dt.COUNTRIES.find(x => x[0] === cc);
  ob.location = { country: cc, city: c[1], zip: '', tz: c[2], market: [] };
  ob.lang = c[3]; ob.sub = 'free';
  paintList();
};
A['ob-sub'] = (el, ev, k) => { ob.sub = k; paint(); };
A['ob-prov'] = (el, ev, k) => { const i = ob.providers.indexOf(k); if (i >= 0) ob.providers.splice(i, 1); else ob.providers.push(k); paint(); };
A['ob-prov-none'] = () => { ob.providers = ob.providers.filter(p => p !== 'dazn'); paint(); };
A['ob-alert'] = (el, ev, k) => { const a = ALERTS.find(x => x.k === k); ob.notif = Object.assign({}, ob.notif, a.n, { preset: k }); paint(); };
A['ob-spoiler'] = () => { ob.spoiler = Object.assign({}, ob.spoiler, { on: !ob.spoiler.on }); paint(); };

/** draw one step outside the modal (the design cards): a fresh draft with overrides, optionally mid-quiz */
function view(k, over = {}, qz = null) {
  const keep = [ob, step, quiz, q, locMode];
  ob = Object.assign(fresh(), over); step = STEPS.indexOf(k); quiz = qz; q = ''; locMode = 'us';
  try { return String(App.val(frame(k))); } finally { [ob, step, quiz, q, locMode] = keep; }
}
App.onboarding = { start, STEPS, LEVELS, view, TIERS, ALERTS };
})();
