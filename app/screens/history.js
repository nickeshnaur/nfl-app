/* ============================================================================
   History: hub, Super Bowls I–LX, records, Hall of Fame, franchise pages.
   Hand-authored facts (accurate through the 2025 season); 2022–2026 team seasons
   are computed live from the data snapshot.
   ========================================================================== */
(function () {
'use strict';
const { html, raw, icon, fmt, store, time } = App;
const UI = App.UI, Dt = App.data;
const sh = (...a) => html`<div class="sec">${UI.secHead(...a)}</div>`;

/* ------------------------------------------------------------------ Super Bowls
   [numeral, season, winner (current franchise abbr), wScore, loser, lScore, venue, city, MVP, winner name then, loser name then, ot] */
const SB = [
  ['I', 1966, 'GB', 35, 'KC', 10, 'Los Angeles Memorial Coliseum', 'Los Angeles', 'Bart Starr'],
  ['II', 1967, 'GB', 33, 'LV', 14, 'Orange Bowl', 'Miami', 'Bart Starr', null, 'Oakland Raiders'],
  ['III', 1968, 'NYJ', 16, 'IND', 7, 'Orange Bowl', 'Miami', 'Joe Namath', null, 'Baltimore Colts'],
  ['IV', 1969, 'KC', 23, 'MIN', 7, 'Tulane Stadium', 'New Orleans', 'Len Dawson'],
  ['V', 1970, 'IND', 16, 'DAL', 13, 'Orange Bowl', 'Miami', 'Chuck Howley', 'Baltimore Colts'],
  ['VI', 1971, 'DAL', 24, 'MIA', 3, 'Tulane Stadium', 'New Orleans', 'Roger Staubach'],
  ['VII', 1972, 'MIA', 14, 'WAS', 7, 'Los Angeles Memorial Coliseum', 'Los Angeles', 'Jake Scott', null, 'Washington'],
  ['VIII', 1973, 'MIA', 24, 'MIN', 7, 'Rice Stadium', 'Houston', 'Larry Csonka'],
  ['IX', 1974, 'PIT', 16, 'MIN', 6, 'Tulane Stadium', 'New Orleans', 'Franco Harris'],
  ['X', 1975, 'PIT', 21, 'DAL', 17, 'Orange Bowl', 'Miami', 'Lynn Swann'],
  ['XI', 1976, 'LV', 32, 'MIN', 14, 'Rose Bowl', 'Pasadena', 'Fred Biletnikoff', 'Oakland Raiders'],
  ['XII', 1977, 'DAL', 27, 'DEN', 10, 'Louisiana Superdome', 'New Orleans', 'Harvey Martin & Randy White'],
  ['XIII', 1978, 'PIT', 35, 'DAL', 31, 'Orange Bowl', 'Miami', 'Terry Bradshaw'],
  ['XIV', 1979, 'PIT', 31, 'LAR', 19, 'Rose Bowl', 'Pasadena', 'Terry Bradshaw', null, 'Los Angeles Rams'],
  ['XV', 1980, 'LV', 27, 'PHI', 10, 'Louisiana Superdome', 'New Orleans', 'Jim Plunkett', 'Oakland Raiders'],
  ['XVI', 1981, 'SF', 26, 'CIN', 21, 'Pontiac Silverdome', 'Pontiac, MI', 'Joe Montana'],
  ['XVII', 1982, 'WAS', 27, 'MIA', 17, 'Rose Bowl', 'Pasadena', 'John Riggins', 'Washington'],
  ['XVIII', 1983, 'LV', 38, 'WAS', 9, 'Tampa Stadium', 'Tampa', 'Marcus Allen', 'Los Angeles Raiders', 'Washington'],
  ['XIX', 1984, 'SF', 38, 'MIA', 16, 'Stanford Stadium', 'Stanford, CA', 'Joe Montana'],
  ['XX', 1985, 'CHI', 46, 'NE', 10, 'Louisiana Superdome', 'New Orleans', 'Richard Dent'],
  ['XXI', 1986, 'NYG', 39, 'DEN', 20, 'Rose Bowl', 'Pasadena', 'Phil Simms'],
  ['XXII', 1987, 'WAS', 42, 'DEN', 10, 'Jack Murphy Stadium', 'San Diego', 'Doug Williams', 'Washington'],
  ['XXIII', 1988, 'SF', 20, 'CIN', 16, 'Joe Robbie Stadium', 'Miami', 'Jerry Rice'],
  ['XXIV', 1989, 'SF', 55, 'DEN', 10, 'Louisiana Superdome', 'New Orleans', 'Joe Montana'],
  ['XXV', 1990, 'NYG', 20, 'BUF', 19, 'Tampa Stadium', 'Tampa', 'Ottis Anderson'],
  ['XXVI', 1991, 'WAS', 37, 'BUF', 24, 'Hubert H. Humphrey Metrodome', 'Minneapolis', 'Mark Rypien', 'Washington'],
  ['XXVII', 1992, 'DAL', 52, 'BUF', 17, 'Rose Bowl', 'Pasadena', 'Troy Aikman'],
  ['XXVIII', 1993, 'DAL', 30, 'BUF', 13, 'Georgia Dome', 'Atlanta', 'Emmitt Smith'],
  ['XXIX', 1994, 'SF', 49, 'LAC', 26, 'Joe Robbie Stadium', 'Miami', 'Steve Young', null, 'San Diego Chargers'],
  ['XXX', 1995, 'DAL', 27, 'PIT', 17, 'Sun Devil Stadium', 'Tempe, AZ', 'Larry Brown'],
  ['XXXI', 1996, 'GB', 35, 'NE', 21, 'Louisiana Superdome', 'New Orleans', 'Desmond Howard'],
  ['XXXII', 1997, 'DEN', 31, 'GB', 24, 'Qualcomm Stadium', 'San Diego', 'Terrell Davis'],
  ['XXXIII', 1998, 'DEN', 34, 'ATL', 19, 'Pro Player Stadium', 'Miami', 'John Elway'],
  ['XXXIV', 1999, 'LAR', 23, 'TEN', 16, 'Georgia Dome', 'Atlanta', 'Kurt Warner', 'St. Louis Rams'],
  ['XXXV', 2000, 'BAL', 34, 'NYG', 7, 'Raymond James Stadium', 'Tampa', 'Ray Lewis'],
  ['XXXVI', 2001, 'NE', 20, 'LAR', 17, 'Louisiana Superdome', 'New Orleans', 'Tom Brady', null, 'St. Louis Rams'],
  ['XXXVII', 2002, 'TB', 48, 'LV', 21, 'Qualcomm Stadium', 'San Diego', 'Dexter Jackson', null, 'Oakland Raiders'],
  ['XXXVIII', 2003, 'NE', 32, 'CAR', 29, 'Reliant Stadium', 'Houston', 'Tom Brady'],
  ['XXXIX', 2004, 'NE', 24, 'PHI', 21, 'Alltel Stadium', 'Jacksonville', 'Deion Branch'],
  ['XL', 2005, 'PIT', 21, 'SEA', 10, 'Ford Field', 'Detroit', 'Hines Ward'],
  ['XLI', 2006, 'IND', 29, 'CHI', 17, 'Dolphin Stadium', 'Miami Gardens, FL', 'Peyton Manning'],
  ['XLII', 2007, 'NYG', 17, 'NE', 14, 'University of Phoenix Stadium', 'Glendale, AZ', 'Eli Manning'],
  ['XLIII', 2008, 'PIT', 27, 'ARI', 23, 'Raymond James Stadium', 'Tampa', 'Santonio Holmes'],
  ['XLIV', 2009, 'NO', 31, 'IND', 17, 'Sun Life Stadium', 'Miami Gardens, FL', 'Drew Brees'],
  ['XLV', 2010, 'GB', 31, 'PIT', 25, 'Cowboys Stadium', 'Arlington, TX', 'Aaron Rodgers'],
  ['XLVI', 2011, 'NYG', 21, 'NE', 17, 'Lucas Oil Stadium', 'Indianapolis', 'Eli Manning'],
  ['XLVII', 2012, 'BAL', 34, 'SF', 31, 'Mercedes-Benz Superdome', 'New Orleans', 'Joe Flacco'],
  ['XLVIII', 2013, 'SEA', 43, 'DEN', 8, 'MetLife Stadium', 'East Rutherford, NJ', 'Malcolm Smith'],
  ['XLIX', 2014, 'NE', 28, 'SEA', 24, 'University of Phoenix Stadium', 'Glendale, AZ', 'Tom Brady'],
  ['50', 2015, 'DEN', 24, 'CAR', 10, "Levi's Stadium", 'Santa Clara, CA', 'Von Miller'],
  ['LI', 2016, 'NE', 34, 'ATL', 28, 'NRG Stadium', 'Houston', 'Tom Brady', null, null, 1],
  ['LII', 2017, 'PHI', 41, 'NE', 33, 'U.S. Bank Stadium', 'Minneapolis', 'Nick Foles'],
  ['LIII', 2018, 'NE', 13, 'LAR', 3, 'Mercedes-Benz Stadium', 'Atlanta', 'Julian Edelman'],
  ['LIV', 2019, 'KC', 31, 'SF', 20, 'Hard Rock Stadium', 'Miami Gardens, FL', 'Patrick Mahomes'],
  ['LV', 2020, 'TB', 31, 'KC', 9, 'Raymond James Stadium', 'Tampa', 'Tom Brady'],
  ['LVI', 2021, 'LAR', 23, 'CIN', 20, 'SoFi Stadium', 'Inglewood, CA', 'Cooper Kupp'],
  ['LVII', 2022, 'KC', 38, 'PHI', 35, 'State Farm Stadium', 'Glendale, AZ', 'Patrick Mahomes'],
  ['LVIII', 2023, 'KC', 25, 'SF', 22, 'Allegiant Stadium', 'Las Vegas', 'Patrick Mahomes', null, null, 1],
  ['LIX', 2024, 'PHI', 40, 'KC', 22, 'Caesars Superdome', 'New Orleans', 'Jalen Hurts'],
  ['LX', 2025, 'SEA', 29, 'NE', 13, "Levi's Stadium", 'Santa Clara, CA', null],
].map(r => ({ n: r[0], s: r[1], w: r[2], ws: r[3], l: r[4], ls: r[5], venue: r[6], city: r[7], mvp: r[8], wName: r[9], lName: r[10], ot: r[11] }));
/** a Super Bowl only "exists" once it has been played as of App.time */
function sbPlayed(sb) {
  const g = sbGame(sb);
  if (g) return Dt.state(g) === 'post';
  return true;
}
function sbGame(sb) { return sb.s >= 2022 ? Dt.D.games.find(g => g.s === sb.s && g.t === 3 && g.w === 5) : null; }
const playedSBs = () => SB.filter(sbPlayed);

/* ------------------------------------------------------------------ franchises */
const FR = {
  ARI: { f: 1898, joined: 1920, champs: [1925, 1947], afl: [], prev: 'Chicago Cardinals (1920–59), St. Louis Cardinals (1960–87), Phoenix Cardinals (1988–93)', icons: ['Larry Fitzgerald', 'Kurt Warner', 'Aeneas Williams', 'Patrick Peterson'] },
  ATL: { f: 1966, joined: 1966, champs: [], afl: [], icons: ['Matt Ryan', 'Julio Jones', 'Deion Sanders', 'Tony Gonzalez'] },
  BAL: { f: 1996, joined: 1996, champs: [], afl: [], icons: ['Ray Lewis', 'Ed Reed', 'Jonathan Ogden', 'Lamar Jackson'] },
  BUF: { f: 1960, joined: 1960, champs: [], afl: [1964, 1965], icons: ['Jim Kelly', 'Bruce Smith', 'Thurman Thomas', 'Josh Allen'] },
  CAR: { f: 1995, joined: 1995, champs: [], afl: [], icons: ['Cam Newton', 'Steve Smith Sr.', 'Luke Kuechly', 'Julius Peppers'] },
  CHI: { f: 1920, joined: 1920, champs: [1921, 1932, 1933, 1940, 1941, 1943, 1946, 1963], afl: [], prev: 'Decatur Staleys (1920), Chicago Staleys (1921)', icons: ['Walter Payton', 'Dick Butkus', 'Gale Sayers', 'Brian Urlacher'] },
  CIN: { f: 1968, joined: 1968, champs: [], afl: [], icons: ['Anthony Muñoz', 'Ken Anderson', 'Joe Burrow', "Ja'Marr Chase"] },
  CLE: { f: 1946, joined: 1950, champs: [1950, 1954, 1955, 1964], afl: [], note: 'Also won all four AAFC titles (1946–49).', icons: ['Jim Brown', 'Otto Graham', 'Ozzie Newsome', 'Joe Thomas'] },
  DAL: { f: 1960, joined: 1960, champs: [], afl: [], icons: ['Emmitt Smith', 'Troy Aikman', 'Roger Staubach', 'Michael Irvin'] },
  DEN: { f: 1960, joined: 1960, champs: [], afl: [], icons: ['John Elway', 'Terrell Davis', 'Champ Bailey', 'Von Miller'] },
  DET: { f: 1930, joined: 1930, champs: [1935, 1952, 1953, 1957], afl: [], prev: 'Portsmouth Spartans (1930–33)', icons: ['Barry Sanders', 'Calvin Johnson', 'Lem Barney', 'Joe Schmidt'] },
  GB: { f: 1919, joined: 1921, champs: [1929, 1930, 1931, 1936, 1939, 1944, 1961, 1962, 1965], nfl6669: [1966, 1967], afl: [], icons: ['Bart Starr', 'Brett Favre', 'Aaron Rodgers', 'Reggie White'] },
  HOU: { f: 2002, joined: 2002, champs: [], afl: [], icons: ['J.J. Watt', 'Andre Johnson', 'DeAndre Hopkins', 'C.J. Stroud'] },
  IND: { f: 1953, joined: 1953, champs: [1958, 1959], nfl6669: [1968], afl: [], prev: 'Baltimore Colts (1953–83)', icons: ['Peyton Manning', 'Johnny Unitas', 'Marvin Harrison', 'Edgerrin James'] },
  JAX: { f: 1995, joined: 1995, champs: [], afl: [], icons: ['Tony Boselli', 'Fred Taylor', 'Maurice Jones-Drew', 'Jimmy Smith'] },
  KC: { f: 1960, joined: 1960, champs: [], afl: [1962, 1966, 1969], prev: 'Dallas Texans (1960–62)', icons: ['Patrick Mahomes', 'Len Dawson', 'Derrick Thomas', 'Tony Gonzalez'] },
  LV: { f: 1960, joined: 1960, champs: [], afl: [1967], prev: 'Oakland Raiders (1960–81, 1995–2019), Los Angeles Raiders (1982–94)', icons: ['Marcus Allen', 'Tim Brown', 'Gene Upshaw', 'Howie Long'] },
  LAC: { f: 1960, joined: 1960, champs: [], afl: [1963], prev: 'Los Angeles Chargers (1960), San Diego Chargers (1961–2016)', icons: ['LaDainian Tomlinson', 'Junior Seau', 'Dan Fouts', 'Philip Rivers'] },
  LAR: { f: 1936, joined: 1937, champs: [1945, 1951], afl: [], prev: 'Cleveland Rams (1937–45), St. Louis Rams (1995–2015)', icons: ['Eric Dickerson', 'Deacon Jones', 'Isaac Bruce', 'Aaron Donald'] },
  MIA: { f: 1966, joined: 1966, champs: [], afl: [], note: 'The 1972 Dolphins (17–0) are the NFL\'s only perfect season.', icons: ['Dan Marino', 'Larry Csonka', 'Bob Griese', 'Jason Taylor'] },
  MIN: { f: 1961, joined: 1961, champs: [], nfl6669: [1969], afl: [], icons: ['Fran Tarkenton', 'Randy Moss', 'Adrian Peterson', 'Alan Page'] },
  NE: { f: 1960, joined: 1960, champs: [], afl: [], prev: 'Boston Patriots (1960–70)', icons: ['Tom Brady', 'Rob Gronkowski', 'John Hannah', 'Ty Law'] },
  NO: { f: 1967, joined: 1967, champs: [], afl: [], icons: ['Drew Brees', 'Willie Roaf', 'Rickey Jackson', 'Cameron Jordan'] },
  NYG: { f: 1925, joined: 1925, champs: [1927, 1934, 1938, 1956], afl: [], icons: ['Lawrence Taylor', 'Michael Strahan', 'Eli Manning', 'Frank Gifford'] },
  NYJ: { f: 1960, joined: 1960, champs: [], afl: [1968], prev: 'New York Titans (1960–62)', icons: ['Joe Namath', 'Curtis Martin', 'Darrelle Revis', 'Kevin Mawae'] },
  PHI: { f: 1933, joined: 1933, champs: [1948, 1949, 1960], afl: [], icons: ['Reggie White', 'Brian Dawkins', 'Chuck Bednarik', 'Jason Kelce'] },
  PIT: { f: 1933, joined: 1933, champs: [], afl: [], prev: 'Pittsburgh Pirates (1933–39)', icons: ['Terry Bradshaw', 'Joe Greene', 'Franco Harris', 'Troy Polamalu'] },
  SF: { f: 1946, joined: 1950, champs: [], afl: [], note: 'Played in the AAFC 1946–49.', icons: ['Joe Montana', 'Jerry Rice', 'Steve Young', 'Ronnie Lott'] },
  SEA: { f: 1976, joined: 1976, champs: [], afl: [], icons: ['Steve Largent', 'Walter Jones', 'Russell Wilson', 'Marshawn Lynch'] },
  TB: { f: 1976, joined: 1976, champs: [], afl: [], icons: ['Derrick Brooks', 'Warren Sapp', 'Ronde Barber', 'Tom Brady'] },
  TEN: { f: 1960, joined: 1960, champs: [], afl: [1960, 1961], prev: 'Houston Oilers (1960–96), Tennessee Oilers (1997–98)', icons: ['Earl Campbell', 'Warren Moon', 'Bruce Matthews', 'Derrick Henry'] },
  WAS: { f: 1932, joined: 1932, champs: [1937, 1942], afl: [], prev: 'Boston Braves (1932), Boston Redskins (1933–36), Washington (1937–2021)', icons: ['Sammy Baugh', 'Sonny Jurgensen', 'Darrell Green', 'Art Monk'] },
};

/* ------------------------------------------------------------------ records (through the 2025 season) */
const RECORDS = {
  Career: [
    ['Passing yards', 'Tom Brady', '89,214', '2000–22'],
    ['Passing touchdowns', 'Tom Brady', '649', '2000–22'],
    ['Rushing yards', 'Emmitt Smith', '18,355', '1990–2004'],
    ['Rushing touchdowns', 'Emmitt Smith', '164', '1990–2004'],
    ['Receptions', 'Jerry Rice', '1,549', '1985–2004'],
    ['Receiving yards', 'Jerry Rice', '22,895', '1985–2004'],
    ['Total touchdowns', 'Jerry Rice', '208', '1985–2004'],
    ['Sacks (since 1982)', 'Bruce Smith', '200', '1985–2003'],
    ['Interceptions', 'Paul Krause', '81', '1964–79'],
    ['Points', 'Adam Vinatieri', '2,673', '1996–2019'],
    ['Games played', 'Morten Andersen', '382', '1982–2007'],
    ['Coaching wins (incl. playoffs)', 'Don Shula', '347', '1963–95'],
  ],
  Season: [
    ['Passing yards', 'Peyton Manning, DEN', '5,477', '2013'],
    ['Passing touchdowns', 'Peyton Manning, DEN', '55', '2013'],
    ['Rushing yards', 'Eric Dickerson, LA Rams', '2,105', '1984'],
    ['Rushing touchdowns', 'LaDainian Tomlinson, SD', '28', '2006'],
    ['Receptions', 'Michael Thomas, NO', '149', '2019'],
    ['Receiving yards', 'Calvin Johnson, DET', '1,964', '2012'],
    ['Receiving touchdowns', 'Randy Moss, NE', '23', '2007'],
    ['Sacks', 'Myles Garrett, CLE', '23', '2025', 'new'],
    ['Interceptions', 'Night Train Lane, LA Rams', '14', '1952'],
    ['Points', 'LaDainian Tomlinson, SD', '186', '2006'],
    ['Team points', 'Denver Broncos', '606', '2013'],
    ['Regular-season wins', 'New England Patriots', '16–0', '2007'],
  ],
  Game: [
    ['Passing yards', 'Norm Van Brocklin, LA Rams', '554', '1951'],
    ['Passing touchdowns', 'Eight players (most recently Drew Brees, NO)', '7', '2015'],
    ['Rushing yards', 'Adrian Peterson, MIN', '296', '2007'],
    ['Rushing touchdowns', 'Ernie Nevers, Chi. Cardinals', '6', '1929'],
    ['Receptions', 'Brandon Marshall, DEN', '21', '2009'],
    ['Receiving yards', 'Flipper Anderson, LA Rams', '336', '1989'],
    ['Longest field goal', 'Cam Little, JAX', '68 yds', '2025', 'new'],
    ['Points (team)', 'Washington vs. NY Giants', '72', '1966'],
  ],
};

/* ------------------------------------------------------------------ Hall of Fame (recent classes) */
const HOF = [
  [2025, ['Eric Allen', 'Jared Allen', 'Antonio Gates', 'Sterling Sharpe']],
  [2024, ['Dwight Freeney', 'Randy Gradishar', 'Devin Hester', 'Andre Johnson', 'Steve McMichael', 'Julius Peppers', 'Patrick Willis']],
  [2023, ['Ronde Barber', 'Don Coryell', 'Chuck Howley', 'Joe Klecko', 'Darrelle Revis', 'Ken Riley', 'Joe Thomas', 'Zach Thomas', 'DeMarcus Ware']],
  [2022, ['Tony Boselli', 'Cliff Branch', 'LeRoy Butler', 'Art McNally', 'Sam Mills', 'Richard Seymour', 'Dick Vermeil', 'Bryant Young']],
  [2021, ['Alan Faneca', 'Tom Flores', 'Calvin Johnson', 'John Lynch', 'Peyton Manning', 'Bill Nunn', 'Drew Pearson', 'Charles Woodson']],
];

/* Hall of Famers: position and the team most associated with them, for the row's logo tile (icon-rows, approved 2026-11-07) */
const HOF_X = {
  'Eric Allen': ['CB', 'PHI'], 'Jared Allen': ['DE', 'MIN'], 'Antonio Gates': ['TE', 'LAC'], 'Sterling Sharpe': ['WR', 'GB'],
  'Dwight Freeney': ['DE', 'IND'], 'Randy Gradishar': ['LB', 'DEN'], 'Devin Hester': ['KR', 'CHI'], 'Andre Johnson': ['WR', 'HOU'], 'Steve McMichael': ['DT', 'CHI'], 'Julius Peppers': ['DE', 'CAR'], 'Patrick Willis': ['LB', 'SF'],
  'Ronde Barber': ['CB', 'TB'], 'Don Coryell': ['Coach', 'LAC'], 'Chuck Howley': ['LB', 'DAL'], 'Joe Klecko': ['DL', 'NYJ'], 'Darrelle Revis': ['CB', 'NYJ'], 'Ken Riley': ['CB', 'CIN'], 'Joe Thomas': ['OT', 'CLE'], 'Zach Thomas': ['LB', 'MIA'], 'DeMarcus Ware': ['LB', 'DAL'],
  'Tony Boselli': ['OT', 'JAX'], 'Cliff Branch': ['WR', 'LV'], 'LeRoy Butler': ['S', 'GB'], 'Art McNally': ['Contributor'], 'Sam Mills': ['LB', 'CAR'], 'Richard Seymour': ['DL', 'NE'], 'Dick Vermeil': ['Coach', 'PHI'], 'Bryant Young': ['DT', 'SF'],
  'Alan Faneca': ['G', 'PIT'], 'Tom Flores': ['Coach', 'LV'], 'Calvin Johnson': ['WR', 'DET'], 'John Lynch': ['S', 'TB'], 'Peyton Manning': ['QB', 'IND'], 'Bill Nunn': ['Contributor', 'PIT'], 'Drew Pearson': ['WR', 'DAL'], 'Charles Woodson': ['CB', 'LV'],
};

/* ------------------------------------------------------------------ helpers */
const T = abbr => Dt.team(abbr);
function teamName(abbr, then) { return then || T(abbr).full; }
function sbCounts() {
  const c = {};
  playedSBs().forEach(sb => {
    (c[sb.w] = c[sb.w] || { w: 0, l: 0 }).w++;
    (c[sb.l] = c[sb.l] || { w: 0, l: 0 }).l++;
  });
  return c;
}

/* ------------------------------------------------------------------ routes */
App.route('history', () => {
  const sbs = playedSBs(), last = sbs[sbs.length - 1];
  const counts = sbCounts();
  const top = Object.entries(counts).sort((a, b) => b[1].w - a[1].w || a[1].l - b[1].l).slice(0, 5);
  const fav = store.p.primary && Dt.team(store.p.primary);
  return { title: 'History', html: html`
    <div class="pad mt8">
      ${(() => { const g = sbGame(last); return html`<div class="hx-champ" style="${raw(App.teamVars(T(last.w)))}">
        <a class="hx-champ-t tap" data-go="#/super-bowls"><div><span class="hx-champ-eb">Reigning champions</span>
          <div class="hx-champ-n">${T(last.w).name.toUpperCase()}</div>
          <p>Super Bowl ${last.n} · ${T(last.w).abbr} ${last.ws}-${last.ls} ${T(last.l).abbr}</p></div>${UI.logo(last.w, 'lg')}</a>
        ${g ? html`<button class="btn white sm mt12" data-go="#/game/${g.id}">${icon('play', 'sm')}Relive Super Bowl ${last.n}</button>` : ''}
      </div>`; })()}
    </div>
    ${sh('Most Super Bowl titles', 'All ' + sbs.length, '#/super-bowls')}
    <div class="list">${top.map(([ab, c], i) => UI.rankRow({ rank: i + 1, tid: T(ab).id, sub: `${c.w + c.l} appearances`, value: c.w, mine: store.p.teams.includes(T(ab).id), go: `#/franchise/${T(ab).id}` }))}</div>
    ${sh('Explore the past')}
    <div class="list">
      ${UI.row({ left: html`<div class="hx-ic">${icon('trophy')}</div>`, title: 'Every Super Bowl', sub: `I through ${last.n} — scores, MVPs, venues`, go: '#/super-bowls' })}
      ${UI.row({ left: html`<div class="hx-ic">${icon('chart')}</div>`, title: 'Record book', sub: 'Career, season and single-game records', go: '#/records' })}
      ${UI.row({ left: html`<div class="hx-ic">${icon('star')}</div>`, title: 'Hall of Fame', sub: 'Recent enshrinement classes', go: '#/hof' })}
      ${fav ? UI.row({ left: UI.logo(fav.id, 'md'), title: `${fav.name} history`, sub: 'Titles, eras, icons and recent seasons', go: `#/franchise/${fav.id}` }) : ''}
    </div>
    ${sh('Franchise histories')}
    <div class="hx-grid pad">${Dt.D.teams.slice().sort((a, b) => a.name.localeCompare(b.name)).map(t => html`<a class="hx-team tap" data-go="#/franchise/${t.id}">${UI.logo(t.id, 'md')}<span>${t.name}</span></a>`)}</div>
  ` };
});

/** one Super Bowl row (approved franchise-sb 2026-11-07, sb-rows v3 B 2026-11-08): the numeral big (30px) on the left with the year,
    both teams (winner bold), scores in Display, MVP as Meta, the winner's team-colour edge */
function sbRow(sb) {
  const g = sbGame(sb);
  return html`<div class="row ${g ? 'tap' : 'static'} sb-row r-sans" style="--e:${App.teamFill(T(sb.w))}" ${g ? raw(`data-go="#/game/${g.id}"`) : ''}><div class="sb-row-n"><b>${sb.n}</b><span>${sb.s + 1}</span></div>
    <div class="row-main">${[[sb.w, sb.ws, 1], [sb.l, sb.ls, 0]].map(([a, sc, w]) => html`<div class="sb-row-l ${w ? 'w' : ''}">${UI.logo(T(a).id, 'sm')}<span class="r-sans">${T(a).name}</span><b>${sc}</b></div>`)}
      ${sb.mvp ? html`<div class="row-sub">MVP ${sb.mvp}</div>` : ''}</div>${g ? icon('chev', 'sm chev') : ''}</div>`;
}

App.route('super-bowls', (p, q, page) => {
  const st = page.state = page.state || { filter: q.team || 'all' };
  const counts = sbCounts();
  let list = playedSBs().slice().reverse();
  if (st.filter !== 'all') list = list.filter(sb => sb.w === st.filter || sb.l === st.filter);
  const mine = store.p.teams.map(id => Dt.team(id).abbr);
  const chipTeams = ['all', ...new Set([...mine, 'NE', 'PIT', 'SF', 'DAL', 'KC', 'GB'])].slice(0, 9);
  return { title: 'Super Bowls', html: html`
    <p class="pg-intro mb12">${playedSBs().length} games since January 1967, under each team's current name.</p>
    <div class="pad sb-chips">${chipTeams.map(k => html`<button class="sc-season ${k === st.filter ? 'on' : ''}" data-act="sb-filter" data-arg="${k}">${k === 'all' ? '' : UI.logo(T(k).id, 'xs')}${k === 'all' ? 'All' : k}</button>`)}</div>
    ${st.filter !== 'all' && counts[st.filter] ? html`<div class="pad mt12">${UI.statRow([[counts[st.filter].w, 'Wins'], [counts[st.filter].l, 'Losses'], [counts[st.filter].w + counts[st.filter].l, 'Appearances']])}</div>` : ''}
    <div class="list mt12">${list.map(sbRow)}</div>` };
});
App.actions['sb-filter'] = (el, ev, k) => { App.current().state.filter = k; App.refresh(); };

App.route('records', (p, q, page) => {
  const st = page.state = page.state || { k: 'Career' };
  return { title: 'Record book', html: html`
    <div class="mt8">${UI.seg(Object.keys(RECORDS).map(k => ({ k, l: k === 'Game' ? 'Single game' : k === 'Season' ? 'Single season' : 'Career' })), st.k, 'rec-tab')}</div>
    <div class="list mt12">${RECORDS[st.k].map(r => UI.row({ title: r[0], sub: html`${r[1]} · ${r[3]}${r[4] ? html` <span class="badge accent" style="margin-left:4px">Set in ${r[3]}</span>` : ''}`,
      right: html`<span class="num b hx-rec">${r[2]}</span>` }))}</div>
    <div class="pad mt12 tiny">Regular season only, through the 2025 season. Sacks became official in 1982.</div>
    ${sh('Chasing history in ' + Dt.seasonForStats())}
    <div class="pad meta">Season leaders update live as games finish — see <a class="accent b" data-go="#/stats">Stats Center</a> for who's on pace.</div>` };
});
App.actions['rec-tab'] = (el, ev, k) => { App.current().state.k = k; App.refresh(); };

App.route('hof', () => ({ title: 'Hall of Fame', html: html`
  <p class="pg-intro">Every class is chosen the night before the Super Bowl and enshrined each August in Canton, Ohio.</p>
  ${HOF.map(([y, names]) => html`${sh('Class of ' + y)}<div class="list">${names.map(n => {
    const pid = Object.keys(Dt.D.players).find(id => Dt.D.players[id].n === n), [pos, ab] = HOF_X[n] || [], tm = ab && T(ab);
    return UI.row({ left: html`<span class="lead-tile">${tm ? UI.logo(tm.id, 'sm') : icon('star', 'sm')}</span>`, title: n, sub: [pos, tm && tm.name].filter(Boolean).join(' · '), go: pid ? `#/player/${pid}` : null });
  })}</div>`)}
  <div class="pad mt16 tiny">Includes players, coaches and contributors.</div>` }));

App.route('franchise/:id', (p) => {
  const tm = Dt.team(p.id); if (!tm) return { title: 'Franchise', html: UI.empty('info', 'Unknown team') };
  const fr = FR[tm.abbr] || {};
  const sbs = playedSBs().filter(sb => sb.w === tm.abbr || sb.l === tm.abbr);
  const wins = sbs.filter(sb => sb.w === tm.abbr);
  const titles = (fr.champs || []).length + wins.length;
  const now = time.now();
  const seasons = [2026, 2025, 2024, 2023, 2022].filter(s => { const w1 = Dt.week(s, 2, 1); return w1 && w1.start <= now; });
  return { title: tm.full, html: html`
    <div class="fr-hero" style="${raw(App.teamVars(tm))}"><div class="fr-hero-t"><div><span class="fr-hero-eb">Est. ${fr.f || '—'}${fr.prev ? ` · formerly ${fr.prev.replace(/\s*\([^)]*\)/g, '')}` : fr.joined && fr.joined !== fr.f ? ` · NFL since ${fr.joined}` : ''}</span>
      <div class="fr-hero-n">${tm.name.toUpperCase()}</div></div>${UI.logo(tm.id, 'lg')}</div>
      <div class="fr-hero-s">${[[titles, 'NFL titles'], [wins.length, 'SB wins'], [sbs.length, 'SB apps']].map(([v, l]) => html`<div><b>${v}</b><span>${l}</span></div>`)}</div></div>
    ${fr.note ? html`<p class="pg-intro mt16">${fr.note}</p>` : ''}
    ${sbs.length ? html`${sh('Super Bowl history')}<div class="list">${sbs.slice().reverse().map(sbRow)}</div>` : html`${sh('Super Bowl history')}<div class="pad meta">Still chasing a first Super Bowl appearance.</div>`}
    ${(fr.champs || []).length || (fr.afl || []).length || (fr.nfl6669 || []).length ? html`${sh('Pre-Super Bowl championships')}<div class="pad">
      ${(fr.champs || []).length ? html`<div class="meta">NFL: <span class="num">${fr.champs.join(', ')}</span></div>` : ''}
      ${(fr.nfl6669 || []).length ? html`<div class="meta mt6">NFL Championship Game (Super Bowl era): <span class="num">${fr.nfl6669.join(', ')}</span></div>` : ''}
      ${(fr.afl || []).length ? html`<div class="meta mt6">AFL: <span class="num">${fr.afl.join(', ')}</span></div>` : ''}</div>` : ''}
    ${sh('Recent seasons')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Season</th><th>W-L</th><th>PF</th><th>PA</th><th>Div</th><th>Playoffs</th></tr></thead><tbody>
      ${seasons.map(s => {
        const sd = Dt.standings(s, now); const r = sd.all.find(x => x.tid === tm.id);
        const divList = sd.div[tm.conf + ' ' + tm.div]; const dpos = divList.indexOf(r) + 1;
        const post = Dt.teamGames(tm.id, s).filter(g => g.t === 3 && g.w !== 4 && Dt.state(g, now) === 'post');
        let po = '—';
        if (post.length) { const lastG = post[post.length - 1]; const res = Dt.result(lastG, tm.id, now); po = lastG.w === 5 && res.r === 'W' ? 'Won SB' : (res.r === 'L' ? 'Lost ' : 'Won ') + Dt.weekLabel(3, lastG.w, true); }
        else if (s === Dt.seasonForStats(now) && r.gp < 17) po = 'In progress';
        return html`<tr class="${s === Dt.seasonForStats(now) ? 'hl' : ''}"><td>${s}</td><td>${r.w}-${r.l}${r.tie ? '-' + r.tie : ''}</td><td>${r.pf}</td><td>${r.pa}</td><td>${fmt.ord(dpos)}</td><td>${po}</td></tr>`;
      })}</tbody></table></div>
    ${fr.icons ? html`${sh('Franchise icons')}<div class="list">${fr.icons.map(n => {
      const pid = Object.keys(Dt.D.players).find(id => Dt.D.players[id].n === n);
      return pid ? UI.playerRow(pid, { sub: 'Active · ' + [Dt.player(pid).pos, Dt.team(Dt.player(pid).t)?.abbr].join(' · ') }) : UI.row({ left: html`<div class="hx-ic">${icon('star')}</div>`, title: n });
    })}</div>` : ''}
    <div class="pad mt20 flex gap8 wrap"><button class="btn sm ghost" data-go="#/team/${tm.id}">${icon('teams', 'sm')} Team hub</button><button class="btn sm ghost" data-go="#/super-bowls?team=${tm.abbr}">${icon('trophy', 'sm')} Super Bowls</button></div>` };
});

App.history = { SB, FR, RECORDS, HOF, sbCounts, playedSBs };
})();
