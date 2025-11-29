"# Feature Usage Tracking Integration Guide

## Overview
Track specific user interactions with tool features to understand engagement patterns, identify popular features, and detect students who need help.

## Backend Setup ✅ COMPLETE
- ✅ `FeatureUsage` model created
- ✅ `log_feature_usage` endpoint deployed
- ✅ 4 analytics endpoints available
- ✅ Migration applied to production

## Available Feature Types

```javascript
// Predefined feature types:
'export_chart'          // User exported a chart/graph (PNG, SVG, etc.)
'export_data'           // User downloaded CSV/Excel data
'copy_results'          // User copied results to clipboard
'toggle_advanced'       // User opened advanced options panel
'view_help'             // User clicked help/documentation
'view_interpretation'   // User viewed statistical interpretation guide
'change_confidence'     // User changed confidence level (90%, 95%, 99%)
'toggle_visualization'  // User toggled visualization options
'download_report'       // User downloaded full report
'share_results'         // User shared or printed results
'reset_tool'            // User reset tool to defaults
'other'                 // Custom feature (describe in metadata)
```

## Frontend Integration

### 1. Load the tracking module
```html
<script src="../shared/js/auth_tracking.js"></script>
```

### 2. Track feature usage
```javascript
// Basic usage - track a feature interaction
await logFeatureUsage('pearson-correlation', 'export_chart');

// With metadata - add context about the interaction
await logFeatureUsage('pearson-correlation', 'export_chart', {
    format: 'png',
    width: 800,
    height: 600
});

// Link to a specific tool run
const runId = 123; // From previous logToolUsage() call
await logFeatureUsage('t-test', 'toggle_advanced', {
    section: 'assumptions'
}, runId);
```

### 3. Common Integration Examples

#### Export Chart Button
```javascript
document.getElementById('exportBtn').addEventListener('click', async () => {
    // Export the chart
    const format = document.getElementById('formatSelect').value;
    chart.save(format);
    
    // Track the export
    await logFeatureUsage('your-tool-slug', 'export_chart', {
        format: format,
        hasData: dataLoaded
    });
});
```

#### Help/Documentation Click
```javascript
document.getElementById('helpBtn').addEventListener('click', async () => {
    // Show help modal
    document.getElementById('helpModal').style.display = 'block';
    
    // Track help view
    await logFeatureUsage('your-tool-slug', 'view_help', {
        section: 'interpretation'
    });
});
```

#### Advanced Options Toggle
```javascript
document.getElementById('advancedToggle').addEventListener('click', async () => {
    const panel = document.getElementById('advancedPanel');
    const isExpanded = panel.style.display === 'block';
    
    panel.style.display = isExpanded ? 'none' : 'block';
    
    // Track when they OPEN advanced options (not close)
    if (!isExpanded) {
        await logFeatureUsage('your-tool-slug', 'toggle_advanced');
    }
});
```

#### Confidence Level Change
```javascript
document.querySelectorAll('.confidence-button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const level = e.target.dataset.level; // '0.90', '0.95', '0.99'
        
        // Update calculation
        updateConfidenceLevel(level);
        
        // Track the change
        await logFeatureUsage('your-tool-slug', 'change_confidence', {
            from: currentLevel,
            to: level
        });
    });
});
```

#### Copy Results to Clipboard
```javascript
document.getElementById('copyBtn').addEventListener('click', async () => {
    const results = document.getElementById('results').innerText;
    await navigator.clipboard.writeText(results);
    
    // Track copy action
    await logFeatureUsage('your-tool-slug', 'copy_results', {
        length: results.length
    });
});
```

#### Data Export (CSV)
```javascript
document.getElementById('exportDataBtn').addEventListener('click', async () => {
    // Generate and download CSV
    const csv = generateCSV(data);
    downloadFile(csv, 'results.csv');
    
    // Track export
    await logFeatureUsage('your-tool-slug', 'export_data', {
        format: 'csv',
        rows: data.length
    });
});
```

## Analytics Endpoints

### Student View
```javascript
// Get my own feature usage stats
const myFeatures = await getMyFeatureUsage();
console.log(myFeatures);
// {
//   total_feature_interactions: 45,
//   unique_features_used: 7,
//   top_features: [...],
//   recent_usage: [...]
// }
```

### Instructor View
```javascript
// Get feature usage for a tool (staff only)
const response = await fetch(`${API_BASE}/analytics/tool/pearson-correlation/features/`, {
    headers: { 'Authorization': `Token ${token}` }
});
const toolFeatures = await response.json();
// Shows which features are most used across all students

// Get feature usage for a course (staff only)
const response = await fetch(`${API_BASE}/analytics/course/1/features/`, {
    headers: { 'Authorization': `Token ${token}` }
});
const courseFeatures = await response.json();
// Shows feature adoption rates by students
```

### Admin View
```javascript
// System-wide feature usage (staff only)
const response = await fetch(`${API_BASE}/analytics/system/features/`, {
    headers: { 'Authorization': `Token ${token}` }
});
const systemFeatures = await response.json();
// Shows most engaging tools and popular features
```

## What This Tells Instructors

### 🎯 Student Engagement Signals
- **High export usage** = Students are saving/sharing their work (engaged)
- **Low help views** = Students either understand or are lost (need to investigate)
- **No advanced options** = Students staying in comfort zone (need encouragement)
- **Frequent confidence changes** = Students exploring concepts (good!)

### ⚠️ Warning Signs
- **Student never exports** = Not completing work or not understanding value
- **Zero help/interpretation views** = Not engaging with learning materials
- **Only runs tool once** = Possible confusion or technical issues
- **No feature usage at all** = Just clicking through without understanding

### 📈 Tool Quality Metrics
- **High engagement ratio** = Students exploring features (well-designed tool)
- **Low engagement ratio** = Students run and leave (improve UX?)
- **Popular features** = What students value most
- **Ignored features** = What to remove or improve

## Best Practices

1. **Don't over-track**: Only track meaningful interactions, not every click
2. **Add context**: Use metadata to make analytics actionable
3. **Fail silently**: Feature tracking shouldn't break the tool if it fails
4. **Privacy**: No PII in metadata, just interaction patterns
5. **Performance**: Tracking is async and won't slow down the UI

## Quick Start Checklist

For each tool you want to track:
- [ ] Identify 3-5 key features worth tracking
- [ ] Add `logFeatureUsage()` calls to those interactions
- [ ] Include meaningful metadata (format, section, values changed)
- [ ] Test that tracking works (check network tab)
- [ ] Verify data appears in analytics dashboards

## Example: Full Tool Integration

```javascript
// At the top of your tool's JS
const TOOL_SLUG = 'my-statistics-tool';

// Track when tool completes analysis
document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const results = performAnalysis();
    
    // Log the tool run
    const run = await logToolUsage(TOOL_SLUG, {
        sample_size: data.length,
        alpha: 0.05
    }, results.summary);
    
    // Store run ID for linking features
    window.currentRunId = run.id;
});

// Track feature: Export chart
document.getElementById('exportChart').addEventListener('click', async () => {
    chart.export('png');
    await logFeatureUsage(TOOL_SLUG, 'export_chart', 
        { format: 'png' }, 
        window.currentRunId
    );
});

// Track feature: View help
document.getElementById('helpBtn').addEventListener('click', async () => {
    showHelp();
    await logFeatureUsage(TOOL_SLUG, 'view_help');
});

// Track feature: Advanced options
document.getElementById('advancedToggle').addEventListener('change', async (e) => {
    if (e.target.checked) {
        await logFeatureUsage(TOOL_SLUG, 'toggle_advanced');
    }
});
```

## Deployment Status
✅ Backend deployed to production  
✅ Frontend helper function available  
⏳ Waiting for tool integration  

Start integrating feature tracking into your most-used tools first!
