/* ============================================================================
   Fan life — tickets, wallet, stadiums + stadium mode, passport, road trips,
   shop with jersey builder, NFL around the world.
   Routes: tickets, tickets/:gid, wallet, stadiums, stadium/:tid, passport,
           trip/:gid, shop, shop/:tid, international
   Prices, hotels, menus and wait times are prototype content.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, esc, store, fmt, time } = App;
const UI = App.UI, Dt = App.data;

function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let x = hash(seed) || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }; }
const team = id => Dt.team(id);
const award = id => App.COMMUNITY && App.COMMUNITY.award(id);

/* ------------------------------------------------------------------ stadium facts (authored, 2026 season)
   key: team abbr → [name, city, opened, capacity, roof, surface, lat, lon, tz, transit, food] */
const ST = {
  ARI: ['State Farm Stadium', 'Glendale, AZ', 2006, 63400, 'Retractable', 'Grass (roll-out tray)', 33.5276, -112.2626, 'America/Phoenix', 'Valley Metro bus routes plus game-day shuttles from Westgate; most fans drive.', 'Sonoran hot dogs'],
  ATL: ['Mercedes-Benz Stadium', 'Atlanta, GA', 2017, 71000, 'Retractable', 'Artificial turf', 33.7554, -84.4008, 'America/New_York', 'MARTA to Vine City or GWCC/CNN Center — the easiest ride in the league.', 'Famously low "fan-first" concession prices'],
  BAL: ['M&T Bank Stadium', 'Baltimore, MD', 1998, 71008, 'Open air', 'Grass', 39.2780, -76.6227, 'America/New_York', 'Light RailLink to Stadium/Federal Hill; walkable from the Inner Harbor.', 'Crab cakes & Old Bay fries'],
  BUF: ['Highmark Stadium', 'Orchard Park, NY', 2026, 62000, 'Open air (canopy)', 'Artificial turf', 42.7738, -78.7870, 'America/New_York', 'Drive and tailgate — it\'s a Bills Mafia tradition. Shuttles from Buffalo on game days.', 'Wings, beef on weck'],
  CAR: ['Bank of America Stadium', 'Charlotte, NC', 1996, 74867, 'Open air', 'Artificial turf', 35.2258, -80.8528, 'America/New_York', 'LYNX Blue Line to Stonewall or Carson; walkable from Uptown.', 'Carolina BBQ'],
  CHI: ['Soldier Field', 'Chicago, IL', 1924, 61500, 'Open air', 'Grass', 41.8623, -87.6167, 'America/Chicago', 'CTA Red/Orange/Green to Roosevelt, then a 15-minute lakefront walk. Metra Electric to Museum Campus.', 'Italian beef, Chicago dogs'],
  CIN: ['Paycor Stadium', 'Cincinnati, OH', 2000, 65515, 'Open air', 'Artificial turf', 39.0954, -84.5160, 'America/New_York', 'Walk from downtown or The Banks; Cincinnati Connector streetcar nearby.', 'Skyline chili'],
  CLE: ['Huntington Bank Field', 'Cleveland, OH', 1999, 67431, 'Open air', 'Grass', 41.5061, -81.6995, 'America/New_York', 'RTA Waterfront Line to Stadium; tailgate in the Muni Lot.', 'Polish Boy sandwiches'],
  DAL: ['AT&T Stadium', 'Arlington, TX', 2009, 80000, 'Retractable', 'Artificial turf', 32.7473, -97.0945, 'America/Chicago', 'No rail in Arlington — park or use rideshare zones; arrive early, the lots are huge.', 'Brisket & Tex-Mex'],
  DEN: ['Empower Field at Mile High', 'Denver, CO', 2001, 76125, 'Open air', 'Grass', 39.7439, -105.0201, 'America/Denver', 'RTD light rail (E/W lines) to Empower Field at Mile High station.', 'Rocky Mountain green chile'],
  DET: ['Ford Field', 'Detroit, MI', 2002, 65000, 'Dome', 'Artificial turf', 42.3400, -83.0456, 'America/Detroit', 'Walkable from downtown; QLine streetcar and People Mover stop close by.', 'Coney dogs'],
  GB: ['Lambeau Field', 'Green Bay, WI', 1957, 81441, 'Open air', 'Grass (hybrid)', 44.5013, -88.0622, 'America/Chicago', 'Drive and tailgate in the neighbourhood lots; Titletown district shuttles.', 'Brats & cheese curds'],
  HOU: ['NRG Stadium', 'Houston, TX', 2002, 72220, 'Retractable', 'Artificial turf', 29.6847, -95.4107, 'America/Chicago', 'METRORail Red Line to Stadium Park/Astrodome.', 'Texas BBQ'],
  IND: ['Lucas Oil Stadium', 'Indianapolis, IN', 2008, 67000, 'Retractable', 'Artificial turf', 39.7601, -86.1639, 'America/Indiana/Indianapolis', 'Walkable from downtown hotels via skywalks.', 'Pork tenderloin sandwiches'],
  JAX: ['EverBank Stadium', 'Jacksonville, FL', 1995, 67814, 'Open air', 'Grass', 30.3239, -81.6373, 'America/New_York', 'Skyway and water taxis from the Southbank; lots of tailgating in Lot J. Stadium renovation underway.', 'Fried shrimp'],
  KC: ['GEHA Field at Arrowhead Stadium', 'Kansas City, MO', 1972, 76416, 'Open air', 'Grass', 39.0489, -94.4839, 'America/Chicago', 'Drive — tailgating opens 3.5 hours before kickoff. KC Streetcar doesn\'t reach the Truman Sports Complex.', 'Kansas City BBQ, burnt ends'],
  LV: ['Allegiant Stadium', 'Las Vegas, NV', 2020, 65000, 'Dome', 'Grass (tray)', 36.0909, -115.1833, 'America/Los_Angeles', 'Walk from the south Strip over the Hacienda bridge; rideshare lots west of I-15.', 'Strip-style everything'],
  LAC: ['SoFi Stadium', 'Inglewood, CA', 2020, 70240, 'Covered (open sides)', 'Artificial turf', 33.9535, -118.3392, 'America/Los_Angeles', 'Metro K Line to Downtown Inglewood or the C Line to Hawthorne/Lennox, then the free shuttle.', 'LA tacos'],
  LAR: ['SoFi Stadium', 'Inglewood, CA', 2020, 70240, 'Covered (open sides)', 'Artificial turf', 33.9535, -118.3392, 'America/Los_Angeles', 'Metro K Line to Downtown Inglewood or the C Line to Hawthorne/Lennox, then the free shuttle.', 'LA tacos'],
  MIA: ['Hard Rock Stadium', 'Miami Gardens, FL', 1987, 65326, 'Open air (canopy)', 'Grass', 25.9580, -80.2389, 'America/New_York', 'Brightline/Tri-Rail connections plus game-day shuttles; most fans drive.', 'Cuban sandwiches'],
  MIN: ['U.S. Bank Stadium', 'Minneapolis, MN', 2016, 66860, 'Fixed roof', 'Artificial turf', 44.9737, -93.2581, 'America/Chicago', 'METRO Blue & Green lines stop at U.S. Bank Stadium station.', 'Juicy Lucy burgers'],
  NE: ['Gillette Stadium', 'Foxborough, MA', 2002, 65878, 'Open air', 'Artificial turf', 42.0909, -71.2643, 'America/New_York', 'MBTA game-day train from Boston South Station and Providence.', 'Lobster rolls, clam chowder'],
  NO: ['Caesars Superdome', 'New Orleans, LA', 1975, 73208, 'Dome', 'Artificial turf', 29.9511, -90.0812, 'America/Chicago', 'Walk from the CBD and French Quarter; streetcar on Loyola Ave.', 'Po\'boys & gumbo'],
  NYG: ['MetLife Stadium', 'East Rutherford, NJ', 2010, 82500, 'Open air', 'Artificial turf', 40.8135, -74.0745, 'America/New_York', 'NJ Transit Meadowlands Rail Line via Secaucus Junction, or Coach USA bus from Port Authority.', 'Jersey-style pork roll'],
  NYJ: ['MetLife Stadium', 'East Rutherford, NJ', 2010, 82500, 'Open air', 'Artificial turf', 40.8135, -74.0745, 'America/New_York', 'NJ Transit Meadowlands Rail Line via Secaucus Junction, or Coach USA bus from Port Authority.', 'Jersey-style pork roll'],
  PHI: ['Lincoln Financial Field', 'Philadelphia, PA', 2003, 69796, 'Open air', 'Grass', 39.9008, -75.1675, 'America/New_York', 'SEPTA Broad Street Line to NRG Station — it drops you at the stadium complex.', 'Cheesesteaks & soft pretzels'],
  PIT: ['Acrisure Stadium', 'Pittsburgh, PA', 2001, 68400, 'Open air', 'Grass', 40.4468, -80.0158, 'America/New_York', 'The T to Allegheny station (free downtown); walk across the bridges from downtown.', 'Primanti-style sandwiches with fries inside'],
  SF: ['Levi\'s Stadium', 'Santa Clara, CA', 2014, 68500, 'Open air', 'Grass', 37.4030, -121.9700, 'America/Los_Angeles', 'VTA light rail to Great America; Caltrain to Mountain View then VTA; ACE & Capitol Corridor on game days.', 'Garlic fries'],
  SEA: ['Lumen Field', 'Seattle, WA', 2002, 68740, 'Open air (partial roof)', 'Artificial turf', 47.5952, -122.3316, 'America/Los_Angeles', 'Link light rail to Stadium or International District; Sounder trains on game days.', 'Ivar\'s fish & chips'],
  TB: ['Raymond James Stadium', 'Tampa, FL', 1998, 65618, 'Open air', 'Grass', 27.9759, -82.5033, 'America/New_York', 'Park on site or use rideshare; HART runs game-day routes.', 'Cuban sandwiches'],
  TEN: ['Nissan Stadium', 'Nashville, TN', 1999, 69143, 'Open air', 'Artificial turf', 36.1665, -86.7713, 'America/Chicago', 'Walk across the John Seigenthaler pedestrian bridge from Broadway. A new stadium opens in 2027.', 'Hot chicken'],
  WAS: ['Northwest Stadium', 'Landover, MD', 1997, 67617, 'Open air', 'Grass', 38.9078, -76.8645, 'America/New_York', 'Metro Blue/Silver to Morgan Boulevard, then a 20-minute walk.', 'Half-smokes'],
};
/** authored stadium facts by team abbr (also used by the game page's pregame scene) */
const stad = App.stadium = abbr => ST[abbr] && { name: ST[abbr][0], city: ST[abbr][1], opened: ST[abbr][2], cap: ST[abbr][3], roof: ST[abbr][4], surface: ST[abbr][5], lat: ST[abbr][6], lon: ST[abbr][7], tz: ST[abbr][8], transit: ST[abbr][9], food: ST[abbr][10] };
/** venue photo: from the team's venue record, or any game played at that stadium */
function venueImg(tm) {
  const s = stad(tm.abbr);
  if (tm.venue && tm.venue.img && tm.venue.name && s && (tm.venue.name === s.name || s.name.includes(tm.venue.name))) return tm.venue.img;
  const g = Dt.D.games.find(x => x.vn === s.name && x.v);
  return g ? `https://a.espncdn.com/i/venues/nfl/day/${g.v}.jpg` : (tm.venue && tm.venue.img);
}
/** one entry per physical stadium (MetLife & SoFi are shared) */
function venues() {
  const seen = new Set(), out = [];
  Dt.D.teams.forEach(t => {
    const s = stad(t.abbr); if (!s || seen.has(s.name)) return; seen.add(s.name);
    out.push({ t, s, teams: Dt.D.teams.filter(x => stad(x.abbr).name === s.name) });
  });
  return out;
}
function miles(a, b) {
  const R = 3959, r = x => x * Math.PI / 180;
  const dLat = r(b[0] - a[0]), dLon = r(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
function tv(tm) { return App.teamVars(tm); }
const COUNTRY_XY = { CA: [43.65, -79.38], MX: [19.43, -99.13], GB: [51.51, -0.13], IE: [53.35, -6.26], DE: [50.11, 8.68], AT: [48.21, 16.37], ES: [40.42, -3.70], FR: [48.86, 2.35], BR: [-23.55, -46.63], AU: [-33.87, 151.21], JP: [35.68, 139.69] };
function homeCoords() {
  const cc = store.p.location.country || 'US';
  if (cc !== 'US' && COUNTRY_XY[cc]) return COUNTRY_XY[cc];
  const city = store.p.location.city;
  const m = Dt.MARKETS.find(x => x[0] === city);
  const t = m && m[2][0] && Dt.D.teamByAbbr[m[2][0]];
  if (t) return [stad(t.abbr).lat, stad(t.abbr).lon];
  const pt = store.p.primary && Dt.team(store.p.primary);
  return pt ? [stad(pt.abbr).lat, stad(pt.abbr).lon] : null;
}
/** international venues (city as ESPN lists it) → [tz, lat, lon] */
const HOST = { London: ['Europe/London', 51.5560, -0.2795], Melbourne: ['Australia/Melbourne', -37.8200, 144.9834], 'Rio De Janeiro': ['America/Sao_Paulo', -22.9122, -43.2302],
  'Saint-Denis': ['Europe/Paris', 48.9245, 2.3602], Madrid: ['Europe/Madrid', 40.4531, -3.6883], Munich: ['Europe/Berlin', 48.2188, 11.6247], 'Mexico City': ['America/Mexico_City', 19.3029, -99.1505],
  Dublin: ['Europe/Dublin', 53.3352, -6.2285], Berlin: ['Europe/Berlin', 52.5147, 13.2395], 'Sao Paulo': ['America/Sao_Paulo', -23.5453, -46.4742] };
const localTime = (ts, tz) => new Date(ts).toLocaleTimeString(fmt.locale(), { hour: 'numeric', minute: '2-digit', timeZone: tz });

/* ------------------------------------------------------------------ tickets */
function upcomingHome(tids, n = 20) {
  const now = time.now();
  return Dt.D.games.filter(g => tids.includes(g.h) && g.ts > now && g.st === 'pre' && Dt.scheduleVisible(g) && !g.tbd && g.t !== 3).slice(0, n);
}
function priceFrom(g) { const r = rng(g.id)(); const prime = Dt.nationalWindow(g) ? 1.35 : 1; return Math.round((68 + r * 120) * prime); }
/* the seating chart (round 5 v2): the way a box office prints one. A rounded-rectangle bowl around the field: straight
   sidelines, rounded corners, flat ends; two levels (the 100s and the 300s) with the concourse as the gap between them;
   every section a flat shape with its number in Stats bold. One accent: the section you picked fills with the home team's
   primary; sold-out sections are pale; the field is flat turf with the end zones a shade deeper. */
const SEAT = {
  W: 340, H: 260, a: 72, b: 40, r: 14, // the inner edge of the lower level: half width, half height, corner radius
  levels: [{ base: 100, in: 0, out: 36, n: [5, 2, 2] }, { base: 300, in: 44, out: 84, n: [6, 3, 2] }], // n: sections per sideline, corner, end
};
const SEAT_GEO = (() => {
  const { W, H, a, b, r } = SEAT, cx = W / 2, cy = H / 2, sx = a - r, sy = b - r;
  // the perimeter, clockwise from the top-left end of the top sideline: sideline, corner, end, corner …
  const segs = [['h', -sx, sx, -1], ['c', -90, 0, sx, -sy], ['v', -sy, sy, 1], ['c', 0, 90, sx, sy], ['h', sx, -sx, 1], ['c', 90, 180, -sx, sy], ['v', sy, -sy, -1], ['c', 180, 270, -sx, -sy]];
  const at = (sg, u, d) => { // a point u (0…1) along segment sg, at offset d outside the inner edge
    if (sg[0] === 'h') return [cx + sg[1] + (sg[2] - sg[1]) * u, cy + sg[3] * (b + d)];
    if (sg[0] === 'v') return [cx + sg[3] * (a + d), cy + sg[1] + (sg[2] - sg[1]) * u];
    const t = (sg[1] + (sg[2] - sg[1]) * u) * Math.PI / 180; return [cx + sg[3] + Math.cos(t) * (r + d), cy + sg[4] + Math.sin(t) * (r + d)];
  };
  const P = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  const out = [];
  SEAT.levels.forEach((L, lvl) => {
    let no = L.base + 1;
    segs.forEach((sg, i) => {
      const n = sg[0] === 'c' ? L.n[1] : i % 4 === 0 ? L.n[0] : L.n[2], k = sg[0] === 'c' ? 6 : 1;
      for (let j = 0; j < n; j++, no++) {
        const u0 = j / n, u1 = (j + 1) / n, inner = [], outer = [];
        for (let q = 0; q <= k; q++) { const u = u0 + (u1 - u0) * q / k; inner.push(at(sg, u, L.in)); outer.push(at(sg, u, L.out)); }
        out.push({ id: no, lvl, kind: sg[0], d: `M${inner.concat(outer.reverse()).map(P).join('L')}Z`, mid: at(sg, (u0 + u1) / 2, (L.in + L.out) / 2) });
      }
    });
  });
  return out;
})();
const SECTIONS = SEAT_GEO;
const LEVEL_NAME = ['Lower level', 'Upper level'];
function secPrice(g, s) { return Math.round(priceFrom(g) * [2.2, 1][s.lvl] * { h: 1.25, c: 1, v: .85 }[s.kind] / 5) * 5; }
function secAvail(g, s) { return rng(g.id + s.id)() > 0.18; }
function levelFrom(g, lvl) { return Math.min(...SECTIONS.filter(s => s.lvl === lvl).map(s => secPrice(g, s))); }
/** the chart for a game (sel: the picked section); opts.plain draws every section open and not pressable (stadium mode),
    opts.markers adds points of interest on the concourse */
function bowlSvg(g, sel, opts = {}) {
  const { W, H, a, b } = SEAT, cx = W / 2, cy = H / 2, home = team(g.h || g.id), acc = App.teamFill(home);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" class="fl-seat" role="img" aria-label="Seating chart, ${esc(home.name)} home field">`;
  SECTIONS.forEach(sec => {
    const on = sec.id === sel, av = opts.plain || secAvail(g, sec);
    s += `<path d="${sec.d}" fill="${on ? acc : av ? 'var(--line-2)' : 'var(--surface-2)'}" stroke="var(--surface)" stroke-width="2.5" stroke-linejoin="round" ${av && !opts.plain ? `data-act="fl-sec" data-arg="${sec.id}" style="cursor:pointer"` : ''}/>`;
    s += `<text x="${sec.mid[0].toFixed(1)}" y="${(sec.mid[1] + 3).toFixed(1)}" text-anchor="middle" class="fl-seat-n${on ? ' on' : av ? '' : ' out'}" pointer-events="none">${sec.id}</text>`;
  });
  // the field: flat turf, the end zones a shade deeper, yard lines every ten; no marks, no logos
  const fw = 2 * (a - 12), fh = 2 * (b - 12), fx = cx - fw / 2, fy = cy - fh / 2, ez = fw / 12;
  s += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="2" fill="#3f7d4f"/><rect x="${fx}" y="${fy}" width="${ez}" height="${fh}" fill="#356c44"/><rect x="${fx + fw - ez}" y="${fy}" width="${ez}" height="${fh}" fill="#356c44"/>`;
  for (let i = 1; i < 12; i++) s += `<line x1="${(fx + ez * i).toFixed(1)}" x2="${(fx + ez * i).toFixed(1)}" y1="${fy}" y2="${fy + fh}" stroke="#fff" stroke-opacity="${i === 1 || i === 11 ? .75 : i === 6 ? .5 : .2}"/>`;
  if (opts.markers) s += opts.markers;
  return raw(s + '</svg>');
}
/** the legend under the chart: available, sold out and your section, then the cheapest seat on each level */
function seatLegend(g, sel) {
  const acc = App.teamFill(team(g.h));
  return html`<div class="fl-legend"><span><i style="background:var(--line-2)"></i>Available</span><span><i style="background:var(--surface-2);box-shadow:inset 0 0 0 1px var(--line)"></i>Sold out</span>${sel ? html`<span><i style="background:${acc}"></i>Section ${sel}</span>` : ''}</div>
    <div class="t-meta mt8 center">Lower from <b class="fl-from">$${levelFrom(g, 0)}</b> · Upper from <b class="fl-from">$${levelFrom(g, 1)}</b></div>`;
}

/* ------------------------------------------------------------------ jersey + merch art */
/** a football jersey drawn flat, the way a team store shows one (round 5 v2): broad shoulders into short cap sleeves, a V neck
    in front and a round neck behind, two sleeve stripes in the trim colour, a darker inner collar behind the V, small TV numbers
    on the shoulders and a faint armhole seam. No gloss, no shadow; the right half mirrors the left, so it is always symmetrical.
    The number is the Display face set upright, outlined in the trim colour; on the back the name sits over it.
    opts: back, w (px), kind: 'home' (the team colour) or 'away' (white) */
let JN = 0;
/** the left half of the outline, neck to hem centre */
const JL = [['M', 94, 14], ['C', 80, 16, 62, 20, 50, 26], ['C', 38, 32, 30, 42, 24, 56], ['L', 9, 98], ['L', 47, 112], ['C', 53, 106, 58, 100, 62, 95], ['C', 63, 140, 64, 190, 66, 238], ['L', 120, 238]];
const jMir = x => (240 - x);
function jOutline(back) {
  const f = n => +n.toFixed(1), L = JL.map(c => c[0] + c.slice(1).map(f).join(' ')).join(' ');
  // the right half: walk the left half backwards, mirrored (each curve's control points reversed)
  let R = ''; for (let i = JL.length - 1; i > 0; i--) { const c = JL[i], prev = JL[i - 1], end = [jMir(prev[prev.length - 2]), prev[prev.length - 1]];
    R += c[0] === 'C' ? ` C${f(jMir(c[3]))} ${c[4]} ${f(jMir(c[1]))} ${c[2]} ${f(end[0])} ${end[1]}` : ` L${f(end[0])} ${end[1]}`; }
  return L + R + (back ? ' Q120 30 94 14Z' : ' L120 50 L94 14Z');
}
function jerseySvg(t, nm, num, o = {}) {
  const id = 'flj' + (++JN), away = o.kind === 'away', back = !!o.back;
  const trim = t.alt && !/^#(000000|ffffff)$/i.test(t.alt) && t.alt.toLowerCase() !== t.color.toLowerCase() ? t.alt : (App.lum(t.color) > .4 ? '#111114' : '#ffffff');
  const body = away ? '#f7f7f8' : t.color, ink = away ? t.color : (App.lum(t.color) > .5 ? '#111114' : '#ffffff'), line = away ? t.color : trim;
  const out = jOutline(back), n = String(num == null || num === '' ? '' : num), name = (nm || '').toUpperCase();
  // sleeve stripes run parallel to the sleeve hem, stepped up the sleeve
  const st = k => { const ux = .34, uy = -.94, x0 = 9 + ux * k, y0 = 98 + uy * k, dx = 38, dy = 14; return `M${(x0 - dx * .3).toFixed(1)} ${(y0 - dy * .3).toFixed(1)} L${(x0 + dx * 1.3).toFixed(1)} ${(y0 + dy * 1.3).toFixed(1)}`; };
  const stripes = [9, 16].map(st).join(' ');
  return raw(`<svg viewBox="0 0 240 250" width="${o.w || 220}" class="fl-jsy" role="img" aria-label="${esc(t.name)} ${away ? 'away' : 'home'} jersey${name ? ', ' + esc(name) : ''}${n ? ', number ' + esc(n) : ''}">
    <defs><clipPath id="${id}"><path d="${out}"/></clipPath></defs>
    <path d="${out}" fill="${body}"/>
    <g clip-path="url(#${id})">
      <path d="${stripes}" stroke="${line}" stroke-width="4" fill="none"/>
      <path d="${stripes}" stroke="${line}" stroke-width="4" fill="none" transform="translate(240 0) scale(-1 1)"/>
      <path d="M50 26 C56 50 60 72 62 95 M190 26 C184 50 180 72 178 95" stroke="#000" stroke-opacity="${away ? .16 : .18}" stroke-width="1" fill="none"/>
      ${back || !n ? '' : `<text x="34" y="70" text-anchor="middle" class="fl-jsy-tv" fill="${ink}" transform="rotate(-22 34 70)">${esc(n)}</text><text x="206" y="70" text-anchor="middle" class="fl-jsy-tv" fill="${ink}" transform="rotate(22 206 70)">${esc(n)}</text>`}
    </g>
    ${back ? '' : `<path d="M94 14 Q120 22 146 14 L120 50Z" fill="${body}"/><path d="M94 14 Q120 22 146 14 L120 50Z" fill="#000" fill-opacity="${away ? .1 : .28}"/>`}
    <path d="${back ? 'M92 13 Q120 33 148 13' : 'M92 13 L120 51 L148 13'}" stroke="${line}" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    ${back && name ? `<text x="120" y="80" text-anchor="middle" class="fl-jsy-nm" fill="${ink}" font-size="${Math.min(18, 170 / Math.max(4, name.length)).toFixed(1)}">${esc(name)}</text>` : ''}
    ${n ? `<text x="120" y="${back ? 186 : 176}" text-anchor="middle" class="fl-jsy-no" fill="${ink}" stroke="${line}" font-size="${back ? 92 : 80}">${esc(n)}</text>` : ''}
    <path d="${out}" fill="none" stroke="#000" stroke-opacity="${away ? .2 : .12}" stroke-width="1.2" stroke-linejoin="round"/></svg>`);
}
function merchSvg(kind, tm) {
  const c = tm.color, a = tm.alt === '#ffffff' ? '#e8e8e8' : tm.alt;
  const shapes = {
    cap: `<path d="M30 80 Q30 30 80 28 Q130 30 130 80Z" fill="${c}"/><path d="M30 80 Q80 70 150 88 Q120 96 30 86Z" fill="${a}"/><circle cx="80" cy="29" r="4" fill="${a}"/>`,
    hoodie: `<path d="M50 30 Q80 10 110 30 L140 50 L148 120 L128 120 L126 70 L124 140 L36 140 L34 70 L32 120 L12 120 L20 50Z" fill="${c}"/><path d="M60 30 Q80 52 100 30" fill="none" stroke="${a}" stroke-width="5"/><rect x="58" y="100" width="44" height="22" rx="4" fill="rgba(0,0,0,.18)"/>`,
    tee: `<path d="M55 22 L30 32 L12 58 L32 70 L42 60 L42 140 L118 140 L118 60 L128 70 L148 58 L130 32 L105 22 Q80 36 55 22Z" fill="${c}"/><path d="M55 22 Q80 36 105 22" fill="none" stroke="${a}" stroke-width="4"/>`,
    beanie: `<path d="M34 100 Q34 30 80 30 Q126 30 126 100Z" fill="${c}"/><rect x="30" y="92" width="100" height="24" rx="6" fill="${a}"/><circle cx="80" cy="26" r="12" fill="${a}"/>`,
    scarf: `<path d="M30 30 L70 30 L70 140 L30 140Z" fill="${c}"/><path d="M30 60 L70 60 L70 72 L30 72Z M30 100 L70 100 L70 112 L30 112Z" fill="${a}"/><path d="M90 30 L130 30 L130 120 L90 120Z" fill="${c}"/><path d="M90 60 L130 60 L130 72 L90 72Z" fill="${a}"/>`,
    mug: `<rect x="40" y="40" width="70" height="90" rx="8" fill="${c}"/><path d="M110 60 Q140 60 140 85 Q140 110 110 110" fill="none" stroke="${c}" stroke-width="10"/><rect x="40" y="70" width="70" height="10" fill="${a}"/>`,
  };
  return raw(`<svg viewBox="0 0 160 160" width="100%">${shapes[kind] || shapes.tee}<image href="${tm.logo}" x="${kind === 'cap' ? 66 : kind === 'mug' ? 58 : 66}" y="${kind === 'cap' ? 44 : kind === 'hoodie' ? 48 : kind === 'mug' ? 88 : kind === 'beanie' ? 54 : kind === 'scarf' ? 1000 : 46}" width="${kind === 'mug' ? 34 : 28}" height="${kind === 'mug' ? 34 : 28}"/></svg>`);
}
const PRODUCTS = [
  ['jersey', 'Game jersey', 129.99], ['cap', 'Sideline cap', 39.99], ['hoodie', 'Sideline hoodie', 89.99], ['tee', 'Logo tee', 34.99],
  ['beanie', 'Cuffed knit beanie', 32.99], ['scarf', 'Supporter scarf', 29.99], ['mug', 'Game-day mug', 19.99],
];

/* ------------------------------------------------------------------ routes: tickets */
App.route('tickets', (params, query, page) => {
  const mine = store.p.teams;
  page.state = page.state || { tid: query.t || null };
  const tid = page.state.tid;
  const list = tid ? upcomingHome([tid]) : mine.length ? upcomingHome(mine) : upcomingHome(Dt.D.teams.map(t => t.id), 12);
  const wallet = (store.p.wallet || []).filter(w => Dt.game(w.gid) && Dt.game(w.gid).ts > time.now());
  const other = tid && !mine.includes(tid) ? team(tid) : null;
  const noSched = time.now() < Dt.SCHEDULE_RELEASE;
  return {
    title: 'Tickets',
    right: html`<button class="icon-btn" data-go="#/wallet" aria-label="Wallet">${icon('wallet')}${wallet.length ? raw('<i class="ib-dot"></i>') : ''}</button>`,
    html: html`
      ${wallet.length ? html`<div class="pad mt8"><a class="fl-next tap" data-go="#/wallet" style="${raw(tv(team(Dt.game(wallet[0].gid).h)))}">
        <div class="grow"><div class="tiny" style="color:rgba(255,255,255,.75)">Your next game</div><div class="h3 mt4" style="color:#fff">${team(Dt.game(wallet[0].gid).a).name} @ ${team(Dt.game(wallet[0].gid).h).name}</div><div class="meta" style="color:rgba(255,255,255,.8)">${fmt.day(Dt.game(wallet[0].gid).ts)} · Sec ${wallet[0].sec}, Row ${wallet[0].row}</div></div>${icon('qr', 'lg')}</a></div>` : ''}
      <div class="pad mt12 sq-chips">${mine.length ? html`<button class="sc-season ${!tid ? 'on' : ''}" data-act="fl-tk-team" data-arg="">My teams</button>` : ''}${mine.map(id => html`<button class="sc-season ${tid === id ? 'on' : ''}" data-act="fl-tk-team" data-arg="${id}">${UI.logo(id, 'xs')}${team(id).abbr}</button>`)}<button class="sc-season ${other || (!mine.length && !tid) ? 'on' : ''}" data-act="fl-tk-all">${other ? html`${UI.logo(other.id, 'xs')}${other.abbr}` : 'All teams'}${icon('down', 'xs')}</button></div>
      <div class="sec" style="margin-top:16px">${UI.secHead(tid ? `${team(tid).full} home games` : mine.length ? 'Home games for your teams' : 'Upcoming games')}
        ${noSched ? UI.empty('calendar', 'The 2026 schedule isn\'t out yet', 'It\'s released in mid-May. Turn on alerts and we\'ll tell you the moment tickets go on sale.', html`<button class="btn primary mt16" data-act="toast" data-arg="We'll alert you when tickets go on sale">${icon('bell', 'sm')} Alert me</button>`)
          : list.length ? html`<div class="list">${list.map(g => UI.row({ left: html`<div class="fl-date"><span>${fmt.d(g.ts).toLocaleDateString('en-US', { month: 'short', timeZone: fmt.tz() })}</span><b>${fmt.d(g.ts).toLocaleDateString('en-US', { day: 'numeric', timeZone: fmt.tz() })}</b></div>`,
            title: `${team(g.a).name} at ${team(g.h).name}`, sub: `${fmt.weekday(g.ts)} ${fmt.time(g.ts)} · ${g.vn || stad(team(g.h).abbr).name}${g.note ? ' · ' + g.note : ''}`, right: UI.lk4('$' + levelFrom(g, 1), 'from', { r: 1 }), go: `#/tickets/${g.id}` }))}</div>`
          : UI.empty('ticket', 'No upcoming home games', 'Check back when the next schedule is released.')}</div>
      <div class="sec">${UI.secHead('Game-day tools')}<div class="list">
        ${UI.row({ left: html`<div class="lr-ic">${icon('wallet', 'sm')}</div>`, title: 'Ticket wallet', sub: `${wallet.length ? fmt.plural(wallet.length, 'upcoming ticket') : 'Your mobile tickets live here'}`, go: '#/wallet' })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('stadium', 'sm')}</div>`, title: 'Stadiums visited', sub: `${(store.p.passport || []).length} of 30 · guides for all of them`, go: '#/stadiums?f=visited' })}
      </div></div>
      <div class="pad mt16 tiny center">Prototype: prices and availability are illustrative.</div>`,
  };
});

App.route('tickets/:gid', (params, query, page) => {
  const g = Dt.game(params.gid); if (!g) return { title: 'Tickets', html: UI.empty('ticket', 'Game not found') };
  page.state = page.state || { sec: null, qty: 2 };
  const st = page.state, home = team(g.h), away = team(g.a), S = stad(home.abbr);
  const sec = st.sec && SECTIONS.find(s => s.id === st.sec);
  const price = sec ? secPrice(g, sec) : 0, fees = Math.round(price * 0.18 * 100) / 100;
  return {
    title: 'Choose seats',
    html: html`
      <div class="pad-all"><div class="fl-mu">${UI.lk2(g.a)}<span class="t-eyebrow">at</span>${UI.lk2(g.h)}</div><div class="t-meta mt6">${fmt.dayLong(g.ts)} · ${fmt.time(g.ts)} ${fmt.tzAbbr(g.ts)} · ${g.vn || S.name}</div></div>
      <div class="pad"><div class="card cpad">${bowlSvg(g, st.sec)}${seatLegend(g, st.sec)}</div></div>
      ${sec ? html`<div class="pad mt12"><div class="card cpad rise">
          <div class="flex between"><div><div class="t-eyebrow">${LEVEL_NAME[sec.lvl]}</div><div class="fl-secn mt4">Section ${sec.id}</div><div class="t-meta">Row ${1 + (hash(g.id + sec.id) % 28)} · seats together</div></div>${UI.lk4('$' + price, 'each + fees', { r: 1 })}</div>
          ${S.roof.startsWith('Open') ? html`<div class="t-meta mt8">${icon('weather', 'xs')} Open-air stadium: dress for the weather.</div>` : ''}
          <div class="flex between mt16"><b class="fl-lbl">Tickets</b><div class="fl-step"><button class="btn sm sq" data-act="fl-qty" data-arg="-1" aria-label="One fewer">${icon('minus', 'sm')}</button><b class="fl-from">${st.qty}</b><button class="btn sm sq" data-act="fl-qty" data-arg="1" aria-label="One more">${icon('plus', 'sm')}</button></div></div>
          <div class="flex between mt12 t-meta fl-sum"><span>${st.qty} × $${price}</span><span>$${(st.qty * price).toFixed(2)}</span></div>
          <div class="flex between mt4 t-meta fl-sum"><span>Service fees</span><span>$${(st.qty * fees).toFixed(2)}</span></div>
          <div class="fl-tot"><span>Total, all-in</span><b class="fl-from">$${(st.qty * (price + fees)).toFixed(2)}</b></div>
          <button class="btn primary l block mt12" data-act="fl-buy">Continue to checkout</button></div></div>`
        : html`<div class="pad mt12 t-meta center">Tap a section to see seats and the all-in price.</div>`}
      <div class="sec">${UI.secHead('Before you go')}<div class="list">
        ${UI.row({ left: html`<div class="lr-ic">${icon('stadium', 'sm')}</div>`, title: 'Stadium guide', sub: S.transit, go: `#/stadium/${home.id}` })}
        ${store.p.teams.includes(g.a) ? UI.row({ left: html`<div class="lr-ic">${icon('plane', 'sm')}</div>`, title: 'Plan a road trip', sub: 'Travel, hotels and where away fans meet', go: `#/trip/${g.id}` }) : ''}
      </div></div>`,
  };
});

App.route('wallet', () => {
  const now = time.now();
  const all = (store.p.wallet || []).map(w => ({ ...w, g: Dt.game(w.gid) })).filter(w => w.g).sort((a, b) => a.g.ts - b.g.ts);
  const up = all.filter(w => w.g.ts + Dt.GAME_LEN > now), past = all.filter(w => w.g.ts + Dt.GAME_LEN <= now);
  const ticket = w => {
    const home = team(w.g.h), away = team(w.g.a);
    return html`<div class="fl-ticket" style="${raw(tv(home))}">
      <div class="fl-t-top"><div class="flex gap8">${UI.logo(w.g.a, 'sm')}<span class="b">${away.abbr}</span><span class="tiny" style="color:rgba(255,255,255,.7)">at</span>${UI.logo(w.g.h, 'sm')}<span class="b">${home.abbr}</span></div><span class="tiny" style="color:rgba(255,255,255,.85)">${fmt.day(w.g.ts)} · ${fmt.time(w.g.ts)}</span></div>
      <div class="fl-t-seat">${[['Section', w.sec], ['Row', w.row], ['Seats', w.seats.join(', ')], ['Gate', w.gate]].map(([k, v]) => html`<div><div class="tiny">${k}</div><div class="num b" style="font-size:18px">${v}</div></div>`)}</div>
      <div class="fl-t-code"><div class="fl-barcode"></div><div class="tiny mt8 center">Live code — refreshes every few seconds. Screenshots won't scan.</div></div>
      <div class="flex gap8 fl-t-act"><button class="btn sm white grow" data-act="toast" data-arg="Added to Apple Wallet">${icon('wallet', 'sm')} Add to Wallet</button><button class="btn sm ghost" style="color:#fff;border-color:rgba(255,255,255,.4)" data-act="fl-transfer" data-arg="${w.id}">${icon('share', 'sm')} Transfer</button></div>
      <div class="flex gap8 fl-t-act" style="padding-top:0"><button class="btn sm ghost grow" style="color:#fff;border-color:rgba(255,255,255,.4)" data-act="fl-stadium-mode" data-arg="${home.id}|${w.id}">${icon('stadium', 'sm')} Stadium mode</button><a class="btn sm ghost grow" style="color:#fff;border-color:rgba(255,255,255,.4)" data-go="#/stadium/${home.id}">${icon('map', 'sm')} Guide</a></div>
    </div>`;
  };
  return {
    title: 'Ticket wallet',
    html: html`${up.length ? html`<div class="pad col gap16 mt8">${up.map(ticket)}</div>` : html`${UI.empty('wallet', 'No upcoming tickets', 'Tickets you buy or receive show up here, ready to scan.', html`<button class="btn primary" data-go="#/tickets">Find tickets</button>`)}${(() => {
      const tid = store.p.primary, ng = tid && Dt.D.games.find(g => g.ts > time.now() && g.t !== 1 && g.h === tid); if (!ng) return '';
      return html`<div class="sec">${UI.secHead('Next home game')}<div class="list">${UI.row({ left: UI.logo(ng.a, 'md'), title: `vs ${Dt.team(ng.a).name}`, sub: `${fmt.day(ng.ts)} · ${fmt.time(ng.ts)}`, go: `#/game/${ng.id}` })}</div></div>`; })()}`}
      ${past.length ? html`<div class="sec">${UI.secHead('Past games')}<div class="list">${past.map(w => UI.row({ left: UI.logo(w.g.h, 'sm'), title: `${team(w.g.a).name} at ${team(w.g.h).name}`, sub: `${fmt.date(w.g.ts)} · Sec ${w.sec}`, go: `#/game/${w.g.id}` }))}</div></div>` : ''}`,
  };
});

/* ------------------------------------------------------------------ stadiums */
/** stadium card (approved round 5): the logo S24 on a white squared plate so every mark reads on any photo, capacity in Stats medium,
    Visited a soft Positive badge */
App.route('stadiums', (params, query, page) => {
  page.state = page.state || { f: query.f || 'all' };
  const f = page.state.f, visited = store.p.passport || [];
  let list = venues();
  if (f === 'roof') list = list.filter(v => !v.s.roof.startsWith('Open'));
  if (f === 'open') list = list.filter(v => v.s.roof.startsWith('Open'));
  if (f === 'visited') list = list.filter(v => visited.includes(v.s.name));
  list.sort((a, b) => store.p.teams.some(t => b.teams.some(x => x.id === t)) - store.p.teams.some(t => a.teams.some(x => x.id === t)) || a.s.name.localeCompare(b.s.name));
  return {
    title: 'Stadiums',
    html: html`<p class="pg-intro">Getting there, getting in, and what to eat at every NFL stadium.</p>
      <div class="pad mt12 sq-chips">${[['all', 'All'], ['roof', 'Roof or dome'], ['open', 'Open air'], ['visited', `Visited · ${visited.length}`]].map(([k, l]) => html`<button class="sc-season ${k === f ? 'on' : ''}" data-act="fl-st-f" data-arg="${k}">${l}</button>`)}</div>
      <div class="cards mt16">${list.length ? list.map(v => html`<a class="card tap fl-vcard st-card" data-go="#/stadium/${v.t.id}">
          <div class="thumb" style="aspect-ratio:16/7;border-radius:0">${UI.img(venueImg(v.t))}${visited.includes(v.s.name) ? html`<span class="badge win fl-vis">${icon('check', 'xs')} Visited</span>` : ''}</div>
          <div class="st-card-b"><span class="st-card-l">${v.teams.map(t => UI.logo(t.id, 'sm'))}</span><div class="grow"><div class="t-title-s">${v.s.name}</div><div class="t-meta mt4">${v.s.city} · ${v.s.roof} · ${fmt.n(v.s.cap)} seats</div></div></div></a>`)
        : UI.empty('stadium', 'Nothing here yet', 'Check in at a stadium from its guide and it shows up here.')}</div>`,
  };
});

App.route('stadium/:tid', (params) => {
  const tm = team(params.tid); if (!tm) return { title: 'Stadium', html: UI.empty('stadium', 'Stadium not found') };
  const S = stad(tm.abbr), visited = (store.p.passport || []).includes(S.name);
  const tenants = Dt.D.teams.filter(t => stad(t.abbr).name === S.name);
  const now = time.now();
  const next = Dt.D.games.find(g => tenants.some(t => t.id === g.h) && g.ts > now && Dt.scheduleVisible(g) && !g.ns);
  const myTicket = (store.p.wallet || []).find(w => { const g = Dt.game(w.gid); return g && tenants.some(t => t.id === g.h) && g.ts + Dt.GAME_LEN > now; });
  return {
    title: S.name,
    html: html`
      <div class="thumb" style="border-radius:0;aspect-ratio:16/9">${UI.img(venueImg(tm))}</div>
      <div class="pad-all"><div class="flex gap6">${tenants.map(t => UI.logo(t.id, 'sm'))}<span class="tiny">Home of the ${tenants.map(t => t.name).join(' & ')}</span></div>
        <div class="h1 mt8" style="font-size:26px">${S.name}</div><div class="meta mt4">${S.city}</div>
        <div class="flex gap8 mt16"><button class="btn primary grow" data-act="fl-stadium-mode" data-arg="${tm.id}|${myTicket ? myTicket.id : ''}">${icon('stadium', 'sm')} Stadium mode</button>
          <button class="btn ${visited ? 'ghost' : ''}" data-act="fl-checkin" data-arg="${tm.id}">${icon(visited ? 'check' : 'pin', 'sm')}${visited ? 'Visited' : 'Check in'}</button></div></div>
      <div class="pad">${UI.statRow([[S.opened, 'Opened'], [fmt.n(S.cap), 'Seats'], [(({ Retractable: 'Retract.' })[S.roof.split(' ')[0]] || S.roof.split(' ')[0]).toUpperCase(), 'Roof']])}</div>
      ${next ? html`<div class="sec">${UI.secHead('Next game here')}<div class="pad">${UI.gameCard(next)}</div><div class="pad mt8"><a class="btn ghost block" data-go="#/tickets/${next.id}">${icon('ticket', 'sm')} Tickets from $${levelFrom(next, 1)}</a></div></div>` : ''}
      <div class="sec">${UI.secHead('Getting there')}<div class="list">
        ${UI.row({ left: html`<div class="lr-ic">${icon('car', 'sm')}</div>`, title: 'Transit & parking', sub: S.transit })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('clock', 'sm')}</div>`, title: 'Gates', sub: 'Typically open 2 hours before kickoff. Check the team\'s game-day page for exact times.' })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('bag', 'sm')}</div>`, title: 'Bag policy', sub: 'NFL clear-bag policy: clear bags up to 12" × 6" × 12", or a small clutch up to 4.5" × 6.5".' })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('a11y', 'sm')}</div>`, title: 'Accessibility', sub: 'Accessible seating, assistive listening and sensory kits are available at guest services.' })}
      </div></div>
      <div class="sec">${UI.secHead('Eat & drink')}<div class="list">
        ${UI.row({ left: html`<div class="lr-ic">${icon('food', 'sm')}</div>`, title: 'Local favourite', sub: S.food })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('bolt', 'sm')}</div>`, title: 'Skip the line', sub: 'Order from your seat in Stadium mode and pick up at an express window.', act: 'fl-stadium-mode', arg: `${tm.id}|` })}
      </div></div>
      <div class="sec">${UI.secHead('Know before you go')}<div class="pad"><div class="card cpad">${UI.kv([['Surface', S.surface], ['Roof', S.roof], ['Capacity', fmt.n(S.cap)], ['Opened', S.opened], ['Local time zone', S.tz.split('/')[1].replace(/_/g, ' ')]])}</div></div></div>`,
  };
});

/* stadium mode: full-screen in-venue companion */
function stadiumMode(tid, wid) {
  const tm = team(tid), S = stad(tm.abbr);
  const w = (store.p.wallet || []).find(x => x.id === wid);
  let tab = 'order', cart = [];
  const MENU = [['Signature', S.food.split(/,| & /)[0], 14.5], ['Classic', 'Stadium hot dog', 7.5], ['Classic', 'Nachos with cheese', 9], ['Classic', 'Soft pretzel', 7], ['Drinks', 'Bottled water', 5], ['Drinks', 'Fountain soda', 6.5], ['Drinks', 'Local craft beer (21+)', 13], ['Sweet', 'Mini donuts', 8]];
  const r = rng(tid + Math.floor(time.now() / 300000));
  const lines = [['Restrooms · Sec 112', 'restroom'], ['Restrooms · Sec 131', 'restroom'], ['Restrooms · Sec 318', 'restroom'], [`${S.food.split(/,| & /)[0]} · Sec 104`, 'food'], ['Grill · Sec 140', 'food'], ['Team store · Gate A', 'bag'], ['Express pickup · Sec 120', 'bolt']].map(([n, k]) => [n, k, Math.round(r() * 14)]);
  const render = el => {
    const tot = cart.reduce((a, i) => a + MENU[i][2], 0);
    el.querySelector('.fl-sm-body').innerHTML = App.val(tab === 'order' ? html`
      <div class="pad mt12 meta">${w ? html`Delivering to <b>Sec ${w.sec}, Row ${w.row}</b>` : 'Order ahead and pick up at an express window.'}</div>
      <div class="list mt12">${MENU.map(([cat, n, p], i) => UI.row({ left: html`<div class="lr-ic">${icon(cat === 'Drinks' ? 'food' : 'food', 'sm')}</div>`, title: n, sub: cat, right: html`<span class="num b">$${p.toFixed(2)}</span><button class="icon-btn solid" style="width:32px;height:32px" data-act="fl-sm-add" data-arg="${i}">${icon('plus', 'sm')}</button>` }))}</div>
      ${cart.length ? html`<div class="pad mt16"><button class="btn primary block" data-act="fl-sm-pay">Place order · ${cart.length} item${cart.length > 1 ? 's' : ''} · $${tot.toFixed(2)}</button></div>` : ''}`
      : tab === 'lines' ? html`<div class="pad mt12 meta">Live wait times from venue sensors (prototype). Updated every few minutes.</div>
      <div class="list mt12">${lines.sort((a, b) => a[2] - b[2]).map(([n, k, m]) => UI.row({ left: html`<div class="lr-ic">${icon(k === 'restroom' ? 'users' : k, 'sm')}</div>`, title: n, sub: html`<div class="meter mt6" style="width:140px"><i style="width:${m / 14 * 100}%;background:${m < 5 ? 'var(--win)' : m < 10 ? 'var(--warn)' : 'var(--loss)'}"></i></div>`, right: html`<span class="num b">${m} min</span>` }))}</div>`
      : html`<div class="pad mt12"><div class="card cpad">${bowlSvg({ id: tid }, w ? +w.sec : null, { plain: true, markers: mapMarkers() })}
        <div class="flex gap16 wrap tiny mt8"><span>${raw('<i class="fl-sw" style="background:#4aa3ff"></i>')} Restrooms</span><span>${raw('<i class="fl-sw" style="background:#ffb020"></i>')} Food</span><span>${raw('<i class="fl-sw" style="background:#2fd17a"></i>')} First aid</span>${w ? html`<span>${raw(`<i class="fl-sw" style="background:${App.teamFill(tm)}"></i>`)} Your section</span>` : ''}</div></div></div>
        <div class="pad mt12 meta">${w ? `Your seats: Section ${w.sec}, Row ${w.row}. Nearest entrance: Gate ${w.gate}.` : 'Add a ticket to see your seat on the map.'}</div>`);
    el.querySelectorAll('[data-sm]').forEach(b => b.classList.toggle('on', b.dataset.sm === tab));
  };
  const mapMarkers = () => {
    // on the concourse, the gap between the two levels
    const pts = [[170, 50, '#4aa3ff'], [282, 130, '#4aa3ff'], [58, 130, '#4aa3ff'], [110, 50, '#ffb020'], [230, 210, '#ffb020'], [230, 50, '#ffb020'], [170, 210, '#2fd17a']];
    return pts.map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" stroke="var(--bg)" stroke-width="2"/>`).join('');
  };
  App.modal({ className: 'fl-sm', html: html`<div style="margin-top:var(--status-h);flex:1;display:flex;flex-direction:column;background:var(--bg);color:var(--text);min-height:0">
      <div class="hero" style="${raw(tv(tm))};padding-top:14px"><div class="flex between"><div><div class="eyebrow" style="color:rgba(255,255,255,.75)">Stadium mode</div><div class="h2 display mt6" style="color:#fff">${S.name}</div></div><button class="icon-btn" data-act="close-modal" style="color:#fff">${icon('close')}</button></div><div class="stripe"></div></div>
      <div class="tabs">${[['order', 'Order'], ['lines', 'Wait times'], ['map', 'Map']].map(([k, l]) => html`<button data-sm="${k}" data-act="fl-sm-tab" data-arg="${k}">${l}</button>`)}</div>
      <div class="fl-sm-body" style="flex:1;overflow:auto;padding-bottom:30px"></div></div>`,
    mount(el) {
      render(el);
      const A = App.actions;
      A['fl-sm-tab'] = (b, ev, k) => { tab = k; render(el); };
      A['fl-sm-add'] = (b, ev, i) => { cart.push(+i); App.toast({ title: `Added ${MENU[i][1]}`, icon: 'plus', ms: 1500 }); render(el); };
      A['fl-sm-pay'] = () => { const n = cart.length; cart = []; render(el); App.toast({ title: 'Order placed', body: `${n} item${n > 1 ? 's' : ''} · ${w ? 'arriving at your seat in ~12 min' : 'ready at Express pickup in ~8 min'}`, icon: 'check', ms: 5000 }); };
    } });
}

/* passport (retired 2026-11-07, approved "Stadium passport" B): visits live on Stadiums under Visited; old links land there */
App.route('passport', () => { setTimeout(() => App.go('#/stadiums?f=visited', { replace: true })); return { title: 'Stadiums', html: '' }; });

/* ------------------------------------------------------------------ road trip */
App.route('trip/:gid', (params) => {
  const g = Dt.game(params.gid); if (!g) return { title: 'Road trip', html: UI.empty('plane', 'Game not found') };
  const home = team(g.h), away = team(g.a), S = stad(home.abbr);
  const venueName = g.vn || S.name;
  const H = g.ns && HOST[g.vc];
  const foreign = !!H;
  const hc = homeCoords();
  const dest = H ? [H[1], H[2]] : [S.lat, S.lon];
  const dist = hc ? miles(hc, dest) : null;
  const fly = dist == null || dist > 380;
  const myTeam = store.p.teams.includes(g.a) ? away : store.p.teams.includes(g.h) ? home : away;
  const r = rng(g.id);
  const hotels = [['Central hotel', 'Short ride to the stadium', 1.6], ['Boutique stay near the bars', 'Where visiting fans gather', 2.4], ['Budget-friendly near transit', 'One stop from the stadium', 4.1]].map(([n, d, mi]) => [n, d, mi, Math.round(150 + r() * 220)]);
  const tz = H ? H[0] : S.tz;
  const tzName = H ? g.vc : tz.split('/')[1].replace(/_/g, ' ');
  const km = (store.p.location.country || 'US') !== 'US';
  const homeName = (store.p.location.country || 'US') !== 'US' ? ((Dt.COUNTRIES.find(c => c[0] === store.p.location.country) || [])[1] || '') : store.p.location.city;
  const same = localTime(g.ts, tz) === fmt.time(g.ts);
  award('traveler');
  return {
    title: 'Road trip',
    // trip-timeline A (approved 2026-11-08): the franchise header in the home team's colours with the stat row; times in a 72px Sans column
    html: html`<div class="fr-hero fr-trip" style="${raw(App.teamVars(home))}"><span class="fr-hero-eb">Road trip · ${Dt.weekLabel(g.t, g.w)} · ${fmt.dayLong(g.ts)}</span>
        <div class="fr-hero-n">${away.name.toUpperCase()} AT ${home.name.toUpperCase()}</div><div class="fr-trip-v">${venueName}${g.vc ? ', ' + g.vc : ''}</div>
        <div class="fr-hero-s">${[[dist != null ? fmt.n(km ? dist * 1.609 : dist) : '—', km ? 'Km away' : 'Miles away'], [fly ? 'FLY' : 'DRIVE', fly ? (foreign && (store.p.location.country || 'US') === 'US' ? 'Passport' : 'Best way') : `~${Math.round(dist / 60)} hrs`], [localTime(g.ts, tz).toUpperCase(), same ? 'Kickoff' : `${fmt.time(g.ts)} yours`]].map(([v, l]) => html`<div><b>${v}</b><span>${l}</span></div>`)}</div></div>
      <div class="sec">${UI.secHead('Game-day timeline')}<div class="list">
        ${[[-24 * 60, 'Arrive & check in', 'Get settled the day before — less stress, more fun.'], [-210, 'Tailgate / pregame meetup', 'Find fellow ' + myTeam.name + ' fans near the stadium.'], [-120, 'Gates open', 'Clear-bag policy applies.'], [-30, 'Warmups — be in your seat', ''], [0, 'Kickoff', ''], [200, 'Postgame', 'Let the crowds clear before heading out.']].map(([m, t, d]) => UI.row({ left: html`<b class="tl-t">${m <= -1440 ? 'Day before' : localTime(g.ts + m * 60e3, tz)}</b>`, title: t, sub: d, cls: 'tl-row' }))}
      </div></div>
      <div class="sec">${UI.secHead('Where to stay')}<div class="list">${hotels.map(([n, d, mi, p]) => UI.row({ left: html`<div class="lr-ic">${icon('home', 'sm')}</div>`, title: n, sub: `${d} · ${mi} mi`, right: html`<div class="right"><div class="num b">$${p}</div><div class="tiny">/ night</div></div>`, act: 'toast', arg: 'Opening partner booking' }))}</div></div>
      <div class="sec">${UI.secHead(`Watch with ${myTeam.name} fans`)}<div class="list">
        ${UI.row({ left: html`<div class="lr-ic">${icon('users', 'sm')}</div>`, title: `Official ${myTeam.name} fan club — ${g.vc || S.city.split(',')[0]} chapter`, sub: 'Pregame meetup at a neighbourhood bar · RSVP in the app', act: 'toast', arg: 'RSVP sent to the fan club' })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('food', 'sm')}</div>`, title: 'Local spot locals actually go to', sub: `${S.food} — skip the chains near the stadium`, act: 'toast', arg: 'Saved to your trip' })}
      </div></div>
      <div class="sec">${UI.secHead('Don\'t forget')}<div class="list">
        ${UI.row({ left: html`<div class="lr-ic">${icon('ticket', 'sm')}</div>`, title: 'Tickets', sub: 'Buy, then they live in your wallet', go: `#/tickets/${g.id}` })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('stadium', 'sm')}</div>`, title: 'Stadium guide', sub: S.transit, go: `#/stadium/${home.id}` })}
        ${foreign ? UI.row({ left: html`<div class="lr-ic">${icon('globe', 'sm')}</div>`, title: 'International game tips', sub: 'Passport, currency and local kickoff times', go: '#/international' }) : ''}
      </div></div>
      <div class="pad mt16 tiny center">Prototype: hotel and venue suggestions are illustrative.</div>`,
  };
});

/** team promo card (approved promo-card A, 2026-11-07): the team gradient at 180°, eyebrow, Display caps title, one Body line,
    a squared white button, art on the right; white text only */
function promo(tm, o) {
  return html`<div class="promo" style="${raw(App.teamVars(tm))}"><div class="promo-t"><div><span class="promo-eb">${o.eb}</span><div class="promo-n">${o.t.toUpperCase()}</div><p>${o.p}</p></div>${o.art || ''}</div>
    <button class="btn white sm mt12" ${raw(o.go ? `data-go="${o.go}"` : `data-act="${o.act}" data-arg="${o.arg || ''}"`)}>${o.btn}</button></div>`;
}

/* ------------------------------------------------------------------ shop */
App.route('shop', (params, query, page) => {
  const mine = store.p.teams;
  const ids = mine.length ? mine.concat(Dt.D.teams.map(t => t.id).filter(t => !mine.includes(t))) : Dt.D.teams.map(t => t.id);
  const feat = team(mine[0] || ids[0]);
  const cart = store.p.cart || [];
  return {
    title: 'Shop',
    right: html`<button class="icon-btn" data-act="fl-cart" aria-label="Cart">${icon('bag')}${cart.length ? raw('<i class="ib-dot"></i>') : ''}</button>`,
    // round 5 v2: the builder hero shows the white away jersey on the team's sheet gradient (a team-colour jersey vanished into it);
    // team tiles are logo M32 over the nickname in Display, in the text colour
    html: html`<div class="pad mt8">${promo(feat, { eb: 'Jersey builder', t: 'Your name. Your number.', p: `Build a ${feat.name} jersey with your name on the back.`, go: `#/shop/${feat.id}`, btn: 'Build a jersey',
        art: html`<span class="promo-art">${jerseySvg(feat, (store.p.name || 'FAN').slice(0, 12), '1', { back: true, w: 84, kind: 'away' })}</span>` })}</div>
      <div class="sec">${UI.secHead(mine.length ? 'Your teams' : 'Shop by team')}<div class="fl-teamgrid pad">${ids.slice(0, mine.length || 32).map(id => html`<a class="fl-tg tap" data-go="#/shop/${id}">${UI.logo(id, 'md')}<span class="lk-nm">${team(id).name}</span></a>`)}</div></div>
      ${mine.length ? html`<div class="sec">${UI.secHead('All 32 teams')}<div class="fl-teamgrid pad">${Dt.D.teams.filter(t => !mine.includes(t.id)).map(t => html`<a class="fl-tg tap" data-go="#/shop/${t.id}">${UI.logo(t.id, 'md')}<span class="lk-nm">${t.name}</span></a>`)}</div></div>` : ''}
      <div class="pad mt16 tiny center">Prototype store: products and prices are illustrative.</div>`,
  };
});

App.route('shop/:tid', (params, query, page) => {
  const tm = team(params.tid); if (!tm) return { title: 'Shop', html: UI.empty('bag', 'Team not found') };
  const stars = Dt.roster(tm.id).filter(p => ['QB', 'RB', 'WR', 'TE', 'DE', 'LB', 'CB', 'S'].includes(p.pos) && p.j).sort((a, b) => (b.sal || 0) - (a.sal || 0)).slice(0, 8);
  page.state = page.state || { name: (store.p.name || '').toUpperCase().slice(0, 14) || 'FAN', num: '1', size: 'L', side: 'back' };
  const st = page.state;
  const cart = store.p.cart || [];
  return {
    title: `${tm.name} shop`,
    right: html`<button class="icon-btn" data-act="fl-cart" aria-label="Cart">${icon('bag')}${cart.length ? raw('<i class="ib-dot"></i>') : ''}</button>`,
    html: html`
      <div class="fl-builder"><div class="fl-jwrap">${jerseySvg(tm, st.name, st.num, { back: st.side === 'back', w: 220 })}</div>
        <div class="flex gap8 center" style="justify-content:center">${UI.seg([{ k: 'back', l: 'Back' }, { k: 'front', l: 'Front' }], st.side, 'fl-j-side')}</div></div>
      <div class="pad mt16"><div class="eyebrow mb8">Customise</div>
        <div class="flex gap8"><input class="input fl-jname grow" value="${st.name}" maxlength="14" placeholder="NAME" style="text-transform:uppercase"><input class="input fl-jnum" value="${st.num}" maxlength="2" inputmode="numeric" style="width:76px;text-align:center"></div>
        ${stars.length ? html`<div class="eyebrow mt16 mb8">Or pick a player</div><div class="chips" style="padding:0">${stars.map(p => html`<button class="chip ${st.name === (p.ln || '').toUpperCase() ? 'on' : ''}" data-act="fl-j-player" data-arg="${(p.ln || '').toUpperCase()}|${p.j}">${p.ln} #${p.j}</button>`)}</div>` : ''}
        <div class="eyebrow mt16 mb8">Size</div><div class="flex gap6">${['S', 'M', 'L', 'XL', '2XL', '3XL'].map(sz => html`<button class="fl-size ${st.size === sz ? 'on' : ''}" data-act="fl-j-size" data-arg="${sz}">${sz}</button>`)}</div>
        <button class="btn primary block mt16" data-act="fl-j-add">Add jersey · $${(129.99 + (st.name ? 0 : 0)).toFixed(2)}</button>
        <div class="tiny center mt8">Custom name & number included · ships in 5–7 days</div></div>
      <div class="sec">${UI.secHead('More gear')}<div class="grid2 pad">${PRODUCTS.slice(1).map(([k, n, p]) => html`<div class="card fl-prod"><div class="fl-prod-img" style="${raw(tv(tm))}">${merchSvg(k, tm)}</div><div class="cpad"><div class="h4 clamp2">${tm.name} ${n.toLowerCase()}</div><div class="flex between mt8"><span class="num b">$${p}</span><button class="icon-btn solid" style="width:32px;height:32px" data-act="fl-add" data-arg="${tm.id}|${k}" aria-label="Add">${icon('plus', 'sm')}</button></div></div></div>`)}</div></div>`,
    mount(el) {
      const upd = () => { st.name = el.querySelector('.fl-jname').value.toUpperCase().replace(/[^A-Z .'-]/g, '').slice(0, 14); st.num = el.querySelector('.fl-jnum').value.replace(/\D/g, '').slice(0, 2); el.querySelector('.fl-jwrap').innerHTML = App.val(jerseySvg(tm, st.name, st.num, { back: st.side === 'back', w: 220 })); };
      el.querySelector('.fl-jname').addEventListener('input', upd);
      el.querySelector('.fl-jnum').addEventListener('input', upd);
    },
  };
});

/* ------------------------------------------------------------------ international */
/* ------------------------------------------------------------------ watch spots: where your team's fans gather in your city
   Sample listings, generated per city and team for the prototype (not real venues). */
const SPOT_KINDS = ['Tap Room', 'Corner Pub', 'Ale House', 'Social Club', 'Sports Hall', 'Beer Garden', 'Taproom & Kitchen', 'Public House'];
const HOODS = ['Downtown', 'Midtown', 'the East Side', 'the West End', 'Uptown', 'the Arts District', 'Old Town', 'the Waterfront'];
const hseed = str => { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
function spotsFor(tid, city) {
  const tm = team(tid), h = hseed(city + tm.abbr);
  return [0, 1, 2].map(i => ({
    n: `The ${HOODS[(h >>> (i * 3)) % HOODS.length].replace(/^the /, '')} ${SPOT_KINDS[(h >>> (i * 5 + 2)) % SPOT_KINDS.length]}`,
    hood: HOODS[(h >>> (i * 3)) % HOODS.length], mi: ((h >>> (i * 4)) % 40 + 4) / 10,
    tag: i === 0 ? `Official ${tm.name} fan club bar` : i === 1 ? `${tm.name} sound on every Sunday` : 'Big screens, every game',
  }));
}
App.route('watch-spots', () => {
  const city = (store.p.location && store.p.location.city) || 'your city';
  const mine = (store.p.teams || []).filter(team);
  const market = (store.p.location && store.p.location.market) || [];
  return { title: 'Watch with fans', html: html`<p class="pg-intro">Where ${mine.length ? 'your teams\' fans' : 'fans'} watch in ${city}. Sample listings for the prototype.</p>
    ${mine.length ? mine.map(tid => spotsBlock(tid, city, market)) : UI.empty('users', 'Pick a team first', 'Then we can find its fans near you.')}` };
});
/** one team's watch party and the bars its fans fill, near you */
function spotsBlock(tid, city, market) {
      const tm = team(tid), nx = Dt.liveGameFor(tid) || Dt.nextGame(tid), local = market.includes(tid);
      return html`<div class="sec"><div class="sec-head"><div class="h2 flex gap8">${UI.logo(tid, 'sm')}${tm.name} fans</div></div>
        ${nx ? html`<div class="pad">${promo(tm, { eb: Dt.state(nx) === 'live' ? 'Happening now' : 'Next watch party', t: `${Dt.isHome(nx, tid) ? 'vs' : 'at'} ${team(Dt.opp(nx, tid)).name}`,
          p: `${fmt.dayLong(nx.ts)} · ${fmt.time(nx.ts)} · hosted by ${city === 'your city' ? 'a local' : 'the ' + city} ${tm.name} fan club${local && Dt.isHome(nx, tid) ? ' (or head to the stadium)' : ''}`, act: 'ws-rsvp', arg: tid,
          btn: html`${icon((store.p.rsvps || []).includes(nx.id + tid) ? 'check' : 'calendar', 'sm')}${(store.p.rsvps || []).includes(nx.id + tid) ? 'Going' : 'I\'m going'}`, art: UI.logo(tid, 'lg') })}</div>` : ''}
        <div class="list mt8">${spotsFor(tid, city).map(sp => UI.row({ left: html`<span class="lead-tile">${UI.logo(tid, 'sm')}</span>`, title: sp.n, sub: `${sp.tag} · ${sp.hood} · ${sp.mi} mi`, right: icon('chev', 'sm chev'), act: 'toast', arg: `Directions to ${sp.n}` }))}</div></div>`;
}
App.watchSpots = { block: spotsBlock };
App.actions['ws-rsvp'] = (el, ev, tid) => {
  const nx = Dt.liveGameFor(tid) || Dt.nextGame(tid); if (!nx) return;
  const r = store.p.rsvps = store.p.rsvps || [], k = nx.id + tid, on = r.includes(k);
  store.p.rsvps = on ? r.filter(x => x !== k) : [...r, k]; store.save(); App.refresh();
  if (!on) App.toast({ title: 'See you there', body: `${team(tid).name} watch party · ${fmt.day(nx.ts)}`, icon: 'calendar' });
};

App.route('international', () => {
  const now = time.now();
  const intl = Dt.D.games.filter(g => g.s === 2026 && g.t === 2 && g.ns && HOST[g.vc]);
  const show = intl.filter(g => Dt.scheduleVisible(g, now));
  const country = store.p.location.country || 'US';
  const C = Dt.COUNTRIES.find(c => c[0] === country);
  const clubs = [['GB', 'United Kingdom', 'NFL UK community — London game-week fan zones'], ['DE', 'Deutschland', 'Fan clubs in every major city; Munich game 2026'], ['MX', 'México', 'The NFL\'s biggest international fan base'], ['BR', 'Brasil', 'NFL Brasil community — Rio game 2026'], ['ES', 'España', 'Madrid hosts its second regular-season game'], ['FR', 'France', 'Paris hosts its first regular-season game'], ['AU', 'Australia', 'Melbourne opened the 2026 season'], ['IE', 'Ireland', 'Dublin hosted its first game in 2025']];
  return {
    title: 'NFL around the world',
    html: html`
      <p class="pg-intro">Every kickoff is shown in your local time (${fmt.tz().split('/').pop().replace(/_/g, ' ')}).${country === 'US' ? html` Watching from outside the US? <a class="pg-intro-l" data-go="#/settings/location">Set your country</a>.` : ''}</p>
      ${country !== 'US' ? html`<div class="pad"><div class="card cpad"><div class="flex gap12"><div class="lr-ic lg">${icon('tv')}</div><div class="grow"><div class="h4">NFL Game Pass on DAZN</div><div class="meta mt4">Every game live and on demand outside the US — plus RedZone and replays. A free game every week.</div></div></div>
          <button class="btn primary block mt12" data-go="#/where-to-watch">How to watch in ${C ? C[1] : 'your country'}</button></div></div>`
        : ''}
      <div class="sec">${UI.secHead('2026 international games')}
        ${show.length ? html`<div class="list">${show.map(g => {
          const st = Dt.state(g, now), tz = (HOST[g.vc] || ['Europe/London'])[0];
          return UI.row({ left: html`<span class="lead-tile">${UI.logo(g.h, 'sm')}</span>`, title: html`${team(g.a).name} vs ${team(g.h).name}`,
            sub: html`${g.note.replace('NFL ', '').replace(' Games', '').replace(' Game', '')} · ${g.vn}<br>${fmt.day(g.ts)} · ${st === 'post' ? (Dt.spoiled(g) ? 'Final' : `Final ${team(g.a).abbr} ${g.as}–${g.hs} ${team(g.h).abbr}`) : st === 'live' ? 'Live now' : `${fmt.time(g.ts)} your time · ${localTime(g.ts, tz)} local`}`,
            go: `#/game/${g.id}` });
        })}</div>` : UI.empty('globe', 'The 2026 schedule is coming', 'International games are announced in the spring; the full schedule drops in May.')}</div>
      <div class="sec">${UI.secHead('Fan communities')}<div class="list">${clubs.map(([cc, n, d]) => UI.row({ left: html`<div class="fl-cc">${cc}</div>`, title: n, sub: d, right: cc === country ? html`<span class="badge accent">You</span>` : '', act: 'toast', arg: `Opening ${n} fan community` }))}</div></div>
      <div class="sec">${UI.secHead('Make it yours')}<div class="list">
        ${UI.row({ left: html`<div class="lr-ic">${icon('translate', 'sm')}</div>`, title: 'Language', sub: 'English · Español · Deutsch · Português · Français · 日本語', go: '#/settings/language' })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('clock', 'sm')}</div>`, title: 'Time zone & country', sub: fmt.tz().replace(/_/g, ' '), go: '#/settings/location' })}
        ${UI.row({ left: html`<div class="lr-ic">${icon('book', 'sm')}</div>`, title: 'New to American football?', sub: 'Football 101 — short lessons with metric units', go: '#/learn' })}
      </div></div>`,
  };
});

/* ------------------------------------------------------------------ actions */
const A = App.actions;
A['fl-tk-team'] = (el, ev, k) => { App.closeSheet(); App.current().state.tid = k || null; App.refresh(); };
A['fl-tk-all'] = () => { const tid = App.current().state.tid;
  App.sheet({ title: 'Team', html: html`<div class="list r-sans">${Dt.D.teams.slice().sort((a, b) => a.full.localeCompare(b.full)).map(t => UI.row({ left: UI.logo(t.id, 'sm'), title: t.full, act: 'fl-tk-team', arg: t.id, right: t.id === tid ? icon('check', 'sm') : '' }))}</div>` }); };
A['fl-sec'] = (el, ev, id) => { const p = App.current(); p.state.sec = +id; App.refresh(); setTimeout(() => p.el.querySelector('.rise')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50); };
A['fl-qty'] = (el, ev, d) => { const st = App.current().state; st.qty = Math.max(1, Math.min(8, st.qty + +d)); App.refresh(); };
A['fl-buy'] = () => {
  const p = App.current(), g = Dt.game(p.params.gid), st = p.state, sec = SECTIONS.find(s => s.id === st.sec);
  const price = secPrice(g, sec), tot = st.qty * price * 1.18;
  App.sheet({ title: 'Checkout', html: html`<div class="pad"><div class="card cpad">${UI.kv([['Game', `${team(g.a).abbr} at ${team(g.h).abbr}`], ['Date', fmt.day(g.ts)], ['Seats', `Sec ${sec.id} · ${st.qty} tickets`], ['Total', `$${tot.toFixed(2)}`]])}</div>
    <button class="btn white block mt16" data-act="fl-pay">${icon('wallet', 'sm')} Pay with Apple Pay</button><div class="tiny center mt8">Prototype checkout — no payment is taken.</div></div>` });
};
A['fl-pay'] = () => {
  const p = App.current(), g = Dt.game(p.params.gid), st = p.state;
  const row = 1 + (hash(g.id + st.sec) % 28), s0 = 1 + (hash(st.sec + g.id) % 18);
  const t = { id: 'tk' + Date.now().toString(36), gid: g.id, sec: st.sec, row, seats: Array.from({ length: st.qty }, (_, i) => s0 + i), gate: 'ABCDE'[st.sec % 5] };
  (store.p.wallet = store.p.wallet || []).push(t); store.save();
  App.closeSheet(); App.toast({ title: 'You\'re going!', body: `${st.qty} tickets added to your wallet`, icon: 'ticket' });
  App.go('#/wallet', { replace: true });
};
A['fl-transfer'] = (el, ev, id) => {
  App.sheet({ title: 'Transfer tickets', html: html`<div class="pad"><p class="meta">Send to a friend by phone or email. They'll get the tickets in their own app.</p><input class="input mt12" placeholder="Friend's phone or email"><button class="btn primary block mt16" data-act="fl-transfer-go">Send tickets</button></div>` });
};
A['fl-transfer-go'] = () => { App.closeSheet(); App.toast({ title: 'Transfer sent', body: 'You\'ll be notified when it\'s accepted.', icon: 'share' }); };
A['fl-stadium-mode'] = (el, ev, arg) => { const [tid, wid] = (arg || '').split('|'); stadiumMode(tid, wid); };
A['fl-checkin'] = (el, ev, tid) => {
  const S = stad(team(tid).abbr); const v = store.p.passport = store.p.passport || [];
  if (v.includes(S.name)) { App.toast({ title: 'Already stamped', body: S.name, icon: 'check' }); return; }
  v.push(S.name); store.p.points += 50; store.save(); award('collector');
  App.refresh();
  // first and every tenth stamp get the milestone; the rest a toast
  if (v.length === 1 || v.length % 10 === 0 || v.length === 32) UI.milestone(UI.MILESTONES.stamp(v.length, S.name));
  else App.toast({ title: 'Passport stamped', body: `${S.name} · +50 fan points`, icon: 'pin' });
};
A['fl-st-f'] = (el, ev, k) => { App.current().state.f = k; App.refresh(); };
A['fl-j-side'] = (el, ev, k) => { App.current().state.side = k; App.refresh(); };
A['fl-j-size'] = (el, ev, k) => { App.current().state.size = k; App.refresh(); };
A['fl-j-player'] = (el, ev, arg) => { const [n, j] = arg.split('|'); const st = App.current().state; st.name = n; st.num = j; App.refresh(); };
A['fl-j-add'] = () => {
  const p = App.current(), st = p.state, tm = team(p.params.tid);
  (store.p.cart = store.p.cart || []).push({ tid: tm.id, k: 'jersey', n: `${tm.name} jersey · ${st.name || 'Blank'} #${st.num || '–'} · ${st.size}`, p: 129.99 }); store.save();
  App.toast({ title: 'Added to bag', body: `${tm.name} jersey · ${st.name} #${st.num}`, icon: 'bag', go: null }); App.refresh();
};
A['fl-add'] = (el, ev, arg) => {
  const [tid, k] = arg.split('|'); const pr = PRODUCTS.find(x => x[0] === k), tm = team(tid);
  (store.p.cart = store.p.cart || []).push({ tid, k, n: `${tm.name} ${pr[1].toLowerCase()}`, p: pr[2] }); store.save();
  App.toast({ title: 'Added to bag', body: `${tm.name} ${pr[1].toLowerCase()}`, icon: 'bag' }); App.refresh();
};
A['fl-cart'] = () => {
  const cart = store.p.cart || [];
  const tot = cart.reduce((a, i) => a + i.p, 0);
  App.sheet({ title: 'Your bag', html: cart.length ? html`<div class="list">${cart.map((c, i) => UI.row({ left: UI.logo(c.tid, 'sm'), title: c.n, sub: `$${c.p.toFixed(2)}`, right: html`<button class="icon-btn" data-act="fl-cart-rm" data-arg="${i}" aria-label="Remove">${icon('close', 'sm')}</button>` }))}</div>
      <div class="pad mt16"><div class="flex between b"><span>Total</span><span class="num">$${tot.toFixed(2)}</span></div><button class="btn white block mt12" data-act="fl-checkout">${icon('wallet', 'sm')} Pay with Apple Pay</button><div class="tiny center mt8">Prototype checkout — no payment is taken.</div></div>`
    : UI.empty('bag', 'Your bag is empty', 'Build a jersey or grab some gear.') });
};
A['fl-cart-rm'] = (el, ev, i) => { store.p.cart.splice(+i, 1); store.save(); App.closeSheet(true); A['fl-cart'](); App.refresh(); };
A['fl-checkout'] = () => {
  const cart = store.p.cart || []; (store.p.orders = store.p.orders || []).push({ ts: time.now(), items: cart.slice() });
  store.p.cart = []; store.save(); App.closeSheet(); App.toast({ title: 'Order confirmed', body: `${fmt.plural(cart.length, 'item')} · arriving in 5–7 days`, icon: 'check' }); App.refresh();
};

App.FANLIFE = { stad, venues, venueImg, jerseySvg };
})();
