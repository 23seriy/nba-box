require("dotenv").config();
const axios = require("axios");
const { Octokit } = require("@octokit/rest");

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  BDL_API_KEY: bdlApiKey,
  NBA_TEAM: nbaTeamAbbr,
} = process.env;

const BDL_BASE = "https://api.balldontlie.io/v1";

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

// NBA team logo URLs (cdn.nba.com)
const TEAM_LOGO_URL = (teamAbbr) =>
  `https://cdn.nba.com/logos/nba/${getTeamNbaId(teamAbbr)}/global/L/logo.svg`;

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

function getTeamNbaId(abbr) {
  return NBA_TEAM_IDS[abbr.toUpperCase()] || 0;
}

async function fetchTeam(teamAbbr) {
  try {
    const { data } = await axios.get(`${BDL_BASE}/teams`, {
      headers: { Authorization: bdlApiKey },
    });
    const team = data.data.find(
      (t) => t.abbreviation.toUpperCase() === teamAbbr.toUpperCase()
    );
    if (!team) {
      console.error(`Team ${teamAbbr} not found`);
      return null;
    }
    return team;
  } catch (error) {
    console.error(`Failed to fetch team: ${error.message}`);
    return null;
  }
}

async function fetchRecentGames(teamId, count = 5) {
  try {
    const today = new Date();
    // Look back 180 days to cover offseason gaps (no NBA games Jul-Sep)
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 180);

    const { data } = await axios.get(`${BDL_BASE}/games`, {
      headers: { Authorization: bdlApiKey },
      params: {
        "team_ids[]": teamId,
        start_date: pastDate.toISOString().split("T")[0],
        end_date: today.toISOString().split("T")[0],
        per_page: 50,
      },
    });

    return data.data
      .filter((g) => g.status === "Final")
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, count);
  } catch (error) {
    console.error(`Failed to fetch games: ${error.message}`);
    return [];
  }
}

async function fetchSeasonRecord(teamId) {
  try {
    const currentYear = new Date().getFullYear();
    const season =
      new Date().getMonth() >= 9 ? currentYear : currentYear - 1;

    const { data } = await axios.get(`${BDL_BASE}/games`, {
      headers: { Authorization: bdlApiKey },
      params: {
        "team_ids[]": teamId,
        seasons: [season],
        per_page: 100,
      },
    });

    const finalGames = data.data.filter((g) => g.status === "Final");
    let wins = 0;
    let losses = 0;

    for (const game of finalGames) {
      const isHome = game.home_team.id === teamId;
      const teamScore = isHome
        ? game.home_team_score
        : game.visitor_team_score;
      const oppScore = isHome
        ? game.visitor_team_score
        : game.home_team_score;

      if (teamScore > oppScore) {
        wins++;
      } else {
        losses++;
      }
    }

    return { wins, losses, season };
  } catch (error) {
    console.error(`Failed to fetch season record: ${error.message}`);
    return { wins: 0, losses: 0, season: 0 };
  }
}

function formatGameResult(game, teamId) {
  const isHome = game.home_team.id === teamId;
  const teamScore = isHome ? game.home_team_score : game.visitor_team_score;
  const oppScore = isHome ? game.visitor_team_score : game.home_team_score;
  const opponent = isHome ? game.visitor_team : game.home_team;
  const won = teamScore > oppScore;
  const prefix = isHome ? "vs" : "@";
  const result = won ? "W" : "L";
  const dateStr = new Date(game.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${result === "W" ? "✅" : "❌"} ${result} ${String(teamScore).padStart(3)}-${String(oppScore).padEnd(3)} ${prefix} ${opponent.abbreviation.padEnd(3)} (${dateStr})`;
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
  LAL: { id: 14, abbreviation: "LAL", city: "Los Angeles", name: "Lakers", full_name: "Los Angeles Lakers", conference: "West", division: "Pacific" },
  BOS: { id: 2, abbreviation: "BOS", city: "Boston", name: "Celtics", full_name: "Boston Celtics", conference: "East", division: "Atlantic" },
  GSW: { id: 10, abbreviation: "GSW", city: "Golden State", name: "Warriors", full_name: "Golden State Warriors", conference: "West", division: "Pacific" },
  NYK: { id: 20, abbreviation: "NYK", city: "New York", name: "Knicks", full_name: "New York Knicks", conference: "East", division: "Atlantic" },
  CHI: { id: 5, abbreviation: "CHI", city: "Chicago", name: "Bulls", full_name: "Chicago Bulls", conference: "East", division: "Central" },
  MIA: { id: 16, abbreviation: "MIA", city: "Miami", name: "Heat", full_name: "Miami Heat", conference: "East", division: "Southeast" },
  DAL: { id: 7, abbreviation: "DAL", city: "Dallas", name: "Mavericks", full_name: "Dallas Mavericks", conference: "West", division: "Southwest" },
  DEN: { id: 8, abbreviation: "DEN", city: "Denver", name: "Nuggets", full_name: "Denver Nuggets", conference: "West", division: "Northwest" },
  PHX: { id: 25, abbreviation: "PHX", city: "Phoenix", name: "Suns", full_name: "Phoenix Suns", conference: "West", division: "Pacific" },
  OKC: { id: 21, abbreviation: "OKC", city: "Oklahoma City", name: "Thunder", full_name: "Oklahoma City Thunder", conference: "West", division: "Northwest" },
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
      status: "Final",
      home_team: i % 2 === 0 ? team : { id: 99, abbreviation: opp },
      visitor_team: i % 2 === 0 ? { id: 99, abbreviation: opp } : team,
      home_team_score: i % 2 === 0 ? teamScore : oppScore,
      visitor_team_score: i % 2 === 0 ? oppScore : teamScore,
    };
  });
  return {
    team,
    games,
    record: { wins: 48, losses: 22, season: new Date().getFullYear() - 1 },
  };
}

const isDemo = process.argv.includes("--demo");

async function main() {
  const teamAbbr = nbaTeamAbbr || "LAL";

  if (!nbaTeamAbbr && !isDemo) {
    console.error("NBA_TEAM environment variable is required (or use --demo)");
    process.exit(1);
  }

  console.log(`🏀 ${isDemo ? "[DEMO] " : ""}Fetching data for ${teamAbbr.toUpperCase()}...`);

  let team, recentGames, record;

  if (isDemo) {
    const demo = getDemoData(teamAbbr);
    team = demo.team;
    recentGames = demo.games;
    record = demo.record;
    console.log(`[DEMO] Using sample data for ${team.full_name}`);
  } else {
    team = await fetchTeam(teamAbbr);
    if (!team) {
      console.error("Could not find team. Check NBA_TEAM abbreviation.");
      process.exit(1);
    }
    // Sequential calls with delay to respect free-tier rate limit (5 req/min)
    recentGames = await fetchRecentGames(team.id, 5);
    await new Promise((r) => setTimeout(r, 15000));
    record = await fetchSeasonRecord(team.id);
  }

  const emoji = TEAM_EMOJI[team.abbreviation] || "🏀";
  const logoUrl = TEAM_LOGO_URL(team.abbreviation);

  console.log(`Found: ${team.full_name} (${team.abbreviation})`);
  console.log(`Logo: ${logoUrl}`);

  const winPct =
    record.wins + record.losses > 0
      ? ((record.wins / (record.wins + record.losses)) * 100).toFixed(1)
      : "0.0";

  const lines = [];

  // Header
  lines.push(`${emoji} ${team.full_name} (${team.abbreviation})`);
  lines.push(`   ${team.conference} Conference · ${team.division} Division`);
  lines.push("");

  // Season record
  if (record.wins + record.losses > 0) {
    lines.push(
      `📊 ${record.season}-${record.season + 1} Record: ${record.wins}W - ${record.losses}L (${winPct}%)`
    );
    lines.push(`   ${generateBarChart(parseFloat(winPct), 25)}`);
    lines.push("");
  }

  // Recent games
  if (recentGames.length > 0) {
    lines.push("📅 Recent Games:");
    for (const game of recentGames) {
      lines.push(`   ${formatGameResult(game, team.id)}`);
    }
  } else {
    lines.push("📅 No recent games found");
  }

  const content = lines.join("\n");
  console.log("\n--- Gist Preview ---");
  console.log(content);
  console.log("--- End Preview ---\n");

  if (gistId && githubToken && !isDemo) {
    await updateGist(team, content, emoji);
  } else {
    console.log("⚠️  Skipping gist update (preview only)");
  }
}

async function updateGist(team, content, emoji) {
  let gist;
  try {
    gist = await octokit.gists.get({ gist_id: gistId });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
    return;
  }

  try {
    const filename = Object.keys(gist.data.files)[0];
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `${emoji} ${team.full_name} — NBA`,
          content,
        },
      },
    });
    console.log("✅ Gist updated successfully!");
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
}

(async () => {
  await main();
})();
