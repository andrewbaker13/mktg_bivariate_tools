/**
 * Basic Conjoint Analysis — Professor Mode Tutorial
 * Follows the standardized pattern from .github/prompts/add-professor-mode.md
 * CSS lives in shared/css/main.css — do NOT duplicate styles here.
 */

const ConjointBasicTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,
    tutorialStartTime: null,
    tutorialCompleted: false,

    // ════════════════════════════════════════════════════════════════════
    // HELPER: Get live data from the tool (when available)
    // ════════════════════════════════════════════════════════════════════
    getLiveData() {
        const nRespondents = document.getElementById('conjoint-n-respondents')?.textContent;
        const meanR2 = document.getElementById('conjoint-mean-r2')?.textContent;
        const meanTasks = document.getElementById('conjoint-mean-tasks')?.textContent;

        return {
            hasResults: nRespondents && nRespondents !== '–',
            nRespondents: parseInt(nRespondents) || 0,
            meanR2: parseFloat(meanR2) || 0,
            meanTasks: parseFloat(meanTasks) || 0
        };
    },

    // ════════════════════════════════════════════════════════════════════
    // TUTORIAL STEPS
    // ════════════════════════════════════════════════════════════════════
    steps: [
        {
            id: 'welcome',
            title: 'Welcome to Basic Conjoint Analysis',
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome! This tutorial will guide you through <strong>choice-based conjoint (CBC) analysis</strong> — one of the most powerful tools in marketing research.</p>
                <p>Conjoint analysis answers a fundamental question: <strong>What product features drive customer choice?</strong></p>
                <p>In this basic version, all attributes are <strong>categorical</strong> (e.g., brand names, size tiers, feature options). This keeps the math simple while teaching core conjoint concepts.</p>
                <p class="task"><strong>Task:</strong> Read the highlighted Test Overview section. Pay attention to the MNL utility equation and the Key Concepts dropdown.</p>
            `,
            quizzes: [
                {
                    question: "In MNL, what does the 'reference level' of an attribute mean?",
                    options: [
                        "The first level gets utility = 0; other levels are measured relative to it",
                        "The most popular level chosen by respondents",
                        "The level with the highest price"
                    ],
                    answer: 0,
                    feedback: "Correct! The reference level is set to utility = 0 and all other levels are estimated relative to it. This is called dummy coding."
                }
            ],
            onEnter: () => {
                const el = document.getElementById('tut-overview-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'load-data',
            title: 'Step 1: Load CBC Data',
            targetId: 'tut-scenario-section',
            content: `
                <p>CBC data is in <strong>"long format"</strong> — one row per alternative per choice task per respondent:</p>
                <ul>
                    <li><strong>respondent_id:</strong> Who took the survey</li>
                    <li><strong>task_id:</strong> Which choice question</li>
                    <li><strong>alternative_id:</strong> Which option in that task</li>
                    <li><strong>chosen:</strong> 1 if picked, 0 if not</li>
                    <li><strong>Attribute columns:</strong> The product features</li>
                </ul>
                <p>For example, if 80 respondents each saw 10 tasks with 3 options, that's 80 &times; 10 &times; 3 = <strong>2,400 rows</strong>.</p>
                <p class="task"><strong>Task:</strong> Select one of the Marketing Scenarios from the dropdown (e.g., "Campus Coffee Shop Redesign") to load sample data.</p>
            `,
            quizzes: [
                {
                    question: "If 100 respondents each complete 8 tasks with 3 alternatives, how many rows should the CSV have?",
                    options: [
                        "800 rows",
                        "2,400 rows",
                        "300 rows",
                        "100 rows"
                    ],
                    answer: 1,
                    feedback: "Correct! 100 respondents &times; 8 tasks &times; 3 alternatives = 2,400 rows in long format."
                }
            ],
            check: () => {
                const feedback = document.getElementById('conjoint-upload-feedback');
                return feedback && feedback.classList.contains('success');
            },
            onEnter: () => {
                const el = document.getElementById('tut-scenario-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'configure-attributes',
            title: 'Step 2: Configure Attributes',
            targetId: 'conjoint-attribute-config',
            content: `
                <p>After loading data, the tool <strong>auto-detects</strong> all categorical attributes and their levels. You'll see each attribute listed with its levels displayed as tags.</p>
                <p>The <strong>yellow "(ref)" tag</strong> marks the reference level — the first level alphabetically. All other levels' utilities are measured relative to this baseline.</p>
                <p>In the basic tool, there's no type selector needed — everything is categorical.</p>
                <p class="task"><strong>Task:</strong> Look at the highlighted Detected Attributes panel. Count how many attributes were found and note the reference level for each.</p>
            `,
            quizzes: [
                {
                    question: "Why does one level in each attribute have utility = 0 (the reference)?",
                    options: [
                        "To prevent perfect multicollinearity in the design matrix",
                        "Because that level is always the least popular",
                        "It's a random choice by the software"
                    ],
                    answer: 0,
                    feedback: "Correct! With K levels, we need K-1 dummy variables. One level must be the baseline (utility = 0) to avoid perfect multicollinearity. All other utilities are measured as differences from this reference."
                }
            ],
            onEnter: () => {
                const el = document.getElementById('conjoint-attribute-config');
                if (el && el.style.display !== 'none') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },
        {
            id: 'estimation',
            title: 'Step 3: Estimate the Model',
            targetId: 'conjoint-estimation-controls',
            content: `
                <p>The tool estimates a <strong>Multinomial Logit (MNL)</strong> model for each respondent individually:</p>
                <ol>
                    <li><strong>Dummy coding:</strong> Each non-reference level becomes a 0/1 variable</li>
                    <li><strong>Utility function:</strong> U = &sum; &beta; &times; dummy</li>
                    <li><strong>Softmax:</strong> P(choose j) = exp(U<sub>j</sub>) / &sum; exp(U<sub>k</sub>)</li>
                    <li><strong>Optimization:</strong> L-BFGS maximizes log-likelihood with L2 penalty</li>
                </ol>
                <p>The <strong>L2 regularization</strong> parameter (default 1.0) prevents overfitting when respondents have few tasks.</p>
                <p class="task"><strong>Task:</strong> Leave regularization at 1.0 and click "Estimate Individual Utilities" to run the model.</p>
            `,
            quizzes: [
                {
                    question: "What does L2 regularization do in this context?",
                    options: [
                        "Penalizes extreme coefficient values to prevent overfitting",
                        "Increases the number of respondents in the sample",
                        "Removes outlier respondents from the analysis"
                    ],
                    answer: 0,
                    feedback: "Correct! L2 (Ridge) regularization adds a penalty term &lambda;||&beta;||&sup2; to the log-likelihood, shrinking extreme coefficients toward zero. This is especially helpful for respondents with few choice tasks."
                }
            ],
            check: () => {
                return ConjointBasicTutorial.getLiveData().hasResults;
            },
            onEnter: () => {
                const el = document.getElementById('conjoint-estimation-controls');
                if (el && el.style.display !== 'none') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },
        {
            id: 'importance',
            title: 'Reading Attribute Importance',
            targetId: 'tut-visual-output-section',
            content: `
                <p>The <strong>Attribute Importance</strong> chart shows which features drive customer choice the most.</p>
                <p><strong>How it's calculated:</strong></p>
                <ol>
                    <li>For each attribute, find the <strong>range</strong> of average utilities (best level minus worst level)</li>
                    <li>Divide each range by the <strong>sum of all ranges</strong></li>
                    <li>Multiply by 100 to get a percentage</li>
                </ol>
                <p><strong>Marketing insight:</strong> Attributes with &lt;10% importance have minimal impact on purchase decisions. Focus your budget on high-importance attributes.</p>
                <p class="task"><strong>Task:</strong> Look at the Attribute Importance chart. Which attribute has the highest importance percentage?</p>
            `,
            getDynamicQuizzes: function () {
                const impChart = document.getElementById('chart-importance');
                if (!impChart || !impChart.data || !impChart.data[0]) return null;
                const labels = impChart.data[0].x;
                const values = impChart.data[0].y;
                if (!labels || labels.length < 2) return null;

                const maxIdx = values.indexOf(Math.max(...values));
                const topAttr = labels[maxIdx];
                const topVal = values[maxIdx].toFixed(1);

                return [
                    {
                        question: `Looking at your results, ${topAttr} has ${topVal}% importance. What does this mean?`,
                        options: [
                            `${topAttr} has the widest range of utilities across its levels — it drives choice the most`,
                            `${topAttr} has the highest average utility value`,
                            `${topAttr} has the most levels`
                        ],
                        answer: 0,
                        feedback: `Correct! ${topAttr} at ${topVal}% importance means its levels span the widest utility range relative to other attributes. Customers' choices are most influenced by differences in ${topAttr}.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Attribute importance of 40% for 'Brand' means what?",
                    options: [
                        "Brand differences account for 40% of the total utility range across all attributes",
                        "40% of customers care about brand",
                        "Brand has a 40% market share"
                    ],
                    answer: 0,
                    feedback: "Correct! Importance is the ratio of an attribute's utility range to the sum of all ranges. 40% means brand drives 40% of the variation in choice decisions."
                }
            ],
            onEnter: () => {
                const el = document.getElementById('tut-visual-output-section');
                if (el && el.style.display !== 'none') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },
        {
            id: 'partworths',
            title: 'Reading Part-Worth Utilities',
            targetId: 'tut-visual-output-section',
            content: `
                <p>The <strong>Part-Worth Utilities</strong> chart shows the average value customers place on each attribute level.</p>
                <p><strong>Key rules:</strong></p>
                <ul>
                    <li><strong>Within an attribute,</strong> compare levels: higher utility = more preferred</li>
                    <li><strong>Reference levels</strong> always have utility = 0</li>
                    <li><strong>Positive values</strong> mean "preferred over reference"; negative means "less preferred"</li>
                    <li><strong>Error bars</strong> show standard deviation — wide bars mean diverse preferences (segmentation opportunity!)</li>
                </ul>
                <p class="task"><strong>Task:</strong> Scroll down to the Part-Worth Utilities chart. Identify which level of which attribute has the highest and lowest average utility.</p>
            `,
            quizzes: [
                {
                    question: "If 'Oat Milk' has utility +1.2 and the reference 'No Milk' has utility 0, what does this mean?",
                    options: [
                        "On average, customers prefer oat milk over no milk by 1.2 utility units",
                        "Oat milk costs $1.20 more than no milk",
                        "1.2% of customers prefer oat milk"
                    ],
                    answer: 0,
                    feedback: "Correct! The +1.2 means oat milk adds 1.2 utility units relative to the no-milk baseline. Higher utility = stronger preference. To compare across attributes, look at attribute importance instead."
                }
            ],
            onEnter: () => {
                const el = document.getElementById('chart-partworths');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'model-fit',
            title: 'Model Fit: Pseudo-R\u00B2',
            targetId: 'tut-model-results-section',
            content: `
                <p>The <strong>McFadden pseudo-R&sup2;</strong> measures how well the model predicts each respondent's choices compared to random guessing.</p>
                <ul>
                    <li><strong>&lt; 0.1:</strong> Poor fit — barely improves over chance</li>
                    <li><strong>0.1 – 0.2:</strong> Modest fit — acceptable for some applications</li>
                    <li><strong>0.2 – 0.4:</strong> Good fit — typical for well-designed CBC studies</li>
                    <li><strong>&gt; 0.4:</strong> Excellent fit — strong predictive power</li>
                </ul>
                <p>Unlike regular R&sup2;, pseudo-R&sup2; values of 0.2–0.4 are considered <em>good</em>. Don't expect values near 1.0!</p>
                <p class="task"><strong>Task:</strong> Look at the Model Results panel. Find the Mean pseudo-R&sup2; value and determine whether the model fit is good.</p>
            `,
            getDynamicQuizzes: function () {
                const data = ConjointBasicTutorial.getLiveData();
                if (!data.hasResults || !data.meanR2) return null;

                const r2 = data.meanR2;
                const r2Display = r2.toFixed(3);
                const quality = r2 > 0.4 ? 'excellent' : r2 > 0.2 ? 'good' : r2 > 0.1 ? 'modest' : 'poor';
                const correctIdx = r2 > 0.4 ? 2 : r2 > 0.2 ? 1 : r2 > 0.1 ? 0 : 3;

                return [
                    {
                        question: `Your model's mean pseudo-R\u00B2 is ${r2Display}. How would you rate this fit?`,
                        options: [
                            "Modest fit (0.1–0.2)",
                            "Good fit (0.2–0.4)",
                            "Excellent fit (>0.4)",
                            "Poor fit (<0.1)"
                        ],
                        answer: correctIdx,
                        feedback: `Correct! A pseudo-R\u00B2 of ${r2Display} indicates ${quality} model fit. For CBC conjoint studies, this is ${quality === 'good' || quality === 'excellent' ? 'a solid result' : 'worth investigating — consider whether respondents had enough tasks or if the design had sufficient variation'}.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "A pseudo-R\u00B2 of 0.35 in conjoint analysis is considered:",
                    options: [
                        "Poor — the model barely works",
                        "Good — typical for well-designed CBC studies",
                        "Perfect — the model explains everything"
                    ],
                    answer: 1,
                    feedback: "Correct! In discrete choice models, pseudo-R\u00B2 of 0.2–0.4 is considered good. Values above 0.4 are excellent. This is different from OLS regression where 0.35 might seem low."
                }
            ],
            onEnter: () => {
                const el = document.getElementById('tut-model-results-section');
                if (el && el.style.display !== 'none') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },
        {
            id: 'simulation',
            title: 'Market Simulation',
            targetId: 'tut-simulation-section',
            content: `
                <p>Market simulation is where conjoint becomes actionable. You define <strong>hypothetical product profiles</strong> and the model predicts <strong>market shares</strong>.</p>
                <p><strong>How it works:</strong></p>
                <ol>
                    <li>For each product, compute its utility for every respondent</li>
                    <li>Apply the softmax to get each respondent's choice probability</li>
                    <li>Average probabilities across all respondents = predicted market share</li>
                </ol>
                <p><strong>Try this:</strong> Create 2-3 products with different configurations and see how shares change when you swap attribute levels.</p>
                <p class="task"><strong>Task:</strong> In the Market Simulation section, configure at least 2 products with different attribute levels and click "Run Market Simulation."</p>
            `,
            quizzes: [
                {
                    question: "If Product A has higher utility than Product B for most respondents, what happens to market shares?",
                    options: [
                        "Product A gets a higher predicted market share",
                        "Both products get equal shares",
                        "Market share depends only on price"
                    ],
                    answer: 0,
                    feedback: "Correct! In MNL simulation, products with higher average utility attract more choice probability from each respondent, resulting in higher predicted market share."
                }
            ],
            onEnter: () => {
                const el = document.getElementById('tut-simulation-section');
                if (el && el.style.display !== 'none') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },
        {
            id: 'optimization',
            title: 'Product Optimization',
            targetId: 'tut-optimization-section',
            content: `
                <p>The optimization section uses <strong>brute-force enumeration</strong> to find the best possible product configuration.</p>
                <p>It tests every combination of selected attribute levels and ranks them by predicted market share (as a standalone product vs. a baseline).</p>
                <p><strong>Practical use:</strong> This answers "If I could design any product from these attributes, which combination would be most appealing?"</p>
                <p><strong>Limitation:</strong> This finds the globally optimal product in isolation. Use the simulation section to test how it performs against specific competitors.</p>
                <p class="task"><strong>Task:</strong> Select which attributes to vary and click "Run Optimization" to find the top configurations.</p>
            `,
            quizzes: [
                {
                    question: "Why might the 'optimal' product from brute-force not be the best business decision?",
                    options: [
                        "It doesn't account for competitive dynamics, costs, or feasibility constraints",
                        "Brute-force algorithms are always wrong",
                        "Customers always prefer the cheapest option"
                    ],
                    answer: 0,
                    feedback: "Correct! The brute-force optimizer finds what's most preferred in isolation, but real markets have competitors, cost constraints, production feasibility, and brand positioning to consider. Always validate with competitive simulation."
                }
            ],
            onEnter: () => {
                const el = document.getElementById('tut-optimization-section');
                if (el && el.style.display !== 'none') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },
        {
            id: 'conclusion',
            title: 'Professor Mode Complete!',
            targetId: null,
            content: `
                <h4>What You've Learned</h4>
                <ul>
                    <li>How CBC data is structured (long format with respondent/task/alternative/chosen)</li>
                    <li>How MNL estimation produces part-worth utilities via softmax and maximum likelihood</li>
                    <li>How to interpret attribute importance and part-worth utility charts</li>
                    <li>How market simulation translates utilities into predicted shares</li>
                    <li>How brute-force optimization finds the most preferred product configuration</li>
                </ul>

                <h4>Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    This basic tool handles categorical attributes well, but real-world conjoint studies often include continuous variables (price, screen size) that require numeric coefficient estimation and enable willingness-to-pay calculations. The individual-level MNL approach here is a simplified alternative to Hierarchical Bayes estimation, which borrows strength across respondents for more stable estimates with limited data. Professional analysts also validate their models with holdout tasks, test for IIA violations, and segment respondents to uncover latent preference clusters. As you advance, explore the <a href="../main_conjoint.html">Full Conjoint Tool</a> for these capabilities, and consider how conjoint fits into a broader product strategy toolkit alongside qualitative research and competitive analysis.
                </p>

                <h4>Next Steps</h4>
                <ul>
                    <li>Try uploading your own CBC dataset</li>
                    <li>Experiment with different regularization values to see how estimates change</li>
                    <li>Build competitive simulation scenarios with 3+ products</li>
                    <li>Explore the <a href="../main_conjoint.html">Full Conjoint Tool</a> for numeric attributes, WTP, and segmentation</li>
                </ul>
            `
        }
    ],

    // ════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ════════════════════════════════════════════════════════════════════

    init() {
        const checkbox = document.getElementById('professorMode');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) this.start();
                else this.stop();
            });
        }
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.tutorialStartTime = Date.now();
        document.getElementById('tutorial-sidebar').classList.add('active');
        document.getElementById('tutorial-overlay').classList.add('active');
        document.body.classList.add('tutorial-active');
        this.updateView();
        if (typeof logFeatureUsage === 'function') {
            logFeatureUsage('conjoint-basic', 'toggle_professor_mode', { enabled: true });
        }
    },

    stop() {
        this.isActive = false;
        document.getElementById('tutorial-sidebar').classList.remove('active');
        document.getElementById('tutorial-overlay').classList.remove('active');
        document.body.classList.remove('tutorial-active');
        this.clearHighlight();

        // Track completion if student finished all steps
        if (this.currentStep === this.steps.length - 1) {
            this.tutorialCompleted = true;
            if (typeof logToolUsage === 'function') {
                logToolUsage('conjoint-basic-tutorial-completed', {
                    steps_completed: this.steps.length,
                    duration_seconds: Math.round((Date.now() - (this.tutorialStartTime || Date.now())) / 1000)
                }, 'Professor Mode tutorial completed for Basic Conjoint');
            }
        }

        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    // ════════════════════════════════════════════════════════════════════
    // RENDERING
    // ════════════════════════════════════════════════════════════════════

    updateView() {
        const step = this.steps[this.currentStep];
        const content = document.getElementById('tutorial-content');
        const isFirst = this.currentStep === 0;
        const isLast = this.currentStep === this.steps.length - 1;

        // Resolve quizzes ONCE and store
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        step.currentQuizzes = quizzes;

        // Build quiz HTML
        let quizHTML = '';
        if (quizzes.length > 0) {
            quizzes.forEach((q, qi) => {
                quizHTML += `
                    <div class="tutorial-quiz" id="quiz-${qi}">
                        <h4>Quick Check</h4>
                        <p><strong>${q.question}</strong></p>
                        ${q.options.map((opt, oi) => `
                            <label>
                                <input type="radio" name="quiz-${qi}" value="${oi}"
                                    onclick="ConjointBasicTutorial.checkQuiz(${qi}, ${oi})">
                                ${opt}
                            </label>
                        `).join('')}
                        <div id="quiz-feedback-${qi}" style="display:none;"></div>
                    </div>
                `;
            });
        }

        content.innerHTML = `
            <span class="tutorial-step-badge">${step.id === 'conclusion' ? 'Complete' : `Step ${this.currentStep + 1} of ${this.steps.length}`}</span>
            <h3>${step.title}</h3>
            ${step.content}
            ${quizHTML}
            <div style="display:flex; gap:0.75rem; margin-top:1.5rem; flex-direction:column;">
                ${!isLast ? `<button class="btn-primary full-width" onclick="ConjointBasicTutorial.nextStep()">Next &rarr;</button>` : ''}
                ${!isFirst ? `<button class="btn-secondary full-width" onclick="ConjointBasicTutorial.prevStep()">&larr; Previous</button>` : ''}
                <div style="text-align:center; color:#9ca3af; font-size:0.85rem; margin-top:0.5rem;">
                    Step ${this.currentStep + 1} of ${this.steps.length}
                </div>
            </div>
        `;

        // Highlight target
        this.clearHighlight();
        if (step.targetId) {
            const el = document.getElementById(step.targetId);
            if (el) {
                el.classList.add('tutorial-highlight');
                this.currentHighlight = el;
            }
        }

        // Run onEnter
        if (step.onEnter && typeof step.onEnter === 'function') {
            step.onEnter();
        }
    },

    checkQuiz(qIndex, selectedIndex) {
        const step = this.steps[this.currentStep];
        const quizzes = step.currentQuizzes || step.quizzes || [];
        const quiz = quizzes[qIndex];
        if (!quiz) return;

        const feedbackEl = document.getElementById(`quiz-feedback-${qIndex}`);
        if (!feedbackEl) return;

        const isCorrect = selectedIndex === quiz.answer;
        feedbackEl.style.display = 'block';
        feedbackEl.className = isCorrect ? 'quiz-feedback correct' : 'quiz-feedback incorrect';
        feedbackEl.innerHTML = isCorrect
            ? `<strong>Correct!</strong> ${quiz.feedback}`
            : `<strong>Not quite.</strong> Try again — re-read the explanation above for a hint.`;
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.updateView();
        }
    },

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateView();
        }
    },

    clearHighlight() {
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight = null;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof ConjointBasicTutorial !== 'undefined') {
        ConjointBasicTutorial.init();
    }
});
