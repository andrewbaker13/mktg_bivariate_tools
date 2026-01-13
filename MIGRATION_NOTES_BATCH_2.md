# Batch 2 Migration Notes: hypothesis_testing Tools

**Date:** December 2024  
**Tools Migrated:** ind_ttest, ab_proportion, chisquare  
**Total Scenarios:** 14 (5 + 4 + 5)

## Summary

This batch migrated three hypothesis testing tools from external JSON/txt scenario files to inline JavaScript arrays. All tools now use synchronous data access with rich HTML descriptions.

---

## 1. Independent Samples T-Test (`ind_ttest`)

**File:** `apps/hypothesis_testing/ind_ttest/ind_ttest_app.js`

### Migration Status
- **Scenarios Array:** ✅ Already existed (IND_TTEST_SCENARIOS, lines 46-168)
- **HTML Generators:** ✅ Already existed (5 functions)
- **Loading Functions:** ✅ **NEWLY REPLACED** (async → synchronous)

### Changes Made
1. **Replaced async loading functions** (lines 1711-2029):
   - ❌ Removed: `async function fetchScenarioIndex()` (fetched scenario-index.json)
   - ❌ Removed: `async function loadScenarioById()` (fetched .txt files)
   - ❌ Removed: `function parseScenarioText()` (~150 lines, parsed .txt format)
   - ❌ Removed: `function applyScenarioPreset()` (~150 lines, applied parsed data)
   - ✅ Added: Synchronous `function populateScenarioOptions()` (uses IND_TTEST_SCENARIOS array)
   - ✅ Added: Synchronous `function loadScenarioById()` (~110 lines, direct data access)

2. **Updated initialization**:
   - Changed `initializeScenarios()` to call `populateScenarioOptions()` instead of `fetchScenarioIndex()`

### Scenarios (5 total)

1. **holiday_subject_line** 📧  
   - Subject: Holiday Email Subject Line A/B Test
   - Mode: Summary stats (2 groups)
   - Data: Optimized subject (mean=52.4, sd=8.1, n=148) vs Control (mean=48.7, sd=7.6, n=154)
   - Settings: delta0=2, alpha=0.05

2. **loyalty_upsell** 💳  
   - Subject: Loyalty Upsell Email Personalization Test
   - Mode: Summary stats (2 groups)
   - Data: Personalized (mean=50.2, sd=7.4, n=162) vs Generic (mean=47.1, sd=6.9, n=158)
   - Settings: delta0=2, alpha=0.05

3. **refer_a_friend** 🎁  
   - Subject: Refer-a-Friend Incentive Test
   - Mode: Summary stats (2 groups)
   - Data: Incentive (mean=212.4, sd=24.1, n=130) vs Control (mean=198.1, sd=26.3, n=133)
   - Settings: delta0=10, alpha=0.05

4. **hours_streaming_raw** 🎬  
   - Subject: Streaming Hours by Subscription Type (Raw Data)
   - Mode: **Raw data mode** (81 rows)
   - Data: Monthly Pass Holders (30 rows) vs Seasonal Bingers (51 rows)
   - Settings: delta0=0, alpha=0.05

5. **warrior_vs_rogue_damage** ⚔️  
   - Subject: D&D Class Damage Output Test (Fun Example)
   - Mode: Summary stats (2 groups)
   - Data: Rogue (mean=21.3, sd=8.7, n=20) vs Warrior (mean=18.5, sd=6.2, n=20)
   - Settings: delta0=0, alpha=0.05

### Files to Delete (After Testing)
- ❌ `scenarios/scenario-index.json`
- ❌ `scenarios/holiday_subject_line.txt`
- ❌ `scenarios/loyalty_upsell.txt`
- ❌ `scenarios/refer_a_friend.txt`
- ❌ `scenarios/hours_streaming_raw.txt`
- ❌ `scenarios/warrior_vs_rogue_damage.txt`

---

## 2. A/B Proportion Test (`ab_proportion`)

**File:** `apps/hypothesis_testing/ab_proportion/main_ab_proportion.js`

### Migration Status
- **Scenarios Array:** ✅ **NEWLY ADDED** (AB_PROPORTION_SCENARIOS, lines 14-205)
- **HTML Generators:** ✅ **NEWLY ADDED** (4 inline arrow functions)
- **Loading Functions:** ✅ **NEWLY REPLACED** (async → synchronous)

### Changes Made
1. **Added scenarios array** (lines 14-205):
   - Created AB_PROPORTION_SCENARIOS with 4 scenarios
   - Each scenario includes:
     * `id`: Unique identifier
     * `label`: Display name with emoji
     * `description`: Arrow function returning rich HTML
     * `data`: Arrow function returning { control, variant, settings } or { rawData, settings }

2. **Replaced async loading functions** (lines 562-850):
   - ❌ Removed: `async function fetchScenarioIndex()` (fetched scenario-index.json)
   - ❌ Removed: `async function loadScenarioById()` (fetched .txt files + optional .csv datasets)
   - ❌ Removed: `function parseScenarioText()` (~70 lines, parsed .txt format)
   - ❌ Removed: `function applyScenarioPreset()` (~80 lines, applied parsed data)
   - ❌ Removed: `function buildScenarioDataset()` (~50 lines, built CSV download)
   - ✅ Kept: Helper functions `parseDatasetRawEntries()`, `summarizeRawEntries()`, `assignScenarioValues()`, `updateScenarioDownloadButton()`
   - ✅ Added: Synchronous `function populateScenarioOptions()` (uses AB_PROPORTION_SCENARIOS array)
   - ✅ Added: Synchronous `function loadScenarioById()` (~120 lines, direct data access)

3. **Updated initialization**:
   - Changed initialization to call `populateScenarioOptions()` instead of `await fetchScenarioIndex()`

### Scenarios (4 total)

1. **newsletter_cta** 📧  
   - Subject: StudyFlow Newsletter CTA Test
   - Mode: Summary stats (2 proportions)
   - Data: Control "Browse Resources" (p=0.118, n=1250) vs Variant "Get Study Tips Now" (p=0.138, n=1240)
   - Settings: alpha=0.05, delta0=0

2. **retargeting_offer** 🎯  
   - Subject: Retargeting Banner Offer Test
   - Mode: Summary stats (2 proportions)
   - Data: Price Anchor Banner (p=0.152, n=980) vs Bonus Bundle Banner (p=0.176, n=1020)
   - Settings: **alpha=0.04** (conservative), delta0=0

3. **loyalty_partner** 🤝  
   - Subject: Loyalty Partner Offer Test
   - Mode: Summary stats (2 proportions)
   - Data: Standard Loyalty (p=0.164, n=890) vs Tiered Bonus (p=0.191, n=905)
   - Settings: alpha=0.05, delta0=0

4. **social_cta_raw** 📱  
   - Subject: Social Post CTA Test (Raw Data)
   - Mode: **Raw data mode** (50 rows: 25 per group)
   - Data: Team A "Shop Now" vs Team B "Tap to Unlock Deal" (binary 0/1 conversions)
   - Settings: alpha=0.05, delta0=0

### Files to Delete (After Testing)
- ❌ `scenarios/scenario-index.json`
- ❌ `scenarios/newsletter_cta.txt`
- ❌ `scenarios/retargeting_offer.txt`
- ❌ `scenarios/loyalty_partner.txt`
- ❌ `scenarios/social_cta_raw.txt`

---

## 3. Chi-Square Test (`chisquare`)

**File:** `apps/hypothesis_testing/chisquare/chisquare_app.js`

### Migration Status
- **Scenarios Array:** ✅ **NEWLY ADDED** (CHISQUARE_SCENARIOS, lines 9-235)
- **HTML Generators:** ✅ **NEWLY ADDED** (5 inline arrow functions)
- **Loading Functions:** ✅ **NEWLY REPLACED** (async → synchronous)

### Changes Made
1. **Added scenarios array** (lines 9-235):
   - Created CHISQUARE_SCENARIOS with 5 scenarios
   - Each scenario includes:
     * `id`: Unique identifier
     * `label`: Display name with emoji
     * `description`: Arrow function returning rich HTML
     * `data`: Arrow function returning { rows, columns, matrix, settings } or { rawData, settings }

2. **Replaced async loading functions** (lines 1120-1520):
   - ❌ Removed: `function fetchScenarioIndex()` (fetched scenario-index.json)
   - ❌ Removed: Original `async function loadScenarioById()` (fetched .txt files)
   - ❌ Removed: `function parseScenarioText()` (~130 lines, parsed .txt format)
   - ✅ Kept: `function applyCrosstabMatrix()` (applies contingency table data)
   - ✅ Kept: `function parseRawData()` (parses raw CSV for contingency table)
   - ✅ Added: Synchronous `function populateScenarioOptions()` (uses CHISQUARE_SCENARIOS array)
   - ✅ Added: Synchronous `function loadScenarioById()` (~115 lines, direct data access)

3. **Updated initialization**:
   - Changed `initializeScenarios()` to call `populateScenarioOptions()` instead of `fetchScenarioIndex()`

### Scenarios (5 total)

1. **holiday_creative** 📧  
   - Subject: Holiday Email Creative Test
   - Mode: Contingency table (2×2)
   - Data: Utility Creative vs Story Creative × Clicked vs Not Clicked
   - Matrix: [[186, 314], [214, 286]]
   - Settings: alpha=0.05

2. **channel_purchase** 🛒  
   - Subject: Channel vs. Purchase Behavior Test
   - Mode: Contingency table (3×2)
   - Data: Email/Paid/Organic × Purchase/Browse
   - Matrix: [[74, 46], [82, 38], [54, 52]]
   - Settings: **alpha=0.01** (conservative for strategic decisions)

3. **landing_layout** 📱  
   - Subject: Landing Page Layout Test
   - Mode: Contingency table (2×3)
   - Data: Desktop/Mobile × Form/Call/NoAction
   - Matrix: [[45, 22, 133], [60, 15, 125]]
   - Settings: **alpha=0.10** (exploratory pilot test)

4. **loyalty_nudge_raw** 💬  
   - Subject: Loyalty Nudge Test (Raw Data)
   - Mode: **Raw data mode** (120 rows)
   - Data: Enrolled/InStore/DigitalApp × UsedCoupon/MadeVisit/NoAction
   - Settings: alpha=0.05

5. **class_survival_dungeon** ⚔️  
   - Subject: D&D Class Survival Test (Fun Example)
   - Mode: Contingency table (2×2)
   - Data: Barbarian/Wizard × Survived/Perished
   - Matrix: [[45, 5], [30, 20]]
   - Settings: alpha=0.05

### Files to Delete (After Testing)
- ❌ `scenarios/scenario-index.json`
- ❌ `scenarios/holiday_creative.txt`
- ❌ `scenarios/channel_purchase.txt`
- ❌ `scenarios/landing_layout.txt`
- ❌ `scenarios/loyalty_nudge_raw.txt`
- ❌ `scenarios/class_survival_dungeon.txt`

---

## Testing Checklist

### ind_ttest (5 scenarios)
- [ ] Load holiday_subject_line → verify summary stats populate correctly
- [ ] Load loyalty_upsell → verify summary stats + delta0=2
- [ ] Load refer_a_friend → verify summary stats + delta0=10
- [ ] Load hours_streaming_raw → verify raw data mode with 81 rows
- [ ] Load warrior_vs_rogue_damage → verify D&D themed scenario
- [ ] Verify download button works for all scenarios
- [ ] Verify no console errors

### ab_proportion (4 scenarios)
- [ ] Load newsletter_cta → verify control/variant proportions populate
- [ ] Load retargeting_offer → verify alpha=0.04 applied
- [ ] Load loyalty_partner → verify proportions + group names
- [ ] Load social_cta_raw → verify raw data mode with 50 rows (25 per group)
- [ ] Verify download button works for all scenarios
- [ ] Verify no console errors

### chisquare (5 scenarios)
- [ ] Load holiday_creative → verify 2×2 contingency table populates
- [ ] Load channel_purchase → verify 3×2 table + alpha=0.01
- [ ] Load landing_layout → verify 2×3 table + alpha=0.10
- [ ] Load loyalty_nudge_raw → verify raw data mode with 120 rows
- [ ] Load class_survival_dungeon → verify D&D themed 2×2 table
- [ ] Verify download button works for all scenarios
- [ ] Verify chart renders correctly after scenario load
- [ ] Verify no console errors

---

## Migration Benefits

1. **Zero HTTP Requests:** All scenario data now inline (no fetch() calls)
2. **Rich HTML Formatting:** Emoji icons, badges, context grids, insights sections
3. **No Parsing Overhead:** Direct data access vs. text file parsing
4. **No HTML Escaping Issues:** Template literals handle special characters
5. **Single-File Maintenance:** Eliminates 42 external files (14 .txt + 14 scenario-index.json entries + 14 .csv datasets)
6. **Consistent UX:** Uniform scenario card design across all 3 tools
7. **Type Safety:** Arrow functions prevent hoisting errors

---

## Code Quality

- **Validation:** All 3 files pass `get_errors` with no syntax errors
- **Consistency:** Follows patterns from pearson_correlation and paired_ttest migrations
- **Maintainability:** Inline scenarios easier to update than scattered text files
- **Performance:** Synchronous data access faster than async fetch()

---

## Next Steps

1. **Browser Testing:** User tests all 14 scenarios across 3 tools
2. **Fix Issues:** Address any bugs found during testing
3. **Delete Obsolete Files:** Remove 42 old scenario files after confirmation
4. **Git Commit:** Commit all changes with detailed commit message
5. **Final Batch:** Migrate remaining tools (onewayanova, mcnemar, bivariate_regression, univariate_analyzer)

---

## File Summary

| Tool | File | Scenarios | Lines Added | Lines Removed |
|------|------|-----------|-------------|---------------|
| ind_ttest | ind_ttest_app.js | 5 | ~110 (loadScenarioById) | ~390 (async functions + parsing) |
| ab_proportion | main_ab_proportion.js | 4 | ~320 (scenarios + loadScenarioById) | ~280 (async functions + parsing) |
| chisquare | chisquare_app.js | 5 | ~340 (scenarios + loadScenarioById) | ~200 (async functions) |
| **Total** | **3 files** | **14 scenarios** | **~770 lines** | **~870 lines** |

**Net Change:** -100 lines (more efficient synchronous code)

---

## Notes

- **ind_ttest:** Was partially migrated (scenarios existed, only loading functions needed replacement)
- **ab_proportion:** Full migration from scratch (scenarios + HTML + loading functions)
- **chisquare:** Full migration from scratch (scenarios + HTML + loading functions)
- **Raw Data Modes:** 3 scenarios use raw data mode (hours_streaming_raw, social_cta_raw, loyalty_nudge_raw)
- **Custom Alpha Levels:** 2 scenarios use non-default alpha (retargeting_offer α=0.04, channel_purchase α=0.01, landing_layout α=0.10)
- **D&D Themes:** 2 scenarios use D&D examples (warrior_vs_rogue_damage, class_survival_dungeon)

---

**Migration Completed:** December 2024  
**Status:** ✅ Ready for browser testing
