/**
 * Conjoint Analysis & Simulation Tutorial Engine
 * "Professor Mode" - Comprehensive Guided Educational Experience
 * 
 * This is an extensive tutorial covering:
 * 1. Choice-Based Conjoint fundamentals and theory
 * 2. Part-worth utilities and multinomial logit
 * 3. CBC data structure and configuration
 * 4. Individual-level estimation (regularized MNL)
 * 5. Attribute importance interpretation
 * 6. Price sensitivity analysis
 * 7. Segmentation analysis (K-means on utilities)
 * 8. Market simulation mechanics
 * 9. Willingness-to-Pay (WTP) calculations
 * 10. Product optimization
 * 11. Model assumptions and limitations
 * 
 * Features dynamic quizzes that pull live values from the tool!
 */

const ConjointTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,
    
    // Track tutorial progress
    tutorialStartTime: null,
    tutorialCompleted: false,
    
    // Track what students have explored for dynamic quizzes
    initialSimResults: null,
    priceChangeSimResults: null,

    // ════════════════════════════════════════════════════════════════════
    // HELPER: Get live data from the tool
    // ════════════════════════════════════════════════════════════════════
    
    getLiveData() {
        const data = {
            hasResults: false,
            nRespondents: 0,
            meanPseudoR2: 0,
            meanTasks: 0,
            topAttribute: { name: 'Unknown', importance: 0 },
            secondAttribute: { name: 'Unknown', importance: 0 },
            lowestAttribute: { name: 'Unknown', importance: 0 },
            priceCoef: { mean: 0, min: 0, max: 0 },
            attributes: [],
            hasSegmentation: false,
            segments: [],
            hasSimulation: false,
            noneShare: 0
        };
        
        if (typeof estimationResult !== 'undefined' && estimationResult) {
            data.hasResults = true;
            data.nRespondents = estimationResult.respondents?.length || 0;
            data.meanPseudoR2 = estimationResult.mean_pseudo_r2 || 0;
            data.meanTasks = estimationResult.mean_tasks_per_respondent || 0;
            
            // Get importance ranking
            if (estimationResult.aggregate_summaries?.mean_attribute_importance) {
                const importance = estimationResult.aggregate_summaries.mean_attribute_importance;
                const sorted = Object.entries(importance).sort((a, b) => b[1] - a[1]);
                if (sorted.length > 0) {
                    data.topAttribute = { name: sorted[0][0], importance: sorted[0][1] };
                }
                if (sorted.length > 1) {
                    data.secondAttribute = { name: sorted[1][0], importance: sorted[1][1] };
                }
                if (sorted.length > 2) {
                    data.lowestAttribute = { name: sorted[sorted.length - 1][0], importance: sorted[sorted.length - 1][1] };
                }
                data.attributes = sorted.map(([name, imp]) => ({ name, importance: imp }));
            }
            
            // Get price coefficients
            const priceCoefs = estimationResult.respondents
                ?.map(r => r.coefficients?.price)
                .filter(v => v !== undefined && v !== null) || [];
            if (priceCoefs.length > 0) {
                data.priceCoef = {
                    mean: priceCoefs.reduce((a, b) => a + b, 0) / priceCoefs.length,
                    min: Math.min(...priceCoefs),
                    max: Math.max(...priceCoefs)
                };
            }
        }
        
        // Get segmentation data
        if (typeof segmentationResult !== 'undefined' && segmentationResult && segmentationResult.length > 0) {
            data.hasSegmentation = true;
            data.segments = segmentationResult;
        }
        
        return data;
    },

    steps: [
        // ═══════════════════════════════════════════════════════════════
        // SECTION 1: INTRODUCTION & THEORY
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'intro',
            title: "🎓 Welcome to Choice-Based Conjoint",
            targetId: null,
            content: `
                <p>Welcome! Today we'll master <strong>Choice-Based Conjoint (CBC)</strong> — the gold standard for understanding customer preferences.</p>
                
                <p><strong>The Big Question:</strong> When customers choose products, which features matter most? And how much more will they pay for premium features?</p>
                
                <p><strong>Real Business Impact:</strong></p>
                <ul>
                    <li>🎯 <strong>Product Design:</strong> Build products customers actually want</li>
                    <li>💰 <strong>Pricing Strategy:</strong> Set prices based on perceived value, not just cost</li>
                    <li>📊 <strong>Market Forecasting:</strong> Predict share before expensive launches</li>
                    <li>🏆 <strong>Competitive Strategy:</strong> Understand how you compare to rivals</li>
                    <li>👥 <strong>Segmentation:</strong> Find customer groups with different needs</li>
                </ul>
                
                <p><strong>This Tutorial Covers:</strong></p>
                <ol>
                    <li>Core theory (utilities, MNL model)</li>
                    <li>Loading and configuring CBC data</li>
                    <li>Running estimation</li>
                    <li>Interpreting importance & part-worths</li>
                    <li>Understanding price sensitivity</li>
                    <li>Segmentation analysis</li>
                    <li>Market simulation deep-dive</li>
                    <li>WTP calculations & ROI</li>
                    <li>Assumptions & limitations</li>
                </ol>
                
                <p style="background: #fef3c7; padding: 12px; border-radius: 6px;">
                    <strong>⏱️ Estimated Time:</strong> 30-45 minutes for full completion. This is our most comprehensive tutorial!
                </p>
            `,
            quizzes: [
                {
                    question: "What question does conjoint analysis primarily answer?",
                    options: [
                        "Which advertising channel generates the most clicks",
                        "Which product features drive customer choice and by how much",
                        "How satisfaction scores change over time"
                    ],
                    answer: 1,
                    feedback: "Correct! Conjoint reveals which attributes (features, brand, price) influence choice and quantifies their relative importance."
                },
                {
                    question: "Why is conjoint called 'Choice-Based' Conjoint (CBC)?",
                    options: [
                        "Respondents rate features on a 1-10 scale",
                        "Respondents choose their preferred option from sets of alternatives",
                        "Researchers choose which features to include"
                    ],
                    answer: 1,
                    feedback: "Correct! In CBC, respondents make discrete choices between product alternatives—mimicking real purchase decisions."
                }
            ],
            check: () => true
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 2: The Utility Model
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'utility_model',
            title: "📚 The Random Utility Model",
            targetId: null,
            content: `
                <p>Conjoint is built on <strong>Random Utility Theory</strong> — the idea that customers choose products that maximize their personal utility (value).</p>
                
                <p><strong>The Model:</strong></p>
                <p style="text-align: center; font-family: serif; font-size: 1.2em; background: #f0f9ff; padding: 20px; border-radius: 8px;">
                    U<sub>ij</sub> = V<sub>ij</sub> + ε<sub>ij</sub>
                </p>
                
                <p><strong>Where:</strong></p>
                <ul>
                    <li><strong>U<sub>ij</sub>:</strong> Total utility person i gets from alternative j</li>
                    <li><strong>V<sub>ij</sub>:</strong> Systematic (observable) utility — from features we measure</li>
                    <li><strong>ε<sub>ij</sub>:</strong> Random (unobservable) error — mood, context, features we didn't include</li>
                </ul>
                
                <p><strong>The Systematic Part Expands To:</strong></p>
                <p style="text-align: center; font-family: serif; background: #ecfdf5; padding: 15px; border-radius: 8px;">
                    V<sub>ij</sub> = β<sub>1</sub>×Brand + β<sub>2</sub>×Size + β<sub>3</sub>×Price + ...
                </p>
                
                <p>Each β (beta) is a <strong>part-worth utility</strong> — how much that feature contributes to overall preference.</p>
                
                <p><strong>Key Insight:</strong> Customers choose the product with highest total utility. If Brand A has higher V than Brand B, they'll usually pick A — but the error term means choices aren't perfectly predictable.</p>
            `,
            quizzes: [
                {
                    question: "What does the error term (ε) represent in the utility model?",
                    options: [
                        "Measurement mistakes in the survey",
                        "Unobserved factors affecting choice (mood, unmeasured features, randomness)",
                        "How wrong the model predictions are"
                    ],
                    answer: 1,
                    feedback: "Correct! The error term captures everything that affects choice but isn't in our model — mood, context, features we didn't include. This is why even a great model won't predict perfectly."
                },
                {
                    question: "If Product A has systematic utility V=5 and Product B has V=3, what happens?",
                    options: [
                        "Everyone always chooses Product A",
                        "Product A is more likely to be chosen, but some will pick B due to error term",
                        "We can't predict anything without the error values"
                    ],
                    answer: 1,
                    feedback: "Correct! Higher V means higher probability of choice, but the error term introduces uncertainty. A will be chosen more often, but not always."
                }
            ],
            check: () => true
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 3: Multinomial Logit
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'mnl_model',
            title: "🧮 The Multinomial Logit Model",
            targetId: null,
            content: `
                <p>We use <strong>Multinomial Logit (MNL)</strong> to estimate utilities. It assumes the error terms follow a specific distribution (Type I Extreme Value).</p>
                
                <p><strong>The Choice Probability:</strong></p>
                <p style="text-align: center; font-family: serif; font-size: 1.1em; background: #f0f9ff; padding: 20px; border-radius: 8px;">
                    P(choose j) = exp(V<sub>j</sub>) / Σ<sub>k</sub> exp(V<sub>k</sub>)
                </p>
                
                <p><strong>This Is Called "Softmax":</strong></p>
                <ul>
                    <li>Higher utility → Higher probability (but never 100%)</li>
                    <li>All probabilities sum to 1</li>
                    <li>Even low-utility options have some small chance</li>
                </ul>
                
                <p><strong>Example:</strong></p>
                <p style="background: #fefce8; padding: 12px; border-radius: 6px;">
                    V<sub>A</sub> = 2, V<sub>B</sub> = 1, V<sub>None</sub> = 0<br><br>
                    P(A) = e²/(e²+e¹+e⁰) = 7.39/11.11 = <strong>66.5%</strong><br>
                    P(B) = e¹/11.11 = <strong>24.5%</strong><br>
                    P(None) = e⁰/11.11 = <strong>9.0%</strong>
                </p>
                
                <p><strong>Why This Matters:</strong> Market simulation uses this exact formula to predict market shares!</p>
            `,
            quizzes: [
                {
                    question: "In the example, why doesn't Product A get 100% share even though it has the highest utility?",
                    options: [
                        "The math is wrong",
                        "The softmax function converts utilities to probabilities where all options get some share",
                        "Some respondents didn't complete the survey"
                    ],
                    answer: 1,
                    feedback: "Correct! Softmax (the MNL probability) ensures every option gets some probability. This reflects reality — even great products don't capture 100% market share."
                },
                {
                    question: "If we doubled all utilities (V_A=4, V_B=2, V_None=0), what happens to shares?",
                    options: [
                        "They stay exactly the same",
                        "Product A's share increases (to ~87%) because differences get amplified",
                        "All shares become 33.3% each"
                    ],
                    answer: 1,
                    feedback: "Correct! Multiplying utilities by a constant amplifies the differences — the highest utility option dominates more. P(A) jumps from 66% to 87%. Note: ADDING a constant to all utilities keeps shares unchanged (translation invariance), but MULTIPLYING changes them."
                }
            ],
            check: () => true
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 4: Part-Worth Utilities Deep Dive
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'partworths_deep',
            title: "📈 Part-Worth Utilities: The Details",
            targetId: null,
            content: `
                <p>Part-worths are the building blocks of conjoint. Let's understand them deeply.</p>
                
                <p><strong>For Categorical Attributes (e.g., Brand):</strong></p>
                <ul>
                    <li>One level is the <strong>baseline</strong> (usually first alphabetically)</li>
                    <li>Baseline has utility = 0 by definition</li>
                    <li>Other levels are measured <strong>relative to baseline</strong></li>
                </ul>
                
                <p><strong>Example:</strong></p>
                <p style="background: #f0f4f8; padding: 12px; border-radius: 6px; font-family: monospace;">
                    Brand_Apple = 0 (baseline)<br>
                    Brand_Samsung = +0.8 → preferred over Apple by 0.8 utils<br>
                    Brand_Xiaomi = -0.3 → less preferred than Apple by 0.3 utils
                </p>
                
                <p><strong>For Numeric Attributes (e.g., Price):</strong></p>
                <ul>
                    <li>Single coefficient multiplied by actual value</li>
                    <li>Price typically has <strong>negative coefficient</strong> (higher price = lower utility)</li>
                    <li>Example: β<sub>price</sub> = -0.02 → each $1 increase costs 0.02 utility</li>
                </ul>
                
                <p><strong>The Total Product Utility:</strong></p>
                <p style="background: #ecfdf5; padding: 12px; border-radius: 6px;">
                    Samsung phone, $699, 256GB storage:<br>
                    U = β<sub>Samsung</sub> + β<sub>price</sub>×699 + β<sub>256GB</sub><br>
                    U = 0.8 + (-0.02)×699 + 1.2 = 0.8 - 13.98 + 1.2 = <strong>-11.98</strong>
                </p>
            `,
            quizzes: [
                {
                    question: "If Brand_Apple is the baseline with utility 0, and Brand_Samsung = +1.5, what does this mean?",
                    options: [
                        "Samsung is 1.5× better than Apple",
                        "Customers prefer Samsung over Apple by 1.5 utility units, all else equal",
                        "Samsung costs $1.50 more than Apple"
                    ],
                    answer: 1,
                    feedback: "Correct! Part-worths are relative measures. +1.5 means Samsung adds 1.5 more utility than Apple when all other features are identical."
                },
                {
                    question: "A price coefficient of -0.015 means:",
                    options: [
                        "Prices should be reduced by 1.5%",
                        "Each $1 price increase reduces utility by 0.015 units",
                        "The product is 1.5% too expensive"
                    ],
                    answer: 1,
                    feedback: "Correct! The price coefficient is typically negative (higher price = lower utility). -0.015 means each $1 costs the product 0.015 utility units."
                }
            ],
            check: () => true
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 5: Load the Dataset
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'load_data',
            title: "📱 Load the Smartphone Dataset",
            targetId: 'tut-scenario-section',
            content: `
                <p>Time for hands-on analysis! Let's load a <strong>smartphone CBC study</strong>.</p>
                
                <p><strong>About This Study:</strong></p>
                <ul>
                    <li><strong>100 respondents</strong> — ages 18-55, smartphone owners</li>
                    <li><strong>12 choice tasks each</strong> — enough for reliable individual estimates</li>
                    <li><strong>3 phones + "None"</strong> per task</li>
                    <li><strong>6 attributes:</strong> Brand, Screen, Storage, Battery, Camera, Price</li>
                </ul>
                
                <p><strong>The Business Question:</strong></p>
                <p style="background: #dbeafe; padding: 12px; border-radius: 6px;">
                    "We're launching a new smartphone brand (BrandX). Which features should we prioritize? What price maximizes our share vs. established competitors?"
                </p>
                
                <p class="task">👉 <strong>Task:</strong></p>
                <ol>
                    <li>Find the <strong>MARKETING SCENARIOS</strong> dropdown</li>
                    <li>Select <strong>"📱 Smartphone Choice"</strong></li>
                    <li>Read the scenario description carefully</li>
                </ol>
            `,
            quizzes: [
                {
                    question: "Why does this study have 100 respondents × 12 tasks?",
                    options: [
                        "It's an arbitrary number the researcher picked",
                        "More data = more reliable estimates, especially for individual-level analysis and segmentation",
                        "12 is the maximum tasks allowed by survey software"
                    ],
                    answer: 1,
                    feedback: "Correct! Sample size matters. 100 respondents enables segmentation analysis. 12 tasks per person provides enough data to estimate individual-level preferences (not just market averages)."
                }
            ],
            check: () => {
                return (typeof conjointDataset !== 'undefined' && 
                        conjointDataset.rows && 
                        conjointDataset.rows.length > 0);
            },
            onEnter: () => {
                const section = document.querySelector('.scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 6: Column Mapping
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'column_mapping',
            title: "🗂️ Understanding CBC Data Structure",
            targetId: 'conjoint-column-mapping',
            content: `
                <p>CBC data has a specific structure. Each row is one alternative in one task.</p>
                
                <p><strong>Required Columns:</strong></p>
                <table style="width: 100%; font-size: 0.9em; border-collapse: collapse;">
                    <tr style="background: #f3f4f6;">
                        <th style="padding: 8px; text-align: left;">Column</th>
                        <th style="padding: 8px; text-align: left;">Purpose</th>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Respondent ID</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Links rows to the same person</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Task ID</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Which choice scenario (1-12)</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Alternative ID</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Which option (ProductA, ProductB, None)</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;"><strong>Chosen (0/1)</strong></td>
                        <td style="padding: 8px;">Was this alternative selected?</td>
                    </tr>
                </table>
                
                <p><strong>Data Shape Math:</strong></p>
                <p style="background: #fef3c7; padding: 12px; border-radius: 6px;">
                    100 respondents × 12 tasks × ~4 alternatives = <strong>~4,800 rows</strong>
                </p>
                <p style="font-size: 0.85em; color: #666; margin-top: 8px;">
                    <em>Note: In this experiment, the number of alternatives varied by task (3-5 options), which is realistic for CBC designs. Typically, tasks have a fixed number of alternatives.</em>
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Verify the mapping looks correct, then click <strong>"Confirm Mapping"</strong>.</p>
            `,
            quizzes: [
                {
                    question: "If a respondent sees 12 tasks with 4 alternatives each, how many rows does that person contribute?",
                    options: [
                        "12 rows (one per task)",
                        "48 rows (12 tasks × 4 alternatives)",
                        "4 rows (one per alternative)"
                    ],
                    answer: 1,
                    feedback: "Correct! In 'long format' CBC data, each alternative in each task is a separate row. 12 × 4 = 48 rows per respondent."
                }
            ],
            check: () => {
                const attrConfig = document.getElementById('conjoint-attribute-config');
                return attrConfig && attrConfig.style.display !== 'none';
            },
            onEnter: () => {
                const section = document.getElementById('conjoint-column-mapping');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 7: Configure Attributes
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'configure_attributes',
            title: "⚙️ Attribute Configuration",
            targetId: 'conjoint-attribute-config',
            content: `
                <p>Now we tell the tool how to model each attribute.</p>
                
                <p><strong>Categorical vs. Numeric:</strong></p>
                <table style="width: 100%; font-size: 0.9em; border-collapse: collapse; margin-bottom: 15px;">
                    <tr style="background: #f3f4f6;">
                        <th style="padding: 8px;">Type</th>
                        <th style="padding: 8px;">When to Use</th>
                        <th style="padding: 8px;">Result</th>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Categorical</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Brand, Camera type, Storage</td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Separate utility per level</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;"><strong>Numeric (Linear)</strong></td>
                        <td style="padding: 8px;">Price, Screen size, Battery life</td>
                        <td style="padding: 8px;">Single coefficient × value</td>
                    </tr>
                </table>
                
                <p><strong>The "None" Alternative:</strong></p>
                <p>If your study included "None of these" as an option, identify it here. This is crucial because:</p>
                <ul>
                    <li>It captures <strong>purchase resistance</strong></li>
                    <li>Prevents <strong>overestimating market size</strong></li>
                    <li>Gets its own constant (ASC_None)</li>
                </ul>
                
                <p><strong>Why ASC_None Matters:</strong></p>
                <p style="background: #fee2e2; padding: 12px; border-radius: 6px;">
                    If ASC_None is positive (high), people prefer doing nothing. Your products aren't compelling!<br>
                    If ASC_None is negative (low), people want to buy — good market conditions.
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Configure attributes, identify the None option if present.</p>
            `,
            quizzes: [
                {
                    question: "Why treat Price as 'Numeric (Linear)' instead of 'Categorical'?",
                    options: [
                        "Numeric is always faster to compute",
                        "Linear assumes consistent effect per dollar — doubling price doubles the disutility",
                        "Categorical can't handle numbers"
                    ],
                    answer: 1,
                    feedback: "Correct! Linear pricing assumes each $1 increase has the same effect. This gives us a single coefficient we can use for WTP calculations. Categorical would give separate utilities for each exact price level tested."
                },
                {
                    question: "A study shows ASC_None = +1.5. What does this suggest?",
                    options: [
                        "The None option is highly attractive — people prefer NOT buying",
                        "The None option was poorly designed",
                        "Respondents misunderstood the survey"
                    ],
                    answer: 0,
                    feedback: "Correct! Positive ASC_None means the outside option is attractive. This could indicate: (1) products aren't compelling, (2) prices are too high, or (3) the category isn't essential. Marketing needs to work harder to convert."
                }
            ],
            check: () => {
                const estControls = document.getElementById('conjoint-estimation-controls');
                return estControls && estControls.style.display !== 'none';
            },
            onEnter: () => {
                const section = document.getElementById('conjoint-attribute-config');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 8: Run Estimation
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'run_estimation',
            title: "🧮 Estimate Individual Utilities",
            targetId: 'conjoint-estimation-controls',
            content: `
                <p>This is where the magic happens! We'll estimate utilities for <strong>each individual respondent</strong>.</p>
                
                <p><strong>The Method: Regularized MNL</strong></p>
                <p>We use L2 regularization (Ridge) to:</p>
                <ul>
                    <li>Prevent overfitting when individuals have limited tasks</li>
                    <li>Shrink extreme coefficients toward zero</li>
                    <li>Produce stable, reliable estimates</li>
                </ul>
                
                <p><strong>Why Individual-Level?</strong></p>
                <p style="background: #dbeafe; padding: 12px; border-radius: 6px;">
                    Market-level averages hide heterogeneity! Some customers are price-sensitive, others value brand. Individual utilities let us:
                    <ul style="margin: 10px 0 0 0;">
                        <li>Segment customers by preference patterns</li>
                        <li>Simulate how specific segments respond</li>
                        <li>Target products to the right audiences</li>
                    </ul>
                </p>
                
                <p><strong>Regularization Strength (λ):</strong></p>
                <ul>
                    <li><strong>λ = 0:</strong> No regularization (may overfit)</li>
                    <li><strong>λ = 1.0:</strong> Default, balanced</li>
                    <li><strong>λ > 2.0:</strong> Heavy shrinkage (conservative)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Keep regularization at 1.0, then click <strong>"Estimate Individual Utilities"</strong>.</p>
                
                <p><em>This may take 10-60 seconds depending on dataset size.</em></p>
            `,
            quizzes: [
                {
                    question: "Why estimate individual-level utilities instead of just market averages?",
                    options: [
                        "It's required by the software",
                        "Individual utilities reveal preference heterogeneity and enable segmentation",
                        "Market averages are always wrong"
                    ],
                    answer: 1,
                    feedback: "Correct! Averages hide diversity. If half your customers love premium and half love budget, the 'average' customer doesn't exist! Individual utilities let us find and target distinct segments."
                }
            ],
            check: () => {
                const resultsSection = document.getElementById('conjoint-results-section');
                return resultsSection && resultsSection.style.display !== 'none';
            },
            onEnter: () => {
                const section = document.getElementById('conjoint-estimation-controls');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 9: Model Fit - DYNAMIC
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'model_fit',
            title: "📋 Checking Model Fit",
            targetId: 'conjoint-test-results',
            getDynamicContent: function() {
                const data = ConjointTutorial.getLiveData();
                
                if (data.hasResults) {
                    const r2Quality = data.meanPseudoR2 > 0.4 ? 'Excellent' : 
                                      data.meanPseudoR2 > 0.2 ? 'Good' : 'Marginal';
                    const r2Color = data.meanPseudoR2 > 0.4 ? '#10b981' : 
                                    data.meanPseudoR2 > 0.2 ? '#3b82f6' : '#f59e0b';
                    
                    return `
                        <p>Great! Let's evaluate how well the model fits the data.</p>
                        
                        <p><strong>Your Results:</strong></p>
                        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
                                <div>
                                    <div style="font-size: 1.5em; font-weight: bold;">${data.nRespondents}</div>
                                    <div style="font-size: 0.85em; color: #6b7280;">Respondents</div>
                                </div>
                                <div>
                                    <div style="font-size: 1.5em; font-weight: bold;">${data.meanTasks.toFixed(1)}</div>
                                    <div style="font-size: 0.85em; color: #6b7280;">Tasks/Person</div>
                                </div>
                                <div>
                                    <div style="font-size: 1.5em; font-weight: bold; color: ${r2Color};">${data.meanPseudoR2.toFixed(3)}</div>
                                    <div style="font-size: 0.85em; color: #6b7280;">Mean Pseudo-R²</div>
                                </div>
                            </div>
                        </div>
                        
                        <p><strong>Assessment:</strong> Your Pseudo-R² of ${data.meanPseudoR2.toFixed(3)} is <strong style="color: ${r2Color};">${r2Quality}</strong>.</p>
                        
                        <p><strong>Pseudo-R² Interpretation Guide:</strong></p>
                        <ul>
                            <li><strong>> 0.40:</strong> Excellent — model explains choices very well</li>
                            <li><strong>0.20 - 0.40:</strong> Good — typical for CBC studies</li>
                            <li><strong>< 0.20:</strong> Marginal — consider data quality issues</li>
                        </ul>
                        
                        <p class="task">👉 <strong>Task:</strong> Scroll down to view the model fit metrics and interpretation aids.</p>
                    `;
                }
                
                return `
                    <p>Let's evaluate model fit after estimation completes.</p>
                    <p><em>Run estimation first to see your model fit metrics.</em></p>
                `;
            },
            content: '',
            getDynamicQuizzes: function() {
                const data = ConjointTutorial.getLiveData();
                
                if (data.hasResults) {
                    const r2 = data.meanPseudoR2;
                    const quality = r2 > 0.4 ? 'excellent' : r2 > 0.2 ? 'good' : 'marginal';
                    
                    return [
                        {
                            question: `Your model shows Pseudo-R² = ${r2.toFixed(3)}. How would you assess this fit?`,
                            options: [
                                `${quality.charAt(0).toUpperCase() + quality.slice(1)} fit — ${r2 > 0.2 ? 'proceed with confidence' : 'may need more investigation'}`,
                                "Cannot determine without more context",
                                "Perfect fit — no room for improvement"
                            ],
                            answer: 0,
                            feedback: `Correct! A Pseudo-R² of ${r2.toFixed(3)} indicates ${quality} model fit for CBC analysis. ${r2 > 0.3 ? 'The model explains choices well.' : 'Consider checking data quality if lower than expected.'}`
                        }
                    ];
                }
                
                return [
                    {
                        question: "What range of Pseudo-R² is 'good' for CBC studies?",
                        options: [
                            "0.90 - 1.00",
                            "0.20 - 0.40",
                            "0.01 - 0.10"
                        ],
                        answer: 1,
                        feedback: "Correct! CBC Pseudo-R² typically ranges 0.20-0.40. Unlike regular R², this isn't '% variance explained' — it's based on log-likelihood improvement."
                    }
                ];
            },
            quizzes: [],
            check: () => true,
            onEnter: function() {
                const step = ConjointTutorial.steps.find(s => s.id === 'model_fit');
                if (step && step.getDynamicContent) {
                    step.content = step.getDynamicContent();
                }
                const section = document.getElementById('conjoint-test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 10: Attribute Importance - DYNAMIC
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'interpret_importance',
            title: "📊 Attribute Importance Analysis",
            targetId: 'chart-importance',
            getDynamicContent: function() {
                const data = ConjointTutorial.getLiveData();
                
                if (data.hasResults && data.attributes.length > 0) {
                    const topAttr = data.topAttribute;
                    const secondAttr = data.secondAttribute;
                    const lowestAttr = data.lowestAttribute;
                    const gap = topAttr.importance - secondAttr.importance;
                    
                    return `
                        <p>The <strong>Attribute Importance</strong> chart reveals what drives customer decisions.</p>
                        
                        <p><strong>Your Results:</strong></p>
                        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 15px;">
                            <p style="margin: 0 0 10px 0;"><strong>🥇 #1 Driver:</strong> ${topAttr.name} at <strong>${topAttr.importance.toFixed(1)}%</strong></p>
                            <p style="margin: 0 0 10px 0;"><strong>🥈 #2 Driver:</strong> ${secondAttr.name} at <strong>${secondAttr.importance.toFixed(1)}%</strong></p>
                            <p style="margin: 0;"><strong>📉 Lowest:</strong> ${lowestAttr.name} at <strong>${lowestAttr.importance.toFixed(1)}%</strong></p>
                        </div>
                        
                        ${gap > 15 ? `
                        <p style="background: #fef3c7; padding: 12px; border-radius: 6px;">
                            <strong>⚠️ Dominance Alert:</strong> ${topAttr.name} leads by ${gap.toFixed(0)}+ points. This is the PRIMARY driver — marketing should focus here!
                        </p>
                        ` : ''}
                        
                        <p><strong>Strategic Implications:</strong></p>
                        <ul>
                            <li>Focus R&D and marketing on <strong>${topAttr.name}</strong></li>
                            ${lowestAttr.importance < 10 ? `<li>Consider de-emphasizing <strong>${lowestAttr.name}</strong> (low impact)</li>` : ''}
                            <li>All attributes in the "sweet spot" (10-25%) deserve attention</li>
                        </ul>
                        
                        <p class="task">👉 <strong>Task:</strong> Study the importance chart. Note which attributes matter most to these customers.</p>
                    `;
                }
                
                return `
                    <p>The <strong>Attribute Importance</strong> chart shows which features drive choice.</p>
                    <p><em>Complete estimation to see your importance results.</em></p>
                `;
            },
            content: '',
            getDynamicQuizzes: function() {
                const data = ConjointTutorial.getLiveData();
                
                if (data.hasResults && data.attributes.length >= 2) {
                    const top = data.topAttribute;
                    const second = data.secondAttribute;
                    
                    return [
                        {
                            question: `${top.name} has ${top.importance.toFixed(1)}% importance. What should the product team prioritize?`,
                            options: [
                                `${top.name} — it's the dominant driver of choice`,
                                `${second.name} — the second attribute is always more important`,
                                "All attributes equally regardless of importance"
                            ],
                            answer: 0,
                            feedback: `Correct! At ${top.importance.toFixed(1)}% importance, ${top.name} is the primary purchase driver. Product development and marketing should prioritize this attribute.`
                        },
                        {
                            question: `The lowest attribute has ${data.lowestAttribute.importance.toFixed(1)}% importance. Should the company eliminate it?`,
                            options: [
                                "Yes — it's a waste of resources",
                                "No — but deprioritize it; it adds marginal value",
                                "Need more data to decide"
                            ],
                            answer: 1,
                            feedback: `Correct! Low importance doesn't mean zero impact. ${data.lowestAttribute.name} at ${data.lowestAttribute.importance.toFixed(1)}% still affects some customers. Consider cost vs. benefit before removing.`
                        }
                    ];
                }
                
                return [
                    {
                        question: "An attribute with 5% importance should be:",
                        options: [
                            "Eliminated immediately",
                            "Deprioritized but not necessarily removed",
                            "Given equal weight with other attributes"
                        ],
                        answer: 1,
                        feedback: "Correct! Low importance means low incremental impact, but it might still be a table-stakes feature or affect specific segments. Analyze cost-to-implement before removing."
                    }
                ];
            },
            quizzes: [],
            check: () => true,
            onEnter: function() {
                const step = ConjointTutorial.steps.find(s => s.id === 'interpret_importance');
                if (step && step.getDynamicContent) {
                    step.content = step.getDynamicContent();
                }
                const section = document.getElementById('chart-importance');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 11: Part-Worth Chart
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'interpret_partworths',
            title: "📈 Reading Part-Worth Utilities",
            targetId: 'chart-partworths',
            content: `
                <p>The <strong>Part-Worth Utilities</strong> chart shows preference for each feature level.</p>
                
                <p><strong>How to Read the Chart:</strong></p>
                <ul>
                    <li><strong>Positive bars (right):</strong> Preferred over the baseline</li>
                    <li><strong>Negative bars (left):</strong> Less preferred than baseline</li>
                    <li><strong>Compare WITHIN attributes:</strong> Which level wins?</li>
                </ul>
                
                <p><strong>Example Reading:</strong></p>
                <p style="background: #f0f4f8; padding: 12px; border-radius: 6px;">
                    Storage: 256GB = +0.9, 128GB = +0.3, 64GB (baseline) = 0<br>
                    → Customers prefer 256GB most, then 128GB, then 64GB<br>
                    → Upgrading 64GB→256GB adds 0.9 utility
                </p>
                
                <p><strong>Designing the "Ideal" Product:</strong></p>
                <p>Combine the highest-utility level from each attribute... but watch the cost!</p>
                
                <p><strong>Business Reality Check:</strong></p>
                <p style="background: #fef3c7; padding: 12px; border-radius: 6px;">
                    The "best" product isn't always the most profitable. A $999 phone with all premium features might lose to a $599 phone with smart tradeoffs!
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Identify the most preferred level of each attribute.</p>
            `,
            quizzes: [
                {
                    question: "If Camera: 'Professional' = +1.5 and 'Standard' = -0.8, what's the utility difference?",
                    options: [
                        "0.7 utility units",
                        "2.3 utility units",
                        "-2.3 utility units"
                    ],
                    answer: 1,
                    feedback: "Correct! Difference = 1.5 - (-0.8) = 2.3 utility units. Professional camera adds significantly more value than Standard."
                },
                {
                    question: "The baseline level always has utility = 0. Why?",
                    options: [
                        "Because it's the worst level",
                        "Because utilities are relative — we need a reference point",
                        "Because the software can't handle non-zero baselines"
                    ],
                    answer: 1,
                    feedback: "Correct! Part-worths are RELATIVE to a reference point. Setting one level to 0 lets us interpret other levels as 'better or worse than baseline.'"
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('chart-partworths');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 12: Price Sensitivity - DYNAMIC
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'price_sensitivity',
            title: "💰 Price Sensitivity Deep Dive",
            targetId: 'chart-price-dist',
            getDynamicContent: function() {
                const data = ConjointTutorial.getLiveData();
                
                if (data.hasResults && data.priceCoef.mean !== 0) {
                    const meanCoef = data.priceCoef.mean;
                    const range = data.priceCoef.max - data.priceCoef.min;
                    const sensitivity = Math.abs(meanCoef) > 0.02 ? 'high' : 
                                       Math.abs(meanCoef) > 0.01 ? 'moderate' : 'low';
                    
                    return `
                        <p>The <strong>Price Coefficient Distribution</strong> reveals how price-sensitive your customers are.</p>
                        
                        <p><strong>Your Price Sensitivity Results:</strong></p>
                        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p style="margin: 0 0 10px 0;"><strong>Mean Price Coefficient:</strong> ${meanCoef.toFixed(4)}</p>
                            <p style="margin: 0 0 10px 0;"><strong>Range:</strong> ${data.priceCoef.min.toFixed(4)} to ${data.priceCoef.max.toFixed(4)}</p>
                            <p style="margin: 0;"><strong>Assessment:</strong> <strong>${sensitivity.toUpperCase()}</strong> price sensitivity</p>
                        </div>
                        
                        <p><strong>What This Means:</strong></p>
                        <ul>
                            <li>Each $1 price increase costs about <strong>${Math.abs(meanCoef).toFixed(4)} utility</strong> on average</li>
                            <li>A $100 price hike would cost <strong>${(Math.abs(meanCoef) * 100).toFixed(2)} utility</strong></li>
                            ${range > 0.03 ? `<li><strong>Wide range detected!</strong> Consider segmentation — some customers are much more price-sensitive than others</li>` : ''}
                        </ul>
                        
                        <p><strong>Strategic Implications:</strong></p>
                        ${sensitivity === 'high' ? 
                            '<p style="background: #fee2e2; padding: 12px; border-radius: 6px;">⚠️ High price sensitivity! Compete on value. Price increases will significantly hurt market share.</p>' :
                            sensitivity === 'low' ?
                            '<p style="background: #d1fae5; padding: 12px; border-radius: 6px;">✅ Low price sensitivity. Opportunity for premium pricing if features justify it.</p>' :
                            '<p style="background: #dbeafe; padding: 12px; border-radius: 6px;">Moderate sensitivity. Balance price competitiveness with feature investments.</p>'
                        }
                        
                        <p class="task">👉 <strong>Task:</strong> Look at the histogram. Is the distribution wide (heterogeneous) or narrow (homogeneous)?</p>
                    `;
                }
                
                return `
                    <p>The <strong>Price Coefficient Distribution</strong> shows how customers respond to price.</p>
                    <p><em>Complete estimation to see your price sensitivity analysis.</em></p>
                `;
            },
            content: '',
            getDynamicQuizzes: function() {
                const data = ConjointTutorial.getLiveData();
                
                if (data.hasResults && data.priceCoef.mean !== 0) {
                    const meanCoef = data.priceCoef.mean;
                    const utilityLoss = Math.abs(meanCoef) * 50;
                    
                    return [
                        {
                            question: `With price coefficient = ${meanCoef.toFixed(4)}, what happens if you raise price by $50?`,
                            options: [
                                `Utility drops by approximately ${utilityLoss.toFixed(2)} units`,
                                "Utility increases because higher price signals quality",
                                "No change — price coefficient is too small to matter"
                            ],
                            answer: 0,
                            feedback: `Correct! Price coefficient × price change = ${meanCoef.toFixed(4)} × 50 = ${(meanCoef * 50).toFixed(3)} utility. Since the coefficient is negative, utility DROPS by about ${utilityLoss.toFixed(2)} units.`
                        }
                    ];
                }
                
                return [
                    {
                        question: "A price coefficient of -0.025 means:",
                        options: [
                            "The product is 2.5% too expensive",
                            "Each $1 price increase reduces utility by 0.025 units",
                            "25% of customers are price-sensitive"
                        ],
                        answer: 1,
                        feedback: "Correct! The price coefficient translates dollars to utility. -0.025 means each $1 costs 0.025 utility. A $40 price increase would cost 1.0 utility units."
                    }
                ];
            },
            quizzes: [],
            check: () => true,
            onEnter: function() {
                const step = ConjointTutorial.steps.find(s => s.id === 'price_sensitivity');
                if (step && step.getDynamicContent) {
                    step.content = step.getDynamicContent();
                }
                const section = document.getElementById('chart-price-dist');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 13: Segmentation Introduction
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'segmentation_intro',
            title: "👥 Segmentation Analysis",
            targetId: 'conjoint-segmentation',
            content: `
                <p>Individual-level utilities enable <strong>segmentation</strong> — finding customer groups with different preferences.</p>
                
                <p><strong>Why Segment?</strong></p>
                <ul>
                    <li>The "average customer" often doesn't exist</li>
                    <li>Different segments may want different products</li>
                    <li>Targeted marketing is more effective than mass marketing</li>
                    <li>Pricing can be optimized per segment</li>
                </ul>
                
                <p><strong>The Method: K-Means Clustering</strong></p>
                <p style="background: #f0f4f8; padding: 12px; border-radius: 6px;">
                    K-Means groups respondents so that people within a cluster have similar utilities, and clusters are different from each other.
                </p>
                
                <p><strong>Choosing K (Number of Segments):</strong></p>
                <ul>
                    <li><strong>k=2:</strong> Simple — "Price-Sensitive" vs "Quality-Focused"</li>
                    <li><strong>k=3:</strong> Common — adds a "Balanced" middle segment</li>
                    <li><strong>k=4-5:</strong> More nuanced but harder to action</li>
                </ul>
                
                <p><strong>What You'll Learn:</strong></p>
                <ul>
                    <li>Segment sizes (how big is each group?)</li>
                    <li>Segment profiles (what does each group value?)</li>
                    <li>Price sensitivity by segment</li>
                    <li>Top-valued attribute per segment</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Scroll to <strong>Segmentation Analysis</strong> and run with k=3 segments.</p>
            `,
            quizzes: [
                {
                    question: "Why use individual-level utilities for segmentation instead of just demographics?",
                    options: [
                        "Demographics are illegal to collect",
                        "Preference-based segments show how to position products, not just who customers are",
                        "Individual utilities are always more accurate"
                    ],
                    answer: 1,
                    feedback: "Correct! Demographics tell you WHO (age, gender) but not WHAT THEY WANT. Two 25-year-olds might have completely different phone preferences. Utility-based segments show actionable preference patterns."
                },
                {
                    question: "You find a 'Price Warrior' segment (very negative price coefficient). What's the strategy?",
                    options: [
                        "Ignore them — they won't pay enough to be profitable",
                        "Target with value-tier products emphasizing affordability",
                        "Raise prices to filter them out"
                    ],
                    answer: 1,
                    feedback: "Correct! Price-sensitive segments can be profitable with the right product — lower cost, stripped-down features, value messaging. The key is MATCHING the product to the segment."
                }
            ],
            check: () => {
                const segSection = document.getElementById('conjoint-segmentation');
                return segSection && segSection.style.display !== 'none';
            },
            onEnter: () => {
                const section = document.getElementById('conjoint-segmentation');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 14: Market Simulation Introduction
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'simulation_intro',
            title: "🎯 Market Simulation: The Payoff",
            targetId: 'conjoint-simulation',
            content: `
                <p>Now for the business payoff: <strong>Market Simulation</strong>.</p>
                
                <p><strong>What Simulation Does:</strong></p>
                <p style="background: #dbeafe; padding: 12px; border-radius: 6px;">
                    Given a competitive scenario, predict market share for each product using estimated utilities. This is "what-if" analysis for product strategy!
                </p>
                
                <p><strong>The Math (Softmax):</strong></p>
                <p style="text-align: center; font-family: serif; font-size: 1.1em;">
                    Share<sub>j</sub> = exp(U<sub>j</sub>) / Σ exp(U<sub>k</sub>)
                </p>
                
                <p><strong>Building a Scenario:</strong></p>
                <ol>
                    <li>Define <strong>your product(s)</strong> — set all attribute levels and price</li>
                    <li>Include <strong>competitors</strong> as benchmarks</li>
                    <li>Optionally include <strong>"None"</strong> for realistic total market size</li>
                    <li>Set <strong>market size</strong> (total potential customers)</li>
                    <li>Run simulation!</li>
                </ol>
                
                <p><strong>Key Settings:</strong></p>
                <ul>
                    <li><strong>Price Mode:</strong> Is price an attribute (from conjoint) or fixed separately?</li>
                    <li><strong>Force Choice:</strong> Exclude "None" to see shares among buyers only</li>
                    <li><strong>Cost Structure:</strong> Input costs to calculate profit, not just share</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Scroll to <strong>Market Simulation</strong> and add a product configuration.</p>
            `,
            quizzes: [
                {
                    question: "In simulation, what does 'Force Choice' do?",
                    options: [
                        "Forces respondents to answer faster",
                        "Excludes the 'None' option — shows shares among those who WILL buy",
                        "Forces all products to have the same price"
                    ],
                    answer: 1,
                    feedback: "Correct! Force Choice removes 'None' from the choice set. Use it to see shares among definite buyers. Without it, high 'None' share might signal the market isn't ready to buy."
                }
            ],
            check: () => {
                const simSection = document.getElementById('conjoint-simulation');
                return simSection && simSection.style.display !== 'none';
            },
            onEnter: () => {
                const section = document.getElementById('conjoint-simulation');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 15: Simulation Hands-On
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'simulation_handson',
            title: "🔬 Run Your First Simulation",
            targetId: 'conjoint-simulation',
            content: `
                <p>Let's run a simulation to predict market shares.</p>
                
                <p><strong>Your Task:</strong></p>
                <ol>
                    <li>Click <strong>"+ Add Product Alternative"</strong></li>
                    <li>Configure a smartphone with:
                        <ul>
                            <li>Mid-range attributes (not all premium)</li>
                            <li>A competitive price</li>
                        </ul>
                    </li>
                    <li>Set market size to <strong>10,000</strong> customers</li>
                    <li>Click <strong>"Run Market Simulation"</strong></li>
                </ol>
                
                <p><strong>What to Look For:</strong></p>
                <ul>
                    <li><strong>Market Share:</strong> What % would prefer your product?</li>
                    <li><strong>Customer Count:</strong> How many actual buyers?</li>
                    <li><strong>"None" Share:</strong> How many aren't convinced?</li>
                    <li><strong>Competitor Share:</strong> Who's winning?</li>
                </ul>
                
                <p><strong>Pro Tip:</strong></p>
                <p style="background: #ecfdf5; padding: 12px; border-radius: 6px;">
                    After running once, change ONE attribute (like price) and re-run. Compare results to see the sensitivity of share to that attribute!
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Run at least one simulation and observe the results.</p>
            `,
            quizzes: [
                {
                    question: "Your simulation shows 30% share for 'None'. What does this mean?",
                    options: [
                        "30% of respondents made errors",
                        "30% of the market would not buy ANY of the options presented",
                        "Your product has 30% share"
                    ],
                    answer: 1,
                    feedback: "Correct! 30% choosing 'None' means those customers aren't compelled by current offerings. Consider: (1) Lower prices, (2) Better features, (3) The market may have low category interest."
                }
            ],
            check: () => {
                const simResults = document.getElementById('conjoint-simulation-results');
                return simResults && simResults.style.display !== 'none';
            },
            onEnter: () => {
                const section = document.getElementById('conjoint-simulation');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 16: WTP Analysis
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'wtp_analysis',
            title: "💵 Willingness-to-Pay (WTP)",
            targetId: 'conjoint-simulation',
            content: `
                <p><strong>Willingness-to-Pay</strong> converts utility to dollars — the ultimate business metric!</p>
                
                <p><strong>The Formula:</strong></p>
                <p style="text-align: center; font-family: serif; font-size: 1.1em; background: #ecfdf5; padding: 15px; border-radius: 8px;">
                    WTP = -Δ Utility / Price Coefficient
                </p>
                
                <p><strong>Detailed Example:</strong></p>
                <div style="background: #f0f4f8; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 0 0 10px 0;"><strong>Scenario:</strong> Upgrading camera from "Standard" to "Professional"</p>
                    <p style="margin: 0 0 10px 0;">Utility gain (Δ Utility) = 1.2 units</p>
                    <p style="margin: 0 0 10px 0;">Price coefficient = -0.02 (negative!)</p>
                    <p style="margin: 0;">WTP = -1.2 / -0.02 = <strong>$60</strong></p>
                </div>
                
                <p><strong>Interpretation:</strong> Customers value the camera upgrade at $60. You could charge up to $60 extra and customers would still prefer the upgraded version (all else equal).</p>
                
                <p><strong>Strategic Uses of WTP:</strong></p>
                <ul>
                    <li><strong>Feature Pricing:</strong> If WTP > cost, the feature is profitable</li>
                    <li><strong>Bundle Design:</strong> Combine features where total WTP > bundle price increase</li>
                    <li><strong>Value Communication:</strong> "This upgrade is worth $60 in customer value!"</li>
                    <li><strong>ROI Justification:</strong> "Adding this feature costs $30 but customers value it at $60"</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Enable "Show Willingness-to-Pay" in the simulation settings.</p>
            `,
            quizzes: [
                {
                    question: "WTP for '256GB storage' is $80, but it costs $30 to add. Should you include it?",
                    options: [
                        "No — $80 is too much to charge",
                        "Yes — customers value it at $80, you can price anywhere from $30-80 and profit",
                        "Only if competitors offer it"
                    ],
                    answer: 1,
                    feedback: "Correct! WTP > Cost is a profitable feature. You have $50 of pricing flexibility. Price at $50 to capture margin while offering perceived value. This is conjoint's business power!"
                },
                {
                    question: "Why is the price coefficient in the denominator of the WTP formula?",
                    options: [
                        "It's a mathematical error",
                        "To convert utility units to dollar units using the price-utility exchange rate",
                        "Because price is always negative"
                    ],
                    answer: 1,
                    feedback: "Correct! The price coefficient tells us how many utility units one dollar is 'worth.' Dividing utility gain by this rate converts utils to dollars — like currency exchange!"
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('price-wtp-options');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 17: Simulation What-If Scenarios
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'whatif_scenarios',
            title: "🔄 What-If Scenario Analysis",
            targetId: 'conjoint-simulation',
            content: `
                <p>The real power of simulation is <strong>"what-if" analysis</strong>.</p>
                
                <p><strong>Key Questions to Explore:</strong></p>
                <ol>
                    <li><strong>Price Sensitivity:</strong> What if I raise/lower price by $50?</li>
                    <li><strong>Feature Tradeoffs:</strong> What if I downgrade camera but add storage?</li>
                    <li><strong>Competitive Response:</strong> What if competitor drops their price?</li>
                    <li><strong>New Entrant:</strong> What happens if a third competitor enters?</li>
                </ol>
                
                <p><strong>How to Run What-If Analysis:</strong></p>
                <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <ol style="margin: 0; padding-left: 20px;">
                        <li>Run baseline simulation, note the shares</li>
                        <li>Change ONE variable (e.g., price)</li>
                        <li>Re-run simulation</li>
                        <li>Compare: How much did share change?</li>
                        <li>Calculate: Share change ÷ Price change = Price elasticity</li>
                    </ol>
                </div>
                
                <p><strong>Example Analysis:</strong></p>
                <p style="background: #fef3c7; padding: 12px; border-radius: 6px;">
                    Baseline: $699 → 28% share<br>
                    Price drop: $649 → 32% share<br>
                    <strong>Result:</strong> $50 reduction gained 4 share points<br>
                    <strong>Implication:</strong> Each 1% share costs $12.50 in price reduction
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Run two simulations with different prices and compare the results.</p>
            `,
            quizzes: [
                {
                    question: "You test two prices: $599 (35% share) and $699 (25% share). What's the share-price tradeoff?",
                    options: [
                        "10 share points per $100, or 1 point per $10",
                        "Can't calculate without profit data",
                        "The higher price is always worse"
                    ],
                    answer: 0,
                    feedback: "Correct! 10 share point difference ÷ $100 = 1 share point per $10. Now you can calculate: if margin at $699 is $200 vs $100 at $599, which price maximizes profit?"
                }
            ],
            check: () => true,
            onEnter: () => {
                ConjointTutorial.ranWhatIfScenario = true;
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 18: IIA Assumption
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'iia_assumption',
            title: "⚠️ The IIA Assumption (Critical!)",
            targetId: 'conjoint-diagnostics',
            content: `
                <p>MNL has a critical assumption called <strong>IIA: Independence of Irrelevant Alternatives</strong>.</p>
                
                <p><strong>What IIA Means:</strong></p>
                <p style="background: #fee2e2; padding: 12px; border-radius: 6px;">
                    Adding or removing an alternative affects all other alternatives <em>proportionally</em>.
                </p>
                
                <p><strong>The Classic "Red Bus / Blue Bus" Problem:</strong></p>
                <div style="background: #f0f4f8; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p>Original: Car (50%) vs Red Bus (50%)</p>
                    <p>Add Blue Bus → MNL predicts: Car (33%), Red Bus (33%), Blue Bus (33%)</p>
                    <p><strong>Reality:</strong> Car (50%), Red Bus (25%), Blue Bus (25%)</p>
                    <p><em>The buses steal from each other, not from car!</em></p>
                </div>
                
                <p><strong>When IIA Is Violated:</strong></p>
                <ul>
                    <li>When alternatives are <strong>close substitutes</strong> (iPhone 14 vs iPhone 14 Pro)</li>
                    <li>When alternatives belong to <strong>nested categories</strong> (all Androids vs all iPhones)</li>
                </ul>
                
                <p><strong>Implications for Your Analysis:</strong></p>
                <ul>
                    <li>Be cautious simulating very similar products</li>
                    <li>Don't over-interpret small share differences</li>
                    <li>Consider nested logit or mixed logit for complex markets</li>
                </ul>
            `,
            quizzes: [
                {
                    question: "IIA is violated when:",
                    options: [
                        "Sample size is too small",
                        "Some alternatives are close substitutes that compete more with each other",
                        "Price coefficients are negative"
                    ],
                    answer: 1,
                    feedback: "Correct! IIA fails when alternatives aren't independent. If iPhone 14 and 14 Pro are similar, adding one steals more from the other iPhone than from Samsung. MNL assumes proportional stealing from ALL alternatives."
                },
                {
                    question: "How should you handle potential IIA violations in practice?",
                    options: [
                        "Ignore them — IIA violations are rare",
                        "Be cautious with very similar products; use results directionally, not precisely",
                        "Re-run the survey with different products"
                    ],
                    answer: 1,
                    feedback: "Correct! In practice: (1) Don't simulate nearly-identical products, (2) Interpret relative shares directionally, (3) For critical decisions, consider more advanced models like mixed logit."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('conjoint-diagnostics');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 19: Other Limitations
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'limitations',
            title: "🔬 Other Limitations & Best Practices",
            targetId: 'conjoint-diagnostics',
            content: `
                <p>Every method has limitations. A good analyst knows them!</p>
                
                <p><strong>1. Hypothetical Bias</strong></p>
                <p style="background: #fee2e2; padding: 12px; border-radius: 6px;">
                    People SAY they'll pay more than they actually WILL in real purchases. WTP estimates may be 20-50% inflated!
                </p>
                <p><em>Mitigation:</em> Apply a "reality discount" to WTP estimates; validate with real sales data.</p>
                
                <p><strong>2. Attribute Non-Attendance</strong></p>
                <p style="background: #fef3c7; padding: 12px; border-radius: 6px;">
                    Some respondents ignore certain attributes entirely (e.g., always choosing cheapest regardless of features).
                </p>
                <p><em>Mitigation:</em> Check individual-level results for suspiciously high/low coefficients.</p>
                
                <p><strong>3. Extrapolation Risk</strong></p>
                <p style="background: #fee2e2; padding: 12px; border-radius: 6px;">
                    Don't simulate outside the tested range! If prices tested were $499-$899, don't predict share at $1,499.
                </p>
                
                <p><strong>4. Context Dependence</strong></p>
                <p>Preferences depend on the alternatives shown. Different choice sets might yield different utilities.</p>
                
                <p><strong>Best Practices:</strong></p>
                <ul>
                    <li>✅ Validate with market data when possible</li>
                    <li>✅ Use confidence intervals, not point estimates</li>
                    <li>✅ Run multiple scenarios to stress-test conclusions</li>
                    <li>✅ Be transparent about assumptions in presentations</li>
                </ul>
            `,
            quizzes: [
                {
                    question: "WTP analysis shows customers will pay $80 extra for a feature. What's a realistic pricing recommendation?",
                    options: [
                        "Charge exactly $80 more",
                        "Charge $50-60 more to account for hypothetical bias",
                        "Don't add the feature — $80 isn't enough"
                    ],
                    answer: 1,
                    feedback: "Correct! Hypothetical bias means stated WTP > actual WTP. A conservative estimate (60-75% of stated WTP) is safer for pricing decisions. Test with small pilots if possible!"
                },
                {
                    question: "Your study tested prices $499-$899. A colleague wants to simulate at $299. What's the issue?",
                    options: [
                        "No issue — lower prices always increase share",
                        "Extrapolation — the linear price effect may not hold outside the tested range",
                        "$299 is too low to be profitable"
                    ],
                    answer: 1,
                    feedback: "Correct! The price coefficient was estimated from $499-$899 data. At $299, non-linearities (quality signals, suspicion of 'too cheap') may emerge. Extrapolation is risky!"
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('conjoint-diagnostics');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 20: Conclusion
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'conclusion',
            title: "🎓 Professor Mode Complete!",
            targetId: null,
            content: `
                <p>Excellent work! You've mastered the fundamentals of Choice-Based Conjoint analysis and simulation.</p>
                
                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>Random Utility Theory:</strong> U = V + ε — the foundation of choice modeling</li>
                    <li><strong>Part-Worth Utilities:</strong> Quantifying how much each feature level contributes to preference</li>
                    <li><strong>Multinomial Logit:</strong> Converting utility differences to choice probabilities (softmax)</li>
                    <li><strong>Attribute Importance:</strong> Finding the key purchase drivers (utility range method)</li>
                    <li><strong>Price Sensitivity:</strong> Understanding price-utility tradeoffs across customers</li>
                    <li><strong>Segmentation:</strong> Clustering customers by preference patterns using K-means</li>
                    <li><strong>Market Simulation:</strong> Predicting share for any product configuration</li>
                    <li><strong>WTP Analysis:</strong> Converting utility to dollars (WTP = -ΔU / β_price)</li>
                    <li><strong>IIA & Limitations:</strong> Knowing when to trust (and question) MNL results</li>
                </ul>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    This tool implements individual-level MNL with L2 regularization—a solid, practical approach. But real-world conjoint projects often require more: <strong>Hierarchical Bayes (HB)</strong> estimation pools information across respondents for more stable individual estimates, especially with sparse data. <strong>Mixed Logit</strong> allows random coefficients that capture preference heterogeneity without forcing discrete segments. <strong>Latent Class MNL</strong> simultaneously estimates segments and within-segment utilities. For IIA concerns, <strong>Nested Logit</strong> or <strong>Cross-Nested Logit</strong> models can capture substitution patterns among similar products. Industry tools like Sawtooth Lighthouse, XLSTAT, or R's mlogit/apollo packages offer these extensions. As you advance, remember that model complexity should match business need—a well-interpreted MNL often beats a poorly-understood HB model. The best analysts know when simpler is better.
                </p>
                
                <h4>🎯 Next Steps</h4>
                <ol>
                    <li>Try different simulation scenarios and compare price-share tradeoffs</li>
                    <li>Run segmentation with different k values — do segments make business sense?</li>
                    <li>Explore the Product Optimization feature to find profit-maximizing configs</li>
                    <li>Download individual-level utilities and analyze in Excel or R</li>
                </ol>
                
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Explore our other advanced analytics tools! Try <strong>K-Means Clustering</strong> for preference-based segmentation on your own data, or <strong>Multinomial Logistic Regression</strong> to predict category choices from covariates. For pricing analysis, check out the <strong>Price Elasticity</strong> tools.
                </p>
            `,
            quizzes: [
                {
                    question: "A marketing director asks: 'Should we add a premium camera feature costing $30?' How does conjoint help?",
                    options: [
                        "Survey customers directly if they want it",
                        "Calculate camera importance + WTP, compare WTP to $30 cost",
                        "Look at competitor products"
                    ],
                    answer: 1,
                    feedback: "Perfect! Conjoint provides data-driven answers: (1) Importance shows if camera matters, (2) WTP shows what customers will pay, (3) Compare WTP to cost for ROI. If WTP > $30, the feature is profitable!"
                }
            ],
            check: () => true
        }
    ],

    // ═══════════════════════════════════════════════════════════════
    // TUTORIAL ENGINE METHODS
    // ═══════════════════════════════════════════════════════════════
    
    init() {
        this.renderSidebar();
        this.renderOverlay();
        this.attachListeners();
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.tutorialStartTime = new Date();
        this.tutorialCompleted = false;
        this.initialSimResults = null;
        this.priceChangeSimResults = null;
        
        // Reset quiz states
        this.steps.forEach(step => {
            step.quizState = null;
        });
        
        document.getElementById('tutorial-sidebar').classList.add('active');
        this.updateView();
        
        // Log tutorial start
        if (typeof logToolRunToBackend === 'function') {
            logToolRunToBackend(
                { action: 'tutorial_started', tool: 'conjoint-analysis', steps: this.steps.length },
                'Professor Mode tutorial started for Conjoint Analysis'
            );
        }
    },

    stop() {
        this.isActive = false;
        document.getElementById('tutorial-sidebar').classList.remove('active');
        this.hideOverlay();
        
        if (this.currentStep === this.steps.length - 1) {
            this.tutorialCompleted = true;
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend(
                    { action: 'tutorial_completed', tool: 'conjoint-analysis', stepsCompleted: this.currentStep + 1 },
                    'Professor Mode tutorial completed for Conjoint Analysis'
                );
            }
        }
        
        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.currentHighlight = null;
            this.lastCheckResult = null;
            this.updateView();
        }
    },

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.currentHighlight = null;
            this.lastCheckResult = null;
            this.updateView();
        }
    },

    updateView() {
        const step = this.steps[this.currentStep];
        
        // Handle dynamic content
        if (step.getDynamicContent && typeof step.getDynamicContent === 'function') {
            step.content = step.getDynamicContent();
        }
        
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        
        step.currentQuizzes = quizzes;
        
        if (!step.quizState || step.quizState.length !== quizzes.length) {
            step.quizState = quizzes.map(() => ({ completed: false }));
        }
        
        const sidebarContent = document.getElementById('tutorial-content');
        if (!sidebarContent) return;
        
        let quizHtml = '';
        if (quizzes && quizzes.length > 0) {
            quizHtml = quizzes.map((quiz, qIndex) => {
                const isCompleted = step.quizState[qIndex].completed;
                
                if (!isCompleted) {
                    return `
                        <div class="tutorial-quiz" id="quiz-${qIndex}" style="background: #fff7ed; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                            <h4 style="margin-top: 0; color: #9a3412;">🤔 Quick Check ${qIndex + 1}</h4>
                            <p style="margin-bottom: 10px; font-weight: 500;">${quiz.question}</p>
                            <div class="quiz-options">
                                ${quiz.options.map((opt, i) => `
                                    <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="ConjointTutorial.checkQuiz(${qIndex}, this.value)">
                                        ${opt}
                                    </label>
                                `).join('')}
                            </div>
                            <div id="quiz-feedback-${qIndex}" style="margin-top: 10px; font-weight: bold; display: none;"></div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="tutorial-quiz" style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #10b981;">
                            <h4 style="margin-top: 0; color: #10b981;">✅ Quick Check ${qIndex + 1} Passed</h4>
                            <p style="margin-bottom: 0; color: #065f46;">${quiz.feedback}</p>
                        </div>
                    `;
                }
            }).join('');
        }
        
        const isTaskComplete = step.check ? step.check() : true;
        const areQuizzesComplete = !quizzes || quizzes.length === 0 || (step.quizState && step.quizState.every(q => q.completed));
        const canProceed = isTaskComplete && areQuizzesComplete;
        
        sidebarContent.innerHTML = `
            <div class="tutorial-step-badge" style="display: flex; justify-content: space-between; align-items: center;">
                <span>Step ${this.currentStep + 1}/${this.steps.length}</span>
                <span style="font-size: 0.8em; color: #6b7280;">${Math.round((this.currentStep + 1) / this.steps.length * 100)}% complete</span>
            </div>
            
            <div style="background: #e5e7eb; height: 4px; border-radius: 2px; margin: 10px 0;">
                <div style="background: #3b82f6; height: 100%; width: ${(this.currentStep + 1) / this.steps.length * 100}%; border-radius: 2px; transition: width 0.3s;"></div>
            </div>
            
            <h3 style="margin-top: 10px; margin-bottom: 15px;">${step.title}</h3>
            <div class="tutorial-body">${step.content}</div>
            
            ${quizHtml}
            
            <div class="tutorial-progress-container" style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e5e7eb;">
                ${step.check ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: ${quizzes && quizzes.length > 0 ? '8px' : '0'};">
                        ${this.getCheckmark(isTaskComplete)}
                        <span style="${isTaskComplete ? 'color: #10b981; font-weight: 600;' : 'color: #9ca3af;'}">
                            ${isTaskComplete ? "Task Complete" : "Pending Task..."}
                        </span>
                    </div>
                ` : ''}
                
                ${quizzes && quizzes.length > 0 ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px;">
                        ${this.getCheckmark(areQuizzesComplete)}
                        <span style="${areQuizzesComplete ? 'color: #10b981; font-weight: 600;' : 'color: #9ca3af;'}">
                            ${areQuizzesComplete ? "Quiz Complete" : `Quiz: ${step.quizState.filter(q => q.completed).length}/${quizzes.length}`}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 10px;">
                ${this.currentStep > 0 ? 
                    `<button class="btn-secondary" onclick="ConjointTutorial.previousStep()" style="flex: 1;">← Back</button>` : 
                    ''}
                ${canProceed ?
                    (this.currentStep === this.steps.length - 1 ?
                        `<button class="btn-primary" onclick="ConjointTutorial.stop()" style="flex: 2;">🎓 Finish Tutorial</button>` :
                        `<button class="btn-primary" onclick="ConjointTutorial.nextStep()" style="flex: 2;">Next Step →</button>`
                    ) :
                    `<button class="btn-secondary" disabled style="flex: 2;">Complete to continue</button>`
                }
            </div>
            
            <button class="btn-secondary" onclick="ConjointTutorial.stop()" style="width: 100%; margin-top: 10px; font-size: 0.85em; opacity: 0.7;">Exit Tutorial</button>
        `;
        
        this.highlightElement(step.targetId);
        
        if (step.onEnter) {
            step.onEnter();
        }
    },

    checkStep() {
        const step = this.steps[this.currentStep];
        if (step.check) {
            return step.check();
        }
        return true;
    },

    checkQuiz(qIndex, selectedValue) {
        const step = this.steps[this.currentStep];
        const quizzes = step.currentQuizzes || step.quizzes || [];
        
        if (qIndex >= quizzes.length) return;
        
        const quiz = quizzes[qIndex];
        const isCorrect = parseInt(selectedValue) === quiz.answer;
        
        const feedbackEl = document.getElementById(`quiz-feedback-${qIndex}`);
        
        if (isCorrect) {
            step.quizState[qIndex].completed = true;
            feedbackEl.innerHTML = `<span style="color: #10b981;">✅ Correct! ${quiz.feedback}</span>`;
            feedbackEl.style.display = 'block';
            
            document.querySelectorAll(`input[name="quiz_q_${this.currentStep}_${qIndex}"]`).forEach(input => {
                input.disabled = true;
            });
            
            setTimeout(() => this.updateView(), 300);
        } else {
            feedbackEl.innerHTML = `<span style="color: #ef4444;">❌ Not quite. Try again!</span>`;
            feedbackEl.style.display = 'block';
        }
    },

    getCheckmark(completed) {
        return completed ?
            '<span style="color: #10b981; font-size: 1.2em;">✅</span>' :
            '<span style="color: #9ca3af; font-size: 1.2em;">⬜</span>';
    },

    checkProgress() {
        if (!this.isActive) return;
        
        const step = this.steps[this.currentStep];
        const wasComplete = this.lastCheckResult;
        const isNowComplete = step.check ? step.check() : true;
        
        if (wasComplete !== isNowComplete) {
            this.lastCheckResult = isNowComplete;
            this.updateView();
        }
    },

    highlightElement(targetId) {
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
        }
        
        if (targetId) {
            this.showOverlay();
            const element = document.getElementById(targetId);
            if (element) {
                element.classList.add('tutorial-highlight');
                this.currentHighlight = element;
            }
        } else {
            this.hideOverlay();
        }
    },

    showOverlay() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.add('active');
    },

    hideOverlay() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.remove('active');
        
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight = null;
        }
    },

    renderSidebar() {
        if (document.getElementById('tutorial-sidebar')) return;
        
        const sidebar = document.createElement('div');
        sidebar.id = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>🎓 Professor Mode</h2>
                <button onclick="ConjointTutorial.stop()" class="close-tutorial">×</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(sidebar);
    },

    renderOverlay() {
        if (document.getElementById('tutorial-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        document.body.appendChild(overlay);
    },

    attachListeners() {
        const toggle = document.getElementById('professorMode');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.start();
                } else {
                    this.stop();
                }
            });
        }
        
        setInterval(() => this.checkProgress(), 500);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => ConjointTutorial.init(), 500);
});
