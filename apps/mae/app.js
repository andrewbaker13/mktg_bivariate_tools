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
    
    // Categorical state
    let hasCategoricalData = false;
    let includeCategoricalLinear = false;
    let includeCategoricalQuadratic = false;
    let categoryLabels = [];
    let categoryColors = [];
    let categorySymbols = [];

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
        gap_quadratic: document.getElementById("gap_quadratic"),
        
        // Categorical controls - Linear
        categoricalToggleLinear: document.getElementById("categorical-toggle-linear"),
        includeCategoricalLinearCheckbox: document.getElementById("includeCategoricalLinear"),
        categoryLegendLinear: document.getElementById("category-legend-linear"),
        categoricalControlsLinear: document.getElementById("categorical-controls-linear"),
        B2_cat_linear: document.getElementById("B2_cat_linear"),
        B2_cat_linear_num: document.getElementById("B2_cat_linear_num"),
        B2_cat_linear_display: document.getElementById("B2_cat_linear_display"),
        B3_cat_linear: document.getElementById("B3_cat_linear"),
        B3_cat_linear_num: document.getElementById("B3_cat_linear_num"),
        B3_cat_linear_display: document.getElementById("B3_cat_linear_display"),
        
        // Categorical controls - Quadratic
        categoricalToggleQuadratic: document.getElementById("categorical-toggle-quadratic"),
        includeCategoricalQuadraticCheckbox: document.getElementById("includeCategoricalQuadratic"),
        categoryLegendQuadratic: document.getElementById("category-legend-quadratic"),
        categoricalControlsQuadratic: document.getElementById("categorical-controls-quadratic"),
        B3_cat_quadratic: document.getElementById("B3_cat_quadratic"),
        B3_cat_quadratic_num: document.getElementById("B3_cat_quadratic_num"),
        B3_cat_quadratic_display: document.getElementById("B3_cat_quadratic_display"),
        B4_cat_quadratic: document.getElementById("B4_cat_quadratic"),
        B4_cat_quadratic_num: document.getElementById("B4_cat_quadratic_num"),
        B4_cat_quadratic_display: document.getElementById("B4_cat_quadratic_display")
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
        if (sliderId.includes("B2_quadratic")) {
            // Quadratic term needs more precision
            display.textContent = value.toFixed(6);
        } else if (sliderId.includes("B1")) {
            display.textContent = value.toFixed(2);
        } else if (sliderId.includes("_cat_")) {
            // Categorical shifts are integers
            display.textContent = value.toFixed(0);
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

    /**
     * Load scenario data from a CSV file
     * @param {string} csvPath - Path to the CSV file
     * @param {boolean} hasCategory - Whether the CSV includes a category column
     */
    function loadScenarioCSV(csvPath, hasCategory) {
        fetch(csvPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                const x = [];
                const y = [];
                const category = [];
                let lines = text.split("\n").filter(line => line.trim() !== "");
                
                // Skip header
                if (lines[0].toLowerCase().includes("x")) {
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
                            if (hasCategory && parts.length >= 3) {
                                category.push(parseInt(parts[2], 10));
                            }
                        }
                    }
                });
                
                data = { x, y };
                if (hasCategory && category.length > 0) {
                    data.category = category;
                }
                
                // Update y range
                yMin = Math.min(...data.y) - 50;
                yMax = Math.max(...data.y) + 50;
                
                // Calculate optimal MAEs for this scenario
                calculateOptimalMAEs();
                
                // Reset parameters and update
                resetParameters();
                updatePlots();
            })
            .catch(error => {
                console.error("Error loading scenario CSV:", error);
                elements.linearPlot.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: #dc2626;">
                        <p><strong>Error loading scenario data</strong></p>
                        <p>Could not load ${csvPath}</p>
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

    // Default parameter ranges (used for most scenarios)
    const defaultParamRanges = {
        B0: { min: -200, max: 400 },
        B1: { min: -0.5, max: 2.0, step: 0.01 },
        B2_quad: { min: -0.002, max: 0.002, step: 0.000001 },
        B_cat: { min: -150, max: 150, step: 1 }
    };
    
    /**
     * Update parameter slider ranges for a scenario
     */
    function updateParameterRanges(ranges) {
        const useRanges = ranges || defaultParamRanges;
        
        // Update B0 sliders (linear and quadratic)
        if (useRanges.B0) {
            ['B0_linear', 'B0_quadratic'].forEach(id => {
                const slider = document.getElementById(id);
                const numInput = document.getElementById(id + '_num');
                if (slider) {
                    slider.min = useRanges.B0.min;
                    slider.max = useRanges.B0.max;
                    slider.step = useRanges.B0.step || 1;
                }
                if (numInput) {
                    numInput.min = useRanges.B0.min;
                    numInput.max = useRanges.B0.max;
                    numInput.step = useRanges.B0.step || 1;
                }
            });
        }
        
        // Update B1 sliders (linear and quadratic)
        if (useRanges.B1) {
            ['B1_linear', 'B1_quadratic'].forEach(id => {
                const slider = document.getElementById(id);
                const numInput = document.getElementById(id + '_num');
                if (slider) {
                    slider.min = useRanges.B1.min;
                    slider.max = useRanges.B1.max;
                    slider.step = useRanges.B1.step || 0.01;
                }
                if (numInput) {
                    numInput.min = useRanges.B1.min;
                    numInput.max = useRanges.B1.max;
                    numInput.step = useRanges.B1.step || 0.01;
                }
            });
        }
        
        // Update B2 slider (quadratic only)
        if (useRanges.B2_quad) {
            const slider = document.getElementById('B2_quadratic');
            const numInput = document.getElementById('B2_quadratic_num');
            if (slider) {
                slider.min = useRanges.B2_quad.min;
                slider.max = useRanges.B2_quad.max;
                slider.step = useRanges.B2_quad.step || 0.000001;
            }
            if (numInput) {
                numInput.min = useRanges.B2_quad.min;
                numInput.max = useRanges.B2_quad.max;
                numInput.step = useRanges.B2_quad.step || 0.000001;
            }
        }
        
        // Update categorical shift sliders
        const catRange = useRanges.B_cat || defaultParamRanges.B_cat;
        ['B2_cat_linear', 'B3_cat_linear', 'B3_cat_quadratic', 'B4_cat_quadratic'].forEach(id => {
            const slider = document.getElementById(id);
            const numInput = document.getElementById(id + '_num');
            if (slider) {
                slider.min = catRange.min;
                slider.max = catRange.max;
                slider.step = catRange.step || 1;
            }
            if (numInput) {
                numInput.min = catRange.min;
                numInput.max = catRange.max;
                numInput.step = catRange.step || 1;
            }
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
            
            // Reset categorical state
            hasCategoricalData = false;
            includeCategoricalLinear = false;
            includeCategoricalQuadratic = false;
            elements.categoricalToggleLinear.style.display = 'none';
            elements.categoricalToggleQuadratic.style.display = 'none';
            elements.categoricalControlsLinear.style.display = 'none';
            elements.categoricalControlsQuadratic.style.display = 'none';
            
            // Clear category legends
            elements.categoryLegendLinear.innerHTML = '';
            elements.categoryLegendQuadratic.innerHTML = '';
            
            // Reset slider ranges to defaults
            updateParameterRanges(null);
            
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
        
        // Update parameter slider ranges if scenario has custom ranges
        updateParameterRanges(scenario.paramRanges);
        
        // Handle categorical scenario
        hasCategoricalData = scenario.hasCategorical || false;
        includeCategoricalLinear = false;
        includeCategoricalQuadratic = false;
        
        if (hasCategoricalData) {
            categoryLabels = scenario.categoryLabels || [];
            categoryColors = scenario.categoryColors || ['#3b82f6', '#f59e0b', '#10b981'];
            categorySymbols = scenario.categorySymbols || ['circle', 'diamond', 'square'];
            
            // Show categorical toggles
            elements.categoricalToggleLinear.style.display = 'block';
            elements.categoricalToggleQuadratic.style.display = 'block';
            
            // Reset checkboxes
            elements.includeCategoricalLinearCheckbox.checked = false;
            elements.includeCategoricalQuadraticCheckbox.checked = false;
            
            // Hide categorical controls (user hasn't enabled yet)
            elements.categoricalControlsLinear.style.display = 'none';
            elements.categoricalControlsQuadratic.style.display = 'none';
            
            // Build legend (always shown for categorical scenarios)
            buildCategoryLegend();
        } else {
            // Hide categorical toggles
            elements.categoricalToggleLinear.style.display = 'none';
            elements.categoricalToggleQuadratic.style.display = 'none';
            elements.categoricalControlsLinear.style.display = 'none';
            elements.categoricalControlsQuadratic.style.display = 'none';
            
            // Clear legends for non-categorical scenario
            elements.categoryLegendLinear.innerHTML = '';
            elements.categoryLegendQuadratic.innerHTML = '';
        }
        
        // Render scenario description
        elements.scenarioDescription.innerHTML = scenario.description();
        elements.scenarioDownload.disabled = false;
        
        // Load scenario data from CSV file
        loadScenarioCSV(scenario.csvFile, scenario.hasCategorical || false);
    }
    
    /**
     * Build category legend HTML
     */
    function buildCategoryLegend() {
        const legendHTML = categoryLabels.map((label, i) => `
            <span class="category-legend-item">
                <span class="category-legend-symbol ${categorySymbols[i]}" style="background-color: ${categoryColors[i]}; border-color: ${categoryColors[i]};"></span>
                ${label}
            </span>
        `).join('');
        
        elements.categoryLegendLinear.innerHTML = legendHTML;
        elements.categoryLegendQuadratic.innerHTML = legendHTML;
    }
    
    /**
     * Handle categorical toggle change for linear model
     */
    function handleCategoricalToggleLinear() {
        includeCategoricalLinear = elements.includeCategoricalLinearCheckbox.checked;
        elements.categoricalControlsLinear.style.display = includeCategoricalLinear ? 'grid' : 'none';
        
        // Recalculate optimal MAE
        calculateOptimalMAEs();
        updatePlots();
    }
    
    /**
     * Handle categorical toggle change for quadratic model
     */
    function handleCategoricalToggleQuadratic() {
        includeCategoricalQuadratic = elements.includeCategoricalQuadraticCheckbox.checked;
        elements.categoricalControlsQuadratic.style.display = includeCategoricalQuadratic ? 'grid' : 'none';
        
        // Recalculate optimal MAE
        calculateOptimalMAEs();
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
        
        // Set categorical defaults if applicable
        if (hasCategoricalData && data.category) {
            // Estimate reasonable shifts from data
            const catMeans = [0, 0, 0];
            const catCounts = [0, 0, 0];
            for (let i = 0; i < data.y.length; i++) {
                catMeans[data.category[i]] += data.y[i];
                catCounts[data.category[i]]++;
            }
            for (let c = 0; c < 3; c++) {
                catMeans[c] = catCounts[c] > 0 ? catMeans[c] / catCounts[c] : 0;
            }
            
            // Set initial shifts (rough estimates)
            const shift2 = Math.round(catMeans[1] - catMeans[0]);
            const shift3 = Math.round(catMeans[2] - catMeans[0]);
            
            setParameter("B2_cat_linear", shift2);
            setParameter("B3_cat_linear", shift3);
            setParameter("B3_cat_quadratic", shift2);
            setParameter("B4_cat_quadratic", shift3);
        }
        
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
        
        let header = currentScenario 
            ? `${currentScenario.xLabel.replace(/[()$]/g, '')},${currentScenario.yLabel.replace(/[()$]/g, '')}`
            : "X,Y";
        
        // Add category column if present
        if (data.category && categoryLabels.length > 0) {
            header += ",Segment";
        }
        
        let csv = header + "\n";
        for (let i = 0; i < data.x.length; i++) {
            let row = `${data.x[i]},${data.y[i]}`;
            if (data.category && categoryLabels.length > 0) {
                row += `,${categoryLabels[data.category[i]]}`;
            }
            csv += row + "\n";
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
        const params = {
            B0_linear: parseFloat(elements.B0_linear_num.value) || 0,
            B1_linear: parseFloat(elements.B1_linear_num.value) || 0,
            B0_quadratic: parseFloat(elements.B0_quadratic_num.value) || 0,
            B1_quadratic: parseFloat(elements.B1_quadratic_num.value) || 0,
            B2_quadratic: parseFloat(elements.B2_quadratic_num.value) || 0
        };
        
        // Add categorical parameters if available
        if (hasCategoricalData) {
            params.B2_cat_linear = parseFloat(elements.B2_cat_linear_num?.value) || 0;
            params.B3_cat_linear = parseFloat(elements.B3_cat_linear_num?.value) || 0;
            params.B3_cat_quadratic = parseFloat(elements.B3_cat_quadratic_num?.value) || 0;
            params.B4_cat_quadratic = parseFloat(elements.B4_cat_quadratic_num?.value) || 0;
        }
        
        return params;
    }

    /**
     * Generate predictions - basic linear
     */
    function predictLinear(x, B0, B1) {
        return x.map(xi => B0 + B1 * xi);
    }
    
    /**
     * Generate predictions - linear with categorical
     * categories: array of category indices (0, 1, 2)
     * B2_cat: shift for category 1 (Medium)
     * B3_cat: shift for category 2 (Large)
     */
    function predictLinearCategorical(x, categories, B0, B1, B2_cat, B3_cat) {
        return x.map((xi, i) => {
            const catShift = categories[i] === 1 ? B2_cat : (categories[i] === 2 ? B3_cat : 0);
            return B0 + B1 * xi + catShift;
        });
    }

    function predictQuadratic(x, B0, B1, B2) {
        return x.map(xi => B0 + B1 * xi + B2 * Math.pow(xi, 2));
    }
    
    /**
     * Generate predictions - quadratic with categorical
     * categories: array of category indices (0, 1, 2)
     * B3_cat: shift for category 1 (Medium)
     * B4_cat: shift for category 2 (Large)
     */
    function predictQuadraticCategorical(x, categories, B0, B1, B2, B3_cat, B4_cat) {
        return x.map((xi, i) => {
            const catShift = categories[i] === 1 ? B3_cat : (categories[i] === 2 ? B4_cat : 0);
            return B0 + B1 * xi + B2 * Math.pow(xi, 2) + catShift;
        });
    }

    // ===== Optimal Parameter Calculation (True L1 / MAE Minimization) =====
    
    /**
     * Nelder-Mead Simplex Optimizer
     * Minimizes an objective function without requiring derivatives
     * Well-suited for L1 (MAE) optimization which is non-differentiable
     * 
     * @param {Function} objectiveFn - Function to minimize, takes array of params
     * @param {Array} initialParams - Starting point
     * @param {Object} options - Optional settings
     * @returns {Object} { params, value } - Optimal parameters and minimum value
     */
    function nelderMead(objectiveFn, initialParams, options = {}) {
        const maxIterations = options.maxIterations || 1000;
        const tolerance = options.tolerance || 1e-8;
        const alpha = 1.0;   // Reflection
        const gamma = 2.0;   // Expansion
        const rho = 0.5;     // Contraction
        const sigma = 0.5;   // Shrink
        
        const n = initialParams.length;
        
        // Initialize simplex with n+1 vertices
        let simplex = [];
        simplex.push({ params: [...initialParams], value: objectiveFn(initialParams) });
        
        // Create additional vertices by perturbing each dimension
        for (let i = 0; i < n; i++) {
            const vertex = [...initialParams];
            // Use appropriate step size based on parameter magnitude
            const step = Math.abs(initialParams[i]) > 1e-6 ? initialParams[i] * 0.1 : 0.1;
            vertex[i] += step;
            simplex.push({ params: vertex, value: objectiveFn(vertex) });
        }
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Sort simplex by objective value (ascending)
            simplex.sort((a, b) => a.value - b.value);
            
            const best = simplex[0];
            const worst = simplex[n];
            const secondWorst = simplex[n - 1];
            
            // Check convergence
            const range = worst.value - best.value;
            if (range < tolerance) {
                return { params: best.params, value: best.value };
            }
            
            // Calculate centroid of all points except worst
            const centroid = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    centroid[j] += simplex[i].params[j];
                }
            }
            for (let j = 0; j < n; j++) {
                centroid[j] /= n;
            }
            
            // Reflection
            const reflected = centroid.map((c, j) => c + alpha * (c - worst.params[j]));
            const reflectedValue = objectiveFn(reflected);
            
            if (reflectedValue >= best.value && reflectedValue < secondWorst.value) {
                // Accept reflection
                simplex[n] = { params: reflected, value: reflectedValue };
                continue;
            }
            
            if (reflectedValue < best.value) {
                // Try expansion
                const expanded = centroid.map((c, j) => c + gamma * (reflected[j] - c));
                const expandedValue = objectiveFn(expanded);
                
                if (expandedValue < reflectedValue) {
                    simplex[n] = { params: expanded, value: expandedValue };
                } else {
                    simplex[n] = { params: reflected, value: reflectedValue };
                }
                continue;
            }
            
            // Contraction
            const contracted = centroid.map((c, j) => c + rho * (worst.params[j] - c));
            const contractedValue = objectiveFn(contracted);
            
            if (contractedValue < worst.value) {
                simplex[n] = { params: contracted, value: contractedValue };
                continue;
            }
            
            // Shrink
            for (let i = 1; i <= n; i++) {
                for (let j = 0; j < n; j++) {
                    simplex[i].params[j] = best.params[j] + sigma * (simplex[i].params[j] - best.params[j]);
                }
                simplex[i].value = objectiveFn(simplex[i].params);
            }
        }
        
        // Return best found
        simplex.sort((a, b) => a.value - b.value);
        return { params: simplex[0].params, value: simplex[0].value };
    }

    /**
     * Calculate optimal linear regression parameters using L1 (MAE) minimization
     * Uses Nelder-Mead optimization to find true MAE-minimizing parameters
     * Returns { B0, B1, mae }
     */
    function calculateOptimalLinear(xData, yData) {
        const n = xData.length;
        if (n === 0) return null;
        
        // Get OLS solution as starting point (good initial guess)
        const xMean = xData.reduce((a, b) => a + b, 0) / n;
        const yMean = yData.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (xData[i] - xMean) * (yData[i] - yMean);
            denominator += Math.pow(xData[i] - xMean, 2);
        }
        
        const B1_ols = denominator !== 0 ? numerator / denominator : 0;
        const B0_ols = yMean - B1_ols * xMean;
        
        // Objective function: MAE
        const objective = (params) => {
            const [B0, B1] = params;
            const predicted = predictLinear(xData, B0, B1);
            return calculateMAE(yData, predicted);
        };
        
        // Optimize using Nelder-Mead starting from OLS solution
        const result = nelderMead(objective, [B0_ols, B1_ols], {
            maxIterations: 2000,
            tolerance: 1e-10
        });
        
        const [B0, B1] = result.params;
        return { B0, B1, mae: result.value };
    }

    /**
     * Calculate optimal quadratic regression parameters using L1 (MAE) minimization
     * Uses Nelder-Mead optimization to find true MAE-minimizing parameters
     * Returns { B0, B1, B2, mae }
     */
    function calculateOptimalQuadratic(xData, yData) {
        const n = xData.length;
        if (n < 3) return null;
        
        // Get OLS solution as starting point
        // Build normal equations for quadratic regression
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
        
        const A = [
            [n, sumX, sumX2],
            [sumX, sumX2, sumX3],
            [sumX2, sumX3, sumX4]
        ];
        const b = [sumY, sumXY, sumX2Y];
        
        const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
                  - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
                  + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
        
        let B0_ols, B1_ols, B2_ols;
        
        if (Math.abs(det) < 1e-10) {
            // Matrix is singular, use linear starting point
            const linear = calculateOptimalLinear(xData, yData);
            B0_ols = linear.B0;
            B1_ols = linear.B1;
            B2_ols = 0;
        } else {
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
            
            B0_ols = inv[0][0] * b[0] + inv[0][1] * b[1] + inv[0][2] * b[2];
            B1_ols = inv[1][0] * b[0] + inv[1][1] * b[1] + inv[1][2] * b[2];
            B2_ols = inv[2][0] * b[0] + inv[2][1] * b[1] + inv[2][2] * b[2];
        }
        
        // Objective function: MAE
        const objective = (params) => {
            const [B0, B1, B2] = params;
            const predicted = predictQuadratic(xData, B0, B1, B2);
            return calculateMAE(yData, predicted);
        };
        
        // Optimize using Nelder-Mead starting from OLS solution
        const result = nelderMead(objective, [B0_ols, B1_ols, B2_ols], {
            maxIterations: 3000,
            tolerance: 1e-10
        });
        
        const [B0, B1, B2] = result.params;
        return { B0, B1, B2, mae: result.value };
    }
    
    /**
     * Calculate optimal linear + categorical parameters using L1 (MAE) minimization
     * 4 parameters: B0 (intercept), B1 (slope), B2_cat (Medium shift), B3_cat (Large shift)
     */
    function calculateOptimalLinearCategorical(xData, yData, categories) {
        const n = xData.length;
        if (n === 0) return null;
        
        // Get non-categorical OLS as starting point
        const linearOLS = calculateOptimalLinear(xData, yData);
        
        // Estimate category means for initial shifts
        const catMeans = [0, 0, 0];
        const catCounts = [0, 0, 0];
        for (let i = 0; i < n; i++) {
            catMeans[categories[i]] += yData[i];
            catCounts[categories[i]]++;
        }
        for (let c = 0; c < 3; c++) {
            catMeans[c] = catCounts[c] > 0 ? catMeans[c] / catCounts[c] : 0;
        }
        
        const B2_cat_init = catMeans[1] - catMeans[0];
        const B3_cat_init = catMeans[2] - catMeans[0];
        
        // Objective function: MAE with categorical
        const objective = (params) => {
            const [B0, B1, B2_cat, B3_cat] = params;
            const predicted = predictLinearCategorical(xData, categories, B0, B1, B2_cat, B3_cat);
            return calculateMAE(yData, predicted);
        };
        
        // Optimize
        const result = nelderMead(objective, [linearOLS.B0, linearOLS.B1, B2_cat_init, B3_cat_init], {
            maxIterations: 3000,
            tolerance: 1e-10
        });
        
        const [B0, B1, B2_cat, B3_cat] = result.params;
        return { B0, B1, B2_cat, B3_cat, mae: result.value };
    }
    
    /**
     * Calculate optimal quadratic + categorical parameters using L1 (MAE) minimization
     * 5 parameters: B0, B1, B2 (quadratic), B3_cat (Medium shift), B4_cat (Large shift)
     */
    function calculateOptimalQuadraticCategorical(xData, yData, categories) {
        const n = xData.length;
        if (n < 5) return null;
        
        // Get non-categorical quadratic OLS as starting point
        const quadOLS = calculateOptimalQuadratic(xData, yData);
        
        // Estimate category means for initial shifts
        const catMeans = [0, 0, 0];
        const catCounts = [0, 0, 0];
        for (let i = 0; i < n; i++) {
            catMeans[categories[i]] += yData[i];
            catCounts[categories[i]]++;
        }
        for (let c = 0; c < 3; c++) {
            catMeans[c] = catCounts[c] > 0 ? catMeans[c] / catCounts[c] : 0;
        }
        
        const B3_cat_init = catMeans[1] - catMeans[0];
        const B4_cat_init = catMeans[2] - catMeans[0];
        
        // Objective function: MAE with categorical
        const objective = (params) => {
            const [B0, B1, B2, B3_cat, B4_cat] = params;
            const predicted = predictQuadraticCategorical(xData, categories, B0, B1, B2, B3_cat, B4_cat);
            return calculateMAE(yData, predicted);
        };
        
        // Optimize
        const result = nelderMead(objective, [quadOLS.B0, quadOLS.B1, quadOLS.B2, B3_cat_init, B4_cat_init], {
            maxIterations: 4000,
            tolerance: 1e-10
        });
        
        const [B0, B1, B2, B3_cat, B4_cat] = result.params;
        return { B0, B1, B2, B3_cat, B4_cat, mae: result.value };
    }

    /**
     * Calculate and store optimal MAEs for current data
     */
    function calculateOptimalMAEs() {
        if (!data) return;
        
        // Calculate based on whether categorical is enabled
        if (hasCategoricalData && includeCategoricalLinear && data.category) {
            optimalParamsLinear = calculateOptimalLinearCategorical(data.x, data.y, data.category);
        } else {
            optimalParamsLinear = calculateOptimalLinear(data.x, data.y);
        }
        
        if (hasCategoricalData && includeCategoricalQuadratic && data.category) {
            optimalParamsQuadratic = calculateOptimalQuadraticCategorical(data.x, data.y, data.category);
        } else {
            optimalParamsQuadratic = calculateOptimalQuadratic(data.x, data.y);
        }
        
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
     * Build scatter traces for categorical data (colored dots by segment)
     * Used regardless of whether categorical toggle is on/off
     */
    function buildCategoricalScatterTraces(data) {
        const traces = [];
        const symbolMap = { 'circle': 'circle', 'diamond': 'diamond', 'square': 'square' };
        
        // Create scatter traces for each category
        for (let cat = 0; cat < 3; cat++) {
            const catIndices = data.category.map((c, i) => c === cat ? i : -1).filter(i => i >= 0);
            const catX = catIndices.map(i => data.x[i]);
            const catY = catIndices.map(i => data.y[i]);
            
            traces.push({
                x: catX,
                y: catY,
                mode: "markers",
                type: "scatter",
                name: categoryLabels[cat],
                marker: {
                    color: categoryColors[cat],
                    size: 10,
                    opacity: 0.85,
                    symbol: symbolMap[categorySymbols[cat]] || 'circle'
                },
                hovertemplate: `${categoryLabels[cat]}<br>${xLabel}: %{x:,.1f}<br>${yLabel}: $%{y:,.0f}K<extra></extra>`
            });
        }
        
        return traces;
    }
    
    /**
     * Build traces for categorical plotting
     * Creates colored/shaped scatter points and multiple regression lines
     */
    function buildCategoricalTraces(data, modelType, params, xFit, xMin, xMax) {
        // Start with the scatter traces (colored dots)
        const traces = buildCategoricalScatterTraces(data);
        const symbolMap = { 'circle': 'circle', 'diamond': 'diamond', 'square': 'square' };
        
        // Create regression lines for each category
        for (let cat = 0; cat < 3; cat++) {
            let yFit;
            
            if (modelType === 'linear') {
                const catShift = cat === 1 ? params.B2_cat_linear : (cat === 2 ? params.B3_cat_linear : 0);
                yFit = xFit.map(x => params.B0_linear + params.B1_linear * x + catShift);
            } else {
                const catShift = cat === 1 ? params.B3_cat_quadratic : (cat === 2 ? params.B4_cat_quadratic : 0);
                yFit = xFit.map(x => params.B0_quadratic + params.B1_quadratic * x + params.B2_quadratic * x * x + catShift);
            }
            
            traces.push({
                x: xFit,
                y: yFit,
                mode: "lines",
                type: "scatter",
                name: `${categoryLabels[cat]} Fit`,
                line: {
                    color: categoryColors[cat],
                    width: 2.5,
                    dash: "solid"
                },
                hoverinfo: "skip",
                showlegend: false
            });
        }
        
        return traces;
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
        let yLinearPred;
        if (hasCategoricalData && includeCategoricalLinear && data.category) {
            yLinearPred = predictLinearCategorical(data.x, data.category, params.B0_linear, params.B1_linear, params.B2_cat_linear, params.B3_cat_linear);
        } else {
            yLinearPred = predictLinear(data.x, params.B0_linear, params.B1_linear);
        }
        currentMAELinear = calculateMAE(data.y, yLinearPred);
        
        // Update equation display
        if (hasCategoricalData && includeCategoricalLinear) {
            elements.equation_linear.innerHTML = `
                <strong>Model:</strong> ${yShort.toUpperCase()} = 
                <span class="dynamic-value">${params.B0_linear.toFixed(1)}</span> + 
                <span class="dynamic-value">${params.B1_linear.toFixed(2)}</span> × ${xShort} + 
                <span class="dynamic-value">${params.B2_cat_linear.toFixed(0)}</span> × Medium + 
                <span class="dynamic-value">${params.B3_cat_linear.toFixed(0)}</span> × Large
            `;
        } else {
            elements.equation_linear.innerHTML = `
                <strong>Model:</strong> ${yShort.toUpperCase()} = 
                <span class="dynamic-value">${params.B0_linear.toFixed(1)}</span> + 
                <span class="dynamic-value">${params.B1_linear.toFixed(2)}</span> × ${xShort}
            `;
        }
        
        // Update MAE display
        elements.mae_linear.innerHTML = `
            <span class="mae-label">MAE =</span>
            <span class="mae-value">${currentMAELinear.toFixed(2)}</span>
        `;
        
        // Build traces for linear plot
        let linearTraces;
        if (hasCategoricalData && includeCategoricalLinear && data.category) {
            // Toggle ON: colored dots + 3 parallel lines
            linearTraces = buildCategoricalTraces(data, 'linear', params, xFit, xMin, xMax);
        } else if (hasCategoricalData && data.category) {
            // Toggle OFF but categorical data: colored dots + SINGLE line
            const yLinearFit = predictLinear(xFit, params.B0_linear, params.B1_linear);
            linearTraces = buildCategoricalScatterTraces(data);
            linearTraces.push({
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
                hoverinfo: "skip",
                showlegend: false
            });
        } else {
            // Non-categorical scenario: plain dots + single line
            const yLinearFit = predictLinear(xFit, params.B0_linear, params.B1_linear);
            linearTraces = [
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
        }
        
        const linearLayout = {
            ...getCommonLayout("Linear Model Fit"),
            shapes: createErrorLines(data.x, data.y, yLinearPred),
            showlegend: hasCategoricalData && data.category  // Show legend whenever categorical
        };
        
        Plotly.react(elements.linearPlot, linearTraces, linearLayout, {
            responsive: true,
            displayModeBar: false
        });
        
        // ===== Quadratic Model =====
        let yQuadPred;
        if (hasCategoricalData && includeCategoricalQuadratic && data.category) {
            yQuadPred = predictQuadraticCategorical(data.x, data.category, params.B0_quadratic, params.B1_quadratic, params.B2_quadratic, params.B3_cat_quadratic, params.B4_cat_quadratic);
        } else {
            yQuadPred = predictQuadratic(data.x, params.B0_quadratic, params.B1_quadratic, params.B2_quadratic);
        }
        currentMAEQuadratic = calculateMAE(data.y, yQuadPred);
        
        // Update equation display
        if (hasCategoricalData && includeCategoricalQuadratic) {
            elements.equation_quadratic.innerHTML = `
                <strong>Model:</strong> ${yShort.toUpperCase()} = 
                <span class="dynamic-value">${params.B0_quadratic.toFixed(1)}</span> + 
                <span class="dynamic-value">${params.B1_quadratic.toFixed(2)}</span> × ${xShort} + 
                <span class="dynamic-value">${params.B2_quadratic.toFixed(6)}</span> × ${xShort}² + 
                <span class="dynamic-value">${params.B3_cat_quadratic.toFixed(0)}</span> × Medium + 
                <span class="dynamic-value">${params.B4_cat_quadratic.toFixed(0)}</span> × Large
            `;
        } else {
            elements.equation_quadratic.innerHTML = `
                <strong>Model:</strong> ${yShort.toUpperCase()} = 
                <span class="dynamic-value">${params.B0_quadratic.toFixed(1)}</span> + 
                <span class="dynamic-value">${params.B1_quadratic.toFixed(2)}</span> × ${xShort} + 
                <span class="dynamic-value">${params.B2_quadratic.toFixed(6)}</span> × ${xShort}²
            `;
        }
        
        // Update MAE display
        elements.mae_quadratic.innerHTML = `
            <span class="mae-label">MAE =</span>
            <span class="mae-value">${currentMAEQuadratic.toFixed(2)}</span>
        `;
        
        // Build traces for quadratic plot
        let quadTraces;
        if (hasCategoricalData && includeCategoricalQuadratic && data.category) {
            // Toggle ON: colored dots + 3 parallel curves
            quadTraces = buildCategoricalTraces(data, 'quadratic', params, xFit, xMin, xMax);
        } else if (hasCategoricalData && data.category) {
            // Toggle OFF but categorical data: colored dots + SINGLE curve
            const yQuadFit = predictQuadratic(xFit, params.B0_quadratic, params.B1_quadratic, params.B2_quadratic);
            quadTraces = buildCategoricalScatterTraces(data);
            quadTraces.push({
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
                hoverinfo: "skip",
                showlegend: false
            });
        } else {
            // Non-categorical scenario: plain dots + single curve
            const yQuadFit = predictQuadratic(xFit, params.B0_quadratic, params.B1_quadratic, params.B2_quadratic);
            quadTraces = [
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
        }
        
        const quadLayout = {
            ...getCommonLayout("Quadratic Model Fit"),
            shapes: createErrorLines(data.x, data.y, yQuadPred),
            showlegend: hasCategoricalData && data.category  // Show legend whenever categorical
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
        // Only update engagement milestones - NOT logToolUsage (which creates DB records)
        // The engagement system will log once when milestones are reached
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
            // REMOVED: logToolUsage call that was creating a DB record every 500ms
            // The engagement tracking system handles logging via checkEngagementMilestones()
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
        
        // Categorical toggle controls
        if (elements.includeCategoricalLinearCheckbox) {
            elements.includeCategoricalLinearCheckbox.addEventListener("change", handleCategoricalToggleLinear);
        }
        if (elements.includeCategoricalQuadraticCheckbox) {
            elements.includeCategoricalQuadraticCheckbox.addEventListener("change", handleCategoricalToggleQuadratic);
        }
        
        // Categorical linear coefficient controls
        if (elements.B2_cat_linear) {
            elements.B2_cat_linear.addEventListener("input", () => syncControls("B2_cat_linear", "slider"));
            elements.B2_cat_linear_num.addEventListener("input", () => syncControls("B2_cat_linear", "number"));
        }
        if (elements.B3_cat_linear) {
            elements.B3_cat_linear.addEventListener("input", () => syncControls("B3_cat_linear", "slider"));
            elements.B3_cat_linear_num.addEventListener("input", () => syncControls("B3_cat_linear", "number"));
        }
        
        // Categorical quadratic coefficient controls
        if (elements.B3_cat_quadratic) {
            elements.B3_cat_quadratic.addEventListener("input", () => syncControls("B3_cat_quadratic", "slider"));
            elements.B3_cat_quadratic_num.addEventListener("input", () => syncControls("B3_cat_quadratic", "number"));
        }
        if (elements.B4_cat_quadratic) {
            elements.B4_cat_quadratic.addEventListener("input", () => syncControls("B4_cat_quadratic", "slider"));
            elements.B4_cat_quadratic_num.addEventListener("input", () => syncControls("B4_cat_quadratic", "number"));
        }
        
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
