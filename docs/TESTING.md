# Testing Guide

## Running Tests

```bash
cd server
npm test                   # Run all tests (verbose)
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

## Test Coverage

All 16 specified test cases are implemented in `tests/adaptiveAlgorithm.test.js`:

| TC | Test Case | Status |
|----|-----------|--------|
| TC-01 | Assessment initialization / baseline difficulty | ✅ |
| TC-02 | Baseline difficulty for weak students | ✅ |
| TC-03 | Correct answer handling | ✅ |
| TC-04 | Incorrect answer handling | ✅ |
| TC-05 | Difficulty increase (3 consecutive correct) | ✅ |
| TC-06 | Difficulty decrease (2 incorrect in last 3) | ✅ |
| TC-07 | Difficulty stability | ✅ |
| TC-08 | Weak topic selection | ✅ |
| TC-09 | Question repetition prevention | ✅ |
| TC-10 | No available questions fallback | ✅ |
| TC-11 | Question expiration detection | ✅ |
| TC-12 | Duplicate submission protection (enforced in service layer) | ✅ |
| TC-13 | Min/Max difficulty boundaries | ✅ |
| TC-14 | Accurate response-time recording | ✅ |
| TC-15 | Assessment completion | ✅ |
| TC-16 | Final summary accuracy | ✅ |

## Test Framework
- **Vitest** — fast, Vite-native test runner
- Tests focus on pure algorithmic logic (no DB required)
- Service layer integration tests require a live PostgreSQL database

