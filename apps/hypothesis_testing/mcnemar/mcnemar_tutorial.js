/**
 * McNemar Test Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const McNemarTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to McNemar's Test",
            targetId: null,
            content: `
                <p>Welcome! Today we'll learn <strong>McNemar's test</strong>—a powerful tool for comparing matched binary outcomes.</p>
                <p><strong>The Mission:</strong> Analyze paired data where the same subjects are measured under two conditions.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Understanding the matched-pairs design</li>
                    <li>Downloading and inspecting raw data</li>
                    <li>Understanding the 2×2 contingency table</li>
                    <li>Focusing on the "switchers"</li>
                    <li>Interpreting the test statistic and p-value</li>
                    <li>Reading the heatmap visualization</li>
                    <li>Computing the odds ratio effect size</li>
                    <li>Making business decisions</li>
                </ol>
                <p><strong>When to use this test?</strong> When comparing before/after outcomes, A/B tests with matched pairs, or any design where each subject provides two binary responses.</p>
            `,
            quizzes: [
                {
                    question: "McNemar's test is designed for what type of data?",
                    options: [
                        "Independent samples with continuous outcomes",
                        "Matched pairs with binary (yes/no) outcomes",
                        "Continuous outcomes with multiple groups"
                    ],
                    answer: 1,
                    feedback: "Correct! McNemar's test analyzes matched pairs where each subject has two binary outcomes (e.g., before/after, condition A/condition B)."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: The Matched-Pairs Design",
            targetId: 'tut-overview-section',
            content: `
                <p>McNemar's test focuses on the <strong>discordant pairs</strong>—subjects who responded differently under the two conditions.</p>
                <p><strong>The 2×2 table structure:</strong></p>
                <table style="margin: 10px 0; border-collapse: collapse; width: 100%;">
                    <tr style="background: #f3f4f6;">
                        <td style="border: 1px solid #d1d5db; padding: 8px;"></td>
                        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;"><strong>B Positive</strong></td>
                        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;"><strong>B Negative</strong></td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #d1d5db; padding: 8px;"><strong>A Positive</strong></td>
                        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">a (both +)</td>
                        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background: #fef3c7;"><strong>b (switcher)</strong></td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #d1d5db; padding: 8px;"><strong>A Negative</strong></td>
                        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background: #fef3c7;"><strong>c (switcher)</strong></td>
                        <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">d (both −)</td>
                    </tr>
                </table>
                <p><strong>Key insight:</strong> Cells <em>b</em> and <em>c</em> are the "switchers"—the only cells that inform the test!</p>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>Test Overview & Equations</strong> section. Note how only b and c appear in the formula.</p>
            `,
            quizzes: [
                {
                    question: "Which cells in the 2×2 table drive the McNemar test result?",
                    options: [
                        "All four cells (a, b, c, d)",
                        "Only the concordant cells (a and d)",
                        "Only the discordant cells (b and c)"
                    ],
                    answer: 2,
                    feedback: "Correct! McNemar's test only uses the discordant pairs (b and c)—subjects who 'switched' between conditions."
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
                <p>Now let's work with <strong>real data</strong>. We'll use the "Lifecycle Push Notification" scenario.</p>
                <p><strong>About this dataset:</strong> A mobile app tested two push notification strategies on the same users:</p>
                <ul>
                    <li><strong>Condition A:</strong> Generic promotional push</li>
                    <li><strong>Condition B:</strong> Personalized lifecycle push</li>
                </ul>
                <p><strong>The outcome:</strong> Did the user engage (open the app) within 24 hours? (Yes/No)</p>
                <p><strong>Your task:</strong></p>
                <ol>
                    <li>Select <strong>"Lifecycle Push Notification Test"</strong> from the dropdown</li>
                    <li>Click <strong>"Download scenario dataset"</strong></li>
                    <li>Open the CSV to see: each row is one user with their A and B outcomes</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> Select the scenario and download the raw data file.</p>
            `,
            quizzes: [
                {
                    question: "In matched-pairs raw data, what does each row represent?",
                    options: [
                        "One cell of the contingency table",
                        "One subject with their paired outcomes under both conditions",
                        "Summary statistics for one condition"
                    ],
                    answer: 1,
                    feedback: "Correct! Each row is one subject (person, customer, etc.) showing their outcome under Condition A AND Condition B."
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
            id: 'understand_table',
            title: "📊 Step 3: The Contingency Table",
            targetId: 'tut-input-section',
            getDynamicQuizzes: () => {
                const a = parseInt(document.getElementById('cell-a-pos-b-pos')?.value) || 0;
                const b = parseInt(document.getElementById('cell-a-pos-b-neg')?.value) || 0;
                const c = parseInt(document.getElementById('cell-a-neg-b-pos')?.value) || 0;
                const d = parseInt(document.getElementById('cell-a-neg-b-neg')?.value) || 0;
                const total = a + b + c + d;

                if (total === 0) return null;

                const concordant = a + d;
                const discordant = b + c;

                return [
                    {
                        question: `Looking at the table, how many subjects are "concordant" (same outcome under both conditions)?`,
                        options: [
                            `${concordant} (cells a + d)`,
                            `${discordant} (cells b + c)`,
                            `${total} (all cells)`
                        ],
                        answer: 0,
                        feedback: `Correct! ${concordant} subjects had the same outcome under both conditions—these don't contribute to the test.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why doesn't McNemar's test use the concordant pairs?",
                    options: [
                        "They're counted incorrectly",
                        "They provide no information about which condition is better",
                        "They're too rare to matter"
                    ],
                    answer: 1,
                    feedback: "Correct! Concordant pairs (same outcome both times) don't help distinguish between conditions—only the switchers tell us if one condition outperforms the other."
                }
            ],
            content: `
                <p>Let's examine the contingency table that was populated from the data.</p>
                <p><strong>Understanding the four cells:</strong></p>
                <ul>
                    <li><strong>Cell a:</strong> Positive under both A and B (no change)</li>
                    <li><strong>Cell b:</strong> Positive under A, Negative under B (A wins)</li>
                    <li><strong>Cell c:</strong> Negative under A, Positive under B (B wins)</li>
                    <li><strong>Cell d:</strong> Negative under both A and B (no change)</li>
                </ul>
                <p><strong>The key question:</strong> Among the "switchers" (b + c), does one condition dominate?</p>
                <p class="task">👉 <strong>Task:</strong> Look at the contingency table. How many subjects are switchers (cells b + c)?</p>
            `,
            check: () => {
                const a = parseInt(document.getElementById('cell-a-pos-b-pos')?.value) || 0;
                const b = parseInt(document.getElementById('cell-a-pos-b-neg')?.value) || 0;
                const c = parseInt(document.getElementById('cell-a-neg-b-pos')?.value) || 0;
                const d = parseInt(document.getElementById('cell-a-neg-b-neg')?.value) || 0;
                return (a + b + c + d) > 0;
            },
            onEnter: () => {
                const section = document.querySelector('.inputs-panel');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'switchers',
            title: "🔄 Step 4: Focus on the Switchers",
            targetId: 'tut-input-section',
            getDynamicQuizzes: () => {
                const b = parseInt(document.getElementById('cell-a-pos-b-neg')?.value) || 0;
                const c = parseInt(document.getElementById('cell-a-neg-b-pos')?.value) || 0;

                if (b + c === 0) return null;

                const winner = b > c ? 'Condition A' : (c > b ? 'Condition B' : 'Neither (tied)');
                const winnerExplain = b > c 
                    ? `More people switched FROM A positive TO B negative (${b}) than the reverse (${c}).`
                    : (c > b ? `More people switched FROM A negative TO B positive (${c}) than the reverse (${b}).` : `Equal numbers switched in each direction.`);

                return [
                    {
                        question: `Cell b = ${b}, Cell c = ${c}. Based on the switchers alone, which condition appears to perform better?`,
                        options: [
                            'Condition A (more b than c)',
                            'Condition B (more c than b)',
                            'Neither—they appear similar'
                        ],
                        answer: b > c ? 0 : (c > b ? 1 : 2),
                        feedback: `${winnerExplain} But is this difference statistically significant? That's what the test tells us!`
                    }
                ];
            },
            quizzes: [
                {
                    question: "If b = 30 and c = 10, what does this suggest about the two conditions?",
                    options: [
                        "Condition A led to more positive outcomes overall",
                        "More people switched away from B positive (suggesting A outperforms B)",
                        "The conditions are equally effective"
                    ],
                    answer: 0,
                    feedback: "Correct! b = 30 means 30 people were positive under A but negative under B. c = 10 means only 10 went the other way. A appears to outperform B among switchers."
                }
            ],
            content: `
                <p>The core insight of McNemar's test: <strong>only the switchers matter</strong>.</p>
                <p><strong>The hypothesis being tested:</strong></p>
                <ul>
                    <li><strong>H₀:</strong> The probability of switching from A+ to B− equals the probability of switching from A− to B+ (i.e., P(b) = P(c))</li>
                    <li><strong>H₁:</strong> These probabilities differ (one condition outperforms the other)</li>
                </ul>
                <p><strong>The test statistic:</strong></p>
                <p style="text-align: center; font-family: serif; font-size: 1.1em;">χ² = (b − c)² / (b + c)</p>
                <p>The bigger the imbalance between b and c, the larger the χ² and the smaller the p-value.</p>
                <p class="task">👉 <strong>Task:</strong> Compare cells b and c. Which is larger? This hints at which condition performs better.</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.inputs-panel');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret_results',
            title: "📈 Step 5: Test Results",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const pvalueEl = document.getElementById('metric-pvalue');
                const decisionEl = document.getElementById('metric-decision');

                if (!pvalueEl || !decisionEl) return null;

                const pvalueText = pvalueEl.textContent?.trim();
                const decision = decisionEl.textContent?.trim();

                if (!pvalueText || pvalueText === '–' || pvalueText === '—') return null;

                // Parse p-value (handle scientific notation and "< 0.001" format)
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
                        question: `The p-value is ${pvalueText}. At α = 0.05, is this result statistically significant?`,
                        options: [
                            'Yes—reject the null hypothesis',
                            'No—fail to reject the null hypothesis'
                        ],
                        answer: isSignificant ? 0 : 1,
                        feedback: isSignificant
                            ? `Correct! p ${pvalueText} < 0.05, so we reject H₀. The conditions have significantly different success rates.`
                            : `Correct! p ${pvalueText} ≥ 0.05, so we cannot conclude the conditions differ significantly.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does a significant McNemar test tell you?",
                    options: [
                        "The overall success rate is above 50%",
                        "One condition leads to significantly more positive outcomes than the other",
                        "The sample size is adequate"
                    ],
                    answer: 1,
                    feedback: "Correct! A significant result means the imbalance between b and c (the switchers) is too large to be explained by chance—one condition truly outperforms the other."
                }
            ],
            content: `
                <p>The test has been calculated. Let's interpret the results.</p>
                <p><strong>Key outputs to examine:</strong></p>
                <ul>
                    <li><strong>Test statistic:</strong> χ² (or exact binomial) measures the imbalance in switchers</li>
                    <li><strong>p-value:</strong> Probability of seeing this imbalance (or more extreme) if H₀ were true</li>
                    <li><strong>Decision:</strong> Reject or fail to reject H₀ at your chosen α level</li>
                </ul>
                <p><strong>Methods available:</strong></p>
                <ul>
                    <li><strong>Chi-square (corrected):</strong> Default, conservative with small samples</li>
                    <li><strong>Chi-square (uncorrected):</strong> More power with 25+ switchers</li>
                    <li><strong>Exact binomial:</strong> Best with very few switchers (&lt;10)</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Look at the <strong>Test Results</strong> panel. Is the result statistically significant?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'visual_output',
            title: "📊 Step 6: The Contingency Heatmap",
            targetId: 'tut-visual-section',
            content: `
                <p>The heatmap visualizes the 2×2 contingency table.</p>
                <p><strong>Reading the visualization:</strong></p>
                <ul>
                    <li><strong>Color intensity:</strong> Darker = more subjects in that cell</li>
                    <li><strong>Diagonal cells (a, d):</strong> Concordant pairs—same outcome both times</li>
                    <li><strong>Off-diagonal cells (b, c):</strong> Discordant pairs—the switchers that drive the test</li>
                </ul>
                <p><strong>What to look for:</strong></p>
                <ul>
                    <li>If b is much darker than c (or vice versa), expect a significant result</li>
                    <li>If b and c have similar intensity, the conditions may not differ significantly</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Look at the heatmap. Are the off-diagonal cells (b and c) roughly balanced or is one clearly larger?</p>
            `,
            quizzes: [
                {
                    question: "In the heatmap, which cells should you focus on to predict the test outcome?",
                    options: [
                        "The diagonal cells (top-left and bottom-right)",
                        "The off-diagonal cells (top-right and bottom-left)",
                        "The cell with the highest count"
                    ],
                    answer: 1,
                    feedback: "Correct! The off-diagonal cells (b and c) are the switchers that determine whether the test is significant."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.visual-output');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'effect_size',
            title: "📏 Step 7: The Odds Ratio Effect Size",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const oddsEl = document.getElementById('metric-odds');
                if (!oddsEl) return null;

                const oddsText = oddsEl.textContent?.trim();
                if (!oddsText || oddsText === '–' || oddsText === '—') return null;

                // Try to parse the odds ratio (format might be "2.50 [1.2, 5.1]")
                const match = oddsText.match(/^([\d.]+)/);
                if (!match) return null;

                const or = parseFloat(match[1]);
                if (!isFinite(or)) return null;

                let interpretation;
                if (or > 1.5) {
                    interpretation = 'A moderately to strongly favors one condition';
                } else if (or > 1) {
                    interpretation = 'A slight advantage for one condition';
                } else if (or === 1) {
                    interpretation = 'No effect—conditions are equal';
                } else {
                    interpretation = 'The other condition is favored';
                }

                return [
                    {
                        question: `The odds ratio is approximately ${or.toFixed(2)}. What does this mean?`,
                        options: [
                            'The conditions are equivalent (OR = 1)',
                            or > 1 ? 'Condition A outperforms B among switchers' : 'Condition B outperforms A among switchers',
                            'The test is not significant'
                        ],
                        answer: 1,
                        feedback: `The odds ratio (b/c) tells you how many times more likely someone is to switch in one direction vs. the other. OR = ${or.toFixed(2)} indicates ${interpretation}.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does an odds ratio of 3.0 mean in McNemar's test?",
                    options: [
                        "Condition A is 3× more likely to succeed overall",
                        "For every person who switched from A− to B+, 3 people switched from A+ to B−",
                        "The p-value is 0.03"
                    ],
                    answer: 1,
                    feedback: "Correct! OR = b/c = 3 means the 'b' direction of switching is 3× more common than the 'c' direction."
                }
            ],
            content: `
                <p>The <strong>odds ratio</strong> quantifies the magnitude of the effect.</p>
                <p><strong>For McNemar's test:</strong></p>
                <p style="text-align: center; font-family: serif; font-size: 1.1em;">OR = b / c</p>
                <p><strong>Interpretation:</strong></p>
                <ul>
                    <li><strong>OR = 1:</strong> No difference between conditions</li>
                    <li><strong>OR > 1:</strong> More people switch from A+ to B− than vice versa (A outperforms B)</li>
                    <li><strong>OR < 1:</strong> More people switch from A− to B+ (B outperforms A)</li>
                </ul>
                <p><strong>Rough benchmarks:</strong></p>
                <ul>
                    <li>OR ≈ 1.5: Small effect</li>
                    <li>OR ≈ 2.5: Medium effect</li>
                    <li>OR ≈ 4+: Large effect</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Find the odds ratio in the results panel. Is the effect small, medium, or large?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.querySelector('.test-results');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business_conclusions',
            title: "💼 Step 8: Business Decision",
            targetId: 'tut-results-section',
            content: `
                <p>Now let's translate statistical findings into business action.</p>
                <p><strong>For the Lifecycle Push scenario:</strong></p>
                <ul>
                    <li>Did personalized pushes significantly outperform generic ones?</li>
                    <li>Is the effect large enough to justify the additional complexity?</li>
                    <li>Should you roll out personalized pushes to all users?</li>
                </ul>
                <p><strong>Decision framework:</strong></p>
                <ul>
                    <li><strong>Significant + Large OR:</strong> Strong case to implement the winning condition</li>
                    <li><strong>Significant + Small OR:</strong> Consider if the lift justifies implementation cost</li>
                    <li><strong>Not significant:</strong> Insufficient evidence to prefer one condition</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the <strong>Managerial Interpretation</strong>. What action does it recommend?</p>
            `,
            quizzes: [
                {
                    question: "If McNemar's test is significant with OR = 1.2, what should you do?",
                    options: [
                        "Immediately implement the winning condition",
                        "Consider whether a 20% improvement in switching justifies implementation costs",
                        "Ignore the result—it's not meaningful"
                    ],
                    answer: 1,
                    feedback: "Correct! Statistical significance doesn't guarantee practical importance. A small odds ratio (1.2 = 20% more switching) may or may not justify the cost of implementing the change."
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
                <p>Excellent work! You've mastered McNemar's test for matched binary outcomes.</p>

                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>Matched-pairs design:</strong> Same subjects measured under two conditions</li>
                    <li><strong>Discordant pairs:</strong> Only the "switchers" (b and c) inform the test</li>
                    <li><strong>Test statistic:</strong> χ² = (b−c)² / (b+c)</li>
                    <li><strong>Odds ratio:</strong> OR = b/c quantifies effect magnitude</li>
                    <li><strong>Method selection:</strong> Corrected χ² for small samples, exact binomial for very small</li>
                </ul>

                <h4>🔬 Analyst's Perspective</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    McNemar's test is a special case of the more general Cochran's Q test (for 3+ matched conditions) and is mathematically equivalent to a paired binomial test. In marketing, it's particularly useful for A/B tests where you can match users on demographics or behavior before randomization. Watch out for carryover effects in before/after designs—the order of exposure can bias results. For repeated measures with more than two time points, consider generalized estimating equations (GEE) instead.
                </p>

                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Try the <strong>exact binomial</strong> method when you have &lt;10 switchers</li>
                    <li>Explore the <strong>Diagnostics</strong> section for assumption checks</li>
                    <li>Learn about <strong>Cochran's Q</strong> for 3+ matched conditions</li>
                </ul>

                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    McNemar's test is essential for properly analyzing matched experiments! Try uploading your own before/after data to practice.
                </p>
            `,
            check: () => true,
            onEnter: () => {
                McNemarTutorial.hideOverlay();
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
                    { action: 'tutorial_completed', tool: 'mcnemar' },
                    'Professor Mode tutorial completed for McNemar Test'
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="McNemarTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="McNemarTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="McNemarTutorial.nextStep()">Next Step ➜</button>`
                ) :
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }

            <button class="btn-secondary full-width" onclick="McNemarTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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
                <button onclick="McNemarTutorial.stop()" class="close-tutorial">×</button>
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
    setTimeout(() => McNemarTutorial.init(), 500);
});
