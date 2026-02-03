/**
 * Decision Tree Classifier - Marketing Scenarios
 * Rich case studies following the create-scenario.md guidelines
 */

const DECISION_TREE_SCENARIOS = [
    {
        id: 'customer-churn',
        label: '🔄 Customer Churn Prediction',
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">🔄</span>
                    <h4>Customer Churn Prediction - FitLife Gym</h4>
                    <span class="scenario-badge">N = 3,500 | Binary</span>
                </div>
                
                <p class="scenario-intro">
                    You're the retention marketing analyst at <strong>FitLife Gym</strong>, a regional fitness chain 
                    with 12 locations and 3,200 active members across the Midwest. VP of Member Services, 
                    <em>Marcus Chen</em>, is concerned about rising churn rates—currently at 6.2% monthly, 
                    up from 4.8% last year. He's asked you to build a predictive model to identify 
                    at-risk members <em>before</em> they cancel, enabling targeted retention offers.
                </p>
                
                <p>
                    Marcus mentioned in your kickoff meeting: <em>"We're spending $45 per new member acquisition. 
                    If we can save even 20% of churners with a $15 retention offer, the math works out beautifully. 
                    But we can't afford to offer discounts to everyone."</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag outcome">churned</span></td>
                            <td>Whether the member cancelled within 30 days (1 = Churned, 0 = Stayed). 
                                This is your target variable to predict.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag predictor">months_member</span></td>
                            <td>How long the member has been active (1-48 months). New members 
                                (< 6 months) tend to have higher churn risk.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag predictor">visits_per_month</span></td>
                            <td>Average gym visits per month over the last 3 months (0-30). 
                                Engagement is a leading indicator of retention.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag categorical">contract_type</span></td>
                            <td>Membership contract: "Month-to-Month", "Annual", or "Two-Year". 
                                Month-to-month members can cancel anytime without penalty.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag predictor">age</span></td>
                            <td>Member's age in years (18-72). Different age groups may have 
                                different commitment patterns.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>Fitness/Wellness</span>
                    </div>
                    <div class="context-item">
                        <strong>Locations</strong>
                        <span>12 Gyms</span>
                    </div>
                    <div class="context-item">
                        <strong>Time Period</strong>
                        <span>Last 6 Months</span>
                    </div>
                    <div class="context-item">
                        <strong>Churn Rate</strong>
                        <span>6.2% Monthly</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Visit frequency threshold:</strong> Is there a "magic number" of visits/month 
                            below which churn risk spikes? This could define your intervention trigger.</li>
                        <li><strong>Contract type effect:</strong> Month-to-month members likely have higher 
                            baseline churn—but are they worth saving, or should you focus on annual members?</li>
                        <li><strong>Tenure interaction:</strong> New members (< 6 months) might churn for 
                            different reasons than long-term members who suddenly disengage.</li>
                    </ul>
                </div>
                
                <div class="scenario-questions">
                    <h5>❓ Analysis Questions</h5>
                    <ol>
                        <li>What combination of tenure and visit frequency best identifies high-risk members? 
                            At what thresholds would you trigger an intervention?</li>
                        <li>Should FitLife offer the same retention strategy to month-to-month vs. annual members, 
                            or does the tree suggest different risk profiles?</li>
                        <li>If Marcus can only afford to contact 200 members/month with retention offers, 
                            which leaf nodes would you prioritize?</li>
                    </ol>
                </div>
            </div>
        `,
        dataset: 'scenarios/churn_data.csv',
        outcomeVariable: 'churned',
        outcomeClasses: ['Stayed', 'Churned'],
        predictors: ['months_member', 'visits_per_month', 'contract_type', 'age'],
        featureTypes: {
            months_member: 'continuous',
            visits_per_month: 'continuous',
            contract_type: 'categorical',
            age: 'continuous'
        }
    },
    {
        id: 'lead-scoring',
        label: '📧 B2B Lead Scoring',
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">📧</span>
                    <h4>B2B Lead Scoring - CloudSync SaaS</h4>
                    <span class="scenario-badge">N = 4,000 | Binary</span>
                </div>
                
                <p class="scenario-intro">
                    You're supporting the sales team at <strong>CloudSync</strong>, a B2B SaaS company selling 
                    cloud storage solutions to small and mid-size businesses. Head of Sales, <em>Jennifer Park</em>, 
                    has a team of 8 SDRs who are overwhelmed with inbound leads from the website. She needs 
                    a way to prioritize which leads to call first.
                </p>
                
                <p>
                    Jennifer explained the challenge: <em>"We're getting 400 leads per week, but my team can only 
                    meaningfully engage with about 150. Right now they're just working top-to-bottom by signup date. 
                    I know we're missing hot prospects while chasing tire-kickers."</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag outcome">converted</span></td>
                            <td>Whether the lead converted to a paid customer within 60 days 
                                (1 = Converted, 0 = Did Not Convert).</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag predictor">website_visits</span></td>
                            <td>Number of website visits before signup (1-50). More visits may 
                                indicate higher intent or more research needed.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag predictor">email_opens</span></td>
                            <td>Number of marketing emails opened in first 2 weeks (0-12). 
                                Engagement with nurture content signals interest.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag categorical">company_size</span></td>
                            <td>Self-reported company size: "Small" (1-50 employees), 
                                "Medium" (51-200), or "Enterprise" (201+).</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag predictor">days_since_signup</span></td>
                            <td>Days between signup and current date (1-60). Lead freshness 
                                often correlates with responsiveness.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>B2B SaaS</span>
                    </div>
                    <div class="context-item">
                        <strong>Team Size</strong>
                        <span>8 SDRs</span>
                    </div>
                    <div class="context-item">
                        <strong>Weekly Leads</strong>
                        <span>~400</span>
                    </div>
                    <div class="context-item">
                        <strong>Conversion Rate</strong>
                        <span>12% Overall</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Engagement thresholds:</strong> Is there an email open count that separates 
                            "warm" from "cold" leads? Jennifer could use this to auto-route leads.</li>
                        <li><strong>Company size value:</strong> Enterprise leads may convert at higher rates 
                            but require more touches—is the tree capturing this?</li>
                        <li><strong>Lead decay:</strong> How quickly do leads go "stale"? If days_since_signup 
                            appears high in the tree, speed-to-contact matters.</li>
                    </ul>
                </div>
                
                <div class="scenario-questions">
                    <h5>❓ Analysis Questions</h5>
                    <ol>
                        <li>Define a "Hot Lead" rule based on the tree. Which combination of features 
                            gives the highest conversion probability?</li>
                        <li>Jennifer wants to create three buckets: Hot (call immediately), Warm (call within 48h), 
                            Cold (nurture via email only). How would you map tree leaves to these buckets?</li>
                        <li>The tree shows company_size matters—but is the pattern that bigger = better, 
                            or is there a sweet spot in the middle?</li>
                    </ol>
                </div>
            </div>
        `,
        dataset: 'scenarios/lead_scoring_data.csv',
        outcomeVariable: 'converted',
        outcomeClasses: ['No', 'Yes'],
        predictors: ['website_visits', 'email_opens', 'company_size', 'days_since_signup'],
        featureTypes: {
            website_visits: 'continuous',
            email_opens: 'continuous',
            company_size: 'categorical',
            days_since_signup: 'continuous'
        }
    },
    {
        id: 'customer-segment',
        label: '🎯 Customer Segment Classification',
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">🎯</span>
                    <h4>Customer Segment Classification - Artisan Coffee Co</h4>
                    <span class="scenario-badge">N = 4,500 | 3-Class</span>
                </div>
                
                <p class="scenario-intro">
                    You're the data analyst for <strong>Artisan Coffee Co</strong>, a direct-to-consumer 
                    specialty coffee subscription service with 15,000 active customers. CMO <em>David Rodriguez</em> 
                    wants to implement personalized marketing, but first needs to classify customers into 
                    value tiers: <strong>Premium</strong>, <strong>Standard</strong>, and <strong>Budget</strong>.
                </p>
                
                <p>
                    David's vision: <em>"Premium customers get white-glove service and early access to limited roasts. 
                    Standard customers get our regular nurture campaigns. Budget customers get discount-focused 
                    messaging. But I can't just use purchase history—I need to predict which tier a NEW customer 
                    will fall into based on their early behavior."</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag outcome">segment</span></td>
                            <td>Customer value segment after 6 months: "Premium" (top 20% LTV), 
                                "Standard" (middle 50%), or "Budget" (bottom 30%).</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag predictor">first_order_value</span></td>
                            <td>Dollar amount of customer's first order ($15-$150). 
                                May signal price sensitivity and quality expectations.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag predictor">orders_first_90_days</span></td>
                            <td>Number of orders placed in first 90 days (1-12). 
                                Early purchase frequency predicts long-term behavior.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag categorical">subscription_status</span></td>
                            <td>Whether customer enrolled in subscription: "Subscriber" or "One-Time". 
                                Subscribers have 3x higher retention.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag predictor">referral_count</span></td>
                            <td>Number of friends referred in first 90 days (0-5). 
                                Referrers tend to be brand advocates with high engagement.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>DTC Subscription</span>
                    </div>
                    <div class="context-item">
                        <strong>Customers</strong>
                        <span>15,000 Active</span>
                    </div>
                    <div class="context-item">
                        <strong>Avg Order</strong>
                        <span>$42</span>
                    </div>
                    <div class="context-item">
                        <strong>Classes</strong>
                        <span>3 Segments</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Premium predictors:</strong> What early signals identify customers who will 
                            become Premium? High first order + subscription is likely, but are there surprises?</li>
                        <li><strong>Budget vs Standard:</strong> These two segments may be harder to distinguish. 
                            Look at which features best separate them.</li>
                        <li><strong>Referral signal:</strong> Customers who refer friends are invested in the brand—
                            does this strongly predict Premium status?</li>
                        <li><strong>Confusion patterns:</strong> Which segments get confused most often? 
                            Standard↔Budget or Standard↔Premium?</li>
                    </ul>
                </div>
                
                <div class="scenario-questions">
                    <h5>❓ Analysis Questions</h5>
                    <ol>
                        <li>What's the simplest rule to identify Premium customers with high confidence? 
                            David wants a "Premium fast-track" trigger for the welcome sequence.</li>
                        <li>For customers predicted as Standard, what additional action (referral program, 
                            subscription upsell) might move them toward Premium?</li>
                        <li>The model makes mistakes—which misclassification is most costly? 
                            (Treating a Premium as Budget? Or Budget as Premium?) How would you adjust?</li>
                    </ol>
                </div>
            </div>
        `,
        dataset: 'scenarios/customer_segment_data.csv',
        outcomeVariable: 'segment',
        outcomeClasses: ['Budget', 'Standard', 'Premium'],
        predictors: ['first_order_value', 'orders_first_90_days', 'subscription_status', 'referral_count'],
        featureTypes: {
            first_order_value: 'continuous',
            orders_first_90_days: 'continuous',
            subscription_status: 'categorical',
            referral_count: 'continuous'
        }
    }
];

/**
 * Generate synthetic data for scenarios
 */
function generateChurnData(n = 3500) {
    const data = [];
    const contractTypes = ['Month-to-Month', 'Annual', 'Two-Year'];
    
    for (let i = 0; i < n; i++) {
        const months_member = Math.floor(Math.random() * 47) + 1;
        const contract_type = contractTypes[Math.floor(Math.random() * 3)];
        const age = Math.floor(Math.random() * 54) + 18;
        
        // Base visits - higher for longer members, with some randomness
        let visits_per_month = Math.min(30, Math.max(0, 
            8 + (months_member / 10) + (Math.random() * 10 - 5)
        ));
        
        // Churn probability model
        let churnProb = 0.15; // Base rate
        
        // New members churn more
        if (months_member < 6) churnProb += 0.25;
        else if (months_member < 12) churnProb += 0.10;
        
        // Low visits = high churn
        if (visits_per_month < 4) churnProb += 0.35;
        else if (visits_per_month < 8) churnProb += 0.15;
        else if (visits_per_month > 15) churnProb -= 0.10;
        
        // Contract type effect
        if (contract_type === 'Month-to-Month') churnProb += 0.20;
        else if (contract_type === 'Two-Year') churnProb -= 0.15;
        
        // Age effect (younger slightly more likely to churn)
        if (age < 30) churnProb += 0.05;
        
        // Clamp and add noise
        churnProb = Math.max(0.02, Math.min(0.85, churnProb));
        const churned = Math.random() < churnProb ? 'Churned' : 'Stayed';
        
        data.push({
            months_member: Math.round(months_member),
            visits_per_month: Math.round(visits_per_month * 10) / 10,
            contract_type,
            age,
            churned
        });
    }
    
    return data;
}

function generateLeadScoringData(n = 4000) {
    const data = [];
    const companySizes = ['Small', 'Medium', 'Enterprise'];
    
    for (let i = 0; i < n; i++) {
        const website_visits = Math.floor(Math.random() * 49) + 1;
        const email_opens = Math.floor(Math.random() * 13);
        const company_size = companySizes[Math.floor(Math.random() * 3)];
        const days_since_signup = Math.floor(Math.random() * 59) + 1;
        
        // Conversion probability model
        let convProb = 0.08; // Base rate
        
        // Website engagement
        if (website_visits > 20) convProb += 0.15;
        else if (website_visits > 10) convProb += 0.08;
        
        // Email engagement (strong signal)
        if (email_opens > 6) convProb += 0.25;
        else if (email_opens > 3) convProb += 0.12;
        else if (email_opens === 0) convProb -= 0.05;
        
        // Company size
        if (company_size === 'Enterprise') convProb += 0.10;
        else if (company_size === 'Medium') convProb += 0.05;
        
        // Lead freshness
        if (days_since_signup < 7) convProb += 0.10;
        else if (days_since_signup > 30) convProb -= 0.08;
        
        convProb = Math.max(0.02, Math.min(0.75, convProb));
        const converted = Math.random() < convProb ? 'Yes' : 'No';
        
        data.push({
            website_visits,
            email_opens,
            company_size,
            days_since_signup,
            converted
        });
    }
    
    return data;
}

function generateCustomerSegmentData(n = 4500) {
    const data = [];
    const subscriptionStatuses = ['Subscriber', 'One-Time'];
    
    for (let i = 0; i < n; i++) {
        const first_order_value = Math.round((Math.random() * 135 + 15) * 100) / 100;
        const orders_first_90_days = Math.floor(Math.random() * 11) + 1;
        const subscription_status = subscriptionStatuses[Math.floor(Math.random() * 2)];
        const referral_count = Math.floor(Math.random() * 6);
        
        // Segment scoring
        let score = 0;
        
        // First order value (strong predictor)
        if (first_order_value > 80) score += 3;
        else if (first_order_value > 50) score += 1.5;
        else if (first_order_value < 30) score -= 1;
        
        // Order frequency
        if (orders_first_90_days > 6) score += 2.5;
        else if (orders_first_90_days > 3) score += 1;
        else if (orders_first_90_days === 1) score -= 1;
        
        // Subscription (strong predictor)
        if (subscription_status === 'Subscriber') score += 2;
        
        // Referrals
        if (referral_count > 2) score += 2;
        else if (referral_count > 0) score += 0.5;
        
        // Add noise
        score += (Math.random() - 0.5) * 2;
        
        // Map to segments
        let segment;
        if (score > 5) segment = 'Premium';
        else if (score > 1) segment = 'Standard';
        else segment = 'Budget';
        
        data.push({
            first_order_value,
            orders_first_90_days,
            subscription_status,
            referral_count,
            segment
        });
    }
    
    return data;
}

/**
 * Convert data array to CSV string
 */
function dataToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = [headers.join(',')];
    
    data.forEach(row => {
        const values = headers.map(h => {
            const val = row[h];
            // Quote strings with commas or spaces
            if (typeof val === 'string' && (val.includes(',') || val.includes(' '))) {
                return `"${val}"`;
            }
            return val;
        });
        rows.push(values.join(','));
    });
    
    return rows.join('\n');
}

/**
 * Get scenario by ID
 */
function getScenarioById(id) {
    return DECISION_TREE_SCENARIOS.find(s => s.id === id);
}

/**
 * Generate data for a scenario
 */
function generateScenarioData(scenarioId) {
    switch (scenarioId) {
        case 'customer-churn':
            return generateChurnData();
        case 'lead-scoring':
            return generateLeadScoringData();
        case 'customer-segment':
            return generateCustomerSegmentData();
        default:
            return null;
    }
}

// Export
window.DECISION_TREE_SCENARIOS = DECISION_TREE_SCENARIOS;
window.getScenarioById = getScenarioById;
window.generateScenarioData = generateScenarioData;
window.dataToCSV = dataToCSV;
