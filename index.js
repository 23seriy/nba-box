require("dotenv").config({ quiet: true });
const fs = require("node:fs/promises");
const path = require("node:path");
const axios = require("axios");
const { Octokit } = require("@octokit/rest");

const { GH_TOKEN: githubToken } = process.env;

const ESPN_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba";
const ESPN_BASE_V2 = "https://site.web.api.espn.com/apis/v2/sports/basketball/nba";
// The per-team schedule omits scores until a game is final, so in-progress games
// are read from the league scoreboard.
const ESPN_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "application/json",
  "Origin": "https://www.espn.com",
  "Referer": "https://www.espn.com/",
};

const octokit = new Octokit({ auth: `token ${githubToken}` });

const PLACEHOLDER_VALUES = {
  gistId: ["your_gist_id_here"],
  githubToken: ["your_github_token_here"],
};
const ENV_NAMES = { gistId: "GIST_ID", githubToken: "GH_TOKEN" };

// NBA team logos as ASCII art abbreviations with emoji
const TEAM_EMOJI = {
  ATL: "🦅", BOS: "☘️", BKN: "🏙️", CHA: "🐝", CHI: "🐂",
  CLE: "⚔️", DAL: "🐴", DEN: "⛏️", DET: "🏎️", GSW: "🌉",
  HOU: "🚀", IND: "🏎️", LAC: "⛵", LAL: "👑", MEM: "🐻",
  MIA: "🔥", MIL: "🦌", MIN: "🐺", NOP: "⚜️", NYK: "🗽",
  OKC: "⚡", ORL: "✨", PHI: "🔔", PHX: "☀️", POR: "🌹",
  SAC: "👑", SAS: "🤠", TOR: "🦖", UTA: "🎵", WAS: "🧙",
};

// NBA.com team IDs for logo URLs
const NBA_TEAM_IDS = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
  CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
  DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
  MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
  OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
  UTA: 1610612762, WAS: 1610612764,
};

const ESPN_TEAM_IDS = {
  ATL: 1,  BOS: 2,  BKN: 17, CHA: 30, CHI: 4,  CLE: 5,  DAL: 6,  DEN: 7,
  DET: 8,  GSW: 9,  HOU: 10, IND: 11, LAC: 12, LAL: 13, MEM: 29, MIA: 14,
  MIL: 15, MIN: 16, NOP: 3,  NYK: 18, OKC: 25, ORL: 19, PHI: 20, PHX: 21,
  POR: 22, SAC: 23, SAS: 24, TOR: 28, UTA: 26, WAS: 27,
};

const ESPN_ABBR = {
  GSW: "GS", NOP: "NO", NYK: "NY", SAS: "SA", UTA: "UTAH", WAS: "WSH",
};

// ESPN's NBA "season" is the year the season ends, so a season that starts in
// October is numbered with the following year (2027 = 2026-27). The year is read
// in US Eastern time, where NBA games are dated.
function espnSeason(date = new Date()) {
  const year = Number(
    new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/New_York" }).format(date)
  );
  return isRegularSeasonMonth(date) ? year + 1 : year;
}

// NBA seasons start in October, so August and September still belong to the previous one.
function isRegularSeasonMonth(date = new Date()) {
  const month = Number(
    new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "America/New_York" }).format(date)
  );
  return month >= 10;
}

// ESPN's schedule query numbers a season by the year it ends for the preseason and
// regular season, but by the year it starts for the postseason (one year earlier).
function scheduleSeasons(season) {
  return { preseason: season, regularSeason: season, postseason: season - 1 };
}

// ESPN reports split records as "6-2" and a streak as "W3", but sends "-" for
// values it has no data for yet (early in a season, for example).
function matchOrEmpty(value, pattern) {
  return typeof value === "string" && pattern.test(value) ? value : "";
}

// One compact line for the splits that ESPN already provides alongside the record.
function tallyPreseason(games) {
  const played = games.filter((g) => g.preseason && g.completed);
  if (played.length === 0) return null;
  const wins = played.filter((g) => g.teamScore > g.oppScore).length;
  return { wins, losses: played.length - wins };
}

function formatRecordDetails(record) {
  const recordPattern = /^\d+-\d+$/;
  const home = matchOrEmpty(record?.home, recordPattern);
  const road = matchOrEmpty(record?.road, recordPattern);
  const streak = matchOrEmpty(record?.streak, /^[WL]\d+$/);
  const lastTen = matchOrEmpty(record?.lastTen, recordPattern);

  const parts = [];
  if (home) parts.push(`🏠 ${home}`);
  if (road) parts.push(`✈️ ${road}`);
  if (streak) parts.push(`🔥 ${streak}`);
  if (lastTen) parts.push(`📈 Last 10: ${lastTen}`);
  return parts.join(" · ");
}

// A concise playoff seed, or "" when ESPN has not assigned one yet.
function formatSeed(seed) {
  const value = Number(seed);
  return Number.isInteger(value) && value > 0 && value <= 30 ? `#${value} seed` : "";
}

function formatStanding(summary) {
  // ESPN reports play-in teams as e.g. "10th in Eastern Conference Division".
  return summary.replace(/ Conference Division$/, " Conference");
}

function parseTeam(data, teamAbbr) {
  const team = data?.team;
  if (!team) return null;
  const upper = teamAbbr.toUpperCase();
  return {
    id: ESPN_TEAM_IDS[upper],
    abbreviation: upper,
    city: team.location || "",
    name: team.name,
    full_name: team.displayName,
    conference: "",
    division: "",
    standingSummary: team.standingSummary || "",
  };
}

async function fetchTeam(teamAbbr) {
  try {
    const upper = teamAbbr.toUpperCase();
    const espnId = ESPN_TEAM_IDS[upper];
    if (!espnId) {
      console.error(`Unknown NBA team: ${upper}. Check the NBA_TEAM abbreviation.`);
      return null;
    }
    const { data } = await axios.get(`${ESPN_BASE}/teams/${espnId}`, { headers: ESPN_HEADERS });
    return parseTeam(data, upper);
  } catch (error) {
    // Returning null aborts the run; config problems are reported by validateConfig.
    console.error(`Failed to fetch NBA team: ${error.message}`);
    return null;
  }
}

async function fetchSeasonSchedule(teamAbbr, season) {
  try {
    const upper = teamAbbr.toUpperCase();
    const espnId = ESPN_TEAM_IDS[upper];
    const espnAbbr = ESPN_ABBR[upper] || upper;
    const { preseason, regularSeason, postseason } = scheduleSeasons(season);

    const [preData, regData, postData] = await Promise.all([
      axios.get(`${ESPN_BASE}/teams/${espnId}/schedule?season=${preseason}&seasontype=1`, { headers: ESPN_HEADERS }),
      axios.get(`${ESPN_BASE}/teams/${espnId}/schedule?season=${regularSeason}&seasontype=2`, { headers: ESPN_HEADERS }),
      axios.get(`${ESPN_BASE}/teams/${espnId}/schedule?season=${postseason}&seasontype=3`, { headers: ESPN_HEADERS }),
    ]);

    return parseSchedule(
      { preseason: preData.data, regularSeason: regData.data, postseason: postData.data },
      espnAbbr
    );
  } catch (error) {
    console.error(`Failed to fetch NBA games: ${error.message}`);
    return [];
  }
}

function parseGame(event, teamAbbr) {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const isTeam = (c) => c.team?.abbreviation?.toUpperCase() === teamAbbr;
  const teamComp = comp.competitors?.find(isTeam);
  const oppComp = comp.competitors?.find((c) => !isTeam(c));
  if (!teamComp || !oppComp) return null;
  return {
    date: event.date,
    preseason: event.gameType === 1,
    postseason: event.gameType === 3,
    completed: Boolean(comp.status?.type?.completed),
    opponent: oppComp.team.abbreviation,
    isHome: teamComp.homeAway === "home",
    teamScore: toScore(teamComp.score),
    oppScore: toScore(oppComp.score),
  };
}

function toScore(score) {
  if (typeof score === "number") return score;
  return score?.value ?? parseFloat(score) ?? 0;
}

// Merges the preseason, regular-season and postseason payloads into one
// chronological list.
function parseSchedule({ preseason, regularSeason, postseason } = {}, teamAbbr) {
  const events = [
    ...(preseason?.events || []).map((e) => ({ ...e, gameType: 1 })),
    ...(regularSeason?.events || []).map((e) => ({ ...e, gameType: 2 })),
    ...(postseason?.events || []).map((e) => ({ ...e, gameType: 3 })),
  ];

  return events
    .map((e) => parseGame(e, teamAbbr))
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function parseLiveGame(scoreboard, teamAbbr) {
  for (const event of scoreboard?.events || []) {
    const comp = event.competitions?.[0];
    if (comp?.status?.type?.state !== "in") continue;
    const isTeam = (c) => c.team?.abbreviation?.toUpperCase() === teamAbbr.toUpperCase();
    const teamComp = comp.competitors?.find(isTeam);
    const oppComp = comp.competitors?.find((c) => !isTeam(c));
    if (!teamComp || !oppComp) continue;
    return {
      date: event.date,
      detail: comp.status.type.detail || comp.status.displayClock || "In Progress",
      opponent: oppComp.team.abbreviation,
      isHome: teamComp.homeAway === "home",
      teamScore: toScore(teamComp.score),
      oppScore: toScore(oppComp.score),
    };
  }
  return null;
}

async function fetchLiveGame(teamAbbr) {
  try {
    const espnAbbr = ESPN_ABBR[teamAbbr.toUpperCase()] || teamAbbr.toUpperCase();
    const { data } = await axios.get(ESPN_SCOREBOARD, { headers: ESPN_HEADERS });
    return parseLiveGame(data, espnAbbr);
  } catch (error) {
    console.error(`Failed to fetch live score: ${error.message}`);
    return null;
  }
}

// Walks ESPN's conference/division tree to find one team's standings entry.
function parseStandings(data, teamAbbr) {
  const espnAbbr = ESPN_ABBR[teamAbbr.toUpperCase()] || teamAbbr.toUpperCase();
  for (const conf of data?.children || []) {
    for (const div of conf.children || []) {
      const entry = (div.standings?.entries || []).find(
        (e) => e.team?.abbreviation?.toUpperCase() === espnAbbr
      );
      if (!entry) continue;

      const stats = Object.fromEntries(
        (entry.stats || []).map((s) => [s.name || s.shortDisplayName, s.displayValue])
      );
      return {
        wins: Number(stats.wins) || 0,
        losses: Number(stats.losses) || 0,
        conference: conf.name?.replace(" Conference", "") || "",
        division: div.name?.replace(" Division", "") || "",
        home: stats.Home,
        road: stats.Road,
        streak: stats.streak,
        lastTen: stats["Last Ten Games"],
        seed: stats.playoffSeed,
      };
    }
  }
  return null;
}

async function fetchStandings(teamAbbr, season) {
  try {
    const { data } = await axios.get(
      `${ESPN_BASE_V2}/standings?level=3&season=${season}&seasontype=2`,
      { headers: ESPN_HEADERS }
    );
    return parseStandings(data, teamAbbr);
  } catch (error) {
    console.error(`Failed to fetch NBA standings: ${error.message}`);
    return null;
  }
}

// Picks the season being shown: the current ESPN season, or the most recently
// completed one during the offseason, when no game of the current season has been played.
async function fetchTeamSeason(teamAbbr, deps = { fetchStandings, fetchSeasonSchedule }) {
  const currentSeason = espnSeason();
  let record = await deps.fetchStandings(teamAbbr, currentSeason);
  let games = await deps.fetchSeasonSchedule(teamAbbr, currentSeason);

  if (games.some((g) => g.completed)) {
    return { season: currentSeason, record, games };
  }

  // Neither preseason nor regular season has been played yet, so show the last
  // completed season instead of an empty record.
  const previousSeason = currentSeason - 1;
  console.log(`No games played in the ${currentSeason} season yet, showing ${previousSeason}.`);
  record = (await deps.fetchStandings(teamAbbr, previousSeason)) || record;
  games = await deps.fetchSeasonSchedule(teamAbbr, previousSeason);

  return { season: previousSeason, record, games };
}

function formatGameResult(game) {
  const result = game.teamScore > game.oppScore ? "W" : "L";
  const icon = result === "W" ? "✅" : "❌";
  const prefix = game.isHome ? "vs" : "@";
  // Games are dated in US Eastern time so the label does not depend on the
  // timezone of the machine running the job (CI runs in UTC).
  const dateStr = new Date(game.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });

  // Preseason results do not count toward the record, so label them.
  const note = game.preseason ? " · PS" : "";
  return `${icon} ${result} ${String(game.teamScore).padStart(3)}-${String(game.oppScore).padEnd(3)} ${prefix} ${game.opponent.padEnd(3)} (${dateStr}${note})`;
}

// `teamAbbreviation` is the followed team; home side is listed first, as on a scoreboard.
function formatLiveGame(game, teamAbbreviation) {
  const us = `${teamAbbreviation} ${game.teamScore}`;
  const them = `${game.opponent} ${game.oppScore}`;
  const [left, right] = game.isHome ? [us, them] : [them, us];
  return `🔴 **Live:** ${left} - ${right} (${game.detail})`;
}

function formatNextGame(game) {
  const prefix = game.isHome ? "vs" : "@";
  const when = new Date(game.date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

  const note = game.preseason ? " · PS" : "";
  return `🏟️ **Next:** ${prefix} ${game.opponent} — ${when} ET${note}`;
}

function generateBarChart(percent, size) {
  const syms = "░▏▎▍▌▋▊▉█";
  const frac = Math.floor((size * 8 * percent) / 100);
  const barsFull = Math.floor(frac / 8);
  if (barsFull >= size) {
    return syms.substring(8, 9).repeat(size);
  }
  const semi = frac % 8;
  return [syms.substring(8, 9).repeat(barsFull), syms.substring(semi, semi + 1)]
    .join("")
    .padEnd(size, syms.substring(0, 1));
}

// Demo data for preview without API key
const DEMO_TEAMS = {
  LAL: { id: 13, abbreviation: "LAL", city: "Los Angeles", name: "Lakers", full_name: "Los Angeles Lakers", conference: "Western", division: "Pacific" },
  BOS: { id: 2, abbreviation: "BOS", city: "Boston", name: "Celtics", full_name: "Boston Celtics", conference: "Eastern", division: "Atlantic" },
  GSW: { id: 9, abbreviation: "GSW", city: "Golden State", name: "Warriors", full_name: "Golden State Warriors", conference: "Western", division: "Pacific" },
  NYK: { id: 18, abbreviation: "NYK", city: "New York", name: "Knicks", full_name: "New York Knicks", conference: "Eastern", division: "Atlantic" },
  CHI: { id: 4, abbreviation: "CHI", city: "Chicago", name: "Bulls", full_name: "Chicago Bulls", conference: "Eastern", division: "Central" },
  MIA: { id: 14, abbreviation: "MIA", city: "Miami", name: "Heat", full_name: "Miami Heat", conference: "Eastern", division: "Southeast" },
  DAL: { id: 6, abbreviation: "DAL", city: "Dallas", name: "Mavericks", full_name: "Dallas Mavericks", conference: "Western", division: "Southwest" },
  DEN: { id: 7, abbreviation: "DEN", city: "Denver", name: "Nuggets", full_name: "Denver Nuggets", conference: "Western", division: "Northwest" },
  PHX: { id: 21, abbreviation: "PHX", city: "Phoenix", name: "Suns", full_name: "Phoenix Suns", conference: "Western", division: "Pacific" },
  OKC: { id: 25, abbreviation: "OKC", city: "Oklahoma City", name: "Thunder", full_name: "Oklahoma City Thunder", conference: "Western", division: "Northwest" },
};

// mulberry32: keeps --demo output stable so diffs and docs do not churn.
function demoRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getDemoData(teamAbbr) {
  const abbr = teamAbbr.toUpperCase();
  const team = DEMO_TEAMS[abbr] || {
    id: 1, abbreviation: abbr, city: abbr, name: abbr,
    full_name: `${abbr} Team`, conference: "Western", division: "Pacific",
  };
  team.standingSummary ||= `1st in ${team.division} Division`;
  // DEMO_TEAMS entries use ESPN's "GS" rather than "GSW".
  const opponents = ["GSW", "DEN", "PHX", "SAC", "DAL"].map((t) => ESPN_ABBR[t] || t).filter((t) => t !== abbr);
  const rnd = demoRandom([...abbr].reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const games = opponents.slice(0, 5).map((opp, i) => {
    const won = rnd() > 0.4;
    const teamScore = won ? 105 + Math.floor(rnd() * 20) : 95 + Math.floor(rnd() * 10);
    const oppScore = won ? 95 + Math.floor(rnd() * 10) : 105 + Math.floor(rnd() * 20);
    const d = new Date();
    d.setDate(d.getDate() - (i * 3 + 1));
    return {
      date: d.toISOString(),
      completed: true,
      isHome: i % 2 === 0,
      // Match real output, where ESPN abbreviations like "GS" are used.
      opponent: ESPN_ABBR[opp] || opp,
      teamScore,
      oppScore,
    };
  });
  // A scheduled game so the demo shows the next-game line too.
  const upcoming = new Date();
  upcoming.setDate(upcoming.getDate() + 2);
  // 03:00 UTC is a typical 10 PM Eastern tip-off.
  upcoming.setUTCHours(3, 0, 0, 0);
  games.push({
    date: upcoming.toISOString(),
    completed: false,
    isHome: true,
    opponent: ESPN_ABBR[opponents[1]] || opponents[1],
    teamScore: 0,
    oppScore: 0,
  });

  return {
    team,
    games,
    record: {
      wins: 48,
      losses: 22,
      home: "26-10",
      road: "22-12",
      streak: "W2",
      lastTen: "7-3",
      seed: "1",
    },
    season: espnSeason(),
  };
}

const isDemo = process.argv.includes("--demo");
const updateReadme = process.argv.includes("--update-readme");

const PREVIEW_START = "<!-- preview:start -->";
const PREVIEW_END = "<!-- preview:end -->";

// Replaces the README block between the preview markers so the documented output
// tracks the published gist.
function replacePreview(markdown, content) {
  const start = markdown.indexOf(PREVIEW_START);
  const end = markdown.indexOf(PREVIEW_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README is missing ${PREVIEW_START} / ${PREVIEW_END} markers.`);
  }
  const head = markdown.slice(0, start + PREVIEW_START.length);
  const tail = markdown.slice(end);
  return `${head}\n\n${content.trim()}\n\n${tail}`;
}

function validateConfig(env = process.env, { demo = false } = {}) {
  const config = {
    gistId: env.GIST_ID,
    githubToken: env.GH_TOKEN,
    nbaTeam: env.NBA_TEAM,
  };
  const missing = [];
  if (!config.gistId) missing.push("GIST_ID");
  if (!config.githubToken) missing.push("GH_TOKEN");
  if (!config.nbaTeam) missing.push("NBA_TEAM");
  // Demo previews render offline, so only a team is needed.
  if (missing.length > 0 && !(demo && missing.length === 2 && !missing.includes("NBA_TEAM"))) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. See .env.example for setup.`
    );
  }
  if (config.nbaTeam && !ESPN_TEAM_IDS[config.nbaTeam.toUpperCase()]) {
    throw new Error(`Unknown NBA_TEAM "${config.nbaTeam}". See the team table in README.md.`);
  }
  const placeholders = Object.entries(PLACEHOLDER_VALUES)
    .filter(([key]) => config[key] && PLACEHOLDER_VALUES[key].includes(config[key]));
  if (placeholders.length > 0) {
    throw new Error(
      `Still using the placeholder value for ${placeholders.map(([key]) => ENV_NAMES[key]).join(", ")}. ` +
        "Copy .env.example to .env and fill in your own values."
    );
  }
  return config;
}

// Guards against overwriting a good gist with a stub. A transient ESPN failure
// yields no games, no live score and no usable standings, and a standings-only
// response means the schedule query failed — either way the game list is the
// core of the gist, so require it.
function hasUsableData({ games = [], record, liveGame } = {}) {
  const hasGames = games.length > 0;
  const hasRecord = (record?.wins ?? 0) + (record?.losses ?? 0) > 0;
  const scheduleFailed = hasRecord && !hasGames;
  return (hasGames || Boolean(liveGame)) && !scheduleFailed;
}

function renderGist({ team, games, record, season, liveGame }) {
  const emoji = TEAM_EMOJI[team.abbreviation] || "🏀";
  const nbaId = NBA_TEAM_IDS[team.abbreviation] || 0;
  const logoUrl = `https://cdn.nba.com/logos/nba/${nbaId}/global/L/logo.svg`;

  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const winPct =
    wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : "0.0";
  const recentGames = games.filter((g) => g.completed).slice(-5).reverse();
  const nextGame = games.find((g) => !g.completed && new Date(g.date) > new Date());

  const lines = [];

  // Team logo
  lines.push(`<img src="${logoUrl}" width="60" align="right" />`);
  lines.push("");

  // Header
  lines.push(`### ${emoji} ${team.full_name} (${team.abbreviation})`);
  if (team.conference && team.division) {
    lines.push(`${team.conference} Conference · ${team.division} Division`);
  }
  lines.push("");

  // Preseason results do not count toward the standings, so tally them separately
  // until the regular season starts.
  const exhibition = wins + losses === 0 ? tallyPreseason(games) : null;

  // Season record. Markdown joins adjacent lines into one paragraph, so the stats
  // block is emitted as a single paragraph with hard breaks (two trailing spaces).
  if (wins + losses > 0) {
    const stats = [
      `📊 **${season - 1}-${season} Record: ${wins}W - ${losses}L (${winPct}%)**`,
      `\`${generateBarChart(parseFloat(winPct), 25)}\``,
    ];
    const standing = team.standingSummary ? formatStanding(team.standingSummary) : "";
    const seed = formatSeed(record?.seed);
    if (standing || seed) {
      stats.push(`🏅 ${[standing, seed].filter(Boolean).join(" · ")}`);
    }
    const details = formatRecordDetails(record);
    if (details) {
      stats.push(details);
    }
    // <br> rather than trailing double spaces: it survives editors that strip
    // trailing whitespace.
    lines.push(stats.join("<br>\n"));
    lines.push("");
  } else if (exhibition) {
    lines.push(`📊 **Preseason: ${exhibition.wins}W - ${exhibition.losses}L**`);
    lines.push("");
  }

  // Recent games
  if (recentGames.length > 0) {
    lines.push("**📅 Recent Games**");
    lines.push("```");
    for (const game of recentGames) {
      lines.push(formatGameResult(game));
    }
    lines.push("```");
  } else {
    lines.push("📅 No completed games in this season yet");
  }

  if (liveGame) {
    lines.push("");
    lines.push(formatLiveGame(liveGame, team.abbreviation));
  }

  if (nextGame) {
    lines.push("");
    lines.push(formatNextGame(nextGame));
  }

  return { emoji, content: lines.join("\n") };
}

async function main(env = process.env) {
  const config = validateConfig(env, { demo: isDemo });
  const teamAbbr = config.nbaTeam.toUpperCase();
  if (isDemo) {
    console.log("Preview only (--demo): the gist will not be updated.");
  }

  console.log(`🏀 ${isDemo ? "[DEMO] " : ""}Fetching data for ${teamAbbr}...`);

  let team, games, record, season, liveGame = null;

  if (isDemo) {
    ({ team, games, record, season } = getDemoData(teamAbbr));
    console.log(`[DEMO] Using sample data for ${team.full_name}`);
  } else {
    team = await fetchTeam(teamAbbr);
    if (!team) {
      throw new Error(
        `Could not load team "${teamAbbr}" from ESPN. Check the NBA_TEAM abbreviation and the network.`
      );
    }
    ({ games, record, season } = await fetchTeamSeason(teamAbbr));
    if (record) {
      team.conference = record.conference;
      team.division = record.division;
    }
    liveGame = await fetchLiveGame(teamAbbr);

    // Leave the published gist alone rather than replacing it with a stub; the
    // non-zero exit makes the failure visible in the Actions run.
    if (!hasUsableData({ games, record, liveGame })) {
      throw new Error(
        "ESPN returned no games, live score or standings; leaving the gist unchanged. " +
          "This is usually a temporary ESPN outage."
      );
    }
  }

  console.log(`Found: ${team.full_name} (${team.abbreviation})`);

  const { emoji, content } = renderGist({ team, games, record, season, liveGame });
  console.log("\n--- Gist Preview ---");
  console.log(content);
  console.log("--- End Preview ---\n");

  if (updateReadme && !isDemo) {
    // The README is documentation: keep the transient in-game line out of it so
    // the preview does not describe a game that finished hours ago.
    const readmeContent = renderGist({ team, games, record, season }).content;
    await writeReadme(readmeContent);
  }

  if (isDemo) {
    console.log("⚠️  Skipping gist update (demo mode)");
  } else {
    await updateGist(config, team, content, emoji);
  }
}

async function writeReadme(content, readmePath = undefined) {
  // Resolved from the caller's directory: inside the bundled action __dirname is dist/.
  const target = readmePath || path.join(process.env.GITHUB_WORKSPACE || process.cwd(), "README.md");
  const markdown = await fs.readFile(target, "utf8");
  const updated = replacePreview(markdown, content);
  if (updated === markdown) {
    console.log("README preview is already up to date.");
    return false;
  }
  await fs.writeFile(target, updated);
  console.log("README preview updated.");
  return true;
}

// Rewrites the gist's existing file in place (renaming it to the team) rather than
// adding a second file.
function buildGistFiles(files, { team, content, emoji }) {
  const filename = Object.keys(files || {})[0];
  if (!filename) {
    throw new Error("Gist has no files to update.");
  }
  return {
    [filename]: {
      filename: `${emoji} ${team.full_name} — NBA.md`,
      content,
    },
  };
}

async function updateGist(config, team, content, emoji) {
  let gist;
  try {
    gist = await octokit.gists.get({ gist_id: config.gistId });
  } catch (error) {
    throw new Error(`Unable to get gist: ${error.message}`, { cause: error });
  }

  try {
    await octokit.gists.update({
      gist_id: config.gistId,
      files: buildGistFiles(gist.data.files, { team, content, emoji }),
    });
    console.log("✅ Gist updated successfully!");
  } catch (error) {
    throw new Error(`Unable to update gist: ${error.message}`, { cause: error });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  espnSeason,
  formatStanding,
  formatSeed,
  formatRecordDetails,
  parseTeam,
  parseSchedule,
  parseStandings,
  parseGame,
  formatGameResult,
  formatNextGame,
  formatLiveGame,
  parseLiveGame,
  generateBarChart,
  getDemoData,
  validateConfig,
  renderGist,
  hasUsableData,
  TEAM_EMOJI,
  NBA_TEAM_IDS,
  ESPN_TEAM_IDS,
  scheduleSeasons,
  fetchTeamSeason,
  buildGistFiles,
  writeReadme,
  replacePreview,
  PREVIEW_START,
  PREVIEW_END,
};
