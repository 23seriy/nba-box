# Contributing to nba-box

Thanks for your interest in contributing! Here's how you can help.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a branch for your change: `git checkout -b feat/your-feature`
4. Install dependencies: `npm install`
5. Make your changes
6. Run the linter: `npm run lint`
7. Test with demo mode: `NBA_TEAM=LAL node index.js --demo`
8. Commit and push your branch
9. Open a Pull Request

## Development

### Prerequisites

- Node.js 20+
- npm

### Running Locally

```bash
cp sample.env .env
# Fill in your values
npm install
npm start
```

### Demo Mode

You can preview output without API keys:

```bash
NBA_TEAM=BOS node index.js --demo
```

## Pull Request Guidelines

- Keep PRs focused on a single change
- Run `npm run lint` before submitting
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
