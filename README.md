# 🏀 nba-box

> Update a pinned gist to contain your favourite NBA team's stats and logo

📌✨ For more pinned-gist projects like this one, check out: [awesome-pinned-gists](https://github.com/matchai/awesome-pinned-gists)

---

## Preview

```
👑 Los Angeles Lakers (LAL)
   West Conference · Pacific Division

📊 2025-2026 Record: 45W - 22L (67.2%)
   █████████████████░░░░░░░░

📅 Recent Games:
   ✅ W 118-105 vs GSW (Jul 20)
   ❌ L  98-112 @ DEN (Jul 18)
   ✅ W 125-110 vs PHX (Jul 15)
   ✅ W 108-101 @ SAC (Jul 13)
   ✅ W 115-109 vs DAL (Jul 10)
```

## Setup

### Prep Work

1. Create a new public GitHub Gist at [gist.github.com](https://gist.github.com/) — give it any filename/content.
2. Create a GitHub token with the `gist` scope: [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
3. Create a free BallDontLie API account: [app.balldontlie.io](https://app.balldontlie.io) and copy your API key.

### Project Setup

1. Fork this repo
2. Go to repo **Settings → Secrets and variables → Actions**
3. Add these secrets:

| Secret | Description |
|--------|-------------|
| `GIST_ID` | The ID from your gist URL (e.g., `6d5f84419863089a167387da62dd7081`) |
| `GH_TOKEN` | GitHub token with `gist` scope |
| `BDL_API_KEY` | Your BallDontLie API key |
| `NBA_TEAM` | Team abbreviation (see table below) |

### Run Locally

```bash
cp sample.env .env
# Fill in your values in .env
npm install
npm start
```

## NBA Team Abbreviations

| Team | Abbr | | Team | Abbr |
|------|------|-|------|------|
| Atlanta Hawks | ATL | | Milwaukee Bucks | MIL |
| Boston Celtics | BOS | | Minnesota Timberwolves | MIN |
| Brooklyn Nets | BKN | | New Orleans Pelicans | NOP |
| Charlotte Hornets | CHA | | New York Knicks | NYK |
| Chicago Bulls | CHI | | Oklahoma City Thunder | OKC |
| Cleveland Cavaliers | CLE | | Orlando Magic | ORL |
| Dallas Mavericks | DAL | | Philadelphia 76ers | PHI |
| Denver Nuggets | DEN | | Phoenix Suns | PHX |
| Detroit Pistons | DET | | Portland Trail Blazers | POR |
| Golden State Warriors | GSW | | Sacramento Kings | SAC |
| Houston Rockets | HOU | | San Antonio Spurs | SAS |
| Indiana Pacers | IND | | Toronto Raptors | TOR |
| LA Clippers | LAC | | Utah Jazz | UTA |
| Los Angeles Lakers | LAL | | Washington Wizards | WAS |
| Memphis Grizzlies | MEM | | | |

## Data Source

Team data powered by the [BallDontLie API](https://www.balldontlie.io/) (free tier).

Team logos available at: `https://cdn.nba.com/logos/nba/{team_id}/global/L/logo.svg`

## License

MIT
