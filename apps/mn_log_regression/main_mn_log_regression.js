// Multinomial Logistic Regression Tool controller (initial wiring)
const CREATED_DATE = '2025-11-15';
let modifiedDate = new Date().toLocaleDateString();

// Basic dataset state for this tool
let mnlogDataset = { headers: [], rows: [] };
let mnlogSelectedOutcome = null;
let mnlogOutcomeLevels = [];
let mnlogReferenceLevel = null;
let mnlogSelectedPredictors = [];
let mnlogPredictorSettings = {};
let mnlogLastModel = null;
let mnlogLastDesign = null;

// Scenario builders: generate moderately large, realistic-looking multinomial datasets
// We simulate predictors first, then draw outcomes from a softmax over linear scores so there is structure + noise.
function buildFunnelScenarioCSV(rowCount = 600) {
  const n = Math.max(500, Math.min(1000, rowCount || 600));
  const lines = ['customer_id,stage,channel,frequency_segment,age_band'];

  const stages = ['Awareness', 'Consideration', 'Purchase'];
  const channels = ['Email', 'Social', 'Search'];
  const freqs = ['Low', 'Medium', 'High'];
  const ages = ['18-24', '25-34', '35-44', '45-54', '55+'];

  const softmax = scores => {
    const max = Math.max.apply(null, scores);
    const exps = scores.map(s => Math.exp(s - max));
    const sum = exps.reduce((acc, v) => acc + v, 0) || 1;
    return exps.map(v => v / sum);
  };

  const sampleCategory = probs => {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r <= cum) return i;
    }
    return probs.length - 1;
  };

  for (let i = 0; i < n; i++) {
    const customerId = `C${String(i + 1).padStart(4, '0')}`;

    // Draw predictors with realistic but not extreme marginals
    const channel = (() => {
      const r = Math.random();
      if (r < 0.35) return 'Email';
      if (r < 0.7) return 'Social';
      return 'Search';
    })();

    const frequency_segment = (() => {
      const r = Math.random();
      if (r < 0.45) return 'Low';
      if (r < 0.8) return 'Medium';
      return 'High';
    })();

    const age_band = (() => {
      const r = Math.random();
      if (r < 0.2) return '18-24';
      if (r < 0.45) return '25-34';
      if (r < 0.7) return '35-44';
      if (r < 0.9) return '45-54';
      return '55+';
    })();

    // Linear scores for each stage: Awareness, Consideration, Purchase.
    // Start with intercepts so Awareness is slightly most common overall.
    let scoreAw = 0.0;
    let scoreCons = -0.1;
    let scorePur = -0.4;

    // Channel effects
    if (channel === 'Social') {
      scoreAw += 0.4;
      scoreCons += 0.1;
    } else if (channel === 'Search') {
      scoreCons += 0.4;
      scorePur += 0.3;
    } else if (channel === 'Email') {
      scoreCons += 0.2;
      scorePur += 0.2;
    }

    // Frequency effects
    if (frequency_segment === 'Low') {
      scoreAw += 0.3;
    } else if (frequency_segment === 'Medium') {
      scoreCons += 0.3;
    } else if (frequency_segment === 'High') {
      scoreCons += 0.3;
      scorePur += 0.6;
    }

    // Age effects (e.g., mid-career more likely to be further down funnel)
    if (age_band === '25-34' || age_band === '35-44') {
      scoreCons += 0.2;
      scorePur += 0.2;
    } else if (age_band === '55+') {
      scoreAw += 0.2;
    }

    // Draw stage from softmax over scores
    const probs = softmax([scoreAw, scoreCons, scorePur]);
    const stageIndex = sampleCategory(probs);
    const stage = stages[stageIndex];

    lines.push([customerId, stage, channel, frequency_segment, age_band].join(','));
  }

  return lines.join('\n');
}

function buildBrandChoiceScenarioCSV(rowCount = 800) {
  const n = Math.max(500, Math.min(1000, rowCount || 800));
  const lines = ['respondent_id,brand_choice,price_sensitivity,age_band,channel'];

  const brands = ['Brand A', 'Brand B', 'Brand C', 'Brand D'];
  const priceLevels = ['Low', 'Medium', 'High'];
  const ageBands = ['18-24', '25-34', '35-44', '45-54', '55+'];
  const channels = ['Email', 'Search', 'Social'];

  const softmax = scores => {
    const max = Math.max.apply(null, scores);
    const exps = scores.map(s => Math.exp(s - max));
    const sum = exps.reduce((acc, v) => acc + v, 0) || 1;
    return exps.map(v => v / sum);
  };

  const sampleCategory = probs => {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r <= cum) return i;
    }
    return probs.length - 1;
  };

  for (let i = 0; i < n; i++) {
    const respondentId = `R${String(i + 1).padStart(4, '0')}`;

    // Draw predictors
    const price_sensitivity = (() => {
      const r = Math.random();
      if (r < 0.3) return 'Low';
      if (r < 0.7) return 'Medium';
      return 'High';
    })();

    const age_band = (() => {
      const r = Math.random();
      if (r < 0.25) return '18-24';
      if (r < 0.5) return '25-34';
      if (r < 0.75) return '35-44';
      if (r < 0.9) return '45-54';
      return '55+';
    })();

    const channel = (() => {
      const r = Math.random();
      if (r < 0.4) return 'Search';
      if (r < 0.7) return 'Email';
      return 'Social';
    })();

    // Baseline brand scores (so A/B are slightly more common overall)
    let sA = 0.2;
    let sB = 0.1;
    let sC = -0.1;
    let sD = -0.3;

    // Price sensitivity effects
    if (price_sensitivity === 'Low') {
      sC += 0.4; // C seen as premium
      sD += 0.1;
    } else if (price_sensitivity === 'Medium') {
      sA += 0.2;
      sB += 0.2;
    } else if (price_sensitivity === 'High') {
      sA += 0.4; // A as value brand
      sB += 0.2;
    }

    // Age effects
    if (age_band === '18-24') {
      sC += 0.3;
    } else if (age_band === '25-34') {
      sA += 0.2;
      sC += 0.2;
    } else if (age_band === '45-54' || age_band === '55+') {
      sB += 0.2;
      sD += 0.3;
    }

    // Channel effects
    if (channel === 'Search') {
      sA += 0.2;
      sB += 0.2;
    } else if (channel === 'Email') {
      sB += 0.2;
      sD += 0.2;
    } else if (channel === 'Social') {
      sC += 0.2;
    }

    const probs = softmax([sA, sB, sC, sD]);
    const brandIndex = sampleCategory(probs);
    const brand_choice = brands[brandIndex];

    lines.push([respondentId, brand_choice, price_sensitivity, age_band, channel].join(','));
  }

  return lines.join('\n');
}

const PLACEHOLDER_SUMMARY_TEMPLATE = buildFunnelScenarioCSV();
const PLACEHOLDER_RAW_TEMPLATE = buildBrandChoiceScenarioCSV();

const PLACEHOLDER_SCENARIOS = [
  {
    id: 'scenario-1',
    label: 'Three-stage funnel stage (Awareness / Consideration / Purchase)',
    file: 'scenarios/funnel_stage.txt',
    datasetPath: 'scenarios/funnel_stage_data.csv'
  },
  {
    id: 'scenario-2',
    label: 'Four-brand choice (Brand A / B / C / D)',
    file: 'scenarios/brand_choice.txt',
    datasetPath: 'scenarios/brand_choice_data.csv'
  }
];


const DataEntryModes = {
  MANUAL: 'manual',
  SUMMARY: 'summary-upload',
  RAW: 'raw-upload'
};

let activeDataEntryMode = DataEntryModes.MANUAL;
let activeScenarioDataset = null;
let lastUploadedDataset = null;
const confidenceButtons = () => document.querySelectorAll('.confidence-button');

function formatAlphaValue(alpha) {
  if (!isFinite(alpha)) return '';
  const clamped = Math.min(0.25, Math.max(0.0005, alpha));
  if (clamped >= 0.1) return clamped.toFixed(2);
  if (clamped >= 0.01) return clamped.toFixed(3);
  return clamped.toFixed(4);
}

function applyAlphaValue(alpha) {
  const alphaInput = document.getElementById('alpha');
  if (!alphaInput) return;
  alphaInput.value = formatAlphaValue(alpha);
  reflectConfidenceButtons();
}

function reflectConfidenceButtons() {
  const alphaInput = document.getElementById('alpha');
  if (!alphaInput) return;
  const value = parseFloat(alphaInput.value);
  const targetLevel = isFinite(value) ? 1 - value : NaN;
  confidenceButtons().forEach(button => {
    const level = parseFloat(button.dataset.level);
    const isActive = isFinite(level) && Math.abs(level - targetLevel) < 1e-6;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function stampModified() {
  modifiedDate = new Date().toLocaleDateString();
  hydrateTimestamps();
}

document.addEventListener('DOMContentLoaded', () => {
  hydrateTimestamps();
  setupScenarioSelect();
  setupScenarioDownloadButton();
  setupAlphaInput();
  setupConfidenceButtons();
  setupDataEntryModeToggle();
  setupDataEntryUploads();
  setupMnlogDownloadResults();
  setupMnlogRunButton();
});

function hydrateTimestamps() {
  const created = document.getElementById('created-date');
  const modified = document.getElementById('modified-date');
  if (created) created.textContent = new Date(CREATED_DATE).toLocaleDateString();
  if (modified) modified.textContent = modifiedDate;
}

function setupScenarioSelect() {
  const select = document.getElementById('scenario-select');
  const description = document.getElementById('scenario-description');
  if (!select || !description) return;

  PLACEHOLDER_SCENARIOS.forEach(entry => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.label;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
  const selected = PLACEHOLDER_SCENARIOS.find(item => item.id === select.value);
  if (!selected) {
    // existing “no scenario” reset logic...
    updateScenarioDownload(null);
    return;
  }

  // 1) Load scenario text from .txt file
  if (window.fetch && selected.file) {
    fetch(selected.file, { cache: 'no-cache' })
      .then(resp => resp.ok ? resp.text() : Promise.reject())
      .then(text => {
        if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
          window.UIUtils.renderScenarioDescription({
            containerId: 'scenario-description',
            title: selected.label,
            description: text,
            defaultHtml: text
          });
        } else {
          description.innerHTML = text;
        }
      })
      .catch(() => {
        // fallback: keep any existing description
      });
  }

  // 2) Load CSV from scenarios folder and auto-populate dataset
  updateScenarioDownload({
    filename: selected.datasetPath || 'scenario.csv',
    content: '', // download button will fetch the file directly or you can leave as-is
    mimeType: 'text/csv'
  });

  if (window.fetch && selected.datasetPath) {
    const feedback = document.getElementById('template-raw-feedback');
    if (feedback) {
      feedback.textContent = 'Loading preset scenario dataset…';
      feedback.classList.remove('success', 'error');
    }

    fetch(selected.datasetPath, { cache: 'no-cache' })
      .then(resp => resp.ok ? resp.text() : Promise.reject())
      .then(text => {
        const { headers, rows } = parseMixedDelimitedText(text, MAX_UPLOAD_ROWS);
        lastUploadedDataset = { headers, rows };
        mnlogDataset = { headers, rows };
        if (typeof setDataEntryMode === 'function') {
          setDataEntryMode(DataEntryModes.RAW);
        }
        if (feedback) {
          feedback.textContent =
            `Loaded preset scenario dataset (${rows.length} row(s), ${headers.length} column(s)). Use the outcome selectors above to choose the multinomial outcome and reference level.`;
          feedback.classList.add('success');
        }
        populateOutcomeSelectors();
      })
      .catch(() => {
        if (feedback) {
          feedback.textContent = 'Unable to load preset scenario dataset from file.';
          feedback.classList.add('error');
        }
      });
  }
});

}

function setupConfidenceButtons() {
  const buttons = confidenceButtons();
  if (!buttons.length) return;
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const level = parseFloat(button.dataset.level);
      if (!isFinite(level)) return;
      applyAlphaValue(1 - level);
      buttons.forEach(btn => {
        const lvl = parseFloat(btn.dataset.level);
        const isActive = Math.abs(lvl - level) < 1e-6;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      stampModified();
    });
  });
  reflectConfidenceButtons();
}

function setupAlphaInput() {
  const alphaInput = document.getElementById('alpha');
  if (!alphaInput) return;
  alphaInput.addEventListener('change', () => {
    const value = parseFloat(alphaInput.value);
    if (!isFinite(value)) return;
    alphaInput.value = formatAlphaValue(value);
    reflectConfidenceButtons();
    stampModified();
  });
  const initialValue = parseFloat(alphaInput.value);
  if (isFinite(initialValue)) {
    alphaInput.value = formatAlphaValue(initialValue);
    reflectConfidenceButtons();
  }
}

function setupVisualSettings() {
  const toggle = document.getElementById('toggle-chart-mode');
  const select = document.getElementById('visual-mode');
  if (toggle) {
    toggle.addEventListener('change', () => {
      const note = document.querySelector('#chart-a + .chart-note');
      if (note) {
        note.textContent = toggle.checked
          ? 'Chart A currently simulates a default view.'
          : 'Chart A toggle disabled — update this text in template.js.';
      }
    });
  }
  if (select) {
    select.addEventListener('change', () => {
      const note = document.querySelector('#chart-b + .chart-note');
      if (note) {
        note.textContent = `Visualization mode switched to ${select.value}. Replace this logic once real charts exist.`;
      }
    });
  }
}

function setupMnlogRunButton() {
  const runButton = document.getElementById('mnlog-run-model');
  if (!runButton) return;
  runButton.addEventListener('click', event => {
    event.preventDefault();
    runMultinomialModel();
  });
}

function updateScenarioDownload(dataset) {
  const button = document.getElementById('scenario-download');
  activeScenarioDataset = dataset
    ? {
        filename: dataset.filename || 'scenario.csv',
        content: dataset.content || '',
        mimeType: dataset.mimeType || 'text/csv'
      }
    : null;
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

function setDataEntryMode(mode) {
  if (!Object.values(DataEntryModes).includes(mode)) {
    mode = DataEntryModes.MANUAL;
  }
  activeDataEntryMode = mode;
  document.querySelectorAll('.data-entry-card .mode-button').forEach(button => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.data-entry-card .mode-panel').forEach(panel => {
    const isActive = panel.dataset.mode === mode;
    panel.classList.toggle('active', isActive);
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
}

function setupDataEntryModeToggle() {
  const buttons = document.querySelectorAll('.data-entry-card .mode-button');
  if (!buttons.length) return;
  buttons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      setDataEntryMode(button.dataset.mode);
    });
  });
  setDataEntryMode(activeDataEntryMode);
}

function setupDataEntryUploads() {
  const initUpload = ({
    dropzoneId,
    inputId,
    browseId,
    feedbackId,
    templateId,
    templateContent,
    downloadName
  }) => {
    const feedback = document.getElementById(feedbackId);
    const templateButton = document.getElementById(templateId);

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

      // NEW: show a loading message right away
      setFeedback('Loading dataset…', '');

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result;
      const { headers, rows } = parseMixedDelimitedText(text, MAX_UPLOAD_ROWS);
      lastUploadedDataset = { headers, rows };
      mnlogDataset = { headers, rows };
      setFeedback(
        `Loaded ${rows.length} row(s) with ${headers.length} column(s). Use the outcome selectors above to choose a multinomial outcome and reference level.`,
        'success'
      );
      populateOutcomeSelectors();
    } catch (error) {
      setFeedback(error.message || 'Unable to parse file.', 'error');
    }
  };
  reader.onerror = () => setFeedback('Unable to read the file.', 'error');
  reader.readAsText(file);
};


    if (templateButton && templateContent) {
      templateButton.addEventListener('click', event => {
        event.preventDefault();
        downloadTextFile(downloadName, templateContent, { mimeType: 'text/csv' });
      });
    }

    if (window.UIUtils && typeof window.UIUtils.initDropzone === 'function') {
      window.UIUtils.initDropzone({
        dropzoneId,
        inputId,
        browseId,
        onFile: handleFile,
        onError: message => setFeedback(message, 'error')
      });
    }
  };

  initUpload({
    dropzoneId: 'template-summary-dropzone',
    inputId: 'template-summary-input',
    browseId: 'template-summary-browse',
    feedbackId: 'template-summary-feedback',
    templateId: 'template-summary-download',
    templateContent: PLACEHOLDER_SUMMARY_TEMPLATE,
    downloadName: 'summary_template.csv'
  });
  initUpload({
    dropzoneId: 'template-raw-dropzone',
    inputId: 'template-raw-input',
    browseId: 'template-raw-browse',
    feedbackId: 'template-raw-feedback',
    templateId: 'template-raw-download',
    templateContent: PLACEHOLDER_RAW_TEMPLATE,
    downloadName: 'raw_template.csv'
  });
}

function populateOutcomeSelectors() {
  const outcomeSelect = document.getElementById('mnlog-outcome-select');
  const refSelect = document.getElementById('mnlog-outcome-ref-select');
  if (!outcomeSelect || !refSelect) return;

  const { headers, rows } = mnlogDataset || {};
  outcomeSelect.innerHTML = '';
  refSelect.innerHTML = '';
  mnlogSelectedOutcome = null;
  mnlogOutcomeLevels = [];
  mnlogReferenceLevel = null;

  if (!Array.isArray(headers) || !headers.length || !Array.isArray(rows) || !rows.length) {
    return;
  }

  // Identify candidate outcome columns: categorical with at least 2 distinct levels
  const candidates = headers.filter(header => {
    const distinct = new Set();
    rows.forEach(row => {
      const value = row[headers.indexOf(header)];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        distinct.add(String(value));
      }
    });
    return distinct.size >= 2;
  });

  if (!candidates.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No suitable categorical outcome found';
    outcomeSelect.appendChild(opt);
    return;
  }

  candidates.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    outcomeSelect.appendChild(opt);
  });

  // Default to first candidate
  mnlogSelectedOutcome = candidates[0];
  outcomeSelect.value = mnlogSelectedOutcome;
  updateOutcomeLevelsForSelectedOutcome();
  populatePredictorList();

  outcomeSelect.addEventListener('change', () => {
    mnlogSelectedOutcome = outcomeSelect.value || null;
    updateOutcomeLevelsForSelectedOutcome();
    populatePredictorList();
    runMultinomialModel();
  });

  refSelect.addEventListener('change', () => {
    mnlogReferenceLevel = refSelect.value || null;
    runMultinomialModel();
  });
}

function updateOutcomeLevelsForSelectedOutcome() {
  const outcomeSelect = document.getElementById('mnlog-outcome-select');
  const refSelect = document.getElementById('mnlog-outcome-ref-select');
  if (!outcomeSelect || !refSelect) return;

  refSelect.innerHTML = '';
  mnlogOutcomeLevels = [];
  mnlogReferenceLevel = null;

  const { headers, rows } = mnlogDataset || {};
  if (!mnlogSelectedOutcome || !Array.isArray(headers) || !headers.length || !Array.isArray(rows) || !rows.length) {
    return;
  }

  const colIndex = headers.indexOf(mnlogSelectedOutcome);
  if (colIndex < 0) return;

  const levelCounts = new Map();
  rows.forEach(row => {
    const raw = row[colIndex];
    if (raw === null || raw === undefined) return;
    const value = String(raw).trim();
    if (!value) return;
    levelCounts.set(value, (levelCounts.get(value) || 0) + 1);
  });

  const levels = Array.from(levelCounts.keys());
  if (levels.length < 2) return;

  mnlogOutcomeLevels = levels;

  levels.forEach(level => {
    const opt = document.createElement('option');
    opt.value = level;
    opt.textContent = `${level} (${levelCounts.get(level)} obs)`;
    refSelect.appendChild(opt);
  });

  // Default reference: most frequent level
  levels.sort((a, b) => (levelCounts.get(b) || 0) - (levelCounts.get(a) || 0));
  mnlogReferenceLevel = levels[0];
  refSelect.value = mnlogReferenceLevel;
}

function populatePredictorList() {
  const container = document.getElementById('mnlog-predictor-list');
  if (!container) return;

  container.innerHTML = '';
  mnlogSelectedPredictors = [];
  mnlogPredictorSettings = {};

  const { headers, rows } = mnlogDataset || {};
  if (!Array.isArray(headers) || !headers.length || !Array.isArray(rows) || !rows.length) {
    container.innerHTML = '<p class="muted">Upload raw data to choose predictors.</p>';
    return;
  }

  if (!mnlogSelectedOutcome) {
    container.innerHTML = '<p class="muted">Select an outcome before choosing predictors.</p>';
    return;
  }

  const sampleSize = Math.min(rows.length, 200);

  headers.forEach(header => {
  if (header === mnlogSelectedOutcome) return;

  const colIndex = headers.indexOf(header);
  const sampleSize = Math.min(rows.length, 200);
  const seenValues = new Set();
  let numericCandidate = true;

  for (let i = 0; i < sampleSize; i++) {
    const row = rows[i];
    const raw = row[colIndex];
    if (raw === null || raw === undefined || String(raw).trim() === '') continue;
    const value = String(raw).trim();
    seenValues.add(value);
    const num = parseFloat(value);
    if (!Number.isFinite(num)) {
      numericCandidate = false;
    }
  }

  const uniqueCount = seenValues.size;
  const isText = !numericCandidate;
  const canTreatAsCategorical = true; // always
  const canTreatAsContinuous = numericCandidate && uniqueCount <= 10;

  const wrapper = document.createElement('div');
  wrapper.className = 'predictor-row';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'predictor-toggle';
  checkbox.value = header;
  checkbox.checked = false; // default: user must opt in

  const label = document.createElement('span');
  label.className = 'predictor-label';

  if (isText || uniqueCount > 1) {
    label.textContent = `${header} (${uniqueCount} distinct value${uniqueCount === 1 ? '' : 's'})`;
  } else {
    label.textContent = header;
  }

  const typeSelect = document.createElement('select');
  typeSelect.className = 'predictor-type-select';

  const optCont = document.createElement('option');
  optCont.value = 'continuous';
  optCont.textContent = 'Continuous';

  const optCat = document.createElement('option');
  optCat.value = 'categorical';
  optCat.textContent = 'Categorical';

  // Allowed type options
  if (isText || !canTreatAsContinuous) {
    // Text or many unique values: categorical only
    typeSelect.appendChild(optCat);
    typeSelect.value = 'categorical';
  } else {
    // Numeric with <= 10 unique values: allow both
    typeSelect.appendChild(optCont);
    typeSelect.appendChild(optCat);
    typeSelect.value = 'continuous';
  }

  // Initially disable the dropdown until the box is checked
  typeSelect.disabled = !checkbox.checked;

  wrapper.appendChild(checkbox);
  wrapper.appendChild(label);
  wrapper.appendChild(typeSelect);
  container.appendChild(wrapper);

  // Track settings only when included
  if (checkbox.checked) {
    mnlogSelectedPredictors.push(header);
    mnlogPredictorSettings[header] = { type: typeSelect.value };
  }

  checkbox.addEventListener('change', () => {
    const name = checkbox.value;
    typeSelect.disabled = !checkbox.checked;
    if (checkbox.checked) {
      if (!mnlogSelectedPredictors.includes(name)) {
        mnlogSelectedPredictors.push(name);
      }
      mnlogPredictorSettings[name] = { type: typeSelect.value };
    } else {
      mnlogSelectedPredictors = mnlogSelectedPredictors.filter(p => p !== name);
    }
  });

  typeSelect.addEventListener('change', () => {
    const name = checkbox.value;
    if (!checkbox.checked) return;
    mnlogPredictorSettings[name] = mnlogPredictorSettings[name] || {};
    mnlogPredictorSettings[name].type = typeSelect.value;
  });
});


  if (!mnlogSelectedPredictors.length) {
    container.insertAdjacentHTML(
      'beforeend',
      '<p class="muted">No predictors selected yet. Check at least one box above to include it in the model.</p>'
    );
  }

  runMultinomialModel();
}

function buildDesignMatrixAndResponse() {
  const { headers, rows } = mnlogDataset || {};
  if (!Array.isArray(headers) || !headers.length || !Array.isArray(rows) || !rows.length) {
    return null;
  }
  if (!mnlogSelectedOutcome || !mnlogOutcomeLevels.length || !mnlogSelectedPredictors.length) {
    return null;
  }

  const outcomeIndex = headers.indexOf(mnlogSelectedOutcome);
  if (outcomeIndex < 0) return null;

  const classLabels = mnlogOutcomeLevels.slice();
  const classIndexMap = new Map(classLabels.map((lab, idx) => [lab, idx]));
  const referenceIndex = classLabels.indexOf(mnlogReferenceLevel);

  const predictorInfo = [];
  const usedColumns = new Map();

  mnlogSelectedPredictors.forEach(name => {
    const type = mnlogPredictorSettings[name]?.type || 'continuous';
    const colIndex = headers.indexOf(name);
    if (colIndex < 0) return;
    usedColumns.set(name, colIndex);
    if (type === 'categorical') {
      const levelCounts = new Map();
      rows.forEach(row => {
        const raw = row[colIndex];
        if (raw === null || raw === undefined) return;
        const value = String(raw).trim();
        if (!value) return;
        levelCounts.set(value, (levelCounts.get(value) || 0) + 1);
      });
      const levels = Array.from(levelCounts.keys());
      if (!levels.length) return;
      levels.sort((a, b) => (levelCounts.get(b) || 0) - (levelCounts.get(a) || 0));
      const refLevel = levels[0];
      predictorInfo.push({ name, type: 'categorical', levels, refLevel });
    } else {
      predictorInfo.push({ name, type: 'continuous' });
    }
  });

  const X = [];
  const y = [];
  const rowIndices = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const yRaw = row[outcomeIndex];
    if (yRaw === null || yRaw === undefined) continue;
    const yVal = String(yRaw).trim();
    if (!classIndexMap.has(yVal)) continue;
    const yi = classIndexMap.get(yVal);

    const xRow = [1]; // intercept
    let valid = true;

    predictorInfo.forEach(info => {
      if (!valid) return;
      const idx = usedColumns.get(info.name);
      const raw = row[idx];
      if (raw === null || raw === undefined) {
        valid = false;
        return;
      }
      if (info.type === 'continuous') {
        const num = parseFloat(raw);
        if (!Number.isFinite(num)) {
          valid = false;
          return;
        }
        xRow.push(num);
      } else {
        const value = String(raw).trim();
        info.levels.forEach(level => {
          if (level === info.refLevel) return;
          xRow.push(value === level ? 1 : 0);
        });
      }
    });

    if (!valid) continue;
    X.push(xRow);
    y.push(yi);
    rowIndices.push(i);
  }

  if (!X.length || !y.length) return null;

  // Compute column means for effect-plot defaults (excluding intercept)
  const p = X[0].length;
  const colMeans = new Array(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    const row = X[i];
    for (let j = 0; j < p; j++) {
      colMeans[j] += row[j];
    }
  }
  for (let j = 0; j < p; j++) {
    colMeans[j] /= X.length;
  }

  return { X, y, classLabels, referenceIndex, predictorInfo, colMeans, rowIndices };
}

function runMultinomialModel() {
  const statusEl = document.getElementById('mnlog-run-status');
  if (statusEl) statusEl.textContent = '';
  if (typeof MNLogit === 'undefined' || !MNLogit.fit) {
    if (statusEl) statusEl.textContent = 'Model engine not available in this browser.';
    return;
  }

  const design = buildDesignMatrixAndResponse();
  if (!design) {
    if (statusEl) {
      statusEl.textContent = 'Upload data, choose an outcome and reference category, and select at least one predictor before running the model.';
    }
    return;
  }

  try {
    const fitResult = MNLogit.fit({
      X: design.X,
      y: design.y,
      classLabels: design.classLabels,
      referenceIndex: design.referenceIndex,
      maxIter: 200,
      stepSize: 0.2,
      l2: 1e-4,
      tol: 1e-5
    });

    mnlogLastModel = fitResult;
    mnlogLastDesign = design;
    if (statusEl) {
      statusEl.textContent = `Fitted multinomial model on ${design.X.length} observation(s) with ${design.classLabels.length} outcome categories.`;
    }
    updateMnlogResultsPanels(design, fitResult);
    updateMnlogDiagnostics(design);
    renderMnlogEffectChart();
  } catch (error) {
    if (statusEl) statusEl.textContent = error.message || 'Unable to fit multinomial model.';
  }
}

function renderMnlogEffectChart() {
  const container = document.getElementById('chart-a');
  if (!container || !window.Plotly || !mnlogLastModel || !mnlogLastDesign) return;

  const { X, classLabels, referenceIndex, predictorInfo, colMeans } = mnlogLastDesign;
  const coeffs = mnlogLastModel.coefficients;
  const note = document.getElementById('mnlog-effect-note');

  // Choose first continuous predictor as focal
  const focal = predictorInfo.find(info => info.type === 'continuous');
  if (!focal) {
    container.innerHTML = '<p class="chart-note">Include at least one continuous predictor to see probability curves.</p>';
    if (note) note.textContent = 'The effect plot is only available when at least one continuous predictor is included.';
    return;
  }

  // Determine column index of focal predictor in design matrix
  // X columns: [intercept, all continuous, all dummies...]
  let colIndex = 1;
  for (const info of predictorInfo) {
    if (info.name === focal.name) {
      break;
    }
    if (info.type === 'continuous') {
      colIndex += 1;
    } else {
      colIndex += Math.max(0, (info.levels || []).length - 1);
    }
  }

  const focalValues = X.map(row => row[colIndex]);
  const minVal = Math.min.apply(null, focalValues);
  const maxVal = Math.max.apply(null, focalValues);
  if (!Number.isFinite(minVal) || !Number.isFinite(maxVal) || minVal === maxVal) {
    container.innerHTML = '<p class="chart-note">Unable to determine a range for the focal predictor.</p>';
    return;
  }

  const gridSize = 40;
  const grid = [];
  for (let i = 0; i < gridSize; i++) {
    const t = i / (gridSize - 1);
    grid.push(minVal + t * (maxVal - minVal));
  }

  const designGrid = grid.map(value => {
    const row = colMeans.slice();
    row[0] = 1;
    row[colIndex] = value;
    return row;
  });

  const probs = MNLogit.predict({
    X: designGrid,
    coefficients: coeffs,
    referenceIndex
  });

  container.classList.remove('chart-placeholder');
  container.style.minHeight = '320px';

  const traces = [];
  for (let k = 0; k < classLabels.length; k++) {
    if (k === referenceIndex) continue;
    traces.push({
      x: grid,
      y: probs.map(row => row[k]),
      mode: 'lines',
      type: 'scatter',
      name: classLabels[k]
    });
  }

  const layout = {
    margin: { t: 30, r: 10, b: 50, l: 60 },
    xaxis: { title: focal.name },
    yaxis: { title: 'Predicted probability', range: [0, 1] },
    legend: { orientation: 'h', x: 0, y: 1.1 }
  };

  Plotly.newPlot(container, traces, layout, { responsive: true, displaylogo: false });

  if (note) {
    note.textContent =
      `Each line shows the predicted probability of an outcome category (relative to reference "${mnlogReferenceLevel}") ` +
      `as ${focal.name} varies, holding other predictors at typical values.`;
  }
}

function updateMnlogResultsPanels(design, fitResult) {
  if (!design || !fitResult) return;
  const statEl = document.getElementById('statistic-value');
  const dfEl = document.getElementById('df-value');
  const pEl = document.getElementById('p-value');
  const effectEl = document.getElementById('effect-size');
  const apaEl = document.getElementById('apa-report');
  const mgrEl = document.getElementById('managerial-report');

  const { X, y, classLabels } = design;
  const coeffs = fitResult.coefficients;
  if (!X || !y || !classLabels || !coeffs) return;

  const n = X.length;
  const K = classLabels.length;
  const p = X[0]?.length || 0;

  // Model log-likelihood
  const probs = MNLogit.predict({
    X,
    coefficients: coeffs,
    referenceIndex: design.referenceIndex
  });
  let logLik = 0;
  for (let i = 0; i < n; i++) {
    const yi = y[i];
    const rowProbs = probs[i] || [];
    const pObs = rowProbs[yi] || 1e-12;
    logLik += Math.log(pObs);
  }

  // Null log-likelihood using marginal outcome frequencies
  const counts = new Array(K).fill(0);
  y.forEach(idx => {
    if (idx >= 0 && idx < K) counts[idx]++;
  });
  const nullProbs = counts.map(c => (c > 0 ? c / n : 1e-12));
  let logLikNull = 0;
  for (let i = 0; i < n; i++) {
    const yi = y[i];
    const pNull = nullProbs[yi] || 1e-12;
    logLikNull += Math.log(pNull);
  }

  const pseudoR2 = 1 - logLik / logLikNull;
  const df = (K - 1) * p;

  if (statEl) statEl.textContent = logLik.toFixed(2);
  if (dfEl) dfEl.textContent = Number.isFinite(df) ? String(df) : 'n/a';
  if (pEl) pEl.textContent = 'n/a';
  if (effectEl) effectEl.textContent = Number.isFinite(pseudoR2) ? pseudoR2.toFixed(3) : 'n/a';

  const alphaInput = document.getElementById('alpha');
  const alpha = alphaInput ? parseFloat(alphaInput.value) : NaN;
  const alphaText = Number.isFinite(alpha) ? alpha.toFixed(3) : '0.050';

  const outcomeName = mnlogSelectedOutcome || 'outcome';
  const predictorsDesc = mnlogSelectedPredictors.length
    ? mnlogSelectedPredictors.join(', ')
    : 'no predictors';

  if (apaEl) {
    apaEl.textContent =
      `A multinomial logistic regression was fitted predicting ${outcomeName} with ${K} outcome categories ` +
      `from ${mnlogSelectedPredictors.length} predictor(s) (N = ${n}). ` +
      `Model log-likelihood was ${logLik.toFixed(2)}, McFadden pseudo-R² = ${Number.isFinite(pseudoR2) ? pseudoR2.toFixed(3) : 'n/a'}. ` +
      `Formal hypothesis tests and confidence intervals at α = ${alphaText} are not yet implemented in this prototype.`;
  }

  if (mgrEl) {
    const refOutcome = mnlogReferenceLevel || (classLabels[design.referenceIndex] ?? '');
    const catPredictors = (design.predictorInfo || []).filter(info => info.type === 'categorical');
    const refDetails = catPredictors.length
      ? ' For categorical predictors, the following reference levels were used: ' +
        catPredictors
          .map(info => `${info.name} = "${info.refLevel}"`)
          .join('; ') +
        '.'
      : '';

    mgrEl.textContent =
      `This model estimates how the predictors (${predictorsDesc}) shift the probability of each outcome category ` +
      `relative to the reference outcome "${refOutcome}". ` +
      `Use the probability curves and downloaded predictions to compare which categories are most likely under different predictor values.` +
      refDetails;
  }

  renderMnlogCoefficientTable(design, fitResult);
}

function updateMnlogDiagnostics(design) {
  const diagContainer = document.getElementById('diagnostics-content');
  if (!diagContainer || !design) return;

  const totalRows = Array.isArray(mnlogDataset.rows) ? mnlogDataset.rows.length : 0;
  const usedRows = Array.isArray(design.X) ? design.X.length : 0;
  const dropped = totalRows - usedRows;

  const classCounts = new Map();
  const labels = design.classLabels || [];
  (design.y || []).forEach(idx => {
    const label = labels[idx] ?? String(idx);
    classCounts.set(label, (classCounts.get(label) || 0) + 1);
  });

  const rowsHtml = Array.from(classCounts.entries())
    .map(([label, count]) => {
      const pct = usedRows ? ((count / usedRows) * 100).toFixed(1) : '0.0';
      return `<li>${label}: ${count} (${pct}% of modeled observations)</li>`;
    })
    .join('');

  const droppedHtml =
    dropped > 0
      ? `<p><strong>Row screening:</strong> ${dropped} of ${totalRows} uploaded row(s) were excluded because of missing or invalid values in the outcome or selected predictors.</p>`
      : `<p><strong>Row screening:</strong> All ${usedRows} uploaded row(s) were used in the model.</p>`;

  diagContainer.innerHTML =
    droppedHtml +
    `<p><strong>Outcome balance (modeled data only):</strong></p>` +
    `<ul>${rowsHtml}</ul>` +
    `<p>Very small categories or highly unbalanced outcomes can make multinomial estimates unstable. Consider combining very rare categories when appropriate.</p>`;
}

function renderMnlogCoefficientTable(design, fitResult) {
  const tableBody =
    document.querySelector('.summary-table-card .summary-table tbody');
  if (!tableBody || !design || !fitResult) return;

  const { classLabels, referenceIndex, predictorInfo } = design;
  const coeffs = fitResult.coefficients;
  if (!Array.isArray(classLabels) || !Array.isArray(coeffs)) return;

  const K = classLabels.length;
  const beta = coeffs;
  if (!beta.length || !beta[0] || !Array.isArray(beta[0])) return;

  const p = beta[0].length;

  // Build term labels matching the column order in X
  const termLabels = [];
  termLabels.push('(Intercept)');
  (predictorInfo || []).forEach(info => {
    if (info.type === 'continuous') {
      termLabels.push(info.name);
    } else if (info.type === 'categorical') {
      const levels = info.levels || [];
      levels.forEach(level => {
        if (level === info.refLevel) return;
        termLabels.push(`${info.name} = ${level}`);
      });
    }
  });

  if (termLabels.length !== p) {
    // Fallback: basic row stating mismatch
    tableBody.innerHTML =
      '<tr><td colspan="3">Unable to map coefficients to predictor terms. Please re-run the model or contact the tool maintainer.</td></tr>';
    return;
  }

  let rowsHtml = '';
  for (let k = 0; k < K; k++) {
    if (k === referenceIndex) continue;
    const outcomeLabel = `${classLabels[k]} vs ${classLabels[referenceIndex] ?? 'reference'}`;
    const rowCoeffs = beta[k] || [];
    for (let j = 0; j < p; j++) {
      const coef = rowCoeffs[j];
      const display =
        Number.isFinite(coef) ? coef.toFixed(3) : '0.000';
      rowsHtml +=
        `<tr>` +
        `<td>${outcomeLabel}</td>` +
        `<td>${termLabels[j]}</td>` +
        `<td>${display}</td>` +
        `</tr>`;
    }
  }

  if (!rowsHtml) {
    tableBody.innerHTML =
      '<tr><td colspan="3">No coefficients available to display.</td></tr>';
  } else {
    tableBody.innerHTML = rowsHtml;
  }
}

function setupMnlogDownloadResults() {
  const button = document.getElementById('mnlog-download-results');
  if (!button) return;

  button.addEventListener('click', event => {
    event.preventDefault();
    if (!mnlogLastModel || !mnlogLastDesign) {
      alert('Run the multinomial model before downloading predicted probabilities.');
      return;
    }
    const dataset = mnlogDataset;
    if (!dataset || !Array.isArray(dataset.headers) || !Array.isArray(dataset.rows) || !dataset.rows.length) {
      alert('Upload a CSV in the summary or raw panels before downloading results.');
      return;
    }

    const { headers, rows } = dataset;
    const { X, classLabels, referenceIndex, rowIndices } = mnlogLastDesign;
    const coeffs = mnlogLastModel.coefficients;
    if (!X || !classLabels || !coeffs || !Array.isArray(rowIndices)) {
      alert('Model details are incomplete. Re-run the model and try again.');
      return;
    }

    const probs = MNLogit.predict({
      X,
      coefficients: coeffs,
      referenceIndex
    });

    const probByRowIndex = new Map();
    rowIndices.forEach((rowIdx, i) => {
      probByRowIndex.set(rowIdx, probs[i]);
    });

    const sanitizeLabel = label =>
      String(label)
        .trim()
        .replace(/\s+/g, '_')
        .replace(/,/g, '');

    const extraHeaders = ['predicted_class'].concat(
      classLabels.map(lab => `p_hat_${sanitizeLabel(lab)}`)
    );
    const allHeaders = headers.concat(extraHeaders);

    const lines = [];
    lines.push(allHeaders.join(','));

    for (let i = 0; i < rows.length; i++) {
      const baseRow = rows[i].map(value => (value == null ? '' : String(value)));
      const probVec = probByRowIndex.get(i);
      if (!probVec) {
        const blanks = new Array(extraHeaders.length).fill('');
        lines.push(baseRow.concat(blanks).join(','));
      } else {
        let bestIdx = 0;
        let bestProb = probVec[0];
        for (let k = 1; k < probVec.length; k++) {
          if (probVec[k] > bestProb) {
            bestProb = probVec[k];
            bestIdx = k;
          }
        }
        const predictedClass = classLabels[bestIdx] ?? '';
        const probCols = probVec.map(p => (Number.isFinite(p) ? p.toFixed(4) : ''));
        lines.push(baseRow.concat([predictedClass], probCols).join(','));
      }
    }

    downloadTextFile('mnlog_predicted_probabilities.csv', lines.join('\n'), { mimeType: 'text/csv' });
  });
}

// Simple mixed-type CSV/TSV parser for multinomial logistic regression.
// Keeps cell values as strings (no numeric coercion) and enforces a row limit.
function parseMixedDelimitedText(text, maxRows) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new Error('File is empty.');
  }
  const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length);
  if (lines.length < 2) {
    throw new Error('File must include a header row and at least one data row.');
  }

  const delimiter = typeof detectDelimiter === 'function' ? detectDelimiter(lines[0]) : (lines[0].includes('\t') ? '\t' : ',');
  const headers = lines[0].split(delimiter).map(h => h.trim());
  if (headers.length < 2) {
    throw new Error('Provide at least two columns with headers.');
  }

  const rows = [];
  const limit = typeof maxRows === 'number' && maxRows > 0 ? maxRows : MAX_UPLOAD_ROWS;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delimiter);
    if (parts.every(part => part.trim() === '')) {
      continue;
    }
    if (parts.length !== headers.length) {
      // Skip malformed row but keep going.
      continue;
    }
    rows.push(parts.map(part => part.trim()));
    if (rows.length > limit) {
      throw new Error(
        `Upload limit exceeded: Only ${limit} row(s) are supported per file. ` +
        'Split the dataset before re-uploading.'
      );
    }
  }

  if (!rows.length) {
    throw new Error('No data rows found after the header.');
  }

  return { headers, rows };
}


function renderPlaceholderFanChart() {
  if (!window.FanChartUtils) {
    return;
  }
  const container = document.getElementById('chart-a');
  if (!container) {
    return;
  }
  container.classList.remove('chart-placeholder');
  container.style.minHeight = '320px';
  const groups = [
    { id: 'group-a', value: 0.32, label: 'Group A', tickLabel: 'Group A (n=450)' },
    { id: 'group-b', value: 0.41, label: 'Group B', tickLabel: 'Group B (n=460)' }
  ];
  const intervals = {
    'group-a': {
      0.5: { lower: 0.30, upper: 0.34 },
      0.8: { lower: 0.29, upper: 0.35 },
      0.95: { lower: 0.27, upper: 0.36 }
    },
    'group-b': {
      0.5: { lower: 0.39, upper: 0.43 },
      0.8: { lower: 0.37, upper: 0.45 },
      0.95: { lower: 0.35, upper: 0.47 }
    }
  };

  FanChartUtils.renderHorizontalFanChart({
    containerId: 'chart-a',
    groups,
    intervals,
    confidenceLevels: [0.5, 0.8, 0.95],
    xTitle: 'Placeholder metric',
    axisRange: [0.2, 0.55],
    referenceLine: {
      value: 0.33,
      label: 'Reference',
      style: { color: '#777', dash: 'dot', width: 1 }
    },
    valueFormatter: value => (value * 100).toFixed(1) + '%',
    ariaLabel: 'Example fan chart showing how the shared helper renders confidence bands.'
  });
}

function renderPlaceholderStackedChart() {
  if (!window.StackedChartUtils) {
    return;
  }
  const container = document.getElementById('chart-b');
  if (!container) {
    return;
  }
  container.classList.remove('chart-placeholder');
  container.style.minHeight = '320px';
  container.innerHTML = '';

  const chartHost = document.createElement('div');
  chartHost.style.minHeight = '280px';
  container.appendChild(chartHost);
  const legendHost = document.createElement('div');
  legendHost.className = 'legend-host';
  container.appendChild(legendHost);

  const bars = [
    { label: 'Control', segments: [180, 120, 60] },
    { label: 'Variant A', segments: [150, 140, 70] },
    { label: 'Variant B', segments: [130, 160, 90] }
  ];
  const stackLabels = ['Engaged', 'Neutral', 'Churn-risk'];

  StackedChartUtils.renderStacked100Chart({
    container: chartHost,
    legend: legendHost,
    bars,
    stackLabels,
    axisLabels: { bars: 'Segments', stacks: 'Outcomes' }
  });
}

// Multinomial-specific visual helpers
function renderMnlogOutcomeDistributionChart() {
  const container = document.getElementById('chart-b');
  if (!container || !window.Plotly) return;

  if (!mnlogLastDesign || !mnlogLastModel) {
    container.classList.remove('chart-placeholder');
    container.innerHTML =
      '<p class="chart-note">Run the multinomial model to view observed vs predicted outcome distribution.</p>';
    return;
  }

  const { X, y, classLabels, referenceIndex } = mnlogLastDesign;
  const coeffs = mnlogLastModel.coefficients;
  if (!Array.isArray(X) || !X.length || !Array.isArray(y) || !Array.isArray(classLabels) || !coeffs) {
    return;
  }

  const n = X.length;
  const K = classLabels.length;

  const obsCounts = new Array(K).fill(0);
  y.forEach(idx => {
    if (idx >= 0 && idx < K) {
      obsCounts[idx] += 1;
    }
  });

  const probs = MNLogit.predict({
    X,
    coefficients: coeffs,
    referenceIndex
  });
  const predSums = new Array(K).fill(0);
  probs.forEach(row => {
    row.forEach((p, k) => {
      if (Number.isFinite(p)) {
        predSums[k] += p;
      }
    });
  });
  const predAvg = predSums.map(sum => (n ? sum / n : 0));

  const toggle = document.getElementById('toggle-chart-mode');
  const showPredicted = !toggle || toggle.checked;

  const select = document.getElementById('visual-mode');
  const modeValue = select ? select.value : 'rows';
  const useProportion = modeValue === 'columns' || modeValue === 'proportion';

  const obsValues = useProportion
    ? obsCounts.map(c => (n ? c / n : 0))
    : obsCounts.slice();
  const predValues = useProportion
    ? predAvg
    : predAvg.map(p => p * n);

  const traces = [
    {
      x: classLabels,
      y: obsValues,
      name: 'Observed',
      type: 'bar'
    }
  ];

  if (showPredicted) {
    traces.push({
      x: classLabels,
      y: predValues,
      name: 'Predicted',
      type: 'bar',
      marker: { opacity: 0.8 }
    });
  }

  container.classList.remove('chart-placeholder');
  container.innerHTML = '';

  const layout = {
    barmode: showPredicted ? 'group' : 'relative',
    margin: { t: 30, r: 10, b: 60, l: 60 },
    xaxis: { title: mnlogSelectedOutcome || 'Outcome category' },
    yaxis: {
      title: useProportion ? 'Proportion of modeled sample' : 'Count',
      rangemode: 'tozero'
    },
    legend: { orientation: 'h', x: 0, y: 1.1 }
  };

  Plotly.newPlot(container, traces, layout, { responsive: true, displaylogo: false });
}

function setupMnlogVisualSettings() {
  const toggle = document.getElementById('toggle-chart-mode');
  const select = document.getElementById('visual-mode');
  const rerender = () => renderMnlogOutcomeDistributionChart();
  if (toggle) {
    toggle.addEventListener('change', rerender);
  }
  if (select) {
    select.addEventListener('change', rerender);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupMnlogVisualSettings();
  const runButton = document.getElementById('mnlog-run-model');
  if (runButton) {
    runButton.addEventListener('click', () => {
      // Re-render distribution chart after each model run.
      setTimeout(renderMnlogOutcomeDistributionChart, 0);
    });
  }
});
