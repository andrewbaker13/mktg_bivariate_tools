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
                <p>Welcome, student! Today we're going to master <strong>Logistic Regression</strong> to solve a real marketing problem.</p>
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
                <div style="margin-top: 20px;">
                    <button class="btn-secondary full-width" onclick="LogregTutorial.stop()">Skip Tutorial (Expert Mode)</button>
                </div>
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
                <p><strong>Critical for A/B Tests:</strong> The <strong>high_incentive</strong> variable represents your treatment (1 = high promo, 0 = standard). Even though it's coded as 0/1, it should be treated as <strong>categorical</strong> (not numeric) because it represents two distinct groups, not a continuous scale.</p>
                <p class="task">👉 <strong>Task:</strong></p>
                <ol>
                    <li>Select <strong>"converted"</strong> as your Outcome variable</li>
                    <li>Check that outcome shows "2 unique values" in the preview</li>
                    <li>Select <strong>high_incentive</strong> as a predictor</li>
                    <li><strong>Change high_incentive from "numeric" to "categorical"</strong> using the dropdown next to it</li>
                    <li>Set the <strong>reference level to "0"</strong> (this is your control/baseline group)</li>
                    <li>Add at least one more predictor (e.g., prior_purchases, days_since_visit)</li>
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
                <p>Watch for these key metrics in the highlighted panel:</p>
                <ul>
                    <li><strong>Log-likelihood:</strong> How well the model fits the data (higher is better)</li>
                    <li><strong>Null/Residual Deviance:</strong> Comparison of model fit to baseline</li>
                    <li><strong>Model chi-square & p-value:</strong> Is your model statistically significant?</li>
                    <li><strong>Pseudo R²:</strong> Rough measure of model fit (0-1 scale, ~0.2-0.4 is often good)</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> The model should fit automatically. Look at the highlighted <strong>Model Metrics</strong> panel and verify that values appear for Model p-value and Pseudo R².</p>
            `,
            quizzes: [
                {
                    question: "Look at the 'Model p-value' metric. If it's < 0.05, what does that mean?",
                    options: ["The model is broken", "The predictors significantly improve predictions vs. guessing", "The data is random"],
                    answer: 1,
                    feedback: "Perfect! A significant model p-value means your predictors add real predictive power."
                },
                {
                    question: "What does 'Pseudo R²' represent?",
                    options: ["Exact variance explained", "A rough measure of model fit (higher is better)", "The number of predictors"],
                    answer: 1,
                    feedback: "Correct! Pseudo R² is like R² in linear regression but adapted for logistic models. Values around 0.2-0.4 are often considered good."
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
                <p>Look at the <strong>Coefficient Estimates</strong> table. Each row shows one predictor:</p>
                <ul>
                    <li><strong>Estimate (log-odds):</strong> The raw coefficient. Positive = increases conversion, negative = decreases.</li>
                    <li><strong>Odds Ratio:</strong> MUCH easier to interpret! OR = 1.25 means a 25% increase in odds. OR = 0.80 means a 20% decrease.</li>
                    <li><strong>p-value:</strong> Is this effect real or just noise? p < 0.05 = statistically significant (reliable).</li>
                    <li><strong>Confidence Interval:</strong> The range where the true effect likely lies.</li>
                </ul>
                <p><strong>Business Translation:</strong> If a predictor has OR = 1.15 with p = 0.02, you can confidently say it multiplies conversion odds by 1.15 (15% increase).</p>
                <p class="task">👉 <strong>Task:</strong> Look at the highlighted table and find the predictor with the LARGEST odds ratio (furthest from 1.0).</p>
            `,
            getDynamicQuizzes: () => {
                const model = window.lastModel;
                if (!model || !model.terms) return [];
                
                // Find strongest predictor (non-intercept, furthest from OR=1)
                const nonIntercept = model.terms.filter(t => t.predictor !== 'Intercept');
                if (nonIntercept.length === 0) return [];
                
                const strongest = nonIntercept.reduce((max, term) => {
                    const or = Math.exp(term.estimate);
                    const maxOr = Math.exp(max.estimate);
                    return Math.abs(Math.log(or)) > Math.abs(Math.log(maxOr)) ? term : max;
                });
                
                const strongestOR = Math.exp(strongest.estimate).toFixed(2);
                const strongestName = strongest.term || strongest.predictor;
                const isSig = strongest.p < 0.05;
                
                return [
                    {
                        question: `Look at the table. What is the Odds Ratio for '${strongestName}'?`,
                        options: [`About ${(parseFloat(strongestOR) * 0.5).toFixed(2)}`, `About ${strongestOR}`, `About ${(parseFloat(strongestOR) * 2).toFixed(2)}`],
                        answer: 1,
                        feedback: `Correct! The OR is ${strongestOR}. ${parseFloat(strongestOR) > 1 ? `This means the odds increase by ${((parseFloat(strongestOR) - 1) * 100).toFixed(0)}%` : `This means the odds decrease by ${((1 - parseFloat(strongestOR)) * 100).toFixed(0)}%`}.`
                    },
                    {
                        question: `Is '${strongestName}' statistically significant at α=0.05?`,
                        options: [`Yes, p < 0.05`, `No, p ≥ 0.05`, `Can't tell from the table`],
                        answer: isSig ? 0 : 1,
                        feedback: isSig ? 
                            `Correct! The p-value is < 0.05, so this effect is statistically reliable.` :
                            `Correct! The p-value is ≥ 0.05, so we can't confidently say this predictor matters at the 5% significance level.`
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
            targetId: 'plot-confusion-matrix',
            content: `
                <p>Coefficients tell us WHAT matters. But how ACCURATE is the model at actually predicting conversions?</p>
                <p><strong>The Confusion Matrix</strong> shows classification results:</p>
                <ul>
                    <li><strong>True Positives:</strong> Correctly predicted conversions</li>
                    <li><strong>False Positives:</strong> Predicted conversion, but customer didn't convert (Type I error)</li>
                    <li><strong>False Negatives:</strong> Missed a conversion (Type II error)</li>
                    <li><strong>True Negatives:</strong> Correctly predicted non-conversion</li>
                </ul>
                <p><strong>The ROC Curve</strong> shows discrimination ability. The <strong>AUC (Area Under Curve)</strong> metric is displayed below the plot.</p>
                <p class="task">👉 <strong>Task:</strong> Look at the <strong>AUC metric</strong> value. Is your model better than random (AUC > 0.5)?</p>
            `,
            getDynamicQuizzes: () => {
                const model = window.lastModel;
                if (!model || !model.auc) return [];
                
                const auc = model.auc;
                const aucDisplay = auc.toFixed(2);
                const aucPct = (auc * 100).toFixed(0);
                
                let aucQuality = "acceptable";
                if (auc >= 0.9) aucQuality = "excellent";
                else if (auc >= 0.8) aucQuality = "good";
                else if (auc >= 0.7) aucQuality = "acceptable";
                else if (auc >= 0.6) aucQuality = "fair";
                else aucQuality = "poor";
                
                return [
                    {
                        question: `Look at the AUC metric below the ROC curve. What value do you see?`,
                        options: [`About ${(auc - 0.1).toFixed(2)}`, `About ${aucDisplay}`, `About ${(auc + 0.1).toFixed(2)}`],
                        answer: 1,
                        feedback: `Correct! The AUC is ${aucDisplay}, which is considered ${aucQuality}. ${auc > 0.5 ? `This means the model has predictive power.` : `This is no better than random guessing.`}`
                    },
                    {
                        question: `With AUC = ${aucDisplay}, is this model better than random guessing?`,
                        options: [auc > 0.5 ? "Yes, AUC > 0.5 means better than random" : "No, AUC ≤ 0.5 means no better than random", auc > 0.5 ? "No, it's the same as random" : "Yes, it's better", "Can't tell from AUC"],
                        answer: 0,
                        feedback: auc > 0.5 ? 
                            `Correct! AUC > 0.5 means the model can distinguish between converters and non-converters better than chance.` :
                            `Correct! AUC ≤ 0.5 means the model is no better than randomly guessing outcomes.`
                    }
                ];
            },
            quizzes: [], // Will be populated dynamically
            check: () => {
                return window.lastModel !== null && window.lastModel !== undefined;
            },
            onEnter: () => {
                const visual = document.querySelector('.visual-output');
                if (visual) visual.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },
        {
            id: 'business_insights',
            title: "💡 Step 6: Making Business Decisions",
            targetId: 'plot-effect',
            content: `
                <p>This is where statistics become STRATEGY! Let's translate model outputs into actionable business recommendations.</p>
                <p><strong>The Effect Plot</strong> shows how changing one predictor (while holding others constant) affects conversion probability:</p>
                <ul>
                    <li>Select a predictor as "focal" (e.g., promo_amount)</li>
                    <li>See how conversion probability changes across its range</li>
                    <li>Confidence bands show statistical uncertainty</li>
                </ul>
                <p><strong>The Variable Importance plot</strong> (Odds Ratios forest plot) ranks predictors by effect strength. This tells you WHERE to focus marketing resources.</p>
                <p><strong>Business Application:</strong> If promo_amount has a strong positive effect but email_opened doesn't, you should focus budget on discounts rather than email campaigns!</p>
                <p class="task">👉 <strong>Task:</strong> Use the Effect Plot controls. Select <strong>'promo_amount'</strong> (or your strongest continuous predictor) as the focal predictor and observe how conversion probability changes.</p>
            `,
            quizzes: [
                {
                    question: "Look at the Effect Plot for 'promo_amount'. Does conversion probability increase as promo increases?",
                    options: ["Yes, higher promos → higher conversion probability", "No, they're unrelated", "The plot is broken"],
                    answer: 0,
                    feedback: "Good observation! This positive relationship means offering bigger discounts drives more conversions."
                },
                {
                    question: "Check the Variable Importance (Odds Ratios) plot. Which predictor has the STRONGEST effect (furthest from the 1.0 line)?",
                    options: ["They're all the same", "The one with the highest OR or lowest OR", "The first one listed"],
                    answer: 1,
                    feedback: "Correct! The predictor furthest from 1.0 (whether above or below) has the strongest multiplicative effect on odds."
                }
            ],
            check: () => {
                // Check if effect plot has been interacted with (focal predictor selected)
                const focalSelect = document.getElementById('effect-focal-select');
                return focalSelect && focalSelect.value && focalSelect.value !== '';
            },
            onEnter: () => {
                const effectCard = document.getElementById('plot-effect')?.closest('.chart-card');
                if (effectCard) effectCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎉 You're Now a Logistic Regression Expert!",
            targetId: null,
            content: `
                <p>Congratulations! You successfully built, interpreted, and validated a logistic regression model for marketing!</p>
                
                <h4>📊 What You Learned</h4>
                <ul>
                    <li><strong>Logistic Regression</strong> predicts probabilities for binary outcomes</li>
                    <li><strong>Odds Ratios</strong> show HOW MUCH each factor matters (multiplicative effects)</li>
                    <li><strong>p-values</strong> tell you which effects are statistically reliable</li>
                    <li><strong>AUC/ROC</strong> measures overall predictive accuracy</li>
                    <li><strong>Effect Plots</strong> translate stats into business scenarios</li>
                </ul>
                
                <h4>🚀 Real-World Applications</h4>
                <p>Logistic regression powers:</p>
                <ul>
                    <li>Email campaign targeting (who will click?)</li>
                    <li>Churn prediction (who will cancel?)</li>
                    <li>Lead scoring (who will convert?)</li>
                    <li>A/B test analysis (which treatment works better?)</li>
                </ul>
                
                <h4>💼 Business Impact</h4>
                <p>By targeting high-probability converters and optimizing promo amounts, you can <strong>increase ROI by 20-50%</strong> vs. blanket campaigns.</p>
                
                <h4>🎓 Next Steps</h4>
                <ul>
                    <li>Try different predictor combinations</li>
                    <li>Experiment with confidence levels (90% vs 95% vs 99%)</li>
                    <li>Download predictions to share with stakeholders</li>
                    <li>Review the Diagnostics section for assumption checks</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
                    <strong>📚 Want to Learn More?</strong><br>
                    Explore other marketing analytics tools on the site, or dive deeper into the interpretation aids throughout this tool!
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
        const areQuizzesComplete = !step.quizzes || step.quizState.every(q => q.completed);
        const canProceed = isTaskComplete && areQuizzesComplete;

        sidebarContent.innerHTML = `
            <div class="tutorial-step-badge">Step ${this.currentStep + 1}/${this.steps.length}</div>
            <h3 style="margin-top: 10px; margin-bottom: 15px;">${step.title}</h3>
            <div class="tutorial-body">${step.content}</div>
            
            ${quizHtml}

            <div class="tutorial-progress-container" style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e5e7eb;">
                ${step.check ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: ${step.quizzes ? '8px' : '0'};">
                        ${this.getCheckmark(isTaskComplete)} 
                        <span style="${isTaskComplete ? 'color: #10b981; font-weight: 600;' : 'color: #9ca3af;'}">
                            ${isTaskComplete ? "Task Complete" : "Pending Task Completion..."}
                        </span>
                    </div>
                ` : ''}
                
                ${step.quizzes ? `
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
        
        // Get the current quizzes (might be dynamic)
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        
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
