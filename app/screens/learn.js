/* ============================================================================
   Learn — Football 101 for new and international fans, plus a glossary.
   Routes: learn, learn/:id, glossary
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, store, fmt } = App;
const UI = App.UI;

const metric = () => (store.p.location.country || 'US') !== 'US';
const yd = n => metric() ? `${n} yards (${Math.round(n * 0.9144)} m)` : `${n} yards`;

/* ------------------------------------------------------------------ diagrams (simple, flat SVG) */
const G = '#2c6b3f';
/** the lesson's two teams: yours and your next (or live) opponent; the Chiefs and the Bills when you follow nobody */
function pair() {
  const Dt = App.data, me = Dt.team(store.p.primary) || Dt.team('12');
  const g = Dt.liveGameFor && Dt.liveGameFor(me.id) || Dt.nextGame && Dt.nextGame(me.id) || Dt.lastGame && Dt.lastGame(me.id);
  const opp = g ? Dt.team(g.h === me.id ? g.a : g.h) : Dt.team(me.id === '2' ? '12' : '2');
  return [me, opp || Dt.team('2'), g];
}
/** the one field (app/field.js, round 5 v2): team end zones with nothing written in them, a dimension line or the two lines */
function fieldSvg(o = {}) { const [a, h] = pair(); return raw(`<div class="lr-dia">${DSField.plate({ a, h, ...o })}</div>`); }
function formationSvg() {
  const W = 340, H = 210, los = 110;
  const O = [[170, 122, 'C'], [144, 122, 'G'], [196, 122, 'G'], [118, 122, 'T'], [222, 122, 'T'], [248, 124, 'TE'], [170, 150, 'QB'], [170, 180, 'RB'], [40, 124, 'WR'], [306, 124, 'WR'], [278, 140, 'WR']];
  const X = [[150, 98, 'DT'], [190, 98, 'DT'], [118, 98, 'DE'], [222, 98, 'DE'], [130, 72, 'LB'], [170, 70, 'LB'], [210, 72, 'LB'], [40, 92, 'CB'], [300, 92, 'CB'], [130, 30, 'S'], [215, 30, 'S']];
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" class="lr-dia"><rect width="${W}" height="${H}" fill="${G}" rx="10"/>`;
  s += `<line x1="0" x2="${W}" y1="${los}" y2="${los}" stroke="#4aa3ff" stroke-width="2" stroke-dasharray="5 4"/>`;
  X.forEach(([x, y, l]) => s += `<g transform="translate(${x} ${y})"><path d="M-8 -8L8 8M8 -8L-8 8" stroke="#ff8a8a" stroke-width="3" stroke-linecap="round"/><text y="-12" fill="#fff" font-size="8.5" text-anchor="middle" font-family="AP Sans" font-weight="700">${l}</text></g>`);
  O.forEach(([x, y, l]) => s += `<g transform="translate(${x} ${y + 4})"><circle r="11" fill="rgba(0,0,0,.25)" stroke="#fff" stroke-width="2"/><text y="3" fill="#fff" font-size="${l.length > 1 ? 7.5 : 9}" text-anchor="middle" font-family="AP Sans" font-weight="700">${l}</text></g>`);
  s += `<text x="${W - 8}" y="${H - 8}" fill="rgba(255,255,255,.8)" font-size="9" text-anchor="end" font-family="AP Sans">O offense · X defense · dashed line = line of scrimmage</text></svg>`;
  return raw(s);
}
function bracketSvg() {
  const W = 340, H = 170;
  const col = (x, n, y0, gap, labels) => labels.map((l, i) => `<g transform="translate(${x} ${y0 + i * gap})"><rect width="70" height="22" rx="5" fill="var(--surface-3)"/><text x="35" y="15" fill="var(--text)" font-size="9.5" text-anchor="middle" font-family="AP Sans" font-weight="700">${l}</text></g>`).join('');
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" class="lr-dia" style="background:var(--surface-2);border-radius:10px">`;
  s += `<text x="8" y="16" fill="var(--text-3)" font-size="9" font-family="AP Sans" font-weight="700">EACH CONFERENCE (7 TEAMS)</text>`;
  s += col(8, 4, 28, 30, ['#1 seed: BYE', '2 vs 7', '3 vs 6', '4 vs 5']);
  s += col(92, 2, 43, 60, ['Divisional', 'Divisional']);
  s += col(176, 1, 73, 0, ['Conf. Champ.']);
  s += `<g transform="translate(260 66)"><rect width="74" height="36" rx="6" fill="var(--accent)"/><text x="37" y="15" fill="var(--accent-ink)" font-size="9" text-anchor="middle" font-family="APD C" font-weight="700" letter-spacing="1">SUPER BOWL</text><text x="37" y="28" fill="var(--accent-ink)" font-size="8.5" text-anchor="middle" font-family="AP Sans">AFC vs NFC</text></g>`;
  s += `<path d="M78 39H86V69H92M78 99H86V129H92 M162 54H170V84H176M162 114H170V84 M246 84H260" stroke="var(--line-2)" stroke-width="1.5" fill="none"/>`;
  s += '</svg>';
  return raw(s);
}
/** the app's own score bug (round 5 v2): two L1 lines, the L5 pill and the down & distance, with callouts above and below */
function scorebugSvg() {
  const [a, h, g] = pair(), Dt = App.data;
  const live = g && Dt.state(g) === 'live', A = live ? g.a : a.id, H = live ? g.h : h.id;
  const S = live ? Dt.score(g) : { st: 'live', as: 17, hs: 14, label: '3rd 4:12', dd: '2nd & 6', poss: A };
  const call = t => html`<span class="lr-call">${t}</span>`;
  return html`<div class="lr-dia lr-sb"><div class="lr-sbr">${call('Team & score')}${call('Quarter & clock')}</div>
    <div class="lr-sbc"><div class="lr-sbt">${UI.lk1(A, S.as, { poss: S.poss === A })}${UI.lk1(H, S.hs, { poss: S.poss === H })}</div><div class="lr-sbs">${UI.lk5(S)}<b class="r-down-distance">${S.dd || '1st & 10'}</b></div></div>
    <div class="lr-sbr">${call('Has the ball')}${call('Down & distance')}</div></div>`;
}
function signalSvg(kind) {
  // a minimal referee figure; arms posed per signal
  const arms = {
    td: 'M30 30L18 6M30 30L42 6', hold: 'M30 30L44 34L44 22M30 30L16 34',
    offside: 'M30 30L18 34L18 22M30 30L42 34L42 22', false: 'M30 30L22 26L30 22L38 26L30 30',
    pi: 'M30 30L50 26M30 30L10 26', incomplete: 'M30 32L12 32M30 32L48 32',
  }[kind] || '';
  return raw(`<svg viewBox="0 0 60 80" width="48" height="64" class="none"><circle cx="30" cy="16" r="7" fill="none" stroke="var(--text)" stroke-width="2.5"/><path d="M30 23V52M30 52L22 74M30 52L38 74" stroke="var(--text)" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M25 26h10v16H25z" fill="none" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="2 2"/><path d="${arms}" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`);
}

/* ------------------------------------------------------------------ lessons */
/* animated penalty diagrams for the penalties lesson: a top-down field, the offender turns red, then the flag */
const PEN_ANIMS = [
  ['false', 'False start', 'A lineman flinches before the snap. Dead ball, 5 yards.'],
  ['offside', 'Offside', 'A defender is past the line when the ball is snapped. 5 yards.'],
  ['hold', 'Holding', 'A blocker grabs and pulls a defender back. 10 yards.'],
  ['pi', 'Pass interference', 'The defender hits the receiver before the ball arrives. The ball goes to the spot.'],
];
function penAnim(k) {
  const O = (x, y, c = '') => `<circle class="o ${c}" cx="${x}" cy="${y}" r="7"/>`;
  const X = (x, y, c = '') => `<g class="x ${c}" transform="translate(${x} ${y})"><path d="M-6-6 6 6M6-6-6 6"/></g>`;
  const line = [45, 60, 75, 90, 105];
  const base = `<rect width="300" height="150" rx="10" class="fld"/>${[60, 120, 180, 240].map(x => `<path class="yl" d="M${x} 8V142"/>`).join('')}<path class="los" d="M150 8V142"/><ellipse class="ball" cx="150" cy="75" rx="5" ry="3.2"/>`;
  const scenes = {
    false: `${line.map((y, i) => i === 2 ? `<g class="pa-jump">${O(138, y, 'bad')}</g>` : O(138, y)).join('')}${line.map(y => X(164, y)).join('')}`,
    offside: `${line.map(y => O(138, y)).join('')}${line.map((y, i) => i === 3 ? `<g class="pa-cross">${X(164, y, 'bad')}</g>` : X(164, y)).join('')}`,
    hold: `<g class="pa-push">${O(138, 75, 'bad')}</g><g class="pa-held">${X(164, 75)}</g><path class="pa-grab" d="M144 75H158"/>${O(138, 55)}${O(138, 95)}${X(164, 55)}${X(164, 95)}`,
    pi: `${O(138, 75)}<g class="pa-route">${O(140, 125)}</g><g class="pa-cover">${X(170, 112, 'bad')}</g><ellipse class="ball pa-pass" cx="150" cy="75" rx="5" ry="3.2"/>`,
  };
  return raw(`<svg class="pen-anim pa-${k}" viewBox="0 0 300 150" role="img" aria-label="${PEN_ANIMS.find(p => p[0] === k)[1]} diagram">${base}${scenes[k]}<g class="pa-flag"><path d="M0 0h12l-3 4 3 4H0z"/><path d="M0 0v14" class="pole"/></g></svg>`);
}
const LESSONS = [
  { id: 'basics', t: 'The basics', sub: 'Two teams, one ball, 60 minutes', mins: 3, lvl: 'Start here', ic: 'football',
    body: () => html`
      <p>Each team has 11 players on the field. One team is on <b>offense</b> (it has the ball and tries to move it forward); the other is on <b>defense</b> (it tries to stop them).</p>
      <p>The field is 100 yards long between two <b>end zones</b>${metric() ? ' — about 91 metres' : ''}. Carry or catch the ball in the other team's end zone and you score a touchdown.</p>
      ${fieldSvg({ span: [0, 100, metric() ? '100 yards (91 m)' : '100 yards'], label: '100 yards between the end zones' })}
      <h3>How points are scored</h3>
      <div class="lr-points">${[['6', 'Touchdown', 'Ball crosses into the end zone'], ['1-2', 'Try after a TD', 'Kick from the 15 for 1, or run/pass from the 2 for 2'], ['3', 'Field goal', 'Kick the ball through the uprights'], ['2', 'Safety', 'Defense tackles the ball carrier in his own end zone']].map(([n, a, b]) => html`<div class="lr-pt"><div class="num">${n}</div><div><div class="b">${a}</div><div class="meta">${b}</div></div></div>`)}</div>
      <h3>The clock</h3>
      <p>A game is four 15-minute quarters with a halftime break in the middle. The clock stops often (incomplete passes, timeouts, players running out of bounds), so a game takes about three hours. If it's tied after 60 minutes, teams play a 10-minute overtime in the regular season.</p>`,
    quiz: [['How many points is a touchdown worth (before the try)?', ['3', '6', '7'], 1], ['How many players does each team have on the field?', ['9', '11', '15'], 1], ['What is a field goal worth?', ['2', '3', '6'], 1]] },
  { id: 'downs', t: 'Downs & distance', sub: 'The four-tries rule everything is built on', mins: 3, lvl: 'Start here', ic: 'target',
    body: () => html`
      <p>The offense gets <b>four tries</b> (called <b>downs</b>) to move the ball ${yd(10)}. Make it, and you get a fresh set of four downs — a <b>first down</b>.</p>
      ${fieldSvg({ los: 35, fd: 45, notes: { los: 'Line of scrimmage', fd: 'First down' }, label: 'Line of scrimmage at the 35, first down at the 45' })}
      <p>On TV you'll see a blue line (where the play starts — the <b>line of scrimmage</b>) and a yellow line (the first-down marker).</p>
      <h3>Reading "3rd & 4"</h3>
      <p>The first number is the down; the second is how many yards are still needed. "3rd & 4" means it's the third try and 4 yards to go.</p>
      <h3>Why teams punt on 4th down</h3>
      <p>If the offense fails on 4th down, the other team takes over right there. So most teams <b>punt</b> (kick it far away) or try a <b>field goal</b> on 4th down. Going for it is a gamble coaches take more often today — usually on short distances.</p>`,
    quiz: [['How many yards must the offense gain for a new first down?', ['5', '10', '20'], 1], ['"2nd & 7" means…', ['2 yards to go on 7th down', 'Second try, 7 yards to go', '27 yards to the end zone'], 1], ['What is the yellow line on TV?', ['The first-down marker', 'The 50-yard line', 'Out of bounds'], 0]] },
  { id: 'positions', t: 'Who does what', sub: 'Positions on offense, defense & special teams', mins: 4, lvl: 'Start here', ic: 'users',
    body: () => html`
      ${formationSvg()}
      <h3>Offense</h3>
      <div class="lr-roles">${[['QB', 'Quarterback', 'Takes the snap, throws or hands off. The leader of the offense.'], ['RB', 'Running back', 'Carries the ball on running plays; catches short passes.'], ['WR', 'Wide receiver', 'Runs routes and catches passes.'], ['TE', 'Tight end', 'Part blocker, part receiver.'], ['OL', 'Offensive line', 'Five blockers (C, G, T) who protect the QB and open running lanes.']].map(([a, b, c]) => html`<div class="lr-role"><span class="lr-tag">${a}</span><div><div class="b">${b}</div><div class="meta">${c}</div></div></div>`)}</div>
      <h3>Defense</h3>
      <div class="lr-roles">${[['DL', 'Defensive line', 'Tackles and ends who rush the passer and stop the run.'], ['EDGE', 'Edge rusher', 'Pass rushers lined up outside — sack specialists.'], ['LB', 'Linebacker', 'Second level: tackles, blitzes, covers.'], ['CB', 'Cornerback', 'Covers wide receivers one-on-one.'], ['S', 'Safety', 'The last line of defense, deep in the secondary.']].map(([a, b, c]) => html`<div class="lr-role"><span class="lr-tag def">${a}</span><div><div class="b">${b}</div><div class="meta">${c}</div></div></div>`)}</div>
      <h3>Special teams</h3>
      <p>Kickers (K), punters (P), long snappers (LS) and returners take the field for kicks and punts.</p>`,
    quiz: [['Who usually throws the ball?', ['Tight end', 'Quarterback', 'Safety'], 1], ['A cornerback mostly…', ['Covers wide receivers', 'Snaps the ball', 'Kicks field goals'], 0], ['How many offensive linemen are there?', ['3', '5', '7'], 1]] },
  { id: 'season', t: 'The season & playoffs', sub: '18 weeks, 14 playoff teams, 1 Super Bowl', mins: 3, lvl: 'Start here', ic: 'trophy',
    body: () => html`
      <p>There are <b>32 teams</b> in two conferences — the <b>AFC</b> and <b>NFC</b> — each split into four divisions (East, North, South, West) of four teams.</p>
      <p>The regular season runs <b>18 weeks</b> from September to early January. Each team plays <b>17 games</b> and has one <b>bye week</b> off. You play your division rivals twice a year.</p>
      <h3>The playoffs</h3>
      <p>Seven teams per conference make it: the four division winners (seeds 1–4) plus three <b>Wild Cards</b> (seeds 5–7). Only the #1 seed gets a week off. Lose once and you're out.</p>
      ${bracketSvg()}
      <p class="mt12">The two conference champions meet in the <b>Super Bowl</b> in February. ${App.time.now() > Date.parse('2026-02-09T04:00:00Z') ? 'In February 2026 the Seattle Seahawks beat the New England Patriots 29–13 in Super Bowl LX.' : 'In February 2025 the Philadelphia Eagles beat the Kansas City Chiefs 40–22 in Super Bowl LIX.'}</p>
      <h3>The offseason</h3>
      <p>March brings <b>free agency</b> (players switch teams), April the <b>NFL Draft</b> (teams pick college players — worst record picks first), then summer camps and preseason in August.</p>`,
    quiz: [['How many teams make the playoffs in each conference?', ['6', '7', '8'], 1], ['How many regular-season games does each team play?', ['16', '17', '18'], 1], ['Who picks first in the NFL Draft?', ['The Super Bowl champion', 'The team with the worst record', 'A random team'], 1]] },
  { id: 'penalties', t: 'Penalties & signals', sub: 'Why the yellow flag just flew', mins: 4, lvl: 'Getting into it', ic: 'flag',
    body: () => html`
      <p>When a player breaks a rule, an official throws a yellow <b>flag</b>. Most penalties move the ball ${yd(5)}, ${yd(10)} or ${yd(15)} against the team that broke the rule. The other team can usually decline it if the play went better for them.</p>
      <div class="lr-sigs">${[['td', 'Touchdown', 'Both arms straight up.'], ['hold', 'Holding · 10 yds', 'Grabbing an opponent to block him. Gripping the wrist signal.'], ['false', 'False start · 5 yds', 'An offensive player moves before the snap.'], ['offside', 'Offside · 5 yds', 'A defender is across the line when the ball is snapped.'], ['pi', 'Pass interference', 'Illegal contact with a receiver while the ball is in the air. On defense: ball placed where the foul happened.'], ['incomplete', 'Incomplete pass', 'Arms swept across: no catch, clock stops.']].map(([k, a, b]) => html`<div class="lr-sig">${signalSvg(k)}<div><div class="b">${a}</div><div class="meta">${b}</div></div></div>`)}</div>
      <h3>See it happen</h3>
      <p>The four flags you'll see most, drawn from above. Offense in blue moves left to right; the player who breaks the rule turns red.</p>
      <div class="lr-pens">${PEN_ANIMS.map(([k, a, b]) => html`<figure class="lr-pen">${penAnim(k)}<figcaption><b>${a}</b><span>${b}</span></figcaption></figure>`)}</div>
      <h3>Replay review</h3>
      <p>Coaches can challenge some calls by throwing a red flag. Every scoring play and turnover is reviewed automatically by the replay booth.</p>`,
    quiz: [['A false start is called on…', ['The defense', 'The offense', 'The kicker only'], 1], ['What colour flag do officials throw for a penalty?', ['Red', 'Yellow', 'Blue'], 1], ['Defensive holding moves the ball…', ['5 yards', '10 yards', '15 yards'], 0]] },
  { id: 'scoreboard', t: 'Reading the scoreboard', sub: 'Decode the TV score bug in 10 seconds', mins: 2, lvl: 'Start here', ic: 'scores',
    body: () => html`
      ${scorebugSvg()}
      <p class="mt12">Every broadcast and this app's Game Center use the same building blocks: the teams and score, the quarter, the game clock, and the <b>down & distance</b>.</p>
      <h3>Other things you'll see</h3>
      <p><b>Timeouts</b>: three dots or bars under each team — each team gets three per half.<br><b>Possession</b>: a small marker next to the team with the ball.<br><b>Play clock</b>: a 40-second count to start the next play.<br><b>Red Zone</b>: the offense is inside the opponent's 20 — a good chance to score.</p>
      <h3>In this app</h3>
      <p>Tap any underlined term to get a plain-language explanation. Live games show <b>win probability</b> — each team's chance to win from this moment.</p>`,
    quiz: [['"4:12" on the scoreboard usually means…', ['Time left in the quarter', 'The score', 'Down & distance'], 0], ['How many timeouts does each team get per half?', ['2', '3', '5'], 1], ['The Red Zone is…', ['Inside the opponent\'s 20', 'The penalty box', 'The home sideline'], 0]] },
  { id: 'watch', t: 'How to watch a game', sub: 'What to look for, snap by snap', mins: 3, lvl: 'Getting into it', ic: 'eye',
    body: () => html`
      <p>A play lasts about 5 seconds; there are ~40 seconds between plays. Use that time like a fan in the stadium:</p>
      <ol class="lr-ol"><li><b>Check the down & distance.</b> 3rd & long? Expect a pass. 1st & 10 near the goal line? Could be a run.</li>
      <li><b>Watch the line first.</b> Most plays are won or lost by the big guys up front.</li>
      <li><b>Then follow the ball.</b> On replays, watch a different player each time — the receiver who got open, the defender who missed.</li>
      <li><b>Track the game situation.</b> Score + time left changes everything. Leading late? Teams run the ball to keep the clock moving.</li></ol>
      <h3>Watching from outside the US?</h3>
      <p>Kickoffs are shown in your own time zone throughout the app. Outside the US, NFL Game Pass on DAZN carries every game live. See <a class="accent b" data-go="#/international">NFL around the world</a>.</p>`,
    quiz: [['On 3rd & long, teams usually…', ['Run the ball', 'Pass the ball', 'Punt immediately'], 1], ['A leading team late in the game often runs the ball to…', ['Keep the clock running', 'Score faster', 'Avoid penalties'], 0], ['Roughly how long does a single play last?', ['5 seconds', '1 minute', '5 minutes'], 0]] },
  { id: 'rules2026', t: 'What\'s new in the rules', sub: 'The dynamic kickoff and other recent changes', mins: 3, lvl: 'Getting into it', ic: 'whistle',
    body: () => html`
      <p>The NFL tweaks its rules every year. A few recent changes you'll notice:</p>
      <h3>The dynamic kickoff (2024)</h3>
      <p>Kickoffs now look different: the kicking team lines up at the receiving team's 40-yard line and can't move until the ball is caught or hits the ground. The goal is more returns with fewer high-speed collisions.</p>
      <h3>Touchbacks moved to the 35 (2025)</h3>
      <p>A kickoff that goes into the end zone for a touchback now puts the ball at the 35-yard line, encouraging returns.</p>
      <h3>Overtime (2025)</h3>
      <p>In regular-season overtime, both teams are now guaranteed a possession even if the first team scores a touchdown — matching the playoff rule.</p>`,
    quiz: [['On the dynamic kickoff, the kicking team lines up at…', ['Its own 35', 'The receiving team\'s 40', 'Midfield'], 1], ['Since 2025, a kickoff touchback is placed at the…', ['20', '25', '35'], 2], ['In regular-season OT since 2025…', ['First score wins', 'Both teams get the ball', 'There is no OT'], 1]] },
  { id: 'analytics', t: 'Stats for super fans', sub: 'EPA, success rate & what really wins', mins: 5, lvl: 'Deep dive', ic: 'chart',
    body: () => html`
      <p>Box-score stats (yards, touchdowns) don't capture <i>when</i> things happen. Advanced stats do.</p>
      <h3>${UI.term('EPA', 'Expected Points Added (EPA)')}</h3>
      <p>Every spot on the field has an expected point value — 1st & 10 at your own 25 is worth about +1, at the opponent's 10 about +5. EPA is the change in that value on one play. A 3rd-down conversion might add +2; a sack might cost −1.5.</p>
      <h3>${UI.term('Success rate')}</h3>
      <p>The share of plays that kept the offense on schedule: 40% of the needed yards on 1st down, 60% on 2nd, all of it on 3rd or 4th. Great offenses sit above 48%.</p>
      <h3>Explosive plays</h3>
      <p>Passes of 20+ yards and runs of 10+. Few things correlate more with winning.</p>
      <p class="meta">The app's EPA numbers come from a simplified expected-points model applied to every real play since 2025 — good for comparisons, not an official stat.</p>
      <h3>A footnote on fantasy</h3>
      <p>Player pages also show season fantasy points (PPR: 1 per catch, 0.1 per yard, 6 per TD, 4 per passing TD) — handy context, never the headline.</p>`,
    quiz: [['A positive EPA play is good for…', ['The offense', 'The defense', 'The kicker only'], 0], ['A run of 12 yards counts as explosive?', ['Yes', 'No'], 0], ['Success on 1st & 10 requires at least…', ['2 yards', '4 yards', '10 yards'], 1]] },
];
const lessonById = id => LESSONS.find(l => l.id === id);
const done = () => store.p.learned || (store.p.learned = {});

/* ------------------------------------------------------------------ glossary (~60 extra terms) */
Object.assign(App.GLOSSARY, {
  'Audible': 'When the quarterback changes the play at the line of scrimmage after seeing the defense.',
  'Blitz': 'Sending extra defenders (linebackers or defensive backs) to rush the quarterback.',
  'Bootleg': 'The quarterback fakes a handoff and rolls out to the opposite side to pass or run.',
  'Challenge': 'A coach throws a red flag to ask officials to review a play on replay. Each coach gets two (a third if both succeed).',
  'Clock management': 'Using timeouts, sidelines and run/pass choices to control how much time is left.',
  'Completion': 'A forward pass caught by an offensive player.',
  'Cover 2': 'A zone defense with two safeties each covering a deep half of the field.',
  'Depth chart': 'A team\'s ranked list of who starts and who backs up at each position.',
  'Dime': 'A defense with six defensive backs, used against obvious passing situations.',
  'Draw play': 'A run disguised as a pass: the QB drops back, then hands off.',
  'Drive': 'A team\'s series of plays from when it gets the ball until it scores or gives it up.',
  'Dynamic kickoff': 'The kickoff format since 2024: coverage players line up at the receiving team\'s 40 and can\'t move until the ball is caught or lands.',
  'Encroachment': 'A defender crosses the line and touches an opponent before the snap. 5 yards.',
  'Fair catch': 'A returner waves his arm to catch a punt or kick without being hit — but can\'t run with it.',
  'Franchise tag': 'A one-year contract a team can use to keep a player from leaving in free agency.',
  'Free agency': 'The period (from March) when players whose contracts ended can sign with any team.',
  'Fumble': 'A ball carrier loses the ball before being down. Either team can recover it.',
  'Gap': 'The space between offensive linemen that runners aim for and defenders must fill.',
  'Hail Mary': 'A long, desperate pass into the end zone, usually at the end of a half.',
  'Hash marks': 'Two rows of lines near the middle of the field; every play starts on or between them.',
  'Holding': 'Illegally grabbing an opponent. 10 yards on the offense, 5 yards + automatic first down on the defense.',
  'Huddle': 'Players gather between plays to hear the next call.',
  'Injured reserve': 'A list for injured players; they must sit out at least four games before returning.',
  'Interception': 'A defender catches a pass meant for the offense — a turnover.',
  'Kneel down': 'The QB takes the snap and kneels to run out the clock.',
  'Line of scrimmage': 'The imaginary line where the ball is placed at the start of each play.',
  'Man coverage': 'Each defender is responsible for one specific receiver.',
  'Neutral zone': 'The length of the ball between the offense and defense before the snap.',
  'Nickel': 'A defense with five defensive backs — the most common look in today\'s NFL.',
  'Offside': 'A defender is beyond the line of scrimmage when the ball is snapped. 5 yards.',
  'Onside kick': 'A short kickoff the kicking team tries to recover itself. Teams must declare it in advance.',
  'Option': 'A play where the QB decides after the snap whether to keep, hand off or pitch.',
  'Pass interference': 'Illegal contact with a receiver while a pass is in the air.',
  'Play action': 'A pass play that starts with a fake handoff to freeze the defense.',
  'Pick six': 'An interception returned for a touchdown.',
  'Pocket': 'The protected area the offensive line forms around the quarterback.',
  'Punt': 'A kick on (usually) 4th down to push the other team back.',
  'Read option': 'The QB reads one defender and either hands off or keeps it based on what that defender does.',
  'Redshirt': 'A college term: a year a player practises but doesn\'t play, keeping eligibility.',
  'Return': 'Running back a kickoff, punt, interception or fumble.',
  'Rookie': 'A player in his first NFL season.',
  'RPO': 'Run-pass option: the QB decides after the snap whether to hand off or throw.',
  'Sack': 'Tackling the quarterback behind the line of scrimmage before he can throw.',
  'Salary cap': 'The maximum each team can spend on player salaries in a season.',
  'Screen pass': 'A short pass behind the line, with blockers set up in front of the receiver.',
  'Secondary': 'The defensive backs: cornerbacks and safeties.',
  'Shotgun': 'The QB lines up several yards behind the center instead of directly under him.',
  'Slot': 'The area between the outside receiver and the offensive line; a slot receiver lines up there.',
  'Snap': 'The center passes the ball back to start the play.',
  'Special teams': 'The units on the field for kicks, punts and returns.',
  'Spike': 'The QB throws the ball into the ground right after the snap to stop the clock.',
  'Strip sack': 'A sack where the defender also knocks the ball loose.',
  'Tackle for loss': 'Tackling a ball carrier behind the line of scrimmage.',
  'Third-down conversion': 'Gaining a first down on a 3rd-down play. Conversion rate is a key efficiency stat.',
  'Time of possession': 'How long a team had the ball during the game.',
  'Timeout': 'A clock stoppage a team can call; three per half.',
  'Two-point conversion': 'After a touchdown, running or passing into the end zone from the 2 for 2 points.',
  'Waivers': 'When a team releases a player, other teams can claim him in reverse standings order.',
  'Zone coverage': 'Defenders cover areas of the field rather than specific receivers.',
  'Trick play': 'Any play designed to fool the defense: flea flicker, reverse, fake punt.',
});

/* ------------------------------------------------------------------ routes */
App.route('learn', () => {
  const D = done(), n = LESSONS.filter(l => D[l.id]).length;
  const isNew = store.p.level === 'new';
  const next = LESSONS.find(l => !D[l.id]);
  const groups = ['Start here', 'Getting into it', 'Deep dive'];
  return {
    title: 'Learn',
    html: html`
      <div class="lr-hero pad">
        <span class="lr-eb">Learn the game</span>
        <div class="lr-t">FOOTBALL 101</div>
        <p>Short lessons that make every Sunday make sense. No jargon left unexplained.</p>
        <div class="lr-lad">${LESSONS.map(l => html`<i class="${D[l.id] ? 'on' : ''}"></i>`)}</div>
        <div class="lr-f"><div><b>${n === LESSONS.length ? 'Course complete' : `${n} of ${LESSONS.length} lessons`}</b><span>${n === LESSONS.length ? 'You\'ve earned the Student of the Game badge.' : next ? `Next: ${next.t} · ${next.mins} min` : ''}</span></div>
          ${next ? html`<button class="btn primary sm" data-go="#/learn/${next.id}">${n ? 'Continue' : 'Start'}</button>` : ''}</div>
      </div>
      <div class="pad mt16"><div class="row tap lr-toggle" data-act="lr-tips" style="border-radius:var(--r-lg);background:var(--surface)">${icon('help')}<div class="row-main"><div class="row-title">Explain as I watch</div><div class="row-sub">Plain-language tips on scores, games & stats</div></div>${UI.toggle(isNew || !!store.p.learnTips, 'lr-tips')}</div></div>
      ${groups.map(gname => html`<div class="sec">${UI.secHead(gname)}<div class="list">${LESSONS.filter(l => l.lvl === gname).map(l => UI.row({
        left: html`<div class="lr-ic ${D[l.id] ? 'done' : ''}">${icon(D[l.id] ? 'check' : l.ic, 'sm')}</div>`,
        title: l.t, sub: `${l.sub} · ${l.mins} min`, right: D[l.id] ? html`<span class="tiny num">${D[l.id]}/3</span>` : '', go: `#/learn/${l.id}` }))}</div></div>`)}
      <div class="sec">${UI.secHead('Look it up')}<div class="list">
        ${UI.row({ left: html`<div class="lr-ic">${icon('book', 'sm')}</div>`, title: 'Glossary', sub: `${Object.keys(App.GLOSSARY).length} terms, from "audible" to "zone coverage"`, go: '#/glossary' })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('globe', 'sm')}</div>`, title: 'Watching from outside the US', sub: 'Local kickoff times, Game Pass, fan clubs', go: '#/international' })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('translate', 'sm')}</div>`, title: 'Language', sub: 'English · Español · Deutsch · Português · Français · 日本語', go: '#/settings/language' })}
      </div></div>
      <div class="pad mt24 tiny center">Complete a lesson quiz to earn up to 30 fan points.</div>`,
  };
});

App.route('learn/:id', (params, query, page) => {
  const L = lessonById(params.id);
  if (!L) return { title: 'Lesson', html: UI.empty('book', 'Lesson not found') };
  const st = page.state = page.state || { ans: {} };
  const idx = LESSONS.indexOf(L), nextL = LESSONS[idx + 1];
  const D = done();
  const answered = Object.keys(st.ans).length;
  const correct = L.quiz.filter((q, i) => st.ans[i] === q[2]).length;
  return {
    title: L.t,
    html: html`
      <div class="pad-all">
        <div class="eyebrow">${L.lvl} · ${L.mins} min read</div>
        <div class="h1 mt8" style="font-size:28px">${L.t}</div>
        <div class="meta mt6">${L.sub}</div>
      </div>
      <div class="pad lr-body article-body">${L.body()}</div>
      <div class="sec">${UI.secHead('Quick check')}
        <div class="cards">${L.quiz.map(([q, opts, c], i) => html`<div class="card cpad">
          <div class="tiny">Question ${i + 1} of 3</div><div class="h4 mt6">${q}</div>
          <div class="col gap8 mt12">${opts.map((o, j) => {
            const a = st.ans[i]; const cls = a == null ? '' : j === c ? 'right' : a === j ? 'wrong' : 'dim';
            return html`<button class="lr-opt ${cls}" data-act="lr-ans" data-arg="${i}:${j}" ${a != null ? raw('disabled') : ''}>${o}${a != null && j === c ? icon('check', 'sm') : ''}</button>`;
          })}</div></div>`)}</div>
        ${answered === 3 ? html`<div class="pad mt16"><div class="card cpad center">
          <div class="big-num">${correct}/3</div><div class="b mt6">${correct === 3 ? 'Perfect. You\'re a natural.' : correct === 2 ? 'Nice work.' : 'Good start — the next one will click.'}</div>
          <div class="meta mt6">+${correct * 10} fan points${D[L.id] && st.awarded === false ? ' (already earned for this lesson)' : ''}</div>
          ${nextL ? html`<button class="btn primary block mt16" data-go="#/learn/${nextL.id}">Next: ${nextL.t}</button>` : html`<button class="btn primary block mt16" data-go="#/learn">Back to Football 101</button>`}
          <button class="btn ghost block mt8" data-act="lr-retry">Try again</button></div></div>` : ''}
      </div>`,
  };
});

App.route('glossary', (params, query, page) => {
  const terms = Object.keys(App.GLOSSARY).sort((a, b) => a.localeCompare(b));
  const list = q => {
    const f = terms.filter(t => !q || t.toLowerCase().includes(q) || App.GLOSSARY[t].toLowerCase().includes(q));
    if (!f.length) return UI.empty('search', 'No matching terms', 'Try a shorter word.');
    const by = {};
    f.forEach(t => (by[t[0].toUpperCase()] = by[t[0].toUpperCase()] || []).push(t));
    return html`${Object.keys(by).sort().map(k => html`<div class="lr-letter">${k}</div><div class="list">${by[k].map(t => html`<div class="row static lr-term" style="align-items:flex-start"><div class="row-main"><div class="row-title">${t}</div><div class="row-sub" style="line-height:1.45">${App.GLOSSARY[t]}</div></div></div>`)}</div>`)}`;
  };
  return {
    title: 'Glossary',
    sub: html`<div class="pad" style="padding-bottom:10px"><label class="search-field">${icon('search', 'sm')}<input type="search" placeholder="Search ${terms.length} terms" class="lr-q" autocomplete="off"></label></div>`,
    html: html`<div class="lr-gl">${list('')}</div>`,
    mount(el) {
      const inp = el.querySelector('.lr-q'), box = el.querySelector('.lr-gl');
      inp.addEventListener('input', () => { box.innerHTML = App.val(list(inp.value.trim().toLowerCase())); });
    },
  };
});

/* ------------------------------------------------------------------ actions */
const A = App.actions;
A['lr-ans'] = (el, ev, arg) => {
  const page = App.current(); const [i, j] = arg.split(':').map(Number);
  const st = page.state; if (st.ans[i] != null) return;
  st.ans[i] = j;
  const L = lessonById(page.params.id);
  if (Object.keys(st.ans).length === 3) {
    const correct = L.quiz.filter((q, k) => st.ans[k] === q[2]).length;
    const D = done();
    if (!D[L.id]) {
      D[L.id] = correct; store.p.points += correct * 10; st.awarded = true;
      if (LESSONS.every(l => D[l.id]) && !store.p.badges.includes('student')) store.p.badges.push('student');
      if (!store.p.badges.includes('learner')) store.p.badges.push('learner');
      store.save();
      if (correct) App.toast({ title: `+${correct * 10} fan points`, body: `Lesson complete: ${L.t}`, icon: 'check' });
    } else { st.awarded = false; D[L.id] = Math.max(D[L.id], correct); store.save(); }
  }
  App.refresh();
};
A['lr-retry'] = () => { const page = App.current(); page.state = { ans: {} }; App.refresh(); page.el.querySelector('.sec')?.scrollIntoView({ behavior: 'smooth' }); };
A['lr-tips'] = () => { store.p.learnTips = !(store.p.learnTips || store.p.level === 'new'); if (store.p.level === 'new' && !store.p.learnTips) store.p.level = 'casual'; store.save(); App.toast({ title: store.p.learnTips ? 'Explainers on' : 'Explainers off', icon: 'help' }); App.refresh(); };

App.LEARN = { LESSONS, penAnim, PEN_ANIMS };
})();
