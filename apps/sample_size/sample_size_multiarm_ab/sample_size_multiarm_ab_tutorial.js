// Sample Size Multi-Arm AB Tutorial - Professor Mode Implementation

const SampleSizeMultiarmABTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to Multi-Arm A/B Planning",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you how to <strong>plan sample sizes</strong> for experiments with multiple variants (A/B/C/D tests).</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>Why multi-arm tests need special consideration</li>
                    <li>The multiple comparison problem</li>
                    <li>Lift vs. control vs. omnibus goals</li>
                    <li>How more arms affect sample size</li>
                    <li>Practical planning for multi-variant experiments</li>
                </ol>
                
                <p><strong>Why this matters:</strong> Testing multiple variants at once is efficient, but it brings statistical complexities. More comparisons mean more chances for false positives—unless you plan carefully.</p>
            `,
            quizzes: [
                {
                    question: "Why do multi-arm tests need special sample size planning?",
                    options: [
                        "Because they always take longer to run",
                        "Because multiple comparisons increase the risk of false positives",
                        "Because they use different statistical formulas"
                    ],
                    answer: 1,
                    feedback: "Correct! With multiple variants, you make multiple comparisons (B vs A, C vs A, D vs A...). Each comparison has a chance of a false positive, so the overall risk accumulates unless you adjust for it."
                }
            ],
            check: () => true
        },
        {
            id: 'multiple-comparisons',
            title: "📚 Step 1: The Multiple Comparison Problem",
            targetId: 'tut-overview-section',
            content: `
                <p>When you test multiple variants, the chance of at least one false positive increases.</p>
                
                <p><strong>The math:</strong></p>
                <ul>
                    <li>With α = 0.05 and 1 comparison: 5% false positive risk</li>
                    <li>With α = 0.05 and 3 comparisons: ~14% risk of at least one false positive</li>
                    <li>With α = 0.05 and 10 comparisons: ~40% risk!</li>
                </ul>
                
                <p><strong>Solutions:</strong></p>
                <ul>
                    <li><strong>Bonferroni correction:</strong> Use α/k for each comparison</li>
                    <li><strong>More conservative thresholds:</strong> Require stronger evidence per variant</li>
                    <li><strong>Plan for it:</strong> This tool builds in the correction</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the TEST OVERVIEW section to see how the tool handles multiple arms.</p>
            `,
            quizzes: [
                {
                    question: "What is the Bonferroni correction?",
                    options: [
                        "Testing each variant multiple times for accuracy",
                        "Dividing α by the number of comparisons to control family-wise error",
                        "Removing outliers from each arm"
                    ],
                    answer: 1,
                    feedback: "Correct! Bonferroni correction divides your significance level by the number of comparisons. With 3 variants vs control at α = 0.05, you'd use α = 0.05/3 ≈ 0.017 per comparison to keep overall false positive risk at ~5%."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'test-goals',
            title: "🎯 Step 2: Lift vs. Control vs. Omnibus",
            targetId: 'tut-inputs-section',
            content: `
                <p>This tool offers two testing goals with different implications.</p>
                
                <p><strong>Minimum lift vs. control:</strong></p>
                <ul>
                    <li>Goal: Detect if EACH variant beats control by at least X%</li>
                    <li>Makes individual variant-vs-control comparisons</li>
                    <li>Uses Bonferroni adjustment to control false positives</li>
                    <li>Best when: You want to pick the best-performing variant(s)</li>
                </ul>
                
                <p><strong>Omnibus (any difference):</strong></p>
                <ul>
                    <li>Goal: Detect if ANY arm differs from control</li>
                    <li>Single overall test (like ANOVA)</li>
                    <li>No multiple comparison penalty</li>
                    <li>Best when: You just want to know if testing was worthwhile</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Note the current goal setting. Try switching between "Minimum lift vs. control" and "Any difference" to see how it affects reasoning.</p>
            `,
            quizzes: [
                {
                    question: "When should you choose 'Minimum lift vs. control' over 'Omnibus'?",
                    options: [
                        "When you want to minimize sample size",
                        "When you need to identify which specific variants beat control",
                        "When you have only one variant"
                    ],
                    answer: 1,
                    feedback: "Correct! 'Lift vs. control' is for identifying specific winners. If you just need to know whether any variant differed (before doing follow-up tests), omnibus works. But for actionable decisions about individual variants, use lift vs. control."
                }
            ],
            check: () => true,
            onEnter: () => {
                const goalButtons = document.querySelector('.goal-buttons');
                if (goalButtons) goalButtons.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'setup-arms',
            title: "⚙️ Step 3: Configure Arms & Rates",
            targetId: 'tut-inputs-section',
            content: `
                <p>Set up your control and variant expectations.</p>
                
                <p><strong>Control (A):</strong></p>
                <ul>
                    <li>Your baseline—current experience or proven performer</li>
                    <li>Set the expected conversion rate (e.g., 20%)</li>
                </ul>
                
                <p><strong>Variants (B, C, D):</strong></p>
                <ul>
                    <li>The alternatives you're testing</li>
                    <li>Set the MINIMUM lift you'd need to justify switching</li>
                    <li>Different variants can have different expected rates</li>
                </ul>
                
                <p><strong>Planning insight:</strong> The smallest lift among your variants determines your sample size—you need enough data to detect the most subtle difference you care about.</p>
                
                <p class="task">👉 <strong>Task:</strong> Look at the current arm rates. Note which variant has the smallest lift vs. control.</p>
            `,
            getDynamicQuizzes: () => {
                const controlEl = document.getElementById('arm-rate-0');
                const var1El = document.getElementById('arm-rate-1');
                const var2El = document.getElementById('arm-rate-2');
                const var3El = document.getElementById('arm-rate-3');
                
                const control = controlEl ? parseFloat(controlEl.value) : null;
                const variants = [
                    var1El ? parseFloat(var1El.value) : null,
                    var2El ? parseFloat(var2El.value) : null,
                    var3El ? parseFloat(var3El.value) : null
                ].filter(v => v !== null && !isNaN(v));
                
                if (control === null || isNaN(control) || variants.length === 0) return null;
                
                const lifts = variants.map(v => ((v - control) * 100).toFixed(1));
                const minLift = Math.min(...lifts.map(parseFloat));
                
                return [
                    {
                        question: `With control at ${(control*100).toFixed(0)}% and variant lifts of ${lifts.join(', ')} pp, which lift drives sample size?`,
                        options: [
                            "The largest lift (easiest to detect)",
                            `The smallest lift (${minLift} pp, hardest to detect)`,
                            "The average of all lifts"
                        ],
                        answer: 1,
                        feedback: `Correct! You need enough data to detect your smallest effect (${minLift} pp). If you have power to detect that, you'll definitely detect larger lifts. The hardest-to-detect comparison sets the sample size.`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const armTable = document.querySelector('.arm-table');
                if (armTable) armTable.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'experiment-arms',
            title: "🧪 Step 4: EXPERIMENT — Change Number of Arms",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's see how the <strong>number of variants</strong> affects sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current per-arm N and total N</li>
                    <li>Think about what happens if you add a 4th variant (D)</li>
                    <li>With Bonferroni: α gets divided by MORE comparisons</li>
                    <li>Per-arm N increases because you need stronger evidence</li>
                </ol>
                
                <p><strong>The tradeoff:</strong></p>
                <ul>
                    <li>More variants = more options to discover winners</li>
                    <li>But also = larger total sample size needed</li>
                    <li>Each additional arm spreads traffic thinner</li>
                </ul>
                
                <p><strong>Rule of thumb:</strong> Total N grows roughly linearly with arm count, but per-arm N also increases due to multiple comparison correction.</p>
                
                <p class="task">👉 <strong>Task:</strong> Observe the per-arm summary table to see how each variant's lift affects the overall design.</p>
            `,
            quizzes: [
                {
                    question: "Adding more variants to a multi-arm test...",
                    options: [
                        "Decreases total sample size because you learn more per observation",
                        "Increases total sample size due to traffic splitting and multiple comparisons",
                        "Has no effect on sample size"
                    ],
                    answer: 1,
                    feedback: "Correct! More arms mean: (1) traffic splits more ways, and (2) with Bonferroni, you need stronger evidence per comparison (smaller per-comparison α). Both effects increase total required sample."
                }
            ],
            check: () => true
        },
        {
            id: 'experiment-lift',
            title: "🧪 Step 5: EXPERIMENT — Change Minimum Lift",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's see how <strong>effect size</strong> affects multi-arm sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current per-arm N</li>
                    <li>Change Variant B's rate from 0.230 to <strong>0.210</strong> (smaller lift)</li>
                    <li>Watch per-arm N increase dramatically!</li>
                    <li>Now try <strong>0.260</strong> (larger lift)</li>
                    <li>Watch per-arm N decrease</li>
                </ol>
                
                <p><strong>Key insight:</strong> Just like two-arm tests, smaller effects need much more data. In multi-arm tests, your SMALLEST lift dictates the design.</p>
                
                <p class="task">👉 <strong>Task:</strong> Change one variant's rate to create a smaller lift. Watch how it affects per-arm N.</p>
            `,
            getDynamicQuizzes: () => {
                const nPerArmEl = document.getElementById('metric-n-per-arm');
                const nPerArm = nPerArmEl ? nPerArmEl.textContent.replace(/,/g, '') : null;
                
                if (!nPerArm || nPerArm === '–') return null;
                
                return [
                    {
                        question: `Current per-arm N = ${nPerArmEl.textContent}. If you halve your smallest lift, what happens?`,
                        options: [
                            "Per-arm N roughly doubles",
                            "Per-arm N roughly quadruples (4×)",
                            "Per-arm N stays the same"
                        ],
                        answer: 1,
                        feedback: `Correct! Effect size appears squared in the denominator (n ∝ 1/Δ²). Halving your minimum lift quadruples per-arm N—and with 4 arms, total N quadruples too!`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const rateInput = document.getElementById('arm-rate-1');
                if (rateInput) rateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'experiment-power',
            title: "🧪 Step 6: EXPERIMENT — Change Power",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's explore how <strong>power</strong> affects multi-arm sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current per-arm N at 80% power</li>
                    <li>Change Power to <strong>0.90</strong> (90%)</li>
                    <li>Watch per-arm N increase</li>
                    <li>Try Power = <strong>0.70</strong></li>
                    <li>Watch per-arm N decrease</li>
                </ol>
                
                <p><strong>What power means for multi-arm:</strong></p>
                <ul>
                    <li>80% power = 80% chance of detecting each specified lift</li>
                    <li>For "lift vs. control" goal: applies to each comparison</li>
                    <li>For "omnibus" goal: applies to detecting any difference</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Try power = 0.90. How much does per-arm N change?</p>
            `,
            quizzes: [
                {
                    question: "In a multi-arm test with 80% power for 'lift vs. control', what does the power apply to?",
                    options: [
                        "The probability that at least one variant beats control",
                        "The probability of detecting each individual variant's lift vs. control",
                        "The overall experiment success rate"
                    ],
                    answer: 1,
                    feedback: "Correct! With 'lift vs. control' goal, 80% power means each specified lift has an 80% chance of being detected. Since comparisons are somewhat independent, the chance that ALL true lifts are detected can be lower."
                }
            ],
            check: () => true,
            onEnter: () => {
                const powerInput = document.getElementById('power');
                if (powerInput) powerInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'load-scenario',
            title: "📋 Step 7: Load a Planning Scenario",
            targetId: 'tut-scenario-section',
            content: `
                <p>The tool includes presets for common multi-arm experiments.</p>
                
                <p><strong>Available scenarios:</strong></p>
                <ul>
                    <li><strong>Email subject lines:</strong> 3 variants vs control (proportions)</li>
                    <li><strong>Landing page hero images:</strong> 4 variants vs control (omnibus)</li>
                    <li><strong>Average order value:</strong> 3 offers vs control (means)</li>
                </ul>
                
                <p><strong>Each scenario sets:</strong></p>
                <ul>
                    <li>Outcome type (proportions or means)</li>
                    <li>Control and variant targets</li>
                    <li>Testing goal (lift vs. control or omnibus)</li>
                    <li>Default confidence and power</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Load the "Email subject lines" scenario to see a realistic multi-arm setup.</p>
            `,
            quizzes: [
                {
                    question: "Why would you use 'means' mode instead of 'proportions' mode?",
                    options: [
                        "When testing more than 3 variants",
                        "When your outcome is continuous like revenue or time, not binary like clicks",
                        "When you want faster results"
                    ],
                    answer: 1,
                    feedback: "Correct! Use 'means' when measuring continuous outcomes (average order value, time on page, satisfaction scores). Use 'proportions' for binary outcomes (clicked/didn't, converted/didn't)."
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
            id: 'charts',
            title: "📊 Step 8: Interpret the Charts",
            targetId: 'tut-charts-section',
            content: `
                <p>The charts show sensitivity curves for multi-arm planning.</p>
                
                <p><strong>Chart 1 - Effect Size:</strong></p>
                <ul>
                    <li>X-axis: Smallest lift you want to detect</li>
                    <li>Y-axis: Required per-arm N</li>
                    <li>Steep curve for small lifts</li>
                </ul>
                
                <p><strong>Chart 2 - Power:</strong></p>
                <ul>
                    <li>X-axis: Desired power (0.5 to 0.99)</li>
                    <li>Y-axis: Required per-arm N</li>
                    <li>Accelerating above 90%</li>
                </ul>
                
                <p><strong>Planning insight:</strong> Use Chart 1 to negotiate with stakeholders about what minimum lift is worth detecting given traffic constraints.</p>
                
                <p class="task">👉 <strong>Task:</strong> Look at both charts. Where does the effect size curve start to flatten?</p>
            `,
            quizzes: [
                {
                    question: "What does the 'per-arm sample vs. effect size' chart show you?",
                    options: [
                        "How effect size varies across arms",
                        "How per-arm N explodes when you try to detect small lifts",
                        "The optimal number of arms to test"
                    ],
                    answer: 1,
                    feedback: "Correct! The curve shows n ∝ 1/Δ². Small lifts (left side) require massive per-arm samples. This helps you decide what's a realistic minimum lift given your traffic."
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
                <p>The DESIGN SUMMARY provides your multi-arm planning outputs.</p>
                
                <p><strong>Key metrics:</strong></p>
                <ul>
                    <li><strong>Per-arm n:</strong> Observations needed in each arm (control AND each variant)</li>
                    <li><strong>Total N:</strong> Per-arm n × number of arms</li>
                    <li><strong>Goal:</strong> Lift vs. control or omnibus</li>
                </ul>
                
                <p><strong>Per-arm summary table:</strong></p>
                <ul>
                    <li>Shows each variant's lift vs. control</li>
                    <li>Shows which comparison is "hardest" (drives sample size)</li>
                </ul>
                
                <p><strong>Planning insight:</strong> Total N = (per-arm n) × (number of arms). With 4 arms and 500/arm, you need 2,000 total observations.</p>
                
                <p class="task">👉 <strong>Task:</strong> Read the per-arm summary table. Which variant has the smallest lift?</p>
            `,
            getDynamicQuizzes: () => {
                const nPerArmEl = document.getElementById('metric-n-per-arm');
                const nTotalEl = document.getElementById('metric-n-total');
                const nPerArm = nPerArmEl ? nPerArmEl.textContent.replace(/,/g, '') : null;
                const nTotal = nTotalEl ? nTotalEl.textContent.replace(/,/g, '') : null;
                
                if (!nPerArm || !nTotal || nPerArm === '–' || nTotal === '–') return null;
                
                const perArm = parseInt(nPerArm);
                const total = parseInt(nTotal);
                const arms = Math.round(total / perArm);
                
                return [
                    {
                        question: `With per-arm n=${nPerArmEl.textContent} and total N=${nTotalEl.textContent}, how many arms are in the test?`,
                        options: [
                            `${arms - 1} arms`,
                            `${arms} arms`,
                            `${arms + 1} arms`
                        ],
                        answer: 1,
                        feedback: `Correct! ${nTotalEl.textContent} ÷ ${nPerArmEl.textContent} = ${arms} arms (1 control + ${arms - 1} variants).`
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
                <p><strong>Congratulations!</strong> You've learned to plan sample sizes for multi-arm A/B tests.</p>
                
                <h4>🔑 Key Takeaways</h4>
                <ol>
                    <li><strong>Multiple comparisons matter:</strong> More variants = stronger evidence needed per comparison</li>
                    <li><strong>Smallest lift drives design:</strong> Your hardest-to-detect effect sets sample size</li>
                    <li><strong>Total N scales with arms:</strong> 4 arms at 500/arm = 2,000 total</li>
                    <li><strong>Choose your goal wisely:</strong> Lift vs. control for picking winners; omnibus for screening</li>
                </ol>
                
                <h4>💼 Analyst's Perspective</h4>
                <p>Practical tips for multi-arm tests:</p>
                <ul>
                    <li>More variants is appealing but expensive—consider 2-3 variants max for most tests</li>
                    <li>If traffic is limited, test bigger differences (larger minimum lifts)</li>
                    <li>Use omnibus first if unsure, then follow up with focused two-arm tests</li>
                    <li>Document your minimum lift assumptions—they drive the whole design</li>
                </ul>
                
                <p><strong>Pro tip:</strong> When stakeholders want to "test 10 subject lines," show them this tool. The sample size math usually convinces them to narrow down to 3-4 strong candidates first!</p>
                
                <p class="task">👉 <strong>Tutorial complete!</strong> Use this tool whenever planning experiments with multiple variants.</p>
            `,
            quizzes: [
                {
                    question: "A stakeholder wants to test 8 variants against control. What's the best advice?",
                    options: [
                        "Go ahead—more data is always better",
                        "Show them the sample size impact and suggest narrowing to 2-3 strong candidates",
                        "Tell them multi-arm tests are impossible"
                    ],
                    answer: 1,
                    feedback: "Correct! 8 variants would require enormous total sample size and split traffic 9 ways. Better to prioritize 2-3 strongest candidates based on prior data or qualitative insights, then test more rigorously."
                }
            ],
            check: () => true
        }
    ],

    // ─────────────────────────────────────────────────────────────────────────────
    // LIFECYCLE METHODS
    // ─────────────────────────────────────────────────────────────────────────────

    init() {
        this.renderSidebar();
        this.renderOverlay();
        this.attachListeners();
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        document.body.classList.add('tutorial-active');
        const sidebar = document.getElementById('tutorial-sidebar');
        if (sidebar) sidebar.classList.add('active');
        this.updateView();
    },

    stop() {
        this.isActive = false;
        document.body.classList.remove('tutorial-active');
        const sidebar = document.getElementById('tutorial-sidebar');
        if (sidebar) sidebar.classList.remove('active');
        this.hideOverlay();
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight = null;
        }
        // Log completion if on last step
        if (this.currentStep === this.steps.length - 1) {
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend(
                    { action: 'tutorial_completed', tool: 'sample-size-multiarm-ab' },
                    'Professor Mode tutorial completed for Multi-Arm A/B Sample Size Calculator'
                );
            }
        }

        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // NAVIGATION
    // ─────────────────────────────────────────────────────────────────────────────

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.currentHighlight = null;
            this.lastCheckResult = null;
            this.updateView();
        }
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW RENDERING
    // ─────────────────────────────────────────────────────────────────────────────

    updateView() {
        const step = this.steps[this.currentStep];
        const content = document.getElementById('tutorial-content');
        if (!content) return;

        // Initialize quiz state for this step
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes) {
            const dq = step.getDynamicQuizzes();
            if (dq && dq.length) quizzes = dq;
        }
        step.quizState = quizzes.map(() => ({ answered: false, correct: false }));

        // Build quiz HTML with inline handlers
        let quizHTML = '';
        if (quizzes.length > 0) {
            quizHTML = `<div class="quiz-section"><h4>✅ Check Your Understanding</h4>`;
            quizzes.forEach((q, qIndex) => {
                const stateClass = step.quizState[qIndex].answered
                    ? (step.quizState[qIndex].correct ? 'correct' : 'incorrect')
                    : '';
                quizHTML += `
                    <div class="quiz-question ${stateClass}">
                        <p class="quiz-prompt">${q.question}</p>
                        <div class="quiz-options">
                            ${q.options.map((opt, oIndex) => `
                                <label class="quiz-option">
                                    <input type="radio" name="quiz-${this.currentStep}-${qIndex}" value="${oIndex}"
                                        onchange="SampleSizeMultiarmABTutorial.checkQuiz(${qIndex}, ${oIndex})">
                                    <span>${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="quiz-feedback" id="feedback-${this.currentStep}-${qIndex}" style="display:none;"></div>
                    </div>
                `;
            });
            quizHTML += `</div>`;
        }

        // Task completion
        const taskDone = step.check ? step.check() : true;
        const allQuizDone = step.quizState.every(s => s.answered && s.correct);
        const taskBox = step.check
            ? `<div class="completion-box task-completion ${taskDone ? 'complete' : ''}">
                   ${this.getCheckmark(taskDone)} Task ${taskDone ? 'Complete' : 'Pending'}
               </div>`
            : '';
        const quizBox = quizzes.length > 0
            ? `<div class="completion-box quiz-completion ${allQuizDone ? 'complete' : ''}">
                   ${this.getCheckmark(allQuizDone)} Quiz ${allQuizDone ? 'Complete' : 'Pending'}
               </div>`
            : '';

        const totalSteps = this.steps.length;
        const isLast = this.currentStep === totalSteps - 1;

        content.innerHTML = `
            <div class="step-header">
                <span class="step-counter">Step ${this.currentStep + 1} of ${totalSteps}</span>
                <h3>${step.title}</h3>
            </div>
            <div class="step-body">
                ${step.content}
                ${quizHTML}
                <div class="completion-status">${taskBox}${quizBox}</div>
            </div>
            <div class="step-nav">
                ${isLast
                    ? `<button class="btn-finish" onclick="SampleSizeMultiarmABTutorial.stop()">🎓 Finish Tutorial</button>`
                    : `<button class="btn-next" onclick="SampleSizeMultiarmABTutorial.nextStep()">Next Step →</button>`
                }
            </div>
        `;

        // Highlight target element
        this.highlightElement(step.targetId);

        // Start polling for task completion
        if (step.check) this.checkProgress();

        // Call onEnter if defined
        if (step.onEnter) step.onEnter();
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // QUIZ HANDLING
    // ─────────────────────────────────────────────────────────────────────────────

    checkQuiz(qIndex, selectedValue) {
        const step = this.steps[this.currentStep];
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes) {
            const dq = step.getDynamicQuizzes();
            if (dq && dq.length) quizzes = dq;
        }
        const quiz = quizzes[qIndex];
        if (!quiz) return;

        const isCorrect = selectedValue === quiz.answer;
        step.quizState[qIndex] = { answered: true, correct: isCorrect };

        const feedbackEl = document.getElementById(`feedback-${this.currentStep}-${qIndex}`);
        if (feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
            feedbackEl.textContent = isCorrect ? quiz.feedback : `Not quite. ${quiz.feedback}`;
        }

        // Update completion status
        const allQuizDone = step.quizState.every(s => s.answered && s.correct);
        const quizCompletion = document.querySelector('.quiz-completion');
        if (quizCompletion) {
            quizCompletion.classList.toggle('complete', allQuizDone);
            quizCompletion.innerHTML = `${this.getCheckmark(allQuizDone)} Quiz ${allQuizDone ? 'Complete' : 'Pending'}`;
        }
    },

    getCheckmark(completed) {
        return completed ? '✅' : '⬜';
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // TASK CHECKING
    // ─────────────────────────────────────────────────────────────────────────────

    checkProgress() {
        const step = this.steps[this.currentStep];
        if (!step.check) return;

        const intervalId = setInterval(() => {
            if (!this.isActive || this.steps[this.currentStep]?.id !== step.id) {
                clearInterval(intervalId);
                return;
            }
            const done = step.check();
            if (done !== this.lastCheckResult) {
                this.lastCheckResult = done;
                const taskBox = document.querySelector('.task-completion');
                if (taskBox) {
                    taskBox.classList.toggle('complete', done);
                    taskBox.innerHTML = `${this.getCheckmark(done)} Task ${done ? 'Complete' : 'Pending'}`;
                }
            }
        }, 500);
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // HIGHLIGHTING & OVERLAY
    // ─────────────────────────────────────────────────────────────────────────────

    highlightElement(targetId) {
        // Clear previous highlight
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
        }
        if (!targetId) {
            this.hideOverlay();
            return;
        }
        const el = document.getElementById(targetId);
        if (el) {
            el.classList.add('tutorial-highlight');
            this.currentHighlight = el;
            this.showOverlay();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // DOM SETUP
    // ─────────────────────────────────────────────────────────────────────────────

    renderSidebar() {
        if (document.getElementById('tutorial-sidebar')) return;
        const sidebar = document.createElement('div');
        sidebar.id = 'tutorial-sidebar';
        sidebar.className = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="tutorial-header">
                <span>🎓 Professor Mode</span>
                <button class="close-btn" onclick="document.getElementById('professorMode').checked=false; SampleSizeMultiarmABTutorial.stop();">✕</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(sidebar);
    },

    renderOverlay() {
        if (document.getElementById('tutorial-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
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

        // Poll for task completion
        setInterval(() => {
            if (!this.isActive) return;
            const step = this.steps[this.currentStep];
            if (step && step.check) {
                const done = step.check();
                if (done !== this.lastCheckResult) {
                    this.lastCheckResult = done;
                    const taskBox = document.querySelector('.task-completion');
                    if (taskBox) {
                        taskBox.classList.toggle('complete', done);
                        taskBox.innerHTML = `${this.getCheckmark(done)} Task ${done ? 'Complete' : 'Pending'}`;
                    }
                }
            }
        }, 500);
    }
};

// Initialize when DOM is ready
setTimeout(() => SampleSizeMultiarmABTutorial.init(), 500);
