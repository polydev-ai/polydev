# E2E Testing Guide

This guide demonstrates how to set up and run end-to-end tests for the Polydev AI platform.

## Setup Playwright (Optional - for future E2E tests)

```bash
npm install --save-dev @playwright/test
npx playwright install
```

## E2E Test Example

### User Flow: VM Creation and Management

```typescript
// __tests__/e2e/vm-lifecycle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('VM Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should create a new VM', async ({ page }) => {
    // Navigate to VM dashboard
    await page.goto('http://localhost:3000/dashboard/vm');
    
    // Check if VM exists
    const hasVM = await page.isVisible('text=VM Status: running');
    
    if (!hasVM) {
      // Create VM
      await page.click('button:has-text("Create VM")');
      
      // Wait for creation
      await expect(page.locator('text=VM Created Successfully')).toBeVisible({
        timeout: 30000,
      });
    }
    
    // Verify VM status
    await expect(page.locator('[data-testid="vm-status"]')).toContainText('running');
  });

  test('should authenticate with a provider', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/vm/auth');
    
    // Select provider
    await page.selectOption('[name="provider"]', 'claude_code');
    
    // Start authentication
    await page.click('button:has-text("Start Authentication")');
    
    // Wait for noVNC window
    await expect(page.locator('[data-testid="novnc-viewer"]')).toBeVisible({
      timeout: 10000,
    });
    
    // Check session status
    const sessionStatus = page.locator('[data-testid="session-status"]');
    await expect(sessionStatus).toContainText('In Progress');
  });

  test('should stream CLI responses', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/vm/cli');
    
    // Select provider
    await page.selectOption('[name="provider"]', 'claude_code');
    
    // Enter prompt
    await page.fill('[name="prompt"]', 'Write a hello world function');
    
    // Submit
    await page.click('button:has-text("Send")');
    
    // Wait for streaming response
    const responseArea = page.locator('[data-testid="cli-response"]');
    await expect(responseArea).not.toBeEmpty({ timeout: 15000 });
    
    // Verify response contains code
    await expect(responseArea).toContainText('function');
  });
});

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should display system statistics', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/admin');
    
    // Check overview cards
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-vms"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-sessions"]')).toBeVisible();
    
    // Verify numbers are displayed
    const totalUsers = await page.locator('[data-testid="total-users"]').textContent();
    expect(parseInt(totalUsers || '0')).toBeGreaterThan(0);
  });

  test('should filter and paginate VMs', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/admin/vms');
    
    // Apply status filter
    await page.selectOption('[name="status"]', 'running');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Check that only running VMs are shown
    const vmRows = page.locator('[data-testid="vm-row"]');
    const count = await vmRows.count();
    
    for (let i = 0; i < count; i++) {
      const status = await vmRows.nth(i).locator('[data-testid="vm-status"]').textContent();
      expect(status).toBe('running');
    }
    
    // Test pagination
    if (await page.locator('button:has-text("Next")').isEnabled()) {
      await page.click('button:has-text("Next")');
      await expect(page.locator('[data-testid="current-page"]')).toContainText('2');
    }
  });
});

test.describe('API Documentation', () => {
  test('should display API endpoints', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/api-docs');
    
    // Check tabs
    await expect(page.locator('button:has-text("Endpoints")')).toBeVisible();
    await expect(page.locator('button:has-text("Schemas")')).toBeVisible();
    
    // Check endpoint categories
    await expect(page.locator('text=VM Management')).toBeVisible();
    await expect(page.locator('text=Authentication')).toBeVisible();
    await expect(page.locator('text=CLI')).toBeVisible();
    await expect(page.locator('text=Admin')).toBeVisible();
    
    // Click on schemas tab
    await page.click('button:has-text("Schemas")');
    
    // Verify schemas are displayed
    await expect(page.locator('text=VMStatus')).toBeVisible();
    await expect(page.locator('text=AuthSession')).toBeVisible();
  });
});
```

## Running E2E Tests

### Run all E2E tests
```bash
npx playwright test
```

### Run in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run specific test file
```bash
npx playwright test vm-lifecycle.spec.ts
```

### Debug mode
```bash
npx playwright test --debug
```

### Generate test code (record interactions)
```bash
npx playwright codegen http://localhost:3000
```

## E2E Test Best Practices

1. **Use data-testid attributes**: Add `data-testid` to important elements for reliable selection
2. **Wait for network**: Use `page.waitForResponse()` for API calls
3. **Isolation**: Each test should be independent
4. **Cleanup**: Clear data between tests
5. **Realistic**: Mimic actual user behavior
6. **Error handling**: Test error states and edge cases

## Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npx playwright test
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
