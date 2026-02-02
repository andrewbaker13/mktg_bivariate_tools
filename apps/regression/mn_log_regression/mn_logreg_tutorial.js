// Multinomial Logistic Regression Tutorial - Professor Mode Implementation

const MNLogRegTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to Multinomial Logistic Regression",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you how to model <strong>categorical outcomes with 3+ categories</strong> using multinomial logistic regression.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>Understanding multinomial logistic models</li>
                    <li>The role of reference categories</li>
                    <li>Interpreting log-odds coefficients</li>
                    <li>Converting to odds ratios and probabilities</li>
                    <li>Reading predicted probability plots</li>
                    <li>Comparing model fit across categories</li>
                </ol>
                
                <p><strong>When to use this model:</strong></p>
                <ul>
                    <li>Customer segment membership (budget / mid-tier / premium)</li>
                    <li>Purchase channel (online / store / mobile app)</li>
                    <li>Subscription tier (free / basic / pro / enterprise)</li>
                </ul>
            `,
            quizzes: [
                {
                    question: "When is multinomial logistic regression preferred over binary logistic regression?",
                    options: [
                        "When the outcome is continuous",
                        "When the outcome has more than 2 categories without natural ordering",
                        "When you have many predictors"
                    ],
                    answer: 1,
                    feedback: "Correct! Multinomial logistic handles nominal outcomes with 3+ categories. Binary logistic is for 2-category outcomes, and ordinal logistic is for ordered categories."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding the Model",
            targetId: 'tut-overview-section',
            content: `
                <p>Multinomial logistic regression uses the <strong>softmax function</strong> to estimate probabilities for each outcome category.</p>
                
                <p><strong>The model:</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.9em;">
                    P(Y = k | X) = exp(Xβₖ) / Σ exp(Xβⱼ)
                </p>
                
                <p><strong>Key concepts:</strong></p>
                <ul>
                    <li><strong>Reference category:</strong> One category is the baseline (β = 0). All other coefficients are relative to it.</li>
                    <li><strong>Log-odds (logits):</strong> ln[P(k)/P(ref)] — the log of the odds of category k vs. reference.</li>
                    <li><strong>Odds ratio:</strong> exp(β) — how much the odds of k vs. reference change per unit increase in X.</li>
                </ul>
                
                <p><strong>Choosing a reference:</strong> Pick a meaningful baseline—often the most common category, a "default" choice, or a control condition.</p>
                
                <p class="task">👉 <strong>Task:</strong> Read the MODEL OVERVIEW section. Note how probabilities sum to 1 across all categories.</p>
            `,
            quizzes: [
                {
                    question: "Why does the reference category have no coefficients in the output?",
                    options: [
                        "Its coefficients are too small to display",
                        "It serves as the baseline (β = 0), and all other coefficients are comparisons to it",
                        "It was automatically removed due to multicollinearity"
                    ],
                    answer: 1,
                    feedback: "Correct! Setting β = 0 for the reference establishes the baseline. A coefficient for another category tells you the log-odds of that category vs. the reference."
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
                <p>Now let's load a dataset with a multi-category outcome.</p>
                
                <p><strong>Data requirements:</strong></p>
                <ul>
                    <li>One <strong>categorical outcome</strong> with 3+ levels (e.g., segment_type)</li>
                    <li>One or more <strong>predictors</strong> — continuous or categorical</li>
                    <li>Raw case-level data with headers</li>
                </ul>
                
                <p><strong>Options:</strong></p>
                <ul>
                    <li><strong>Upload CSV:</strong> Your own customer/campaign data</li>
                    <li><strong>Scenarios:</strong> Pre-built marketing examples</li>
                    <li><strong>Template:</strong> A starter file with example structure</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Upload your own CSV or load a scenario. After loading, you'll select the outcome and reference category.</p>
            `,
            quizzes: [
                {
                    question: "For a 'subscription tier' outcome with levels Free/Basic/Pro/Enterprise, how many equations are estimated?",
                    options: [
                        "1 equation (like binary logistic)",
                        "3 equations (one for each non-reference category)",
                        "4 equations (one for each category)"
                    ],
                    answer: 1,
                    feedback: "Correct! With k categories, the model estimates k-1 equations. Each equation compares one category to the reference. The reference category's probability is determined by 1 minus the sum of the others."
                }
            ],
            check: () => {
                const outcomeSelect = document.getElementById('outcome-select');
                return outcomeSelect && outcomeSelect.options.length > 1;
            },
            onEnter: () => {
                const section = document.getElementById('tut-inputs-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'select-reference',
            title: "🏷️ Step 3: Choose Reference Category",
            targetId: 'tut-inputs-section',
            content: `
                <p>Selecting the right reference category is crucial for interpretable results.</p>
                
                <p><strong>Common reference choices:</strong></p>
                <ul>
                    <li><strong>Most frequent:</strong> The "typical" category—coefficients show what makes other outcomes more/less likely than typical.</li>
                    <li><strong>Control/baseline:</strong> A natural default (e.g., "Free tier" for subscriptions)—coefficients show what drives upgrades.</li>
                    <li><strong>Conceptually important:</strong> A category you want to compare everything against.</li>
                </ul>
                
                <p><strong>Important:</strong> Reference choice changes coefficient signs/magnitudes but NOT predicted probabilities or model fit. It's about interpretation, not accuracy.</p>
                
                <p class="task">👉 <strong>Task:</strong> Select your outcome variable, then choose a meaningful reference category. The model runs automatically after selections.</p>
            `,
            quizzes: [
                {
                    question: "If 'Online' is the reference for purchase channel, a positive coefficient for 'Store' means:",
                    options: [
                        "Store purchases are more likely overall",
                        "Higher values of the predictor increase the odds of Store vs. Online",
                        "Store and Online have equal probabilities"
                    ],
                    answer: 1,
                    feedback: "Correct! The coefficient compares Store to Online (the reference). Positive β means higher X values shift the odds toward Store relative to Online."
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
                <p>Multinomial logistic uses different fit metrics than linear regression.</p>
                
                <p><strong>Key fit metrics:</strong></p>
                <ul>
                    <li><strong>McFadden's R²:</strong> Pseudo-R² based on log-likelihood. Values 0.2–0.4 are considered good.</li>
                    <li><strong>Log-Likelihood:</strong> Higher (less negative) = better fit.</li>
                    <li><strong>AIC / BIC:</strong> Lower = better. Useful for comparing models with different predictors.</li>
                </ul>
                
                <p><strong>Classification accuracy:</strong></p>
                <ul>
                    <li><strong>Overall accuracy:</strong> Percent correctly classified</li>
                    <li><strong>Per-category:</strong> Check if some categories are harder to predict</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Check the metrics panel. What's the McFadden's R²? Is the overall accuracy acceptable for your application?</p>
            `,
            getDynamicQuizzes: () => {
                const r2El = document.getElementById('metric-r2');
                
                if (!r2El) return null;
                
                const r2Value = parseFloat(r2El.textContent);
                
                if (isNaN(r2Value)) return null;
                
                let interpretation = "poor";
                if (r2Value >= 0.4) interpretation = "excellent";
                else if (r2Value >= 0.2) interpretation = "good";
                else if (r2Value >= 0.1) interpretation = "modest";
                
                return [
                    {
                        question: `With McFadden's R² = ${r2Value.toFixed(3)}, how would you assess model fit?`,
                        options: [
                            `This is ${interpretation} fit for a multinomial model`,
                            `This indicates perfect prediction`,
                            `The model should be rejected`
                        ],
                        answer: 0,
                        feedback: `Correct! McFadden's R² = ${r2Value.toFixed(3)} indicates ${interpretation} fit. Unlike linear regression R², McFadden's R² rarely exceeds 0.4 even for good models. Values of 0.2-0.4 are typically considered satisfactory.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why can't we use regular R² for multinomial logistic regression?",
                    options: [
                        "The software doesn't support it",
                        "Logistic models maximize likelihood, not variance explained, so pseudo-R² measures are needed",
                        "R² only works with 2 categories"
                    ],
                    answer: 1,
                    feedback: "Correct! Linear regression minimizes squared errors (SSE). Logistic regression maximizes log-likelihood. Pseudo-R² measures like McFadden's compare the fitted model's likelihood to a null model."
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
                <p>Multinomial coefficients are <strong>log-odds</strong> comparing each category to the reference.</p>
                
                <p><strong>Reading the coefficient table:</strong></p>
                <ul>
                    <li>Each row shows a predictor's effect on one outcome category (vs. reference)</li>
                    <li><strong>Coefficient (β):</strong> Change in log-odds per unit increase in X</li>
                    <li><strong>Odds Ratio exp(β):</strong> Multiplicative change in odds per unit increase in X</li>
                </ul>
                
                <p><strong>Example interpretation:</strong></p>
                <p style="background: #f8f9fa; padding: 10px; border-radius: 6px; font-size: 0.9em;">
                    "For each $1 increase in price, the odds of choosing 'Premium' vs. 'Budget' (reference) are multiplied by 1.15 (15% increase), holding other predictors constant."
                </p>
                
                <p><strong>Statistical significance:</strong> p &lt; α means the predictor reliably affects the odds of that category vs. reference.</p>
                
                <p class="task">👉 <strong>Task:</strong> Find the coefficient table. Identify which predictors significantly affect which outcome categories.</p>
            `,
            quizzes: [
                {
                    question: "An odds ratio of 0.5 for 'email_frequency' on 'Churned' vs. 'Retained' means:",
                    options: [
                        "Each additional email doubles churn odds",
                        "Each additional email cuts churn odds in half (vs. retained)",
                        "Email frequency has no effect on churn"
                    ],
                    answer: 1,
                    feedback: "Correct! OR < 1 means the predictor decreases the odds of that category vs. reference. OR = 0.5 means a 50% reduction in odds per unit increase in X."
                }
            ],
            check: () => true,
            onEnter: () => {
                const table = document.getElementById('mnlog-coefficient-table-body');
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'probability-plots',
            title: "📈 Step 6: Predicted Probability Plots",
            targetId: 'tut-visual-section',
            content: `
                <p>Probability plots show how category membership changes across predictor values.</p>
                
                <p><strong>Reading the probability plot:</strong></p>
                <ul>
                    <li>X-axis: Range of the focal predictor</li>
                    <li>Y-axis: Predicted probability (0 to 1)</li>
                    <li>Lines: One curve per outcome category</li>
                    <li>All curves sum to 1 at every X value</li>
                </ul>
                
                <p><strong>What to look for:</strong></p>
                <ul>
                    <li><strong>Crossing lines:</strong> At some X values, category dominance switches</li>
                    <li><strong>Steep curves:</strong> Strong predictor effect in that region</li>
                    <li><strong>Flat curves:</strong> Predictor has little effect on that category</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Select different focal predictors and observe the probability curves. Which predictor best separates the categories?</p>
            `,
            quizzes: [
                {
                    question: "If the 'Premium' curve crosses above 'Budget' and 'Mid-Tier' at high income levels, what does this suggest?",
                    options: [
                        "Income doesn't affect segment membership",
                        "High-income customers are most likely to be in the Premium segment",
                        "Premium is the reference category"
                    ],
                    answer: 1,
                    feedback: "Correct! When a category's probability curve is highest at certain X values, those observations are most likely to fall in that category. Crossing points indicate where the most likely category changes."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'observed-predicted',
            title: "🎯 Step 7: Check Classification Accuracy",
            targetId: 'tut-visual-section',
            content: `
                <p>The observed vs. predicted comparison shows how well the model classifies cases.</p>
                
                <p><strong>What to examine:</strong></p>
                <ul>
                    <li><strong>Confusion matrix:</strong> Rows = actual category, columns = predicted category</li>
                    <li><strong>Diagonal cells:</strong> Correct classifications</li>
                    <li><strong>Off-diagonal cells:</strong> Misclassifications</li>
                </ul>
                
                <p><strong>Common patterns:</strong></p>
                <ul>
                    <li><strong>One category dominates predictions:</strong> Model may be defaulting to the most common category</li>
                    <li><strong>Two categories often confused:</strong> They may be similar on the predictors—consider combining or adding features</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Review the classification results. Which categories are easiest/hardest to predict correctly?</p>
            `,
            quizzes: [
                {
                    question: "If 'Budget' is correctly classified 85% of the time but 'Mid-Tier' only 40%, what might you do?",
                    options: [
                        "Remove Mid-Tier from the analysis",
                        "Add predictors that better distinguish Mid-Tier from other categories",
                        "Change the reference category to Mid-Tier"
                    ],
                    answer: 1,
                    feedback: "Correct! Low accuracy for specific categories suggests predictors don't capture what distinguishes them. Consider adding features, transformations, or interactions that separate the hard-to-predict groups."
                }
            ],
            check: () => true,
            onEnter: () => {
                const observed = document.getElementById('observed-vs-predicted');
                if (observed) observed.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business-insights',
            title: "💼 Step 8: Draw Marketing Insights",
            targetId: 'tut-results-section',
            content: `
                <p>Translate your multinomial results into actionable marketing insights.</p>
                
                <p><strong>From coefficients to strategy:</strong></p>
                <ul>
                    <li><strong>Significant positive effect on Premium:</strong> This factor drives customers toward higher tiers—leverage it in upselling.</li>
                    <li><strong>Significant negative effect on Churned:</strong> This factor protects against churn—prioritize it in retention.</li>
                    <li><strong>Different effects across categories:</strong> Segment-specific strategies may be needed.</li>
                </ul>
                
                <p><strong>Questions to answer:</strong></p>
                <ul>
                    <li>Which predictors most strongly affect category membership?</li>
                    <li>At what predictor values do customers shift between categories?</li>
                    <li>Can we score new customers into likely segments?</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the Managerial Interpretation panel. What are the 2-3 most actionable findings?</p>
            `,
            quizzes: [
                {
                    question: "If 'loyalty_points' has strong positive effects on both 'Gold' and 'Platinum' vs. 'Standard', the recommendation is:",
                    options: [
                        "Eliminate the loyalty program",
                        "Invest in loyalty programs to encourage tier upgrades",
                        "Focus marketing only on Standard tier customers"
                    ],
                    answer: 1,
                    feedback: "Correct! When loyalty points increase odds of higher tiers, the loyalty program is working. Consider expanding it or making higher tiers more attractive to maximize upgrades."
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
                <p>Excellent work! You've mastered multinomial logistic regression for multi-category outcomes.</p>
                
                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>Softmax model:</strong> Predict probabilities across 3+ categories</li>
                    <li><strong>Reference categories:</strong> All comparisons are relative to one baseline</li>
                    <li><strong>Log-odds & odds ratios:</strong> Interpret direction and magnitude of effects</li>
                    <li><strong>Pseudo-R² (McFadden's):</strong> Different scale than linear R²</li>
                    <li><strong>Probability plots:</strong> Visualize category membership shifts</li>
                    <li><strong>Classification accuracy:</strong> Assess prediction quality per category</li>
                </ul>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    Multinomial logistic assumes independence of irrelevant alternatives (IIA)—adding/removing a category shouldn't change the odds ratios between other categories. This can be violated in choice modeling (e.g., red bus vs. blue bus problem). Consider mixed logit or nested logit for such cases. Also watch for class imbalance—if one category is rare, the model may struggle to predict it. Techniques like oversampling, weighted estimation, or focusing on precision/recall metrics can help. For ordered outcomes (e.g., satisfaction ratings 1-5), ordinal logistic regression may be more appropriate as it respects the ordering. Finally, for very large number of categories or when categories have hierarchical structure, consider hierarchical models or dimension reduction.
                </p>
                
                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Download predicted probabilities for scoring new cases</li>
                    <li>Try ordinal logistic if your outcome has a natural order</li>
                    <li>Explore interactions—do predictor effects differ across subgroups?</li>
                    <li>Compare AIC/BIC across different predictor combinations</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    For binary outcomes, use Logistic Regression. For continuous outcomes with multiple predictors, use Multiple Linear Regression!
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
                    tool_slug: 'mn-log-regression',
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
                <button class="btn-secondary" onclick="MNLogRegTutorial.prevStep()" 
                    ${this.currentStep === 0 ? 'disabled' : ''}>← Back</button>
                <button class="btn-primary" onclick="MNLogRegTutorial.nextStep()" 
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
    MNLogRegTutorial.init();
});
