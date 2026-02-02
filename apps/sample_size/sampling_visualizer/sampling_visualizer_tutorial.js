// Sampling Visualizer Tutorial - Professor Mode Implementation

const SamplingVisualizerTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,

    steps: [
        {
            id: 'welcome',
            title: "🎓 Welcome to Sampling Designs",
            targetId: 'tut-overview-section',
            content: `
                <p>Welcome to Professor Mode! This tutorial teaches you the fundamentals of <strong>sampling designs</strong> and how they affect data quality.</p>
                
                <h4>📚 What You'll Learn</h4>
                <ol>
                    <li>Why sampling design matters</li>
                    <li>Simple random sampling (SRS)</li>
                    <li>Stratified sampling for precision</li>
                    <li>Cluster sampling for efficiency</li>
                    <li>Systematic and convenience sampling pitfalls</li>
                    <li>How sampling distributions reveal bias</li>
                </ol>
                
                <p><strong>Why this matters:</strong> In marketing, you rarely survey everyone. How you select your sample determines whether your findings generalize—or mislead.</p>
            `,
            quizzes: [
                {
                    question: "Why does sampling design matter in marketing research?",
                    options: [
                        "It determines how quickly you can collect data",
                        "It determines whether your sample accurately represents the population",
                        "It only matters for very large populations"
                    ],
                    answer: 1,
                    feedback: "Correct! A well-designed sample produces estimates that generalize to the population. A poorly designed sample can be systematically biased, leading to wrong conclusions regardless of sample size."
                }
            ],
            check: () => true
        },
        {
            id: 'population-grid',
            title: "📚 Step 1: Understand the Population Grid",
            targetId: 'tut-visual-section',
            content: `
                <p>The grid represents a population of 1,000 individuals (40 rows × 25 columns).</p>
                
                <p><strong>What the colors mean:</strong></p>
                <ul>
                    <li>Each color = a different group (segment, region, etc.)</li>
                    <li>Colors show population structure</li>
                    <li>Hidden values (10–200) represent a metric of interest</li>
                </ul>
                
                <p><strong>When you sample:</strong></p>
                <ul>
                    <li>Selected individuals are highlighted</li>
                    <li>Non-selected individuals fade</li>
                    <li>You can see which groups are over/under-represented</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Look at the population grid. Notice how the groups (colors) are distributed across the grid.</p>
            `,
            quizzes: [
                {
                    question: "What do the different colors on the grid represent?",
                    options: [
                        "Different values of the outcome variable",
                        "Different groups or segments in the population",
                        "Whether an individual was sampled or not"
                    ],
                    answer: 1,
                    feedback: "Correct! Colors represent groups—like customer segments, regions, or demographic categories. This lets you see how different sampling designs capture or miss certain groups."
                }
            ],
            check: () => true,
            onEnter: () => {
                const grid = document.getElementById('population-grid');
                if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'srs-design',
            title: "🎲 Step 2: Simple Random Sampling (SRS)",
            targetId: 'tut-inputs-section',
            content: `
                <p>SRS is the gold standard—every individual has an <strong>equal chance</strong> of selection.</p>
                
                <p><strong>How it works:</strong></p>
                <ul>
                    <li>Like drawing names from a hat</li>
                    <li>No structure or grouping considered</li>
                    <li>Each individual is independently selected</li>
                </ul>
                
                <p><strong>Strengths:</strong></p>
                <ul>
                    <li>Unbiased—on average, represents population perfectly</li>
                    <li>Simple to implement and analyze</li>
                </ul>
                
                <p><strong>Weaknesses:</strong></p>
                <ul>
                    <li>Small groups may be underrepresented by chance</li>
                    <li>Can be expensive if population is spread out</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Select "Simple random sampling" and click "Draw one sample." Watch how individuals are scattered randomly.</p>
            `,
            quizzes: [
                {
                    question: "What makes simple random sampling 'unbiased'?",
                    options: [
                        "It always selects equal numbers from each group",
                        "Every individual has an equal probability of selection",
                        "It produces the same sample every time"
                    ],
                    answer: 1,
                    feedback: "Correct! 'Unbiased' means each individual has the same chance. On average across many samples, SRS produces estimates that equal the true population values—no systematic over- or under-representation."
                }
            ],
            check: () => {
                const designSelect = document.getElementById('sampling-design-select');
                return designSelect && designSelect.value === 'srs';
            },
            onEnter: () => {
                const designSelect = document.getElementById('sampling-design-select');
                if (designSelect) {
                    designSelect.value = 'srs';
                    designSelect.dispatchEvent(new Event('change'));
                }
            }
        },
        {
            id: 'experiment-srs',
            title: "🧪 Step 3: EXPERIMENT — Simulate Many SRS Samples",
            targetId: 'tut-visual-section',
            content: `
                <p>Let's see the <strong>sampling distribution</strong> of SRS.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Make sure "Simple random sampling" is selected</li>
                    <li>Set "Number of simulated samples" to <strong>200</strong></li>
                    <li>Click "Simulate many samples"</li>
                    <li>Watch the histogram build up</li>
                </ol>
                
                <p><strong>What to observe:</strong></p>
                <ul>
                    <li>The histogram shows sample means from 200 repeated samples</li>
                    <li>The red line marks the TRUE population mean</li>
                    <li>Notice: the histogram is centered on the red line!</li>
                </ul>
                
                <p><strong>Key insight:</strong> SRS is unbiased—sample means cluster around the true mean, sometimes high, sometimes low, but no systematic error.</p>
                
                <p class="task">👉 <strong>Task:</strong> Click "Simulate many samples" to build the sampling distribution.</p>
            `,
            quizzes: [
                {
                    question: "In the SRS sampling distribution, where is the histogram centered?",
                    options: [
                        "Above the true population mean (biased high)",
                        "Below the true population mean (biased low)",
                        "Centered on the true population mean (unbiased)"
                    ],
                    answer: 2,
                    feedback: "Correct! SRS is unbiased—the sampling distribution is centered on the true population mean. Individual samples vary, but there's no systematic tendency to be too high or too low."
                }
            ],
            check: () => {
                const countEl = document.getElementById('total-samples-count');
                return countEl && parseInt(countEl.textContent) >= 50;
            }
        },
        {
            id: 'stratified-design',
            title: "📊 Step 4: Stratified Sampling",
            targetId: 'tut-inputs-section',
            content: `
                <p>Stratified sampling <strong>divides the population into groups</strong> (strata) and samples from each.</p>
                
                <p><strong>How it works:</strong></p>
                <ul>
                    <li>Identify groups (colors on grid)</li>
                    <li>Sample from each group separately</li>
                    <li>Combine for final sample</li>
                </ul>
                
                <p><strong>Why use stratified?</strong></p>
                <ul>
                    <li><strong>Guarantee representation:</strong> Small groups won't be missed</li>
                    <li><strong>Oversample important segments:</strong> Get more precision for key groups</li>
                    <li><strong>Reduce variability:</strong> Often more precise than SRS</li>
                </ul>
                
                <p><strong>Marketing example:</strong> Survey 100 customers with 10% premium tier. With SRS, you might get 5-15 premium. With stratified (oversampling premium), you guarantee 30+ premium for reliable insights about that segment.</p>
                
                <p class="task">👉 <strong>Task:</strong> Switch to "Stratified sampling" and draw a sample.</p>
            `,
            quizzes: [
                {
                    question: "When is stratified sampling better than SRS?",
                    options: [
                        "When you don't know the population structure",
                        "When you need guaranteed representation of small but important groups",
                        "When you want the cheapest possible sample"
                    ],
                    answer: 1,
                    feedback: "Correct! Stratified sampling shines when you have identifiable groups and need to ensure each is represented. It's especially valuable for small but important segments that SRS might miss."
                }
            ],
            check: () => {
                const designSelect = document.getElementById('sampling-design-select');
                return designSelect && designSelect.value === 'stratified';
            },
            onEnter: () => {
                const designSelect = document.getElementById('sampling-design-select');
                if (designSelect) {
                    designSelect.value = 'stratified';
                    designSelect.dispatchEvent(new Event('change'));
                }
            }
        },
        {
            id: 'experiment-stratified',
            title: "🧪 Step 5: EXPERIMENT — Adjust Strata Weights",
            targetId: 'tut-inputs-section',
            content: `
                <p>Let's see how <strong>oversampling</strong> works in stratified designs.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Open "Advanced settings" → "Stratified sampling weights"</li>
                    <li>Set Group A weight = 1, Group B weight = 1, Group C weight = <strong>3</strong></li>
                    <li>Draw a sample</li>
                    <li>Notice: Group C (orange) appears MORE than its population share</li>
                </ol>
                
                <p><strong>Why oversample?</strong></p>
                <ul>
                    <li>Get more data points for precise subgroup estimates</li>
                    <li>In analysis, use weights to "adjust back" to population</li>
                    <li>Common for premium segments, rare conditions, emerging markets</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Give Group C a weight of 3 and draw a sample. Count how many orange individuals appear.</p>
            `,
            getDynamicQuizzes: () => {
                const samplePropEl = document.getElementById('metric-sample-prop');
                const truePropEl = document.getElementById('metric-true-prop');
                
                if (!samplePropEl || !truePropEl) return null;
                
                const sampleProp = samplePropEl.textContent;
                const trueProp = truePropEl.textContent;
                
                if (sampleProp === '–' || trueProp === '–') return null;
                
                return [
                    {
                        question: `True Group A proportion = ${trueProp}, Sample proportion = ${sampleProp}. Is this sample representative of Group A?`,
                        options: [
                            "Yes, sample proportion roughly matches population",
                            "No, Group A is overrepresented",
                            "No, Group A is underrepresented",
                            "Can't tell from these numbers"
                        ],
                        answer: parseFloat(sampleProp) > parseFloat(trueProp) * 1.1 ? 1 : 
                                parseFloat(sampleProp) < parseFloat(trueProp) * 0.9 ? 2 : 0,
                        feedback: "Compare sample proportion to true proportion. With oversampling another group, Group A may be underrepresented—that's the tradeoff. In analysis, you'd weight observations to adjust."
                    }
                ];
            },
            check: () => true
        },
        {
            id: 'cluster-design',
            title: "🏘️ Step 6: Cluster Sampling",
            targetId: 'tut-inputs-section',
            content: `
                <p>Cluster sampling selects <strong>whole groups</strong> (clusters) rather than individuals.</p>
                
                <p><strong>How it works:</strong></p>
                <ul>
                    <li>Divide population into clusters (blocks on grid)</li>
                    <li>Randomly select some clusters</li>
                    <li>Sample EVERYONE in selected clusters</li>
                </ul>
                
                <p><strong>Why use cluster sampling?</strong></p>
                <ul>
                    <li><strong>Cost efficiency:</strong> Interview everyone in visited stores/cities</li>
                    <li><strong>Practical necessity:</strong> Can't travel everywhere</li>
                </ul>
                
                <p><strong>The catch:</strong> If clusters differ systematically (some stores are high-income areas), you can get biased samples.</p>
                
                <p class="task">👉 <strong>Task:</strong> Switch to "Cluster sampling" and draw a sample. Notice how whole blocks are selected.</p>
            `,
            quizzes: [
                {
                    question: "Why might cluster sampling produce more variable estimates than SRS?",
                    options: [
                        "Because it uses smaller sample sizes",
                        "Because individuals within clusters tend to be similar, so you get less diverse information",
                        "Because clusters are always biased"
                    ],
                    answer: 1,
                    feedback: "Correct! People within clusters (same store, same neighborhood) tend to be similar. You get many similar observations rather than diverse ones. This increases sampling variability compared to SRS of the same size."
                }
            ],
            check: () => {
                const designSelect = document.getElementById('sampling-design-select');
                return designSelect && designSelect.value === 'cluster';
            },
            onEnter: () => {
                const designSelect = document.getElementById('sampling-design-select');
                if (designSelect) {
                    designSelect.value = 'cluster';
                    designSelect.dispatchEvent(new Event('change'));
                }
            }
        },
        {
            id: 'convenience-bias',
            title: "⚠️ Step 7: Convenience Sampling — The Danger",
            targetId: 'tut-inputs-section',
            content: `
                <p>Convenience sampling selects whoever is <strong>easiest to reach</strong>—and is almost always biased.</p>
                
                <p><strong>Examples in marketing:</strong></p>
                <ul>
                    <li>Surveying people in one mall (misses online shoppers)</li>
                    <li>Email surveys (misses non-digital customers)</li>
                    <li>Social media polls (misses non-followers)</li>
                </ul>
                
                <p><strong>In this visualizer:</strong> Convenience sampling only draws from one corner of the grid—systematically excluding most of the population.</p>
                
                <p class="task">👉 <strong>Task:</strong> Switch to "Convenience sampling" and draw a sample. Notice the gray box showing the accessible area.</p>
            `,
            quizzes: [
                {
                    question: "Why is convenience sampling problematic even with large samples?",
                    options: [
                        "Large samples are too expensive",
                        "The bias doesn't shrink with sample size—you're sampling from the wrong population",
                        "Convenience sampling takes too long"
                    ],
                    answer: 1,
                    feedback: "Correct! Convenience sampling has selection bias—you're not sampling from the full population. A bigger biased sample just gives you a more precise wrong answer. The bias doesn't go away."
                }
            ],
            check: () => {
                const designSelect = document.getElementById('sampling-design-select');
                return designSelect && designSelect.value === 'convenience';
            },
            onEnter: () => {
                const designSelect = document.getElementById('sampling-design-select');
                if (designSelect) {
                    designSelect.value = 'convenience';
                    designSelect.dispatchEvent(new Event('change'));
                }
            }
        },
        {
            id: 'experiment-bias',
            title: "🧪 Step 8: EXPERIMENT — Visualize Bias",
            targetId: 'tut-visual-section',
            content: `
                <p>Let's see <strong>bias in action</strong> with the sampling distribution.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Keep "Convenience sampling" selected</li>
                    <li>Click "Simulate many samples" (200 samples)</li>
                    <li>Look at the histogram relative to the red line</li>
                    <li>Notice: the histogram is NOT centered on the red line!</li>
                </ol>
                
                <p><strong>What you see is bias:</strong></p>
                <ul>
                    <li>The histogram peak is AWAY from the true mean</li>
                    <li>This isn't random error—it's systematic</li>
                    <li>More samples won't fix it</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Simulate 200 convenience samples. Is the histogram centered on the true mean (red line)?</p>
            `,
            getDynamicQuizzes: () => {
                const trueMeanEl = document.getElementById('metric-true-mean');
                const sampleMeanEl = document.getElementById('metric-sample-mean');
                const designEl = document.getElementById('sampling-design-select');
                
                if (!trueMeanEl || !sampleMeanEl || !designEl) return null;
                
                const trueMean = trueMeanEl.textContent;
                const sampleMean = sampleMeanEl.textContent;
                
                if (trueMean === '–' || sampleMean === '–') return null;
                
                const isConvenience = designEl.value === 'convenience';
                
                return [
                    {
                        question: isConvenience 
                            ? `With convenience sampling, the sampling distribution is ${parseFloat(sampleMean) !== parseFloat(trueMean) ? 'NOT' : ''} centered on the true mean. This demonstrates:`
                            : "Compare the current design's histogram to the true mean (red line). What pattern do you see?",
                        options: [
                            "Random sampling error (expected)",
                            "Selection bias (systematic error)",
                            "Measurement error"
                        ],
                        answer: isConvenience ? 1 : 0,
                        feedback: isConvenience 
                            ? "Correct! The histogram being off-center from the red line shows BIAS—not random error. Convenience sampling systematically misrepresents the population."
                            : "With proper random sampling, the histogram centers on the true mean. Any deviation is random error, not systematic bias."
                    }
                ];
            },
            check: () => {
                const countEl = document.getElementById('total-samples-count');
                return countEl && parseInt(countEl.textContent) >= 100;
            }
        },
        {
            id: 'experiment-sample-size',
            title: "🧪 Step 9: EXPERIMENT — Does Sample Size Fix Bias?",
            targetId: 'tut-inputs-section',
            content: `
                <p>A common misconception: "If I just get MORE data, bias will go away." Let's test that.</p>
                
                <p><strong>🔬 Your experiment:</strong></p>
                <ol>
                    <li>Keep "Convenience sampling" selected</li>
                    <li>Change sample size to <strong>200</strong> (much larger!)</li>
                    <li>Click "Simulate many samples"</li>
                    <li>Does the histogram center move to the red line?</li>
                </ol>
                
                <p><strong>Key insight:</strong> The histogram gets NARROWER (more precise) but stays OFF-CENTER (still biased). You get a more precise wrong answer!</p>
                
                <p class="task">👉 <strong>Task:</strong> Increase sample size to 200 with convenience sampling. Does the bias disappear?</p>
            `,
            quizzes: [
                {
                    question: "What happens to bias as sample size increases?",
                    options: [
                        "Bias decreases proportionally with √n",
                        "Bias stays the same—bigger samples just give more precise biased estimates",
                        "Bias increases with larger samples"
                    ],
                    answer: 1,
                    feedback: "Correct! Bias is a systematic error in your sampling frame or method. Larger samples reduce random sampling error (variance), but they don't touch bias. A biased design stays biased regardless of n."
                }
            ],
            check: () => {
                const sizeInput = document.getElementById('sample-size-input');
                return sizeInput && parseInt(sizeInput.value) >= 150;
            }
        },
        {
            id: 'compare-designs',
            title: "🔄 Step 10: Compare Multiple Designs",
            targetId: 'tut-visual-section',
            content: `
                <p>Now compare designs side-by-side to solidify your understanding.</p>
                
                <p><strong>🔬 Your comparison:</strong></p>
                <ol>
                    <li>Try each design and simulate 200 samples</li>
                    <li>For each, note:
                        <ul>
                            <li>Is histogram centered on red line? (unbiased vs. biased)</li>
                            <li>How wide is the histogram? (precision)</li>
                        </ul>
                    </li>
                </ol>
                
                <p><strong>Expected results:</strong></p>
                <table style="width:100%; font-size:0.9em;">
                    <tr><th>Design</th><th>Centered?</th><th>Width</th></tr>
                    <tr><td>SRS</td><td>✅ Yes</td><td>Medium</td></tr>
                    <tr><td>Stratified</td><td>✅ Yes</td><td>Often narrower</td></tr>
                    <tr><td>Cluster</td><td>✅ Usually</td><td>Often wider</td></tr>
                    <tr><td>Convenience</td><td>❌ No</td><td>Narrow but wrong</td></tr>
                </table>
                
                <p class="task">👉 <strong>Task:</strong> Switch between SRS and Stratified. Which has a narrower histogram?</p>
            `,
            quizzes: [
                {
                    question: "Which sampling design typically produces the most precise estimates (narrowest sampling distribution)?",
                    options: [
                        "Simple random sampling",
                        "Stratified sampling (properly weighted)",
                        "Cluster sampling",
                        "Convenience sampling"
                    ],
                    answer: 1,
                    feedback: "Correct! Stratified sampling typically beats SRS in precision because it ensures all groups are represented proportionally, reducing sampling variability. The gain is largest when groups differ from each other."
                }
            ],
            check: () => true
        },
        {
            id: 'conclusion',
            title: "🎓 Conclusion: Analyst's Perspective",
            targetId: 'tut-results-section',
            content: `
                <p><strong>Congratulations!</strong> You've learned the fundamentals of sampling designs.</p>
                
                <h4>🔑 Key Takeaways</h4>
                <ol>
                    <li><strong>SRS is the baseline:</strong> Unbiased, simple, but may miss small groups</li>
                    <li><strong>Stratified improves precision:</strong> Guarantees group representation</li>
                    <li><strong>Cluster trades precision for efficiency:</strong> Good for cost, watch for bias</li>
                    <li><strong>Convenience is dangerous:</strong> Biased no matter how large</li>
                    <li><strong>Bigger n ≠ less bias:</strong> Only proper design reduces bias</li>
                </ol>
                
                <h4>💼 Analyst's Perspective</h4>
                <p>Practical advice for marketing research:</p>
                <ul>
                    <li>Always ask: "Who is NOT in my sampling frame?"</li>
                    <li>Use stratified sampling for important small segments</li>
                    <li>If using convenience data, acknowledge the limitations</li>
                    <li>Simulate your sampling distribution to understand variability</li>
                </ul>
                
                <p><strong>Pro tip:</strong> Before analyzing ANY survey, map out your sampling design. Understand who could have been sampled vs. who was. That's where bias hides.</p>
                
                <p class="task">👉 <strong>Tutorial complete!</strong> Use this visualizer to teach sampling concepts or evaluate your own research designs.</p>
            `,
            quizzes: [
                {
                    question: "A colleague says: 'Our online survey had 10,000 responses—that's definitely representative!' What's the best response?",
                    options: [
                        "Yes, 10,000 is more than enough for any population",
                        "Sample size doesn't guarantee representativeness—who responded vs. who didn't matters more",
                        "Online surveys are always representative"
                    ],
                    answer: 1,
                    feedback: "Correct! Large samples don't cure selection bias. If only certain types of customers respond to online surveys, you have a precise estimate of the wrong thing. Always consider who's missing from your sample."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    ],
    lastCheckResult: null,

    init() {
        this.renderSidebar();
        this.renderOverlay();
        this.attachListeners();
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.currentHighlight = null;
        this.lastCheckResult = null;
        document.body.classList.add('tutorial-active');
        const sidebar = document.getElementById('tutorial-sidebar');
        if (sidebar) sidebar.classList.add('active');
        this.updateView();
    },

    stop() {
        this.isActive = false;
        document.body.classList.remove('tutorial-active');
        const sidebar = document.getElementById('tutorial-sidebar');
        if (sidebar) sidebar.classList.remove('active');
        this.hideOverlay();
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight = null;
        }
        // Log completion if on last step
        if (this.currentStep === this.steps.length - 1) {
            if (typeof logToolRunToBackend === 'function') {
                logToolRunToBackend(
                    { action: 'tutorial_completed', tool: 'sampling-visualizer' },
                    'Professor Mode tutorial completed for Sampling Visualizer'
                );
            }
        }

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
        const content = document.getElementById('tutorial-content');
        if (!content) return;

        // Initialize quiz state for this step
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        if (!step.quizState) {
            step.quizState = quizzes.map(() => ({ answered: false, correct: false }));
        }

        const totalSteps = this.steps.length;
        const isLastStep = this.currentStep === totalSteps - 1;

        // Build quiz HTML with inline handlers
        let quizHTML = '';
        if (quizzes.length > 0) {
            quizHTML = '<div class="tutorial-quizzes"><h4>📝 Check Your Understanding</h4>';
            quizzes.forEach((q, qIndex) => {
                const state = step.quizState[qIndex];
                quizHTML += `<div class="tutorial-quiz-item ${state.answered ? (state.correct ? 'correct' : 'incorrect') : ''}">
                    <p><strong>Q${qIndex + 1}:</strong> ${q.question}</p>
                    <div class="tutorial-quiz-options">`;
                q.options.forEach((opt, oIndex) => {
                    const isSelected = state.selectedValue === oIndex;
                    const optionClass = state.answered ? (oIndex === q.answer ? 'correct-answer' : (isSelected && !state.correct ? 'wrong-answer' : '')) : '';
                    quizHTML += `<label class="tutorial-quiz-option ${optionClass}">
                        <input type="radio" name="tut-quiz-${this.currentStep}-${qIndex}" value="${oIndex}" 
                            onchange="SamplingVisualizerTutorial.checkQuiz(${qIndex}, ${oIndex})"
                            ${state.answered ? 'disabled' : ''} ${isSelected ? 'checked' : ''}>
                        <span>${opt}</span>
                    </label>`;
                });
                quizHTML += '</div>';
                if (state.answered) {
                    quizHTML += `<div class="tutorial-feedback ${state.correct ? 'correct' : 'incorrect'}">
                        ${state.correct ? '✓ ' : '✗ '}${q.feedback}
                    </div>`;
                }
                quizHTML += '</div>';
            });
            quizHTML += '</div>';
        }

        // Task completion status
        const taskComplete = step.check ? step.check() : true;
        const quizzesComplete = step.quizState.every(s => s.answered && s.correct);
        const allComplete = taskComplete && (quizzes.length === 0 || quizzesComplete);

        let statusHTML = '<div class="tutorial-status">';
        if (step.check && step.check !== (() => true)) {
            statusHTML += `<div class="status-item ${taskComplete ? 'complete' : 'pending'}">
                ${this.getCheckmark(taskComplete)} Task: ${taskComplete ? 'Complete!' : 'In progress...'}
            </div>`;
        }
        if (quizzes.length > 0) {
            statusHTML += `<div class="status-item ${quizzesComplete ? 'complete' : 'pending'}">
                ${this.getCheckmark(quizzesComplete)} Quiz: ${step.quizState.filter(s => s.correct).length}/${quizzes.length} correct
            </div>`;
        }
        statusHTML += '</div>';

        content.innerHTML = `
            <div class="tutorial-header">
                <span class="tutorial-step-indicator">Step ${this.currentStep + 1} of ${totalSteps}</span>
                <h3>${step.title}</h3>
            </div>
            <div class="tutorial-body">
                ${step.content}
                ${quizHTML}
                ${statusHTML}
            </div>
            <div class="tutorial-nav">
                ${this.currentStep > 0 ? `<button class="tutorial-btn secondary" onclick="SamplingVisualizerTutorial.currentStep--; SamplingVisualizerTutorial.currentHighlight = null; SamplingVisualizerTutorial.lastCheckResult = null; SamplingVisualizerTutorial.updateView();">← Previous</button>` : '<span></span>'}
                ${isLastStep 
                    ? `<button class="tutorial-btn primary" onclick="SamplingVisualizerTutorial.stop(); document.getElementById('professorMode').checked = false;">Finish Tutorial</button>`
                    : `<button class="tutorial-btn primary" onclick="SamplingVisualizerTutorial.nextStep();">Next Step →</button>`
                }
            </div>
        `;

        // Handle highlighting
        if (step.targetId) {
            this.highlightElement(step.targetId);
        } else {
            this.hideOverlay();
        }

        // Call onEnter if defined
        if (step.onEnter) step.onEnter();
    },

    checkQuiz(qIndex, selectedValue) {
        const step = this.steps[this.currentStep];
        let quizzes = step.quizzes || [];
        if (step.getDynamicQuizzes && typeof step.getDynamicQuizzes === 'function') {
            const dynamicQuizzes = step.getDynamicQuizzes();
            if (dynamicQuizzes && dynamicQuizzes.length > 0) {
                quizzes = dynamicQuizzes;
            }
        }
        const quiz = quizzes[qIndex];
        if (!quiz || !step.quizState) return;

        const isCorrect = selectedValue === quiz.answer;
        step.quizState[qIndex] = { answered: true, correct: isCorrect, selectedValue };
        this.updateView();
    },

    getCheckmark(completed) {
        return completed ? '✅' : '⬜';
    },

    checkProgress() {
        if (!this.isActive) return;
        const step = this.steps[this.currentStep];
        if (step.check) {
            const result = step.check();
            if (result !== this.lastCheckResult) {
                this.lastCheckResult = result;
                this.updateView();
            }
        }
    },

    highlightElement(targetId) {
        const target = document.getElementById(targetId);
        if (!target) {
            this.hideOverlay();
            return;
        }

        // Remove previous highlight
        if (this.currentHighlight && this.currentHighlight !== target) {
            this.currentHighlight.classList.remove('tutorial-highlight');
        }

        target.classList.add('tutorial-highlight');
        this.currentHighlight = target;
        this.showOverlay();

        // Scroll into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    showOverlay() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.add('active');
    },

    hideOverlay() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.remove('active');
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
            this.currentHighlight = null;
        }
    },

    renderSidebar() {
        // Remove any existing sidebar
        const existing = document.getElementById('tutorial-sidebar');
        if (existing) existing.remove();

        const sidebar = document.createElement('div');
        sidebar.id = 'tutorial-sidebar';
        sidebar.className = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="tutorial-sidebar-header">
                <span>🎓 Professor Mode</span>
                <button class="tutorial-close-btn" onclick="SamplingVisualizerTutorial.stop(); document.getElementById('professorMode').checked = false;">✕</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(sidebar);
    },

    renderOverlay() {
        // Remove any existing overlay
        const existing = document.getElementById('tutorial-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);
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

        // Poll for task completion
        setInterval(() => this.checkProgress(), 500);
    }
};

// Initialize after DOM loads
setTimeout(() => SamplingVisualizerTutorial.init(), 500);
