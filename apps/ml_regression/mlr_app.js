// Multiple Linear Regression Tool - rebuilt controller

// Usage tracking variables
let pageLoadTime = Date.now();
let hasSuccessfulRun = false;

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

const RAW_UPLOAD_LIMIT = typeof MAX_UPLOAD_ROWS === 'number' ? MAX_UPLOAD_ROWS : 5000;
const FALLBACK_SCENARIOS = [
  {
    id: 'Predict EDM event spend',
    label: 'Predict EDM event spending for patrons',
    file: 'scenarios/event_spend.txt',
    dataset: 'scenarios/event_spend_data.csv',
    outcome: 'event_spend',
    predictors: ['days_preordered', 'type'],
    types: { type: 'categorical' }
  },
  {
    id: 'Customer Valuation',
    label: 'Predict Customer Value based on Recency, Frequency, and Monetary Value',
    file: 'scenarios/customer_value.txt',
    dataset: 'scenarios/customer_value_data.csv',
    outcome: 'CustomerValue',
    predictors: ['Eecency', 'Frequency', 'MonetaryValue', 'Segment'],
    types: { Segment: 'categorical' }
  }
];

// ---------- Utilities ----------
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Usage tracking function
function checkAndTrackUsage() {
  const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
  if (timeOnPage < 3) return;
  if (!hasSuccessfulRun) return;
  if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `tool-tracked-ml-regression-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('ml-regression', {
      outcome: selectedOutcome,
      predictor_count: selectedPredictors.length
    }, `Multiple linear regression analysis completed`);
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for Multiple Linear Regression');
  }
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
  const metrics = ['metric-r2', 'metric-adj-r2', 'metric-f', 'metric-pmodel', 'metric-rmse', 'metric-mae', 'metric-resse', 'metric-df', 'metric-n', 'metric-alpha'];
  metrics.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '--'; });
  const apa = document.getElementById('apa-report');
  const mgr = document.getElementById('managerial-report');
  const equation = document.getElementById('regression-equation-output');
  const coefBody = document.getElementById('coef-table-body');
  const numBody = document.getElementById('numeric-summary-body');
  const catBody = document.getElementById('categorical-summary-body');
  if (apa) apa.textContent = '';
  if (mgr) mgr.textCFfunbontent = '';
  if (equation) equation.textContent = message;
  if (coefBody) coefBody.innerHTML = `<tr><td colspan="9">${escapeHtml(message)}</td></tr>`;
  if (numBody) numBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  if (catBody) catBody.innerHTML = `<tr><td colspan="3">${escapeHtml(message)}</td></tr>`;
  ['plot-actual-fitted', 'plot-residuals', 'plot-coefficients', 'plot-effect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  const coefInterp = document.getElementById('coef-interpretation');
  if (coefInterp) coefInterp.textContent = 'Run the model to see column descriptions and examples.';
    const constantsNote = document.getElementById('effect-constants-note');
    if (constantsNote) constantsNote.textContent = '';
    const nonFocalContinuous = document.getElementById('effect-nonfocal-continuous');
    const nonFocalLevels = document.getElementById('effect-nonfocal-levels');
    if (nonFocalContinuous) nonFocalContinuous.innerHTML = '';
    if (nonFocalLevels) nonFocalLevels.innerHTML = '';
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
    const isConstant = nonMissing > 0 && distinct.size === 1;
    meta[header] = {
      isNumeric,
      missing,
      distinctValues: Array.from(distinct),
      isConstant,
      inferredType: isNumeric ? 'numeric' : 'categorical'
    };
  });
  return meta;
}
function inferDefaults(meta, headers) {
  const numericCols = headers.filter(h => meta[h]?.isNumeric);
  const outcome = numericCols[0] || headers[0];
  // Exclude constant columns from default predictor set (no variation).
  const predictors = headers.filter(h => h !== outcome && !meta[h]?.isConstant);
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
  predictorSettings = {};
  if (hints?.types) {
    Object.entries(hints.types).forEach(([col, type]) => {
      if (dataset.headers.includes(col)) {
        predictorSettings[col] = predictorSettings[col] || {};
        predictorSettings[col].type = type;
      }
    });
  }

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
  try {
    const resp = await fetch('scenarios/scenario-index.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`Unable to load scenario index (${resp.status})`);
    const data = await resp.json();
    scenarioManifest = Array.isArray(data) ? data : [];
    populateScenarioSelect();
  } catch {
    scenarioManifest = FALLBACK_SCENARIOS;
    populateScenarioSelect();
    setRawUploadStatus('Using built-in scenarios because the scenario index could not be loaded.', 'error', { isHtml: false });
  }
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
    try {
      const resp = await fetch(scenario.file, { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`Unable to load scenario description (${resp.status})`);
      const text = await resp.text();
      const body = text.replace(/^# .*\n?/gm, '').trim();
      if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
        window.UIUtils.renderScenarioDescription({
          containerId: 'scenario-description',
          title: scenario.label || '',
          description: body,
          defaultHtml: defaultScenarioDescription
        });
      } else {
        const descContainer = document.getElementById('scenario-description');
        if (descContainer) descContainer.textContent = body || '';
      }
    } catch {
      if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
        window.UIUtils.renderScenarioDescription({
          containerId: 'scenario-description',
          title: '',
          description: '',
          defaultHtml: defaultScenarioDescription
        });
      } else {
        const descContainer = document.getElementById('scenario-description');
        if (descContainer) descContainer.innerHTML = defaultScenarioDescription;
      }
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
    const numericHeaders = dataset.headers.filter(h => columnMeta[h]?.isNumeric);
    if (!numericHeaders.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No numeric columns detected';
      opt.disabled = true;
      outcomeSelect.appendChild(opt);
    } else {
      numericHeaders.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h;
        opt.textContent = h;
        outcomeSelect.appendChild(opt);
      });
      if (selectedOutcome && numericHeaders.includes(selectedOutcome)) {
        outcomeSelect.value = selectedOutcome;
      } else {
        selectedOutcome = numericHeaders[0] || '';
        outcomeSelect.value = selectedOutcome;
      }
    }
      outcomeSelect.onchange = () => {
        selectedOutcome = outcomeSelect.value;
        // Ensure the new outcome is not treated as a predictor.
        if (selectedPredictors.includes(selectedOutcome)) {
          selectedPredictors = selectedPredictors.filter(p => p !== selectedOutcome);
        }
        // Auto-select all other usable columns as predictors, including the
        // previous outcome now that it is no longer Y.
        selectedPredictors = dataset.headers.filter(h => h !== selectedOutcome && !columnMeta[h]?.isConstant);
        // Reset effect view state so the focal predictor menu
        // always reflects the current outcome/predictor assignment.
        effectState.focal = null;
        effectState.catLevels = {};
        effectState.continuousOverrides = {};
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
    const wrapper = document.createElement('div');
    wrapper.className = 'predictor-row stacked-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'predictor-check';
    checkbox.dataset.col = header;
    const isConstant = !!meta.isConstant;
    checkbox.checked = !isConstant && selectedPredictors.includes(header);
    checkbox.disabled = isConstant;
    const label = document.createElement('label');
    label.textContent = isConstant ? `${header} (constant - excluded, no variation)` : header;
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
    const refHelp = document.createElement('p');
    refHelp.className = 'muted predictor-ref-help';
    refHelp.textContent = 'The reference level serves as the baseline category. Coefficients for other levels are interpreted as differences in the outcome relative to this group, holding other predictors constant.';
    refWrapper.appendChild(refHelp);
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
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            if (!selectedPredictors.includes(header)) selectedPredictors.push(header);
          } else {
            selectedPredictors = selectedPredictors.filter(p => p !== header);
          }
          effectState.focal = null;
          effectState.catLevels = {};
          effectState.continuousOverrides = {};
          updateResults();
        });
        typeSelect.addEventListener('change', () => {
          const newType = typeSelect.value;
          predictorSettings[header] = predictorSettings[header] || {};
          predictorSettings[header].type = newType;
          const isCat = predictorSettings[header].type === 'categorical';
          refSelect.disabled = !isCat;
          refWrapper.style.display = isCat ? 'block' : 'none';
          effectState.focal = null;
          effectState.catLevels = {};
          effectState.continuousOverrides = {};
          updateResults();
        });
        refSelect.addEventListener('change', () => {
          predictorSettings[header] = predictorSettings[header] || {};
          predictorSettings[header].reference = refSelect.value;
          effectState.focal = null;
          effectState.catLevels = {};
          effectState.continuousOverrides = {};
          updateResults();
        });
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
    // Drop constant columns from the active predictor set so they do not
    // trigger categorical-level checks or enter the design matrix.
    const activePredictors = selectedPredictors.filter(p => !columnMeta[p]?.isConstant);
    if (!activePredictors.length) {
      return { filtered: [], dropped: 0, issues: ['Select at least one predictor.'] };
    }
    const usedColumns = [selectedOutcome, ...activePredictors];
    const predictorsInfo = activePredictors.map(p => {
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
      const levels = meta.distinctValues && meta.distinctValues.length ? meta.distinctValues : Array.from(new Set(rows.map(r => r[info.name])));
      levels.forEach(lvl => {
        if (lvl === ref) return;
        terms.push({ predictor: info.name, term: lvl, label: `${info.name}: ${lvl}`, type: 'categorical', reference: ref });
      });
    } else {
      terms.push({ predictor: info.name, term: info.name, label: info.name, type: 'continuous' });
    }
  });
  for (const row of rows) {
    const yv = parseFloat(row[outcomeName]);
    if (!Number.isFinite(yv)) return { error: `Outcome "${outcomeName}" must be numeric.` };
    const xRow = [1];
    predictorsInfo.forEach(info => {
      if (info.type === 'categorical') {
        terms.filter(t => t.predictor === info.name && t.type === 'categorical').forEach(t => xRow.push(row[info.name] === t.term ? 1 : 0));
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
  const Xt = transpose(X);
  const XtX = multiply(Xt, X);
  const XtXInv = invert(XtX);
  if (!XtXInv) return { error: 'Model matrix is singular; remove redundant predictors.' };
  const XtY = multiply(Xt, y.map(v => [v]));
  const beta = multiply(XtXInv, XtY).map(r => r[0]);
  const fitted = X.map(row => row.reduce((acc, v, i) => acc + v * beta[i], 0));
  const residuals = y.map((yv, i) => yv - fitted[i]);
  const meanY = StatsUtils.mean(y);
  const sse = residuals.reduce((acc, r) => acc + r * r, 0);
  const sst = y.reduce((acc, val) => acc + Math.pow(val - meanY, 2), 0);
  const ssr = sst - sse;
  const dfModel = p - 1;
  const dfError = n - p;
  const r2 = sst > 0 ? ssr / sst : NaN;
  const adjR2 = (1 - (sse / (n - p)) / (sst / (n - 1)));
  const msr = dfModel > 0 ? ssr / dfModel : NaN;
  const mse = dfError > 0 ? sse / dfError : NaN;
  const fStat = (msr && mse) ? msr / mse : NaN;
  const rmse = Math.sqrt(Math.max(sse / n, 0));
  const mae = residuals.reduce((acc, r) => acc + Math.abs(r), 0) / n;
  const covB = XtXInv.map(row => row.map(val => val * mse));
  const se = covB.map((row, i) => Math.sqrt(Math.max(row[i], 0)));
  const tStats = beta.map((b, i) => (se[i] ? b / se[i] : NaN));
  const pVals = tStats.map(t => Number.isFinite(t) ? 2 * (1 - StatsUtils.normCdf(Math.abs(t))) : NaN);
  const zCrit = StatsUtils.normInv(1 - alpha / 2);
  const ciLower = beta.map((b, i) => b - zCrit * se[i]);
  const ciUpper = beta.map((b, i) => b + zCrit * se[i]);
  const coefRows = terms.map((term, idx) => ({
    predictor: term.predictor,
    term: term.term,
    label: term.label,
    estimate: beta[idx],
    se: se[idx],
    t: tStats[idx],
    p: pVals[idx],
    lower: ciLower[idx],
    upper: ciUpper[idx],
    type: term.type || (idx === 0 ? 'intercept' : 'continuous'),
    partialEta2: (Number.isFinite(tStats[idx]) && dfError > 0) ? (tStats[idx] * tStats[idx]) / (tStats[idx] * tStats[idx] + dfError) : NaN,
    reference: term.reference || null
  }));
  const modelP = (Number.isFinite(fStat) && dfModel > 0 && dfError > 0) ? (1 - fCdf(fStat, dfModel, dfError)) : NaN;
  return {
    n,
    dfModel,
    dfError,
    r2,
    adjR2,
    fStat,
    sse,
    ssr,
    sst,
    mse,
    msr,
    alpha,
    rmse,
    mae,
    modelP,
    terms: coefRows,
    residuals,
    fitted,
    y,
      predictorsInfo,
      designMatrix: X,
    covB
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
  set('metric-r2', formatNumber(model.r2, 3));
  set('metric-adj-r2', formatNumber(model.adjR2, 3));
  set('metric-f', formatNumber(model.fStat, 3));
  set('metric-df', `${model.dfModel} / ${model.dfError}`);
  set('metric-n', model.n.toString());
  set('metric-alpha', formatAlpha(model.alpha));
  set('metric-rmse', formatNumber(model.rmse, 4));
  set('metric-mae', formatNumber(model.mae, 4));
  set('metric-resse', formatNumber(Math.sqrt(model.mse), 4));
  set('metric-pmodel', formatP(model.modelP));
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
  const seen = new Set();
  body.innerHTML = model.terms.map(term => {
    let etaDisplay = '';
    if (term.predictor && term.predictor !== 'Intercept') {
      if (term.type === 'categorical') {
        if (!seen.has(term.predictor)) etaDisplay = formatNumber(term.partialEta2, 4);
      } else etaDisplay = formatNumber(term.partialEta2, 4);
      seen.add(term.predictor);
    }
    return `
    <tr>
      <td>${escapeHtml(term.predictor)}${term.type === 'categorical' && term.reference ? ` (ref="${escapeHtml(term.reference)}")` : ''}</td>
      <td>${term.type === 'categorical' ? escapeHtml(term.term) : ''}</td>
      <td>${formatNumber(term.estimate, 4)}</td>
      <td>${formatNumber(term.se, 4)}</td>
      <td>${formatNumber(term.t, 3)}</td>
      <td>${formatP(term.p)}</td>
      <td>${etaDisplay}</td>
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
  equationEl.innerHTML = `<strong>${escapeHtml(selectedOutcome)}</strong> = ${parts.join(' ')}`;
}

function renderNarratives(model) {
  const apa = document.getElementById('apa-report');
  const mgr = document.getElementById('managerial-report');
  if (!apa || !mgr) return;
  const top = model.terms.slice(1).filter(t => Number.isFinite(t.t)).sort((a, b) => Math.abs(b.t) - Math.abs(a.t))[0];
  const effectText = top
    ? `${escapeHtml(top.predictor)} (${top.type === 'categorical' ? 'categorical' : 'continuous'}) had an estimated effect of ${formatNumber(top.estimate, 3)}, t = ${formatNumber(top.t, 3)}, p = ${formatP(top.p)}.`
    : 'Effects could not be estimated.';
  apa.textContent = `Multiple linear regression: R² = ${formatNumber(model.r2, 3)}, adj. R² = ${formatNumber(model.adjR2, 3)}, F(${model.dfModel}, ${model.dfError}) = ${formatNumber(model.fStat, 3)}. ${effectText}`;
  mgr.textContent = `Model explains ~${formatNumber(model.r2 * 100, 1)}% of outcome variance. Largest signal: ${top ? `${top.predictor}` : 'none'}. Treat effects with caution pending diagnostics.`;
}

  function renderDiagnostics(model) {
  const diagCol = document.getElementById('diag-collinearity');
  const diagRes = document.getElementById('diag-residuals');
  if (diagCol) diagCol.textContent = model.dfModel >= model.n - 1
    ? 'Model is saturated; drop predictors or add rows.'
    : 'No explicit collinearity check beyond matrix invertibility; if the model failed, remove redundant predictors.';
  if (diagRes) {
    const resSpread = StatsUtils.standardDeviation(model.residuals);
    diagRes.textContent = `Residual spread ≈ ${formatNumber(resSpread, 3)}. Check residual vs. fitted and normality plots for variance and outliers.`;
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
        xaxis: { title: 'Fitted' },
        yaxis: { title: 'Residuals' },
        showlegend: false
      }, { responsive: true });
      if (resCaption) resCaption.textContent = 'Residuals versus fitted values.';
    }
  }
}

function renderSummaryStats(model, rows, predictorsInfo) {
  const numericBody = document.getElementById('numeric-summary-body');
  const catBody = document.getElementById('categorical-summary-body');
  if (numericBody) {
    const numericVars = [selectedOutcome, ...predictorsInfo.filter(p => p.type !== 'categorical').map(p => p.name)];
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
    numericBody.innerHTML = rowsOut.length ? rowsOut.join('') : '<tr><td colspan="6">No numeric variables to summarize.</td></tr>';
  }
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
    catBody.innerHTML = rowsOut.length ? rowsOut.join('') : '<tr><td colspan="3">No categorical variables to summarize.</td></tr>';
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
  // Fall back to the current selectedPredictors if no predictorsInfo
  // was provided (e.g., model not yet fit or filtered out).
  let effectivePredictors = Array.isArray(predictorsInfo) && predictorsInfo.length
    ? predictorsInfo
    : selectedPredictors.map(name => {
        const setting = predictorSettings[name]?.type || columnMeta[name]?.inferredType || 'numeric';
        return { name, type: setting };
      });

  const focalSelect = document.getElementById('effect-focal-select');
  if (!focalSelect) return;
  focalSelect.innerHTML = '';
  effectivePredictors.forEach(info => {
    const opt = document.createElement('option');
    opt.value = info.name;
    opt.textContent = info.name;
    focalSelect.appendChild(opt);
  });
    if (effectState.focal && effectivePredictors.find(p => p.name === effectState.focal)) {
      focalSelect.value = effectState.focal;
    } else {
      effectState.focal = effectivePredictors[0]?.name || '';
      focalSelect.value = effectState.focal;
    }

    // Hide the continuous range controls when the focal predictor is categorical,
    // since X-axis range only applies to continuous focal predictors.
    const focalInfo = effectivePredictors.find(p => p.name === effectState.focal) || null;
    const rangeControls = document.querySelector('.range-controls');
    if (rangeControls) {
      const isContinuousFocal = focalInfo && focalInfo.type !== 'categorical';
      rangeControls.style.display = isContinuousFocal ? '' : 'none';
    }
  const nonFocalLevels = document.getElementById('effect-nonfocal-levels');
  if (nonFocalLevels) {
    nonFocalLevels.innerHTML = '';
    effectivePredictors.forEach(info => {
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
  focalSelect.onchange = () => {
    effectState.focal = focalSelect.value;
    // Rebuild non-focal categorical controls for the new focal predictor
    updateEffectControls(lastPredictorsInfo);
    renderEffectPlot(lastModel, lastFilteredRows, lastPredictorsInfo);
  };
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
    const nonFocalLevels = document.getElementById('effect-nonfocal-levels');
    if (!plot || !model || !rows || !rows.length) {
      if (nonFocalContinuous) nonFocalContinuous.innerHTML = '';
      if (nonFocalLevels) nonFocalLevels.innerHTML = '';
      return;
    }
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

// ---------- Main update ----------
function updateResults() {
  const alphaInput = document.getElementById('alpha');
  const alphaValue = alphaInput ? parseFloat(alphaInput.value) : NaN;
  const alpha = isFinite(alphaValue) && alphaValue > 0 && alphaValue < 1 ? alphaValue : 1 - selectedConfidenceLevel;
  if (alphaInput && (!isFinite(alphaValue) || alphaValue <= 0 || alphaValue >= 1)) alphaInput.value = formatAlpha(alpha);
  const alphaEl = document.getElementById('metric-alpha');
  if (alphaEl) alphaEl.textContent = formatAlpha(alpha);
  const summaryEl = document.getElementById('assignment-summary'); if (summaryEl) summaryEl.textContent = '';
  const { filtered, dropped, issues, predictorsInfo } = filterRowsForModel();
  lastFilteredRows = filtered; lastPredictorsInfo = predictorsInfo;
  const kept = filtered.length;
  // Keep effect controls synced with the current predictor assignment,
  // even if we hit a validation issue and cannot fit the model.
  updateEffectControls(predictorsInfo);
  if (!dataset.rows.length) { clearOutputs('Upload a CSV with an outcome and predictors to begin.'); return; }
  if (!selectedOutcome) { clearOutputs('Select an outcome variable.'); return; }
  if (!selectedPredictors.length) { clearOutputs('Select at least one predictor.'); return; }
  if (issues.length) { clearOutputs(issues[0]); return; }
  if (kept < 5) { clearOutputs('Need at least 5 complete rows to proceed.'); return; }
  const model = buildDesignMatrixAndFit(filtered, predictorsInfo, selectedOutcome, alpha);
  if (model.error) { clearOutputs(model.error); return; }
  lastModel = model;
  assignPredictorPartialEta(model);
  populateMetrics(model);
  populateCoefficients(model);
  renderEquation(model);
  renderNarratives(model);
  renderDiagnostics(model);
  renderSummaryStats(model, filtered, predictorsInfo);
  renderEffectPlot(model, filtered, predictorsInfo);
  renderActualFitted(model);
  renderCoefInterpretation(model);
  hasSuccessfulRun = true;
  checkAndTrackUsage();
  const modifiedLabel = document.getElementById('modified-date');
  if (modifiedLabel) modifiedLabel.textContent = new Date().toLocaleDateString();
}

// ---------- INIT ----------
  document.addEventListener('DOMContentLoaded', () => {
  const scenarioContainer = document.getElementById('scenario-description');
  if (scenarioContainer) defaultScenarioDescription = scenarioContainer.innerHTML;
  setupRawUpload();
  setupScenarioSelector();
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

    const downloadButton = document.getElementById('mlr-download-results');
    if (downloadButton) {
      downloadButton.addEventListener('click', event => {
        event.preventDefault();
        handleDownloadFittedAndResiduals();
      });
    }
  });

  function handleDownloadFittedAndResiduals() {
    if (!lastModel || !lastRawDataset || !Array.isArray(lastRawDataset.rows) || !lastRawDataset.rows.length) {
      clearOutputs('Run a regression model with uploaded raw data before downloading fitted values and residuals.');
      return;
    }
    const headers = lastRawDataset.headers;
    const rows = lastRawDataset.rows;
    const model = lastModel;
    if (!Array.isArray(model.fitted) || model.fitted.length !== rows.length || !Array.isArray(model.y)) {
      clearOutputs('Unable to prepare download: fitted values are missing or misaligned.');
      return;
    }

    const designMatrix = model.designMatrix;
    const covB = model.covB;
    const alpha = typeof model.alpha === 'number' && model.alpha > 0 && model.alpha < 1 ? model.alpha : 0.05;
    const zCrit = (window.StatsUtils && typeof window.StatsUtils.normInv === 'function')
      ? window.StatsUtils.normInv(1 - alpha / 2)
      : 1.96;

    const outHeaders = headers.concat(['y_fitted', 'residual', 'y_fit_ci_lower', 'y_fit_ci_upper']);
    const lines = [outHeaders.join(',')];

    for (let i = 0; i < rows.length; i++) {
      const baseRow = headers.map(h => {
        const value = rows[i][h];
        if (value == null) return '';
        const num = parseFloat(value);
        return Number.isFinite(num) && String(value).trim() === String(num) ? String(num) : String(value);
      });
      const fitted = model.fitted[i];
      const actual = model.y[i];
      const residual = Number.isFinite(actual) && Number.isFinite(fitted) ? actual - fitted : NaN;

      let lower = NaN;
      let upper = NaN;
      if (Array.isArray(designMatrix) && Array.isArray(covB) && designMatrix[i] && covB.length === designMatrix[i].length) {
        const xRow = designMatrix[i];
        let varFit = 0;
        for (let r = 0; r < xRow.length; r++) {
          for (let c = 0; c < xRow.length; c++) {
            const cov = covB[r] && typeof covB[r][c] === 'number' ? covB[r][c] : 0;
            varFit += xRow[r] * cov * xRow[c];
          }
        }
        const seFit = varFit > 0 ? Math.sqrt(varFit) : 0;
        if (Number.isFinite(fitted) && seFit >= 0) {
          lower = fitted - zCrit * seFit;
          upper = fitted + zCrit * seFit;
        }
      }

      baseRow.push(Number.isFinite(fitted) ? fitted.toFixed(6) : '');
      baseRow.push(Number.isFinite(residual) ? residual.toFixed(6) : '');
      baseRow.push(Number.isFinite(lower) ? lower.toFixed(6) : '');
      baseRow.push(Number.isFinite(upper) ? upper.toFixed(6) : '');
      lines.push(baseRow.join(','));
      }

      downloadTextFile('ml_regression_fitted_residuals.csv', lines.join('\n'), { mimeType: 'text/csv' });
  }

  // Override earlier equation renderer with clearer categorical formatting.
  // For categorical terms, show (VARNAME, LEVEL=1), e.g., (Gender, Male=1).
  function renderEquation(model) {
    const equationEl = document.getElementById('regression-equation-output');
    if (!equationEl || !model.terms || !model.terms.length) return;
    const parts = model.terms.map((term, idx) => {
      if (idx === 0) {
        return formatNumber(term.estimate, 3);
      }
      const sign = term.estimate >= 0 ? '+' : '-';
      const absVal = formatNumber(Math.abs(term.estimate), 3);
      if (term.type === 'categorical') {
        // Example: + 1.234 * (Gender, Male=1)
        return `${sign} ${absVal} * (${escapeHtml(term.predictor)}, ${escapeHtml(term.term)}=1)`;
      }
      // Continuous predictor: + 0.456 * Spend
      return `${sign} ${absVal} * ${escapeHtml(term.predictor)}`;
    });
    equationEl.innerHTML = `<strong>${escapeHtml(selectedOutcome)}</strong> = ${parts.join(' ')}`;
  }

