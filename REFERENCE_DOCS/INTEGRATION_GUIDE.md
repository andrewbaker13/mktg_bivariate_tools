# Usage Tracking Integration Guide

## Quick Start - Add to Any Tool

### Step 1: Add auth_tracking.js to your HTML

In the `<head>` or before `</body>` of each tool page:

```html
<script src="../../shared/js/auth_tracking.js"></script>
```

### Step 2: Log usage when tool runs

Add this code where your tool performs its main calculation:

```javascript
// Example: After running Pearson correlation
const r = calculateCorrelation(x, y);

// Log the usage
await logToolUsage('pearson-correlation', {
    n: x.length,
    r: r,
    data_source: 'manual'  // or 'csv'
}, `Calculated correlation: r = ${r.toFixed(3)}`);
```

---

## Tool-Specific Examples

### Pearson Correlation

```javascript
// In main_pearson.js, after computing results
async function runAnalysis() {
    const result = computePearsonCorrelation(xData, yData);
    
    // Track usage
    await logToolUsage('pearson-correlation', {
        n: xData.length,
        r: result.r,
        p_value: result.pValue,
        data_mode: currentMode  // 'manual', 'paired', or 'matrix'
    }, `r = ${result.r.toFixed(3)}, p = ${result.pValue.toFixed(4)}`);
    
    displayResults(result);
}
```

### Bivariate Regression

```javascript
// After fitting regression line
async function runRegression() {
    const fit = fitLinearModel(xData, yData);
    
    await logToolUsage('bivariate-regression', {
        n: xData.length,
        slope: fit.slope,
        intercept: fit.intercept,
        r_squared: fit.rSquared
    }, `R² = ${fit.rSquared.toFixed(3)}`);
    
    plotRegression(fit);
}
```

### Multiple Regression

```javascript
// After model fitting
async function fitModel() {
    const model = runMultipleRegression(data, predictors, outcome);
    
    await logToolUsage('multiple-regression', {
        n: data.length,
        predictors: predictors.length,
        r_squared: model.rSquared,
        significant_predictors: model.significantPredictors.length
    }, `Fitted ${predictors.length}-predictor model, R² = ${model.rSquared.toFixed(3)}`);
    
    displayModelResults(model);
}
```

### Logistic Regression

```javascript
// After logistic model
async function fitLogisticModel() {
    const model = runLogistic(data, predictors, outcome);
    
    await logToolUsage('logistic-regression', {
        n: data.length,
        predictors: predictors.length,
        pseudo_r2: model.pseudoR2,
        accuracy: model.accuracy
    }, `Accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
    
    displayLogisticResults(model);
}
```

### K-Means Clustering

```javascript
// After clustering
async function runClustering() {
    const clusters = kMeans(data, k);
    
    await logToolUsage('kmeans-clustering', {
        n: data.length,
        k: k,
        features: featureNames.length,
        iterations: clusters.iterations
    }, `Clustered ${data.length} cases into ${k} groups`);
    
    visualizeClusters(clusters);
}
```

### T-Test (Independent)

```javascript
// After t-test
async function runTTest() {
    const test = welchTTest(group1, group2);
    
    await logToolUsage('welch-t-test', {
        n1: group1.length,
        n2: group2.length,
        mean_diff: test.meanDiff,
        t_stat: test.t,
        p_value: test.pValue
    }, `t = ${test.t.toFixed(2)}, p = ${test.pValue.toFixed(4)}`);
    
    displayTTestResults(test);
}
```

### T-Test (Paired)

```javascript
// After paired t-test
async function runPairedTest() {
    const test = pairedTTest(before, after);
    
    await logToolUsage('paired-t-test', {
        n_pairs: before.length,
        mean_diff: test.meanDiff,
        t_stat: test.t,
        p_value: test.pValue
    }, `Mean difference: ${test.meanDiff.toFixed(2)}, p = ${test.pValue.toFixed(4)}`);
    
    displayPairedResults(test);
}
```

### ANOVA

```javascript
// After ANOVA
async function runANOVA() {
    const anova = oneWayANOVA(groups);
    
    await logToolUsage('one-way-anova', {
        n_groups: groups.length,
        total_n: groups.reduce((sum, g) => sum + g.length, 0),
        f_stat: anova.F,
        p_value: anova.pValue
    }, `F(${anova.df1},${anova.df2}) = ${anova.F.toFixed(2)}, p = ${anova.pValue.toFixed(4)}`);
    
    displayANOVAResults(anova);
}
```

### Chi-Square

```javascript
// After chi-square test
async function runChiSquare() {
    const test = chiSquareTest(contingencyTable);
    
    await logToolUsage('chi-square-test', {
        rows: contingencyTable.length,
        cols: contingencyTable[0].length,
        chi2_stat: test.chi2,
        p_value: test.pValue
    }, `χ²(${test.df}) = ${test.chi2.toFixed(2)}, p = ${test.pValue.toFixed(4)}`);
    
    displayChiSquareResults(test);
}
```

### A/B Proportion Test

```javascript
// After proportion test
async function runProportionTest() {
    const test = proportionTest(convA, nA, convB, nB);
    
    await logToolUsage('ab-proportion-test', {
        n_a: nA,
        n_b: nB,
        conv_rate_a: convA / nA,
        conv_rate_b: convB / nB,
        z_stat: test.z,
        p_value: test.pValue
    }, `Conversion: ${((convB/nB - convA/nA)*100).toFixed(2)}% lift, p = ${test.pValue.toFixed(4)}`);
    
    displayProportionResults(test);
}
```

---

## Authentication UI

The `auth_tracking.js` script automatically adds login status to page headers.

Shows one of:
- **Logged in**: "✓ Logged in as username [Logout]"
- **Not logged in**: "⚠ Not logged in - usage not being tracked [Login]"

Users can click Login/Logout directly from any tool page.

---

## What Gets Tracked

For each tool run, we capture:
- **tool_slug**: Unique identifier (e.g., 'pearson-correlation')
- **page_url**: Full URL where tool was used
- **params_json**: Object with all relevant parameters
- **result_summary**: Brief text summary of output
- **timestamp**: When it was run
- **user**: Linked to authenticated user account

---

## Best Practices

### 1. Use Consistent Slugs
```javascript
// Good - kebab-case, descriptive
'pearson-correlation'
'multiple-regression'
'welch-t-test'

// Bad - inconsistent
'PearsonCorr'
'multipleRegression'
'ttest_ind'
```

### 2. Track Meaningful Parameters
```javascript
// Good - captures key inputs
{
    n: 50,
    r: 0.73,
    p_value: 0.0001,
    data_source: 'csv'
}

// Bad - too much or too little
{
    everything: JSON.stringify(allData)  // Too much
}
{ n: 50 }  // Too little
```

### 3. Write Clear Summaries
```javascript
// Good - concise, informative
`r = 0.730, p < .001, n = 50`
`Fitted 3-predictor model, R² = 0.65`

// Bad - vague or verbose
`Done`
`The correlation coefficient was calculated to be 0.730123456...`
```

### 4. Don't Track Sensitive Data
```javascript
// Good - no PII
{ n: 100, mean_age: 34.5 }

// Bad - contains identifiable info
{ customer_emails: [...], names: [...] }
```

---

## Testing

### Test locally:
1. Open any tool in browser
2. Click "Login" in header
3. Login with test account
4. Run the tool
5. Check browser console for "Usage tracked: ..."

### Test on production:
1. Open tool on live site
2. Login
3. Run tool
4. Visit `/analytics/my-usage/` API endpoint
5. Verify your run appears

---

## Troubleshooting

### "User not authenticated, skipping usage tracking"
**Solution**: User needs to login first. Auth status shown in page header.

### "Usage tracking failed"
**Causes**:
- Backend is down
- CORS not configured
- Invalid token (user needs to re-login)

**Check**: Browser console for detailed error message

### No auth UI appearing
**Causes**:
- `auth_tracking.js` not loaded
- No `.hero-header__top` or `.hero-header` element on page

**Fix**: Add script tag and ensure header HTML structure matches

---

## Next Steps

1. Add `<script src="../../shared/js/auth_tracking.js"></script>` to each tool
2. Find the main "run" or "calculate" function in each tool
3. Add `await logToolUsage(...)` call after calculation
4. Test on a few tools
5. Roll out to all tools
6. Build analytics dashboard to view usage data

Questions? Check the main repo or contact the developer.
