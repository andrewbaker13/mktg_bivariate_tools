/**
 * markov_tutorial.js
 * Professor Mode Tutorial for Markov Chain Attribution Visualizer
 * Following established pattern from Shapley tutorial
 */

const MarkovTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,
    
    // Define steps
    steps: [
        {
            id: 'intro',
            title: "Concept: The Removal Effect",
            targetId: 'tut-concept-section',
            content: `
                <p>Welcome to the <strong>Markov Chain Attribution Lab</strong>. Unlike Shapley (which ignores order), Markov Chains treat marketing as a <em>Sequential Network</em>.</p>
                <p class="task">👉 <strong>Task:</strong> Read the "Concept: The Removal Effect" section, including the Problem/Solution, Case Study, and the Technical Explanation dropdown.</p>
            `,
            quizzes: [
                {
                    question: "What makes Markov different from Shapley?",
                    options: [
                        "Markov cares about the SEQUENCE of touchpoints, Shapley only cares about presence.",
                        "Markov is simpler to calculate.",
                        "Markov ignores conversion rates."
                    ],
                    answer: 0,
                    feedback: "Correct! Markov models the journey as a network where order matters."
                },
                {
                    question: "What is the 'Memoryless Property' of a Markov Chain?",
                    options: [
                        "The model forgets past data after 24 hours.",
                        "The probability of the NEXT step depends only on the CURRENT step, not the full history.",
                        "Users forget which ads they saw."
                    ],
                    answer: 1,
                    feedback: "Exactly! Once at state X, the probability of going to Y is fixed regardless of how you got to X."
                }
            ],
            check: () => true
        },
        {
            id: 'scenario',
            title: "Set the Scenario",
            targetId: 'tut-scenario-section',
            content: `
                <p>Different businesses have different customer journey patterns.</p>
                <p class="task">👉 <strong>Task:</strong> Explore the scenarios! Try selecting <strong>"Case D: Emergency Plumber"</strong> to see a Search-dominant pattern, then switch to <strong>"Case B: Luxury Vacation"</strong> (multi-touch journeys).</p>
            `,
            scenarioChanged: false,
            onEnter: () => {
                const step = MarkovTutorial.steps.find(s => s.id === 'scenario');
                step.scenarioChanged = false;
                const sel = document.getElementById('scenario-select');
                if (sel) {
                    const handler = () => { step.scenarioChanged = true; };
                    sel.addEventListener('change', handler);
                    sel._tutorialHandler = handler;
                }
            },
            onExit: () => {
                const sel = document.getElementById('scenario-select');
                if (sel && sel._tutorialHandler) {
                    sel.removeEventListener('change', sel._tutorialHandler);
                    delete sel._tutorialHandler;
                }
            },
            check: () => {
                const step = MarkovTutorial.steps.find(s => s.id === 'scenario');
                return step.scenarioChanged === true;
            },
            quizzes: [
                {
                    question: "Why would a 'Luxury Vacation' purchase have longer customer journeys than an 'Emergency Plumber'?",
                    options: [
                        "High-ticket items require more research and multiple touchpoints before commitment.",
                        "Vacation websites are slower to load.",
                        "Plumbers don't use social media."
                    ],
                    answer: 0,
                    feedback: "Correct! Big purchases = more consideration = more touchpoints. Emergencies = immediate action."
                }
            ]
        },
        {
            id: 'raw-data',
            title: "Exploring Journey Sequences",
            targetId: 'tut-raw-data-section',
            content: `
                <p>Unlike Shapley, Markov cares about the <strong>order</strong> of touchpoints. Let's examine the raw sequences.</p>
                <p class="task">👉 <strong>Task:</strong> Scroll through the journey list and notice the SEQUENCE notation. Pay attention to which channels typically come first vs. last.</p>
            `,
            getDynamicQuizzes: () => {
                if (!window.appState || !window.appState.rawPaths) return null;
                
                const paths = window.appState.rawPaths;
                const total = paths.length;
                const conv = paths.filter(p => p.converted).length;
                const rate = ((conv / total) * 100).toFixed(1);
                
                // Count paths where Search is the FIRST touch
                const searchFirst = paths.filter(p => p.path.length > 0 && p.path[0] === 'search').length;
                
                return [
                    {
                        question: "What is the Overall Conversion Rate shown in the stats panel?",
                        options: [
                            `${(parseFloat(rate) - 4.0).toFixed(1)}%`,
                            `${rate}%`,
                            `${(parseFloat(rate) + 4.0).toFixed(1)}%`
                        ],
                        answer: 1,
                        feedback: `Correct! ${conv.toLocaleString()} conversions out of ${total.toLocaleString()} journeys.`
                    },
                    {
                        question: `Approximately how many journeys have Search as the FIRST touchpoint?`,
                        options: [
                            `Around ${searchFirst}`,
                            `Around ${Math.round(searchFirst * 0.4)}`,
                            `Around ${Math.round(searchFirst * 2.2)}`
                        ],
                        answer: 0,
                        feedback: `Correct! ${searchFirst} journeys started with Search—often acting as an 'awareness' or entry channel.`
                    }
                ];
            },
            quizzes: [],
            check: () => true
        },
        {
            id: 'sankey',
            title: "Reading the Sankey Flow",
            targetId: 'tut-sankey-section',
            content: `
                <p>The Sankey diagram visualizes the <strong>aggregate flow</strong> of all users through the marketing network.</p>
                <p class="task">👉 <strong>Task:</strong> Study the Sankey diagram. Notice how traffic flows from "Start" through various channels to either "Converted" or "Lost". Hover over links to see exact percentages.</p>
            `,
            quizzes: [
                {
                    question: "What does the WIDTH of a Sankey link represent?",
                    options: [
                        "The cost of that channel.",
                        "The VOLUME of users flowing between those two states.",
                        "The time spent on that channel."
                    ],
                    answer: 1,
                    feedback: "Correct! Thicker links = more users traveling that path."
                },
                {
                    question: "If you see a very thick link from 'Social' to 'Converted', what does that suggest?",
                    options: [
                        "Social is expensive.",
                        "Many users go directly from Social to Conversion (Social as last-touch closer).",
                        "Social is broken."
                    ],
                    answer: 1,
                    feedback: "Right! Social is acting as a 'closer' channel in many journeys."
                }
            ],
            check: () => true
        },
        {
            id: 'matrix',
            title: "The Transition Matrix",
            targetId: 'tut-matrix-section',
            content: `
                <p>The heatmap IS the Markov Chain. Each cell shows P(moving from Row → Column).</p>
                <p class="task">👉 <strong>Task:</strong> Find the "Start" row in the heatmap. Identify which channel has the highest probability of being the FIRST touchpoint.</p>
            `,
            getDynamicQuizzes: () => {
                if (!window.appState || !window.appState.model) return null;
                
                const matrix = window.appState.model.matrix;
                const stateIndex = window.appState.model.stateIndex;
                
                if (!matrix || !stateIndex) return null;
                
                const startIdx = stateIndex['(start)'];
                const searchIdx = stateIndex['search'];
                const convIdx = stateIndex['(conversion)'];
                
                if (startIdx === undefined || searchIdx === undefined) return null;
                
                const pStartToSearch = (matrix[startIdx][searchIdx] * 100).toFixed(0);
                
                // Find which channel has highest P(channel → conversion)
                const channels = ['search', 'social', 'displayA', 'displayB', 'email'];
                let bestCloser = { ch: '', prob: 0 };
                channels.forEach(ch => {
                    const chIdx = stateIndex[ch];
                    if (chIdx !== undefined && matrix[chIdx]) {
                        const prob = matrix[chIdx][convIdx];
                        if (prob > bestCloser.prob) {
                            bestCloser = { ch, prob };
                        }
                    }
                });
                const bestCloserName = window.CHANNEL_NAMES ? CHANNEL_NAMES[bestCloser.ch] : bestCloser.ch;
                
                return [
                    {
                        question: `What is P(Start → Search)? (Probability that Search is the FIRST touch)`,
                        options: [
                            `Around ${pStartToSearch}%`,
                            `Around ${Math.max(5, parseInt(pStartToSearch) - 15)}%`,
                            `Around ${Math.min(95, parseInt(pStartToSearch) + 20)}%`
                        ],
                        answer: 0,
                        feedback: `Correct! About ${pStartToSearch}% of users enter via Search.`
                    },
                    {
                        question: `Which channel has the HIGHEST direct conversion probability P(Channel → Conversion)?`,
                        options: [
                            `${bestCloserName} (${(bestCloser.prob * 100).toFixed(0)}%)`,
                            `Display A`,
                            `Start`
                        ],
                        answer: 0,
                        feedback: `Correct! ${bestCloserName} has the highest "closing" rate at ${(bestCloser.prob * 100).toFixed(1)}%.`
                    }
                ];
            },
            quizzes: [],
            check: () => true
        },
        {
            id: 'removal',
            title: "The Removal Effect Lab",
            targetId: 'tut-removal-section',
            content: `
                <p>This is the core of Markov attribution: simulate <strong>removing</strong> a channel and measure the damage.</p>
                <p class="task">👉 <strong>Task:</strong> In the Deep Dive panel, click <strong>at least 2 different "Remove" buttons</strong> (e.g., Remove Social, then Remove Search) to compare their removal effects.</p>
                <p class="hint">💡 Pay attention to which channels cause bigger vs. smaller drops in conversion rate!</p>
            `,
            // Track which channels the user has removed
            removedChannels: new Set(),
            check: () => {
                // Must have clicked at least 2 different remove buttons
                const box = document.getElementById('removal-result-box');
                const isVisible = box && box.style.display !== 'none';
                
                // Check if our tracking set has 2+ channels
                const step = MarkovTutorial.steps.find(s => s.id === 'removal');
                return isVisible && step.removedChannels && step.removedChannels.size >= 2;
            },
            onEnter: () => {
                // Set up listeners on all remove buttons to track engagement
                const step = MarkovTutorial.steps.find(s => s.id === 'removal');
                step.removedChannels = new Set();
                
                // Buttons use data-remove attribute, not IDs
                const buttons = document.querySelectorAll('[data-remove]');
                buttons.forEach(btn => {
                    const handler = () => {
                        const channel = btn.getAttribute('data-remove');
                        if (channel) {
                            step.removedChannels.add(channel);
                            // Update the task hint if they've done enough
                            if (step.removedChannels.size >= 2) {
                                const taskEl = document.querySelector('#tutorial-sidebar .task');
                                if (taskEl && !taskEl.classList.contains('done')) {
                                    taskEl.classList.add('done');
                                    taskEl.innerHTML = '✅ <strong>Great!</strong> You\'ve tested multiple channels. Answer the questions below.';
                                }
                            }
                        }
                    };
                    btn.addEventListener('click', handler);
                    // Store handler for cleanup
                    btn._tutorialHandler = handler;
                });
            },
            onExit: () => {
                // Clean up listeners
                const buttons = document.querySelectorAll('[data-remove]');
                buttons.forEach(btn => {
                    if (btn._tutorialHandler) {
                        btn.removeEventListener('click', btn._tutorialHandler);
                        delete btn._tutorialHandler;
                    }
                });
            },
            getDynamicQuizzes: () => {
                if (!window.appState || !window.appState.model) return null;
                
                const res = window.appState.model.calculateAttributionProportional();
                if (!res || !res.removalEffects) return null;
                
                // Find the channel with the LARGEST removal effect
                let maxEffect = { ch: '', effect: 0 };
                let minEffect = { ch: '', effect: 1 };
                
                for (const [ch, effect] of Object.entries(res.removalEffects)) {
                    if (effect > maxEffect.effect) maxEffect = { ch, effect };
                    if (effect < minEffect.effect) minEffect = { ch, effect };
                }
                
                const maxName = window.CHANNEL_NAMES ? CHANNEL_NAMES[maxEffect.ch] : maxEffect.ch;
                const minName = window.CHANNEL_NAMES ? CHANNEL_NAMES[minEffect.ch] : minEffect.ch;
                
                // Get the channels they actually tested (with human-readable names)
                const step = MarkovTutorial.steps.find(s => s.id === 'removal');
                const testedChannels = step.removedChannels ? Array.from(step.removedChannels) : ['social', 'search'];
                const channelNames = window.CHANNEL_NAMES || {
                    search: 'Search', social: 'Social', displayA: 'Display A', displayB: 'Display B', email: 'Email'
                };
                const testedNames = testedChannels.map(ch => channelNames[ch] || ch);
                
                return [
                    {
                        question: `Based on your testing, which channel has the LARGEST removal effect (causes the biggest drop)?`,
                        options: [
                            maxName,
                            minName,
                            "All channels have equal effect"
                        ],
                        answer: 0,
                        feedback: `Correct! ${maxName} is the most critical channel with a ${(maxEffect.effect * 100).toFixed(0)}% removal effect—removing it hurts conversions the most.`
                    },
                    {
                        question: `You tested removing ${testedNames[0]} and ${testedNames[1] || testedNames[0]}. What does a LARGER removal effect indicate?`,
                        options: [
                            "The channel is more expensive to run.",
                            "The channel is structurally critical—many converting paths depend on it.",
                            "The channel should be removed from the marketing mix."
                        ],
                        answer: 1,
                        feedback: "Exactly! High removal effect = critical bridge. Removing it breaks many converting journeys."
                    },
                    {
                        question: "Why might a channel with LOW frequency still have HIGH removal effect?",
                        options: [
                            "Because it's expensive.",
                            "Because it acts as a critical BRIDGE in high-converting paths.",
                            "Because the data is wrong."
                        ],
                        answer: 1,
                        feedback: "Exactly! A channel might appear rarely but be essential when it does appear—like a highway bridge that few use but those who do depend on."
                    }
                ];
            },
            quizzes: []
        },
        {
            id: 'comparison',
            title: "Shapley vs. Markov",
            targetId: 'tut-comparison-section',
            content: `
                <p>Now let's compare how the two methods allocate credit differently for the <em>same data</em>.</p>
                <p class="task">👉 <strong>Task:</strong> Study the comparison chart. Identify which channels get MORE credit from Markov (purple) vs. Shapley (blue).</p>
            `,
            quizzes: [
                {
                    question: "If a channel gets MORE credit from Markov than Shapley, what does that suggest?",
                    options: [
                        "The channel is expensive.",
                        "The channel is a critical BRIDGE in the sequential journey.",
                        "The channel has good branding."
                    ],
                    answer: 1,
                    feedback: "Correct! Markov rewards sequential importance while Shapley rewards marginal contribution."
                },
                {
                    question: "If a channel gets MORE credit from Shapley than Markov, what does that suggest?",
                    options: [
                        "The channel adds value to MANY different mixes but isn't critical to any single path.",
                        "The channel is cheaper.",
                        "The data is corrupted."
                    ],
                    answer: 0,
                    feedback: "Exactly! Shapley rewards versatility (good team player), Markov rewards structural position (critical bridge)."
                }
            ],
            check: () => true
        },
        {
            id: 'advanced-matrix',
            title: "🎓 Advanced: Absorbing States",
            targetId: 'tut-matrix-section',
            content: `
                <p><strong>Advanced Concept:</strong> "Conversion" and "Lost/Null" are <em>Absorbing States</em>—once reached, you stay there.</p>
                <p class="task">👉 <strong>Task:</strong> Find the "Converted" row in the heatmap—what value is in the Converted→Converted cell? Why 100%?</p>
            `,
            quizzes: [
                {
                    question: "Why does P(Converted → Converted) = 100%?",
                    options: [
                        "It's a display bug.",
                        "Once a user converts, they are 'absorbed'—the journey ends. The 100% is a mathematical convention.",
                        "Converted users always buy again."
                    ],
                    answer: 1,
                    feedback: "Correct! Absorbing states have P(self→self) = 100% because the journey terminates there."
                },
                {
                    question: "What would happen if Conversion was NOT an absorbing state?",
                    options: [
                        "Nothing would change.",
                        "Users could 'un-convert' and the math would become unstable (infinite loops).",
                        "The model would run faster."
                    ],
                    answer: 1,
                    feedback: "Exactly! Absorbing states ensure the chain eventually terminates."
                }
            ],
            check: () => true
        }
    ],

    init() {
        console.log("Initializing Markov Tutorial...");
        this.renderSidebar();
        
        // Checkbox listener
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
        this.currentHighlight = null;
        this.lastCheckResult = null;
        document.body.classList.add('tutorial-active');
        document.getElementById('tutorial-sidebar').classList.add('active');
        
        // Call onEnter for first step if defined
        const firstStep = this.steps[this.currentStep];
        if (firstStep.onEnter) firstStep.onEnter();
        
        this.updateView();
    },

    stop() {
        // Call onExit for current step if defined
        const currentStep = this.steps[this.currentStep];
        if (currentStep && currentStep.onExit) currentStep.onExit();
        
        this.isActive = false;
        if (this.checkInterval) clearInterval(this.checkInterval);
        document.body.classList.remove('tutorial-active');
        const sidebar = document.getElementById('tutorial-sidebar');
        if (sidebar) sidebar.classList.remove('active');
        this.removeHighlight();
        
        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    updateView() {
        if (!this.isActive) return;
        
        const step = this.steps[this.currentStep];
        const sidebarContent = document.getElementById('tutorial-content');
        
        // 1. Generate Quizzes (Once per step view)
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        step.currentQuizzes = quizzes; // Store for validation

        // Initialize quiz state if needed
        if (!step.quizState || step.quizState.length !== quizzes.length) {
            step.quizState = quizzes.map(() => ({ completed: false }));
        }

        // 2. Build Quiz HTML
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="MarkovTutorial.checkQuiz(${qIndex}, this.value)">
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

        // 3. Check completion status
        const isTaskComplete = step.check ? step.check() : true;
        const areQuizzesComplete = !quizzes || quizzes.length === 0 || (step.quizState && step.quizState.every(q => q.completed));
        const canProceed = isTaskComplete && areQuizzesComplete;

        // 4. Render full sidebar content
        sidebarContent.innerHTML = `
            <div class="tutorial-step-badge">Step ${this.currentStep + 1}/${this.steps.length}</div>
            <h3 style="margin-top: 10px; margin-bottom: 15px;">${step.title}</h3>
            <div class="tutorial-body">${step.content}</div>
            
            ${quizHtml}

            <div class="tutorial-progress-container">
                ${step.check ? `
                    <div class="tutorial-progress-item" style="margin-bottom: ${quizzes && quizzes.length > 0 ? '8px' : '0'};">
                        ${this.getCheckmark(isTaskComplete)} 
                        <span style="${isTaskComplete ? 'color: #10b981; font-weight: 600;' : 'color: #9ca3af;'}">
                            ${isTaskComplete ? "Task Complete" : "Pending Task Completion..."}
                        </span>
                    </div>
                ` : ''}
                
                ${quizzes && quizzes.length > 0 ? `
                    <div class="tutorial-progress-item">
                        ${this.getCheckmark(areQuizzesComplete)} 
                        <span style="${areQuizzesComplete ? 'color: #10b981; font-weight: 600;' : 'color: #9ca3af;'}">
                            ${areQuizzesComplete ? "Quick Check Complete" : "Pending Quick Check..."}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            ${canProceed ? 
                (this.currentStep === this.steps.length - 1 ? 
                    `<button class="btn-primary full-width" onclick="MarkovTutorial.finish()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="MarkovTutorial.nextStep()">Next Step ➜</button>`
                ) : 
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }
            
            <button class="btn-secondary full-width" onclick="MarkovTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
        `;

        // 5. Highlight target element
        if (step.targetId) {
            this.highlightTarget(step.targetId);
        } else {
            this.removeHighlight();
        }

        // 6. Start polling for task completion
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.checkInterval = setInterval(() => this.checkProgress(), 500);
    },
    
    getCheckmark(completed) {
        return completed ? 
            '<span style="color: #10b981; font-size: 1.2em;">✅</span>' : 
            '<span style="color: #9ca3af; font-size: 1.2em;">⬜</span>';
    },
    
    checkProgress() {
        if (!this.isActive) return;
        
        const step = this.steps[this.currentStep];
        if (step.check) {
            const checkResult = step.check();
            if (this.lastCheckResult !== checkResult) {
                this.lastCheckResult = checkResult;
                this.updateView();
            }
        }
    },

    highlightTarget(targetId) {
        // Avoid redundant highlighting (prevents flickering)
        if (this.currentHighlight === targetId) return;
        
        const el = document.getElementById(targetId);
        if (!el) return;

        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.style.display = 'block';
        
        // Reset previous highlights
        document.querySelectorAll('.tutorial-highlight').forEach(e => {
            e.classList.remove('tutorial-highlight');
            e.style.position = '';
            e.style.zIndex = '';
        });

        // Highlight new target
        el.classList.add('tutorial-highlight');
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.position === 'static') {
            el.style.position = 'relative';
        }
        el.style.zIndex = '1001';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        this.currentHighlight = targetId;
    },
    
    removeHighlight() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.style.display = 'none';
        
        document.querySelectorAll('.tutorial-highlight').forEach(e => {
            e.classList.remove('tutorial-highlight');
            e.style.zIndex = '';
        });
        this.currentHighlight = null;
    },

    checkQuiz(qIndex, selectedIndex) {
        const step = this.steps[this.currentStep];
        
        // Use the stored currentQuizzes to ensure consistency
        const quizzes = step.currentQuizzes || step.quizzes || [];
        
        const quiz = quizzes[qIndex];
        if (!quiz) return;
        
        const feedbackEl = document.getElementById(`quiz-feedback-${qIndex}`);
        
        if (parseInt(selectedIndex) === quiz.answer) {
            feedbackEl.style.display = 'block';
            feedbackEl.style.color = '#10b981';
            feedbackEl.textContent = '✅ ' + quiz.feedback;
            
            // Mark as completed
            if (!step.quizState || step.quizState.length !== quizzes.length) {
                step.quizState = quizzes.map(() => ({ completed: false }));
            }
            step.quizState[qIndex].completed = true;
            
            // Re-render after a short delay to show the updated state
            setTimeout(() => this.updateView(), 1500);
        } else {
            feedbackEl.style.display = 'block';
            feedbackEl.style.color = '#ef4444';
            feedbackEl.textContent = "❌ Not quite. Try again!";
        }
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            // Call onExit for current step if defined
            const currentStep = this.steps[this.currentStep];
            if (currentStep.onExit) currentStep.onExit();
            
            this.currentStep++;
            this.currentHighlight = null;
            this.lastCheckResult = null;
            
            // Call onEnter for new step if defined
            const newStep = this.steps[this.currentStep];
            if (newStep.onEnter) newStep.onEnter();
            
            this.updateView();
        } else {
            this.finish();
        }
    },
    
    finish() {
        alert("🎉 Tutorial Completed! You now understand Markov Chain Attribution.");
        this.stop();
        
        // Log completion
        if (typeof logToolRunToBackend === 'function') {
            logToolRunToBackend(
                { action: 'tutorial_completed', tool: 'markov_attribution' },
                'Professor Mode tutorial completed for Markov Attribution'
            );
        }
        
        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    renderSidebar() {
        const div = document.createElement('div');
        div.id = 'tutorial-sidebar';
        div.innerHTML = `
            <div class="sidebar-header">
                <h2>👨‍🏫 Professor Mode</h2>
                <button onclick="MarkovTutorial.stop()" class="close-tutorial">×</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(div);

        // Create overlay for spotlight effect
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        document.body.appendChild(overlay);
    }
};

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    MarkovTutorial.init();
});
