import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    isHoliday,
    isNonWorking,
    resetHolidays,
    setHolidays,
    getHolidays,
    parseDate
} from './testUtils.js';

describe('Holiday Logic', () => {
    beforeEach(() => {
        resetHolidays();
    });

    describe('isHoliday()', () => {
        it('should return false when holidays array is empty', () => {
            assert.equal(isHoliday('2026-04-09'), false);
        });

        it('should return true when date exists in holidays array', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            assert.equal(isHoliday('2026-04-10'), true);
        });

        it('should return false when date does not exist in holidays array', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            assert.equal(isHoliday('2026-04-09'), false);
        });

        it('should handle multiple holidays', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' },
                { date: '2026-04-13', label: 'Easter Monday' },
                { date: '2026-12-25', label: 'Christmas Day' }
            ]);
            assert.equal(isHoliday('2026-04-10'), true);
            assert.equal(isHoliday('2026-04-13'), true);
            assert.equal(isHoliday('2026-12-25'), true);
            assert.equal(isHoliday('2026-04-11'), false);
        });

        it('should handle holidays without labels', () => {
            setHolidays([
                { date: '2026-04-10', label: '' }
            ]);
            assert.equal(isHoliday('2026-04-10'), true);
        });

        it('should be case-sensitive and format-specific', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            // Correct format
            assert.equal(isHoliday('2026-04-10'), true);
            // Different format should not match
            assert.equal(isHoliday('2026-4-10'), false);
        });

        it('should handle consecutive holidays', () => {
            setHolidays([
                { date: '2026-12-24', label: 'Christmas Eve' },
                { date: '2026-12-25', label: 'Christmas Day' },
                { date: '2026-12-26', label: 'Boxing Day' }
            ]);
            assert.equal(isHoliday('2026-12-24'), true);
            assert.equal(isHoliday('2026-12-25'), true);
            assert.equal(isHoliday('2026-12-26'), true);
            assert.equal(isHoliday('2026-12-27'), false);
        });
    });

    describe('isNonWorking()', () => {
        it('should return true for Saturday (weekend)', () => {
            const saturday = new Date(2026, 3, 11); // April 11, 2026 is Saturday
            assert.equal(isNonWorking(saturday), true);
        });

        it('should return true for Sunday (weekend)', () => {
            const sunday = new Date(2026, 3, 12); // April 12, 2026 is Sunday
            assert.equal(isNonWorking(sunday), true);
        });

        it('should return false for Monday (weekday, no holiday)', () => {
            const monday = new Date(2026, 3, 13); // April 13, 2026 is Monday
            assert.equal(isNonWorking(monday), false);
        });

        it('should return true for a holiday on a weekday', () => {
            setHolidays([
                { date: '2026-04-09', label: 'Test Holiday' }
            ]);
            const thursday = parseDate('2026-04-09'); // Thursday
            assert.equal(isNonWorking(thursday), true);
        });

        it('should return true for a holiday on a weekend', () => {
            setHolidays([
                { date: '2026-04-11', label: 'Weekend Holiday' }
            ]);
            const saturday = parseDate('2026-04-11'); // Saturday
            assert.equal(isNonWorking(saturday), true);
        });

        it('should return false for a working day with no holiday', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            const thursday = parseDate('2026-04-09'); // Thursday, not a holiday
            assert.equal(isNonWorking(thursday), false);
        });

        it('should handle multiple consecutive non-working days', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            // Friday holiday + weekend = 3 consecutive non-working days
            const friday = parseDate('2026-04-10'); // Friday (holiday)
            const saturday = parseDate('2026-04-11'); // Saturday
            const sunday = parseDate('2026-04-12'); // Sunday
            const monday = parseDate('2026-04-13'); // Monday (working)

            assert.equal(isNonWorking(friday), true);
            assert.equal(isNonWorking(saturday), true);
            assert.equal(isNonWorking(sunday), true);
            assert.equal(isNonWorking(monday), false);
        });

        it('should handle long weekend with Monday holiday', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const saturday = parseDate('2026-04-11'); // Saturday
            const sunday = parseDate('2026-04-12'); // Sunday
            const monday = parseDate('2026-04-13'); // Monday (holiday)
            const tuesday = parseDate('2026-04-14'); // Tuesday (working)

            assert.equal(isNonWorking(saturday), true);
            assert.equal(isNonWorking(sunday), true);
            assert.equal(isNonWorking(monday), true);
            assert.equal(isNonWorking(tuesday), false);
        });
    });

    describe('Holiday state management', () => {
        it('resetHolidays should clear all holidays', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            assert.equal(getHolidays().length, 1);
            
            resetHolidays();
            assert.equal(getHolidays().length, 0);
            assert.equal(isHoliday('2026-04-10'), false);
        });

        it('setHolidays should replace existing holidays', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            assert.equal(getHolidays().length, 1);
            
            setHolidays([
                { date: '2026-12-25', label: 'Christmas' },
                { date: '2026-12-26', label: 'Boxing Day' }
            ]);
            assert.equal(getHolidays().length, 2);
            assert.equal(isHoliday('2026-04-10'), false);
            assert.equal(isHoliday('2026-12-25'), true);
            assert.equal(isHoliday('2026-12-26'), true);
        });

        it('getHolidays should return current holidays array', () => {
            const testHolidays = [
                { date: '2026-04-10', label: 'Good Friday' },
                { date: '2026-04-13', label: 'Easter Monday' }
            ];
            setHolidays(testHolidays);
            
            const result = getHolidays();
            assert.equal(result.length, 2);
            assert.deepEqual(result, testHolidays);
        });
    });
});
