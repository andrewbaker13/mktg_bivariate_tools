---
name: Create Statistical Tool UI
description: Build a new statistical analysis tool following established design system, UX patterns, and accessibility standards
---

# Create Statistical Tool UI Following Design Standards

Build a complete user interface for a new statistical analysis tool that matches the established design system across 30+ existing tools. This ensures consistency, accessibility, and familiarity for students.

**Related Prompts:**
- [create-scenario.md](create-scenario.md) - Write rich marketing case studies for scenario presets
- [add-equation-rendering.md](add-equation-rendering.md) - Implement MathJax mathematical notation
- [add-engagement-tracking.md](add-engagement-tracking.md) - Add user engagement tracking and milestones
- [add-professor-mode.md](add-professor-mode.md) - Add interactive tutorials and educational overlays (advanced)

**Reference Exemplars:**

Before building, review existing tools that demonstrate excellent design for your specific context:

| Tool Type | Exemplar | Path | What to Study |
|-----------|----------|------|---------------|
| **Simple Hypothesis Test** | Welch's t-test | [apps/hypothesis_testing/ind_ttest/](../../../apps/hypothesis_testing/ind_ttest/) | Clean 3-mode toggle (manual/summary/raw), fan chart patterns, APA writeup |
| **Correlation Analysis** | Pearson Correlation | [apps/descriptive/pearson_correlation/](../../../apps/descriptive/pearson_correlation/) | Matrix vs paired upload modes, multi-variable selection |
| **Bivariate Regression** | Simple Linear Regression | [apps/regression/bivariate_regression/](../../../apps/regression/bivariate_regression/) | Predictor type selection (continuous/categorical), reference level UI |
| **Text Analysis** | Sentiment Lab | [apps/text_analysis/sentiment_lab/](../../../apps/text_analysis/sentiment_lab/) | Exceptionally rich educational content, nested `<details>`, callout boxes |
| **Clustering/Segmentation** | k-Means Explorer | [apps/clustering/kmeans/](../../../apps/clustering/kmeans/) | Feature selection checkboxes, elbow/silhouette diagnostics |
| **Probability Calculator** | Compound Event Probability | [apps/probability/compound_event_probability/](../../../apps/probability/compound_event_probability/) | Multi-level educational sections, approximation comparisons |
| **Sample Size Planning** | Sample Size Calculator | [apps/sample_size/sample_size_calculator/](../../../apps/sample_size/sample_size_calculator/) | Dual slider+input, range-to-SD estimation helper |
| **Advanced Causal Inference** | Propensity Score Matching | [apps/advanced/ps_matching/](../../../apps/advanced/ps_matching/) | Multi-column variable grid, reference level selection |
| **Attribution/Path Analysis** | Markov Attribution Lab | [apps/attribution/markov_visualizer/](../../../apps/attribution/markov_visualizer/) | Professor mode toggle, simulation controls with seed |

**How to Use These Exemplars:**
1. Find the tool type closest to what you're building
2. Open the exemplar's HTML file and read the structure
3. Note the mode toggle configuration and input patterns
4. Study the scenario system and educational content depth
5. Copy the pattern, don't reinvent

## Design Philosophy

- **Educational-first** - Every element teaches, not just calculates
- **Progressive disclosure** - Advanced options hidden by default to reduce overwhelm
- **Real-world context** - Marketing scenarios over abstract examples
- **Self-service** - Students can explore independently
- **Professional** - Clean, modern aesthetic builds confidence

---

## 🎨 Design System

### Color Palette (CSS Variables)

```css
:root {
  /* Core colors */
  --app-bg: #f5f7fb;          /* Soft blue-gray background */
  --app-card-bg: #ffffff;      /* Clean white cards */
  --app-text: #1f2a37;         /* Dark charcoal text */
  --app-muted: #5f6b7a;        /* Secondary text */
  --app-border: #d6dfea;       /* Subtle borders */
  
  /* Brand colors */
  --app-accent: #2a7de1;       /* Vibrant blue (primary) */
  --app-accent-dark: #1a5fb4;  /* Darker blue (hover) */
  
  /* Semantic colors */
  --app-success: #2f9d58;      /* Green (positive results) */
  --app-danger: #d64747;       /* Red (errors/warnings) */
  --app-warning: #f3b440;      /* Yellow (caution) */
}
```

**Usage:**
- Background: `var(--app-bg)`
- Cards: `var(--app-card-bg)`  
- Primary buttons: `var(--app-accent)`
- Success messages: `var(--app-success)`

### Typography

```css
body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--app-text);
}

h1 { font-size: 2rem; font-weight: 700; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.25rem; font-weight: 600; }
```

---

## 📐 Essential UI Patterns

### Pattern 1: Hero Header (REQUIRED)

Every tool must start with this exact structure:

```html
<header class="intro hero-header">
  <div class="hero-header__top">
    <h1>Tool Name</h1>
    <div class="hero-context">
      <span class="badge">Category</span>
      <!-- Optional: add additional badges or links -->
    </div>
  </div>
  <p class="hero-header__lede">
    One-sentence value proposition explaining what this tool does and why students would use it.
  </p>
</header>
```

**Purpose:**
- Immediate orientation (what tool am I using?)
- Educational context (what category does this belong to?)
- Value statement (why should I use this?)

**Badge Color Variations:**
```html
<!-- Default blue -->
<span class="badge">Descriptive Statistics</span>

<!-- Custom colors (define in tool's CSS if needed) -->
<span class="badge badge--text-analysis">Text Analysis</span>
<span class="badge-secondary">Optional companion</span>
```

### Pattern 2: Mode Toggle (Data Entry Selection)

For tools with multiple data entry methods:

```html
<section class="card">
  <h2>Data Entry Mode</h2>
  <div class="mode-toggle" role="tablist" aria-label="Data entry mode">
    <button type="button" class="mode-button active" data-mode="manual" 
            role="tab" aria-selected="true">
      📝 Manual Entry
    </button>
    <button type="button" class="mode-button" data-mode="summary-upload" 
            role="tab" aria-selected="false">
      📊 Upload Summary Stats
    </button>
    <button type="button" class="mode-button" data-mode="raw-upload" 
            role="tab" aria-selected="false">
      📂 Upload Raw Data
    </button>
  </div>
</section>
```

**JavaScript Pattern:**
```javascript
document.querySelectorAll('.mode-button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Remove active from all
    document.querySelectorAll('.mode-button').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    
    // Add active to clicked
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    
    // Show/hide corresponding content sections
    const mode = btn.dataset.mode;
    showMode(mode);
  });
});
```

**Common Mode Variations:**
- **Basic tools** (t-test, correlation): Manual + Summary Stats + Raw Data
- **Clustering tools**: Upload + Demo Scenario
- **Advanced tools**: Raw Data only (too complex for manual entry)

### Pattern 3: File Upload Dropzone (CSV/TSV)

For tools accepting data files:

```html
<section class="card" id="upload-section">
  <h2>Upload Your Data</h2>
  
  <!-- Dropzone -->
  <div class="dropzone" id="data-dropzone" role="button" tabindex="0" 
       aria-label="Drop CSV file or click to browse">
    <p class="dropzone-title">📁 Drag & Drop CSV file (.csv, .tsv, .txt)</p>
    <p class="dropzone-note">
      Your file should include column headers. First row = variable names.
    </p>
    <button type="button" id="browse-button" class="secondary">
      Browse files
    </button>
  </div>
  
  <!-- Hidden file input -->
  <input type="file" id="file-input" accept=".csv,.tsv,.txt" hidden>
  
  <!-- REQUIRED: Template download buttons -->
  <div class="template-buttons">
    <button type="button" id="download-template">Download CSV template</button>
  </div>
  
  <!-- Upload feedback -->
  <p class="upload-status" id="upload-feedback" aria-live="polite">
    No file uploaded.
  </p>
</section>
```

**CRITICAL: Template CSV Files**

✅ **EVERY dropzone MUST include a template download button**

Students need examples of correct file formatting. Generate a CSV template showing:
- Exact column headers expected
- 2-3 sample rows with realistic data
- Comments (if format allows) explaining structure

```javascript
document.getElementById('download-template').addEventListener('click', () => {
  const csv = `group,value\nControl,42.3\nTreatment,48.7\nControl,39.1`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_tool_name.csv';
  a.click();
  URL.revokeObjectURL(url);
});
```

**JavaScript Implementation:**
```javascript
const dropzone = document.getElementById('data-dropzone');
const fileInput = document.getElementById('file-input');
const feedback = document.getElementById('upload-feedback');

// Click to browse
dropzone.addEventListener('click', () => fileInput.click());
document.getElementById('browse-button').addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

// Drag and drop
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dropzone--dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dropzone--dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dropzone--dragover');
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

// File selection
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  handleFile(file);
});

function handleFile(file) {
  if (!file) return;
  
  feedback.textContent = `Loading ${file.name}...`;
  feedback.className = 'upload-status';
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = parseCSV(e.target.result); // Use shared csv_utils.js
      feedback.textContent = `✓ Loaded ${file.name} (${data.length} rows)`;
      feedback.className = 'upload-status success';
      processData(data);
    } catch (error) {
      feedback.textContent = `✗ Error: ${error.message}`;
      feedback.className = 'upload-status error';
    }
  };
  reader.readAsText(file);
}
```

**Accessibility:**
- `role="button"` and `tabindex="0"` for keyboard access
- `aria-live="polite"` for screen reader feedback
- Visual feedback on drag-over state

### Pattern 4: Scenario/Preset Selection System

**See also:** [create-scenario.md](create-scenario.md) for guidance on writing rich, realistic marketing case studies.

For tools with pre-built marketing scenarios:

```html
<section class="card">
  <h2>📚 Marketing Scenarios</h2>
  <p class="muted">
    Load a realistic business scenario to explore the analysis, or use your own data.
  </p>
  
  <div class="scenario-controls">
    <label for="scenario-select">Choose a scenario:</label>
    <select id="scenario-select" class="scenario-select">
      <option value="">-- Select a scenario --</option>
      <option value="scenario-1">Ad Campaign ROI Analysis</option>
      <option value="scenario-2">Customer Segmentation Study</option>
      <option value="scenario-3">Pricing Experiment Results</option>
    </select>
    
    <button id="scenario-download" class="secondary hidden">
      ⬇️ Download Scenario Data
    </button>
  </div>
  
  <!-- Dynamic scenario description -->
  <div id="scenario-description" class="scenario-description"></div>
</section>
```

**JavaScript Implementation (CRITICAL: Use Arrow Functions):**

```javascript
// CRITICAL: Use arrow functions to avoid hoisting errors
const SCENARIOS = [
  {
    id: 'scenario-1',
    label: 'Ad Campaign ROI Analysis',
    description: () => generateScenario1Html(),  // Arrow function!
    data: scenario1Data
  },
  {
    id: 'scenario-2',
    label: 'Customer Segmentation Study',
    description: () => generateScenario2Html(),  // Arrow function!
    data: scenario2Data
  }
];

// Scenario selection
document.getElementById('scenario-select').addEventListener('change', (e) => {
  const scenarioId = e.target.value;
  const descEl = document.getElementById('scenario-description');
  const downloadBtn = document.getElementById('scenario-download');
  
  if (!scenarioId) {
    descEl.innerHTML = '';
    downloadBtn.classList.add('hidden');
    return;
  }
  
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  if (scenario) {
    // Call the arrow function to get HTML
    descEl.innerHTML = scenario.description();
    downloadBtn.classList.remove('hidden');
    
    // Load scenario data
    loadScenarioData(scenario.data);
    
    // Track scenario loaded
    if (typeof markScenarioLoaded === 'function') {
      markScenarioLoaded(scenario.label);
    }
  }
});

// Scenario HTML generators (defined AFTER SCENARIOS array)
function generateScenario1Html() {
  return `
    <div class="scenario-content">
      <div class="scenario-header">
        <span class="scenario-icon">📈</span>
        <h4>Ad Campaign ROI Analysis</h4>
        <span class="scenario-badge">52 Weeks</span>
      </div>
      
      <p class="scenario-intro">
        You're analyzing digital ad spend vs. sales for an e-commerce company...
      </p>
      
      <!-- More rich content here -->
    </div>
  `;
}
```

**Why Arrow Functions Matter:**
- Without arrow functions: `description: generateScenario1Html()` executes IMMEDIATELY (before function defined)
- With arrow functions: `description: () => generateScenario1Html()` executes LATER (when scenario selected)

### Pattern 5: Progressive Disclosure (Help Content)

**Philosophy:** Hide advanced/technical content under expandable sections to avoid overwhelming students, while keeping essential info visible.

Use `<details>` for collapsible help content:

```html
<!-- Simple methodology notes (open by default) -->
<details class="intro-notes" open>
  <summary>📖 About This Analysis</summary>
  <p>
    This tool performs [statistical test name] to determine [purpose].
    It is appropriate when [conditions].
  </p>
  <p class="muted">
    <strong>Assumptions:</strong> [list assumptions]
  </p>
</details>

<!-- Interpretation guidance (closed by default) -->
<details class="interpretation-aid">
  <summary>💡 How to Interpret Results</summary>
  <ul>
    <li>If p < 0.05: [interpretation]</li>
    <li>If confidence interval includes 0: [interpretation]</li>
    <li>Effect size considerations: [guidance]</li>
  </ul>
</details>

<!-- Chart reading help -->
<details class="interpretation-aid">
  <summary>📊 How to Read This Chart</summary>
  <p class="muted">
    [Explain axes, colors, patterns to look for]
  </p>
</details>
```

**Advanced: Multi-Level Rich Content**

For complex concepts, use nested structure with tables, callouts, and examples:

```html
<details class="intro-notes">
  <summary>📘 Understanding the Binomial Model</summary>
  <p>The binomial distribution applies whenever you have:</p>
  <ul>
    <li><strong>Fixed trials:</strong> You know in advance how many attempts (n)</li>
    <li><strong>Binary outcomes:</strong> Success or failure only</li>
    <li><strong>Constant probability:</strong> Same p for every trial</li>
    <li><strong>Independence:</strong> One trial doesn't affect others</li>
  </ul>
  
  <!-- Embedded table for comparison -->
  <table style="width:100%; border-collapse:collapse; margin:0.5rem 0;">
    <tr style="background:#f1f5f9;">
      <th style="text-align:left; padding:0.5rem; border:1px solid #e2e8f0;">Score</th>
      <th style="text-align:left; padding:0.5rem; border:1px solid #e2e8f0;">Range</th>
      <th style="text-align:left; padding:0.5rem; border:1px solid #e2e8f0;">What It Means</th>
    </tr>
    <tr>
      <td style="padding:0.5rem; border:1px solid #e2e8f0;"><strong>Compound</strong></td>
      <td style="padding:0.5rem; border:1px solid #e2e8f0;">-1 to +1</td>
      <td style="padding:0.5rem; border:1px solid #e2e8f0;">Overall sentiment score</td>
    </tr>
  </table>
  
  <!-- Callout box for key insight -->
  <div style="background:#f0f9ff; border-left:3px solid #3b82f6; padding:0.75rem; margin-top:0.75rem;">
    <p style="margin:0; font-weight:600; color:#1e40af;">💡 Which score should I use?</p>
    <p style="margin:0.5rem 0 0 0; font-size:0.9rem;">
      For most marketing analyses, focus on the <strong>Compound score</strong>—it's the overall sentiment.
    </p>
  </div>
  
  <!-- Real-world case study -->
  <div style="background:#dcfce7; border-left:4px solid #22c55e; padding:1rem; margin-top:1rem;">
    <strong style="color:#166534;">💡 Real-World Impact</strong>
    <p style="margin:0.5rem 0 0; font-size:0.95rem; color:#14532d;">
      <strong>Case Study:</strong> A SaaS company discovered that "Demo Request" had 45% removal effect
      while "Free Trial" only had 12%, despite appearing in 80% of conversions...
    </p>
  </div>
</details>
```

**Callout Box Styles:**
- Blue (`#f0f9ff` bg, `#3b82f6` border) = Tips, insights, recommendations
- G

### Pattern 7: Multi-Column Variable Selection

For regression, matching, and multivariate analysis tools:

```html
<div class="card variable-selection-panel">
  <h3>Assign Variables</h3>
  <p>Select your outcome (Y) and one or more predictors. Set predictor types and reference levels for categorical variables.</p>
  
  <div class="variable-selectors-grid">
    <!-- Left column: Outcome -->
    <div class="variable-column">
      <label for="outcome-select">Outcome (binary)</label>
      <select id="outcome-select"></select>
      
      <!-- Optional: focal outcome selection -->
      <div id="outcome-focal-wrapper" class="muted small hidden" style="margin-top: 0.5rem;">
        <label for="outcome-focal-select">Focal outcome (treated as 1):</label>
        <select id="outcome-focal-select"></select>
      </div>
      <p id="outcome-coding-note" class="muted" style="margin-top: 0.25rem;"></p>
    </div>
    
    <!-- Right column: Predictors -->
    <div class="variable-column">
      <h4>Predictors</h4>
      <div id="predictor-list" class="predictor-list stacked">
        <!-- Dynamically populated checkboxes/dropdowns -->
      </div>
    </div>
  </div>
  
  <div id="assignment-summary" class="muted"></div>
</div>
```

**JavaScript for Dynamic Population:**
```javascript
function populateVariableSelectors(columns) {
  // Populate outcome dropdown
  const outcomeSelect = document.getElementById('outcome-select');
  outcomeSelect.innerHTML = '<option value="">-- Select outcome --</option>';
  columns.forEach(col => {
    outcomeSelect.innerHTML += `<option value="${col}">${col}</option>`;
  });
  
  // Populate predictor checkboxes
  const predictorList = document.getElementById('predictor-list');
  predictorList.innerHTML = '';
  columns.forEach(col => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label class="predictor-option">
        <input type="checkbox" name="predictor" value="${col}">
        <span>${col}</span>
      </label>
    `;
    predictorList.appendChild(div);
  });
}
```9

### Pattern 8: Reference Level Selection (Categorical Variables)

For regression/matching tools with categorical predictors:

```html
<div id="reference-selector" class="reference-selector">
  <label for="reference-level-select">Reference group for categorical predictor</label>
  <select id="reference-level-select">
    <!-- Dynamically populated from unique values -->
  </select>
  <p class="muted">
    The reference group serves as the baseline; estimates for other levels are interpreted 
    as differences relative to this group throughout the coefficients, plots, and narratives.
  </p>
</div>
```

**When to Use:**
- Regression with categorical predictors (dummy coding)
- ANOVA with group comparisons
- Matching/causal inference with treatment groups
- Any model where one category is the "baseline"

**JavaScript:**
```javascript
function populateReferenceSelector(categoricalValues) {
  const select = document.getElementById('reference-level-select');
  select.innerHTML = '';
  
  // Sort and add options
  const sorted = [...new Set(categoricalValues)].sort();
  sorted.forEach(val => {
    select.innerHTML += `<option value="${val}">${val}</option>`;
  });
  
  // Select first as default
  select.selectedIndex = 0;
}
```reen (`#dcfce7` bg, `#22c55e` border) = Success stories, real-world examples
- Yellow (`#fef3c7` bg, `#f59e0b` border) = Warnings, limitations
- Red (`#fee2e2` bg, `#ef4444` border) = Critical cautions, common mistakes

**CSS Styling:**
```css
details.intro-notes {
  background10 #e7f3ff;
  border: 1px solid #b8daff;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

details summary {
  cursor: pointer;
  font-weight: 600;
  user-select: none;
}

details[open] summary {
  margin-bottom: 0.75rem;
}
```

### Pattern 6: Confidence Level Selection

For hypothesis tests and confidence intervals:

```html
<div class="confidence-controls">
  <label for="confidence-level">Confidence Level:</label>
  <div class="confidence-buttons" role="group" aria-label="Select confidence level">
    <button class="confidence-button" data-level="0.90">90%</button>
    <button class="confidence-button selected" data-level="0.95">95%</button>
    <button class="confidence-button" data-level="0.99">99%</button>
  </div>
</div>
```

**JavaScript:**
```javascript
document.querySelectorAll('.confidence-button').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove selected from all
    document.querySelectorAll('.confidence-button').forEach(b => 
      b.classList.remove('selected'));
    
    // Add to clicked
    btn.classList.add('selected');
    
    // Update analysis
    const level = parseFloat(btn.dataset.level);
    updateConfidenceLevel(level);
  });
});
```

---

## 📊 Results Display Patterns

### Pattern 7: Card-Based Results Layout

Structure results in scannable card sections:

```html
<section class="results-section">
  <h2>📊 Analysis Results</h2>
  
  <!-- Summary statistics card -->
  <article class="card">
    <h3>Summary Statistics</h3>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Sample Size</span>
        <span class="stat-value" id="sample-size">--</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Test Statistic</span>
        <span class="stat-value" id="test-stat">--</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">p-value</span>
        <span class="stat-value" id="p-value">--</span>
      </div>
    </div>
  </article>
  
  <!-- Visualization card -->
  <article class="card">
    <h3>Visualization</h3>
    <div id="chart-container"></div>
    <p class="chart-note muted">
      💡 <strong>Tip:</strong> Hover over points for details. Click legend to toggle series.
    </p>
  </article>
  
  <!-- Interpretation card -->
  <article class="card">
    <h3>Interpretation</h3>
    <div id="interpretation-text"></div>
    <button id="copy-interpretation" class="secondary">
      📋 Copy APA-Style Writeup
    </button>
  </article>
</section>
```

### Pattern 8: Export/Download Functionality

Provide multiple export options:

```html
<div class="export-controls">
  <button id="export-chart" class="secondary">
    📊 Export Chart (PNG)
  </button>
  <button id="export-data" class="secondary">
    📁 Download Data (CSV)
  </button>
  <button id="copy-results" class="secondary">
    📋 Copy Results
  </button>
</div>
```

**JavaScript with Tracking:**
```javascript
document.getElementById('export-chart').addEventListener('click', async () => {
  // Export using Plotly
  Plotly.downloadImage('chart-container', {
    format: 'png',
    filename: 'analysis-chart'
  });
  
  // Track feature usage
  if (typeof logFeatureUsage === 'function') {
    await logFeatureUsage(TOOL_SLUG, 'export_chart', { format: 'png' });
  }
});

document.getElementById('copy-results').addEventListener('click', async () => {
  const text = document.getElementById('interpretation-text').textContent;
  await navigator.clipboard.writeText(text);
  
  // Show feedback (use toast if available)
  showToast('✓ Results copied to clipboard!');
  
  // Track
  if (typeof logFeatureUsage === 'function') {
    await logFeatureUsage(TOOL_SLUG, 'copy_results');
  }
});
```

---

## 🎓 Pedagogical Patterns

### Pattern 11: Equation + Interpretation Pairing

**See also:** [add-equation-rendering.md](add-equation-rendering.md) for comprehensive MathJax implementation guidance.

Always pair mathematical formulas with plain English:

```html
<div class="equation-section">
  <p><strong>Test Statistic:</strong></p>
  \[t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}\]
  
  <p class="interpretation">
    The t-statistic measures how many standard errors the difference between 
    means is away from zero. Larger absolute values indicate stronger evidence 
    against the null hypothesis.
  </p>
</div>
```

### Pattern 12: APA-Style Narrative Writeup

Generate academic writing examples:

```javascript
function generateAPAWriteup(results) {
  const { test, statistic, df, pValue, ci, n } = results;
  
  let writeup = `An independent samples t-test was conducted to compare `;
  writeup += `[outcome variable] between [group 1] and [group 2] `;
  writeup += `(n = ${n}). `;
  
  if (pValue < 0.05) {
    writeup += `The difference was statistically significant, `;
  } else {
    writeup += `The difference was not statistically significant, `;
  }
  
  writeup += `t(${df}) = ${statistic.toFixed(2)}, `;
  writeup += `p ${pValue < 0.001 ? '< .001' : '= ' + pValue.toFixed(3)}, `;
  writeup += `95% CI [${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}].`;
  
  return writeup;
}
```

### Pattern 13: Professor Mode Toggle (ADVANCED FEATURE)

**⚠️ IMPLEMENTATION TIMING: DO NOT implement Professor Mode until the core tool is fully working and tested.**

**See also:** [add-professor-mode.md](add-professor-mode.md) for complete implementation details, quiz systems, and dynamic tutorial generation.

Professor Mode adds an educational overlay with tutorials, methodology explanations, and interactive learning elements. This is a polish feature, not a launch requirement.

```html
<header class="intro hero-header">
  <div class="hero-header__top">
    <h1>Tool Name</h1>
    <div class="hero-context">
      <span class="badge">Category</span>
      
      <!-- Professor Mode toggle -->
      <label class="toggle_switch" style="margin-left: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer;">
        <input type="checkbox" id="professorMode">
        <span style="font-size: 0.9rem; font-weight: 600; color: #4b5563;">🎓 Professor Mode</span>
      </label>
    </div>
  </div>
  <p class="hero-header__lede">Brief description...</p>
</header>
```

**JavaScript Activation:**
```javascript
document.getElementById('professorMode').addEventListener('change', (e) => {
  const isActive = e.target.checked;
  
  if (isActive) {
    // Show tutorial overlays, methodology cards, step-by-step guides
    document.querySelectorAll('.professor-content').forEach(el => {
      el.classList.remove('hidden');
    });
  } else {
    // Hide educational overlays
    document.querySelectorAll('.professor-content').forEach(el => {
      el.classList.add('hidden');
    });
  }
});
```

**What Professor Mode Adds:**
- Step-by-step methodology walkthroughs
- Interactive calculations showing work
- "Why does this matter?" business context
- Common mistakes and how to avoid them
- Conceptual explanations before technical details

**DO NOT implement this until:**
- ✅ Core tool calculations are correct
- ✅ All visualizations work properly
- ✅ User can complete typical workflows successfully
- ✅ You're satisfied with the base experience

### Pattern 14: Simulation Controls (For Random Data Generation Tools)

**Use ONLY for tools with random/simulated datasets** (e.g., sampling visualizers, probability simulators). Skip this for tools using fixed scenario data.

```html
<details style="background:white; border:1px solid #e2e8f0; border-radius:6px; padding:0.5rem;">
  <summary style="cursor:pointer; font-weight:500;">⚙️ Simulation Parameters</summary>
  
  <div style="margin-top:0.75rem; display:flex; flex-direction:column; gap:0.75rem;">
    <!-- Reroll button -->
    <button id="reroll-btn" style="width:100%; padding:8px; cursor:pointer;">
      <span>🎲</span> <strong>Generate New Random Data</strong>
    </button>
    
    <!-- Seed for reproducibility -->
    <div style="background:#f8fafc; padding:0.75rem; border-radius:4px;">
      <label for="random-seed" style="display:block; font-weight:600; margin-bottom:6px;">
        Seed (for Reproducibility)
      </label>
      <div style="display:flex; gap:6px;">
        <input type="text" id="random-seed" placeholder="Random" style="flex:1; padding:6px;">
        <button id="apply-seed-btn" style="padding:6px 12px;">Set</button>
      </div>
      <p style="margin:6px 0 0 0; font-size:0.75rem; color:#64748b;">
        Enter a number (e.g. "123") to get the exact same results every time. 
        Useful for classroom demos.
      </p>
    </div>
  </div>
</details>
```

**JavaScript:**
```javascript
let currentSeed = null;

document.getElementById('reroll-btn').addEventListener('click', () => {
  currentSeed = null; // Clear seed
  generateRandomData();
});

document.getElementById('apply-seed-btn').addEventListener('click', () => {
  const seedInput = document.getElementById('random-seed');
  currentSeed = parseInt(seedInput.value) || null;
  generateRandomData(currentSeed);
});

function generateRandomData(seed = null) {
  if (seed !== null) {
    // Use seeded random number generator (implement or use library)
    Math.seedrandom(seed);
  }
  // Generate data...
}
```

**When to Include:**
- Sampling distribution visualizers
- Monte Carlo simulations
- Probability experiments
- Power analysis demos

**When to SKIP:**
- Tools with fixed marketing scenarios
- Real data upload tools
- Manual entry only tools

---

## ♿ Accessibility Requirements

### Semantic HTML
✅ Use proper heading hierarchy (`<h1>` → `<h2>` → `<h3>`)  
✅ Use `<button>` for actions, `<a>` for navigation  
✅ Use `<label>` for all form inputs  
✅ Use `<section>`, `<article>`, `<nav>` appropriately

### ARIA Labels
```html
<!-- For dropzones -->
<div role="button" tabindex="0" aria-label="Drop CSV file or click to browse">

<!-- For live regions -->
<p aria-live="polite" aria-atomic="true" id="status-message"></p>

<!-- For tab systems -->
<div role="tablist" aria-label="Data entry mode">
  <button role="tab" aria-selected="true">Manual</button>
  <button role="tab" aria-selected="false">Upload</button>
</div>
```

### Keyboard Navigation
```javascript
// Make dropzone keyboard-accessible
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});
```

### Color Contrast
All text must meet **WCAG AA standards** (4.5:1 for normal text, 3:1 for large text):
- Dark text on light background: ✅ `#1f2a37` on `#ffffff` (14.8:1)
- Primary button: ✅ `#ffffff` on `#2a7de1` (4.7:1)
- Success green: ✅ `#2f9d58` (sufficient on white)

---

## 📱 Responsive Design

### Mobile-First Grid

```css
/* Default: Single column */
.results-grid {
  display: grid;
  gap: 1.5rem;
}

/* Tablet: 2 columns */
@media (min-width: 768px) {
  .results-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop: 3 columns */
@media (min-width: 1024px) {
  .results-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Touch-Friendly Targets

```css
/* Minimum 44x44px for touch */
button, .mode-button, .confidence-button {
  min-height: 44px;
  padding: 0.75rem 1.5rem;
}
```

---

## 🔧 Required External Resources

### Must Include in `<head>`:

```html
<!-- Shared CSS -->
<link rel="stylesheet" href="../../../shared/css/main.css">
<link rel="stylesheet" href="../../../shared/css/auth_bar.css">

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

<!-- MathJax (if equations needed) -->
<script id="MathJax-script" async 
  src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>

<!-- Plotly (for interactive charts) -->
<script src="https://cdn.plot.ly/plotly-2.26.0.min.js"></script>
```

### Must Include before closing `</body>`:

```html
<!-- Auth & Tracking -->
<script src="../../../shared/js/auth_tracking.js"></script>

<!-- CSV Utilities (if file upload) -->
<script src="../../../shared/js/csv_utils.js"></script>

<!-- Other Shared Utilities (include as needed) -->
<!-- <script src="../../../shared/js/stats_utils.js"></script> --> <!-- Statistical functions -->
<!-- <script src="../../../shared/js/ui_utils.js"></script> --> <!-- UI helpers -->
<!-- <script src="../../../shared/js/predictor_utils.js"></script> --> <!-- Variable selection for regression -->
<!-- <script src="../../../shared/js/fan_chart_utils.js"></script> --> <!-- Fan chart visualizations -->

<!-- Tool-specific JS -->
<script src="main_toolname.js"></script>
```

---

## 📊 Tracking Implementation

**See also:** [add-engagement-tracking.md](add-engagement-tracking.md) for complete engagement tracking patterns, milestones, and analytics integration.

### Initialize on Page Load

```javascript
const TOOL_SLUG = 'your-tool-slug';  // Use kebab-case

document.addEventListener('DOMContentLoaded', () => {
  // Initialize engagement tracking
  if (typeof initEngagementTracking === 'function') {
    initEngagementTracking(TOOL_SLUG);
  }
});
```

- ✅ **ALWAYS include template CSV download with every dropzone**
- ✅ Hide advanced content under expandable `<details>` sections
- ✅ Use rich callout boxes for key insights (blue/green/yellow/red)
- ✅ Add reference level selectors for categorical models

**DON'T:**
- ❌ Create custom CSS that conflicts with main.css
- ❌ Skip accessibility features
- ❌ Ignore mobile responsiveness
- ❌ Forget to initialize tracking
- ❌ Use inline styles
- ❌ Create inaccessible color combinations
- ❌ **Implement Professor Mode before core tool works**
- ❌ Add simulation controls to fixed-data tools
- ❌ Overwhelm students with too much visible content at once
// When file uploaded
if (typeof markDataUploaded === 'function') {
  markDataUploaded(file.name);
}

// When analysis runs
if (typeof markRunAttempted === 'function') {
  markRunAttempted();
}

// When analysis completes successfully
if (typeof markRunSuccessful === 'function') {
  markRunSuccessful({
    n: data.length,
    test_type: 'independent-t-test',
    significant: pValue < 0.05
  }, `t(${df}) = ${tStat.toFixed(2)}, p = ${pValue.toFixed(3)}`);
}

// When feature used
if (typeof logFeatureUsage === 'function') {
## 🎨 Optional Enhancements

### Dual Slider + Number Input

For probability/proportion parameters, consider adding both a slider (for rough tuning) and number input (for precision):

```html
<label for="prop-p-input">Expected proportion p</label>
<div class="row">
  <input id="prop-p-range" type="range" min="0" max="1" step="0.01" value="0.20">
  <input id="prop-p-input" type="number" min="0" max="1" step="0.01" value="0.20">
</div>
```

**JavaScript to sync:**
```javascript
const slider = document.getElementById('prop-p-range');
const input = document.getElementById('prop-p-input');

slider.addEventListener('input', (e) => {
  input.value = e.target.value;
  updateAnalysis();
});

input.addEventListener('input', (e) => {
  slider.value = e.target.value;
  updateAnalysis();
});
```

**When to use:** 0-1 probability parameters where visual adjustment + precise entry both have value. Not required, but nice UX when sliders are used.

---

**Reference:** Design patterns established across 30+ statistical tools (January 2026)

**Version:** 1.1 (Updated January 30, 2026 with advanced patterns from tool audit
}
```

---

## 📋 Implementation Checklist

### Setup Phase
- [ ] Create folder structure: `apps/category/tool_name/`
- [ ] Create files: `main_toolname.html`, `main_toolname.css`, `main_toolname.js`
- [ ] Include shared CSS and JS resources
- [ ] Set up Google Analytics and MathJax (if needed)

### HTML Structure
- [ ] Add hero header with badge
- [ ] Add auth bar (if user-facing tool)
- [ ] Add mode toggle (if multiple entry methods)
- [ ] Add file dropzone (if accepts uploads)
- [ ] Add scenario selector (if has presets)
- [ ] Add progressive disclosure help sections
- [ ] Structure results in cards
- [ ] Add export buttons

### Styling
- [ ] Use CSS variables from design system
- [ ] Apply card containers with `.card` class
- [ ] Style buttons consistently (`.primary`, `.secondary`)
- [ ] Add responsive grid layouts
- [ ] Test mobile view (< 768px width)
- [ ] Verify color contrast (WCAG AA)

### Accessibility
- [ ] Semantic HTML structure
- [ ] ARIA labels for interactive elements
- [ ] Keyboard navigation support
- [ ] Focus styles visible
- [ ] Alt text for any images
- [ ] Live regions for dynamic content

### JavaScript Functionality
**Examples:** [Pearson Correlation](../../../apps/descriptive/pearson_correlation/), [Welch's t-test](../../../apps/hypothesis_testing/ind_ttest/)
- Emphasize manual entry mode
- Include summary stats upload
- Simpler scenario descriptions (text-based OK)
- Fan chart visualizations for confidence intervals

### For Intermediate Tools (Regression, ANOVA)
**Examples:** [Bivariate Regression](../../../apps/regression/bivariate_regression/), [One-Way ANOVA](../../../apps/hypothesis_testing/onewayanova/)
- Raw data upload primary
- Variable selection UI with predictor type controls
- Reference level selection for categorical predictors
- Rich scenario system preferred

### For Advanced Tools (Clustering, Neural Networks)
**Examples:** [k-Means Clustering](../../../apps/clustering/kmeans/), [Propensity Score Matching](../../../apps/advanced/ps_matching/)
- Raw data upload only (too complex for manual)
- Variable type detection/selection with multi-column grids
- Workflow stepper for multi-step processes
- Diagnostic visualizations (elbow plots, balance checks)

### For Text Analysis Tools
**Examples:** [Sentiment Lab](../../../apps/text_analysis/sentiment_lab/), [Theme Extractor](../../../apps/text_analysis/theme_extractor/)
- Different file formats (TXT, not just CSV)
- Text preview panel showing sample records
- Theme/sentiment visualizations with word clouds or bar charts
- Per-record scoring with aggregated summaries

### For Probability/Simulation Tools
**Examples:** [Compound Event Probability](../../../apps/probability/compound_event_probability/), [Sampling Visualizer](../../../apps/sample_size/sampling_visualizer/)
- Simulation controls with reproducible seeds
- Approximation comparisons (exact vs normal vs Poisson)
- Interactive parameter adjustment with immediate feedback
- Rich educational content explaining distributions

### For Sample Size/Planning Tools
**Examples:** [Sample Size Calculator](../../../apps/sample_size/sample_size_calculator/), [A/B Test Calculator](../../../apps/sample_size/sample_size_AB_calculator/)
- Dual slider+number input for parameters
- Estimation helpers (range-to-SD conversion)
- Power curves and sensitivity analysis
- Mode toggle for different outcome types (mean/proportion)
---

## 🎯 Tool-Specific Adaptations

### For Simple Tools (Correlation, t-test)
- Emphasize manual entry mode
- Include summary stats upload
- Simpler scenario descriptions (text-based OK)

### For Intermediate Tools (Regression, ANOVA)
- Raw data upload primary
- Variable selection UI
- Rich scenario system preferred

### For Advanced Tools (Clustering, Neural Networks)
- Raw data upload only (too complex for manual)
- Variable type detection/selection
- Workflow stepper for multi-step processes

### For Text Analysis Tools
- Different file formats (TXT, not just CSV)
- Text preview panel
- Theme/sentiment visualizations

---

## 💡 Best Practices

**DO:**
- ✅ Follow existing patterns (don't reinvent)
- ✅ Test on mobile before committing
- ✅ Use arrow functions for scenario descriptions
- ✅ Track user engagement events
- ✅ Provide multiple export options
- ✅ Include help content throughout

**DON'T:**
- ❌ Create custom CSS that conflicts with main.css
- ❌ Skip accessibility features
- ❌ Ignore mobile responsiveness
- ❌ Forget to initialize tracking
- ❌ Use inline styles
- ❌ Create inaccessible color combinations

---

## 📚 Example File Structure

```
apps/hypothesis_testing/new_test_tool/
├── main_new_test.html      # Main interface
├── main_new_test.css       # Tool-specific styles
├── main_new_test.js        # Tool logic
├── scenarios.js            # Scenario data (optional separate file)
└── README.md               # Tool documentation
```

---

## Quick Start Template

See the actual template in the examples section below for a minimal starting point that includes:
- Hero header
- Mode toggle
- File dropzone
- Results section
- Export buttons
- Tracking initialization

---

**Reference:** Design patterns established across 30+ statistical tools (January 2026)
