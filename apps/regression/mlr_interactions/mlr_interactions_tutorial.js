// MLR Interactions Tutorial - Professor Mode Implementation

const MLRInteractionsTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to MLR with Interactions",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you how to analyze <strong>moderation effects</strong> (interactions) and <strong>non-linear relationships</strong> (quadratic terms) in marketing data.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>Understanding interaction (moderation) effects</li>
                    <li>Understanding quadratic (curvilinear) effects</li>
                    <li>Why centering matters for interactions</li>
                    <li>Interpreting simple slopes and turning points</li>
                    <li>Visualizing conditional effects</li>
                    <li>Drawing business insights from moderated relationships</li>
                </ol>
                
                <p><strong>Why this matters:</strong> Real marketing effects rarely operate in isolation. Ad spend might work differently during holidays vs. off-season. Price increases might hurt some segments but help others. This tool helps you uncover those conditional relationships.</p>
            `,
            quizzes: [
                {
                    question: "What does an 'interaction effect' (moderation) mean in regression?",
                    options: [
                        "Two predictors are correlated with each other",
                        "The effect of one predictor on the outcome depends on the level of another predictor",
                        "Adding more predictors always improves model fit"
                    ],
                    answer: 1,
                    feedback: "Correct! An interaction means the relationship between X₁ and Y changes depending on the value of X₂. This is also called moderation—X₂ moderates the effect of X₁."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts-interaction',
            title: "📚 Step 1: Understanding Interactions",
            targetId: 'tut-overview-section',
            content: `
                <p>An interaction term captures how the effect of one variable <em>depends on</em> another.</p>
                
                <p><strong>The model with an interaction:</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.9em;">
                    Y = β₀ + β₁X₁ + β₂X₂ + <strong>β₃(X₁ × X₂)</strong> + ε
                </p>
                
                <p><strong>Key interpretation:</strong></p>
                <ul>
                    <li><strong>β₁:</strong> Effect of X₁ when X₂ = 0 (or at mean, if centered)</li>
                    <li><strong>β₂:</strong> Effect of X₂ when X₁ = 0 (or at mean, if centered)</li>
                    <li><strong>β₃:</strong> How much the effect of X₁ changes for each unit increase in X₂</li>
                </ul>
                
                <p><strong>Business example:</strong> If ad_spend × holiday_season has β₃ = 500, then each additional dollar of ad spend generates $500 more revenue during holidays compared to non-holidays.</p>
                
                <p class="task">👉 <strong>Task:</strong> Read the "Interaction Effects" section in the Overview. Note how the interaction coefficient captures the conditional relationship.</p>
            `,
            quizzes: [
                {
                    question: "If an interaction term (X₁ × X₂) has a positive coefficient, what does this mean?",
                    options: [
                        "X₁ and X₂ are positively correlated",
                        "The effect of X₁ on Y becomes stronger as X₂ increases",
                        "X₁ and X₂ both have positive main effects"
                    ],
                    answer: 1,
                    feedback: "Correct! A positive interaction coefficient means the slope of X₁ increases as X₂ increases—the relationship strengthens. A negative coefficient means it weakens."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'concepts-quadratic',
            title: "📐 Step 2: Understanding Quadratic Effects",
            targetId: 'tut-overview-section',
            content: `
                <p>A quadratic term captures <strong>non-linear (curved) relationships</strong>.</p>
                
                <p><strong>The model with a quadratic term:</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.9em;">
                    Y = β₀ + β₁X + <strong>β₂X²</strong> + ε
                </p>
                
                <p><strong>Interpreting the quadratic coefficient:</strong></p>
                <ul>
                    <li><strong>β₂ < 0:</strong> Inverted U-shape (increases then decreases)</li>
                    <li><strong>β₂ > 0:</strong> U-shape (decreases then increases)</li>
                </ul>
                
                <p><strong>Finding the optimal point:</strong></p>
                <p style="background: #e8f5e9; padding: 10px; border-radius: 6px;">
                    X* = -β₁ / (2β₂)
                </p>
                
                <p><strong>Business examples:</strong></p>
                <ul>
                    <li><strong>Ad frequency:</strong> Too few impressions = low awareness; too many = ad fatigue</li>
                    <li><strong>Pricing:</strong> Too low = leaving money on table; too high = lost customers</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the "Quadratic Effects & Finding Optimal Points" section. Understand when non-linear effects make business sense.</p>
            `,
            quizzes: [
                {
                    question: "An inverted U-shaped relationship (negative β₂) suggests:",
                    options: [
                        "More is always better—keep increasing X",
                        "There's an optimal point where the outcome is maximized",
                        "X has no effect on Y"
                    ],
                    answer: 1,
                    feedback: "Correct! An inverted U means the outcome increases up to an optimal point, then decreases. This is common for things like ad frequency, pricing, and effort levels."
                }
            ],
            check: () => true,
            onEnter: () => {
                const details = document.querySelector('details summary:contains("Quadratic Terms")');
                if (details) details.parentElement.open = true;
            }
        },
        {
            id: 'load-data',
            title: "📥 Step 3: Load Your Data",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's load data to explore interactions or quadratic effects.</p>
                
                <p><strong>Data requirements:</strong></p>
                <ul>
                    <li>One numeric <strong>outcome variable</strong> (Y)</li>
                    <li>Two or more <strong>predictors</strong> (numeric or categorical)</li>
                    <li>Header row with column names</li>
                </ul>
                
                <p><strong>The tool offers:</strong></p>
                <ul>
                    <li><strong>Upload CSV:</strong> Your own marketing data</li>
                    <li><strong>Scenarios:</strong> Pre-built examples demonstrating interactions and quadratics</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Load a <strong>scenario</strong> from the dropdown or <strong>upload your own CSV</strong>. After loading, you'll assign variables and choose your interaction/quadratic effect.</p>
            `,
            quizzes: [
                {
                    question: "To test an interaction effect, you need at minimum:",
                    options: [
                        "One predictor and one outcome",
                        "Two predictors and one outcome",
                        "Three predictors and two outcomes"
                    ],
                    answer: 1,
                    feedback: "Correct! An interaction requires at least two predictors (to multiply together) plus an outcome. The interaction term X₁×X₂ tests whether X₁'s effect depends on X₂."
                }
            ],
            check: () => {
                const varPanel = document.getElementById('variable-selection-panel');
                return varPanel && !varPanel.classList.contains('hidden');
            },
            onEnter: () => {
                const section = document.getElementById('tut-inputs-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'select-interaction',
            title: "⚙️ Step 4: Choose Interaction Type",
            targetId: 'tut-interaction-section',
            content: `
                <p>After assigning your outcome and predictors, choose an interaction or quadratic effect.</p>
                
                <p><strong>Interaction types available:</strong></p>
                <ul>
                    <li><strong>Continuous × Continuous:</strong> Does ad spend's effect depend on price level?</li>
                    <li><strong>Continuous × Categorical:</strong> Does ad spend's effect differ by region?</li>
                    <li><strong>Categorical × Categorical:</strong> Does the region effect differ by customer tier?</li>
                    <li><strong>Quadratic:</strong> Does ad spend have an optimal point?</li>
                </ul>
                
                <p><strong>Focal vs. Moderator:</strong></p>
                <ul>
                    <li><strong>Focal predictor:</strong> The variable whose effect you're studying</li>
                    <li><strong>Moderator:</strong> The variable that changes that effect</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Select an interaction type and assign focal/moderator variables. Then click <strong>"Run analysis"</strong>.</p>
            `,
            quizzes: [
                {
                    question: "In a 'continuous × categorical' interaction testing whether ad_spend's effect differs by region, which is the focal predictor?",
                    options: [
                        "Region (categorical)",
                        "Ad spend (continuous)",
                        "Either could be focal"
                    ],
                    answer: 2,
                    feedback: "Either could be focal! If you're asking 'how does ad spend work differently across regions,' ad_spend is focal. If you're asking 'how do regional differences vary with ad spend,' region is focal. The choice affects interpretation."
                }
            ],
            check: () => {
                const r2El = document.getElementById('metric-r2');
                return r2El && r2El.textContent !== '–';
            },
            onEnter: () => {
                const panel = document.getElementById('interaction-selection-panel');
                if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-metrics',
            title: "📊 Step 5: Assess Model Fit",
            targetId: 'tut-results-section',
            content: `
                <p>Before interpreting interactions, check that your model fits the data adequately.</p>
                
                <p><strong>Key metrics to review:</strong></p>
                <ul>
                    <li><strong>R² / Adjusted R²:</strong> Proportion of variance explained. Higher = better fit.</li>
                    <li><strong>Model F & p-value:</strong> Overall test that predictors matter. p < α = significant model.</li>
                    <li><strong>RMSE / MAE:</strong> Typical prediction error. Smaller = more accurate.</li>
                </ul>
                
                <p><strong>Important:</strong> A significant interaction doesn't guarantee good overall fit. Check R² first, then examine the interaction coefficient.</p>
                
                <p class="task">👉 <strong>Task:</strong> Review the metrics panel. Is the model F-test significant? What's the R²?</p>
            `,
            getDynamicQuizzes: () => {
                const r2El = document.getElementById('metric-r2');
                if (!r2El) return null;
                
                const r2Text = r2El.textContent.trim();
                const r2Value = parseFloat(r2Text);
                
                if (isNaN(r2Value)) return null;
                
                let interpretation;
                if (r2Value >= 0.7) interpretation = "strong";
                else if (r2Value >= 0.4) interpretation = "moderate";
                else if (r2Value >= 0.2) interpretation = "weak-to-moderate";
                else interpretation = "weak";
                
                return [
                    {
                        question: `An R² of ${r2Value.toFixed(3)} indicates what level of variance explained?`,
                        options: [
                            "Strong explanatory power (70%+)",
                            "Moderate explanatory power (40-70%)",
                            "Weak-to-moderate explanatory power (20-40%)",
                            "Weak explanatory power (<20%)"
                        ],
                        answer: interpretation === "strong" ? 0 : interpretation === "moderate" ? 1 : interpretation === "weak-to-moderate" ? 2 : 3,
                        feedback: `Correct! R² = ${r2Value.toFixed(3)} means the model explains about ${(r2Value * 100).toFixed(1)}% of variance in the outcome.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why check model fit before interpreting interaction coefficients?",
                    options: [
                        "Interactions are only valid if R² > 0.90",
                        "A significant interaction in a poorly-fitting model may not be practically meaningful",
                        "Model fit determines whether to use interactions vs. quadratics"
                    ],
                    answer: 1,
                    feedback: "Correct! You can have a statistically significant interaction in a model that barely predicts the outcome. Always contextualize coefficient interpretations within overall model quality."
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
            title: "📋 Step 6: Interpret the Interaction Coefficient",
            targetId: 'tut-results-section',
            content: `
                <p>The coefficient table shows all effects including the interaction term.</p>
                
                <p><strong>Reading interaction coefficients:</strong></p>
                <ul>
                    <li><strong>Continuous × Continuous:</strong> Each unit increase in the moderator changes the focal slope by this amount</li>
                    <li><strong>Continuous × Categorical:</strong> The focal slope in each category differs from the reference category by this amount</li>
                    <li><strong>Quadratic (X²):</strong> Negative = inverted U; positive = U-shape</li>
                </ul>
                
                <p><strong>Statistical significance:</strong> Look at the p-value for the interaction term. If p < α, the moderation effect is statistically reliable.</p>
                
                <p><strong>Centered interpretation:</strong> Because this tool centers variables, main effects represent "effects at the mean of the other variable" rather than "effects when the other equals zero."</p>
                
                <p class="task">👉 <strong>Task:</strong> Find the interaction term in the coefficient table. Is it significant? What does the coefficient mean in practical terms?</p>
            `,
            quizzes: [
                {
                    question: "Why does the tool center predictors before creating interaction terms?",
                    options: [
                        "To make the algorithm run faster",
                        "To make main effects interpretable at meaningful values (means) and reduce multicollinearity",
                        "Centering is required by the regression formula"
                    ],
                    answer: 1,
                    feedback: "Correct! Without centering, 'main effects' represent effects when other variables equal zero—which is often meaningless (e.g., zero ad spend never happens). Centering also reduces correlation between the interaction term and its components."
                }
            ],
            check: () => true,
            onEnter: () => {
                const table = document.getElementById('coef-table-body');
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'visualize-interaction',
            title: "📈 Step 7: Visualize the Interaction",
            targetId: 'tut-visual-section',
            content: `
                <p>The interaction plot shows how the focal predictor's effect varies across moderator levels.</p>
                
                <p><strong>Reading the plot:</strong></p>
                <ul>
                    <li><strong>Multiple lines/slopes:</strong> Each line represents a different moderator level</li>
                    <li><strong>Parallel lines:</strong> No interaction—effect is the same everywhere</li>
                    <li><strong>Non-parallel lines:</strong> Interaction present—effect depends on moderator</li>
                    <li><strong>Crossing lines:</strong> Strong interaction—effect reverses at some point</li>
                </ul>
                
                <p><strong>Simple slopes:</strong> For continuous moderators, lines are typically shown at:</p>
                <ul>
                    <li>-1 SD below mean (low moderator)</li>
                    <li>Mean (average moderator)</li>
                    <li>+1 SD above mean (high moderator)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Examine the interaction plot. Are the lines parallel or do they diverge? What business story does this tell?</p>
            `,
            quizzes: [
                {
                    question: "If interaction plot lines are parallel (same slope), this suggests:",
                    options: [
                        "A strong interaction effect",
                        "No interaction—the focal predictor's effect doesn't depend on the moderator",
                        "The model has poor fit"
                    ],
                    answer: 1,
                    feedback: "Correct! Parallel lines mean the relationship between X₁ and Y is the same regardless of X₂'s level. Non-parallel (converging or diverging) lines indicate an interaction."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business-implications',
            title: "💼 Step 8: Draw Business Implications",
            targetId: 'tut-results-section',
            content: `
                <p>Now connect your statistical findings to marketing action.</p>
                
                <p><strong>For significant interactions:</strong></p>
                <ul>
                    <li>Identify <em>where</em> the effect is strongest (which moderator levels)</li>
                    <li>Target resources where they have the most impact</li>
                    <li>Develop segment-specific strategies</li>
                </ul>
                
                <p><strong>For quadratic effects:</strong></p>
                <ul>
                    <li>Calculate the optimal point using X* = -β₁/(2β₂)</li>
                    <li>Check if optimal point falls within your observed data range</li>
                    <li>Consider budget/resource constraints around the optimum</li>
                </ul>
                
                <p><strong>Questions to answer:</strong></p>
                <ul>
                    <li>Should we differentiate strategy by moderator levels?</li>
                    <li>What's the "sweet spot" for our spending/pricing/frequency?</li>
                    <li>Are there segments where our tactics don't work?</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the Managerial Interpretation panel. Does it suggest actionable next steps?</p>
            `,
            quizzes: [
                {
                    question: "A significant ad_spend × customer_segment interaction suggests you should:",
                    options: [
                        "Spend the same amount on all segments for fairness",
                        "Allocate more ad budget to segments where ad spend is most effective",
                        "Remove ad spending entirely from the marketing mix"
                    ],
                    answer: 1,
                    feedback: "Correct! If ad spend ROI varies by segment, you should invest more where returns are highest. This is the core insight from moderation analysis—one-size-fits-all strategies leave value on the table."
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
                <p>Excellent work! You've learned to analyze interactions and non-linear effects.</p>
                
                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>Interaction effects:</strong> When X₁'s effect on Y depends on X₂</li>
                    <li><strong>Quadratic effects:</strong> Non-linear relationships with optimal points</li>
                    <li><strong>Centering:</strong> Makes main effects interpretable at means</li>
                    <li><strong>Simple slopes:</strong> Test focal effects at different moderator levels</li>
                    <li><strong>Visualization:</strong> Non-parallel lines indicate interactions</li>
                    <li><strong>Business application:</strong> Segment-specific strategies and optimization</li>
                </ul>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    This tool intentionally limits you to one interaction or quadratic per model—excellent for learning, but real-world models often include multiple moderations, three-way interactions, or both interactions and quadratics simultaneously. Professional analysts also consider that statistically significant interactions may be practically small, and that exploring many possible interactions inflates false-positive risk. When moving beyond this tool, use theory-driven hypotheses about which interactions to test, pre-register your analysis plan when possible, and always visualize interactions—a significant p-value means little if the slope difference is trivial in business terms. Finally, remember that interactions are scale-dependent: transforming variables (log, square root) can make interactions appear or disappear.
                </p>
                
                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Try different interaction types to see which provides the best fit</li>
                    <li>Test quadratic effects for variables where "optimal points" make sense</li>
                    <li>Download results and examine residuals for additional patterns</li>
                    <li>Explore the basic Multiple Linear Regression tool for simpler models</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    For models without interactions, use the standard MLR tool. For categorical outcomes, explore logistic or multinomial logistic regression!
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
                    tool_slug: 'mlr-interactions',
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
                <button class="btn-secondary" onclick="MLRInteractionsTutorial.prevStep()" 
                    ${this.currentStep === 0 ? 'disabled' : ''}>← Back</button>
                <button class="btn-primary" onclick="MLRInteractionsTutorial.nextStep()" 
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
    MLRInteractionsTutorial.init();
});
