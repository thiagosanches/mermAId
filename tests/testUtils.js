// Test utilities for Gantt chart date logic testing
// This file extracts and exports the core date functions from app.js for testing

// Global state - simulating the holidays array from app.js
let holidays = [];

// Reset holidays between tests
function resetHolidays() {
    holidays = [];
}

// Set holidays for testing
function setHolidays(holidayList) {
    holidays = holidayList;
}

// Get current holidays
function getHolidays() {
    return holidays;
}

// Date helper functions (from app.js lines 255-298)
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function dateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
    const [y, m, d] = dateString.split('-');
    return new Date(y, m - 1, d, 12, 0, 0);
}

function isHoliday(dateString) {
    return holidays.some(h => h.date === dateString);
}

function isNonWorking(date) {
    return isWeekend(date) || isHoliday(dateToString(date));
}

function calculateEndDate(startDateString, workingDays) {
    const date = parseDate(startDateString);
    let daysAdded = 0;
    if (!isNonWorking(date)) daysAdded = 1;
    while (daysAdded < workingDays) {
        date.setDate(date.getDate() + 1);
        if (!isNonWorking(date)) daysAdded++;
    }
    return dateToString(date);
}

function getNextWorkingDay(dateString) {
    const next = parseDate(dateString);
    next.setDate(next.getDate() + 1);
    while (isNonWorking(next)) next.setDate(next.getDate() + 1);
    return dateToString(next);
}

function ensureWorkingDay(dateString) {
    const date = parseDate(dateString);
    while (isNonWorking(date)) date.setDate(date.getDate() + 1);
    return dateToString(date);
}

function getWeekdaySegments(startDateString, endDateString) {
    const segments = [];
    const currentDate = parseDate(startDateString);
    const endDate = parseDate(endDateString);
    let segmentStart = null;

    while (currentDate <= endDate) {
        const working = !isNonWorking(currentDate);
        if (working) {
            if (segmentStart === null) segmentStart = new Date(currentDate);
        } else {
            if (segmentStart !== null) {
                const segEnd = new Date(currentDate);
                segEnd.setDate(segEnd.getDate() - 1);
                segments.push({ start: dateToString(segmentStart), end: dateToString(segEnd) });
                segmentStart = null;
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    if (segmentStart !== null) {
        segments.push({ start: dateToString(segmentStart), end: endDateString });
    }
    return segments;
}

function calendarDaysFromFte(workingDays, fte) {
    const effectiveFte = Math.max(0.1, parseFloat(fte) || 1);
    return Math.ceil(workingDays / effectiveFte);
}

function calculateActivityDates(activities, projectStart) {
    const activityMap = new Map();
    activities.forEach(act => activityMap.set(act.id, act));

    activities.forEach(activity => {
        if (activity.dependsOn) {
            const dep = activityMap.get(activity.dependsOn);
            if (dep && dep.end) {
                activity.start = getNextWorkingDay(dep.end);
            } else {
                // Dependency not found, fall back to project start
                const startDate = activity.customStart || projectStart;
                activity.start = ensureWorkingDay(startDate);
            }
        } else {
            const startDate = activity.customStart || projectStart;
            activity.start = ensureWorkingDay(startDate);
        }
        // Use calendar days derived from FTE
        activity.end = calculateEndDate(activity.start, activity.calendarDays);
    });

    return activities;
}

function calculateProjectEndDate(activities) {
    if (activities.length === 0) return null;
    let max = parseDate(activities[0].end);
    activities.forEach(a => {
        const d = parseDate(a.end);
        if (d > max) max = d;
    });
    max.setDate(max.getDate() + 7);
    return dateToString(max);
}

// Export all functions for testing
export {
    resetHolidays,
    setHolidays,
    getHolidays,
    isWeekend,
    dateToString,
    parseDate,
    isHoliday,
    isNonWorking,
    calculateEndDate,
    getNextWorkingDay,
    ensureWorkingDay,
    getWeekdaySegments,
    calendarDaysFromFte,
    calculateActivityDates,
    calculateProjectEndDate
};
