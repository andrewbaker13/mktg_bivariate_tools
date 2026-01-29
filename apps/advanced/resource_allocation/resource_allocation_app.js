// Marketing Resource Allocation Optimizer
// Created: 2025-12-07

(function() {
  'use strict';

  // ============================================================================
  // CONSTANTS & CONFIGURATION
  // ============================================================================

  const CREATED_DATE = '2025-12-07';
  const TOOL_SLUG = 'resource-allocation';
  const MAX_UPLOAD_ROWS = 500;
  const MIN_DATA_POINTS = 3; // Minimum observations needed to fit models

  const MODEL_TYPES = {
    LINEAR: 'linear',
    LOG: 'log',
    POWER: 'power',
    QUADRATIC: 'quadratic',
    SQRT: 'sqrt',
    LOGISTIC: 'logistic',
    BOUNDED_LOG: 'bounded_log'
  };

  const MODEL_NAMES = {
    [MODEL_TYPES.LINEAR]: 'Linear',
    [MODEL_TYPES.LOG]: 'Logarithmic',
    [MODEL_TYPES.POWER]: 'Power',
    [MODEL_TYPES.QUADRATIC]: 'Quadratic',
    [MODEL_TYPES.SQRT]: 'Square Root',
    [MODEL_TYPES.LOGISTIC]: 'Logistic (S-curve)',
    [MODEL_TYPES.BOUNDED_LOG]: 'Bounded Logarithmic'
  };

  const OPTIMIZATION_METHODS = {
    GREEDY: 'greedy',
    NUMERICAL: 'numerical'  // Will use custom gradient-based optimizer
  };

  // Template CSV for download
  const DATA_TEMPLATE = [
    'resource_id,input,output',
    'Rep_A,5000,45000',
    'Rep_B,8000,62000',
    'Rep_C,3000,28000',
    'Rep_D,12000,89000',
    'Rep_E,6000,51000',
    'Rep_F,4000,35000',
    'Rep_G,10000,78000',
    'Rep_H,7000,58000'
  ].join('\r\n');

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  let pageLoadTime = Date.now();
  let hasSuccessfulRun = false;

  const state = {
    rawData: null,              // [{resource_id, input, output}, ...]
    fittedModels: null,         // {resource_id: {type, params, r2, aic, predict}}
    modelStrategy: 'auto-unified',
    manualModelType: MODEL_TYPES.LINEAR,
    allowExtrapolation: true,   // Whether to allow allocations beyond historical max
    chartAxisRanges: null,      // Store global axis ranges for response curves
    constraints: {
      totalBudget: 100000,
      minPerResource: 0,
      maxPerResource: Number.MAX_SAFE_INTEGER,
      integerConstraint: false,
      cardinalityEnabled: false,
      minResources: 0,
      maxResources: 999,
      equityEnabled: false,
      equityRatio: 10,
      baselineEnabled: false,
      baselineDeviation: 50,
      ceilingEnabled: false,
      outputCeiling: null,
      variableCostPerUnit: 1.0, // Cost per input unit (1.0 = inputs are dollars)
      fixedCostPerResource: 0   // Fixed cost for activating each resource
    },
    optimizationResult: null,   // {allocations, totalOutput, method, diagnostics}
    savedScenarios: [],
    activeScenario: null,
    scenarioManifest: []
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    updateTimestamps();
    setupEventListeners();
    setupDropzone();
    loadScenarioManifest();
    
    // Initialize engagement tracking
    if (typeof initEngagementTracking === 'function') {
        initEngagementTracking(TOOL_SLUG);
    }
    console.log('Resource Allocation Optimizer initialized');
  }

  function updateTimestamps() {
    const createdEl = document.getElementById('created-date');
    const updatedEl = document.getElementById('last-updated');
    if (createdEl) createdEl.textContent = CREATED_DATE;
    if (updatedEl) {
      const now = new Date();
      updatedEl.textContent = now.toISOString().split('T')[0];
    }
  }

  function setupEventListeners() {
    // Template download
    const templateBtn = document.getElementById('template-download');
    if (templateBtn) {
      templateBtn.addEventListener('click', () => downloadCSV('resource_allocation_template.csv', DATA_TEMPLATE));
    }

    // Model strategy selection
    document.querySelectorAll('input[name="model-strategy"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.modelStrategy = e.target.value;
        const manualSelect = document.getElementById('manual-model-select');
        if (manualSelect) {
          manualSelect.classList.toggle('hidden', e.target.value !== 'manual');
        }
      });
    });

    // Manual model type selection
    const modelTypeSelect = document.getElementById('model-type-select');
    if (modelTypeSelect) {
      modelTypeSelect.addEventListener('change', (e) => {
        state.manualModelType = e.target.value;
        // Show/hide bounded log ceiling input
        const boundedLogCeiling = document.getElementById('bounded-log-ceiling');
        if (boundedLogCeiling) {
          boundedLogCeiling.classList.toggle('hidden', e.target.value !== 'bounded_log');
        }
      });
    }

    // Fit models button
    const fitModelsBtn = document.getElementById('fit-models-btn');
    if (fitModelsBtn) {
      fitModelsBtn.addEventListener('click', handleFitModels);
    }

    // Constraint inputs
    const constraintInputs = [
      'total-budget', 'min-per-resource', 'max-per-resource',
      'integer-constraint', 'cardinality-constraint', 'equity-constraint', 'baseline-constraint',
      'min-resources', 'max-resources', 'equity-ratio', 'baseline-deviation',
      'output-ceiling', 'variable-cost-per-unit', 'fixed-cost-per-resource'
    ];
    constraintInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', updateConstraints);
      }
    });
    
    // Extrapolation checkbox
    const extrapolationCheck = document.getElementById('allow-extrapolation');
    if (extrapolationCheck) {
      extrapolationCheck.addEventListener('change', (e) => {
        state.allowExtrapolation = e.target.checked;
      });
    }

    // Checkbox toggles for advanced constraints
    const cardinalityCheck = document.getElementById('cardinality-constraint');
    const equityCheck = document.getElementById('equity-constraint');
    const baselineCheck = document.getElementById('baseline-constraint');

    if (cardinalityCheck) {
      cardinalityCheck.addEventListener('change', (e) => {
        const inputs = document.getElementById('cardinality-inputs');
        if (inputs) inputs.classList.toggle('hidden', !e.target.checked);
      });
    }

    if (equityCheck) {
      equityCheck.addEventListener('change', (e) => {
        const inputs = document.getElementById('equity-inputs');
        if (inputs) inputs.classList.toggle('hidden', !e.target.checked);
      });
    }

    if (baselineCheck) {
      baselineCheck.addEventListener('change', (e) => {
        const inputs = document.getElementById('baseline-inputs');
        if (inputs) inputs.classList.toggle('hidden', !e.target.checked);
      });
    }

    // Optimize button
    const optimizeBtn = document.getElementById('optimize-btn');
    if (optimizeBtn) {
      optimizeBtn.addEventListener('click', handleOptimize);
    }
    
    // Reset all button
    const resetAllBtn = document.getElementById('reset-all-btn');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', handleResetAll);
    }

    // Save scenario
    const saveScenarioBtn = document.getElementById('save-scenario-btn');
    if (saveScenarioBtn) {
      saveScenarioBtn.addEventListener('click', handleSaveScenario);
    }

    // Export allocation
    const exportBtn = document.getElementById('export-allocation-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', handleExportAllocation);
    }

    // Sensitivity analysis
    const sensitivityBtn = document.getElementById('run-sensitivity-btn');
    if (sensitivityBtn) {
      sensitivityBtn.addEventListener('click', handleSensitivityAnalysis);
    }

    // Scenario comparison
    const compareBtn = document.getElementById('compare-scenarios-btn');
    if (compareBtn) {
      compareBtn.addEventListener('click', handleCompareScenarios);
    }

    // Visual output settings - re-render charts when changed
    const showHistoricalCheck = document.getElementById('show-historical');
    if (showHistoricalCheck) {
      showHistoricalCheck.addEventListener('change', () => {
        if (state.optimizationResult) {
          displayCharts(state.optimizationResult);
        }
      });
    }

    const chartLimitInput = document.getElementById('chart-resources-limit');
    if (chartLimitInput) {
      chartLimitInput.addEventListener('change', () => {
        if (state.optimizationResult) {
          displayCharts(state.optimizationResult);
        }
      });
    }
  }

  function setupDropzone() {
    if (typeof UIUtils !== 'undefined' && UIUtils.initDropzone) {
      UIUtils.initDropzone({
        dropzoneId: 'raw-dropzone',
        inputId: 'raw-input',
        browseId: 'raw-browse',
        onFile: handleFileUpload,
        onError: (msg) => setUploadStatus(msg, 'error')
      });
    }
  }

  // ============================================================================
  // FILE UPLOAD & PARSING
  // ============================================================================

  function handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        parseUploadedData(e.target.result);
      } catch (error) {
        setUploadStatus(error.message, 'error');
      }
    };
    reader.onerror = () => setUploadStatus('Unable to read file', 'error');
    reader.readAsText(file);
  }

  function parseUploadedData(text) {
    if (!text || !text.trim()) {
      throw new Error('File is empty');
    }

    const lines = text.trim().split(/\r\n|\n|\r/).filter(l => l.trim());
    if (lines.length < 2) {
      throw new Error('File needs at least a header row and one data row');
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

    const resourceIdx = headers.findIndex(h => h.includes('resource') || h.includes('id') || h.includes('name'));
    const inputIdx = headers.findIndex(h => h.includes('input') || h.includes('budget') || h.includes('spend'));
    const outputIdx = headers.findIndex(h => h.includes('output') || h.includes('sales') || h.includes('revenue') || h.includes('conversion'));

    if (resourceIdx === -1 || inputIdx === -1 || outputIdx === -1) {
      throw new Error('File must contain columns for resource_id, input, and output');
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim());
      if (parts.length !== headers.length) continue;

      const resourceId = parts[resourceIdx];
      const input = parseFloat(parts[inputIdx]);
      const output = parseFloat(parts[outputIdx]);

      if (!resourceId || !isFinite(input) || !isFinite(output)) continue;
      if (input < 0 || output < 0) continue;

      data.push({ resource_id: resourceId, input, output });
    }

    if (data.length === 0) {
      throw new Error('No valid data rows found');
    }

    if (data.length > MAX_UPLOAD_ROWS) {
      throw new Error(`Too many resources. Maximum ${MAX_UPLOAD_ROWS} supported.`);
    }

    // Count unique resources
    const uniqueResources = new Set(data.map(d => d.resource_id));
    const numResources = uniqueResources.size;
    const numObservations = data.length;
    const resourceList = Array.from(uniqueResources).sort();

    state.rawData = data;
    
    const resourceNamesDisplay = resourceList.length <= 10 
      ? `<br><strong>Resources:</strong> ${resourceList.join(', ')}`
      : `<br><strong>Resources:</strong> ${resourceList.slice(0, 10).join(', ')} ... and ${resourceList.length - 10} more`;
    
    setUploadStatus(
      `✓ Data loaded: ${numObservations} observation${numObservations !== 1 ? 's' : ''} across ${numResources} resource${numResources !== 1 ? 's' : ''}${resourceNamesDisplay}`, 
      'success'
    );
    showModelFittingCard();
  }

  function detectDelimiter(line) {
    const commas = (line.match(/,/g) || []).length;
    const tabs = (line.match(/\t/g) || []).length;
    return tabs > commas ? '\t' : ',';
  }

  function setUploadStatus(message, status = '') {
    const el = document.getElementById('upload-status');
    if (!el) return;
    el.textContent = message;
    el.className = 'upload-status';
    if (status) el.classList.add(status);
  }

  function showModelFittingCard() {
    const card = document.getElementById('model-fitting-card');
    if (card) card.classList.remove('hidden');
  }

  // ============================================================================
  // MODEL FITTING
  // ============================================================================

  function handleFitModels() {
    if (!state.rawData || state.rawData.length === 0) {
      setModelFitStatus('No data loaded. Please upload data first.', 'error');
      return;
    }

    // Validate bounded_log requires ceiling value
    if (state.modelStrategy === 'manual' && state.manualModelType === 'bounded_log') {
      const ceilingValue = parseFloat(document.getElementById('output-ceiling')?.value);
      if (!ceilingValue || ceilingValue <= 0) {
        setModelFitStatus('⚠️ Bounded Logarithmic model requires a known ceiling value. Please enter the maximum possible output.', 'error');
        return;
      }
    }

    try {
      const models = fitModelsToData();
      state.fittedModels = models;
      displayModelFitResults(models);
      showConstraintsCard();
      setModelFitStatus(`✓ Models fitted to ${Object.keys(models).length} resources`, 'success');
    } catch (error) {
      setModelFitStatus(error.message, 'error');
    }
  }

  function fitModelsToData() {
    const strategy = state.modelStrategy;
    const models = {};

    // Group data by resource_id
    const resourceGroups = {};
    state.rawData.forEach(row => {
      if (!resourceGroups[row.resource_id]) {
        resourceGroups[row.resource_id] = [];
      }
      resourceGroups[row.resource_id].push(row);
    });

    const resourceIds = Object.keys(resourceGroups);

    if (strategy === 'manual') {
      // Fit one model type to all resources
      resourceIds.forEach(id => {
        models[id] = fitSingleModel(
          resourceGroups[id],
          state.manualModelType
        );
      });
    } else if (strategy === 'auto-unified') {
      // Fit all model types to combined data, pick best
      const allModelFits = Object.values(MODEL_TYPES).map(type => {
        return fitSingleModel(state.rawData, type);
      });
      const bestModel = allModelFits.reduce((best, current) => 
        current.aic < best.aic ? current : best
      );

      // Apply best model to each resource individually
      resourceIds.forEach(id => {
        models[id] = fitSingleModel(resourceGroups[id], bestModel.type);
      });
    } else if (strategy === 'auto-individual') {
      // Fit all model types to each resource, pick best for each
      resourceIds.forEach(id => {
        const allModelFits = Object.values(MODEL_TYPES).map(type => {
          return fitSingleModel(resourceGroups[id], type);
        });
        models[id] = allModelFits.reduce((best, current) => 
          current.aic < best.aic ? current : best
        );
      });
    }

    return models;
  }

  function fitSingleModel(dataPoints, modelType) {
    // For single observation per resource, we can't fit complex models
    // Instead, we'll use simple scaling or make assumptions
    
    if (dataPoints.length === 1) {
      // Single data point - use linear approximation through origin or simple ratio
      const point = dataPoints[0];
      return createSimpleModel(point, modelType);
    }

    // Multiple observations - proper regression
    const X = dataPoints.map(d => d.input);
    const Y = dataPoints.map(d => d.output);

    switch (modelType) {
      case MODEL_TYPES.LINEAR:
        return fitLinear(X, Y);
      case MODEL_TYPES.LOG:
        return fitLog(X, Y);
      case MODEL_TYPES.POWER:
        return fitPower(X, Y);
      case MODEL_TYPES.QUADRATIC:
        return fitQuadratic(X, Y);
      case MODEL_TYPES.SQRT:
        return fitSqrt(X, Y);
      case MODEL_TYPES.LOGISTIC:
        return fitLogistic(X, Y);
      case MODEL_TYPES.BOUNDED_LOG:
        return fitBoundedLog(X, Y);
      default:
        return fitLinear(X, Y);
    }
  }

  function createSimpleModel(point, modelType) {
    // For single data points, create a model that passes through the point
    const { input, output } = point;
    const ratio = output / input;

    let params, predict;

    switch (modelType) {
      case MODEL_TYPES.LINEAR:
        // Y = ratio * X
        params = { a: 0, b: ratio };
        predict = (x) => ratio * x;
        break;
      case MODEL_TYPES.LOG:
        // Y = a + b*ln(X), fit to pass through point
        params = { a: output - ratio * Math.log(input), b: ratio };
        predict = (x) => params.a + params.b * Math.log(Math.max(x, 0.001));
        break;
      case MODEL_TYPES.POWER:
        // Y = a * X^b, assume b=1 (linear)
        params = { a: ratio, b: 1 };
        predict = (x) => ratio * x;
        break;
      case MODEL_TYPES.QUADRATIC:
        // Y = a + b*X, no quadratic term
        params = { a: 0, b: ratio, c: 0 };
        predict = (x) => ratio * x;
        break;
      case MODEL_TYPES.SQRT:
        // Y = a + b*sqrt(X)
        params = { a: output - ratio * Math.sqrt(input), b: ratio };
        predict = (x) => params.a + params.b * Math.sqrt(Math.max(x, 0));
        break;
      case MODEL_TYPES.LOGISTIC:
        // Y = L / (1 + e^(-k(X - X0))), assume linear for single point
        params = { L: output * 2, k: 0.001, X0: input };
        predict = (x) => params.L / (1 + Math.exp(-params.k * (x - params.X0)));
        break;
      case MODEL_TYPES.BOUNDED_LOG:
        // Y = ceiling - (ceiling - a) * e^(-b*X)
        const ceiling = state.constraints.outputCeiling || output * 2;
        params = { ceiling, a: 0, b: 0.001 };
        predict = (x) => ceiling - (ceiling - params.a) * Math.exp(-params.b * x);
        break;
      default:
        params = { a: 0, b: ratio };
        predict = (x) => ratio * x;
    }

    return {
      type: modelType,
      params,
      predict,
      r2: 1.0,  // Perfect fit for single point
      aic: 0,
      n: 1
    };
  }

  function fitLinear(X, Y) {
    const n = X.length;
    const sumX = X.reduce((a, b) => a + b, 0);
    const sumY = Y.reduce((a, b) => a + b, 0);
    const sumXY = X.reduce((sum, x, i) => sum + x * Y[i], 0);
    const sumX2 = X.reduce((sum, x) => sum + x * x, 0);

    const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const a = (sumY - b * sumX) / n;

    const predict = (x) => a + b * x;
    const r2 = calculateR2(Y, X.map(predict));
    const aic = calculateAIC(Y, X.map(predict), 2);

    return {
      type: MODEL_TYPES.LINEAR,
      params: { a, b },
      predict,
      r2,
      aic,
      n
    };
  }

  function fitLog(X, Y) {
    // Transform: Y = a + b*ln(X)
    const logX = X.map(x => Math.log(Math.max(x, 0.001)));
    const model = fitLinear(logX, Y);
    
    return {
      type: MODEL_TYPES.LOG,
      params: model.params,
      predict: (x) => model.params.a + model.params.b * Math.log(Math.max(x, 0.001)),
      r2: model.r2,
      aic: model.aic,
      n: X.length
    };
  }

  function fitPower(X, Y) {
    // Transform: ln(Y) = ln(a) + b*ln(X)
    // Filter out zeros
    const validIndices = X.map((x, i) => x > 0 && Y[i] > 0 ? i : -1).filter(i => i >= 0);
    if (validIndices.length < 2) {
      // Fallback to linear
      return fitLinear(X, Y);
    }

    const logX = validIndices.map(i => Math.log(X[i]));
    const logY = validIndices.map(i => Math.log(Y[i]));
    const linearFit = fitLinear(logX, logY);
    
    const a = Math.exp(linearFit.params.a);
    const b = linearFit.params.b;
    const predict = (x) => a * Math.pow(Math.max(x, 0.001), b);
    const r2 = calculateR2(Y, X.map(predict));
    const aic = calculateAIC(Y, X.map(predict), 2);

    return {
      type: MODEL_TYPES.POWER,
      params: { a, b },
      predict,
      r2,
      aic,
      n: X.length
    };
  }

  function fitQuadratic(X, Y) {
    // Y = a + b*X + c*X^2
    // Use least squares with matrix solution
    const n = X.length;
    const sumX = X.reduce((a, b) => a + b, 0);
    const sumY = Y.reduce((a, b) => a + b, 0);
    const sumX2 = X.reduce((sum, x) => sum + x * x, 0);
    const sumX3 = X.reduce((sum, x) => sum + x * x * x, 0);
    const sumX4 = X.reduce((sum, x) => sum + x * x * x * x, 0);
    const sumXY = X.reduce((sum, x, i) => sum + x * Y[i], 0);
    const sumX2Y = X.reduce((sum, x, i) => sum + x * x * Y[i], 0);

    // Solve system: [n, sumX, sumX2; sumX, sumX2, sumX3; sumX2, sumX3, sumX4] * [a; b; c] = [sumY; sumXY; sumX2Y]
    // Using Cramer's rule for 3x3
    const det = n * (sumX2 * sumX4 - sumX3 * sumX3) 
              - sumX * (sumX * sumX4 - sumX2 * sumX3) 
              + sumX2 * (sumX * sumX3 - sumX2 * sumX2);

    if (Math.abs(det) < 1e-10) {
      // Singular matrix, fallback to linear
      return fitLinear(X, Y);
    }

    const detA = sumY * (sumX2 * sumX4 - sumX3 * sumX3)
               - sumX * (sumXY * sumX4 - sumX2Y * sumX3)
               + sumX2 * (sumXY * sumX3 - sumX2Y * sumX2);

    const detB = n * (sumXY * sumX4 - sumX2Y * sumX3)
               - sumY * (sumX * sumX4 - sumX2 * sumX3)
               + sumX2 * (sumX * sumX2Y - sumXY * sumX2);

    const detC = n * (sumX2 * sumX2Y - sumX3 * sumXY)
               - sumX * (sumX * sumX2Y - sumX2 * sumXY)
               + sumY * (sumX * sumX3 - sumX2 * sumX2);

    const a = detA / det;
    const b = detB / det;
    const c = detC / det;

    const predict = (x) => a + b * x + c * x * x;
    const r2 = calculateR2(Y, X.map(predict));
    const aic = calculateAIC(Y, X.map(predict), 3);

    return {
      type: MODEL_TYPES.QUADRATIC,
      params: { a, b, c },
      predict,
      r2,
      aic,
      n
    };
  }

  function fitSqrt(X, Y) {
    // Transform: Y = a + b*sqrt(X)
    const sqrtX = X.map(x => Math.sqrt(Math.max(x, 0)));
    const model = fitLinear(sqrtX, Y);
    
    return {
      type: MODEL_TYPES.SQRT,
      params: model.params,
      predict: (x) => model.params.a + model.params.b * Math.sqrt(Math.max(x, 0)),
      r2: model.r2,
      aic: model.aic,
      n: X.length
    };
  }

  function fitLogistic(X, Y) {
    // Logistic: Y = L / (1 + e^(-k(X - X0)))
    // L = carrying capacity (max Y), k = steepness, X0 = midpoint
    // Use iterative fitting with reasonable initial guesses
    
    const n = X.length;
    const minY = Math.min(...Y);
    const maxY = Math.max(...Y);
    const meanX = X.reduce((a, b) => a + b, 0) / n;
    
    // Initial guesses
    let L = maxY * 1.2;  // Ceiling slightly above max observed
    let k = 0.001;        // Steepness
    let X0 = meanX;       // Midpoint
    
    // Simple gradient descent (10 iterations)
    const learningRate = 0.01;
    for (let iter = 0; iter < 10; iter++) {
      let gradL = 0, gradK = 0, gradX0 = 0;
      
      for (let i = 0; i < n; i++) {
        const exp_term = Math.exp(-k * (X[i] - X0));
        const pred = L / (1 + exp_term);
        const error = pred - Y[i];
        
        // Gradients
        gradL += error * (1 / (1 + exp_term));
        gradK += error * (L * exp_term * (X[i] - X0)) / Math.pow(1 + exp_term, 2);
        gradX0 += error * (L * k * exp_term) / Math.pow(1 + exp_term, 2);
      }
      
      L -= learningRate * gradL;
      k -= learningRate * gradK;
      X0 -= learningRate * gradX0;
      
      // Bounds
      L = Math.max(maxY, Math.min(L, maxY * 3));
      k = Math.max(0.0001, Math.min(k, 0.01));
    }
    
    const predict = (x) => L / (1 + Math.exp(-k * (x - X0)));
    const predicted = X.map(predict);
    const r2 = calculateR2(Y, predicted);
    const aic = calculateAIC(Y, predicted, 3);
    
    return {
      type: MODEL_TYPES.LOGISTIC,
      params: { L, k, X0 },
      predict,
      r2,
      aic,
      n
    };
  }

  function fitBoundedLog(X, Y) {
    // Bounded logarithmic: Y = ceiling - (ceiling - a) * e^(-b*X)
    // Asymptotically approaches ceiling
    
    const ceiling = state.constraints.ceilingEnabled && state.constraints.outputCeiling 
      ? state.constraints.outputCeiling 
      : Math.max(...Y) * 1.5;
    
    // Transform to linear: ln(ceiling - Y) = ln(ceiling - a) - b*X
    // Filter out values >= ceiling
    const validIndices = Y.map((y, i) => y < ceiling * 0.99 ? i : -1).filter(i => i >= 0);
    
    if (validIndices.length < 2) {
      // Fallback to log model if too few valid points
      return fitLog(X, Y);
    }
    
    const X_valid = validIndices.map(i => X[i]);
    const Y_transformed = validIndices.map(i => Math.log(ceiling - Y[i]));
    
    const linearFit = fitLinear(X_valid, Y_transformed);
    const a = ceiling - Math.exp(linearFit.params.a);
    const b = -linearFit.params.b;
    
    const predict = (x) => ceiling - (ceiling - a) * Math.exp(-b * x);
    const predicted = X.map(predict);
    const r2 = calculateR2(Y, predicted);
    const aic = calculateAIC(Y, predicted, 2);
    
    return {
      type: MODEL_TYPES.BOUNDED_LOG,
      params: { ceiling, a, b },
      predict,
      r2,
      aic,
      n: X.length
    };
  }

  function calculateR2(actual, predicted) {
    const meanY = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssTot = actual.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const ssRes = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
    return 1 - (ssRes / ssTot);
  }

  function calculateAIC(actual, predicted, k) {
    const n = actual.length;
    const rss = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
    const logLikelihood = -n/2 * Math.log(2 * Math.PI * rss / n) - n/2;
    return 2 * k - 2 * logLikelihood;
  }

  function setModelFitStatus(message, status = '') {
    const el = document.getElementById('model-fit-status');
    if (!el) return;
    el.textContent = message;
    el.className = 'upload-status';
    if (status) el.classList.add(status);
  }

  // ============================================================================
  // MODEL FIT RESULTS DISPLAY
  // ============================================================================

  function displayModelFitResults(models) {
    const container = document.getElementById('model-fit-table-container');
    if (!container) return;

    const resources = Object.keys(models);
    const rows = resources.map(resourceId => {
      const model = models[resourceId];
      const fitQuality = getFitQualityLabel(model.r2);
      
      return `
        <tr>
          <td>${escapeHtml(resourceId)}</td>
          <td><span class="model-badge ${model.type}">${MODEL_NAMES[model.type]}</span></td>
          <td>${model.r2.toFixed(3)}</td>
          <td>${model.aic.toFixed(1)}</td>
          <td><span class="fit-quality-badge ${fitQuality.class}">${fitQuality.label}</span></td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="model-fit-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Model Type</th>
              <th>R²</th>
              <th>AIC</th>
              <th>Fit Quality</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    const card = document.getElementById('model-results-card');
    if (card) card.classList.remove('hidden');

    displayModelDiagnostics(models);
  }

  function getFitQualityLabel(r2) {
    if (r2 >= 0.90) return { label: 'Excellent', class: 'excellent' };
    if (r2 >= 0.70) return { label: 'Good', class: 'good' };
    if (r2 >= 0.50) return { label: 'Fair', class: 'fair' };
    return { label: 'Poor', class: 'poor' };
  }

  function displayModelDiagnostics(models) {
    const container = document.getElementById('model-diagnostics-content');
    if (!container) return;

    const resources = Object.keys(models);
    const avgR2 = resources.reduce((sum, id) => sum + models[id].r2, 0) / resources.length;
    const modelTypes = [...new Set(resources.map(id => models[id].type))];
    const poorFits = resources.filter(id => models[id].r2 < 0.50);

    let html = `
      <p><strong>Overall model fit summary:</strong></p>
      <ul>
        <li>Average R² across all resources: <strong>${avgR2.toFixed(3)}</strong></li>
        <li>Model types used: ${modelTypes.map(t => MODEL_NAMES[t]).join(', ')}</li>
        <li>Resources with poor fit (R² < 0.50): ${poorFits.length}</li>
      </ul>
    `;

    if (poorFits.length > 0) {
      html += `
        <p class="error-text">⚠️ Some resources have poor model fits. Consider:</p>
        <ul>
          <li>Collecting more historical data points</li>
          <li>Checking for data entry errors</li>
          <li>Using manual model selection if auto-fit is struggling</li>
        </ul>
      `;
    }

    container.innerHTML = html;
  }

  function showConstraintsCard() {
    const card = document.getElementById('constraints-card');
    if (card) card.classList.remove('hidden');
  }

  // ============================================================================
  // CONSTRAINT MANAGEMENT
  // ============================================================================

  function updateConstraints() {
    // Total budget - will be validated, no default
    const budgetValue = parseFloat(document.getElementById('total-budget')?.value);
    state.constraints.totalBudget = isNaN(budgetValue) ? null : budgetValue;
    
    // Min per resource - blank means 0 (no minimum)
    const minValue = parseFloat(document.getElementById('min-per-resource')?.value);
    state.constraints.minPerResource = isNaN(minValue) ? 0 : Math.max(0, minValue);
    
    // Max per resource - blank means no maximum (set to very large number)
    const maxValue = parseFloat(document.getElementById('max-per-resource')?.value);
    state.constraints.maxPerResource = isNaN(maxValue) ? Number.MAX_SAFE_INTEGER : Math.max(0, maxValue);
    
    state.constraints.integerConstraint = document.getElementById('integer-constraint')?.checked || false;
    
    state.constraints.cardinalityEnabled = document.getElementById('cardinality-constraint')?.checked || false;
    state.constraints.minResources = parseInt(document.getElementById('min-resources')?.value) || 0;
    state.constraints.maxResources = parseInt(document.getElementById('max-resources')?.value) || 999;
    
    state.constraints.equityEnabled = document.getElementById('equity-constraint')?.checked || false;
    state.constraints.equityRatio = parseFloat(document.getElementById('equity-ratio')?.value) || 10;
    
    state.constraints.baselineEnabled = document.getElementById('baseline-constraint')?.checked || false;
    state.constraints.baselineDeviation = parseFloat(document.getElementById('baseline-deviation')?.value) || 50;
    
    // Ceiling is only enabled when bounded_log model is manually selected
    state.constraints.ceilingEnabled = (state.modelStrategy === 'manual' && state.manualModelType === 'bounded_log');
    state.constraints.outputCeiling = parseFloat(document.getElementById('output-ceiling')?.value) || null;
    
    state.constraints.variableCostPerUnit = parseFloat(document.getElementById('variable-cost-per-unit')?.value) || 1.0;
    state.constraints.fixedCostPerResource = parseFloat(document.getElementById('fixed-cost-per-resource')?.value) || 0;
  }

  // ============================================================================
  // OPTIMIZATION ENGINE
  // ============================================================================
  
  function handleResetAll() {
    if (!confirm('Reset all constraints to default values? This will not clear your uploaded data or fitted models.')) {
      return;
    }
    
    // Reset basic constraints
    document.getElementById('total-budget').value = '100000';
    document.getElementById('min-per-resource').value = '0';
    document.getElementById('max-per-resource').value = '';
    document.getElementById('integer-constraint').checked = false;
    document.getElementById('allow-extrapolation').checked = true;
    
    // Reset cost structure
    document.getElementById('variable-cost-per-unit').value = '1.0';
    document.getElementById('fixed-cost-per-resource').value = '0';
    
    // Reset and hide advanced constraints
    document.getElementById('cardinality-constraint').checked = false;
    document.getElementById('cardinality-inputs')?.classList.add('hidden');
    document.getElementById('min-resources').value = '0';
    document.getElementById('max-resources').value = '999';
    
    document.getElementById('equity-constraint').checked = false;
    document.getElementById('equity-inputs')?.classList.add('hidden');
    document.getElementById('equity-ratio').value = '10';
    
    document.getElementById('baseline-constraint').checked = false;
    document.getElementById('baseline-inputs')?.classList.add('hidden');
    document.getElementById('baseline-deviation').value = '50';
    
    alert('✓ All constraints reset to default values');
  }

  function handleOptimize() {
    if (!state.fittedModels) {
      alert('Please fit models first');
      return;
    }

    updateConstraints();

    // Validate constraints
    const validation = validateConstraints();
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    try {
      const result = runOptimization();
      state.optimizationResult = result;
      displayOptimizationResults(result);
      displayDiagnostics(result);
      hasSuccessfulRun = true;
      checkAndTrackUsage();
    } catch (error) {
      alert(`Optimization failed: ${error.message}`);
      console.error(error);
    }
  }

  function validateConstraints() {
    const c = state.constraints;
    const nResources = Object.keys(state.fittedModels).length;
    const resources = Object.keys(state.fittedModels);

    // Check that total budget is set
    if (!c.totalBudget || c.totalBudget <= 0) {
      return {
        valid: false,
        message: 'Total budget is required and must be greater than zero. Please enter a budget amount.'
      };
    }

    // Check extrapolation constraint compatibility
    if (!state.allowExtrapolation) {
      // When extrapolation is disabled, each resource is capped at its max historical input
      // This overrides the user-specified max per resource
      let totalHistoricalMax = 0;
      let totalHistoricalMin = 0;
      const historicalRanges = [];
      
      resources.forEach(id => {
        const historicalData = state.rawData.filter(d => d.resource_id === id);
        const minHist = Math.min(...historicalData.map(d => d.input));
        const maxHist = Math.max(...historicalData.map(d => d.input));
        totalHistoricalMax += maxHist;
        totalHistoricalMin += minHist;
        historicalRanges.push({ id, minHist, maxHist });
      });
      
      // Check if minimum per resource can be satisfied within historical range
      const minHistoricalPerResource = Math.min(...historicalRanges.map(r => r.minHist));
      if (c.minPerResource > 0 && c.minPerResource > minHistoricalPerResource) {
        return {
          valid: false,
          message: `Impossible constraint: "Minimum per resource" ($${c.minPerResource.toLocaleString()}) exceeds the smallest historical input ($${minHistoricalPerResource.toLocaleString()}). When "Allow extrapolation" is unchecked, all allocations must stay within historical ranges. Either: (1) Enable extrapolation, (2) Lower minimum per resource to $${minHistoricalPerResource.toLocaleString()} or less, or (3) Add more historical data with higher inputs.`
        };
      }
      
      // Check if budget can be allocated within historical maximums
      if (c.totalBudget > totalHistoricalMax) {
        return {
          valid: false,
          message: `Impossible constraint: Total budget ($${c.totalBudget.toLocaleString()}) exceeds the sum of maximum historical inputs ($${totalHistoricalMax.toLocaleString()}). When "Allow extrapolation" is unchecked, allocations cannot exceed historical maximums. Either: (1) Enable extrapolation, (2) Reduce budget to $${totalHistoricalMax.toLocaleString()} or less, or (3) Add more historical data with higher inputs.`
        };
      }
      
      // Check if minimum budget requirements exceed historical capacity
      const minBudgetRequired = c.minPerResource * nResources;
      if (minBudgetRequired > totalHistoricalMax) {
        return {
          valid: false,
          message: `Impossible constraint: Minimum per resource ($${c.minPerResource.toLocaleString()}) × ${nResources} resources = $${minBudgetRequired.toLocaleString()}, which exceeds total historical capacity ($${totalHistoricalMax.toLocaleString()}). When "Allow extrapolation" is unchecked, you cannot allocate beyond historical maximums. Either: (1) Enable extrapolation, (2) Lower minimum per resource, or (3) Add more historical data.`
        };
      }
    }

    if (c.minPerResource * nResources > c.totalBudget) {
      return {
        valid: false,
        message: `Minimum per resource ($${c.minPerResource.toLocaleString()}) × ${nResources} resources exceeds total budget. Lower minimum or increase budget.`
      };
    }

    if (c.cardinalityEnabled && c.minResources * c.minPerResource > c.totalBudget) {
      return {
        valid: false,
        message: `Minimum resources to fund (${c.minResources}) × minimum per resource ($${c.minPerResource.toLocaleString()}) exceeds total budget.`
      };
    }

    if (c.maxPerResource < c.minPerResource) {
      return {
        valid: false,
        message: 'Maximum per resource cannot be less than minimum per resource.'
      };
    }

    return { valid: true };
  }

  function runOptimization() {
    // Try numerical optimization first for non-linear models
    const models = state.fittedModels;
    const resources = Object.keys(models);
    
    // Safety check: ensure all models are valid
    const invalidModels = resources.filter(id => !models[id] || typeof models[id].predict !== 'function');
    if (invalidModels.length > 0) {
      throw new Error(`Model fitting failed for resources: ${invalidModels.join(', ')}. Please re-fit models before optimizing.`);
    }
    
    // Check if we have non-linear models that might benefit from numerical optimization
    const hasNonLinear = resources.some(id => {
      const type = models[id].type;
      return type !== MODEL_TYPES.LINEAR;
    });

    if (hasNonLinear) {
      try {
        const numericalResult = optimizeNumerical();
        
        // Validate result quality
        if (numericalResult && 
            numericalResult.totalOutput > 0 && 
            numericalResult.diagnostics.constraintsSatisfied) {
          return numericalResult;
        }
      } catch (error) {
        console.warn('Numerical optimization failed, falling back to greedy:', error.message);
      }
    }

    // Fallback to greedy (reliable but may not find global optimum)
    return optimizeGreedy();
  }

  function optimizeNumerical() {
    const resources = Object.keys(state.fittedModels);
    const c = state.constraints;
    const models = state.fittedModels;

    const diagnostics = {
      method: OPTIMIZATION_METHODS.NUMERICAL,
      iterations: 0,
      convergence: 'converged',
      constraintsSatisfied: true,
      warnings: [],
      multiStartResults: []
    };

    // Multi-start optimization to avoid local optima
    // 3 deterministic + 10 random = 13 total starts for thorough coverage
    const NUM_STARTS = 13;
    const candidates = [];

    for (let startIdx = 0; startIdx < NUM_STARTS; startIdx++) {
      const startAllocations = generateStartingPoint(resources, c, startIdx, NUM_STARTS);
      
      try {
        const result = runGradientDescent(startAllocations, resources, c, models, diagnostics);
        candidates.push(result);
        
        diagnostics.multiStartResults.push({
          startIdx,
          finalOutput: result.totalOutput,
          iterations: result.iterations
        });
      } catch (error) {
        diagnostics.warnings.push(`Start ${startIdx} failed: ${error.message}`);
      }
    }

    if (candidates.length === 0) {
      throw new Error('All starting points failed');
    }

    // Select best result
    const bestResult = candidates.reduce((best, current) => 
      current.totalOutput > best.totalOutput ? current : best
    );

    // Analyze convergence across random starts
    const outputs = candidates.map(c => c.totalOutput).sort((a, b) => b - a);
    const topOutputs = outputs.slice(0, Math.min(5, outputs.length));
    const outputRange = topOutputs[0] - topOutputs[topOutputs.length - 1];
    const convergenceQuality = outputRange < topOutputs[0] * 0.01 ? 'excellent' : 
                               outputRange < topOutputs[0] * 0.05 ? 'good' : 'variable';
    
    diagnostics.convergence = `best of ${candidates.length} starts (top 5: ${topOutputs.map(o => o.toFixed(0)).join(', ')}) - ${convergenceQuality} convergence`;
    diagnostics.iterations = candidates.reduce((sum, c) => sum + c.iterations, 0);

    if (convergenceQuality === 'variable') {
      diagnostics.warnings.push(`Output variability ${(outputRange / topOutputs[0] * 100).toFixed(1)}% suggests complex optimization landscape - top result may be local optimum`);
    }

    return {
      allocations: bestResult.allocations,
      totalOutput: bestResult.totalOutput,
      totalAllocated: bestResult.totalAllocated,
      method: OPTIMIZATION_METHODS.NUMERICAL,
      diagnostics
    };
  }

  function generateStartingPoint(resources, c, startIdx, numStarts) {
    const allocations = {};
    
    if (startIdx === 0) {
      // Start 1: All at minimum
      resources.forEach(id => {
        allocations[id] = c.minPerResource;
      });
    } else if (startIdx === 1) {
      // Start 2: Distribute evenly
      const perResource = c.totalBudget / resources.length;
      resources.forEach(id => {
        allocations[id] = Math.max(c.minPerResource, Math.min(c.maxPerResource, perResource));
      });
    } else if (startIdx === 2) {
      // Start 3: Proportional to historical inputs
      let totalHistorical = 0;
      const historicalInputs = {};
      resources.forEach(id => {
        const historical = state.rawData.find(d => d.resource_id === id);
        historicalInputs[id] = historical?.input || c.minPerResource;
        totalHistorical += historicalInputs[id];
      });
      
      resources.forEach(id => {
        const share = historicalInputs[id] / totalHistorical;
        allocations[id] = Math.max(c.minPerResource, Math.min(c.maxPerResource, share * c.totalBudget));
      });
    } else {
      // Starts 4-13: 10 random initializations with different seeds
      const range = c.maxPerResource - c.minPerResource;
      const randomSeed = startIdx * 7919 + 1234; // Prime number for better distribution
      
      resources.forEach((id, idx) => {
        // Multiple pseudo-random strategies for better coverage
        const seed1 = (randomSeed + idx * 9876) % 10007;
        const seed2 = (randomSeed * 31 + idx * 8191) % 10007;
        
        // Combine two seeds for better randomness
        const pseudoRandom = (seed1 * 0.7 + seed2 * 0.3) / 10007;
        
        // Vary the range coverage (some starts explore more aggressively)
        const coverage = startIdx < 8 ? 0.9 : 0.6; // First 5 random use 90%, last 5 use 60%
        
        const baseAlloc = c.minPerResource + pseudoRandom * range * coverage;
        allocations[id] = Math.min(c.maxPerResource, baseAlloc);
      });
    }
    
    // Project initial allocation onto constraints
    const projected = projectOntoConstraints(allocations, resources, c, state.fittedModels);
    return projected.allocations;
  }

  function runGradientDescent(initialAllocations, resources, c, models, parentDiagnostics) {
    const allocations = {...initialAllocations};
    
    // Calculate initial objective
    let currentOutput = resources.reduce((sum, id) => sum + models[id].predict(allocations[id]), 0);
    
    // Optimization parameters
    const MAX_ITERATIONS = 300;
    let learningRate = 500; // Start with $500 steps
    const CONVERGENCE_THRESHOLD = 1.0; // Stop if improvement < $1 per iteration
    const MOMENTUM = 0.9;
    const MIN_LEARNING_RATE = 10;
    
    const velocity = {};
    resources.forEach(id => velocity[id] = 0);
    
    let iterations = 0;

    // Gradient descent with momentum and constraint projection
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      iterations++;
      
      // Calculate gradients (marginal returns)
      const gradients = {};
      resources.forEach(id => {
        const delta = 10;
        const currentVal = allocations[id];
        const y1 = models[id].predict(currentVal);
        const y2 = models[id].predict(currentVal + delta);
        gradients[id] = (y2 - y1) / delta; // Output per dollar
      });

      // Update with momentum
      resources.forEach(id => {
        velocity[id] = MOMENTUM * velocity[id] + learningRate * gradients[id];
      });

      // Apply updates
      const oldAllocations = {...allocations};
      resources.forEach(id => {
        allocations[id] += velocity[id];
      });

      // Project onto constraints
      const projected = projectOntoConstraints(allocations, resources, c, models);
      
      if (!projected.feasible) {
        throw new Error('Constraint projection failed');
      }

      Object.assign(allocations, projected.allocations);

      // Calculate new objective
      const newOutput = resources.reduce((sum, id) => sum + models[id].predict(allocations[id]), 0);
      const improvement = newOutput - currentOutput;

      // Check convergence
      if (improvement < CONVERGENCE_THRESHOLD && iter > 10) {
        break;
      }

      // Check for divergence - reduce learning rate and backtrack
      if (improvement < -50) {
        Object.assign(allocations, oldAllocations);
        learningRate *= 0.5;
        
        // Reset velocity
        resources.forEach(id => velocity[id] = 0);
        
        if (learningRate < MIN_LEARNING_RATE) {
          break;
        }
        continue; // Don't update currentOutput, try again with lower learning rate
      }

      currentOutput = newOutput;
    }

    // Apply integer constraint if needed
    if (c.integerConstraint) {
      resources.forEach(id => {
        allocations[id] = Math.round(allocations[id]);
      });
      
      // Re-project to ensure budget constraint after rounding
      const finalProjected = projectOntoConstraints(allocations, resources, c, models);
      Object.assign(allocations, finalProjected.allocations);
    }
    
    // Final enforcement: ensure extrapolation constraint is respected
    if (!state.allowExtrapolation) {
      resources.forEach(id => {
        const historicalData = state.rawData.filter(d => d.resource_id === id);
        const minHistoricalInput = Math.min(...historicalData.map(d => d.input));
        const maxHistoricalInput = Math.max(...historicalData.map(d => d.input));
        allocations[id] = Math.max(minHistoricalInput, Math.min(maxHistoricalInput, allocations[id]));
      });
    }

    // Calculate final metrics
    const totalOutput = resources.reduce((sum, id) => sum + models[id].predict(allocations[id]), 0);
    const totalAllocated = resources.reduce((sum, id) => sum + allocations[id], 0);

    return {
      allocations,
      totalOutput,
      totalAllocated,
      iterations
    };
  }

  function projectOntoConstraints(allocations, resources, c, models) {
    // Project allocations onto feasible region
    const projected = {...allocations};
    
    // 1. Apply per-resource bounds
    resources.forEach(id => {
      // IMPORTANT: Extrapolation constraint overrides min/max per resource settings
      let effectiveMin = c.minPerResource;
      let effectiveMax = c.maxPerResource;
      
      if (!state.allowExtrapolation) {
        const historicalData = state.rawData.filter(d => d.resource_id === id);
        const minHistoricalInput = Math.min(...historicalData.map(d => d.input));
        const maxHistoricalInput = Math.max(...historicalData.map(d => d.input));
        
        // Override with historical bounds
        effectiveMin = Math.max(effectiveMin, minHistoricalInput);
        effectiveMax = Math.min(effectiveMax, maxHistoricalInput);
      }
      
      projected[id] = Math.max(effectiveMin, Math.min(effectiveMax, projected[id]));
      
      // Apply baseline constraint
      if (c.baselineEnabled) {
        const baseline = state.rawData.find(d => d.resource_id === id)?.input || 0;
        const maxChange = baseline * (c.baselineDeviation / 100);
        const minAllowed = baseline - maxChange;
        const maxAllowed = baseline + maxChange;
        projected[id] = Math.max(minAllowed, Math.min(maxAllowed, projected[id]));
      }
    });

    // 2. Apply budget constraint (scale down if over budget)
    let totalAllocated = resources.reduce((sum, id) => sum + projected[id], 0);
    
    if (totalAllocated > c.totalBudget) {
      const scale = c.totalBudget / totalAllocated;
      resources.forEach(id => {
        // Use effective minimum based on extrapolation setting
        let effectiveMin = c.minPerResource;
        if (!state.allowExtrapolation) {
          const historicalData = state.rawData.filter(d => d.resource_id === id);
          const minHistoricalInput = Math.min(...historicalData.map(d => d.input));
          effectiveMin = Math.max(effectiveMin, minHistoricalInput);
        }
        projected[id] = Math.max(effectiveMin, projected[id] * scale);
      });
      
      // Recalculate after scaling
      totalAllocated = resources.reduce((sum, id) => sum + projected[id], 0);
    }

    // 3. Handle cardinality constraint (prioritize by marginal return)
    if (c.cardinalityEnabled) {
      const funded = resources.filter(id => projected[id] > c.minPerResource);
      
      if (funded.length > c.maxResources) {
        // Need to reduce number of funded resources
        const marginalReturns = resources.map(id => ({
          id,
          mr: calculateMarginalReturnForOptimization(id, projected[id], models)
        }));
        marginalReturns.sort((a, b) => b.mr - a.mr);
        
        // Keep only top maxResources
        const toDefund = marginalReturns.slice(c.maxResources);
        toDefund.forEach(item => {
          projected[item.id] = c.minPerResource;
        });
      }
    }

    // 4. Apply equity constraint
    if (c.equityEnabled) {
      const funded = resources.filter(id => projected[id] > c.minPerResource);
      if (funded.length > 1) {
        const allocValues = funded.map(id => projected[id]);
        const maxAlloc = Math.max(...allocValues);
        const minAlloc = Math.min(...allocValues);
        
        if (maxAlloc / minAlloc > c.equityRatio) {
          // Scale down high allocations to meet equity constraint
          const targetMax = minAlloc * c.equityRatio;
          funded.forEach(id => {
            if (projected[id] > targetMax) {
              projected[id] = targetMax;
            }
          });
        }
      }
    }

    // 5. Final budget adjustment (redistribute excess or fill deficit)
    totalAllocated = resources.reduce((sum, id) => sum + projected[id], 0);
    const budgetDiff = c.totalBudget - totalAllocated;
    
    if (Math.abs(budgetDiff) > 1) {
      // Distribute difference proportionally to marginal returns
      const marginalReturns = resources.map(id => ({
        id,
        mr: Math.max(0, calculateMarginalReturnForOptimization(id, projected[id], models))
      }));
      const totalMR = marginalReturns.reduce((sum, item) => sum + item.mr, 0);
      
      if (totalMR > 0) {
        marginalReturns.forEach(item => {
          const share = item.mr / totalMR;
          const adjustment = budgetDiff * share;
          
          // Calculate effective bounds for this resource
          let effectiveMin = c.minPerResource;
          let effectiveMax = c.maxPerResource;
          
          if (!state.allowExtrapolation) {
            const historicalData = state.rawData.filter(d => d.resource_id === item.id);
            const minHistoricalInput = Math.min(...historicalData.map(d => d.input));
            const maxHistoricalInput = Math.max(...historicalData.map(d => d.input));
            effectiveMin = Math.max(effectiveMin, minHistoricalInput);
            effectiveMax = Math.min(effectiveMax, maxHistoricalInput);
          }
          
          projected[item.id] = Math.max(effectiveMin, 
                                       Math.min(effectiveMax, 
                                               projected[item.id] + adjustment));
        });
      }
    }
    
    // 6. Final pass: ensure no violations of historical bounds when extrapolation is disabled
    if (!state.allowExtrapolation) {
      resources.forEach(id => {
        const historicalData = state.rawData.filter(d => d.resource_id === id);
        const minHistoricalInput = Math.min(...historicalData.map(d => d.input));
        const maxHistoricalInput = Math.max(...historicalData.map(d => d.input));
        projected[id] = Math.max(minHistoricalInput, Math.min(maxHistoricalInput, projected[id]));
      });
    }

    return {
      allocations: projected,
      feasible: true
    };
  }

  function calculateMarginalReturnForOptimization(resourceId, allocation, models) {
    const model = models[resourceId];
    if (!model || typeof model.predict !== 'function') {
      console.error(`Model not found or invalid for resource: ${resourceId}`);
      return 0;
    }
    const delta = 1;
    const y1 = model.predict(allocation);
    const y2 = model.predict(allocation + delta);
    return (y2 - y1) / delta;
  }

  function validateFinalAllocation(allocations, resources, c, diagnostics) {
    // Check all constraints are satisfied
    const totalAllocated = resources.reduce((sum, id) => sum + allocations[id], 0);
    
    if (Math.abs(totalAllocated - c.totalBudget) > c.totalBudget * 0.01) {
      diagnostics.warnings.push(`Budget constraint: allocated $${totalAllocated.toFixed(0)}, budget $${c.totalBudget.toFixed(0)}`);
    }

    resources.forEach(id => {
      if (allocations[id] < c.minPerResource - 0.01 || allocations[id] > c.maxPerResource + 0.01) {
        diagnostics.warnings.push(`Resource ${id} outside bounds: $${allocations[id].toFixed(0)}`);
      }
    });

    if (c.cardinalityEnabled) {
      const funded = resources.filter(id => allocations[id] > c.minPerResource);
      if (funded.length < c.minResources || funded.length > c.maxResources) {
        diagnostics.warnings.push(`Cardinality: ${funded.length} resources funded (target: ${c.minResources}-${c.maxResources})`);
      }
    }

    if (c.equityEnabled) {
      const funded = resources.filter(id => allocations[id] > c.minPerResource);
      if (funded.length > 1) {
        const allocValues = funded.map(id => allocations[id]);
        const ratio = Math.max(...allocValues) / Math.min(...allocValues);
        if (ratio > c.equityRatio * 1.01) {
          diagnostics.warnings.push(`Equity ratio: ${ratio.toFixed(1)} exceeds limit ${c.equityRatio}`);
        }
      }
    }
  }

  function optimizeGreedy() {
    const resources = Object.keys(state.fittedModels);
    const c = state.constraints;
    const models = state.fittedModels;

    // Initialize allocations
    const allocations = {};
    resources.forEach(id => {
      allocations[id] = c.minPerResource;
    });

    let remainingBudget = c.totalBudget - c.minPerResource * resources.length;
    const INCREMENT = 100; // Allocate in $100 increments

    const diagnostics = {
      method: OPTIMIZATION_METHODS.GREEDY,
      iterations: 0,
      convergence: 'N/A',
      constraintsSatisfied: true,
      warnings: []
    };

    // Greedy allocation: repeatedly allocate to resource with highest marginal return
    while (remainingBudget >= INCREMENT) {
      diagnostics.iterations++;
      
      let bestResource = null;
      let bestMarginalReturn = -Infinity;

      for (const id of resources) {
        const currentAllocation = allocations[id];
        
        // Determine effective max for this resource
        let effectiveMax = c.maxPerResource;
        
        // Extrapolation constraint overrides max per resource
        if (!state.allowExtrapolation) {
          const historicalData = state.rawData.filter(d => d.resource_id === id);
          const maxHistoricalInput = Math.max(...historicalData.map(d => d.input));
          effectiveMax = Math.min(effectiveMax, maxHistoricalInput);
        }
        
        // Check constraints
        if (currentAllocation + INCREMENT > effectiveMax) continue;
        
        if (c.baselineEnabled) {
          const baseline = state.rawData.find(d => d.resource_id === id)?.input || 0;
          const maxChange = baseline * (c.baselineDeviation / 100);
          if (Math.abs(currentAllocation + INCREMENT - baseline) > maxChange) continue;
        }

        // Calculate marginal return
        const currentOutput = models[id].predict(currentAllocation);
        const newOutput = models[id].predict(currentAllocation + INCREMENT);
        const marginalReturn = (newOutput - currentOutput) / INCREMENT;

        if (marginalReturn > bestMarginalReturn) {
          bestMarginalReturn = marginalReturn;
          bestResource = id;
        }
      }

      if (!bestResource) {
        diagnostics.warnings.push('No feasible allocations found with remaining budget');
        break;
      }

      allocations[bestResource] += INCREMENT;
      remainingBudget -= INCREMENT;

      // Safety check
      if (diagnostics.iterations > 100000) {
        diagnostics.warnings.push('Iteration limit reached');
        break;
      }
    }

    // Apply cardinality constraints if needed
    if (c.cardinalityEnabled) {
      const funded = resources.filter(id => allocations[id] > c.minPerResource);
      if (funded.length < c.minResources) {
        diagnostics.warnings.push(`Only ${funded.length} resources funded, minimum ${c.minResources} required`);
      }
      if (funded.length > c.maxResources) {
        diagnostics.warnings.push(`${funded.length} resources funded, maximum ${c.maxResources} allowed`);
      }
    }

    // Apply equity constraint if needed
    if (c.equityEnabled) {
      const funded = resources.filter(id => allocations[id] > c.minPerResource);
      if (funded.length > 0) {
        const allocValues = funded.map(id => allocations[id]);
        const maxAlloc = Math.max(...allocValues);
        const minAlloc = Math.min(...allocValues);
        const actualRatio = maxAlloc / minAlloc;
        if (actualRatio > c.equityRatio) {
          diagnostics.warnings.push(`Allocation ratio ${actualRatio.toFixed(1)} exceeds equity limit ${c.equityRatio}`);
        }
      }
    }

    // Apply integer constraint if needed
    if (c.integerConstraint) {
      let totalAdjustment = 0;
      resources.forEach(id => {
        const original = allocations[id];
        allocations[id] = Math.round(original);
        totalAdjustment += allocations[id] - original;
      });
      
      // Adjust to maintain exact budget
      if (Math.abs(totalAdjustment) > 0.01) {
        const sortedResources = resources.sort((a, b) => allocations[b] - allocations[a]);
        const adjustment = totalAdjustment > 0 ? -1 : 1;
        let remaining = Math.abs(Math.round(totalAdjustment));
        
        for (const id of sortedResources) {
          if (remaining <= 0) break;
          allocations[id] += adjustment;
          remaining--;
        }
      }
    }

    // Calculate final metrics
    const totalOutput = resources.reduce((sum, id) => sum + models[id].predict(allocations[id]), 0);
    const totalAllocated = resources.reduce((sum, id) => sum + allocations[id], 0);

    return {
      allocations,
      totalOutput,
      totalAllocated,
      method: OPTIMIZATION_METHODS.GREEDY,
      diagnostics
    };
  }

  // ============================================================================
  // RESULTS DISPLAY
  // ============================================================================

  function displayOptimizationResults(result) {
    displaySummary(result);
    displayAllocationTable(result);
    displayCharts(result);

    // Show results sections
    document.getElementById('results-section')?.classList.remove('hidden');
    document.getElementById('visual-section')?.classList.remove('hidden');
    document.getElementById('diagnostics-section')?.classList.remove('hidden');
  }

  function displaySummary(result) {
    const container = document.getElementById('results-summary');
    if (!container) return;

    const roi = ((result.totalOutput - result.totalAllocated) / result.totalAllocated) * 100;
    const avgAllocation = result.totalAllocated / Object.keys(result.allocations).length;
    
    // Check for extrapolation
    const resources = Object.keys(result.allocations);
    const extrapolationWarnings = [];
    resources.forEach(id => {
      const allocation = result.allocations[id];
      const historicalData = state.rawData.filter(d => d.resource_id === id);
      const maxHistorical = Math.max(...historicalData.map(d => d.input));
      if (allocation > maxHistorical) {
        extrapolationWarnings.push(`${id} allocated $${formatNumber(allocation, 0)} (max historical: $${formatNumber(maxHistorical, 0)})`);
      }
    });
    
    const extrapolationHTML = extrapolationWarnings.length > 0 
      ? `<div class="info-text" style="background: #fff3cd; border-left: 4px solid #ffc107; margin-top: 1rem;">
           <strong>⚠️ Extrapolation Warning:</strong> ${extrapolationWarnings.length} resource${extrapolationWarnings.length > 1 ? 's' : ''} allocated beyond historical maximum:<br>
           ${extrapolationWarnings.slice(0, 5).map(w => `• ${w}`).join('<br>')}
           ${extrapolationWarnings.length > 5 ? `<br>• ... and ${extrapolationWarnings.length - 5} more` : ''}
           <br><br>Predictions outside observed ranges may be less reliable. Consider enabling "Allow extrapolation" constraint or reviewing model fits.
         </div>`
      : '';

    container.innerHTML = `
      <div class="result-stat">
        <div class="result-stat-label">Total Allocated</div>
        <div class="result-stat-value">$${formatNumber(result.totalAllocated, 0)}</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-label">Total Output</div>
        <div class="result-stat-value">$${formatNumber(result.totalOutput, 0)}</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-label">ROI</div>
        <div class="result-stat-value">${formatNumber(roi, 1)}<span class="result-stat-unit">%</span></div>
      </div>
      <div class="result-stat">
        <div class="result-stat-label">Avg Allocation</div>
        <div class="result-stat-value">$${formatNumber(avgAllocation, 0)}</div>
      </div>
      ${extrapolationHTML}
    `;
  }

  function displayAllocationTable(result) {
    const container = document.getElementById('allocation-table-container');
    if (!container) return;

    const resources = Object.keys(result.allocations).sort();
    const models = state.fittedModels;

    const rows = resources.map(id => {
      const allocation = result.allocations[id];
      const predictedOutput = models[id].predict(allocation);
      
      // Get all historical data for this resource
      const historicalData = state.rawData.filter(d => d.resource_id === id);
      
      // Most recent = last row in CSV for this resource
      const mostRecent = historicalData[historicalData.length - 1];
      const mostRecentInput = mostRecent?.input || 0;
      
      // Historical average
      const avgInput = historicalData.reduce((sum, d) => sum + d.input, 0) / historicalData.length;
      
      const marginalReturn = calculateMarginalReturn(id, allocation);

      return `
        <tr>
          <td>${escapeHtml(id)}</td>
          <td>$${formatNumber(mostRecentInput, 0)}</td>
          <td>$${formatNumber(avgInput, 0)}</td>
          <td>$${formatNumber(allocation, 0)}</td>
          <td>$${formatNumber(predictedOutput, 0)}</td>
          <td>$${formatNumber(marginalReturn, 2)}</td>
          <td><span class="model-badge ${models[id].type}">${MODEL_NAMES[models[id].type]}</span></td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="allocation-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Most Recent Input (Historical)</th>
              <th>Avg Historical Input</th>
              <th>Optimal Allocation</th>
              <th>Predicted Output</th>
              <th>Marginal Return</th>
              <th>Model</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      
      <details class="allocation-info-details" style="margin-top: 1rem;">
        <summary><strong>ℹ️ Column Explanations</strong> (click to expand)</summary>
        <div style="padding: 1rem; background: #f8f9fa; border-radius: 4px; margin-top: 0.5rem;">
          <dl style="margin: 0;">
            <dt style="font-weight: 600; margin-top: 1rem;">Resource</dt>
            <dd style="margin-left: 1.5rem; margin-bottom: 0.5rem;">The unique identifier for each resource (sales rep, channel, region, etc.) from your uploaded data.</dd>
            
            <dt style="font-weight: 600; margin-top: 1rem;">Most Recent Input (Historical)</dt>
            <dd style="margin-left: 1.5rem; margin-bottom: 0.5rem;">The input value from the last row in your CSV for this resource. If your data is chronologically ordered, this represents current spending. <strong>Note:</strong> The tool treats all rows as unordered historical observations unless you've arranged them chronologically.</dd>
            
            <dt style="font-weight: 600; margin-top: 1rem;">Avg Historical Input</dt>
            <dd style="margin-left: 1.5rem; margin-bottom: 0.5rem;">The mean input across all observations for this resource. Useful for understanding typical spending levels and comparing optimal allocation to historical norms.</dd>
            
            <dt style="font-weight: 600; margin-top: 1rem;">Optimal Allocation</dt>
            <dd style="margin-left: 1.5rem; margin-bottom: 0.5rem;">The optimizer's recommended input for this resource to maximize total output across all resources, subject to your constraints (budget, min/max, equity, etc.). This is the <strong>primary result</strong> of the optimization.</dd>
            
            <dt style="font-weight: 600; margin-top: 1rem;">Predicted Output</dt>
            <dd style="margin-left: 1.5rem; margin-bottom: 0.5rem;">The expected output (sales, conversions, etc.) if you allocate the optimal amount to this resource, calculated using the fitted response model. Sum these across all resources to get total predicted output.</dd>
            
            <dt style="font-weight: 600; margin-top: 1rem;">Marginal Return</dt>
            <dd style="margin-left: 1.5rem; margin-bottom: 0.5rem;">The additional output you'd get per additional dollar invested at the optimal allocation level. Formula: (Output at X+$1) - (Output at X). <strong>Key insight:</strong> In an optimal allocation, marginal returns should be roughly equal across resources (unless constrained). If one resource has much higher marginal return, you may be hitting a constraint that prevents further allocation.</dd>
            
            <dt style="font-weight: 600; margin-top: 1rem;">Model</dt>
            <dd style="margin-left: 1.5rem; margin-bottom: 0.5rem;">The mathematical function fitted to this resource's historical data (Linear, Logarithmic, Power, etc.). Different models capture different response patterns—logarithmic shows diminishing returns, power shows exponential growth, etc. Hover over the badge to see the model type.</dd>
          </dl>
          
          <p style="margin-top: 1rem; padding: 0.75rem; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
            <strong>💡 Interpretation Tips:</strong><br>
            • Compare "Optimal Allocation" to "Most Recent Input (Historical)" to see recommended changes<br>
            • Large differences between optimal and historical average suggest significant room for improvement<br>
            • Similar marginal returns across resources indicate efficient allocation<br>
            • Resources with low marginal return may be over-allocated or have diminishing returns
          </p>
        </div>
      </details>
    `;
  }

  function calculateMarginalReturn(resourceId, allocation) {
    const model = state.fittedModels[resourceId];
    if (!model || typeof model.predict !== 'function') {
      console.error(`Model not found or invalid for resource: ${resourceId}`);
      return 0;
    }
    const delta = 1;
    const y1 = model.predict(allocation);
    const y2 = model.predict(allocation + delta);
    return (y2 - y1) / delta;
  }

  // Continued in next part...
  
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function formatNumber(num, decimals = 2) {
    if (!isFinite(num)) return '—';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function downloadCSV(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  // ============================================================================
  // USAGE TRACKING
  // ============================================================================

  function checkAndTrackUsage() {
    const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
    if (timeOnPage < 0.167) return;
    if (!hasSuccessfulRun) return;
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
    
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `tool-tracked-resource-allocation-${today}`;
    if (localStorage.getItem(storageKey)) return;
    
    if (typeof logToolUsage === 'function') {
      logToolUsage('resource-allocation', {}, 'Resource allocation optimization completed');
      localStorage.setItem(storageKey, 'true');
      console.log('Usage tracked for Resource Allocation Optimizer');
    }
  }

  // ============================================================================
  // DIAGNOSTICS DISPLAY
  // ============================================================================

  function displayDiagnostics(result) {
    const container = document.getElementById('diagnostics-content');
    if (!container) return;

    const diag = result.diagnostics;
    const models = state.fittedModels;
    const resources = Object.keys(result.allocations);

    // Calculate additional diagnostics
    const avgR2 = resources.reduce((sum, id) => sum + models[id].r2, 0) / resources.length;
    const poorFits = resources.filter(id => models[id].r2 < 0.5).length;
    const fundedResources = resources.filter(id => result.allocations[id] > state.constraints.minPerResource).length;
    const marginalReturns = resources.map(id => calculateMarginalReturn(id, result.allocations[id]));
    const avgMarginalReturn = marginalReturns.reduce((a, b) => a + b, 0) / marginalReturns.length;
    const marginalReturnStdDev = Math.sqrt(
      marginalReturns.reduce((sum, mr) => sum + Math.pow(mr - avgMarginalReturn, 2), 0) / marginalReturns.length
    );
    
    // Calculate cost metrics
    const c = state.constraints;
    const variableCosts = result.totalAllocated * c.variableCostPerUnit;
    const fixedCosts = fundedResources * c.fixedCostPerResource;
    const totalCosts = variableCosts + fixedCosts;
    const costPerUnitOutput = totalCosts / result.totalOutput;

    let html = `
      <div class="diagnostic-section">
        <h4>📊 Optimization Method</h4>
        <div class="diagnostic-item">
          <span class="diagnostic-label">Method used:</span>
          <span class="diagnostic-value">
            ${diag.method === OPTIMIZATION_METHODS.GREEDY ? 'Greedy marginal returns allocator' : 'Numerical optimization'}
            <span class="diagnostic-status info">Primary</span>
          </span>
        </div>
        <div class="diagnostic-item">
          <span class="diagnostic-label">Iterations:</span>
          <span class="diagnostic-value">
            ${formatNumber(diag.iterations, 0)}
            ${diag.iterations >= 100000 ? '<span class="diagnostic-status warning">⚠️ Hit iteration limit (100,000)</span>' : ''}
          </span>
        </div>
        <div class="diagnostic-item">
          <p><strong>About iterations:</strong> Each iteration allocates $100 to the resource with highest marginal return. 
          Iteration count = (budget allocated) / $100. The optimizer stops when: (1) budget exhausted, (2) all resources hit constraints, 
          or (3) 100,000 iteration safety limit reached.</p>
        </div>
        <div class="diagnostic-item">
          <p><strong>Why this method?</strong> ${getMethodExplanation(diag.method)}</p>
        </div>
      </div>
      
      ${c.variableCostPerUnit !== 1.0 || c.fixedCostPerResource > 0 ? `
      <div class="diagnostic-section">
        <h4>💵 Cost Structure Analysis</h4>
        ${c.variableCostPerUnit !== 1.0 ? `
          <div class="diagnostic-item">
            <span class="diagnostic-label">Variable cost per unit:</span>
            <span class="diagnostic-value">$${formatNumber(c.variableCostPerUnit, 2)}</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Total variable costs:</span>
            <span class="diagnostic-value">$${formatNumber(variableCosts, 0)} (${formatNumber(result.totalAllocated, 0)} units × $${formatNumber(c.variableCostPerUnit, 2)})</span>
          </div>
        ` : ''}
        ${c.fixedCostPerResource > 0 ? `
          <div class="diagnostic-item">
            <span class="diagnostic-label">Fixed cost per resource:</span>
            <span class="diagnostic-value">$${formatNumber(c.fixedCostPerResource, 0)}</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Number of active resources:</span>
            <span class="diagnostic-value">${fundedResources}</span>
          </div>
          <div class="diagnostic-item">
            <span class="diagnostic-label">Total fixed costs:</span>
            <span class="diagnostic-value">$${formatNumber(fixedCosts, 0)} (${fundedResources} resources × $${formatNumber(c.fixedCostPerResource, 0)})</span>
          </div>
        ` : ''}
        <div class="diagnostic-item">
          <span class="diagnostic-label"><strong>Total costs (variable + fixed):</strong></span>
          <span class="diagnostic-value"><strong>$${formatNumber(totalCosts, 0)}</strong></span>
        </div>
        <div class="diagnostic-item">
          <span class="diagnostic-label">Cost per unit of output:</span>
          <span class="diagnostic-value">$${formatNumber(costPerUnitOutput, 2)}</span>
        </div>
        <div class="diagnostic-item">
          <span class="diagnostic-label">Return on investment (ROI):</span>
          <span class="diagnostic-value">${formatNumber((result.totalOutput / totalCosts - 1) * 100, 1)}%</span>
        </div>
      </div>
      ` : ''}

      <div class="diagnostic-section">
        <h4>✅ Constraint Satisfaction</h4>
        <div class="diagnostic-item">
          <span class="diagnostic-label">Total budget constraint:</span>
          <span class="diagnostic-value">
            Allocated $${formatNumber(result.totalAllocated, 0)} of $${formatNumber(state.constraints.totalBudget, 0)}
            <span class="diagnostic-status ${result.totalAllocated <= state.constraints.totalBudget ? 'success' : 'error'}">
              ${result.totalAllocated <= state.constraints.totalBudget ? '✓ Satisfied' : '✗ Violated'}
            </span>
          </span>
        </div>
        <div class="diagnostic-item">
          <span class="diagnostic-label">Per-resource bounds:</span>
          <span class="diagnostic-value">
            Min: $${formatNumber(state.constraints.minPerResource, 0)}, 
            Max: $${formatNumber(state.constraints.maxPerResource, 0)}
            <span class="diagnostic-status success">✓ All resources within bounds</span>
          </span>
        </div>
        ${state.constraints.cardinalityEnabled ? `
          <div class="diagnostic-item">
            <span class="diagnostic-label">Cardinality constraint:</span>
            <span class="diagnostic-value">
              ${fundedResources} resources funded (target: ${state.constraints.minResources}–${state.constraints.maxResources})
              <span class="diagnostic-status ${fundedResources >= state.constraints.minResources && fundedResources <= state.constraints.maxResources ? 'success' : 'warning'}">
                ${fundedResources >= state.constraints.minResources && fundedResources <= state.constraints.maxResources ? '✓ Satisfied' : '⚠ Outside range'}
              </span>
            </span>
          </div>
        ` : ''}
        ${diag.warnings.length > 0 ? `
          <div class="diagnostic-item">
            <span class="diagnostic-label error-text">Warnings:</span>
            <ul>
              ${diag.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>

      <div class="diagnostic-section">
        <h4>📈 Model Fit Quality</h4>
        <div class="diagnostic-item">
          <span class="diagnostic-label">Average R² across models:</span>
          <span class="diagnostic-value">
            ${formatNumber(avgR2, 3)}
            <span class="diagnostic-status ${getFitQualityLabel(avgR2).class}">${getFitQualityLabel(avgR2).label}</span>
          </span>
        </div>
        ${poorFits > 0 ? `
          <div class="diagnostic-item">
            <span class="diagnostic-label">Resources with poor fit (R² < 0.5):</span>
            <span class="diagnostic-value error-text">${poorFits} of ${resources.length}</span>
          </div>
        ` : ''}
        <div class="diagnostic-item">
          <p><strong>Model reliability:</strong> ${getModelReliabilityGuidance(avgR2, poorFits, resources.length)}</p>
        </div>
      </div>

      <div class="diagnostic-section">
        <h4>💰 Marginal Returns Analysis</h4>
        <div class="diagnostic-item">
          <span class="diagnostic-label">Average marginal return:</span>
          <span class="diagnostic-value">$${formatNumber(avgMarginalReturn, 2)} output per $1 input</span>
        </div>
        <div class="diagnostic-item">
          <span class="diagnostic-label">Marginal return std. dev:</span>
          <span class="diagnostic-value">$${formatNumber(marginalReturnStdDev, 2)}</span>
        </div>
        <div class="diagnostic-item">
          <p><strong>Efficiency note:</strong> ${getMarginalReturnGuidance(marginalReturnStdDev, avgMarginalReturn)}</p>
        </div>
      </div>

      <div class="practical-considerations">
        <h4>Practical Considerations for Managers</h4>
        ${getPracticalConsiderations(result, diag, avgR2, poorFits, marginalReturnStdDev)}
      </div>
    `;

    container.innerHTML = html;
  }

  function getMethodExplanation(method) {
    if (method === OPTIMIZATION_METHODS.GREEDY) {
      return `The greedy allocator iteratively assigns budget increments to whichever resource offers the highest marginal return 
              at that moment. This method is transparent, always respects constraints, and works well for most marketing allocation problems. 
              It may not find the absolute global optimum for complex non-linear models, but it produces sensible, actionable results.`;
    } else {
      return `Numerical optimization uses multi-start gradient descent with momentum to search for the allocation that maximizes total output. 
              This method runs 13 optimizations from different starting points: 3 deterministic (minimum allocations, even distribution, 
              historical proportions) and 10 random initializations with varied coverage of the feasible space. The optimizer compares all 
              results and selects the best, while analyzing convergence quality across the random starts. This extensive multi-start approach 
              avoids local optima that can trap single-start gradient descent. The method excels with non-linear response curves (logarithmic, 
              power, logistic, etc.) by considering the global shape of all response functions simultaneously. Constraints are enforced through 
              projection at each iteration. Falls back to greedy if all starts fail.`;
    }
  }

  function getModelReliabilityGuidance(avgR2, poorFits, totalResources) {
    if (avgR2 >= 0.8 && poorFits === 0) {
      return `Excellent model fit across all resources. The optimization results should be highly reliable and actionable.`;
    } else if (avgR2 >= 0.6 && poorFits <= totalResources * 0.2) {
      return `Good overall model fit. ${poorFits > 0 ? `Consider collecting more data for the ${poorFits} resource(s) with poor fit.` : ''}`;
    } else if (avgR2 >= 0.4) {
      return `Fair model fit. The optimization provides directional guidance, but predictions may have meaningful error. 
              Consider: (1) collecting more historical observations, (2) checking for data quality issues, or (3) using manual model selection.`;
    } else {
      return `⚠️ Poor model fit overall. Use optimization results with caution. Strong recommendation: gather more historical data 
              before making major resource allocation decisions. Current models explain less than 40% of the variance in outcomes.`;
    }
  }

  function getMarginalReturnGuidance(stdDev, avg) {
    if (stdDev / avg < 0.1) {
      return `Marginal returns are highly equalized across resources (low variability), suggesting an efficient allocation. 
              No single resource offers dramatically better returns than others at current allocation levels.`;
    } else if (stdDev / avg < 0.3) {
      return `Marginal returns show moderate variation. The allocation is reasonably efficient, though some resources may offer 
              slightly better returns than others. Consider testing small reallocations if budget flexibility exists.`;
    } else {
      return `⚠️ High variability in marginal returns across resources. This could indicate: (1) constraints are preventing optimal allocation 
              (e.g., some resources hit max limits), (2) different resource types with fundamentally different economics, or 
              (3) model fit issues. Review per-resource allocations carefully.`;
    }
  }

  function getPracticalConsiderations(result, diag, avgR2, poorFits, marginalStdDev) {
    const considerations = [];

    // Budget utilization
    const budgetUtilization = (result.totalAllocated / state.constraints.totalBudget) * 100;
    if (budgetUtilization < 95) {
      considerations.push(`<strong>Budget utilization:</strong> Only ${formatNumber(budgetUtilization, 1)}% of available budget was allocated. 
                          This suggests constraints (maximums, equity limits, or cardinality) are preventing full deployment. 
                          Consider relaxing constraints if you have budget to spend.`);
    } else if (budgetUtilization > 99) {
      considerations.push(`<strong>Budget utilization:</strong> Nearly 100% of budget allocated. Excellent capital efficiency. 
                          If additional budget becomes available, run sensitivity analysis to estimate incremental returns.`);
    }

    // Model fit warnings
    if (poorFits > 0) {
      considerations.push(`<strong>Data quality:</strong> ${poorFits} resource(s) have weak model fits. For these resources, 
                          predictions are less reliable. Before implementing, consider: (1) manually reviewing their allocations, 
                          (2) collecting more historical data, or (3) using qualitative judgment to adjust.`);
    }

    // ROI guidance
    const roi = ((result.totalOutput - result.totalAllocated) / result.totalAllocated) * 100;
    if (roi < 0) {
      considerations.push(`<strong>⚠️ Negative ROI:</strong> Models predict total output (${formatNumber(result.totalOutput, 0)}) 
                          will be less than total investment (${formatNumber(result.totalAllocated, 0)}). This could indicate: 
                          (1) poor model fits, (2) historical data doesn't reflect realistic input-output relationships, or 
                          (3) diminishing returns at current scale. Verify data and models before proceeding.`);
    } else if (roi < 50) {
      considerations.push(`<strong>Low ROI:</strong> Predicted ROI of ${formatNumber(roi, 1)}% suggests modest returns. 
                          This may be realistic for mature markets/channels. Ensure historical data is accurate and consider 
                          whether qualitative factors (brand building, market share defense) justify the investment.`);
    } else if (roi > 500) {
      considerations.push(`<strong>High ROI:</strong> Predicted ROI of ${formatNumber(roi, 1)}% is exceptional. 
                          Verify this makes business sense—very high ROI estimates may indicate: (1) model extrapolation beyond 
                          historical data ranges, (2) overfitting, or (3) genuine high-return opportunities. Double-check assumptions.`);
    }

    // Integer constraint note
    if (state.constraints.integerConstraint) {
      considerations.push(`<strong>Integer rounding:</strong> Allocations were rounded to whole dollars. This can cause small 
                          deviations from the true optimum (typically <1% of total output). If precision matters, consider using 
                          continuous allocations and rounding only for budget approval.`);
    }

    // Cardinality implications
    if (state.constraints.cardinalityEnabled) {
      const funded = Object.keys(result.allocations).filter(id => result.allocations[id] > state.constraints.minPerResource).length;
      const unfunded = Object.keys(result.allocations).length - funded;
      if (unfunded > 0) {
        considerations.push(`<strong>Resource exclusion:</strong> ${unfunded} resource(s) received only the minimum allocation 
                            (or zero). This is driven by cardinality constraints or poor predicted returns. Review these resources—
                            they may require non-budget interventions (training, process changes) to become viable.`);
      }
    }

    // Equity constraint implications
    if (state.constraints.equityEnabled) {
      considerations.push(`<strong>Equity constraint active:</strong> Allocation fairness limits are enforced (max/min ratio ≤ ${state.constraints.equityRatio}). 
                          This may prevent optimal allocation if some resources genuinely offer much higher returns. 
                          Consider: (1) is equity a business requirement (e.g., union rules, fairness policies), or 
                          (2) can you justify unequal allocation based on performance?`);
    }

    // General guidance
    considerations.push(`<strong>Implementation tip:</strong> Treat these allocations as a starting point, not gospel. 
                        Combine with qualitative judgment, market knowledge, and stakeholder input. Consider piloting changes 
                        gradually rather than implementing dramatic shifts all at once.`);

    considerations.push(`<strong>Monitor and iterate:</strong> After implementing, track actual outcomes vs. predictions. 
                        Update your historical data with new results and re-run optimization quarterly or as conditions change. 
                        Resource allocation is not one-and-done—it's an ongoing process.`);

    return '<ul>' + considerations.map(c => `<li>${c}</li>`).join('') + '</ul>';
  }

  // ============================================================================
  // VISUALIZATION
  // ============================================================================

  function displayCharts(result) {
    displayResponseCurves(result);
    displayAllocationBarChart(result);
    displayMarginalReturnsChart(result);
    displayStrategyComparison(result);
  }

  function displayResponseCurves(result) {
    const container = document.getElementById('response-curves-chart');
    if (!container || typeof Plotly === 'undefined') return;

    const resources = Object.keys(result.allocations);
    const showHistorical = document.getElementById('show-historical')?.checked ?? true;
    const chartLimit = parseInt(document.getElementById('chart-resources-limit')?.value) || 20;
    
    // Get filter selection
    const filterSelect = document.getElementById('response-curve-filter');
    const selectedResource = filterSelect?.value || 'all';
    const isFilteringToSingle = selectedResource !== 'all';
    
    // Populate dropdown if not already done
    if (filterSelect && filterSelect.options.length === 1) {
      resources.forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        filterSelect.appendChild(option);
      });
      
      // Add event listener for filter changes
      filterSelect.addEventListener('change', () => displayResponseCurves(result));
    }
    
    // Filter resources to show
    let resourcesToShow = selectedResource === 'all' 
      ? resources.slice(0, chartLimit) 
      : [selectedResource];

    const traces = [];
    let hasExtrapolation = false;

    // Plotly default color palette
    const plotlyColors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];

    resourcesToShow.forEach((id, idx) => {
      const model = state.fittedModels[id];
      const allocation = result.allocations[id];
      const historicalData = state.rawData.filter(d => d.resource_id === id);
      const minHistoricalInput = Math.min(...historicalData.map(d => d.input));
      const maxHistoricalInput = Math.max(...historicalData.map(d => d.input));
      
      // Assign color for this resource
      const lineColor = plotlyColors[idx % plotlyColors.length];
      
      // Check for extrapolation
      if (allocation > maxHistoricalInput * 1.01) {
        hasExtrapolation = true;
      }

      // Determine plot range
      const maxX = Math.max(
        allocation * 1.5, 
        state.constraints.maxPerResource, 
        maxHistoricalInput * 1.5
      );
      
      // Split curve into historical range (solid) and extrapolation (dotted)
      // Historical range: minHistoricalInput to maxHistoricalInput (solid line)
      const historicalXValues = [];
      const step = maxX / 100;
      for (let x = minHistoricalInput; x <= maxHistoricalInput; x += step) {
        historicalXValues.push(x);
      }
      // Ensure max historical point is included
      if (historicalXValues[historicalXValues.length - 1] < maxHistoricalInput) {
        historicalXValues.push(maxHistoricalInput);
      }
      const historicalYValues = historicalXValues.map(x => model.predict(x));

      // Solid trace for historical range
      traces.push({
        x: historicalXValues,
        y: historicalYValues,
        mode: 'lines',
        name: id,
        line: { width: 2, color: lineColor },
        legendgroup: id,
        hovertemplate: `${id}<br>Input: $%{x:,.0f}<br>Output: $%{y:,.0f}<extra></extra>`
      });
      
      // If extrapolation is allowed, add dotted lines beyond historical range
      if (state.allowExtrapolation) {
        // Lower extrapolation (below min historical)
        if (minHistoricalInput > 0) {
          const lowerXValues = [];
          for (let x = 0; x <= minHistoricalInput; x += step) {
            lowerXValues.push(x);
          }
          const lowerYValues = lowerXValues.map(x => model.predict(x));
          
          traces.push({
            x: lowerXValues,
            y: lowerYValues,
            mode: 'lines',
            name: `${id} (extrapolation)`,
            line: { width: 2, dash: 'dot', color: lineColor },
            legendgroup: id,
            showlegend: false,
            hovertemplate: `${id} (extrapolated)<br>Input: $%{x:,.0f}<br>Output: $%{y:,.0f}<extra></extra>`
          });
        }
        
        // Upper extrapolation (above max historical)
        const upperXValues = [];
        for (let x = maxHistoricalInput; x <= maxX; x += step) {
          upperXValues.push(x);
        }
        const upperYValues = upperXValues.map(x => model.predict(x));
        
        traces.push({
          x: upperXValues,
          y: upperYValues,
          mode: 'lines',
          name: `${id} (extrapolation)`,
          line: { width: 2, dash: 'dot', color: lineColor },
          legendgroup: id,
          showlegend: false,
          hovertemplate: `${id} (extrapolated)<br>Input: $%{x:,.0f}<br>Output: $%{y:,.0f}<extra></extra>`
        });
      }

      // Optimal allocation marker (red diamond)
      traces.push({
        x: [allocation],
        y: [model.predict(allocation)],
        mode: 'markers',
        name: `${id} (optimal)`,
        marker: { size: 10, color: 'red', symbol: 'diamond' },
        showlegend: false,
        hovertemplate: `${id} - Optimal<br>Input: $%{x:,.0f}<br>Output: $%{y:,.0f}<extra></extra>`
      });

      // Historical points (grey circles)
      if (showHistorical) {
        historicalData.forEach(dataPoint => {
          traces.push({
            x: [dataPoint.input],
            y: [dataPoint.output],
            mode: 'markers',
            name: `${id} (historical)`,
            marker: { size: 8, color: 'gray', symbol: 'circle' },
            showlegend: false,
            hovertemplate: `${id} - Historical<br>Input: $%{x:,.0f}<br>Output: $%{y:,.0f}<extra></extra>`
          });
        });
      }
    });

    // Calculate or retrieve axis ranges
    let xRange, yRange;
    
    if (!isFilteringToSingle) {
      // Calculate ranges for 'all' view and store them
      const allXValues = traces.filter(t => t.mode === 'lines').flatMap(t => t.x);
      const allYValues = traces.filter(t => t.mode === 'lines').flatMap(t => t.y);
      xRange = [0, Math.max(...allXValues) * 1.05];
      yRange = [0, Math.max(...allYValues) * 1.05];
      
      // Store these ranges globally
      state.chartAxisRanges = { xRange, yRange };
    } else {
      // Use stored global ranges when filtering to single resource
      if (state.chartAxisRanges) {
        xRange = state.chartAxisRanges.xRange;
        yRange = state.chartAxisRanges.yRange;
      } else {
        // Fallback if ranges not stored (shouldn't happen)
        const allXValues = traces.filter(t => t.mode === 'lines').flatMap(t => t.x);
        const allYValues = traces.filter(t => t.mode === 'lines').flatMap(t => t.y);
        xRange = [0, Math.max(...allXValues) * 1.05];
        yRange = [0, Math.max(...allYValues) * 1.05];
      }
    }

    const layout = {
      title: selectedResource === 'all' ? 'Response Curves by Resource' : `Response Curve: ${selectedResource}`,
      xaxis: { 
        title: 'Input (Budget)', 
        tickformat: '$,.0f',
        range: xRange
      },
      yaxis: { 
        title: 'Predicted Output', 
        tickformat: '$,.0f',
        range: yRange
      },
      hovermode: 'closest',
      showlegend: selectedResource === 'all',
      legend: { orientation: 'v', x: 1.05, y: 1 }
    };

    Plotly.newPlot(container, traces, layout, { responsive: true });
    
    // Show/hide extrapolation warning
    const warningDiv = document.getElementById('extrapolation-warning');
    if (warningDiv) {
      warningDiv.style.display = hasExtrapolation ? 'block' : 'none';
    }
  }

  function displayAllocationBarChart(result) {
    const container = document.getElementById('allocation-bar-chart');
    if (!container || typeof Plotly === 'undefined') return;

    const resources = Object.keys(result.allocations);
    const chartLimit = parseInt(document.getElementById('chart-resources-limit')?.value) || 20;
    
    // Sort by allocation descending
    const sorted = resources
      .map(id => ({ id, allocation: result.allocations[id] }))
      .sort((a, b) => b.allocation - a.allocation)
      .slice(0, chartLimit);

    const trace = {
      x: sorted.map(r => r.id),
      y: sorted.map(r => r.allocation),
      type: 'bar',
      marker: { color: '#2a7de1' },
      hovertemplate: '%{x}<br>Allocation: $%{y:,.0f}<extra></extra>'
    };

    const layout = {
      title: 'Optimal Allocation by Resource',
      xaxis: { title: 'Resource', tickangle: -45 },
      yaxis: { title: 'Allocated Budget', tickformat: '$,.0f' },
      hovermode: 'closest'
    };

    Plotly.newPlot(container, [trace], layout, { responsive: true });
  }

  function displayMarginalReturnsChart(result) {
    const container = document.getElementById('marginal-returns-chart');
    if (!container || typeof Plotly === 'undefined') return;

    const resources = Object.keys(result.allocations);
    const chartLimit = parseInt(document.getElementById('chart-resources-limit')?.value) || 20;
    
    const data = resources.map(id => ({
      id,
      marginalReturn: calculateMarginalReturn(id, result.allocations[id])
    })).sort((a, b) => b.marginalReturn - a.marginalReturn).slice(0, chartLimit);

    const trace = {
      x: data.map(r => r.id),
      y: data.map(r => r.marginalReturn),
      type: 'bar',
      marker: { 
        color: data.map(r => r.marginalReturn > 0 ? '#2f9d58' : '#d64747')
      },
      hovertemplate: '%{x}<br>Marginal Return: $%{y:.2f}<extra></extra>'
    };

    const layout = {
      title: 'Marginal Returns at Optimal Allocation',
      xaxis: { title: 'Resource', tickangle: -45 },
      yaxis: { title: 'Output per Additional $1 Input', tickformat: '$,.2f' },
      hovermode: 'closest'
    };

    Plotly.newPlot(container, [trace], layout, { responsive: true });
  }

  function displayStrategyComparison(result) {
    const container = document.getElementById('scenario-comparison-chart');
    if (!container || typeof Plotly === 'undefined') return;
    
    // Safety check: ensure we have valid result and models
    if (!result || !result.allocations || !state.fittedModels) {
      container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Scenario comparison will appear after running optimization.</p>';
      return;
    }

    const resources = Object.keys(result.allocations);
    const models = state.fittedModels;
    const c = state.constraints;

    // Scenario 1: Historical averages
    let historicalAvgTotal = 0;
    let historicalAvgBudget = 0;
    resources.forEach(id => {
      const historicalData = state.rawData.filter(d => d.resource_id === id);
      const avgInput = historicalData.reduce((sum, d) => sum + d.input, 0) / historicalData.length;
      historicalAvgBudget += avgInput;
      historicalAvgTotal += models[id].predict(avgInput);
    });

    // Scenario 2: Current levels (most recent)
    let currentTotal = 0;
    let currentBudget = 0;
    resources.forEach(id => {
      const historicalData = state.rawData.filter(d => d.resource_id === id);
      const mostRecent = historicalData[historicalData.length - 1];
      const currentInput = mostRecent?.input || 0;
      currentBudget += currentInput;
      currentTotal += models[id].predict(currentInput);
    });

    // Scenario 3: Budget-only optimization (no other constraints)
    let budgetOnlyTotal = 0;
    try {
      // Run optimization with only budget constraint
      const budgetOnlyConstraints = {
        totalBudget: c.totalBudget,
        minPerResource: 0,
        maxPerResource: Number.MAX_SAFE_INTEGER,
        integerConstraint: false,
        cardinalityEnabled: false,
        equityEnabled: false,
        baselineEnabled: false,
        variableCostPerUnit: 1.0,
        fixedCostPerResource: 0
      };
      
      // Temporarily swap constraints
      const originalConstraints = state.constraints;
      const originalExtrapolation = state.allowExtrapolation;
      state.constraints = budgetOnlyConstraints;
      state.allowExtrapolation = true; // Allow extrapolation for budget-only
      
      const budgetOnlyResult = optimizeGreedy();
      budgetOnlyTotal = budgetOnlyResult.totalOutput;
      
      // Restore original constraints
      state.constraints = originalConstraints;
      state.allowExtrapolation = originalExtrapolation;
    } catch (error) {
      console.warn('Budget-only optimization failed:', error);
      budgetOnlyTotal = result.totalOutput; // Fallback to main result
    }

    // Scenario 4: Constrained optimization (actual result)
    const constrainedTotal = result.totalOutput;

    // Create chart
    const scenarios = [
      'Historical<br>Averages',
      'Current<br>Levels',
      'Budget-Only<br>Optimization',
      'Constrained<br>Optimization'
    ];
    
    const outputs = [
      historicalAvgTotal,
      currentTotal,
      budgetOnlyTotal,
      constrainedTotal
    ];
    
    const budgets = [
      historicalAvgBudget,
      currentBudget,
      c.totalBudget,
      result.totalAllocated
    ];
    
    // ROI = (Output - Budget) / Budget × 100
    const rois = outputs.map((val, idx) => ((val - budgets[idx]) / budgets[idx]) * 100);
    
    const colors = ['#9e9e9e', '#ff9800', '#2196f3', '#4caf50'];

    const trace = {
      x: scenarios,
      y: outputs,
      type: 'bar',
      marker: { color: colors },
      text: outputs.map(val => `$${formatNumber(val, 0)}`),
      textposition: 'outside',
      customdata: budgets.map((budget, i) => ({ budget: budget, roi: rois[i] })),
      hovertemplate: '%{x}<br>Output: $%{y:,.0f}<br>Budget: $%{customdata.budget:,.0f}<br>ROI: %{customdata.roi:.1f}%<extra></extra>'
    };

    const layout = {
      title: 'Predicted Output by Allocation Strategy',
      xaxis: { title: 'Scenario' },
      yaxis: { title: 'Total Predicted Output', tickformat: '$,.0f' },
      hovermode: 'closest',
      margin: { t: 50, b: 80 }
    };

    Plotly.newPlot(container, [trace], layout, { responsive: true });
    
    // Update active constraints list
    const constraintsList = document.getElementById('active-constraints-list');
    if (constraintsList) {
      const constraints = ['<li>Total Budget: $' + formatNumber(c.totalBudget, 0) + '</li>'];
      
      if (c.minPerResource > 0) {
        constraints.push('<li>Minimum per resource: $' + formatNumber(c.minPerResource, 0) + '</li>');
      }
      if (c.maxPerResource < Number.MAX_SAFE_INTEGER) {
        constraints.push('<li>Maximum per resource: $' + formatNumber(c.maxPerResource, 0) + '</li>');
      }
      if (!state.allowExtrapolation) {
        constraints.push('<li>Extrapolation disabled (allocations limited to historical ranges)</li>');
      }
      if (c.cardinalityEnabled && c.maxResourcesFunded < Object.keys(result.allocations).length) {
        constraints.push('<li>Cardinality: Maximum ' + c.maxResourcesFunded + ' resources funded</li>');
      }
      if (c.equityEnabled) {
        constraints.push('<li>Equity: Maximum allocation ratio of ' + c.maxAllocationRatio + ':1 between highest and lowest funded resources</li>');
      }
      if (c.baselineEnabled) {
        constraints.push('<li>Baseline maintenance: Each resource must receive at least ' + (c.baselinePercentage * 100) + '% of its historical average</li>');
      }
      if (c.integerConstraint) {
        constraints.push('<li>Integer allocations only (whole dollar amounts)</li>');
      }
      
      constraintsList.innerHTML = constraints.join('');
    }
  }

  // ============================================================================
  // SCENARIO MANAGEMENT
  // ============================================================================

  function handleSaveScenario() {
    if (!state.optimizationResult) {
      alert('No optimization results to save');
      return;
    }

    const name = prompt('Enter a name for this scenario:', `Scenario ${state.savedScenarios.length + 1}`);
    if (!name) return;

    const scenario = {
      name,
      timestamp: new Date().toISOString(),
      result: JSON.parse(JSON.stringify(state.optimizationResult)),
      constraints: JSON.parse(JSON.stringify(state.constraints)),
      models: JSON.parse(JSON.stringify(Object.keys(state.fittedModels).reduce((acc, id) => {
        acc[id] = { type: state.fittedModels[id].type, r2: state.fittedModels[id].r2 };
        return acc;
      }, {})))
    };

    state.savedScenarios.push(scenario);
    updateSavedScenariosList();
    alert(`Scenario "${name}" saved successfully`);
  }

  function updateSavedScenariosList() {
    const container = document.getElementById('saved-scenarios-list');
    if (!container) return;

    if (state.savedScenarios.length === 0) {
      container.innerHTML = '<p class="muted">No saved scenarios yet. Run an optimization and click "Save this scenario".</p>';
      return;
    }

    container.innerHTML = state.savedScenarios.map((scenario, idx) => `
      <div class="scenario-item">
        <input type="checkbox" id="scenario-${idx}" data-idx="${idx}">
        <div class="scenario-info">
          <div class="scenario-name">${escapeHtml(scenario.name)}</div>
          <div class="scenario-meta">
            Total Output: $${formatNumber(scenario.result.totalOutput, 0)} | 
            ${new Date(scenario.timestamp).toLocaleDateString()}
          </div>
        </div>
        <div class="scenario-actions-inline">
          <button type="button" class="secondary" onclick="loadScenario(${idx})">Load</button>
          <button type="button" class="secondary" onclick="deleteScenario(${idx})">Delete</button>
        </div>
      </div>
    `).join('');

    // Show comparison section
    document.getElementById('comparison-section')?.classList.remove('hidden');
  }

  function handleExportAllocation() {
    if (!state.optimizationResult) {
      alert('No optimization results to export');
      return;
    }

    const result = state.optimizationResult;
    const resources = Object.keys(result.allocations);
    const models = state.fittedModels;
    const c = state.constraints;

    // Build metadata header rows
    const timestamp = new Date().toISOString();
    const roi = ((result.totalOutput - result.totalAllocated) / result.totalAllocated) * 100;
    
    const metadataRows = [
      '# Marketing Resource Allocation Optimizer - Export',
      `# Timestamp: ${timestamp}`,
      `# Total Budget: $${result.totalAllocated.toFixed(2)}`,
      `# Total Predicted Output: $${result.totalOutput.toFixed(2)}`,
      `# ROI: ${roi.toFixed(2)}%`,
      '# Active Constraints:',
      `#   - Total Budget: $${c.totalBudget}`,
      c.minPerResource > 0 ? `#   - Min per resource: $${c.minPerResource}` : null,
      c.maxPerResource < Number.MAX_SAFE_INTEGER ? `#   - Max per resource: $${c.maxPerResource}` : null,
      !state.allowExtrapolation ? '#   - Extrapolation disabled (limited to historical ranges)' : null,
      c.cardinalityEnabled ? `#   - Cardinality: Max ${c.maxResourcesFunded} resources funded` : null,
      c.equityEnabled ? `#   - Equity: Max ratio ${c.maxAllocationRatio}:1` : null,
      c.baselineEnabled ? `#   - Baseline: Min ${(c.baselinePercentage * 100).toFixed(0)}% of historical avg` : null,
      c.integerConstraint ? '#   - Integer allocations only' : null,
      '#',
    ].filter(row => row !== null);

    // Build header with all possible parameter columns
    const headers = ['resource_id', 'optimal_allocation', 'predicted_output', 'marginal_return', 'most_recent_input', 'historical_avg_input', 'model_type'];
    
    // Collect all unique parameter names across all models
    const allParamNames = new Set();
    resources.forEach(id => {
      const params = models[id].params || {};
      Object.keys(params).forEach(paramName => allParamNames.add(paramName));
    });
    
    // Add parameter columns to header
    const paramNames = Array.from(allParamNames).sort();
    paramNames.forEach(paramName => headers.push(`param_${paramName}`));
    
    const rows = [...metadataRows, headers.join(',')];
    
    resources.forEach(id => {
      const allocation = result.allocations[id];
      const output = models[id].predict(allocation);
      const marginalReturn = calculateMarginalReturn(id, allocation);
      const modelType = models[id].type;
      
      // Calculate historical values
      const historicalData = state.rawData.filter(d => d.resource_id === id);
      const mostRecent = historicalData[historicalData.length - 1];
      const mostRecentInput = mostRecent?.input || 0;
      const avgInput = historicalData.reduce((sum, d) => sum + d.input, 0) / historicalData.length;
      
      const row = [
        id,
        allocation.toFixed(2),
        output.toFixed(2),
        marginalReturn.toFixed(4),
        mostRecentInput.toFixed(2),
        avgInput.toFixed(2),
        modelType
      ];
      
      // Add parameter values (or empty string if not applicable to this model)
      const params = models[id].params || {};
      paramNames.forEach(paramName => {
        const value = params[paramName];
        row.push(value !== undefined ? value.toFixed(6) : '');
      });
      
      rows.push(row.join(','));
    });

    const csv = rows.join('\r\n');
    downloadCSV('optimal_allocation.csv', csv);
  }

  function handleSensitivityAnalysis() {
    if (!state.fittedModels) {
      alert('Fit models first');
      return;
    }

    const minPct = parseFloat(document.getElementById('sensitivity-min')?.value) || 50;
    const maxPct = parseFloat(document.getElementById('sensitivity-max')?.value) || 200;
    
    const baseBudget = state.constraints.totalBudget;
    const budgetRange = [];
    const outputRange = [];

    for (let pct = minPct; pct <= maxPct; pct += 5) {
      const testBudget = baseBudget * (pct / 100);
      state.constraints.totalBudget = testBudget;
      
      try {
        const testResult = optimizeGreedy();
        budgetRange.push(testBudget);
        outputRange.push(testResult.totalOutput);
      } catch (e) {
        console.error('Sensitivity test failed at', pct, '%:', e);
      }
    }

    // Restore original budget
    state.constraints.totalBudget = baseBudget;

    if (budgetRange.length > 0) {
      displaySensitivityChart(budgetRange, outputRange);
    }
  }

  function displaySensitivityChart(budgets, outputs) {
    const container = document.getElementById('sensitivity-chart');
    const containerDiv = document.getElementById('sensitivity-chart-container');
    if (!container || !containerDiv || typeof Plotly === 'undefined') return;

    const trace = {
      x: budgets,
      y: outputs,
      mode: 'lines+markers',
      name: 'Total Output',
      line: { width: 3, color: '#2a7de1' },
      marker: { size: 6 },
      hovertemplate: 'Budget: $%{x:,.0f}<br>Output: $%{y:,.0f}<extra></extra>'
    };

    const layout = {
      title: 'Sensitivity Analysis: Output vs. Budget',
      xaxis: { title: 'Total Budget', tickformat: '$,.0f' },
      yaxis: { title: 'Predicted Total Output', tickformat: '$,.0f' },
      hovermode: 'closest'
    };

    Plotly.newPlot(container, [trace], layout, { responsive: true });
    containerDiv.classList.remove('hidden');
  }

  function handleCompareScenarios() {
    const checked = Array.from(document.querySelectorAll('#saved-scenarios-list input[type="checkbox"]:checked'));
    if (checked.length < 2) {
      alert('Select at least 2 scenarios to compare');
      return;
    }

    const indices = checked.map(cb => parseInt(cb.dataset.idx));
    const scenarios = indices.map(i => state.savedScenarios[i]);
    
    displayScenarioComparison(scenarios);
  }

  function displayScenarioComparison(scenarios) {
    const tableContainer = document.getElementById('scenario-comparison-table');
    const chartContainer = document.getElementById('scenario-comparison-charts');
    const card = document.getElementById('comparison-results-card');
    
    if (!tableContainer || !chartContainer || !card) return;

    // Summary table
    const headers = ['Metric', ...scenarios.map(s => s.name)];
    const metrics = [
      {
        label: 'Total Allocated',
        values: scenarios.map(s => `$${formatNumber(s.result.totalAllocated, 0)}`)
      },
      {
        label: 'Total Output',
        values: scenarios.map(s => `$${formatNumber(s.result.totalOutput, 0)}`)
      },
      {
        label: 'ROI %',
        values: scenarios.map(s => {
          const roi = ((s.result.totalOutput - s.result.totalAllocated) / s.result.totalAllocated) * 100;
          return `${formatNumber(roi, 1)}%`;
        })
      },
      {
        label: 'Resources Funded',
        values: scenarios.map(s => {
          const funded = Object.values(s.result.allocations).filter(a => a > s.constraints.minPerResource).length;
          return funded;
        })
      }
    ];

    let tableHTML = '<table class="model-fit-table"><thead><tr>';
    headers.forEach(h => { tableHTML += `<th>${escapeHtml(h)}</th>`; });
    tableHTML += '</tr></thead><tbody>';
    
    metrics.forEach(metric => {
      tableHTML += '<tr>';
      tableHTML += `<td><strong>${metric.label}</strong></td>`;
      metric.values.forEach(v => { tableHTML += `<td>${v}</td>`; });
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    
    tableContainer.innerHTML = tableHTML;

    // Comparison chart
    if (typeof Plotly !== 'undefined') {
      const traces = scenarios.map(s => ({
        x: ['Total Allocated', 'Total Output'],
        y: [s.result.totalAllocated, s.result.totalOutput],
        name: s.name,
        type: 'bar'
      }));

      const layout = {
        title: 'Scenario Comparison',
        barmode: 'group',
        yaxis: { title: 'Amount ($)', tickformat: '$,.0f' }
      };

      Plotly.newPlot(chartContainer, traces, layout, { responsive: true });
    }

    card.classList.remove('hidden');
  }

  // ============================================================================
  // PRESET SCENARIOS
  // ============================================================================

  function loadScenarioManifest() {
    // Load scenarios from manifest
    if (typeof SCENARIO_MANIFEST !== 'undefined') {
      state.scenarioManifest = SCENARIO_MANIFEST;
      populateScenarioDropdown();
    }
  }

  function populateScenarioDropdown() {
    const select = document.getElementById('scenario-select');
    if (!select) return;

    // Add scenarios to dropdown
    state.scenarioManifest.forEach(scenario => {
      const option = document.createElement('option');
      option.value = scenario.id;
      option.textContent = scenario.name;
      select.appendChild(option);
    });

    // Handle scenario selection
    select.addEventListener('change', handleScenarioSelection);
  }

  function handleScenarioSelection() {
    const select = document.getElementById('scenario-select');
    const downloadBtn = document.getElementById('scenario-download');
    const descContainer = document.getElementById('scenario-description');
    
    if (!select || !downloadBtn || !descContainer) return;

    const scenarioId = select.value;
    
    if (!scenarioId) {
      // Reset to default
      downloadBtn.classList.add('hidden');
      downloadBtn.disabled = true;
      descContainer.innerHTML = `
        <p>
          Select a preset to auto-populate historical data for common resource allocation problems (sales team budgets, 
          channel spend, regional marketing). Each scenario includes fitted models and suggested constraints.
        </p>
      `;
      return;
    }

    const scenario = state.scenarioManifest.find(s => s.id === scenarioId);
    if (!scenario) return;

    // Show download button and description
    downloadBtn.classList.remove('hidden');
    downloadBtn.disabled = false;
    
    descContainer.innerHTML = `
      <div class="scenario-detail">
        <h4>${escapeHtml(scenario.name)}</h4>
        ${scenario.description}
        <div style="margin-top: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
          <button type="button" id="load-scenario-btn" class="primary">Load & Run Scenario</button>
          <button type="button" id="download-scenario-btn" class="secondary">Download CSV Only</button>
        </div>
        <p class="muted" style="margin-top: 8px;">
          "Load & Run" will automatically load data, fit models, and prompt you to optimize. 
          "Download CSV" lets you inspect/edit the data first.
        </p>
      </div>
    `;

    // Set up buttons
    const loadBtn = document.getElementById('load-scenario-btn');
    const downloadOnlyBtn = document.getElementById('download-scenario-btn');
    
    if (loadBtn) {
      loadBtn.onclick = () => loadScenarioDataDirectly(scenario);
    }
    
    if (downloadOnlyBtn) {
      downloadOnlyBtn.onclick = () => downloadScenarioData(scenario);
    }
    
    // Keep old download button functional too
    downloadBtn.onclick = () => downloadScenarioData(scenario);
  }

  function downloadScenarioData(scenario) {
    // Fetch and download the scenario CSV
    fetch(scenario.dataFile)
      .then(response => response.text())
      .then(csv => {
        downloadCSV(`${scenario.id}.csv`, csv);
      })
      .catch(error => {
        console.error('Failed to load scenario data:', error);
        alert('Failed to load scenario data. The file may not exist yet.');
      });
  }

  function loadScenarioDataDirectly(scenario) {
    // Fetch scenario data and process it automatically
    setUploadStatus('Loading scenario data...', '');
    
    fetch(scenario.dataFile)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load scenario data');
        }
        return response.text();
      })
      .then(csv => {
        // Parse the data
        parseUploadedData(csv);
        
        // Apply suggested constraints
        applySuggestedConstraints(scenario.suggestedConstraints);
        
        // Auto-fit models
        setTimeout(() => {
          handleFitModels();
          
          // Show a prompt to run optimization
          setTimeout(() => {
            if (confirm('Scenario loaded successfully! Run optimization now?')) {
              handleOptimize();
            }
          }, 500);
        }, 500);
      })
      .catch(error => {
        console.error('Failed to load scenario:', error);
        setUploadStatus('Failed to load scenario data. Please download CSV and upload manually.', 'error');
      });
  }

  function applySuggestedConstraints(constraints) {
    if (!constraints) return;

    // Apply suggested constraints to the form
    if (constraints.totalBudget !== undefined) {
      const el = document.getElementById('total-budget');
      if (el) el.value = constraints.totalBudget;
    }

    if (constraints.minPerResource !== undefined) {
      const el = document.getElementById('min-per-resource');
      if (el) el.value = constraints.minPerResource;
    }

    if (constraints.maxPerResource !== undefined) {
      const el = document.getElementById('max-per-resource');
      if (el) el.value = constraints.maxPerResource;
    }

    if (constraints.integerConstraint !== undefined) {
      const el = document.getElementById('integer-constraint');
      if (el) el.checked = constraints.integerConstraint;
    }

    // Advanced constraints
    if (constraints.cardinalityEnabled !== undefined) {
      const check = document.getElementById('cardinality-constraint');
      if (check) {
        check.checked = constraints.cardinalityEnabled;
        check.dispatchEvent(new Event('change'));
      }
      
      if (constraints.minResources !== undefined) {
        const el = document.getElementById('min-resources');
        if (el) el.value = constraints.minResources;
      }
      
      if (constraints.maxResources !== undefined) {
        const el = document.getElementById('max-resources');
        if (el) el.value = constraints.maxResources;
      }
    }

    if (constraints.equityEnabled !== undefined) {
      const check = document.getElementById('equity-constraint');
      if (check) {
        check.checked = constraints.equityEnabled;
        check.dispatchEvent(new Event('change'));
      }
      
      if (constraints.equityRatio !== undefined) {
        const el = document.getElementById('equity-ratio');
        if (el) el.value = constraints.equityRatio;
      }
    }

    if (constraints.baselineEnabled !== undefined) {
      const check = document.getElementById('baseline-constraint');
      if (check) {
        check.checked = constraints.baselineEnabled;
        check.dispatchEvent(new Event('change'));
      }
      
      if (constraints.baselineDeviation !== undefined) {
        const el = document.getElementById('baseline-deviation');
        if (el) el.value = constraints.baselineDeviation;
      }
    }

    // Update state
    updateConstraints();
  }

  // Make functions globally accessible for inline onclick handlers
  window.loadScenario = function(idx) {
    const scenario = state.savedScenarios[idx];
    if (!scenario) return;
    state.optimizationResult = scenario.result;
    state.constraints = scenario.constraints;
    displayOptimizationResults(scenario.result);
    displayDiagnostics(scenario.result);
    alert(`Loaded scenario: ${scenario.name}`);
  };

  window.deleteScenario = function(idx) {
    if (!confirm('Delete this scenario?')) return;
    state.savedScenarios.splice(idx, 1);
    updateSavedScenariosList();
  };

})();
