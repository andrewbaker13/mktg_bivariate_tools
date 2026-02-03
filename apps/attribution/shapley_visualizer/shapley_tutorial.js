/**
 * shapley_tutorial.js
 * Professor Mode Tutorial for Shapley Attribution Visualizer
 */

const ShapleyTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,
    
    // Define steps
    steps: [
        {
            id: 'intro',
            title: "Concept & Intuition",
            targetId: 'tut-concept-section',
            content: `
                <p>Welcome to the <strong>Shapley Attribution Lab</strong>. This tool uses <em>Cooperative Game Theory</em> to fairly distribute credit among marketing channels.</p>
                <p class="task">👉 <strong>Task:</strong> Read the "Concept & Intuition" section below, including the Problem, Solution, Case Study, and Key Terms.</p>
            `,
            quizzes: [
                {
                    question: "Why is 'Last Click' attribution often misleading?",
                    options: [
                        "It gives 100% of the credit to the final touchpoint, ignoring all 'assists'.",
                        "It is too complex to calculate.",
                        "It gives too much credit to social media."
                    ],
                    answer: 0,
                    feedback: "Correct! Last Click ignores the 'team effort' (assists) that happened earlier in the funnel."
                },
                {
                    question: "What does the Shapley Value calculate?",
                    options: [
                        "The time order of clicks.",
                        "The average marginal contribution of a channel across all possible coalitions.",
                        "The total revenue of the company."
                    ],
                    answer: 1,
                    feedback: "Exactly. It averages over every possible coalition to ensure fair credit distribution."
                }
            ],
            check: () => true // Always pass reading step
        },
        {
            id: 'scenario',
            title: "Set the Scenario",
            targetId: 'tut-scenario-section',
            content: `
                <p>Context matters. Different businesses have different 'physics'.</p>
                <p class="task">👉 <strong>Task:</strong> Explore the scenarios! Try selecting <strong>"Case C: Fast Fashion Outlet"</strong> (cannibalization) or <strong>"Case D: Emergency Plumber"</strong> (search dominance), then compare with <strong>"Case B: Luxury Vacation"</strong> (synergy).</p>
                <p>Notice how the Synergy Heatmap changes with each scenario!</p>
            `,
            scenarioChanged: false,
            onEnter: () => {
                const step = ShapleyTutorial.steps.find(s => s.id === 'scenario');
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
                const step = ShapleyTutorial.steps.find(s => s.id === 'scenario');
                return step.scenarioChanged === true;
            },
            quizzes: [
                {
                    question: "In a 'High Synergy' scenario like Luxury Vacation, what behavior do we expect?",
                    options: [
                        "Channels work independently (Solo players).",
                        "Channels amplify each other (Positive Synergy).",
                        "Channels cannibalize each other (Diminishing Returns)."
                    ],
                    answer: 1,
                    feedback: "Correct! High-ticket items usually require multiple touchpoints working together to convince a buyer."
                }
            ]
        },
        {
            id: 'raw-data',
            title: "Validating the Raw Data",
            targetId: 'tut-raw-data-section',
            content: `
                <p>Before doing complex math, always trust but verify your raw data input.</p>
                <p class="task">👉 <strong>Task:</strong> Look at the <strong>Path Statistics</strong> panel showing Total Paths, Total Conversions, and Overall Conversion Rate. Then scroll through the Raw User Journeys list below it.</p>
            `,
            getDynamicQuizzes: () => {
                if (!window.appState || !window.appState.rawPaths) return null;
                
                const total = window.appState.rawPaths.length;
                const conv = window.appState.rawPaths.filter(p => p.converted).length;
                const rate = ((conv / total) * 100).toFixed(1);
                
                // Count paths containing Social -> Search sequence
                const socialThenSearch = window.appState.rawPaths.filter(p => {
                    const path = p.path;
                    for (let i = 0; i < path.length - 1; i++) {
                        if (path[i] === 'social' && path[i+1] === 'search') return true;
                    }
                    return false;
                }).length;
                
                return [
                    {
                        question: "What is the observed Overall Conversion Rate for this simulation?",
                        options: [
                            `${(parseFloat(rate) - 5.0).toFixed(1)}%`,
                            `${rate}%`,
                            `${(parseFloat(rate) + 5.0).toFixed(1)}%`
                        ],
                        answer: 1,
                        feedback: `Correct! The simulation generated ${total.toLocaleString()} paths with ${conv} conversions.`
                    },
                    {
                        question: `How many total conversions were generated?`,
                        options: [
                            `${conv}`,
                            `${total}`,
                            "0"
                        ],
                        answer: 0,
                        feedback: "Good eye. These raw counts form the basis of the probability models below."
                    },
                    {
                        question: `Scroll through the journey list. Approximately how many paths contain the sequence 'Social → Paid Search' (Social immediately followed by Search)?`,
                        options: [
                            `Around ${socialThenSearch}`,
                            `Around ${Math.round(socialThenSearch * 0.3)}`,
                            `Around ${Math.round(socialThenSearch * 2.5)}`
                        ],
                        answer: 0,
                        feedback: `Correct! There are ${socialThenSearch} journeys with that specific sequence. This shows Social often 'assists' Search!`
                    }
                ];
            },
            quizzes: [],
            check: () => true
        },
        {
            id: 'coalition-lab',
            title: "The Coalition Lab",
            targetId: 'tut-coalition-lab',
            content: `
                <p>Let's isolate a specific "Team". We want to see how <strong>Social</strong> and <strong>Email</strong> perform when they are the <em>only</em> channels present.</p>
                <p class="task">👉 <strong>Task:</strong> In the highlighted <strong>Media Mix Lab</strong>, toggle the buttons so that <strong>ONLY</strong> 'Social' and 'Email' are active (showing as selected). Turn off 'Paid Search' and the others!</p>
                <p>Watch the Conversion Rate update as you change the mix.</p>
            `,
            check: () => {
                if (!window.appState || !window.appState.activeChannels) return false;
                const s = window.appState.activeChannels;
                return s.size === 2 && s.has('social') && s.has('email');
            },
            getDynamicQuizzes: () => {
                 if (!window.appState || !window.appState.calc) return null;
                 
                 // Calc value for {Social, Email}
                 const val = window.appState.calc.getCoalitionValue(['social', 'email']);
                 
                 // Calc sum of parts
                 const vSoc = window.appState.calc.getCoalitionValue(['social']);
                 const vEm = window.appState.calc.getCoalitionValue(['email']);
                 const sumParts = vSoc + vEm;
                 const synergy = val - sumParts;
                 
                 const isPositive = synergy > 0.1;

                 return [
                     {
                         question: "What is the observed Conversion Rate for the {Social + Email} mix?",
                         options: [
                             `${val.toFixed(1)}%`,
                             "0.0%",
                             "100.0%"
                         ],
                         answer: 0,
                         feedback: `Correct. This is the value v({Social, Email}) from the characteristic function.`
                     },
                     {
                         question: "Is this result higher than the sum of Social alone + Email alone?",
                         options: [
                             "Yes (Positive Synergy)",
                             "No (Negative Synergy)",
                             "Exactly the same"
                         ],
                         answer: isPositive ? 0 : 1,
                         feedback: isPositive 
                             ? `Correct! ${val.toFixed(1)}% is greater than (${vSoc.toFixed(1)}% + ${vEm.toFixed(1)}%). This 'Bonus' is the Synergy.`
                             : "Actually, in this run it might be neutral or negative."
                     }
                 ];
            }
        },
        {
            id: 'synergy-heatmap',
            title: "Synergy Heatmap",
            targetId: 'tut-synergy-section',
            content: `
                <p>Instead of guessing which pairs work well, use the Heatmap to visualize all channel partnerships at once.</p>
                <p class="task">👉 <strong>Task:</strong> Look at the highlighted Synergy Analysis section. Find the <strong>darkest green</strong> square in the matrix — this shows the strongest positive partnership. Hover over it to see details.</p>
                <p>Green = Synergy (channels amplify each other). Red = Cannibalization (channels compete).</p>
            `,
            getDynamicQuizzes: () => {
                if (!window.appState || !window.appState.synergyData) return null;
                
                const data = window.appState.synergyData; // { zValues, labels, axis }
                
                // Find Max Synergy (lower triangle only - where value is not null)
                let maxSyn = -999;
                let maxPair = "";
                
                // zValues[row][col] - only lower triangle has values
                for(let r=0; r<data.zValues.length; r++) {
                    for(let c=0; c<data.zValues[r].length; c++) {
                        const val = data.zValues[r][c];
                        if (val === null || val === undefined) continue; // skip nulls (upper triangle/diagonal)
                        if (val > maxSyn) {
                            maxSyn = val;
                            maxPair = `${data.labels[r]} + ${data.labels[c]}`;
                        }
                    }
                }
                
                return [
                    {
                         question: "Which channel pair shows the strongest POSITIVE synergy (Green)?",
                         options: [
                             maxPair, // Correct
                             "Search + Display A", // Distractor
                             "Email + Display B"   // Distractor
                         ],
                         answer: 0,
                         feedback: `Yes! Those two channels create the most lift (+${maxSyn.toFixed(1)}%) when combined.`
                    }
                ];
            },
            quizzes: [],
            check: () => true // relying on quiz
        },
        {
            id: 'math-engine',
            title: "The Calculation Engine",
            targetId: 'tut-calculation-section',
            content: `
                <p>Shapley requires calculating marginal contributions for every possible coalition of channels.</p>
                <p class="task">👉 <strong>Task:</strong> In the highlighted 'Inside the Math' section, select <strong>Email</strong> from the dropdown to inspect its calculation breakdown.</p>
                <p>The table shows how Email's contribution varies depending on which channels were already present.</p>
            `,
            check: () => {
                const el = document.getElementById('detail-channel-select');
                return el && el.value === 'email';
            },
            quizzes: [
                {
                    question: "Why do we average the marginal contributions?",
                    options: [
                        "To make the number bigger.",
                        "Because a channel's value depends on which other channels are present, and we need to consider all possibilities.",
                        "Because the dataset is too small."
                    ],
                    answer: 1,
                    feedback: "Correct. By considering every possible coalition, the Shapley Value ensures fair credit allocation regardless of which channels happened to be measured together."
                }
            ],
            // Dynamic quiz: check Email's base val and Social+DisplayA marginal
            getDynamicQuizzes: () => {
                if (!window.appState || !window.appState.calc) return null;
                
                // Marginal contribution to empty set = v({Email}) - v({})
                const valEmail = window.appState.calc.getCoalitionValue(['email']);
                
                // Marginal contribution of Email to {Social, DisplayA}
                const vSocialDisplayA = window.appState.calc.getCoalitionValue(['social', 'displayA']);
                const vSocialDisplayAEmail = window.appState.calc.getCoalitionValue(['social', 'displayA', 'email']);
                const marginalToSocialDisplayA = vSocialDisplayAEmail - vSocialDisplayA;
                
                // Get overall Shapley value for Email
                const attribution = window.appState.calc.calculate();
                const emailShapley = attribution['email'] || 0;
                
                return [
                    {
                        question: "What is Email's marginal contribution when added to an EMPTY team (the Base Conversion)?",
                        options: [
                            `${valEmail.toFixed(1)}%`,
                            "0.0%",
                            "50.0%"
                        ],
                        answer: 0,
                        feedback: "Correct. This is the value Email accounts for on its own."
                    },
                    {
                        question: "Look at the row 'Social + Display A'. What is Email's marginal contribution when added to THAT specific mix?",
                        options: [
                            `+${marginalToSocialDisplayA.toFixed(1)}%`,
                            `+${(marginalToSocialDisplayA * 2).toFixed(1)}%`,
                            `+${(marginalToSocialDisplayA * 0.5).toFixed(1)}%`
                        ],
                        answer: 0,
                        feedback: `Correct! Adding Email to {Social + Display A} increases conversions by ${marginalToSocialDisplayA.toFixed(1)}%. Notice how marginal impact varies by context!`
                    },
                    {
                        question: "What is Email's FINAL Shapley Value (the weighted average of all marginal contributions)?",
                        options: [
                            `${emailShapley.toFixed(2)}%`,
                            `${(emailShapley * 1.5).toFixed(2)}%`,
                            `${(emailShapley * 0.6).toFixed(2)}%`
                        ],
                        answer: 0,
                        feedback: `Correct! The Shapley Value of ${emailShapley.toFixed(2)}% represents Email's fair share of overall conversion credit.`
                    }
                ];
            }
        },
        {
            id: 'verdict',
            title: "The Analyst's Verdict",
            targetId: 'tut-comparison-section',
            content: `
                <p>Finally, compare the models. The chart shows <span style="color:#64748b;">Grey bars</span> (old Last Touch model) vs <span style="color:#3b82f6;">Colored bars</span> (new Shapley model).</p>
                <p class="task">👉 <strong>Task:</strong> Inspect the Model Comparison Chart and the interpretation guide. Identify which channel is most under-valued by Last Touch.</p>
                <p>Look for where the colored bar is much taller than the grey bar — that's your hidden "assist" player!</p>
            `,
            getDynamicQuizzes: () => {
                if (!window.appState || !window.appState.comparisonData) return null;
                
                const c = window.appState.comparisonData; // { channels, shapleyVals, lastTouchVals }
                
                // Find channel where Last Touch < Shapley (Shapley is bigger) -> Undervalued by LT
                let maxUnderValuedDiff = -999;
                let undervaluedChannel = "";
                
                for(let i=0; i<c.channels.length; i++) {
                    // Diff = Shapley - LastTouch
                    const diff = c.shapleyVals[i] - c.lastTouchVals[i];
                    if (diff > maxUnderValuedDiff) {
                        maxUnderValuedDiff = diff;
                        undervaluedChannel = CHANNEL_NAMES[c.channels[i]];
                    }
                }
                
                // Find channel where Last Touch > Shapley -> Overvalued by LT
                let maxOverValuedDiff = -999;
                let overvaluedChannel = "";
                 for(let i=0; i<c.channels.length; i++) {
                    const diff = c.lastTouchVals[i] - c.shapleyVals[i];
                    if (diff > maxOverValuedDiff) {
                        maxOverValuedDiff = diff;
                        overvaluedChannel = CHANNEL_NAMES[c.channels[i]];
                    }
                }

                return [
                    {
                        question: "Which channel is most UNDER-valued by the Last Touch model? (Where is the Color Bar much taller than the Grey Bar?)",
                        options: [
                            undervaluedChannel,
                            overvaluedChannel,
                            "None"
                        ],
                        answer: 0,
                        feedback: `Correct! ${undervaluedChannel} plays a huge 'Assist' role that Last Touch ignores.`
                    },
                    {
                        question: "What business mistake would you make using the Last Touch model here?",
                        options: [
                            `You would cut the budget for ${undervaluedChannel} because it looks weak.`,
                            `You would give too much credit to ${undervaluedChannel}.`,
                            "No mistake."
                        ],
                        answer: 0,
                        feedback: "Exactly. You'd kill the assist channel, which would cause your whole funnel to collapse."
                    }
                ];
            },
            quizzes: [],
            check: () => true
        },
        {
            id: 'conclusion',
            title: "🎓 Professor Mode Complete!",
            targetId: null,
            content: `
                <h4>📊 What You've Learned</h4>
                <ul style="margin: 0.5rem 0 1rem 1rem; line-height: 1.7;">
                    <li>Why Last-Touch attribution can be misleading</li>
                    <li>How Shapley Values fairly distribute credit across all "players"</li>
                    <li>How to identify synergy vs. independence vs. cannibalization</li>
                    <li>How to read the coalition conversion matrix</li>
                    <li>How to spot under-valued "assist" channels</li>
                </ul>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    Shapley Values provide a mathematically fair attribution framework, but they assume all possible 
                    coalitions are equally likely—which may not reflect real-world budget constraints or channel 
                    availability. In practice, analysts often compare Shapley results with position-based models 
                    and Markov chain analysis to triangulate insights. Advanced practitioners also consider time decay, 
                    cross-device tracking gaps, and incrementality testing to validate that attributed channels truly 
                    <em>caused</em> conversions rather than just correlating with them. As you advance, explore how 
                    Shapley extends to multi-touch with time weights, and consider A/B testing budget reallocations 
                    before making major investment shifts.
                </p>
                
                <h4>🎯 Next Steps</h4>
                <ul style="margin: 0.5rem 0 1rem 1rem; line-height: 1.7;">
                    <li>Try the <strong>Markov Chain Attribution</strong> tool to see how sequence matters</li>
                    <li>Experiment with different scenarios to see how synergy patterns change</li>
                    <li>Export your results and compare with your own data</li>
                </ul>
            `,
            quizzes: [],
            check: () => true
        }
    ],

    init() {
        console.log("Initializing Shapley Tutorial...");
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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="ShapleyTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="ShapleyTutorial.finish()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="ShapleyTutorial.nextStep()">Next Step ➜</button>`
                ) : 
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }
            
            <button class="btn-secondary full-width" onclick="ShapleyTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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

    checkCompletion() {
        // Legacy method - now using checkProgress
        this.checkProgress();
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            // Call onExit for current step if defined
            const currentStep = this.steps[this.currentStep];
            if (currentStep.onExit) currentStep.onExit();
            
            this.currentStep++;
            this.currentHighlight = null;  // Reset highlight tracking
            this.lastCheckResult = null;   // Reset check tracking
            
            // Call onEnter for new step if defined
            const newStep = this.steps[this.currentStep];
            if (newStep.onEnter) newStep.onEnter();
            
            this.updateView();
        } else {
            this.finish();
        }
    },
    
    finish() {
        alert("🎉 Tutorial Completed! You now understand the basics of Shapley Attribution.");
        this.stop();
        
        // Log completion
        if (typeof logToolRunToBackend === 'function') {
            logToolRunToBackend(
                { action: 'tutorial_completed', tool: 'shapley_attribution' },
                'Professor Mode tutorial completed for Shapley Attribution'
            );
        }
        
        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    renderSidebar() {
        // Prevent duplicate sidebars
        if (document.getElementById('tutorial-sidebar')) return;
        
        const div = document.createElement('div');
        div.id = 'tutorial-sidebar';
        div.innerHTML = `
            <div class="sidebar-header">
                <h2>👨‍🏫 Professor Mode</h2>
                <button onclick="ShapleyTutorial.stop()" class="close-tutorial">×</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(div);

        // Create overlay for spotlight effect
        if (!document.getElementById('tutorial-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'tutorial-overlay';
            document.body.appendChild(overlay);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => ShapleyTutorial.init(), 300);
    });
} else {
    // DOM already loaded
    setTimeout(() => ShapleyTutorial.init(), 300);
}
