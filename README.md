# ez-gantt

An interactive project management tool that helps Project Managers build Gantt chart timelines with automatic working day calculations, dependency management, and visual timeline rendering.

## Features

- **Working Days Only**: Automatically calculates timelines using Monday-Friday only (weekends excluded)
- **Activity-Based Planning**: Define activities by working days count - end dates are calculated automatically
- **Smart Dependencies**: Activities can depend on each other, use custom start dates, or default to project start
- **Milestone Markers**: Mark activities as milestones with customizable emoji/character indicators displayed on the chart
- **Today Indicator**: Red dashed vertical line automatically shows current day on the timeline
- **Weekend-Split Visualization**: Activity bars are visually split across weekends with gaps for Saturday/Sunday
- **Color Coding**: Each activity has a customizable color with automatic text contrast for readability
- **Weekend Highlighting**: Clear visual distinction of weekend columns (gray background)
- **Clean Interface**: No dependency arrows - streamlined, uncluttered Gantt chart view
- **Friday→Monday Logic**: When activities end on Friday, dependent tasks automatically start on Monday
- **Project Management**: Save and load projects, or start fresh with the "New project" button

## Technology Stack

- **Frontend**: Vanilla JavaScript with D3.js for interactive visualizations
- **Date Handling**: Custom working day calculation engine

## Usage

1. Open `index.html` in your browser, or visit the [GitHub Pages site](https://thiagosanches.github.io/ez-gantt/)

2. Create your project:
   - Set project name and start date
   - Add activities with name, working days count, and color
   - Mark important activities as milestones with custom emoji/character indicators
   - Define dependencies between activities or set custom start dates
   - Click "Generate Gantt Chart" to visualize your timeline with today's date highlighted
   - Save your project for later or start a new one with the "New project" button

## How It Works

### Working Days Calculation
- Activities are defined by working days count (not end dates)
- System automatically skips weekends when calculating dates
- If an activity ends on Friday, dependent activities start on Monday
- Each working day equals exactly one column width in the chart

### Activity Dependencies
- Activities can depend on previous activities (start after predecessor ends)
- Activities without dependencies can use custom start dates
- Activities default to project start date if no dependency or custom date is set

### Visual Design
- Activity bars split across weekends (e.g., Wed-Fri, gap, Mon-Tue)
- Text color automatically adjusts for contrast (black on light, white on dark)
- Weekend columns highlighted in gray
- Color picker for each activity with random color generation
- Today's date marked with a red dashed vertical line and label
- Milestone activities show custom emoji/character markers (default: ⭐) at 28px size

## Project Structure

```
ez-gantt/
├── index.html          # Main UI with form inputs
├── styles.css          # Styling with gradient theme
└── app.js              # Core application logic
```

## Key Functions

### Date Calculations (`app.js`)
- `isWeekend(date)` - Check if date is Saturday or Sunday
- `calculateEndDate(start, workingDays)` - Compute end date excluding weekends
- `getNextWorkingDay(date)` - Find next weekday after a date
- `ensureWorkingDay(date)` - Move weekend dates to Monday
- `getWeekdaySegments(start, end)` - Split activity into segments around weekends

### Visualization (`app.js`)
- `renderGanttChart()` - D3.js chart rendering with split bars
- `getContrastColor(bgColor)` - Calculate readable text color using WCAG luminance formula
- Activity bars rendered as separate segments with gaps for weekends
- Today marker rendered as red dashed line when current date falls within project timeline
- Milestone markers rendered at 28px size after activity end dates

## Requirements Fulfilled

- ✅ Build simple timeline given name, start date and working days
- ✅ Build timelines with different activities separated by color blocks
- ✅ Automatic working day calculations (excludes weekends)
- ✅ Dependency management between activities
- ✅ Interactive D3.js visualization
- ✅ Weekend-aware scheduling and visual representation
- ✅ Milestone tracking with customizable emoji/character indicators
- ✅ Today's date visualization on timeline
- ✅ Project save/load functionality
- ✅ Week numbering with proper Sunday-Saturday boundaries

