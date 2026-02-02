/**
 * One-Way ANOVA Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 */

const AnovaTutorial = {
    isActive: false,
    currentStep: 0,
    currentHighlight: null,
    lastCheckResult: null,

    // Tutorial Steps
    steps: [
        {
            id: 'intro',
            title: "🎓 Welcome to One-Way ANOVA",
            targetId: null,
            content: `
                <p>Welcome! Today we're going to learn how to conduct <strong>one-way ANOVA</strong> (Analysis of Variance) to compare means across multiple groups.</p>
                <p><strong>The Mission:</strong> You'll analyze a real marketing dataset to determine whether different marketing messages produce different customer responses.</p>
                <p>I'll guide you through each step:</p>
                <ol>
                    <li>Understanding ANOVA concepts</li>
                    <li>Downloading and inspecting raw data</li>
                    <li>Loading data into the tool</li>
                    <li>Understanding group statistics</li>
                    <li>Running the ANOVA test</li>
                    <li>Interpreting the F-statistic and p-value</li>
                    <li>Reading the visual output</li>
                    <li>Understanding effect size</li>
                    <li>Drawing business conclusions</li>
                </ol>
                <p><strong>Why ANOVA?</strong> When you have multiple groups to compare (e.g., different ad variants, pricing tiers, or customer segments), ANOVA tells you whether the observed differences in means are statistically significant or just due to chance. While ANOVA is most commonly used with 3+ groups, it works perfectly well with 2 groups too—in that case, it's mathematically equivalent to an independent t-test.</p>
            `,
            quizzes: [
                {
                    question: "What does one-way ANOVA test for?",
                    options: [
                        "Whether two categorical variables are associated",
                        "Whether means differ across two or more groups",
                        "Whether a single variable follows a normal distribution"
                    ],
                    answer: 1,
                    feedback: "Correct! ANOVA tests whether group means differ significantly. It works for 2+ groups—with exactly 2 groups it's equivalent to a t-test, but it's most commonly used when comparing 3 or more groups."
                }
            ],
            check: () => true
        },
        {
            id: 'concepts',
            title: "📚 Step 1: Understanding ANOVA",
            targetId: 'tut-overview-section',
            content: `
                <p>Before we analyze data, let's understand what ANOVA does.</p>
                <p><strong>The key insight:</strong> ANOVA compares two sources of variation:</p>
                <ul>
                    <li><strong>Between-group variance:</strong> How much do group means differ from the overall (grand) mean?</li>
                    <li><strong>Within-group variance:</strong> How much variability exists within each group?</li>
                </ul>
                <p><strong>The F-statistic:</strong> A ratio of between-group to within-group variance. Larger F = stronger evidence that groups differ.</p>
                <p><strong>Key assumptions:</strong></p>
                <ul>
                    <li>Independent observations</li>
                    <li>Approximately normal distributions within groups</li>
                    <li>Similar variances across groups (homogeneity)</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>Test Overview & Equations</strong> section. Expand "Additional Notes" to learn about follow-up tests.</p>
            `,
            quizzes: [
                {
                    question: "What does the F-statistic in ANOVA measure?",
                    options: [
                        "The difference between the two largest group means",
                        "The ratio of between-group variance to within-group variance",
                        "The correlation between groups"
                    ],
                    answer: 1,
                    feedback: "Correct! F = MS_between / MS_within. A large F indicates that group means vary more than you'd expect from within-group noise alone."
                },
                {
                    question: "If F is close to 1.0, what does that suggest?",
                    options: [
                        "Strong evidence that groups differ",
                        "Between-group variance is similar to within-group variance (groups may not differ)",
                        "The test failed to run properly"
                    ],
                    answer: 1,
                    feedback: "Correct! F ≈ 1 means the signal (between-group) is about equal to noise (within-group), suggesting no meaningful group differences."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-overview-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },
        {
            id: 'download_data',
            title: "📥 Step 2: Download and Inspect Data",
            targetId: 'tut-scenario-section',
            content: `
                <p>Now let's work with <strong>real data</strong>. We'll use the "Lifecycle Messaging Raw Dataset" scenario.</p>
                <p><strong>About this dataset:</strong> A lifecycle marketing team tested 4 post-renewal message styles to see which generates the highest incremental revenue per customer:</p>
                <ul>
                    <li><strong>Always-on Thank-You:</strong> Simple appreciation note</li>
                    <li><strong>Tiered Loyalty Story:</strong> Highlights status and rewards</li>
                    <li><strong>Benefit Carousel:</strong> Rotating concrete perks</li>
                    <li><strong>VIP Drop Invite:</strong> Hype-driven exclusive offers</li>
                </ul>
                <p><strong>Your task:</strong></p>
                <ol>
                    <li>Select <strong>"Lifecycle Messaging Raw Dataset"</strong> from the dropdown</li>
                    <li>Click the <strong>"Download scenario dataset"</strong> button</li>
                    <li>Open the downloaded CSV file to see its structure</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> Select the scenario and download the raw data file. Examine its two-column format: group label and numeric value.</p>
            `,
            quizzes: [
                {
                    question: "What format does the raw data file use?",
                    options: [
                        "Each row has all four group statistics (mean, SD, n, label)",
                        "Each row has one observation: a group label and a single numeric value",
                        "The file contains pre-calculated summary statistics only"
                    ],
                    answer: 1,
                    feedback: "Correct! Raw data has one row per observation—just the group label and the measured value. The tool calculates means, SDs, and sample sizes from these raw values."
                },
                {
                    question: "Why is downloading and inspecting raw data important before analysis?",
                    options: [
                        "To verify the file format matches what the tool expects",
                        "To check for data quality issues (missing values, outliers, unexpected groups)",
                        "Both of the above"
                    ],
                    answer: 2,
                    feedback: "Correct! Always inspect your data before analysis. You want to verify format compatibility AND check for quality issues like missing values or unexpected entries."
                }
            ],
            check: () => {
                const scenarioSelect = document.getElementById('scenario-select');
                return scenarioSelect && scenarioSelect.value === 'loyalty_lifecycle_raw';
            },
            onEnter: () => {
                const section = document.getElementById('tut-scenario-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'upload_data',
            title: "📊 Step 3: Load Data into the Tool",
            targetId: 'tut-input-section',
            content: `
                <p>Now let's load the raw data into the ANOVA tool.</p>
                <p><strong>The tool offers three input modes:</strong></p>
                <ul>
                    <li><strong>Manual entry:</strong> Type summary stats directly</li>
                    <li><strong>Upload summary inputs:</strong> Import pre-calculated group means, SDs, and n's</li>
                    <li><strong>Upload raw data:</strong> Import individual observations (what we're using)</li>
                </ul>
                <p><strong>When you load raw data, the tool automatically:</strong></p>
                <ol>
                    <li>Groups observations by label</li>
                    <li>Calculates each group's mean, standard deviation, and sample size</li>
                    <li>Populates the summary table</li>
                </ol>
                <p class="task">👉 <strong>Task:</strong> The scenario should auto-load the data. Verify you see <strong>4 groups</strong> populated in the input table with their calculated statistics.</p>
            `,
            quizzes: [
                {
                    question: "If you upload raw data with 96 total rows across 4 groups, what does the tool calculate for each group?",
                    options: [
                        "Just the count of rows per group",
                        "Mean, standard deviation, and sample size (n) for each group",
                        "Only the sum of all values"
                    ],
                    answer: 1,
                    feedback: "Correct! From raw data, the tool computes each group's mean (average), SD (spread), and n (count)—exactly what ANOVA needs."
                }
            ],
            check: () => {
                const groups = typeof collectGroupData === 'function' ? collectGroupData() : [];
                return groups.length >= 4 && groups.every(g => isFinite(g.mean) && isFinite(g.sd) && g.n >= 2);
            },
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'group_stats',
            title: "🔢 Step 4: Understand Group Statistics",
            targetId: 'tut-input-section',
            getDynamicQuizzes: () => {
                if (typeof collectGroupData !== 'function') return null;
                const groups = collectGroupData();
                if (!groups || groups.length < 4) return null;
                
                const validGroups = groups.filter(g => isFinite(g.mean) && isFinite(g.sd) && g.n >= 2);
                if (validGroups.length < 4) return null;
                
                // Find highest and lowest mean groups
                const sorted = [...validGroups].sort((a, b) => b.mean - a.mean);
                const highest = sorted[0];
                const lowest = sorted[sorted.length - 1];
                const diff = (highest.mean - lowest.mean).toFixed(2);
                
                return [
                    {
                        question: `Looking at the group statistics, which message type has the HIGHEST mean revenue per customer?`,
                        options: validGroups.slice(0, 4).map(g => g.name),
                        answer: validGroups.findIndex(g => g.name === highest.name),
                        feedback: `Correct! "${highest.name}" has the highest mean at $${highest.mean.toFixed(2)} per customer.`
                    },
                    {
                        question: `What is the approximate difference between the highest and lowest group means?`,
                        options: [
                            `About $${(parseFloat(diff) * 0.5).toFixed(0)}`,
                            `About $${parseFloat(diff).toFixed(0)}`,
                            `About $${(parseFloat(diff) * 2).toFixed(0)}`
                        ],
                        answer: 1,
                        feedback: `Correct! The difference between "${highest.name}" ($${highest.mean.toFixed(2)}) and "${lowest.name}" ($${lowest.mean.toFixed(2)}) is about $${diff}.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What do the Mean, SD, and n columns represent?",
                    options: [
                        "Mean = average value, SD = spread of values, n = sample size",
                        "Mean = maximum value, SD = minimum value, n = range",
                        "Mean = median value, SD = mode, n = total revenue"
                    ],
                    answer: 0,
                    feedback: "Correct! Mean is the average, SD (standard deviation) measures how spread out the values are, and n is the count of observations in each group."
                }
            ],
            content: `
                <p>Now let's examine the calculated group statistics.</p>
                <p><strong>For each message type, you should see:</strong></p>
                <ul>
                    <li><strong>Mean:</strong> Average incremental revenue per customer</li>
                    <li><strong>SD:</strong> Standard deviation (how spread out values are)</li>
                    <li><strong>n:</strong> Sample size (number of customers in that group)</li>
                </ul>
                <p><strong>Key observations:</strong></p>
                <ul>
                    <li>Look at the means—do they differ noticeably?</li>
                    <li>Are the SDs similar across groups? (ANOVA assumes homogeneity of variance)</li>
                    <li>Are sample sizes reasonably balanced?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Identify which message type has the highest mean and which has the lowest. Note the approximate dollar difference.</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-input-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'interpret_f',
            title: "📈 Step 5: The F-Statistic and P-Value",
            targetId: 'tut-results-section',
            getDynamicQuizzes: () => {
                // We need to get ANOVA results from the interpretation panel
                const interpretEl = document.getElementById('interpretation');
                if (!interpretEl || !interpretEl.textContent) return null;
                
                // Try to parse F and p from the APA report
                const apaEl = document.getElementById('anova-apa-report');
                if (!apaEl || !apaEl.textContent) return null;
                
                const apaText = apaEl.textContent;
                // Looking for F(df1, df2) = X.XX, p < 0.001 pattern
                const fMatch = apaText.match(/F\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*=\s*([\d.]+)/i);
                const pMatch = apaText.match(/p\s*[<=]\s*([\d.<]+)/i);
                
                if (!fMatch) return null;
                
                const fValue = parseFloat(fMatch[3]);
                const dfBetween = parseInt(fMatch[1]);
                const dfWithin = parseInt(fMatch[2]);
                
                // Determine significance
                const isSignificant = pMatch && (pMatch[1].includes('<') || parseFloat(pMatch[1]) < 0.05);
                const pDisplay = pMatch ? pMatch[0].replace('p', '').trim() : 'unknown';
                
                return [
                    {
                        question: `The F-statistic is ${fValue.toFixed(2)}. Is this value large or small?`,
                        options: [
                            "Small (close to 1, suggesting little difference between groups)",
                            "Large (much greater than 1, suggesting meaningful group differences)",
                            "Cannot determine without more information"
                        ],
                        answer: fValue > 3 ? 1 : 0,
                        feedback: fValue > 3 
                            ? `Correct! F = ${fValue.toFixed(2)} is much larger than 1, indicating between-group variance greatly exceeds within-group variance.`
                            : `Correct! F = ${fValue.toFixed(2)} is relatively close to 1, suggesting between-group and within-group variance are similar.`
                    },
                    {
                        question: `Based on the p-value (${pDisplay}), is the overall ANOVA result statistically significant at α = 0.05?`,
                        options: [
                            "Yes, because p < 0.05",
                            "No, because p > 0.05",
                            "Cannot determine"
                        ],
                        answer: isSignificant ? 0 : 1,
                        feedback: isSignificant 
                            ? `Correct! With p ${pDisplay}, which is less than 0.05, we reject the null hypothesis—at least one group mean differs significantly from the others.`
                            : `Correct! With p ${pDisplay}, which is greater than 0.05, we fail to reject the null hypothesis—the observed differences may be due to chance.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "What does a statistically significant ANOVA result tell you?",
                    options: [
                        "All groups have the same mean",
                        "At least one group mean is significantly different from the others",
                        "The largest group has the highest mean"
                    ],
                    answer: 1,
                    feedback: "Correct! A significant F-test tells you that at least one group differs—but not WHICH groups differ. That requires follow-up tests like Tukey's HSD."
                }
            ],
            content: `
                <p>The ANOVA has been calculated. Let's interpret the key statistics.</p>
                <p><strong>Look at the Test Results section for:</strong></p>
                <ul>
                    <li><strong>F-statistic:</strong> The ratio of between-group to within-group variance</li>
                    <li><strong>p-value:</strong> Probability of seeing this F (or larger) if groups were truly equal</li>
                    <li><strong>Degrees of freedom:</strong> df_between = k-1, df_within = N-k</li>
                </ul>
                <p><strong>Decision rule:</strong> If p < α (usually 0.05), reject the null hypothesis that all group means are equal.</p>
                <p class="task">👉 <strong>Task:</strong> Read the highlighted <strong>APA-Style Statistical Reporting</strong> to find the F-statistic and p-value.</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'visual_output',
            title: "📊 Step 6: Reading the Fan Chart",
            targetId: 'tut-visual-section',
            content: `
                <p>The <strong>Group Means Fan Chart</strong> visualizes your results.</p>
                <p><strong>How to read this chart:</strong></p>
                <ul>
                    <li><strong>Dot:</strong> The point estimate (sample mean) for each group</li>
                    <li><strong>Colored bands:</strong> Confidence intervals (50%, 80%, 95% by default)</li>
                    <li><strong>Narrower bands:</strong> More precise estimates (larger sample sizes or smaller SDs)</li>
                </ul>
                <p><strong>Key insight:</strong> When confidence intervals <em>don't overlap</em>, that's visual evidence of a significant difference. But be careful—overlapping CIs don't always mean "no difference" (ANOVA uses a different pooled error).</p>
                <p><strong>Look for the pattern:</strong></p>
                <ul>
                    <li>Which groups cluster together?</li>
                    <li>Which groups stand apart?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Examine the fan chart. Do the highest-mean groups have non-overlapping intervals from the lowest?</p>
            `,
            quizzes: [
                {
                    question: "What do the colored bands around each mean represent?",
                    options: [
                        "The range of all individual data points in that group",
                        "Confidence intervals showing the uncertainty around the estimated mean",
                        "The standard deviation of the group"
                    ],
                    answer: 1,
                    feedback: "Correct! The bands are confidence intervals—they show the range where the true population mean likely falls, given sampling uncertainty."
                },
                {
                    question: "If two groups' 95% confidence intervals don't overlap at all, what does that suggest?",
                    options: [
                        "The groups definitely have different population means",
                        "Strong visual evidence that the groups differ significantly",
                        "The sample sizes are too small"
                    ],
                    answer: 1,
                    feedback: "Correct! Non-overlapping CIs provide strong visual evidence of a significant difference, though formal tests (like Tukey's HSD) should confirm."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-visual-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'effect_size',
            title: "📏 Step 7: Understanding Effect Size",
            targetId: 'tut-summary-section',
            getDynamicQuizzes: () => {
                const summaryBody = document.getElementById('summary-table-body');
                if (!summaryBody) return null;
                
                // Look for eta-squared row
                const rows = summaryBody.querySelectorAll('tr');
                let etaValue = null;
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const measureText = cells[0].textContent.toLowerCase();
                        if (measureText.includes('eta') || measureText.includes('η²')) {
                            const val = parseFloat(cells[1].textContent);
                            if (isFinite(val)) etaValue = val;
                        }
                    }
                });
                
                if (etaValue === null) return null;
                
                // Determine effect size category
                let category, explanation;
                if (etaValue < 0.01) {
                    category = 'negligible';
                    explanation = 'less than 1% of variance is explained by group membership';
                } else if (etaValue < 0.06) {
                    category = 'small';
                    explanation = `about ${(etaValue * 100).toFixed(1)}% of variance is explained—a modest but potentially meaningful effect`;
                } else if (etaValue < 0.14) {
                    category = 'medium';
                    explanation = `about ${(etaValue * 100).toFixed(1)}% of variance is explained—a substantial practical effect`;
                } else {
                    category = 'large';
                    explanation = `about ${(etaValue * 100).toFixed(1)}% of variance is explained—a major practical effect`;
                }
                
                return [
                    {
                        question: `The eta-squared (η²) value is approximately ${(etaValue).toFixed(3)}. How would you classify this effect size?`,
                        options: [
                            "Small (η² ≈ 0.01)",
                            "Medium (η² ≈ 0.06)",
                            "Large (η² ≥ 0.14)"
                        ],
                        answer: etaValue < 0.06 ? 0 : (etaValue < 0.14 ? 1 : 2),
                        feedback: `Correct! With η² ≈ ${etaValue.toFixed(3)}, this is a ${category} effect—${explanation}.`
                    }
                ];
            },
            quizzes: [
                {
                    question: "Why is effect size important in addition to statistical significance?",
                    options: [
                        "Effect size tells you IF there's a difference; p-value tells you HOW BIG",
                        "Statistical significance can occur with tiny, practically meaningless differences if n is large enough",
                        "Effect size is only relevant for t-tests, not ANOVA"
                    ],
                    answer: 1,
                    feedback: "Correct! With large samples, even trivial differences can be 'statistically significant.' Effect size (like η²) tells you the practical magnitude of the difference."
                }
            ],
            content: `
                <p>Statistical significance tells you IF groups differ. <strong>Effect size</strong> tells you BY HOW MUCH.</p>
                <p><strong>Eta-squared (η²) interpretation:</strong></p>
                <ul>
                    <li><strong>η² ≈ 0.01:</strong> Small effect (~1% of variance explained)</li>
                    <li><strong>η² ≈ 0.06:</strong> Medium effect (~6% of variance explained)</li>
                    <li><strong>η² ≥ 0.14:</strong> Large effect (14%+ of variance explained)</li>
                </ul>
                <p><strong>Business interpretation:</strong> η² tells you what proportion of the variation in revenue is explained by which message customers received (vs. other factors).</p>
                <p class="task">👉 <strong>Task:</strong> Find eta-squared (η²) in the Summary of Estimates table. Is this a small, medium, or large effect?</p>
            `,
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-summary-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'business_conclusions',
            title: "💼 Step 8: Business Conclusions",
            targetId: 'tut-results-section',
            content: `
                <p>Now let's translate statistics into actionable insights.</p>
                <p><strong>The Managerial Interpretation panel provides:</strong></p>
                <ul>
                    <li>Plain-language summary of findings</li>
                    <li>Practical significance (not just statistical)</li>
                    <li>Guidance on next steps</li>
                </ul>
                <p><strong>Key questions to answer:</strong></p>
                <ul>
                    <li>Is there a "winning" message type?</li>
                    <li>Is the revenue difference large enough to matter operationally?</li>
                    <li>What follow-up analyses might be needed?</li>
                </ul>
                <p class="task">👉 <strong>Task:</strong> Read the <strong>Managerial Interpretation</strong> panel. Based on the results, what recommendation would you make to the lifecycle marketing team?</p>
            `,
            quizzes: [
                {
                    question: "If ANOVA is significant but you want to know WHICH specific groups differ, what should you do?",
                    options: [
                        "Just look at which group has the highest mean",
                        "Run follow-up pairwise comparisons (like Tukey's HSD)",
                        "Repeat the ANOVA with only two groups at a time"
                    ],
                    answer: 1,
                    feedback: "Correct! ANOVA tells you 'at least one differs' but not which. Tukey's HSD (or similar post-hoc tests) identifies which specific pairs are significantly different."
                },
                {
                    question: "When might a statistically significant ANOVA result NOT lead to a business action?",
                    options: [
                        "When the p-value is very small",
                        "When the effect size is tiny and the cost of changing strategies exceeds the benefit",
                        "Never—statistical significance always means business significance"
                    ],
                    answer: 1,
                    feedback: "Correct! A $0.50 difference per customer might be statistically significant with large n, but if switching strategies costs millions, the ROI doesn't make sense."
                }
            ],
            check: () => true,
            onEnter: () => {
                const section = document.getElementById('tut-results-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        {
            id: 'conclusion',
            title: "🎓 Professor Mode Complete!",
            targetId: null,
            content: `
                <p>Excellent work! You've mastered the fundamentals of one-way ANOVA.</p>
                
                <h4>📊 What You've Learned</h4>
                <ul>
                    <li><strong>ANOVA purpose:</strong> Compare means across 2+ groups (most common with 3+)</li>
                    <li><strong>F-statistic:</strong> Ratio of between-group to within-group variance</li>
                    <li><strong>P-value:</strong> Probability of observed F if null hypothesis were true</li>
                    <li><strong>Effect size (η²):</strong> Proportion of variance explained by group membership</li>
                    <li><strong>Visual interpretation:</strong> Fan charts show means and confidence intervals</li>
                    <li><strong>Raw data workflow:</strong> Download, inspect, upload, analyze</li>
                    <li><strong>Business application:</strong> Statistical significance vs. practical importance</li>
                </ul>
                
                <h4>🔬 Analyst's Perspective: Beyond This Tutorial</h4>
                <p style="font-style: italic; background: #f0f9ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 6px; line-height: 1.7;">
                    One-way ANOVA assumes equal variances across groups (homoscedasticity) and normally distributed residuals—assumptions that real marketing data frequently violates. When variances differ substantially, consider Welch's ANOVA; when data is heavily skewed, non-parametric alternatives like Kruskal-Wallis may be more appropriate. Professional analysts also think carefully about <em>what drives</em> the observed differences: is the VIP messaging truly better, or are VIP recipients already more engaged customers? This is where randomization matters—and where more advanced methods like ANCOVA (controlling for covariates) or mixed-effects models become essential. As you advance, ask not just "do groups differ?" but "why do they differ, and for whom?"
                </p>
                
                <h4>🎯 Next Steps</h4>
                <ul>
                    <li>Enable <strong>Tukey's HSD</strong> in Advanced Settings to identify which specific pairs differ</li>
                    <li>Try other scenarios or upload your own marketing data</li>
                    <li>Explore the <strong>Diagnostics</strong> section to check ANOVA assumptions</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 6px;">
                    <strong>📚 Keep Learning</strong><br>
                    Explore other hypothesis testing tools on the site: independent t-tests for 2-group comparisons, chi-square for categorical outcomes, and paired tests for before/after designs!
                </p>
            `,
            check: () => true,
            onEnter: () => {
                AnovaTutorial.hideOverlay();
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
                    { action: 'tutorial_completed', tool: 'oneway-anova' },
                    'Professor Mode tutorial completed for One-Way ANOVA'
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
        
        // CRITICAL: Store resolved quizzes on step object
        step.currentQuizzes = quizzes;
        
        // Initialize quiz state if needed
        if (!step.quizState || step.quizState.length !== quizzes.length) {
            step.quizState = quizzes.map(() => ({ completed: false }));
        }
        
        // Update sidebar content
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
                                    <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                                        <input type="radio" name="quiz_q_${this.currentStep}_${qIndex}" value="${i}" onchange="AnovaTutorial.checkQuiz(${qIndex}, this.value)">
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
                    `<button class="btn-primary full-width" onclick="AnovaTutorial.stop()">🎓 Finish Tutorial</button>` :
                    `<button class="btn-primary full-width" onclick="AnovaTutorial.nextStep()">Next Step ➜</button>`
                ) : 
                `<button class="btn-secondary full-width" disabled>Complete task & quizzes to continue</button>`
            }
            
            <button class="btn-secondary full-width" onclick="AnovaTutorial.stop()" style="margin-top: 10px; font-size: 0.9em;">Exit Tutorial</button>
        `;
        
        // Handle highlighting
        this.highlightElement(step.targetId);
        
        // Run onEnter callback
        if (step.onEnter) {
            step.onEnter();
        }
    },

    checkStep() {
        const step = this.steps[this.currentStep];
        if (step.check) {
            return step.check();
        }
        return true;
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
            feedbackEl.innerHTML = `<span style="color: #10b981;">✅ Correct! ${quiz.feedback}</span>`;
            feedbackEl.style.display = 'block';
            
            // Disable all radio buttons for this quiz
            document.querySelectorAll(`input[name="quiz_q_${this.currentStep}_${qIndex}"]`).forEach(input => {
                input.disabled = true;
            });
            
            // Re-render to update progress
            setTimeout(() => this.updateView(), 300);
        } else {
            feedbackEl.innerHTML = `<span style="color: #ef4444;">❌ Not quite. Try again!</span>`;
            feedbackEl.style.display = 'block';
        }
    },

    getCheckmark(completed) {
        return completed ? 
            '<span style="color: #10b981; font-size: 1.2em;">✅</span>' :
            '<span style="color: #9ca3af; font-size: 1.2em;">⬜</span>';
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
        // Remove previous highlight
        if (this.currentHighlight) {
            this.currentHighlight.classList.remove('tutorial-highlight');
        }
        
        // Show/hide overlay
        if (targetId) {
            this.showOverlay();
            const element = document.getElementById(targetId);
            if (element) {
                element.classList.add('tutorial-highlight');
                this.currentHighlight = element;
            }
        } else {
            this.hideOverlay();
        }
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
        // Check if sidebar already exists
        if (document.getElementById('tutorial-sidebar')) return;
        
        const sidebar = document.createElement('div');
        sidebar.id = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>👨‍🏫 Professor Mode</h2>
                <button onclick="AnovaTutorial.stop()" class="close-tutorial">×</button>
            </div>
            <div id="tutorial-content"></div>
        `;
        document.body.appendChild(sidebar);
    },

    renderOverlay() {
        // Check if overlay already exists
        if (document.getElementById('tutorial-overlay')) return;
        
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => AnovaTutorial.init(), 500);
});
