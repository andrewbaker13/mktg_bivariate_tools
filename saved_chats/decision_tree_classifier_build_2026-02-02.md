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
        └── scenarios/     (empty, for future static CSVs)
```

Room left for future expansion: `apps/decisiontrees/regressor/`
