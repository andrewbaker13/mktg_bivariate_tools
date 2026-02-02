// Selection Probability Lab Tutorial - Professor Mode Implementation

const SelectionProbabilityTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to Selection Probability Lab",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you how to calculate <strong>selection probabilities</strong> when sampling from finite populations.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>Hypergeometric vs. binomial sampling models</li>
                    <li>Configuring population, sample, and special items</li>
                    <li>Computing exact and "at least one" probabilities</li>
                    <li>Visualizing the population and distribution</li>
                    <li>Running Monte Carlo simulations</li>
                    <li>Interpreting selection probabilities for marketing</li>
                </ol>
                
                <p><strong>Why this matters:</strong> When you sample customers for a survey, select accounts for an audit, or draw items for quality control, you're dealing with selection probability—the chance of capturing specific items in your sample.</p>
            `,
            quizzes: [
                {
                    question: "What is a 'selection probability'?",
                    options: [
                        "The chance that a specific item or set of items appears in your sample",
                        "The probability that you decide to run a study",
                        "The confidence level of your analysis"
                    ],
                    answer: 0,
                    feedback: "Correct! Selection probability measures the likelihood that certain 'special' items (VIPs, defects, high-value leads) end up in your sample."
                }
            ],
            check: () => true
        },
        {
            id: 'sampling-models',
            title: "📚 Step 1: Two Sampling Models",
            targetId: 'tut-overview-section',
            content: `
                <p>The tool supports two fundamentally different sampling approaches:</p>
                
                <p><strong>Without Replacement (Hypergeometric):</strong></p>
                <ul>
                    <li>Each item can only be selected once</li>
                    <li>Sample size ≤ population size</li>
                    <li>Probability changes with each draw</li>
                    <li>Use for: surveys, quality audits, panel selection</li>
                </ul>
                
                <p><strong>With Replacement (Binomial):</strong></p>
                <ul>
                    <li>Same item can be selected multiple times</li>
                    <li>Probability stays constant each draw</li>
                    <li>Models independent trials</li>
                    <li>Use for: ad impressions, repeated contacts</li>
                </ul>
                
                <p><strong>The key formula (hypergeometric):</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.9em;">
                    P(K = k) = C(r,k) × C(N-r,n-k) / C(N,n)
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Read the OVERVIEW section and expand the "Key ideas illustrated" dropdown.</p>
            `,
            quizzes: [
                {
                    question: "You're mailing a survey to 50 customers from a list of 500. Same person can't be mailed twice. Which model applies?",
                    options: [
                        "With replacement (binomial)",
                        "Without replacement (hypergeometric)",
                        "Neither—this isn't a probability problem"
                    ],
                    answer: 1,
                    feedback: "Correct! When each customer can only appear once in your sample, you're sampling without replacement. The hypergeometric distribution models this."
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
                <p>The tool includes preset scenarios demonstrating real selection problems.</p>
                
                <p><strong>Available scenarios:</strong></p>
                <ul>
                    <li><strong>VIP Panel:</strong> Chance of including VIP customers in a survey sample</li>
                    <li><strong>Lead Ads:</strong> Probability of reaching high-value prospects</li>
                    <li><strong>QC Defects:</strong> Finding defective items in a quality check</li>
                    <li><strong>Player Home Runs:</strong> Projecting rare events in upcoming trials</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Use the dropdown to load "VIP customers in a loyalty survey sample." This is a classic without-replacement selection problem.</p>
            `,
            quizzes: [
                {
                    question: "Why is the VIP survey scenario a good example of hypergeometric selection?",
                    options: [
                        "Because VIP customers are more valuable",
                        "Because each member can only be surveyed once, and there's a finite population",
                        "Because the response rate is unknown"
                    ],
                    answer: 1,
                    feedback: "Correct! With a fixed panel of N members and sampling n without replacement, the hypergeometric model captures exactly how many VIPs might end up in your sample."
                }
            ],
            check: () => {
                const select = document.getElementById('selection-scenario-select');
                return select && select.value !== '';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'configure-inputs',
            title: "⚙️ Step 3: Configure Selection Parameters",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's understand the key parameters that define your selection problem.</p>
                
                <p><strong>Population parameters:</strong></p>
                <ul>
                    <li><strong>Label:</strong> Name the outcome you care about (e.g., "is a VIP")</li>
                    <li><strong>N (population):</strong> Total items in the pool</li>
                    <li><strong>r (specials):</strong> How many have the outcome of interest</li>
                </ul>
                
                <p><strong>Sample parameters:</strong></p>
                <ul>
                    <li><strong>n (sample size):</strong> How many items you'll draw</li>
                    <li><strong>k (target count):</strong> The specific count for P(K = k)</li>
                </ul>
                
                <p><strong>Probability modes:</strong></p>
                <ul>
                    <li><strong>Exact P(K = k):</strong> Exactly that many specials in sample</li>
                    <li><strong>At least one P(K ≥ 1):</strong> Any specials captured</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Experiment with changing N, n, and r. Watch how the probability changes as you adjust these parameters.</p>
            `,
            getDynamicQuizzes: () => {
                const NInput = document.getElementById('population-size-input');
                const nInput = document.getElementById('sample-size-input');
                const rInput = document.getElementById('special-count-input');
                
                const N = NInput ? parseInt(NInput.value) : null;
                const n = nInput ? parseInt(nInput.value) : null;
                const r = rInput ? parseInt(rInput.value) : null;
                
                if (N === null || n === null || r === null || isNaN(N) || isNaN(n) || isNaN(r)) return null;
                
                const expected = n * (r / N);
                
                return [
                    {
                        question: `With N=${N}, n=${n}, r=${r}, what is the expected number of specials E[K]?`,
                        options: [
                            `${(expected * 0.5).toFixed(2)}`,
                            `${expected.toFixed(2)}`,
                            `${(expected * 2).toFixed(2)}`
                        ],
                        answer: 1,
                        feedback: `Correct! E[K] = n × (r/N) = ${n} × (${r}/${N}) = ${expected.toFixed(2)}. This is the average number of specials you'd see across many samples.`
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
            id: 'at-least-one',
            title: "🎲 Step 4: The 'At Least One' Question",
            targetId: 'tut-inputs-section',
            content: `
                <p>The most common selection question is: "Will I capture at least one special item?"</p>
                
                <p><strong>The complement rule:</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace;">
                    P(K ≥ 1) = 1 - P(K = 0)
                </p>
                
                <p>It's easier to compute "missing all specials" and subtract from 1.</p>
                
                <p><strong>Without replacement formula for P(K = 0):</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.85em;">
                    P(K = 0) = C(N-r, n) / C(N, n)
                </p>
                
                <p><strong>Marketing interpretation:</strong></p>
                <ul>
                    <li>"What's the chance our survey includes at least one VIP?"</li>
                    <li>"What's the probability our QC check finds any defects?"</li>
                    <li>"Will our sample contain any high-value leads?"</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Change the "Probability of interest" dropdown to "At least one." Watch how the calculated probability changes.</p>
            `,
            quizzes: [
                {
                    question: "If P(K = 0) = 0.30, what is P(K ≥ 1)?",
                    options: [
                        "0.30",
                        "0.70 (calculated as 1 - 0.30)",
                        "0.15"
                    ],
                    answer: 1,
                    feedback: "Correct! P(at least one) = 1 - P(none) = 1 - 0.30 = 0.70. There's a 70% chance of capturing at least one special item."
                }
            ],
            check: () => true
        },
        {
            id: 'sampling-mode',
            title: "🔄 Step 5: Sampling With vs. Without Replacement",
            targetId: 'tut-inputs-section',
            content: `
                <p>The sampling mode fundamentally changes the probability model.</p>
                
                <p><strong>Without replacement (hypergeometric):</strong></p>
                <ul>
                    <li>Used when n ≤ N and each item drawn once</li>
                    <li>Probabilities depend on remaining pool</li>
                    <li>Formula uses combinatorics (n choose k)</li>
                    <li>Example: Survey panel, quality inspection</li>
                </ul>
                
                <p><strong>With replacement (binomial):</strong></p>
                <ul>
                    <li>Each draw is independent with p = r/N</li>
                    <li>Same item can appear multiple times</li>
                    <li>Uses binomial formula with constant p</li>
                    <li>Example: Ad impressions, repeated contacts</li>
                </ul>
                
                <p><strong>Key insight:</strong> When N is much larger than n, both models give similar results. The difference matters most for small populations or large samples.</p>
                
                <p class="task">👉 <strong>Task:</strong> Toggle between "Without replacement" and "With replacement" and observe how probabilities change.</p>
            `,
            quizzes: [
                {
                    question: "You're showing 50 ad impressions to a pool of 100 users. Same user might see multiple ads. Which model?",
                    options: [
                        "Without replacement (hypergeometric)",
                        "With replacement (binomial)",
                        "Depends on the ad platform"
                    ],
                    answer: 1,
                    feedback: "Correct! Since the same user can see your ad multiple times, this is sampling with replacement. Each impression is an independent trial with p = r/N chance of hitting a special user."
                }
            ],
            check: () => true
        },
        {
            id: 'run-simulations',
            title: "🧪 Step 6: Run Simulations",
            targetId: 'tut-inputs-section',
            content: `
                <p>Monte Carlo simulation validates theoretical probabilities by actually drawing samples many times.</p>
                
                <p><strong>The buttons:</strong></p>
                <ul>
                    <li><strong>Draw one sample:</strong> See a single sample outcome</li>
                    <li><strong>Simulate many samples:</strong> Repeat thousands of times</li>
                    <li><strong>Clear history:</strong> Reset simulation data</li>
                </ul>
                
                <p><strong>What to observe:</strong></p>
                <ul>
                    <li>Population grid shows which items are selected</li>
                    <li>Orange bars show empirical distribution</li>
                    <li>Simulated probability should approach theoretical</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Click "Simulate many samples" and watch the orange bars build up in the distribution chart.</p>
            `,
            quizzes: [
                {
                    question: "After 2000 simulations, the simulated P(K≥1) is 0.89 vs. theoretical 0.90. Is this concerning?",
                    options: [
                        "Yes—there's a 1% error which is too large",
                        "No—small differences are normal due to random sampling variation",
                        "Yes—the simulation must be broken"
                    ],
                    answer: 1,
                    feedback: "Correct! A 1% difference with 2000 simulations is completely normal random variation. Running more simulations would bring the empirical closer to theoretical."
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
            id: 'read-grid',
            title: "📊 Step 7: Reading the Population Grid",
            targetId: 'tut-visual-section',
            content: `
                <p>The population grid provides a visual representation of your sampling problem.</p>
                
                <p><strong>Grid elements:</strong></p>
                <ul>
                    <li><strong>Highlighted cells:</strong> Special items (your outcome of interest)</li>
                    <li><strong>Outlined cells:</strong> Items in the current sample</li>
                    <li><strong>Numbers:</strong> Item IDs (1 through N)</li>
                    <li><strong>Badges (×2, ×3):</strong> Multiple selections (with replacement)</li>
                </ul>
                
                <p><strong>What to look for:</strong></p>
                <ul>
                    <li>Are any highlighted items also outlined? (Specials captured)</li>
                    <li>How spread out is the sample across the grid?</li>
                    <li>In with-replacement mode, do you see any repeat badges?</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Draw a single sample and count how many highlighted (special) items are also outlined (sampled).</p>
            `,
            getDynamicQuizzes: () => {
                const summaryEl = document.getElementById('population-summary');
                if (!summaryEl) return null;
                
                const text = summaryEl.textContent;
                const nMatch = text.match(/N = (\d+)/);
                const rMatch = text.match(/r = (\d+)/);
                
                if (!nMatch || !rMatch) return null;
                
                const N = parseInt(nMatch[1]);
                const r = parseInt(rMatch[1]);
                const pct = ((r / N) * 100).toFixed(1);
                
                return [
                    {
                        question: `With r=${r} specials in a population of N=${N}, what percentage are special?`,
                        options: [
                            `${(parseFloat(pct) * 0.5).toFixed(1)}%`,
                            `${pct}%`,
                            `${(parseFloat(pct) * 2).toFixed(1)}%`
                        ],
                        answer: 1,
                        feedback: `Correct! ${r}/${N} = ${pct}%. This is also the probability of selecting a special item on any single random draw.`
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
            id: 'read-distribution',
            title: "📉 Step 8: Reading the Distribution Chart",
            targetId: 'tut-visual-section',
            content: `
                <p>The distribution chart compares theoretical and simulated probabilities.</p>
                
                <p><strong>Chart elements:</strong></p>
                <ul>
                    <li><strong>X-axis:</strong> k = number of specials in sample (0, 1, 2, ...)</li>
                    <li><strong>Y-axis:</strong> Probability P(K = k)</li>
                    <li><strong>Blue bars:</strong> Theoretical (hypergeometric/binomial)</li>
                    <li><strong>Orange bars:</strong> Simulated empirical distribution</li>
                </ul>
                
                <p><strong>Interpreting the shape:</strong></p>
                <ul>
                    <li><strong>Peak at k=0:</strong> Most samples miss all specials</li>
                    <li><strong>Peak at k>0:</strong> Likely to capture some specials</li>
                    <li><strong>Wide distribution:</strong> High variability in outcomes</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Find the most likely value of K (highest bar). Is it 0, 1, 2, or higher?</p>
            `,
            quizzes: [
                {
                    question: "If the distribution peaks at k=0, what does this mean for your sampling plan?",
                    options: [
                        "Your sample is guaranteed to find specials",
                        "Most samples will NOT contain any specials—consider larger sample size",
                        "The population has no special items"
                    ],
                    answer: 1,
                    feedback: "Correct! A peak at k=0 means the most common outcome is 'no specials found.' If capturing specials is important, you may need to increase sample size n or the proportion of specials."
                }
            ],
            check: () => true
        },
        {
            id: 'interpret-results',
            title: "📝 Step 9: Interpret the Math Details",
            targetId: 'tut-results-section',
            content: `
                <p>The MATH DETAILS section shows exact formulas and worked calculations.</p>
                
                <p><strong>Key metrics:</strong></p>
                <ul>
                    <li><strong>Exact probability:</strong> Theoretical answer from the formula</li>
                    <li><strong>Simulated probability:</strong> Empirical validation</li>
                    <li><strong>E[K]:</strong> Expected number of specials in sample</li>
                </ul>
                
                <p><strong>Equations panels:</strong></p>
                <ul>
                    <li><strong>General equations:</strong> The formulas with parameters</li>
                    <li><strong>Worked examples:</strong> Your specific numbers substituted in</li>
                </ul>
                
                <p><strong>Distribution table:</strong></p>
                <ul>
                    <li>Complete probability for each possible k</li>
                    <li>Compare theoretical vs. simulated</li>
                    <li>Cumulative probabilities for "at most" questions</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Scroll to the results section. Expand "Understanding the C(n,k) notation" to learn about combinatorics.</p>
            `,
            getDynamicQuizzes: () => {
                const exactEl = document.getElementById('metric-exact-prob');
                const expectedEl = document.getElementById('metric-expected-k');
                
                const prob = exactEl ? parseFloat(exactEl.textContent) : null;
                const expected = expectedEl ? parseFloat(expectedEl.textContent) : null;
                
                if (prob === null || isNaN(prob) || expected === null || isNaN(expected)) return null;
                
                const pct = (prob * 100).toFixed(1);
                
                return [
                    {
                        question: `The exact probability is ${pct}% with E[K] = ${expected.toFixed(2)}. How would you explain this to a manager?`,
                        options: [
                            `"The significance level is ${pct}%"`,
                            `"There's a ${pct}% chance of our target outcome, and on average we'd capture ${expected.toFixed(1)} special items"`,
                            `"We need ${pct}% more data"`
                        ],
                        answer: 1,
                        feedback: `Correct! Clear business communication: '${pct}% chance of the target' and 'expect about ${expected.toFixed(1)} specials on average' are directly actionable.`
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
            title: "🎓 Tutorial Complete!",
            targetId: 'tut-overview-section',
            content: `
                <p><strong>Congratulations!</strong> You've learned how to use the Selection Probability Lab.</p>
                
                <h4>📋 Summary</h4>
                <ul>
                    <li>✅ Hypergeometric (without replacement) vs. Binomial (with replacement)</li>
                    <li>✅ Configure N (population), n (sample), r (specials), k (target)</li>
                    <li>✅ "At least one" uses complement rule: 1 - P(K=0)</li>
                    <li>✅ Population grid visualizes selections</li>
                    <li>✅ Distribution chart compares theory vs. simulation</li>
                    <li>✅ E[K] = n × (r/N) is the expected count</li>
                </ul>
                
                <h4>🎯 Analyst's Perspective</h4>
                <p>When planning samples or reporting selection probabilities:</p>
                <ul>
                    <li><strong>Frame the question:</strong> "What's the chance of capturing at least one VIP?"</li>
                    <li><strong>Report coverage:</strong> "Our sample has a 92% chance of including at least one high-value customer"</li>
                    <li><strong>Size recommendations:</strong> "To guarantee 95% probability of finding a defect, we need n ≥ X"</li>
                    <li><strong>Risk assessment:</strong> "There's an 8% chance this QC sample misses all defects"</li>
                </ul>
                
                <p>Toggle Professor Mode off when you're ready to analyze your own selection problems!</p>
            `,
            quizzes: [
                {
                    question: "A manager says: 'We have 1000 customers, 50 are VIPs. If we survey 100, what's the chance we get at least one VIP?' What do you set up?",
                    options: [
                        "N=1000, n=100, r=50, without replacement, 'At least one' mode",
                        "N=100, n=50, r=1000, with replacement",
                        "N=50, n=100, r=1000, without replacement"
                    ],
                    answer: 0,
                    feedback: "Correct! N=1000 (population), r=50 (VIPs), n=100 (sample size), without replacement (each customer surveyed once), and 'At least one' probability mode."
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
                SelectionProbabilityTutorial.start();
            } else {
                SelectionProbabilityTutorial.stop();
            }
        });
    }

    // Navigation buttons
    const prevBtn = document.getElementById('tutorial-prev-btn');
    const nextBtn = document.getElementById('tutorial-next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => SelectionProbabilityTutorial.prevStep());
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => SelectionProbabilityTutorial.nextStep());
    }

    // Close button
    const closeBtn = document.getElementById('tutorial-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            SelectionProbabilityTutorial.stop();
            document.getElementById('professorMode').checked = false;
        });
    }
});
