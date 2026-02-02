/**
 * Sample Size A/B Calculator Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 * Pattern: Dynamic sidebar/overlay creation with polling
 */

const SampleSizeABTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to A/B Sample Size Planning",
            targetId: null,
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you how to <strong>plan the sample size</strong> for A/B tests comparing two groups.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>The components of sample size calculations</li>
                    <li>How effect size impacts required sample size</li>
                    <li>The role of power and confidence level</li>
                    <li>Proportions vs. means comparisons</li>
                    <li>Trading off statistical rigor vs. practical constraints</li>
                </ol>
                
                <p><strong>Why this matters:</strong> Before running an A/B test, you need to know how much traffic or how many customers to include. Too few, and you won't detect a real difference; too many wastes time and resources.</p>
            `,
            quizzes: [
                {
                    question: "Why is sample size planning important before running an A/B test?",
                    options: [
                        "It guarantees your test will find a statistically significant result",
                        "It ensures you have enough data to detect meaningful differences with adequate power",
                        "It eliminates the need for randomization"
                    ],
                    answer: 1,
                    feedback: "Correct! Sample size planning ensures you collect enough data to have a good chance (power) of detecting real effects. Without proper planning, you might run an underpowered test that misses real improvements."
                }
            ],
            check: () => true
        },
        {
            id: 'formulas',
            title: "📚 Step 1: Understanding the Formulas",
            targetId: 'tut-overview-section',
            content: `
                <p>Sample size formulas balance several competing factors to find the minimum n needed.</p>
                
                <p><strong>Key ingredients:</strong></p>
                <ul>
                    <li><strong>Effect size (Δ):</strong> The minimum difference worth detecting</li>
                    <li><strong>Variability (σ or p):</strong> How spread out the outcomes are</li>
                    <li><strong>Alpha (α):</strong> False positive risk (usually 5%)</li>
                    <li><strong>Power (1-β):</strong> Probability of detecting a true effect (usually 80%)</li>
                </ul>
                
                <p><strong>The intuition:</strong></p>
                <ul>
                    <li>Smaller effects → need MORE data to detect</li>
                    <li>Higher variability → need MORE data</li>
                    <li>Higher power → need MORE data</li>
                    <li>Stricter confidence → need MORE data</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the TEST OVERVIEW section. Notice how the formula components relate to the planning process.</p>
            `,
            quizzes: [
                {
                    question: "If you want to detect a SMALLER effect, what happens to required sample size?",
                    options: [
                        "Sample size decreases",
                        "Sample size stays the same",
                        "Sample size increases"
                    ],
                    answer: 2,
                    feedback: "Correct! Smaller effects are harder to distinguish from noise, so you need more observations to reliably detect them. This is why effect size appears in the denominator of sample size formulas."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'load-scenario',
            title: "🎯 Step 2: Load a Marketing Scenario",
            targetId: 'tut-scenario-section',
            content: `
                <p>The tool includes preset scenarios demonstrating real A/B testing questions.</p>
                
                <p><strong>Available scenarios:</strong></p>
                <ul>
                    <li><strong>Email subject line:</strong> Compare open rates (proportions)</li>
                    <li><strong>Landing page:</strong> Compare conversion rates (proportions)</li>
                    <li><strong>Average order value:</strong> Compare spending (means)</li>
                </ul>
                
                <p><strong>Two outcome types:</strong></p>
                <ul>
                    <li><strong>Two proportions:</strong> Binary outcomes like click/no-click, convert/don't convert</li>
                    <li><strong>Two means:</strong> Continuous outcomes like revenue, time on site</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Load the "Email subject line A/B" scenario from the dropdown. This tests a 5 percentage-point lift in open rates.</p>
            `,
            quizzes: [
                {
                    question: "When would you use 'Two proportions' vs. 'Two means'?",
                    options: [
                        "Proportions for any marketing test, means only for finance",
                        "Proportions for yes/no outcomes, means for numeric outcomes like revenue",
                        "They're interchangeable—use whichever gives smaller sample size"
                    ],
                    answer: 1,
                    feedback: "Correct! Use proportions for binary outcomes (converted/didn't, clicked/didn't). Use means for continuous metrics like average order value, time on site, or satisfaction scores."
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
            id: 'baseline-effect',
            title: "⚙️ Step 3: Set Baseline & Effect Size",
            targetId: 'tut-inputs-section',
            content: `
                <p>The most critical inputs are your <strong>baseline rate</strong> and the <strong>minimum effect</strong> you want to detect.</p>
                
                <p><strong>For proportions:</strong></p>
                <ul>
                    <li><strong>p₁ (baseline):</strong> Your current conversion rate</li>
                    <li><strong>p₂ (variant):</strong> The rate you'd need to justify a rollout</li>
                    <li><strong>Effect = p₂ - p₁:</strong> The "lift" you're planning for</li>
                </ul>
                
                <p><strong>Example thinking:</strong><br>
                "Our current open rate is 20%. We'd only change the subject line if we're confident the new one lifts opens to at least 25%."</p>
                
                <p><strong>Key insight:</strong> The effect size is what YOU define as "worth detecting." Larger effects are easier to detect with smaller samples.</p>
                
                <p class="task">👉 <strong>Task:</strong> Look at the current p₁ and p₂ values. The difference (p₂ - p₁) is the "minimum detectable effect."</p>
            `,
            getDynamicQuizzes: () => {
                const p1El = document.getElementById('p1-input');
                const p2El = document.getElementById('p2-input');
                const p1 = p1El ? parseFloat(p1El.value) : null;
                const p2 = p2El ? parseFloat(p2El.value) : null;
                
                if (p1 === null || p2 === null || isNaN(p1) || isNaN(p2)) return null;
                
                const lift = ((p2 - p1) * 100).toFixed(1);
                const relLift = (((p2 - p1) / p1) * 100).toFixed(1);
                
                return [
                    {
                        question: `With baseline p₁=${(p1*100).toFixed(0)}% and variant p₂=${(p2*100).toFixed(0)}%, what is the absolute lift?`,
                        options: [
                            `${(parseFloat(lift) * 0.5).toFixed(1)} percentage points`,
                            `${lift} percentage points`,
                            `${relLift}%`
                        ],
                        answer: 1,
                        feedback: `Correct! The absolute lift is p₂ - p₁ = ${(p2*100).toFixed(0)}% - ${(p1*100).toFixed(0)}% = ${lift} percentage points. This is different from relative lift (${relLift}%).`
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
            id: 'power-alpha',
            title: "🔬 Step 4: Power & Confidence",
            targetId: 'tut-inputs-section',
            content: `
                <p>Two parameters control your "error rates"—how often you'll make mistakes.</p>
                
                <p><strong>Confidence level (1 - α):</strong></p>
                <ul>
                    <li>Controls false positive rate (Type I error)</li>
                    <li>95% confidence = 5% chance of declaring a winner when there's no real difference</li>
                    <li>Higher confidence → larger sample needed</li>
                </ul>
                
                <p><strong>Power (1 - β):</strong></p>
                <ul>
                    <li>Controls false negative rate (Type II error)</li>
                    <li>80% power = 80% chance of detecting a true effect of the specified size</li>
                    <li>Higher power → larger sample needed</li>
                </ul>
                
                <p><strong>Common choices:</strong></p>
                <ul>
                    <li>95% confidence, 80% power — standard for most A/B tests</li>
                    <li>90% confidence, 80% power — less strict, smaller sample</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Note the current power and confidence settings. We'll experiment with these next!</p>
            `,
            quizzes: [
                {
                    question: "What does '80% power' mean in the context of sample size planning?",
                    options: [
                        "You'll detect 80% of all possible effects",
                        "If the true effect exists (at the specified size), you have 80% chance of finding it significant",
                        "80% of your sample will be in the treatment group"
                    ],
                    answer: 1,
                    feedback: "Correct! Power is the probability of correctly rejecting the null hypothesis when the effect truly exists. 80% power means you'll detect the specified effect 80 times out of 100 if you repeated the experiment."
                }
            ],
            check: () => true
        },
        {
            id: 'experiment-power',
            title: "🧪 Step 5: EXPERIMENT — Change Power",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's see how <strong>power</strong> affects sample size through hands-on experimentation.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current <strong>Total sample size (N)</strong> in DESIGN SUMMARY</li>
                    <li>Change Power from <strong>0.80 to 0.90</strong></li>
                    <li>Observe how N changes</li>
                    <li>Then try Power = <strong>0.70</strong></li>
                </ol>
                
                <p><strong>What to expect:</strong></p>
                <ul>
                    <li>Higher power → larger N (more data needed)</li>
                    <li>Lower power → smaller N (but higher risk of missing real effects)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Try different power values and watch the Total N change. Answer the quiz about what you observed.</p>
            `,
            getDynamicQuizzes: () => {
                const powerEl = document.getElementById('power');
                const nTotalEl = document.getElementById('metric-ntotal');
                const power = powerEl ? parseFloat(powerEl.value) : null;
                const nTotal = nTotalEl ? nTotalEl.textContent.replace(/,/g, '') : null;
                const n = nTotal ? parseInt(nTotal) : null;
                
                if (power === null || n === null || isNaN(power) || isNaN(n)) return null;
                
                return [
                    {
                        question: `At power=${(power*100).toFixed(0)}%, the total N is ${nTotal}. If you increase power to 90%, what happens?`,
                        options: [
                            "N decreases because higher power is more efficient",
                            "N increases because you need more data to reduce false negatives",
                            "N stays the same—power doesn't affect sample size"
                        ],
                        answer: 1,
                        feedback: `Correct! Higher power requires more observations. At 90% power you'd have only a 10% chance of missing a true effect (vs. 20% at 80% power), but this protection costs additional sample size.`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const powerInput = document.getElementById('power');
                if (powerInput) powerInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'experiment-effect',
            title: "🧪 Step 6: EXPERIMENT — Change Effect Size",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's explore the most dramatic driver: <strong>effect size</strong>.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current effect (difference between p₁ and p₂)</li>
                    <li>Keep p₁ the same, but change p₂ to make a <strong>smaller</strong> effect</li>
                    <li>Watch how N increases dramatically!</li>
                    <li>Then try a <strong>larger</strong> effect and see N drop</li>
                </ol>
                
                <p><strong>Example:</strong></p>
                <ul>
                    <li>Original: p₁=0.20, p₂=0.25 (5 pp lift)</li>
                    <li>Smaller effect: p₁=0.20, p₂=0.22 (2 pp lift) → Much larger N!</li>
                    <li>Larger effect: p₁=0.20, p₂=0.30 (10 pp lift) → Much smaller N!</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Change p₂ to create a smaller effect (closer to p₁). Watch the required N explode!</p>
            `,
            getDynamicQuizzes: () => {
                const p1El = document.getElementById('p1-input');
                const p2El = document.getElementById('p2-input');
                const nTotalEl = document.getElementById('metric-ntotal');
                const p1 = p1El ? parseFloat(p1El.value) : null;
                const p2 = p2El ? parseFloat(p2El.value) : null;
                const nTotal = nTotalEl ? nTotalEl.textContent.replace(/,/g, '') : null;
                
                if (p1 === null || p2 === null || isNaN(p1) || isNaN(p2)) return null;
                
                const effect = Math.abs(p2 - p1);
                const effectPP = (effect * 100).toFixed(1);
                
                return [
                    {
                        question: `The current effect is ${effectPP} percentage points. If you halve the effect size, what happens to required N?`,
                        options: [
                            "N roughly doubles",
                            "N roughly quadruples (4×)",
                            "N stays about the same"
                        ],
                        answer: 1,
                        feedback: `Correct! Effect size appears squared in the denominator: n ∝ 1/Δ². Halving the effect roughly quadruples the required sample size. This is why realistic effect size assumptions are critical!`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const p2Input = document.getElementById('p2-input');
                if (p2Input) p2Input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'experiment-confidence',
            title: "🧪 Step 7: EXPERIMENT — Change Confidence",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's explore how <strong>confidence level</strong> (alpha) affects sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current N at 95% confidence</li>
                    <li>Click <strong>90% Conf.</strong> button</li>
                    <li>Observe how N decreases</li>
                    <li>Try <strong>99% Conf.</strong> and watch N increase</li>
                </ol>
                
                <p><strong>The tradeoff:</strong></p>
                <ul>
                    <li>90% confidence = 10% false positive risk, smaller N</li>
                    <li>95% confidence = 5% false positive risk, moderate N</li>
                    <li>99% confidence = 1% false positive risk, larger N</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Click between confidence buttons and observe the N changes. When might you accept 90% confidence?</p>
            `,
            quizzes: [
                {
                    question: "When might a marketing analyst choose 90% confidence instead of 95%?",
                    options: [
                        "When the test is extremely important and costly",
                        "When traffic is limited and a 10% false positive risk is acceptable",
                        "Never—always use 95% confidence"
                    ],
                    answer: 1,
                    feedback: "Correct! 90% confidence requires less sample size. It's reasonable when: (1) traffic is limited, (2) the cost of a false positive is low, or (3) you're doing preliminary/exploratory testing before a more rigorous follow-up."
                }
            ],
            check: () => true,
            onEnter: () => {
                const confButtons = document.querySelector('.confidence-buttons');
                if (confButtons) confButtons.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'means-mode',
            title: "📈 Step 8: Two Means Mode",
            targetId: 'tut-inputs-section',
            content: `
                <p>Switch to <strong>Two Means</strong> mode to see how continuous outcomes work.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Click "Two means" button at top of inputs</li>
                    <li>Notice the new inputs: μ₁, μ₂, and σ (standard deviation)</li>
                    <li>The default: baseline $50 → variant $55, with σ=$15</li>
                </ol>
                
                <p><strong>Key difference:</strong> For means, you also need σ (variability). Higher σ → need more data.</p>
                
                <p><strong>Common use cases:</strong></p>
                <ul>
                    <li>Average order value (AOV) experiments</li>
                    <li>Time on page / session duration</li>
                    <li>Customer satisfaction scores</li>
                    <li>Revenue per user</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Click "Two means" and note the new parameters. Try changing σ and see how it affects N.</p>
            `,
            getDynamicQuizzes: () => {
                // Check if in means mode
                const meanPanel = document.querySelector('.mode-panel[data-mode="mean"]');
                const isVisible = meanPanel && meanPanel.classList.contains('active');
                
                if (!isVisible) {
                    return [
                        {
                            question: "What additional parameter do you need for 'Two Means' that you don't need for proportions?",
                            options: [
                                "The sample size itself",
                                "The standard deviation (σ) of the outcome variable",
                                "The baseline conversion rate"
                            ],
                            answer: 1,
                            feedback: "Correct! For means, you need to estimate σ (standard deviation). For proportions, the variance is determined by p itself: Var = p(1-p). For continuous variables, you must provide σ separately."
                        }
                    ];
                }
                
                const sigmaEl = document.getElementById('mean-sigma-input');
                const sigma = sigmaEl ? parseFloat(sigmaEl.value) : null;
                
                if (sigma === null || isNaN(sigma)) return null;
                
                return [
                    {
                        question: `With σ=${sigma.toFixed(1)}, if variability doubled (σ=${(sigma*2).toFixed(1)}), what happens to required N?`,
                        options: [
                            "N roughly doubles",
                            "N roughly quadruples (4×)",
                            "N stays about the same"
                        ],
                        answer: 1,
                        feedback: `Correct! Standard deviation σ appears squared in the numerator: n ∝ σ². Doubling σ quadruples the required sample size. This is why accurate estimates of variability are important!`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const modeToggle = document.querySelector('.mode-toggle');
                if (modeToggle) modeToggle.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'charts',
            title: "📊 Step 9: Interpret the Charts",
            targetId: 'tut-charts-section',
            content: `
                <p>The charts show sensitivity curves—how sample size changes as you vary one parameter.</p>
                
                <p><strong>Chart 1 - Effect Size:</strong></p>
                <ul>
                    <li>X-axis: Effect size (Δ)</li>
                    <li>Y-axis: Required total N</li>
                    <li>Shape: Steep decline as effect gets larger</li>
                </ul>
                
                <p><strong>Chart 2 - Power:</strong></p>
                <ul>
                    <li>Shows how N grows as power increases</li>
                    <li>The curve accelerates above 90% power</li>
                </ul>
                
                <p><strong>Chart 3 - Variability:</strong></p>
                <ul>
                    <li>For proportions: shows different baseline p₁ values</li>
                    <li>For means: shows different σ values</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Study the Effect Size chart. Notice how the curve flattens as effects get larger—big effects are easy to detect!</p>
            `,
            quizzes: [
                {
                    question: "Looking at the 'Required sample vs. effect size' chart, what shape does the curve have?",
                    options: [
                        "Linear—N decreases at a constant rate as effect increases",
                        "Steep decline at first, then flattening—small effects need huge N",
                        "Flat—effect size doesn't affect required N"
                    ],
                    answer: 1,
                    feedback: "Correct! The curve shows n ∝ 1/Δ², creating a steep decline for small effects that flattens out. This means going from a 1% to 2% effect dramatically cuts sample size, but going from 10% to 11% effect barely matters."
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
            title: "📋 Step 10: Read the Design Summary",
            targetId: 'tut-results-section',
            content: `
                <p>The DESIGN SUMMARY provides the key outputs and interpretations.</p>
                
                <p><strong>Key metrics:</strong></p>
                <ul>
                    <li><strong>n (Group A):</strong> Control group sample size</li>
                    <li><strong>n (Group B):</strong> Treatment group sample size</li>
                    <li><strong>Total N:</strong> Combined sample needed</li>
                </ul>
                
                <p><strong>APA-Style Statement:</strong> A formal description suitable for reports and papers.</p>
                
                <p><strong>Managerial Interpretation:</strong> Plain-language explanation for stakeholders.</p>
                
                <p><strong>Planning insight:</strong> Use these numbers to estimate test duration. If you get 1,000 visitors/day and need N=10,000, plan for at least 10 days (plus buffer for weekends, etc.).</p>
                
                <p class="task">👉 <strong>Task:</strong> Read both the APA statement and managerial interpretation. Note how they communicate the same information differently.</p>
            `,
            getDynamicQuizzes: () => {
                const n1El = document.getElementById('metric-n1');
                const n2El = document.getElementById('metric-n2');
                const nTotalEl = document.getElementById('metric-ntotal');
                
                const n1 = n1El ? n1El.textContent.replace(/,/g, '') : null;
                const n2 = n2El ? n2El.textContent.replace(/,/g, '') : null;
                const nTotal = nTotalEl ? nTotalEl.textContent.replace(/,/g, '') : null;
                
                if (!n1 || !n2 || !nTotal || n1 === '—' || n2 === '—' || nTotal === '—') return null;
                
                const n1Num = parseInt(n1);
                const dailyVisitors = 500;
                const daysNeeded = Math.ceil(parseInt(nTotal) / dailyVisitors);
                
                return [
                    {
                        question: `With total N=${nTotal} needed and 500 daily visitors, roughly how many days would the test run?`,
                        options: [
                            `About ${Math.ceil(daysNeeded * 0.5)} days`,
                            `About ${daysNeeded} days`,
                            `About ${daysNeeded * 2} days`
                        ],
                        answer: 1,
                        feedback: `Correct! ${nTotal} ÷ 500 visitors/day ≈ ${daysNeeded} days. In practice, add buffer time for weekends, traffic variability, and reaching stable estimates.`
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
                <p><strong>Congratulations!</strong> You've learned to plan sample sizes for A/B tests.</p>
                
                <h4>🔑 Key Takeaways</h4>
                <ol>
                    <li><strong>Effect size dominates:</strong> Small effects need huge samples (n ∝ 1/Δ²)</li>
                    <li><strong>Power and confidence add cost:</strong> Going from 80% to 90% power isn't free</li>
                    <li><strong>Variability matters:</strong> More variable outcomes need more data</li>
                    <li><strong>Planning is negotiation:</strong> Balance statistical rigor against practical constraints</li>
                </ol>
                
                <h4>💼 Analyst's Perspective</h4>
                <p>In practice, sample size planning is iterative:</p>
                <ul>
                    <li>Start with the minimum effect that would matter to the business</li>
                    <li>Calculate required N at standard power/confidence</li>
                    <li>If N is infeasible, consider: Can you test a bigger change? Accept 90% confidence? Run longer?</li>
                    <li>Document your assumptions for stakeholders</li>
                </ul>
                
                <p><strong>Pro tip:</strong> When stakeholders push back on test duration, show them the Effect Size chart. It visualizes why "just detecting a 1% lift" requires exponentially more data than a 5% lift.</p>
                
                <p class="task">👉 <strong>Tutorial complete!</strong> Use this tool whenever you plan A/B tests to ensure adequate statistical power.</p>
            `,
            quizzes: [
                {
                    question: "If required sample size is infeasible, which approach is NOT recommended?",
                    options: [
                        "Test a larger (more impactful) change that's easier to detect",
                        "Accept 90% instead of 95% confidence if the stakes are low",
                        "Run the test anyway and hope for significance"
                    ],
                    answer: 2,
                    feedback: "Correct! Running an underpowered test 'hoping for significance' is bad practice. You'll likely get inconclusive results and waste time. Better to adjust your design parameters or test a bigger change."
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
                    { action: 'tutorial_completed', tool: 'sample-size-ab' },
                    'Professor Mode tutorial completed for Sample Size A/B Calculator'
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="SampleSizeABTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="SampleSizeABTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="SampleSizeABTutorial.nextStep()">Next Step ➜</button>`
                ) :
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }

            <button class="btn-secondary full-width" onclick="SampleSizeABTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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
                <button onclick="SampleSizeABTutorial.stop()" class="close-tutorial">×</button>
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
    setTimeout(() => SampleSizeABTutorial.init(), 500);
});
