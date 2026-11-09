/* Approvals round 5 (molecules), batch b: cards keyed by id in window.R5_CARDS, picked up by round5.js.
   The game page's feed, moments, tabs and moments of celebration, and the team page's molecules. "Current" draws the real
   builder (or the real screen when the builder is private); "Proposed" is built only from the locked atoms and type roles,
   with the shared lockups L1–L5 below (identical in every batch). */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const { icon, fmt } = App, UI = App.UI, Dt = App.data;
const { S, esc, team, phone, none, C } = DSApprovals.h;
const GP = () => App.gameParts, TP = () => App.teamParts;

/* ------------------------------------------------------------------ helpers */
/** one labelled specimen: what it is, where it lives, then the markup */
const V = (label, where, inner) => `<div class="r5b-v"><div class="r5b-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r5b-vb">${inner}</div></div>`;
/** a phone-width column on the page background, so a molecule is seen at the size it ships */
const PH = (inner, cls = '') => `<div class="r5b-ph ${cls}">${inner}</div>`;
const prim = t => (App.teamRoles(t) || {}).primary || t.color;
const lg = (tid, cls = 'sm') => S(UI.logo(tid, cls));
const light = t => `<img class="logo" src="${t.logoDark || t.logo}" alt="">`;
const tid0 = () => C().tm.id;
const live = () => C().mLive, pre = () => C().mPre;
const post = () => GP().model(C().G.post);
const caption = (p, g) => esc(App.playCaption ? App.playCaption(p, g) : p.x);
const clk = p => `${p.q > 4 ? 'OT' : 'Q' + p.q} ${p.c || ''}`.trim();
const RXE = { fire: '&#x1F525;', hype: '&#x1F64C;', clap: '&#x1F44F;', shock: '&#x1F631;', ugh: '&#x1F629;' };
const pills = list => `<span class="r5b-rx">${list.map(([k, n]) => `<span class="rx-chip">${RXE[k]} <b class="num">${fmt.n(n)}</b></span>`).join('')}</span>`;
const btn = (cls, ic, label) => `<button class="btn ${cls}">${ic ? S(icon(ic, 'sm')) : ''}${label ? ` ${label}` : ''}</button>`;
/** a real play with a touchdown, a field goal and an ordinary snap from the live game */
const playsOf = m => (m.plays || []).filter(p => p.ty && p.ty !== 'Official Timeout');
const scoring = m => playsOf(m).filter(p => p.sc && p.team);

/* ------------------------------------------------------------------ shared lockups (the same in every batch) */
/** L1 team-score line: logo S24, tricode (Display), 6 px Live-red possession dot, score (Display) right; the loser at 60% when final */
const L1 = (t, score, o = {}) => `<div class="lk-l1${o.dim ? ' dim' : ''}${o.on ? ' on' : ''}">${o.on ? light(t) : lg(t.id, 'sm')}<b class="lk-tri">${esc(t.abbr)}</b>${o.poss ? '<i class="lk-poss" title="Has the ball"></i>' : ''}<b class="lk-sc">${score == null ? '' : score}</b></div>`;
/** L2 team row: logo M32, team name (Display), record (Stats medium, Meta size) */
const L2 = (t, rec, o = {}) => `<div class="lk-l2">${lg(t.id, 'md')}<div class="lk-l2t"><b class="lk-name">${esc(o.full ? t.full : t.name)}</b>${rec ? `<span class="lk-l2s"><span class="lk-rec">${esc(rec)}</span>${o.after ? `<span class="lk-meta">&nbsp;· ${esc(o.after)}</span>` : ''}</span>` : ''}</div></div>`;
/** L3 player line: headshot S32 or M44, name (Sans bold), meta "POS · TEAM" (Sans medium, text-2) */
const L3 = (pid, o = {}) => {
  const p = Dt.player(pid) || { n: o.name || '' }, t = Dt.team(p.t);
  const meta = o.meta != null ? o.meta : [p.pos, t && t.abbr].filter(Boolean).join(' · ');
  return `<div class="lk-l3${o.m ? ' m' : ''}">${S(UI.hs(pid, o.m ? '' : 'sm'))}<div class="lk-l3t"><b class="lk-pn">${esc(o.name || p.n)}${o.badge || ''}</b>${meta ? `<span class="lk-meta">${esc(meta)}</span>` : ''}</div></div>`;
};
/** L4 stat pair: value (Stats bold) over its label (Meta) */
const L4 = (v, l, o = {}) => `<div class="lk-l4${o.r ? ' r' : ''}"><b${o.c ? ` style="color:${o.c}"` : ''}>${v}</b><span>${esc(l)}</span></div>`;
/** L5 status: the Live badge with its dot; a soft neutral badge for Final, kickoff and Bye */
const L5 = (kind, txt) => kind === 'live' ? `<span class="badge live">${esc(txt || 'Live')}</span>` : `<span class="badge lk-soft">${esc(txt)}</span>`;

/* ------------------------------------------------------------------ game: plays, moments, story */
/** draw a real builder with the team colour as the team's own primary (App.readable() gives a shade of it) */
const asPrimary = fn => { const r0 = App.readable; App.readable = t => (t && t.color) || r0(t); try { return S(fn()); } finally { App.readable = r0; } };
const frag = h => { const d = document.createElement('div'); d.innerHTML = h; return d; };
R['play-row'] = { id: 'play-row', v: 2, name: 'Play row', target: 'liveFeed() .lf-item · playsTab() .dr2-p · playRow() .gc-play',
  ctx: ['game/__LIVE__', '.lv-feed'],
  changes: [
    'v2, from your note ("I like the original better"): the original stays. The Live feed card on its timeline rail, with the team logo in the dot, the eyebrow, the clock, the play, the reactions and Watch, and the drive list on the Plays tab, are both drawn exactly as they are today.',
    'Only two things change, and both come from rules you already approved. The edge of a big play and the win chance bar use the team\'s own primary; today App.readable() swaps in a shade of it. The reaction counts become the approved reaction pills; today they are loose emoji, a second style of the same atom.',
    'The drive list is unchanged. Its down & distance now uses Sans medium, as it does everywhere.',
    'playRow() (.gc-play), which nothing on screen draws, is deleted.',
  ],
  current: () => {
    const m = live();
    return V('Live feed', 'liveFeed() · .lv-feed .lf-item · game Live tab', PH(`<div class="r5b-clip">${S(GP().liveFeed(m))}</div>`))
      + V('Drive plays', 'playsTab() · .dr2-p · game Plays tab', PH(`<div class="r5b-clip">${S(GP().playsTab(m, { state: { open: {}, filter: 'all', q: 0 } }))}</div>`))
      + V('playRow()', '.gc-play · defined in game.js, drawn nowhere', none('No screen calls playRow() today.'));
  },
  proposed: () => {
    const m = live(), d = frag(asPrimary(() => GP().liveFeed(m)));
    d.querySelectorAll('.lf-rx > span').forEach(s => { const t = s.textContent.trim(), k = t.indexOf(' '); s.className = 'rx-chip'; s.innerHTML = `${t.slice(0, k)} <b class="num">${esc(t.slice(k + 1))}</b>`; });
    return V('Live feed', 'the original card: primary edge, reaction pills', PH(`<div class="r5b-clip r5b-pr2">${d.innerHTML}</div>`))
      + V('Drive plays', 'unchanged', PH(`<div class="r5b-clip">${S(GP().playsTab(m, { state: { open: {}, filter: 'all', q: 0 } }))}</div>`));
  } };

/** a key moment from the play-by-play: what kind it is and which team it went for */
const KIND = p => /Touchdown/i.test(p.ty) ? 'Touchdown' : /Field Goal Good/i.test(p.ty) ? 'Field goal' : /Interception/i.test(p.ty) ? 'Interception'
  : /Fumble/i.test(p.ty) && /Opponent|Recover/i.test(p.ty) ? 'Fumble recovered' : /Safety/i.test(p.ty) ? 'Safety'
  : (p.y || 0) >= 25 && /Pass|Rush|Run|Reception/i.test(p.ty) && !/Goal|Punt|Kick/i.test(p.ty) ? 'Big play' : null;
/** the biggest moments by the app's own weighting (keyMoments(): touchdowns and takeaways first), then newest first */
const WEIGHT = { Touchdown: 12, Interception: 10, 'Fumble recovered': 10, Safety: 8, 'Big play': 5, 'Field goal': 3 };
const moments = (m, n) => { const { g, away, home } = m; return playsOf(m).map((p, i) => ({ p, i, k: KIND(p) })).filter(x => x.k)
  .sort((a, b) => (WEIGHT[b.k] + (b.p.y || 0) / 20) - (WEIGHT[a.k] + (a.p.y || 0) / 20)).slice(0, n).sort((a, b) => b.i - a.i).map(x => {
  const off = team(x.p.team) || home, t = /Interception|Fumble/.test(x.k) ? (off.id === g.a ? home : away) : off;
  return { ...x, t, dur: `0:${String(9 + ((x.p.q * 7 + parseInt(x.p.c || '0', 10)) % 15)).padStart(2, '0')}` }; }); };
/** the score after the moment: tricode and score in Display, the side it did not go for at 60% */
const after = (m, x) => { const { away, home } = m, s = (tm, v) => `<span class="r5b-k2-s${tm.id === x.t.id ? '' : ' dim'}"><b class="lk-tri">${esc(tm.abbr)}</b><b class="lk-sc">${v}</b></span>`;
  return `<span class="r5b-k2-sl">${s(away, x.p.as)}${s(home, x.p.hs)}</span>`; };
/* v3: a slider of moment cards. Helmets are square images (440 × 440), so they sit in square boxes with object-fit: contain,
   facing right, never cropped. One primary (the play), one big secondary (the score after it), then meta (kind, quarter and clock). */
const hel = (t, c) => S(UI.helmet(t.id, { cls: 'r5b-k3-hel ' + c }));
const kmeta = x => `<span class="r5b-k3-meta">${x.k} · ${x.p.q > 4 ? 'OT' : 'Q' + x.p.q} ${esc(x.p.c || '')}</span>`;
const KM = {
  /* a: highlight card. The clip on top in the team's own gradient, then the play, the score after it, and the meta line */
  a: x => `<div class="r5b-k3 r5b-k3a" style="${App.teamVars(x.t)}"><div class="r5b-k3a-pic tsurf">${hel(x.t, 'l')}<span class="km-dur">${S(icon('play', 'xs'))} ${x.dur}</span></div>
    <div class="r5b-k3-body">${kmeta(x)}<b class="r5b-k3-play">${caption(x.p, x.g)}</b><div class="r5b-k3-sc">${after(x.m, x)}</div></div></div>`,
  /* b: no picture. A team-colour edge on top, the logo and meta, the play, and the score after it as the big number at the foot */
  b: x => `<div class="r5b-k3 r5b-k3b" style="--tp:${prim(x.t)}"><div class="r5b-k3-body"><span class="r5b-k3b-k">${lg(x.t.id, 'sm')}${kmeta(x)}</span><b class="r5b-k3-play">${caption(x.p, x.g)}</b>
    <div class="r5b-k3b-foot"><div class="r5b-k3-sc">${after(x.m, x)}</div><button class="btn sm">${S(icon('play', 'sm'))} ${x.dur}</button></div></div></div>`,
  /* c: split. A solid team-colour panel on the left with the helmet facing right into the card, the words on the right */
  c: x => `<div class="r5b-k3 r5b-k3c" style="--tp:${prim(x.t)}"><div class="r5b-k3c-side">${hel(x.t, 'm')}<span class="km-dur">${x.dur}</span></div>
    <div class="r5b-k3-body">${kmeta(x)}<b class="r5b-k3-play">${caption(x.p, x.g)}</b><div class="r5b-k3-sc">${after(x.m, x)}</div></div></div>`,
};
const kmRail = (m, k) => { const xs = moments(m, 5).map(x => ({ ...x, m, g: m.g })), f = KM[k] || KM.a;
  return `<div class="r5b-k3-head"><span class="r5b-eb">Key moments</span><span class="r5b-k3-n">1 of ${xs.length}</span></div>
    <div class="r5b-k3-rail">${xs.map(f).join('')}</div><div class="r5b-k3-dots">${xs.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>`; };
R['key-moments'] = { id: 'key-moments', v: 3, name: 'Key moments', target: 'gameParts.keyMoments() · .lv-km .km .km-bug',
  changes: [
    'v3, from your note ("it should be a slider but please give some better designs. you squished the helmets and the text hierarchy is terrible"): the moments are now a slider. Cards snap one at a time, the next card peeks in from the right, and a count ("1 of 5") and page dots show where you are. All three options below are slider cards; pick the card design.',
    'The helmets were squished because they were forced into an 84 × 68 box. The helmet images are square, so every helmet now sits in a square box and is scaled to fit. It faces right and is never cropped.',
    'One hierarchy in every option. First the play, in Sans bold at 16 px ("Mahomes pass to Rice for 32 yards, touchdown"). Then the score after it, as the big number: tricodes and scores in Display, with the side it did not go for at 60%. Last, one meta line in Sans medium text-2: the kind of moment, the quarter and the clock.',
    'Option A, highlight card: the clip on top in the team\'s own gradient with the helmet and the clip length, then the three lines. Option B, no picture: a team-colour edge on top, the logo by the meta line, and the score at the foot beside a squared play button. Option C, split: a solid team-colour panel on the left with the helmet facing into the card, and the three lines on the right.',
  ],
  options: [{ k: 'a', name: 'Highlight card', note: 'The clip on top in the team gradient, then the play, the score after it and the meta line.' },
    { k: 'b', name: 'No picture', note: 'A team-colour edge, the play, and the score after it as the big number beside a play button.' },
    { k: 'c', name: 'Split', note: 'A solid team-colour panel with the helmet on the left, the play and the score on the right.' }],
  current: () => V('Rail of moments', 'keyMoments() · game Live tab and Recap tab', PH(S(GP().keyMoments(live())) || none('No moments yet.'))),
  proposed: k => V('Key moments slider', 'snap scroll · next card peeks · 1 of N and dots', PH(kmRail(live(), k))) };

/** a team's colour that reads as colour at icon size: its primary, or its second sheet colour when the primary is near black (Packers, Texans) */
const lum = h => { const n = parseInt(String(h || '#000').slice(1, 7), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const vivid = t => lum(prim(t)) < .045 && t.alt && lum(t.alt) > .045 && lum(t.alt) < .9 ? t.alt : prim(t);
/** the team a catch-up point is about: the player it names, found on either roster */
const ptTeam = (m, t) => { const w = t.split(' is ')[0].split(' was ')[0].split(' has ')[0].split(' had ')[0].split(' went ')[0].trim().split(' ').pop();
  const hit = [m.g.a, m.g.h].find(id => (Dt.roster(id) || []).some(p => (p.n || '').split(' ').pop() === w)); return team(hit) || null; };
R['catch-up'] = { id: 'catch-up', v: 2, name: 'Catch up', target: 'gameParts.catchUp() · .lv-cu .lv-story .lv-pts',
  changes: [
    'v2, from your note ("add more colors with the icons and don\'t put the icons in a container"): the 32 px tiles are gone. Each icon is bare at 20 px in the colour of the team its player plays for. That is the team\'s own primary, or its second sheet colour when the primary is near black and would read as no colour (Packers gold, Texans red). A game with both teams in the points shows both teams\' colours.',
    'The icon still says what the point is about: a football for passing, a target for the top receiver, a bolt for the run game.',
    'Unchanged from v1: the eyebrow on top, with the Live badge while the game is on and a soft Final badge after. The story and the points are in Body, with the player\'s name in Sans bold.',
    'Home\'s "Catch me up" list is a different molecule (rows of updates) and is not part of this card.',
  ],
  current: () => V('Live', 'catchUp() · game Live tab', PH(S(GP().catchUp(live())) || none('Not enough plays yet.')))
    + V('Final', 'catchUp() · game Recap tab, when there is no written story', PH(S(GP().catchUp(post())) || none('No play-by-play for this final.'))),
  proposed: () => {
    const card = (m, eb, badge) => { const d = frag(S(GP().catchUp(m)));
      const story = (d.querySelector('.lv-story') || {}).textContent || '', pts = [...d.querySelectorAll('.lv-pts li')].map(li => li.textContent.trim());
      const lead = m.g.hs >= m.g.as ? m.home : m.away, ic = t => / target| carries/.test(t) ? (/ target/.test(t) ? 'target' : 'bolt') : 'football';
      const pt = t => { const k = t.indexOf(' ') > 0 && /^[A-Z]\. /.test(t) ? t.indexOf(' ', 3) : t.indexOf(' '), tm = ptTeam(m, t) || lead;
        return `<div class="r5b-cu2-pt"><span class="r5b-cu2-ic" style="color:${vivid(tm)}">${S(icon(ic(t)))}</span><p class="r5b-body"><b class="lk-pn">${esc(t.slice(0, k))}</b>${esc(t.slice(k))}</p></div>`; };
      return `<div class="gc-card r5b-pr"><div class="r5b-pr-top"><span class="r5b-eb">${eb}</span>${badge}</div><p class="r5b-body">${esc(story)}</p>${pts.map(pt).join('')}</div>`; };
    return V('Live', 'bare icons in each player\'s team colour', PH(card(live(), 'Catch up', L5('live'))))
      + V('Final', 'the same card: two teams, two colours', PH(card(post(), 'How it went', L5('final', 'Final'))));
  } };

R['box-score'] = { id: 'box-score', v: 2, name: 'Box score table', target: 'game.js boxTab() · .tbl',
  ctx: ['game/__POST__?tab=box', '.tbl'],
  changes: [
    'v2, from your note ("you\'re comparing game leaders to box score"): Current is now the box score table itself, the same markup boxTab() draws on the Stats tab under Players, for the same team and groups as Proposed. Game leaders is a different card and is not part of this one.',
    'Today: the team switch is a plain segmented control. Each group has a Title heading, and the column heads are Sans in mixed case. The player is a bare short name link with no picture, so a row does not read as a player, and every number has the same weight.',
    'Proposed: the team switch is the approved segmented control, with the picked side filled with the team\'s own gradient. Each group starts with an eyebrow, and the column heads are the eyebrow role at Meta size. The first column is an L3 player line: headshot S32, the name in Sans bold, the position in Meta. It is wide enough that names are not cut off, and it stays put while the numbers scroll sideways.',
    'Every number is Stats bold. The yards column, the one people read first, is in the text colour and the others are in text-2. The columns are the app\'s own, the same as Current. The same table serves team stats, splits and the game log.',
  ],
  current: () => {
    const m = post(), { g, away, home } = m, b = m.box, ck = Dt.D.core.catKeys;
    const t = (c, label) => { const rows = (b.pl[c] || []).filter(r => r[1] === g.a), labels = (ck[c] || {}).labels || []; if (!rows.length) return '';
      return `<div class="h4 pad mt20 mb8">${label}</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Player</th>${labels.map(l => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td><a>${esc(GP().shortName(r[2]))}</a></td>${r.slice(3).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; };
    return V('Box score (final)', 'boxTab() · game Stats tab · Players: the same table markup', PH(`<div class="r5b-box0"><div class="mt12">${S(UI.seg([{ k: 'away', l: away.name }, { k: 'home', l: home.name }], 'away', 'gc-boxteam'))}</div>${t('passing', 'Passing')}${t('rushing', 'Rushing')}${t('receiving', 'Receiving')}</div>`, 'bleed'));
  },
  proposed: () => {
    const m = post(), { g, away, home } = m, b = m.box, pl = b.pl, ck = Dt.D.core.catKeys;
    const seg = S(UI.seg([{ k: 'away', l: away.name, style: App.teamVars(away) }, { k: 'home', l: home.name }], 'away', ''));
    const tbl = (c, label) => { const rows = (pl[c] || []).filter(r => r[1] === g.a), labels = (ck[c] || {}).labels || []; if (!rows.length) return '';
      return `<div class="r5b-eb r5b-sh">${label}</div><div class="r5b-tw"><table class="r5b-tbl r5b-tbl2"><thead><tr><th>Player</th>${labels.map(h => `<th${h === 'YDS' ? ' class="k"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr><td>${L3(r[0], { name: GP().shortName(r[2]), meta: (Dt.player(r[0]) || {}).pos || '' })}</td>${r.slice(3).map((v, i) => `<td${labels[i] === 'YDS' ? ' class="k"' : ''}>${v == null ? '–' : v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; };
    return V('Box score', 'team switch, then one table per group', PH(`${seg}${tbl('passing', 'Passing')}${tbl('rushing', 'Rushing')}${tbl('receiving', 'Receiving')}`));
  } };

R['team-compare'] = { id: 'team-compare', v: 1, name: 'Team comparison rows', target: 'game.js teamTab() cmpRow() · .cmp .gc-cmphead',
  ctx: ['game/__LIVE__?tab=team', '.cmp'],
  changes: [
    'The Team stats view compares the two teams with its own rows (.cmp: a logo-and-tricode head, values left and right, a label, a bar), coloured with App.readable(). The approved Season at a glance card (.gl) does exactly this job on the Preview tab, so the app has two styles of one comparison.',
    'Proposed: reuse the approved glance card as it is. The two team chips on top, each number in Display in its team\'s colour with the worse side dimmed, the label in the middle, the two meters meeting in the middle. Only the rows change: this game\'s team stats instead of season averages.',
    'cmpRow() and .gc-cmphead are deleted.',
  ],
  current: () => V('Team stats', 'teamTab() · game Stats tab · Team, under Game leaders', phone(`game/${C().G.post.id}?tab=team`))
    + V('Season at a glance (approved)', 'glanceCard() · .gl · game Preview tab', PH(S(GP().glanceCard(pre(), C().boxS)))),
  proposed: () => {
    const m = post(), { g, away, home } = m, A = m.box.tm[g.a] || {}, H = m.box.tm[g.h] || {};
    const mk = t => (App.teamRoles(t) || {}).mark || prim(t), ma = mk(away), mh = mk(home);
    const chip = (t, r) => `<span class="gl-t ${r ? 'r' : ''}" style="${App.teamVars(t)}"><img src="${t.logoDark || t.logo}" alt=""><b>${esc(t.abbr)}</b></span>`;
    const pct = s => { const [a, b] = String(s || '0-0').split('-').map(Number); return b ? Math.round(a / b * 100) : 0; };
    const rows = [['Total yards', +A.totalYards, +H.totalYards], ['Passing yards', A.netPassingYards, H.netPassingYards], ['Rushing yards', A.rushingYards, H.rushingYards],
      ['First downs', A.firstDowns, H.firstDowns], ['3rd down %', pct(A.thirdDownEff), pct(H.thirdDownEff)], ['Turnovers', +A.turnovers, +H.turnovers, true]];
    const row = ([l, a, h, lower]) => { const va = +a || 0, vh = +h || 0, mx = Math.max(va, vh) || 1, aw = lower ? va < vh : va > vh, hw = lower ? vh < va : vh > va;
      return `<div class="gl-r"><b class="${aw ? '' : 'dim'}" style="--c:${ma}">${va}${l.includes('%') ? '%' : ''}</b><span>${l}</span><b class="r ${hw ? '' : 'dim'}" style="--c:${mh}">${vh}${l.includes('%') ? '%' : ''}</b>
        <div class="gl-bar"><div><i style="width:${va / mx * 100}%;background:${ma}"></i></div><div><i style="width:${vh / mx * 100}%;background:${mh}"></i></div></div></div>`; };
    return V('Team stats, as the glance card', 'the approved .gl card with this game\'s numbers', PH(`<div class="gc-card gl"><div class="gl-h">${chip(away)}${chip(home, true)}</div>${rows.map(row).join('')}</div>`));
  } };

/* ------------------------------------------------------------------ game: before, around and on top of the game */
const sceneM = mins => { const m = pre(); return { ...m, g: { ...m.g, ts: App.time.now() + mins * 60000 } }; };
/** the original scene, improved in place: the home team's primary for the meter and timeline, no "roof" twice, tricodes by the logos */
function scene2(mins) {
  const m = sceneM(mins), { g, away, home } = m, d = frag(S(GP().pregameScene(m))), sc = d.querySelector('.gc-scene'); if (!sc) return '';
  sc.classList.add('r5b-sc2'); sc.style.setProperty('--tc', prim(home));
  const meta = sc.querySelector('.cpad > .tiny'); if (meta) { meta.className = 'r5b-meta mt6'; meta.textContent = meta.textContent.replace(/(\))\s*roof$/, '$1'); }
  const f = sc.querySelector('.gc-scene-fans');
  if (f && /Gates closed/.test(f.textContent)) { const left = Math.round(mins - 150), h = Math.floor(left / 60), mm = left % 60;
    f.innerHTML = `<b class="num">${h ? `${h}:${String(mm).padStart(2, '0')}` : mm}</b><span>${h ? '' : 'minutes '}until the gates open at ${fmt.time(g.ts - 150 * 60000)}</span>`; }
  sc.querySelectorAll('.gc-scene-inact .flex').forEach((r, k) => { const t = [away, home][k], sp = r.querySelector('.tiny'); if (sp) sp.className = 'r5b-body grow';
    const lgo = r.querySelector('.logo'); if (lgo) lgo.insertAdjacentHTML('afterend', `<b class="lk-tri">${esc(t.abbr)}</b>`); });
  const note = sc.querySelector('.gc-scene-inact.tiny'); if (note) note.classList.replace('tiny', 'r5b-meta');
  return d.innerHTML;
}
R['pregame-scene'] = { id: 'pregame-scene', v: 2, name: 'Pregame scene', target: 'gameParts.pregameScene() · .gc-scene',
  changes: [
    'v2, from your note ("The original was so much better, but needs improvements"): this is the original card, with the big fans count, the fill bar and the five-step timeline across the bottom, improved in place rather than redrawn.',
    'Colour: the fill bar, the timeline line and its dots are in the home team\'s own primary. Today they are red, the Live status colour, whoever is at home. The next step\'s ring loses its soft halo; its label and time are in the text colour, so it reads as next without a glow.',
    'Before the gates open, "Gates closed" is no longer a two-line Display word. The big number is the countdown ("30 minutes until the gates open at 4:25 PM"), so the card always leads with one moment number.',
    'Text: the seats and weather line is Meta (Sans medium), and it says "Covered (open sides)", not "Covered (open sides) roof". The timeline steps stay Sans bold with their times in the Date role, one line each.',
    'Inactives: each team is its logo and tricode in Display, so you don\'t have to know the logo, with the names in Body.',
  ],
  current: () => V('60 minutes before kickoff', 'pregameScene() · game Preview tab, last 4 hours only', PH(S(GP().pregameScene(sceneM(60))) || none('Not drawn at this time.'), 'bleed'))
    + V('3 hours before kickoff', 'gates not open yet; inactives not announced', PH(S(GP().pregameScene(sceneM(180))) || none('Not drawn at this time.'), 'bleed')),
  proposed: () => V('60 minutes before kickoff', 'the original, in the home team\'s colour', PH(scene2(60) || none('Not drawn at this time.'), 'bleed'))
    + V('3 hours before kickoff', 'the countdown is the big number', PH(scene2(180) || none('Not drawn at this time.'), 'bleed')) };

R['game-actions'] = { id: 'game-actions', v: 2, name: 'Game action strip', target: 'gameParts.actionsStrip() · .gc-actions',
  changes: [
    'v2, from your note ("this should be in line and a side scroll"): the two-row layout is gone. All the actions sit in one row that scrolls sideways, the main one first (red Watch live while you can stream it, otherwise the white button), then the ghost buttons. Every button is the same squared small size, the row starts and ends on the 16 px page gutter, snaps to each button, has no scrollbar, and the last button runs off the edge when there are more than fit, so the scroll shows itself. Current is v1 as it was built; Proposed is the app now.',
    'What v1 said, for reference:',
    'The strip is one sideways-scrolling row of small buttons. At phone width the last ones ("All options", sometimes "Catch up") run off the edge, and nothing says there is more.',
    'Live, the first button is red Watch live; otherwise it is a white button. Every other action, the RedZone logo included, is a ghost button of the same size, so the main action barely stands out.',
    'Proposed: two rows that always fit. The main action is a full-width button (red Watch live while live, otherwise the secondary button). Under it, the other actions as equal ghost buttons in one row of two or three (a 2 by 2 grid when there are four), nothing cropped. The labels stay as they are.',
  ],
  current: () => {
    const mL = live(), tv = (mL.g.tv || [])[0];
    const grid = items => `<div class="r5b-act-g" style="grid-template-columns:repeat(${items.length === 4 ? 2 : items.length},1fr)">${items.join('')}</div>`;
    return V('Live · not streaming here', 'v1 as built: the main action, then the rest in a grid', PH(`<div class="r5b-act">${btn('white wide', 'tv', tv ? 'On ' + esc(tv) : 'Where to watch')}${grid([`<button class="btn sm ghost">${S(UI.rzLogo('', { theme: true }))}</button>`, btn('sm ghost', 'headphones', 'Listen'), btn('sm ghost', 'rewind', 'Catch up'), btn('sm ghost', 'info', 'All options')])}</div>`))
      + V('Live · streams on NFL+', 'Watch live is the main action', PH(`<div class="r5b-act">${btn('live wide', 'play', 'Watch live')}${grid([btn('sm ghost', 'headphones', 'Listen'), btn('sm ghost', 'rewind', 'Catch up'), btn('sm ghost', 'info', 'All options')])}</div>`))
      + V('Final', '', PH(`<div class="r5b-act">${btn('white wide', 'rewind', '60-second recap')}${grid([btn('sm ghost', 'play', 'Highlights'), btn('sm ghost', 'layers', 'Replays'), btn('sm ghost', 'info', 'All options')])}</div>`))
      + V('Before kickoff', '', PH(`<div class="r5b-act">${btn('white wide', 'tv', 'Watch on ' + esc((pre().g.tv || [])[0] || 'TV'))}${grid([btn('sm ghost', 'calendar', 'Add to calendar'), btn('sm ghost', 'info', 'All options')])}</div>`));
  },

  proposed: () => {
    const row = m => PH(S(GP().actionsStrip(m, false, false)), 'bleed');
    return V('Live · not streaming here', 'actionsStrip(m) · one inline row, side scroll', row(live()))
      + V('Final', 'actionsStrip(m)', row(post()))
      + V('Before kickoff', 'actionsStrip(m)', row(pre()));
  } };

R['predict'] = { id: 'predict', v: 1, name: 'Predict tab', target: 'game.js predictTab() · .gc-pick .gc-pbar',
  ctx: ['game/__LIVE__?tab=predict', '.gc-pick'],
  changes: [
    'The copy is clean: "Pick before kickoff to earn +10 fan points, just for fun" and "Picks are free and only for fan points and bragging rights". No betting words.',
    'The type already follows the roles: the team name is in Display, and "Away · 2-2" is Meta with the record.',
    'What is off: once you pick, the bar is coloured with App.readable() (a shade of the team, not its primary) and is not the 6 px meter. The share is one bold line ("58% of fans"), and your side is marked only by an accent-blue "Your pick" badge.',
    'Proposed: the same two cards, squared, with logo L48. After you pick, the 6 px meter in each team\'s own primary and the share as a stat pair (Stats bold over "of fans"). Your side gets a 2 px border in its primary and the soft "Your pick" badge.',
    'The notice stays above the cards. The "fans have picked" line and "Make all your picks" button are unchanged.',
  ],
  current: () => V('Before kickoff', 'predictTab() · game Fans tab · Predict', phone(`game/${C().G.pre.id}?tab=predict`)),
  proposed: () => {
    const m = pre(), { g, away, home } = m, ra = Dt.record(g.a, g.s, g.ts - 1), rh = Dt.record(g.h, g.s, g.ts - 1);
    const card = (t, rec, side, pct, on, shown) => `<button class="r5b-pick${on ? ' on' : ''}" style="--tp:${prim(t)}">${lg(t.id, 'lg')}<b class="lk-name">${esc(t.name)}</b><span class="r5b-meta">${side} · <span class="lk-rec">${esc(rec.str)}</span></span>
      ${shown ? `<div class="meter"><i style="width:${pct}%;background:${prim(t)}"></i></div>${L4(pct + '%', 'of fans')}` : ''}${on ? L5('soft', 'Your pick') : ''}</button>`;
    const note = (ic, t) => `<div class="notice">${S(icon(ic, 'sm'))}<span>${t}</span></div>`;
    return V('Before you pick', 'no percentages yet', PH(`${note('target', 'Who wins? Pick before kickoff to earn <b>+10 fan points</b>, just for fun.')}<div class="r5b-picks">${card(away, ra, 'Away', 42)}${card(home, rh, 'Home', 58)}</div>`))
      + V('After you pick', 'your side outlined, the split shown', PH(`${note('check', 'Locked in. Correct picks earn <b>+10 fan points</b>. You can change it until kickoff.')}<div class="r5b-picks">${card(away, ra, 'Away', 42, false, true)}${card(home, rh, 'Home', 58, true, true)}</div>`));
  } };

R['react-tab'] = { id: 'react-tab', v: 1, name: 'React tab', target: 'game.js reactTab() rxNow rxPulse rxFeed · .rx-chip .rx-take',
  ctx: ['game/__LIVE__?tab=react', '.rx'],
  changes: [
    'The reaction pills (.rx-chip, emoji) are the approved atom and stay. In the "Biggest reactions" list the counts are loose emoji, not pills, so the list draws them two ways.',
    'The fan pulse bar is coloured with App.readable() (a shade, not the primary), and the side labels "CHI 50%" are .tiny: tricode and percentage in the body face.',
    'The "now" card titles the play in its own face, and the clock line is .tiny. Quick takes are buttons with a fill behind them.',
    'Proposed: the pulse is two meters meeting in the middle in each team\'s primary, with an L1-style side label (logo, tricode in Display, the percentage in Stats bold). The now card has the clock in Stats bold caps over the play in Title S, then the pills. Quick takes are squared buttons with the share as a 6 px meter under each. The Biggest reactions rows use the same pills.',
  ],
  current: () => V('React', 'reactTab() · game Fans tab · React', phone(`game/${C().G.live.id}?tab=react`)),
  proposed: () => {
    const m = live(), { g, away, home } = m, p = playsOf(m).filter(x => x.sc).pop() || playsOf(m).pop(), pa = 44;
    const side = (t, v, r) => `<span class="r5b-rx-side${r ? ' r' : ''}">${lg(t.id, 'sm')}<b class="lk-tri">${esc(t.abbr)}</b><b class="r5b-num">${v}%</b></span>`;
    const take = (l, v, on) => `<button class="r5b-take${on ? ' on' : ''}"><span class="r5b-take-l"><b>${l}</b><span class="r5b-num">${v}%</span></span><span class="meter"><i style="width:${v}%;background:var(--text)"></i></span></button>`;
    return V('Now', 'the latest play, the pills, quick takes', PH(`<div class="gc-card r5b-pr"><div class="r5b-pr-top">${lg(p.team || g.h, 'sm')}<span class="r5b-clk">${clk(p)}</span></div><b class="r5b-ttl">${caption(p, g)}</b>
        ${pills([['fire', 18420], ['hype', 9310], ['clap', 4120], ['shock', 2875], ['ugh', 1650]])}<span class="r5b-eb">Quick take</span><div class="r5b-takes">${take('Game over', 61, true)}${take('Not done yet', 39)}</div></div>`))
      + V('Fan pulse', 'two meters meeting in the middle, each team\'s primary', PH(`<div class="gc-card r5b-pr"><div class="r5b-pr-top"><span class="r5b-eb">Fan pulse</span><span class="r5b-meta">${esc(home.name)} fans are louder</span></div>
        <div class="r5b-pulse"><div class="meter r"><i style="width:${pa}%;background:${prim(away)}"></i></div><div class="meter"><i style="width:${100 - pa}%;background:${prim(home)}"></i></div></div>
        <div class="r5b-pr-top">${side(away, pa)}${side(home, 100 - pa, true)}</div></div>`))
      + V('Biggest reactions', 'one row per moment, the same pills', PH(`<div class="gc-card r5b-pr"><span class="r5b-clk">${clk(p)}</span><b class="r5b-ttl">${caption(p, g)}</b>${pills([['fire', 18420], ['hype', 9310], ['shock', 2875]])}</div>`));
  } };

R['recap'] = { id: 'recap', v: 1, name: 'Game recap', target: 'game.js recapTab() genRecap() · .gc-ls .gc-story',
  ctx: ['game/__LIVE__?tab=recap', '.gc-ls'],
  changes: [
    'The Recap tab stacks a line score, key moments, the story, game leaders, a scoring summary and "Watch it back". Key moments and game leaders are their own cards (the key-moments card here, and the approved leaders card).',
    'The line score already takes the tricode role (Display), but at a small size, with the quarters and the total all in the same small table number, so the final score does not stand out. The loser is not dimmed.',
    'The scoring summary rows override the row atom: the title drops to weight 500 at 14 px, the clock sits in the Meta line in Sans, and the running score is a small .num.',
    'Proposed line score: each team as an L1 line (logo S24, tricode in Display), the quarters in Stats bold under Stats bold caps heads, the total in Display, the loser\'s row at 60%.',
    'Proposed scoring summary: the approved 56 px row as it is. Logo S24, the play in Title S, the clock in Stats bold caps with the kind of score in Meta, and the score right in Display.',
    'The story card is approved as it is: eyebrow, headline, byline in Sans medium, body, Read full story.',
  ],
  current: () => V('Recap (final)', 'recapTab() · game Recap tab', phone(`game/${C().G.post.id}?tab=recap`)),
  proposed: () => {
    const m = post(), { g, away, home } = m, b = m.box, qs = Math.max(4, (b.ls[g.h] || []).length);
    const win = Math.max(g.hs, g.as);
    const lrow = t => { const arr = b.ls[t.id] || [], tot = t.id === g.h ? g.hs : g.as; return `<tr class="${tot < win ? 'dim' : ''}"><td>${L1(t, null)}</td>${Array.from({ length: qs }, (_, i) => `<td>${arr[i] == null ? '–' : arr[i]}</td>`).join('')}<td class="t"><b class="lk-sc">${tot}</b></td></tr>`; };
    const ls = `<div class="gc-card r5b-pad0"><table class="r5b-ls"><thead><tr><th></th>${Array.from({ length: qs }, (_, i) => `<th>${i < 4 ? i + 1 : 'OT'}</th>`).join('')}<th>T</th></tr></thead><tbody>${lrow(away)}${lrow(home)}</tbody></table></div>`;
    const sp = b.sp.slice(0, 4).map(s => `<div class="row static">${lg(s.t, 'sm')}<div class="row-main"><div class="row-title">${esc(s.x.trim())}</div><div class="row-sub"><span class="r5b-clk">${s.q > 4 ? 'OT' : 'Q' + s.q} ${s.c}</span> · ${esc(s.ty)}</div></div><b class="lk-sc r5b-row-sc">${s.as}-${s.hs}</b></div>`).join('');
    return V('Line score', 'L1 lines, Stats bold quarters, Display total', PH(ls))
      + V('Scoring summary', 'the approved 56 px row, score right in Display', PH(`<div class="r5b-sh2">Scoring summary</div><div class="list r5b-sp">${sp}</div>`));
  } };

R['video-player'] = { id: 'video-player', v: 1, name: 'Video player + PiP', target: 'game.js playerHtml() pipChrome() · .gcp .gcp-mode .pip',
  ctx: ['game/__LIVE__', '.gc-player'],
  changes: [
    'Round 4 already made the mode switch over the video (.gcp-mode) squared chips on its dark track, with the picked chip filled white. The controls over the picture are the approved squared icon buttons.',
    'The PiP corner is the picture with the approved close button. A score drawn in the corner is a score bug, and is reviewed with the other score bugs in round 6.',
    'Approve as is: nothing else here differs from the locked atoms.',
  ],
  current: () => {
    const mL = live(), mP = post();
    const dock = (m, mode) => `<div class="gc-page watching ds-watch"><div class="gc-player"><div class="gcp" data-mode="${mode}">${S(GP().playerHtml(mode, 'replay', { still: true }))}</div></div></div>`;
    const corner = `<div class="pip ds-pipv r5b-pip"><div class="gcp">${S(GP().playerHtml('live', null, { still: true, held: true }))}</div>${S(GP().pipChrome())}</div>`;
    return V('Docked, live', 'playerHtml("live") · top of the game page', PH(dock(mL, 'live'), 'bleed'))
      + V('Docked, replay', 'playerHtml("replay")', PH(dock(mP, 'replay'), 'bleed'))
      + V('Picture in picture', 'pipChrome() · .pip, over any page', PH(corner));
  },
  proposed: () => none('Approve as is: the same player and corner as Current, already on the round 4 atoms.') };

R['celebrate'] = { id: 'celebrate', v: 2, name: 'Score celebration', target: 'UI.celebrate() · .cel .cel-bg .cel-snd',
  ctx: ['home', '.cel'],
  changes: [
    'v2, from your note ("original was much better"): this is the original: the big helmet, the diagonal bars in the team\'s second colour, the word, the team name, the two score pills with the scoring side in white, the play and the Score calls button.',
    'Two rule fixes only. The background loses its radial glow and its fade to black. It is the team\'s own sheet gradient, its real colours with nothing darkened. Depth comes from the layout: the big helmet, the diagonal bars and the heavy word.',
    'The tricodes in the score pills become Display, the tricode role, as they are everywhere else; today they are Sans. The other side\'s pill sat on a darkened fill and takes the same light white tint as the milestone tiles. The team name stays Sans bold caps as the card\'s eyebrow, at eyebrow size.',
  ],
  current: () => {
    const m = live(), h = document.createElement('div');
    const p = scoring(m).filter(x => /Touchdown/i.test(x.ty)).pop() || scoring(m).pop() || {};
    UI.celebrate({ kind: 'td', team: p.team || m.g.h, away: m.g.a, home: m.g.h, as: p.as || 0, hs: p.hs || 0, text: p.x ? App.playCaption(p, m.g) : '', host: h });
    return V('Touchdown', 'UI.celebrate() · fills the phone while you watch a game', `<div class="r5b-cel-stage">${h.innerHTML}</div>`);
  },
  proposed: () => {
    const m = live(), h = document.createElement('div');
    const p = scoring(m).filter(x => /Touchdown/i.test(x.ty)).pop() || scoring(m).pop() || {};
    UI.celebrate({ kind: 'td', team: p.team || m.g.h, away: m.g.a, home: m.g.h, as: p.as || 0, hs: p.hs || 0, text: p.x ? App.playCaption(p, m.g) : '', host: h });
    return V('Touchdown', 'the original on the team\'s own gradient, Display tricodes', `<div class="r5b-cel-stage r5b-cel2" style="${App.teamVars(team(p.team || m.g.h))}">${h.innerHTML}</div>`);
  } };

R['milestone'] = { id: 'milestone', v: 2, name: 'Milestone card', target: 'UI.milestone() milestoneHtml() · .ms-card .ms-bg',
  ctx: ['home', '.ms-card'],
  changes: [
    'v2, from your note ("i think i like the originals better"): these are the originals: the white badge disc with its ring, the eyebrow, the big Display title, the sub, the stat tiles and the two buttons, with the confetti as it is today.',
    'Two rule fixes only. The background loses its radial glow and its fade to black. It is the team\'s own sheet gradient, its real colours with nothing darkened; the streak, which has no team, is the brand colour. Depth comes from the badge disc, its ring and the big title.',
    'The stat tiles and the close button sat on squares darkened from the team colour. They are now a light white tint, so the colour under them is the team\'s own. The stats stay big Display numbers (moment numbers).',
    'The buttons are unchanged: the white main action and the light Share button beside it.',
  ],
  current: () => {
    const MS = UI.MILESTONES, tid = tid0();
    return V('Playoff bound', 'UI.milestone(MILESTONES.clinch) · a full-screen modal', `<div class="r5b-cel-stage">${S(UI.milestoneHtml(MS.clinch(tid)))}</div>`)
      + V('Streak', 'MILESTONES.streak', `<div class="r5b-cel-stage">${S(UI.milestoneHtml(MS.streak(12)))}</div>`);
  },
  proposed: () => {
    const MS = UI.MILESTONES, tid = tid0();
    return V('Playoff bound', 'the original on the team\'s own gradient, no darkened tiles', `<div class="r5b-cel-stage r5b-ms2" style="${App.teamVars(team(tid))}">${S(UI.milestoneHtml(MS.clinch(tid)))}</div>`)
      + V('Streak', 'the same card', `<div class="r5b-cel-stage r5b-ms2">${S(UI.milestoneHtml(MS.streak(12)))}</div>`);
  } };

/* ------------------------------------------------------------------ players and teams */
R['player-row'] = { id: 'player-row', v: 1, name: 'Team / player row', target: 'UI.teamRow() · UI.playerRow()',
  ctx: ['search', '.row'],
  changes: [
    'Both are the approved 56 px row, but what is inside was never reviewed. The team row already sets the full name in Display (the team-name role), but "4-0 · AFC West" is one Meta string, so the record is in Sans, not the record face.',
    'The player row has headshot M44 and the name in Title S, with an injury badge stuck to the name and "QB · #15 · KC" in Meta. That is close to the L3 player line already.',
    'Proposed team row: the L2 team lockup (logo M32, the full name in Display, the record in Stats medium, then " · AFC West" in Meta).',
    'Proposed player row: the L3 player line at M44 (name in Sans bold, "POS · #J · TEAM" in Meta). The injury is a soft warning badge on the right, so long names are not pushed.',
  ],
  current: () => {
    const tid = tid0(), ros = Dt.roster(tid), inj = ros.find(p => Dt.injuryFor(p.id)) || ros[1], qb = ros.find(p => p.pos === 'QB') || ros[0];
    return V('Team row', 'UI.teamRow() · search, following, onboarding', PH(`<div class="list">${S(UI.teamRow(tid))}${S(UI.teamRow(C().oppId))}</div>`))
      + V('Player row', 'UI.playerRow() · search, contracts, following', PH(`<div class="list">${S(UI.playerRow(qb.id))}${S(UI.playerRow(inj.id))}</div>`));
  },
  proposed: () => {
    const tid = tid0(), ros = Dt.roster(tid), inj = ros.find(p => Dt.injuryFor(p.id)) || ros[1], qb = ros.find(p => p.pos === 'QB') || ros[0];
    const s = Dt.seasonForStats(), trow = id => { const t = team(id); return `<div class="row tap">${L2(t, Dt.record(id, s).str, { full: true, after: `${t.conf} ${t.div}` })}<span class="grow"></span>${S(icon('chev', 'sm chev'))}</div>`; };
    const prow = p => { const t = team(p.t), i = Dt.injuryFor(p.id); return `<div class="row tap">${L3(p.id, { m: true, meta: [p.pos, p.j ? '#' + p.j : '', t && t.abbr].filter(Boolean).join(' · ') })}<span class="grow"></span>${i ? `<span class="badge warn">${esc(i.s)}</span>` : ''}${S(icon('chev', 'sm chev'))}</div>`; };
    return V('Team row', 'L2 inside the 56 px row', PH(`<div class="list">${trow(tid)}${trow(C().oppId)}</div>`))
      + V('Player row', 'L3 at M44, injury badge on the right', PH(`<div class="list">${prow(qb)}${prow(inj)}</div>`));
  } };

R['roster'] = { id: 'roster', v: 2, name: 'Roster + depth chart', target: 'teams.js roster() depthChart() · .tm-pl .tm-field .tm-dc',
  ctx: ['team/__TEAM__?tab=depth', '.tm-field'],
  changes: [
    'v2, from your note ("are you getting rid of the depth chart? i want to see what it would look like"): no, it stays. It is the Depth chart view on the Roster tab, beside Players and Injuries. v1 only showed the Players list. Here is the depth chart, built from the approved pieces.',
    'The field is the one field\'s flat turf: one green with a faint line every 10 yards and the line of scrimmage in broadcast blue. The two-tone gradient is gone. Each starter is a disc in the team\'s primary with a white ring, the number in Stats bold, the name in Sans bold under it and the spot in Meta. The drop shadows and the outline in the second colour are gone.',
    'Under the field, the old four-column table (Pos · Starter · 2nd · 3rd, every name cut short) becomes one row per position. The position is in Stats bold in a 40 px column, then the starter as an L3 player line (headshot S32, name in Sans bold), with the number and the backups in its Meta line ("#15 · 2nd Wentz · 3rd Shough"). An injury is the soft warning badge on the right. Each row opens the starter.',
    'The formation chips (3WR 1TE, Base 4-3 D, Special Teams) are the approved squared chips. The Players list is unchanged from v1, which is built.',
  ],
  current: () => V('Players (v1, built)', 'roster() · team Roster tab · Players', phone(`team/${tid0()}?tab=roster`)),
  proposed: () => { const page = { state: { form: 0 } }, x = S(TP().depthChart(tid0(), page)), d = S(TP().depthChart(tid0(), { state: { form: 1 } }));
    return V('Depth chart · offense', 'depthChart() · the one turf · starter discs · one row per position: Stats bold position + L3 + backups in Meta', PH(`<div style="${App.teamVars(team(tid0()))}">${x}</div>`, 'bleed'))
      + V('Depth chart · defense', 'the same view, the defensive formation', PH(`<div style="${App.teamVars(team(tid0()))}">${d}</div>`, 'bleed')); } };

R['team-switcher'] = { id: 'team-switcher', v: 1, name: 'Team switcher', target: 'teamParts.switcher() · .tm-sw .tm-sw-all',
  ctx: ['team/__TEAM__', '.tm-picker'],
  changes: [
    'Round 4 already made these the squared M40 chips. The team you are on is filled with its own primary in white, and the rest are outlined with their logo and name. "All 32" leads, with the grid icon.',
    'Approve as is.',
  ],
  current: () => V('Team switcher', 'switcher() · top of the team page', PH(S(TP().switcher(tid0(), 'tm-sel')), 'bleed')),
  proposed: () => none('Approve as is: the switcher in Current is already the squared M40 chip, picked in the team\'s primary.') };

R['team-pr-card'] = { id: 'team-pr-card', v: 1, name: 'Power ranking card', target: 'teamParts.prCard() · .tm-pr .tm-pr-n',
  ctx: ['team/__TEAM__', '.tm-pr'],
  changes: [
    'This card already follows the roles: the rank is big Display, then the eyebrow, "2nd in the NFL" in Title S with the approved ranking-move badge, and the Meta line, with a chevron.',
    'One thing is off: the record at the end of the Meta line ("Same as last week · 4-0") is in Sans, not the record face.',
    'Proposed: the same card, with the record in Stats medium. Everything else as is.',
  ],
  current: () => V('Power ranking card', 'prCard() · team Overview', PH(S(TP().prCard(tid0(), Dt.seasonForStats())) || none('No rankings this week.'))),
  proposed: () => {
    const tid = tid0(), s = Dt.seasonForStats(), pr = Dt.powerRank(s), r = pr && pr.of[tid];
    if (!r) return none('No rankings this week.');
    const rec = Dt.record(tid, s).str;
    return V('Power ranking card', 'as today, the record in Stats medium', PH(`<div class="gc-card r5b-prc"><b class="r5b-prn">${r.rk}</b><div class="grow"><span class="r5b-eb">Power rankings</span>
      <div class="r5b-pr-top"><b class="r5b-ttl">${fmt.ord(r.rk)} in the NFL</b><span class="r5b-mv">${S(UI.prMove(r.mv))}</span></div><span class="r5b-meta">${r.prev ? (r.mv ? `${r.mv > 0 ? 'Up' : 'Down'} from ${fmt.ord(r.prev)} last week` : 'Same as last week') : 'First rankings of the season'} · <span class="lk-rec">${esc(rec)}</span></span></div>${S(icon('chev', 'sm chev'))}</div>`));
  } };

R['team-leaders'] = { id: 'team-leaders', v: 1, name: 'Team leaders', target: 'teamParts.leaders() · .tm-leader',
  ctx: ['team/__TEAM__', '.tm-leader'],
  changes: [
    'Team leaders are a sideways rail of tiles: an eyebrow, headshot L64, the number in .num, the full name in .h4 and "QB · 7 G" in .tiny. The approved game leaders (.ldr) say the same thing, a category, a player and the number, as rows in one card.',
    'Proposed: one card in the approved leaders layout, with one team instead of two. A row per category: the eyebrow, then the L3 player line (headshot S32, name in Sans bold, "QB · 7 games" in Meta) and the number right in the game leaders\' big Display in the team\'s colour, with its unit under it.',
    'No sideways scroll, so all six categories are seen at once.',
  ],
  current: () => V('Team leaders', 'leaders() · team Overview', PH(S(TP().leaders(tid0(), Dt.seasonForStats())) || none('No leaders yet.'), 'bleed'))
    + V('Game leaders (approved)', 'leadersCard() · .ldr · game Stats and Recap', PH(S(GP().leadersCard(live())))),
  proposed: () => {
    const tid = tid0(), t = team(tid), s = Dt.seasonForStats(), mk = (App.teamRoles(t) || {}).mark || prim(t);
    const mine = Object.values(Dt.seasonTotals(s) || {}).filter(L => L.tid === tid);
    const pick = (cat, k, label, unit) => { const top = mine.filter(L => L.cats[cat]).sort((a, b) => (b.cats[cat][k] || 0) - (a.cats[cat][k] || 0))[0]; return top && top.cats[cat][k] ? { L: top, label, unit, v: fmt.n(top.cats[cat][k], top.cats[cat][k] % 1 ? 1 : 0) } : null; };
    const rows = [pick('passing', 'passingYards', 'Passing', 'YDS'), pick('rushing', 'rushingYards', 'Rushing', 'YDS'), pick('receiving', 'receivingYards', 'Receiving', 'YDS'),
      pick('defensive', 'sacks', 'Sacks', 'SACKS'), pick('defensive', 'totalTackles', 'Tackles', 'TKL'), pick('interceptions', 'interceptions', 'Interceptions', 'INT')].filter(Boolean);
    return V('Team leaders', 'the game leaders layout, one team', PH(`<div class="gc-card flush ldr"><div class="ldr-head"><div class="t-title">${s} leaders</div></div>
      ${rows.map(r => `<div class="ldr-row"><div class="t-eyebrow">${r.label}</div><div class="r5b-ldr">${L3(r.L.pid, { meta: `${(Dt.player(r.L.pid) || {}).pos || ''} · ${r.L.gp} games` })}<div class="ldr-v"><b style="color:${mk}">${r.v}</b><span>${r.unit}</span></div></div></div>`).join('')}</div>`));
  } };

R['team-moves'] = { id: 'team-moves', v: 1, name: 'Transactions row', target: 'teams.js moves() · offseason txRow() · .tm-date .ox-tx',
  ctx: ['transactions', '.row'],
  changes: [
    'One move is drawn two ways. The league Transactions page (txRow) has the team logo M32, the move in its own small face (.ox-tx), "Falcons · Oct 10, 2026" in Meta and, when the move names a player, his headshot on the right; the row opens the player.',
    'A team\'s own Transactions view (moves()) is a different row: the date in a .tm-date column in the table-number face, then the move at 14 px, set inline on the row, with no headshot and no tap.',
    'Proposed: one row in both places, the league row. Logo M32 on the league page, or the kind-of-move icon in a 32 px squared tile on a team\'s page. Then the move in Body, the meta "Falcons · Oct 10, 2026" in Sans medium (team name too: metadata is never Display), and the headshot S32 on the right when one player is named.',
    'Months stay as section heads.',
  ],
  current: () => V('Transactions', 'txRow() · Transactions page', phone('transactions')) + V('A team\'s moves', 'moves() · team More tab · Transactions', phone(`team/${tid0()}?tab=moves`)),
  proposed: () => {
    const tid = tid0(), list = Dt.tx({ team: tid }).slice(0, 3), all = Dt.tx({}).slice(0, 3);
    const P = Object.entries(Dt.D.players || {}).filter(([, p]) => (p.n || '').length > 6);
    const pidIn = x => { const f = P.find(([, p]) => x.includes(p.n)); return f && f[0]; };
    const ICON = [[/trade/i, 'swap'], [/releas|waiv/i, 'close'], [/injured reserve/i, 'plus'], [/practice squad/i, 'users'], [/sign/i, 'edit']];
    const row = (r, team) => { const pid = pidIn(r.x || ''), t = Dt.team(r.t), ic = (ICON.find(([re]) => re.test(r.x)) || [0, 'list'])[1];
      return `<div class="row ${pid ? 'tap' : 'static'} r5b-tx">${team ? lg(r.t, 'md') : `<span class="r5b-tile">${S(icon(ic, 'sm'))}</span>`}<div class="row-main"><p class="r5b-body">${esc(r.x)}</p><span class="r5b-date">${team && t ? esc(t.name) + ' · ' : ''}${fmt.date(r.dt + 'T16:00:00Z')}</span></div>${pid ? S(UI.hs(pid, 'sm')) : ''}</div>`; };
    return V('League transactions', 'logo M32, move in Body, meta in Sans medium, headshot right', PH(`<div class="list">${all.map(r => row(r, true)).join('')}</div>`))
      + V('A team\'s moves', 'the same row, the kind of move in place of the logo', PH(`<div class="list">${list.map(r => row(r)).join('')}</div>`));
  } };
})();
