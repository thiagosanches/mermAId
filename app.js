// Global state
let activityIdCounter = 1;
let ganttChart = null;

// Initialize with today's date
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('projectStart').value = today;
    updateDependencyDropdowns();
});

// Helper function to check if a date is a weekend
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

// Calculate end date from start date and working days (excluding weekends)
function calculateEndDate(startDateString, workingDays) {
    // Parse the date string and create a date at noon to avoid timezone issues
    const parts = startDateString.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    let daysAdded = 0;
    
    // Count the start date as the first working day if it's a weekday
    if (!isWeekend(date)) {
        daysAdded = 1;
    }
    
    // Add remaining working days
    while (daysAdded < workingDays) {
        date.setDate(date.getDate() + 1);
        if (!isWeekend(date)) {
            daysAdded++;
        }
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Calculate the next working day after a given date
function getNextWorkingDay(dateString) {
    // Parse the date string and create a date at noon to avoid timezone issues
    const parts = dateString.split('-');
    const nextDay = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    nextDay.setDate(nextDay.getDate() + 1);
    
    while (isWeekend(nextDay)) {
        nextDay.setDate(nextDay.getDate() + 1);
    }
    
    const year = nextDay.getFullYear();
    const month = String(nextDay.getMonth() + 1).padStart(2, '0');
    const day = String(nextDay.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Ensure a date is a working day (if weekend, move to next Monday)
function ensureWorkingDay(dateString) {
    // Parse the date string and create a date at noon to avoid timezone issues
    const parts = dateString.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    
    while (isWeekend(date)) {
        date.setDate(date.getDate() + 1);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Calculate working days between two dates (excluding weekends)
function calculateWorkingDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    const current = new Date(start);
    while (current <= end) {
        if (!isWeekend(current)) {
            workingDays++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
}

// Get weekday segments for an activity (split by weekends)
function getWeekdaySegments(startDateString, endDateString) {
    const segments = [];
    const parts = startDateString.split('-');
    const currentDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    const parts2 = endDateString.split('-');
    const endDate = new Date(parts2[0], parts2[1] - 1, parts2[2], 12, 0, 0);
    
    let segmentStart = null;
    
    while (currentDate <= endDate) {
        const isWeekday = !isWeekend(currentDate);
        
        if (isWeekday) {
            if (segmentStart === null) {
                // Start a new segment
                segmentStart = new Date(currentDate);
            }
        } else {
            if (segmentStart !== null) {
                // End the current segment
                const segmentEnd = new Date(currentDate);
                segmentEnd.setDate(segmentEnd.getDate() - 1);
                
                const year = segmentStart.getFullYear();
                const month = String(segmentStart.getMonth() + 1).padStart(2, '0');
                const day = String(segmentStart.getDate()).padStart(2, '0');
                const startStr = `${year}-${month}-${day}`;
                
                const year2 = segmentEnd.getFullYear();
                const month2 = String(segmentEnd.getMonth() + 1).padStart(2, '0');
                const day2 = String(segmentEnd.getDate()).padStart(2, '0');
                const endStr = `${year2}-${month2}-${day2}`;
                
                segments.push({ start: startStr, end: endStr });
                segmentStart = null;
            }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Close any remaining segment
    if (segmentStart !== null) {
        const year = segmentStart.getFullYear();
        const month = String(segmentStart.getMonth() + 1).padStart(2, '0');
        const day = String(segmentStart.getDate()).padStart(2, '0');
        const startStr = `${year}-${month}-${day}`;
        
        const year2 = endDate.getFullYear();
        const month2 = String(endDate.getMonth() + 1).padStart(2, '0');
        const day2 = String(endDate.getDate()).padStart(2, '0');
        const endStr = `${year2}-${month2}-${day2}`;
        
        segments.push({ start: startStr, end: endStr });
    }
    
    return segments;
}

// Generate random color
function getRandomColor() {
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#4facfe', 
        '#43e97b', '#fa709a', '#fee140', '#30cfd0',
        '#a8edea', '#ff6b6b', '#4ecdc4', '#45b7d1',
        '#96ceb4', '#ffeaa7', '#dfe6e9', '#74b9ff'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Calculate text color based on background color brightness
function getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    
    // Calculate relative luminance using the formula from WCAG
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Update dependency dropdowns
function updateDependencyDropdowns() {
    const activityItems = document.querySelectorAll('.activity-item');
    
    activityItems.forEach(item => {
        const currentId = item.dataset.id;
        const select = item.querySelector('.activity-dependency');
        const currentValue = select.value;
        
        // Clear and rebuild options
        select.innerHTML = '<option value="">None</option>';
        
        activityItems.forEach(otherItem => {
            const otherId = otherItem.dataset.id;
            if (otherId !== currentId) {
                const otherName = otherItem.querySelector('.activity-name').value || `Activity ${otherId}`;
                const option = document.createElement('option');
                option.value = otherId;
                option.textContent = otherName;
                select.appendChild(option);
            }
        });
        
        // Restore previous selection if still valid
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// Add activity button
document.getElementById('addActivity').addEventListener('click', () => {
    const container = document.getElementById('activitiesContainer');
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.dataset.id = activityIdCounter++;
    
    const randomColor = getRandomColor();
    
    activityItem.innerHTML = `
        <input type="text" class="activity-name" placeholder="Activity Name" onchange="updateDependencyDropdowns()">
        <div class="form-group">
            <label>Working Days:</label>
            <input type="number" class="activity-workdays" placeholder="5" value="5" min="1">
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
        <div class="color-picker-group">
            <label>Color:</label>
            <input type="color" class="activity-color" value="${randomColor}">
        </div>
        <button class="remove-activity" onclick="removeActivity(this)">Remove</button>
    `;
    
    container.appendChild(activityItem);
    updateDependencyDropdowns();
    
    // Show custom start date field by default (no dependency)
    const customStartDiv = activityItem.querySelector('.custom-start-date');
    customStartDiv.style.display = 'block';
});

// Remove activity function
function removeActivity(button) {
    const activityItem = button.closest('.activity-item');
    activityItem.remove();
    updateDependencyDropdowns();
}

// Calculate dates based on dependencies and working days
function calculateActivityDates(activities, projectStart) {
    const activityMap = new Map();
    activities.forEach(act => activityMap.set(act.id, act));
    
    // Calculate dates for each activity
    activities.forEach(activity => {
        if (activity.dependsOn) {
            const dependency = activityMap.get(activity.dependsOn);
            if (dependency) {
                // Start this activity the next working day after the dependency ends
                activity.start = getNextWorkingDay(dependency.end);
            }
        } else {
            // If no dependency, use custom start date or fall back to project start date
            // Make sure the start date is a working day (not weekend)
            const startDate = activity.customStart || projectStart;
            activity.start = ensureWorkingDay(startDate);
        }
        
        // Calculate end date based on working days
        activity.end = calculateEndDate(activity.start, activity.workingDays);
    });
    
    return activities;
}

// Calculate project end date based on all activities
function calculateProjectEndDate(activities) {
    if (activities.length === 0) return null;
    
    let maxEndDate = new Date(activities[0].end);
    activities.forEach(activity => {
        const endDate = new Date(activity.end);
        if (endDate > maxEndDate) {
            maxEndDate = endDate;
        }
    });
    
    // Add a week buffer for visualization
    maxEndDate.setDate(maxEndDate.getDate() + 7);
    return maxEndDate.toISOString().split('T')[0];
}

// Generate timeline button
document.getElementById('generateTimeline').addEventListener('click', () => {
    const projectName = document.getElementById('projectName').value;
    const projectStart = document.getElementById('projectStart').value;
    
    if (!projectName || !projectStart) {
        alert('Please fill in project name and start date');
        return;
    }
    
    // Collect activities
    const activities = [];
    const activityItems = document.querySelectorAll('.activity-item');
    
    activityItems.forEach((item) => {
        const name = item.querySelector('.activity-name').value;
        const workingDays = parseInt(item.querySelector('.activity-workdays').value) || 5;
        const color = item.querySelector('.activity-color').value;
        const dependsOn = item.querySelector('.activity-dependency').value;
        const customStart = item.querySelector('.activity-custom-start').value;
        const id = item.dataset.id;
        
        if (name && workingDays > 0) {
            activities.push({ 
                id, 
                name, 
                workingDays,
                color, 
                dependsOn: dependsOn || null,
                customStart: customStart || null,
                start: null,
                end: null
            });
        }
    });
    
    if (activities.length === 0) {
        alert('Please add at least one activity with a name and working days');
        return;
    }
    
    // Calculate dates for all activities
    const updatedActivities = calculateActivityDates(activities, projectStart);
    
    // Calculate project end date
    const projectEnd = calculateProjectEndDate(updatedActivities);
    
    // Render chart
    renderGanttChart(projectName, projectStart, projectEnd, updatedActivities);
});

// D3.js Gantt Chart Rendering
function renderGanttChart(projectName, projectStart, projectEnd, activities) {
    const container = document.getElementById('ganttChart');
    container.innerHTML = '';
    
    // Set up dimensions
    const margin = { top: 60, right: 40, bottom: 60, left: 200 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = Math.max(400, activities.length * 60 + 100);
    
    // Create SVG
    const svg = d3.select('#ganttChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const formatDate = d3.timeFormat('%Y-%m-%d');
    
    const minDate = parseDate(projectStart);
    const maxDate = parseDate(projectEnd);
    
    // Scales
    const xScale = d3.scaleTime()
        .domain([minDate, maxDate])
        .range([0, width]);
    
    const yScale = d3.scaleBand()
        .domain(activities.map((d, i) => i))
        .range([0, activities.length * 60])
        .padding(0.2);
    
    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -30)
        .attr('text-anchor', 'middle')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .text(projectName);
    
    // Add grid lines for weekdays
    const xAxis = d3.axisBottom(xScale)
        .ticks(d3.timeWeek.every(1))
        .tickFormat(d3.timeFormat('%m/%d'));
    
    const xAxisGrid = d3.axisBottom(xScale)
        .ticks(d3.timeDay.every(1))
        .tickSize(-activities.length * 60)
        .tickFormat('');
    
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${activities.length * 60})`)
        .call(xAxisGrid);
    
    // Generate time range for weekends highlighting
    const timeRange = d3.timeDay.range(minDate, maxDate);
    
    // Highlight weekends with clearer visual (group Saturday and Sunday together)
    timeRange.forEach(date => {
        if (date.getDay() === 6) { // Saturday
            const sunday = new Date(date);
            sunday.setDate(sunday.getDate() + 1);
            const monday = new Date(date);
            monday.setDate(monday.getDate() + 2);
            
            // Draw rectangle covering both Saturday and Sunday
            svg.append('rect')
                .attr('x', xScale(date))
                .attr('y', 0)
                .attr('width', xScale(monday) - xScale(date))
                .attr('height', activities.length * 60)
                .attr('fill', '#e8e8e8')
                .attr('opacity', 0.7);
            
            // Add "Weekend" label centered on the weekend block
            svg.append('text')
                .attr('x', xScale(date) + (xScale(monday) - xScale(date)) / 2)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('fill', '#999')
                .style('font-style', 'italic')
                .text('Weekend');
        }
    });
    
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${activities.length * 60})`)
        .call(xAxis);
    
    // Draw activities
    const bars = svg.selectAll('.bar')
        .data(activities)
        .enter()
        .append('g')
        .attr('class', 'activity-bar');
    
    // Activity labels (left side)
    bars.append('text')
        .attr('x', -10)
        .attr('y', (d, i) => yScale(i) + yScale.bandwidth() / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '500')
        .text(d => d.name);
    
    // Activity bars - split by weekends
    bars.each(function(d, i) {
        const barGroup = d3.select(this);
        const segments = getWeekdaySegments(d.start, d.end);
        const oneDayWidth = (xScale(d3.timeDay.offset(minDate, 1)) - xScale(minDate));
        
        // Draw each segment
        segments.forEach(segment => {
            const segmentStart = parseDate(segment.start);
            const segmentEnd = parseDate(segment.end);
            
            // Calculate number of days in this segment (inclusive)
            let daysInSegment = 0;
            const tempDate = new Date(segmentStart);
            while (tempDate <= segmentEnd) {
                if (!isWeekend(tempDate)) {
                    daysInSegment++;
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }
            
            barGroup.append('rect')
                .attr('x', xScale(segmentStart))
                .attr('y', yScale(i))
                .attr('width', daysInSegment * oneDayWidth)
                .attr('height', yScale.bandwidth())
                .attr('fill', d.color)
                .attr('rx', 4)
                .attr('ry', 4)
                .style('opacity', 0.8);
        });
    });
    
    // Date and working days labels on bars with contrast color
    bars.append('text')
        .attr('class', 'date-text')
        .attr('x', d => xScale(parseDate(d.start)) + 5)
        .attr('y', (d, i) => yScale(i) + yScale.bandwidth() / 2 - 8)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('fill', d => getContrastColor(d.color))
        .style('font-weight', 'bold')
        .style('pointer-events', 'none')
        .text(d => `${d.workingDays} working days`);
    
    bars.append('text')
        .attr('class', 'date-range-text')
        .attr('x', d => xScale(parseDate(d.start)) + 5)
        .attr('y', (d, i) => yScale(i) + yScale.bandwidth() / 2 + 8)
        .attr('dominant-baseline', 'middle')
        .style('font-size', '10px')
        .style('fill', d => getContrastColor(d.color))
        .style('pointer-events', 'none')
        .text(d => `${d.start} → ${d.end}`);
    
    ganttChart = { activities, svg, xScale, yScale, parseDate, formatDate };
}

// Toggle custom start date field visibility based on dependency selection
function toggleStartDateField(selectElement) {
    const activityItem = selectElement.closest('.activity-item');
    const customStartDiv = activityItem.querySelector('.custom-start-date');
    
    if (selectElement.value === '') {
        // No dependency selected - show custom start date
        customStartDiv.style.display = 'block';
    } else {
        // Dependency selected - hide custom start date
        customStartDiv.style.display = 'none';
        // Clear the custom start date value
        activityItem.querySelector('.activity-custom-start').value = '';
    }
}

// Initialize visibility of custom start date fields on page load
document.addEventListener('DOMContentLoaded', () => {
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
        const dependencySelect = item.querySelector('.activity-dependency');
        toggleStartDateField(dependencySelect);
    });
});

// Make functions available globally
window.removeActivity = removeActivity;
window.updateDependencyDropdowns = updateDependencyDropdowns;
window.toggleStartDateField = toggleStartDateField;

// --- Save / Load ---

function collectProjectData() {
    const projectName = document.getElementById('projectName').value;
    const projectStart = document.getElementById('projectStart').value;

    const activities = [];
    document.querySelectorAll('.activity-item').forEach(item => {
        activities.push({
            id: item.dataset.id,
            name: item.querySelector('.activity-name').value,
            workingDays: item.querySelector('.activity-workdays').value,
            dependsOn: item.querySelector('.activity-dependency').value,
            customStart: item.querySelector('.activity-custom-start').value,
            color: item.querySelector('.activity-color').value,
        });
    });

    return { projectName, projectStart, activities };
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

function restoreProjectData(data) {
    document.getElementById('projectName').value = data.projectName || '';
    document.getElementById('projectStart').value = data.projectStart || '';

    const container = document.getElementById('activitiesContainer');
    container.innerHTML = '';
    activityIdCounter = 0;

    // First pass: create all activity items so dependency dropdowns can reference them
    data.activities.forEach(act => {
        const id = act.id ?? activityIdCounter;
        if (Number(id) >= activityIdCounter) activityIdCounter = Number(id) + 1;

        const item = document.createElement('div');
        item.className = 'activity-item';
        item.dataset.id = id;
        item.innerHTML = `
            <input type="text" class="activity-name" placeholder="Activity Name" value="${escapeHtml(act.name || '')}" onchange="updateDependencyDropdowns()">
            <div class="form-group">
                <label>Working Days:</label>
                <input type="number" class="activity-workdays" placeholder="5" value="${Number(act.workingDays) || 5}" min="1">
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
            <div class="color-picker-group">
                <label>Color:</label>
                <input type="color" class="activity-color" value="${escapeHtml(act.color || '#667eea')}">
            </div>
            <button class="remove-activity" onclick="removeActivity(this)">Remove</button>
        `;
        container.appendChild(item);
    });

    // Second pass: rebuild dropdowns and restore dependency selections
    updateDependencyDropdowns();
    data.activities.forEach(act => {
        const item = container.querySelector(`.activity-item[data-id="${act.id}"]`);
        if (!item) return;
        const select = item.querySelector('.activity-dependency');
        if (act.dependsOn) select.value = act.dependsOn;
        toggleStartDateField(select);
    });

    // Auto-generate the chart after restoring
    document.getElementById('generateTimeline').click();
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

document.getElementById('saveProject').addEventListener('click', saveProject);
document.getElementById('loadProjectInput').addEventListener('change', (e) => {
    loadProject(e.target.files[0]);
    e.target.value = ''; // reset so the same file can be loaded again
});
