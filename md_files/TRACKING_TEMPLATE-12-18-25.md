# Usage Tracking Implementation Template
**Created:** December 18, 2025  
**Tool:** Pearson Correlation (Template for all tools)

---

## Implementation Checklist

### ✅ Step 1: Add Tool Constant
Add at the top of your `*_app.js` file:

```javascript
// Tool identifier for tracking
const TOOL_SLUG = 'pearson-correlation';
```

### ✅ Step 2: Import Auth Tracking
Already done in `main_pearson.html`:
```html
<script src="../../../shared/js/auth_tracking.js"></script>
```

### ✅ Step 3: Initialize Engagement Tracking
Add to your initialization/DOMContentLoaded:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Initialize engagement tracking
    initEngagementTracking(TOOL_SLUG);
    resetSessionTracking();
    
    // ... rest of your initialization
});
```

### ✅ Step 4: Track Scenario Load
When a scenario is selected:

```javascript
function handleScenarioSelect(event) {
    const scenarioValue = event.target.value;
    
    if (scenarioValue) {
        const scenario = scenarioManifest.find(s => s.id === scenarioValue);
        
        // TRACKING: Mark scenario loaded
        markScenarioLoaded(scenario.name);
        
        // Load scenario data...
    }
}
```

### ✅ Step 5: Track Data Upload
When file is uploaded:

```javascript
function handleFileUpload(file) {
    // Parse CSV/TSV/TXT...
    
    // TRACKING: Mark data uploaded
    markDataUploaded(file.name);
    
    // Process uploaded data...
}
```

### ✅ Step 6: Track Analysis Run
Wrap your main analysis function:

```javascript
async function runAnalysis() {
    // TRACKING: Mark run attempted
    markRunAttempted();
    
    try {
        // Get input data
        const data = getCurrentData();
        const params = {
            n_observations: data.length,
            correlation_coefficient: null,  // Will be set below
            p_value: null,
            confidence_level: selectedConfidenceLevel * 100,
            ci_lower: null,
            ci_upper: null,
            test_type: 'two-tailed',
            method: selectedCorrelationMethod
        };
        
        // Perform analysis
        const results = computePearsonCorrelation(data.x, data.y);
        
        // Update params with results
        params.correlation_coefficient = results.r;
        params.p_value = results.pValue;
        params.ci_lower = results.ciLower;
        params.ci_upper = results.ciUpper;
        
        // Generate result summary
        const resultSummary = `r = ${formatNumber(results.r, 3)}, p = ${formatNumber(results.pValue, 3)}, n = ${data.length}`;
        
        // TRACKING: Mark success
        markRunSuccessful(params, resultSummary);
        
        // TRACKING: Log tool usage immediately
        await logToolUsage(TOOL_SLUG, params, resultSummary, {
            scenario: activeScenarioDataset?.name || null,
            dataSource: activeMode === 'manual' ? 'manual' : (activeScenarioDataset ? 'scenario' : 'upload')
        });
        
        // Display results...
        displayResults(results);
        
    } catch (error) {
        console.error('Analysis failed:', error);
        
        // TRACKING: Log error
        await logToolUsage(TOOL_SLUG, params, `ERROR: ${error.message}`, {
            scenario: activeScenarioDataset?.name || null,
            dataSource: activeMode
        });
        
        // TRACKING: Log feature usage for error details
        await logFeatureUsage(TOOL_SLUG, 'analysis_error', {
            error_type: error.name,
            error_message: error.message,
            stack_trace: error.stack?.substring(0, 200)
        });
        
        // Show error to user
        displayError(error);
    }
}
```

### ✅ Step 7: Track Feature Interactions

#### Export Chart
```javascript
exportChartBtn.addEventListener('click', async () => {
    // Export chart logic...
    
    // TRACKING: Log feature usage
    await logFeatureUsage(TOOL_SLUG, 'export_chart', {
        format: 'png',
        chart_type: 'scatter'
    });
});
```

#### Export Data
```javascript
exportDataBtn.addEventListener('click', async () => {
    // Export CSV logic...
    
    // TRACKING: Log feature usage
    await logFeatureUsage(TOOL_SLUG, 'export_data', {
        format: 'csv',
        n_rows: data.length
    });
});
```

#### Help Button
```javascript
helpBtn.addEventListener('click', async () => {
    // Show help modal...
    
    // TRACKING: Log feature usage
    await logFeatureUsage(TOOL_SLUG, 'view_help');
});
```

#### Change Confidence Level
```javascript
confidenceLevelSelect.addEventListener('change', async (event) => {
    const newLevel = parseFloat(event.target.value);
    selectedConfidenceLevel = newLevel;
    
    // TRACKING: Log feature usage
    await logFeatureUsage(TOOL_SLUG, 'change_confidence', {
        level: newLevel * 100
    });
    
    // Re-run analysis if needed...
});
```

#### Toggle Advanced Options
```javascript
advancedToggle.addEventListener('click', async () => {
    advancedPanel.classList.toggle('hidden');
    
    // TRACKING: Log feature usage
    await logFeatureUsage(TOOL_SLUG, 'toggle_advanced', {
        expanded: !advancedPanel.classList.contains('hidden')
    });
});
```

#### Copy Results
```javascript
copyResultsBtn.addEventListener('click', async () => {
    // Copy to clipboard logic...
    
    // TRACKING: Log feature usage
    await logFeatureUsage(TOOL_SLUG, 'copy_results');
});
```

---

## Expected Tracking Flow

### Scenario 1: BasicEngagement (Scenario-based)
1. User loads page → `initEngagementTracking()` starts timer
2. User selects scenario → `markScenarioLoaded('Ad Spend vs Revenue')`
3. User clicks "Run Analysis" → `markRunAttempted()`
4. Analysis succeeds → `markRunSuccessful()` + `logToolUsage()` immediately
5. User explores results, exports chart, views help → `logFeatureUsage()` for each
6. **At 5-minute mark** → `checkEngagementMilestones()` fires → logs `pearson-correlation-basic-engagement`

### Scenario 2: AdvancedEngagement (Upload-based)
1. User loads page → `initEngagementTracking()` starts timer
2. User uploads CSV → `markDataUploaded('my_data.csv')`
3. User clicks "Run Analysis" → `markRunAttempted()`
4. Analysis succeeds → `markRunSuccessful()` + `logToolUsage()` immediately
5. User explores results, exports data → `logFeatureUsage()` for each
6. **At 5-minute mark** → `checkEngagementMilestones()` fires → logs `pearson-correlation-advanced-engagement`

### Scenario 3: Error Tracking
1. User loads page → `initEngagementTracking()` starts timer
2. User enters manual data (invalid format)
3. User clicks "Run Analysis" → `markRunAttempted()`
4. Analysis fails → `logToolUsage()` with `ERROR:` prefix + `logFeatureUsage('analysis_error')`
5. User sees error message, fixes data, tries again

---

## Backend Data Examples

### Successful Run in ToolRun Table
```json
{
    "id": 12345,
    "user": 42,
    "tool_slug": "pearson-correlation",
    "page_url": "https://drbakermarketing.com/apps/descriptive/pearson_correlation/main_pearson.html",
    "params_json": {
        "n_observations": 50,
        "correlation_coefficient": 0.78,
        "p_value": 0.001,
        "confidence_level": 95,
        "ci_lower": 0.65,
        "ci_upper": 0.87,
        "test_type": "two-tailed",
        "method": "pearson"
    },
    "result_summary": "r = 0.780, p = 0.001, n = 50",
    "scenario_name": "Ad Spend vs Revenue",
    "data_source": "scenario",
    "timestamp": "2025-12-18T15:23:45Z"
}
```

### BasicEngagement Milestone in ToolRun Table
```json
{
    "id": 12346,
    "user": 42,
    "tool_slug": "pearson-correlation-basic-engagement",
    "page_url": "https://drbakermarketing.com/apps/descriptive/pearson_correlation/main_pearson.html",
    "params_json": {
        "n_observations": 50,
        "correlation_coefficient": 0.78,
        "p_value": 0.001,
        "confidence_level": 95,
        "ci_lower": 0.65,
        "ci_upper": 0.87,
        "test_type": "two-tailed",
        "method": "pearson"
    },
    "result_summary": "BasicEngagement: r = 0.780, p = 0.001, n = 50",
    "scenario_name": "Ad Spend vs Revenue",
    "data_source": "scenario",
    "timestamp": "2025-12-18T15:28:45Z"  // 5 mins after first run
}
```

### Error in ToolRun Table
```json
{
    "id": 12347,
    "user": 42,
    "tool_slug": "pearson-correlation",
    "page_url": "https://drbakermarketing.com/apps/descriptive/pearson_correlation/main_pearson.html",
    "params_json": {
        "n_observations": 3,
        "correlation_coefficient": null,
        "p_value": null,
        "confidence_level": 95,
        "ci_lower": null,
        "ci_upper": null,
        "test_type": "two-tailed",
        "method": "pearson"
    },
    "result_summary": "ERROR: Insufficient data - need at least 4 paired observations",
    "scenario_name": null,
    "data_source": "manual",
    "timestamp": "2025-12-18T15:30:12Z"
}
```

### Feature Usage in FeatureUsage Table
```json
{
    "id": 9876,
    "user": 42,
    "tool_slug": "pearson-correlation",
    "feature_type": "export_chart",
    "metadata": {
        "format": "png",
        "chart_type": "scatter"
    },
    "tool_run_id": 12345,  // Links to successful run above
    "timestamp": "2025-12-18T15:25:10Z"
}
```

---

## Testing Checklist

### Manual Testing
- [ ] Load scenario → Check console for "📊 Scenario loaded: X"
- [ ] Upload CSV → Check console for "📤 Data uploaded: X"
- [ ] Run analysis → Check console for "▶️ Analysis run attempted" + "✅ Analysis run successful"
- [ ] Wait 5+ mins with scenario → Check console for "🎉 BasicEngagement milestone reached!"
- [ ] Wait 5+ mins with upload → Check console for "🎉 AdvancedEngagement milestone reached!"
- [ ] Cause error (e.g., delete data) → Check console for error tracking
- [ ] Export chart → Check console for feature usage
- [ ] Change confidence level → Check console for feature usage

### Backend Verification
```powershell
# Get auth token
$token = "YOUR_TOKEN_HERE"

# Check your recent tool runs
Invoke-RestMethod `
  -Uri "https://drbaker-backend.onrender.com/api/analytics/my-usage/" `
  -Headers @{"Authorization" = "Token $token"}

# Check your feature usage
Invoke-RestMethod `
  -Uri "https://drbaker-backend.onrender.com/api/analytics/my-features/" `
  -Headers @{"Authorization" = "Token $token"}
```

---

## Common Patterns by Tool Category

### For Regression Tools
```javascript
const params = {
    n_observations: data.length,
    n_predictors: predictors.length,
    r_squared: results.rSquared,
    adj_r_squared: results.adjRSquared,
    f_statistic: results.fStat,
    p_value: results.pValue,
    confidence_level: selectedConfidenceLevel * 100
};
const resultSummary = `R² = ${formatNumber(results.rSquared, 3)}, F = ${formatNumber(results.fStat, 2)}, p < 0.001`;
```

### For Hypothesis Tests
```javascript
const params = {
    n_group1: group1.length,
    n_group2: group2.length,
    t_statistic: results.tStat,
    df: results.df,
    p_value: results.pValue,
    cohens_d: results.effectSize,
    confidence_level: selectedConfidenceLevel * 100,
    mean_difference: results.meanDiff,
    test_type: 'two-tailed'
};
const resultSummary = `t(${results.df}) = ${formatNumber(results.tStat, 2)}, p = ${formatNumber(results.pValue, 3)}`;
```

### For Time Series
```javascript
const params = {
    n_observations: data.length,
    p: arOrder,
    d: differencing,
    q: maOrder,
    n_exogenous: exogVars.length,
    aic: results.aic,
    bic: results.bic,
    mape: results.mape,
    forecast_horizon: forecastPeriods,
    has_seasonality: seasonalityDetected
};
const resultSummary = `ARIMA(${arOrder},${differencing},${maOrder}), AIC = ${formatNumber(results.aic, 1)}, MAPE = ${formatNumber(results.mape, 1)}%`;
```

---

## Rollout Schedule

### Week 1: Template Tool
- ✅ Pearson Correlation (this document)
- Test all tracking events work
- Refine any issues

### Week 2-3: High Priority (10 tools)
1. Bivariate Linear Regression
2. Multiple Linear Regression
3. Independent t-test
4. Chi-Square Test
5. ARIMAX Calculator
6. K-Means Clustering
7. Sample Size Calculator
8. Univariate Analyzer
9. A/B Proportion Test
10. Logistic Regression

### Week 4-5: Remaining Tools (20 tools)
- All other tools systematically

---

**Next Step:** Implement this pattern in `pearson_app.js` and test thoroughly before rolling out to other tools.
