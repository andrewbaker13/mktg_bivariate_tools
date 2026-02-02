/**
 * Sample Size Correlation/Regression Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 * Pattern: Dynamic sidebar/overlay creation with polling
 */

const SampleSizeCorrRegressionTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to Correlation Sample Size Planning",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you how to <strong>plan sample sizes</strong> for detecting correlations and regression slopes.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>How effect size (correlation strength) drives sample size</li>
                    <li>The Fisher z-transformation for correlation tests</li>
                    <li>Power and confidence for relationship studies</li>
                    <li>How to interpret "small," "medium," and "large" correlations</li>
                    <li>Simple regression connection</li>
                </ol>
                
                <p><strong>Why this matters:</strong> Before running a correlation or regression analysis, you need enough data to detect real relationships. This tool answers: "How many paired observations do I need?"</p>
            `,
            quizzes: [
                {
                    question: "Why is sample size planning important for correlation studies?",
                    options: [
                        "To guarantee you'll find a significant correlation",
                        "To ensure you have enough data to detect a meaningful relationship if it exists",
                        "To reduce the correlation coefficient"
                    ],
                    answer: 1,
                    feedback: "Correct! Sample size planning ensures adequate power to detect correlations of the size you care about. Without enough data, real relationships might look like noise."
                }
            ],
            check: () => true
        },
        {
            id: 'formulas',
            title: "📚 Step 1: The Fisher z-Transform",
            targetId: 'tut-overview-section',
            content: `
                <p>Correlation sample size uses the <strong>Fisher z-transformation</strong>.</p>
                
                <p><strong>Why transform r?</strong></p>
                <ul>
                    <li>Raw correlation r has a bounded, skewed distribution</li>
                    <li>Fisher z(r) is approximately normal</li>
                    <li>This enables standard power calculations</li>
                </ul>
                
                <p><strong>The transformation:</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace;">
                    z(r) = 0.5 × ln[(1 + r) / (1 - r)]
                </p>
                
                <p><strong>Standard error:</strong> SE(z) ≈ 1/√(n - 3)</p>
                
                <p><strong>Key insight:</strong> The required n depends on how far apart z(r₁) and z(r₀) are—larger differences need fewer observations.</p>
                
                <p class="task">👉 <strong>Task:</strong> Read the TEST OVERVIEW section to see the sample size formula based on Fisher z.</p>
            `,
            quizzes: [
                {
                    question: "Why do we use the Fisher z-transformation for correlation power analysis?",
                    options: [
                        "To make correlations larger and easier to detect",
                        "To transform correlation into a normally-distributed statistic for standard power calculations",
                        "To convert correlation into a percentage"
                    ],
                    answer: 1,
                    feedback: "Correct! The Fisher z-transform converts the bounded, skewed correlation coefficient into an approximately normal statistic, enabling standard power analysis formulas."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'effect-sizes',
            title: "📏 Step 2: Understanding Effect Sizes",
            targetId: 'tut-scenario-section',
            content: `
                <p>Effect size for correlation is simply the <strong>correlation coefficient</strong> itself!</p>
                
                <p><strong>Cohen's conventions:</strong></p>
                <ul>
                    <li><strong>Small:</strong> r ≈ 0.10 (explains ~1% variance)</li>
                    <li><strong>Medium:</strong> r ≈ 0.30 (explains ~9% variance)</li>
                    <li><strong>Large:</strong> r ≈ 0.50 (explains ~25% variance)</li>
                </ul>
                
                <p><strong>Marketing examples:</strong></p>
                <ul>
                    <li>Ad spend ↔ Revenue: often r ≈ 0.3–0.5</li>
                    <li>Satisfaction ↔ NPS: often r ≈ 0.2–0.4</li>
                    <li>Email opens ↔ Clicks: often r ≈ 0.4–0.6</li>
                </ul>
                
                <p><strong>Key insight:</strong> Small correlations need MUCH larger samples to detect than large correlations.</p>
                
                <p class="task">👉 <strong>Task:</strong> Load the "Ad spend vs. revenue" scenario to see a moderate correlation example.</p>
            `,
            quizzes: [
                {
                    question: "A correlation of r = 0.30 is considered what size by Cohen's conventions?",
                    options: [
                        "Small effect",
                        "Medium (moderate) effect",
                        "Large effect"
                    ],
                    answer: 1,
                    feedback: "Correct! r ≈ 0.30 is a medium/moderate effect by Cohen's standards. It explains about 9% of variance (r² = 0.09). Many marketing relationships fall in this range."
                }
            ],
            check: () => {
                const select = document.getElementById('scenario-select');
                return select && select.value !== '';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'null-expected',
            title: "⚙️ Step 3: Null vs. Expected Correlation",
            targetId: 'tut-inputs-section',
            content: `
                <p>You need to specify two correlation values for power analysis.</p>
                
                <p><strong>Null correlation (r₀):</strong></p>
                <ul>
                    <li>Usually r₀ = 0 (testing "no relationship")</li>
                    <li>Can be non-zero for "better than baseline" tests</li>
                    <li>Example: Testing if new campaign beats r = 0.2 benchmark</li>
                </ul>
                
                <p><strong>Expected correlation (r₁):</strong></p>
                <ul>
                    <li>The minimum correlation you want to detect</li>
                    <li>Based on prior research, pilot data, or business requirements</li>
                    <li>Smaller r₁ (closer to r₀) → need MORE data</li>
                </ul>
                
                <p><strong>The effect size is |r₁ - r₀|:</strong> How different is your expected relationship from the null?</p>
                
                <p class="task">👉 <strong>Task:</strong> Note the current r₀ and r₁ values. We'll experiment with changing them next!</p>
            `,
            getDynamicQuizzes: () => {
                const r0El = document.getElementById('rho0-input');
                const r1El = document.getElementById('rho1-input');
                const r0 = r0El ? parseFloat(r0El.value) : null;
                const r1 = r1El ? parseFloat(r1El.value) : null;
                
                if (r0 === null || r1 === null || isNaN(r0) || isNaN(r1)) return null;
                
                const delta = Math.abs(r1 - r0).toFixed(2);
                const r2 = (r1 * r1 * 100).toFixed(1);
                
                return [
                    {
                        question: `With r₀=${r0.toFixed(2)} and r₁=${r1.toFixed(2)}, what is the effect size |r₁ - r₀|?`,
                        options: [
                            `${(parseFloat(delta) * 0.5).toFixed(2)}`,
                            `${delta}`,
                            `${(parseFloat(delta) * 2).toFixed(2)}`
                        ],
                        answer: 1,
                        feedback: `Correct! The effect size is |${r1.toFixed(2)} - ${r0.toFixed(2)}| = ${delta}. At r₁=${r1.toFixed(2)}, you'd explain about ${r2}% of variance (r²).`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-inputs-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'experiment-r1',
            title: "🧪 Step 4: EXPERIMENT — Change Expected Correlation",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's see how the <strong>expected correlation r₁</strong> dramatically affects sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current required N in DESIGN SUMMARY</li>
                    <li>Change r₁ from <strong>0.30 to 0.20</strong> (smaller effect)</li>
                    <li>Watch N increase substantially!</li>
                    <li>Now try r₁ = <strong>0.50</strong> (larger effect)</li>
                    <li>Watch N drop dramatically!</li>
                </ol>
                
                <p><strong>What to expect:</strong></p>
                <ul>
                    <li>Smaller correlations → need MUCH more data</li>
                    <li>Larger correlations → need less data</li>
                    <li>The relationship is roughly n ∝ 1/(r₁ - r₀)²</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Try r₁ = 0.20 then r₁ = 0.50. How does N change?</p>
            `,
            getDynamicQuizzes: () => {
                const nEl = document.getElementById('metric-n');
                const r1El = document.getElementById('rho1-input');
                const r1 = r1El ? parseFloat(r1El.value) : null;
                const nText = nEl ? nEl.textContent.replace(/,/g, '') : null;
                const n = nText && nText !== '–' ? parseInt(nText) : null;
                
                if (r1 === null || n === null || isNaN(r1) || isNaN(n)) return null;
                
                return [
                    {
                        question: `At r₁=${r1.toFixed(2)}, N=${nEl.textContent}. If you want to detect a SMALLER correlation (r₁ closer to 0), what happens?`,
                        options: [
                            "N decreases because smaller effects are easier to detect",
                            "N increases substantially because smaller effects need more data",
                            "N stays the same—correlation size doesn't affect sample size"
                        ],
                        answer: 1,
                        feedback: `Correct! Smaller correlations are harder to distinguish from no relationship (r₀). The closer r₁ is to r₀, the more data you need to reliably tell them apart.`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const r1Input = document.getElementById('rho1-input');
                if (r1Input) r1Input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'experiment-power',
            title: "🧪 Step 5: EXPERIMENT — Change Power",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's explore how <strong>power</strong> affects sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current N at 80% power</li>
                    <li>Change Power to <strong>0.90</strong> (90%)</li>
                    <li>Watch N increase</li>
                    <li>Try Power = <strong>0.70</strong></li>
                    <li>Watch N decrease</li>
                </ol>
                
                <p><strong>What power means here:</strong></p>
                <ul>
                    <li>80% power = 80% chance of detecting the correlation if it's real</li>
                    <li>90% power = 90% chance, but more data needed</li>
                    <li>Higher power protects against Type II errors (missing real effects)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Try power = 0.90 then 0.70. How much does N change?</p>
            `,
            quizzes: [
                {
                    question: "With 80% power, if a true correlation of r₁ exists, what's the probability of detecting it?",
                    options: [
                        "20% chance of detecting it",
                        "80% chance of detecting it",
                        "100% chance of detecting it"
                    ],
                    answer: 1,
                    feedback: "Correct! 80% power means you have an 80% probability of getting a statistically significant result when the true correlation equals r₁. In 20% of studies, random noise would hide the real relationship."
                }
            ],
            check: () => true,
            onEnter: () => {
                const powerInput = document.getElementById('power');
                if (powerInput) powerInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'experiment-confidence',
            title: "🧪 Step 6: EXPERIMENT — Change Confidence",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's see how <strong>confidence level</strong> (alpha) affects sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current N at 95% confidence</li>
                    <li>Click <strong>90% Conf.</strong> button</li>
                    <li>Watch N decrease</li>
                    <li>Try <strong>99% Conf.</strong></li>
                    <li>Watch N increase</li>
                </ol>
                
                <p><strong>The tradeoff:</strong></p>
                <ul>
                    <li>90% confidence: α=0.10, smaller N, 10% false positive risk</li>
                    <li>95% confidence: α=0.05, standard choice</li>
                    <li>99% confidence: α=0.01, larger N, very conservative</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Click between confidence buttons and observe the N changes.</p>
            `,
            quizzes: [
                {
                    question: "What does α = 0.05 (95% confidence) mean for a correlation test?",
                    options: [
                        "5% chance of correctly detecting a real correlation",
                        "5% chance of claiming a correlation exists when there's actually no relationship",
                        "The correlation must be at least 0.05 to be significant"
                    ],
                    answer: 1,
                    feedback: "Correct! Alpha is the false positive (Type I error) rate. At α = 0.05, you accept a 5% risk of concluding there's a correlation when r₀ is actually true (no real relationship)."
                }
            ],
            check: () => true,
            onEnter: () => {
                const confButtons = document.querySelector('.confidence-buttons');
                if (confButtons) confButtons.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'regression-mode',
            title: "📈 Step 7: Regression Slope Mode",
            targetId: 'tut-inputs-section',
            content: `
                <p>Switch to <strong>Simple Regression Slope</strong> mode to see the regression perspective.</p>
                
                <p><strong>Key insight:</strong> For simple regression (one X predicting Y), the test of β₁ ≠ 0 is equivalent to testing r ≠ 0!</p>
                
                <p><strong>Why this equivalence?</strong></p>
                <ul>
                    <li>The slope β₁ = r × (SD_Y / SD_X)</li>
                    <li>Testing β₁ = 0 is the same as testing r = 0</li>
                    <li>Same sample size requirements either way</li>
                </ul>
                
                <p><strong>When regression framing helps:</strong></p>
                <ul>
                    <li>"Does X predict Y?" (slope language)</li>
                    <li>"How much does Y change per unit of X?"</li>
                    <li>Planning for regression models</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Click "Simple regression slope" to see the regression-oriented inputs (same underlying calculation).</p>
            `,
            quizzes: [
                {
                    question: "For simple linear regression (one predictor), how does the slope test relate to the correlation test?",
                    options: [
                        "They test completely different hypotheses",
                        "Testing β₁ = 0 is mathematically equivalent to testing r = 0",
                        "Regression requires much larger samples than correlation"
                    ],
                    answer: 1,
                    feedback: "Correct! With a single predictor, testing whether the slope is zero is identical to testing whether the correlation is zero. The t-statistics are the same, so sample size requirements are identical!"
                }
            ],
            check: () => true,
            onEnter: () => {
                const modeToggle = document.querySelector('.mode-toggle');
                if (modeToggle) modeToggle.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'charts',
            title: "📊 Step 8: Interpret the Charts",
            targetId: 'tut-charts-section',
            content: `
                <p>The charts visualize how sample size responds to changes in effect size and power.</p>
                
                <p><strong>Chart 1 - Effect Size:</strong></p>
                <ul>
                    <li>X-axis: |r₁ - r₀| (correlation difference)</li>
                    <li>Y-axis: Required N</li>
                    <li>Steep curve: small effects need MUCH more data</li>
                </ul>
                
                <p><strong>Chart 2 - Power:</strong></p>
                <ul>
                    <li>X-axis: Desired power (0.5 to 0.99)</li>
                    <li>Y-axis: Required N</li>
                    <li>Accelerating curve above 90% power</li>
                </ul>
                
                <p><strong>Planning insight:</strong> Use Chart 1 to show stakeholders why detecting subtle correlations requires so much data.</p>
                
                <p class="task">👉 <strong>Task:</strong> Look at the Effect Size chart. Notice the steep region for small correlations!</p>
            `,
            quizzes: [
                {
                    question: "Looking at the 'Required sample vs. effect size' chart, what pattern do you see?",
                    options: [
                        "Linear decrease—N drops steadily as effect increases",
                        "Steep decline at first, then flattening—small effects need huge N",
                        "Flat line—effect size doesn't matter"
                    ],
                    answer: 1,
                    feedback: "Correct! The curve shows n ∝ 1/(r₁ - r₀)². Small correlations (left side) require enormous samples. As correlations get stronger, the curve flattens—large effects are easy to detect."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-charts-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'results-summary',
            title: "📋 Step 9: Read the Design Summary",
            targetId: 'tut-results-section',
            content: `
                <p>The DESIGN SUMMARY provides your planning outputs.</p>
                
                <p><strong>Key metrics:</strong></p>
                <ul>
                    <li><strong>Required N:</strong> Number of paired observations needed</li>
                    <li><strong>Null vs. Expected:</strong> The correlations being compared</li>
                    <li><strong>Confidence/Power:</strong> Your error rate settings</li>
                </ul>
                
                <p><strong>Planning Statement:</strong> Technical description for methods sections.</p>
                
                <p><strong>Managerial Interpretation:</strong> Plain-language explanation.</p>
                
                <p><strong>Practical consideration:</strong> Each observation is a PAIR of measurements (X and Y together). If measuring weekly ad spend vs. revenue, N = 50 means 50 weeks of data.</p>
                
                <p class="task">👉 <strong>Task:</strong> Read both interpretations. How many weeks/customers/records would you need?</p>
            `,
            getDynamicQuizzes: () => {
                const nEl = document.getElementById('metric-n');
                const nText = nEl ? nEl.textContent.replace(/,/g, '') : null;
                const n = nText && nText !== '–' ? parseInt(nText) : null;
                
                if (n === null || isNaN(n)) return null;
                
                return [
                    {
                        question: `With N=${nEl.textContent} paired observations needed, how long would weekly data collection take?`,
                        options: [
                            `About ${Math.ceil(n / 52)} year(s) of weekly data`,
                            `About ${n} years of data`,
                            `Only 1 week of data`
                        ],
                        answer: 0,
                        feedback: `Correct! ${n} weekly observations ÷ 52 weeks/year = about ${(n / 52).toFixed(1)} years. This is why correlation studies often use cross-sectional data (many customers measured once) rather than time series.`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎓 Conclusion: Analyst's Perspective",
            targetId: 'tut-results-section',
            content: `
                <p><strong>Congratulations!</strong> You've learned to plan sample sizes for correlation and regression studies.</p>
                
                <h4>🔑 Key Takeaways</h4>
                <ol>
                    <li><strong>Effect size matters most:</strong> Small correlations need huge samples</li>
                    <li><strong>Cohen's benchmarks:</strong> r = 0.1 (small), 0.3 (medium), 0.5 (large)</li>
                    <li><strong>Correlation ↔ Regression:</strong> Same power analysis for simple regression</li>
                    <li><strong>Fisher z:</strong> Transforms r for normal-based power calculations</li>
                </ol>
                
                <h4>💼 Analyst's Perspective</h4>
                <p>Practical wisdom for correlation studies:</p>
                <ul>
                    <li>Be realistic about effect size—most marketing correlations are r = 0.2–0.4</li>
                    <li>Cross-sectional designs (many customers) are usually easier than time series</li>
                    <li>If N is too large, consider: Can you study a stronger relationship first?</li>
                    <li>Remember: N is PAIRS—each observation needs both X and Y measured</li>
                </ul>
                
                <p><strong>Pro tip:</strong> Before planning a correlation study, check if prior research has established effect sizes for similar relationships. Literature reviews save you from planning for unrealistically small or large effects.</p>
                
                <p class="task">👉 <strong>Tutorial complete!</strong> Use this tool before running correlation or simple regression analyses.</p>
            `,
            quizzes: [
                {
                    question: "A stakeholder wants to detect r = 0.05 correlation with 80% power. What's the best advice?",
                    options: [
                        "Just run the study—small correlations are meaningful",
                        "Explain that detecting r = 0.05 requires an enormous sample; discuss if that effect size is practically meaningful",
                        "Tell them correlations below 0.5 can't be detected"
                    ],
                    answer: 1,
                    feedback: "Correct! r = 0.05 explains only 0.25% of variance and would require thousands of observations to detect. Better to discuss whether such a tiny correlation matters for business decisions, or focus on larger, more actionable relationships."
                }
            ],
            check: () => true
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
                    { action: 'tutorial_completed', tool: 'sample-size-corr-regression' },
                    'Professor Mode tutorial completed for Sample Size Correlation/Regression'
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

        // Generate quizzes ONCE and store them
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        step.currentQuizzes = quizzes;

        // Initialize quizState if needed
        if (!step.quizState || step.quizState.length !== quizzes.length) {
            step.quizState = quizzes.map(() => ({ completed: false }));
        }

        const sidebarContent = document.getElementById('tutorial-content');
        if (!sidebarContent) return;

        // Build quiz HTML
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="SampleSizeCorrRegressionTutorial.checkQuiz(${qIndex}, this.value)">
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

        // Check completion status
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
                    `<button class="btn-primary full-width" onclick="SampleSizeCorrRegressionTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="SampleSizeCorrRegressionTutorial.nextStep()">Next Step ➜</button>`
                ) :
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }

            <button class="btn-secondary full-width" onclick="SampleSizeCorrRegressionTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
        `;

        this.highlightElement(step.targetId);

        if (step.onEnter) {
            step.onEnter();
        }
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
                <button onclick="SampleSizeCorrRegressionTutorial.stop()" class="close-tutorial">×</button>
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => SampleSizeCorrRegressionTutorial.init(), 500);
});
