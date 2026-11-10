/* Approvals rounds 5 (molecules) and 6 (organisms): every element not yet reviewed, from the inventory of the app.
   They are queued; each gets its Current and Proposed drawn once the round below it is locked. */
(function () {
"use strict";
const { none, phone } = DSApprovals.h;
/* a real card written in round5-a/b/c.js (window.R5_CARDS[id]) replaces the queued placeholder */
const R5 = window.R5_CARDS || {};
const card = (tier) => x => R5[x.id] ? { tier, ctx: [x.route, x.sel], ...R5[x.id] } : ({ id: x.id, v: 1, tier, name: x.name, target: x.target, ctx: [x.route, x.sel], changes: [`Lives in: ${x.where}.`].concat(x.issues ? [`Found so far: ${x.issues}`] : []),
  current: () => phone(x.route), proposed: () => none('Drawn once the round below is locked.') });
DSApprovals.add(5, [
{
"id": "ticker",
"name": "Live score ticker",
"target": "homeParts.ticker() \u00b7 .ticker .tk-row",
"where": "top of Home sheet",
"route": "home",
"sel": ".ticker",
"issues": "Not reviewed; quarter/clock in red on surface."
},
{
"id": "game-row",
"name": "Compact game row",
"target": "UI.gameRow() \u00b7 schedules",
"where": "team schedule, player schedule",
"route": "team/__TEAM__",
"sel": ".gameRow",
"issues": "Not the approved game card; a second game-summary style."
},
{
"id": "scores-item",
"name": "Scores list item",
"target": "scores.js gameItem() \u00b7 .sc-item .sc-tv",
"where": "Scores tab",
"route": "scores",
"sel": ".js",
"issues": "Scores list may not use the approved UI.gameCard everywhere: check .sc-item vs .gcard."
},
{
"id": "week-strip",
"name": "Week strip + season picker",
"target": "scores.js weekStrip() \u00b7 .sc-strip .sc-season",
"where": "Scores, standings",
"route": "scores",
"sel": ".js",
"issues": "Season picker is a 99px round button."
},
{
"id": "bye-row",
"name": "Bye teams",
"target": "scores.js \u00b7 .sc-bye",
"where": "Scores",
"route": "scores",
"sel": ".js",
"issues": "Pill-shaped label, own font."
},
{
"id": "news-card",
"name": "News card",
"target": "UI.newsCard() \u00b7 .row.tap .h4.clamp3",
"where": "Home, News, team, search",
"route": "team/__TEAM__",
"sel": ".newsCard",
"issues": "Never approved; headline is .h4 role."
},
{
"id": "news-list",
"name": "News list + article",
"target": "home.js news route \u00b7 articleView() \u00b7 .article-body .ar-tag",
"where": "News tab, article/:id",
"route": "news",
"sel": ".js",
"issues": "Article tags are one-off pills (.ar-tag)."
},
{
"id": "video-card",
"name": "Video card (standard)",
"target": "UI.videoCard() \u00b7 watch wcard() .w-card",
"where": "Watch rails, team videos",
"route": "watch",
"sel": ".videoCard",
"issues": "Media atoms built; card layout itself only built as the Featured variant."
},
{
"id": "continue-watching",
"name": "Continue watching",
"target": "watchParts.continueWatching() \u00b7 .w-cw .w-cw-bar",
"where": "Watch",
"route": "watch",
"sel": ".continueWatching",
"issues": "Progress bar style differs from .thumb-prog."
},
{
"id": "poster",
"name": "Show poster",
"target": "watch.js poster() \u00b7 .w-poster",
"where": "Watch shows/episodes",
"route": "watch",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "watch-game-tile",
"name": "Watch game tile",
"target": "watch.js gameTile() \u00b7 .w-game .w-ok/.w-no",
"where": "Watch \"games\" rail",
"route": "watch",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "plan-card",
"name": "NFL+ plan card",
"target": "watch.js seasonPlan() \u00b7 plans route \u00b7 .w-plan",
"where": "Plans, upsell",
"route": "plans",
"sel": ".js",
"issues": ".w-plan.focus uses inset ring in accent; logo added but card layout never approved."
},
{
"id": "upsell-sheet",
"name": "Upsell sheet",
"target": "watch.js upsellSheet() \u00b7 .sheet",
"where": "tapping locked video",
"route": "watch",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "where-resolver",
"name": "Where-to-watch resolver",
"target": "watch.js resolver() \u00b7 .w-res",
"where": "where-to-watch route",
"route": "where-to-watch",
"sel": ".js",
"issues": "Rows approved (wlRow) but the resolver header block not."
},
{
"id": "audio-sheet",
"name": "Audio player sheet",
"target": "watch.js audioSheet() \u00b7 .w-aplayer .w-wave",
"where": "Watch audio feeds",
"route": "watch",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "rz-panel",
"name": "RedZone panel + chyron",
"target": "UI.rzPanel() \u00b7 .rzp \u00b7 rzChyron() .rzh-chy \u00b7 rzFollowed() .rzf",
"where": "Scores top, RedZone page",
"route": "home",
"sel": ".rzPanel",
"issues": "rzCard built, but panel/chyron/followed list not. .rzh has a red radial glow background."
},
{
"id": "now-card",
"name": "Live now card",
"target": "gameParts.nowCard() \u00b7 liveBox \u00b7 down & distance",
"where": "game Live tab",
"route": "game/__LIVE__",
"sel": ".nowCard",
"issues": "Never reviewed."
},
{
"id": "wp-card",
"name": "Win probability chart",
"target": "gameParts.wpCard() \u00b7 UI.wpChart() \u00b7 .gc-card",
"where": "game Live/Recap",
"route": "game/__LIVE__",
"sel": ".wpCard",
"issues": "Never reviewed."
},
{
"id": "field-viz",
"name": "Mini field / field viz",
"target": "UI.field() \u00b7 UI.fieldViz()",
"where": "game Live, explainer sheet, ticker",
"route": "game/__LIVE__",
"sel": ".field",
"issues": "Never reviewed."
},
{
"id": "play-row",
"name": "Play row",
"target": "game.js playRow() \u00b7 .gc-play",
"where": "Live feed, scoring plays",
"route": "home",
"sel": ".js",
"issues": "Drive summary built; individual play rows in live feed not."
},
{
"id": "key-moments",
"name": "Key moments",
"target": "gameParts.keyMoments() \u00b7 .km-dur",
"where": "game Recap/Live",
"route": "game/__LIVE__",
"sel": ".keyMoments",
"issues": ".km-dur duplicates the approved duration pill."
},
{
"id": "catch-up",
"name": "Catch up",
"target": "gameParts.catchUp() \u00b7 home catchupCard()",
"where": "game, Home",
"route": "game/__LIVE__",
"sel": ".catchUp",
"issues": "Never reviewed."
},
{
"id": "box-score",
"name": "Box score table",
"target": "game.js boxTab() \u00b7 .tbl",
"where": "game Box tab",
"route": "game/__LIVE__?tab=box",
"sel": ".js",
"issues": "Tables never reviewed as a component (.tbl used on team stats, splits, game log too)."
},
{
"id": "team-compare",
"name": "Team comparison rows",
"target": "game.js teamTab() cmpRow() \u00b7 .cmp .gc-cmphead",
"where": "game Team tab",
"route": "game/__LIVE__?tab=team",
"sel": ".js",
"issues": "Overlaps the approved glance card; two styles of the same comparison."
},
{
"id": "pregame-scene",
"name": "Pregame scene",
"target": "gameParts.pregameScene() \u00b7 arrival/gates timeline",
"where": "game Preview",
"route": "game/__LIVE__",
"sel": ".pregameScene",
"issues": "Visible in Broncos screenshot (Gameday at SoFi): never approved."
},
{
"id": "game-actions",
"name": "Game action strip",
"target": "gameParts.actionsStrip()",
"where": "under game hero",
"route": "game/__LIVE__",
"sel": ".actionsStrip",
"issues": "Horizontal buttons cropped off-screen (\"All options\" cut)."
},
{
"id": "predict",
"name": "Predict tab",
"target": "game.js predictTab()",
"where": "game Predict",
"route": "game/__LIVE__?tab=predict",
"sel": ".js",
"issues": "Check copy for betting language; never reviewed."
},
{
"id": "react-tab",
"name": "React tab",
"target": "game.js reactTab() rxPulse rxFeed \u00b7 .rx .rx-chip .rx-take",
"where": "game React",
"route": "game/__LIVE__?tab=react",
"sel": ".js",
"issues": "Emoji reactions; pill chips."
},
{
"id": "recap",
"name": "Game recap",
"target": "game.js recapTab() genRecap()",
"where": "game Recap",
"route": "game/__LIVE__?tab=recap",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "video-player",
"name": "Video player + PiP",
"target": "game.js playerHtml() pipChrome \u00b7 .gcp-mode .pip-open",
"where": "game replay, PiP",
"route": "game/__LIVE__",
"sel": ".js",
"issues": "Mode toggle is pill-shaped buttons on rgba black."
},
{
"id": "celebrate",
"name": "Score celebration",
"target": "UI.celebrate() \u00b7 .cel-bg .cel-snd",
"where": "full-screen on TD/FG",
"route": "home",
"sel": ".celebrate",
"issues": "Radial glow background (.cel-bg) and pill sound button: glow rule."
},
{
"id": "milestone",
"name": "Milestone card",
"target": "UI.milestone() \u00b7 .ms-bg",
"where": "clinch, streak, stamp moments",
"route": "home",
"sel": ".milestone",
"issues": "Radial glow background (.ms-bg)."
},
{
"id": "player-row",
"name": "Team / player row",
"target": "UI.teamRow() \u00b7 UI.playerRow()",
"where": "search, roster, following, onboarding",
"route": "home",
"sel": ".teamRow",
"issues": "Never reviewed."
},
{
"id": "roster",
"name": "Roster + depth chart",
"target": "teams.js roster() depthChart()",
"where": "team Roster",
"route": "team/__TEAM__?tab=roster",
"sel": ".js",
"issues": "Sort chips are round .chip."
},
{
"id": "team-switcher",
"name": "Team switcher",
"target": "teamParts.switcher() \u00b7 .tm-sw",
"where": "top of team page",
"route": "team/__TEAM__",
"sel": ".switcher",
"issues": "Pill-shaped pressable chips (99px)."
},
{
"id": "team-pr-card",
"name": "Power ranking card",
"target": "teamParts.prCard() \u00b7 .tm-pr-n",
"where": "team Overview",
"route": "team/__TEAM__",
"sel": ".prCard",
"issues": "Never reviewed."
},
{
"id": "team-leaders",
"name": "Team leaders",
"target": "teamParts.leaders()",
"where": "team Overview",
"route": "team/__TEAM__",
"sel": ".leaders",
"issues": "Game leaders approved; team leaders are a different layout of the same idea."
},
{
"id": "team-moves",
"name": "Transactions row",
"target": "teams.js moves() \u00b7 offseason txRow()",
"where": "team More, Transactions",
"route": "transactions",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "cap-table",
"name": "Salary cap",
"target": "teams.js cap() \u00b7 offseason cap route",
"where": "team More, cap",
"route": "cap",
"sel": ".js",
"issues": "Money values; never reviewed."
},
{
"id": "pr-board",
"name": "Power rankings board",
"target": "statsParts.prBoard() prRow() \u00b7 .sc-board .sc-lead",
"where": "Stats, power-rankings",
"route": "home",
"sel": ".prBoard",
"issues": "Never reviewed."
},
{
"id": "leaders-board",
"name": "League leaders",
"target": "stats.js leadRow() board()",
"where": "Stats, leaders",
"route": "leaders",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "compare",
"name": "Player/team compare",
"target": "stats.js comparePlayers() compareTeams() \u00b7 .cmp-vs",
"where": "compare route",
"route": "compare",
"sel": ".js",
"issues": ".cmp-vs is Display at small size."
},
{
"id": "poll-card",
"name": "Poll card",
"target": "community.js pollCard()",
"where": "Community, Home",
"route": "polls",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "community-fan",
"name": "Community fan level card",
"target": "community.js fanCard() \u00b7 .cm-fan",
"where": "Community top",
"route": "community",
"sel": ".js",
"issues": "Duplicates the approved You fan card with a different design; was darkened (fixed today)."
},
{
"id": "squad-chat",
"name": "Squad chat",
"target": "squad/:id \u00b7 .cm-msg",
"where": "Community squads",
"route": "squad/1",
"sel": ".cm-msg",
"issues": "Emoji in seed messages."
},
{
"id": "pickem",
"name": "Pick'em",
"target": "community.js pickem route",
"where": "Community",
"route": "pickem",
"sel": ".js",
"issues": "Copy is fine (\"no money, no odds\"); UI never reviewed."
},
{
"id": "ticket-picker",
"name": "Ticket seat map",
"target": "fanlife.js bowlSvg() secPrice() \u00b7 tickets/:gid",
"where": "Tickets",
"route": "tickets",
"sel": ".js",
"issues": "Prices shown; never reviewed."
},
{
"id": "shop",
"name": "Shop + jersey",
"target": "fanlife.js shop route jerseySvg() \u00b7 .fl-jwrap .fl-qty",
"where": "Shop",
"route": "shop",
"sel": ".js",
"issues": "Jersey drop-shadow; round qty stepper."
},
{
"id": "stadium-cards",
"name": "Stadium cards + mode",
"target": "fanlife.js stadiums stadium/:tid stadiumMode()",
"where": "Stadiums, team stadium",
"route": "stadiums",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "draft-pick",
"name": "Draft pick row/card",
"target": "offseason.js pickRow() pickCard() \u00b7 .ox-ov",
"where": "Draft, mock draft",
"route": "draft",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "bracket",
"name": "Playoff bracket + picture",
"target": "scores.js bracket() matchup() superBowl() \u00b7 .br-m .sb-card",
"where": "Playoffs",
"route": "playoffs",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "multiview-tile",
"name": "Multiview tile",
"target": "scores.js mvTile() \u00b7 .mv-tile",
"where": "Multiview",
"route": "multiview",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "mini-bug",
"name": "Header mini game bug",
"target": "home.js miniHtml() \u00b7 .mb-tm",
"where": "header when a game is live",
"route": "game/__LIVE__",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "learn-diagrams",
"name": "Learn diagrams",
"target": "learn.js fieldSvg formationSvg bracketSvg scorebugSvg \u00b7 .lr-dia",
"where": "Learn lessons",
"route": "learn",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "settings-row",
"name": "Settings row + group",
"target": "you.js setRow() \u00b7 timemachine set-group \u00b7 .set-ic .set-val",
"where": "Settings, time machine",
"route": "settings/alerts",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "search",
"name": "Search results/idle",
"target": "home.js searchResults() searchIdle() \u00b7 .search-field",
"where": "Search",
"route": "search",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "inbox",
"name": "Inbox row",
"target": "home.js inbox route \u00b7 .ib-row.unread",
"where": "Inbox",
"route": "inbox",
"sel": ".js",
"issues": "Unread uses inset accent bar."
}
].map(card("Molecules")));
DSApprovals.add(6, [
{
"id": "score-bug",
"name": "Score bug (pins on scroll)",
"target": "The bar that pins while you scroll a game",
"where": "Home, Watch, game page",
"route": "game/__LIVE__",
"sel": ".gc-hero",
"issues": ""
},
{
"id": "hero-helmets",
"name": "Matchup hero \u00b7 helmets",
"target": "Size, placement and which way each faces",
"where": "Home, Watch, game page",
"route": "game/__LIVE__",
"sel": ".gc-hero",
"issues": ""
},
{
"id": "hero-status",
"name": "Matchup hero \u00b7 status and meta",
"target": "Live / Final / kickoff pills, down and distance, network and venue",
"where": "Home, Watch, game page",
"route": "game/__LIVE__",
"sel": ".gc-hero",
"issues": ""
},
{
"id": "hero-score",
"name": "Matchup hero \u00b7 score and clock",
"target": "Where the score, clock and kickoff time sit, and how a loss is shown",
"where": "Home, Watch, game page",
"route": "game/__LIVE__",
"sel": ".gc-hero",
"issues": ""
},
{
"id": "hero-names",
"name": "Matchup hero \u00b7 team names and records",
"target": "Name vs tricode, size, and where the record sits",
"where": "Home, Watch, game page",
"route": "game/__LIVE__",
"sel": ".gc-hero",
"issues": ""
},
{
"id": "hero-surface",
"name": "Matchup hero \u00b7 surface",
"target": "How the two teams share the hero: diagonal split, stacked bands, one team's stage, or a straight seam",
"where": "Home, Watch, game page",
"route": "game/__LIVE__",
"sel": ".gc-hero",
"issues": ""
},
{
"id": "app-chrome",
"name": "Status/moment bar + tab bar",
"target": ".statusbar .sb-tm \u00b7 .tabbar .tb-badge",
"where": "every screen",
"route": "home",
"sel": ".statusbar",
"issues": "Tab badge is Sans 800 9px: likely below the type scale; never approved."
},
{
"id": "home-stage",
"name": "Home fan stage",
"target": "homeParts.fanHeader() \u00b7 .fx .fx-flag \u00b7 fxGame fxNums",
"where": "top of Home",
"route": "home",
"sel": ".fanHeader",
"issues": "Biggest surface in the app, never approved. .fx::before is a white radial glow; .fx-flag own pill."
},
{
"id": "home-pick-hero",
"name": "Pick-a-team hero",
"target": "homeParts.pickHero() \u00b7 .fh .fh-chip",
"where": "Home with no team",
"route": "team/__TEAM__",
"sel": ".pickHero",
"issues": "Hard-coded NFL blue gradient; round chips."
},
{
"id": "home-moment-heroes",
"name": "Draft / FA / kickoff heroes",
"target": "home.js draftHero() faHero() kickoffHero() \u00b7 .hm-hero .hm-kicker",
"where": "Home in off-season moments",
"route": "home",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "home-sotd",
"name": "Stat of the day",
"target": "homeParts.statOfDay() \u00b7 .hm-sotd",
"where": "Home sheet",
"route": "home",
"sel": ".hm-sotd",
"issues": "Split out of Home modules."
},
{
"id": "home-trivia",
"name": "Daily trivia",
"target": "homeParts.triviaTeaser() \u00b7 .hm-trivia .hm-opt",
"where": "Home sheet",
"route": "home",
"sel": ".hm-trivia",
"issues": "Split out of Home modules."
},
{
"id": "home-stakes",
"name": "What's at stake",
"target": "homeParts.stakesBlock() \u00b7 .sk .sk-tbl .sk-rival",
"where": "Home sheet",
"route": "home",
"sel": ".sk",
"issues": "Split out of Home modules."
},
{
"id": "home-recaps",
"name": "Recaps",
"target": "home.js recapsBlock() \u00b7 .hm-recap .hm-mini-sc",
"where": "Home sheet",
"route": "home",
"sel": ".hm-recap",
"issues": "Split out of Home modules."
},
{
"id": "home-players",
"name": "Your players",
"target": "home.js tracker() trackerRows()",
"where": "Home sheet",
"route": "home",
"sel": ".row",
"issues": "Split out of Home modules."
},
{
"id": "home-other-teams",
"name": "Your other teams",
"target": "home.js otherTeams() \u00b7 .hm-tm",
"where": "Home sheet",
"route": "home",
"sel": ".hm-tm",
"issues": "Split out of Home modules."
},
{
"id": "home-weekend",
"name": "Your weekend / Kickoffs, your time",
"target": "home.js forYou() casual and intl \u00b7 .fy-when",
"where": "Home sheet",
"route": "home",
"sel": ".fy-when",
"issues": "Split out of Home modules."
},
{
"id": "home-numbers",
"name": "By the numbers",
"target": "home.js forYou() analyst \u00b7 .fy-tiles",
"where": "Home sheet",
"route": "home",
"sel": ".fy-tiles",
"issues": "Split out of Home modules."
},
{
"id": "home-inside",
"name": "Inside the team",
"target": "home.js forYou() diehard",
"where": "Home sheet",
"route": "home",
"sel": ".sec",
"issues": "Split out of Home modules."
},
{
"id": "home-fresh",
"name": "Watch it fresh",
"target": "home.js forYou() spoiler",
"where": "Home sheet",
"route": "home",
"sel": ".fy-calm",
"issues": "Split out of Home modules."
},
{
"id": "home-newfan",
"name": "New to football?",
"target": "home.js newFanCards()",
"where": "Home sheet",
"route": "home",
"sel": ".hm-learn",
"issues": "Split out of Home modules."
},
{
"id": "home-modules",
"name": "Home modules",
"target": "homeParts.stakesBlock() forYou() \u00b7 tracker() divisionBlock() recapsBlock() triviaTeaser() newFanCards() statOfDay()",
"where": "Home sheet",
"route": "home",
"sel": ".stakesBlock",
"issues": "Many modules, none approved; each with its own card style."
},
{
"id": "weekly-recap",
"name": "Weekly recap story",
"target": "homeParts.recapHtml() recapSlides() \u00b7 .wr",
"where": "Home recap",
"route": "home",
"sel": ".recapHtml",
"issues": "Gradient was darkened into shade 800 (fixed today); story layout never approved."
},
{
"id": "player-hero",
"name": "Player page: hero",
"target": "player.js hero() · .pl-hero .pl-bio",
"where": "player/:id",
"route": "player/__LIVE__",
"sel": ".pl-hero",
"issues": "Split out of Player page."
},
{
"id": "player-season",
"name": "Player page: season line",
"target": "player.js overview() · season tiles",
"where": "player/:id",
"route": "player/__LIVE__",
"sel": ".grid2",
"issues": "Split out of Player page."
},
{
"id": "player-games",
"name": "Player page: last and next game",
"target": "player.js overview() liveRow() lastRow() nextRow()",
"where": "player/:id",
"route": "player/__LIVE__",
"sel": ".list",
"issues": "Split out of Player page."
},
{
"id": "player-tables",
"name": "Player page: stat tables",
"target": "player.js gamelog() careerTab() splits()",
"where": "player/:id",
"route": "player/__LIVE__",
"sel": ".tbl",
"issues": "Split out of Player page."
},
{
"id": "player-advanced",
"name": "Player page: advanced",
"target": "player.js advancedTab() renderAdv()",
"where": "player/:id",
"route": "player/__LIVE__",
"sel": ".pl-adv",
"issues": "Split out of Player page."
},
{
"id": "player-contract",
"name": "Player page: contract",
"target": "player.js contract()",
"where": "player/:id",
"route": "player/__LIVE__",
"sel": ".big-num",
"issues": "Split out of Player page."
},
{
"id": "player-page",
"name": "Player page",
"target": "player.js hero() overview() gamelog() careerTab() splits() advancedTab() contract() video()",
"where": "player/:id",
"route": "player/__LIVE__",
"sel": ".js",
"issues": "Whole page never reviewed. \"Highest paid\" copy."
},
{
"id": "team-games",
"name": "Team page: games",
"target": "teams.js overview() · UI.gameCard()",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".cards",
"issues": "Split out of Team page tabs."
},
{
"id": "team-glance",
"name": "Team page: at a glance",
"target": "teams.js statTiles()",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".grid2",
"issues": "Split out of Team page tabs."
},
{
"id": "team-history",
"name": "Team page: season by season and rivalries",
"target": "teams.js history() rivals()",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".tm-yr",
"issues": "Split out of Team page tabs."
},
{
"id": "team-schedule",
"name": "Team page: schedule",
"target": "teams.js schedule()",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".gr",
"issues": "Split out of Team page tabs."
},
{
"id": "team-cap",
"name": "Team page: contracts",
"target": "teams.js cap()",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".tm-spend",
"issues": "Split out of Team page tabs."
},
{
"id": "team-views",
"name": "Team page: sub-tab picker",
"target": "teams.js teamBody() VIEWS",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".js",
"issues": "Third picker style."
},
{
"id": "team-stats",
"name": "Team page: stat leaders tables",
"target": "teams.js stats()",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".js",
"issues": "Bold tables, Defense runs off the edge."
},
{
"id": "team-draft",
"name": "Team page: draft classes",
"target": "teams.js draft()",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "team-stadium",
"name": "Team page: stadium",
"target": "teams.js stadium()",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "team-page-tabs",
"name": "Team page tab bodies",
"target": "teams.js overview() schedule() statTiles() rivals() draft() history() stadium()",
"where": "team/:id",
"route": "team/__TEAM__",
"sel": ".js",
"issues": "Hero, injuries, standings, rankings approved; Overview cards, Schedule, History, Stadium not."
},
{
"id": "watch-offseason",
"name": "Watch: hero with no games",
"target": "watch.js hero() offseason",
"where": "Watch tab",
"route": "watch",
"sel": ".js",
"issues": "Translucent button on colour."
},
{
"id": "watch-shortcuts",
"name": "Watch: shortcuts",
"target": "watch.js quick entry chips",
"where": "Watch tab",
"route": "watch",
"sel": ".js",
"issues": "Rounded chips, scroll off screen."
},
{
"id": "watch-channels",
"name": "Watch: 24/7 channels",
"target": "watch.js .w-chan",
"where": "Watch tab",
"route": "watch",
"sel": ".js",
"issues": "Split across the page."
},
{
"id": "watch-listen",
"name": "Watch: listen live",
"target": "watch.js .w-aud",
"where": "Watch tab",
"route": "watch",
"sel": ".js",
"issues": "Third tile style."
},
{
"id": "watch-locked",
"name": "Watch: what NFL+ adds",
"target": "watch.js softLock()",
"where": "Watch tab",
"route": "watch",
"sel": ".js",
"issues": "Four See plans in a row."
},
{
"id": "channel-page",
"name": "Channel page",
"target": "watch.js channelPage() grid()",
"where": "NFL Channel, NFL Network",
"route": "channel/nfl",
"sel": "@page",
"issues": ""
},
{
"id": "redzone-ask",
"name": "RedZone: the NFL+ ask",
"target": "watch.js redzonePage() .rzh-cta .rzh-bar",
"where": "RedZone",
"route": "channel/redzone",
"sel": ".rzh",
"issues": ""
},
{
"id": "redzone-stats",
"name": "RedZone: the day in numbers",
"target": "watch.js rzLive() .rz-stats",
"where": "RedZone",
"route": "channel/redzone",
"sel": ".rz-stats",
"issues": ""
},
{
"id": "ob-welcome",
"name": "Onboarding: welcome",
"target": "onboarding.js welcome()",
"where": "first run",
"route": "home",
"sel": "",
"issues": ""
},
{
"id": "ob-choice",
"name": "Onboarding: pick one",
"target": "onboarding.js .ob-opt .ob-tier .ob-loc",
"where": "first run",
"route": "home",
"sel": "",
"issues": ""
},
{
"id": "ob-quiz",
"name": "Onboarding: find-your-team questions",
"target": "onboarding.js quizView()",
"where": "first run",
"route": "home",
"sel": "",
"issues": ""
},
{
"id": "ob-matches",
"name": "Onboarding: your matches",
"target": "onboarding.js quizView() results",
"where": "first run",
"route": "home",
"sel": "",
"issues": ""
},
{
"id": "ob-players",
"name": "Onboarding: follow players",
"target": "onboarding.js pTile()",
"where": "first run",
"route": "home",
"sel": "",
"issues": ""
},
{
"id": "ob-providers",
"name": "Onboarding: what else you watch on",
"target": "onboarding.js watch() .ob-provs",
"where": "first run",
"route": "home",
"sel": "",
"issues": ""
},
{
"id": "ob-done",
"name": "Onboarding: all set",
"target": "onboarding.js done()",
"where": "first run",
"route": "home",
"sel": "",
"issues": ""
},
{
"id": "stats-pickers",
"name": "Stats + Leaders: pickers",
"target": "stats.js .chips",
"where": "Stats, Leaders",
"route": "stats",
"sel": ".chips",
"issues": ""
},
{
"id": "records-tabs",
"name": "Record book: switcher + rows",
"target": "stats.js records()",
"where": "Records",
"route": "records",
"sel": "@page",
"issues": ""
},
{
"id": "sb-filter",
"name": "Super Bowls: team filter",
"target": "history.js .chips",
"where": "Super Bowls",
"route": "super-bowls",
"sel": ".chips",
"issues": ""
},
{
"id": "sb-rows",
"name": "Super Bowls: game rows",
"target": "history.js rows",
"where": "Super Bowls",
"route": "super-bowls",
"sel": ".list",
"issues": ""
},
{
"id": "ranked-rows",
"name": "Ranked team rows",
"target": "history.js / stats.js .pr-row",
"where": "History, Stats",
"route": "history",
"sel": ".list",
"issues": ""
},
{
"id": "history-champ",
"name": "History: reigning champions",
"target": "history.js .hx-feature",
"where": "History",
"route": "history",
"sel": ".hx-feature",
"issues": ""
},
{
"id": "hub-tiles",
"name": "Hub shortcut tiles",
"target": "explore.js .ex-quick \u00b7 stats.js .sc-tools",
"where": "Explore, Stats",
"route": "explore",
"sel": ".ex-quick",
"issues": ""
},
{
"id": "you-follow",
"name": "You: your team and teams to follow",
"target": "you.js",
"where": "You",
"route": "you",
"sel": "",
"issues": ""
},
{
"id": "empty-state",
"name": "Empty states",
"target": "UI .empty",
"where": "Wallet, inbox\u2026",
"route": "wallet",
"sel": ".empty",
"issues": ""
},
{
"id": "learn-hero",
"name": "Learn: Football 101",
"target": "learn.js .lr-hero",
"where": "Learn",
"route": "learn",
"sel": ".lr-hero",
"issues": ""
},
{
"id": "inbox-rows",
"name": "Notifications: rows",
"target": "community.js .ib-day",
"where": "Inbox",
"route": "inbox",
"sel": "@page",
"issues": ""
},
{
"id": "icon-rows",
"name": "Rows that repeat one icon",
"target": "hof \u00b7 international \u00b7 watch-spots",
"where": "History, Fan life",
"route": "hof",
"sel": "@page",
"issues": ""
},
{
"id": "page-intro",
"name": "Page intros",
"target": "hof \u00b7 international \u00b7 stadiums \u00b7 watch-spots",
"where": "History, Fan life",
"route": "international",
"sel": "@page",
"issues": ""
},
{
"id": "franchise-hero",
"name": "Franchise page header",
"target": "history.js franchise/:id",
"where": "History",
"route": "franchise/12",
"sel": "@page",
"issues": ""
},
{
"id": "franchise-sb",
"name": "Franchise: Super Bowl rows",
"target": "history.js franchise/:id",
"where": "History",
"route": "franchise/12",
"sel": "@page",
"issues": ""
},
{
"id": "calendar-rows",
"name": "League calendar rows",
"target": "scores.js calendar",
"where": "Calendar",
"route": "calendar",
"sel": "@page",
"issues": ""
},
{
"id": "finder-filters",
"name": "Stat finder filters",
"target": "stats.js stat-finder",
"where": "Stats",
"route": "stat-finder",
"sel": "@page",
"issues": ""
},
{
"id": "table-mine",
"name": "Tables: your row + sort",
"target": "team-rankings, standings, leaders",
"where": "Stats",
"route": "team-rankings",
"sel": "@page",
"issues": ""
},
{
"id": "tickets-filter",
"name": "Tickets: team filter",
"target": "fanlife.js tickets",
"where": "Fan life",
"route": "tickets",
"sel": "@page",
"issues": ""
},
{
"id": "stadium-list",
"name": "Stadiums: card or list",
"target": "fanlife.js stadiums",
"where": "Fan life",
"route": "stadiums",
"sel": "@page",
"issues": ""
},
{
"id": "passport",
"name": "Stadium passport",
"target": "fanlife.js passport",
"where": "Fan life",
"route": "passport",
"sel": "@page",
"issues": ""
},
{
"id": "promo-card",
"name": "Team promo cards",
"target": "shop \u00b7 watch-spots",
"where": "Fan life",
"route": "shop",
"sel": "@page",
"issues": ""
},
{
"id": "lesson-page",
"name": "Learn: lesson page",
"target": "learn.js learn/:id",
"where": "Learn",
"route": "learn/basics",
"sel": "@page",
"issues": ""
},
{
"id": "answer-rows",
"name": "Trivia + poll answers",
"target": "community.js trivia polls",
"where": "Community",
"route": "trivia",
"sel": "@page",
"issues": ""
},
{
"id": "grade-picker",
"name": "Fan grades",
"target": "community.js grades",
"where": "Community",
"route": "grades",
"sel": "@page",
"issues": ""
},
{
"id": "pickem-game",
"name": "Pick'em: a game",
"target": "community.js pickem",
"where": "Community",
"route": "pickem",
"sel": "@page",
"issues": ""
},
{
"id": "summary-stats",
"name": "Summary numbers",
"target": "pickem \u00b7 free-agency \u00b7 catchup",
"where": "Community, Offseason",
"route": "pickem",
"sel": "@page",
"issues": ""
},
{
"id": "multi-filter",
"name": "Stacked filter rows",
"target": "transactions \u00b7 free-agency",
"where": "Offseason",
"route": "transactions",
"sel": "@page",
"issues": ""
},
{
"id": "podcast-rows",
"name": "Podcasts rows",
"target": "watch.js podcasts",
"where": "Watch",
"route": "podcasts",
"sel": "@page",
"issues": ""
},
{
"id": "catchup-rows",
"name": "Catch me up rows",
"target": "home.js catchup",
"where": "Home",
"route": "catchup",
"sel": "@page",
"issues": ""
},
{
"id": "cap-card",
"name": "Contracts & cap payroll",
"target": "offseason.js cap",
"where": "Offseason",
"route": "cap",
"sel": "@page",
"issues": ""
},
{
"id": "fan-level",
"name": "Fan level row",
"target": "community.js",
"where": "Community",
"route": "community",
"sel": "@page",
"issues": ""
},
{
"id": "tx-rows",
"name": "Transactions rows",
"target": "offseason.js transactions",
"where": "Offseason",
"route": "transactions",
"sel": "@page",
"issues": ""
},
{
"id": "hint-box",
"name": "Grey hint boxes",
"target": "you \u00b7 audio \u00b7 where-to-watch",
"where": "You, Watch",
"route": "you",
"sel": "@page",
"issues": ""
},
{
"id": "sub-tabs",
"name": "A switcher inside a tab",
"target": "game.js plays \u00b7 fans",
"where": "Game",
"route": "game/401772988?tab=plays",
"sel": "@page",
"issues": ""
},
{
"id": "mock-draft",
"name": "Mock draft",
"target": "offseason.js mock-draft",
"where": "Offseason",
"route": "mock-draft",
"sel": "@page",
"issues": ""
},
{
"id": "trip-timeline",
"name": "Trip timeline",
"target": "fanlife.js trip",
"where": "Fan life",
"route": "trip/401772988",
"sel": "@page",
"issues": ""
},
{
"id": "progress-ring",
"name": "Progress rings",
"target": "where-to-watch \u00b7 mock-draft \u00b7 downloads",
"where": "Watch, Offseason",
"route": "where-to-watch",
"sel": "@page",
"issues": ""
},
{
"id": "all-teams",
"name": "All teams grid",
"target": "teams.js teams/all",
"where": "Teams",
"route": "teams/all",
"sel": "@page",
"issues": ""
},
{
"id": "replay-rows",
"name": "Replays + audio rows",
"target": "watch.js replays audio",
"where": "Watch",
"route": "replays",
"sel": "@page",
"issues": ""
},
{
"id": "team-hero-actions",
"name": "Team page header buttons",
"target": "teams.js team/:id hero",
"where": "Teams",
"route": "team/12",
"sel": "@page",
"issues": ""
},
{
"id": "article-tags",
"name": "Article team tags",
"target": "news.js article",
"where": "News",
"route": "news",
"sel": "@page",
"issues": ""
},
{
"id": "player-sofar",
"name": "Player season so far",
"target": "player.js overview",
"where": "Player",
"route": "player/3139477",
"sel": "@page",
"issues": ""
},
{
"id": "idea-jersey",
"name": "Idea: animated jersey mesh",
"target": "game, team, fan card",
"where": "Ideas",
"route": "game/401772988",
"sel": "",
"issues": ""
},
{
"id": "idea-glow",
"name": "Idea: colour glows from each side",
"target": "game header",
"where": "Ideas",
"route": "game/401772988",
"sel": "",
"issues": ""
},
{
"id": "idea-stack",
"name": "Idea: two-tone stacked names",
"target": "preview, switcher",
"where": "Ideas",
"route": "teams/all",
"sel": "",
"issues": ""
},
{
"id": "idea-player",
"name": "Idea: number as art",
"target": "player hero",
"where": "Ideas",
"route": "player/3139477",
"sel": "",
"issues": ""
},
{
"id": "idea-faceoff",
"name": "Idea: the face-off",
"target": "game preview",
"where": "Ideas",
"route": "game/401772988",
"sel": "",
"issues": ""
},
{
"id": "idea-bars",
"name": "Idea: two-sided stat bars",
"target": "game stats",
"where": "Ideas",
"route": "game/401772988?tab=stats",
"sel": "",
"issues": ""
},
{
"id": "idea-strip",
"name": "Idea: schedule strip",
"target": "team schedule",
"where": "Ideas",
"route": "team/12?tab=schedule",
"sel": "",
"issues": ""
},
{
"id": "idea-numbers",
"name": "Idea: by the numbers",
"target": "stats hub",
"where": "Ideas",
"route": "stats",
"sel": "",
"issues": ""
},
{
"id": "idea-field",
"name": "Idea: field diagrams",
"target": "drives, depth chart",
"where": "Ideas",
"route": "game/401772988?tab=plays",
"sel": "",
"issues": ""
},
{
"id": "idea-deck",
"name": "Idea: games as a deck",
"target": "scores, home",
"where": "Ideas",
"route": "scores",
"sel": "",
"issues": ""
},
{
"id": "idea-trend",
"name": "Idea: game-by-game bars",
"target": "player game log",
"where": "Ideas",
"route": "player/3139477",
"sel": "",
"issues": ""
},
{
"id": "apply-glow",
"name": "Dark glow: where it lives",
"target": "game hero (live) \u00b7 watch live hero",
"where": "Game, Watch",
"route": "game/401772988",
"sel": "@page",
"issues": ""
},
{
"id": "apply-stack",
"name": "Stacked names: team lists",
"target": "teams/all \u00b7 switcher sheet",
"where": "Teams",
"route": "teams/all",
"sel": "@page",
"issues": ""
},
{
"id": "apply-faceoff",
"name": "Leaders face-off",
"target": "game Stats leaders \u00b7 pre-game",
"where": "Game",
"route": "game/401772988?tab=stats",
"sel": "@page",
"issues": ""
},
{
"id": "apply-bars",
"name": "Two-sided stat bars",
"target": "game Team stats \u00b7 compare",
"where": "Game, Stats",
"route": "game/401772988?tab=stats",
"sel": "@page",
"issues": ""
},
{
"id": "apply-strip",
"name": "Schedule strip",
"target": "team Schedule \u00b7 Home next game",
"where": "Teams, Home",
"route": "team/12?tab=schedule",
"sel": "@page",
"issues": ""
},
{
"id": "apply-field",
"name": "Drive thumbnails",
"target": "game Plays",
"where": "Game",
"route": "game/401772988?tab=plays",
"sel": "@page",
"issues": ""
},
{
"id": "apply-deck",
"name": "Fanned game stack",
"target": "Home live \u00b7 Scores live",
"where": "Home, Scores",
"route": "home",
"sel": "@page",
"issues": ""
},
{
"id": "apply-trend",
"name": "Game-by-game bars",
"target": "player Game log \u00b7 team Stats",
"where": "Player, Teams",
"route": "player/3139477",
"sel": "@page",
"issues": ""
},
{
"id": "apply-jersey",
"name": "Jersey fabric: where it lives",
"target": "team hero \u00b7 Home top hero",
"where": "Teams, Home",
"route": "team/12",
"sel": "@page",
"issues": ""
},
{
"id": "apply-player-num",
"name": "Outline number in the player hero",
"target": "player hero",
"where": "Player",
"route": "player/3139477",
"sel": "@page",
"issues": ""
},
{
"id": "apply-numbers",
"name": "By the numbers: gradient tiles",
"target": "Home \u00b7 By the numbers",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "apply-player-fabric",
"name": "Jersey fabric in the player hero",
"target": "player hero",
"where": "Player",
"route": "player/3139477",
"sel": "@page",
"issues": ""
},
{
"id": "build-stack",
"name": "All 32: two-tone stacked names",
"target": "teams/all",
"where": "Teams",
"route": "teams/all",
"sel": "@page",
"issues": ""
},
{
"id": "build-faceoff",
"name": "Game leaders: face-off",
"target": "game Stats",
"where": "Game",
"route": "game/401872990?tab=stats",
"sel": "@page",
"issues": ""
},
{
"id": "build-bars",
"name": "Team stats: two-sided bars",
"target": "game Stats \u00b7 Team",
"where": "Game",
"route": "game/401872990?tab=team",
"sel": "@page",
"issues": ""
},
{
"id": "build-deck",
"name": "Home: live now fanned stack",
"target": "Home sheet",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "build-trend",
"name": "Player Game log: game-by-game bars",
"target": "player Game log",
"where": "Player",
"route": "player/3139477?tab=gamelog",
"sel": "@page",
"issues": ""
},
{
"id": "build-glow",
"name": "Live game header: dark glow",
"target": "game header",
"where": "Game",
"route": "game/401872990",
"sel": "@page",
"issues": ""
},
{
"id": "build-field",
"name": "Plays: drive field marks",
"target": "game Plays",
"where": "Game",
"route": "game/401872990?tab=plays",
"sel": "@page",
"issues": ""
},
{
"id": "home-hero-height",
"name": "Home top hero: height",
"target": "home.js fanHeader",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "watch-hero2",
"name": "Watch page hero",
"target": "watch.js hero",
"where": "Watch",
"route": "watch",
"sel": "@page",
"issues": ""
},
{
"id": "player-stat-bold",
"name": "Player stat cards: the bold column",
"target": "player.js .tc",
"where": "Player",
"route": "player/3139477",
"sel": "@page",
"issues": ""
},
{
"id": "home-offseason-hero",
"name": "Home hero in the offseason",
"target": "home.js fanHeader",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "home-pinbar-live",
"name": "Home pinned bar during a live game",
"target": "home.js hhMini",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "ob-continue",
"name": "Onboarding: the Continue button",
"target": "onboarding.js",
"where": "Onboarding",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "ob-alpha",
"name": "Onboarding: team picker order",
"target": "onboarding.js",
"where": "Onboarding",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "ob-logos",
"name": "Onboarding: welcome logo wall",
"target": "onboarding.js",
"where": "Onboarding",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "hero-matchup",
"name": "Home hero: the score line",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "pinbar-away",
"name": "Home pinned bar: away first",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "watch-pass",
"name": "Watch: tidy pass",
"target": "watch.js",
"where": "Watch",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "teams-pass",
"name": "Team page: tidy pass",
"target": "teams.js",
"where": "Teams · team overview",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "player-pass",
"name": "Player page: tidy pass",
"target": "player.js",
"where": "Player page",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "home-tuned",
"name": "Home: no tuned-for line",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "hero-lost",
"name": "Home hero: no Lost N straight",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "btn-family",
"name": "Buttons: one family",
"target": "forward.css",
"where": "Every button, chip, segment and pill tab",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "scores-pass",
"name": "Scores: tidy pass",
"target": "scores.js",
"where": "Scores",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "news-pass",
"name": "News: tidy pass",
"target": "home.js",
"where": "News · Top",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "pregame-hero",
"name": "Game page hero: before kickoff",
"target": "game.js",
"where": "Game page · Preview tab",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "game-hero-live",
"name": "Game page hero: live and final",
"target": "game.js",
"where": "Game page · live and final",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "sec-more",
"name": "Section links: bolder, smaller",
"target": "forward.css",
"where": "Every section head",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "chrome-nosb",
"name": "No status bar; time machine on You",
"target": "core.js",
"where": "Every screen · You",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "mg-plain",
"name": "Mini games: plain colour cards",
"target": "minigames.js",
"where": "Home · Mini games",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "nfl-icons",
"name": "Icons: the NFL app's set",
"target": "core.js",
"where": "Everywhere",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "trade-deadline",
"name": "Trade deadline day",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "season-bye",
"name": "Bye week",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "season-race",
"name": "Playoff race",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "season-over",
"name": "Season over",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "season-schedule",
"name": "Schedule release",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "season-cuts",
"name": "Roster cut-down",
"target": "home.js",
"where": "Home",
"route": "",
"sel": "@page",
"issues": ""
},
{
"id": "you-settings",
"name": "You page below the card + Settings",
"target": "you.js route \u00b7 settings/:k",
"where": "You, Settings",
"route": "you",
"sel": ".js",
"issues": "Only fan card approved."
},
{
"id": "fan-life",
"name": "Fan life pages",
"target": "fanlife.js tickets wallet passport trip",
"where": "Tickets, Wallet, Passport, Trip",
"route": "wallet",
"sel": ".js",
"issues": "Passport still exists (user said most fans visit 1-2 stadiums)."
},
{
"id": "history-pages",
"name": "History pages",
"target": "history.js history super-bowls records hof franchise",
"where": "History",
"route": "history",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "learn-pages",
"name": "Learn + glossary",
"target": "learn.js learn learn/:id glossary",
"where": "Learn",
"route": "learn",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "explore",
"name": "Explore directory",
"target": "explore.js directory() groupList() \u00b7 .ex-quick",
"where": "Explore",
"route": "explore",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "stats-center",
"name": "Stats center",
"target": "stats.js statsCenter() stat-finder team-rankings",
"where": "Stats",
"route": "stats",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "calendar",
"name": "Calendar",
"target": "scores.js calendar route",
"where": "Calendar",
"route": "calendar",
"sel": ".js",
"issues": "Never reviewed."
},
{
"id": "time-machine",
"name": "Time machine panel",
"target": "timemachine.js \u00b7 .tmx-*",
"where": "dev/demo panel",
"route": "home",
"sel": ".js",
"issues": "Demo tool; pill scenario buttons. Probably exclude from approvals."
}
].map(card("Organisms")));
})();
