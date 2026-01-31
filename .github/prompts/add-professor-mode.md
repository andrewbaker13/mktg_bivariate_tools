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
- [ ] Add sidebar HTML container
- [ ] Add overlay HTML container
- [ ] Add Professor Mode checkbox in UI
- [ ] Add CSS for highlighting, sidebar, and overlay

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
    main_tool.css           → Add tutorial styling if needed (SEE CSS REFERENCE BELOW)
    tool_tutorial.js        → NEW FILE - Tutorial object with all steps
```

## Standard Professor Mode CSS (REQUIRED)

You **MUST** add this CSS to `main_tool.css` (or `style.css`) to ensure visual consistency across all apps. Do **NOT** inject styles via JS.

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

## The 10 Most Important Rules

1. **Store quizzes once in `step.currentQuizzes`, never regenerate**
2. **Calculate all model properties immediately after fitting, before window sync**
3. **Return `null` (not `[]`) from `getDynamicQuizzes()` when data unavailable**
4. **Avoid duplicate `const` declarations - store on object, reuse everywhere**
5. **Transform data to match tutorial expectations (e.g., 2D arrays)**
6. **Use nullish coalescing for property names that might vary**
7. **Reference only UI-visible elements in task instructions**
8. **Add IDs to container elements when highlighting multiple related components**
9. **Track completion only if student reached final step**
10. **Test with browser console open to catch errors early**

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

**Reference EXAMPLES:** 
Based on Logistic Regression Professor Mode implementation (January 2026). -- see folder: "log_regression"
Based on folder see folder: "neural_network"
