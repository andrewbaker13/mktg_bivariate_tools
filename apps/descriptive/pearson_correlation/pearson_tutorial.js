/**
 * Pearson Correlation Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const PearsonTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to Correlation Analysis",
            targetId: null,
            content: `
                <p>Welcome! Today we'll learn <strong>Pearson correlation</strong>—the fundamental measure of linear association between two variables.</p>
                <p><strong>The Mission:</strong> Quantify how strongly two metrics "move together" and determine if that relationship is statistically meaningful.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Understanding correlation concepts</li>
                    <li>Downloading and inspecting data</li>
                    <li>Computing and interpreting r</li>
                    <li>Reading the scatterplot</li>
                    <li>Testing statistical significance</li>
                    <li>Understanding R² (coefficient of determination)</li>
                    <li>Avoiding common misinterpretations</li>
                    <li>Business applications</li>
                </ol>
                <p><strong>When to use this?</strong> When you want to know if two continuous metrics are related (e.g., ad spend and conversions, satisfaction and loyalty).</p>
            `,
            quizzes: [
                {
                    question: "What does Pearson correlation measure?",
                    options: [
                        "The causal effect of X on Y",
                        "The strength and direction of linear association between X and Y",
                        "The difference in means between two groups"
                    ],
                    answer: 1,
                    feedback: "Correct! Pearson's r measures how strongly two variables are linearly related, ranging from -1 (perfect negative) to +1 (perfect positive)."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding Correlation",
            targetId: 'tut-overview-section',
            content: `
                <p>Pearson's r is calculated from paired observations (x, y):</p>
                <p style="text-align: center; font-family: serif; font-size: 1.1em;">
                    r = Σ(xᵢ - x̄)(yᵢ - ȳ) / √[Σ(xᵢ - x̄)² × Σ(yᵢ - ȳ)²]
                </p>
                <p><strong>Interpreting r:</strong></p>
                <ul>
                    <li><strong>r = +1:</strong> Perfect positive linear relationship</li>
                    <li><strong>r = 0:</strong> No linear relationship</li>
                    <li><strong>r = −1:</strong> Perfect negative linear relationship</li>
                </ul>
                <p><strong>Rough benchmarks:</strong></p>
                <ul>
                    <li>|r| < 0.3: Weak</li>
                    <li>|r| = 0.3–0.5: Moderate</li>
                    <li>|r| > 0.5: Strong</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>Test Overview & Equations</strong>. Note how r is tested using a t-distribution.</p>
            `,
            quizzes: [
                {
                    question: "If r = −0.7, what does this indicate?",
                    options: [
                        "A strong positive relationship—as X increases, Y increases",
                        "A strong negative relationship—as X increases, Y decreases",
                        "No relationship between X and Y"
                    ],
                    answer: 1,
                    feedback: "Correct! r = −0.7 is a strong negative correlation: when X goes up, Y tends to go down proportionally."
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
                <p>Let's work with <strong>real marketing data</strong>. We'll use the "Spend vs. Signups" scenario.</p>
                <p><strong>About this dataset:</strong> A company tracked advertising spend and resulting signups across multiple campaigns:</p>
                <ul>
                    <li><strong>Variable X:</strong> Ad spend (dollars)</li>
                    <li><strong>Variable Y:</strong> Number of signups</li>
                </ul>
                <p><strong>The business question:</strong> Is there a relationship between how much we spend on ads and how many signups we get?</p>
                <p><strong>Your task:</strong></p>
                <ol>
                    <li>Select <strong>"Spend vs. Signups"</strong> from the dropdown</li>
                    <li>Click <strong>"Download scenario dataset"</strong></li>
                    <li>Open the file to see paired X, Y observations</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> Select the Spend vs. Signups scenario.</p>
            `,
            quizzes: [
                {
                    question: "Why do we need paired observations for correlation?",
                    options: [
                        "To calculate means for each variable separately",
                        "To see how each X value corresponds to a Y value from the same observation",
                        "To ensure equal sample sizes"
                    ],
                    answer: 1,
                    feedback: "Correct! Correlation measures co-variation: how X and Y move together within the same unit (campaign, customer, etc.). Each row must have both values."
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
            id: 'interpret_r',
            title: "🔢 Step 3: Interpreting the Correlation",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const rEl = document.getElementById('test-statistic');
                if (!rEl) return null;

                const rText = rEl.textContent?.trim();
                if (!rText || rText === 'r = --') return null;

                const match = rText.match(/r\s*=\s*([-\d.]+)/);
                if (!match) return null;

                const r = parseFloat(match[1]);
                if (!isFinite(r)) return null;

                const absR = Math.abs(r);
                let strength;
                if (absR >= 0.7) strength = 'strong';
                else if (absR >= 0.4) strength = 'moderate';
                else if (absR >= 0.2) strength = 'weak';
                else strength = 'negligible';

                const direction = r > 0 ? 'positive' : (r < 0 ? 'negative' : 'no');

                return [
                    {
                        question: `The correlation is r = ${r.toFixed(3)}. How would you describe this relationship?`,
                        options: [
                            `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation`,
                            'No correlation at all',
                            'Cannot determine from r alone'
                        ],
                        answer: 0,
                        feedback: `Correct! r = ${r.toFixed(3)} indicates a ${strength} ${direction} linear association. As one variable increases, the other tends to ${r > 0 ? 'increase' : 'decrease'}.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What's the difference between r and R²?",
                    options: [
                        "They're the same measure",
                        "r is correlation (-1 to +1); R² is proportion of variance explained (0 to 1)",
                        "r is for samples; R² is for populations"
                    ],
                    answer: 1,
                    feedback: "Correct! r tells you strength AND direction. R² = r² tells you what percentage of variance in Y is 'explained' by X (always positive)."
                }
            ],
            content: `
                <p>The correlation coefficient r has been calculated. Let's interpret it.</p>
                <p><strong>Key metrics to examine:</strong></p>
                <ul>
                    <li><strong>r (correlation coefficient):</strong> Strength and direction</li>
                    <li><strong>R² (coefficient of determination):</strong> Proportion of shared variance</li>
                    <li><strong>Confidence interval:</strong> Plausible range for true r</li>
                </ul>
                <p><strong>Example interpretation:</strong></p>
                <p style="background: #f0f9ff; padding: 12px; border-radius: 6px; font-style: italic;">
                    "Ad spend and signups show a strong positive correlation (r = 0.72), meaning campaigns with higher spend tend to generate more signups."
                </p>
                <p class="task">👉 <strong>Task:</strong> Find r in the <strong>Test Results</strong> panel. Is the correlation positive or negative? Strong or weak?</p>
            `,
            check: () => {
                const rEl = document.getElementById('test-statistic');
                return rEl && rEl.textContent && !rEl.textContent.includes('--');
            },
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'scatterplot',
            title: "📊 Step 4: Reading the Scatterplot",
            targetId: 'tut-visual-section',
            content: `
                <p>The scatterplot reveals patterns that r summarizes in a single number.</p>
                <p><strong>What to look for:</strong></p>
                <ul>
                    <li><strong>Upward slope:</strong> Positive correlation (r > 0)</li>
                    <li><strong>Downward slope:</strong> Negative correlation (r < 0)</li>
                    <li><strong>Tight cluster:</strong> Strong correlation (|r| close to 1)</li>
                    <li><strong>Scattered cloud:</strong> Weak correlation (|r| close to 0)</li>
                </ul>
                <p><strong>Beyond linearity:</strong></p>
                <ul>
                    <li><strong>Curved patterns:</strong> Pearson r may understate the true relationship</li>
                    <li><strong>Outliers:</strong> Can inflate or deflate r dramatically</li>
                    <li><strong>Clusters:</strong> May indicate subgroups with different relationships</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Examine the scatterplot. Do the points form a tight linear pattern or a scattered cloud?</p>
            `,
            quizzes: [
                {
                    question: "If the scatterplot shows points following a U-shaped curve, what does Pearson r tell you?",
                    options: [
                        "The true relationship strength",
                        "Possibly understates the relationship—consider Spearman or transformations",
                        "The data has measurement error"
                    ],
                    answer: 1,
                    feedback: "Correct! Pearson r only captures linear relationships. For curved patterns, consider Spearman's rank correlation or transforming variables."
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
            title: "🎯 Step 5: Testing Statistical Significance",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const pEl = document.getElementById('p-value');
                if (!pEl) return null;

                const pText = pEl.textContent?.trim();
                if (!pText || pText === 'p = --') return null;

                const match = pText.match(/p\s*[=<]\s*([\d.]+)/);
                if (!match) return null;

                let pvalue = parseFloat(match[1]);
                if (pText.includes('<')) pvalue = pvalue / 2; // If p < X, actual is lower

                if (!isFinite(pvalue)) return null;

                const isSignificant = pvalue < 0.05;

                return [
                    {
                        question: `The p-value is ${pText.replace('p = ', '')}. At α = 0.05, is the correlation statistically significant?`,
                        options: [
                            'Yes—reject H₀ (r ≠ 0 in the population)',
                            'No—cannot reject H₀ (r may be 0 in the population)'
                        ],
                        answer: isSignificant ? 0 : 1,
                        feedback: isSignificant
                            ? `Correct! p < 0.05, so we reject H₀. The correlation is unlikely to have arisen by chance.`
                            : `Correct! p ≥ 0.05, so we cannot conclude the population correlation differs from zero.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does the null hypothesis H₀: ρ = 0 mean?",
                    options: [
                        "The sample correlation is exactly zero",
                        "In the population, there is no linear relationship between X and Y",
                        "The correlation is negative"
                    ],
                    answer: 1,
                    feedback: "Correct! H₀ states that the true population correlation (ρ, 'rho') is zero—any non-zero sample r is due to sampling variability."
                }
            ],
            content: `
                <p>A non-zero r could occur by chance. The hypothesis test tells us if it's statistically reliable.</p>
                <p><strong>The hypothesis test:</strong></p>
                <ul>
                    <li><strong>H₀:</strong> ρ = 0 (no linear relationship in the population)</li>
                    <li><strong>H₁:</strong> ρ ≠ 0 (there is a relationship)</li>
                </ul>
                <p><strong>Test statistic:</strong></p>
                <p style="text-align: center; font-family: serif;">t = r × √(n−2) / √(1−r²)</p>
                <p><strong>Key insight:</strong> With large n, even small correlations become significant. With small n, even moderate correlations may not reach significance.</p>
                <p class="task">👉 <strong>Task:</strong> Check the p-value and confidence interval. Is r significantly different from zero?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'r_squared',
            title: "📈 Step 6: The Coefficient of Determination (R²)",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const rEl = document.getElementById('test-statistic');
                if (!rEl) return null;

                const rText = rEl.textContent?.trim();
                const match = rText.match(/r\s*=\s*([-\d.]+)/);
                if (!match) return null;

                const r = parseFloat(match[1]);
                if (!isFinite(r)) return null;

                const r2 = r * r;
                const r2Pct = (r2 * 100).toFixed(1);
                const unexplained = (100 - r2 * 100).toFixed(1);

                return [
                    {
                        question: `If r = ${r.toFixed(3)}, then R² = ${r2.toFixed(3)} (${r2Pct}%). What does this mean?`,
                        options: [
                            `${r2Pct}% of the variance in Y is shared with X`,
                            `${r2Pct}% of observations are correlated`,
                            `The relationship is ${r2Pct}% causal`
                        ],
                        answer: 0,
                        feedback: `Correct! R² = ${r2Pct}% means ${r2Pct}% of Y's variability can be "explained" by its linear relationship with X. The remaining ${unexplained}% is due to other factors.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is R² always positive even when r is negative?",
                    options: [
                        "R² is a different measure entirely",
                        "Because R² = r², and squaring removes the sign",
                        "Negative R² values are rounded up"
                    ],
                    answer: 1,
                    feedback: "Correct! R² = r². Whether r = +0.6 or r = −0.6, both give R² = 0.36 (36% shared variance)."
                }
            ],
            content: `
                <p>R² = r² tells you the <strong>proportion of variance explained</strong>.</p>
                <p><strong>Interpretation:</strong></p>
                <ul>
                    <li><strong>R² = 0.49 (r = 0.7):</strong> 49% of Y's variance is associated with X</li>
                    <li><strong>R² = 0.25 (r = 0.5):</strong> 25% shared variance—substantial, but 75% is other factors</li>
                    <li><strong>R² = 0.09 (r = 0.3):</strong> Only 9% shared—weak association</li>
                </ul>
                <p><strong>Practical implication:</strong> Even a "strong" correlation of r = 0.7 leaves 51% of the variance unexplained. Correlation doesn't mean one variable alone determines the other.</p>
                <p class="task">👉 <strong>Task:</strong> Calculate R² from your r value. What percentage of variance is explained?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'cautions',
            title: "⚠️ Step 7: Avoiding Misinterpretations",
            targetId: null,
            content: `
                <p>Correlation is often misunderstood. Here are critical cautions:</p>
                <p><strong>🚫 Correlation ≠ Causation</strong></p>
                <p style="background: #fef3c7; padding: 12px; border-radius: 6px;">
                    Ice cream sales and drowning deaths are highly correlated. Why? Both increase in summer (confounding variable). Ice cream doesn't cause drowning!
                </p>
                <p><strong>Other pitfalls:</strong></p>
                <ul>
                    <li><strong>Restriction of range:</strong> If X has little variation, r will be artificially low</li>
                    <li><strong>Outliers:</strong> A single extreme point can create or destroy correlation</li>
                    <li><strong>Non-linearity:</strong> Pearson r misses curved relationships</li>
                    <li><strong>Third variables:</strong> The relationship may be spurious (driven by confounders)</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Consider: What third variables might explain the correlation you observed?</p>
            `,
            quizzes: [
                {
                    question: "Ad spend and sales have r = 0.8. Can we conclude that increasing ad spend causes more sales?",
                    options: [
                        "Yes—the correlation is strong enough to prove causation",
                        "No—correlation shows association, not causation; experiments are needed",
                        "Only if p < 0.001"
                    ],
                    answer: 1,
                    feedback: "Correct! Correlation can never prove causation. Perhaps successful products receive more ad budget (reverse causation) or seasonal trends drive both (confounding)."
                }
            ],
            check: () => true
        },
        {
            id: 'business_applications',
            title: "💼 Step 8: Business Applications",
            targetId: 'tut-results-section',
            content: `
                <p>Now let's apply correlation analysis to marketing decisions.</p>
                <p><strong>Common marketing uses:</strong></p>
                <ul>
                    <li><strong>Identifying drivers:</strong> Which metrics correlate with customer lifetime value?</li>
                    <li><strong>Validating assumptions:</strong> Does our NPS actually correlate with retention?</li>
                    <li><strong>Feature selection:</strong> Which variables should we include in a predictive model?</li>
                    <li><strong>Detecting multicollinearity:</strong> Are our predictors too correlated with each other?</li>
                </ul>
                <p><strong>Action framework:</strong></p>
                <ul>
                    <li><strong>Strong correlation + theory support:</strong> Prioritize for further investigation</li>
                    <li><strong>Weak/no correlation:</strong> Consider other variables or non-linear models</li>
                    <li><strong>Unexpected correlation:</strong> Investigate potential confounders</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the <strong>Managerial Interpretation</strong>. What business insights does it provide?</p>
            `,
            quizzes: [
                {
                    question: "You find r = 0.15 between email open rate and purchases. What should you do?",
                    options: [
                        "Conclude email marketing is useless",
                        "Recognize a weak but potentially meaningful signal—investigate further",
                        "Immediately stop all email campaigns"
                    ],
                    answer: 1,
                    feedback: "Correct! r = 0.15 is weak but may still be practically useful at scale. Consider segmentation—the correlation might be stronger for certain customer types."
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
                <p>Excellent work! You've mastered the fundamentals of Pearson correlation analysis.</p>

                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>Pearson r:</strong> Measures linear association (-1 to +1)</li>
                    <li><strong>R²:</strong> Proportion of variance explained (r²)</li>
                    <li><strong>Hypothesis testing:</strong> Is r significantly different from zero?</li>
                    <li><strong>Confidence intervals:</strong> Plausible range for true population ρ</li>
                    <li><strong>Causation warning:</strong> Correlation ≠ causation!</li>
                </ul>

                <h4>🔬 Analyst's Perspective</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    Pearson correlation assumes linearity and is sensitive to outliers. For ordinal data or non-linear monotonic relationships, consider Spearman's rank correlation. For robust analysis, examine scatterplots before relying on r. In marketing, partial correlations (controlling for confounders) and correlation matrices (for many variables) are essential extensions.
                </p>

                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Try <strong>Spearman correlation</strong> for non-linear or ordinal data</li>
                    <li>Explore the <strong>matrix mode</strong> for multiple variables</li>
                    <li>Check <strong>Diagnostics</strong> for assumption violations</li>
                    <li>Move to <strong>regression</strong> when you want predictions, not just association</li>
                </ul>

                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Correlation is your starting point for understanding relationships! Try different datasets to see how r changes with different patterns.
                </p>
            `,
            check: () => true,
            onEnter: () => {
                PearsonTutorial.hideOverlay();
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
                    { action: 'tutorial_completed', tool: 'pearson-correlation' },
                    'Professor Mode tutorial completed for Pearson Correlation'
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="PearsonTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="PearsonTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="PearsonTutorial.nextStep()">Next Step ➜</button>`
                ) :
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }

            <button class="btn-secondary full-width" onclick="PearsonTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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
                <button onclick="PearsonTutorial.stop()" class="close-tutorial">×</button>
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
    setTimeout(() => PearsonTutorial.init(), 500);
});
