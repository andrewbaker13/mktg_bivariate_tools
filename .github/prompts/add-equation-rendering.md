---
name: Add Mathematical Equation Rendering
description: Implement MathJax 3 for rendering mathematical equations in statistical analysis tools with proper delimiters and dynamic updates
---

# Add Mathematical Equation Rendering with MathJax

Implement professional mathematical equation rendering for a statistical analysis tool using MathJax 3. This guide covers both static HTML equations and dynamically-generated JavaScript equations with proper escaping, typesetting, and error handling.

## Why MathJax 3?

- **Professional rendering** - Publication-quality mathematical notation
- **Accessibility** - Screen reader support and semantic HTML
- **Flexible input** - Supports LaTeX, MathML, and AsciiMath
- **Responsive** - Equations scale with text and work on mobile
- **Fast** - Modern CommonHTML output format

---

## Setup: Include MathJax in HTML

Add to the `<head>` section of your tool's HTML:

```html
<script id="MathJax-script" async 
  src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
```

**Why `tex-mml-chtml.js`?**
- Supports both TeX and MathML input formats
- Outputs CommonHTML (most compatible, accessible)
- Better accessibility than SVG output
- Smaller file size than combined packages

### Optional: Custom Configuration

If you need to customize MathJax behavior, add this **before** the script include:

```html
<script>
  window.MathJax = {
    tex: {
      inlineMath: [['\\(', '\\)']],       // Inline delimiters
      displayMath: [['\\[', '\\]'], ['$$', '$$']]  // Display delimiters
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
    },
    startup: {
      pageReady: () => {
        return MathJax.startup.defaultPageReady().catch(err => {
          console.warn('MathJax initialization failed:', err);
        });
      }
    }
  };
</script>
<script id="MathJax-script" async 
  src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
```

---

## Delimiter Conventions

### ✅ PREFERRED: Backslash Delimiters

| Type | Delimiter | Use Case | Example |
|------|-----------|----------|---------|
| **Inline** | `\( equation \)` | Math within text flow | The mean \(\bar{x}\) is 42 |
| **Display** | `\[ equation \]` | Standalone, centered | \[t = \frac{\bar{x} - \mu}{SE}\] |

**Why prefer backslash delimiters?**
- No conflict with currency symbols ($)
- More explicit and readable
- Less likely to accidentally trigger in regular text

### ⚠️ ACCEPTABLE: Dollar Sign Delimiters

| Type | Delimiter | Caution |
|------|-----------|---------|
| **Display** | `$$ equation $$` | Only in controlled contexts (no currency nearby) |

**Use `$$` sparingly.** It can conflict with currency values.

### ❌ NEVER: Single Dollar Signs

```html
<!-- ❌ NEVER DO THIS -->
<p>The price is $50 and the correlation is $r = 0.73$</p>

<!-- MathJax interprets "$50 and..." as math, causing render failures -->
```

**Solution:** Use `\( \)` for inline math, or HTML entity `&#36;` for currency.

```html
<!-- ✅ CORRECT -->
<p>The price is &#36;50 and the correlation is \(r = 0.73\)</p>
```

---

## Static HTML Patterns

Use these patterns for equations that never change.

### Pattern 1: Inline Equation in Text

```html
<p>
  The test statistic \(t\) is calculated as the difference between means 
  divided by the standard error: \(t = \frac{\bar{x}_1 - \bar{x}_2}{SE}\).
</p>
```

**Result:** The test statistic *t* is calculated as... *t* = (*x̄*₁ - *x̄*₂)/SE.

### Pattern 2: Display Equation with Context

```html
<div class="equation-section">
  <p><strong>The multiple regression equation:</strong></p>
  \[\hat{y} = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \cdots + \beta_k x_k\]
  <p class="note">where \(\beta_i\) represents the partial regression coefficient for predictor \(x_i\).</p>
</div>
```

### Pattern 3: Equation in Expandable Section

```html
<details class="formula-details" open>
  <summary><strong>Statistical Formula</strong></summary>
  <p>The F-statistic tests whether group means differ:</p>
  \[F = \frac{MS_{between}}{MS_{within}} = \frac{\sum_{j=1}^{k} n_j(\bar{x}_j - \bar{x})^2 / (k-1)}{\sum_{j=1}^{k}\sum_{i=1}^{n_j}(x_{ij} - \bar{x}_j)^2 / (N-k)}\]
  <p>where \(k\) is the number of groups and \(N\) is the total sample size.</p>
</details>
```

### Pattern 4: Equations in Tables

```html
<table class="formula-table">
  <thead>
    <tr>
      <th>Statistic</th>
      <th>Formula</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Sample Mean</td>
      <td>\(\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i\)</td>
    </tr>
    <tr>
      <td>Standard Deviation</td>
      <td>\(s = \sqrt{\frac{1}{n-1}\sum_{i=1}^{n}(x_i - \bar{x})^2}\)</td>
    </tr>
    <tr>
      <td>Correlation</td>
      <td>\(r = \frac{\sum(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum(x_i - \bar{x})^2 \sum(y_i - \bar{y})^2}}\)</td>
    </tr>
  </tbody>
</table>
```

---

## Dynamic JavaScript Patterns

Use these patterns when equations include computed values from analysis results.

### 🚨 CRITICAL: Escape Backslashes in JavaScript

**THE PROBLEM:** JavaScript strings consume single backslashes.

```javascript
// ❌ WRONG - Backslash gets consumed
const broken = `\(r^2 = ${rSquared}\)`;  
// Result: "(r^2 = 0.73)" - No backslashes! Won't render as math.

// ✅ CORRECT - Double backslashes
const correct = `\\(r^2 = ${rSquared.toFixed(3)}\\)`;
// Result: "\(r^2 = 0.730\)" - MathJax recognizes this!
```

**Rule:** Always use `\\(` and `\\)` in JavaScript template literals.

### Pattern 1: Helper Functions for Safe Delimiters

Create reusable helpers to reduce errors:

```javascript
/**
 * Wrap LaTeX content in inline math delimiters
 * @param {string} latex - LaTeX content (no delimiters)
 * @returns {string} - Properly delimited inline math
 */
function inlineMath(latex) {
  return `\\(${latex}\\)`;
}

/**
 * Wrap LaTeX content in display math delimiters
 * @param {string} latex - LaTeX content (no delimiters)
 * @returns {string} - Properly delimited display math
 */
function displayMath(latex) {
  return `\\[${latex}\\]`;
}

// Usage examples
const correlation = inlineMath(`r = ${r.toFixed(3)}`);
// Result: "\\(r = 0.734\\)"

const regression = displayMath(`\\hat{y} = ${b0.toFixed(2)} + ${b1.toFixed(2)}x`);
// Result: "\\[\\hat{y} = 3.45 + 1.23x\\]"
```

**Benefits:**
- Fewer escaping errors
- Consistent delimiter style
- Easier to update delimiter convention later

### Pattern 2: Building Complex Equations

```javascript
function renderRegressionEquation(model) {
  const { intercept, coefficients, variableNames } = model;
  
  // Build terms: β₀ + β₁x₁ + β₂x₂ + ...
  let equation = `\\hat{y} = ${intercept.toFixed(3)}`;
  
  coefficients.forEach((coef, i) => {
    const sign = coef >= 0 ? '+' : '-';
    const value = Math.abs(coef).toFixed(3);
    const varName = escapeLatex(variableNames[i]);
    equation += ` ${sign} ${value} \\cdot \\text{${varName}}`;
  });
  
  return displayMath(equation);
}

// Usage
document.getElementById('regression-eq').innerHTML = renderRegressionEquation(model);
await typeset('regression-eq');
```

### Pattern 3: Escape User-Provided Values

**THE PROBLEM:** User input can contain LaTeX special characters that break rendering.

```javascript
/**
 * Escape special LaTeX characters in user input
 * @param {string} str - User-provided string (e.g., variable name)
 * @returns {string} - Safe for LaTeX
 */
function escapeLatex(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')  // Backslash
    .replace(/([&%$#_{}])/g, '\\$1')      // Special chars
    .replace(/~/g, '\\textasciitilde{}')  // Tilde
    .replace(/\^/g, '\\textasciicircum{}'); // Caret
}

// Usage
const varName = escapeLatex(userInput);  
// Input: "Sales_2024"  →  Output: "Sales\\_2024"

const equation = inlineMath(`\\text{${varName}} = ${value.toFixed(2)}`);
// Result: "\\(\\text{Sales\\_2024} = 42.50\\)"
```

**Always escape:**
- Variable names from file headers
- User-typed input
- Any string not controlled by your code

### Pattern 4: Typeset After DOM Updates

**THE PROBLEM:** MathJax only processes equations on page load. Dynamic equations need manual typesetting.

```javascript
/**
 * Render an equation and tell MathJax to process it
 * @param {string} containerId - ID of container element
 * @param {string} latex - LaTeX equation (with or without delimiters)
 */
async function renderEquation(containerId, latex) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found`);
    return;
  }
  
  // Insert LaTeX (ensure it has delimiters)
  container.innerHTML = latex.includes('\\[') || latex.includes('\\(') 
    ? latex 
    : displayMath(latex);
  
  // Tell MathJax to process this container
  await typeset(containerId);
}

/**
 * Trigger MathJax typesetting for specific elements
 * @param {string|string[]} ids - Element ID(s) to typeset
 */
async function typeset(...ids) {
  if (!window.MathJax?.typesetPromise) {
    console.warn('MathJax not loaded yet');
    return;
  }
  
  const elements = ids.map(id => document.getElementById(id)).filter(el => el);
  
  try {
    await MathJax.typesetPromise(elements);
  } catch (err) {
    console.error('MathJax typesetting failed:', err);
    // Equations stay as raw LaTeX (graceful degradation)
  }
}

// Usage
await renderEquation('correlation-formula', `r = ${r.toFixed(3)}, p ${pValue < 0.001 ? '< 0.001' : '= ' + pValue.toFixed(3)}`);
```

### Pattern 5: Clear Before Re-rendering

When updating existing equations, clear previous MathJax output first:

```javascript
/**
 * Update an equation, clearing previous render
 * @param {string} containerId - Container element ID
 * @param {string} newLatex - New LaTeX content
 */
async function updateEquation(containerId, newLatex) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Clear previous MathJax-rendered content
  if (window.MathJax?.typesetClear) {
    MathJax.typesetClear([container]);
  }
  
  // Insert new equation
  container.innerHTML = newLatex.includes('\\[') || newLatex.includes('\\(')
    ? newLatex
    : displayMath(newLatex);
  
  // Re-render
  await typeset(containerId);
}

// Usage in update function
async function updateResults(model) {
  // Update regular HTML
  document.getElementById('r-squared').textContent = model.rSquared.toFixed(3);
  
  // Update equation
  const equation = `R^2 = ${model.rSquared.toFixed(3)}, \\text{ Adj. } R^2 = ${model.adjRSquared.toFixed(3)}`;
  await updateEquation('model-equation', equation);
}
```

---

## CSS Styling for Equations

Add these classes to your tool's stylesheet:

```css
/* Standalone equation section with card styling */
.equation-section {
  background: var(--card-bg, #ffffff);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin: 1rem 0;
}

/* Equation inside intro/header */
.intro .equation {
  font-size: 16px;
  font-weight: normal;
  margin: 10px 0;
  background-color: #fff;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #bae6fd;
}

/* Note/explanation below equation */
.equation-note {
  margin-top: 1rem;
  background: #f8f9fb;
  padding: 1.2rem;
  border-radius: 8px;
  border-left: 4px solid var(--accent-color, #3b82f6);
  font-size: 0.95rem;
  color: #4b5563;
}

/* Formula table styling */
.formula-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.formula-table th {
  background: #f3f4f6;
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid #d1d5db;
}

.formula-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

/* Expandable formula details */
.formula-details {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.formula-details summary {
  cursor: pointer;
  font-weight: 600;
  color: #1f2937;
  user-select: none;
}

.formula-details[open] summary {
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}
```

**Recommended HTML structure:**

```html
<div class="card">
  <h3>Model Equation</h3>
  <div class="equation-section">
    <p id="regression-equation"></p>
  </div>
  <div class="equation-note">
    <h4>Interpretation</h4>
    <p>For every 1-unit increase in X, Y increases by <span id="slope-interp"></span>.</p>
  </div>
</div>
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Unclosed Delimiters

```javascript
// ❌ BAD - Missing closing delimiter
container.innerHTML = `\\(r = ${r.toFixed(3)}`;  
// Breaks all subsequent math rendering on page!

// ✅ GOOD - Always pair delimiters
container.innerHTML = `\\(r = ${r.toFixed(3)}\\)`;
```

**Tip:** Use helper functions (`inlineMath()`, `displayMath()`) to ensure proper pairing.

### Pitfall 2: HTML Tags Inside Math

```javascript
// ❌ BAD - HTML inside LaTeX delimiters
const eq = inlineMath(`<strong>${varName}</strong> = ${value}`);
// MathJax chokes on <strong> tag

// ✅ GOOD - Use LaTeX formatting
const eq = inlineMath(`\\mathbf{${varName}} = ${value}`);

// ✅ ALSO GOOD - Keep formatting outside math
const html = `<strong>${varName}</strong> = ${inlineMath(value.toFixed(2))}`;
```

### Pitfall 3: Currency Symbols Near Math

```html
<!-- ❌ RISKY - $ can trigger math mode -->
<p>Revenue of $50,000 with ROI of $r = 2.5$</p>
<!-- MathJax might interpret "$50,000 with ROI of $" as math -->

<!-- ✅ SAFE - Use HTML entity for currency -->
<p>Revenue of &#36;50,000 with ROI of \(r = 2.5\)</p>

<!-- ✅ ALSO SAFE - Use non-math context -->
<p>Revenue of <span class="currency">$50,000</span> with ROI of \(r = 2.5\)</p>
```

### Pitfall 4: Forgetting to Typeset

```javascript
// ❌ BAD - Equation inserted but not rendered
document.getElementById('eq-container').innerHTML = '\\(x^2 + y^2 = z^2\\)';
// User sees raw LaTeX: \(x^2 + y^2 = z^2\)

// ✅ GOOD - Trigger MathJax processing
document.getElementById('eq-container').innerHTML = '\\(x^2 + y^2 = z^2\\)';
await MathJax.typesetPromise([document.getElementById('eq-container')]);
// User sees rendered equation: x² + y² = z²
```

### Pitfall 5: Race Condition on Page Load

```javascript
// ❌ BAD - MathJax might not be loaded yet
function init() {
  MathJax.typesetPromise();  // Throws error if MathJax not ready
}

// ✅ GOOD - Check availability first
function init() {
  if (window.MathJax?.typesetPromise) {
    MathJax.typesetPromise();
  } else {
    console.warn('MathJax not ready yet');
  }
}

// ✅ BEST - Wait for MathJax ready event
window.addEventListener('load', () => {
  if (window.MathJax) {
    MathJax.startup.promise.then(() => {
      console.log('MathJax ready');
      initializeEquations();
    });
  }
});
```

### Pitfall 6: Nested Template Literals

```javascript
// ❌ CONFUSING - Hard to read escaping
const eq = `\\(\\frac{${num}}{${den}}\\)`;

// ✅ CLEARER - Build in steps
const fraction = `\\frac{${num.toFixed(2)}}{${den.toFixed(2)}}`;
const eq = inlineMath(fraction);
```

---

## LaTeX Reference for Common Statistics

### Greek Letters

| Symbol | LaTeX | Symbol | LaTeX |
|--------|-------|--------|-------|
| α (alpha) | `\alpha` | μ (mu) | `\mu` |
| β (beta) | `\beta` | σ (sigma) | `\sigma` |
| χ (chi) | `\chi` | Σ (Sigma) | `\Sigma` |
| ε (epsilon) | `\epsilon` | ρ (rho) | `\rho` |
| θ (theta) | `\theta` | π (pi) | `\pi` |

### Common Notation

| Concept | LaTeX | Rendered |
|---------|-------|----------|
| Sample mean | `\bar{x}` | x̄ |
| Predicted value | `\hat{y}` | ŷ |
| Summation | `\sum_{i=1}^{n} x_i` | Σⁿᵢ₌₁ xᵢ |
| Fraction | `\frac{numerator}{denominator}` | numerator/denominator |
| Square root | `\sqrt{x}` | √x |
| Subscript | `x_i` or `x_{ij}` | xᵢ or xᵢⱼ |
| Superscript | `x^2` or `x^{n-1}` | x² or xⁿ⁻¹ |

### Statistical Equations

**Pearson Correlation:**
```latex
r = \frac{\sum_{i=1}^{n}(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_{i=1}^{n}(x_i - \bar{x})^2 \sum_{i=1}^{n}(y_i - \bar{y})^2}}
```

**Independent t-test:**
```latex
t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}
```

**One-way ANOVA F-statistic:**
```latex
F = \frac{MS_{between}}{MS_{within}} = \frac{SS_{between}/(k-1)}{SS_{within}/(N-k)}
```

**Chi-square test:**
```latex
\chi^2 = \sum_{i=1}^{k} \frac{(O_i - E_i)^2}{E_i}
```

**Simple linear regression:**
```latex
\hat{y} = \beta_0 + \beta_1 x
```

**Multiple regression:**
```latex
\hat{y} = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \cdots + \beta_k x_k
```

**Logistic regression:**
```latex
\log\left(\frac{p}{1-p}\right) = \beta_0 + \beta_1 x_1 + \cdots + \beta_k x_k
```

**Odds ratio:**
```latex
OR = \frac{p/(1-p)}{p_0/(1-p_0)} = e^{\beta_1}
```

---

## Complete Implementation Example

Here's a full example combining all patterns:

```javascript
// ==================== HELPER FUNCTIONS ====================

function inlineMath(latex) {
  return `\\(${latex}\\)`;
}

function displayMath(latex) {
  return `\\[${latex}\\]`;
}

function escapeLatex(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

async function typeset(...ids) {
  if (!window.MathJax?.typesetPromise) {
    console.warn('MathJax not available');
    return;
  }
  
  const elements = ids
    .map(id => document.getElementById(id))
    .filter(el => el);
  
  try {
    await MathJax.typesetPromise(elements);
  } catch (err) {
    console.error('MathJax typesetting error:', err);
  }
}

// ==================== EQUATION BUILDERS ====================

function buildCorrelationEquation(r, pValue) {
  const rFormatted = r.toFixed(3);
  const pFormatted = pValue < 0.001 
    ? '< 0.001' 
    : `= ${pValue.toFixed(3)}`;
  
  return inlineMath(`r = ${rFormatted}, \\, p ${pFormatted}`);
}

function buildRegressionEquation(model) {
  const { intercept, slope, xLabel } = model;
  const xEscaped = escapeLatex(xLabel);
  
  const sign = slope >= 0 ? '+' : '-';
  const slopeAbs = Math.abs(slope).toFixed(3);
  
  return displayMath(
    `\\hat{y} = ${intercept.toFixed(3)} ${sign} ${slopeAbs} \\cdot \\text{${xEscaped}}`
  );
}

// ==================== RENDERING FUNCTIONS ====================

async function renderCorrelationResults(data, xVar, yVar) {
  // Calculate statistics
  const r = calculateCorrelation(data, xVar, yVar);
  const pValue = calculatePValue(r, data.length);
  
  // Update text results
  document.getElementById('r-value').textContent = r.toFixed(3);
  document.getElementById('p-value').textContent = pValue.toFixed(4);
  
  // Update equation
  const equation = buildCorrelationEquation(r, pValue);
  document.getElementById('correlation-equation').innerHTML = equation;
  
  // Typeset the equation
  await typeset('correlation-equation');
  
  // Add interpretation
  const interp = r > 0 ? 'positive' : 'negative';
  const strength = Math.abs(r) > 0.7 ? 'strong' : Math.abs(r) > 0.3 ? 'moderate' : 'weak';
  document.getElementById('interpretation').innerHTML = `
    There is a ${strength} ${interp} correlation (${inlineMath(`r = ${r.toFixed(3)}`)} ) 
    between ${escapeLatex(xVar)} and ${escapeLatex(yVar)}.
  `;
  await typeset('interpretation');
}

async function renderRegressionResults(model) {
  // Update equation
  const equation = buildRegressionEquation(model);
  document.getElementById('regression-equation').innerHTML = equation;
  await typeset('regression-equation');
  
  // Update interpretation with inline math
  document.getElementById('slope-interpretation').innerHTML = `
    For every 1-unit increase in ${escapeLatex(model.xLabel)}, 
    ${escapeLatex(model.yLabel)} changes by ${inlineMath(`${model.slope.toFixed(3)}`)}.
  `;
  await typeset('slope-interpretation');
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  // Wait for MathJax to be ready before any math operations
  if (window.MathJax) {
    MathJax.startup.promise.then(() => {
      console.log('MathJax ready');
      
      // Initialize static equations if needed
      typeset('intro-equation', 'formula-section');
    });
  }
});
```

---

## Debugging Checklist

If equations aren't rendering, check:

- [ ] Is MathJax script included in `<head>`?
- [ ] Check console: `console.log(window.MathJax)` (should not be undefined)
- [ ] Are delimiters properly paired? Count `\(` matches `\)`
- [ ] In JavaScript, are backslashes doubled? `\\(` not `\(`
- [ ] After DOM update, did you call `MathJax.typesetPromise()`?
- [ ] Are there unescaped `$` currency symbols nearby?
- [ ] Check browser console for MathJax error messages
- [ ] Does the container element exist? Verify with `document.getElementById()`
- [ ] Is equation content properly escaped if from user input?
- [ ] Try viewing raw HTML source - do you see `\(` or just `(`?

---

## Testing Checklist

After implementing equations:

- [ ] Static equations render correctly on page load
- [ ] Dynamic equations update when analysis runs
- [ ] Equations survive multiple re-renders
- [ ] User-provided variable names don't break rendering
- [ ] Equations are readable on mobile devices
- [ ] Screen readers announce math content appropriately
- [ ] No console errors from MathJax
- [ ] Currency values near equations don't trigger math mode
- [ ] Equations render correctly in all major browsers
- [ ] Page performance acceptable (MathJax loads async)

---

## Performance Tips

1. **Typeset specific elements, not entire page:**
   ```javascript
   // ✅ GOOD - Fast, targeted
   await MathJax.typesetPromise([element1, element2]);
   
   // ❌ SLOW - Re-processes entire page
   await MathJax.typesetPromise();
   ```

2. **Batch multiple updates:**
   ```javascript
   // ✅ GOOD - One typeset call for multiple equations
   eq1.innerHTML = equation1;
   eq2.innerHTML = equation2;
   eq3.innerHTML = equation3;
   await MathJax.typesetPromise([eq1, eq2, eq3]);
   
   // ❌ SLOW - Three separate typeset calls
   eq1.innerHTML = equation1;
   await MathJax.typesetPromise([eq1]);
   eq2.innerHTML = equation2;
   await MathJax.typesetPromise([eq2]);
   eq3.innerHTML = equation3;
   await MathJax.typesetPromise([eq3]);
   ```

3. **Use `async` attribute on script tag** (already recommended)
   ```html
   <script id="MathJax-script" async src="..."></script>
   ```

4. **Don't over-use display math** - Inline math is faster to render

---

## Summary: Quick Reference

```
┌──────────────────────────────────────────────────────────────┐
│              MATHJAX EQUATION QUICK REFERENCE                │
├──────────────────────────────────────────────────────────────┤
│ STATIC HTML:                                                 │
│   Inline:      \( equation \)                                │
│   Display:     \[ equation \]  or  $$ equation $$            │
│                                                              │
│ DYNAMIC JS:                                                  │
│   Inline:      `\\( equation \\)`                            │
│   Display:     `\\[ equation \\]`                            │
│   Helper:      inlineMath(latex)  /  displayMath(latex)      │
│                                                              │
│ AFTER DOM UPDATE:                                            │
│   await MathJax.typesetPromise([element])                    │
│                                                              │
│ ALWAYS:                                                      │
│   ✓ Pair delimiters                                          │
│   ✓ Double backslashes in JS                                │
│   ✓ Escape user input                                        │
│   ✓ Handle errors gracefully                                │
│   ✓ Call typeset after DOM changes                          │
│                                                              │
│ NEVER:                                                       │
│   ✗ Single $ for inline math (use \( \))                    │
│   ✗ HTML tags inside delimiters                             │
│   ✗ Raw user input in LaTeX                                 │
│   ✗ Forget to typeset after updates                         │
└──────────────────────────────────────────────────────────────┘
```

---

**Reference:** MathJax rendering standards used across 25+ statistical tools (January 2026)
