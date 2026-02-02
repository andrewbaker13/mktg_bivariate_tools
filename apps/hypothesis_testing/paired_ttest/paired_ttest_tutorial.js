/**
 * Paired t-test Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const PairedTTestTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to Paired t-Test",
            targetId: null,
            content: `
                <p>Welcome! Today we're going to learn how to conduct a <strong>paired samples t-test</strong> (also called dependent samples t-test) to compare means from two related measurements.</p>
                <p><strong>The Mission:</strong> You'll analyze a real marketing dataset where the same subjects/units are measured under two conditions.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Understanding paired t-test concepts</li>
                    <li>Downloading and inspecting raw data</li>
                    <li>Loading data into the tool</li>
                    <li>Understanding the differences</li>
                    <li>Interpreting the t-statistic and p-value</li>
                    <li>Reading the visual output</li>
                    <li>Understanding effect size (Cohen's dz)</li>
                    <li>Drawing business conclusions</li>
                </ol>
                <p><strong>When to use paired t-test?</strong> When you have matched pairs—before/after measurements on the same subjects, matched market tests, or A/B tests where each unit receives both treatments.</p>
            `,
            quizzes: [
                {
                    question: "What makes data 'paired' rather than 'independent'?",
                    options: [
                        "The sample sizes are equal",
                        "Each observation in one group is linked to a specific observation in the other group",
                        "The data comes from two different time periods"
                    ],
                    answer: 1,
                    feedback: "Correct! Paired data has a natural one-to-one correspondence—like the same person measured before and after, or the same market exposed to two campaigns."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding Paired Differences",
            targetId: 'tut-overview-section',
            content: `
                <p>The paired t-test works by transforming your paired data into a <strong>single set of differences</strong>.</p>
                <p><strong>The key insight:</strong> Instead of comparing two groups, we ask: "Is the average difference significantly different from zero?"</p>
                <p><strong>The transformation:</strong></p>
                <ul>
                    <li>For each pair: d<sub>i</sub> = After<sub>i</sub> - Before<sub>i</sub></li>
                    <li>Calculate the mean difference d̄</li>
                    <li>Test if d̄ is significantly different from zero</li>
                </ul>
                <p><strong>Why this works:</strong> By looking at differences, we eliminate subject-level noise (e.g., high performers vs. low performers) and focus purely on the treatment effect.</p>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>Test Overview & Equations</strong> section. Note how the test statistic uses the standard deviation of differences (s<sub>d</sub>).</p>
            `,
            quizzes: [
                {
                    question: "What is the null hypothesis in a paired t-test?",
                    options: [
                        "The two groups have different variances",
                        "The mean difference between paired observations is zero",
                        "The before and after measurements are correlated"
                    ],
                    answer: 1,
                    feedback: "Correct! H₀: μ_d = 0, meaning on average there's no difference between the paired measurements."
                },
                {
                    question: "Why is the paired t-test more powerful than an independent t-test for before/after data?",
                    options: [
                        "It uses larger sample sizes",
                        "It eliminates between-subject variability by focusing on within-subject changes",
                        "It doesn't require normality assumptions"
                    ],
                    answer: 1,
                    feedback: "Correct! By subtracting within each pair, subject-level differences (e.g., high vs. low performers) are removed, revealing a cleaner signal."
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
                <p>Now let's work with <strong>real data</strong>. We'll use the "Streaming Launch Creative Test" scenario.</p>
                <p><strong>About this dataset:</strong> A streaming brand measured two metrics across 20 DMAs (Designated Market Areas):</p>
                <ul>
                    <li><strong>Recall Score:</strong> Brand recall from a quick panel pulse in each DMA</li>
                    <li><strong>Conversion Score:</strong> Household conversions attributed to promo bundles</li>
                </ul>
                <p><strong>The paired nature:</strong> Each DMA provides <em>both</em> a recall score and a conversion score—these form natural pairs.</p>
                <p><strong>Your task:</strong></p>
                <ol>
                    <li>Select <strong>"Streaming Launch Creative Test"</strong> from the dropdown</li>
                    <li>Click the <strong>"Download scenario dataset"</strong> button</li>
                    <li>Open the CSV to see its paired column format: recall_score, conversion_score</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> Select the scenario and download the raw data file.</p>
            `,
            quizzes: [
                {
                    question: "In the streaming launch dataset, what constitutes a 'pair'?",
                    options: [
                        "Two different DMAs",
                        "The recall and conversion scores for the SAME DMA",
                        "Control and treatment versions of an ad"
                    ],
                    answer: 1,
                    feedback: "Correct! Each DMA contributes both measurements, making (recall, conversion) a natural pair for that market."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value === 'streaming_launch';
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
                <p>The tool offers <strong>four input modes</strong> for paired data:</p>
                <ul>
                    <li><strong>Upload raw data - paired:</strong> Two columns (before, after) — what we're using</li>
                    <li><strong>Upload raw data - differences:</strong> Pre-computed difference scores</li>
                    <li><strong>Manual entry:</strong> Type values directly</li>
                    <li><strong>Summary stats:</strong> Just mean, SD, and n of differences</li>
                </ul>
                <p><strong>When you load paired data, the tool automatically:</strong></p>
                <ol>
                    <li>Computes the difference for each pair</li>
                    <li>Calculates the mean, SD, and count of differences</li>
                    <li>Runs the paired t-test</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> The scenario should auto-load. Verify you see <strong>20 pairs</strong> reported in the status.</p>
            `,
            quizzes: [
                {
                    question: "If you have 20 DMAs with both recall and conversion scores, how many 'differences' do you have?",
                    options: [
                        "40 differences (two per DMA)",
                        "20 differences (one per DMA)",
                        "10 differences (pairs are combined)"
                    ],
                    answer: 1,
                    feedback: "Correct! Each pair yields exactly ONE difference: d_i = conversion_i - recall_i. So 20 pairs → 20 differences."
                }
            ],
            check: () => {
                // Check if we have loaded data with appropriate n
                const statusMsg = document.getElementById('status-message')?.textContent || '';
                const sampleSummary = document.getElementById('sample-summary')?.textContent || '';
                return statusMsg.includes('pairs') || sampleSummary.includes('20') || sampleSummary.includes('pair');
            },
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'understand_differences',
            title: "🔢 Step 4: Understanding the Differences",
            targetId: 'tut-visual-section',
            getDynamicQuizzes: () => {
                const meanDiff = document.getElementById('mean-diff')?.textContent || '';
                const meanMatch = meanDiff.match(/(-?[\d.]+)/);

                if (!meanMatch) return null;

                const mean = parseFloat(meanMatch[1]);
                const direction = mean > 0 ? 'higher' : 'lower';
                const metric = mean > 0 ? 'conversion' : 'recall';

                return [
                    {
                        question: `The mean difference is approximately ${mean.toFixed(1)}. What does this mean?`,
                        options: [
                            `On average, recall scores are ${Math.abs(mean).toFixed(1)} points higher than conversion scores`,
                            `On average, conversion scores are ${Math.abs(mean).toFixed(1)} points higher than recall scores`,
                            `The two metrics have identical averages`
                        ],
                        answer: mean > 0 ? 1 : 0,
                        feedback: mean > 0
                            ? `Correct! Positive mean difference (d̄ ≈ ${mean.toFixed(1)}) means conversion scores tend to exceed recall scores by about that amount.`
                            : `Correct! Negative mean difference (d̄ ≈ ${mean.toFixed(1)}) means recall scores tend to exceed conversion scores.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "If most individual differences are positive, what does the histogram show?",
                    options: [
                        "Most bars shifted to the left of zero",
                        "Most bars shifted to the right of zero",
                        "Bars evenly distributed around zero"
                    ],
                    answer: 1,
                    feedback: "Correct! Positive differences (After > Before) appear to the right of zero on the histogram."
                }
            ],
            content: `
                <p>Now let's examine the distribution of differences.</p>
                <p><strong>The histogram shows:</strong></p>
                <ul>
                    <li>Each bar represents how many pairs have differences in that range</li>
                    <li>The vertical line at zero represents "no change"</li>
                    <li>Distribution to the RIGHT of zero = After > Before (positive change)</li>
                    <li>Distribution to the LEFT of zero = Before > After (negative change)</li>
                </ul>
                <p><strong>Key questions:</strong></p>
                <ul>
                    <li>Are most differences positive or negative?</li>
                    <li>How spread out are the differences?</li>
                    <li>Are there any extreme outliers?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Look at the <strong>Distribution of differences</strong> histogram. Do most DMAs show higher conversion than recall?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret_results',
            title: "📈 Step 5: The t-Statistic and P-Value",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const testStat = document.getElementById('test-statistic')?.textContent || '';
                const pValue = document.getElementById('p-value')?.textContent || '';

                const tMatch = testStat.match(/t\s*\(\s*\d+\s*\)\s*=\s*([-\d.]+)/i);
                const pMatch = pValue.match(/p\s*([<=])\s*([\d.<]+)/i);

                if (!tMatch) return null;

                const tValue = Math.abs(parseFloat(tMatch[1]));
                const isSignificant = pMatch && (pMatch[1] === '<' || parseFloat(pMatch[2]) < 0.05);
                const pDisplay = pMatch ? `${pMatch[1]} ${pMatch[2]}` : 'unknown';

                return [
                    {
                        question: `The t-statistic is approximately ${tValue.toFixed(2)}. Is this large enough to be significant?`,
                        options: [
                            "No, |t| < 2 usually isn't significant",
                            "Yes, |t| > 2 typically is significant at α = 0.05",
                            "Cannot determine without the sample size"
                        ],
                        answer: tValue > 2 ? 1 : 0,
                        feedback: tValue > 2
                            ? `Correct! |t| ≈ ${tValue.toFixed(2)} is well above 2, indicating the mean difference is large relative to its standard error.`
                            : `Correct! |t| ≈ ${tValue.toFixed(2)} is relatively modest—the signal may not be strong enough to conclude significance.`
                    },
                    {
                        question: `With p ${pDisplay}, should you reject the null hypothesis at α = 0.05?`,
                        options: [
                            "Yes, reject H₀—the mean difference is significantly different from zero",
                            "No, fail to reject H₀—insufficient evidence of a real difference",
                            "Need more information"
                        ],
                        answer: isSignificant ? 0 : 1,
                        feedback: isSignificant
                            ? `Correct! p ${pDisplay} is less than 0.05, so we reject H₀ and conclude the paired measurements differ significantly.`
                            : `Correct! p ${pDisplay} exceeds 0.05, so we fail to reject H₀.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "In a paired t-test, degrees of freedom equals:",
                    options: [
                        "n₁ + n₂ - 2 (like independent t-test)",
                        "n - 1 (where n is the number of pairs)",
                        "2n - 1"
                    ],
                    answer: 1,
                    feedback: "Correct! df = n - 1 because we have n differences, and we estimate one parameter (the mean difference)."
                }
            ],
            content: `
                <p>The paired t-test is complete. Let's interpret the results.</p>
                <p><strong>Key statistics to examine:</strong></p>
                <ul>
                    <li><strong>t-statistic:</strong> How many standard errors the mean difference is from zero</li>
                    <li><strong>p-value:</strong> Probability of seeing this t (or more extreme) if H₀: μ_d = 0 were true</li>
                    <li><strong>Confidence interval:</strong> Range of plausible values for the true mean difference</li>
                </ul>
                <p><strong>The result cards show:</strong></p>
                <ul>
                    <li>t(df) = test statistic with degrees of freedom</li>
                    <li>p-value for the two-tailed test</li>
                    <li>95% CI for the mean difference</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Find the <strong>Paired t-Test</strong> result card. Is the p-value less than 0.05?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'visual_output',
            title: "📊 Step 6: Reading the Visualizations",
            targetId: 'tut-visual-section',
            content: `
                <p>The tool provides two key visualizations.</p>
                <p><strong>Mean Difference Chart (left):</strong></p>
                <ul>
                    <li>Shows the estimated mean difference</li>
                    <li>Error bars display the confidence interval</li>
                    <li>If the CI doesn't include zero, the result is significant</li>
                </ul>
                <p><strong>Distribution of Differences (right):</strong></p>
                <ul>
                    <li>Histogram of all individual d_i values</li>
                    <li>Helps assess normality (are differences bell-shaped?)</li>
                    <li>Reveals outliers that might influence results</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Check both charts. Does the confidence interval for the mean difference exclude zero?</p>
            `,
            quizzes: [
                {
                    question: "If the 95% CI for mean difference is [2.1, 5.8], what can you conclude?",
                    options: [
                        "The difference is NOT statistically significant",
                        "The difference IS statistically significant (CI excludes zero)",
                        "You need more data to decide"
                    ],
                    answer: 1,
                    feedback: "Correct! Since [2.1, 5.8] doesn't contain zero, we're 95% confident the true mean difference is positive—statistically significant."
                },
                {
                    question: "Why check the histogram of differences?",
                    options: [
                        "To calculate the sample size",
                        "To assess if the normality assumption is reasonable",
                        "To find the p-value"
                    ],
                    answer: 1,
                    feedback: "Correct! The paired t-test assumes differences are approximately normally distributed. The histogram helps you check this assumption."
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
            title: "📏 Step 7: Effect Size (Cohen's dz)",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const effectEl = document.getElementById('effect-size')?.textContent || '';
                const dMatch = effectEl.match(/dz?\s*=\s*([-\d.]+)/i);

                if (!dMatch) return null;

                const dValue = Math.abs(parseFloat(dMatch[1]));
                let category;
                if (dValue < 0.2) category = 'negligible';
                else if (dValue < 0.5) category = 'small';
                else if (dValue < 0.8) category = 'medium';
                else category = 'large';

                return [
                    {
                        question: `Cohen's dz is approximately ${dValue.toFixed(2)}. How would you classify this effect size?`,
                        options: [
                            "Small (d ≈ 0.2)",
                            "Medium (d ≈ 0.5)",
                            "Large (d ≥ 0.8)"
                        ],
                        answer: dValue < 0.35 ? 0 : (dValue < 0.65 ? 1 : 2),
                        feedback: `Correct! With dz ≈ ${dValue.toFixed(2)}, this is a ${category} effect size.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What's the difference between Cohen's dz (paired) and Cohen's d (independent)?",
                    options: [
                        "dz divides by the SD of differences; d divides by pooled SD of raw scores",
                        "dz is only for large samples; d is for small samples",
                        "They are calculated the same way"
                    ],
                    answer: 0,
                    feedback: "Correct! Cohen's dz = mean difference / SD of differences. This captures the effect relative to within-subject variability."
                }
            ],
            content: `
                <p>Effect size tells you the <strong>magnitude</strong> of the effect, independent of sample size.</p>
                <p><strong>Cohen's dz for paired data:</strong></p>
                <p style="text-align: center; font-family: serif;">dz = d̄ / s_d</p>
                <p><strong>Interpretation guidelines:</strong></p>
                <ul>
                    <li><strong>|dz| ≈ 0.2:</strong> Small effect</li>
                    <li><strong>|dz| ≈ 0.5:</strong> Medium effect</li>
                    <li><strong>|dz| ≥ 0.8:</strong> Large effect</li>
                </ul>
                <p><strong>Business importance:</strong> A statistically significant result with tiny dz might not be worth acting on. Large dz suggests a practically meaningful change.</p>
                <p class="task">👉 <strong>Task:</strong> Find Cohen's dz in the <strong>Effect sizes</strong> card. Is this a small, medium, or large effect?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business_conclusions',
            title: "💼 Step 8: Business Conclusions",
            targetId: 'tut-results-section',
            content: `
                <p>Now translate statistics into business recommendations.</p>
                <p><strong>For the Streaming Launch scenario, key questions:</strong></p>
                <ul>
                    <li>Do DMAs that score high on recall also convert well?</li>
                    <li>Is the conversion-recall gap large enough to justify the creative approach?</li>
                    <li>Should the brand invest more in recall-driving vs. conversion-driving content?</li>
                </ul>
                <p><strong>The APA and Managerial reports provide:</strong></p>
                <ul>
                    <li>Technical summary for academic/peer review</li>
                    <li>Plain-language interpretation for stakeholders</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read both the <strong>APA-Style</strong> and <strong>Managerial Interpretation</strong> panels. What's your recommendation?</p>
            `,
            quizzes: [
                {
                    question: "If conversion scores significantly exceed recall scores (p < 0.05, medium effect), what might you recommend?",
                    options: [
                        "Focus on recall-building ads since recall is lagging",
                        "The creative is successfully driving conversions; consider scaling",
                        "No action needed—the metrics are independent"
                    ],
                    answer: 1,
                    feedback: "Correct! If conversions reliably exceed recall with a meaningful effect size, the performance-oriented creative is working."
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
                <p>Excellent work! You've mastered the fundamentals of the paired samples t-test.</p>

                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>Paired design:</strong> Each subject/unit measured under both conditions</li>
                    <li><strong>Difference scores:</strong> Transform pairs into d_i = After_i - Before_i</li>
                    <li><strong>Test logic:</strong> Is the mean difference significantly different from zero?</li>
                    <li><strong>Power advantage:</strong> Eliminates between-subject variability</li>
                    <li><strong>Effect size (dz):</strong> Mean difference relative to SD of differences</li>
                    <li><strong>Degrees of freedom:</strong> n - 1 (number of pairs minus one)</li>
                </ul>

                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    The paired t-test assumes differences are normally distributed and that pairs are truly independent of each other. In marketing, violations are common: if DMAs share media spillover, pairs aren't independent; if some DMAs are massive outliers, normality may fail. Advanced analysts consider robust alternatives like the Wilcoxon signed-rank test, bootstrapped confidence intervals, or mixed-effects models that account for DMA-level clustering. Always visualize the differences before trusting the test.
                </p>

                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Check the <strong>Diagnostics</strong> section for assumption checks</li>
                    <li>Try the "Retail Pricing" scenario (difference scores input)</li>
                    <li>Explore <strong>independent t-tests</strong> for unpaired group comparisons</li>
                </ul>

                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Paired tests are powerful for reducing noise. Try the McNemar test for paired proportions, or mixed-effects ANOVA for repeated measures with multiple time points!
                </p>
            `,
            check: () => true,
            onEnter: () => {
                PairedTTestTutorial.hideOverlay();
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
                    { action: 'tutorial_completed', tool: 'paired-ttest' },
                    'Professor Mode tutorial completed for Paired t-Test'
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="PairedTTestTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="PairedTTestTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="PairedTTestTutorial.nextStep()">Next Step ➜</button>`
                ) :
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }

            <button class="btn-secondary full-width" onclick="PairedTTestTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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
                <button onclick="PairedTTestTutorial.stop()" class="close-tutorial">×</button>
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
    setTimeout(() => PairedTTestTutorial.init(), 500);
});
