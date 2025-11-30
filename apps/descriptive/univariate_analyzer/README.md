# Univariate Statistics Analyzer

A web-based tool for analyzing single variables (univariate analysis) in marketing datasets. The tool automatically detects data types and generates appropriate statistics and visualizations.

## Features

### Data Type Detection
- Automatically detects whether each column is **continuous** (numeric) or **categorical** (text)
- Detects if ≥50% of non-missing values in a column can be parsed as numbers

### Continuous Variables Analysis
**Statistics:**
- Mean, Median, Mode
- Standard Deviation, Variance
- Range, IQR (Interquartile Range)
- Min, Max
- Percentiles (Q1 at 25%, Q3 at 75%)
- Skewness and Kurtosis

**Visualizations:**
- Box plots (with mean line)
- Histograms
- Toggle between visualizations

### Categorical Variables Analysis
**Statistics:**
- Frequency table with counts and percentages
- Top 10 categories displayed by default
- "Other" category aggregates remaining values
- Toggle to show all unique categories

**Visualizations:**
- Bar charts

### Dataset Features
- Supports CSV and TSV files
- Automatic delimiter detection (comma or tab)
- Handles mixed data types
- Reports missing data per variable (count and %)
- Caps uploads at 5,000 rows
- Instant variable switching with dropdown selector

### Export
- Exportable summary tables as CSV files
- Separate tables for continuous and categorical variables
- Tables include key statistics for reporting

## File Structure
```
univariate_analyzer/
├── main_univariate_analyzer.html    # Main UI
├── main_univariate_analyzer.js      # Core logic & calculations
├── main_univariate_analyzer.css     # App-specific styles
└── scenarios/
    ├── influencer_engagement.csv    # Marketing scenario: influencer metrics
    ├── customer_survey.csv          # Marketing scenario: customer survey responses
    └── ecommerce_orders.csv         # Marketing scenario: e-commerce transaction data
```

## Sample Datasets

### 1. influencer_engagement.csv (30 rows)
Influencer marketing data with mixed variables:
- **Continuous:** followers, engagement_rate, avg_likes, avg_comments, posts_per_month, audience_age_median, cost_per_post, conversion_rate, brand_fit_score
- **Categorical:** platform, content_category
- **Missing data:** Realistic gaps in columns like cost_per_post and avg_likes

### 2. customer_survey.csv (30 rows)
Survey response data from customer analytics:
- **Continuous:** age, income_level, nps_score, satisfaction_rating, annual_spend
- **Categorical:** brand_awareness, purchase_intent, product_category_preferred, communication_channel
- **Continuous with missing:** visit_frequency pattern
- **Missing data:** Scattered NPS and satisfaction ratings

### 3. ecommerce_orders.csv (30 rows)
E-commerce transaction data:
- **Continuous:** customer_age, order_value, days_to_purchase, avg_review_rating
- **Categorical:** product_category, device_type, marketing_channel, promo_code_used, customer_segment, return_rate
- **Missing data:** Various missing values across multiple columns

## Usage

1. **Upload Data:** Drag and drop a CSV/TSV file or browse to select one
2. **Select Variables:** Check/uncheck variables; use "All" and "None" shortcuts
3. **View Results:** Results update automatically when variables are selected
4. **Explore:** 
   - Use dropdown to switch between variables instantly
   - Toggle visualizations for continuous variables (box plot ↔ histogram)
   - Toggle "Show all categories" for categorical variables with 10+ categories
5. **Export:** Download summary tables as CSV files for reporting

## Implementation Notes

### Data Type Detection
Uses a heuristic approach: if ≥50% of non-empty values in a column can be parsed as numbers, it's classified as **continuous**; otherwise **categorical**.

### Missing Data Handling
- Empty strings (""), null, and undefined values are treated as missing
- Missing data count and percentage reported per variable
- Missing values excluded from all calculations

### Categorical Top 10 Display
- Top 10 categories shown by frequency (descending)
- Remaining categories aggregated as "Other"
- Toggle to display all unique categories if needed

### Summary Tables
- **Continuous Summary:** Shows mean, median, std dev, min, max, and count for each selected continuous variable
- **Categorical Summary:** Shows unique value count, mode, mode frequency, and count for each selected categorical variable
- Tables are separated by data type and independently exportable

## Technologies Used
- **HTML5** for semantic structure
- **CSS3** with CSS custom properties for theming
- **Vanilla JavaScript** for calculations and DOM manipulation
- **Plotly.js** for interactive visualizations
- **MathJax** for mathematical notation (in overview section)

## Browser Requirements
- Modern browsers supporting ES6 (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Plotly.js library loaded from CDN

## Future Enhancements
- Scenario preset data loading from embedded datasets
- Additional distribution visualizations (Q-Q plots, density plots)
- Advanced statistics (confidence intervals, hypothesis tests)
- Data standardization/scaling options
- Multi-variable correlation heatmaps
