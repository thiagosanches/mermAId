// Global state
let activityIdCounter = 1;
let ganttChart = null;
let holidays = []; // [{ date: 'YYYY-MM-DD', label: 'Holiday name' }]
let showWeekends = false; // default: weekends are hidden
let showWeeks   = true;   // default: week row visible
let showMonths  = true;   // default: month row visible
let showDays    = true;   // default: day row visible
let autosaveTimer = null;
let renderTimer = null;

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'ez-gantt-project';

function saveToLocalStorage() {
    try {
        const data = collectProjectData(); // already includes showWeekends
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        showAutosaveStatus('Saved');
    } catch (e) {
        // Quota exceeded or private mode — silently ignore
    }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return false;
        return data;
    } catch {
        return false;
    }
}

let autosaveStatusTimer = null;
function showAutosaveStatus(msg) {
    const el = document.getElementById('autosaveStatus');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(autosaveStatusTimer);
    autosaveStatusTimer = setTimeout(() => el.classList.remove('visible'), 2000);
}

function scheduleSave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveToLocalStorage, 600);
}

function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(generateTimeline, 400);
}

// Attach autosave + auto-render listeners to all DOM inputs/selects in the form
function attachAutosaveListeners() {
    const form = document.querySelector('.form-section');
    if (!form) return;
    form.addEventListener('input', () => { scheduleSave(); scheduleRender(); });
    form.addEventListener('change', () => { scheduleSave(); scheduleRender(); });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('projectStart').value = today;
    updateDependencyDropdowns();
    initDarkMode();
    initFteHints();
    attachAutosaveListeners();
    initPanelToggle();

    document.getElementById('showWeekends').addEventListener('change', (e) => {
        showWeekends = e.target.checked;
        scheduleSave();
        if (ganttChart) scheduleRender();
    });

    document.getElementById('showWeeks').addEventListener('change', (e) => {
        showWeeks = e.target.checked;
        scheduleSave();
        if (ganttChart) scheduleRender();
    });

    document.getElementById('showMonths').addEventListener('change', (e) => {
        showMonths = e.target.checked;
        scheduleSave();
        if (ganttChart) scheduleRender();
    });

    document.getElementById('showDays').addEventListener('change', (e) => {
        showDays = e.target.checked;
        scheduleSave();
        if (ganttChart) scheduleRender();
    });

    // Restore from localStorage or set up defaults for first-time users
    const saved = loadFromLocalStorage();
    if (saved) {
        restoreProjectData(saved, /* autoGenerate */ true);
    } else {
        // First-time user: ensure the initial HTML activity has proper listeners
        const firstActivity = document.querySelector('.activity-item');
        if (firstActivity) {
            attachMilestoneListeners(firstActivity);
            updateFteHint(firstActivity);
        }
        // Auto-generate timeline with default values
        scheduleRender();
    }
});

// ---------------------------------------------------------------------------
// Dark mode
// ---------------------------------------------------------------------------
function initDarkMode() {
    const saved = localStorage.getItem('ez-gantt-dark');
    if (saved === 'true') document.body.classList.add('dark');
    updateDarkModeIcon();
}

function updateDarkModeIcon() {
    const btn = document.getElementById('darkModeToggle');
    btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('ez-gantt-dark', document.body.classList.contains('dark'));
    updateDarkModeIcon();
});

// ---------------------------------------------------------------------------
// Panel toggle (show/hide left form panel)
// ---------------------------------------------------------------------------
function initPanelToggle() {
    const content = document.querySelector('.content');
    const btn = document.getElementById('togglePanel');
    const panelHidden = localStorage.getItem('ez-gantt-panel-hidden') === 'true';
    if (panelHidden) {
        content.classList.add('panel-hidden');
        btn.innerHTML = '&#8250;';
        btn.title = 'Show panel';
    }
    btn.addEventListener('click', () => {
        const hidden = content.classList.toggle('panel-hidden');
        btn.innerHTML = hidden ? '&#8250;' : '&#8249;';
        btn.title = hidden ? 'Show panel' : 'Hide panel';
        localStorage.setItem('ez-gantt-panel-hidden', hidden);
        // Wait for the CSS transition to finish (300ms) then re-render
        setTimeout(() => generateTimeline(), 320);
    });
}

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------
function isHoliday(dateString) {
    return holidays.some(h => h.date === dateString);
}

function formatDateDisplay(dateString) {
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
}

function renderHolidaysList() {
    const container = document.getElementById('holidaysList');
    container.innerHTML = '';
    if (holidays.length === 0) {
        container.innerHTML = '<span class="holidays-empty">No holidays added.</span>';
        return;
    }
    holidays.forEach((h, i) => {
        const tag = document.createElement('span');
        tag.className = 'holiday-tag';
        tag.innerHTML = `${formatDateDisplay(h.date)}${h.label ? ' – ' + escapeHtml(h.label) : ''}
            <button onclick="removeHoliday(${i})" title="Remove">×</button>`;
        container.appendChild(tag);
    });
}

function removeHoliday(index) {
    holidays.splice(index, 1);
    renderHolidaysList();
    scheduleSave();
    scheduleRender();
}

document.getElementById('addHoliday').addEventListener('click', () => {
    const dateInput = document.getElementById('holidayDate');
    const labelInput = document.getElementById('holidayLabel');
    const date = dateInput.value;
    if (!date) { alert('Please select a date for the holiday.'); return; }
    if (holidays.some(h => h.date === date)) { alert('This date is already added.'); return; }
    holidays.push({ date, label: labelInput.value.trim() });
    holidays.sort((a, b) => a.date.localeCompare(b.date));
    dateInput.value = '';
    labelInput.value = '';
    renderHolidaysList();
    scheduleSave();
    scheduleRender();
});

document.getElementById('exportHolidays').addEventListener('click', () => {
    const json = JSON.stringify(holidays, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'holidays.json';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('importHolidaysInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target.result);
            if (!Array.isArray(imported)) throw new Error();
            imported.forEach(h => {
                if (h.date && !holidays.some(existing => existing.date === h.date)) {
                    holidays.push({ date: h.date, label: h.label || '' });
                }
            });
            holidays.sort((a, b) => a.date.localeCompare(b.date));
            renderHolidaysList();
            scheduleSave();
        } catch {
            alert('Invalid holidays file. Expected a JSON array.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
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

// Get weekday (non-holiday) segments for an activity bar
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

// ---------------------------------------------------------------------------
// FTE helpers
// ---------------------------------------------------------------------------
function calendarDaysFromFte(workingDays, fte) {
    const effectiveFte = Math.max(0.1, parseFloat(fte) || 1);
    return Math.ceil(workingDays / effectiveFte);
}

function updateFteHint(activityItem) {
    const wd = parseInt(activityItem.querySelector('.activity-workdays').value) || 5;
    const fte = parseFloat(activityItem.querySelector('.activity-fte').value) || 1;
    const cal = calendarDaysFromFte(wd, fte);
    const hint = activityItem.querySelector('.fte-hint');
    if (hint) hint.textContent = `= ${cal} calendar day${cal !== 1 ? 's' : ''}`;
}

function initFteHints() {
    document.querySelectorAll('.activity-item').forEach(item => {
        updateFteHint(item);
        item.querySelector('.activity-workdays').addEventListener('input', () => updateFteHint(item));
        item.querySelector('.activity-fte').addEventListener('input', () => updateFteHint(item));
    });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getRandomColor() {
    const colors = [
        '#4F46E5', '#7C3AED', '#0EA5E9', '#10B981',
        '#F59E0B', '#EF4444', '#EC4899', '#14B8A6',
        '#6366F1', '#8B5CF6', '#06B6D4', '#22C55E',
        '#F97316', '#64748B', '#0284C7', '#D946EF'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getContrastColor(hexColor) {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// ---------------------------------------------------------------------------
// Dependency dropdowns
// ---------------------------------------------------------------------------
function updateDependencyDropdowns() {
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
        const currentId = item.dataset.id;
        const select = item.querySelector('.activity-dependency');
        const currentValue = select.value;
        select.innerHTML = '<option value="">None</option>';
        activityItems.forEach(other => {
            if (other.dataset.id !== currentId) {
                const name = other.querySelector('.activity-name').value || `Activity ${other.dataset.id}`;
                const opt = document.createElement('option');
                opt.value = other.dataset.id;
                opt.textContent = name;
                select.appendChild(opt);
            }
        });
        if (currentValue) select.value = currentValue;
    });
}

// ---------------------------------------------------------------------------
// Add / Remove activities
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Milestone character input
// ---------------------------------------------------------------------------
function buildMilestoneRowHTML(isMilestone = false, character = '⭐') {
    return `
        <div class="form-group milestone-row">
            <label class="milestone-toggle-label">
                <input type="checkbox" class="activity-milestone"${isMilestone ? ' checked' : ''}> Milestone
            </label>
            <input type="text" class="milestone-character-input" value="${character}" maxlength="2" placeholder="⭐" ${isMilestone ? '' : 'style="display:none;"'}>
        </div>`;
}

function attachMilestoneListeners(item) {
    const checkbox = item.querySelector('.activity-milestone');
    const charInput = item.querySelector('.milestone-character-input');

    // Safety check: ensure both elements exist
    if (!checkbox || !charInput) return;

    checkbox.addEventListener('change', () => {
        charInput.style.display = checkbox.checked ? '' : 'none';
        scheduleSave();
        scheduleRender();
    });

    charInput.addEventListener('input', () => {
        scheduleSave();
        scheduleRender();
    });
}

document.getElementById('addActivity').addEventListener('click', () => {
    const container = document.getElementById('activitiesContainer');
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.dataset.id = activityIdCounter++;
    const color = getRandomColor();

    item.innerHTML = `
        <div class="activity-header-row">
            <input type="text" class="activity-name" placeholder="Activity Name" onchange="updateDependencyDropdowns()">
            <input type="color" class="activity-color activity-color-swatch" value="${color}" title="Color">
            <button class="remove-activity" onclick="removeActivity(this)" title="Remove">✕</button>
        </div>
        <div class="activity-fields">
            <div class="form-group">
                <label>Working Days:</label>
                <input type="number" class="activity-workdays" placeholder="5" value="5" min="1">
            </div>
            <div class="form-group">
                <label>FTE:</label>
                <input type="number" class="activity-fte" placeholder="1" value="1" min="0.1" step="0.1">
            </div>
            <div class="form-group fte-hint-group">
                <label>&nbsp;</label>
                <span class="fte-hint">= 5 calendar days</span>
            </div>
        </div>
        <div class="form-group">
            <label>Depends on:</label>
            <select class="activity-dependency" onchange="toggleStartDateField(this)">
                <option value="">None</option>
            </select>
        </div>
        <div class="form-group custom-start-date">
            <label>Custom Start Date:</label>
            <input type="date" class="activity-custom-start">
        </div>
        ${buildMilestoneRowHTML()}
    `;

    container.appendChild(item);
    updateDependencyDropdowns();

    const customStartDiv = item.querySelector('.custom-start-date');
    customStartDiv.style.display = 'block';

    // FTE hints
    item.querySelector('.activity-workdays').addEventListener('input', () => updateFteHint(item));
    item.querySelector('.activity-fte').addEventListener('input', () => updateFteHint(item));
    updateFteHint(item);
    attachMilestoneListeners(item);
    scheduleSave();
});

function removeActivity(button) {
    button.closest('.activity-item').remove();
    updateDependencyDropdowns();
    scheduleSave();
    scheduleRender();
}

// ---------------------------------------------------------------------------
// Date calculations
// ---------------------------------------------------------------------------
function calculateActivityDates(activities, projectStart) {
    const activityMap = new Map();
    activities.forEach(act => activityMap.set(act.id, act));

    activities.forEach(activity => {
        if (activity.dependsOn) {
            const dep = activityMap.get(activity.dependsOn);
            if (dep) activity.start = getNextWorkingDay(dep.end);
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
    let max = new Date(activities[0].end);
    activities.forEach(a => {
        const d = new Date(a.end);
        if (d > max) max = d;
    });
    max.setDate(max.getDate() + 7);
    return dateToString(max);
}

// ---------------------------------------------------------------------------
// Generate timeline
// ---------------------------------------------------------------------------
function generateTimeline() {
    const projectName = document.getElementById('projectName').value;
    const projectStart = document.getElementById('projectStart').value;

    if (!projectName || !projectStart) return;

    const activities = [];
    document.querySelectorAll('.activity-item').forEach(item => {
        const name = item.querySelector('.activity-name').value;
        const workingDays = parseInt(item.querySelector('.activity-workdays').value) || 5;
        const fte = parseFloat(item.querySelector('.activity-fte').value) || 1;
        const color = item.querySelector('.activity-color').value;
        const dependsOn = item.querySelector('.activity-dependency').value;
        const customStart = item.querySelector('.activity-custom-start').value;
        const id = item.dataset.id;
        const calendarDays = calendarDaysFromFte(workingDays, fte);
        const milestone = item.querySelector('.activity-milestone').checked;
        const milestoneEmoji = item.querySelector('.milestone-character-input').value.trim() || '⭐';

        if (name && workingDays > 0) {
            activities.push({ id, name, workingDays, fte, calendarDays, color, dependsOn: dependsOn || null, customStart: customStart || null, milestone, milestoneEmoji, start: null, end: null });
        }
    });

    if (activities.length === 0) return;

    try {
        const updated = calculateActivityDates(activities, projectStart);
        const projectEnd = calculateProjectEndDate(updated);
        renderGanttChart(projectName, projectStart, projectEnd, updated);
        document.getElementById('exportPng').style.display = 'inline-block';
        scheduleSave();
    } catch (e) {
        console.error('generateTimeline error:', e);
    }
}

document.getElementById('generateTimeline').addEventListener('click', () => {
    const projectName = document.getElementById('projectName').value;
    const projectStart = document.getElementById('projectStart').value;
    if (!projectName || !projectStart) {
        alert('Please fill in project name and start date');
        return;
    }
    const hasActivities = [...document.querySelectorAll('.activity-item')]
        .some(item => item.querySelector('.activity-name').value &&
              parseInt(item.querySelector('.activity-workdays').value) > 0);
    if (!hasActivities) {
        alert('Please add at least one activity with a name and working days');
        return;
    }
    generateTimeline();
});

// ---------------------------------------------------------------------------
// D3 chart
// ---------------------------------------------------------------------------
function renderGanttChart(projectName, projectStart, projectEnd, activities) {
    const container = document.getElementById('ganttChart');
    container.innerHTML = '';

    const isDark = document.body.classList.contains('dark');

    // Read weekend/holiday colors from CSS variables so dark mode is respected
    const style = getComputedStyle(document.documentElement);
    const weekendFill   = style.getPropertyValue('--weekend-bg').trim()  || '#e8e8e8';
    const weekendText   = style.getPropertyValue('--weekend-text').trim() || '#aaaaaa';
    const holidayFill   = style.getPropertyValue('--holiday-bg').trim()  || '#ffcccc';
    const textPrimary   = style.getPropertyValue('--text-primary').trim() || '#333333';
    const axisText      = style.getPropertyValue('--axis-text').trim()    || '#666666';
    const gridLine      = style.getPropertyValue('--grid-line').trim()    || '#e9ecef';
    const axisStroke    = style.getPropertyValue('--axis-stroke').trim()  || '#999999';
    const accentSubtle  = style.getPropertyValue('--accent-subtle').trim() || '#EEF2FF';
    const weekBandOdd   = style.getPropertyValue('--week-band-odd').trim()  || 'transparent';
    const weekBandEven  = style.getPropertyValue('--week-band-even').trim() || accentSubtle;
    const monthBandOdd  = weekBandOdd;
    const monthBandEven = weekBandEven;

    // Extra top margin for the two-row axis header (week row + month row)
    const margin = { top: 60, right: 40, bottom: 80, left: 200 };
    const containerWidth = container.clientWidth - margin.left - margin.right;
    const height = Math.max(400, activities.length * 60 + 100);

    // Build the ordered list of days in the project range, optionally skipping weekends
    const d3ParseDate = d3.timeParse('%Y-%m-%d');
    const minDate = d3ParseDate(projectStart);
    const maxDate = d3ParseDate(projectEnd);
    const allDays = d3.timeDay.range(minDate, maxDate);

    // hideWeekends = !showWeekends — when weekends are NOT shown we build a band scale
    const hideWeekends = !showWeekends;

    // Natural width: give each visible day at least 28px so short projects don't get squashed,
    // but always fill the container when there are many days.
    const visibleDayCount = hideWeekends
        ? allDays.filter(d => !isWeekend(d)).length
        : allDays.length;
    const totalWidth = Math.max(visibleDayCount * 28, containerWidth);

    // When hiding weekends we build a band scale over weekdays only (working days + holidays).
    // Each weekday gets one slot; holidays are rendered as coloured stripes, working days as bars.
    let xScale;
    let workingDaysList;   // true working days (no holidays) — used for bar widths & axis grouping
    let weekdaySlotList;   // all weekdays including holidays — defines the pixel band
    if (hideWeekends) {
        // All weekdays in range (Mon–Fri), regardless of holiday status
        weekdaySlotList = allDays.filter(d => !isWeekend(d));
        // Subset that are actual working days (used for bar math and axis week/month grouping)
        workingDaysList = weekdaySlotList.filter(d => !isHoliday(dateToString(d)));

        const dayWidth = totalWidth / weekdaySlotList.length;
        // Map every weekday date → its pixel x position (holidays included)
        const dayIndex = new Map(weekdaySlotList.map((d, i) => [dateToString(d), i * dayWidth]));

        xScale = (date) => {
            const ds = dateToString(date);
            if (dayIndex.has(ds)) return dayIndex.get(ds);
            // For dates outside the map (weekends, or past end) walk forward to next weekday slot
            let d = new Date(date);
            for (let i = 0; i < 14; i++) {
                d.setDate(d.getDate() + 1);
                const s = dateToString(d);
                if (dayIndex.has(s)) return dayIndex.get(s);
            }
            return totalWidth;
        };
        xScale.dayWidth = dayWidth;
        xScale.isCustom = true;
        xScale.workingDaysList = workingDaysList;
        xScale.weekdaySlotList = weekdaySlotList;
    } else {
        xScale = d3.scaleTime().domain([minDate, maxDate]).range([0, totalWidth]);
        xScale.isCustom = false;
    }

    const width = totalWidth;

    const svg = d3.select('#ganttChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .style('display', 'block')
        .style('margin', '0 auto')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const yScale = d3.scaleBand()
        .domain(activities.map((_, i) => i))
        .range([0, activities.length * 60])
        .padding(0.2);

    // Title
    svg.append('text')
        .attr('x', width / 2).attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('font-size', '20px').style('font-weight', 'bold')
        .style('fill', textPrimary)
        .text(projectName);

    // Grid lines (vertical, one per day)
    if (!hideWeekends) {
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${activities.length * 60})`)
            .call(d3.axisBottom(xScale).ticks(d3.timeDay.every(1)).tickSize(-activities.length * 60).tickFormat(''));
    } else {
        // Draw vertical grid lines for every weekday slot (working days + holidays)
        xScale.weekdaySlotList.forEach(d => {
            svg.append('line')
                .attr('x1', xScale(d)).attr('x2', xScale(d))
                .attr('y1', 0).attr('y2', activities.length * 60)
                .style('stroke', gridLine).style('stroke-opacity', 0.7).style('shape-rendering', 'crispEdges');
        });
    }

    // Weekend + holiday shading
    if (!hideWeekends) {
        // Normal mode: shade weekend blocks and holidays on the full calendar scale
        allDays.forEach(date => {
            const ds = dateToString(date);
            const holiday = holidays.find(h => h.date === ds);

            if (date.getDay() === 6) {
                const monday = new Date(date);
                monday.setDate(monday.getDate() + 2);
                svg.append('rect')
                    .attr('x', xScale(date)).attr('y', 0)
                    .attr('width', xScale(monday) - xScale(date))
                    .attr('height', activities.length * 60)
                    .attr('fill', weekendFill).attr('opacity', 0.75);
                svg.append('text')
                    .attr('x', xScale(date) + (xScale(monday) - xScale(date)) / 2)
                    .attr('y', -10).attr('text-anchor', 'middle')
                    .style('font-size', '10px').style('fill', weekendText).style('font-style', 'italic')
                    .text('Wknd');
            }

            if (holiday) {
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                svg.append('rect')
                    .attr('x', xScale(date)).attr('y', 0)
                    .attr('width', Math.max(xScale(nextDay) - xScale(date), 2))
                    .attr('height', activities.length * 60)
                    .attr('fill', holidayFill).attr('opacity', 0.85);
                svg.append('text')
                    .attr('x', xScale(date) + (xScale(nextDay) - xScale(date)) / 2)
                    .attr('y', -10).attr('text-anchor', 'middle')
                    .style('font-size', '9px').style('fill', isDark ? '#ff8080' : '#c0392b').style('font-style', 'italic')
                    .text(holiday.label || 'Holiday');
            }
        });
    } else {
        // Hide-weekends mode: holidays now have their own slot in the band scale,
        // so xScale(hDate) returns the correct pixel position directly.
        const dayWidth = xScale.dayWidth;

        allDays.filter(d => !isWeekend(d) && isHoliday(dateToString(d))).forEach(hDate => {
            const hDs = dateToString(hDate);
            const holiday = holidays.find(h => h.date === hDs);
            const x = xScale(hDate);

            svg.append('rect')
                .attr('x', x).attr('y', 0)
                .attr('width', dayWidth).attr('height', activities.length * 60)
                .attr('fill', holidayFill).attr('opacity', 0.85);
            svg.append('text')
                .attr('x', x + dayWidth / 2).attr('y', -10)
                .attr('text-anchor', 'middle')
                .style('font-size', '9px').style('fill', isDark ? '#ff8080' : '#c0392b').style('font-style', 'italic')
                .text(holiday ? (holiday.label || 'Holiday') : 'Holiday');
        });
    }

    // ---------------------------------------------------------------------------
    // Today marker — vertical line + label if today is within the project range
    // ---------------------------------------------------------------------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today >= minDate && today < maxDate) {
        const todayX = hideWeekends ? xScale(today) : xScale(today);
        const chartHeight = activities.length * 60;

        // Vertical line spanning full chart height
        svg.append('line')
            .attr('x1', todayX).attr('x2', todayX)
            .attr('y1', 0).attr('y2', chartHeight)
            .style('stroke', '#ff4d4d')
            .style('stroke-width', 2)
            .style('stroke-dasharray', '4,3')
            .style('shape-rendering', 'crispEdges');

        // Small "Today" label above the chart area
        svg.append('text')
            .attr('x', todayX + 4).attr('y', -10)
            .attr('text-anchor', 'start')
            .style('font-size', '10px')
            .style('font-weight', '700')
            .style('fill', '#ff4d4d')
            .text('Today');
    }

    // ---------------------------------------------------------------------------
    // X axis rows: DAY row + WEEK row + MONTH row (each togglable)
    // ---------------------------------------------------------------------------
    const axisY = activities.length * 60;
    const dayRowHeight   = showDays   ? 20 : 0;
    const weekRowHeight  = showWeeks  ? 24 : 0;
    const monthRowHeight = showMonths ? 24 : 0;

    if (!hideWeekends) {
        // --- Normal (show-weekends) mode ---
        // Weeks run Sun–Sat (d3.timeWeek is Sunday-based).
        // W0 only if the project starts mid-week (Tue–Sat).
        // Starting on Sun or Mon is considered a full week start → W1.
        const isFullWeekStart = minDate.getDay() === 0 || minDate.getDay() === 1;

        // d3.timeWeek.range returns Sundays — use them directly as week boundaries.
        const sundayWeeks = d3.timeWeek.range(minDate, maxDate)
            .filter(s => s > minDate && s < maxDate);

        if (showDays) {
            // Draw day row (topmost axis row, closest to the bars)
            const dayAxis = svg.append('g')
                .attr('class', 'x-axis x-axis-days')
                .attr('transform', `translate(0,${axisY})`);

            allDays.forEach(date => {
                const isWknd = date.getDay() === 0 || date.getDay() === 6;
                const isHol  = holidays.some(h => h.date === dateToString(date));
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                const x1 = xScale(date);
                const x2 = xScale(nextDay);
                const cellW = x2 - x1;

                const fill = isHol ? holidayFill : isWknd ? weekendFill : 'transparent';
                dayAxis.append('rect')
                    .attr('x', x1).attr('y', 0)
                    .attr('width', cellW).attr('height', dayRowHeight)
                    .attr('fill', fill)
                    .attr('stroke', axisStroke).attr('stroke-width', 0.5);

                // Only label if cell is wide enough
                if (cellW >= 14) {
                    dayAxis.append('text')
                        .attr('x', x1 + cellW / 2).attr('y', dayRowHeight / 2)
                        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                        .style('font-size', '10px')
                        .style('fill', isWknd || isHol ? weekendText : axisText)
                        .text(date.getDate());
                }
            });
            // Outer border
            dayAxis.append('rect')
                .attr('x', 0).attr('y', 0)
                .attr('width', width).attr('height', dayRowHeight)
                .attr('fill', 'none')
                .attr('stroke', axisStroke).attr('stroke-width', 1.5);
        }

        if (showWeeks) {
            // Draw week row (row 1)
            const weekAxis = svg.append('g')
                .attr('class', 'x-axis x-axis-weeks')
                .attr('transform', `translate(0,${axisY + dayRowHeight})`);

            // Build a unified list of week segments for drawing (W0 + W1, W2…)
            const weekSegments = [];
            if (!isFullWeekStart) {
                weekSegments.push({
                    x1: xScale(minDate),
                    x2: sundayWeeks.length > 0 ? xScale(sundayWeeks[0]) : width,
                    label: 'W0',
                });
            } else {
                // Project starts on Sun or Mon — first full week is W1
                weekSegments.push({
                    x1: xScale(minDate),
                    x2: sundayWeeks.length > 0 ? xScale(sundayWeeks[0]) : width,
                    label: 'W1',
                });
            }
            sundayWeeks.forEach((w, idx) => {
                weekSegments.push({
                    x1: xScale(w),
                    x2: idx + 1 < sundayWeeks.length ? xScale(sundayWeeks[idx + 1]) : width,
                    label: `W${idx + (isFullWeekStart ? 2 : 1)}`,
                });
            });

            // Draw background bands (alternating) then divider lines then labels
            weekSegments.forEach((seg, idx) => {
                const bandFill = idx % 2 === 0 ? weekBandEven : weekBandOdd;
                weekAxis.append('rect')
                    .attr('x', seg.x1).attr('y', 0)
                    .attr('width', seg.x2 - seg.x1).attr('height', weekRowHeight)
                    .attr('fill', bandFill);
                // Left border line (full row height, weight 1.5px)
                weekAxis.append('line')
                    .attr('x1', seg.x1).attr('x2', seg.x1)
                    .attr('y1', 0).attr('y2', weekRowHeight)
                    .style('stroke', axisStroke).style('stroke-width', 1.5);
                weekAxis.append('text')
                    .attr('x', (seg.x1 + seg.x2) / 2).attr('y', weekRowHeight / 2)
                    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                    .style('font-size', '11px').style('font-weight', '600').style('fill', axisText)
                    .text(seg.label);
            });
            // Closing right border
            weekAxis.append('line')
                .attr('x1', width).attr('x2', width)
                .attr('y1', 0).attr('y2', weekRowHeight)
                .style('stroke', axisStroke).style('stroke-width', 1.5);
            // Top border
            weekAxis.append('line')
                .attr('x1', 0).attr('x2', width)
                .attr('y1', 0).attr('y2', 0)
                .style('stroke', axisStroke).style('stroke-width', 1.5);
            // Bottom border
            weekAxis.append('line')
                .attr('x1', 0).attr('x2', width)
                .attr('y1', weekRowHeight).attr('y2', weekRowHeight)
                .style('stroke', axisStroke).style('stroke-width', 1.5);
        }

        if (showMonths) {
            // Draw month bands (row 2)
            const monthAxis = svg.append('g')
                .attr('class', 'x-axis x-axis-months')
                .attr('transform', `translate(0,${axisY + dayRowHeight + weekRowHeight})`);

            const months = d3.timeMonth.range(d3.timeMonth.floor(minDate), maxDate);
            months.forEach((m, idx) => {
                const mStart = Math.max(xScale(m), 0);
                const mEnd = idx + 1 < months.length
                    ? Math.min(xScale(months[idx + 1]), width)
                    : width;
                const mWidth = mEnd - mStart;

                monthAxis.append('rect')
                    .attr('x', mStart).attr('y', 0)
                    .attr('width', mWidth).attr('height', monthRowHeight)
                    .attr('fill', idx % 2 === 0 ? monthBandEven : monthBandOdd)
                    .attr('stroke', axisStroke).attr('stroke-width', 1.5);

                monthAxis.append('text')
                    .attr('x', mStart + mWidth / 2).attr('y', monthRowHeight / 2)
                    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                    .style('font-size', '11px').style('font-weight', '700').style('fill', axisText)
                    .text(d3.timeFormat('%B %Y')(m));
            });
        }

    } else {
        // --- Hide-weekends (compressed) mode ---
        // Use weekdaySlotList (Mon–Fri including holidays) for pixel positions,
        // so holiday slots are properly accounted for in week/month spans.
        const slotList = xScale.weekdaySlotList;
        const dayWidth = xScale.dayWidth;

        // Week row: group consecutive weekday slots by ISO week
        const weekGroups = [];
        let curWeek = null;
        slotList.forEach((d, i) => {
            const wk = d3.timeFormat('%Y-W%V')(d);
            if (wk !== curWeek) {
                weekGroups.push({ key: wk, date: d, startIdx: i });
                curWeek = wk;
            }
        });

        // If the project doesn't start on a Monday the first (partial) week is W0.
        const startsOnMonday = minDate.getDay() === 1;

        if (showDays) {
            // Draw day row (topmost axis row, closest to bars) — one cell per weekday slot
            const dayAxisG = svg.append('g')
                .attr('class', 'x-axis x-axis-days')
                .attr('transform', `translate(0,${axisY})`);

            slotList.forEach((date, i) => {
                const isHol = holidays.some(h => h.date === dateToString(date));
                const x1 = i * dayWidth;
                const fill = isHol ? holidayFill : 'transparent';

                dayAxisG.append('rect')
                    .attr('x', x1).attr('y', 0)
                    .attr('width', dayWidth).attr('height', dayRowHeight)
                    .attr('fill', fill)
                    .attr('stroke', axisStroke).attr('stroke-width', 0.5);

                if (dayWidth >= 14) {
                    dayAxisG.append('text')
                        .attr('x', x1 + dayWidth / 2).attr('y', dayRowHeight / 2)
                        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                        .style('font-size', '10px')
                        .style('fill', isHol ? weekendText : axisText)
                        .text(date.getDate());
                }
            });
            // Outer border
            dayAxisG.append('rect')
                .attr('x', 0).attr('y', 0)
                .attr('width', width).attr('height', dayRowHeight)
                .attr('fill', 'none')
                .attr('stroke', axisStroke).attr('stroke-width', 1.5);
        }

        if (showWeeks) {
            const weekAxisG = svg.append('g')
                .attr('class', 'x-axis x-axis-weeks')
                .attr('transform', `translate(0,${axisY + dayRowHeight})`);

            weekGroups.forEach((wg, idx) => {
                const x1 = wg.startIdx * dayWidth;
                const nextIdx = idx + 1 < weekGroups.length ? weekGroups[idx + 1].startIdx : slotList.length;
                const x2 = nextIdx * dayWidth;

                const bandFill = idx % 2 === 0 ? weekBandEven : weekBandOdd;
                weekAxisG.append('rect')
                    .attr('x', x1).attr('y', 0)
                    .attr('width', x2 - x1).attr('height', weekRowHeight)
                    .attr('fill', bandFill);
                weekAxisG.append('line')
                    .attr('x1', x1).attr('x2', x1)
                    .attr('y1', 0).attr('y2', weekRowHeight)
                    .style('stroke', axisStroke).style('stroke-width', 1.5);

                const label = (!startsOnMonday && idx === 0) ? 'W0' : `W${startsOnMonday ? idx + 1 : idx}`;
                weekAxisG.append('text')
                    .attr('x', (x1 + x2) / 2).attr('y', weekRowHeight / 2)
                    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                    .style('font-size', '11px').style('font-weight', '600').style('fill', axisText)
                    .text(label);
            });
            // Closing right border + top + bottom border
            weekAxisG.append('line')
                .attr('x1', width).attr('x2', width)
                .attr('y1', 0).attr('y2', weekRowHeight)
                .style('stroke', axisStroke).style('stroke-width', 1.5);
            weekAxisG.append('line')
                .attr('x1', 0).attr('x2', width)
                .attr('y1', 0).attr('y2', 0)
                .style('stroke', axisStroke).style('stroke-width', 1.5);
            weekAxisG.append('line')
                .attr('x1', 0).attr('x2', width)
                .attr('y1', weekRowHeight).attr('y2', weekRowHeight)
                .style('stroke', axisStroke).style('stroke-width', 1.5);
        }

        if (showMonths) {
            // Month row: group weekday slots by month
            const monthGroups = [];
            let curMonth = null;
            slotList.forEach((d, i) => {
                const mk = d3.timeFormat('%Y-%m')(d);
                if (mk !== curMonth) {
                    monthGroups.push({ key: mk, date: d, startIdx: i });
                    curMonth = mk;
                }
            });

            const monthAxisG = svg.append('g')
                .attr('class', 'x-axis x-axis-months')
                .attr('transform', `translate(0,${axisY + dayRowHeight + weekRowHeight})`);

            monthGroups.forEach((mg, idx) => {
                const x1 = mg.startIdx * dayWidth;
                const nextIdx = idx + 1 < monthGroups.length ? monthGroups[idx + 1].startIdx : slotList.length;
                const x2 = nextIdx * dayWidth;
                const mWidth = x2 - x1;

                monthAxisG.append('rect')
                    .attr('x', x1).attr('y', 0)
                    .attr('width', mWidth).attr('height', monthRowHeight)
                    .attr('fill', idx % 2 === 0 ? monthBandEven : monthBandOdd)
                    .attr('stroke', axisStroke).attr('stroke-width', 1.5);

                monthAxisG.append('text')
                    .attr('x', x1 + mWidth / 2).attr('y', monthRowHeight / 2)
                    .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                    .style('font-size', '11px').style('font-weight', '700').style('fill', axisText)
                    .text(d3.timeFormat('%B %Y')(mg.date));
            });
        }
    }

    // Activity bars
    const bars = svg.selectAll('.bar').data(activities).enter().append('g').attr('class', 'activity-bar');

    bars.append('text')
        .attr('x', -10).attr('y', (d, i) => yScale(i) + yScale.bandwidth() / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .style('font-size', '14px').style('font-weight', '500').style('fill', textPrimary)
        .text(d => d.name);

    const oneDayWidth = xScale.isCustom
        ? xScale.dayWidth
        : xScale(d3.timeDay.offset(minDate, 1)) - xScale(minDate);

    bars.each(function(d, i) {
        const barGroup = d3.select(this);
        const segments = getWeekdaySegments(d.start, d.end);

        segments.forEach(seg => {
            const segStart = d3ParseDate(seg.start);
            const segEnd = d3ParseDate(seg.end);
            let days = 0;
            const tmp = new Date(segStart);
            while (tmp <= segEnd) {
                if (!isNonWorking(tmp)) days++;
                tmp.setDate(tmp.getDate() + 1);
            }
            barGroup.append('rect')
                .attr('x', xScale(segStart)).attr('y', yScale(i))
                .attr('width', days * oneDayWidth).attr('height', yScale.bandwidth())
                .attr('fill', d.color).attr('rx', 4).attr('ry', 4)
                .style('opacity', 0.85);
        });

        // Milestone emoji — rendered after the bar's right edge
        if (d.milestone) {
            const endX = xScale(d3ParseDate(d.end)) + oneDayWidth + 4;
            const midY = yScale(i) + yScale.bandwidth() / 2;
            barGroup.append('text')
                .attr('x', endX)
                .attr('y', midY)
                .attr('dominant-baseline', 'middle')
                .style('font-size', '28px')
                .style('pointer-events', 'none')
                .text(d.milestoneEmoji || '⭐');
        }
    });

    // Labels on bars
    bars.append('text')
        .attr('x', d => xScale(d3ParseDate(d.start)) + 5)
        .attr('y', (d, i) => yScale(i) + yScale.bandwidth() / 2 - 8)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px').style('fill', d => getContrastColor(d.color))
        .style('font-weight', 'bold').style('pointer-events', 'none')
        .text(d => `${d.workingDays} wd × ${d.fte} FTE = ${d.calendarDays} days`);

    bars.append('text')
        .attr('x', d => xScale(d3ParseDate(d.start)) + 5)
        .attr('y', (d, i) => yScale(i) + yScale.bandwidth() / 2 + 8)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '10px').style('fill', d => getContrastColor(d.color))
        .style('pointer-events', 'none')
        .text(d => `${d.start} → ${d.end}`);

    ganttChart = { activities, svg, xScale, yScale };
}

// ---------------------------------------------------------------------------
// Export PNG
// ---------------------------------------------------------------------------
document.getElementById('exportPng').addEventListener('click', () => {
    const svgEl = document.querySelector('#ganttChart svg');
    if (!svgEl) return;

    // Clone the SVG so we can safely mutate it without affecting the page
    const svgClone = svgEl.cloneNode(true);

    // Inject a <style> block into the SVG that embeds the same font stack used
    // by the page. Without this, the browser's SVG→canvas rasterizer falls back
    // to its built-in generic sans-serif font and ignores inherited CSS.
    const fontFamily = getComputedStyle(document.body).fontFamily;
    const computedStyle = getComputedStyle(document.documentElement);
    const axisTextColor  = computedStyle.getPropertyValue('--axis-text').trim()   || '#666666';
    const gridLineColor  = computedStyle.getPropertyValue('--grid-line').trim()   || '#e9ecef';
    const axisStrokeColor = computedStyle.getPropertyValue('--axis-stroke').trim() || '#999999';
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
        text { font-family: ${fontFamily}; }
        .x-axis text { font-size: 12px; fill: ${axisTextColor}; }
        .grid line { stroke: ${gridLineColor}; stroke-opacity: 0.7; }
        .x-axis path, .x-axis line { stroke: ${axisStrokeColor}; }
    `;
    svgClone.insertBefore(styleEl, svgClone.firstChild);

    // Set explicit background on the SVG root
    const bgColor = document.body.classList.contains('dark') ? '#1e1e2e' : '#ffffff';
    svgClone.style.background = bgColor;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgClone);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // retina
        canvas.width = svgEl.width.baseVal.value * scale;
        canvas.height = svgEl.height.baseVal.value * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const a = document.createElement('a');
        a.download = `${document.getElementById('projectName').value || 'timeline'}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
    };
    img.src = url;
});

// ---------------------------------------------------------------------------
// Toggle custom start date
// ---------------------------------------------------------------------------
function toggleStartDateField(selectElement) {
    const item = selectElement.closest('.activity-item');
    const customStartDiv = item.querySelector('.custom-start-date');
    if (selectElement.value === '') {
        customStartDiv.style.display = 'block';
    } else {
        customStartDiv.style.display = 'none';
        item.querySelector('.activity-custom-start').value = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.activity-item').forEach(item => {
        const sel = item.querySelector('.activity-dependency');
        toggleStartDateField(sel);
        attachMilestoneListeners(item);
    });
});

// ---------------------------------------------------------------------------
// Save / Load
// ---------------------------------------------------------------------------
function collectProjectData() {
    const projectName = document.getElementById('projectName').value;
    const projectStart = document.getElementById('projectStart').value;

    const activities = [];
    document.querySelectorAll('.activity-item').forEach(item => {
        activities.push({
            id: item.dataset.id,
            name: item.querySelector('.activity-name').value,
            workingDays: item.querySelector('.activity-workdays').value,
            fte: item.querySelector('.activity-fte').value,
            dependsOn: item.querySelector('.activity-dependency').value,
            customStart: item.querySelector('.activity-custom-start').value,
            color: item.querySelector('.activity-color').value,
            milestone: item.querySelector('.activity-milestone').checked,
            milestoneEmoji: item.querySelector('.milestone-character-input').value.trim() || '⭐',
        });
    });

    return { projectName, projectStart, holidays, activities, showWeekends, showWeeks, showMonths, showDays };
}

function saveProject() {
    const data = collectProjectData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.projectName || 'project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function loadProject(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            restoreProjectData(data);
        } catch {
            alert('Invalid project file.');
        }
    };
    reader.readAsText(file);
}

function restoreProjectData(data, autoGenerate = true) {
    document.getElementById('projectName').value = data.projectName || '';
    document.getElementById('projectStart').value = data.projectStart || '';

    // Restore showWeekends toggle
    if (typeof data.showWeekends === 'boolean') {
        showWeekends = data.showWeekends;
        document.getElementById('showWeekends').checked = showWeekends;
    }

    // Restore showWeeks / showMonths toggles
    if (typeof data.showWeeks === 'boolean') {
        showWeeks = data.showWeeks;
        document.getElementById('showWeeks').checked = showWeeks;
    }
    if (typeof data.showMonths === 'boolean') {
        showMonths = data.showMonths;
        document.getElementById('showMonths').checked = showMonths;
    }
    if (typeof data.showDays === 'boolean') {
        showDays = data.showDays;
        document.getElementById('showDays').checked = showDays;
    }

    // Restore holidays
    holidays = Array.isArray(data.holidays) ? data.holidays : [];
    renderHolidaysList();

    const container = document.getElementById('activitiesContainer');
    container.innerHTML = '';
    activityIdCounter = 0;

    data.activities.forEach(act => {
        const id = act.id ?? activityIdCounter;
        if (Number(id) >= activityIdCounter) activityIdCounter = Number(id) + 1;

        const item = document.createElement('div');
        item.className = 'activity-item';
        item.dataset.id = id;
        item.innerHTML = `
            <div class="activity-header-row">
                <input type="text" class="activity-name" placeholder="Activity Name" value="${escapeHtml(act.name || '')}" onchange="updateDependencyDropdowns()">
                <input type="color" class="activity-color activity-color-swatch" value="${escapeHtml(act.color || '#4F46E5')}" title="Color">
                <button class="remove-activity" onclick="removeActivity(this)" title="Remove">✕</button>
            </div>
            <div class="activity-fields">
                <div class="form-group">
                    <label>Working Days:</label>
                    <input type="number" class="activity-workdays" placeholder="5" value="${Number(act.workingDays) || 5}" min="1">
                </div>
                <div class="form-group">
                    <label>FTE:</label>
                    <input type="number" class="activity-fte" placeholder="1" value="${parseFloat(act.fte) || 1}" min="0.1" step="0.1">
                </div>
                <div class="form-group fte-hint-group">
                    <label>&nbsp;</label>
                    <span class="fte-hint"></span>
                </div>
            </div>
            <div class="form-group">
                <label>Depends on:</label>
                <select class="activity-dependency" onchange="toggleStartDateField(this)">
                    <option value="">None</option>
                </select>
            </div>
            <div class="form-group custom-start-date">
                <label>Custom Start Date:</label>
                <input type="date" class="activity-custom-start" value="${escapeHtml(act.customStart || '')}">
            </div>
            ${buildMilestoneRowHTML(!!act.milestone, act.milestoneEmoji || '🏁')}
        `;
        container.appendChild(item);

        item.querySelector('.activity-workdays').addEventListener('input', () => updateFteHint(item));
        item.querySelector('.activity-fte').addEventListener('input', () => updateFteHint(item));
        updateFteHint(item);
        attachMilestoneListeners(item);
    });

    updateDependencyDropdowns();
    data.activities.forEach(act => {
        const item = container.querySelector(`.activity-item[data-id="${act.id}"]`);
        if (!item) return;
        const select = item.querySelector('.activity-dependency');
        if (act.dependsOn) select.value = act.dependsOn;
        toggleStartDateField(select);
    });

    if (autoGenerate) requestAnimationFrame(() => requestAnimationFrame(generateTimeline));
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function resetProject() {
    if (!confirm('Start a new project? All unsaved changes will be lost.')) return;
    localStorage.removeItem(STORAGE_KEY);
    restoreProjectData({
        projectName: 'My Project',
        projectStart: '',
        showWeekends: false,
        showWeeks: true,
        showMonths: true,
        showDays: true,
        holidays: [],
        activities: [
            { id: 0, name: '', color: '#4F46E5', workdays: 5, fte: 1, dependency: '', customStart: '' }
        ]
    }, false);
    document.getElementById('ganttChart').innerHTML = '';
    document.getElementById('exportPng').style.display = 'none';
    document.getElementById('generateTimeline').style.display = 'none';
}

document.getElementById('newProject').addEventListener('click', resetProject);
document.getElementById('saveProject').addEventListener('click', saveProject);
document.getElementById('loadProjectInput').addEventListener('change', (e) => {
    loadProject(e.target.files[0]);
    e.target.value = '';
});

// Make functions available globally
window.removeActivity = removeActivity;
window.updateDependencyDropdowns = updateDependencyDropdowns;
window.toggleStartDateField = toggleStartDateField;
window.removeHoliday = removeHoliday;
