// Bivariate Linear Regression Tool – minimal first version

// Tool identifier for tracking
const TOOL_SLUG = 'bivariate-regression';
const CREATED_DATE = new Date('2025-11-16').toLocaleDateString();
let modifiedDate = new Date().toLocaleDateString();

// Debouncing for auto-run tracking
let renderCount = 0;
let lastTrackTime = 0;

let selectedConfidenceLevel = 0.95;

const DataEntryModes = Object.freeze({
  MANUAL: 'manual',
  RAW: 'raw-upload'
});

const MAX_MANUAL_ROWS = 50;
let manualRowCount = 4;
let activeDataEntryMode = DataEntryModes.RAW;

// Advanced analysis settings
let hypothesisTail = 'two-sided'; // 'two-sided' | 'greater' | 'less'
let showStandardizedSlope = false;
let trimOutliers = false;
let transformX = false;
let transformY = false;
let activeReferenceLevel = null;

let isSwapped = false;
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

function setPredictorWarning(elementId, message = '') {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.style.display = 'block';
  } else {
    el.textContent = '';
    el.style.display = 'none';
  }
}

function setManualCategoricalLock(disabled, reason = '') {
  const catRadio = document.querySelector('input[name="predictor-type"][value="categorical"]');
  if (!catRadio) return;
  const fallback = document.querySelector('input[name="predictor-type"][value="continuous"]');
  catRadio.disabled = !!disabled;
  catRadio.title = disabled ? reason : '';
  if (disabled && catRadio.checked && fallback) {
    fallback.checked = true;
  }
}

function setUploadCategoricalLock(disabled, reason = '') {
  const select = document.getElementById('upload-predictor-type');
  if (!select) return;
  const catOption = Array.from(select.options).find(opt => opt.value === 'categorical');
  if (!catOption) return;
  catOption.disabled = !!disabled;
  select.title = disabled ? reason : '';
  if (disabled && select.value === 'categorical') {
    // Fall back to continuous if available, otherwise auto.
    const hasContinuous = Array.from(select.options).some(opt => opt.value === 'continuous' && !opt.disabled);
    select.value = hasContinuous ? 'continuous' : 'auto';
  }
}

function formatNumber(v, digits = 3) {
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

function median(values) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function formatP(p) {
  if (!Number.isFinite(p)) return '—';
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
    updateResults();
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
    updateResults();
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
    isSwapped = false; // Reset swap state on mode change
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
          if (activeScenarioDataset) {
            abandonScenarioDataset();
          }
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
      if (activeScenarioDataset) {
        abandonScenarioDataset();
      }
      updateResults();
    });
  }
  setManualRowCount(manualRowCount, { preserveValues: false });
}

function collectManualRaw() { // eslint-disable-line no-unused-vars
  const tbody = document.getElementById('regression-table-body');
  const rows = [];
  if (!tbody) return { rows, labels: {}, message: 'No manual table found.' };

  const xName = document.getElementById('x-column-select')?.value || 'Predictor';
  const yName = document.getElementById('y-column-select')?.value || 'Outcome';

  const finalLabels = { x: xName, y: yName };

  Array.from(tbody.querySelectorAll('tr')).forEach(row => {
    const xInput = row.querySelector('.manual-x');
    const yInput = row.querySelector('.manual-y');
    const rawX = xInput ? xInput.value.trim() : '';
    const yStr = yInput ? yInput.value.trim() : '';
    if (!rawX && !yStr) return;

    const xVal = rawX;
    const yVal = yStr !== '' ? parseFloat(yStr) : NaN;

    if (isSwapped) {
      // When swapped, the original Y becomes X, and X becomes Y.
      // Y must be numeric, so we parse original X as a number.
      rows.push({ x: yVal, y: parseFloat(xVal) });
    } else {
      rows.push({ x: xVal, y: yVal });
    }
  });

  if (!rows.length) {
    return { rows, labels: { x: xName, y: yName }, message: 'Enter at least three paired observations.' };
  }
  if (rows.length < 3) {
    return { rows, labels: { x: xName, y: yName }, message: 'At least three paired observations are required.' };
  }
  const invalid = rows.find((r, idx) => !isFinite(r.y));
  if (invalid) {
    return { rows, labels: finalLabels, message: 'All outcome (Y) values must be numeric.' };
  }
  return { rows, labels: finalLabels, message: null };
}

function setRawUploadStatus(message, status = '', { isHtml = true } = {}) {
    const statusEl = document.getElementById('raw-upload-status');
    if (!statusEl) return;
    if (isHtml) { statusEl.innerHTML = message; } else { statusEl.textContent = message; }
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
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));

  if (headers.length < 2) {
    throw new Error('File must have at least two columns with headers.');
  }
  let labels = {
    x: headers[0] || 'Predictor',
    y: headers[1] || 'Outcome'
  };
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
    const rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = parts[index];
    });
    rows.push(rowData);

    if (rows.length > RAW_UPLOAD_LIMIT) {
      throw new Error(`Upload limit exceeded: Only ${RAW_UPLOAD_LIMIT} row(s) are supported per file.`);
    }
  }

  if (!rows.length) {
    throw new Error(errors.length ? errors[0] : 'No valid rows found in the file.');
  }
  return { headers, rows, warnings: errors };
}

  function importRawData(text, { isFromScenario = false, filename = 'uploaded_file.csv' } = {}) {
      try {
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
          let totalRowsForStatus = Array.isArray(parsed.rows) ? parsed.rows.length : 0;
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
                      uploadedRawData = null;
                      setRawUploadStatus('Upload cancelled because some rows had missing values.', 'error', { isHtml: false });
                      return;
                  }
                  parsed.rows = completeRows;
                  totalRowsForStatus = totalRows;
              }
          }
          // Detect constant columns (no variation) so they can be excluded from analysis.
          let constantColumns = [];
          if (typeof detectConstantColumns === 'function' && Array.isArray(parsed.rows) && parsed.rows.length) {
            const constants = detectConstantColumns(parsed.headers, parsed.rows);
            constantColumns = Array.isArray(constants) ? constants.map(c => c.header) : [];
          }
          uploadedRawData = {
            headers: parsed.headers,
            rows: parsed.rows
          };
  
          // Build the detailed feedback message
          const { headers, rows } = parsed;
          const rowCount = rows.length;
        const defaultPredictor = headers[0];
        const defaultOutcome = headers[1];

        // Infer default predictor type
        const predictorValues = rows.map(r => r[defaultPredictor]);
        const isPredictorNumeric = predictorValues.every(v => v === '' || v === null || v === undefined || isFinite(parseFloat(v)));
        const predictorType = isPredictorNumeric ? 'continuous' : 'categorical';

          const messageParts = [
            `Loaded ${rowCount} observations with headers: <strong>${headers.join(', ')}</strong>.`,
            `Defaulting to <strong>${defaultPredictor}</strong> as the Predictor (X) and <strong>${defaultOutcome}</strong> as the Outcome (Y).`,
            `The predictor is being treated as <strong>${predictorType}</strong> by default.`
          ];

          const skippedNote = parsed.warnings.length ? ` Skipped ${parsed.warnings.length} row(s).` : '';
          let finalMessage = `${messageParts.join('<br>')}${skippedNote}`;
          if (totalRowsForStatus && totalRowsForStatus > rowCount) {
              finalMessage += ` Using ${rowCount} of ${totalRowsForStatus} observations (rows with missing or invalid values were excluded).`;
          }
          if (constantColumns.length) {
            finalMessage += ` Constant column(s) were detected and will not be used as predictors because they have no variation: <strong>${constantColumns.join(', ')}</strong>.`;
          }

        setRawUploadStatus(finalMessage, 'success');
        
        // Track data upload for engagement
        if (typeof markDataUploaded === 'function' && !isFromScenario) {
            markDataUploaded(filename || 'uploaded_file.csv');
        }

        // If called from a scenario, force the mode to RAW and update.
        if (isFromScenario || activeDataEntryMode !== DataEntryModes.RAW) {
            setDataEntryMode(DataEntryModes.RAW);
        } else {
            updateResults();
        }
  } catch (error) {
    uploadedRawData = null;
    setRawUploadStatus(error.message || 'Unable to load the file.', 'error', { isHtml: false });
    throw error;
  }
}

function handleRawFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    try {
      importRawData(event.target.result, { filename: file.name });
    } catch {
      // Errors are surfaced via status text.
    }
  };
  reader.onerror = () => setRawUploadStatus('Unable to read the file.', 'error');
  reader.readAsText(file);
}

function setupRawUpload() {
  const templateButton = document.getElementById('raw-template-download');

  if (!window.UIUtils || typeof window.UIUtils.initDropzone !== 'function') {
    setRawUploadStatus('Upload helper not available. Please refresh the page.', 'error', { isHtml: false });
    return;
  }

  window.UIUtils.initDropzone({
    dropzoneId: 'raw-dropzone',
    inputId: 'raw-input',
    browseId: 'raw-browse',
    accept: '.csv,.tsv,.txt',
    onFile: handleRawFile,
    onError: message => {
      if (message) setRawUploadStatus(message, 'error', { isHtml: false });
    }
  });

  if (templateButton) {
    templateButton.addEventListener('click', () => {
      const content = 'Predictor,Outcome\nSegment A,12.5\nSegment B,14.2\nSegment C,11.8\nSegment D,15.1\n';
      downloadTextFile('regression_raw_template.csv', content);
    });
  }

  setRawUploadStatus('No raw file uploaded.', '', { isHtml: false });
}

  function collectRawUpload() {
  if (!uploadedRawData || !Array.isArray(uploadedRawData.rows) || !uploadedRawData.rows.length) {
    return {
      rows: [],
      labels: {},
      message: 'Upload a raw data file with at least three paired rows.'
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
    'metric-pmodel',
    'metric-rmse',
    'metric-mae',
    'metric-resse',
    'metric-decision'
  ];
  const summaryBody = document.getElementById('summary-table-body');
  const numericSummaryBody = document.getElementById('numeric-summary-body');
  const categoricalSummaryBody = document.getElementById('categorical-summary-body');
  const diagnostics = document.getElementById('diagnostics-content');
  const actualFittedCaption = document.getElementById('actual-fitted-caption');
  const residualsCaption = document.getElementById('residuals-caption');
  const actualFittedChart = document.getElementById('actual-fitted-chart');
  const residualsChart = document.getElementById('residuals-chart');
  const effectChart = document.getElementById('effect-chart');
  const effectCaption = document.getElementById('effect-caption');
  const effectInterpretation = document.getElementById('effect-interpretation');
  const equation = document.getElementById('regression-equation-output');
  const summaryCard = document.querySelector('.summary-stats-card');

  if (actualFittedCaption) actualFittedCaption.textContent = '';
  if (residualsCaption) residualsCaption.textContent = '';
  if (effectCaption) effectCaption.textContent = '';
  if (effectInterpretation) effectInterpretation.textContent = '';
  if (actualFittedChart && window.Plotly) Plotly.purge(actualFittedChart);
  if (residualsChart && window.Plotly) Plotly.purge(residualsChart);
  if (effectChart && window.Plotly) Plotly.purge(effectChart);
  if (apa) apa.textContent = '';
  if (managerial) managerial.textContent = '';
  metrics.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
  if (summaryBody) {
    summaryBody.innerHTML = `<tr><td colspan="8">${escapeHtml(message)}</td></tr>`;
  }
  if (numericSummaryBody) {
    numericSummaryBody.innerHTML = `<tr><td colspan="6">${escapeHtml(message)}</td></tr>`;
  }
  if (categoricalSummaryBody) {
    categoricalSummaryBody.innerHTML = `<tr><td colspan="3">${escapeHtml(message)}</td></tr>`;
  }
  if (summaryCard) {
    summaryCard.style.display = 'none';
  }
  if (diagnostics) {
    diagnostics.innerHTML = '<p class="muted">Run an analysis to populate diagnostics.</p>';
  }
  if (equation) {
    equation.textContent = 'Provide data to see the fitted regression equation.';
  }
  setPredictorWarning('predictor-type-warning', '');
  setPredictorWarning('upload-predictor-type-warning', '');
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

function updateColumnSelectors(headers, columnData) {
  const xSelect = document.getElementById('x-column-select');
  const ySelect = document.getElementById('y-column-select');
  if (!xSelect || !ySelect) return;

  const currentX = xSelect.value;
  const currentY = ySelect.value;

  xSelect.innerHTML = '';
  ySelect.innerHTML = '';

  headers.forEach(header => {
    const isNumeric = columnData[header].isNumeric;
    const xOption = document.createElement('option');
    xOption.value = header;
    xOption.textContent = header;
    xSelect.appendChild(xOption);

    const yOption = document.createElement('option');
    yOption.value = header;
    yOption.textContent = header;
    if (!isNumeric) {
      yOption.disabled = true;
      yOption.textContent += ' (non-numeric)';
    }
    ySelect.appendChild(yOption);
  });

  // Restore selection or set defaults
  xSelect.value = headers.includes(currentX) ? currentX : headers[0];
  let yDefault = headers[1] || headers[0];
  if (xSelect.value === yDefault && headers.length > 1) {
    yDefault = headers[0];
  }
  ySelect.value = headers.includes(currentY) && !ySelect.options[ySelect.selectedIndex].disabled ? currentY : yDefault;

  // Ensure X and Y are different if possible
  if (xSelect.value === ySelect.value && headers.length > 1) {
    const ySelectedIndex = Array.from(ySelect.options).findIndex(opt => opt.value === ySelect.value);
    const nextIndex = (ySelectedIndex + 1) % headers.length;
    if (!ySelect.options[nextIndex].disabled) {
      ySelect.selectedIndex = nextIndex;
    } else if (ySelectedIndex > 0 && !ySelect.options[ySelectedIndex - 1].disabled) {
      ySelect.selectedIndex = ySelectedIndex - 1;
    }
  }

  xSelect.dispatchEvent(new Event('change', { bubbles: true }));
  ySelect.dispatchEvent(new Event('change', { bubbles: true }));
}

function renderReferenceSelector(xGroups, reference, labels) {
  const container = document.getElementById('reference-selector');
  const select = document.getElementById('reference-level-select');
  if (!container || !select) return;
  if (!xGroups || !Array.isArray(xGroups.levels) || !xGroups.levels.length) {
    container.style.display = 'none';
    select.innerHTML = '';
    return;
  }
  container.style.display = '';
  const levels = xGroups.levels;
  const currentRef = reference && levels.includes(reference) ? reference : levels[0];
  select.innerHTML = '';
  levels.forEach(level => {
    const option = document.createElement('option');
    option.value = level;
    option.textContent = level;
    if (level === currentRef) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  select.onchange = () => {
    const value = select.value;
    if (value && levels.includes(value)) {
      activeReferenceLevel = value;
      updateResults();
    }
  };
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
    if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
      const body = Array.isArray(description) ? description.join('\n\n') : description;
      window.UIUtils.renderScenarioDescription({
        containerId: 'scenario-description',
        title,
        description: body,
        defaultHtml: defaultScenarioDescription
      });
      return;
    }
    const container = document.getElementById('scenario-description');
    if (!container) return;
    container.innerHTML = defaultScenarioDescription || '';
  }

function abandonScenarioDataset() {
  if (!activeScenarioDataset) return;
  const select = document.getElementById('scenario-select');
  if (select) {
    select.value = '';
  }
  renderScenarioDescription('', []);
  enableScenarioDownload(null);
}

function finalizeManualEntry() {
  abandonScenarioDataset();
  setDataEntryMode(DataEntryModes.MANUAL);
  updateResults();
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
    
    // Track scenario loading for engagement
    if (typeof markScenarioLoaded === 'function') {
        markScenarioLoaded(scenario.label);
    }

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
        importRawData(csvText, { isFromScenario: true, filename });
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
  if (predictorType === 'continuous' && showStandardizedSlope && Number.isFinite(stats.stdSlope)) {
    const rawText = formatNumber(stats.slope, 3);
    const stdText = formatNumber(stats.stdSlope, 3);
    set('metric-slope', `${rawText} (β* = ${stdText})`);
  } else {
    set('metric-slope', formatNumber(stats.slope, 3));
  }
  set('metric-intercept', formatNumber(stats.intercept, 3));
  set('metric-r2', formatNumber(stats.rSquared, 3));
  set('metric-t', formatNumber(stats.t, 3));
  set('metric-pvalue', formatP(stats.p));
  set('metric-pmodel', formatP(stats.modelP ?? stats.p));
  set('metric-rmse', formatNumber(stats.rmse, 4));
  set('metric-mae', formatNumber(stats.mae, 4));
  set('metric-resse', formatNumber(stats.residualSE, 4));
  const decision = stats.p <= stats.alpha
    ? `Reject H0 at alpha = ${formatAlpha(stats.alpha)}`
    : `Fail to reject H0 at alpha = ${formatAlpha(stats.alpha)}`;
  set('metric-decision', decision);
}

function updateSummaryTable(stats, predictorType, extra = {}) {
  const body = document.getElementById('summary-table-body');
  const lowerHeader = document.getElementById('summary-ci-lower-header');
  const upperHeader = document.getElementById('summary-ci-upper-header');
  const ciNote = document.getElementById('summary-ci-note');
  const labels = extra.labels || {};
  if (!body) return;

  if (lowerHeader && upperHeader && isFinite(stats.alpha)) {
    const level = Math.round((1 - stats.alpha) * 100);
    lowerHeader.textContent = `Lower Bound (${level}% CI)`;
    upperHeader.textContent = `Upper Bound (${level}% CI)`;
    if (ciNote) {
      ciNote.textContent = `Confidence bounds shown at approximately ${level}% (alpha = ${formatAlpha(stats.alpha)}).`;
    }
  }
  if (predictorType !== 'categorical' || !extra.xGroups) {
    body.innerHTML = `
      <tr>
        <td>Intercept</td>
        <td></td>
        <td>${formatNumber(stats.intercept, 3)}</td>
        <td>${Number.isFinite(stats.seIntercept) ? formatNumber(stats.seIntercept, 3) : '—'}</td>
        <td>${Number.isFinite(stats.tIntercept) ? formatNumber(stats.tIntercept, 3) : '—'}</td>
        <td>${Number.isFinite(stats.pIntercept) ? formatP(stats.pIntercept) : '—'}</td>
        <td>${Number.isFinite(stats.interceptCiLower) ? formatNumber(stats.interceptCiLower, 3) : '—'}</td>
        <td>${Number.isFinite(stats.interceptCiUpper) ? formatNumber(stats.interceptCiUpper, 3) : '—'}</td>
      </tr>
      <tr>
        <td>${escapeHtml(labels.x || 'Predictor')}</td>
        <td></td>
        <td>${formatNumber(stats.slope, 3)}</td>
        <td>${formatNumber(stats.seSlope, 3)}</td>
        <td>${formatNumber(stats.t, 3)}</td>
        <td>${formatP(stats.p)}</td>
        <td>${Number.isFinite(stats.slopeCiLower) ? formatNumber(stats.slopeCiLower, 3) : '—'}</td>
        <td>${Number.isFinite(stats.slopeCiUpper) ? formatNumber(stats.slopeCiUpper, 3) : '—'}</td>
      </tr>
    `;
    return;
  }

  // Categorical predictor: one row for reference mean, then one row per non-reference contrast
  const { xGroups, reference } = extra;
  const z = StatsUtils.normInv(1 - stats.alpha / 2);
  const levels = xGroups.levels;
  const groupStats = xGroups.groupStats;
  const refStats = groupStats.find(g => g.name === reference) || groupStats[0];
  const rows = [];

  // Reference group row: mean + CI for the mean
  const seRef = refStats.n > 0 ? refStats.sd / Math.sqrt(refStats.n) : NaN;
  rows.push({
    predictor: `${escapeHtml(labels.x || 'Predictor')} (ref="${escapeHtml(refStats.name)}")`,
    level: `${refStats.name}`,
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
      const p = isFinite(t) ? 2 * (1 - StatsUtils.normCdf(Math.abs(t))) : NaN;
      rows.push({
        predictor: `${escapeHtml(labels.x || 'Predictor')} (ref="${escapeHtml(refStats.name)}")`,
        level: g.name,
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
      <td>${row.predictor}</td>
      <td>${escapeHtml(row.level || '')}</td>
      <td>${formatNumber(row.estimate, 3)}</td>
      <td>${row.se === null ? '—' : formatNumber(row.se, 3)}</td>
      <td>${row.t === null ? '—' : formatNumber(row.t, 3)}</td>
      <td>${row.p === null ? '—' : formatP(row.p)}</td>
      <td>${row.lower === null ? '—' : formatNumber(row.lower, 3)}</td>
      <td>${row.upper === null ? '—' : formatNumber(row.upper, 3)}</td>
    </tr>
  `).join('');
}

function renderCoefInterpretation(stats, predictorType, labels, { reference, parameters, xGroups }) {
  const container = document.getElementById('coef-interpretation');
  if (!container) return;
  if (!Number.isFinite(stats.slope)) {
    container.textContent = 'Run the analysis to see coefficient interpretations.';
    return;
  }

  const level = Math.round((1 - stats.alpha) * 100);
  if (predictorType === 'continuous') {
    const slopeText = formatNumber(stats.slope, 3);
    const lower = formatNumber(stats.slope - StatsUtils.normInv(1 - stats.alpha / 2) * stats.seSlope, 3);
    const upper = formatNumber(stats.slope + StatsUtils.normInv(1 - stats.alpha / 2) * stats.seSlope, 3);
    container.innerHTML = `
      <p><strong>${escapeHtml(labels.x)} slope:</strong> Each one-unit increase in ${escapeHtml(labels.x)} is associated with a ${slopeText} change in ${escapeHtml(labels.y)}, on average.</p>
      <p><strong>${level}% CI:</strong> We are ${level}% confident the true slope lies between ${lower} and ${upper}. If this range excludes 0, the effect is statistically reliable at alpha = ${formatAlpha(stats.alpha)}.</p>
      <p><strong>Example:</strong> If ${escapeHtml(labels.x)} goes up by 5 units, predicted ${escapeHtml(labels.y)} changes by about ${formatNumber(stats.slope * 5, 3)} (5 x ${slopeText}).</p>
    `;
  } else {
    const refName = reference || (xGroups?.levels ? xGroups.levels[0] : 'reference');
    const contrasts = (parameters || []).map(p => ({
      level: p.name,
      diff: p.estimate
    }));
    const strongest = contrasts.reduce((best, cur) => {
      if (!best) return cur;
      return Math.abs(cur.diff) > Math.abs(best.diff) ? cur : best;
    }, null);
    const ciZ = StatsUtils.normInv(1 - stats.alpha / 2);
    const example = strongest
      ? `Compared to ${escapeHtml(refName)}, ${escapeHtml(strongest.level)} differs by about ${formatNumber(strongest.diff, 3)} on ${escapeHtml(labels.y)}.`
      : 'Each non-reference level compares its mean outcome to the reference group.';
    const ciNote = strongest
      ? `If its ${level}% CI around that difference excludes 0, the difference is statistically reliable.`
      : '';
    container.innerHTML = `
      <p><strong>Reference group:</strong> ${escapeHtml(refName)} (intercept equals its mean ${escapeHtml(labels.y)}).</p>
      <p><strong>Other levels:</strong> Each row shows the mean difference vs. ${escapeHtml(refName)}. A positive value means higher ${escapeHtml(labels.y)} than the reference; negative means lower.</p>
      <p><strong>Example:</strong> ${example} ${ciNote}</p>
    `;
  }
}

function renderSummaryStatistics({ numericRows = [], categoricalRows = [] }) {
  const numericBody = document.getElementById('numeric-summary-body');
  const categoricalBody = document.getElementById('categorical-summary-body');
  const summaryCard = document.querySelector('.summary-stats-card');
  const hasNumeric = numericRows.length > 0;
  const hasCategorical = categoricalRows.length > 0;
  const shouldShow = hasNumeric || hasCategorical;
  if (summaryCard) {
    summaryCard.style.display = shouldShow ? '' : 'none';
  }
  if (numericBody) {
    if (!hasNumeric) {
      numericBody.innerHTML = '<tr><td colspan="6">Provide data to see numeric summaries.</td></tr>';
    } else {
      numericBody.innerHTML = numericRows.map(row => `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td>${formatNumber(row.mean, 3)}</td>
          <td>${formatNumber(row.median, 3)}</td>
          <td>${formatNumber(row.sd, 3)}</td>
          <td>${formatNumber(row.min, 3)}</td>
          <td>${formatNumber(row.max, 3)}</td>
        </tr>
      `).join('');
    }
  }
  if (categoricalBody) {
    if (!hasCategorical) {
      categoricalBody.innerHTML = '<tr><td colspan="3">Provide data to see level percentages.</td></tr>';
    } else {
      categoricalBody.innerHTML = categoricalRows.map(row => `
        <tr>
          <td>${escapeHtml(row.predictor)}</td>
          <td>${escapeHtml(row.level)}</td>
          <td>${formatNumber(row.percent, 1)}%</td>
        </tr>
      `).join('');
    }
  }
}

function writeRegressionNarratives(stats, labels, predictorType, extra = {}) {
  const apa = document.getElementById('apa-report');
  const managerial = document.getElementById('managerial-report');
  if (!apa || !managerial) return;

  const slopeText = formatNumber(stats.slope, 3);
  const tText = formatNumber(stats.t, 2);
  const r2Text = formatNumber(stats.rSquared, 3);
  const df = stats.df;
  const alphaLabel = formatAlpha(stats.alpha);
  const levelLabel = Math.round((1 - stats.alpha) * 100);
  const isSig = isFinite(stats.p) && stats.p <= stats.alpha;
  const zCrit = (window.StatsUtils && typeof StatsUtils.normInv === 'function')
    ? StatsUtils.normInv(1 - stats.alpha / 2)
    : NaN;

  let pText;
  if (!isFinite(stats.p)) {
    pText = 'p = n/a';
  } else if (stats.p < 0.0001) {
    pText = 'p < .0001';
  } else {
    pText = `p = ${stats.p.toFixed(3)}`;
  }

  if (predictorType === 'continuous') {
    let ciLower = NaN;
    let ciUpper = NaN;
    if (isFinite(stats.seSlope) && isFinite(zCrit)) {
      ciLower = stats.slope - zCrit * stats.seSlope;
      ciUpper = stats.slope + zCrit * stats.seSlope;
    }
    const ciText = isFinite(ciLower) && isFinite(ciUpper)
      ? `${levelLabel}% CI [${formatNumber(ciLower, 3)}, ${formatNumber(ciUpper, 3)}]`
      : `${levelLabel}% CI [n/a, n/a]`;

    let tailLabel = 'two-sided';
    if (hypothesisTail === 'greater') {
      tailLabel = 'one-sided (H₁: slope > 0)';
    } else if (hypothesisTail === 'less') {
      tailLabel = 'one-sided (H₁: slope < 0)';
    }

    const apaText = [
      `A simple linear regression was fit with ${escapeHtml(labels.y)} as the outcome and ${escapeHtml(labels.x)} as the predictor.`,
      `The slope estimate was b₁ = ${slopeText}, t(${df}) = ${tText}, ${pText}, R² = ${r2Text}, ${ciText}.`,
      `The test used a ${tailLabel} hypothesis at α = ${alphaLabel}.`,
      isSig
        ? 'The slope differs significantly from zero, indicating a statistically reliable linear association between the predictor and outcome.'
        : 'The slope does not differ significantly from zero, so the linear association is not statistically supported at this α level.'
    ].join(' ');

    const direction = stats.slope > 0 ? 'increases' : stats.slope < 0 ? 'decreases' : 'does not systematically change';
    const varianceExplained = isFinite(stats.rSquared)
      ? `${Math.round(stats.rSquared * 100)}% of the variance in ${labels.y}`
      : `a portion of the variance in ${labels.y}`;

    let magnitudeNote = '';
    if (isFinite(stats.stdSlope)) {
      const absStd = Math.abs(stats.stdSlope);
      let descriptor = 'small';
      if (absStd < 0.1) descriptor = 'negligible';
      else if (absStd < 0.3) descriptor = 'small';
      else if (absStd < 0.5) descriptor = 'moderate';
      else descriptor = 'large';
      magnitudeNote = ` On a standardized scale this corresponds to a ${descriptor} effect (β* ≈ ${formatNumber(stats.stdSlope, 3)}).`;
    }

    const decisionCue = isSig
      ? `Because the slope is statistically significant, treat this ${direction} pattern as real in your planning, while remembering that other drivers are not modeled here.`
      : `Because the slope is not statistically significant, treat the ${direction} pattern as directional only and validate it with additional data or a designed experiment before reallocating budget.`;

    const managerText = [
      `In this dataset, ${escapeHtml(labels.y)} ${direction} as ${escapeHtml(labels.x)} changes, and ${varianceExplained} is captured by this single predictor at the ${levelLabel}% confidence level.${magnitudeNote}`,
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
      strongestSentence = `On average, ${escapeHtml(strongest.name)} shows ${directionWord} ${escapeHtml(labels.y)} than ${escapeHtml(refStats.name)} (difference of about ${diffLabel} units).`;
    }
  }

  let ciSlopeLower = NaN;
  let ciSlopeUpper = NaN;
  if (isFinite(stats.seSlope) && isFinite(zCrit)) {
    ciSlopeLower = stats.slope - zCrit * stats.seSlope;
    ciSlopeUpper = stats.slope + zCrit * stats.seSlope;
  }
  const ciSlopeText = isFinite(ciSlopeLower) && isFinite(ciSlopeUpper)
    ? `${levelLabel}% CI for the focal contrast: [${formatNumber(ciSlopeLower, 3)}, ${formatNumber(ciSlopeUpper, 3)}].`
    : '';

  const apaTextCat = [
    `A regression with a categorical predictor was used to compare mean ${escapeHtml(labels.y)} across levels of ${escapeHtml(labels.x)} (reference group: ${escapeHtml(refStats.name)}).`,
    `The model captured R² = ${r2Text}. One key contrast (see the coefficients table) was estimated as b₁ = ${slopeText}, t(${df}) = ${tText}, ${pText}. ${ciSlopeText}`,
    isSig
      ? `At alpha = ${alphaLabel}, at least one group differs reliably from the reference on the outcome.`
      : `At alpha = ${alphaLabel}, group differences relative to the reference are not statistically reliable.`
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

function updateRegressionDiagnostics(stats, predictorType, warnings = {}) {
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
  if (Number.isFinite(warnings.rowsDroppedForAdvanced) && warnings.rowsDroppedForAdvanced > 0) {
    const dropped = warnings.rowsDroppedForAdvanced;
    const trimmedNote = trimOutliers ? 'after trimming extreme outliers and/or applying log transforms' : 'after applying log transforms';
    items.push(`${dropped} observation(s) were excluded ${trimmedNote}. Interpret results in light of the smaller effective sample size.`);
  }
  diagnostics.innerHTML = `
    <ul>
      <li>Regression assumes a linear relationship, roughly constant residual variance, and approximately normal residuals.</li>
      ${items.map(t => `<li>${t}</li>`).join('')}
    </ul>
  `;
}

function renderRegressionNarratives(stats, labels, predictorType, extra = {}) {
  writeRegressionNarratives(stats, labels, predictorType, extra);
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
  const meanX = StatsUtils.mean(x);
  const residuals = y.map((yv, i) => yv - (stats.intercept + stats.slope * x[i]));
  const s2 = StatsUtils.variance(residuals) * (n - 1) / (n - 2); // adjust to n-2
  const s = Math.sqrt(Math.max(s2, 0));
  const Sxx = StatsUtils.variance(x) * (n - 1);
  const tCrit = StatsUtils.normInv(1 - stats.alpha / 2);

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
  const z = StatsUtils.normInv(1 - alpha / 2);

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

function renderActualFittedChart(fitted, actual, labels) {
  const chart = document.getElementById('actual-fitted-chart');
  const caption = document.getElementById('actual-fitted-caption');
  if (!chart || !Array.isArray(fitted) || !fitted.length) return;

  const points = fitted.map((f, i) => ({ fitted: f, actual: actual[i] }));
  const scatter = {
    x: points.map(p => p.fitted),
    y: points.map(p => p.actual),
    mode: 'markers',
    type: 'scatter',
    marker: { color: '#2563eb', size: 8, opacity: 0.85 },
    name: 'Cases'
  };
  const minFitted = Math.min(...points.map(p => p.fitted));
  const maxFitted = Math.max(...points.map(p => p.fitted));
  const minActual = Math.min(...points.map(p => p.actual));
  const maxActual = Math.max(...points.map(p => p.actual));
  const line = {
    x: [minFitted, maxFitted],
    y: [minFitted, maxFitted],
    mode: 'lines',
    line: { color: '#9ca3af', width: 2, dash: 'dash' },
    name: '45° line'
  };

  Plotly.newPlot(chart, [scatter, line], {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: {
      title: `Fitted (predicted) ${labels.y}`,
      range: [minFitted, maxFitted]
    },
    yaxis: {
      title: `Actual ${labels.y}`,
      range: [minActual, maxActual]
    },
    showlegend: false
  }, { responsive: true });

  if (caption) {
    caption.textContent = `Actual vs. fitted ${labels.y}; points near the 45° line indicate closer predictions.`;
  }
}

function renderResidualsChart(fitted, residuals, labels) {
  const chart = document.getElementById('residuals-chart');
  const caption = document.getElementById('residuals-caption');
  if (!chart || !Array.isArray(fitted) || !fitted.length) return;

  const trace = {
    x: fitted,
    y: residuals,
    mode: 'markers',
    type: 'scatter',
    marker: { color: '#f97316', size: 8, opacity: 0.85 },
    name: 'Residuals'
  };
  const zeroLine = {
    x: [Math.min(...fitted), Math.max(...fitted)],
    y: [0, 0],
    mode: 'lines',
    line: { color: '#9ca3af', width: 2, dash: 'dash' },
    name: 'Zero'
  };

  Plotly.newPlot(chart, [trace, zeroLine], {
    margin: { t: 20, r: 20, b: 60, l: 60 },
    xaxis: { title: `Fitted (predicted) ${labels.y}` },
    yaxis: { title: 'Residual (actual - fitted)' },
    showlegend: false
  }, { responsive: true });

  if (caption) {
    caption.textContent = 'Look for roughly even scatter around zero; curves or funnels can suggest non-linearity or unequal variance.';
  }
}

function renderEffectPlot(predictorType, labels, {
    intercept,
    slope,
    xNumeric,
    xStats,
    xGroups,
    reference,
    alpha,
    residualSE
  }) {
  const chart = document.getElementById('effect-chart');
  const caption = document.getElementById('effect-caption');
  const interpretation = document.getElementById('effect-interpretation');
  const rangeControls = document.getElementById('effect-range-controls');
  const customRange = document.getElementById('effect-custom-range');
  if (!chart) return;

  const rangeChoice = document.querySelector('input[name="effect-range"]:checked')?.value || 'sd';
  if (predictorType === 'categorical') {
    if (rangeControls) rangeControls.style.display = 'none';
    if (customRange) customRange.style.display = 'none';
    if (!xGroups || !xGroups.groupStats) return;
    const z = StatsUtils.normInv(1 - alpha / 2);
    const means = xGroups.groupStats.map(g => g.mean);
    const errors = xGroups.groupStats.map(g => {
      const se = g.n > 0 ? g.sd / Math.sqrt(g.n) : NaN;
      return isFinite(se) ? z * se : 0;
    });
    const trace = {
      x: xGroups.groupStats.map(g => g.name),
      y: means,
      type: 'bar',
      marker: { color: '#2563eb' },
      error_y: { type: 'data', array: errors, visible: true, color: '#1f2937' },
      name: labels.y
    };
    Plotly.newPlot(chart, [trace], {
      margin: { t: 20, r: 20, b: 60, l: 60 },
      xaxis: { title: labels.x },
      yaxis: { title: labels.y },
      showlegend: false
    }, { responsive: true });
    if (caption) {
      caption.textContent = `Predicted ${labels.y} by ${labels.x} (reference: ${reference || xGroups.levels[0]}); bars show group means with ${Math.round((1 - alpha) * 100)}% CI error bars.`;
    }
    if (interpretation) {
      interpretation.innerHTML = `
        <p>The bar for each level shows its predicted mean ${escapeHtml(labels.y)}; error bars show the ${Math.round((1 - alpha) * 100)}% confidence interval.</p>
        <p>Compare each bar to the reference (${escapeHtml(reference || xGroups.levels[0])}). A higher bar means a higher predicted outcome than the reference.</p>
      `;
    }
    return;
  }

  if (rangeControls) rangeControls.style.display = '';
  if (customRange) customRange.style.display = rangeChoice === 'custom' ? '' : 'none';

    if (!Array.isArray(xNumeric) || !xNumeric.length) return;
  const minObs = Math.min(...xNumeric);
  const maxObs = Math.max(...xNumeric);
  const meanX = xStats?.mean ?? StatsUtils.mean(xNumeric);
  const sdX = xStats?.sd ?? StatsUtils.standardDeviation(xNumeric);

  let xMin = minObs;
  let xMax = maxObs;
  if (rangeChoice === 'sd') {
    xMin = meanX - 2 * sdX;
    xMax = meanX + 2 * sdX;
  } else if (rangeChoice === 'custom') {
    const customMin = parseFloat(document.getElementById('effect-range-min')?.value);
    const customMax = parseFloat(document.getElementById('effect-range-max')?.value);
    if (isFinite(customMin)) xMin = customMin;
    if (isFinite(customMax)) xMax = customMax;
  }
  if (xMax <= xMin) {
    xMin = minObs;
    xMax = maxObs;
  }

    const grid = [];
    const steps = 25;
    const step = (xMax - xMin) / steps;
    for (let i = 0; i <= steps; i++) {
      grid.push(xMin + step * i);
    }
    const predicted = grid.map(x => intercept + slope * x);

    const ciUpper = [];
    const ciLower = [];
    const Sxx = StatsUtils.variance(xNumeric) * (xNumeric.length - 1);
    const z = StatsUtils.normInv(1 - alpha / 2);

    grid.forEach(xv => {
      const seMean = (Sxx > 0 && isFinite(residualSE))
        ? residualSE * Math.sqrt(1 / xNumeric.length + Math.pow(xv - meanX, 2) / Sxx)
        : NaN;
      if (isFinite(seMean) && isFinite(z)) {
        ciUpper.push(intercept + slope * xv + z * seMean);
        ciLower.push(intercept + slope * xv - z * seMean);
      } else {
        ciUpper.push(intercept + slope * xv);
        ciLower.push(intercept + slope * xv);
      }
    });
  
    const lineTrace = {
      x: grid,
      y: predicted,
      mode: 'lines',
      line: { color: '#2563eb', width: 3 },
      name: 'Predicted'
    };

    const bandTrace = {
      x: [...grid, ...grid.slice().reverse()],
      y: [...ciUpper, ...ciLower.slice().reverse()],
      mode: 'lines',
      type: 'scatter',
      name: `${Math.round((1 - alpha) * 100)}% CI (mean)`,
      fill: 'toself',
      line: { color: 'rgba(37,99,235,0.15)' },
      fillcolor: 'rgba(37,99,235,0.10)',
      hoverinfo: 'skip',
      showlegend: true
    };

    Plotly.newPlot(chart, [bandTrace, lineTrace], {
      margin: { t: 20, r: 20, b: 60, l: 60 },
      xaxis: { title: labels.x },
      yaxis: { title: labels.y },
      showlegend: true
    }, { responsive: true });

  if (caption) {
    caption.textContent = `Predicted ${labels.y} across ${labels.x}; range shown: ${formatNumber(xMin, 3)} to ${formatNumber(xMax, 3)}.`;
  }
  if (interpretation) {
    interpretation.innerHTML = `
      <p>The line shows how predicted ${escapeHtml(labels.y)} changes as ${escapeHtml(labels.x)} varies.</p>
      <p>The shaded band is a confidence interval for the <em>expected mean</em> ${escapeHtml(labels.y)} at each value of ${escapeHtml(labels.x)}&mdash;it reflects uncertainty in the average relationship, not the spread of individual observations.</p>
      <p>Use the range buttons to view the mean &plusmn; 2 SD, the observed min/max, or a custom range. A steeper line means a stronger effect of ${escapeHtml(labels.x)} on ${escapeHtml(labels.y)}; if the numerical slope is not statistically significant, treat the pattern in this plot as directional rather than conclusive.</p>
    `;
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

  const columnData = {};
  const headers = (activeDataEntryMode === DataEntryModes.RAW && uploadedRawData?.headers)
    ? uploadedRawData.headers
    : Object.keys(rows[0] || {});
  headers.forEach(header => {
    const values = rows.map(r => r[header]);
    const isNumeric = values.every(v => v === '' || v === null || v === undefined || isFinite(parseFloat(v)));
    columnData[header] = { isNumeric, values };
  });
  
  updateColumnSelectors(headers, columnData);

  const xCol = document.getElementById('x-column-select').value;
  const yCol = document.getElementById('y-column-select').value;

  const finalLabels = { x: xCol, y: yCol };
  const xRaw = rows.map(r => r[xCol]);
  const yValues = rows.map(r => parseFloat(r[yCol]));


  const predictorChoice = activeDataEntryMode === DataEntryModes.RAW
    ? (document.getElementById('upload-predictor-type')?.value || 'auto')
    : (document.querySelector('input[name="predictor-type"]:checked')?.value || 'continuous');

  let predictorType = 'continuous';
  let numericAsCategoricalWarning = null;
  const xIsNumeric = columnData[xCol]?.isNumeric;
  const allNumeric = columnData[xCol]?.isNumeric;
  const numericDistinctCount = xIsNumeric
    ? new Set(columnData[xCol].values.filter(v => isFinite(parseFloat(v)))).size
    : 0;

  let categoricalTooManyLevelsWarning = null;
  const manualLockReason = allNumeric && numericDistinctCount > 10
    ? `Categorical mode unavailable: predictor has ${numericDistinctCount} unique numeric values (limit 10).`
    : '';
  setManualCategoricalLock(xIsNumeric && numericDistinctCount > 10, manualLockReason);
  setUploadCategoricalLock(allNumeric && numericDistinctCount > 10, manualLockReason);

  // For non-numeric predictors, disable the continuous option in the upload dropdown immediately.
  const uploadSelect = document.getElementById('upload-predictor-type');
  if (uploadSelect) {
    const continuousOption = Array.from(uploadSelect.options).find(opt => opt.value === 'continuous');
    if (continuousOption) {
      continuousOption.disabled = !xIsNumeric;
    }
    if (!xIsNumeric && uploadSelect.value === 'continuous') {
      // Fall back to categorical (preferred) or auto.
      const hasCategorical = Array.from(uploadSelect.options).some(opt => opt.value === 'categorical' && !opt.disabled);
      uploadSelect.value = hasCategorical ? 'categorical' : 'auto';
    }
  }

  // If swapped, the predictor must be continuous.
  if (isSwapped) {
    predictorType = 'continuous';
    const contRadio = document.querySelector('input[name="predictor-type"][value="continuous"]');
    if (contRadio) {
      contRadio.checked = true;
    }
  } else if (predictorChoice === 'categorical') {
    if (xIsNumeric) {
      if (numericDistinctCount <= 10) {
        predictorType = 'categorical';
        numericAsCategoricalWarning =
          `Numeric predictor values are being treated as categories (${numericDistinctCount} distinct values).`;
      } else {
        predictorType = 'continuous';
        categoricalTooManyLevelsWarning =
          `You selected Categorical for a numeric predictor with ${numericDistinctCount} distinct values. The tool is treating it as continuous instead.`;
      }
    } else {
      predictorType = 'categorical';
    }
  } else if (predictorChoice === 'continuous') {
    if (!xIsNumeric) {
      predictorType = 'categorical'; // Force categorical if non-numeric
      categoricalTooManyLevelsWarning = 'Predictor includes non-numeric values, so categorical mode is used instead.';
      const manualCat = document.querySelector('input[name="predictor-type"][value="categorical"]');
      if (manualCat) {
        manualCat.checked = true;
      }
      const uploadSelect = document.getElementById('upload-predictor-type');
      if (uploadSelect) {
        uploadSelect.value = 'categorical';
      }
    } else {
      predictorType = 'continuous';
    }
    } else {
      // Default behavior: infer based on data type (auto-detect), without exposing an "Auto" UI option.
      predictorType = xIsNumeric ? 'continuous' : 'categorical';
    }

  // Logic for enabling/disabling the Swap X/Y button (only makes sense when predictor is continuous and both X and Y are numeric)
  const yIsNumeric = columnData[yCol]?.isNumeric;
  const canSwap = predictorType === 'continuous' && allNumeric && yIsNumeric;
  const swapButtonManual = document.getElementById('swap-xy-manual');
  const swapButtonUpload = document.getElementById('swap-xy-upload');
  if (swapButtonManual) {
    swapButtonManual.classList.toggle('hidden', !canSwap || activeDataEntryMode !== DataEntryModes.MANUAL);
    swapButtonManual.disabled = !canSwap;
  }
  if (swapButtonUpload) {
    swapButtonUpload.classList.toggle('hidden', !canSwap || activeDataEntryMode !== DataEntryModes.RAW);
    swapButtonUpload.disabled = !canSwap;
  }

  let xNumeric = null;
  let xGroups = null;
  let reference = null;
  let parameters = [];
  let rSquared = NaN;
  let residuals = [];
  let fittedValues = [];
  let sse = NaN;
  let xStats = null;
  let totalPairs = NaN;
  let meanX = NaN;
  let meanY = NaN;
  let sdX = NaN;
  let sdY = NaN;
  let covXY = NaN;
  let sampleVarX = NaN;

  if (predictorType === 'continuous') {
    const initialPairs = [];
    for (let i = 0; i < rows.length; i++) {
      const xv = parseFloat(xRaw[i]);
      const yv = parseFloat(yValues[i]);
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
      // Handle log transformations: drop non-positive values when requested.
      if (transformX && xv <= 0) continue;
      if (transformY && yv <= 0) continue;
      const tx = transformX ? Math.log(xv) : xv;
      const ty = transformY ? Math.log(yv) : yv;
      initialPairs.push({ x: tx, y: ty });
    }

    totalPairs = initialPairs.length;
    let workingPairs = initialPairs;
    if (trimOutliers && workingPairs.length >= 5) {
      const xs = workingPairs.map(p => p.x);
      const ys = workingPairs.map(p => p.y);
      const meanX0 = StatsUtils.mean(xs);
      const meanY0 = StatsUtils.mean(ys);
      const sdX0 = StatsUtils.standardDeviation(xs);
      const sdY0 = StatsUtils.standardDeviation(ys);
      if (sdX0 > 0 && sdY0 > 0) {
        workingPairs = workingPairs.filter(p => {
          const zx = (p.x - meanX0) / sdX0;
          const zy = (p.y - meanY0) / sdY0;
          return Math.abs(zx) <= 3.5 && Math.abs(zy) <= 3.5;
        });
        if (workingPairs.length < 3) {
          workingPairs = initialPairs;
        }
      }
    }

    xNumeric = workingPairs.map(p => p.x);
    const yNumeric = workingPairs.map(p => p.y);
    yValues.splice(0, yValues.length, ...yNumeric);

    if (xNumeric.length < 3 || yValues.length < 3) {
      clearOutputs('Not enough usable observations after applying advanced settings.');
      return;
    }

    meanX = StatsUtils.mean(xNumeric);
    meanY = StatsUtils.mean(yValues);
    sdX = StatsUtils.standardDeviation(xNumeric);
    sdY = StatsUtils.standardDeviation(yValues);
    sampleVarX = StatsUtils.variance(xNumeric);
    xStats = { mean: meanX, sd: sdX, min: Math.min(...xNumeric), max: Math.max(...xNumeric) };
    covXY = xNumeric.reduce((acc, xv, i) => acc + (xv - meanX) * (yValues[i] - meanY), 0) / (xNumeric.length - 1);
    const r = sdX > 0 && sdY > 0 ? covXY / (sdX * sdY) : NaN;
    rSquared = Number.isFinite(r) ? r * r : NaN;
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
    if (activeReferenceLevel && levels.includes(activeReferenceLevel)) {
      reference = activeReferenceLevel;
    } else {
      reference = levels[0];
      activeReferenceLevel = reference;
    }
    const groupStats = levels.map(name => {
      const ys = levelMap.get(name);
      return {
        name,
        n: ys.length,
        mean: StatsUtils.mean(ys),
        sd: StatsUtils.standardDeviation(ys)
      };
    });
    const overallMean = StatsUtils.mean(yValues);
    const sst = yValues.reduce((acc, yv) => acc + Math.pow(yv - overallMean, 2), 0);
    const sse = groupStats.reduce((acc, g) => acc + (g.sd * g.sd) * (g.n - 1), 0);
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
  let seIntercept = NaN;
  let t = NaN;
  let p = NaN;
  let tIntercept = NaN;
  let pIntercept = NaN;
  let stdSlope = NaN;

  if (predictorType === 'continuous') {
    const n = xNumeric.length;
    const Sxx = Number.isFinite(sampleVarX) ? sampleVarX * (n - 1) : NaN;
    const Sxy = Number.isFinite(covXY) ? covXY * (n - 1) : NaN;
    slope = Sxx > 0 ? Sxy / Sxx : NaN;
    intercept = Number.isFinite(meanY) && Number.isFinite(meanX) && Number.isFinite(slope)
      ? meanY - slope * meanX
      : NaN;
    fittedValues = xNumeric.map(xv => intercept + slope * xv);
    residuals = yValues.map((yv, i) => yv - fittedValues[i]);
    sse = residuals.reduce((acc, r) => acc + r * r, 0);
    const mse = df > 0 ? sse / df : NaN;
    if (Number.isFinite(mse) && Sxx > 0 && n > 0) {
      seSlope = Math.sqrt(mse / Sxx);
      seIntercept = Math.sqrt(mse * (1 / n + (meanX * meanX) / Sxx));
    }
    t = Number.isFinite(seSlope) && seSlope > 0 ? slope / seSlope : NaN;
    if (Number.isFinite(t)) {
      if (hypothesisTail === 'greater') {
        p = 1 - StatsUtils.normCdf(t);
      } else if (hypothesisTail === 'less') {
        p = StatsUtils.normCdf(t);
      } else {
        p = 2 * (1 - StatsUtils.normCdf(Math.abs(t)));
      }
    } else {
      p = NaN;
    }
    tIntercept = Number.isFinite(seIntercept) && seIntercept > 0 ? intercept / seIntercept : NaN;
    pIntercept = Number.isFinite(tIntercept)
      ? 2 * (1 - StatsUtils.normCdf(Math.abs(tIntercept)))
      : NaN;
    if (Number.isFinite(sdX) && sdX > 0 && Number.isFinite(sdY) && sdY > 0 && Number.isFinite(slope)) {
      stdSlope = (slope * sdX) / sdY;
    }
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
        if (Number.isFinite(t)) {
          if (hypothesisTail === 'greater') {
            p = 1 - StatsUtils.normCdf(t);
          } else if (hypothesisTail === 'less') {
            p = StatsUtils.normCdf(t);
          } else {
            p = 2 * (1 - StatsUtils.normCdf(Math.abs(t)));
          }
        } else {
          p = NaN;
        }
      }
    });
    const paramLookup = new Map(parameters.map(param => [param.name, param.estimate]));
    residuals = yValues.map((yv, idx) => {
      const level = xRaw[idx];
      const increment = paramLookup.has(level) ? paramLookup.get(level) : 0;
      const fitted = intercept + increment;
      return yv - fitted;
    });
    fittedValues = yValues.map((_, idx) => {
      const level = xRaw[idx];
      const increment = paramLookup.has(level) ? paramLookup.get(level) : 0;
      return intercept + increment;
    });
    sse = residuals.reduce((acc, r) => acc + r * r, 0);
  }

  const critical = StatsUtils.normInv(1 - alpha / 2);
  const ciLower = Number.isFinite(seSlope) ? slope - critical * seSlope : NaN;
  const ciUpper = Number.isFinite(seSlope) ? slope + critical * seSlope : NaN;
  const interceptCiLower = Number.isFinite(seIntercept) ? intercept - critical * seIntercept : NaN;
  const interceptCiUpper = Number.isFinite(seIntercept) ? intercept + critical * seIntercept : NaN;

  const n = yValues.length;
  const rmse = Math.sqrt(Math.max(sse / n, 0));
  const mae = residuals.length ? residuals.reduce((acc, r) => acc + Math.abs(r), 0) / n : NaN;
  const residualSE = df > 0 ? Math.sqrt(Math.max(sse / df, 0)) : NaN;
  const modelP = p;

  const stats = {
    n,
    df,
    slope,
    intercept,
    seSlope,
    t,
    p,
    rSquared,
    alpha,
    rmse,
    mae,
    residualSE,
    modelP,
    stdSlope,
    totalPairs,
    seIntercept,
    tIntercept,
    pIntercept,
    slopeCiLower: ciLower,
    slopeCiUpper: ciUpper,
    interceptCiLower,
    interceptCiUpper
  };

  // Summary statistics for quick descriptive context
  const numericRows = [];
  const categoricalRows = [];
  const summarizeNumeric = (values, label) => {
    const clean = values.filter(v => Number.isFinite(v));
    if (!clean.length) return null;
    return {
      label,
      mean: StatsUtils.mean(clean),
      median: median(clean),
      sd: StatsUtils.standardDeviation(clean),
      min: Math.min(...clean),
      max: Math.max(...clean)
    };
  };
  const outcomeSummary = summarizeNumeric(yValues, finalLabels.y);
  if (outcomeSummary) numericRows.push(outcomeSummary);
  if (predictorType === 'continuous' && xNumeric) {
    const predictorSummary = summarizeNumeric(xNumeric, finalLabels.x);
    if (predictorSummary) numericRows.push(predictorSummary);
  } else if (predictorType === 'categorical' && xGroups) {
    const total = yValues.length || 1;
    xGroups.groupStats.forEach(g => {
      categoricalRows.push({
        predictor: finalLabels.x,
        level: g.name,
        percent: (g.n / total) * 100
      });
    });
  }

  const equationEl = document.getElementById('regression-equation-output');
  if (equationEl) {
    if (predictorType === 'continuous') {
      const outcomeName = escapeHtml(finalLabels.y);
      const predictorName = escapeHtml(finalLabels.x);
      const interceptVal = formatNumber(stats.intercept, 3);
      const sign = stats.slope >= 0 ? '+' : '-';
      const absSlope = formatNumber(Math.abs(stats.slope), 3);
      equationEl.innerHTML = `<strong>${outcomeName}</strong> = ${interceptVal} ${sign} ${absSlope} &times; <strong>${predictorName}</strong>`;
    } else {
      if (xGroups && parameters) {
        const outcomeName = escapeHtml(finalLabels.y);
        let equationHtml = `<strong>${outcomeName}</strong> = ${formatNumber(stats.intercept, 3)}`;

        parameters.forEach(param => {
          const coeff = param.estimate;
          const sign = coeff >= 0 ? '+' : '-';
          const absCoeff = formatNumber(Math.abs(coeff), 3);
          const categoryName = escapeHtml(param.name);
          equationHtml += ` ${sign} ${absCoeff} &times; <em>(${categoryName})</em>`;
        });

        equationEl.innerHTML = equationHtml;
      } else {
        equationEl.textContent = 'Equation could not be determined for the categorical model.';
      }
    }
  }


  renderSummaryStatistics({ numericRows, categoricalRows });
  renderReferenceSelector(predictorType === 'categorical' ? xGroups : null, predictorType === 'categorical' ? reference : null, finalLabels);
  updateMetricsPanel(stats, predictorType, { reference });
  updateSummaryTable(stats, predictorType, { xGroups, reference, labels: finalLabels });
  renderRegressionNarratives(stats, finalLabels, predictorType, { xGroups, reference });
  renderCoefInterpretation(stats, predictorType, finalLabels, { reference, parameters, xGroups });
  const rowsDroppedForAdvanced = predictorType === 'continuous' && Number.isFinite(stats.totalPairs)
    ? Math.max(0, stats.totalPairs - stats.n)
    : 0;
  updateRegressionDiagnostics(stats, predictorType, {
    numericAsCategoricalWarning,
    categoricalTooManyLevelsWarning,
    rowsDroppedForAdvanced
  });
  renderActualFittedChart(fittedValues, yValues, finalLabels);
  renderResidualsChart(fittedValues, residuals, finalLabels);
  renderEffectPlot(predictorType, finalLabels, {
      intercept: stats.intercept,
      slope: stats.slope,
      xNumeric,
      xStats,
      xGroups,
      reference,
      alpha: stats.alpha,
      residualSE: stats.residualSE
    });
  \n  // Track successful analysis with debouncing\n  renderCount++;\n  const now = Date.now();\n  if (renderCount > 1 && (now - lastTrackTime) > 500 && Number.isFinite(stats.p)) {\n    lastTrackTime = now;\n    if (typeof markRunAttempted === 'function') {\n      markRunAttempted();\n    }\n    if (typeof markRunSuccessful === 'function') {\n      markRunSuccessful(\n        { predictor: finalLabels.x, outcome: finalLabels.y, type: predictorType, n: stats.n },\n        `R²=${stats.rSquared.toFixed(3)}, p=${stats.p < 0.001 ? '<.001' : stats.p.toFixed(4)}`\n      );\n    }\n  }\n  \n  modifiedDate = new Date().toLocaleDateString();
  const modifiedLabel = document.getElementById('modified-date');
  if (modifiedLabel) modifiedLabel.textContent = modifiedDate;
}

function attachInputListeners() {
  const xSelect = document.getElementById('x-column-select');
  const ySelect = document.getElementById('y-column-select');

  const handleSelectChange = (event) => {
    // Break the infinite loop: only call updateResults if the event was triggered by a user.
    // Programmatic `new Event(...)` calls will not have `isTrusted = true`.
    if (!event.isTrusted) {
      return;
    }

    const changed = event.target;
    const other = changed === xSelect ? ySelect : xSelect;
    if (changed.value === other.value) {
      const headers = Array.from(changed.options).map(opt => opt.value);
      const currentIndex = headers.indexOf(changed.value);
      const nextIndex = (currentIndex + 1) % headers.length;
      // Find the next valid option for the 'other' dropdown
      for (let i = 0; i < headers.length; i++) {
        const potentialIndex = (nextIndex + i) % headers.length;
        if (other.options[potentialIndex] && !other.options[potentialIndex].disabled) {
          other.selectedIndex = potentialIndex;
          break;
        }
      }
    }
    updateResults();
  };

  xSelect.addEventListener('change', handleSelectChange);
  ySelect.addEventListener('change', handleSelectChange);
  
  document.querySelectorAll('input[name="predictor-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (activeScenarioDataset) {
        abandonScenarioDataset();
      }
      updateResults();
    });
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

function setupEffectControls() {
  const rangeRadios = document.querySelectorAll('input[name="effect-range"]');
  const customWrapper = document.getElementById('effect-custom-range');
  const minInput = document.getElementById('effect-range-min');
  const maxInput = document.getElementById('effect-range-max');
  rangeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (customWrapper) customWrapper.style.display = radio.value === 'custom' && radio.checked ? '' : 'none';
      updateResults();
    });
  });
  const uploadPredictorSelect = document.getElementById('upload-predictor-type');
  if (uploadPredictorSelect) {
    uploadPredictorSelect.addEventListener('change', () => {
      if (activeScenarioDataset) {
        abandonScenarioDataset();
      }
      updateResults();
    });
  }
  [minInput, maxInput].forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        const customRadio = document.querySelector('input[name="effect-range"][value="custom"]');
        if (customRadio) customRadio.checked = true;
        if (customWrapper) customWrapper.style.display = '';
        updateResults();
      });
    }
  });
}

function setupSwapButtons() {
  const swapManual = document.getElementById('swap-xy-manual');
  const swapUpload = document.getElementById('swap-xy-upload');

  const swapHandler = (event) => {
    event.preventDefault();
    const xSelect = document.getElementById('x-column-select');
    const ySelect = document.getElementById('y-column-select');
    if (!xSelect || !ySelect) return;

    const oldX = xSelect.value;
    const oldY = ySelect.value;

    xSelect.value = oldY;
    ySelect.value = oldX;

    updateResults();
  };

  if (swapManual) swapManual.addEventListener('click', swapHandler);
  if (swapUpload) swapUpload.addEventListener('click', swapHandler);
}

function setupAdvancedSettingsControls() {
  const tailRadios = document.querySelectorAll('input[name="hypothesis-tail"]');
  if (tailRadios.length) {
    tailRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        const value = radio.value;
        if (value === 'greater' || value === 'less' || value === 'two-sided') {
          hypothesisTail = value;
          updateResults();
        }
      });
    });
  }
  const stdSlopeCheckbox = document.getElementById('report-std-slope');
  if (stdSlopeCheckbox) {
    stdSlopeCheckbox.addEventListener('change', () => {
      showStandardizedSlope = stdSlopeCheckbox.checked;
      updateResults();
    });
  }
  const trimCheckbox = document.getElementById('trim-outliers');
  if (trimCheckbox) {
    trimCheckbox.addEventListener('change', () => {
      trimOutliers = trimCheckbox.checked;
      updateResults();
    });
  }
  const logXCheckbox = document.getElementById('log-transform-x');
  if (logXCheckbox) {
    logXCheckbox.addEventListener('change', () => {
      transformX = logXCheckbox.checked;
      updateResults();
    });
  }
  const logYCheckbox = document.getElementById('log-transform-y');
  if (logYCheckbox) {
    logYCheckbox.addEventListener('change', () => {
      transformY = logYCheckbox.checked;
      updateResults();
    });
  }
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
  setupSwapButtons();
  setupAdvancedSettingsControls();
  attachInputListeners();
  setupManualControls();
    setupEffectControls();
  const manualCommit = document.getElementById('manual-commit');
    if (manualCommit) {
      manualCommit.addEventListener('click', finalizeManualEntry);
    }
    const downloadButton = document.getElementById('bivariate-download-results');
    if (downloadButton) {
      downloadButton.addEventListener('click', event => {
        event.preventDefault();
        handleDownloadBivariateResults();
      });
    }
    clearOutputs('Enter paired predictor/outcome values or upload a raw file to fit a regression line.');
    
    if (typeof initEngagementTracking === 'function') { initEngagementTracking(TOOL_SLUG); }
  });

  function handleDownloadBivariateResults() {
    const { rows: numericRows, labels, message } =
      activeDataEntryMode === DataEntryModes.RAW ? collectRawUpload() : collectManualRaw();
    if (!numericRows || !numericRows.length) {
      clearOutputs(message || 'Provide raw data before downloading fitted values and residuals.');
      return;
    }

    const xSelect = document.getElementById('x-column-select');
    const ySelect = document.getElementById('y-column-select');
    const xName = (xSelect && xSelect.value) || labels.x || 'Predictor';
    const yName = (ySelect && ySelect.value) || labels.y || 'Outcome';

    // Inspect X values to decide continuous vs categorical
    const rawPredictorValues = numericRows.map(row =>
      activeDataEntryMode === DataEntryModes.RAW ? row[xName] : row.x
    );
    const isPredictorNumeric = rawPredictorValues.every(v =>
      v === '' || v === null || v === undefined || Number.isFinite(parseFloat(v))
    );

    const alphaInput = document.getElementById('alpha');
    const alphaVal = alphaInput ? parseFloat(alphaInput.value) : NaN;
    const alpha = isFinite(alphaVal) && alphaVal > 0 && alphaVal < 1 ? alphaVal : 1 - selectedConfidenceLevel;
    const zCrit = (window.StatsUtils && typeof window.StatsUtils.normInv === 'function')
      ? window.StatsUtils.normInv(1 - alpha / 2)
      : 1.96;

    const headers = [xName, yName, 'y_fitted', 'residual', 'y_fit_ci_lower', 'y_fit_ci_upper'];
    const lines = [headers.join(',')];

    if (isPredictorNumeric) {
      // Continuous predictor: standard simple regression
      const pairs = [];
      for (let i = 0; i < numericRows.length; i++) {
        const row = numericRows[i];
        const rawX = activeDataEntryMode === DataEntryModes.RAW ? row[xName] : row.x;
        const rawY = activeDataEntryMode === DataEntryModes.RAW ? row[yName] : row.y;
        const xv = parseFloat(rawX);
        const yv = parseFloat(rawY);
        if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
          continue;
        }
        pairs.push({ x: xv, y: yv, rawX, rawY });
      }

      if (pairs.length < 3 || pairs.length !== numericRows.length) {
        clearOutputs('Download is only available when the predictor is continuous and both X and Y are numeric with no missing values.');
        return;
      }

      const xNumeric = pairs.map(p => p.x);
      const yValues = pairs.map(p => p.y);

      const meanX = StatsUtils.mean(xNumeric);
      const meanY = StatsUtils.mean(yValues);
      const covXY = xNumeric.reduce((acc, xv, i) => acc + (xv - meanX) * (yValues[i] - meanY), 0) / (xNumeric.length - 1);
      const slope = covXY / StatsUtils.variance(xNumeric);
      const intercept = meanY - slope * meanX;

      const fitted = xNumeric.map(xv => intercept + slope * xv);
      const residuals = yValues.map((yv, i) => yv - fitted[i]);

      const n = xNumeric.length;
      const Sxx = xNumeric.reduce((acc, xv) => acc + Math.pow(xv - meanX, 2), 0);
      const df = n - 2;
      const s2 = df > 0 ? residuals.reduce((acc, r) => acc + r * r, 0) / df : NaN;
      const s = s2 > 0 ? Math.sqrt(s2) : NaN;

      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const xVal = pair.rawX;
        const yVal = pair.rawY;
        const f = fitted[i];
        const r = residuals[i];

        let lower = NaN;
        let upper = NaN;
        if (Number.isFinite(f) && Number.isFinite(s) && Sxx > 0 && n > 1) {
          const seMean = s * Math.sqrt(1 / n + Math.pow(xNumeric[i] - meanX, 2) / Sxx);
          lower = f - zCrit * seMean;
          upper = f + zCrit * seMean;
        }

        const line = [
          xVal == null ? '' : String(xVal),
          yVal == null ? '' : String(yVal),
          Number.isFinite(f) ? f.toFixed(6) : '',
          Number.isFinite(r) ? r.toFixed(6) : '',
          Number.isFinite(lower) ? lower.toFixed(6) : '',
          Number.isFinite(upper) ? upper.toFixed(6) : ''
        ].join(',');
        lines.push(line);
      }
    } else {
      // Categorical predictor: group-mean model
      const groups = new Map();
      numericRows.forEach(row => {
        const rawX = activeDataEntryMode === DataEntryModes.RAW ? row[xName] : row.x;
        const rawY = activeDataEntryMode === DataEntryModes.RAW ? row[yName] : row.y;
        const yv = parseFloat(rawY);
        if (!Number.isFinite(yv)) return;
        const key = rawX == null || rawX === '' ? '(missing)' : String(rawX);
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(yv);
      });

      if (!groups.size) {
        clearOutputs('Unable to compute group means: no valid numeric outcome values.');
        return;
      }

      // Compute mean and CI for each group
      const groupStats = new Map();
      groups.forEach((values, level) => {
        const n = values.length;
        if (!n) return;
        const mean = StatsUtils.mean(values);
        const sd = StatsUtils.standardDeviation(values);
        const se = n > 1 && Number.isFinite(sd) ? sd / Math.sqrt(n) : NaN;
        const lower = Number.isFinite(se) ? mean - zCrit * se : NaN;
        const upper = Number.isFinite(se) ? mean + zCrit * se : NaN;
        groupStats.set(level, { mean, lower, upper });
      });

      // Emit one row per original observation, using its group stats when available
      numericRows.forEach(row => {
        const rawX = activeDataEntryMode === DataEntryModes.RAW ? row[xName] : row.x;
        const rawY = activeDataEntryMode === DataEntryModes.RAW ? row[yName] : row.y;
        const yv = parseFloat(rawY);
        const key = rawX == null || rawX === '' ? '(missing)' : String(rawX);
        const stats = groupStats.get(key);

        const f = stats && Number.isFinite(stats.mean) && Number.isFinite(yv) ? stats.mean : NaN;
        const r = stats && Number.isFinite(stats.mean) && Number.isFinite(yv) ? yv - stats.mean : NaN;
        const lower = stats ? stats.lower : NaN;
        const upper = stats ? stats.upper : NaN;

        const line = [
          rawX == null ? '' : String(rawX),
          rawY == null ? '' : String(rawY),
          Number.isFinite(f) ? f.toFixed(6) : '',
          Number.isFinite(r) ? r.toFixed(6) : '',
          Number.isFinite(lower) ? lower.toFixed(6) : '',
          Number.isFinite(upper) ? upper.toFixed(6) : ''
        ].join(',');
        lines.push(line);
      });
    }

    downloadTextFile('bivariate_regression_fitted_residuals.csv', lines.join('\n'), { mimeType: 'text/csv' });
  }
