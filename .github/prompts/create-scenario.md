---
name: Create Marketing Analytics Scenario
description: Create a rich, realistic case study scenario for a statistical analysis tool with proper HTML formatting
---

# Create Marketing Analytics Scenario

Create a compelling, realistic case study scenario ("mini-case") for students to analyze using a statistical tool. This prompt guides both the **content creation** (storytelling, business context) and **technical implementation** (HTML structure, JavaScript patterns).

## 🎭 IMPORTANT: Switch to Content Creation Mode

**When creating scenario content, prioritize storytelling over brevity.** You are writing educational content that helps students understand real-world marketing analytics, not just filling in a template.

### Your Role as Content Creator

For scenario descriptions, adopt these principles:

✅ **DO:**
- Write like a marketing case study author, not a programmer
- Include rich, lived-in details that make the business feel real
- Provide specific numbers, contexts, and stakeholder perspectives
- Create scenarios students can mentally "step into"
- Explain WHY the analysis matters to the business
- Use complete sentences with natural, professional tone

❌ **DON'T:**
- Write terse, bullet-point-style descriptions
- Use placeholder text like "Company X wants to analyze Y"
- Skip the human element (who cares about this? why does it matter?)
- Rush through context to get to the variables
- Write generic scenarios that could apply to any business

### What Makes a Rich vs. Thin Scenario

**❌ THIN SCENARIO (Avoid):**
```
You are analyzing customer data. The company wants to know if 
email campaigns increase purchases. Variables: purchase (0/1), 
emails_received (count), customer_age (years).
```
**Problems:** Generic, no specific business, no stakeholders, no context, reads like a homework problem.

**✅ RICH SCENARIO (Aim for this):**
```
You're a marketing analyst at "Brew & Books," a regional chain of 
bookstore-cafés with 8 locations across the Pacific Northwest. The 
CMO, Sarah Chen, wants to evaluate whether the monthly email newsletter 
campaign is driving foot traffic and purchases, or just annoying 
customers. The company has been sending 2-4 emails per month for the 
past year to its loyalty program members (N=1,247 customers).

Sarah specifically mentioned during last week's meeting: "We're spending 
$3,000/month on email marketing tools and content creation. If we can't 
show a clear ROI, the CFO wants to cut it and reallocate to Instagram ads."

Your task is to determine whether customers who receive more emails are 
more likely to make a purchase in a given month, controlling for 
customer age (younger customers may respond differently to email vs. social).
```
**Why this works:** Specific business, named stakeholder, real stakes, clear decision to be made, organizational tension, realistic budget constraints.

---

## Content Guidelines for Rich Scenarios

### 1. Business Realism

**Include:**
- **Company name** (can be fictional but specific): "Alpine Ski Rentals", "TechStart Analytics", "Riverside Hospital"
- **Industry/sector**: E-commerce, B2B SaaS, healthcare, retail, etc.
- **Company size/scale**: Number of locations, employees, customers, annual revenue range
- **Geographic context** (if relevant): "5-state region", "nationwide", "Silicon Valley-based"

**Example:**
> "You're working with *Peak Performance Gym*, a mid-size fitness chain with 12 locations across Colorado and Utah (3,200 active members total)."

### 2. Named Stakeholders

**Include:**
- **Name and title**: "CMO Elena Rodriguez", "VP of Sales Mike Thompson"
- **Their specific question**: What they asked for and why
- **Stakes/pressure**: Budget constraints, competitive pressure, board questions

**Example:**
> "The VP of Operations, James Liu, called an emergency meeting last week after noticing that monthly churn has crept up from 4% to 6.5%. He needs to understand whether the new $89 premium tier pricing is driving cancellations, or if it's about class availability and trainer quality."

### 3. Decision Context

**Explain what decision this analysis will inform:**
- Budget allocation decisions
- Program continuation/cancellation
- Pricing strategy
- Resource allocation
- Strategic pivots

**Example:**
> "If the premium tier IS causing churn, the pricing committee meets next month and could roll back pricing or add more value. If it's about class availability, Operations will hire 3 new trainers for Q2 ($180K cost)."

### 4. Realistic Numbers and Details

**Include specific details:**
- Budget amounts: "$45K monthly ad spend", "$3,000/month for email platform"
- Sample sizes: "1,847 customers", "52 weeks of data", "200 daily transactions"
- Timeframes: "Last 6 months", "Q4 2025", "2-year period"
- Realistic scales: Don't use 10 customers or 1 million unless truly appropriate

**Example:**
> "You have 52 weeks of sales data from all 12 locations (N=624 location-weeks). Weekly ad spend ranges from $800 to $4,200 depending on local market conditions and seasonal promotions."

### 5. Variables with Marketing Context

Don't just list variables—explain WHY each matters to marketers:

**❌ Thin:**
```
Variables:
- sales: Weekly revenue
- ad_spend: Advertising cost
- promo: Promotion flag
```

**✅ Rich:**
```
The marketing team tracks three key metrics in their data warehouse:

- **weekly_sales**: Total revenue per location per week (in thousands). 
  This is the north-star metric that CFO reports to the board monthly.
  
- **ad_spend**: Local digital ad spend (Google Ads + Facebook) per location 
  per week (in thousands). Each location manager has autonomy to adjust 
  this weekly based on local events and competition.
  
- **promo_week**: Binary flag (1/0) indicating whether a system-wide 
  promotional campaign was running that week. Marketing runs these 4-6 
  times per year (Black Friday, back-to-school, etc.) and spends an 
  additional $25K on national TV spots during these weeks.
```

### 6. "What to Look For" - Analytical Guidance

Help students think like analysts by pointing out non-obvious patterns:

**Include:**
- Lag effects ("sales might respond 1-2 weeks AFTER ad spend")
- Interaction effects ("email might work better for younger customers")
- Confounding factors ("holiday weeks affect both sales and ad spend")
- Practical constraints ("coefficients < $1 mean campaigns aren't profitable")

**Example:**
```
💡 What to Look For:
- Diminishing returns: Does the 10th email have less impact than the 1st?
- Age interactions: Do younger customers (18-30) respond more to email?
- Threshold effects: Is there a minimum frequency needed before impact?
- Unsubscribe risk: Higher email frequency might increase short-term 
  purchases but cause long-term opt-outs (not in this data)
```

### 7. Analysis Questions - Specific and Actionable

Questions should:
- Use real numbers from the scenario
- Connect to specific business decisions
- Require interpretation, not just reading output

**❌ Generic:**
```
1. What is the effect of X on Y?
2. Is the relationship significant?
3. What is the R-squared?
```

**✅ Specific:**
```
1. If Sarah increases email frequency from 2 to 4 per month for a 
   30-year-old customer, what is the predicted change in purchase 
   probability? Is this economically meaningful given the $2.40 
   cost per additional email?

2. At what point does age moderate the email effect? Do we need 
   separate strategies for under-30 vs. over-50 customers?

3. Based on the model, what would you recommend to Sarah for next 
   quarter: maintain current 2-4 emails/month, increase to 6/month, 
   or reduce to 1/month? Defend your recommendation.
```

---

## Technical Implementation

Now switch to **programmer mode** for implementing the HTML/JS structure.

### ⚠️ CRITICAL: JavaScript Arrow Function Pattern

**ALWAYS use arrow functions** for the `description` property to avoid hoisting errors:

```javascript
// ✅ CORRECT - Arrow function delays execution
const SCENARIOS = [
  {
    id: 'scenario-1',
    label: 'Marketing Campaign ROI',
    description: () => generateCampaignScenario(),  // Arrow function!
    generate: generateCampaignData
  }
];

// ❌ WRONG - Executes immediately, causes hoisting error
const SCENARIOS = [
  {
    id: 'scenario-1',
    label: 'Marketing Campaign ROI',
    description: generateCampaignScenario(),  // Fails! Function not defined yet
    generate: generateCampaignData
  }
];
```

**Why:** When you call the function directly, it executes during array initialization before the HTML generator functions are defined. The arrow function wrapper delays execution until the scenario is selected.

**Usage:**
```javascript
select.addEventListener('change', () => {
  const selected = SCENARIOS.find(s => s.id === select.value);
  if (descEl && selected) {
    descEl.innerHTML = selected.description();  // Call the arrow function
  }
});
```

---

## HTML Template Structure

```html
<div class="scenario-description">
  <div class="scenario-header">
    <span class="scenario-icon">📊</span>
    <h4>Scenario Title - Company Name</h4>
    <span class="scenario-badge">52 Weeks | 1,247 Customers</span>
  </div>
  
  <p class="scenario-intro">
    2-3 sentences setting up the business, the stakeholder, and the 
    key question. Make this feel real and specific.
  </p>
  
  <div class="scenario-variables">
    <h5>📋 Variables</h5>
    <table class="scenario-var-table">
      <tr>
        <td><span class="var-tag outcome">dependent_var</span></td>
        <td>Description with units and business meaning</td>
      </tr>
      <tr>
        <td><span class="var-tag predictor">predictor_var</span></td>
        <td>Description with units and business meaning</td>
      </tr>
      <tr>
        <td><span class="var-tag binary">binary_var</span></td>
        <td>Description (1 = condition, 0 = baseline)</td>
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
        <strong>Company Size</strong>
        <span>12 Locations</span>
      </div>
      <div class="context-item">
        <strong>Time Period</strong>
        <span>18 Months</span>
      </div>
      <div class="context-item">
        <strong>Sample Size</strong>
        <span>N = 847</span>
      </div>
    </div>
  </div>
  
  <div class="scenario-insights">
    <h5>💡 What to Look For</h5>
    <ul>
      <li>Specific analytical consideration with context</li>
      <li>Potential interaction or confound to watch for</li>
      <li>Practical interpretation guidance</li>
    </ul>
  </div>
  
  <div class="scenario-tip">
    <strong>💡 Pro Tip:</strong> Actionable advice for using this scenario 
    effectively in the tool (e.g., "Try different lag structures" or 
    "Check for multicollinearity").
  </div>
  
  <div class="scenario-questions">
    <h5>❓ Analysis Questions</h5>
    <ol>
      <li>Specific question with numbers from the scenario</li>
      <li>Question requiring business interpretation</li>
      <li>Question connecting to a real decision</li>
    </ol>
  </div>
</div>
```

---

## Variable Tag Classes

Use the appropriate CSS class for each variable type:

| Class | Color | Use For |
|-------|-------|---------|
| `.var-tag.outcome` | Green | Dependent/outcome variables (Y) |
| `.var-tag.predictor` | Blue | Continuous predictor variables (X) |
| `.var-tag.binary` | Yellow | Binary/dummy variables (0/1) |
| `.var-tag.categorical` | Purple | Categorical variables (groups) |
| `.var-tag.time` | Teal | Time/date variables |

**Example:**
```html
<span class="var-tag outcome">conversion_rate</span>
<span class="var-tag predictor">ad_spend</span>
<span class="var-tag binary">email_subscriber</span>
<span class="var-tag categorical">customer_segment</span>
<span class="var-tag time">week_number</span>
```

---

## Icon Suggestions by Tool Type

| Tool Type | Header Icon | Alternative Icons |
|-----------|-------------|-------------------|
| Regression | 📈 | 📊, 💹 |
| Time Series | 📊 | 📉, ⏰ |
| Classification | 🎯 | 🔍, ✅ |
| Clustering | 🔮 | 🎲, 🧩 |
| A/B Testing | 🧪 | ⚗️, 🔬 |
| Hypothesis Testing | 📊 | 📈, 📉 |
| Attribution | 🎯 | 🔗, 📊 |

---

## Complete Example: Email Marketing Campaign

This example demonstrates RICH scenario content:

```javascript
function generateEmailCampaignScenario() {
  return `
    <div class="scenario-description">
      <div class="scenario-header">
        <span class="scenario-icon">📧</span>
        <h4>Email Campaign Effectiveness - Brew & Books</h4>
        <span class="scenario-badge">12 Months | 1,247 Customers</span>
      </div>
      
      <p class="scenario-intro">
        You're a marketing analyst at <strong>Brew & Books</strong>, a regional 
        chain of bookstore-cafés with 8 locations across the Pacific Northwest. 
        CMO Sarah Chen wants to evaluate whether the monthly email newsletter 
        campaign is driving purchases or just annoying customers. She mentioned 
        in last week's meeting: <em>"We're spending $3,000/month on email marketing. 
        If we can't show clear ROI, the CFO wants to cut it and reallocate to 
        Instagram ads."</em>
      </p>
      
      <div class="scenario-variables">
        <h5>📋 Variables</h5>
        <table class="scenario-var-table">
          <tr>
            <td><span class="var-tag outcome">purchased</span></td>
            <td>Whether customer made a purchase that month (1 = yes, 0 = no). 
            "Purchase" means any transaction ≥$5 (filters out free water customers).</td>
          </tr>
          <tr>
            <td><span class="var-tag predictor">emails_sent</span></td>
            <td>Number of marketing emails sent to customer that month (0-6). 
            Frequency varies by customer segment: loyalists get 4-6, casual 
            shoppers get 2-3, at-risk customers get 1.</td>
          </tr>
          <tr>
            <td><span class="var-tag predictor">customer_age</span></td>
            <td>Customer's age in years (18-72 in this dataset). Sarah suspects 
            younger customers prefer Instagram while older customers prefer email.</td>
          </tr>
        </table>
      </div>
      
      <div class="scenario-context">
        <h5>🎯 Business Context</h5>
        <div class="context-grid">
          <div class="context-item">
            <strong>Industry</strong>
            <span>Retail (Books/Café)</span>
          </div>
          <div class="context-item">
            <strong>Locations</strong>
            <span>8 Stores</span>
          </div>
          <div class="context-item">
            <strong>Time Period</strong>
            <span>Jan-Dec 2025</span>
          </div>
          <div class="context-item">
            <strong>Sample Size</strong>
            <span>N = 1,247</span>
          </div>
        </div>
      </div>
      
      <div class="scenario-insights">
        <h5>💡 What to Look For</h5>
        <ul>
          <li><strong>Diminishing returns:</strong> Does the 6th email have less 
          impact than the 1st? If so, the optimal frequency might be lower than 
          current practice.</li>
          <li><strong>Age interaction:</strong> Do younger customers (18-35) 
          respond less to email than older customers? This would support the 
          CFO's Instagram reallocation argument for that segment.</li>
          <li><strong>Economic significance:</strong> Even if statistically 
          significant, is the lift large enough to justify $3K/month? Average 
          purchase value is $24, and email platform costs $2.40 per customer 
          per month.</li>
        </ul>
      </div>
      
      <div class="scenario-tip">
        <strong>💡 Pro Tip:</strong> Consider adding an interaction term 
        (emails_sent × customer_age) to test whether email effectiveness 
        varies by age. If younger customers don't respond to email, you can 
        recommend a segmented strategy to Sarah.
      </div>
      
      <div class="scenario-questions">
        <h5>❓ Analysis Questions</h5>
        <ol>
          <li>If Sarah increases email frequency from 2 to 4 per month for a 
          35-year-old customer, what is the predicted change in purchase 
          probability? Is this economically meaningful given the $2.40/month 
          platform cost?</li>
          
          <li>Does the data support the CFO's hypothesis that younger customers 
          prefer Instagram? Look at the interaction term: is the email effect 
          weaker for customers under 30?</li>
          
          <li>Based on your model, what would you recommend to Sarah: maintain 
          current frequency (2-6 emails/month varying by segment), increase to 
          8/month uniformly, or reduce for younger customers and maintain for 
          older customers? Justify your recommendation with model outputs and 
          ROI estimates.</li>
        </ol>
      </div>
    </div>
  `;
}
```

**Why this example works:**
- ✅ Specific company with industry and scale
- ✅ Named stakeholder (Sarah Chen) with realistic pressure (CFO wants to cut budget)
- ✅ Concrete numbers ($3K/month, $24 average purchase, $2.40 platform cost)
- ✅ Variables explained with business context, not just statistical definition
- ✅ "What to Look For" includes analytical nuances (diminishing returns, interactions)
- ✅ Questions require interpretation and connect to real decisions
- ✅ Feels like a real business case, not a textbook problem

---

## Required CSS

Ensure the tool's stylesheet includes scenario styling. If not already present, add:

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
    white-space: nowrap;
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
    width: 180px;
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

---

## Implementation Checklist

### Content Creation Phase (Content Creator Mode)
- [ ] Research realistic business context for the analysis type
- [ ] Create a specific company name and industry
- [ ] Define a named stakeholder with realistic pressure/question
- [ ] Include concrete numbers (budget, sample size, timeframe)
- [ ] Write 2-3 sentence intro that sets up the scenario
- [ ] Explain each variable's business meaning, not just statistical definition
- [ ] Add "What to Look For" with analytical nuances
- [ ] Write specific, decision-oriented analysis questions
- [ ] Include realistic stakes (budget cuts, strategic decisions)

### Technical Implementation Phase (Programmer Mode)
- [ ] Create HTML generator function
- [ ] Wrap function in arrow function in SCENARIOS array
- [ ] Use correct `.var-tag` classes for each variable type
- [ ] Include scenario icon appropriate for tool type
- [ ] Add scenario badge with key stats (time period, sample size)
- [ ] Populate context grid with 3-4 key business facts
- [ ] Test arrow function pattern (no hoisting errors)
- [ ] Verify CSS classes are present in stylesheet
- [ ] Test scenario loads and displays correctly

### Quality Check
- [ ] Does scenario feel "lived in" and realistic?
- [ ] Would a student understand WHY this analysis matters?
- [ ] Are stakeholders and decisions clear?
- [ ] Do numbers make sense for the business scale?
- [ ] Do analysis questions require interpretation, not just reading output?
- [ ] Is the writing professional but approachable?
- [ ] No placeholder text or generic language?

---

## Common Pitfalls

### Content Pitfalls

**❌ Too generic:**
> "A company wants to analyze marketing effectiveness."

**✅ Specific:**
> "TechFlow Analytics (a B2B SaaS startup) wants their CMO to justify the $18K/month paid search budget to the board."

---

**❌ No human element:**
> "The analysis will determine if X affects Y."

**✅ Stakes and people:**
> "VP Sarah Chen needs this answer by Friday's budget meeting. If email ROI is positive, she'll ask for $50K more; if negative, the CFO will cut the program entirely."

---

**❌ Variables without context:**
> "Variables: sales, ads, promo"

**✅ Variables with business meaning:**
> "weekly_sales: This is the metric the CEO reviews every Monday morning and compares to last year."

### Technical Pitfalls

**❌ Hoisting error:**
```javascript
const SCENARIOS = [
  { description: generateHtml() }  // Executes too early!
];
```

**✅ Arrow function wrapper:**
```javascript
const SCENARIOS = [
  { description: () => generateHtml() }  // Delays execution
];
```

---

## Summary: The Two-Mode Approach

1. **Content Creation Mode** (70% of effort):
   - Think like a business case writer
   - Prioritize realism, detail, and storytelling
   - Include stakeholders, numbers, decisions, stakes
   - Write complete, natural sentences
   - Make scenarios students can mentally inhabit

2. **Technical Implementation Mode** (30% of effort):
   - Use arrow function pattern
   - Apply correct CSS classes
   - Structure HTML properly
   - Test for hoisting errors
   - Verify styling renders correctly

**Both modes matter.** Rich content in poor HTML is unusable. Perfect HTML with thin content teaches nothing.

---

**Reference:** Scenario template used across 25+ statistical tools (January 2026)
