/* Approvals round 7: the approved idea directions (idea-glow B, idea-stack B, idea-faceoff B, idea-bars A, idea-strip B,
   idea-field A, idea-deck B, idea-trend A) designed into the real screens they belong to. Cards keyed by id in
   window.R5_CARDS, queued by round5.js. */
(function () {
"use strict";
const R = window.R5_CARDS = window.R5_CARDS || {};
const UI = App.UI, Dt = App.data, icon = App.icon;
const { S, esc } = DSApprovals.h;
const V = (label, where, inner) => `<div class="r6-v"><div class="r6-vl"><b>${label}</b>${where ? `<span>${where}</span>` : ''}</div><div class="r6-vb">${inner}</div></div>`;
const PH = inner => `<div class="r6-ph">${inner}</div>`;
const phoneAt = r => DSApprovals.h.phone(r);
const TA = a => Dt.D.teams.find(t => t.abbr === a) || {};
const chev = () => S(icon('chev', 'sm'));
const seasonChip = t => `<button class="sc-season r6pk-c">${esc(t)}${S(icon('down', 'xs'))}</button>`;
const SEC = (t, more) => `<div class="r6x-sec"><h3 class="r6x-h">${t}</h3>${more ? `<span class="r6dr-more">${more}</span>` : ''}</div>`;
const TID = '12';
/* the real team colour, deepened only when white text would fail 4.5:1 (the approved team-hero rule) */
const dp = c => { let x = c; for (let n = 0; n < 40 && App.contrast('#ffffff', x) < 4.5; n++) x = App.mix(x, '#000000', .05); return x; };
const hs = (pid, cls = '') => `<img class="r7-hs ${cls}" src="${Dt.headshot(pid)}" alt="" loading="lazy">`;
const disc = (pid, tm, cls = '') => `<span class="r7-disc ${cls}" style="background:${tm.color}">${hs(pid)}</span>`;
const DIR = n => `Designs the direction you approved on ${n} into the real screen.`;
/* the live game the design page uses (CHI at GB, 4th 3:18) */
const LG = () => { const g = Dt.liveGames()[0]; return { g, m: App.gameParts.model(g), a: Dt.team(g.a), h: Dt.team(g.h) }; };
/* the Chiefs' 2026 regular season */
const KCG = () => Dt.D.games.filter(x => x.s === 2026 && x.t === 2 && (x.h === TID || x.a === TID)).sort((x, y) => x.ts - y.ts);
const res = g => { const home = g.h === TID, us = home ? g.hs : g.as, them = home ? g.as : g.hs; return Dt.state(g) === 'post' ? { r: us > them ? 'W' : us < them ? 'L' : 'T', us, them } : null; };

/* ------------------------------------------------------------------ glow (dark) */
/* a team's glow colour: the real primary, or its second colour when the primary is too dark to glow on black */
const gc = t => App.lum(t.color) < .04 ? t.alt : t.color;
const GLS = () => ['CHI', 'LV', 'IND'].map(ab => Dt.liveGames().find(g => Dt.team(g.a).abbr === ab)).filter(Boolean).map(g => ({ g, m: App.gameParts.model(g), a: Dt.team(g.a), h: Dt.team(g.h) }));
R['apply-glow'] = { id: 'apply-glow', v: 3, ready: true, name: 'Dark glow: where it lives', target: 'game.js hero (live) · watch.js live hero',
  changes: ['Your note on v2: "too intense of a pop of color". v3 pulls the glow back: each team\'s colour now starts at its own edge at a little over half strength and fades out smoothly by about a quarter of the way in, so the middle of the header is plain black and the colour reads as a soft light from the side, not a fill. Dark teams still glow in their second colour (Raiders silver, Bears orange, Steelers gold) so they don\'t vanish. Same three live games as v2 so you can compare.',
    'The rule this card sets: the dark glow means "this is happening right now".',
    'A, the live game header: while a game is live its header turns black with each team\'s colour glowing in from its own side (finals and upcoming games keep today\'s header).',
    'B, the Watch tab\'s live hero: the game you can watch now on the dark glow, with the Watch button.'],
  options: [{ k: 'a', name: 'Live game header', note: 'Game page, only while live.' }, { k: 'b', name: 'Watch live hero', note: 'Watch tab.' }],
  current: () => V('As the app draws it', '#/game (live), #/watch', PH(phoneAt('game/' + LG().g.id) + phoneAt('watch'))),
  proposed: k => { const side = (t, sc, win) => `<div class="r7-gl-t">${S(UI.logo(t.id, 'lg'))}<span>${esc(t.name)}</span></div><b class="r7-gl-s ${win ? '' : 'l'}">${sc}</b>`;
    const one = ({ m, a, h }) => { const S2 = m.S, row = `<div class="r7-gl-row">${side(a, S2.as, S2.as > S2.hs)}<span class="r7-gl-mid">–</span>${side(h, S2.hs, S2.hs > S2.as)}</div>`;
      return `<div class="r7-gl v2 v3" style="--ga:${gc(a)};--gb:${gc(h)}">${k === 'a' ? `<div class="r7-gl-top"><span class="badge live">Live</span><span>${esc(S2.label)}</span></div>${row}<div class="r7-gl-dd">${esc(S2.dd || '')}</div>` : `<div class="r7-gl-top"><span class="badge live">Live</span><span>${esc(S2.label)}</span></div>${row}<button class="btn white r7-gl-b">${S(icon('play', 'sm'))}Watch now</button>`}</div>`; };
    return V(k === 'a' ? 'Live game header' : 'Watch live hero', 'Bears at Packers · Raiders at Patriots · Colts at Steelers', PH(GLS().map(one).join('<div style="height:12px"></div>'))); } };

/* ------------------------------------------------------------------ stacked names */
const ALL = () => ['AFC East', 'AFC North'].map(d => [d, Dt.D.teams.filter(t => `${t.conf} ${t.div}` === d)]);
R['apply-stack'] = { id: 'apply-stack', v: 1, ready: true, name: 'Two-tone stacked names: team lists', target: 'teams.js teams/all · team switcher sheet',
  changes: [DIR('"Two-tone stacked names" (option B)') + ' Your note: "i like this two-tone two stacked names".',
    'Each team is the city small in its colour (deepened only where it would be unreadable on white) over the name big in Display, logo on the right, record as Meta. Division heads stay the section head.',
    'A, Teams → All 32: every team as a stacked row, divisions as sections; your team keeps the team-colour edge.',
    'B, the team switcher sheet (the "All 32" chip on Teams): the same rows, smaller (name 28), your teams first under "Your teams".'],
  options: [{ k: 'a', name: 'All 32 page', note: 'Big rows.' }, { k: 'b', name: 'Switcher sheet', note: 'Compact.' }],
  current: () => V('As the app draws it', '#/teams/all, Teams', PH(phoneAt('teams/all') + phoneAt('teams'))),
  proposed: k => { const row = t => { const r = Dt.record ? Dt.record(t.id, 2026) : null; return `<div class="r7-st ${k} ${t.id === TID ? 'mine' : ''}" style="--e:${t.color}"><div class="grow"><span style="color:${App.contrast('#ffffff', t.color) >= 3 ? t.color : dp(t.color)}">${esc(t.loc)}</span><b>${esc(t.name)}</b></div><em>${r && r.str ? r.str : ''}</em>${S(UI.logo(t.id, 'md'))}</div>`; };
    if (k === 'a') return V('All 32 page', '#/teams/all', PH(ALL().map(([d, ts]) => SEC(d) + ts.map(row).join('')).join('<div style="height:12px"></div>')));
    const mine = [TID, '7', '13'].map(id => Dt.team(id));
    return V('Switcher sheet', 'Teams · All 32 sheet', PH(`<div class="r7-sheet"><i class="r7-grab"></i><div class="r7-sheet-h">All 32 teams</div>${SEC('Your teams')}${mine.map(row).join('')}${SEC('AFC East')}${ALL()[0][1].map(row).join('')}</div>`)); } };

/* ------------------------------------------------------------------ leaders face-off */
const LDR = () => { const { m, a, h } = LG(), ld = m.box.ld || [], f = (tid, cat) => ld.find(r => r[0] === tid && r[1] === cat);
  return { a, h, rows: [['passingYards', 'Passing'], ['rushingYards', 'Rushing'], ['receivingYards', 'Receiving']].map(([c, l]) => ({ l, A: f(a.id, c), H: f(h.id, c) })).filter(r => r.A && r.H) }; };
const big = s => { const m = /(\d[\d,]*) YDS/.exec(s || ''); return m ? m[1] : (s || '').split(',')[0]; };
const line = s => (s || '').replace(/,?\s*\d[\d,]* YDS/, '').replace(/^,\s*/, '');
R['apply-faceoff'] = { id: 'apply-faceoff', v: 1, ready: true, name: 'Leaders face-off: game Stats + preview', target: 'game.js leadersCard · pre-game',
  changes: [DIR('"The face-off" (option B, leaders strip)') + ' It replaces today\'s Game leaders card (small headshots, both numbers squeezed in the middle).',
    'Each category is one row: away leader\'s headshot in an away-colour circle, their yards in Display, the category in the middle, the home leader mirrored on the right. Name and line (25/31, 2 TD) as Meta under each number.',
    'A, in the game page Stats tab (live and final), passing, rushing, receiving.',
    'B, also in the pre-game preview, with season leaders ("per game") instead of game leaders, so the page has the same strip before and after kickoff.'],
  options: [{ k: 'a', name: 'Game Stats', note: 'Live + final.' }, { k: 'b', name: 'Plus pre-game', note: 'Season leaders.' }],
  current: () => V('As the app draws it', '#/game · Stats', PH(phoneAt('game/' + LG().g.id + '?tab=stats'))),
  proposed: k => { const { a, h, rows } = LDR(), n = s => esc((s || '').replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/, '').split(' ').slice(-1)[0]);
    const strip = (rs, title) => `${SEC(title)}<div class="card r7-fo"><div class="r7-fo-h">${S(UI.logo(a.id, 'sm'))}<span>${esc(a.name)}</span><span class="grow"></span><span>${esc(h.name)}</span>${S(UI.logo(h.id, 'sm'))}</div>${rs.map(r => `<div class="r7-fo-r">${disc(r.A[2], a)}<div class="r7-fo-v"><b>${big(r.A[4])}</b><span>${n(r.A[3])}</span></div><span class="r7-fo-l">${r.l}<br>yards</span><div class="r7-fo-v r"><b>${big(r.H[4])}</b><span>${n(r.H[3])}</span></div>${disc(r.H[2], h)}</div>`).join('')}</div>`;
    if (k === 'a') return V('Game Stats', '#/game · Stats', PH(strip(rows, 'Game leaders')));
    const kc = Dt.team(TID), lac = TA('LAC'), pre = [['Passing', ['', '', '3139477', 'Patrick Mahomes', '259 YDS'], ['', '', '4038941', 'Justin Herbert', '278 YDS']], ['Rushing', ['', '', '4241985', 'Isiah Pacheco', '62 YDS'], ['', '', '4569987', 'Omarion Hampton', '71 YDS']], ['Receiving', ['', '', '4428331', 'Rashee Rice', '78 YDS'], ['', '', '4612826', 'Ladd McConkey', '81 YDS']]];
    return V('Plus pre-game', '#/game · before kickoff', PH(`${SEC('Season leaders · per game')}<div class="card r7-fo"><div class="r7-fo-h">${S(UI.logo(kc.id, 'sm'))}<span>Chiefs</span><span class="grow"></span><span>Chargers</span>${S(UI.logo(lac.id, 'sm'))}</div>${pre.map(([l, A, H]) => `<div class="r7-fo-r">${disc(A[2], kc)}<div class="r7-fo-v"><b>${big(A[4])}</b><span>${n(A[3])}</span></div><span class="r7-fo-l">${l}<br>yards</span><div class="r7-fo-v r"><b>${big(H[4])}</b><span>${n(H[3])}</span></div>${disc(H[2], lac)}</div>`).join('')}</div>`)); } };

/* ------------------------------------------------------------------ two-sided bars */
const TSTAT = [['totalYards', 'Total yards'], ['netPassingYards', 'Passing yards'], ['rushingYards', 'Rushing yards'], ['firstDowns', 'First downs'], ['thirdDownEff', '3rd down'], ['turnovers', 'Turnovers', 1], ['possessionTime', 'Possession']];
const num = v => { if (typeof v === 'number') return v; const s = String(v); if (/^\d+:\d+$/.test(s)) { const [m, x] = s.split(':'); return +m * 60 + +x; } if (/^\d+-\d+$/.test(s)) { const [x, y] = s.split('-'); return y > 0 ? x / y : 0; } return +s || 0; };
const near = (x, y) => App.contrast(x, y) < 1.6;
const bars = (A, H, a, h, rows) => `<div class="card r7-bc" style="--ga:${a.color};--gb:${near(a.color, h.color) ? h.alt : h.color}"><div class="r7-fo-h">${S(UI.logo(a.id, 'sm'))}<span>${esc(a.name)}</span><span class="grow"></span><span>${esc(h.name)}</span>${S(UI.logo(h.id, 'sm'))}</div>${rows.map(([key, l, low]) => { const x = A[key], y = H[key], nx = num(x), ny = num(y), t = nx + ny || 1; let pa = Math.round(nx / t * 100); const lead = low ? (nx < ny ? 'a' : nx > ny ? 'h' : '') : (nx > ny ? 'a' : nx < ny ? 'h' : '');
  return `<div class="r7-br"><div class="r7-br-t"><b class="${lead === 'a' ? 'on' : ''}">${x}</b><span>${l}</span><b class="${lead === 'h' ? 'on' : ''}">${y}</b></div><div class="r7-bb"><i style="flex:${pa}"></i><i style="flex:${100 - pa}"></i></div></div>`; }).join('')}</div>`;
R['apply-bars'] = { id: 'apply-bars', v: 1, ready: true, name: 'Two-sided stat bars: Team stats + Compare', target: 'game.js Stats · Team · stats.js compare (teams)',
  changes: [DIR('"Two-sided team stat bars" (option A, meet in the middle)') + ' It replaces the two-column table of team stats.',
    'Every stat is one line: away value left, home value right, the label between; two bars in the teams\' colours meet under it, the leader\'s bar longer. Both numbers in All-Pro Stats (small numbers), the leader\'s bold. Bars in each team\'s real colour; if the two colours are too close to tell apart, the home team uses its second colour. For turnovers, fewer is the lead, so the bar flips.',
    'A, the game page Stats → Team view, seven stats.',
    'B, the same block on Compare when you compare two teams (season per-game numbers), so comparing always looks the same.'],
  options: [{ k: 'a', name: 'Game Team stats', note: 'Live + final.' }, { k: 'b', name: 'Compare teams', note: 'Season.' }],
  current: () => V('As the app draws it', '#/game · Stats · Team', PH(phoneAt('game/' + LG().g.id + '?tab=stats'))),
  proposed: k => { if (k === 'a') { const { m, a, h } = LG(), tm = m.box.tm || {}; return V('Game Team stats', '#/game · Stats · Team', PH(`<div class="r6pk-row"><button class="sc-season r6pk-c">Players</button><button class="sc-season r6pk-c on">Team</button></div><div class="mt12">${bars(tm[a.id] || {}, tm[h.id] || {}, a, h, TSTAT)}</div>`)); }
    const kc = Dt.team(TID), den = TA('DEN'), A = { ppg: 29.5, ypg: 384, pass: 262, rush: 122, td3: '44%', to: 0.8 }, H = { ppg: 21.2, ypg: 331, pass: 214, rush: 117, td3: '38%', to: 1.4 };
    return V('Compare teams', '#/compare · teams', PH(`<div class="r6pk-row">${seasonChip('Chiefs')}<span class="t-meta">vs</span>${seasonChip('Broncos')}${seasonChip('2026')}</div><div class="mt12">${bars(A, H, kc, den, [['ppg', 'Points / game'], ['ypg', 'Yards / game'], ['pass', 'Pass yds / game'], ['rush', 'Rush yds / game'], ['td3', '3rd down'], ['to', 'Turnovers / game', 1]])}</div>`)); } };

/* ------------------------------------------------------------------ schedule strip */
const strip = (gs, pick) => `<div class="r7-ds">${gs.map(g => { const o = Dt.team(Dt.opp(g, TID)), r = res(g), d = new Date(g.ts);
  return `<div class="${g === pick ? 'on' : ''}"><span>${d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span><b>${d.getDate()}</b>${S(UI.logo(o.id, 'xs'))}<em class="${r ? r.r.toLowerCase() : ''}">${r ? r.r : (Dt.isHome(g, TID) ? 'vs' : '@')}</em></div>`; }).join('')}</div>`;
const gameCard = g => { const o = Dt.team(Dt.opp(g, TID)), home = Dt.isHome(g, TID), kc = Dt.team(TID), rec = t => { const r = Dt.record ? Dt.record(t.id, 2026) : null; return r && r.str ? r.str : ''; }, d = new Date(g.ts);
  return `<div class="card r7-gc"><span class="r6ss-eb">Week ${g.w} · ${App.fmt.day(g.ts)} · ${App.fmt.time(g.ts)}</span>${[home ? o : kc, home ? kc : o].map(t => `<div class="r6sb-l mt8">${S(UI.logo(t.id, 'sm'))}<span>${esc(t.name)}</span><em class="t-meta">${rec(t)}</em></div>`).join('')}<div class="r7-gc-b"><button class="sc-season r6pk-c">${S(icon('ticket', 'xs'))}Tickets</button><button class="sc-season r6pk-c">${S(icon('tv', 'xs'))}Where to watch</button></div></div>`; };
R['apply-strip'] = { id: 'apply-strip', v: 1, ready: true, name: 'Schedule strip: team Schedule + Home', target: 'teams.js schedule tab · home.js your next game',
  changes: [DIR('"Schedule strip with the opponent" (option B, logos + results)') + ' Your note: "this is nice".',
    'A strip of game days: month, date in Display, the opponent\'s logo, then W / L for played games (W in the win green, L in the text colour; never faded) or vs / @ for upcoming ones. The picked game is ink; its card sits under the strip. Swipe for the rest of the season.',
    'A, the top of the team page Schedule tab, opened on the next game; the full list stays below.',
    'B, Home\'s "your next game" module: the strip shows the last two results and the next three games.'],
  options: [{ k: 'a', name: 'Team Schedule', note: 'Whole season.' }, { k: 'b', name: 'Home next game', note: 'Five games.' }],
  current: () => V('As the app draws it', '#/team/12 · Schedule, Home', PH(phoneAt('team/12?tab=schedule') + phoneAt('home'))),
  proposed: k => { const gs = KCG(), nx = gs.find(g => Dt.state(g) !== 'post') || gs[gs.length - 1], i = gs.indexOf(nx);
    if (k === 'a') return V('Team Schedule', '#/team/12 · Schedule', PH(`<div class="r6pk-row">${seasonChip('2026')}</div><div class="mt12">${strip(gs.slice(0, 6), nx)}</div><div class="mt12">${gameCard(nx)}</div>${SEC('Regular season')}<div class="t-meta">The full schedule list follows, unchanged.</div>`));
    return V('Home next game', '#/home', PH(`${SEC('Your next game', 'Schedule')}${strip(gs.slice(Math.max(0, i - 2), i + 3), nx)}<div class="mt12">${gameCard(nx)}</div>`)); } };

/* ------------------------------------------------------------------ drive marks */
/* a drive as a symbol, not a field: one tick per play (height = yards gained, below the line for a loss), ending in a result mark */
const DKIND = r => /touchdown/i.test(r) ? 'td' : /field goal/i.test(r) && !/miss|block/i.test(r) ? 'fg' : /interception|fumble|downs|safety|blocked|missed/i.test(r) ? 'to' : 'pt';
const DLAB = { td: 'TD', fg: 'FG', to: 'TO', pt: 'P' };
const dplays = d => (d.p || []).filter(p => !/Kickoff|Timeout|End Period|Punt|Field Goal|Extra Point|Two-Point/i.test(p.ty));
/* yards to the goal line before the drive's first snap and after its last one (0 = in the end zone) */
const dspan = d => { const ps = dplays(d), a = ps.find(p => p.yz != null), z = [...ps].reverse().find(p => p.ez != null || p.yz != null);
  return { from: a ? a.yz : null, to: DKIND(d.r) === 'td' ? 0 : z ? (z.ez != null ? z.ez : z.yz) : null }; };
/* the same drive as a tiny field: own end zone grey, the goal they're driving at in the team colour, one line from start to finish */
const dfield = (d, kind, col) => { const W = 72, H = 24, e = 7, f = W - 2 * e, X = yz => e + (100 - Math.max(0, Math.min(100, yz))) / 100 * f, { from, to } = dspan(d);
  const x0 = X(from == null ? 75 : from), x1 = kind === 'td' ? W - e / 2 : X(to == null ? (from == null ? 75 : from) : to), on = kind === 'td' || kind === 'fg', lc = on ? col : '#6b717c', y = 12;
  const mk = kind === 'td' ? `<circle cx="${x1}" cy="${y}" r="3.2" fill="#fff"/>` : kind === 'fg' ? `<circle cx="${x1}" cy="${y}" r="3.6" fill="#fff" stroke="${col}" stroke-width="2"/>` : kind === 'to' ? `<path d="M${x1 - 3} ${y - 3}l6 6M${x1 + 3} ${y - 3}l-6 6" stroke="#5b616c" stroke-width="2" stroke-linecap="round"/>` : `<path d="M${x1 - 3} ${y - 3.5}l3.5 3.5-3.5 3.5" stroke="#5b616c" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg class="r7-fv" viewBox="0 0 ${W} ${H}" width="58" height="19" aria-hidden="true"><rect x="0" y="0" width="${W}" height="${H}" rx="4" fill="var(--surface-2)"/><rect x="0" y="0" width="${e}" height="${H}" rx="2" fill="var(--line-2)"/><rect x="${W - e}" y="0" width="${e}" height="${H}" rx="2" fill="${col}"/><line x1="${W / 2}" y1="4" x2="${W / 2}" y2="${H - 4}" stroke="var(--line-2)" stroke-width="1"/><line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${lc}" stroke-width="3" stroke-linecap="round"/><circle cx="${x0}" cy="${y}" r="2.4" fill="${lc}"/>${mk}</svg>`; };
const dmark = (d, k) => { const kind = DKIND(d.r), col = Dt.team(d.t).color, ps = dplays(d).slice(-12);
  if (k === 'b') return dfield(d, kind, col);
  if (k === 'a') { const w = 4, gap = 2, x0 = 2, end = x0 + ps.length * (w + gap) + 2;
    const ticks = ps.map((p, i) => { const y = Math.max(-6, Math.min(16, p.y || 0)), h = Math.max(2, Math.abs(y)); return `<rect x="${x0 + i * (w + gap)}" y="${y >= 0 ? 15 - h : 15}" width="${w}" height="${h}" rx="1" fill="${y < 0 ? '#9aa0ab' : kind === 'td' || kind === 'fg' ? col : '#b6bcc6'}"/>`; }).join('');
    const mk = kind === 'td' ? `<circle cx="${end + 7}" cy="11" r="7" fill="${col}"/>` : kind === 'fg' ? `<circle cx="${end + 7}" cy="11" r="6" fill="none" stroke="${col}" stroke-width="2"/>` : kind === 'to' ? `<path d="M${end + 2} 6l9 10M${end + 11} 6l-9 10" stroke="#9aa0ab" stroke-width="2" stroke-linecap="round"/>` : `<path d="M${end + 2} 11h8m-3-4 4 4-4 4" stroke="#9aa0ab" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<svg class="r7-dm" viewBox="0 0 ${end + 16} 22" style="width:${Math.min(64, (end + 16) * .8)}px" aria-hidden="true"><line x1="0" y1="15.5" x2="${end}" y2="15.5" stroke="var(--line-2)" stroke-width="1"/>${ticks}${mk}</svg>`; }
  const n = Math.min(7, ps.length), dots = Array.from({ length: n }, (_, i) => `<i style="${kind === 'td' || kind === 'fg' ? `background:${col}` : ''}"></i>`).join('');
  return `<span class="r7-dc ${kind}" style="--c:${col}">${dots}<b>${DLAB[kind]}</b></span>`; };
R['apply-field'] = { id: 'apply-field', v: 4, ready: true, name: 'Drive marks: bars vs field', target: 'game.js playsTab · drive headers',
  changes: ['Your note on v3: "this is nice but can we make the field a little more small?" v4: the field is about 20% smaller, 58×19 (was 72×24), with the line and marks scaled down with it, so it sits closer to the size of the logo.', 'Your note on v2: "compare the bars to a field visualizer". v3 puts the two side by side on the same eight real drives (Bears at Packers), so each row compares 1:1. The team logo still leads every drive.',
    'Both use the team\'s real colour for scoring drives (it was deepened in v2; now it\'s the actual colour); punts and turnovers stay grey.',
    'A, Bars (v2, unchanged): one thin bar per play, its height the yards gained, ending in the result mark (dot TD, ring FG, arrow punt, × turnover). Tells you how the drive went.',
    'B, Field: a tiny field (58×19) with their own end zone grey and the goal they\'re driving at in the team colour. One line runs from where the drive started to where it ended: into the end zone for a TD, a ring for a FG, an arrow where they punted, an × where they lost it. No yard lines, just midfield. Tells you where the drive went.'],
  options: [{ k: 'a', name: 'Bars', note: 'How the drive went.' }, { k: 'b', name: 'Field', note: 'Where it went.' }],
  current: () => V('As the app draws it', '#/game · Plays', PH(phoneAt('game/' + LG().g.id + '?tab=plays'))),
  proposed: k => { const { m } = LG(), dr = (m.pbp.dr || []).slice(0, 8);
    const rows = dr.map(d => `<div class="row static r7-dr2">${S(UI.logo(d.t, 'sm'))}<span class="r7-dmw ${k}">${dmark(d, k)}</span><div class="row-main"><div class="row-title">${esc(d.r)}</div><div class="row-sub">${esc(d.s)}</div></div>${chev()}</div>`).join('');
    return V(k === 'a' ? 'Bars' : 'Field', '#/game · Plays', PH(`<div class="r6pk-row"><button class="sc-season r6pk-c on">All drives</button><button class="sc-season r6pk-c">Scoring</button><span style="width:6px"></span><button class="sc-season r6pk-c on">All</button><button class="sc-season r6pk-c">Q1</button></div><div class="list mt12">${rows}</div>`)); } };

/* ------------------------------------------------------------------ fanned deck */
const MESHC = (a, b, x, y, st) => `<div class="r7-dk" style="--ma:${dp(a.color)};--mb:${dp(b.color)}"><span class="r7-dk-st"><span class="badge live">Live</span>${esc(st)}</span><div class="r7-dk-sc"><div>${S(UI.logo(a.id, 'md'))}<b>${esc(a.name)}</b></div><em>${x}</em><span>–</span><em>${y}</em><div>${S(UI.logo(b.id, 'md'))}<b>${esc(b.name)}</b></div></div></div>`;
R['apply-deck'] = { id: 'apply-deck', v: 1, ready: true, name: 'Fanned game stack: where it lives', target: 'home.js live module · scores.js Live section',
  changes: [DIR('"Today\'s games as a card deck" (option B, fanned stack)') + ' Your question: "where will these be used?" Answer: only when more than one game you care about is on at once. One live game keeps today\'s single card; the stack is how several show up without a long list.',
    'The top card is the closest game (your team first, then followed teams); the cards behind fan out by a few degrees, one per extra game (up to 3 shown, "+2 more" after). Each card is the two teams\' colours blending (the matchup colours from idea-jersey A; the mesh texture itself is being redone), score in Display.',
    'A, Home "Live now": appears at the top of Home when 2+ of your teams or followed teams are live; tap the stack to open Scores → Live, swipe the top card away to see the next.',
    'B, Scores "Live" section: the stack replaces the first rows of the Live section ("6 live"), tap to fan it open into the full list.'],
  options: [{ k: 'a', name: 'Home: Live now', note: 'Your games only.' }, { k: 'b', name: 'Scores: Live', note: 'All live games.' }],
  current: () => V('As the app draws it', '#/home, #/scores', PH(phoneAt('home') + phoneAt('scores'))),
  proposed: k => { const L = Dt.liveGames().map(g => ({ g, m: App.gameParts.model(g) })).slice(0, 3);
    const stack = L.map(({ g, m }, i) => `<div class="r7-fan f${i}">${MESHC(Dt.team(g.a), Dt.team(g.h), m.S.as, m.S.hs, m.S.label)}</div>`).reverse().join('');
    const head = k === 'a' ? SEC('Live now · your games', `${L.length} on`) : SEC(`Live · ${Dt.liveGames().length}`, 'Open all');
    return V(k === 'a' ? 'Home: Live now' : 'Scores: Live', k === 'a' ? '#/home (top)' : '#/scores', PH(`${head}<div class="r7-stack">${stack}</div><div class="t-meta mt8" style="text-align:center">${k === 'a' ? 'Swipe for the next game · tap for Scores' : `Tap to see all ${Dt.liveGames().length} live games`}</div>`)); } };

/* ------------------------------------------------------------------ game-by-game bars */
const tbars = (vals, labs, col, unit) => { const mx = Math.max(...vals) * 1.15; return `<div class="card r7-tr" style="--ma:${col}">${vals.map((v, i) => `<div class="r7-tb ${i === vals.length - 1 ? 'on' : ''}">${i === vals.length - 1 ? `<b>${v}</b>` : ''}<i style="height:${Math.round(v / mx * 100)}%"></i><span>${labs[i]}</span></div>`).join('')}</div><div class="t-meta mt8">Tap a bar for that game · average ${Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)} ${unit}</div>`; };
R['apply-trend'] = { id: 'apply-trend', v: 2, ready: true, name: 'Game-by-game bars: player + team', target: 'player.js Game log · teams.js Stats trends',
  changes: ['Your note on v1: "both are nice but don\'t use correct text rules. stats are usually small things aren\'t they?" Right: these are small chart numbers, so by the number rule they\'re All-Pro Stats, not Display. v2: the picked bar\'s value and the average are Stats bold; opponent labels are Sans; the picked bar is the real team colour. The player chart now uses Mahomes\' real 2026 game log.',
    'One bar per game: played games hatched grey, the picked game (the latest by default) solid in the team colour with its number above; tap any bar to pick it.',
    'A, the top of the player Game log: the main stat for the position (passing yards for a QB), with a dropdown chip to switch stat.',
    'B, the team page Stats tab: points scored per game, with the same chip (points, yards, points allowed).'],
  options: [{ k: 'a', name: 'Player Game log', note: 'Per player.' }, { k: 'b', name: 'Team Stats', note: 'Per team.' }],
  current: () => V('As the app draws it', '#/player · Game log, #/team/12 · Stats', PH(phoneAt('player/3139477') + phoneAt('team/12?tab=stats'))),
  proposed: k => { const kc = Dt.team(TID), col = kc.color;
    const tb = (vals, labs, unit) => { const mx = Math.max(...vals) * 1.15, avg = Math.round(vals.reduce((x, y) => x + y, 0) / vals.length);
      return `<div class="card r7-tr v2" style="--ma:${col}">${vals.map((v, i) => `<div class="r7-tb ${i === vals.length - 1 ? 'on' : ''}">${i === vals.length - 1 ? `<b>${v}</b>` : ''}<i style="height:${Math.round(v / mx * 100)}%"></i><span>${labs[i]}</span></div>`).join('')}</div><div class="r7-tr-f"><span>Average</span><b>${avg}</b><span>${unit} · tap a bar for that game</span></div>`; };
    if (k === 'a') { const log = (Dt.gameLog('3139477', 2026) || []).filter(l => l.g && l.g.t === 2);
      const vals = log.map(l => +(((l.cats || {}).passing || {}).passingYards || 0)), labs = log.map(l => (Dt.isHome(l.g, TID) ? '' : '@') + Dt.team(Dt.opp(l.g, TID)).abbr);
      return V('Player Game log', '#/player/3139477 · Game log', PH(`<div class="flex between center">${SEC('Passing yards')}${seasonChip('Passing yards')}</div>${tb(vals, labs, 'yds')}`)); }
    const gs = KCG().filter(g => Dt.state(g) === 'post'), vals = gs.map(g => g.h === TID ? g.hs : g.as), labs = gs.map(g => (Dt.isHome(g, TID) ? '' : '@') + Dt.team(Dt.opp(g, TID)).abbr);
    return V('Team Stats', '#/team/12 · Stats', PH(`<div class="flex between center">${SEC('Points per game')}${seasonChip('Points')}</div>${tb(vals, labs, 'pts')}`)); } };

/* ---------- the three directions I built without a placement card: now shown on their screens first (2026-11-08) */
const PV = (route, pv) => DSApprovals.h.phone(route, '&pv=' + pv);
const PRE = 'You approved this direction, and I built it straight into the app without showing you where it goes; that was wrong and it\'s been taken back out. This card shows it on its real screen. Approve = build it there; Not approved + a note = change or drop it.';

R['apply-jersey'] = { id: 'apply-jersey', v: 1, ready: true, name: 'Jersey fabric: where it lives', target: 'teams.js hero · home.js fanHeader',
  changes: [PRE, 'The approved fabric (idea-jersey v11: the soft wave at 1.5x, satin sheen on near-black teams) inside the real app, moving. Your note: "maybe i want the jersey fabric on the home page top hero".',
    'A, the team page hero only.', 'B, the Home top hero only (the stage with your team, record and next game).', 'C, both: the team page hero and the Home top hero.'],
  options: [{ k: 'a', name: 'Team page', note: '' }, { k: 'b', name: 'Home top hero', note: '' }, { k: 'c', name: 'Both', note: '' }],
  current: () => V('As the app draws it', '#/ (Home) · #/team/12', PH(phoneAt('') + phoneAt('team/12'))),
  proposed: k => V({ a: 'Team page hero', b: 'Home top hero', c: 'Home + team page' }[k], k === 'a' ? '#/team/12' : k === 'b' ? '#/ (Home)' : '#/ · #/team/12',
    PH(k === 'a' ? PV('team/12', 'fab-team') : k === 'b' ? PV('', 'fab-home') : PV('', 'fab-home,fab-team') + PV('team/12', 'fab-home,fab-team'))) };

R['apply-player-num'] = { id: 'apply-player-num', v: 1, ready: true, name: 'Outline number in the player hero', target: 'player.js hero · .ph-num',
  changes: [PRE, 'The approved outline number (idea-player v4: 0.9px stroke, 35% white) in the real player hero, cropped off the top right behind the headshot, on the team colour band.',
    'A, as approved. The fabric behind it is a separate decision (it needs the jersey card first).'],
  options: [{ k: 'a', name: 'Outline number', note: '' }],
  current: () => V('As the app draws it', '#/player/3139477', PH(phoneAt('player/3139477'))),
  proposed: () => V('Outline number', '#/player/3139477', PH(PV('player/3139477', 'pnum'))) };

R['apply-numbers'] = { id: 'apply-numbers', v: 1, ready: true, name: 'By the numbers: team gradient tiles', target: 'home.js forYou() analyst · .bn-g',
  changes: [PRE, 'The approved direction (idea-numbers v3 A) on the Home "By the numbers" section, which shows for fans who picked Stats: each rank tile becomes the team gradient (180deg, full colour by 42%) with its rank as a faint hairline outline behind. The rank stays in Display, the value in All-Pro Stats; the colour is deepened only where the white text needs it. Real Chiefs ranks.',
    'A, as approved.'],
  options: [{ k: 'a', name: 'Gradient tiles', note: '' }],
  current: () => V('As the app draws it', '#/ · By the numbers (Stats fans)', PH(BN(false))),
  proposed: () => V('Gradient tiles', '#/ · By the numbers (Stats fans)', PH(BN(true))) };
function BN(grad) { const s = Dt.seasonForStats(), ts = Dt.teamSeason(TID, s) || {}, tm = Dt.team(TID), fmt = App.fmt;
  let c = tm.color; for (let n = 0; n < 40 && App.contrast('#ffffff', c) < 4.5; n++) c = App.mix(c, '#000000', .05);
  const bg = `linear-gradient(180deg,${App.mix(c, '#ffffff', .22)} 0%,${c} 42%,${c} 100%)`, sgn = v => (v >= 0 ? '+' : '') + (v || 0).toFixed(2);
  const tile = (v, l, key, low) => { const r = Dt.teamRank(TID, s, key, low);
    return grad ? `<div class="bn-t r7bn" style="background:${bg}"><svg class="r7bn-bg" viewBox="0 0 200 160" aria-hidden="true"><text x="-6" y="140" font-family="APD C, sans-serif" font-weight="900" font-style="italic" font-size="150" fill="none" stroke="rgba(255,255,255,.18)" stroke-width=".5">${r}</text></svg><b>${fmt.ord(r)}</b><span class="bn-l">${l}</span><span class="bn-v">${v}</span></div>`
      : `<div class="bn-t"><b>${fmt.ord(r)}</b><span class="bn-l">${l}</span><span class="bn-v">${v}</span></div>`; };
  return `<div class="sec-head"><div class="h2">By the numbers</div><a class="more">Team rankings${S(icon('chev', 'xs'))}</a></div><div class="bn-g">${tile(sgn(ts.epaPlay), 'Offense EPA per play', 'epaPlay')}${tile(((ts.succRate || 0) * 100).toFixed(1) + '%', 'Success rate', 'succRate')}${tile(sgn(ts.dPlays ? ts.dEpa / ts.dPlays : 0), 'Defense EPA per play', 'dEpa', true)}${tile(((ts.explRate || 0) * 100).toFixed(1) + '%', 'Explosive plays', 'explRate')}</div>`; }

R['apply-player-fabric'] = { id: 'apply-player-fabric', v: 1, ready: true, name: 'Jersey fabric in the player hero', target: 'player.js hero · .ph-band',
  changes: ['Your question on the outline number: "will these also have the jersey motion?" Not yet; it only goes in if you approve it here.',
    'A, the approved team-hero fabric (same wave, same speed, the colour deepened only where the white text needs it) behind the player hero band, under the outline number and the headshot. Open the card in the browser to see it move.'],
  options: [{ k: 'a', name: 'Fabric behind the player', note: '' }],
  current: () => V('As the app draws it', '#/player/3139477', PH(phoneAt('player/3139477'))),
  proposed: () => V('Fabric behind the player', '#/player/3139477', PH(PV('player/3139477', 'fab-player'))) };

/* ---------- the eight round-7 designs that were built before this step: back out of the app, shown here first (2026-11-08) */
const BACK = 'You approved this design earlier, but it should have waited for this step: it\'s been taken back out of the app. Approve = build it.';
const G8 = '401872990'; // Bears at Packers, live in the Game Day moment
const B8 = (id, name, target, what, route, pv, where, at = '', atNow = at) => R[id] = { id, v: 1, ready: true, name, target, changes: [BACK, ...what],
  options: [{ k: 'a', name: 'Build it', note: '' }],
  current: () => V('As the app draws it', where, PH(DSApprovals.h.phone(route, atNow ? '&at=' + encodeURIComponent(atNow) : ''))),
  proposed: () => V(name, where, PH(PV(route, pv + (at ? '&at=' + encodeURIComponent(at) : '')))) };
B8('build-stack', 'All 32: two-tone stacked names', 'teams.js teams/all', ['Teams → All 32: every team as a stacked row, the city small in the team\'s colour over the name big in Display, the record, the logo on the right; divisions as sections; your team keeps a colour edge. Today it\'s the logo grid.'], 'teams/all', 'stack', '#/teams/all');
R['build-stack'] = { id: 'build-stack', v: 3, ready: true, name: 'All 32: the tricode on the cards', target: 'teams.js teamTile',
  changes: ['Your note on v2 (picked A): "we don\'t need the city name, also longer names get cut off so let\'s just do the tricode"',
    'v3 keeps the original logo grid of white cards; each card is the logo and the team\'s tricode (KC, PHI, LAC…) in italic Display, set bigger than today\'s name, the record under it. Three letters never get cut off.',
    'A, the tricode in ink.', 'B, the tricode in the team\'s real colour, deepened only where it\'s too light to read on white at 4.5:1. That\'s 7 teams: Panthers, Bengals, Browns, Broncos, Chargers, Dolphins, Titans; their tricodes come out a shade darker than the real colour (look at the Broncos and Bengals oranges).'],
  options: [{ k: 'a', name: 'Tricode, ink', note: '' }, { k: 'b', name: 'Tricode, team colour', note: '' }],
  current: () => V('As the app draws it', '#/teams/all', PH(phoneAt('teams/all'))),
  proposed: k => V(k === 'a' ? 'Tricode, ink' : 'Tricode, team colour', '#/teams/all', PH(PV('teams/all', k === 'a' ? 'stackT' : 'stackTc'))) };
B8('build-faceoff', 'Game leaders: face-off', 'game.js leadersCard', ['Game Center → Stats: passing, rushing and receiving leaders head to head, each headshot on a disc in the team\'s real colour, yards in Display, the category between. Today it\'s the mirrored scoreboard list.'], `game/${G8}?tab=stats`, 'faceoff', '#/game · Stats');
B8('build-bars', 'Team stats: two-sided bars', 'game.js teamTab', ['Game Center → Stats → Team: each stat as one line with a split bar in the two teams\' real colours (the home team\'s second colour if the two are too close), values in All-Pro Stats, the leader bold. Today it\'s the current team stats rows.'], `game/${G8}?tab=team`, 'bars', '#/game · Stats → Team', '.gc-card.tb', '.gc-card.gl');
B8('build-strip', 'Home: your next game strip', 'home.js fanHeader', ['Home top hero: the last two results and the next three games as game days (month, date, opponent logo, W / L or vs / @), the next game white, its card under the strip. It replaces the full-season logo row, which is today\'s design.'], '', 'strip', '#/ (Home)');
B8('build-deck', 'Home: live now fanned stack', 'home.js liveDeck', ['Home, top of the sheet under the hero: only when two or more of your teams are playing at once, a fanned stack of their live games (your team on top) in the two teams\' colours; tap for Scores. ', 'Your test profile only follows the Chiefs, who aren\'t playing in this moment, so the preview pretends you also follow the first two teams playing (Bears, Bengals). Today there\'s nothing here.'], '', 'deck,deckdemo', '#/ (Home)', '.dk-stack', '.hm-sheet');
B8('build-trend', 'Player Game log: game-by-game bars', 'player.js gamelog', ['Player → Game log: one bar per game, played games hatched, the picked game (the latest by default) in the real team colour with its value in All-Pro Stats; tap a bar to pick a game; a dropdown chip switches the stat; the average under. Today it\'s the plain bar chart.'], 'player/3139477?tab=gamelog', 'trend', '#/player · Game log', '.tc-chart');
B8('build-glow', 'Live game header: dark glow', 'game.js header', ['Game header while a game is live: black, each team\'s real colour a soft glow in from its own edge (near-black teams glow in their second colour). Finals and upcoming games keep today\'s header, the matchup gradient.'], `game/${G8}`, 'glow', '#/game (live)');
B8('build-field', 'Plays: drive field marks', 'game.js playsTab', ['Game → Plays: each drive header is the logo, then a 58×19 field (own end zone grey, the goal in the team\'s real colour, a line from the first snap to where it ended: dot TD, ring FG, arrow punt, × turnover, open dot for a live drive), then the result. Today it\'s the logo and the result.'], `game/${G8}?tab=plays`, 'field', '#/game · Plays', '.dr2-h');
})();
