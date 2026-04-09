import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calendarDaysFromFte } from './testUtils.js';

describe('calendarDaysFromFte()', () => {
    describe('Full-time (FTE = 1.0)', () => {
        it('should return same value for FTE 1.0', () => {
            assert.equal(calendarDaysFromFte(5, 1), 5);
        });

        it('should return 10 calendar days for 10 working days at FTE 1.0', () => {
            assert.equal(calendarDaysFromFte(10, 1), 10);
        });

        it('should return 1 calendar day for 1 working day at FTE 1.0', () => {
            assert.equal(calendarDaysFromFte(1, 1), 1);
        });

        it('should return 20 calendar days for 20 working days at FTE 1.0', () => {
            assert.equal(calendarDaysFromFte(20, 1), 20);
        });
    });

    describe('Part-time (FTE < 1.0)', () => {
        it('should return 10 calendar days for 5 working days at FTE 0.5 (half-time)', () => {
            assert.equal(calendarDaysFromFte(5, 0.5), 10);
        });

        it('should return 20 calendar days for 10 working days at FTE 0.5', () => {
            assert.equal(calendarDaysFromFte(10, 0.5), 20);
        });

        it('should return 4 calendar days for 1 working day at FTE 0.25 (quarter-time)', () => {
            assert.equal(calendarDaysFromFte(1, 0.25), 4);
        });

        it('should return 50 calendar days for 10 working days at FTE 0.2', () => {
            assert.equal(calendarDaysFromFte(10, 0.2), 50);
        });

        it('should return 7 calendar days for 5 working days at FTE 0.75', () => {
            // 5 / 0.75 = 6.666... -> ceil = 7
            assert.equal(calendarDaysFromFte(5, 0.75), 7);
        });

        it('should ceil fractional results for FTE 0.6', () => {
            // 5 / 0.6 = 8.333... -> ceil = 9
            assert.equal(calendarDaysFromFte(5, 0.6), 9);
        });
    });

    describe('Over-time (FTE > 1.0)', () => {
        it('should return fewer calendar days for FTE > 1.0', () => {
            // 10 working days at 2.0 FTE = 5 calendar days
            assert.equal(calendarDaysFromFte(10, 2), 5);
        });

        it('should return 3 calendar days for 5 working days at FTE 2.0', () => {
            // 5 / 2.0 = 2.5 -> ceil = 3
            assert.equal(calendarDaysFromFte(5, 2), 3);
        });

        it('should return 2 calendar days for 5 working days at FTE 3.0', () => {
            // 5 / 3.0 = 1.666... -> ceil = 2
            assert.equal(calendarDaysFromFte(5, 3), 2);
        });

        it('should return 1 calendar day for 1 working day at FTE 2.0', () => {
            // 1 / 2.0 = 0.5 -> ceil = 1
            assert.equal(calendarDaysFromFte(1, 2), 1);
        });
    });

    describe('Ceiling behavior', () => {
        it('should always ceil the result (no rounding down)', () => {
            // 5 / 0.6 = 8.333... -> 9 (not 8)
            assert.equal(calendarDaysFromFte(5, 0.6), 9);
        });

        it('should ceil even tiny fractions', () => {
            // 10 / 1.1 = 9.09... -> 10
            assert.equal(calendarDaysFromFte(10, 1.1), 10);
        });

        it('should return exact value when division is whole number', () => {
            // 10 / 2 = 5 exactly
            assert.equal(calendarDaysFromFte(10, 2), 5);
        });

        it('should ceil for 0.5 FTE calculations', () => {
            // 3 / 0.5 = 6 exactly
            assert.equal(calendarDaysFromFte(3, 0.5), 6);
            // 5 / 0.5 = 10 exactly
            assert.equal(calendarDaysFromFte(5, 0.5), 10);
        });
    });

    describe('Edge cases and minimum FTE (0.1)', () => {
        it('should default to FTE 1.0 when FTE is 0 (falsy value)', () => {
            // parseFloat(0) = 0, which is falsy, so || 1 defaults to 1
            // Then Math.max(0.1, 1) = 1
            // 5 / 1 = 5
            assert.equal(calendarDaysFromFte(5, 0), 5);
        });

        it('should use minimum FTE of 0.1 when FTE is negative', () => {
            // Negative FTE should be treated as 0.1
            // 5 / 0.1 = 50
            assert.equal(calendarDaysFromFte(5, -1), 50);
        });

        it('should handle FTE exactly at minimum (0.1)', () => {
            // 5 / 0.1 = 50
            assert.equal(calendarDaysFromFte(5, 0.1), 50);
        });

        it('should handle FTE just above minimum (0.11)', () => {
            // 5 / 0.11 = 45.45... -> 46
            assert.equal(calendarDaysFromFte(5, 0.11), 46);
        });

        it('should handle very small FTE (0.15)', () => {
            // 3 / 0.15 = 20
            assert.equal(calendarDaysFromFte(3, 0.15), 20);
        });
    });

    describe('Invalid or missing FTE values', () => {
        it('should default to FTE 1.0 when FTE is undefined', () => {
            // parseFloat(undefined) = NaN, || 1 = 1
            assert.equal(calendarDaysFromFte(5, undefined), 5);
        });

        it('should default to FTE 1.0 when FTE is null', () => {
            // parseFloat(null) = NaN, || 1 = 1
            assert.equal(calendarDaysFromFte(5, null), 5);
        });

        it('should default to FTE 1.0 when FTE is NaN', () => {
            assert.equal(calendarDaysFromFte(5, NaN), 5);
        });

        it('should default to FTE 1.0 when FTE is an empty string', () => {
            // parseFloat('') = NaN, || 1 = 1
            assert.equal(calendarDaysFromFte(5, ''), 5);
        });

        it('should parse numeric strings correctly', () => {
            assert.equal(calendarDaysFromFte(5, '0.5'), 10);
        });

        it('should handle string "1"', () => {
            assert.equal(calendarDaysFromFte(5, '1'), 5);
        });

        it('should handle string "2"', () => {
            assert.equal(calendarDaysFromFte(10, '2'), 5);
        });
    });

    describe('Real-world scenarios', () => {
        it('should handle typical 5-day task at 0.5 FTE', () => {
            // 5 working days at half-time = 10 calendar days
            assert.equal(calendarDaysFromFte(5, 0.5), 10);
        });

        it('should handle 1-day task at 0.5 FTE', () => {
            // 1 working day at half-time = 2 calendar days
            assert.equal(calendarDaysFromFte(1, 0.5), 2);
        });

        it('should handle 10-day task at 0.8 FTE (80% time)', () => {
            // 10 / 0.8 = 12.5 -> 13 calendar days
            assert.equal(calendarDaysFromFte(10, 0.8), 13);
        });

        it('should handle 20-day task at 1.5 FTE (overtime)', () => {
            // 20 / 1.5 = 13.333... -> 14 calendar days
            assert.equal(calendarDaysFromFte(20, 1.5), 14);
        });

        it('should handle consultant working 3 days per week (0.6 FTE)', () => {
            // 15 working days at 0.6 FTE = 25 calendar days
            // 15 / 0.6 = 25
            assert.equal(calendarDaysFromFte(15, 0.6), 25);
        });

        it('should handle team member at 20% allocation (0.2 FTE)', () => {
            // 2 working days at 0.2 FTE = 10 calendar days
            assert.equal(calendarDaysFromFte(2, 0.2), 10);
        });

        it('should handle very long task (50 days) at 0.5 FTE', () => {
            // 50 / 0.5 = 100 calendar days
            assert.equal(calendarDaysFromFte(50, 0.5), 100);
        });
    });

    describe('Boundary testing', () => {
        it('should handle maximum practical FTE (5.0)', () => {
            // 10 / 5.0 = 2 calendar days
            assert.equal(calendarDaysFromFte(10, 5), 2);
        });

        it('should handle very small working days (1)', () => {
            assert.equal(calendarDaysFromFte(1, 1), 1);
            assert.equal(calendarDaysFromFte(1, 0.5), 2);
            assert.equal(calendarDaysFromFte(1, 2), 1); // ceil(0.5) = 1
        });

        it('should handle large working days (100)', () => {
            assert.equal(calendarDaysFromFte(100, 1), 100);
            assert.equal(calendarDaysFromFte(100, 0.5), 200);
            assert.equal(calendarDaysFromFte(100, 2), 50);
        });

        it('should never return 0 calendar days (always at least 1)', () => {
            // Even with very high FTE, ceil ensures minimum 1
            assert.equal(calendarDaysFromFte(1, 10), 1); // ceil(0.1) = 1
        });
    });
});
