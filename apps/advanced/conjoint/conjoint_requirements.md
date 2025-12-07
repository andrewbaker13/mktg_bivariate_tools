0. High-Level Overview

You are building a web app for teaching choice-based conjoint (CBC).

Front end: HTML + JavaScript only (no frameworks required, allowed if helpful).

Back end: Python is allowed and is preferred for estimation if needed.

Core capabilities:

Upload CBC data (long format).

Estimate individual-level utilities (part-worths) from choice data.

Handle:

Categorical attributes

Numeric attributes (as categorical by default; optional linear/quadratic)

A special PRICE attribute

A None alternative

Competitor alternatives modeled as whole alternatives with their own constants.

Run simulations (shares, profit) using these utilities.

Segment respondents using k-means on normalized utilities.

Visualize results in the browser.

The app is for students; clarity and transparency are more important than extreme performance or sophistication.

1. Data Model and Input Specification
1.1. Conjoint Data Format (CSV)

The main input is a long-format CSV where each row corresponds to one alternative in one choice task for one respondent.

Required columns:

respondent_id

String or integer.

Identifies the respondent.

task_id

String or integer.

Identifies the choice task (within respondent).

alternative_id

String or integer.

Identifies the alternative within a task.

May include:

Systematic experimental alternatives (e.g., A, B, C)

Named competitor alternatives (e.g., "iPhone", "SamsungS20")

A special alternative representing “None” (user selects label in UI).

chosen

Binary: 0/1.

1 for the alternative chosen by the respondent in that task; 0 otherwise.

Attribute Columns (one column per attribute, NOT dummy coded)

Examples:

brand (e.g., "BrandX", "BrandY", "BrandZ", "CompetitorApple")

color (e.g., "Black", "White", "Gold")

storage_gb (numeric)

price (numeric)

No pre-generated dummies are assumed. The app handles coding.

Missing or unused attributes for some alternatives (e.g., competitor or None) can be empty/NA; app must handle that gracefully.

1.2. Attribute Metadata (Defined in UI)

After upload, the user configures a metadata panel specifying:

For each attribute column:

Attribute name (read from header, editable in UI).

Attribute type:

categorical

numeric_linear

numeric_quadratic

price (special case, numeric)

Optional:

Order of levels (for categorical)

Whether to include attribute in simulation (can be toggled off if irrelevant)

Defaults:

All attributes are initially treated as categorical.

The user must explicitly mark numeric variables as:

numeric_linear or

numeric_quadratic or

price.

1.3. Special Fields: PRICE

There may be one attribute explicitly marked as price.

If present in the data:

It is modeled as a numeric variable.

Included in utilities and simulations.

If NOT present in the data:

The simulation UI must allow the user to enter price values for each product in a scenario.

The model will still have a single price coefficient per respondent estimated from tasks where price varied (if price existed) or may be absent (in which case price-based simulation is limited).

1.4. Special Alternatives
1.4.1. None Alternative

The user will select which alternative_id corresponds to “None/No choice”.

For each respondent, the model estimates a unique utility parameter for “None”:

𝛽
none
,
𝑖
β
none,i
	​


This parameter is included in simulations.

1.4.2. Competitor Alternatives (Approach B)

Competitor alternatives are whole alternatives, not decomposed into attribute-level utilities beyond what is in the data.

Each distinct competitor alternative (e.g., "iPhone", "SamsungS20") is treated as having its own alternative-specific constant (ASC) per respondent:

𝛽
comp
𝑘
,
𝑖
β
comp
k
	​

,i
	​

 for competitor k and respondent i.

Conceptually:

Experimental alternatives are explained by attribute-level utilities.

Each competitor gets an extra “brand advantage/disadvantage” via its ASC.

Competitor alternatives may or may not have attribute values (e.g., price) in the data.

If they do have price in the tasks, price contributes to their utility via the estimated price coefficient.

If not, their utility is driven solely by the competitor-specific constant.

Key limitation:
Competitors’ attribute structure is not fully modeled (no full decomposition across attributes). Their main role is to provide a realistic constant benchmark in simulations.

2. Estimation Model
2.1. Core Approach

Back end: Python service.

For each respondent 
𝑖
i, estimate a multinomial logit (MNL) / conditional logit model with:

Alternative-specific constants for:

Competitor alternatives

None alternative

Optionally, a base product alternative (if desired)

Attribute coefficients based on attribute type and coding.

Optional L2 (ridge) regularization to stabilize estimates, especially when tasks per respondent ~8–10.

The goal is to get individual-level utilities suitable for teaching & simulation.

2.2. Coding Rules

For each respondent:

Categorical attributes

Automatically coded into dummy or effects codes.

For simplicity and transparency, choose dummy coding by default:

One level is baseline.

Each non-baseline level gets its own coefficient.

(Optionally: include a flag in code to switch to effects coding; not essential in v1.)

Numeric_linear

A single slope coefficient per attribute:

𝑈
𝑎
𝑡
𝑡
𝑟
(
𝑥
)
=
𝛽
𝑎
𝑡
𝑡
𝑟
,
𝑖
⋅
𝑥
U
attr
	​

(x)=β
attr,i
	​

⋅x

Numeric_quadratic

Two coefficients per attribute:

𝑈
𝑎
𝑡
𝑡
𝑟
(
𝑥
)
=
𝛽
1
,
𝑎
𝑡
𝑡
𝑟
,
𝑖
⋅
𝑥
+
𝛽
2
,
𝑎
𝑡
𝑡
𝑟
,
𝑖
⋅
𝑥
2
U
attr
	​

(x)=β
1,attr,i
	​

⋅x+β
2,attr,i
	​

⋅x
2

Price

Treated as numeric_linear for estimation:

𝑈
𝑝
𝑟
𝑖
𝑐
𝑒
(
𝑝
)
=
𝛽
price
,
𝑖
⋅
𝑝
U
price
	​

(p)=β
price,i
	​

⋅p

Sign convention: expect negative.

This coefficient is crucial for:

Simulations

Profit modeling

Willingness-to-pay explanations (later).

Alternative-specific constants (ASCs)

Each competitor alternative 
𝑘
k gets:

𝛽
comp
𝑘
,
𝑖
β
comp
k
	​

,i
	​


“None” alternative gets:

𝛽
none
,
𝑖
β
none,i
	​


One alternative (e.g., the first experimental alternative) is chosen as baseline and gets ASC = 0.

2.3. Utility Function

For respondent 
𝑖
i, alternative 
𝑗
j, and task 
𝑡
t:

𝑈
𝑖
𝑗
𝑡
=
𝛼
𝑗
,
𝑖
+
∑
𝑎
∈
cat
∑
𝑙
𝛽
𝑎
,
𝑙
,
𝑖
⋅
𝐼
(
level
(
𝑎
)
=
𝑙
)
+
∑
𝑏
∈
num-linear
𝛽
𝑏
,
𝑖
⋅
𝑥
𝑏
+
∑
𝑐
∈
num-quad
(
𝛽
𝑐
1
,
𝑖
⋅
𝑥
𝑐
+
𝛽
𝑐
2
,
𝑖
⋅
𝑥
𝑐
2
)
+
𝛽
price
,
𝑖
⋅
𝑝
𝑗
U
ijt
	​

=α
j,i
	​

+
a∈cat
∑
	​

l
∑
	​

β
a,l,i
	​

⋅I(level(a)=l)+
b∈num-linear
∑
	​

β
b,i
	​

⋅x
b
	​

+
c∈num-quad
∑
	​

(β
c1,i
	​

⋅x
c
	​

+β
c2,i
	​

⋅x
c
2
	​

)+β
price,i
	​

⋅p
j
	​


𝛼
𝑗
,
𝑖
α
j,i
	​

 includes:

0 for baseline product

ASCs for competitors and None

2.4. Choice Probabilities

Conditional logit:

𝑃
(
choose 
𝑗
∣
task 
𝑡
,
𝑖
)
=
exp
⁡
(
𝑈
𝑖
𝑗
𝑡
)
∑
𝑘
∈
𝐶
𝑖
𝑡
exp
⁡
(
𝑈
𝑖
𝑘
𝑡
)
P(choose j∣task t,i)=
∑
k∈C
it
	​

	​

exp(U
ikt
	​

)
exp(U
ijt
	​

)
	​


Where 
𝐶
𝑖
𝑡
C
it
	​

 is the choice set for respondent 
𝑖
i in task 
𝑡
t.

2.5. Estimation Details (for the dev LLM)

Backend stack suggestion:

Python 3.x

pandas for data handling

numpy for numerical ops

scikit-learn or statsmodels for logistic regression OR custom MNL optimizer.

Estimation strategy (per respondent):

Filter the long data to single respondent.

Build the design matrix 
𝑋
𝑖
X
i
	​

 with:

Columns for all attribute codes and price.

Columns for ASCs (competitors + none).

Encode outcome as chosen alternative per task; use one-row-per-alternative logit formulation.

Fit MNL/conditional logit using maximum likelihood.

Apply ridge regularization (e.g., L2 penalty) to reduce overfitting/instability.

Return:

Coefficient vector for respondent i

Log-likelihood, pseudo-R², etc.

Parallelization:

Respondent-level models can be run in parallel if performance needed.

2.6. Outputs from Estimation

Backend returns:

Respondent-level utilities

For each respondent i:

Coefficients for:

Each attribute level (or numeric term)

Price coefficient

None ASC

Each competitor ASC

Attribute Importance (per respondent)

For each attribute:

Range of total utility across its levels or across typical values.

Importance = (range for attribute) / (sum of ranges for all attributes).

Fit statistics (optional but ideal):

Log-likelihood at convergence

Null log-likelihood

McFadden pseudo-R²

Number of tasks/alternatives used

Aggregated summaries:

Mean utilities across respondents

Mean attribute importances

Distribution summaries (mean, median, SD)

These outputs are passed back to the front end as JSON for visualization and simulation.

3. Simulation Engine (Front-End)
3.1. Scenario Definition UI

Students create simulation scenarios in the browser.

Each scenario consists of:

A list of alternatives (products) in the simulated market.

For each alternative:

name (e.g., “Our Product A”)

Attribute values (for categorical and numeric attributes)

price value (if applicable)

cost value (for profit calculation)

type:

"our_product"

"competitor"

"none" (no attributes, no price)

Important:

Competitor alternatives used in simulation should map to the ASCs from the estimation:

E.g. a competitor named "iPhone" uses the coefficient 
𝛽
comp
iPhone
,
𝑖
β
comp
iPhone
	​

,i
	​

 for each respondent.

For “None”, use its ASC 
𝛽
none
,
𝑖
β
none,i
	​

.

3.2. Utility and Choice Probability in Simulation

Given respondent-level coefficients and a scenario:

For each respondent 
𝑖
i and alternative 
𝑗
j in scenario:

Compute 
𝑈
𝑖
𝑗
U
ij
	​

 using:

attribute utilities (for our products)

competitor ASC (if competitor)

None ASC (if none)

price effect (if price exists).

Compute choice probabilities:

𝑃
𝑖
𝑗
=
exp
⁡
(
𝑈
𝑖
𝑗
)
∑
𝑘
exp
⁡
(
𝑈
𝑖
𝑘
)
P
ij
	​

=
∑
k
	​

exp(U
ik
	​

)
exp(U
ij
	​

)
	​


Market share (preference share) for each alternative j:

Average across respondents:

𝑆
ℎ
𝑎
𝑟
𝑒
𝑗
=
1
𝑁
∑
𝑖
=
1
𝑁
𝑃
𝑖
𝑗
Share
j
	​

=
N
1
	​

i=1
∑
N
	​

P
ij
	​


If segments exist (see section 4), compute segment-level shares analogously.

All of this runs in the front-end using the JSON utilities from the backend.

3.3. Profit Calculation

For each alternative j:

The user provides:

price_j

cost_j

Per-unit profit: 
𝑚
𝑎
𝑟
𝑔
𝑖
𝑛
𝑗
=
𝑝
𝑟
𝑖
𝑐
𝑒
𝑗
−
𝑐
𝑜
𝑠
𝑡
𝑗
margin
j
	​

=price
j
	​

−cost
j
	​


Expected profit (up to scale) per respondent group:

𝑃
𝑟
𝑜
𝑓
𝑖
𝑡
𝑗
=
𝑆
ℎ
𝑎
𝑟
𝑒
𝑗
⋅
𝑀
𝑎
𝑟
𝑘
𝑒
𝑡
𝑆
𝑖
𝑧
𝑒
⋅
𝑚
𝑎
𝑟
𝑔
𝑖
𝑛
𝑗
Profit
j
	​

=Share
j
	​

⋅MarketSize⋅margin
j
	​


MarketSize can be a user-entered number (e.g., 10,000 customers).

Display:

Profit by product

Total profit

Profit vs. price plots (if user sweeps price).

3.4. Brute-Force Optimization (First Version)

For our products only:

User chooses:

Which attributes to vary.

Allowed levels/values for each.

Range of prices (if price is included).

App generates all candidate configurations (Cartesian product).

For each configuration (or set of configurations if multiple products):

Compute shares & profit as above.

Record results.

Display:

Top K configurations by:

Market share

Profit

Plots of share/profit vs attribute levels/price.

No sophisticated search needed initially.

4. Segmentation (Front-End)

Once respondent-level utilities are estimated:

Build a feature vector per respondent:

All standardized part-worths (including price coefficient, optionally excluding ASCs).

Normalize or standardize each coefficient (z-score) across respondents.

Run k-means clustering (front-end JS implementation) on these feature vectors.

User selects number of clusters (e.g., 2–6).

Output:

Segment membership per respondent.

Segment-level average part-worths.

Segment-level attribute importances.

Segment-level simulation results (shares, profit when scenario is run per segment).

Visualize:

Radar charts or grouped bar charts of utilities by segment.

Segment size pie chart.

5. Front-End UI Flow
5.1. Step 0 — Landing Page

Short explanation of:

What CBC is

What the tool does

Buttons:

“Upload Data & Estimate Model”

“Load Demo Dataset”

5.2. Step 1 — Upload Data

File upload control (CSV).

Preview table (first 20 rows).

Mapping step:

Confirm respondent_id, task_id, alternative_id, chosen.

Auto-detect attribute columns (all other columns).

Validation:

Check at least one choice per task.

Check each task has ≥2 alternatives.

Warn if respondents have fewer than ~8 tasks.

5.3. Step 2 — Attribute Setup

For each attribute column:

Dropdown “Attribute Type”:

Categorical

Numeric (linear)

Numeric (quadratic)

Price (special)

For categorical:

Show list of levels and allow reordering.

Pick:

“Which alternative_id is the None option?”

“Which alternative_ids are competitors (if any)?”

Store this metadata as a JSON object and send with data to the backend.

5.4. Step 3 — Estimation

Button: “Estimate Utilities”

Sends:

Filtered CSV (or JSON representation)

Attribute metadata

Model options (regularization strength, etc.)

To backend /estimate endpoint.

Show progress indicator.

When done:

Display success + summary:

respondents estimated

Average pseudo-R²

Time taken

5.5. Step 4 — Results & Visualization

Tabs:

Individual-Level Utilities

Table: respondent × attribute-level utilities.

Download CSV.

Aggregated Attribute Importance

Bar chart of mean importance per attribute.

None & Competitor Effects

Distribution of β_none and competitor ASCs.

Histograms or boxplots.

5.6. Step 5 — Segmentation

Control for k (number of clusters).

Run k-means.

Show:

Segment sizes.

Segment-level attribute importances.

Segment-level price sensitivity.

5.7. Step 6 — Simulation

Scenario builder:

Define alternatives with attributes and prices/costs.

Flag alternatives as:

Our product

Competitor (mapped by name to competitor ASC)

None (automatic mapping)

Buttons:

“Run Simulation”

“Run Optimization” (brute force search across allowed combos).

Show outputs:

Share by alternative (overall and by segment).

Profit by alternative and total.

Downloadable CSV of simulation results.

Allow saving multiple scenarios for side-by-side comparison.

6. Backend API Contract (Python Service)

At minimum, define:

6.1. /estimate (POST)

Request JSON:

{
  "data": [
    {
      "respondent_id": "R1",
      "task_id": "1",
      "alternative_id": "A",
      "chosen": 1,
      "brand": "BrandX",
      "color": "Black",
      "storage_gb": 64,
      "price": 699
    }
    // ... more rows
  ],
  "attribute_metadata": {
    "brand": {"type": "categorical"},
    "color": {"type": "categorical"},
    "storage_gb": {"type": "numeric_linear"},
    "price": {"type": "price"}
  },
  "none_alternative_id": "None",
  "competitor_alternative_ids": ["iPhone", "SamsungS20"],
  "model_options": {
    "regularization": "L2",
    "reg_strength": 1.0
  }
}


Response JSON (simplified structure):

{
  "respondents": [
    {
      "respondent_id": "R1",
      "coefficients": {
        "brand_BrandY": 0.3,
        "brand_BrandZ": -0.1,
        "color_White": 0.2,
        "storage_gb": 0.01,
        "price": -0.005,
        "ASC_None": -1.2,
        "ASC_Competitor_iPhone": 0.8,
        "ASC_Competitor_SamsungS20": 0.5
      },
      "attribute_importance": {
        "brand": 0.4,
        "color": 0.1,
        "storage_gb": 0.2,
        "price": 0.3
      },
      "fit": {
        "log_likelihood": -120.0,
        "null_log_likelihood": -150.0,
        "pseudo_r2": 0.2
      }
    }
    // more respondents
  ],
  "aggregate_summaries": {
    "mean_attribute_importance": {
      "brand": 0.35,
      "color": 0.15,
      "storage_gb": 0.2,
      "price": 0.3
    }
  }
}


No other endpoints are strictly required for v1; simulation and segmentation can be entirely front-end using this output.

7. Performance & Limits

Target data scale:

Respondents: ~200–500

Tasks per respondent: 8–30

Alternatives per task: 2–5

Estimation will run on the backend; front end just handles visuals and simulations.

Brute-force optimization may need guardrails:

Warn if total configurations exceed some threshold (e.g., 5,000–10,000).

If you give this spec to your implementation LLM, it has:

Clear data contracts

Clear modeling equations

UI flow

Explicit handling of None and competitor alternatives (your chosen Approaches A and B)

A clean separation between Python estimation and JS visualization/simulation.

If you want, next step I can generate:

Example dummy dataset + JSON metadata

Skeleton code structures:

Python /estimate handler

JS modules for simulation and visualization.