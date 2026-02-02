// Sample Size Calculator Tutorial - Professor Mode Implementation

const SampleSizeCalculatorTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to Sample Size Planning",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you how to <strong>plan the sample size</strong> for estimating a single metric with confidence.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>How sample size relates to precision</li>
                    <li>The role of margin of error and confidence</li>
                    <li>Planning for proportions vs. means</li>
                    <li>Finite population corrections</li>
                    <li>Trading off precision against practicality</li>
                </ol>
                
                <p><strong>Why this matters:</strong> Before launching a survey or study, you need to know how many responses will give you reliable estimates. This tool answers: "How many do I need to get ±X% precision?"</p>
            `,
            quizzes: [
                {
                    question: "What is the primary goal of sample size planning for estimation?",
                    options: [
                        "To ensure you get a statistically significant result",
                        "To determine how many observations you need for a desired level of precision",
                        "To minimize the cost of data collection"
                    ],
                    answer: 1,
                    feedback: "Correct! Sample size planning for estimation focuses on achieving your desired precision (margin of error) with a specified confidence level. It's about how well you can estimate the true value."
                }
            ],
            check: () => true
        },
        {
            id: 'formulas',
            title: "📚 Step 1: Understanding the Formulas",
            targetId: 'tut-overview-section',
            content: `
                <p>Sample size formulas for estimation balance three key factors.</p>
                
                <p><strong>The ingredients:</strong></p>
                <ul>
                    <li><strong>Margin of error (E):</strong> How precise you want to be (±E)</li>
                    <li><strong>Confidence level:</strong> How sure you want to be (typically 95%)</li>
                    <li><strong>Variability (p or σ):</strong> How spread out the data is</li>
                </ul>
                
                <p><strong>The core relationship:</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace;">
                    n ∝ (Variability)² / (Margin of Error)²
                </p>
                
                <p><strong>Key insight:</strong> Halving your margin of error requires 4× the sample size (because n ∝ 1/E²)!</p>
                
                <p class="task">👉 <strong>Task:</strong> Read the TEST OVERVIEW section to see the exact formulas for proportions and means.</p>
            `,
            quizzes: [
                {
                    question: "If you want TWICE the precision (half the margin of error), how does sample size change?",
                    options: [
                        "Double the sample size (2×)",
                        "Quadruple the sample size (4×)",
                        "Sample size stays the same"
                    ],
                    answer: 1,
                    feedback: "Correct! Because n ∝ 1/E², halving E means multiplying n by 4. This 'square law' explains why very tight precision can require impractically large samples."
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
            title: "🎯 Step 2: Load a Planning Scenario",
            targetId: 'tut-scenario-section',
            content: `
                <p>The tool includes preset scenarios for common estimation problems.</p>
                
                <p><strong>Available scenarios:</strong></p>
                <ul>
                    <li><strong>Email open rate:</strong> Estimate a proportion (binary outcome)</li>
                    <li><strong>Average order value:</strong> Estimate a mean (continuous outcome)</li>
                </ul>
                
                <p><strong>The difference:</strong></p>
                <ul>
                    <li><strong>Proportion:</strong> % who click, convert, respond, etc.</li>
                    <li><strong>Mean:</strong> Average revenue, satisfaction score, time, etc.</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Load the "Estimate an email open rate" scenario from the dropdown.</p>
            `,
            quizzes: [
                {
                    question: "When would you use 'Single proportion' mode?",
                    options: [
                        "When measuring customer satisfaction on a 1-10 scale",
                        "When estimating what % of customers will click, convert, or respond",
                        "When calculating average revenue per customer"
                    ],
                    answer: 1,
                    feedback: "Correct! Proportions are for binary (yes/no) outcomes: click rates, conversion rates, response rates, approval percentages, etc. Use 'mean' for numeric scales or dollar amounts."
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
            id: 'proportion-inputs',
            title: "⚙️ Step 3: Set Proportion Parameters",
            targetId: 'tut-inputs-section',
            content: `
                <p>For proportion estimation, you need two key inputs.</p>
                
                <p><strong>Expected proportion (p):</strong></p>
                <ul>
                    <li>Your best guess for the true rate</li>
                    <li>Use prior campaigns, industry benchmarks, or pilot data</li>
                    <li>p = 0.5 is the "worst case" (maximizes sample size)</li>
                </ul>
                
                <p><strong>Margin of error (E):</strong></p>
                <ul>
                    <li>The ± precision you want in your final estimate</li>
                    <li>E = 0.03 means ±3 percentage points</li>
                    <li>If true rate is 20%, you'd report 17%–23%</li>
                </ul>
                
                <p><strong>Example:</strong> "I want to estimate open rate within ±3 percentage points, expecting it's around 20%"</p>
                
                <p class="task">👉 <strong>Task:</strong> Note the current p and E values. Watch what happens when we change them!</p>
            `,
            getDynamicQuizzes: () => {
                const pEl = document.getElementById('prop-p-input');
                const eEl = document.getElementById('prop-e-input');
                const p = pEl ? parseFloat(pEl.value) : null;
                const e = eEl ? parseFloat(eEl.value) : null;
                
                if (p === null || e === null || isNaN(p) || isNaN(e)) return null;
                
                const pPct = (p * 100).toFixed(0);
                const ePct = (e * 100).toFixed(0);
                const lowerBound = ((p - e) * 100).toFixed(0);
                const upperBound = ((p + e) * 100).toFixed(0);
                
                return [
                    {
                        question: `With p=${pPct}% and E=±${ePct}pp, what confidence interval would you report?`,
                        options: [
                            `${lowerBound}% to ${upperBound}%`,
                            `${pPct}% exactly`,
                            `0% to ${(p*2*100).toFixed(0)}%`
                        ],
                        answer: 0,
                        feedback: `Correct! With margin of error ±${ePct} percentage points around an estimate of ${pPct}%, you'd report a confidence interval of ${lowerBound}% to ${upperBound}%.`
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
            id: 'experiment-margin',
            title: "🧪 Step 4: EXPERIMENT — Change Margin of Error",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's see how <strong>margin of error</strong> dramatically affects sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current required n in DESIGN SUMMARY</li>
                    <li>Change E from <strong>0.03 (±3pp)</strong> to <strong>0.02 (±2pp)</strong></li>
                    <li>Watch n increase substantially</li>
                    <li>Now try E = <strong>0.05 (±5pp)</strong> and see n decrease</li>
                </ol>
                
                <p><strong>What to expect:</strong></p>
                <ul>
                    <li>Tighter precision (smaller E) → much larger n</li>
                    <li>Looser precision (larger E) → much smaller n</li>
                    <li>The relationship is n ∝ 1/E² (quadratic)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Try E = 0.02 then E = 0.05. How many times does n change?</p>
            `,
            getDynamicQuizzes: () => {
                const eEl = document.getElementById('prop-e-input');
                const nEl = document.getElementById('metric-n');
                const e = eEl ? parseFloat(eEl.value) : null;
                const nText = nEl ? nEl.textContent.replace(/,/g, '') : null;
                const n = nText ? parseInt(nText) : null;
                
                if (e === null || n === null || isNaN(e) || isNaN(n)) return null;
                
                const ePct = (e * 100).toFixed(0);
                
                return [
                    {
                        question: `At E=±${ePct}pp, n=${nEl.textContent}. If you halve E (to ±${(e*50).toFixed(1)}pp), what happens?`,
                        options: [
                            "n roughly doubles (2×)",
                            "n roughly quadruples (4×)",
                            "n increases only slightly"
                        ],
                        answer: 1,
                        feedback: `Correct! Because n ∝ 1/E², halving the margin of error quadruples the required sample. This is why marketers often accept ±5pp instead of ±2pp—the sample size difference is enormous!`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const eInput = document.getElementById('prop-e-input');
                if (eInput) eInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'experiment-p',
            title: "🧪 Step 5: EXPERIMENT — Change Expected Proportion",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's explore how your <strong>expected proportion</strong> affects sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current n</li>
                    <li>Change p from <strong>0.20 to 0.50</strong></li>
                    <li>Observe n increases!</li>
                    <li>Try p = <strong>0.05</strong> and see n decrease</li>
                </ol>
                
                <p><strong>Why does p matter?</strong></p>
                <ul>
                    <li>Variance of a proportion is p(1-p)</li>
                    <li>Maximum variance occurs at p = 0.50</li>
                    <li>Extreme proportions (near 0 or 1) have lower variance</li>
                </ul>
                
                <p><strong>Planning tip:</strong> If you're unsure of p, use p = 0.50 for a conservative (maximum) sample size estimate.</p>
                
                <p class="task">👉 <strong>Task:</strong> Change p to 0.50, then to 0.05. Watch how n changes.</p>
            `,
            quizzes: [
                {
                    question: "Why does p = 0.50 require the largest sample size (for a given E)?",
                    options: [
                        "Because 50% is the most common rate in marketing",
                        "Because p(1-p) is maximized at p = 0.50, giving maximum variance",
                        "Because confidence intervals are wider at 50%"
                    ],
                    answer: 1,
                    feedback: "Correct! The variance p(1-p) peaks at p = 0.50 where it equals 0.25. At p = 0.20, variance is only 0.16. Higher variance means you need more data to achieve the same precision."
                }
            ],
            check: () => true,
            onEnter: () => {
                const pInput = document.getElementById('prop-p-input');
                if (pInput) pInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'experiment-confidence',
            title: "🧪 Step 6: EXPERIMENT — Change Confidence Level",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's see how <strong>confidence level</strong> affects sample size.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Note the current n at 95% confidence</li>
                    <li>Click <strong>90% Conf.</strong> button</li>
                    <li>Watch n decrease</li>
                    <li>Try <strong>99% Conf.</strong> and watch n increase</li>
                </ol>
                
                <p><strong>The tradeoff:</strong></p>
                <ul>
                    <li>90% confidence → smaller n, but 10% chance interval misses true value</li>
                    <li>95% confidence → standard choice, moderate n</li>
                    <li>99% confidence → larger n, very reliable interval</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Click between confidence levels and observe how n changes.</p>
            `,
            quizzes: [
                {
                    question: "When might you choose 90% confidence instead of 95%?",
                    options: [
                        "When you need extremely high precision",
                        "When sample size is constrained and you accept slightly more uncertainty",
                        "When the population is infinite"
                    ],
                    answer: 1,
                    feedback: "Correct! 90% confidence requires fewer observations. It's reasonable for preliminary estimates, internal planning, or when resources are limited and you're comfortable with 10% chance of the interval missing the true value."
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
            title: "📈 Step 7: Single Mean Mode",
            targetId: 'tut-inputs-section',
            content: `
                <p>Switch to <strong>Single Mean</strong> mode for continuous variables.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Click "Single mean" button at top of inputs</li>
                    <li>Notice the new inputs: σ (standard deviation) and E (in units)</li>
                    <li>Default: σ=$10, E=±$2</li>
                </ol>
                
                <p><strong>Key difference from proportions:</strong></p>
                <ul>
                    <li>You must estimate σ (standard deviation) from prior data</li>
                    <li>Margin of error E is in the original units (dollars, minutes, etc.)</li>
                    <li>The helper tool can estimate σ from expected min/max</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Click "Single mean" and try the σ estimation helper (expand "Help me estimate σ from a range").</p>
            `,
            getDynamicQuizzes: () => {
                const meanPanel = document.querySelector('.mode-panel[data-mode="mean"]');
                const isVisible = meanPanel && meanPanel.classList.contains('active');
                
                if (!isVisible) {
                    return [
                        {
                            question: "For estimating a mean, what additional parameter is needed vs. proportions?",
                            options: [
                                "The expected proportion p",
                                "The standard deviation σ of the variable",
                                "The number of treatment groups"
                            ],
                            answer: 1,
                            feedback: "Correct! For means, you need to know or estimate σ (variability). For proportions, the variance is determined by p itself: Var = p(1-p)."
                        }
                    ];
                }
                
                const sigmaEl = document.getElementById('mean-sigma-input');
                const eEl = document.getElementById('mean-e-input');
                const sigma = sigmaEl ? parseFloat(sigmaEl.value) : null;
                const e = eEl ? parseFloat(eEl.value) : null;
                
                if (sigma === null || e === null || isNaN(sigma) || isNaN(e)) return null;
                
                return [
                    {
                        question: `With σ=$${sigma.toFixed(0)} and E=±$${e.toFixed(0)}, what does doubling σ do to required n?`,
                        options: [
                            "n roughly doubles (2×)",
                            "n roughly quadruples (4×)",
                            "n stays about the same"
                        ],
                        answer: 1,
                        feedback: `Correct! Just like margin of error, σ appears squared: n ∝ σ². Doubling variability quadruples sample size. This is why accurate variability estimates matter!`
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
            id: 'finite-population',
            title: "🏢 Step 8: Finite Population Correction",
            targetId: 'tut-inputs-section',
            content: `
                <p>When your population is finite and known, you can use a <strong>correction factor</strong> to reduce required sample size.</p>
                
                <p><strong>When to use it:</strong></p>
                <ul>
                    <li>Surveying a known customer list (e.g., 5,000 customers)</li>
                    <li>Sampling from a finite inventory or set of accounts</li>
                    <li>When n would be a large fraction of N</li>
                </ul>
                
                <p><strong>How it works:</strong></p>
                <ul>
                    <li>The formula adjusts n downward when sampling a large fraction of the population</li>
                    <li>If N is very large relative to n, the correction is minimal</li>
                    <li>Leave blank if population is effectively infinite (millions of potential customers)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Enter a finite population size (try 1,000) and see how "Finite-population adjusted n" compares to the base n.</p>
            `,
            getDynamicQuizzes: () => {
                const nEl = document.getElementById('metric-n');
                const nFpcEl = document.getElementById('metric-n-fpc');
                const n = nEl ? nEl.textContent.replace(/,/g, '') : null;
                const nFpc = nFpcEl ? nFpcEl.textContent.replace(/,/g, '') : null;
                
                if (!n || !nFpc || n === '—' || nFpc === '—') {
                    return [
                        {
                            question: "When is the finite population correction most useful?",
                            options: [
                                "When the population is millions of people",
                                "When the required sample is a large fraction of the known population",
                                "When you're comparing two groups"
                            ],
                            answer: 1,
                            feedback: "Correct! FPC matters when you're sampling a substantial portion of a finite population. If n/N is small (say, surveying 500 from 1,000,000), the correction barely changes anything."
                        }
                    ];
                }
                
                const nNum = parseInt(n);
                const nFpcNum = parseInt(nFpc);
                const reduction = ((1 - nFpcNum/nNum) * 100).toFixed(0);
                
                return [
                    {
                        question: `Base n=${n}, FPC-adjusted n=${nFpc}. This is roughly a ${reduction}% reduction. When would this matter most?`,
                        options: [
                            "When surveying a small email list where you'd sample most of them",
                            "When estimating preferences among all US consumers",
                            "When the adjusted n is larger than the base n"
                        ],
                        answer: 0,
                        feedback: `Correct! The ${reduction}% reduction saves resources when sampling from a limited population. For very large populations, the correction is negligible.`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const popInput = document.getElementById('population-size');
                if (popInput) popInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'charts',
            title: "📊 Step 9: Interpret the Charts",
            targetId: 'tut-charts-section',
            content: `
                <p>The charts show how sample size changes as you vary each parameter.</p>
                
                <p><strong>Chart 1 - Margin of Error:</strong></p>
                <ul>
                    <li>Shows the steep curve: tighter E → much larger n</li>
                    <li>Your current design is highlighted</li>
                </ul>
                
                <p><strong>Chart 2 - Variability:</strong></p>
                <ul>
                    <li>For proportions: shows how different p values affect n</li>
                    <li>For means: shows how different σ values affect n</li>
                </ul>
                
                <p><strong>Chart 3 - Confidence Level:</strong></p>
                <ul>
                    <li>Shows the cost of higher confidence</li>
                    <li>The jump from 95% to 99% is substantial</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Look at the Margin of Error chart. Note how the curve steepens as E gets smaller.</p>
            `,
            quizzes: [
                {
                    question: "What does the 'Required sample size vs. margin of error' chart tell you?",
                    options: [
                        "Larger margins of error are always better",
                        "Tight precision (small E) costs exponentially more in sample size",
                        "Sample size is independent of margin of error"
                    ],
                    answer: 1,
                    feedback: "Correct! The chart visualizes n ∝ 1/E². The steep curve near small E values shows why demanding very tight precision can make a study impractical."
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
                <p>The DESIGN SUMMARY provides your planning outputs.</p>
                
                <p><strong>Key metrics:</strong></p>
                <ul>
                    <li><strong>Required n:</strong> Sample size assuming infinite population</li>
                    <li><strong>Finite-population adjusted n:</strong> Reduced n if population is known</li>
                    <li><strong>Precision:</strong> Your margin of error displayed clearly</li>
                </ul>
                
                <p><strong>APA Statement:</strong> Formal description for reports.</p>
                
                <p><strong>Managerial Interpretation:</strong> Plain-language explanation.</p>
                
                <p><strong>Planning insight:</strong> Compare required n to your practical constraints—budget, time, available respondents—to see if the study is feasible.</p>
                
                <p class="task">👉 <strong>Task:</strong> Read both interpretations. How do they communicate the same result differently?</p>
            `,
            getDynamicQuizzes: () => {
                const nEl = document.getElementById('metric-n');
                const n = nEl ? nEl.textContent.replace(/,/g, '') : null;
                
                if (!n || n === '—') return null;
                
                const nNum = parseInt(n);
                const responseRate = 0.2;  // 20% response rate
                const invitesNeeded = Math.ceil(nNum / responseRate);
                
                return [
                    {
                        question: `With n=${n} needed and a typical 20% survey response rate, how many invites should you send?`,
                        options: [
                            `About ${nNum} invites`,
                            `About ${invitesNeeded.toLocaleString()} invites`,
                            `About ${Math.ceil(nNum * 0.2)} invites`
                        ],
                        answer: 1,
                        feedback: `Correct! With 20% response rate, you need ${n} ÷ 0.20 = ${invitesNeeded.toLocaleString()} invites to expect ${n} completed responses. Always account for non-response!`
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
                <p><strong>Congratulations!</strong> You've learned to plan sample sizes for estimation.</p>
                
                <h4>🔑 Key Takeaways</h4>
                <ol>
                    <li><strong>Precision is expensive:</strong> n ∝ 1/E² means tight precision costs exponentially more</li>
                    <li><strong>Variability matters:</strong> Higher σ or p near 0.5 → larger sample needed</li>
                    <li><strong>Confidence has a cost:</strong> 99% vs 95% confidence substantially increases n</li>
                    <li><strong>FPC can help:</strong> For finite populations, correction reduces required n</li>
                </ol>
                
                <h4>💼 Analyst's Perspective</h4>
                <p>In practice, sample size planning is a negotiation:</p>
                <ul>
                    <li>Start with the precision stakeholders want</li>
                    <li>Calculate the required n</li>
                    <li>If n is impractical, show them what precision IS achievable</li>
                    <li>Use the charts to explain tradeoffs visually</li>
                </ul>
                
                <p><strong>Pro tip:</strong> Always pad your target n for non-response and data quality issues. If you need 400 completes and expect 25% response rate, send to 1,600+ contacts.</p>
                
                <p class="task">👉 <strong>Tutorial complete!</strong> Use this tool to plan surveys, pilot studies, and any estimation-focused data collection.</p>
            `,
            quizzes: [
                {
                    question: "A stakeholder wants ±1% precision for a proportion. What should you do first?",
                    options: [
                        "Immediately calculate the sample size and commit to it",
                        "Show them the required n is likely very large, and discuss acceptable precision",
                        "Tell them ±1% is impossible"
                    ],
                    answer: 1,
                    feedback: "Correct! Very tight precision often requires impractically large samples. Use the Margin of Error chart to show the stakeholder the cost and negotiate a realistic precision target."
                }
            ],
            check: () => true
        }
    ],

    // ───────────────────────────────────────────────────────────────
    // LIFECYCLE METHODS
    // ───────────────────────────────────────────────────────────────

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

        // Log completion if user finished the tutorial
        if (this.currentStep === this.steps.length - 1) {
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend(
                    { action: 'tutorial_completed', tool: 'sample-size-calculator' },
                    'Professor Mode tutorial completed for Sample Size Calculator'
                );
            }
        }

        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    // ───────────────────────────────────────────────────────────────
    // NAVIGATION
    // ───────────────────────────────────────────────────────────────

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.currentHighlight = null;
            this.lastCheckResult = null;
            this.updateView();
        }
    },

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.currentHighlight = null;
            this.lastCheckResult = null;
            this.updateView();
        }
    },

    // ───────────────────────────────────────────────────────────────
    // VIEW RENDERING
    // ───────────────────────────────────────────────────────────────

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

        const totalSteps = this.steps.length;
        const progress = ((this.currentStep + 1) / totalSteps) * 100;

        // Build quiz HTML with inline onchange handlers
        let quizHtml = '';
        if (quizzes && quizzes.length > 0) {
            quizHtml = quizzes.map((quiz, qIndex) => {
                const isCompleted = step.quizState[qIndex].completed;
                return `
                    <div class="quiz-question ${isCompleted ? 'completed' : ''}" data-quiz-index="${qIndex}">
                        <p class="quiz-prompt">${this.getCheckmark(isCompleted)} ${quiz.question}</p>
                        <div class="quiz-options">
                            ${quiz.options.map((opt, oIndex) => `
                                <label class="quiz-option">
                                    <input type="radio" 
                                           name="quiz-${this.currentStep}-${qIndex}" 
                                           value="${oIndex}"
                                           onchange="SampleSizeCalculatorTutorial.checkQuiz(${qIndex}, ${oIndex})"
                                           ${isCompleted ? 'disabled' : ''}>
                                    <span>${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="quiz-feedback" style="display: ${isCompleted ? 'block' : 'none'};">${isCompleted ? quiz.feedback : ''}</div>
                    </div>
                `;
            }).join('');
        }

        // Check completion status
        const isTaskComplete = step.check ? step.check() : true;
        const areQuizzesComplete = !quizzes || quizzes.length === 0 || 
            (step.quizState && step.quizState.every(q => q.completed));
        const canProceed = isTaskComplete && areQuizzesComplete;

        sidebarContent.innerHTML = `
            <div class="step-header">
                <span class="step-counter">Step ${this.currentStep + 1} of ${totalSteps}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <h3>${step.title}</h3>
            
            <div class="step-content">
                ${step.content}
            </div>
            
            ${step.check ? `
                <div class="task-status ${isTaskComplete ? 'complete' : 'incomplete'}">
                    ${this.getCheckmark(isTaskComplete)} Task: ${isTaskComplete ? 'Complete!' : 'Complete the task above'}
                </div>
            ` : ''}
            
            ${quizHtml ? `
                <div class="quiz-section">
                    <h4>✅ Check Your Understanding</h4>
                    ${quizHtml}
                </div>
            ` : ''}
            
            <div class="sidebar-nav">
                <button onclick="SampleSizeCalculatorTutorial.prevStep()" ${this.currentStep === 0 ? 'disabled' : ''}>← Previous</button>
                <button onclick="SampleSizeCalculatorTutorial.nextStep()" class="primary" ${!canProceed || this.currentStep === totalSteps - 1 ? 'disabled' : ''}>Next →</button>
            </div>
            
            ${this.currentStep === totalSteps - 1 ? `
                <div class="tutorial-complete">
                    <p>🎉 You've completed the tutorial!</p>
                    <button onclick="SampleSizeCalculatorTutorial.stop()" class="primary">Finish</button>
                </div>
            ` : ''}
        `;

        this.highlightElement(step.targetId);
        if (step.onEnter) step.onEnter();
    },

    // ───────────────────────────────────────────────────────────────
    // QUIZ HANDLING
    // ───────────────────────────────────────────────────────────────

    checkQuiz(qIndex, selectedValue) {
        const step = this.steps[this.currentStep];
        const quizzes = step.currentQuizzes || step.quizzes || [];
        const quiz = quizzes[qIndex];
        if (!quiz) return;

        const isCorrect = selectedValue === quiz.answer;

        if (isCorrect) {
            step.quizState[qIndex].completed = true;
        }

        // Update the feedback display
        const feedbackEl = document.querySelectorAll('.quiz-feedback')[qIndex];
        if (feedbackEl) {
            feedbackEl.textContent = isCorrect ? quiz.feedback : `Not quite. Try again!`;
            feedbackEl.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
            feedbackEl.style.display = 'block';
        }

        // Style the options
        const options = document.querySelectorAll(`input[name="quiz-${this.currentStep}-${qIndex}"]`);
        options.forEach((opt, idx) => {
            const label = opt.closest('.quiz-option');
            label.classList.remove('correct', 'incorrect');
            if (isCorrect && idx === quiz.answer) {
                label.classList.add('correct');
            } else if (!isCorrect && idx === selectedValue) {
                label.classList.add('incorrect');
            }
        });

        // Re-render to update navigation buttons
        if (isCorrect) {
            this.updateView();
        }
    },

    getCheckmark(completed) {
        return completed 
            ? '<span class="checkmark complete">✓</span>' 
            : '<span class="checkmark incomplete">○</span>';
    },

    // ───────────────────────────────────────────────────────────────
    // PROGRESS CHECKING (polling)
    // ───────────────────────────────────────────────────────────────

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

    // ───────────────────────────────────────────────────────────────
    // HIGHLIGHTING & OVERLAY
    // ───────────────────────────────────────────────────────────────

    highlightElement(targetId) {
        // Clear previous highlight
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight.style.position = '';
            this.currentHighlight.style.zIndex = '';
        }

        if (!targetId) {
            this.hideOverlay();
            return;
        }

        const target = document.getElementById(targetId);
        if (target) {
            this.showOverlay();
            target.classList.add('tutorial-highlight');
            target.style.position = 'relative';
            target.style.zIndex = '1001';
            this.currentHighlight = target;
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
            this.currentHighlight.style.position = '';
            this.currentHighlight.style.zIndex = '';
            this.currentHighlight = null;
        }
    },

    // ───────────────────────────────────────────────────────────────
    // DYNAMIC ELEMENT CREATION
    // ───────────────────────────────────────────────────────────────

    renderSidebar() {
        if (document.getElementById('tutorial-sidebar')) return;
        const sidebar = document.createElement('div');
        sidebar.id = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>👨‍🏫 Professor Mode</h2>
                <button onclick="SampleSizeCalculatorTutorial.stop()" class="close-tutorial">×</button>
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
                if (e.target.checked) this.start();
                else this.stop();
            });
        }
        // Poll for task completion
        setInterval(() => this.checkProgress(), 500);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => SampleSizeCalculatorTutorial.init(), 500);
});
