// ARIMAX Time Series Forecasting Tool Controller
const TOOL_SLUG = 'arimax-calculator';
const CREATED_DATE = '2025-11-30';

// Configuration
const API_BASE_URL = 'https://drbaker-backend.onrender.com/api';
const ARIMAX_UPLOAD_LIMIT = typeof window !== 'undefined' && typeof window.MAX_UPLOAD_ROWS === 'number'
  ? window.MAX_UPLOAD_ROWS
  : 2000;

// Application state
let arimaxDataset = { headers: [], rows: [] };
let arimaxDateColumn = null;
let arimaxOutcomeColumn = null;
let arimaxExogColumns = [];
let arimaxLastResult = null;
let modifiedDate = new Date().toLocaleDateString();

// Forecast scenario settings - stores user's chosen values for exog predictors during forecast
let forecastExogSettings = {};

// Track current scenario for analytics
let currentScenarioName = null;
let currentDataSource = 'manual'; // 'scenario', 'upload', or 'manual'

// Scenario definitions
const ARIMAX_SCENARIOS = [
  {
    id: 'scenario-ad-spend',
    label: 'Monthly Sales with Ad Spend (36 months)',
    file: 'scenarios/ad_spend_sales.txt',
    datasetPath: 'scenarios/ad_spend_sales.csv'
  },
  {
    id: 'scenario-instagram',
    label: 'Instagram Health Supplement Shop (300 days)',
    file: 'scenarios/instagram_supplement_sales.txt',
    datasetPath: 'scenarios/instagram_supplement_sales.csv'
  },
  {
    id: 'scenario-mobile-game',
    label: 'Mobile Game Weekly Signups (100 weeks)',
    file: 'scenarios/mobile_game_signups.txt',
    datasetPath: 'scenarios/mobile_game_signups.csv'
  }
];

// Template CSV for download
const TEMPLATE_CSV = `date,sales,ad_spend,promotion
2023-01,1200,5000,0
2023-02,1350,5500,1
2023-03,1100,4800,0
2023-04,1450,6000,1
2023-05,1300,5200,0
2023-06,1500,6500,1
2023-07,1250,5100,0
2023-08,1600,7000,1
2023-09,1400,5800,0
2023-10,1700,7500,1
2023-11,1550,6200,0
2023-12,1900,8000,1`;

// Usage tracking function
function checkAndTrackUsage() {
  const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
  if (timeOnPage < 0.167) return;
  if (!hasSuccessfulRun) return;
  if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `tool-tracked-arimax-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('arimax', {
      outcome: arimaxOutcomeColumn,
      exog_count: arimaxExogColumns.length,
      order: getModelOrder()
    }, `ARIMAX time series forecasting completed`, {
      scenario: currentScenarioName,
      dataSource: currentDataSource
    });
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for ARIMAX');
  }
}

/**
 * Detect if a column contains date/time values
 * Returns an object with detection results
 */
function detectDateColumn(values) {
  if (!values || values.length === 0) return { isDate: false };
  
  const sampleSize = Math.min(values.length, 20);
  const samples = values.slice(0, sampleSize);
  
  let dateCount = 0;
  let numericCount = 0;
  let parseableFormats = [];
  
  for (const val of samples) {
    const str = String(val).trim();
    
    // Check if purely numeric (period number like 1, 2, 3...)
    if (/^\d+$/.test(str)) {
      numericCount++;
      continue;
    }
    
    // Try parsing as date
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      dateCount++;
      // Detect format
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(str)) parseableFormats.push('ISO');
      else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) parseableFormats.push('US');
      else if (/^\d{4}Q[1-4]$/.test(str)) parseableFormats.push('Quarter');
      else parseableFormats.push('Other');
    }
  }
  
  const isDate = dateCount > sampleSize * 0.7;
  const isSequential = numericCount === sampleSize;
  
  return {
    isDate,
    isSequential,
    dateCount,
    numericCount,
    totalSampled: sampleSize,
    detectedFormat: parseableFormats.length > 0 ? parseableFormats[0] : null,
    confidence: isDate ? 'high' : isSequential ? 'sequential' : 'low'
  };
}

/**
 * Validate and optionally sort data by date column
 * Returns sorted rows and any warnings
 */
function validateTimeSeriesOrder(headers, rows, dateColName) {
  if (!dateColName || !headers.includes(dateColName)) {
    return { rows, warnings: [], sorted: false };
  }
  
  const dateIdx = headers.indexOf(dateColName);
  const warnings = [];
  
  // Check if already in order
  let isOrdered = true;
  let prevDate = null;
  
  for (let i = 0; i < rows.length; i++) {
    const dateVal = String(rows[i][dateIdx]).trim();
    const parsed = new Date(dateVal);
    
    if (isNaN(parsed.getTime())) {
      // Check if sequential number
      const num = parseInt(dateVal);
      if (!isNaN(num)) {
        if (prevDate !== null && num <= prevDate) {
          isOrdered = false;
        }
        prevDate = num;
      } else {
        warnings.push(`Row ${i + 1}: Unable to parse date "${dateVal}"`);
      }
      continue;
    }
    
    if (prevDate !== null && parsed.getTime() < prevDate) {
      isOrdered = false;
    }
    prevDate = parsed.getTime();
  }
  
  if (!isOrdered) {
    warnings.push('Data may not be in chronological order. Time series models assume sequential ordering.');
  }
  
  return { rows, warnings, sorted: isOrdered };
}

// Utility functions
function formatAlphaValue(alpha) {
  if (!isFinite(alpha)) return '';
  const clamped = Math.min(0.25, Math.max(0.0005, alpha));
  if (clamped >= 0.1) return clamped.toFixed(2);
  if (clamped >= 0.01) return clamped.toFixed(3);
  return clamped.toFixed(4);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(val, decimals = 4) {
  if (val === null || val === undefined || !isFinite(val)) return '&ndash;';
  return val.toFixed(decimals);
}

function getModelOrder() {
  const p = parseInt(document.getElementById('arimax-p')?.value) || 1;
  const d = parseInt(document.getElementById('arimax-d')?.value) || 1;
  const q = parseInt(document.getElementById('arimax-q')?.value) || 1;
  return [p, d, q];
}

function getConfidenceLevel() {
  const alpha = parseFloat(document.getElementById('arimax-alpha')?.value) || 0.05;
  return 1 - alpha;
}

// Loading overlay
function showLoading() {
  const overlay = document.getElementById('arimax-loading-overlay');
  if (overlay) overlay.classList.add('active');
  const runButton = document.getElementById('arimax-run-model');
  if (runButton) {
    runButton.disabled = true;
    runButton.textContent = 'Fitting model...';
  }
}

function hideLoading() {
  const overlay = document.getElementById('arimax-loading-overlay');
  if (overlay) overlay.classList.remove('active');
  const runButton = document.getElementById('arimax-run-model');
  if (runButton) {
    runButton.disabled = false;
    runButton.textContent = 'Fit ARIMAX Model';
  }
}

// Timestamp hydration
function hydrateTimestamps() {
  const created = document.getElementById('created-date');
  const modified = document.getElementById('modified-date');
  if (created) created.textContent = new Date(CREATED_DATE).toLocaleDateString();
  if (modified) modified.textContent = modifiedDate;
}

// CSV parsing (using shared utility if available)
function parseMixedDelimitedText(text, maxRows = ARIMAX_UPLOAD_LIMIT) {
  if (typeof window.CSVUtils !== 'undefined' && typeof window.CSVUtils.parseMixedDelimitedText === 'function') {
    return window.CSVUtils.parseMixedDelimitedText(text, maxRows);
  }
  
  // Fallback simple parser
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('File must have a header row and at least one data row.');
  
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = [];
  
  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    const values = lines[i].split(delimiter).map(v => {
      const trimmed = v.trim().replace(/^["']|["']$/g, '');
      const num = parseFloat(trimmed);
      return isNaN(num) ? trimmed : num;
    });
    if (values.length === headers.length) {
      rows.push(values);
    }
  }
  
  return { headers, rows };
}

// Data file download helper
function downloadTextFile(filename, content, options = {}) {
  const mimeType = options.mimeType || 'text/csv';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Setup functions
function setupScenarioSelect() {
  const select = document.getElementById('scenario-select');
  const description = document.getElementById('scenario-description');
  if (!select) return;

  ARIMAX_SCENARIOS.forEach(entry => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.label;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const selected = ARIMAX_SCENARIOS.find(item => item.id === select.value);
    if (!selected) {
      updateScenarioDownload(null);
      currentScenarioName = null;
      currentDataSource = 'manual';
      return;
    }

    // Track scenario selection
    currentScenarioName = selected.label;
    currentDataSource = 'scenario';

    // Load scenario description
    if (window.fetch && selected.file) {
      fetch(selected.file, { cache: 'no-cache' })
        .then(resp => resp.ok ? resp.text() : Promise.reject())
        .then(text => {
          if (description) description.innerHTML = text;
        })
        .catch(() => {});
    }

    // Load dataset
    if (window.fetch && selected.datasetPath) {
      const feedback = document.getElementById('arimax-upload-feedback');
      if (feedback) {
        feedback.textContent = 'Loading scenario dataset…';
        feedback.classList.remove('success', 'error');
      }

      fetch(selected.datasetPath, { cache: 'no-cache' })
        .then(resp => resp.ok ? resp.text() : Promise.reject())
        .then(text => {
          const { headers, rows } = parseMixedDelimitedText(text, ARIMAX_UPLOAD_LIMIT);
          arimaxDataset = { headers, rows };
          updateScenarioDownload({
            filename: selected.datasetPath.split('/').pop(),
            content: text,
            mimeType: 'text/csv'
          });
          if (feedback) {
            feedback.textContent = `Loaded ${rows.length} rows with ${headers.length} columns.`;
            feedback.classList.add('success');
          }
          populateColumnSelectors();
          
          // Track scenario loading
          if (typeof markScenarioLoaded === 'function') {
            markScenarioLoaded(selected.label);
          }
        })
        .catch(() => {
          if (feedback) {
            feedback.textContent = 'Unable to load scenario dataset.';
            feedback.classList.add('error');
          }
        });
    }
  });
}

let activeScenarioDataset = null;

function updateScenarioDownload(dataset) {
  const button = document.getElementById('scenario-download');
  activeScenarioDataset = dataset;
  if (!button) return;
  if (dataset) {
    button.classList.remove('hidden');
    button.disabled = false;
  } else {
    button.classList.add('hidden');
    button.disabled = true;
  }
}

function setupScenarioDownloadButton() {
  const button = document.getElementById('scenario-download');
  if (!button) return;
  button.addEventListener('click', () => {
    if (!activeScenarioDataset) return;
    downloadTextFile(
      activeScenarioDataset.filename,
      activeScenarioDataset.content,
      { mimeType: activeScenarioDataset.mimeType || 'text/csv' }
    );
  });
}

function setupDataUpload() {
  const feedback = document.getElementById('arimax-upload-feedback');
  const templateButton = document.getElementById('arimax-template-download');

  const setFeedback = (message, status = '') => {
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (status === 'success' || status === 'error') {
      feedback.classList.add(status);
    }
  };

  const handleFile = file => {
    if (!file) return;
    setFeedback('Loading dataset…', '');
    
    // Track as file upload
    currentScenarioName = null;
    currentDataSource = 'upload';

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const { headers, rows } = parseMixedDelimitedText(text, ARIMAX_UPLOAD_LIMIT);
        arimaxDataset = { headers, rows };
        setFeedback(`Loaded ${rows.length} rows with ${headers.length} columns.`, 'success');
        populateColumnSelectors();
        
        // Track file upload
        if (typeof markDataUploaded === 'function') {
          markDataUploaded(file.name || 'uploaded_file.csv');
        }
      } catch (error) {
        setFeedback(error.message || 'Unable to parse file.', 'error');
      }
    };
    reader.onerror = () => setFeedback('Unable to read the file.', 'error');
    reader.readAsText(file);
  };

  // Template download
  if (templateButton) {
    templateButton.addEventListener('click', event => {
      event.preventDefault();
      downloadTextFile('arimax_template.csv', TEMPLATE_CSV, { mimeType: 'text/csv' });
    });
  }

  // Setup dropzone using shared utility
  if (window.UIUtils && typeof window.UIUtils.initDropzone === 'function') {
    window.UIUtils.initDropzone({
      dropzoneId: 'arimax-dropzone',
      inputId: 'arimax-input',
      browseId: 'arimax-browse',
      onFile: handleFile,
      onError: message => setFeedback(message, 'error')
    });
  } else {
    // Fallback: basic file input handler
    const input = document.getElementById('arimax-input');
    const browse = document.getElementById('arimax-browse');
    const dropzone = document.getElementById('arimax-dropzone');
    
    if (input) {
      input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
          handleFile(input.files[0]);
        }
      });
    }
    
    if (browse && input) {
      browse.addEventListener('click', () => input.click());
    }
    
    if (dropzone && input) {
      dropzone.addEventListener('click', e => {
        if (e.target !== browse) input.click();
      });
      dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
      });
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }
  }
}

function populateColumnSelectors() {
  const dateSelect = document.getElementById('arimax-date-select');
  const outcomeSelect = document.getElementById('arimax-outcome-select');
  const exogList = document.getElementById('arimax-exog-list');
  
  if (!dateSelect || !outcomeSelect || !exogList) return;
  
  const { headers, rows } = arimaxDataset;
  
  // Clear existing options
  dateSelect.innerHTML = '<option value="">Select date column</option>';
  outcomeSelect.innerHTML = '<option value="">Select outcome variable</option>';
  exogList.innerHTML = '';
  
  arimaxDateColumn = null;
  arimaxOutcomeColumn = null;
  arimaxExogColumns = [];
  
  if (!headers.length || !rows.length) {
    exogList.innerHTML = '<p class="muted">Upload data to select exogenous predictors.</p>';
    return;
  }
  
  // Identify column types
  headers.forEach((header, idx) => {
    // Check if column looks like a date
    const sampleValues = rows.slice(0, 10).map(row => row[idx]);
    const looksLikeDate = sampleValues.some(v => {
      if (typeof v === 'string') {
        return /\d{4}[-/]\d{2}/.test(v) || /\d{2}[-/]\d{2}[-/]\d{4}/.test(v);
      }
      return false;
    });
    
    // Check if column is numeric
    const isNumeric = sampleValues.every(v => v === null || v === '' || !isNaN(parseFloat(v)));
    
    // Add to date selector
    const dateOpt = document.createElement('option');
    dateOpt.value = header;
    dateOpt.textContent = header + (looksLikeDate ? ' (date detected)' : '');
    dateSelect.appendChild(dateOpt);
    
    // Add to outcome selector if numeric
    if (isNumeric) {
      const outcomeOpt = document.createElement('option');
      outcomeOpt.value = header;
      outcomeOpt.textContent = header;
      outcomeSelect.appendChild(outcomeOpt);
    }
  });
  
  // Auto-select date column if detected
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    if (lowerHeader === 'date' || lowerHeader === 'time' || lowerHeader === 'period' || lowerHeader === 'month') {
      dateSelect.value = header;
      arimaxDateColumn = header;
    }
  });
  
  // Event listeners
  dateSelect.addEventListener('change', () => {
    arimaxDateColumn = dateSelect.value || null;
    updateExogList();
  });
  
  outcomeSelect.addEventListener('change', () => {
    arimaxOutcomeColumn = outcomeSelect.value || null;
    updateExogList();
    updateSummaryStats();
  });
  
  updateExogList();
}

function updateExogList() {
  const exogList = document.getElementById('arimax-exog-list');
  if (!exogList) return;
  
  const { headers, rows } = arimaxDataset;
  exogList.innerHTML = '';
  arimaxExogColumns = [];
  
  if (!headers.length) {
    exogList.innerHTML = '<p class="muted">Upload data to select exogenous predictors.</p>';
    return;
  }
  
  let hasExog = false;
  
  headers.forEach(header => {
    // Skip date and outcome columns
    if (header === arimaxDateColumn || header === arimaxOutcomeColumn) return;
    
    // Check if column is numeric
    const colIdx = headers.indexOf(header);
    const sampleValues = rows.slice(0, 20).map(row => row[colIdx]);
    const isNumeric = sampleValues.every(v => v === null || v === '' || !isNaN(parseFloat(v)));
    
    if (!isNumeric) return;
    
    hasExog = true;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'predictor-row';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'predictor-toggle';
    checkbox.value = header;
    checkbox.id = `exog-${header}`;
    
    const label = document.createElement('label');
    label.htmlFor = `exog-${header}`;
    label.className = 'predictor-label';
    label.textContent = header;
    
    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    exogList.appendChild(wrapper);
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!arimaxExogColumns.includes(header)) {
          arimaxExogColumns.push(header);
        }
      } else {
        arimaxExogColumns = arimaxExogColumns.filter(c => c !== header);
      }
    });
  });
  
  if (!hasExog) {
    exogList.innerHTML = '<p class="muted">No numeric columns available as exogenous predictors.</p>';
  }
}

function updateSummaryStats() {
  const outcomeBody = document.getElementById('arimax-outcome-stats-body');
  const exogBody = document.getElementById('arimax-exog-stats-body');
  
  if (!outcomeBody || !exogBody) return;
  
  const { headers, rows } = arimaxDataset;
  
  if (!arimaxOutcomeColumn || !rows.length) {
    outcomeBody.innerHTML = '<tr><td colspan="2">Provide data to see summary statistics.</td></tr>';
    exogBody.innerHTML = '<tr><td colspan="5">Provide data to see predictor statistics.</td></tr>';
    return;
  }
  
  // Outcome stats
  const outcomeIdx = headers.indexOf(arimaxOutcomeColumn);
  const outcomeValues = rows.map(row => parseFloat(row[outcomeIdx])).filter(v => isFinite(v));
  
  if (outcomeValues.length > 0) {
    const mean = outcomeValues.reduce((a, b) => a + b, 0) / outcomeValues.length;
    const sorted = [...outcomeValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = outcomeValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (outcomeValues.length - 1);
    const stdDev = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    outcomeBody.innerHTML = `
      <tr><td>N</td><td>${outcomeValues.length}</td></tr>
      <tr><td>Mean</td><td>${mean.toFixed(2)}</td></tr>
      <tr><td>Median</td><td>${median.toFixed(2)}</td></tr>
      <tr><td>Std. Dev.</td><td>${stdDev.toFixed(2)}</td></tr>
      <tr><td>Min</td><td>${min.toFixed(2)}</td></tr>
      <tr><td>Max</td><td>${max.toFixed(2)}</td></tr>
    `;
  }
  
  // Exog stats (show all numeric columns except outcome)
  const exogStats = [];
  headers.forEach(header => {
    if (header === arimaxDateColumn || header === arimaxOutcomeColumn) return;
    const colIdx = headers.indexOf(header);
    const values = rows.map(row => parseFloat(row[colIdx])).filter(v => isFinite(v));
    if (values.length === 0) return;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);
    const sorted = [...values].sort((a, b) => a - b);
    
    exogStats.push({
      name: header,
      mean: mean.toFixed(2),
      std: stdDev.toFixed(2),
      min: sorted[0].toFixed(2),
      max: sorted[sorted.length - 1].toFixed(2)
    });
  });
  
  if (exogStats.length > 0) {
    exogBody.innerHTML = exogStats.map(s => `
      <tr>
        <td>${escapeHtml(s.name)}</td>
        <td>${s.mean}</td>
        <td>${s.std}</td>
        <td>${s.min}</td>
        <td>${s.max}</td>
      </tr>
    `).join('');
  } else {
    exogBody.innerHTML = '<tr><td colspan="5">No exogenous predictors available.</td></tr>';
  }
}

function setupConfidenceButtons() {
  const buttons = document.querySelectorAll('.confidence-button');
  const alphaInput = document.getElementById('arimax-alpha');
  
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const level = parseFloat(button.dataset.level);
      if (!isFinite(level)) return;
      
      // Update alpha input for coefficient significance
      const alpha = 1 - level;
      if (alphaInput) alphaInput.value = formatAlphaValue(alpha);
      
      // Update active state for this button group only
      const parent = button.closest('.confidence-buttons');
      if (parent) {
        parent.querySelectorAll('.confidence-button').forEach(btn => {
          btn.classList.toggle('active', btn === button);
        });
      }
      
      // Enable update forecast button if model has been run
      enableUpdateForecastIfReady();
    });
  });
  
  if (alphaInput) {
    alphaInput.addEventListener('change', () => {
      const value = parseFloat(alphaInput.value);
      if (!isFinite(value)) return;
      alphaInput.value = formatAlphaValue(value);
      
      const targetLevel = 1 - value;
      buttons.forEach(btn => {
        const level = parseFloat(btn.dataset.level);
        btn.classList.toggle('active', Math.abs(level - targetLevel) < 1e-6);
      });
    });
  }
}

function setupForecastSlider() {
  const slider = document.getElementById('arimax-forecast-periods');
  const display = document.getElementById('forecast-periods-display');
  
  if (slider && display) {
    // Update display on input
    slider.addEventListener('input', () => {
      const val = parseInt(slider.value);
      display.textContent = val === 0 ? 'No forecast' : val === 1 ? '1 period' : `${val} periods`;
      enableUpdateForecastIfReady();
    });
    
    // Initial display
    const initialVal = parseInt(slider.value);
    display.textContent = initialVal === 0 ? 'No forecast' : initialVal === 1 ? '1 period' : `${initialVal} periods`;
  }
}

function enableUpdateForecastIfReady() {
  const updateBtn = document.getElementById('arimax-update-forecast');
  if (updateBtn && arimaxLastResult) {
    updateBtn.disabled = false;
  }
}

function setupUpdateForecastButton() {
  const updateBtn = document.getElementById('arimax-update-forecast');
  if (updateBtn) {
    updateBtn.addEventListener('click', updateForecast);
  }
}

function setupRunButton() {
  const runButton = document.getElementById('arimax-run-model');
  if (runButton) {
    runButton.addEventListener('click', runArimaxModel);
  }
  
  const stationarityButton = document.getElementById('arimax-check-stationarity');
  if (stationarityButton) {
    stationarityButton.addEventListener('click', checkStationarity);
  }
  
  // Setup the update forecast button
  setupUpdateForecastButton();
}

/**
 * Update forecast with new parameters without refitting the entire model
 * Re-runs the API with same data but different forecast periods/confidence level
 */
async function updateForecast() {
  const statusEl = document.getElementById('arimax-run-status');
  const updateBtn = document.getElementById('arimax-update-forecast');
  
  if (!arimaxLastResult || !arimaxOutcomeColumn) {
    if (statusEl) statusEl.textContent = 'Please fit the model first.';
    return;
  }
  
  // Disable button during update
  if (updateBtn) updateBtn.disabled = true;
  
  showLoading();
  
  try {
    const { headers, rows } = arimaxDataset;
    
    // Get current settings
    const forecastSteps = parseInt(document.getElementById('arimax-forecast-periods')?.value) || 0;
    const confidenceLevel = getConfidenceLevel();
    
    // Prepare data (same as original fit)
    const outcomeIdx = headers.indexOf(arimaxOutcomeColumn);
    const dateIdx = arimaxDateColumn ? headers.indexOf(arimaxDateColumn) : -1;
    
    const endog = rows.map(row => {
      const val = parseFloat(row[outcomeIdx]);
      return isFinite(val) ? val : null;
    });
    
    const dateLabels = dateIdx >= 0 
      ? rows.map(row => String(row[dateIdx]))
      : rows.map((_, i) => `t${i + 1}`);
    
    // Prepare exogenous variables
    let exog = null;
    let exogNames = [];
    
    if (arimaxExogColumns.length > 0) {
      exog = rows.map(row => {
        return arimaxExogColumns.map(col => {
          const idx = headers.indexOf(col);
          const val = parseFloat(row[idx]);
          return isFinite(val) ? val : 0;
        });
      });
      exogNames = arimaxExogColumns;
    }
    
    const order = getModelOrder();
    
    // Build request payload
    const payload = {
      endog: endog,
      order: order,
      forecast_steps: forecastSteps,
      confidence_level: confidenceLevel,
      date_labels: dateLabels,
      endog_name: arimaxOutcomeColumn
    };
    
    if (exog) {
      payload.exog = exog;
      payload.exog_names = exogNames;
      // Use user-defined exog values if available, otherwise use last observed values
      if (Object.keys(forecastExogSettings).length > 0) {
        payload.exog_forecast = buildExogForecast(forecastSteps);
      } else {
        const lastExog = exog[exog.length - 1];
        payload.exog_forecast = Array(forecastSteps).fill(lastExog);
      }
    }
    
    if (statusEl) statusEl.textContent = 'Updating forecast...';
    
    const response = await fetch(`${API_BASE_URL}/arimax/fit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.detail || 'Failed to update forecast');
    }
    
    arimaxLastResult = result;
    
    // Update displays
    updateModelResults(result);
    renderForecastChart(result);
    
    if (statusEl) {
      const confPct = Math.round(confidenceLevel * 100);
      statusEl.textContent = `Forecast updated: ${forecastSteps} periods with ${confPct}% confidence interval.`;
    }
    
  } catch (error) {
    console.error('Forecast update error:', error);
    if (statusEl) statusEl.textContent = `Error: ${error.message}`;
  } finally {
    hideLoading();
    if (updateBtn) updateBtn.disabled = false;
  }
}

function setupDownloadButton() {
  const downloadButton = document.getElementById('arimax-download-results');
  if (downloadButton) {
    downloadButton.addEventListener('click', downloadForecasts);
  }
}

/**
 * Populate the forecast exogenous controls based on selected exog columns
 * Detects if a variable is binary (0/1) or continuous and creates appropriate input
 */
function populateForecastExogControls() {
  const controlsContainer = document.getElementById('forecast-exog-controls');
  const inputsContainer = document.getElementById('forecast-exog-inputs');
  
  if (!controlsContainer || !inputsContainer) return;
  
  // Hide if no exogenous variables
  if (arimaxExogColumns.length === 0) {
    controlsContainer.classList.add('hidden');
    return;
  }
  
  // Show controls
  controlsContainer.classList.remove('hidden');
  
  const { headers, rows } = arimaxDataset;
  
  // Build inputs for each exogenous variable
  let inputsHtml = '';
  
  arimaxExogColumns.forEach(colName => {
    const colIdx = headers.indexOf(colName);
    const values = rows.map(row => parseFloat(row[colIdx])).filter(v => isFinite(v));
    
    // Detect if binary (only 0s and 1s)
    const uniqueVals = [...new Set(values)];
    const isBinary = uniqueVals.length <= 2 && uniqueVals.every(v => v === 0 || v === 1);
    
    // Calculate stats for continuous variables
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Get current setting or default
    const currentValue = forecastExogSettings[colName] ?? (isBinary ? 0 : mean);
    
    if (isBinary) {
      // Create toggle switch for binary
      const isOn = currentValue === 1;
      inputsHtml += `
        <div class="forecast-exog-item">
          <label>${escapeHtml(colName)}</label>
          <p class="exog-type-hint">Binary (0/1) - Toggle on/off for forecast period</p>
          <div class="toggle-switch">
            <input type="checkbox" 
                   id="forecast-exog-${colName}" 
                   data-exog="${escapeHtml(colName)}" 
                   data-type="binary"
                   ${isOn ? 'checked' : ''}>
            <span class="toggle-label">${isOn ? 'ON (1)' : 'OFF (0)'}</span>
          </div>
        </div>
      `;
    } else {
      // Create number input for continuous
      inputsHtml += `
        <div class="forecast-exog-item">
          <label>${escapeHtml(colName)}</label>
          <p class="exog-type-hint">Continuous (range: ${min.toFixed(0)} - ${max.toFixed(0)}, avg: ${mean.toFixed(0)})</p>
          <input type="number" 
                 id="forecast-exog-${colName}" 
                 data-exog="${escapeHtml(colName)}" 
                 data-type="continuous"
                 value="${currentValue.toFixed(0)}"
                 min="${min}"
                 max="${max * 2}"
                 step="${(max - min) > 100 ? 100 : 1}">
        </div>
      `;
    }
  });
  
  inputsContainer.innerHTML = inputsHtml;
  
  // Add event listeners for toggle switches to update label
  inputsContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const label = e.target.closest('.toggle-switch').querySelector('.toggle-label');
      if (label) {
        label.textContent = e.target.checked ? 'ON (1)' : 'OFF (0)';
      }
    });
  });
}

/**
 * Get the current forecast exogenous settings from the UI
 */
function getForecastExogValues() {
  const values = {};
  
  document.querySelectorAll('#forecast-exog-inputs input[data-exog]').forEach(input => {
    const colName = input.dataset.exog;
    const type = input.dataset.type;
    
    if (type === 'binary') {
      values[colName] = input.checked ? 1 : 0;
    } else {
      values[colName] = parseFloat(input.value) || 0;
    }
  });
  
  return values;
}

/**
 * Build the exog_forecast array for the API based on user settings
 */
function buildExogForecast(forecastSteps) {
  if (arimaxExogColumns.length === 0) return null;
  
  const exogValues = getForecastExogValues();
  
  // Build array of arrays for each forecast step
  const exogForecast = [];
  for (let i = 0; i < forecastSteps; i++) {
    const row = arimaxExogColumns.map(col => exogValues[col] || 0);
    exogForecast.push(row);
  }
  
  return exogForecast;
}

/**
 * Setup the apply forecast scenario button
 */
function setupForecastScenarioButton() {
  const applyBtn = document.getElementById('apply-forecast-scenario');
  if (applyBtn) {
    applyBtn.addEventListener('click', applyForecastScenario);
  }
}

/**
 * Apply the forecast scenario with user-defined exog values
 */
async function applyForecastScenario() {
  const statusEl = document.getElementById('arimax-run-status');
  
  if (!arimaxLastResult || !arimaxOutcomeColumn) {
    if (statusEl) statusEl.textContent = 'Please fit the model first.';
    return;
  }
  
  // Save current settings
  forecastExogSettings = getForecastExogValues();
  
  showLoading();
  
  try {
    const { headers, rows } = arimaxDataset;
    
    // Get current settings
    const forecastSteps = parseInt(document.getElementById('arimax-forecast-periods')?.value) || 0;
    const confidenceLevel = getConfidenceLevel();
    
    if (forecastSteps === 0) {
      if (statusEl) statusEl.textContent = 'Set forecast periods > 0 to generate forecasts.';
      hideLoading();
      return;
    }
    
    // Prepare data (same as original fit)
    const outcomeIdx = headers.indexOf(arimaxOutcomeColumn);
    const dateIdx = arimaxDateColumn ? headers.indexOf(arimaxDateColumn) : -1;
    
    const endog = rows.map(row => {
      const val = parseFloat(row[outcomeIdx]);
      return isFinite(val) ? val : null;
    });
    
    const dateLabels = dateIdx >= 0 
      ? rows.map(row => String(row[dateIdx]))
      : rows.map((_, i) => `t${i + 1}`);
    
    // Prepare exogenous variables from historical data
    let exog = null;
    let exogNames = [];
    
    if (arimaxExogColumns.length > 0) {
      exog = rows.map(row => {
        return arimaxExogColumns.map(col => {
          const idx = headers.indexOf(col);
          const val = parseFloat(row[idx]);
          return isFinite(val) ? val : 0;
        });
      });
      exogNames = arimaxExogColumns;
    }
    
    const order = getModelOrder();
    
    // Build request payload
    const payload = {
      endog: endog,
      order: order,
      forecast_steps: forecastSteps,
      confidence_level: confidenceLevel,
      date_labels: dateLabels,
      endog_name: arimaxOutcomeColumn
    };
    
    if (exog) {
      payload.exog = exog;
      payload.exog_names = exogNames;
      // Use user-defined exog values for forecast period
      payload.exog_forecast = buildExogForecast(forecastSteps);
    }
    
    if (statusEl) statusEl.textContent = 'Updating forecast with scenario values...';
    
    const response = await fetch(`${API_BASE_URL}/arimax/fit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.detail || 'Failed to update forecast');
    }
    
    arimaxLastResult = result;
    
    // Update displays
    updateModelResults(result);
    renderForecastChart(result);
    
    // Show what exog values were used
    const exogSummary = Object.entries(forecastExogSettings)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    
    if (statusEl) {
      const confPct = Math.round(confidenceLevel * 100);
      statusEl.textContent = `Forecast updated: ${forecastSteps} periods, ${confPct}% CI. Scenario: ${exogSummary}`;
    }
    
  } catch (error) {
    console.error('Forecast scenario error:', error);
    if (statusEl) statusEl.textContent = `Error: ${error.message}`;
  } finally {
    hideLoading();
  }
}

// API calls
async function checkStationarity() {
  const statusEl = document.getElementById('arimax-run-status');
  const adfResults = document.getElementById('arimax-adf-results');
  
  if (!arimaxOutcomeColumn) {
    if (statusEl) statusEl.textContent = 'Please select an outcome variable first.';
    return;
  }
  
  const { headers, rows } = arimaxDataset;
  const outcomeIdx = headers.indexOf(arimaxOutcomeColumn);
  const series = rows.map(row => {
    const val = parseFloat(row[outcomeIdx]);
    return isFinite(val) ? val : null;
  });
  
  if (statusEl) statusEl.textContent = 'Running stationarity test...';
  
  try {
    const response = await fetch(`${API_BASE_URL}/arimax/diagnostics/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        series: series,
        max_lags: 20,
        diff_order: parseInt(document.getElementById('arimax-d')?.value) || 0
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.detail || 'API error');
    }
    
    // Update ADF results display
    if (adfResults && result.original) {
      const adf = result.original.adf_test;
      const isStationary = adf.is_stationary;
      const pValue = adf.p_value;
      
      adfResults.innerHTML = `
        <table class="summary-table">
          <tr><td>ADF Statistic</td><td>${formatNumber(adf.statistic)}</td></tr>
          <tr><td>p-value</td><td>${formatNumber(pValue)}</td></tr>
          <tr><td>Lags Used</td><td>${adf.lags_used}</td></tr>
          <tr><td>Observations</td><td>${adf.n_obs}</td></tr>
          <tr>
            <td>Result</td>
            <td class="${isStationary ? 'success-text' : 'warning-text'}">
              ${isStationary ? 'Series appears stationary (reject unit root)' : 'Series appears non-stationary (cannot reject unit root)'}
            </td>
          </tr>
        </table>
        <p class="hint">
          Critical values: 1%: ${formatNumber(adf.critical_values['1%'])}, 
          5%: ${formatNumber(adf.critical_values['5%'])}, 
          10%: ${formatNumber(adf.critical_values['10%'])}
        </p>
      `;
      
      // Show differenced results if available
      if (result.differenced) {
        const diffAdf = result.differenced.adf_test;
        adfResults.innerHTML += `
          <h5>After Differencing (d=${result.differenced.diff_order})</h5>
          <table class="summary-table">
            <tr><td>ADF Statistic</td><td>${formatNumber(diffAdf.statistic)}</td></tr>
            <tr><td>p-value</td><td>${formatNumber(diffAdf.p_value)}</td></tr>
            <tr>
              <td>Result</td>
              <td class="${diffAdf.is_stationary ? 'success-text' : 'warning-text'}">
                ${diffAdf.is_stationary ? 'Differenced series is stationary' : 'Still non-stationary - consider higher d'}
              </td>
            </tr>
          </table>
        `;
      }
    }
    
    if (statusEl) statusEl.textContent = 'Stationarity test complete.';
    
  } catch (error) {
    console.error('Stationarity test error:', error);
    if (statusEl) statusEl.textContent = `Error: ${error.message}`;
    if (adfResults) adfResults.innerHTML = `<p class="error">Failed to run test: ${escapeHtml(error.message)}</p>`;
  }
}

async function runArimaxModel() {
  // Track button click
  if (typeof markRunAttempted === 'function') {
    markRunAttempted();
  }
  
  const statusEl = document.getElementById('arimax-run-status');
  
  if (!arimaxOutcomeColumn) {
    if (statusEl) statusEl.textContent = 'Please select an outcome variable.';
    return;
  }
  
  const { headers, rows } = arimaxDataset;
  
  if (rows.length < 10) {
    if (statusEl) statusEl.textContent = 'Need at least 10 observations for ARIMAX.';
    return;
  }
  
  showLoading();
  
  try {
    // Prepare data
    const outcomeIdx = headers.indexOf(arimaxOutcomeColumn);
    const dateIdx = arimaxDateColumn ? headers.indexOf(arimaxDateColumn) : -1;
    
    const endog = rows.map(row => {
      const val = parseFloat(row[outcomeIdx]);
      return isFinite(val) ? val : null;
    });
    
    const dateLabels = dateIdx >= 0 
      ? rows.map(row => String(row[dateIdx]))
      : rows.map((_, i) => `t${i + 1}`);
    
    // Prepare exogenous variables
    let exog = null;
    let exogNames = [];
    
    if (arimaxExogColumns.length > 0) {
      exog = rows.map(row => {
        return arimaxExogColumns.map(col => {
          const idx = headers.indexOf(col);
          const val = parseFloat(row[idx]);
          return isFinite(val) ? val : 0;
        });
      });
      exogNames = arimaxExogColumns;
    }
    
    const order = getModelOrder();
    const forecastSteps = parseInt(document.getElementById('arimax-forecast-periods')?.value) || 6;
    const confidenceLevel = getConfidenceLevel();
    
    // Build request payload
    const payload = {
      endog: endog,
      order: order,
      forecast_steps: forecastSteps,
      confidence_level: confidenceLevel,
      date_labels: dateLabels,
      endog_name: arimaxOutcomeColumn
    };
    
    if (exog) {
      payload.exog = exog;
      payload.exog_names = exogNames;
      // For forecasting, we'll use the last known exog values (simple extension)
      // In a real app, you'd want the user to provide future exog values
      const lastExog = exog[exog.length - 1];
      payload.exog_forecast = Array(forecastSteps).fill(lastExog);
    }
    
    if (statusEl) statusEl.textContent = 'Fitting model...';
    
    const response = await fetch(`${API_BASE_URL}/arimax/fit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.detail || 'Failed to fit model');
    }
    
    arimaxLastResult = result;
    
    // Update all displays
    updateModelResults(result);
    renderForecastChart(result);
    renderResidualsChart(result);
    renderAcfPacfCharts(result);
    updateDiagnostics(result);
    updateSummaryStats();
    
    // Show and populate forecast exogenous controls if we have exog variables
    populateForecastExogControls();
    
    hasSuccessfulRun = true;
    checkAndTrackUsage();
    
    // Track successful run
    if (typeof markRunSuccessful === 'function') {
      const order = result.model_spec ? `(${result.model_spec.p},${result.model_spec.d},${result.model_spec.q})` : 'auto';
      markRunSuccessful(
        {
          order: order,
          has_exog: result.model_spec?.has_exog || false,
          n_exog: arimaxExogColumns.length,
          n_obs: result.observed?.values?.length || 0,
          forecast_steps: result.model_spec?.forecast_steps || 0
        },
        `AIC=${result.model_stats.aic?.toFixed(2)}, BIC=${result.model_stats.bic?.toFixed(2)}, RMSE=${result.model_stats.rmse?.toFixed(2)}`
      );
    }
    
    if (statusEl) {
      statusEl.textContent = `Model fitted successfully. AIC: ${result.model_stats.aic?.toFixed(2)}, RMSE: ${result.model_stats.rmse?.toFixed(2)}`;
    }
    
  } catch (error) {
    console.error('ARIMAX model error:', error);
    if (statusEl) statusEl.textContent = `Error: ${error.message}`;
  } finally {
    hideLoading();
  }
}

function updateModelResults(result) {
  // Update metrics panel
  const specEl = document.getElementById('arimax-spec-value');
  const aicEl = document.getElementById('arimax-aic-value');
  const bicEl = document.getElementById('arimax-bic-value');
  const rmseEl = document.getElementById('arimax-rmse-value');
  const maeEl = document.getElementById('arimax-mae-value');
  
  const spec = result.model_spec;
  const stats = result.model_stats;
  
  if (specEl) {
    const exogText = spec.has_exog ? ` with exog: ${spec.exog_names.join(', ')}` : '';
    specEl.textContent = `ARIMA(${spec.order.join(',')})${exogText}`;
  }
  if (aicEl) aicEl.textContent = formatNumber(stats.aic, 2);
  if (bicEl) bicEl.textContent = formatNumber(stats.bic, 2);
  if (rmseEl) rmseEl.textContent = formatNumber(stats.rmse, 4);
  if (maeEl) maeEl.textContent = formatNumber(stats.mae, 4);
  
  // Update coefficient table
  const coefBody = document.getElementById('arimax-coef-table-body');
  if (coefBody && result.coefficients) {
    coefBody.innerHTML = result.coefficients.map(coef => `
      <tr class="${coef.is_significant ? 'significant' : ''}">
        <td>${escapeHtml(coef.name)}</td>
        <td>${formatNumber(coef.estimate, 4)}</td>
        <td>${formatNumber(coef.std_error, 4)}</td>
        <td>${formatNumber(coef.p_value, 4)}</td>
        <td>[${formatNumber(coef.ci_lower, 4)}, ${formatNumber(coef.ci_upper, 4)}]</td>
      </tr>
    `).join('');
  }
  
  // Update forecast table
  const forecastBody = document.getElementById('arimax-forecast-table-body');
  if (forecastBody) {
    const forecasts = result.forecasts;
    if (forecasts && forecasts.mean && forecasts.mean.length > 0) {
      const confPct = Math.round(result.model_spec.confidence_level * 100);
      forecastBody.innerHTML = forecasts.mean.map((val, i) => `
        <tr>
          <td>${forecasts.labels[i] || `t+${i + 1}`}</td>
          <td>${formatNumber(val, 2)}</td>
          <td>${formatNumber(forecasts.ci_lower[i], 2)}</td>
          <td>${formatNumber(forecasts.ci_upper[i], 2)}</td>
        </tr>
      `).join('');
      // Update table header to show confidence level
      const forecastTable = forecastBody.closest('table');
      if (forecastTable) {
        const headerRow = forecastTable.querySelector('thead tr');
        if (headerRow) {
          const headers = headerRow.querySelectorAll('th');
          if (headers.length >= 4) {
            headers[2].textContent = `Lower (${confPct}%)`;
            headers[3].textContent = `Upper (${confPct}%)`;
          }
        }
      }
    } else {
      forecastBody.innerHTML = '<tr><td colspan="4" class="muted">No forecast periods selected. Use the slider above to generate forecasts.</td></tr>';
    }
  }
  
  // Update APA report
  const apaEl = document.getElementById('arimax-apa-report');
  if (apaEl) {
    const n = stats.n_obs;
    const orderStr = `(${spec.order.join(', ')})`;
    const exogCount = spec.exog_names?.length || 0;
    
    let apaText = `An ARIMA${orderStr} model`;
    if (exogCount > 0) {
      apaText += ` with ${exogCount} exogenous predictor${exogCount > 1 ? 's' : ''} (${spec.exog_names.join(', ')})`;
    }
    apaText += ` was fitted to ${n} observations of ${spec.endog_name}.`;
    apaText += ` The model achieved AIC = ${stats.aic?.toFixed(2)}, BIC = ${stats.bic?.toFixed(2)}, `;
    apaText += `with RMSE = ${stats.rmse?.toFixed(2)} and MAE = ${stats.mae?.toFixed(2)}.`;
    
    // Add significant coefficient info
    const sigCoefs = result.coefficients.filter(c => c.is_significant && !c.name.includes('sigma'));
    if (sigCoefs.length > 0) {
      apaText += ` Significant coefficients included: `;
      apaText += sigCoefs.map(c => `${c.name} (β = ${c.estimate?.toFixed(3)}, p < .05)`).join('; ');
      apaText += '.';
    }
    
    apaEl.innerHTML = apaText;
  }
  
  // Update managerial report
  const mgrEl = document.getElementById('arimax-managerial-report');
  if (mgrEl) {
    const forecastMean = result.forecasts.mean;
    const lastObserved = result.observed.values[result.observed.values.length - 1];
    const forecastTrend = forecastMean[forecastMean.length - 1] > forecastMean[0] ? 'upward' : 'downward';
    
    let mgrText = `Based on historical ${spec.endog_name} data, the model predicts an ${forecastTrend} trend over the next ${spec.forecast_steps} periods. `;
    
    const avgForecast = forecastMean.reduce((a, b) => a + b, 0) / forecastMean.length;
    const pctChange = lastObserved ? ((avgForecast - lastObserved) / lastObserved * 100) : 0;
    
    mgrText += `The average forecasted value is ${avgForecast.toFixed(2)}, representing a ${Math.abs(pctChange).toFixed(1)}% ${pctChange >= 0 ? 'increase' : 'decrease'} from the last observed value. `;
    
    // Comment on exogenous variables
    if (spec.has_exog) {
      const exogCoefs = result.coefficients.filter(c => spec.exog_names.some(name => c.name.toLowerCase().includes(name.toLowerCase())));
      if (exogCoefs.length > 0) {
        const sigExog = exogCoefs.filter(c => c.is_significant);
        if (sigExog.length > 0) {
          mgrText += `Among the external factors, ${sigExog.map(c => c.name).join(' and ')} show${sigExog.length === 1 ? 's' : ''} a statistically significant relationship with ${spec.endog_name}. `;
        }
      }
    }
    
    mgrEl.innerHTML = mgrText;
  }
}

function renderForecastChart(result) {
  const container = document.getElementById('chart-forecast');
  const note = document.getElementById('forecast-chart-note');
  
  if (!container || !window.Plotly) return;
  
  const observed = result.observed;
  const forecasts = result.forecasts;
  const fitted = result.fitted;
  const confLevel = result.model_spec.confidence_level;
  const confPct = Math.round(confLevel * 100);
  
  // Check if we have forecast data
  const hasForecast = forecasts && forecasts.mean && forecasts.mean.length > 0;
  
  // Create a unified x-axis using indices, with custom tick labels
  const numObserved = observed.values.length;
  const numForecast = hasForecast ? forecasts.mean.length : 0;
  
  // X values for observed (0, 1, 2, ... n-1)
  const observedX = observed.values.map((_, i) => i);
  const fittedX = fitted.values.map((_, i) => i);
  
  // X values for forecast (n, n+1, n+2, ...)
  const forecastX = hasForecast ? forecasts.mean.map((_, i) => numObserved + i) : [];
  
  // Create tick labels
  const allTickVals = [...observedX];
  const allTickText = [...observed.labels];
  
  if (hasForecast) {
    forecastX.forEach((x, i) => {
      allTickVals.push(x);
      allTickText.push(`+${i + 1}`);
    });
  }
  
  const traces = [
    // Observed values
    {
      x: observedX,
      y: observed.values,
      mode: 'lines+markers',
      name: 'Observed',
      line: { color: '#2563eb', width: 2 },
      marker: { size: 6 }
    },
    // Fitted values
    {
      x: fittedX,
      y: fitted.values,
      mode: 'lines',
      name: 'Fitted',
      line: { color: '#059669', width: 2, dash: 'dot' }
    }
  ];
  
  // Add forecast traces only if we have forecast data
  if (hasForecast) {
    // Connect forecast to last observed point
    const lastObservedX = numObserved - 1;
    const lastObservedY = observed.values[observed.values.length - 1];
    
    // Forecast mean - starts from last observed point
    traces.push({
      x: [lastObservedX, ...forecastX],
      y: [lastObservedY, ...forecasts.mean],
      mode: 'lines+markers',
      name: 'Forecast',
      line: { color: '#dc2626', width: 2, dash: 'dash' },
      marker: { size: 6 }
    });
    
    // Confidence interval (as filled area) - also starts from last point
    const ciX = [lastObservedX, ...forecastX, ...forecastX.slice().reverse(), lastObservedX];
    const ciY = [lastObservedY, ...forecasts.ci_upper, ...forecasts.ci_lower.slice().reverse(), lastObservedY];
    
    traces.push({
      x: ciX,
      y: ciY,
      fill: 'toself',
      fillcolor: 'rgba(220, 38, 38, 0.15)',
      line: { color: 'rgba(220, 38, 38, 0.4)', width: 1 },
      name: `${confPct}% CI`,
      showlegend: true,
      hoverinfo: 'skip'
    });
  }
  
  // Only show a subset of tick labels if there are many points
  let tickvals = allTickVals;
  let ticktext = allTickText;
  if (allTickVals.length > 20) {
    // Show every nth tick plus all forecast ticks
    const step = Math.ceil(numObserved / 10);
    tickvals = [];
    ticktext = [];
    for (let i = 0; i < numObserved; i += step) {
      tickvals.push(i);
      ticktext.push(observed.labels[i]);
    }
    // Always show last observed
    if (tickvals[tickvals.length - 1] !== numObserved - 1) {
      tickvals.push(numObserved - 1);
      ticktext.push(observed.labels[numObserved - 1]);
    }
    // Add forecast ticks
    if (hasForecast) {
      forecastX.forEach((x, i) => {
        tickvals.push(x);
        ticktext.push(`+${i + 1}`);
      });
    }
  }
  
  const layout = {
    margin: { t: 30, r: 30, b: 60, l: 60 },
    xaxis: { 
      title: 'Period',
      tickvals: tickvals,
      ticktext: ticktext,
      tickangle: -45
    },
    yaxis: { title: result.model_spec.endog_name || 'Value' },
    legend: { orientation: 'h', y: 1.1 },
    hovermode: 'x unified'
  };
  
  container.classList.remove('chart-placeholder');
  Plotly.newPlot(container, traces, layout, { responsive: true, displaylogo: false });
  
  if (note) {
    if (hasForecast) {
      note.textContent = `Showing ${observed.values.length} historical observations with ${forecasts.mean.length}-period forecast (${confPct}% confidence bands).`;
    } else {
      note.textContent = `Showing ${observed.values.length} historical observations with fitted values. Adjust forecast periods to see predictions.`;
    }
  }
}

function renderResidualsChart(result) {
  const container = document.getElementById('chart-residuals');
  if (!container || !window.Plotly) return;
  
  const residuals = result.residuals;
  
  const traces = [
    {
      x: residuals.labels,
      y: residuals.values,
      mode: 'lines+markers',
      name: 'Residuals',
      line: { color: '#6366f1', width: 1 },
      marker: { size: 4 }
    },
    // Zero line
    {
      x: [residuals.labels[0], residuals.labels[residuals.labels.length - 1]],
      y: [0, 0],
      mode: 'lines',
      name: 'Zero',
      line: { color: '#ef4444', width: 2, dash: 'dash' },
      showlegend: false
    }
  ];
  
  const layout = {
    margin: { t: 30, r: 30, b: 50, l: 60 },
    xaxis: { title: 'Period' },
    yaxis: { title: 'Residual' },
    hovermode: 'x unified'
  };
  
  container.classList.remove('chart-placeholder');
  Plotly.newPlot(container, traces, layout, { responsive: true, displaylogo: false });
}

function renderAcfPacfCharts(result) {
  const acfContainer = document.getElementById('chart-acf');
  const pacfContainer = document.getElementById('chart-pacf');
  
  if (!acfContainer || !pacfContainer || !window.Plotly) return;
  
  const acfPacf = result.post_diagnostics?.residual_acf_pacf;
  if (!acfPacf) return;
  
  const confBound = acfPacf.confidence_bound || 0.2;
  const lags = acfPacf.lags || [];
  
  // ACF chart
  const acfTraces = [
    {
      x: lags,
      y: acfPacf.acf,
      type: 'bar',
      name: 'ACF',
      marker: { color: '#3b82f6' }
    },
    // Upper confidence bound
    {
      x: [lags[0], lags[lags.length - 1]],
      y: [confBound, confBound],
      mode: 'lines',
      line: { color: '#ef4444', dash: 'dash' },
      showlegend: false
    },
    // Lower confidence bound
    {
      x: [lags[0], lags[lags.length - 1]],
      y: [-confBound, -confBound],
      mode: 'lines',
      line: { color: '#ef4444', dash: 'dash' },
      showlegend: false
    }
  ];
  
  const acfLayout = {
    title: { text: 'ACF', font: { size: 14 } },
    margin: { t: 40, r: 20, b: 40, l: 50 },
    xaxis: { title: 'Lag' },
    yaxis: { title: 'ACF', range: [-1, 1] },
    bargap: 0.5
  };
  
  acfContainer.classList.remove('chart-placeholder');
  Plotly.newPlot(acfContainer, acfTraces, acfLayout, { responsive: true, displaylogo: false });
  
  // PACF chart
  const pacfTraces = [
    {
      x: lags,
      y: acfPacf.pacf,
      type: 'bar',
      name: 'PACF',
      marker: { color: '#8b5cf6' }
    },
    {
      x: [lags[0], lags[lags.length - 1]],
      y: [confBound, confBound],
      mode: 'lines',
      line: { color: '#ef4444', dash: 'dash' },
      showlegend: false
    },
    {
      x: [lags[0], lags[lags.length - 1]],
      y: [-confBound, -confBound],
      mode: 'lines',
      line: { color: '#ef4444', dash: 'dash' },
      showlegend: false
    }
  ];
  
  const pacfLayout = {
    title: { text: 'PACF', font: { size: 14 } },
    margin: { t: 40, r: 20, b: 40, l: 50 },
    xaxis: { title: 'Lag' },
    yaxis: { title: 'PACF', range: [-1, 1] },
    bargap: 0.5
  };
  
  pacfContainer.classList.remove('chart-placeholder');
  Plotly.newPlot(pacfContainer, pacfTraces, pacfLayout, { responsive: true, displaylogo: false });
}

function updateDiagnostics(result) {
  const adfEl = document.getElementById('arimax-adf-results');
  const ljungEl = document.getElementById('arimax-ljungbox-results');
  
  // Update ADF results from pre-diagnostics
  if (adfEl && result.pre_diagnostics?.adf_test) {
    const adf = result.pre_diagnostics.adf_test;
    adfEl.innerHTML = `
      <table class="summary-table">
        <tr><td>ADF Statistic</td><td>${formatNumber(adf.statistic)}</td></tr>
        <tr><td>p-value</td><td>${formatNumber(adf.p_value)}</td></tr>
        <tr>
          <td>Result</td>
          <td class="${adf.is_stationary ? 'success-text' : 'warning-text'}">
            ${adf.is_stationary ? 'Series is stationary' : 'Series is non-stationary (differencing applied)'}
          </td>
        </tr>
      </table>
    `;
  }
  
  // Update Ljung-Box results from post-diagnostics
  if (ljungEl && result.post_diagnostics?.ljung_box) {
    const lb = result.post_diagnostics.ljung_box;
    ljungEl.innerHTML = `
      <table class="summary-table">
        <tr><td>Ljung-Box Statistic</td><td>${formatNumber(lb.statistic)}</td></tr>
        <tr><td>p-value (lag ${lb.lags})</td><td>${formatNumber(lb.p_value)}</td></tr>
        <tr>
          <td>Result</td>
          <td class="${lb.no_autocorrelation ? 'success-text' : 'warning-text'}">
            ${lb.no_autocorrelation ? 'No significant autocorrelation in residuals (good)' : 'Significant autocorrelation detected - consider adjusting model order'}
          </td>
        </tr>
      </table>
    `;
  }
}

function downloadForecasts() {
  if (!arimaxLastResult) {
    alert('No results to download. Please fit the model first.');
    return;
  }
  
  const forecasts = arimaxLastResult.forecasts;
  const observed = arimaxLastResult.observed;
  
  // Build CSV content
  let csv = 'type,period,value,ci_lower,ci_upper\n';
  
  // Add observed values
  observed.values.forEach((val, i) => {
    csv += `observed,${observed.labels[i]},${val},,\n`;
  });
  
  // Add forecasts
  forecasts.mean.forEach((val, i) => {
    csv += `forecast,${forecasts.labels[i]},${val},${forecasts.ci_lower[i]},${forecasts.ci_upper[i]}\n`;
  });
  
  downloadTextFile('arimax_forecasts.csv', csv, { mimeType: 'text/csv' });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  hydrateTimestamps();
  setupScenarioSelect();
  setupScenarioDownloadButton();
  setupDataUpload();
  setupConfidenceButtons();
  setupForecastSlider();
  setupRunButton();
  setupDownloadButton();
  setupForecastScenarioButton();
  
  // Initialize engagement tracking
  if (typeof initEngagementTracking === 'function') {
    initEngagementTracking(TOOL_SLUG);
  }
});
