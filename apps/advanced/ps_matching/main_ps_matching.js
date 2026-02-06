// Propensity Score Matching Tool - Main Controller
// Implements nearest-neighbor matching for causal inference

const TOOL_SLUG = 'propensity-score-matching';

// ===== Scenario Definitions =====
const PSM_SCENARIOS = [
  {
    id: 'loyalty_program',
    label: 'Loyalty Program Impact',
    description: () => `
      <div class="scenario-content">
        <div class="scenario-header">
          <span class="scenario-icon">🎯</span>
          <h4>Loyalty Program Enrollment Effect on Spend</h4>
          <span class="scenario-badge">Retail</span>
        </div>
        <p class="scenario-intro">
          A retail chain wants to know if their loyalty program <strong>actually causes</strong> customers to spend more, 
          or if high-spending customers simply self-select into the program. You have observational data on customers 
          who enrolled vs. did not enroll.
        </p>
        <ul>
          <li><strong>Treatment:</strong> Enrolled in loyalty program (1) vs. not enrolled (0)</li>
          <li><strong>Outcome:</strong> Total_Spend (annual spend in dollars)</li>
          <li><strong>Covariates:</strong> Prior_Spend, Months_Customer, Age, Store_Visits</li>
        </ul>
        <p class="muted">
          Challenge: Customers who choose to enroll may already be high-value. PSM helps create a fair comparison 
          by matching enrolled customers with similar non-enrolled customers.
        </p>
      </div>
    `,
    dataset: 'scenarios/loyalty_program_data.csv',
    treatment: 'Enrolled',
    outcome: 'Total_Spend',
    covariates: ['Prior_Spend', 'Months_Customer', 'Age', 'Store_Visits']
  },
  {
    id: 'email_campaign',
    label: 'Email Campaign Effect',
    description: () => `
      <div class="scenario-content">
        <div class="scenario-header">
          <span class="scenario-icon">📧</span>
          <h4>Email Marketing Campaign Impact on Conversion</h4>
          <span class="scenario-badge">E-commerce</span>
        </div>
        <p class="scenario-intro">
          An e-commerce company sent a promotional email campaign to a subset of customers and wants to understand 
          the <strong>causal effect</strong> on purchase conversion. However, the targeting was not truly random—
          more engaged customers were more likely to receive the email.
        </p>
        <ul>
          <li><strong>Treatment:</strong> Received_Email (1) vs. did not receive (0)</li>
          <li><strong>Outcome:</strong> Converted (1 = made purchase within 7 days, 0 = did not)</li>
          <li><strong>Covariates:</strong> Past_Purchases, Days_Since_Last_Visit, Email_Opens_90d, Account_Age</li>
        </ul>
        <p class="muted">
          Challenge: Email recipients were selected based on engagement history, creating selection bias. 
          PSM helps isolate the email's true effect by comparing to similar non-recipients.
        </p>
      </div>
    `,
    dataset: 'scenarios/email_campaign_data.csv',
    treatment: 'Received_Email',
    outcome: 'Converted',
    covariates: ['Past_Purchases', 'Days_Since_Last_Visit', 'Email_Opens_90d', 'Account_Age']
  },
  {
    id: 'ad_exposure',
    label: 'Ad Exposure Effect',
    description: () => `
      <div class="scenario-content">
        <div class="scenario-header">
          <span class="scenario-icon">📺</span>
          <h4>Display Ad Exposure Effect on Brand Awareness</h4>
          <span class="scenario-badge">Advertising</span>
        </div>
        <p class="scenario-intro">
          A brand ran display ads on a publisher network and surveyed users to measure brand awareness. 
          Users who saw ads may differ systematically from those who didn't (different browsing behavior, 
          demographics). Did the ads <strong>actually increase</strong> awareness?
        </p>
        <ul>
          <li><strong>Treatment:</strong> Saw_Ad (1) vs. did not see ad (0)</li>
          <li><strong>Outcome:</strong> Awareness_Score (0-100 scale from brand survey)</li>
          <li><strong>Covariates:</strong> Prior_Awareness, Site_Visits, Category_Interest, Age_Group</li>
        </ul>
        <p class="muted">
          Challenge: Users exposed to ads may already have higher baseline interest in the category.
          PSM creates a more balanced comparison for estimating the true ad lift.
        </p>
      </div>
    `,
    dataset: 'scenarios/ad_exposure_data.csv',
    treatment: 'Saw_Ad',
    outcome: 'Awareness_Score',
    covariates: ['Prior_Awareness', 'Site_Visits', 'Category_Interest', 'Age_Group']
  }
];

// ===== State =====
let dataset = { headers: [], rows: [] };
let columnMeta = {};
let selectedTreatment = null;
let selectedOutcome = null;
let selectedCovariates = [];
let treatmentCoding = { focalValue: '1', nonFocalValue: '0' };
let matchingResults = null;
let propensityModel = null;

const RAW_UPLOAD_LIMIT = 5000;

// ===== Utilities =====
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(v, digits = 3) {
  if (!Number.isFinite(v)) return '--';
  return v.toFixed(digits);
}

function formatP(p) {
  if (!Number.isFinite(p)) return '--';
  if (p < 0.0001) return '< .0001';
  return p.toFixed(4);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function logistic(x) {
  const val = 1 / (1 + Math.exp(-x));
  return Math.min(Math.max(val, 1e-8), 1 - 1e-8);
}

// ===== Matrix Operations =====
function transpose(A) {
  return A[0].map((_, i) => A.map(row => row[i]));
}

function multiply(A, B) {
  const rows = A.length;
  const cols = B[0].length;
  const inner = B.length;
  const out = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const aik = A[i][k];
      for (let j = 0; j < cols; j++) out[i][j] += aik * B[k][j];
    }
  }
  return out;
}

function invert(matrix) {
  const n = matrix.length;
  const result = matrix.map((row, i) => row.concat(
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  ));
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(result[r][i]) > Math.abs(result[maxRow][i])) maxRow = r;
    }
    if (Math.abs(result[maxRow][i]) < 1e-12) return null;
    [result[i], result[maxRow]] = [result[maxRow], result[i]];
    const pivot = result[i][i];
    for (let j = 0; j < 2 * n; j++) result[i][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = result[r][i];
      for (let c = 0; c < 2 * n; c++) result[r][c] -= factor * result[i][c];
    }
  }
  return result.map(row => row.slice(n));
}

// ===== Statistical Functions =====
function logGamma(z) {
  const c = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < c.length; i++) x += c[i] / (z + i + 1);
  const t = z + c.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function tCDF(t, df) {
  if (df > 100) return normalCDF(t);
  const x = df / (df + t * t);
  return 1 - 0.5 * betai(df / 2, 0.5, x);
}

function betacf(a, b, x) {
  const MAXITER = 100;
  const EPS = 3e-7;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXITER; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a, b, x) {
  if (x < 0 || x > 1) return NaN;
  const bt = (x === 0 || x === 1)
    ? 0
    : Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
  return 1 - bt * betacf(b, a, 1 - x) / b;
}

// ===== Logistic Regression for Propensity Score =====
function fitLogisticRegression(y, X, maxIter = 100, tol = 1e-6) {
  const n = y.length;
  const p = X[0].length;
  let beta = new Array(p).fill(0);
  
  for (let iter = 0; iter < maxIter; iter++) {
    const eta = X.map(row => row.reduce((sum, xj, j) => sum + xj * beta[j], 0));
    const mu = eta.map(e => logistic(e));
    const W = mu.map(m => m * (1 - m));
    const z = eta.map((e, i) => e + (y[i] - mu[i]) / Math.max(W[i], 1e-8));
    
    const XtW = transpose(X).map((row, j) => row.map((xij, i) => xij * W[i]));
    const XtWX = multiply(XtW, X);
    const XtWz = XtW.map(row => row.reduce((sum, xij, i) => sum + xij * z[i], 0));
    
    const XtWXinv = invert(XtWX);
    if (!XtWXinv) {
      console.warn('Logistic regression: singular matrix');
      break;
    }
    
    const betaNew = XtWXinv.map(row => row.reduce((sum, aij, j) => sum + aij * XtWz[j], 0));
    const maxChange = Math.max(...betaNew.map((b, j) => Math.abs(b - beta[j])));
    beta = betaNew;
    
    if (maxChange < tol) break;
  }
  
  const eta = X.map(row => row.reduce((sum, xj, j) => sum + xj * beta[j], 0));
  const mu = eta.map(e => logistic(e));
  const W = mu.map(m => m * (1 - m));
  
  const XtW = transpose(X).map((row, j) => row.map((xij, i) => xij * W[i]));
  const XtWX = multiply(XtW, X);
  const covMatrix = invert(XtWX);
  const se = covMatrix ? covMatrix.map((row, i) => Math.sqrt(Math.max(row[i], 0))) : beta.map(() => NaN);
  
  const logLik = y.reduce((sum, yi, i) => {
    const pi = mu[i];
    return sum + yi * Math.log(pi) + (1 - yi) * Math.log(1 - pi);
  }, 0);
  
  const pBar = y.reduce((a, b) => a + b, 0) / n;
  const nullLogLik = n * (pBar * Math.log(pBar) + (1 - pBar) * Math.log(1 - pBar));
  const pseudoR2 = 1 - logLik / nullLogLik;
  
  return {
    coefficients: beta,
    standardErrors: se,
    fitted: mu,
    logLikelihood: logLik,
    nullLogLikelihood: nullLogLik,
    pseudoR2,
    modelChi2: 2 * (logLik - nullLogLik),
    df: p - 1
  };
}

// ===== Data Preparation =====
function prepareDesignMatrix(rows, covariates, columnMeta) {
  const terms = [{ name: 'Intercept', type: 'intercept' }];
  
  covariates.forEach(cov => {
    const meta = columnMeta[cov];
    if (meta.isNumeric) {
      terms.push({ name: cov, type: 'numeric', column: cov });
    } else {
      const levels = meta.distinctValues.sort();
      const refLevel = levels[0];
      levels.slice(1).forEach(level => {
        terms.push({ name: `${cov}:${level}`, type: 'categorical', column: cov, level, refLevel });
      });
    }
  });
  
  const X = rows.map(row => {
    return terms.map(term => {
      if (term.type === 'intercept') return 1;
      if (term.type === 'numeric') return parseFloat(row[term.column]) || 0;
      if (term.type === 'categorical') return row[term.column] === term.level ? 1 : 0;
      return 0;
    });
  });
  
  return { X, terms };
}

// ===== Common Support Diagnostics =====
function assessCommonSupport(propensityScores, treatmentIndicator) {
  const treatedPS = propensityScores.filter((_, i) => treatmentIndicator[i] === 1);
  const controlPS = propensityScores.filter((_, i) => treatmentIndicator[i] === 0);
  
  const minTreated = Math.min(...treatedPS);
  const maxTreated = Math.max(...treatedPS);
  const minControl = Math.min(...controlPS);
  const maxControl = Math.max(...controlPS);
  
  // Common support region
  const overlapMin = Math.max(minTreated, minControl);
  const overlapMax = Math.min(maxTreated, maxControl);
  const hasOverlap = overlapMax > overlapMin;
  
  // Count units in common support
  const treatedInSupport = treatedPS.filter(p => p >= overlapMin && p <= overlapMax).length;
  const controlInSupport = controlPS.filter(p => p >= overlapMin && p <= overlapMax).length;
  
  return {
    treatedRange: [minTreated, maxTreated],
    controlRange: [minControl, maxControl],
    overlapRange: hasOverlap ? [overlapMin, overlapMax] : null,
    hasOverlap,
    treatedInSupport,
    controlInSupport,
    totalTreated: treatedPS.length,
    totalControl: controlPS.length
  };
}

// ===== Matching Algorithm =====
function performMatching(treatedIndices, controlIndices, propensityScores, options = {}) {
  let { caliper = 0.25, withReplacement = true, method = 'nearest', k = 1 } = options;
  
  // Calculate logit propensity scores
  const logitPS = propensityScores.map(p => {
    // Clamp to avoid infinite logit
    const pClamped = Math.max(0.001, Math.min(0.999, p));
    return Math.log(pClamped / (1 - pClamped));
  });
  
  // Calculate SD of logit PS for caliper
  const meanLogit = logitPS.reduce((a, b) => a + b, 0) / logitPS.length;
  const varLogit = logitPS.reduce((sum, l) => sum + (l - meanLogit) ** 2, 0) / logitPS.length;
  const sdLogitPS = Math.sqrt(varLogit);
  
  // Initial caliper threshold
  let caliperThreshold = caliper * sdLogitPS;
  
  // Ensure minimum caliper threshold for very small SD
  const minCaliperThreshold = 0.1;
  if (caliperThreshold < minCaliperThreshold) {
    caliperThreshold = minCaliperThreshold;
  }
  
  const matches = [];
  const usedControls = new Set();
  const sortedTreated = [...treatedIndices].sort((a, b) => propensityScores[b] - propensityScores[a]);
  
  for (const tIdx of sortedTreated) {
    const tLogit = logitPS[tIdx];
    
    // Find all candidates within caliper
    let candidates = controlIndices
      .filter(cIdx => withReplacement || !usedControls.has(cIdx))
      .map(cIdx => ({ index: cIdx, distance: Math.abs(logitPS[cIdx] - tLogit) }))
      .filter(c => c.distance <= caliperThreshold)
      .sort((a, b) => a.distance - b.distance);
    
    // If no candidates and not strict caliper mode, find nearest anyway (but mark it)
    if (candidates.length === 0) {
      // Find the absolute nearest control (for diagnostics)
      const allCandidates = controlIndices
        .filter(cIdx => withReplacement || !usedControls.has(cIdx))
        .map(cIdx => ({ index: cIdx, distance: Math.abs(logitPS[cIdx] - tLogit) }))
        .sort((a, b) => a.distance - b.distance);
      
      if (allCandidates.length > 0) {
        // Check if nearest is within 2x caliper (lenient fallback)
        if (allCandidates[0].distance <= caliperThreshold * 2) {
          candidates = [allCandidates[0]];
        }
      }
    }
    
    if (candidates.length === 0) {
      matches.push({ treated: tIdx, controls: [], matched: false });
      continue;
    }
    
    const numMatches = method === 'nearest-k' ? Math.min(k, candidates.length) : 1;
    const selectedControls = candidates.slice(0, numMatches);
    
    if (!withReplacement) {
      selectedControls.forEach(c => usedControls.add(c.index));
    }
    
    matches.push({
      treated: tIdx,
      controls: selectedControls.map(c => c.index),
      distances: selectedControls.map(c => c.distance),
      matched: true
    });
  }
  
  return { matches, sdLogitPS, caliperThreshold };
}

// ===== Balance Diagnostics =====
function calculateSMD(treated, control) {
  if (treated.length === 0 || control.length === 0) return NaN;
  
  const meanT = treated.reduce((a, b) => a + b, 0) / treated.length;
  const meanC = control.reduce((a, b) => a + b, 0) / control.length;
  
  const varT = treated.reduce((sum, v) => sum + (v - meanT) ** 2, 0) / Math.max(treated.length - 1, 1);
  const varC = control.reduce((sum, v) => sum + (v - meanC) ** 2, 0) / Math.max(control.length - 1, 1);
  
  const pooledSD = Math.sqrt((varT + varC) / 2);
  if (pooledSD === 0) return 0;
  
  return (meanT - meanC) / pooledSD;
}

function calculateBalance(rows, matches, covariates, columnMeta, treatmentCol, treatmentValue) {
  const balance = [];
  
  const treatedRows = rows.filter(r => String(r[treatmentCol]) === String(treatmentValue));
  const controlRows = rows.filter(r => String(r[treatmentCol]) !== String(treatmentValue));
  
  const matchedControlIndices = new Set();
  matches.filter(m => m.matched).forEach(m => {
    m.controls.forEach(c => matchedControlIndices.add(c));
  });
  
  const matchedControlRows = [...matchedControlIndices].map(i => rows[i]);
  
  covariates.forEach(cov => {
    const meta = columnMeta[cov];
    
    if (meta.isNumeric) {
      const treatedVals = treatedRows.map(r => parseFloat(r[cov])).filter(v => isFinite(v));
      const controlVals = controlRows.map(r => parseFloat(r[cov])).filter(v => isFinite(v));
      const matchedControlVals = matchedControlRows.map(r => parseFloat(r[cov])).filter(v => isFinite(v));
      
      const smdBefore = calculateSMD(treatedVals, controlVals);
      const smdAfter = calculateSMD(treatedVals, matchedControlVals);
      const reduction = Math.abs(smdBefore) > 0.001 ? 
        ((Math.abs(smdBefore) - Math.abs(smdAfter)) / Math.abs(smdBefore)) * 100 : 0;
      
      balance.push({
        covariate: cov,
        meanTreated: treatedVals.reduce((a, b) => a + b, 0) / treatedVals.length,
        meanControl: controlVals.reduce((a, b) => a + b, 0) / controlVals.length,
        meanMatchedControl: matchedControlVals.length > 0 ? matchedControlVals.reduce((a, b) => a + b, 0) / matchedControlVals.length : NaN,
        smdBefore,
        smdAfter,
        reduction
      });
    } else {
      const levels = meta.distinctValues;
      levels.forEach(level => {
        const treatedProp = treatedRows.filter(r => r[cov] === level).length / treatedRows.length;
        const controlProp = controlRows.filter(r => r[cov] === level).length / controlRows.length;
        const matchedProp = matchedControlRows.length > 0 ? matchedControlRows.filter(r => r[cov] === level).length / matchedControlRows.length : NaN;
        
        const pooledSD = Math.sqrt((treatedProp * (1 - treatedProp) + controlProp * (1 - controlProp)) / 2);
        const smdBefore = pooledSD > 0 ? (treatedProp - controlProp) / pooledSD : 0;
        
        const pooledSDAfter = Math.sqrt((treatedProp * (1 - treatedProp) + matchedProp * (1 - matchedProp)) / 2);
        const smdAfter = pooledSDAfter > 0 ? (treatedProp - matchedProp) / pooledSDAfter : 0;
        
        const reduction = Math.abs(smdBefore) > 0.001 ?
          ((Math.abs(smdBefore) - Math.abs(smdAfter)) / Math.abs(smdBefore)) * 100 : 0;
        
        balance.push({
          covariate: `${cov}: ${level}`,
          meanTreated: treatedProp,
          meanControl: controlProp,
          meanMatchedControl: matchedProp,
          smdBefore,
          smdAfter,
          reduction
        });
      });
    }
  });
  
  return balance;
}

// ===== ATT Estimation =====
function calculateATT(rows, matches, outcomeCol) {
  const matchedPairs = matches.filter(m => m.matched && m.controls.length > 0);
  
  if (matchedPairs.length === 0) {
    return { att: NaN, se: NaN, tstat: NaN, pvalue: NaN, n: 0 };
  }
  
  const effects = matchedPairs.map(m => {
    const treatedOutcome = parseFloat(rows[m.treated][outcomeCol]);
    const controlOutcomes = m.controls.map(c => parseFloat(rows[c][outcomeCol]));
    const avgControlOutcome = controlOutcomes.reduce((a, b) => a + b, 0) / controlOutcomes.length;
    return {
      treatedOutcome,
      controlOutcome: avgControlOutcome,
      effect: treatedOutcome - avgControlOutcome
    };
  }).filter(e => isFinite(e.effect));
  
  if (effects.length === 0) {
    return { att: NaN, se: NaN, tstat: NaN, pvalue: NaN, n: 0 };
  }
  
  const n = effects.length;
  const att = effects.reduce((sum, e) => sum + e.effect, 0) / n;
  
  const variance = effects.reduce((sum, e) => sum + (e.effect - att) ** 2, 0) / Math.max(n - 1, 1);
  const se = Math.sqrt(variance / n);
  
  const tstat = se > 0 ? att / se : NaN;
  const pvalue = isFinite(tstat) ? 2 * (1 - tCDF(Math.abs(tstat), n - 1)) : NaN;
  
  const meanTreated = effects.reduce((sum, e) => sum + e.treatedOutcome, 0) / n;
  const meanControl = effects.reduce((sum, e) => sum + e.controlOutcome, 0) / n;
  
  const tCrit = 1.96;
  const ciLower = att - tCrit * se;
  const ciUpper = att + tCrit * se;
  
  return { att, se, tstat, pvalue, n, meanTreated, meanControl, ciLower, ciUpper };
}

// ===== UI Functions =====
function showLoading() {
  const overlay = document.getElementById('psm-loading-overlay');
  if (overlay) overlay.classList.add('active');
}

function hideLoading() {
  const overlay = document.getElementById('psm-loading-overlay');
  if (overlay) overlay.classList.remove('active');
}

function setUploadStatus(message, status = '') {
  const el = document.getElementById('raw-upload-status');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('success', 'error');
  if (status) el.classList.add(status);
}

function populateVariableSelectors() {
  const treatmentSelect = document.getElementById('treatment-select');
  const outcomeSelect = document.getElementById('outcome-select');
  const covariateList = document.getElementById('covariate-list');
  
  if (!treatmentSelect || !outcomeSelect || !covariateList) return;
  
  treatmentSelect.innerHTML = '<option value="">-- Select treatment --</option>';
  outcomeSelect.innerHTML = '<option value="">-- Select outcome --</option>';
  covariateList.innerHTML = '';
  
  dataset.headers.forEach(col => {
    const meta = columnMeta[col];
    
    if (meta.distinctValues.length === 2) {
      treatmentSelect.innerHTML += `<option value="${escapeHtml(col)}">${escapeHtml(col)}</option>`;
    }
    
    if (meta.isNumeric || meta.distinctValues.length === 2) {
      outcomeSelect.innerHTML += `<option value="${escapeHtml(col)}">${escapeHtml(col)}</option>`;
    }
    
    if (!meta.looksLikeId) {
      const row = document.createElement('div');
      row.className = 'predictor-row stacked-row';
      row.innerHTML = `
        <label>
          <input type="checkbox" name="covariate" value="${escapeHtml(col)}">
          <span>${escapeHtml(col)}</span>
          <span class="muted small">(${meta.isNumeric ? 'numeric' : `categorical, ${meta.distinctValues.length} levels`})</span>
        </label>
      `;
      covariateList.appendChild(row);
    }
  });
  
  document.getElementById('variable-selection-panel').classList.remove('hidden');
}

function updateAssignmentSummary() {
  const summary = document.getElementById('assignment-summary');
  if (!summary) return;
  
  const parts = [];
  if (selectedTreatment) parts.push(`Treatment: ${selectedTreatment}`);
  if (selectedOutcome) parts.push(`Outcome: ${selectedOutcome}`);
  if (selectedCovariates.length > 0) parts.push(`Covariates: ${selectedCovariates.length} selected`);
  
  summary.textContent = parts.length > 0 ? parts.join(' | ') : 'Select variables above.';
  
  const matchingPanel = document.getElementById('matching-options-panel');
  if (matchingPanel) {
    const ready = selectedTreatment && selectedOutcome && selectedCovariates.length > 0;
    matchingPanel.classList.toggle('hidden', !ready);
  }
}

// ===== Visualization =====
function plotPSDistribution(propensityScores, treatmentIndicator) {
  const container = document.getElementById('plot-ps-distribution');
  if (!container) return;
  
  const treatedPS = propensityScores.filter((_, i) => treatmentIndicator[i] === 1);
  const controlPS = propensityScores.filter((_, i) => treatmentIndicator[i] === 0);
  
  const traces = [
    {
      x: treatedPS,
      name: 'Treated',
      type: 'histogram',
      opacity: 0.7,
      marker: { color: '#2563eb' },
      xbins: { size: 0.05 }
    },
    {
      x: controlPS,
      name: 'Control',
      type: 'histogram',
      opacity: 0.7,
      marker: { color: '#f97316' },
      xbins: { size: 0.05 }
    }
  ];
  
  const layout = {
    barmode: 'overlay',
    xaxis: { title: 'Propensity Score', range: [0, 1] },
    yaxis: { title: 'Count' },
    legend: { x: 0.7, y: 0.95 },
    margin: { t: 30, r: 30, b: 50, l: 60 }
  };
  
  Plotly.newPlot(container, traces, layout, { responsive: true });
}

function plotBalanceLovePlot(balance) {
  const container = document.getElementById('plot-balance');
  if (!container) return;
  
  const covariates = balance.map(b => b.covariate);
  const smdBefore = balance.map(b => b.smdBefore);
  const smdAfter = balance.map(b => b.smdAfter);
  
  const traces = [
    {
      x: smdBefore,
      y: covariates,
      name: 'Before Matching',
      type: 'scatter',
      mode: 'markers',
      marker: { 
        size: 10, 
        color: 'rgba(0,0,0,0)',
        line: { width: 2, color: '#6b7280' }
      }
    },
    {
      x: smdAfter,
      y: covariates,
      name: 'After Matching',
      type: 'scatter',
      mode: 'markers',
      marker: { size: 12, color: '#2563eb' }
    }
  ];
  
  const shapes = [
    { type: 'line', x0: 0, x1: 0, y0: -0.5, y1: covariates.length - 0.5, line: { dash: 'dash', color: '#374151' } },
    { type: 'line', x0: -0.1, x1: -0.1, y0: -0.5, y1: covariates.length - 0.5, line: { dash: 'dot', color: '#059669', width: 1 } },
    { type: 'line', x0: 0.1, x1: 0.1, y0: -0.5, y1: covariates.length - 0.5, line: { dash: 'dot', color: '#059669', width: 1 } },
    { type: 'line', x0: -0.25, x1: -0.25, y0: -0.5, y1: covariates.length - 0.5, line: { dash: 'dot', color: '#d97706', width: 1 } },
    { type: 'line', x0: 0.25, x1: 0.25, y0: -0.5, y1: covariates.length - 0.5, line: { dash: 'dot', color: '#d97706', width: 1 } }
  ];
  
  const layout = {
    xaxis: { title: 'Standardized Mean Difference', zeroline: true },
    yaxis: { automargin: true },
    shapes,
    legend: { x: 0.7, y: 0.05 },
    margin: { t: 30, r: 30, b: 50, l: 150 }
  };
  
  Plotly.newPlot(container, traces, layout, { responsive: true });
}

// ===== Results Display =====
function displayMatchingSummary(matches, propensityScores, treatmentIndicator, supportInfo) {
  const nTreated = treatmentIndicator.filter(t => t === 1).length;
  const nControl = treatmentIndicator.filter(t => t === 0).length;
  const matchedPairs = matches.filter(m => m.matched).length;
  const unmatched = matches.filter(m => !m.matched).length;
  
  const matchedTreatedPS = matches.filter(m => m.matched).map(m => propensityScores[m.treated]);
  const matchedControlIndices = [...new Set(matches.flatMap(m => m.controls))];
  const matchedControlPS = matchedControlIndices.map(i => propensityScores[i]);
  
  document.getElementById('stat-n-treated').textContent = nTreated;
  document.getElementById('stat-n-control').textContent = nControl;
  document.getElementById('stat-matched-pairs').textContent = matchedPairs;
  document.getElementById('stat-unmatched').textContent = unmatched;
  document.getElementById('stat-mean-ps-treated').textContent = matchedTreatedPS.length > 0 ? formatNumber(
    matchedTreatedPS.reduce((a, b) => a + b, 0) / matchedTreatedPS.length
  ) : '--';
  document.getElementById('stat-mean-ps-control').textContent = matchedControlPS.length > 0 ? formatNumber(
    matchedControlPS.reduce((a, b) => a + b, 0) / matchedControlPS.length
  ) : '--';
  
  const qualityNote = document.getElementById('matching-quality-note');
  if (qualityNote) {
    const matchRate = matchedPairs / nTreated;
    let message = '';
    
    if (matchedPairs === 0) {
      // Provide detailed diagnostics for zero matches
      message = `<div style="color:#dc2626; padding: 1rem; background: #fef2f2; border-radius: 0.375rem; margin-top: 0.5rem;">
        <strong>⚠ No matches found!</strong><br>
        <p style="margin: 0.5rem 0;">This usually indicates poor overlap between treated and control groups. Common causes:</p>
        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
          <li>Propensity scores are nearly perfectly separated (treated near 1.0, controls near 0.0)</li>
          <li>The caliper is too narrow for the available data</li>
          <li>Sample size is too small</li>
        </ul>
        <p style="margin: 0.5rem 0;"><strong>Try:</strong> Increasing the caliper width, selecting fewer covariates, or checking the propensity score distribution above.</p>
      </div>`;
      
      if (supportInfo) {
        message += `<div style="margin-top: 0.5rem; font-size: 0.9rem; color: #6b7280;">
          <strong>Common Support Info:</strong> 
          Treated PS range: [${formatNumber(supportInfo.treatedRange[0])}, ${formatNumber(supportInfo.treatedRange[1])}] | 
          Control PS range: [${formatNumber(supportInfo.controlRange[0])}, ${formatNumber(supportInfo.controlRange[1])}]
          ${supportInfo.hasOverlap ? ` | Overlap region: [${formatNumber(supportInfo.overlapRange[0])}, ${formatNumber(supportInfo.overlapRange[1])}]` : ' | <span style="color:#dc2626;">No overlap!</span>'}
        </div>`;
      }
    } else if (matchRate >= 0.95) {
      message = '<span style="color:#059669;">✓ Excellent: All or nearly all treated units matched successfully.</span>';
    } else if (matchRate >= 0.8) {
      message = `<span style="color:#059669;">✓ Good: ${matchedPairs} of ${nTreated} treated units matched (${(matchRate * 100).toFixed(1)}%).</span>`;
    } else if (matchRate >= 0.5) {
      message = `<span style="color:#d97706;">⚠ Moderate: ${matchedPairs} of ${nTreated} treated units matched (${(matchRate * 100).toFixed(1)}%). Some treated units outside common support.</span>`;
    } else {
      message = `<span style="color:#dc2626;">⚠ Low match rate: Only ${matchedPairs} of ${nTreated} treated units matched (${(matchRate * 100).toFixed(1)}%). Consider widening the caliper or reviewing overlap.</span>`;
    }
    
    qualityNote.innerHTML = message;
  }
}

function displayBalanceTable(balance) {
  const tbody = document.getElementById('balance-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = balance.map(b => {
    const smdBeforeClass = Math.abs(b.smdBefore) < 0.1 ? 'smd-good' : Math.abs(b.smdBefore) < 0.25 ? 'smd-ok' : 'smd-bad';
    const smdAfterClass = Math.abs(b.smdAfter) < 0.1 ? 'smd-good' : Math.abs(b.smdAfter) < 0.25 ? 'smd-ok' : 'smd-bad';
    
    return `
      <tr>
        <td>${escapeHtml(b.covariate)}</td>
        <td>${formatNumber(b.meanTreated)}</td>
        <td>${formatNumber(b.meanControl)}</td>
        <td class="${smdBeforeClass}">${formatNumber(b.smdBefore)}</td>
        <td>${formatNumber(b.meanMatchedControl)}</td>
        <td class="${smdAfterClass}">${formatNumber(b.smdAfter)}</td>
        <td>${formatNumber(b.reduction, 1)}%</td>
      </tr>
    `;
  }).join('');
}

function displayATTResults(attResults) {
  document.getElementById('att-estimate').textContent = formatNumber(attResults.att, 3);
  document.getElementById('att-se').textContent = formatNumber(attResults.se, 4);
  document.getElementById('att-ci').textContent = `[${formatNumber(attResults.ciLower, 3)}, ${formatNumber(attResults.ciUpper, 3)}]`;
  document.getElementById('att-tstat').textContent = formatNumber(attResults.tstat, 3);
  document.getElementById('att-pvalue').textContent = formatP(attResults.pvalue);
  document.getElementById('mean-outcome-treated').textContent = formatNumber(attResults.meanTreated, 3);
  document.getElementById('mean-outcome-control').textContent = formatNumber(attResults.meanControl, 3);
  
  const statReport = document.getElementById('statistical-report');
  if (statReport) {
    const sig = attResults.pvalue < 0.05 ? 'statistically significant' : 'not statistically significant';
    statReport.innerHTML = `
      Propensity score matching was used to estimate the average treatment effect on the treated (ATT).
      The analysis matched ${attResults.n} treated units to comparable controls.
      The estimated ATT was <strong>${formatNumber(attResults.att, 3)}</strong> (SE = ${formatNumber(attResults.se, 4)}),
      t(${attResults.n - 1}) = ${formatNumber(attResults.tstat, 2)}, p = ${formatP(attResults.pvalue)}.
      This effect is ${sig} at the α = 0.05 level.
      The 95% CI is [${formatNumber(attResults.ciLower, 3)}, ${formatNumber(attResults.ciUpper, 3)}].
    `;
  }
  
  const mgrReport = document.getElementById('managerial-report');
  if (mgrReport) {
    const direction = attResults.att > 0 ? 'increased' : 'decreased';
    const absEffect = Math.abs(attResults.att);
    const confidence = attResults.pvalue < 0.05 ? 'strong evidence' : 'no clear evidence';
    
    mgrReport.innerHTML = `
      Among comparable individuals, those who received the treatment showed ${direction} outcomes 
      by an average of <strong>${formatNumber(absEffect, 2)}</strong> units.
      There is ${confidence} that the treatment had a real effect (p = ${formatP(attResults.pvalue)}).
      ${attResults.pvalue < 0.05 
        ? `This suggests the treatment is effective and similar results would likely be seen in future applications.`
        : `The observed difference may be due to chance; more data or a randomized experiment would strengthen conclusions.`
      }
    `;
  }
  
  document.getElementById('download-matched-data').disabled = false;
}

function displayPSModelDetails(model, terms) {
  const equationEl = document.getElementById('ps-model-equation');
  const tableBody = document.getElementById('ps-coef-table-body');
  
  if (equationEl) {
    const termStrings = terms.map((t, i) => {
      if (t.type === 'intercept') return formatNumber(model.coefficients[i], 3);
      const sign = model.coefficients[i] >= 0 ? '+' : '';
      return `${sign}${formatNumber(model.coefficients[i], 3)}×${t.name}`;
    });
    equationEl.textContent = `logit(P(Treatment=1)) = ${termStrings.join(' ')}`;
  }
  
  if (tableBody) {
    tableBody.innerHTML = terms.map((t, i) => `
      <tr>
        <td>${escapeHtml(t.name)}</td>
        <td>${formatNumber(model.coefficients[i], 4)}</td>
        <td>${formatNumber(model.standardErrors[i], 4)}</td>
        <td>${formatNumber(model.coefficients[i] / model.standardErrors[i], 3)}</td>
        <td>${formatP(2 * (1 - normalCDF(Math.abs(model.coefficients[i] / model.standardErrors[i]))))}</td>
        <td>${formatNumber(Math.exp(model.coefficients[i]), 3)}</td>
      </tr>
    `).join('');
  }
  
  document.getElementById('ps-pseudo-r2').textContent = formatNumber(model.pseudoR2, 4);
  document.getElementById('ps-chi2').textContent = formatNumber(model.modelChi2, 2);
  document.getElementById('ps-model-pvalue').textContent = formatP(1 - normalCDF(Math.sqrt(model.modelChi2)));
}

// ===== Main Analysis =====
async function runMatchingAnalysis() {
  if (!selectedTreatment || !selectedOutcome || selectedCovariates.length === 0) {
    alert('Please select treatment, outcome, and at least one covariate.');
    return;
  }
  
  const covariates = selectedCovariates.filter(c => c !== selectedTreatment && c !== selectedOutcome);
  
  if (covariates.length === 0) {
    alert('Please select at least one covariate that is not the treatment or outcome.');
    return;
  }
  
  showLoading();
  
  try {
    const validRows = dataset.rows.filter(row => {
      const tVal = row[selectedTreatment];
      const oVal = row[selectedOutcome];
      return tVal !== '' && tVal !== null && oVal !== '' && oVal !== null;
    });
    
    if (validRows.length < 20) {
      throw new Error('Need at least 20 valid rows for matching.');
    }
    
    const treatmentIndicator = validRows.map(row => {
      const val = String(row[selectedTreatment]);
      return val === treatmentCoding.focalValue || val === '1' ? 1 : 0;
    });
    
    const treatedIndices = treatmentIndicator.map((t, i) => t === 1 ? i : -1).filter(i => i >= 0);
    const controlIndices = treatmentIndicator.map((t, i) => t === 0 ? i : -1).filter(i => i >= 0);
    
    if (treatedIndices.length < 5 || controlIndices.length < 5) {
      throw new Error('Need at least 5 treated and 5 control units.');
    }
    
    const { X, terms } = prepareDesignMatrix(validRows, covariates, columnMeta);
    const model = fitLogisticRegression(treatmentIndicator, X);
    propensityModel = model;
    
    const propensityScores = model.fitted;
    
    const method = document.getElementById('matching-method').value;
    const caliper = parseFloat(document.getElementById('caliper-width').value) || 0.25;
    const withReplacement = document.getElementById('with-replacement').checked;
    const k = parseInt(document.getElementById('k-matches').value) || 3;
    
    // Assess common support before matching
    const supportInfo = assessCommonSupport(propensityScores, treatmentIndicator);
    
    const matchResult = performMatching(treatedIndices, controlIndices, propensityScores, {
      method, caliper, withReplacement, k
    });
    const matches = matchResult.matches;
    
    matchingResults = { matches, propensityScores, validRows, treatmentIndicator, supportInfo };
    
    const balance = calculateBalance(validRows, matches, covariates, columnMeta, selectedTreatment, treatmentCoding.focalValue);
    const attResults = calculateATT(validRows, matches, selectedOutcome);
    
    displayMatchingSummary(matches, propensityScores, treatmentIndicator, supportInfo);
    displayBalanceTable(balance);
    displayATTResults(attResults);
    displayPSModelDetails(model, terms);
    
    plotPSDistribution(propensityScores, treatmentIndicator);
    plotBalanceLovePlot(balance);
    
  } catch (error) {
    console.error('Matching error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
}

// ===== Data Loading =====
function parseUploadedFile(text) {
  if (typeof text !== 'string') throw new Error('Unable to read file contents.');
  const trimmed = text.trim();
  if (!trimmed) throw new Error('File is empty.');
  
  const lines = text.replace(/\r/g, '').split('\n');
  if (lines.length < 2) throw new Error('File must include a header row and at least one data row.');
  
  const headerLine = lines[0];
  const delimiter = headerLine.includes('\t') ? '\t' : ',';
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
  
  if (headers.length < 3) throw new Error('File must have at least 3 columns (treatment, outcome, covariate).');
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine || !rawLine.trim()) continue;
    
    const parts = rawLine.split(delimiter).map(p => p.trim().replace(/"/g, ''));
    if (parts.length !== headers.length) continue;
    
    const row = {};
    headers.forEach((h, idx) => { row[h] = parts[idx]; });
    rows.push(row);
    
    if (rows.length > RAW_UPLOAD_LIMIT) throw new Error(`Upload limit exceeded: only ${RAW_UPLOAD_LIMIT} rows supported.`);
  }
  
  if (!rows.length) throw new Error('No valid data rows found in the file.');
  return { headers, rows };
}

function buildColumnMeta(rows, headers) {
  const meta = {};
  
  headers.forEach(header => {
    const values = rows.map(r => r[header]);
    let missing = 0;
    const distinct = new Set();
    let numericCount = 0;
    
    values.forEach(v => {
      if (v === null || v === undefined || v === '') { missing++; return; }
      const num = parseFloat(v);
      if (Number.isFinite(num)) numericCount++;
      if (distinct.size < 50) distinct.add(String(v));
    });
    
    const nonMissing = values.length - missing;
    const isNumeric = numericCount === nonMissing && nonMissing > 0;
    const looksLikeId = distinct.size > nonMissing * 0.9 && nonMissing > 10;
    
    meta[header] = {
      isNumeric,
      missing,
      distinctValues: Array.from(distinct),
      looksLikeId
    };
  });
  
  return meta;
}

function handleFileUpload(file) {
  if (!file) return;
  
  setUploadStatus(`Loading ${file.name}...`);
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const result = parseUploadedFile(e.target.result);
      dataset = result;
      columnMeta = buildColumnMeta(result.rows, result.headers);
      
      setUploadStatus(`✓ Loaded ${file.name} (${result.rows.length} rows, ${result.headers.length} columns)`, 'success');
      populateVariableSelectors();
      
    } catch (error) {
      setUploadStatus(`✗ Error: ${error.message}`, 'error');
    }
  };
  reader.readAsText(file);
}

// ===== Event Listeners =====
function initEventListeners() {
  const dropzone = document.getElementById('raw-dropzone');
  const fileInput = document.getElementById('raw-input');
  const browseBtn = document.getElementById('raw-browse');
  
  if (dropzone) {
    dropzone.addEventListener('click', () => fileInput?.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dropzone--dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dropzone--dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dropzone--dragover');
      handleFileUpload(e.dataTransfer.files[0]);
    });
  }
  
  if (browseBtn) {
    browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput?.click(); });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', e => handleFileUpload(e.target.files[0]));
  }
  
  document.getElementById('raw-template-download')?.addEventListener('click', () => {
    const csv = `Treatment,Outcome,Covariate1,Covariate2,Covariate3
1,125.50,35,High,Yes
0,98.20,42,Medium,No
1,142.30,28,High,Yes
0,87.40,55,Low,No
1,156.80,31,High,Yes`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'psm_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
  
  document.getElementById('treatment-select')?.addEventListener('change', e => {
    selectedTreatment = e.target.value || null;
    
    const wrapper = document.getElementById('treatment-focal-wrapper');
    const focalSelect = document.getElementById('treatment-focal-select');
    const codingNote = document.getElementById('treatment-coding-note');
    
    if (selectedTreatment && columnMeta[selectedTreatment]) {
      const meta = columnMeta[selectedTreatment];
      const levels = meta.distinctValues.sort();
      
      if (!meta.isNumeric && levels.length === 2) {
        focalSelect.innerHTML = levels.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
        treatmentCoding.focalValue = levels[1];
        focalSelect.value = treatmentCoding.focalValue;
        wrapper.classList.remove('hidden');
        codingNote.textContent = `"${treatmentCoding.focalValue}" will be coded as treated (1).`;
      } else if (meta.isNumeric) {
        wrapper.classList.add('hidden');
        const has01 = levels.includes('0') && levels.includes('1');
        treatmentCoding.focalValue = has01 ? '1' : levels[1];
        codingNote.textContent = `Assuming 1 = treated, 0 = control.`;
      }
    } else {
      wrapper?.classList.add('hidden');
      codingNote.textContent = '';
    }
    
    updateAssignmentSummary();
  });
  
  document.getElementById('treatment-focal-select')?.addEventListener('change', e => {
    treatmentCoding.focalValue = e.target.value;
    const codingNote = document.getElementById('treatment-coding-note');
    if (codingNote) codingNote.textContent = `"${treatmentCoding.focalValue}" will be coded as treated (1).`;
  });
  
  document.getElementById('outcome-select')?.addEventListener('change', e => {
    selectedOutcome = e.target.value || null;
    updateAssignmentSummary();
  });
  
  document.getElementById('covariate-list')?.addEventListener('change', e => {
    if (e.target.name === 'covariate') {
      selectedCovariates = Array.from(document.querySelectorAll('#covariate-list input[name="covariate"]:checked'))
        .map(cb => cb.value);
      updateAssignmentSummary();
    }
  });
  
  document.getElementById('matching-method')?.addEventListener('change', e => {
    const kWrapper = document.getElementById('k-matches-wrapper');
    if (kWrapper) {
      kWrapper.style.display = e.target.value === 'nearest-k' ? 'block' : 'none';
    }
  });
  
  document.getElementById('run-matching-btn')?.addEventListener('click', runMatchingAnalysis);
  
  document.getElementById('download-matched-data')?.addEventListener('click', () => {
    if (!matchingResults) return;
    
    const { matches, propensityScores, validRows } = matchingResults;
    
    const lines = ['original_index,treatment,propensity_score,matched,match_id,outcome'];
    matches.forEach((m, idx) => {
      const row = validRows[m.treated];
      lines.push(`${m.treated},1,${propensityScores[m.treated].toFixed(4)},${m.matched ? 1 : 0},${idx},${row[selectedOutcome]}`);
      m.controls.forEach(c => {
        const cRow = validRows[c];
        lines.push(`${c},0,${propensityScores[c].toFixed(4)},1,${idx},${cRow[selectedOutcome]}`);
      });
    });
    
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matched_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
  
  document.getElementById('scenario-select')?.addEventListener('change', async e => {
    const scenarioId = e.target.value;
    const descEl = document.getElementById('scenario-description');
    const downloadBtn = document.getElementById('scenario-download');
    
    if (!scenarioId) {
      descEl.innerHTML = '<p>Use presets to explore causal inference scenarios.</p>';
      downloadBtn?.classList.add('hidden');
      return;
    }
    
    const scenario = PSM_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario) {
      descEl.innerHTML = scenario.description();
      downloadBtn?.classList.remove('hidden');
      downloadBtn?.removeAttribute('disabled');
      
      try {
        const response = await fetch(scenario.dataset);
        const text = await response.text();
        const result = parseUploadedFile(text);
        dataset = result;
        columnMeta = buildColumnMeta(result.rows, result.headers);
        
        setUploadStatus(`✓ Loaded scenario: ${scenario.label} (${result.rows.length} rows)`, 'success');
        populateVariableSelectors();
        
        setTimeout(() => {
          if (scenario.treatment) {
            const treatmentSelect = document.getElementById('treatment-select');
            if (treatmentSelect) {
              treatmentSelect.value = scenario.treatment;
              treatmentSelect.dispatchEvent(new Event('change'));
            }
          }
          if (scenario.outcome) {
            const outcomeSelect = document.getElementById('outcome-select');
            if (outcomeSelect) {
              outcomeSelect.value = scenario.outcome;
              outcomeSelect.dispatchEvent(new Event('change'));
            }
          }
          if (scenario.covariates) {
            scenario.covariates.forEach(cov => {
              const checkbox = document.querySelector(`#covariate-list input[value="${cov}"]`);
              if (checkbox) checkbox.checked = true;
            });
            selectedCovariates = scenario.covariates;
            updateAssignmentSummary();
          }
        }, 100);
        
      } catch (error) {
        console.error('Failed to load scenario:', error);
        setUploadStatus(`Failed to load scenario data.`, 'error');
      }
    }
  });
}

// ===== Initialization =====
let professorModeEnabled = false;

function populateScenarioDropdown() {
  const select = document.getElementById('scenario-select');
  if (!select) return;
  
  PSM_SCENARIOS.forEach(scenario => {
    const option = document.createElement('option');
    option.value = scenario.id;
    option.textContent = scenario.label;
    select.appendChild(option);
  });
}

function toggleProfessorMode(enabled) {
  professorModeEnabled = enabled;
  
  // Toggle selective redaction of interpretation content
  const interpretationElements = document.querySelectorAll('.interpretation-aid, #statistical-report, #managerial-report');
  
  interpretationElements.forEach(el => {
    if (enabled) {
      // Store original content and redact
      if (!el.dataset.originalContent) {
        el.dataset.originalContent = el.innerHTML;
      }
      el.classList.add('professor-mode-redacted');
      if (el.tagName === 'DETAILS') {
        el.open = false;
        el.querySelector('summary').innerHTML += ' <span class="redact-note">(hidden in Professor Mode)</span>';
      } else if (!el.classList.contains('interpretation-aid')) {
        el.innerHTML = '<span class="muted">[Answer hidden in Professor Mode - students work this out themselves]</span>';
      }
    } else {
      // Restore original content
      el.classList.remove('professor-mode-redacted');
      if (el.dataset.originalContent) {
        el.innerHTML = el.dataset.originalContent;
        delete el.dataset.originalContent;
      }
    }
  });
  
  console.log(`Professor Mode ${enabled ? 'enabled' : 'disabled'}`);
}

document.addEventListener('DOMContentLoaded', () => {
  populateScenarioDropdown();
  initEventListeners();
  
  // Professor Mode toggle
  const professorModeToggle = document.getElementById('professorMode');
  if (professorModeToggle) {
    professorModeToggle.addEventListener('change', (e) => {
      toggleProfessorMode(e.target.checked);
    });
  }
});
