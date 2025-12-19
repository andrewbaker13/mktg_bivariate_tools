# Tracking Implementation Rollout Checklist
**Created:** December 19, 2025  
**Status:** In Progress

---

## Critical Implementation Checklist (Lessons Learned from BATCH 2)

When implementing tracking for each tool, verify:

1. **✅ Remove Old Tracking System**
   - Delete `let pageLoadTime = Date.now()`
   - Delete `let hasSuccessfulRun = false`
   - Delete `function checkAndTrackUsage()` and all its calls
   - Only new engagement tracking system should remain

2. **✅ Add Debouncing/Skip Initial Renders** (for auto-run tools)
   - Add `let renderCount = 0; let lastTrackTime = 0;` near TOOL_SLUG
   - Wrap tracking calls with: `if (renderCount > 1 && (now - lastTrackTime) > 500)`
   - Prevents 10-20 tracking calls during page/scenario load

3. **✅ Verify Variable Names**
   - Check actual variable names in the calculation function
   - Common issues: `tStat` vs `t`, `pVal` vs `p`, `pvalue` vs `pValue`
   - Test in browser to catch ReferenceErrors

4. **✅ Check TOOL_SLUG Scope**
   - Ensure `initEngagementTracking(TOOL_SLUG)` is called INSIDE the IIFE/function where TOOL_SLUG is defined
   - Not after the closing `})();`

5. **✅ Add File Upload Tracking**
   - Find file upload handler function (e.g., `handleFile`, `handleUploadFile`)
   - Add `markDataUploaded(file.name)` at the start, before FileReader

6. **✅ Add Scenario Loading Tracking**
   - Find scenario loader function (e.g., `loadScenarioById`)
   - Add `markScenarioLoaded(scenario.label)` after finding scenario

7. **✅ Browser Test Both Milestones**
   - Test BasicEngagement: Load scenario → wait 6+ seconds
   - Test AdvancedEngagement: Upload file → wait 6+ seconds
   - Verify console shows milestone logged messages

---

## Implementation Pattern Summary

### Auto-Run Tools (instant results)
**Pattern:** Call `markRunAttempted()` and `markRunSuccessful()` immediately after successful calculation
```javascript
// At top near TOOL_SLUG:
let renderCount = 0;
let lastTrackTime = 0;

// In the calculation/analysis function, after results computed:
renderCount++;
const now = Date.now();
if (renderCount > 1 && (now - lastTrackTime) > 500) {
    lastTrackTime = now;
    if (typeof markRunAttempted === 'function') markRunAttempted();
    if (typeof markRunSuccessful === 'function') {
        markRunSuccessful(params, resultSummary);
    }
}
```

### Button-Run Tools (explicit Run/Analyze button)
**Pattern:** Attach `markRunAttempted()` to button click, `markRunSuccessful()` after results
```javascript
// In setupEventTracking():
const runButton = document.getElementById('run-analysis-btn');
runButton.addEventListener('click', () => {
    if (typeof markRunAttempted === 'function') markRunAttempted();
});

// In the success callback:
if (typeof markRunSuccessful === 'function') {
    markRunSuccessful(params, resultSummary);
}
```

---

## Tool Classification & Rollout Status

### ✅ COMPLETED (2/30) - AUDITED

1. **Pearson Correlation** - Auto-run ✅ AUDIT COMPLETE
   - Tool slug: `pearson-correlation`
   - Type: Auto-run (instant results on data load)
   - Implementation: COMPLETE
   - Tested: BasicEngagement ✅ | AdvancedEngagement ✅
   - Audit complete: Old tracking removed ✅, Debouncing added ✅

2. **Univariate Analyzer** - Auto-run ✅ AUDIT COMPLETE
   - Tool slug: `univariate-analyzer`
   - Path: `apps/descriptive/univariate_analyzer/`
   - Type: Auto-run (instant stats on data load)
   - Scenarios: ✓ | Upload: ✓
   - Implementation: COMPLETE
   - Audit complete: Old tracking removed ✅, Debouncing added ✅
   - Needs browser testing
   - Tested: NOT YET
   - Audit needed: Remove old tracking, add debouncing, test in browser

---

### 📋 BATCH 1 - COMPLETE (was Descriptive Tools)

~~3. **Spearman Rank Correlation**~~ - Combined with Pearson ✅

---

### 📋 BATCH 2 - Hypothesis Testing (Auto-Run) ✅ COMPLETE (3/3)

3. **Independent t-test** - Auto-run ✅
   - Tool slug: `independent-ttest`
   - Path: `apps/hypothesis_testing/ind_ttest/`
   - Type: Auto-run
   - Scenarios: ✓ | Upload: ✓
   - Implementation: COMPLETE
   - Tested: NOT YET

4. **Chi-Square Test** - Auto-run ✅
   - Tool slug: `chi-square-test`
   - Path: `apps/hypothesis_testing/chisquare/`
   - Type: Auto-run
   - Scenarios: ✓ | Upload: ✓
   - Implementation: COMPLETE
   - Tested: NOT YET

5. **A/B Proportion Test** - Auto-run ✅
   - Tool slug: `ab-proportion-test`
   - Path: `apps/hypothesis_testing/ab_proportion/`
   - Type: Auto-run
   - Scenarios: ✓ | Upload: ✓
   - Implementation: COMPLETE
   - Tested: NOT YET
   - Type: Auto-run
   - Scenarios: ✓ | Upload: ✓
   - Status: NOT STARTED

---

### 📋 BATCH 3 - Regression Tools (Auto-Run) ✅ COMPLETE (3/3)

7. **Bivariate Linear Regression** - Auto-run ✅
   - Tool slug: `bivariate-regression`
   - Path: `apps/regression/bivariate_regression/`
   - Type: Auto-run (instant results on variable selection)
   - Scenarios: ✓ | Upload: ✓
   - Implementation: COMPLETE
   - Debouncing: ✅ (renderCount > 1 && 500ms)
   - Old tracking removed: ✅
   - Ready for browser testing

8. **Multiple Linear Regression (MLR)** - Auto-run ✅
   - Tool slug: `multiple-linear-regression`
   - Path: `apps/regression/ml_regression/`
   - Type: Auto-run (instant results)
   - Scenarios: ✓ | Upload: ✓
   - Implementation: COMPLETE  
   - Debouncing: ✅
   - Old tracking removed: ✅
   - Ready for browser testing

9. **Logistic Regression** - Auto-run ✅
   - Tool slug: `logistic-regression`
   - Path: `apps/regression/log_regression/`
   - Type: Auto-run (instant results)
   - Scenarios: ✓ | Upload: ✓
   - Implementation: COMPLETE
   - Debouncing: ✅
   - Old tracking removed: ✅
   - Ready for browser testing

---

### 📋 BATCH 4 - Time Series & Advanced (Button-Run) ✅ COMPLETE (3/3)

10. **ARIMAX Calculator** - Button ✅
    - Tool slug: `arimax-calculator`
    - Path: `apps/time_series/arimax/`
    - Type: Button-run (has "Fit Model" button)
    - Scenarios: ✓ | Upload: ✓
    - Implementation: COMPLETE
    - Button tracking: ✅ (markRunAttempted on click)
    - Old tracking removed: ✅
    - Ready for browser testing

11. **K-Means Clustering** - Button ✅
    - Tool slug: `kmeans-clustering`
    - Path: `apps/clustering/kmeans/`
    - Type: Button-run (has "Run Clustering" button)
    - Scenarios: ✓ | Upload: ✓
    - Implementation: COMPLETE
    - Button tracking: ✅ (markRunAttempted on click)
    - Old tracking removed: ✅
    - Ready for browser testing

12. **Conjoint Analysis** - Button ✅
    - Tool slug: `conjoint-analysis`
    - Path: `apps/advanced/conjoint/`
    - Type: Button-run (has "Estimate" button)
    - Scenarios: ✓ | Upload: ✓
    - Implementation: COMPLETE
    - Button tracking: ✅ (markRunAttempted on click)
    - Old tracking removed: ✅
    - Ready for browser testing

---

### 📋 BATCH 5 - Sample Size Calculators (Auto-Run) ✅ COMPLETE (3/3)

13. **Sample Size Calculator (t-test)** - Auto-run ✅
    - Tool slug: `sample-size-ttest`
    - Path: `apps/sample_size/sample_size_calculator/`
    - Type: Auto-run (instant calculation on input change)
    - Scenarios: ✓ | Upload: Manual only (no file upload)
    - Implementation: COMPLETE
    - Debouncing: ✅ (renderCount > 1 && 500ms)
    - Old tracking removed: ✅
    - Ready for browser testing

14. **Sample Size Calculator (A/B)** - Auto-run ✅
    - Tool slug: `sample-size-ab`
    - Path: `apps/sample_size/sample_size_AB_calculator/`
    - Type: Auto-run (instant calculation on input change)
    - Scenarios: ✓ | Upload: Manual only (no file upload)
    - Implementation: COMPLETE
    - Debouncing: ✅ (renderCount > 1 && 500ms)
    - Old tracking removed: ✅
    - Ready for browser testing

15. **Sample Size Calculator (Correlation)** - Auto-run ✅
    - Tool slug: `sample-size-correlation`
    - Path: `apps/sample_size/sample_size_corr_regression/`
    - Type: Auto-run (instant calculation on input change)
    - Scenarios: ✓ | Upload: Manual only (no file upload)
    - Implementation: COMPLETE
    - Debouncing: ✅ (renderCount > 1 && 500ms)
    - Old tracking removed: ✅
    - Ready for browser testing

---

### 📋 BATCH 6 - More Hypothesis Testing (Auto-Run) ✅ COMPLETE (3/3)

16. **Paired t-test** - Auto-run ✅
    - Tool slug: `paired-ttest`
    - Path: `apps/hypothesis_testing/paired_ttest/`
    - Type: Auto-run (instant results on input change)
    - Scenarios: ✓ | Upload: ✓
    - Implementation: COMPLETE
    - Debouncing: ✅ (renderCount + 3s delay)
    - Old tracking removed: ✅
    - Ready for browser testing

17. **One-Way ANOVA** - Auto-run ✅
    - Tool slug: `oneway-anova`
    - Path: `apps/hypothesis_testing/onewayanova/`
    - Type: Auto-run (instant results on input change)
    - Scenarios: ✓ | Upload: ✓
    - Implementation: COMPLETE
    - Debouncing: ✅ (renderCount + 3s delay)
    - Old tracking removed: ✅
    - Ready for browser testing

18. **McNemar Test** - Auto-run ✅
    - Tool slug: `mcnemar-test`
    - Path: `apps/hypothesis_testing/mcnemar/`
    - Type: Auto-run (instant results on input change)
    - Scenarios: ✓ | Upload: ✓
    - Implementation: COMPLETE
    - Debouncing: ✅ (renderCount + 3s delay)
    - Old tracking removed: ✅
    - Ready for browser testing

---

### 📋 BATCH 7 - Advanced Regression (Button-Run) ✅ COMPLETE (3/3)

19. **MLR with Interactions** - Button ✅
    - Tool slug: `mlr-interactions`
    - Path: `apps/regression/mlr_interactions/`
    - Type: Button-run (explicit Run button)
    - Scenarios: ✓ | Upload: ✓
    - Implementation: COMPLETE
    - Button tracking: ✅ (markRunAttempted on click)
    - Old tracking removed: ✅
    - Ready for browser testing

20. **Multinomial Logistic Regression** - Button ✅
    - Tool slug: `multinomial-logistic`
    - Path: `apps/regression/mn_log_regression/`
    - Type: Button-run (has "Run Model" button)
    - Scenarios: ✓ | Upload: ✓
    - Implementation: COMPLETE
    - Button tracking: ✅ (markRunAttempted on click)
    - Old tracking removed: ✅
    - Ready for browser testing

21. **Propensity Score Matching** - Button ✅
    - Tool slug: `propensity-score-matching`
    - Path: `apps/advanced/ps_matching/`
    - Type: Button-run (explicit matching process)
    - Scenarios: ✓ | Upload: ✓
    - Implementation: COMPLETE
    - Button tracking: ✅ (markRunAttempted on click)
    - Old tracking removed: ✅
    - Ready for browser testing

---

### 📋 BATCH 8 - Probability Tools (Auto/Interactive) ✅ COMPLETE (3/3)

22. **Compound Event Probability** - Auto-run ✅
    - Tool slug: `compound-probability`
    - Path: `apps/probability/compound_event_probability/`
    - Type: Auto-run (calculates on input change)
    - Scenarios: ✓ | Upload: Manual only
    - Implementation: COMPLETE
    - Debouncing: ✅ (renderCount + 2s delay)
    - Old tracking removed: ✅
    - Ready for browser testing

23. **Selection Probability Lab** - Interactive/Button ✅
    - Tool slug: `selection-probability`
    - Path: `apps/probability/selection_probability_lab/`
    - Type: Button-run (simulation buttons)
    - Scenarios: ✓ | Upload: Manual only
    - Implementation: COMPLETE
    - Button tracking: ✅ (separate tracking for single/batch simulations)
    - Old tracking removed: ✅
    - Ready for browser testing

24. **Sentiment Analysis Lab** - Button ✅
    - Tool slug: `sentiment-lab`
    - Path: `apps/probability/sentiment_lab/`
    - Type: Button-run (has "Analyze" button)
    - Scenarios: ✓ | Upload: ✓ (text files)
    - Implementation: COMPLETE
    - Button tracking: ✅ (markRunAttempted on click)
    - File upload tracking: ✅
    - Old tracking removed: ✅
    - Ready for browser testing

---

### 📋 BATCH 9 - Text Analysis (Button-Run) ✅ COMPLETE (2/2)

25. **Qualitative Analyzer** - Button ✅
    - Tool slug: `qualitative-analyzer`
    - Path: `apps/text_analysis/qualitative_analyzer/`
    - Type: Button-run (analyzeWordFrequency button)
    - Scenarios: ✓ | Upload: ✓ (text files)
    - Implementation: COMPLETE
    - Button tracking: ✅ (markRunAttempted on click)
    - File upload tracking: ✅
    - Scenario tracking: ✅
    - Variables verified: uniqueWords, totalLines
    - Ready for browser testing

26. **Theme Extractor** - Button ✅
    - Tool slug: `theme-extractor`
    - Path: `apps/text_analysis/theme_extractor/`
    - Type: Button-run (runAnalysis)
    - Scenarios: ✓ | Upload: ✓ (text files)
    - Implementation: COMPLETE
    - Button tracking: ✅ (markRunAttempted on click)
    - File upload tracking: ✅
    - Scenario tracking: ✅
    - Old tracking removed: ✅
    - Variables verified: n_documents, n_themes
    - Ready for browser testing

27. **Word Cloud Generator** - DOESN'T EXIST ❌
    - Tool slug: `word-cloud`
    - Path: `apps/text_analysis/word_cloud/` (PATH NOT FOUND)
    - Status: Tool not implemented yet - skip for now

---

### 📋 BATCH 10 - Remaining Tools (Mix) ✅ COMPLETE (2/2)

28. **Sampling Visualizer** - Interactive ✅
    - Tool slug: `sampling-visualizer`
    - Path: `apps/sample_size/sampling_visualizer/`
    - Type: Interactive (dual button-run - draw sample + simulate many)
    - Scenarios: ✓ | Upload: Manual only
    - Implementation: COMPLETE
    - Button tracking: ✅ (TWO separate tracking calls for draw/simulate)
    - Old tracking removed: ✅
    - Variables verified: design, sampleSize, numSimulations, action
    - Ready for browser testing

29. **Multi-Arm A/B Sample Size** - Auto-run ✅
    - Tool slug: `multiarm-ab-sample-size`
    - Path: `apps/sample_size/sample_size_multiarm_ab/`
    - Type: Auto-run (updateMultiDesign on input/change)
    - Scenarios: ✓ | Upload: Manual only
    - Implementation: COMPLETE
    - Debouncing: ✅ (renderCount + 500ms delay)
    - Old tracking removed: ✅
    - Variables verified: mode, goal, numArms, alpha, power, nPerArm, nTotal
    - Ready for browser testing

30. **Effect Size Calculator** - DOESN'T EXIST ❌
    - Tool slug: `effect-size-calculator`
    - Path: `apps/advanced/effect_size/` (PATH NOT FOUND)
    - Status: Tool not implemented yet - skip for now

---

## Progress Summary

- **Total Tools in Codebase:** 28 (2 listed tools don't exist yet: Word Cloud Generator, Effect Size Calculator)
- **Completed:** 25 (89%)
- **In Progress:** 0
- **Not Started:** 0
- **Non-Existent:** 2 tools from spec don't exist in codebase yet
- **Status:** ✅ ALL EXISTING TOOLS COMPLETE - Ready for browser testing

---

## Next Steps

1. **Implement BATCH 1** (Univariate Analyzer, Spearman Correlation)
2. Verify both BasicEngagement and AdvancedEngagement work
3. Test with teststudent3 account
4. Move to BATCH 2

---

**Last Updated:** December 19, 2025 - 18:45
