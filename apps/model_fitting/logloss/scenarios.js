/**
 * Log-Loss Classification Lab - Marketing Scenarios
 * Each scenario loads from a fixed CSV file for consistent data (no jitter!)
 * 
 * Scenario 1: Email Conversion (Clear separation - easy to fit)
 * Scenario 2: Churn Prediction (Moderate overlap - more challenging)
 * Scenario 3: Ad Click Prediction (Noisy - teaches limits of single predictor)
 * Scenario 4: Subscription Upgrade (Categorical segments)
 */

const LOGLOSS_SCENARIOS = [
    {
        id: 'email-conversion',
        label: '📧 Email Conversion (Clear Separation)',
        csvPath: 'data/email_conversion.csv',
        xColumn: 'engagement_score',
        yColumn: 'converted',
        xLabel: 'Engagement Score',
        yLabel: 'Probability',
        outcomeLabels: ['Did Not Convert', 'Converted'],
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">📧</span>
                    <h4>Email Campaign Conversion - StyleBox Fashion</h4>
                    <span class="scenario-badge">N = 50 Subscribers | A/B Test</span>
                </div>
                
                <p class="scenario-intro">
                    You're the CRM analyst at <strong>StyleBox</strong>, a subscription fashion service. 
                    Marketing Director <em>Sarah Chen</em> wants to predict which email recipients will 
                    convert based on their engagement score. The data shows a <strong>clear pattern</strong>—
                    high engagement leads to high conversion.
                </p>
                
                <p>
                    Sarah noted: <em>"Subscribers with high engagement scores almost always convert. 
                    But where exactly is the tipping point? I need a model that tells me the probability 
                    of conversion at each engagement level so I can prioritize my outreach."</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag predictor">engagement_score</span></td>
                            <td>Composite score (0-100) based on email opens, clicks, and website visits.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag outcome">converted</span></td>
                            <td>Binary: 1 = purchased after email, 0 = did not purchase.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>Fashion E-commerce</span>
                    </div>
                    <div class="context-item">
                        <strong>Channel</strong>
                        <span>Email Marketing</span>
                    </div>
                    <div class="context-item">
                        <strong>Pattern</strong>
                        <span>Clear Separation</span>
                    </div>
                    <div class="context-item">
                        <strong>Difficulty</strong>
                        <span>Easy</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Decision boundary:</strong> Where does the probability cross 50%? 
                            This is your "tipping point" engagement score.</li>
                        <li><strong>Low log-loss achievable:</strong> Clear separation means you can get 
                            very low log-loss. Aim for under 0.30!</li>
                        <li><strong>Steep sigmoid:</strong> The transition from 0→1 should be sharp since 
                            the data separates cleanly.</li>
                    </ul>
                </div>
            </div>
        `
    },
    {
        id: 'churn-prediction',
        label: '📉 Churn Prediction (Moderate Overlap)',
        csvPath: 'data/churn_prediction.csv',
        xColumn: 'days_since_login',
        yColumn: 'churned',
        xLabel: 'Days Since Last Login',
        yLabel: 'Probability',
        outcomeLabels: ['Retained', 'Churned'],
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">📉</span>
                    <h4>Customer Churn Analysis - StreamFlix</h4>
                    <span class="scenario-badge">N = 60 Customers | Cohort Study</span>
                </div>
                
                <p class="scenario-intro">
                    You're the retention analyst at <strong>StreamFlix</strong>, a streaming service. 
                    VP of Customer Success <em>Marcus Johnson</em> needs to predict which customers will 
                    churn based on days since their last login. The pattern is clear but 
                    <strong>not perfect</strong>—some inactive users stay, some active users leave.
                </p>
                
                <p>
                    Marcus explained: <em>"Customers who haven't logged in for months are more likely to 
                    cancel. But it's not a perfect rule—some come back, some power users cancel anyway. 
                    I need probabilities, not just a simple threshold."</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag predictor">days_since_login</span></td>
                            <td>Number of days since the customer last accessed the platform (0-180).</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag outcome">churned</span></td>
                            <td>Binary: 1 = cancelled subscription, 0 = still active.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>Streaming Media</span>
                    </div>
                    <div class="context-item">
                        <strong>Metric</strong>
                        <span>Retention</span>
                    </div>
                    <div class="context-item">
                        <strong>Pattern</strong>
                        <span>Moderate Overlap</span>
                    </div>
                    <div class="context-item">
                        <strong>Difficulty</strong>
                        <span>Medium</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Imperfect separation:</strong> You'll see 0s and 1s mixed in the middle 
                            range. This is realistic—not all data is clean!</li>
                        <li><strong>Accuracy vs. log-loss:</strong> You might get 75% accuracy but 
                            still have room to improve log-loss through better probability calibration.</li>
                        <li><strong>Practical threshold:</strong> Where would you intervene? 60 days? 90 days?</li>
                    </ul>
                </div>
            </div>
        `
    },
    {
        id: 'ad-click',
        label: '🖱️ Ad Click Prediction (Weak Signal)',
        csvPath: 'data/ad_click.csv',
        xColumn: 'position_score',
        yColumn: 'clicked',
        xLabel: 'Position Score (1-10)',
        yLabel: 'Probability',
        outcomeLabels: ['No Click', 'Clicked'],
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">🖱️</span>
                    <h4>Display Ad Click-Through - TechDeals</h4>
                    <span class="scenario-badge">N = 80 Impressions | Real-Time Bidding</span>
                </div>
                
                <p class="scenario-intro">
                    You're the programmatic analyst at <strong>TechDeals</strong>, an electronics retailer. 
                    Media buyer <em>Alex Rivera</em> wants to predict click probability based on ad position 
                    score. The signal is <strong>weak and noisy</strong>—position helps, but many other 
                    factors influence clicks.
                </p>
                
                <p>
                    Alex noted: <em>"Better positions get more clicks, but it's not dramatic. Some great 
                    positions get ignored, some poor positions still convert. I want to know: is this 
                    predictor even worth using? What's the best we can do with just position?"</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag predictor">position_score</span></td>
                            <td>Ad placement quality score (1-10, higher = better position).</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag outcome">clicked</span></td>
                            <td>Binary: 1 = user clicked ad, 0 = no click.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>Digital Advertising</span>
                    </div>
                    <div class="context-item">
                        <strong>Channel</strong>
                        <span>Display/RTB</span>
                    </div>
                    <div class="context-item">
                        <strong>Pattern</strong>
                        <span>Weak Signal</span>
                    </div>
                    <div class="context-item">
                        <strong>Difficulty</strong>
                        <span>Hard</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>High log-loss floor:</strong> Even optimal fits will have log-loss > 0.60. 
                            The predictor just isn't that powerful!</li>
                        <li><strong>Flat sigmoid:</strong> Expect a gentle slope (low B₁) because the 
                            relationship is weak.</li>
                        <li><strong>Reality check:</strong> Sometimes single predictors aren't enough. 
                            This teaches when to seek additional features.</li>
                    </ul>
                </div>
            </div>
        `
    },
    {
        id: 'subscription-upgrade',
        label: '⬆️ Subscription Upgrade (Categorical)',
        csvPath: 'data/subscription_upgrade.csv',
        xColumn: 'account_age_months',
        yColumn: 'upgraded',
        categoryColumn: 'current_plan',
        xLabel: 'Account Age (Months)',
        yLabel: 'Probability',
        outcomeLabels: ['Did Not Upgrade', 'Upgraded'],
        hasCategorical: true,
        categoryLabels: ['Free Tier', 'Basic Plan', 'Pro Plan'],
        categoryColors: ['#ef4444', '#22c55e', '#3b82f6'],
        categorySymbols: ['circle', 'square', 'diamond'],
        paramRanges: {
            B0: { min: -8, max: 4, step: 0.1 },
            B1: { min: -0.1, max: 0.3, step: 0.01 },
            B_cat: { min: -3, max: 5, step: 0.1 }
        },
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">⬆️</span>
                    <h4>Premium Upgrade Prediction - CloudTools SaaS</h4>
                    <span class="scenario-badge">N = 120 Accounts | Cohort Analysis</span>
                </div>
                
                <p class="scenario-intro">
                    You're the growth analyst at <strong>CloudTools</strong>, a B2B SaaS platform. 
                    Head of Product <em>Dana Wright</em> wants to predict which users will upgrade to 
                    Premium based on account age AND their current plan tier. The data shows 
                    <strong>different baseline upgrade rates</strong> for Free, Basic, and Pro users.
                </p>
                
                <p>
                    Dana observed: <em>"Pro users upgrade at much higher rates than Free users, even 
                    controlling for how long they've been with us. But account tenure still matters—
                    the longer someone's been a customer, the more likely they are to upgrade. 
                    I need a model that captures BOTH effects."</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag predictor">account_age_months</span></td>
                            <td>Months since account creation (1-36 months).</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag categorical">current_plan</span></td>
                            <td>Plan tier: Free (reference), Basic, or Pro.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag outcome">upgraded</span></td>
                            <td>Binary: 1 = upgraded to Premium, 0 = did not upgrade.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>B2B SaaS</span>
                    </div>
                    <div class="context-item">
                        <strong>Metric</strong>
                        <span>Expansion Revenue</span>
                    </div>
                    <div class="context-item">
                        <strong>Pattern</strong>
                        <span>Segment Differences</span>
                    </div>
                    <div class="context-item">
                        <strong>Features</strong>
                        <span>Continuous + Categorical</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Three parallel S-curves:</strong> Each plan tier has the same slope 
                            but different "starting points" (intercepts).</li>
                        <li><strong>Segment lift:</strong> If B₂ (Basic shift) = 1.2, Basic users have 
                            1.2 higher log-odds than Free users at any tenure.</li>
                        <li><strong>Dramatic improvement:</strong> Adding categorical predictors should 
                            substantially reduce log-loss compared to ignoring segments.</li>
                    </ul>
                </div>
            </div>
        `
    }
];

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LOGLOSS_SCENARIOS;
}
