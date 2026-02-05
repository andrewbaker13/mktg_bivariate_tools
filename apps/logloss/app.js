/**
 * Log-Loss Classification Lab
 * Interactive tool for learning about Log-Loss through manual logistic regression fitting
 * 
 * Dr. Baker's Marketing Analytics Tools
 * Created: 2026-02-04
 */

(function () {
    "use strict";

    // ===== Configuration =====
    const CSV_PATH = "data/data.csv";
    const TOOL_SLUG = "logloss-classification-lab";

    // Plotly color scheme matching the design system
    const COLORS = {
        class0: "#ef4444",           // Red for class 0 (negative)
        class1: "#22c55e",           // Green for class 1 (positive)
        sigmoidCurve: "#2563eb",     // Blue for sigmoid curve
        decisionBoundary: "#6366f1", // Indigo for decision boundary
        gridLines: "#e2e8f0"
    };

    // ===== Global State =====
    let data = null;
    let jitteredY = null; // Pre-computed jitter for stable display
    let currentLogLoss = null;
    let currentAccuracy = null;
    let currentScenario = null;
    let xLabel = "Engagement Score";
    let yLabel = "Probability";
    
    // Tracking state (for debouncing auto-run)
    let renderCount = 0;
    let lastTrackTime = 0;
    
    // Dynamic outcome labels (e.g., ["Did Not Convert", "Converted"])
    let outcomeLabels = ["Class 0", "Class 1"];
    
    // Categorical state
    let hasCategoricalData = false;
    let includeCategorical = false;
    let categoryLabels = [];
    let categoryColors = [];
    let categorySymbols = [];

    // Optimal values (computed via optimizer)
    let optimalLogLoss = null;
    let optimalAccuracy = null;
    let optimalParams = null;

    // ===== DOM Elements =====
    const elements = {
        // Scenario
        scenarioSelect: document.getElementById("scenario-select"),
        scenarioDescription: document.getElementById("scenario-description"),
        scenarioDownload: document.getElementById("scenario-download"),
        
        // Simple model
        B0_simple: document.getElementById("B0_simple"),
        B0_simple_num: document.getElementById("B0_simple_num"),
        B0_simple_display: document.getElementById("B0_simple_display"),
        B1_simple: document.getElementById("B1_simple"),
        B1_simple_num: document.getElementById("B1_simple_num"),
        B1_simple_display: document.getElementById("B1_simple_display"),
        equation_simple: document.getElementById("equation_simple"),
        logloss_simple: document.getElementById("logloss_simple"),
        accuracy_simple: document.getElementById("accuracy_simple"),
        simplePlot: document.getElementById("simplePlot"),
        simpleInterpretation: document.getElementById("simple-interpretation-dynamic"),
        
        // Categorical controls
        categoricalToggleSimple: document.getElementById("categorical-toggle-simple"),
        includeCategoricalSimpleCheckbox: document.getElementById("includeCategoricalSimple"),
        categoryLegendSimple: document.getElementById("category-legend-simple"),
        categoricalControlsSimple: document.getElementById("categorical-controls-simple"),
        B2_cat_simple: document.getElementById("B2_cat_simple"),
        B2_cat_simple_num: document.getElementById("B2_cat_simple_num"),
        B2_cat_simple_display: document.getElementById("B2_cat_simple_display"),
        B2_cat_simple_label: document.getElementById("B2_cat_simple_label"),
        B3_cat_simple: document.getElementById("B3_cat_simple"),
        B3_cat_simple_num: document.getElementById("B3_cat_simple_num"),
        B3_cat_simple_display: document.getElementById("B3_cat_simple_display"),
        B3_cat_simple_label: document.getElementById("B3_cat_simple_label"),
        
        // Confusion matrix
        cmTnSimple: document.getElementById("cm-tn-simple"),
        cmFpSimple: document.getElementById("cm-fp-simple"),
        cmFnSimple: document.getElementById("cm-fn-simple"),
        cmTpSimple: document.getElementById("cm-tp-simple"),
        
        // Comparison
        compare_logloss_user: document.getElementById("compare_logloss_user"),
        compare_logloss_optimal: document.getElementById("compare_logloss_optimal"),
        gap_logloss: document.getElementById("gap_logloss"),
        compare_accuracy_user: document.getElementById("compare_accuracy_user"),
        compare_accuracy_optimal: document.getElementById("compare_accuracy_optimal"),
        comparison_verdict: document.getElementById("comparison-verdict")
    };

    // ===== Core Math Functions =====

    /**
     * Sigmoid (logistic) function
     */
    function sigmoid(z) {
        // Clamp to avoid overflow
        const zClamped = Math.max(-500, Math.min(500, z));
        return 1 / (1 + Math.exp(-zClamped));
    }

    /**
     * Predict probability for a single observation
     */
    function predictProbability(x, B0, B1, catShift = 0) {
        const z = B0 + B1 * x + catShift;
        return sigmoid(z);
    }

    /**
     * Calculate log-loss (binary cross-entropy)
     */
    function calculateLogLoss(xArr, yArr, B0, B1, catShifts = null) {
        const N = xArr.length;
        if (N === 0) return NaN;
        
        let totalLoss = 0;
        const epsilon = 1e-15; // Avoid log(0)
        
        for (let i = 0; i < N; i++) {
            const shift = catShifts ? catShifts[i] : 0;
            const p = predictProbability(xArr[i], B0, B1, shift);
            
            // Clip probability to avoid log(0)
            const pClipped = Math.max(epsilon, Math.min(1 - epsilon, p));
            
            const y = yArr[i];
            const loss = -(y * Math.log(pClipped) + (1 - y) * Math.log(1 - pClipped));
            totalLoss += loss;
        }
        
        return totalLoss / N;
    }

    /**
     * Calculate accuracy
     */
    function calculateAccuracy(xArr, yArr, B0, B1, catShifts = null, threshold = 0.5) {
        const N = xArr.length;
        if (N === 0) return NaN;
        
        let correct = 0;
        for (let i = 0; i < N; i++) {
            const shift = catShifts ? catShifts[i] : 0;
            const p = predictProbability(xArr[i], B0, B1, shift);
            const predicted = p >= threshold ? 1 : 0;
            if (predicted === yArr[i]) correct++;
        }
        
        return correct / N;
    }

    /**
     * Calculate confusion matrix
     */
    function calculateConfusionMatrix(xArr, yArr, B0, B1, catShifts = null, threshold = 0.5) {
        let tn = 0, fp = 0, fn = 0, tp = 0;
        
        for (let i = 0; i < xArr.length; i++) {
            const shift = catShifts ? catShifts[i] : 0;
            const p = predictProbability(xArr[i], B0, B1, shift);
            const predicted = p >= threshold ? 1 : 0;
            const actual = yArr[i];
            
            if (actual === 0 && predicted === 0) tn++;
            else if (actual === 0 && predicted === 1) fp++;
            else if (actual === 1 && predicted === 0) fn++;
            else if (actual === 1 && predicted === 1) tp++;
        }
        
        return { tn, fp, fn, tp };
    }

    // ===== Optimization (Nelder-Mead Simplex) =====

    /**
     * Nelder-Mead simplex optimizer for finding optimal logistic regression parameters
     */
    function optimizeLogistic(xArr, yArr, catShifts = null, numParams = 2) {
        // Objective function: log-loss
        function objective(params) {
            const B0 = params[0];
            const B1 = params[1];
            
            let shifts = catShifts;
            if (numParams > 2 && params.length > 2) {
                // Build categorical shifts from params
                shifts = [];
                for (let i = 0; i < xArr.length; i++) {
                    const catIdx = data.categoryIndex ? data.categoryIndex[i] : 0;
                    if (catIdx === 0) {
                        shifts.push(0); // Reference category
                    } else if (catIdx === 1) {
                        shifts.push(params[2] || 0);
                    } else if (catIdx === 2) {
                        shifts.push(params[3] || 0);
                    }
                }
            }
            
            return calculateLogLoss(xArr, yArr, B0, B1, shifts);
        }
        
        // Initial simplex
        let initialParams;
        if (numParams === 2) {
            initialParams = [-2, 0.05]; // B0, B1
        } else {
            initialParams = [-2, 0.05, 1, 2]; // B0, B1, B2_cat, B3_cat
        }
        
        return nelderMead(objective, initialParams, {
            maxIterations: 500,
            tolerance: 1e-8
        });
    }

    /**
     * Nelder-Mead implementation
     */
    function nelderMead(f, x0, options = {}) {
        const maxIter = options.maxIterations || 500;
        const tol = options.tolerance || 1e-8;
        const alpha = 1.0;  // Reflection
        const gamma = 2.0;  // Expansion
        const rho = 0.5;    // Contraction
        const sigma = 0.5;  // Shrink
        
        const n = x0.length;
        
        // Initialize simplex
        let simplex = [x0.slice()];
        for (let i = 0; i < n; i++) {
            const point = x0.slice();
            point[i] += (Math.abs(point[i]) < 1e-10) ? 0.5 : point[i] * 0.5;
            simplex.push(point);
        }
        
        // Evaluate all points
        let values = simplex.map(p => f(p));
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Sort by function value
            const indices = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
            simplex = indices.map(i => simplex[i]);
            values = indices.map(i => values[i]);
            
            // Check convergence
            const range = values[n] - values[0];
            if (range < tol) break;
            
            // Centroid (excluding worst point)
            const centroid = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    centroid[j] += simplex[i][j] / n;
                }
            }
            
            // Reflection
            const xr = centroid.map((c, j) => c + alpha * (c - simplex[n][j]));
            const fr = f(xr);
            
            if (fr < values[0]) {
                // Expansion
                const xe = centroid.map((c, j) => c + gamma * (xr[j] - c));
                const fe = f(xe);
                if (fe < fr) {
                    simplex[n] = xe;
                    values[n] = fe;
                } else {
                    simplex[n] = xr;
                    values[n] = fr;
                }
            } else if (fr < values[n - 1]) {
                simplex[n] = xr;
                values[n] = fr;
            } else {
                // Contraction
                const xc = centroid.map((c, j) => c + rho * (simplex[n][j] - c));
                const fc = f(xc);
                if (fc < values[n]) {
                    simplex[n] = xc;
                    values[n] = fc;
                } else {
                    // Shrink
                    for (let i = 1; i <= n; i++) {
                        simplex[i] = simplex[0].map((s0, j) => s0 + sigma * (simplex[i][j] - s0));
                        values[i] = f(simplex[i]);
                    }
                }
            }
        }
        
        // Return best
        const bestIdx = values.indexOf(Math.min(...values));
        return {
            params: simplex[bestIdx],
            value: values[bestIdx]
        };
    }

    // ===== Utility Functions =====

    /**
     * Synchronize slider and number input values
     */
    function syncControls(sliderId, source) {
        const slider = document.getElementById(sliderId);
        const numberInput = document.getElementById(sliderId + "_num");
        const display = document.getElementById(sliderId + "_display");
        
        if (!slider || !numberInput || !display) return;
        
        let value;
        if (source === "slider") {
            value = parseFloat(slider.value);
            numberInput.value = value;
        } else {
            value = parseFloat(numberInput.value);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            value = Math.max(min, Math.min(max, value));
            slider.value = value;
        }
        
        // Format display
        if (sliderId.includes("B1")) {
            display.textContent = value.toFixed(2);
        } else if (sliderId.includes("_cat_")) {
            display.textContent = value.toFixed(1);
        } else {
            display.textContent = value.toFixed(1);
        }
        
        updatePlot();
    }

    /**
     * Get current parameters from UI
     */
    function getCurrentParams() {
        const B0 = parseFloat(elements.B0_simple.value);
        const B1 = parseFloat(elements.B1_simple.value);
        
        let catShifts = null;
        if (hasCategoricalData && includeCategorical && data.categoryIndex) {
            const B2_cat = parseFloat(elements.B2_cat_simple.value);
            const B3_cat = parseFloat(elements.B3_cat_simple.value);
            
            catShifts = data.categoryIndex.map(idx => {
                if (idx === 0) return 0;
                if (idx === 1) return B2_cat;
                if (idx === 2) return B3_cat;
                return 0;
            });
        }
        
        return { B0, B1, catShifts };
    }

    // ===== Plotting =====

    /**
     * Build scatter trace for data points
     */
    function buildScatterTrace() {
        if (!data) return [];
        
        if (hasCategoricalData && data.categoryIndex) {
            // Color by category (always show colored dots)
            const traces = [];
            const uniqueCategories = [...new Set(data.category)];
            
            uniqueCategories.forEach((cat, idx) => {
                const indices = data.category.map((c, i) => c === cat ? i : -1).filter(i => i >= 0);
                const xVals = indices.map(i => data.x[i]);
                const yVals = indices.map(i => jitteredY[i]); // Use pre-computed jitter
                
                traces.push({
                    x: xVals,
                    y: yVals,
                    mode: 'markers',
                    type: 'scatter',
                    name: cat,
                    marker: {
                        color: categoryColors[idx] || COLORS.class1,
                        size: 10,
                        symbol: categorySymbols[idx] || 'circle',
                        opacity: 0.8,
                        line: { color: '#fff', width: 1 }
                    },
                    hovertemplate: `${cat}<br>${xLabel}: %{x}<br>${yLabel}: %{customdata}<extra></extra>`,
                    customdata: indices.map(i => data.y[i])
                });
            });
            
            return traces;
        } else {
            // Color by class
            const class0Idx = data.y.map((y, i) => y === 0 ? i : -1).filter(i => i >= 0);
            const class1Idx = data.y.map((y, i) => y === 1 ? i : -1).filter(i => i >= 0);
            
            return [
                {
                    x: class0Idx.map(i => data.x[i]),
                    y: class0Idx.map(i => jitteredY[i]), // Use pre-computed jitter
                    mode: 'markers',
                    type: 'scatter',
                    name: outcomeLabels[0],
                    marker: {
                        color: COLORS.class0,
                        size: 10,
                        opacity: 0.7,
                        line: { color: '#fff', width: 1 }
                    },
                    hovertemplate: `${xLabel}: %{x}<br>Actual: ${outcomeLabels[0]}<extra></extra>`
                },
                {
                    x: class1Idx.map(i => data.x[i]),
                    y: class1Idx.map(i => jitteredY[i]), // Use pre-computed jitter
                    mode: 'markers',
                    type: 'scatter',
                    name: outcomeLabels[1],
                    marker: {
                        color: COLORS.class1,
                        size: 10,
                        opacity: 0.7,
                        line: { color: '#fff', width: 1 }
                    },
                    hovertemplate: `${xLabel}: %{x}<br>Actual: ${outcomeLabels[1]}<extra></extra>`
                }
            ];
        }
    }

    /**
     * Build sigmoid curve trace(s)
     */
    function buildSigmoidTraces() {
        if (!data) return [];
        
        const { B0, B1, catShifts } = getCurrentParams();
        const xMin = Math.min(...data.x);
        const xMax = Math.max(...data.x);
        const xRange = xMax - xMin;
        const xPlotMin = xMin - xRange * 0.1;
        const xPlotMax = xMax + xRange * 0.1;
        
        // Generate smooth curve points
        const numPoints = 200;
        const xCurve = [];
        for (let i = 0; i <= numPoints; i++) {
            xCurve.push(xPlotMin + (xPlotMax - xPlotMin) * (i / numPoints));
        }
        
        if (hasCategoricalData && includeCategorical) {
            // Multiple sigmoid curves, one per category
            const traces = [];
            const shifts = [0, parseFloat(elements.B2_cat_simple.value), parseFloat(elements.B3_cat_simple.value)];
            
            categoryLabels.forEach((label, idx) => {
                const yCurve = xCurve.map(x => predictProbability(x, B0, B1, shifts[idx]));
                traces.push({
                    x: xCurve,
                    y: yCurve,
                    mode: 'lines',
                    type: 'scatter',
                    name: `${label} Fit`,
                    line: {
                        color: categoryColors[idx],
                        width: 3
                    },
                    hovertemplate: `${label}<br>${xLabel}: %{x:.1f}<br>P(Y=1): %{y:.3f}<extra></extra>`
                });
            });
            
            return traces;
        } else {
            // Single sigmoid curve
            const yCurve = xCurve.map(x => predictProbability(x, B0, B1, 0));
            return [{
                x: xCurve,
                y: yCurve,
                mode: 'lines',
                type: 'scatter',
                name: 'Sigmoid Fit',
                line: {
                    color: COLORS.sigmoidCurve,
                    width: 3
                },
                hovertemplate: `${xLabel}: %{x:.1f}<br>P(Y=1): %{y:.3f}<extra></extra>`
            }];
        }
    }

    /**
     * Build decision boundary trace
     */
    function buildDecisionBoundaryTrace() {
        const { B0, B1 } = getCurrentParams();
        
        // Decision boundary: where z = 0, so B0 + B1*x = 0, x = -B0/B1
        if (Math.abs(B1) < 1e-10) return []; // Avoid division by zero
        
        const xBoundary = -B0 / B1;
        
        // Only show if within data range
        if (!data) return [];
        const xMin = Math.min(...data.x);
        const xMax = Math.max(...data.x);
        
        if (xBoundary < xMin - (xMax - xMin) * 0.2 || xBoundary > xMax + (xMax - xMin) * 0.2) {
            return []; // Boundary outside visible range
        }
        
        return [{
            x: [xBoundary, xBoundary],
            y: [-0.1, 1.1],
            mode: 'lines',
            type: 'scatter',
            name: 'Decision Boundary (p=0.5)',
            line: {
                color: COLORS.decisionBoundary,
                width: 2,
                dash: 'dash'
            },
            hovertemplate: `Decision Boundary<br>${xLabel} = ${xBoundary.toFixed(1)}<extra></extra>`
        }];
    }

    /**
     * Update the main plot
     */
    function updatePlot() {
        if (!data) return;
        
        const { B0, B1, catShifts } = getCurrentParams();
        
        // Calculate metrics
        currentLogLoss = calculateLogLoss(data.x, data.y, B0, B1, catShifts);
        currentAccuracy = calculateAccuracy(data.x, data.y, B0, B1, catShifts);
        const cm = calculateConfusionMatrix(data.x, data.y, B0, B1, catShifts);
        
        // Update displays
        updateMetricsDisplay(currentLogLoss, currentAccuracy);
        updateConfusionMatrix(cm);
        updateEquationDisplay(B0, B1);
        updateInterpretation(B0, B1, currentLogLoss, currentAccuracy);
        updateComparison();
        
        // Track execution (debounced for auto-run tool)
        renderCount++;
        const now = Date.now();
        if (renderCount > 1 && (now - lastTrackTime) > 500) {
            lastTrackTime = now;
            if (typeof markRunAttempted === 'function') {
                markRunAttempted();
            }
            if (typeof markRunSuccessful === 'function') {
                markRunSuccessful(
                    {
                        n: data.x.length,
                        scenario: currentScenario ? currentScenario.id : 'custom',
                        B0: B0,
                        B1: B1,
                        hasCategorical: hasCategoricalData && includeCategorical
                    },
                    `Log-Loss: ${currentLogLoss.toFixed(4)}, Accuracy: ${(currentAccuracy * 100).toFixed(1)}%`
                );
            }
        }
        
        // Build traces
        const scatterTraces = buildScatterTrace();
        const sigmoidTraces = buildSigmoidTraces();
        const boundaryTraces = buildDecisionBoundaryTrace();
        
        const allTraces = [...scatterTraces, ...sigmoidTraces, ...boundaryTraces];
        
        // Layout
        const layout = {
            title: null,
            xaxis: {
                title: xLabel,
                gridcolor: COLORS.gridLines,
                zeroline: false
            },
            yaxis: {
                title: `p(${outcomeLabels[1]})`,
                range: [-0.15, 1.15],
                gridcolor: COLORS.gridLines,
                zeroline: false
            },
            showlegend: true,
            legend: {
                x: 1.02,
                xanchor: 'left',
                y: 0.5,
                yanchor: 'middle'
            },
            margin: { t: 30, r: 120, b: 60, l: 60 },
            paper_bgcolor: 'white',
            plot_bgcolor: 'white',
            hovermode: 'closest'
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        };
        
        Plotly.react(elements.simplePlot, allTraces, layout, config);
    }

    /**
     * Update metrics display
     */
    function updateMetricsDisplay(logLoss, accuracy) {
        const loglossEl = elements.logloss_simple.querySelector('.logloss-value');
        const accuracyEl = elements.accuracy_simple.querySelector('.accuracy-value');
        
        if (loglossEl) {
            loglossEl.textContent = logLoss.toFixed(4);
            
            // Color coding
            loglossEl.classList.remove('excellent', 'good', 'poor');
            if (logLoss < 0.35) {
                loglossEl.classList.add('excellent');
            } else if (logLoss < 0.55) {
                loglossEl.classList.add('good');
            } else if (logLoss > 0.80) {
                loglossEl.classList.add('poor');
            }
        }
        
        if (accuracyEl) {
            accuracyEl.textContent = (accuracy * 100).toFixed(1) + '%';
        }
    }

    /**
     * Update confusion matrix display
     */
    function updateConfusionMatrix(cm) {
        if (elements.cmTnSimple) elements.cmTnSimple.textContent = `TN: ${cm.tn}`;
        if (elements.cmFpSimple) elements.cmFpSimple.textContent = `FP: ${cm.fp}`;
        if (elements.cmFnSimple) elements.cmFnSimple.textContent = `FN: ${cm.fn}`;
        if (elements.cmTpSimple) elements.cmTpSimple.textContent = `TP: ${cm.tp}`;
    }
    
    /**
     * Update confusion matrix row/column labels dynamically based on outcomeLabels
     */
    function updateConfusionMatrixLabels() {
        // Update the static labels in the confusion matrix grid
        const cmContainer = document.getElementById('confusion-matrix-simple');
        if (!cmContainer) return;
        
        const headers = cmContainer.querySelectorAll('.cm-header');
        const rowLabels = cmContainer.querySelectorAll('.cm-row-label');
        
        // Headers: [empty, Pred: 0, Pred: 1]
        if (headers.length >= 3) {
            headers[1].textContent = `Pred: ${outcomeLabels[0]}`;
            headers[2].textContent = `Pred: ${outcomeLabels[1]}`;
        }
        
        // Row labels: [Actual: 0, Actual: 1]
        if (rowLabels.length >= 2) {
            rowLabels[0].textContent = `Actual: ${outcomeLabels[0]}`;
            rowLabels[1].textContent = `Actual: ${outcomeLabels[1]}`;
        }
    }

    /**
     * Update equation display
     */
    function updateEquationDisplay(B0, B1) {
        if (!elements.equation_simple) return;
        
        const B0Str = B0 >= 0 ? B0.toFixed(1) : B0.toFixed(1);
        const B1Str = B1 >= 0 ? `+ ${B1.toFixed(2)}` : `- ${Math.abs(B1).toFixed(2)}`;
        
        // Dynamic probability label like p(Churn) or p(Converted)
        const pLabel = `p(${outcomeLabels[1]})`;
        
        if (hasCategoricalData && includeCategorical) {
            const B2 = parseFloat(elements.B2_cat_simple.value);
            const B3 = parseFloat(elements.B3_cat_simple.value);
            const B2Str = B2 >= 0 ? `+ ${B2.toFixed(1)}` : `- ${Math.abs(B2).toFixed(1)}`;
            const B3Str = B3 >= 0 ? `+ ${B3.toFixed(1)}` : `- ${Math.abs(B3).toFixed(1)}`;
            
            elements.equation_simple.innerHTML = `
                <strong>Model:</strong> z = <span class="dynamic-value">${B0Str}</span> 
                <span class="dynamic-value">${B1Str}</span> × X 
                <span class="dynamic-value">${B2Str}</span> × ${categoryLabels[1] || 'Cat2'}
                <span class="dynamic-value">${B3Str}</span> × ${categoryLabels[2] || 'Cat3'}
                &nbsp;→&nbsp; ${pLabel} = 1/(1 + e<sup>-z</sup>)
            `;
        } else {
            elements.equation_simple.innerHTML = `
                <strong>Model:</strong> ${pLabel} = 1 / (1 + e<sup>-(<span class="dynamic-value">${B0Str}</span> <span class="dynamic-value">${B1Str}</span> × X)</sup>)
            `;
        }
    }

    /**
     * Update interpretation panel
     */
    function updateInterpretation(B0, B1, logLoss, accuracy) {
        if (!elements.simpleInterpretation) return;
        
        // Decision boundary
        const boundary = Math.abs(B1) > 1e-10 ? -B0 / B1 : null;
        
        // Odds ratio interpretation
        const oddsRatio = Math.exp(B1);
        
        let html = '';
        
        // Slope interpretation - use dynamic outcome labels
        if (B1 > 0) {
            html += `<p>📈 <strong>Positive relationship:</strong> Higher ${xLabel.toLowerCase()} increases the probability of "${outcomeLabels[1]}".</p>`;
        } else if (B1 < 0) {
            html += `<p>📉 <strong>Negative relationship:</strong> Higher ${xLabel.toLowerCase()} decreases the probability of "${outcomeLabels[1]}".</p>`;
        } else {
            html += `<p>➡️ <strong>No relationship:</strong> ${xLabel} has no effect on the outcome.</p>`;
        }
        
        // Odds ratio
        html += `<p>🎲 <strong>Odds Ratio:</strong> Each unit increase in ${xLabel.toLowerCase()} multiplies the odds of "${outcomeLabels[1]}" by <span class="interp-highlight">${oddsRatio.toFixed(3)}</span>.</p>`;
        
        // Decision boundary
        if (boundary !== null && isFinite(boundary)) {
            html += `<p>✂️ <strong>Decision Boundary:</strong> The model predicts 50/50 odds at <span class="interp-highlight">${xLabel} = ${boundary.toFixed(1)}</span>.</p>`;
        }
        
        // Performance assessment
        if (logLoss < 0.35) {
            html += `<p>✅ <strong>Excellent fit!</strong> Log-loss of ${logLoss.toFixed(3)} indicates well-calibrated probability predictions.</p>`;
        } else if (logLoss < 0.55) {
            html += `<p>👍 <strong>Good fit.</strong> Log-loss of ${logLoss.toFixed(3)} shows reasonable predictive power.</p>`;
        } else {
            html += `<p>⚠️ <strong>Room for improvement.</strong> Log-loss of ${logLoss.toFixed(3)} suggests the model struggles to separate classes confidently.</p>`;
        }
        
        elements.simpleInterpretation.innerHTML = html;
    }

    /**
     * Update comparison section
     */
    function updateComparison() {
        if (!optimalLogLoss) return;
        
        if (elements.compare_logloss_user) {
            elements.compare_logloss_user.textContent = currentLogLoss.toFixed(4);
        }
        if (elements.compare_logloss_optimal) {
            elements.compare_logloss_optimal.textContent = optimalLogLoss.toFixed(4);
        }
        if (elements.gap_logloss) {
            const gap = currentLogLoss - optimalLogLoss;
            elements.gap_logloss.textContent = '+' + gap.toFixed(4);
        }
        if (elements.compare_accuracy_user) {
            elements.compare_accuracy_user.textContent = (currentAccuracy * 100).toFixed(1) + '%';
        }
        if (elements.compare_accuracy_optimal) {
            elements.compare_accuracy_optimal.textContent = (optimalAccuracy * 100).toFixed(1) + '%';
        }
        
        // Verdict
        if (elements.comparison_verdict) {
            const gap = currentLogLoss - optimalLogLoss;
            const pctGap = (gap / optimalLogLoss) * 100;
            
            let verdict = '';
            if (gap < 0.01) {
                verdict = `<p>🎉 <strong>Outstanding!</strong> You've essentially matched the optimal log-loss. Your model is perfectly calibrated.</p>`;
            } else if (pctGap < 10) {
                verdict = `<p>✅ <strong>Excellent work!</strong> You're within 10% of optimal. Fine-tune the parameters for a perfect fit.</p>`;
            } else if (pctGap < 25) {
                verdict = `<p>👍 <strong>Good progress!</strong> You're ${pctGap.toFixed(0)}% away from optimal. Keep adjusting!</p>`;
            } else {
                verdict = `<p>🎯 <strong>Keep exploring!</strong> Try adjusting B₀ to shift the curve and B₁ to change its steepness.</p>`;
            }
            
            elements.comparison_verdict.innerHTML = verdict;
        }
    }

    /**
     * Calculate optimal parameters and metrics
     */
    function calculateOptimal() {
        if (!data) return;
        
        const numParams = (hasCategoricalData && includeCategorical) ? 4 : 2;
        const result = optimizeLogistic(data.x, data.y, null, numParams);
        
        optimalParams = result.params;
        optimalLogLoss = result.value;
        
        // Calculate optimal accuracy
        let catShifts = null;
        if (numParams === 4 && data.categoryIndex) {
            catShifts = data.categoryIndex.map(idx => {
                if (idx === 0) return 0;
                if (idx === 1) return result.params[2];
                if (idx === 2) return result.params[3];
                return 0;
            });
        }
        optimalAccuracy = calculateAccuracy(data.x, data.y, result.params[0], result.params[1], catShifts);
        
        console.log('Optimal params:', optimalParams, 'Log-loss:', optimalLogLoss, 'Accuracy:', optimalAccuracy);
    }

    // ===== CSV Loading =====

    /**
     * Load scenario data from CSV file
     */
    function loadScenarioCSV(scenario) {
        fetch(scenario.csvPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                const lines = text.trim().split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                
                const xIdx = headers.indexOf(scenario.xColumn);
                const yIdx = headers.indexOf(scenario.yColumn);
                const catIdx = scenario.categoryColumn ? headers.indexOf(scenario.categoryColumn) : -1;
                
                const x = [];
                const y = [];
                const category = [];
                const categoryIndex = [];
                
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(',').map(p => p.trim());
                    if (parts.length >= 2) {
                        const xVal = parseFloat(parts[xIdx]);
                        const yVal = parseFloat(parts[yIdx]);
                        if (!isNaN(xVal) && !isNaN(yVal)) {
                            x.push(xVal);
                            y.push(yVal);
                            
                            if (catIdx >= 0 && scenario.categoryLabels) {
                                const catVal = parts[catIdx];
                                category.push(catVal);
                                const catIndex = scenario.categoryLabels.indexOf(catVal);
                                categoryIndex.push(catIndex >= 0 ? catIndex : 0);
                            }
                        }
                    }
                }
                
                // Store data
                data = { x, y };
                if (category.length > 0) {
                    data.category = category;
                    data.categoryIndex = categoryIndex;
                }
                
                // Pre-compute jitter (once per data load, stable across slider changes)
                jitteredY = y.map(yVal => yVal + (Math.random() - 0.5) * 0.08);
                
                // Calculate optimal
                calculateOptimal();
                
                // Update plot
                updatePlot();
                
                console.log(`Loaded ${x.length} observations from ${scenario.csvPath}`);
            })
            .catch(error => {
                console.error('Error loading CSV:', error);
                elements.simplePlot.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: #dc2626;">
                        <p><strong>Error loading data</strong></p>
                        <p>Could not load ${scenario.csvPath}</p>
                    </div>
                `;
            });
    }

    // ===== Scenario Management =====

    /**
     * Populate scenario dropdown
     */
    function populateScenarioDropdown() {
        if (typeof LOGLOSS_SCENARIOS === 'undefined') return;
        
        elements.scenarioSelect.innerHTML = '<option value="">-- Select a scenario --</option>';
        LOGLOSS_SCENARIOS.forEach(scenario => {
            const option = document.createElement('option');
            option.value = scenario.id;
            option.textContent = scenario.label;
            elements.scenarioSelect.appendChild(option);
        });
    }

    /**
     * Load a specific scenario
     */
    function loadScenario(scenarioId) {
        if (!scenarioId) {
            // Reset to default
            currentScenario = null;
            xLabel = "Engagement Score";
            yLabel = "Probability";
            outcomeLabels = ["Class 0", "Class 1"];
            elements.scenarioDescription.innerHTML = `
                <p class="scenario-placeholder">
                    Select a marketing scenario above to see the business context and variables, 
                    or use the default Email Conversion dataset loaded below.
                </p>
            `;
            elements.scenarioDownload.disabled = true;
            
            // Reset categorical state
            hasCategoricalData = false;
            includeCategorical = false;
            elements.categoricalToggleSimple.style.display = 'none';
            elements.categoricalControlsSimple.style.display = 'none';
            elements.categoryLegendSimple.innerHTML = '';
            
            // Load default scenario
            loadScenario('email-conversion');
            return;
        }
        
        const scenario = LOGLOSS_SCENARIOS.find(s => s.id === scenarioId);
        if (!scenario) return;
        
        currentScenario = scenario;
        xLabel = scenario.xLabel;
        yLabel = scenario.yLabel;
        
        // Track scenario selection
        if (typeof markScenarioLoaded === 'function') {
            markScenarioLoaded(scenario.label);
        }
        
        // Set dynamic outcome labels (e.g., ["Did Not Convert", "Converted"])
        outcomeLabels = scenario.outcomeLabels || ["Class 0", "Class 1"];
        
        // Update confusion matrix labels in DOM
        updateConfusionMatrixLabels();
        
        // Update description
        if (typeof scenario.description === 'function') {
            elements.scenarioDescription.innerHTML = scenario.description();
        }
        
        elements.scenarioDownload.disabled = false;
        
        // Handle categorical
        hasCategoricalData = scenario.hasCategorical || false;
        if (hasCategoricalData) {
            categoryLabels = scenario.categoryLabels || [];
            categoryColors = scenario.categoryColors || [];
            categorySymbols = scenario.categorySymbols || [];
            
            elements.categoricalToggleSimple.style.display = 'block';
            
            // Update legend
            let legendHtml = '';
            categoryLabels.forEach((label, idx) => {
                legendHtml += `
                    <span class="category-legend-item">
                        <span class="category-legend-dot" style="background: ${categoryColors[idx]}"></span>
                        ${label}
                    </span>
                `;
            });
            elements.categoryLegendSimple.innerHTML = legendHtml;
            
            // Update categorical slider labels
            if (categoryLabels.length > 1 && elements.B2_cat_simple_label) {
                elements.B2_cat_simple_label.textContent = `B₂ (${categoryLabels[1]} Shift)`;
            }
            if (categoryLabels.length > 2 && elements.B3_cat_simple_label) {
                elements.B3_cat_simple_label.textContent = `B₃ (${categoryLabels[2]} Shift)`;
            }
            
            // Update parameter ranges if specified
            if (scenario.paramRanges) {
                updateParameterRanges(scenario.paramRanges);
            }
        } else {
            elements.categoricalToggleSimple.style.display = 'none';
            elements.categoricalControlsSimple.style.display = 'none';
            elements.categoryLegendSimple.innerHTML = '';
            includeCategorical = false;
        }
        
        // Load data from CSV
        loadScenarioCSV(scenario);
    }

    /**
     * Update parameter ranges
     */
    function updateParameterRanges(ranges) {
        if (ranges.B0) {
            elements.B0_simple.min = ranges.B0.min;
            elements.B0_simple.max = ranges.B0.max;
            elements.B0_simple.step = ranges.B0.step || 0.1;
            elements.B0_simple_num.min = ranges.B0.min;
            elements.B0_simple_num.max = ranges.B0.max;
        }
        if (ranges.B1) {
            elements.B1_simple.min = ranges.B1.min;
            elements.B1_simple.max = ranges.B1.max;
            elements.B1_simple.step = ranges.B1.step || 0.01;
            elements.B1_simple_num.min = ranges.B1.min;
            elements.B1_simple_num.max = ranges.B1.max;
        }
        if (ranges.B_cat) {
            [elements.B2_cat_simple, elements.B3_cat_simple].forEach(el => {
                if (el) {
                    el.min = ranges.B_cat.min;
                    el.max = ranges.B_cat.max;
                    el.step = ranges.B_cat.step || 0.1;
                }
            });
            [elements.B2_cat_simple_num, elements.B3_cat_simple_num].forEach(el => {
                if (el) {
                    el.min = ranges.B_cat.min;
                    el.max = ranges.B_cat.max;
                }
            });
        }
    }

    // ===== Event Listeners =====

    function initEventListeners() {
        // Scenario selector
        if (elements.scenarioSelect) {
            elements.scenarioSelect.addEventListener('change', (e) => {
                loadScenario(e.target.value);
            });
        }
        
        // Parameter sliders and number inputs
        const paramIds = ['B0_simple', 'B1_simple', 'B2_cat_simple', 'B3_cat_simple'];
        paramIds.forEach(id => {
            const slider = document.getElementById(id);
            const numInput = document.getElementById(id + '_num');
            
            if (slider) {
                slider.addEventListener('input', () => syncControls(id, 'slider'));
            }
            if (numInput) {
                numInput.addEventListener('input', () => syncControls(id, 'number'));
                numInput.addEventListener('change', () => syncControls(id, 'number'));
            }
        });
        
        // Categorical toggle
        if (elements.includeCategoricalSimpleCheckbox) {
            elements.includeCategoricalSimpleCheckbox.addEventListener('change', (e) => {
                includeCategorical = e.target.checked;
                elements.categoricalControlsSimple.style.display = includeCategorical ? 'grid' : 'none';
                calculateOptimal(); // Recalculate optimal with/without categorical
                updatePlot();
            });
        }
        
        // Download button
        if (elements.scenarioDownload) {
            elements.scenarioDownload.addEventListener('click', downloadScenarioData);
        }
    }

    /**
     * Download current scenario data as CSV
     */
    function downloadScenarioData() {
        if (!data) return;
        
        let csv = hasCategoricalData ? 
            `${xLabel.replace(/\s/g, '_')},${yLabel.replace(/\s/g, '_')},category\n` :
            `${xLabel.replace(/\s/g, '_')},${yLabel.replace(/\s/g, '_')}\n`;
        
        for (let i = 0; i < data.x.length; i++) {
            if (hasCategoricalData && data.category) {
                csv += `${data.x[i]},${data.y[i]},${data.category[i]}\n`;
            } else {
                csv += `${data.x[i]},${data.y[i]}\n`;
            }
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentScenario ? currentScenario.id : 'logloss'}_data.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ===== Initialization =====

    function init() {
        console.log('Log-Loss Classification Lab initializing...');
        
        // Initialize engagement tracking
        if (typeof initEngagementTracking === 'function') {
            initEngagementTracking(TOOL_SLUG);
        }
        
        // Populate scenarios
        populateScenarioDropdown();
        
        // Set up event listeners
        initEventListeners();
        
        // Load default scenario
        loadScenario('email-conversion');
        
        console.log('Log-Loss Classification Lab initialized.');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
