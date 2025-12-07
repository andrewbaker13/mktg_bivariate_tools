# Marketing Resource Allocation Optimizer

**Created:** December 7, 2025  
**Category:** Advanced Analytics  
**Purpose:** Optimize budget allocation across resources using fitted response models and constraints

## Overview

This tool helps marketing analysts and managers allocate limited budgets across multiple resources (sales reps, channels, regions, campaigns) to maximize total output (revenue, conversions, leads) based on historical performance data.

## Key Features

### 1. **Flexible Model Fitting**
- Supports 5 response model types:
  - **Linear**: Y = a + bX (constant returns)
  - **Logarithmic**: Y = a + b·ln(X) (diminishing returns)
  - **Power**: Y = a·X^b (exponential growth/decay)
  - **Quadratic**: Y = a + bX + cX² (non-monotonic)
  - **Square Root**: Y = a + b·√X (moderate diminishing returns)

- Three fitting strategies:
  - **Auto-unified**: Fit all models to combined data, pick best overall
  - **Auto-individual**: Fit all models per resource, pick best for each
  - **Manual**: User selects one model type for all resources

- Model selection uses AIC (Akaike Information Criterion) for statistical rigor

### 2. **Comprehensive Constraints**
- **Basic**:
  - Total budget cap
  - Per-resource minimum/maximum allocations
  - Integer constraints (whole dollar allocations)

- **Advanced**:
  - **Cardinality**: Limit number of funded resources
  - **Equity**: Enforce fairness (max/min ratio limits)
  - **Baseline deviation**: Limit % change from historical allocations

### 3. **Optimization Engine**
- **Primary method**: Greedy marginal returns allocator
  - Transparent, reliable, respects all constraints
  - Iteratively allocates budget to highest-return resources
  - Works well for all model types

- **Future expansion**: Numerical optimization (SLSQP) for complex cases

### 4. **Rich Diagnostics**
Technical feedback includes:
- Optimization method used and why
- Constraint satisfaction summary
- Model fit quality warnings (R², AIC scores)
- Marginal returns analysis
- Convergence details

Practical considerations for managers:
- Budget utilization guidance
- Data quality warnings
- ROI interpretation
- Implementation tips
- Resource exclusion explanations
- Equity vs efficiency tradeoffs

### 5. **Scenario War-Gaming**
- Save multiple optimization scenarios
- Side-by-side comparison of allocations
- Sensitivity analysis (test different budget levels)
- Export allocations to CSV

### 6. **Interactive Visualizations**
- **Response curves**: See input-output relationships with optimal allocations marked
- **Allocation bars**: Compare budget distribution across resources
- **Marginal returns**: Identify resources at efficiency limits
- **Sensitivity charts**: Explore budget scaling effects

## Data Requirements

### Input Format
CSV/TSV file with three columns:
- `resource_id`: Name/label for each resource (text)
- `input`: Historical budget/spend (numeric, ≥ 0)
- `output`: Historical outcome (revenue, conversions, leads; numeric, ≥ 0)

### Example
```csv
resource_id,input,output
Rep_A,5000,45000
Rep_B,8000,62000
Rep_C,3000,28000
```

### Limits
- Maximum 500 resources supported
- Minimum 1 observation per resource (though 3+ recommended for robust model fitting)

## Typical Workflows

### Workflow 1: Basic Optimization
1. Upload historical data (CSV)
2. Select model fitting strategy (auto-unified recommended)
3. Click "Fit models to data"
4. Set total budget and per-resource constraints
5. Click "Run optimization"
6. Review results, diagnostics, and charts
7. Export allocation for implementation

### Workflow 2: Scenario Comparison
1. Complete basic optimization
2. Save scenario with descriptive name
3. Adjust constraints (e.g., add equity limit)
4. Re-run optimization
5. Save second scenario
6. Go to "Scenario Comparison" section
7. Select both scenarios and click "Compare"
8. Review trade-offs between efficiency and equity

### Workflow 3: Sensitivity Analysis
1. Complete optimization with current budget
2. Go to "Sensitivity Analysis"
3. Set budget range (e.g., 50% to 200% of current)
4. Click "Run sensitivity analysis"
5. View chart showing output scaling with budget
6. Use insights to justify budget requests or identify diminishing returns

## Use Cases

### Sales Team Management
- **Input**: Travel budgets per sales rep
- **Output**: New customer revenue
- **Goal**: Maximize total new revenue
- **Constraints**: Minimum $2K per rep (fairness), max $15K per rep (diminishing returns)

### Digital Marketing
- **Input**: Ad spend per channel/influencer
- **Output**: Conversions or revenue
- **Goal**: Maximize conversions within budget
- **Constraints**: Minimum spend per channel (testing requirements), cardinality (limit # of active channels)

### Regional Marketing
- **Input**: Field marketing budget per region
- **Output**: Leads generated
- **Goal**: Maximize total leads
- **Constraints**: Baseline deviation (can't cut regions by >30%), equity (no region gets >3x another)

### Training Programs
- **Input**: Training hours per employee
- **Output**: Quota attainment or productivity
- **Goal**: Maximize performance
- **Constraints**: Integer hours, minimum per employee (policy requirement)

## Interpretation Guidance

### Model Fit (R²)
- **> 0.90**: Excellent fit, predictions highly reliable
- **0.70–0.90**: Good fit, reasonable confidence in predictions
- **0.50–0.70**: Fair fit, use predictions with caution
- **< 0.50**: Poor fit, consider collecting more data

### ROI Expectations
- **< 0%**: Negative ROI; verify data and models before implementing
- **0–50%**: Modest returns; typical for mature markets
- **50–200%**: Strong returns; realistic for growth channels
- **> 500%**: Exceptional returns; double-check assumptions (may indicate extrapolation issues)

### Marginal Returns
- **Equalized**: Efficient allocation (no single resource offers much better returns than others)
- **High variability**: Constraints may be binding, or resources have fundamentally different economics

## Diagnostics Interpretation

### "Budget Utilization <95%"
**Meaning**: Not all budget was allocated  
**Action**: Constraints (max per resource, cardinality) may be too tight. Consider relaxing if you have budget to spend.

### "Poor Model Fit Warnings"
**Meaning**: Some resources have R² < 0.50  
**Action**: Manually review these allocations. Consider collecting more historical data or using qualitative judgment.

### "High ROI Predicted"
**Meaning**: Models predict exceptional returns  
**Action**: Verify assumptions. High ROI may indicate extrapolation beyond historical data ranges. Pilot cautiously.

### "Cardinality Constraint Active"
**Meaning**: Some resources received zero/minimum allocation  
**Action**: Review excluded resources—they may need non-budget interventions (training, process improvement) to become viable.

## Technical Notes

### Model Fitting for Single Observations
When only one historical data point exists per resource (common in cross-sectional data), the tool creates simple models that pass through that point using sensible assumptions (e.g., linear through origin). R² will be reported as 1.0 (perfect fit), but this reflects the constraint, not predictive power. For robust optimization:
- Collect multiple observations per resource when possible
- Use qualitative judgment alongside model outputs
- Consider manual model selection if historical data is limited

### Integer Rounding
When integer constraints are enabled, allocations are rounded to whole dollars. The tool uses "controlled rounding" to maintain exact budget totals, which may cause <1% deviation from the true continuous optimum.

### Greedy vs Numerical Optimization
The greedy allocator is the primary method because:
- It's transparent (easy to explain to stakeholders)
- It respects all constraints exactly
- It works well for most marketing response curves

Numerical methods (future) may find slightly better solutions for complex non-linear models but require careful tuning and may violate constraints in edge cases.

## Best Practices

1. **Start with auto-unified model fitting**: Let the algorithm pick the best model based on combined data. Only use manual selection if you have strong domain knowledge.

2. **Use realistic constraints**: Don't over-constrain. If budget utilization is low, relax maximums or cardinality limits.

3. **Save multiple scenarios**: Test both efficiency-focused (no equity constraint) and fairness-focused (equity constraint) allocations to inform decisions.

4. **Run sensitivity analysis**: Understand how returns scale with budget to justify funding requests or identify diminishing returns thresholds.

5. **Combine with judgment**: Treat optimizations as recommendations, not mandates. Factor in qualitative considerations (team morale, strategic priorities, market conditions).

6. **Iterate**: After implementation, collect new data and re-run optimization quarterly. Resource allocation is not one-and-done.

## Limitations

- **Assumes past predicts future**: Models are based on historical data. If market conditions change, predictions may be inaccurate.
- **No interaction effects**: Single-input models don't capture synergies (e.g., channel A + B > A + B separately).
- **Client-side only**: Large-scale optimizations (>500 resources) may be slow in browser.
- **No Monte Carlo**: Predictions are point estimates without confidence intervals.

## Future Enhancements

- Preset scenario integration (load marketing use cases with one click)
- What-if editing (manually adjust allocations and see updated predictions)
- Multi-input models (2-3 predictors per resource)
- Confidence intervals on predictions
- Batch scenario testing
- Integration with backend for large-scale optimizations

## Support

For questions, issues, or feature requests, contact the tool developer or refer to the main Statistical Analysis Tool Suite documentation.

---

**Citation**: Baker, A. (2025). *Marketing Resource Allocation Optimizer*. Retrieved from Statistical Analysis Tool Suite.
