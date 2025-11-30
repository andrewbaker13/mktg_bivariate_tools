/**
 * Multiple Regression with Interactions & Non-Linear Effects
 * mlr_interactions_app.js
 */

(function () {
  'use strict';
  
  // Reference to shared utilities
  const StatsUtils = window.StatsUtils || {};

  // Usage tracking
  const pageLoadTime = Date.now();
  let hasSuccessfulRun = false;

  // Usage tracking function
  function checkAndTrackUsage() {
    const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
    if (timeOnPage < 0.167) return; // 10 seconds for testing (change back to 3 for production)
    if (!hasSuccessfulRun) return;
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
    
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `tool-tracked-mlr-interactions-${today}`;
    if (localStorage.getItem(storageKey)) return;
    
    if (typeof logToolUsage === 'function') {
      const trackingData = {
        interactionType: state.interactionType,
        centerContinuous: state.centerContinuous,
        numPredictors: state.predictors.length
      };
      const scenario = state.scenarioData.length > 0 ? state.scenarioData[0].name : null;
      const dataSource = state.scenarioData.length > 0 ? 'scenario' : 'manual';
      
      logToolUsage('mlr-interactions', trackingData, `MLR Interactions analysis completed`, {
        scenario: scenario,
        dataSource: dataSource
      });
      localStorage.setItem(storageKey, 'true');
      console.log('Usage tracked for MLR Interactions');
    }
  }

  // Track usage on page unload
  window.addEventListener('beforeunload', checkAndTrackUsage);

  // Global state
  const state = {
    rawData: [],
    parsedData: [],
    outcome: null,
    predictors: [],
    predictorSettings: {}, // Store type and reference level for each predictor
    columnMeta: {}, // Store metadata about each column
    alpha: 0.05,
    interactionType: 'none', // 'none', 'cont_cont', 'cont_cat', 'cat_cat', 'quadratic'
    focal: null,
    moderator: null,
    quadraticVar: null,
    centerContinuous: true,
    showConfidenceBands: true,
    scenarioData: [],
    lastModel: null
  };

  // Matrix operations
  function transpose(mat) {
    if (!mat || mat.length === 0) return [];
    return mat[0].map((_, colIndex) => mat.map(row => row[colIndex]));
  }

  function multiplyMatrices(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        for (let k = 0; k < colsA; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }

  function invertMatrix(mat) {
    const n = mat.length;
    const augmented = mat.map((row, i) =>
      row.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
    );

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) maxRow = k;
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) throw new Error('Matrix is singular');
      for (let j = 0; j < 2 * n; j++) augmented[i][j] /= pivot;

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }
    return augmented.map(row => row.slice(n));
  }

  // Statistical functions
  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function stdDev(arr) {
    const m = mean(arr);
    const variance = arr.reduce((sum, val) => sum + (val - m) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  function quantile(arr, q) {
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  }

  // Build design matrix with interactions/quadratic
  function buildDesignMatrix(data, predictors, interactionConfig) {
    const n = data.length;
    const designMatrix = [];
    const columnNames = ['Intercept'];
    
    // Track which predictors need centering
    const continuousVars = {};
    predictors.forEach(p => {
      if (p.type === 'numeric') {
        const values = data.map(d => d[p.name]);
        continuousVars[p.name] = {
          values: values,
          mean: mean(values),
          sd: stdDev(values)
        };
      }
    });

    const result = buildDesignMatrixCore(data, predictors, interactionConfig, continuousVars, columnNames);
    return { matrix: result.matrix, names: result.columnNames, continuousVars };
  }

  // Build design matrix for prediction using pre-computed continuousVars from training
  function buildDesignMatrixForPrediction(data, predictors, interactionConfig, continuousVars) {
    const columnNames = ['Intercept'];
    const result = buildDesignMatrixCore(data, predictors, interactionConfig, continuousVars, columnNames);
    return { matrix: result.matrix, names: result.columnNames };
  }

  // Core design matrix building logic
  function buildDesignMatrixCore(data, predictors, interactionConfig, continuousVars, columnNames) {
    const n = data.length;
    const designMatrix = [];

    // Helper to get centered or raw value
    function getValue(row, predName, shouldCenter) {
      const pred = predictors.find(p => p.name === predName);
      if (pred.type === 'numeric') {
        const rawVal = row[predName];
        if (shouldCenter && state.centerContinuous) {
          return rawVal - continuousVars[predName].mean;
        }
        return rawVal;
      }
      return row[predName]; // categorical - return as-is
    }

    // Build rows
    for (let i = 0; i < n; i++) {
      const row = [1]; // intercept
      
      // Main effects
      predictors.forEach(pred => {
        if (pred.type === 'numeric') {
          // Check if this predictor is involved in interaction
          const involvedInInteraction = 
            (interactionConfig.focal === pred.name || interactionConfig.moderator === pred.name || interactionConfig.quadraticVar === pred.name);
          row.push(getValue(data[i], pred.name, involvedInInteraction));
        } else {
          // Categorical: use dummy coding
          pred.levels.slice(1).forEach(level => {
            row.push(data[i][pred.name] === level ? 1 : 0);
          });
        }
      });

      // Interaction or quadratic term
      if (interactionConfig.type === 'cont_cont') {
        const val1 = getValue(data[i], interactionConfig.focal, true);
        const val2 = getValue(data[i], interactionConfig.moderator, true);
        row.push(val1 * val2);
      } else if (interactionConfig.type === 'cont_cat') {
        // Interaction: continuous × categorical
        const contVar = interactionConfig.focal;
        const catVar = interactionConfig.moderator;
        // Determine which is which
        let continuous, categorical;
        const focalPred = predictors.find(p => p.name === interactionConfig.focal);
        if (focalPred.type === 'numeric') {
          continuous = interactionConfig.focal;
          categorical = interactionConfig.moderator;
        } else {
          continuous = interactionConfig.moderator;
          categorical = interactionConfig.focal;
        }
        
        const contVal = getValue(data[i], continuous, true);
        const catPred = predictors.find(p => p.name === categorical);
        catPred.levels.slice(1).forEach(level => {
          const catDummy = data[i][categorical] === level ? 1 : 0;
          row.push(contVal * catDummy);
        });
      } else if (interactionConfig.type === 'cat_cat') {
        // Categorical × categorical interaction
        const cat1 = predictors.find(p => p.name === interactionConfig.focal);
        const cat2 = predictors.find(p => p.name === interactionConfig.moderator);
        
        cat1.levels.slice(1).forEach(level1 => {
          cat2.levels.slice(1).forEach(level2 => {
            const dummy1 = data[i][cat1.name] === level1 ? 1 : 0;
            const dummy2 = data[i][cat2.name] === level2 ? 1 : 0;
            row.push(dummy1 * dummy2);
          });
        });
      } else if (interactionConfig.type === 'quadratic') {
        const val = getValue(data[i], interactionConfig.quadraticVar, true);
        row.push(val * val);
      }

      designMatrix.push(row);
    }

    // Build column names
    predictors.forEach(pred => {
      if (pred.type === 'numeric') {
        columnNames.push(pred.name);
      } else {
        pred.levels.slice(1).forEach(level => {
          columnNames.push(`${pred.name}_${level}`);
        });
      }
    });

    // Add interaction/quadratic term names
    if (interactionConfig.type === 'cont_cont') {
      columnNames.push(`${interactionConfig.focal} × ${interactionConfig.moderator}`);
    } else if (interactionConfig.type === 'cont_cat') {
      const focalPred = predictors.find(p => p.name === interactionConfig.focal);
      let continuous, categorical;
      if (focalPred.type === 'numeric') {
        continuous = interactionConfig.focal;
        categorical = interactionConfig.moderator;
      } else {
        continuous = interactionConfig.moderator;
        categorical = interactionConfig.focal;
      }
      const catPred = predictors.find(p => p.name === categorical);
      catPred.levels.slice(1).forEach(level => {
        columnNames.push(`${continuous} × ${categorical}_${level}`);
      });
    } else if (interactionConfig.type === 'cat_cat') {
      const cat1 = predictors.find(p => p.name === interactionConfig.focal);
      const cat2 = predictors.find(p => p.name === interactionConfig.moderator);
      cat1.levels.slice(1).forEach(level1 => {
        cat2.levels.slice(1).forEach(level2 => {
          columnNames.push(`${cat1.name}_${level1} × ${cat2.name}_${level2}`);
        });
      });
    } else if (interactionConfig.type === 'quadratic') {
      columnNames.push(`${interactionConfig.quadraticVar}²`);
    }

    return { matrix: designMatrix, columnNames };
  }

  // Fit regression model
  function fitRegression() {
    const interactionConfig = {
      type: state.interactionType,
      focal: state.focal,
      moderator: state.moderator,
      quadraticVar: state.quadraticVar
    };

    const { matrix: X, names: columnNames, continuousVars } = buildDesignMatrix(
      state.parsedData,
      state.predictors,
      interactionConfig
    );

    const y = state.parsedData.map(d => d[state.outcome]);
    const n = y.length;
    const k = columnNames.length - 1; // exclude intercept from df count

    // (X'X)^-1 X'y
    const Xt = transpose(X);
    const XtX = multiplyMatrices(Xt, X);
    const XtX_inv = invertMatrix(XtX);
    const Xty = multiplyMatrices(Xt, y.map(v => [v]));
    const beta = multiplyMatrices(XtX_inv, Xty).map(row => row[0]);

    // Fitted values and residuals
    const yHat = X.map(row => row.reduce((sum, val, idx) => sum + val * beta[idx], 0));
    const residuals = y.map((val, i) => val - yHat[i]);

    // SSE, SST, R²
    const yMean = mean(y);
    const SSE = residuals.reduce((sum, r) => sum + r * r, 0);
    const SST = y.reduce((sum, val) => sum + (val - yMean) ** 2, 0);
    const SSR = SST - SSE;
    const R2 = SSR / SST;
    const adjR2 = 1 - ((1 - R2) * (n - 1)) / (n - k - 1);

    // MSE, RMSE, MAE
    const MSE = SSE / (n - k - 1);
    const RMSE = Math.sqrt(MSE);
    const MAE = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n;

    // Standard errors
    const varCovar = XtX_inv.map(row => row.map(val => val * MSE));
    const SE = beta.map((_, i) => Math.sqrt(varCovar[i][i]));

    // t-statistics
    const tStats = beta.map((b, i) => b / SE[i]);

    // p-values (two-tailed)
    const pValues = tStats.map(t => {
      const p = 2 * (1 - tCDF(Math.abs(t), n - k - 1));
      return p;
    });

    // Confidence intervals
    const tCrit = tInv(1 - state.alpha / 2, n - k - 1);
    const CI = beta.map((b, i) => [b - tCrit * SE[i], b + tCrit * SE[i]]);

    // Model F-test
    const MSR = SSR / k;
    const F = MSR / MSE;
    const pModel = 1 - fCDF(F, k, n - k - 1);

    // VIF calculation
    const VIF = [];
    for (let j = 1; j < beta.length; j++) {
      const Xj = X.map(row => row[j]);
      const XminusJ = X.map(row => row.filter((_, idx) => idx !== j));
      try {
        const XtX_j = multiplyMatrices(transpose(XminusJ), XminusJ);
        const XtX_inv_j = invertMatrix(XtX_j);
        const Xty_j = multiplyMatrices(transpose(XminusJ), Xj.map(v => [v]));
        const beta_j = multiplyMatrices(XtX_inv_j, Xty_j).map(row => row[0]);
        const yHat_j = XminusJ.map(row => row.reduce((sum, val, idx) => sum + val * beta_j[idx], 0));
        const SST_j = Xj.reduce((sum, val) => sum + (val - mean(Xj)) ** 2, 0);
        const SSE_j = Xj.reduce((sum, val, i) => sum + (val - yHat_j[i]) ** 2, 0);
        const R2_j = 1 - SSE_j / SST_j;
        VIF.push(1 / (1 - R2_j));
      } catch (e) {
        VIF.push(NaN);
      }
    }

    return {
      beta,
      SE,
      tStats,
      pValues,
      CI,
      R2,
      adjR2,
      F,
      pModel,
      RMSE,
      MAE,
      n,
      k,
      yHat,
      residuals,
      columnNames,
      VIF,
      continuousVars,
      varCovar,
      df: n - k - 1,
      MSE
    };
  }

  // t-distribution CDF (approximation)
  function tCDF(t, df) {
    const x = df / (df + t * t);
    return 1 - 0.5 * betaInc(x, df / 2, 0.5);
  }

  // Inverse t-distribution
  function tInv(p, df) {
    // Binary search
    let low = -10, high = 10;
    while (high - low > 1e-6) {
      const mid = (low + high) / 2;
      if (tCDF(mid, df) < p) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  }

  // F-distribution CDF
  function fCDF(f, d1, d2) {
    const x = d2 / (d2 + d1 * f);
    return 1 - betaInc(x, d2 / 2, d1 / 2);
  }

  // Beta incomplete function (approximation)
  function betaInc(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(
      gammaLn(a + b) - gammaLn(a) - gammaLn(b) + a * Math.log(x) + b * Math.log(1 - x)
    );
    if (x < (a + 1) / (a + b + 2)) {
      return (bt * betaCF(x, a, b)) / a;
    }
    return 1 - (bt * betaCF(1 - x, b, a)) / b;
  }

  function betaCF(x, a, b) {
    const maxIter = 100;
    const eps = 3e-7;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - (qab * x) / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= maxIter; m++) {
      const m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < eps) break;
    }
    return h;
  }

  function gammaLn(x) {
    const cof = [
      76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
    ];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += cof[j] / ++y;
    return -tmp + Math.log((2.5066282746310005 * ser) / x);
  }

  // Update UI with results
  function updateResults(results) {
    // Metrics
    document.getElementById('metric-r2').textContent = results.R2.toFixed(4);
    document.getElementById('metric-adj-r2').textContent = results.adjR2.toFixed(4);
    document.getElementById('metric-f').textContent = `${results.F.toFixed(2)}`;
    document.getElementById('metric-pmodel').textContent = results.pModel < 0.001 ? '< .001' : results.pModel.toFixed(4);
    document.getElementById('metric-rmse').textContent = results.RMSE.toFixed(2);
    document.getElementById('metric-mae').textContent = results.MAE.toFixed(2);
    document.getElementById('metric-n').textContent = results.n;
    document.getElementById('metric-alpha').textContent = state.alpha;

    // Regression equation
    let equation = `Ŷ = ${results.beta[0].toFixed(2)}`;
    for (let i = 1; i < results.beta.length; i++) {
      const coef = results.beta[i];
      const sign = coef >= 0 ? '+' : '';
      equation += ` ${sign} ${coef.toFixed(2)}(${results.columnNames[i]})`;
    }
    document.getElementById('regression-equation-output').textContent = equation;
    
    // Add note about mean-centering if applicable
    const equationNote = document.getElementById('regression-equation-note');
    if (equationNote) {
      if (state.centerContinuous && state.interactionType !== 'none') {
        const centeredVars = [];
        const varMeans = {};
        if (state.focal && state.predictors.find(p => p.name === state.focal && p.type === 'numeric')) {
          centeredVars.push(state.focal);
          varMeans[state.focal] = results.continuousVars[state.focal].mean;
        }
        if (state.moderator && state.predictors.find(p => p.name === state.moderator && p.type === 'numeric')) {
          centeredVars.push(state.moderator);
          varMeans[state.moderator] = results.continuousVars[state.moderator].mean;
        }
        if (state.quadraticVar) {
          centeredVars.push(state.quadraticVar);
          varMeans[state.quadraticVar] = results.continuousVars[state.quadraticVar].mean;
        }
        
        if (centeredVars.length > 0) {
          const meansList = centeredVars.map(v => `${v} = ${varMeans[v].toFixed(2)}`).join(', ');
          equationNote.innerHTML = `<strong>⚠️ Mean-Centering Note:</strong> ${centeredVars.join(', ')} ${centeredVars.length > 1 ? 'are' : 'is'} centered (mean${centeredVars.length > 1 ? 's' : ''}: ${meansList}). <strong>To use this equation:</strong> Plug in the <em>centered</em> values. For example, if ${centeredVars[0]} = ${(varMeans[centeredVars[0]] + 100).toFixed(0)}, use ${(varMeans[centeredVars[0]] + 100 - varMeans[centeredVars[0]]).toFixed(0)} in the equation.`;
          equationNote.style.display = 'block';
        } else {
          equationNote.style.display = 'none';
        }
      } else {
        equationNote.style.display = 'none';
      }
    }

    // Coefficient table
    const tbody = document.getElementById('coef-table-body');
    tbody.innerHTML = '';
    results.columnNames.forEach((name, i) => {
      const row = tbody.insertRow();
      row.insertCell().textContent = i === 0 ? 'Intercept' : name.split('_')[0];
      row.insertCell().textContent = name;
      row.insertCell().textContent = results.beta[i].toFixed(4);
      row.insertCell().textContent = results.SE[i].toFixed(4);
      row.insertCell().textContent = results.tStats[i].toFixed(3);
      const pCell = row.insertCell();
      pCell.textContent = results.pValues[i] < 0.001 ? '< .001' : results.pValues[i].toFixed(4);
      if (results.pValues[i] < state.alpha) pCell.style.fontWeight = 'bold';
      row.insertCell().textContent = results.CI[i][0].toFixed(4);
      row.insertCell().textContent = results.CI[i][1].toFixed(4);
    });

    // Update CI headers
    const confLevel = ((1 - state.alpha) * 100).toFixed(0);
    document.getElementById('coef-ci-lower-header').textContent = `${confLevel}% CI Lower`;
    document.getElementById('coef-ci-upper-header').textContent = `${confLevel}% CI Upper`;

    // Summary statistics
    renderSummaryStats(results);

    // APA report
    generateAPAReport(results);

    // Managerial report
    generateManagerialReport(results);
    
    // Mark successful run for usage tracking
    hasSuccessfulRun = true;
    
    // Coefficient interpretation
    renderCoefInterpretation(results);

    // Plots
    plotActualFitted(results);
    plotInteraction(results);
    plotResiduals(results);

    // Diagnostics
    generateDiagnostics(results);
  }

  // Generate APA-style report
  function generateAPAReport(results) {
    let report = `A multiple regression analysis was conducted to predict ${state.outcome} from ${state.predictors.length} predictor(s)`;
    
    // Describe the model type
    if (state.interactionType === 'cont_cont') {
      report += `, including the interaction between ${state.focal} and ${state.moderator}`;
    } else if (state.interactionType === 'cont_cat') {
      report += `, including the interaction between ${state.focal} and ${state.moderator} to test for moderation`;
    } else if (state.interactionType === 'cat_cat') {
      report += `, including the interaction between ${state.focal} and ${state.moderator}`;
    } else if (state.interactionType === 'quadratic') {
      report += `, including a quadratic (squared) term for ${state.quadraticVar} to test for curvilinear effects`;
    }
    
    // Overall model fit
    report += `. The overall model was ${results.pModel < state.alpha ? '' : 'not '}significant, <em>F</em>(${results.k}, ${results.n - results.k - 1}) = ${results.F.toFixed(2)}, <em>p</em> ${results.pModel < 0.001 ? '< .001' : `= ${results.pModel.toFixed(3)}`}, <em>R</em>² = ${results.R2.toFixed(3)}, adjusted <em>R</em>² = ${results.adjR2.toFixed(3)}, accounting for ${(results.R2 * 100).toFixed(1)}% of the variance in ${state.outcome}. `;

    // Report on the interaction/quadratic term specifically
    if (state.interactionType === 'cont_cont') {
      const interactionIdx = results.columnNames.findIndex(name => name.includes('×'));
      if (interactionIdx >= 0) {
        const b = results.beta[interactionIdx];
        const t = results.tStats[interactionIdx];
        const p = results.pValues[interactionIdx];
        report += `The interaction term (${results.columnNames[interactionIdx]}) was ${p < state.alpha ? '' : 'not '}significant, <em>b</em> = ${b.toFixed(3)}, <em>t</em>(${results.n - results.k - 1}) = ${t.toFixed(2)}, <em>p</em> ${p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`}. `;
        if (p < state.alpha) {
          report += `This indicates that the relationship between ${state.focal} and ${state.outcome} ${b > 0 ? 'strengthens' : 'weakens'} as ${state.moderator} increases. `;
        } else {
          report += `This suggests the effect of ${state.focal} on ${state.outcome} does not significantly vary as a function of ${state.moderator}. `;
        }
      }
    } else if (state.interactionType === 'cont_cat') {
      const interactionIndices = results.columnNames.map((name, i) => name.includes('×') ? i : -1).filter(i => i >= 0);
      if (interactionIndices.length > 0) {
        const sigInteractions = interactionIndices.filter(i => results.pValues[i] < state.alpha);
        if (sigInteractions.length > 0) {
          report += `The interaction terms were significant (${sigInteractions.map(i => `<em>p</em> ${results.pValues[i] < 0.001 ? '< .001' : `= ${results.pValues[i].toFixed(3)}`}`).join(', ')}), indicating that the effect of ${state.focal} on ${state.outcome} differs significantly across levels of ${state.moderator}. `;
          report += `Simple slopes analysis (see plot) reveals the specific nature of this moderation. `;
        } else {
          report += `The interaction terms were not statistically significant, suggesting that the slope of ${state.focal} does not vary meaningfully across ${state.moderator} categories. `;
        }
      }
    } else if (state.interactionType === 'cat_cat') {
      const interactionIndices = results.columnNames.map((name, i) => name.includes('×') ? i : -1).filter(i => i >= 0);
      if (interactionIndices.length > 0) {
        const sigInteractions = interactionIndices.filter(i => results.pValues[i] < state.alpha);
        if (sigInteractions.length > 0) {
          report += `Significant interaction effects were found, indicating that the combined effect of ${state.focal} and ${state.moderator} on ${state.outcome} is not simply additive. `;
        } else {
          report += `No significant interaction was detected, suggesting the effects of ${state.focal} and ${state.moderator} are largely independent. `;
        }
      }
    } else if (state.interactionType === 'quadratic') {
      const linearIdx = results.columnNames.indexOf(state.quadraticVar);
      const quadIdx = results.columnNames.findIndex(name => name.includes('²'));
      if (quadIdx >= 0) {
        const b2 = results.beta[quadIdx];
        const t2 = results.tStats[quadIdx];
        const p2 = results.pValues[quadIdx];
        report += `The quadratic term (${state.quadraticVar}²) was ${p2 < state.alpha ? '' : 'not '}significant, <em>b</em> = ${b2.toFixed(3)}, <em>t</em>(${results.n - results.k - 1}) = ${t2.toFixed(2)}, <em>p</em> ${p2 < 0.001 ? '< .001' : `= ${p2.toFixed(3)}`}. `;
        if (p2 < state.alpha) {
          const b1 = results.beta[linearIdx];
          const turningPoint = -b1 / (2 * b2);
          report += `The ${b2 < 0 ? 'negative' : 'positive'} coefficient indicates ${b2 < 0 ? 'an inverted U-shaped (concave) relationship, suggesting diminishing returns' : 'a U-shaped (convex) relationship'}. `;
          report += `The estimated turning point occurs at ${state.quadraticVar} = ${turningPoint.toFixed(2)}`;
          if (state.centerContinuous) {
            const actualTurningPoint = turningPoint + results.continuousVars[state.quadraticVar].mean;
            report += ` (centered value; raw value ≈ ${actualTurningPoint.toFixed(2)})`;
          }
          report += `. `;
        } else {
          report += `This suggests a linear relationship is sufficient to describe the effect of ${state.quadraticVar} on ${state.outcome}. `;
        }
      }
    }

    // Report main effects if interaction is not significant or for context
    const mainEffects = [];
    results.columnNames.slice(1).forEach((name, i) => {
      if (!name.includes('×') && !name.includes('²') && results.pValues[i + 1] < state.alpha) {
        mainEffects.push(`${name} (<em>b</em> = ${results.beta[i + 1].toFixed(3)}, <em>p</em> ${results.pValues[i + 1] < 0.001 ? '< .001' : `= ${results.pValues[i + 1].toFixed(3)}`})`);
      }
    });
    if (mainEffects.length > 0) {
      report += `Significant main effects were observed for: ${mainEffects.join('; ')}. `;
    }

    document.getElementById('apa-report').innerHTML = report;
  }

  // Render summary statistics
  function renderSummaryStats(results) {
    const numericBody = document.getElementById('numeric-summary-body');
    const catBody = document.getElementById('categorical-summary-body');
    
    if (numericBody) {
      const numericVars = [state.outcome, ...state.predictors.filter(p => p.type === 'numeric').map(p => p.name)];
      const rowsOut = [];
      let hasCenteredVars = false;
      
      numericVars.forEach(varName => {
        const values = state.parsedData.map(d => d[varName]).filter(v => Number.isFinite(v));
        if (!values.length) return;
        
        const mean = StatsUtils.mean(values);
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        const sd = StatsUtils.standardDeviation(values);
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        // Check if this variable is involved in interaction and thus centered
        const isCentered = state.centerContinuous && state.interactionType !== 'none' && 
          (varName === state.focal || varName === state.moderator || varName === state.quadraticVar);
        
        if (isCentered) hasCenteredVars = true;
        
        rowsOut.push(`<tr>
          <td>${varName}${isCentered ? '*' : ''}</td>
          <td>${mean.toFixed(3)}</td>
          <td>${median.toFixed(3)}</td>
          <td>${sd.toFixed(3)}</td>
          <td>${min.toFixed(3)}</td>
          <td>${max.toFixed(3)}</td>
        </tr>`);
      });
      
      if (hasCenteredVars) {
        rowsOut.push(`<tr><td colspan="6" class="muted" style="font-size: 0.9em; padding-top: 0.5em;">* Mean-centered in the model for interaction terms</td></tr>`);
      }
      
      numericBody.innerHTML = rowsOut.length ? rowsOut.join('') : '<tr><td colspan="6">No numeric variables to summarize.</td></tr>';
    }
    
    if (catBody) {
      const catPredictors = state.predictors.filter(p => p.type === 'categorical');
      const rowsOut = [];
      
      catPredictors.forEach(pred => {
        const counts = new Map();
        state.parsedData.forEach(d => {
          const level = d[pred.name] || '(missing)';
          counts.set(level, (counts.get(level) || 0) + 1);
        });
        
        const total = state.parsedData.length || 1;
        Array.from(counts.entries()).forEach(([level, count]) => {
          rowsOut.push(`<tr>
            <td>${pred.name}</td>
            <td>${level}</td>
            <td>${((count / total) * 100).toFixed(2)}%</td>
          </tr>`);
        });
      });
      
      catBody.innerHTML = rowsOut.length ? rowsOut.join('') : '<tr><td colspan="3">No categorical variables to summarize.</td></tr>';
    }
  }

  // Generate managerial interpretation
  function generateManagerialReport(results) {
    let report = `<strong>Model Performance:</strong> This model explains ${(results.R2 * 100).toFixed(1)}% of the variance in ${state.outcome}${results.R2 > 0.6 ? ' (strong predictive power)' : results.R2 > 0.3 ? ' (moderate predictive power)' : ' (weak predictive power)'}. `;

    if (state.interactionType === 'cont_cont') {
      const interactionIdx = results.columnNames.findIndex(name => name.includes('×'));
      if (interactionIdx >= 0) {
        if (results.pValues[interactionIdx] < state.alpha) {
          const b = results.beta[interactionIdx];
          report += `<br><br><strong>Key Insight (Interaction Effect):</strong> The relationship between ${state.focal} and ${state.outcome} is <em>moderated</em> by ${state.moderator}. `;
          report += `Specifically, when ${state.moderator} is higher, each unit increase in ${state.focal} has a ${b > 0 ? 'stronger positive' : 'weaker (or more negative)'} effect on ${state.outcome}. `;
          report += `<br><br><strong>Action:</strong> Rather than applying a uniform strategy, segment your approach: `;
          report += `When ${state.moderator} is high, ${b > 0 ? 'intensify' : 'reduce'} efforts on ${state.focal}. `;
          report += `When ${state.moderator} is low, ${b > 0 ? 'the return on' : 'focus less on'} ${state.focal} ${b > 0 ? 'will be diminished' : 'will be relatively better'}. `;
          report += `Examine the interaction plot to identify optimal combinations.`;
        } else {
          report += `<br><br><strong>Finding:</strong> The interaction between ${state.focal} and ${state.moderator} was not significant. `;
          report += `This means the effect of ${state.focal} on ${state.outcome} is consistent regardless of ${state.moderator} levels. `;
          report += `<br><br><strong>Action:</strong> A single, standardized strategy for ${state.focal} can be applied uniformly without needing to adjust for ${state.moderator}.`;
        }
      }
    } else if (state.interactionType === 'cont_cat') {
      const interactionIndices = results.columnNames.map((name, i) => name.includes('×') ? i : -1).filter(i => i >= 0);
      if (interactionIndices.length > 0) {
        const sigInteractions = interactionIndices.filter(i => results.pValues[i] < state.alpha);
        if (sigInteractions.length > 0) {
          report += `<br><br><strong>Key Insight (Moderation Effect):</strong> The effectiveness of ${state.focal} on ${state.outcome} <em>varies significantly across different levels of ${state.moderator}</em>. `;
          report += `This is a classic moderation pattern—context matters. `;
          report += `<br><br><strong>Action:</strong> <ol>`;
          report += `<li><strong>Examine the interaction plot</strong> to identify which ${state.moderator} categories show the steepest slopes (highest ROI for ${state.focal}).</li>`;
          report += `<li><strong>Prioritize resources:</strong> Allocate more of your ${state.focal} budget/effort toward the ${state.moderator} segments where it has the strongest effect.</li>`;
          report += `<li><strong>Avoid one-size-fits-all:</strong> Recognize that ${state.focal} strategies that work well in one ${state.moderator} context may underperform in another.</li>`;
          report += `</ol>`;
        } else {
          report += `<br><br><strong>Finding:</strong> The interaction between ${state.focal} and ${state.moderator} was not significant. `;
          report += `The slope of ${state.focal} is similar across all ${state.moderator} categories. `;
          report += `<br><br><strong>Action:</strong> You can apply a consistent ${state.focal} strategy across all ${state.moderator} groups without concern for differential effects.`;
        }
      }
    } else if (state.interactionType === 'cat_cat') {
      const interactionIndices = results.columnNames.map((name, i) => name.includes('×') ? i : -1).filter(i => i >= 0);
      if (interactionIndices.length > 0) {
        const sigInteractions = interactionIndices.filter(i => results.pValues[i] < state.alpha);
        if (sigInteractions.length > 0) {
          report += `<br><br><strong>Key Insight (Synergistic Effect):</strong> Certain combinations of ${state.focal} and ${state.moderator} produce effects that are not simply the sum of their individual parts. `;
          report += `<br><br><strong>Action:</strong> Examine the interaction plot to identify which specific combinations drive the highest ${state.outcome}. Prioritize those combinations in your strategy.`;
        } else {
          report += `<br><br><strong>Finding:</strong> The effects of ${state.focal} and ${state.moderator} appear to be independent (additive). `;
          report += `<br><br><strong>Action:</strong> Optimize each factor separately rather than focusing on specific combinations.`;
        }
      }
    } else if (state.interactionType === 'quadratic') {
      const linearIdx = results.columnNames.indexOf(state.quadraticVar);
      const quadIdx = results.columnNames.findIndex(name => name.includes('²'));
      if (quadIdx >= 0) {
        if (results.pValues[quadIdx] < state.alpha) {
          const b1 = results.beta[linearIdx];
          const b2 = results.beta[quadIdx];
          const turningPoint = -b1 / (2 * b2);
          const actualTurningPoint = state.centerContinuous ? turningPoint + results.continuousVars[state.quadraticVar].mean : turningPoint;
          
          if (b2 < 0) {
            // Inverted U: Diminishing returns
            report += `<br><br><strong>Key Insight (Diminishing Returns):</strong> There is an optimal level of ${state.quadraticVar}. `;
            report += `Initially, increasing ${state.quadraticVar} boosts ${state.outcome}, but beyond a certain point (≈ ${actualTurningPoint.toFixed(2)}), further increases lead to <em>declining</em> ${state.outcome}. `;
            report += `<br><br><strong>Action:</strong> <ul>`;
            report += `<li><strong>Target the sweet spot:</strong> Aim for ${state.quadraticVar} values near ${actualTurningPoint.toFixed(2)} to maximize ${state.outcome}.</li>`;
            report += `<li><strong>Avoid over-investment:</strong> Going beyond this point wastes resources and may harm performance.</li>`;
            report += `<li><strong>Example applications:</strong> Optimal ad frequency (too much causes fatigue), ideal price point (too high kills demand), best training hours (too many cause burnout).</li>`;
            report += `</ul>`;
          } else {
            // U-shape: Accelerating or avoid middle
            report += `<br><br><strong>Key Insight (U-Shaped Relationship):</strong> Middle values of ${state.quadraticVar} (around ${actualTurningPoint.toFixed(2)}) are associated with the <em>lowest</em> ${state.outcome}. `;
            report += `Performance improves at either extreme—both low and high values of ${state.quadraticVar} yield better results. `;
            report += `<br><br><strong>Action:</strong> <ul>`;
            report += `<li><strong>Avoid the middle:</strong> The "danger zone" is around ${actualTurningPoint.toFixed(2)}.</li>`;
            report += `<li><strong>Choose a pole:</strong> If feasible, commit to either low or high ${state.quadraticVar} strategies rather than moderate levels.</li>`;
            report += `<li><strong>Example applications:</strong> Pricing (avoid mid-range; go budget or premium), messaging tone (go subtle or bold; moderate doesn't resonate).</li>`;
            report += `</ul>`;
          }
        } else {
          report += `<br><br><strong>Finding:</strong> The quadratic effect for ${state.quadraticVar} was not significant. The relationship appears to be linear rather than curved. `;
          report += `<br><br><strong>Action:</strong> You can treat ${state.quadraticVar} as having a consistent, linear effect on ${state.outcome}—no need to worry about optimal points or diminishing returns.`;
        }
      }
    }

    // Add context about main effects if relevant
    const sigMainEffects = results.columnNames.slice(1).filter((name, i) => 
      !name.includes('×') && !name.includes('²') && results.pValues[i + 1] < state.alpha
    );
    if (sigMainEffects.length > 0 && state.interactionType !== 'none') {
      report += `<br><br><strong>Other Significant Predictors:</strong> ${sigMainEffects.map(name => {
        const idx = results.columnNames.indexOf(name);
        const b = results.beta[idx];
        return `${name} (${b > 0 ? 'positive' : 'negative'} effect, <em>b</em> = ${b.toFixed(3)})`;
      }).join(', ')}. `;
    }

    document.getElementById('managerial-report').innerHTML = report;
  }

  // Plot actual vs fitted
  function plotActualFitted(results) {
    const y = state.parsedData.map(d => d[state.outcome]);
    const trace1 = {
      x: results.yHat,
      y: y,
      mode: 'markers',
      type: 'scatter',
      name: 'Actual vs Fitted',
      marker: { color: 'steelblue', size: 6 }
    };
    const trace2 = {
      x: [Math.min(...results.yHat), Math.max(...results.yHat)],
      y: [Math.min(...results.yHat), Math.max(...results.yHat)],
      mode: 'lines',
      type: 'scatter',
      name: '45° line',
      line: { color: 'red', dash: 'dash' }
    };
    const layout = {
      xaxis: { title: 'Fitted values' },
      yaxis: { title: `Actual ${state.outcome}` },
      showlegend: false,
      margin: { t: 30 }
    };
    Plotly.newPlot('plot-actual-fitted', [trace1, trace2], layout, { responsive: true });
  }

  // Plot interaction effect
  function plotInteraction(results) {
    if (state.interactionType === 'none') {
      document.getElementById('interaction-plot-card').style.display = 'none';
      return;
    }
    document.getElementById('interaction-plot-card').style.display = 'block';

    if (state.interactionType === 'cont_cont') {
      plotContinuousContinuous(results);
    } else if (state.interactionType === 'cont_cat') {
      plotContinuousCategorical(results);
    } else if (state.interactionType === 'cat_cat') {
      plotCategoricalCategorical(results);
    } else if (state.interactionType === 'quadratic') {
      plotQuadratic(results);
    }
  }

  // Helper function to predict from model given a data point
  function predictFromModel(dataPoint, model, interactionConfig) {
    // Build a single-row design matrix using the model's continuousVars for proper centering
    const { matrix } = buildDesignMatrixForPrediction([dataPoint], state.predictors, interactionConfig, model.continuousVars);
    if (!matrix || !matrix[0] || !model.beta) return NaN;
    
    // Multiply design matrix row by coefficient vector
    let prediction = 0;
    for (let i = 0; i < matrix[0].length && i < model.beta.length; i++) {
      prediction += matrix[0][i] * model.beta[i];
    }
    return prediction;
  }

  // Helper function to predict with standard error for confidence bands
  function predictFromModelWithSE(dataPoint, model, interactionConfig) {
    // Build a single-row design matrix using the model's continuousVars for proper centering
    const { matrix } = buildDesignMatrixForPrediction([dataPoint], state.predictors, interactionConfig, model.continuousVars);
    if (!matrix || !matrix[0] || !model.beta || !model.varCovar) return { prediction: NaN, se: NaN };
    
    const x = matrix[0];
    
    // Multiply design matrix row by coefficient vector
    let prediction = 0;
    for (let i = 0; i < x.length && i < model.beta.length; i++) {
      prediction += x[i] * model.beta[i];
    }
    
    // Calculate variance of prediction: Var(ŷ) = x' * Var(β) * x
    // where Var(β) = (X'X)^-1 * MSE
    let variance = 0;
    for (let i = 0; i < x.length; i++) {
      for (let j = 0; j < x.length; j++) {
        variance += x[i] * model.varCovar[i][j] * x[j];
      }
    }
    
    const se = Math.sqrt(variance);
    return { prediction, se };
  }

  // Plot continuous × continuous interaction
  function plotContinuousContinuous(results) {
    document.getElementById('interaction-plot-title').textContent = `${state.focal} × ${state.moderator} Interaction`;
    
    const focalVar = results.continuousVars[state.focal];
    const modVar = results.continuousVars[state.moderator];
    
    // Three levels of moderator: -1SD, mean, +1SD
    const modLevels = [
      { value: modVar.mean - modVar.sd, label: '-1 SD' },
      { value: modVar.mean, label: 'Mean' },
      { value: modVar.mean + modVar.sd, label: '+1 SD' }
    ];
    
    const focalRange = [];
    const focalMin = focalVar.mean - 2 * focalVar.sd;
    const focalMax = focalVar.mean + 2 * focalVar.sd;
    for (let i = 0; i <= 50; i++) {
      focalRange.push(focalMin + (i / 50) * (focalMax - focalMin));
    }
    
    const tCrit = tInv(1 - state.alpha / 2, results.df);
    const traces = [];
    
    modLevels.forEach((modLevel, idx) => {
      const predictions = [];
      const lowerBand = [];
      const upperBand = [];
      
      focalRange.forEach(focalVal => {
        // Create synthetic data point
        const syntheticRow = {};
        state.predictors.forEach(p => {
          if (p.name === state.focal) {
            syntheticRow[p.name] = focalVal;
          } else if (p.name === state.moderator) {
            syntheticRow[p.name] = modLevel.value;
          } else if (p.type === 'numeric') {
            syntheticRow[p.name] = results.continuousVars[p.name].mean;
          } else {
            syntheticRow[p.name] = p.levels[0]; // reference category
          }
        });
        
        // Calculate prediction using the model
        const interactionConfig = {
          type: state.interactionType,
          focal: state.focal,
          moderator: state.moderator,
          quadraticVar: state.quadraticVar
        };
        
        const { prediction, se } = predictFromModelWithSE(syntheticRow, results, interactionConfig);
        predictions.push(prediction);
        lowerBand.push(prediction - tCrit * se);
        upperBand.push(prediction + tCrit * se);
      });
      
      // Main line
      traces.push({
        x: focalRange,
        y: predictions,
        mode: 'lines',
        name: `${state.moderator} at ${modLevel.label}`,
        line: { width: 2 }
      });
      
      // Confidence band
      if (state.showConfidenceBands) {
        traces.push({
          x: focalRange.concat(focalRange.slice().reverse()),
          y: upperBand.concat(lowerBand.slice().reverse()),
          fill: 'toself',
          fillcolor: 'rgba(128,128,128,0.15)',
          line: { width: 0 },
          showlegend: false,
          hoverinfo: 'skip'
        });
      }
    });
    
    const layout = {
      xaxis: { title: state.focal },
      yaxis: { title: `Predicted ${state.outcome}` },
      showlegend: true,
      legend: { x: 0.02, y: 0.98 },
      margin: { t: 30 }
    };
    
    Plotly.newPlot('plot-interaction', traces, layout, { responsive: true });
    
    document.getElementById('interaction-interpretation').textContent = 
      `The plot shows how the effect of ${state.focal} on ${state.outcome} varies depending on the level of ${state.moderator}. ` +
      `Non-parallel lines indicate an interaction effect. If lines cross or diverge substantially, the relationship is highly moderated.`;
  }

  // Plot continuous × categorical interaction
  function plotContinuousCategorical(results) {
    // Determine which is continuous, which is categorical
    const focalPred = state.predictors.find(p => p.name === state.focal);
    const modPred = state.predictors.find(p => p.name === state.moderator);
    
    let continuous, categorical, contPred, catPred;
    if (focalPred.type === 'numeric') {
      continuous = state.focal;
      categorical = state.moderator;
      contPred = focalPred;
      catPred = modPred;
    } else {
      continuous = state.moderator;
      categorical = state.focal;
      contPred = modPred;
      catPred = focalPred;
    }
    
    document.getElementById('interaction-plot-title').textContent = `${continuous} × ${categorical} Interaction`;
    
    const contVar = results.continuousVars[continuous];
    const contRange = [];
    const contMin = contVar.mean - 2 * contVar.sd;
    const contMax = contVar.mean + 2 * contVar.sd;
    for (let i = 0; i <= 50; i++) {
      contRange.push(contMin + (i / 50) * (contMax - contMin));
    }
    
    const tCrit = tInv(1 - state.alpha / 2, results.df);
    const traces = [];
    
    console.log('=== Continuous × Categorical Plotting Debug ===');
    console.log('Continuous variable:', continuous);
    console.log('Categorical variable:', categorical);
    console.log('Categorical levels:', catPred.levels);
    console.log('Model column names:', results.columnNames);
    console.log('Model coefficients:', results.beta);
    
    catPred.levels.forEach((level, levelIdx) => {
      const predictions = [];
      const lowerBand = [];
      const upperBand = [];
      
      console.log(`\n--- Processing level: ${level} (index ${levelIdx}) ---`);
      
      let firstPredLog = true;
      contRange.forEach(contVal => {
        const syntheticRow = {};
        state.predictors.forEach(p => {
          if (p.name === continuous) {
            syntheticRow[p.name] = contVal;
          } else if (p.name === categorical) {
            syntheticRow[p.name] = level;
          } else if (p.type === 'numeric') {
            syntheticRow[p.name] = results.continuousVars[p.name].mean;
          } else {
            syntheticRow[p.name] = p.levels[0];
          }
        });
        
        const interactionConfig = {
          type: state.interactionType,
          focal: state.focal,
          moderator: state.moderator,
          quadraticVar: state.quadraticVar
        };
        
        const { prediction, se } = predictFromModelWithSE(syntheticRow, results, interactionConfig);
        
        if (firstPredLog) {
          console.log(`First prediction for ${level}:`, prediction);
          console.log('Synthetic row:', syntheticRow);
          firstPredLog = false;
        }
        
        predictions.push(prediction);
        lowerBand.push(prediction - tCrit * se);
        upperBand.push(prediction + tCrit * se);
      });
      
      console.log(`${level} - First prediction: ${predictions[0].toFixed(2)}, Last: ${predictions[predictions.length-1].toFixed(2)}`);
      
      // Main line
      traces.push({
        x: contRange,
        y: predictions,
        mode: 'lines',
        name: `${categorical} = ${level}`,
        line: { width: 2 }
      });
      
      // Confidence band
      if (state.showConfidenceBands) {
        traces.push({
          x: contRange.concat(contRange.slice().reverse()),
          y: upperBand.concat(lowerBand.slice().reverse()),
          fill: 'toself',
          fillcolor: 'rgba(128,128,128,0.15)',
          line: { width: 0 },
          showlegend: false,
          hoverinfo: 'skip'
        });
      }
    });
    
    const layout = {
      xaxis: { title: continuous },
      yaxis: { title: `Predicted ${state.outcome}` },
      showlegend: true,
      legend: { x: 0.02, y: 0.98 },
      margin: { t: 30 }
    };
    
    Plotly.newPlot('plot-interaction', traces, layout, { responsive: true });
    
    document.getElementById('interaction-interpretation').textContent = 
      `Each line represents the relationship between ${continuous} and ${state.outcome} within one category of ${categorical}. ` +
      `Different slopes indicate the continuous predictor's effect varies by category.`;
  }

  // Plot categorical × categorical interaction
  function plotCategoricalCategorical(results) {
    document.getElementById('interaction-plot-title').textContent = `${state.focal} × ${state.moderator} Interaction`;
    
    const focalPred = state.predictors.find(p => p.name === state.focal);
    const modPred = state.predictors.find(p => p.name === state.moderator);
    
    const traces = modPred.levels.map(modLevel => {
      const yVals = focalPred.levels.map(focalLevel => {
        const syntheticRow = {};
        state.predictors.forEach(p => {
          if (p.name === state.focal) {
            syntheticRow[p.name] = focalLevel;
          } else if (p.name === state.moderator) {
            syntheticRow[p.name] = modLevel;
          } else if (p.type === 'numeric') {
            syntheticRow[p.name] = results.continuousVars[p.name].mean;
          } else {
            syntheticRow[p.name] = p.levels[0];
          }
        });
        
        const interactionConfig = {
          type: state.interactionType,
          focal: state.focal,
          moderator: state.moderator,
          quadraticVar: state.quadraticVar
        };
        return predictFromModel(syntheticRow, results, interactionConfig);
      });
      
      return {
        x: focalPred.levels,
        y: yVals,
        type: 'bar',
        name: `${state.moderator} = ${modLevel}`
      };
    });
    
    const layout = {
      xaxis: { title: state.focal },
      yaxis: { title: `Predicted ${state.outcome}` },
      barmode: 'group',
      showlegend: true,
      margin: { t: 30 }
    };
    
    Plotly.newPlot('plot-interaction', traces, layout, { responsive: true });
    
    document.getElementById('interaction-interpretation').textContent = 
      `The grouped bars show predicted ${state.outcome} for each combination of ${state.focal} and ${state.moderator}. ` +
      `If the pattern differs across ${state.moderator} levels, an interaction is present.`;
  }

  // Plot quadratic effect
  function plotQuadratic(results) {
    document.getElementById('interaction-plot-title').textContent = `Quadratic Effect: ${state.quadraticVar}`;
    
    const quadVar = results.continuousVars[state.quadraticVar];
    const quadRange = [];
    const quadMin = quadVar.mean - 2.5 * quadVar.sd;
    const quadMax = quadVar.mean + 2.5 * quadVar.sd;
    for (let i = 0; i <= 100; i++) {
      quadRange.push(quadMin + (i / 100) * (quadMax - quadMin));
    }
    
    const tCrit = tInv(1 - state.alpha / 2, results.df);
    const predictions = [];
    const lowerBand = [];
    const upperBand = [];
    
    quadRange.forEach(quadVal => {
      const syntheticRow = {};
      state.predictors.forEach(p => {
        if (p.name === state.quadraticVar) {
          syntheticRow[p.name] = quadVal;
        } else if (p.type === 'numeric') {
          syntheticRow[p.name] = results.continuousVars[p.name].mean;
        } else {
          syntheticRow[p.name] = p.levels[0];
        }
      });
      
      const interactionConfig = {
        type: state.interactionType,
        focal: state.focal,
        moderator: state.moderator,
        quadraticVar: state.quadraticVar
      };
      
      const { prediction, se } = predictFromModelWithSE(syntheticRow, results, interactionConfig);
      predictions.push(prediction);
      lowerBand.push(prediction - tCrit * se);
      upperBand.push(prediction + tCrit * se);
    });
    
    const traces = [];
    
    // Main curve
    traces.push({
      x: quadRange,
      y: predictions,
      mode: 'lines',
      name: 'Predicted values',
      line: { width: 3, color: 'purple' }
    });
    
    // Confidence band
    if (state.showConfidenceBands) {
      traces.push({
        x: quadRange.concat(quadRange.slice().reverse()),
        y: upperBand.concat(lowerBand.slice().reverse()),
        fill: 'toself',
        fillcolor: 'rgba(128,128,128,0.15)',
        line: { width: 0 },
        showlegend: false,
        hoverinfo: 'skip'
      });
    }
    
    // Calculate turning point
    const linearIdx = results.columnNames.indexOf(state.quadraticVar);
    const quadIdx = results.columnNames.findIndex(name => name.includes('²'));
    const beta1 = results.beta[linearIdx];
    const beta2 = results.beta[quadIdx];
    const turningPoint = -beta1 / (2 * beta2);
    
    // Add turning point marker
    const turningPred = (() => {
      const syntheticRow = {};
      state.predictors.forEach(p => {
        if (p.name === state.quadraticVar) {
          syntheticRow[p.name] = turningPoint;
        } else if (p.type === 'numeric') {
          syntheticRow[p.name] = results.continuousVars[p.name].mean;
        } else {
          syntheticRow[p.name] = p.levels[0];
        }
      });
      const interactionConfig = {
        type: state.interactionType,
        focal: state.focal,
        moderator: state.moderator,
        quadraticVar: state.quadraticVar
      };
      return predictFromModel(syntheticRow, results, interactionConfig);
    })();
    
    // Turning point marker
    traces.push({
      x: [turningPoint],
      y: [turningPred],
      mode: 'markers',
      name: 'Turning point',
      marker: { size: 12, color: 'red', symbol: 'star' }
    });
    
    const layout = {
      xaxis: { title: state.quadraticVar },
      yaxis: { title: `Predicted ${state.outcome}` },
      showlegend: true,
      annotations: [{
        x: turningPoint,
        y: turningPred,
        text: `Turning point: ${turningPoint.toFixed(2)}`,
        showarrow: true,
        arrowhead: 2,
        ax: 40,
        ay: -40
      }],
      margin: { t: 30 }
    };
    
    Plotly.newPlot('plot-interaction', traces, layout, { responsive: true });
    
    document.getElementById('interaction-interpretation').textContent = 
      `The curved line shows a ${beta2 < 0 ? 'inverted U-shape (diminishing returns)' : 'U-shape (accelerating)'} relationship. ` +
      `The ${beta2 < 0 ? 'maximum' : 'minimum'} occurs at ${state.quadraticVar} ≈ ${turningPoint.toFixed(2)}. ` +
      `This suggests an optimal level exists${state.centerContinuous ? ' (relative to the mean of ' + quadVar.mean.toFixed(2) + ')' : ''}.`;
  }

  // Render coefficient interpretation guide
  function renderCoefInterpretation(results) {
    const container = document.getElementById('coef-interpretation');
    if (!container || !results) {
      if (container) container.textContent = 'Run the model to see coefficient interpretation examples.';
      return;
    }
    
    const explainColumns = [
      '<strong>Estimate:</strong> The coefficient value. For categorical terms, this compares the level vs. the reference category.',
      '<strong>Std. Error:</strong> Uncertainty in the estimate.',
      '<strong>t-statistic & p-value:</strong> Test whether the coefficient differs significantly from zero.',
      `<strong>${Math.round((1 - state.alpha) * 100)}% CI:</strong> Confidence interval for the estimate.`
    ];
    
    const examples = [];
    
    // Find examples of different term types
    const continuousTerm = results.columnNames.slice(1).find((name, i) => {
      return !name.includes('×') && !name.includes('²') && !name.includes('_');
    });
    
    if (continuousTerm) {
      const idx = results.columnNames.indexOf(continuousTerm);
      const b = results.beta[idx];
      const p = results.pValues[idx];
      const centered = state.centerContinuous && (continuousTerm === state.focal || continuousTerm === state.moderator || continuousTerm === state.quadraticVar);
      examples.push(
        `<strong>Continuous predictor (${continuousTerm}):</strong> ${centered ? 'When this variable is at its mean, and ' : ''}For each one-unit increase in ${continuousTerm}, ${state.outcome} changes by ${b.toFixed(3)} units (p ${p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`}), holding other predictors constant.`
      );
    }
    
    const categoricalTerm = results.columnNames.slice(1).find(name => name.includes('_') && !name.includes('×'));
    if (categoricalTerm) {
      const idx = results.columnNames.indexOf(categoricalTerm);
      const b = results.beta[idx];
      const p = results.pValues[idx];
      const [varName, level] = categoricalTerm.split('_');
      const pred = state.predictors.find(p => p.name === varName);
      const ref = pred?.levels[0] || 'reference';
      examples.push(
        `<strong>Categorical predictor (${categoricalTerm}):</strong> Compared to ${ref}, the ${level} level has ${b.toFixed(3)} ${b > 0 ? 'higher' : 'lower'} ${state.outcome} (p ${p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`}), holding other predictors constant.`
      );
    }
    
    if (state.interactionType === 'cont_cont') {
      const interactionTerm = results.columnNames.find(name => name.includes('×'));
      if (interactionTerm) {
        const idx = results.columnNames.indexOf(interactionTerm);
        const b = results.beta[idx];
        const p = results.pValues[idx];
        examples.push(
          `<strong>Interaction term (${interactionTerm}):</strong> The effect of ${state.focal} on ${state.outcome} ${b > 0 ? 'increases' : 'decreases'} by ${Math.abs(b).toFixed(3)} for each one-unit increase in ${state.moderator} (p ${p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`}). This means the slope of ${state.focal} is moderated by ${state.moderator}.`
        );
      }
    } else if (state.interactionType === 'cont_cat') {
      const interactionTerm = results.columnNames.find(name => name.includes('×'));
      if (interactionTerm) {
        const idx = results.columnNames.indexOf(interactionTerm);
        const b = results.beta[idx];
        const p = results.pValues[idx];
        examples.push(
          `<strong>Interaction term (${interactionTerm}):</strong> The slope of the continuous variable differs by ${b.toFixed(3)} for this category compared to the reference (p ${p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`}). See the interaction plot for simple slopes.`
        );
      }
    } else if (state.interactionType === 'quadratic') {
      const quadTerm = results.columnNames.find(name => name.includes('²'));
      if (quadTerm) {
        const idx = results.columnNames.indexOf(quadTerm);
        const b2 = results.beta[idx];
        const p = results.pValues[idx];
        examples.push(
          `<strong>Quadratic term (${quadTerm}):</strong> The ${b2 < 0 ? 'negative' : 'positive'} coefficient (${b2.toFixed(3)}, p ${p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`}) indicates ${b2 < 0 ? 'diminishing returns (inverted U-shape)' : 'accelerating effects (U-shape)'}. See the plot for the turning point.`
        );
      }
    }
    
    container.innerHTML = `
      <p><strong>Column Descriptions:</strong></p>
      <ul>${explainColumns.map(c => `<li>${c}</li>`).join('')}</ul>
      ${examples.length ? `<p><strong>Interpretation Examples:</strong></p><ul>${examples.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
    `;
  }

  // Plot residuals vs fitted
  function plotResiduals(results) {
    const trace = {
      x: results.yHat,
      y: results.residuals,
      mode: 'markers',
      type: 'scatter',
      marker: { color: 'steelblue', size: 6 }
    };
    const layout = {
      xaxis: { title: 'Fitted values' },
      yaxis: { title: 'Residuals' },
      showlegend: false,
      shapes: [{
        type: 'line',
        x0: Math.min(...results.yHat),
        x1: Math.max(...results.yHat),
        y0: 0,
        y1: 0,
        line: { color: 'red', dash: 'dash' }
      }],
      margin: { t: 30 }
    };
    Plotly.newPlot('plot-residuals', [trace], layout, { responsive: true });
  }

  // Generate diagnostics
  function generateDiagnostics(results) {
    let diagHTML = '<h4>Multicollinearity (VIF)</h4><ul>';
    results.columnNames.slice(1).forEach((name, i) => {
      const vif = results.VIF[i];
      const flag = vif > 10 ? ' <strong>(High VIF - potential multicollinearity)</strong>' : '';
      diagHTML += `<li>${name}: VIF = ${vif.toFixed(2)}${flag}</li>`;
    });
    diagHTML += '</ul>';
    
    diagHTML += '<h4>Residual Checks</h4><ul>';
    diagHTML += `<li>Mean of residuals: ${mean(results.residuals).toFixed(4)} (should be ≈ 0)</li>`;
    diagHTML += `<li>Std. dev. of residuals: ${stdDev(results.residuals).toFixed(2)}</li>`;
    diagHTML += '</ul>';
    
    document.getElementById('diag-collinearity').innerHTML = diagHTML;
  }

  // Initialize
  function init() {
    // Load scenarios
    fetch('scenarios/scenario-index.json')
      .then(r => r.json())
      .then(scenarios => {
        state.scenarioData = scenarios;
        const select = document.getElementById('scenario-select');
        scenarios.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.label;
          select.appendChild(opt);
        });
      });

    // Event listeners
    document.getElementById('scenario-select').addEventListener('change', loadScenario);
    document.getElementById('raw-input').addEventListener('change', handleFileUpload);
    document.getElementById('alpha').addEventListener('input', () => {
      state.alpha = parseFloat(document.getElementById('alpha').value);
    });
    
    // Confidence level buttons
    document.querySelectorAll('.conf-level-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = parseFloat(btn.dataset.level);
        state.alpha = 1 - level;
        document.getElementById('alpha').value = state.alpha.toFixed(3);
        document.querySelectorAll('.conf-level-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Interaction type selection
    document.querySelectorAll('input[name="interaction-type"]').forEach(radio => {
      radio.addEventListener('change', handleInteractionTypeChange);
    });

    // Advanced settings
    document.getElementById('center-continuous').addEventListener('change', (e) => {
      state.centerContinuous = e.target.checked;
      runAnalysis(); // Re-run analysis since centering affects model
    });
    document.getElementById('show-confidence-bands').addEventListener('change', (e) => {
      state.showConfidenceBands = e.target.checked;
      if (state.lastModel) {
        displayResults(state.lastModel); // Re-plot with updated band visibility
      }
    });
    
    // Download fitted values
    const downloadButton = document.getElementById('mlr-download-results');
    if (downloadButton) {
      downloadButton.addEventListener('click', handleDownloadFittedAndResiduals);
    }
  }
  
  function handleDownloadFittedAndResiduals() {
    if (!state.lastModel || !state.rawData || !state.rawData.length) {
      alert('Run a regression model before downloading fitted values and residuals.');
      return;
    }
    
    const model = state.lastModel;
    const headers = Object.keys(state.rawData[0]);
    const outHeaders = headers.concat(['y_fitted', 'residual']);
    const lines = [outHeaders.join(',')];
    
    for (let i = 0; i < state.rawData.length; i++) {
      const baseRow = headers.map(h => {
        const value = state.rawData[i][h];
        if (value == null) return '';
        return String(value);
      });
      
      const fitted = model.yHat[i] != null ? model.yHat[i].toFixed(6) : '';
      const residual = model.residuals[i] != null ? model.residuals[i].toFixed(6) : '';
      
      lines.push(baseRow.concat([fitted, residual]).join(','));
    }
    
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mlr_interactions_fitted_residuals.csv';
    link.click();
  }

  function updateInteractionTypeAvailability() {
    const continuous = state.predictors.filter(p => p.type === 'numeric');
    const categorical = state.predictors.filter(p => p.type === 'categorical');
    
    // Enable/disable radio buttons based on available predictors
    const contContRadio = document.querySelector('input[name="interaction-type"][value="cont_cont"]');
    const contCatRadio = document.querySelector('input[name="interaction-type"][value="cont_cat"]');
    const catCatRadio = document.querySelector('input[name="interaction-type"][value="cat_cat"]');
    const quadraticRadio = document.querySelector('input[name="interaction-type"][value="quadratic"]');
    
    if (contContRadio) {
      contContRadio.disabled = continuous.length < 2;
      if (contContRadio.disabled && contContRadio.checked) {
        document.querySelector('input[name="interaction-type"][value="none"]').checked = true;
        state.interactionType = 'none';
      }
    }
    if (contCatRadio) {
      contCatRadio.disabled = continuous.length < 1 || categorical.length < 1;
      if (contCatRadio.disabled && contCatRadio.checked) {
        document.querySelector('input[name="interaction-type"][value="none"]').checked = true;
        state.interactionType = 'none';
      }
    }
    if (catCatRadio) {
      catCatRadio.disabled = categorical.length < 2;
      if (catCatRadio.disabled && catCatRadio.checked) {
        document.querySelector('input[name="interaction-type"][value="none"]').checked = true;
        state.interactionType = 'none';
      }
    }
    if (quadraticRadio) {
      quadraticRadio.disabled = continuous.length < 1;
      if (quadraticRadio.disabled && quadraticRadio.checked) {
        document.querySelector('input[name="interaction-type"][value="none"]').checked = true;
        state.interactionType = 'none';
      }
    }
  }

  function handleInteractionTypeChange(e) {
    state.interactionType = e.target.value;
    
    // Hide all selector groups
    document.querySelectorAll('.var-selector-group').forEach(el => el.classList.add('hidden'));
    
    if (state.interactionType === 'none') {
      document.getElementById('interaction-variable-selectors').classList.add('hidden');
    } else {
      document.getElementById('interaction-variable-selectors').classList.remove('hidden');
      
      // Show appropriate selector
      if (state.interactionType === 'cont_cont') {
        document.getElementById('cont-cont-selectors').classList.remove('hidden');
        populateInteractionSelectors('cont_cont');
      } else if (state.interactionType === 'cont_cat') {
        document.getElementById('cont-cat-selectors').classList.remove('hidden');
        populateInteractionSelectors('cont_cat');
      } else if (state.interactionType === 'cat_cat') {
        document.getElementById('cat-cat-selectors').classList.remove('hidden');
        populateInteractionSelectors('cat_cat');
      } else if (state.interactionType === 'quadratic') {
        document.getElementById('quadratic-selectors').classList.remove('hidden');
        populateInteractionSelectors('quadratic');
      }
    }
  }

  function populateInteractionSelectors(type) {
    if (type === 'cont_cont') {
      const continuous = state.predictors.filter(p => p.type === 'numeric');
      const select1 = document.getElementById('focal-cont-cont');
      const select2 = document.getElementById('moderator-cont-cont');
      select1.innerHTML = '';
      select2.innerHTML = '';
      
      if (continuous.length < 2) {
        select1.appendChild(new Option('Need 2+ continuous predictors', ''));
        select2.appendChild(new Option('Need 2+ continuous predictors', ''));
        select1.disabled = true;
        select2.disabled = true;
        return;
      }
      
      select1.disabled = false;
      select2.disabled = false;
      
      continuous.forEach(p => {
        select1.appendChild(new Option(p.name, p.name));
        select2.appendChild(new Option(p.name, p.name));
      });
      
      // Set different defaults
      if (continuous.length >= 2) {
        select1.selectedIndex = 0;
        select2.selectedIndex = 1;
      }
      
      // Update moderator options when focal changes (exclude focal from moderator)
      const updateModeratorOptions = () => {
        const focalValue = select1.value;
        const currentModValue = select2.value;
        select2.innerHTML = '';
        continuous.forEach(p => {
          if (p.name !== focalValue) {
            select2.appendChild(new Option(p.name, p.name));
          }
        });
        // Try to restore previous selection if still valid
        if (currentModValue !== focalValue && continuous.some(p => p.name === currentModValue)) {
          select2.value = currentModValue;
        }
      };
      
      select1.addEventListener('change', updateModeratorOptions);
      
      // Swap button
      document.getElementById('swap-cont-cont').onclick = () => {
        [select1.value, select2.value] = [select2.value, select1.value];
      };
    } else if (type === 'cont_cat') {
      const continuous = state.predictors.filter(p => p.type === 'numeric');
      const categorical = state.predictors.filter(p => p.type === 'categorical');
      const select1 = document.getElementById('focal-cont-cat');
      const select2 = document.getElementById('moderator-cont-cat');
      select1.innerHTML = '';
      select2.innerHTML = '';
      
      [...continuous, ...categorical].forEach(p => {
        select1.appendChild(new Option(p.name, p.name));
        select2.appendChild(new Option(p.name, p.name));
      });
      if (continuous.length > 0 && categorical.length > 0) {
        select1.value = continuous[0].name;
        select2.value = categorical[0].name;
      }
      
      document.getElementById('swap-cont-cat').onclick = () => {
        [select1.value, select2.value] = [select2.value, select1.value];
      };
    } else if (type === 'cat_cat') {
      const categorical = state.predictors.filter(p => p.type === 'categorical');
      const select1 = document.getElementById('focal-cat-cat');
      const select2 = document.getElementById('moderator-cat-cat');
      select1.innerHTML = '';
      select2.innerHTML = '';
      
      if (categorical.length < 2) {
        // Not enough categorical predictors - show message
        select1.appendChild(new Option('Need 2+ categorical predictors', ''));
        select2.appendChild(new Option('Need 2+ categorical predictors', ''));
        select1.disabled = true;
        select2.disabled = true;
        return;
      }
      
      select1.disabled = false;
      select2.disabled = false;
      
      categorical.forEach(p => {
        select1.appendChild(new Option(p.name, p.name));
        select2.appendChild(new Option(p.name, p.name));
      });
      
      // Set different defaults
      if (categorical.length >= 2) {
        select1.selectedIndex = 0;
        select2.selectedIndex = 1;
      }
      
      // Update moderator options when focal changes (exclude focal from moderator)
      const updateModeratorOptions = () => {
        const focalValue = select1.value;
        const currentModValue = select2.value;
        select2.innerHTML = '';
        categorical.forEach(p => {
          if (p.name !== focalValue) {
            select2.appendChild(new Option(p.name, p.name));
          }
        });
        // Try to restore previous selection if still valid
        if (currentModValue !== focalValue && categorical.some(p => p.name === currentModValue)) {
          select2.value = currentModValue;
        }
      };
      
      select1.addEventListener('change', updateModeratorOptions);
      
      document.getElementById('swap-cat-cat').onclick = () => {
        [select1.value, select2.value] = [select2.value, select1.value];
      };
    } else if (type === 'quadratic') {
      const continuous = state.predictors.filter(p => p.type === 'numeric');
      const select = document.getElementById('quadratic-var');
      select.innerHTML = '';
      continuous.forEach(p => {
        select.appendChild(new Option(p.name, p.name));
      });
    }
  }

  function buildColumnMeta(rows, headers) {
    const meta = {};
    headers.forEach(header => {
      const values = rows.map(r => r[header]);
      let numericCount = 0;
      let missing = 0;
      const distinct = new Set();
      values.forEach(v => {
        if (v === null || v === undefined || v === '') { missing++; return; }
        const num = parseFloat(v);
        if (Number.isFinite(num)) numericCount++;
        if (distinct.size < 50) distinct.add(String(v));
      });
      const isNumeric = numericCount === values.length - missing;
      const nonMissing = values.length - missing;
      meta[header] = {
        isNumeric,
        missing,
        distinctValues: Array.from(distinct),
        inferredType: isNumeric ? 'numeric' : 'categorical'
      };
    });
    return meta;
  }

  function renderVariableSelectors() {
    const panel = document.getElementById('variable-selection-panel');
    if (!panel || !state.rawData.length) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');

    const headers = Object.keys(state.rawData[0]);
    
    // Render outcome selector
    const outcomeSelect = document.getElementById('outcome-select');
    if (outcomeSelect) {
      outcomeSelect.innerHTML = '';
      const numericHeaders = headers.filter(h => state.columnMeta[h]?.isNumeric);
      numericHeaders.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h;
        opt.textContent = h;
        outcomeSelect.appendChild(opt);
      });
      if (state.outcome && numericHeaders.includes(state.outcome)) {
        outcomeSelect.value = state.outcome;
      } else if (numericHeaders.length) {
        state.outcome = numericHeaders[0];
        outcomeSelect.value = state.outcome;
      }
      outcomeSelect.onchange = () => {
        state.outcome = outcomeSelect.value;
        if (state.predictors.find(p => p.name === state.outcome)) {
          state.predictors = state.predictors.filter(p => p.name !== state.outcome);
        }
        renderVariableSelectors();
        runAnalysis();
      };
    }

    // Render predictor list
    const predictorList = document.getElementById('predictor-list');
    if (!predictorList) return;
    predictorList.innerHTML = '';
    
    headers.forEach(header => {
      if (header === state.outcome) return;
      
      const meta = state.columnMeta[header] || {};
      const wrapper = document.createElement('div');
      wrapper.className = 'predictor-row stacked-row';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'predictor-check';
      checkbox.dataset.col = header;
      checkbox.id = `pred-${header}`;
      checkbox.checked = state.predictors.some(p => p.name === header);
      
      const label = document.createElement('label');
      label.textContent = header;
      label.htmlFor = `pred-${header}`;
      
      const typeSelect = document.createElement('select');
      typeSelect.className = 'predictor-type';
      typeSelect.dataset.col = header;
      
      const isNumeric = meta.isNumeric;
      if (isNumeric) {
        typeSelect.innerHTML = '<option value="numeric">Numeric</option><option value="categorical">Categorical</option>';
      } else {
        typeSelect.innerHTML = '<option value="categorical">Categorical</option>';
      }
      
      const currentType = state.predictorSettings[header]?.type || meta.inferredType || 'numeric';
      typeSelect.value = currentType;
      
      const refWrapper = document.createElement('div');
      refWrapper.className = 'predictor-ref-wrapper';
      const refSelect = document.createElement('select');
      refSelect.className = 'predictor-ref';
      refSelect.dataset.col = header;
      
      const distinct = meta.distinctValues || [];
      distinct.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        refSelect.appendChild(opt);
      });
      
      const currentRef = state.predictorSettings[header]?.reference || distinct[0] || '';
      refSelect.value = currentRef;
      refWrapper.appendChild(refSelect);
      refWrapper.style.display = currentType === 'categorical' ? 'block' : 'none';
      
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (!state.predictors.some(p => p.name === header)) {
            const type = typeSelect.value;
            const pred = { name: header, type: type };
            if (type === 'categorical') {
              pred.levels = distinct;
              pred.reference = refSelect.value;
            }
            state.predictors.push(pred);
          }
        } else {
          state.predictors = state.predictors.filter(p => p.name !== header);
        }
        updateInteractionTypeAvailability();
        runAnalysis();
      });
      
      typeSelect.addEventListener('change', () => {
        const newType = typeSelect.value;
        state.predictorSettings[header] = state.predictorSettings[header] || {};
        state.predictorSettings[header].type = newType;
        refWrapper.style.display = newType === 'categorical' ? 'block' : 'none';
        
        const pred = state.predictors.find(p => p.name === header);
        if (pred) {
          pred.type = newType;
          if (newType === 'categorical') {
            pred.levels = distinct;
            pred.reference = refSelect.value;
          } else {
            delete pred.levels;
            delete pred.reference;
          }
        }
        runAnalysis();
      });
      
      refSelect.addEventListener('change', () => {
        state.predictorSettings[header] = state.predictorSettings[header] || {};
        state.predictorSettings[header].reference = refSelect.value;
        const pred = state.predictors.find(p => p.name === header);
        if (pred) pred.reference = refSelect.value;
        runAnalysis();
      });
      
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      wrapper.appendChild(typeSelect);
      wrapper.appendChild(refWrapper);
      predictorList.appendChild(wrapper);
    });
  }

  function loadScenario(e) {
    const scenarioId = e.target.value;
    if (!scenarioId) {
      // Clear scenario - hide download button
      const downloadButton = document.getElementById('scenario-download');
      if (downloadButton) {
        downloadButton.classList.add('hidden');
        downloadButton.disabled = true;
      }
      return;
    }
    
    const scenario = state.scenarioData.find(s => s.id === scenarioId);
    if (!scenario) return;
    
    // Enable download button for scenario dataset
    const downloadButton = document.getElementById('scenario-download');
    if (downloadButton && scenario.dataset) {
      downloadButton.classList.remove('hidden');
      downloadButton.disabled = false;
      downloadButton.onclick = () => {
        const link = document.createElement('a');
        link.href = scenario.dataset;
        link.download = scenario.dataset.split('/').pop() || 'scenario_dataset.csv';
        link.click();
      };
    }
    
    // Load scenario description
    fetch(scenario.file)
      .then(r => r.text())
      .then(text => {
        document.getElementById('scenario-description').innerHTML = text;
      });
    
    // Load dataset
    fetch(scenario.dataset)
      .then(r => r.text())
      .then(csv => {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        state.rawData = lines.slice(1).map(line => {
          const values = line.split(',');
          const row = {};
          headers.forEach((h, i) => {
            row[h] = values[i].trim();
          });
          return row;
        });
        
        // Build column metadata
        state.columnMeta = buildColumnMeta(state.rawData, headers);
        
        // Set outcome from scenario
        state.outcome = scenario.outcome;
        
        // Build predictor list from scenario
        state.predictors = [];
        state.predictorSettings = {};
        
        scenario.predictors.forEach(p => {
          const values = state.rawData.map(d => d[p]);
          const isNumeric = state.columnMeta[p]?.isNumeric;
          const type = scenario.types && scenario.types[p] ? scenario.types[p] : (isNumeric ? 'numeric' : 'categorical');
          
          const pred = { name: p, type: type };
          if (type === 'categorical') {
            const levels = [...new Set(values)];
            pred.levels = levels;
            pred.reference = levels[0];
          }
          state.predictors.push(pred);
          state.predictorSettings[p] = { type: type, reference: pred.reference };
        });
        
        // Parse data
        state.parsedData = state.rawData.map(row => {
          const parsed = {};
          parsed[state.outcome] = parseFloat(row[state.outcome]);
          state.predictors.forEach(p => {
            if (p.type === 'numeric') {
              parsed[p.name] = parseFloat(row[p.name]);
            } else {
              parsed[p.name] = row[p.name];
            }
          });
          return parsed;
        });
        
        // Set interaction type from scenario
        if (scenario.interactionType) {
          const typeMap = {
            'continuous_continuous': 'cont_cont',
            'continuous_categorical': 'cont_cat',
            'categorical_categorical': 'cat_cat',
            'quadratic': 'quadratic'
          };
          state.interactionType = typeMap[scenario.interactionType] || 'none';
          
          const radioButton = document.querySelector(`input[name="interaction-type"][value="${state.interactionType}"]`);
          if (radioButton) {
            radioButton.checked = true;
            handleInteractionTypeChange({ target: { value: state.interactionType } });
          }
          
          if (scenario.focal) state.focal = scenario.focal;
          if (scenario.moderator) state.moderator = scenario.moderator;
          if (scenario.quadraticVar) state.quadraticVar = scenario.quadraticVar;
          
          setTimeout(() => {
            if (state.interactionType === 'cont_cont') {
              const focalEl = document.getElementById('focal-cont-cont');
              const modEl = document.getElementById('moderator-cont-cont');
              if (focalEl) focalEl.value = state.focal;
              if (modEl) modEl.value = state.moderator;
            } else if (state.interactionType === 'cont_cat') {
              const focalEl = document.getElementById('focal-cont-cat');
              const modEl = document.getElementById('moderator-cont-cat');
              if (focalEl) focalEl.value = state.focal;
              if (modEl) modEl.value = state.moderator;
            } else if (state.interactionType === 'cat_cat') {
              const focalEl = document.getElementById('focal-cat-cat');
              const modEl = document.getElementById('moderator-cat-cat');
              if (focalEl) focalEl.value = state.focal;
              if (modEl) modEl.value = state.moderator;
            } else if (state.interactionType === 'quadratic') {
              const quadEl = document.getElementById('quadratic-var');
              if (quadEl) quadEl.value = state.quadraticVar;
            }
          }, 100);
        }
        
        // Render variable selectors and run analysis
        renderVariableSelectors();
        document.getElementById('interaction-selection-panel').classList.remove('hidden');
        runAnalysis();
      });
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      state.rawData = lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((h, i) => {
          row[h] = values[i].trim();
        });
        return row;
      });
      
      // Build column metadata
      state.columnMeta = buildColumnMeta(state.rawData, headers);
      
      // Auto-select first numeric as outcome
      const numericHeaders = headers.filter(h => state.columnMeta[h]?.isNumeric);
      state.outcome = numericHeaders[0] || headers[0];
      
      // Auto-select all other columns as predictors
      state.predictors = [];
      headers.forEach(h => {
        if (h === state.outcome) return;
        const meta = state.columnMeta[h];
        const type = meta.inferredType;
        const pred = { name: h, type: type };
        if (type === 'categorical') {
          pred.levels = meta.distinctValues;
          pred.reference = meta.distinctValues[0];
        }
        state.predictors.push(pred);
      });
      
      // Parse data
      state.parsedData = state.rawData.map(row => {
        const parsed = {};
        headers.forEach(h => {
          const val = row[h];
          const num = parseFloat(val);
          parsed[h] = Number.isFinite(num) && state.columnMeta[h]?.isNumeric ? num : val;
        });
        return parsed;
      });
      
      renderVariableSelectors();
      document.getElementById('raw-upload-status').textContent = `Loaded ${state.rawData.length} rows from ${file.name}`;
    };
    reader.readAsText(file);
  }

  function runAnalysis() {
    if (!state.parsedData.length || !state.outcome || !state.predictors.length) {
      console.log('Not ready to run analysis');
      return;
    }
    
    // Get focal/moderator from UI
    if (state.interactionType === 'cont_cont') {
      const focalEl = document.getElementById('focal-cont-cont');
      const modEl = document.getElementById('moderator-cont-cont');
      if (focalEl) state.focal = focalEl.value;
      if (modEl) state.moderator = modEl.value;
    } else if (state.interactionType === 'cont_cat') {
      const focalEl = document.getElementById('focal-cont-cat');
      const modEl = document.getElementById('moderator-cont-cat');
      if (focalEl) state.focal = focalEl.value;
      if (modEl) state.moderator = modEl.value;
    } else if (state.interactionType === 'cat_cat') {
      const focalEl = document.getElementById('focal-cat-cat');
      const modEl = document.getElementById('moderator-cat-cat');
      if (focalEl) state.focal = focalEl.value;
      if (modEl) state.moderator = modEl.value;
    } else if (state.interactionType === 'quadratic') {
      const quadEl = document.getElementById('quadratic-var');
      if (quadEl) state.quadraticVar = quadEl.value;
    }
    
    try {
      const results = fitRegression();
      state.lastModel = results;
      updateResults(results);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Error running analysis: ' + error.message);
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
