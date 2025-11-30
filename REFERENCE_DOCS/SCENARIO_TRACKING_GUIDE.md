# Scenario Tracking Integration Guide

This guide shows how to integrate scenario tracking into your statistical analysis tools.

## Overview

The tracking system now supports:
- **Scenario tracking**: Log which pre-loaded datasets students use
- **Data source tracking**: Track whether data came from scenarios, uploads, or manual entry

## Basic Usage

### 1. Track Scenario Usage

When a student selects a pre-loaded scenario:

```javascript
// After running analysis with a scenario
await logToolUsage('pearson-correlation', {
    n: stats.n,
    r: stats.r,
    p_value: stats.pValue
}, `r = ${stats.r.toFixed(3)}, p < ${stats.pValue.toFixed(4)}`, {
    scenario: 'Marketing Campaign Performance',  // Scenario name
    dataSource: 'scenario'                       // How data was provided
});
```

### 2. Track Manual Data Entry

When a student manually enters data:

```javascript
await logToolUsage('pearson-correlation', {
    n: stats.n,
    r: stats.r
}, resultSummary, {
    dataSource: 'manual'  // No scenario name needed
});
```

### 3. Track File Uploads (Future Feature)

When file upload tracking is added:

```javascript
await logToolUsage('pearson-correlation', {
    n: stats.n,
    r: stats.r
}, resultSummary, {
    dataSource: 'upload',
    fileName: uploadedFile.name  // Future: file name tracking
});
```

## Implementation Steps

### Step 1: Define Your Scenarios

For each tool, create a list of pre-loaded scenarios. Example for Pearson Correlation:

```javascript
const scenarios = {
    'scenario1': {
        name: 'Marketing Campaign Performance',
        description: 'Ad spend vs. sales revenue',
        xData: [100, 200, 150, 300, 250, 400, 350],
        yData: [500, 800, 650, 1200, 950, 1500, 1300],
        xLabel: 'Ad Spend ($1000s)',
        yLabel: 'Sales Revenue ($1000s)'
    },
    'scenario2': {
        name: 'Customer Satisfaction Study',
        description: 'Satisfaction score vs. repeat purchases',
        xData: [3.2, 4.5, 3.8, 4.9, 4.2, 3.5, 4.7],
        yData: [2, 5, 3, 6, 4, 2, 5],
        xLabel: 'Satisfaction Score (1-5)',
        yLabel: 'Repeat Purchases'
    },
    'scenario3': {
        name: 'Social Media Engagement',
        description: 'Post frequency vs. follower growth',
        xData: [5, 10, 15, 20, 25, 30],
        yData: [50, 120, 180, 240, 290, 350],
        xLabel: 'Posts per Week',
        yLabel: 'New Followers'
    }
};
```

### Step 2: Add Scenario Selector UI

Add a dropdown or button group to your tool's HTML:

```html
<div class="form-group">
    <label>Load Pre-loaded Scenario (Optional)</label>
    <select id="scenario-selector">
        <option value="">-- Manual Entry --</option>
        <option value="scenario1">Marketing Campaign Performance</option>
        <option value="scenario2">Customer Satisfaction Study</option>
        <option value="scenario3">Social Media Engagement</option>
    </select>
    <button type="button" onclick="loadScenario()">Load Scenario</button>
</div>
```

### Step 3: Load Scenario Data

When user selects a scenario:

```javascript
let currentScenario = null;  // Track which scenario is loaded

function loadScenario() {
    const scenarioId = document.getElementById('scenario-selector').value;
    if (!scenarioId) return;
    
    const scenario = scenarios[scenarioId];
    currentScenario = scenario.name;  // Store scenario name
    
    // Populate the input fields
    document.getElementById('x-data').value = scenario.xData.join(', ');
    document.getElementById('y-data').value = scenario.yData.join(', ');
    document.getElementById('x-label').value = scenario.xLabel;
    document.getElementById('y-label').value = scenario.yLabel;
    
    // Show notification
    alert(`Loaded scenario: ${scenario.name}\n${scenario.description}`);
}
```

### Step 4: Track Usage When Computing

When the analysis runs, include scenario info:

```javascript
async function computeCorrelation() {
    // ... existing correlation computation code ...
    
    // Determine data source
    let dataSource = 'manual';
    let scenarioName = null;
    
    if (currentScenario) {
        dataSource = 'scenario';
        scenarioName = currentScenario;
    }
    
    // Log usage with scenario tracking
    await logToolUsage('pearson-correlation', {
        n: stats.n,
        r: stats.r,
        p_value: stats.pValue,
        method: selectedMethod
    }, `r = ${stats.r.toFixed(3)}, p < ${stats.pValue.toFixed(4)}`, {
        scenario: scenarioName,
        dataSource: dataSource
    });
}
```

## Recommended Scenarios by Tool

### Pearson Correlation
- "Marketing Campaign Performance" (ad spend vs sales)
- "Customer Satisfaction Study" (satisfaction vs purchases)
- "Social Media Engagement" (posts vs followers)
- "Product Reviews Analysis" (rating vs sales volume)

### Independent T-Test
- "A/B Test Results" (control vs treatment group)
- "Before/After Campaign" (pre vs post metrics)
- "Gender Pay Gap Analysis" (male vs female salaries)
- "Product Comparison" (brand A vs brand B satisfaction)

### One-Way ANOVA
- "Market Segmentation" (3+ customer segments)
- "Multi-Region Sales" (sales across regions)
- "Age Group Analysis" (Gen Z vs Millennial vs Gen X)
- "Channel Performance" (email vs social vs search)

### Regression
- "Sales Forecasting" (time series)
- "Price Elasticity" (price vs demand)
- "Marketing Mix Model" (multiple predictors)
- "Customer Lifetime Value" (demographics to CLV)

### Chi-Square
- "Market Research Survey" (categorical associations)
- "Customer Segmentation" (demographics vs behavior)
- "Campaign Response" (channel vs conversion)
- "Product Preferences" (age group vs product choice)

## Analytics Available

### For Students

**My Scenario Usage** (`/analytics/my-scenarios/`):
- Total times used scenarios vs manual entry
- Which scenarios you've tried
- Breakdown by tool

### For Instructors

**Course Scenario Analytics** (`/analytics/course/{id}/scenarios/`):
- Which scenarios students are using
- Adoption rate (scenarios vs manual)
- Most popular scenarios per tool

### For Admins

**System Scenario Analytics** (`/analytics/system/scenarios/`):
- Top 20 most popular scenarios
- Overall scenario adoption rate
- Data source distribution

## Testing Locally

1. **Start your LOCAL backend:**
   ```powershell
   cd C:\Users\Andrew\Documents\GitHub\drbaker_backend
   python manage.py runserver
   ```

2. **Open a tool with VS Code Live Server**

3. **Load a scenario and run analysis**

4. **Check tracking worked:**
   - Go to: `http://127.0.0.1:8000/admin/`
   - Click "Tool runs"
   - Your latest run should show:
     - `scenario_name`: "Marketing Campaign Performance"
     - `data_source`: "scenario"

5. **View analytics:**
   - Go to: `http://127.0.0.1:5500/student-dashboard.html`
   - (Future: Will show scenario usage charts)

## Best Practices

1. **Clear Scenario Names**: Use descriptive, context-rich names
2. **Realistic Data**: Make scenarios reflect real marketing situations
3. **Progressive Difficulty**: Start simple, offer complex scenarios
4. **Context Descriptions**: Explain what each scenario represents
5. **Update on Load**: Clear previous data when loading new scenario
6. **Track Early**: Call logToolUsage immediately after computation

## Future Enhancements

- File upload tracking (fileName field)
- Scenario difficulty ratings
- Recommended scenarios based on learning path
- Scenario completion badges
- Compare results across scenarios

## Questions?

Contact: andrewbaker13@gmail.com
