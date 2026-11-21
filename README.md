# 🏀 nba-box

> Update a pinned gist to contain your favourite NBA team's stats and logo

[![CI](https://github.com/23seriy/nba-box/actions/workflows/ci.yml/badge.svg)](https://github.com/23seriy/nba-box/actions/workflows/ci.yml)
[![Update NBA Gist](https://github.com/23seriy/nba-box/actions/workflows/schedule.yml/badge.svg)](https://github.com/23seriy/nba-box/actions/workflows/schedule.yml)

📌✨ For more pinned-gist projects like this one, check out [awesome-pinned-gists](https://github.com/matchai/awesome-pinned-gists).

🔎 **[Browse a live example gist →](https://gist.github.com/23seriy/48decce0c3243d968abb6e30e480eccb)** — refreshed every hour.

---

## What it shows

<!-- preview:start -->

<img src="https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg" width="60" align="right" />

### 👑 Los Angeles Lakers (LAL)
Western Conference · Pacific Division

📊 2026-2027 Record: 14W - 3L (82.4%)
   ████████████████████▌░░░░
🏅 1st in Pacific Division · #1 seed
🏠 7-2 · ✈️ 7-1 · 🔥 W1 · 📈 Last 10: 9-1

**📅 Recent Games:**
```
✅ W 106-104 vs SAC (Nov 20)
❌ L  97-109 vs UTAH (Nov 18)
✅ W 118-114 vs CHA (Nov 17)
✅ W 131-123 @ PHX (Nov 15)
✅ W 123-112 @ MIL (Nov 11)
```

🏟️ Next: vs UTAH — Nov 23, 10:00 PM ET

<!-- preview:end -->

A game in progress appears as a 🔴 Live line with the score and game clock, above the next game.

The block above is generated from the live example gist and refreshed once a day.

### Features

- 🔴 **Live scores** with the game clock while your team plays.
- 📊 **Season record** with a win-rate bar, division/conference standing, playoff seed, home/road
  splits, current streak and last-10 form.
- 📅 **Last five results** and the **next game** with tip-off time in ET.
- 🏀 **All 30 teams** — just set one abbreviation.
- 🔁 **No maintenance** — GitHub Actions refreshes the gist hourly.
- 🔑 **No API key** — ESPN's public endpoints only.

### How it works

GitHub Actions refreshes the gist every hour, so results and live scores appear within the hour. The
season is read from ESPN rather than the calendar: until a game of the new season is played, the most
recently completed season (including its playoff run) is shown instead of an empty record.

## Setup

### Requirements

- A **public** gist, so it can be pinned to your profile.
- A **classic** personal access token with the `gist` scope — fine-grained tokens cannot access gists.
- Node.js 26+ for local runs only; the scheduled workflow needs nothing but the secrets below.

### Prep Work

1. Create a new public GitHub Gist at [gist.github.com](https://gist.github.com/) — give it any filename/content.
2. Create a GitHub token with the `gist` scope: [github.com/settings/tokens/new](https://github.com/settings/tokens/new)

### Project Setup

1. Fork this repo
2. Go to repo **Settings → Secrets and variables → Actions**
3. Add these secrets:

| Secret | Description |
|--------|-------------|
| `GIST_ID` | The ID from your gist URL (e.g., `6d5f84419863089a167387da62dd7081`) |
| `GH_TOKEN` | GitHub token with `gist` scope |
| `NBA_TEAM` | Team abbreviation (see table below) |

4. Run the workflow once (**Actions → Update NBA Gist → Run workflow**) to populate the gist right away.
5. Pin the gist to your profile: gist → **Pin to profile**.

### Run Locally

```bash
cp .env.example .env   # .env is git-ignored, never commit it
# Fill in GIST_ID, GH_TOKEN and NBA_TEAM
npm install
npm start
```

Preview the output without a gist or token:

```bash
NBA_TEAM=LAL node index.js --demo
```

## ❓ FAQ

**The gist still shows the previous season's record during the offseason** — that is expected: until a
game of the new season has been played, the most recently completed season is shown.

**The workflow fails with `Missing required environment variable(s)`** — one of `GIST_ID`, `GH_TOKEN`
or `NBA_TEAM` is not set as a repository secret (Settings → Secrets and variables → Actions).

**`Still using the placeholder value for GIST_ID`** — the copied `.env.example` was not filled in. Replace
the placeholder values in `.env`, or set your own.

**`Unable to get gist: Bad credentials`** — the `GH_TOKEN` is invalid or expired; create a new token
with the `gist` scope.

**The gist does not update after editing the workflow** — scheduled workflows only reload their
definition after an event triggers the workflow; run it once from **Actions → Update NBA Gist → Run workflow**.

**The gist is out of date** — scheduled runs can be delayed or skipped (and GitHub disables them after
60 days without repository activity). Trigger **Actions → Update NBA Gist → Run workflow** to refresh on demand.

**`Unknown NBA_TEAM "XYZ"`** — use one of the abbreviations in the table below.

**The gist still shows an old team after changing `NBA_TEAM`** — the scheduled run renames the gist
file to the new team; the pinned gist itself is reused, so no action is needed.

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://a.espncdn.com/i/teamlogos/leagues/500-dark/nba.png"><img src="https://a.espncdn.com/i/teamlogos/leagues/500/nba.png" alt="NBA logo" height="28"></picture> NBA Team Abbreviations

| | Team | Abbr | | | Team | Abbr |
|---|------|------|-|---|------|------|
| <img src="https://cdn.nba.com/logos/nba/1610612737/global/L/logo.svg" width="20"> | Atlanta Hawks | ATL | | <img src="https://cdn.nba.com/logos/nba/1610612748/global/L/logo.svg" width="20"> | Miami Heat | MIA |
| <img src="https://cdn.nba.com/logos/nba/1610612738/global/L/logo.svg" width="20"> | Boston Celtics | BOS | | <img src="https://cdn.nba.com/logos/nba/1610612749/global/L/logo.svg" width="20"> | Milwaukee Bucks | MIL |
| <img src="https://cdn.nba.com/logos/nba/1610612751/global/L/logo.svg" width="20"> | Brooklyn Nets | BKN | | <img src="https://cdn.nba.com/logos/nba/1610612750/global/L/logo.svg" width="20"> | Minnesota Timberwolves | MIN |
| <img src="https://cdn.nba.com/logos/nba/1610612766/global/L/logo.svg" width="20"> | Charlotte Hornets | CHA | | <img src="https://cdn.nba.com/logos/nba/1610612740/global/L/logo.svg" width="20"> | New Orleans Pelicans | NOP |
| <img src="https://cdn.nba.com/logos/nba/1610612741/global/L/logo.svg" width="20"> | Chicago Bulls | CHI | | <img src="https://cdn.nba.com/logos/nba/1610612752/global/L/logo.svg" width="20"> | New York Knicks | NYK |
| <img src="https://cdn.nba.com/logos/nba/1610612739/global/L/logo.svg" width="20"> | Cleveland Cavaliers | CLE | | <img src="https://cdn.nba.com/logos/nba/1610612760/global/L/logo.svg" width="20"> | Oklahoma City Thunder | OKC |
| <img src="https://cdn.nba.com/logos/nba/1610612742/global/L/logo.svg" width="20"> | Dallas Mavericks | DAL | | <img src="https://cdn.nba.com/logos/nba/1610612753/global/L/logo.svg" width="20"> | Orlando Magic | ORL |
| <img src="https://cdn.nba.com/logos/nba/1610612743/global/L/logo.svg" width="20"> | Denver Nuggets | DEN | | <img src="https://cdn.nba.com/logos/nba/1610612755/global/L/logo.svg" width="20"> | Philadelphia 76ers | PHI |
| <img src="https://cdn.nba.com/logos/nba/1610612765/global/L/logo.svg" width="20"> | Detroit Pistons | DET | | <img src="https://cdn.nba.com/logos/nba/1610612756/global/L/logo.svg" width="20"> | Phoenix Suns | PHX |
| <img src="https://cdn.nba.com/logos/nba/1610612744/global/L/logo.svg" width="20"> | Golden State Warriors | GSW | | <img src="https://cdn.nba.com/logos/nba/1610612757/global/L/logo.svg" width="20"> | Portland Trail Blazers | POR |
| <img src="https://cdn.nba.com/logos/nba/1610612745/global/L/logo.svg" width="20"> | Houston Rockets | HOU | | <img src="https://cdn.nba.com/logos/nba/1610612758/global/L/logo.svg" width="20"> | Sacramento Kings | SAC |
| <img src="https://cdn.nba.com/logos/nba/1610612754/global/L/logo.svg" width="20"> | Indiana Pacers | IND | | <img src="https://cdn.nba.com/logos/nba/1610612759/global/L/logo.svg" width="20"> | San Antonio Spurs | SAS |
| <img src="https://cdn.nba.com/logos/nba/1610612746/global/L/logo.svg" width="20"> | LA Clippers | LAC | | <img src="https://cdn.nba.com/logos/nba/1610612761/global/L/logo.svg" width="20"> | Toronto Raptors | TOR |
| <img src="https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg" width="20"> | Los Angeles Lakers | LAL | | <img src="https://cdn.nba.com/logos/nba/1610612762/global/L/logo.svg" width="20"> | Utah Jazz | UTA |
| <img src="https://cdn.nba.com/logos/nba/1610612763/global/L/logo.svg" width="20"> | Memphis Grizzlies | MEM | | <img src="https://cdn.nba.com/logos/nba/1610612764/global/L/logo.svg" width="20"> | Washington Wizards | WAS |

## 🔌 Data source

Everything comes from ESPN's public endpoints — no API key, no scraping:

| Data | Endpoint |
|------|----------|
| Season record, division/conference standing | `site.web.api.espn.com/apis/v2/sports/basketball/nba/standings` |
| Schedule, results, next game | `site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/schedule` |
| Live scores and game clock | `site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard` |

Team logos: `https://cdn.nba.com/logos/nba/{team_id}/global/L/logo.svg`

The season is read from ESPN rather than the calendar, and regular-season and postseason games are
requested separately because ESPN numbers those seasons a year apart.

## 🤝 Contributing

Bug reports and pull requests are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[code of conduct](./CODE_OF_CONDUCT.md). For security issues, see [SECURITY.md](./SECURITY.md).

## 📄 License

[MIT](./LICENSE) © Sergei Olshanetski
