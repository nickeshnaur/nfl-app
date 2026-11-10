/* ============================================================================
   Time machine — prototype tool (tap the status bar). Jumps the whole app to a
   real moment in league history and plays it back at 1×–300×.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, store, time, fmt } = App;
const Dt = App.data, UI = App.UI;

const GROUPS = [
  { n: 'In season', keys: ['bye', 'deadline', 'race'] },
  { n: 'Offseason', keys: ['sbover', 'fa', 'draft', 'sched', 'summer', 'camp', 'cuts'] },
];
const SPEEDS = [1, 10, 60, 300];
/** each kind of score the game page celebrates */
const SCORES = [{ k: 'td', l: 'Touchdown', ic: 'football' }, { k: 'fg', l: 'Field goal', ic: 'target' }, { k: 'two', l: 'Two-point conversion', ic: 'star' }, { k: 'safety', l: 'Safety', ic: 'bolt' }];
const PHASE = { regular: 'Regular season', post: 'Playoffs', fa: 'Free agency', draft: 'NFL Draft', summer: 'Offseason', camp: 'Training camp' };

/** midnight of the sim day in the fan's time zone, as epoch ms */
function dayStart(now) {
  const tz = fmt.tz();
  const d = new Date(now);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(d);
  const g = k => +parts.find(p => p.type === k).value;
  return now - ((g('hour') % 24) * 3600 + g('minute') * 60 + g('second')) * 1000 - d.getMilliseconds();
}

function body() {
  const now = time.now(), m = time.moment(), d = new Date(now);
  const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: fmt.tz() });
  const [hm, ap] = [t.replace(/\s?[AP]M/, ''), (t.match(/[AP]M/) || [''])[0]];
  const ds = dayStart(now), mins = Math.round((now - ds) / 60000);
  const games = Dt.D.games.filter(g => g.ts >= ds && g.ts < ds + 864e5);
  const live = Dt.liveCount();
  return html`
    <div class="tmx-now">
      <div class="tmx-badge">${live ? html`<span class="badge live">${live} live</span>` : html`<span class="badge">${PHASE[m.phase] || ''}</span>`}</div>
      <div class="eyebrow">${m.label}</div>
      <div class="tmx-clock mt8"><span class="tmx-hm">${hm}</span><small>${ap} ${fmt.tzAbbr(now)}</small></div>
      <div class="tmx-date">${fmt.dayLong(now)}, ${d.getUTCFullYear()}${time.paused ? ' · paused' : time.speed !== 1 ? ` · playing at ${time.speed}×` : ''}</div>
      <div class="tmx-ctrl">
        <button class="tmx-play" data-act="tmx-pause" aria-label="${time.paused ? 'Play' : 'Pause'}">${icon(time.paused ? 'play' : 'pause')}</button>
        <div class="tmx-speeds">${SPEEDS.map(s => html`<button class="${!time.paused && time.speed === s ? 'on' : ''}" data-act="tmx-speed" data-arg="${s}">${s}×</button>`)}</div>
      </div>
      <div class="tmx-jumps">${[['-600000', '−10m'], ['600000', '+10m'], ['3600000', '+1h'], ['86400000', '+1d']].map(([v, l]) => html`<button data-act="tmx-jump" data-arg="${v}">${l}</button>`)}</div>
      <div class="tmx-scrub">
        <input type="range" min="0" max="1439" step="5" value="${mins}" data-tmx-scrub aria-label="Time of day">
        <div class="tmx-games">${games.map(g => { const mm = (g.ts - ds) / 60000; return raw(`<i style="left:${(mm / 1440 * 100).toFixed(2)}%" title="${esc(Dt.team(g.a).abbr + ' @ ' + Dt.team(g.h).abbr)}"></i>`); })}</div>
        <div class="tmx-ticks"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div>
        ${games.length ? html`<div class="tiny mt6">${games.length} game${games.length > 1 ? 's' : ''} kick off this day. Drag to scrub through it.</div>` : ''}
      </div>
    </div>
    ${weekBlock()}${scenarioBlock()}${platformBlock()}
    ${GROUPS.map(gr => html`<div class="set-group"><div class="set-label">${gr.n}</div><div class="tmx-list">${gr.keys.map(k => {
      const mo = time.moments.find(x => x.key === k); if (!mo) return '';
      const on = time.key === k;
      return html`<button class="tmx-m ${on ? 'on' : ''}" data-act="tmx-set" data-arg="${k}"><span class="mi">${icon(mo.icon, 'sm')}</span>
        <span class="grow"><span class="mt" style="display:block">${mo.label}</span><span class="ms" style="display:block">${mo.sub}</span></span>
        ${mo.live ? raw('<span class="badge live">Live</span>') : ''}${on ? icon('check', 'sm accent') : ''}</button>`;
    })}</div></div>`)}
    <div class="set-group"><div class="set-label">Scoring plays</div><div class="tmx-list">${SCORES.map(k => html`<button class="tmx-m" data-act="tmx-score" data-arg="${k.k}"><span class="mi">${icon(k.ic, 'sm')}</span>
      <span class="grow"><span class="mt" style="display:block">${k.l}</span><span class="ms" style="display:block">Opens a live game 5 seconds before one</span></span>${icon('chev', 'sm')}</button>`)}</div></div>
    <div class="set-group"><div class="set-label">Previews</div><div class="tmx-list">${PREVIEWS.map(([k, ic, l, d]) => html`<button class="tmx-m" data-act="tmx-preview" data-arg="${k}"><span class="mi">${icon(ic, 'sm')}</span>
      <span class="grow"><span class="mt" style="display:block">${l}</span><span class="ms" style="display:block">${d}</span></span>${icon('chev', 'sm')}</button>`)}</div></div>
    ${time.key !== 'now' || time.speed !== 1 || time.paused ? html`<div class="pad mt20"><button class="btn ghost block" data-act="tmx-set" data-arg="now">${icon('refresh', 'sm')} Back to right now</button></div>` : ''}
    <div class="tmx-proto">${icon('info', 'sm')}<span>Prototype tool. Every moment is real: scores, plays, standings and stats are rebuilt from the actual data as it stood at that instant. Live games replay their real play-by-play in real time.</span></div>`;
}

/* ---------- when: a day (S M T W T F S) and morning, afternoon or evening, in the week of a part of the season you jump to.
   Times are Eastern, like kickoffs. */
const ET = 'America/New_York', DAY = 864e5;
const PARTS = [['morning', 'Morning', 10, 0, 6], ['afternoon', 'Afternoon', 15, 55, 12], ['evening', 'Evening', 21, 40, 18]];   // [key, label, default h, m, window start]
const etFmt = new Intl.DateTimeFormat('en-US', { timeZone: ET, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
/** the Eastern wall clock at an instant, as fields */
function etAt(ms) { const p = {}; etFmt.formatToParts(ms).forEach(x => p[x.type] = +x.value); return p; }
/** an Eastern wall-clock time as epoch ms */
function etTime(dayKey, h, mi) {
  const d = new Date(dayKey), wall = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, mi);
  let t = wall; for (let i = 0; i < 2; i++) { const p = etAt(t); t = wall - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - t); }
  return t;
}
/** an instant's Eastern calendar day, and the Sunday that starts its week (as UTC-midnight keys) */
function dayKeyOf(ms) { const p = etAt(ms); return Date.UTC(p.year, p.month - 1, p.day); }
const sundayOf = k => k - new Date(k).getUTCDay() * DAY;   // k is a day key, not an instant
const weekKeyOf = ms => sundayOf(dayKeyOf(ms));
const partOf = ms => { const h = etAt(ms).hour; return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; };
const nowAt = () => Date.parse(time.moments[0].at);   // the data runs to "Right now", so that's the last pickable instant

/** parts of the season, each from the latest season that has finished that week */
const STOPS = [
  { k: 'pre', l: 'Preseason', t: 1, w: 3, ic: 'whistle' },
  { k: 'w1', l: 'Week 1', t: 2, w: 1, ic: 'flag' },
  { k: 'w4', l: 'Week 4', t: 2, w: 4, ic: 'calendar' },
  { k: 'w10', l: 'Week 10', t: 2, w: 10, ic: 'calendar' },
  { k: 'w16', l: 'Week 16', t: 2, w: 16, ic: 'calendar' },
  { k: 'div', l: 'Divisional Round', t: 3, w: 2, ic: 'trophy' },
  { k: 'sb', l: 'Super Bowl', t: 3, w: 5, ic: 'trophy' },
];
const POST = { 1: 'Wild Card', 2: 'Divisional Round', 3: 'Conference Championships', 4: 'Pro Bowl', 5: 'Super Bowl' };
const weekName = g => g.t === 1 ? 'Preseason' : g.t === 3 ? POST[g.w] || 'Playoffs' : 'Week ' + g.w;
/** a stop's games and the Sunday its days start on (the Sunday on or after its first game) */
function stopWeek(st) {
  const end = nowAt(), by = {};
  Dt.D.games.forEach(g => { if (g.t === st.t && g.w === st.w) (by[g.s] = by[g.s] || []).push(g); });
  const s = Object.keys(by).map(Number).filter(s => by[s].every(g => g.ts <= end)).sort((a, b) => b - a)[0];
  if (s == null) return null;
  const k = dayKeyOf(Math.min(...by[s].map(g => g.ts)));
  return { s, wk: k + ((7 - new Date(k).getUTCDay()) % 7) * DAY };
}
/** the game that names an instant's week and phase: one that day, else the latest before it (within ten days), else the next */
function nearGame(ms) {
  const day = dayKeyOf(ms), from = ms - 10 * DAY;
  const today = Dt.D.games.find(g => dayKeyOf(g.ts) === day); if (today) return today;
  let best = null;
  Dt.D.games.forEach(g => { if (g.ts <= ms && g.ts > from && (!best || g.ts > best.ts)) best = g; });
  return best || Dt.D.games.filter(g => g.ts > ms && g.ts < ms + 10 * DAY).sort((a, b) => a.ts - b.ts)[0] || null;
}
/** what a Sunday-to-Saturday week is called: the rounds or weeks its games belong to (a playoff week can hold two) */
function weekLabel(wk) {
  const from = etTime(wk, 0, 0), gs = Dt.D.games.filter(g => g.ts >= from && g.ts < from + 7 * DAY).sort((a, b) => a.ts - b.ts);
  if (!gs.length) return '';
  const names = [...new Set(gs.map(g => g.t === 2 ? null : weekName(g)).filter(Boolean))];
  const reg = gs.find(g => g.t === 2 && dayKeyOf(g.ts) === wk) || gs.find(g => g.t === 2);
  return { l: [reg && weekName(reg), ...names].filter(Boolean).join(' & '), s: gs[0].s };
}
// by the schedule (three hours a game), so a time of day doesn't move once the real play-by-play loads
const SLOT = 3 * 36e5;
/** the instant with the most of a part of the day's games on (the middle of that stretch), so evening is the primetime game
    rather than the end of the late window; with no kickoffs in it, a fixed time */
function partTime(day, part) {
  const P = PARTS.find(p => p[0] === part), from = etTime(day, P[4], 0), to = etTime(day, P[4] + 6, 0);
  const gs = Dt.D.games.filter(g => g.ts >= from && g.ts < to); if (!gs.length) return { at: etTime(day, P[2], P[3]), n: 0 };
  let best = 0, run = [];
  for (let t = from; t < to; t += 5 * 60000) {   // stays inside its part of the day
    const n = gs.filter(g => g.ts <= t && g.ts + SLOT > t).length;
    if (n > best) { best = n; run = [t]; } else if (n === best && n && run.length && run[run.length - 1] === t - 5 * 60000) run.push(t);
  }
  return best ? { at: run[Math.floor(run.length / 2)], n: best } : { at: etTime(day, P[2], P[3]), n: 0 };
}
time.labelFor = ms => { const g = nearGame(ms), p = PARTS.find(x => x[0] === partOf(ms)); return `${g ? weekName(g) + ' · ' : ''}${new Date(dayKeyOf(ms)).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })} ${p[1].toLowerCase()}`; };
time.phaseFor = ms => { const g = nearGame(ms); return !g ? 'regular' : g.t === 1 ? 'camp' : g.t === 3 ? 'post' : 'regular'; };

/** a week you can page to: it starts by "Right now" and isn't before the data does */
const weekOk = wk => etTime(wk, 0, 0) <= nowAt() && etTime(wk + 7 * DAY, 0, 0) > Math.min(...Dt.D.games.map(g => g.ts));
let shownWeek = null;   // the week on screen: the one you jumped to, else the clock's
function weekBlock() {
  const now = time.now(), today = dayKeyOf(now), part = partOf(now);
  if (shownWeek == null) shownWeek = weekKeyOf(now);
  const wk = shownWeek, here = weekKeyOf(now) === wk, label = weekLabel(wk);
  const md = k => new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const day = here ? today : wk;
  return html`<div class="set-group"><div class="set-label">When</div>
    <div class="tmx-wk">
      <div class="tmx-wk-h">
        <button class="icon-btn" data-act="tmx-wk" data-arg="-1" aria-label="Previous week" ${raw(weekOk(wk - 7 * DAY) ? '' : 'disabled')}>${icon('back', 'sm')}</button>
        <div class="grow center"><div class="b">${label ? label.l : 'No games this week'}</div><div class="tiny">${label ? label.s + ' season · ' : ''}${md(wk)} – ${md(wk + 6 * DAY)}</div></div>
        <button class="icon-btn" data-act="tmx-wk" data-arg="1" aria-label="Next week" ${raw(weekOk(wk + 7 * DAY) ? '' : 'disabled')}>${icon('chev', 'sm')}</button>
      </div>
      <div class="tmx-days">${'SMTWTFS'.split('').map((l, d) => {
        const k = wk + d * DAY, from = etTime(k, 0, 0);
        const has = Dt.D.games.some(g => g.ts >= from && g.ts < from + DAY);
        const future = etTime(k, PARTS[0][2], PARTS[0][3]) > nowAt();
        return html`<button class="${k === today ? 'on' : ''}" data-act="tmx-day" data-arg="${k}" ${raw(future ? 'disabled' : '')} aria-label="${new Date(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}${has ? ', games' : ''}"><span>${l}</span><b>${new Date(k).getUTCDate()}</b><i class="${has ? 'on' : ''}"></i></button>`;
      })}</div>
      <div class="tmx-parts">${PARTS.map(([k, l]) => {
        const { at } = partTime(day, k);
        return html`<button class="${here && k === part ? 'on' : ''}" data-act="tmx-part" data-arg="${k}" ${raw(at > nowAt() ? 'disabled' : '')}>${l}<small>${fmt.time(at)}</small></button>`;
      })}</div>
    </div></div>
    <div class="set-group"><div class="set-label">Season</div><div class="tmx-list">${STOPS.map(st => {
      const sw = stopWeek(st); if (!sw) return '';
      const on = sw.wk === wk;
      return html`<button class="tmx-m ${on ? 'on' : ''}" data-act="tmx-stop" data-arg="${st.k}"><span class="mi">${icon(st.ic, 'sm')}</span>
        <span class="grow"><span class="mt" style="display:block">${st.l}</span><span class="ms" style="display:block">${sw.s} season · week of ${md(sw.wk)}${new Date(sw.wk).getUTCFullYear() !== sw.s ? ', ' + new Date(sw.wk).getUTCFullYear() : ''}</span></span>
        ${on ? icon('check', 'sm accent') : ''}</button>`;
    })}</div></div>`;
}
/** jump to a day at a time of day; an unreachable time (after "Right now") steps back to the latest one that's reachable */
function pickTime(day, part) {
  let i = PARTS.findIndex(p => p[0] === part), at;
  for (; i >= 0; i--) { at = partTime(day, PARTS[i][0]).at; if (at <= nowAt()) break; }
  if (i < 0) return;
  time.set('week', at);
  if (store.p.tmxScen) applyScenario(store.p.tmxScen, true);
  repaint();   // no toast: the clock card at the top of the sheet already shows the new time and what's live
}

let entry = null;
function open(instant) {
  // keep: stays open while the app refreshes around it, so you can pick a day and then a time of day
  entry = App.sheet({ title: 'Time machine', html: body(), full: false, keep: true,
    mount(el, e) {
      if (instant) { e.sh.style.animation = 'none'; e.bd.style.animation = 'none'; }
      wire(el);
      const off = App.on('tick', () => {
        const c = el.querySelector('.tmx-hm'); if (!c) return;
        const t = new Date(time.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: fmt.tz() });
        c.textContent = t.replace(/\s?[AP]M/, '');
        const r = el.querySelector('[data-tmx-scrub]'); if (r && document.activeElement !== r && !r._drag) r.value = Math.round((time.now() - dayStart(time.now())) / 60000);
      });
      return () => { off(); entry = null; };
    } });
}
function wire(el) {
  const r = el.querySelector('[data-tmx-scrub]'); if (!r) return;
  r.addEventListener('pointerdown', () => r._drag = true);
  r.addEventListener('change', () => {
    r._drag = false;
    const ds = dayStart(time.now());
    time.set(time.key, ds + (+r.value) * 60000);
    repaint();
  });
}
function repaint() { if (!entry) return; const b = entry.sh.querySelector('.sheet-body'), y = b.scrollTop; App.updateSheet(entry, body()); b.scrollTop = y; wire(b); }
App.on('live-ready', repaint);   // the live count settles once the day's games are rebuilt

const A = App.actions;
A['time-machine'] = () => { if (entry) return; shownWeek = null; open(); };
A['tmx-stop'] = (el, ev, k) => {
  const sw = stopWeek(STOPS.find(x => x.k === k)); if (!sw) return;
  // land on its Sunday, at the part of the day with the most games on
  shownWeek = sw.wk;
  const best = PARTS.map(p => [p[0], partTime(sw.wk, p[0]).n]).reduce((a, b) => b[1] > a[1] ? b : a, ['afternoon', 0]);
  pickTime(sw.wk, best[0]);
};
A['tmx-wk'] = (el, ev, d) => { const wk = shownWeek + +d * 7 * DAY; if (!weekOk(wk)) return; shownWeek = wk; repaint(); };   // look at the next or previous week (a Divisional Saturday, a Thursday opener); pick a day to go
A['tmx-day'] = (el, ev, k) => { const day = +k; shownWeek = sundayOf(day); pickTime(day, partOf(time.now())); };
A['tmx-part'] = (el, ev, part) => { const now = time.now(); pickTime(weekKeyOf(now) === shownWeek ? dayKeyOf(now) : shownWeek, part); };
A['tmx-set'] = (el, ev, k) => {
  if (k === 'now') { time.speed = 1; time.paused = false; }
  App.closeSheet(true);   // a moment is a destination: close and show it
  time.set(k);
  if (store.p.tmxScen) applyScenario(store.p.tmxScen, true);
  App.toast({ title: time.moment().label, body: time.moment().sub, icon: time.moment().icon });
};
/* ---------- your team's situation: swap in a team that fits the moment, keep yours to come back to */
const SCEN = [['mine', 'My team'], ['contender', 'Contender'], ['bubble', 'Bubble'], ['struggling', 'Struggling']];
function scenarioLabel(k) { return time.phase() === 'post' ? { contender: 'In the playoffs', bubble: 'Just missed', struggling: 'Bad season' }[k] || 'My team' : (SCEN.find(x => x[0] === k) || [])[1]; }
/** the team that best fits a situation at the current instant (a team playing now wins ties, so there's something to watch) */
function scenarioTeam(k) {
  const now = time.now(), s = Dt.seasonForStats(now), st = Dt.standings(s, now), post = time.phase() === 'post';
  const playing = tid => Dt.D.games.some(g => (g.h === tid || g.a === tid) && Math.abs(g.ts - now) < 6 * 36e5);
  const prefer = list => (list.find(r => playing(r.tid)) || list[0] || {}).tid;
  const seeds = ['AFC', 'NFC'].flatMap(c => st.conf[c]);
  if (k === 'contender') {
    if (post) {
      // still alive: has a playoff game now or still to come
      const alive = [...new Set(Dt.D.games.filter(g => g.s === s && g.t === 3 && Dt.state(g, now) !== 'post').flatMap(g => [g.h, g.a]))];
      if (alive.length) return prefer(alive.map(tid => ({ tid })));
    }
    return prefer(st.all.filter(r => r.gp).sort((a, b) => b.pct - a.pct || b.diff - a.diff).slice(0, 6));
  }
  if (k === 'bubble') return prefer(seeds.filter(r => r.seed >= (post ? 8 : 6) && r.seed <= 9 && r.gp).sort((a, b) => b.pct - a.pct));
  if (k === 'struggling') return prefer(st.all.filter(r => r.gp).sort((a, b) => a.pct - b.pct || a.diff - b.diff).slice(0, 3));
  return null;
}
function applyScenario(k, quiet) {
  const p = store.p;
  if (k === 'mine') {
    if (p.tmxOrig) { p.teams = p.tmxOrig.teams; p.primary = p.tmxOrig.primary; delete p.tmxOrig; }
    delete p.tmxScen;
  } else {
    const tid = scenarioTeam(k); if (!tid) return !quiet && App.toast({ title: 'No team fits that right now', icon: 'info' });
    p.tmxOrig = p.tmxOrig || { teams: p.teams.slice(), primary: p.primary };
    p.teams = [tid, ...p.tmxOrig.teams.filter(x => x !== tid)]; p.primary = tid; p.tmxScen = k;
  }
  store.save(); App.applyTheme(); App.refreshAll();
  if (!quiet) { const tm = Dt.team(p.primary); App.toast({ title: k === 'mine' ? `Back to the ${tm ? tm.name : 'your team'}` : `You're a ${tm.name} fan for now`, body: k === 'mine' ? '' : `${scenarioLabel(k)} · ${Dt.record(tm.id, Dt.seasonForStats()).str}`, logo: tm && tm.logoDark }); }
  repaint();
}
/** the selected chip is ink (black in light, white in dark), so its logo takes the opposite variant */
function scenLogo(tid, on) {
  const t = Dt.team(tid), light = document.documentElement.dataset.theme === 'light';
  return on ? html`<img class="logo xs" src="${light ? t.logoDark || t.logo : t.logo}" alt="${t.abbr}">` : UI.logo(tid, 'xs');
}
/** iOS or Android: the only difference is the tab bar (Liquid Glass capsule vs Material navigation bar) */
function platformBlock() {
  const cur = store.p.platform === 'android' ? 'android' : 'ios';
  return html`<div class="set-group"><div class="set-label">Device</div>
    <div class="pad"><div class="tmx-scen">${[['ios', 'iOS'], ['android', 'Android']].map(([k, l]) => html`<button class="${cur === k ? 'on' : ''}" data-act="tmx-platform" data-arg="${k}">${l}</button>`)}</div>
      <div class="tiny mt8">${cur === 'ios' ? 'Liquid Glass tab bar, floating over the page.' : 'Material navigation bar along the bottom edge.'}</div></div></div>`;
}
A['tmx-platform'] = (el, ev, k) => { store.p.platform = k; store.save(); App.applyTheme(); const g = el.closest('.set-group'); if (g) g.outerHTML = platformBlock().toString(); };
function scenarioBlock() {
  const cur = store.p.tmxScen || 'mine', post = time.phase() === 'post', orig = store.p.tmxOrig ? store.p.tmxOrig.primary : store.p.primary;
  if (!orig && cur === 'mine' && !store.p.teams.length) return '';
  const opts = SCEN.filter(([k]) => k !== 'bubble' || ['regular', 'post'].includes(time.phase()));
  const tm = Dt.team(store.p.primary);
  return html`<div class="set-group"><div class="set-label">Your team</div>
    <div class="pad"><div class="tmx-scen">${opts.map(([k]) => html`<button class="${cur === k ? 'on' : ''}" data-act="tmx-scen" data-arg="${k}">${k === 'mine' && orig ? scenLogo(orig, cur === k) : ''}${k === 'mine' ? 'Mine' : scenarioLabel(k)}</button>`)}</div>
      <div class="tiny mt8">${cur === 'mine' ? (post ? 'Try the playoffs as a team that\'s still alive, one that just missed, or one with a bad season.' : 'See this moment as a fan of a contender, a bubble team or a struggling team.') : html`Showing the app as a ${tm.name} fan (${Dt.record(tm.id, Dt.seasonForStats()).str}). Your own teams come back with "Mine".`}</div></div></div>`;
}
A['tmx-scen'] = (el, ev, k) => applyScenario(k);

/* ---------- previews: things that only happen at certain times */
const PREVIEWS = [
  ['recap', 'rewind', 'Weekly recap', 'Your week in a story, as a modal'],
  ['pregame', 'stadium', 'Pregame', 'A game page as the gates open'],
  ['ms-clinch', 'trophy', 'Milestone: playoff bound', 'When your team clinches'],
  ['ms-stamp', 'pin', 'Milestone: 10 stadiums', 'Football passport'],
  ['ms-streak', 'fire', 'Milestone: 30-day streak', 'Opening the app every day'],
];
A['tmx-preview'] = (el, ev, k) => {
  App.closeOverlays(true);
  const mine = store.p.primary;
  if (k === 'recap') return App.weeklyRecap();
  if (k === 'ms-clinch') {
    // the most recent finished season your team made it; if it never did, the team that took the top seed
    const now = time.now(), done = s => Dt.D.games.some(g => g.s === s && g.t === 2) && Dt.D.games.filter(g => g.s === s && g.t === 2).every(g => Dt.state(g, now) === 'post');
    const seasons = [...new Set(Dt.D.games.map(g => g.s))].sort((a, b) => b - a).filter(done);
    for (const s of seasons) { const r = mine && Dt.standings(s, now).all.find(x => x.tid === mine); if (r && r.inPlayoffs) return UI.milestone(UI.MILESTONES.clinch(mine, s)); }
    const s = seasons[0]; if (!s) return;
    const conf = (mine && Dt.team(mine).conf) || 'AFC', top = Dt.standings(s, now).conf[conf][0].tid;
    UI.milestone(UI.MILESTONES.clinch(top, s));
    if (mine) App.toast({ title: `The ${Dt.team(mine).name} missed the playoffs ${seasons[seasons.length - 1]}–${seasons[0]}`, body: `Showing the ${conf}'s top seed instead`, icon: 'info' });
    return;
  }
  if (k === 'ms-stamp') return UI.milestone(UI.MILESTONES.stamp(10, mine ? App.stadium && (App.stadium(Dt.team(mine).abbr) || {}).name : ''));
  if (k === 'ms-streak') return UI.milestone(UI.MILESTONES.streak(30));
  if (k === 'pregame') {
    // a Week 5 game with ~100 minutes to kickoff: your team's if it played that Sunday, else the late window
    const day = Dt.D.games.filter(g => g.s === 2026 && g.t === 2 && g.w === 5 && new Date(g.ts).getUTCDate() === 11);
    const g = day.find(x => store.p.teams.includes(x.h) || store.p.teams.includes(x.a)) || day.slice().sort((a, b) => b.ts - a.ts)[0];
    time.speed = 1; time.paused = false; time.set('pregame', g.ts - 100 * 60000);
    App.go('#/game/' + g.id, { replace: /^#\/game\//.test(App.current().hash) });
    App.toast({ title: 'Gates are open', body: `${Dt.team(g.a).abbr} @ ${Dt.team(g.h).abbr} · kickoff in 1h 40m`, icon: 'stadium' });
  }
};

/** real scores of one kind, from the games nearest Game Day Sunday (your teams' first); loads play-by-play in small batches until some turn up */
async function findScores(kind) {
  const base = Date.parse(time.moments.find(m => m.key === 'gameday').at), day = 864e5;
  const mine = g => store.p.teams.includes(g.h) || store.p.teams.includes(g.a);
  const pool = Dt.D.games.filter(g => g.st === 'post' && g.s >= 2025)
    .sort((a, b) => Math.floor(Math.abs(a.ts - base) / day) - Math.floor(Math.abs(b.ts - base) / day) || mine(b) - mine(a) || a.ts - b.ts);
  const kindOf = App.gameParts.playScoreKind;
  for (let i = 0; i < pool.length; i += 12) {
    const batch = pool.slice(i, i + 12);
    await Promise.all(batch.map(g => Dt.ensurePbp(g.id).catch(() => null)));
    const hits = [];
    batch.forEach(g => { const pbp = Dt.D.live[g.id]; if (pbp) pbp._flat.forEach(p => { if (p.sc && p._wc && kindOf(p) === kind) hits.push({ g, p }); }); });
    if (hits.length) return hits;
  }
  return [];
}
A['tmx-score'] = async (el, ev, kind) => {
  const k = SCORES.find(x => x.k === kind);
  const hits = await findScores(kind);
  if (!hits.length) return App.toast({ title: `No ${k.l.toLowerCase()} in the data`, icon: 'info' });
  // each tap lands on the next one
  const seen = store.tmp.tmxScore = store.tmp.tmxScore || {};
  const { g, p } = hits[(seen[kind] = (seen[kind] ?? -1) + 1) % hits.length];
  App.closeOverlays(true);
  time.speed = 1; time.paused = false;
  time.set('replay', p._wc - 5000);
  App.go('#/game/' + g.id, { replace: /^#\/game\//.test(App.current().hash) });
  App.toast({ title: `${k.l} in 5 seconds`, body: `${Dt.team(g.a).abbr} @ ${Dt.team(g.h).abbr} · Q${p.q} ${p.c}`, icon: k.ic });
};
A['tmx-jump'] = (el, ev, ms) => { time.jump(+ms); open(true); };
A['tmx-speed'] = (el, ev, s) => { time.setSpeed(+s); App.renderChrome(); repaint(); };
A['tmx-pause'] = () => { time.togglePause(); App.renderChrome(); repaint(); };

App.timeMachine = { open, platformBlock, weekBlock, scenarioBlock };
})();
