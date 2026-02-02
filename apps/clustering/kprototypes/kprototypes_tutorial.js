// K-Prototypes Clustering Tutorial - Professor Mode Implementation

const KPrototypesTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to k-Prototypes Clustering",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This guided tutorial teaches you how to segment customers or products using k-prototypes—a powerful method for mixed data types.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>Understanding mixed data clustering</li>
                    <li>The difference between k-means and k-prototypes</li>
                    <li>How to assign variable types (continuous vs. categorical)</li>
                    <li>The role of gamma (γ) in balancing variable influence</li>
                    <li>Interpreting cluster profiles with modes and means</li>
                    <li>Making business recommendations from segments</li>
                </ol>
                
                <p><strong>Why k-Prototypes?</strong> Real marketing data is messy—customers have numeric attributes (spend, tenure) <em>and</em> categorical attributes (region, tier, acquisition channel). K-means can't handle the text; k-prototypes can!</p>
            `,
            quizzes: [
                {
                    question: "What type of data can k-prototypes handle that k-means cannot?",
                    options: [
                        "Time-series data with trends",
                        "Mixed numeric and categorical variables together",
                        "Missing values in the dataset"
                    ],
                    answer: 1,
                    feedback: "Correct! K-prototypes extends k-means by combining Euclidean distance for continuous variables with simple matching for categorical variables—handling both in one algorithm."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: How k-Prototypes Works",
            targetId: 'tut-overview-section',
            content: `
                <p>Let's understand what makes k-prototypes special.</p>
                
                <p><strong>The key formula:</strong></p>
                <p style="background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace;">
                    d(X, Q) = Σ(continuous)(x_j - q_j)² + <strong>γ</strong> × Σ(categorical)δ(x_j, q_j)
                </p>
                
                <p><strong>Breaking this down:</strong></p>
                <ul>
                    <li><strong>Continuous part:</strong> Standard squared distance (like k-means)</li>
                    <li><strong>Categorical part:</strong> Simple mismatch counting (0 if same, 1 if different)</li>
                    <li><strong>γ (gamma):</strong> Controls how much categorical mismatches "cost" relative to numeric distance</li>
                </ul>
                
                <p><strong>Cluster prototypes contain:</strong></p>
                <ul>
                    <li>Means for continuous variables (like k-means centroids)</li>
                    <li>Modes (most frequent values) for categorical variables</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the highlighted Overview section. Note the distance formula and how γ balances variable types.</p>
            `,
            quizzes: [
                {
                    question: "What does γ (gamma) control in k-prototypes?",
                    options: [
                        "The number of clusters to search for",
                        "The relative weight of categorical vs. continuous variables in distance",
                        "The convergence threshold for stopping the algorithm"
                    ],
                    answer: 1,
                    feedback: "Correct! Higher γ gives categorical variables more influence; lower γ prioritizes continuous variables. The default auto-calculation usually works well, but you can tune it."
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
            title: "📥 Step 2: Load Mixed Data",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's load a dataset with both numeric and categorical columns.</p>
                
                <p><strong>Data requirements:</strong></p>
                <ul>
                    <li><strong>Continuous:</strong> Numeric columns (spend, age, frequency)</li>
                    <li><strong>Categorical:</strong> Text labels (region, tier, channel)</li>
                    <li>Include a header row with column names</li>
                </ul>
                
                <p><strong>The tool auto-detects types:</strong> Columns with numbers become "continuous"; columns with text become "categorical." You can override these assignments after loading.</p>
                
                <p class="task">👉 <strong>Task:</strong> Click <strong>"Load demo dataset"</strong> or upload your own CSV with mixed data types. Watch the variable assignment panel appear.</p>
            `,
            quizzes: [
                {
                    question: "How does k-prototypes auto-detect variable types?",
                    options: [
                        "It uses machine learning to classify each column",
                        "Numeric columns → continuous; text columns → categorical",
                        "You must manually specify every variable type"
                    ],
                    answer: 1,
                    feedback: "Correct! The tool examines column values—if they're all numbers, it's continuous; if there's text, it's categorical. You can override this auto-detection."
                }
            ],
            check: () => {
                const varPanel = document.getElementById('variable-assignment-panel');
                return varPanel && !varPanel.classList.contains('hidden');
            },
            onEnter: () => {
                const section = document.getElementById('tut-inputs-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'assign-types',
            title: "🏷️ Step 3: Assign Variable Types",
            targetId: 'variable-assignment-panel',
            content: `
                <p>The variable assignment panel lets you control which columns are used and how.</p>
                
                <p><strong>For each variable, you can:</strong></p>
                <ul>
                    <li><strong>Include/exclude:</strong> Check or uncheck to include in clustering</li>
                    <li><strong>Change type:</strong> Override auto-detected continuous/categorical assignment</li>
                </ul>
                
                <p><strong>When to override type detection:</strong></p>
                <ul>
                    <li>Numeric codes (1, 2, 3) that represent categories → set to categorical</li>
                    <li>Zip codes, ID numbers → usually exclude or set categorical</li>
                    <li>True metrics (revenue, count) → keep continuous</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Review the detected variable types. Make sure continuous metrics (like spend) are marked continuous and attributes (like region) are categorical.</p>
            `,
            quizzes: [
                {
                    question: "A column with values 1, 2, 3 representing 'Low', 'Medium', 'High' customer value should be treated as:",
                    options: [
                        "Continuous—they're numbers",
                        "Categorical—they represent distinct categories",
                        "Excluded—k-prototypes can't handle this"
                    ],
                    answer: 1,
                    feedback: "Correct! Even though the values are numeric, they represent ordered categories. Treating them as continuous would imply that '3' is three times as much as '1', which isn't meaningful for categories."
                }
            ],
            check: () => true,
            onEnter: () => {
                const varPanel = document.getElementById('variable-assignment-panel');
                if (varPanel) varPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'configure-settings',
            title: "⚙️ Step 4: Configure Clustering Settings",
            targetId: 'tut-inputs-section',
            content: `
                <p>Set up the clustering parameters before running.</p>
                
                <p><strong>Key settings:</strong></p>
                <ul>
                    <li><strong>Feature scaling:</strong> Z-scores recommended for continuous variables with different scales</li>
                    <li><strong>Number of clusters (k):</strong> Start with 3-4; use diagnostics to refine</li>
                    <li><strong>Diagnostic range:</strong> Test k from 2 to 8 to find optimal k</li>
                </ul>
                
                <p><strong>About gamma (γ):</strong></p>
                <ul>
                    <li><strong>Auto mode (default):</strong> Uses average SD of continuous features—usually works well</li>
                    <li><strong>Manual override:</strong> Increase if segments should differ more on categorical attributes</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Keep scaling on "z-scores" and k=3. Leave gamma on auto. Then click <strong>"Run clustering"</strong>.</p>
            `,
            quizzes: [
                {
                    question: "Why is standardization (z-scores) important when continuous variables have different scales?",
                    options: [
                        "It makes the algorithm converge faster",
                        "It prevents variables with larger scales from dominating distance calculations",
                        "It converts all variables to categorical"
                    ],
                    answer: 1,
                    feedback: "Correct! Without standardization, a variable like 'annual spend' (0-10,000) would completely overshadow 'satisfaction' (1-5) in distance calculations."
                }
            ],
            check: () => {
                const parallelPlot = document.getElementById('plot-parallel-coords');
                return parallelPlot && parallelPlot.querySelector('.js-plotly-plot');
            },
            onEnter: () => {
                const runBtn = document.getElementById('kproto-run');
                if (runBtn) runBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-parallel',
            title: "📊 Step 5: Read the Parallel Coordinates Plot",
            targetId: 'tut-visual-section',
            content: `
                <p>The parallel coordinates plot shows all observations across all variables.</p>
                
                <p><strong>How to read it:</strong></p>
                <ul>
                    <li><strong>Each vertical axis:</strong> One variable</li>
                    <li><strong>Each line:</strong> One observation (customer/product)</li>
                    <li><strong>Colors:</strong> Cluster assignments</li>
                    <li><strong>Bundles:</strong> Lines of the same color that stay close together indicate similar profiles</li>
                </ul>
                
                <p><strong>What to look for:</strong></p>
                <ul>
                    <li>Do clusters separate cleanly on certain axes?</li>
                    <li>Which variables show the biggest differences between clusters?</li>
                    <li>Are there crossing patterns suggesting overlapping segments?</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Examine the parallel coordinates plot. Identify which variables seem to best differentiate the clusters.</p>
            `,
            getDynamicQuizzes: () => {
                const state = window.lastClusteringState;
                if (!state || !state.assignments) return null;
                
                const k = new Set(state.assignments).size;
                
                return [
                    {
                        question: `How many clusters are shown in the parallel coordinates plot?`,
                        options: [
                            `${k - 1} clusters`,
                            `${k} clusters`,
                            `${k + 1} clusters`
                        ],
                        answer: 1,
                        feedback: `Correct! The plot shows ${k} distinct color-coded clusters, with each line representing one observation.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "In a parallel coordinates plot, what does it mean when lines of the same color stay bundled together?",
                    options: [
                        "Those observations are outliers",
                        "Those observations have similar profiles across variables",
                        "The algorithm failed to separate those observations"
                    ],
                    answer: 1,
                    feedback: "Correct! Tight bundles of same-colored lines indicate cluster members with similar values across multiple variables—a sign of a well-defined, homogeneous segment."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-diagnostics',
            title: "📈 Step 6: Use the Elbow & Silhouette Charts",
            targetId: 'tut-visual-section',
            content: `
                <p>The diagnostic charts help you choose the optimal number of clusters.</p>
                
                <p><strong>Elbow chart (Total Cost):</strong></p>
                <ul>
                    <li>Cost = continuous distances + γ × categorical mismatches</li>
                    <li>Look for the "elbow" where cost stops dropping sharply</li>
                    <li>Your selected k is highlighted</li>
                </ul>
                
                <p><strong>Silhouette chart:</strong></p>
                <ul>
                    <li><strong>&gt; 0.5:</strong> Good cluster separation</li>
                    <li><strong>0.25-0.5:</strong> Moderate structure</li>
                    <li><strong>&lt; 0.25:</strong> Overlapping or weak clusters</li>
                </ul>
                
                <p><strong>Using both together:</strong> Look for k where the elbow chart bends AND silhouette is reasonably high. There's often a trade-off—more clusters = lower cost but potentially lower silhouette.</p>
                
                <p class="task">👉 <strong>Task:</strong> Check the elbow and silhouette charts. Is your current k near the elbow? What's the silhouette score?</p>
            `,
            getDynamicQuizzes: () => {
                const silEl = document.getElementById('metric-silhouette');
                if (!silEl) return null;
                
                const silText = silEl.textContent.trim();
                const silValue = parseFloat(silText);
                
                if (isNaN(silValue)) return null;
                
                let quality;
                if (silValue >= 0.5) quality = "good separation";
                else if (silValue >= 0.25) quality = "moderate structure";
                else quality = "weak or overlapping clusters";
                
                return [
                    {
                        question: `The silhouette score of ${silValue.toFixed(3)} suggests:`,
                        options: [
                            "Strong, well-separated clusters",
                            "Moderate cluster structure",
                            "Weak or overlapping clusters"
                        ],
                        answer: silValue >= 0.5 ? 0 : silValue >= 0.25 ? 1 : 2,
                        feedback: `Correct! A silhouette of ${silValue.toFixed(3)} indicates ${quality}. ${silValue < 0.25 ? "Consider trying different k values or adjusting gamma." : ""}`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is 'total cost' different from WCSS in k-means?",
                    options: [
                        "K-prototypes uses a different convergence criterion",
                        "Total cost includes both continuous distances AND categorical mismatches (weighted by γ)",
                        "K-prototypes doesn't minimize any objective function"
                    ],
                    answer: 1,
                    feedback: "Correct! K-prototypes minimizes a combined cost function: squared Euclidean distance for continuous features plus γ-weighted mismatch counts for categorical features."
                }
            ],
            check: () => true,
            onEnter: () => {
                const elbow = document.getElementById('plot-elbow');
                if (elbow) elbow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-profiles',
            title: "📋 Step 7: Interpret Cluster Profiles",
            targetId: 'tut-results-section',
            content: `
                <p>The cluster profile table shows the "prototype" of each segment.</p>
                
                <p><strong>Understanding prototypes:</strong></p>
                <ul>
                    <li><strong>Continuous variables:</strong> Show cluster means (averages)</li>
                    <li><strong>Categorical variables:</strong> Show cluster modes (most common category)</li>
                    <li><strong>Size:</strong> Number of observations in each cluster</li>
                </ul>
                
                <p><strong>Creating segment labels:</strong> Combine the key characteristics into a descriptive name:</p>
                <ul>
                    <li>"High-Spend Enterprise West Coast" (high spend, Enterprise tier, West region)</li>
                    <li>"Budget SMB East Coast Referrals" (low spend, SMB tier, East, referral channel)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Examine the cluster profile table. What makes each cluster distinctive? Can you name each segment based on its profile?</p>
            `,
            getDynamicQuizzes: () => {
                const state = window.lastClusteringState;
                if (!state || !state.assignments) return null;
                
                const counts = {};
                state.assignments.forEach(a => {
                    counts[a] = (counts[a] || 0) + 1;
                });
                
                const sizes = Object.values(counts);
                const maxSize = Math.max(...sizes);
                const minSize = Math.min(...sizes);
                
                return [
                    {
                        question: `What is the size difference between your largest and smallest clusters?`,
                        options: [
                            `${maxSize - minSize - 20} observations`,
                            `${maxSize - minSize} observations`,
                            `${maxSize - minSize + 20} observations`
                        ],
                        answer: 1,
                        feedback: `Correct! The largest cluster has ${maxSize} observations and the smallest has ${minSize}. ${maxSize > minSize * 3 ? "These imbalanced sizes might affect how you target each segment." : "The clusters are relatively balanced in size."}`
                    }
                ];
            },
            quizzes: [
                {
                    question: "For categorical variables, what does the 'mode' represent in cluster profiles?",
                    options: [
                        "The average of all category codes",
                        "The most frequently occurring category in that cluster",
                        "A randomly selected category from the cluster"
                    ],
                    answer: 1,
                    feedback: "Correct! The mode is the most common category among cluster members. If 60% of cluster 1 is 'West' region, the mode for region in cluster 1 is 'West'."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business-application',
            title: "💼 Step 8: Turn Segments into Strategy",
            targetId: 'tut-results-section',
            content: `
                <p>The real value of segmentation is in differentiated action.</p>
                
                <p><strong>Strategic questions for each segment:</strong></p>
                <ul>
                    <li>What messaging resonates with this segment's characteristics?</li>
                    <li>Which channels reach this segment most effectively?</li>
                    <li>What offers or products match their profile?</li>
                    <li>How much are they worth (LTV) and how much can we invest?</li>
                </ul>
                
                <p><strong>Segment-specific tactics:</strong></p>
                <ul>
                    <li><strong>High-value segments:</strong> VIP programs, retention focus, premium offerings</li>
                    <li><strong>Growth segments:</strong> Upsell campaigns, education, engagement programs</li>
                    <li><strong>At-risk segments:</strong> Reactivation, win-back offers, feedback surveys</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Pick your largest cluster. What one marketing action would you recommend based on its profile?</p>
            `,
            quizzes: [
                {
                    question: "A segment characterized as 'Low-Spend, SMB Tier, Referral Channel' would most likely benefit from:",
                    options: [
                        "VIP loyalty program with premium pricing",
                        "Referral incentive program and SMB-focused education content",
                        "Enterprise sales outreach with high-touch service"
                    ],
                    answer: 1,
                    feedback: "Correct! This segment responds to referrals and is cost-conscious. Amplifying referral programs and providing SMB-relevant content matches their profile and growth potential."
                }
            ],
            check: () => true,
            onEnter: () => {
                const table = document.getElementById('cluster-table-body');
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎓 Professor Mode Complete!",
            targetId: null,
            content: `
                <p>Excellent work! You've mastered k-prototypes clustering for mixed data.</p>
                
                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>K-prototypes vs k-means:</strong> Handles mixed continuous + categorical data</li>
                    <li><strong>Distance formula:</strong> Combines Euclidean distance with categorical mismatch</li>
                    <li><strong>Gamma (γ):</strong> Balances influence of continuous vs. categorical variables</li>
                    <li><strong>Variable types:</strong> Proper assignment affects clustering quality</li>
                    <li><strong>Cluster prototypes:</strong> Means for continuous, modes for categorical</li>
                    <li><strong>Segment activation:</strong> Translate profiles into marketing strategies</li>
                </ul>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    K-prototypes is a practical workhorse for marketing segmentation, but it has important limitations. The algorithm treats all categorical mismatches as equally important (region mismatch = tier mismatch), which may not reflect business reality. Gamma tuning requires experimentation—auto-calculated values work in most cases, but high-stakes analyses benefit from sensitivity testing across γ values. In practice, professional analysts often run multiple segmentation approaches (k-prototypes, latent class analysis, decision trees on engagement) and compare results. They also validate segments with holdout data and track segment stability over time—customers migrate between segments, and yesterday's "high-value" segment may not exist in next year's data. Finally, remember that the "best" segmentation isn't always the one with highest silhouette; it's the one that drives measurably different customer behaviors when you act on it.
                </p>
                
                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Download the cluster assignments and analyze in Excel</li>
                    <li>Try adjusting gamma to see how it changes segment composition</li>
                    <li>Experiment with different combinations of variables</li>
                    <li>Compare results with k-means (using only continuous variables)</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Explore the k-Means tool for purely numeric data, or try regression tools to predict outcomes using segment membership as a feature!
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
        
        // Track completion if reached final step
        if (this.currentStep >= this.steps.length - 1) {
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend({
                    tool_slug: 'kprototypes-clustering',
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

        // Remove old highlight
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight = null;
        }

        // Add new highlight
        if (step.targetId) {
            const target = document.getElementById(step.targetId);
            if (target) {
                target.classList.add('tutorial-highlight');
                this.currentHighlight = target;
            }
        }

        // Generate quizzes - ONCE and store them
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        step.currentQuizzes = quizzes;
        
        // Initialize quiz state
        if (!step.quizState) {
            step.quizState = quizzes.map(() => ({ answered: false, correct: false }));
        }

        // Build HTML
        let html = `
            <div class="tutorial-step-badge">Step ${this.currentStep + 1} of ${this.steps.length}</div>
            <h3>${step.title}</h3>
            <div class="tutorial-body">${step.content}</div>
        `;

        // Add quizzes
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

        // Navigation
        const allQuizzesAnswered = step.quizState.every(s => s.answered);
        const canProceed = allQuizzesAnswered && (step.check ? step.check() : true);
        
        html += `
            <div class="tutorial-nav" style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
                <button class="btn-secondary" onclick="KPrototypesTutorial.prevStep()" 
                    ${this.currentStep === 0 ? 'disabled' : ''}>← Back</button>
                <button class="btn-primary" onclick="KPrototypesTutorial.nextStep()" 
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

        // Add event listeners for quiz answers
        content.querySelectorAll('.tutorial-quiz input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const qIndex = parseInt(e.target.closest('.tutorial-quiz').dataset.quizIndex);
                const selectedIndex = parseInt(e.target.value);
                this.checkQuiz(qIndex, selectedIndex);
            });
        });

        // Call onEnter if defined
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    KPrototypesTutorial.init();
});
