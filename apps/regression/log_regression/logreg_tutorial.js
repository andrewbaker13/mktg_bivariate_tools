/**
 * Logistic Regression Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const LogregTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,  // Track current highlighted element
    
    // Configuration
    config: {
        targetScenario: 'promo_incentive',
        minPredictors: 2
    },

    // Tutorial Steps
    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to Logistic Regression for Marketing",
            targetId: null,
            content: `
                <p>Welcome! Today we're going to build a foundational understanding of <strong>Logistic Regression</strong> by working through a real marketing problem.</p>
                <p><strong>The Mission:</strong> Your company is testing <strong>promotional incentives</strong> (discounts) to increase conversion rates. We need to predict <strong>WHO will convert</strong> based on promo amount, email engagement, and purchase history.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Loading Marketing Data</li>
                    <li>Selecting Variables</li>
                    <li>Fitting the Model</li>
                    <li>Interpreting Coefficients</li>
                    <li>Evaluating Performance</li>
                    <li>Making Business Decisions</li>
                </ol>
                <p><strong>Why Logistic Regression?</strong> Unlike regular regression, logistic regression predicts <em>probabilities</em> for binary outcomes (convert/don't convert, click/don't click). It's perfect for marketing questions!</p>
            `,
            quizzes: [
                {
                    question: "What type of outcome does logistic regression predict?",
                    options: ["Continuous numbers (like revenue)", "Binary outcomes (like yes/no)", "Text labels"],
                    answer: 1,
                    feedback: "Correct! Logistic regression is designed for binary (two-category) outcomes."
                }
            ],
            check: () => true
        },
        {
            id: 'load_scenario',
            title: "📊 Step 1: Understanding Your Data",
            targetId: 'scenario-section',
            content: `
                <p>Every analysis starts with data. We're using real marketing experiment data where customers received different promotional offers.</p>
                <p><strong>The Dataset:</strong></p>
                <ul>
                    <li><strong>Promo Amount:</strong> Discount value offered ($)</li>
                    <li><strong>Email Engagement:</strong> Did they open marketing emails?</li>
                    <li><strong>Prior Purchases:</strong> How many times they bought before</li>
                    <li><strong>Converted:</strong> Did they convert this time? (1=Yes, 0=No)</li>
                </ul>
                <p>Each row represents one customer. We'll use their characteristics to predict conversion probability.</p>
                <p class="task">👉 <strong>Task:</strong> Select <strong>"Promo Incentive A/B Test"</strong> from the scenario dropdown above.</p>
            `,
            quizzes: [
                {
                    question: "In this dataset, what does a row with 'Converted = 1' mean?",
                    options: ["The customer didn't buy", "The customer made a purchase", "The data is corrupted"],
                    answer: 1,
                    feedback: "Exactly! '1' is our success outcome - the customer converted."
                }
            ],
            check: () => {
                // Check if promo incentive scenario is loaded
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value && scenarioSelect.value.toLowerCase().includes('promo');
            },
            onEnter: () => {
                const section = document.querySelector('.scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'variable_assignment',
            title: "🎯 Step 2: Assign Outcome & Predictors",
            targetId: 'variable-selection-panel',
            content: `
                <p>Logistic regression needs YOU to specify:</p>
                <ul>
                    <li><strong>Outcome (Y):</strong> What we're trying to predict - MUST be binary (two categories like yes/no, 0/1)</li>
                    <li><strong>Predictors (X):</strong> Variables we think influence the outcome (can be numeric or categorical)</li>
                </ul>
                <p><strong>Good news:</strong> Predictors are already selected by default for this scenario, so you can focus on understanding how to configure them for proper interpretation.</p>
                <p><strong>Critical for A/B Tests:</strong> The <strong>high_incentive</strong> variable represents your treatment (1 = high promo, 0 = standard). Even though it's coded as 0/1, it should be treated as <strong>categorical</strong> (not numeric) because it represents two distinct groups, not a continuous scale.</p>
                <p class="task">👉 <strong>Task:</strong></p>
                <ol>
                    <li>Verify <strong>"converted"</strong> is selected as your Outcome variable</li>
                    <li>Confirm <strong>high_incentive</strong> is selected as a predictor</li>
                    <li><strong>Change high_incentive from "numeric" to "categorical"</strong> using the dropdown next to it</li>
                    <li>Set the <strong>reference level to "0"</strong> (this is your control/baseline group)</li>
                    <li>Verify at least one more predictor is selected (e.g., prior_purchases, days_since_visit)</li>
                </ol>
                <p style="background: #fef3c7; padding: 10px; border-left: 3px solid #f59e0b; border-radius: 4px; margin-top: 10px;">⚠️ <strong>Why this matters:</strong> Setting reference=0 means coefficients will show the effect of the HIGH incentive compared to the STANDARD offer. This makes interpretation intuitive for business decisions!</p>
            `,
            quizzes: [
                {
                    question: "Why do we treat 'high_incentive' as categorical instead of numeric?",
                    options: ["Because it represents two distinct treatment groups, not a continuous measurement", "Because the tool requires it", "It doesn't matter either way"],
                    answer: 0,
                    feedback: "Correct! Even though coded 0/1, this is a treatment indicator for an A/B test. Categorical treatment captures the group comparison properly."
                },
                {
                    question: "What does setting reference='0' mean for high_incentive?",
                    options: ["The coefficient will compare high incentive (1) vs. standard offer (0)", "It removes that variable", "It sets all values to zero"],
                    answer: 0,
                    feedback: "Exactly! Reference='0' makes the standard offer your baseline. The coefficient for high_incentive=1 shows how much MORE effective the high promo is compared to standard."
                }
            ],
            check: () => {
                // Check if outcome and predictors are selected
                const outcomeOk = window.selectedOutcome !== null && 
                       window.selectedOutcome !== undefined;
                
                const predictorsOk = window.selectedPredictors && 
                       Array.isArray(window.selectedPredictors) &&
                       window.selectedPredictors.length >= 2;
                
                // Check if high_incentive is included and set as categorical with ref=0
                const hasHighIncentive = window.selectedPredictors && 
                                        window.selectedPredictors.some(p => p.toLowerCase().includes('incentive') || p.toLowerCase().includes('high'));
                
                const highIncentiveCategorical = hasHighIncentive && window.predictorSettings &&
                    Object.keys(window.predictorSettings).some(key => {
                        if (key.toLowerCase().includes('incentive') || key.toLowerCase().includes('high')) {
                            const setting = window.predictorSettings[key];
                            return setting && setting.type === 'categorical' && 
                                   (setting.reference === '0' || setting.reference === 0);
                        }
                        return false;
                    });
                
                return outcomeOk && predictorsOk && highIncentiveCategorical;
            },
            onEnter: () => {
                const panel = document.getElementById('variable-selection-panel');
                if (panel) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },
        {
            id: 'fit_model',
            title: "🧮 Step 3: Fit the Model",
            targetId: 'model-metrics-panel',
            content: `
                <p>Now comes the magic! We fit the model using <strong>Maximum Likelihood Estimation (MLE)</strong>.</p>
                <p><strong>How it works:</strong> The algorithm tries millions of coefficient combinations to find the ones that best explain who converted vs. who didn't in your data.</p>
                <p><strong>Understanding the metrics:</strong> There are many different metrics used to evaluate model fit in logistic regression. The metrics shown here represent some of the most common ones. While they differ in formulation and emphasis, they are all attempting to answer a similar question: <em>How well does the model fit the observed data, based on different criteria?</em></p>
                <p>Watch for these key metrics in the highlighted panel:</p>
                <ul>
                    <li><strong>Log-likelihood:</strong> Measures how well the model fits the data. Values are typically negative; higher values (closer to zero) indicate better fit.</li>
                    <li><strong>Model chi-square & p-value:</strong> Tests whether your model is statistically significant</li>
                    <li><strong>Pseudo R²:</strong> Rough measure of model fit (0-1 scale, ~0.2-0.4 is often good)</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> The model should fit automatically. Look at the highlighted <strong>Model Metrics</strong> panel and verify that values appear for Model p-value and Pseudo R².</p>
            `,
            getDynamicQuizzes: () => {
                const model = window.lastModel;
                
                // If no model, return fallback questions
                if (!model) return null;
                
                // Try to get p-value - check multiple possible property names
                const pValue = model.modelPValue ?? model.pValue ?? model.p_value ?? model.modelP ?? model.chiSquarePValue;
                
                // Try to get pseudo R2 - check multiple possible property names  
                const pseudoR2 = model.pseudoR2 ?? model.mcFaddenR2 ?? model.pseudo_r2 ?? model.r2_mcfadden;
                
                // If we don't have the required data, use fallback
                if (pValue === undefined || pseudoR2 === undefined) return null;
                
                const pValueDisplay = pValue < 0.001 ? "< 0.001" : pValue.toFixed(3);
                const isSignificant = pValue < 0.05;
                const pseudoR2Display = pseudoR2.toFixed(3);
                
                return [
                    {
                        question: `Look at the 'Model p-value' in the metrics panel. What value do you see?`,
                        options: ["Greater than 0.10", pValueDisplay, "Exactly 1.0"],
                        answer: 1,
                        feedback: `Correct! The model p-value is ${pValueDisplay}.`
                    },
                    {
                        question: `With a model p-value of ${pValueDisplay}, is this model statistically significant at α=0.05?`,
                        options: [
                            isSignificant ? "Yes, p < 0.05 means the model is significant" : "No, p ≥ 0.05 means not significant",
                            isSignificant ? "No, it's not significant" : "Yes, it's significant",
                            "Can't tell from p-value"
                        ],
                        answer: 0,
                        feedback: isSignificant ? 
                            "Perfect! A significant model p-value means your predictors significantly improve predictions vs. random guessing." :
                            "Correct. With p ≥ 0.05, we cannot conclude the model performs better than a baseline."
                    },
                    {
                        question: `What is the Pseudo R² value shown in the metrics panel?`,
                        options: [
                            `About ${(pseudoR2 * 0.5).toFixed(3)}`,
                            `About ${pseudoR2Display}`,
                            `About ${(pseudoR2 * 2).toFixed(3)}`
                        ],
                        answer: 1,
                        feedback: `Correct! The Pseudo R² is ${pseudoR2Display}. ${pseudoR2 >= 0.4 ? "This indicates strong model fit." : pseudoR2 >= 0.2 ? "This is considered a reasonable fit for logistic regression." : "This is relatively low, but still may indicate meaningful effects."}`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Look at the Model Metrics panel. Which metric tests whether the model is statistically significant?",
                    options: ["Model p-value", "Log-likelihood", "Number of observations"],
                    answer: 0,
                    feedback: "Correct! The model p-value tests whether your predictors significantly improve predictions compared to random guessing. If p < 0.05, the model is statistically significant."
                },
                {
                    question: "What does Pseudo R² measure?",
                    options: ["Approximate model fit quality (0-1 scale, higher is better)", "The exact number of correct predictions", "The model runtime"],
                    answer: 0,
                    feedback: "Correct! Pseudo R² is analogous to R² in linear regression. Values around 0.2-0.4 are often considered good for logistic regression."
                },
                {
                    question: "Log-likelihood values are typically negative. What indicates better model fit?",
                    options: ["Values closer to zero (e.g., -50 is better than -100)", "More negative values", "Positive values"],
                    answer: 0,
                    feedback: "Correct! Since log-likelihood is negative, values closer to zero indicate better fit. For example, -50 is better than -100."
                }
            ],
            check: () => {
                // Check if model has been fitted
                return window.lastModel !== null && 
                       window.lastModel !== undefined &&
                       window.lastModel.terms && 
                       Array.isArray(window.lastModel.terms) &&
                       window.lastModel.terms.length > 0;
            },
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                // Trigger model fitting if data is ready but not yet fitted
                setTimeout(() => {
                    if (!window.lastModel && window.selectedOutcome && window.selectedPredictors?.length > 0) {
                        const updateBtn = document.querySelector('button[onclick*="updateResults"]');
                        if (updateBtn) updateBtn.click();
                    }
                }, 500);
            }
        },
        {
            id: 'interpret_coefficients',
            title: "📈 Step 4: Reading the Results",
            targetId: 'coefficient-estimates-card',
            content: `
                <p>Great! Your model is fitted. Now let's interpret what it means for your business.</p>
                <p>Look at the <strong>Coefficient Estimates</strong> table. Each row shows one predictor with several statistics:</p>
                <p><strong>Estimate (Log-Odds):</strong> The raw coefficient from the model.</p>
                <ul>
                    <li>A <strong>positive</strong> estimate indicates that increases in this predictor are associated with an <strong>increased likelihood of conversion</strong>.</li>
                    <li>A <strong>negative</strong> estimate indicates that increases in this predictor are associated with a <strong>decreased likelihood of conversion</strong>.</li>
                    <li>The interpretation references the <strong>specific variable</strong> being examined (e.g., "days_since_visit").</li>
                </ul>
                <p><strong>Odds Ratio (OR):</strong> Much easier to interpret than log-odds!</p>
                <ul>
                    <li>An OR > 1.0 means this predictor <strong>increases odds of conversion</strong>.</li>
                    <li>An OR < 1.0 means this predictor <strong>decreases odds of conversion</strong>.</li>
                    <li>Example: OR = 1.25 means the odds increase by 25%. OR = 0.80 means the odds decrease by 20%.</li>
                    <li>The percent change is calculated directly from the actual odds ratio shown in the table.</li>
                </ul>
                <p><strong>p-value:</strong> Statistical significance for this specific predictor.</p>
                <ul>
                    <li>Tests whether the observed effect for <strong>this predictor</strong> likely reflects a real relationship vs. random noise.</li>
                    <li>p < 0.05 generally indicates the predictor has a statistically reliable effect.</li>
                    <li>This is about <strong>variable-level inference</strong>, not overall model fit.</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Look at the highlighted table and locate the row for <strong>"days_since_visit"</strong> (or "days_since_last_visit"). Note its Odds Ratio and p-value.</p>
            `,
            getDynamicQuizzes: () => {
                const model = window.lastModel;
                if (!model || !model.terms) return [];
                
                // Find days_since_visit term
                const daysTerm = model.terms.find(t => 
                    (t.predictor && t.predictor.toLowerCase().includes('days')) ||
                    (t.term && t.term.toLowerCase().includes('days'))
                );
                
                if (!daysTerm) return [];
                
                const daysOR = Math.exp(daysTerm.estimate);
                const daysORDisplay = daysOR.toFixed(3);
                const daysPValue = daysTerm.p;
                const daysPDisplay = daysPValue < 0.001 ? "< 0.001" : daysPValue.toFixed(3);
                const isSig = daysPValue < 0.05;
                const daysName = daysTerm.term || daysTerm.predictor;
                
                const direction = daysOR > 1.0 ? "increase" : "decrease";
                const pctChange = Math.abs((daysOR - 1.0) * 100).toFixed(1);
                
                return [
                    {
                        question: `Look at the table. What is the Odds Ratio for '${daysName}'?`,
                        options: [
                            `About ${(daysOR * 0.5).toFixed(3)}`, 
                            `About ${daysORDisplay}`, 
                            `About ${(daysOR * 1.5).toFixed(3)}`
                        ],
                        answer: 1,
                        feedback: `Correct! The OR is ${daysORDisplay}. This means each additional day since last visit is associated with a ${pctChange}% ${direction} in the odds of conversion.`
                    },
                    {
                        question: `What does the OR for '${daysName}' tell you about the direction of the effect?`,
                        options: [
                            daysOR > 1.0 ? "More days since visit → higher conversion odds" : "More days since visit → lower conversion odds",
                            daysOR > 1.0 ? "More days since visit → lower conversion odds" : "More days since visit → higher conversion odds",
                            "It has no effect on conversion"
                        ],
                        answer: 0,
                        feedback: daysOR > 1.0 ? 
                            `Correct! OR > 1.0 means increases in days_since_visit are associated with increased conversion likelihood.` :
                            `Correct! OR < 1.0 means increases in days_since_visit are associated with decreased conversion likelihood (more recent visitors are more likely to convert).`
                    }
                ];
            },
            quizzes: [], // Will be populated dynamically
            check: () => {
                return window.lastModel !== null && 
                       window.lastModel !== undefined &&
                       window.lastModel.terms && 
                       Array.isArray(window.lastModel.terms) &&
                       window.lastModel.terms.length > 0;
            },
            onEnter: () => {
                const card = document.getElementById('coefficient-estimates-card');
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },
        {
            id: 'classification_performance',
            title: "✅ Step 5: How Good Are Our Predictions?",
            targetId: 'confusion-matrix-card',
            content: `
                <p>Coefficients tell us WHAT matters. But how ACCURATE is the model at actually predicting conversions?</p>
                <p><strong>The Confusion Matrix</strong> shows classification results:</p>
                <ul>
                    <li><strong>True Positives:</strong> Correctly predicted conversions</li>
                    <li><strong>False Positives:</strong> Predicted conversion, but customer didn't convert (Type I error)</li>
                    <li><strong>False Negatives:</strong> Missed a conversion (Type II error)</li>
                    <li><strong>True Negatives:</strong> Correctly predicted non-conversion</li>
                </ul>
                <p><strong>Classification Performance Metrics:</strong> Below the confusion matrix, you'll see key performance metrics including accuracy, sensitivity, specificity, and precision.</p>
                <p class="task">👉 <strong>Task:</strong> Look at the highlighted <strong>Confusion Matrix</strong> and the <strong>Classification Performance</strong> metrics below it. Note the values for accuracy and false negatives.</p>
            `,
            getDynamicQuizzes: () => {
                const model = window.lastModel;
                
                if (!model || !model.confusionMatrix) return null;
                
                const cm = model.confusionMatrix;
                // Confusion matrix structure: cm[actual][predicted]
                // cm[0][0] = True Negatives, cm[0][1] = False Positives
                // cm[1][0] = False Negatives, cm[1][1] = True Positives
                
                const trueNeg = cm[0] && cm[0][0] !== undefined ? cm[0][0] : 0;
                const falsePos = cm[0] && cm[0][1] !== undefined ? cm[0][1] : 0;
                const falseNeg = cm[1] && cm[1][0] !== undefined ? cm[1][0] : 0;
                const truePos = cm[1] && cm[1][1] !== undefined ? cm[1][1] : 0;
                
                const total = trueNeg + falsePos + falseNeg + truePos;
                const falseNegPercent = total > 0 ? ((falseNeg / total) * 100).toFixed(1) : 0;
                
                const accuracy = model.accuracy !== undefined ? model.accuracy : 
                                 (total > 0 ? (truePos + trueNeg) / total : 0);
                const accuracyPercent = (accuracy * 100).toFixed(1);
                
                return [
                    {
                        question: `Looking at the confusion matrix, what percentage of all predictions are False Negatives (missed conversions)?`,
                        options: [
                            `About ${(parseFloat(falseNegPercent) * 0.5).toFixed(1)}%`,
                            `About ${falseNegPercent}%`,
                            `About ${(parseFloat(falseNegPercent) * 1.5).toFixed(1)}%`
                        ],
                        answer: 1,
                        feedback: `Correct! False Negatives represent ${falseNegPercent}% of all predictions. These are the cases where we predicted no conversion (0) but the customer actually converted (1).`
                    },
                    {
                        question: `What is the overall accuracy rate shown in the Classification Performance metrics?`,
                        options: [
                            `About ${(parseFloat(accuracyPercent) - 10).toFixed(1)}%`,
                            `About ${accuracyPercent}%`,
                            `About ${(parseFloat(accuracyPercent) + 10).toFixed(1)}%`
                        ],
                        answer: 1,
                        feedback: `Correct! The model achieves ${accuracyPercent}% accuracy, meaning it correctly classifies ${accuracyPercent}% of all cases.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does the Confusion Matrix show?",
                    options: [
                        "How the model's predictions compare to actual outcomes (correct vs. incorrect classifications)",
                        "The correlation between all variables",
                        "The model coefficients"
                    ],
                    answer: 0,
                    feedback: "Correct! The confusion matrix shows true positives, true negatives, false positives, and false negatives - giving you a complete picture of classification accuracy."
                },
                {
                    question: "In the Classification Performance metrics, what does 'Accuracy' measure?",
                    options: [
                        "The percentage of all predictions that are correct",
                        "Only the percentage of positive predictions",
                        "The model's p-value"
                    ],
                    answer: 0,
                    feedback: "Correct! Accuracy = (True Positives + True Negatives) / Total Predictions. It tells you what proportion of all cases were classified correctly."
                }
            ],
            check: () => {
                return window.lastModel !== null && window.lastModel !== undefined;
            },
            onEnter: () => {
                const card = document.getElementById('confusion-matrix-card');
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business_insights',
            title: "💡 Step 6: Visualizing Predicted Probabilities",
            targetId: 'predicted-probabilities-section',
            content: `
                <p>This is where statistics become actionable insights! The <strong>Predicted Probabilities vs. Focal Predictor</strong> visualization shows how changing one predictor (while holding others constant) affects conversion probability.</p>
                <p><strong>How to use this chart:</strong></p>
                <ul>
                    <li>Use the dropdown to select a predictor as "focal" (the variable you want to examine)</li>
                    <li>The chart shows how predicted conversion probability changes across that predictor's range</li>
                    <li>Shaded confidence bands show statistical uncertainty</li>
                    <li>You can toggle between different focal predictors to compare their effects</li>
                </ul>
                <p><strong>Part 1: Examining the Treatment Effect</strong></p>
                <p class="task">👉 <strong>Task:</strong> Set the focal predictor to <strong>"high_incentive"</strong> using the dropdown menu in the highlighted section. Observe how predicted conversion probability differs between the two incentive levels.</p>
            `,
            quizzes: [
                {
                    question: "Looking at the predicted probabilities chart with 'high_incentive' as the focal predictor, what does the chart show?",
                    options: [
                        "The difference in conversion probability between high incentive (1) and standard offer (0)",
                        "The total number of conversions",
                        "The correlation between all variables"
                    ],
                    answer: 0,
                    feedback: "Correct! The chart compares predicted conversion probability for the two treatment groups, showing the effect of the incentive offer."
                },
                {
                    question: "Why do we examine predicted probabilities instead of just looking at coefficients?",
                    options: [
                        "Predicted probabilities are easier to communicate to business stakeholders than log-odds",
                        "Coefficients are always wrong",
                        "It looks more impressive"
                    ],
                    answer: 0,
                    feedback: "Exactly! Predicted probabilities translate statistical results into intuitive percentages that business teams can use for decision-making."
                }
            ],
            check: () => {
                // Check if focal predictor has been set (any value)
                const focalSelect = document.getElementById('effect-focal-select');
                return focalSelect && focalSelect.value && focalSelect.value !== '';
            },
            onEnter: () => {
                const section = document.getElementById('predicted-probabilities-section') || document.getElementById('plot-effect')?.closest('.chart-card');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'days_since_visit_focal',
            title: "📅 Step 7: Examining Time-Based Effects",
            targetId: 'predicted-probabilities-section',
            content: `
                <p>Now let's explore how the time since last visit affects conversion probability.</p>
                <p><strong>Part 2: Understanding Customer Recency</strong></p>
                <p class="task">👉 <strong>Task:</strong> Change the focal predictor to <strong>"days_since_visit"</strong> (or "days_since_last_visit") using the dropdown menu. Observe how predicted conversion probability changes as time since last visit increases.</p>
            `,
            quizzes: [
                {
                    question: "When examining 'days_since_visit' as the focal predictor, what does the slope of the line tell you?",
                    options: [
                        "Whether conversion probability increases or decreases as time passes since last visit",
                        "The total number of visits",
                        "The exact date of the last visit"
                    ],
                    answer: 0,
                    feedback: "Correct! A downward slope means recent visitors are more likely to convert; an upward slope would suggest customers who haven't visited recently are more likely to convert."
                },
                {
                    question: "Why is understanding the 'days_since_visit' effect valuable for marketing strategy?",
                    options: [
                        "It helps determine optimal timing for re-engagement campaigns",
                        "It's not valuable at all",
                        "It only matters for email design"
                    ],
                    answer: 0,
                    feedback: "Exactly! If recent visitors are more likely to convert, you should prioritize timely follow-up. If lapsed customers show higher conversion probability, you may need re-engagement campaigns."
                }
            ],
            check: () => {
                // Check if days_since_visit has been selected as focal
                const focalSelect = document.getElementById('effect-focal-select');
                return focalSelect && focalSelect.value && focalSelect.value.toLowerCase().includes('days');
            },
            onEnter: () => {
                const section = document.getElementById('predicted-probabilities-section') || document.getElementById('plot-effect')?.closest('.chart-card');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎓 Professor Mode: Foundations Complete",
            targetId: null,
            content: `
                <p>Well done! You've worked through the foundational steps of building and interpreting a logistic regression model for marketing.</p>
                
                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>Logistic Regression</strong> predicts probabilities for binary outcomes</li>
                    <li><strong>Model Significance</strong> tests whether predictors improve predictions vs. random guessing</li>
                    <li><strong>Odds Ratios</strong> quantify how much each factor influences conversion likelihood</li>
                    <li><strong>p-values</strong> help assess which effects are statistically reliable</li>
                    <li><strong>Confusion Matrix</strong> shows how well the model classifies actual outcomes</li>
                    <li><strong>Predicted Probability Plots</strong> show how different predictors influence conversion</li>
                </ul>
                
                <h4>🔍 Important Note</h4>
                <p>This tutorial provides an <strong>introductory understanding</strong> of logistic regression. Additional topics like ROC curves, model comparison, interaction effects, and advanced diagnostics are available in the tool but not yet covered in Professor Mode.</p>
                
                <h4>🎓 Continue Exploring</h4>
                <ul>
                    <li>Experiment with different predictor combinations</li>
                    <li>Try adjusting confidence levels (90% vs 95% vs 99%)</li>
                    <li>Explore the ROC curve, variable importance plot, and other visualizations</li>
                    <li>Review the interpretation aids throughout the interface for deeper insights</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    This is just the beginning of your journey with logistic regression. Explore other marketing analytics tools on the site to continue building your skillset!
                </p>
            `,
            check: () => true,
            onEnter: () => {
                LogregTutorial.hideOverlay();
                // Scroll to top to show full completion message
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    ],

    init() {
        this.renderSidebar();
        this.renderOverlay();
        this.attachListeners();
        
        // Check initial state
        const checkbox = document.getElementById('professorMode');
        if (checkbox && checkbox.checked) {
            this.start();
        }
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.lastCheckResult = null;  // Initialize check tracking
        document.body.classList.add('tutorial-active');
        document.getElementById('tutorial-sidebar').classList.add('active');
        
        this.updateView();
    },

    stop() {
        this.isActive = false;
        document.body.classList.remove('tutorial-active');
        document.getElementById('tutorial-sidebar').classList.remove('active');
        this.hideOverlay();
        
        // Track completion if student finished all steps (reached final step)
        if (this.currentStep === this.steps.length - 1) {
            // Log tutorial completion for analytics
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend(
                    { action: 'tutorial_completed', tool: 'log_regression' },
                    'Professor Mode tutorial completed for logistic regression'
                );
            }
        }
        
        // Uncheck the box
        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.currentHighlight = null;  // Reset highlight tracking when moving to new step
            this.lastCheckResult = null;  // Reset check tracking for new step
            this.updateView();
        }
    },

    updateView() {
        const step = this.steps[this.currentStep];
        
        // Get dynamic quizzes if available
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        
        // Store the current quizzes on the step for consistency
        step.currentQuizzes = quizzes;
        
        // Update Sidebar
        const sidebarContent = document.getElementById('tutorial-content');
        
        let quizHtml = '';
        if (quizzes && quizzes.length > 0) {
            // Initialize quiz state if needed
            if (!step.quizState || step.quizState.length !== quizzes.length) {
                step.quizState = quizzes.map(() => ({ completed: false }));
            }

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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="LogregTutorial.checkQuiz(${qIndex}, this.value)">
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
            <div class="tutorial-step-badge">Step ${this.currentStep + 1}/${this.steps.length}</div>
            <h3 style="margin-top: 10px; margin-bottom: 15px;">${step.title}</h3>
            <div class="tutorial-body">${step.content}</div>
            
            ${quizHtml}

            <div class="tutorial-progress-container" style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e5e7eb;">
                ${step.check ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: ${quizzes && quizzes.length > 0 ? '8px' : '0'};">
                        ${this.getCheckmark(isTaskComplete)} 
                        <span style="${isTaskComplete ? 'color: #10b981; font-weight: 600;' : 'color: #9ca3af;'}">
                            ${isTaskComplete ? "Task Complete" : "Pending Task Completion..."}
                        </span>
                    </div>
                ` : ''}
                
                ${quizzes && quizzes.length > 0 ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px;">
                        ${this.getCheckmark(areQuizzesComplete)} 
                        <span style="${areQuizzesComplete ? 'color: #10b981; font-weight: 600;' : 'color: #9ca3af;'}">
                            ${areQuizzesComplete ? "Quick Check Complete" : "Pending Quick Check..."}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            ${canProceed ? 
                (this.currentStep === this.steps.length - 1 ? 
                    `<button class="btn-primary full-width" onclick="LogregTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="LogregTutorial.nextStep()">Next Step ➜</button>`
                ) : 
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }
            
            <button class="btn-secondary full-width" onclick="LogregTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
        `;

        // Update Overlay/Spotlight
        if (step.targetId) {
            this.highlightElement(step.targetId);
        } else {
            this.hideOverlay();
        }

        // Run onEnter
        if (step.onEnter) step.onEnter();
    },

    checkQuiz(qIndex, selectedIndex) {
        const step = this.steps[this.currentStep];
        
        // Use the stored currentQuizzes to ensure consistency
        const quizzes = step.currentQuizzes || step.quizzes || [];
        
        const quiz = quizzes[qIndex];
        if (!quiz) return;
        
        const feedbackEl = document.getElementById(`quiz-feedback-${qIndex}`);
        
        if (parseInt(selectedIndex) === quiz.answer) {
            feedbackEl.style.display = 'block';
            feedbackEl.style.color = '#10b981';
            feedbackEl.textContent = '✅ ' + quiz.feedback;
            
            // Mark as completed
            if (!step.quizState || step.quizState.length !== quizzes.length) {
                step.quizState = quizzes.map(() => ({ completed: false }));
            }
            step.quizState[qIndex].completed = true;
            
            // Re-render after a short delay to show the "Next" button state change
            setTimeout(() => this.updateView(), 1500);
        } else {
            feedbackEl.style.display = 'block';
            feedbackEl.style.color = '#ef4444';
            feedbackEl.textContent = "❌ Not quite. Try again!";
        }
    },

    highlightElement(elementId) {
        // Avoid redundant highlighting (prevents flickering)
        if (this.currentHighlight === elementId) return;
        
        const el = document.getElementById(elementId);
        if (!el) return;

        const overlay = document.getElementById('tutorial-overlay');
        overlay.style.display = 'block';
        
        // Reset previous highlights
        document.querySelectorAll('.tutorial-highlight').forEach(e => {
            e.classList.remove('tutorial-highlight');
            e.style.position = '';
            e.style.zIndex = '';
        });

        // Highlight new target
        el.classList.add('tutorial-highlight');
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.position === 'static') {
            el.style.position = 'relative';
        }
        el.style.zIndex = '1001';
        
        this.currentHighlight = elementId;
    },

    hideOverlay() {
        document.getElementById('tutorial-overlay').style.display = 'none';
        document.querySelectorAll('.tutorial-highlight').forEach(e => {
            e.classList.remove('tutorial-highlight');
            e.style.zIndex = '';
        });
        this.currentHighlight = null;  // Reset tracking
    },

    checkProgress() {
        if (!this.isActive) return;
        
        const step = this.steps[this.currentStep];
        if (step.check) {
            const checkResult = step.check();
            // Only update if check result actually changed (to reduce flickering)
            if (this.lastCheckResult !== checkResult) {
                this.lastCheckResult = checkResult;
                this.updateView();
            }
        }
    },

    getCheckmark(completed) {
        return completed ? 
            '<span style="color: #10b981; font-size: 1.2em;">✅</span>' : 
            '<span style="color: #9ca3af; font-size: 1.2em;">⬜</span>';
    },

    renderSidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>👨‍🏫 Professor Mode</h2>
                <button onclick="LogregTutorial.stop()" class="close-tutorial">×</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(sidebar);
    },

    renderOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        document.body.appendChild(overlay);
    },

    attachListeners() {
        // Listen for professor mode toggle
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

        // Poll for progress checks
        setInterval(() => this.checkProgress(), 500);
    }
};

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => LogregTutorial.init(), 500);
});
