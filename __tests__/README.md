# Testing Documentation

This directory contains comprehensive tests for the Polydev AI Firecracker CLI Service.

## Test Structure

```
__tests__/
├── api/
│   ├── vm/
│   │   └── status.test.ts       # VM status endpoint tests
│   ├── admin/
│   │   ├── vms.test.ts          # Admin VM management tests
│   │   └── stats.test.ts        # Admin statistics tests
│   ├── preferences.test.ts      # User preferences tests
│   └── quota.test.ts           # Quota management tests
└── README.md                    # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run specific test suites
```bash
# VM API tests only
npm run test:vm

# Admin API tests only
npm run test:admin

# All API tests
npm run test:api
```

## Test Coverage

The test suite covers:

### VM Management API (`/api/vm/*`)
- ✅ VM status retrieval
- ✅ VM creation
- ✅ VM start/stop operations
- ✅ VM authentication sessions
- ✅ CLI streaming
- ✅ Usage statistics

### Admin API (`/api/admin/*`)
- ✅ User management
- ✅ VM management and monitoring
- ✅ System statistics
- ✅ VPS host monitoring
- ✅ Event logging
- ✅ Authorization and access control

### Test Scenarios
Each API endpoint is tested for:
- ✅ Successful responses with valid data
- ✅ Authentication failures (401)
- ✅ Authorization failures (403)
- ✅ Not found errors (404)
- ✅ Server errors (500)
- ✅ Input validation
- ✅ Pagination and filtering
- ✅ Edge cases and error handling

## Writing New Tests

### Test Template
```typescript
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/your-route/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Your API Route', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should test successful case', async () => {
    // Setup mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { email: 'test@example.com' } },
      error: null,
    });

    // Make request
    const req = new NextRequest('http://localhost:3000/api/your-route');
    const response = await GET(req);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('expectedField');
  });

  it('should test error case', async () => {
    // Test implementation
  });
});
```

### Best Practices
1. **Mock External Dependencies**: Always mock Supabase, Master Controller, and other external services
2. **Test All HTTP Methods**: Test GET, POST, PUT, DELETE for each endpoint
3. **Test Edge Cases**: Empty responses, null values, invalid inputs
4. **Test Authorization**: Verify proper role-based access control
5. **Use Descriptive Names**: Test names should clearly describe what they're testing
6. **Keep Tests Isolated**: Each test should be independent and not rely on others
7. **Clean Up**: Use `beforeEach` and `afterEach` to reset state

## Mocking Patterns

### Supabase Client
```typescript
mockSupabase.from.mockImplementation((table: string) => {
  if (table === 'users') {
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { /* your data */ },
            error: null,
          }),
        }),
      }),
    };
  }
});
```

### Master Controller Fetch
```typescript
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ /* response data */ }),
});
```

## Test Environment

Tests run in the `jsdom` environment with:
- Node.js runtime
- Mocked environment variables (see `jest.setup.js`)
- Next.js 15 App Router support
- TypeScript support via ts-jest

## Continuous Integration

Tests should be run:
- Before every commit (pre-commit hook)
- On every pull request
- Before deployment to staging/production

## Test Metrics

Target coverage goals:
- Overall coverage: 80%+
- Critical paths (API routes): 90%+
- Error handling: 100%

## Debugging Tests

### Run a single test file
```bash
npm test -- status.test.ts
```

### Run with verbose output
```bash
npm test -- --verbose
```

### Run with debugging
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Common Issues

### "Cannot find module" errors
- Ensure `moduleNameMapper` in `jest.config.js` correctly maps `@/` to `src/`
- Check that all imports use the correct paths

### "ReferenceError: fetch is not defined"
- Mock `global.fetch` in your test file or setup

### Timeout errors
- Increase timeout in test: `jest.setTimeout(10000)`
- Or add to individual test: `it('test', async () => { /* ... */ }, 10000)`

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Add performance benchmarking tests
- [ ] Add contract tests for Master Controller integration
- [ ] Add snapshot tests for UI components
- [ ] Add integration tests with real Supabase instance (staging)
