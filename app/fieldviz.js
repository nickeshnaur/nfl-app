/* ============================================================================
   Field visualizer — a perspective field that draws the last play (or the whole
   drive) as a path: arcs for passes/kicks, ground lines for runs, backwards for
   sacks, red for turnovers. The ball animates along the path only when a new
   play arrives, so time-machine playback feels live without constant replays.

   UI.fieldViz(g, { mode: 'play'|'drive', header: bool, playIdx, L, compact })
   Orientation is fixed: away team defends the left end zone, home the right.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, esc, icon, store } = App;
const UI = App.UI, Dt = App.data;

const NON_PLAY = /^(Timeout|Official Timeout|End Period|Two-minute warning|End of Half|End of Game|End of Regulation|Coin Toss)$/i;
const PASS = /^(Pass Reception|Passing Touchdown|Pass Incompletion|Pass Interception Return|Interception Return Touchdown|Pass)$/;
const RUSH = /^(Rush|Rushing Touchdown)$/;
const KICK = /^(Kickoff|Kickoff Return Touchdown|Punt|Punt Return Touchdown|Blocked Punt|Field Goal Good|Field Goal Missed|Blocked Field Goal)$/;
const ALIAS = { BLT: 'BAL', CLV: 'CLE', HST: 'HOU', ARZ: 'ARI', LA: 'LAR', WSH: 'WAS', JAC: 'JAX' };

/* ------------------------------------------------------------------ field geometry */
const W = 360, TOP = 40, BOT = 102, INSET = 44; // the approved field (round 5 v4): 62 deep, as app/field.js
/** point on the field surface: u = yard position (-10..110, 0 = left goal line), d = depth 0 (far) .. 1 (near) */
function pt(u, d) {
  const f = (u + 10) / 120;
  const xl = INSET * (1 - d), xr = W - INSET * (1 - d);
  return [xl + (xr - xl) * f, TOP + (BOT - TOP) * d];
}
const P = (u, d) => pt(u, d).map(v => v.toFixed(1)).join(' ');

/* ------------------------------------------------------------------ play geometry */
function spotFromText(dd, offTid) {
  const m = /at (?:([A-Z]{2,3}) )?(\d{1,2})\b/.exec(dd || ''); if (!m) return null;
  const n = +m[2]; if (n === 50 || !m[1]) return 50;
  const side = ALIAS[m[1]] || m[1], t = Dt.team(offTid);
  return t && t.abbr === side ? 100 - n : n;           // yards to the end zone
}
/** absolute position (0 = left/away goal line) from yards-to-endzone for an offense */
const abs = (g, offTid, yz) => offTid === g.a ? 100 - yz : yz;
const dirOf = (g, offTid) => offTid === g.a ? 1 : -1;
function startOf(g, p) {
  if (/^Kickoff/.test(p.ty)) { const m = /from ([A-Z]{2,3}) (\d{1,2})/.exec(p.x || ''); const n = m ? +m[2] : 35; const kt = Dt.team(ALIAS[m && m[1]] || (m && m[1])); return kt && kt.id === g.h ? 100 - n : n; }
  const yz = spotFromText(p.dd, p.team) ?? p.yz;
  return yz == null ? null : abs(g, p.team, yz);
}
/** describe one play: start/end (absolute yards), kind, label */
function describe(g, plays, i) {
  const p = plays[i]; if (!p) return null;
  const ty = p.ty || '', x = p.x || '', off = p.team, dir = dirOf(g, off);
  let s = startOf(g, p); if (s == null) return null;
  let next = null; for (let k = i + 1; k < plays.length; k++) if (!NON_PLAY.test(plays[k].ty || '') && plays[k].dd) { next = plays[k]; break; }
  const nextSpot = next ? startOf(g, next) : null;
  let e, kind, label, bad = false;
  const y = p.y || 0;
  const td = /TOUCHDOWN/i.test(x) && !/NULLIFIED|REVERSED/i.test(x);
  if (/^Kickoff/.test(ty)) { kind = 'kick'; e = /touchback/i.test(x) ? (dir > 0 ? 100 - 35 : 35) : nextSpot ?? s + dir * 60; label = /touchback/i.test(x) ? 'Kickoff · Touchback' : 'Kickoff'; }
  else if (/^Punt|Blocked Punt/.test(ty)) { kind = 'kick'; const m = /punts (\d+) yards/.exec(x); e = nextSpot ?? s + dir * (m ? +m[1] : 45); label = m ? `${m[1]} Yard Punt` : 'Punt'; }
  else if (/Field Goal/.test(ty)) { kind = 'fg'; const m = /(\d+) ya?r?d?s? (?:Field Goal|field goal)/i.exec(x); e = dir > 0 ? 108 : -8; label = `${m ? m[1] + ' Yard ' : ''}Field Goal${/Good/.test(ty) ? '' : / Missed|Blocked/.test(ty) ? ' — No Good' : ''}`; bad = !/Good/.test(ty); }
  else if (/Interception/.test(ty)) { kind = 'pass'; e = nextSpot ?? s + dir * 15; label = ty === 'Interception Return Touchdown' ? 'Pick-Six' : 'Interception'; bad = true; }
  else if (ty === 'Pass Incompletion') { kind = 'inc'; const deep = /deep/.test(x); e = s + dir * (deep ? 22 : 9); label = 'Incomplete Pass'; }
  else if (PASS.test(ty)) { kind = 'pass'; e = td ? (dir > 0 ? 100 : 0) : s + dir * y; label = td ? `${y} Yard TD Pass` : y < 0 ? `Pass, Loss of ${-y}` : `${y} Yard Pass`; }
  else if (/^Sack/.test(ty)) { kind = 'sack'; e = s + dir * y; label = `Sack · ${y} yds`; bad = /Fumble/.test(ty); }
  else if (RUSH.test(ty)) { kind = 'run'; e = td ? (dir > 0 ? 100 : 0) : s + dir * y; label = td ? `${y} Yard TD Run` : y < 0 ? `Run, Loss of ${-y}` : y === 0 ? 'No Gain' : `${y} Yard Run`; }
  else if (/Penalty/.test(ty)) { kind = 'pen'; e = nextSpot ?? s; label = 'Penalty'; }
  else if (/Fumble/.test(ty)) { kind = 'run'; e = nextSpot ?? s + dir * y; label = 'Fumble'; bad = /Opponent/.test(ty); }
  else if (/Two-Point|Extra Point/i.test(ty)) { kind = 'fg'; e = dir > 0 ? 108 : -8; label = ty; }
  else { kind = 'run'; e = s + dir * y; label = ty; }
  if (/fumbles/i.test(x) && /RECOVERED by/i.test(x) && kind !== 'kick') { const rec = /RECOVERED by ([A-Z]{2,3})/.exec(x); const rt = rec && Dt.team(ALIAS[rec[1]] || rec[1]); if (rt && rt.id !== off) { bad = true; label += ' · Fumble lost'; } }
  e = Math.max(-9, Math.min(109, e));
  return { p, i, s, e, kind, label, bad, td, dir, off };
}

/* ------------------------------------------------------------------ path for a play at depth d */
function pathFor(D, d = .5) {
  const [x1, y1] = pt(D.s, d), [x2, y2] = pt(D.e, d);
  const dx = Math.abs(x2 - x1);
  let lift;
  if (D.kind === 'kick') lift = 58; else if (D.kind === 'fg') lift = 52;
  else if (D.kind === 'pass' || D.kind === 'inc') lift = 16 + Math.min(42, dx * .9);
  else lift = 4;                                          // runs, sacks, penalties hug the turf
  const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - lift * (D.kind === 'run' || D.kind === 'sack' || D.kind === 'pen' ? 1 : 2) / 2 * (dx < 4 ? .3 : 1);
  return { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, x1, y1, x2, y2 };
}
/* the ball is a plain white dot, the same as app/field.js */
const BALL = (x, y, s = 1) => `<circle class="fv-ball" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4.5 * s).toFixed(1)}" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`;

/* ------------------------------------------------------------------ seen-play memory (animate only new plays) */
const seen = {};

/** the main component */
function fieldViz(g, opts = {}) {
  const L = opts.L || Dt.live(g);
  if (!L || L.idx < 0) return '';
  const plays = L.plays;
  // the play to show: explicit index, else the last real football play at "now"
  let idx = opts.playIdx;
  if (idx == null) { idx = L.idx; while (idx >= 0 && NON_PLAY.test(plays[idx].ty || '')) idx--; }
  if (idx < 0) return '';
  const D = describe(g, plays, idx);
  if (!D) return '';
  const away = Dt.team(g.a), home = Dt.team(g.h);
  const live = opts.playIdx == null;
  const key = g.id + ':' + (opts.mode || 'play');
  const animate = !store.p.a11y.motion && opts.animate !== false && seen[key] !== idx;
  seen[key] = idx;

  // upcoming snap: line of scrimmage + first-down marker
  let los = null, fd = null;
  if (live && L.next && L.next.dd && !/^Kickoff/.test(L.next.ty || '')) {
    const ns = startOf(g, L.next);
    if (ns != null) { los = ns; if (L.next.ds && L.next.dn) fd = Math.max(0, Math.min(100, ns + dirOf(g, L.next.team) * L.next.ds)); if (/& Goal/i.test(L.next.dd)) fd = null; }
  }
  const awayC = App.teamFill(away), homeC = App.teamFill(home); // each team's own primary, never shaded
  const ez = (u0, u1, c) => `<path d="M${P(u0, 0)} L${P(u1, 0)} L${P(u1, 1)} L${P(u0, 1)}Z" fill="${c}"/>`;
  const lines = []; for (let u = 0; u <= 100; u += 10) lines.push(`<path d="M${P(u, 0)} L${P(u, 1)}" stroke="rgba(255,255,255,${u === 0 || u === 100 ? .85 : u === 50 ? .42 : .2})" stroke-width="${u === 0 || u === 100 ? 1.6 : 1}"/>`);
  const mline = (u, color, w = 2) => `<path d="M${P(u, 0)} L${P(u, 1)}" stroke="${color}" stroke-width="${w}"/>`;

  // paths
  let paths = '';
  if (opts.mode === 'drive') {
    const di = plays[idx].di;
    const list = []; for (let k = 0; k <= idx; k++) if (plays[k].di === di && !NON_PLAY.test(plays[k].ty || '')) { const d2 = describe(g, plays, k); if (d2) list.push(d2); }
    list.forEach((d2, n) => {
      const depth = .22 + (list.length > 1 ? n / (list.length - 1) : 1) * .58;
      const pp = pathFor(d2, depth), last = n === list.length - 1;
      const col = d2.bad ? '#ff5d5d' : d2.td ? '#ffd60a' : '#fff';
      paths += `<path d="${pp.d}" fill="none" stroke="${col}" stroke-width="${last ? 2.2 : 1.6}" opacity="${last ? 1 : .35 + .5 * n / list.length}" ${d2.kind === 'inc' ? 'stroke-dasharray="3 3"' : ''} stroke-linecap="round"/><circle cx="${pp.x1.toFixed(1)}" cy="${pp.y1.toFixed(1)}" r="2.2" fill="${col}" opacity="${last ? 1 : .5}"/>` + (last ? BALL(pp.x2, pp.y2, .9) : `<circle cx="${pp.x2.toFixed(1)}" cy="${pp.y2.toFixed(1)}" r="1.8" fill="${col}" opacity=".5"/>`);
    });
  } else {
    const pp = pathFor(D);
    const col = D.bad ? '#ff5d5d' : D.td ? '#ffd60a' : '#fff';
    paths = `<path class="fv-path" d="${pp.d}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" ${D.kind === 'inc' ? 'stroke-dasharray="4 4"' : ''} pathLength="1"/>
      <circle cx="${pp.x1.toFixed(1)}" cy="${pp.y1.toFixed(1)}" r="3" fill="${col}"/>
      ${D.kind === 'inc' ? `<path d="M${pp.x2 - 5} ${pp.y2 - 5}l10 10M${pp.x2 + 5} ${pp.y2 - 5}l-10 10" stroke="#ff5d5d" stroke-width="2.2" stroke-linecap="round"/>` : D.kind === 'pen' ? `<path d="M${pp.x2} ${pp.y2}v-16l9 4-9 4" fill="#ffd60a" stroke="#ffd60a" stroke-width="1.2"/>` : BALL(pp.x2, pp.y2)}`;
  }

  const svg = `<svg class="fv-svg" viewBox="0 0 ${W} 108" width="100%" ${animate ? 'data-anim="1"' : ''} aria-label="${esc(D.label)}">
    ${ez(-10, 0, awayC)}${ez(100, 110, homeC)}
    <path d="M${P(0, 0)} L${P(100, 0)} L${P(100, 1)} L${P(0, 1)}Z" fill="#22492f"/>
    ${lines.join('')}<path d="M${P(-10, 0)} L${P(110, 0)} L${P(110, 1)} L${P(-10, 1)}Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.1"/>
    ${los != null ? mline(los, '#4aa3ff') : ''}${fd != null ? mline(fd, '#ffd60a') : ''}
    ${paths}</svg>`;

  // text
  const p = D.p;
  const kindIcon = { pass: 'football', inc: 'football', run: 'football', kick: 'football', fg: 'flag', sack: 'football', pen: 'flag' }[D.kind] || 'football';
  const playLine = html`<div class="fv-label">${icon(kindIcon, 'sm')}<b>${D.label}</b>${p.dd ? html`<span class="fv-dd">· ${p.dd}</span>` : ''}</div>
    ${opts.compact ? '' : html`<div class="fv-text">${(p.x || '').replace(/\s+/g, ' ').replace(/\(\d+:\d+ - \d\w\w\)\s*/, '')}</div>`}`;

  return html`<div class="fv ${opts.compact ? 'compact' : ''}">${opts.header ? header(g, L) : ''}${raw(svg)}${playLine}</div>`;
}

/* ------------------------------------------------------------------ compact scorebug (the reference look) */
function timeoutsLeft(g, L) {
  const q = L.q || 1, half = q <= 2 ? [1, 2] : q <= 4 ? [3, 4] : [5, 6];
  const used = { [g.a]: 0, [g.h]: 0 };
  const a = Dt.team(g.a).abbr, h = Dt.team(g.h).abbr;
  L.plays.slice(0, L.idx + 1).forEach(p => {
    if (p.ty !== 'Timeout' || !half.includes(p.q)) return;
    const m = /by ([A-Z]{2,3})/.exec(p.x || ''); if (!m) return;
    const ab = ALIAS[m[1]] || m[1];
    if (ab === a) used[g.a]++; else if (ab === h) used[g.h]++;
  });
  const per = q > 4 ? 2 : 3;
  return { [g.a]: Math.max(0, per - used[g.a]), [g.h]: Math.max(0, per - used[g.h]) };
}
function header(g, L) {
  const S = Dt.score(g), to = timeoutsLeft(g, L);
  const side = (tid, sc, right) => {
    const t = Dt.team(tid);
    const pips = [0, 1, 2].map(k => `<i class="${k < to[tid] ? 'on' : ''}"></i>`).join('');
    return html`<div class="fv-team ${right ? 'r' : ''}">
      <span class="fv-badge" style="background:${t.color};box-shadow:0 0 0 2px ${t.alt}">${UI.logo(tid, 'md')}</span>
      <span class="fv-ab"><b>${t.abbr}</b><span class="fv-to">${raw(pips)}</span></span>
      <span class="fv-sc">${sc}${S.poss === tid ? raw(BALL_ICON) : ''}</span></div>`;
  };
  const q = S.q > 4 ? 'OT' : 'Q' + (S.q || 1);
  return html`<div class="fv-head">${side(g.a, S.as)}<div class="fv-clock"><b>${S.label === 'Halftime' ? 'HALF' : q}</b><span>${S.label === 'Halftime' ? '' : S.clock || ''}</span></div>${side(g.h, S.hs, true)}</div>`;
}
const BALL_ICON = '<svg class="fv-poss" viewBox="-10 -7 20 14" width="18" height="12"><ellipse rx="9" ry="5.6" fill="#fff"/><path d="M-4.5 0h9" stroke="#111" stroke-width="1.4" stroke-linecap="round"/></svg>';

/* ------------------------------------------------------------------ animation (runs once per new play) */
function run(svg) {
  svg.removeAttribute('data-anim');
  const path = svg.querySelector('.fv-path'), ball = svg.querySelector('.fv-ball');
  if (!path) return;
  path.style.strokeDasharray = path.getAttribute('stroke-dasharray') ? '' : '1'; path.style.strokeDashoffset = '1';
  const len = path.getTotalLength(), dur = 900, t0 = performance.now();
  const end = ball ? ball.getAttribute('transform') : null;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    if (!path.getAttribute('stroke-dasharray')) path.style.strokeDashoffset = String(1 - e);
    if (ball) { const q = path.getPointAtLength(len * e); ball.setAttribute('transform', `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) rotate(${(e < 1 ? -25 + 50 * e : 0).toFixed(0)})`); }
    if (k < 1) requestAnimationFrame(step); else { path.style.strokeDashoffset = '0'; if (ball && end) ball.setAttribute('transform', end); }
  };
  requestAnimationFrame(step);
}
new MutationObserver(muts => {
  for (const m of muts) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.matches && n.matches('svg[data-anim]')) run(n);
    n.querySelectorAll && n.querySelectorAll('svg[data-anim]').forEach(run);
  }
}).observe(document.documentElement, { childList: true, subtree: true });

UI.fieldViz = fieldViz;
UI.fieldVizDescribe = describe;
})();
