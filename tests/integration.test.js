import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateActivityDates,
    calculateProjectEndDate,
    resetHolidays,
    setHolidays
} from './testUtils.js';

describe('Activity Date Calculations Integration', () => {
    beforeEach(() => {
        resetHolidays();
    });

    describe('calculateActivityDates() - No dependencies', () => {
        it('should calculate dates for single activity starting on project start', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13'); // Monday
            
            assert.equal(result[0].start, '2026-04-13'); // Monday
            assert.equal(result[0].end, '2026-04-17'); // Friday
        });

        it('should calculate dates for multiple independent activities', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: null },
                { id: '2', name: 'Task 2', calendarDays: 3, dependsOn: null, customStart: null },
                { id: '3', name: 'Task 3', calendarDays: 10, dependsOn: null, customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13'); // Monday
            
            // All start on same day (project start)
            assert.equal(result[0].start, '2026-04-13');
            assert.equal(result[0].end, '2026-04-17'); // 5 days -> Friday
            
            assert.equal(result[1].start, '2026-04-13');
            assert.equal(result[1].end, '2026-04-15'); // 3 days -> Wednesday
            
            assert.equal(result[2].start, '2026-04-13');
            assert.equal(result[2].end, '2026-04-24'); // 10 days -> Friday next week
        });

        it('should ensure working day when project starts on weekend', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-11'); // Saturday
            
            assert.equal(result[0].start, '2026-04-13'); // Monday (ensured working day)
            assert.equal(result[0].end, '2026-04-17'); // Friday
        });

        it('should ensure working day when project starts on holiday', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13'); // Monday (holiday)
            
            assert.equal(result[0].start, '2026-04-14'); // Tuesday (ensured working day)
            assert.equal(result[0].end, '2026-04-20'); // Monday next week
        });
    });

    describe('calculateActivityDates() - Custom start dates', () => {
        it('should use custom start date when provided', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: '2026-04-20' }
            ];
            const result = calculateActivityDates(activities, '2026-04-13'); // Project starts earlier
            
            assert.equal(result[0].start, '2026-04-20'); // Uses custom start
            assert.equal(result[0].end, '2026-04-24');
        });

        it('should ensure custom start date is a working day', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: '2026-04-11' } // Saturday
            ];
            const result = calculateActivityDates(activities, '2026-04-13');
            
            assert.equal(result[0].start, '2026-04-13'); // Monday (ensured from Saturday)
            assert.equal(result[0].end, '2026-04-17');
        });

        it('should ensure custom start date skips holiday', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: '2026-04-10' }
            ];
            const result = calculateActivityDates(activities, '2026-04-13');
            
            assert.equal(result[0].start, '2026-04-13'); // Monday (skipped Friday holiday + weekend)
            assert.equal(result[0].end, '2026-04-17');
        });
    });

    describe('calculateActivityDates() - Simple dependencies', () => {
        it('should start dependent activity after predecessor ends', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: null },
                { id: '2', name: 'Task 2', calendarDays: 3, dependsOn: '1', customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13'); // Monday
            
            assert.equal(result[0].start, '2026-04-13'); // Monday
            assert.equal(result[0].end, '2026-04-17'); // Friday
            
            assert.equal(result[1].start, '2026-04-20'); // Monday (next working day after Friday)
            assert.equal(result[1].end, '2026-04-22'); // Wednesday
        });

        it('should handle Friday -> Monday dependency transition', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 1, dependsOn: null, customStart: '2026-04-10' }, // Friday
                { id: '2', name: 'Task 2', calendarDays: 1, dependsOn: '1', customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13');
            
            assert.equal(result[0].start, '2026-04-10'); // Friday
            assert.equal(result[0].end, '2026-04-10'); // Friday
            
            assert.equal(result[1].start, '2026-04-13'); // Monday (next working day)
            assert.equal(result[1].end, '2026-04-13'); // Monday
        });

        it('should skip holiday when transitioning to dependent activity', () => {
            setHolidays([
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 1, dependsOn: null, customStart: '2026-04-10' }, // Friday
                { id: '2', name: 'Task 2', calendarDays: 1, dependsOn: '1', customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-06');
            
            assert.equal(result[0].end, '2026-04-10'); // Friday
            assert.equal(result[1].start, '2026-04-14'); // Tuesday (skipped Sat, Sun, Mon holiday)
        });
    });

    describe('calculateActivityDates() - Chain dependencies', () => {
        it('should handle 3-task linear dependency chain', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: null },
                { id: '2', name: 'Task 2', calendarDays: 3, dependsOn: '1', customStart: null },
                { id: '3', name: 'Task 3', calendarDays: 2, dependsOn: '2', customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13'); // Monday
            
            // Task 1: Mon-Fri (week 1)
            assert.equal(result[0].start, '2026-04-13');
            assert.equal(result[0].end, '2026-04-17');
            
            // Task 2: Mon-Wed (week 2)
            assert.equal(result[1].start, '2026-04-20');
            assert.equal(result[1].end, '2026-04-22');
            
            // Task 3: Thu-Fri (week 2)
            assert.equal(result[2].start, '2026-04-23');
            assert.equal(result[2].end, '2026-04-24');
        });

        it('should handle 5-task linear dependency chain', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 2, dependsOn: null, customStart: null },
                { id: '2', name: 'Task 2', calendarDays: 2, dependsOn: '1', customStart: null },
                { id: '3', name: 'Task 3', calendarDays: 2, dependsOn: '2', customStart: null },
                { id: '4', name: 'Task 4', calendarDays: 2, dependsOn: '3', customStart: null },
                { id: '5', name: 'Task 5', calendarDays: 2, dependsOn: '4', customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13'); // Monday
            
            assert.equal(result[0].start, '2026-04-13'); // Mon-Tue
            assert.equal(result[0].end, '2026-04-14');
            
            assert.equal(result[1].start, '2026-04-15'); // Wed-Thu
            assert.equal(result[1].end, '2026-04-16');
            
            assert.equal(result[2].start, '2026-04-17'); // Fri, Mon
            assert.equal(result[2].end, '2026-04-20');
            
            assert.equal(result[3].start, '2026-04-21'); // Tue-Wed
            assert.equal(result[3].end, '2026-04-22');
            
            assert.equal(result[4].start, '2026-04-23'); // Thu-Fri
            assert.equal(result[4].end, '2026-04-24');
        });

        it('should handle chain with holidays', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' },
                { date: '2026-04-13', label: 'Easter Monday' }
            ]);
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 3, dependsOn: null, customStart: null },
                { id: '2', name: 'Task 2', calendarDays: 3, dependsOn: '1', customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-08'); // Wednesday
            
            // Task 1: Wed, Thu, (skip Fri holiday, Sat, Sun, Mon holiday), Tue
            assert.equal(result[0].start, '2026-04-08');
            assert.equal(result[0].end, '2026-04-14'); // Tuesday
            
            // Task 2: Wed, Thu, Fri
            assert.equal(result[1].start, '2026-04-15');
            assert.equal(result[1].end, '2026-04-17');
        });
    });

    describe('calculateActivityDates() - Complex dependency scenarios', () => {
        it('should handle multiple activities depending on same predecessor', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: null },
                { id: '2', name: 'Task 2', calendarDays: 3, dependsOn: '1', customStart: null },
                { id: '3', name: 'Task 3', calendarDays: 2, dependsOn: '1', customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13');
            
            assert.equal(result[0].end, '2026-04-17'); // Friday
            
            // Both Task 2 and Task 3 start Monday after Task 1 ends
            assert.equal(result[1].start, '2026-04-20');
            assert.equal(result[2].start, '2026-04-20');
        });

        it('should handle non-existent dependency gracefully', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: 'non-existent', customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13');
            
            // Should fall back to project start when dependency not found
            assert.equal(result[0].start, '2026-04-13');
        });

        it('should handle mixed independent and dependent activities', () => {
            const activities = [
                { id: '1', name: 'Task 1', calendarDays: 5, dependsOn: null, customStart: null },
                { id: '2', name: 'Task 2', calendarDays: 3, dependsOn: null, customStart: null },
                { id: '3', name: 'Task 3', calendarDays: 2, dependsOn: '1', customStart: null }
            ];
            const result = calculateActivityDates(activities, '2026-04-13');
            
            // Task 1 and Task 2 both start on project start
            assert.equal(result[0].start, '2026-04-13');
            assert.equal(result[1].start, '2026-04-13');
            
            // Task 3 depends on Task 1
            assert.equal(result[2].start, '2026-04-20');
        });
    });

    describe('calculateProjectEndDate()', () => {
        it('should return null for empty activities array', () => {
            const result = calculateProjectEndDate([]);
            assert.equal(result, null);
        });

        it('should return end date + 7 days for single activity', () => {
            const activities = [
                { id: '1', start: '2026-04-13', end: '2026-04-17' }
            ];
            const result = calculateProjectEndDate(activities);
            // April 17 (Fri) + 7 days = April 24 (Fri), but it's calendar days so could cross weekend
            // Let me check: setDate adds 7 calendar days, so Fri 17 + 7 = Fri 24? No, actually...
            // The Date object is created from '2026-04-17', then .setDate(getDate() + 7)
            // So it's adding 7 to day 17 = day 24 BUT we need to check if the calculation crosses weekend
            // Actually it just adds 7 calendar days: Apr 17 + 7 = Apr 24 BUT wait, let's verify manually:
            // Fri Apr 17 + 1 = Sat 18, +2 = Sun 19, +3 = Mon 20, +4 = Tue 21, +5 = Wed 22, +6 = Thu 23, +7 = Fri 24
            // But the function creates Date from '2026-04-17', which could be any time of day
            // Let's check what the actual output is - it was '2026-04-23' (one day off)
            assert.equal(result, '2026-04-24'); // April 17 + 7 calendar days
        });

        it('should find maximum end date among multiple activities', () => {
            const activities = [
                { id: '1', start: '2026-04-13', end: '2026-04-17' },
                { id: '2', start: '2026-04-13', end: '2026-04-15' },
                { id: '3', start: '2026-04-13', end: '2026-04-24' } // Latest
            ];
            const result = calculateProjectEndDate(activities);
            assert.equal(result, '2026-05-01'); // April 24 + 7 days
        });

        it('should add 7-day buffer correctly across month boundary', () => {
            const activities = [
                { id: '1', start: '2026-04-25', end: '2026-04-30' }
            ];
            const result = calculateProjectEndDate(activities);
            assert.equal(result, '2026-05-07'); // April 30 + 7 days = May 7
        });

        it('should add 7-day buffer correctly across year boundary', () => {
            const activities = [
                { id: '1', start: '2026-12-25', end: '2026-12-31' }
            ];
            const result = calculateProjectEndDate(activities);
            assert.equal(result, '2027-01-07'); // Dec 31 + 7 days = Jan 7
        });
    });

    describe('Full integration scenarios', () => {
        it('should calculate complete project with dependencies and holidays', () => {
            setHolidays([
                { date: '2026-04-10', label: 'Good Friday' }
            ]);
            
            const activities = [
                { id: '1', name: 'Planning', calendarDays: 5, dependsOn: null, customStart: null },
                { id: '2', name: 'Development', calendarDays: 10, dependsOn: '1', customStart: null },
                { id: '3', name: 'Testing', calendarDays: 5, dependsOn: '2', customStart: null }
            ];
            
            const result = calculateActivityDates(activities, '2026-04-06'); // Monday
            
            // Planning: Mon, Tue, Wed, Thu, (skip Fri holiday, Sat, Sun), Mon
            assert.equal(result[0].start, '2026-04-06');
            assert.equal(result[0].end, '2026-04-13'); // Easter Monday
            
            // Development: 10 days from Tuesday
            assert.equal(result[1].start, '2026-04-14');
            assert.equal(result[1].end, '2026-04-27'); // Monday (2 weeks later)
            
            // Testing: 5 days from Tuesday
            assert.equal(result[2].start, '2026-04-28');
            assert.equal(result[2].end, '2026-05-04'); // Monday (next week)
            
            const projectEnd = calculateProjectEndDate(result);
            assert.equal(projectEnd, '2026-05-11'); // May 4 + 7 days
        });

        it('should handle real-world project scenario', () => {
            const activities = [
                { id: '1', name: 'Requirements', calendarDays: 3, dependsOn: null, customStart: null },
                { id: '2', name: 'Design', calendarDays: 5, dependsOn: '1', customStart: null },
                { id: '3', name: 'Backend Dev', calendarDays: 10, dependsOn: '2', customStart: null },
                { id: '4', name: 'Frontend Dev', calendarDays: 10, dependsOn: '2', customStart: null },
                { id: '5', name: 'Integration', calendarDays: 5, dependsOn: '3', customStart: null },
                { id: '6', name: 'Testing', calendarDays: 5, dependsOn: '5', customStart: null }
            ];
            
            const result = calculateActivityDates(activities, '2026-04-13'); // Monday
            
            // Requirements: Mon-Wed
            assert.equal(result[0].start, '2026-04-13');
            assert.equal(result[0].end, '2026-04-15');
            
            // Design: Thu-Wed (next week)
            assert.equal(result[1].start, '2026-04-16');
            assert.equal(result[1].end, '2026-04-22');
            
            // Backend Dev: Thu-Wed (2 weeks later)
            assert.equal(result[2].start, '2026-04-23');
            assert.equal(result[2].end, '2026-05-06');
            
            // Frontend Dev: Same as Backend (parallel)
            assert.equal(result[3].start, '2026-04-23');
            assert.equal(result[3].end, '2026-05-06');
            
            // Integration: Thu-Wed
            assert.equal(result[4].start, '2026-05-07');
            assert.equal(result[4].end, '2026-05-13');
            
            // Testing: Thu-Wed
            assert.equal(result[5].start, '2026-05-14');
            assert.equal(result[5].end, '2026-05-20');
        });
    });
});
