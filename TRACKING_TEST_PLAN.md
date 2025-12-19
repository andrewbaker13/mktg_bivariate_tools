# Tracking Test Plan - Pearson & MLR

## ✅ What Was Implemented

### Pearson Correlation (`pearson_app.js`)
1. ✅ Added `TOOL_SLUG = 'pearson-correlation'`
2. ✅ Initialize engagement tracking on DOMContentLoaded
3. ✅ Event listener: Scenario selection → `markScenarioLoaded()`
4. ✅ Event listener: File upload → `markDataUploaded()`
5. ✅ Event listener: Analyze buttons → `markRunAttempted()`

### Multiple Linear Regression (`mlr_app.js`)
1. ✅ Added `TOOL_SLUG = 'multiple-linear-regression'`
2. ✅ Initialize engagement tracking on page ready
3. ✅ Event listener: Scenario selection → `markScenarioLoaded()`
4. ✅ Event listener: File upload → `markDataUploaded()`
5. ✅ Event listener: Analyze/Run buttons → `markRunAttempted()`

---

## Phase 1: Basic Console Testing (No Backend)

### Test 1: Tracking Initialization
**Steps:**
1. Open browser console (F12)
2. Navigate to Pearson Correlation tool
3. Look for console messages

**Expected Output:**
```
🔍 Engagement tracking initialized for Pearson Correlation
📊 Event tracking listeners attached
```

**Repeat for MLR:**
- Navigate to MLR tool
- Expect: `🔍 Engagement tracking initialized for Multiple Linear Regression`

---

### Test 2: Scenario Load Tracking
**Steps:**
1. Stay on Pearson Correlation tool
2. Open console
3. Select a scenario from dropdown

**Expected Output:**
```
📊 Scenario loaded: [Scenario Name]
```

**Verify:**
- Check `engagementMilestones.scenario_loaded === true`
- Check `currentScenario === "[Scenario Name]"`

---

### Test 3: File Upload Tracking
**Steps:**
1. Navigate to Pearson Correlation tool
2. Open console
3. Click "Browse files" or drop a CSV

**Expected Output:**
```
📤 Data uploaded: mydata.csv
```

**Verify:**
- Check `engagementMilestones.data_uploaded === true`
- Check `currentDataSource === 'upload'`

---

### Test 4: Run Attempt Tracking
**Steps:**
1. Load a scenario or upload data
2. Open console
3. Click any "Run", "Analyze", or "Calculate" button

**Expected Output:**
```
▶️ Analysis run attempted
```

**Verify:**
- Check `engagementMilestones.run_attempted === true`

---

### Test 5: Session Timer
**Steps:**
1. Load tool
2. Open console
3. Type: `getSessionDurationMinutes()`

**Expected Output:**
```
0.5  // (or however many minutes since page load)
```

---

## Phase 2: 5-Minute Milestone Testing

### Test 6: BasicEngagement Milestone
**Scenario:** User loads scenario, runs analysis, stays 5+ minutes

**Steps:**
1. Navigate to Pearson Correlation
2. Open console
3. Select any scenario → See "📊 Scenario loaded: X"
4. Click "Analyze" button → See "▶️ Analysis run attempted"
5. Manually mark success: `markRunSuccessful({}, 'Test')`
6. Wait 5+ minutes (or speed up for testing by editing auth_tracking.js line: `if (duration >= 5` → `if (duration >= 0.1`)

**Expected Output at 5 min:**
```
🎉 BasicEngagement milestone reached!
Usage tracked: pearson-correlation-basic-engagement
```

**Check Backend:**
```powershell
# If logged in
Invoke-RestMethod -Uri "https://drbaker-backend.onrender.com/api/analytics/my-usage/" -Headers @{"Authorization" = "Token YOUR_TOKEN"}
```

Look for:
```json
{
  "tool_slug": "pearson-correlation-basic-engagement",
  "result_summary": "BasicEngagement: Test",
  "scenario_name": "[Scenario Name]",
  "data_source": "scenario"
}
```

---

### Test 7: AdvancedEngagement Milestone
**Scenario:** User uploads data, runs analysis, stays 5+ minutes

**Steps:**
1. Navigate to MLR tool
2. Upload CSV → See "📤 Data uploaded: X"
3. Click "Run Regression" → See "▶️ Analysis run attempted"
4. Manually mark success: `markRunSuccessful({}, 'Test')`
5. Wait 5+ minutes

**Expected Output:**
```
🎉 AdvancedEngagement milestone reached!
Usage tracked: multiple-linear-regression-advanced-engagement
```

---

## Phase 3: Backend Integration Testing

### Test 8: Check ToolRun Table
**Requirements:**
- User must be logged in
- Backend server running

**Steps:**
1. Login to tool
2. Load scenario
3. Run analysis (actual analysis, not manual trigger)
4. Check backend

**PowerShell Test:**
```powershell
# Login
$loginPayload = @{
    username = "testuser"
    password = "testpass123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod `
  -Uri "https://drbaker-backend.onrender.com/api/auth/login/" `
  -Method POST `
  -ContentType "application/json" `
  -Body $loginPayload

$token = $loginResponse.token

# Use tool, then check usage
Invoke-RestMethod `
  -Uri "https://drbaker-backend.onrender.com/api/analytics/my-usage/" `
  -Headers @{"Authorization" = "Token $token"}
```

**Expected Response:**
```json
{
  "tool_runs": [
    {
      "tool_slug": "pearson-correlation",
      "page_url": "https://drbakermarketing.com/apps/descriptive/pearson_correlation/main_pearson.html",
      "params_json": {},
      "result_summary": "",
      "scenario_name": "[Scenario Name]",
      "data_source": "scenario",
      "timestamp": "2025-12-18T..."
    }
  ]
}
```

---

## Phase 4: Real User Simulation

### Simulation 1: Engaged Student (BasicEngagement)
**Profile:** Student uses tool correctly with scenario

**Actions:**
1. Login as student
2. Navigate to Pearson Correlation
3. Select "Ad Spend vs Revenue" scenario
4. Browse the interface for 1 minute
5. Click "Analyze"
6. Review results for 4 more minutes

**Expected Tracking:**
- ✅ Scenario loaded: "Ad Spend vs Revenue"
- ✅ Run attempted: true
- ✅ Run successful: true (if analysis works)
- ✅ At 5 min: `pearson-correlation-basic-engagement` logged

**Backend Should Show:**
- 1 tool run for analysis
- 1 milestone run for BasicEngagement

---

### Simulation 2: Power User (AdvancedEngagement)
**Profile:** Researcher uploads own data

**Actions:**
1. Login as researcher
2. Navigate to MLR tool
3. Upload custom CSV with 3 predictors
4. Select outcome variable
5. Run regression
6. Export chart
7. Download fitted values
8. Stay 5+ minutes total

**Expected Tracking:**
- ✅ Data uploaded: "research_data.csv"
- ✅ Run attempted: true
- ✅ Run successful: true
- ✅ At 5 min: `multiple-linear-regression-advanced-engagement` logged
- ✅ Feature usage: export_chart
- ✅ Feature usage: export_data

**Backend Should Show:**
- 1 tool run for analysis
- 1 milestone run for AdvancedEngagement
- 2 feature usage records

---

### Simulation 3: Quick Visitor (No Engagement)
**Profile:** Student quickly looks then leaves

**Actions:**
1. Navigate to Pearson tool
2. Look at page for 30 seconds
3. Close tab

**Expected Tracking:**
- ❌ No milestones (didn't load scenario)
- ❌ No run attempts
- ❌ No engagement logged

**Backend Should Show:**
- Nothing (< 5 min, no actions)

---

### Simulation 4: Error Handler
**Profile:** Student makes mistake

**Actions:**
1. Navigate to MLR tool
2. Upload malformed CSV
3. Click "Run Regression"
4. See error message

**Expected Tracking:**
- ✅ Data uploaded: "bad_data.csv"
- ✅ Run attempted: true
- ✅ Run failed: ERROR logged
- ✅ Feature usage: analysis_error

**Backend Should Show:**
- 1 tool run with `result_summary: "ERROR: ..."`
- 1 feature usage with error details

---

## Quick Test Commands

### Speed Up Testing (Temporary)
Edit [auth_tracking.js](../shared/js/auth_tracking.js) line ~150:
```javascript
// BEFORE (production)
if (duration >= 5 &&

// AFTER (testing - 6 seconds)
if (duration >= 0.1 &&
```

### Console Debugging
```javascript
// Check current state
console.log('Milestones:', engagementMilestones);
console.log('Duration:', getSessionDurationMinutes(), 'minutes');
console.log('Scenario:', currentScenario);
console.log('Data source:', currentDataSource);

// Manually trigger success (for testing)
markRunSuccessful({n: 50, r: 0.78}, 'r = 0.78, p < 0.001');

// Force milestone check
checkEngagementMilestones(TOOL_SLUG);
```

---

## Success Criteria

### ✅ Phase 1 Complete When:
- [ ] Console shows initialization messages
- [ ] Scenario load tracked
- [ ] File upload tracked
- [ ] Run attempt tracked
- [ ] Session timer works

### ✅ Phase 2 Complete When:
- [ ] BasicEngagement fires at 5 min
- [ ] AdvancedEngagement fires at 5 min
- [ ] Only fires once per condition

### ✅ Phase 3 Complete When:
- [ ] Backend receives tool runs
- [ ] Backend receives engagement milestones
- [ ] Data format matches expectations

### ✅ Phase 4 Complete When:
- [ ] Real user workflows tracked correctly
- [ ] Error cases handled gracefully
- [ ] No false positives or duplicates

---

## Next Steps After Testing

1. **If tests pass:** Roll out to remaining 28 tools
2. **If tests fail:** Debug and refine pattern
3. **Once stable:** Add full `params_json` with R², p-values, etc.
4. **Build dashboard:** Instructor analytics to view all tracking data

---

**Ready to test?** Start with Phase 1 console tests to verify basic functionality!
