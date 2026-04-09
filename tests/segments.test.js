import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    getWeekdaySegments,
    resetHolidays,
    setHolidays
} from './testUtils.js';

describe('getWeekdaySegments()', () => {
    beforeEach(() => {
        resetHolidays();
    });

    describe('Single segment (no gaps)', () => {
        it('should return single segment for Mon-Fri (no weekend in between)', () => {
            const segments = getWeekdaySegments('2026-04-13', '2026-04-17'); // Mon-Fri
            assert.equal(segments.length, 1);
            assert.equal(segments[0].start, '2026-04-13');
            assert.equal(segments[0].end, '2026-04-17');
        });

        it('should return single segment for single day activity', () => {
            const segments = getWeekdaySegments('2026-04-13', '2026-04-13'); // Monday only
            assert.equal(segments.length, 1);
            assert.equal(segments[0].start, '2026-04-13');
            assert.equal(segments[0].end, '2026-04-13');
        });

        it('should return single segment for two consecutive weekdays', () => {
            const segments = getWeekdaySegments('2026-04-13', '2026-04-14'); // Mon-Tue
            assert.equal(segments.length, 1);
            assert.equal(segments[0].start, '2026-04-13');
            assert.equal(segments[0].end, '2026-04-14');
        });

        it('should return single segment for Wed-Fri', () => {
            const segments = getWeekdaySegments('2026-04-15', '2026-04-17'); // Wed-Fri
            assert.equal(segments.length, 1);
            assert.equal(segments[0].start, '2026-04-15');
            assert.equal(segments[0].end, '2026-04-17');
        });
    });

    describe('Weekend splits', () => {
        it('should split Wed-Tue across weekend', () => {
            const segments = getWeekdaySegments('2026-04-15', '2026-04-21'); // Wed-Tue (next week)
            assert.equal(segments.length, 2);
            assert.equal(segments[0].start, '2026-04-15'); // Wed
            assert.equal(segments[0].end, '2026-04-17');   // Fri
            assert.equal(segments[1].start, '2026-04-20'); // Mon
            assert.equal(segments[1].end, '2026-04-21');   // Tue
        });

        it('should split Thu-Mon across weekend', () => {
            const segments = getWeekdaySegments('2026-04-09', '2026-04-13'); // Thu-Mon
            assert.equal(segments.length, 2);
            assert.equal(segments[0].start, '2026-04-09'); // Thu
            assert.equal(segments[0].end, '2026-04-10');   // Fri
            assert.equal(segments[1].start, '2026-04-13'); // Mon
            assert.equal(segments[1].end, '2026-04-13');   // Mon
        });

        it('should split Fri-Mon across weekend', () => {
            const segments = getWeekdaySegments('2026-04-10', '2026-04-13'); // Fri-Mon
            assert.equal(segments.length, 2);
            assert.equal(segments[0].start, '2026-04-10'); // Fri
            assert.equal(segments[0].end, '2026-04-10');   // Fri
            assert.equal(segments[1].start, '2026-04-13'); // Mon
            assert.equal(segments[1].end, '2026-04-13');   // Mon
        });

        it('should handle activity ending on Friday (single segment)', () => {
            const segments = getWeekdaySegments('2026-04-13', '2026-04-10'); // Mon-Fri
            // Note: This test has wrong order - start after end
            // Let's test Mon-Fri correctly
            const correctSegments = getWeekdaySegments('2026-04-06', '2026-04-10'); // Mon-Fri
            assert.equal(correctSegments.length, 1);
            assert.equal(correctSegments[0].start, '2026-04-06');
            assert.equal(correctSegments[0].end, '2026-04-10');
        });

        it('should handle activity starting on Monday (single segment if same week)', () => {
            const segments = getWeekdaySegments('2026-04-13', '2026-04-15'); // Mon-Wed
            assert.equal(segments.length, 1);
            assert.equal(segments[0].start, '2026-04-13');
            assert.equal(segments[0].end, '2026-04-15');
        });
    });

    describe('Multiple weekend splits', () => {
        it('should split across 2 weekends (3 segments)', () => {
            const segments = getWeekdaySegments('2026-04-15', '2026-04-28'); // Wed-Tue (2 weeks later)
            assert.equal(segments.length, 3);
            assert.equal(segments[0].start, '2026-04-15'); // Wed
            assert.equal(segments[0].end, '2026-04-17');   // Fri (week 1)
            assert.equal(segments[1].start, '2026-04-20'); // Mon
            assert.equal(segments[1].end, '2026-04-24');   // Fri (week 2)
            assert.equal(segments[2].start, '2026-04-27'); // Mon
            assert.equal(segments[2].end, '2026-04-28');   // Tue (week 3)
        });

        it('should split across 3 weekends (4 segments)', () => {
            const segments = getWeekdaySegments('2026-04-15', '2026-05-05'); // Wed-Tue (3 weeks later)
            assert.equal(segments.length, 4);
            assert.equal(segments[0].start, '2026-04-15'); // Wed
            assert.equal(segments[0].end, '2026-04-17');   // Fri
            assert.equal(segments[1].start, '2026-04-20'); // Mon
            assert.equal(segments[1].end, '2026-04-24');   // Fri
            assert.equal(segments[2].start, '2026-04-27'); // Mon
            assert.equal(segments[2].end, '2026-05-01');   // Fri
            assert.equal(segments[3].start, '2026-05-04'); // Mon
            assert.equal(segments[3].end, '2026-05-05');   // Tue
        });

        it('should handle Mon-Mon (spans 2 weeks + 1 day)', () => {
            const segments = getWeekdaySegments('2026-04-13', '2026-04-27'); // Mon-Mon
            // Mon Apr 13 - Fri Apr 17 (week 1)
            // Mon Apr 20 - Fri Apr 24 (week 2)  
            // Mon Apr 27 (week 3)
            assert.equal(segments.length, 3);
            assert.equal(segments[0].start, '2026-04-13'); // Mon
            assert.equal(segments[0].end, '2026-04-17');   // Fri
            assert.equal(segments[1].start, '2026-04-20'); // Mon
            assert.equal(segments[1].end, '2026-04-24');   // Fri
            assert.equal(segments[2].start, '2026-04-27'); // Mon
            assert.equal(segments[2].end, '2026-04-27');   // Mon
        });
    });

    describe('Holiday splits', () => {
        it('should split at a mid-week holiday', () => {
            setHolidays([
                { date: '2026-04-15', label: 'Mid-week Holiday' }
            ]);
            const segments = getWeekdaySegments('2026-04-13', '2026-04-17'); // Mon-Fri
            assert.equal(segments.length, 2);
            assert.equal(segments[0].start, '2026-04-13'); // Mon
            assert.equal(segments[0].end, '2026-04-14');   // Tue
            assert.equal(segments[1].start, '2026-04-16'); // Thu
            assert.equal(segments[1].end, '2026-04-17');   // Fri
        });

        it('should split at Good Friday', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            const segments = getWeekdaySegments('2026-04-09', '2026-04-10'); // Thu-Fri
            assert.equal(segments.length, 1); // Only Thursday
            assert.equal(segments[0].start, '2026-04-09');
            assert.equal(segments[0].end, '2026-04-09');
        });

        it('should handle consecutive holidays creating a gap', () => {
            setHolidays([
                { date: '2026-04-15', label: 'Holiday 1' },
                { date: '2026-04-16', label: 'Holiday 2' }
            ]);
            const segments = getWeekdaySegments('2026-04-13', '2026-04-17'); // Mon-Fri
            assert.equal(segments.length, 2);
            assert.equal(segments[0].start, '2026-04-13'); // Mon
            assert.equal(segments[0].end, '2026-04-14');   // Tue
            assert.equal(segments[1].start, '2026-04-17'); // Fri
            assert.equal(segments[1].end, '2026-04-17');   // Fri
        });

        it('should handle holiday at start of range', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Monday Holiday' }
            ]);
            const segments = getWeekdaySegments('2026-04-13', '2026-04-15'); // Mon-Wed
            assert.equal(segments.length, 1);
            assert.equal(segments[0].start, '2026-04-14'); // Tue
            assert.equal(segments[0].end, '2026-04-15');   // Wed
        });

        it('should handle holiday at end of range', () => {
            setHolidays([
                { date: '2026-04-15', label: 'Wednesday Holiday' }
            ]);
            const segments = getWeekdaySegments('2026-04-13', '2026-04-15'); // Mon-Wed
            assert.equal(segments.length, 1);
            assert.equal(segments[0].start, '2026-04-13'); // Mon
            assert.equal(segments[0].end, '2026-04-14');   // Tue
        });
    });

    describe('Combined weekend and holiday splits', () => {
        it('should handle Good Friday and Easter Monday (4-day weekend)', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' },
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const segments = getWeekdaySegments('2026-04-09', '2026-04-14'); // Thu-Tue
            assert.equal(segments.length, 2);
            assert.equal(segments[0].start, '2026-04-09'); // Thu
            assert.equal(segments[0].end, '2026-04-09');   // Thu
            assert.equal(segments[1].start, '2026-04-14'); // Tue
            assert.equal(segments[1].end, '2026-04-14');   // Tue
        });

        it('should handle Christmas period with multiple holidays and weekend', () => {
            setHolidays([
                { date: '2026-12-24', label: 'Christmas Eve' },
                { date: '2026-12-25', label: 'Christmas Day' }
            ]);
            const segments = getWeekdaySegments('2026-12-23', '2026-12-28'); // Wed-Mon
            assert.equal(segments.length, 2);
            assert.equal(segments[0].start, '2026-12-23'); // Wed
            assert.equal(segments[0].end, '2026-12-23');   // Wed
            assert.equal(segments[1].start, '2026-12-28'); // Mon
            assert.equal(segments[1].end, '2026-12-28');   // Mon
        });

        it('should handle activity with multiple gaps (weekends + holidays)', () => {
            setHolidays([
                { date: '2026-04-15', label: 'Mid-week Holiday' }
            ]);
            const segments = getWeekdaySegments('2026-04-13', '2026-04-21'); // Mon-Tue (crosses weekend and holiday)
            assert.equal(segments.length, 3);
            assert.equal(segments[0].start, '2026-04-13'); // Mon
            assert.equal(segments[0].end, '2026-04-14');   // Tue
            assert.equal(segments[1].start, '2026-04-16'); // Thu
            assert.equal(segments[1].end, '2026-04-17');   // Fri
            assert.equal(segments[2].start, '2026-04-20'); // Mon
            assert.equal(segments[2].end, '2026-04-21');   // Tue
        });
    });

    describe('Edge cases', () => {
        it('should return empty array when all days are non-working', () => {
            const segments = getWeekdaySegments('2026-04-11', '2026-04-12'); // Sat-Sun
            assert.equal(segments.length, 0);
        });

        it('should handle entire week being holidays', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Mon' },
                { date: '2026-04-14', label: 'Tue' },
                { date: '2026-04-15', label: 'Wed' },
                { date: '2026-04-16', label: 'Thu' },
                { date: '2026-04-17', label: 'Fri' }
            ]);
            const segments = getWeekdaySegments('2026-04-13', '2026-04-17'); // Mon-Fri (all holidays)
            assert.equal(segments.length, 0);
        });

        it('should handle month boundary', () => {
            const segments = getWeekdaySegments('2026-04-28', '2026-05-05'); // Tue-Tue (crosses May)
            assert.equal(segments.length, 2);
            assert.equal(segments[0].start, '2026-04-28'); // Tue
            assert.equal(segments[0].end, '2026-05-01');   // Fri (May 1)
            assert.equal(segments[1].start, '2026-05-04'); // Mon
            assert.equal(segments[1].end, '2026-05-05');   // Tue
        });

        it('should handle year boundary', () => {
            const segments = getWeekdaySegments('2026-12-28', '2027-01-05'); // Mon-Tue
            assert.equal(segments.length, 2);
            assert.equal(segments[0].start, '2026-12-28'); // Mon
            assert.equal(segments[0].end, '2027-01-01');   // Fri (Jan 1)
            assert.equal(segments[1].start, '2027-01-04'); // Mon
            assert.equal(segments[1].end, '2027-01-05');   // Tue
        });

        it('should handle single Friday (end of week)', () => {
            const segments = getWeekdaySegments('2026-04-10', '2026-04-10'); // Just Friday
            assert.equal(segments.length, 1);
            assert.equal(segments[0].start, '2026-04-10');
            assert.equal(segments[0].end, '2026-04-10');
        });

        it('should handle single Monday (start of week)', () => {
            const segments = getWeekdaySegments('2026-04-13', '2026-04-13'); // Just Monday
            assert.equal(segments.length, 1);
            assert.equal(segments[0].start, '2026-04-13');
            assert.equal(segments[0].end, '2026-04-13');
        });
    });
});
