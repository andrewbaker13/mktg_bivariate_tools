# Multiple Regression with Interactions & Non-Linear Effects

## Overview

This advanced statistical tool extends multiple linear regression to handle **interaction effects (moderation)** and **quadratic effects (non-linear relationships)**. Designed for students and analysts who already understand basic multiple regression, this tool teaches how relationships between predictors and outcomes can be conditional or curved rather than simple and linear.

## Key Features

### Interaction Types Supported

1. **Continuous × Continuous Interaction**
   - Studies how the effect of one continuous predictor depends on another continuous predictor
   - Visualization: Three-line plots showing relationships at -1SD, mean, and +1SD of the moderator
   - Example: Price elasticity varying by product quality rating

2. **Continuous × Categorical Interaction**
   - Studies how a continuous predictor's effect differs across categories
   - Visualization: Separate lines for each category level
   - Example: Ad spend effectiveness varying by season

3. **Categorical × Categorical Interaction**
   - Studies how the combination of two categorical predictors affects the outcome
   - Visualization: Grouped bar charts showing all combinations
   - Example: Sales performance across region × product line combinations

4. **Quadratic Effect (X²)**
   - Captures curved (non-linear) relationships
   - Identifies optimal points (maxima or minima)
   - Visualization: Parabolic curve with turning point marked
   - Example: Engagement peaking at moderate email frequency, then declining

### Educational Design Principles

- **One interaction at a time**: Pedagogical restriction to focus learning on understanding one moderation/non-linear effect deeply
- **Focal vs. Moderator perspective**: Toggle controls allow students to view interactions from either variable's perspective
- **Mean-centering by default**: Improves interpretability and reduces multicollinearity when interaction terms are present
- **Confidence intervals**: Optional bands on visualizations to show uncertainty
- **Dual reporting**: Both APA-style statistical reporting and plain-language managerial interpretation

## Using the Tool

### Step 1: Load Data

**Option A: Use Preset Scenarios**
- Select from dropdown menu of 4 prepared scenarios
- Automatically loads dataset and configures interaction type
- Scenarios include marketing (ad spend, pricing, email) and gaming (D&D combat) contexts

**Option B: Upload Custom Data**
- CSV format with headers
- Include one numeric outcome variable and 2+ predictors
- Predictors can be numeric or categorical
- Tool auto-detects variable types

### Step 2: Assign Variables

- **Outcome (Y)**: Select your dependent variable (must be numeric)
- **Predictors**: Identify independent variables
  - For categorical predictors, set reference category
  - Tool handles dummy coding automatically

### Step 3: Select Interaction/Quadratic Effect

1. Choose interaction type via radio buttons:
   - None (standard MLR)
   - Continuous × Continuous
   - Continuous × Categorical
   - Categorical × Categorical
   - Quadratic (X²)

2. Select variables from dynamic dropdowns:
   - Dropdowns populate based on interaction type and variable types in your data
   - For interactions: Choose focal predictor and moderator
   - For quadratic: Choose continuous predictor
   - Use "Swap focal ↔ moderator" button to change perspective

### Step 4: Configure Settings

**Significance Level**
- Default: α = 0.05 (95% confidence)
- Quick-select buttons for 90%, 95%, 99% confidence
- Custom alpha values supported

**Advanced Settings** (expandable)
- **Mean-centering**: ON by default (recommended for interactions)
  - Centers continuous predictors around their means
  - Makes main effects interpretable as "effect at average levels"
  - Reduces multicollinearity with interaction terms
- **Confidence bands**: Toggle visibility on interaction plots

### Step 5: Interpret Results

#### Visual Output

1. **Actual vs. Fitted Plot**
   - Scatterplot comparing observed values to model predictions
   - Points near 45° line indicate good fit
   - Assess overall model adequacy

2. **Interaction/Effect Plot**
   - **Continuous × Continuous**: Three lines showing focal predictor effect at low (-1SD), average (mean), and high (+1SD) moderator levels
   - **Continuous × Categorical**: One line per category showing how continuous predictor relates to outcome
   - **Categorical × Categorical**: Grouped bars for all category combinations
   - **Quadratic**: Curved line with turning point (optimal value) marked

3. **Residuals vs. Fitted**
   - Diagnostic plot for checking assumptions
   - Look for random scatter (no patterns)
   - Funnel shapes indicate heteroscedasticity

#### Statistical Reporting

**Model Fit Metrics**
- R² and Adjusted R²: Proportion of variance explained
- Model F-test: Overall model significance
- RMSE and MAE: Prediction error metrics
- Sample size (n) and alpha level

**Regression Equation**
- Full fitted model with coefficients
- Includes interaction/quadratic terms

**Coefficient Table**
- Estimates, standard errors, t-statistics, p-values
- Confidence intervals for each coefficient
- Significant predictors highlighted

**APA-Style Report**
- Formatted statistical statement suitable for research papers
- Reports model significance, R², and significant predictors
- Mentions interaction/quadratic effects if present

**Managerial Interpretation**
- Plain-language summary for business audiences
- Highlights key findings (interaction significance, optimal points)
- Strategic implications (e.g., "tailor approach based on moderator")

#### Diagnostics

**Multicollinearity (VIF)**
- Variance Inflation Factor for each predictor
- Values > 10 indicate problematic multicollinearity
- Centering helps reduce VIF for interaction terms

**Residual Checks**
- Mean of residuals (should be ≈ 0)
- Standard deviation of residuals

## Understanding Interactions

### What is Moderation?

An interaction (moderation effect) occurs when **the relationship between X₁ and Y depends on the level of X₂**. This means:

- The "effect" of X₁ is not constant—it changes based on X₂
- X₂ is the **moderator** that influences the strength or direction of X₁'s effect
- X₁ is typically called the **focal predictor** (the one you're studying)

**Mathematical Form:**
```
Y = β₀ + β₁·X₁ + β₂·X₂ + β₃·(X₁ × X₂) + ε
```

- β₃ (the interaction coefficient) tells you how much X₁'s effect changes per unit of X₂
- If β₃ is significant, you have evidence of moderation

### Why Centering Matters

When including interaction terms, **mean-centering** continuous predictors is strongly recommended:

**Benefits:**
1. **Interpretability**: Main effects (β₁, β₂) represent effects "at average levels" rather than at zero (which might be meaningless)
2. **Multicollinearity reduction**: Interaction terms (X₁ × X₂) are highly correlated with their components; centering reduces this
3. **Clearer moderation**: Makes focal vs. moderator distinction more apparent

**How it works:**
- Centered X₁ = X₁ - mean(X₁)
- Centered X₂ = X₂ - mean(X₂)
- Interaction term = (X₁ - mean(X₁)) × (X₂ - mean(X₂))

**When to disable:**
- When zero is a meaningful value (e.g., age where 0 = birth)
- For categorical predictors (not centered)
- Advanced users with specific interpretive goals

### Simple Slopes Analysis

When an interaction is significant, the next step is **probing** the interaction by testing whether the focal predictor's effect is significant at different levels of the moderator:

**For continuous moderators:**
- Test focal predictor effect at three levels:
  - **Low**: Moderator at -1 SD
  - **Average**: Moderator at mean
  - **High**: Moderator at +1 SD

**For categorical moderators:**
- Test focal predictor effect within each category separately

The three-line (or multi-line) plots in this tool visualize these simple slopes.

### Focal vs. Moderator

The choice of which variable to call "focal" vs. "moderator" is often **conceptual** rather than statistical:

- **Focal predictor**: The independent variable whose effect you're studying
- **Moderator**: The variable that influences (moderates) that effect

**Example:**
- Research question: "Does ad spend effectiveness depend on seasonality?"
- Focal predictor: ad_spend (what you're manipulating/studying)
- Moderator: season (the contextual factor that changes the effect)

**Important**: You can swap focal and moderator perspectives! This tool includes a "Swap" button. The statistical model is the same, but interpretation changes:
- ad_spend × season (focal = spend, mod = season): "How does spend effectiveness vary by season?"
- season × ad_spend (focal = season, mod = spend): "How do seasonal effects vary by spending level?"

## Understanding Quadratic Effects

### What is a Quadratic Effect?

A quadratic effect captures **non-linear, curved relationships** between X and Y. The mathematical form:

```
Y = β₀ + β₁·X + β₂·X² + ε
```

**Interpretation:**
- β₁ (linear term): Rate of change when X is at its mean (if centered)
- β₂ (quadratic term): Curvature
  - If β₂ < 0: Inverted U-shape (diminishing returns, optimal point at top)
  - If β₂ > 0: U-shape (increasing returns, optimal point at bottom)

### Finding the Turning Point

The **optimal value** of X (where the curve peaks or bottoms out) is:

```
X* = -β₁ / (2·β₂)
```

**Business Applications:**
- **Optimal pricing**: Balance revenue maximization with customer retention
- **Ideal frequency**: Too little = ineffective; too much = annoying
- **Perfect difficulty**: Too easy = boring; too hard = frustrating

**Important**: Ensure the turning point falls within your observed data range. Extrapolating beyond observed X values is risky.

### Quadratic vs. Interaction

- **Quadratic**: One predictor with a curved effect (X²)
- **Interaction**: Two predictors where one moderates the other's effect (X₁ × X₂)
- Both extend basic MLR but address different questions

## Included Scenarios

### 1. Ad Spend × Seasonality (Continuous × Categorical)
- **Context**: 2 years of weekly advertising data
- **Variables**: ad_spend (continuous), season (Q1-Q4), revenue (outcome)
- **Effect**: Ad ROI varies dramatically by season (1.5× during Q4 holidays)
- **Learning goal**: See how categorical contexts moderate continuous predictors

### 2. Email Frequency Quadratic (Non-linear Effect)
- **Context**: 200 customers' engagement with email campaigns
- **Variables**: email_frequency (2-30 per month), segment, engagement_score (outcome)
- **Effect**: Inverted U-shape with optimal frequency ≈ 14 emails/month
- **Learning goal**: Find optimal points and understand diminishing returns

### 3. Price × Quality (Continuous × Continuous)
- **Context**: 180 survey responses on purchase intent
- **Variables**: price ($20-$200), quality_rating (1-10), purchase_intent (outcome)
- **Effect**: Price elasticity depends on perceived quality (high quality buffers price sensitivity)
- **Learning goal**: Visualize how one continuous variable moderates another

### 4. D&D Level × Class (Continuous × Categorical)
- **Context**: 120 combat encounters in Dungeons & Dragons
- **Variables**: character_level (1-20), class_type (Fighter/Wizard/Rogue), damage_per_round (outcome)
- **Effect**: Different classes scale differently with level (Wizard accelerates, Fighter linear)
- **Learning goal**: Apply interaction concepts to gaming contexts

## Technical Notes

### Design Matrix Construction

The tool automatically builds the design matrix including:
1. Intercept term (column of 1s)
2. Main effects for all predictors:
   - Continuous: Single column (centered if interactions present)
   - Categorical: Dummy variables for k-1 levels (reference category omitted)
3. Interaction or quadratic term:
   - **Cont × Cont**: One column = (X₁_centered × X₂_centered)
   - **Cont × Cat**: Multiple columns = (X_cont_centered × each categorical dummy)
   - **Cat × Cat**: Multiple columns = (each combo of dummies from Cat1 and Cat2)
   - **Quadratic**: One column = X_centered²

### Matrix Algebra

Regression coefficients estimated via:
```
β = (X'X)⁻¹ X'y
```

Where:
- X = design matrix (n × p)
- y = outcome vector (n × 1)
- β = coefficient vector (p × 1)

Standard errors derived from:
```
SE(β) = sqrt(diag((X'X)⁻¹ · MSE))
```

### VIF Calculation

For each predictor j:
1. Regress X_j on all other predictors
2. Calculate R²_j from that regression
3. VIF_j = 1 / (1 - R²_j)

Values > 10 indicate high multicollinearity (predictor is highly redundant with others).

### Confidence Intervals

For each coefficient:
```
CI = β ± t_critical · SE(β)
```

Where t_critical = t-quantile at (1 - α/2) percentile with (n - k - 1) degrees of freedom.

## Best Practices

### When to Use Interactions

**Consider interactions when:**
- You have theoretical reasons to expect conditional effects (e.g., "treatment works better for subgroup X")
- Exploring heterogeneous treatment effects
- Segmentation analysis (effects differ by customer type, region, etc.)
- Contextual factors matter (time, location, competitive landscape)

**Cautions:**
- Don't "fish" for interactions without theory—multiple testing inflates Type I error
- Interactions require larger sample sizes (rule of thumb: n > 30 per cell in categorical interactions)
- Interpretation becomes more complex (always visualize!)

### When to Use Quadratic Terms

**Consider quadratic terms when:**
- Theory suggests diminishing or accelerating returns
- Visual inspection (scatterplots) shows curvature
- Relationship is non-monotonic (increases then decreases, or vice versa)

**Cautions:**
- Adding X² when relationship is truly linear reduces power
- Check that turning point is within observed data range
- Consider alternative non-linear approaches (log transform, splines) if quadratic doesn't fit well

### Sample Size Considerations

**Minimum recommendations:**
- **Standard MLR**: n > 10·k (k = number of predictors)
- **With interactions**: n > 20·k
- **Categorical × Categorical**: n > 30 per cell combination

Smaller samples lead to:
- Unstable coefficient estimates
- Low statistical power
- Overfitting risk

### Model Building Strategy

1. **Start simple**: Fit main effects model first
2. **Check assumptions**: Residual plots, multicollinearity
3. **Add interaction/quadratic**: Only if theoretically justified
4. **Compare models**: Is R² improvement meaningful? (Use F-test for nested models)
5. **Visualize**: Always plot interactions and quadratic effects
6. **Probe significant interactions**: Simple slopes analysis
7. **Validate**: Test on holdout data if possible

## Limitations

### Educational Restrictions

- **One interaction/quadratic at a time**: Real models can include multiple interactions and higher-order terms, but this tool restricts to one for clarity
- **No three-way interactions**: X₁ × X₂ × X₃ interactions not supported (use R/Python for advanced models)
- **No covariates beyond predictors**: Control variables must be entered as standard predictors

### Technical Limitations

- **Maximum dataset size**: Browser-based computation limits (~10,000 rows practical max)
- **No missing data handling**: Remove or impute missing values before upload
- **No model comparison**: Tool doesn't formally test whether adding interaction improves fit (use F-test manually)
- **No bootstrap/robust SE**: Standard errors assume homoscedasticity

### Statistical Assumptions

Multiple regression assumptions still apply:
1. **Linearity**: Relationship between predictors and outcome is linear (after accounting for interaction/quadratic)
2. **Independence**: Observations are independent
3. **Homoscedasticity**: Constant variance of residuals
4. **Normality**: Residuals approximately normally distributed (for inference)
5. **No perfect multicollinearity**: Predictors not perfectly correlated (VIF checks this)

## Advanced Extensions (Not in This Tool)

For professional analysis, consider:
- **Multiple interactions**: More than one interaction term
- **Three-way interactions**: X₁ × X₂ × X₃
- **Higher-order polynomials**: Cubic (X³), quartic (X⁴) terms
- **Splines/GAMs**: More flexible non-linear modeling
- **Mixed-effects models**: Nested data structures (e.g., students within schools)
- **Robust regression**: Handling outliers and heteroscedasticity
- **Regularization**: Ridge/LASSO for high-dimensional data

Use R (`lm()`, `glm()`, `mgcv::gam()`), Python (`statsmodels`, `sklearn`), or SPSS/Stata for these advanced features.

## Citation

If using this tool for research or teaching, please cite:

```
Baker, Andrew. (2025). Multiple Regression with Interactions & Non-Linear Effects. 
Marketing Bivariate Tools. 
https://github.com/andrewbaker13/mktg_bivariate_tools/apps/mlr_interactions/
```

## Support & Feedback

- **Issues**: Report bugs via GitHub Issues
- **Questions**: Contact Andrew Baker
- **Contributions**: Pull requests welcome

## License

This tool is provided for educational purposes. See repository LICENSE file for details.

---

**Version**: 1.0  
**Last Updated**: January 2025  
**Maintainer**: Andrew Baker
