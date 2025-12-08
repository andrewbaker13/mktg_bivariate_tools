// Conjoint Analysis & Simulation Tool Controller
const CREATED_DATE = '2025-12-07';

// Configuration
const API_BASE_URL = 'https://drbaker-backend.onrender.com/api';
const CONJOINT_UPLOAD_LIMIT = typeof window !== 'undefined' && typeof window.MAX_UPLOAD_ROWS === 'number'
  ? window.MAX_UPLOAD_ROWS
  : 5000;

// Usage tracking
let pageLoadTime = Date.now();
let hasSuccessfulRun = false;

// Application state
let conjointDataset = { headers: [], rows: [] };
let columnMapping = {
  respondent: null,
  task: null,
  alternative: null,
  chosen: null
};
let attributeColumns = [];
let attributeConfig = {}; // {attrName: {type: 'categorical'|'numeric_linear'|'numeric_quadratic'|'price', ...}}
let noneAlternative = null;
let competitorAlternatives = [];
let estimationResult = null;
let segmentationResult = null;
let modifiedDate = new Date().toLocaleDateString();

// Track current scenario
let currentScenarioName = null;
let currentDataSource = 'manual';

// Scenario definitions
const CONJOINT_SCENARIOS = [
  {
    id: 'scenario-smartphone',
    label: 'Smartphone Choice',
    file: 'scenarios/smartphone_cbc.txt',
    datasetPath: 'scenarios/smartphone_cbc.csv'
  },
  {
    id: 'scenario-streaming',
    label: 'Streaming Service',
    file: 'scenarios/streaming_service_cbc.txt',
    datasetPath: 'scenarios/streaming_service_cbc.csv'
  }
];

// Template CSV
const TEMPLATE_CSV = `respondent_id,task_id,alternative_id,chosen,brand,screen_size,storage,price
R001,1,A,0,BrandX,5.5,64,599
R001,1,B,1,BrandY,6.0,128,699
R001,1,C,0,BrandZ,5.5,128,649
R001,2,A,1,BrandY,5.5,64,549
R001,2,B,0,BrandX,6.0,128,749
R001,2,C,0,BrandZ,6.0,64,599
R002,1,A,0,BrandX,5.5,64,599
R002,1,B,0,BrandY,6.0,128,699
R002,1,C,1,BrandZ,5.5,128,649`;

// Usage tracking
function checkAndTrackUsage() {
  const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
  if (timeOnPage < 0.167) return;
  if (!hasSuccessfulRun) return;
  if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `tool-tracked-conjoint-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('conjoint', {
      n_respondents: estimationResult?.respondents?.length || 0,
      n_attributes: attributeColumns.length
    }, `Conjoint analysis completed`, {
      scenario: currentScenarioName,
      dataSource: currentDataSource
    });
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for Conjoint');
  }
}

window.addEventListener('beforeunload', checkAndTrackUsage);

/**
 * Initialize the application
 */
function initConjointApp() {
  setupFileUpload();
  setupScenarios();
  setupDownloadButtons();
  setupEstimationControls();
  setupSegmentationControls();
  setupSimulationControls();
  setupOptimizationControls();
  
  // Set modified date in footer
  const modifiedEl = document.getElementById('modified-date');
  if (modifiedEl) modifiedEl.textContent = CREATED_DATE;
}

/**
 * Setup file upload functionality
 */
function setupFileUpload() {
  const dropzone = document.getElementById('conjoint-dropzone');
  const fileInput = document.getElementById('conjoint-input');
  const browseBtn = document.getElementById('conjoint-browse');
  const feedbackEl = document.getElementById('conjoint-upload-feedback');

  if (typeof UIUtils !== 'undefined' && UIUtils.initDropzone) {
    UIUtils.initDropzone(dropzone, fileInput, browseBtn, handleFileUpload);
  } else {
    // Fallback
    browseBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });
  }

  const templateBtn = document.getElementById('conjoint-template-download');
  templateBtn?.addEventListener('click', downloadTemplate);
  
  const demoSmallBtn = document.getElementById('conjoint-load-demo-small');
  demoSmallBtn?.addEventListener('click', () => loadDemoDataset('small'));
  
  const demoFullBtn = document.getElementById('conjoint-load-demo-full');
  demoFullBtn?.addEventListener('click', () => loadDemoDataset('full'));
}

/**
 * Load demo dataset
 */
async function loadDemoDataset(size) {
  const feedbackEl = document.getElementById('conjoint-upload-feedback');
  try {
    feedbackEl.textContent = 'Loading demo dataset...';
    
    const filename = size === 'small' ? 'smartphone_cbc_small.csv' : 'smartphone_cbc.csv';
    const response = await fetch(`scenarios/${filename}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load demo dataset: ${response.statusText}`);
    }
    
    const text = await response.text();
    const parsed = typeof csvUtils !== 'undefined'
      ? csvUtils.parseDelimitedText(text)
      : parseCSV(text);
    
    if (!parsed.headers || parsed.headers.length === 0) {
      throw new Error('No headers found in demo dataset');
    }
    
    rawData = parsed.data;
    csvHeaders = parsed.headers;
    
    feedbackEl.textContent = `✓ Loaded demo dataset (${size === 'small' ? '20' : '150'} respondents, ${rawData.length} rows)`;
    
    document.getElementById('conjoint-column-mapping').style.display = 'block';
    populateColumnMappingSelects();
    
  } catch (error) {
    console.error('Demo load error:', error);
    feedbackEl.textContent = `Error: ${error.message}`;
  }
}

/**
 * Download CSV template
 */
function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'conjoint_template.csv';
  link.click();
}

/**
 * Handle file upload
 */
async function handleFileUpload(file) {
  const feedbackEl = document.getElementById('conjoint-upload-feedback');
  try {
    feedbackEl.textContent = 'Reading file...';
    
    const text = await file.text();
    const parsed = typeof csvUtils !== 'undefined'
      ? csvUtils.parseDelimitedText(text)
      : parseCSV(text);
    
    if (!parsed.headers || parsed.headers.length === 0) {
      throw new Error('No headers found in CSV file');
    }
    
    if (parsed.rows.length === 0) {
      throw new Error('No data rows found in CSV file');
    }
    
    if (parsed.rows.length > CONJOINT_UPLOAD_LIMIT) {
      throw new Error(`Dataset too large: ${parsed.rows.length} rows exceeds limit of ${CONJOINT_UPLOAD_LIMIT}`);
    }
    
    conjointDataset = parsed;
    currentDataSource = 'upload';
    currentScenarioName = null;
    
    feedbackEl.textContent = `✓ Loaded ${parsed.rows.length} rows with ${parsed.headers.length} columns.`;
    
    // Show column mapping UI
    populateColumnMapping();
    document.getElementById('conjoint-column-mapping').style.display = 'block';
    
  } catch (error) {
    feedbackEl.textContent = `Error: ${error.message}`;
    console.error('Upload error:', error);
  }
}

/**
 * Fallback CSV parser
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    return line.split(',').map(cell => cell.trim());
  });
  return { headers, rows };
}

/**
 * Populate column mapping dropdowns
 */
function populateColumnMapping() {
  const { headers } = conjointDataset;
  const selects = [
    'conjoint-respondent-col',
    'conjoint-task-col',
    'conjoint-alternative-col',
    'conjoint-chosen-col'
  ];
  
  selects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">-- Select column --</option>';
    headers.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      select.appendChild(opt);
    });
  });
  
  // Auto-detect likely columns
  autoDetectColumns();
  
  const confirmBtn = document.getElementById('conjoint-confirm-mapping');
  confirmBtn?.addEventListener('click', confirmMapping, { once: true });
}

/**
 * Auto-detect column mappings
 */
function autoDetectColumns() {
  const { headers } = conjointDataset;
  const patterns = {
    respondent: /(respondent|resp|subject|participant|id)/i,
    task: /(task|trial|question|scenario|set)/i,
    alternative: /(alternative|alt|option|product|choice_id)/i,
    chosen: /(chosen|choice|selected|pick)/i
  };
  
  Object.keys(patterns).forEach(key => {
    const matchedHeader = headers.find(h => patterns[key].test(h));
    if (matchedHeader) {
      const select = document.getElementById(`conjoint-${key}-col`);
      if (select) select.value = matchedHeader;
    }
  });
}

/**
 * Confirm column mapping and proceed to attribute configuration
 */
function confirmMapping() {
  columnMapping.respondent = document.getElementById('conjoint-respondent-col').value;
  columnMapping.task = document.getElementById('conjoint-task-col').value;
  columnMapping.alternative = document.getElementById('conjoint-alternative-col').value;
  columnMapping.chosen = document.getElementById('conjoint-chosen-col').value;
  
  if (!columnMapping.respondent || !columnMapping.task || !columnMapping.alternative || !columnMapping.chosen) {
    alert('Please select all required columns.');
    return;
  }
  
  // Identify attribute columns (all columns except the 4 required ones)
  const requiredCols = [
    columnMapping.respondent,
    columnMapping.task,
    columnMapping.alternative,
    columnMapping.chosen
  ];
  attributeColumns = conjointDataset.headers.filter(h => !requiredCols.includes(h));
  
  // Validate data
  const validation = validateConjointData();
  if (!validation.valid) {
    alert(`Data validation failed:\n${validation.errors.join('\n')}`);
    return;
  }
  
  // Show attribute configuration
  populateAttributeConfiguration();
  document.getElementById('conjoint-attribute-config').style.display = 'block';
  document.getElementById('conjoint-estimation-controls').style.display = 'block';
}

/**
 * Validate conjoint data structure
 */
function validateConjointData() {
  const errors = [];
  const { headers, rows } = conjointDataset;
  
  const respIdx = headers.indexOf(columnMapping.respondent);
  const taskIdx = headers.indexOf(columnMapping.task);
  const altIdx = headers.indexOf(columnMapping.alternative);
  const chosenIdx = headers.indexOf(columnMapping.chosen);
  
  // Check chosen values are 0/1
  const chosenValues = new Set(rows.map(r => r[chosenIdx]));
  if (!chosenValues.has('0') && !chosenValues.has('1')) {
    errors.push('Chosen column must contain 0 and 1 values.');
  }
  
  // Check each task has exactly one chosen alternative
  const taskMap = {};
  rows.forEach(row => {
    const key = `${row[respIdx]}_${row[taskIdx]}`;
    if (!taskMap[key]) taskMap[key] = { total: 0, chosen: 0 };
    taskMap[key].total++;
    if (row[chosenIdx] === '1') taskMap[key].chosen++;
  });
  
  const badTasks = Object.entries(taskMap).filter(([_, v]) => v.chosen !== 1);
  if (badTasks.length > 0) {
    errors.push(`${badTasks.length} tasks do not have exactly one chosen alternative.`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Populate attribute configuration UI
 */
function populateAttributeConfiguration() {
  const container = document.getElementById('conjoint-attribute-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  attributeColumns.forEach(attrName => {
    // Detect if numeric
    const values = getColumnValues(attrName);
    const isNumeric = values.every(v => v === '' || !isNaN(parseFloat(v)));
    
    const card = document.createElement('div');
    card.className = 'attribute-config-item';
    card.innerHTML = `
      <div class="attribute-config-header">
        <strong>${escapeHtml(attrName)}</strong>
      </div>
      <div class="attribute-config-controls">
        <label>Type:</label>
        <select class="attr-type-select" data-attr="${escapeHtml(attrName)}">
          <option value="categorical" ${!isNumeric ? 'selected' : ''}>Categorical</option>
          <option value="numeric_linear" ${isNumeric ? 'selected' : ''}>Numeric (linear)</option>
          <option value="numeric_quadratic">Numeric (quadratic)</option>
          <option value="price">Price (special)</option>
        </select>
      </div>
    `;
    container.appendChild(card);
    
    // Initialize config
    attributeConfig[attrName] = {
      type: isNumeric ? 'numeric_linear' : 'categorical'
    };
  });
  
  // Setup change listeners
  document.querySelectorAll('.attr-type-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const attrName = e.target.dataset.attr;
      attributeConfig[attrName].type = e.target.value;
    });
  });
  
  // Populate special alternatives
  populateSpecialAlternatives();
}

/**
 * Get unique values from a column
 */
function getColumnValues(columnName) {
  const { headers, rows } = conjointDataset;
  const idx = headers.indexOf(columnName);
  if (idx === -1) return [];
  return rows.map(r => r[idx]);
}

/**
 * Populate None and Competitor alternative selectors
 */
function populateSpecialAlternatives() {
  const { headers, rows } = conjointDataset;
  const altIdx = headers.indexOf(columnMapping.alternative);
  const uniqueAlts = [...new Set(rows.map(r => r[altIdx]))];
  
  // None alternative dropdown
  const noneSelect = document.getElementById('conjoint-none-alternative');
  if (noneSelect) {
    noneSelect.innerHTML = '<option value="">-- No "None" option --</option>';
    uniqueAlts.forEach(alt => {
      const opt = document.createElement('option');
      opt.value = alt;
      opt.textContent = alt;
      noneSelect.appendChild(opt);
    });
  }
  
  // Competitor checkboxes
  const compList = document.getElementById('conjoint-competitor-list');
  if (compList) {
    compList.innerHTML = '';
    uniqueAlts.forEach(alt => {
      const label = document.createElement('label');
      label.className = 'checkbox-label';
      label.innerHTML = `
        <input type="checkbox" class="comp-checkbox" value="${escapeHtml(alt)}">
        <span>${escapeHtml(alt)}</span>
      `;
      compList.appendChild(label);
    });
  }
}

/**
 * Setup estimation controls
 */
function setupEstimationControls() {
  const estimateBtn = document.getElementById('conjoint-estimate-model');
  estimateBtn?.addEventListener('click', runEstimation);
}

/**
 * Run model estimation
 */
async function runEstimation() {
  const statusEl = document.getElementById('conjoint-estimation-status');
  const estimateBtn = document.getElementById('conjoint-estimate-model');
  const loadingOverlay = document.getElementById('conjoint-loading-overlay');
  const loadingProgressText = document.getElementById('loading-progress-text');
  
  try {
    // Capture special alternatives
    noneAlternative = document.getElementById('conjoint-none-alternative')?.value || null;
    competitorAlternatives = Array.from(document.querySelectorAll('.comp-checkbox:checked')).map(cb => cb.value);
    
    statusEl.textContent = 'Preparing data for estimation...';
    estimateBtn.disabled = true;
    
    // Show enhanced loading modal
    loadingOverlay.setAttribute('aria-hidden', 'false');
    loadingOverlay.style.display = 'flex'; // Ensure visibility
    loadingProgressText.textContent = 'Building estimation payload...';
    
    // Build request payload
    const payload = buildEstimationPayload();
    
    // Update loading modal with dataset info
    const uniqueRespondents = new Set(payload.data.map(d => d.respondent_id)).size;
    const uniqueTasks = new Set(payload.data.map(d => d.task_id)).size;
    document.getElementById('loading-respondents').innerHTML = `Respondents: <strong>${uniqueRespondents}</strong>`;
    document.getElementById('loading-tasks').innerHTML = `Tasks: <strong>${uniqueTasks}</strong>`;
    
    statusEl.textContent = 'Estimating individual-level utilities...';
    loadingProgressText.textContent = `Estimating utilities for ${uniqueRespondents} respondents...`;
    
    const response = await fetch(`${API_BASE_URL}/conjoint/estimate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      // Show detailed error including failed respondents
      let errorMsg = result.detail || 'Estimation failed';
      if (result.failed_respondents && result.failed_respondents.length > 0) {
        errorMsg += `\n\nFailed respondents (${result.failed_respondents.length}):\n`;
        result.failed_respondents.slice(0, 5).forEach(f => {
          errorMsg += `- ${f.respondent_id}: ${f.error}\n`;
        });
        if (result.failed_respondents.length > 5) {
          errorMsg += `... and ${result.failed_respondents.length - 5} more`;
        }
      }
      throw new Error(errorMsg);
    }
    
    estimationResult = result;
    hasSuccessfulRun = true;
    
    // Hide loading modal
    loadingOverlay.setAttribute('aria-hidden', 'true');
    loadingOverlay.style.display = 'none';
    
    statusEl.textContent = `✓ Estimated utilities for ${result.respondents.length} respondents in ${result.estimation_time_seconds?.toFixed(1) || '?'} seconds.`;
    
    // Display results
    displayEstimationResults(result);
    
    // Show results sections
    document.getElementById('conjoint-results-section').style.display = 'block';
    document.getElementById('conjoint-test-results').style.display = 'block';
    document.getElementById('conjoint-diagnostics').style.display = 'block';
    document.getElementById('conjoint-segmentation').style.display = 'block';
    document.getElementById('conjoint-simulation').style.display = 'block';
    document.getElementById('conjoint-optimization').style.display = 'block';
    
  } catch (error) {
    console.error('Estimation error:', error);
    statusEl.textContent = `Error: ${error.message}`;
    
    // Hide loading modal
    loadingOverlay.setAttribute('aria-hidden', 'true');
    loadingOverlay.style.display = 'none';
  } finally {
    estimateBtn.disabled = false;
  }
}

/**
 * Build payload for estimation API
 */
function buildEstimationPayload() {
  const { headers, rows } = conjointDataset;
  const respIdx = headers.indexOf(columnMapping.respondent);
  const taskIdx = headers.indexOf(columnMapping.task);
  const altIdx = headers.indexOf(columnMapping.alternative);
  const chosenIdx = headers.indexOf(columnMapping.chosen);
  
  // Build data array
  const data = rows.map(row => {
    const obj = {
      respondent_id: row[respIdx],
      task_id: row[taskIdx],
      alternative_id: row[altIdx],
      chosen: parseInt(row[chosenIdx])
    };
    
    // Add attribute columns
    attributeColumns.forEach(attrName => {
      const idx = headers.indexOf(attrName);
      obj[attrName] = row[idx];
    });
    
    return obj;
  });
  
  // Build attribute metadata
  const attribute_metadata = {};
  Object.keys(attributeConfig).forEach(attrName => {
    attribute_metadata[attrName] = {
      type: attributeConfig[attrName].type
    };
  });
  
  const regStrength = parseFloat(document.getElementById('conjoint-regularization')?.value || 1.0);
  
  return {
    data,
    attribute_metadata,
    none_alternative_id: noneAlternative || null,
    competitor_alternative_ids: competitorAlternatives,
    model_options: {
      regularization: 'L2',
      reg_strength: regStrength
    }
  };
}

/**
 * Display estimation results
 */
function displayEstimationResults(result) {
  // Update metrics
  document.getElementById('conjoint-n-respondents').textContent = result.respondents.length;
  document.getElementById('conjoint-mean-tasks').textContent = result.mean_tasks_per_respondent?.toFixed(1) || '—';
  document.getElementById('conjoint-mean-r2').textContent = result.mean_pseudo_r2?.toFixed(3) || '—';
  document.getElementById('conjoint-estimation-time').textContent = `${result.estimation_time_seconds?.toFixed(1) || '?'}s`;
  
  // Render charts
  renderImportanceChart(result.aggregate_summaries.mean_attribute_importance);
  renderPartWorthChart(result.aggregate_summaries.mean_utilities);
  renderPriceDistributionChart(result);
  
  // Populate utilities table
  populateUtilitiesTable(result.aggregate_summaries.mean_utilities);
  
  // Generate reports
  generateAPAReport(result);
  generateManagerialReport(result);
  
  // Populate diagnostics
  populateDiagnostics(result);
  
  // Setup individual viewer
  setupIndividualViewer(result.respondents);
}

/**
 * Render attribute importance chart
 */
function renderImportanceChart(importance) {
  const data = [{
    x: Object.values(importance),
    y: Object.keys(importance),
    type: 'bar',
    orientation: 'h',
    marker: { color: '#4A90E2' }
  }];
  
  const layout = {
    title: '',
    xaxis: { title: 'Importance (%)', range: [0, 100] },
    yaxis: { title: '' },
    margin: { l: 120, r: 40, t: 20, b: 50 }
  };
  
  Plotly.newPlot('chart-importance', data, layout, { responsive: true });
}

/**
 * Render part-worth utilities chart
 */
function renderPartWorthChart(utilities) {
  const traces = [];
  
  Object.entries(utilities).forEach(([attr, levels]) => {
    if (typeof levels === 'object' && !Array.isArray(levels)) {
      traces.push({
        x: Object.values(levels),
        y: Object.keys(levels),
        type: 'bar',
        orientation: 'h',
        name: attr
      });
    }
  });
  
  const layout = {
    title: '',
    xaxis: { title: 'Mean Part-Worth Utility' },
    yaxis: { title: '' },
    barmode: 'group',
    margin: { l: 150, r: 40, t: 20, b: 50 }
  };
  
  Plotly.newPlot('chart-partworths', traces, layout, { responsive: true });
}

/**
 * Render price coefficient distribution
 */
function renderPriceDistributionChart(result) {
  const priceCoefs = result.respondents
    .map(r => r.coefficients.price)
    .filter(v => v !== undefined && v !== null);
  
  if (priceCoefs.length === 0) {
    document.getElementById('chart-price-dist').innerHTML = '<p class="muted">No price coefficient available.</p>';
    return;
  }
  
  const data = [{
    x: priceCoefs,
    type: 'histogram',
    marker: { color: '#E94B3C' },
    nbinsx: 20
  }];
  
  const layout = {
    title: '',
    xaxis: { title: 'Price Coefficient (more negative = more sensitive)' },
    yaxis: { title: 'Number of Respondents' },
    margin: { l: 60, r: 40, t: 20, b: 50 }
  };
  
  Plotly.newPlot('chart-price-dist', data, layout, { responsive: true });
}

/**
 * Populate utilities table
 */
function populateUtilitiesTable(meanUtilities) {
  const tbody = document.getElementById('conjoint-utilities-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  Object.entries(meanUtilities).forEach(([attr, levels]) => {
    if (typeof levels === 'object' && !Array.isArray(levels)) {
      Object.entries(levels).forEach(([level, stats]) => {
        const row = tbody.insertRow();
        row.innerHTML = `
          <td>${escapeHtml(attr)}</td>
          <td>${escapeHtml(level)}</td>
          <td>${stats.mean?.toFixed(3) || '—'}</td>
          <td>${stats.std?.toFixed(3) || '—'}</td>
          <td>${stats.min?.toFixed(3) || '—'}</td>
          <td>${stats.max?.toFixed(3) || '—'}</td>
        `;
      });
    }
  });
}

/**
 * Generate APA-style report
 */
function generateAPAReport(result) {
  const nResp = result.respondents.length;
  const meanR2 = result.mean_pseudo_r2?.toFixed(3) || '?';
  const meanTasks = result.mean_tasks_per_respondent?.toFixed(1) || '?';
  
  const topAttrs = Object.entries(result.aggregate_summaries.mean_attribute_importance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([attr, imp]) => `${attr} (${imp.toFixed(1)}%)`)
    .join(', ');
  
  const report = `
    We estimated individual-level part-worth utilities for ${nResp} respondents using multinomial logit regression with L2 regularization. 
    Each respondent completed an average of ${meanTasks} choice tasks. The mean pseudo-R² (McFadden) was ${meanR2}, indicating ${parseFloat(meanR2) > 0.3 ? 'good' : 'moderate'} model fit. 
    Attribute importance analysis revealed that the most influential drivers of choice were: ${topAttrs}.
    ${result.aggregate_summaries.mean_utilities.price?.['_value']?.mean ? 
      `The mean price coefficient was ${result.aggregate_summaries.mean_utilities.price['_value'].mean.toFixed(4)}, suggesting ${Math.abs(result.aggregate_summaries.mean_utilities.price['_value'].mean) > 0.01 ? 'substantial' : 'moderate'} price sensitivity.` : ''}
  `.trim();
  
  document.getElementById('conjoint-apa-report').textContent = report;
}

/**
 * Generate managerial interpretation
 */
function generateManagerialReport(result) {
  const topAttr = Object.entries(result.aggregate_summaries.mean_attribute_importance)
    .sort((a, b) => b[1] - a[1])[0];
  
  const report = `
    Customers prioritize <strong>${topAttr[0]}</strong> (${topAttr[1].toFixed(1)}% importance) when making purchase decisions in this category. 
    This suggests marketing should emphasize ${topAttr[0]}-related messaging and product development should focus investment in this dimension.
    ${result.aggregate_summaries.mean_utilities.price?.['_value']?.mean ? 
      `Price sensitivity is ${Math.abs(result.aggregate_summaries.mean_utilities.price['_value'].mean) > 0.01 ? 'high' : 'moderate'}, indicating customers will trade off features for lower prices. Consider value-tier segmentation strategies.` : ''}
    Use the simulation tool below to test how different product configurations would perform in a competitive market scenario.
  `.trim();
  
  document.getElementById('conjoint-managerial-report').innerHTML = report;
}

/**
 * Populate diagnostics section
 */
function populateDiagnostics(result) {
  const container = document.getElementById('conjoint-data-quality');
  if (!container) return;
  
  const nResp = result.respondents.length;
  const meanTasks = result.mean_tasks_per_respondent;
  const meanR2 = result.mean_pseudo_r2;
  
  let html = '<h4>Data Quality Assessment</h4><ul>';
  
  if (nResp < 100) {
    html += `<li class="warning">⚠️ Sample size (${nResp}) is below recommended minimum (100+). Aggregate estimates may be unstable.</li>`;
  } else if (nResp < 200) {
    html += `<li class="info">ℹ️ Sample size (${nResp}) is adequate for aggregate analysis but small for robust segmentation.</li>`;
  } else {
    html += `<li class="success">✓ Sample size (${nResp}) is sufficient for aggregate and segmentation analysis.</li>`;
  }
  
  if (meanTasks < 8) {
    html += `<li class="warning">⚠️ Mean tasks per respondent (${meanTasks.toFixed(1)}) is below recommended minimum (8). Individual estimates may be unreliable.</li>`;
  } else {
    html += `<li class="success">✓ Mean tasks per respondent (${meanTasks.toFixed(1)}) is adequate for individual-level estimation.</li>`;
  }
  
  if (meanR2 < 0.15) {
    html += `<li class="warning">⚠️ Mean pseudo-R² (${meanR2.toFixed(3)}) is low, suggesting weak model fit. Check for data quality issues or consider adding interaction terms.</li>`;
  } else if (meanR2 < 0.30) {
    html += `<li class="info">ℹ️ Mean pseudo-R² (${meanR2.toFixed(3)}) indicates moderate fit, typical for CBC studies.</li>`;
  } else {
    html += `<li class="success">✓ Mean pseudo-R² (${meanR2.toFixed(3)}) indicates strong model fit.</li>`;
  }
  
  html += '</ul>';
  
  // Add convergence diagnostics
  const converged = result.respondents.filter(r => r.convergence?.converged).length;
  const totalResp = result.respondents.length;
  const convergenceRate = (converged / totalResp * 100).toFixed(1);
  
  const methodCounts = {};
  result.respondents.forEach(r => {
    const method = r.convergence?.method || 'Unknown';
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });
  
  const meanIterations = result.respondents
    .filter(r => r.convergence?.iterations != null)
    .reduce((sum, r) => sum + r.convergence.iterations, 0) / 
    result.respondents.filter(r => r.convergence?.iterations != null).length;
  
  html += '<h4>Optimization Convergence</h4><ul>';
  html += `<li><strong>Total estimation time:</strong> ${result.estimation_time_seconds?.toFixed(1) || '?'} seconds</li>`;
  html += `<li><strong>Convergence rate:</strong> ${converged}/${totalResp} (${convergenceRate}%) respondents converged successfully</li>`;
  html += `<li><strong>Mean iterations:</strong> ${meanIterations.toFixed(1)} (max: 200)</li>`;
  html += `<li><strong>Methods used:</strong> `;
  Object.entries(methodCounts).forEach(([method, count]) => {
    html += `${method}: ${count} (${(count/totalResp*100).toFixed(1)}%); `;
  });
  html += '</li>';
  
  if (convergenceRate < 95) {
    html += `<li class="warning">⚠️ ${100-parseFloat(convergenceRate)}% of respondents did not converge. This may indicate data quality issues or insufficient choice tasks.</li>`;
  } else {
    html += `<li class="success">✓ High convergence rate indicates reliable optimization.</li>`;
  }
  
  html += '</ul>';
  
  container.innerHTML = html;
}

/**
 * Setup individual respondent viewer
 */
function setupIndividualViewer(respondents) {
  const viewBtn = document.getElementById('conjoint-view-individual');
  const viewer = document.getElementById('conjoint-individual-viewer');
  const select = document.getElementById('conjoint-respondent-select');
  const details = document.getElementById('conjoint-individual-details');
  
  if (!viewBtn || !viewer || !select || !details) return;
  
  // Populate dropdown
  select.innerHTML = '<option value="">-- Choose a respondent --</option>';
  respondents.forEach(resp => {
    const option = document.createElement('option');
    option.value = resp.respondent_id;
    option.textContent = `${resp.respondent_id} (R²=${resp.fit.pseudo_r2?.toFixed(3) || '?'})`;
    select.appendChild(option);
  });
  
  // Toggle viewer visibility
  viewBtn.addEventListener('click', () => {
    const isHidden = viewer.style.display === 'none';
    viewer.style.display = isHidden ? 'block' : 'none';
    viewBtn.textContent = isHidden ? 'Hide individual viewer' : 'View individual respondent utilities';
  });
  
  // Handle selection changes
  select.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      details.innerHTML = '<p class="muted">Select a respondent to view their estimated utilities and model fit.</p>';
      return;
    }
    
    const resp = respondents.find(r => r.respondent_id === selectedId);
    if (!resp) return;
    
    let html = `
      <h4>Respondent ${escapeHtml(resp.respondent_id)}</h4>
      <div class="metric-output">Pseudo-R²: <strong>${resp.fit.pseudo_r2?.toFixed(3) || '—'}</strong></div>
      <div class="metric-output">Log-likelihood: <strong>${resp.fit.log_likelihood?.toFixed(2) || '—'}</strong></div>
      <div class="metric-output">Tasks completed: <strong>${resp.fit.n_tasks || '—'}</strong></div>
      <div class="metric-output">Observations: <strong>${resp.fit.n_observations || '—'}</strong></div>
      
      <h5 style="margin-top: 1.5rem;">Coefficients</h5>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Utility</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    Object.entries(resp.coefficients).forEach(([param, value]) => {
      html += `
        <tr>
          <td>${escapeHtml(param)}</td>
          <td>${value?.toFixed(4) || '—'}</td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
      
      <h5 style="margin-top: 1.5rem;">Attribute Importance</h5>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Importance (%)</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    Object.entries(resp.attribute_importance).forEach(([attr, imp]) => {
      html += `
        <tr>
          <td>${escapeHtml(attr)}</td>
          <td>${imp?.toFixed(1) || '—'}%</td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    details.innerHTML = html;
  });
}

/**
 * Setup segmentation controls
 */
function setupSegmentationControls() {
  const runBtn = document.getElementById('conjoint-run-segmentation');
  runBtn?.addEventListener('click', runSegmentation);
}

/**
 * Run k-means segmentation
 */
function runSegmentation() {
  const statusEl = document.getElementById('conjoint-segmentation-status');
  
  if (!estimationResult) {
    statusEl.textContent = 'Please estimate utilities first.';
    return;
  }
  
  try {
    const k = parseInt(document.getElementById('conjoint-n-clusters')?.value || 3);
    statusEl.textContent = `Running k-means with ${k} clusters...`;
    
    // Extract utility vectors (exclude ASCs for clustering)
    const utilityVectors = estimationResult.respondents.map(r => {
      const vec = [];
      Object.entries(r.coefficients).forEach(([key, val]) => {
        if (!key.startsWith('ASC_')) {
          vec.push(val || 0);
        }
      });
      return vec;
    });
    
    // Normalize
    const normalized = normalizeVectors(utilityVectors);
    
    // Run k-means
    const clusters = kMeans(normalized, k);
    
    // Assign to respondents
    estimationResult.respondents.forEach((r, i) => {
      r.segment = clusters[i];
    });
    
    // Compute segment profiles
    segmentationResult = computeSegmentProfiles(k);
    
    statusEl.textContent = `✓ Segmented into ${k} clusters.`;
    
    // Display results
    displaySegmentationResults(segmentationResult);
    document.getElementById('conjoint-segment-results').style.display = 'block';
    
  } catch (error) {
    console.error('Segmentation error:', error);
    statusEl.textContent = `Error: ${error.message}`;
  }
}

/**
 * Normalize vectors (z-score)
 */
function normalizeVectors(vectors) {
  const nFeatures = vectors[0].length;
  const means = [];
  const stds = [];
  
  for (let j = 0; j < nFeatures; j++) {
    const vals = vectors.map(v => v[j]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    const std = Math.sqrt(variance);
    means.push(mean);
    stds.push(std || 1);
  }
  
  return vectors.map(vec => 
    vec.map((val, j) => (val - means[j]) / stds[j])
  );
}

/**
 * Simple k-means clustering
 */
function kMeans(data, k, maxIter = 100) {
  const n = data.length;
  const dim = data[0].length;
  
  // Initialize centroids randomly
  let centroids = [];
  const indices = new Set();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * n);
    if (!indices.has(idx)) {
      centroids.push([...data[idx]]);
      indices.add(idx);
    }
  }
  
  let assignments = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    
    // Assign each point to nearest centroid
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = euclideanDist(data[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }
    
    if (!changed) break;
    
    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = data.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length > 0) {
        for (let d = 0; d < dim; d++) {
          centroids[c][d] = clusterPoints.reduce((sum, p) => sum + p[d], 0) / clusterPoints.length;
        }
      }
    }
  }
  
  return assignments;
}

function euclideanDist(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

/**
 * Compute segment profiles
 */
function computeSegmentProfiles(k) {
  const segments = [];
  
  for (let c = 0; c < k; c++) {
    const members = estimationResult.respondents.filter(r => r.segment === c);
    
    // Aggregate attribute importance
    const meanImportance = {};
    members.forEach(r => {
      Object.entries(r.attribute_importance).forEach(([attr, imp]) => {
        if (!meanImportance[attr]) meanImportance[attr] = [];
        meanImportance[attr].push(imp);
      });
    });
    
    Object.keys(meanImportance).forEach(attr => {
      meanImportance[attr] = meanImportance[attr].reduce((a, b) => a + b, 0) / meanImportance[attr].length;
    });
    
    // Aggregate utilities (coefficients)
    const meanUtilities = {};
    members.forEach(r => {
      Object.entries(r.coefficients).forEach(([coef, val]) => {
        if (val != null) {
          if (!meanUtilities[coef]) meanUtilities[coef] = [];
          meanUtilities[coef].push(val);
        }
      });
    });
    
    Object.keys(meanUtilities).forEach(coef => {
      const vals = meanUtilities[coef];
      meanUtilities[coef] = {
        mean: vals.reduce((a, b) => a + b, 0) / vals.length,
        std: Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - (vals.reduce((x, y) => x + y, 0) / vals.length), 2), 0) / vals.length),
        min: Math.min(...vals),
        max: Math.max(...vals)
      };
    });
    
    const topAttr = Object.entries(meanImportance).sort((a, b) => b[1] - a[1])[0];
    
    const priceCoefs = members.map(r => r.coefficients.price).filter(v => v != null);
    const meanPrice = priceCoefs.length > 0 
      ? priceCoefs.reduce((a, b) => a + b, 0) / priceCoefs.length 
      : null;
    
    segments.push({
      id: c,
      size: members.length,
      meanImportance,
      meanUtilities,
      topAttribute: topAttr ? topAttr[0] : 'N/A',
      meanPriceCoef: meanPrice
    });
  }
  
  return segments;
}

/**
 * Display segmentation results
 */
function displaySegmentationResults(segments) {
  // Segment sizes pie chart
  const pieData = [{
    labels: segments.map((s, i) => `Segment ${i + 1}`),
    values: segments.map(s => s.size),
    type: 'pie'
  }];
  
  Plotly.newPlot('chart-segment-sizes', pieData, { title: '' }, { responsive: true });
  
  // Importance comparison
  const attrs = Object.keys(segments[0].meanImportance);
  const traces = segments.map((seg, i) => ({
    x: attrs,
    y: attrs.map(a => seg.meanImportance[a]),
    type: 'bar',
    name: `Segment ${i + 1}`
  }));
  
  const layout = {
    title: '',
    xaxis: { title: 'Attribute' },
    yaxis: { title: 'Mean Importance (%)' },
    barmode: 'group'
  };
  
  Plotly.newPlot('chart-segment-importance', traces, layout, { responsive: true });
  
  // Summary table
  const tbody = document.getElementById('conjoint-segment-table-body');
  tbody.innerHTML = '';
  segments.forEach((seg, i) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>Segment ${i + 1}</td>
      <td>${seg.size}</td>
      <td>${seg.meanPriceCoef?.toFixed(4) || '—'}</td>
      <td>${seg.topAttribute}</td>
    `;
  });
  
  // Detailed utilities for each segment
  const detailsContainer = document.getElementById('conjoint-segment-details');
  if (detailsContainer) {
    let html = '<h3>Segment-Level Part-Worth Utilities</h3>';
    
    segments.forEach((seg, i) => {
      html += `
        <details class="segment-utilities-details" open>
          <summary><strong>Segment ${i + 1}</strong> (n=${seg.size}, top attribute: ${seg.topAttribute})</summary>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Mean</th>
                <th>Std. Dev.</th>
                <th>Min</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      Object.entries(seg.meanUtilities).forEach(([param, stats]) => {
        html += `
          <tr>
            <td>${escapeHtml(param)}</td>
            <td>${stats.mean?.toFixed(4) || '—'}</td>
            <td>${stats.std?.toFixed(4) || '—'}</td>
            <td>${stats.min?.toFixed(4) || '—'}</td>
            <td>${stats.max?.toFixed(4) || '—'}</td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </details>
      `;
    });
    
    detailsContainer.innerHTML = html;
  }
}

/**
 * Setup simulation controls
 */
function setupSimulationControls() {
  const addBtn = document.getElementById('conjoint-add-product');
  addBtn?.addEventListener('click', addProductToSimulation);
  
  const clearBtn = document.getElementById('conjoint-clear-scenario');
  clearBtn?.addEventListener('click', clearSimulationScenario);
  
  const runBtn = document.getElementById('conjoint-run-simulation');
  runBtn?.addEventListener('click', runSimulation);
}

let simulationProducts = [];

/**
 * Add product to simulation
 */
function addProductToSimulation() {
  if (!estimationResult) {
    alert('Please estimate utilities first.');
    return;
  }
  
  const productId = `prod_${Date.now()}`;
  const product = {
    id: productId,
    name: `Product ${simulationProducts.length + 1}`,
    attributes: {},
    price: 0,
    cost: 0,
    type: 'our_product' // 'our_product', 'competitor', 'none'
  };
  
  simulationProducts.push(product);
  renderSimulationProducts();
}

/**
 * Clear simulation scenario
 */
function clearSimulationScenario() {
  simulationProducts = [];
  renderSimulationProducts();
  document.getElementById('conjoint-simulation-results').style.display = 'none';
}

/**
 * Render simulation product config cards
 */
function renderSimulationProducts() {
  const container = document.getElementById('conjoint-products-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  simulationProducts.forEach((prod, idx) => {
    const card = document.createElement('div');
    card.className = 'product-config-card';
    
    let attrsHtml = '';
    attributeColumns.forEach(attr => {
      const config = attributeConfig[attr];
      if (config.type === 'categorical') {
        const uniqueVals = [...new Set(getColumnValues(attr))].filter(v => v);
        const currentVal = prod.attributes[attr] || uniqueVals[0];
        attrsHtml += `
          <label>${escapeHtml(attr)}:
            <select class="prod-attr" data-prod="${prod.id}" data-attr="${escapeHtml(attr)}">
              ${uniqueVals.map(v => `<option value="${escapeHtml(v)}" ${v === currentVal ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}
            </select>
          </label>
        `;
      } else {
        // For numeric: calculate min, max, median from data
        const values = getColumnValues(attr).map(v => parseFloat(v)).filter(v => !isNaN(v));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const sorted = values.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const currentVal = prod.attributes[attr] !== undefined ? prod.attributes[attr] : median;
        
        attrsHtml += `
          <label>${escapeHtml(attr)}:
            <input type="number" class="prod-attr" data-prod="${prod.id}" data-attr="${escapeHtml(attr)}" 
                   value="${currentVal}" min="${min}" max="${max}" step="any">
            <span class="hint-inline">(${min}–${max})</span>
          </label>
        `;
      }
    });
    
    // Price and Cost inputs (only show separate price if price is NOT an attribute)
    const hasPriceAttribute = attributeColumns.some(attr => attr.toLowerCase() === 'price');
    let priceInputHtml = '';
    
    if (!hasPriceAttribute) {
      // Price is NOT studied - add manual price input
      const priceDefault = prod.price !== undefined ? prod.price : 500;
      priceInputHtml = `<label>Price: <input type="number" class="prod-price" data-prod="${prod.id}" value="${priceDefault}" min="0" step="0.01"></label>`;
    }
    
    card.innerHTML = `
      <div class="product-config-header">
        <input type="text" class="prod-name" data-prod="${prod.id}" value="${prod.name}" placeholder="Product name">
        <button class="remove-prod" data-prod="${prod.id}">×</button>
      </div>
      <div class="product-config-body">
        ${attrsHtml}
        ${priceInputHtml}
        <label>Cost: <input type="number" class="prod-cost" data-prod="${prod.id}" value="${prod.cost || 0}" min="0" step="0.01"></label>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  // Attach listeners
  document.querySelectorAll('.prod-name').forEach(input => {
    input.addEventListener('change', e => {
      const prod = simulationProducts.find(p => p.id === e.target.dataset.prod);
      if (prod) prod.name = e.target.value;
    });
  });
  
  document.querySelectorAll('.prod-attr').forEach(input => {
    input.addEventListener('change', e => {
      const prod = simulationProducts.find(p => p.id === e.target.dataset.prod);
      if (prod) prod.attributes[e.target.dataset.attr] = e.target.value;
    });
  });
  
  document.querySelectorAll('.prod-price').forEach(input => {
    input.addEventListener('change', e => {
      const prod = simulationProducts.find(p => p.id === e.target.dataset.prod);
      if (prod) prod.price = parseFloat(e.target.value);
    });
  });
  
  document.querySelectorAll('.prod-cost').forEach(input => {
    input.addEventListener('change', e => {
      const prod = simulationProducts.find(p => p.id === e.target.dataset.prod);
      if (prod) prod.cost = parseFloat(e.target.value);
    });
  });
  
  document.querySelectorAll('.remove-prod').forEach(btn => {
    btn.addEventListener('click', e => {
      simulationProducts = simulationProducts.filter(p => p.id !== e.target.dataset.prod);
      renderSimulationProducts();
    });
  });
}

/**
 * Run market simulation
 */
function runSimulation() {
  const statusEl = document.getElementById('conjoint-simulation-status');
  
  if (!estimationResult) {
    statusEl.textContent = 'Please estimate utilities first.';
    return;
  }
  
  if (simulationProducts.length === 0) {
    statusEl.textContent = 'Please add at least one product.';
    return;
  }
  
  try {
    statusEl.textContent = 'Running simulation...';
    
    const marketSize = parseInt(document.getElementById('conjoint-market-size')?.value || 10000);
    
    // For each respondent, compute utilities for each product
    const shares = simulationProducts.map(() => 0);
    
    estimationResult.respondents.forEach(resp => {
      const utilities = simulationProducts.map(prod => computeUtility(prod, resp.coefficients));
      const probs = softmax(utilities);
      probs.forEach((p, i) => shares[i] += p);
    });
    
    // Average shares
    const nResp = estimationResult.respondents.length;
    shares.forEach((_, i) => shares[i] /= nResp);
    
    // Check if price is an attribute
    const hasPriceAttribute = attributeColumns.some(attr => attr.toLowerCase() === 'price');
    
    // Compute profits
    const results = simulationProducts.map((prod, i) => {
      // Get price from attribute if it's an attribute, otherwise from prod.price
      const price = hasPriceAttribute && prod.attributes.price 
        ? parseFloat(prod.attributes.price) 
        : (prod.price || 0);
      
      return {
        name: prod.name,
        share: shares[i] * 100,
        customers: Math.round(shares[i] * marketSize),
        price: price,
        cost: prod.cost || 0,
        margin: price - (prod.cost || 0),
        profit: shares[i] * marketSize * (price - (prod.cost || 0))
      };
    });
    
    // Display
    displaySimulationResults(results);
    statusEl.textContent = '✓ Simulation complete.';
    document.getElementById('conjoint-simulation-results').style.display = 'block';
    
  } catch (error) {
    console.error('Simulation error:', error);
    statusEl.textContent = `Error: ${error.message}`;
  }
}

/**
 * Compute utility for a product given respondent coefficients
 */
function computeUtility(product, coefficients) {
  let utility = 0;
  
  Object.entries(product.attributes).forEach(([attr, val]) => {
    const config = attributeConfig[attr];
    if (config.type === 'categorical') {
      const key = `${attr}_${val}`;
      utility += coefficients[key] || 0;
    } else {
      const numVal = parseFloat(val) || 0;
      utility += (coefficients[attr] || 0) * numVal;
      if (config.type === 'numeric_quadratic') {
        utility += (coefficients[`${attr}_sq`] || 0) * numVal * numVal;
      }
    }
  });
  
  // Price: only add if price is NOT already in attributes
  const hasPriceAttribute = attributeColumns.some(attr => attr.toLowerCase() === 'price');
  if (!hasPriceAttribute && product.price && coefficients.price) {
    utility += coefficients.price * product.price;
  }
  
  return utility;
}

/**
 * Softmax function
 */
function softmax(values) {
  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp(v - maxVal));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sumExp);
}

/**
 * Display simulation results
 */
function displaySimulationResults(results) {
  // Share chart
  const shareData = [{
    x: results.map(r => r.name),
    y: results.map(r => r.share),
    type: 'bar',
    marker: { color: '#4A90E2' }
  }];
  
  Plotly.newPlot('chart-sim-share', shareData, {
    title: '',
    xaxis: { title: 'Product' },
    yaxis: { title: 'Market Share (%)' }
  }, { responsive: true });
  
  // Profit chart
  const profitData = [{
    x: results.map(r => r.name),
    y: results.map(r => r.profit),
    type: 'bar',
    marker: { color: '#2ECC71' }
  }];
  
  Plotly.newPlot('chart-sim-profit', profitData, {
    title: '',
    xaxis: { title: 'Product' },
    yaxis: { title: 'Total Profit ($)' }
  }, { responsive: true });
  
  // Table
  const tbody = document.getElementById('conjoint-simulation-table-body');
  tbody.innerHTML = '';
  results.forEach(r => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${escapeHtml(r.name)}</td>
      <td>${r.share.toFixed(2)}%</td>
      <td>${r.customers.toLocaleString()}</td>
      <td>$${r.price.toFixed(2)}</td>
      <td>$${r.cost.toFixed(2)}</td>
      <td>$${r.margin.toFixed(2)}</td>
      <td>$${r.profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    `;
  });
}

/**
 * Setup optimization controls
 */
function setupOptimizationControls() {
  // Placeholder - to be implemented
  const runBtn = document.getElementById('conjoint-run-optimization');
  runBtn?.addEventListener('click', () => {
    alert('Optimization feature coming soon!');
  });
}

/**
 * Setup scenarios
 */
function setupScenarios() {
  const select = document.getElementById('scenario-select');
  const downloadBtn = document.getElementById('scenario-download');
  
  if (!select) return;
  
  CONJOINT_SCENARIOS.forEach(scenario => {
    const opt = document.createElement('option');
    opt.value = scenario.id;
    opt.textContent = scenario.label;
    select.appendChild(opt);
  });
  
  select.addEventListener('change', loadScenario);
  downloadBtn?.addEventListener('click', downloadScenarioDataset);
}

/**
 * Load scenario
 */
async function loadScenario() {
  const select = document.getElementById('scenario-select');
  const descEl = document.getElementById('scenario-description');
  const downloadBtn = document.getElementById('scenario-download');
  
  const scenarioId = select.value;
  if (!scenarioId) {
    descEl.innerHTML = '<p>Use presets to auto-load realistic CBC study data.</p>';
    downloadBtn.classList.add('hidden');
    return;
  }
  
  const scenario = CONJOINT_SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) return;
  
  try {
    // Load description
    const descResp = await fetch(scenario.file);
    const descText = await descResp.text();
    descEl.innerHTML = `<div class="scenario-text">${escapeHtml(descText)}</div>`;
    
    // Load dataset
    const dataResp = await fetch(scenario.datasetPath);
    const dataText = await dataResp.text();
    const parsed = typeof csvUtils !== 'undefined'
      ? csvUtils.parseDelimitedText(dataText)
      : parseCSV(dataText);
    
    conjointDataset = parsed;
    currentDataSource = 'scenario';
    currentScenarioName = scenario.label;
    
    // Calculate actual respondents and tasks from raw data
    const respIdx = parsed.headers.findIndex(h => h.toLowerCase().includes('respondent'));
    const taskIdx = parsed.headers.findIndex(h => h.toLowerCase().includes('task'));
    
    let uniqueRespondents = 0;
    let uniqueTasks = 0;
    
    if (respIdx >= 0 && taskIdx >= 0) {
      uniqueRespondents = new Set(parsed.rows.map(r => r[respIdx])).size;
      uniqueTasks = new Set(parsed.rows.map(r => r[taskIdx])).size;
    }
    
    document.getElementById('conjoint-upload-feedback').textContent = 
      `✓ Loaded scenario: ${scenario.label} (${uniqueRespondents} respondents, ${uniqueTasks} tasks, ${parsed.rows.length} rows)`;
    
    // Auto-proceed to mapping
    populateColumnMapping();
    document.getElementById('conjoint-column-mapping').style.display = 'block';
    
    downloadBtn.classList.remove('hidden');
    downloadBtn.disabled = false;
    
  } catch (error) {
    console.error('Scenario load error:', error);
    descEl.innerHTML = `<p class="error">Error loading scenario: ${error.message}</p>`;
  }
}

/**
 * Download scenario dataset
 */
function downloadScenarioDataset() {
  const select = document.getElementById('scenario-select');
  const scenarioId = select.value;
  const scenario = CONJOINT_SCENARIOS.find(s => s.id === scenarioId);
  
  if (!scenario) return;
  
  window.open(scenario.datasetPath, '_blank');
}

/**
 * Setup download buttons
 */
function setupDownloadButtons() {
  const utilBtn = document.getElementById('conjoint-download-utilities');
  utilBtn?.addEventListener('click', downloadUtilities);
  
  const simBtn = document.getElementById('conjoint-download-simulation');
  simBtn?.addEventListener('click', downloadSimulation);
}

/**
 * Download utilities CSV
 */
function downloadUtilities() {
  if (!estimationResult) return;
  
  let csv = 'respondent_id,';
  const firstResp = estimationResult.respondents[0];
  csv += Object.keys(firstResp.coefficients).join(',') + '\n';
  
  estimationResult.respondents.forEach(r => {
    csv += `${r.respondent_id},`;
    csv += Object.values(r.coefficients).join(',') + '\n';
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'conjoint_utilities.csv';
  link.click();
}

/**
 * Download simulation results
 */
function downloadSimulation() {
  // Placeholder
  alert('Download simulation results - coming soon!');
}

/**
 * Show loading overlay
 */
function showLoading() {
  const overlay = document.getElementById('conjoint-loading-overlay');
  if (overlay) overlay.setAttribute('aria-hidden', 'false');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  const overlay = document.getElementById('conjoint-loading-overlay');
  if (overlay) overlay.setAttribute('aria-hidden', 'true');
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initConjointApp);
