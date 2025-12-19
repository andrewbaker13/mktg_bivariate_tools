# Tool Usage Tracking Implementation Plan
**Created:** December 18, 2025  
**Status:** Implementation Ready

---

## Engagement Definitions

### BasicEngagement
**All 4 conditions must be met:**
1. ✅ Load any one of the sample datasets/scenarios for the tool
2. ✅ Run attempt initiated
3. ✅ Successful results generation
4. ✅ Stayed on page for total of 5 minutes

**When to log:**
- At 5-minute mark if all conditions met
- Track scenario name used

---

### AdvancedEngagement
**All 4 conditions must be met:**
1. ✅ Upload data (CSV/TSV/TXT file)
2. ✅ Run attempt initiated
3. ✅ Successful results generation
4. ✅ Stayed on page for total of 5 minutes

**When to log:**
- At 5-minute mark if all conditions met
- Track that user-uploaded data was used

---

## Tracking Events

### Primary Tool Usage Events
```javascript
// 1. On successful analysis run
logToolUsage(toolSlug, params, resultSummary, {
    scenario: scenarioName || null,
    dataSource: 'scenario' | 'upload' | 'manual'
});

// 2. On error
logToolUsage(toolSlug, params, 'ERROR: ' + errorMessage, {
    scenario: scenarioName || null,
    dataSource: dataSource
});

// 3. On BasicEngagement milestone (5 min + scenario + success)
logToolUsage(toolSlug + '-basic-engagement', params, resultSummary, {
    scenario: scenarioName,
    dataSource: 'scenario'
});

// 4. On AdvancedEngagement milestone (5 min + upload + success)
logToolUsage(toolSlug + '-advanced-engagement', params, resultSummary, {
    scenario: null,
    dataSource: 'upload'
});
```

### Feature Usage Events
```javascript
// Track deeper interactions
logFeatureUsage(toolSlug, 'export_chart', { format: 'png' });
logFeatureUsage(toolSlug, 'export_data', { format: 'csv' });
logFeatureUsage(toolSlug, 'view_help');
logFeatureUsage(toolSlug, 'toggle_advanced');
logFeatureUsage(toolSlug, 'change_confidence', { level: 99 });
logFeatureUsage(toolSlug, 'copy_results');
logFeatureUsage(toolSlug, 'download_report');
```

---

## Parameters to Track (Always-Present Output Values)

### Regression Tools (8 tools)

#### 1. Bivariate Linear Regression
```javascript
{
    n_observations: 25,
    predictor_type: 'continuous' | 'categorical',
    r_squared: 0.85,
    adj_r_squared: 0.84,
    f_statistic: 124.5,
    p_value: 0.001,
    slope_coefficient: 2.34,
    intercept: 10.2,
    confidence_level: 95
}
```

#### 2. Multiple Linear Regression (MLR)
```javascript
{
    n_observations: 100,
    n_predictors: 3,
    r_squared: 0.72,
    adj_r_squared: 0.71,
    f_statistic: 85.3,
    p_value: 0.000,
    confidence_level: 95,
    vif_max: 2.3  // Multicollinearity check
}
```

#### 3. MLR with Interactions
```javascript
{
    n_observations: 150,
    n_predictors: 4,
    n_interactions: 2,
    r_squared: 0.78,
    adj_r_squared: 0.76,
    f_statistic: 92.1,
    p_value: 0.000,
    confidence_level: 95
}
```

#### 4. Logistic Regression (Binary)
```javascript
{
    n_observations: 200,
    n_predictors: 3,
    accuracy: 0.85,
    auc_roc: 0.89,
    log_likelihood: -65.3,
    aic: 138.6,
    bic: 152.1,
    confusion_matrix: {tp: 85, tn: 90, fp: 10, fn: 15}
}
```

#### 5. Multinomial Logistic Regression
```javascript
{
    n_observations: 300,
    n_predictors: 4,
    n_classes: 3,
    accuracy: 0.78,
    macro_avg_precision: 0.76,
    macro_avg_recall: 0.75,
    log_likelihood: -120.5
}
```

#### 6. Propensity Score Matching
```javascript
{
    n_treated: 50,
    n_control: 150,
    n_matched_pairs: 45,
    avg_treatment_effect: 2.5,
    p_value: 0.02,
    balance_improved: true,
    pre_matching_bias: 0.35,
    post_matching_bias: 0.05
}
```

#### 7. Conjoint Analysis
```javascript
{
    n_respondents: 100,
    n_attributes: 4,
    n_levels_total: 12,
    r_squared: 0.65,
    most_important_attribute: 'Price',
    importance_range: [0.15, 0.40]
}
```

---

### Hypothesis Testing Tools (6 tools)

#### 8. Independent Samples t-test
```javascript
{
    n_group1: 30,
    n_group2: 32,
    t_statistic: 2.45,
    df: 60,
    p_value: 0.017,
    cohens_d: 0.62,
    confidence_level: 95,
    mean_difference: 3.2,
    test_type: 'two-tailed'
}
```

#### 9. Paired Samples t-test
```javascript
{
    n_pairs: 40,
    t_statistic: 3.21,
    df: 39,
    p_value: 0.003,
    cohens_d: 0.51,
    confidence_level: 95,
    mean_difference: 2.8,
    test_type: 'two-tailed'
}
```

#### 10. One-Way ANOVA
```javascript
{
    n_groups: 4,
    total_n: 120,
    f_statistic: 5.67,
    df_between: 3,
    df_within: 116,
    p_value: 0.001,
    eta_squared: 0.13,
    confidence_level: 95
}
```

#### 11. Chi-Square Test
```javascript
{
    n_rows: 3,
    n_cols: 3,
    total_n: 200,
    chi_square: 12.45,
    df: 4,
    p_value: 0.014,
    cramers_v: 0.18,
    expected_freq_min: 8.5
}
```

#### 12. McNemar Test
```javascript
{
    n_pairs: 100,
    n_discordant_pairs: 25,
    chi_square: 4.17,
    p_value: 0.041,
    odds_ratio: 2.3,
    test_type: 'two-tailed'
}
```

#### 13. A/B Proportion Test
```javascript
{
    n_control: 1000,
    n_treatment: 1050,
    prop_control: 0.15,
    prop_treatment: 0.18,
    z_statistic: 2.34,
    p_value: 0.019,
    confidence_level: 95,
    absolute_lift: 0.03,
    relative_lift: 0.20
}
```

---

### Time Series Tools (1 tool)

#### 14. ARIMAX Calculator
```javascript
{
    n_observations: 100,
    p: 1,  // AR order
    d: 1,  // Differencing
    q: 1,  // MA order
    n_exogenous: 2,
    aic: 245.3,
    bic: 258.7,
    mape: 5.2,  // Mean Absolute Percentage Error
    forecast_horizon: 12,
    has_seasonality: false
}
```

---

### Text Analysis Tools (2 tools)

#### 15. Theme Extractor
```javascript
{
    n_documents: 50,
    n_themes_requested: 5,
    n_themes_extracted: 5,
    total_words: 5000,
    unique_words: 800,
    avg_theme_coherence: 0.68,
    method: 'lda' | 'nmf'
}
```

#### 16. Qualitative Analyzer
```javascript
{
    n_responses: 100,
    avg_word_count: 45,
    n_codes: 12,
    n_coded_segments: 250,
    sentiment_distribution: {positive: 0.60, neutral: 0.25, negative: 0.15},
    top_themes_count: 5
}
```

---

### Probability Tools (3 tools)

#### 17. Compound Event Probability
```javascript
{
    event_type: 'and' | 'or' | 'conditional',
    n_events: 3,
    result_probability: 0.125,
    independence_assumed: true
}
```

#### 18. Selection Probability Lab
```javascript
{
    population_size: 1000,
    sample_size: 50,
    n_categories: 4,
    sampling_method: 'with_replacement' | 'without_replacement',
    calculated_probability: 0.032
}
```

#### 19. Sentiment Lab
```javascript
{
    n_reviews: 100,
    positive_rate: 0.65,
    neutral_rate: 0.20,
    negative_rate: 0.15,
    avg_confidence: 0.82,
    method: 'vader' | 'textblob' | 'custom'
}
```

---

### Descriptive Tools (2 tools)

#### 20. Pearson Correlation
```javascript
{
    n_observations: 50,
    correlation_coefficient: 0.78,
    p_value: 0.001,
    confidence_level: 95,
    ci_lower: 0.65,
    ci_upper: 0.87,
    test_type: 'two-tailed'
}
```

#### 21. Univariate Analyzer
```javascript
{
    n_observations: 100,
    mean: 45.2,
    median: 44.0,
    std_dev: 8.5,
    skewness: 0.32,
    kurtosis: -0.15,
    has_outliers: true,
    n_outliers: 3
}
```

---

### Clustering Tools (1 tool)

#### 22. K-Means Clustering
```javascript
{
    n_observations: 200,
    n_features: 4,
    n_clusters: 3,
    inertia: 1245.6,
    silhouette_score: 0.68,
    davies_bouldin_index: 0.52,
    iterations_to_converge: 12
}
```

---

### Sample Size Tools (5 tools)

#### 23. Sample Size Calculator (t-test)
```javascript
{
    test_type: 'independent_ttest' | 'paired_ttest',
    effect_size: 0.5,
    alpha: 0.05,
    power: 0.80,
    calculated_n_per_group: 64,
    total_n: 128,
    tails: 2
}
```

#### 24. Sample Size for Correlation/Regression
```javascript
{
    analysis_type: 'correlation' | 'regression',
    n_predictors: 3,
    expected_r_squared: 0.25,
    alpha: 0.05,
    power: 0.80,
    calculated_n: 85
}
```

#### 25. Sample Size for A/B Test
```javascript
{
    baseline_rate: 0.15,
    mde: 0.03,  // Minimum Detectable Effect
    alpha: 0.05,
    power: 0.80,
    calculated_n_per_group: 1570,
    total_n: 3140,
    tails: 2
}
```

#### 26. Sample Size for Multi-Arm A/B
```javascript
{
    n_arms: 4,
    baseline_rate: 0.12,
    mde: 0.025,
    alpha: 0.05,
    power: 0.80,
    bonferroni_correction: true,
    calculated_n_per_arm: 2100,
    total_n: 8400
}
```

#### 27. Sampling Visualizer
```javascript
{
    population_size: 10000,
    sample_size: 100,
    n_samples_drawn: 500,
    true_mean: 50,
    sample_mean_avg: 50.2,
    sample_mean_std: 1.8,
    coverage_95ci: 0.95
}
```

---

### Advanced Tools (2 tools)

#### 28. Resource Allocation Optimizer
```javascript
{
    n_resources: 5,
    n_constraints: 3,
    total_budget: 100000,
    optimal_value: 85000,
    algorithm: 'linear_programming' | 'genetic',
    solve_time_ms: 245,
    feasible: true
}
```

#### 29. Neural Network Simulator
```javascript
{
    n_layers: 3,
    n_neurons: [10, 5, 1],
    activation_function: 'relu',
    learning_rate: 0.01,
    n_epochs: 100,
    final_loss: 0.025,
    final_accuracy: 0.92,
    training_time_ms: 3200
}
```

---

## Session Timer Implementation

### Add to auth_tracking.js:
```javascript
/**
 * Session timer for engagement tracking
 */
let sessionStartTime = Date.now();
let lastActivity = Date.now();
let engagementMilestones = {
    scenario_loaded: false,
    data_uploaded: false,
    run_attempted: false,
    run_successful: false
};

function getSessionDurationMinutes() {
    return (Date.now() - sessionStartTime) / 60000;
}

function updateLastActivity() {
    lastActivity = Date.now();
}

function checkEngagementMilestones(toolSlug) {
    const duration = getSessionDurationMinutes();
    
    // BasicEngagement check
    if (duration >= 5 && 
        engagementMilestones.scenario_loaded && 
        engagementMilestones.run_attempted && 
        engagementMilestones.run_successful &&
        !engagementMilestones.basic_logged) {
        
        logToolUsage(toolSlug + '-basic-engagement', {...}, 'BasicEngagement milestone', {
            scenario: currentScenario,
            dataSource: 'scenario'
        });
        engagementMilestones.basic_logged = true;
    }
    
    // AdvancedEngagement check
    if (duration >= 5 && 
        engagementMilestones.data_uploaded && 
        engagementMilestones.run_attempted && 
        engagementMilestones.run_successful &&
        !engagementMilestones.advanced_logged) {
        
        logToolUsage(toolSlug + '-advanced-engagement', {...}, 'AdvancedEngagement milestone', {
            scenario: null,
            dataSource: 'upload'
        });
        engagementMilestones.advanced_logged = true;
    }
}

// Track activity to update timer
document.addEventListener('click', updateLastActivity);
document.addEventListener('keypress', updateLastActivity);
document.addEventListener('scroll', updateLastActivity);

// Check milestones every 30 seconds
setInterval(() => checkEngagementMilestones(window.TOOL_SLUG), 30000);
```

---

## Error Tracking Pattern

### When to log errors:
```javascript
try {
    // Run analysis
    const results = performAnalysis(data, params);
    
    // SUCCESS - Log result
    logToolUsage(toolSlug, params, generateResultSummary(results), {
        scenario: currentScenario || null,
        dataSource: dataSource
    });
    
} catch (error) {
    // ERROR - Log failure
    logToolUsage(toolSlug, params, `ERROR: ${error.message}`, {
        scenario: currentScenario || null,
        dataSource: dataSource
    });
    
    // Also use feature tracking for error details
    logFeatureUsage(toolSlug, 'analysis_error', {
        error_type: error.name,
        error_message: error.message,
        stack_trace: error.stack?.substring(0, 200)
    });
    
    // Show user-friendly error
    displayError(error);
}
```

---

## Implementation Checklist (Per Tool)

### Phase 1: Add Core Tracking
- [ ] Define tool-specific `TOOL_SLUG` constant
- [ ] Add `logToolUsage()` on successful run
- [ ] Add `logToolUsage()` on error/failure
- [ ] Track scenario load milestone
- [ ] Track data upload milestone
- [ ] Track run attempt milestone
- [ ] Track success milestone

### Phase 2: Add Time-Based Engagement
- [ ] Initialize session timer
- [ ] Check BasicEngagement at 5 min (if scenario used)
- [ ] Check AdvancedEngagement at 5 min (if upload used)

### Phase 3: Add Feature Tracking
- [ ] Export chart button
- [ ] Export data button
- [ ] Help/documentation button
- [ ] Advanced options toggle
- [ ] Confidence level changes
- [ ] Copy results button
- [ ] Any other tool-specific interactions

### Phase 4: Testing
- [ ] Test scenario load → run → 5 min → BasicEngagement logged
- [ ] Test upload → run → 5 min → AdvancedEngagement logged
- [ ] Test error handling logs correctly
- [ ] Test feature interactions log correctly
- [ ] Verify params match expected schema

---

## Backend Support Needed

### ToolRun Model (Already exists ✅)
```python
class ToolRun(models.Model):
    user = ForeignKey(User)
    tool_slug = CharField(max_length=100)
    page_url = URLField()
    params_json = JSONField()
    result_summary = TextField()
    scenario_name = CharField(max_length=200, null=True)
    data_source = CharField(max_length=20, null=True)  # 'scenario', 'upload', 'manual'
    timestamp = DateTimeField(auto_now_add=True)
```

### FeatureUsage Model (Already exists ✅)
```python
class FeatureUsage(models.Model):
    user = ForeignKey(User, null=True)  # Allow anonymous
    tool_slug = CharField(max_length=100)
    feature_type = CharField(max_length=50)
    metadata = JSONField()
    tool_run_id = ForeignKey(ToolRun, null=True)
    timestamp = DateTimeField(auto_now_add=True)
```

---

## Rollout Strategy

### Week 1: Template Implementation
1. ✅ Complete Pearson Correlation tool (full tracking)
2. ✅ Test all tracking events work correctly
3. ✅ Document any issues/improvements

### Week 2-3: High-Traffic Tools (Top 10)
4. Bivariate Linear Regression
5. Multiple Linear Regression
6. Independent t-test
7. Chi-Square Test
8. ARIMAX Calculator
9. K-Means Clustering
10. Sample Size Calculator (t-test)
11. Univariate Analyzer
12. A/B Proportion Test
13. Logistic Regression

### Week 4-5: Remaining Tools (20 tools)
14-33. All other tools systematically

### Week 6: Analytics Dashboard
- Build instructor dashboard to view:
  - BasicEngagement vs AdvancedEngagement rates
  - Most/least engaged tools
  - Common errors by tool
  - Feature usage patterns
  - Time-on-tool distributions

---

## Success Metrics

### After 1 Month:
- **Target:** 80% of tools have basic tracking
- **Measure:** Tool usage logged for each run
- **Measure:** Engagement milestones tracked

### After 2 Months:
- **Target:** 100% of tools tracked
- **Target:** Feature tracking on all tools
- **Measure:** Error patterns identified
- **Measure:** Instructor dashboard live

### After 1 Semester:
- **Analyze:** BasicEngagement vs AdvancedEngagement ratios
- **Analyze:** Most/least engaged tools
- **Analyze:** Correlation between engagement and learning outcomes
- **Analyze:** Common error patterns for improvement

---

**Next Action:** Implement tracking in Pearson Correlation tool as template
