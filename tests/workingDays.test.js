import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    ensureWorkingDay,
    getNextWorkingDay,
    resetHolidays,
    setHolidays
} from './testUtils.js';

describe('Working Day Calculations', () => {
    beforeEach(() => {
        resetHolidays();
    });

    describe('ensureWorkingDay()', () => {
        it('should return the same date if it is a working day', () => {
            const monday = '2026-04-13'; // Monday, not a holiday
            assert.equal(ensureWorkingDay(monday), '2026-04-13');
        });

        it('should return the same date for a weekday that is not a holiday', () => {
            const thursday = '2026-04-09'; // Thursday
            assert.equal(ensureWorkingDay(thursday), '2026-04-09');
        });

        it('should move Saturday to Monday', () => {
            const saturday = '2026-04-11'; // Saturday
            assert.equal(ensureWorkingDay(saturday), '2026-04-13'); // Monday
        });

        it('should move Sunday to Monday', () => {
            const sunday = '2026-04-12'; // Sunday
            assert.equal(ensureWorkingDay(sunday), '2026-04-13'); // Monday
        });

        it('should skip a weekday holiday to the next working day', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const monday = '2026-04-13'; // Monday (holiday)
            assert.equal(ensureWorkingDay(monday), '2026-04-14'); // Tuesday
        });

        it('should skip Friday holiday to Monday', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            const friday = '2026-04-10'; // Friday (holiday)
            // Should skip Friday (holiday), Saturday, Sunday -> Monday
            assert.equal(ensureWorkingDay(friday), '2026-04-13');
        });

        it('should skip Saturday to Tuesday if Monday is a holiday', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const saturday = '2026-04-11'; // Saturday
            // Should skip Saturday, Sunday, Monday (holiday) -> Tuesday
            assert.equal(ensureWorkingDay(saturday), '2026-04-14');
        });

        it('should handle consecutive holidays correctly', () => {
            setHolidays([
                { date: '2026-12-24', label: 'Christmas Eve' },
                { date: '2026-12-25', label: 'Christmas Day' }
            ]);
            const thursday = '2026-12-24'; // Thursday (holiday)
            // Should skip Thursday (holiday), Friday (holiday), Saturday, Sunday -> Monday
            assert.equal(ensureWorkingDay(thursday), '2026-12-28');
        });

        it('should handle a long sequence of non-working days', () => {
            setHolidays([
                { date: '2026-12-24', label: 'Christmas Eve' },
                { date: '2026-12-25', label: 'Christmas Day' },
                { date: '2026-12-28', label: 'Boxing Day Observed' }
            ]);
            const thursday = '2026-12-24'; // Thursday
            // Skip Thu(holiday), Fri(holiday), Sat, Sun, Mon(holiday) -> Tuesday
            assert.equal(ensureWorkingDay(thursday), '2026-12-29');
        });
    });

    describe('getNextWorkingDay()', () => {
        it('should return next day if it is a working day', () => {
            const monday = '2026-04-13'; // Monday
            assert.equal(getNextWorkingDay(monday), '2026-04-14'); // Tuesday
        });

        it('should return Tuesday after Monday', () => {
            const monday = '2026-04-13';
            assert.equal(getNextWorkingDay(monday), '2026-04-14');
        });

        it('should return Wednesday after Tuesday', () => {
            const tuesday = '2026-04-14';
            assert.equal(getNextWorkingDay(tuesday), '2026-04-15');
        });

        it('should skip weekend - Friday to Monday', () => {
            const friday = '2026-04-10'; // Friday (no holiday)
            assert.equal(getNextWorkingDay(friday), '2026-04-13'); // Monday
        });

        it('should skip weekend - Saturday to Monday', () => {
            const saturday = '2026-04-11'; // Saturday
            assert.equal(getNextWorkingDay(saturday), '2026-04-13'); // Monday
        });

        it('should skip weekend - Sunday to Monday', () => {
            const sunday = '2026-04-12'; // Sunday
            assert.equal(getNextWorkingDay(sunday), '2026-04-13'); // Monday
        });

        it('should skip Thursday to Tuesday if Friday is holiday (long weekend)', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            const thursday = '2026-04-09'; // Thursday
            // Next is Friday (holiday), then Saturday, Sunday -> Monday
            assert.equal(getNextWorkingDay(thursday), '2026-04-13');
        });

        it('should skip Friday to Tuesday if Monday is a holiday', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const friday = '2026-04-10'; // Friday (not a holiday)
            // Skip Saturday, Sunday, Monday (holiday) -> Tuesday
            assert.equal(getNextWorkingDay(friday), '2026-04-14');
        });

        it('should handle multiple consecutive holidays after a day', () => {
            setHolidays([
                { date: '2026-12-24', label: 'Christmas Eve' },
                { date: '2026-12-25', label: 'Christmas Day' }
            ]);
            const wednesday = '2026-12-23'; // Wednesday
            // Next: Thu (holiday), Fri (holiday), Sat, Sun -> Monday
            assert.equal(getNextWorkingDay(wednesday), '2026-12-28');
        });

        it('should handle the critical Friday -> Monday dependency rule', () => {
            // This is the key rule: when an activity ends Friday, dependent starts Monday
            const friday = '2026-04-17'; // Friday
            assert.equal(getNextWorkingDay(friday), '2026-04-20'); // Monday
        });

        it('should handle Thursday before Good Friday long weekend', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' },
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const thursday = '2026-04-09'; // Thursday
            // Next: Fri (holiday), Sat, Sun, Mon (holiday) -> Tuesday
            assert.equal(getNextWorkingDay(thursday), '2026-04-14');
        });

        it('should handle activity ending on a holiday', () => {
            setHolidays([
                { date: '2026-04-09', label: 'Test Holiday' }
            ]);
            const thursday = '2026-04-09'; // Thursday (holiday)
            // Next: Friday (working day)
            assert.equal(getNextWorkingDay(thursday), '2026-04-10');
        });
    });

    describe('ensureWorkingDay() vs getNextWorkingDay() differences', () => {
        it('ensureWorkingDay should return same day if working, getNextWorkingDay should advance', () => {
            const monday = '2026-04-13'; // Monday, working day
            assert.equal(ensureWorkingDay(monday), '2026-04-13'); // Same day
            assert.equal(getNextWorkingDay(monday), '2026-04-14'); // Next day
        });

        it('both should skip weekends but from different starting points', () => {
            const saturday = '2026-04-11'; // Saturday
            assert.equal(ensureWorkingDay(saturday), '2026-04-13'); // Monday (from Saturday)
            assert.equal(getNextWorkingDay(saturday), '2026-04-13'); // Monday (from Sunday)
        });

        it('ensureWorkingDay keeps holiday date, getNextWorkingDay advances from it', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const monday = '2026-04-13'; // Monday (holiday)
            assert.equal(ensureWorkingDay(monday), '2026-04-14'); // Tuesday
            assert.equal(getNextWorkingDay(monday), '2026-04-14'); // Tuesday
        });
    });

    describe('Edge cases', () => {
        it('should handle month boundary - April 30 (Thursday) to May 1 (Friday)', () => {
            const thursday = '2026-04-30';
            assert.equal(getNextWorkingDay(thursday), '2026-05-01');
        });

        it('should handle month boundary with weekend - April 25 (Saturday)', () => {
            const saturday = '2026-04-25';
            assert.equal(ensureWorkingDay(saturday), '2026-04-27'); // Monday
        });

        it('should handle year boundary - December 31 to January 1', () => {
            const thursday = '2026-12-31'; // Thursday
            assert.equal(getNextWorkingDay(thursday), '2027-01-01'); // Friday
        });

        it('should handle year boundary with weekend - December 27 (Saturday)', () => {
            const saturday = '2025-12-27';
            assert.equal(ensureWorkingDay(saturday), '2025-12-29'); // Monday
        });

        it('should handle New Year holiday crossing year boundary', () => {
            setHolidays([
                { date: '2027-01-01', label: 'New Year\'s Day' }
            ]);
            const thursday = '2026-12-31'; // Thursday
            // Next: Fri (holiday), Sat, Sun -> Monday
            assert.equal(getNextWorkingDay(thursday), '2027-01-04');
        });
    });
});
