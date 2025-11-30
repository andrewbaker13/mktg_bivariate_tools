# Scenario HTML Template Reference

This document provides the standard HTML template and CSS classes for creating styled scenario descriptions across all tools.

## Full HTML Template

```html
<div class="scenario-description">
  <div class="scenario-header">
    <span class="scenario-icon">📊</span>
    <h4>Scenario Title</h4>
    <span class="scenario-badge">Duration/Context Badge</span>
  </div>
  
  <p class="scenario-intro">
    Brief introduction paragraph describing the business context and what the user will analyze.
  </p>
  
  <div class="scenario-variables">
    <h5>📋 Variables</h5>
    <table class="scenario-var-table">
      <tr>
        <td><span class="var-tag outcome">outcome_var</span></td>
        <td>Description of the dependent/outcome variable</td>
      </tr>
      <tr>
        <td><span class="var-tag predictor">predictor_var</span></td>
        <td>Description of continuous predictor variable</td>
      </tr>
      <tr>
        <td><span class="var-tag binary">binary_var</span></td>
        <td>Description of binary/dummy variable (0/1)</td>
      </tr>
    </table>
  </div>
  
  <div class="scenario-context">
    <h5>🎯 Business Context</h5>
    <div class="context-grid">
      <div class="context-item">
        <strong>Category Label</strong>
        <span>Detail or value</span>
      </div>
      <div class="context-item">
        <strong>Another Category</strong>
        <span>Another detail</span>
      </div>
      <div class="context-item">
        <strong>Third Category</strong>
        <span>Third detail</span>
      </div>
    </div>
  </div>
  
  <div class="scenario-insights">
    <h5>💡 What to Look For</h5>
    <ul>
      <li>First insight or analysis suggestion</li>
      <li>Second insight or pattern to examine</li>
      <li>Third analytical consideration</li>
    </ul>
  </div>
  
  <div class="scenario-tip">
    <strong>💡 Pro Tip:</strong> Helpful advice for using this scenario effectively.
  </div>
  
  <div class="scenario-questions">
    <h5>❓ Analysis Questions</h5>
    <ol>
      <li>First analytical question to answer</li>
      <li>Second analytical question</li>
      <li>Third analytical question</li>
    </ol>
  </div>
</div>
```

## CSS Classes Reference

### Container Classes

| Class | Purpose |
|-------|---------|
| `.scenario-description` | Main container for entire scenario |
| `.scenario-header` | Header row with icon, title, badge |
| `.scenario-variables` | Variables section container |
| `.scenario-context` | Business context section |
| `.scenario-insights` | Insights/what to look for section |
| `.scenario-tip` | Pro tip callout box |
| `.scenario-questions` | Analysis questions section |

### Variable Tag Classes

| Class | Color | Use For |
|-------|-------|---------|
| `.var-tag.outcome` | Green (#28a745) | Dependent/outcome variables |
| `.var-tag.predictor` | Blue (#007bff) | Continuous predictor variables |
| `.var-tag.binary` | Yellow/Orange (#ffc107) | Binary/dummy variables (0/1) |
| `.var-tag.categorical` | Purple (#6f42c1) | Categorical variables |
| `.var-tag.time` | Teal (#17a2b8) | Time/date variables |

### Icon Suggestions by Tool Type

| Tool Type | Header Icon | Variables Icon | Context Icon | Insights Icon | Questions Icon |
|-----------|-------------|----------------|--------------|---------------|----------------|
| Regression | 📈 | 📋 | 🎯 | 💡 | ❓ |
| Time Series | 📊 | 📋 | 🎯 | 💡 | ❓ |
| Classification | 🎯 | 📋 | 🏢 | 💡 | ❓ |
| Clustering | 🔮 | 📋 | 🎯 | 💡 | ❓ |
| A/B Testing | 🧪 | 📋 | 🎯 | 💡 | ❓ |
| Chi-Square | 📊 | 📋 | 🎯 | 💡 | ❓ |

## Required CSS

Add this CSS to the tool's stylesheet:

```css
/* ===== Scenario Description Styling ===== */
.scenario-description {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 1rem;
    border-left: 4px solid var(--primary-color, #007bff);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.scenario-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #dee2e6;
}

.scenario-icon {
    font-size: 1.5rem;
}

.scenario-header h4 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.1rem;
    flex-grow: 1;
}

.scenario-badge {
    background: var(--primary-color, #007bff);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}

.scenario-intro {
    color: #495057;
    line-height: 1.6;
    margin-bottom: 1rem;
}

.scenario-variables h5,
.scenario-context h5,
.scenario-insights h5,
.scenario-questions h5 {
    color: #2c3e50;
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.scenario-var-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
}

.scenario-var-table td {
    padding: 0.5rem;
    border-bottom: 1px solid #e9ecef;
    vertical-align: middle;
}

.scenario-var-table td:first-child {
    width: 140px;
    white-space: nowrap;
}

.var-tag {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    font-weight: 600;
}

.var-tag.outcome {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.var-tag.predictor {
    background: #cce5ff;
    color: #004085;
    border: 1px solid #b8daff;
}

.var-tag.binary {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
}

.var-tag.categorical {
    background: #e2d9f3;
    color: #5a3d7a;
    border: 1px solid #d4c4e8;
}

.var-tag.time {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

.context-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.context-item {
    background: white;
    padding: 0.75rem;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.context-item strong {
    display: block;
    color: #6c757d;
    font-size: 0.75rem;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
}

.context-item span {
    color: #2c3e50;
    font-weight: 600;
}

.scenario-insights ul,
.scenario-questions ol {
    margin: 0;
    padding-left: 1.25rem;
    color: #495057;
}

.scenario-insights li,
.scenario-questions li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
}

.scenario-tip {
    background: #e7f3ff;
    border: 1px solid #b8daff;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin: 1rem 0;
    color: #004085;
    font-size: 0.9rem;
}

.scenario-questions {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
}
```

## Example: Ad Spend & Sales Scenario

```html
<div class="scenario-description">
  <div class="scenario-header">
    <span class="scenario-icon">📈</span>
    <h4>Digital Marketing Campaign Analysis</h4>
    <span class="scenario-badge">52 Weeks</span>
  </div>
  
  <p class="scenario-intro">
    You're a marketing analyst at a mid-size e-commerce company. Leadership wants to understand 
    how advertising spend impacts weekly sales revenue, accounting for seasonal patterns and 
    promotional events.
  </p>
  
  <div class="scenario-variables">
    <h5>📋 Variables</h5>
    <table class="scenario-var-table">
      <tr>
        <td><span class="var-tag outcome">sales</span></td>
        <td>Weekly sales revenue in thousands ($K)</td>
      </tr>
      <tr>
        <td><span class="var-tag predictor">ad_spend</span></td>
        <td>Weekly advertising budget in thousands ($K)</td>
      </tr>
      <tr>
        <td><span class="var-tag binary">promo_week</span></td>
        <td>Major promotion running (1) or not (0)</td>
      </tr>
    </table>
  </div>
  
  <div class="scenario-context">
    <h5>🎯 Business Context</h5>
    <div class="context-grid">
      <div class="context-item">
        <strong>Industry</strong>
        <span>E-commerce</span>
      </div>
      <div class="context-item">
        <strong>Time Frame</strong>
        <span>1 Year</span>
      </div>
      <div class="context-item">
        <strong>Frequency</strong>
        <span>Weekly</span>
      </div>
    </div>
  </div>
  
  <div class="scenario-insights">
    <h5>💡 What to Look For</h5>
    <ul>
      <li>Lag effects between ad spend and sales response</li>
      <li>Impact of promotional weeks on baseline sales</li>
      <li>Seasonal patterns in the residuals</li>
    </ul>
  </div>
  
  <div class="scenario-tip">
    <strong>💡 Pro Tip:</strong> Try different ARIMA orders to capture any remaining 
    autocorrelation after including the exogenous predictors.
  </div>
  
  <div class="scenario-questions">
    <h5>❓ Analysis Questions</h5>
    <ol>
      <li>What is the estimated effect of a $1K increase in ad spend?</li>
      <li>How much additional revenue do promotional weeks generate?</li>
      <li>What sales would you forecast for next week with $15K ad spend and no promotion?</li>
    </ol>
  </div>
</div>
```

## Notes

1. **Keep it concise**: Scenario descriptions should be informative but not overwhelming
2. **Use appropriate icons**: Match icons to the content type
3. **Variable tags matter**: Use the correct class for each variable type
4. **Context grid**: Aim for 3-4 items that fit the grid nicely
5. **Questions should be specific**: Tie questions to the actual analysis the tool performs
6. **Pro tips should be actionable**: Give users something they can immediately try

## Tools Using This Template

- [x] ARIMAX Time Series (`apps/arimax/`)
- [ ] Bivariate Regression (`apps/bivariate_regression/`)
- [ ] MLR Interactions (`apps/mlr_interactions/`)
- [ ] Chi-Square (`apps/chisquare/`)
- [ ] Independent T-Test (`apps/ind_ttest/`)
- [ ] One-Way ANOVA (`apps/onewayanova/`)
- [ ] Pearson Correlation (`apps/pearson_correlation/`)
- [ ] Logistic Regression (`apps/log_regression/`)
- [ ] K-Means Clustering (`apps/kmeans/`)
- [ ] Others...
