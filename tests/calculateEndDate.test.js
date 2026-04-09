import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateEndDate,
    resetHolidays,
    setHolidays
} from './testUtils.js';

describe('calculateEndDate()', () => {
    beforeEach(() => {
        resetHolidays();
    });

    describe('Basic working day calculations', () => {
        it('should return same day for 1 working day starting Monday', () => {
            const monday = '2026-04-13';
            assert.equal(calculateEndDate(monday, 1), '2026-04-13');
        });

        it('should return same day for 1 working day starting Tuesday', () => {
            const tuesday = '2026-04-14';
            assert.equal(calculateEndDate(tuesday, 1), '2026-04-14');
        });

        it('should calculate 5 working days from Monday to Friday', () => {
            const monday = '2026-04-13';
            assert.equal(calculateEndDate(monday, 5), '2026-04-17'); // Friday
        });

        it('should calculate 2 working days from Monday to Tuesday', () => {
            const monday = '2026-04-13';
            assert.equal(calculateEndDate(monday, 2), '2026-04-14');
        });

        it('should calculate 3 working days from Monday to Wednesday', () => {
            const monday = '2026-04-13';
            assert.equal(calculateEndDate(monday, 3), '2026-04-15');
        });

        it('should calculate 4 working days from Monday to Thursday', () => {
            const monday = '2026-04-13';
            assert.equal(calculateEndDate(monday, 4), '2026-04-16');
        });
    });

    describe('Weekend skipping', () => {
        it('should skip weekend when starting Thursday for 3 working days', () => {
            const thursday = '2026-04-09'; // Thursday
            // Thu, Fri, (skip Sat/Sun), Mon = 3 working days
            assert.equal(calculateEndDate(thursday, 3), '2026-04-13'); // Monday
        });

        it('should skip weekend when starting Friday for 2 working days', () => {
            const friday = '2026-04-10'; // Friday
            // Fri, (skip Sat/Sun), Mon = 2 working days
            assert.equal(calculateEndDate(friday, 2), '2026-04-13'); // Monday
        });

        it('should return same Friday for 1 working day starting Friday', () => {
            const friday = '2026-04-10';
            assert.equal(calculateEndDate(friday, 1), '2026-04-10');
        });

        it('should skip weekend when starting Wednesday for 5 working days', () => {
            const wednesday = '2026-04-15'; // Wednesday
            // Wed, Thu, Fri, (skip Sat/Sun), Mon, Tue = 5 working days
            assert.equal(calculateEndDate(wednesday, 5), '2026-04-21'); // Tuesday
        });

        it('should handle 10 working days (2 weeks) from Monday', () => {
            const monday = '2026-04-13';
            // Week 1: Mon-Fri (5), Week 2: Mon-Fri (5) = 10 working days
            assert.equal(calculateEndDate(monday, 10), '2026-04-24'); // Friday
        });

        it('should handle 15 working days (3 weeks) from Monday', () => {
            const monday = '2026-04-13';
            assert.equal(calculateEndDate(monday, 15), '2026-05-01'); // Friday
        });
    });

    describe('Starting on weekend', () => {
        it('should count Saturday as day 1 when starting on Saturday', () => {
            const saturday = '2026-04-11'; // Saturday
            // According to the logic, if start is non-working, daysAdded stays 0
            // Then loops until daysAdded < workingDays
            // For 1 working day: daysAdded=0, loops, Sunday (0), Monday (1) -> Monday
            assert.equal(calculateEndDate(saturday, 1), '2026-04-13'); // Monday
        });

        it('should handle Sunday start for 1 working day', () => {
            const sunday = '2026-04-12'; // Sunday
            // daysAdded=0 (Sunday is non-working), loops: Monday (1) -> Monday
            assert.equal(calculateEndDate(sunday, 1), '2026-04-13'); // Monday
        });

        it('should handle Saturday start for 5 working days', () => {
            const saturday = '2026-04-11'; // Saturday
            // Start Sat (non-working, daysAdded=0), Sun (0), Mon (1), Tue (2), Wed (3), Thu (4), Fri (5)
            assert.equal(calculateEndDate(saturday, 5), '2026-04-17'); // Friday
        });

        it('should handle Sunday start for 5 working days', () => {
            const sunday = '2026-04-12'; // Sunday
            // Start Sun (non-working, daysAdded=0), Mon (1), Tue (2), Wed (3), Thu (4), Fri (5)
            assert.equal(calculateEndDate(sunday, 5), '2026-04-17'); // Friday
        });
    });

    describe('Holiday handling', () => {
        it('should skip a single holiday on Friday', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            const thursday = '2026-04-09'; // Thursday
            // Thu, (skip Fri holiday), (skip Sat/Sun), Mon, Tue = 3 working days
            assert.equal(calculateEndDate(thursday, 3), '2026-04-14'); // Tuesday
        });

        it('should skip a single holiday on Monday', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const friday = '2026-04-10'; // Friday
            // Fri, (skip Sat/Sun), (skip Mon holiday), Tue, Wed = 3 working days
            assert.equal(calculateEndDate(friday, 3), '2026-04-15'); // Wednesday
        });

        it('should skip consecutive holidays', () => {
            setHolidays([
                { date: '2026-12-24', label: 'Christmas Eve' },
                { date: '2026-12-25', label: 'Christmas Day' }
            ]);
            const wednesday = '2026-12-23'; // Wednesday
            // Wed, (skip Thu holiday), (skip Fri holiday), (skip Sat/Sun), Mon = 2 working days
            assert.equal(calculateEndDate(wednesday, 2), '2026-12-28'); // Monday
        });

        it('should handle starting on a holiday', () => {
            setHolidays([
                { date: '2026-04-09', label: 'Test Holiday' }
            ]);
            const thursday = '2026-04-09'; // Thursday (holiday)
            // Start Thu (holiday, daysAdded=0), Fri (1), Mon (2), Tue (3) = 3 working days
            assert.equal(calculateEndDate(thursday, 3), '2026-04-14'); // Tuesday
        });

        it('should handle multiple scattered holidays', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' },
                { date: '2026-04-13', label: 'Easter Monday' },
                { date: '2026-04-16', label: 'Random Holiday' }
            ]);
            const thursday = '2026-04-09'; // Thursday
            // Thu, (skip Fri holiday), (skip Sat/Sun), (skip Mon holiday), Tue, Wed, (skip Thu holiday), Fri = 4 working days
            assert.equal(calculateEndDate(thursday, 4), '2026-04-17'); // Friday
        });
    });

    describe('Long weekend scenarios', () => {
        it('should handle Good Friday and Easter Monday (4-day weekend)', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' },
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const thursday = '2026-04-09'; // Thursday
            // Thu, (skip Fri holiday, Sat, Sun, Mon holiday), Tue = 2 working days
            assert.equal(calculateEndDate(thursday, 2), '2026-04-14'); // Tuesday
        });

        it('should handle Christmas period with multiple holidays', () => {
            setHolidays([
                { date: '2026-12-24', label: 'Christmas Eve' },
                { date: '2026-12-25', label: 'Christmas Day' },
                { date: '2026-12-28', label: 'Boxing Day Observed' }
            ]);
            const wednesday = '2026-12-23'; // Wednesday
            // Wed, (skip Thu, Fri holidays, Sat, Sun, Mon holiday), Tue = 2 working days
            assert.equal(calculateEndDate(wednesday, 2), '2026-12-29'); // Tuesday
        });
    });

    describe('Month boundaries', () => {
        it('should handle crossing from April to May', () => {
            const wednesday = '2026-04-29'; // April 29 (Wednesday)
            // Wed, Thu, Fri, (skip Sat/Sun), Mon May 4 = 4 working days
            assert.equal(calculateEndDate(wednesday, 4), '2026-05-04'); // Monday, May 4
        });

        it('should handle crossing from December to January', () => {
            const monday = '2026-12-28'; // December 28 (Monday)
            // Mon, Tue, Wed, Thu, Fri = 5 working days
            assert.equal(calculateEndDate(monday, 5), '2027-01-01'); // Friday, Jan 1
        });

        it('should handle February non-leap year (28 days)', () => {
            const monday = '2026-02-23'; // February 23 (Monday)
            // Mon 23, Tue 24, Wed 25, Thu 26, Fri 27, (skip Sat/Sun), Mon Mar 2, Tue 3 = 7 working days
            assert.equal(calculateEndDate(monday, 7), '2026-03-03'); // Tuesday, March 3
        });

        it('should handle February leap year (29 days)', () => {
            const monday = '2024-02-26'; // February 26, 2024 (Monday, leap year)
            // Mon 26, Tue 27, Wed 28, Thu 29, Fri Mar 1 = 5 working days
            assert.equal(calculateEndDate(monday, 5), '2024-03-01'); // Friday, March 1
        });
    });

    describe('Year boundaries', () => {
        it('should handle crossing from 2026 to 2027', () => {
            const monday = '2026-12-28';
            // Mon 28, Tue 29, Wed 30, Thu 31, Fri Jan 1 = 5 working days
            assert.equal(calculateEndDate(monday, 5), '2027-01-01');
        });

        it('should handle New Year with holiday', () => {
            setHolidays([
                { date: '2027-01-01', label: 'New Year\'s Day' }
            ]);
            const monday = '2026-12-28';
            // Mon 28, Tue 29, Wed 30, Thu 31, (skip Fri holiday, Sat, Sun), Mon Jan 4 = 5 working days
            assert.equal(calculateEndDate(monday, 5), '2027-01-04'); // Monday, Jan 4
        });
    });

    describe('Edge cases and special scenarios', () => {
        it('should handle very long duration (20 working days)', () => {
            const monday = '2026-04-13';
            // 4 weeks = 20 working days
            assert.equal(calculateEndDate(monday, 20), '2026-05-08'); // Friday
        });

        it('should handle very long duration with holidays', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' },
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const monday = '2026-04-06'; // Week before Easter
            // Need to account for 2 holidays in the period
            // 10 working days should take us into the next week
            assert.equal(calculateEndDate(monday, 10), '2026-04-21'); // Tuesday (skipped 2 holidays)
        });

        it('should handle starting on last day of month', () => {
            const thursday = '2026-04-30'; // April 30 (Thursday)
            // Thu Apr 30, Fri May 1 = 2 working days
            assert.equal(calculateEndDate(thursday, 2), '2026-05-01');
        });

        it('should handle starting on first day of month', () => {
            const thursday = '2026-05-01'; // May 1 (Friday)
            // Fri May 1, (skip Sat/Sun), Mon, Tue, Wed = 4 working days
            assert.equal(calculateEndDate(thursday, 4), '2026-05-06'); // Wednesday
        });
    });

    describe('Critical custom rule: start date counts as day 1 if working', () => {
        it('should count start day if it is a working day (Monday)', () => {
            const monday = '2026-04-13';
            // Start counts as day 1, so 1 working day = same day
            assert.equal(calculateEndDate(monday, 1), '2026-04-13');
        });

        it('should NOT count start day if it is a weekend (Saturday)', () => {
            const saturday = '2026-04-11';
            // Start does NOT count (weekend), so need to find 1 working day = Monday
            assert.equal(calculateEndDate(saturday, 1), '2026-04-13');
        });

        it('should NOT count start day if it is a holiday', () => {
            setHolidays([
                { date: '2026-04-09', label: 'Test Holiday' }
            ]);
            const thursday = '2026-04-09'; // Thursday (holiday)
            // Start does NOT count (holiday), so need to find 1 working day = Friday
            assert.equal(calculateEndDate(thursday, 1), '2026-04-10');
        });

        it('should verify the logic for Friday -> Friday (1 day)', () => {
            const friday = '2026-04-10'; // Friday (working)
            // Start counts as day 1 = same Friday
            assert.equal(calculateEndDate(friday, 1), '2026-04-10');
        });

        it('should verify the logic for Friday -> Monday (2 days)', () => {
            const friday = '2026-04-10'; // Friday (working)
            // Fri (day 1), skip weekend, Mon (day 2)
            assert.equal(calculateEndDate(friday, 2), '2026-04-13');
        });
    });
});
