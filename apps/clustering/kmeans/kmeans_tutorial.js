// K-Means Clustering Tutorial - Professor Mode Implementation

const KMeansTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to k-Means Clustering",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This guided tutorial will teach you how to segment customers or campaigns using k-means clustering.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>Understanding cluster analysis concepts</li>
                    <li>Loading and preparing data</li>
                    <li>Choosing the number of clusters (k)</li>
                    <li>Using the elbow and silhouette diagnostics</li>
                    <li>Interpreting cluster profiles</li>
                    <li>Drawing actionable business insights</li>
                </ol>
                
                <p><strong>Why k-Means?</strong> When you have numeric data about customers, products, or campaigns, k-means helps you discover natural groupings. These segments can drive targeted marketing strategies, personalized messaging, and resource allocation decisions.</p>
            `,
            quizzes: [
                {
                    question: "What is the primary goal of k-means clustering?",
                    options: [
                        "Predict a continuous outcome variable",
                        "Partition observations into groups with similar characteristics",
                        "Test whether two groups have different means"
                    ],
                    answer: 1,
                    feedback: "Correct! K-means is an unsupervised method that partitions data into k clusters where observations within each cluster are similar to each other."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding k-Means",
            targetId: 'tut-overview-section',
            content: `
                <p>Before we cluster data, let's understand what k-means does.</p>
                
                <p><strong>The key insight:</strong> k-means minimizes within-cluster variation by iteratively:</p>
                <ol>
                    <li><strong>Assigning</strong> each observation to its nearest centroid</li>
                    <li><strong>Updating</strong> centroids to be the mean of assigned observations</li>
                    <li><strong>Repeating</strong> until assignments stabilize</li>
                </ol>
                
                <p><strong>Key concepts:</strong></p>
                <ul>
                    <li><strong>Centroid:</strong> The center (mean) of a cluster</li>
                    <li><strong>WCSS:</strong> Within-cluster sum of squares—lower is tighter clusters</li>
                    <li><strong>Silhouette:</strong> How well-separated clusters are (-1 to 1, higher is better)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>Overview & Objective</strong> section. Note the mathematical formula for what k-means minimizes.</p>
            `,
            quizzes: [
                {
                    question: "What does a centroid represent in k-means?",
                    options: [
                        "The observation farthest from other clusters",
                        "The mean (average) position of all observations in a cluster",
                        "The first observation assigned to a cluster"
                    ],
                    answer: 1,
                    feedback: "Correct! The centroid is the mean vector of all observations assigned to that cluster—it represents the 'typical' member of that segment."
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
            title: "📥 Step 2: Load Data",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now let's load some customer data to segment.</p>
                
                <p><strong>The tool offers two options:</strong></p>
                <ul>
                    <li><strong>Upload CSV:</strong> Your own numeric data with headers</li>
                    <li><strong>Demo dataset:</strong> Pre-built marketing scenarios</li>
                </ul>
                
                <p><strong>Or use a scenario:</strong> The dropdown at the top provides realistic marketing datasets like Customer RFM Segmentation or Email Campaign Performance.</p>
                
                <p class="task">👉 <strong>Task:</strong> Either load the <strong>demo dataset</strong> or select a <strong>scenario</strong> from the dropdown. Watch the feature checkboxes populate after data loads.</p>
            `,
            quizzes: [
                {
                    question: "What type of data does k-means require?",
                    options: [
                        "Only categorical variables (like region, tier)",
                        "Only numeric variables (like spend, frequency)",
                        "A mix of numeric and categorical variables"
                    ],
                    answer: 1,
                    feedback: "Correct! K-means requires numeric data because it calculates distances and means. For mixed data types, you'd use k-prototypes instead."
                }
            ],
            check: () => {
                // Check if data is loaded by looking for feature checkboxes
                const checkboxContainer = document.getElementById('kmeans-feature-checkboxes');
                return checkboxContainer && checkboxContainer.children.length > 0;
            },
            onEnter: () => {
                const section = document.getElementById('tut-inputs-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'select-features',
            title: "🎯 Step 3: Select Features",
            targetId: 'tut-inputs-section',
            content: `
                <p>Now choose which variables will define your segments.</p>
                
                <p><strong>Feature selection matters:</strong></p>
                <ul>
                    <li>Include variables that <em>should</em> differentiate segments</li>
                    <li>Variables on different scales may need standardization</li>
                    <li>More features = more complex clusters (not always better)</li>
                </ul>
                
                <p><strong>Standardization options:</strong></p>
                <ul>
                    <li><strong>Z-scores (recommended):</strong> Mean=0, SD=1—equalizes variable influence</li>
                    <li><strong>Min-max:</strong> Rescales to 0-100</li>
                    <li><strong>None:</strong> Uses original scales (risky if scales differ)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Ensure at least 2-3 features are checked. Keep standardization on "z-scores" (default). Set k to 3 clusters to start.</p>
            `,
            quizzes: [
                {
                    question: "Why is standardization (z-scores) typically recommended for k-means?",
                    options: [
                        "It makes the algorithm run faster",
                        "It ensures variables on different scales contribute equally to distances",
                        "It guarantees perfectly round clusters"
                    ],
                    answer: 1,
                    feedback: "Correct! Without standardization, variables with larger scales (e.g., revenue in thousands) would dominate distance calculations over smaller-scale variables (e.g., satisfaction 1-5)."
                }
            ],
            check: () => {
                const checkboxes = document.querySelectorAll('#kmeans-feature-checkboxes input[type="checkbox"]:checked');
                return checkboxes.length >= 2;
            },
            onEnter: () => {
                const section = document.getElementById('tut-inputs-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'run-clustering',
            title: "▶️ Step 4: Run Clustering",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's run the k-means algorithm!</p>
                
                <p><strong>What happens when you click "Run":</strong></p>
                <ol>
                    <li>The algorithm randomly initializes k centroids</li>
                    <li>Each observation is assigned to its nearest centroid</li>
                    <li>Centroids are recalculated as cluster means</li>
                    <li>Steps 2-3 repeat until convergence</li>
                    <li>Diagnostics are computed for a range of k values</li>
                </ol>
                
                <p class="task">👉 <strong>Task:</strong> Click the <strong>"Run clustering & update charts"</strong> button. Watch the visualizations and summary panels populate.</p>
            `,
            quizzes: [
                {
                    question: "What does 'convergence' mean in k-means?",
                    options: [
                        "The algorithm has run exactly 100 iterations",
                        "Cluster assignments no longer change between iterations",
                        "All observations are in one cluster"
                    ],
                    answer: 1,
                    feedback: "Correct! Convergence occurs when the algorithm reaches a stable state—reassigning observations doesn't change any cluster memberships."
                }
            ],
            check: () => {
                // Check if scatter chart has content
                const scatter = document.getElementById('kmeans-scatter');
                return scatter && scatter.querySelector('.js-plotly-plot');
            },
            onEnter: () => {
                const runBtn = document.getElementById('kmeans-run');
                if (runBtn) runBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-scatter',
            title: "📊 Step 5: Read the Cluster Map",
            targetId: 'tut-visual-section',
            content: `
                <p>The scatterplot shows your observations colored by cluster assignment.</p>
                
                <p><strong>What to look for:</strong></p>
                <ul>
                    <li><strong>Colors:</strong> Each color represents a different cluster</li>
                    <li><strong>Large markers:</strong> These are centroids (cluster centers)</li>
                    <li><strong>Separation:</strong> Do clusters form distinct groups or overlap?</li>
                    <li><strong>Outliers:</strong> Points far from their centroid may be edge cases</li>
                </ul>
                
                <p><strong>Important:</strong> This is a 2D projection. Clusters may look overlapping on these axes but be well-separated in the full feature space (all selected variables).</p>
                
                <p class="task">👉 <strong>Task:</strong> Examine the cluster map. Can you visually identify the different segments? Note which axis seems to best separate the clusters.</p>
            `,
            getDynamicQuizzes: () => {
                const state = window.lastClusteringState;
                if (!state || !state.assignments) return null;
                
                const k = new Set(state.assignments).size;
                const n = state.assignments.length;
                
                return [
                    {
                        question: `Looking at the cluster map, how many clusters (k) are shown?`,
                        options: [
                            `${k - 1} clusters`,
                            `${k} clusters`,
                            `${k + 1} clusters`
                        ],
                        answer: 1,
                        feedback: `Correct! The visualization shows ${k} distinct clusters, each represented by a different color.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What do the large markers on the scatterplot represent?",
                    options: [
                        "Outlier observations",
                        "Cluster centroids (centers)",
                        "The most important customers"
                    ],
                    answer: 1,
                    feedback: "Correct! The larger markers show the centroids—the mean position of each cluster in the feature space."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-elbow',
            title: "📈 Step 6: Use the Elbow Chart",
            targetId: 'tut-visual-section',
            content: `
                <p>The elbow chart helps you choose the "right" number of clusters.</p>
                
                <p><strong>How to read it:</strong></p>
                <ul>
                    <li><strong>X-axis:</strong> Number of clusters (k)</li>
                    <li><strong>Y-axis:</strong> Within-cluster sum of squares (WCSS)—total "compactness"</li>
                    <li><strong>Look for the elbow:</strong> Where the curve bends and WCSS drops less steeply</li>
                </ul>
                
                <p><strong>The intuition:</strong> Adding more clusters always reduces WCSS (more groups = tighter fit), but at some point you're just fragmenting natural groups. The "elbow" suggests where additional clusters provide diminishing returns.</p>
                
                <p class="task">👉 <strong>Task:</strong> Look at the elbow chart. Identify where the curve bends—that's often a good choice for k.</p>
            `,
            quizzes: [
                {
                    question: "What does the 'elbow' in an elbow chart indicate?",
                    options: [
                        "The point where k-means fails to converge",
                        "The point where adding more clusters provides diminishing returns",
                        "The point where all clusters have equal size"
                    ],
                    answer: 1,
                    feedback: "Correct! The elbow represents the point of diminishing returns—beyond this, adding clusters doesn't substantially improve cluster compactness."
                }
            ],
            check: () => true,
            onEnter: () => {
                const elbow = document.getElementById('kmeans-elbow');
                if (elbow) elbow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-silhouette',
            title: "📊 Step 7: Check Silhouette Scores",
            targetId: 'tut-visual-section',
            content: `
                <p>The silhouette score measures how well-defined your clusters are.</p>
                
                <p><strong>How to interpret silhouette values:</strong></p>
                <ul>
                    <li><strong>0.7 to 1.0:</strong> Strong cluster structure</li>
                    <li><strong>0.5 to 0.7:</strong> Reasonable structure</li>
                    <li><strong>0.25 to 0.5:</strong> Weak structure, clusters may overlap</li>
                    <li><strong>Below 0.25:</strong> No substantial structure found</li>
                </ul>
                
                <p><strong>Key insight:</strong> Higher silhouette values indicate observations are much closer to their own cluster than to neighboring clusters. Use this alongside the elbow chart to pick k.</p>
                
                <p class="task">👉 <strong>Task:</strong> Look at the silhouette diagnostics. What's the average silhouette score for your current k? Is it above 0.5?</p>
            `,
            getDynamicQuizzes: () => {
                const silEl = document.getElementById('kmeans-metric-silhouette');
                if (!silEl) return null;
                
                const silText = silEl.textContent.trim();
                const silValue = parseFloat(silText);
                
                if (isNaN(silValue)) return null;
                
                let interpretation;
                if (silValue >= 0.7) interpretation = "strong";
                else if (silValue >= 0.5) interpretation = "reasonable";
                else if (silValue >= 0.25) interpretation = "weak";
                else interpretation = "poor";
                
                return [
                    {
                        question: `The silhouette score of ${silValue.toFixed(3)} indicates what about cluster quality?`,
                        options: [
                            "Strong, well-separated clusters",
                            "Reasonable cluster structure",
                            "Weak structure with overlapping clusters",
                            "No meaningful cluster structure"
                        ],
                        answer: interpretation === "strong" ? 0 : interpretation === "reasonable" ? 1 : interpretation === "weak" ? 2 : 3,
                        feedback: `Correct! A silhouette of ${silValue.toFixed(3)} indicates ${interpretation} cluster structure.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "A silhouette score of -0.2 would indicate:",
                    options: [
                        "Perfectly separated clusters",
                        "Some observations are likely assigned to the wrong cluster",
                        "The optimal number of clusters has been found"
                    ],
                    answer: 1,
                    feedback: "Correct! Negative silhouette values mean some observations are closer to a neighboring cluster than their assigned cluster—suggesting potential misassignment."
                }
            ],
            check: () => true,
            onEnter: () => {
                const silhouette = document.getElementById('kmeans-silhouette');
                if (silhouette) silhouette.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret-profiles',
            title: "📋 Step 8: Interpret Cluster Profiles",
            targetId: 'tut-results-section',
            content: `
                <p>The cluster profile table shows the "typical" member of each segment.</p>
                
                <p><strong>What the table shows:</strong></p>
                <ul>
                    <li><strong>Size:</strong> Number of observations in each cluster</li>
                    <li><strong>Feature means:</strong> Average values for each variable—this defines the segment</li>
                    <li><strong>Within-cluster SD:</strong> How variable members are on each metric</li>
                    <li><strong>Avg distance to centroid:</strong> Overall cluster tightness</li>
                </ul>
                
                <p><strong>Naming your segments:</strong> Use the feature means to create descriptive labels. For example: "High-Value Power Users" (high spend, high engagement) vs. "Price-Sensitive Occasional Buyers" (low spend, low frequency).</p>
                
                <p class="task">👉 <strong>Task:</strong> Examine the cluster profile table. Can you describe what makes each cluster distinct? Think about what business label you'd give each segment.</p>
            `,
            getDynamicQuizzes: () => {
                const state = window.lastClusteringState;
                if (!state || !state.assignments) return null;
                
                // Count cluster sizes
                const counts = {};
                state.assignments.forEach(a => {
                    counts[a] = (counts[a] || 0) + 1;
                });
                
                const sizes = Object.values(counts);
                const maxSize = Math.max(...sizes);
                const minSize = Math.min(...sizes);
                
                return [
                    {
                        question: `What is the size of the largest cluster in your solution?`,
                        options: [
                            `${maxSize - 20} observations`,
                            `${maxSize} observations`,
                            `${maxSize + 20} observations`
                        ],
                        answer: 1,
                        feedback: `Correct! The largest cluster contains ${maxSize} observations. Cluster sizes help you understand segment prevalence.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is within-cluster standard deviation useful?",
                    options: [
                        "It tells you how different clusters are from each other",
                        "It tells you how similar members within a cluster are to each other",
                        "It tells you the total number of observations"
                    ],
                    answer: 1,
                    feedback: "Correct! Low within-cluster SD means members are homogeneous on that variable—easier to describe and target. High SD means more internal diversity."
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
            title: "💼 Step 9: Business Application",
            targetId: 'tut-results-section',
            content: `
                <p>Now let's connect cluster analysis to marketing action.</p>
                
                <p><strong>From segments to strategy:</strong></p>
                <ul>
                    <li><strong>High-value clusters:</strong> VIP treatment, retention focus, upsell opportunities</li>
                    <li><strong>At-risk clusters:</strong> Low engagement, declining metrics—reactivation campaigns</li>
                    <li><strong>Growth clusters:</strong> Medium value but high potential—nurture campaigns</li>
                </ul>
                
                <p><strong>Questions to ask:</strong></p>
                <ul>
                    <li>How should messaging differ across segments?</li>
                    <li>Which segments justify personalized treatment vs. mass marketing?</li>
                    <li>Are the clusters stable over time, or should you re-segment periodically?</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Read the Managerial Interpretation panel. Does it suggest actionable next steps for each segment?</p>
            `,
            quizzes: [
                {
                    question: "After identifying customer segments, what's typically the next step?",
                    options: [
                        "Run more clusters until silhouette reaches 1.0",
                        "Develop differentiated marketing strategies for each segment",
                        "Remove all outliers and re-cluster"
                    ],
                    answer: 1,
                    feedback: "Correct! The value of segmentation is in tailored action—different messages, offers, channels, or retention strategies for each cluster."
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
                <p>Excellent work! You've mastered the fundamentals of k-means clustering.</p>
                
                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>K-means purpose:</strong> Partition numeric data into k similar groups</li>
                    <li><strong>Centroids:</strong> Cluster centers representing the "typical" member</li>
                    <li><strong>Elbow method:</strong> Find k where adding clusters shows diminishing returns</li>
                    <li><strong>Silhouette scores:</strong> Measure cluster separation quality</li>
                    <li><strong>Feature standardization:</strong> Equalize variable influence on distances</li>
                    <li><strong>Cluster profiles:</strong> Use means to name and describe segments</li>
                </ul>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    K-means is a powerful starting point, but it has important limitations: it assumes roughly spherical clusters, is sensitive to outliers and initialization, and requires you to pre-specify k. Real-world customer data often violates these assumptions—segments may have irregular shapes, overlap substantially, or vary in density. Professional analysts often complement k-means with hierarchical clustering (no fixed k), DBSCAN (handles irregular shapes), or Gaussian mixture models (probabilistic assignments). They also validate segments with holdout data and track stability over time. As you advance, remember that the "best" segmentation isn't always the one with highest silhouette—it's the one that drives actionable, differentiated marketing strategies.
                </p>
                
                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Try different values of k and compare silhouette scores</li>
                    <li>Experiment with different feature combinations</li>
                    <li>Download the clustered dataset to analyze segments in Excel</li>
                    <li>Explore k-prototypes for mixed numeric/categorical data</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Try the k-Prototypes tool for datasets with both numeric and categorical variables, or explore regression tools to predict outcomes using segment membership as a predictor!
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
                    tool_slug: 'kmeans-clustering',
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
                <button class="btn-secondary" onclick="KMeansTutorial.prevStep()" 
                    ${this.currentStep === 0 ? 'disabled' : ''}>← Back</button>
                <button class="btn-primary" onclick="KMeansTutorial.nextStep()" 
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
    KMeansTutorial.init();
});
