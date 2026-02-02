/**
 * Sentiment Analysis Lab Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const SentimentTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    // Tutorial Steps
    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to Sentiment Analysis",
            targetId: null,
            content: `
                <p>Welcome! Today we're going to learn how to use <strong>VADER sentiment analysis</strong> to analyze text data for marketing insights.</p>
                <p><strong>The Mission:</strong> You'll learn to analyze customer feedback, reviews, or social media posts to understand overall sentiment and identify patterns.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Understanding Sentiment Analysis Concepts</li>
                    <li>Loading a Practice Dataset</li>
                    <li>Running the Analysis</li>
                    <li>Interpreting Summary Statistics</li>
                    <li>Understanding Token-Level Scoring</li>
                    <li>Exploring Distribution Patterns</li>
                    <li>Drawing Business Conclusions</li>
                    <li>Statistical Estimates Deep Dive</li>
                </ol>
                <p><strong>Why Sentiment Analysis?</strong> Instead of reading thousands of comments manually, sentiment analysis lets you quickly gauge whether customers are happy, frustrated, or neutral about your product or service.</p>
            `,
            quizzes: [
                {
                    question: "What is the primary purpose of sentiment analysis in marketing?",
                    options: [
                        "To count how many words are in each review",
                        "To automatically determine if text expresses positive, negative, or neutral opinions",
                        "To translate text into different languages"
                    ],
                    answer: 1,
                    feedback: "Correct! Sentiment analysis helps you automatically gauge the emotional tone of text at scale."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding VADER",
            targetId: 'tut-overview-section',
            content: `
                <p>Before we analyze data, let's understand how VADER works.</p>
                <p><strong>VADER</strong> (Valence Aware Dictionary and sEntiment Reasoner) is a rule-based sentiment analyzer designed for social media and informal text.</p>
                <p><strong>Key concepts to understand:</strong></p>
                <ul>
                    <li><strong>Lexicon-based:</strong> VADER uses a dictionary of ~7,500 words with pre-assigned sentiment scores</li>
                    <li><strong>Context-aware:</strong> It handles intensifiers ("very good"), negations ("not bad"), and punctuation ("great!!!")</li>
                    <li><strong>No training needed:</strong> Works out-of-the-box unlike machine learning approaches</li>
                </ul>
                <p><strong>Important limitations:</strong> Expand "When to Use Sentiment Analysis" to see cases where VADER may struggle (sarcasm, domain jargon, mixed sentiment).</p>
                <p class="task">👉 <strong>Task:</strong> Read through the highlighted <strong>Overview & Concepts</strong> section. Expand the "How VADER Works", "Understanding the Four Scores", and "When to Use Sentiment Analysis" details.</p>
            `,
            quizzes: [
                {
                    question: "What range does the VADER compound score use?",
                    options: [
                        "0 to 100",
                        "-1 to +1",
                        "1 to 5 stars"
                    ],
                    answer: 1,
                    feedback: "Correct! The compound score ranges from -1 (most negative) to +1 (most positive), with values near 0 being neutral."
                },
                {
                    question: "How does VADER classify a compound score of 0.03?",
                    options: [
                        "Positive (because it's above zero)",
                        "Neutral (because it's between -0.05 and +0.05)",
                        "Negative (because it's close to zero)"
                    ],
                    answer: 1,
                    feedback: "Correct! VADER uses thresholds: ≥0.05 is positive, ≤-0.05 is negative, and anything in between is neutral."
                },
                {
                    question: "Which of these is a known limitation of VADER sentiment analysis?",
                    options: [
                        "It can only analyze English text",
                        "It often misinterprets sarcasm and irony",
                        "It requires a GPU to run"
                    ],
                    answer: 1,
                    feedback: "Correct! Sarcasm like 'Oh great, another bug' appears positive to VADER because it sees 'great' without understanding the ironic context."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },
        {
            id: 'load_scenario',
            title: "📊 Step 2: Load a Practice Dataset",
            targetId: 'tut-scenario-section',
            content: `
                <p>Let's load a real-world marketing scenario to practice with.</p>
                <p><strong>Available scenarios:</strong></p>
                <ul>
                    <li><strong>Reddit Posts:</strong> University enrollment system feedback</li>
                    <li><strong>Swimwear Reviews:</strong> Influencer brand customer reviews</li>
                    <li><strong>Water Bottle Brands:</strong> Competitive sentiment comparison</li>
                </ul>
                <p>Each scenario includes text data with realistic customer language—including slang, punctuation emphasis, and mixed opinions.</p>
                <p class="task">👉 <strong>Task:</strong> Select the <strong>"Reddit Posts: University Enrollment System"</strong> scenario from the dropdown and wait for it to load.</p>
            `,
            quizzes: [
                {
                    question: "Why do we use scenario datasets for learning?",
                    options: [
                        "Real data helps you understand how sentiment analysis handles authentic language patterns",
                        "Synthetic data is always better",
                        "Scenarios are required before uploading your own data"
                    ],
                    answer: 0,
                    feedback: "Correct! Practice scenarios with realistic text help you understand VADER's behavior before applying it to your own data."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('sentiment-scenario-select');
                return scenarioSelect && scenarioSelect.value && scenarioSelect.value !== '';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'run_analysis',
            title: "▶️ Step 3: Run the Analysis",
            targetId: 'tut-input-section',
            content: `
                <p>With data loaded, we can now run sentiment analysis on all records.</p>
                <p><strong>What happens when you click "Run":</strong></p>
                <ol>
                    <li>Each text record is tokenized (split into words)</li>
                    <li>Each token is looked up in VADER's lexicon</li>
                    <li>Context rules adjust scores (intensifiers, negations, etc.)</li>
                    <li>Scores are normalized to produce compound, pos, neu, neg values</li>
                </ol>
                <p><strong>Notice the data options:</strong> You can see which column contains text, and optionally enable grouping to compare sentiment across categories.</p>
                <p class="task">👉 <strong>Task:</strong> Click the <strong>"Run sentiment analysis"</strong> button in the highlighted section.</p>
            `,
            quizzes: [
                {
                    question: "What does the 'text column' dropdown specify?",
                    options: [
                        "Which column in your CSV contains the text to analyze",
                        "The output format for results",
                        "The confidence level for analysis"
                    ],
                    answer: 0,
                    feedback: "Correct! When you upload a CSV, you tell the tool which column contains the text data you want to analyze."
                },
                {
                    question: "When would you enable 'Grouping' in the analysis options?",
                    options: [
                        "To make the analysis run faster",
                        "To compare sentiment across different categories (e.g., brands, products, time periods)",
                        "To remove outliers from your data"
                    ],
                    answer: 1,
                    feedback: "Correct! Grouping lets you compare sentiment across categories—like seeing which brand has the most positive reviews or how sentiment changed over time."
                }
            ],
            check: () => {
                return window.sentimentRows && window.sentimentRows.length > 0;
            },
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'summary_stats',
            title: "📈 Step 4: Interpret Summary Statistics",
            targetId: 'tut-summary-section',
            content: `
                <p>Excellent! The analysis is complete. Let's interpret the results.</p>
                <p><strong>Key metrics to examine:</strong></p>
                <ul>
                    <li><strong>Average compound score:</strong> The overall sentiment of your entire dataset</li>
                    <li><strong>Label distribution:</strong> How many records fall into positive, neutral, and negative categories</li>
                </ul>
                <p><strong>Reading the bar chart:</strong> The distribution shows the balance of opinions in your data. A dataset skewing green (positive) suggests overall satisfaction; skewing red (negative) suggests problems.</p>
                <p class="task">👉 <strong>Task:</strong> Look at the highlighted <strong>Summary & Visuals</strong> section. Note the average compound score and the distribution of sentiment labels.</p>
            `,
            getDynamicQuizzes: () => {
                if (!window.sentimentRows || window.sentimentRows.length === 0) return null;
                
                // Calculate stats
                let sumCompound = 0;
                let posCount = 0, neuCount = 0, negCount = 0;
                window.sentimentRows.forEach(row => {
                    sumCompound += row.scores.compound;
                    if (row.label === 'positive') posCount++;
                    else if (row.label === 'neutral') neuCount++;
                    else negCount++;
                });
                
                const avgCompound = sumCompound / window.sentimentRows.length;
                const n = window.sentimentRows.length;
                const pctPositive = ((posCount / n) * 100).toFixed(0);
                
                const overallSentiment = avgCompound >= 0.05 ? 'positive' : 
                                        avgCompound <= -0.05 ? 'negative' : 'neutral';
                
                return [
                    {
                        question: `The average compound score is ${avgCompound.toFixed(3)}. What does this indicate about overall sentiment?`,
                        options: [
                            overallSentiment === 'positive' ? "Overall positive sentiment (≥0.05)" : "Overall positive sentiment",
                            overallSentiment === 'neutral' ? "Overall neutral sentiment (between -0.05 and 0.05)" : "Overall neutral sentiment",
                            overallSentiment === 'negative' ? "Overall negative sentiment (≤-0.05)" : "Overall negative sentiment"
                        ],
                        answer: overallSentiment === 'positive' ? 0 : overallSentiment === 'neutral' ? 1 : 2,
                        feedback: `Correct! With an average compound of ${avgCompound.toFixed(3)}, the overall sentiment is ${overallSentiment}.`
                    },
                    {
                        question: `Looking at the label distribution, approximately what percentage of records are labeled positive?`,
                        options: [
                            `About ${Math.max(0, parseInt(pctPositive) - 15)}%`,
                            `About ${pctPositive}%`,
                            `About ${Math.min(100, parseInt(pctPositive) + 15)}%`
                        ],
                        answer: 1,
                        feedback: `Correct! ${pctPositive}% of records (${posCount} out of ${n}) are classified as positive.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does the average compound score represent?",
                    options: [
                        "The sentiment of the single most positive record",
                        "The mean sentiment across all analyzed records",
                        "The median sentiment score"
                    ],
                    answer: 1,
                    feedback: "Correct! The average compound score gives you the mean sentiment across your entire dataset."
                }
            ],
            check: () => {
                return window.sentimentRows && window.sentimentRows.length > 0;
            },
            onEnter: () => {
                const section = document.getElementById('tut-summary-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'token_breakdown',
            title: "🔍 Step 5: Understanding Token-Level Scoring",
            targetId: 'tut-worked-example',
            content: `
                <p>Now let's see exactly <em>how</em> VADER computes sentiment scores.</p>
                <p><strong>The worked examples show:</strong></p>
                <ul>
                    <li><strong>Each token:</strong> Individual words from the text</li>
                    <li><strong>Valence values:</strong> The sentiment score assigned to each word</li>
                    <li><strong>Modifiers:</strong> Adjustments from intensifiers, negations, caps, etc.</li>
                    <li><strong>Color coding:</strong> Green = positive, Red = negative, Gray = neutral</li>
                </ul>
                <p><strong>Why this matters:</strong> Understanding token-level scoring helps you diagnose why a record received its score—useful when you see surprising results.</p>
                <p class="task">👉 <strong>Task:</strong> Examine the two worked examples in the highlighted section. Note how different words contribute positive or negative valence, and how the final compound score is computed.</p>
            `,
            quizzes: [
                {
                    question: "In the token breakdown, what does a word shown in green with '+2.5' indicate?",
                    options: [
                        "The word is neutral but common",
                        "The word has positive sentiment valence contributing to the overall score",
                        "The word appears 2.5 times in the text"
                    ],
                    answer: 1,
                    feedback: "Correct! Green tokens with positive valence values (like 'excellent' or 'amazing') add to the positive sentiment score."
                },
                {
                    question: "Why might a sentence with some positive words still have a negative compound score?",
                    options: [
                        "VADER is broken",
                        "Negations (like 'not') can flip positive words, or negative words may outweigh positives",
                        "The compound score ignores word valences"
                    ],
                    answer: 1,
                    feedback: "Correct! Context matters—'not good' flips the sentiment, and stronger negative words can overpower weaker positives."
                },
                {
                    question: "How does VADER handle intensifiers like 'very' or 'extremely'?",
                    options: [
                        "It ignores them since they don't have sentiment on their own",
                        "It amplifies the sentiment of the following word (e.g., 'very good' is more positive than 'good')",
                        "It treats them as negative because they're exaggerations"
                    ],
                    answer: 1,
                    feedback: "Correct! Intensifiers (very, extremely, incredibly) boost the valence of adjacent sentiment words. 'Very good' scores higher than just 'good'."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-worked-example');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'distribution_charts',
            title: "📊 Step 6: Explore Distribution Patterns",
            targetId: 'tut-histogram-section',
            content: `
                <p>Individual records tell part of the story. The <strong>histogram</strong> reveals the full distribution.</p>
                <p><strong>Reading the histogram:</strong></p>
                <ul>
                    <li><strong>Bar height:</strong> Number of records in each score range</li>
                    <li><strong>Bar color:</strong> Green (positive), Gray (neutral), Red (negative)</li>
                    <li><strong>Shape:</strong> Skewed left = mostly negative, skewed right = mostly positive, centered = mixed or neutral</li>
                </ul>
                <p><strong>What to look for:</strong></p>
                <ul>
                    <li>Is sentiment clustered (most people feel similarly) or spread out (polarized opinions)?</li>
                    <li>Are there outliers at extreme ends worth investigating?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Scroll to the <strong>Sentiment Distribution: Histogram</strong> and examine the shape. Note whether opinions cluster together or spread across the range.</p>
            `,
            getDynamicQuizzes: () => {
                if (!window.sentimentRows || window.sentimentRows.length === 0) return null;
                
                const compounds = window.sentimentRows.map(r => r.scores.compound);
                const min = Math.min(...compounds);
                const max = Math.max(...compounds);
                const range = max - min;
                
                let posCount = 0, negCount = 0;
                window.sentimentRows.forEach(r => {
                    if (r.label === 'positive') posCount++;
                    else if (r.label === 'negative') negCount++;
                });
                
                const isPolarized = posCount > 3 && negCount > 3 && range > 1.0;
                const description = isPolarized ? 
                    "polarized (both strong positive and negative opinions)" : 
                    "clustered (most opinions are similar)";
                
                return [
                    {
                        question: `Looking at the histogram, would you describe this dataset's sentiment as polarized or clustered?`,
                        options: [
                            isPolarized ? "Polarized - opinions span a wide range" : "Clustered - opinions are fairly similar",
                            isPolarized ? "Clustered - everyone feels the same" : "Polarized - strong disagreement",
                            "Cannot determine from the histogram"
                        ],
                        answer: 0,
                        feedback: `Correct! The data appears ${description}, which you can see from the spread of bars across the histogram.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does a histogram with tall bars clustered near +0.5 to +1.0 indicate?",
                    options: [
                        "Most records have strongly negative sentiment",
                        "Most records have positive sentiment",
                        "Sentiment is evenly distributed"
                    ],
                    answer: 1,
                    feedback: "Correct! Bars clustered in the positive range (right side) indicate predominantly positive sentiment."
                },
                {
                    question: "If the histogram shows two distinct 'humps' (one around -0.5 and one around +0.7), what does this indicate?",
                    options: [
                        "The analysis is working incorrectly",
                        "Bimodal distribution—your audience is polarized with distinct positive and negative camps",
                        "Most customers are neutral about the product"
                    ],
                    answer: 1,
                    feedback: "Correct! A bimodal histogram suggests polarized opinions—two distinct groups with different sentiments. This often warrants segmenting your analysis to understand what drives each group."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-histogram-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business_insights',
            title: "💡 Step 7: Drawing Business Conclusions",
            targetId: 'tut-reports-panels',
            content: `
                <p>Now let's translate statistics into actionable insights.</p>
                <p><strong>The Analysis Report provides:</strong></p>
                <ul>
                    <li><strong>APA-Style Report:</strong> Statistical summary suitable for formal documentation</li>
                    <li><strong>Managerial Interpretation:</strong> Plain-language insights for business stakeholders</li>
                </ul>
                <p><strong>Key questions to answer:</strong></p>
                <ul>
                    <li>Is overall sentiment positive, negative, or mixed?</li>
                    <li>What's driving the sentiment? (Examine negative records for pain points)</li>
                    <li>Are there actionable insights for the business?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>APA-Style Report</strong> and <strong>Managerial Interpretation</strong> panels.</p>
            `,
            quizzes: [
                {
                    question: "Why is the 'Managerial Interpretation' useful alongside statistical reports?",
                    options: [
                        "It provides the same information in a more colorful format",
                        "It translates statistics into plain-language insights that non-technical stakeholders can act on",
                        "It's required for academic publications"
                    ],
                    answer: 1,
                    feedback: "Correct! Business stakeholders need actionable insights, not just numbers. The managerial interpretation bridges that gap."
                },
                {
                    question: "If 30% of reviews are negative with complaints about 'shipping delays', what should you recommend?",
                    options: [
                        "Ignore it since 70% are not negative",
                        "Investigate shipping processes and consider operational improvements",
                        "Remove negative reviews from the analysis"
                    ],
                    answer: 1,
                    feedback: "Correct! Sentiment analysis helps identify specific pain points that can drive operational improvements."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-reports-panels');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'statistical_summary',
            title: "📈 Step 8: Statistical Estimates Deep Dive",
            targetId: 'tut-summary-table',
            content: `
                <p>The <strong>Summary of Estimates</strong> table provides detailed statistics for rigorous analysis.</p>
                <p><strong>Understanding the metrics:</strong></p>
                <ul>
                    <li><strong>Mean:</strong> Average score—your central tendency measure</li>
                    <li><strong>Std Dev:</strong> How spread out scores are (high = polarized opinions)</li>
                    <li><strong>Min/Max:</strong> Your most extreme records—often worth investigating individually</li>
                </ul>
                <p><strong>What high standard deviation tells you:</strong> A high std dev means opinions are spread out—you may have both enthusiastic fans and vocal critics rather than moderate consensus.</p>
                <p class="task">👉 <strong>Task:</strong> Review the highlighted <strong>Summary of Estimates</strong> table. Look at the std dev to assess whether sentiment is clustered or spread out.</p>
            `,
            quizzes: [
                {
                    question: "What does a high standard deviation in compound scores indicate?",
                    options: [
                        "Everyone feels the same way about the product",
                        "Opinions are polarized—some very positive, some very negative",
                        "The analysis failed to process some records"
                    ],
                    answer: 1,
                    feedback: "Correct! High std dev indicates spread-out opinions. A mean of 0.2 with high std dev might have both enthusiastic +0.8 reviews AND harsh -0.5 reviews."
                },
                {
                    question: "If the Min compound score is -0.95, what should you do?",
                    options: [
                        "Delete it as an outlier to improve the mean",
                        "Investigate that record—extreme negative sentiment may reveal critical customer pain points",
                        "Assume it's an error since most records are positive"
                    ],
                    answer: 1,
                    feedback: "Correct! Extreme scores are opportunities to learn. A -0.95 review likely contains specific complaints worth addressing."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-summary-table');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎓 Professor Mode Complete!",
            targetId: null,
            content: `
                <p>Well done! You've learned the foundations of VADER sentiment analysis.</p>
                
                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>VADER basics:</strong> Lexicon-based sentiment scoring with context rules</li>
                    <li><strong>Four scores:</strong> Compound (overall), plus positive/neutral/negative proportions</li>
                    <li><strong>Thresholds:</strong> ≥0.05 positive, ≤-0.05 negative, else neutral</li>
                    <li><strong>Token analysis:</strong> How individual words contribute to the final score</li>
                    <li><strong>Distribution patterns:</strong> Using histograms to see sentiment spread</li>
                    <li><strong>Statistical measures:</strong> Mean, std dev, min/max for rigorous analysis</li>
                    <li><strong>Business application:</strong> Translating stats into actionable insights</li>
                </ul>
                
                <h4>� Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    VADER is a powerful starting point, but it's a rule-based dictionary approach—meaning it can't learn domain-specific language or detect contextual nuances like sarcasm, cultural references, or evolving slang. In professional settings, analysts often fine-tune transformer-based models (like BERT or RoBERTa) on their specific domain, incorporate <em>aspect-based</em> sentiment analysis to understand <strong>what</strong> customers feel positive or negative about (not just overall tone), and triangulate findings with qualitative research like customer interviews. As you advance, consider how sentiment analysis fits into a broader voice-of-customer program—one that combines quantitative signals with human interpretation and doesn't treat any single metric as the whole truth.
                </p>
                
                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Try the <strong>Water Bottle Brands</strong> scenario with grouping enabled</li>
                    <li>Upload your own data to analyze real customer feedback</li>
                    <li>Export results to CSV for further analysis</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Explore other text analysis tools on the site, including the Qualitative Analyzer and Theme Extractor for deeper insights!
                </p>
            `,
            check: () => true,
            onEnter: () => {
                SentimentTutorial.hideOverlay();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    ],

    init() {
        this.renderSidebar();
        this.renderOverlay();
        this.attachListeners();
        
        // Check initial state
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
        
        // Track completion if student finished all steps
        if (this.currentStep === this.steps.length - 1) {
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend(
                    { action: 'tutorial_completed', tool: 'sentiment-lab' },
                    'Professor Mode tutorial completed for Sentiment Analysis Lab'
                );
            }
        }
        
        // Uncheck the checkbox
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
        
        // Get dynamic quizzes if available
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        
        // Store current quizzes for consistency
        step.currentQuizzes = quizzes;
        
        // Update sidebar content
        const sidebarContent = document.getElementById('tutorial-content');
        
        let quizHtml = '';
        if (quizzes && quizzes.length > 0) {
            // Initialize quiz state if needed
            if (!step.quizState || step.quizState.length !== quizzes.length) {
                step.quizState = quizzes.map(() => ({ completed: false }));
            }

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
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="SentimentTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="SentimentTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="SentimentTutorial.nextStep()">Next Step ➜</button>`
                ) : 
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }
            
            <button class="btn-secondary full-width" onclick="SentimentTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
        `;

        // Handle highlighting
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
        
        // Use stored currentQuizzes for consistency
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
            
            // Re-render after delay
            setTimeout(() => this.updateView(), 1500);
        } else {
            feedbackEl.style.display = 'block';
            feedbackEl.style.color = '#ef4444';
            feedbackEl.textContent = "❌ Not quite. Try again!";
        }
    },

    highlightElement(elementId) {
        if (this.currentHighlight === elementId) return;
        
        const el = document.getElementById(elementId);
        if (!el) return;

        const overlay = document.getElementById('tutorial-overlay');
        overlay.style.display = 'block';
        
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
        
        this.currentHighlight = elementId;
    },

    hideOverlay() {
        document.getElementById('tutorial-overlay').style.display = 'none';
        document.querySelectorAll('.tutorial-highlight').forEach(e => {
            e.classList.remove('tutorial-highlight');
            e.style.zIndex = '';
        });
        this.currentHighlight = null;
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

    getCheckmark(completed) {
        return completed ? 
            '<span style="color: #10b981; font-size: 1.2em;">✅</span>' : 
            '<span style="color: #9ca3af; font-size: 1.2em;">⬜</span>';
    },

    renderSidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>👨‍🏫 Professor Mode</h2>
                <button onclick="SentimentTutorial.stop()" class="close-tutorial">×</button>
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
        // Listen for professor mode toggle
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

        // Poll for progress checks
        setInterval(() => this.checkProgress(), 500);
    }
};

// Make sentimentRows accessible globally for tutorial checks
window.sentimentRows = window.sentimentRows || [];

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => SentimentTutorial.init(), 500);
});
