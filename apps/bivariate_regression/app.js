// Bivariate Linear Regression Tool – minimal first version

const CREATED_DATE = new Date('2025-11-16').toLocaleDateString();
let modifiedDate = new Date().toLocaleDateString();

let selectedConfidenceLevel = 0.95;

const DataEntryModes = Object.freeze({
  MANUAL: 'manual',
  RAW: 'raw-upload'
});

const MAX_MANUAL_ROWS = 50;
let manualRowCount = 4;
let activeDataEntryMode = DataEntryModes.MANUAL;

let scenarioManifest = [];
let defaultScenarioDescription = '';
let activeScenarioDataset = null;
let uploadedRawData = null;
const RAW_UPLOAD_LIMIT = typeof MAX_UPLOAD_ROWS === 'number' ? MAX_UPLOAD_ROWS : 2000;

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

function mean(values) {
  if (!values.length) return NaN;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

function variance(values) {
  if (values.length < 2) return NaN;
  const m = mean(values);
  const ss = values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0);
  return ss / (values.length - 1);
}

function standardDeviation(values) {
  const v = variance(values);
  return Number.isFinite(v) ? Math.sqrt(v) : NaN;
}

function formatNumber(v, digits = 3) {
  if (!Number.isFinite(v)) return '–';
  return v.toFixed(digits);
}

function formatP(p) {
  if (!Number.isFinite(p)) return '–';
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

// Override any earlier numeric/APA helpers with clean, ASCII-safe versions.
function cleanFormatNumber(v, digits = 3) {
  if (!Number.isFinite(v)) return '–';
  return v.toFixed(digits);
}

function cleanFormatP(p) {
  if (!Number.isFinite(p)) return '–';
  if (p < 0.0001) return '< .0001';
  return p.toFixed(4);
}

// Rebind callers to use the clean helpers
const originalFormatNumber = formatNumber;
const originalFormatP = formatP;
/* eslint-disable no-global-assign */
formatNumber = cleanFormatNumber;
formatP = cleanFormatP;
/* eslint-enable no-global-assign */

function erf(x) {
  // Abramowitz & Stegun approximation
  const sign = Math.sign(x);
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  return sign * y;
}

function normCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function normInv(p) {
  // Approximate inverse normal CDF (same as in McNemar app)
  if (p <= 0 || p >= 1) throw new Error('p must be between 0 and 1');
  const a1 = -39.6968302866538;
  const a2 = 220.946098424521;
  const a3 = -275.928510446969;
  const a4 = 138.357751867269;
  const a5 = -30.6647980661472;
  const a6 = 2.50662827745924;
  const b1 = -54.4760987982241;
  const b2 = 161.585836858041;
  const b3 = -155.698979859887;
  const b4 = 66.8013118877197;
  const b5 = -13.2806815528857;
  const c1 = -0.00778489400243029;
  const c2 = -0.322396458041136;
  const c3 = -2.40075827716184;
  const c4 = -2.54973253934373;
  const c5 = 4.37466414146497;
  const c6 = 2.93816398269878;
  const d1 = 0.00778469570904146;
  const d2 = 0.32246712907004;
  const d3 = 2.445134137143;
  const d4 = 3.75440866190742;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
    ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
}

function applyConfidenceSelection(level, { syncAlpha = true, skipUpdate = false } = {}) {
  selectedConfidenceLevel = clamp(level, 0.5, 0.999);
  document.querySelectorAll('.conf-level-btn').forEach(button => {
    const value = parseFloat(button.dataset.level);
    button.classList.toggle('selected', Math.abs(value - selectedConfidenceLevel) < 1e-6);
  });
  if (syncAlpha) {
    const alphaInput = document.getElementById('alpha');
    if (alphaInput) {
      const alpha = 1 - selectedConfidenceLevel;
      alphaInput.value = formatAlpha(alpha);
    }
  }
  if (!skipUpdate) {
    if (activeScenarioDataset) {
      runScenarioFromCsv(activeScenarioDataset.content);
    } else {
      updateResults();
    }
  }
}

function syncConfidenceButtonsToAlpha(alphaValue, { skipUpdate = false } = {}) {
  const alpha = parseFloat(alphaValue);
  const buttons = document.querySelectorAll('.conf-level-btn');
  let matched = false;
  if (isFinite(alpha) && alpha > 0 && alpha < 1) {
    buttons.forEach(button => {
      const level = parseFloat(button.dataset.level);
      const expectedAlpha = +(1 - level).toFixed(3);
      const match = Math.abs(alpha - expectedAlpha) < 1e-4;
      button.classList.toggle('selected', match);
      if (match) {
        selectedConfidenceLevel = level;
        matched = true;
      }
    });
    if (!matched) {
      selectedConfidenceLevel = clamp(1 - alpha, 0.5, 0.999);
    }
  } else {
    buttons.forEach(button => button.classList.remove('selected'));
  }
  if (!skipUpdate) {
    if (activeScenarioDataset) {
      runScenarioFromCsv(activeScenarioDataset.content);
    } else {
      updateResults();
    }
  }
}

function setDataEntryMode(mode) {
  if (!Object.values(DataEntryModes).includes(mode)) {
    mode = DataEntryModes.MANUAL;
  }
  activeDataEntryMode = mode;
  document.querySelectorAll('.mode-button').forEach(button => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.mode-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.mode === mode);
  });
  updateResults();
}

function setupDataEntryModeToggle() {
  const toggle = document.querySelector('.mode-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', event => {
    const button = event.target.closest('.mode-button');
    if (!button) return;
    event.preventDefault();
    setDataEntryMode(button.dataset.mode);
  });
  setDataEntryMode(activeDataEntryMode);
}

function snapshotManualValues() {
  const tbody = document.getElementById('regression-table-body');
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll('tr')).map(row => {
    const xInput = row.querySelector('.manual-x');
    const yInput = row.querySelector('.manual-y');
    return {
      x: xInput ? xInput.value : '',
      y: yInput ? yInput.value : ''
    };
  });
}

function renderManualRows(existingValues = []) {
  const tbody = document.getElementById('regression-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  for (let i = 0; i < manualRowCount; i++) {
    const existing = existingValues[i] || {};
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="row-number">${i + 1}</span></td>
      <td><input type="text" class="manual-x" value="${existing.x || ''}"></td>
      <td><input type="number" class="manual-y" step="any" value="${existing.y || ''}"></td>
    `;
    row.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        if (activeDataEntryMode === DataEntryModes.MANUAL) {
          updateResults();
        }
      });
    });
    tbody.appendChild(row);
  }
}

function setManualRowCount(value, { preserveValues = true } = {}) {
  const parsed = Number.isInteger(value) ? value : parseInt(value, 10);
  const clamped = clamp(isFinite(parsed) ? parsed : manualRowCount, 4, MAX_MANUAL_ROWS);
  const existing = preserveValues ? snapshotManualValues() : [];
  manualRowCount = clamped;
  const input = document.getElementById('manual-row-count');
  if (input && parseInt(input.value, 10) !== clamped) {
    input.value = clamped;
  }
  renderManualRows(existing);
}

function setupManualControls() {
  const rowCountInput = document.getElementById('manual-row-count');
  if (rowCountInput) {
    rowCountInput.addEventListener('change', () => {
      const value = parseInt(rowCountInput.value, 10);
      setManualRowCount(value);
      updateResults();
    });
  }
  setManualRowCount(manualRowCount, { preserveValues: false });
}

function collectManualRaw() {
  const tbody = document.getElementById('regression-table-body');
  const rows = [];
  if (!tbody) return { rows, labels: {}, message: 'No manual table found.' };

  const xName = document.getElementById('x-label')?.value.trim() || 'Predictor';
  const yName = document.getElementById('y-label')?.value.trim() || 'Outcome';

  Array.from(tbody.querySelectorAll('tr')).forEach(row => {
    const xInput = row.querySelector('.manual-x');
    const yInput = row.querySelector('.manual-y');
    const rawX = xInput ? xInput.value.trim() : '';
    const yStr = yInput ? yInput.value.trim() : '';
    if (!rawX && !yStr) return;
    const y = yStr !== '' ? parseFloat(yStr) : NaN;
    rows.push({ x: rawX, y });
  });

  if (!rows.length) {
    return { rows, labels: { x: xName, y: yName }, message: 'Enter at least three paired observations.' };
  }
  if (rows.length < 3) {
    return { rows, labels: { x: xName, y: yName }, message: 'At least three paired observations are required.' };
  }
  const invalid = rows.find((r, idx) => !isFinite(r.y));
  if (invalid) {
    return { rows, labels: { x: xName, y: yName }, message: 'All outcome (Y) values must be numeric.' };
  }
  return { rows, labels: { x: xName, y: yName }, message: null };
}

function setRawUploadStatus(message, status = '') {
    const statusEl = document.getElementById('raw-upload-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('success', 'error');
  if (status) {
    statusEl.classList.add(status);
  }
}

function parseRawUploadText(text) {
  if (typeof text !== 'string') {
    throw new Error('Unable to read the file contents.');
  }
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('File is empty.');
  }
  const lines = text.replace(/\r/g, '').split('\n');
  if (lines.length < 2) {
    throw new Error('File must include a header row and at least one data row.');
  }
  const headerLine = lines[0];
  const delimiter = typeof detectDelimiter === 'function'
    ? detectDelimiter(headerLine)
    : (headerLine.includes('\t') ? '\t' : ',');
  const headers = headerLine.split(delimiter).map(part => part.trim());
  if (headers.length < 2) {
    throw new Error('Provide at least two columns (predictor and outcome).');
  }
  const labels = {
    x: headers[0] || 'Predictor',
    y: headers[1] || 'Outcome'
  };
  const rows = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine || !rawLine.trim()) continue;
    const parts = rawLine.split(delimiter).map(part => part.trim());
    if (parts.length < 2) {
      errors.push(`Row ${i + 1}: expected at least two columns.`);
      continue;
    }
    const predictor = parts[0];
    const outcomeStr = parts[1];
    if (outcomeStr === '') {
      errors.push(`Row ${i + 1}: outcome is blank.`);
      continue;
    }
    const outcome = parseFloat(outcomeStr);
    if (!isFinite(outcome)) {
      errors.push(`Row ${i + 1}: outcome must be numeric.`);
      continue;
    }
    rows.push({ x: predictor, y: outcome });
    if (rows.length > RAW_UPLOAD_LIMIT) {
      throw new Error(`Upload limit exceeded: Only ${RAW_UPLOAD_LIMIT} row(s) are supported per file.`);
    }
  }
  if (!rows.length) {
    throw new Error(errors.length ? errors[0] : 'No valid rows found in the file.');
  }
    return { rows, labels, warnings: errors };
}

function inferPredictorType(rows = []) {
    if (!Array.isArray(rows) || !rows.length) {
        return 'continuous';
    }
    const numericCandidate = rows.map(row => {
        const raw = row?.x;
        if (raw === null || raw === undefined || raw === '') {
            return NaN;
        }
        const parsed = parseFloat(raw);
        return isFinite(parsed) ? parsed : NaN;
    });
    return numericCandidate.every(value => isFinite(value)) ? 'continuous' : 'categorical';
}

function importRawData(text) {
    try {
        const parsed = parseRawUploadText(text);
        const predictorType = inferPredictorType(parsed.rows);
        uploadedRawData = { ...parsed, predictorType };
        const skippedNote = parsed.warnings.length ? ` Skipped ${parsed.warnings.length} row(s).` : '';
        const typeLabel = predictorType === 'continuous' ? 'continuous predictor' : 'categorical predictor';
        const detail = `Predictor ${parsed.labels.x} (${typeLabel}); outcome ${parsed.labels.y}.`;
        setRawUploadStatus(`Loaded ${parsed.rows.length} row(s). ${detail}${skippedNote}`, 'success');
        if (activeDataEntryMode !== DataEntryModes.RAW) {
            setDataEntryMode(DataEntryModes.RAW);
        } else {
            updateResults();
        }
  } catch (error) {
    uploadedRawData = null;
    setRawUploadStatus(error.message || 'Unable to load the file.', 'error');
    throw error;
  }
}

function handleRawFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    try {
      importRawData(event.target.result);
    } catch {
      // Errors are surfaced via status text.
    }
  };
  reader.onerror = () => setRawUploadStatus('Unable to read the file.', 'error');
  reader.readAsText(file);
}

function setupRawUpload() {
  const dropzone = document.getElementById('raw-dropzone');
  const fileInput = document.getElementById('raw-input');
  const browseButton = document.getElementById('raw-browse');
  const templateButton = document.getElementById('raw-template-download');
  if (!dropzone || !fileInput) return;

  const openFileDialog = () => fileInput.click();

  dropzone.addEventListener('click', openFileDialog);
  dropzone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFileDialog();
    }
  });

  if (browseButton) {
    browseButton.addEventListener('click', event => {
      event.preventDefault();
      openFileDialog();
    });
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, event => {
      event.preventDefault();
      dropzone.classList.add('drag-active');
    });
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, event => {
      event.preventDefault();
      if (eventName === 'drop' && event.dataTransfer?.files?.length) {
        handleRawFile(event.dataTransfer.files[0]);
      }
      dropzone.classList.remove('drag-active');
    });
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length) {
      handleRawFile(fileInput.files[0]);
    }
    fileInput.value = '';
  });

  if (templateButton) {
    templateButton.addEventListener('click', () => {
      const content = 'Predictor,Outcome\nSegment A,12.5\nSegment B,14.2\nSegment C,11.8\nSegment D,15.1\n';
      downloadTextFile('regression_raw_template.csv', content);
    });
  }

  setRawUploadStatus('No raw file uploaded.');
}

function collectRawUpload() {
  if (!uploadedRawData || !Array.isArray(uploadedRawData.rows)) {
    return {
      rows: [],
      labels: { x: 'Predictor', y: 'Outcome' },
      message: 'Upload a raw data file with at least three paired rows.'
    };
  }
  if (uploadedRawData.rows.length < 3) {
    return {
      rows: uploadedRawData.rows,
      labels: uploadedRawData.labels,
      message: 'Upload at least three paired observations.'
    };
  }
  return {
    rows: uploadedRawData.rows,
    labels: uploadedRawData.labels,
    message: null
  };
}

function clearOutputs(message) {
  const apa = document.getElementById('apa-report');
  const managerial = document.getElementById('managerial-report');
  const metrics = [
    'metric-predictor-type',
    'metric-slope',
    'metric-intercept',
    'metric-r2',
    'metric-t',
    'metric-pvalue',
    'metric-decision'
  ];
  const summaryBody = document.getElementById('summary-table-body');
  const diagnostics = document.getElementById('diagnostics-content');
  const caption = document.getElementById('regression-caption');

  if (caption) caption.textContent = '';
  if (apa) apa.textContent = '';
  if (managerial) managerial.textContent = '';
  metrics.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '–';
  });
  if (summaryBody) {
    summaryBody.innerHTML = `<tr><td colspan="7">${escapeHtml(message)}</td></tr>`;
  }
  if (diagnostics) {
    diagnostics.innerHTML = '<p class="muted">Run an analysis to populate diagnostics.</p>';
  }
}

function enableScenarioDownload(datasetInfo) {
  const button = document.getElementById('scenario-download');
  if (!button) return;
  if (datasetInfo) {
    activeScenarioDataset = datasetInfo;
    button.classList.remove('hidden');
    button.disabled = false;
  } else {
    activeScenarioDataset = null;
    button.classList.add('hidden');
    button.disabled = true;
  }
}

async function fetchScenarioIndex() {
  try {
    const response = await fetch('scenarios/scenario-index.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Unable to load scenario index (${response.status})`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      scenarioManifest = data;
    }
  } catch (error) {
    console.error('Scenario index error:', error);
    scenarioManifest = [];
  }
}

function parseScenarioText(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const result = {
    title: '',
    description: []
  };
  let section = '';
  const descriptionLines = [];

  lines.forEach(rawLine => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (section === 'description') {
        descriptionLines.push('');
      }
      return;
    }
    if (trimmed.startsWith('#')) {
      section = trimmed.slice(1).trim().toLowerCase();
      return;
    }
    if (section === 'title') {
      if (!result.title) {
        result.title = trimmed;
      }
    } else if (section === 'description') {
      descriptionLines.push(trimmed);
    }
  });

  const paragraphs = [];
  let buffer = [];
  descriptionLines.forEach(line => {
    if (!line) {
      if (buffer.length) {
        paragraphs.push(buffer.join(' '));
        buffer = [];
      }
      return;
    }
    buffer.push(line);
  });
  if (buffer.length) {
    paragraphs.push(buffer.join(' '));
  }
  result.description = paragraphs;
  return result;
}

function renderScenarioDescription(title, description) {
  const container = document.getElementById('scenario-description');
  if (!container) return;
  if (!Array.isArray(description) || !description.length) {
    container.innerHTML = defaultScenarioDescription || '';
    return;
  }
  const paragraphs = description.map(text => `<p>${escapeHtml(text)}</p>`).join('');
  const heading = title ? `<h3>${escapeHtml(title)}</h3>` : '';
  container.innerHTML = `${heading}${paragraphs}`;
}

async function loadScenarioById(id) {
  const scenario = scenarioManifest.find(entry => entry.id === id);
  if (!scenario) {
    renderScenarioDescription('', []);
    enableScenarioDownload(null);
    return;
  }
  try {
    const response = await fetch(scenario.file, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Unable to load scenario file (${response.status})`);
    }
    const text = await response.text();
    const parsed = parseScenarioText(text);
    renderScenarioDescription(parsed.title || scenario.label, parsed.description);

    // Default: clear outputs until we successfully interpret a dataset
    clearOutputs('Scenario loaded. If a dataset is attached, results will appear below.');

    if (scenario.dataset) {
      try {
        const datasetResponse = await fetch(scenario.dataset, { cache: 'no-cache' });
        if (!datasetResponse.ok) {
          throw new Error(`Unable to load scenario dataset (${datasetResponse.status})`);
        }
        const csvText = await datasetResponse.text();
        const filename = scenario.dataset.split('/').pop() || 'scenario_dataset.csv';
        enableScenarioDownload({
          filename,
          content: csvText,
          mimeType: 'text/csv'
        });

        // Try to run the analysis directly from the dataset
        runScenarioFromCsv(csvText);
      } catch (datasetError) {
        console.error('Scenario dataset load error:', datasetError);
        enableScenarioDownload(null);
        clearOutputs('Scenario description loaded, but the dataset could not be interpreted.');
      }
    } else {
      enableScenarioDownload(null);
    }
  } catch (error) {
    console.error('Scenario load error:', error);
    enableScenarioDownload(null);
  }
}

function runScenarioFromCsv(csvText) {
  const trimmed = csvText.trim();
  if (!trimmed) {
    clearOutputs('Scenario dataset is empty.');
    return;
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    clearOutputs('Scenario dataset requires a header row and at least one data row.');
    return;
  }
  const headerLine = lines[0];
  const delimiter = headerLine.includes('\t') ? '\t' : ',';
  const headers = headerLine.split(delimiter).map(h => h.trim());
  const labels = {
    x: headers[0] || 'Predictor',
    y: headers[1] || 'Outcome'
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map(p => p.trim());
    if (parts.length < 2) continue;
    const rawX = parts[0];
    const yStr = parts[1];
    if (!rawX && !yStr) continue;
    const y = yStr !== '' ? parseFloat(yStr) : NaN;
    rows.push({ x: rawX, y });
  }

  if (!rows.length) {
    clearOutputs('Scenario dataset did not contain any valid rows.');
    return;
  }

  const invalidY = rows.find(r => !isFinite(r.y));
  if (invalidY) {
    clearOutputs('All outcome (Y) values in the scenario dataset must be numeric.');
    return;
  }

  const alphaInput = document.getElementById('alpha');
  const alphaValue = alphaInput ? parseFloat(alphaInput.value) : NaN;
  const alpha = isFinite(alphaValue) && alphaValue > 0 && alphaValue < 1 ? alphaValue : 1 - selectedConfidenceLevel;
  if (alphaInput && (!isFinite(alphaValue) || alphaValue <= 0 || alphaValue >= 1)) {
    alphaInput.value = formatAlpha(alpha);
  }

  const predictorChoice = 'auto';
  const xRaw = rows.map(r => r.x);
  const yValues = rows.map(r => parseFloat(r.y));
  const xNumericCandidate = xRaw.map(v => {
    const parsed = parseFloat(v);
    return isFinite(parsed) && v !== '' ? parsed : NaN;
  });
  const allNumeric = xNumericCandidate.every(v => isFinite(v));

  let predictorType = allNumeric ? 'continuous' : 'categorical';

  if (predictorType === 'continuous' && !allNumeric) {
    clearOutputs('Scenario predictor includes non-numeric values; treating as categorical is more appropriate.');
    predictorType = 'categorical';
  }

  let xNumeric = null;
  let xGroups = null;
  let reference = null;
  let parameters = [];
  let rSquared = NaN;

  if (predictorType === 'continuous') {
    xNumeric = xNumericCandidate;
    const meanX = mean(xNumeric);
    const meanY = mean(yValues);
    const sdX = standardDeviation(xNumeric);
    const sdY = standardDeviation(yValues);
    const covXY = xNumeric.reduce((acc, xv, i) => acc + (xv - meanX) * (yValues[i] - meanY), 0) / (xNumeric.length - 1);
    const r = covXY / (sdX * sdY);
    rSquared = r * r;
  } else {
    const levelMap = new Map();
    xRaw.forEach((v, idx) => {
      const key = v || '(missing)';
      if (!levelMap.has(key)) {
        levelMap.set(key, []);
      }
      levelMap.get(key).push(yValues[idx]);
    });
    const levels = Array.from(levelMap.keys());
    if (levels.length < 2) {
      clearOutputs('Categorical predictor in the scenario dataset must have at least two distinct levels.');
      return;
    }
    levels.sort((a, b) => levelMap.get(b).length - levelMap.get(a).length);
    reference = levels[0];
    const groupStats = levels.map(name => {
      const ys = levelMap.get(name);
      return {
        name,
        n: ys.length,
        mean: mean(ys),
        sd: standardDeviation(ys)
      };
    });
    const overallMean = mean(yValues);
    const sst = yValues.reduce((acc, yv) => acc + Math.pow(yv - overallMean, 2), 0);
    const sse = groupStats.reduce((acc, g) => acc + g.sd * g.sd * (g.n - 1), 0);
    rSquared = sst > 0 ? 1 - sse / sst : NaN;

    parameters = groupStats
      .filter(g => g.name !== reference)
      .map(g => ({
        name: g.name,
        estimate: g.mean - groupStats.find(ref => ref.name === reference).mean,
        group: g
      }));

    xGroups = {
      levels,
      groupStats,
      pooledVar: sse / (yValues.length - levels.length)
    };
  }

  const df = predictorType === 'continuous'
    ? yValues.length - 2
    : yValues.length - (xGroups.levels.length);

  let slope = NaN;
  let intercept = NaN;
  let seSlope = NaN;
  let t = NaN;
  let p = NaN;

  if (predictorType === 'continuous') {
    const meanX = mean(xNumericCandidate);
    const meanY = mean(yValues);
    const covXY = xNumericCandidate.reduce((acc, xv, i) => acc + (xv - meanX) * (yValues[i] - meanY), 0) / (xNumericCandidate.length - 1);
    slope = covXY / variance(xNumericCandidate);
    intercept = meanY - slope * meanX;
    const residuals = yValues.map((yv, i) => yv - (intercept + slope * xNumericCandidate[i]));
    const s2 = variance(residuals) * (yValues.length - 1) / (yValues.length - 2);
    seSlope = Math.sqrt(s2 / variance(xNumericCandidate) / (yValues.length - 1) * (yValues.length - 1));
    t = slope / seSlope;
    p = 2 * (1 - normCdf(Math.abs(t)));
  } else {
    const refIndex = xGroups.levels.indexOf(reference);
    const refStats = xGroups.groupStats[refIndex];
    intercept = refStats.mean;
    const pooledVar = xGroups.pooledVar;
    parameters.forEach(param => {
      if (slope === null || slope === undefined || !isFinite(slope)) {
        slope = param.estimate;
        const otherStats = param.group;
        seSlope = Math.sqrt(pooledVar * (1 / refStats.n + 1 / otherStats.n));
        t = slope / seSlope;
        p = 2 * (1 - normCdf(Math.abs(t)));
      }
    });
  }

  const critical = normInv(1 - alpha / 2);
  const ciLower = slope - critical * seSlope;
  const ciUpper = slope + critical * seSlope;

  const stats = {
    n: yValues.length,
    df,
    slope,
    intercept,
    seSlope,
    t,
    p,
    rSquared,
    alpha
  };

  updateMetricsPanel(stats, predictorType, { reference });
  updateSummaryTable(stats, predictorType, { xGroups, reference });
  writeRegressionNarratives(stats, labels, predictorType, { xGroups, reference });
  updateDiagnostics(stats);
  if (predictorType === 'continuous') {
    renderContinuousChart(stats, labels, xNumericCandidate, yValues);
  } else {
    renderCategoricalChart(stats, labels, xGroups, alpha);
  }
}

async function setupScenarioSelector() {
  const select = document.getElementById('scenario-select');
  if (!select) return;

  await fetchScenarioIndex();
  scenarioManifest.forEach(entry => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.label;
    select.appendChild(option);
  });

  enableScenarioDownload(null);

  select.addEventListener('change', () => {
    const value = select.value;
    if (!value) {
      renderScenarioDescription('', []);
      enableScenarioDownload(null);
      return;
    }
    loadScenarioById(value);
  });

  const downloadButton = document.getElementById('scenario-download');
  if (downloadButton) {
    downloadButton.addEventListener('click', () => {
      if (!activeScenarioDataset) return;
      downloadTextFile(
        activeScenarioDataset.filename,
        activeScenarioDataset.content,
        { mimeType: activeScenarioDataset.mimeType || 'text/csv' }
      );
    });
  }
}

function updateMetricsPanel(stats, predictorType, refInfo) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  if (predictorType === 'continuous') {
    set('metric-predictor-type', 'Continuous');
  } else {
    const refLabel = refInfo && refInfo.reference ? ` (ref: ${refInfo.reference})` : '';
    set('metric-predictor-type', `Categorical${refLabel}`);
  }
  set('metric-slope', formatNumber(stats.slope, 3));
  set('metric-intercept', formatNumber(stats.intercept, 3));
  set('metric-r2', formatNumber(stats.rSquared, 3));
  set('metric-t', formatNumber(stats.t, 3));
  set('metric-pvalue', formatP(stats.p));
  const decision = stats.p <= stats.alpha
    ? `Reject H₀ at α = ${formatAlpha(stats.alpha)}`
    : `Fail to reject H₀ at α = ${formatAlpha(stats.alpha)}`;
  set('metric-decision', decision);
}

function updateSummaryTable(stats, predictorType, extra = {}) {
  const body = document.getElementById('summary-table-body');
  if (!body) return;
  if (predictorType !== 'categorical' || !extra.xGroups) {
    // Continuous case: intercept + single slope
    const z = normInv(1 - stats.alpha / 2);
    body.innerHTML = `
      <tr>
        <td>Intercept</td>
        <td>${formatNumber(stats.intercept, 3)}</td>
        <td>–</td>
        <td>–</td>
        <td>–</td>
        <td>–</td>
        <td>–</td>
      </tr>
      <tr>
        <td>Slope</td>
        <td>${formatNumber(stats.slope, 3)}</td>
        <td>${formatNumber(stats.seSlope, 3)}</td>
        <td>${formatNumber(stats.t, 3)}</td>
        <td>${formatP(stats.p)}</td>
        <td>${formatNumber(stats.slope - z * stats.seSlope, 3)}</td>
        <td>${formatNumber(stats.slope + z * stats.seSlope, 3)}</td>
      </tr>
    `;
    return;
  }

  // Categorical predictor: one row for reference mean, then one row per non-reference contrast
  const { xGroups, reference } = extra;
  const z = normInv(1 - stats.alpha / 2);
  const levels = xGroups.levels;
  const groupStats = xGroups.groupStats;
  const refStats = groupStats.find(g => g.name === reference) || groupStats[0];
  const rows = [];

  // Reference group row: mean + CI for the mean
  const seRef = refStats.n > 0 ? refStats.sd / Math.sqrt(refStats.n) : NaN;
  rows.push({
    label: `Mean (${refStats.name}, reference)`,
    estimate: refStats.mean,
    se: seRef,
    t: null,
    p: null,
    lower: isFinite(seRef) ? refStats.mean - z * seRef : NaN,
    upper: isFinite(seRef) ? refStats.mean + z * seRef : NaN
  });

  // Non-reference contrasts: difference vs reference
  const pooledVar = xGroups.pooledVar;
  groupStats
    .filter(g => g.name !== refStats.name)
    .forEach(g => {
      const diff = g.mean - refStats.mean;
      const se = pooledVar > 0 ? Math.sqrt(pooledVar * (1 / refStats.n + 1 / g.n)) : NaN;
      const t = isFinite(se) && se > 0 ? diff / se : NaN;
      const p = isFinite(t) ? 2 * (1 - normCdf(Math.abs(t))) : NaN;
      rows.push({
        label: `${g.name} − ${refStats.name}`,
        estimate: diff,
        se,
        t,
        p,
        lower: isFinite(se) ? diff - z * se : NaN,
        upper: isFinite(se) ? diff + z * se : NaN
      });
    });

  body.innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${formatNumber(row.estimate, 3)}</td>
      <td>${row.se === null ? '–' : formatNumber(row.se, 3)}</td>
      <td>${row.t === null ? '–' : formatNumber(row.t, 3)}</td>
      <td>${row.p === null ? '–' : formatP(row.p)}</td>
      <td>${row.lower === null ? '–' : formatNumber(row.lower, 3)}</td>
      <td>${row.upper === null ? '–' : formatNumber(row.upper, 3)}</td>
    </tr>
  `).join('');
}

function writeRegressionNarratives(stats, labels, predictorType, extra = {}) {
  const apa = document.getElementById('apa-report');
  const managerial = document.getElementById('managerial-report');
  if (!apa || !managerial) return;

  const slope = formatNumber(stats.slope, 3);
  const t = formatNumber(stats.t, 2);
  const p = formatP(stats.p);
  const r2 = formatNumber(stats.rSquared, 3);
  const df = stats.df;
  const alphaLabel = formatAlpha(stats.alpha);
  const levelLabel = Math.round((1 - stats.alpha) * 100);
  const isSig = stats.p <= stats.alpha;

  if (predictorType === 'continuous') {
    const apaText = [
      `A simple linear regression was fit with ${escapeHtml(labels.y)} as the outcome and ${escapeHtml(labels.x)} as the predictor.`,
      `The slope estimate was \\hat{\\beta}_1 = ${slope}, t(${df}) = ${t}, p = ${p}, with R² = ${r2}.`,
      isSig
        ? `At α = ${alphaLabel}, the slope differs significantly from zero, indicating a reliable linear association.`
        : `At α = ${alphaLabel}, the slope does not differ significantly from zero, so the linear association is not statistically supported.`
    ].join(' ');

    const direction = stats.slope > 0 ? 'increases' : stats.slope < 0 ? 'decreases' : 'does not systematically change';
    const varianceExplained = isFinite(stats.rSquared)
      ? `${Math.round(stats.rSquared * 100)}% of the variance in ${labels.y}`
      : `a portion of the variance in ${labels.y}`;
    const decisionCue = isSig
      ? `Because the slope is statistically significant, treat this ${direction} pattern as real in your planning, while remembering that other drivers are not modeled here.`
      : `Because the slope is not statistically significant, treat the ${direction} pattern as directional only and validate it with additional data or a designed experiment before reallocating budget.`;

    const managerText = [
      `In this dataset, ${escapeHtml(labels.y)} ${direction} as ${escapeHtml(labels.x)} changes, and ${varianceExplained} is captured by this single predictor at the ${levelLabel}% confidence level.`,
      decisionCue
    ].join(' ');

    apa.textContent = apaText;
    managerial.textContent = managerText;
    return;
  }

  // Categorical predictor narrative
  const refName = extra.reference || 'reference group';
  const xGroups = extra.xGroups;
  const groupStats = xGroups?.groupStats || [];
  const refStats = groupStats.find(g => g.name === refName) || groupStats[0];
  const nonRef = groupStats.filter(g => g.name !== refStats.name);

  let strongestSentence = '';
  if (nonRef.length) {
    const strongest = nonRef.reduce((best, g) => {
      const bestDiff = best ? Math.abs(best.mean - refStats.mean) : -1;
      const thisDiff = Math.abs(g.mean - refStats.mean);
      return thisDiff > bestDiff ? g : best;
    }, null);
    if (strongest) {
      const diff = strongest.mean - refStats.mean;
      const diffLabel = formatNumber(diff, 2);
      const directionWord = diff > 0 ? 'higher' : diff < 0 ? 'lower' : 'similar';
      strongestSentence = `On average, ${escapeHtml(strongest.name)} shows ${directionWord} ${escapeHtml(labels.y)} than ${escapeHtml(refStats.name)} (difference ≈ ${diffLabel} units).`;
    }
  }

  const apaTextCat = [
    `A regression with a categorical predictor was used to compare mean ${escapeHtml(labels.y)} across levels of ${escapeHtml(labels.x)} (reference group: ${escapeHtml(refStats.name)}).`,
    `The model captured R² = ${r2}. One key contrast (see the coefficients table) was estimated as \\hat{\\beta}_1 = ${slope}, t(${df}) = ${t}, p = ${p}.`,
    isSig
      ? `At α = ${alphaLabel}, at least one group differs reliably from the reference on the outcome.`
      : `At α = ${alphaLabel}, group differences relative to the reference are not statistically reliable.`
  ].join(' ');

  const managerTextCat = [
    `In this dataset, mean ${escapeHtml(labels.y)} varies by ${escapeHtml(labels.x)} segment (reference: ${escapeHtml(refStats.name)}). ${strongestSentence}`,
    isSig
      ? 'Because at least one contrast is statistically significant, treat those segment differences as real signals when prioritizing creative, messaging, or budget across segments.'
      : 'Because the contrasts are not statistically significant, treat apparent segment differences as directional; prioritize additional data or a targeted test before making large allocation changes.'
  ].join(' ');

  apa.textContent = apaTextCat;
  managerial.textContent = managerTextCat;
}
function updateNarratives(stats, labels) {
  const apa = document.getElementById('apa-report');
  const managerial = document.getElementById('managerial-report');
  if (!apa || !managerial) return;
  const slope = formatNumber(stats.slope, 3);
  const t = formatNumber(stats.t, 2);
  const p = formatP(stats.p);
  const r2 = formatNumber(stats.rSquared, 3);
  const df = stats.df;
  const apaText = [
    `A simple linear regression was fit with ${escapeHtml(labels.y)} as the outcome and ${escapeHtml(labels.x)} as the predictor.`,
    `The slope estimate was \\hat{\\beta}_1 = ${slope}, t(${df}) = ${t}, p = ${p}, with R² = ${r2}.`,
    stats.p <= stats.alpha
      ? 'The slope differed significantly from zero at the chosen significance level.'
      : 'The slope did not differ significantly from zero at the chosen significance level.'
  ].join(' ');
  const direction = stats.slope > 0 ? 'increases' : stats.slope < 0 ? 'decreases' : 'does not systematically change';
  const managerText = [
    `In this dataset, ${escapeHtml(labels.y)} ${direction} as ${escapeHtml(labels.x)} changes.`,
    'Treat this model as a simple, teaching-focused regression: it captures the main trend but does not adjust for additional predictors or complex effects.'
  ].join(' ');
  apa.textContent = apaText;
  managerial.textContent = managerText;
}

function updateDiagnostics(stats) {
  const diagnostics = document.getElementById('diagnostics-content');
  if (!diagnostics) return;
  const items = [];
  if (stats.n < 20) {
    items.push('Sample size is modest; use caution when generalizing beyond this dataset.');
  } else {
    items.push('Sample size is reasonably large for a simple regression.');
  }
  if (stats.rSquared < 0.1) {
    items.push('R² is low; the predictor explains only a small portion of variability in the outcome.');
  } else if (stats.rSquared > 0.6) {
    items.push('R² is high; the predictor explains a substantial portion of variability. Check for influential cases.');
  } else {
    items.push('R² is moderate; the predictor explains some but not all variability in the outcome.');
  }
  diagnostics.innerHTML = `
    <ul>
      <li>Regression assumes a linear relationship, roughly constant residual variance, and approximately normal residuals.</li>
      ${items.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
    </ul>
  `;
}

function renderContinuousChart(stats, labels, xValues, yValues) {
  const chart = document.getElementById('regression-chart');
  const caption = document.getElementById('regression-caption');
  if (!chart) return;

  if (!window.Plotly || !Array.isArray(xValues) || !xValues.length) {
    chart.innerHTML = '<p class="muted">Provide raw data to see a scatterplot and fitted line.</p>';
    if (caption) caption.textContent = '';
    return;
  }

  const n = Math.min(xValues.length, yValues.length);
  const x = xValues.slice(0, n);
  const y = yValues.slice(0, n);
  const meanX = mean(x);
  const residuals = y.map((yv, i) => yv - (stats.intercept + stats.slope * x[i]));
  const s2 = variance(residuals) * (n - 1) / (n - 2); // adjust to n-2
  const s = Math.sqrt(Math.max(s2, 0));
  const Sxx = variance(x) * (n - 1);
  const tCrit = normInv(1 - stats.alpha / 2);

  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  const gridX = [];
  const gridY = [];
  const ciUpper = [];
  const ciLower = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const xv = minX + (maxX - minX) * (i / steps);
    const yHat = stats.intercept + stats.slope * xv;
    const seMean = Sxx > 0 ? s * Math.sqrt(1 / n + Math.pow(xv - meanX, 2) / Sxx) : NaN;
    gridX.push(xv);
    gridY.push(yHat);
    if (isFinite(seMean)) {
      ciUpper.push(yHat + tCrit * seMean);
      ciLower.push(yHat - tCrit * seMean);
    } else {
      ciUpper.push(yHat);
      ciLower.push(yHat);
    }
  }

  const scatterTrace = {
    x,
    y,
    mode: 'markers',
    type: 'scatter',
    name: 'Observed',
    marker: { color: '#2563eb', size: 6, opacity: 0.8 }
  };

  const lineTrace = {
    x: gridX,
    y: gridY,
    mode: 'lines',
    type: 'scatter',
    name: 'Fitted line',
    line: { color: '#ef4444', width: 3 }
  };

  const bandTrace = {
    x: [...gridX, ...gridX.slice().reverse()],
    y: [...ciUpper, ...ciLower.slice().reverse()],
    mode: 'lines',
    type: 'scatter',
    name: `${Math.round((1 - stats.alpha) * 100)}% CI (mean)`,
    fill: 'toself',
    line: { color: 'rgba(239,68,68,0.2)' },
    fillcolor: 'rgba(239,68,68,0.15)',
    hoverinfo: 'skip',
    showlegend: true
  };

  Plotly.newPlot(chart, [scatterTrace, bandTrace, lineTrace], {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: { title: labels.x },
    yaxis: { title: labels.y },
    showlegend: true
  }, { responsive: true });

  if (caption) {
    caption.textContent = `Scatterplot of ${labels.y} vs. ${labels.x} with fitted regression line and CI band.`;
  }
}

function renderCategoricalChart(stats, labels, xGroups, alpha) {
  const chart = document.getElementById('regression-chart');
  const caption = document.getElementById('regression-caption');
  if (!chart) return;

  if (!window.Plotly || !xGroups || !Array.isArray(xGroups.levels) || !xGroups.levels.length) {
    chart.innerHTML = '<p class="muted">Provide raw data with a categorical predictor to see group means.</p>';
    if (caption) caption.textContent = '';
    return;
  }

  const levels = xGroups.levels;
  const groupStats = xGroups.groupStats;
  const z = normInv(1 - alpha / 2);

  const means = groupStats.map(g => g.mean);
  const errors = groupStats.map(g => {
    const se = g.n > 0 ? g.sd / Math.sqrt(g.n) : NaN;
    return isFinite(se) ? z * se : 0;
  });

  const trace = {
    x: levels,
    y: means,
    type: 'bar',
    marker: { color: '#2563eb' },
    error_y: {
      type: 'data',
      array: errors,
      visible: true,
      color: '#1f2937',
      thickness: 1.5,
      width: 6
    },
    name: labels.y
  };

  Plotly.newPlot(chart, [trace], {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: { title: labels.x },
    yaxis: { title: labels.y },
    showlegend: false
  }, { responsive: true });

  if (caption) {
    caption.textContent = `Mean ${labels.y} by ${labels.x} category with ${Math.round((1 - alpha) * 100)}% confidence intervals.`;
  }
}

function updateResults() {
  const alphaInput = document.getElementById('alpha');
  const alphaValue = alphaInput ? parseFloat(alphaInput.value) : NaN;
  const alpha = isFinite(alphaValue) && alphaValue > 0 && alphaValue < 1 ? alphaValue : 1 - selectedConfidenceLevel;
  if (alphaInput && (!isFinite(alphaValue) || alphaValue <= 0 || alphaValue >= 1)) {
    alphaInput.value = formatAlpha(alpha);
  }

  const source = activeDataEntryMode === DataEntryModes.RAW
    ? collectRawUpload()
    : collectManualRaw();
  const { rows, labels, message } = source;
  if (message) {
    clearOutputs(message);
    return;
  }

  const predictorChoice = document.querySelector('input[name="predictor-type"]:checked')?.value || 'auto';

  // For now, treat all numeric predictors as continuous and all text predictors as categorical.
  const xRaw = rows.map(r => r.x);
  const yValues = rows.map(r => parseFloat(r.y));
  const xNumericCandidate = xRaw.map(v => {
    const parsed = parseFloat(v);
    return isFinite(parsed) && v !== '' ? parsed : NaN;
  });
  const allNumeric = xNumericCandidate.every(v => isFinite(v));

  let predictorType = 'continuous';
  if (predictorChoice === 'categorical') {
    predictorType = 'categorical';
  } else if (predictorChoice === 'continuous') {
    predictorType = 'continuous';
  } else {
    predictorType = allNumeric ? 'continuous' : 'categorical';
  }

  if (predictorType === 'continuous' && !allNumeric) {
    clearOutputs('Predictor includes non-numeric values. Switch predictor type to Categorical or clean the data.');
    return;
  }

  let xNumeric = null;
  let xGroups = null;
  let reference = null;
  let parameters = [];
  let rSquared = NaN;

  if (predictorType === 'continuous') {
    xNumeric = xNumericCandidate;
    const meanX = mean(xNumeric);
    const meanY = mean(yValues);
    const sdX = standardDeviation(xNumeric);
    const sdY = standardDeviation(yValues);
    const covXY = xNumeric.reduce((acc, xv, i) => acc + (xv - meanX) * (yValues[i] - meanY), 0) / (xNumeric.length - 1);
    const r = covXY / (sdX * sdY);
    rSquared = r * r;
  } else {
    const levelMap = new Map();
    xRaw.forEach((v, idx) => {
      const key = v || '(missing)';
      if (!levelMap.has(key)) {
        levelMap.set(key, []);
      }
      levelMap.get(key).push(yValues[idx]);
    });
    const levels = Array.from(levelMap.keys());
    if (levels.length < 2) {
      clearOutputs('Categorical predictor must have at least two distinct levels.');
      return;
    }
    levels.sort((a, b) => levelMap.get(b).length - levelMap.get(a).length);
    reference = levels[0];
    const groupStats = levels.map(name => {
      const ys = levelMap.get(name);
      return {
        name,
        n: ys.length,
        mean: mean(ys),
        sd: standardDeviation(ys)
      };
    });
    const overallMean = mean(yValues);
    const sst = yValues.reduce((acc, yv) => acc + Math.pow(yv - overallMean, 2), 0);
    const sse = groupStats.reduce((acc, g) => acc + g.sd * g.sd * (g.n - 1), 0);
    rSquared = sst > 0 ? 1 - sse / sst : NaN;

    parameters = groupStats
      .filter(g => g.name !== reference)
      .map(g => ({
        name: g.name,
        estimate: g.mean - groupStats.find(ref => ref.name === reference).mean,
        group: g
      }));

    xGroups = {
      levels,
      groupStats,
      pooledVar: sse / (yValues.length - levels.length)
    };
  }


  const df = predictorType === 'continuous'
    ? yValues.length - 2
    : yValues.length - (xGroups.levels.length);

  let slope = NaN;
  let intercept = NaN;
  let seSlope = NaN;
  let t = NaN;
  let p = NaN;
  let seRef = NaN;

  if (predictorType === 'continuous') {
    const meanX = mean(xNumeric);
    const meanY = mean(yValues);
    const sdX = standardDeviation(xNumeric);
    const sdY = standardDeviation(yValues);
    const covXY = xNumeric.reduce((acc, xv, i) => acc + (xv - meanX) * (yValues[i] - meanY), 0) / (xNumeric.length - 1);
    slope = covXY / variance(xNumeric);
    intercept = meanY - slope * meanX;
    const residuals = yValues.map((yv, i) => yv - (intercept + slope * xNumeric[i]));
    const s2 = variance(residuals);
    seSlope = Math.sqrt(s2 / ((xNumeric.length - 1) * variance(xNumeric) / (xNumeric.length - 1)));
    t = slope / seSlope;
    p = 2 * (1 - normCdf(Math.abs(t)));
  } else {
    const refIndex = xGroups.levels.indexOf(reference);
    const refStats = xGroups.groupStats[refIndex];
    intercept = refStats.mean;
    const pooledVar = xGroups.pooledVar;
    parameters.forEach(param => {
      if (param.name === xGroups.levels[1]) {
        slope = param.estimate;
        const otherStats = param.group;
        seSlope = Math.sqrt(pooledVar * (1 / refStats.n + 1 / otherStats.n));
        t = slope / seSlope;
        p = 2 * (1 - normCdf(Math.abs(t)));
      }
    });
  }

  const critical = normInv(1 - alpha / 2);
  const ciLower = slope - critical * seSlope;
  const ciUpper = slope + critical * seSlope;

  const stats = {
    n: yValues.length,
    df,
    slope,
    intercept,
    seSlope,
    t,
    p,
    rSquared,
    alpha
  };

  updateMetricsPanel(stats, predictorType, { reference });
  updateSummaryTable(stats, predictorType, { xGroups, reference });
  writeRegressionNarratives(stats, labels, predictorType, { xGroups, reference });
  updateDiagnostics(stats);
  if (predictorType === 'continuous') {
    renderContinuousChart(stats, labels, xNumeric, yValues);
  } else {
    renderCategoricalChart(stats, labels, xGroups, alpha);
  }
  modifiedDate = new Date().toLocaleDateString();
  const modifiedLabel = document.getElementById('modified-date');
  if (modifiedLabel) modifiedLabel.textContent = modifiedDate;
}

function attachInputListeners() {
  const ids = ['x-label', 'y-label', 'n', 'mean-x', 'sd-x', 'mean-y', 'sd-y', 'r'];
  ids.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', updateResults);
    }
  });
  const alphaInput = document.getElementById('alpha');
  if (alphaInput) {
    alphaInput.addEventListener('input', () => {
      const value = parseFloat(alphaInput.value);
      syncConfidenceButtonsToAlpha(value);
    });
    const initialAlpha = parseFloat(alphaInput.value);
    if (isFinite(initialAlpha)) {
      syncConfidenceButtonsToAlpha(initialAlpha, { skipUpdate: true });
    } else {
      applyConfidenceSelection(selectedConfidenceLevel, { syncAlpha: true, skipUpdate: true });
    }
  }
}

function setupConfidenceButtons() {
  document.querySelectorAll('.conf-level-btn').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const level = parseFloat(button.dataset.level);
      applyConfidenceSelection(level);
    });
  });
}

function loadContinuousExample() {
  const xLabel = document.getElementById('x-label');
  const yLabel = document.getElementById('y-label');
  if (xLabel) xLabel.value = 'Weekly ad spend (k$)';
  if (yLabel) yLabel.value = 'Weekly revenue (k$)';

  const continuousRadio = document.querySelector('input[name="predictor-type"][value="continuous"]');
  if (continuousRadio) continuousRadio.checked = true;

  const exampleRows = [
    { x: '10', y: '40' },
    { x: '12', y: '48' },
    { x: '14', y: '55' },
    { x: '16', y: '63' },
    { x: '18', y: '70' },
    { x: '20', y: '78' },
    { x: '22', y: '85' },
    { x: '24', y: '92' },
    { x: '26', y: '100' },
    { x: '28', y: '108' },
    { x: '30', y: '115' },
    { x: '32', y: '122' },
    { x: '34', y: '130' },
    { x: '36', y: '139' },
    { x: '38', y: '146' }
  ];

  setManualRowCount(exampleRows.length, { preserveValues: false });
  const tbody = document.getElementById('regression-table-body');
  if (!tbody) return;
  Array.from(tbody.querySelectorAll('tr')).forEach((row, index) => {
    const example = exampleRows[index];
    const xInput = row.querySelector('.manual-x');
    const yInput = row.querySelector('.manual-y');
    if (!example) {
      if (xInput) xInput.value = '';
      if (yInput) yInput.value = '';
    } else {
      if (xInput) xInput.value = example.x;
      if (yInput) yInput.value = example.y;
    }
  });
  updateResults();
}

function loadCategoricalExample() {
  const xLabel = document.getElementById('x-label');
  const yLabel = document.getElementById('y-label');
  if (xLabel) xLabel.value = 'Channel';
  if (yLabel) yLabel.value = 'Revenue per user';

  const categoricalRadio = document.querySelector('input[name="predictor-type"][value="categorical"]');
  if (categoricalRadio) categoricalRadio.checked = true;

  const exampleRows = [
    { x: 'Search', y: '42' },
    { x: 'Search', y: '40' },
    { x: 'Search', y: '38' },
    { x: 'Search', y: '45' },
    { x: 'Search', y: '44' },
    { x: 'Social', y: '36' },
    { x: 'Social', y: '39' },
    { x: 'Social', y: '37' },
    { x: 'Social', y: '35' },
    { x: 'Email', y: '48' },
    { x: 'Email', y: '50' },
    { x: 'Email', y: '47' },
    { x: 'Email', y: '49' }
  ];

  setManualRowCount(exampleRows.length, { preserveValues: false });
  const tbody = document.getElementById('regression-table-body');
  if (!tbody) return;
  Array.from(tbody.querySelectorAll('tr')).forEach((row, index) => {
    const example = exampleRows[index];
    const xInput = row.querySelector('.manual-x');
    const yInput = row.querySelector('.manual-y');
    if (!example) {
      if (xInput) xInput.value = '';
      if (yInput) yInput.value = '';
    } else {
      if (xInput) xInput.value = example.x;
      if (yInput) yInput.value = example.y;
    }
  });
  updateResults();
}

document.addEventListener('DOMContentLoaded', () => {
  const createdLabel = document.getElementById('created-date');
  const modifiedLabel = document.getElementById('modified-date');
  if (createdLabel) createdLabel.textContent = CREATED_DATE;
  if (modifiedLabel) modifiedLabel.textContent = modifiedDate;

  const scenarioContainer = document.getElementById('scenario-description');
  if (scenarioContainer) {
    defaultScenarioDescription = scenarioContainer.innerHTML;
  }

  setupDataEntryModeToggle();
  setupConfidenceButtons();
  setupScenarioSelector();
  setupRawUpload();
  attachInputListeners();
  setupManualControls();
  const exampleCont = document.getElementById('example-continuous');
  if (exampleCont) {
    exampleCont.addEventListener('click', loadContinuousExample);
  }
  const exampleCat = document.getElementById('example-categorical');
  if (exampleCat) {
    exampleCat.addEventListener('click', loadCategoricalExample);
  }
  clearOutputs('Enter paired predictor/outcome values or upload a raw file to fit a regression line.');
});
