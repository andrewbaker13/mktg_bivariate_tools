/**
 * MAE Model Calibration Lab - Marketing Scenarios
 * Each scenario has DISTINCTLY DIFFERENT data patterns for pedagogical variety
 * 
 * Scenario 1: Nearly Linear (linear model works well)
 * Scenario 2: Strong Diminishing Returns (quadratic clearly wins)
 * Scenario 3: Noisy with Visible Peak (neither model perfect, teaches uncertainty)
 */

const MAE_SCENARIOS = [
    {
        id: 'search-ads',
        label: '🔍 Search Ads (Nearly Linear)',
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">🔍</span>
                    <h4>Search Ad Campaign ROI - TechGear Direct</h4>
                    <span class="scenario-badge">N = 25 Weeks | Clean Data</span>
                </div>
                
                <p class="scenario-intro">
                    You're the digital marketing analyst at <strong>TechGear Direct</strong>, an online electronics 
                    retailer. Marketing Director <em>Rachel Torres</em> wants to understand the relationship between 
                    Google Ads spending and weekly revenue. Early analysis suggests the relationship is 
                    <strong>fairly consistent</strong>—each additional dollar appears to generate similar returns.
                </p>
                
                <p>
                    Rachel noted: <em>"Our search ads seem to perform predictably. I don't think we're hitting any 
                    ceiling yet within our current budget range. Can you confirm whether a simple linear model 
                    captures the relationship, or if there's hidden curvature?"</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag predictor">ad_spending</span></td>
                            <td>Weekly Google Ads spend ($200-$900). TechGear's typical operating range.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag outcome">revenue</span></td>
                            <td>Weekly revenue attributed to search ads. The business outcome to predict.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>E-commerce</span>
                    </div>
                    <div class="context-item">
                        <strong>Channel</strong>
                        <span>Google Ads</span>
                    </div>
                    <div class="context-item">
                        <strong>Pattern</strong>
                        <span>Nearly Linear</span>
                    </div>
                    <div class="context-item">
                        <strong>Noise Level</strong>
                        <span>Moderate</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Model comparison:</strong> Does the quadratic model meaningfully outperform 
                            linear, or just add complexity? Compare the MAEs carefully.</li>
                        <li><strong>Parsimony principle:</strong> If both models have similar MAE, prefer the 
                            simpler linear model (fewer parameters to estimate).</li>
                        <li><strong>ROI interpretation:</strong> If B₁ ≈ 0.40-0.50 in linear, each $1 spent 
                            yields ~$0.40-0.50 in attributed revenue.</li>
                    </ul>
                </div>
            </div>
        `,
        xLabel: 'Ad Spending ($)',
        yLabel: 'Revenue ($)',
        generateData: () => {
            // NEARLY LINEAR: Very mild curvature, linear model should work almost as well
            // True relationship: y ≈ 45 + 0.43x - 0.00004x² (barely curved)
            // R² for linear will be close to R² for quadratic
            const data = [];
            const n = 25;
            
            // Spread points across the range with some randomness
            for (let i = 0; i < n; i++) {
                const xBase = 200 + (700 * i / (n - 1));
                const x = xBase + (Math.random() - 0.5) * 60;
                
                // Very mild curvature - almost linear
                const yTrue = 45 + 0.43 * x - 0.00004 * Math.pow(x, 2);
                const noise = (Math.random() - 0.5) * 55; // Moderate noise
                const y = Math.max(80, yTrue + noise);
                
                data.push({ x: Math.round(x), y: Math.round(y) });
            }
            
            // Return as arrays
            const sorted = data.sort((a, b) => a.x - b.x);
            return {
                x: sorted.map(d => d.x),
                y: sorted.map(d => d.y)
            };
        }
    },
    {
        id: 'email-frequency',
        label: '📧 Email Frequency (Clear Diminishing Returns)',
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">📧</span>
                    <h4>Email Frequency Optimization - StyleBox Subscription</h4>
                    <span class="scenario-badge">N = 20 Test Cells | A/B Test</span>
                </div>
                
                <p class="scenario-intro">
                    You're the CRM analyst at <strong>StyleBox</strong>, a subscription fashion service. 
                    Email Marketing Manager <em>David Kim</em> ran a controlled experiment varying email frequency. 
                    The results show <strong>clear diminishing returns</strong>—early emails boost revenue significantly, 
                    but additional emails yield progressively smaller (and eventually negative) returns.
                </p>
                
                <p>
                    David observed: <em>"Look at this pattern! Customers who got 10-12 emails spent the most. 
                    But the ones who got 18+ emails? Their spending actually dropped—email fatigue is real. 
                    I need you to quantify exactly where the sweet spot is."</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag predictor">emails_per_month</span></td>
                            <td>Number of marketing emails sent (2-20 per month). Test cells received 
                                fixed frequencies throughout the experiment.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag outcome">monthly_spend</span></td>
                            <td>Average monthly spend per subscriber in that test cell. Higher = better.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>Subscription Retail</span>
                    </div>
                    <div class="context-item">
                        <strong>Test Type</strong>
                        <span>Controlled A/B</span>
                    </div>
                    <div class="context-item">
                        <strong>Pattern</strong>
                        <span>Strong Curve</span>
                    </div>
                    <div class="context-item">
                        <strong>Noise Level</strong>
                        <span>Low-Moderate</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Quadratic advantage:</strong> The quadratic model should clearly win here. 
                            Linear cannot capture the peak—it will systematically over-predict at extremes.</li>
                        <li><strong>Optimal frequency:</strong> Use the formula x* = -B₁/(2×B₂) to calculate 
                            the mathematically optimal email frequency from your quadratic coefficients.</li>
                        <li><strong>Negative B₂:</strong> This confirms diminishing returns—the curve opens 
                            downward, meaning there's a true maximum.</li>
                    </ul>
                </div>
            </div>
        `,
        xLabel: 'Emails per Month',
        yLabel: 'Monthly Spend ($)',
        generateData: () => {
            // STRONG DIMINISHING RETURNS: Quadratic clearly outperforms linear
            // True relationship: y = 85 + 18x - 0.8x² (peak around x = 11.25)
            // Linear will have noticeably higher MAE
            const data = [];
            const n = 20;
            
            for (let i = 0; i < n; i++) {
                const x = 2 + Math.random() * 18; // 2-20 emails
                
                // Strong curvature with clear peak around 11 emails
                const yTrue = 85 + 18 * x - 0.8 * Math.pow(x, 2);
                const noise = (Math.random() - 0.5) * 20; // Lower noise to show curve clearly
                const y = Math.max(50, yTrue + noise);
                
                data.push({ x: Math.round(x * 10) / 10, y: Math.round(y) });
            }
            
            const sorted = data.sort((a, b) => a.x - b.x);
            return {
                x: sorted.map(d => d.x),
                y: sorted.map(d => d.y)
            };
        }
    },
    {
        id: 'influencer-spend',
        label: '📱 Influencer Marketing (Noisy with Peak)',
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">📱</span>
                    <h4>Influencer Campaign Performance - GlowUp Cosmetics</h4>
                    <span class="scenario-badge">N = 35 Campaigns | High Variance</span>
                </div>
                
                <p class="scenario-intro">
                    You're a marketing analyst at <strong>GlowUp Cosmetics</strong>, a DTC beauty brand. 
                    CMO <em>Priya Sharma</em> has collected data from 35 influencer campaigns. The data is 
                    <strong>much noisier</strong> than other channels—influencer performance is unpredictable. 
                    However, there's evidence of an <strong>optimal spending level</strong> beyond which 
                    returns actually decline (mega-influencer fatigue).
                </p>
                
                <p>
                    Priya warned: <em>"Don't expect a clean fit here. Influencer marketing is chaotic—some $3K 
                    micro-influencers outperform $15K celebrities. But I suspect there's still a pattern 
                    underneath the noise. Can you find where our optimal spend level is, even approximately?"</em>
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag predictor">influencer_spend</span></td>
                            <td>Total payment for the campaign ($10K-$90K). Includes content creation, 
                                usage rights, and platform fees.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag outcome">campaign_revenue</span></td>
                            <td>Revenue attributed to the campaign via tracking ($K). Measured within 
                                14 days of content posting.</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>Beauty / DTC</span>
                    </div>
                    <div class="context-item">
                        <strong>Platform</strong>
                        <span>Instagram</span>
                    </div>
                    <div class="context-item">
                        <strong>Pattern</strong>
                        <span>Peak with Decline</span>
                    </div>
                    <div class="context-item">
                        <strong>Noise Level</strong>
                        <span>High</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Neither model fits perfectly:</strong> High noise means even the "best" 
                            model will have substantial MAE. That's realistic—embrace the uncertainty.</li>
                        <li><strong>Visible peak:</strong> Despite the noise, you should see that very high 
                            spending ($70K+) actually produces lower returns than moderate spending.</li>
                        <li><strong>Practical recommendations:</strong> Even with imperfect fit, can you 
                            recommend a spending range that avoids obvious over-investment?</li>
                    </ul>
                </div>
            </div>
        `,
        xLabel: 'Influencer Spend ($K)',
        yLabel: 'Campaign Revenue ($K)',
        generateData: () => {
            // NOISY WITH VISIBLE PEAK: Neither model fits great, teaches uncertainty
            // True relationship: y = 15 + 2.8x - 0.025x² (peak around x = 56)
            // High variance means both models have decent but not great fit
            const data = [];
            const n = 35;
            
            for (let i = 0; i < n; i++) {
                const x = 10 + Math.random() * 80; // $10K - $90K
                
                // Clear peak around $56K, with actual decline after
                const yTrue = 15 + 2.8 * x - 0.025 * Math.pow(x, 2);
                const noise = (Math.random() - 0.5) * 40; // HIGH noise
                const y = Math.max(20, yTrue + noise);
                
                data.push({ x: Math.round(x), y: Math.round(y) });
            }
            
            const sorted = data.sort((a, b) => a.x - b.x);
            return {
                x: sorted.map(d => d.x),
                y: sorted.map(d => d.y)
            };
        }
    }
];

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MAE_SCENARIOS };
}
