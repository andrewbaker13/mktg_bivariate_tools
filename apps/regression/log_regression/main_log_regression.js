// Logistic Regression Tool - rebuilt controller

// Tool identifier for tracking
const TOOL_SLUG = 'logistic-regression';

// Scenario definitions
const LOG_REGRESSION_SCENARIOS = [
  {
    id: 'Influencer Campaign Conversion',
    label: '📱 Influencer Campaign Conversion',
    description: () => `
      <div class="scenario-card">
        <div class="scenario-header">
          <span class="scenario-icon">📱</span>
          <h3>Influencer Campaign: Predicting Purchase Conversion</h3>
        </div>
        <div class="scenario-badge-row">
          <span class="badge badge-hypothesis">Logistic Regression</span>
          <span class="badge badge-context">DTC / Influencer Marketing</span>
          <span class="badge badge-sample">n = influencer posts</span>
        </div>
        <div class="scenario-body">
          <p><strong>Business Context:</strong> You are the performance marketing analyst for a DTC beauty brand that relies heavily on Instagram and TikTok influencers. The team wants to understand which influencer partnerships drive <strong>purchases</strong>, not just impressions. Specifically, does <em>creator tier</em> (Mega, Mid, Micro) and <em>story engagement</em> predict conversion?</p>
          
          <p><strong>Dataset Variables:</strong></p>
          <div class="context-grid">
            <div class="context-item">
              <div class="context-label">Outcome</div>
              <div class="context-value">Converted</div>
              <div class="context-subtext">Binary: 1 = purchase, 0 = no purchase</div>
            </div>
            <div class="context-item">
              <div class="context-label">Story Views</div>
              <div class="context-value">Continuous</div>
              <div class="context-subtext">Unique story impressions</div>
            </div>
            <div class="context-item">
              <div class="context-label">Swipe Ups</div>
              <div class="context-value">Continuous</div>
              <div class="context-subtext">Link taps to landing page</div>
            </div>
            <div class="context-item">
              <div class="context-label">Influencer Tier</div>
              <div class="context-value">Categorical</div>
              <div class="context-subtext">Mega, Mid, Micro</div>
            </div>
            <div class="context-item">
              <div class="context-label">Audience Region</div>
              <div class="context-value">Categorical</div>
              <div class="context-subtext">US, EU, LATAM, APAC</div>
            </div>
          </div>
          
          <p><strong>Research Question:</strong> Use logistic regression to model the probability that a post converts (Converted = 1) as a function of engagement metrics and creator characteristics. Quantify patterns like "holding engagement constant, how does conversion likelihood change between mid-tier and micro influencers?"</p>
          
          <div class="scenario-insights">
            <div class="insight-title">🎯 Strategic Question</div>
            <p>Do micro creators with highly engaged audiences convert at higher rates than mega creators? Should budget allocation favor specific tiers or regions based on conversion odds?</p>
          </div>
          
          <p><strong>How to use:</strong> Set <em>Converted</em> as the binary outcome. Include <em>Story_Views</em> and <em>Swipe_Ups</em> as numeric predictors. Treat <em>Influencer_Tier</em> and <em>Audience_Region</em> as categorical. Interpret odds ratios to compare conversion probability across tiers and regions.</p>
        </div>
      </div>
    `,
    dataset: 'scenarios/influencer_conversion_data.csv',
    outcome: 'Converted',
    predictors: ['Story_Views', 'Swipe_Ups', 'Influencer_Tier', 'Audience_Region'],
    types: { Influencer_Tier: 'categorical', Audience_Region: 'categorical' }
  },
  {
    id: 'B2B Email Outreach Response',
    label: '📧 B2B Email Outreach Response',
    description: () => `
      <div class="scenario-card">
        <div class="scenario-header">
          <span class="scenario-icon">📧</span>
          <h3>B2B Email Sequences: Predicting Demo Bookings</h3>
        </div>
        <div class="scenario-badge-row">
          <span class="badge badge-hypothesis">Logistic Regression</span>
          <span class="badge badge-context">B2B SaaS / Sales</span>
          <span class="badge badge-sample">n = leads</span>
        </div>
        <div class="scenario-body">
          <p><strong>Business Context:</strong> You support a B2B SaaS sales team running multi-touch email sequences. Sales leadership wants to identify which leads are most likely to <strong>book a demo</strong>, enabling better prioritization of rep time and refined targeting strategies.</p>
          
          <p><strong>Dataset Variables:</strong></p>
          <div class="context-grid">
            <div class="context-item">
              <div class="context-label">Outcome</div>
              <div class="context-value">Responded</div>
              <div class="context-subtext">1 = demo booked, 0 = no demo</div>
            </div>
            <div class="context-item">
              <div class="context-label">Emails Sent</div>
              <div class="context-value">Continuous</div>
              <div class="context-subtext">Number of emails delivered</div>
            </div>
            <div class="context-item">
              <div class="context-label">Total Opens</div>
              <div class="context-value">Continuous</div>
              <div class="context-subtext">Opens across sequence</div>
            </div>
            <div class="context-item">
              <div class="context-label">Lead Score</div>
              <div class="context-value">Continuous (0-100)</div>
              <div class="context-subtext">Marketing automation score</div>
            </div>
            <div class="context-item">
              <div class="context-label">Industry</div>
              <div class="context-value">Categorical</div>
              <div class="context-subtext">SaaS, Ecommerce, Manufacturing, Agency</div>
            </div>
          </div>
          
          <p><strong>Research Question:</strong> Model the probability that a lead responds (Responded = 1) as a function of email volume, engagement, lead score, and industry. Focus on interpretable effects like "a 10-point increase in lead score multiplies the odds of response by X, holding industry constant."</p>
          
          <div class="scenario-insights">
            <div class="insight-title">🎯 Strategic Question</div>
            <p>Which industries respond best after controlling for engagement? Should SDRs prioritize high-score SaaS leads over mid-score ecommerce leads?</p>
          </div>
          
          <p><strong>How to use:</strong> Set <em>Responded</em> as binary outcome. Include <em>Emails_Sent</em>, <em>Total_Opens</em>, and <em>Lead_Score</em> as numeric predictors. Treat <em>Industry</em> as categorical. Interpret odds ratios to guide lead prioritization.</p>
        </div>
      </div>
    `,
    dataset: 'scenarios/email_outreach_data.csv',
    outcome: 'Responded',
    predictors: ['Emails_Sent', 'Total_Opens', 'Lead_Score', 'Industry'],
    types: { Industry: 'categorical' }
  },
  {
    id: 'Promo Incentive vs Recency',
    label: '🎁 Promo Incentive A/B Test',
    description: () => `
      <div class="scenario-card">
        <div class="scenario-header">
          <span class="scenario-icon">🎁</span>
          <h3>Digital Promo A/B Test: High Incentive vs Standard Offer</h3>
        </div>
        <div class="scenario-badge-row">
          <span class="badge badge-hypothesis">Logistic Regression</span>
          <span class="badge badge-context">Retail / Promo Testing</span>
          <span class="badge badge-sample">n = visitors</span>
        </div>
        <div class="scenario-body">
          <p><strong>Business Context:</strong> You're analyzing a digital promotion A/B test for a retail brand. Visitors see either a <strong>high-incentive offer</strong> (25% off + free shipping) or standard offer. Leadership wants to quantify how strongly the richer incentive changes conversion probability and whether recency matters.</p>
          
          <p><strong>Dataset Variables:</strong></p>
          <div class="context-grid">
            <div class="context-item">
              <div class="context-label">Outcome</div>
              <div class="context-value">Converted</div>
              <div class="context-subtext">1 = completed promo goal, 0 = no conversion</div>
            </div>
            <div class="context-item">
              <div class="context-label">High Incentive</div>
              <div class="context-value">Binary (0/1)</div>
              <div class="context-subtext">1 = saw high incentive, 0 = standard</div>
            </div>
            <div class="context-item">
              <div class="context-label">Days Since Last Visit</div>
              <div class="context-value">Continuous</div>
              <div class="context-subtext">Visitor recency</div>
            </div>
          </div>
          
          <p><strong>Research Question:</strong> Model conversion probability (Converted = 1) as a function of incentive level and visit recency. Expect one clearly significant effect (high incentive) and one small, non-significant negative effect (recency)—typical in real experiments where one lever dominates.</p>
          
          <div class="scenario-insights">
            <div class="insight-title">🎯 Strategic Question</div>
            <p>Does the high-incentive promo justify its cost through incremental lift? Is there evidence to tailor offers by visitor recency?</p>
          </div>
          
          <p><strong>How to use:</strong> Set <em>Converted</em> as binary outcome. Include <em>High_Incentive</em> and <em>Days_Since_Last_Visit</em> as numeric predictors. Focus on how much the high incentive multiplies conversion odds. Interpret the non-significant recency coefficient carefully.</p>
        </div>
      </div>
    `,
    dataset: 'scenarios/incentive_recency_data.csv',
    outcome: 'Converted',
    predictors: ['High_Incentive', 'Days_Since_Last_Visit']
  }
];

// Debouncing for auto-run tracking
let renderCount = 0;
let lastTrackTime = 0;

// ---------- State ----------
let selectedOutcome = null;
let selectedPredictors = [];
let predictorSettings = {};
let dataset = { headers: [], rows: [] };
let columnMeta = {};
let scenarioManifest = [];
let defaultScenarioDescription = '';
let activeScenarioDataset = null;
let selectedConfidenceLevel = 0.95;

const effectState = {
  focal: null,
  rangeMode: 'sd',
  customMin: null,
  customMax: null,
  catLevels: {},
  continuousOverrides: {}
};

let lastFilteredRows = [];
let lastPredictorsInfo = [];
let lastModel = null;
let lastRawDataset = null;
let outcomeCoding = { outcomeName: null, mode: 'numeric01', focalLabel: '1', nonFocalLabel: '0' };

// Expose for tutorial (Professor Mode) - AFTER all variables are declared
window.selectedOutcome = selectedOutcome;
window.selectedPredictors = selectedPredictors;
window.predictorSettings = predictorSettings;
window.lastModel = lastModel;

const RAW_UPLOAD_LIMIT = typeof MAX_UPLOAD_ROWS === 'number' ? MAX_UPLOAD_ROWS : 5000;

// ---------- Utilities ----------
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
function formatAlpha(alpha) {
  if (!isFinite(alpha)) return '0.050';
  const c = clamp(alpha, 0.0005, 0.25);
  if (c >= 0.1) return c.toFixed(2);
  if (c >= 0.01) return c.toFixed(3);
  return c.toFixed(4);
}
function logistic(x) {
  const val = 1 / (1 + Math.exp(-x));
  return Math.min(Math.max(val, 1e-8), 1 - 1e-8);
}

// Matrix helpers
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
    for (let r = i + 1; r < n; r++) if (Math.abs(result[r][i]) > Math.abs(result[maxRow][i])) maxRow = r;
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
function fCdf(f, df1, df2) {
  if (!(f >= 0) || df1 <= 0 || df2 <= 0) return NaN;
  const x = (df1 * f) / (df1 * f + df2);
  return betai(df1 / 2, df2 / 2, x);
}
// Regularized lower incomplete gamma via series / continued fraction
function gammaIncLower(a, x) {
  if (x <= 0 || a <= 0) return 0;
  if (x < a + 1) {
    // series expansion
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 100; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-8) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  // continued fraction for upper, then convert
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let n = 1; n <= 100; n++) {
    const an = -n * (n - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-8) break;
  }
  const gammaUpper = h * Math.exp(-x + a * Math.log(x) - logGamma(a));
  return Math.max(0, 1 - gammaUpper);
}
function chiSquareCdf(x, df) {
  if (!(x >= 0) || df <= 0) return NaN;
  return gammaIncLower(df / 2, x / 2);
}

// ---------- UI state helpers ----------
function applyConfidenceSelection(level, { syncAlpha = true, skipUpdate = false } = {}) {
  selectedConfidenceLevel = clamp(level, 0.5, 0.999);
  document.querySelectorAll('.conf-level-btn').forEach(btn => {
    const v = parseFloat(btn.dataset.level);
    btn.classList.toggle('selected', Math.abs(v - selectedConfidenceLevel) < 1e-6);
  });
  if (syncAlpha) {
    const alphaInput = document.getElementById('alpha');
    if (alphaInput) alphaInput.value = formatAlpha(1 - selectedConfidenceLevel);
  }
  if (!skipUpdate) updateResults();
}
function syncConfidenceButtonsToAlpha(alphaValue, { skipUpdate = false } = {}) {
  const alpha = parseFloat(alphaValue);
  let matched = false;
  if (isFinite(alpha) && alpha > 0 && alpha < 1) {
    document.querySelectorAll('.conf-level-btn').forEach(btn => {
      const level = parseFloat(btn.dataset.level);
      const expectedAlpha = +(1 - level).toFixed(3);
      const match = Math.abs(alpha - expectedAlpha) < 1e-4;
      btn.classList.toggle('selected', match);
      if (match) {
        selectedConfidenceLevel = level;
        matched = true;
      }
    });
    if (!matched) selectedConfidenceLevel = clamp(1 - alpha, 0.5, 0.999);
  } else {
    document.querySelectorAll('.conf-level-btn').forEach(btn => btn.classList.remove('selected'));
  }
  if (!skipUpdate) updateResults();
}

function setRawUploadStatus(message, status = '', { isHtml = true } = {}) {
  const statusEl = document.getElementById('raw-upload-status');
  if (!statusEl) return;
  if (isHtml) statusEl.innerHTML = message; else statusEl.textContent = message;
  statusEl.classList.remove('success', 'error');
  if (status) statusEl.classList.add(status);
}
function clearOutputs(message = 'Provide data to see results.') {
  const metrics = ['metric-loglik', 'metric-null-dev', 'metric-resid-dev', 'metric-chi2', 'metric-pmodel', 'metric-r2', 'metric-n', 'metric-alpha', 'metric-auc'];
  metrics.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '--'; });
  const apa = document.getElementById('apa-report');
  const mgr = document.getElementById('managerial-report');
  const equation = document.getElementById('regression-equation-output');
  const coefBody = document.getElementById('coef-table-body');
  const numBody = document.getElementById('numeric-summary-body');
  const catBody = document.getElementById('categorical-summary-body');
  if (apa) apa.textContent = '';
  if (mgr) mgr.textContent = '';
  if (equation) equation.textContent = message;
  if (coefBody) coefBody.innerHTML = `<tr><td colspan="9">${escapeHtml(message)}</td></tr>`;
  if (numBody) numBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  if (catBody) catBody.innerHTML = `<tr><td colspan="3">${escapeHtml(message)}</td></tr>`;
  ['plot-actual-fitted', 'plot-residuals', 'plot-coefficients', 'plot-effect', 'plot-roc', 'plot-variable-importance', 'plot-prob-distribution'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  const coefInterp = document.getElementById('coef-interpretation');
  if (coefInterp) coefInterp.textContent = 'Run the model to see column descriptions and examples.';
  const constantsNote = document.getElementById('effect-constants-note');
  if (constantsNote) constantsNote.textContent = '';
  
  // Clear new diagnostic elements
  const separationWarning = document.getElementById('separation-warning');
  if (separationWarning) {
    separationWarning.style.display = 'none';
    separationWarning.innerHTML = '';
  }
  const sampleSizeWarning = document.getElementById('sample-size-warning');
  if (sampleSizeWarning) {
    sampleSizeWarning.style.display = 'none';
    sampleSizeWarning.innerHTML = '';
  }
  const hlResult = document.getElementById('hl-test-result');
  if (hlResult) hlResult.textContent = '';
}

async function logToolRunToBackend(params, summaryText) {
    try {
        const response = await fetch("https://drbaker-backend.onrender.com/api/tool-run/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            // For now, no credentials; when we add login later, we’ll set credentials: "include"
            body: JSON.stringify({
                tool_slug: "log_regression",
                page_url: window.location.href,
                params_json: params,
                result_summary: summaryText
            })
        });

        if (!response.ok) {
            console.warn("Backend log failed with status:", response.status);
        }
    } catch (err) {
        console.error("Error logging tool run:", err);
    }
}

function showLogregLoading() {
  const overlay = document.getElementById('logreg-loading-overlay');
  if (overlay) overlay.classList.add('active');
}

function hideLogregLoading() {
  const overlay = document.getElementById('logreg-loading-overlay');
  if (overlay) overlay.classList.remove('active');
}

// ---------- Data ingest ----------
function parseRawUploadText(text) {
  if (typeof text !== 'string') throw new Error('Unable to read file contents.');
  const trimmed = text.trim();
  if (!trimmed) throw new Error('File is empty.');
  const lines = text.replace(/\r/g, '').split('\n');
  if (lines.length < 2) throw new Error('File must include a header row and at least one data row.');
  const headerLine = lines[0];
  const delimiter = typeof detectDelimiter === 'function'
    ? detectDelimiter(headerLine)
    : (headerLine.includes('\t') ? '\t' : ',');
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
  if (headers.length < 2) throw new Error('File must have at least two columns with headers.');
  const rows = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine || !rawLine.trim()) continue;
    const parts = rawLine.split(delimiter).map(p => p.trim().replace(/"/g, ''));
    if (parts.length !== headers.length) {
      errors.push(`Row ${i + 1}: expected ${headers.length} columns, found ${parts.length}.`);
      continue;
    }
    const row = {};
    headers.forEach((h, idx) => { row[h] = parts[idx]; });
    rows.push(row);
    if (rows.length > RAW_UPLOAD_LIMIT) throw new Error(`Upload limit exceeded: only ${RAW_UPLOAD_LIMIT} rows supported.`);
  }
  if (!rows.length) throw new Error(errors.length ? errors[0] : 'No valid rows found in the file.');
  return { headers, rows, warnings: errors };
}
function buildColumnMeta(rows, headers) {
  const meta = {};

  // If shared predictor utilities are available, use them for
  // consistent numeric / ID-like detection across tools.
  let sharedMetaByName = null;
  if (window.PredictorUtils && typeof window.PredictorUtils.inferPredictorMeta === 'function') {
    try {
      const sharedMeta = window.PredictorUtils.inferPredictorMeta(headers, rows, {
        outcomeName: null,
        sampleSize: 200,
        minContinuousDistinct: 10
      });
      sharedMetaByName = sharedMeta.reduce((acc, entry) => {
        acc[entry.name] = entry;
        return acc;
      }, {});
    } catch (e) {
      sharedMetaByName = null;
    }
  }

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

    const shared = sharedMetaByName ? sharedMetaByName[header] : null;
    const isNumeric = shared ? !!shared.isNumeric : numericCount === values.length - missing;
    const nonMissing = values.length - missing;
    const isConstant = nonMissing > 0 && distinct.size === 1;

    meta[header] = {
      isNumeric,
      missing,
      distinctValues: Array.from(distinct),
      isConstant,
      inferredType: isNumeric ? 'numeric' : 'categorical',
      looksLikeId: shared ? !!shared.looksLikeId : false
    };
  });

  return meta;
}

function updateOutcomeCodingFromData() {
  if (!selectedOutcome || !dataset || !Array.isArray(dataset.rows) || !dataset.rows.length) {
    outcomeCoding = { outcomeName: null, mode: 'invalid', focalLabel: null, nonFocalLabel: null };
    return;
  }
  const meta = columnMeta[selectedOutcome] || {};
  const values = dataset.rows
    .map(r => r[selectedOutcome])
    .filter(v => v !== null && v !== undefined && v !== '');
  const distinct = Array.from(new Set(values.map(v => String(v))));
  // Numeric 0/1 coding
  const allNumeric = distinct.every(v => Number.isFinite(parseFloat(v)));
  const numericDistinct = distinct.map(v => parseFloat(v));
  const isBinaryNumeric = allNumeric && numericDistinct.every(v => v === 0 || v === 1);
  if (isBinaryNumeric) {
    outcomeCoding = {
      outcomeName: selectedOutcome,
      mode: 'numeric01',
      focalLabel: '1',
      nonFocalLabel: '0'
    };
    return;
  }
  // Text-coded binary (two levels)
  if (!meta.isNumeric && distinct.length === 2) {
    let focal;
    if (outcomeCoding.outcomeName === selectedOutcome &&
      outcomeCoding.mode === 'textBinary' &&
      outcomeCoding.focalLabel &&
      distinct.includes(outcomeCoding.focalLabel)) {
      // Preserve existing choice if already set
      focal = outcomeCoding.focalLabel;
    } else {
      // Default to less prevalent outcome (minority class)
      const counts = new Map();
      values.forEach(v => {
        const str = String(v);
        counts.set(str, (counts.get(str) || 0) + 1);
      });
      const sorted = Array.from(counts.entries()).sort((a, b) => a[1] - b[1]);
      focal = sorted[0][0]; // Least common
    }
    const nonFocal = distinct.find(v => v !== focal) || null;
    outcomeCoding = {
      outcomeName: selectedOutcome,
      mode: 'textBinary',
      focalLabel: focal,
      nonFocalLabel: nonFocal
    };
    return;
  }
  outcomeCoding = { outcomeName: selectedOutcome, mode: 'invalid', focalLabel: null, nonFocalLabel: null };
}

function renderOutcomeFocalControl() {
  const container = document.getElementById('outcome-focal-wrapper');
  const select = document.getElementById('outcome-focal-select');
  const note = document.getElementById('outcome-coding-note');
  if (!container || !select || !note) return;
  if (!selectedOutcome || !dataset.rows.length) {
    container.classList.add('hidden');
    note.textContent = '';
    return;
  }
  updateOutcomeCodingFromData();
  if (outcomeCoding.mode === 'textBinary' &&
    outcomeCoding.focalLabel !== null &&
    outcomeCoding.nonFocalLabel !== null) {
    container.classList.remove('hidden');
    select.innerHTML = '';
    const levels = [outcomeCoding.focalLabel, outcomeCoding.nonFocalLabel];
    levels.forEach(level => {
      const opt = document.createElement('option');
      opt.value = level;
      opt.textContent = level;
      select.appendChild(opt);
    });
    select.value = outcomeCoding.focalLabel;
    
    // Calculate prevalence for helper text
    const focalCount = dataset.rows.filter(r => String(r[selectedOutcome]) === outcomeCoding.focalLabel).length;
    const totalCount = dataset.rows.filter(r => {
      const val = r[selectedOutcome];
      return val !== null && val !== undefined && val !== '';
    }).length;
    const prevalence = totalCount > 0 ? ((focalCount / totalCount) * 100).toFixed(1) : '0.0';
    
    note.innerHTML = `<strong>Focal outcome:</strong> "${escapeHtml(outcomeCoding.focalLabel)}" is coded as 1 (${prevalence}% of cases), "${escapeHtml(outcomeCoding.nonFocalLabel)}" as 0. The model predicts the probability of ${escapeHtml(outcomeCoding.focalLabel)}. Odds ratios show how predictors increase/decrease the odds of ${escapeHtml(outcomeCoding.focalLabel)} occurring.`;
    
    select.onchange = () => {
      const chosen = select.value;
      if (chosen === outcomeCoding.focalLabel) return;
      const other = chosen === outcomeCoding.nonFocalLabel ? outcomeCoding.focalLabel : outcomeCoding.nonFocalLabel;
      outcomeCoding.focalLabel = chosen;
      outcomeCoding.nonFocalLabel = other;
      
      // Recalculate prevalence for updated choice
      const focalCount = dataset.rows.filter(r => String(r[selectedOutcome]) === outcomeCoding.focalLabel).length;
      const totalCount = dataset.rows.filter(r => {
        const val = r[selectedOutcome];
        return val !== null && val !== undefined && val !== '';
      }).length;
      const prevalence = totalCount > 0 ? ((focalCount / totalCount) * 100).toFixed(1) : '0.0';
      
      note.innerHTML = `<strong>Focal outcome:</strong> "${escapeHtml(outcomeCoding.focalLabel)}" is coded as 1 (${prevalence}% of cases), "${escapeHtml(outcomeCoding.nonFocalLabel)}" as 0. The model predicts the probability of ${escapeHtml(outcomeCoding.focalLabel)}. Odds ratios show how predictors increase/decrease the odds of ${escapeHtml(outcomeCoding.focalLabel)} occurring.`;
      
      updateResults();
    };
  } else {
    container.classList.add('hidden');
    if (outcomeCoding.mode === 'numeric01') {
      note.textContent = 'Outcome is interpreted as numeric 0/1 with 1 treated as the focal outcome.';
    } else {
      note.textContent = 'Outcome must be coded as 0/1 or as a binary text variable with exactly two levels.';
    }
  }
}
function inferDefaults(meta, headers) {
  const numericCols = headers.filter(h => meta[h]?.isNumeric);
  const outcome = numericCols[0] || headers[0];
  const predictors = headers.filter(h => h !== outcome);
  return { outcome, predictors };
}

function applyScenarioHints(hints, headers) {
  if (!hints || !headers || !headers.length) return null;
  const outcome = (headers.includes(hints.outcome) && columnMeta[hints.outcome]?.isNumeric) ? hints.outcome : null;
  const predictors = Array.isArray(hints.predictors)
    ? hints.predictors.filter(p => headers.includes(p) && p !== outcome)
    : [];
  const types = hints.types && typeof hints.types === 'object' ? hints.types : {};
  return { outcome, predictors, types };
}

function importRawData(text, { isFromScenario = false, scenarioHints = null } = {}) {
  let parsed = parseRawUploadText(text);
  if (typeof detectIdLikeColumns === 'function') {
    const idCandidates = detectIdLikeColumns(parsed.headers, parsed.rows);
    if (Array.isArray(idCandidates) && idCandidates.length) {
      const names = idCandidates.map(c => `"${c.header}"`).join(', ');
      const message = idCandidates.length === 1
        ? `The column ${names} has a unique value for every row and may be an observation ID column. Ignore this column for analysis? (Cancel = keep it as a regular variable).`
        : `The columns ${names} each have a unique value for every row and may be observation ID columns. Ignore these column(s) for analysis? (Cancel = keep them as regular variables).`;
      if (window.confirm(message)) {
        const toDrop = new Set(idCandidates.map(c => c.header));
        const keptHeaders = parsed.headers.filter(h => !toDrop.has(h));
        const newRows = parsed.rows.map(row => {
          const next = {};
          keptHeaders.forEach(h => {
            next[h] = row[h];
          });
          return next;
        });
        parsed = { headers: keptHeaders, rows: newRows, warnings: parsed.warnings || [] };
      }
    }
  }
  if (typeof maybeConfirmDroppedRows === 'function' && Array.isArray(parsed.rows) && parsed.rows.length) {
    const totalRows = parsed.rows.length;
    const headersToCheck = parsed.headers || [];
    const completeRows = parsed.rows.filter(row => {
      return headersToCheck.every(h => {
        const v = row && Object.prototype.hasOwnProperty.call(row, h) ? row[h] : undefined;
        if (v === null || v === undefined) return false;
        const s = String(v).trim();
        return s.length > 0;
      });
    });
    if (completeRows.length !== totalRows) {
      const proceed = maybeConfirmDroppedRows({
        totalRows,
        keptRows: completeRows.length,
        contextLabel: 'observations'
      });
      if (!proceed) {
        dataset = { headers: [], rows: [] };
        setRawUploadStatus('Upload cancelled because some rows had missing values.', 'error', { isHtml: false });
        return;
      }
      parsed.rows = completeRows;
    }
  }
  const finalRowCount = Array.isArray(parsed.rows) ? parsed.rows.length : 0;
  const totalRowCountForStatus = typeof totalRows !== 'undefined' ? totalRows : finalRowCount;
  const droppedCountForStatus = totalRowCountForStatus - finalRowCount;
  dataset = { headers: parsed.headers, rows: parsed.rows };
  lastRawDataset = { headers: parsed.headers, rows: parsed.rows };
  columnMeta = buildColumnMeta(parsed.rows, parsed.headers);
  const hints = applyScenarioHints(scenarioHints, dataset.headers);
  const defaults = inferDefaults(columnMeta, dataset.headers);
  selectedOutcome = hints?.outcome || defaults.outcome;
  selectedPredictors = (hints?.predictors && hints.predictors.length) ? hints.predictors : defaults.predictors;
  window.selectedOutcome = selectedOutcome;  // Sync for tutorial
  window.selectedPredictors = selectedPredictors;  // Sync for tutorial
  predictorSettings = {};
  if (hints?.types) {
    Object.entries(hints.types).forEach(([col, type]) => {
      if (dataset.headers.includes(col)) {
        predictorSettings[col] = predictorSettings[col] || {};
        predictorSettings[col].type = type;
      }
    });
  }
  window.predictorSettings = predictorSettings;  // Sync for tutorial

  const constantPredictors = dataset.headers.filter(h => columnMeta[h]?.isConstant);
  const headerDescriptions = dataset.headers.map(h => {
    if (h === selectedOutcome) return `${h} <em>(Outcome Y)</em>`;
    const meta = columnMeta[h] || {};
    const typeSetting = predictorSettings[h]?.type || meta.inferredType || 'numeric';
    const typeLabel = typeSetting === 'categorical' ? 'Categorical' : 'Continuous';
    const isPredictor = selectedPredictors.includes(h);
    if (meta.isConstant) {
      return `${h} <em>(Constant - excluded as predictor, no variation)</em>`;
    }
    return isPredictor ? `${h} <em>(Predictor X - ${typeLabel})</em>` : `${h} <em>(Unused)</em>`;
  });
  let statusMessage = `Loaded ${dataset.rows.length} observations with headers: <strong>${headerDescriptions.join(', ')}</strong>.`;
  if (droppedCountForStatus > 0) {
    statusMessage += ` Using ${dataset.rows.length} of ${totalRowCountForStatus} observations (rows with missing or invalid values were excluded).`;
  }
  if (constantPredictors.length) {
    statusMessage += ` Constant column(s) were detected and excluded from predictor options because they have no variation: <strong>${constantPredictors.join(', ')}</strong>.`;
  }
  setRawUploadStatus(statusMessage, 'success');
  
  // Track file upload for engagement
  if (typeof markDataUploaded === 'function' && !isFromScenario) {
    markDataUploaded('uploaded_file.csv');
  }
  
  updateOutcomeCodingFromData();
  renderVariableSelectors();
  updateResults();
}

function handleRawFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try { importRawData(e.target.result); } catch (err) { setRawUploadStatus(err.message || 'Unable to load file.', 'error', { isHtml: false }); clearOutputs(err.message); }
  };
  reader.onerror = () => setRawUploadStatus('Unable to read file.', 'error');
  reader.readAsText(file);
}

function setupRawUpload() {
  const dropzoneId = 'raw-dropzone';
  const inputId = 'raw-input';
  const browseId = 'raw-browse';
  const onFile = file => handleRawFile(file);
  const templateButton = document.getElementById('raw-template-download');

  if (!window.UIUtils || typeof window.UIUtils.initDropzone !== 'function') {
    setRawUploadStatus('Upload helper not available. Please refresh.', 'error');
    return;
  }

  window.UIUtils.initDropzone({
    dropzoneId,
    inputId,
    browseId,
    accept: '.csv,.tsv,.txt',
    onFile,
    onError: msg => setRawUploadStatus(msg || 'Unable to load file.', 'error')
  });

  if (templateButton) {
    templateButton.addEventListener('click', event => {
      event.preventDefault();
      const link = document.createElement('a');
      link.href = 'sample_template.csv';
      link.download = 'mlr_raw_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  setRawUploadStatus('No raw file uploaded.');
}

// ---------- Scenario handling ----------
async function fetchScenarioIndex() {
  scenarioManifest = LOG_REGRESSION_SCENARIOS;
  populateScenarioSelect();
}
function populateScenarioSelect() {
  const select = document.getElementById('scenario-select');
  if (!select) return;
  select.innerHTML = '<option value="">Manual inputs (no preset)</option>';
  scenarioManifest.forEach(entry => {
    const opt = document.createElement('option');
    opt.value = entry.id;
    opt.textContent = entry.label || entry.id;
    select.appendChild(opt);
  });
}
async function loadScenario(id) {
  const scenario = scenarioManifest.find(s => s.id === id);
  if (!scenario) return;
  const downloadButton = document.getElementById('scenario-download');
  if (downloadButton) {
    activeScenarioDataset = scenario.dataset || null;
    downloadButton.classList.toggle('hidden', !scenario.dataset);
    downloadButton.disabled = !scenario.dataset;
    if (scenario.dataset) {
      downloadButton.onclick = () => {
        const link = document.createElement('a');
        link.href = scenario.dataset;
        link.download = scenario.dataset.split('/').pop() || 'scenario_dataset.csv';
        link.click();
        };
      }
    }
    
    // Load scenario description (inline)
    const descriptionHTML = typeof scenario.description === 'function' ? scenario.description() : scenario.description;
    if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
      window.UIUtils.renderScenarioDescription({
        containerId: 'scenario-description',
        title: scenario.label || '',
        description: descriptionHTML,
        defaultHtml: defaultScenarioDescription
      });
    } else {
      const descContainer = document.getElementById('scenario-description');
      if (descContainer) descContainer.innerHTML = descriptionHTML || '';
    }
    
    // Track scenario loading for engagement
    if (typeof markScenarioLoaded === 'function') {
      markScenarioLoaded(scenario.label);
    }
    
  if (scenario.dataset) {
    try {
      const resp = await fetch(scenario.dataset, { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`Unable to load scenario dataset (${resp.status})`);
      const csvText = await resp.text();
      importRawData(csvText, { isFromScenario: true, scenarioHints: scenario });
    } catch (err) {
      setRawUploadStatus(err.message || 'Unable to load scenario dataset.', 'error', { isHtml: false });
    }
  }
}
function setupScenarioSelector() {
  const select = document.getElementById('scenario-select');
  if (!select) return;
  select.addEventListener('change', () => {
    const id = select.value;
    if (!id) {
      const descContainer = document.getElementById('scenario-description');
      if (descContainer) descContainer.innerHTML = defaultScenarioDescription;
      activeScenarioDataset = null;
      return;
    }
    loadScenario(id);
  });
  fetchScenarioIndex();
}

// ---------- Variable selection UI ----------
function renderVariableSelectors() {
  const panel = document.getElementById('variable-selection-panel');
  if (!panel) return;
  if (!dataset.rows.length) { panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');

  // Ensure all available predictors (except outcome) are selected by default
  const desiredPredictors = dataset.headers.filter(h => h !== selectedOutcome);
  if (desiredPredictors.length && selectedPredictors.length < desiredPredictors.length) {
    desiredPredictors.forEach(h => {
      if (!selectedPredictors.includes(h)) selectedPredictors.push(h);
    });
  }
  const outcomeSelect = document.getElementById('outcome-select');
  if (outcomeSelect) {
    outcomeSelect.innerHTML = '';
    const candidates = dataset.headers.filter(h => {
      const meta = columnMeta[h] || {};
      if (meta.isNumeric) return true;
      const distinct = (meta.distinctValues || []).filter(v => v !== null && v !== undefined && v !== '');
      return distinct.length === 2;
    });
    if (!candidates.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No binary outcome columns detected';
      opt.disabled = true;
      outcomeSelect.appendChild(opt);
    } else {
      candidates.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h;
        opt.textContent = h;
        outcomeSelect.appendChild(opt);
      });
      if (selectedOutcome && candidates.includes(selectedOutcome)) {
        outcomeSelect.value = selectedOutcome;
      } else {
        selectedOutcome = candidates[0] || '';
        outcomeSelect.value = selectedOutcome;
      }
    }
    renderOutcomeFocalControl();
    outcomeSelect.onchange = () => {
      selectedOutcome = outcomeSelect.value;
      window.selectedOutcome = selectedOutcome;  // Sync for tutorial
      if (selectedPredictors.includes(selectedOutcome)) {
        selectedPredictors = selectedPredictors.filter(p => p !== selectedOutcome);
        window.selectedPredictors = selectedPredictors;  // Sync for tutorial
      }
      updateOutcomeCodingFromData();
      renderOutcomeFocalControl();
      updateResults();
      renderVariableSelectors();
    };
  }
  const predictorList = document.getElementById('predictor-list');
  if (!predictorList) return;
  predictorList.innerHTML = '';
  dataset.headers.forEach(header => {
    if (header === selectedOutcome) return;
    const meta = columnMeta[header] || {};
    const looksLikeId = !!meta.looksLikeId;
    const isConstant = !!meta.isConstant;
    if (looksLikeId) {
      // Ensure ID-like columns are not treated as predictors
      selectedPredictors = selectedPredictors.filter(p => p !== header);
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'predictor-row stacked-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'predictor-check';
    checkbox.dataset.col = header;
    checkbox.checked = !looksLikeId && !isConstant && selectedPredictors.includes(header);
    checkbox.disabled = looksLikeId || isConstant;
    const label = document.createElement('label');
    if (looksLikeId) {
      label.textContent = `${header} (treated as ID; not used as predictor)`;
    } else if (isConstant) {
      label.textContent = `${header} (constant - excluded, no variation)`;
    } else {
      label.textContent = header;
    }
    label.htmlFor = `pred-${header}`;
    checkbox.id = `pred-${header}`;
    const typeSelect = document.createElement('select');
    typeSelect.className = 'predictor-type';
    typeSelect.dataset.col = header;
    const isNumeric = meta.isNumeric;
    const canCategorical = isNumeric
      ? meta.distinctValues.length > 0 && meta.distinctValues.length <= 10 && meta.distinctValues.every(v => Number.isInteger(parseFloat(v)))
      : true;
    const typeOptions = [];
    if (isNumeric) {
      typeOptions.push('numeric');
      if (canCategorical) typeOptions.push('categorical');
    } else {
      typeOptions.push('categorical');
    }
      typeOptions.forEach(optVal => {
        const opt = document.createElement('option');
        opt.value = optVal;
        opt.textContent = optVal.charAt(0).toUpperCase() + optVal.slice(1);
        typeSelect.appendChild(opt);
      });
      const currentType = predictorSettings[header]?.type || meta.inferredType || 'numeric';
    typeSelect.value = typeOptions.includes(currentType) ? currentType : typeOptions[0];
    const refWrapper = document.createElement('div');
    refWrapper.className = 'predictor-ref-wrapper';
    const refSelect = document.createElement('select');
    refSelect.className = 'predictor-ref';
    refSelect.dataset.col = header;
    refWrapper.appendChild(refSelect);
    const distinct = meta.distinctValues || [];
    if (!distinct.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No levels';
      opt.disabled = true;
      refSelect.appendChild(opt);
    } else {
      distinct.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        refSelect.appendChild(opt);
      });
    }
    const currentRef = predictorSettings[header]?.reference || distinct[0] || '';
    refSelect.value = currentRef;
    const initialType = predictorSettings[header]?.type || meta.inferredType;
    refWrapper.style.display = initialType === 'categorical' ? 'block' : 'none';

    if (looksLikeId) {
      checkbox.disabled = true;
      typeSelect.disabled = true;
      refSelect.disabled = true;
    } else {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (!selectedPredictors.includes(header)) selectedPredictors.push(header);
        } else {
          selectedPredictors = selectedPredictors.filter(p => p !== header);
        }
        window.selectedPredictors = selectedPredictors;  // Sync for tutorial
        updateResults();
      });
      typeSelect.addEventListener('change', () => {
        const newType = typeSelect.value;
        predictorSettings[header] = predictorSettings[header] || {};
        predictorSettings[header].type = newType;
        window.predictorSettings = predictorSettings;  // Sync for tutorial
        const isCat = predictorSettings[header].type === 'categorical';
        refSelect.disabled = !isCat;
        refWrapper.style.display = isCat ? 'block' : 'none';
        updateResults();
      });
      refSelect.addEventListener('change', () => {
        predictorSettings[header] = predictorSettings[header] || {};
        predictorSettings[header].reference = refSelect.value;
        window.predictorSettings = predictorSettings;  // Sync for tutorial
        updateResults();
      });
    }
    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    wrapper.appendChild(typeSelect);
    wrapper.appendChild(refWrapper);
    predictorList.appendChild(wrapper);
  });
}

// ---------- Filtering ----------
function filterRowsForModel() {
  if (!dataset.rows.length || !selectedOutcome || !selectedPredictors.length) {
    return { filtered: [], dropped: 0, issues: ['Upload data and select at least one predictor.'] };
  }
  const usedColumns = [selectedOutcome, ...selectedPredictors];
  const predictorsInfo = selectedPredictors.map(p => {
    const setting = predictorSettings[p]?.type || columnMeta[p]?.inferredType || 'numeric';
    return { name: p, type: setting };
  });
  const filtered = [];
  let dropped = 0;
  const issues = [];
  dataset.rows.forEach(row => {
    const hasMissing = usedColumns.some(col => row[col] === '' || row[col] === null || row[col] === undefined);
    if (hasMissing) { dropped++; return; }
    const copy = {}; usedColumns.forEach(col => { copy[col] = row[col]; }); filtered.push(copy);
  });
  predictorsInfo.forEach(info => {
    if (info.type === 'categorical') {
      const distinct = new Set(filtered.map(r => r[info.name]));
      const count = distinct.size;
      if (count < 2) issues.push(`Predictor "${info.name}" needs at least 2 levels after filtering.`);
      const meta = columnMeta[info.name] || {};
      if (meta.isNumeric && count > 10) issues.push(`Predictor "${info.name}" has ${count} numeric levels; categorical mode is limited to 10 or fewer.`);
    } else {
      const invalid = filtered.find(r => !Number.isFinite(parseFloat(r[info.name])));
      if (invalid) issues.push(`Predictor "${info.name}" must be numeric for continuous mode.`);
    }
  });
  return { filtered, dropped, issues, predictorsInfo };
}

// ---------- Modeling ----------
  function buildDesignMatrixAndFit(rows, predictorsInfo, outcomeName, alpha) {
  const y = [];
  const X = [];
  const terms = [{ predictor: 'Intercept', term: 'Intercept', label: 'Intercept', type: 'intercept' }];
  // Predefine terms
  predictorsInfo.forEach(info => {
    if (info.type === 'categorical') {
      const meta = columnMeta[info.name] || {};
      const ref = predictorSettings[info.name]?.reference || (meta.distinctValues && meta.distinctValues[0]) || null;
      const levels = meta.distinctValues && meta.distinctValues.length
        ? meta.distinctValues
        : Array.from(new Set(rows.map(r => r[info.name])));
      levels.forEach(lvl => {
        if (lvl === ref) return;
        terms.push({ predictor: info.name, term: lvl, label: `${info.name}: ${lvl}`, type: 'categorical', reference: ref });
      });
    } else {
      terms.push({ predictor: info.name, term: info.name, label: info.name, type: 'continuous' });
    }
  });
    for (const row of rows) {
    const raw = row[outcomeName];
    let yv;
    if (outcomeCoding.mode === 'numeric01') {
      yv = parseFloat(raw);
      if (!Number.isFinite(yv) || (yv !== 0 && yv !== 1)) {
        return { error: `Outcome "${outcomeName}" must be coded as 0/1 or as a binary text variable with exactly two levels.` };
      }
    } else if (outcomeCoding.mode === 'textBinary') {
      if (raw === outcomeCoding.focalLabel) {
        yv = 1;
      } else if (raw === outcomeCoding.nonFocalLabel) {
        yv = 0;
      } else {
        return { error: `Outcome "${outcomeName}" must have exactly two categories. Unexpected level "${raw}" found.` };
      }
    } else {
      return { error: `Outcome "${outcomeName}" must be coded as 0/1 or as a binary text variable with exactly two levels.` };
    }
    const xRow = [1];
    predictorsInfo.forEach(info => {
      if (info.type === 'categorical') {
        terms
          .filter(t => t.predictor === info.name && t.type === 'categorical')
          .forEach(t => xRow.push(row[info.name] === t.term ? 1 : 0));
      } else {
        const v = parseFloat(row[info.name]);
        xRow.push(Number.isFinite(v) ? v : NaN);
      }
    });
    if (xRow.some(v => !Number.isFinite(v))) return { error: 'Non-numeric value detected in a continuous predictor.' };
      X.push(xRow); y.push(yv);
    }
    const n = y.length;
    const p = X[0]?.length || 0;
    if (p <= 1) return { error: 'No predictors available to fit the model.' };

    // Optionally standardize continuous predictor columns (mean 0, SD 1)
    const standardizeInput = document.getElementById('logreg-standardize-continuous');
    const standardize = !!(standardizeInput && standardizeInput.checked);
    if (standardize) {
      const contCols = [];
      let colIndex = 1; // skip intercept
      predictorsInfo.forEach(info => {
        if (info.type === 'categorical') {
          const meta = columnMeta[info.name] || {};
          const levels = meta.distinctValues || [];
          colIndex += Math.max(0, levels.length - 1);
        } else {
          contCols.push(colIndex);
          colIndex += 1;
        }
      });
      contCols.forEach(j => {
        let sum = 0;
        let count = 0;
        for (let i = 0; i < X.length; i++) {
          const v = X[i][j];
          if (Number.isFinite(v)) {
            sum += v;
            count++;
          }
        }
        if (!count) return;
        const mean = sum / count;
        let varSum = 0;
        for (let i = 0; i < X.length; i++) {
          const v = X[i][j];
          if (!Number.isFinite(v)) continue;
          const diff = v - mean;
          varSum += diff * diff;
        }
        const variance = count > 1 ? varSum / (count - 1) : 0;
        const sd = Math.sqrt(Math.max(variance, 0)) || 1;
        for (let i = 0; i < X.length; i++) {
          const v = X[i][j];
          if (!Number.isFinite(v)) continue;
          X[i][j] = (v - mean) / sd;
        }
      });
    }

  // Fit intercept-only (null) model
  const yMean = StatsUtils.mean(y);
  const eps = 1e-8;
  const pNull = Math.min(Math.max(yMean, eps), 1 - eps);
  const logLikNull = y.reduce(
    (acc, yi) => acc + (yi ? Math.log(pNull) : Math.log(1 - pNull)),
    0
  );

  // Logistic IRLS
  let beta = Array(p).fill(0);
  const maxIter = 25;
  const tol = 1e-6;

  for (let iter = 0; iter < maxIter; iter++) {
    const eta = X.map(row => row.reduce((acc, v, j) => acc + v * beta[j], 0));
    const pHat = eta.map(e => {
      const val = 1 / (1 + Math.exp(-e));
      return Math.min(Math.max(val, eps), 1 - eps);
    });
    const w = pHat.map(pi => pi * (1 - pi));
    const z = y.map((yi, i) => eta[i] + (yi - pHat[i]) / w[i]);

    const Xt = transpose(X);
    const XtW = Xt.map(row => row.map((val, k) => val * w[k]));
    const XtWX = multiply(XtW, X);
    const XtWz = XtW.map(row => row.reduce((acc, v, idx) => acc + v * z[idx], 0));
    const XtWXInv = invert(XtWX);
    if (!XtWXInv) return { error: 'Model matrix is singular under logistic fit; remove redundant predictors.' };

    const betaNew = XtWXInv.map(row => row.reduce((acc, v, j) => acc + v * XtWz[j], 0));
    const maxChange = Math.max(...betaNew.map((b, j) => Math.abs(b - beta[j])));
    beta = betaNew;
    if (maxChange < tol) {
      break;
    }
  }

  const etaFinal = X.map(row => row.reduce((acc, v, j) => acc + v * beta[j], 0));
  const pFinal = etaFinal.map(e => {
    const val = 1 / (1 + Math.exp(-e));
    return Math.min(Math.max(val, eps), 1 - eps);
  });

  // Log-likelihood and deviance
  const logLik = y.reduce(
    (acc, yi, i) => acc + (yi ? Math.log(pFinal[i]) : Math.log(1 - pFinal[i])),
    0
  );
  const nullDev = -2 * y.reduce(
    (acc, yi) => acc + (yi ? Math.log(pNull) : Math.log(1 - pNull)),
    0
  );
  const residDev = -2 * logLik;
  const dfModel = p - 1;
  const modelChi2 = nullDev - residDev;
  const pseudoR2 = (logLikNull !== 0) ? 1 - (logLik / logLikNull) : NaN;

  // Covariance matrix and standard errors (from final Fisher information)
  const Xt = transpose(X);
  const XtWFinal = Xt.map(row => row.map((val, k) => {
    const pi = pFinal[k];
    return val * pi * (1 - pi);
  }));
  const XtWXFinal = multiply(XtWFinal, X);
  const covB = invert(XtWXFinal);
  if (!covB) return { error: 'Unable to invert information matrix for standard errors.' };
  const se = covB.map((row, i) => Math.sqrt(Math.max(row[i], 0)));
  const zStats = beta.map((b, i) => (se[i] ? b / se[i] : NaN));
  const pVals = zStats.map(zv => Number.isFinite(zv) ? 2 * (1 - StatsUtils.normCdf(Math.abs(zv))) : NaN);
  const zCrit = StatsUtils.normInv(1 - alpha / 2);
  const ciLower = beta.map((b, i) => b - zCrit * se[i]);
  const ciUpper = beta.map((b, i) => b + zCrit * se[i]);

  const coefRows = terms.map((term, idx) => ({
    predictor: term.predictor,
    term: term.term,
    label: term.label,
    estimate: beta[idx],
    se: se[idx],
    z: zStats[idx],
    p: pVals[idx],
    lower: ciLower[idx],
    upper: ciUpper[idx],
    type: term.type || (idx === 0 ? 'intercept' : 'continuous'),
    reference: term.reference || null
  }));

  // Deviance residuals for diagnostics
  const residuals = y.map((yi, i) => {
    const pi = pFinal[i];
    const contrib = yi ? -2 * Math.log(pi) : -2 * Math.log(1 - pi);
    const sign = yi - pi >= 0 ? 1 : -1;
    return sign * Math.sqrt(Math.max(contrib, 0));
  });

    return {
      n,
    dfModel,
    alpha,
    logLik,
    logLikNull,
    nullDev,
    residDev,
    modelChi2,
    pseudoR2,
    terms: coefRows,
    residuals,
    fitted: pFinal,
    y,
    predictorsInfo,
    designMatrix: X,
      covB,
      outcomeFocalLabel: outcomeCoding.focalLabel,
      outcomeNonFocalLabel: outcomeCoding.nonFocalLabel
    };
}

function fitSSE(X, y) {
  if (!X.length || !y.length) return { sse: NaN, dfError: null };
  const Xt = transpose(X);
  const XtX = multiply(Xt, X);
  const XtXInv = invert(XtX);
  if (!XtXInv) return { sse: NaN, dfError: null };
  const XtY = multiply(Xt, y.map(v => [v]));
  const beta = multiply(XtXInv, XtY).map(r => r[0]);
  const fitted = X.map(row => row.reduce((acc, v, i) => acc + v * beta[i], 0));
  const residuals = y.map((yv, i) => yv - fitted[i]);
  const sse = residuals.reduce((acc, r) => acc + r * r, 0);
  const dfError = y.length - X[0].length;
  return { sse, dfError };
}

function assignPredictorPartialEta(model) {
  if (!model || !Array.isArray(model.terms) || !Array.isArray(model.designMatrix) || !Array.isArray(model.y)) return;
  const fullSSE = model.sse;
  const terms = model.terms;
  const predictors = Array.from(new Set(terms.slice(1).map(t => t.predictor).filter(Boolean)));
  const X = model.designMatrix;
  const y = model.y;
  predictors.forEach(pred => {
    const dropIdx = terms.map((t, idx) => (t.predictor === pred ? idx : -1)).filter(i => i >= 0);
    if (!dropIdx.length) return;
    const keepIdx = terms.map((_, idx) => idx).filter(idx => !dropIdx.includes(idx));
    if (!keepIdx.length) return;
    const Xred = X.map(row => keepIdx.map(k => row[k]));
    const reduced = fitSSE(Xred, y);
    if (!Number.isFinite(reduced.sse)) return;
    const ssEffect = reduced.sse - fullSSE;
    const denom = ssEffect + fullSSE;
    const eta = denom > 0 ? Math.max(ssEffect, 0) / denom : NaN;
    terms.forEach(t => { if (t.predictor === pred) t.partialEta2 = eta; });
  });
}

// ---------- Rendering ----------
  function populateMetrics(model) {
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('metric-loglik', formatNumber(model.logLik, 3));
    set('metric-null-dev', formatNumber(model.nullDev, 3));
    set('metric-resid-dev', formatNumber(model.residDev, 3));
    set('metric-chi2', formatNumber(model.modelChi2, 3));
    // df for chi-square is dfModel
    const pModel = Number.isFinite(model.modelChi2) && model.dfModel > 0
      ? formatP(1 - chiSquareCdf(model.modelChi2, model.dfModel))
      : '--';
    set('metric-pmodel', pModel);
    set('metric-r2', formatNumber(model.pseudoR2, 3));
    set('metric-n', model.n.toString());
    set('metric-alpha', formatAlpha(model.alpha));
  }

  function populateCoefficients(model) {
    const body = document.getElementById('coef-table-body');
    if (!body) return;
    const lowerHeader = document.getElementById('coef-ci-lower-header');
    const upperHeader = document.getElementById('coef-ci-upper-header');
    const ciLabel = `${Math.round((1 - model.alpha) * 100)}% CI`;
    if (lowerHeader) lowerHeader.textContent = `${ciLabel} (Lower)`;
    if (upperHeader) upperHeader.textContent = `${ciLabel} (Upper)`;
    if (!model.terms || !model.terms.length) { body.innerHTML = '<tr><td colspan="9">No coefficients available.</td></tr>'; return; }
    body.innerHTML = model.terms.map(term => {
      const isCat = term.type === 'categorical';
      const isIntercept = term.predictor === 'Intercept';
      const oddsRatio = Number.isFinite(term.estimate) ? Math.exp(term.estimate) : NaN;
      return `
      <tr>
        <td>${escapeHtml(term.predictor)}${isCat && term.reference ? ` (ref="${escapeHtml(term.reference)}")` : ''}</td>
        <td>${isCat ? escapeHtml(term.term) : ''}</td>
        <td>${formatNumber(term.estimate, 4)}</td>
        <td>${formatNumber(term.se, 4)}</td>
        <td>${formatNumber(term.z, 3)}</td>
        <td>${formatP(term.p)}</td>
        <td>${isIntercept ? '--' : formatNumber(oddsRatio, 3)}</td>
        <td>${formatNumber(term.lower, 4)}</td>
        <td>${formatNumber(term.upper, 4)}</td>
      </tr>
    `;
    }).join('');
  }

function renderEquation(model) {
  const equationEl = document.getElementById('regression-equation-output');
  if (!equationEl || !model.terms || !model.terms.length) return;
  const parts = model.terms.map((term, idx) => {
    if (idx === 0) return formatNumber(term.estimate, 3);
    const sign = term.estimate >= 0 ? '+' : '-';
    const absVal = formatNumber(Math.abs(term.estimate), 3);
    return term.type === 'categorical'
      ? `${sign} ${absVal}×(${escapeHtml(term.term)}=1)`
      : `${sign} ${absVal}×${escapeHtml(term.predictor)}`;
  });
    equationEl.innerHTML = `<strong>logit(Pr(${escapeHtml(selectedOutcome)}=1))</strong> = ${parts.join(' ')}`;
  }



  function renderDiagnostics(model, rows, dropped) {
    const diagContainer = document.getElementById('diagnostics-content');
    const rowScreenEl = document.getElementById('diag-row-screening');
    const outcomeEl = document.getElementById('diag-outcome-balance');
    const rareEl = document.getElementById('diag-rare-levels');
    const diagCol = document.getElementById('diag-collinearity');
    const diagRes = document.getElementById('diag-residuals');

    const totalRows = Array.isArray(dataset.rows) ? dataset.rows.length : 0;
    const usedRows = Array.isArray(rows) ? rows.length : 0;

    if (rowScreenEl) {
      if (dropped > 0 && totalRows) {
        rowScreenEl.innerHTML =
          `<strong>Row screening:</strong> ${dropped} of ${totalRows} uploaded row(s) were excluded because of missing or invalid values in the outcome or selected predictors. ${usedRows} row(s) were used in the model.`;
      } else if (usedRows) {
        rowScreenEl.innerHTML =
          `<strong>Row screening:</strong> All ${usedRows} uploaded row(s) were used in the model.`;
      } else {
        rowScreenEl.textContent = '';
      }
    }

    if (outcomeEl && model && Array.isArray(model.y)) {
      const n = model.y.length || 0;
      const count1 = model.y.filter(v => v === 1).length;
      const count0 = model.y.filter(v => v === 0).length;
      const pct1 = n ? ((count1 / n) * 100).toFixed(1) : '0.0';
      const pct0 = n ? ((count0 / n) * 100).toFixed(1) : '0.0';
      outcomeEl.innerHTML =
        `<strong>Outcome balance (modeled data):</strong> ` +
        `${escapeHtml(outcomeCoding.focalLabel ?? '1')} = ${count1} (${pct1}%), ` +
        `${escapeHtml(outcomeCoding.nonFocalLabel ?? '0')} = ${count0} (${pct0}%).`;
    }

    if (rareEl && model && Array.isArray(model.predictorsInfo)) {
      const notes = [];
      model.predictorsInfo.forEach(info => {
        if (info.type !== 'categorical') return;
        const counts = new Map();
        (rows || []).forEach(r => {
          const lvl = r[info.name] ?? '(missing)';
          counts.set(lvl, (counts.get(lvl) || 0) + 1);
        });
        const total = usedRows || 1;
        const rareLevels = Array.from(counts.entries())
          .filter(([_, c]) => c / total < 0.05)
          .map(([level, c]) => `"${escapeHtml(level)}" (${c})`);
        if (rareLevels.length) {
          notes.push(
            `${escapeHtml(info.name)}: rare levels ${rareLevels.join(', ')}; consider collapsing levels if estimates look unstable.`
          );
        }
      });
      rareEl.innerHTML = notes.length
        ? `<strong>Rare predictor levels:</strong> ${notes.join(' ')}`
        : '';
    }

    if (diagCol) diagCol.textContent = model.dfModel >= model.n - 1
      ? 'Model is saturated; drop predictors or add rows.'
      : 'No explicit collinearity check beyond matrix invertibility; if the model failed, remove redundant predictors or collapse sparse levels.';
  if (diagRes) {
    const resSpread = StatsUtils.standardDeviation(model.residuals);
    diagRes.textContent = `Deviance residual spread ≈ ${formatNumber(resSpread, 3)}. Look for extreme residuals or patterns versus fitted probabilities that might indicate separation, influential observations, or model misspecification.`;
  }
  const resPlot = document.getElementById('plot-residuals');
  const resCaption = document.getElementById('plot-residuals-caption');
  if (resPlot && model) {
    if (!window.Plotly || !model.fitted?.length) {
      resPlot.innerHTML = '<p class="muted">Run an analysis to see residual diagnostics.</p>';
      if (resCaption) resCaption.textContent = '';
    } else {
      Plotly.newPlot(resPlot, [{
        x: model.fitted,
        y: model.residuals,
        mode: 'markers',
        type: 'scatter',
        marker: { color: '#9333ea', size: 6, opacity: 0.8 }
      }], {
        margin: { t: 20, r: 20, b: 60, l: 60 },
          xaxis: { title: 'Fitted probability' },
          yaxis: { title: 'Deviance residuals' },
        showlegend: false
      }, { responsive: true });
      if (resCaption) resCaption.textContent = 'Deviance residuals versus fitted probabilities.';
    }
  }
}

function renderSummaryStats(model, rows, predictorsInfo) {
  const outcomeBody = document.getElementById('outcome-summary-body');
  const numericBody = document.getElementById('numeric-summary-body');
  const catBody = document.getElementById('categorical-summary-body');
  
  // Render outcome summary separately
  if (outcomeBody && selectedOutcome) {
    const focalLabel = model.outcomeFocalLabel != null ? String(model.outcomeFocalLabel) : '1';
    const nonFocalLabel = model.outcomeNonFocalLabel != null ? String(model.outcomeNonFocalLabel) : '0';
    
    const focalCount = rows.filter(r => {
      const val = r[selectedOutcome];
      if (outcomeCoding.mode === 'numeric01') {
        return parseFloat(val) === 1;
      } else {
        return String(val) === focalLabel;
      }
    }).length;
    
    const nonFocalCount = rows.filter(r => {
      const val = r[selectedOutcome];
      if (outcomeCoding.mode === 'numeric01') {
        return parseFloat(val) === 0;
      } else {
        return String(val) === nonFocalLabel;
      }
    }).length;
    
    const totalCount = focalCount + nonFocalCount;
    const pctFocal = totalCount > 0 ? (focalCount / totalCount * 100).toFixed(1) : '0.0';
    
    outcomeBody.innerHTML = `<tr>
      <td>${escapeHtml(selectedOutcome)}</td>
      <td>${pctFocal}%</td>
      <td>${focalCount}</td>
      <td>${nonFocalCount}</td>
      <td>${totalCount}</td>
    </tr>`;
  }
  
  // Render continuous predictors (excluding outcome)
  if (numericBody) {
    const numericVars = predictorsInfo.filter(p => p.type !== 'categorical').map(p => p.name);
    const rowsOut = [];
    numericVars.forEach(varName => {
      const values = rows.map(r => parseFloat(r[varName])).filter(v => Number.isFinite(v));
      if (!values.length) return;
      const mean = StatsUtils.mean(values);
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const sd = StatsUtils.standardDeviation(values);
      const min = Math.min(...values);
      const max = Math.max(...values);
      rowsOut.push(`<tr>
        <td>${escapeHtml(varName)}</td>
        <td>${formatNumber(mean, 3)}</td>
        <td>${formatNumber(median, 3)}</td>
        <td>${formatNumber(sd, 3)}</td>
        <td>${formatNumber(min, 3)}</td>
        <td>${formatNumber(max, 3)}</td>
      </tr>`);
    });
    numericBody.innerHTML = rowsOut.length ? rowsOut.join('') : '<tr><td colspan="6">No continuous predictors to summarize.</td></tr>';
  }
  
  // Render categorical predictors
  if (catBody) {
    const catPredictors = predictorsInfo.filter(p => p.type === 'categorical');
    const rowsOut = [];
    catPredictors.forEach(info => {
      const counts = new Map();
      rows.forEach(r => {
        const level = r[info.name] || '(missing)';
        counts.set(level, (counts.get(level) || 0) + 1);
      });
      const total = rows.length || 1;
      Array.from(counts.entries()).forEach(([level, count]) => {
        rowsOut.push(`<tr>
          <td>${escapeHtml(info.name)}</td>
          <td>${escapeHtml(level)}</td>
          <td>${formatNumber((count / total) * 100, 2)}%</td>
        </tr>`);
      });
    });
    catBody.innerHTML = rowsOut.length ? rowsOut.join('') : '<tr><td colspan="3">No categorical predictors to summarize.</td></tr>';
  }
}

function renderActualFitted(model) {
  const plot = document.getElementById('plot-actual-fitted');
  const caption = document.getElementById('plot-actual-fitted-caption');
  if (!plot || !model) return;
  if (!window.Plotly || !model.fitted?.length) {
    plot.innerHTML = '<p class="muted">Run an analysis to see actual vs. fitted.</p>';
    if (caption) caption.textContent = '';
    return;
  }
  const minVal = Math.min(...model.fitted, ...model.y);
  const maxVal = Math.max(...model.fitted, ...model.y);
  Plotly.newPlot(plot, [
    {
      x: model.fitted,
      y: model.y,
      mode: 'markers',
      type: 'scatter',
      name: 'Observed',
      marker: { color: '#2563eb', size: 6, opacity: 0.8 }
    },
    {
      x: [minVal, maxVal],
      y: [minVal, maxVal],
      mode: 'lines',
      name: '45° line',
      line: { color: '#9ca3af', dash: 'dash' }
    }
  ], {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: { title: 'Fitted (Regression Predicted Values for Outcome)' },
    yaxis: { title: 'Actual' },
    showlegend: true
  }, { responsive: true });
  if (caption) caption.textContent = 'Actual outcome versus fitted values with 45° reference line.';
}

function predictFromTerms(terms, beta, values) {
  return terms.reduce((acc, term, idx) => {
    if (idx === 0) return acc + beta[idx];
    if (term.type === 'categorical') return acc + beta[idx] * (values[term.predictor] === term.term ? 1 : 0);
    return acc + beta[idx] * (parseFloat(values[term.predictor]) || 0);
  }, 0);
}

function updateEffectControls(predictorsInfo) {
  const focalSelect = document.getElementById('effect-focal-select');
  if (!focalSelect) return;
  focalSelect.innerHTML = '';
  predictorsInfo.forEach(info => {
    const opt = document.createElement('option');
    opt.value = info.name;
    opt.textContent = info.name;
    focalSelect.appendChild(opt);
  });
  if (effectState.focal && predictorsInfo.find(p => p.name === effectState.focal)) {
    focalSelect.value = effectState.focal;
  } else {
    effectState.focal = predictorsInfo[0]?.name || '';
    focalSelect.value = effectState.focal;
  }
  const nonFocalLevels = document.getElementById('effect-nonfocal-levels');
  if (nonFocalLevels) {
    nonFocalLevels.innerHTML = '';
    predictorsInfo.forEach(info => {
      if (info.type !== 'categorical' || info.name === effectState.focal) return;
      const meta = columnMeta[info.name] || {};
      const levels = meta.distinctValues || [];
      const label = document.createElement('label');
      label.textContent = `${info.name} level: `;
      const sel = document.createElement('select');
      levels.forEach(lvl => {
        const opt = document.createElement('option');
        opt.value = lvl;
        opt.textContent = lvl;
        sel.appendChild(opt);
      });
      const current = effectState.catLevels[info.name] && levels.includes(effectState.catLevels[info.name])
        ? effectState.catLevels[info.name]
        : levels[0] || '';
      sel.value = current;
      effectState.catLevels[info.name] = current;
      sel.addEventListener('change', () => {
        effectState.catLevels[info.name] = sel.value;
        renderEffectPlot(lastModel, lastFilteredRows, lastPredictorsInfo);
      });
      label.appendChild(sel);
      nonFocalLevels.appendChild(label);
    });
  }
  focalSelect.onchange = () => { effectState.focal = focalSelect.value; renderEffectPlot(lastModel, lastFilteredRows, lastPredictorsInfo); };
  document.querySelectorAll('input[name="effect-range"]').forEach(r => {
    r.onchange = () => {
      effectState.rangeMode = r.value;
      const wrapper = document.getElementById('custom-range-wrapper');
      if (wrapper) wrapper.style.display = r.value === 'custom' ? 'inline-flex' : 'none';
      renderEffectPlot(lastModel, lastFilteredRows, lastPredictorsInfo);
    };
  });
  ['effect-range-min', 'effect-range-max'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.oninput = () => {
      effectState.customMin = parseFloat(document.getElementById('effect-range-min')?.value);
      effectState.customMax = parseFloat(document.getElementById('effect-range-max')?.value);
      renderEffectPlot(lastModel, lastFilteredRows, lastPredictorsInfo);
    };
  });
  const wrapper = document.getElementById('custom-range-wrapper');
  if (wrapper) wrapper.style.display = effectState.rangeMode === 'custom' ? 'inline-flex' : 'none';
}

function renderEffectPlot(model, rows, predictorsInfo) {
  const plot = document.getElementById('plot-effect');
  const caption = document.getElementById('plot-effect-caption');
  const constantsNote = document.getElementById('effect-constants-note');
  const interp = document.getElementById('effect-interpretation');
  const nonFocalContinuous = document.getElementById('effect-nonfocal-continuous');
  if (!plot || !model || !rows || !rows.length) return;
  if (!effectState.focal || !predictorsInfo.find(p => p.name === effectState.focal)) {
    plot.innerHTML = '<p class="muted">Select a focal predictor to view its effect.</p>';
    if (caption) caption.textContent = '';
    if (interp) interp.textContent = '';
    if (nonFocalContinuous) nonFocalContinuous.innerHTML = '';
    return;
  }
  const focalInfo = predictorsInfo.find(p => p.name === effectState.focal);
  const valuesByPredictor = {};
  predictorsInfo.forEach(info => {
    if (info.type === 'categorical') {
      const meta = columnMeta[info.name] || {};
      const levels = meta.distinctValues || [];
      // default to override or modal level (most frequent)
      let chosen = effectState.catLevels[info.name];
      if (!chosen) {
        const counts = new Map();
        rows.forEach(r => {
          const lvl = r[info.name] || '(missing)';
          counts.set(lvl, (counts.get(lvl) || 0) + 1);
        });
        chosen = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || levels[0] || null;
        effectState.catLevels[info.name] = chosen;
      }
      if (info.name === focalInfo.name) chosen = null; // focal handled separately
      valuesByPredictor[info.name] = chosen;
    } else {
      const nums = rows.map(r => parseFloat(r[info.name])).filter(v => Number.isFinite(v));
      const mean = StatsUtils.mean(nums);
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length ? (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) : NaN;
      valuesByPredictor[info.name] = mean;
      valuesByPredictor[`${info.name}__stats`] = {
        mean,
        sd: StatsUtils.standardDeviation(nums),
        min: Math.min(...nums),
        max: Math.max(...nums),
        median
      };
      if (effectState.continuousOverrides[info.name] !== undefined) {
        valuesByPredictor[info.name] = effectState.continuousOverrides[info.name];
      }
    }
  });

  if (nonFocalContinuous) {
    nonFocalContinuous.innerHTML = '';
    predictorsInfo.forEach(info => {
      if (info.type === 'categorical' || info.name === focalInfo.name) return;
      const stats = valuesByPredictor[`${info.name}__stats`] || {};
      const select = document.createElement('select');
      select.dataset.col = info.name;
      [
        { key: 'mean', label: `Mean (${formatNumber(stats.mean, 3)})`, value: stats.mean },
        { key: 'median', label: `Median (${formatNumber(stats.median || stats.mean, 3)})`, value: stats.median || stats.mean },
        { key: 'plus1', label: `+1 SD (${formatNumber((stats.mean || 0) + (stats.sd || 0), 3)})`, value: (stats.mean || 0) + (stats.sd || 0) },
        { key: 'minus1', label: `-1 SD (${formatNumber((stats.mean || 0) - (stats.sd || 0), 3)})`, value: (stats.mean || 0) - (stats.sd || 0) }
      ].forEach(optDef => {
        const opt = document.createElement('option');
        opt.value = optDef.value;
        opt.textContent = `${info.name}: ${optDef.label}`;
        select.appendChild(opt);
      });
      const currentOverride = effectState.continuousOverrides[info.name];
      if (currentOverride !== undefined) select.value = currentOverride;
      select.onchange = () => {
        const val = parseFloat(select.value);
        if (Number.isFinite(val)) {
          effectState.continuousOverrides[info.name] = val;
        }
        renderEffectPlot(model, rows, predictorsInfo);
      };
      const wrapper = document.createElement('label');
      wrapper.textContent = '';
      wrapper.appendChild(select);
      nonFocalContinuous.appendChild(wrapper);
    });
  }
  const terms = model.terms;
  const beta = terms.map(t => t.estimate);
  const covB = model.covB;
  const zCrit = StatsUtils.normInv(1 - model.alpha / 2);
  const buildX = vals => {
    const x = [1];
    terms.slice(1).forEach(term => {
      if (term.type === 'categorical') x.push(vals[term.predictor] === term.term ? 1 : 0);
      else x.push(parseFloat(vals[term.predictor]) || 0);
    });
    return x;
  };
  if (focalInfo.type === 'categorical') {
    const meta = columnMeta[focalInfo.name] || {};
    const levels = meta.distinctValues || [];
    const trace = { x: [], y: [], type: 'bar', marker: { color: '#2563eb' }, error_y: { type: 'data', array: [] } };
    levels.forEach(level => {
      const vals = { ...valuesByPredictor, [focalInfo.name]: level };
      const xVec = buildX(vals);
      const yhat = predictFromTerms(terms, beta, vals);
      let sePred = NaN;
      if (covB) {
        let varPred = 0;
        for (let i = 0; i < xVec.length; i++) for (let j = 0; j < xVec.length; j++) varPred += xVec[i] * covB[i][j] * xVec[j];
        sePred = Math.sqrt(Math.max(varPred, 0));
      }
      const ci = Number.isFinite(sePred) ? zCrit * sePred : 0;
      trace.x.push(level);
      trace.y.push(yhat);
      trace.error_y.array.push(ci);
    });
    Plotly.newPlot(plot, [trace], {
      margin: { t: 20, r: 20, b: 60, l: 60 },
      xaxis: { title: focalInfo.name },
      yaxis: { title: selectedOutcome }
    }, { responsive: true });
    if (caption) caption.textContent = `Predicted ${selectedOutcome} by ${focalInfo.name}, holding other predictors constant.`;
    if (interp) {
      interp.textContent = `Bars show predicted ${selectedOutcome} for each ${focalInfo.name} level. Error bars are ${Math.round((1 - model.alpha) * 100)}% CIs. Other predictors are held at their defaults (means for continuous, selected levels for categorical). Compare each bar to the reference group in the table.`;
    }
    return;
  }
  const stats = valuesByPredictor[`${focalInfo.name}__stats`] || {};
  let minX, maxX;
  if (effectState.rangeMode === 'observed') {
    minX = stats.min; maxX = stats.max;
  } else if (effectState.rangeMode === 'custom' && Number.isFinite(effectState.customMin) && Number.isFinite(effectState.customMax) && effectState.customMax > effectState.customMin) {
    minX = effectState.customMin; maxX = effectState.customMax;
  } else {
    minX = stats.mean - 2 * stats.sd; maxX = stats.mean + 2 * stats.sd;
  }
  const steps = 40;
  const xs = []; const ys = []; const upper = []; const lower = [];
  for (let i = 0; i <= steps; i++) {
    const xVal = minX + (maxX - minX) * (i / steps);
    const vals = { ...valuesByPredictor, [focalInfo.name]: xVal };
    const xVec = buildX(vals);
    const yhat = predictFromTerms(terms, beta, vals);
    let sePred = NaN;
    if (covB) {
      let varPred = 0;
      for (let i1 = 0; i1 < xVec.length; i1++) for (let j1 = 0; j1 < xVec.length; j1++) varPred += xVec[i1] * covB[i1][j1] * xVec[j1];
      sePred = Math.sqrt(Math.max(varPred, 0));
    }
    const ci = Number.isFinite(sePred) ? zCrit * sePred : 0;
    xs.push(xVal); ys.push(yhat); upper.push(yhat + ci); lower.push(yhat - ci);
  }
  const band = {
    x: [...xs, ...xs.slice().reverse()],
    y: [...upper, ...lower.slice().reverse()],
    mode: 'lines',
    type: 'scatter',
    name: `${Math.round((1 - model.alpha) * 100)}% CI`,
    fill: 'toself',
    line: { color: 'rgba(37,99,235,0.2)' },
    fillcolor: 'rgba(37,99,235,0.15)',
    hoverinfo: 'skip',
    showlegend: true
  };
  const line = { x: xs, y: ys, mode: 'lines', line: { color: '#2563eb', width: 3 }, name: 'Predicted' };
  Plotly.newPlot(plot, [band, line], {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: { title: focalInfo.name },
    yaxis: { title: selectedOutcome },
    showlegend: true
  }, { responsive: true });
  if (caption) {
    const holds = [];
    predictorsInfo.forEach(info => {
      if (info.name === focalInfo.name) return;
      holds.push(info.type === 'categorical'
        ? `${info.name} = ${valuesByPredictor[info.name]}`
        : `${info.name} = ${formatNumber(valuesByPredictor[info.name], 3)}`);
    });
    const ciLabel = `${Math.round((1 - model.alpha) * 100)}% CI`;
    caption.textContent = `Predicted ${selectedOutcome} vs. ${focalInfo.name}, holding others constant (${holds.join(', ')}). ${ciLabel} shown as shaded band/bars.`;
    if (constantsNote) {
      const eqParts = model.terms.map((term, idx) => {
        if (idx === 0) return formatNumber(term.estimate, 3);
        const sign = term.estimate >= 0 ? '+' : '-';
        const absVal = formatNumber(Math.abs(term.estimate), 3);
        if (term.type === 'categorical') return `${sign} ${absVal}×(${escapeHtml(term.term)}=1)`;
        return `${sign} ${absVal}×${escapeHtml(term.predictor)}`;
      }).join(' ');
      constantsNote.innerHTML = `Regression equation: <code>${escapeHtml(selectedOutcome)} = ${eqParts}</code><br>Held constants: ${holds.join(', ') || 'none'}.`;
    }
    if (interp) {
      interp.textContent = `Line shows predicted ${selectedOutcome} over the focal range. Band is the ${ciLabel}. Positive slope means ${selectedOutcome} rises as ${focalInfo.name} increases (holding others at mean/selected values); negative slope means it falls.`;
    }
  }
}

function renderCoefInterpretation(model) {
  const container = document.getElementById('coef-interpretation');
  if (!container) return;
  if (!model || !Array.isArray(model.terms) || model.terms.length < 2) {
    container.textContent = 'Run the model to see column descriptions and examples.';
    return;
  }
  const explainColumns = [
    'Estimate: coefficient value; categorical terms compare level vs. reference.',
    'Standard Error: uncertainty of the estimate.',
    't and p-value: test of whether the coefficient differs from zero.',
    'Partial η²: effect size for the predictor (unique variance captured).',
    `${Math.round((1 - model.alpha) * 100)}% CI: confidence interval for the estimate.`
  ];
  const continuous = model.terms.find(t => t.type === 'continuous');
  const categorical = model.terms.find(t => t.type === 'categorical') || model.terms.find(t => t.reference);
  const examples = [];
  if (continuous) {
    examples.push(
      `Continuous: A one-unit increase in ${escapeHtml(continuous.predictor)} is associated with ${formatNumber(continuous.estimate, 3)} change in ${escapeHtml(selectedOutcome)}, t = ${formatNumber(continuous.t, 3)}, p = ${formatP(continuous.p)}, ${Math.round((1 - model.alpha) * 100)}% CI [${formatNumber(continuous.lower, 3)}, ${formatNumber(continuous.upper, 3)}], holding other predictors constant.`
    );
  }
  if (categorical) {
    const ref = categorical.reference || 'reference';
    examples.push(
      `Categorical: Compared to ${escapeHtml(ref)}, ${escapeHtml(categorical.term)} differs by ${formatNumber(categorical.estimate, 3)} on ${escapeHtml(selectedOutcome)}, t = ${formatNumber(categorical.t, 3)}, p = ${formatP(categorical.p)}, ${Math.round((1 - model.alpha) * 100)}% CI [${formatNumber(categorical.lower, 3)}, ${formatNumber(categorical.upper, 3)}], holding other predictors constant.`
    );
  }
  container.innerHTML = `
    <p><strong>Columns:</strong> ${explainColumns.join(' ')}</p>
    <p><strong>Examples:</strong><br>${examples.join('<br>')}</p>
  `;
}

// ---------- Logistic-specific rendering overrides ----------
// These override earlier linear-regression renderers so that
// the UI text, plots, and interpretations match a logistic model.

function renderEquation(model) {
  const equationEl = document.getElementById('regression-equation-output');
  if (!equationEl || !model || !model.terms || !model.terms.length) return;
  const focalLabel = model.outcomeFocalLabel != null ? String(model.outcomeFocalLabel) : '1';
  const parts = model.terms.map((term, idx) => {
    if (idx === 0) return formatNumber(term.estimate, 3);
    const sign = term.estimate >= 0 ? '+' : '-';
    const absVal = formatNumber(Math.abs(term.estimate), 3);
    if (term.type === 'categorical') return `${sign} ${absVal} * I(${escapeHtml(term.term)})`;
    if (term.type === 'intercept') return '';
    return `${sign} ${absVal} * ${escapeHtml(term.predictor)}`;
  }).filter(Boolean);
  equationEl.innerHTML = `<strong>logit(Pr(${escapeHtml(selectedOutcome)}=${escapeHtml(focalLabel)}))</strong> = ${parts.join(' ')}`;
}

function renderNarratives(model) {
  const apa = document.getElementById('apa-report');
  const mgr = document.getElementById('managerial-report');
  if (!apa || !mgr || !model) return;

  const terms = Array.isArray(model.terms) ? model.terms : [];
  const effects = terms
    .filter(t => t.type !== 'intercept' && Number.isFinite(t.p))
    .sort((a, b) => (a.p || 1) - (b.p || 1));

  let bestContinuous = null;
  let bestCategorical = null;
  effects.forEach(e => {
    if (!bestContinuous && e.type === 'continuous') bestContinuous = e;
    if (!bestCategorical && e.type === 'categorical') bestCategorical = e;
  });

  const fmt = (v, d = 3) => formatNumber(v, d);

  // Use pre-calculated modelPValue if available, else calculate
  const modelPVal = model.modelPValue !== undefined ? model.modelPValue :
    (Number.isFinite(model.modelChi2) && model.dfModel > 0
      ? 1 - chiSquareCdf(model.modelChi2, model.dfModel)
      : NaN);

  let text =
    `A logistic regression was fitted predicting ${escapeHtml(selectedOutcome || 'the outcome')} from ` +
    `${(model.predictorsInfo || []).length} predictor(s) ` +
    `(n = ${model.n}, model chi-square (${model.dfModel} df) = ${fmt(model.modelChi2, 3)}, ` +
    `p = ${formatP(modelPVal)}, pseudo R\u00b2 = ${fmt(model.pseudoR2, 3)}). `;

  if (bestContinuous) {
    const b = bestContinuous.estimate;
    const se = bestContinuous.se;
    const z = bestContinuous.z;
    const p = bestContinuous.p;
    const or = Math.exp(b);
    const ciLo = Number.isFinite(bestContinuous.lower) ? Math.exp(bestContinuous.lower) : NaN;
    const ciHi = Number.isFinite(bestContinuous.upper) ? Math.exp(bestContinuous.upper) : NaN;
    text +=
      `The strongest continuous effect was ${escapeHtml(bestContinuous.predictor)} ` +
      `(b = ${fmt(b)}, SE = ${fmt(se)}, z = ${fmt(z, 3)}, p = ${formatP(p)}, ` +
      `OR ≈ ${fmt(or)}${Number.isFinite(ciLo) && Number.isFinite(ciHi) ? `, 95% CI OR [${fmt(ciLo)}, ${fmt(ciHi)}]` : ''}). `;
  }

  if (bestCategorical) {
    const b = bestCategorical.estimate;
    const se = bestCategorical.se;
    const z = bestCategorical.z;
    const p = bestCategorical.p;
    const or = Math.exp(b);
    const ciLo = Number.isFinite(bestCategorical.lower) ? Math.exp(bestCategorical.lower) : NaN;
    const ciHi = Number.isFinite(bestCategorical.upper) ? Math.exp(bestCategorical.upper) : NaN;
    const ref = bestCategorical.reference != null ? String(bestCategorical.reference) : 'reference level';
    text +=
      `The strongest categorical contrast was ${escapeHtml(bestCategorical.predictor)} = ${escapeHtml(bestCategorical.term)} versus ${escapeHtml(ref)} ` +
      `(b = ${fmt(b)}, SE = ${fmt(se)}, z = ${fmt(z, 3)}, p = ${formatP(p)}, ` +
      `OR ≈ ${fmt(or)}${Number.isFinite(ciLo) && Number.isFinite(ciHi) ? `, 95% CI OR [${fmt(ciLo)}, ${fmt(ciHi)}]` : ''}).`;
  } else if (!bestContinuous) {
    text += 'Effects could not be estimated.';
  }

  apa.textContent = text;

  const strongest = bestContinuous || bestCategorical || null;

  // Calculate outcome prevalence
  const outcomeCounts = model.y.filter(y => y === 1).length;
  const prevalence = model.y.length > 0 ? outcomeCounts / model.y.length : 0;

  // Get confusion matrix metrics at default threshold
  const confusionData = calculateConfusionMatrix(model, 0.5);

  if (strongest) {
    const or = Math.exp(strongest.estimate || 0);
    let orPhrase = 'roughly similar odds';
    let orDirection = 'neutral';
    if (or > 1.05) {
      orPhrase = `about ${fmt(or, 2)} times higher odds`;
      orDirection = 'positive';
    } else if (or < 0.95) {
      orPhrase = `about ${fmt(1 / or, 2)} times lower odds`;
      orDirection = 'negative';
    }

    // Calculate probability shift context
    const baselineLogOdds = model.terms[0].estimate; // intercept
    const baselineProb = 1 / (1 + Math.exp(-baselineLogOdds));
    
    let report = '';

    // Section 1: Outcome Context
    report += `<strong>Outcome Context:</strong> In your dataset, ${escapeHtml(selectedOutcome || 'the outcome')} = 1 occurs in ${fmt(prevalence * 100, 1)}% of cases (${outcomeCounts} of ${model.y.length})`;
    if (prevalence < 0.15) {
      report += ' (low base rate—focus on identifying rare positives)';
    } else if (prevalence > 0.85) {
      report += ' (high base rate—focus on identifying rare negatives)';
    } else if (prevalence >= 0.40 && prevalence <= 0.60) {
      report += ' (balanced outcome)';
    }
    report += '.';

    // Section 2: Key Finding
    report += '<br><br><strong>Key Finding:</strong> ';
    if (strongest.type === 'continuous') {
      report += `For each one-unit increase in ${escapeHtml(strongest.predictor)}, the odds that ` +
        `${escapeHtml(selectedOutcome || 'the outcome')} = 1 are ${orPhrase}`;
    } else {
      const ref = strongest.reference != null ? String(strongest.reference) : 'reference level';
      report += `Compared to ${escapeHtml(ref)}, cases with ${escapeHtml(strongest.predictor)} = ${escapeHtml(strongest.term)} ` +
        `have ${orPhrase} that ${escapeHtml(selectedOutcome || 'the outcome')} = 1`;
    }
    report += `, holding other predictors constant.`;

    // Add probability translation
    if (or > 1.1 || or < 0.9) {
      const shiftedLogOdds = baselineLogOdds + (strongest.estimate || 0);
      const shiftedProb = 1 / (1 + Math.exp(-shiftedLogOdds));
      const probLift = ((shiftedProb - baselineProb) / baselineProb) * 100;
      if (Number.isFinite(probLift) && Math.abs(probLift) > 5) {
        report += ` In practical terms, this represents approximately a ${fmt(Math.abs(probLift), 0)}% ${probLift > 0 ? 'increase' : 'decrease'} in probability relative to baseline.`;
      }
    }

    // Section 3: Model Performance
    if (confusionData) {
      report += `<br><br><strong>Model Performance:</strong> At the default 0.5 threshold, the model achieves ${fmt(confusionData.accuracy * 100, 1)}% overall accuracy`;
      if (prevalence < 0.30 || prevalence > 0.70) {
        // For imbalanced outcomes, emphasize sensitivity/specificity
        report += `, with ${fmt(confusionData.sensitivity * 100, 1)}% sensitivity (correctly identifies ${fmt(confusionData.sensitivity * 100, 1)}% of actual positives)`;
        report += ` and ${fmt(confusionData.specificity * 100, 1)}% specificity (correctly identifies ${fmt(confusionData.specificity * 100, 1)}% of actual negatives)`;
      } else {
        // For balanced outcomes, mention precision
        report += `, ${fmt(confusionData.sensitivity * 100, 1)}% sensitivity, and ${fmt(confusionData.precision * 100, 1)}% precision`;
      }
      report += '.';
    }

    // Section 4: Actionable Recommendations
    report += `<br><br><strong>Action:</strong>`;
    report += '<ul style="margin-top: 0.5rem; margin-bottom: 0;">';
    
    if (orDirection === 'positive') {
      if (strongest.type === 'continuous') {
        report += `<li><strong>Prioritize high ${escapeHtml(strongest.predictor)} cases:</strong> Resources or interventions targeting cases with elevated ${escapeHtml(strongest.predictor)} should yield higher rates of ${escapeHtml(selectedOutcome || 'the outcome')} = 1.</li>`;
        report += `<li><strong>Consider thresholds:</strong> If ${escapeHtml(strongest.predictor)} is actionable, determine the optimal level needed to meaningfully increase conversion probability.</li>`;
      } else {
        report += `<li><strong>Focus on ${escapeHtml(strongest.term)} segment:</strong> Cases with ${escapeHtml(strongest.predictor)} = ${escapeHtml(strongest.term)} show substantially higher odds—allocate resources accordingly.</li>`;
        report += `<li><strong>Differentiate strategy:</strong> Consider separate campaigns or offers for high-odds versus low-odds ${escapeHtml(strongest.predictor)} categories.</li>`;
      }
    } else if (orDirection === 'negative') {
      if (strongest.type === 'continuous') {
        report += `<li><strong>Mitigate ${escapeHtml(strongest.predictor)}:</strong> Higher values of ${escapeHtml(strongest.predictor)} are associated with <em>lower</em> odds of ${escapeHtml(selectedOutcome || 'the outcome')} = 1. If controllable, reducing ${escapeHtml(strongest.predictor)} may improve outcomes.</li>`;
        report += `<li><strong>Target low-${escapeHtml(strongest.predictor)} cases:</strong> Focus efforts where ${escapeHtml(strongest.predictor)} is minimal to maximize conversion potential.</li>`;
      } else {
        const ref = strongest.reference != null ? String(strongest.reference) : 'reference level';
        report += `<li><strong>Avoid ${escapeHtml(strongest.term)} segment:</strong> Compared to ${escapeHtml(ref)}, the ${escapeHtml(strongest.term)} category shows <em>reduced</em> odds—consider alternative targeting.</li>`;
      }
    } else {
      report += `<li><strong>Review other predictors:</strong> ${escapeHtml(strongest.predictor)} shows a statistically significant but modest effect. Examine secondary predictors for additional leverage.</li>`;
    }

    // Threshold guidance for imbalanced outcomes
    if (confusionData && (prevalence < 0.25 || prevalence > 0.75)) {
      report += `<li><strong>Adjust classification threshold:</strong> For a ${prevalence < 0.25 ? 'rare' : 'common'} outcome, consider ${prevalence < 0.25 ? 'lowering' : 'raising'} the threshold below 0.5 to ${prevalence < 0.25 ? 'increase sensitivity (catch more positives)' : 'increase specificity (reduce false alarms)'}.</li>`;
    }

    report += '</ul>';

    // Overall model fit summary
    report += `<br><strong>Overall Model Fit:</strong> χ²(${model.dfModel}) = ${fmt(model.modelChi2, 3)}, p = ${formatP(modelPVal)}, pseudo R² ≈ ${fmt(model.pseudoR2 * 100, 1)}%.`;

    mgr.innerHTML = report;
  } else {
    // Enhanced fallback for weak models
    let report = `<strong>Outcome Context:</strong> In your dataset, ${escapeHtml(selectedOutcome || 'the outcome')} = 1 occurs in ${fmt(prevalence * 100, 1)}% of cases.`;
    
    if (confusionData) {
      report += `<br><br><strong>Model Performance:</strong> The model achieves ${fmt(confusionData.accuracy * 100, 1)}% accuracy at the 0.5 threshold.`;
    }
    
    report += `<br><br><strong>Finding:</strong> Individual predictors show weak or non-significant effects on the odds of ${escapeHtml(selectedOutcome || 'the outcome')} = 1.`;
    
    report += '<br><br><strong>Action:</strong>';
    report += '<ul style="margin-top: 0.5rem;">';
    report += '<li><strong>Collect additional predictors:</strong> The current variables may not capture key drivers of the outcome.</li>';
    report += '<li><strong>Explore interactions:</strong> Effects may be contingent on combinations of predictors (e.g., ad spend × season).</li>';
    report += '<li><strong>Check for non-linearity:</strong> Consider transformations (log, quadratic) if relationships are curved.</li>';
    report += '<li><strong>Verify data quality:</strong> Review for missing values, coding errors, or insufficient sample size.</li>';
    report += '</ul>';
    
    mgr.innerHTML = report;
  }
}


function renderActualFitted(model) {
  const plot = document.getElementById('plot-actual-fitted');
  const caption = document.getElementById('plot-actual-fitted-caption');
  if (!plot || !model) return;
  if (!window.Plotly || !model.fitted?.length) {
    plot.innerHTML = '<p class="muted">Run an analysis to see actual vs. fitted.</p>';
    if (caption) caption.textContent = '';
    return;
  }
  const jitter = 0.08;
  const jitteredY = model.y.map(y => {
    const base = Number(y) === 1 ? 1 : 0;
    return base + (Math.random() - 0.5) * 2 * jitter;
  });
  Plotly.newPlot(plot, [{
    x: model.fitted,
    y: jitteredY,
    mode: 'markers',
    type: 'scatter',
    name: 'Observed',
    marker: { color: '#2563eb', size: 6, opacity: 0.8 }
  }], {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: { title: `Fitted probability Pr(${selectedOutcome}=1)`, range: [0, 1] },
    yaxis: { title: 'Observed outcome (0/1, jittered)' },
    showlegend: false
  }, { responsive: true });
  if (caption) caption.textContent = 'Observed outcomes (0/1) versus fitted probabilities with vertical jitter added for visibility. Here, 1 represents the focal outcome that has been coded as success.';
}

function renderEffectPlot(model, rows, predictorsInfo) {
  const plot = document.getElementById('plot-effect');
  const caption = document.getElementById('plot-effect-caption');
  const constantsNote = document.getElementById('effect-constants-note');
  const interp = document.getElementById('effect-interpretation');
  const nonFocalContinuous = document.getElementById('effect-nonfocal-continuous');
  if (!plot || !model || !rows || !rows.length) return;
  if (!effectState.focal || !predictorsInfo.find(p => p.name === effectState.focal)) {
    plot.innerHTML = '<p class="muted">Select a focal predictor to view its effect.</p>';
    if (caption) caption.textContent = '';
    if (interp) interp.textContent = '';
    if (nonFocalContinuous) nonFocalContinuous.innerHTML = '';
    return;
  }
  const focalInfo = predictorsInfo.find(p => p.name === effectState.focal);
  const valuesByPredictor = {};
  predictorsInfo.forEach(info => {
    if (info.type === 'categorical') {
      const meta = columnMeta[info.name] || {};
      const levels = meta.distinctValues || [];
      let chosen = effectState.catLevels[info.name];
      if (!chosen) {
        const counts = new Map();
        rows.forEach(r => {
          const lvl = r[info.name] || '(missing)';
          counts.set(lvl, (counts.get(lvl) || 0) + 1);
        });
        chosen = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || levels[0] || null;
        effectState.catLevels[info.name] = chosen;
      }
      if (info.name === focalInfo.name) chosen = null;
      valuesByPredictor[info.name] = chosen;
    } else {
      const nums = rows.map(r => parseFloat(r[info.name])).filter(v => Number.isFinite(v));
      const mean = StatsUtils.mean(nums);
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length ? (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) : NaN;
      valuesByPredictor[info.name] = mean;
      valuesByPredictor[`${info.name}__stats`] = {
        mean,
        sd: StatsUtils.standardDeviation(nums),
        min: Math.min(...nums),
        max: Math.max(...nums),
        median
      };
      if (effectState.continuousOverrides[info.name] !== undefined) {
        valuesByPredictor[info.name] = effectState.continuousOverrides[info.name];
      }
    }
  });

  if (nonFocalContinuous) {
    nonFocalContinuous.innerHTML = '';
    predictorsInfo.forEach(info => {
      if (info.type === 'categorical' || info.name === focalInfo.name) return;
      const stats = valuesByPredictor[`${info.name}__stats`] || {};
      const select = document.createElement('select');
      select.dataset.col = info.name;
      [
        { key: 'mean', label: `Mean (${formatNumber(stats.mean, 3)})`, value: stats.mean },
        { key: 'median', label: `Median (${formatNumber(stats.median || stats.mean, 3)})`, value: stats.median || stats.mean },
        { key: 'plus1', label: `+1 SD (${formatNumber((stats.mean || 0) + (stats.sd || 0), 3)})`, value: (stats.mean || 0) + (stats.sd || 0) },
        { key: 'minus1', label: `-1 SD (${formatNumber((stats.mean || 0) - (stats.sd || 0), 3)})`, value: (stats.mean || 0) - (stats.sd || 0) }
      ].forEach(optDef => {
        const opt = document.createElement('option');
        opt.value = optDef.value;
        opt.textContent = `${info.name}: ${optDef.label}`;
        select.appendChild(opt);
      });
      const currentOverride = effectState.continuousOverrides[info.name];
      if (currentOverride !== undefined) select.value = currentOverride;
      select.onchange = () => {
        const val = parseFloat(select.value);
        if (Number.isFinite(val)) effectState.continuousOverrides[info.name] = val;
        renderEffectPlot(model, rows, predictorsInfo);
      };
      const wrapper = document.createElement('label');
      wrapper.textContent = '';
      wrapper.appendChild(select);
      nonFocalContinuous.appendChild(wrapper);
    });
  }

  const terms = model.terms || [];
  const beta = terms.map(t => t.estimate);
  const covB = model.covB;
  const zCrit = StatsUtils.normInv(1 - model.alpha / 2);
  const buildX = vals => {
    const x = [1];
    terms.slice(1).forEach(term => {
      if (term.type === 'categorical') x.push(vals[term.predictor] === term.term ? 1 : 0);
      else x.push(parseFloat(vals[term.predictor]) || 0);
    });
    return x;
  };

  if (focalInfo.type === 'categorical') {
    const meta = columnMeta[focalInfo.name] || {};
    const levels = meta.distinctValues || [];
    const trace = {
      x: [],
      y: [],
      type: 'bar',
      marker: { color: '#2563eb' },
      error_y: { type: 'data', array: [], visible: true }
    };
    levels.forEach(level => {
      const vals = { ...valuesByPredictor, [focalInfo.name]: level };
      const xVec = buildX(vals);
      const etaHat = predictFromTerms(terms, beta, vals);
      let sePred = NaN;
      if (covB) {
        let varPred = 0;
        for (let i = 0; i < xVec.length; i++) for (let j = 0; j < xVec.length; j++) varPred += xVec[i] * covB[i][j] * xVec[j];
        sePred = Math.sqrt(Math.max(varPred, 0));
      }
      const ciEta = Number.isFinite(sePred) ? zCrit * sePred : 0;
      const pHat = logistic(etaHat);
      const upperProb = logistic(etaHat + ciEta);
      trace.x.push(level);
      trace.y.push(pHat);
      trace.error_y.array.push(Math.max(upperProb - pHat, 0));
    });
    Plotly.newPlot(plot, [trace], {
      margin: { t: 20, r: 20, b: 60, l: 60 },
      xaxis: { title: focalInfo.name },
      yaxis: { title: `Predicted probability Pr(${selectedOutcome}=1)` }
    }, { responsive: true });
    if (caption) caption.textContent = `Predicted probability that ${selectedOutcome} = 1 (the focal outcome, coded as success) by ${focalInfo.name}, holding other predictors constant.`;
    if (interp) {
      interp.textContent = `Bars show predicted probabilities that ${selectedOutcome} = 1 (the focal outcome, coded as success) for each ${focalInfo.name} level. Error bars are ${Math.round((1 - model.alpha) * 100)}% confidence intervals on that probability, with other predictors held at their defaults (means for continuous, selected levels for categorical). Compare each bar to the reference group in the coefficient table.`;
    }
    return;
  }

  const stats = valuesByPredictor[`${focalInfo.name}__stats`] || {};
  let minX; let maxX;
  if (effectState.rangeMode === 'observed') {
    minX = stats.min; maxX = stats.max;
  } else if (effectState.rangeMode === 'custom' &&
    Number.isFinite(effectState.customMin) &&
    Number.isFinite(effectState.customMax) &&
    effectState.customMax > effectState.customMin) {
    minX = effectState.customMin; maxX = effectState.customMax;
  } else {
    minX = stats.mean - 2 * stats.sd; maxX = stats.mean + 2 * stats.sd;
  }

  const steps = 40;
  const xs = []; const ys = []; const upper = []; const lower = [];
  for (let i = 0; i <= steps; i++) {
    const xVal = minX + (maxX - minX) * (i / steps);
    const vals = { ...valuesByPredictor, [focalInfo.name]: xVal };
    const xVec = buildX(vals);
    const etaHat = predictFromTerms(terms, beta, vals);
    let sePred = NaN;
    if (covB) {
      let varPred = 0;
      for (let i1 = 0; i1 < xVec.length; i1++) for (let j1 = 0; j1 < xVec.length; j1++) varPred += xVec[i1] * covB[i1][j1] * xVec[j1];
      sePred = Math.sqrt(Math.max(varPred, 0));
    }
    const ciEta = Number.isFinite(sePred) ? zCrit * sePred : 0;
    const pHat = logistic(etaHat);
    const lowerProb = logistic(etaHat - ciEta);
    const upperProb = logistic(etaHat + ciEta);
    xs.push(xVal);
    ys.push(pHat);
    upper.push(upperProb);
    lower.push(lowerProb);
  }

  const band = {
    x: [...xs, ...xs.slice().reverse()],
    y: [...upper, ...lower.slice().reverse()],
    mode: 'lines',
    type: 'scatter',
    name: `${Math.round((1 - model.alpha) * 100)}% CI`,
    fill: 'toself',
    line: { color: 'rgba(37,99,235,0.2)' },
    fillcolor: 'rgba(37,99,235,0.15)',
    hoverinfo: 'skip',
    showlegend: true
  };
  const line = { x: xs, y: ys, mode: 'lines', line: { color: '#2563eb', width: 3 }, name: 'Predicted probability' };
  Plotly.newPlot(plot, [band, line], {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: { title: focalInfo.name },
    yaxis: { title: `Predicted probability Pr(${selectedOutcome}=1)` },
    showlegend: true
  }, { responsive: true });
  if (caption) {
    const holds = [];
    predictorsInfo.forEach(info => {
      if (info.name === focalInfo.name) return;
      holds.push(info.type === 'categorical'
        ? `${info.name} = ${valuesByPredictor[info.name]}`
        : `${info.name} = ${formatNumber(valuesByPredictor[info.name], 3)}`);
    });
    const ciLabel = `${Math.round((1 - model.alpha) * 100)}% CI`;
    caption.textContent = `Predicted probability that ${selectedOutcome} = 1 (the focal outcome, coded as success) vs. ${focalInfo.name}, holding others constant (${holds.join(', ')}). ${ciLabel} shown as shaded band/bars.`;
    if (constantsNote) {
      const eqParts = (model.terms || []).map((term, idx) => {
        if (idx === 0) return formatNumber(term.estimate, 3);
        const sign = term.estimate >= 0 ? '+' : '-';
        const absVal = formatNumber(Math.abs(term.estimate), 3);
        if (term.type === 'categorical') return `${sign} ${absVal} * I(${escapeHtml(term.term)})`;
        return `${sign} ${absVal} * ${escapeHtml(term.predictor)}`;
      }).join(' ');
      constantsNote.innerHTML = `Model equation: <code>logit(Pr(${escapeHtml(selectedOutcome)}=1)) = ${eqParts}</code><br>Here, 1 denotes the focal outcome category (coded as success).<br>Held constants: ${holds.join(', ') || 'none'}.`;
    }
    if (interp) {
      interp.textContent = `Line shows predicted probability that ${selectedOutcome} = 1 (the focal outcome, coded as success) over the focal range. The shaded band is the ${ciLabel} confidence band for that probability. A rising line means the probability of ${selectedOutcome} = 1 increases as ${focalInfo.name} increases (holding others at their chosen values); a falling line means it decreases.`;
    }
  }
}

function renderCoefInterpretation(model) {
  const container = document.getElementById('coef-interpretation');
  if (!container) return;
  if (!model || !Array.isArray(model.terms) || model.terms.length < 2) {
    container.textContent = 'Run the model to see column descriptions and examples.';
    return;
  }
  const explainColumns = [
    'Estimate (log-odds): change in log-odds that the focal outcome (coded as 1) occurs when the predictor increases by one unit or moves to a given category, holding other predictors constant.',
    'Standard Error: uncertainty of the log-odds estimate.',
    'z and p-value: test of whether the coefficient differs from zero (no change in log-odds of the focal outcome).',
    'Odds Ratio: multiplicative change in the odds that the focal outcome (coded as 1) occurs for a one-unit increase or category change (vs. reference). This is the primary effect size measure for logistic regression.',
    `${Math.round((1 - model.alpha) * 100)}% CI: confidence interval for the log-odds estimate (and the corresponding odds ratio) for the focal outcome.`
  ];
  const continuous = model.terms.find(t => t.type === 'continuous');
  const categorical = model.terms.find(t => t.type === 'categorical') || model.terms.find(t => t.reference);
  const examples = [];
  if (continuous) {
    const orCont = Number.isFinite(continuous.estimate) ? Math.exp(continuous.estimate) : NaN;
    examples.push(
      `Continuous: A one-unit increase in ${escapeHtml(continuous.predictor)} multiplies the odds that ${escapeHtml(selectedOutcome)} = 1 by about ${formatNumber(orCont, 3)} (log-odds ${formatNumber(continuous.estimate, 3)}, z = ${formatNumber(continuous.z, 3)}, p = ${formatP(continuous.p)}, ${Math.round((1 - model.alpha) * 100)}% CI [${formatNumber(continuous.lower, 3)}, ${formatNumber(continuous.upper, 3)}] on the log-odds scale), holding other predictors constant.`
    );
  }
  if (categorical) {
    const ref = categorical.reference || 'reference';
    const orCat = Number.isFinite(categorical.estimate) ? Math.exp(categorical.estimate) : NaN;
    examples.push(
      `Categorical: Compared to ${escapeHtml(ref)}, being in category ${escapeHtml(categorical.term)} multiplies the odds that ${escapeHtml(selectedOutcome)} = 1 by about ${formatNumber(orCat, 3)} (log-odds ${formatNumber(categorical.estimate, 3)}, z = ${formatNumber(categorical.z, 3)}, p = ${formatP(categorical.p)}, ${Math.round((1 - model.alpha) * 100)}% CI [${formatNumber(categorical.lower, 3)}, ${formatNumber(categorical.upper, 3)}] on the log-odds scale), holding other predictors constant.`
    );
  }
  container.innerHTML = `
    <p><strong>Columns:</strong> ${explainColumns.join(' ')}</p>
    <p><strong>Examples:</strong><br>${examples.join('<br>')}</p>
  `;
}

// ---------- ROC Curve & AUC ----------

function calculateROC(model) {
  if (!model || !Array.isArray(model.fitted) || !Array.isArray(model.y)) {
    return null;
  }
  
  // Get all unique thresholds from fitted probabilities
  const thresholds = [0, ...Array.from(new Set(model.fitted)).sort((a, b) => a - b), 1];
  const rocPoints = [];
  
  thresholds.forEach(threshold => {
    let TP = 0, FP = 0, TN = 0, FN = 0;
    
    for (let i = 0; i < model.y.length; i++) {
      const actual = model.y[i];
      const predicted = model.fitted[i] >= threshold ? 1 : 0;
      
      if (actual === 1 && predicted === 1) TP++;
      else if (actual === 0 && predicted === 0) TN++;
      else if (actual === 0 && predicted === 1) FP++;
      else if (actual === 1 && predicted === 0) FN++;
    }
    
    const TPR = (TP + FN) > 0 ? TP / (TP + FN) : 0; // Sensitivity
    const FPR = (FP + TN) > 0 ? FP / (FP + TN) : 0; // 1 - Specificity
    
    rocPoints.push({ threshold, TPR, FPR });
  });
  
  return rocPoints;
}

function calculateAUC(rocPoints) {
  if (!rocPoints || rocPoints.length < 2) return NaN;
  
  // Sort by FPR to ensure proper integration
  const sorted = [...rocPoints].sort((a, b) => a.FPR - b.FPR);
  
  let auc = 0;
  for (let i = 1; i < sorted.length; i++) {
    const width = sorted[i].FPR - sorted[i - 1].FPR;
    const height = (sorted[i].TPR + sorted[i - 1].TPR) / 2;
    auc += width * height;
  }
  
  return auc;
}

function renderROCCurve(model) {
  const plot = document.getElementById('plot-roc');
  const caption = document.getElementById('plot-roc-caption');
  const aucDisplay = document.getElementById('metric-auc');
  
  if (!plot) return;

  if (!model || !window.Plotly) {
    plot.innerHTML = '<p class="muted">Run an analysis to see the ROC curve.</p>';
    if (caption) caption.textContent = '';
    if (aucDisplay) aucDisplay.textContent = '–';
    return;
  }

  const rocPoints = calculateROC(model);
  if (!rocPoints) {
    plot.innerHTML = '<p class="muted">Unable to calculate ROC curve.</p>';
    return;
  }
  
  const auc = calculateAUC(rocPoints);

  const fpr = rocPoints.map(p => p.FPR);
  const tpr = rocPoints.map(p => p.TPR);
  const thresholds = rocPoints.map(p => p.threshold);

  // Find key threshold points to highlight (0.3, 0.5, 0.7)
  const keyThresholds = [0.3, 0.5, 0.7];
  const keyPoints = keyThresholds.map(t => {
    // Find closest threshold point
    let closest = rocPoints[0];
    let minDiff = Math.abs(rocPoints[0].threshold - t);
    for (const pt of rocPoints) {
      const diff = Math.abs(pt.threshold - t);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    return closest;
  }).filter(pt => pt != null);

  const traces = [
    {
      x: fpr,
      y: tpr,
      mode: 'lines',
      name: 'ROC Curve',
      line: { color: '#2563eb', width: 2 },
      customdata: thresholds,
      hovertemplate: 'Threshold: %{customdata:.2f}<br>FPR: %{x:.3f}<br>TPR: %{y:.3f}<extra></extra>'
    },
    {
      x: [0, 1],
      y: [0, 1],
      mode: 'lines',
      name: 'Random (AUC=0.5)',
      line: { color: '#9ca3af', dash: 'dash', width: 1 },
      hoverinfo: 'skip'
    }
  ];

  // Add key threshold markers if we have them
  if (keyPoints.length > 0) {
    traces.push({
      x: keyPoints.map(p => p.FPR),
      y: keyPoints.map(p => p.TPR),
      mode: 'markers+text',
      name: 'Key Thresholds',
      marker: { size: 8, color: '#dc2626', symbol: 'circle' },
      text: keyPoints.map(p => ` ${formatNumber(p.threshold, 2)}`),
      textposition: 'top right',
      textfont: { size: 10, color: '#dc2626' },
      customdata: keyPoints.map(p => p.threshold),
      hovertemplate: 'Threshold: %{customdata:.2f}<br>FPR: %{x:.3f}<br>TPR: %{y:.3f}<extra></extra>',
      showlegend: false
    });
  }

  Plotly.newPlot(plot, traces, {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: { title: 'False Positive Rate (1 - Specificity)', range: [0, 1] },
    yaxis: { title: 'True Positive Rate (Sensitivity)', range: [0, 1] },
    showlegend: true,
    legend: { x: 0.6, y: 0.1 }
  }, { responsive: true });

  if (caption) {
    let interpretation = '';
    if (auc >= 0.9) interpretation = 'excellent discrimination';
    else if (auc >= 0.8) interpretation = 'good discrimination';
    else if (auc >= 0.7) interpretation = 'acceptable discrimination';
    else if (auc >= 0.6) interpretation = 'poor discrimination';
    else interpretation = 'very poor discrimination (barely better than random)';

    // Pick two example points from the middle of the curve for concrete interpretation
    let exampleText = '';
    if (rocPoints.length > 4) {
      const midIdx1 = Math.floor(rocPoints.length * 0.4);
      const midIdx2 = Math.floor(rocPoints.length * 0.6);
      const pt1 = rocPoints[midIdx1];
      const pt2 = rocPoints[midIdx2];
      
      exampleText = ` For example: at threshold ≈${formatNumber(pt1.threshold, 2)}, the model catches ${formatNumber(pt1.TPR * 100, 0)}% of actual positives but misclassifies ${formatNumber(pt1.FPR * 100, 0)}% of actual negatives; at threshold ≈${formatNumber(pt2.threshold, 2)}, it catches ${formatNumber(pt2.TPR * 100, 0)}% of positives with ${formatNumber(pt2.FPR * 100, 0)}% false positives.`;
    }

    caption.textContent = `ROC curve with AUC = ${formatNumber(auc, 3)} (${interpretation}). The curve shows trade-offs between sensitivity and specificity across all possible thresholds.${exampleText}`;
  }

  if (aucDisplay) {
    aucDisplay.textContent = formatNumber(auc, 3);
  }
}

// ---------- Variable Importance (Forest Plot) ----------

function renderVariableImportance(model) {
  const plot = document.getElementById('plot-variable-importance');
  const caption = document.getElementById('plot-importance-caption');

  if (!plot) return;

  if (!model || !window.Plotly || !model.terms) {
    plot.innerHTML = '<p class="muted">Run an analysis to see variable importance.</p>';
    if (caption) caption.textContent = '';
    return;
  }
  
  // Get all non-intercept terms with finite estimates
  const terms = model.terms
    .filter(t => t.type !== 'intercept' && Number.isFinite(t.estimate) && Number.isFinite(t.lower) && Number.isFinite(t.upper))
    .map(t => ({
      label: t.type === 'categorical' ? `${t.predictor}=${t.term}` : t.predictor,
      or: Math.exp(t.estimate),
      orLower: Math.exp(t.lower),
      orUpper: Math.exp(t.upper),
      significant: t.p < model.alpha
    }));

  if (!terms.length) {
    plot.innerHTML = '<p class="muted">No predictors to display.</p>';
    return;
  }
  
  // Sort by distance from 1.0 (strongest effects first)
  terms.sort((a, b) => Math.abs(Math.log(b.or)) - Math.abs(Math.log(a.or)));

  const labels = terms.map(t => t.label);
  const ors = terms.map(t => t.or);
  const errors = terms.map(t => [t.or - t.orLower, t.orUpper - t.or]);
  const colors = terms.map(t => t.significant ? '#2563eb' : '#9ca3af');

  Plotly.newPlot(plot, [{
    y: labels,
    x: ors,
    error_x: {
      type: 'data',
      symmetric: false,
      array: errors.map(e => e[1]),
      arrayminus: errors.map(e => e[0])
    },
    type: 'scatter',
    mode: 'markers',
    marker: { size: 10, color: colors },
    hovertemplate: '%{y}<br>OR: %{x:.3f}<extra></extra>'
  }], {
    margin: { t: 20, r: 20, b: 60, l: 150 },
    xaxis: {
      title: 'Odds Ratio (95% CI) — log scale',
      type: 'log',
      tickmode: 'array',
      tickvals: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10, 20],
      ticktext: ['0.25', '0.5', '0.75', '1.0', '1.5', '2.0', '3.0', '5.0', '10', '20'],
      range: [Math.log10(Math.min(...ors, ...terms.map(t => t.orLower)) * 0.8), Math.log10(Math.max(...ors, ...terms.map(t => t.orUpper)) * 1.2)]
    },
    yaxis: { automargin: true },
    shapes: [{
      type: 'line',
      x0: 1,
      x1: 1,
      y0: -0.5,
      y1: labels.length - 0.5,
      line: { color: '#000', width: 1, dash: 'dash' }
    }]
  }, { responsive: true });

  if (caption) {
    const sigCount = terms.filter(t => t.significant).length;
    let captionText = `Forest plot of odds ratios with 95% confidence intervals. ${sigCount} of ${terms.length} predictors show statistically significant effects (colored blue). Variables sorted by effect strength.`;
    
    // Add a concrete example from the strongest effect
    if (terms.length > 0) {
      const strongest = terms[0];
      const pctChange = ((strongest.or - 1) * 100).toFixed(0);
      const direction = strongest.or > 1 ? 'increases' : 'decreases';
      captionText += ` Example: ${strongest.label} has OR=${formatNumber(strongest.or, 2)}, meaning it ${direction} the odds by ${Math.abs(pctChange)}% (multiplies by ${formatNumber(strongest.or, 2)}).`;
    }
    
    caption.textContent = captionText;
  }
}

// ---------- Predicted Probability Distribution ----------

function renderProbabilityDistribution(model) {
  const plot = document.getElementById('plot-prob-distribution');
  const caption = document.getElementById('plot-prob-caption');

  if (!plot) return;

  if (!model || !window.Plotly || !Array.isArray(model.fitted) || !Array.isArray(model.y)) {
    plot.innerHTML = '<p class="muted">Run an analysis to see probability distribution.</p>';
    if (caption) caption.textContent = '';
    return;
  }

  const focalLabel = model.outcomeFocalLabel != null ? String(model.outcomeFocalLabel) : '1';
  const nonFocalLabel = model.outcomeNonFocalLabel != null ? String(model.outcomeNonFocalLabel) : '0';

  const probs0 = [];
  const probs1 = [];

  for (let i = 0; i < model.y.length; i++) {
    if (model.y[i] === 0) {
      probs0.push(model.fitted[i]);
    } else {
      probs1.push(model.fitted[i]);
    }
  }

  Plotly.newPlot(plot, [
    {
      x: probs0,
      type: 'histogram',
      name: `Actual = ${nonFocalLabel}`,
      opacity: 0.6,
      marker: { color: '#3b82f6' },
      xbins: { size: 0.05 }
    },
    {
      x: probs1,
      type: 'histogram',
      name: `Actual = ${focalLabel}`,
      opacity: 0.6,
      marker: { color: '#ef4444' },
      xbins: { size: 0.05 }
    }
  ], {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: { title: 'Predicted Probability', range: [0, 1] },
    yaxis: { title: 'Frequency' },
    barmode: 'overlay',
    showlegend: true,
    legend: { x: 0.7, y: 0.95 }
  }, { responsive: true });

  if (caption) {
    const overlap = probs0.length > 0 && probs1.length > 0;
    caption.textContent = overlap
      ? `Distribution of predicted probabilities by actual outcome. Good separation indicates strong discrimination.`
      : `Distribution of predicted probabilities.`;
  }
}

// ---------- Separation Detection ----------

function detectSeparation(model) {
  if (!model || !model.terms) return null;

  const issues = [];

  model.terms.forEach(term => {
    if (term.type === 'intercept') return;

    // Check for very large coefficients
    if (Math.abs(term.estimate) > 10) {
      issues.push({
        predictor: term.type === 'categorical' ? `${term.predictor}=${term.term}` : term.predictor,
        coefficient: term.estimate,
        se: term.se,
        type: 'large_coefficient'
      });
    }

    // Check for very large standard errors
    if (term.se > 5) {
      issues.push({
        predictor: term.type === 'categorical' ? `${term.predictor}=${term.term}` : term.predictor,
        coefficient: term.estimate,
        se: term.se,
        type: 'large_se'
      });
    }
  });

  return issues.length > 0 ? issues : null;
}

function renderSeparationWarning(model) {
  const warningDiv = document.getElementById('separation-warning');
  const messageEl = document.getElementById('separation-message');

  if (!warningDiv || !messageEl) return;

  const issues = detectSeparation(model);

  if (!issues) {
    warningDiv.style.display = 'none';
    return;
  }

  warningDiv.style.display = 'block';

  const predictors = [...new Set(issues.map(i => i.predictor))];

  let message = `The following predictor(s) show signs of separation or quasi-separation: <strong>${predictors.join(', ')}</strong>. `;
  message += `This occurs when a predictor (nearly) perfectly predicts the outcome, leading to inflated coefficients and standard errors. `;
  message += `<strong>Recommendations:</strong> (1) Check if any predictor level has 100% or 0% of the focal outcome; (2) Consider removing the problematic predictor(s); (3) Collect more data; (4) Use penalized regression (ridge/lasso).`;
  
  messageEl.innerHTML = message;
}

// ---------- Sample Size Adequacy Check ----------

function checkSampleSizeAdequacy(model) {
  if (!model || !Array.isArray(model.y)) return null;

  const focalCount = model.y.filter(y => y === 1).length;
  const nonFocalCount = model.y.filter(y => y === 0).length;
  const minEvents = Math.min(focalCount, nonFocalCount);

  // Count number of predictors (excluding intercept)
  const numPredictors = model.terms ? model.terms.filter(t => t.type !== 'intercept').length : 0;

  if (numPredictors === 0) return null;

  const epv = minEvents / numPredictors; // Events per variable

  return {
    minEvents,
    numPredictors,
    epv,
    adequate: epv >= 10
  };
}

function renderSampleSizeWarning(model) {
  const warningDiv = document.getElementById('sample-size-warning');
  const messageEl = document.getElementById('sample-size-message');

  if (!warningDiv || !messageEl) return;

  const check = checkSampleSizeAdequacy(model);

  if (!check || check.adequate) {
    warningDiv.style.display = 'none';
    return;
  }

  warningDiv.style.display = 'block';

  let message = `With ${check.minEvents} events (minority class) and ${check.numPredictors} predictor(s), you have ${formatNumber(check.epv, 1)} events per variable (EPV). `;

  if (check.epv < 5) {
    message += `<strong>This is critically low</strong> (EPV < 5). Model estimates are likely unreliable. Strongly consider: (1) reducing the number of predictors, (2) collecting more data, or (3) combining this with external data.`;
  } else if (check.epv < 10) {
    message += `The rule of thumb is EPV ≥ 10 for stable estimates. Consider simplifying your model by removing less important predictors or collecting additional data.`;
  }

  messageEl.innerHTML = message;
}

// ---------- Hosmer-Lemeshow Test ----------

function hosmerLemeshowTest(model, groups = 10) {
  if (!model || !Array.isArray(model.fitted) || !Array.isArray(model.y)) {
    return null;
  }

  const n = model.y.length;
  if (n < groups * 2) groups = Math.max(2, Math.floor(n / 5)); // Reduce groups for small samples

  // Create groups based on predicted probabilities
  const data = model.fitted.map((p, i) => ({ prob: p, outcome: model.y[i] }));
  data.sort((a, b) => a.prob - b.prob);

  const groupSize = Math.ceil(n / groups);
  let chiSq = 0;

  for (let g = 0; g < groups; g++) {
    const start = g * groupSize;
    const end = Math.min((g + 1) * groupSize, n);
    const groupData = data.slice(start, end);

    if (groupData.length === 0) continue;

    const observed1 = groupData.filter(d => d.outcome === 1).length;
    const observed0 = groupData.length - observed1;

    const expected1 = groupData.reduce((sum, d) => sum + d.prob, 0);
    const expected0 = groupData.length - expected1;

    // Pearson chi-square contribution
    if (expected1 > 0) {
      chiSq += Math.pow(observed1 - expected1, 2) / expected1;
    }
    if (expected0 > 0) {
      chiSq += Math.pow(observed0 - expected0, 2) / expected0;
    }
  }

  const df = groups - 2; // Degrees of freedom
  const pValue = df > 0 ? (1 - chiSquareCdf(chiSq, df)) : NaN;

  return {
    chiSq,
    df,
    pValue,
    groups
  };
}

function renderHosmerLemeshow(model) {
  const resultEl = document.getElementById('hl-test-result');

  if (!resultEl) return;

  if (!model) {
    resultEl.textContent = 'Run the analysis to see calibration test.';
    return;
  }

  const test = hosmerLemeshowTest(model);

  if (!test) {
    resultEl.textContent = 'Unable to compute Hosmer-Lemeshow test (insufficient data).';
    return;
  }

  let interpretation = '';
  if (test.pValue >= 0.05) {
    interpretation = '(good calibration - no evidence of poor fit)';
  } else if (test.pValue >= 0.01) {
    interpretation = '(marginal calibration - some concern about fit)';
  } else {
    interpretation = '(poor calibration - predicted probabilities may be biased)';
  }
  
  resultEl.innerHTML = `<strong>χ²(${test.df}) = ${formatNumber(test.chiSq, 3)}, p = ${formatP(test.pValue)}</strong> ${interpretation}. ` +
    `The test divided observations into ${test.groups} groups by predicted probability and compared observed vs. expected frequencies.`;
}

// ---------- Main update ----------
function updateResults() {
  const alphaInput = document.getElementById('alpha');
  const alphaValue = alphaInput ? parseFloat(alphaInput.value) : NaN;
  const alpha = isFinite(alphaValue) && alphaValue > 0 && alphaValue < 1 ? alphaValue : 1 - selectedConfidenceLevel;
  if (alphaInput && (!isFinite(alphaValue) || alphaValue <= 0 || alphaValue >= 1)) alphaInput.value = formatAlpha(alpha);
  const alphaEl = document.getElementById('metric-alpha');
  if (alphaEl) alphaEl.textContent = formatAlpha(alpha);
  const summaryEl = document.getElementById('assignment-summary');
  if (summaryEl) summaryEl.textContent = '';
  const { filtered, dropped, issues, predictorsInfo } = filterRowsForModel();
  lastFilteredRows = filtered;
  lastPredictorsInfo = predictorsInfo;
  const kept = filtered.length;
  if (!dataset.rows.length) { clearOutputs('Upload a CSV with an outcome and predictors to begin.'); return; }
  if (!selectedOutcome) { clearOutputs('Select an outcome variable.'); return; }
  if (!selectedPredictors.length) { clearOutputs('Select at least one predictor.'); return; }
  if (issues.length) { clearOutputs(issues[0]); return; }
  if (kept < 5) { clearOutputs('Need at least 5 complete rows to proceed.'); return; }

  updateOutcomeCodingFromData();
  showLogregLoading();
  try {
    const model = buildDesignMatrixAndFit(filtered, predictorsInfo, selectedOutcome, alpha);
    if (model.error) { clearOutputs(model.error); return; }
    
    // Calculate and attach additional properties for tutorial
    const modelPVal = Number.isFinite(model.modelChi2) && model.dfModel > 0
      ? 1 - chiSquareCdf(model.modelChi2, model.dfModel)
      : NaN;
    model.modelPValue = modelPVal;
    
    // Calculate confusion matrix at default threshold and attach
    const cmData = calculateConfusionMatrix(model, 0.5);
    if (cmData) {
      // Attach as 2D array: [[TN, FP], [FN, TP]]
      model.confusionMatrix = [
        [cmData.TN, cmData.FP],  // actual = 0
        [cmData.FN, cmData.TP]   // actual = 1
      ];
      model.accuracy = cmData.accuracy;
      model.sensitivity = cmData.sensitivity;
      model.specificity = cmData.specificity;
      model.precision = cmData.precision;
      model.f1 = cmData.f1;
    }
    
    lastModel = model;
    window.lastModel = lastModel;  // Sync for tutorial
    
    console.log('✅ Model fitted and synced to window.lastModel');
    console.log('   modelPValue:', model.modelPValue);
    console.log('   pseudoR2:', model.pseudoR2);
    console.log('   confusionMatrix:', model.confusionMatrix);
    console.log('   accuracy:', model.accuracy);
    console.log('   terms count:', model.terms ? model.terms.length : 0);

    // ---------- NEW: log this run to the Django backend (fire-and-forget) ----------
    const scenarioSelect = document.getElementById('scenario-select');
    const scenarioId = scenarioSelect ? scenarioSelect.value || null : null;
    const standardizeInput = document.getElementById('logreg-standardize-continuous');
    const standardize = !!(standardizeInput && standardizeInput.checked);

    const paramsForLog = {
      outcome: selectedOutcome,
      predictors: [...selectedPredictors],
      n_uploaded: Array.isArray(dataset.rows) ? dataset.rows.length : null,
      n_used: kept,
      alpha: alpha,
      confidence_level: 1 - alpha,
      scenario_id: scenarioId,
      standardize_continuous: standardize
    };

    const summaryText =
      `Logistic regression run: outcome=${selectedOutcome}, ` +
      `${selectedPredictors.length} predictor(s), n=${model.n}, ` +
      `chi2(${model.dfModel})=${formatNumber(model.modelChi2, 3)}, ` +
      `p=${formatP(model.modelPValue)}, pseudoR2=${formatNumber(model.pseudoR2, 3)}, ` +
      `alpha=${formatAlpha(alpha)}.`;

    // Fire-and-forget; we don't await so UI stays snappy.
    logToolRunToBackend(paramsForLog, summaryText);
    // -------------------------------------------------------------------------------

    updateEffectControls(predictorsInfo);
    populateMetrics(model);
    populateCoefficients(model);
    renderEquation(model);
    renderNarratives(model);
    renderDiagnostics(model, filtered, dropped);
    renderSummaryStats(model, filtered, predictorsInfo);
    renderEffectPlot(model, filtered, predictorsInfo);
    renderActualFitted(model);
    renderCoefInterpretation(model);
    
    // Render confusion matrix and classification metrics
    const thresholdInput = document.getElementById('confusion-threshold');
    const threshold = thresholdInput ? parseFloat(thresholdInput.value) : 0.5;
    renderConfusionMatrix(model, Number.isFinite(threshold) ? threshold : 0.5);
    populateClassificationMetrics(model, Number.isFinite(threshold) ? threshold : 0.5);
    
    // Render new diagnostic features
    renderSeparationWarning(model);
    renderSampleSizeWarning(model);
    renderROCCurve(model);
    renderVariableImportance(model);
    renderProbabilityDistribution(model);
    renderHosmerLemeshow(model);
    
    // Track successful analysis with debouncing
    renderCount++;
    const now = Date.now();
    if (renderCount > 1 && (now - lastTrackTime) > 500 && Number.isFinite(modelPVal)) {
      lastTrackTime = now;
      if (typeof markRunAttempted === 'function') {
        markRunAttempted();
      }
      if (typeof markRunSuccessful === 'function') {
        markRunSuccessful(
          { outcome: selectedOutcome, predictors: selectedPredictors, n: model.n },
          `pseudoR²=${formatNumber(model.pseudoR2, 3)}, p=${formatP(modelPVal)}`
        );
      }
    }
    
    hasSuccessfulRun = true;
    const modifiedLabel = document.getElementById('modified-date');
    if (modifiedLabel) modifiedLabel.textContent = new Date().toLocaleDateString();
  } finally {
    hideLogregLoading();
  }
}

  // ---------- INIT ----------
  document.addEventListener('DOMContentLoaded', () => {
  const scenarioContainer = document.getElementById('scenario-description');
  if (scenarioContainer) defaultScenarioDescription = scenarioContainer.innerHTML;
  setupRawUpload();
  setupScenarioSelector();
  setupConfusionMatrixControls();
    const alphaInput = document.getElementById('alpha');
  if (alphaInput) {
    alphaInput.addEventListener('input', () => syncConfidenceButtonsToAlpha(parseFloat(alphaInput.value)));
    const initAlpha = parseFloat(alphaInput.value);
    if (isFinite(initAlpha)) syncConfidenceButtonsToAlpha(initAlpha, { skipUpdate: true });
      else applyConfidenceSelection(selectedConfidenceLevel, { syncAlpha: true, skipUpdate: true });
    }
    document.querySelectorAll('.conf-level-btn').forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault();
      applyConfidenceSelection(parseFloat(btn.dataset.level));
    }));
    clearOutputs('Upload a CSV to begin.');

    const downloadButton = document.getElementById('logreg-download-results');
    if (downloadButton) {
      downloadButton.addEventListener('click', event => {
        event.preventDefault();
        handleDownloadLogisticResults();
      });
    }
    
    if (typeof initEngagementTracking === 'function') { initEngagementTracking(TOOL_SLUG); }
  });

  function handleDownloadLogisticResults() {
    if (!lastModel || !lastRawDataset || !Array.isArray(lastRawDataset.rows) || !lastRawDataset.rows.length) {
      clearOutputs('Run a logistic regression model with uploaded raw data before downloading predicted probabilities.');
      return;
    }
    const headers = lastRawDataset.headers;
    const rows = lastRawDataset.rows;
    const model = lastModel;
    if (!Array.isArray(model.fitted) || model.fitted.length !== rows.length || !Array.isArray(model.y)) {
      clearOutputs('Unable to prepare download: fitted probabilities are missing or misaligned.');
      return;
    }

    const outHeaders = headers.concat(['p_hat', 'neg_loglik_contribution']);
    const lines = [outHeaders.join(',')];

    for (let i = 0; i < rows.length; i++) {
      const baseRow = headers.map(h => {
        const value = rows[i][h];
        if (value == null) return '';
        const num = parseFloat(value);
        return Number.isFinite(num) && String(value).trim() === String(num) ? String(num) : String(value);
      });
      const pi = model.fitted[i];
      const yi = model.y[i];
      let negLogLik = NaN;
      if (Number.isFinite(pi) && (yi === 0 || yi === 1)) {
        negLogLik = -(yi ? Math.log(pi) : Math.log(1 - pi));
      }
      baseRow.push(Number.isFinite(pi) ? pi.toFixed(6) : '');
      baseRow.push(Number.isFinite(negLogLik) ? negLogLik.toFixed(6) : '');
      lines.push(baseRow.join(','));
    }


    downloadTextFile('logistic_regression_predicted_probabilities.csv', lines.join('\n'), { mimeType: 'text/csv' });
  }

// ---------- Confusion Matrix Functions ----------

function calculateConfusionMatrix(model, threshold = 0.5) {
  if (!model || !Array.isArray(model.fitted) || !Array.isArray(model.y)) {
    return null;
  }
  
  let TP = 0, TN = 0, FP = 0, FN = 0;
  
  for (let i = 0; i < model.y.length; i++) {
    const actual = model.y[i];
    const predicted = model.fitted[i] >= threshold ? 1 : 0;
    
    if (actual === 1 && predicted === 1) TP++;
    else if (actual === 0 && predicted === 0) TN++;
    else if (actual === 0 && predicted === 1) FP++;
    else if (actual === 1 && predicted === 0) FN++;
  }
  
  const total = TP + TN + FP + FN;
  const accuracy = total > 0 ? (TP + TN) / total : NaN;
  const sensitivity = (TP + FN) > 0 ? TP / (TP + FN) : NaN;
  const specificity = (TN + FP) > 0 ? TN / (TN + FP) : NaN;
  const precision = (TP + FP) > 0 ? TP / (TP + FP) : NaN;
  const npv = (TN + FN) > 0 ? TN / (TN + FN) : NaN;
  const f1 = (precision + sensitivity) > 0 ? 2 * (precision * sensitivity) / (precision + sensitivity) : NaN;
  
  return {
    TP, TN, FP, FN,
    accuracy, sensitivity, specificity, precision, npv, f1,
    threshold
  };
}

function renderConfusionMatrix(model, threshold = 0.5) {
  const plot = document.getElementById('plot-confusion-matrix');
  const caption = document.getElementById('plot-confusion-caption');
  const thresholdDisplay = document.getElementById('cm-threshold-display');
  
  if (!plot) return;
  
  if (!model || !window.Plotly) {
    plot.innerHTML = '<p class="muted">Run an analysis to see the confusion matrix.</p>';
    if (caption) caption.textContent = '';
    return;
  }
  
  const cm = calculateConfusionMatrix(model, threshold);
  if (!cm) {
    plot.innerHTML = '<p class="muted">Unable to calculate confusion matrix.</p>';
    return;
  }
  
  if (thresholdDisplay) {
    thresholdDisplay.textContent = threshold.toFixed(2);
  }
  
  const focalLabel = model.outcomeFocalLabel != null ? String(model.outcomeFocalLabel) : '1';
  const nonFocalLabel = model.outcomeNonFocalLabel != null ? String(model.outcomeNonFocalLabel) : '0';
  
  const total = cm.TN + cm.FP + cm.FN + cm.TP;
  
  // Create heatmap visualization
  const z = [
    [cm.TN, cm.FP],  // Actual 0
    [cm.FN, cm.TP]   // Actual 1
  ];
  
  // Calculate percentages and format as "XX.X% (count)"
  const labels = [
    [
      { type: 'True Negative', pct: total > 0 ? (cm.TN / total * 100).toFixed(1) : '0.0', count: cm.TN },
      { type: 'False Positive', pct: total > 0 ? (cm.FP / total * 100).toFixed(1) : '0.0', count: cm.FP }
    ],
    [
      { type: 'False Negative', pct: total > 0 ? (cm.FN / total * 100).toFixed(1) : '0.0', count: cm.FN },
      { type: 'True Positive', pct: total > 0 ? (cm.TP / total * 100).toFixed(1) : '0.0', count: cm.TP }
    ]
  ];
  
  const annotations = [];
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const label = labels[i][j];
      annotations.push({
        x: j,
        y: i,
        text: `<b>${label.type}</b><br>${label.pct}% (${label.count})`,
        showarrow: false,
        font: { size: 14, color: z[i][j] > total / 4 ? 'white' : 'black' }
      });
    }
  }
  
  Plotly.newPlot(plot, [{
    z: z,
    x: [`Predicted<br>${escapeHtml(nonFocalLabel)}`, `Predicted<br>${escapeHtml(focalLabel)}`],
    y: [`Actual<br>${escapeHtml(nonFocalLabel)}`, `Actual<br>${escapeHtml(focalLabel)}`],
    type: 'heatmap',
    colorscale: [
      [0, '#f0f9ff'],
      [0.5, '#3b82f6'],
      [1, '#1e40af']
    ],
    showscale: false,
    hovertemplate: '%{x}<br>%{y}<br>Count: %{z}<extra></extra>'
  }], {
    margin: { t: 40, r: 20, b: 80, l: 120 },
    xaxis: { side: 'bottom', tickfont: { size: 12 } },
    yaxis: { autorange: 'reversed', tickfont: { size: 12 } },
    annotations: annotations
  }, { responsive: true });
  
  if (caption) {
    caption.textContent = `Confusion matrix at threshold = ${threshold.toFixed(2)}. ` +
      `Diagonal cells show correct predictions (TN=${cm.TN}, TP=${cm.TP}). ` +
      `Off-diagonal cells show errors (FP=${cm.FP}, FN=${cm.FN}).`;
  }
}

function populateClassificationMetrics(model, threshold = 0.5) {
  if (!model) return;
  
  const cm = calculateConfusionMatrix(model, threshold);
  if (!cm) return;
  
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = Number.isFinite(value) ? (value * 100).toFixed(2) + '%' : '--';
  };
  
  set('metric-accuracy', cm.accuracy);
  set('metric-sensitivity', cm.sensitivity);
  set('metric-specificity', cm.specificity);
  set('metric-precision', cm.precision);
  set('metric-f1', cm.f1);
  set('metric-npv', cm.npv);
}

function setupConfusionMatrixControls() {
  const thresholdInput = document.getElementById('confusion-threshold');
  if (!thresholdInput) return;
  
  thresholdInput.addEventListener('input', () => {
    const threshold = parseFloat(thresholdInput.value);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) return;
    if (lastModel) {
      renderConfusionMatrix(lastModel, threshold);
      populateClassificationMetrics(lastModel, threshold);
    }
  });
}
