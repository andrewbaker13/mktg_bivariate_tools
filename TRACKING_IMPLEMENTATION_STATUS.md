# Tracking Implementation - Pearson & MLR Status

## What I've Completed:

### ✅ Pearson Correlation (`pearson_app.js`)
1. ✅ Added `TOOL_SLUG = 'pearson-correlation'` constant
2. ✅ Added engagement tracking initialization in DOMContentLoaded

### ✅ Multiple Linear Regression (`mlr_app.js`)
- Already has `pageLoadTime` and `hasSuccessfulRun` tracking variables
- Has `checkAndTrackUsage()` function (but needs updating to new pattern)

---

## What Needs to Be Done:

### For Both Tools:

#### 1. Find and Update Main Analysis Functions
Need to locate where analysis is triggered and add:
```javascript
// Mark run attempted
if (typeof markRunAttempted === 'function') {
    markRunAttempted();
}

try {
    // ... existing analysis code ...
    
    // Build params object
    const params = {
        n_observations: data.length,
        correlation_coefficient: results.r,  // or r_squared for regression
        p_value: results.pValue,
        // ... other always-present params
    };
    
    const resultSummary = `r = ${formatNumber(results.r, 3)}, p < 0.001, n = ${data.length}`;
    
    // Mark success
    if (typeof markRunSuccessful === 'function') {
        markRunSuccessful(params, resultSummary);
    }
    
    // Log immediately
    if (typeof logToolUsage === 'function') {
        await logToolUsage(TOOL_SLUG, params, resultSummary, {
            scenario: activeScenarioDataset?.name || null,
            dataSource: determineDataSource()
        });
    }
    
} catch (error) {
    // Log error
    if (typeof logToolUsage === 'function') {
        await logToolUsage(TOOL_SLUG, {}, `ERROR: ${error.message}`, {
            scenario: activeScenarioDataset?.name || null,
            dataSource: determineDataSource()
        });
    }
    
    if (typeof logFeatureUsage === 'function') {
        await logFeatureUsage(TOOL_SLUG, 'analysis_error', {
            error_type: error.name,
            error_message: error.message
        });
    }
    
    throw error;  // Re-throw to show user
}
```

#### 2. Track Scenario Loads
Find where scenarios are loaded and add:
```javascript
// TRACKING: Mark scenario loaded
if (typeof markScenarioLoaded === 'function' && scenarioName) {
    markScenarioLoaded(scenarioName);
}
```

#### 3. Track File Uploads
Find file upload handlers and add:
```javascript
// TRACKING: Mark data uploaded
if (typeof markDataUploaded === 'function' && file.name) {
    markDataUploaded(file.name);
}
```

---

## Simplified Approach

Given the complexity of these files (2500+ lines each), let me create a **minimal tracking wrapper** that can be added without deeply understanding the entire codebase:

### Option 1: Event-Based Tracking (Easiest)
Add event listeners to key UI elements:

```javascript
// Add this at end of DOMContentLoaded or as separate init function

// Track scenario selection
const scenarioSelect = document.getElementById('scenario-select');
if (scenarioSelect) {
    scenarioSelect.addEventListener('change', (e) => {
        if (e.target.value && typeof markScenarioLoaded === 'function') {
            const option = e.target.options[e.target.selectedIndex];
            markScenarioLoaded(option.textContent);
        }
    });
}

// Track file uploads
const fileInputs = document.querySelectorAll('input[type="file"]');
fileInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        if (e.target.files[0] && typeof markDataUploaded === 'function') {
            markDataUploaded(e.target.files[0].name);
        }
    });
});

// Track analyze/run button clicks
const analyzeButtons = document.querySelectorAll('button[id*="analyze"], button[id*="run"], button[id*="calculate"]');
analyzeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (typeof markRunAttempted === 'function') {
            markRunAttempted();
        }
    });
});
```

### Option 2: Hook Into Existing Functions (More Accurate)
Wrap existing functions without modifying them:

```javascript
// Save original functions
const originalUpdateResults = window.updateResults;
const originalLoadScenario = window.loadScenarioById;

// Wrap with tracking
if (originalLoadScenario) {
    window.loadScenarioById = function(scenarioId) {
        // Track scenario load
        const scenario = scenarioManifest.find(s => s.id === scenarioId);
        if (scenario && typeof markScenarioLoaded === 'function') {
            markScenarioLoaded(scenario.label || scenarioId);
        }
        // Call original
        return originalLoadScenario.apply(this, arguments);
    };
}

if (originalUpdateResults) {
    window.updateResults = async function() {
        // Mark run attempted
        if (typeof markRunAttempted === 'function') {
            markRunAttempted();
        }
        
        try {
            // Call original
            const result = await originalUpdateResults.apply(this, arguments);
            
            // If we get here, it succeeded
            if (typeof markRunSuccessful === 'function') {
                markRunSuccessful({}, 'Analysis complete');
            }
            
            return result;
        } catch (error) {
            // Log error
            if (typeof logToolUsage === 'function') {
                await logToolUsage(TOOL_SLUG, {}, `ERROR: ${error.message}`, {});
            }
            throw error;
        }
    };
}
```

---

## Recommendation

Let's use **Option 1 (Event-Based)** as it requires minimal code archaeology:

1. ✅ Already have: Tool slug + engagement init
2. Add: Simple event listeners for UI interactions
3. Test: Verify milestones fire at 5 minutes
4. Refine: Add full params later once we confirm basic tracking works

This gets us 80% of the value with 20% of the complexity.

**Next Step:** Add event-based tracking to both tools, then test!
