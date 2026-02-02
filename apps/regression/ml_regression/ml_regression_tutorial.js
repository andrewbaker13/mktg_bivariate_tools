// Multiple Linear Regression Tutorial - Professor Mode Implementation

const MLRegressionTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to Multiple Linear Regression",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you how to use <strong>multiple linear regression</strong> to analyze marketing outcomes with several predictors simultaneously.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>Understanding multiple regression concepts</li>
                    <li>Handling continuous and categorical predictors</li>
                    <li>Interpreting coefficients (slopes and dummy codes)</li>
                    <li>Assessing model fit (R², F-test, RMSE)</li>
                    <li>Reading effect plots and confidence intervals</li>
                    <li>Drawing marketing insights from regression output</li>
                </ol>
                
                <p><strong>Why multiple regression?</strong> Marketing outcomes are rarely driven by a single factor. Revenue depends on ad spend <em>and</em> pricing <em>and</em> seasonality. MLR lets you estimate each effect while <strong>controlling for</strong> the others.</p>
            `,
            quizzes: [
                {
                    question: "What does 'controlling for other predictors' mean in multiple regression?",
                    options: [
                        "Removing the other predictors from the dataset",
                        "Estimating each predictor's effect while holding others constant",
                        "Only including significant predictors"
                    ],
                    answer: 1,
                    feedback: "Correct! Each coefficient in MLR represents the expected change in Y for a one-unit change in that predictor, holding all other predictors constant. This isolates each variable's unique contribution."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding the Model",
            targetId: 'tut-overview-section',
            content: `
                <p>Multiple linear regression extends simple regression to multiple predictors.</p>
                
                <p><strong>The model:</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.9em;">
                    Y = β₀ + β₁X₁ + β₂X₂ + ... + βₚXₚ + ε
                </p>
                
                <p><strong>Key terms:</strong></p>
                <ul>
                    <li><strong>β₀ (intercept):</strong> Predicted Y when all predictors = 0 (or reference levels)</li>
                    <li><strong>βⱼ (slope):</strong> Change in Y for one-unit increase in Xⱼ, holding others constant</li>
                    <li><strong>ε (error):</strong> Random variation not explained by the model</li>
                </ul>
                
                <p><strong>Two types of predictors:</strong></p>
                <ul>
                    <li><strong>Continuous:</strong> Numeric scale (ad_spend, price, tenure)</li>
                    <li><strong>Categorical:</strong> Group labels (region, campaign_type) — automatically dummy-coded</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the TEST OVERVIEW section. Note the difference between coefficient tests (t) and the overall model test (F).</p>
            `,
            quizzes: [
                {
                    question: "For a categorical predictor with 4 levels, how many dummy variables are created?",
                    options: [
                        "4 dummy variables",
                        "3 dummy variables (one reference level omitted)",
                        "1 dummy variable"
                    ],
                    answer: 1,
                    feedback: "Correct! With k levels, we create k-1 dummy variables. One level becomes the reference (coded as all zeros), and each other level gets a coefficient comparing it to the reference."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'load-data',
            title: "📥 Step 2: Load Your Data",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's load a dataset with multiple predictors.</p>
                
                <p><strong>Data requirements:</strong></p>
                <ul>
                    <li>One <strong>numeric outcome</strong> (Y) — what you're trying to predict</li>
                    <li>One or more <strong>predictors</strong> (X) — continuous or categorical</li>
                    <li>Header row with column names</li>
                    <li>Raw case-level data (one row per observation)</li>
                </ul>
                
                <p><strong>Options:</strong></p>
                <ul>
                    <li><strong>Upload CSV:</strong> Your own marketing data</li>
                    <li><strong>Download template:</strong> A starter file with example structure</li>
                    <li><strong>Scenarios:</strong> Pre-built marketing examples</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Upload your own CSV, load a scenario, or download the template. After loading, you'll assign the outcome and predictors.</p>
            `,
            quizzes: [
                {
                    question: "Why use 'raw case-level data' rather than aggregated summaries?",
                    options: [
                        "Raw data runs faster in the tool",
                        "Individual observations allow proper variance estimation and statistical tests",
                        "Aggregated data cannot be uploaded to the tool"
                    ],
                    answer: 1,
                    feedback: "Correct! Regression requires individual observations to estimate variance, compute standard errors, and conduct valid hypothesis tests. Aggregated data loses this information."
                }
            ],
            check: () => {
                const varPanel = document.getElementById('variable-selection-panel');
                return varPanel && !varPanel.classList.contains('hidden');
            },
            onEnter: () => {
                const section = document.getElementById('tut-inputs-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'assign-variables',
            title: "🏷️ Step 3: Assign Variables",
            targetId: 'tut-inputs-section',
            content: `
                <p>After loading data, assign which column is the outcome and which are predictors.</p>
                
                <p><strong>Outcome selection:</strong></p>
                <ul>
                    <li>Must be numeric (continuous)</li>
                    <li>This is what you're trying to explain or predict</li>
                </ul>
                
                <p><strong>Predictor configuration:</strong></p>
                <ul>
                    <li><strong>Include/exclude:</strong> Check box to include in model</li>
                    <li><strong>Type detection:</strong> Tool auto-detects continuous vs. categorical</li>
                    <li><strong>Reference level:</strong> For categorical predictors, choose which level is the baseline</li>
                </ul>
                
                <p><strong>Choosing reference levels:</strong> Pick a meaningful baseline—often the control condition, largest group, or a natural "default" category.</p>
                
                <p class="task">👉 <strong>Task:</strong> Select an outcome and enable at least 2-3 predictors. For categorical predictors, verify the reference level makes sense. The model will run automatically.</p>
            `,
            quizzes: [
                {
                    question: "Why does reference level choice matter for categorical predictors?",
                    options: [
                        "It changes the model's predictive accuracy",
                        "It changes which group the coefficients compare against",
                        "It affects whether the predictor is significant"
                    ],
                    answer: 1,
                    feedback: "Correct! The reference level becomes the baseline—all other levels' coefficients represent differences FROM this reference. Choosing 'control' as reference makes treatment coefficients interpretable as 'treatment effect vs. control'."
                }
            ],
            check: () => {
                const r2El = document.getElementById('metric-r2');
                return r2El && r2El.textContent !== '–';
            },
            onEnter: () => {
                const panel = document.getElementById('variable-selection-panel');
                if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-fit',
            title: "📊 Step 4: Assess Model Fit",
            targetId: 'tut-results-section',
            content: `
                <p>Before diving into individual coefficients, check overall model performance.</p>
                
                <p><strong>Key fit metrics:</strong></p>
                <ul>
                    <li><strong>R²:</strong> Proportion of outcome variance explained (0 to 1). Higher = better.</li>
                    <li><strong>Adjusted R²:</strong> R² penalized for adding predictors—use for model comparison.</li>
                    <li><strong>Model F & p-value:</strong> Tests if predictors collectively improve prediction vs. no predictors.</li>
                </ul>
                
                <p><strong>Prediction accuracy:</strong></p>
                <ul>
                    <li><strong>RMSE:</strong> Typical prediction error (same units as Y). Smaller = better.</li>
                    <li><strong>MAE:</strong> Mean absolute error. Less sensitive to outliers than RMSE.</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Check the metrics panel. Is the model F-test significant (p < 0.05)? What percentage of variance does R² explain?</p>
            `,
            getDynamicQuizzes: () => {
                const r2El = document.getElementById('metric-r2');
                const pEl = document.getElementById('metric-pmodel');
                
                if (!r2El || !pEl) return null;
                
                const r2Value = parseFloat(r2El.textContent);
                const pValue = parseFloat(pEl.textContent);
                
                if (isNaN(r2Value)) return null;
                
                const significant = pValue < 0.05;
                
                return [
                    {
                        question: `With R² = ${r2Value.toFixed(3)} and p ${significant ? '< 0.05' : '≥ 0.05'}, what can we conclude?`,
                        options: [
                            `The model explains ${(r2Value * 100).toFixed(1)}% of variance and is ${significant ? 'statistically significant' : 'not statistically significant'}`,
                            `The model has perfect fit`,
                            `Individual predictors are all significant`
                        ],
                        answer: 0,
                        feedback: `Correct! R² = ${r2Value.toFixed(3)} means ${(r2Value * 100).toFixed(1)}% of variance is explained. ${significant ? 'The significant F-test confirms predictors collectively matter.' : 'The non-significant F-test suggests predictors may not improve prediction beyond chance.'}`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does a significant F-test (p < α) tell you?",
                    options: [
                        "Every individual predictor is significant",
                        "The predictors as a set improve prediction over a no-predictor model",
                        "The model has no outliers"
                    ],
                    answer: 1,
                    feedback: "Correct! The F-test is an omnibus test—it tells you the model is useful overall, but doesn't specify which predictors matter. You need t-tests for individual coefficients."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-coefficients',
            title: "📋 Step 5: Interpret Coefficients",
            targetId: 'tut-results-section',
            content: `
                <p>The coefficient table shows each predictor's effect on the outcome.</p>
                
                <p><strong>Reading continuous coefficients:</strong></p>
                <p style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
                    "For each one-unit increase in X, Y changes by β units, holding other predictors constant."
                </p>
                
                <p><strong>Reading categorical coefficients:</strong></p>
                <p style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
                    "Observations in category [level] have Y values β units higher/lower than the reference category, holding other predictors constant."
                </p>
                
                <p><strong>Key statistics:</strong></p>
                <ul>
                    <li><strong>Estimate (β):</strong> The coefficient value</li>
                    <li><strong>Std. Error:</strong> Precision of the estimate</li>
                    <li><strong>t & p-value:</strong> Tests if β differs from zero</li>
                    <li><strong>Confidence interval:</strong> Range of plausible values for β</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Find a significant predictor (p < 0.05) in the coefficient table. What does its coefficient mean in practical terms?</p>
            `,
            quizzes: [
                {
                    question: "A coefficient of 2.5 for 'ad_spend' (in thousands) predicting revenue (in thousands) means:",
                    options: [
                        "Ad spending explains 2.5% of revenue variance",
                        "Each additional $1,000 in ad spend is associated with $2,500 more revenue, controlling for other predictors",
                        "Ad spend and revenue have a 2.5 correlation"
                    ],
                    answer: 1,
                    feedback: "Correct! The coefficient is a marginal effect—the expected change in Y (revenue) for a one-unit change in X (ad_spend), with other predictors held constant."
                }
            ],
            check: () => true,
            onEnter: () => {
                const table = document.getElementById('coef-table-body');
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'visualize-effects',
            title: "📈 Step 6: Visualize Effects",
            targetId: 'tut-visual-section',
            content: `
                <p>The effect plot shows predicted outcomes across the range of a focal predictor.</p>
                
                <p><strong>Actual vs. Fitted plot:</strong></p>
                <ul>
                    <li>Points near the diagonal = good predictions</li>
                    <li>Systematic patterns may indicate missing predictors or non-linearity</li>
                </ul>
                
                <p><strong>Effect plot controls:</strong></p>
                <ul>
                    <li><strong>Focal predictor:</strong> Which variable's effect to visualize</li>
                    <li><strong>X-axis range:</strong> Mean ±2 SD, observed min/max, or custom</li>
                    <li><strong>Other variables held at:</strong> Mean (continuous) or mode (categorical)</li>
                </ul>
                
                <p><strong>Reading the effect plot:</strong></p>
                <ul>
                    <li><strong>Slope:</strong> Steeper = stronger effect</li>
                    <li><strong>Confidence band:</strong> Uncertainty around predictions</li>
                    <li><strong>Flat line:</strong> No effect of focal predictor</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Select different focal predictors and observe how the effect plot changes. Which predictor shows the steepest relationship?</p>
            `,
            quizzes: [
                {
                    question: "Why are 'non-focal predictors held at their means' in effect plots?",
                    options: [
                        "To make the plot simpler visually",
                        "To show the focal effect at typical values of other variables, isolating its contribution",
                        "Because means are required by the regression formula"
                    ],
                    answer: 1,
                    feedback: "Correct! Holding other variables at typical values (means for continuous, modes for categorical) shows the focal predictor's effect in a realistic scenario, making interpretation meaningful."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'check-diagnostics',
            title: "🔍 Step 7: Check Diagnostics",
            targetId: 'tut-diagnostics-section',
            content: `
                <p>Diagnostics help you assess whether regression assumptions are met.</p>
                
                <p><strong>Key assumption checks:</strong></p>
                <ul>
                    <li><strong>Multicollinearity (VIF):</strong> Are predictors too correlated? VIF > 10 is concerning.</li>
                    <li><strong>Residual patterns:</strong> Should look random with no systematic trends.</li>
                    <li><strong>Homoscedasticity:</strong> Residual spread should be constant across fitted values.</li>
                </ul>
                
                <p><strong>Residuals vs. Fitted plot:</strong></p>
                <ul>
                    <li><strong>Random scatter:</strong> Good—assumptions likely met</li>
                    <li><strong>Funnel shape:</strong> Heteroscedasticity—variance changes with Y</li>
                    <li><strong>Curved pattern:</strong> Non-linearity—consider transformations or interactions</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Expand the Diagnostics section. Check VIF values and examine the residual plot. Any red flags?</p>
            `,
            quizzes: [
                {
                    question: "A VIF of 15 for a predictor suggests:",
                    options: [
                        "The predictor has a strong effect on the outcome",
                        "The predictor is highly correlated with other predictors (multicollinearity)",
                        "The predictor should definitely be kept in the model"
                    ],
                    answer: 1,
                    feedback: "Correct! High VIF (>10) indicates multicollinearity—the predictor shares information with others. This inflates standard errors and can make coefficients unstable or hard to interpret."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-diagnostics-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const details = document.querySelector('.diagnostics-details');
                if (details) details.open = true;
            }
        },
        {
            id: 'business-insights',
            title: "💼 Step 8: Draw Marketing Insights",
            targetId: 'tut-results-section',
            content: `
                <p>Now translate your statistical findings into business recommendations.</p>
                
                <p><strong>From coefficients to action:</strong></p>
                <ul>
                    <li><strong>Significant positive effect:</strong> Increasing this predictor improves outcomes—consider investing more.</li>
                    <li><strong>Significant negative effect:</strong> This factor hurts outcomes—investigate and potentially reduce.</li>
                    <li><strong>Non-significant effect:</strong> No reliable relationship detected—deprioritize or gather more data.</li>
                </ul>
                
                <p><strong>Questions to answer:</strong></p>
                <ul>
                    <li>Which lever has the biggest impact on the outcome?</li>
                    <li>Are categorical differences (e.g., regions, channels) meaningful?</li>
                    <li>What's the predicted outcome at different spending levels?</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the APA-Style and Managerial Interpretation panels. Identify the top 2-3 actionable insights.</p>
            `,
            quizzes: [
                {
                    question: "If 'email_frequency' has a coefficient of -0.5 on customer satisfaction, the recommendation is:",
                    options: [
                        "Send more emails to improve satisfaction",
                        "Consider reducing email frequency—higher frequency is associated with lower satisfaction",
                        "Email frequency doesn't matter for satisfaction"
                    ],
                    answer: 1,
                    feedback: "Correct! A negative coefficient means more emails are associated with lower satisfaction. This suggests potential over-communication—consider testing reduced frequency."
                }
            ],
            check: () => true,
            onEnter: () => {
                const managerial = document.getElementById('managerial-report');
                if (managerial) managerial.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎓 Professor Mode Complete!",
            targetId: null,
            content: `
                <p>Excellent work! You've mastered the fundamentals of multiple linear regression.</p>
                
                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>MLR model:</strong> Predict outcomes with multiple predictors simultaneously</li>
                    <li><strong>Continuous coefficients:</strong> Change in Y per one-unit change in X</li>
                    <li><strong>Categorical coefficients:</strong> Difference from reference level</li>
                    <li><strong>Model fit:</strong> R², Adjusted R², F-test, RMSE</li>
                    <li><strong>Diagnostics:</strong> VIF for multicollinearity, residual patterns</li>
                    <li><strong>Effect plots:</strong> Visualize relationships holding other variables constant</li>
                </ul>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    Multiple regression is foundational, but real-world analysis often requires extensions. Consider interactions when effects might vary across groups or contexts—the MLR with Interactions tool handles this. Watch for non-linear relationships (try quadratic terms or transformations). Remember that regression shows association, not causation; without experimental design or careful control, coefficients may reflect confounding rather than true effects. Finally, be cautious about extrapolation—predictions beyond your observed data range can be unreliable. Professional analysts also consider regularization (ridge, lasso) when dealing with many predictors or multicollinearity, and cross-validation to assess generalization.
                </p>
                
                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Download fitted values and residuals for additional analysis</li>
                    <li>Try the MLR with Interactions tool for moderation effects</li>
                    <li>Explore logistic regression for binary outcomes</li>
                    <li>Test different predictor combinations and compare Adjusted R²</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    For conditional effects, explore MLR with Interactions. For binary outcomes (yes/no, convert/don't), use Logistic Regression!
                </p>
            `,
            check: () => true
        }
    ],

    init() {
        const checkbox = document.getElementById('professorMode');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.start();
                } else {
                    this.stop();
                }
            });
        }
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        document.body.classList.add('tutorial-active');
        document.getElementById('tutorial-sidebar')?.classList.add('active');
        document.getElementById('tutorial-overlay')?.classList.add('active');
        this.updateView();
    },

    stop() {
        this.isActive = false;
        document.body.classList.remove('tutorial-active');
        document.getElementById('tutorial-sidebar')?.classList.remove('active');
        document.getElementById('tutorial-overlay')?.classList.remove('active');
        
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight = null;
        }
        
        if (this.currentStep >= this.steps.length - 1) {
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend({
                    tool_slug: 'ml-regression',
                    action: 'professor_mode_completed',
                    details: { steps_completed: this.steps.length }
                });
            }
        }
        
        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    updateView() {
        const step = this.steps[this.currentStep];
        const content = document.getElementById('tutorial-content');
        if (!content) return;

        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight = null;
        }

        if (step.targetId) {
            const target = document.getElementById(step.targetId);
            if (target) {
                target.classList.add('tutorial-highlight');
                this.currentHighlight = target;
            }
        }

        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        step.currentQuizzes = quizzes;
        
        if (!step.quizState) {
            step.quizState = quizzes.map(() => ({ answered: false, correct: false }));
        }

        let html = `
            <div class="tutorial-step-badge">Step ${this.currentStep + 1} of ${this.steps.length}</div>
            <h3>${step.title}</h3>
            <div class="tutorial-body">${step.content}</div>
        `;

        if (quizzes.length > 0) {
            html += '<div class="tutorial-quizzes">';
            quizzes.forEach((quiz, qIndex) => {
                const state = step.quizState[qIndex];
                html += `
                    <div class="tutorial-quiz" data-quiz-index="${qIndex}">
                        <p><strong>Quick Check:</strong> ${quiz.question}</p>
                        ${quiz.options.map((opt, oIndex) => `
                            <label class="${state.answered ? (oIndex === quiz.answer ? 'correct-answer' : (state.selectedIndex === oIndex ? 'wrong-answer' : '')) : ''}">
                                <input type="radio" name="quiz-${this.currentStep}-${qIndex}" value="${oIndex}" 
                                    ${state.answered ? 'disabled' : ''} 
                                    ${state.selectedIndex === oIndex ? 'checked' : ''}>
                                ${opt}
                            </label>
                        `).join('')}
                        <div class="quiz-feedback ${state.answered ? (state.correct ? 'correct' : 'incorrect') : ''}" 
                             style="${state.answered ? '' : 'display:none'}">
                            ${state.answered ? (state.correct ? '✓ ' : '✗ ') + quiz.feedback : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        const allQuizzesAnswered = step.quizState.every(s => s.answered);
        const canProceed = allQuizzesAnswered && (step.check ? step.check() : true);
        
        html += `
            <div class="tutorial-nav" style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
                <button class="btn-secondary" onclick="MLRegressionTutorial.prevStep()" 
                    ${this.currentStep === 0 ? 'disabled' : ''}>← Back</button>
                <button class="btn-primary" onclick="MLRegressionTutorial.nextStep()" 
                    ${!canProceed ? 'disabled' : ''}>
                    ${this.currentStep === this.steps.length - 1 ? 'Finish' : 'Continue →'}
                </button>
            </div>
        `;

        if (!canProceed && quizzes.length > 0 && !allQuizzesAnswered) {
            html += `<p class="check-status" style="font-size: 0.85rem; margin-top: 0.5rem; color: #64748b;">
                Answer the quiz question${quizzes.length > 1 ? 's' : ''} to continue.
            </p>`;
        } else if (!canProceed) {
            html += `<p class="check-status" style="font-size: 0.85rem; margin-top: 0.5rem; color: #64748b;">
                Complete the task above to continue.
            </p>`;
        }

        content.innerHTML = html;

        content.querySelectorAll('.tutorial-quiz input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const qIndex = parseInt(e.target.closest('.tutorial-quiz').dataset.quizIndex);
                const selectedIndex = parseInt(e.target.value);
                this.checkQuiz(qIndex, selectedIndex);
            });
        });

        if (step.onEnter) {
            step.onEnter();
        }
    },

    checkQuiz(qIndex, selectedIndex) {
        const step = this.steps[this.currentStep];
        const quizzes = step.currentQuizzes || step.quizzes || [];
        const quiz = quizzes[qIndex];
        if (!quiz) return;

        const correct = selectedIndex === quiz.answer;
        step.quizState[qIndex] = { answered: true, correct, selectedIndex };
        
        this.updateView();
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.updateView();
        } else {
            this.stop();
        }
    },

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateView();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    MLRegressionTutorial.init();
});
