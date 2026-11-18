const test = require("node:test");
const assert = require("node:assert/strict");

const {
  espnSeason,
  formatStanding,
  parseGame,
  formatGameResult,
  formatNextGame,
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
  // Regular season is numbered by the ending year, the postseason by the starting year.
  assert.deepEqual(scheduleSeasons(2027), { regularSeason: 2027, postseason: 2026 });
  assert.deepEqual(scheduleSeasons(2026), { regularSeason: 2026, postseason: 2025 });
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
  assert.equal(line, "🏟️ Next: @ CHA — Nov 17, 11:00 PM ET");
  assert.equal(formatNextGame({ date: "2026-11-18T04:00Z", isHome: true, opponent: "CHA" }).startsWith("🏟️ Next: vs CHA"), true);
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

test("getDemoData builds five completed games for the requested team", () => {
  const demo = getDemoData("gsw");
  assert.equal(demo.team.full_name, "Golden State Warriors");
  assert.equal(demo.season, espnSeason());
  assert.equal(demo.games.length, 5);
  for (const game of demo.games) {
    assert.equal(game.completed, true);
    assert.notEqual(game.opponent, "GSW");
    assert.ok(game.teamScore > 0 && game.oppScore > 0);
  }
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
  assert.ok(content.includes("📊 2025-2026 Record: 53W - 29L (64.6%)"));
  assert.ok(content.includes("🏅 1st in Pacific Division"));
  assert.equal(content.match(/[✅❌] [WL]/g).length, 5);
  assert.ok(!content.includes("🏟️ Next:"));
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
  assert.ok(content.includes("🏟️ Next: vs BOS"));
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
