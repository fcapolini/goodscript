# Testing vite-plugin-goodscript

This directory contains comprehensive tests for the GoodScript Vite plugin.

## Test Structure

```
test/
├── unit/              # Unit tests for plugin utilities
├── integration/       # Integration tests using Vite's build API
├── e2e/              # End-to-end tests with Playwright
└── fixtures/         # Test projects
    ├── vanilla-ts/   # Plain TypeScript project
    ├── react-app/    # React + GoodScript
    └── vue-app/      # Vue + GoodScript
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:coverage
```

## Test Categories

### Unit Tests (`test/unit/`)
- Plugin configuration and initialization
- Glob pattern matching
- File resolution logic
- Transform function behavior (mocked)

### Integration Tests (`test/integration/`)
- Full build process with Vite API
- Compilation of `.gs.ts` and `.gs.tsx` files
- Output verification
- Framework integration (React, Vue)

### E2E Tests (`test/e2e/`)
- Browser-based testing with Playwright
- HMR functionality
- Error overlay display
- Real user interaction scenarios

## Test Fixtures

### vanilla-ts
Plain TypeScript project with `.gs.ts` files demonstrating Phase 1 "clean" restrictions.

### react-app
React application with `.gs.tsx` components showing JSX support and integration with @vitejs/plugin-react.

### vue-app
Vue 3 application with `.gs.ts` utility files demonstrating Vue + GoodScript integration.

## Writing New Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import goodscriptPlugin from '../../src/index';

describe('new feature', () => {
  it('should do something', () => {
    const plugin = goodscriptPlugin();
    expect(plugin.name).toBe('vite-plugin-goodscript');
  });
});
```

### Integration Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { build } from 'vite';
import * as path from 'path';

describe('build process', () => {
  it('should compile fixture', async () => {
    const result = await build({
      root: path.join(__dirname, '../fixtures/my-fixture'),
      logLevel: 'silent'
    });
    expect(result).toBeDefined();
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('user interaction', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

## CI/CD Integration

Tests are designed to run in CI environments:
- Unit and integration tests are fast and don't require browser
- E2E tests use Playwright's CI-optimized settings
- All tests can run in parallel

## Troubleshooting

### Integration tests failing
- Ensure fixtures have valid `vite.config.ts`
- Check that dependencies are installed
- Verify build output directory permissions

### E2E tests timing out
- Increase Playwright timeout in `playwright.config.ts`
- Check that dev server starts correctly
- Verify network connectivity

### Coverage not generating
- Ensure `@vitest/coverage-v8` is installed
- Check that source files are not excluded in `vitest.config.ts`
