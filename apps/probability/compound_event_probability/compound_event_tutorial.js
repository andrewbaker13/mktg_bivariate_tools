// Compound Event Probability Calculator Tutorial - Professor Mode Implementation

const CompoundEventTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to Compound Event Probability",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you how to calculate probabilities for <strong>repeated independent events</strong> using the binomial model.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>Understanding the binomial distribution</li>
                    <li>Configuring event probability and trials</li>
                    <li>Computing exact, "at least," and "at most" probabilities</li>
                    <li>When to use normal vs. Poisson approximations</li>
                    <li>Interpreting PMF and CDF charts</li>
                    <li>Translating probability into marketing decisions</li>
                </ol>
                
                <p><strong>Why this matters:</strong> Marketing is full of repeated trials—ad impressions, email sends, conversion attempts. The binomial model lets you predict how many successes you'll see and how variable those outcomes might be.</p>
            `,
            quizzes: [
                {
                    question: "What is a 'trial' in binomial probability?",
                    options: [
                        "A test run of the entire experiment",
                        "A single independent attempt with a binary outcome (success/failure)",
                        "The total number of successes observed"
                    ],
                    answer: 1,
                    feedback: "Correct! A trial is one independent event that can result in success or failure. Each email sent, each ad impression, or each die roll is a trial."
                }
            ],
            check: () => true
        },
        {
            id: 'binomial-model',
            title: "📚 Step 1: The Binomial Model",
            targetId: 'tut-overview-section',
            content: `
                <p>The binomial distribution models the number of successes in repeated independent trials.</p>
                
                <p><strong>Four requirements:</strong></p>
                <ol>
                    <li><strong>Fixed n trials:</strong> You know how many attempts in advance</li>
                    <li><strong>Binary outcomes:</strong> Each trial is success or failure</li>
                    <li><strong>Constant probability:</strong> Same p on every trial</li>
                    <li><strong>Independence:</strong> Trials don't affect each other</li>
                </ol>
                
                <p><strong>The formula:</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.9em;">
                    P(X = k) = C(n,k) × p<sup>k</sup> × (1-p)<sup>n-k</sup>
                </p>
                
                <p>Where C(n,k) = "n choose k" counts the ways to arrange k successes among n trials.</p>
                
                <p class="task">👉 <strong>Task:</strong> Read the OVERVIEW section. Expand the "Key concepts illustrated" dropdown to see how binomial logic applies to marketing.</p>
            `,
            quizzes: [
                {
                    question: "If you email 100 people and each has a 5% conversion rate, which parameter is p?",
                    options: [
                        "p = 100 (the number of emails)",
                        "p = 0.05 (the conversion probability)",
                        "p = 5 (the expected conversions)"
                    ],
                    answer: 1,
                    feedback: "Correct! p is the probability of success on a single trial. Here, p = 0.05 means each recipient has a 5% chance of converting."
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
                <p>The tool includes preset scenarios demonstrating real-world binomial problems.</p>
                
                <p><strong>Available scenarios:</strong></p>
                <ul>
                    <li><strong>Dice rolls:</strong> Classic probability exercise</li>
                    <li><strong>D20 criticals:</strong> Gaming session probabilities</li>
                    <li><strong>Email conversions:</strong> Marketing campaign analysis</li>
                    <li><strong>Quality control:</strong> Defect detection in production</li>
                    <li><strong>Ad clicks:</strong> Click-through rate forecasting</li>
                    <li><strong>Website signups:</strong> Conversion probability</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Use the dropdown to load "Email campaign: expected conversions." This sets up a realistic marketing question.</p>
            `,
            quizzes: [
                {
                    question: "Why is email conversion a good example of binomial distribution?",
                    options: [
                        "Because email lists are always exactly 1000 people",
                        "Because each email is an independent trial with binary outcome (convert or not)",
                        "Because email conversion rates are always 3%"
                    ],
                    answer: 1,
                    feedback: "Correct! Each email recipient's decision is typically independent of others, and the outcome is binary (convert or don't). This fits the binomial model perfectly."
                }
            ],
            check: () => {
                const select = document.getElementById('event-scenario-select');
                return select && select.value !== '';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'configure-inputs',
            title: "⚙️ Step 3: Configure Event Parameters",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's understand the four key inputs that define your binomial problem.</p>
                
                <p><strong>The parameters:</strong></p>
                <ul>
                    <li><strong>Event name:</strong> Descriptive label (e.g., "customer converts")</li>
                    <li><strong>Probability (p):</strong> Chance of success on one trial (0 to 1)</li>
                    <li><strong>Trials (n):</strong> Total number of independent attempts</li>
                    <li><strong>Target (k):</strong> The threshold you care about</li>
                </ul>
                
                <p><strong>Probability modes:</strong></p>
                <ul>
                    <li><strong>Exactly k:</strong> P(X = k) — precisely that many successes</li>
                    <li><strong>At least k:</strong> P(X ≥ k) — that many or more</li>
                    <li><strong>At most k:</strong> P(X ≤ k) — that many or fewer</li>
                    <li><strong>Between:</strong> P(k₁ ≤ X ≤ k₂) — a range of outcomes</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Try changing the "Probability mode" to see how the question changes. "At least" and "at most" are common in marketing planning.</p>
            `,
            getDynamicQuizzes: () => {
                const pInput = document.getElementById('event-probability-input');
                const nInput = document.getElementById('num-trials-input');
                const p = pInput ? parseFloat(pInput.value) : null;
                const n = nInput ? parseInt(nInput.value) : null;
                
                if (p === null || n === null || isNaN(p) || isNaN(n)) return null;
                
                const expected = n * p;
                
                return [
                    {
                        question: `With n=${n} trials and p=${p.toFixed(4)}, what is the expected number of successes E[X]?`,
                        options: [
                            `${(expected * 0.5).toFixed(1)}`,
                            `${expected.toFixed(1)}`,
                            `${(expected * 2).toFixed(1)}`
                        ],
                        answer: 1,
                        feedback: `Correct! E[X] = n × p = ${n} × ${p.toFixed(4)} = ${expected.toFixed(2)}. This is the average number of successes across many experiments.`
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
            id: 'approximations',
            title: "📊 Step 4: Understanding Approximations",
            targetId: 'tut-inputs-section',
            content: `
                <p>When n is large, exact binomial calculations can be slow. Two approximations help:</p>
                
                <p><strong>Normal approximation:</strong></p>
                <ul>
                    <li>Works when np ≥ 10 AND n(1-p) ≥ 10</li>
                    <li>Uses a bell curve with μ = np, σ = √(np(1-p))</li>
                    <li>Best for moderate p values (not too close to 0 or 1)</li>
                </ul>
                
                <p><strong>Poisson approximation:</strong></p>
                <ul>
                    <li>Works when n is large AND p is small (np < 10)</li>
                    <li>Uses λ = np as the single parameter</li>
                    <li>Best for rare events (low conversion rates, defects)</li>
                </ul>
                
                <p><strong>When to use exact:</strong></p>
                <ul>
                    <li>Always accurate, regardless of n and p</li>
                    <li>Modern tools handle large n efficiently</li>
                    <li>Use when precise probabilities matter</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Change the "Distribution mode" dropdown to compare exact binomial with normal and Poisson approximations.</p>
            `,
            quizzes: [
                {
                    question: "For n=5000 ad impressions with p=0.008 click rate, which approximation is most appropriate?",
                    options: [
                        "Normal approximation (because n is large)",
                        "Poisson approximation (because n is large and p is small, np=40)",
                        "Neither—must use exact binomial"
                    ],
                    answer: 1,
                    feedback: "Correct! With np = 40, both approximations work, but Poisson is historically preferred when p is very small (0.008). The normal also works since np > 10 and n(1-p) >> 10."
                }
            ],
            check: () => true
        },
        {
            id: 'run-simulations',
            title: "🎲 Step 5: Run Simulations",
            targetId: 'tut-inputs-section',
            content: `
                <p>Monte Carlo simulation validates theoretical probabilities by actually "running" the experiment many times.</p>
                
                <p><strong>The buttons:</strong></p>
                <ul>
                    <li><strong>Run one trial set:</strong> Perform n trials once, see one outcome</li>
                    <li><strong>Simulate many trial sets:</strong> Repeat the experiment thousands of times</li>
                    <li><strong>Clear history:</strong> Reset simulation data</li>
                </ul>
                
                <p><strong>Why simulate?</strong></p>
                <ul>
                    <li>Validates that formulas match reality</li>
                    <li>Shows natural variation in outcomes</li>
                    <li>Orange bars in charts show empirical distribution</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Click "Simulate many trial sets" and watch the orange bars appear in the PMF chart. They should closely match the blue theoretical bars.</p>
            `,
            quizzes: [
                {
                    question: "Why do simulated probabilities sometimes differ slightly from theoretical ones?",
                    options: [
                        "The theoretical formulas are wrong",
                        "Random sampling variation—more simulations = closer match",
                        "The tool has calculation errors"
                    ],
                    answer: 1,
                    feedback: "Correct! With finite simulations, you'll see random variation. As you increase the number of simulations, the empirical distribution converges to the theoretical one."
                }
            ],
            check: () => {
                const simProbEl = document.getElementById('metric-sim-prob');
                return simProbEl && simProbEl.textContent !== '—';
            },
            onEnter: () => {
                const section = document.getElementById('tut-inputs-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'read-pmf',
            title: "📈 Step 6: Reading the PMF Chart",
            targetId: 'tut-visual-section',
            content: `
                <p>The PMF (Probability Mass Function) shows the probability of each specific outcome.</p>
                
                <p><strong>Chart elements:</strong></p>
                <ul>
                    <li><strong>X-axis:</strong> Number of successes (k = 0, 1, 2, ...)</li>
                    <li><strong>Y-axis:</strong> Probability P(X = k)</li>
                    <li><strong>Blue bars:</strong> Theoretical probabilities</li>
                    <li><strong>Orange bars:</strong> Simulated frequencies</li>
                    <li><strong>Highlighted region:</strong> Matches your probability mode</li>
                </ul>
                
                <p><strong>What to look for:</strong></p>
                <ul>
                    <li><strong>Peak location:</strong> Near E[X] = np (the expected value)</li>
                    <li><strong>Spread:</strong> Wider spread = more variability</li>
                    <li><strong>Skewness:</strong> Right-skewed when p is small, left-skewed when p is large</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Look at the PMF chart. Find where the peak is and compare it to E[X] shown in the metrics panel.</p>
            `,
            getDynamicQuizzes: () => {
                const nInput = document.getElementById('num-trials-input');
                const pInput = document.getElementById('event-probability-input');
                const n = nInput ? parseInt(nInput.value) : null;
                const p = pInput ? parseFloat(pInput.value) : null;
                
                if (n === null || p === null || isNaN(n) || isNaN(p)) return null;
                
                const stdDev = Math.sqrt(n * p * (1 - p));
                
                return [
                    {
                        question: `With σ = ${stdDev.toFixed(2)}, roughly what range of outcomes are 'typical' (within ±2 standard deviations)?`,
                        options: [
                            `About ${Math.round(n * p - stdDev)} to ${Math.round(n * p + stdDev)}`,
                            `About ${Math.round(n * p - 2 * stdDev)} to ${Math.round(n * p + 2 * stdDev)}`,
                            `About ${Math.round(n * p - 3 * stdDev)} to ${Math.round(n * p + 3 * stdDev)}`
                        ],
                        answer: 1,
                        feedback: `Correct! About 95% of outcomes fall within ±2 standard deviations of the mean. This gives you a practical range for what to expect.`
                    }
                ];
            },
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'read-cdf',
            title: "📉 Step 7: Reading the CDF Chart",
            targetId: 'tut-visual-section',
            content: `
                <p>The CDF (Cumulative Distribution Function) shows P(X ≤ k)—the probability of k or fewer successes.</p>
                
                <p><strong>How to use it:</strong></p>
                <ul>
                    <li><strong>At most k:</strong> Read directly from CDF at k</li>
                    <li><strong>At least k:</strong> Calculate 1 - CDF(k-1)</li>
                    <li><strong>Between k₁ and k₂:</strong> CDF(k₂) - CDF(k₁-1)</li>
                </ul>
                
                <p><strong>Visual features:</strong></p>
                <ul>
                    <li><strong>S-shaped curve:</strong> Starts near 0, rises to 1</li>
                    <li><strong>Steep part:</strong> Where most probability is concentrated</li>
                    <li><strong>50% point:</strong> The median outcome</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Find where the CDF crosses 0.5 (50%). This is the median—half of simulated outcomes will be below this value.</p>
            `,
            quizzes: [
                {
                    question: "If CDF(10) = 0.85, what is P(X ≥ 11)?",
                    options: [
                        "0.85",
                        "0.15 (calculated as 1 - 0.85)",
                        "0.10"
                    ],
                    answer: 1,
                    feedback: "Correct! P(X ≥ 11) = 1 - P(X ≤ 10) = 1 - 0.85 = 0.15. The complement rule is key for 'at least' questions."
                }
            ],
            check: () => true
        },
        {
            id: 'interpret-results',
            title: "📝 Step 8: Interpret the Results",
            targetId: 'tut-results-section',
            content: `
                <p>The MATH DETAILS section provides formal statistical reporting and business interpretation.</p>
                
                <p><strong>Key metrics:</strong></p>
                <ul>
                    <li><strong>Target probability:</strong> Theoretical answer to your question</li>
                    <li><strong>Simulated probability:</strong> Empirical validation</li>
                    <li><strong>E[X] = np:</strong> Expected (average) number of successes</li>
                    <li><strong>σ = √(np(1-p)):</strong> Standard deviation of outcomes</li>
                </ul>
                
                <p><strong>Reporting panels:</strong></p>
                <ul>
                    <li><strong>APA-Style:</strong> Formal academic format</li>
                    <li><strong>Managerial:</strong> Business-focused interpretation</li>
                    <li><strong>Equations:</strong> General formulas and worked examples</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Scroll to the results section. Read the "Managerial Interpretation" to see how statistics translate to business language.</p>
            `,
            getDynamicQuizzes: () => {
                const targetProbEl = document.getElementById('metric-target-prob');
                const expectedEl = document.getElementById('metric-expected-x');
                const prob = targetProbEl ? parseFloat(targetProbEl.textContent) : null;
                const expected = expectedEl ? parseFloat(expectedEl.textContent) : null;
                
                if (prob === null || isNaN(prob) || expected === null || isNaN(expected)) return null;
                
                const pct = (prob * 100).toFixed(1);
                
                return [
                    {
                        question: `The target probability is ${pct}%. How would you describe this to a marketing manager?`,
                        options: [
                            `"There's a ${pct}% statistical significance level"`,
                            `"We have about a ${pct}% chance of seeing our target outcome"`,
                            `"The p-value is ${pct}%"`
                        ],
                        answer: 1,
                        feedback: `Correct! In plain language, this probability tells you the likelihood of your target outcome occurring. A ${pct}% chance is directly interpretable for planning purposes.`
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
            id: 'distribution-table',
            title: "📊 Step 9: The Distribution Table",
            targetId: 'tut-results-section',
            content: `
                <p>The complete probability distribution table shows all possible outcomes.</p>
                
                <p><strong>Table columns:</strong></p>
                <ul>
                    <li><strong>k:</strong> Number of successes</li>
                    <li><strong>Theoretical P(X=k):</strong> Exact probability from formula</li>
                    <li><strong>Simulated frequency:</strong> How many simulations hit this k</li>
                    <li><strong>Simulated P(X=k):</strong> Empirical probability</li>
                    <li><strong>Cumulative P(X≤k):</strong> Running total for "at most" questions</li>
                </ul>
                
                <p><strong>Using the table:</strong></p>
                <ul>
                    <li>Find specific probabilities for any k</li>
                    <li>Identify the mode (highest probability)</li>
                    <li>Calculate range probabilities by summing rows</li>
                    <li>Verify simulation matches theory</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Find the row with the highest theoretical probability. This is the mode—the single most likely outcome.</p>
            `,
            quizzes: [
                {
                    question: "If the theoretical and simulated probabilities differ significantly, what should you do?",
                    options: [
                        "Trust the simulation—it's real data",
                        "Run more simulations to reduce sampling error",
                        "Change the theoretical formula"
                    ],
                    answer: 1,
                    feedback: "Correct! Small differences are normal due to random variation. Running more simulations (e.g., 5000+) will make the empirical distribution converge to the theoretical one."
                }
            ],
            check: () => true
        },
        {
            id: 'conclusion',
            title: "🎓 Tutorial Complete!",
            targetId: 'tut-overview-section',
            content: `
                <p><strong>Congratulations!</strong> You've learned how to use the Compound Event Probability Calculator.</p>
                
                <h4>📋 Summary</h4>
                <ul>
                    <li>✅ The binomial model handles repeated independent trials</li>
                    <li>✅ Configure p (probability), n (trials), and k (target)</li>
                    <li>✅ Choose exact, normal, or Poisson distributions</li>
                    <li>✅ PMF shows individual probabilities; CDF shows cumulative</li>
                    <li>✅ Simulations validate theoretical results</li>
                    <li>✅ E[X] = np gives the expected outcome</li>
                </ul>
                
                <h4>🎯 Analyst's Perspective</h4>
                <p>When presenting binomial analyses to stakeholders:</p>
                <ul>
                    <li><strong>Frame the question clearly:</strong> "What's the chance of at least X conversions?"</li>
                    <li><strong>Report expected value:</strong> "On average, we expect 30 conversions"</li>
                    <li><strong>Give a range:</strong> "Most campaigns will see between 20-40 conversions"</li>
                    <li><strong>Quantify risk:</strong> "There's only a 5% chance of fewer than 15"</li>
                </ul>
                
                <p>Toggle Professor Mode off when you're ready to analyze your own data!</p>
            `,
            quizzes: [
                {
                    question: "A marketing manager asks: 'What's the chance our 100-email campaign gets at least 10 responses with a 5% response rate?' Which calculation do they need?",
                    options: [
                        "P(X = 10) with n=100, p=0.05",
                        "P(X ≥ 10) with n=100, p=0.05",
                        "P(X ≤ 10) with n=100, p=0.05"
                    ],
                    answer: 1,
                    feedback: "Correct! 'At least 10' means P(X ≥ 10). Set the probability mode to 'At least k' and target k=10. The expected value is E[X] = 100 × 0.05 = 5, so 10+ is above average."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    ],

    // Core tutorial methods
    start() {
        this.isActive = true;
        this.currentStep = 0;
        document.getElementById('tutorial-sidebar').classList.add('active');
        document.body.classList.add('tutorial-active');
        this.showStep(0);
    },

    stop() {
        this.isActive = false;
        this.clearHighlight();
        document.getElementById('tutorial-sidebar').classList.remove('active');
        document.body.classList.remove('tutorial-active');
    },

    showStep(index) {
        if (index < 0 || index >= this.steps.length) return;
        this.currentStep = index;
        const step = this.steps[index];

        document.getElementById('tutorial-step-title').textContent = step.title;
        
        let content = step.content;

        // Get quizzes (static or dynamic)
        let quizzes = step.quizzes || [];
        if (typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes) {
                step.currentQuizzes = dynamicQuizzes;
                quizzes = dynamicQuizzes;
            } else if (step.quizzes) {
                step.currentQuizzes = step.quizzes;
                quizzes = step.quizzes;
            }
        } else {
            step.currentQuizzes = quizzes;
        }

        // Add quiz HTML if quizzes exist
        if (quizzes && quizzes.length > 0) {
            content += '<div class="tutorial-quiz">';
            quizzes.forEach((quiz, qIndex) => {
                content += `
                    <div class="quiz-question" data-quiz-index="${qIndex}">
                        <p><strong>🧠 Knowledge Check:</strong> ${quiz.question}</p>
                        <div class="quiz-options">
                            ${quiz.options.map((opt, oIndex) => `
                                <label class="quiz-option">
                                    <input type="radio" name="quiz-${index}-${qIndex}" value="${oIndex}">
                                    <span>${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="quiz-feedback" style="display: none;"></div>
                    </div>
                `;
            });
            content += '</div>';
        }
        
        document.getElementById('tutorial-step-content').innerHTML = content;

        // Set up quiz interactivity
        if (quizzes && quizzes.length > 0) {
            quizzes.forEach((quiz, qIndex) => {
                const options = document.querySelectorAll(`input[name="quiz-${index}-${qIndex}"]`);
                options.forEach(option => {
                    option.addEventListener('change', (e) => {
                        const selected = parseInt(e.target.value);
                        const feedbackEl = e.target.closest('.quiz-question').querySelector('.quiz-feedback');
                        const isCorrect = selected === quiz.answer;
                        
                        feedbackEl.innerHTML = isCorrect 
                            ? `<span class="correct">✅ ${quiz.feedback}</span>`
                            : `<span class="incorrect">❌ Not quite. ${quiz.feedback}</span>`;
                        feedbackEl.style.display = 'block';
                        
                        // Disable further changes
                        options.forEach(opt => opt.disabled = true);
                    });
                });
            });
        }

        // Update progress
        document.getElementById('tutorial-progress-current').textContent = index + 1;
        document.getElementById('tutorial-progress-total').textContent = this.steps.length;
        document.getElementById('tutorial-progress-fill').style.width = 
            `${((index + 1) / this.steps.length) * 100}%`;

        // Update button states
        document.getElementById('tutorial-prev-btn').disabled = index === 0;
        const nextBtn = document.getElementById('tutorial-next-btn');
        nextBtn.textContent = index === this.steps.length - 1 ? 'Finish' : 'Next →';

        // Highlight target element
        this.highlightElement(step.targetId);

        // Execute onEnter callback
        if (typeof step.onEnter === 'function') {
            step.onEnter();
        }
    },

    nextStep() {
        const currentStep = this.steps[this.currentStep];
        
        // Check completion criteria
        if (typeof currentStep.check === 'function' && !currentStep.check()) {
            const content = document.getElementById('tutorial-step-content');
            if (!content.querySelector('.step-incomplete-warning')) {
                const warning = document.createElement('p');
                warning.className = 'step-incomplete-warning';
                warning.innerHTML = '<strong>⚠️ Complete the task above before continuing.</strong>';
                warning.style.cssText = 'color: #f59e0b; margin-top: 1rem; padding: 0.5rem; background: #fef3c7; border-radius: 4px;';
                content.appendChild(warning);
            }
            return;
        }

        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.stop();
            document.getElementById('professorMode').checked = false;
        }
    },

    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    },

    highlightElement(elementId) {
        this.clearHighlight();
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('tutorial-highlight');
            this.currentHighlight = element;
        }
    },

    clearHighlight() {
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight = null;
        }
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    }
};

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Professor Mode toggle
    const toggle = document.getElementById('professorMode');
    if (toggle) {
        toggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                CompoundEventTutorial.start();
            } else {
                CompoundEventTutorial.stop();
            }
        });
    }

    // Navigation buttons
    const prevBtn = document.getElementById('tutorial-prev-btn');
    const nextBtn = document.getElementById('tutorial-next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => CompoundEventTutorial.prevStep());
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => CompoundEventTutorial.nextStep());
    }

    // Close button
    const closeBtn = document.getElementById('tutorial-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            CompoundEventTutorial.stop();
            document.getElementById('professorMode').checked = false;
        });
    }
});
