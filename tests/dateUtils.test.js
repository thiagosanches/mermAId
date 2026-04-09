import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
    isWeekend,
    dateToString,
    parseDate,
    resetHolidays
} from './testUtils.js';

describe('Basic Date Utilities', () => {
    before(() => {
        resetHolidays();
    });

    describe('isWeekend()', () => {
        it('should return true for Saturday', () => {
            const saturday = new Date(2026, 3, 11); // April 11, 2026 is Saturday
            assert.equal(isWeekend(saturday), true);
        });

        it('should return true for Sunday', () => {
            const sunday = new Date(2026, 3, 12); // April 12, 2026 is Sunday
            assert.equal(isWeekend(sunday), true);
        });

        it('should return false for Monday', () => {
            const monday = new Date(2026, 3, 13); // April 13, 2026 is Monday
            assert.equal(isWeekend(monday), false);
        });

        it('should return false for Tuesday', () => {
            const tuesday = new Date(2026, 3, 14); // April 14, 2026 is Tuesday
            assert.equal(isWeekend(tuesday), false);
        });

        it('should return false for Wednesday', () => {
            const wednesday = new Date(2026, 3, 15); // April 15, 2026 is Wednesday
            assert.equal(isWeekend(wednesday), false);
        });

        it('should return false for Thursday', () => {
            const thursday = new Date(2026, 3, 16); // April 16, 2026 is Thursday
            assert.equal(isWeekend(thursday), false);
        });

        it('should return false for Friday', () => {
            const friday = new Date(2026, 3, 17); // April 17, 2026 is Friday
            assert.equal(isWeekend(friday), false);
        });

        it('should handle month boundaries correctly', () => {
            const saturdayEndOfMonth = new Date(2026, 2, 28); // March 28, 2026 is Saturday
            assert.equal(isWeekend(saturdayEndOfMonth), true);
        });

        it('should handle year boundaries correctly', () => {
            const saturdayEndOfYear = new Date(2025, 11, 27); // December 27, 2025 is Saturday
            assert.equal(isWeekend(saturdayEndOfYear), true);
        });
    });

    describe('dateToString()', () => {
        it('should format a date to YYYY-MM-DD', () => {
            const date = new Date(2026, 3, 9); // April 9, 2026
            assert.equal(dateToString(date), '2026-04-09');
        });

        it('should pad single-digit months with zero', () => {
            const date = new Date(2026, 0, 15); // January 15, 2026
            assert.equal(dateToString(date), '2026-01-15');
        });

        it('should pad single-digit days with zero', () => {
            const date = new Date(2026, 3, 5); // April 5, 2026
            assert.equal(dateToString(date), '2026-04-05');
        });

        it('should handle December 31st correctly', () => {
            const date = new Date(2026, 11, 31); // December 31, 2026
            assert.equal(dateToString(date), '2026-12-31');
        });

        it('should handle January 1st correctly', () => {
            const date = new Date(2026, 0, 1); // January 1, 2026
            assert.equal(dateToString(date), '2026-01-01');
        });

        it('should handle leap year date correctly', () => {
            const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
            assert.equal(dateToString(date), '2024-02-29');
        });

        it('should handle dates with double-digit months and days', () => {
            const date = new Date(2026, 10, 25); // November 25, 2026
            assert.equal(dateToString(date), '2026-11-25');
        });
    });

    describe('parseDate()', () => {
        it('should parse YYYY-MM-DD string to Date object', () => {
            const result = parseDate('2026-04-09');
            assert.equal(result.getFullYear(), 2026);
            assert.equal(result.getMonth(), 3); // 0-indexed, so 3 = April
            assert.equal(result.getDate(), 9);
        });

        it('should set time to noon (12:00:00) to avoid timezone issues', () => {
            const result = parseDate('2026-04-09');
            assert.equal(result.getHours(), 12);
            assert.equal(result.getMinutes(), 0);
            assert.equal(result.getSeconds(), 0);
        });

        it('should parse dates with single-digit months correctly', () => {
            const result = parseDate('2026-01-15');
            assert.equal(result.getMonth(), 0); // January
            assert.equal(result.getDate(), 15);
        });

        it('should parse dates with single-digit days correctly', () => {
            const result = parseDate('2026-04-05');
            assert.equal(result.getDate(), 5);
        });

        it('should handle month boundaries correctly', () => {
            const result = parseDate('2026-03-31');
            assert.equal(result.getMonth(), 2); // March
            assert.equal(result.getDate(), 31);
        });

        it('should handle leap year dates correctly', () => {
            const result = parseDate('2024-02-29');
            assert.equal(result.getFullYear(), 2024);
            assert.equal(result.getMonth(), 1); // February
            assert.equal(result.getDate(), 29);
        });

        it('should be reversible with dateToString', () => {
            const original = '2026-04-09';
            const parsed = parseDate(original);
            const stringified = dateToString(parsed);
            assert.equal(stringified, original);
        });

        it('should handle year boundaries correctly', () => {
            const result = parseDate('2025-12-31');
            assert.equal(result.getFullYear(), 2025);
            assert.equal(result.getMonth(), 11); // December
            assert.equal(result.getDate(), 31);
        });
    });

    describe('parseDate() and dateToString() integration', () => {
        it('should roundtrip correctly for various dates', () => {
            const testDates = [
                '2026-01-01',
                '2026-02-28',
                '2024-02-29', // leap year
                '2026-12-31',
                '2026-06-15',
                '2026-09-09'
            ];

            testDates.forEach(dateStr => {
                const parsed = parseDate(dateStr);
                const formatted = dateToString(parsed);
                assert.equal(formatted, dateStr, `Failed roundtrip for ${dateStr}`);
            });
        });
    });
});
