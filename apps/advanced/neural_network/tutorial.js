/**
 * Neural Network Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const Tutorial = {
    isActive: false,
    currentStep: 0,
    
    // Configuration
    config: {
        targetDataset: 'churn',
        requiredAccuracy: 90,
        minEpochs: 50
    },

    // Tutorial Steps
    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to Neural Networks 101",
            targetId: null, // No specific element to highlight yet
            content: `
                <p>Welcome, student! Today we're going to build a <strong>Neural Network</strong> to solve a real marketing problem.</p>
                <p><strong>The Mission:</strong> We need to predict which customers are about to <strong>Churn</strong> (cancel their subscription) based on their behavior.</p>
                <p>I'll guide you through each step of the process:</p>
                <ol>
                    <li>Understanding our Data</li>
                    <li>Selecting Features</li>
                    <li>Designing the Brain</li>
                    <li>Training the Model</li>
                </ol>
                <div style="margin-top: 20px;">
                    <button class="btn-secondary full-width" onclick="Tutorial.stop()">No Guide Needed (Skip Tutorial)</button>
                </div>
            `,
            quizzes: [
                {
                    question: "What is our main objective in this mission?",
                    options: ["To generate random numbers", "To predict Customer Churn", "To design a website"],
                    answer: 1,
                    feedback: "Correct! We are building a brain to identify customers at risk of leaving."
                }
            ],
            check: () => true // Task is just to read and answer
        },
        {
            id: 'data_selection',
            title: "Step 1: The Data",
            targetId: 'step1',
            content: `
                <p><strong>Supervised Learning</strong> starts with historical data where we already know the answer.</p>
                <p>In this case, we have data on past customers including:</p>
                <ul>
                    <li><strong>Months Subscribed</strong> (How long they've been with us)</li>
                    <li><strong>Support Tickets</strong> (How many times they complained)</li>
                    <li><strong>Outcome</strong> (Did they Stay or Churn?)</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Click the <strong>"View Sample Data"</strong> button to open the data table. Look at the raw numbers.</p>
            `,
            quizzes: [
                {
                    question: "Open the Sample Data table. Look for customers with HIGH Support Tickets (> 5) and LOW Months Subscribed (< 2). What is their Outcome usually?",
                    options: ["Likely to Stay (1)", "Likely to Churn (-1)", "It's random"],
                    answer: 1,
                    feedback: "Correct! New customers who complain a lot are high-risk churners."
                },
                {
                    question: "What does the 'Outcome' column represent in our training data?",
                    options: ["The model's guess", "The actual historical fact (Ground Truth)", "A random number"],
                    answer: 1,
                    feedback: "Exactly! This is the 'Ground Truth' we use to teach the model."
                }
            ],
            check: () => config.dataset === 'churn',
            onEnter: () => {
                // Force scroll to step 1
                document.getElementById('step1').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'feature_engineering',
            title: "Step 2a: Feature Engineering",
            targetId: 'step2',
            content: `
                <p>Raw data isn't always enough. Sometimes we need to transform it to help the model learn.</p>
                <p>For example, the relationship between <strong>Support Tickets</strong> and <strong>Churn</strong> might depend on how long they've been a customer.</p>
                <p><strong>Feature Engineering</strong> is the art of creating new input variables from your existing data.</p>
                <p class="task">👉 <strong>Task:</strong> Select <strong>Months</strong>, <strong>Tickets</strong>, and <strong>Interaction (Months × Tickets)</strong>. The interaction term helps the model understand how these variables work <em>together</em>.</p>
            `,
            quizzes: [
                {
                    question: "Look at the feature options. Which one represents the 'Interaction' between Months (X) and Tickets (Y)?",
                    options: ["X²", "ln(X)", "X × Y"],
                    answer: 2,
                    feedback: "Correct! Multiplying two variables creates an interaction term."
                },
                {
                    question: "We added 'Interaction'. This helps the model when the effect of Support Tickets depends on...?",
                    options: ["The time of day", "The Subscription Length", "Random chance"],
                    answer: 1,
                    feedback: "Exactly! A high number of tickets might be normal for a long-time customer, but bad for a new one."
                }
            ],
            check: () => {
                const f = config.features;
                return f.includes('price') && f.includes('quality') && f.includes('interaction');
            },
            onEnter: () => {
                // Small delay to ensure smooth transition if coming from previous step
                setTimeout(() => {
                    document.getElementById('step2').scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        },
        {
            id: 'architecture',
            title: "Step 2b: Designing the Brain",
            targetId: 'step2',
            content: `
                <p>Now we design the <strong>Neural Network Architecture</strong>.</p>
                <ul>
                    <li><strong>Hidden Layers:</strong> The depth of the network. More layers = more complex reasoning.</li>
                    <li><strong>Neurons:</strong> The width. More neurons = more patterns it can memorize.</li>
                </ul>
                <p>For this problem, we don't need a massive brain. A small, focused one prevents "Overfitting" (memorizing noise).</p>
                <p class="task">👉 <strong>Task:</strong> Set <strong>Hidden Layers</strong> to <strong>2</strong> and <strong>Neurons per Layer</strong> to <strong>4</strong>.</p>
            `,
            quizzes: [
                {
                    question: "Look at the slider labels. Which setting controls the 'depth' of the network?",
                    options: ["Neurons per Layer", "Hidden Layers", "Learning Rate"],
                    answer: 1,
                    feedback: "Correct! Adding layers makes the network deeper."
                },
                {
                    question: "You set the network to have 2 Hidden Layers. Look at the visualization. How many distinct columns of nodes are between the Input and Output?",
                    options: ["1", "2", "4"],
                    answer: 1,
                    feedback: "Correct! You can see the two columns of neurons in the diagram."
                }
            ],
            check: () => config.hiddenLayers === 2 && config.neuronsPerLayer === 4,
            onEnter: () => {
                document.getElementById('step2').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'training',
            title: "Step 3: Training the Model",
            targetId: 'step3',
            content: `
                <p>It's time to teach the model! We'll use <strong>Backpropagation</strong>.</p>
                <p>The model will make a guess, check if it was right, and slightly adjust its weights to be less wrong next time.</p>
                <p>Watch the <strong>Training Accuracy</strong> and <strong>Training Loss</strong> (Blue Line). This shows how well the model is learning the data we gave it.</p>
                <p class="task">👉 <strong>Task:</strong> Click <strong>Start Training</strong> and wait until <strong>Train Acc</strong> reaches at least <strong>80%</strong>.</p>
            `,
            quizzes: [
                {
                    question: "Look at the Loss Chart. What does the Blue line (Training Loss) represent?",
                    options: ["How fast the model is learning", "The model's error on the data it is studying", "The model's error on new data"],
                    answer: 1,
                    feedback: "Correct! Training Loss measures error on the data the model is currently learning from."
                },
                {
                    question: "Why do we want Training Loss to go DOWN?",
                    options: ["It means the model is making fewer mistakes", "It means the model is getting faster", "It means the model is broken"],
                    answer: 0,
                    feedback: "Exactly! Lower loss means the model's predictions are getting closer to the truth."
                }
            ],
            check: () => {
                if (!network) return false;
                const acc = network.calculateAccuracy(trainData.map(d => d.input), trainData.map(d => d.output));
                return acc >= 80;
            },
            onEnter: () => {
                document.getElementById('step3').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'validation',
            title: "Step 4: The Real Test",
            targetId: 'step4',
            content: `
                <p>Great! The model has learned the training data. But is it actually smart, or did it just memorize the answers?</p>
                <p>The <strong>REAL test</strong> is how well it performs on <strong>Test Data</strong> (customers it has never seen before).</p>
                <p>Look at the <strong>Test Accuracy</strong> (Red Line/Metric). If Training Accuracy is high but Test Accuracy is low, we have <strong>Overfitting</strong>.</p>
                <p class="task">👉 <strong>Task:</strong> Ensure <strong>Test Accuracy</strong> is above <strong>75%</strong>. Then click <strong>"View Prediction Details"</strong> to see individual customer predictions.</p>
            `,
            quizzes: [
                {
                    question: "If Training Accuracy is 95% but Test Accuracy is only 60%, what is happening?",
                    options: ["The model is Underfitting", "The model is Overfitting (memorizing)", "The model is perfect"],
                    answer: 1,
                    feedback: "Correct! A big gap between Train and Test means the model is memorizing noise instead of learning patterns."
                },
                {
                    question: "Why is Test Accuracy the most important metric for a business?",
                    options: ["It predicts how the model will perform on FUTURE customers", "It is easier to calculate", "It is always higher than Training Accuracy"],
                    answer: 0,
                    feedback: "Spot on! We care about predicting the future, not remembering the past."
                },
                {
                    question: "Open 'View Prediction Details'. If a prediction has 99% Confidence, what does that mean?",
                    options: ["The model is definitely correct", "The model is very sure (but could still be wrong)", "The model cheated"],
                    answer: 1,
                    feedback: "Correct! Confidence is just the model's internal certainty. Even a confident model can be wrong!"
                }
            ],
            check: () => {
                if (!network) return false;
                const acc = network.calculateAccuracy(testData.map(d => d.input), testData.map(d => d.output));
                return acc >= 75;
            },
            onEnter: () => {
                document.getElementById('step4').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'introspection',
            title: "Step 5: Look Inside",
            targetId: 'viewWeightsBtn',
            content: `
                <p>Congratulations! You've built a robust Neural Network.</p>
                <p>Neural Networks are often called "Black Boxes," but we can peek inside to see how they think.</p>
                <p class="task">👉 <strong>Task:</strong> Click the <strong>"Weights"</strong> button (in the Training controls). Hover over the neurons to see their individual decision boundaries. See how they combine simple shapes to form the complex final boundary!</p>
            `,
            quizzes: [
                {
                    question: "Look at the neurons in the FIRST Hidden Layer. What shape are their decision boundaries?",
                    options: ["Straight lines", "Circles", "Complex squiggles"],
                    answer: 0,
                    feedback: "Correct! The first layer draws simple lines. Deeper layers combine these lines into complex shapes."
                }
            ],
            check: () => true, // Allow completion via quiz
            onEnter: () => {
                document.getElementById('step3').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎉 Mission Accomplished!",
            targetId: null,
            content: `
                <p>You have successfully built, trained, and validated a Neural Network to predict Customer Churn!</p>
                
                <h4>🚀 What's Next?</h4>
                <p>In the real world, the work doesn't stop here. Consider these future challenges:</p>
                <ul>
                    <li><strong>Data Cleaning:</strong> Real data is messy. "Garbage In, Garbage Out."</li>
                    <li><strong>Deployment:</strong> How do we get this model into a live CRM system?</li>
                    <li><strong>Ethics:</strong> Is the model biased against certain groups? We must audit it before launch.</li>
                </ul>
                
                <p><strong>Business Impact:</strong> By catching churners early, we can save the company millions in lost revenue.</p>
            `,
            check: () => true,
            onEnter: () => {
                Tutorial.hideOverlay();
            }
        }
    ],

    init() {
        this.renderSidebar();
        this.renderOverlay();
        this.attachListeners();
        
        // Check initial state
        const checkbox = document.getElementById('guidedMode');
        if (checkbox && checkbox.checked) {
            this.start();
        }
    },

    start() {
        this.isActive = true;
        window.useSeededRandom = true; // Enable deterministic data for tutorial
        this.currentStep = 0;
        document.body.classList.add('tutorial-active');
        document.getElementById('tutorial-sidebar').classList.add('active');
        
        // Force regenerate data with seed
        if (typeof generateData === 'function') generateData();
        
        this.updateView();
    },

    stop() {
        this.isActive = false;
        window.useSeededRandom = false; // Disable deterministic data
        document.body.classList.remove('tutorial-active');
        document.getElementById('tutorial-sidebar').classList.remove('active');
        this.hideOverlay();
        
        // Uncheck the box
        const checkbox = document.getElementById('guidedMode');
        if (checkbox) checkbox.checked = false;
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.updateView();
        }
    },

    updateView() {
        const step = this.steps[this.currentStep];
        
        // Update Sidebar
        const sidebarContent = document.getElementById('tutorial-content');
        
        let quizHtml = '';
        if (step.quizzes) {
            // Initialize quiz state if needed
            if (!step.quizState) {
                step.quizState = step.quizzes.map(() => ({ completed: false }));
            }

            quizHtml = step.quizzes.map((quiz, qIndex) => {
                const isCompleted = step.quizState[qIndex].completed;
                
                if (!isCompleted) {
                    return `
                        <div class="tutorial-quiz" id="quiz-${qIndex}" style="background: #fff7ed; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid var(--app-warning);">
                            <h4 style="margin-top: 0; color: #9a3412;">🤔 Quick Check ${qIndex + 1}</h4>
                            <p style="margin-bottom: 10px; font-weight: 500;">${quiz.question}</p>
                            <div class="quiz-options">
                                ${quiz.options.map((opt, i) => `
                                    <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                                        <input type="radio" name="quiz_q_${qIndex}" value="${i}" onchange="Tutorial.checkQuiz(${qIndex}, this.value)">
                                        ${opt}
                                    </label>
                                `).join('')}
                            </div>
                            <div id="quiz-feedback-${qIndex}" style="margin-top: 10px; font-weight: bold; display: none;"></div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="tutorial-quiz" style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid var(--app-success);">
                            <h4 style="margin-top: 0; color: var(--app-success);">✅ Quick Check ${qIndex + 1} Passed</h4>
                            <p style="margin-bottom: 0;">${quiz.feedback}</p>
                        </div>
                    `;
                }
            }).join('');
        }

        const isTaskComplete = step.check ? step.check() : true;
        const areQuizzesComplete = !step.quizzes || step.quizState.every(q => q.completed);
        const canProceed = isTaskComplete && areQuizzesComplete;

        sidebarContent.innerHTML = `
            <div class="tutorial-step-badge">Step ${this.currentStep + 1}/${this.steps.length}</div>
            <h3>${step.title}</h3>
            <div class="tutorial-body">${step.content}</div>
            
            ${quizHtml}

            <div class="tutorial-progress-container" style="background: var(--app-bg); padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px solid var(--app-border);">
                ${step.check ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: ${step.quizzes ? '8px' : '0'};">
                        ${this.getCheckmark(isTaskComplete)} 
                        <span style="${isTaskComplete ? 'color: var(--app-success); font-weight: 600;' : 'color: var(--app-muted);'}">
                            ${isTaskComplete ? "Task Complete" : "Pending Task Completion..."}
                        </span>
                    </div>
                ` : ''}
                
                ${step.quizzes ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px;">
                        ${this.getCheckmark(areQuizzesComplete)} 
                        <span style="${areQuizzesComplete ? 'color: var(--app-success); font-weight: 600;' : 'color: var(--app-muted);'}">
                            ${areQuizzesComplete ? "Quick Check Complete" : "Pending Quick Check..."}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            ${canProceed ? 
                (this.currentStep === this.steps.length - 1 ? 
                    `<button class="btn-primary full-width" onclick="Tutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="Tutorial.nextStep()">Next Step ➜</button>`
                ) : 
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }
        `;

        // Update Overlay/Spotlight
        if (step.targetId) {
            this.highlightElement(step.targetId);
        } else {
            this.hideOverlay();
        }

        // Run onEnter
        if (step.onEnter) step.onEnter();
    },

    checkQuiz(qIndex, selectedIndex) {
        const step = this.steps[this.currentStep];
        const quiz = step.quizzes[qIndex];
        const feedbackEl = document.getElementById(`quiz-feedback-${qIndex}`);
        
        if (parseInt(selectedIndex) === quiz.answer) {
            feedbackEl.style.display = 'block';
            feedbackEl.style.color = 'var(--app-success)';
            feedbackEl.textContent = quiz.feedback;
            step.quizState[qIndex].completed = true;
            
            // Re-render after a short delay to show the "Next" button state change
            setTimeout(() => this.updateView(), 1500);
        } else {
            feedbackEl.style.display = 'block';
            feedbackEl.style.color = 'var(--app-danger)';
            feedbackEl.textContent = "Not quite. Try again!";
        }
    },

    highlightElement(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const overlay = document.getElementById('tutorial-overlay');
        
        // We use a massive box shadow to create the "hole" effect
        // Or we can use 4 divs. Let's use the 4-div approach or SVG mask for better robustness
        // Actually, simple z-index manipulation is easiest:
        // 1. Overlay covers everything with semi-transparent black
        // 2. Target element gets z-index raised above overlay
        
        overlay.style.display = 'block';
        
        // Reset previous highlights
        document.querySelectorAll('.tutorial-highlight').forEach(e => {
            e.classList.remove('tutorial-highlight');
            e.style.position = '';
            e.style.zIndex = '';
        });

        // Highlight new target
        el.classList.add('tutorial-highlight');
        // We need to ensure it has a position context
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.position === 'static') {
            el.style.position = 'relative';
        }
        el.style.zIndex = '1001'; // Above overlay (1000)
    },

    hideOverlay() {
        document.getElementById('tutorial-overlay').style.display = 'none';
        document.querySelectorAll('.tutorial-highlight').forEach(e => {
            e.classList.remove('tutorial-highlight');
            e.style.zIndex = '';
        });
    },

    checkProgress() {
        if (!this.isActive) return;
        
        const step = this.steps[this.currentStep];
        if (step.check && step.check()) {
            this.updateView(); // Re-render to enable button
        }
    },

    getCheckmark(completed) {
        return completed ? 
            '<span style="color: var(--app-success); font-size: 1.2em;">✅</span>' : 
            '<span style="color: var(--app-muted); font-size: 1.2em;">⬜</span>';
    },

    renderSidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>👨‍🏫 Professor Mode</h2>
                <button onclick="Tutorial.stop()" class="close-tutorial">×</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(sidebar);
    },

    renderOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        document.body.appendChild(overlay);
    },

    attachListeners() {
        // Listen for guided mode toggle
        const toggle = document.getElementById('guidedMode');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.start();
                } else {
                    this.stop();
                }
            });
        }

        // Poll for progress checks (simple way to catch all state changes)
        setInterval(() => this.checkProgress(), 500);
    }
};

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    // Wait a moment for other scripts to init
    setTimeout(() => Tutorial.init(), 500);
});
