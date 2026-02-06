---
name: Add Professor Mode Tutorial
description: Implement guided tutorial system with interactive quizzes for a statistical analysis tool
---

# Add Professor Mode Tutorial to Tool

Implement a step-by-step interactive tutorial system ("Professor Mode") for the specified statistical tool. This system provides guided walkthroughs with highlighting, quizzes, and progress tracking.

## What You'll Create

A tutorial system consisting of:
- Interactive sidebar with step-by-step instructions
- Visual element highlighting showing students where to look
- Quiz questions that validate understanding
- Dynamic quizzes that pull from actual model results
- Progress tracking and completion analytics

## 🎨 Professor Mode Banner (Required UI Pattern)

**Every tool with Professor Mode must include a banner card placed immediately after the hero header.** This provides discoverability and explains the feature to students.

### Required HTML Structure

Place this immediately after your `</header>` (hero header) tag:

```html
<!-- Professor Mode Banner -->
<div class="professor-mode-banner">
    <div class="professor-mode-content">
        <div class="professor-mode-info">
            <h3>👨‍🏫 Professor Mode: Guided Learning Experience</h3>
            <p>New to [TOOL NAME]? Enable Professor Mode for step-by-step guidance through [BRIEF DESCRIPTION OF WHAT THEY'LL LEARN]!</p>
        </div>
        <label class="professor-mode-toggle">
            <input type="checkbox" id="professorMode">
            <span>Enable Professor Mode</span>
        </label>
    </div>
</div>
```

### Visual Design (Handled by Shared CSS)

The banner automatically gets:
- **Gradient blue background** (`linear-gradient(135deg, #2563eb 0%, #1e40af 100%)`)
- **Flexbox layout** with info on left, toggle button on right
- **Pill-style toggle** with semi-transparent hover effects
- **Mobile responsive** (stacks vertically on screens < 768px)
- **Max-width: 1200px** with auto margins for centering

All styles are in `shared/css/main.css` — do NOT add banner CSS to your app's stylesheet.

### Customization Points

| Element | What to Customize |
|---------|-------------------|
| `<h3>` title | Keep the emoji and "Professor Mode: Guided Learning Experience" text **unchanged** |
| `<p>` description | Replace `[TOOL NAME]` with your tool name and `[BRIEF DESCRIPTION]` with what students will learn |
| Checkbox ID | Always use `id="professorMode"` (required for JavaScript hook) |

### Examples

**Decision Tree Classifier:**
```html
<p>New to decision trees? Enable Professor Mode for step-by-step guidance through building and interpreting your first tree!</p>
```

**Logistic Regression:**
```html
<p>New to logistic regression? Enable Professor Mode for step-by-step guidance through fitting and interpreting your first binary classifier!</p>
```

**Conjoint Analysis:**
```html
<p>New to conjoint analysis? Enable Professor Mode for step-by-step guidance through understanding customer preferences and calculating willingness-to-pay!</p>
```

### Page Structure Reference

```
┌─────────────────────────────────────────┐
│  Hero Header (.hero-header)             │
│  - Tool title, lede text                │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Professor Mode Banner                  │ ← INSERT HERE
│  (.professor-mode-banner)               │
│  ┌─────────────────────┬──────────────┐ │
│  │ 👨‍🏫 Title + Desc    │ [✓] Enable   │ │
│  └─────────────────────┴──────────────┘ │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Overview Section / First Content       │
│  (.test-overview or similar)            │
└─────────────────────────────────────────┘
```

### ⚠️ Common Mistakes

| ❌ Don't | ✅ Do |
|----------|-------|
| Place banner inside the hero header | Place banner immediately **after** closing `</header>` tag |
| Use custom colors or styles | Use the default gradient from shared CSS |
| Change the h3 title structure | Keep "👨‍🏫 Professor Mode: Guided Learning Experience" |
| Use a different checkbox ID | Always use `id="professorMode"` |
| Add banner CSS to app stylesheet | All banner styles are in `shared/css/main.css` |

## Core Architecture

Create a tutorial object with this structure:

```javascript
const ToolNameTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,
    
    steps: [
        {
            id: 'step_id',
            title: "Step Title",
            targetId: 'html-element-id',  // For auto-highlighting
            content: `<p>HTML content for sidebar</p>`,
            getDynamicQuizzes: () => { /* optional */ },
            quizzes: [ /* fallback static quizzes */ ],
            check: () => { /* completion criteria */ },
            onEnter: () => { /* setup when entering step */ }
        }
    ],
    
    init() { /* initialize tutorial */ },
    start() { /* activate tutorial */ },
    stop() { /* deactivate tutorial */ },
    updateView() { /* render current step */ },
    checkQuiz() { /* validate quiz answers */ },
    nextStep() { /* advance to next step */ }
};
```

## 🚨 CRITICAL: Quiz Regeneration Bug Prevention

**THE PROBLEM:** If `getDynamicQuizzes()` is called multiple times, data availability can change between calls, causing quiz questions and answers to mismatch.

**THE SOLUTION:** Generate quizzes ONCE and store them.

```javascript
// In updateView() - Generate ONCE and STORE
updateView() {
    const step = this.steps[this.currentStep];
    
    let quizzes = step.quizzes || [];
    if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
        const dynamicQuizzes = step.getDynamicQuizzes();
        if (dynamicQuizzes && dynamicQuizzes.length > 0) {
            quizzes = dynamicQuizzes;
        }
    }
    
    // CRITICAL: Store resolved quizzes on step object
    step.currentQuizzes = quizzes;
    
    // Use 'quizzes' variable for HTML generation
}

// In checkQuiz() - REUSE stored quizzes
checkQuiz(qIndex, selectedIndex) {
    const step = this.steps[this.currentStep];
    
    // CRITICAL: Use stored quizzes, don't regenerate
    const quizzes = step.currentQuizzes || step.quizzes || [];
    
    // Check answer against stored quizzes[qIndex]
}
```

## 🚨 CRITICAL: Model Data Preparation

**THE PROBLEM:** Dynamic quizzes try to read properties that don't exist or have inconsistent names.

**THE SOLUTION:** Calculate and attach ALL needed properties immediately after model fitting.

### Step 1: Calculate Properties After Model Fitting

```javascript
function updateResults() {
    const model = buildModel();  // Fit the model
    
    // IMMEDIATELY calculate additional properties for tutorial
    const modelPVal = Number.isFinite(model.modelChi2) && model.dfModel > 0
        ? 1 - chiSquareCdf(model.modelChi2, model.dfModel)
        : NaN;
    model.modelPValue = modelPVal;  // Attach to model object
    
    // Calculate confusion matrix at default threshold
    const cmData = calculateConfusionMatrix(model, 0.5);
    if (cmData) {
        // Attach as 2D array: [[TN, FP], [FN, TP]]
        model.confusionMatrix = [
            [cmData.TN, cmData.FP],  // actual = 0
            [cmData.FN, cmData.TP]   // actual = 1
        ];
        model.accuracy = cmData.accuracy;
        model.sensitivity = cmData.sensitivity;
        model.specificity = cmData.specificity;
    }
    
    // THEN sync to window
    window.lastModel = model;
}
```

### Step 2: Use Nullish Coalescing for Property Access

```javascript
getDynamicQuizzes: () => {
    const model = window.lastModel;
    if (!model) return null;
    
    // Check multiple possible property names
    const pValue = model.modelPValue ?? model.pValue ?? model.p_value ?? model.modelP;
    const pseudoR2 = model.pseudoR2 ?? model.mcFaddenR2 ?? model.pseudo_r2 ?? model.r2_mcfadden;
    
    if (pValue === undefined || pseudoR2 === undefined) {
        return null;  // Use fallback quizzes
    }
    
    // Generate dynamic quizzes with actual values
    return [ /* quiz objects */ ];
}
```

### Step 3: Return `null` (NOT `[]`) When Data Unavailable

```javascript
getDynamicQuizzes: () => {
    if (!model || !model.requiredProperty) {
        return null;  // Signals: use fallback quizzes
    }
    
    // If you return [] (empty array), no quizzes display at all!
    // If you return null, step.quizzes fallback is used
}
```

## 🚨 CRITICAL: Avoid Duplicate Variable Declarations

**THE PROBLEM:** JavaScript throws `SyntaxError` if you use `const` for the same variable name multiple times in the same scope.

**THE SOLUTION:**

**Option A: Store on model object once, reuse everywhere**
```javascript
function updateResults() {
    const model = buildModel();
    
    // Calculate ONCE and attach to model
    model.modelPValue = Number.isFinite(model.modelChi2) && model.dfModel > 0
        ? 1 - chiSquareCdf(model.modelChi2, model.dfModel)
        : NaN;
    
    // Later, just use it directly
    const summaryText = `p=${formatP(model.modelPValue)}`;  // No redeclaration
}
```

**Option B: Use different variable names**
```javascript
function updateResults() {
    const modelPVal = calculatePValue(model);
    model.modelPValue = modelPVal;
    
    // Later, use different name
    const pValueForLogging = model.modelPValue;
}
```

## Dynamic Quizzes Pattern

Always provide both dynamic and fallback quizzes:

```javascript
{
    id: 'interpret-pvalue',
    title: "Interpret Model Significance",
    getDynamicQuizzes: () => {
        const model = window.lastModel;
        
        // Early return if data unavailable
        if (!model || !model.modelPValue) return null;
        
        // Extract values
        const pValue = model.modelPValue;
        const displayValue = pValue < 0.001 ? "< 0.001" : pValue.toFixed(3);
        
        // Generate questions with actual values
        return [
            {
                question: `The model p-value is ${displayValue}. Is the model statistically significant at α=0.05?`,
                options: [
                    "Yes, because p < 0.05",
                    "No, because p > 0.05",
                    "Cannot determine from p-value alone"
                ],
                answer: pValue < 0.05 ? 0 : 1,
                feedback: pValue < 0.05 
                    ? `Correct! With p=${displayValue} < 0.05, the model is statistically significant.`
                    : `Correct! With p=${displayValue} > 0.05, the model is not statistically significant.`
            }
        ];
    },
    quizzes: [
        // Fallback conceptual questions that work without live data
        {
            question: "What does the model p-value tell us?",
            options: [
                "Whether the overall model is better than a null model",
                "The accuracy of predictions",
                "The correlation between variables"
            ],
            answer: 0,
            feedback: "Correct! The model p-value tests if the overall model explains significantly more variance than a model with no predictors."
        }
    ]
}
```

## Task Instructions Guidelines

**✅ DO:**
- Reference things students can actually see in the UI
- Use specific element names that match the interface.
- When creating highlight regions on the UT for a particular step in the Professor Mode, be sure that the full relevant region is highlighted instead of some parts accidentally shaded.  You may need to add new region definitions to the code to facilitate this.
- Ask students to observe patterns, not memorize numbers
- Provide clear visual targets (e.g., "Look at the highlighted panel")

**❌ DON'T:**
- Ask students to verify values in console or DevTools
- Reference internal variable names not visible to users
- Require students to check properties not displayed
- Use vague descriptions like "the table" when there are multiple tables

**GOOD EXAMPLE:**
```javascript
content: `
    <p class="task">👉 <strong>Task:</strong> Look at the highlighted 
    <strong>Model Metrics</strong> panel and find the <strong>Model p-value</strong> row. 
    Note whether it's less than 0.05 (statistically significant).</p>
`
```

**BAD EXAMPLE:**
```javascript
content: `
    <p class="task">👉 <strong>Task:</strong> Check that the outcome variable has 
    exactly 2 unique values in the console.</p>  // ❌ Not visible in UI!
`
```

## 🚨 CRITICAL: Highlight Region Planning

**THE PROBLEM:** Tutorials repeatedly highlight regions that are too narrow—targeting a heading when the student needs to see the entire section, or targeting a single input when they need to see the surrounding context, instructions, and related values.

**ROOT CAUSE:** Defaulting to existing HTML element IDs that were created for other purposes (accessibility, JS hooks, anchor links) rather than for tutorial highlighting.

**THE SOLUTION:** Plan highlight regions BEFORE writing step code. Create new wrapper IDs when necessary.

### Step 1: Map Content Requirements First

For EACH tutorial step, answer these questions BEFORE choosing a `targetId`:

1. **What does the sidebar content instruct them to read/do?**
2. **What quiz questions will they answer?**
3. **What UI elements contain the answers to those questions?**
4. **What surrounding context (labels, descriptions, related values) do they need?**

### Step 2: Audit the HTML for Suitable Containers

Look for existing IDs that encompass the FULL region. If none exist, **CREATE ONE**.

```html
<!-- BEFORE: No suitable ID exists -->
<section class="test-overview">
  <h2 id="overview-heading">CONCEPT</h2>   <!-- ❌ Too narrow -->
  <div class="card">
    <p>The Problem: ...</p>
    <p>The Solution: ...</p>
    <details>Key Terms...</details>
  </div>
</section>

<!-- AFTER: Add tutorial-appropriate wrapper ID -->
<section class="test-overview" id="tut-concept-section">  <!-- ✅ Encompasses all -->
  <h2 id="overview-heading">CONCEPT</h2>
  <div class="card">
    <p>The Problem: ...</p>
    <p>The Solution: ...</p>
    <details>Key Terms...</details>
  </div>
</section>
```

### Step 3: Use `tut-` Prefix Convention

To distinguish tutorial-specific IDs from functional IDs, use the `tut-` prefix:

- `tut-concept-section` → Tutorial highlight for concept overview
- `tut-data-stats-panel` → Tutorial highlight for raw data statistics
- `tut-coalition-controls` → Tutorial highlight for coalition builder area

This makes it clear which IDs exist solely for tutorial purposes.

### Step 4: Verify Quiz ↔ Highlight Alignment

**CHECKLIST before finalizing each step:**

- [ ] If the quiz asks "What is the conversion rate?", does the highlight include where that value is displayed?
- [ ] If instructions say "Toggle the Social button", does the highlight include that button?
- [ ] If they need to "read about the problem", does the highlight include ALL explanatory text?
- [ ] Can the student answer every quiz question by looking ONLY at the highlighted region?

### Common Mistakes to Avoid

| ❌ Mistake | ✅ Correct Approach |
|-----------|--------------------|
| Target a `<h2>` heading ID | Target the parent `<section>` that contains heading + content |
| Target an `<input>` or `<select>` | Target the container `<div>` that includes label + input + helper text |
| Target a single stat like `id="total-paths"` | Target the stats panel container that shows all relevant metrics |
| Reuse existing IDs not designed for highlighting | Create new `tut-*` wrapper IDs as needed |

### Example: Before vs. After

**Before (Too Narrow):**
```javascript
{
    id: 'intro',
    title: "Concept & Intuition",
    targetId: 'overview-heading',  // ❌ Only highlights the <h2> text!
    content: `<p>Read the Problem, Solution, and Key Terms below.</p>`,
    quizzes: [{ question: "What is the Shapley Value?", ... }]
}
```

**After (Properly Scoped):**
```javascript
{
    id: 'intro',
    title: "Concept & Intuition",
    targetId: 'tut-concept-section',  // ✅ Highlights entire section
    content: `<p>Read the Problem, Solution, and Key Terms below.</p>`,
    quizzes: [{ question: "What is the Shapley Value?", ... }]
}
```

With corresponding HTML change:
```html
<section class="test-overview" id="tut-concept-section">
  <!-- All content now highlighted together -->
</section>
```

## Highlighting Strategy

**Option 1: Automatic (Preferred)**
```javascript
{
    targetId: 'element-id',  // System handles highlighting automatically
    onEnter: () => {
        // Just scroll into view
        const element = document.getElementById('element-id');
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
```

**Option 2: Manual (Only if needed)**
```javascript
{
    targetId: null,  // Disable automatic highlighting
    onEnter: () => {
        // Custom highlighting logic
        const element = document.getElementById('element-id');
        if (element) {
            element.style.outline = '3px solid #10b981';
            element.style.outlineOffset = '4px';
        }
    }
}
```

⚠️ **GOTCHA:** If you use both `targetId` AND manual outline styling, you might get double highlights or conflicts. Pick one approach per step.

## Container Element Strategy

When multiple related elements need highlighting together, wrap them in a container:

**HTML:**
```html
<article class="chart-card" id="confusion-matrix-card">
    <h3>Confusion Matrix</h3>
    <div id="plot-confusion-matrix"><!-- chart --></div>
    <div class="metrics-panel" id="classification-metrics-panel">
        <!-- metrics -->
    </div>
</article>
```

**Tutorial:**
```javascript
{
    targetId: 'confusion-matrix-card',  // Highlights entire card
    // Both chart and metrics are highlighted together
}
```

## Completion Tracking

Add analytics tracking when students finish the tutorial:

```javascript
stop() {
    this.isActive = false;
    document.body.classList.remove('tutorial-active');
    document.getElementById('tutorial-sidebar').classList.remove('active');
    this.hideOverlay();
    
    // Track completion if student finished all steps
    if (this.currentStep === this.steps.length - 1) {
        if (typeof logToolRunToBackend === 'function') {
            logToolRunToBackend(
                { action: 'tutorial_completed', tool: 'TOOL_SLUG' },
                'Professor Mode tutorial completed for [Tool Name]'
            );
        }
    }
    
    // Uncheck the checkbox
    const checkbox = document.getElementById('professorMode');
    if (checkbox) checkbox.checked = false;
}
```

**REQUIREMENTS:**
- Only log if student reached final step
- Use existing `logToolRunToBackend()` for consistency
- Only tracks logged-in students (backend handles auth)

## Implementation Checklist

### Setup Phase
- [ ] Create tutorial object with required methods
- [ ] Add Professor Mode Banner after hero header (see "Professor Mode Banner" section above)
- [ ] Add sidebar HTML container (use standard structure)
- [ ] Add overlay HTML container
- [ ] Add comment to app CSS pointing to `shared/css/main.css` (DO NOT duplicate CSS)
- [ ] Verify `shared/css/main.css` is linked in your HTML

### Step Definition Phase
- [ ] Define all steps with `id`, `title`, `targetId`, `content`
- [ ] Add HTML IDs to elements you want to highlight
- [ ] Write task instructions that reference visible UI elements only
- [ ] Define `check()` functions for completion criteria
- [ ] Define `onEnter()` functions for scrolling/setup

### Quiz Implementation Phase
- [ ] Identify which values should pull from live model
- [ ] Ensure those values are calculated and attached to model BEFORE `window.lastModel` sync
- [ ] Write `getDynamicQuizzes()` functions that return `null` when data unavailable
- [ ] Write fallback `quizzes` arrays with conceptual questions
- [ ] Use nullish coalescing (`??`) for property names that might vary
- [ ] Transform data to expected formats (e.g., 2D arrays)

### Quiz Storage Architecture
- [ ] Store resolved quizzes in `step.currentQuizzes` during `updateView()`
- [ ] Use stored quizzes in `checkQuiz()` - never regenerate
- [ ] Initialize `step.quizState` array to track completion

### Testing Phase
- [ ] Open browser console
- [ ] Enable Professor Mode
- [ ] Advance through each step
- [ ] Verify dynamic quiz questions show actual model values
- [ ] Verify fallback quizzes appear when model data unavailable
- [ ] Verify highlighting works correctly
- [ ] Verify no JavaScript errors
- [ ] Test completion tracking (if logged in)

### Debugging Checklist
- [ ] Check for duplicate `const` declarations (search entire file)
- [ ] Verify model properties exist when dynamic quizzes run
- [ ] Check that data transformations match tutorial expectations
- [ ] Verify `getDynamicQuizzes()` returns `null` (not `[]`) for fallbacks
- [ ] Check console logs for missing properties
- [ ] Verify quizzes aren't regenerated between display and checking

## Common Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Identifier 'variableName' has already been declared" | Using `const` for same variable name multiple times in same scope | Store on object once, reuse directly; OR use different variable names |
| "Cannot read properties of undefined (reading 'property')" | Trying to access property on undefined object | Add safe guards (`model?.property` or `if (model && model.property)`) |
| "Quiz questions not displaying" | `getDynamicQuizzes()` returning `[]` instead of `null` | Return `null` when data unavailable to trigger fallback |
| "Quiz answers marked wrong even though correct" | Quiz regeneration between display and checking | Store quizzes in `step.currentQuizzes`, use stored version in `checkQuiz()` |
| "Dynamic quiz showing 'undefined'" | Required model properties not calculated before window sync | Calculate all derived properties immediately after model fitting |
| "Highlighting not working" | `targetId` references nonexistent element, or manual styling conflicts | Verify element ID exists; choose either automatic (`targetId`) OR manual highlighting |

## File Structure

```
apps/
  tool_name/
    main_tool.html          → Add Professor Mode checkbox, sidebar, overlay divs
    main_tool.js            → Calculate model properties, sync to window.lastModel
    main_tool.css           → Add comment pointing to shared CSS (see below)
    tool_tutorial.js        → NEW FILE - Tutorial object with all steps
```

## 🚨 CRITICAL: Use Centralized CSS (Don't Duplicate!)

**All Professor Mode CSS is centralized in `shared/css/main.css`.** Do NOT add Professor Mode styles to individual app CSS files.

### What's Already in shared/css/main.css

The shared CSS file includes all standard Professor Mode styles:
- `.professor-mode-banner` - Banner container with max-width and margins
- `.professor-mode-content` - Gradient background, flexbox layout
- `.professor-mode-info` - Title and description text styling
- `.professor-mode-toggle` - Pill-style toggle button (both standalone and in-banner variants)
- `#tutorial-sidebar` - Right-side panel (380px wide, slides from right)
- `#tutorial-overlay` - Dark overlay behind highlighted elements
- `.tutorial-highlight` - Green pulsing highlight effect
- `.sidebar-header`, `.tutorial-step-badge`, `.tutorial-body` - Sidebar content styles
- `.tutorial-quiz`, `.quiz-feedback` - Quiz styling
- `.btn-primary`, `.btn-secondary` - Button styles
- Responsive rules for mobile

### In Your App's CSS File

Simply add this comment to indicate CSS is centralized:

```css
/* Professor Mode styles are now in shared/css/main.css */
```

### Standard HTML for Professor Mode Toggle

**⚠️ PREFERRED:** Use the full **Professor Mode Banner** pattern described earlier in this document. The banner provides better discoverability and explains the feature to students.

The simple toggle below is only for **fallback/inline use** when space constraints prevent using the full banner (rare):

```html
<label class="professor-mode-toggle">
    <input type="checkbox" id="professorMode">
    <span>🎓 Professor Mode</span>
</label>
```

**⚠️ DO NOT:**
- Create custom toggle styles (no sliders, no custom colors)
- Add `#tutorial-sidebar` CSS to your app's CSS file
- Use `.professor-toggle` (old class name) - use `.professor-mode-toggle`
- Position sidebar on the left (standard is right-side)
- Skip the banner in favor of inline toggle unless absolutely necessary

### Standard HTML for Sidebar and Overlay

Add these containers to your HTML (usually at the end of `<body>`):

```html
<!-- Tutorial Overlay -->
<div id="tutorial-overlay"></div>

<!-- Tutorial Sidebar -->
<div id="tutorial-sidebar">
    <div class="sidebar-header">
        <h2>🎓 Professor Mode</h2>
        <button class="close-tutorial" onclick="ToolNameTutorial.stop()">✕</button>
    </div>
    <div id="tutorial-content"></div>
</div>
```

## Legacy CSS Section (Reference Only)

> **⚠️ NOTE:** This CSS is now centralized in `shared/css/main.css`. 
> You do NOT need to copy this into your app's CSS file.
> This section is kept for reference only, showing what styles are available.

```css
/* --- Professor Mode / Tutorial Styles --- */
#tutorial-sidebar {
  position: fixed;
  top: 0;
  right: -320px;
  width: 300px;
  height: 100vh;
  background: white;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
  transition: right 0.3s ease;
  z-index: 2000;
  overflow-y: auto;
  padding: 1.5rem;
}

#tutorial-sidebar.active {
  right: 0;
}

#tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: none;
}

#tutorial-overlay.active {
  display: block;
}

.tutorial-highlight {
  position: relative;
  z-index: 1001 !important;
  box-shadow: 0 0 0 4px #4CAF50, 0 0 20px rgba(76, 175, 80, 0.5);
  animation: pulse-highlight 2s infinite;
  border-radius: 8px;
  background: white !important;  
  isolation: isolate; 
}

@keyframes pulse-highlight {
  0%, 100% { box-shadow: 0 0 0 4px #4CAF50, 0 0 20px rgba(76, 175, 80, 0.5); }
  50% { box-shadow: 0 0 0 6px #4CAF50, 0 0 30px rgba(76, 175, 80, 0.8); }
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #1e3a8a;
}

.close-tutorial {
  background: #f1f5f9;
  border: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
}

.tutorial-step-badge {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.tutorial-body h3 {
  margin: 0.75rem 0 0.5rem 0;
  font-size: 1.15rem;
  color: #1e293b;
}

.tutorial-body p {
  margin: 0.5rem 0;
  line-height: 1.6;
  color: #475569;
}

.tutorial-quiz {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 6px;
}

.tutorial-quiz label {
  display: block;
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
}

.tutorial-quiz label:hover {
  border-color: #667eea;
  background: #f0f0ff;
}

.quiz-feedback.correct {
  background: #dcfce7;
  color: #155724;
  border: 1px solid #c3e6cb;
  display: block;
  padding: 0.75rem;
  margin-top: 0.75rem;
  border-radius: 4px;
}

.quiz-feedback.incorrect {
  background: #fee2e2;
  color: #721c24;
  border: 1px solid #f5c6cb;
  display: block;
  padding: 0.75rem;
  margin-top: 0.75rem;
  border-radius: 4px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}
```

**Linking in HTML:**
```html
<!-- Main tool logic -->
<script src="main_tool.js"></script>

<!-- Tutorial logic -->
<script src="tool_tutorial.js"></script>

<!-- Initialize tutorial after DOM loads -->
<script>
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof ToolNameTutorial !== 'undefined') {
      ToolNameTutorial.init();
    }
  });
</script>
```

## The 12 Most Important Rules

1. **Use centralized CSS from `shared/css/main.css`** - Don't duplicate Professor Mode styles in app CSS files
2. **Use the Professor Mode Banner pattern** - Place the full banner after the hero header (see "Professor Mode Banner" section)
3. **Store quizzes once in `step.currentQuizzes`, never regenerate**
4. **Calculate all model properties immediately after fitting, before window sync**
5. **Return `null` (not `[]`) from `getDynamicQuizzes()` when data unavailable**
6. **Avoid duplicate `const` declarations - store on object, reuse everywhere**
7. **Transform data to match tutorial expectations (e.g., 2D arrays)**
8. **Use nullish coalescing for property names that might vary**
9. **Reference only UI-visible elements in task instructions**
10. **Add IDs to container elements when highlighting multiple related components**
11. **Track completion only if student reached final step**
12. **Include "Analyst's Perspective" in conclusion step (see section below)**

## 🎓 REQUIRED: Analyst's Perspective in Conclusion

**THE GOAL:** Every Professor Mode conclusion must include a thoughtful "Analyst's Perspective" section that helps students appreciate the tool's limitations, assumptions, and what lies beyond this introductory tutorial.

**WHY THIS MATTERS:** Students often finish a tutorial thinking they've mastered a topic. The Analyst's Perspective grounds them in analytical humility—reminding them that every tool has constraints, every method has assumptions, and real-world applications often require more sophisticated approaches.

**VOICE AND TONE:** When writing this section, take OFF your "coding assistant" hat and put ON your "I'm a helpful data science professor wrapping up a tutorial with my business students" hat. Be collegial, insightful, and gently provocative—not pessimistic or dismissive.

### Required Structure

Add this block to EVERY conclusion step:

```javascript
{
    id: 'conclusion',
    title: "🎓 Professor Mode Complete!",
    targetId: null,
    content: `
        <!-- Standard "What You've Learned" section -->
        <h4>📊 What You've Learned</h4>
        <ul>
            <li>...</li>
        </ul>
        
        <!-- 🎓 REQUIRED: Analyst's Perspective -->
        <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
        <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
            [3-4 sentences covering: (1) key limitations/assumptions of this specific tool, 
            (2) what more advanced practitioners consider, and (3) a forward-looking note 
            about what students might explore next in their analytical journey.]
        </p>
        
        <!-- Standard "Next Steps" section -->
        <h4>🎯 Next Steps</h4>
        <ul>
            <li>...</li>
        </ul>
    `
}
```

### Content Guidelines for Analyst's Perspective

**Must address these three themes:**

1. **Limitations & Assumptions of THIS Tool**
   - What simplifications does this tool make?
   - What edge cases might produce misleading results?
   - What assumptions might not hold in real datasets?

2. **What Advanced Practitioners Consider**
   - What alternative methods exist for this problem?
   - What additional validation steps would professionals use?
   - What contextual factors might change the interpretation?

3. **Forward-Looking Invitation**
   - What might students explore next?
   - How does this fit into a broader analytical toolkit?
   - What questions should they be asking as they advance?

### Example: Sentiment Analysis

```javascript
<h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
<p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
    VADER is a powerful starting point, but it's a rule-based dictionary approach—meaning 
    it can't learn domain-specific language or detect contextual nuances like sarcasm, 
    cultural references, or evolving slang. In professional settings, analysts often 
    fine-tune transformer-based models (like BERT) on their specific domain, incorporate 
    aspect-based sentiment analysis to understand <em>what</em> customers feel positive or 
    negative about, and triangulate findings with qualitative research. As you advance, 
    consider how sentiment analysis fits into a broader voice-of-customer program that 
    combines quantitative signals with human interpretation.
</p>
```

### Example: Logistic Regression

```javascript
<h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
<p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
    This tutorial covers binary logistic regression with a single predictor—a fundamental 
    building block, but real-world classification problems often involve multiple predictors, 
    interaction effects, and class imbalance that require techniques like oversampling, 
    cost-sensitive learning, or ensemble methods. Professional analysts also scrutinize 
    model calibration (does a 70% predicted probability really mean 70% of cases convert?), 
    evaluate performance across subgroups to detect bias, and consider whether the relationships 
    are truly linear in log-odds or require polynomial terms. As you advance, explore 
    regularized regression (LASSO/Ridge), decision trees, and model explanation tools like 
    SHAP values to build more robust and interpretable classifiers.
</p>
```

### Example: A/B Testing

```javascript
<h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
<p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
    The two-sample test you've learned assumes random assignment, independent observations, 
    and a single primary metric—assumptions that often break down in practice due to network 
    effects, novelty bias, or multiple-comparison issues when testing many metrics simultaneously. 
    Experienced experimenters use techniques like stratified randomization, CUPED variance 
    reduction, and sequential testing to get faster, more reliable results. As you advance, 
    consider how to design experiments that account for spillover effects, how to balance 
    statistical power against business urgency, and when quasi-experimental methods (like 
    difference-in-differences) might be more appropriate than a true randomized trial.
</p>
```

### Checklist for Every Conclusion

- [ ] Includes "Analyst's Perspective" section with styled blockquote
- [ ] Addresses specific limitations of THIS tool (not generic disclaimers)
- [ ] Mentions at least one advanced technique or consideration
- [ ] Ends with forward-looking invitation, not doom-and-gloom
- [ ] Written in professorial voice (collegial, insightful, humble)
- [ ] 3-4 sentences, approximately 80-120 words

## When to Use This Pattern

**✅ Use for:**
- Step-by-step guided tutorials
- Interactive learning with quiz validation
- Context-aware questions pulling live data
- Progress tracking and analytics

**❌ Don't use for:**
- Simple tooltips or help text (use native tooltips)
- Non-sequential exploration (consider contextual help panels)
- Expert users who don't need guidance (provide toggle to disable)

---

## 📋 Long-Term TODOs

> **Technical Debt & Future Improvements**

1. **Audit and remove duplicate banner CSS from individual app files**
   - Banner styles (`.professor-mode-banner`, etc.) are now centralized in `shared/css/main.css`
   - Some older apps may still have duplicate banner CSS in their local stylesheets
   - Audit and remove duplicates from: `apps/decisiontrees/classifier/styles.css`, `apps/regression/log_regression/main_log_regression.css`, `apps/advanced/conjoint/main_conjoint.css`, and others

---

## 📋 Apps with Professor Mode Implemented

> **Last Updated:** February 2, 2026

The following apps already have Professor Mode tutorials implemented. Use these as reference examples when building new tutorials.

| App | Category | Tutorial File | Notes |
|-----|----------|---------------|-------|
| [Independent t-test](../../apps/hypothesis_testing/ind_ttest/) | Hypothesis Testing | `ttest_tutorial.js` | Welch's t-test with streaming hours scenario |
| [Paired t-test](../../apps/hypothesis_testing/paired_ttest/) | Hypothesis Testing | `paired_ttest_tutorial.js` | Paired differences with recall/conversion scenario |
| [One-Way ANOVA](../../apps/hypothesis_testing/onewayanova/) | Hypothesis Testing | `anova_tutorial.js` | Raw data workflow with CSV inspection |
| [Chi-Square Test](../../apps/hypothesis_testing/chisquare/) | Hypothesis Testing | `chisquare_tutorial.js` | Contingency table with loyalty nudge scenario |
| [A/B Proportion Test](../../apps/hypothesis_testing/ab_proportion/) | Hypothesis Testing | `ab_proportion_tutorial.js` | Two-proportion z-test with CTA button scenario |
| [McNemar's Test](../../apps/hypothesis_testing/mcnemar/) | Hypothesis Testing | `mcnemar_tutorial.js` | Matched-pairs test with lifecycle push scenario |
| [Bivariate Regression](../../apps/regression/bivariate_regression/) | Regression | `bivariate_tutorial.js` | Simple linear regression with marketing mix scenario |
| [Logistic Regression](../../apps/regression/log_regression/) | Regression | `logreg_tutorial.js` | Reference implementation with dynamic quizzes |
| [MLR with Interactions](../../apps/regression/mlr_interactions/) | Regression | `mlr_interactions_tutorial.js` | Interaction terms, quadratics, centering, simple slopes |
| [ML Regression](../../apps/regression/ml_regression/) | Regression | `ml_regression_tutorial.js` | Multiple predictors with continuous/categorical mix |
| [Multinomial Logistic](../../apps/regression/mn_log_regression/) | Regression | `mn_logreg_tutorial.js` | Multi-category outcomes with softmax, probability plots |
| [Pearson Correlation](../../apps/descriptive/pearson_correlation/) | Descriptive | `pearson_tutorial.js` | Correlation analysis with spend vs signups scenario |
| [Shapley Value Visualizer](../../apps/attribution/shapley_visualizer/) | Attribution | `shapley_tutorial.js` | Coalition-based interactive tutorial |
| [Markov Chain Attribution](../../apps/attribution/markov_visualizer/) | Attribution | `markov_tutorial.js` | Transition probability focus |
| [VADER Sentiment Lab](../../apps/text_analysis/sentiment_lab/) | Text Analysis | `sentiment_tutorial.js` | Text analysis with token breakdown |
| [K-Means Clustering](../../apps/clustering/kmeans/) | Clustering | `kmeans_tutorial.js` | Customer segmentation with elbow/silhouette diagnostics |
| [K-Prototypes Clustering](../../apps/clustering/kprototypes/) | Clustering | `kprototypes_tutorial.js` | Mixed data segmentation with gamma parameter |
| [Compound Event Probability](../../apps/probability/compound_event_probability/) | Probability | `compound_event_tutorial.js` | Binomial model with PMF/CDF visualization, approximations |
| [Selection Probability Lab](../../apps/probability/selection_probability_lab/) | Probability | `selection_probability_tutorial.js` | Hypergeometric vs binomial, population grid visualization |
| [Sample Size A/B Calculator](../../apps/sample_size/sample_size_AB_calculator/) | Sample Size | `sample_size_ab_tutorial.js` | Power analysis with effect size experiments |
| [Basic Sample Size Calculator](../../apps/sample_size/sample_size_calculator/) | Sample Size | `sample_size_calculator_tutorial.js` | Margin of error and confidence intervals |
| [Sample Size Corr/Regression](../../apps/sample_size/sample_size_corr_regression/) | Sample Size | `sample_size_corr_regression_tutorial.js` | Correlation and regression power analysis |
| [Multi-Arm A/B](../../apps/sample_size/sample_size_multiarm_ab/) | Sample Size | `sample_size_multiarm_ab_tutorial.js` | Bonferroni and Dunnett corrections |
| [Sampling Visualizer](../../apps/sample_size/sampling_visualizer/) | Sample Size | `sampling_visualizer_tutorial.js` | CLT demonstration with visual distributions |
| [Decision Tree Classifier](../../apps/decisiontrees/classifier/) | Advanced | `dt_tutorial.js` | CART algorithm, overfitting experiment, auto-scroll on rebuild |
| [Conjoint Analysis](../../apps/advanced/conjoint/) | Advanced | `conjoint_tutorial.js` | 20-step comprehensive CBC tutorial, dynamic quizzes from estimationResult, WTP, IIA, segmentation |
| [Neural Network Playground](../../apps/advanced/neural_network/) | Advanced | `tutorial.js` | Interactive network architecture visualization |
| [Log-Loss Lab](../../apps/model_fitting/logloss/) | Model Fitting | `logloss_tutorial.js` | Classification loss function intuition |
| [MAE Lab](../../apps/model_fitting/mae/) | Model Fitting | `mae_tutorial.js` | Regression loss function intuition |
| [ARIMAX Forecasting](../../apps/time_series/arimax/) | Time Series | `tutorial.js` | ARIMAX/SARIMAX with exogenous variables |

### Apps Still Needing Professor Mode

| App | Category | Priority | Notes |
|-----|----------|----------|-------|
| Univariate Analyzer | Descriptive | 🟡 Medium | |
| Qualitative Analyzer | Text Analysis | 🟡 Medium | |
| Theme Extractor | Text Analysis | 🟡 Medium | |
| Propensity Score Matching | Advanced | 🔴 High | Important for causal inference |
| Resource Allocation | Advanced | 🟢 Lower | |

### Adding New Apps to This List

When you implement Professor Mode for a new app, add it to the table above with:
- Relative link to the app folder
- Category classification
- Tutorial filename
- Brief notes about unique features or patterns used
