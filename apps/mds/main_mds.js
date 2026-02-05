// Perceptual Positioning Lab - Main Application Logic

const TOOL_SLUG = 'perceptual-positioning';
const CREATED_DATE = '2026-02-04';
let modifiedDate = new Date().toLocaleDateString();

// ==================== STATE ====================
const AppState = {
  // Data
  perceptualData: null,      // { brands: [], attributes: [], matrix: [][] }
  preferenceData: null,      // { brands: [], customers: [][], predefinedSegments?: [], segmentLabels?: [] }
  
  // Analysis results
  results: null,             // Computed after analysis
  
  // Settings
  settings: {
    dimensionMode: 'auto',
    focalBrand: null,
    segmentMode: 'auto',
    shareRule: 'preference',
    includePreferences: false
  },
  
  // Simulation state
  simulation: {
    mode: 'reposition',      // 'reposition' or 'new-product'
    originalCoords: {},      // Store original positions
    modifiedCoords: {},      // Current modified positions
    newProduct: null,        // { name, coords }
    hasChanges: false,       // Track if user has made changes
    repositionedBrands: [],  // List of brands that have been moved
    // Cached results for comparison
    originalResults: {
      marketShares: {},
      distances: {},
      insights: {}
    },
    repositionedResults: {
      marketShares: {},
      distances: {},
      insights: {}
    }
  },
  
  // Scenario
  activeScenario: null,
  
  // View state
  currentView: 'dim12'       // 'dim12', 'dim13', 'dim23', '3d'
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  console.log('Initializing Perceptual Positioning Lab...');
  
  // Hydrate timestamps
  hydrateTimestamps();
  
  // Setup UI components
  setupScenarioSelect();
  setupFileUploads();
  setupPreferenceToggle();
  setupSettingsListeners();
  setupRunButton();
  setupViewToggle();
  setupLayerToggles();
  setupSimulationControls();
  setupExportButtons();
  setupTemplateDownloads();
  
  // Initialize engagement tracking
  if (typeof initEngagementTracking === 'function') {
    initEngagementTracking(TOOL_SLUG);
  }
  
  console.log('Initialization complete.');
}

function hydrateTimestamps() {
  const created = document.getElementById('created-date');
  const modified = document.getElementById('modified-date');
  if (created) created.textContent = new Date(CREATED_DATE).toLocaleDateString();
  if (modified) modified.textContent = modifiedDate;
}

// ==================== SCENARIO SYSTEM ====================
function setupScenarioSelect() {
  const select = document.getElementById('scenario-select');
  if (!select) return;
  
  // Populate scenarios from mds_scenarios.js
  if (typeof MDS_SCENARIOS !== 'undefined') {
    MDS_SCENARIOS.forEach(scenario => {
      const option = document.createElement('option');
      option.value = scenario.id;
      option.textContent = scenario.label;
      select.appendChild(option);
    });
  }
  
  select.addEventListener('change', () => {
    const scenarioId = select.value;
    const descEl = document.getElementById('scenario-description');
    const downloadBtn = document.getElementById('scenario-download');
    
    if (!scenarioId) {
      AppState.activeScenario = null;
      descEl.innerHTML = `<p>Load a pre-built marketing scenario with perceptual and preference data to explore 
        positioning analysis without uploading your own files.</p>`;
      downloadBtn.classList.add('hidden');
      downloadBtn.disabled = true;
      return;
    }
    
    const scenario = MDS_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario) {
      AppState.activeScenario = scenario;
      
      // Load scenario data
      const data = scenario.generate();
      loadPerceptualData(data.perceptual.brands, data.perceptual.attributes, data.perceptual.matrix);
      
      if (data.preferences) {
        document.getElementById('include-preferences').checked = true;
        togglePreferenceSection(true);
        
        // Load preference data with optional pre-defined segments
        loadPreferenceData(data.preferences.brands, data.preferences.customers);
        
        // If scenario includes pre-defined segments, set them up
        if (data.preferences.predefinedSegments && data.preferences.segmentLabels) {
          AppState.preferenceData.predefinedSegments = data.preferences.predefinedSegments;
          AppState.preferenceData.segmentLabels = data.preferences.segmentLabels;
          AppState.preferenceData.segmentColumn = data.preferences.segmentColumn || 'Segment';
          
          // Enable pre-defined segment option
          enablePredefinedSegmentFromScenario(data.preferences.segmentLabels);
        }
      }
      
      // Update description
      descEl.innerHTML = scenario.description();
      
      // Enable download button
      downloadBtn.classList.remove('hidden');
      downloadBtn.disabled = false;
      
      // Track scenario load
      if (typeof markScenarioLoaded === 'function') {
        markScenarioLoaded(scenario.label);
      }
    }
  });
  
  // Scenario download handler
  const downloadBtn = document.getElementById('scenario-download');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!AppState.activeScenario) return;
      const data = AppState.activeScenario.generate();
      downloadScenarioData(data);
    });
  }
}

function downloadScenarioData(data) {
  // Download perceptual data
  const perceptualCsv = generatePerceptualCsv(data.perceptual);
  downloadTextFile(`${AppState.activeScenario.id}_perceptual.csv`, perceptualCsv, { mimeType: 'text/csv' });
  
  // Download preference data if available
  if (data.preferences) {
    setTimeout(() => {
      const prefCsv = generatePreferenceCsv(data.preferences);
      downloadTextFile(`${AppState.activeScenario.id}_preferences.csv`, prefCsv, { mimeType: 'text/csv' });
    }, 500);
  }
}

// ==================== FILE UPLOADS ====================
function setupFileUploads() {
  // Perceptual data upload
  setupDropzone({
    dropzoneId: 'perceptual-dropzone',
    inputId: 'perceptual-input',
    browseId: 'perceptual-browse',
    feedbackId: 'perceptual-feedback',
    onSuccess: handlePerceptualUpload
  });
  
  // Preference data upload
  setupDropzone({
    dropzoneId: 'preference-dropzone',
    inputId: 'preference-input',
    browseId: 'preference-browse',
    feedbackId: 'preference-feedback',
    onSuccess: handlePreferenceUpload
  });
}

function setupDropzone({ dropzoneId, inputId, browseId, feedbackId, onSuccess }) {
  const dropzone = document.getElementById(dropzoneId);
  const input = document.getElementById(inputId);
  const browse = document.getElementById(browseId);
  const feedback = document.getElementById(feedbackId);
  
  if (!dropzone || !input) return;
  
  // Click handlers
  dropzone.addEventListener('click', () => input.click());
  if (browse) {
    browse.addEventListener('click', (e) => {
      e.stopPropagation();
      input.click();
    });
  }
  
  // Keyboard accessibility
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  
  // Drag and drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dropzone--dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dropzone--dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dropzone--dragover');
    const file = e.dataTransfer.files[0];
    handleFileRead(file, feedback, onSuccess);
  });
  
  // File selection
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFileRead(file, feedback, onSuccess);
  });
}

function handleFileRead(file, feedbackEl, onSuccess) {
  if (!file) return;
  
  feedbackEl.textContent = `Loading ${file.name}...`;
  feedbackEl.className = 'upload-status';
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const parsed = parseCSVData(text);
      onSuccess(parsed, file.name);
      feedbackEl.textContent = `✓ Loaded ${file.name}`;
      feedbackEl.className = 'upload-status success';
      
      if (typeof markDataUploaded === 'function') {
        markDataUploaded(file.name);
      }
    } catch (error) {
      feedbackEl.textContent = `✗ Error: ${error.message}`;
      feedbackEl.className = 'upload-status error';
    }
  };
  reader.onerror = () => {
    feedbackEl.textContent = '✗ Unable to read file.';
    feedbackEl.className = 'upload-status error';
  };
  reader.readAsText(file);
}

function parseCSVData(text) {
  // Use shared csv_utils if available, otherwise basic parsing
  if (typeof parseDelimitedText === 'function') {
    return parseDelimitedText(text);
  }
  
  // Basic CSV parsing fallback
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return values;
  });
  
  return { headers, rows };
}

function handlePerceptualUpload(parsed, filename) {
  // First column is attribute names, rest are brands
  const attributes = parsed.rows.map(row => row[0]);
  const brands = parsed.headers.slice(1);
  
  // Build matrix: [attributes][brands]
  const matrix = parsed.rows.map(row => 
    row.slice(1).map(v => parseFloat(v) || 0)
  );
  
  loadPerceptualData(brands, attributes, matrix);
}

function loadPerceptualData(brands, attributes, matrix) {
  AppState.perceptualData = { brands, attributes, matrix };
  
  // Update preview
  showPerceptualPreview(brands, attributes, matrix);
  
  // Populate focal brand dropdown
  populateFocalBrandSelect(brands);
  
  // Enable run button if data is valid
  validateAndEnableRun();
}

function showPerceptualPreview(brands, attributes, matrix) {
  const preview = document.getElementById('perceptual-preview');
  const table = document.getElementById('perceptual-preview-table');
  const summary = document.getElementById('perceptual-summary');
  
  if (!preview || !table) return;
  
  // Build table HTML
  let html = '<thead><tr><th>Attribute</th>';
  brands.forEach(b => html += `<th>${b}</th>`);
  html += '</tr></thead><tbody>';
  
  // Show first 5 rows
  const displayRows = Math.min(5, attributes.length);
  for (let i = 0; i < displayRows; i++) {
    html += `<tr><td><strong>${attributes[i]}</strong></td>`;
    matrix[i].forEach(v => html += `<td>${v.toFixed(2)}</td>`);
    html += '</tr>';
  }
  
  if (attributes.length > 5) {
    html += `<tr><td colspan="${brands.length + 1}" style="text-align:center; color:#888;">... ${attributes.length - 5} more attributes ...</td></tr>`;
  }
  
  html += '</tbody>';
  table.innerHTML = html;
  
  summary.textContent = `${brands.length} brands × ${attributes.length} attributes`;
  preview.classList.remove('hidden');
}

function handlePreferenceUpload(parsed, filename) {
  // Store raw parsed data for segment column detection
  const rawHeaders = parsed.headers;
  const rawRows = parsed.rows;
  
  // First column might be customer ID (skip if non-numeric header)
  const firstColIsId = isNaN(parseFloat(parsed.rows[0][0]));
  const brandStartIdx = firstColIsId ? 1 : 0;
  
  // Detect potential segment columns (non-numeric columns after the ID)
  const potentialSegmentCols = [];
  rawHeaders.forEach((header, idx) => {
    if (idx < brandStartIdx) return; // Skip ID column
    
    // Check if this column is categorical (not numeric ratings)
    const values = rawRows.map(row => row[idx]);
    const uniqueValues = [...new Set(values)];
    const allNumeric = values.every(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0);
    const fewUniqueValues = uniqueValues.length <= 10; // Likely a segment if ≤10 unique values
    const looksLikeRating = allNumeric && Math.max(...values.map(v => parseFloat(v))) <= 100;
    
    // It's a potential segment column if:
    // - It has few unique values AND
    // - Values are not typical ratings (or explicitly non-numeric)
    if (fewUniqueValues && (!looksLikeRating || uniqueValues.length <= 5)) {
      potentialSegmentCols.push({
        index: idx,
        name: header,
        values: uniqueValues,
        isNumeric: allNumeric
      });
    }
  });
  
  // Store potential segment columns for UI
  AppState._potentialSegmentCols = potentialSegmentCols;
  AppState._rawPreferenceData = { headers: rawHeaders, rows: rawRows, brandStartIdx };
  
  // Parse as before (excluding segment column for now)
  const brands = rawHeaders.slice(brandStartIdx);
  const customers = rawRows.map(row => 
    row.slice(brandStartIdx).map(v => parseFloat(v) || 0)
  );
  
  loadPreferenceData(brands, customers);
  
  // Show segment column option if there are potential columns
  showPredefinedSegmentOption(potentialSegmentCols);
}

function showPredefinedSegmentOption(potentialCols) {
  const section = document.getElementById('predefined-segment-section');
  const selector = document.getElementById('segment-column-select');
  const checkbox = document.getElementById('has-segment-column');
  const selectorDiv = document.getElementById('segment-column-selector');
  const predefinedOption = document.getElementById('predefined-segment-option');
  
  if (!section) return;
  
  // Show the section
  section.style.display = 'block';
  
  // Populate dropdown with potential columns
  selector.innerHTML = '<option value="">-- Select column --</option>';
  potentialCols.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col.index;
    opt.textContent = `${col.name} (${col.values.length} values: ${col.values.slice(0, 3).join(', ')}${col.values.length > 3 ? '...' : ''})`;
    selector.appendChild(opt);
  });
  
  // Wire up checkbox
  checkbox.onchange = function() {
    selectorDiv.classList.toggle('hidden', !this.checked);
    if (!this.checked) {
      // Clear segment column selection
      selector.value = '';
      applySegmentColumnSelection(null);
    }
  };
  
  // Wire up selector
  selector.onchange = function() {
    const colIdx = this.value ? parseInt(this.value) : null;
    applySegmentColumnSelection(colIdx);
  };
}

function applySegmentColumnSelection(colIdx) {
  const predefinedOption = document.getElementById('predefined-segment-option');
  const segmentModeHint = document.getElementById('segment-mode-hint');
  const previewHint = document.getElementById('segment-column-preview');
  
  if (colIdx === null) {
    // Clear pre-defined segments
    if (AppState.preferenceData) {
      delete AppState.preferenceData.predefinedSegments;
      delete AppState.preferenceData.segmentLabels;
      delete AppState.preferenceData.segmentColumn;
    }
    if (predefinedOption) predefinedOption.disabled = true;
    if (previewHint) previewHint.textContent = '';
    return;
  }
  
  const raw = AppState._rawPreferenceData;
  const col = AppState._potentialSegmentCols.find(c => c.index === colIdx);
  if (!raw || !col) return;
  
  // Extract segment values for each customer
  const segmentValues = raw.rows.map(row => row[colIdx]);
  const uniqueLabels = [...new Set(segmentValues)];
  
  // Map values to segment indices
  const segmentIndices = segmentValues.map(v => uniqueLabels.indexOf(v));
  
  // Update preference data with pre-defined segments
  AppState.preferenceData.predefinedSegments = segmentIndices;
  AppState.preferenceData.segmentLabels = uniqueLabels;
  AppState.preferenceData.segmentColumn = col.name;
  
  // Rebuild customers array excluding the segment column
  const brandCols = raw.headers.slice(raw.brandStartIdx).filter((h, i) => (raw.brandStartIdx + i) !== colIdx);
  const customers = raw.rows.map(row => {
    return row.slice(raw.brandStartIdx)
      .filter((v, i) => (raw.brandStartIdx + i) !== colIdx)
      .map(v => parseFloat(v) || 0);
  });
  
  AppState.preferenceData.brands = brandCols;
  AppState.preferenceData.customers = customers;
  
  // Enable pre-defined option in segment mode dropdown
  if (predefinedOption) {
    predefinedOption.disabled = false;
    predefinedOption.textContent = `Use pre-defined: ${col.name} (${uniqueLabels.length} segments)`;
  }
  
  // Update hint
  if (segmentModeHint) {
    segmentModeHint.textContent = `Pre-defined segments available: ${uniqueLabels.join(', ')}`;
  }
  
  // Show preview
  if (previewHint) {
    const counts = uniqueLabels.map(label => ({
      label,
      count: segmentValues.filter(v => v === label).length
    }));
    previewHint.innerHTML = `<strong>Segment distribution:</strong> ` + 
      counts.map(c => `${c.label} (n=${c.count})`).join(', ');
  }
  
  // Refresh preview table
  showPreferencePreview(AppState.preferenceData.brands, AppState.preferenceData.customers);
}

// Enable pre-defined segments when loading from a scenario (not file upload)
function enablePredefinedSegmentFromScenario(segmentLabels) {
  const predefinedOption = document.getElementById('predefined-segment-option');
  const segmentModeHint = document.getElementById('segment-mode-hint');
  const segmentModeSelect = document.getElementById('segment-mode');
  
  if (!predefinedOption || !segmentLabels) return;
  
  // Enable and update the pre-defined option
  predefinedOption.disabled = false;
  predefinedOption.textContent = `Use pre-defined: ${AppState.preferenceData.segmentColumn} (${segmentLabels.length} segments)`;
  
  // Update hint to show available segments
  if (segmentModeHint) {
    segmentModeHint.innerHTML = `<strong>Pre-defined segments available:</strong> ${segmentLabels.join(', ')}`;
  }
  
  // Auto-select pre-defined mode for scenarios
  if (segmentModeSelect) {
    segmentModeSelect.value = 'predefined';
  }
  
  // Hide the segment column selector section (not needed for scenarios)
  const predefinedSection = document.getElementById('predefined-segment-section');
  if (predefinedSection) {
    predefinedSection.style.display = 'none';
  }
}

function loadPreferenceData(brands, customers) {
  AppState.preferenceData = { brands, customers };
  
  // Update preview
  showPreferencePreview(brands, customers);
  
  // Show segment settings
  document.getElementById('segment-settings').style.display = 'block';
  document.getElementById('share-settings').style.display = 'block';
  
  // Enable run button
  validateAndEnableRun();
}

function showPreferencePreview(brands, customers) {
  const preview = document.getElementById('preference-preview');
  const table = document.getElementById('preference-preview-table');
  const summary = document.getElementById('preference-summary');
  
  if (!preview || !table) return;
  
  let html = '<thead><tr><th>Customer</th>';
  brands.forEach(b => html += `<th>${b}</th>`);
  html += '</tr></thead><tbody>';
  
  const displayRows = Math.min(5, customers.length);
  for (let i = 0; i < displayRows; i++) {
    html += `<tr><td>${i + 1}</td>`;
    customers[i].forEach(v => html += `<td>${v.toFixed(1)}</td>`);
    html += '</tr>';
  }
  
  if (customers.length > 5) {
    html += `<tr><td colspan="${brands.length + 1}" style="text-align:center; color:#888;">... ${customers.length - 5} more customers ...</td></tr>`;
  }
  
  html += '</tbody>';
  table.innerHTML = html;
  
  summary.textContent = `${customers.length} customers × ${brands.length} brands`;
  preview.classList.remove('hidden');
}

function populateFocalBrandSelect(brands) {
  const select = document.getElementById('focal-brand');
  if (!select) return;
  
  select.innerHTML = '<option value="">No focal brand</option>';
  brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    select.appendChild(option);
  });
}

// ==================== PREFERENCE TOGGLE ====================
function setupPreferenceToggle() {
  const toggle = document.getElementById('include-preferences');
  if (!toggle) return;
  
  toggle.addEventListener('change', (e) => {
    togglePreferenceSection(e.target.checked);
  });
}

function togglePreferenceSection(show) {
  const section = document.getElementById('preference-upload-section');
  const segmentSettings = document.getElementById('segment-settings');
  const shareSettings = document.getElementById('share-settings');
  const prefToggles = document.querySelectorAll('#show-preferences-toggle, #show-segments-toggle, #show-customers-toggle');
  
  AppState.settings.includePreferences = show;
  
  if (section) {
    section.classList.toggle('hidden', !show);
  }
  
  if (!show) {
    if (segmentSettings) segmentSettings.style.display = 'none';
    if (shareSettings) shareSettings.style.display = 'none';
    prefToggles.forEach(t => t.style.display = 'none');
  } else if (AppState.preferenceData) {
    if (segmentSettings) segmentSettings.style.display = 'block';
    if (shareSettings) shareSettings.style.display = 'block';
    prefToggles.forEach(t => t.style.display = 'flex');
  }
}

// ==================== SETTINGS ====================
function setupSettingsListeners() {
  const dimensionMode = document.getElementById('dimension-mode');
  const focalBrand = document.getElementById('focal-brand');
  const segmentMode = document.getElementById('segment-mode');
  const shareRule = document.getElementById('share-rule');
  
  if (dimensionMode) {
    dimensionMode.addEventListener('change', (e) => {
      AppState.settings.dimensionMode = e.target.value;
    });
  }
  
  if (focalBrand) {
    focalBrand.addEventListener('change', (e) => {
      AppState.settings.focalBrand = e.target.value || null;
    });
  }
  
  if (segmentMode) {
    segmentMode.addEventListener('change', (e) => {
      AppState.settings.segmentMode = e.target.value;
    });
  }
  
  if (shareRule) {
    shareRule.addEventListener('change', (e) => {
      AppState.settings.shareRule = e.target.value;
    });
  }
}

// ==================== RUN ANALYSIS ====================
function setupRunButton() {
  const runBtn = document.getElementById('run-analysis');
  if (!runBtn) return;
  
  runBtn.addEventListener('click', runAnalysis);
}

function validateAndEnableRun() {
  const runBtn = document.getElementById('run-analysis');
  if (!runBtn) return;
  
  const hasPerceptual = AppState.perceptualData !== null;
  const needsPreference = AppState.settings.includePreferences;
  const hasPreference = AppState.preferenceData !== null;
  
  const canRun = hasPerceptual && (!needsPreference || hasPreference);
  runBtn.disabled = !canRun;
}

function runAnalysis() {
  if (!AppState.perceptualData) {
    alert('Please upload perceptual data first.');
    return;
  }
  
  console.log('Running positioning analysis...');
  
  if (typeof markRunAttempted === 'function') {
    markRunAttempted();
  }
  
  try {
    // Get standardization setting
    const standardize = document.getElementById('standardize-data')?.checked || false;
    
    // Run PCA on perceptual data
    const pcaResults = MDSMath.performPCA(
      AppState.perceptualData.matrix,
      AppState.perceptualData.brands,
      AppState.perceptualData.attributes,
      { standardize }
    );
    
    // Determine number of dimensions
    const numDims = determineNumDimensions(pcaResults.varianceExplained);
    
    // Build results object
    AppState.results = {
      brandCoords: pcaResults.brandCoords,
      attrLoadings: pcaResults.attrLoadings,
      varianceExplained: pcaResults.varianceExplained,
      cumulativeVariance: pcaResults.cumulativeVariance,
      numDimensions: numDims,
      dimensionInterpretations: interpretDimensions(pcaResults.attrLoadings, AppState.perceptualData.attributes)
    };
    
    // If preference data, compute segments and ideal points
    if (AppState.settings.includePreferences && AppState.preferenceData) {
      const prefResults = computePreferenceAnalysis();
      AppState.results.preferences = prefResults;
    }
    
    // Store original coords for simulation (deep copy to prevent mutation)
    AppState.simulation.originalCoords = deepCopyCoords(AppState.results.brandCoords);
    AppState.simulation.modifiedCoords = deepCopyCoords(AppState.results.brandCoords);
    
    // Update all displays
    updateAllDisplays();
    
    // Generate diagnostics
    generateDiagnostics();
    
    // Enable export buttons
    enableExportButtons();
    
    // Show conditional sections
    showResultsSections();
    
    if (typeof markRunSuccessful === 'function') {
      markRunSuccessful({
        n_brands: AppState.perceptualData.brands.length,
        n_attributes: AppState.perceptualData.attributes.length,
        n_dimensions: numDims,
        variance_explained: AppState.results.cumulativeVariance[numDims - 1]
      });
    }
    
    console.log('Analysis complete!', AppState.results);
    
  } catch (error) {
    console.error('Analysis failed:', error);
    alert('Analysis failed: ' + error.message);
  }
}

function determineNumDimensions(varianceExplained) {
  if (AppState.settings.dimensionMode !== 'auto') {
    return parseInt(AppState.settings.dimensionMode);
  }
  
  // Auto: 2D if ≥80% variance, otherwise 3D
  let cumulative = 0;
  for (let i = 0; i < varianceExplained.length; i++) {
    cumulative += varianceExplained[i];
    if (cumulative >= 0.80) {
      return i < 2 ? 2 : i + 1;
    }
  }
  return 3;
}

function interpretDimensions(attrLoadings, attributes) {
  const interpretations = [];
  const numDims = Math.min(3, attrLoadings[0].length);
  
  for (let d = 0; d < numDims; d++) {
    // Get loadings for this dimension
    const loadings = attributes.map((attr, i) => ({
      attribute: attr,
      loading: attrLoadings[i][d]
    }));
    
    // Sort by loading
    loadings.sort((a, b) => b.loading - a.loading);
    
    // Get top positive and negative
    const positive = loadings.slice(0, 3).filter(l => l.loading > 0.3);
    const negative = loadings.slice(-3).reverse().filter(l => l.loading < -0.3);
    
    interpretations.push({
      dimension: d + 1,
      positiveEnd: positive.map(l => l.attribute),
      negativeEnd: negative.map(l => l.attribute),
      interpretation: generateDimensionLabel(positive, negative)
    });
  }
  
  return interpretations;
}

function generateDimensionLabel(positive, negative) {
  if (positive.length === 0 && negative.length === 0) {
    return 'Mixed/Complex';
  }
  
  const posLabel = positive.length > 0 ? positive[0].attribute : '';
  const negLabel = negative.length > 0 ? negative[0].attribute : '';
  
  if (posLabel && negLabel) {
    return `${posLabel} vs. ${negLabel}`;
  }
  return posLabel || negLabel || 'Unnamed';
}

function computePreferenceAnalysis() {
  // Compute average preferences per brand
  const brandAvgs = {};
  const customers = AppState.preferenceData.customers;
  const brands = AppState.preferenceData.brands;
  
  brands.forEach((brand, bIdx) => {
    const sum = customers.reduce((acc, cust) => acc + cust[bIdx], 0);
    brandAvgs[brand] = sum / customers.length;
  });
  
  // Determine segmentation method
  const segmentMode = AppState.settings.segmentMode;
  let segments, segmentIdealPoints, numSegments, segmentLabels;
  
  if (segmentMode === 'predefined' && AppState.preferenceData.predefinedSegments) {
    // Use pre-defined segments from data
    segments = createSegmentsFromPredefined(
      customers, 
      AppState.preferenceData.predefinedSegments,
      AppState.preferenceData.segmentLabels
    );
    numSegments = AppState.preferenceData.segmentLabels.length;
    segmentLabels = AppState.preferenceData.segmentLabels;
    segmentIdealPoints = computeSegmentIdealPointsFromPredefined(segments, brands, segmentLabels);
  } else {
    // Cluster customers using k-means on preferences
    numSegments = segmentMode === 'auto' ? 3 : parseInt(segmentMode);
    segments = MDSMath.kMeansCluster(customers, numSegments);
    segmentLabels = null; // Will use "Segment 1", "Segment 2", etc.
    segmentIdealPoints = computeSegmentIdealPoints(segments, brands);
  }
  
  return {
    brandAverages: brandAvgs,
    segments: segments,
    segmentIdealPoints: segmentIdealPoints,
    numSegments: numSegments,
    segmentLabels: segmentLabels,
    usingPredefinedSegments: segmentMode === 'predefined'
  };
}

function computeSegmentIdealPoints(segments, brands) {
  // For each segment, compute the centroid preference vector
  // Then project onto perceptual dimensions
  const idealPoints = [];
  
  for (let s = 0; s < segments.centroids.length; s++) {
    const centroid = segments.centroids[s];
    
    // Weight brand positions by segment preferences
    let idealX = 0, idealY = 0, idealZ = 0;
    let totalWeight = 0;
    
    brands.forEach((brand, i) => {
      const weight = centroid[i];
      const coords = AppState.results.brandCoords[brand];
      if (coords) {
        idealX += weight * coords[0];
        idealY += weight * coords[1];
        idealZ += weight * (coords[2] || 0);
        totalWeight += weight;
      }
    });
    
    if (totalWeight > 0) {
      idealPoints.push({
        segment: s + 1,
        size: segments.assignments.filter(a => a === s).length,
        coords: [idealX / totalWeight, idealY / totalWeight, idealZ / totalWeight]
      });
    }
  }
  
  return idealPoints;
}

// Create segments structure from pre-defined segment column
function createSegmentsFromPredefined(customers, segmentIndices, segmentLabels) {
  const numSegments = segmentLabels.length;
  
  // Compute centroids for each pre-defined segment
  const centroids = [];
  const counts = [];
  
  for (let s = 0; s < numSegments; s++) {
    counts[s] = 0;
    centroids[s] = new Array(customers[0].length).fill(0);
  }
  
  // Sum preferences by segment
  customers.forEach((cust, i) => {
    const seg = segmentIndices[i];
    counts[seg]++;
    cust.forEach((val, j) => {
      centroids[seg][j] += val;
    });
  });
  
  // Compute averages
  centroids.forEach((centroid, s) => {
    if (counts[s] > 0) {
      for (let j = 0; j < centroid.length; j++) {
        centroid[j] /= counts[s];
      }
    }
  });
  
  return {
    assignments: segmentIndices,
    centroids: centroids,
    labels: segmentLabels
  };
}

// Compute segment ideal points for pre-defined segments (with labels)
function computeSegmentIdealPointsFromPredefined(segments, brands, segmentLabels) {
  const idealPoints = [];
  
  for (let s = 0; s < segments.centroids.length; s++) {
    const centroid = segments.centroids[s];
    
    // Weight brand positions by segment preferences
    let idealX = 0, idealY = 0, idealZ = 0;
    let totalWeight = 0;
    
    brands.forEach((brand, i) => {
      const weight = centroid[i];
      const coords = AppState.results.brandCoords[brand];
      if (coords) {
        idealX += weight * coords[0];
        idealY += weight * coords[1];
        idealZ += weight * (coords[2] || 0);
        totalWeight += weight;
      }
    });
    
    if (totalWeight > 0) {
      idealPoints.push({
        segment: s + 1,
        label: segmentLabels[s],
        size: segments.assignments.filter(a => a === s).length,
        coords: [idealX / totalWeight, idealY / totalWeight, idealZ / totalWeight]
      });
    }
  }
  
  return idealPoints;
}

// Compute individual customer ideal points (not aggregated into segments)
function computeIndividualCustomerPoints() {
  if (!AppState.preferenceData || !AppState.results?.brandCoords) return [];
  
  const customers = AppState.preferenceData.customers;
  const brands = AppState.preferenceData.brands;
  const brandCoords = AppState.results.brandCoords;
  
  const customerPoints = [];
  
  customers.forEach((preferences, custIdx) => {
    // Weight brand positions by this customer's preferences
    let idealX = 0, idealY = 0, idealZ = 0;
    let totalWeight = 0;
    
    brands.forEach((brand, i) => {
      const weight = preferences[i];
      const coords = brandCoords[brand];
      if (coords && weight > 0) {
        idealX += weight * coords[0];
        idealY += weight * coords[1];
        idealZ += weight * (coords[2] || 0);
        totalWeight += weight;
      }
    });
    
    if (totalWeight > 0) {
      // Determine which segment this customer belongs to (if segments computed)
      let segmentId = null;
      if (AppState.results.preferences?.segments?.assignments) {
        segmentId = AppState.results.preferences.segments.assignments[custIdx] + 1;
      }
      
      customerPoints.push({
        id: custIdx + 1,
        segment: segmentId,
        coords: [idealX / totalWeight, idealY / totalWeight, idealZ / totalWeight]
      });
    }
  });
  
  return customerPoints;
}

// ==================== DISPLAY UPDATES ====================
function updateAllDisplays() {
  // Core positioning visualization
  renderPositioningMap();
  
  // Dimension & coordinate tables
  renderDimensionTable();
  renderBrandCoordsTable();
  renderAttrLoadingsTable();
  
  // 2026 UX: New interactive visualizations
  renderInsightCards();
  renderDimensionExplorer();
  renderDistanceHeatmap();
  populateBrandSelectors();
  renderAttributeImportanceChart();
  
  // Update layer toggle explainers with dynamic context
  updateLayerExplainers();
  
  // Preference-dependent renders
  if (AppState.results.preferences) {
    renderPreferenceCharts();
    renderSegmentPersonas();
    renderSegmentBrandFitChart();
  }
  
  // Reports
  generateReports();
  generateDiagnostics();
  
  // Focal brand analysis
  if (AppState.settings.focalBrand) {
    renderFocalBrandAnalysis(AppState.settings.focalBrand);
  }
}

function showResultsSections() {
  // Show preference section if applicable
  if (AppState.results.preferences) {
    document.querySelector('.preference-results')?.classList.remove('hidden');
    const segsToggle = document.getElementById('show-segments-toggle');
    const custToggle = document.getElementById('show-customers-toggle');
    if (segsToggle) segsToggle.style.display = 'flex';
    if (custToggle) custToggle.style.display = 'flex';
  }
  
  // Show simulation section (playground)
  document.querySelector('.simulation-section')?.classList.remove('hidden');
  
  // Show competitive intelligence section  
  document.querySelector('.competitive-intel-section')?.classList.remove('hidden');
  
  // Populate simulation brand selector
  const simBrandSelect = document.getElementById('sim-brand-select');
  if (simBrandSelect) {
    simBrandSelect.innerHTML = '<option value="">Select a brand...</option>';
    Object.keys(AppState.results.brandCoords).forEach(brand => {
      const option = document.createElement('option');
      option.value = brand;
      option.textContent = brand;
      simBrandSelect.appendChild(option);
    });
  }
  
  // Show focal brand section if selected
  if (AppState.settings.focalBrand) {
    document.querySelector('.focal-brand-section').classList.remove('hidden');
  }
}

// ==================== VISUALIZATION ====================
function renderPositioningMap() {
  const container = document.getElementById('positioning-map');
  if (!container || !AppState.results) return;
  
  const view = AppState.currentView;
  
  // Update UI based on view mode (enable/disable 3D-incompatible features)
  update3DModeUI(view === '3d');
  
  // Handle 3D view separately (uses Plotly)
  if (view === '3d') {
    render3DPositioningMap(container);
    return;
  }
  
  // Determine which dimensions to show for 2D views
  let dimX = 0, dimY = 1;
  if (view === 'dim13') { dimY = 2; }
  else if (view === 'dim23') { dimX = 1; dimY = 2; }
  
  // Build dimension labels with variance explained (if available)
  const variance = AppState.results.varianceExplained || [];
  const dimLabels = [
    variance[0] ? `Dimension I (${(variance[0] * 100).toFixed(0)}%)` : 'Dimension I',
    variance[1] ? `Dimension II (${(variance[1] * 100).toFixed(0)}%)` : 'Dimension II',
    variance[2] ? `Dimension III (${(variance[2] * 100).toFixed(0)}%)` : 'Dimension III'
  ];
  
  // Get toggle states
  const showBrands = document.getElementById('show-brands')?.checked ?? true;
  const showAttrs = document.getElementById('show-attributes')?.checked ?? true;
  const showVoronoi = document.getElementById('show-competitive-zones')?.checked ?? false;
  const showOpportunities = document.getElementById('show-whitespace')?.checked ?? false;
  const showSegments = document.getElementById('show-segments')?.checked ?? false;
  const showCustomers = document.getElementById('show-customers')?.checked ?? false;
  
  // Initialize D3 map if not already done
  PositioningMap.init('positioning-map', {
    onBrandDrag: handleBrandDrag,
    onBrandDragEnd: handleBrandDragEnd,
    onBrandClick: handleBrandClick
  });
  
  // Compute individual customer points if needed
  const customerPoints = (showCustomers && AppState.preferenceData) 
    ? computeIndividualCustomerPoints() 
    : null;
  
  // Prepare data for D3 map
  const mapData = {
    brandCoords: AppState.simulation.modifiedCoords,
    attrLoadings: AppState.results.attrLoadings,
    attributes: AppState.perceptualData.attributes,
    segmentIdealPoints: AppState.results.preferences?.segmentIdealPoints || null,
    customerPoints: customerPoints,
    // For preference-based opportunity zones
    preferences: AppState.results.preferences || null,
    totalCustomers: AppState.preferenceData?.customers?.length || 0,
    shareRule: AppState.settings?.shareRule || 'logit',
    // Number of dimensions in the full solution (for N-D entry opportunity calculations)
    numDimensions: AppState.results.numDimensions || 2
  };
  
  // Render with D3
  PositioningMap.render(mapData, {
    dimX,
    dimY,
    dimLabels: [dimLabels[dimX], dimLabels[dimY]],
    showBrands,
    showAttributes: showAttrs,
    showVoronoi,
    showOpportunities,
    showSegments: showSegments && AppState.results.preferences,
    showCustomers: showCustomers && AppState.preferenceData,
    draggable: true
  });
}

// Update UI elements when switching to/from 3D mode
function update3DModeUI(is3D) {
  // Toggles that don't work in 3D
  const disabledIn3D = [
    'show-competitive-zones-toggle',  // Voronoi is 2D only
    'show-whitespace-toggle'          // Entry opportunities grid is 2D
  ];
  
  disabledIn3D.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (is3D) {
        el.classList.add('toggle-disabled');
        el.title = '3D mode: This feature requires 2D view';
        const checkbox = el.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.disabled = true;
      } else {
        el.classList.remove('toggle-disabled');
        el.title = '';
        const checkbox = el.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.disabled = false;
      }
    }
  });
  
  // Show/hide 3D mode indicator
  let indicator = document.getElementById('3d-mode-indicator');
  if (is3D) {
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = '3d-mode-indicator';
      indicator.className = 'mode-indicator';
      indicator.innerHTML = `
        <span class="mode-icon">🎮</span>
        <span class="mode-text">3D Exploration Mode</span>
        <span class="mode-hint">Drag to rotate • Scroll to zoom • Simulation disabled</span>
      `;
      const mapContainer = document.querySelector('.map-hero-container');
      if (mapContainer) mapContainer.prepend(indicator);
    }
    indicator.classList.remove('hidden');
  } else if (indicator) {
    indicator.classList.add('hidden');
  }
  
  // Hide drag instruction in 3D mode
  const dragInstruction = document.getElementById('drag-instruction');
  if (dragInstruction) {
    dragInstruction.style.display = is3D ? 'none' : '';
  }
}

// ==================== 3D VISUALIZATION (Plotly) ====================
function render3DPositioningMap(container) {
  // Clear D3 SVG before rendering 3D (Plotly)
  // This prevents the 2D chart from showing behind/overlapping the 3D view
  const existingSvg = container.querySelector('svg');
  if (existingSvg) {
    existingSvg.remove();
  }
  // Also purge any existing Plotly chart to avoid memory leaks
  try { Plotly.purge(container); } catch (e) { /* ignore if no chart */ }
  
  const coords = AppState.simulation.modifiedCoords;
  const brands = Object.keys(coords);
  
  // Check we have 3 dimensions
  const hasDim3 = brands.length > 0 && coords[brands[0]].length >= 3;
  if (!hasDim3) {
    container.innerHTML = `
      <div class="chart-placeholder">
        <p>⚠️ 3D view requires at least 3 dimensions.</p>
        <p>Add more attributes to your perceptual data for meaningful 3D analysis.</p>
      </div>
    `;
    return;
  }
  
  const traces = [];
  
  // Get toggle states
  const showBrands = document.getElementById('show-brands')?.checked ?? true;
  const showAttrs = document.getElementById('show-attributes')?.checked ?? true;
  const showSegments = document.getElementById('show-segments')?.checked ?? false;
  
  // Brand markers
  if (showBrands) {
    traces.push({
      x: brands.map(b => coords[b][0]),
      y: brands.map(b => coords[b][1]),
      z: brands.map(b => coords[b][2]),
      text: brands,
      mode: 'markers+text',
      type: 'scatter3d',
      name: 'Brands',
      marker: {
        size: 10,
        color: '#2563eb',
        line: { color: 'white', width: 1 }
      },
      textposition: 'top center',
      textfont: { size: 10, color: '#1f2937' },
      hovertemplate: '<b>%{text}</b><br>Dim I: %{x:.2f}<br>Dim II: %{y:.2f}<br>Dim III: %{z:.2f}<extra></extra>'
    });
  }
  
  // Attribute vectors (as 3D lines from origin)
  if (showAttrs && AppState.results.attrLoadings) {
    const loadings = AppState.results.attrLoadings;
    const attrs = AppState.perceptualData.attributes;
    
    // Scale factor
    const maxCoord = Math.max(...brands.flatMap(b => coords[b].slice(0, 3).map(Math.abs)));
    const maxLoading = Math.max(...loadings.flat().map(Math.abs));
    const scale = maxCoord / maxLoading * 0.7;
    
    attrs.forEach((attr, i) => {
      if (loadings[i].length >= 3) {
        const x = loadings[i][0] * scale;
        const y = loadings[i][1] * scale;
        const z = loadings[i][2] * scale;
        
        // Line from origin
        traces.push({
          x: [0, x],
          y: [0, y],
          z: [0, z],
          mode: 'lines',
          type: 'scatter3d',
          name: attr,
          showlegend: false,
          line: { color: '#64748b', width: 3 },
          hoverinfo: 'skip'
        });
        
        // Endpoint marker with label
        traces.push({
          x: [x],
          y: [y],
          z: [z],
          text: [attr],
          mode: 'markers+text',
          type: 'scatter3d',
          showlegend: false,
          marker: { size: 4, color: '#475569' },
          textposition: 'top center',
          textfont: { size: 9, color: '#475569' },
          hovertemplate: `<b>${attr}</b><br>Loading: (${loadings[i][0].toFixed(2)}, ${loadings[i][1].toFixed(2)}, ${loadings[i][2].toFixed(2)})<extra></extra>`
        });
      }
    });
  }
  
  // Segment ideal points
  if (showSegments && AppState.results.preferences?.segmentIdealPoints) {
    const segments = AppState.results.preferences.segmentIdealPoints;
    const segColors = ['#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e'];
    
    segments.forEach((seg, i) => {
      if (seg.coords.length >= 3) {
        traces.push({
          x: [seg.coords[0]],
          y: [seg.coords[1]],
          z: [seg.coords[2]],
          text: [`Seg ${seg.segment}`],
          mode: 'markers+text',
          type: 'scatter3d',
          name: `Segment ${seg.segment}`,
          marker: {
            size: 12,
            color: segColors[i % segColors.length],
            symbol: 'diamond'
          },
          textposition: 'bottom center',
          textfont: { size: 9, color: segColors[i % segColors.length] },
          hovertemplate: `<b>Segment ${seg.segment}</b><br>Size: ${seg.size}<br>Position: (${seg.coords[0].toFixed(2)}, ${seg.coords[1].toFixed(2)}, ${seg.coords[2].toFixed(2)})<extra></extra>`
        });
      }
    });
  }
  
  // Build axis titles with variance explained
  const variance = AppState.results.varianceExplained || [];
  const xTitle = variance[0] ? `Dimension I (${(variance[0] * 100).toFixed(0)}%)` : 'Dimension I';
  const yTitle = variance[1] ? `Dimension II (${(variance[1] * 100).toFixed(0)}%)` : 'Dimension II';
  const zTitle = variance[2] ? `Dimension III (${(variance[2] * 100).toFixed(0)}%)` : 'Dimension III';
  
  const layout = {
    scene: {
      xaxis: { title: xTitle, gridcolor: '#e2e8f0', zerolinecolor: '#94a3b8' },
      yaxis: { title: yTitle, gridcolor: '#e2e8f0', zerolinecolor: '#94a3b8' },
      zaxis: { title: zTitle, gridcolor: '#e2e8f0', zerolinecolor: '#94a3b8' },
      bgcolor: '#fafbfc',
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.2 }
      }
    },
    margin: { t: 30, r: 30, b: 30, l: 30 },
    paper_bgcolor: 'white',
    showlegend: false,
    hovermode: 'closest'
  };
  
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d']
  };
  
  Plotly.newPlot(container, traces, layout, config);
}

// Handle brand drag (live update)
function handleBrandDrag(brand, newCoords, dimX, dimY) {
  // Update modified coordinates
  AppState.simulation.modifiedCoords[brand][dimX] = newCoords[0];
  AppState.simulation.modifiedCoords[brand][dimY] = newCoords[1];
  
  // Show simulation bar with live metrics
  showSimulationBar(brand);
  updateSimulationBar(brand, AppState.simulation.originalCoords[brand]);
}

// Handle brand drag end
function handleBrandDragEnd(brand, newCoords, dimX, dimY) {
  // Final update
  AppState.simulation.modifiedCoords[brand][dimX] = newCoords[0];
  AppState.simulation.modifiedCoords[brand][dimY] = newCoords[1];
  AppState.simulation.hasChanges = true;
  
  // Track which brands have been repositioned
  if (!AppState.simulation.repositionedBrands.includes(brand)) {
    AppState.simulation.repositionedBrands.push(brand);
  }
  
  // Recalculate ALL repositioned results for comparison
  recalculateRepositionedResults();
  
  // Update visualizations with comparison mode
  renderDistanceHeatmap();
  renderInsightCards();
  showRepositioningBanner();
  
  // Update Positioning Playground impact dashboard
  updateImpactDashboard(brand);
  
  // Update focal brand if this is the one
  const focalBrand = document.getElementById('focal-brand-select')?.value;
  if (focalBrand === brand) {
    renderFocalBrandAnalysis(brand);
  }
}

// Recalculate all results based on repositioned coordinates
function recalculateRepositionedResults() {
  const sim = AppState.simulation;
  
  // Calculate original results (if not cached)
  if (!sim.originalResults.marketShares || Object.keys(sim.originalResults.marketShares).length === 0) {
    if (AppState.preferenceData?.customers?.length > 0) {
      sim.originalResults.marketShares = calculateMarketShares(sim.originalCoords);
    }
    sim.originalResults.distances = calculateDistanceMatrix(sim.originalCoords);
    sim.originalResults.insights = generateKeyInsightsFor(sim.originalCoords);
  }
  
  // Calculate repositioned results
  if (AppState.preferenceData?.customers?.length > 0) {
    sim.repositionedResults.marketShares = calculateMarketShares(sim.modifiedCoords);
  }
  sim.repositionedResults.distances = calculateDistanceMatrix(sim.modifiedCoords);
  sim.repositionedResults.insights = generateKeyInsightsFor(sim.modifiedCoords);
}

// Helper: Get coordinate slice for full N-D calculations (respects solution dimensionality)
function getFullCoords(coordArray) {
  const numDims = AppState.results?.numDimensions || 2;
  return coordArray.slice(0, numDims);
}

// Calculate distance matrix for a set of coordinates (uses full N-D space)
function calculateDistanceMatrix(coords) {
  const brands = Object.keys(coords);
  const matrix = {};
  
  brands.forEach(b1 => {
    matrix[b1] = {};
    brands.forEach(b2 => {
      matrix[b1][b2] = MDSMath.euclideanDistance(
        getFullCoords(coords[b1]), 
        getFullCoords(coords[b2])
      );
    });
  });
  
  return matrix;
}

// Generate insights for a specific set of coordinates
function generateKeyInsightsFor(coords) {
  const brands = Object.keys(coords);
  const insights = {};
  
  // Most differentiated (using full N-D space)
  let maxDist = 0;
  let mostDifferentiated = '';
  brands.forEach(brand => {
    const avgDist = brands
      .filter(b => b !== brand)
      .reduce((sum, b) => sum + MDSMath.euclideanDistance(getFullCoords(coords[brand]), getFullCoords(coords[b])), 0) / (brands.length - 1);
    if (avgDist > maxDist) {
      maxDist = avgDist;
      mostDifferentiated = brand;
    }
  });
  insights.mostDifferentiated = { brand: mostDifferentiated, avgDistance: maxDist };
  
  // Closest competitors (using full N-D space)
  let minDist = Infinity;
  let closestPair = [];
  for (let i = 0; i < brands.length; i++) {
    for (let j = i + 1; j < brands.length; j++) {
      const dist = MDSMath.euclideanDistance(getFullCoords(coords[brands[i]]), getFullCoords(coords[brands[j]]));
      if (dist < minDist) {
        minDist = dist;
        closestPair = [brands[i], brands[j]];
      }
    }
  }
  insights.closestCompetitors = { pair: closestPair, distance: minDist };
  
  return insights;
}

// Reset all repositioning to original positions
function resetRepositioning() {
  const sim = AppState.simulation;
  
  // Copy original coords back to modified
  sim.modifiedCoords = JSON.parse(JSON.stringify(sim.originalCoords));
  sim.repositionedBrands = [];
  sim.hasChanges = false;
  sim.repositionedResults = {
    marketShares: {},
    distances: {},
    insights: {}
  };
  
  // Hide repositioning banner
  hideRepositioningBanner();
  
  // Re-render everything
  renderPositionMap();
  renderDistanceHeatmap();
  renderInsightCards();
  
  const focalBrand = document.getElementById('focal-brand-select')?.value;
  if (focalBrand) {
    renderFocalBrandAnalysis(focalBrand);
  }
  
  console.log('Repositioning reset to original positions');
}

// Show repositioning indicator banner
function showRepositioningBanner() {
  let banner = document.getElementById('repositioning-banner');
  
  if (!banner) {
    // Create the banner if it doesn't exist
    banner = document.createElement('div');
    banner.id = 'repositioning-banner';
    banner.className = 'repositioning-banner';
    
    // Insert at top of main content area
    const mainContent = document.querySelector('.main-content') || document.querySelector('.app-container');
    if (mainContent) {
      mainContent.insertBefore(banner, mainContent.firstChild);
    }
  }
  
  const sim = AppState.simulation;
  const brandsText = sim.repositionedBrands.length <= 3 
    ? sim.repositionedBrands.join(', ')
    : `${sim.repositionedBrands.slice(0, 2).join(', ')} +${sim.repositionedBrands.length - 2} more`;
  
  banner.innerHTML = `
    <div class="banner-content">
      <span class="banner-icon">🔄</span>
      <span class="banner-text">
        <strong>REPOSITIONED* Simulation Mode</strong> — 
        You've moved: <span class="moved-brands">${brandsText}</span>. 
        All outputs reflect hypothetical positions.
      </span>
      <button class="banner-reset-btn" onclick="resetRepositioning()">Reset All</button>
    </div>
  `;
  
  banner.classList.remove('hidden');
}

// Hide repositioning banner
function hideRepositioningBanner() {
  const banner = document.getElementById('repositioning-banner');
  if (banner) {
    banner.classList.add('hidden');
  }
}

// ==================== POSITIONING PLAYGROUND IMPACT DASHBOARD ====================
function updateImpactDashboard(movedBrand) {
  const sim = AppState.simulation;
  const hasPreferences = AppState.preferenceData?.customers?.length > 0;
  
  // === MARKET SHARE SHIFT ===
  updateMarketShareBars(movedBrand);
  
  // === CANNIBALIZATION FLOW ===
  updateCannibalizationFlow(movedBrand);
  
  // === ATTRIBUTE CHANGES ("What It Takes") ===
  updateAttributeDeltas(movedBrand);
}

// Update the Before/After market share comparison bars
function updateMarketShareBars(movedBrand) {
  const sim = AppState.simulation;
  const beforeContainer = document.getElementById('share-bars-before');
  const afterContainer = document.getElementById('share-bars-after');
  const deltaCallout = document.getElementById('share-delta-callout');
  
  if (!beforeContainer || !afterContainer) return;
  
  const hasPreferences = AppState.preferenceData?.customers?.length > 0;
  
  if (!hasPreferences) {
    beforeContainer.innerHTML = '<div class="no-data">Enable preference data</div>';
    afterContainer.innerHTML = '<div class="no-data">for market share</div>';
    if (deltaCallout) {
      deltaCallout.querySelector('.delta-value').textContent = '—';
    }
    return;
  }
  
  const originalShares = sim.originalResults.marketShares || {};
  const newShares = sim.repositionedResults.marketShares || {};
  const brands = Object.keys(originalShares);
  
  if (brands.length === 0) return;
  
  // Build before bars
  let beforeHTML = '';
  let afterHTML = '';
  
  brands.forEach(brand => {
    const origPct = ((originalShares[brand] || 0) * 100).toFixed(1);
    const newPct = ((newShares[brand] || 0) * 100).toFixed(1);
    const isMovedBrand = brand === movedBrand;
    const change = newPct - origPct;
    
    beforeHTML += `
      <div class="share-bar-item ${isMovedBrand ? 'highlighted' : ''}">
        <span class="bar-brand">${brand.substring(0, 8)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(origPct, 100)}%"></div></div>
        <span class="bar-value">${origPct}%</span>
      </div>
    `;
    
    const changeClass = change > 0.05 ? 'positive' : (change < -0.05 ? 'negative' : '');
    afterHTML += `
      <div class="share-bar-item ${isMovedBrand ? 'highlighted' : ''} ${changeClass}">
        <span class="bar-brand">${brand.substring(0, 8)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(newPct, 100)}%"></div></div>
        <span class="bar-value">${newPct}%</span>
      </div>
    `;
  });
  
  beforeContainer.innerHTML = beforeHTML;
  afterContainer.innerHTML = afterHTML;
  
  // Update delta callout for the moved brand
  if (deltaCallout && movedBrand) {
    const origShare = (originalShares[movedBrand] || 0) * 100;
    const newShare = (newShares[movedBrand] || 0) * 100;
    const delta = newShare - origShare;
    const sign = delta >= 0 ? '+' : '';
    
    const deltaValue = deltaCallout.querySelector('.delta-value');
    if (deltaValue) {
      deltaValue.textContent = `${sign}${delta.toFixed(1)}%`;
      deltaValue.className = `delta-value ${delta > 0.05 ? 'positive' : (delta < -0.05 ? 'negative' : '')}`;
    }
  }
}

// Update cannibalization flow visualization
function updateCannibalizationFlow(movedBrand) {
  const sim = AppState.simulation;
  const summaryEl = document.getElementById('cannib-summary');
  const sankeyEl = document.getElementById('cannib-sankey');
  
  if (!summaryEl) return;
  
  const hasPreferences = AppState.preferenceData?.customers?.length > 0;
  
  if (!hasPreferences) {
    summaryEl.textContent = 'Enable preference data to see competitive flow.';
    if (sankeyEl) sankeyEl.innerHTML = '';
    return;
  }
  
  const originalShares = sim.originalResults.marketShares || {};
  const newShares = sim.repositionedResults.marketShares || {};
  const brands = Object.keys(originalShares);
  
  if (brands.length === 0) return;
  
  // Find gainers and losers
  const changes = brands.map(brand => ({
    brand,
    change: ((newShares[brand] || 0) - (originalShares[brand] || 0)) * 100
  })).sort((a, b) => b.change - a.change);
  
  const gainers = changes.filter(c => c.change > 0.05);
  const losers = changes.filter(c => c.change < -0.05);
  
  // Summary text
  if (gainers.length === 0 && losers.length === 0) {
    summaryEl.innerHTML = '📊 Minimal share movement from this repositioning.';
  } else {
    const topGainer = gainers[0];
    const topLoser = losers[losers.length - 1];
    
    let summary = '';
    if (topGainer) {
      summary += `<span class="flow-gainer">📈 ${topGainer.brand}: +${topGainer.change.toFixed(1)}%</span>`;
    }
    if (topLoser) {
      summary += `<span class="flow-loser">📉 ${topLoser.brand}: ${topLoser.change.toFixed(1)}%</span>`;
    }
    summaryEl.innerHTML = summary;
  }
  
  // Simple flow visualization (mini bars)
  if (sankeyEl) {
    let flowHTML = '<div class="mini-flow">';
    changes.slice(0, 5).forEach(c => {
      const isPositive = c.change > 0;
      const width = Math.min(Math.abs(c.change) * 10, 100);
      flowHTML += `
        <div class="flow-row">
          <span class="flow-brand">${c.brand.substring(0, 6)}</span>
          <div class="flow-bar ${isPositive ? 'positive' : 'negative'}" style="width:${width}%"></div>
          <span class="flow-delta">${c.change >= 0 ? '+' : ''}${c.change.toFixed(1)}%</span>
        </div>
      `;
    });
    flowHTML += '</div>';
    sankeyEl.innerHTML = flowHTML;
  }
}

// Update attribute changes needed for this move
function updateAttributeDeltas(movedBrand) {
  const container = document.getElementById('attribute-delta-bars');
  if (!container || !movedBrand) return;
  
  const sim = AppState.simulation;
  
  // Get original and new coordinates
  const origCoords = sim.originalCoords[movedBrand];
  const newCoords = sim.modifiedCoords[movedBrand];
  
  if (!origCoords || !newCoords) return;
  
  // Get the attribute loadings to reverse-engineer what attribute changes are needed
  const loadings = AppState.results?.loadings;
  
  if (!loadings || loadings.length === 0) {
    // No loadings available - show coordinate change instead
    const dx = newCoords[0] - origCoords[0];
    const dy = newCoords[1] - origCoords[1];
    
    container.innerHTML = `
      <div class="coord-change">
        <div class="coord-row">
          <span>Dim I shift:</span>
          <span class="${dx >= 0 ? 'positive' : 'negative'}">${dx >= 0 ? '+' : ''}${dx.toFixed(2)}</span>
        </div>
        <div class="coord-row">
          <span>Dim II shift:</span>
          <span class="${dy >= 0 ? 'positive' : 'negative'}">${dy >= 0 ? '+' : ''}${dy.toFixed(2)}</span>
        </div>
      </div>
    `;
    return;
  }
  
  // Calculate implied attribute changes using loadings
  const dx = newCoords[0] - origCoords[0];
  const dy = newCoords[1] - origCoords[1];
  
  // Each attribute's contribution to the move
  const attrChanges = loadings.map((loading, i) => {
    const attrName = AppState.perceptualData?.attributes?.[i] || `Attr ${i + 1}`;
    // Project the coordinate change onto this attribute's loading vector
    const impliedChange = (dx * loading[0] + dy * loading[1]) / (Math.sqrt(loading[0]**2 + loading[1]**2) + 0.001);
    return { attr: attrName, change: impliedChange };
  });
  
  // Sort by absolute change
  attrChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  // Show top 5 most impacted attributes
  let html = '';
  attrChanges.slice(0, 5).forEach(ac => {
    const isPositive = ac.change >= 0;
    const barWidth = Math.min(Math.abs(ac.change) * 30, 100);
    html += `
      <div class="attr-delta-row">
        <span class="attr-name">${ac.attr.substring(0, 12)}</span>
        <div class="attr-bar-track">
          <div class="attr-bar-fill ${isPositive ? 'increase' : 'decrease'}" style="width:${barWidth}%"></div>
        </div>
        <span class="attr-delta-val ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '↑' : '↓'} ${Math.abs(ac.change).toFixed(2)}
        </span>
      </div>
    `;
  });
  
  container.innerHTML = html || '<div class="no-data">Move a brand to see required changes</div>';
}

// Handle brand click
function handleBrandClick(brand, coords) {
  showBrandCard(brand);
}

function showSimulationBar(brand) {
  const bar = document.getElementById('live-simulation-bar');
  if (!bar) return;
  
  bar.classList.remove('hidden');
  document.getElementById('sim-bar-brand-name').textContent = `Repositioning: ${brand}`;
  document.getElementById('sim-bar-share-change').textContent = '+0.0%';
  document.getElementById('sim-bar-cannibalization').textContent = '—';
  document.getElementById('sim-bar-distance').textContent = '0.00';
}

function updateSimulationBar(brand, startCoords) {
  const bar = document.getElementById('live-simulation-bar');
  if (!bar) return;
  
  const currentCoords = AppState.simulation.modifiedCoords[brand];
  
  // Calculate distance moved
  const distance = Math.sqrt(
    Math.pow(currentCoords[0] - startCoords[0], 2) +
    Math.pow(currentCoords[1] - startCoords[1], 2)
  );
  document.getElementById('sim-bar-distance').textContent = distance.toFixed(2);
  
  // Calculate share change if preferences available
  if (AppState.results.preferences) {
    const originalShares = calculateMarketShares(AppState.simulation.originalCoords);
    const newShares = calculateMarketShares(AppState.simulation.modifiedCoords);
    
    if (originalShares && newShares && originalShares[brand] !== undefined) {
      const delta = (newShares[brand] - originalShares[brand]) * 100;
      const sign = delta >= 0 ? '+' : '';
      document.getElementById('sim-bar-share-change').textContent = `${sign}${delta.toFixed(1)}%`;
      document.getElementById('sim-bar-share-change').style.color = delta >= 0 ? '#22c55e' : '#ef4444';
      
      // Find biggest loser (cannibalization)
      let biggestLoser = null;
      let biggestLoss = 0;
      Object.keys(newShares).forEach(b => {
        if (b !== brand) {
          const loss = originalShares[b] - newShares[b];
          if (loss > biggestLoss) {
            biggestLoss = loss;
            biggestLoser = b;
          }
        }
      });
      
      if (biggestLoser && biggestLoss > 0.001) {
        document.getElementById('sim-bar-cannibalization').textContent = 
          `${biggestLoser} -${(biggestLoss * 100).toFixed(1)}%`;
      }
    }
  }
}

function hideSimulationBar() {
  const bar = document.getElementById('live-simulation-bar');
  if (bar) bar.classList.add('hidden');
}

function resetDraggedPosition() {
  // Reset all modified coordinates to original
  AppState.simulation.modifiedCoords = JSON.parse(
    JSON.stringify(AppState.simulation.originalCoords)
  );
  AppState.simulation.hasChanges = false;
  
  // Re-render the map
  renderPositioningMap();
  hideSimulationBar();
}

function renderVarianceCharts() {
  if (!AppState.results) return;
  
  const variance = AppState.results.varianceExplained;
  const cumulative = AppState.results.cumulativeVariance;
  const dims = variance.map((_, i) => `Dim ${i + 1}`);
  
  // Scree plot
  const screeContainer = document.getElementById('scree-plot');
  if (screeContainer) {
    Plotly.newPlot(screeContainer, [{
      x: dims,
      y: variance.map(v => v * 100),
      type: 'bar',
      marker: { color: '#2a7de1' }
    }], {
      title: 'Variance Explained by Dimension',
      xaxis: { title: 'Dimension' },
      yaxis: { title: 'Variance (%)', range: [0, 100] },
      margin: { t: 40, r: 20, b: 40, l: 50 }
    }, { responsive: true, displayModeBar: false });
  }
  
  // Cumulative variance
  const cumContainer = document.getElementById('cumulative-variance');
  if (cumContainer) {
    Plotly.newPlot(cumContainer, [{
      x: dims,
      y: cumulative.map(v => v * 100),
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#2a7de1', width: 2 },
      marker: { size: 8 }
    }, {
      x: dims,
      y: dims.map(() => 80),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#ef4444', dash: 'dash', width: 1 },
      name: '80% threshold'
    }], {
      title: 'Cumulative Variance Explained',
      xaxis: { title: 'Dimension' },
      yaxis: { title: 'Cumulative Variance (%)', range: [0, 105] },
      margin: { t: 40, r: 20, b: 40, l: 50 },
      showlegend: false
    }, { responsive: true, displayModeBar: false });
  }
}

function renderDimensionTable() {
  const tbody = document.getElementById('dimension-table-body');
  if (!tbody || !AppState.results) return;
  
  const interps = AppState.results.dimensionInterpretations;
  const variance = AppState.results.varianceExplained;
  
  let html = '';
  interps.forEach((dim, i) => {
    html += `<tr>
      <td><strong>Dimension ${dim.dimension}</strong></td>
      <td>${(variance[i] * 100).toFixed(1)}%</td>
      <td>${dim.positiveEnd.join(', ') || '—'}</td>
      <td>${dim.negativeEnd.join(', ') || '—'}</td>
      <td><em>${dim.interpretation}</em></td>
    </tr>`;
  });
  
  tbody.innerHTML = html;
}

function renderBrandCoordsTable() {
  const tbody = document.getElementById('brand-coords-body');
  if (!tbody || !AppState.results) return;
  
  const coords = AppState.results.brandCoords;
  const brands = Object.keys(coords);
  
  let html = '';
  brands.forEach(brand => {
    const c = coords[brand];
    html += `<tr>
      <td><strong>${brand}</strong></td>
      <td>${c[0].toFixed(3)}</td>
      <td>${c[1].toFixed(3)}</td>
      <td>${c[2] !== undefined ? c[2].toFixed(3) : '—'}</td>
    </tr>`;
  });
  
  tbody.innerHTML = html;
}

function renderAttrLoadingsTable() {
  const tbody = document.getElementById('attr-loadings-body');
  if (!tbody || !AppState.results) return;
  
  const loadings = AppState.results.attrLoadings;
  const attrs = AppState.perceptualData.attributes;
  
  let html = '';
  attrs.forEach((attr, i) => {
    const l = loadings[i];
    html += `<tr>
      <td>${attr}</td>
      <td class="${getValueClass(l[0])}">${l[0].toFixed(3)}</td>
      <td class="${getValueClass(l[1])}">${l[1].toFixed(3)}</td>
      <td class="${l[2] !== undefined ? getValueClass(l[2]) : ''}">${l[2] !== undefined ? l[2].toFixed(3) : '—'}</td>
    </tr>`;
  });
  
  tbody.innerHTML = html;
}

function getValueClass(value) {
  if (value > 0.3) return 'value-positive';
  if (value < -0.3) return 'value-negative';
  return 'value-neutral';
}

function renderPreferenceCharts() {
  if (!AppState.results.preferences) return;
  
  const brandAvgs = AppState.results.preferences.brandAverages;
  const sorted = Object.entries(brandAvgs).sort((a, b) => b[1] - a[1]);
  
  // Preference ranking chart
  const rankContainer = document.getElementById('preference-ranking-chart');
  if (rankContainer) {
    Plotly.newPlot(rankContainer, [{
      y: sorted.map(s => s[0]),
      x: sorted.map(s => s[1]),
      type: 'bar',
      orientation: 'h',
      marker: { color: '#2a7de1' }
    }], {
      title: 'Average Brand Preference',
      xaxis: { title: 'Preference Rating' },
      margin: { t: 40, r: 20, b: 40, l: 80 }
    }, { responsive: true, displayModeBar: false });
  }
}

function renderSegmentPersonas() {
  const container = document.getElementById('segment-personas');
  if (!container || !AppState.results.preferences) return;
  
  const segments = AppState.results.preferences.segmentIdealPoints;
  const brands = Object.keys(AppState.results.brandCoords);
  const totalCustomers = AppState.preferenceData?.customers?.length || 1;
  const usingPredefined = AppState.results.preferences.usingPredefinedSegments;
  
  // Generate persona cards
  let html = '';
  segments.forEach((seg, idx) => {
    // Find brands closest to this segment's ideal
    const distances = brands.map(b => {
      const bCoords = AppState.results.brandCoords[b];
      const dist = Math.sqrt(
        Math.pow(bCoords[0] - seg.coords[0], 2) +
        Math.pow(bCoords[1] - seg.coords[1], 2)
      );
      return { brand: b, distance: dist };
    }).sort((a, b) => a.distance - b.distance);
    
    const topBrand = distances[0].brand;
    const runnerUp = distances[1]?.brand || '—';
    const sizePercent = ((seg.size / totalCustomers) * 100).toFixed(0);
    
    // Persona emoji based on segment position
    const personas = ['🎯', '🏆', '💎', '🌟', '🔥', '⭐', '🚀', '💫'];
    const emoji = personas[idx % personas.length];
    
    // Use label if available (pre-defined segments), otherwise generic name
    const segmentName = seg.label || `Segment ${seg.segment}`;
    const segmentBadge = usingPredefined ? '<span class="predefined-badge">Pre-defined</span>' : '';
    
    // Determine segment personality based on ideal point location
    const dimInterps = AppState.results.dimensionInterpretations || [];
    let personality = [];
    if (seg.coords[0] > 0.3 && dimInterps[0]) {
      personality.push(dimInterps[0].positiveEnd?.[0] || 'high Dim I');
    } else if (seg.coords[0] < -0.3 && dimInterps[0]) {
      personality.push(dimInterps[0].negativeEnd?.[0] || 'low Dim I');
    }
    if (seg.coords[1] > 0.3 && dimInterps[1]) {
      personality.push(dimInterps[1].positiveEnd?.[0] || 'high Dim II');
    } else if (seg.coords[1] < -0.3 && dimInterps[1]) {
      personality.push(dimInterps[1].negativeEnd?.[0] || 'low Dim II');
    }
    const personalityText = personality.length > 0 ? personality.join(' + ') : 'Balanced preferences';
    
    html += `
      <div class="persona-card card">
        <div class="persona-header">
          <span class="persona-emoji">${emoji}</span>
          <span class="persona-name">${segmentName}</span>
          ${segmentBadge}
          <span class="persona-size">${sizePercent}%</span>
        </div>
        <div class="persona-body">
          <div class="persona-trait">
            <span class="trait-label">Values:</span>
            <span class="trait-value">${personalityText}</span>
          </div>
          <div class="persona-trait">
            <span class="trait-label">Top Choice:</span>
            <span class="trait-value winner">${topBrand}</span>
          </div>
          <div class="persona-trait">
            <span class="trait-label">Runner-up:</span>
            <span class="trait-value">${runnerUp}</span>
          </div>
          <div class="persona-coords">
            Ideal: (${seg.coords[0].toFixed(2)}, ${seg.coords[1].toFixed(2)})
          </div>
        </div>
        <div class="persona-size-bar">
          <div class="size-fill" style="width: ${sizePercent}%"></div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function renderSegmentBrandFitChart() {
  const container = document.getElementById('segment-brand-fit-chart');
  if (!container || !AppState.results.preferences) return;
  
  const segments = AppState.results.preferences.segmentIdealPoints;
  const brands = Object.keys(AppState.results.brandCoords);
  
  // Build data: for each segment, calculate fit score for each brand
  // Fit = 1 / (1 + distance) — higher = better fit
  const traces = [];
  const colors = ['#2a7de1', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#3498db'];
  
  brands.forEach((brand, bIdx) => {
    const bCoords = AppState.results.brandCoords[brand];
    const fitScores = segments.map(seg => {
      const dist = Math.sqrt(
        Math.pow(bCoords[0] - seg.coords[0], 2) +
        Math.pow(bCoords[1] - seg.coords[1], 2)
      );
      return 1 / (1 + dist);
    });
    
    traces.push({
      name: brand,
      y: segments.map(s => `Segment ${s.segment}`),
      x: fitScores,
      type: 'bar',
      orientation: 'h',
      marker: { color: colors[bIdx % colors.length] }
    });
  });
  
  Plotly.newPlot(container, traces, {
    barmode: 'group',
    title: '',
    xaxis: { 
      title: 'Preference Fit Score',
      range: [0, 1]
    },
    yaxis: { 
      title: '',
      automargin: true
    },
    legend: {
      orientation: 'h',
      y: -0.2
    },
    margin: { t: 20, r: 20, b: 80, l: 80 }
  }, { responsive: true, displayModeBar: false });
}

function generateReports() {
  generateAPAReport();
  generateManagerialReport();
}

function generateAPAReport() {
  if (!AppState.results) return;
  
  const numBrands = AppState.perceptualData.brands.length;
  const numAttrs = AppState.perceptualData.attributes.length;
  const numDims = AppState.results.numDimensions;
  const cumVar = (AppState.results.cumulativeVariance[numDims - 1] * 100).toFixed(1);
  
  let report = `A principal components analysis was conducted on perceptual ratings of ${numBrands} brands across ${numAttrs} attributes. `;
  report += `The first ${numDims} dimensions were retained, explaining ${cumVar}% of the total variance. `;
  
  const interps = AppState.results.dimensionInterpretations;
  interps.forEach(dim => {
    report += `Dimension ${dim.dimension} (${(AppState.results.varianceExplained[dim.dimension - 1] * 100).toFixed(1)}% variance) `;
    report += `contrasted ${dim.positiveEnd.slice(0, 2).join(' and ') || 'various attributes'} `;
    report += `with ${dim.negativeEnd.slice(0, 2).join(' and ') || 'other attributes'}. `;
  });
  
  if (AppState.results.preferences) {
    const numCust = AppState.preferenceData.customers.length;
    const numSegs = AppState.results.preferences.numSegments;
    report += `Preference data from ${numCust} customers was analyzed, revealing ${numSegs} distinct market segments. `;
  }
  
  document.getElementById('apa-report').textContent = report;
  document.getElementById('copy-apa').disabled = false;
}

function generateManagerialReport() {
  if (!AppState.results) return;
  
  const brands = AppState.perceptualData.brands;
  const coords = AppState.results.brandCoords;
  const interps = AppState.results.dimensionInterpretations;
  
  let report = `📊 **Competitive Landscape Summary**\n\n`;
  report += `The perceptual map reveals how ${brands.length} brands are positioned in customers' minds. `;
  report += `The main competitive dimension is "${interps[0].interpretation}", `;
  report += `while the secondary dimension captures "${interps[1]?.interpretation || 'other attributes'}". `;
  
  // Find brands at extremes (use slice to avoid mutating original array)
  const dim1Sorted = [...brands].sort((a, b) => coords[b][0] - coords[a][0]);
  report += `\n\n**Key Positions:**\n`;
  report += `• ${dim1Sorted[0]} leads on ${interps[0].positiveEnd[0] || 'Dimension I positive end'}\n`;
  report += `• ${dim1Sorted[dim1Sorted.length - 1]} leads on ${interps[0].negativeEnd[0] || 'Dimension I negative end'}\n`;
  
  if (AppState.results.preferences) {
    report += `\n**Segment Opportunities:**\n`;
    AppState.results.preferences.segmentIdealPoints.forEach(seg => {
      report += `• Segment ${seg.segment} (${seg.size} customers) — `;
      // Find closest brand
      const distances = brands.map(b => ({
        brand: b,
        dist: Math.sqrt(Math.pow(coords[b][0] - seg.coords[0], 2) + Math.pow(coords[b][1] - seg.coords[1], 2))
      })).sort((a, b) => a.dist - b.dist);
      report += `best served by ${distances[0].brand}\n`;
    });
  }
  
  document.getElementById('managerial-report').textContent = report;
  document.getElementById('copy-managerial').disabled = false;
}

// ==================== VIEW TOGGLE ====================
function setupViewToggle() {
  const buttons = document.querySelectorAll('.view-button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      AppState.currentView = btn.dataset.view;
      if (AppState.results) {
        renderPositioningMap();
      }
    });
  });
}

function setupLayerToggles() {
  const toggleIds = [
    'show-brands', 
    'show-attributes', 
    'show-preferences', 
    'show-segments',
    'show-customers',
    'show-competitive-zones',
    'show-whitespace'
  ];
  toggleIds.forEach(id => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', () => {
        if (AppState.results) {
          renderPositioningMap();
        }
      });
    }
  });
}

// ==================== SIMULATION ====================
function setupSimulationControls() {
  // Mode toggle - using .mode-pill buttons in the playground header
  const modeButtons = document.querySelectorAll('.mode-pill');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      const mode = btn.dataset.mode;
      AppState.simulation.mode = mode;
      
      // Show/hide appropriate control panels based on mode
      const repositionControls = document.getElementById('reposition-controls');
      const newProductControls = document.getElementById('new-product-controls');
      const findGapControls = document.getElementById('find-gap-controls');
      
      if (repositionControls) repositionControls.classList.toggle('hidden', mode !== 'reposition');
      if (newProductControls) newProductControls.classList.toggle('hidden', mode !== 'new-product');
      if (findGapControls) findGapControls.classList.toggle('hidden', mode !== 'find-gap');
      
      // Update map interaction mode
      if (typeof PositioningMap !== 'undefined' && PositioningMap.setMode) {
        PositioningMap.setMode(mode);
      }
    });
  });
  
  // Populate brand selector for repositioning
  const brandSelect = document.getElementById('sim-brand-select');
  if (brandSelect) {
    brandSelect.addEventListener('change', onSimBrandChange);
  }
  
  // Slider/input sync for repositioning
  setupCoordSync('sim-dim1-slider', 'sim-dim1', updateRepositionedBrand);
  setupCoordSync('sim-dim2-slider', 'sim-dim2', updateRepositionedBrand);
  
  // Slider/input sync for new product
  setupCoordSync('new-dim1-slider', 'new-dim1', updateNewProductPreview);
  setupCoordSync('new-dim2-slider', 'new-dim2', updateNewProductPreview);
  
  // Reset button
  const resetBtn = document.getElementById('reset-position');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetBrandPosition);
  }
  
  // Add new product button
  const addBtn = document.getElementById('add-new-product');
  if (addBtn) {
    addBtn.addEventListener('click', addNewProduct);
  }
  
  // Remove new product button
  const removeBtn = document.getElementById('remove-new-product');
  if (removeBtn) {
    removeBtn.addEventListener('click', removeNewProduct);
  }
}

function setupCoordSync(sliderId, inputId, callback) {
  const slider = document.getElementById(sliderId);
  const input = document.getElementById(inputId);
  
  if (slider && input) {
    slider.addEventListener('input', () => {
      input.value = slider.value;
      callback();
    });
    
    input.addEventListener('input', () => {
      slider.value = input.value;
      callback();
    });
  }
}

function onSimBrandChange() {
  const brand = document.getElementById('sim-brand-select').value;
  if (!brand || !AppState.results) return;
  
  const coords = AppState.simulation.originalCoords[brand];
  if (coords) {
    document.getElementById('sim-dim1').value = coords[0].toFixed(2);
    document.getElementById('sim-dim1-slider').value = coords[0];
    document.getElementById('sim-dim2').value = coords[1].toFixed(2);
    document.getElementById('sim-dim2-slider').value = coords[1];
  }
}

function updateRepositionedBrand() {
  const brand = document.getElementById('sim-brand-select').value;
  if (!brand || !AppState.results) return;
  
  const newX = parseFloat(document.getElementById('sim-dim1').value) || 0;
  const newY = parseFloat(document.getElementById('sim-dim2').value) || 0;
  
  AppState.simulation.modifiedCoords[brand] = [newX, newY, AppState.simulation.originalCoords[brand][2] || 0];
  
  renderPositioningMap();
  updateSimulationResults();
}

function resetBrandPosition() {
  const brand = document.getElementById('sim-brand-select').value;
  if (!brand) return;
  
  AppState.simulation.modifiedCoords[brand] = [...AppState.simulation.originalCoords[brand]];
  onSimBrandChange();
  renderPositioningMap();
  updateSimulationResults();
}

function updateNewProductPreview() {
  // Just update the preview - don't add yet
}

function addNewProduct() {
  const name = document.getElementById('new-product-name').value || 'New Product';
  const x = parseFloat(document.getElementById('new-dim1').value) || 0;
  const y = parseFloat(document.getElementById('new-dim2').value) || 0;
  
  AppState.simulation.newProduct = {
    name: name,
    coords: [x, y, 0]
  };
  
  AppState.simulation.modifiedCoords[name] = [x, y, 0];
  
  document.getElementById('remove-new-product').disabled = false;
  
  renderPositioningMap();
  updateSimulationResults();
}

function removeNewProduct() {
  if (AppState.simulation.newProduct) {
    delete AppState.simulation.modifiedCoords[AppState.simulation.newProduct.name];
    AppState.simulation.newProduct = null;
    
    document.getElementById('remove-new-product').disabled = true;
    
    renderPositioningMap();
    updateSimulationResults();
  }
}

function updateSimulationResults() {
  if (!AppState.results || !AppState.results.preferences) {
    const insight = document.getElementById('share-insight');
    if (insight) {
      insight.textContent = 'Market share simulation requires preference data. Enable "Include preference data" and upload customer preferences.';
    }
    return;
  }
  
  // Calculate market shares with modified coordinates
  const originalShares = calculateMarketShares(AppState.simulation.originalCoords);
  const newShares = calculateMarketShares(AppState.simulation.modifiedCoords);
  
  // Render comparison
  renderShareComparison(originalShares, newShares);
  
  // Generate strategic insights
  generateSimulationInsights(originalShares, newShares);
}

function calculateMarketShares(brandCoords) {
  const preferences = AppState.results.preferences;
  const segments = preferences.segmentIdealPoints;
  const rule = AppState.settings.shareRule;
  const numDims = AppState.results?.numDimensions || 2;
  
  const brands = Object.keys(brandCoords);
  const shares = {};
  brands.forEach(b => shares[b] = 0);
  
  // Calculate share based on selected decision rule (using full N-D space)
  if (rule === 'preference') {
    // Share of preference: weight by segment preferences and distances
    segments.forEach(seg => {
      const segmentWeight = seg.size / AppState.preferenceData.customers.length;
      // Note: distanceBasedShare uses full coords passed to it
      const segShares = MDSMath.distanceBasedShare(brandCoords, seg.coords.slice(0, numDims));
      
      brands.forEach(b => {
        shares[b] += segmentWeight * (segShares[b] || 0);
      });
    });
  } else if (rule === 'first-choice') {
    // First choice: assign 100% to closest brand per segment (full N-D distance)
    segments.forEach(seg => {
      const segmentWeight = seg.size / AppState.preferenceData.customers.length;
      let minDist = Infinity;
      let winner = brands[0];
      
      brands.forEach(b => {
        const bCoords = brandCoords[b];
        const dist = MDSMath.euclideanDistance(bCoords.slice(0, numDims), seg.coords.slice(0, numDims));
        if (dist < minDist) {
          minDist = dist;
          winner = b;
        }
      });
      
      shares[winner] += segmentWeight;
    });
  } else if (rule === 'logit') {
    // Logit model: convert distances to utilities (full N-D space)
    segments.forEach(seg => {
      const segmentWeight = seg.size / AppState.preferenceData.customers.length;
      const distances = {};
      
      brands.forEach(b => {
        const bCoords = brandCoords[b];
        distances[b] = MDSMath.euclideanDistance(bCoords.slice(0, numDims), seg.coords.slice(0, numDims));
      });
      
      // Convert to utilities (negative distance)
      const utilities = brands.map(b => -distances[b]);
      const segShares = MDSMath.logitShare(utilities, brands, 2.0);
      
      brands.forEach(b => {
        shares[b] += segmentWeight * segShares[b];
      });
    });
  }
  
  return shares;
}

function renderShareComparison(originalShares, newShares) {
  const container = document.getElementById('share-impact-chart');
  if (!container) return;
  
  const brands = Object.keys(originalShares);
  const origValues = brands.map(b => originalShares[b] * 100);
  const newValues = brands.map(b => newShares[b] * 100);
  
  Plotly.newPlot(container, [
    {
      x: brands,
      y: origValues,
      type: 'bar',
      name: 'Original',
      marker: { color: '#94a3b8' }
    },
    {
      x: brands,
      y: newValues,
      type: 'bar',
      name: 'After Simulation',
      marker: { color: '#2a7de1' }
    }
  ], {
    barmode: 'group',
    title: 'Market Share Impact',
    xaxis: { title: '', tickangle: -45 },
    yaxis: { title: 'Share (%)', range: [0, Math.max(...origValues, ...newValues) * 1.2] },
    legend: { orientation: 'h', y: 1.1 },
    margin: { t: 60, r: 20, b: 80, l: 50 }
  }, { responsive: true, displayModeBar: false });
  
  // Update share table
  const tbody = document.getElementById('share-table-body');
  if (tbody) {
    let html = '';
    brands.forEach(b => {
      const orig = (originalShares[b] * 100).toFixed(1);
      const curr = (newShares[b] * 100).toFixed(1);
      const change = ((newShares[b] - originalShares[b]) * 100).toFixed(1);
      const changeClass = parseFloat(change) > 0 ? 'value-positive' : (parseFloat(change) < 0 ? 'value-negative' : '');
      
      html += `<tr>
        <td><strong>${b}</strong></td>
        <td>${orig}%</td>
        <td>${curr}%</td>
        <td class="${changeClass}">${parseFloat(change) > 0 ? '+' : ''}${change}%</td>
      </tr>`;
    });
    tbody.innerHTML = html;
  }
}

function generateSimulationInsights(originalShares, newShares) {
  const insight = document.getElementById('share-insight');
  if (!insight) return;
  
  const brands = Object.keys(originalShares);
  
  // Find biggest winner and loser
  let maxGain = { brand: '', change: -Infinity };
  let maxLoss = { brand: '', change: Infinity };
  
  brands.forEach(b => {
    const change = newShares[b] - originalShares[b];
    if (change > maxGain.change) {
      maxGain = { brand: b, change };
    }
    if (change < maxLoss.change) {
      maxLoss = { brand: b, change };
    }
  });
  
  let insightText = '';
  
  if (AppState.simulation.newProduct) {
    insightText = `📊 **New Product Impact**: "${AppState.simulation.newProduct.name}" would capture ${(newShares[AppState.simulation.newProduct.name] * 100).toFixed(1)}% market share. `;
    
    if (maxLoss.change < -0.01) {
      insightText += `${maxLoss.brand} loses the most (${(maxLoss.change * 100).toFixed(1)}%), suggesting cannibalization or direct competition.`;
    }
  } else if (maxGain.change > 0.005) {
    insightText = `📊 **Repositioning Impact**: ${maxGain.brand} gains ${(maxGain.change * 100).toFixed(1)}% share. `;
    
    if (maxLoss.change < -0.005) {
      insightText += `${maxLoss.brand} loses ${(-maxLoss.change * 100).toFixed(1)}% — likely competing for similar segment preferences.`;
    }
  } else {
    insightText = '📊 The simulated changes have minimal market share impact. Consider more significant repositioning or targeting different segments.';
  }
  
  insight.textContent = insightText;
}

// ==================== EXPORTS ====================
function setupExportButtons() {
  const copyApa = document.getElementById('copy-apa');
  const copyManagerial = document.getElementById('copy-managerial');
  const exportPng = document.getElementById('export-map-png');
  const exportData = document.getElementById('export-all-data');
  
  if (copyApa) {
    copyApa.addEventListener('click', () => {
      const text = document.getElementById('apa-report').textContent;
      navigator.clipboard.writeText(text);
      copyApa.textContent = '✓ Copied!';
      setTimeout(() => copyApa.textContent = '📋 Copy Report', 2000);
    });
  }
  
  if (copyManagerial) {
    copyManagerial.addEventListener('click', () => {
      const text = document.getElementById('managerial-report').textContent;
      navigator.clipboard.writeText(text);
      copyManagerial.textContent = '✓ Copied!';
      setTimeout(() => copyManagerial.textContent = '📋 Copy Report', 2000);
    });
  }
  
  if (exportPng) {
    exportPng.addEventListener('click', () => {
      Plotly.downloadImage('positioning-map', {
        format: 'png',
        filename: 'perceptual_map',
        width: 1200,
        height: 800
      });
    });
  }
  
  if (exportData) {
    exportData.addEventListener('click', exportAllData);
  }
}

function enableExportButtons() {
  document.getElementById('export-map-png').disabled = false;
  document.getElementById('export-all-data').disabled = false;
  document.getElementById('download-coordinates').disabled = false;
}

function exportAllData() {
  if (!AppState.results) return;
  
  // Brand coordinates CSV
  let csv = 'Brand,Dimension_I,Dimension_II,Dimension_III\n';
  Object.entries(AppState.results.brandCoords).forEach(([brand, coords]) => {
    csv += `${brand},${coords[0]},${coords[1]},${coords[2] || 0}\n`;
  });
  
  downloadTextFile('brand_coordinates.csv', csv, { mimeType: 'text/csv' });
}

function setupTemplateDownloads() {
  const perceptualBtn = document.getElementById('download-perceptual-template');
  const preferenceBtn = document.getElementById('download-preference-template');
  
  if (perceptualBtn) {
    perceptualBtn.addEventListener('click', () => {
      const csv = `Attribute,Brand_A,Brand_B,Brand_C,Brand_D
Expensive,3.5,4.2,2.8,3.9
Premium,4.1,3.8,2.5,4.5
Easy to use,3.2,4.5,4.8,3.1
Innovative,4.8,3.2,2.9,4.2
Reliable,3.9,4.1,4.5,3.8`;
      downloadTextFile('perceptual_template.csv', csv, { mimeType: 'text/csv' });
    });
  }
  
  if (preferenceBtn) {
    preferenceBtn.addEventListener('click', () => {
      const csv = `Customer,Brand_A,Brand_B,Brand_C,Brand_D
1,7,5,8,6
2,6,8,7,4
3,8,4,6,7
4,5,7,9,5
5,7,6,7,8`;
      downloadTextFile('preference_template.csv', csv, { mimeType: 'text/csv' });
    });
  }
}

// ==================== DIAGNOSTICS ====================
function generateDiagnostics() {
  const container = document.getElementById('diagnostics-flags');
  if (!container || !AppState.results) return;
  
  const flags = [];
  
  // Check variance explained
  const cumVar2D = AppState.results.cumulativeVariance[1];
  if (cumVar2D < 0.5) {
    flags.push({
      type: 'warning',
      message: `⚠️ First 2 dimensions explain only ${(cumVar2D * 100).toFixed(0)}% of variance. Consider whether a 2D map adequately represents the competitive landscape.`
    });
  } else if (cumVar2D >= 0.8) {
    flags.push({
      type: 'success',
      message: `✓ Good fit: First 2 dimensions explain ${(cumVar2D * 100).toFixed(0)}% of variance.`
    });
  }
  
  // Check number of brands
  const numBrands = AppState.perceptualData.brands.length;
  if (numBrands < 4) {
    flags.push({
      type: 'warning',
      message: `⚠️ Only ${numBrands} brands. Perceptual maps are most useful with 5+ brands for meaningful competitive comparisons.`
    });
  }
  
  // Check number of attributes vs brands
  const numAttrs = AppState.perceptualData.attributes.length;
  if (numAttrs < numBrands) {
    flags.push({
      type: 'info',
      message: `ℹ️ You have ${numAttrs} attributes and ${numBrands} brands. More attributes than brands typically yields more stable solutions.`
    });
  }
  
  // Check for brand clustering (brands too close) - using full N-D space
  const coords = AppState.results.brandCoords;
  const brands = Object.keys(coords);
  const numDimsFlags = AppState.results?.numDimensions || 2;
  let closePairs = 0;
  for (let i = 0; i < brands.length; i++) {
    for (let j = i + 1; j < brands.length; j++) {
      const dist = MDSMath.euclideanDistance(coords[brands[i]].slice(0, numDimsFlags), coords[brands[j]].slice(0, numDimsFlags));
      if (dist < 0.2) closePairs++;
    }
  }
  if (closePairs > 2) {
    flags.push({
      type: 'info',
      message: `ℹ️ ${closePairs} brand pairs are very close on the map. These brands may be perceived as nearly interchangeable.`
    });
  }
  
  // Check preference data quality if present
  if (AppState.results.preferences) {
    const numCustomers = AppState.preferenceData.customers.length;
    const numSegments = AppState.results.preferences.numSegments;
    const avgPerSegment = numCustomers / numSegments;
    
    if (avgPerSegment < 30) {
      flags.push({
        type: 'warning',
        message: `⚠️ Small segments: averaging ${avgPerSegment.toFixed(0)} customers per segment. Ideal point estimates may be unstable.`
      });
    }
    
    // Check for segment size imbalance
    const sizes = AppState.results.preferences.segmentIdealPoints.map(s => s.size);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    if (maxSize > minSize * 3) {
      flags.push({
        type: 'info',
        message: `ℹ️ Segment sizes vary widely (${minSize} to ${maxSize}). Consider whether the smaller segments are actionable.`
      });
    }
  }
  
  // Render flags
  if (flags.length === 0) {
    container.innerHTML = '<p class="success">✓ No diagnostic issues detected.</p>';
  } else {
    let html = '<h4>Data-Specific Notes</h4><ul class="diagnostics-list">';
    flags.forEach(f => {
      const className = f.type === 'warning' ? 'diagnostic-warning' : (f.type === 'success' ? 'diagnostic-success' : 'diagnostic-info');
      html += `<li class="${className}">${f.message}</li>`;
    });
    html += '</ul>';
    container.innerHTML = html;
  }
}

// ==================== UTILITIES ====================
function deepCopyCoords(coords) {
  const copy = {};
  for (const brand in coords) {
    copy[brand] = [...coords[brand]];
  }
  return copy;
}

function downloadTextFile(filename, content, options = {}) {
  const mimeType = options.mimeType || 'text/plain';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generatePerceptualCsv(perceptual) {
  let csv = 'Attribute,' + perceptual.brands.join(',') + '\n';
  perceptual.attributes.forEach((attr, i) => {
    csv += attr + ',' + perceptual.matrix[i].join(',') + '\n';
  });
  return csv;
}

function generatePreferenceCsv(preferences) {
  let csv = 'Customer,' + preferences.brands.join(',') + '\n';
  preferences.customers.forEach((cust, i) => {
    csv += (i + 1) + ',' + cust.join(',') + '\n';
  });
  return csv;
}

// ============================================================
// 2026 UX ENHANCEMENT FUNCTIONS
// Insight cards, dimension explorer, competitive intel, interactivity
// ============================================================

// ==================== LAYER TOGGLE EXPLAINERS ====================
// Dynamically populate the tooltip explainers with context from current analysis

function updateLayerExplainers() {
  if (!AppState.results) return;
  
  const coords = AppState.results.brandCoords;
  const brands = Object.keys(coords);
  const attrs = AppState.perceptualData?.attributes || [];
  const loadings = AppState.results.attrLoadings;
  const numDimsExp = AppState.results?.numDimensions || 2;
  
  // === BRANDS EXPLAINER ===
  const brandsEl = document.querySelector('#explainer-brands-dynamic .dynamic-content');
  if (brandsEl && brands.length > 0) {
    // Find closest pair and most isolated brand (using full N-D space)
    let minDist = Infinity, closestPair = ['', ''];
    let maxAvgDist = 0, mostIsolated = '';
    
    for (let i = 0; i < brands.length; i++) {
      let sumDist = 0;
      for (let j = 0; j < brands.length; j++) {
        if (i !== j) {
          const dist = MDSMath.euclideanDistance(
            coords[brands[i]].slice(0, numDimsExp), 
            coords[brands[j]].slice(0, numDimsExp)
          );
          sumDist += dist;
          if (dist < minDist) {
            minDist = dist;
            closestPair = [brands[i], brands[j]];
          }
        }
      }
      const avgDist = sumDist / (brands.length - 1);
      if (avgDist > maxAvgDist) {
        maxAvgDist = avgDist;
        mostIsolated = brands[i];
      }
    }
    
    brandsEl.innerHTML = `
      <strong>${brands.length} brands</strong> mapped. 
      <span class="highlight">${closestPair[0]}</span> and <span class="highlight">${closestPair[1]}</span> 
      are most similar (distance: ${minDist.toFixed(2)}). 
      <span class="highlight">${mostIsolated}</span> is the most differentiated.
    `;
  }
  
  // === ATTRIBUTES EXPLAINER ===
  const attrsEl = document.querySelector('#explainer-attributes-dynamic .dynamic-content');
  if (attrsEl && attrs.length > 0 && loadings) {
    // Find strongest attributes (by loading magnitude on first two dims)
    const attrStrengths = attrs.map((attr, i) => ({
      name: attr,
      strength: Math.sqrt(loadings[i][0]**2 + loadings[i][1]**2)
    })).sort((a, b) => b.strength - a.strength);
    
    const top3 = attrStrengths.slice(0, 3).map(a => a.name);
    
    attrsEl.innerHTML = `
      <strong>${attrs.length} attributes</strong> analyzed. 
      The most discriminating attributes are: 
      <span class="highlight">${top3.join('</span>, <span class="highlight">')}</span>.
      These explain the largest differences between brands.
    `;
  }
  
  // === COMPETITIVE ZONES EXPLAINER ===
  const zonesEl = document.querySelector('#explainer-zones-dynamic .dynamic-content');
  if (zonesEl && brands.length > 0) {
    // Calculate approximate territory sizes (using full N-D distance to nearest competitor)
    const territories = brands.map(brand => {
      let minDist = Infinity;
      brands.forEach(other => {
        if (other !== brand) {
          const dist = MDSMath.euclideanDistance(
            coords[brand].slice(0, numDimsExp),
            coords[other].slice(0, numDimsExp)
          );
          if (dist < minDist) minDist = dist;
        }
      });
      return { brand, space: minDist };
    }).sort((a, b) => b.space - a.space);
    
    const largest = territories[0];
    const smallest = territories[territories.length - 1];
    
    zonesEl.innerHTML = `
      <span class="highlight">${largest.brand}</span> has the largest competitive zone 
      (${largest.space.toFixed(2)} units to nearest rival), indicating a differentiated position. 
      <span class="highlight">${smallest.brand}</span> faces the most crowded space.
    `;
  }
  
  // === ENTRY OPPORTUNITIES EXPLAINER ===
  const whiteEl = document.querySelector('#explainer-whitespace-dynamic .dynamic-content');
  if (whiteEl) {
    // ALWAYS use the map's cached entry opportunities for consistency
    // The map calculates these in full N-D space, then projects to current 2D view
    const mapOpportunities = typeof PositioningMap !== 'undefined' && PositioningMap.getEntryOpportunities
      ? PositioningMap.getEntryOpportunities()
      : [];
    
    const numDims = AppState.results?.numDimensions || 2;
    
    if (mapOpportunities.length > 0) {
      // Use the same opportunities calculated by the map (in full N-D space)
      const best = mapOpportunities[0];
      const sharePercent = (best.share * 100).toFixed(1);
      
      // Format full N-D position
      const posStr = numDims === 3 
        ? `(${best.coords[0].toFixed(2)}, ${best.coords[1].toFixed(2)}, ${best.coords[2].toFixed(2)})`
        : `(${best.coords[0].toFixed(2)}, ${best.coords[1].toFixed(2)})`;
      
      // Find which segments are most attracted to this position
      const topSegments = best.segmentShares
        .sort((a, b) => b.share - a.share)
        .slice(0, 2)
        .map(s => `Seg ${s.segment}`);
      
      whiteEl.innerHTML = `
        <strong>Best entry position</strong> at ${posStr} could capture <span class="highlight">${sharePercent}%</span> market share
        ${numDims === 3 ? '(calculated in full 3D space)' : ''}.
        ${topSegments.length > 0 ? `Primarily attracts ${topSegments.join(' & ')}.` : ''}
        Nearest competitor: <span class="highlight">${best.nearestBrand}</span> (${best.nearestDist.toFixed(2)} away).
      `;
    } else if (!AppState.results.preferences?.segmentIdealPoints) {
      whiteEl.innerHTML = `
        <em>Enable "Include Preference Data"</em> to see demand-based entry opportunities. 
        Without segment preferences, we can only show empty space—not actual market opportunity.
      `;
    } else {
      whiteEl.innerHTML = `No significant entry opportunities found with current segment preferences.`;
    }
  }
  
  // === SEGMENTS EXPLAINER ===
  const segsEl = document.querySelector('#explainer-segments-dynamic .dynamic-content');
  if (segsEl && AppState.results.preferences?.segmentIdealPoints) {
    const segments = AppState.results.preferences.segmentIdealPoints;
    const numSegs = segments.length;
    const numDims = AppState.results?.numDimensions || 2;
    
    // Find which brand is closest to each segment (using full N-D space)
    const segBrands = segments.map(seg => {
      let closest = '', minDist = Infinity;
      brands.forEach(brand => {
        const dist = MDSMath.euclideanDistance(
          seg.coords.slice(0, numDims),
          coords[brand].slice(0, numDims)
        );
        if (dist < minDist) {
          minDist = dist;
          closest = brand;
        }
      });
      return { segment: seg.segment, brand: closest, size: seg.size };
    });
    
    const largestSeg = segBrands.sort((a, b) => b.size - a.size)[0];
    
    segsEl.innerHTML = `
      <strong>${numSegs} segments</strong> identified with distinct ideal points. 
      The largest segment (<span class="highlight">Segment ${largestSeg.segment}</span>, ${largestSeg.size} customers) 
      is best served by <span class="highlight">${largestSeg.brand}</span>.
    `;
  } else if (segsEl) {
    segsEl.innerHTML = `Enable "Include Preference Data" in the data input to see segment ideal points.`;
  }
  
  // === INDIVIDUAL CUSTOMERS EXPLAINER ===
  const custEl = document.querySelector('#explainer-customers-dynamic .dynamic-content');
  if (custEl && AppState.preferenceData) {
    const numCustomers = AppState.preferenceData.customers.length;
    const numBrands = brands.length;
    
    // Calculate spread of customer preferences
    const customerPoints = computeIndividualCustomerPoints();
    if (customerPoints.length > 0) {
      // Find centroid of all customers
      let avgX = 0, avgY = 0;
      customerPoints.forEach(c => {
        avgX += c.coords[0];
        avgY += c.coords[1];
      });
      avgX /= customerPoints.length;
      avgY /= customerPoints.length;
      
      // Calculate variance (spread)
      let variance = 0;
      customerPoints.forEach(c => {
        variance += (c.coords[0] - avgX)**2 + (c.coords[1] - avgY)**2;
      });
      const spread = Math.sqrt(variance / customerPoints.length);
      
      // Find which brand is closest to most customers
      const brandCounts = {};
      brands.forEach(b => brandCounts[b] = 0);
      customerPoints.forEach(c => {
        let minDist = Infinity, closest = brands[0];
        brands.forEach(b => {
          const dist = Math.sqrt((c.coords[0] - coords[b][0])**2 + (c.coords[1] - coords[b][1])**2);
          if (dist < minDist) { minDist = dist; closest = b; }
        });
        brandCounts[closest]++;
      });
      const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0];
      
      custEl.innerHTML = `
        <strong>${numCustomers} customers</strong> mapped as individual ideal points.
        Preference spread: ${spread.toFixed(2)} (${spread > 1 ? 'high heterogeneity' : 'relatively clustered'}).
        <span class="highlight">${topBrand[0]}</span> is closest to the most customers (${topBrand[1]}).
      `;
    }
  } else if (custEl) {
    custEl.innerHTML = `Enable "Include Preference Data" to see individual customer ideal points.`;
  }
}

// Helper for whitespace detection (simplified for explainer) - DEPRECATED, kept for fallback
function findWhitespaceForExplainer(brands, coords) {
  if (brands.length === 0) return [];
  
  const xs = brands.map(b => coords[b][0]);
  const ys = brands.map(b => coords[b][1]);
  const minX = Math.min(...xs) - 0.5;
  const maxX = Math.max(...xs) + 0.5;
  const minY = Math.min(...ys) - 0.5;
  const maxY = Math.max(...ys) + 0.5;
  
  const gridSize = 15;
  const stepX = (maxX - minX) / gridSize;
  const stepY = (maxY - minY) / gridSize;
  
  const candidates = [];
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = minX + i * stepX;
      const y = minY + j * stepY;
      
      let minDist = Infinity;
      brands.forEach(brand => {
        const dist = Math.sqrt((x - coords[brand][0])**2 + (y - coords[brand][1])**2);
        if (dist < minDist) minDist = dist;
      });
      
      candidates.push({ x, y, minDist });
    }
  }
  
  candidates.sort((a, b) => b.minDist - a.minDist);
  return candidates.slice(0, 3);
}

// Helper for preference-based entry opportunity detection
function findBestEntryPositions(brands, coords, segments, totalCustomers, shareRule, topN) {
  if (brands.length === 0 || segments.length === 0) return [];
  
  const xs = brands.map(b => coords[b][0]);
  const ys = brands.map(b => coords[b][1]);
  const minX = Math.min(...xs) - 0.5;
  const maxX = Math.max(...xs) + 0.5;
  const minY = Math.min(...ys) - 0.5;
  const maxY = Math.max(...ys) + 0.5;
  
  const gridSize = 20;
  const stepX = (maxX - minX) / gridSize;
  const stepY = (maxY - minY) / gridSize;
  
  const candidates = [];
  
  for (let i = 1; i < gridSize; i++) {
    for (let j = 1; j < gridSize; j++) {
      const x = minX + i * stepX;
      const y = minY + j * stepY;
      
      // Simulate entry at this position
      const result = simulateEntryAtPosition(x, y, brands, coords, segments, totalCustomers, shareRule);
      candidates.push(result);
    }
  }
  
  // Sort by share captured (highest first)
  candidates.sort((a, b) => b.share - a.share);
  
  // Diversity constraint
  const minSep = Math.max(stepX, stepY) * 2;
  const results = [];
  
  for (const c of candidates) {
    if (results.length >= topN) break;
    
    let ok = true;
    for (const s of results) {
      const dx = c.x - s.x;
      const dy = c.y - s.y;
      if (Math.sqrt(dx * dx + dy * dy) < minSep) {
        ok = false;
        break;
      }
    }
    if (ok) results.push(c);
  }
  
  return results;
}

// Simulate a new entrant at position (x, y) and calculate market share
function simulateEntryAtPosition(x, y, brands, coords, segments, totalCustomers, shareRule) {
  // Find nearest existing brand
  let nearestDist = Infinity;
  let nearestBrand = brands[0];
  brands.forEach(brand => {
    const dist = Math.sqrt((x - coords[brand][0])**2 + (y - coords[brand][1])**2);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestBrand = brand;
    }
  });
  
  let entrantShare = 0;
  const segmentShares = [];
  
  segments.forEach(seg => {
    const segmentWeight = seg.size / totalCustomers;
    const segCoords = seg.coords;
    
    // Distance from entrant to this segment's ideal point
    const entrantDist = Math.sqrt((x - segCoords[0])**2 + (y - segCoords[1])**2);
    
    // Distances from all existing brands to this segment
    const brandDists = brands.map(b => {
      return Math.sqrt((coords[b][0] - segCoords[0])**2 + (coords[b][1] - segCoords[1])**2);
    });
    
    let segShare = 0;
    
    if (shareRule === 'first-choice') {
      // First choice: entrant wins if closest
      const minBrandDist = Math.min(...brandDists);
      if (entrantDist < minBrandDist) {
        segShare = 1.0;
      }
    } else if (shareRule === 'preference') {
      // Distance-based share (inverse distance)
      const allDists = [...brandDists, entrantDist];
      const totalInvDist = allDists.reduce((sum, d) => sum + 1 / (d + 0.01), 0);
      segShare = (1 / (entrantDist + 0.01)) / totalInvDist;
    } else {
      // Logit (default): exp(-beta * distance)
      const beta = 2.0;
      const entrantUtil = Math.exp(-beta * entrantDist);
      const brandUtils = brandDists.map(d => Math.exp(-beta * d));
      const totalExp = brandUtils.reduce((sum, u) => sum + u, 0) + entrantUtil;
      segShare = entrantUtil / totalExp;
    }
    
    segmentShares.push({ segment: seg.segment, share: segShare, size: seg.size });
    entrantShare += segmentWeight * segShare;
  });
  
  return {
    x,
    y,
    share: entrantShare,
    nearestBrand,
    nearestDist,
    segmentShares
  };
}

// ==================== INSIGHT CARDS ====================
function renderInsightCards() {
  const container = document.getElementById('insight-cards');
  if (!container || !AppState.results) return;
  
  const sim = AppState.simulation;
  const hasRepositioning = sim.hasChanges && sim.repositionedBrands.length > 0;
  
  // Generate insights with comparison data if repositioning active
  const insights = generateKeyInsights();
  
  if (insights.length === 0) {
    container.innerHTML = `
      <div class="insight-card placeholder">
        <span class="insight-icon">💡</span>
        <p>No significant insights detected. Try adding more brands or attributes.</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  // Add repositioning header if active
  if (hasRepositioning) {
    html += `
      <div class="insight-card repositioning-header">
        <span class="insight-icon">🔄</span>
        <h4>REPOSITIONED* Simulation Active</h4>
        <p>Brands moved: <strong>${sim.repositionedBrands.join(', ')}</strong></p>
        <button class="btn-reset-repositioning" onclick="resetRepositioning()">Reset All</button>
      </div>
    `;
  }
  
  insights.forEach(insight => {
    // Add repositioned flag if we have changes
    const titleSuffix = hasRepositioning && insight.hasComparison ? ' <span class="repositioned-flag">(REPOSITIONED*)</span>' : '';
    
    html += `
      <div class="insight-card ${insight.type || ''} ${hasRepositioning ? 'repositioned' : ''}">
        <span class="insight-icon">${insight.icon}</span>
        <h4>${insight.title}${titleSuffix}</h4>
        <p>${insight.description}</p>
        ${insight.comparison ? `<div class="insight-comparison">${insight.comparison}</div>` : ''}
        ${insight.metric ? `<span class="insight-metric">${insight.metric}</span>` : ''}
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function generateKeyInsights() {
  const insights = [];
  const sim = AppState.simulation;
  const hasRepositioning = sim.hasChanges && sim.repositionedBrands.length > 0;
  const numDimsInsights = AppState.results?.numDimensions || 2;
  
  // Use simulation coords (updated by drag) if available, otherwise original
  const coords = sim.modifiedCoords && Object.keys(sim.modifiedCoords).length > 0
    ? sim.modifiedCoords 
    : AppState.results.brandCoords;
  const originalCoords = sim.originalCoords && Object.keys(sim.originalCoords).length > 0
    ? sim.originalCoords
    : AppState.results.brandCoords;
  const brands = Object.keys(coords);
  
  // Insight 1: Most differentiated brand (using full N-D space)
  let maxDist = 0;
  let mostDifferentiated = '';
  brands.forEach(brand => {
    const avgDist = brands
      .filter(b => b !== brand)
      .reduce((sum, b) => sum + MDSMath.euclideanDistance(coords[brand].slice(0, numDimsInsights), coords[b].slice(0, numDimsInsights)), 0) / (brands.length - 1);
    if (avgDist > maxDist) {
      maxDist = avgDist;
      mostDifferentiated = brand;
    }
  });
  
  // Calculate original most differentiated for comparison
  let originalMaxDist = 0;
  let originalMostDiff = '';
  if (hasRepositioning) {
    brands.forEach(brand => {
      const avgDist = brands
        .filter(b => b !== brand)
        .reduce((sum, b) => sum + MDSMath.euclideanDistance(originalCoords[brand].slice(0, numDimsInsights), originalCoords[b].slice(0, numDimsInsights)), 0) / (brands.length - 1);
      if (avgDist > originalMaxDist) {
        originalMaxDist = avgDist;
        originalMostDiff = brand;
      }
    });
  }
  
  if (mostDifferentiated) {
    const changed = hasRepositioning && (mostDifferentiated !== originalMostDiff || Math.abs(maxDist - originalMaxDist) > 0.01);
    insights.push({
      icon: '🎯',
      title: 'Most Differentiated',
      description: `${mostDifferentiated} stands out from competitors with the highest average perceptual distance.`,
      metric: maxDist.toFixed(2) + ' avg distance',
      hasComparison: changed,
      comparison: changed ? `<span class="comparison-original">Was: ${originalMostDiff} (${originalMaxDist.toFixed(2)})</span> → <span class="comparison-new">Now: ${mostDifferentiated} (${maxDist.toFixed(2)})</span>` : null
    });
  }
  
  // Insight 2: Closest competitors (using full N-D space)
  let minDist = Infinity;
  let closestPair = [];
  for (let i = 0; i < brands.length; i++) {
    for (let j = i + 1; j < brands.length; j++) {
      const dist = MDSMath.euclideanDistance(coords[brands[i]].slice(0, numDimsInsights), coords[brands[j]].slice(0, numDimsInsights));
      if (dist < minDist) {
        minDist = dist;
        closestPair = [brands[i], brands[j]];
      }
    }
  }
  
  // Calculate original closest for comparison
  let originalMinDist = Infinity;
  let originalClosestPair = [];
  if (hasRepositioning) {
    for (let i = 0; i < brands.length; i++) {
      for (let j = i + 1; j < brands.length; j++) {
        const dist = MDSMath.euclideanDistance(originalCoords[brands[i]].slice(0, numDimsInsights), originalCoords[brands[j]].slice(0, numDimsInsights));
        if (dist < originalMinDist) {
          originalMinDist = dist;
          originalClosestPair = [brands[i], brands[j]];
        }
      }
    }
  }
  
  if (closestPair.length === 2) {
    const pairChanged = hasRepositioning && (closestPair[0] !== originalClosestPair[0] || closestPair[1] !== originalClosestPair[1]);
    const distChanged = hasRepositioning && Math.abs(minDist - originalMinDist) > 0.01;
    const changed = pairChanged || distChanged;
    
    insights.push({
      icon: '⚔️',
      title: 'Head-to-Head Battle',
      description: `${closestPair[0]} and ${closestPair[1]} are perceived as nearly identical—direct substitutes in customers' minds.`,
      metric: minDist.toFixed(2) + ' distance',
      hasComparison: changed,
      comparison: changed ? `<span class="comparison-original">Was: ${originalClosestPair.join(' vs ')} (${originalMinDist.toFixed(2)})</span> → <span class="comparison-new">Now: ${closestPair.join(' vs ')} (${minDist.toFixed(2)})</span>` : null
    });
  }
  
  // Insight 3: Whitespace opportunity (if applicable)
  const whitespace = findWhitespaceOpportunity();
  if (whitespace) {
    insights.push({
      icon: '✨',
      title: 'Opportunity Zone',
      description: `Market gap detected at position (${whitespace.x.toFixed(1)}, ${whitespace.y.toFixed(1)})—no brands currently occupy this space.`,
      metric: whitespace.potentialShare ? `${(whitespace.potentialShare * 100).toFixed(0)}% share potential` : null,
      hasComparison: hasRepositioning
    });
  }
  
  // Insight 4: Market Share Changes (only if repositioning and preference data available)
  if (hasRepositioning && AppState.preferenceData?.customers?.length > 0) {
    const originalShares = sim.originalResults.marketShares;
    const newShares = sim.repositionedResults.marketShares;
    
    // Find biggest winner and loser
    let biggestGainer = { brand: '', change: 0 };
    let biggestLoser = { brand: '', change: 0 };
    
    Object.keys(newShares).forEach(brand => {
      const change = (newShares[brand] || 0) - (originalShares[brand] || 0);
      if (change > biggestGainer.change) {
        biggestGainer = { brand, change };
      }
      if (change < biggestLoser.change) {
        biggestLoser = { brand, change };
      }
    });
    
    if (biggestGainer.change > 0.001) {
      insights.push({
        icon: '📈',
        title: 'Market Share Impact',
        description: `${biggestGainer.brand} gains the most from repositioning.`,
        metric: `+${(biggestGainer.change * 100).toFixed(1)}% share`,
        hasComparison: true,
        comparison: `<span class="comparison-original">Was: ${((originalShares[biggestGainer.brand] || 0) * 100).toFixed(1)}%</span> → <span class="comparison-new">Now: ${((newShares[biggestGainer.brand] || 0) * 100).toFixed(1)}%</span>`,
        type: 'positive'
      });
    }
    
    if (biggestLoser.change < -0.001) {
      insights.push({
        icon: '📉',
        title: 'Share Lost',
        description: `${biggestLoser.brand} loses the most from repositioning.`,
        metric: `${(biggestLoser.change * 100).toFixed(1)}% share`,
        hasComparison: true,
        comparison: `<span class="comparison-original">Was: ${((originalShares[biggestLoser.brand] || 0) * 100).toFixed(1)}%</span> → <span class="comparison-new">Now: ${((newShares[biggestLoser.brand] || 0) * 100).toFixed(1)}%</span>`,
        type: 'negative'
      });
    }
  }
  
  // Insight 5: Segment alignment (if preferences loaded) - using full N-D space
  if (AppState.results.preferences) {
    const segments = AppState.results.preferences.segmentIdealPoints;
    const bestFit = segments.reduce((best, seg) => {
      const closest = brands.reduce((min, b) => {
        const dist = MDSMath.euclideanDistance(coords[b].slice(0, numDimsInsights), seg.coords.slice(0, numDimsInsights));
        return dist < min.dist ? { brand: b, dist } : min;
      }, { brand: '', dist: Infinity });
      
      if (!best.segment || closest.dist < best.dist) {
        return { segment: seg.segment, brand: closest.brand, dist: closest.dist, size: seg.size };
      }
      return best;
    }, {});
    
    if (bestFit.brand) {
      insights.push({
        icon: '🎯',
        title: 'Best Segment Alignment',
        description: `${bestFit.brand} is positioned closest to Segment ${bestFit.segment} (${bestFit.size} customers).`,
        type: 'segment',
        hasComparison: hasRepositioning
      });
    }
  }
  
  return insights;
}

function findWhitespaceOpportunity() {
  // Find the area with maximum distance from all existing brands
  const coords = AppState.results.brandCoords;
  const brands = Object.keys(coords);
  
  // Get bounds
  const xCoords = brands.map(b => coords[b][0]);
  const yCoords = brands.map(b => coords[b][1]);
  const xMin = Math.min(...xCoords) - 0.5;
  const xMax = Math.max(...xCoords) + 0.5;
  const yMin = Math.min(...yCoords) - 0.5;
  const yMax = Math.max(...yCoords) + 0.5;
  
  // Sample grid to find maximum-distance point
  let maxMinDist = 0;
  let bestPoint = null;
  
  for (let x = xMin; x <= xMax; x += 0.2) {
    for (let y = yMin; y <= yMax; y += 0.2) {
      const minDist = Math.min(...brands.map(b => 
        MDSMath.euclideanDistance([x, y], coords[b].slice(0, 2))
      ));
      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestPoint = { x, y, minDist };
      }
    }
  }
  
  // Only report if significant gap
  if (maxMinDist > 0.8) {
    return bestPoint;
  }
  return null;
}

// ==================== DIMENSION EXPLORER ====================
function renderDimensionExplorer() {
  if (!AppState.results) return;
  
  const coords = AppState.results.brandCoords;
  const brands = Object.keys(coords);
  const variance = AppState.results.varianceExplained;
  const interps = AppState.results.dimensionInterpretations;
  const numDims = AppState.results.numDimensions || 2;
  
  // Show/hide 3rd dimension row
  const dim3Row = document.getElementById('dim3-explorer');
  if (dim3Row) {
    dim3Row.classList.toggle('hidden', numDims < 3);
  }
  
  // Calculate relative heights based on variance (with non-linear scaling)
  // Use square root to prevent extreme height differences
  const variances = variance.slice(0, numDims);
  const maxVar = Math.max(...variances);
  const minHeight = 60;  // Minimum height in pixels
  const maxHeight = 120; // Maximum height in pixels
  
  // Non-linear scaling: sqrt makes smaller variances more visible
  const scaledVars = variances.map(v => Math.sqrt(v / maxVar));
  const heights = scaledVars.map(sv => minHeight + (maxHeight - minHeight) * sv);
  
  // Update each dimension
  const dimIds = ['dim1', 'dim2', 'dim3'].slice(0, numDims);
  
  dimIds.forEach((dimId, dimIdx) => {
    const interp = interps[dimIdx];
    const row = document.getElementById(`${dimId}-explorer`);
    
    // Set relative height based on variance importance
    if (row) {
      row.style.minHeight = `${heights[dimIdx]}px`;
    }
    
    // Update labels
    const negEl = document.getElementById(`${dimId}-neg`);
    const posEl = document.getElementById(`${dimId}-pos`);
    if (negEl) negEl.textContent = interp?.negativeEnd?.slice(0, 2).join(', ') || 'Low';
    if (posEl) posEl.textContent = interp?.positiveEnd?.slice(0, 2).join(', ') || 'High';
    
    // Update variance bar
    const varPercent = (variance[dimIdx] * 100).toFixed(1);
    const varFill = document.getElementById(`${dimId}-variance`);
    const varLabel = document.getElementById(`${dimId}-var-label`);
    if (varFill) varFill.style.width = `${varPercent}%`;
    if (varLabel) varLabel.textContent = `${varPercent}% variance`;
    
    // Position brand chips along dimension
    const strip = document.getElementById(`${dimId}-brands`);
    if (!strip) return;
    
    strip.innerHTML = '';
    
    // Get range for this dimension
    const values = brands.map(b => coords[b][dimIdx]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    brands.forEach(brand => {
      const val = coords[brand][dimIdx];
      const pct = ((val - min) / range) * 90 + 5; // 5% to 95% position
      
      const chip = document.createElement('span');
      chip.className = 'dim-brand-chip';
      chip.textContent = brand;
      chip.style.left = `${pct}%`;
      chip.title = `${brand}: ${val.toFixed(2)}`;
      chip.onclick = () => showBrandCard(brand);
      
      strip.appendChild(chip);
    });
  });
}

// ==================== COMPETITIVE INTELLIGENCE ====================
function renderDistanceHeatmap() {
  const container = document.getElementById('distance-heatmap');
  if (!container || !AppState.results) return;
  
  const sim = AppState.simulation;
  const hasRepositioning = sim.hasChanges && sim.repositionedBrands.length > 0;
  const numDimsHeatmap = AppState.results?.numDimensions || 2;
  
  // Use simulation coords (updated by drag) if available, otherwise original
  const coords = sim.modifiedCoords && Object.keys(sim.modifiedCoords).length > 0
    ? sim.modifiedCoords 
    : AppState.results.brandCoords;
  const brands = Object.keys(coords);
  
  // Build distance matrix (using full N-D space)
  const distances = brands.map(b1 => 
    brands.map(b2 => MDSMath.euclideanDistance(coords[b1].slice(0, numDimsHeatmap), coords[b2].slice(0, numDimsHeatmap)))
  );
  
  // Add repositioned flag indicator above heatmap
  let flagContainer = container.previousElementSibling;
  if (flagContainer?.classList?.contains('heatmap-repositioned-flag')) {
    flagContainer.remove();
  }
  
  if (hasRepositioning) {
    const flag = document.createElement('div');
    flag.className = 'heatmap-repositioned-flag';
    flag.innerHTML = '🔄 <span>REPOSITIONED* — Distances reflect hypothetical positions</span>';
    container.parentNode.insertBefore(flag, container);
  }
  
  // Title with repositioned indicator
  const titleText = hasRepositioning 
    ? 'Brand-to-Brand Distances (REPOSITIONED*)' 
    : '';
  
  // Create heatmap
  Plotly.newPlot(container, [{
    z: distances,
    x: brands,
    y: brands,
    type: 'heatmap',
    colorscale: hasRepositioning 
      ? [
          [0, '#92400e'],
          [0.25, '#f59e0b'],
          [0.5, '#fcd34d'],
          [0.75, '#fef3c7'],
          [1, '#fffbeb']
        ]
      : [
          [0, '#1e40af'],
          [0.25, '#3b82f6'],
          [0.5, '#93c5fd'],
          [0.75, '#dbeafe'],
          [1, '#f8fafc']
        ],
    reversescale: true,
    showscale: true,
    hovertemplate: hasRepositioning 
      ? '%{y} ↔ %{x}<br>Distance: %{z:.2f} (REPOSITIONED*)<extra></extra>'
      : '%{y} ↔ %{x}<br>Distance: %{z:.2f}<extra></extra>'
  }], {
    title: titleText,
    xaxis: { side: 'bottom', tickangle: -45 },
    yaxis: { autorange: 'reversed' },
    margin: { t: hasRepositioning ? 40 : 30, r: 50, b: 80, l: 80 },
    plot_bgcolor: 'white'
  }, { responsive: true, displayModeBar: false });
}

function renderBrandRadarChart() {
  const container = document.getElementById('brand-radar-chart');
  if (!container || !AppState.results) return;
  
  // Get selected brands
  const brand1 = document.getElementById('radar-brand-1')?.value;
  const brand2 = document.getElementById('radar-brand-2')?.value;
  const brand3 = document.getElementById('radar-brand-3')?.value;
  
  const selectedBrands = [brand1, brand2, brand3].filter(b => b);
  
  if (selectedBrands.length < 1) {
    container.innerHTML = '<p style="text-align:center; color:#888; padding:2rem;">Select at least one brand to view its profile.</p>';
    return;
  }
  
  const attrs = AppState.perceptualData.attributes;
  const matrix = AppState.perceptualData.matrix;
  const brands = AppState.perceptualData.brands;
  const colors = ['#2563eb', '#dc2626', '#16a34a'];
  
  const traces = selectedBrands.map((brand, idx) => {
    const brandIdx = brands.indexOf(brand);
    const values = attrs.map((_, attrIdx) => matrix[attrIdx][brandIdx]);
    
    return {
      type: 'scatterpolar',
      r: [...values, values[0]], // Close the loop
      theta: [...attrs, attrs[0]],
      fill: 'toself',
      fillcolor: colors[idx] + '20',
      line: { color: colors[idx], width: 2 },
      name: brand
    };
  });
  
  Plotly.newPlot(container, traces, {
    polar: {
      radialaxis: {
        visible: true,
        range: [0, Math.max(...matrix.flat()) * 1.1]
      }
    },
    showlegend: true,
    legend: { orientation: 'h', y: -0.1 },
    margin: { t: 30, r: 50, b: 30, l: 50 }
  }, { responsive: true, displayModeBar: false });
  
  // Generate comparison insights
  renderRadarInsights(selectedBrands);
}

function renderRadarInsights(selectedBrands) {
  const container = document.getElementById('radar-insights');
  if (!container || selectedBrands.length < 2) {
    container.innerHTML = '';
    return;
  }
  
  const attrs = AppState.perceptualData.attributes;
  const matrix = AppState.perceptualData.matrix;
  const brands = AppState.perceptualData.brands;
  
  const brand1 = selectedBrands[0];
  const brand2 = selectedBrands[1];
  const idx1 = brands.indexOf(brand1);
  const idx2 = brands.indexOf(brand2);
  
  // Find biggest differences
  const diffs = attrs.map((attr, i) => ({
    attr,
    diff: matrix[i][idx1] - matrix[i][idx2],
    val1: matrix[i][idx1],
    val2: matrix[i][idx2]
  })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  
  const top = diffs[0];
  const winner1 = top.diff > 0 ? brand1 : brand2;
  const winner2 = top.diff > 0 ? brand2 : brand1;
  
  container.innerHTML = `
    <strong>Key Difference:</strong> ${winner1} leads on <em>${top.attr}</em> 
    (${Math.abs(top.diff).toFixed(1)} points higher than ${winner2}).
  `;
}

function renderAttributeImportanceChart() {
  const container = document.getElementById('attribute-importance-chart');
  if (!container || !AppState.results) return;
  
  const loadings = AppState.results.attrLoadings;
  const attrs = AppState.perceptualData.attributes;
  const variance = AppState.results.varianceExplained;
  
  // Calculate weighted importance based on loadings and variance explained
  const importance = attrs.map((attr, i) => {
    const l = loadings[i];
    // Weight by variance: dim1 matters more than dim2
    const score = Math.abs(l[0]) * variance[0] + Math.abs(l[1]) * variance[1];
    return { attr, score };
  }).sort((a, b) => b.score - a.score);
  
  Plotly.newPlot(container, [{
    y: importance.map(i => i.attr),
    x: importance.map(i => i.score),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: importance.map((_, i) => i < 3 ? '#2563eb' : '#94a3b8')
    }
  }], {
    title: '',
    xaxis: { title: 'Differentiation Power' },
    margin: { t: 20, r: 20, b: 40, l: 100 }
  }, { responsive: true, displayModeBar: false });
}

// ==================== BRAND HOVER CARD ====================
function showBrandCard(brand) {
  const card = document.getElementById('brand-hover-card');
  if (!card || !AppState.results) return;
  
  const coords = AppState.results.brandCoords;
  const brands = Object.keys(coords);
  const numDimsCard = AppState.results?.numDimensions || 2;
  
  // Update header
  document.getElementById('hover-brand-name').textContent = brand;
  
  // Find nearest competitor (using full N-D space)
  let nearest = { brand: '', dist: Infinity };
  brands.forEach(b => {
    if (b === brand) return;
    const dist = MDSMath.euclideanDistance(coords[brand].slice(0, numDimsCard), coords[b].slice(0, numDimsCard));
    if (dist < nearest.dist) {
      nearest = { brand: b, dist };
    }
  });
  
  document.getElementById('hover-nearest').textContent = nearest.brand;
  document.getElementById('hover-distance').textContent = nearest.dist.toFixed(2);
  
  // Find best segment fit if preferences loaded (using full N-D space)
  if (AppState.results.preferences) {
    const segments = AppState.results.preferences.segmentIdealPoints;
    const bestSeg = segments.reduce((best, seg) => {
      const dist = MDSMath.euclideanDistance(coords[brand].slice(0, numDimsCard), seg.coords.slice(0, numDimsCard));
      return dist < best.dist ? { seg: seg.segment, dist } : best;
    }, { seg: 0, dist: Infinity });
    document.getElementById('hover-segment').textContent = `Segment ${bestSeg.seg}`;
  } else {
    document.getElementById('hover-segment').textContent = '—';
  }
  
  // Find top 3 strengths (highest attributes)
  const attrs = AppState.perceptualData.attributes;
  const matrix = AppState.perceptualData.matrix;
  const brandIdx = AppState.perceptualData.brands.indexOf(brand);
  
  const attrScores = attrs.map((attr, i) => ({ attr, val: matrix[i][brandIdx] }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 3);
  
  const strengthsEl = document.getElementById('hover-strengths');
  strengthsEl.innerHTML = attrScores.map(a => 
    `<span class="strength-tag">${a.attr}</span>`
  ).join('');
  
  // Render mini radar
  renderMiniRadar(brand);
  
  // Show card
  card.classList.remove('hidden');
}

function hideBrandCard() {
  document.getElementById('brand-hover-card')?.classList.add('hidden');
}

function renderMiniRadar(brand) {
  const container = document.getElementById('mini-radar-chart');
  if (!container) return;
  
  const attrs = AppState.perceptualData.attributes;
  const matrix = AppState.perceptualData.matrix;
  const brands = AppState.perceptualData.brands;
  const brandIdx = brands.indexOf(brand);
  
  const values = attrs.map((_, i) => matrix[i][brandIdx]);
  
  Plotly.newPlot(container, [{
    type: 'scatterpolar',
    r: [...values, values[0]],
    theta: [...attrs, attrs[0]],
    fill: 'toself',
    fillcolor: 'rgba(37, 99, 235, 0.2)',
    line: { color: '#2563eb', width: 2 }
  }], {
    polar: {
      radialaxis: { visible: false },
      angularaxis: { visible: false }
    },
    showlegend: false,
    margin: { t: 10, r: 10, b: 10, l: 10 }
  }, { responsive: true, displayModeBar: false });
}

// ==================== POPULATE SELECTORS ====================
function populateBrandSelectors() {
  const brands = AppState.perceptualData?.brands || [];
  
  ['radar-brand-1', 'radar-brand-2', 'radar-brand-3', 'focal-brand-select'].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    
    // Keep first option
    const firstOption = select.options[0];
    select.innerHTML = '';
    select.appendChild(firstOption);
    
    brands.forEach(brand => {
      const option = document.createElement('option');
      option.value = brand;
      option.textContent = brand;
      select.appendChild(option);
    });
  });
  
  // Setup change listeners for radar
  ['radar-brand-1', 'radar-brand-2', 'radar-brand-3'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderBrandRadarChart);
  });
}

// ==================== FOCAL BRAND DEEP DIVE ====================
function renderFocalBrandAnalysis(brand) {
  if (!brand || !AppState.results) return;
  
  const sim = AppState.simulation;
  const hasRepositioning = sim.hasChanges && sim.repositionedBrands.length > 0;
  const numDimsFocal = AppState.results?.numDimensions || 2;
  
  // Use simulation coords (updated by drag) if available
  const coords = sim.modifiedCoords && Object.keys(sim.modifiedCoords).length > 0
    ? sim.modifiedCoords 
    : AppState.results.brandCoords;
  const brands = Object.keys(coords);
  
  // Update header with repositioned flag if applicable
  const brandTitle = document.getElementById('focal-brand-title');
  brandTitle.innerHTML = hasRepositioning && sim.repositionedBrands.includes(brand)
    ? `${brand} <span class="repositioned-flag">(REPOSITIONED*)</span>`
    : brand;
  
  const tagline = hasRepositioning 
    ? 'Analysis reflects hypothetical repositioned positions'
    : 'Deep competitive analysis and strategic recommendations';
  document.getElementById('focal-tagline').textContent = tagline;
  document.querySelector('.focal-brand-badge .brand-initial').textContent = brand.charAt(0).toUpperCase();
  
  // Calculate metrics using current (possibly repositioned) coords - full N-D space
  const avgDist = brands.filter(b => b !== brand)
    .reduce((sum, b) => sum + MDSMath.euclideanDistance(coords[brand].slice(0, numDimsFocal), coords[b].slice(0, numDimsFocal)), 0) / (brands.length - 1);
  
  const minDist = Math.min(...brands.filter(b => b !== brand)
    .map(b => MDSMath.euclideanDistance(coords[brand].slice(0, numDimsFocal), coords[b].slice(0, numDimsFocal))));
  
  // Differentiation score (higher = more unique)
  const diffScore = Math.min(100, avgDist * 50);
  
  // Vulnerability (closer competitors = more vulnerable)
  const vulnScore = Math.max(0, 100 - minDist * 50);
  
  // Update scorecards - calculate share if preferences available
  let shareText = '—';
  if (AppState.results.preferences) {
    const shares = calculateMarketShares(sim.modifiedCoords);
    if (shares && shares[brand] !== undefined) {
      shareText = `${(shares[brand] * 100).toFixed(1)}%`;
      
      // Add comparison if repositioning and we have original shares
      if (hasRepositioning && sim.originalResults.marketShares[brand] !== undefined) {
        const originalShare = sim.originalResults.marketShares[brand] * 100;
        const newShare = shares[brand] * 100;
        const change = newShare - originalShare;
        const changeStr = change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
        shareText = `${newShare.toFixed(1)}% (${changeStr}%)`;
      }
    }
  }
  document.getElementById('focal-share').textContent = shareText;
  document.getElementById('focal-position-strength').textContent = 'Strong';
  document.getElementById('focal-differentiation').textContent = diffScore.toFixed(0);
  document.getElementById('focal-vulnerability').textContent = vulnScore.toFixed(0);
  
  // Render distance bars
  renderFocalDistanceBars(brand);
  
  // Render vs category radar
  renderFocalVsCategoryRadar(brand);
  
  // Generate recommendations
  generateFocalRecommendations(brand);
  
  // Show section
  document.querySelector('.focal-brand-section').classList.remove('hidden');
}

function renderFocalDistanceBars(focalBrand) {
  const container = document.getElementById('focal-distance-bars');
  if (!container) return;
  
  const sim = AppState.simulation;
  const hasRepositioning = sim.hasChanges && sim.repositionedBrands.length > 0;
  const numDimsBars = AppState.results?.numDimensions || 2;
  
  // Use simulation coords
  const coords = sim.modifiedCoords && Object.keys(sim.modifiedCoords).length > 0
    ? sim.modifiedCoords 
    : AppState.results.brandCoords;
  const originalCoords = sim.originalCoords && Object.keys(sim.originalCoords).length > 0
    ? sim.originalCoords
    : AppState.results.brandCoords;
    
  const brands = Object.keys(coords).filter(b => b !== focalBrand);
  
  const distances = brands.map(b => {
    const dist = MDSMath.euclideanDistance(coords[focalBrand].slice(0, numDimsBars), coords[b].slice(0, numDimsBars));
    const originalDist = hasRepositioning 
      ? MDSMath.euclideanDistance(originalCoords[focalBrand].slice(0, numDimsBars), originalCoords[b].slice(0, numDimsBars))
      : dist;
    return {
      brand: b,
      dist,
      originalDist,
      changed: Math.abs(dist - originalDist) > 0.01
    };
  }).sort((a, b) => a.dist - b.dist);
  
  const maxDist = Math.max(...distances.map(d => Math.max(d.dist, d.originalDist)));
  
  let html = '';
  if (hasRepositioning) {
    html += '<div class="heatmap-repositioned-flag" style="margin-bottom:0.5rem;">🔄 Distances reflect REPOSITIONED* positions</div>';
  }
  
  distances.forEach(d => {
    const pct = (d.dist / maxDist) * 100;
    const changeIndicator = hasRepositioning && d.changed
      ? ` <span style="color:${d.dist < d.originalDist ? '#16a34a' : '#dc2626'}; font-size:0.75rem;">(was ${d.originalDist.toFixed(2)})</span>`
      : '';
    html += `
      <div class="distance-bar-row">
        <span class="distance-bar-label">${d.brand}</span>
        <div class="distance-bar-track">
          <div class="distance-bar-fill ${hasRepositioning ? 'repositioned' : ''}" style="width:${pct}%">${d.dist.toFixed(2)}${changeIndicator}</div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function renderFocalVsCategoryRadar(focalBrand) {
  const container = document.getElementById('focal-vs-category-radar');
  if (!container) return;
  
  const attrs = AppState.perceptualData.attributes;
  const matrix = AppState.perceptualData.matrix;
  const brands = AppState.perceptualData.brands;
  const brandIdx = brands.indexOf(focalBrand);
  
  const focalValues = attrs.map((_, i) => matrix[i][brandIdx]);
  const avgValues = attrs.map((_, i) => 
    matrix[i].reduce((sum, v) => sum + v, 0) / brands.length
  );
  
  Plotly.newPlot(container, [
    {
      type: 'scatterpolar',
      r: [...focalValues, focalValues[0]],
      theta: [...attrs, attrs[0]],
      fill: 'toself',
      fillcolor: 'rgba(37, 99, 235, 0.3)',
      line: { color: '#2563eb', width: 2 },
      name: focalBrand
    },
    {
      type: 'scatterpolar',
      r: [...avgValues, avgValues[0]],
      theta: [...attrs, attrs[0]],
      fill: 'toself',
      fillcolor: 'rgba(148, 163, 184, 0.2)',
      line: { color: '#94a3b8', width: 2, dash: 'dot' },
      name: 'Category Average'
    }
  ], {
    polar: { radialaxis: { visible: true } },
    showlegend: true,
    legend: { orientation: 'h', y: -0.1 },
    margin: { t: 30, r: 50, b: 30, l: 50 }
  }, { responsive: true, displayModeBar: false });
}

function generateFocalRecommendations(brand) {
  const container = document.getElementById('focal-rec-cards');
  if (!container) return;
  
  const recommendations = [];
  const coords = AppState.results.brandCoords;
  const brands = Object.keys(coords);
  const attrs = AppState.perceptualData.attributes;
  const matrix = AppState.perceptualData.matrix;
  const brandIdx = AppState.perceptualData.brands.indexOf(brand);
  const numDimsRec = AppState.results?.numDimensions || 2;
  
  // Find closest competitor (using full N-D space)
  const closest = brands.filter(b => b !== brand)
    .map(b => ({ brand: b, dist: MDSMath.euclideanDistance(coords[brand].slice(0, numDimsRec), coords[b].slice(0, numDimsRec)) }))
    .sort((a, b) => a.dist - b.dist)[0];
  
  if (closest && closest.dist < 0.5) {
    recommendations.push({
      icon: '⚔️',
      title: 'Competitive Threat',
      description: `${closest.brand} is positioned very close (${closest.dist.toFixed(2)} distance). Consider differentiation strategies on key attributes.`,
      priority: 'high'
    });
  }
  
  // Find weakest attribute
  const attrScores = attrs.map((attr, i) => ({ attr, val: matrix[i][brandIdx] }))
    .sort((a, b) => a.val - b.val);
  
  if (attrScores.length > 0) {
    recommendations.push({
      icon: '📈',
      title: 'Improvement Opportunity',
      description: `${brand} scores lowest on "${attrScores[0].attr}" (${attrScores[0].val.toFixed(1)}). Improving this perception could open new segment opportunities.`,
      priority: 'medium'
    });
  }
  
  // Segment opportunity if preferences loaded (using full N-D space)
  if (AppState.results.preferences) {
    const segments = AppState.results.preferences.segmentIdealPoints;
    const unserved = segments.find(seg => {
      const closest = brands.reduce((min, b) => {
        const dist = MDSMath.euclideanDistance(coords[b].slice(0, numDimsRec), seg.coords.slice(0, numDimsRec));
        return dist < min ? dist : min;
      }, Infinity);
      return closest > 0.8;
    });
    
    if (unserved) {
      recommendations.push({
        icon: '🎯',
        title: 'Unserved Segment',
        description: `Segment ${unserved.segment} (${unserved.size} customers) has no close brand match. Repositioning toward this segment could capture significant share.`,
        priority: 'high'
      });
    }
  }
  
  // Render cards
  let html = '';
  recommendations.forEach(rec => {
    html += `
      <div class="rec-card priority-${rec.priority}">
        <span class="rec-icon">${rec.icon}</span>
        <h5>${rec.title}</h5>
        <p>${rec.description}</p>
      </div>
    `;
  });
  
  if (html === '') {
    html = `
      <div class="rec-card placeholder">
        <span class="rec-icon">✅</span>
        <p>${brand} appears well-positioned with no critical recommendations.</p>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// Add focal brand selector listener
document.getElementById('focal-brand-select')?.addEventListener('change', (e) => {
  if (e.target.value && AppState.results) {
    renderFocalBrandAnalysis(e.target.value);
  }
});
