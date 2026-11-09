/* ============================================================================
   You — profile, follows, personas for exploration, settings.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, store, time, fmt, t } = App;
const UI = App.UI, Dt = App.data;

const LEVEL_N = { new: 'New fan', casual: 'Casual fan', diehard: 'Die-hard', analyst: 'Stats nerd' };
const SUB_N = { free: 'Free', plus: 'NFL+', premium: 'NFL+ Premium' };
const LANGS = [['en', 'English', 'English'], ['es', 'Español', 'Spanish'], ['de', 'Deutsch', 'German'], ['pt', 'Português', 'Portuguese'], ['fr', 'Français', 'French'], ['ja', '日本語', 'Japanese']];
const BADGES = [
  ['rookie', 'Rookie', 'star', 'Joined the NFL app'], ['streak7', '7-day streak', 'fire', 'Open the app 7 days in a row'], ['picker', 'Sharp picker', 'target', 'Get 10 picks right'],
  ['trivia', 'Trivia ace', 'help', 'Perfect daily trivia'], ['road', 'Road warrior', 'plane', 'Attend an away game'], ['passport', 'Stadium passport', 'stadium', 'Visit 5 stadiums'],
  ['scholar', 'Football scholar', 'book', 'Finish Football 101'], ['squad', 'Squad captain', 'users', 'Start a fan squad'],
];
const pidByName = n => (Dt.D.playerList.find(p => p.n === n) || {}).id;
const tid = a => Dt.team(a).id;

/* ---------------------------------------------------------------- personas for exploration */
const PERSONAS = [
  { k: 'london', t: 'New fan in London', d: 'Just discovered the NFL at a London game. Explain everything; watches on DAZN.', teams: ['JAX'], players: ['Travis Hunter', 'Trevor Lawrence'],
    p: { level: 'new', depth: 1, learnTips: true, location: { country: 'GB', city: 'United Kingdom', tz: 'Europe/London', market: [] }, lang: 'en', sub: 'free', providers: ['dazn'] }, tags: ['New fan', 'International', 'DAZN'] },
  { k: 'kc', t: 'Chiefs die-hard in KC', d: 'Season ticket holder. Every snap, injury report and depth-chart change. Premium.', teams: ['KC'], players: ['Patrick Mahomes', 'Travis Kelce', 'Xavier Worthy'],
    p: { level: 'diehard', depth: 3, location: { country: 'US', city: 'Kansas City', tz: 'America/Chicago', market: ['KC'] }, sub: 'premium', providers: ['yttv', 'prime', 'peacock'] }, tags: ['Die-hard', 'Premium', 'Local'] },
  { k: 'nyc', t: 'Player fan in NYC', d: 'Follows players more than teams. Two teams, a fantasy habit, casual depth.', teams: ['NYJ', 'DET'], players: ["Ja'Marr Chase", 'Bijan Robinson', 'Puka Nacua', 'Jahmyr Gibbs', 'Saquon Barkley', 'Malik Nabers'],
    p: { level: 'casual', depth: 2, location: { country: 'US', city: 'New York', tz: 'America/New_York', market: ['NYG', 'NYJ'] }, sub: 'plus', providers: ['prime', 'peacock', 'netflix'] }, tags: ['Multi-team', 'Players', 'NFL+'] },
  { k: 'brazil', t: 'Eagles fan in São Paulo', d: 'Portuguese, Brasília time, watches every game on Game Pass.', teams: ['PHI'], players: ['Jalen Hurts', 'Saquon Barkley', 'DeVonta Smith'],
    p: { level: 'diehard', depth: 2, location: { country: 'BR', city: 'Brasil', tz: 'America/Sao_Paulo', market: [] }, lang: 'pt', sub: 'free', providers: ['dazn'] }, tags: ['Português', 'International'] },
  { k: 'sea', t: 'Seahawks stats nerd', d: 'Defending champs. EPA, success rate, All-22 film. Lives in the numbers.', teams: ['SEA'], players: ['Jaxon Smith-Njigba', 'Sam Darnold'],
    p: { level: 'analyst', depth: 3, location: { country: 'US', city: 'Seattle', tz: 'America/Los_Angeles', market: ['SEA'] }, sub: 'premium', providers: ['yttv', 'ticket'] }, tags: ['Analyst', 'Premium'] },
  { k: 'delay', t: 'Bills fan, watches later', d: 'Lives in LA, works Sundays, watches the replay at night. Spoiler shield on.', teams: ['BUF'], players: ['Josh Allen'],
    p: { level: 'casual', depth: 2, location: { country: 'US', city: 'Los Angeles', tz: 'America/Los_Angeles', market: ['LAR', 'LAC'] }, sub: 'premium', providers: ['paramount'], spoiler: { on: true, teams: [] } }, tags: ['Spoiler shield', 'Out of market'] },
];
function applyPersona(k) {
  const P = PERSONAS.find(x => x.k === k); if (!P) return;
  store.reset();
  const teams = P.teams.map(tid);
  const loc = Object.assign({}, P.p.location, { market: (P.p.location.market || []).map(tid) });
  Object.assign(store.p, P.p, { location: loc, teams, primary: teams[0], players: P.players.map(pidByName).filter(Boolean), onboarded: true, name: '', points: 340 + PERSONAS.indexOf(P) * 95, streak: 2 + PERSONAS.indexOf(P) * 2, badges: ['rookie', 'streak7', 'trivia'].slice(0, 1 + PERSONAS.indexOf(P) % 3), lastOpen: time.now() - 3 * 864e5 });
  store.p.notif.preset = P.p.level === 'new' ? 'essentials' : 'scores';
  store.save(); App.applyTheme();
  App.refreshAll(); App.showTab('home', { reset: true });
  const tm = Dt.team(teams[0]);
  App.toast({ title: `Now exploring as: ${P.t}`, body: P.tags.join(' · '), logo: tm.logoDark });
}

/* ---------------------------------------------------------------- helpers */
function picksRecord() {
  let w = 0, l = 0;
  Object.entries(store.p.picks || {}).forEach(([gid, pick]) => {
    const g = Dt.game(gid); if (!g || Dt.state(g) !== 'post') return;
    const winner = g.hs > g.as ? g.h : g.as > g.hs ? g.a : null;
    if (winner === pick) w++; else l++;
  });
  return { w, l };
}
function levelInfo(pts) {
  const tiers = [[0, 'Rookie'], [250, 'Starter'], [600, 'Pro Bowler'], [1200, 'All-Pro'], [2500, 'Hall of Famer']];
  let i = tiers.length - 1; while (i > 0 && pts < tiers[i][0]) i--;
  const next = tiers[i + 1];
  return { n: tiers[i][1], next: next && next[1], pct: next ? (pts - tiers[i][0]) / (next[0] - tiers[i][0]) : 1, need: next ? next[0] - pts : 0 };
}
function locLabel() {
  const l = store.p.location || {};
  if ((l.country || 'US') !== 'US') return (Dt.COUNTRIES.find(c => c[0] === l.country) || [])[1] || l.country;
  return l.city || 'United States';
}
/** settings row (approved round 5): every icon in one squared 32 px tile on surface 2 in the text colour; the value in Sans medium, text 2 */
const setIc = ic => html`<span class="set-ic">${icon(ic)}</span>`;
function setRow(ic, title, val, go) { return UI.row({ left: setIc(ic), title, right: val != null ? html`<span class="set-val">${val}</span>` : '', go }); }

/** fan card (approved 2026-10-29): a membership card on your team's sheet gradient, with a ticket stub.
    Fan number, fan rank and the lucky-charm record are sample values in this prototype. */
function fanCard(tm, lv, pr) {
  const p = store.p, name = (p.name || `${tm.name} fan`).trim().split(/\s+/), s = Dt.seasonForStats();
  const no = String((+tm.id * 7919) % 90000 + 10000), LV = ['Rookie', 'Starter', 'Pro Bowler', 'All-Pro', 'Hall of Famer'], at = Math.max(0, LV.indexOf(lv.n));
  const got = BADGES.filter(b => (p.badges || []).includes(b[0])), nextB = BADGES.find(b => !(p.badges || []).includes(b[0]));
  const nx = Dt.liveGameFor(tm.id) || Dt.nextGame(tm.id), since = p.since || 2019;
  const favId = (p.players || [])[0], fav = favId ? Dt.player(favId) : (Dt.roster(tm.id).find(x => x.pos === 'QB') || null);
  return html`<div class="fc" style="${raw(App.teamVars(tm))}">${UI.helmet(tm.id, { cls: 'fc-hel', face: 'left' })}
    <div class="fc-top"><img src="${tm.logoDark || tm.logo}" alt=""><span class="t-eyebrow grow">Official fan</span><span class="t-stat">No. ${tm.abbr} ${no}</span></div>
    <div class="fc-n t-dxl ${name.join(' ').length > 12 ? 'long' : ''}">${name[0]}${name.length > 1 ? html`<br>${name.slice(1).join(' ')}` : ''}</div>
    <div class="fc-since t-meta">Fan since ${since} · ${fmt.ord(Math.max(1, s - since + 1))} season${nx ? ` · next: ${Dt.isHome(nx, tm.id) ? 'vs' : '@'} ${Dt.team(Dt.opp(nx, tm.id)).name} ${fmt.weekday(nx.ts)}` : ''}</div>
    <div class="fc-lv"><div class="fc-lad">${LV.map((l, i) => html`<i class="${i < at ? 'done' : i === at ? 'on' : ''}">${i === at ? raw(`<b style="width:${Math.round(lv.pct * 100)}%"></b>`) : ''}</i>`)}</div>
      <div class="fc-lvk"><span class="badge solid">${lv.n}</span><span class="t-meta">${lv.next ? `${lv.need} pts to ${lv.next}` : 'Top level'}</span></div></div>
    ${fav ? html`<a class="fc-fav" data-go="#/player/${fav.id}">${UI.hs(fav.id, 'sm')}<div><span class="t-eyebrow">Favourite player</span><div class="t-title-s">${fav.n}${fav.num ? ` · #${fav.num}` : ''}</div></div></a>` : ''}
    <div class="fc-tear" aria-hidden="true"></div>
    <div class="fc-stub"><div class="fc-stats"><div><b class="t-dl">${fmt.n(p.points || 0)}</b><span class="t-eyebrow">Points</span></div><div><b class="t-dl">${p.streak || 0}</b><span class="t-eyebrow">Streak</span></div><div><b class="t-dl">${(p.passport || []).length}</b><span class="t-eyebrow">Stadiums</span></div><div><b class="t-dl">${pr.w}-${pr.l}</b><span class="t-eyebrow">Picks</span></div></div>
      ${got.length ? html`<div class="fc-badges">${got.slice(0, 5).map(b => html`<span class="fc-b">${icon(b[2], 'sm')}${b[1]}</span>`)}</div>` : ''}
      <div class="fc-fun"><div><span class="t-eyebrow">Fan rank</span><b class="t-ds">Top 12%</b><span class="t-meta">of ${tm.name} fans</span></div>
        ${nextB ? html`<div><span class="t-eyebrow">Next badge</span><b class="t-title-s">${nextB[1]}</b><i class="fc-nb"><b style="width:60%"></b></i><span class="t-meta">Keep playing to earn it</span></div>` : ''}</div>
      <div class="fc-foot"><div class="fc-luck"><span class="t-eyebrow">Lucky charm</span><b class="t-ds">3-1</b><span class="t-meta">when you check in</span></div>
        <div class="flex gap8"><button class="btn sm white" data-act="toast" data-arg="Fan card copied to share">${icon('share', 'sm')}Share</button><button class="btn sm tm-ghost" data-go="#/settings">Edit</button></div></div></div></div>`;
}
/** without a team: the plain card */
function oldCard(p, tm, lv, pr) {
  return html`      <div class="you-card" style="${raw(tm ? App.teamVars(tm) : '')}">
        <div class="you-band">${tm ? raw('<i class="stripe"></i>') : ''}</div>
        <div class="you-av">${tm ? html`<img src="${tm.logoDark}" alt="">` : icon('user', 'lg')}</div>
        <div class="you-id">
          <div class="you-name">${p.name || (tm ? tm.name + ' fan' : 'NFL fan')}</div>
          <div class="you-sub">${LEVEL_N[p.level] || 'Fan'} · ${locLabel()} · ${Dt.isIntl() ? ((p.providers || []).includes('dazn') ? 'Game Pass on DAZN' : 'Free') : (SUB_N[p.sub] || 'Free')}</div>
        </div>
        <div class="you-stats">
          <div><div class="v">${fmt.n(p.points || 0)}</div><div class="l">Fan points</div></div>
          <div><div class="v">${p.streak || 0}</div><div class="l">Day streak</div></div>
          <div><div class="v">${(p.badges || []).length}</div><div class="l">Badges</div></div>
          <div><div class="v">${pr.w}-${pr.l}</div><div class="l">Picks</div></div>
        </div>
      </div>
      <div class="you-level"><span class="tiny b" style="color:var(--gold-ink)">${lv.n}</span><div class="meter"><i style="width:${Math.round(lv.pct * 100)}%"></i></div><span class="tiny">${lv.next ? `${lv.need} pts to ${lv.next}` : 'Top level'}</span></div>
`;
}

/* ---------------------------------------------------------------- You */
App.route('you', (params, query, page) => {
  const p = store.p, tm = p.primary && Dt.team(p.primary);
  const st = page.state = page.state || { edit: false };
  const pr = picksRecord(), lv = levelInfo(p.points || 0);
  const s = Dt.seasonForStats();
  const others = p.teams.filter(id => id !== p.primary);
  const unread = (p.bell || []).filter(n => !n.read).length;
  const myTeam = tm ? UI.row({ left: UI.logo(tm.id, 'md'), title: tm.name, sub: `${Dt.record(tm.id, s).str} · ${tm.conf} ${tm.div}`, go: `#/team/${tm.id}`, chev: true, cls: 'r-sans' })
    : UI.row({ left: html`<span class="you-ord">${icon('star', 'sm')}</span>`, title: 'Pick your team', sub: 'Home, scores and alerts are built around one favourite', act: 'you-add-team', chev: true });
  const teamsList = others.length ? html`<div class="list">${others.map((id, i) => {
    const T = Dt.team(id);
    const right = st.edit ? html`<span class="you-sw">
        <button class="you-ord" data-act="set-primary" data-arg="${id}" aria-label="Make my team">${icon('star', 'sm')}</button>
        <button class="you-ord" data-act="you-move" data-arg="team:${id}:-1" aria-label="Move up" ${i === 0 ? raw('disabled style="opacity:.25"') : ''}>${icon('up', 'sm')}</button>
        <button class="you-ord" data-act="you-move" data-arg="team:${id}:1" aria-label="Move down" ${i === others.length - 1 ? raw('disabled style="opacity:.25"') : ''}>${icon('down', 'sm')}</button>
        <button class="you-ord" data-act="follow" data-arg="team:${id}" aria-label="Unfollow">${icon('close', 'sm')}</button></span>` : '';
    return UI.row({ left: UI.logo(id, 'md'), title: T.name, sub: `${Dt.record(id, s).str} · ${T.conf} ${T.div}`, right, go: st.edit ? null : `#/team/${id}`, cls: 'r-sans' });
  })}</div>` : html`<div class="notice">${icon('teams', 'sm')}<span class="grow">${tm ? 'Follow a rival, a second favourite or anyone fun to watch. They show up in scores and alerts too.' : 'Pick your team first, then follow as many others as you like.'}</span></div>`;
  const playersList = p.players.length ? html`<div class="list">${p.players.map((id, i) => {
    const right = st.edit ? html`<span class="you-sw">
        <button class="you-ord" data-act="you-move" data-arg="player:${id}:-1" ${i === 0 ? raw('disabled style="opacity:.25"') : ''}>${icon('up', 'sm')}</button>
        <button class="you-ord" data-act="you-move" data-arg="player:${id}:1" ${i === p.players.length - 1 ? raw('disabled style="opacity:.25"') : ''}>${icon('down', 'sm')}</button>
        <button class="you-ord" data-act="follow" data-arg="player:${id}">${icon('close', 'sm')}</button></span>` : '';
    return UI.playerRow(id, { right, go: st.edit ? false : undefined });
  })}</div>` : html`<div class="notice">${icon('star', 'sm')}<span class="grow">Follow players on any team for their highlights and live stat lines.</span></div>`;

  return {
    title: 'You', right: UI.headRight({ me: false }),
    html: html`
      ${tm ? fanCard(tm, lv, pr) : oldCard(p, tm, lv, pr)}

      <div class="sec"><div class="list">${UI.row({ left: setIc('bell'), title: 'Alerts', sub: unread ? `${unread} new` : 'You\'re all caught up', right: unread ? html`<span class="badge live">${unread}</span>` : '', go: '#/inbox' })}</div></div>

      <div class="sec"><div class="sec-head"><div class="h2">Badges</div><a class="more" data-go="#/community">Earn more${icon('chev', 'xs')}</a></div>
        <div class="you-badges">${BADGES.map(([k, n, ic, d]) => { const got = (p.badges || []).includes(k); return html`<button class="you-badge ${got ? 'got' : ''}" data-act="you-badge" data-arg="${k}"><div class="bi">${icon(ic)}</div><div class="bn">${n}</div></button>`; })}</div></div>

      <div class="sec"><div class="sec-head"><div class="h2">Your team</div>${tm ? html`<a class="more" data-act="my-team" data-arg="${tm.id}">Change</a>` : ''}</div><div class="list">${myTeam}</div></div>
      <div class="sec"><div class="sec-head"><div class="h2">Also following</div>${others.length ? html`<a class="more" data-act="you-edit">${st.edit ? 'Done' : 'Edit'}</a>` : ''}</div>${teamsList}
        ${tm ? html`<div class="pad mt8"><button class="btn ghost sm" data-act="you-add-team">${icon('plus', 'sm')} Follow another team</button></div>` : ''}</div>
      ${App.teamParts && App.teamParts.suggestions ? App.teamParts.suggestions() : ''}
      <div class="sec"><div class="sec-head"><div class="h2">Your players</div>${p.players.length ? html`<a class="more" data-act="you-edit">${st.edit ? 'Done' : 'Edit'}</a>` : ''}</div>${playersList}
        <div class="pad mt8"><button class="btn ghost sm" data-go="#/search">${icon('search', 'sm')} Find players</button></div></div>

      <div class="sec"><div class="sec-head"><div class="h2">Your stuff</div></div><div class="list">
        ${setRow('ticket', 'Tickets', (p.wallet || []).length ? `${p.wallet.length} in wallet` : 'Wallet', '#/wallet')}
        ${setRow('bag', 'Orders', (p.orders || []).length ? `${p.orders.length} orders` : null, '#/shop')}
        ${setRow('target', 'Picks & predictions', `${pr.w}-${pr.l}`, '#/pickem')}
        ${setRow('stadium', 'Stadiums visited', `${(p.passport || []).length} of 30`, '#/stadiums?f=visited')}
        ${setRow('users', 'Fan squads', (p.squads || []).length || null, '#/community')}
      </div></div>

      <div class="sec"><div class="sec-head"><div class="h2">Subscription</div></div>
        <div class="list">${UI.row({ left: setIc('play'), title: Dt.isIntl() ? ((p.providers || []).includes('dazn') ? 'NFL Game Pass on DAZN' : 'Free') : SUB_N[p.sub],
          sub: Dt.isIntl() ? 'Every game live outside the US' : p.sub === 'free' ? 'Scores, highlights, NFL Channel — all free' : p.sub === 'plus' ? 'Live local & primetime games, audio, NFL Films' : 'RedZone, replays, All-22 and everything in NFL+',
          right: UI.tierBadge(Dt.isIntl() ? 'dazn' : p.sub), go: '#/plans' })}
          ${setRow('tv', 'TV & streaming services', (p.providers || []).length ? `${p.providers.length} connected` : 'None', '#/settings/watch')}</div></div>

      <div class="sec you-settings"><div class="sec-head"><div class="h2">Settings</div></div><div class="list">
        ${setRow('bell', 'Notifications', ({ essentials: 'Essentials', scores: 'Every score', all: 'All in', quiet: 'Quiet', smart: 'Smart' })[p.notif.preset] || 'Custom', '#/settings/notifications')}
        ${setRow('eyeoff', 'Spoiler shield', p.spoiler.on ? 'On' : 'Off', '#/settings/spoiler')}
        ${setRow('sun', 'Appearance', { dark: 'Dark', light: 'Light', auto: 'Automatic' }[p.theme], '#/settings/appearance')}
        ${setRow('a11y', 'Accessibility', null, '#/settings/accessibility')}
        ${setRow('translate', 'Language & region', (LANGS.find(l => l[0] === p.lang) || LANGS[0])[1], '#/settings/language')}
        ${setRow('sliders', 'Detail level', ['Surface', 'Standard', 'Deep'][(p.depth || 2) - 1], '#/settings/detail')}
        ${setRow('lock', 'Privacy & data', null, '#/settings/privacy')}
        ${setRow('info', 'About', null, '#/settings/about')}
      </div></div>

      <div class="sec"><div class="sec-head"><div class="h2">Prototype</div></div>
        <div class="tiny pad" style="margin:-4px 0 10px">Tools for exploring this proof of concept. They aren't part of the app.</div>
        <div class="list">${UI.row({ left: setIc('clock'), title: 'Time machine', right: html`<span class="set-val">${time.moment().label}</span>`, act: 'time-machine', chev: true })}</div></div>
      <div class="sec"><div class="sec-head"><div class="h2">Explore as another fan</div></div>
        <div class="tiny pad" style="margin:-4px 0 10px">One tap reshapes the whole app around a different kind of fan.</div>
        <div class="hscroll">${PERSONAS.map(P => { const T = Dt.team(P.teams[0]); return html`<button class="you-persona tap" data-act="you-persona" data-arg="${P.k}">
          <div class="pb" style="${raw(App.teamVars(T))}">${P.teams.map(a => html`<img src="${Dt.team(a).logoDark}" alt="">`)}</div>
          <div class="pc"><div class="pt">${P.t}</div><div class="pd">${P.d}</div><div class="ptags">${P.tags.map(x => html`<span class="badge">${x}</span>`)}</div></div></button>`; })}</div></div>

      <div class="sec"><button class="you-restart tap" data-act="you-restart"><span class="ri">${icon('refresh')}</span><span class="grow"><span class="h4" style="display:block">Restart onboarding</span><span class="meta" style="display:block;margin-top:3px">Start fresh as a different kind of fan.</span></span>${icon('chev', 'sm chev')}</button></div>

      <div class="tiny center mt20">NFL · proof of concept · data snapshot Oct 17, 2026</div>`,
  };
});

/* ---------------------------------------------------------------- settings */
const SETTINGS = {
  notifications() {
    const n = store.p.notif, nt = store.p.notifTeams || {};
    const PRE = [['essentials', 'Essentials'], ['scores', 'Every score'], ['all', 'All in'], ['quiet', 'Quiet']];
    const tog = (k, title, sub) => UI.row({ title, sub, right: UI.toggle(!!n[k], 'set-notif', k) });
    return { title: 'Notifications', html: html`
      <div class="set-group" style="margin-top:12px"><div class="set-label">Preset</div>${UI.choice(PRE.map(([k, l]) => ({ k, l })), n.preset, 'set-preset')}</div>
      <div class="set-group"><div class="set-label">Game alerts</div><div class="list">
        ${tog('kickoff', 'Kickoff', 'When your teams\' games start, with where to watch')}
        ${tog('scoring', 'Scoring plays', 'Touchdowns and field goals as they happen')}
        ${tog('final', 'Final scores', 'Result and a one-line recap')}
        ${tog('closegame', 'Close-game alert', 'Any game within one score in the last 5 minutes')}
        ${tog('redzone', 'Red zone', 'Your teams inside the 20')}</div></div>
      <div class="set-group"><div class="set-label">News & players</div><div class="list">
        ${tog('news', 'Breaking news', 'Trades, signings and big stories about your teams')}
        ${tog('injuries', 'Injury updates', 'Practice reports and game statuses')}
        ${tog('players', 'Your players', 'Touchdowns, milestones and big games')}
        ${tog('draft', 'Draft picks', 'When your teams are on the clock')}</div></div>
      ${store.p.teams.length ? html`<div class="set-group"><div class="set-label">Per team</div><div class="list">${store.p.teams.map(id => {
        const v = nt[id] || 'match';
        return UI.row({ left: UI.logo(id, 'md'), title: Dt.team(id).full, sub: { match: 'Follows your preset', all: 'Everything', scores: 'Scores only', final: 'Finals only', off: 'Off' }[v], right: html`<span class="set-val">${icon('chev', 'sm')}</span>`, act: 'set-team-notif', arg: id });
      })}</div></div>` : ''}
      <div class="set-group"><div class="set-label">Quiet hours</div><div class="list">
        ${UI.row({ title: 'Quiet hours', sub: '11:00 PM – 8:00 AM, your time. Alerts wait in your inbox.', right: UI.toggle(!!n.quiet, 'set-notif', 'quiet') })}
        ${UI.row({ title: 'Respect spoiler shield', sub: 'Never put a shielded score in an alert', right: UI.toggle(n.spoilerSafe !== false, 'set-notif-inv', 'spoilerSafe') })}</div></div>
      <div class="set-note">Live alerts appear at the top of the screen during live games, even in the time machine.</div>` };
  },
  spoiler() {
    const sp = store.p.spoiler, teams = store.p.teams;
    const watched = (store.p.watched || []).length;
    return { title: 'Spoiler shield', html: html`
      <div class="pad-all"><div class="flex gap12" style="align-items:flex-start"><span class="set-ic" style="width:44px;height:44px">${icon('eyeoff')}</span>
        <div class="meta" style="font-size:14px;line-height:1.45">Watching on delay? The shield blurs scores, hides alerts and keeps highlights out of your feed for the games you choose, until you mark them watched.</div></div></div>
      <div class="list">${UI.row({ title: 'Spoiler shield', sub: sp.on ? 'On' : 'Off', right: UI.toggle(sp.on, 'set-spoiler', 'on') })}
        ${UI.row({ title: 'Reveal after I watch', sub: 'Unblur automatically when you finish a replay', right: UI.toggle(sp.autoReveal !== false, 'set-spoiler', 'autoReveal') })}
        ${UI.row({ title: 'Hide from feed and video', sub: 'Keep recaps and highlights out of For You', right: UI.toggle(sp.feed !== false, 'set-spoiler', 'feed') })}</div>
      <div class="set-group"><div class="set-label">Shield these teams</div>
        ${teams.length ? html`<div class="list">${UI.row({ title: 'All my teams', right: html`<span class="you-chk ${!(sp.teams || []).length ? 'on' : ''}">${!(sp.teams || []).length ? icon('check', 'xs') : ''}</span>`, act: 'set-spoiler-team', arg: '' })}
          ${teams.map(id => { const on = (sp.teams || []).includes(id); return UI.row({ left: UI.logo(id, 'md'), title: Dt.team(id).full, right: html`<span class="you-chk ${on ? 'on' : ''}" style="${raw(on ? '' : 'border:2px solid var(--line-2)')}">${on ? icon('check', 'xs') : ''}</span>`, act: 'set-spoiler-team', arg: id }); })}</div>`
          : html`<div class="notice">Follow a team first.</div>`}</div>
      <div class="set-group"><div class="list">${UI.row({ title: 'Games marked watched', sub: watched ? `${watched} games revealed` : 'None yet', right: watched ? html`<button class="btn xs ghost" data-act="set-clear-watched">Clear</button>` : '' })}</div></div>` };
  },
  appearance() {
    const p = store.p;
    return { title: 'Appearance', html: html`
      <div class="set-group" style="margin-top:12px"><div class="set-label">Theme</div>${UI.choice([{ k: 'dark', l: 'Dark' }, { k: 'light', l: 'Light' }, { k: 'auto', l: 'Automatic' }], p.theme, 'set-theme')}</div>
      <div class="set-group"><div class="list">
        ${UI.row({ title: 'Team colours', sub: p.primary ? `Accent the app in ${Dt.team(p.primary).name} colours` : 'Follow a team to colour the app', right: UI.toggle(!p.noAccent, 'set-accent') })}
        ${UI.row({ title: 'App icon', sub: 'Classic', right: html`<span class="set-val">${icon('chev', 'sm')}</span>`, act: 'toast', arg: 'Alternate team app icons are coming soon' })}</div></div>
      <div class="set-note">Dark is easiest on the eyes for night games. Team colours are automatically adjusted so text stays readable.</div>` };
  },
  accessibility() {
    const a = store.p.a11y;
    const tog = (k, title, sub) => UI.row({ title, sub, right: UI.toggle(!!a[k], 'set-a11y', k) });
    return { title: 'Accessibility', html: html`
      <div class="set-group" style="margin-top:12px"><div class="set-label">Text size</div>
        <div class="fs-prev"><div class="h3">Bills 27, Chiefs 24</div><div class="meta mt4">Josh Allen threw for 312 yards and two touchdowns.</div></div>
        <div class="fs-range"><span class="a1">A</span><input type="range" min="0.85" max="1.4" step="0.05" value="${a.fs || 1}" data-set-fs><span class="a2">A</span></div></div>
      <div class="set-group"><div class="set-label">Vision</div><div class="list">
        ${tog('contrast', 'High contrast', 'Stronger text and dividers')}
        ${tog('ad', 'Audio description', 'Narrated descriptions on video and live play-by-play')}
        ${tog('play', 'Spoken play-by-play', 'Your screen reader announces each new play during live games')}</div></div>
      <div class="set-group"><div class="set-label">Hearing</div><div class="list">
        ${tog('captions', 'Captions', 'On for all video and live streams')}
        ${tog('asl', 'ASL interpretation', 'Show the ASL window when it\'s offered')}</div></div>
      <div class="set-group"><div class="set-label">Motion & touch</div><div class="list">
        ${tog('motion', 'Reduce motion', 'Turn off animations and auto-playing video')}
        ${tog('haptics', 'Haptics', 'Feel scoring plays and big moments')}
        ${tog('autoplay', 'Autoplay video', 'Play highlights in the feed automatically')}</div></div>`,
      mount(el) {
        const r = el.querySelector('[data-set-fs]'); if (!r) return;
        r.addEventListener('input', () => { store.p.a11y.fs = +r.value; document.documentElement.style.setProperty('--fs', r.value); });
        r.addEventListener('change', () => store.save());
      } };
  },
  language() {
    const p = store.p;
    const tzs = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'America/Mexico_City', 'America/Sao_Paulo', 'Asia/Tokyo', 'Australia/Sydney'];
    const sample = Date.parse('2026-10-18T17:00:00Z');
    return { title: 'Language & region', html: html`
      <div class="set-group" style="margin-top:12px"><div class="set-label">App language</div><div class="list">${LANGS.map(([k, n, en]) => UI.row({ title: html`${n}${k !== 'en' ? html` <span class="tiny">${en}</span>` : ''}`, cls: `lang-row ob-qa ${p.lang === k ? 'on' : ''}`, right: html`<span class="ob-radio"></span>`, act: 'set-lang', arg: k }))}</div>
        <div class="set-note">Menus and labels switch now. Live commentary in Spanish, German, Portuguese and Japanese depends on the broadcast.</div></div>
      <div class="set-group"><div class="set-label">Time zone</div><div class="list">${tzs.map(z => UI.row({ title: z.split('/').pop().replace(/_/g, ' '), sub: `Sunday 1:00 PM ET kickoff → ${new Date(sample).toLocaleTimeString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: z })}`, cls: `ob-qa ${fmt.tz() === z ? 'on' : ''}`, right: html`<span class="ob-radio"></span>`, act: 'set-tz', arg: z }))}</div></div>
      <div class="set-group"><div class="set-label">Units</div>${UI.choice([{ k: 'imperial', l: 'Yards · °F · lbs' }, { k: 'metric', l: 'Metres · °C · kg' }], p.units || 'imperial', 'set-units')}
        <div class="set-note">Football is measured in yards everywhere. Metric adds conversions for heights, weights and the weather.</div></div>` };
  },
  watch() {
    const p = store.p, intl = Dt.isIntl();
    return { title: 'How you watch', html: html`
      <div class="set-group" style="margin-top:12px"><div class="set-label">Location</div><div class="list">
        ${UI.row({ left: setIc('pin'), title: locLabel(), sub: intl ? 'Outside the US · NFL Game Pass on DAZN' : (p.location.market || []).length ? 'Local teams: ' + p.location.market.map(id => Dt.team(id).abbr).join(', ') : 'No local team', right: html`<span class="set-val">Change</span>`, act: 'set-location' })}</div></div>
      ${intl ? '' : html`<div class="set-group"><div class="set-label">NFL+</div>${UI.choice([{ k: 'free', l: 'Free' }, { k: 'plus', l: 'NFL+' }, { k: 'premium', l: 'Premium' }], p.sub, 'set-sub')}
        <div class="set-note">${{ free: 'Scores, stats, highlights and the free NFL Channel.', plus: 'Live local & primetime games on phone and tablet, live audio for every game.', premium: 'Adds NFL RedZone, full & condensed replays and All-22.' }[p.sub]} <a class="accent b" data-go="#/plans">Compare plans</a></div></div>`}
      <div class="set-group"><div class="set-label">TV & streaming</div><div class="list">${Dt.PROVIDERS.filter(x => intl ? x.k === 'dazn' : x.k !== 'dazn').map(x => { const on = (p.providers || []).includes(x.k); return UI.row({ title: x.n, right: html`<span class="you-chk ${on ? 'on' : ''}" style="${raw(on ? '' : 'border:2px solid var(--line-2)')}">${on ? icon('check', 'xs') : ''}</span>`, act: 'set-prov', arg: x.k }); })}</div>
        <div class="set-note">We use this to tell you exactly where each game is on. Nothing is shared.</div></div>` };
  },
  detail() {
    const p = store.p;
    return { title: 'Detail level', html: html`
      <div class="pad mt12 meta" style="font-size:14px;line-height:1.45">How much the app shows by default. You can always tap deeper on anything.</div>
      <div class="set-group"><div class="set-label">Fan type</div><div class="list">${App.onboarding.LEVELS.map(l => UI.row({ left: setIc(l.ic), title: l.t, sub: l.d, right: p.level === l.k ? html`<span class="you-chk on">${icon('check', 'xs')}</span>` : '', act: 'set-level', arg: l.k }))}</div></div>
      <div class="set-group"><div class="set-label">Default depth</div>${UI.choice([{ k: 1, l: 'Surface' }, { k: 2, l: 'Standard' }, { k: 3, l: 'Deep' }], p.depth, 'set-depth')}</div>
      <div class="set-group"><div class="list">${UI.row({ title: 'Learning tips', sub: 'Plain-language explainers and tap-to-define terms', right: UI.toggle(!!(p.learnTips || p.level === 'new'), 'set-learn') })}
        ${UI.row({ title: 'Fantasy points', sub: 'Show PPR points as a footnote on player stats', right: UI.toggle(p.showFantasy !== false, 'set-fantasy') })}</div></div>` };
  },
  privacy() {
    const pr = store.p.privacy || {};
    const tog = (k, title, sub, def = true) => UI.row({ title, sub, right: UI.toggle(pr[k] != null ? pr[k] : def, 'set-privacy', k) });
    return { title: 'Privacy & data', html: html`
      <div class="set-group" style="margin-top:12px"><div class="list">
        ${tog('personal', 'Personalized feed', 'Use what you follow and read to tune For You')}
        ${tog('squads', 'Share activity with squads', 'Picks, badges and watch-party status')}
        ${tog('location', 'Precise location', 'Only used in stadium mode and for local broadcasts', false)}
        ${tog('marketing', 'Offers from the NFL', 'Ticket and shop deals for your teams', false)}</div></div>
      <div class="set-group"><div class="list">
        ${UI.row({ left: setIc('download'), title: 'Download my data', act: 'toast', arg: 'We\'ll email you a copy within 24 hours' })}
        ${UI.row({ left: setIc('close'), title: html`<span style="color:var(--loss)">Delete account</span>`, sub: 'Erases your profile on this device', act: 'set-delete' })}</div></div>
      <div class="set-note">No gambling, ever. The NFL app doesn't show odds or betting content.</div>` };
  },
  about() {
    const c = NFL.d.core;
    return { title: 'About', html: html`
      <div class="pad-all center"><img class="nfl-shield" style="height:80px;margin:0 auto" src="assets/brand/nfl-shield.webp" alt="NFL"><div class="h3 mt12">The fan-first NFL app</div><div class="meta mt4">Mobile web proof of concept</div></div>
      <div class="list">${UI.row({ title: 'Data', sub: `Real ESPN public data, snapshot ${fmt.date(c.built)}. 2022–2026 seasons: ${fmt.n(c.games.length)} games, ${fmt.n(Object.keys(c.players).length)} players, play-by-play for 2025–26.` })}
        ${UI.row({ title: 'Video', sub: 'Every video plays the same NFL+ highlights reel in this prototype.' })}
        ${UI.row({ title: 'Typography', sub: 'All-Pro Display, All-Pro Sans and All-Pro Stats.' })}
        ${UI.row({ title: 'Invented for the demo', sub: 'Chat, fan posts, ticket prices, shop items, poll results and friends are sample content. Scores, stats, rosters and news are real.' })}
        ${UI.row({ title: 'Version', sub: '0.1 · built Oct 2026' })}</div>` };
  },
};
const ALIAS = { services: 'watch', providers: 'watch', location: 'language', region: 'language' };
App.route('settings/:k', (params) => {
  const f = SETTINGS[params.k] || SETTINGS[ALIAS[params.k]];
  return f ? f() : { title: 'Settings', html: UI.empty('gear', 'Unknown setting') };
});

/* ---------------------------------------------------------------- actions */
const A = App.actions;
/** the header's Settings button on You: jump down to the Settings section */
A['you-settings'] = () => { const p = App.current(), sec = p && p.el.querySelector('.you-settings'); if (sec) p.el.scrollTo({ top: sec.offsetTop - 60, behavior: 'smooth' }); };
const save = (rerender = true) => { store.save(); if (rerender) App.refresh(); };
A['you-edit'] = () => { const pg = App.current(); pg.state.edit = !pg.state.edit; App.refresh(); };
A['you-primary'] = (el, ev, id) => App.setPrimary(id);
A['you-move'] = (el, ev, arg) => {
  const [kind, id, d] = arg.split(':'); const list = store.p[kind === 'team' ? 'teams' : 'players'];
  const i = list.indexOf(id), j = i + +d; if (i < 0 || j < 0 || j >= list.length || (kind === 'team' && (list[j] === store.p.primary || id === store.p.primary))) return;
  [list[i], list[j]] = [list[j], list[i]]; save();
};
A['you-add-team'] = () => {
  App.sheet({ title: store.p.primary ? 'Follow another team' : 'Pick your team', html: html`<div class="pad"><div class="ob-teams">${['AFC East', 'AFC North', 'AFC South', 'AFC West', 'NFC East', 'NFC North', 'NFC South', 'NFC West'].map(dv => html`<div class="ob-div">${dv}</div>${Dt.D.teams.filter(t => t.conf + ' ' + t.div === dv).map(tm => {
    const on = store.p.teams.includes(tm.id), prim = tm.id === store.p.primary;
    return UI.teamTile(tm.id, { on, act: prim ? 'my-team' : 'follow', arg: prim ? tm.id : 'team:' + tm.id, badge: prim ? 'star' : '' });
  })}`)}</div></div>` });
};
A['you-persona'] = (el, ev, k) => applyPersona(k);
A['you-restart'] = () => {
  App.sheet({ title: 'Restart onboarding?', html: html`<div class="pad"><p class="meta" style="font-size:14.5px">This clears your teams, players and settings on this device so you can set the app up as a different kind of fan.</p>
    <button class="btn primary block mt12" data-act="you-restart-go">Start over</button><button class="btn ghost block mt8" data-act="close-sheet">Cancel</button></div>` });
};
A['you-restart-go'] = () => { App.closeOverlays(true); store.reset(); App.applyTheme(); App.refreshAll(); App.showTab('home', { reset: true }); App.onboarding.start(); };
A['you-badge'] = (el, ev, k) => {
  const b = BADGES.find(x => x[0] === k); const got = (store.p.badges || []).includes(k);
  App.sheet({ title: false, html: html`<div class="pad-all center"><div class="you-badge ${got ? 'got' : ''}" style="width:auto"><div class="bi" style="width:84px;height:84px">${icon(b[2], 'lg')}</div></div>
    <div class="h2 mt16">${b[1]}</div><div class="meta mt8">${b[3]}</div><div class="mt12">${got ? raw('<span class="badge win">Earned</span>') : raw('<span class="badge">Not yet</span>')}</div></div>` });
};
A['set-preset'] = (el, ev, k) => {
  const P = { essentials: { scoring: false, final: true, kickoff: true, news: true, injuries: false, players: false }, scores: { scoring: true, final: true, kickoff: true, news: false, injuries: false, players: false }, all: { scoring: true, final: true, kickoff: true, news: true, injuries: true, players: true, closegame: true, redzone: true, draft: true }, quiet: { scoring: false, final: false, kickoff: false, news: false, injuries: false, players: false, closegame: false, redzone: false, draft: false } };
  Object.assign(store.p.notif, P[k], { preset: k }); save();
};
A['set-notif'] = (el, ev, k) => { store.p.notif[k] = !store.p.notif[k]; store.p.notif.preset = 'custom'; save(); };
A['set-notif-inv'] = (el, ev, k) => { store.p.notif[k] = store.p.notif[k] === false; save(); };
A['set-team-notif'] = (el, ev, id) => {
  const opts = [['match', 'Follow my preset'], ['all', 'Everything'], ['scores', 'Scores only'], ['final', 'Finals only'], ['off', 'Off']];
  const cur = (store.p.notifTeams || {})[id] || 'match';
  App.sheet({ titleHtml: html`<div class="flex gap8">${UI.logo(id, 'sm')}<span class="h3">${Dt.team(id).full}</span></div>`, html: html`<div class="list">${opts.map(([k, l]) => UI.row({ title: l, right: cur === k ? html`<span class="you-chk on">${icon('check', 'xs')}</span>` : '', act: 'set-team-notif-go', arg: id + ':' + k }))}</div>` });
};
A['set-team-notif-go'] = (el, ev, arg) => { const [id, k] = arg.split(':'); store.p.notifTeams = Object.assign({}, store.p.notifTeams, { [id]: k }); store.save(); App.closeSheet(); App.refresh(); };
A['set-spoiler'] = (el, ev, k) => { const sp = store.p.spoiler; sp[k] = k === 'on' ? !sp.on : sp[k] === false; store.save(); App.refreshAll(); };
A['set-spoiler-team'] = (el, ev, id) => { const sp = store.p.spoiler; sp.teams = sp.teams || []; if (!id) sp.teams = []; else { const i = sp.teams.indexOf(id); i >= 0 ? sp.teams.splice(i, 1) : sp.teams.push(id); } store.save(); App.refreshAll(); };
A['set-clear-watched'] = () => { store.p.watched = []; store.save(); App.refreshAll(); App.toast({ title: 'Watched history cleared', icon: 'eyeoff' }); };
A['set-theme'] = (el, ev, k) => { store.p.theme = k; store.save(); App.applyTheme(); App.refreshAll(); };
A['set-accent'] = () => { store.p.noAccent = !store.p.noAccent; store.save(); App.applyTheme(); App.refreshAll(); };
A['set-a11y'] = (el, ev, k) => { store.p.a11y[k] = !store.p.a11y[k]; store.save(); App.applyTheme(); App.refresh(); };
A['set-lang'] = (el, ev, k) => { store.p.lang = k; store.save(); App.refreshAll(); App.toast({ title: (LANGS.find(l => l[0] === k) || [])[1], icon: 'translate' }); };
A['set-tz'] = (el, ev, z) => { store.p.location.tz = z; store.save(); App.refreshAll(); };
A['set-units'] = (el, ev, k) => { store.p.units = k; save(); };
A['set-sub'] = (el, ev, k) => { store.p.sub = k; store.save(); App.refreshAll(); };
A['set-prov'] = (el, ev, k) => { const l = store.p.providers = store.p.providers || []; const i = l.indexOf(k); i >= 0 ? l.splice(i, 1) : l.push(k); save(); };
A['set-level'] = (el, ev, k) => { const L = App.onboarding.LEVELS.find(l => l.k === k); store.p.level = k; store.p.depth = L.depth; store.save(); App.refreshAll(); };
A['set-depth'] = (el, ev, d) => { store.p.depth = +d; store.save(); App.refreshAll(); };
A['set-learn'] = () => { store.p.learnTips = !(store.p.learnTips || store.p.level === 'new'); store.save(); App.refreshAll(); };
A['set-fantasy'] = () => { store.p.showFantasy = store.p.showFantasy === false; save(); };
A['set-privacy'] = (el, ev, k) => { const pr = store.p.privacy = store.p.privacy || {}; pr[k] = !(pr[k] != null ? pr[k] : ['personal', 'squads'].includes(k)); save(); };
A['set-delete'] = () => A['you-restart']();
let locMode = null;
A['set-location'] = () => {
  const intl = locMode ? locMode === 'intl' : Dt.isIntl();
  const chk = on => on ? html`<span class="you-chk on">${icon('check', 'xs')}</span>` : '';
  App.sheet({ title: 'Where are you?', onClose: () => { locMode = null; }, html: html`<div class="pad"><div class="ob-seg"><button class="${!intl ? 'on' : ''}" data-act="set-locmode" data-arg="us">In the US</button><button class="${intl ? 'on' : ''}" data-act="set-locmode" data-arg="intl">Outside the US</button></div></div>
    <div class="list mt12">${intl ? Dt.COUNTRIES.filter(c => c[0] !== 'US').map(c => UI.row({ left: html`<span class="ob-cc">${c[0]}</span>`, title: c[1], act: 'set-country', arg: c[0], right: chk(store.p.location.country === c[0]) }))
      : Dt.MARKETS.map(m => UI.row({ title: m[0], sub: m[2].length ? 'Local: ' + m[2].join(', ') : 'No local team', act: 'set-market', arg: m[0], right: chk(!Dt.isIntl() && store.p.location.city === m[0]) }))}</div>` });
};
A['set-locmode'] = (el, ev, m) => { App.closeSheet(true); locMode = m; A['set-location'](); };
A['set-market'] = (el, ev, name) => { const m = Dt.MARKETS.find(x => x[0] === name); store.p.location = { country: 'US', city: name, zip: '', tz: m[1], market: Dt.marketTeams(name) }; store.p.providers = (store.p.providers || []).filter(x => x !== 'dazn'); store.save(); App.closeSheet(); App.refreshAll(); };
A['set-country'] = (el, ev, cc) => { const c = Dt.COUNTRIES.find(x => x[0] === cc); store.p.location = { country: cc, city: c[1], zip: '', tz: c[2], market: [] }; store.p.sub = 'free'; store.save(); App.closeSheet(); App.refreshAll(); };

/* team accent opt-out: core applies the team colour; strip it again when the fan turned it off */
const coreApply = App.applyTheme;
App.applyTheme = function () {
  coreApply();
  if (store.p && store.p.noAccent) ['--accent', '--accent-ink', '--accent-soft', '--team', '--team-2'].forEach(v => document.documentElement.style.removeProperty(v));
};
App.on('boot', () => { if (store.p.noAccent) App.applyTheme(); });

App.you = { PERSONAS, applyPersona, levelInfo, BADGES, LEVEL_N, picksRecord };
App.youParts = { fanCard, levelInfo, picksRecord };
})();
