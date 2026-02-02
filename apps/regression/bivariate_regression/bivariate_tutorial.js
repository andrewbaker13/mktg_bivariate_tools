/**
 * Bivariate Regression Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const BivariateRegressionTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to Simple Linear Regression",
            targetId: null,
            content: `
                <p>Welcome! Today we'll learn <strong>bivariate linear regression</strong>—the foundation of predictive modeling in marketing analytics.</p>
                <p><strong>The Mission:</strong> Understand how one variable (predictor) relates to another (outcome) and use that relationship to make predictions.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Understanding the regression model</li>
                    <li>Downloading and inspecting data</li>
                    <li>Loading data and selecting variables</li>
                    <li>Interpreting the slope and intercept</li>
                    <li>Evaluating model fit (R²)</li>
                    <li>Reading the scatterplot and regression line</li>
                    <li>Testing statistical significance</li>
                    <li>Making business predictions</li>
                </ol>
                <p><strong>When to use this?</strong> When you want to quantify how one metric (like ad spend) relates to another (like revenue).</p>
            `,
            quizzes: [
                {
                    question: "What does bivariate regression analyze?",
                    options: [
                        "The relationship between one predictor and one outcome",
                        "Differences between three or more groups",
                        "Correlations among many variables simultaneously"
                    ],
                    answer: 0,
                    feedback: "Correct! Bivariate (two-variable) regression models how one predictor X relates to one outcome Y."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: The Regression Model",
            targetId: 'tut-overview-section',
            content: `
                <p>Simple linear regression fits a straight line through your data:</p>
                <p style="text-align: center; font-family: serif; font-size: 1.1em;">Y = β₀ + β₁X + ε</p>
                <p><strong>The components:</strong></p>
                <ul>
                    <li><strong>Y:</strong> The outcome variable (what you're predicting)</li>
                    <li><strong>X:</strong> The predictor variable (what you use to predict)</li>
                    <li><strong>β₀ (intercept):</strong> Expected Y when X = 0</li>
                    <li><strong>β₁ (slope):</strong> Change in Y for each 1-unit increase in X</li>
                    <li><strong>ε (error):</strong> The part we can't explain</li>
                </ul>
                <p><strong>Key insight:</strong> The slope tells you the "return on investment"—how much outcome you gain per unit of predictor.</p>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>Test Overview & Equations</strong> section. Note the t-test formula for the slope.</p>
            `,
            quizzes: [
                {
                    question: "If the slope β₁ = 2.5, what does this mean?",
                    options: [
                        "Y equals 2.5 when X equals 0",
                        "For every 1-unit increase in X, Y increases by 2.5 on average",
                        "The model explains 2.5% of the variance"
                    ],
                    answer: 1,
                    feedback: "Correct! The slope represents the expected change in Y for a one-unit change in X. β₁ = 2.5 means Y increases by 2.5 for each unit increase in X."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.test-overview');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },
        {
            id: 'download_data',
            title: "📥 Step 2: Download and Inspect Data",
            targetId: 'tut-scenario-section',
            content: `
                <p>Let's work with <strong>real marketing data</strong>. We'll use the "Marketing Mix" scenario.</p>
                <p><strong>About this dataset:</strong> A company tracked their advertising spend and resulting sales across multiple periods:</p>
                <ul>
                    <li><strong>Predictor (X):</strong> Marketing spend (in thousands)</li>
                    <li><strong>Outcome (Y):</strong> Sales revenue (in thousands)</li>
                </ul>
                <p><strong>The business question:</strong> How much additional revenue do we generate for each dollar spent on marketing?</p>
                <p><strong>Your task:</strong></p>
                <ol>
                    <li>Select <strong>"Marketing Mix (Continuous)"</strong> from the dropdown</li>
                    <li>Click <strong>"Download scenario dataset"</strong></li>
                    <li>Open the CSV to see paired X,Y observations</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> Select the Marketing Mix scenario and examine the data structure.</p>
            `,
            quizzes: [
                {
                    question: "In regression raw data, what does each row represent?",
                    options: [
                        "One coefficient estimate",
                        "One observation with its predictor and outcome values",
                        "Summary statistics for the entire dataset"
                    ],
                    answer: 1,
                    feedback: "Correct! Each row is one case (e.g., one time period, one customer, one store) with values for both the predictor X and the outcome Y."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value !== '';
            },
            onEnter: () => {
                const section = document.querySelector('.scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'load_data',
            title: "📊 Step 3: Load and Configure Data",
            targetId: 'tut-input-section',
            content: `
                <p>The data should auto-load from the scenario. Let's understand the configuration options.</p>
                <p><strong>Predictor types:</strong></p>
                <ul>
                    <li><strong>Continuous:</strong> Numeric values (spend, impressions, etc.)—slope = change per 1-unit increase</li>
                    <li><strong>Categorical:</strong> Group labels (control/treatment)—slope = difference between groups</li>
                </ul>
                <p><strong>For Marketing Mix:</strong> Our predictor (ad spend) is continuous, so the slope represents revenue gained per dollar spent.</p>
                <p class="task">👉 <strong>Task:</strong> Verify the predictor type is set to "Continuous" for this analysis.</p>
            `,
            quizzes: [
                {
                    question: "When should you treat a numeric predictor as categorical?",
                    options: [
                        "When the numbers represent group codes (1 = Control, 2 = Treatment)",
                        "When you have more than 100 observations",
                        "Never—numeric predictors should always be continuous"
                    ],
                    answer: 0,
                    feedback: "Correct! If the numbers are arbitrary group labels (not meaningful quantities), treat them as categorical. For true numeric measurements, use continuous."
                }
            ],
            check: () => {
                const slope = document.getElementById('metric-slope');
                return slope && slope.textContent && slope.textContent !== '–';
            },
            onEnter: () => {
                const section = document.querySelector('.inputs-panel');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret_slope',
            title: "🔢 Step 4: Interpreting the Slope",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const slopeEl = document.getElementById('metric-slope');
                const interceptEl = document.getElementById('metric-intercept');

                if (!slopeEl || !interceptEl) return null;

                const slopeText = slopeEl.textContent?.trim();
                const interceptText = interceptEl.textContent?.trim();

                if (slopeText === '–' || interceptText === '–') return null;

                const slope = parseFloat(slopeText);
                const intercept = parseFloat(interceptText);

                if (!isFinite(slope)) return null;

                const direction = slope > 0 ? 'positive' : (slope < 0 ? 'negative' : 'zero');

                return [
                    {
                        question: `The slope is ${slope.toFixed(3)}. What does this mean for a 10-unit increase in X?`,
                        options: [
                            `Y increases by approximately ${(slope * 10).toFixed(2)}`,
                            `Y increases by approximately ${slope.toFixed(2)}`,
                            `Y decreases by approximately ${Math.abs(slope * 10).toFixed(2)}`
                        ],
                        answer: slope >= 0 ? 0 : 2,
                        feedback: `Correct! A slope of ${slope.toFixed(3)} means Y changes by ${slope.toFixed(3)} for each 1-unit change in X. For 10 units: 10 × ${slope.toFixed(3)} = ${(slope * 10).toFixed(2)}.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does the intercept (β₀) represent?",
                    options: [
                        "The slope of the regression line",
                        "The predicted value of Y when X equals zero",
                        "The average value of X"
                    ],
                    answer: 1,
                    feedback: "Correct! The intercept is where the regression line crosses the Y-axis (at X = 0). Sometimes this has practical meaning (baseline sales with no advertising); sometimes it's just a mathematical anchor."
                }
            ],
            content: `
                <p>The slope is the key insight from regression. Let's interpret it.</p>
                <p><strong>Finding the slope:</strong> Look at the "Slope" value in the metrics panel.</p>
                <p><strong>Interpretation template:</strong></p>
                <p style="background: #f0f9ff; padding: 12px; border-radius: 6px; font-style: italic;">
                    "For every 1-unit increase in [predictor], the [outcome] increases/decreases by [slope] units, on average."
                </p>
                <p><strong>For Marketing Mix:</strong> If slope = 3.2, then every $1,000 increase in marketing spend is associated with $3,200 more in revenue.</p>
                <p class="task">👉 <strong>Task:</strong> Find the slope in the <strong>Test Results</strong> panel. Is the relationship positive or negative?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'model_fit',
            title: "📈 Step 5: Evaluating Model Fit (R²)",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const r2El = document.getElementById('metric-r2');
                if (!r2El) return null;

                const r2Text = r2El.textContent?.trim();
                if (r2Text === '–') return null;

                const r2 = parseFloat(r2Text);
                if (!isFinite(r2)) return null;

                const r2Pct = (r2 * 100).toFixed(1);
                const unexplained = (100 - r2 * 100).toFixed(1);

                let fitQuality;
                if (r2 >= 0.7) fitQuality = 'strong';
                else if (r2 >= 0.4) fitQuality = 'moderate';
                else if (r2 >= 0.1) fitQuality = 'weak';
                else fitQuality = 'very weak';

                return [
                    {
                        question: `R² = ${r2.toFixed(3)} (${r2Pct}%). How would you characterize this model fit?`,
                        options: [
                            'Strong fit (most variation explained)',
                            'Moderate fit (meaningful but incomplete)',
                            'Weak fit (predictor explains little)'
                        ],
                        answer: fitQuality === 'strong' ? 0 : (fitQuality === 'moderate' ? 1 : 2),
                        feedback: `R² = ${r2Pct}% means the predictor explains ${r2Pct}% of the variation in the outcome. The remaining ${unexplained}% is due to other factors not in the model. This is considered a ${fitQuality} fit.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does R² = 0.64 tell you?",
                    options: [
                        "64% of the variation in Y is explained by X",
                        "The slope equals 0.64",
                        "There are 64 observations"
                    ],
                    answer: 0,
                    feedback: "Correct! R² (coefficient of determination) is the proportion of variance in Y that the model explains. R² = 0.64 means X accounts for 64% of Y's variation."
                }
            ],
            content: `
                <p>R² (R-squared) tells you how well the model fits the data.</p>
                <p><strong>Interpreting R²:</strong></p>
                <ul>
                    <li><strong>R² = 1.0:</strong> Perfect fit—all points fall exactly on the line</li>
                    <li><strong>R² = 0.7+:</strong> Strong relationship for marketing data</li>
                    <li><strong>R² = 0.3–0.7:</strong> Moderate relationship</li>
                    <li><strong>R² < 0.3:</strong> Weak relationship—other factors dominate</li>
                </ul>
                <p><strong>Caution:</strong> A high R² doesn't prove causation! Marketing spend might correlate with sales because both increase during holiday seasons.</p>
                <p class="task">👉 <strong>Task:</strong> Find R² in the metrics panel. What percentage of sales variation does marketing spend explain?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'visual_output',
            title: "📊 Step 6: Reading the Visualizations",
            targetId: 'tut-visual-section',
            content: `
                <p>The tool provides two key visualizations.</p>
                <p><strong>1. Actual vs. Fitted Plot:</strong></p>
                <ul>
                    <li>X-axis: Model's predictions (fitted values)</li>
                    <li>Y-axis: Actual observed outcomes</li>
                    <li>45° line: Perfect predictions would fall here</li>
                    <li>Points far from the line: Poor predictions (large residuals)</li>
                </ul>
                <p><strong>2. Effect Plot:</strong></p>
                <ul>
                    <li>Shows the regression line: Y = β₀ + β₁X</li>
                    <li>Shaded band: Confidence interval for predictions</li>
                    <li>Individual points: Your actual data</li>
                </ul>
                <p><strong>What to look for:</strong> Patterns in residuals (curved relationships, funnel shapes) suggest the linear model may be too simple.</p>
                <p class="task">👉 <strong>Task:</strong> Examine both charts. Do the points cluster around the regression line, or is there substantial scatter?</p>
            `,
            quizzes: [
                {
                    question: "In an Actual vs. Fitted plot, what does it mean if points form a curve instead of clustering around the 45° line?",
                    options: [
                        "The model fits perfectly",
                        "The relationship may not be linear—consider transformations",
                        "There's not enough data"
                    ],
                    answer: 1,
                    feedback: "Correct! Systematic patterns (curves, funnels) in residuals suggest the linear model doesn't capture the true relationship. Consider log transforms or polynomial terms."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.visual-output');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'significance',
            title: "🎯 Step 7: Statistical Significance",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const pvalueEl = document.getElementById('metric-pvalue');
                const tstatEl = document.getElementById('metric-t');

                if (!pvalueEl || !tstatEl) return null;

                const pvalueText = pvalueEl.textContent?.trim();
                const tstatText = tstatEl.textContent?.trim();

                if (pvalueText === '–') return null;

                let pvalue;
                if (pvalueText.includes('<')) {
                    pvalue = 0.0001;
                } else {
                    pvalue = parseFloat(pvalueText);
                }

                if (!isFinite(pvalue)) return null;

                const isSignificant = pvalue < 0.05;

                return [
                    {
                        question: `The p-value for the slope is ${pvalueText}. At α = 0.05, is the slope significantly different from zero?`,
                        options: [
                            'Yes—reject H₀ (slope ≠ 0)',
                            'No—cannot reject H₀ (slope may be 0)'
                        ],
                        answer: isSignificant ? 0 : 1,
                        feedback: isSignificant
                            ? `Correct! p = ${pvalueText} < 0.05, so we reject H₀. There's statistically significant evidence that X predicts Y.`
                            : `Correct! p = ${pvalueText} ≥ 0.05, so we cannot conclude the slope differs from zero. The apparent relationship may be due to chance.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does the t-test for the slope test?",
                    options: [
                        "Whether R² is significantly high",
                        "Whether the slope is significantly different from zero",
                        "Whether the intercept equals zero"
                    ],
                    answer: 1,
                    feedback: "Correct! The t-test asks: Is there enough evidence that β₁ ≠ 0? If p < α, we conclude the predictor has a statistically significant relationship with the outcome."
                }
            ],
            content: `
                <p>A non-zero slope could arise by chance. The hypothesis test tells us if it's statistically reliable.</p>
                <p><strong>The hypothesis test:</strong></p>
                <ul>
                    <li><strong>H₀:</strong> β₁ = 0 (no linear relationship)</li>
                    <li><strong>H₁:</strong> β₁ ≠ 0 (X predicts Y)</li>
                </ul>
                <p><strong>Test statistic:</strong> t = β̂₁ / SE(β̂₁)</p>
                <p><strong>Decision rule:</strong> If p-value < α (typically 0.05), reject H₀ and conclude the relationship is statistically significant.</p>
                <p class="task">👉 <strong>Task:</strong> Find the slope's p-value. Is the relationship statistically significant?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business_predictions',
            title: "💼 Step 8: Business Predictions",
            targetId: 'tut-results-section',
            content: `
                <p>Now let's use the model for business decisions.</p>
                <p><strong>Making predictions:</strong></p>
                <p style="text-align: center; font-family: serif;">Ŷ = β̂₀ + β̂₁ × X</p>
                <p><strong>Example:</strong> If intercept = 10, slope = 3, and you spend X = 50 (thousand dollars):</p>
                <p style="background: #f0f9ff; padding: 12px; border-radius: 6px;">
                    Predicted Revenue = 10 + 3 × 50 = <strong>160</strong> (thousand dollars)
                </p>
                <p><strong>Business applications:</strong></p>
                <ul>
                    <li>Forecast revenue at different spending levels</li>
                    <li>Calculate ROI: if slope = 3, every $1 in marketing generates $3 in revenue</li>
                    <li>Optimize budgets: allocate more to high-slope channels</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the <strong>Managerial Interpretation</strong>. What business recommendations does it make?</p>
            `,
            quizzes: [
                {
                    question: "If the regression equation is Y = 5 + 2X, what's the predicted Y when X = 20?",
                    options: [
                        "Y = 25",
                        "Y = 45",
                        "Y = 40"
                    ],
                    answer: 1,
                    feedback: "Correct! Y = 5 + 2(20) = 5 + 40 = 45. The intercept (5) is the baseline, and the slope (2) multiplies the predictor value."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎓 Professor Mode Complete!",
            targetId: null,
            content: `
                <p>Excellent work! You've mastered the fundamentals of bivariate linear regression.</p>

                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>The regression equation:</strong> Y = β₀ + β₁X + ε</li>
                    <li><strong>Slope interpretation:</strong> Change in Y per 1-unit change in X</li>
                    <li><strong>R² (R-squared):</strong> Proportion of variance explained</li>
                    <li><strong>Significance testing:</strong> Is the slope different from zero?</li>
                    <li><strong>Predictions:</strong> Ŷ = β̂₀ + β̂₁X for forecasting</li>
                </ul>

                <h4>🔬 Analyst's Perspective</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    Bivariate regression is the foundation, but real marketing analysis often requires multiple regression (many predictors), interaction terms, or non-linear models. Always check residual plots for patterns—curves or funnels suggest model misspecification. Remember: correlation doesn't imply causation. Experimental designs or instrumental variables are needed to establish causal effects of marketing spend.
                </p>

                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Explore the <strong>Diagnostics</strong> section for residual analysis</li>
                    <li>Try <strong>log transformations</strong> if relationships appear curved</li>
                    <li>Move to <strong>multiple regression</strong> to control for confounding variables</li>
                </ul>

                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Simple regression is your gateway to predictive analytics! Try different scenarios to see how the slope and R² change with different data patterns.
                </p>
            `,
            check: () => true,
            onEnter: () => {
                BivariateRegressionTutorial.hideOverlay();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    ],

    init() {
        this.renderSidebar();
        this.renderOverlay();
        this.attachListeners();

        const checkbox = document.getElementById('professorMode');
        if (checkbox && checkbox.checked) {
            this.start();
        }
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.lastCheckResult = null;
        document.body.classList.add('tutorial-active');
        document.getElementById('tutorial-sidebar').classList.add('active');

        this.updateView();
    },

    stop() {
        this.isActive = false;
        document.body.classList.remove('tutorial-active');
        document.getElementById('tutorial-sidebar').classList.remove('active');
        this.hideOverlay();

        if (this.currentStep === this.steps.length - 1) {
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend(
                    { action: 'tutorial_completed', tool: 'bivariate-regression' },
                    'Professor Mode tutorial completed for Bivariate Regression'
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

    updateView() {
        const step = this.steps[this.currentStep];

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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="BivariateRegressionTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="BivariateRegressionTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="BivariateRegressionTutorial.nextStep()">Next Step ➜</button>`
                ) :
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }

            <button class="btn-secondary full-width" onclick="BivariateRegressionTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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
                <h2>👨‍🏫 Professor Mode</h2>
                <button onclick="BivariateRegressionTutorial.stop()" class="close-tutorial">×</button>
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

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => BivariateRegressionTutorial.init(), 500);
});
