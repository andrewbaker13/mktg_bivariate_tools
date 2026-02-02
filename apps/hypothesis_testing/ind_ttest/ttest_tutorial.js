/**
 * Independent t-test Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const TTestTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to Independent t-Test",
            targetId: null,
            content: `
                <p>Welcome! Today we're going to learn how to conduct an <strong>independent samples t-test</strong> (specifically Welch's t-test) to compare means between two groups.</p>
                <p><strong>The Mission:</strong> You'll analyze a real marketing dataset to determine whether two different customer segments behave differently.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Understanding t-test concepts</li>
                    <li>Downloading and inspecting raw data</li>
                    <li>Loading data into the tool</li>
                    <li>Understanding group statistics</li>
                    <li>Interpreting the t-statistic and p-value</li>
                    <li>Reading the visual output</li>
                    <li>Understanding effect size (Cohen's d)</li>
                    <li>Drawing business conclusions</li>
                </ol>
                <p><strong>Why t-test?</strong> When comparing exactly two groups (e.g., treatment vs. control, segment A vs. segment B), the t-test tells you whether the observed difference in means is statistically significant or just due to random chance.</p>
            `,
            quizzes: [
                {
                    question: "When would you use an independent t-test instead of ANOVA?",
                    options: [
                        "When comparing exactly two independent groups",
                        "When comparing three or more groups",
                        "When you have paired/matched data"
                    ],
                    answer: 0,
                    feedback: "Correct! The independent t-test is specifically designed for comparing means between exactly two independent groups. For more groups, use ANOVA."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding Welch's t-Test",
            targetId: 'tut-overview-section',
            content: `
                <p>Before we analyze data, let's understand what Welch's t-test does.</p>
                <p><strong>The key insight:</strong> The t-test compares:</p>
                <ul>
                    <li><strong>Signal:</strong> The difference between group means (adjusted for hypothesized difference Δ₀)</li>
                    <li><strong>Noise:</strong> The pooled standard error accounting for both groups' variability</li>
                </ul>
                <p><strong>The t-statistic formula:</strong></p>
                <p style="text-align: center; font-family: serif; font-size: 1.1em;">t = (x̄₁ - x̄₂ - Δ₀) / √(s₁²/n₁ + s₂²/n₂)</p>
                <p><strong>Why Welch's version?</strong> Unlike Student's t-test, Welch's t-test doesn't assume equal variances between groups—it's more robust for real-world data where variability often differs.</p>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>Test Overview & Equations</strong> section. Expand "Additional Notes" to learn about degrees of freedom.</p>
            `,
            quizzes: [
                {
                    question: "What does the t-statistic measure?",
                    options: [
                        "The absolute difference between group means",
                        "The ratio of the mean difference to its standard error",
                        "The correlation between the two groups"
                    ],
                    answer: 1,
                    feedback: "Correct! t = (difference in means) / (standard error). A larger |t| means the observed difference is large relative to the uncertainty."
                },
                {
                    question: "Why is Welch's t-test preferred over Student's t-test?",
                    options: [
                        "It requires smaller sample sizes",
                        "It doesn't assume equal variances between groups",
                        "It's faster to compute"
                    ],
                    answer: 1,
                    feedback: "Correct! Welch's t-test adjusts the degrees of freedom when variances are unequal, making it more reliable for real-world data."
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
                <p>Now let's work with <strong>real data</strong>. We'll use the "Streaming Hours Cohort Experiment" scenario.</p>
                <p><strong>About this dataset:</strong> A streaming platform wants to compare weekly viewing hours between two subscriber segments:</p>
                <ul>
                    <li><strong>Monthly Pass Holders:</strong> Subscribers who stay active most months</li>
                    <li><strong>Seasonal Bingers:</strong> Subscribers who cycle in and out around big releases</li>
                </ul>
                <p><strong>Your task:</strong></p>
                <ol>
                    <li>Select <strong>"Streaming Hours Cohort Experiment"</strong> from the dropdown</li>
                    <li>Click the <strong>"Download scenario dataset"</strong> button</li>
                    <li>Open the downloaded CSV to see its two-column format: group and value</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> Select the scenario and download the raw data file. Examine the group,value format.</p>
            `,
            quizzes: [
                {
                    question: "What format does the raw data file use?",
                    options: [
                        "Each row has summary statistics (mean, SD, n)",
                        "Each row has one observation: a group label and a numeric value",
                        "Each row has both groups' values side by side"
                    ],
                    answer: 1,
                    feedback: "Correct! Raw data has one row per observation—just the group label and the measured value. The tool calculates summary statistics from these."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value === 'hours_streaming_raw';
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
                <p>Now let's load the raw data into the t-test tool.</p>
                <p><strong>The tool offers three input modes:</strong></p>
                <ul>
                    <li><strong>Manual entry:</strong> Type summary stats directly</li>
                    <li><strong>Upload summary stats:</strong> Import pre-calculated means, SDs, and n's</li>
                    <li><strong>Upload raw data:</strong> Import individual observations (what we're using)</li>
                </ul>
                <p><strong>When you load raw data, the tool automatically:</strong></p>
                <ol>
                    <li>Identifies the two groups from your labels</li>
                    <li>Calculates each group's mean, standard deviation, and sample size</li>
                    <li>Populates the summary table</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> The scenario should auto-load the data. Verify you see <strong>2 groups</strong> populated in the input table with their calculated statistics.</p>
            `,
            quizzes: [
                {
                    question: "If you upload raw data with 70 total rows across 2 groups, what does the tool calculate for each group?",
                    options: [
                        "Just the count of rows per group",
                        "Mean, standard deviation, and sample size (n) for each group",
                        "Only the sum of all values"
                    ],
                    answer: 1,
                    feedback: "Correct! From raw data, the tool computes each group's mean (average), SD (spread), and n (count)—exactly what the t-test needs."
                }
            ],
            check: () => {
                const mean1 = parseFloat(document.getElementById('mean1')?.value);
                const mean2 = parseFloat(document.getElementById('mean2')?.value);
                const n1 = parseInt(document.getElementById('n1')?.value);
                const n2 = parseInt(document.getElementById('n2')?.value);
                return isFinite(mean1) && isFinite(mean2) && n1 >= 2 && n2 >= 2;
            },
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'group_stats',
            title: "🔢 Step 4: Understand Group Statistics",
            targetId: 'tut-input-section',
            getDynamicQuizzes: () => {
                const mean1 = parseFloat(document.getElementById('mean1')?.value);
                const mean2 = parseFloat(document.getElementById('mean2')?.value);
                const n1 = parseInt(document.getElementById('n1')?.value);
                const n2 = parseInt(document.getElementById('n2')?.value);
                const group1Name = document.getElementById('group1-name')?.value || 'Group 1';
                const group2Name = document.getElementById('group2-name')?.value || 'Group 2';

                if (!isFinite(mean1) || !isFinite(mean2)) return null;

                const higherGroup = mean1 > mean2 ? group1Name : group2Name;
                const lowerGroup = mean1 > mean2 ? group2Name : group1Name;
                const diff = Math.abs(mean1 - mean2).toFixed(1);

                return [
                    {
                        question: `Looking at the group statistics, which segment has the HIGHER mean weekly streaming hours?`,
                        options: [group1Name, group2Name],
                        answer: mean1 > mean2 ? 0 : 1,
                        feedback: `Correct! "${higherGroup}" has the higher mean at ${Math.max(mean1, mean2).toFixed(1)} hours.`
                    },
                    {
                        question: `What is the approximate difference between the two group means?`,
                        options: [
                            `About ${(parseFloat(diff) * 0.5).toFixed(0)} hours`,
                            `About ${parseFloat(diff).toFixed(0)} hours`,
                            `About ${(parseFloat(diff) * 2).toFixed(0)} hours`
                        ],
                        answer: 1,
                        feedback: `Correct! The difference is about ${diff} hours between the two segments.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What do the Mean, SD, and n columns represent?",
                    options: [
                        "Mean = average value, SD = spread of values, n = sample size",
                        "Mean = maximum value, SD = minimum value, n = range",
                        "Mean = median value, SD = mode, n = total hours"
                    ],
                    answer: 0,
                    feedback: "Correct! Mean is the average, SD (standard deviation) measures spread, and n is the sample size."
                }
            ],
            content: `
                <p>Now let's examine the calculated group statistics.</p>
                <p><strong>For each subscriber segment, you should see:</strong></p>
                <ul>
                    <li><strong>Mean:</strong> Average weekly streaming hours</li>
                    <li><strong>SD:</strong> Standard deviation (how spread out values are)</li>
                    <li><strong>n:</strong> Sample size (number of subscribers in that segment)</li>
                </ul>
                <p><strong>Key observations:</strong></p>
                <ul>
                    <li>Which segment streams more on average?</li>
                    <li>Are the SDs similar? (Large differences suggest Welch's t-test is appropriate)</li>
                    <li>Are sample sizes reasonable for making inferences?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Identify which segment has higher average streaming hours and note the approximate difference.</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret_results',
            title: "📈 Step 5: The t-Statistic and P-Value",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const apaEl = document.getElementById('apa-report');
                if (!apaEl || !apaEl.textContent) return null;

                const apaText = apaEl.textContent;
                // Parse t-value and p-value from APA report
                const tMatch = apaText.match(/t\s*\(\s*[\d.]+\s*\)\s*=\s*([-\d.]+)/i);
                const pMatch = apaText.match(/p\s*([<=])\s*([\d.<]+)/i);

                if (!tMatch) return null;

                const tValue = Math.abs(parseFloat(tMatch[1]));
                const isSignificant = pMatch && (pMatch[1] === '<' || parseFloat(pMatch[2]) < 0.05);
                const pDisplay = pMatch ? `${pMatch[1]} ${pMatch[2]}` : 'unknown';

                return [
                    {
                        question: `The t-statistic is approximately ${tValue.toFixed(2)}. What does this value indicate?`,
                        options: [
                            "Small difference relative to variability (groups may not differ)",
                            "Large difference relative to variability (groups likely differ)",
                            "Cannot interpret without more information"
                        ],
                        answer: tValue > 2 ? 1 : 0,
                        feedback: tValue > 2
                            ? `Correct! |t| = ${tValue.toFixed(2)} is well above 2, suggesting the observed difference is large relative to sampling variability.`
                            : `Correct! |t| = ${tValue.toFixed(2)} is relatively small, suggesting the difference may not be reliably different from zero.`
                    },
                    {
                        question: `Based on the p-value (p ${pDisplay}), is the result statistically significant at α = 0.05?`,
                        options: [
                            "Yes, because p < 0.05",
                            "No, because p > 0.05",
                            "Cannot determine"
                        ],
                        answer: isSignificant ? 0 : 1,
                        feedback: isSignificant
                            ? `Correct! With p ${pDisplay}, which is less than 0.05, we reject the null hypothesis—the groups have significantly different means.`
                            : `Correct! With p ${pDisplay}, which is greater than 0.05, we fail to reject the null hypothesis.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does a statistically significant t-test result tell you?",
                    options: [
                        "The two groups have identical means",
                        "The observed difference is unlikely to be due to chance alone",
                        "The difference is large enough to matter practically"
                    ],
                    answer: 1,
                    feedback: "Correct! Statistical significance means the observed difference is unlikely under the null hypothesis—but doesn't guarantee practical importance."
                }
            ],
            content: `
                <p>The t-test has been calculated. Let's interpret the key statistics.</p>
                <p><strong>Look at the Test Results section for:</strong></p>
                <ul>
                    <li><strong>t-statistic:</strong> How many standard errors the difference is from zero (or Δ₀)</li>
                    <li><strong>p-value:</strong> Probability of seeing this t (or more extreme) if groups were truly equal</li>
                    <li><strong>Confidence interval:</strong> Range of plausible values for the true difference</li>
                </ul>
                <p><strong>Decision rule:</strong> If p < α (usually 0.05), reject the null hypothesis that group means are equal.</p>
                <p class="task">👉 <strong>Task:</strong> Read the <strong>APA-Style Statistical Reporting</strong> to find the t-statistic and p-value.</p>
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
                <p>The tool provides two fan charts to visualize your results.</p>
                <p><strong>Means Fan Chart (left):</strong></p>
                <ul>
                    <li>Shows each group's estimated mean</li>
                    <li>Colored bands show confidence intervals (50%, 80%, 95%)</li>
                    <li>If bands don't overlap much, groups likely differ</li>
                </ul>
                <p><strong>Difference Fan Chart (right):</strong></p>
                <ul>
                    <li>Shows the estimated difference between means</li>
                    <li>The dashed line at 0 (or Δ₀) is the null hypothesis</li>
                    <li>If the confidence interval excludes 0, the difference is significant</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Look at the Difference Fan Chart. Does the 95% confidence interval include zero?</p>
            `,
            quizzes: [
                {
                    question: "On the Difference Fan Chart, what does it mean if the 95% CI does NOT include zero?",
                    options: [
                        "The groups have exactly the same mean",
                        "The difference is statistically significant at α = 0.05",
                        "You need more data to draw conclusions"
                    ],
                    answer: 1,
                    feedback: "Correct! If zero falls outside the 95% CI, you can reject the null hypothesis at α = 0.05."
                },
                {
                    question: "Why are there multiple bands (50%, 80%, 95%) on the fan charts?",
                    options: [
                        "To show different data subsets",
                        "To visualize uncertainty at multiple confidence levels",
                        "To indicate different time periods"
                    ],
                    answer: 1,
                    feedback: "Correct! Multiple bands help you see how uncertainty changes at different confidence levels—narrower at 50%, wider at 95%."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'effect_size',
            title: "📏 Step 7: Understanding Effect Size (Cohen's d)",
            targetId: 'tut-summary-section',
            getDynamicQuizzes: () => {
                const summaryBody = document.getElementById('summary-table-body');
                if (!summaryBody) return null;

                const rows = summaryBody.querySelectorAll('tr');
                let cohensD = null;

                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const measureText = cells[0].textContent.toLowerCase();
                        if (measureText.includes('cohen') || measureText.includes('d')) {
                            const val = parseFloat(cells[1].textContent);
                            if (isFinite(val)) cohensD = Math.abs(val);
                        }
                    }
                });

                if (cohensD === null) return null;

                let category;
                if (cohensD < 0.2) category = 'negligible';
                else if (cohensD < 0.5) category = 'small';
                else if (cohensD < 0.8) category = 'medium';
                else category = 'large';

                return [
                    {
                        question: `Cohen's d is approximately ${cohensD.toFixed(2)}. How would you classify this effect size?`,
                        options: [
                            "Small (d ≈ 0.2)",
                            "Medium (d ≈ 0.5)",
                            "Large (d ≥ 0.8)"
                        ],
                        answer: cohensD < 0.35 ? 0 : (cohensD < 0.65 ? 1 : 2),
                        feedback: `Correct! With d ≈ ${cohensD.toFixed(2)}, this is a ${category} effect size.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is effect size (Cohen's d) important in addition to p-value?",
                    options: [
                        "Effect size tells you IF there's a difference; p-value tells you HOW BIG",
                        "Statistical significance can occur with tiny differences if sample size is large enough",
                        "Effect size is only relevant for paired tests"
                    ],
                    answer: 1,
                    feedback: "Correct! With large samples, even trivial differences can be 'significant.' Cohen's d tells you the practical magnitude."
                }
            ],
            content: `
                <p>Statistical significance tells you IF groups differ. <strong>Effect size</strong> tells you BY HOW MUCH.</p>
                <p><strong>Cohen's d interpretation:</strong></p>
                <ul>
                    <li><strong>d ≈ 0.2:</strong> Small effect</li>
                    <li><strong>d ≈ 0.5:</strong> Medium effect</li>
                    <li><strong>d ≥ 0.8:</strong> Large effect</li>
                </ul>
                <p><strong>Business interpretation:</strong> Cohen's d tells you how many standard deviations apart the two group means are—independent of sample size.</p>
                <p class="task">👉 <strong>Task:</strong> Find Cohen's d in the Summary of Estimates table. Is this a small, medium, or large effect?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-summary-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business_conclusions',
            title: "💼 Step 8: Business Conclusions",
            targetId: 'tut-results-section',
            content: `
                <p>Now let's translate statistics into actionable insights.</p>
                <p><strong>The Managerial Interpretation panel provides:</strong></p>
                <ul>
                    <li>Plain-language summary of findings</li>
                    <li>Practical significance (not just statistical)</li>
                    <li>Guidance on next steps</li>
                </ul>
                <p><strong>Key questions for this scenario:</strong></p>
                <ul>
                    <li>Do Monthly Pass Holders really stream more than Seasonal Bingers?</li>
                    <li>Is the difference large enough to justify targeted retention efforts?</li>
                    <li>What's the confidence interval on our estimate?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the <strong>Managerial Interpretation</strong>. What recommendation would you make to the product team?</p>
            `,
            quizzes: [
                {
                    question: "When might a statistically significant result NOT lead to a business action?",
                    options: [
                        "When the p-value is very small",
                        "When the effect size is tiny and intervention cost exceeds benefit",
                        "Never—statistical significance always means business significance"
                    ],
                    answer: 1,
                    feedback: "Correct! A 0.5-hour difference might be statistically significant with large n, but if a retention campaign costs more than the value generated, it's not worth it."
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
                <p>Excellent work! You've mastered the fundamentals of the independent samples t-test.</p>

                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>T-test purpose:</strong> Compare means between exactly two independent groups</li>
                    <li><strong>T-statistic:</strong> Ratio of mean difference to standard error</li>
                    <li><strong>P-value:</strong> Probability of observed result if null hypothesis were true</li>
                    <li><strong>Welch's adjustment:</strong> Handles unequal variances robustly</li>
                    <li><strong>Effect size (Cohen's d):</strong> Standardized measure of practical importance</li>
                    <li><strong>Fan charts:</strong> Visualize uncertainty at multiple confidence levels</li>
                </ul>

                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    The independent t-test assumes observations are independent within and between groups—an assumption that's violated if, say, the same users appear in both segments over time. Real streaming data often has temporal autocorrelation and user-level clustering that a simple t-test ignores. Professional analysts consider mixed-effects models when data is nested (users within cohorts), bootstrap methods when normality is questionable, and always ask whether observed differences reflect true segment effects or confounding variables like tenure, plan type, or content preferences. As you advance, think about what <em>generates</em> the difference, not just whether one exists.
                </p>

                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Check the <strong>Diagnostics</strong> section for power analysis and assumption checks</li>
                    <li>Try different scenarios or upload your own data</li>
                    <li>Explore <strong>paired t-tests</strong> for before/after comparisons</li>
                </ul>

                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Explore other hypothesis testing tools: ANOVA for multiple groups, chi-square for categorical outcomes, and paired tests for matched designs!
                </p>
            `,
            check: () => true,
            onEnter: () => {
                TTestTutorial.hideOverlay();
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
                    { action: 'tutorial_completed', tool: 'independent-ttest' },
                    'Professor Mode tutorial completed for Independent t-Test'
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="TTestTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="TTestTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="TTestTutorial.nextStep()">Next Step ➜</button>`
                ) :
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }

            <button class="btn-secondary full-width" onclick="TTestTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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
                <button onclick="TTestTutorial.stop()" class="close-tutorial">×</button>
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
    setTimeout(() => TTestTutorial.init(), 500);
});
