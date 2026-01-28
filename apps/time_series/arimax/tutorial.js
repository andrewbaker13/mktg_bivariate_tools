/**
 * ARIMAX/SARIMAX Tutorial Engine
 * "Professor Mode" - Guided Educational Experience
 * 
 * Takes students through:
 * 1. Understanding time series forecasting
 * 2. Running ARIMAX (without seasonality)
 * 3. Diagnosing missing seasonal patterns
 * 4. Upgrading to SARIMAX
 * 5. Interpreting results for business decisions
 */

const Tutorial = {
    isActive: false,
    currentStep: 0,
    
    // Track model runs for comparison
    arimaxRun: null,
    sarimaxRun: null,
    
    // Configuration
    config: {
        targetScenario: 'scenario-mobile-game',
        requiredSeasonalPeriod: 12
    },

    // Tutorial Steps
    steps: [
        // ═══════════════════════════════════════════════════════════════
        // STEP 1: Introduction
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'intro',
            title: "🎓 Welcome to Time Series Forecasting",
            targetId: null,
            content: `
                <p>Welcome! Today we'll learn to forecast <strong>future marketing outcomes</strong> using time series analysis.</p>
                
                <p><strong>The Mission:</strong> A mobile game company needs to predict <strong>monthly user signups</strong> for the next year to plan their marketing budget.</p>
                
                <p><strong>The Challenge:</strong> Their data has a <em>seasonal pattern</em> — signups spike every January/February after the holidays. We need to capture this pattern or our forecasts will be wrong!</p>
                
                <p>I'll guide you through:</p>
                <ol>
                    <li>Loading and understanding the data</li>
                    <li>Building a basic ARIMAX model</li>
                    <li>Discovering what's missing (seasonality!)</li>
                    <li>Upgrading to SARIMAX</li>
                    <li>Translating results into business strategy</li>
                </ol>
                
                <div style="margin-top: 20px;">
                    <button class="btn-secondary full-width" onclick="Tutorial.stop()">Skip Tutorial (I know this already)</button>
                </div>
            `,
            quizzes: [
                {
                    question: "A mobile game company needs to forecast next quarter's signups. Why would this matter for marketing planning?",
                    options: [
                        "To decide how much server capacity to buy",
                        "To plan advertising budget and campaign timing",
                        "To determine employee salaries"
                    ],
                    answer: 1,
                    feedback: "Exactly! Forecasting helps marketers allocate budget to the right months and plan campaigns around expected high/low periods."
                }
            ],
            check: () => true
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 2: Select Marketing Scenario
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'select_scenario',
            title: "Step 1: Load the Data",
            targetId: 'scenario-section',
            content: `
                <p>First, let's load a realistic marketing dataset.</p>
                
                <p>The <strong>"Marketing Scenarios"</strong> dropdown provides pre-built datasets with known patterns — perfect for learning!</p>
                
                <p class="task">👉 <strong>Task:</strong> Click the dropdown and select <strong>"🎮 Mobile Game Monthly Signups (6 years)"</strong></p>
                
                <p class="hint">Read the scenario description that appears — it explains the seasonal pattern we'll be hunting for.</p>
            `,
            quizzes: [
                {
                    question: "Look at the scenario description. This dataset has how many months of data?",
                    options: [
                        "36 months (3 years)",
                        "72 months (6 years)",
                        "300 days"
                    ],
                    answer: 1,
                    feedback: "Correct! 6 years of monthly data (72 observations) — enough to see seasonal patterns repeat multiple times."
                }
            ],
            check: () => {
                return window.currentScenarioName === 'scenario-mobile-game';
            },
            onEnter: () => {
                document.getElementById('scenario-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 3: Understand Variables
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'understand_variables',
            title: "Step 2: Know Your Variables",
            targetId: 'arimax-raw-panel',
            content: `
                <p>The data is loaded! Now let's understand what we're working with.</p>
                
                <p><strong>Outcome Variable (Y):</strong> What we're predicting</p>
                <ul><li><code>monthly_signups</code> — new users each month</li></ul>
                
                <p><strong>Exogenous Predictors (X):</strong> Things we can control</p>
                <ul>
                    <li><code>mobile_ad_spend</code> — monthly advertising budget</li>
                    <li><code>new_feature</code> — whether a major feature launched (0/1)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Verify the column selections are correct. Outcome should be <strong>monthly_signups</strong> and both predictors should be checked.</p>
            `,
            quizzes: [
                {
                    question: "Which variable are we trying to PREDICT (forecast into the future)?",
                    options: [
                        "mobile_ad_spend",
                        "monthly_signups",
                        "month"
                    ],
                    answer: 1,
                    feedback: "Correct! monthly_signups is our outcome — the thing we want to forecast."
                },
                {
                    question: "The exogenous predictors (ad_spend, new_feature) are variables we can...",
                    options: [
                        "Only observe, never influence",
                        "Control and use to plan 'what-if' scenarios",
                        "Safely ignore in our analysis"
                    ],
                    answer: 1,
                    feedback: "Exactly! Exogenous variables are inputs we control. We can ask: 'What if we increase ad spend next quarter?'"
                }
            ],
            check: () => {
                const outcomeSelect = document.getElementById('arimax-outcome-select');
                const outcome = outcomeSelect?.value;
                return outcome === 'monthly_signups';
            },
            onEnter: () => {
                // Scroll to column selection area
                const panel = document.getElementById('arimax-raw-panel');
                if (panel) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 4: ARIMA Parameters Basics
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'arima_basics',
            title: "Step 3: ARIMA Parameters (p, d, q)",
            targetId: 'inputs-heading',
            content: `
                <p>Now we configure the model's "memory" using three parameters:</p>
                
                <ul>
                    <li><strong>p (AR order):</strong> How many past VALUES influence today. Higher p = longer memory.</li>
                    <li><strong>d (Differencing):</strong> Removes trends. Use d=1 if data trends up/down.</li>
                    <li><strong>q (MA order):</strong> How many past ERRORS influence today. Smooths out noise.</li>
                </ul>
                
                <p>A classic starting point is <strong>(1, 1, 1)</strong> — one lag of memory, one level of differencing, one error term.</p>
                
                <p class="task">👉 <strong>Task:</strong> Set <strong>p=1</strong>, <strong>d=1</strong>, <strong>q=1</strong> in the Model Specification section.</p>
            `,
            quizzes: [
                {
                    question: "If your data shows a steady upward trend over time, which parameter helps remove it?",
                    options: [
                        "p (autoregressive order)",
                        "d (differencing)",
                        "q (moving average order)"
                    ],
                    answer: 1,
                    feedback: "Correct! Differencing (d) removes trends by working with changes rather than raw values."
                },
                {
                    question: "The 'p' parameter captures how past VALUES influence today. The 'q' parameter captures how past _____ influence today.",
                    options: [
                        "Values",
                        "Forecast errors (mistakes)",
                        "Exogenous variables"
                    ],
                    answer: 1,
                    feedback: "Exactly! MA terms (q) model how past prediction errors affect current values — it's a self-correcting mechanism."
                }
            ],
            check: () => {
                const p = parseInt(document.getElementById('arimax-p')?.value, 10);
                const d = parseInt(document.getElementById('arimax-d')?.value, 10);
                const q = parseInt(document.getElementById('arimax-q')?.value, 10);
                return p === 1 && d === 1 && q === 1;
            },
            onEnter: () => {
                document.getElementById('inputs-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 5: First Model Run (ARIMAX without seasonality)
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'first_run',
            title: "Step 4: First Model — ARIMAX (No Seasonality)",
            targetId: 'arimax-run-model',
            content: `
                <p><strong>Before we add seasonality, let's see what happens without it.</strong></p>
                
                <p>This teaches an important lesson: if you don't tell the model about seasonal patterns, it won't capture them!</p>
                
                <p class="task">👉 <strong>Task:</strong></p>
                <ol>
                    <li>Make sure <strong>"Include Seasonality"</strong> is <strong>UNCHECKED</strong></li>
                    <li>Click <strong>"Fit ARIMAX Model"</strong></li>
                    <li>Wait for results (usually 5-15 seconds)</li>
                </ol>
                
                <p class="hint">Watch the timer — the model is crunching numbers on the server!</p>
            `,
            quizzes: [
                {
                    question: "Why are we intentionally running WITHOUT seasonality first?",
                    options: [
                        "Seasonal models are always wrong",
                        "To see what we're missing — we'll add seasonality next and compare",
                        "Seasonality doesn't matter for mobile games"
                    ],
                    answer: 1,
                    feedback: "Exactly! By seeing the 'broken' forecast first, you'll truly appreciate what seasonality adds."
                }
            ],
            check: () => {
                // Check that model was fitted without seasonality
                const seasonalityChecked = document.getElementById('arimax-include-seasonality')?.checked;
                const specEl = document.getElementById('arimax-spec-value');
                const hasFitted = specEl && specEl.textContent && specEl.textContent !== '–';
                
                if (hasFitted && !seasonalityChecked) {
                    // Store this run for later comparison
                    Tutorial.arimaxRun = {
                        aic: document.getElementById('arimax-aic-value')?.textContent,
                        spec: specEl?.textContent
                    };
                    return true;
                }
                return false;
            },
            onEnter: () => {
                document.getElementById('arimax-run-model')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 6: Examine the Forecast — Something's Missing
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'examine_forecast',
            title: "Step 5: Examine the Forecast",
            targetId: 'chart-forecast',
            content: `
                <p><strong>Look at the forecast chart carefully.</strong></p>
                
                <p>The <span style="color: #1f77b4; font-weight: bold;">blue line</span> is historical data (actual signups).</p>
                <p>The <span style="color: #d62728; font-weight: bold;">red dashed line</span> is the forecast.</p>
                
                <p>Notice anything strange? The historical data clearly shows <em>peaks and valleys</em> (January spikes!), but the forecast looks... flat.</p>
                
                <p class="task">👉 <strong>Task:</strong> Compare the seasonal ups-and-downs in the blue line vs. the red forecast line.</p>
            `,
            quizzes: [
                {
                    question: "Look at the historical data (blue line). Is there a repeating pattern each year?",
                    options: [
                        "Yes, signups spike in January/February every year",
                        "No, the data is completely random",
                        "Yes, but only in the first year"
                    ],
                    answer: 0,
                    feedback: "Correct! You can see clear January/February peaks repeating year after year — that's seasonality!"
                },
                {
                    question: "Does the forecast (red line) capture those same seasonal ups and downs?",
                    options: [
                        "Yes, it perfectly matches the historical pattern",
                        "No, the forecast looks relatively flat or just follows a trend",
                        "There is no forecast shown"
                    ],
                    answer: 1,
                    feedback: "Exactly! The forecast misses the seasonal pattern. This is the problem we need to fix!"
                }
            ],
            check: () => true, // Auto-pass after quizzes
            onEnter: () => {
                document.getElementById('chart-forecast')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 7: Check Residual Diagnostics
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'check_residuals',
            title: "Step 6: The Residuals Tell the Story",
            targetId: 'chart-acf',
            content: `
                <p><strong>The ACF chart reveals patterns the model MISSED.</strong></p>
                
                <p>ACF (Autocorrelation Function) shows how correlated the residuals are at different lags.</p>
                
                <ul>
                    <li><strong>Bars inside red dashed lines:</strong> No significant pattern (good!)</li>
                    <li><strong>Bars outside red lines:</strong> Leftover pattern the model didn't capture (bad!)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Look at the ACF chart. Are there significant spikes at lags 12, 24, 36...?</p>
                
                <p class="hint">Spikes at multiples of 12 in monthly data = yearly seasonal pattern!</p>
            `,
            quizzes: [
                {
                    question: "Look at the ACF chart. Are there significant spikes (bars outside the red dashed lines) at regular intervals?",
                    options: [
                        "No, all bars are safely inside the red lines",
                        "Yes, there are spikes around lags 12, 24, etc.",
                        "The ACF chart is blank"
                    ],
                    answer: 1,
                    feedback: "Correct! Those spikes at seasonal lags are screaming: 'You forgot to model seasonality!'"
                },
                {
                    question: "Spikes at lags 12, 24, 36 in MONTHLY data suggest a pattern that repeats every...",
                    options: [
                        "Week",
                        "Month",
                        "Year"
                    ],
                    answer: 2,
                    feedback: "Exactly! 12 months = 1 year. The pattern is annual seasonality."
                }
            ],
            check: () => true,
            onEnter: () => {
                document.getElementById('chart-acf')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 8: Enable Seasonality
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'enable_seasonality',
            title: "Step 7: Enable Seasonality (SARIMAX)",
            targetId: 'arimax-include-seasonality',
            content: `
                <p><strong>Time to fix the forecast!</strong></p>
                
                <p>SARIMAX adds seasonal components to capture repeating patterns. We need to specify:</p>
                
                <ul>
                    <li><strong>s (seasonal period):</strong> How many time periods in one cycle. For monthly data with yearly patterns: <strong>s = 12</strong></li>
                    <li><strong>P, D, Q:</strong> Seasonal versions of p, d, q. Start with <strong>(1, 0, 1)</strong></li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong></p>
                <ol>
                    <li>Check the <strong>"Include Seasonality (SARIMAX)"</strong> checkbox</li>
                    <li>Set seasonal period <strong>s = 12</strong></li>
                    <li>Keep P=1, D=0, Q=1 (the defaults)</li>
                </ol>
            `,
            quizzes: [
                {
                    question: "We have MONTHLY data with a YEARLY repeating pattern. How many months are in one seasonal cycle?",
                    options: [
                        "4 (quarterly)",
                        "12 (annual)",
                        "52 (weekly data)"
                    ],
                    answer: 1,
                    feedback: "Correct! 12 months per year, so s=12 captures the annual cycle."
                },
                {
                    question: "What does the 's' parameter represent?",
                    options: [
                        "The sample size",
                        "The number of time periods in one complete seasonal cycle",
                        "The statistical significance level"
                    ],
                    answer: 1,
                    feedback: "Exactly! s is the seasonal period — how many observations until the pattern repeats."
                }
            ],
            check: () => {
                const seasonalityChecked = document.getElementById('arimax-include-seasonality')?.checked;
                const s = parseInt(document.getElementById('arimax-s')?.value, 10);
                return seasonalityChecked && s === 12;
            },
            onEnter: () => {
                const toggle = document.getElementById('arimax-include-seasonality');
                if (toggle) {
                    toggle.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 9: Second Model Run (SARIMAX)
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'second_run',
            title: "Step 8: Fit the SARIMAX Model",
            targetId: 'arimax-run-model',
            content: `
                <p><strong>Now let's run the seasonal model!</strong></p>
                
                <p class="task">👉 <strong>Task:</strong> Click <strong>"Fit ARIMAX Model"</strong> again.</p>
                
                <p>This time, watch for:</p>
                <ul>
                    <li>The model spec will show <strong>(p,d,q)(P,D,Q)[s]</strong> format</li>
                    <li>Computation takes a bit longer (seasonal models are more complex)</li>
                    <li>New seasonal coefficients (ar.S.L12, ma.S.L12) in results</li>
                </ul>
                
                <p class="hint">The [12] at the end confirms yearly seasonality is being modeled!</p>
            `,
            quizzes: [
                {
                    question: "Look at the Model Specification in results (e.g., 'SARIMAX(1,1,1)(1,0,1)[12]'). What does the [12] mean?",
                    options: [
                        "The model has 12 coefficients",
                        "The seasonal pattern repeats every 12 periods (months)",
                        "We're forecasting 12 periods ahead"
                    ],
                    answer: 1,
                    feedback: "Correct! [12] indicates the seasonal period — the model now knows about yearly cycles."
                }
            ],
            check: () => {
                const seasonalityChecked = document.getElementById('arimax-include-seasonality')?.checked;
                const specEl = document.getElementById('arimax-spec-value');
                const spec = specEl?.textContent || '';
                const hasSeasonal = spec.includes('[') && spec.includes(']');
                
                if (hasSeasonal && seasonalityChecked) {
                    Tutorial.sarimaxRun = {
                        aic: document.getElementById('arimax-aic-value')?.textContent,
                        spec: spec
                    };
                    return true;
                }
                return false;
            },
            onEnter: () => {
                document.getElementById('arimax-run-model')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 10: Compare Forecasts
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'compare_forecasts',
            title: "Step 9: The Improved Forecast",
            targetId: 'chart-forecast',
            content: `
                <p><strong>Now look at the new forecast!</strong></p>
                
                <p>The red forecast line should now show <em>seasonal variation</em> — ups and downs that match the historical pattern.</p>
                
                <p><strong>What changed:</strong></p>
                <ul>
                    <li>January/February forecasts are HIGHER (capturing the post-holiday surge)</li>
                    <li>Summer forecasts are LOWER (capturing the seasonal trough)</li>
                    <li>The confidence bands may be narrower (better model fit)</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Compare this forecast to what you remember from the ARIMAX run.</p>
            `,
            quizzes: [
                {
                    question: "Compare this SARIMAX forecast to the earlier ARIMAX forecast. Does the new forecast show seasonal variation?",
                    options: [
                        "Yes, the forecast now shows ups and downs matching historical patterns",
                        "No, it still looks flat",
                        "The forecasts look identical"
                    ],
                    answer: 0,
                    feedback: "Excellent! SARIMAX learned the seasonal pattern and projects it forward. This is a realistic forecast!"
                },
                {
                    question: "Why is it valuable for the marketing team to see seasonal peaks in the forecast?",
                    options: [
                        "It looks prettier on dashboards",
                        "They can plan campaigns and inventory for high-signup periods",
                        "Seasonal forecasts are always more accurate by definition"
                    ],
                    answer: 1,
                    feedback: "Exactly! Knowing WHEN peaks occur lets marketers time campaigns, allocate budget, and prepare for demand."
                }
            ],
            check: () => true,
            onEnter: () => {
                document.getElementById('chart-forecast')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 11: Understand Coefficients
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'understand_coefficients',
            title: "Step 10: Reading the Coefficients",
            targetId: 'arimax-coef-table-body',
            content: `
                <p><strong>The coefficient table shows what the model learned.</strong></p>
                
                <p>Look for these key coefficients:</p>
                <ul>
                    <li><strong>ar.L1, ma.L1:</strong> Time series dynamics (memory)</li>
                    <li><strong>ar.S.L12, ma.S.L12:</strong> SEASONAL coefficients (yearly patterns)</li>
                    <li><strong>mobile_ad_spend:</strong> Effect of advertising on signups</li>
                    <li><strong>new_feature:</strong> Boost from feature releases</li>
                </ul>
                
                <p class="task">👉 <strong>Task:</strong> Scroll to the coefficient table and find the <code>mobile_ad_spend</code> coefficient.</p>
            `,
            quizzes: [
                {
                    question: "Find the 'mobile_ad_spend' coefficient. Is it positive or negative?",
                    options: [
                        "Positive (more spending → more signups)",
                        "Negative (more spending → fewer signups)",
                        "Not shown in the table"
                    ],
                    answer: 0,
                    feedback: "Correct! A positive coefficient means ad spend has a positive effect on signups — as expected!"
                },
                {
                    question: "If the 'ar.S.L12' coefficient is significant (p < 0.05), what does this confirm?",
                    options: [
                        "There's no seasonal pattern",
                        "This month's value is related to the same month LAST YEAR",
                        "We should remove seasonality from the model"
                    ],
                    answer: 1,
                    feedback: "Exactly! Significant seasonal AR means January 2025 is statistically related to January 2024, confirming the yearly pattern."
                }
            ],
            check: () => true,
            onEnter: () => {
                document.getElementById('arimax-coef-table-body')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 12: Model Warnings
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'check_warnings',
            title: "Step 11: Check for Warnings",
            targetId: 'arimax-run-status',
            content: `
                <p><strong>Good analysts always check for model warnings.</strong></p>
                
                <p>The tool may flag issues like:</p>
                <ul>
                    <li>Non-significant coefficients (simplify the model?)</li>
                    <li>Residual autocorrelation (model still missing something?)</li>
                    <li>Unusual coefficient values (data quality issue?)</li>
                </ul>
                
                <p>Warnings are <em>diagnostic</em>, not failures. They guide refinement.</p>
                
                <p class="task">👉 <strong>Task:</strong> Check if any warnings appeared. If not, that's a good sign!</p>
            `,
            quizzes: [
                {
                    question: "If a model warning says 'Seasonal MA coefficient is not significant,' what might you try?",
                    options: [
                        "Add more seasonal parameters",
                        "Set Seasonal MA (Q) to 0 and refit for a simpler model",
                        "Ignore it — warnings don't matter"
                    ],
                    answer: 1,
                    feedback: "Correct! Non-significant terms add complexity without benefit. Simplifying often improves forecasts."
                }
            ],
            check: () => true,
            onEnter: () => {
                // Scroll to results area where warnings appear
                document.getElementById('test-results-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 13a: Managerial Interpretation — Deep Dive
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'managerial_interpretation',
            title: "Step 12a: Translating Stats to Strategy",
            targetId: 'arimax-managerial-report',
            content: `
                <p><strong>Statistics are only valuable if they change decisions.</strong></p>
                
                <p>The Managerial Interpretation translates coefficients into business language. This is what you'd present to a VP who doesn't speak "p-values."</p>
                
                <p class="task">👉 <strong>Task:</strong> Read the Managerial Interpretation carefully. We'll test your comprehension.</p>
                
                <p class="hint">Pay attention to: (1) what happens when ad spend increases, (2) when signups are highest/lowest, (3) how the seasonal pattern should influence planning.</p>
            `,
            quizzes: [
                {
                    type: 'dynamic',
                    questionFn: () => {
                        // Try to extract ad spend coefficient from the report or table
                        const report = document.getElementById('arimax-managerial-report')?.textContent || '';
                        return "Read the Managerial Interpretation. According to the model, what generally happens to signups when ad spend increases?";
                    },
                    options: [
                        "Signups decrease",
                        "Signups increase",
                        "No relationship exists between ad spend and signups"
                    ],
                    answer: 1,
                    feedback: "Correct! The positive coefficient on mobile_ad_spend means higher advertising investment is associated with more signups."
                },
                {
                    question: "Based on the seasonal pattern described, during which period does the model predict the LOWEST signup activity?",
                    options: [
                        "January-February (post-holiday)",
                        "May-July (summer months)",
                        "October-December (pre-holiday)"
                    ],
                    answer: 1,
                    feedback: "Correct! Summer is typically the trough in mobile game engagement — people are outdoors and traveling."
                },
                {
                    question: "Imagine you're presenting to the CMO. She asks: 'Should we increase ad spend during the summer slump or double down during January peaks?' What does the seasonal pattern suggest?",
                    options: [
                        "Increase spend during summer to boost weak periods",
                        "Spend more in January when signups are already high",
                        "Ad spend timing doesn't matter according to this model"
                    ],
                    answer: 0,
                    feedback: "Great thinking! Boosting during troughs can smooth out revenue. Spending when demand is already high may have diminishing returns (though both strategies are debatable — this is where marketing judgment comes in!)."
                }
            ],
            check: () => true,
            onEnter: () => {
                document.getElementById('arimax-managerial-report')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 13b: Scenario Planning — Hands-On
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'scenario_planning',
            title: "Step 12b: What-If Scenario Planning",
            targetId: 'forecast-exog-controls',
            content: `
                <p><strong>Now let's use the model to answer a real business question!</strong></p>
                
                <p>The "Forecast Scenario" controls let you set <em>future</em> values for predictors. This answers: "What if we change our marketing plan?"</p>
                
                <p><strong>Your Mission:</strong> It's October and leadership is planning Q1 budget. They want to know: "If we increase ad spend to $70,000/month (above recent average), what happens to signups?"</p>
                
                <p class="task">👉 <strong>Task:</strong></p>
                <ol>
                    <li>Find the forecast scenario controls below the chart</li>
                    <li>Set <strong>mobile_ad_spend</strong> to <strong>70000</strong></li>
                    <li>Click <strong>"Apply & Update Forecast"</strong></li>
                    <li>Watch how the forecast changes!</li>
                </ol>
            `,
            quizzes: [
                {
                    question: "You increased the forecast ad spend to $70,000. Look at the updated forecast. Did the predicted signups increase?",
                    options: [
                        "Yes, higher ad spend → higher predicted signups",
                        "No, the forecast stayed exactly the same",
                        "The forecast decreased"
                    ],
                    answer: 0,
                    feedback: "Correct! The model uses the ad_spend coefficient to project higher signups when you increase the input."
                },
                {
                    question: "This 'what-if' capability is valuable because it lets marketers...",
                    options: [
                        "Guarantee future results with certainty",
                        "Test scenarios BEFORE committing budget",
                        "Avoid using any historical data"
                    ],
                    answer: 1,
                    feedback: "Exactly! Scenario planning lets you explore options before spending real money. The model provides informed estimates, not guarantees."
                }
            ],
            check: () => {
                // Check if user has modified the forecast scenario
                const controls = document.getElementById('forecast-exog-inputs');
                if (!controls) return true; // If controls not visible, auto-pass
                
                const inputs = controls.querySelectorAll('input[type="number"]');
                for (const input of inputs) {
                    if (input.value && parseFloat(input.value) >= 65000) {
                        return true; // User increased ad spend
                    }
                }
                return false;
            },
            onEnter: () => {
                const controls = document.getElementById('forecast-exog-controls');
                if (controls) {
                    controls.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 14: APA Report
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'apa_report',
            title: "Step 13: The APA-Style Report",
            targetId: 'arimax-apa-report',
            content: `
                <p><strong>For academic work, you need proper citations.</strong></p>
                
                <p>The APA-Style Report provides:</p>
                <ul>
                    <li>Formal statistical notation (SARIMAX specification)</li>
                    <li>Key statistics (AIC, RMSE, coefficient tests)</li>
                    <li>Language suitable for research papers or theses</li>
                </ul>
                
                <p>You now have TWO outputs: one for executives (Managerial), one for academics (APA).</p>
                
                <p class="task">👉 <strong>Task:</strong> Skim the APA report to see the formal notation.</p>
            `,
            quizzes: [
                {
                    question: "Who would most likely use the APA-Style Report?",
                    options: [
                        "A marketing VP making budget decisions",
                        "A graduate student writing a thesis or research paper",
                        "A data engineer building a pipeline"
                    ],
                    answer: 1,
                    feedback: "Correct! The APA format is standard for academic writing — research papers, dissertations, and scholarly work."
                }
            ],
            check: () => true,
            onEnter: () => {
                document.getElementById('arimax-apa-report')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // STEP 15: Conclusion
        // ═══════════════════════════════════════════════════════════════
        {
            id: 'conclusion',
            title: "🎉 Congratulations — SARIMAX Master!",
            targetId: null,
            content: `
                <p><strong>You've completed the Time Series Forecasting tutorial!</strong></p>
                
                <h4>📚 What You Learned:</h4>
                <ol>
                    <li><strong>ARIMAX</strong> models time series with external predictors</li>
                    <li><strong>Residual diagnostics</strong> (ACF) reveal missing patterns</li>
                    <li><strong>SARIMAX</strong> adds seasonal components for realistic forecasts</li>
                    <li><strong>Scenario planning</strong> lets you test "what-if" questions</li>
                    <li><strong>Two audiences</strong>: Managerial (business) and APA (academic)</li>
                </ol>
                
                <h4>🚀 Next Challenges:</h4>
                <ul>
                    <li>Try the <strong>Instagram Supplement Shop</strong> scenario (non-seasonal)</li>
                    <li>Compare AIC between ARIMAX and SARIMAX — which fits better?</li>
                    <li>Experiment with different (p,d,q) values</li>
                    <li>Upload your own data!</li>
                </ul>
                
                <p style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid var(--app-success);">
                    <strong>🎓 Pro Tip:</strong> Always run a non-seasonal model first, check the ACF, and let the data tell you if seasonality is needed. Don't just assume!
                </p>
            `,
            check: () => true,
            onEnter: () => {
                Tutorial.hideOverlay();
            }
        }
    ],

    // ═══════════════════════════════════════════════════════════════════
    // TUTORIAL ENGINE METHODS
    // ═══════════════════════════════════════════════════════════════════

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
        this.currentStep = 0;
        this.arimaxRun = null;
        this.sarimaxRun = null;
        
        document.body.classList.add('tutorial-active');
        document.getElementById('tutorial-sidebar')?.classList.add('active');
        
        this.updateView();
    },

    stop() {
        this.isActive = false;
        document.body.classList.remove('tutorial-active');
        document.getElementById('tutorial-sidebar')?.classList.remove('active');
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

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateView();
        }
    },

    updateView() {
        const step = this.steps[this.currentStep];
        
        // Update Sidebar
        const sidebarContent = document.getElementById('tutorial-content');
        if (!sidebarContent) return;
        
        let quizHtml = '';
        if (step.quizzes && step.quizzes.length > 0) {
            // Initialize quiz state if needed
            if (!step.quizState) {
                step.quizState = step.quizzes.map(() => ({ completed: false }));
            }

            quizHtml = step.quizzes.map((quiz, qIndex) => {
                const isCompleted = step.quizState[qIndex].completed;
                
                // Handle dynamic questions
                const questionText = quiz.type === 'dynamic' && quiz.questionFn 
                    ? quiz.questionFn() 
                    : quiz.question;
                
                if (!isCompleted) {
                    return `
                        <div class="tutorial-quiz" id="quiz-${qIndex}" style="background: #fff7ed; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid var(--app-warning);">
                            <h4 style="margin-top: 0; color: #9a3412; font-size: 0.9rem;">🤔 Quick Check ${qIndex + 1}</h4>
                            <p style="margin-bottom: 10px; font-weight: 500; font-size: 0.9rem;">${questionText}</p>
                            <div class="quiz-options">
                                ${quiz.options.map((opt, i) => `
                                    <label style="display: block; margin-bottom: 8px; cursor: pointer; font-size: 0.85rem;">
                                        <input type="radio" name="quiz_q_${qIndex}" value="${i}" onchange="Tutorial.checkQuiz(${qIndex}, this.value)">
                                        ${opt}
                                    </label>
                                `).join('')}
                            </div>
                            <div id="quiz-feedback-${qIndex}" style="margin-top: 10px; font-weight: bold; display: none; font-size: 0.85rem;"></div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="tutorial-quiz" style="background: #f0fdf4; padding: 12px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid var(--app-success);">
                            <h4 style="margin-top: 0; color: var(--app-success); font-size: 0.85rem;">✅ Quick Check ${qIndex + 1}</h4>
                            <p style="margin-bottom: 0; font-size: 0.85rem;">${quiz.feedback}</p>
                        </div>
                    `;
                }
            }).join('');
        }

        const isTaskComplete = step.check ? step.check() : true;
        const areQuizzesComplete = !step.quizzes || !step.quizState || step.quizState.every(q => q.completed);
        const canProceed = isTaskComplete && areQuizzesComplete;

        sidebarContent.innerHTML = `
            <div class="tutorial-step-badge">Step ${this.currentStep + 1}/${this.steps.length}</div>
            <h3 style="margin-top: 10px; margin-bottom: 15px;">${step.title}</h3>
            <div class="tutorial-body" style="font-size: 0.9rem; line-height: 1.5;">${step.content}</div>
            
            ${quizHtml}

            <div class="tutorial-progress-container" style="background: var(--app-bg); padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px solid var(--app-border);">
                ${step.check && step.id !== 'intro' && step.id !== 'conclusion' ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: ${step.quizzes ? '8px' : '0'}; font-size: 0.85rem;">
                        ${this.getCheckmark(isTaskComplete)} 
                        <span style="${isTaskComplete ? 'color: var(--app-success); font-weight: 600;' : 'color: var(--app-muted);'}">
                            ${isTaskComplete ? "Task Complete" : "Complete the task above..."}
                        </span>
                    </div>
                ` : ''}
                
                ${step.quizzes && step.quizzes.length > 0 ? `
                    <div class="tutorial-progress-item" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem;">
                        ${this.getCheckmark(areQuizzesComplete)} 
                        <span style="${areQuizzesComplete ? 'color: var(--app-success); font-weight: 600;' : 'color: var(--app-muted);'}">
                            ${areQuizzesComplete ? "All questions answered" : "Answer all questions..."}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            <div class="tutorial-nav-buttons" style="display: flex; gap: 10px;">
                ${this.currentStep > 0 ? `
                    <button class="btn-secondary" onclick="Tutorial.prevStep()" style="flex: 0 0 auto; padding: 8px 16px;">← Back</button>
                ` : ''}
                
                ${canProceed ? 
                    (this.currentStep === this.steps.length - 1 ? 
                        `<button class="btn-primary" onclick="Tutorial.stop()" style="flex: 1;">🎓 Finish Tutorial</button>` :
                        `<button class="btn-primary" onclick="Tutorial.nextStep()" style="flex: 1;">Continue →</button>`
                    ) : 
                    `<button class="btn-secondary" disabled style="flex: 1; opacity: 0.5;">Complete requirements above</button>`
                }
            </div>
        `;

        // Update Overlay/Spotlight
        if (step.targetId) {
            this.highlightElement(step.targetId);
        } else {
            this.hideOverlay();
        }

        // Run onEnter
        if (step.onEnter) {
            setTimeout(() => step.onEnter(), 100);
        }
    },

    checkQuiz(qIndex, value) {
        const step = this.steps[this.currentStep];
        const quiz = step.quizzes[qIndex];
        const feedbackEl = document.getElementById(`quiz-feedback-${qIndex}`);
        
        const selectedAnswer = parseInt(value, 10);
        const isCorrect = selectedAnswer === quiz.answer;
        
        if (feedbackEl) {
            feedbackEl.style.display = 'block';
            if (isCorrect) {
                feedbackEl.innerHTML = `<span style="color: var(--app-success);">✅ ${quiz.feedback}</span>`;
                step.quizState[qIndex].completed = true;
                
                // Small delay then refresh view
                setTimeout(() => this.updateView(), 800);
            } else {
                feedbackEl.innerHTML = `<span style="color: var(--app-danger);">❌ Not quite. Try again!</span>`;
            }
        }
    },

    getCheckmark(isComplete) {
        if (isComplete) {
            return `<span style="color: var(--app-success); font-size: 1.2em;">✓</span>`;
        } else {
            return `<span style="color: var(--app-muted); font-size: 1.2em;">○</span>`;
        }
    },

    // ═══════════════════════════════════════════════════════════════════
    // RENDERING
    // ═══════════════════════════════════════════════════════════════════

    renderSidebar() {
        // Check if sidebar already exists
        if (document.getElementById('tutorial-sidebar')) return;
        
        const sidebar = document.createElement('aside');
        sidebar.id = 'tutorial-sidebar';
        sidebar.className = 'tutorial-sidebar';
        sidebar.innerHTML = `
            <div class="tutorial-sidebar-header">
                <h2>🎓 Professor Mode</h2>
                <button class="tutorial-close" onclick="Tutorial.stop()" title="Exit Tutorial">&times;</button>
            </div>
            <div id="tutorial-content" class="tutorial-sidebar-content">
                <!-- Content populated by updateView() -->
            </div>
        `;
        document.body.appendChild(sidebar);
    },

    renderOverlay() {
        // Check if overlay already exists
        if (document.getElementById('tutorial-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);
    },

    highlightElement(targetId) {
        const target = document.getElementById(targetId);
        const overlay = document.getElementById('tutorial-overlay');
        
        if (!target || !overlay) {
            this.hideOverlay();
            return;
        }
        
        // Add highlight class to target
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        target.classList.add('tutorial-highlight');
        
        // Show overlay
        overlay.classList.add('active');
    },

    hideOverlay() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    },

    // ═══════════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════════

    attachListeners() {
        // Listen for guided mode checkbox
        const checkbox = document.getElementById('guidedMode');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.start();
                } else {
                    this.stop();
                }
            });
        }
        
        // Re-check task completion when model runs or data changes
        document.addEventListener('arimax-model-fitted', () => {
            if (this.isActive) {
                setTimeout(() => this.updateView(), 500);
            }
        });
        
        document.addEventListener('arimax-scenario-loaded', () => {
            if (this.isActive) {
                setTimeout(() => this.updateView(), 300);
            }
        });
        
        // Also listen for changes to key inputs
        const watchedInputs = [
            'arimax-p', 'arimax-d', 'arimax-q',
            'arimax-P', 'arimax-D', 'arimax-Q', 'arimax-s',
            'arimax-include-seasonality',
            'arimax-outcome-select',
            'scenario-select'
        ];
        
        watchedInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    if (this.isActive) {
                        setTimeout(() => this.updateView(), 100);
                    }
                });
            }
        });
    },

    // Utility to refresh view (can be called from outside)
    refresh() {
        if (this.isActive) {
            this.updateView();
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure other scripts have initialized
    setTimeout(() => Tutorial.init(), 500);
});

// Export for use in other modules
window.Tutorial = Tutorial;
