# 🏀 nba-box

> Update a pinned gist to contain your favourite NBA team's stats and logo

📌✨ For more pinned-gist projects like this one, check out: [awesome-pinned-gists](https://github.com/matchai/awesome-pinned-gists)

---

## Preview

<img src="https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg" width="60" align="right" />

### 👑 Los Angeles Lakers (LAL)
West Conference · Pacific Division

📊 2025-2026 Record: 57W - 35L (62.0%)
&nbsp;&nbsp;&nbsp;███████████████▌░░░░░░░░░

**📅 Recent Games:**
```
❌ L 110-115 vs OKC (May 10)
❌ L 108-131 vs OKC (May 8)
❌ L 107-125 @ OKC (May 6)
❌ L  90-108 @ OKC (May 4)
✅ W  98-78  @ HOU (Apr 30)
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

Team data powered by the [BallDontLie API](https://www.balldontlie.io/) (free tier).

Team logos available at: `https://cdn.nba.com/logos/nba/{team_id}/global/L/logo.svg`

## License

MIT
