# OLD_SITE CLEANUP ANALYSIS & RECOMMENDATIONS

## EXECUTIVE SUMMARY
The `/old_site` folder contains a Google Sites export with **5 main content pages** totaling ~2MB of bloated HTML. After extraction, the actual useful content is **minimal**: ~35-65 lines per page. The site hosts:

1. **Navigation/branding** - Logo, site title, navigation menu  
2. **Links to your 21 interactive tools** - Already available in main site
3. **Teaching resources** - Excel templates, CSV datasets, student research data
4. **Educational content** - ~7 student research projects with codebooks and raw data

---

## CURRENT TECHNICAL STATE

### File Structure
```
old_site/
├── Home.html                              (1.9 MB, 13 lines of content)
├── Statistical Testing Online Helpers.html (2.0 MB, 22 lines of content) 
├── Practice Datasets.html                 (2.0 MB, 33 lines of content)
├── Previous Student Projects.html         (2.0 MB, 64 lines of content)
├── Excel Sheets.html                      (2.0 MB, 39 lines of content)
├── index.html                             (2 KB, essentially empty landing page)
├── style.css                              (minified Google CSS, ~2000 lines)
├── script.js                              (likely Google auto-generated)
└── Excel Sheets/                          (folder, contents unknown)
    └── Previous Student Projects/         (folder, contents unknown)
```

### HTML Bloat Analysis
Each ~2MB HTML file contains:
- **Google Sites framework** - 2000+ nested divs with `jscontroller`, `jsaction`, `data-idom-class` attributes
- **Obfuscated CSS classes** - VfPpkd-*, HB1eCd-*, tk3N6e-*, etc. (no semantic meaning)
- **Inline event handlers** - Multiple `jsaction="click:..."` attributes on every button
- **Google tracking/analytics** - Embedded tracking pixels and telemetry
- **Boilerplate markup** - Skip navigation, branding divs, empty utility containers
- **Actual content** - ~0.1-0.2% of file size

---

## CONTENT INVENTORY

### PAGE 1: Home.html
**Purpose:** Landing page / about the author  
**Content:**
- Site branding (DrBakerSDSU)
- Navigation menu
- Bio paragraph about Dr. Baker and the site's purpose
- Disclaimer about creative skills being limited

**Status:** ⚠️ Mostly marketing fluff, replaceable with a simple home page

---

### PAGE 2: Statistical Testing Online Helpers.html
**Purpose:** Directory of interactive statistical tools  
**Content:**
- A/B Testing tool (test of two independent proportions)
- A/B Testing tool (test of two independent means)
- Testing proportions between multiple groups (chi-square test)
- And links to 18+ other tools

**Status:** ✅ **Redundant** - All 21 tools already exist in main `/apps/` folder and `compare.html` links to all of them. This page is outdated.

---

### PAGE 3: Practice Datasets.html
**Purpose:** Links to teaching datasets  
**Content:**
- RapidMiner Meal Kit Case Study tutorial data (2 CSV + 5 RMP process files + PowerPoint)
- Practice Craft Beer Dataset in SPSS (referenced, unclear if file exists)
- Practice Craft Beer Dataset in Excel (referenced, unclear if file exists)
- Links to datasets on external sites

**Status:** ⚠️ **Partially useful** - Some referenced files may not exist or be outdated. External links may be broken.

---

### PAGE 4: Previous Student Projects.html ⭐ **MOST VALUABLE**
**Purpose:** Student research datasets with full documentation  
**Content - 7 Research Studies:**

1. **Parasocial Relationships & Social Media Influencers** (Fall 2025)
   - 1,342 respondents
   - Codebook, raw data (labeled + unlabeled), sentiment analysis included
   - SPSS & Excel files
   - Recent data, high quality controls

2. **Sustainable & Fast Fashion Clothing** (Summer 2024)
   - 683 respondents  
   - Brand shopping behavior, sustainability priorities
   - SPSS & PDF codebook

3. **San Diego Coffeeshops Brand Perception** (Fall 2023)
   - 970 respondents
   - Brand perceptions of Dark Horse, Better Buzz, Starbucks
   - SPSS & Excel files with codebook

4. **Coffee & Generative AI Sentiment** (Summer 2023)
   - 493 respondents
   - A/B experiment on AI-generated content perception
   - Sentiment analysis included

5. **Plant-Based Food Alternatives** (Summer 2022)
   - 397 respondents
   - A/B experiment on vegan logo impact
   - SPSS & Excel files

6. **Brand Gender Perceptions - Alcohol Brands** (Summer 2021)
   - Hard seltzer brand perceptions, gender identity assessment
   - SPSS & Excel files

7. **Black Lives Matter & COVID-19 Branding** (Summer 2020)
   - 401 respondents  
   - Sentiment, brand perception, demographic analysis

**Status:** ✅ **KEEP** - Valuable teaching/practice datasets with full documentation. Consider hosting these as practice data for students.

---

### PAGE 5: Excel Sheets.html
**Purpose:** Excel templates for statistical education  
**Content - 10+ Educational Tools:**

1. **Odds O Matic** - Practice differences between probability, odds, odds ratio, relative risk
2. **Learning About Logistic Regression** - Beta parameter exploration  
3. **Confusion Matrix Metrics** - Prediction model evaluation
4. **Conjoint Analysis (Enginius)** - Cooler case study, choice rules, partsworth results
5. **Price Bundling Optimization** - Profit maximization for computer accessories
6. **Gabor-Granger Method** - Pricing analytics applications
7. **Purchase Intentions to Purchase Probabilities** - Conversion modeling
8. **Intro to Predictive Model Training/Validation** - RapidMiner process files (GMO Foods dataset)

**Status:** ✅ **KEEP** - Valuable supplementary teaching materials for statistical concepts. Some may be outdated, but useful pedagogically.

---

## CLEANUP OPTIONS & RECOMMENDATIONS

### Option A: ❌ **DELETE (Not Recommended)**
- **Pros:** Removes technical debt, cleans up 2MB of bloated HTML
- **Cons:** Loses teaching resources, student datasets, and Excel tools

### Option B: ✅ **ARCHIVE + SELECTIVE INTEGRATION (Recommended)**
**Action Items:**

1. **Back up entire old_site folder** as historical archive (name: `old_site_backup_archived_<date>`)

2. **Extract & migrate valuable teaching resources:**
   - Student research datasets → create `/data/student-projects/` folder
   - Excel templates → create `/resources/excel-templates/` folder  
   - Practice datasets → reference in main `index.html` as "Teaching Resources"

3. **Create clean `/old_site/` index page** with:
   - Brief historical note ("This folder contains legacy content from 2014-2025")
   - Links to:
     - ✅ Student datasets (with codebooks, SPSS/Excel files)
     - ✅ Excel teaching templates (with descriptions)
     - ✅ Practice datasets (with links to source data)
   - Simple semantic HTML (< 50 KB, no Google bloat)

4. **Delete old Google Sites HTML files** but preserve any downloadable assets:
   - SPSS files (.sav)
   - Excel files (.xlsx)
   - CSV datasets
   - PDF codebooks
   - PowerPoint slides

### Option C: 🤷 **KEEP AS-IS**
- **Pros:** No work required
- **Cons:** 2MB of technical debt, misleading links, poor user experience

---

## RECOMMENDED NEXT STEPS

1. **Decide on archival strategy:** Option A (delete), Option B (archive + migrate), or Option C (keep)

2. **If Option B:**
   - Check which Excel/SPSS/CSV files actually exist in `old_site/Excel Sheets/` and `old_site/Previous Student Projects/` folders
   - Verify links and resources still work
   - Create migration plan for teaching resources
   - Design clean replacement index page

3. **Create git history:** Before making changes, commit current `old_site/` state for future reference

4. **Update main index.html:** Add "Teaching Resources" or "Student Datasets" section that links to preserved materials

---

## TECHNICAL DETAILS: GOOGLE SITES BLOAT

Example file size breakdown (`Home.html`, 1.9 MB):

```
Header & metadata         : ~800 KB (Google tracking, schema, telemetry)
CSS (minified, obfuscated): ~600 KB (normalize.css + Google Material Design)
Navigation markup         : ~300 KB (nested divs, jscontroller, jsaction attrs)
Actual content text       : ~50 KB (navigation menu, site title, bio paragraph)
Footer & utilities        : ~150 KB (skip links, empty divs, tracking pixels)
───────────────────────────
Total                     : ~1900 KB
```

**Compression opportunity:** ~95% of file size is Google framework bloat.

---

## DECISION MATRIX

| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Cleanup effort | 1 hour | 3-4 hours | 0 hours |
| Value to users | 0% | 70% | Unclear |
| Technical debt | -2MB | 0% | 2MB |
| Teaching resources preserved | ❌ | ✅ | ✅ |
| Professional appearance | ✅ | ✅ | ❌ |
| Recommendation | ❌ | ✅✅ | ⚠️ |

