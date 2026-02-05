/**
 * MAE Model Calibration Lab - Professor Mode Tutorial
 * Guided educational experience for understanding loss functions and model fitting
 * 
 * Dr. Baker's Marketing Analytics Tools
 */

const MAETutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        // ========== MODULE 1: WELCOME ==========
        {
            id: 'welcome',
            title: "Welcome to MAE Model Calibration",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to <strong>Professor Mode</strong>! This guided tutorial will teach you the fundamental concept behind ALL model fitting: minimizing error.</p>
                
                <h4>What You'll Learn</h4>
                <ol>
                    <li>What "fitting a model" actually means</li>
                    <li>How loss functions (like MAE) guide the process</li>
                    <li>Why we sometimes prefer simpler models</li>
                    <li>The difference between linear and quadratic fits</li>
                </ol>
                
                <h4>The Big Idea</h4>
                <p>Every regression, every machine learning algorithm, every neural network does fundamentally the same thing: <strong>search for parameters that minimize error</strong>. Today, you'll do it by hand.</p>
            `,
            quizzes: [
                {
                    question: "What is the core goal of 'fitting' a statistical model?",
                    options: [
                        "Making the model as complex as possible",
                        "Finding parameters that minimize some measure of error between predictions and actual data",
                        "Memorizing all the data points exactly"
                    ],
                    answer: 1,
                    feedback: "Correct! Model fitting = minimizing error. Whether you do it by hand or let an algorithm do it, the goal is the same."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 2: UNDERSTANDING MAE ==========
        {
            id: 'mae_concept',
            title: "What is Mean Absolute Error?",
            targetId: 'tut-math-section',
            content: `
                <p>Before adjusting parameters, let's understand our "scorecard": <strong>Mean Absolute Error (MAE)</strong>.</p>
                
                <h4>The Formula</h4>
                <p style="background: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; text-align: center;">
                    MAE = (1/N) × Σ|Actual - Predicted|
                </p>
                
                <h4>In Plain English</h4>
                <ol>
                    <li>For each data point, calculate: |Actual − Predicted|</li>
                    <li>Sum up all those absolute differences</li>
                    <li>Divide by the number of points</li>
                </ol>
                
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #2563eb; border-radius: 4px;">
                    <strong>Lower MAE = Better Fit.</strong> If MAE = 0, your predictions perfectly match reality.
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Read the Mathematical Foundations section. Note how MAE measures average prediction error.</p>
            `,
            quizzes: [
                {
                    question: "If your model predicts 100 but the actual value is 85, what is the absolute error for that point?",
                    options: [
                        "-15",
                        "15",
                        "85"
                    ],
                    answer: 1,
                    feedback: "Correct! |100 - 85| = 15. We use absolute value so errors don't cancel out (positive and negative errors both count)."
                },
                {
                    question: "Why do we take the ABSOLUTE value of errors?",
                    options: [
                        "To make the math easier",
                        "So that over-predictions and under-predictions don't cancel each other out",
                        "It's just a convention with no real purpose"
                    ],
                    answer: 1,
                    feedback: "Exactly! Without absolute value, predicting +10 too high and +10 too low would 'average' to 0 error, which hides the fact that both predictions were wrong."
                }
            ],
            check: () => true,
            onEnter: () => {
                // Open the math foundations details if closed
                const mathSection = document.getElementById('tut-math-section');
                if (mathSection) {
                    const details = mathSection.closest('details');
                    if (details && !details.open) {
                        details.open = true;
                    }
                    setTimeout(() => {
                        mathSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            }
        },

        // ========== MODULE 3: LOAD A SCENARIO ==========
        {
            id: 'load_scenario',
            title: "Load a Marketing Scenario",
            targetId: 'tut-scenario-section',
            content: `
                <p>Let's work with real marketing data. We have three scenarios with <strong>deliberately different patterns</strong>:</p>
                
                <h4>The Scenarios</h4>
                <ul>
                    <li><strong>Search Ads:</strong> Nearly linear relationship (simple works!)</li>
                    <li><strong>Email Frequency:</strong> Strong diminishing returns / peak</li>
                    <li><strong>Influencer Spend:</strong> Noisy data with visible curvature</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Select the <strong>"Search Ads Performance"</strong> scenario from the dropdown.</p>
                
                <p style="background: #fef3c7; padding: 10px; border-left: 3px solid #f59e0b; border-radius: 4px; margin-top: 10px;">
                    <strong>Why start here?</strong> Search ads data is nearly linear, which will let us see when a simple model is "good enough."
                </p>
            `,
            quizzes: [
                {
                    question: "Why are we starting with the Search Ads scenario?",
                    options: [
                        "It has the most data points",
                        "It's nearly linear, so we can see when the simpler model works well",
                        "It's the most interesting marketing problem"
                    ],
                    answer: 1,
                    feedback: "Correct! Starting with nearly linear data helps us understand parsimony: if a simple model fits well, we don't need complexity."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value === 'search-ads';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 4: FIT THE LINEAR MODEL ==========
        {
            id: 'fit_linear',
            title: "Fit the Linear Model",
            targetId: 'tut-linear-section',
            content: `
                <p>Now for the hands-on part! Your goal: <strong>minimize MAE</strong> by adjusting B₀ and B₁.</p>
                
                <h4>The Linear Model</h4>
                <p style="font-family: monospace; background: #f8fafc; padding: 10px; border-radius: 6px; text-align: center;">
                    Revenue = B₀ + B₁ × AdSpend
                </p>
                
                <h4>Parameter Guide</h4>
                <ul>
                    <li><strong>B₀ (Intercept):</strong> Where the line crosses Y when X = 0</li>
                    <li><strong>B₁ (Slope):</strong> How much Y increases per unit increase in X</li>
                </ul>
                
                <h4>Strategy</h4>
                <ol>
                    <li>First adjust B₁ (slope) to match the general trend direction</li>
                    <li>Then adjust B₀ (intercept) to shift the line up/down</li>
                    <li>Fine-tune both while watching MAE</li>
                </ol>
                
                <p class="task">👉 <strong>Task:</strong> Adjust B₀ and B₁ until you get MAE below <strong>18.0</strong>.</p>
            `,
            getDynamicQuizzes: () => {
                // Get current MAE from the app
                const maeEl = document.querySelector('#mae_linear .mae-value');
                const mae = maeEl ? parseFloat(maeEl.textContent) : null;
                
                if (!mae || isNaN(mae)) return null;
                
                return [
                    {
                        question: `Your current Linear MAE is ${mae.toFixed(2)}. What does this number represent?`,
                        options: [
                            "The R-squared of your model",
                            `On average, your predictions are off by about $${mae.toFixed(0)}`,
                            "The percentage of variance explained"
                        ],
                        answer: 1,
                        feedback: `Correct! MAE = ${mae.toFixed(2)} means your predictions are, on average, about $${mae.toFixed(0)} away from the actual values.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "If your linear MAE is 50 and you adjust B₁ (slope), what should you watch?",
                    options: [
                        "Whether the line gets longer",
                        "Whether the MAE goes up or down - down means you're going the right direction",
                        "The color of the line"
                    ],
                    answer: 1,
                    feedback: "Exactly! MAE is your compass. If it goes down, you're improving. If it goes up, try the other direction."
                }
            ],
            check: () => {
                const maeEl = document.querySelector('#mae_linear .mae-value');
                if (!maeEl) return false;
                const mae = parseFloat(maeEl.textContent);
                return !isNaN(mae) && mae < 18.0;
            },
            onEnter: () => {
                const section = document.getElementById('tut-linear-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 5: VISUALIZE THE ERRORS ==========
        {
            id: 'visualize_errors',
            title: "Understanding the Error Lines",
            targetId: 'tut-linear-section',
            content: `
                <p>Look at the chart. See those <strong>grey dotted lines</strong> connecting each point to the fit line?</p>
                
                <h4>What They Represent</h4>
                <p>Each grey line shows the <strong>absolute error</strong> for that data point:</p>
                <ul>
                    <li><strong>Length of line</strong> = magnitude of error</li>
                    <li><strong>Shorter lines</strong> = better predictions</li>
                    <li><strong>MAE</strong> = average length of all these lines</li>
                </ul>
                
                <h4>What to Notice</h4>
                <p>As you adjust parameters:</p>
                <ul>
                    <li>Watch how the error lines shrink and grow</li>
                    <li>Notice that reducing one error might increase another</li>
                    <li>The "best" fit minimizes the AVERAGE error across all points</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Observe how the error lines change as you fine-tune your parameters.</p>
            `,
            quizzes: [
                {
                    question: "If one data point has a very long error line, what does that tell you?",
                    options: [
                        "That data point is an outlier or the model predicts poorly for it",
                        "The model is working perfectly",
                        "You should delete that data point"
                    ],
                    answer: 0,
                    feedback: "Correct! A long error line means a big prediction error for that point. It could be an outlier, or it could indicate the model shape doesn't capture the true pattern."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-linear-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 6: FIT THE QUADRATIC MODEL ==========
        {
            id: 'fit_quadratic',
            title: "Now Try the Quadratic Model",
            targetId: 'tut-quadratic-section',
            content: `
                <p>Now let's fit a more flexible model. The quadratic adds <strong>curvature</strong>.</p>
                
                <h4>The Quadratic Model</h4>
                <p style="font-family: monospace; background: #f8fafc; padding: 10px; border-radius: 6px; text-align: center;">
                    Revenue = B₀ + B₁ × AdSpend + B₂ × AdSpend²
                </p>
                
                <h4>The New Parameter: B₂</h4>
                <ul>
                    <li><strong>B₂ > 0:</strong> Curve opens upward (accelerating returns)</li>
                    <li><strong>B₂ < 0:</strong> Curve opens downward (diminishing returns / peak)</li>
                    <li><strong>B₂ ≈ 0:</strong> Essentially a straight line</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Adjust B₀, B₁, and B₂ until you get the quadratic MAE below <strong>18.0</strong>.</p>
                
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #2563eb; border-radius: 4px; margin-top: 10px;">
                    <strong>Tip:</strong> For the Search Ads data, B₂ will probably be very small (close to 0) because the data is nearly linear.
                </p>
            `,
            getDynamicQuizzes: () => {
                const maeEl = document.querySelector('#mae_quadratic .mae-value');
                const mae = maeEl ? parseFloat(maeEl.textContent) : null;
                
                const b2El = document.getElementById('B2_quadratic_num');
                const b2 = b2El ? parseFloat(b2El.value) : null;
                
                if (!mae || isNaN(mae)) return null;
                
                return [
                    {
                        question: `Your quadratic MAE is ${mae.toFixed(2)}. For the Search Ads scenario, how does this compare to linear?`,
                        options: [
                            "It should be MUCH better (lower) than linear",
                            "It should be only slightly better or about the same as linear",
                            "It should be worse than linear"
                        ],
                        answer: 1,
                        feedback: "Correct! For nearly linear data, adding a quadratic term provides little benefit. This illustrates parsimony: don't add complexity if it doesn't help."
                    }
                ];
            },
            quizzes: [
                {
                    question: "The quadratic model has 3 parameters (B₀, B₁, B₂) while linear has only 2. Why might this be a disadvantage?",
                    options: [
                        "More parameters are always worse",
                        "More parameters can 'overfit' - fitting noise rather than the true pattern",
                        "More parameters make the math harder"
                    ],
                    answer: 1,
                    feedback: "Exactly! More parameters mean more flexibility, but also more risk of overfitting. We prefer simpler models when they work."
                }
            ],
            check: () => {
                const maeEl = document.querySelector('#mae_quadratic .mae-value');
                if (!maeEl) return false;
                const mae = parseFloat(maeEl.textContent);
                return !isNaN(mae) && mae < 18.0;
            },
            onEnter: () => {
                const section = document.getElementById('tut-quadratic-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 7: COMPARE TO OPTIMAL ==========
        {
            id: 'compare_optimal',
            title: "Compare to the Optimal Fit",
            targetId: 'tut-comparison-section',
            content: `
                <p>Now look at the <strong>Model Comparison</strong> section. This shows how your manual fit compares to the algorithmically optimal fit.</p>
                
                <h4>What "Optimal" Means</h4>
                <p>The "Optimal MAE" is what you'd get if a computer found the <em>exact best</em> parameters using calculus (specifically, Ordinary Least Squares regression).</p>
                
                <h4>The Gap</h4>
                <p>The "Gap" shows how far your manual fit is from optimal:</p>
                <ul>
                    <li><strong>Gap < 2:</strong> Excellent! You're very close to optimal.</li>
                    <li><strong>Gap 2-5:</strong> Good approximation.</li>
                    <li><strong>Gap > 5:</strong> Room for improvement.</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Look at the comparison section. How close did you get to optimal?</p>
            `,
            getDynamicQuizzes: () => {
                const userLinearEl = document.querySelector('#compare_mae_linear .mae-value');
                const optimalLinearEl = document.querySelector('#optimal_mae_linear .mae-value');
                
                const userMAE = userLinearEl ? parseFloat(userLinearEl.textContent) : null;
                const optimalMAE = optimalLinearEl ? parseFloat(optimalLinearEl.textContent) : null;
                
                if (!userMAE || !optimalMAE || isNaN(userMAE) || isNaN(optimalMAE)) return null;
                
                const gap = Math.abs(userMAE - optimalMAE);
                
                return [
                    {
                        question: `Your linear MAE is ${userMAE.toFixed(2)} vs optimal ${optimalMAE.toFixed(2)}. What does this comparison teach you?`,
                        options: [
                            "Manual fitting is pointless since computers do it better",
                            "You can get close to optimal by systematically minimizing error, which is exactly what algorithms do",
                            "The optimal is always wrong"
                        ],
                        answer: 1,
                        feedback: `Correct! You got within ${gap.toFixed(2)} of optimal by doing exactly what algorithms do: searching for parameters that minimize error. The computer just does it faster and finds the exact optimum.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "When you run lm() in R or LinearRegression() in Python, what is the computer doing?",
                    options: [
                        "Something completely different from what you just did",
                        "The same thing you did - finding parameters that minimize error - just using calculus to find the exact optimum",
                        "Making random guesses until something works"
                    ],
                    answer: 1,
                    feedback: "Exactly! The algorithm does the same search you did, but uses mathematical optimization (calculus) to find the precise minimum in one step."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-comparison-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 8: PARSIMONY - LINEAR VS QUADRATIC ==========
        {
            id: 'parsimony',
            title: "The Principle of Parsimony",
            targetId: 'tut-comparison-section',
            content: `
                <p>Now compare your linear and quadratic MAEs for the Search Ads scenario.</p>
                
                <h4>Key Question</h4>
                <p><strong>If the linear MAE is only slightly worse than quadratic, which model should you choose?</strong></p>
                
                <h4>Parsimony (Occam's Razor)</h4>
                <p style="background: #f0fdf4; padding: 12px; border-left: 4px solid #10b981; border-radius: 6px;">
                    When models perform similarly, prefer the <strong>simpler one</strong>. Simpler models are:
                    <ul style="margin-bottom: 0;">
                        <li>Easier to interpret and explain</li>
                        <li>Less likely to overfit (memorize noise)</li>
                        <li>More likely to generalize to new data</li>
                    </ul>
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Compare your linear vs quadratic MAEs. Is the improvement worth the added complexity?</p>
            `,
            getDynamicQuizzes: () => {
                const linearEl = document.querySelector('#compare_mae_linear .mae-value');
                const quadEl = document.querySelector('#compare_mae_quadratic .mae-value');
                
                const linearMAE = linearEl ? parseFloat(linearEl.textContent) : null;
                const quadMAE = quadEl ? parseFloat(quadEl.textContent) : null;
                
                if (!linearMAE || !quadMAE || isNaN(linearMAE) || isNaN(quadMAE)) return null;
                
                const diff = linearMAE - quadMAE;
                const percImprovement = (diff / linearMAE * 100).toFixed(1);
                
                return [
                    {
                        question: `Linear MAE: ${linearMAE.toFixed(2)}, Quadratic MAE: ${quadMAE.toFixed(2)}. The quadratic is ${diff > 0 ? 'better' : 'worse'} by ${Math.abs(diff).toFixed(2)}. Which should you use?`,
                        options: [
                            "Always use quadratic because it has more parameters",
                            Math.abs(diff) < 2 ? "Linear - the tiny improvement doesn't justify the extra complexity" : "Quadratic - the improvement is meaningful",
                            "It doesn't matter"
                        ],
                        answer: 1,
                        feedback: Math.abs(diff) < 2 
                            ? `Correct! A ${Math.abs(diff).toFixed(2)} difference is negligible. The simpler linear model is preferred.`
                            : `Correct! A ${Math.abs(diff).toFixed(2)} improvement may justify the added complexity, though you should still consider interpretability.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "A marketing executive asks 'Why not always use the most complex model?' What's your answer?",
                    options: [
                        "Complex models are harder to compute",
                        "Complex models can overfit - fitting noise instead of signal - and may perform worse on new data",
                        "Complex models are more expensive"
                    ],
                    answer: 1,
                    feedback: "Correct! Overfitting is the key concern. A model that perfectly fits training data by memorizing noise will fail on new data."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-comparison-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 9: TRY EMAIL FREQUENCY ==========
        {
            id: 'email_scenario',
            title: "When Simplicity Fails",
            targetId: 'tut-scenario-section',
            content: `
                <p>Now let's see when a simple model <strong>isn't</strong> enough.</p>
                
                <h4>The Email Frequency Scenario</h4>
                <p>This data shows <strong>diminishing returns</strong> with a clear peak:</p>
                <ul>
                    <li>Too few emails → low response</li>
                    <li>Optimal frequency → maximum response</li>
                    <li>Too many emails → response declines (subscriber fatigue)</li>
                </ul>
                
                <p>A straight line <em>cannot</em> capture a peak. Let's see what happens.</p>
                
                <p class="task">👉 <strong>Task:</strong> Switch to the <strong>"Email Frequency Optimization"</strong> scenario.</p>
            `,
            quizzes: [
                {
                    question: "For data with a peak (diminishing returns), why will a linear model struggle?",
                    options: [
                        "Linear models can only go up or down, not both",
                        "A straight line cannot have a maximum - it goes infinitely in one direction",
                        "Linear models are always worse"
                    ],
                    answer: 1,
                    feedback: "Exactly! A straight line has no peak. If the true relationship has a maximum, linear will systematically under-predict at the extremes and over-predict in the middle (or vice versa)."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value === 'email-frequency';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 10: FIT EMAIL DATA ==========
        {
            id: 'fit_email',
            title: "Fit Both Models to Email Data",
            targetId: 'tut-linear-section',
            content: `
                <p>Now try to fit both models to the Email Frequency data.</p>
                
                <h4>Your Tasks</h4>
                <ol>
                    <li>First, try to minimize the <strong>linear</strong> MAE (you'll struggle!)</li>
                    <li>Then scroll down and minimize the <strong>quadratic</strong> MAE</li>
                    <li>Compare the two - which is meaningfully better?</li>
                </ol>
                
                <h4>What to Notice</h4>
                <ul>
                    <li>The linear model will struggle at the extremes</li>
                    <li>The quadratic can capture the peak</li>
                    <li>The MAE difference should be <strong>substantial</strong></li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Fit the linear model as best you can. Try to get linear MAE below <strong>25.0</strong> (it's hard with curved data!).</p>
                
                <p style="background: #fef3c7; padding: 10px; border-left: 3px solid #f59e0b; border-radius: 4px; margin-top: 10px;">
                    <strong>Hint:</strong> Notice how no matter what you do, the linear model has systematic errors - it can't capture the peak.
                </p>
            `,
            getDynamicQuizzes: () => {
                const linearEl = document.querySelector('#compare_mae_linear .mae-value');
                const quadEl = document.querySelector('#compare_mae_quadratic .mae-value');
                
                const linearMAE = linearEl ? parseFloat(linearEl.textContent) : null;
                const quadMAE = quadEl ? parseFloat(quadEl.textContent) : null;
                
                if (!linearMAE || !quadMAE || isNaN(linearMAE) || isNaN(quadMAE)) return null;
                
                const diff = linearMAE - quadMAE;
                
                if (diff > 5) {
                    return [
                        {
                            question: `Linear MAE: ${linearMAE.toFixed(2)}, Quadratic MAE: ${quadMAE.toFixed(2)}. The difference is ${diff.toFixed(2)}. What does this tell you?`,
                            options: [
                                "Both models are equally good",
                                "For this data, the quadratic is clearly superior - the difference justifies the extra parameter",
                                "We should use a cubic model instead"
                            ],
                            answer: 1,
                            feedback: `Correct! A ${diff.toFixed(2)} difference is substantial. Here, the extra complexity of the quadratic is clearly worth it because the data genuinely has curvature.`
                        }
                    ];
                }
                return null;
            },
            quizzes: [
                {
                    question: "Look at the linear fit on the Email data. What pattern do you see in the errors?",
                    options: [
                        "Errors are random and evenly distributed",
                        "The model systematically under/over-predicts at different X values",
                        "There are no errors"
                    ],
                    answer: 1,
                    feedback: "Correct! When a linear model is fit to curved data, you'll see 'systematic' errors - under-predicting on one side, over-predicting on the other. This is a sign you need more flexibility."
                }
            ],
            check: () => {
                const maeEl = document.querySelector('#mae_linear .mae-value');
                if (!maeEl) return false;
                const mae = parseFloat(maeEl.textContent);
                return !isNaN(mae) && mae < 25.0;
            },
            onEnter: () => {
                const section = document.getElementById('tut-linear-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 11: INTRODUCTION TO CATEGORICAL PREDICTORS ==========
        {
            id: 'categorical_intro',
            title: "Beyond Continuous Variables: Categorical Predictors",
            targetId: 'tut-overview-section',
            content: `
                <p>So far, we've modeled relationships between two <strong>continuous</strong> variables (like Ad Spend → Revenue). But what if your data includes <strong>groups</strong> or <strong>categories</strong>?</p>
                
                <h4>What Are Categorical Predictors?</h4>
                <p>Categorical variables represent <strong>discrete groups</strong> rather than continuous measurements:</p>
                <ul>
                    <li><strong>Customer segments:</strong> Small, Medium, Large enterprise</li>
                    <li><strong>Regions:</strong> North, South, East, West</li>
                    <li><strong>Campaign types:</strong> Email, Social, Display</li>
                    <li><strong>Product tiers:</strong> Basic, Premium, Enterprise</li>
                </ul>
                
                <h4>Why This Matters</h4>
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #2563eb; border-radius: 4px;">
                    Ignoring categorical structure in your data can lead to <strong>misleading models</strong>. 
                    Imagine fitting one line through customers who fundamentally differ in their spending patterns!
                </p>
                
                <h4>The Key Insight</h4>
                <p>When we add categorical predictors, we're allowing different groups to have different <strong>intercepts</strong> (starting points) while sharing the same <strong>slope</strong> (relationship with X).</p>
            `,
            quizzes: [
                {
                    question: "A B2B company sells to startups, mid-size firms, and Fortune 500 companies. Why might a single regression line be problematic?",
                    options: [
                        "Different company sizes have different budget ranges and buying behaviors - one line may average across very different patterns",
                        "Larger companies always spend more, so we just need a steeper slope",
                        "It doesn't matter as long as we have enough data points"
                    ],
                    answer: 0,
                    feedback: "Correct! Enterprise vs. startup customers often have fundamentally different purchasing patterns. A single line might systematically underpredict large enterprises and overpredict startups (or vice versa)."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 12: LOAD B2B PRINTERS SCENARIO ==========
        {
            id: 'load_categorical',
            title: "See the Problem: Fitting One Line to Multiple Groups",
            targetId: 'tut-scenario-section',
            content: `
                <p>Let's see categorical predictors in action with a B2B sales scenario.</p>
                
                <h4>The PrintForge Solutions Scenario</h4>
                <p>This dataset contains 3D printer sales across <strong>three customer segments</strong>:</p>
                <ul>
                    <li><span style="color: #3b82f6;">●</span> <strong>Small Enterprise:</strong> Machine shops, prototyping studios</li>
                    <li><span style="color: #f59e0b;">◆</span> <strong>Medium Enterprise:</strong> Regional manufacturers</li>
                    <li><span style="color: #10b981;">■</span> <strong>Large Enterprise:</strong> Fortune 1000 manufacturers</li>
                </ul>
                
                <h4>X and Y Variables</h4>
                <ul>
                    <li><strong>X:</strong> Sales Rep Consultation Hours</li>
                    <li><strong>Y:</strong> Contract Value ($K)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Select the <strong>"🖨️ B2B 3D Printers (Categorical Segments)"</strong> scenario from the dropdown.</p>
                
                <p style="background: #fef3c7; padding: 10px; border-left: 3px solid #f59e0b; border-radius: 4px; margin-top: 10px;">
                    <strong>Notice:</strong> You'll see three colors of dots - but (for now) just a single regression line trying to fit all of them!
                </p>
            `,
            quizzes: [
                {
                    question: "Why might a B2B company need to model Small, Medium, and Large enterprise customers separately?",
                    options: [
                        "Different company sizes have different budget ranges, buying behaviors, and contract values",
                        "It doesn't matter - all customers are the same",
                        "Only to make the charts look more colorful"
                    ],
                    answer: 0,
                    feedback: "Exactly! Enterprise vs. startup customers often have fundamentally different purchasing patterns. A single model might systematically underpredict large enterprises and overpredict startups."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value === 'b2b-printers';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 13: TRY SINGLE LINE FIT ==========
        {
            id: 'single_line_failure',
            title: "The Single-Line Struggle",
            targetId: 'tut-linear-section',
            content: `
                <p>Now try to fit a <strong>single linear model</strong> to all three groups. This is what happens when we ignore categorical structure.</p>
                
                <h4>Your Challenge</h4>
                <ol>
                    <li>Adjust B₀ and B₁ to minimize MAE</li>
                    <li>Watch how the single blue line struggles</li>
                    <li>Notice the systematic errors for each color group</li>
                </ol>
                
                <h4>What to Observe</h4>
                <p>As you adjust parameters, notice that:</p>
                <ul>
                    <li><span style="color: #3b82f6;">●</span> <strong>Blue dots</strong> (Small): The line probably overshoots them</li>
                    <li><span style="color: #10b981;">■</span> <strong>Green dots</strong> (Large): The line probably undershoots them</li>
                    <li>You can't fix one group without hurting another!</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Try to get the linear MAE as low as possible with a single line. Notice the limits.</p>
                
                <p style="background: #fee2e2; padding: 10px; border-left: 3px solid #ef4444; border-radius: 4px; margin-top: 10px;">
                    <strong>Frustrating, right?</strong> The best you can do is find a "compromise" line that's wrong for everyone. This is omitted variable bias in action.
                </p>
            `,
            getDynamicQuizzes: () => {
                const maeEl = document.querySelector('#mae_linear .mae-value');
                const mae = maeEl ? parseFloat(maeEl.textContent) : null;
                
                if (!mae || isNaN(mae)) return null;
                
                return [
                    {
                        question: `Your best single-line MAE is around ${mae.toFixed(0)}. Why is this MAE so high compared to other scenarios?`,
                        options: [
                            "The data just has a lot of random noise",
                            "You're averaging across groups with fundamentally different baseline values, creating systematic prediction errors",
                            "The relationship between X and Y is too weak"
                        ],
                        answer: 1,
                        feedback: `Correct! An MAE of ${mae.toFixed(0)} is high because you're forcing one line through three distinct patterns. This is 'omitted variable bias' - leaving out the segment variable causes systematic errors.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What type of error pattern do you see with the single line?",
                    options: [
                        "Random errors scattered equally across all groups",
                        "Systematic errors: consistently wrong in the same direction for each color group",
                        "No errors at all"
                    ],
                    answer: 1,
                    feedback: "Exactly! Systematic errors (consistently over/underpredicting for each group) are the hallmark of missing an important variable. Random errors would be evenly distributed."
                }
            ],
            check: () => {
                // Must have categorical toggle OFF (single line mode)
                const toggle = document.getElementById('includeCategoricalLinear');
                if (toggle && toggle.checked) return false;
                
                // Must have played with the sliders enough to get MAE under 45
                const maeEl = document.querySelector('#mae_linear .mae-value');
                if (!maeEl) return false;
                const mae = parseFloat(maeEl.textContent);
                return !isNaN(mae) && mae < 45;
            },
            onEnter: () => {
                const section = document.getElementById('tut-linear-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 14: ENABLE CATEGORICAL TOGGLE ==========
        {
            id: 'enable_categorical',
            title: "Add the Categorical Predictor: Watch the Magic",
            targetId: 'tut-linear-section',
            content: `
                <p>Now let's add the categorical predictor to our model. This is where it gets exciting!</p>
                
                <h4>The New Model</h4>
                <p style="font-family: monospace; background: #f8fafc; padding: 10px; border-radius: 6px; text-align: center; font-size: 0.9em;">
                    Contract = B₀ + B₁ × Hours + <span style="color: #f59e0b;">B₂ × Medium</span> + <span style="color: #10b981;">B₃ × Large</span>
                </p>
                
                <h4>What Do B₂ and B₃ Mean?</h4>
                <ul>
                    <li><strong>B₂ (Medium shift):</strong> How much higher Medium Enterprise starts vs. Small</li>
                    <li><strong>B₃ (Large shift):</strong> How much higher Large Enterprise starts vs. Small</li>
                </ul>
                
                <p>Think of it as <strong>three parallel lines</strong> - same slope, different intercepts.</p>
                
                <p class="task">👉 <strong>Task:</strong> Find the <strong>"Include Categorical Predictor Segments"</strong> toggle in the Linear Model section and turn it ON.</p>
                
                <p style="background: #f0fdf4; padding: 10px; border-left: 3px solid #10b981; border-radius: 4px; margin-top: 10px;">
                    <strong>Watch the plot!</strong> You'll see three separate lines appear - one for each segment.
                </p>
            `,
            quizzes: [
                {
                    question: "What changes when you enable 'Include Categorical Predictor Segments'?",
                    options: [
                        "The data points change color",
                        "Instead of one line, you now have three parallel lines - each segment gets its own intercept",
                        "The X and Y variables change"
                    ],
                    answer: 1,
                    feedback: "Correct! Each segment gets its own line. They share the same slope (relationship between hours and contract value) but have different starting points (intercepts)."
                }
            ],
            check: () => {
                const toggle = document.getElementById('includeCategoricalLinear');
                return toggle && toggle.checked;
            },
            onEnter: () => {
                const section = document.getElementById('tut-linear-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 15: FIT CATEGORICAL MODEL ==========
        {
            id: 'fit_categorical',
            title: "Fit the Categorical Model",
            targetId: 'tut-linear-section',
            content: `
                <p>Now you have <strong>four sliders</strong> to adjust: B₀, B₁, and the two new categorical shifts.</p>
                
                <h4>Strategy for Fitting</h4>
                <ol>
                    <li><strong>B₁ (slope):</strong> Set the overall trend first</li>
                    <li><strong>B₀ (intercept):</strong> Position the Small Enterprise (blue) line</li>
                    <li><strong>B₂ (Medium shift):</strong> Shift the Medium (amber) line up from blue</li>
                    <li><strong>B₃ (Large shift):</strong> Shift the Large (green) line up from blue</li>
                </ol>
                
                <h4>The Payoff</h4>
                <p>Notice how much lower your MAE can go now! Each line fits its own segment rather than compromising.</p>
                
                <p class="task">👉 <strong>Task:</strong> Adjust all four parameters to minimize MAE. Can you get below <strong>12.0</strong>?</p>
                
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #2563eb; border-radius: 4px; margin-top: 10px;">
                    <strong>Hint:</strong> B₂ should be around +45 (Medium is ~45K higher than Small), and B₃ around +110 (Large is ~110K higher than Small).
                </p>
            `,
            getDynamicQuizzes: () => {
                const maeEl = document.querySelector('#mae_linear .mae-value');
                const mae = maeEl ? parseFloat(maeEl.textContent) : null;
                
                // Get categorical parameters if available
                const b2El = document.getElementById('B2_cat_linear');
                const b3El = document.getElementById('B3_cat_linear');
                const b2 = b2El ? parseFloat(b2El.value) : null;
                const b3 = b3El ? parseFloat(b3El.value) : null;
                
                if (!mae || isNaN(mae)) return null;
                
                return [
                    {
                        question: `Your categorical model MAE is now ${mae.toFixed(2)}. How does this compare to the single-line MAE of ~25-30?`,
                        options: [
                            "About the same - adding segments didn't help",
                            `Much better! The MAE dropped by ${(30 - mae).toFixed(0)}+ because each segment now has its own intercept`,
                            "Actually worse - more parameters always hurt"
                        ],
                        answer: 1,
                        feedback: `Correct! Your MAE of ${mae.toFixed(2)} is dramatically better than 25-30. This shows that categorical segments were genuinely important - not just noise. The improvement justifies the extra parameters.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "If B₂ (Medium shift) = 45, what does this tell you in business terms?",
                    options: [
                        "Medium enterprises generate $45K more than small enterprises for the same consultation hours",
                        "Medium enterprises need 45 more hours of consultation",
                        "There are 45 medium enterprise customers"
                    ],
                    answer: 0,
                    feedback: "Exactly! B₂ = 45 means that after controlling for consultation hours, a Medium Enterprise contract is worth $45K more than a Small Enterprise contract. This quantifies the segment difference."
                }
            ],
            check: () => {
                const maeEl = document.querySelector('#mae_linear .mae-value');
                const toggle = document.getElementById('includeCategoricalLinear');
                if (!maeEl || !toggle || !toggle.checked) return false;
                const mae = parseFloat(maeEl.textContent);
                return !isNaN(mae) && mae < 12.0;
            },
            onEnter: () => {
                const section = document.getElementById('tut-linear-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 16: CONCLUSION (UPDATED) ==========
        {
            id: 'conclusion',
            title: "🎓 The Big Picture",
            targetId: null,
            content: `
                <p>Congratulations! You've discovered the fundamental truths behind model fitting - including how categorical predictors unlock hidden patterns.</p>
                
                <h4>What You Learned</h4>
                <ol>
                    <li><strong>Fitting = Minimizing Error:</strong> Whether by hand or algorithm, it's the same search</li>
                    <li><strong>MAE is a compass:</strong> Lower MAE → better fit</li>
                    <li><strong>Parsimony matters:</strong> Prefer simpler models when they work</li>
                    <li><strong>Know when to add complexity:</strong> Curved data needs curved models</li>
                    <li><strong>Categorical predictors matter:</strong> Ignoring group structure causes systematic errors</li>
                    <li><strong>Parallel lines model:</strong> Same slope, different intercepts captures segment differences</li>
                </ol>
                
                <h4>The B2B Printers Lesson</h4>
                <p style="background: #fef3c7; padding: 12px; border-left: 4px solid #f59e0b; border-radius: 6px;">
                    When you saw those three bands of colored dots, a single line couldn't do justice to the data. 
                    Adding categorical "shift" parameters let each segment have its own baseline - dramatically 
                    improving fit while keeping the model interpretable: <em>"Each segment has the same $/hour 
                    return, but starts at a different baseline contract value."</em>
                </p>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    This tutorial covers MAE with linear, quadratic, and categorical models - but real marketing analytics often involves 
                    even more complexity. We assumed <strong>parallel slopes</strong> (same $/hour effect across segments) - but 
                    sometimes segments have different slopes too (<strong>interaction effects</strong>). We used <strong>MAE</strong>, 
                    but <strong>MSE</strong> penalizes large errors more heavily, and <strong>regularization</strong> (L1/L2) 
                    helps prevent overfitting when you have many predictors.
                    <br><br>
                    The categorical approach you learned - using "dummy variables" to shift intercepts - is exactly how 
                    statistical software handles categories. When you include a factor variable in R's <code>lm()</code> or 
                    scikit-learn's regression, you're creating the same parallel-lines model you fit by hand today.
                    <br><br>
                    <strong>Key takeaway:</strong> Always visualize your data by relevant segments before fitting a model. 
                    Those colored dots told you immediately that something was different across groups - a pattern that 
                    would be invisible in aggregate statistics.
                </p>
                
                <h4>What's Next?</h4>
                <ul>
                    <li>Try the categorical model on the <strong>Quadratic</strong> side too</li>
                    <li>Explore how close you can get to optimal MAE with categorical predictors</li>
                    <li>Think about: what if different segments had different <em>slopes</em> (interaction effects)?</li>
                </ul>
                
                <p style="text-align: center; font-size: 1.2em; margin-top: 20px;">
                    <strong>🎉 Tutorial Complete!</strong>
                </p>
            `,
            quizzes: [
                {
                    question: "A colleague shows you a scatter plot with three distinct 'layers' of points. They've fit a single regression line through all of them. What's your advice?",
                    options: [
                        "Looks great - a single line keeps things simple",
                        "Consider adding categorical predictors to allow each layer its own intercept - those distinct patterns suggest important group differences",
                        "Delete the outliers to make one line work better"
                    ],
                    answer: 1,
                    feedback: "Exactly! Distinct layers usually indicate an omitted categorical variable. Adding it will reduce systematic errors, improve fit, and reveal meaningful segment differences. This is exactly what we did with the PrintForge data."
                }
            ],
            check: () => true,
            onEnter: () => {
                MAETutorial.hideOverlay();
            }
        }
    ],

    // ===== Core Methods =====

    init() {
        this.renderToggle();
        this.attachListeners();
    },

    renderToggle() {
        // Check if toggle already exists in the page
        const existingToggle = document.getElementById('professorMode');
        if (existingToggle) {
            existingToggle.addEventListener('change', (e) => {
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
        this.lastCheckResult = null;
        this.renderSidebar();
        this.updateView();
        
        // Log tutorial start
        if (typeof logToolRunToBackend === 'function') {
            logToolRunToBackend('mae-calibration-lab', { action: 'tutorial_start' });
        }
    },

    stop() {
        this.isActive = false;
        this.hideOverlay();
        
        const sidebar = document.getElementById('tutorial-sidebar');
        if (sidebar) sidebar.remove();
        
        // Uncheck the toggle
        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
        
        // Log completion if on final step
        if (this.currentStep === this.steps.length - 1) {
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend('mae-calibration-lab', { 
                    action: 'tutorial_complete',
                    steps_completed: this.currentStep + 1
                });
            }
        }
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            // Clear quiz cache for current step before advancing
            const currentStep = this.steps[this.currentStep];
            currentStep.currentQuizzes = null;
            currentStep.quizState = null;
            
            this.currentStep++;
            this.currentHighlight = null;
            this.lastCheckResult = null;
            this.updateView();
            setTimeout(() => this.checkProgress(), 100);
        }
    },

    prevStep() {
        if (this.currentStep > 0) {
            // Clear quiz cache for current step before going back
            const currentStep = this.steps[this.currentStep];
            currentStep.currentQuizzes = null;
            currentStep.quizState = null;
            
            this.currentStep--;
            this.currentHighlight = null;
            this.lastCheckResult = null;
            this.updateView();
        }
    },

    updateView() {
        const step = this.steps[this.currentStep];
        
        // Get quizzes - only generate ONCE per step to prevent regeneration bugs
        let quizzes;
        if (step.currentQuizzes) {
            // Use already-stored quizzes (prevents regeneration between display and checking)
            quizzes = step.currentQuizzes;
        } else {
            // First time entering this step - generate quizzes now
            quizzes = step.quizzes || [];
            if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
                const dynamicQuizzes = step.getDynamicQuizzes();
                if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                    quizzes = dynamicQuizzes;
                }
            }
            // Store quizzes for consistency
            step.currentQuizzes = quizzes;
            // Initialize quiz state
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
                                    <label style="display: block; margin-bottom: 8px; cursor: pointer; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; transition: all 0.2s;">
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="MAETutorial.checkQuiz(${qIndex}, this.value)" style="margin-right: 8px;">
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
        const areQuizzesComplete = !quizzes || quizzes.length === 0 || 
            (step.quizState && step.quizState.every(q => q.completed));
        const canProceed = isTaskComplete && areQuizzesComplete;
        
        sidebarContent.innerHTML = `
            <div class="tutorial-step-badge">Step ${this.currentStep + 1}/${this.steps.length}</div>
            <h3 style="margin-top: 10px; margin-bottom: 15px; color: #1e293b;">${step.title}</h3>
            <div class="tutorial-body" style="color: #475569; line-height: 1.6;">${step.content}</div>
            
            ${quizHtml}
            
            <div class="tutorial-progress-container" style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e5e7eb;">
                ${step.check ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: ${quizzes && quizzes.length > 0 ? '8px' : '0'};">
                        ${this.getCheckmark(isTaskComplete)}
                        <span style="${isTaskComplete ? 'color: #10b981; font-weight: 600;' : 'color: #9ca3af;'}">
                            ${isTaskComplete ? "✓ Task Complete" : "⏳ Pending Task..."}
                        </span>
                    </div>
                ` : ''}
                
                ${quizzes && quizzes.length > 0 ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px;">
                        ${this.getCheckmark(areQuizzesComplete)}
                        <span style="${areQuizzesComplete ? 'color: #10b981; font-weight: 600;' : 'color: #9ca3af;'}">
                            ${areQuizzesComplete ? "✓ Quick Checks Complete" : "⏳ Answer Quick Checks..."}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 10px;">
                ${this.currentStep > 0 ? 
                    `<button class="btn-secondary" onclick="MAETutorial.prevStep()" style="flex: 1; padding: 10px; border-radius: 6px; cursor: pointer;">← Back</button>` : 
                    ''
                }
                ${canProceed ?
                    (this.currentStep === this.steps.length - 1 ?
                        `<button class="btn-primary" onclick="MAETutorial.stop()" style="flex: 2; padding: 10px; border-radius: 6px; cursor: pointer; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; font-weight: 600;">🎓 Finish Tutorial</button>` :
                        `<button class="btn-primary" onclick="MAETutorial.nextStep()" style="flex: 2; padding: 10px; border-radius: 6px; cursor: pointer; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; font-weight: 600;">Next Step →</button>`
                    ) :
                    `<button class="btn-secondary" disabled style="flex: 2; padding: 10px; border-radius: 6px; opacity: 0.5; cursor: not-allowed;">Complete tasks to continue</button>`
                }
            </div>
            
            <button class="btn-secondary full-width" onclick="MAETutorial.stop()" style="margin-top: 10px; font-size: 0.9em; padding: 8px; border-radius: 6px; cursor: pointer; width: 100%;">Exit Tutorial</button>
        `;
        
        // Highlight target element
        if (step.targetId) {
            this.highlightElement(step.targetId);
        } else {
            this.hideOverlay();
        }
        
        // Run onEnter callback
        if (step.onEnter) step.onEnter();
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
            feedbackEl.innerHTML = `<span style="color: #10b981;">✓ ${quiz.feedback}</span>`;
            feedbackEl.style.display = 'block';
            
            // Disable radio buttons
            document.querySelectorAll(`input[name="quiz_q_${this.currentStep}_${qIndex}"]`).forEach(input => {
                input.disabled = true;
            });
            
            // Refresh view after short delay
            setTimeout(() => this.updateView(), 600);
        } else {
            feedbackEl.innerHTML = `<span style="color: #ef4444;">✗ Not quite. Try again!</span>`;
            feedbackEl.style.display = 'block';
        }
    },

    getCheckmark(completed) {
        return completed ?
            '<span style="color: #10b981; font-size: 1.2em;">✓</span>' :
            '<span style="color: #9ca3af; font-size: 1.2em;">○</span>';
    },

    checkProgress() {
        if (!this.isActive) return;
        
        const step = this.steps[this.currentStep];
        const isNowComplete = step.check ? step.check() : true;
        
        // Always update view if task is complete to ensure button state is correct
        if (isNowComplete !== this.lastCheckResult) {
            this.lastCheckResult = isNowComplete;
            this.updateView();
        }
    },

    highlightElement(targetId) {
        if (this.currentHighlight === targetId) return;
        
        this.showOverlay();
        
        // Remove previous highlight
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        // Add new highlight
        const element = document.getElementById(targetId);
        if (element) {
            element.classList.add('tutorial-highlight');
            this.currentHighlight = targetId;
        }
    },

    showOverlay() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.add('active');
    },

    hideOverlay() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.remove('active');
        
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        this.currentHighlight = null;
    },

    renderSidebar() {
        if (document.getElementById('tutorial-sidebar')) return;
        
        const sidebar = document.createElement('div');
        sidebar.id = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>🎓 Professor Mode</h2>
                <button onclick="MAETutorial.stop()" class="close-tutorial">&times;</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(sidebar);
        
        // Trigger slide-in animation
        requestAnimationFrame(() => {
            sidebar.classList.add('active');
        });
        
        // Create overlay if not exists
        if (!document.getElementById('tutorial-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'tutorial-overlay';
            document.body.appendChild(overlay);
        }
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
        
        // Poll for progress checks
        setInterval(() => this.checkProgress(), 500);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => MAETutorial.init(), 500);
});
