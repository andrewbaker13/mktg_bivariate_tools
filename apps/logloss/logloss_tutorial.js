/**
 * Log-Loss Classification Lab - Professor Mode Tutorial
 * Guided educational experience for understanding binary classification and probability calibration
 * 
 * Dr. Baker's Marketing Analytics Tools
 * Created: 2026-02-04
 */

const LogLossTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        // ========== MODULE 1: WELCOME ==========
        {
            id: 'welcome',
            title: "Welcome to Log-Loss Classification",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to <strong>Professor Mode</strong>! This guided tutorial will teach you the fundamental concepts behind binary classification and probability estimation.</p>
                
                <h4>What You'll Learn</h4>
                <ol>
                    <li>What log-loss measures and why it matters</li>
                    <li>How logistic regression creates probability predictions</li>
                    <li>The relationship between parameters and the sigmoid curve</li>
                    <li>Why accuracy alone isn't enough for marketing decisions</li>
                </ol>
                
                <h4>The Big Idea</h4>
                <p>Classification models don't just predict "yes" or "no"—they predict <strong>probabilities</strong>. Log-loss measures how well-calibrated those probability estimates are. By fitting a model by hand, you'll understand what every classification algorithm does automatically.</p>
            `,
            quizzes: [
                {
                    question: "What does a classification model output?",
                    options: [
                        "Only a binary yes/no decision",
                        "A probability between 0 and 1, which can then be converted to a decision",
                        "A confidence score from 1 to 100"
                    ],
                    answer: 1,
                    feedback: "Correct! Classification models output probabilities. The decision boundary (usually 0.5) converts that probability into a yes/no prediction."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 2: UNDERSTANDING LOG-LOSS ==========
        {
            id: 'logloss_concept',
            title: "What is Log-Loss?",
            targetId: 'tut-math-section',
            content: `
                <p>Before adjusting parameters, let's understand our "scorecard": <strong>Log-Loss</strong> (also called Cross-Entropy).</p>
                
                <h4>The Formula</h4>
                <p style="background: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; text-align: center;">
                    Log-Loss = -(1/N) × Σ[y·log(p) + (1-y)·log(1-p)]
                </p>
                
                <h4>In Plain English</h4>
                <ol>
                    <li>For each actual "1": Add log(p) — you're rewarded for high probability</li>
                    <li>For each actual "0": Add log(1-p) — you're rewarded for low probability</li>
                    <li>Take the negative average</li>
                </ol>
                
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #2563eb; border-radius: 4px;">
                    <strong>Lower Log-Loss = Better Calibration.</strong> If log-loss = 0, you predicted 100% for every actual 1 and 0% for every actual 0.
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Read the Mathematical Foundations section. Understand why predicting 99% for an actual 0 is catastrophic.</p>
            `,
            quizzes: [
                {
                    question: "If you predict 95% probability and the person DOES convert (actual = 1), what happens to log-loss?",
                    options: [
                        "It increases a lot (bad)",
                        "It increases a little",
                        "It stays low (good) because you were right and confident"
                    ],
                    answer: 2,
                    feedback: "Correct! log(0.95) ≈ -0.05, so you're only penalized a tiny amount. Being right AND confident is rewarded."
                },
                {
                    question: "If you predict 99% probability and the person DOESN'T convert (actual = 0), what happens?",
                    options: [
                        "Small penalty—you were close",
                        "Huge penalty—overconfident mistakes are catastrophic",
                        "No penalty—you still got the direction right"
                    ],
                    answer: 1,
                    feedback: "Exactly! log(1-0.99) = log(0.01) ≈ -4.6. That single overconfident mistake can dominate your entire loss. This is why calibration matters!"
                }
            ],
            check: () => true,
            onEnter: () => {
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
                <p>Let's work with real marketing data. We have four scenarios with <strong>deliberately different patterns</strong>:</p>
                
                <h4>The Scenarios</h4>
                <ul>
                    <li><strong>📧 Email Conversion:</strong> Clear separation (easy to fit)</li>
                    <li><strong>📉 Churn Prediction:</strong> Moderate overlap (more realistic)</li>
                    <li><strong>🖱️ Ad Click:</strong> Weak signal (teaches limits)</li>
                    <li><strong>⬆️ Subscription Upgrade:</strong> Categorical segments</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Select the <strong>"📧 Email Conversion"</strong> scenario from the dropdown.</p>
                
                <p style="background: #fef3c7; padding: 10px; border-left: 3px solid #f59e0b; border-radius: 4px; margin-top: 10px;">
                    <strong>Why start here?</strong> Email conversion data has clear separation between converters and non-converters, making it easier to see how the sigmoid curve fits the data.
                </p>
            `,
            quizzes: [
                {
                    question: "Why are we starting with Email Conversion rather than Ad Click?",
                    options: [
                        "Email marketing is more important",
                        "Clear separation makes it easier to understand how parameters control the curve",
                        "Ad click data is too complex for beginners"
                    ],
                    answer: 1,
                    feedback: "Correct! Starting with well-separated data helps you understand parameter effects before tackling noisier datasets."
                }
            ],
            check: () => {
                const select = document.getElementById('scenario-select');
                return select && select.value === 'email-conversion';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 4: UNDERSTAND THE DATA ==========
        {
            id: 'understand_data',
            title: "Reading the Scatter Plot",
            targetId: 'simplePlot',
            content: `
                <p>Look at the chart. You should see:</p>
                
                <ul>
                    <li><strong>Red dots at Y ≈ 0:</strong> People who did NOT convert</li>
                    <li><strong>Green dots at Y ≈ 1:</strong> People who DID convert</li>
                    <li><strong>Blue sigmoid curve:</strong> Your model's probability predictions</li>
                    <li><strong>Dashed vertical line:</strong> Decision boundary (p = 0.5)</li>
                </ul>
                
                <h4>The Pattern</h4>
                <p>Notice how non-converters (red) cluster at <strong>lower</strong> engagement scores while converters (green) cluster at <strong>higher</strong> scores. This is the relationship we want the model to capture.</p>
                
                <p class="task">👉 <strong>Task:</strong> Identify where the red and green dots "transition"—that's where your decision boundary should fall.</p>
            `,
            quizzes: [
                {
                    question: "Looking at the Email Conversion plot, around what X value do you see the transition between mostly red and mostly green points?",
                    options: [
                        "Around 20-30",
                        "Around 40-60",
                        "Around 80-90"
                    ],
                    answer: 1,
                    feedback: "Good observation! The transition zone is where your model's 50% probability line should fall—that's the decision boundary."
                }
            ],
            check: () => true,
            onEnter: () => {
                const plot = document.getElementById('simplePlot');
                if (plot) plot.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 5: THE B₀ PARAMETER (INTERCEPT) ==========
        {
            id: 'b0_intercept',
            title: "Parameter B₀: The Intercept",
            targetId: 'tut-simple-section',
            content: `
                <p>Now let's understand what each parameter controls. Start with <strong>B₀ (the intercept)</strong>.</p>
                
                <h4>What B₀ Does</h4>
                <p>B₀ shifts the entire sigmoid curve <strong>left or right</strong>. It controls <em>where</em> the 50% probability point falls.</p>
                
                <ul>
                    <li><strong>More negative B₀:</strong> Curve shifts right → predicts "0" for more of the X range</li>
                    <li><strong>More positive B₀:</strong> Curve shifts left → predicts "1" for more of the X range</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Use the <strong>B₀ slider</strong> (in the controls area) to set it to <strong>-5</strong>. Watch the blue sigmoid curve and the dashed decision boundary move in the chart below. Then try <strong>+2</strong>. See the difference?</p>
                
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #2563eb; border-radius: 4px;">
                    <strong>The Math:</strong> Decision boundary = -B₀/B₁. So if B₁ is constant, changing B₀ directly moves the boundary.
                </p>
            `,
            quizzes: [
                {
                    question: "What happens when you make B₀ more negative?",
                    options: [
                        "The sigmoid curve shifts LEFT",
                        "The sigmoid curve shifts RIGHT",
                        "The sigmoid curve gets steeper"
                    ],
                    answer: 1,
                    feedback: "Correct! More negative B₀ means the curve needs higher X values to reach 50%, shifting the curve rightward."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-simple-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        // ========== MODULE 6: THE B₁ PARAMETER (SLOPE) ==========
        {
            id: 'b1_slope',
            title: "Parameter B₁: The Slope",
            targetId: 'tut-simple-section',
            content: `
                <p>Now let's explore <strong>B₁ (the slope)</strong>—the coefficient on your predictor variable X.</p>
                
                <h4>What B₁ Does</h4>
                <p>B₁ controls the <strong>steepness</strong> of the sigmoid curve:</p>
                
                <ul>
                    <li><strong>Larger |B₁|:</strong> Steeper curve → more "decisive" model</li>
                    <li><strong>Smaller |B₁|:</strong> Gradual curve → more uncertainty</li>
                    <li><strong>Negative B₁:</strong> Curve slopes downward (higher X → lower probability)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Use the <strong>B₁ slider</strong> to set it to <strong>0.05</strong> (gradual curve). Watch the chart—the sigmoid should be almost flat! Then try <strong>0.20</strong> (steep curve). See how the transition from 0→1 becomes much sharper?</p>
                
                <p style="background: #dcfce7; padding: 10px; border-left: 3px solid #22c55e; border-radius: 4px;">
                    <strong>Odds Ratio:</strong> e<sup>B₁</sup> tells you how much the odds multiply for each unit increase in X. If B₁ = 0.1, each unit increases odds by ~10.5%.
                </p>
            `,
            quizzes: [
                {
                    question: "If the data shows clear separation between classes, what kind of B₁ would you expect the optimal model to have?",
                    options: [
                        "A small |B₁| giving a gradual curve",
                        "A large |B₁| giving a steep curve",
                        "B₁ = 0 giving a flat line"
                    ],
                    answer: 1,
                    feedback: "Exactly! Clear separation means the probability should jump quickly from 0 to 1, requiring a steep curve (large |B₁|)."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-simple-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        // ========== MODULE 7: WATCH THE LOG-LOSS ==========
        {
            id: 'watch_logloss',
            title: "Minimizing Log-Loss",
            targetId: 'tut-simple-section',
            content: `
                <p>Now it's time to <strong>fit the model</strong>. Your goal: find B₀ and B₁ values that minimize log-loss.</p>
                
                <h4>The Fitting Process</h4>
                <ol>
                    <li>Use <strong>both sliders</strong> (B₀ and B₁) in the controls area above the chart</li>
                    <li>Watch the <strong>Log-Loss</strong> value update in real-time (shown above the chart)</li>
                    <li>Lower is better—try to get below <strong>0.30</strong></li>
                    <li>Notice how accuracy might stay the same even as log-loss changes</li>
                </ol>
                
                <p class="task">👉 <strong>Task:</strong> Experiment with the B₀ and B₁ sliders to minimize log-loss. Try to get it below <strong>0.35</strong>. Watch how the sigmoid curve fits the data points!</p>
                
                <p style="background: #fef3c7; padding: 10px; border-left: 3px solid #f59e0b; border-radius: 4px;">
                    <strong>Hint:</strong> For email conversion, try B₀ around -5 to -6 and B₁ around 0.10 to 0.15. Watch how log-loss responds!
                </p>
            `,
            getDynamicQuizzes: () => {
                const loglossEl = document.querySelector('#logloss_simple .logloss-value');
                const logloss = loglossEl ? parseFloat(loglossEl.textContent) : null;
                
                if (!logloss || isNaN(logloss)) return null;
                
                return [
                    {
                        question: `Your current log-loss is ${logloss.toFixed(3)}. How would you describe this fit?`,
                        options: [
                            logloss < 0.35 ? "Excellent—well calibrated!" : "Excellent—well calibrated!",
                            logloss >= 0.35 && logloss < 0.50 ? "Good, but room for improvement" : "Good, but room for improvement",
                            logloss >= 0.50 ? "Needs work—try adjusting parameters" : "Needs work—try adjusting parameters"
                        ],
                        answer: logloss < 0.35 ? 0 : (logloss < 0.50 ? 1 : 2),
                        feedback: logloss < 0.35 ? 
                            "Excellent! Log-loss under 0.35 indicates well-calibrated probability predictions." :
                            (logloss < 0.50 ? 
                                "Good progress! Keep adjusting to get below 0.35." :
                                "Keep experimenting! The optimal fit should have log-loss around 0.25-0.30 for this scenario.")
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is log-loss better than accuracy for evaluating a probability model?",
                    options: [
                        "Log-loss is easier to calculate",
                        "Log-loss rewards confidence calibration, not just correct classification",
                        "Log-loss always produces lower numbers"
                    ],
                    answer: 1,
                    feedback: "Correct! Accuracy treats 51% and 99% predictions the same if both classify correctly. Log-loss rewards models that are CORRECTLY confident."
                }
            ],
            check: () => {
                const loglossEl = document.querySelector('#logloss_simple .logloss-value');
                if (!loglossEl) return false;
                const logloss = parseFloat(loglossEl.textContent);
                return !isNaN(logloss) && logloss < 0.50;
            },
            onEnter: () => {
                const section = document.getElementById('tut-simple-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        // ========== MODULE 8: CONFUSION MATRIX ==========
        {
            id: 'confusion_matrix',
            title: "Reading the Confusion Matrix",
            targetId: 'tut-confusion-matrix',
            content: `
                <p>The confusion matrix shows how your classifications break down:</p>
                
                <h4>The Four Cells</h4>
                <ul>
                    <li><strong>TN (True Negative):</strong> Correctly predicted "no"</li>
                    <li><strong>FP (False Positive):</strong> Predicted "yes" but was "no" (Type I error)</li>
                    <li><strong>FN (False Negative):</strong> Predicted "no" but was "yes" (Type II error)</li>
                    <li><strong>TP (True Positive):</strong> Correctly predicted "yes"</li>
                </ul>
                
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #2563eb; border-radius: 4px;">
                    <strong>Accuracy = (TP + TN) / Total</strong>, but this hides important information about <em>which</em> mistakes you're making.
                </p>
                
                <p class="task">👉 <strong>Task:</strong> Look at your confusion matrix. Are you making more FPs or FNs? This matters for marketing decisions!</p>
            `,
            quizzes: [
                {
                    question: "For a churn prediction model, which error is typically MORE costly?",
                    options: [
                        "False Positive (predicting churn when customer stays)",
                        "False Negative (predicting stay when customer churns)",
                        "Both errors are equally costly"
                    ],
                    answer: 1,
                    feedback: "Usually correct! Missing a churner (FN) means you didn't send the retention offer, and they left. A false positive (FP) just means you sent an unnecessary offer to a loyal customer—less costly."
                }
            ],
            check: () => true,
            onEnter: () => {
                const cm = document.getElementById('tut-confusion-matrix');
                if (cm) cm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 9: COMPARE TO OPTIMAL ==========
        {
            id: 'compare_optimal',
            title: "Your Model vs. Optimal",
            targetId: 'tut-comparison-section',
            content: `
                <p>Now let's see how your hand-tuned model compares to the <strong>mathematically optimal</strong> solution.</p>
                
                <h4>What the Optimizer Does</h4>
                <p>Statistical software uses algorithms (like gradient descent or Newton-Raphson) to find the B₀ and B₁ that minimize log-loss. It's doing by computation what you're doing by intuition!</p>
                
                <p class="task">👉 <strong>Task:</strong> Look at the Performance section. How close is your log-loss to the optimal?</p>
                
                <p style="background: #dcfce7; padding: 10px; border-left: 3px solid #22c55e; border-radius: 4px;">
                    <strong>If you're within 0.05 of optimal:</strong> Congratulations! You've essentially found the same solution as the algorithm.
                </p>
            `,
            getDynamicQuizzes: () => {
                const userEl = document.getElementById('compare_logloss_user');
                const optEl = document.getElementById('compare_logloss_optimal');
                
                if (!userEl || !optEl) return null;
                
                const user = parseFloat(userEl.textContent);
                const opt = parseFloat(optEl.textContent);
                
                if (isNaN(user) || isNaN(opt)) return null;
                
                const gap = user - opt;
                
                return [
                    {
                        question: `Your log-loss gap is ${gap.toFixed(4)}. How well did you do?`,
                        options: [
                            gap <= 0.02 ? "Excellent! Within 0.02 of optimal" : "Excellent! Within 0.02 of optimal",
                            gap > 0.02 && gap <= 0.10 ? "Good! Close to optimal" : "Good! Close to optimal",
                            gap > 0.10 ? "Room for improvement—keep adjusting!" : "Room for improvement—keep adjusting!"
                        ],
                        answer: gap <= 0.02 ? 0 : (gap <= 0.10 ? 1 : 2),
                        feedback: gap <= 0.02 ? 
                            "Outstanding! You've matched the algorithm's solution. You truly understand the loss surface." :
                            (gap <= 0.10 ? 
                                "Great work! A small gap shows you've grasped the fundamental concept." :
                                "Keep experimenting! Try fine-tuning B₀ first, then B₁.")
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why might two different (B₀, B₁) combinations give similar log-loss?",
                    options: [
                        "It's a bug in the calculation",
                        "The loss surface has a 'valley' where different parameter combinations perform similarly",
                        "Log-loss doesn't depend on the parameters"
                    ],
                    answer: 1,
                    feedback: "Correct! The loss surface often has a long, flat valley. This is why optimization algorithms sometimes struggle—many solutions are 'close enough'."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-comparison-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 10: TRY A NOISIER DATASET ==========
        {
            id: 'noisy_data',
            title: "Challenge: Noisy Data",
            targetId: 'tut-scenario-section',
            content: `
                <p>Now let's see what happens when the signal is weaker. Switch to the <strong>🖱️ Ad Click Prediction</strong> scenario.</p>
                
                <h4>What to Expect</h4>
                <ul>
                    <li>Much more overlap between classes</li>
                    <li>Higher minimum achievable log-loss</li>
                    <li>A flatter, less decisive sigmoid curve</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Select <strong>"🖱️ Ad Click Prediction"</strong> and try to fit the model. Notice how the optimal log-loss is much higher!</p>
                
                <p style="background: #fee2e2; padding: 10px; border-left: 3px solid #ef4444; border-radius: 4px;">
                    <strong>Reality Check:</strong> Not all marketing problems have strong signals. When data is noisy, even the best model can only do so much—and that's okay. Knowing the limits is part of being a good analyst.
                </p>
            `,
            quizzes: [
                {
                    question: "When classes overlap significantly, what should you expect from the optimal model?",
                    options: [
                        "Very steep sigmoid with low log-loss",
                        "Gradual sigmoid with higher log-loss—uncertainty is honest",
                        "The model should still achieve log-loss near zero"
                    ],
                    answer: 1,
                    feedback: "Correct! When data is noisy, a well-calibrated model should be uncertain. A gradual sigmoid with higher log-loss is honest, not a failure."
                }
            ],
            check: () => {
                const select = document.getElementById('scenario-select');
                return select && select.value === 'ad-click';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 11: KEY INSIGHTS ==========
        {
            id: 'key_insights',
            title: "Marketing Science Takeaways",
            targetId: 'tut-insights-section',
            content: `
                <p>Let's consolidate what you've learned from a marketing analytics perspective.</p>
                
                <h4>Key Takeaways</h4>
                <ol>
                    <li><strong>Probabilities > Decisions:</strong> Outputs of 0.51 and 0.99 are very different even if both classify as "yes"</li>
                    <li><strong>Calibration Matters:</strong> Expected value calculations need accurate probabilities, not just good accuracy</li>
                    <li><strong>Overconfidence Kills:</strong> Being 99% sure and wrong is catastrophic to log-loss (and to marketing ROI)</li>
                    <li><strong>Know Your Data:</strong> Noisy data means uncertainty—embrace it, don't hide it</li>
                </ol>
                
                <p class="task">👉 <strong>Task:</strong> Read through the Key Insights section for deeper marketing applications.</p>
            `,
            quizzes: [
                {
                    question: "In programmatic advertising, why is probability calibration especially important?",
                    options: [
                        "It makes the reports look better",
                        "Bid amounts are based on expected value = p(conversion) × value, so miscalibrated p leads to systematic over/underbidding",
                        "It's not—only accuracy matters for bidding"
                    ],
                    answer: 1,
                    feedback: "Exactly! If your model says 80% but the true rate is 50%, you'll bid 60% too high on every impression. Calibration directly impacts profitability."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-insights-section');
                if (section) {
                    const details = section.querySelector('details');
                    if (details && !details.open) details.open = true;
                    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },

        // ========== MODULE 12: CONCLUSION ==========
        {
            id: 'conclusion',
            title: "🎓 The Big Picture",
            targetId: null,
            content: `
                <p>Congratulations! You've discovered the fundamental truths behind probability modeling and classification.</p>
                
                <h4>What You Learned</h4>
                <ol>
                    <li><strong>Log-Loss = Calibration Score:</strong> It measures how well your probabilities match reality</li>
                    <li><strong>B₀ shifts, B₁ steepens:</strong> Two parameters, full control of the sigmoid</li>
                    <li><strong>Accuracy ≠ Quality:</strong> Same accuracy, very different log-loss is common</li>
                    <li><strong>Noise is information:</strong> High minimum log-loss tells you the data has weak signal</li>
                    <li><strong>Thresholds are flexible:</strong> 50% is arbitrary—choose based on costs</li>
                </ol>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    Logistic regression is the simplest classification model, but the concepts extend everywhere. 
                    <strong>Regularization</strong> (L1/L2) prevents overfitting when you have many predictors. 
                    <strong>Multi-class classification</strong> extends log-loss to more than two outcomes. 
                    <strong>Deep learning</strong> uses the exact same loss function with millions of parameters.
                    <br><br>
                    We assumed a single predictor and linear relationship in log-odds. Real models often include 
                    <strong>interactions</strong> (X₁ × X₂), <strong>polynomial terms</strong>, and <strong>categorical 
                    variables</strong> with dummy coding—exactly like you saw in the MAE lab with categorical predictors.
                    <br><br>
                    The decision threshold of 50% is often wrong for marketing. Consider: if acquiring a customer 
                    is worth $100 and sending an email costs $0.10, you should target anyone with >0.1% conversion 
                    probability! <strong>Threshold optimization</strong> based on business costs is a critical skill.
                </p>
                
                <h4>What's Next?</h4>
                <ul>
                    <li>Try the <strong>⬆️ Subscription Upgrade</strong> scenario with categorical predictors</li>
                    <li>Explore the <strong>Churn Prediction</strong> scenario and think about retention strategies</li>
                    <li>Consider: how would you set thresholds differently for different marketing campaigns?</li>
                </ul>
                
                <p style="text-align: center; font-size: 1.2em; margin-top: 20px;">
                    <strong>🎉 Tutorial Complete!</strong>
                </p>
            `,
            quizzes: [
                {
                    question: "Your marketing team asks for a 'high accuracy' churn model. What should you tell them?",
                    options: [
                        "Great goal—let's maximize accuracy!",
                        "Let's discuss: what's the cost of missing a churner vs. the cost of unnecessary retention outreach? The optimal threshold depends on that tradeoff, not just accuracy.",
                        "Accuracy is the only metric that matters"
                    ],
                    answer: 1,
                    feedback: "Perfect response! Real marketing decisions require understanding the cost matrix. A 70% accuracy model with the right threshold can outperform a 90% accuracy model with the wrong one."
                }
            ],
            check: () => true,
            onEnter: () => {
                LogLossTutorial.hideOverlay();
            }
        }
    ],

    // ===== Core Methods =====

    init() {
        this.attachListeners();
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.lastCheckResult = null;
        this.renderSidebar();
        this.updateView();
        
        // Log tutorial start
        if (typeof logToolRunToBackend === 'function') {
            logToolRunToBackend('logloss-classification-lab', { action: 'tutorial_start' });
        }
    },

    stop() {
        this.isActive = false;
        this.hideOverlay();
        
        const sidebar = document.getElementById('tutorial-sidebar');
        if (sidebar) sidebar.classList.remove('active');
        
        // Uncheck the toggle
        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
        
        // Log completion if on final step
        if (this.currentStep === this.steps.length - 1) {
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend('logloss-classification-lab', { 
                    action: 'tutorial_complete',
                    steps_completed: this.currentStep + 1,
                    total_steps: this.steps.length
                });
            }
        }
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.lastCheckResult = null;
            this.updateView();
        }
    },

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.lastCheckResult = null;
            this.updateView();
        }
    },

    updateView() {
        const step = this.steps[this.currentStep];
        const content = document.getElementById('tutorial-content');
        if (!content) return;
        
        // Initialize quiz state
        if (!step.quizState) {
            const quizzes = step.getDynamicQuizzes ? step.getDynamicQuizzes() : null;
            step.currentQuizzes = quizzes || step.quizzes || [];
            step.quizState = step.currentQuizzes.map(() => ({ completed: false }));
        }
        
        const quizzes = step.currentQuizzes;
        const allQuizzesComplete = step.quizState.every(q => q.completed);
        const taskComplete = step.check ? step.check() : true;
        const canProceed = allQuizzesComplete && taskComplete;
        
        // Build quiz HTML
        let quizHtml = '';
        if (quizzes && quizzes.length > 0) {
            quizzes.forEach((quiz, qIndex) => {
                const isComplete = step.quizState[qIndex].completed;
                quizHtml += `
                    <div class="tutorial-quiz" style="margin: 15px 0; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${isComplete ? '#10b981' : '#667eea'};">
                        <p style="font-weight: 600; margin-bottom: 10px;">
                            ${this.getCheckmark(isComplete)} ${quiz.question}
                        </p>
                        ${quiz.options.map((opt, oIndex) => `
                            <label style="display: block; padding: 8px 12px; margin: 5px 0; background: white; border: 1px solid #e2e8f0; border-radius: 4px; cursor: ${isComplete ? 'default' : 'pointer'};">
                                <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${oIndex}" 
                                    onchange="LogLossTutorial.checkQuiz(${qIndex}, ${oIndex})"
                                    ${isComplete ? 'disabled' : ''}>
                                ${opt}
                            </label>
                        `).join('')}
                        <div id="quiz-feedback-${qIndex}" class="quiz-feedback" style="margin-top: 10px; padding: 10px; border-radius: 4px; display: none;"></div>
                    </div>
                `;
            });
        }
        
        content.innerHTML = `
            <div class="tutorial-step-badge" style="display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; margin-bottom: 10px;">
                Step ${this.currentStep + 1} of ${this.steps.length}
            </div>
            
            <div class="tutorial-body">
                <h3 style="margin: 10px 0; color: #1e293b;">${step.title}</h3>
                ${step.content}
            </div>
            
            ${quizHtml}
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                ${this.currentStep > 0 ? 
                    `<button class="btn-secondary" onclick="LogLossTutorial.prevStep()" style="flex: 1; padding: 10px; border-radius: 6px; cursor: pointer;">← Back</button>` : 
                    ''
                }
                ${canProceed ?
                    (this.currentStep === this.steps.length - 1 ?
                        `<button class="btn-primary" onclick="LogLossTutorial.stop()" style="flex: 2; padding: 10px; border-radius: 6px; cursor: pointer; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; font-weight: 600;">🎓 Finish Tutorial</button>` :
                        `<button class="btn-primary" onclick="LogLossTutorial.nextStep()" style="flex: 2; padding: 10px; border-radius: 6px; cursor: pointer; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; font-weight: 600;">Next Step →</button>`
                    ) :
                    `<button class="btn-secondary" disabled style="flex: 2; padding: 10px; border-radius: 6px; opacity: 0.5; cursor: not-allowed;">Complete tasks to continue</button>`
                }
            </div>
            
            <button class="btn-secondary full-width" onclick="LogLossTutorial.stop()" style="margin-top: 10px; font-size: 0.9em; padding: 8px; border-radius: 6px; cursor: pointer; width: 100%;">Exit Tutorial</button>
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
            feedbackEl.style.background = '#dcfce7';
            
            // Disable radio buttons
            document.querySelectorAll(`input[name="quiz_q_${this.currentStep}_${qIndex}"]`).forEach(input => {
                input.disabled = true;
            });
            
            // Refresh view after short delay
            setTimeout(() => this.updateView(), 600);
        } else {
            feedbackEl.innerHTML = `<span style="color: #ef4444;">✗ Not quite. Try again!</span>`;
            feedbackEl.style.display = 'block';
            feedbackEl.style.background = '#fee2e2';
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
        const sidebar = document.getElementById('tutorial-sidebar');
        if (sidebar) {
            // Trigger slide-in animation
            requestAnimationFrame(() => {
                sidebar.classList.add('active');
            });
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
    setTimeout(() => LogLossTutorial.init(), 500);
});
