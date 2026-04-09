# Ez-Gantt Test Suite

Comprehensive unit and integration tests for the Ez-Gantt project's date calculation logic, holiday handling, weekend handling, and custom business rules.

## Overview

This test suite provides confidence when modifying the core date logic by ensuring all critical calculations continue to work correctly across:
- Working day calculations
- Weekend and holiday handling
- Dependency chains
- FTE (Full-Time Equivalent) calculations
- Date segment splitting for visualization
- Edge cases (month boundaries, year boundaries, leap years, etc.)

## Test Structure

```
tests/
├── testUtils.js              # Extracted date functions for testing
├── dateUtils.test.js         # Basic date utilities tests
├── holidays.test.js          # Holiday logic tests
├── workingDays.test.js       # Working day calculations
├── calculateEndDate.test.js  # Core end date calculation logic
├── segments.test.js          # Weekend segment splitting
├── fte.test.js              # FTE calculation tests
├── weekNumbering.test.js     # Week numbering logic (W0 vs W1)
├── integration.test.js       # Full integration & dependency chain tests
└── README.md                # This file
```

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests in watch mode:
```bash
npm run test:watch
```

### Run specific test file:
```bash
node --test tests/dateUtils.test.js
```

## Test Coverage

### 1. Basic Date Utilities (dateUtils.test.js)
**Functions tested:**
- `isWeekend(date)` - Checks if a date is Saturday or Sunday
- `dateToString(date)` - Converts Date to YYYY-MM-DD string
- `parseDate(dateString)` - Parses YYYY-MM-DD string to Date (with noon time to avoid timezone issues)

**Test scenarios:** 25 tests
- Weekend detection (all 7 days of the week)
- Date formatting with padding
- Month and year boundaries
- Leap year handling
- Roundtrip conversion (parseDate ↔ dateToString)

### 2. Holiday Logic (holidays.test.js)
**Functions tested:**
- `isHoliday(dateString)` - Checks if a date is in the holidays list
- `isNonWorking(date)` - Combined check for weekends OR holidays
- Holiday state management

**Test scenarios:** 19 tests
- Empty holidays array
- Single and multiple holidays
- Consecutive holidays
- Holidays on weekdays vs weekends
- Long weekends (e.g., Good Friday + Easter Monday)
- Holiday state (reset, set, get)

### 3. Working Day Calculations (workingDays.test.js)
**Functions tested:**
- `ensureWorkingDay(dateString)` - Moves date forward to next working day if non-working
- `getNextWorkingDay(dateString)` - Always returns the next working day after given date

**Test scenarios:** 31 tests
- Weekend to Monday transitions
- Holiday skipping
- Long weekends (Friday holiday + weekend + Monday holiday)
- Month and year boundaries
- **Critical rule:** Friday end → Monday start for dependencies

### 4. Calculate End Date (calculateEndDate.test.js)
**Function tested:**
- `calculateEndDate(startDateString, workingDays)` - Calculates end date from start + working days

**Test scenarios:** 61 tests covering:
- Basic working day calculations (1-5 days, Mon-Fri)
- Weekend skipping (Thu→Mon, Fri→Mon transitions)
- Starting on weekends
- Holiday handling (single, consecutive, scattered)
- Long weekend scenarios
- Month boundaries (including Feb leap year)
- Year boundaries
- Very long durations (20+ days)
- **Critical custom rule:** Start date counts as day 1 if it's a working day

**Key business rule tested:**
```javascript
// If start is a working day, it counts as day 1
// If start is non-working (weekend/holiday), day counting begins from next working day
```

### 5. Segment Calculations (segments.test.js)
**Function tested:**
- `getWeekdaySegments(startDateString, endDateString)` - Splits activity into segments around non-working days

**Test scenarios:** 38 tests
- Single continuous segments (Mon-Fri)
- Weekend splits (Wed-Tue → [{Wed-Fri}, {Mon-Tue}])
- Multiple weekend splits (spanning 2-3 weeks)
- Holiday splits (mid-week holidays creating gaps)
- Combined weekend + holiday splits
- Edge cases (all days non-working, month/year boundaries)

**Purpose:** Enables visual rendering of activity bars with gaps for weekends/holidays

### 7. Week Numbering Logic (weekNumbering.test.js)
**Functions tested:**
- `isFullWeekStart(projectStart)` - Determines if project starts on a full week (Sun/Mon)
- `getWeekLabel(weekIndex, isFullWeekStart)` - Calculates week label (W0, W1, W2...)

**Test scenarios:** 23 tests
- Full week start (Sunday or Monday) → First week labeled "W1"
- Partial week start (Tuesday-Saturday) → First partial week labeled "W0"
- Week sequence validation for all weekday starts
- Full calendar mode vs compressed mode differences
- Edge cases (year start, month boundaries)

**Key business rule:**
```javascript
// Full calendar mode (weekends shown):
// - If project starts on Sunday (day 0) or Monday (day 1) → First week is "W1"
// - If project starts on Tue-Sat (day 2-6) → First partial week is "W0"

// Compressed mode (weekends hidden):
// - If project starts on Monday → First week is "W1", "W2", "W3"...
// - Otherwise → First week is "W0", "W1", "W2"...
```

**Examples:**
- Monday start: W1, W2, W3, W4
- Tuesday start: W0, W1, W2, W3
- Sunday start: W1, W2, W3, W4

### 8. Integration Tests (integration.test.js)
**Functions tested:**
- `calculateActivityDates(activities, projectStart)` - Calculates all activity dates with dependencies
- `calculateProjectEndDate(activities)` - Finds project end with 7-day buffer

**Test scenarios:** 39 tests
- No dependencies (all activities start on project start)
- Custom start dates
- Simple dependencies (A → B)
- Chain dependencies (A → B → C → D → E)
- Complex dependencies (multiple activities depending on same predecessor)
- Non-existent dependencies (graceful fallback)
- Mixed independent and dependent activities
- Full project scenarios with dependencies and holidays
- Real-world project workflow

**Example tested:**
```javascript
Requirements → Design → Backend Dev → Integration → Testing
                     → Frontend Dev →
```

## Critical Business Rules Validated

### 1. Start Date Counting Rule
- **If start date is a working day:** It counts as day 1
- **If start date is non-working:** Counting begins from the next working day

Example:
- Monday, 1 working day → ends Monday (same day)
- Saturday, 1 working day → ends Monday (first working day)

### 2. Friday → Monday Dependency Rule
When an activity ends on Friday, dependent activities start on Monday (next working day).

### 3. Noon Time Setting
All dates are set to 12:00:00 (noon) to avoid timezone edge cases.

### 4. FTE Minimum
FTE cannot be less than 0.1 (minimum 10% allocation).

### 5. Weekend Definition
Weekends are Saturday (day 6) and Sunday (day 0).

### 6. Holiday Priority
Holidays take precedence even if they fall on weekdays - they're treated as non-working days.

### 7. Project End Buffer
Project end date is calculated as the latest activity end + 7 calendar days.

### 8. Week Numbering Rule (W0 vs W1)
- **Full week start (Sun/Mon):** First week is labeled "W1"
- **Partial week start (Tue-Sat):** First partial week is labeled "W0", then "W1", "W2"...
- **Compressed mode:** Only Monday start gets "W1" first; all others start with "W0"

## Test Statistics

- **Total test files:** 8
- **Total test suites:** 55
- **Total tests:** 223
- **Pass rate:** 100%
- **Average run time:** ~625ms

## Edge Cases Covered

✅ Month boundaries (Apr→May, Dec→Jan, Feb leap year)  
✅ Year boundaries (2026→2027)  
✅ Leap years (Feb 29)  
✅ Consecutive holidays (3+ days)  
✅ Long weekends (4-day weekends)  
✅ Weekend + holiday combinations  
✅ Very long durations (50+ days)  
✅ Invalid inputs (null, undefined, negative values)  
✅ Timezone consistency (using noon to avoid DST issues)

## Technology

- **Test Framework:** Node.js built-in `node:test` (no external dependencies)
- **Assertion Library:** Node.js built-in `node:assert/strict`
- **Module System:** ES Modules (import/export)
- **Node Version:** Requires Node.js 18+ (for native test runner)

## Adding New Tests

To add new tests, follow this structure:

```javascript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { functionToTest, resetHolidays } from './testUtils.js';

describe('Feature Name', () => {
    beforeEach(() => {
        resetHolidays(); // Reset state before each test
    });

    describe('Specific Scenario', () => {
        it('should do something specific', () => {
            const result = functionToTest(input);
            assert.equal(result, expectedOutput);
        });
    });
});
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
- name: Run tests
  run: npm test
```

## Maintenance Notes

### When modifying date logic in app.js:

1. Update the corresponding function in `tests/testUtils.js`
2. Add new test cases to cover the changes
3. Run tests to ensure no regressions
4. All 223 tests should pass before merging

### Common pitfalls to avoid:

- Using `new Date(dateString)` without time → Use `parseDate()` instead
- Forgetting to reset holidays in `beforeEach` hooks
- Not testing month/year boundaries
- Not testing with holidays in the date range
- Assuming 7 days = 1 week (could span weekends)

## License

Part of the Ez-Gantt project.
