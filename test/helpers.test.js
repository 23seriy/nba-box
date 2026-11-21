const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  espnSeason,
  formatStanding,
  formatSeed,
  formatRecordDetails,
  parseTeam,
  parseSchedule,
  parseStandings,
  fetchTeamSeason,
  buildGistFiles,
  writeReadme,
  parseGame,
  formatGameResult,
  formatNextGame,
  formatLiveGame,
  parseLiveGame,
  generateBarChart,
  getDemoData,
  validateConfig,
  renderGist,
  scheduleSeasons,
  replacePreview,
  PREVIEW_START,
  PREVIEW_END,
} = require("../index.js");

function competition({ opponent = "BOS", isHome = true, teamScore = 110, oppScore = 100, completed = true } = {}) {
  const competitor = (abbreviation, homeAway, score) => ({
    team: { abbreviation },
    homeAway,
    score: { value: score, displayValue: String(score) },
  });
  const homeScore = isHome ? teamScore : oppScore;
  const awayScore = isHome ? oppScore : teamScore;
  return {
    date: "2026-11-01T23:00Z",
    competitions: [
      {
        status: { type: { completed, detail: completed ? "Final" : "7:30 PM" } },
        competitors: [
          competitor("LAL", isHome ? "home" : "away", homeScore),
          competitor(opponent, isHome ? "away" : "home", awayScore),
        ],
      },
    ],
    gameType: 2,
  };
}

function easternDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

test("espnSeason numbers the season by the year it ends", () => {
  // 2026-27 is season 2027; the summer after it is still season 2027.
  assert.equal(espnSeason(new Date("2026-11-01T12:00:00Z")), 2027);
  assert.equal(espnSeason(new Date("2026-12-31T23:59:59Z")), 2027);
  assert.equal(espnSeason(new Date("2027-03-15T12:00:00Z")), 2027);
  assert.equal(espnSeason(new Date("2027-06-20T12:00:00Z")), 2027);
  // Before opening night the previous season is still the current one.
  assert.equal(espnSeason(new Date("2026-08-15T12:00:00Z")), 2026);
  assert.equal(espnSeason(new Date("2026-09-30T12:00:00Z")), 2026);
  assert.equal(espnSeason(new Date("2026-10-01T12:00:00Z")), 2027);
});

test("scheduleSeasons numbers each schedule query the way ESPN expects", () => {
  // Preseason and regular season are numbered by the ending year, the postseason
  // by the starting year.
  assert.deepEqual(scheduleSeasons(2027), { preseason: 2027, regularSeason: 2027, postseason: 2026 });
  assert.deepEqual(scheduleSeasons(2026), { preseason: 2026, regularSeason: 2026, postseason: 2025 });
});

test("espnSeason reads the Eastern-time date, not UTC", () => {
  // Both instants are Dec 31 in ET even though UTC has already ticked over.
  assert.equal(espnSeason(new Date("2027-01-01T04:59:00Z")), 2027);
  // 23:30 ET on Sep 30 is still the offseason season, 00:30 ET on Oct 1 is the new one.
  assert.equal(espnSeason(new Date("2026-10-01T03:30:00Z")), 2026);
  assert.equal(espnSeason(new Date("2026-10-01T04:30:00Z")), 2027);
});

test("formatStanding drops ESPN's bogus trailing 'Division'", () => {
  assert.equal(formatStanding("4th in Eastern Conference Division"), "4th in Eastern Conference");
  assert.equal(formatStanding("10th in Western Conference Division"), "10th in Western Conference");
  assert.equal(formatStanding("1st in Pacific Division"), "1st in Pacific Division");
});

test("parseGame maps a home win", () => {
  assert.deepEqual(parseGame(competition(), "LAL"), {
    date: "2026-11-01T23:00Z",
    preseason: false,
    postseason: false,
    completed: true,
    opponent: "BOS",
    isHome: true,
    teamScore: 110,
    oppScore: 100,
  });
});

test("parseGame maps a road postseason game", () => {
  // On the road the opponent owns the home-side score, so the home competitor carries 95.
  const event = competition({ isHome: false, teamScore: 101, oppScore: 95 });
  event.gameType = 3;
  const game = parseGame(event, "LAL");
  assert.equal(game.isHome, false);
  assert.equal(game.teamScore, 95);
  assert.equal(game.oppScore, 101);
  assert.equal(game.postseason, true);
});

test("parseGame matches teams by ESPN abbreviation", () => {
  // Golden State is "GS" in ESPN payloads, so the caller passes the ESPN abbreviation.
  const event = competition({ opponent: "GS" });
  assert.equal(parseGame(event, "LAL").opponent, "GS");
  assert.equal(parseGame(event, "GS").isHome, false);
});

test("parseGame tolerates string scores and skips unusable events", () => {
  const event = competition();
  event.competitions[0].competitors[0].score = "110";
  event.competitions[0].competitors[1].score = "100";
  assert.equal(parseGame(event, "LAL").teamScore, 110);

  assert.equal(parseGame({}, "LAL"), null);
  assert.equal(parseGame({ competitions: [{ competitors: [] }] }, "LAL"), null);
});

test("formatGameResult renders wins, losses and home/away", () => {
  const win = formatGameResult({ date: "2026-11-01T23:00Z", isHome: true, opponent: "BOS", teamScore: 110, oppScore: 100 });
  assert.equal(win, `✅ W 110-100 vs BOS (${easternDate("2026-11-01T23:00Z")})`);

  const loss = formatGameResult({ date: "2026-10-21T02:00Z", isHome: false, opponent: "GSW", teamScore: 98, oppScore: 108 });
  assert.equal(loss, `❌ L  98-108 @ GSW (${easternDate("2026-10-21T02:00Z")})`);
});

test("formatGameResult dates a late tip-off in US Eastern time", () => {
  // 02:00Z on Oct 22 is the evening of Oct 21 in the US; formatting in UTC would say Oct 22.
  const game = { date: "2026-10-22T02:00Z", isHome: true, opponent: "BOS", teamScore: 110, oppScore: 100 };
  assert.ok(formatGameResult(game).includes("(Oct 21)"));
  assert.ok(!formatGameResult(game).includes("(Oct 22)"));
});

test("formatGameResult does not depend on the runtime timezone", () => {
  const game = { date: "2026-11-12T01:00Z", isHome: false, opponent: "MIL", teamScore: 123, oppScore: 112 };
  const original = process.env.TZ;
  try {
    process.env.TZ = "UTC";
    const utc = formatGameResult(game);
    process.env.TZ = "Asia/Tokyo";
    const tokyo = formatGameResult(game);
    assert.equal(utc, tokyo);
    assert.ok(utc.includes("(Nov 11)"));
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("formatNextGame shows the tip-off in Eastern time", () => {
  const line = formatNextGame({ date: "2026-11-18T04:00Z", isHome: false, opponent: "CHA" });
  assert.equal(line, "🏟️ **Next:** @ CHA — Nov 17, 11:00 PM ET");
  assert.equal(formatNextGame({ date: "2026-11-18T04:00Z", isHome: true, opponent: "CHA" }).startsWith("🏟️ **Next:** vs CHA"), true);
});

test("generateBarChart fills edge cases exactly", () => {
  assert.equal(generateBarChart(0, 10), "░".repeat(10));
  assert.equal(generateBarChart(100, 10), "█".repeat(10));
  assert.equal(generateBarChart(150, 10), "█".repeat(10));
  assert.equal(generateBarChart(50, 10), "█████░░░░░");
  assert.ok(generateBarChart(68.6, 25).includes("▏"));
});

test("validateConfig accepts a complete environment", () => {
  assert.deepEqual(validateConfig({ GIST_ID: "g", GH_TOKEN: "t", NBA_TEAM: "lal" }), {
    gistId: "g",
    githubToken: "t",
    nbaTeam: "lal",
  });
});

test("validateConfig reports every missing variable at once", () => {
  assert.throws(() => validateConfig({}), /GIST_ID, GH_TOKEN, NBA_TEAM/);
  assert.throws(() => validateConfig({ NBA_TEAM: "LAL" }), /GIST_ID, GH_TOKEN/);
  assert.throws(() => validateConfig({ GIST_ID: "g", GH_TOKEN: "t" }), /NBA_TEAM/);
});

test("validateConfig only relaxes credentials in demo mode", () => {
  assert.deepEqual(validateConfig({ NBA_TEAM: "LAL" }, { demo: true }), {
    gistId: undefined,
    githubToken: undefined,
    nbaTeam: "LAL",
  });
  assert.throws(() => validateConfig({}, { demo: true }), /NBA_TEAM/);
  assert.throws(() => validateConfig({ GIST_ID: "g", GH_TOKEN: "t" }, { demo: true }), /NBA_TEAM/);
});

test("validateConfig rejects unknown teams", () => {
  assert.throws(
    () => validateConfig({ GIST_ID: "g", GH_TOKEN: "t", NBA_TEAM: "XYZ" }),
    /Unknown NBA_TEAM "XYZ"/
  );
});

test("validateConfig rejects the placeholder values from .env.example", () => {
  assert.throws(
    () => validateConfig({ GIST_ID: "your_gist_id_here", GH_TOKEN: "your_github_token_here", NBA_TEAM: "LAL" }),
    /placeholder value for GIST_ID, GH_TOKEN/
  );
  assert.throws(
    () => validateConfig({ GIST_ID: "g", GH_TOKEN: "your_github_token_here", NBA_TEAM: "LAL" }),
    /placeholder value for GH_TOKEN/
  );
});

test("getDemoData builds five completed games plus a scheduled one", () => {
  const demo = getDemoData("gsw");
  assert.equal(demo.team.full_name, "Golden State Warriors");
  assert.equal(demo.season, espnSeason());

  const completed = demo.games.filter((g) => g.completed);
  assert.equal(completed.length, 5);
  for (const game of completed) {
    assert.notEqual(game.opponent, "GSW");
    assert.ok(game.teamScore > 0 && game.oppScore > 0);
  }

  const upcoming = demo.games.filter((g) => !g.completed);
  assert.equal(upcoming.length, 1);
  assert.ok(new Date(upcoming[0].date) > new Date(), "upcoming game should be in the future");
});

test("renderGist shows the next game for demo data", () => {
  const { content } = renderGist(getDemoData("LAL"));
  assert.ok(content.includes("🏟️ **Next:** vs "));
  assert.ok(!content.includes("Live:**"));
});

test("getDemoData falls back to a synthetic team", () => {
  assert.equal(getDemoData("SAC").team.full_name, "SAC Team");
});

test("renderGist renders the record, standing and only the last five games", () => {
  const games = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-11-${String(i + 1).padStart(2, "0")}T23:00Z`,
    completed: true,
    isHome: i % 2 === 0,
    opponent: "BOS",
    teamScore: 110 + i,
    oppScore: 100,
  }));

  const { emoji, content } = renderGist({
    team: {
      abbreviation: "LAL",
      full_name: "Los Angeles Lakers",
      conference: "Western",
      division: "Pacific",
      standingSummary: "1st in Pacific Division",
    },
    games,
    record: { wins: 53, losses: 29 },
    season: 2026,
  });

  assert.equal(emoji, "👑");
  assert.ok(content.includes('<img src="https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg"'));
  assert.ok(content.includes("### 👑 Los Angeles Lakers (LAL)"));
  assert.ok(content.includes("Western Conference · Pacific Division"));
  assert.ok(content.includes("📊 **2025-2026 Record: 53W - 29L (64.6%)**"));
  assert.ok(content.includes("🏅 1st in Pacific Division"));
  assert.equal(content.match(/[✅❌] [WL]/g).length, 5);
  assert.ok(!content.includes("🏟️ **Next:**"));
});

test("renderGist handles an unplayed season and shows the next game", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const { content } = renderGist({
    team: { abbreviation: "XXX", full_name: "XXX Team" },
    games: [{ date: future, completed: false, isHome: true, opponent: "BOS", teamScore: 0, oppScore: 0 }],
    record: null,
    season: 2027,
  });

  assert.ok(content.includes("### 🏀 XXX Team (XXX)"));
  assert.ok(!content.includes("📊"));
  assert.ok(!content.includes(" Conference · "));
  assert.ok(content.includes("📅 No completed games in this season yet"));
  assert.ok(content.includes("🏟️ **Next:** vs BOS"));
});

test("replacePreview swaps only the marked block", () => {
  const markdown = [
    "# Title",
    "",
    "before",
    PREVIEW_START,
    "old output",
    PREVIEW_END,
    "after",
  ].join("\n");

  const updated = replacePreview(markdown, "📊 new output\n");
  assert.ok(updated.startsWith("# Title\n\nbefore\n"));
  assert.ok(updated.includes(`${PREVIEW_START}\n\n📊 new output\n\n${PREVIEW_END}`));
  assert.ok(updated.endsWith("\nafter"));
  assert.ok(!updated.includes("old output"));
});

test("replacePreview is stable when the content has not changed", () => {
  const markdown = `${PREVIEW_START}\n\nbody\n\n${PREVIEW_END}`;
  assert.equal(replacePreview(markdown, "body"), markdown);
});

test("replacePreview fails loudly without markers", () => {
  assert.throws(() => replacePreview("no markers here", "body"), /missing <!-- preview:start -->/);
  assert.throws(() => replacePreview(`${PREVIEW_START}\nbody`, "body"), /missing/);
});

function scoreboard(state, { teamScore = "6", oppScore = "11", detail = "8:49 - 1st Quarter" } = {}) {
  return {
    events: [
      {
        date: "2026-11-19T03:00Z",
        competitions: [
          {
            status: {
              displayClock: "8:49",
              type: { state, completed: state === "post", detail },
            },
            competitors: [
              { team: { abbreviation: "LAL" }, homeAway: "home", score: teamScore },
              { team: { abbreviation: "UTAH" }, homeAway: "away", score: oppScore },
            ],
          },
        ],
      },
    ],
  };
}

test("parseLiveGame reads an in-progress game with its live score", () => {
  assert.deepEqual(parseLiveGame(scoreboard("in"), "LAL"), {
    date: "2026-11-19T03:00Z",
    detail: "8:49 - 1st Quarter",
    opponent: "UTAH",
    isHome: true,
    teamScore: 6,
    oppScore: 11,
  });
});

test("parseLiveGame matches the away team and ESPN abbreviations", () => {
  const data = scoreboard("in");
  assert.equal(parseLiveGame(data, "UTAH").isHome, false);
  assert.equal(parseLiveGame(scoreboard("in", { teamScore: "5", oppScore: "4" }), "GS"), null);
});

test("parseLiveGame ignores games that are not in progress", () => {
  // Scores only stream while a game is live; finished and scheduled games are skipped.
  assert.equal(parseLiveGame(scoreboard("post"), "LAL"), null);
  assert.equal(parseLiveGame(scoreboard("pre"), "LAL"), null);
  assert.equal(parseLiveGame({}, "LAL"), null);
  assert.equal(parseLiveGame(null, "LAL"), null);
});

test("formatLiveGame shows the score and game clock", () => {
  // Both abbreviations, so the score is unambiguous.
  assert.equal(
    formatLiveGame({ opponent: "UTAH", isHome: true, teamScore: 6, oppScore: 11, detail: "8:49 - 1st Quarter" }, "LAL"),
    "🔴 **Live:** LAL 6 - UTAH 11 (8:49 - 1st Quarter)"
  );
  assert.equal(
    formatLiveGame({ opponent: "BOS", isHome: false, teamScore: 20, oppScore: 18, detail: "2:10 - 2nd" }, "LAL"),
    "🔴 **Live:** BOS 18 - LAL 20 (2:10 - 2nd)"
  );
});

test("renderGist shows the live game above the next game", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const { content } = renderGist({
    team: { abbreviation: "LAL", full_name: "Los Angeles Lakers" },
    games: [
      {
        date: "2026-11-01T23:00Z",
        completed: true,
        isHome: true,
        opponent: "BOS",
        teamScore: 110,
        oppScore: 100,
      },
      { date: future, completed: false, isHome: false, opponent: "SAC", teamScore: 0, oppScore: 0 },
    ],
    record: { wins: 13, losses: 2 },
    season: 2027,
    liveGame: { opponent: "UTAH", isHome: true, teamScore: 6, oppScore: 11, detail: "8:49 - 1st Quarter" },
  });

  const liveIndex = content.indexOf("🔴 **Live:** LAL 6 - UTAH 11");
  const nextIndex = content.indexOf("🏟️ **Next:** @ SAC");
  assert.ok(liveIndex > -1 && nextIndex > -1);
  assert.ok(liveIndex < nextIndex);
  assert.equal(content.match(/🔴 \*\*Live:\*\*/g).length, 1);
});

test("renderGist omits the live line when no game is in progress", () => {
  const { content } = renderGist({
    team: { abbreviation: "LAL", full_name: "Los Angeles Lakers" },
    games: [],
    record: null,
    season: 2027,
  });
  assert.ok(!content.includes("Live:**"));
});

test("formatRecordDetails combines splits, streak and last ten", () => {
  assert.equal(
    formatRecordDetails({ home: "6-2", road: "7-1", streak: "L1", lastTen: "9-1" }),
    "🏠 6-2 · ✈️ 7-1 · 🔥 L1 · 📈 Last 10: 9-1"
  );
});

test("formatRecordDetails skips missing or malformed splits", () => {
  // ESPN leaves these out early in a season, and reports "-" instead of a record.
  assert.equal(formatRecordDetails({ home: "1-0" }), "🏠 1-0");
  assert.equal(formatRecordDetails({ home: "-", road: null, streak: "", lastTen: undefined }), "");
  assert.equal(formatRecordDetails(null), "");
  assert.equal(formatRecordDetails({}), "");
});

test("getDemoData is deterministic", () => {
  // Dates stay relative to today, so compare everything else.
  const shape = ({ games }) => games.map(({ date: _date, ...rest }) => rest);
  const first = getDemoData("LAL");
  const second = getDemoData("LAL");
  assert.deepEqual(shape(first), shape(second));
  assert.deepEqual(first.record, second.record);
  // Different teams still get different results.
  assert.notDeepEqual(shape(getDemoData("BOS")), shape(first));
});

test("renderGist shows the record details line for demo data", () => {
  const { content } = renderGist(getDemoData("LAL"));
  assert.ok(content.includes("🏠 26-10 · ✈️ 22-12 · 🔥 W2 · 📈 Last 10: 7-3"));
  // The demo covers every line of the real output, so it can be used as a preview.
  assert.ok(content.includes("🏅 1st in Pacific Division"));
});

test("renderGist omits the details line when no splits are known", () => {
  const { content } = renderGist({
    team: { abbreviation: "LAL", full_name: "Los Angeles Lakers" },
    games: [],
    record: { wins: 1, losses: 0 },
    season: 2027,
  });
  assert.ok(content.includes("📊 **2026-2027 Record: 1W - 0L (100.0%)**"));
  assert.ok(!content.includes("🏠"));
});

test("formatSeed renders a compact playoff seed", () => {
  assert.equal(formatSeed("2"), "#2 seed");
  assert.equal(formatSeed(1), "#1 seed");
  assert.equal(formatSeed("11"), "#11 seed");
});

test("formatSeed ignores values ESPN cannot have assigned", () => {
  for (const seed of [undefined, null, "", "-", "0", "31", "n/a"]) {
    assert.equal(formatSeed(seed), "");
  }
});

test("renderGist puts the seed on the standing line", () => {
  const { content } = renderGist({
    team: { abbreviation: "LAL", full_name: "Los Angeles Lakers", standingSummary: "1st in Pacific Division" },
    games: [],
    record: { wins: 14, losses: 3, seed: "1" },
    season: 2027,
  });
  assert.ok(content.includes("🏅 1st in Pacific Division · #1 seed"));
});

test("renderGist shows the seed alone when there is no division standing", () => {
  const { content } = renderGist({
    team: { abbreviation: "LAL", full_name: "Los Angeles Lakers" },
    games: [],
    record: { wins: 14, losses: 3, seed: "4" },
    season: 2027,
  });
  assert.ok(content.includes("🏅 #4 seed"));
  assert.ok(!content.includes("🏅  · "));
});

// Guards against ESPN payload drift: no rendered line may contain a placeholder
// or missing value, which is how the empty live score and split records slipped in.
test("renderGist never emits placeholder or missing values", () => {
  const completed = (date, opponent, teamScore, oppScore) => ({
    date,
    completed: true,
    isHome: true,
    opponent,
    teamScore,
    oppScore,
  });

  const scenarios = [
    {
      name: "full",
      team: { abbreviation: "LAL", full_name: "Los Angeles Lakers", conference: "Western", division: "Pacific", standingSummary: "1st in Pacific Division" },
      games: [completed("2026-11-17T03:00Z", "CHA", 118, 114)],
      record: { wins: 14, losses: 3, home: "7-2", road: "7-1", streak: "W1", lastTen: "9-1", seed: "1" },
      season: 2027,
      liveGame: { opponent: "SAC", isHome: false, teamScore: 54, oppScore: 58, detail: "8:03 - 2nd Quarter" },
    },
    {
      name: "unknown splits",
      team: { abbreviation: "XXX", full_name: "XXX Team" },
      games: [],
      record: { wins: 0, losses: 0, home: "-", road: "-", streak: "-", lastTen: "-", seed: "-" },
      season: 2027,
    },
    {
      name: "no record",
      team: { abbreviation: "XXX", full_name: "XXX Team" },
      games: [],
      record: null,
      season: 2027,
    },
  ];

  for (const scenario of scenarios) {
    const { content } = renderGist(scenario);
    assert.ok(!/undefined|NaN|null|\[object Object\]/.test(content), `${scenario.name}: ${content}`);

    for (const line of content.split("\n")) {
      // A stat line that lost its value looks like "🏠 " or "🏠  · ✈️ 3-1",
      // and a separator may not dangle at the end.
      assert.ok(!/(^|·\s)-\s*($|·)/.test(line), `${scenario.name}: placeholder value "${line}"`);
      assert.ok(!/·\s*$|:\s*$/.test(line), `${scenario.name}: dangling separator "${line}"`);
      assert.ok(
        !/^(?:🏠|✈️|🔥|📈|🏅)\s*(?:·|$)/u.test(line),
        `${scenario.name}: stat without a value "${line}"`
      );
    }
  }
});

// --- payload parsers -------------------------------------------------------
// Fixtures are trimmed copies of real ESPN responses.

const standingsPayload = {
  children: [
    {
      name: "Western Conference",
      children: [
        {
          name: "Pacific Division",
          standings: {
            entries: [
              {
                team: { abbreviation: "LAL" },
                stats: [
                  { name: "wins", displayValue: "14" },
                  { name: "losses", displayValue: "3" },
                  { name: "playoffSeed", displayValue: "1" },
                  { name: "streak", displayValue: "W1" },
                  { name: "Home", displayValue: "7-2" },
                  { name: "Road", displayValue: "7-1" },
                  { name: "Last Ten Games", displayValue: "9-1" },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};

test("parseStandings maps record, splits, seed and location", () => {
  assert.deepEqual(parseStandings(standingsPayload, "lal"), {
    wins: 14,
    losses: 3,
    conference: "Western",
    division: "Pacific",
    home: "7-2",
    road: "7-1",
    streak: "W1",
    lastTen: "9-1",
    seed: "1",
  });
});

test("parseStandings handles ESPN abbreviations and missing teams", () => {
  // ESPN calls the Warriors "GS"; callers may pass either abbreviation.
  const payload = JSON.parse(JSON.stringify(standingsPayload));
  payload.children[0].children[0].standings.entries[0].team.abbreviation = "GS";
  assert.equal(parseStandings(payload, "GS").wins, 14);
  assert.equal(parseStandings(payload, "GSW").wins, 14);
  assert.equal(parseStandings(standingsPayload, "BOS"), null);
  assert.equal(parseStandings({}, "LAL"), null);
});

test("parseStandings defaults missing stats to zero", () => {
  const payload = { children: [{ name: "Eastern Conference", children: [{ name: "Atlantic Division", standings: { entries: [{ team: { abbreviation: "BOS" }, stats: [] }] } }] }] };
  const record = parseStandings(payload, "BOS");
  assert.equal(record.wins, 0);
  assert.equal(record.losses, 0);
  assert.equal(record.home, undefined);
  assert.equal(record.seed, undefined);
});

test("parseTeam maps the team endpoint", () => {
  const data = { team: { location: "Los Angeles", name: "Lakers", displayName: "Los Angeles Lakers", standingSummary: "1st in Pacific Division" } };
  assert.deepEqual(parseTeam(data, "LAL"), {
    // ESPN's team id; the logo uses NBA_TEAM_IDS separately.
    id: 13,
    abbreviation: "LAL",
    city: "Los Angeles",
    name: "Lakers",
    full_name: "Los Angeles Lakers",
    conference: "",
    division: "",
    standingSummary: "1st in Pacific Division",
  });
  assert.equal(parseTeam({}, "LAL"), null);
  assert.equal(parseTeam(null, "LAL"), null);
});

test("parseSchedule merges preseason, regular season and postseason chronologically", () => {
  const event = (date, completed) => ({ ...competition({ completed }), date });
  const payloads = {
    preseason: { events: [event("2026-10-08T02:00Z", true)] },
    regularSeason: { events: [event("2026-11-15T21:00Z", true), event("2026-11-01T23:00Z", true)] },
    postseason: { events: [event("2027-04-20T02:00Z", true)] },
  };

  const games = parseSchedule(payloads, "LAL");
  assert.deepEqual(games.map((g) => g.date), [
    "2026-10-08T02:00Z",
    "2026-11-01T23:00Z",
    "2026-11-15T21:00Z",
    "2027-04-20T02:00Z",
  ]);
  assert.equal(games[0].preseason, true);
  assert.equal(games[1].preseason, false);
  assert.equal(games[3].postseason, true);
  assert.equal(games[3].preseason, false);
});

test("parseSchedule tolerates missing payloads and malformed events", () => {
  assert.deepEqual(parseSchedule(undefined, "LAL"), []);
  assert.deepEqual(parseSchedule({}, "LAL"), []);
  assert.deepEqual(parseSchedule({ regularSeason: { events: [{}] } }, "LAL"), []);
});

test("preseason results and fixtures are labelled", () => {
  const game = { date: "2026-10-08T02:00Z", isHome: true, opponent: "GS", teamScore: 112, oppScore: 108, preseason: true };
  assert.ok(formatGameResult(game).includes("(Oct 7 · PS)"));
  assert.ok(formatNextGame({ ...game, completed: false }).endsWith("ET · PS"));
  // Regular-season games stay unlabelled.
  assert.ok(!formatGameResult({ ...game, preseason: false }).includes("PS"));
});

// --- season selection ------------------------------------------------------

test("fetchTeamSeason keeps the current season once a game is played", async () => {
  const calls = [];
  const deps = {
    fetchStandings: async (_team, season) => {
      calls.push(["standings", season]);
      return { wins: 14, losses: 3 };
    },
    fetchSeasonSchedule: async (_team, season) => {
      calls.push(["schedule", season]);
      return [{ date: "2026-11-01T23:00Z", completed: true }];
    },
  };

  const result = await fetchTeamSeason("LAL", deps);
  assert.equal(result.season, espnSeason());
  assert.equal(result.record.wins, 14);
  assert.deepEqual(calls, [
    ["standings", espnSeason()],
    ["schedule", espnSeason()],
  ]);
});

test("fetchTeamSeason falls back to the previous season before opening night", async () => {
  const calls = [];
  const current = espnSeason();
  const deps = {
    fetchStandings: async (_team, season) => {
      calls.push(["standings", season]);
      return season === current ? { wins: 0, losses: 0 } : { wins: 53, losses: 29 };
    },
    fetchSeasonSchedule: async (_team, season) => {
      calls.push(["schedule", season]);
      // The upcoming season has no completed games yet.
      return season === current
        ? [{ date: "2027-10-20T23:00Z", completed: false }]
        : [{ date: "2026-05-01T23:00Z", completed: true }];
    },
  };

  const result = await fetchTeamSeason("LAL", deps);
  assert.equal(result.season, current - 1);
  assert.equal(result.record.wins, 53);
  assert.equal(result.games[0].date, "2026-05-01T23:00Z");
  assert.deepEqual(calls.map(([, season]) => season), [current, current, current - 1, current - 1].map((s, i) => (i < 2 ? current : current - 1)));
});

test("fetchTeamSeason shows the current season once preseason games are played", async () => {
  const current = espnSeason();
  const deps = {
    fetchStandings: async () => ({ wins: 0, losses: 0 }),
    fetchSeasonSchedule: async () => [
      { date: "2026-10-08T02:00Z", completed: true, preseason: true },
      { date: "2026-10-20T23:00Z", completed: false, preseason: false },
    ],
  };

  const result = await fetchTeamSeason("LAL", deps);
  assert.equal(result.season, current);
  assert.equal(result.games.filter((g) => g.preseason).length, 1);
});

test("fetchTeamSeason keeps the current record when the previous season has none", async () => {
  const deps = {
    fetchStandings: async () => null,
    fetchSeasonSchedule: async () => [],
  };
  const result = await fetchTeamSeason("LAL", deps);
  assert.equal(result.season, espnSeason() - 1);
  assert.equal(result.record, null);
  assert.deepEqual(result.games, []);
});

// --- gist payload and README sync -----------------------------------------

test("buildGistFiles renames the existing file instead of adding one", () => {
  const files = buildGistFiles(
    { "old-name.md": { content: "old" } },
    { team: { full_name: "Los Angeles Lakers" }, content: "new", emoji: "👑" }
  );
  assert.deepEqual(Object.keys(files), ["old-name.md"]);
  assert.equal(files["old-name.md"].filename, "👑 Los Angeles Lakers — NBA.md");
  assert.equal(files["old-name.md"].content, "new");
});

test("buildGistFiles fails when the gist has no files", () => {
  const args = { team: { full_name: "Los Angeles Lakers" }, content: "new", emoji: "👑" };
  assert.throws(() => buildGistFiles({}, args), /Gist has no files/);
  assert.throws(() => buildGistFiles(undefined, args), /Gist has no files/);
});

test("writeReadme updates only the preview block and reports whether it changed", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nba-box-"));
  const readme = path.join(dir, "README.md");
  const original = `# Title\n\n${PREVIEW_START}\n\nold\n\n${PREVIEW_END}\n\ntrailer\n`;
  await fs.writeFile(readme, original);

  const changed = await writeReadme("new body", readme);
  const written = await fs.readFile(readme, "utf8");
  assert.equal(changed, true);
  assert.ok(written.startsWith("# Title\n"));
  assert.ok(written.includes("new body"));
  assert.ok(written.endsWith("\ntrailer\n"));
  assert.ok(!written.includes("old"));

  // Nothing to do the second time, which keeps the daily job from committing noise.
  const unchanged = await writeReadme("new body", readme);
  assert.equal(unchanged, false);
  assert.equal(await fs.readFile(readme, "utf8"), written);

  await fs.rm(dir, { recursive: true, force: true });
});

test("writeReadme surfaces a README without preview markers", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nba-box-"));
  const readme = path.join(dir, "README.md");
  await fs.writeFile(readme, "# Title only\n");
  await assert.rejects(() => writeReadme("body", readme), /missing <!-- preview:start -->/);
  await fs.rm(dir, { recursive: true, force: true });
});

test("renderGist tallies preseason games until the regular season starts", () => {
  const ps = (date, teamScore, oppScore) => ({
    date,
    completed: true,
    preseason: true,
    isHome: true,
    opponent: "DEN",
    teamScore,
    oppScore,
  });
  const { content } = renderGist({
    team: { abbreviation: "LAL", full_name: "Los Angeles Lakers" },
    games: [ps("2026-10-08T02:00Z", 114, 110), ps("2026-10-13T02:00Z", 89, 101), ps("2026-10-16T02:00Z", 106, 121)],
    record: { wins: 0, losses: 0 },
    season: 2027,
  });

  assert.ok(content.includes("📊 **Preseason: 1W - 2L**"));
  assert.ok(content.includes("(Oct 7 · PS)"));
  assert.ok(!content.includes("Record:"));
});

test("renderGist ignores the preseason tally once the regular season has a record", () => {
  const { content } = renderGist({
    team: { abbreviation: "LAL", full_name: "Los Angeles Lakers" },
    games: [{ date: "2026-10-08T02:00Z", completed: true, preseason: true, isHome: true, opponent: "DEN", teamScore: 114, oppScore: 110 }],
    record: { wins: 14, losses: 3 },
    season: 2027,
  });
  assert.ok(content.includes("Record: 14W - 3L"));
  assert.ok(!content.includes("Preseason:"));
});

test("renderGist shows no preseason line when no preseason game has been played", () => {
  const { content } = renderGist({
    team: { abbreviation: "LAL", full_name: "Los Angeles Lakers" },
    games: [{ date: "2026-10-20T23:00Z", completed: false, preseason: true, isHome: true, opponent: "DEN", teamScore: 0, oppScore: 0 }],
    record: { wins: 0, losses: 0 },
    season: 2027,
  });
  assert.ok(!content.includes("Preseason:"));
  assert.ok(content.includes("📅 No completed games in this season yet"));
});

// Markdown collapses adjacent lines into one paragraph, which is what made the
// record, standing and splits run together on GitHub. Guard the hard breaks.
test("renderGist separates the stat lines with markdown hard breaks", () => {
  const { content } = renderGist({
    team: { abbreviation: "LAL", full_name: "Los Angeles Lakers", standingSummary: "1st in Pacific Division" },
    games: [],
    record: { wins: 14, losses: 3, home: "7-2", road: "7-1", streak: "W1", lastTen: "9-1", seed: "1" },
    season: 2027,
  });

  const block = content.split("\n\n").find((paragraph) => paragraph.includes("Record: 14W"));
  const lines = block.split("\n");
  assert.equal(lines.length, 4, `expected four stat lines, got: ${JSON.stringify(lines)}`);
  for (const line of lines.slice(0, -1)) {
    assert.ok(line.endsWith("<br>"), `line needs an explicit hard break: ${JSON.stringify(line)}`);
    assert.ok(line.trim().length > 0);
  }
  assert.ok(!/ {2}$/.test(block), "no trailing whitespace, which editors strip");
  // The bar is a code span so it stays monospaced and aligned.
  assert.ok(lines[1].trimStart().startsWith("`"));
  assert.ok(lines[1].includes("█"));
  assert.ok(lines[1].replace("<br>", "").trimEnd().endsWith("`"));
});
