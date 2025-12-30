# Testing Plan Overview

## Purpose

This document provides an overview of the testing plans for the simulation library. The goal is to systematically add unit test coverage to critical areas that currently lack tests.

## Current State

| Area                  | Test Coverage | Status       |
| --------------------- | ------------- | ------------ |
| Condition Parser      | ✅ Excellent  | 34 tests     |
| Condition Operators   | ✅ Excellent  | 27 tests     |
| Condition Utils       | ✅ Excellent  | 56 tests     |
| Default Conditions    | ✅ Excellent  | 83 tests     |
| tiny-engine           | ✅ Excellent  | 145 tests    |
| **HP/Stamina System** | ❌ None       | **Plan: 01** |
| **RaceSolver Core**   | ✅ Excellent  | 93 tests     |
| RaceSolverBuilder     | ❌ None       | Future       |
| Integration/E2E       | ❌ None       | Future       |

## Test Plans

| Plan | Document                                                | Priority | Status      |
| ---- | ------------------------------------------------------- | -------- | ----------- |
| 01   | [HP/Stamina Tests](./01-hp-stamina-tests.md)            | High     | Not Started |
| 02   | [RaceSolver Core Tests](./02-race-solver-core-tests.md) | High     | ✅ Complete |

## Recommended Implementation Order

1. **HP/Stamina System (Plan 01)** - Next priority because:
   - Smaller, more contained scope
   - Critical for understanding spurt mechanics
   - Would enable full integration testing of RaceSolver with real HP mechanics

2. **RaceSolver Core (Plan 02)** - ✅ **COMPLETE**
   - Largest and most complex component
   - Foundation for all other simulation logic
   - 93 comprehensive tests covering all core features

## Test Framework

- **Runner**: Bun test (`bun test`)
- **Assertions**: `expect()` from `bun:test`
- **Mocking**: Manual mocks (no external libraries for now)
- **File naming**: `*.test.ts` in `__test__` directories

## Conventions

### Test File Structure

```typescript
import { describe, expect, test } from 'bun:test';
import { createMock... } from './fixtures';

describe('ClassName', () => {
  describe('methodName', () => {
    test('does expected behavior', () => {
      // Arrange
      const sut = createSystemUnderTest();

      // Act
      const result = sut.methodName(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Fixture Guidelines

1. Create reusable factory functions
2. Allow overrides for specific test needs
3. Use sensible defaults that don't trigger edge cases
4. Document any non-obvious default values

### Naming Conventions

- Test files: `ComponentName.test.ts`
- Fixture files: `fixtures.ts`
- Describe blocks: Use class/module names
- Test names: Describe behavior, not implementation

## Progress Tracking

Use this section to track implementation progress:

### Plan 01: HP/Stamina

- [ ] Create test file structure
- [ ] Implement fixtures
- [ ] GameHpPolicy initialization tests
- [ ] GameHpPolicy tick tests
- [ ] GameHpPolicy status modifier tests
- [ ] GameHpPolicy recovery tests
- [ ] GameHpPolicy status check tests
- [ ] GameHpPolicy spurt calculation tests
- [ ] EnhancedHpPolicy initialization tests
- [ ] EnhancedHpPolicy calculation tests
- [ ] EnhancedHpPolicy spurt tests
- [ ] EnhancedHpPolicy accuracy mode tests

### Plan 02: RaceSolver Core

- [x] Create test file structure
- [x] Implement fixtures
- [x] Constructor tests
- [x] Hill initialization tests
- [x] RNG initialization tests
- [x] Speed calculation tests
- [x] Acceleration tests
- [x] Step function tests
- [x] Phase transition tests
- [x] Rushed state tests
- [x] Downhill mode tests
- [x] Position keep tests
- [x] Skill activation tests
- [x] Effect application tests
- [x] Lane movement tests

## Notes

- Tests should be runnable independently (`bun test path/to/file.test.ts`)
- Keep test runtime fast (< 100ms per file ideally)
- Document any assumptions or simplifications in test comments
- If a test requires complex setup, consider if the code is too coupled
