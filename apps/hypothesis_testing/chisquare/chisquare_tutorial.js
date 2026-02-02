/**
 * Chi-Square Test of Independence Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const ChiSquareTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to Chi-Square Test",
            targetId: null,
            content: `
                <p>Welcome! Today we're going to learn how to conduct a <strong>chi-square test of independence</strong> to determine if two categorical variables are related.</p>
                <p><strong>The Mission:</strong> You'll analyze a real marketing dataset to test whether customer segment and promotional outcome are independent or associated.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Understanding chi-square concepts</li>
                    <li>Downloading and inspecting raw data</li>
                    <li>Loading data into the tool</li>
                    <li>Reading the contingency table</li>
                    <li>Interpreting χ² and p-value</li>
                    <li>Understanding the visual output</li>
                    <li>Measuring effect size (Cramér's V)</li>
                    <li>Drawing business conclusions</li>
                </ol>
                <p><strong>When to use chi-square?</strong> When both variables are categorical (e.g., segment × outcome, channel × response, region × preference) and you want to test if they're related.</p>
            `,
            quizzes: [
                {
                    question: "What type of data does the chi-square test of independence analyze?",
                    options: [
                        "Two continuous variables",
                        "Two categorical variables arranged in a contingency table",
                        "One categorical and one continuous variable"
                    ],
                    answer: 1,
                    feedback: "Correct! Chi-square tests whether two categorical variables are independent using counts in a contingency table."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding Chi-Square Logic",
            targetId: 'tut-overview-section',
            content: `
                <p>The chi-square test compares <strong>observed counts</strong> to <strong>expected counts</strong>.</p>
                <p><strong>The key insight:</strong> If two variables are truly independent, the expected count in each cell depends only on the row and column totals:</p>
                <p style="text-align: center; font-family: serif;">E<sub>ij</sub> = (Row<sub>i</sub> total × Col<sub>j</sub> total) / Grand total</p>
                <p><strong>The chi-square statistic:</strong></p>
                <p style="text-align: center; font-family: serif;">χ² = Σ (O<sub>ij</sub> - E<sub>ij</sub>)² / E<sub>ij</sub></p>
                <p><strong>Interpretation:</strong></p>
                <ul>
                    <li>Large χ² = observed counts differ greatly from expected → reject independence</li>
                    <li>Small χ² = observed ≈ expected → fail to reject independence</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>Test Overview & Equations</strong> section. Note how expected counts are computed.</p>
            `,
            quizzes: [
                {
                    question: "What is the null hypothesis in a chi-square test of independence?",
                    options: [
                        "The two variables have equal means",
                        "The two categorical variables are independent (no association)",
                        "The observed counts equal the expected counts exactly"
                    ],
                    answer: 1,
                    feedback: "Correct! H₀: The row variable and column variable are independent—knowing one gives no information about the other."
                },
                {
                    question: "What does a large chi-square statistic indicate?",
                    options: [
                        "Strong evidence of independence",
                        "Strong evidence against independence (variables are associated)",
                        "The sample size is too small"
                    ],
                    answer: 1,
                    feedback: "Correct! Large χ² means observed counts deviate substantially from what we'd expect if the variables were independent."
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
                <p>Now let's work with <strong>real data</strong>. We'll use the "Loyalty Program Nudge Test" scenario.</p>
                <p><strong>About this dataset:</strong> A retailer tested loyalty nudges across two customer segments:</p>
                <ul>
                    <li><strong>Row variable (Segment):</strong> Enrolled Member vs. In-Store Fan</li>
                    <li><strong>Column variable (Outcome):</strong> Redeemed Coupon, Made Visit, or No Response</li>
                </ul>
                <p><strong>Business question:</strong> Does response type depend on segment membership, or do both segments behave similarly?</p>
                <p><strong>Your task:</strong></p>
                <ol>
                    <li>Select <strong>"Loyalty Program Nudge Test"</strong> from the dropdown</li>
                    <li>Click <strong>"Download scenario dataset"</strong></li>
                    <li>Open the CSV to see its row-level format: segment, outcome</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> Select the scenario and download the raw data file.</p>
            `,
            quizzes: [
                {
                    question: "In raw chi-square data, what does each row typically represent?",
                    options: [
                        "One cell of the contingency table (with a count)",
                        "One individual observation (with a category value for each variable)",
                        "Summary statistics for the entire sample"
                    ],
                    answer: 1,
                    feedback: "Correct! Raw data has one row per observation, with categorical values for both variables. The tool aggregates these into a contingency table."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value === 'loyalty_nudge';
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
                    <li><strong>Manual entry:</strong> Type counts directly into the table</li>
                    <li><strong>Upload contingency table:</strong> Import pre-aggregated counts</li>
                    <li><strong>Upload raw data:</strong> Import row-level observations (what we're using)</li>
                </ul>
                <p><strong>When you load raw data, the tool automatically:</strong></p>
                <ol>
                    <li>Identifies unique categories for each variable</li>
                    <li>Cross-tabulates to create the contingency table</li>
                    <li>Calculates row, column, and grand totals</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> The scenario should auto-load. Verify you see a <strong>2×3 contingency table</strong> (2 segments × 3 outcomes).</p>
            `,
            quizzes: [
                {
                    question: "If the raw data has 200 rows, the contingency table shows:",
                    options: [
                        "200 cells (one per observation)",
                        "Counts summing to 200 (the grand total)",
                        "Just the 200 individual values"
                    ],
                    answer: 1,
                    feedback: "Correct! The contingency table aggregates observations—all 200 rows are counted and distributed across the table cells."
                }
            ],
            check: () => {
                const tableContainer = document.getElementById('tableContainer');
                if (!tableContainer) return false;
                const inputs = tableContainer.querySelectorAll('input[type="number"]');
                // Check if we have at least 6 cells (2x3) with some values
                let filledCells = 0;
                inputs.forEach(input => {
                    if (input.value && parseFloat(input.value) > 0) filledCells++;
                });
                return filledCells >= 4; // At least some cells populated
            },
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'read_table',
            title: "🔢 Step 4: Reading the Contingency Table",
            targetId: 'tut-input-section',
            getDynamicQuizzes: () => {
                const chi2El = document.getElementById('chi2');
                if (!chi2El || chi2El.textContent === '–') return null;

                // Try to read total from the table
                const tableContainer = document.getElementById('tableContainer');
                if (!tableContainer) return null;

                return [
                    {
                        question: "Looking at the table, what do the row totals tell you?",
                        options: [
                            "How many outcomes occurred in each segment",
                            "The percentage of each outcome type",
                            "The chi-square contribution of each row"
                        ],
                        answer: 0,
                        feedback: "Correct! Row totals show the sample size in each segment, regardless of outcome."
                    }
                ];
            },
            quizzes: [
                {
                    question: "In a contingency table, what do marginal totals represent?",
                    options: [
                        "The chi-square contributions for each cell",
                        "The sum of counts across a row (or down a column)",
                        "The expected counts under independence"
                    ],
                    answer: 1,
                    feedback: "Correct! Marginals are the row/column totals—they're used to calculate expected counts."
                }
            ],
            content: `
                <p>Let's examine the contingency table structure.</p>
                <p><strong>The table shows:</strong></p>
                <ul>
                    <li><strong>Rows:</strong> Customer segments (e.g., Enrolled Member, In-Store Fan)</li>
                    <li><strong>Columns:</strong> Response outcomes (e.g., Coupon, Visit, None)</li>
                    <li><strong>Cells:</strong> Count of customers in each segment × outcome combination</li>
                    <li><strong>Marginals:</strong> Row and column totals</li>
                </ul>
                <p><strong>Key observations:</strong></p>
                <ul>
                    <li>Which segment has more observations?</li>
                    <li>Which outcome is most common overall?</li>
                    <li>Do the proportions look similar across segments?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Look at the table. Does one segment have notably higher response rates than the other?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret_results',
            title: "📈 Step 5: The χ² Statistic and P-Value",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const chi2El = document.getElementById('chi2');
                const pValueEl = document.getElementById('pValue');
                const dfEl = document.getElementById('df');

                if (!chi2El || chi2El.textContent === '–') return null;

                const chi2 = parseFloat(chi2El.textContent);
                const pValue = pValueEl?.textContent || '';
                const df = dfEl?.textContent || '';

                if (!isFinite(chi2)) return null;

                const isSignificant = pValue.includes('<') || (parseFloat(pValue) < 0.05);

                return [
                    {
                        question: `The χ² statistic is approximately ${chi2.toFixed(2)} with df = ${df}. What does a larger χ² indicate?`,
                        options: [
                            "Stronger evidence that the variables are independent",
                            "Stronger evidence that the variables are associated",
                            "The sample size is inadequate"
                        ],
                        answer: 1,
                        feedback: `Correct! χ² = ${chi2.toFixed(2)} measures how much observed counts deviate from expected counts. Larger values suggest association.`
                    },
                    {
                        question: `Based on the p-value (p ${pValue}), should you reject independence at α = 0.05?`,
                        options: [
                            "Yes—the variables appear to be associated",
                            "No—insufficient evidence against independence",
                            "Cannot determine without more data"
                        ],
                        answer: isSignificant ? 0 : 1,
                        feedback: isSignificant
                            ? `Correct! With p ${pValue} < 0.05, we reject the null hypothesis of independence—segment and outcome are associated.`
                            : `Correct! With p ${pValue} > 0.05, we fail to reject independence—no significant association detected.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What determines the degrees of freedom for a chi-square test?",
                    options: [
                        "df = n - 1 (sample size minus one)",
                        "df = (rows - 1) × (columns - 1)",
                        "df = total cells in the table"
                    ],
                    answer: 1,
                    feedback: "Correct! For an r×c contingency table, df = (r-1) × (c-1). A 2×3 table has (2-1)×(3-1) = 2 df."
                }
            ],
            content: `
                <p>The chi-square test is complete. Let's interpret the results.</p>
                <p><strong>Key statistics to examine:</strong></p>
                <ul>
                    <li><strong>χ² (chi-square):</strong> Sum of squared deviations from expected counts</li>
                    <li><strong>df (degrees of freedom):</strong> (rows-1) × (columns-1)</li>
                    <li><strong>p-value:</strong> Probability of seeing this χ² (or larger) if variables were independent</li>
                </ul>
                <p><strong>Decision rule:</strong> If p < α (usually 0.05), reject the null hypothesis of independence.</p>
                <p class="task">👉 <strong>Task:</strong> Find the <strong>Test Results</strong> panel. Is the p-value less than 0.05?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'visual_output',
            title: "📊 Step 6: Reading the Stacked Bar Chart",
            targetId: 'tut-visual-section',
            content: `
                <p>The tool provides a <strong>100% stacked bar chart</strong> to visualize the contingency table.</p>
                <p><strong>How to read it:</strong></p>
                <ul>
                    <li>Each bar represents one row category (e.g., one segment)</li>
                    <li>Segments within each bar show column proportions (e.g., outcome types)</li>
                    <li>All bars sum to 100%—making proportions comparable across groups</li>
                </ul>
                <p><strong>What to look for:</strong></p>
                <ul>
                    <li>If bars have <strong>similar segment proportions</strong> → variables may be independent</li>
                    <li>If bars have <strong>different segment proportions</strong> → variables may be associated</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Look at the stacked bar chart. Do the two segments have similar outcome distributions?</p>
            `,
            quizzes: [
                {
                    question: "If both bars look nearly identical in their segment proportions, what does this suggest?",
                    options: [
                        "The variables are strongly associated",
                        "The variables may be independent (similar distributions)",
                        "The sample size is too small"
                    ],
                    answer: 1,
                    feedback: "Correct! Identical bar compositions suggest segment doesn't influence outcome—consistent with independence."
                },
                {
                    question: "Why use a 100% stacked bar chart instead of raw counts?",
                    options: [
                        "It makes the chi-square easier to calculate",
                        "It makes comparison fair even when row totals differ",
                        "It hides the actual sample sizes"
                    ],
                    answer: 1,
                    feedback: "Correct! Percentages normalize for different sample sizes, making proportional comparisons meaningful."
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
            title: "📏 Step 7: Effect Size (Cramér's V)",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                const cramerEl = document.getElementById('cramerV');
                if (!cramerEl || cramerEl.textContent === '–') return null;

                const cramerText = cramerEl.textContent;
                const vMatch = cramerText.match(/([\d.]+)/);
                if (!vMatch) return null;

                const vValue = parseFloat(vMatch[1]);
                let category;
                if (vValue < 0.1) category = 'negligible';
                else if (vValue < 0.3) category = 'small';
                else if (vValue < 0.5) category = 'medium';
                else category = 'large';

                return [
                    {
                        question: `Cramér's V is approximately ${vValue.toFixed(2)}. How would you classify this association strength?`,
                        options: [
                            "Weak/small (V ≈ 0.1)",
                            "Moderate/medium (V ≈ 0.3)",
                            "Strong/large (V ≥ 0.5)"
                        ],
                        answer: vValue < 0.2 ? 0 : (vValue < 0.4 ? 1 : 2),
                        feedback: `Correct! With V ≈ ${vValue.toFixed(2)}, this is a ${category} association between the variables.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is Cramér's V preferred over raw χ² for comparing effect sizes?",
                    options: [
                        "V is bounded between 0 and 1, making comparison meaningful",
                        "V doesn't depend on sample size like χ² does",
                        "Both A and B"
                    ],
                    answer: 2,
                    feedback: "Correct! Cramér's V normalizes χ² by sample size and table dimensions, yielding a 0-1 scale independent of n."
                }
            ],
            content: `
                <p>Statistical significance doesn't tell you how <strong>strong</strong> the association is. That's what Cramér's V measures.</p>
                <p><strong>Cramér's V interpretation:</strong></p>
                <ul>
                    <li><strong>V ≈ 0.1:</strong> Small/weak association</li>
                    <li><strong>V ≈ 0.3:</strong> Medium/moderate association</li>
                    <li><strong>V ≥ 0.5:</strong> Large/strong association</li>
                </ul>
                <p><strong>Formula:</strong></p>
                <p style="text-align: center; font-family: serif;">V = √(χ² / (n × (k-1)))</p>
                <p>where k = min(rows, columns)</p>
                <p class="task">👉 <strong>Task:</strong> Find Cramér's V in the results. Is this a weak, moderate, or strong association?</p>
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
                <p>Now translate statistics into actionable insights.</p>
                <p><strong>For the Loyalty Nudge scenario, key questions:</strong></p>
                <ul>
                    <li>Does customer segment predict response type?</li>
                    <li>Should we tailor promotions differently by segment?</li>
                    <li>Is the association strong enough to warrant segmented campaigns?</li>
                </ul>
                <p><strong>Business implications:</strong></p>
                <ul>
                    <li><strong>Significant + Strong V:</strong> Definitely segment your campaigns</li>
                    <li><strong>Significant + Weak V:</strong> Association exists but may not be worth customization cost</li>
                    <li><strong>Not significant:</strong> Treat all segments the same way</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the <strong>Managerial Interpretation</strong>. What would you recommend for the loyalty program?</p>
            `,
            quizzes: [
                {
                    question: "If χ² is significant but Cramér's V = 0.08, what's the practical implication?",
                    options: [
                        "Strong association—definitely customize by segment",
                        "Weak association—customization may not be worth the operational cost",
                        "Need more data to decide"
                    ],
                    answer: 1,
                    feedback: "Correct! A tiny V means the association, while statistically detectable, is so weak that segment-specific campaigns may not deliver meaningful ROI."
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
                <p>Excellent work! You've mastered the fundamentals of the chi-square test of independence.</p>

                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>Purpose:</strong> Test whether two categorical variables are associated</li>
                    <li><strong>Contingency table:</strong> Cross-tabulation of counts by categories</li>
                    <li><strong>Expected counts:</strong> What we'd expect if variables were independent</li>
                    <li><strong>χ² statistic:</strong> Measures deviation of observed from expected</li>
                    <li><strong>Degrees of freedom:</strong> (rows-1) × (columns-1)</li>
                    <li><strong>Cramér's V:</strong> Effect size measure bounded 0-1</li>
                </ul>

                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    The chi-square test assumes observations are independent and expected cell counts are reasonably large (often cited as ≥ 5). When cells are sparse, Fisher's exact test or simulation-based methods are preferred. For ordinal categories (e.g., Low/Medium/High), consider Cochran-Armitage trend tests or Kendall's tau. Advanced analysts also examine standardized residuals to identify <em>which</em> cells drive the association, not just whether one exists. Remember: association isn't causation—lurking variables may explain the pattern.
                </p>

                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Check the <strong>Expected Counts</strong> table in Diagnostics</li>
                    <li>Try changing the Cell Labels mode to see row %, column %, etc.</li>
                    <li>Explore <strong>A/B proportion tests</strong> for 2×2 tables with focus on conversion</li>
                </ul>

                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Chi-square is versatile! Try goodness-of-fit tests for single-variable distributions, or McNemar's test for paired categorical data!
                </p>
            `,
            check: () => true,
            onEnter: () => {
                ChiSquareTutorial.hideOverlay();
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
                    { action: 'tutorial_completed', tool: 'chisquare' },
                    'Professor Mode tutorial completed for Chi-Square Test'
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="ChiSquareTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="ChiSquareTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="ChiSquareTutorial.nextStep()">Next Step ➜</button>`
                ) :
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }

            <button class="btn-secondary full-width" onclick="ChiSquareTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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
                <button onclick="ChiSquareTutorial.stop()" class="close-tutorial">×</button>
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
    setTimeout(() => ChiSquareTutorial.init(), 500);
});
