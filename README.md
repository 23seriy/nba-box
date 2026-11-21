# 🏀 nba-box

> Update a pinned gist to contain your favourite NBA team's stats and logo

📌✨ For more pinned-gist projects like this one, check out: [awesome-pinned-gists](https://github.com/matchai/awesome-pinned-gists)

🔎 **[See a live example gist →](https://gist.github.com/23seriy/48decce0c3243d968abb6e30e480eccb)**

---

## Preview

<!-- preview:start -->

<img src="https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg" width="60" align="right" />

### 👑 Los Angeles Lakers (LAL)
Western Conference · Pacific Division

📊 2026-2027 Record: 13W - 3L (81.3%)
   ████████████████████▎░░░░
🏅 1st in Pacific Division

**📅 Recent Games:**
```
❌ L  97-109 vs UTAH (Nov 18)
✅ W 118-114 vs CHA (Nov 17)
✅ W 131-123 @ PHX (Nov 15)
✅ W 123-112 @ MIL (Nov 11)
✅ W 124-114 @ ATL (Nov 9)
```

🏟️ Next: vs UTAH — Nov 23, 10:00 PM ET

<!-- preview:end -->

While a game is in progress the gist also shows a 🔴 Live line with the score and game clock.

**[Live example](https://gist.github.com/23seriy/48decce0c3243d968abb6e30e480eccb)** — a real gist, refreshed every hour. This preview is updated from it once a day.

## Setup

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

Requires Node.js 26+.

```bash
cp .env.example .env
# Fill in your values (.env is git-ignored, never commit it)
npm install
npm start
# Or preview the output offline, no GIST_ID/GH_TOKEN needed:
NBA_TEAM=LAL node index.js --demo
# Also refresh the README preview block (used by the daily workflow):
NBA_TEAM=LAL node index.js --update-readme
```

The gist is refreshed automatically every hour, so results and live scores show up within an hour of
happening. The season is detected from ESPN, so when no game of the upcoming season has been played
yet, the most recently completed season (including playoff games) is shown instead of an empty record.

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
| <img src="https://cdn.nba.com/logos/nba/1610612737/global/L/logo.svg" width="20"> | Atlanta Hawks | ATL | | <img src="https://cdn.nba.com/logos/nba/1610612749/global/L/logo.svg" width="20"> | Milwaukee Bucks | MIL |
| <img src="https://cdn.nba.com/logos/nba/1610612738/global/L/logo.svg" width="20"> | Boston Celtics | BOS | | <img src="https://cdn.nba.com/logos/nba/1610612750/global/L/logo.svg" width="20"> | Minnesota Timberwolves | MIN |
| <img src="https://cdn.nba.com/logos/nba/1610612751/global/L/logo.svg" width="20"> | Brooklyn Nets | BKN | | <img src="https://cdn.nba.com/logos/nba/1610612740/global/L/logo.svg" width="20"> | New Orleans Pelicans | NOP |
| <img src="https://cdn.nba.com/logos/nba/1610612766/global/L/logo.svg" width="20"> | Charlotte Hornets | CHA | | <img src="https://cdn.nba.com/logos/nba/1610612752/global/L/logo.svg" width="20"> | New York Knicks | NYK |
| <img src="https://cdn.nba.com/logos/nba/1610612741/global/L/logo.svg" width="20"> | Chicago Bulls | CHI | | <img src="https://cdn.nba.com/logos/nba/1610612760/global/L/logo.svg" width="20"> | Oklahoma City Thunder | OKC |
| <img src="https://cdn.nba.com/logos/nba/1610612739/global/L/logo.svg" width="20"> | Cleveland Cavaliers | CLE | | <img src="https://cdn.nba.com/logos/nba/1610612753/global/L/logo.svg" width="20"> | Orlando Magic | ORL |
| <img src="https://cdn.nba.com/logos/nba/1610612742/global/L/logo.svg" width="20"> | Dallas Mavericks | DAL | | <img src="https://cdn.nba.com/logos/nba/1610612755/global/L/logo.svg" width="20"> | Philadelphia 76ers | PHI |
| <img src="https://cdn.nba.com/logos/nba/1610612743/global/L/logo.svg" width="20"> | Denver Nuggets | DEN | | <img src="https://cdn.nba.com/logos/nba/1610612756/global/L/logo.svg" width="20"> | Phoenix Suns | PHX |
| <img src="https://cdn.nba.com/logos/nba/1610612765/global/L/logo.svg" width="20"> | Detroit Pistons | DET | | <img src="https://cdn.nba.com/logos/nba/1610612757/global/L/logo.svg" width="20"> | Portland Trail Blazers | POR |
| <img src="https://cdn.nba.com/logos/nba/1610612744/global/L/logo.svg" width="20"> | Golden State Warriors | GSW | | <img src="https://cdn.nba.com/logos/nba/1610612758/global/L/logo.svg" width="20"> | Sacramento Kings | SAC |
| <img src="https://cdn.nba.com/logos/nba/1610612745/global/L/logo.svg" width="20"> | Houston Rockets | HOU | | <img src="https://cdn.nba.com/logos/nba/1610612759/global/L/logo.svg" width="20"> | San Antonio Spurs | SAS |
| <img src="https://cdn.nba.com/logos/nba/1610612754/global/L/logo.svg" width="20"> | Indiana Pacers | IND | | <img src="https://cdn.nba.com/logos/nba/1610612761/global/L/logo.svg" width="20"> | Toronto Raptors | TOR |
| <img src="https://cdn.nba.com/logos/nba/1610612746/global/L/logo.svg" width="20"> | LA Clippers | LAC | | <img src="https://cdn.nba.com/logos/nba/1610612762/global/L/logo.svg" width="20"> | Utah Jazz | UTA |
| <img src="https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg" width="20"> | Los Angeles Lakers | LAL | | <img src="https://cdn.nba.com/logos/nba/1610612764/global/L/logo.svg" width="20"> | Washington Wizards | WAS |
| <img src="https://cdn.nba.com/logos/nba/1610612763/global/L/logo.svg" width="20"> | Memphis Grizzlies | MEM | | <img src="https://cdn.nba.com/logos/nba/1610612748/global/L/logo.svg" width="20"> | Miami Heat | MIA |

## Data Source

Team data powered by ESPN's public APIs (no API key required).

Team logos available at: `https://cdn.nba.com/logos/nba/{team_id}/global/L/logo.svg`

## License

MIT
