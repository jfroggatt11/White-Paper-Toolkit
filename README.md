# PDATF Toolkit

[![CI/CD Pipeline](https://github.com/USERNAME/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/USERNAME/REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/USERNAME/REPO)
[![Test Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen.svg)](./coverage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An interactive toolkit for exploring barrier themes and resources in the PDATF project. Built with React, Vite, and Recharts.

## Disclaimer

This toolkit is provided for general guidance only and does not constitute legal or professional advice. Use of the PDATF Toolkit does not create any legal obligations or guarantees of compliance, approval, or funding. Users are responsible for ensuring their practices meet applicable laws, regulations, and contractual requirements. No liability is accepted for any loss or damage resulting from its use. The content may be updated periodically. Users should refer to the latest version and seek independent advice where needed.

## Features
- Interactive donut chart visualization of themes and barriers
- Search and filter resources by title, description, tags, and personas
- Select inner (themes) or outer (barriers) ring segments to filter results
- Responsive design with sticky header and scrollable results pane
- Data sourced from Google Sheets and transformed at build time

## Tech Stack
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Recharts](https://recharts.org/)
- [TailwindCSS](https://tailwindcss.com/) for styling

## Development

### Install dependencies
```bash
npm install
```

#### Run locally
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## Testing

This project has comprehensive test coverage with multiple testing strategies:

### Unit Tests
Run unit tests with Vitest:
```bash
npm test                  # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Run tests with UI
npm run test:coverage    # Run tests with coverage report
```

### E2E Tests
Run end-to-end tests with Playwright:
```bash
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui      # Run E2E tests with UI
```

### Visual Regression Tests
Run visual regression tests:
```bash
npm run test:visual      # Run visual regression tests
```

### Pre-commit Hooks
This project uses Husky and lint-staged to automatically:
- Run ESLint and fix issues
- Run tests on changed files
- Ensure code quality before commits

### CI/CD Pipeline
Every push and pull request automatically:
- Runs linting checks
- Executes all tests with coverage
- Builds the project
- Runs E2E tests
- Generates and uploads coverage reports

For detailed CI/CD setup instructions, see [CI_CD_SETUP.md](./CI_CD_SETUP.md).

For comprehensive testing documentation, see [TESTING.md](./TESTING.md).

## Getting Started with Testing

After cloning the repository:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run tests to verify setup:**
   ```bash
   npm test
   ```

3. **Install Playwright browsers (for E2E tests):**
   ```bash
   npx playwright install
   ```

4. **Run E2E tests:**
   ```bash
   npm run test:e2e
   ```

### Test Coverage Goals

This project maintains:
- 80%+ code coverage for all metrics
- Comprehensive E2E test coverage for user workflows
- Visual regression tests for UI components
- Performance benchmarks for critical paths
- Accessibility compliance testing

Current coverage: ![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen.svg)

### Deployment

This project is configured for deployment on Netlify.
	•	Build command: npm run build
	•	Publish directory: dist

For single-page app routing, include a _redirects file in public/ with:

/*  /index.html  200

### Environment Variables

At build time, the script scripts/build-data.mjs fetches data from published Google Sheets.

Set these environment variables in Netlify or your local .env file:
	•	RESOURCES_CSV_URL
	•	BARRIER_THEMES_CSV_URL
	•	BARRIERS_CSV_URL

### License

MIT License

