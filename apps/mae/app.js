/**
 * MAE Model Calibration Lab
 * Interactive tool for learning about Mean Absolute Error through manual model fitting
 * 
 * Dr. Baker's Marketing Analytics Tools
 * Updated: 2026-02-03
 */

(function () {
    "use strict";

    // ===== Configuration =====
    const CSV_PATH = "data/data.csv";
    const TOOL_SLUG = "mae-calibration-lab";

    // Plotly color scheme matching the design system
    const COLORS = {
        dataPoints: "#2563eb",       // Blue for actual data
        linearFit: "#dc2626",        // Red for linear model
        quadraticFit: "#ea580c",     // Orange for quadratic model
        errorLines: "#94a3b8",       // Grey for error lines
        gridLines: "#e2e8f0"
    };

    // ===== Global State =====
    let data = null;
    let yMin = 0;
    let yMax = 0;
    let currentMAELinear = null;
    let currentMAEQuadratic = null;
    let currentScenario = null;
    let xLabel = "Ad Spending ($)";
    let yLabel = "Revenue ($)";
    let renderCount = 0;
    let lastTrackTime = 0;
    let lastScenarioLogged = null;

    // ===== DOM Elements =====
    const elements = {
        // Scenario
        scenarioSelect: document.getElementById("scenario-select"),
        scenarioDescription: document.getElementById("scenario-description"),
        scenarioDownload: document.getElementById("scenario-download"),
        
        // Model titles
        linearModelTitle: document.getElementById("linear-model-title"),
        quadraticModelTitle: document.getElementById("quadratic-model-title"),
        
        // Linear model
        B0_linear: document.getElementById("B0_linear"),
        B0_linear_num: document.getElementById("B0_linear_num"),
        B0_linear_display: document.getElementById("B0_linear_display"),
        B1_linear: document.getElementById("B1_linear"),
        B1_linear_num: document.getElementById("B1_linear_num"),
        B1_linear_display: document.getElementById("B1_linear_display"),
        equation_linear: document.getElementById("equation_linear"),
        mae_linear: document.getElementById("mae_linear"),
        linearPlot: document.getElementById("linearPlot"),
        linearInterpretation: document.getElementById("linear-interpretation-dynamic"),
        
        // Quadratic model
        B0_quadratic: document.getElementById("B0_quadratic"),
        B0_quadratic_num: document.getElementById("B0_quadratic_num"),
        B0_quadratic_display: document.getElementById("B0_quadratic_display"),
        B1_quadratic: document.getElementById("B1_quadratic"),
        B1_quadratic_num: document.getElementById("B1_quadratic_num"),
        B1_quadratic_display: document.getElementById("B1_quadratic_display"),
        B2_quadratic: document.getElementById("B2_quadratic"),
        B2_quadratic_num: document.getElementById("B2_quadratic_num"),
        B2_quadratic_display: document.getElementById("B2_quadratic_display"),
        equation_quadratic: document.getElementById("equation_quadratic"),
        mae_quadratic: document.getElementById("mae_quadratic"),
        quadraticPlot: document.getElementById("quadraticPlot"),
        quadraticInterpretation: document.getElementById("quadratic-interpretation-dynamic"),
        
        // Comparison (user MAE)
        compare_mae_linear: document.getElementById("compare_mae_linear"),
        compare_mae_quadratic: document.getElementById("compare_mae_quadratic"),
        comparison_verdict: document.getElementById("comparison-verdict"),
        
        // Comparison (optimal MAE)
        optimal_mae_linear: document.getElementById("optimal_mae_linear"),
        optimal_mae_quadratic: document.getElementById("optimal_mae_quadratic"),
        gap_linear: document.getElementById("gap_linear"),
        gap_quadratic: document.getElementById("gap_quadratic")
    };
    
    // ===== Optimal MAE Storage =====
    let optimalMAELinear = null;
    let optimalMAEQuadratic = null;
    let optimalParamsLinear = null;
    let optimalParamsQuadratic = null;

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
            // Clamp to slider range
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            value = Math.max(min, Math.min(max, value));
            slider.value = value;
        }
        
        // Format display based on parameter
        if (sliderId.includes("B2")) {
            display.textContent = value.toFixed(6);
        } else if (sliderId.includes("B1")) {
            display.textContent = value.toFixed(2);
        } else {
            display.textContent = value.toFixed(0);
        }
        
        updatePlots();
    }

    /**
     * Load CSV data
     */
    function loadCSVData(callback) {
        fetch(CSV_PATH)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                const x = [];
                const y = [];
                let lines = text.split("\n").filter(line => line.trim() !== "");
                
                // Skip header if present
                if (lines[0].toLowerCase().includes("x") || lines[0].toLowerCase().includes("spending")) {
                    lines.shift();
                }
                
                lines.forEach(line => {
                    const parts = line.split(",");
                    if (parts.length >= 2) {
                        const xVal = parseFloat(parts[0]);
                        const yVal = parseFloat(parts[1]);
                        if (!isNaN(xVal) && !isNaN(yVal)) {
                            x.push(xVal);
                            y.push(yVal);
                        }
                    }
                });
                
                callback({ x, y });
            })
            .catch(error => {
                console.error("Error loading CSV data:", error);
                // Show error to user
                elements.linearPlot.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: #dc2626;">
                        <p><strong>Error loading data</strong></p>
                        <p>Please check that data/data.csv exists.</p>
                    </div>
                `;
            });
    }

    // ===== Scenario Management =====

    /**
     * Populate scenario dropdown from scenarios.js
     */
    function populateScenarioDropdown() {
        if (typeof MAE_SCENARIOS === 'undefined') return;
        
        elements.scenarioSelect.innerHTML = '<option value="">-- Select a scenario --</option>';
        MAE_SCENARIOS.forEach(scenario => {
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
            xLabel = "Ad Spending ($)";
            yLabel = "Revenue ($)";
            if (typeof markScenarioLoaded === "function" && lastScenarioLogged !== "Default Search Ads") {
                markScenarioLoaded("Default Search Ads");
                lastScenarioLogged = "Default Search Ads";
            }
            elements.scenarioDescription.innerHTML = `
                <p class="scenario-placeholder">
                    Select a marketing scenario above to see the business context and variables, 
                    or use the default Search Ads dataset loaded below.
                </p>
            `;
            elements.scenarioDownload.disabled = true;
            
            // Reload default CSV
            loadCSVData(function (loadedData) {
                data = loadedData;
                yMin = Math.min(...data.y) - 50;
                yMax = Math.max(...data.y) + 50;
                calculateOptimalMAEs(); // Calculate optimal after loading
                resetParameters();
                updatePlots();
            });
            return;
        }
        
        const scenario = MAE_SCENARIOS.find(s => s.id === scenarioId);
        if (!scenario) return;
        
        currentScenario = scenario;
        xLabel = scenario.xLabel;
        yLabel = scenario.yLabel;
        if (typeof markScenarioLoaded === "function" && lastScenarioLogged !== scenario.label) {
            markScenarioLoaded(scenario.label);
            lastScenarioLogged = scenario.label;
        }
        
        // Render scenario description
        elements.scenarioDescription.innerHTML = scenario.description();
        elements.scenarioDownload.disabled = false;
        
        // Load scenario data (returns {x: [], y: []})
        const scenarioData = scenario.generateData();
        data = {
            x: scenarioData.x,
            y: scenarioData.y
        };
        
        // Update y range
        yMin = Math.min(...data.y) - 50;
        yMax = Math.max(...data.y) + 50;
        
        // Calculate optimal MAEs for this scenario
        calculateOptimalMAEs();
        
        // Reset parameters and update
        resetParameters();
        updatePlots();
    }

    /**
     * Reset parameters to sensible defaults for current data
     */
    function resetParameters() {
        if (!data) return;
        
        // Calculate basic stats to set sensible defaults
        const xMean = data.x.reduce((a, b) => a + b, 0) / data.x.length;
        const yMean = data.y.reduce((a, b) => a + b, 0) / data.y.length;
        
        // Simple defaults
        setParameter("B0_linear", Math.round(yMean * 0.2));
        setParameter("B1_linear", 0.5);
        setParameter("B0_quadratic", Math.round(yMean * 0.2));
        setParameter("B1_quadratic", 0.5);
        setParameter("B2_quadratic", 0.0001);
        
        // Update model titles
        updateModelTitles();
    }

    /**
     * Update model section titles based on current scenario
     */
    function updateModelTitles() {
        const xShort = currentScenario 
            ? currentScenario.xLabel.replace(/[()$]/g, '').split(' ')[0]
            : "AdSpending";
        const yShort = currentScenario
            ? currentScenario.yLabel.replace(/[()$]/g, '').split(' ')[0]
            : "Revenue";
        
        elements.linearModelTitle.innerHTML = `🔵 Linear Fit: ${yShort} = B₀ + B₁ × ${xShort}`;
        elements.quadraticModelTitle.innerHTML = `🟠 Quadratic Fit: ${yShort} = B₀ + B₁ × ${xShort} + B₂ × ${xShort}²`;
    }

    /**
     * Set a parameter value and sync displays
     */
    function setParameter(baseName, value) {
        const slider = document.getElementById(baseName);
        const numberInput = document.getElementById(baseName + "_num");
        const display = document.getElementById(baseName + "_display");
        
        if (slider) slider.value = value;
        if (numberInput) numberInput.value = value;
        if (display) {
            if (baseName.includes("B2")) {
                display.textContent = value.toFixed(6);
            } else if (baseName.includes("B1")) {
                display.textContent = value.toFixed(2);
            } else {
                display.textContent = value.toFixed(0);
            }
        }
    }

    /**
     * Download current scenario data as CSV
     */
    function downloadScenarioData() {
        if (!data) return;
        
        const header = currentScenario 
            ? `${currentScenario.xLabel.replace(/[()$]/g, '')},${currentScenario.yLabel.replace(/[()$]/g, '')}`
            : "X,Y";
        
        let csv = header + "\n";
        for (let i = 0; i < data.x.length; i++) {
            csv += `${data.x[i]},${data.y[i]}\n`;
        }
        
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = currentScenario ? `${currentScenario.id}_data.csv` : "mae_data.csv";
        a.click();
        URL.revokeObjectURL(url);

        if (typeof logFeatureUsage === "function") {
            const scenarioName = currentScenario ? currentScenario.label : "Default Search Ads";
            logFeatureUsage(TOOL_SLUG, "export_data", {
                format: "csv",
                rows: data.x.length,
                scenario: scenarioName
            });
        }
    }

    /**
     * Calculate Mean Absolute Error
     */
    function calculateMAE(actual, predicted) {
        if (actual.length !== predicted.length || actual.length === 0) return null;
        
        let sum = 0;
        for (let i = 0; i < actual.length; i++) {
            sum += Math.abs(actual[i] - predicted[i]);
        }
        return sum / actual.length;
    }

    /**
     * Get current parameter values
     */
    function getParameters() {
        return {
            B0_linear: parseFloat(elements.B0_linear_num.value) || 0,
            B1_linear: parseFloat(elements.B1_linear_num.value) || 0,
            B0_quadratic: parseFloat(elements.B0_quadratic_num.value) || 0,
            B1_quadratic: parseFloat(elements.B1_quadratic_num.value) || 0,
            B2_quadratic: parseFloat(elements.B2_quadratic_num.value) || 0
        };
    }

    /**
     * Generate predictions
     */
    function predictLinear(x, B0, B1) {
        return x.map(xi => B0 + B1 * xi);
    }

    function predictQuadratic(x, B0, B1, B2) {
        return x.map(xi => B0 + B1 * xi + B2 * Math.pow(xi, 2));
    }

    // ===== Optimal Parameter Calculation (OLS) =====

    /**
     * Calculate optimal linear regression parameters using OLS
     * Returns { B0, B1, mae }
     */
    function calculateOptimalLinear(xData, yData) {
        const n = xData.length;
        if (n === 0) return null;
        
        // Calculate means
        const xMean = xData.reduce((a, b) => a + b, 0) / n;
        const yMean = yData.reduce((a, b) => a + b, 0) / n;
        
        // Calculate slope (B1) using OLS formula
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (xData[i] - xMean) * (yData[i] - yMean);
            denominator += Math.pow(xData[i] - xMean, 2);
        }
        
        const B1 = denominator !== 0 ? numerator / denominator : 0;
        const B0 = yMean - B1 * xMean;
        
        // Calculate MAE with optimal parameters
        const predicted = predictLinear(xData, B0, B1);
        const mae = calculateMAE(yData, predicted);
        
        return { B0, B1, mae };
    }

    /**
     * Calculate optimal quadratic regression parameters using OLS
     * Uses matrix algebra: β = (X'X)^(-1) X'y
     * Returns { B0, B1, B2, mae }
     */
    function calculateOptimalQuadratic(xData, yData) {
        const n = xData.length;
        if (n < 3) return null;
        
        // Build design matrix X = [1, x, x²]
        // We need to solve the normal equations: (X'X)β = X'y
        
        // Calculate sums needed for normal equations
        let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
        let sumY = 0, sumXY = 0, sumX2Y = 0;
        
        for (let i = 0; i < n; i++) {
            const x = xData[i];
            const y = yData[i];
            const x2 = x * x;
            const x3 = x2 * x;
            const x4 = x2 * x2;
            
            sumX += x;
            sumX2 += x2;
            sumX3 += x3;
            sumX4 += x4;
            sumY += y;
            sumXY += x * y;
            sumX2Y += x2 * y;
        }
        
        // X'X matrix (3x3):
        // | n      sumX    sumX2  |
        // | sumX   sumX2   sumX3  |
        // | sumX2  sumX3   sumX4  |
        
        // X'y vector:
        // | sumY   |
        // | sumXY  |
        // | sumX2Y |
        
        // Solve using Cramer's rule or matrix inversion
        // For simplicity, use direct matrix inversion for 3x3
        const A = [
            [n, sumX, sumX2],
            [sumX, sumX2, sumX3],
            [sumX2, sumX3, sumX4]
        ];
        const b = [sumY, sumXY, sumX2Y];
        
        // Calculate determinant of 3x3 matrix
        const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
                  - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
                  + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
        
        if (Math.abs(det) < 1e-10) {
            // Matrix is singular, fall back to linear
            const linear = calculateOptimalLinear(xData, yData);
            return { B0: linear.B0, B1: linear.B1, B2: 0, mae: linear.mae };
        }
        
        // Calculate inverse using adjugate matrix
        const invDet = 1 / det;
        const inv = [
            [
                (A[1][1] * A[2][2] - A[1][2] * A[2][1]) * invDet,
                (A[0][2] * A[2][1] - A[0][1] * A[2][2]) * invDet,
                (A[0][1] * A[1][2] - A[0][2] * A[1][1]) * invDet
            ],
            [
                (A[1][2] * A[2][0] - A[1][0] * A[2][2]) * invDet,
                (A[0][0] * A[2][2] - A[0][2] * A[2][0]) * invDet,
                (A[0][2] * A[1][0] - A[0][0] * A[1][2]) * invDet
            ],
            [
                (A[1][0] * A[2][1] - A[1][1] * A[2][0]) * invDet,
                (A[0][1] * A[2][0] - A[0][0] * A[2][1]) * invDet,
                (A[0][0] * A[1][1] - A[0][1] * A[1][0]) * invDet
            ]
        ];
        
        // β = inv(X'X) * X'y
        const B0 = inv[0][0] * b[0] + inv[0][1] * b[1] + inv[0][2] * b[2];
        const B1 = inv[1][0] * b[0] + inv[1][1] * b[1] + inv[1][2] * b[2];
        const B2 = inv[2][0] * b[0] + inv[2][1] * b[1] + inv[2][2] * b[2];
        
        // Calculate MAE with optimal parameters
        const predicted = predictQuadratic(xData, B0, B1, B2);
        const mae = calculateMAE(yData, predicted);
        
        return { B0, B1, B2, mae };
    }

    /**
     * Calculate and store optimal MAEs for current data
     */
    function calculateOptimalMAEs() {
        if (!data) return;
        
        optimalParamsLinear = calculateOptimalLinear(data.x, data.y);
        optimalParamsQuadratic = calculateOptimalQuadratic(data.x, data.y);
        
        if (optimalParamsLinear) {
            optimalMAELinear = optimalParamsLinear.mae;
        }
        if (optimalParamsQuadratic) {
            optimalMAEQuadratic = optimalParamsQuadratic.mae;
        }
        
        // Update optimal MAE displays
        updateOptimalMAEDisplays();
    }

    /**
     * Update the optimal MAE displays
     */
    function updateOptimalMAEDisplays() {
        if (elements.optimal_mae_linear && optimalMAELinear !== null) {
            elements.optimal_mae_linear.querySelector(".mae-value").textContent = optimalMAELinear.toFixed(2);
        }
        if (elements.optimal_mae_quadratic && optimalMAEQuadratic !== null) {
            elements.optimal_mae_quadratic.querySelector(".mae-value").textContent = optimalMAEQuadratic.toFixed(2);
        }
    }

    // ===== Plotting Functions =====

    /**
     * Create error line shapes for Plotly
     */
    function createErrorLines(xData, yActual, yPredicted) {
        return xData.map((xVal, i) => ({
            type: "line",
            x0: xVal,
            y0: yActual[i],
            x1: xVal,
            y1: yPredicted[i],
            line: {
                color: COLORS.errorLines,
                dash: "dot",
                width: 1
            }
        }));
    }

    /**
     * Common Plotly layout
     */
    function getCommonLayout(title) {
        return {
            title: {
                text: title,
                font: { size: 16, color: "#1e293b" }
            },
            xaxis: {
                title: { text: xLabel, font: { size: 13 } },
                showgrid: true,
                gridcolor: COLORS.gridLines,
                showline: true,
                linecolor: "#94a3b8",
                linewidth: 1,
                zeroline: false
            },
            yaxis: {
                title: { text: yLabel, font: { size: 13 } },
                range: [yMin, yMax],
                showgrid: true,
                gridcolor: COLORS.gridLines,
                showline: true,
                linecolor: "#94a3b8",
                linewidth: 1,
                zeroline: false
            },
            hovermode: "closest",
            plot_bgcolor: "#ffffff",
            paper_bgcolor: "#ffffff",
            margin: { t: 50, r: 30, b: 60, l: 70 },
            font: { family: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }
        };
    }

    /**
     * Update all plots
     */
    function updatePlots() {
        if (!data) return;

        const params = getParameters();
        
        // Generate fit line x values
        const xMin = Math.min(...data.x);
        const xMax = Math.max(...data.x);
        const xFit = Array.from({ length: 100 }, (_, i) => xMin + (xMax - xMin) * i / 99);
        
        // Get variable names for displays
        const xShort = currentScenario 
            ? currentScenario.xLabel.replace(/[()$]/g, '').split(' ')[0]
            : "AdSpending";
        const yShort = currentScenario
            ? currentScenario.yLabel.replace(/[()$]/g, '').split(' ')[0]
            : "REVENUE";
        
        // ===== Linear Model =====
        const yLinearFit = predictLinear(xFit, params.B0_linear, params.B1_linear);
        const yLinearPred = predictLinear(data.x, params.B0_linear, params.B1_linear);
        currentMAELinear = calculateMAE(data.y, yLinearPred);
        
        // Update equation display
        elements.equation_linear.innerHTML = `
            <strong>Model:</strong> ${yShort.toUpperCase()} = 
            <span class="dynamic-value">${params.B0_linear.toFixed(1)}</span> + 
            <span class="dynamic-value">${params.B1_linear.toFixed(2)}</span> × ${xShort}
        `;
        
        // Update MAE display
        elements.mae_linear.innerHTML = `
            <span class="mae-label">MAE =</span>
            <span class="mae-value">${currentMAELinear.toFixed(2)}</span>
        `;
        
        // Plot linear model
        const linearTraces = [
            {
                x: data.x,
                y: data.y,
                mode: "markers",
                type: "scatter",
                name: "Actual Data",
                marker: {
                    color: COLORS.dataPoints,
                    size: 10,
                    opacity: 0.8
                },
                hovertemplate: `${xLabel}: %{x:,.0f}<br>${yLabel}: $%{y:,.0f}<extra></extra>`
            },
            {
                x: xFit,
                y: yLinearFit,
                mode: "lines",
                type: "scatter",
                name: "Linear Fit",
                line: {
                    color: COLORS.linearFit,
                    width: 3,
                    dash: "solid"
                },
                hoverinfo: "skip"
            }
        ];
        
        const linearLayout = {
            ...getCommonLayout("Linear Model Fit"),
            shapes: createErrorLines(data.x, data.y, yLinearPred)
        };
        
        Plotly.react(elements.linearPlot, linearTraces, linearLayout, {
            responsive: true,
            displayModeBar: false
        });
        
        // ===== Quadratic Model =====
        const yQuadFit = predictQuadratic(xFit, params.B0_quadratic, params.B1_quadratic, params.B2_quadratic);
        const yQuadPred = predictQuadratic(data.x, params.B0_quadratic, params.B1_quadratic, params.B2_quadratic);
        currentMAEQuadratic = calculateMAE(data.y, yQuadPred);
        
        // Update equation display
        elements.equation_quadratic.innerHTML = `
            <strong>Model:</strong> ${yShort.toUpperCase()} = 
            <span class="dynamic-value">${params.B0_quadratic.toFixed(1)}</span> + 
            <span class="dynamic-value">${params.B1_quadratic.toFixed(2)}</span> × ${xShort} + 
            <span class="dynamic-value">${params.B2_quadratic.toFixed(6)}</span> × ${xShort}²
        `;
        
        // Update MAE display
        elements.mae_quadratic.innerHTML = `
            <span class="mae-label">MAE =</span>
            <span class="mae-value">${currentMAEQuadratic.toFixed(2)}</span>
        `;
        
        // Plot quadratic model
        const quadTraces = [
            {
                x: data.x,
                y: data.y,
                mode: "markers",
                type: "scatter",
                name: "Actual Data",
                marker: {
                    color: COLORS.dataPoints,
                    size: 10,
                    opacity: 0.8
                },
                hovertemplate: `${xLabel}: %{x:,.0f}<br>${yLabel}: $%{y:,.0f}<extra></extra>`
            },
            {
                x: xFit,
                y: yQuadFit,
                mode: "lines",
                type: "scatter",
                name: "Quadratic Fit",
                line: {
                    color: COLORS.quadraticFit,
                    width: 3,
                    dash: "solid"
                },
                hoverinfo: "skip"
            }
        ];
        
        const quadLayout = {
            ...getCommonLayout("Quadratic Model Fit"),
            shapes: createErrorLines(data.x, data.y, yQuadPred)
        };
        
        Plotly.react(elements.quadraticPlot, quadTraces, quadLayout, {
            responsive: true,
            displayModeBar: false
        });
        
        // ===== Update Dynamic Interpretations =====
        updateLinearInterpretation(params, currentMAELinear);
        updateQuadraticInterpretation(params, currentMAEQuadratic);
        
        // ===== Update Comparison Section =====
        updateComparison();

        // ===== Tracking (debounced) =====
        renderCount += 1;
        const now = Date.now();
        if (renderCount > 1 && (now - lastTrackTime) > 500) {
            lastTrackTime = now;
            const scenarioName = currentScenario ? currentScenario.label : "Default Search Ads";
            const trackingParams = {
                scenario: scenarioName,
                n: data.x.length,
                B0_linear: params.B0_linear,
                B1_linear: params.B1_linear,
                B0_quadratic: params.B0_quadratic,
                B1_quadratic: params.B1_quadratic,
                B2_quadratic: params.B2_quadratic,
                mae_linear: currentMAELinear,
                mae_quadratic: currentMAEQuadratic
            };
            const summary = `MAE linear ${currentMAELinear.toFixed(2)}, quadratic ${currentMAEQuadratic.toFixed(2)}`;

            if (typeof markRunAttempted === "function") {
                markRunAttempted();
            }
            if (typeof markRunSuccessful === "function") {
                markRunSuccessful(trackingParams, summary);
            }
            if (typeof logToolUsage === "function") {
                logToolUsage(TOOL_SLUG, trackingParams, summary, {
                    scenario: scenarioName,
                    dataSource: "scenario"
                });
            }
        }
    }

    // ===== Dynamic Interpretation Functions =====

    /**
     * Generate dynamic interpretation for linear model
     */
    function updateLinearInterpretation(params, mae) {
        const B0 = params.B0_linear;
        const B1 = params.B1_linear;
        
        // Get context-appropriate variable names
        const xVar = currentScenario ? currentScenario.xLabel.replace(/[$()]/g, '').trim() : "Ad Spending";
        const yVar = currentScenario ? currentScenario.yLabel.replace(/[$()]/g, '').trim() : "Revenue";
        
        // Interpret B0 (intercept)
        let b0Interpretation;
        if (B0 > 0) {
            b0Interpretation = `Your baseline (B₀ = <strong>${B0.toFixed(1)}</strong>) suggests that with zero ${xVar.toLowerCase()}, 
                you'd expect approximately <strong>$${B0.toFixed(0)}</strong> in ${yVar.toLowerCase()}. 
                This could represent organic ${yVar.toLowerCase()} independent of the input variable.`;
        } else if (B0 < 0) {
            b0Interpretation = `Your intercept (B₀ = <strong>${B0.toFixed(1)}</strong>) is negative, which may not have 
                a direct real-world interpretation. It suggests that at very low ${xVar.toLowerCase()} levels, 
                the model extrapolates to negative ${yVar.toLowerCase()}—a sign the linear model may not fit well at the extremes.`;
        } else {
            b0Interpretation = `Your intercept (B₀ = <strong>0</strong>) means the model predicts zero ${yVar.toLowerCase()} 
                with zero ${xVar.toLowerCase()}—a direct proportional relationship.`;
        }
        
        // Interpret B1 (slope)
        let b1Interpretation;
        const b1Abs = Math.abs(B1);
        if (B1 > 0) {
            b1Interpretation = `Your slope (B₁ = <strong>${B1.toFixed(2)}</strong>) indicates that for every 
                additional unit of ${xVar.toLowerCase()}, ${yVar.toLowerCase()} increases by <strong>$${B1.toFixed(2)}</strong>. 
                This is a ${B1 >= 1 ? 'positive ROI' : 'modest return'}—each dollar in yields $${B1.toFixed(2)} out.`;
        } else if (B1 < 0) {
            b1Interpretation = `Your slope (B₁ = <strong>${B1.toFixed(2)}</strong>) is negative, suggesting an 
                <em>inverse</em> relationship: more ${xVar.toLowerCase()} is associated with <em>less</em> ${yVar.toLowerCase()}. 
                This is unusual and might indicate data issues or an inappropriate model.`;
        } else {
            b1Interpretation = `Your slope (B₁ = <strong>0</strong>) suggests ${xVar.toLowerCase()} has 
                no effect on ${yVar.toLowerCase()} in this linear model.`;
        }
        
        // MAE context
        let maeContext;
        const yMean = data.y.reduce((a, b) => a + b, 0) / data.y.length;
        const maePercent = (mae / yMean * 100).toFixed(1);
        if (mae < yMean * 0.05) {
            maeContext = `<span class="interpretation-good">Excellent fit!</span> Your MAE of <strong>$${mae.toFixed(2)}</strong> 
                (${maePercent}% of mean ${yVar.toLowerCase()}) indicates very accurate predictions.`;
        } else if (mae < yMean * 0.15) {
            maeContext = `<span class="interpretation-ok">Decent fit.</span> Your MAE of <strong>$${mae.toFixed(2)}</strong> 
                (${maePercent}% of mean ${yVar.toLowerCase()}) shows moderate prediction accuracy.`;
        } else {
            maeContext = `<span class="interpretation-poor">Room for improvement.</span> Your MAE of <strong>$${mae.toFixed(2)}</strong> 
                (${maePercent}% of mean ${yVar.toLowerCase()}) suggests the linear model may not capture the relationship well.`;
        }
        
        elements.linearInterpretation.innerHTML = `
            <div class="interpretation-item">
                <div class="interp-label">📍 Intercept (B₀)</div>
                <p>${b0Interpretation}</p>
            </div>
            <div class="interpretation-item">
                <div class="interp-label">📈 Slope (B₁)</div>
                <p>${b1Interpretation}</p>
            </div>
            <div class="interpretation-item">
                <div class="interp-label">🎯 Model Fit (MAE)</div>
                <p>${maeContext}</p>
            </div>
            <div class="interpretation-note">
                <em>💡 Remember: Linear models assume a constant relationship—every unit has the same marginal effect, regardless of scale.</em>
            </div>
        `;
    }

    /**
     * Generate dynamic interpretation for quadratic model
     */
    function updateQuadraticInterpretation(params, mae) {
        const B0 = params.B0_quadratic;
        const B1 = params.B1_quadratic;
        const B2 = params.B2_quadratic;
        
        // Get context-appropriate variable names
        const xVar = currentScenario ? currentScenario.xLabel.replace(/[$()]/g, '').trim() : "Ad Spending";
        const yVar = currentScenario ? currentScenario.yLabel.replace(/[$()]/g, '').trim() : "Revenue";
        
        // Interpret B2 (curvature) - the key differentiator
        let b2Interpretation;
        let curvatureType;
        const b2Abs = Math.abs(B2);
        
        if (B2 < -0.00001) {
            curvatureType = "diminishing";
            b2Interpretation = `Your quadratic term (B₂ = <strong>${B2.toFixed(6)}</strong>) is <span class="interpretation-highlight negative">negative</span>, 
                indicating <strong>diminishing returns</strong>. This is common in marketing: early ${xVar.toLowerCase()} has high impact, 
                but additional ${xVar.toLowerCase()} yields progressively smaller gains. The curve bends downward.`;
        } else if (B2 > 0.00001) {
            curvatureType = "increasing";
            b2Interpretation = `Your quadratic term (B₂ = <strong>${B2.toFixed(6)}</strong>) is <span class="interpretation-highlight positive">positive</span>, 
                indicating <strong>increasing returns</strong>. This means the relationship accelerates—more ${xVar.toLowerCase()} 
                produces proportionally <em>more</em> ${yVar.toLowerCase()}. This could reflect network effects or momentum.`;
        } else {
            curvatureType = "linear";
            b2Interpretation = `Your quadratic term (B₂ ≈ <strong>0</strong>) means there's essentially no curvature. 
                The quadratic model is behaving like a linear model. Consider whether the linear model is sufficient.`;
        }
        
        // Calculate and interpret the vertex (turning point)
        let vertexInterpretation = "";
        if (B2 !== 0) {
            const vertexX = -B1 / (2 * B2);
            const xMin = Math.min(...data.x);
            const xMax = Math.max(...data.x);
            
            if (vertexX > xMin && vertexX < xMax) {
                const vertexY = B0 + B1 * vertexX + B2 * Math.pow(vertexX, 2);
                if (B2 < 0) {
                    vertexInterpretation = `<div class="interpretation-item">
                        <div class="interp-label">🎯 Optimal Point</div>
                        <p>The model reaches its <strong>maximum</strong> ${yVar.toLowerCase()} at ${xVar.toLowerCase()} ≈ <strong>${vertexX.toFixed(0)}</strong>, 
                        predicting <strong>$${vertexY.toFixed(0)}</strong>. Beyond this point, diminishing returns turn negative—more spending actually 
                        <em>reduces</em> predicted ${yVar.toLowerCase()}.</p>
                    </div>`;
                } else {
                    vertexInterpretation = `<div class="interpretation-item">
                        <div class="interp-label">📉 Minimum Point</div>
                        <p>The model has a <strong>minimum</strong> at ${xVar.toLowerCase()} ≈ <strong>${vertexX.toFixed(0)}</strong>. 
                        This is unusual for marketing data and may indicate the model isn't appropriate for this relationship.</p>
                    </div>`;
                }
            } else if (vertexX > 0) {
                if (B2 < 0 && vertexX > xMax) {
                    vertexInterpretation = `<div class="interpretation-item">
                        <div class="interp-label">📊 Projected Optimum</div>
                        <p>The model's theoretical peak is at ${xVar.toLowerCase()} ≈ <strong>${vertexX.toFixed(0)}</strong>, 
                        which is beyond your current data range. You're still in the "positive returns" zone.</p>
                    </div>`;
                }
            }
        }
        
        // MAE context with quadratic comparison
        let maeContext;
        const yMean = data.y.reduce((a, b) => a + b, 0) / data.y.length;
        const maePercent = (mae / yMean * 100).toFixed(1);
        const maeDiff = currentMAELinear - mae;
        
        if (mae < yMean * 0.05) {
            maeContext = `<span class="interpretation-good">Excellent fit!</span> MAE = <strong>$${mae.toFixed(2)}</strong> (${maePercent}% of mean).`;
        } else if (mae < yMean * 0.15) {
            maeContext = `<span class="interpretation-ok">Good fit.</span> MAE = <strong>$${mae.toFixed(2)}</strong> (${maePercent}% of mean).`;
        } else {
            maeContext = `<span class="interpretation-poor">Moderate fit.</span> MAE = <strong>$${mae.toFixed(2)}</strong> (${maePercent}% of mean).`;
        }
        
        // Compare to linear
        if (maeDiff > 0.5) {
            maeContext += ` <span class="interpretation-good">That's <strong>$${maeDiff.toFixed(2)}</strong> better than linear!</span> 
                The curvature is helping capture the relationship.`;
        } else if (maeDiff < -0.5) {
            maeContext += ` The linear model actually fits <strong>$${Math.abs(maeDiff).toFixed(2)}</strong> better. 
                The quadratic term may be adding complexity without improving fit.`;
        } else {
            maeContext += ` Similar to the linear model—the curvature isn't providing much improvement.`;
        }
        
        elements.quadraticInterpretation.innerHTML = `
            <div class="interpretation-item">
                <div class="interp-label">🔄 Curvature (B₂)</div>
                <p>${b2Interpretation}</p>
            </div>
            ${vertexInterpretation}
            <div class="interpretation-item">
                <div class="interp-label">🎯 Model Fit (MAE)</div>
                <p>${maeContext}</p>
            </div>
            ${curvatureType === "diminishing" ? `
            <div class="callout-box callout-green">
                <p><strong>🎯 Marketing Insight:</strong> Diminishing returns (negative B₂) is one of the most important concepts 
                in marketing budget optimization. It tells you that pouring more money into a channel eventually yields 
                smaller and smaller gains—helping you decide when to diversify or reallocate.</p>
            </div>
            ` : ''}
        `;
    }

    /**
     * Update the model comparison section
     */
    function updateComparison() {
        if (currentMAELinear === null || currentMAEQuadratic === null) return;
        
        // Update comparison MAE values
        elements.compare_mae_linear.querySelector(".mae-value").textContent = currentMAELinear.toFixed(2);
        elements.compare_mae_quadratic.querySelector(".mae-value").textContent = currentMAEQuadratic.toFixed(2);
        
        // Determine winner and update styling
        const linearCard = elements.compare_mae_linear.closest(".comparison-card");
        const quadCard = elements.compare_mae_quadratic.closest(".comparison-card");
        
        linearCard.classList.remove("winner");
        quadCard.classList.remove("winner");
        
        const diff = Math.abs(currentMAELinear - currentMAEQuadratic);
        const threshold = 0.5; // Minimum difference to declare a winner
        
        if (diff < threshold) {
            elements.comparison_verdict.textContent = "📊 Both models perform similarly (MAE difference < 0.5)";
            elements.comparison_verdict.classList.remove("has-winner");
        } else if (currentMAELinear < currentMAEQuadratic) {
            linearCard.classList.add("winner");
            elements.comparison_verdict.innerHTML = `
                🏆 <strong>Linear model wins!</strong> Lower MAE by ${diff.toFixed(2)} indicates better fit with fewer parameters.
            `;
            elements.comparison_verdict.classList.add("has-winner");
        } else {
            quadCard.classList.add("winner");
            elements.comparison_verdict.innerHTML = `
                🏆 <strong>Quadratic model wins!</strong> Lower MAE by ${diff.toFixed(2)} suggests the relationship has curvature (possibly diminishing returns).
            `;
            elements.comparison_verdict.classList.add("has-winner");
        }
        
        // Update gap displays
        updateGapDisplays();
    }

    /**
     * Update the gap between user's MAE and optimal MAE
     */
    function updateGapDisplays() {
        if (elements.gap_linear && optimalMAELinear !== null && currentMAELinear !== null) {
            const gapLinear = currentMAELinear - optimalMAELinear;
            const gapPercent = (gapLinear / optimalMAELinear * 100).toFixed(1);
            const gapEl = elements.gap_linear.querySelector(".gap-value");
            
            if (gapLinear < 0.5) {
                gapEl.innerHTML = `<span class="gap-excellent">🎯 Excellent! Within 0.5 of optimal</span>`;
            } else if (gapLinear / optimalMAELinear < 0.1) {
                gapEl.innerHTML = `<span class="gap-good">+${gapLinear.toFixed(2)} (${gapPercent}% above optimal)</span>`;
            } else {
                gapEl.innerHTML = `<span class="gap-room">+${gapLinear.toFixed(2)} (${gapPercent}% above optimal)</span>`;
            }
        }
        
        if (elements.gap_quadratic && optimalMAEQuadratic !== null && currentMAEQuadratic !== null) {
            const gapQuad = currentMAEQuadratic - optimalMAEQuadratic;
            const gapPercent = (gapQuad / optimalMAEQuadratic * 100).toFixed(1);
            const gapEl = elements.gap_quadratic.querySelector(".gap-value");
            
            if (gapQuad < 0.5) {
                gapEl.innerHTML = `<span class="gap-excellent">🎯 Excellent! Within 0.5 of optimal</span>`;
            } else if (gapQuad / optimalMAEQuadratic < 0.1) {
                gapEl.innerHTML = `<span class="gap-good">+${gapQuad.toFixed(2)} (${gapPercent}% above optimal)</span>`;
            } else {
                gapEl.innerHTML = `<span class="gap-room">+${gapQuad.toFixed(2)} (${gapPercent}% above optimal)</span>`;
            }
        }
    }

    // ===== Event Listeners =====

    function setupEventListeners() {
        // Scenario selection
        elements.scenarioSelect.addEventListener("change", (e) => {
            loadScenario(e.target.value);
        });
        
        // Scenario download
        elements.scenarioDownload.addEventListener("click", downloadScenarioData);
        
        // Linear model controls
        elements.B0_linear.addEventListener("input", () => syncControls("B0_linear", "slider"));
        elements.B0_linear_num.addEventListener("input", () => syncControls("B0_linear", "number"));
        elements.B1_linear.addEventListener("input", () => syncControls("B1_linear", "slider"));
        elements.B1_linear_num.addEventListener("input", () => syncControls("B1_linear", "number"));
        
        // Quadratic model controls
        elements.B0_quadratic.addEventListener("input", () => syncControls("B0_quadratic", "slider"));
        elements.B0_quadratic_num.addEventListener("input", () => syncControls("B0_quadratic", "number"));
        elements.B1_quadratic.addEventListener("input", () => syncControls("B1_quadratic", "slider"));
        elements.B1_quadratic_num.addEventListener("input", () => syncControls("B1_quadratic", "number"));
        elements.B2_quadratic.addEventListener("input", () => syncControls("B2_quadratic", "slider"));
        elements.B2_quadratic_num.addEventListener("input", () => syncControls("B2_quadratic", "number"));
        
        // Window resize
        window.addEventListener("resize", () => {
            if (elements.linearPlot) Plotly.Plots.resize(elements.linearPlot);
            if (elements.quadraticPlot) Plotly.Plots.resize(elements.quadraticPlot);
        });
    }

    // ===== Initialization =====

    function init() {
        console.log("MAE Model Calibration Lab initializing...");
        
        // Populate scenario dropdown
        populateScenarioDropdown();
        
        setupEventListeners();
        
        // Initialize display values
        syncControls("B0_linear", "slider");
        syncControls("B1_linear", "slider");
        syncControls("B0_quadratic", "slider");
        syncControls("B1_quadratic", "slider");
        syncControls("B2_quadratic", "slider");
        
        // Load data and create plots
        loadCSVData(function (loadedData) {
            data = loadedData;
            console.log(`Loaded ${data.x.length} data points`);
            
            // Set y-axis range with padding
            yMin = Math.min(...data.y) - 50;
            yMax = Math.max(...data.y) + 50;
            
            // Calculate optimal MAEs for comparison
            calculateOptimalMAEs();
            
            // Initial plot
            updatePlots();

            if (typeof markScenarioLoaded === "function" && lastScenarioLogged !== "Default Search Ads") {
                markScenarioLoaded("Default Search Ads");
                lastScenarioLogged = "Default Search Ads";
            }
            
            // Track tool initialization
            if (typeof initEngagementTracking === "function") {
                initEngagementTracking(TOOL_SLUG);
            }
        });
    }

    // Start when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
