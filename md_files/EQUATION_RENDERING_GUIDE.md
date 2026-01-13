# Equation Rendering Guide
**For Dr. Baker Marketing Analytics Tools**  
**Last Updated:** January 13, 2026

---

## Overview

This document establishes standards for rendering mathematical equations across all tools using **MathJax 3**. Following these rules ensures equations render consistently, don't break surrounding HTML, and degrade gracefully on failure.

---

## 🔧 MathJax Configuration

### Standard Script Include
All tools should load MathJax from CDN in the `<head>`:

```html
<script id="MathJax-script" async 
  src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
```

**Why `tex-mml-chtml.js`?**
- Supports both TeX and MathML input
- Outputs Common HTML (most compatible)
- Better accessibility than SVG output

### Optional: Custom Configuration
If you need to customize MathJax behavior, add this **before** the script include:

```html
<script>
  window.MathJax = {
    tex: {
      inlineMath: [['\\(', '\\)']],
      displayMath: [['\\[', '\\]'], ['$$', '$$']]
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
    }
  };
</script>
<script id="MathJax-script" async src="..."></script>
```

---

## ✅ Delimiter Conventions

### PREFERRED: Backslash Delimiters

| Type | Delimiter | When to Use |
|------|-----------|-------------|
| **Inline** | `\( equation \)` | Math within text flow |
| **Display** | `\[ equation \]` | Standalone, centered equations |

**Example:**
```html
<p>The correlation coefficient \(r\) ranges from -1 to 1.</p>

<div class="equation-display">
  \[r = \frac{\sum(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum(x_i - \bar{x})^2 \sum(y_i - \bar{y})^2}}\]
</div>
```

### ACCEPTABLE: Dollar Sign Delimiters

| Type | Delimiter | Caution |
|------|-----------|---------|
| **Display** | `$$ equation $$` | ⚠️ Can conflict with currency |

**Only use `$$` for display math in controlled contexts (no currency values nearby).**

### ❌ AVOID: Single Dollar Signs

```html
<!-- ❌ NEVER DO THIS -->
<p>The price is $50 and the correlation is $r = 0.73$</p>

<!-- MathJax may interpret "$50 and..." as math! -->
```

---

## 📝 Static HTML Patterns

### Pattern 1: Inline Equation in Text
```html
<p>
  The test statistic \(t\) is calculated as the difference between means 
  divided by the standard error: \(t = \frac{\bar{x}_1 - \bar{x}_2}{SE}\).
</p>
```

### Pattern 2: Display Equation with Context
```html
<div class="equation-section">
  <p><strong>The regression equation:</strong></p>
  \[Y = \beta_0 + \beta_1 X_1 + \beta_2 X_2 + \epsilon\]
  <p class="muted">where \(\epsilon\) represents the error term.</p>
</div>
```

### Pattern 3: Equation in Details/Summary
```html
<details class="intro-notes" open>
  <summary>Statistical Formula</summary>
  <p>The F-statistic is computed as:</p>
  \[F = \frac{MS_{between}}{MS_{within}} = \frac{\sum n_j(\bar{x}_j - \bar{x})^2 / (k-1)}{\sum\sum(x_{ij} - \bar{x}_j)^2 / (N-k)}\]
</details>
```

### Pattern 4: Equations in Tables
```html
<table class="stats-table">
  <tr>
    <td>Sample Mean</td>
    <td>\(\bar{x} = \frac{\sum x_i}{n}\)</td>
  </tr>
  <tr>
    <td>Standard Deviation</td>
    <td>\(s = \sqrt{\frac{\sum(x_i - \bar{x})^2}{n-1}}\)</td>
  </tr>
</table>
```

---

## ⚡ Dynamic JavaScript Patterns

### Rule 1: Use Template Literals with Escaped Backslashes

In JavaScript strings, backslashes must be doubled:

```javascript
// ✅ CORRECT
const inlineEq = `\\(r^2 = ${rSquared.toFixed(3)}\\)`;
const displayEq = `\\[Y = ${intercept.toFixed(2)} + ${slope.toFixed(2)}X\\]`;

// ❌ WRONG - Single backslashes get consumed by JS
const broken = `\(r^2 = ${rSquared}\)`;  // Becomes "(r^2 = 0.73)"
```

### Rule 2: Build Equations Safely with Helper Functions

```javascript
/**
 * Wrap content in inline math delimiters
 * @param {string} latex - LaTeX content (no delimiters)
 * @returns {string} - Properly delimited inline math
 */
function inlineMath(latex) {
  return `\\(${latex}\\)`;
}

/**
 * Wrap content in display math delimiters
 * @param {string} latex - LaTeX content (no delimiters)
 * @returns {string} - Properly delimited display math
 */
function displayMath(latex) {
  return `\\[${latex}\\]`;
}

// Usage
const eq = inlineMath(`r = ${r.toFixed(3)}`);
// Result: "\\(r = 0.734\\)"
```

### Rule 3: Escape User-Provided Values

Never insert raw user input into LaTeX:

```javascript
/**
 * Escape special LaTeX characters in user input
 * @param {string} str - User-provided string
 * @returns {string} - Safe for LaTeX
 */
function escapeLatex(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// Usage
const varName = escapeLatex(userInput);  // "Sales_2024" → "Sales\\_2024"
const eq = inlineMath(`\\text{${varName}} = ${value}`);
```

### Rule 4: Call typesetPromise After DOM Updates

When you dynamically insert equations, MathJax needs to re-process:

```javascript
async function renderEquation(containerId, latex) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Insert the LaTeX
  container.innerHTML = displayMath(latex);
  
  // Tell MathJax to process just this container
  if (window.MathJax?.typesetPromise) {
    try {
      await MathJax.typesetPromise([container]);
    } catch (err) {
      console.warn('MathJax rendering failed:', err);
      // Equation stays as raw LaTeX (graceful degradation)
    }
  }
}

// Usage
await renderEquation('regression-equation', `Y = ${b0} + ${b1}X`);
```

### Rule 5: Clear Previous MathJax Output Before Re-rendering

```javascript
async function updateEquation(containerId, newLatex) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Clear any previous MathJax-rendered content
  if (window.MathJax?.typesetClear) {
    MathJax.typesetClear([container]);
  }
  
  // Insert new equation
  container.innerHTML = displayMath(newLatex);
  
  // Re-render
  if (window.MathJax?.typesetPromise) {
    await MathJax.typesetPromise([container]);
  }
}
```

---

## 🎨 CSS Classes for Equations

### Available in `main.css`

```css
/* Equation inside intro/hero header */
.intro .equation {
  font-size: 16px;
  font-weight: normal;
  margin: 10px 0;
  background-color: #fff;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #bae6fd;
}

/* Standalone equation section */
.equation-section {
  background: var(--app-card-bg);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

/* Callout box for equation notes */
.equation-note {
  margin-top: 1.25rem;
  background: #f8f9fb;
  padding: 1.2rem;
  border-radius: 12px;
  border-left: 4px solid var(--app-accent);
}
```

### Recommended HTML Structure

```html
<!-- For equations in card content -->
<div class="card">
  <h3>Model Equation</h3>
  <div class="equation-section">
    <p id="regression-equation"></p>
  </div>
  <div class="equation-note">
    <h4>Interpretation</h4>
    <p>For every 1-unit increase in X, Y increases by...</p>
  </div>
</div>
```

---

## 🚫 Common Pitfalls & Fixes

### Pitfall 1: Unclosed Delimiters

```javascript
// ❌ BAD - Missing closing delimiter
container.innerHTML = `\\(r = ${r.toFixed(3)}`;  // Breaks everything after!

// ✅ GOOD - Always pair delimiters
container.innerHTML = `\\(r = ${r.toFixed(3)}\\)`;
```

### Pitfall 2: HTML Tags Inside Math

```javascript
// ❌ BAD - HTML inside LaTeX
const eq = `\\(<strong>${varName}</strong> = ${value}\\)`;

// ✅ GOOD - Use \text{} or \mathbf{} for formatting
const eq = `\\(\\mathbf{${varName}} = ${value}\\)`;
// Or keep formatting outside:
const html = `<strong>${varName}</strong> = \\(${value}\\)`;
```

### Pitfall 3: Currency Near Math

```html
<!-- ❌ RISKY - $ could confuse MathJax -->
<p>Revenue of $50,000 with correlation $r = 0.5$</p>

<!-- ✅ SAFE - Use entity or backslash delimiters -->
<p>Revenue of &#36;50,000 with correlation \(r = 0.5\)</p>
```

### Pitfall 4: Forgetting to Re-typeset

```javascript
// ❌ BAD - Equation won't render
document.getElementById('eq').innerHTML = '\\(x^2\\)';
// User sees: \(x^2\)

// ✅ GOOD - Trigger MathJax
document.getElementById('eq').innerHTML = '\\(x^2\\)';
MathJax.typesetPromise([document.getElementById('eq')]);
// User sees: x² (rendered)
```

### Pitfall 5: Race Condition on Page Load

```javascript
// ❌ BAD - MathJax might not be ready
function init() {
  MathJax.typesetPromise();  // May throw if MathJax hasn't loaded
}

// ✅ GOOD - Check availability
function init() {
  if (window.MathJax?.typesetPromise) {
    MathJax.typesetPromise();
  }
}
```

---

## 📚 Reference: Common LaTeX Symbols

### Greek Letters
| Symbol | LaTeX | Symbol | LaTeX |
|--------|-------|--------|-------|
| α | `\alpha` | μ | `\mu` |
| β | `\beta` | σ | `\sigma` |
| χ | `\chi` | Σ | `\Sigma` |
| ε | `\epsilon` | ρ | `\rho` |

### Operators & Relations
| Symbol | LaTeX | Symbol | LaTeX |
|--------|-------|--------|-------|
| ± | `\pm` | ≠ | `\neq` |
| × | `\times` | ≤ | `\leq` |
| ÷ | `\div` | ≥ | `\geq` |
| ∑ | `\sum` | ∈ | `\in` |

### Statistics-Specific
| Concept | LaTeX |
|---------|-------|
| Sample mean | `\bar{x}` |
| Population mean | `\mu` |
| Standard deviation | `\sigma` or `s` |
| Variance | `\sigma^2` or `s^2` |
| Summation | `\sum_{i=1}^{n} x_i` |
| Fraction | `\frac{numerator}{denominator}` |
| Square root | `\sqrt{expression}` |
| Subscript | `x_i` or `x_{ij}` |
| Superscript | `x^2` or `x^{n-1}` |

### Common Equations

**Correlation:**
```latex
r = \frac{\sum(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum(x_i - \bar{x})^2 \sum(y_i - \bar{y})^2}}
```

**t-statistic:**
```latex
t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}
```

**F-statistic:**
```latex
F = \frac{MS_{between}}{MS_{within}}
```

**Chi-square:**
```latex
\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}
```

**Regression:**
```latex
\hat{y} = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \cdots + \beta_k x_k
```

**Logistic Regression:**
```latex
\log\left(\frac{p}{1-p}\right) = \beta_0 + \beta_1 x_1 + \cdots + \beta_k x_k
```

---

## ✨ Best Practice Examples from Codebase

### Good Example: Probability Tools
From `compound_event_probability.js`:

```javascript
// Build LaTeX string with proper escaping
workedHTML += `<p>\\[P(X \\ge ${k}) = \\sum_{i=${k}}^{${n}} \\binom{${n}}{i} (${p.toFixed(4)})^i (${(1-p).toFixed(4)})^{${n}-i}\\]</p>`;

// Update DOM
workedDiv.innerHTML = workedHTML;

// Typeset with error handling
if (window.MathJax) {
  MathJax.typesetPromise([generalDiv, workedDiv]).catch(err => 
    console.error('MathJax error:', err)
  );
}
```

### Good Example: Static HTML
From `main_ps_matching.html`:

```html
<p>Propensity score methods use logistic regression to estimate the 
<strong>probability of receiving treatment</strong> given observed covariates:</p>

$$ \log\left(\frac{p_i}{1 - p_i}\right) = \beta_0 + \beta_1 X_{1i} + \beta_2 X_{2i} + \dots + \beta_p X_{pi} $$

<p>where \(p_i = \Pr(T_i = 1 \mid X_{1i}, \dots, X_{pi})\) is the probability 
of treatment for individual \(i\).</p>
```

---

## 🔍 Debugging Checklist

If equations aren't rendering:

- [ ] Is MathJax loaded? Check: `console.log(window.MathJax)`
- [ ] Are delimiters properly paired? Count `\(` and `\)` matches
- [ ] In JS, are backslashes doubled? `\\(` not `\(`
- [ ] After DOM update, did you call `MathJax.typesetPromise()`?
- [ ] Is there a `$` currency symbol nearby that could be misinterpreted?
- [ ] Check browser console for MathJax errors
- [ ] Does the container element exist? Check `document.getElementById()`

---

## 📋 Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                 EQUATION QUICK REFERENCE                │
├─────────────────────────────────────────────────────────┤
│ HTML INLINE:     \( equation \)                         │
│ HTML DISPLAY:    \[ equation \]  or  $$ equation $$     │
│                                                         │
│ JS INLINE:       `\\( equation \\)`                     │
│ JS DISPLAY:      `\\[ equation \\]`                     │
│                                                         │
│ AFTER DOM:       MathJax.typesetPromise([element])      │
│                                                         │
│ ALWAYS:          - Pair delimiters                      │
│                  - Escape user input                    │
│                  - Handle errors gracefully             │
│                                                         │
│ NEVER:           - Single $ for inline math             │
│                  - HTML tags inside delimiters          │
│                  - Raw user input in LaTeX              │
└─────────────────────────────────────────────────────────┘
```

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-13 | Initial document created |
