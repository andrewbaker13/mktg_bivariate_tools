---
name: Add User Engagement Tracking
description: Implement comprehensive usage tracking with engagement milestones for statistical tools
---

# Add User Engagement Tracking to Tool

Implement user engagement tracking to monitor how students interact with a statistical tool. This includes tracking tool runs, feature usage, engagement milestones (5-minute thresholds), and tutorial completion.

## What Gets Tracked

1. **Tool Runs** - Main analysis executions with parameters and results
2. **Feature Usage** - Exports, help views, option changes
3. **Engagement Milestones** - BasicEngagement (scenario-based) and AdvancedEngagement (upload-based) at 5 minutes
4. **Tutorial Completion** - Professor Mode tutorial finished

## Prerequisites

Ensure the tool's HTML includes the tracking script:

```html
<!-- Before your main tool script -->
<script src="../../../shared/js/auth_tracking.js"></script>
```

This provides all tracking functions globally (no imports needed).

## Quick Reference: Available Functions

```javascript
// Core tracking
logToolUsage(toolSlug, params, resultSummary, options)
logFeatureUsage(toolSlug, featureType, metadata, toolRunId)

// Engagement milestone helpers
initEngagementTracking(toolSlug)    // Initialize session timer
markScenarioLoaded(scenarioName)    // User loaded a scenario
markDataUploaded(fileName)          // User uploaded their own data
markRunAttempted()                  // User clicked run/analyze
markRunSuccessful(params, summary)  // Analysis completed successfully

// Helper functions
isAuthenticated()                   // Check if user is logged in
getCurrentUsername()                // Get current username
getSessionDurationMinutes()         // Get time elapsed since init
```

## Engagement Milestones

| Milestone | Slug Format | Requirements |
|-----------|-------------|--------------|
| BasicEngagement | `{tool}-basic-engagement` | Scenario loaded + Run attempted + Run successful + 5 minutes elapsed |
| AdvancedEngagement | `{tool}-advanced-engagement` | Data uploaded + Run attempted + Run successful + 5 minutes elapsed |
| Tutorial Complete | `{tool}-tutorial-complete` | All Professor Mode steps completed |

**Note:** Milestones are checked automatically every 30 seconds. They only log once per session (duplicates prevented).

## Flow Diagram

```
User loads tool
    ↓
initEngagementTracking(TOOL_SLUG) → Timer starts
    ↓
User selects scenario OR uploads file
    ↓
markScenarioLoaded() OR markDataUploaded()
    ↓
User clicks Run/Analyze (or auto-runs)
    ↓
markRunAttempted()
    ↓
Analysis succeeds
    ↓
markRunSuccessful(params, summary)
    ↓
[Every 30 seconds: checkEngagementMilestones() runs automatically]
    ↓
At 5 minutes with all conditions met:
    → logToolUsage('{tool}-basic-engagement', ...) OR
    → logToolUsage('{tool}-advanced-engagement', ...)
```

## Implementation Pattern 1: Auto-Run Tools

Tools that calculate immediately when data changes (Pearson correlation, t-test, ANOVA, descriptive stats, etc.)

### Challenge
Auto-run tools recalculate on every data change, which could spam tracking. Use debouncing.

### Solution

```javascript
const TOOL_SLUG = 'pearson-correlation';  // Use your tool's slug

// Debouncing variables
let renderCount = 0;
let lastTrackTime = 0;

function calculateResults() {
    // ... your calculation logic ...
    
    // Update visualizations
    updateCharts();
    updateStatistics();
    
    // Track execution (with debouncing)
    renderCount++;
    const now = Date.now();
    
    // Only track after first render (skip initialization) 
    // and if 500ms has passed since last track
    if (renderCount > 1 && (now - lastTrackTime) > 500) {
        lastTrackTime = now;
        
        if (typeof markRunAttempted === 'function') {
            markRunAttempted();
        }
        
        if (typeof markRunSuccessful === 'function') {
            markRunSuccessful({
                n: data.length,
                variable1: selectedVar1,
                variable2: selectedVar2,
                correlation: rValue
            }, `r = ${rValue.toFixed(3)}, p = ${formatP(pValue)}`);
        }
    }
}

// Initialize tracking on page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initEngagementTracking === 'function') {
        initEngagementTracking(TOOL_SLUG);
    }
});
```

**Key Points:**
- `renderCount > 1` skips the initial page load calculation
- `500ms` debounce prevents spam during rapid changes
- Always check `typeof function === 'function'` for safety

## Implementation Pattern 2: Button-Run Tools

Tools with explicit "Run Analysis" or "Analyze" button (ARIMAX, K-Means, Logistic Regression, etc.)

### Challenge
Clear user action (button click) makes tracking straightforward.

### Solution

```javascript
const TOOL_SLUG = 'k-means-clustering';  // Use your tool's slug

// Run button handler
async function runAnalysis() {
    // Mark attempt immediately when button clicked
    if (typeof markRunAttempted === 'function') {
        markRunAttempted();
    }
    
    // Show loading state
    showLoadingSpinner();
    
    try {
        // Perform analysis
        const model = fitModel();
        const results = generateResults(model);
        
        // Display results
        displayResults(results);
        
        // Mark successful completion
        if (typeof markRunSuccessful === 'function') {
            markRunSuccessful({
                k: selectedK,
                n_samples: data.length,
                n_features: features.length,
                iterations: model.iterations
            }, `K-means with k=${selectedK}, converged in ${model.iterations} iterations`);
        }
        
    } catch (error) {
        console.error('Analysis failed:', error);
        showErrorMessage(error.message);
        // Note: Do NOT call markRunSuccessful on error
    } finally {
        hideLoadingSpinner();
    }
}

// Initialize tracking on page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initEngagementTracking === 'function') {
        initEngagementTracking(TOOL_SLUG);
    }
});
```

**Key Points:**
- Call `markRunAttempted()` BEFORE try block (always track attempts)
- Call `markRunSuccessful()` only on success (inside try block)
- Don't track success if analysis throws error

## Scenario Loading

Track when users select a pre-built scenario.

```javascript
function loadScenario(scenarioId) {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    // Track scenario load FIRST
    if (typeof markScenarioLoaded === 'function') {
        markScenarioLoaded(scenario.label);
    }
    
    // Then load scenario data
    currentData = scenario.data;
    populateUI();
    
    // For auto-run tools, results will trigger markRunSuccessful
    // For button-run tools, user will click Run next
}

// Hook up to scenario selector
scenarioSelect.addEventListener('change', (e) => {
    if (e.target.value) {
        loadScenario(e.target.value);
    }
});
```

## File Upload

Track when users upload their own data.

```javascript
function handleFileUpload(file) {
    // Track upload BEFORE parsing/processing
    if (typeof markDataUploaded === 'function') {
        markDataUploaded(file.name);
    }
    
    // Parse file
    const reader = new FileReader();
    reader.onload = (e) => {
        const csvText = e.target.result;
        const parsedData = parseCSV(csvText);
        
        // Load data
        currentData = parsedData;
        populateUI();
        
        // For auto-run tools, results will trigger markRunSuccessful
        // For button-run tools, user will click Run next
    };
    reader.readAsText(file);
}

// Hook up to file input
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});
```

**Important:** Track upload BEFORE processing so it's captured even if parsing fails.

## Feature Tracking

Track specific user interactions beyond the main analysis.

### Available Feature Types

| Feature Type | When to Use |
|--------------|-------------|
| `export_chart` | User exports/downloads a chart or graph |
| `export_data` | User downloads CSV, Excel, or data file |
| `copy_results` | User copies text to clipboard |
| `toggle_advanced` | User opens advanced options panel |
| `view_help` | User clicks help button or opens documentation |
| `view_interpretation` | User views statistical interpretation guide |
| `change_confidence` | User changes confidence level (90%, 95%, 99%) |
| `download_report` | User downloads comprehensive report |
| `reset_tool` | User resets tool to default state |
| `other` | Custom feature (describe in metadata) |

### Implementation Examples

```javascript
// Export chart as PNG
exportChartBtn.addEventListener('click', async () => {
    chart.save('png');  // Your chart library's save method
    
    await logFeatureUsage(TOOL_SLUG, 'export_chart', { 
        format: 'png',
        chart_type: 'scatter'
    });
});

// Export data as CSV
exportDataBtn.addEventListener('click', async () => {
    downloadCSV(resultsData, 'results.csv');
    
    await logFeatureUsage(TOOL_SLUG, 'export_data', { 
        format: 'csv', 
        rows: resultsData.length,
        columns: Object.keys(resultsData[0]).length
    });
});

// Copy results to clipboard
copyResultsBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(resultsText);
    
    await logFeatureUsage(TOOL_SLUG, 'copy_results', {
        content_type: 'statistics_summary'
    });
});

// View help modal
helpBtn.addEventListener('click', async () => {
    showHelpModal();
    
    await logFeatureUsage(TOOL_SLUG, 'view_help');
});

// Change confidence level
confidenceSelect.addEventListener('change', async (e) => {
    recalculateWithConfidence(e.target.value);
    
    await logFeatureUsage(TOOL_SLUG, 'change_confidence', {
        level: e.target.value,
        previous_level: previousConfidence
    });
});

// Toggle advanced options
advancedToggle.addEventListener('click', async () => {
    const isOpen = advancedPanel.classList.toggle('open');
    
    await logFeatureUsage(TOOL_SLUG, 'toggle_advanced', {
        action: isOpen ? 'opened' : 'closed'
    });
});
```

**Best Practices:**
- Keep metadata concise but informative
- Use consistent property names across tools
- Always `await` logFeatureUsage (it's async)
- Don't over-track (e.g., every hover or scroll)

## Tutorial Completion Tracking

For tools with Professor Mode tutorials, track when students complete all steps.

### Implementation

Add this to your tutorial object (typically in `tool_tutorial.js`):

```javascript
const ToolNameTutorial = {
    tutorialStartTime: null,
    tutorialCompleted: false,
    
    start() {
        this.isActive = true;
        this.tutorialStartTime = Date.now();
        this.tutorialCompleted = false;
        // ... rest of start logic ...
    },
    
    logTutorialCompletion() {
        // Prevent duplicate logging
        if (this.tutorialCompleted) return;
        
        // Check if tracking function exists
        if (typeof logToolUsage !== 'function') {
            console.log('⚠️ Tutorial completed, but tracking not available');
            return;
        }
        
        // Only track for authenticated users
        if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
            console.log('Tutorial completed (not logged in)');
            return;
        }
        
        // Calculate duration
        const durationMinutes = this.tutorialStartTime 
            ? ((Date.now() - this.tutorialStartTime) / 60000).toFixed(1)
            : null;
        
        // Log completion
        logToolUsage(
            TOOL_SLUG + '-tutorial-complete',
            {
                steps_completed: this.steps.length,
                total_steps: this.steps.length,
                duration_minutes: parseFloat(durationMinutes) || null
            },
            `Tutorial completed in ${durationMinutes} minutes`,
            {
                scenario: 'Tutorial Scenario',
                dataSource: 'scenario'
            }
        );
        
        this.tutorialCompleted = true;
        console.log('🎓 Tutorial completion logged!');
    },
    
    steps: [
        // ... your tutorial steps ...
        {
            id: 'final-step',
            title: 'Congratulations!',
            content: `<p>You've completed the tutorial!</p>`,
            onEnter: () => {
                // Log completion when user reaches final step
                this.logTutorialCompletion();
            }
        }
    ]
};
```

**Key Points:**
- Track completion in the `onEnter()` of the final step
- Prevent duplicate logging with `tutorialCompleted` flag
- Include duration and step count in parameters
- Use slug format: `{tool-slug}-tutorial-complete`

## Debugging & Testing

### Check Tracking State

```javascript
// In browser console:

// Check basic info
console.log('Tool:', TOOL_SLUG);
console.log('Authenticated:', isAuthenticated());
console.log('Username:', getCurrentUsername());

// Check engagement state
console.log('Session duration:', getSessionDurationMinutes(), 'minutes');
console.log('Milestones:', engagementMilestones);

// Check what's been marked
console.log('Scenario loaded:', engagementMilestones.scenario_loaded);
console.log('Data uploaded:', engagementMilestones.data_uploaded);
console.log('Run attempted:', engagementMilestones.run_attempted);
console.log('Run successful:', engagementMilestones.run_successful);
```

### Manually Trigger Events (Testing Only)

```javascript
// Test milestone markers
markScenarioLoaded('Test Scenario');
markDataUploaded('test.csv');
markRunAttempted();
markRunSuccessful({n: 50, test: true}, 'Test successful run');

// Force milestone check (normally runs every 30 seconds)
checkEngagementMilestones(TOOL_SLUG);
```

### Speed Up Testing

During development, you can reduce the 5-minute threshold to test milestones faster.

In `shared/js/auth_tracking.js`, temporarily change:

```javascript
// Original (5 minutes)
if (duration >= 5 && ...

// For testing (6 seconds)
if (duration >= 0.1 && ...
```

**⚠️ Remember to revert this before committing!**

## Common Issues & Solutions

### Issue: Milestones Not Logging

**Symptoms:** 5+ minutes passed, all conditions met, but no milestone logged

**Checklist:**
- [ ] Is user logged in? Check `isAuthenticated()`
- [ ] Was `initEngagementTracking(TOOL_SLUG)` called on page load?
- [ ] Was scenario loaded OR data uploaded? Check `engagementMilestones`
- [ ] Was run attempted? Check `engagementMilestones.run_attempted`
- [ ] Was run successful? Check `engagementMilestones.run_successful`
- [ ] Check browser console for errors
- [ ] Verify `auth_tracking.js` is loaded (check Network tab)

### Issue: Duplicate Milestone Logs

**Symptoms:** Same milestone logged multiple times in same session

**Cause:** The `basic_logged` and `advanced_logged` flags aren't working

**Solution:** Check that you're not re-initializing tracking (don't call `initEngagementTracking()` multiple times)

### Issue: Auto-Run Tool Spamming Tracking

**Symptoms:** Hundreds of tracking events logged as user changes inputs

**Cause:** Missing or ineffective debouncing

**Solution:** Implement debouncing pattern from Pattern 1 above (renderCount + time check)

### Issue: Feature Tracking Not Showing Up

**Symptoms:** `logFeatureUsage()` called but nothing in database

**Cause:** Missing `await` or user not authenticated

**Solution:** 
- Always `await logFeatureUsage()` 
- Verify user is logged in
- Check browser Network tab for 401 errors

## Implementation Checklist

### Initial Setup
- [ ] Verify `auth_tracking.js` is included in tool's HTML
- [ ] Define `TOOL_SLUG` constant at top of main JS file
- [ ] Add `initEngagementTracking(TOOL_SLUG)` in DOMContentLoaded

### Core Tracking
- [ ] Add `markRunAttempted()` when analysis starts
- [ ] Add `markRunSuccessful(params, summary)` when analysis completes
- [ ] Include meaningful parameters (sample size, variable names, key results)
- [ ] Write descriptive result summary

### Data Source Tracking
- [ ] Add `markScenarioLoaded(name)` when scenario selected
- [ ] Add `markDataUploaded(fileName)` when file uploaded
- [ ] Ensure one of these is called before first run

### Feature Tracking
- [ ] Add `logFeatureUsage()` to export buttons
- [ ] Add `logFeatureUsage()` to help buttons
- [ ] Add `logFeatureUsage()` to advanced options toggle
- [ ] Add `logFeatureUsage()` for any other notable interactions

### Tutorial Tracking (if applicable)
- [ ] Add `tutorialStartTime` tracking
- [ ] Add `logTutorialCompletion()` method
- [ ] Call completion method in final step's `onEnter()`
- [ ] Use slug format: `{tool-slug}-tutorial-complete`

### Testing
- [ ] Load tool and check console for errors
- [ ] Verify `initEngagementTracking()` executes
- [ ] Test scenario loading (check milestone state)
- [ ] Test file upload (check milestone state)
- [ ] Test analysis execution (verify tracking calls)
- [ ] Wait 5+ minutes and verify milestone logged (or use speed-up hack)
- [ ] Test feature buttons (check Network tab for requests)
- [ ] If tutorial exists, complete it and verify tracking

## Tool Slug Naming Convention

Use kebab-case matching the tool's URL path:

```javascript
// Good examples:
'pearson-correlation'
'independent-t-test'
'one-way-anova'
'k-means-clustering'
'logistic-regression'
'arimax-forecasting'

// Milestone slugs:
'pearson-correlation-basic-engagement'
'pearson-correlation-advanced-engagement'
'logistic-regression-tutorial-complete'
```

## Parameters to Track

Include these in `markRunSuccessful(params, summary)`:

### Common Parameters (Most Tools)
```javascript
{
    n: data.length,                    // Sample size
    variable_x: selectedVarX,          // Variable name(s)
    variable_y: selectedVarY,
    confidence_level: 0.95,            // If applicable
    test_type: 'two-tailed',           // If applicable
}
```

### Statistical Test Results
```javascript
{
    test_statistic: tValue,            // t, F, chi-square, z, etc.
    p_value: pValue,
    effect_size: cohensD,              // If calculated
    significant: pValue < 0.05         // Boolean for easy filtering
}
```

### Model-Based Tools
```javascript
{
    n_predictors: 3,
    model_type: 'linear',
    r_squared: 0.73,
    aic: 245.2,                        // If applicable
    converged: true                     // For iterative methods
}
```

### Clustering/Segmentation
```javascript
{
    n_clusters: 4,
    n_iterations: 12,
    n_features: 5,
    converged: true
}
```

**Best Practice:** Track what would be useful for analytics later (popular settings, typical sample sizes, common workflows).

## Summary Best Practices

1. **Always initialize** - Call `initEngagementTracking(TOOL_SLUG)` on page load
2. **Track data source** - Call either `markScenarioLoaded()` or `markDataUploaded()` 
3. **Track attempts** - Call `markRunAttempted()` when analysis starts
4. **Track success** - Call `markRunSuccessful()` only when analysis succeeds
5. **Debounce auto-run tools** - Use renderCount + time check to prevent spam
6. **Include context** - Pass meaningful parameters and summary text
7. **Feature tracking** - Add to exports, help, and notable interactions
8. **Test thoroughly** - Verify tracking in browser console and Network tab
9. **Check authentication** - Use `typeof` checks for safety
10. **Speed up testing** - Temporarily reduce 5-minute threshold during development

---

## Implementation Status (Last Updated: January 30, 2026)

### ✅ Tools with Complete Tracking

| Category | Tool | Main JS File | TOOL_SLUG |
|----------|------|--------------|-----------|
| advanced | conjoint | `conjoint_app.js` | `conjoint-analysis` |
| advanced | conjoint_creator | `conjoint_creator_app.js` | `conjoint-creator` |
| advanced | neural_network | `playground.js` | `neural-network` |
| advanced | ps_matching | `main_ps_matching.js` | `propensity-score-matching` |
| advanced | resource_allocation | `resource_allocation_app.js` | `resource-allocation` |
| attribution | markov_visualizer | `main_markov.js` | `markov-attribution` |
| attribution | shapley_visualizer | `main_shapley.js` | `shapley-attribution` |
| clustering | kmeans | `main_kmeans.js` | `k-means-clustering` |
| clustering | kprototypes | `main_kprototypes.js` | `k-prototypes-clustering` |
| descriptive | pearson_correlation | `pearson_app.js` | `pearson-correlation` |
| descriptive | univariate_analyzer | `main_univariate_analyzer.js` | `univariate-analyzer` |
| hypothesis_testing | ab_proportion | `main_ab_proportion.js` | `ab-proportion-test` |
| hypothesis_testing | chisquare | `chisquare_app.js` | `chi-square-test` |
| hypothesis_testing | ind_ttest | `ind_ttest_app.js` | `independent-t-test` |
| hypothesis_testing | mcnemar | `mcnemar_app.js` | `mcnemar-test` |
| hypothesis_testing | onewayanova | `onewayanova_app.js` | `one-way-anova` |
| hypothesis_testing | paired_ttest | `paired_ttest_app.js` | `paired-t-test` |
| probability | compound_event_probability | `compound_event_probability.js` | `compound-probability` |
| probability | selection_probability_lab | `selection_probability_lab.js` | `selection-probability` |
| regression | bivariate_regression | `bivariate_app.js` | `bivariate-regression` |
| regression | log_regression | `main_log_regression.js` | `logistic-regression` |
| regression | ml_regression | `main_ml_regression.js` | `multiple-linear-regression` |
| regression | mlr_interactions | `main_mlr_interactions.js` | `mlr-interactions` |
| regression | mn_log_regression | `main_mn_log_regression.js` | `multinomial-logistic` |
| sample_size | sample_size_AB_calculator | `main_sample_size_ab_calculator.js` | `sample-size-ab` |
| sample_size | sample_size_calculator | `main_sample_size_calculator.js` | `sample-size-means` |
| sample_size | sample_size_corr_regression | `main_sample_size_corr_regression.js` | `sample-size-correlation` |
| sample_size | sample_size_multiarm_ab | `main_sample_size_multiarm_ab.js` | `sample-size-multiarm` |
| sample_size | sampling_visualizer | `main_sampling_visualizer.js` | `sampling-visualizer` |
| text_analysis | qualitative_analyzer | `qualitative_analyzer_app.js` | `qualitative-analyzer` |
| text_analysis | sentiment_lab | `sentiment_lab.js` | `sentiment-analysis` |
| text_analysis | theme_extractor | `theme_extractor_app.js` | `theme-extractor` |
| time_series | arimax | `arimax_app.js` | `arimax-forecasting` |

### ⚠️ Notes

- **Sample size tools**: Don't have `markDataUploaded()` because they work with parameters, not uploaded files (intentional)
- **Probability tools**: Fixed case mismatch (`InitEngagementTracking` → `initEngagementTracking`) on 2026-01-30
- **Attribution tools**: Added tracking on 2026-01-30

### 🔍 When Adding New Tools

1. Check if tool folder exists but is not in the list above
2. If missing, add tracking following this guide
3. Update this status list with the new tool

---

**Reference:** Tracking system implemented across 34 statistical tools (January 2026)
