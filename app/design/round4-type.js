/* Approvals round 4 · text roles. One card per KIND of content (tricode, score, record, clock…), drawn from the
   crawl in app/design/audit-data.js (node _build/audit.mjs regenerates it). Current lists every way the app sets
   that content today, with how often and where (tap a place to see it on the phone); Proposed is one face for the
   role at every size, so the same thing always looks the same. The pick is applied everywhere, built pieces included. */
(function () {
'use strict';
const { S, esc, none } = DSApprovals.h;
const A = () => (window.DS_AUDIT || {}).roles || {};
const FAM = { 'APD C': 'Display C', 'AP Sans': 'Sans', 'AP Stats': 'Stats' };
const CSSF = { 'APD C': 'var(--display)', 'AP Sans': 'var(--sans)', 'AP Stats': 'var(--stats)' };
const label = v => `${FAM[v.family] || v.family} ${v.weight}${v.style === 'italic' ? ' italic' : ''}${v.transform === 'uppercase' ? ' caps' : ''}`;
/* a class chain "span < div.tk-row < a.tap" becomes ".tk-row", the first classed element, for the phone's outline */
const selOf = chain => { const c = (chain || '').split(' < ').find(x => x.includes('.')); return c ? '.' + c.split('.').slice(1).join('.') : ''; };
const routeOf = r => (r || '').replace(/^\[[^\]]*\]\s*/, '');
const sizeTop = v => (v.sizes || []).slice().sort((a, b) => b.n - a.n)[0] || { px: 14 };

/** every way the app sets this role today: a sample in that exact style, count, sizes, and where (tap to show) */
function found(role, sample) {
  const r = A()[role]; if (!r) return none('Run node _build/audit.mjs to crawl the app.');
  const vs = r.variants.filter(v => v.count >= 2);
  return `<p class="r4t-sum"><b>${vs.length} ways</b> across ${r.total} uses · ${[...new Set(vs.map(v => FAM[v.family] || v.family))].join(', ')}</p>` +
    vs.map(v => { const sz = sizeTop(v);
      const where = [...new Map(v.examples.map(e => [routeOf(e.route).split('?')[0].split('/')[0] + selOf(e.chain), e])).values()].slice(0, 4);
      return `<div class="r4t-v"><span class="r4t-s" style="font-family:${CSSF[v.family] || 'inherit'};font-weight:${v.weight};font-style:${v.style};text-transform:${v.transform};font-size:${Math.min(sz.px, 34)}px">${esc(v.examples[0] ? v.examples[0].text : sample)}</span>
        <div class="r4t-m"><b>${label(v)}</b><span>${v.count}× · ${(v.sizes || []).slice(0, 4).map(s => s.px + 'px').join(', ')}</span>
        <div class="r4t-w">${where.map(e => `<button data-ap-go="${esc(routeOf(e.route))}" data-ap-sel="${esc(selOf(e.chain))}">${esc(routeOf(e.route).replace(/\/\d{6,}/, '/game'))} <i>${esc(selOf(e.chain))}</i></button>`).join('')}</div></div></div>`; }).join('');
}

/* the scale every option is shown at, so a pick is judged in a hero, a card, a row and a table at once */
const SCALE = [['Hero', 44], ['Card', 22], ['Row', 15], ['Table', 13]];
const F = {
  display: { n: 'Display C italic', css: 'font-family:var(--display);font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:.02em' },
  stats: { n: 'Stats bold', css: 'font-family:var(--stats);font-weight:700;font-variant-numeric:tabular-nums' },
  statsM: { n: 'Stats medium', css: 'font-family:var(--stats);font-weight:500;font-variant-numeric:tabular-nums' },
  statsCaps: { n: 'Stats bold caps', css: 'font-family:var(--stats);font-weight:700;text-transform:uppercase;letter-spacing:.06em' },
  sans: { n: 'Sans bold', css: 'font-family:var(--sans);font-weight:700' },
  sansCaps: { n: 'Sans bold caps', css: 'font-family:var(--sans);font-weight:700;text-transform:uppercase;letter-spacing:.06em' },
  sansM: { n: 'Sans medium', css: 'font-family:var(--sans);font-weight:500' },
};
const scale = (f, text, sizes = SCALE) => `<div class="r4t-scale">${sizes.map(([n, px]) => `<div><span class="r4t-k">${n} · ${px}px</span><span style="${F[f].css};font-size:${px}px;line-height:1.05">${esc(text)}</span></div>`).join('')}</div>`;
/** an option per face; its note says where it already appears and what changes */
const opt = (k, f, note) => ({ k, name: F[f].n, note, f });

const ROLES = [
  { id: 'type-tricode', role: 'tricode', name: 'Tricode (KC, DEN)', text: 'KC',
    why: 'Tricodes are set in all three typefaces today: Display in heroes and standings, Sans in the ticker, scores and box score, Stats in leader tables.',
    options: [opt('a', 'display', 'Like the heroes, tabs and the approved team tiles. A tricode is a team\'s short name, so it reads as a name.'),
      opt('b', 'statsCaps', 'Like a broadcast scoreboard: the same face as the score beside it. Strong in tables, quieter in heroes.'),
      opt('c', 'sansCaps', 'The plain UI face. Most uses today are already Sans; heroes would lose their Display tricodes.')] },
  { id: 'type-score', role: 'score', name: 'Score', text: '31',
    why: 'Scores are Display italic on cards and heroes but Stats in tables, rows, drives and multiview, in four weights.',
    options: [opt('a', 'display', 'Display everywhere, tables included. The score is the moment number of a game.'),
      opt('b', 'stats', 'Stats bold everywhere, heroes included: the scoreboard face, tabular so digits line up.')] },
  { id: 'type-team-name', role: 'team-name', name: 'Team name (Chiefs)', text: 'Chiefs',
    why: 'Team names are mostly Sans in four weights (400 to 700), and Display italic in the fan header, catch-up and scores cards.',
    options: [opt('a', 'display', 'Display everywhere, like the approved standings names and team tiles. Rows get louder.'),
      opt('b', 'sans', 'Sans bold everywhere; Display is kept for tricodes and scores, so a hero says KC big and Chiefs small.')] },
  { id: 'type-record', role: 'record', name: 'Record (4-0)', text: '4-0',
    why: 'Records are set ten ways: Stats in three weights, Sans in two, and Display italic on the team and You pages.',
    options: [opt('a', 'statsM', 'Stats medium everywhere: a record is a stat. Digits line up in standings and rows.'),
      opt('b', 'sansM', 'Sans medium, like the rest of the metadata line it usually sits in.')] },
  { id: 'type-clock', role: 'clock-status', name: 'Game clock and status (4th 3:18, Final)', text: '4th 3:18',
    why: 'The clock and status are set twelve ways: Sans in three weights, caps and not, Stats 600 and 700, and Display in places.',
    options: [opt('a', 'statsCaps', 'Stats bold caps, the same as the approved status pills (Live, Final), so the clock and its pill match.'),
      opt('b', 'sans', 'Sans bold, sentence case. Reads as text; the pill stays the only Stats caps thing.')] },
  { id: 'type-down', role: 'down-distance', name: 'Down and distance (1st & 10)', text: '1st & 10 at KC 35',
    why: 'Down and distance is Sans 800 caps on most surfaces, Display italic caps on the Watch card, and Sans 400 elsewhere.',
    options: [opt('a', 'statsCaps', 'Stats bold caps: it is game data, like the clock.'),
      opt('b', 'sans', 'Sans bold, sentence case: it is read like a sentence.')] },
  { id: 'type-date', role: 'date', name: 'Date and kickoff time (Sun, Oct 18 · 4:25 PM)', text: 'Sun, Oct 18 · 4:25 PM',
    why: 'Dates are Sans 400, 500 and 700 caps, and Stats in places.',
    options: [opt('a', 'sansM', 'Sans medium (the Meta role) everywhere. Kickoff times in heroes stay Display only as the hero\'s moment number.'),
      opt('b', 'statsM', 'Stats medium: the same face as the clock once the game starts.')] },
  { id: 'type-player', role: 'player-name', name: 'Player name', text: 'Patrick Mahomes',
    why: 'Player names are Sans in three weights (500, 600, 700).',
    options: [opt('a', 'sans', 'Sans bold (Title S at row size), the same as other names you can tap.'),
      opt('b', 'sansM', 'Sans medium; the stat beside the name carries the weight.')] },
  { id: 'type-stat', role: 'stat-number', name: 'Stat number (29.5, 44%)', text: '29.5',
    why: 'Stat numbers are Stats in 500, 600 and 700, plus Display in tiles and heroes.',
    options: [opt('a', 'stats', 'Stats bold, tabular, everywhere. Big moment numbers on heroes stay Display (they are the hero\'s one number).'),
      opt('b', 'statsM', 'Stats medium, tabular; bold only for the leader in a comparison.')] },
  { id: 'type-eyebrow', role: 'eyebrow', name: 'Eyebrow (NEXT UP · WEEK 6)', text: 'Next up · Week 6',
    why: 'Eyebrows are Sans 700 caps in most places, Sans 800 caps in some, and Display italic caps in 121 places.',
    options: [opt('a', 'sansCaps', 'The approved Eyebrow role (Sans bold caps, tracked) everywhere. The Display ones were section heads in disguise.')] },
  { id: 'type-button', role: 'button-label', name: 'Button label', text: 'Where to watch',
    why: 'Button labels are Sans 700 per the approved controls, but 15 variants exist (Sans 500 and 600 labels, Display labels on a few).',
    options: [opt('a', 'sans', 'Sans bold, the approved controls (option A), with no exceptions.')] },
  { id: 'type-initials', role: 'avatar-initials', name: 'Avatar initials (when there is no photo)', text: 'PM',
    why: 'Initials are Display 800 upright, which is not an approved type role, and Sans 800 in a few places.',
    options: [opt('a', 'sansCaps', 'Sans bold caps, like a label.'), opt('b', 'display', 'Display italic, like a tricode.')] },
];

/* found by the crawl after the first picks were built: page titles (the header of every pushed page) */
ROLES.push({ id: 'type-page-title', role: 'page-title', name: 'Page title (the header of a page you open)', text: 'Standings',
  why: 'Page titles are Sans 700 on most pages (Standings, Settings), Sans 500 on some, and Display italic on a few (the team page header turned Display when team names did). One header should look the same on every page.',
  options: [opt('a', 'sans', 'Sans bold, like most pages today. A team page says Kansas City Chiefs in Sans in its header; the hero below carries the Display name.'),
    opt('b', 'display', 'Display italic caps on every page header, like the tab-page titles (WATCH).')] });
/* built: their picks are locked app-wide by app/css/roles.css (node _build/roles.mjs); only open ones are cards */
const BUILT_T = ['type-tricode', 'type-score', 'type-team-name', 'type-record', 'type-clock', 'type-down', 'type-date', 'type-player', 'type-stat', 'type-eyebrow', 'type-button', 'type-initials'];
const card = R => ({ id: R.id, v: 1, tier: 'Atoms · text roles', name: R.name, target: `every ${R.role} in the app`,
  ctx: (() => { const v = (A()[R.role] || { variants: [] }).variants[1] || (A()[R.role] || { variants: [] }).variants[0]; const e = v && v.examples[0]; return e ? [routeOf(e.route), selOf(e.chain)] : ['home', '']; })(),
  changes: [R.why, 'Pick one face for this kind of content. It is then used at every size, from heroes to tables, and every place listed under Current is changed to it, including pieces you already approved.', 'Size still changes with the place (hero, card, row, table); only the face, weight and case are fixed.'],
  current: () => found(R.role, R.text),
  // one face on offer means nothing to pick: it is a plain Proposed, with its note on top
  ...(R.options.length > 1 ? { options: R.options.map(o => ({ k: o.k, name: o.name, note: o.note })) } : { note: `${R.options[0].name}: ${R.options[0].note}` }),
  proposed: k => { const o = R.options.find(x => x.k === k) || R.options[0]; return scale(o.f, R.text); } });

DSApprovals.add(4, ROLES.filter(R => !BUILT_T.includes(R.id) && R.id !== 'type-page-title').map(card));

/* tap a place under Current to show that exact element on the phone */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ap-go]'); if (!b) return;
  DSApprovals.ctxPost({ dsGo: b.dataset.apGo, hl: b.dataset.apSel });
  const n = document.querySelector('[data-ap-ctx-n]'); if (n) n.textContent = b.textContent;
  document.querySelectorAll('[data-ap-go].on').forEach(x => x.classList.remove('on')); b.classList.add('on');
});
})();
