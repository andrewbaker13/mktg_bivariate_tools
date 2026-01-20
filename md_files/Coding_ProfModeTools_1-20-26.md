# Professor Mode Tutorial Implementation Guide
**Date:** January 20, 2026  
**Context:** Lessons learned from implementing Professor Mode in Logistic Regression Tool

---

## Overview

This document captures critical patterns, common pitfalls, and best practices for implementing "Professor Mode" guided tutorials in statistical analysis tools.

---

## Core Architecture

### Tutorial Object Structure

```javascript
const MyToolTutorial = {
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

---

## CRITICAL PROBLEM AREAS

### 1. Quiz Regeneration Bug ⚠️

**THE PROBLEM:**  
If `getDynamicQuizzes()` is called multiple times (once in `updateView()`, again in `checkQuiz()`), you can get inconsistent results if data availability changes between calls.

**THE SOLUTION:**
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

**WHY THIS MATTERS:**  
Dynamic quizzes pull live data (e.g., `window.lastModel`). If the model loads between `updateView()` and `checkQuiz()`, the quiz questions displayed won't match the quiz answers being checked.

---

### 2. Data Availability for Dynamic Quizzes ⚠️

**THE PROBLEM:**  
Dynamic quiz functions try to read properties from `window.lastModel` that don't exist or have different names than expected.

**THE SOLUTION:**

#### Step 1: Calculate and Attach Properties IMMEDIATELY After Model Fitting

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

#### Step 2: Use Nullish Coalescing for Multiple Property Names

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

#### Step 3: Return `null` (not `[]`) When Data Unavailable

```javascript
getDynamicQuizzes: () => {
    if (!model || !model.requiredProperty) {
        return null;  // Signals: use fallback quizzes
    }
    
    // If you return [] (empty array), no quizzes display at all!
    // If you return null, step.quizzes fallback is used
}
```

---

### 3. Duplicate Variable Declarations ⚠️

**THE PROBLEM:**  
JavaScript throws `SyntaxError: Identifier 'variableName' has already been declared` if you use `const` for the same variable name in the same scope.

**COMMON SCENARIO:**
```javascript
// Line 2038 - In renderNarratives() function
function renderNarratives(model) {
    const modelPVal = calculatePValue(model);  // ✓ OK in this scope
    // use modelPVal for narrative text
}

// Line 3024 - In updateResults() function
function updateResults() {
    const modelPVal = calculatePValue(model);  // ✓ OK in different scope
    model.modelPValue = modelPVal;  // Store on model
    
    // ... many lines later ...
    
    const modelPVal = model.modelPValue;  // ✗ ERROR! Already declared above
}
```

**THE SOLUTION:**

**Option A:** Store on model object once, reuse everywhere
```javascript
function updateResults() {
    const model = buildModel();
    
    // Calculate ONCE and attach to model
    model.modelPValue = Number.isFinite(model.modelChi2) && model.dfModel > 0
        ? 1 - chiSquareCdf(model.modelChi2, model.dfModel)
        : NaN;
    
    // Later in same function, just use it directly
    const summaryText = `p=${formatP(model.modelPValue)}`;  // Direct access, no redeclaration
}

function renderNarratives(model) {
    // Use pre-calculated value if available, else calculate locally
    const modelPVal = model.modelPValue !== undefined ? model.modelPValue :
        (Number.isFinite(model.modelChi2) && model.dfModel > 0
            ? 1 - chiSquareCdf(model.modelChi2, model.dfModel)
            : NaN);
}
```

**Option B:** Use different variable names
```javascript
function updateResults() {
    const modelPVal = calculatePValue(model);
    model.modelPValue = modelPVal;
    
    // Later, use different name
    const pValueForLogging = model.modelPValue;  // Different name
}
```

---

### 4. Array Structure Mismatches ⚠️

**THE PROBLEM:**  
Tutorial expects data in one format, but model provides it in another.

**EXAMPLE:**
```javascript
// What calculateConfusionMatrix() returns:
{
    TP: 25, TN: 30, FP: 5, FN: 10,
    accuracy: 0.78
}

// What tutorial expects:
{
    confusionMatrix: [[30, 5], [10, 25]],  // 2D array: [[TN, FP], [FN, TP]]
    accuracy: 0.78
}
```

**THE SOLUTION:**  
Transform data immediately when storing:

```javascript
const cmData = calculateConfusionMatrix(model, 0.5);
if (cmData) {
    // Transform to expected format
    model.confusionMatrix = [
        [cmData.TN, cmData.FP],  // actual = 0 row
        [cmData.FN, cmData.TP]   // actual = 1 row
    ];
    model.accuracy = cmData.accuracy;
}

// Now tutorial can access:
// model.confusionMatrix[0][0] → True Negatives
// model.confusionMatrix[0][1] → False Positives
// model.confusionMatrix[1][0] → False Negatives
// model.confusionMatrix[1][1] → True Positives
```

---

## Best Practices

### Dynamic Quizzes Pattern

Always provide both dynamic and fallback quizzes:

```javascript
{
    id: 'step_id',
    title: "Step Title",
    getDynamicQuizzes: () => {
        const model = window.lastModel;
        
        // Early return if data unavailable
        if (!model || !model.requiredProperty) return null;
        
        // Extract values
        const value = model.requiredProperty;
        const displayValue = value < 0.001 ? "< 0.001" : value.toFixed(3);
        
        // Generate questions with actual values
        return [
            {
                question: `What is the value shown? It should be ${displayValue}`,
                options: [
                    `About ${(value * 0.5).toFixed(3)}`,
                    `About ${displayValue}`,
                    `About ${(value * 2).toFixed(3)}`
                ],
                answer: 1,
                feedback: `Correct! The value is ${displayValue}.`
            }
        ];
    },
    quizzes: [
        // Fallback conceptual questions that work without live data
        {
            question: "What does this metric measure?",
            options: ["Explanation A", "Explanation B", "Explanation C"],
            answer: 0,
            feedback: "Correct explanation..."
        }
    ]
}
```

---

### Task Instructions Guidelines

**✓ DO:**
- Reference things students can actually see in the UI
- Use specific element names that match the interface
- Ask students to observe patterns, not memorize numbers
- Provide clear visual targets (e.g., "Look at the highlighted panel")

**✗ DON'T:**
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
    exactly 2 unique values in the console.</p>  // ✗ Not visible in UI!
`
```

---

### Highlighting Strategy

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

**GOTCHA:** If you use both `targetId` AND manual outline styling, you might get double highlights or conflicts. Pick one approach per step.

---

### Container Element Strategy

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

---

## Console Logging Strategy

### During Development

Add comprehensive logging to diagnose data availability:

```javascript
getDynamicQuizzes: () => {
    const model = window.lastModel;
    
    console.log('Step X Quiz: Model available:', model);
    console.log('Step X Quiz: All properties:', model ? Object.keys(model) : 'null');
    
    const pValue = model?.modelPValue ?? model?.pValue;
    console.log('Step X Quiz: Found pValue:', pValue);
    
    if (!pValue) {
        console.log('Step X Quiz: Missing data, using fallback');
        return null;
    }
    
    console.log('Step X Quiz: Generating dynamic questions');
    return [ /* questions */ ];
}
```

### In Production

Remove excessive logging, keep only essential checks:

```javascript
getDynamicQuizzes: () => {
    const model = window.lastModel;
    if (!model || !model.requiredProperty) return null;
    
    // Minimal logging for diagnostics
    // (or remove entirely once stable)
    
    return [ /* questions */ ];
}
```

### In Main Model Code

Add a single comprehensive log after model fitting:

```javascript
window.lastModel = model;

console.log('✅ Model fitted and synced to window.lastModel');
console.log('   modelPValue:', model.modelPValue);
console.log('   pseudoR2:', model.pseudoR2);
console.log('   confusionMatrix:', model.confusionMatrix);
console.log('   accuracy:', model.accuracy);
console.log('   terms count:', model.terms?.length);
```

---

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
                { action: 'tutorial_completed', tool: 'tool_name' },
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
- Only log if student reached final step (`this.currentStep === this.steps.length - 1`)
- Use existing `logToolRunToBackend()` function for consistency
- This will only track logged-in students (backend handles authentication)

---

## Checklist for New Tutorial Implementation

### Setup Phase
- [ ] Create tutorial object with `init()`, `start()`, `stop()`, `updateView()`, `checkQuiz()`, `nextStep()`
- [ ] Add sidebar HTML container (`<div id="tutorial-sidebar">`)
- [ ] Add overlay HTML container (`<div id="tutorial-overlay">`)
- [ ] Add Professor Mode checkbox in UI
- [ ] Add CSS for highlighting, sidebar, and overlay

### Step Definition Phase
- [ ] Define all steps with `id`, `title`, `targetId`, `content`
- [ ] Add HTML IDs to elements you want to highlight (`targetId`)
- [ ] Write task instructions that reference visible UI elements only
- [ ] Define `check()` functions for completion criteria
- [ ] Define `onEnter()` functions for scrolling/setup

### Quiz Implementation Phase
- [ ] Identify which values should pull from live model (dynamic quizzes)
- [ ] Ensure those values are calculated and attached to model object BEFORE `window.lastModel` sync
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

---

## Common Error Messages and Solutions

### "Identifier 'variableName' has already been declared"
**Cause:** Using `const` for same variable name multiple times in same scope  
**Solution:** Store on object once, reuse directly; OR use different variable names

### "Cannot read properties of undefined (reading 'property')"
**Cause:** Trying to access property on undefined object  
**Solution:** Add safe guards (`model?.property` or `if (model && model.property)`)

### "Quiz questions not displaying"
**Cause:** `getDynamicQuizzes()` returning `[]` instead of `null`  
**Solution:** Return `null` when data unavailable to trigger fallback

### "Quiz answers marked wrong even though correct"
**Cause:** Quiz regeneration between display and checking  
**Solution:** Store quizzes in `step.currentQuizzes`, use stored version in `checkQuiz()`

### "Dynamic quiz showing placeholder values like 'undefined'"
**Cause:** Required model properties not calculated/attached before window sync  
**Solution:** Calculate all derived properties immediately after model fitting, before `window.lastModel = model`

### "Highlighting not working"
**Cause:** `targetId` references element that doesn't exist, or manual styling conflicts  
**Solution:** Verify element ID exists in HTML; choose either automatic (`targetId`) OR manual highlighting

---

## File Structure Template

```
apps/
  tool_name/
    main_tool.html          → Add Professor Mode checkbox, sidebar, overlay divs
    main_tool.js            → Calculate model properties, sync to window.lastModel
    main_tool.css           → Add tutorial styling if needed
    tool_tutorial.js        → NEW FILE - Tutorial object with all steps
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
    if (typeof MyToolTutorial !== 'undefined') {
      MyToolTutorial.init();
    }
  });
</script>
```

---

## Summary: The Most Important Rules

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

---

## Final Notes

This architecture works well for:
- Step-by-step guided tutorials
- Interactive learning with quiz validation
- Context-aware questions pulling live data
- Progress tracking and analytics
- Non-invasive overlays that don't break tool functionality

Avoid this pattern for:
- Simple tooltips or help text (use native tooltips instead)
- Non-sequential exploration (consider contextual help panels)
- Expert users who don't need guidance (provide toggle to disable)

---

**Last Updated:** January 20, 2026  
**Author:** Lessons learned from Logistic Regression Professor Mode implementation  
**Next Steps:** Apply this pattern to other statistical analysis tools
