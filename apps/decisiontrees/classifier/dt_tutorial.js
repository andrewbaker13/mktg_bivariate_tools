// Decision Tree Classifier Tutorial - Professor Mode Implementation

const DTTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    steps: [
        // ========== MODULE 1: WELCOME ==========
        {
            id: 'welcome',
            title: "Welcome to Decision Trees",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This guided tutorial will teach you how to build and interpret decision trees for customer classification.</p>
                
                <h4>What You'll Learn</h4>
                <ol>
                    <li>How decision trees make predictions</li>
                    <li>Loading and preparing marketing data</li>
                    <li>Building and visualizing your tree</li>
                    <li>Understanding overfitting</li>
                    <li>Interpreting metrics and feature importance</li>
                </ol>
                
                <p><strong>Why Decision Trees?</strong> They're one of the most interpretable ML models. You can literally "see" the logic: if tenure &lt; 12 months AND contract = month-to-month, THEN high churn risk.</p>
            `,
            quizzes: [
                {
                    question: "What makes decision trees particularly valuable for marketing?",
                    options: [
                        "They always have the highest accuracy",
                        "Their predictions are interpretable - you can explain WHY a customer is classified a certain way",
                        "They don't require any data preparation"
                    ],
                    answer: 1,
                    feedback: "Correct! Unlike 'black box' models, decision trees produce rules that stakeholders can understand and act on."
                }
            ],
            check: () => true
        },

        // ========== MODULE 2: CONCEPTS ==========
        {
            id: 'concepts',
            title: "How Decision Trees Work",
            targetId: 'tut-overview-section',
            content: `
                <p>Before building, let's understand the algorithm.</p>
                
                <h4>The CART Algorithm</h4>
                <p>Decision trees use <strong>recursive binary splitting</strong>:</p>
                <ol>
                    <li><strong>Find the best split:</strong> Which feature and threshold best separates the classes?</li>
                    <li><strong>Split the data:</strong> Create two child nodes</li>
                    <li><strong>Repeat:</strong> Continue until stopping criteria are met</li>
                </ol>
                
                <h4>Key Terms</h4>
                <ul>
                    <li><strong>Gini Impurity:</strong> Measures how "mixed" a node is (0 = pure, 0.5 = max impurity for binary)</li>
                    <li><strong>Information Gain:</strong> How much a split reduces impurity</li>
                    <li><strong>Leaf Node:</strong> Terminal node that makes a prediction</li>
                </ul>
                
                <p class="task">Read the highlighted <strong>Overview & Objective</strong> section. Note how it describes the CART algorithm.</p>
            `,
            quizzes: [
                {
                    question: "What does a Gini impurity of 0 mean?",
                    options: [
                        "The node contains a mix of all classes",
                        "The node is completely pure - all samples belong to one class",
                        "The model has 0% accuracy"
                    ],
                    answer: 1,
                    feedback: "Correct! Gini = 0 means perfect purity. The algorithm tries to create splits that reduce Gini toward 0."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 3: LOAD DATA ==========
        {
            id: 'load_data',
            title: "Load Your Marketing Data",
            targetId: 'tut-step1-section',
            content: `
                <p>Let's load a realistic marketing dataset to classify customers.</p>
                
                <h4>Available Scenarios</h4>
                <ul>
                    <li><strong>Customer Churn:</strong> Predict which customers will leave</li>
                    <li><strong>Lead Conversion:</strong> Identify which leads will convert</li>
                    <li><strong>Email Response:</strong> Predict who will engage with campaigns</li>
                </ul>
                
                <p class="task">Select <strong>"🔄 Customer Churn Prediction"</strong> from the scenario dropdown.</p>
                
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #3b82f6; border-radius: 4px; margin-top: 10px;">
                    Notice how the tool automatically identifies the target variable and features.
                </p>
            `,
            getDynamicQuizzes: () => {
                const scenarioEl = document.getElementById('scenario-select');
                const scenario = scenarioEl ? scenarioEl.value : null;
                
                if (!scenario || scenario === '') return null;
                
                return [
                    {
                        question: `You selected the "${scenario}" scenario. What is the classification target?`,
                        options: [
                            "Predicting a continuous value like revenue",
                            "Predicting a category like 'Churned' vs 'Retained'",
                            "Clustering customers into segments"
                        ],
                        answer: 1,
                        feedback: "Correct! Decision tree classifiers predict categorical outcomes. Each leaf assigns customers to a class."
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is customer churn prediction valuable for marketers?",
                    options: [
                        "It's cheaper to acquire new customers than retain existing ones",
                        "Identifying at-risk customers allows proactive retention campaigns before they leave",
                        "Churn is the only metric that matters"
                    ],
                    answer: 1,
                    feedback: "Exactly! Predicting churn lets you intervene with retention offers, personalized outreach, or service improvements before losing the customer."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value && scenarioSelect.value !== '';
            },
            onEnter: () => {
                const section = document.getElementById('tut-step1-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 4: CONFIGURE TREE ==========
        {
            id: 'configure',
            title: "Configure Your Tree Settings",
            targetId: 'tut-step2-section',
            content: `
                <p>Before building, let's understand the key settings that control tree complexity.</p>
                
                <h4>Max Depth</h4>
                <p>Depth controls how many levels of questions the tree can ask:</p>
                <ul>
                    <li><strong>Depth 1:</strong> Just one split (a "stump")</li>
                    <li><strong>Depth 4:</strong> Up to 16 leaf segments (good balance)</li>
                    <li><strong>Depth 5+:</strong> Very detailed segmentation (risk of overfitting!)</li>
                </ul>
                
                <h4>Target Class</h4>
                <p>For metrics like precision and recall, you need to specify which outcome is "positive":</p>
                <ul>
                    <li>For churn: <strong>"Churned"</strong> is typically the target (we want to catch churners)</li>
                    <li>For conversion: <strong>"Converted"</strong> is the target</li>
                </ul>
                
                <div class="task" style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 15px;">
                    <p style="margin: 0 0 8px 0; font-weight: 600;">👉 Your Tasks:</p>
                    <ol style="margin: 0; padding-left: 20px;">
                        <li>Set <strong>Max Depth to 4</strong> (use the slider or input)</li>
                        <li>Select your <strong>Target Class</strong> (the "positive" outcome)</li>
                    </ol>
                </div>
            `,
            getDynamicQuizzes: () => {
                const depthEl = document.getElementById('max-depth');
                const depth = depthEl ? depthEl.value : null;
                
                if (!depth) return null;
                
                return [
                    {
                        question: `You've set Max Depth to ${depth}. What's the maximum number of leaf nodes this tree can have?`,
                        options: [
                            `${Math.pow(2, parseInt(depth) - 1)} leaves`,
                            `${Math.pow(2, parseInt(depth))} leaves`,
                            `${parseInt(depth)} leaves`
                        ],
                        answer: 1,
                        feedback: `Correct! A binary tree of depth ${depth} can have at most 2^${depth} = ${Math.pow(2, parseInt(depth))} leaf nodes.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is setting Max Depth important?",
                    options: [
                        "Deeper trees are always better",
                        "Limiting depth helps prevent overfitting by keeping the tree simpler",
                        "It doesn't matter - the algorithm will figure it out"
                    ],
                    answer: 1,
                    feedback: "Correct! Depth is a form of regularization. Deeper trees can memorize training data quirks that don't generalize."
                }
            ],
            check: () => {
                const targetSelect = document.getElementById('target-class-select');
                const depthEl = document.getElementById('max-depth');
                // Check that max depth is set to 4
                return targetSelect && targetSelect.value && depthEl && parseInt(depthEl.value) === 4;
            },
            onEnter: () => {
                const section = document.getElementById('tut-step2-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 5: BUILD THE TREE ==========
        {
            id: 'build_tree',
            title: "Build Your Decision Tree",
            targetId: 'tut-step3-section',
            content: `
                <p>Time to grow your decision tree!</p>
                
                <h4>What Happens When You Click "Build Tree"</h4>
                <ol>
                    <li>Data is split into <strong>training</strong> (to learn) and <strong>test</strong> (to evaluate) sets</li>
                    <li>The CART algorithm finds optimal splits on the training data</li>
                    <li>The tree is evaluated on the held-out test data</li>
                </ol>
                
                <p class="task">Click the <strong>"Build Tree"</strong> button and watch the tree appear!</p>
                
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #3b82f6; border-radius: 4px; margin-top: 10px;">
                    The tree visualization will appear below, and performance metrics will update in the Metrics panel.
                </p>
            `,
            quizzes: [
                {
                    question: "Why do we split data into training and test sets?",
                    options: [
                        "To make the training faster",
                        "To evaluate how well the model generalizes to NEW data it hasn't seen",
                        "Because we don't have enough data otherwise"
                    ],
                    answer: 1,
                    feedback: "Exactly! The test set simulates real-world performance. A model that does well only on training data is useless for predictions."
                }
            ],
            check: () => {
                // Check if tree has been built - simple and reliable
                const built = window.treeBuilt === true;
                console.log('[DT Tutorial] build_tree check: window.treeBuilt =', window.treeBuilt, '| result =', built);
                return built;
            },
            onEnter: () => {
                const section = document.getElementById('tut-step3-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 6: INTERPRET THE TREE ==========
        {
            id: 'interpret_tree',
            title: "Reading Your Tree",
            targetId: 'tree-container',
            getDynamicQuizzes: () => {
                const state = window.lastTreeState;
                if (!state || !state.rootFeature) return null;
                
                const rootFeature = state.rootFeature;
                const threshold = state.rootThreshold;
                const thresholdDisplay = threshold !== null ? threshold.toFixed(2) : 'N/A';
                
                return [
                    {
                        question: `Look at the root node (top of tree). What feature did the algorithm choose for the first split?`,
                        options: [
                            state.importances[1]?.feature || 'monthly_charges',
                            rootFeature,
                            state.importances[2]?.feature || 'contract_type'
                        ],
                        answer: 1,
                        feedback: `Correct! The algorithm chose "${rootFeature}" for the root split because it provided the largest impurity reduction.`
                    },
                    {
                        question: `The root node splits on "${rootFeature}"${threshold !== null ? ` at threshold ${thresholdDisplay}` : ''}. What does this mean?`,
                        options: [
                            `Customers with ${rootFeature} <= ${thresholdDisplay} go LEFT; others go RIGHT`,
                            `This variable is the most correlated with the outcome`,
                            `All customers with this feature value will churn`
                        ],
                        answer: 0,
                        feedback: `Correct! At each split node, customers satisfying the condition (<= threshold) go left, others go right.`
                    }
                ];
            },
            content: `
                <p>Your tree is built! Let's understand what it's telling us.</p>
                
                <h4>Node Anatomy</h4>
                <ul>
                    <li><strong>Split Rule:</strong> The yes/no question (e.g., "tenure <= 12")</li>
                    <li><strong>Samples:</strong> How many training customers reached this node</li>
                    <li><strong>Gini:</strong> Impurity measure (lower = more pure)</li>
                    <li><strong>Class Distribution:</strong> How many of each class at this node</li>
                </ul>
                
                <h4>Reading the Path</h4>
                <p>Follow any path from root to leaf to understand the decision logic:</p>
                <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">
                    IF tenure <= 12 AND contract = month-to-month<br>
                    THEN high churn risk (72% churned in this segment)
                </p>
                
                <p class="task">Click on any node in the tree to see its detailed statistics.</p>
            `,
            quizzes: [
                {
                    question: "Why did the algorithm choose this particular feature for the root split?",
                    options: [
                        "It was listed first in the dataset",
                        "It provides the largest reduction in impurity (best separates the classes)",
                        "It has the highest correlation with other features"
                    ],
                    answer: 1,
                    feedback: "Correct! At each step, CART greedily selects the feature and threshold that maximizes information gain (reduces Gini impurity the most)."
                }
            ],
            check: () => window.lastTreeState !== undefined,
            onEnter: () => {
                const treeContainer = document.getElementById('tree-container');
                if (treeContainer) treeContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 7: BASELINE METRICS ==========
        {
            id: 'metrics_baseline',
            title: "Your Baseline Metrics",
            targetId: 'tut-metrics-section',
            getDynamicQuizzes: () => {
                const state = window.lastTreeState;
                if (!state) return null;
                
                const testAcc = (state.accuracy * 100).toFixed(1);
                const trainAcc = (state.trainAccuracy * 100).toFixed(1);
                const gap = ((state.trainAccuracy - state.accuracy) * 100).toFixed(1);
                
                return [
                    {
                        question: `Look at the metrics panel. What is the Test Accuracy?`,
                        options: [
                            `About ${(parseFloat(testAcc) - 8).toFixed(1)}%`,
                            `About ${testAcc}%`,
                            `About ${(parseFloat(testAcc) + 8).toFixed(1)}%`
                        ],
                        answer: 1,
                        feedback: `Correct! The Test Accuracy is ${testAcc}% - this measures performance on data the model has never seen.`
                    },
                    {
                        question: `Now look at Train Accuracy. What is it?`,
                        options: [
                            `About ${(parseFloat(trainAcc) - 8).toFixed(1)}%`,
                            `About ${trainAcc}%`,
                            `About ${(parseFloat(trainAcc) + 8).toFixed(1)}%`
                        ],
                        answer: 1,
                        feedback: `Correct! Train Accuracy is ${trainAcc}%. The gap between train (${trainAcc}%) and test (${testAcc}%) is ${gap} percentage points.`
                    }
                ];
            },
            content: `
                <p>Before experimenting, let's establish your <strong>baseline</strong> performance.</p>
                
                <h4>The Two Key Accuracy Numbers</h4>
                <p>Look at the highlighted <strong>Metrics Panel</strong>:</p>
                <ul>
                    <li><strong>Test Accuracy:</strong> Performance on NEW data (the honest measure)</li>
                    <li><strong>Train Accuracy:</strong> Performance on data the model learned from</li>
                </ul>
                
                <h4>Why Both Matter</h4>
                <p>The <strong>gap</strong> between train and test accuracy tells you about <strong>overfitting</strong>:</p>
                <ul>
                    <li><strong>Small gap (< 5%):</strong> Model generalizes well</li>
                    <li><strong>Large gap (> 10%):</strong> Model may be memorizing, not learning</li>
                </ul>
                
                <div class="task" style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 15px;">
                    <p style="margin: 0 0 8px 0; font-weight: 600;">👉 Your Task:</p>
                    <p style="margin: 0;">Look at the metrics panel and note both <strong>Test Accuracy</strong> and <strong>Train Accuracy</strong>.</p>
                </div>
            `,
            quizzes: [
                {
                    question: "Why do we care about the gap between train and test accuracy?",
                    options: [
                        "A large gap means the model is underfitting",
                        "A large gap suggests the model memorized training data and won't generalize to new customers",
                        "The gap doesn't matter if accuracy is high"
                    ],
                    answer: 1,
                    feedback: "Correct! A large train-test gap is a red flag - the model learned the training data too specifically and won't perform as well on new customers."
                }
            ],
            check: () => window.lastTreeState !== undefined,
            onEnter: () => {
                const section = document.getElementById('tut-metrics-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 8: OVERFITTING EXPERIMENT - SETUP ==========
        {
            id: 'overfitting_setup',
            title: "Experiment: Increase Complexity",
            targetId: 'tut-step2-section',
            content: `
                <p><strong>Hypothesis:</strong> If we make the tree MORE complex, what happens?</p>
                
                <h4>The Experiment</h4>
                <p>You currently have Max Depth = 4. Let's increase it to see what happens.</p>
                
                <h4>Your Prediction</h4>
                <p>Before changing anything, think about this:</p>
                <ul>
                    <li>Will a deeper tree have HIGHER or LOWER train accuracy?</li>
                    <li>Will test accuracy increase as much as train accuracy?</li>
                    <li>What will happen to the gap?</li>
                </ul>
                
                <div class="task" style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 15px;">
                    <p style="margin: 0 0 8px 0; font-weight: 600;">👉 Your Task:</p>
                    <p style="margin: 0;">Change <strong>Max Depth to 5</strong> in the settings panel.</p>
                </div>
                
                <p style="background: #dbeafe; padding: 10px; border-left: 3px solid #3b82f6; border-radius: 4px; margin-top: 10px;">
                    <strong>Note:</strong> Don't click Build Tree yet! First answer the quiz about your prediction.
                </p>
            `,
            quizzes: [
                {
                    question: "PREDICTION: When you increase Max Depth from 4 to 5, what do you expect?",
                    options: [
                        "Both train and test accuracy will increase equally",
                        "Train accuracy will increase more than test accuracy (gap widens)",
                        "Test accuracy will increase more than train accuracy"
                    ],
                    answer: 1,
                    feedback: "Good prediction! Deeper trees can memorize training data better (↑ train accuracy) but the extra complexity often doesn't help with new data (test accuracy may not improve much or may even decrease)."
                },
                {
                    question: "What is this pattern called when train accuracy >> test accuracy?",
                    options: [
                        "Underfitting - the model is too simple",
                        "Overfitting - the model is too complex and memorizing noise",
                        "Perfect fitting - the model is ideal"
                    ],
                    answer: 1,
                    feedback: "Correct! Overfitting is when a model learns the training data TOO well, including random noise that doesn't generalize."
                }
            ],
            check: () => {
                const depthEl = document.getElementById('max-depth');
                return depthEl && parseInt(depthEl.value) === 5;
            },
            onEnter: () => {
                const section = document.getElementById('tut-step2-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 9: OVERFITTING EXPERIMENT - OBSERVE ==========
        {
            id: 'overfitting_observe',
            title: "Observe the Results",
            targetId: 'tut-step3-section',  // Start by highlighting Build Tree area
            getDynamicQuizzes: () => {
                const state = window.lastTreeState;
                if (!state) return null;
                
                const testAcc = (state.accuracy * 100).toFixed(1);
                const trainAcc = (state.trainAccuracy * 100).toFixed(1);
                const gap = (state.trainAccuracy - state.accuracy) * 100;
                const gapDisplay = gap.toFixed(1);
                const isOverfitting = gap > 5;
                
                return [
                    {
                        question: `After rebuilding with depth 5, what is the NEW gap between Train and Test accuracy?`,
                        options: [
                            `About ${(gap * 0.5).toFixed(1)} percentage points`,
                            `About ${gapDisplay} percentage points`,
                            `About ${(gap * 1.5).toFixed(1)} percentage points`
                        ],
                        answer: 1,
                        feedback: `Correct! The gap is now ${gapDisplay} percentage points. ${isOverfitting ? 'This larger gap suggests some overfitting is occurring.' : 'The gap is still manageable.'}`
                    },
                    {
                        question: `Based on these results, what would you recommend?`,
                        options: [
                            "Increase depth even more to get higher accuracy",
                            "The current depth seems reasonable - watch for further overfitting",
                            "Depth doesn't matter for this model"
                        ],
                        answer: 1,
                        feedback: isOverfitting ? 
                            "Correct! With a noticeable train-test gap, increasing depth further would likely make overfitting worse. You might even consider reducing depth." :
                            "Correct! The gap is acceptable, but increasing depth further might start causing overfitting."
                    }
                ];
            },
            content: `
                <p>Now let's see what actually happened!</p>
                
                <div class="task" style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 15px;">
                    <p style="margin: 0 0 8px 0; font-weight: 600;">👉 Your Task:</p>
                    <p style="margin: 0;">Click the highlighted <strong>"Build Tree"</strong> button to rebuild with depth 5.</p>
                    <p style="margin: 8px 0 0 0; font-size: 0.9em; color: #92400e;">After the tree rebuilds, scroll down to the Metrics panel to compare results.</p>
                </div>
                
                <h4>What to Observe</h4>
                <p>Compare your NEW results to your baseline:</p>
                <ul>
                    <li>Did <strong>Train Accuracy</strong> go up? (Usually yes)</li>
                    <li>Did <strong>Test Accuracy</strong> go up as much? (Often not)</li>
                    <li>Did the <strong>gap</strong> increase? (Sign of overfitting)</li>
                </ul>
                
                <p style="background: #fef2f2; padding: 10px; border-left: 3px solid #ef4444; border-radius: 4px; margin-top: 10px;">
                    <strong>Key Insight:</strong> The "best" model isn't always the most complex one. The best model is one that generalizes well to NEW data!
                </p>
            `,
            quizzes: [
                {
                    question: "What is the main takeaway from this experiment?",
                    options: [
                        "Always use the maximum possible depth",
                        "More complexity can hurt generalization - there's a sweet spot",
                        "Test accuracy doesn't matter if train accuracy is high"
                    ],
                    answer: 1,
                    feedback: "Exactly! This is the bias-variance tradeoff. Too simple = underfitting, too complex = overfitting. Finding the right balance is key!"
                }
            ],
            check: () => {
                // Check if tree was rebuilt with depth 5
                const state = window.lastTreeState;
                const rebuilt = state && state.maxDepth === 5;
                
                // Once rebuilt, scroll to metrics so they can see results
                if (rebuilt) {
                    const metricsSection = document.getElementById('tut-metrics-section');
                    if (metricsSection) {
                        metricsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                return rebuilt;
            },
            onEnter: () => {
                // Scroll to the Build Tree button area
                const section = document.getElementById('tut-step3-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 10: PRECISION/RECALL TRADEOFF ==========
        {
            id: 'metrics',
            title: "Precision vs Recall",
            targetId: 'tut-metrics-section',
            getDynamicQuizzes: () => {
                const state = window.lastTreeState;
                if (!state) return null;
                
                const precision = (state.precision * 100).toFixed(1);
                const recall = (state.recall * 100).toFixed(1);
                
                const higherMetric = state.precision > state.recall ? 'Precision' : 'Recall';
                const lowerMetric = state.precision > state.recall ? 'Recall' : 'Precision';
                
                return [
                    {
                        question: `Your model has ${higherMetric} (${state.precision > state.recall ? precision : recall}%) > ${lowerMetric} (${state.precision > state.recall ? recall : precision}%). What does this mean?`,
                        options: [
                            higherMetric === 'Precision' ? 
                                "When we predict churn, we're usually right, but we miss some churners" :
                                "We catch most churners, but some predictions are false alarms",
                            "The model is performing poorly",
                            "We need to collect more data"
                        ],
                        answer: 0,
                        feedback: higherMetric === 'Precision' ?
                            "Correct! High precision means fewer false alarms, but lower recall means we miss some actual churners." :
                            "Correct! High recall means we catch most churners, but lower precision means more false alarms."
                    }
                ];
            },
            content: `
                <p>Beyond accuracy, <strong>precision</strong> and <strong>recall</strong> tell you about different types of errors.</p>
                
                <h4>The Metrics</h4>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Precision</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb;">Of those we predicted would churn, how many actually did?</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Recall</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb;">Of actual churners, how many did we catch?</td>
                    </tr>
                </table>
                
                <h4>The Business Trade-off</h4>
                <ul>
                    <li><strong>High Precision:</strong> Fewer wasted retention offers, but we miss some churners</li>
                    <li><strong>High Recall:</strong> Catch more churners, but more false alarms</li>
                </ul>
                
                <p class="task">Look at the metrics panel. Is precision or recall higher for your model?</p>
            `,
            quizzes: [
                {
                    question: "A retention campaign costs $50 per customer. Missing a churner costs $500 in lost revenue. Should you optimize for precision or recall?",
                    options: [
                        "Precision - minimize wasted campaign spend",
                        "Recall - the cost of missing a churner is 10x the cost of a false alarm",
                        "Neither - just use accuracy"
                    ],
                    answer: 1,
                    feedback: "Correct! When missing a positive is much more costly than a false alarm, optimize for recall. Some wasted campaigns are better than losing customers."
                }
            ],
            check: () => window.lastTreeState !== undefined,
            onEnter: () => {
                const section = document.getElementById('tut-metrics-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 11: CONFUSION MATRIX ==========
        {
            id: 'confusion_matrix',
            title: "The Confusion Matrix",
            targetId: 'tut-confusion-section',
            getDynamicQuizzes: () => {
                const state = window.lastTreeState;
                if (!state || !state.confusionMatrix || !state.classes || state.classes.length < 2) return null;
                
                const cm = state.confusionMatrix;
                const classes = state.classes;
                const targetClass = state.targetClass || classes[1]; // Positive class (e.g., 'Churned')
                const negativeClass = classes.find(c => c !== targetClass) || classes[0];
                
                // Confusion matrix is an object: cm[actual][predicted]
                const tp = cm[targetClass]?.[targetClass] || 0;
                const fn = cm[targetClass]?.[negativeClass] || 0;
                const fp = cm[negativeClass]?.[targetClass] || 0;
                const tn = cm[negativeClass]?.[negativeClass] || 0;
                
                return [
                    {
                        question: `Look at the confusion matrix. How many False Negatives are there (churners we missed)?`,
                        options: [
                            `${Math.max(0, fn - 5)} customers`,
                            `${fn} customers`,
                            `${fn + 5} customers`
                        ],
                        answer: 1,
                        feedback: `Correct! There are ${fn} false negatives - customers who actually churned but we predicted would stay. These are the most costly mistakes.`
                    },
                    {
                        question: `You have ${fp} false positives (non-churners flagged as churners). Is this a problem?`,
                        options: [
                            "Yes - these customers will be annoyed by retention offers",
                            "Only if the retention campaign is very expensive",
                            "No - it's actually fine to offer retention incentives to loyal customers"
                        ],
                        answer: 1,
                        feedback: "Correct! False positives mean wasted campaign spend, but the cost depends on your campaign. A $50 email is cheap; a $500 discount is expensive."
                    }
                ];
            },
            content: `
                <p>The confusion matrix shows exactly where your model succeeds and fails.</p>
                
                <h4>Reading the Matrix</h4>
                <table style="width: 100%; border-collapse: collapse; margin: 10px 0; text-align: center;">
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e5e7eb;"></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f3f4f6;"><strong>Predicted: Stay</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f3f4f6;"><strong>Predicted: Churn</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f3f4f6;"><strong>Actual: Stay</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #d1fae5;">True Negative (TN)</td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #fef2f2;">False Positive (FP)</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f3f4f6;"><strong>Actual: Churn</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #fef2f2;">False Negative (FN)</td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #d1fae5;">True Positive (TP)</td>
                    </tr>
                </table>
                
                <p><strong>For churn prediction:</strong></p>
                <ul>
                    <li><strong>False Negatives (FN):</strong> Churners we missed - they left without intervention</li>
                    <li><strong>False Positives (FP):</strong> Loyal customers we flagged - wasted retention spend</li>
                </ul>
                
                <p class="task">Find the confusion matrix below. Count the false negatives (bottom-left cell).</p>
            `,
            quizzes: [
                {
                    question: "Which cell represents the most costly errors for a churn model?",
                    options: [
                        "True Positives - we correctly identified churners",
                        "False Negatives - churners we failed to identify and lost",
                        "False Positives - non-churners we incorrectly flagged"
                    ],
                    answer: 1,
                    feedback: "Correct! False negatives mean lost customers. The cost of losing a customer is usually much higher than the cost of an unnecessary retention offer."
                }
            ],
            check: () => window.lastTreeState !== undefined,
            onEnter: () => {
                const section = document.getElementById('tut-confusion-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 10: FEATURE IMPORTANCE ==========
        {
            id: 'feature_importance',
            title: "Feature Importance",
            targetId: 'tut-importance-section',
            getDynamicQuizzes: () => {
                const state = window.lastTreeState;
                if (!state || !state.importances || state.importances.length === 0) return null;
                
                const topFeature = state.importances[0];
                const secondFeature = state.importances[1];
                
                return [
                    {
                        question: `Which feature is most important for predicting churn in your model?`,
                        options: [
                            secondFeature?.feature || 'monthly_charges',
                            topFeature.feature,
                            state.importances[2]?.feature || 'tenure'
                        ],
                        answer: 1,
                        feedback: `Correct! "${topFeature.feature}" has the highest importance score (${(topFeature.importance * 100).toFixed(1)}%), meaning it contributes most to the tree's decisions.`
                    },
                    {
                        question: `Feature importance is ${(topFeature.importance * 100).toFixed(1)}% for the top feature. What does this percentage represent?`,
                        options: [
                            "The correlation with the target variable",
                            "The total reduction in Gini impurity attributed to this feature across all splits",
                            "The percentage of customers with this feature"
                        ],
                        answer: 1,
                        feedback: "Correct! Feature importance measures how much each feature contributes to reducing impurity (making nodes more pure) throughout the tree."
                    }
                ];
            },
            content: `
                <p>Feature importance tells you which variables drive the model's predictions.</p>
                
                <h4>How It's Calculated</h4>
                <p>For each feature, we sum the <strong>reduction in Gini impurity</strong> across all splits using that feature. Higher importance = more predictive power.</p>
                
                <h4>Actionable Insights</h4>
                <p>The most important features suggest where to focus:</p>
                <ul>
                    <li><strong>Contract type important?</strong> Focus retention on month-to-month customers</li>
                    <li><strong>Tenure important?</strong> New customer onboarding is critical</li>
                    <li><strong>Monthly charges important?</strong> Price sensitivity drives churn</li>
                </ul>
                
                <p class="task">Look at the Feature Importance chart. Which feature is most important?</p>
            `,
            quizzes: [
                {
                    question: "If 'contract_type' is the most important feature, what marketing action might you take?",
                    options: [
                        "Offer discounts to all customers",
                        "Create incentives for month-to-month customers to switch to annual contracts",
                        "Remove the feature from the model"
                    ],
                    answer: 1,
                    feedback: "Correct! If contract type drives churn, converting customers to longer commitments (with appropriate incentives) directly addresses the risk factor."
                }
            ],
            check: () => window.lastTreeState !== undefined,
            onEnter: () => {
                const section = document.getElementById('tut-importance-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ========== MODULE 11: CONCLUSION ==========
        {
            id: 'conclusion',
            title: "Putting It All Together",
            targetId: null,
            content: `
                <p>Congratulations! You've built and interpreted a decision tree classifier.</p>
                
                <h4>Key Takeaways</h4>
                <ol>
                    <li><strong>Decision trees are interpretable:</strong> You can explain predictions to stakeholders</li>
                    <li><strong>Depth controls complexity:</strong> Deeper trees risk overfitting</li>
                    <li><strong>Train vs test gap matters:</strong> Watch for overfitting</li>
                    <li><strong>Choose metrics by business cost:</strong> Precision vs recall depends on your use case</li>
                    <li><strong>Feature importance guides action:</strong> Focus on the variables that matter most</li>
                </ol>
                
                <h4>Analyst's Perspective</h4>
                <p style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">
                    <strong>Real-world tip:</strong> Decision trees are often used as a starting point for more powerful methods. Random Forests and Gradient Boosting combine many trees for better performance while maintaining feature importance insights.
                </p>
                
                <h4>Next Steps</h4>
                <ul>
                    <li>Try different Max Depth values and observe the trade-offs</li>
                    <li>Experiment with Manual Mode to understand splits at each level</li>
                    <li>Export the decision rules for documentation</li>
                </ul>
                
                <p style="text-align: center; margin-top: 20px; font-size: 1.2em;">
                    <strong>Tutorial Complete!</strong>
                </p>
            `,
            quizzes: [
                {
                    question: "You're presenting to executives who want to reduce churn. What's the most valuable output from this analysis?",
                    options: [
                        "The accuracy percentage",
                        "The tree's decision rules showing which customer segments are at highest risk",
                        "The number of nodes in the tree"
                    ],
                    answer: 1,
                    feedback: "Correct! Executives can act on rules like 'Month-to-month customers with tenure < 12 months have 72% churn rate' - that's a clear segment for targeted retention."
                }
            ],
            check: () => true
        }
    ],

    init() {
        console.log('DTTutorial.init() called');
        this.attachListeners();
    },

    attachListeners() {
        const toggle = document.getElementById('professorMode');
        console.log('Professor Mode checkbox found:', toggle);
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                console.log('Professor Mode checkbox changed:', e.target.checked);
                if (e.target.checked) {
                    this.start();
                } else {
                    this.stop();
                }
            });
        } else {
            console.error('Professor Mode checkbox not found!');
        }
        
        // Poll for progress checks
        setInterval(() => this.checkProgress(), 500);
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.lastCheckResult = null;
        this.renderSidebar();
        this.updateView();
    },

    stop() {
        this.isActive = false;
        this.hideOverlay();
        
        const sidebar = document.getElementById('tutorial-sidebar');
        if (sidebar) sidebar.remove();
        
        // Uncheck the toggle
        const checkbox = document.getElementById('professorMode');
        if (checkbox) checkbox.checked = false;
    },

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.currentHighlight = null;
            this.lastCheckResult = null;
            this.updateView();
            // Force immediate check evaluation after view update
            setTimeout(() => this.checkProgress(), 100);
        }
    },

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
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
        
        // Store quizzes for consistency (CRITICAL: prevents regeneration)
        step.currentQuizzes = quizzes;
        
        // Initialize quiz state if needed
        if (!step.quizState || step.quizState.length !== quizzes.length) {
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
                            <h4 style="margin-top: 0; color: #9a3412;">Quick Check ${qIndex + 1}</h4>
                            <p style="margin-bottom: 10px; font-weight: 500;">${quiz.question}</p>
                            <div class="quiz-options">
                                ${quiz.options.map((opt, i) => `
                                    <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="DTTutorial.checkQuiz(${qIndex}, this.value)">
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
                            <h4 style="margin-top: 0; color: #10b981;">Quick Check ${qIndex + 1} Passed</h4>
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
                            ${areQuizzesComplete ? "Quick Checks Complete" : "Answer Quick Checks..."}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 10px;">
                ${this.currentStep > 0 ? 
                    `<button class="btn-secondary" onclick="DTTutorial.prevStep()" style="flex: 1;">Back</button>` : 
                    ''
                }
                ${canProceed ?
                    (this.currentStep === this.steps.length - 1 ?
                        `<button class="btn-primary" onclick="DTTutorial.stop()" style="flex: 2;">Finish Tutorial</button>` :
                        `<button class="btn-primary" onclick="DTTutorial.nextStep()" style="flex: 2;">Next Step</button>`
                    ) :
                    `<button class="btn-secondary" disabled style="flex: 2;">Complete tasks to continue</button>`
                }
            </div>
            
            <button class="btn-secondary full-width" onclick="DTTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
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
            feedbackEl.innerHTML = `<span style="color: #10b981;">${quiz.feedback}</span>`;
            feedbackEl.style.display = 'block';
            
            // Disable radio buttons
            document.querySelectorAll(`input[name="quiz_q_${this.currentStep}_${qIndex}"]`).forEach(input => {
                input.disabled = true;
            });
            
            // Refresh view after short delay
            setTimeout(() => this.updateView(), 500);
        } else {
            feedbackEl.innerHTML = `<span style="color: #ef4444;">Not quite. Try again!</span>`;
            feedbackEl.style.display = 'block';
        }
    },

    getCheckmark(completed) {
        return completed ?
            '<span style="color: #10b981; font-size: 1.2em;">&#10004;</span>' :
            '<span style="color: #9ca3af; font-size: 1.2em;">&#9744;</span>';
    },

    checkProgress() {
        if (!this.isActive) return;
        
        const step = this.steps[this.currentStep];
        const wasComplete = this.lastCheckResult;
        const isNowComplete = step.check ? step.check() : true;
        
        if (wasComplete !== isNowComplete) {
            this.lastCheckResult = isNowComplete;
            this.updateView();
        }
    },

    highlightElement(targetId) {
        // Avoid redundant highlighting
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
                <h2>Professor Mode</h2>
                <button onclick="DTTutorial.stop()" class="close-tutorial">x</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(sidebar);
        
        // Trigger slide-in animation after DOM insertion
        requestAnimationFrame(() => {
            sidebar.classList.add('active');
        });
        
        // Create overlay if not exists
        if (!document.getElementById('tutorial-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'tutorial-overlay';
            document.body.appendChild(overlay);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => DTTutorial.init(), 500);
});
