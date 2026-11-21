# Contributing to nba-box

Thanks for your interest in contributing! Here's how you can help.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a branch for your change: `git checkout -b feat/your-feature`
4. Install dependencies: `npm install`
5. Make your changes
6. Run the linter and tests: `npm run lint && npm test`
7. Test with demo mode: `NBA_TEAM=LAL node index.js --demo`
8. Commit and push your branch
9. Open a Pull Request

## Development

### Prerequisites

- Node.js 26+ (latest 26.x)
- npm

### Running Locally

```bash
cp .env.example .env
# Fill in your values (.env is git-ignored)
npm install
npm start
```

### Demo Mode

Preview the output without a gist or token:

```bash
NBA_TEAM=BOS node index.js --demo
```

### Refreshing the README preview

The block between `<!-- preview:start -->` and `<!-- preview:end -->` is generated from the gist
content and refreshed by the daily workflow. To update it locally you need working credentials:

```bash
GIST_ID=... GH_TOKEN=... NBA_TEAM=LAL node index.js --update-readme
```

The gist itself is still updated by that run, so prefer `--demo` while developing.

### Tests

```bash
npm test        # node:test, no extra dependencies
npm run lint
npm run build   # rebuild dist/ after changing index.js
```

## Pull Request Guidelines

- Keep PRs focused on a single change
- Run `npm run lint` and `npm test` before submitting
- Update the README if your change affects usage
- Add a clear description of what your PR does

## Adding a New Feature

If you'd like to add a new feature (e.g., additional stats, new data sources), please open an issue first to discuss it.

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your Node.js version and OS

## Code Style

- This project uses ESLint for linting
- Follow existing patterns in `index.js`
- Use `const` over `let` — no `var`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
