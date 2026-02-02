/**
 * A/B Proportion Test Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const ABProportionTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to A/B Testing",
            targetId: null,
            content: `
                <p>Welcome! Today we're going to learn how to conduct a <strong>two-proportion z-test</strong> for A/B testing—the statistical backbone of conversion rate experiments.</p>
                <p><strong>The Mission:</strong> You'll analyze a real A/B test dataset to determine whether a variant outperforms the control.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Understanding proportion test concepts</li>
                    <li>Downloading and inspecting raw data</li>
                    <li>Loading data into the tool</li>
                    <li>Understanding conversion rates</li>
                    <li>Interpreting the z-statistic and p-value</li>
                    <li>Reading the fan charts</li>
                    <li>Evaluating practical significance</li>
                    <li>Making business decisions</li>
                </ol>
                <p><strong>When to use this test?</strong> When comparing conversion rates (or any binary outcomes) between two groups—typically Control vs. Variant in marketing experiments.</p>
            `,
            quizzes: [
                {
                    question: "What type of outcome data does the two-proportion z-test analyze?",
                    options: [
                        "Continuous measurements (like revenue)",
                        "Binary outcomes (converted: yes/no)",
                        "Categorical outcomes with many levels"
                    ],
                    answer: 1,
                    feedback: "Correct! The two-proportion test compares rates of binary events (e.g., clicked vs. didn't click, purchased vs. didn't purchase)."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding the Two-Proportion Test",
            targetId: 'tut-overview-section',
            content: `
                <p>The two-proportion z-test compares conversion rates between two groups.</p>
                <p><strong>The key insight:</strong> We're asking: "Is the difference in conversion rates larger than we'd expect from random chance?"</p>
                <p><strong>The test statistic:</strong></p>
                <p style="text-align: center; font-family: serif;">z = (p₂ - p₁ - Δ₀) / SE</p>
                <p>where SE = √(p₁(1-p₁)/n₁ + p₂(1-p₂)/n₂)</p>
                <p><strong>Key parameters:</strong></p>
                <ul>
                    <li><strong>p₁, p₂:</strong> Observed conversion rates</li>
                    <li><strong>n₁, n₂:</strong> Sample sizes per group</li>
                    <li><strong>Δ₀:</strong> Hypothesized difference (usually 0)</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>Test Overview & Equations</strong> section. Note the Wald (unpooled) standard error formula.</p>
            `,
            quizzes: [
                {
                    question: "What is the null hypothesis when Δ₀ = 0?",
                    options: [
                        "The Variant has a higher conversion rate",
                        "The Control and Variant have equal conversion rates",
                        "The difference is exactly 5 percentage points"
                    ],
                    answer: 1,
                    feedback: "Correct! H₀: p₂ - p₁ = 0, meaning there's no difference between the groups."
                },
                {
                    question: "Why might you set Δ₀ to something other than 0?",
                    options: [
                        "To test whether the difference exceeds a minimum meaningful lift",
                        "To reduce the sample size needed",
                        "To increase the p-value"
                    ],
                    answer: 0,
                    feedback: "Correct! Setting Δ₀ = 0.02 (for example) tests whether the lift exceeds 2 percentage points—useful when small lifts aren't worth acting on."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },
        {
            id: 'download_data',
            title: "📥 Step 2: Download and Inspect Data",
            targetId: 'tut-scenario-section',
            content: `
                <p>Now let's work with <strong>real data</strong>. We'll use the "Social CTA Button Test" scenario.</p>
                <p><strong>About this dataset:</strong> A social media marketing team tested two call-to-action button designs:</p>
                <ul>
                    <li><strong>Team A (Control):</strong> The existing button design</li>
                    <li><strong>Team B (Variant):</strong> A redesigned button with new copy</li>
                </ul>
                <p><strong>The outcome:</strong> Binary conversion (0 = no conversion, 1 = converted)</p>
                <p><strong>Your task:</strong></p>
                <ol>
                    <li>Select <strong>"Social CTA Button Test"</strong> from the dropdown</li>
                    <li>Click <strong>"Download scenario dataset"</strong></li>
                    <li>Open the CSV to see: group, conversion (0/1 per user)</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> Select the scenario and download the raw data file.</p>
            `,
            quizzes: [
                {
                    question: "In A/B test raw data, what does each row typically represent?",
                    options: [
                        "One group's summary statistics",
                        "One individual user/visitor with their group assignment and outcome",
                        "One day of experiment results"
                    ],
                    answer: 1,
                    feedback: "Correct! Each row is one experimental unit (user), showing which group they were in and whether they converted (0/1)."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value === 'social_cta';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'upload_data',
            title: "📊 Step 3: Load Data into the Tool",
            targetId: 'tut-input-section',
            content: `
                <p>The tool offers <strong>three input modes</strong>:</p>
                <ul>
                    <li><strong>Manual entry:</strong> Adjust sliders/inputs for proportions and sample sizes</li>
                    <li><strong>Upload summary:</strong> Import group, conversions, n</li>
                    <li><strong>Upload raw data:</strong> Import individual outcomes (what we're using)</li>
                </ul>
                <p><strong>When you load raw data, the tool automatically:</strong></p>
                <ol>
                    <li>Identifies the two groups</li>
                    <li>Counts conversions and totals per group</li>
                    <li>Calculates conversion rates (p = conversions / n)</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> The scenario should auto-load. Verify you see two groups with their sample sizes and conversion rates.</p>
            `,
            quizzes: [
                {
                    question: "If Team A has 150 conversions out of 1,200 users, what's the conversion rate?",
                    options: [
                        "15%",
                        "12.5%",
                        "8%"
                    ],
                    answer: 1,
                    feedback: "Correct! p = 150/1200 = 0.125 = 12.5%"
                }
            ],
            check: () => {
                const p1 = parseFloat(document.getElementById('p1num')?.value);
                const p2 = parseFloat(document.getElementById('p2num')?.value);
                const n1 = parseInt(document.getElementById('n1num')?.value);
                const n2 = parseInt(document.getElementById('n2num')?.value);
                return p1 > 0 && p2 > 0 && n1 > 10 && n2 > 10;
            },
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'understand_rates',
            title: "🔢 Step 4: Understanding the Conversion Rates",
            targetId: 'tut-input-section',
            getDynamicQuizzes: () => {
                const p1 = parseFloat(document.getElementById('p1num')?.value);
                const p2 = parseFloat(document.getElementById('p2num')?.value);
                const g1name = document.getElementById('g1name')?.value || 'Control';
                const g2name = document.getElementById('g2name')?.value || 'Variant';

                if (!isFinite(p1) || !isFinite(p2)) return null;

                const diff = (p2 - p1) * 100;
                const relativeLift = ((p2 - p1) / p1 * 100).toFixed(1);
                const winner = p2 > p1 ? g2name : g1name;

                return [
                    {
                        question: `Looking at the rates, which group has the higher conversion rate?`,
                        options: [g1name, g2name, "They're exactly equal"],
                        answer: p2 > p1 ? 1 : (p1 > p2 ? 0 : 2),
                        feedback: p2 !== p1 
                            ? `Correct! ${winner} has the higher observed conversion rate.`
                            : `Correct! The rates are equal.`
                    },
                    {
                        question: `The absolute difference is about ${Math.abs(diff).toFixed(1)} percentage points. What does "absolute difference" mean?`,
                        options: [
                            "p₂ - p₁ (the raw difference in rates)",
                            "(p₂ - p₁) / p₁ × 100% (the percent change)",
                            "The standard error of the difference"
                        ],
                        answer: 0,
                        feedback: `Correct! Absolute difference = p₂ - p₁ = ${diff.toFixed(1)} percentage points. Relative lift (${relativeLift}%) is a different metric.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is it important to look at both absolute and relative lift?",
                    options: [
                        "They're always equal, so either works",
                        "Absolute lift shows practical magnitude; relative lift shows proportional improvement",
                        "Relative lift is only for A/B tests, absolute for observational studies"
                    ],
                    answer: 1,
                    feedback: "Correct! A 1% absolute lift from 2% to 3% is a 50% relative lift—both perspectives matter for business decisions."
                }
            ],
            content: `
                <p>Let's examine the observed conversion rates.</p>
                <p><strong>Key metrics to compare:</strong></p>
                <ul>
                    <li><strong>Control rate (p₁):</strong> Baseline conversion rate</li>
                    <li><strong>Variant rate (p₂):</strong> Treatment conversion rate</li>
                    <li><strong>Absolute difference:</strong> p₂ - p₁ (in percentage points)</li>
                    <li><strong>Relative lift:</strong> (p₂ - p₁) / p₁ × 100%</li>
                </ul>
                <p><strong>Example:</strong> If p₁ = 10% and p₂ = 12%, the absolute lift is 2 pp and relative lift is 20%.</p>
                <p class="task">👉 <strong>Task:</strong> Look at the Group Inputs panel. Which group has the higher conversion rate?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret_results',
            title: "📈 Step 5: The z-Statistic and P-Value",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const summaryBody = document.getElementById('summaryBody');
                if (!summaryBody) return null;

                // Try to find the z-value and p-value from summary table
                const rows = summaryBody.querySelectorAll('tr');
                let diff = null;
                let ciLower = null;
                let ciUpper = null;

                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const label = cells[0]?.textContent?.toLowerCase() || '';
                        if (label.includes('diff')) {
                            diff = parseFloat(cells[2]?.textContent) * 100; // Convert to percentage points
                            ciLower = parseFloat(cells[3]?.textContent) * 100;
                            ciUpper = parseFloat(cells[4]?.textContent) * 100;
                        }
                    }
                });

                if (diff === null) return null;

                const ciIncludesZero = ciLower <= 0 && ciUpper >= 0;
                const isSignificant = !ciIncludesZero;

                return [
                    {
                        question: `The 95% CI for the difference is approximately [${ciLower?.toFixed(1)}, ${ciUpper?.toFixed(1)}] pp. Does this include zero?`,
                        options: [
                            "Yes—the CI includes zero",
                            "No—the CI excludes zero"
                        ],
                        answer: ciIncludesZero ? 0 : 1,
                        feedback: ciIncludesZero
                            ? `Correct! Since zero is in [${ciLower?.toFixed(1)}, ${ciUpper?.toFixed(1)}], we cannot conclude the difference is statistically significant.`
                            : `Correct! Since zero is NOT in [${ciLower?.toFixed(1)}, ${ciUpper?.toFixed(1)}], the difference is statistically significant.`
                    },
                    {
                        question: `Based on this CI, is the result significant at α = 0.05?`,
                        options: [
                            "Yes—reject the null hypothesis",
                            "No—fail to reject the null hypothesis"
                        ],
                        answer: isSignificant ? 0 : 1,
                        feedback: isSignificant
                            ? `Correct! When the 95% CI excludes zero, p < 0.05.`
                            : `Correct! When the 95% CI includes zero, p > 0.05.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What's the relationship between confidence intervals and p-values?",
                    options: [
                        "They're unrelated measures",
                        "If the 95% CI excludes zero, p < 0.05 (two-tailed)",
                        "If the CI is narrow, p is always significant"
                    ],
                    answer: 1,
                    feedback: "Correct! A 95% CI that excludes the null value (zero) implies p < 0.05 for a two-tailed test."
                }
            ],
            content: `
                <p>The test has been calculated. Let's interpret the results.</p>
                <p><strong>Key outputs:</strong></p>
                <ul>
                    <li><strong>z-statistic:</strong> How many standard errors the observed difference is from Δ₀</li>
                    <li><strong>p-value:</strong> Probability of seeing this difference (or larger) if H₀ were true</li>
                    <li><strong>Confidence interval:</strong> Range of plausible values for the true difference</li>
                </ul>
                <p><strong>Decision rule:</strong> If the CI excludes zero (or Δ₀), reject H₀.</p>
                <p class="task">👉 <strong>Task:</strong> Look at the <strong>Summary Table</strong>. Does the confidence interval for the difference include zero?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'visual_output',
            title: "📊 Step 6: Reading the Fan Charts",
            targetId: 'tut-visual-section',
            content: `
                <p>The tool provides two fan charts to visualize your A/B test results.</p>
                <p><strong>Proportions Fan Chart (left):</strong></p>
                <ul>
                    <li>Shows estimated conversion rate for each group</li>
                    <li>Colored bands show confidence intervals (50%, 80%, 95%)</li>
                    <li>Overlapping CIs suggest uncertain difference</li>
                </ul>
                <p><strong>Difference Fan Chart (right):</strong></p>
                <ul>
                    <li>Shows the estimated lift (Variant - Control)</li>
                    <li>Dashed line at zero (or Δ₀) is the null hypothesis</li>
                    <li>If bands exclude zero, result is significant</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Look at the Difference Fan Chart. Is zero inside or outside the 95% confidence band?</p>
            `,
            quizzes: [
                {
                    question: "On the Difference Fan Chart, what does it mean if the entire distribution is to the right of zero?",
                    options: [
                        "The Control outperformed the Variant",
                        "The Variant has a significantly higher conversion rate",
                        "The test is inconclusive"
                    ],
                    answer: 1,
                    feedback: "Correct! If the difference (Variant - Control) is entirely positive, the Variant has a significantly higher rate."
                },
                {
                    question: "Why show multiple confidence bands (50%, 80%, 95%)?",
                    options: [
                        "Different stakeholders prefer different levels",
                        "To visualize the shape and spread of uncertainty",
                        "Regulatory requirements demand all three"
                    ],
                    answer: 1,
                    feedback: "Correct! Multiple bands show how uncertainty spreads—the 50% band shows where the true value most likely lies, while 95% shows extreme plausible bounds."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'practical_significance',
            title: "📏 Step 7: Practical Significance",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const p1 = parseFloat(document.getElementById('p1num')?.value);
                const p2 = parseFloat(document.getElementById('p2num')?.value);

                if (!isFinite(p1) || !isFinite(p2)) return null;

                const absDiff = Math.abs(p2 - p1) * 100;
                const relativeLift = Math.abs((p2 - p1) / p1 * 100);

                return [
                    {
                        question: `The absolute lift is about ${absDiff.toFixed(1)} percentage points. If your minimum detectable effect was 2 pp, is this practical?`,
                        options: [
                            `Yes—${absDiff.toFixed(1)} pp exceeds the 2 pp threshold`,
                            `No—${absDiff.toFixed(1)} pp is below the threshold`,
                            "Cannot determine without more context"
                        ],
                        answer: absDiff >= 2 ? 0 : 1,
                        feedback: absDiff >= 2
                            ? `Correct! A ${absDiff.toFixed(1)} pp lift exceeds the minimum meaningful threshold.`
                            : `Correct! A ${absDiff.toFixed(1)} pp lift may be too small to justify implementation costs.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What's the difference between statistical and practical significance?",
                    options: [
                        "They're the same thing",
                        "Statistical = detectable difference; Practical = meaningful difference",
                        "Practical significance requires larger sample sizes"
                    ],
                    answer: 1,
                    feedback: "Correct! A result can be statistically significant (p < 0.05) but practically insignificant (too small to matter for business)."
                }
            ],
            content: `
                <p>Statistical significance isn't enough—you need <strong>practical significance</strong> too.</p>
                <p><strong>Questions to ask:</strong></p>
                <ul>
                    <li>Is the lift large enough to matter for the business?</li>
                    <li>Does the lower bound of the CI still represent meaningful improvement?</li>
                    <li>Would the cost of implementing the change be justified by this lift?</li>
                </ul>
                <p><strong>Typical considerations:</strong></p>
                <ul>
                    <li><strong>High-volume pages:</strong> Even 0.5 pp lift can be valuable</li>
                    <li><strong>Costly changes:</strong> May need 2+ pp lift to justify</li>
                    <li><strong>Strategic tests:</strong> Consider long-term effects, not just immediate conversion</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the <strong>Managerial Interpretation</strong>. Does it mention the business implications of the lift?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business_conclusions',
            title: "💼 Step 8: Making the Call",
            targetId: 'tut-results-section',
            content: `
                <p>Now let's make a business decision.</p>
                <p><strong>A/B test decision framework:</strong></p>
                <ul>
                    <li><strong>Significant + Practical lift:</strong> Ship the Variant! 🚀</li>
                    <li><strong>Significant + Tiny lift:</strong> Consider implementation cost vs. benefit</li>
                    <li><strong>Not significant:</strong> Keep the Control (or run longer with more power)</li>
                    <li><strong>Negative lift:</strong> Definitely keep the Control</li>
                </ul>
                <p><strong>For the Social CTA scenario:</strong></p>
                <ul>
                    <li>Is the Variant's button worth implementing?</li>
                    <li>What's the expected revenue impact at scale?</li>
                    <li>Should you run a follow-up test?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Based on all the evidence, would you ship the Variant or keep the Control?</p>
            `,
            quizzes: [
                {
                    question: "What should you do if the result is 'directionally positive' but not statistically significant?",
                    options: [
                        "Ship the Variant anyway—it's probably better",
                        "Keep the Control but consider running the test longer for more power",
                        "Conclude the Variant is definitely worse"
                    ],
                    answer: 1,
                    feedback: "Correct! Insufficient evidence means you can't confidently conclude the Variant is better—but it might be, so more data could help."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎓 Professor Mode Complete!",
            targetId: null,
            content: `
                <p>Excellent work! You've mastered the fundamentals of A/B proportion testing.</p>

                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>Two-proportion z-test:</strong> Compares conversion rates between groups</li>
                    <li><strong>z-statistic:</strong> Standardized measure of the difference</li>
                    <li><strong>Confidence intervals:</strong> Range of plausible true differences</li>
                    <li><strong>Absolute vs. Relative lift:</strong> Two ways to measure improvement</li>
                    <li><strong>Statistical vs. Practical significance:</strong> Detectable ≠ meaningful</li>
                    <li><strong>Decision framework:</strong> Combining statistics with business context</li>
                </ul>

                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    The two-proportion test assumes independent samples, random assignment, and sufficient sample size for normal approximation. In practice, A/B tests often face challenges: sample ratio mismatch (SRM), interference between variants (network effects), multiple testing without correction, peeking at results too early, and novelty effects. Advanced practitioners use sequential testing methods, stratified randomization, and cluster-randomized designs. Always validate that your randomization worked before interpreting results!
                </p>

                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Check the <strong>Diagnostics</strong> section for sample size adequacy</li>
                    <li>Try setting Δ₀ > 0 to test for minimum practical lift</li>
                    <li>Explore <strong>chi-square tests</strong> for multi-variant experiments</li>
                </ul>

                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    A/B testing is foundational to data-driven marketing! Try sample size calculators for planning tests, and explore Bayesian A/B testing for continuous monitoring approaches!
                </p>
            `,
            check: () => true,
            onEnter: () => {
                ABProportionTutorial.hideOverlay();
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
                    { action: 'tutorial_completed', tool: 'ab-proportion' },
                    'Professor Mode tutorial completed for A/B Proportion Test'
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="ABProportionTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="ABProportionTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="ABProportionTutorial.nextStep()">Next Step ➜</button>`
                ) :
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }

            <button class="btn-secondary full-width" onclick="ABProportionTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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
                <button onclick="ABProportionTutorial.stop()" class="close-tutorial">×</button>
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
    setTimeout(() => ABProportionTutorial.init(), 500);
});
