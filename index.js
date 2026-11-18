require("dotenv").config({ quiet: true });
const axios = require("axios");
const { Octokit } = require("@octokit/rest");

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  NBA_TEAM: nbaTeamAbbr,
} = process.env;

const ESPN_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba";
const ESPN_BASE_V2 = "https://site.web.api.espn.com/apis/v2/sports/basketball/nba";
const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept": "application/json",
  "Origin": "https://www.espn.com",
  "Referer": "https://www.espn.com/",
};

const octokit = new Octokit({ auth: `token ${githubToken}` });

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

// ESPN's NBA "season" is the year the season ends (2027 = the 2026-27 season).
// Read the year in US Eastern time, where NBA games are dated.
function espnSeason(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/New_York" }).format(date)
  );
}

function formatStanding(summary) {
  // ESPN reports play-in teams as e.g. "10th in Eastern Conference Division".
  return summary.replace(/ Conference Division$/, " Conference");
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
    const team = data.team;
    if (!team) return null;
    return {
      id: espnId,
      abbreviation: upper,
      city: team.location || "",
      name: team.name,
      full_name: team.displayName,
      conference: "",
      division: "",
      standingSummary: team.standingSummary || "",
    };
  } catch (error) {
    console.error(`Failed to fetch NBA team: ${error.message}`);
    return null;
  }
}

async function fetchSeasonSchedule(teamAbbr, season) {
  try {
    const upper = teamAbbr.toUpperCase();
    const espnId = ESPN_TEAM_IDS[upper];
    const espnAbbr = ESPN_ABBR[upper] || upper;

    const [regData, postData] = await Promise.all([
      axios.get(`${ESPN_BASE}/teams/${espnId}/schedule?season=${season}&seasontype=2`, { headers: ESPN_HEADERS }),
      axios.get(`${ESPN_BASE}/teams/${espnId}/schedule?season=${season}&seasontype=3`, { headers: ESPN_HEADERS }),
    ]);

    const events = [
      ...(regData.data.events || []).map((e) => ({ ...e, gameType: 2 })),
      ...(postData.data.events || []).map((e) => ({ ...e, gameType: 3 })),
    ];

    return events
      .filter((e) => e.competitions?.[0])
      .map((e) => {
        const comp = e.competitions[0];
        const completed = Boolean(comp.status?.type?.completed);
        const teamComp = comp.competitors?.find((c) => c.team?.abbreviation?.toUpperCase() === espnAbbr);
        const oppComp = comp.competitors?.find((c) => c.team?.abbreviation?.toUpperCase() !== espnAbbr);
        if (!teamComp || !oppComp) return null;
        const teamScore = teamComp.score?.value ?? parseFloat(teamComp.score) ?? 0;
        const oppScore = oppComp.score?.value ?? parseFloat(oppComp.score) ?? 0;
        const isHome = teamComp.homeAway === "home";
        return {
          date: e.date,
          postseason: e.gameType === 3,
          completed,
          status: comp.status?.type?.detail || "Scheduled",
          opponent: oppComp.team.abbreviation,
          isHome,
          teamScore,
          oppScore,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (error) {
    console.error(`Failed to fetch NBA games: ${error.message}`);
    return [];
  }
}

async function fetchSeasonRecord(teamAbbr, season) {
  try {
    const espnAbbr = ESPN_ABBR[teamAbbr.toUpperCase()] || teamAbbr.toUpperCase();
    const { data } = await axios.get(
      `${ESPN_BASE_V2}/standings?level=3&season=${season}&seasontype=2`,
      { headers: ESPN_HEADERS }
    );
    for (const conf of (data.children || [])) {
      for (const div of (conf.children || [])) {
        const entry = (div.standings?.entries || []).find(
          (e) => e.team?.abbreviation?.toUpperCase() === espnAbbr
        );
        if (entry) {
          const stats = Object.fromEntries((entry.stats || []).map((s) => [s.name, s.value]));
          return {
            wins: stats.wins || 0,
            losses: stats.losses || 0,
            conference: conf.name?.replace(" Conference", "") || "",
            division: div.name?.replace(" Division", "") || "",
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch NBA standings: ${error.message}`);
    return null;
  }
}

// Picks the season being shown: the current ESPN season, or the most recently
// completed one during the offseason, when no game of the current season has been played.
async function fetchTeamSeason(teamAbbr) {
  const currentSeason = espnSeason();
  let record = await fetchSeasonRecord(teamAbbr, currentSeason);
  let games = await fetchSeasonSchedule(teamAbbr, currentSeason);

  if (games.some((g) => g.completed)) {
    return { season: currentSeason, record, games };
  }

  const previousSeason = currentSeason - 1;
  console.log(`No games played in the ${currentSeason} season yet, showing ${previousSeason}.`);
  record = (await fetchSeasonRecord(teamAbbr, previousSeason)) || record;
  games = await fetchSeasonSchedule(teamAbbr, previousSeason);

  return { season: previousSeason, record, games };
}

function formatGameResult(game) {
  const won = game.teamScore > game.oppScore;
  const prefix = game.isHome ? "vs" : "@";
  const result = won ? "W" : "L";
  const dateStr = new Date(game.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${result === "W" ? "✅" : "❌"} ${result} ${String(game.teamScore).padStart(3)}-${String(game.oppScore).padEnd(3)} ${prefix} ${game.opponent.padEnd(3)} (${dateStr})`;
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

  return `🏟️ Next: ${prefix} ${game.opponent} — ${when} ET`;
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
  LAL: { id: 13, abbreviation: "LAL", city: "Los Angeles", name: "Lakers", full_name: "Los Angeles Lakers", conference: "West", division: "Pacific" },
  BOS: { id: 2, abbreviation: "BOS", city: "Boston", name: "Celtics", full_name: "Boston Celtics", conference: "East", division: "Atlantic" },
  GSW: { id: 9, abbreviation: "GSW", city: "Golden State", name: "Warriors", full_name: "Golden State Warriors", conference: "West", division: "Pacific" },
  NYK: { id: 18, abbreviation: "NYK", city: "New York", name: "Knicks", full_name: "New York Knicks", conference: "East", division: "Atlantic" },
  CHI: { id: 4, abbreviation: "CHI", city: "Chicago", name: "Bulls", full_name: "Chicago Bulls", conference: "East", division: "Central" },
  MIA: { id: 14, abbreviation: "MIA", city: "Miami", name: "Heat", full_name: "Miami Heat", conference: "East", division: "Southeast" },
  DAL: { id: 6, abbreviation: "DAL", city: "Dallas", name: "Mavericks", full_name: "Dallas Mavericks", conference: "West", division: "Southwest" },
  DEN: { id: 7, abbreviation: "DEN", city: "Denver", name: "Nuggets", full_name: "Denver Nuggets", conference: "West", division: "Northwest" },
  PHX: { id: 21, abbreviation: "PHX", city: "Phoenix", name: "Suns", full_name: "Phoenix Suns", conference: "West", division: "Pacific" },
  OKC: { id: 25, abbreviation: "OKC", city: "Oklahoma City", name: "Thunder", full_name: "Oklahoma City Thunder", conference: "West", division: "Northwest" },
};

function getDemoData(teamAbbr) {
  const abbr = teamAbbr.toUpperCase();
  const team = DEMO_TEAMS[abbr] || {
    id: 1, abbreviation: abbr, city: abbr, name: abbr,
    full_name: `${abbr} Team`, conference: "West", division: "Pacific",
  };
  const opponents = ["GSW", "DEN", "PHX", "SAC", "DAL"].filter((t) => t !== abbr);
  const games = opponents.slice(0, 5).map((opp, i) => {
    const won = Math.random() > 0.4;
    const teamScore = won ? 105 + Math.floor(Math.random() * 20) : 95 + Math.floor(Math.random() * 10);
    const oppScore = won ? 95 + Math.floor(Math.random() * 10) : 105 + Math.floor(Math.random() * 20);
    const d = new Date();
    d.setDate(d.getDate() - (i * 3 + 1));
    return {
      date: d.toISOString(),
      completed: true,
      isHome: i % 2 === 0,
      opponent: opp,
      teamScore,
      oppScore,
    };
  });
  return {
    team,
    games,
    record: { wins: 48, losses: 22 },
    season: espnSeason(),
  };
}

const isDemo = process.argv.includes("--demo");

function validateConfig() {
  const missing = [];
  if (!gistId) missing.push("GIST_ID");
  if (!githubToken) missing.push("GH_TOKEN");
  if (!nbaTeamAbbr) missing.push("NBA_TEAM");
  // Demo previews render offline, so only a team is needed.
  if (missing.length > 0 && !(isDemo && missing.length === 2 && !missing.includes("NBA_TEAM"))) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. See sample.env for setup.`
    );
  }
  if (!ESPN_TEAM_IDS[nbaTeamAbbr.toUpperCase()]) {
    throw new Error(`Unknown NBA_TEAM "${nbaTeamAbbr}". See the team table in README.md.`);
  }
  if (isDemo) {
    console.log("Preview only (--demo): the gist will not be updated.");
  }
}

async function main() {
  validateConfig();

  const teamAbbr = nbaTeamAbbr.toUpperCase();

  console.log(`🏀 ${isDemo ? "[DEMO] " : ""}Fetching data for ${teamAbbr}...`);

  let team, games, record, season;

  if (isDemo) {
    const demo = getDemoData(teamAbbr);
    ({ team, games, record, season } = demo);
    console.log(`[DEMO] Using sample data for ${team.full_name}`);
  } else {
    team = await fetchTeam(teamAbbr);
    if (!team) {
      throw new Error(`Could not find team "${teamAbbr}". Check the NBA_TEAM abbreviation.`);
    }
    ({ games, record, season } = await fetchTeamSeason(teamAbbr));
    if (record) {
      team.conference = record.conference;
      team.division = record.division;
    }
  }

  const emoji = TEAM_EMOJI[team.abbreviation] || "🏀";
  const nbaId = NBA_TEAM_IDS[team.abbreviation] || 0;
  const logoUrl = `https://cdn.nba.com/logos/nba/${nbaId}/global/L/logo.svg`;

  console.log(`Found: ${team.full_name} (${team.abbreviation})`);
  console.log(`Logo: ${logoUrl}`);

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

  // Season record
  if (wins + losses > 0) {
    lines.push(`📊 ${season - 1}-${season} Record: ${wins}W - ${losses}L (${winPct}%)`);
    lines.push(`   ${generateBarChart(parseFloat(winPct), 25)}`);
    if (team.standingSummary) {
      lines.push(`🏅 ${formatStanding(team.standingSummary)}`);
    }
    lines.push("");
  }

  // Recent games
  if (recentGames.length > 0) {
    lines.push("**📅 Recent Games:**");
    lines.push("```");
    for (const game of recentGames) {
      lines.push(formatGameResult(game));
    }
    lines.push("```");
  } else {
    lines.push("📅 No completed games in this season yet");
  }

  if (nextGame) {
    lines.push("");
    lines.push(formatNextGame(nextGame));
  }

  const content = lines.join("\n");
  console.log("\n--- Gist Preview ---");
  console.log(content);
  console.log("--- End Preview ---\n");

  if (isDemo) {
    console.log("⚠️  Skipping gist update (demo mode)");
  } else {
    await updateGist(team, content, emoji);
  }
}

async function updateGist(team, content, emoji) {
  let gist;
  try {
    gist = await octokit.gists.get({ gist_id: gistId });
  } catch (error) {
    throw new Error(`Unable to get gist: ${error.message}`, { cause: error });
  }

  try {
    const filename = Object.keys(gist.data.files)[0];
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `${emoji} ${team.full_name} — NBA.md`,
          content,
        },
      },
    });
    console.log("✅ Gist updated successfully!");
  } catch (error) {
    throw new Error(`Unable to update gist: ${error.message}`, { cause: error });
  }
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
})();
