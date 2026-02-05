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
        // Custom parameter ranges (quadratic term needs a much larger scale)
        paramRanges: {
            B0: { min: 0, max: 200, step: 1 },
            B1: { min: 0, max: 30, step: 0.1 },
            B2_quad: { min: -2.0, max: 0.5, step: 0.01 }
        },
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
        // Custom parameter ranges (x is in $K, quadratic term is larger)
        paramRanges: {
            B0: { min: -20, max: 80, step: 1 },
            B1: { min: 0, max: 8, step: 0.1 },
            B2_quad: { min: -0.08, max: 0.02, step: 0.001 }
        },
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
    },
    {
        id: 'b2b-printers',
        label: '🖨️ B2B 3D Printers (Categorical Segments)',
        hasCategorical: true,
        categoryLabels: ['Small Enterprise', 'Medium Enterprise', 'Large Enterprise'],
        categoryColors: ['#3b82f6', '#f59e0b', '#10b981'], // Blue, Amber, Green
        categorySymbols: ['circle', 'diamond', 'square'],
        // Custom parameter ranges for this scenario
        paramRanges: {
            B0: { min: -100, max: 300 },          // Intercept in $K
            B1: { min: -2, max: 8, step: 0.1 },   // Slope: $K per hour
            B2_quad: { min: -0.2, max: 0.2, step: 0.001 }, // Quadratic term
            B_cat: { min: -200, max: 200, step: 1 }  // Categorical shift ranges
        },
        description: () => `
            <div class="scenario-description">
                <div class="scenario-header">
                    <span class="scenario-icon">🖨️</span>
                    <h4>Industrial 3D Printer Sales - PrintForge Solutions</h4>
                    <span class="scenario-badge">N = 120 Deals | 3 Segments</span>
                </div>
                
                <p class="scenario-intro">
                    You're a sales operations analyst at <strong>PrintForge Solutions</strong>, a B2B distributor 
                    of industrial 3D printers for manufacturing applications. VP of Sales <em>Marcus Chen</em> 
                    wants to understand how <strong>sales consultation time</strong> affects deal size—and whether 
                    this relationship differs across customer segments. PrintForge serves three distinct markets: 
                    small enterprises (machine shops, prototyping studios), medium enterprises (regional manufacturers), 
                    and large enterprises (Fortune 1000 manufacturers with multiple facilities).
                </p>
                
                <p>
                    Marcus raised a key concern at last week's pipeline review: <em>"I'm seeing our reps spend 
                    40+ hours with some small accounts that close at $35K, while our enterprise team closes 
                    $200K deals with similar effort. Are we allocating sales resources efficiently? I need to 
                    understand: (1) what's the baseline deal size for each segment, and (2) how much does an 
                    extra hour of consultation actually move the needle for each type of customer?"</em>
                </p>
                
                <p>
                    The data includes 120 closed-won deals from the past 18 months. PrintForge's sales process 
                    involves technical consultations, on-site demonstrations, and ROI modeling sessions—all logged 
                    as "consultation hours" in the CRM. Contract values range from $18K (entry-level printer for 
                    a small shop) to $280K (multi-unit enterprise deployment).
                </p>
                
                <div class="scenario-variables">
                    <h5>📋 Variables</h5>
                    <table class="scenario-var-table">
                        <tr>
                            <td><span class="var-tag predictor">consultation_hours</span></td>
                            <td>Total pre-sale consultation time (8-50 hours). Includes discovery calls, 
                                technical demos, facility visits, and proposal reviews.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag outcome">contract_value</span></td>
                            <td>Signed contract value in $K. Includes hardware, installation, training, 
                                and first-year maintenance.</td>
                        </tr>
                        <tr>
                            <td><span class="var-tag categorical">segment</span></td>
                            <td>Customer segment: <strong>Small Enterprise</strong> (1-100 employees), 
                                <strong>Medium Enterprise</strong> (101-1,000), or 
                                <strong>Large Enterprise</strong> (1,000+).</td>
                        </tr>
                    </table>
                </div>
                
                <div class="context-grid">
                    <div class="context-item">
                        <strong>Industry</strong>
                        <span>B2B Manufacturing</span>
                    </div>
                    <div class="context-item">
                        <strong>Sales Cycle</strong>
                        <span>3-6 Months</span>
                    </div>
                    <div class="context-item">
                        <strong>Segments</strong>
                        <span>3 Enterprise Tiers</span>
                    </div>
                    <div class="context-item">
                        <strong>Avg Deal Size</strong>
                        <span>$75K - $180K</span>
                    </div>
                </div>
                
                <div class="scenario-insights">
                    <h5>💡 What to Look For</h5>
                    <ul>
                        <li><strong>Baseline differences:</strong> Large enterprises have inherently bigger deals 
                            (more printers, enterprise licensing). The categorical coefficients (B₂, B₃) capture 
                            these baseline shifts.</li>
                        <li><strong>Shared slope vs. segment effects:</strong> All segments share the same 
                            relationship between hours and deal value (parallel lines). The question is: 
                            how much is the "hours" effect vs. the "segment" effect?</li>
                        <li><strong>Reference group:</strong> Small Enterprise is the reference (intercept B₀). 
                            Medium and Large coefficients show how much <em>higher</em> those baselines are.</li>
                        <li><strong>Resource allocation:</strong> If large deals have a higher baseline but 
                            the same slope, should reps spend MORE time on large accounts (bigger absolute return) 
                            or is it more efficient elsewhere?</li>
                    </ul>
                </div>
                
                <div class="scenario-tip">
                    <strong>💡 Pro Tip:</strong> Enable the "Include Categorical Predictor" toggle to see 
                    three separate regression lines—one per segment. Watch how B₂ and B₃ shift the intercepts 
                    for Medium and Large enterprises relative to Small (the reference group).
                </div>
                
                <div class="scenario-questions">
                    <h5>❓ Analysis Questions</h5>
                    <ol>
                        <li>What is the baseline expected contract value for a Small Enterprise deal with 
                            minimal consultation time? How much higher is it for Large Enterprise?</li>
                        <li>If a sales rep has 10 hours of additional capacity, and one prospect in each segment, 
                            where should they invest that time to maximize total expected contract value?</li>
                        <li>Marcus is considering a policy where Large Enterprise deals get a dedicated "solutions 
                            architect" (adding ~15 hours of consultation). Based on your model, what's the 
                            expected ROI if each solutions architect hour costs PrintForge $150?</li>
                        <li>Compare the categorical model (3 intercepts) to a simple linear model ignoring segment. 
                            How much predictive accuracy (MAE improvement) do we gain by accounting for segment?</li>
                    </ol>
                </div>
            </div>
        `,
        xLabel: 'Consultation Hours',
        yLabel: 'Contract Value ($K)',
        generateData: () => {
            // B2B 3D PRINTERS: Categorical predictor with 3 enterprise segments
            // True relationship (linear with categorical):
            //   Small:  y = 25 + 1.8*x + noise  (baseline $25K, +$1.8K per hour)
            //   Medium: y = 25 + 45 + 1.8*x + noise = 70 + 1.8*x  (+$45K shift)
            //   Large:  y = 25 + 110 + 1.8*x + noise = 135 + 1.8*x (+$110K shift)
            // 
            // Adding mild quadratic curvature for diminishing returns at high hours:
            //   y = intercept + 1.8*x - 0.015*x² + noise
            
            const data = { x: [], y: [], category: [] };
            const segments = [
                { name: 'Small Enterprise', baseIntercept: 25, n: 40 },
                { name: 'Medium Enterprise', baseIntercept: 70, n: 40 },
                { name: 'Large Enterprise', baseIntercept: 135, n: 40 }
            ];
            
            const slope = 1.8;         // $1.8K per consultation hour
            const quadratic = -0.015;  // Mild diminishing returns
            
            segments.forEach((segment, segIdx) => {
                for (let i = 0; i < segment.n; i++) {
                    // Consultation hours: 8-50 hours, varies by segment
                    // Small tends toward lower hours, Large toward higher
                    let xBase;
                    if (segIdx === 0) {
                        xBase = 8 + Math.random() * 30;  // 8-38 hours for small
                    } else if (segIdx === 1) {
                        xBase = 12 + Math.random() * 32; // 12-44 hours for medium
                    } else {
                        xBase = 18 + Math.random() * 32; // 18-50 hours for large
                    }
                    
                    const x = Math.round(xBase * 10) / 10;
                    
                    // True value with mild curvature
                    const yTrue = segment.baseIntercept + slope * x + quadratic * x * x;
                    
                    // Noise scales with deal size (heteroscedasticity is realistic)
                    const noiseScale = 8 + segment.baseIntercept * 0.12;
                    const noise = (Math.random() - 0.5) * noiseScale * 2;
                    
                    const y = Math.max(15, Math.round(yTrue + noise));
                    
                    data.x.push(x);
                    data.y.push(y);
                    data.category.push(segIdx); // 0, 1, 2
                }
            });
            
            // Shuffle to mix segments (don't want sorted by segment)
            const indices = data.x.map((_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            
            return {
                x: indices.map(i => data.x[i]),
                y: indices.map(i => data.y[i]),
                category: indices.map(i => data.category[i])
            };
        }
    }
];

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MAE_SCENARIOS };
}
