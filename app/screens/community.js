/* ============================================================================
   Community — fan squads, free pick'em, daily trivia from real data, polls,
   Pro Bowl ballot, fan grades. Everything is for fun and points.
   Routes: community, squad/:id, pickem, trivia, polls, pro-bowl, grades
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, store, fmt, time } = App;
const UI = App.UI, Dt = App.data;

/* ------------------------------------------------------------------ helpers */
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
function shuffle(arr, seed) { const r = rng(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const team = id => Dt.team(id);
const ab = id => (team(id) || {}).abbr;

const LEVELS = [[0, 'Rookie'], [200, 'Starter'], [500, 'Pro Bowler'], [1000, 'All-Pro'], [2500, 'Hall of Famer']];
const BADGES = {
  rookie: ['star', 'Rookie', 'Joined the app'], learner: ['book', 'Student', 'Finished a Football 101 lesson'], student: ['medal', 'Student of the Game', 'Finished every lesson'],
  picker: ['pick', 'Picker', 'Made your first pick\'em picks'], sharp: ['target', 'Sharp Eye', '5 correct picks'], trivia: ['help', 'Know-it-all', 'Perfect daily trivia'],
  voter: ['check', 'Voter', 'Cast a Pro Bowl ballot'], squad: ['users', 'Squad Up', 'Joined a fan squad'], traveler: ['plane', 'Road Tripper', 'Planned an away trip'],
  collector: ['stadium', 'Collector', 'Checked in at a stadium'], grader: ['edit', 'Critic', 'Graded your team'],
};
function award(id) { if (!store.p.badges.includes(id)) { store.p.badges.push(id); store.save(); const b = BADGES[id]; if (b) App.toast({ title: `Badge unlocked: ${b[1]}`, body: b[2], icon: b[0] }); } }
App.COMMUNITY = { award, BADGES };

/* ------------------------------------------------------------------ pick'em (free, points only) */
function pickWeek() {
  if (!['regular', 'post'].includes(time.phase())) return null;
  const w = Dt.currentWeek();
  return w && w.t !== 1 && !(w.t === 3 && w.w === 4) ? w : null;
}
function pickStats() {
  const now = time.now(); let right = 0, wrong = 0, streak = 0;
  const done = Object.entries(store.p.picks || {}).map(([gid, tid]) => ({ g: Dt.game(gid), tid })).filter(x => x.g && Dt.state(x.g, now) === 'post').sort((a, b) => a.g.ts - b.g.ts);
  done.forEach(({ g, tid }) => { const win = g.hs > g.as ? g.h : g.as > g.hs ? g.a : null; if (win === tid) { right++; streak++; } else { wrong++; streak = 0; } });
  return { right, wrong, streak, pts: right * 10, n: done.length };
}
function fanPoints() { return (store.p.points || 0) + pickStats().pts; }
function level(pts = fanPoints()) {
  let i = 0; LEVELS.forEach((l, k) => { if (pts >= l[0]) i = k; });
  const next = LEVELS[i + 1];
  return { name: LEVELS[i][1], next: next && next[1], pct: next ? (pts - LEVELS[i][0]) / (next[0] - LEVELS[i][0]) : 1, toNext: next ? next[0] - pts : 0 };
}
/** fan consensus, leaning to the team with the better record (prototype numbers) */
function consensus(g) {
  const s = g.s, rh = Dt.record(g.h, s, g.ts - 1), ra = Dt.record(g.a, s, g.ts - 1);
  const ph = (rh.w + 1) / (rh.w + rh.l + 2), pa = (ra.w + 1) / (ra.w + ra.l + 2);
  let v = 0.5 + (ph - pa) * 0.6 + 0.04 + (rng(g.id)() - 0.5) * 0.12;
  v = Math.max(0.12, Math.min(0.88, v));
  return Math.round(v * 100);
}

/* ------------------------------------------------------------------ squads */
const FRIENDS = [['Maya', 'PHI'], ['Jordan', 'DAL'], ['Sam', 'KC'], ['Priya', 'SF'], ['Dev', 'DET'], ['Chris', 'BUF'], ['Alex', 'GB'], ['Nina', 'SEA'], ['Luis', 'MIA'], ['Tom', 'PIT']];
function squads() {
  if (!store.p.squads || !store.p.squads.length) {
    store.p.squads = [
      { id: 'sunday-crew', n: 'Sunday Crew', m: ['Maya', 'Jordan', 'Sam', 'Priya', 'Dev'] },
      { id: 'family', n: 'The Family Group', m: ['Chris', 'Alex', 'Nina'] },
    ];
    store.save();
  }
  return store.p.squads;
}
function friendTeam(name) { const f = FRIENDS.find(x => x[0] === name); return f ? Dt.team(f[1]) : null; }
function avatar(name, size = 32) {
  const tm = friendTeam(name);
  return html`<span class="cm-av" style="width:${size}px;height:${size}px;background:${tm ? App.teamFill(tm) : 'var(--surface-3)'};font-size:${Math.round(size * .4)}px">${name === 'You' ? 'You' : name[0]}</span>`;
}
function myAvatar(size = 32) {
  const tm = store.p.primary && Dt.team(store.p.primary);
  return html`<span class="cm-av" style="width:${size}px;height:${size}px;background:${tm ? App.teamFill(tm) : 'var(--accent)'};font-size:${Math.round(size * .34)}px">${(store.p.name || 'You').slice(0, 1).toUpperCase()}</span>`;
}
/** leaderboard for a squad: friends' scores are deterministic prototype numbers */
function board(sq, scope) {
  const w = pickWeek(); const wk = w ? w.key : 'off';
  const ps = pickStats();
  const myWeek = w ? w.games.filter(g => store.p.picks[g.id] && Dt.state(g) === 'post' && ((g.hs > g.as ? g.h : g.a) === store.p.picks[g.id])).length : 0;
  const finished = w ? w.games.filter(g => Dt.state(g) === 'post').length : 0;
  const rows = sq.m.map(n => {
    const r = rng(sq.id + n + wk);
    const season = 30 + Math.floor(rng(sq.id + n)() * 30) + Math.floor((w ? w.w : 1) * 8.6 * (0.45 + r() * 0.3)) * 1;
    const week = Math.round(finished * (0.45 + r() * 0.35));
    return { n, v: scope === 'week' ? week * 10 : season * 10 };
  });
  rows.push({ n: 'You', me: true, v: scope === 'week' ? myWeek * 10 : ps.pts });
  return rows.sort((a, b) => b.v - a.v);
}
/** seed chat: friendly banter that references real games around "now" */
function seedChat(sq) {
  const now = time.now(); const msgs = [];
  const myT = store.p.primary || store.p.teams[0];
  const last = myT && Dt.lastGame(myT), next = myT && Dt.nextGame(myT);
  const m = sq.m;
  const t0 = now - 3 * 3600e3;
  if (last) {
    const r = Dt.result(last, myT); const o = team(Dt.opp(last, myT));
    if (r && !Dt.spoiled(last)) { msgs.push({ sys: true, ts: t0 - 1, x: `${team(myT).name} ${r.r === 'W' ? 'beat' : r.r === 'L' ? 'lost to' : 'tied'} the ${o.name} ${r.us}-${r.them}` }); msgs.push({ who: m[0], ts: t0, x: r.r === 'W' ? '🔥🔥🔥' : '😩' }); }
  }
  msgs.push({ who: m[1], ts: t0 + 600e3, x: 'Picks are in' });
  if (next) { const o = team(Dt.opp(next, myT)); msgs.push({ sys: true, ts: t0 + 1500e3 - 1, x: `Next up: ${team(myT).name} vs ${o.name} · ${Dt.state(next) === 'live' ? 'live now' : fmt.dayLong(next.ts)}` }); msgs.push({ who: m[2 % m.length], ts: t0 + 1500e3, x: Dt.state(next) === 'live' ? 'Who\'s watching?' : 'Watch party at mine?' }); }
  msgs.push({ who: m[3 % m.length], ts: t0 + 2400e3, x: '🙌' });
  return msgs;
}
// no free text in squads: emoji and preset takes keep every group SFW
const SQ_EMO = ['🔥', '🙌', '👏', '😱', '😤', '😩', '😂', '🏈'];
const SQ_TAKES = ['Let\'s go!', 'Who\'s watching?', 'Watch party at mine?', 'Picks are in', 'Bold take', 'Facts.', 'This is our year', 'Talk to me after Sunday', 'Ugh.'];
function chatFor(sq) {
  const all = store.p.squadChat = store.p.squadChat || {};
  return (all[sq.id] || []);
}
/** live scoring updates from the squad's teams posted into the chat */
function gameEvents() {
  const ids = new Set(store.p.teams);
  const out = [];
  Dt.liveGames().forEach(g => {
    if (!ids.has(g.h) && !ids.has(g.a)) return;
    if (Dt.spoiled(g)) return;
    const L = Dt.live(g); if (!L) return;
    L.plays.slice(0, L.idx + 1).filter(p => p.sc).slice(-3).forEach(p => out.push({ bot: true, ts: p._wc, g, x: p.x, t: p.team, hs: p.hs, as: p.as }));
  });
  return out;
}

/* ------------------------------------------------------------------ trivia from real data */
function completedSeasons(now = time.now()) {
  return [2022, 2023, 2024, 2025].filter(s => { const sb = Dt.D.games.find(g => g.s === s && g.t === 3 && g.w === 5); return sb && Dt.state(sb, now) === 'post'; });
}
const STAT_Q = [
  ['rushing.rushingYards', 'rushing yards'], ['passing.passingYards', 'passing yards'], ['receiving.receivingYards', 'receiving yards'],
  ['receiving.receptions', 'receptions'], ['defensive.sacks', 'sacks'], ['passing.passingTouchdowns', 'passing touchdowns'], ['rushing.rushingTouchdowns', 'rushing touchdowns'],
];
const HIST_Q = [
  ['Which team finished the 1972 season undefeated, including the Super Bowl?', ['Miami Dolphins', 'Chicago Bears', 'Green Bay Packers', 'Dallas Cowboys'], 0, 'The 1972 Dolphins went 17-0 — still the only perfect season.'],
  ['Which of these teams has never played in a Super Bowl?', ['Detroit Lions', 'Buffalo Bills', 'Minnesota Vikings', 'Cincinnati Bengals'], 0, 'The Lions are one of four teams yet to reach a Super Bowl.'],
  ['Who threw the most touchdown passes in NFL history?', ['Tom Brady', 'Drew Brees', 'Peyton Manning', 'Brett Favre'], 0, 'Tom Brady retired with 649 regular-season TD passes.'],
  ['Which two franchises have the most Super Bowl titles (6 each)?', ['Patriots & Steelers', 'Cowboys & 49ers', 'Packers & Giants', 'Chiefs & Broncos'], 0, 'New England and Pittsburgh each have six.'],
  ['What city hosted the first Super Bowl (January 1967)?', ['Los Angeles', 'Miami', 'New Orleans', 'Green Bay'], 0, 'Super Bowl I was played at the LA Memorial Coliseum.'],
  ['How many points is a safety worth?', ['2', '1', '3', '6'], 0, 'Two points — and the scored-on team has to kick it away.'],
  ['Who holds the record for career rushing yards?', ['Emmitt Smith', 'Walter Payton', 'Barry Sanders', 'Adrian Peterson'], 0, 'Emmitt Smith: 18,355 yards.'],
  ['Who holds the record for career receiving yards?', ['Jerry Rice', 'Larry Fitzgerald', 'Terrell Owens', 'Randy Moss'], 0, 'Jerry Rice: 22,895 yards.'],
  ['Which stadium is the NFL\'s oldest in continuous use by one team?', ['Lambeau Field', 'Soldier Field', 'Arrowhead Stadium', 'Caesars Superdome'], 0, 'Lambeau Field opened in 1957.'],
];
async function triviaSet(dayKey) {
  const now = time.now(); const seasons = completedSeasons(now);
  const r = rng('trivia' + dayKey);
  const qs = [];
  if (seasons.length) {
    const picks = shuffle(STAT_Q, dayKey).slice(0, 2);
    for (const [k, label] of picks) {
      const s = seasons[Math.floor(r() * seasons.length)];
      await Dt.ensureBox(s);
      const top = Dt.leaders(s, k, 6, now);
      if (top.length < 4) continue;
      const opts = shuffle(top.slice(0, 4), dayKey + k).map(L => L.n);
      qs.push({ q: `Who led the NFL in ${label} in the ${s} regular season?`, o: opts, c: opts.indexOf(top[0].n), why: `${top[0].n} (${ab(top[0].tid)}) — ${fmt.n(top[0].v, label === 'sacks' ? 1 : 0)} ${label}.` });
    }
    // Super Bowl
    const s = seasons[Math.floor(r() * seasons.length)];
    const sb = Dt.D.games.find(g => g.s === s && g.t === 3 && g.w === 5);
    if (sb) {
      const win = sb.hs > sb.as ? sb.h : sb.a, lose = Dt.opp(sb, win);
      const others = shuffle(Dt.D.games.filter(g => g.s === s && g.t === 3 && g.w < 4).flatMap(g => [g.h, g.a]).filter(t => t !== win && t !== lose), dayKey).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2);
      const opts = shuffle([win, lose, ...others], dayKey + 'sb').map(t => team(t).full);
      qs.push({ q: `Who won Super Bowl ${Dt.sbNumeral(s)} (the ${s} season)?`, o: opts, c: opts.indexOf(team(win).full), why: `${team(win).full} ${Math.max(sb.hs, sb.as)}, ${team(lose).name} ${Math.min(sb.hs, sb.as)}.` });
    }
    // best record
    const s2 = seasons[Math.floor(r() * seasons.length)];
    const st = Dt.standings(s2, now).all.slice().sort((a, b) => b.pct - a.pct || b.diff - a.diff);
    if (st[0].pct > st[1].pct) {
      const opts = shuffle(st.slice(0, 4), dayKey + 'rec').map(x => x.t.full);
      qs.push({ q: `Which team had the best regular-season record in ${s2}?`, o: opts, c: opts.indexOf(st[0].t.full), why: `${st[0].t.full} went ${st[0].w}-${st[0].l}${st[0].tie ? '-' + st[0].tie : ''}.` });
    }
  }
  // #1 draft pick
  const drafts = Dt.D.core.drafts;
  const dy = [2024, 2025, 2026].filter(y => now > Date.parse(`${y}-04-27T00:00:00Z`) && drafts[y]);
  if (dy.length) {
    const y = dy[Math.floor(r() * dy.length)], top = drafts[y].slice(0, 5);
    const opts = shuffle(top.slice(0, 4), dayKey + 'dr').map(p => p.n);
    qs.push({ q: `Who was the #1 overall pick in the ${y} NFL Draft?`, o: opts, c: opts.indexOf(top[0].n), why: `${top[0].n}, ${top[0].pos} from ${top[0].col}, to the ${team(top[0].t).full}.` });
  }
  shuffle(HIST_Q, dayKey).slice(0, 2).forEach(([q, o, c, why]) => { const sh = shuffle(o, dayKey + q); qs.push({ q, o: sh, c: sh.indexOf(o[c]), why }); });
  return shuffle(qs, dayKey + 'all').slice(0, 5);
}

/* ------------------------------------------------------------------ polls */
function polls() {
  const ph = time.phase(), s = Dt.seasonForStats();
  const now = time.now();
  const list = [];
  const st = Dt.standings(s, now).all.slice().sort((a, b) => b.pct - a.pct || b.diff - a.diff);
  if (ph === 'regular' || ph === 'post') {
    const box = App.NFL.d['box-' + s];
    if (box) {
      const top = Dt.leaders(s, 'passing.passingYards', 4, now), qbs = top.map(L => L.n);
      if (qbs.length === 4) list.push({ id: 'mvp-' + s, q: 'Who\'s your MVP right now?', o: qbs, op: top.map(L => L.pid), note: 'Top four in passing yards' });
    }
    list.push({ id: 'best-' + s + '-' + Dt.currentWeek().w, q: 'Best team in football right now?', o: st.slice(0, 4).map(x => x.t.full), ot: st.slice(0, 4).map(x => x.t.id) });
    list.push({ id: '4th-1', q: '4th & 1 at midfield, tied, 6 minutes left. What should your coach do?', o: ['Go for it', 'Punt', 'Draw them offside, then decide'] });
    const w = Dt.currentWeek();
    const gs = w.games.filter(g => Dt.state(g) === 'pre').slice(0, 4);
    if (gs.length >= 2) list.push({ id: 'motw-' + w.key, q: `Game you're most excited for this week?`, o: gs.map(g => `${ab(g.a)} @ ${ab(g.h)}`) });
  } else {
    list.push({ id: 'off-' + ph, q: ph === 'draft' ? 'What should your team do with its first pick?' : ph === 'fa' ? 'Your team\'s biggest free-agency need?' : 'What are you most looking forward to this season?',
      o: ph === 'draft' ? ['Best player available', 'Trade up', 'Trade down for more picks', 'Fill the biggest need'] : ph === 'fa' ? ['Quarterback', 'Pass rush', 'Offensive line', 'Secondary'] : ['My team\'s new rookies', 'The international games', 'Rivalry week', 'Playoff race'] });
    list.push({ id: 'champ-next', q: 'Who wins the next Super Bowl?', o: st.slice(0, 4).map(x => x.t.full), ot: st.slice(0, 4).map(x => x.t.id) });
  }
  list.push({ id: 'snack', q: 'Essential game-day food?', o: ['Wings', 'Nachos', 'Brats', 'Chili'] });
  return list;
}
function pollCounts(p) {
  const r = rng(p.id); const base = p.o.map((_, i) => Math.round((1200 + r() * 9000) * (1 - i * 0.12)));
  const mine = store.p.polls[p.id]; if (mine != null) base[mine]++;
  const tot = base.reduce((a, b) => a + b, 0);
  return { base, tot };
}
/** poll card (approved round 5): options are squared 48 px buttons, with the team's logo or the player's headshot leading when the poll
    is about teams or players. Results are the label over the 6 px meter in the team's own primary (text colour otherwise), the share in
    Stats bold, your pick checked. The vote count is Stats medium */
function pollCard(p) {
  const mine = store.p.polls[p.id];
  const { base, tot } = pollCounts(p);
  const lead = i => p.ot ? UI.logo(p.ot[i], 'sm') : p.op && p.op[i] ? UI.hs(p.op[i], 'sm') : '';
  return html`<div class="card cpad">
    <div class="t-title">${p.q}</div>${p.note ? html`<div class="t-meta mt4">${p.note}</div>` : ''}
    <div class="list cm-ans mt12">${p.o.map((o, i) => { const pc = Math.round(base[i] / tot * 100), l = lead(i);
      return html`<button class="row tap ob-qa ${mine === i ? 'on' : ''}" data-act="cm-vote" data-arg="${p.id}|${i}" ${mine != null ? raw('disabled') : ''}>${l ? html`<span class="lead-tile">${l}</span>` : ''}<span class="row-main"><span class="row-title r-sans">${p.ot ? Dt.team(p.ot[i]).name : o}</span></span>${mine != null ? html`<span class="t-meta">${pc}%</span>` : ''}<span class="ob-radio"></span></button>`; })}</div>
    <div class="t-meta mt12"><span class="lk-rec">${fmt.n(tot)}</span> votes${mine == null ? ' · vote to see results' : ''}</div></div>`;
}

/* ------------------------------------------------------------------ Pro Bowl ballot */
const PB_POS = [
  ['QB', 'Quarterback', 'passing.passingYards', ['QB'], 'pass yds'], ['RB', 'Running back', 'rushing.rushingYards', ['RB', 'FB'], 'rush yds'],
  ['WR', 'Wide receiver', 'receiving.receivingYards', ['WR'], 'rec yds'], ['TE', 'Tight end', 'receiving.receivingYards', ['TE'], 'rec yds'],
  ['DL', 'Pass rusher', 'defensive.sacks', ['DE', 'DT', 'LB'], 'sacks'], ['LB', 'Linebacker', 'defensive.totalTackles', ['LB'], 'tackles'],
  ['DB', 'Defensive back', 'defensive.passesDefended', ['CB', 'S', 'DB'], 'passes def.'], ['K', 'Kicker', 'kicking.totalKickingPoints', ['PK'], 'points'],
];

/* ------------------------------------------------------------------ fan card */
/** your fan level on Community (approved fan-level A, 2026-11-08): a link row to You, your team's logo in the 40px tile,
    "Rookie · 120 points", the fan card's ladder (one segment per level) under it, a chevron */
function fanCard() {
  const pts = fanPoints(), L = level(pts), at = LEVELS.findIndex(l => l[1] === L.name);
  const tm = store.p.primary && Dt.team(store.p.primary);
  return html`<div class="list"><a class="row tap cm-fan" data-go="#/you"><span class="lead-tile">${tm ? UI.logo(tm.id, 'sm') : icon('user', 'sm')}</span>
    <div class="row-main"><div class="row-title">${L.name} · ${fmt.n(pts)} points</div><div class="row-sub">${L.next ? `${fmt.n(L.toNext)} points to ${L.next}` : 'Top level reached'}</div>
    <div class="cm-lad">${LEVELS.map((l, i) => html`<i class="${i < at ? 'done' : i === at ? 'on' : ''}">${i === at ? raw(`<b style="width:${Math.round(L.pct * 100)}%"></b>`) : ''}</i>`)}</div></div>${icon('chev', 'sm chev')}</a></div>`;
}

/* ------------------------------------------------------------------ routes */
App.route('community', () => {
  const sqs = squads(), w = pickWeek(), ps = pickStats();
  const day = fmt.dayKey(time.now()), tri = (store.p.trivia || {})[day];
  const open = w ? w.games.filter(g => Dt.state(g) === 'pre') : [];
  const picked = w ? w.games.filter(g => store.p.picks[g.id]).length : 0;
  const pl = polls()[0];
  const tm = store.p.primary && Dt.team(store.p.primary);
  const ph = time.phase();
  return {
    title: 'Community',
    html: html`
      <div class="mt8">${fanCard()}</div>
      <div class="sec">${UI.secHead('Your squads')}
        <div class="list">${sqs.map(sq => UI.row({ left: html`<div class="cm-stack">${sq.m.slice(0, 3).map(n => avatar(n, 30))}</div>`, title: sq.n, sub: `${sq.m.length + 1} members · ${chatFor(sq).length ? 'New messages' : 'Reactions, picks & watch parties'}`, go: `#/squad/${sq.id}` }))}
          ${UI.row({ left: html`<div class="lr-ic">${icon('plus', 'sm')}</div>`, title: 'Start a squad', sub: 'Invite friends with a link', act: 'cm-new-squad' })}</div></div>
      ${w ? html`<div class="sec">${UI.secHead(`Pick'em · ${Dt.weekLabel(w.t, w.w)}`, 'Open', '#/pickem')}
        <a class="card cpad tap" data-go="#/pickem" style="display:block;margin:0 var(--pad)">
          <div class="flex between"><div><div class="h4">${open.length ? `${picked} of ${w.games.length} picked` : 'Picks are locked for this week'}</div><div class="meta mt4">${ps.n ? `Season: ${ps.right}-${ps.wrong} · ${ps.pts} pts` : 'Free to play. 10 points per correct pick.'}</div></div>${icon('pick')}</div>
          <div class="meter mt12"><i style="width:${w.games.length ? picked / w.games.length * 100 : 0}%"></i></div></a></div>` : ''}
      <div class="sec">${UI.secHead('Daily trivia')}
        <a class="card cpad tap" data-go="#/trivia" style="display:block;margin:0 var(--pad)"><div class="flex gap12"><div class="lr-ic lg">${icon('help')}</div><div class="grow">
          <div class="h4">${tri && tri.done ? `Today: ${tri.score}/5` : '5 questions from real NFL history'}</div><div class="meta mt4">${tri && tri.done ? 'New questions tomorrow' : 'Built from actual stats, drafts and Super Bowls · +10 pts each'}</div></div>${icon('chev', 'sm')}</div></a></div>
      <div class="sec">${UI.secHead('Fan poll', 'More polls', '#/polls')}<div class="pad">${pollCard(pl)}</div></div>
      <div class="sec">${UI.secHead('Have your say')}<div class="list">
        ${UI.row({ left: html`<div class="lr-ic">${icon('star', 'sm')}</div>`, title: 'Pro Bowl ballot', sub: ph === 'regular' ? 'Vote by position from this season\'s real leaders' : 'Preview the ballot · voting opens in November', go: '#/pro-bowl' })}
        ${tm ? UI.row({ left: UI.logo(tm.id, 'sm'), title: `Grade the ${tm.name}`, sub: 'Weekly report card: coach, QB, offense, defense', go: '#/grades' }) : UI.row({ left: html`<div class="lr-ic">${icon('edit', 'sm')}</div>`, title: 'Grade your team', sub: 'Follow a team to start grading', go: '#/grades' })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('book', 'sm')}</div>`, title: 'Football 101', sub: 'Lessons and quizzes · up to 30 pts each', go: '#/learn' })}
      </div></div>
      <div class="pad mt24"><div class="cm-guide">${icon('heart', 'sm')}<div><b>Rivalries welcome. Toxicity isn't.</b><div class="meta mt4">Squads are private. Long-press any message to report or mute. Strong language is filtered by default.</div></div></div></div>`,
  };
});

App.route('squad/:id', (params, query, page) => {
  const sq = squads().find(s => s.id === params.id);
  if (!sq) return { title: 'Squad', html: UI.empty('users', 'Squad not found') };
  const tab = query.tab || (page.state && page.state.tab) || 'chat';
  page.state = page.state || { tab };
  const T = page.state.tab;
  const tabsHtml = UI.tabs([{ k: 'chat', l: 'Huddle' }, { k: 'picks', l: 'Leaderboard' }, { k: 'watch', l: 'Watch together' }], T, 'cm-sq-tab');
  let body;
  if (T === 'chat') {
    const seeded = seedChat(sq);
    const mine = chatFor(sq);
    const ev = gameEvents();
    const msgs = seeded.concat(mine, ev).sort((a, b) => a.ts - b.ts);
    // approved round 5: a game update is a small card (L5 status, two L1 lines); system lines one Meta line; each message the avatar M32,
    // the name in Sans bold over the time, then the bubble
    body = html`<div class="cm-chat pad">${msgs.map(m => m.bot ? html`<div class="cm-bot"><div class="flex between"><span class="t-eyebrow">Game update</span>${UI.lk5(Dt.score(m.g))}</div><div class="mt8">${UI.lk1(m.g.a, m.as)}${UI.lk1(m.g.h, m.hs)}</div>${m.x ? html`<div class="t-meta mt6">${m.x}</div>` : ''}</div>`
        : m.sys ? html`<div class="cm-sys t-meta">${m.x}</div>`
        : m.who === 'You' ? html`<div class="cm-msg me"><div class="cm-bub">${m.x}</div></div>`
        : html`<div class="cm-msg">${avatar(m.who, 32)}<div><div class="cm-who"><b>${m.who}</b><span>${fmt.ago(m.ts)}</span></div><div class="cm-bub">${m.x}</div></div></div>`)}</div>
      <div class="cm-compose"><div class="cm-quick">${SQ_EMO.map(q => html`<button class="chip cm-emo" data-act="cm-send-quick" data-arg="${q}">${q}</button>`)}</div>
        <div class="cm-quick">${SQ_TAKES.map(q => html`<button class="chip" data-act="cm-send-quick" data-arg="${q}">${q}</button>`)}</div>
        <div class="tiny mt8">${icon('heart', 'xs')} Squads talk in emoji and quick takes only, so everything stays friendly.</div></div>`;
  } else if (T === 'picks') {
    const sc = page.state.scope || 'week';
    const rows = board(sq, sc);
    body = html`<div class="pad mt12">${UI.seg([{ k: 'week', l: 'This week' }, { k: 'season', l: 'Season' }], sc, 'cm-sq-scope')}</div>
      <div class="list mt12">${rows.map((r, i) => UI.row({ left: html`<span class="rank">${i + 1}</span>${r.me ? myAvatar(32) : avatar(r.n, 32)}`, title: r.me ? 'You' : r.n, sub: r.me ? 'Your picks' : (friendTeam(r.n) || {}).full, right: html`<span class="num b">${r.v} pts</span>`, cls: r.me ? 'cm-me' : '' }))}</div>
      <div class="pad mt16"><a class="btn primary block" data-go="#/pickem">Make your picks</a><div class="tiny center mt8">Free to play · bragging rights only</div></div>`;
  } else {
    const ids = new Set([...store.p.teams, ...sq.m.map(n => (friendTeam(n) || {}).id)]);
    const now = time.now();
    const gs = Dt.D.games.filter(g => (ids.has(g.h) || ids.has(g.a)) && Dt.state(g) !== 'post' && g.ts < now + 8 * 864e5 && Dt.scheduleVisible(g)).slice(0, 6);
    body = html`<div class="pad mt12 meta">Start a watch party and your squad's reactions stay in sync with your stream — nobody gets spoiled by a delay.</div>
      <div class="cards mt12">${gs.length ? gs.map(g => html`<div class="card cpad"><div class="flex gap10">${UI.logo(g.a)}<div class="grow"><div class="h4">${team(g.a).name} @ ${team(g.h).name}</div><div class="meta">${Dt.state(g) === 'live' ? raw('<span class="c-live b">Live now</span>') : fmt.day(g.ts) + ' · ' + fmt.time(g.ts)}</div></div>${UI.logo(g.h)}</div>
          <button class="btn ${Dt.state(g) === 'live' ? 'live' : 'primary'} sm block mt12" data-go="#/watch-party/${g.id}">${icon('users', 'sm')}${Dt.state(g) === 'live' ? 'Start watch party' : 'Schedule watch party'}</button></div>`) : UI.empty('calendar', 'No games this week', 'Watch parties open when your squad\'s teams are on.')}</div>`;
  }
  return {
    title: sq.n,
    right: html`<button class="icon-btn" data-act="cm-sq-info" data-arg="${sq.id}" aria-label="Squad info">${icon('dots')}</button>`,
    sub: html`<div class="pad flex gap8" style="padding-bottom:8px"><div class="cm-stack">${sq.m.map(n => avatar(n, 26))}${myAvatar(26)}</div><span class="tiny">${sq.m.length + 1} members</span></div>${tabsHtml}`,
    html: html`${body}`,
    mount(el) {
      const ch = el.querySelector('.cm-chat'), cp = el.querySelector('.cm-compose');
      if (ch && cp) { ch.style.minHeight = Math.max(200, el.clientHeight - ch.offsetTop - cp.offsetHeight - 82 - 40) + 'px'; el.scrollTop = el.scrollHeight; }
    },
  };
});

App.route('pickem', () => {
  const w = pickWeek();
  if (!w) return { title: 'Pick\'em', html: UI.empty('pick', 'Pick\'em is resting', 'It returns when the regular season kicks off. Meanwhile, try daily trivia.', html`<button class="btn primary mt16" data-go="#/trivia">Play trivia</button>`) };
  const ps = pickStats(), now = time.now();
  const days = {};
  w.games.forEach(g => (days[fmt.dayKey(g.ts)] = days[fmt.dayKey(g.ts)] || []).push(g));
  // pickem-game B (2026-11-08): two squared outline team buttons side by side, ink outline when picked, name in Sans, score in Display, no fading
  // (was round 5 v2: the two teams side by side as squared tiles (logo L48, nickname in Display, record in Stats medium), your pick a
  // 2 px ring in that team's own primary with a check disc; the header the L5 status and "Locks in" in Meta; after the final each
  // tile shows its score in Display, the losing side at 60%, and a soft Right or Wrong pill)
  const pickRow = g => {
    const st = Dt.state(g, now), mine = store.p.picks[g.id], cons = consensus(g);
    const hide = Dt.spoiled(g) && st !== 'pre', fin = st === 'post' && !hide;
    const win = st === 'post' ? (g.hs > g.as ? g.h : g.as > g.hs ? g.a : null) : null;
    const S = Dt.score(g, now);
    const tile = tid => {
      const on = mine === tid, sc = tid === g.a ? S.as : S.hs;
      return html`<button class="cm-pick ${on ? 'on' : ''}" ${st === 'pre' ? raw(`data-act="cm-pick" data-arg="${g.id}:${tid}"`) : raw('disabled')} style="--tc:${App.teamFill(team(tid))}">
        ${UI.logo(tid, 'lg')}<b class="cm-pk-nm r-sans">${team(tid).name}</b><span class="cm-pk-rec">${Dt.record(tid, g.s, g.ts - 1).str}</span>${fin ? html`<em class="cm-pk-sc">${sc}</em>` : ''}</button>`;
    };
    const status = st === 'pre' ? UI.lk5({ st: 'pre', label: fmt.time(g.ts) }) : hide ? UI.lk5({ st, label: st === 'live' ? 'Live' : 'Final' }, true) : UI.lk5(S);
    const right = st === 'pre' ? html`<span class="t-meta">Locks in ${fmt.until(g.ts)}</span>` : fin && mine ? html`<span class="badge ${win === mine ? 'win' : 'loss'}">${win === mine ? 'Right' : 'Wrong'}</span>` : html`<span class="t-meta">${mine ? 'Locked' : 'No pick'}</span>`;
    const foot = mine ? (fin ? `You picked ${ab(mine)} · ${win === mine ? '+10 pts' : '0 pts'}` : `${mine === g.a ? 100 - cons : cons}% of fans picked ${ab(mine)}`) : st === 'pre' ? `${Math.max(cons, 100 - cons)}% of fans picked ${ab(cons >= 50 ? g.h : g.a)}` : '';
    return html`<div class="card cpad">
      <div class="flex between">${status}${right}</div>
      <div class="cm-picks mt12">${tile(g.a)}<span class="t-meta">at</span>${tile(g.h)}</div>${foot ? html`<div class="t-meta cm-pkf">${foot}</div>` : ''}</div>`;
  };
  const open = w.games.filter(g => Dt.state(g, now) === 'pre').length;
  return {
    title: 'Pick\'em',
    html: html`
      <div class="pad-all"><div class="eyebrow">${Dt.weekLabel(w.t, w.w)} · ${w.s}</div><div class="h1 mt8" style="font-size:28px">${w.games.length > 1 ? 'Pick every winner' : 'Pick the winner'}</div>
        <p class="muted mt8">Free to play. 10 points for each correct pick. Picks lock at kickoff.</p>
        <div class="mt12">${UI.statRow([[`${ps.right}-${ps.wrong}`, 'Season'], [ps.pts, 'Points'], [ps.streak, 'Streak']])}</div>
        ${open ? html`<button class="btn ghost sm mt12" data-act="cm-autopick">${icon('sparkle', 'sm')} Pick the rest with fan favourites</button>` : ''}</div>
      ${Object.entries(days).map(([d, gs]) => html`<div class="sec" style="margin-top:12px"><div class="pad eyebrow mb8">${fmt.dayLong(gs[0].ts)}</div><div class="cards">${gs.map(pickRow)}</div></div>`)}
      <div class="pad mt24 tiny center">Just for fun — no money, no odds. Your squads see your record on their leaderboards.</div>`,
  };
});

App.route('trivia', (params, query, page) => {
  const day = fmt.dayKey(time.now());
  return triviaSet(day).then(qs => {
    const T = (store.p.trivia = store.p.trivia || {})[day] = store.p.trivia[day] || { a: {} };
    const n = Object.keys(T.a).length, score = qs.filter((q, i) => T.a[i] === q.c).length;
    return {
      title: 'Daily trivia',
      html: html`<div class="pad-all"><div class="eyebrow">${fmt.dayLong(time.now())}</div><div class="h1 mt8" style="font-size:28px">Daily trivia</div>
          <p class="muted mt8">Five questions built from real NFL data. +10 points per correct answer.</p>
          <div class="flex gap6 mt12">${qs.map((q, i) => html`<span class="cm-dot ${T.a[i] == null ? '' : T.a[i] === q.c ? 'ok' : 'bad'}"></span>`)}</div></div>
        <div class="cards" data-n="${qs.length}">${qs.map((q, i) => {
          const a = T.a[i];
          if (i > n) return '';
          return html`<div class="card cpad rise"><div class="tiny">Question ${i + 1} of ${qs.length}</div><div class="h4 mt6">${q.q}</div>
            <div class="list cm-ans mt12">${q.o.map((o, j) => html`<button class="row tap ob-qa ${a != null && j === q.c ? 'on' : ''}" data-act="cm-tri" data-arg="${i}:${j}:${q.c}" ${a != null ? raw('disabled') : ''}><span class="row-main"><span class="row-title">${o}</span></span>${a != null && a === j && j !== q.c ? html`<span class="t-meta">Your pick</span>` : ''}<span class="ob-radio"></span></button>`)}</div>
            ${a != null ? html`<div class="meta mt12">${a === q.c ? 'Correct. ' : 'Not quite. '}${q.why}</div>` : ''}</div>`;
        })}</div>
        ${n === qs.length ? html`<div class="pad mt16"><div class="card cpad center"><div class="big-num">${score}/${qs.length}</div><div class="b mt6">${score === qs.length ? 'Perfect score!' : score >= 3 ? 'Strong showing.' : 'Tomorrow\'s yours.'}</div><div class="meta mt4">+${score * 10} fan points · new questions every day</div>
          <button class="btn ghost block mt12" data-act="cm-share-tri" data-arg="${score}">${icon('share', 'sm')} Share result</button></div></div>` : ''}`,
    };
  });
});

App.route('polls', () => ({
  title: 'Fan polls',
  html: html`<div class="pad-all"><p class="t-meta">What fans think, this week. Vote to see results.</p></div><div class="cards">${polls().map(pollCard)}</div>`,
}));

App.route('pro-bowl', (params, query, page) => {
  const s = Dt.seasonForStats();
  return Dt.ensureBox(s).then(() => {
    page.state = page.state || { conf: (store.p.primary && (Dt.team(store.p.primary) || {}).conf) || 'AFC' };
    const conf = page.state.conf, now = time.now();
    const votes = store.p.probowl = store.p.probowl || {};
    const voted = PB_POS.filter(p => votes[conf + p[0]]).length;
    const sections = PB_POS.map(([k, label, path, poss, unit]) => {
      const list = Dt.leaders(s, path, 6, now, L => { const p = Dt.player(L.pid); return p && poss.includes(p.pos) && (Dt.team(L.tid) || {}).conf === conf; });
      return html`<div class="sec" style="margin-top:20px"><div class="sec-head"><div class="h2">${label}</div><span class="tiny">${votes[conf + k] ? 'Voted' : 'Pick one'}</span></div>
        <div class="list">${list.map(L => UI.row({ left: UI.hs(L.pid, 'sm'), title: L.n, sub: `${ab(L.tid)} · ${fmt.n(L.v, unit === 'sacks' ? 1 : 0)} ${unit}`, right: html`<span class="cm-radio ${votes[conf + k] === L.pid ? 'on' : ''}">${icon('check', 'xs')}</span>`, act: 'cm-pb', arg: `${conf + k}|${L.pid}` }))}
        ${!list.length ? html`<div class="row static meta">No qualifying stats yet.</div>` : ''}</div></div>`;
    });
    return {
      title: 'Pro Bowl ballot',
      sub: html`<div class="pad" style="padding-bottom:10px">${UI.seg([{ k: 'AFC', l: 'AFC' }, { k: 'NFC', l: 'NFC' }], conf, 'cm-pb-conf')}</div>`,
      html: html`<div class="pad-all"><div class="eyebrow">${s} season · ranked by real stats</div><div class="h1 mt8" style="font-size:28px">Pro Bowl ballot</div>
          <p class="muted mt8">Fans' votes count alongside players and coaches. Candidates are the ${conf}'s statistical leaders at each spot${time.phase() !== 'regular' ? ' — voting opens in November' : ''}.</p>
          <div class="flex gap10 mt12"><div class="meter grow"><i style="width:${voted / PB_POS.length * 100}%"></i></div><span class="tiny num">${voted}/${PB_POS.length}</span></div></div>
        ${sections}
        <div class="pad mt24"><button class="btn primary block" data-act="cm-pb-submit" ${voted ? '' : raw('disabled')}>Submit ${conf} ballot</button></div>`,
    };
  });
});

const GRADES = ['A', 'B', 'C', 'D', 'F'];
App.route('grades', (params, query, page) => {
  const tid = (page.state && page.state.tid) || store.p.primary || store.p.teams[0];
  if (!tid) return { title: 'Fan grades', html: UI.empty('edit', 'Follow a team first', 'Grades are for the team you root for.', html`<button class="btn primary mt16" data-go="#/teams/all">Find your team</button>`) };
  page.state = page.state || { tid };
  const tm = Dt.team(tid), w = Dt.currentWeek(), key = tid + ':' + (w ? w.key : 'off');
  const all = store.p.grades = store.p.grades || {};
  const mine = all[key] = all[key] || {};
  const depth = Dt.D.core.depth[tid] || [];
  const off = depth.find(f => f.pos.some(p => p.k === 'QB'));
  const qbId = off && (off.pos.find(p => p.k === 'QB') || {}).ids[0];
  const qb = qbId && Dt.player(qbId);
  const rec = Dt.record(tid, Dt.seasonForStats());
  const base = rec.w + rec.l ? rec.w / (rec.w + rec.l) : 0.5;
  const subjects = [['coach', 'Head coach', tm.coach || 'Head coach'], ['qb', 'Quarterback', qb ? qb.n : 'Starting QB'], ['offense', 'Offense', 'Play-calling & execution'], ['defense', 'Defense', 'Stopping the other guys'], ['front', 'Front office', 'Roster building & moves']];
  const avg = k => { const r = rng(key + k)(); const v = Math.max(0, Math.min(4, Math.round((1 - base) * 3.2 + (r - 0.5) * 1.4))); return GRADES[v]; };
  const myTeams = store.p.teams.length > 1 ? UI.chips(store.p.teams.map(t => ({ k: t, l: Dt.team(t).abbr })), tid, 'cm-gr-team') : '';
  return {
    title: 'Fan grades',
    html: html`<div class="fr-hero" style="${raw(App.teamVars(tm))}"><div class="fr-hero-t"><div><div class="fr-hero-eb">${w ? Dt.weekLabel(w.t, w.w) : 'Offseason'} report card</div><div class="fr-hero-n">${tm.name.toUpperCase()}</div></div>${UI.logo(tm.id, 'lg')}</div>
        <div class="fr-hero-s"><div><b>${rec.str}</b><span>${tm.conf} ${tm.div}</span></div></div></div>
      ${myTeams ? html`<div class="mt12">${myTeams}</div>` : ''}
      <div class="cards mt16">${subjects.map(([k, label, who]) => html`<div class="card cpad cm-gp">
        <div class="flex between"><div><div class="cm-gp-t">${label}</div><div class="t-meta">${who}</div></div><div class="cm-gp-f"><span>Fans say</span><b>${avg(k)}</b></div></div>
        <div class="cm-gp-row">${GRADES.map(g => html`<button class="sc-season ${mine[k] === g ? 'on' : ''}" data-act="cm-grade" data-arg="${key}|${k}|${g}">${g}</button>`)}</div></div>`)}</div>
      <div class="pad mt16 tiny center">Grades reset every week. Be honest, be fair — players read this stuff too.</div>`,
  };
});

/* ------------------------------------------------------------------ actions */
const A = App.actions;
A['cm-vote'] = (el, ev, arg) => { const [id, i] = arg.split('|'); store.p.polls[id] = +i; store.p.points += 5; store.save(); App.refresh(); };
A['cm-pick'] = (el, ev, arg) => {
  const [gid, tid] = arg.split(':'); const g = Dt.game(gid);
  if (Dt.state(g) !== 'pre') return App.toast({ title: 'This game has kicked off', icon: 'lock' });
  if (store.p.picks[gid] === tid) delete store.p.picks[gid]; else store.p.picks[gid] = tid;
  store.save(); award('picker'); if (pickStats().right >= 5) award('sharp');
  App.refresh();
};
A['cm-autopick'] = () => {
  const w = pickWeek(); let n = 0;
  w.games.forEach(g => { if (Dt.state(g) === 'pre' && !store.p.picks[g.id]) { store.p.picks[g.id] = consensus(g) >= 50 ? g.h : g.a; n++; } });
  store.save(); award('picker'); App.toast({ title: `Filled ${n} picks`, body: 'Change any of them until kickoff.', icon: 'check' }); App.refresh();
};
A['cm-tri'] = (el, ev, arg) => {
  const [i, j, c] = arg.split(':').map(Number); const day = fmt.dayKey(time.now());
  const T = store.p.trivia[day]; if (T.a[i] != null) return;
  T.a[i] = j; T.ok = T.ok || {}; T.ok[i] = j === c;
  if (j === c) store.p.points += 10;
  const n = Object.keys(T.a).length, total = +(el.closest('.cards')?.dataset.n || 5);
  if (n >= total) { T.done = true; T.score = Object.values(T.ok).filter(Boolean).length; if (T.score === total) award('trivia'); }
  store.save();
  App.refresh();
  setTimeout(() => { const cards = App.current().el.querySelectorAll('.card'); cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
};
A['cm-share-tri'] = (el, ev, s) => App.toast({ title: 'Copied to clipboard', body: `NFL daily trivia: ${s}/5`, icon: 'share' });
A['cm-sq-tab'] = (el, ev, k) => { const p = App.current(); p.state.tab = k; App.refresh(); };
A['cm-sq-scope'] = (el, ev, k) => { const p = App.current(); p.state.scope = k; App.refresh(); };
function send(text) {
  const p = App.current(); const sq = squads().find(s => s.id === p.params.id); if (!sq || !text) return;
  const all = store.p.squadChat = store.p.squadChat || {};
  (all[sq.id] = all[sq.id] || []).push({ who: 'You', ts: time.now(), x: text });
  store.save(); App.refresh(); p.el.scrollTop = p.el.scrollHeight;
  const replies = ['Facts.', 'Bold take', 'This is our year', 'Agreed', 'Talk to me after Sunday', '😂', '🔥'];
  setTimeout(() => {
    const who = sq.m[Math.floor(Math.random() * sq.m.length)];
    all[sq.id].push({ who, ts: time.now(), x: replies[Math.floor(Math.random() * replies.length)] });
    store.save();
    const cur = App.current(); if (cur === p) { App.refresh(); p.el.scrollTop = p.el.scrollHeight; }
    else App.toast({ title: `${who} in ${sq.n}`, body: all[sq.id][all[sq.id].length - 1].x, icon: 'chat', go: `#/squad/${sq.id}` });
  }, 1600);
}
A['cm-send-quick'] = (el, ev, q) => send(q);
A['cm-sq-info'] = (el, ev, id) => {
  const sq = squads().find(s => s.id === id);
  App.sheet({ title: sq.n, html: html`<div class="list">${sq.m.map(n => UI.row({ left: avatar(n), title: n, sub: (friendTeam(n) || {}).full + ' fan' }))}${UI.row({ left: myAvatar(), title: 'You', sub: 'Member' })}</div>
    <div class="pad mt16 col gap8"><button class="btn primary block" data-act="cm-invite">${icon('share', 'sm')} Invite with link</button><button class="btn ghost block" data-act="cm-mute">${icon('bell', 'sm')} Mute for 8 hours</button></div>` });
};
A['cm-invite'] = () => { App.closeSheet(); App.toast({ title: 'Invite link copied', body: 'Anyone with the link can join this squad.', icon: 'share' }); };
A['cm-mute'] = () => { App.closeSheet(); App.toast({ title: 'Muted for 8 hours', icon: 'bell' }); };
A['cm-new-squad'] = () => {
  App.sheet({ title: 'Start a squad', html: html`<div class="pad"><p class="meta">A private group for chat, free pick'em and synced watch parties.</p>
    <input class="input mt12 cm-sqname" placeholder="Squad name, e.g. Office League" maxlength="32">
    <div class="eyebrow mt16 mb8">Add friends</div><div class="chips" style="padding:0;flex-wrap:wrap">${FRIENDS.map(([n]) => html`<button class="chip cm-fr" data-n="${n}" onclick="this.classList.toggle('on')">${n}</button>`)}</div>
    <button class="btn primary block mt16" data-act="cm-create-squad">Create squad</button></div>` });
};
A['cm-create-squad'] = (el) => {
  const sh = el.closest('.sheet');
  const n = sh.querySelector('.cm-sqname').value.trim() || 'My Squad';
  const m = [...sh.querySelectorAll('.cm-fr.on')].map(b => b.dataset.n);
  const id = n.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-4);
  squads().push({ id, n, m: m.length ? m : ['Maya', 'Sam'] }); store.save(); award('squad');
  App.closeSheet(); App.go('#/squad/' + id);
};
A['cm-badges'] = () => {
  App.sheet({ title: 'Badges', html: html`<div class="list">${Object.entries(BADGES).map(([k, [ic, n, d]]) => UI.row({ left: html`<span class="cm-badge ${store.p.badges.includes(k) ? '' : 'locked'}">${icon(ic, 'sm')}</span>`, title: n, sub: d, right: store.p.badges.includes(k) ? html`<span class="badge win">Earned</span>` : html`<span class="tiny">Locked</span>` }))}</div>` });
};
A['cm-pb'] = (el, ev, arg) => { const [k, pid] = arg.split('|'); const v = store.p.probowl; v[k] = v[k] === pid ? undefined : pid; store.save(); App.refresh(); };
A['cm-pb-conf'] = (el, ev, k) => { App.current().state.conf = k; App.refresh(); };
A['cm-pb-submit'] = () => {
  const conf = App.current().state.conf;
  if (!store.p.badges.includes('voter')) store.p.points += 25;
  award('voter'); store.save();
  App.toast({ title: `${conf} ballot submitted`, body: 'You can vote once a day until voting closes.', icon: 'check' });
};
A['cm-grade'] = (el, ev, arg) => { const [key, k, g] = arg.split('|'); const m = store.p.grades[key]; m[k] = m[k] === g ? undefined : g; store.save(); award('grader'); App.refresh(); };
A['cm-gr-team'] = (el, ev, tid) => { App.current().state.tid = tid; App.refresh(); };

App.COMMUNITY.fanPoints = fanPoints; App.COMMUNITY.level = level; App.COMMUNITY.pickStats = pickStats;
})();
