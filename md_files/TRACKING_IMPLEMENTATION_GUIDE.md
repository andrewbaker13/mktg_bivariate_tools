# Tracking Implementation Guide

**Last Updated:** January 28, 2026

This guide covers how to implement user engagement tracking in drbakermarketing.com tools.

---

## Quick Reference

### Function Signatures

```javascript
// Log a tool run (main analysis)
logToolUsage(toolSlug, params, resultSummary, options)

// Log feature interactions (exports, help, etc.)
logFeatureUsage(toolSlug, featureType, metadata, toolRunId)

// Engagement milestone helpers
initEngagementTracking(toolSlug)    // Start session tracking
markScenarioLoaded(scenarioName)    // User loaded a scenario
markDataUploaded(fileName)          // User uploaded their own data
markRunAttempted()                  // User clicked run/analyze
markRunSuccessful(params, summary)  // Analysis completed successfully
```

### Engagement Milestones

| Milestone | Slug Suffix | Requirements |
|-----------|-------------|--------------|
| BasicEngagement | `{tool}-basic-engagement` | Scenario + Run + Success + 5 min |
| AdvancedEngagement | `{tool}-advanced-engagement` | Upload + Run + Success + 5 min |
| Tutorial Complete | `{tool}-tutorial-complete` | Finish all Professor Mode steps |

---

## How Engagement Tracking Works

### Flow Diagram

```
User loads tool
    ↓
initEngagementTracking(TOOL_SLUG) → Timer starts
    ↓
User selects scenario OR uploads file
    ↓
markScenarioLoaded() OR markDataUploaded()
    ↓
User clicks Run/Analyze
    ↓
markRunAttempted()
    ↓
Analysis succeeds
    ↓
markRunSuccessful(params, summary)
    ↓
[Every 30 seconds: checkEngagementMilestones()]
    ↓
At 5 minutes with all conditions met:
    → logToolUsage('{tool}-basic-engagement', ...)
    OR
    → logToolUsage('{tool}-advanced-engagement', ...)
```

### Session State Object

```javascript
engagementMilestones = {
    scenario_loaded: false,   // Set by markScenarioLoaded()
    data_uploaded: false,     // Set by markDataUploaded()
    run_attempted: false,     // Set by markRunAttempted()
    run_successful: false,    // Set by markRunSuccessful()
    basic_logged: false,      // Prevents duplicate BasicEngagement
    advanced_logged: false    // Prevents duplicate AdvancedEngagement
}
```

---

## Implementation Patterns

### Pattern 1: Auto-Run Tools (instant results)

Tools that calculate immediately when data loads (Pearson, t-test, ANOVA, etc.)

```javascript
const TOOL_SLUG = 'your-tool-slug';

// Debouncing to prevent spam during initial renders
let renderCount = 0;
let lastTrackTime = 0;

function runCalculation() {
    // ... calculation logic ...
    
    // Track after results computed
    renderCount++;
    const now = Date.now();
    if (renderCount > 1 && (now - lastTrackTime) > 500) {
        lastTrackTime = now;
        if (typeof markRunAttempted === 'function') markRunAttempted();
        if (typeof markRunSuccessful === 'function') {
            markRunSuccessful({
                n: data.length,
                result: calculatedValue
            }, `Result: ${calculatedValue.toFixed(3)}`);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initEngagementTracking === 'function') {
        initEngagementTracking(TOOL_SLUG);
    }
});
```

### Pattern 2: Button-Run Tools (explicit Run button)

Tools with a "Run Model" or "Analyze" button (ARIMAX, K-Means, Conjoint, etc.)

```javascript
const TOOL_SLUG = 'your-tool-slug';

// In your run button handler
async function runAnalysis() {
    if (typeof markRunAttempted === 'function') {
        markRunAttempted();
    }
    
    try {
        const results = await performAnalysis();
        
        if (typeof markRunSuccessful === 'function') {
            markRunSuccessful({
                param1: value1,
                param2: value2
            }, `Analysis complete: ${results.summary}`);
        }
    } catch (error) {
        console.error('Analysis failed:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initEngagementTracking === 'function') {
        initEngagementTracking(TOOL_SLUG);
    }
});
```

### Scenario Loading

```javascript
function loadScenario(scenarioId) {
    const scenario = scenarios.find(s => s.id === scenarioId);
    
    // Track scenario load
    if (typeof markScenarioLoaded === 'function') {
        markScenarioLoaded(scenario.label);
    }
    
    // ... load scenario data ...
}
```

### File Upload

```javascript
function handleFileUpload(file) {
    // Track upload BEFORE processing
    if (typeof markDataUploaded === 'function') {
        markDataUploaded(file.name);
    }
    
    // ... parse and load file ...
}
```

---

## Feature Tracking

Track specific user interactions beyond the main analysis.

### Available Feature Types

```javascript
'export_chart'          // Exported a chart/graph
'export_data'           // Downloaded CSV/Excel
'copy_results'          // Copied to clipboard
'toggle_advanced'       // Opened advanced options
'view_help'             // Clicked help/documentation
'view_interpretation'   // Viewed interpretation guide
'change_confidence'     // Changed confidence level
'download_report'       // Downloaded full report
'reset_tool'            // Reset to defaults
'other'                 // Custom (describe in metadata)
```

### Examples

```javascript
// Export chart
exportChartBtn.addEventListener('click', async () => {
    chart.save('png');
    await logFeatureUsage(TOOL_SLUG, 'export_chart', { format: 'png' });
});

// Export data
exportDataBtn.addEventListener('click', async () => {
    downloadCSV(data);
    await logFeatureUsage(TOOL_SLUG, 'export_data', { 
        format: 'csv', 
        rows: data.length 
    });
});

// Help button
helpBtn.addEventListener('click', async () => {
    showHelpModal();
    await logFeatureUsage(TOOL_SLUG, 'view_help');
});

// Confidence level change
confidenceSelect.addEventListener('change', async (e) => {
    await logFeatureUsage(TOOL_SLUG, 'change_confidence', {
        level: e.target.value
    });
});
```

---

## Tutorial Completion Tracking

For tools with Professor Mode tutorials.

### Implementation

```javascript
const Tutorial = {
    tutorialStartTime: null,
    tutorialCompleted: false,
    
    start() {
        this.tutorialStartTime = Date.now();
        this.tutorialCompleted = false;
        // ... start tutorial ...
    },
    
    logTutorialCompletion() {
        if (this.tutorialCompleted) return;
        if (typeof logToolUsage !== 'function') return;
        if (typeof isAuthenticated === 'function' && !isAuthenticated()) return;
        
        const durationMinutes = this.tutorialStartTime 
            ? ((Date.now() - this.tutorialStartTime) / 60000).toFixed(1)
            : null;
        
        logToolUsage(TOOL_SLUG + '-tutorial-complete', {
            steps_completed: this.steps.length,
            total_steps: this.steps.length,
            duration_minutes: parseFloat(durationMinutes) || null
        }, `Tutorial completed in ${durationMinutes} minutes`, {
            scenario: 'Tutorial Scenario',
            dataSource: 'scenario'
        });
        
        this.tutorialCompleted = true;
        console.log('🎓 Tutorial completion logged!');
    }
};

// Call in final step's onEnter:
onEnter: () => {
    Tutorial.logTutorialCompletion();
}
```

---

## Console Debugging

```javascript
// Check tracking state
console.log('Tool:', TOOL_SLUG);
console.log('Duration:', getSessionDurationMinutes(), 'minutes');
console.log('Milestones:', engagementMilestones);
console.log('Scenario:', currentScenario);
console.log('Data source:', currentDataSource);

// Check auth status
console.log('Authenticated:', isAuthenticated());
console.log('Username:', getCurrentUsername());

// Manually trigger events (testing only)
markScenarioLoaded('Test Scenario');
markDataUploaded('test.csv');
markRunAttempted();
markRunSuccessful({n: 50}, 'Test result');

// Force milestone check
checkEngagementMilestones(TOOL_SLUG);
```

### Speed Up Testing

In `auth_tracking.js`, change the milestone threshold:

```javascript
// Change 5 minutes to 6 seconds for testing
if (duration >= 0.1 &&  // Was: duration >= 5
```

---

## Current Implementation Status

### Tools with Engagement Tracking (25/28)

All existing tools have BasicEngagement and AdvancedEngagement tracking implemented.

**Tools that don't exist yet:**
- Word Cloud Generator
- Effect Size Calculator

### Tools with Tutorial Tracking (1)

| Tool | Tutorial Tracking |
|------|-------------------|
| ARIMAX/SARIMAX | ✅ `arimax-tutorial-complete` |

*More tools will get Professor Mode tutorials over time.*

---

## Backend API Reference

See `drbaker_backend/md_files_other/USAGE_TRACKING_GUIDE.md` for:
- API endpoint documentation
- PowerShell test commands
- Backend data models
- Analytics endpoints

---

## HTML Setup

Every tool needs these scripts in the HTML:

```html
<!-- In tool's HTML, before your app script -->
<script src="../../../shared/js/auth_tracking.js"></script>
```

This provides all tracking functions globally.
