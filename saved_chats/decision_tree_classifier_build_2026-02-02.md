# Decision Tree Classifier - Build Session
**Date:** February 2, 2026  
**Status:** ✅ Implementation Complete - Ready for Testing

---

## Project Overview

Built a new interactive **Decision Tree Classifier** tool for marketing analytics students. Located at `apps/decisiontrees/classifier/`.

### Key Design Decisions Made

1. **Algorithm**: CART (Classification and Regression Trees) only - not Random Forest or other ensemble methods
2. **Task**: Classification only (room for future `regressor/` folder)
3. **Learning Objectives**: Full implementation covering all objectives from neural network tool
4. **Build Modes**: 
   - **Auto Mode**: Algorithm finds optimal splits automatically
   - **Manual Mode**: User builds tree interactively by clicking nodes

---

## Specifications Finalized

### Tree Constraints
- Max depth slider (1-10, default 3)
- Min samples per leaf slider (5-50, default 10)
- Split criterion: Gini impurity OR Entropy/Information Gain (dropdown)
- Train/test split slider (50-90%, default 70%)

### Node Interaction (Manual Mode)
- **Compact nodes** show: Feature name, split value, sample count
- **Click to expand** ("embiggen") opens node editor overlay
- Expanded view shows:
  - Feature pills to select split feature
  - For continuous: slider with histogram, default at median
  - For categorical: click categories to toggle between left/right groups
  - Real-time preview of split quality (Gini, samples each side)
  - "Apply Split" / "Make Leaf" / "Cancel" buttons

### Tree Visualization
- Vertical flow (root at top, leaves at bottom)
- SVG-based (better for interactivity than Canvas)
- Distribution bars in nodes showing class proportions
- Edges labeled with split conditions (≤ / >)

### Scenarios Created

| # | Scenario | Classes | N | Description |
|---|----------|---------|---|-------------|
| 1 | FitLife Gym Customer Churn | Binary (Churned/Retained) | 1,500 | Predict gym membership churn |
| 2 | CloudSync B2B Lead Scoring | Binary (Converted/Not Converted) | 1,200 | Qualify enterprise software leads |
| 3 | Artisan Coffee Customer Segments | 3-Class (Casual/Regular/Enthusiast) | 1,800 | Segment coffee shop customers |

### Evaluation Metrics
- Summary cards: Accuracy, Precision, Recall, F1
- Confusion matrix (all scenarios)
- ROC curve (binary scenarios only)
- Per-class metrics table (3-class scenario)
- Feature importance bar chart
- Decision rules text interpretation

### Exports
- **Tree Rules**: Text file with IF-THEN rules and confidence
- **Predictions CSV**: actual, predicted, confidence, per-class probabilities

---

## Files Created

All files are in `apps/decisiontrees/classifier/`:

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~286 | Main page with 4-step card workflow |
| `styles.css` | ~720 | Comprehensive styling including node editor |
| `decision_tree.js` | ~650 | Core CART algorithm (Gini/Entropy, continuous + categorical splits) |
| `tree_visualizer.js` | ~450 | SVG tree rendering with compact nodes |
| `manual_builder.js` | ~800 | Interactive node editing experience |
| `scenarios.js` | ~545 | Three marketing scenarios with data generators |
| `main.js` | ~540 | Main controller orchestrating everything |
| `scenarios/` | (empty) | Folder for future static CSV files if needed |

### Script Load Order (in index.html)
```html
<script src="../../../shared/js/csv_utils.js"></script>
<script src="../../../shared/js/auth_tracking.js"></script>
<script src="../../../shared/js/auth_bar.js"></script>
<script src="scenarios.js"></script>
<script src="decision_tree.js"></script>
<script src="tree_visualizer.js"></script>
<script src="manual_builder.js"></script>
<script src="main.js"></script>
```

---

## UI Structure (4 Steps)

### Step 1: Choose Your Scenario
- Dropdown with 3 preset scenarios
- Rich description panel (arrow function pattern)
- Download scenario data button
- OR upload custom CSV with variable assignment

### Step 2: Configure Your Tree
- Mode toggle: Auto / Manual
- Settings panel:
  - Max Depth slider
  - Min Samples per Leaf slider
  - Split Criterion dropdown (Gini/Entropy)
  - Train/Test Split slider
- Build Tree / Reset buttons

### Step 3: Build Your Tree
- Main tree visualization container
- Node editor overlay (for manual mode)
- Interactive node clicking

### Step 4: Evaluate Model
- Metrics summary cards (4-up)
- Two-column layout:
  - Left: Confusion Matrix + ROC/Per-Class
  - Right: Feature Importance + Interpretation
- Export buttons

---

## Key Code Patterns Used

### Global Exports (window.*)
```javascript
// decision_tree.js
window.DecisionTreeClassifier = DecisionTreeClassifier;
window.calculateMetrics = calculateMetrics;
window.calculateROC = calculateROC;

// tree_visualizer.js
window.TreeVisualizer = TreeVisualizer;

// manual_builder.js
window.ManualTreeBuilder = ManualTreeBuilder;

// scenarios.js
window.DECISION_TREE_SCENARIOS = DECISION_TREE_SCENARIOS;
window.getScenarioById = getScenarioById;
window.generateScenarioData = generateScenarioData;
window.dataToCSV = dataToCSV;
```

### Scenario Description Pattern (Arrow Function)
```javascript
description: () => `
    <div class="scenario-header">
        <span class="scenario-icon">🏃</span>
        <div>
            <h4>FitLife Gym - Member Retention</h4>
            <p class="scenario-tagline">Predict which members will cancel...</p>
        </div>
    </div>
    ...
`
```

### Feature Types Object
```javascript
featureTypes: {
    'Contract Length': 'categorical',
    'Monthly Fee': 'continuous',
    'Visit Frequency': 'continuous',
    // ...
}
```

---

## Next Steps (When Resuming)

1. **Test in Browser**: Open `apps/decisiontrees/classifier/index.html` locally
2. **Verify All Modes Work**:
   - [ ] Auto mode builds tree correctly
   - [ ] Manual mode node expansion works
   - [ ] Categorical and continuous splits work
   - [ ] Metrics display correctly
   - [ ] Exports generate valid files
3. **Test Each Scenario**: Verify data generation and descriptions
4. **Cross-Browser**: Check Safari (CSS `rx` property warnings exist)
5. **Polish**: Any UI tweaks based on testing

---

## Reference: Guidance File Used

The build followed `/.github/prompts/create-scenario.md` which covers:
- Content creation standards (Problem framing, Variable definitions, etc.)
- Technical implementation patterns (CSS, JS architecture, shared components)
- Evaluation methodology (Confusion matrix, ROC, feature importance)

---

## Dependencies

- **Plotly.js** (CDN): For ROC curves
- **Shared CSS**: `/shared/css/main.css`, `/shared/css/page-styles.css`
- **Shared JS**: `csv_utils.js`, `auth_tracking.js`, `auth_bar.js`

---

## Folder Structure Created

```
apps/
└── decisiontrees/
    └── classifier/
        ├── index.html
        ├── styles.css
        ├── decision_tree.js
        ├── tree_visualizer.js
        ├── manual_builder.js
        ├── scenarios.js
        ├── main.js
        ├── dt_tutorial.js    (NEW - Professor Mode)
        └── scenarios/     (empty, for future static CSVs)
```

Room left for future expansion: `apps/decisiontrees/regressor/`

---

## Professor Mode Implementation (Session 2)

### Overview
Added comprehensive Professor Mode tutorial following the established pattern from K-Means, Logistic Regression, and Chi-Square implementations.

### Files Modified/Created

| File | Changes |
|------|---------|
| `index.html` | Added tut- wrapper IDs throughout, Professor Mode banner, Train Accuracy metric card |
| `main.js` | Added `window.lastTreeState`, `window.treeBuilt`, fixed feature importance bug, added trainMetrics |
| `styles.css` | Fixed z-index for node-details-modal (10001) |
| `dt_tutorial.js` | **NEW** - Complete 13-step tutorial (~1100 lines) |

### Tutorial Structure (13 Steps)

| Step | Module ID | Title | Purpose |
|------|-----------|-------|---------|
| 1 | welcome | Welcome | Introduce classification trees vs regression |
| 2 | concepts | Core Concepts | Gini impurity, recursive partitioning |
| 3 | load_data | Load Scenario | Student loads FitLife Gym data |
| 4 | configure | Configure Settings | Set max depth = 4 (specific task) |
| 5 | build_tree | Build the Tree | Click Build Tree button |
| 6 | interpret_tree | Explore the Tree | Click nodes, observe structure |
| 7 | metrics_baseline | Baseline Metrics | **Record** current Train & Test accuracy |
| 8 | overfitting_setup | Overfitting Experiment | Change depth to 8+, predict what happens |
| 9 | overfitting_observe | Observe Overfitting | Compare new vs baseline, spot overfitting |
| 10 | metrics | Precision & Recall | Deep dive on precision/recall tradeoffs |
| 11 | confusion_matrix | Confusion Matrix | Interpret the confusion matrix |
| 12 | feature_importance | Feature Importance | Analyze which features matter most |
| 13 | conclusion | Wrap-Up | Summary quiz, export certificates |

### Key Pedagogical Flow
```
Baseline → Predict → Change → Observe
```
Students **see metrics first** (Step 7), then **predict** what will happen (Step 8), then **change settings and observe** (Step 9). This ensures all quiz questions reference metrics students have already seen.

### Data Exposure for Dynamic Quizzes

```javascript
window.lastTreeState = {
    accuracy: 0.85,           // Test accuracy
    trainAccuracy: 0.92,      // Train accuracy (NEW)
    precision: 0.83,
    recall: 0.78,
    f1: 0.80,
    confusionMatrix: [[TP, FN], [FP, TN]],
    rootFeature: 'Visit Frequency',
    rootThreshold: 2.5,
    importances: [['Feature', score], ...],  // Array (sorted)
    maxDepth: 4
};

window.treeBuilt = true;  // For task tracking
```

### Bug Fixes Applied

1. **importance.sort() Error**: `getFeatureImportance()` returns object, not array
   ```javascript
   // Fix: Convert to array
   const importanceArray = Object.entries(importance)
       .map(([name, val]) => [name, val])
       .sort((a, b) => b[1] - a[1]);
   ```

2. **Sidebar Not Appearing**: Tutorial sidebar needs `.active` class
   ```javascript
   requestAnimationFrame(() => {
       document.getElementById('tutorial-sidebar').classList.add('active');
   });
   ```

3. **Z-Index Modal Issue**: Node details modal hidden behind overlay
   ```css
   .node-details-modal { z-index: 10001; }  /* Above tutorial overlay (9999) */
   ```

4. **Task Tracking for Build Tree**: Added `window.treeBuilt = false` at init, set `true` in buildTree()

### UI Additions

**Train Accuracy Metric Card** (in metrics panel):
```html
<div class="metric-card" id="train-accuracy-card">
    <span class="metric-value" id="train-accuracy">-</span>
    <span class="metric-label">Train Accuracy</span>
</div>
```

**Color-coded overfitting indicator**: If train accuracy exceeds test accuracy by >10%, Train Accuracy displays in orange.

### tut- Wrapper IDs Added

| ID | Element |
|----|---------|
| `tut-scenario-dropdown` | Scenario dropdown wrapper |
| `tut-load-scenario` | Load button |
| `tut-settings-panel` | Settings panel |
| `tut-max-depth` | Max depth slider |
| `tut-build-tree-btn` | Build tree button |
| `tut-tree-container` | Tree visualization |
| `tut-metrics-summary` | Metrics cards |
| `tut-confusion-matrix` | Confusion matrix |
| `tut-feature-importance` | Feature importance chart |
| `tut-export-section` | Export buttons |

### Dynamic Quiz Examples

**Step 7 (Baseline Metrics)**:
```javascript
getDynamicQuizzes: () => [{
    question: `Your model shows ${(state.trainAccuracy*100).toFixed(0)}% train accuracy 
               and ${(state.accuracy*100).toFixed(0)}% test accuracy. 
               What does this ${gap > 5 ? 'gap' : 'similarity'} suggest?`,
    // Dynamic answers based on actual gap
}]
```

**Step 9 (Overfitting Observe)**:
```javascript
// Compare current depth to baseline (depth 4)
// Quiz asks about the change in metrics
```

### Script Load Order Updated
```html
<script src="scenarios.js"></script>
<script src="decision_tree.js"></script>
<script src="tree_visualizer.js"></script>
<script src="manual_builder.js"></script>
<script src="main.js"></script>
<script src="dt_tutorial.js"></script>  <!-- NEW - Must be last -->
```

---

## Testing Checklist (Professor Mode)

- [ ] Tutorial sidebar slides in when Professor Mode clicked
- [ ] All 13 steps render correctly
- [ ] Step 4: Task completes when depth set to 4
- [ ] Step 5: Task completes when tree built (window.treeBuilt)
- [ ] Step 7: Train and Test accuracy display correctly
- [ ] Step 8: Depth slider highlighting works
- [ ] Step 9: Overfitting detection works when depth increased
- [ ] Node click expands modal (z-index correct)
- [ ] Dynamic quizzes use actual metric values
- [ ] No console errors throughout

---

## Reference: Existing Professor Mode Implementations

Reviewed before implementation:
- `apps/clustering/k-means/kmeans_tutorial.js` (~1000 lines)
- `apps/regression/logistic/logistic_tutorial.js` (~900 lines)  
- `apps/hypothesis_testing/chi-square/chi_square_tutorial.js` (~800 lines)

All follow same pattern: DTTutorial object, steps array, check()/onEnter()/getDynamicQuizzes() methods.

---

## Critical Implementation Details for Continuation

### File Locations & Line References

**dt_tutorial.js** (`apps/decisiontrees/classifier/dt_tutorial.js`) - ~1155 lines
- Lines 1-50: DTTutorial object definition, steps array start
- Lines 50-100: Step 1 (welcome) and Step 2 (concepts)
- Lines 100-200: Step 3 (load_data) with task tracking
- Lines 200-300: Step 4 (configure) - depth = 4 requirement
- Lines 300-400: Step 5 (build_tree) - uses `window.treeBuilt`
- Lines 400-550: Step 6 (interpret_tree) - node exploration
- Lines 550-700: Step 7 (metrics_baseline) - Record train/test accuracy
- Lines 700-850: Step 8 (overfitting_setup) - Change to depth 8+
- Lines 850-950: Step 9 (overfitting_observe) - Compare results
- Lines 950-1050: Steps 10-12 (metrics, confusion, importance)
- Lines 1050-1155: Step 13 (conclusion) + renderSidebar() + init

**main.js** (`apps/decisiontrees/classifier/main.js`) - Key sections:
- Line 59: `window.treeBuilt = false;`
- Line 629: `window.treeBuilt = true;` (in buildTree function)
- Lines 895-898: importanceArray conversion for auto mode
- Lines 910-943: window.lastTreeState exposure for auto mode
- Lines 999-1002: importanceArray conversion for manual mode
- Lines 1019-1042: window.lastTreeState exposure for manual mode

**index.html** (`apps/decisiontrees/classifier/index.html`):
- Line 48: Professor Mode banner toggle
- Line 623: `<script src="dt_tutorial.js"></script>` (last script)
- Train Accuracy metric card in metrics-summary section

**styles.css** (`apps/decisiontrees/classifier/styles.css`):
- `.node-details-modal { z-index: 10001; }` - Fixed modal layering

### Code Snippets for Reference

**importanceArray Conversion** (main.js, around line 895):
```javascript
const importance = tree.getFeatureImportance();
const importanceArray = Object.entries(importance).map(([feature, imp]) => ({
    feature: feature,
    importance: imp
})).sort((a, b) => b.importance - a.importance);
```

**window.lastTreeState Structure** (main.js, around line 910):
```javascript
window.lastTreeState = {
    accuracy: metrics.accuracy,
    trainAccuracy: trainMetrics.accuracy,
    precision: metrics.precision,
    recall: metrics.recall,
    f1: metrics.f1,
    confusionMatrix: metrics.confusionMatrix,
    rootFeature: tree.root?.feature || '',
    rootThreshold: tree.root?.threshold || 0,
    importances: importanceArray.map(item => [item.feature, item.importance]),
    maxDepth: parseInt(document.getElementById('max-depth').value),
    depthChanged: window.lastTreeState?.maxDepth !== parseInt(document.getElementById('max-depth').value),
    previousDepth: window.lastTreeState?.maxDepth || 4
};
```

**displayMetrics with Train Accuracy** (main.js):
```javascript
function displayMetrics(testMetrics, trainMetrics) {
    document.getElementById('metric-accuracy').textContent = (testMetrics.accuracy * 100).toFixed(1) + '%';
    document.getElementById('metric-train-accuracy').textContent = (trainMetrics.accuracy * 100).toFixed(1) + '%';
    
    // Overfitting indicator - color train accuracy if gap > 10%
    const gap = trainMetrics.accuracy - testMetrics.accuracy;
    const trainCard = document.getElementById('train-accuracy-card');
    if (gap > 0.1) {
        trainCard.classList.add('overfitting-warning');
    } else {
        trainCard.classList.remove('overfitting-warning');
    }
    // ... rest of metrics
}
```

**Sidebar Animation Fix** (dt_tutorial.js, in renderSidebar):
```javascript
document.body.appendChild(sidebar);
// Trigger animation after DOM insertion
requestAnimationFrame(() => {
    sidebar.classList.add('active');
});
```

### Z-Index Hierarchy

| Element | Z-Index | Purpose |
|---------|---------|---------|
| Tutorial Overlay | 9999 | Dims background |
| Tutorial Sidebar | 10000 | Tutorial panel |
| Highlight Box | 10000 | Points to elements |
| Node Details Modal | 10001 | Must be ABOVE overlay |

### State Variables to Track

```javascript
// In main.js (global)
window.treeBuilt = false;        // Set true when Build Tree clicked
window.lastTreeState = null;     // Updated after each tree build

// Tutorial tracks internally
DTTutorial.currentStep           // Current step index (0-12)
DTTutorial.stepData              // Persistent data between steps
```

---

## Session End State (February 2, 2026)

### What's Done
✅ Full Decision Tree Classifier tool implementation  
✅ All three marketing scenarios with data generators  
✅ Auto mode and Manual mode working  
✅ Professor Mode tutorial with 13 steps  
✅ All bug fixes applied (importance.sort, sidebar, z-index)  
✅ Train Accuracy added to UI  
✅ Pedagogical restructuring (baseline → predict → change → observe)  

### What's NOT Done
❌ Browser testing not completed  
❌ No verification in live environment  
❌ May still have runtime bugs  

### Immediate Next Steps

1. **Open in browser**: `apps/decisiontrees/classifier/index.html`
2. **Test auto mode first** - Load scenario, build tree, check metrics
3. **Test Professor Mode** - Click toggle, walk through all 13 steps
4. **Check console** - Look for any JavaScript errors
5. **Test node clicking** - Verify modal appears above tutorial overlay

### Potential Issues to Watch For

1. **Import/export paths** - If files moved, script paths may break
2. **Feature types mismatch** - categorical vs continuous handling
3. **Train metrics calculation** - Need to verify tree is predicting on training data correctly
4. **Quiz answer generation** - Dynamic quizzes depend on window.lastTreeState being populated

---

## Commands for Quick Navigation

```bash
# Open the classifier tool
start "" "apps/decisiontrees/classifier/index.html"

# Find all tutorial-related code
grep -r "DTTutorial" apps/decisiontrees/classifier/

# Check for window.lastTreeState usage
grep -r "lastTreeState" apps/decisiontrees/classifier/

# Find all tut- IDs in HTML
grep -r "tut-" apps/decisiontrees/classifier/index.html
```

---

## Similar Files for Reference Pattern

If you need to see how other Professor Mode tutorials work:
- `apps/clustering/k-means/kmeans_tutorial.js`
- `apps/regression/logistic/logistic_tutorial.js`
- `apps/hypothesis_testing/chi-square/chi_square_tutorial.js`

All follow identical patterns for:
- Step structure with check()/onEnter()/getDynamicQuizzes()
- Sidebar rendering with animation
- Task completion tracking
- Dynamic quiz generation from app state

---

## Session 3: Professor Mode Bug Fixes (February 2, 2026)

### Issues Found & Fixed

| Issue | Problem | Solution |
|-------|---------|----------|
| **Confusion Matrix Structure** | Tutorial assumed 2D array `cm[0][0]` but actual structure is object `cm[actual][predicted]` | Fixed to use class names: `cm[targetClass][targetClass]` for TP, etc. |
| **Scenario Label Mismatch** | Tutorial said `"Customer Churn Prediction"` but dropdown shows `"🔄 Customer Churn Prediction"` | Updated to include emoji |
| **Step 9 Highlight Mismatch** | Step asked to click "Build Tree" but highlighted Metrics panel | Changed `targetId` to `'tut-step3-section'`, added auto-scroll to metrics after rebuild |

### Code Changes Made

**dt_tutorial.js - Confusion Matrix Fix (Step 11):**
```javascript
// BEFORE (broken):
const cm = state.confusionMatrix;
const tn = cm[0]?.[0] || 0;  // Wrong! cm is object, not array

// AFTER (fixed):
const cm = state.confusionMatrix;
const classes = state.classes;
const targetClass = state.targetClass || classes[1];
const negativeClass = classes.find(c => c !== targetClass) || classes[0];
// cm[actual][predicted]
const tp = cm[targetClass]?.[targetClass] || 0;
const fn = cm[targetClass]?.[negativeClass] || 0;
const fp = cm[negativeClass]?.[targetClass] || 0;
const tn = cm[negativeClass]?.[negativeClass] || 0;
```

**dt_tutorial.js - Step 9 Highlight Fix:**
```javascript
// BEFORE:
targetId: 'tut-metrics-section',  // Wrong section!
onEnter: () => {
    const section = document.getElementById('tut-metrics-section');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// AFTER:
targetId: 'tut-step3-section',  // Highlights Build Tree area
check: () => {
    const state = window.lastTreeState;
    const rebuilt = state && state.maxDepth === 5;
    // Auto-scroll to metrics AFTER they rebuild
    if (rebuilt) {
        const metricsSection = document.getElementById('tut-metrics-section');
        if (metricsSection) metricsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return rebuilt;
},
onEnter: () => {
    const section = document.getElementById('tut-step3-section');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

### Testing Status

- [x] Steps 1-8: Working correctly
- [x] Step 9: Now highlights Build Tree, auto-scrolls to metrics after rebuild
- [ ] Steps 10-13: Need verification
- [ ] Dynamic quizzes: Need to verify actual values appear

---

*Last updated: February 2, 2026 - End of Session 3*

