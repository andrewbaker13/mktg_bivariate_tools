// Multinomial Logistic Regression Tool controller (initial wiring)
const CREATED_DATE = '2025-11-15';
// Reuse shared upload cap if provided; otherwise default to 5,000 rows.
const MNLOG_UPLOAD_LIMIT =
  typeof window !== 'undefined' && typeof window.MAX_UPLOAD_ROWS === 'number'
    ? window.MAX_UPLOAD_ROWS
    : 5000;
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
let mnlogEffectState = { focal: null, catLevels: {}, continuousOverrides: {} };
let mnlogEffectFocal = null;
let mnlogRangeMode = 'sd';
let mnlogCustomRange = { min: null, max: null };
const mnlogSummaryMessage = 'Provide data to see summary statistics.';

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
  },
  {
    id: 'scenario-3',
    label: 'Esports engagement segments (Casual / Core / Competitive)',
    file: 'scenarios/esports_engagement.txt',
    datasetPath: 'scenarios/esports_engagement_data.csv'
  },
  {
    id: 'scenario-4',
    label: 'Single continuous predictor (idealized convergence)',
    file: 'scenarios/single_continuous.txt',
    datasetPath: 'scenarios/single_continuous_data.csv'
  }
];


const DataEntryModes = {
  RAW: 'raw-upload'
};

let activeDataEntryMode = DataEntryModes.RAW;
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyAlphaValue(alpha) {
  const alphaInput = document.getElementById('alpha');
  if (!alphaInput) return;
  alphaInput.value = formatAlphaValue(alpha);
  reflectConfidenceButtons();
}

function showMnlogLoading() {
  const overlay = document.getElementById('mnlog-loading-overlay');
  if (overlay) overlay.classList.add('active');
  const runButton = document.getElementById('mnlog-run-model');
  if (runButton && !runButton.classList.contains('is-running')) {
    runButton.classList.add('is-running');
    runButton.disabled = true;
    runButton.dataset.originalLabel = runButton.textContent || 'Run multinomial model';
    runButton.innerHTML =
      '<span class="btn-spinner" aria-hidden="true"></span><span class="btn-label">Running...</span>';
  }
}

function hideMnlogLoading() {
  const overlay = document.getElementById('mnlog-loading-overlay');
  if (overlay) overlay.classList.remove('active');
  const runButton = document.getElementById('mnlog-run-model');
  if (runButton && runButton.classList.contains('is-running')) {
    runButton.classList.remove('is-running');
    runButton.disabled = false;
    const original = runButton.dataset.originalLabel || 'Run multinomial model';
    runButton.textContent = original;
    delete runButton.dataset.originalLabel;
  }
}

function setMnlogPlaceholders(message = 'Run the multinomial model to see results.') {
  const coeffBody = document.querySelector('.summary-table-card .summary-table tbody');
  const equationEl = document.getElementById('mnlog-regression-equation');
  const numBody = document.getElementById('mnlog-numeric-summary-body');
  const catBody = document.getElementById('mnlog-categorical-summary-body');
  if (coeffBody) coeffBody.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
  if (equationEl) equationEl.textContent = message;
  if (numBody) numBody.innerHTML = `<tr><td colspan="6">${mnlogSummaryMessage}</td></tr>`;
  if (catBody) catBody.innerHTML = `<tr><td colspan="3">${mnlogSummaryMessage}</td></tr>`;
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
  setupEffectChartCategorySelect();
  setupEffectFocalSelect();
  setupRangeControls();
  setMnlogPlaceholders();
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
  if (window.fetch && selected.datasetPath) {
    const feedback = document.getElementById('template-raw-feedback');
    if (feedback) {
      feedback.textContent = 'Loading preset scenario dataset…';
      feedback.classList.remove('success', 'error');
    }

    fetch(selected.datasetPath, { cache: 'no-cache' })
      .then(resp => resp.ok ? resp.text() : Promise.reject())
      .then(text => {
        const { headers, rows } = parseMixedDelimitedText(text, MNLOG_UPLOAD_LIMIT);
        lastUploadedDataset = { headers, rows };
        mnlogDataset = { headers, rows };
        const filename =
          (selected.datasetPath && selected.datasetPath.split(/[\\/]/).pop()) ||
          'scenario.csv';
        updateScenarioDownload({
          filename,
          content: text,
          mimeType: 'text/csv'
        });
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

function setupEffectChartCategorySelect() {
  const select = document.getElementById('effect-chart-category-select');
  if (!select) return;

  select.addEventListener('change', () => {
    renderMnlogEffectChart();
  });
}

function setupEffectFocalSelect() {
  const select = document.getElementById('mnlog-focal-select');
  if (!select) return;
  select.innerHTML = '';
  select.addEventListener('change', () => {
    mnlogEffectFocal = select.value || null;
    renderMnlogEffectControls();
    toggleRangeControlsVisibility();
    renderMnlogEffectChart();
  });
}

function setupRangeControls() {
  const radios = document.querySelectorAll('input[name="mnlog-range"]');
  const wrapper = document.getElementById('mnlog-custom-range-wrapper');
  const minInput = document.getElementById('mnlog-range-min');
  const maxInput = document.getElementById('mnlog-range-max');
  radios.forEach(r => {
    r.addEventListener('change', () => {
      mnlogRangeMode = r.value;
      if (wrapper) wrapper.style.display = mnlogRangeMode === 'custom' ? 'inline-flex' : 'none';
      renderMnlogEffectChart();
    });
  });
  [minInput, maxInput].forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => {
      mnlogCustomRange = {
        min: parseFloat(minInput?.value),
        max: parseFloat(maxInput?.value)
      };
      renderMnlogEffectChart();
    });
  });
}

function toggleRangeControlsVisibility() {
  const rangeControls = document.getElementById('mnlog-range-controls');
  if (!rangeControls || !mnlogLastDesign) return;
  const focal =
    (mnlogLastDesign.predictorInfo || []).find(info => info.name === mnlogEffectFocal) ||
    (mnlogLastDesign.predictorInfo || []).find(info => info.type === 'continuous');
  const show = focal && focal.type === 'continuous';
  rangeControls.style.display = show ? '' : 'none';
}

function populateEffectFocalSelect() {
  const select = document.getElementById('mnlog-focal-select');
  if (!select || !mnlogLastDesign) return;
  const { predictorInfo } = mnlogLastDesign;
  const candidates = predictorInfo || [];
  select.innerHTML = '';
  candidates.forEach(info => {
    const opt = document.createElement('option');
    opt.value = info.name;
    opt.textContent = info.name;
    opt.dataset.type = info.type;
    select.appendChild(opt);
  });
  const match = candidates.find(p => p.name === mnlogEffectFocal);
  if (match) {
    select.value = mnlogEffectFocal;
  } else {
    mnlogEffectFocal = candidates[0]?.name || null;
    if (mnlogEffectFocal) select.value = mnlogEffectFocal;
  }
  toggleRangeControlsVisibility();
}

function computeHoldValuesForEffect(design, focalName) {
  const { predictorInfo, predictorStats } = design;
  const holdValues = {};
  (predictorInfo || []).forEach(info => {
    if (info.name === focalName) return;
    if (info.type === 'continuous') {
      const stats = predictorStats?.[info.name] || {};
      const override = mnlogEffectState.continuousOverrides[info.name];
      const value = Number.isFinite(override) ? override : stats.mean;
      holdValues[info.name] = value;
    } else if (info.type === 'categorical') {
      const levels = info.levels || [];
      const override = mnlogEffectState.catLevels[info.name];
      const mode = predictorStats?.[info.name]?.mode;
      let chosen = levels.includes(override) ? override : null;
      if (!chosen && mode && levels.includes(mode)) chosen = mode;
      if (!chosen && info.refLevel && levels.includes(info.refLevel)) chosen = info.refLevel;
      if (!chosen) chosen = levels[0] || '';
      holdValues[info.name] = chosen;
    }
  });
  return holdValues;
}

function buildEffectDesignRow(design, focalInfo, focalValue, holdValues) {
  const { predictorInfo } = design;
  const p = design.X[0].length;
  const row = new Array(p).fill(0);
  row[0] = 1;
  let colIdx = 1;
  predictorInfo.forEach(info => {
    if (info.type === 'continuous') {
      const value = info.name === focalInfo.name ? focalValue : holdValues[info.name];
      row[colIdx] = Number.isFinite(value) ? value : 0;
      colIdx += 1;
    } else {
      const levels = info.levels || [];
      const chosen = info.name === focalInfo.name ? focalValue : holdValues[info.name];
      levels.forEach(level => {
        if (level === info.refLevel) return;
        row[colIdx] = level === chosen ? 1 : 0;
        colIdx += 1;
      });
    }
  });
  return row;
}

function renderMnlogEffectControls() {
  const catContainer = document.getElementById('mnlog-nonfocal-categorical');
  const contContainer = document.getElementById('mnlog-nonfocal-continuous');
  if (!mnlogLastDesign || (!catContainer && !contContainer)) return;
  const { predictorInfo, predictorStats } = mnlogLastDesign;
  const focal =
    predictorInfo.find(info => info.name === mnlogEffectFocal) ||
    predictorInfo.find(info => info.type === 'continuous');
  if (!focal) {
    if (catContainer) catContainer.innerHTML = '';
    if (contContainer) contContainer.innerHTML = '';
    return;
  }

  if (catContainer) {
    catContainer.innerHTML = '';
    catContainer.style.display = 'none';
    predictorInfo.forEach(info => {
      if (info.type !== 'categorical') return;
      const levels = info.levels || [];
      if (!levels.length) return;
      const colIdx = (mnlogDataset.headers || []).indexOf(info.name);
      const counts = new Map();
      if (colIdx >= 0 && Array.isArray(mnlogDataset.rows)) {
        mnlogDataset.rows.forEach(row => {
          const lvl = row[colIdx] || '(missing)';
          counts.set(lvl, (counts.get(lvl) || 0) + 1);
        });
      }
      catContainer.style.display = '';
      const defaultLevel =
        levels.includes(mnlogEffectState.catLevels[info.name])
          ? mnlogEffectState.catLevels[info.name]
          : (predictorStats?.[info.name]?.mode && levels.includes(predictorStats[info.name].mode))
            ? predictorStats[info.name].mode
            : info.refLevel && levels.includes(info.refLevel)
              ? info.refLevel
              : levels[0];
      mnlogEffectState.catLevels[info.name] = defaultLevel;
      const label = document.createElement('label');
      label.textContent = `${info.name}:`;
      const select = document.createElement('select');
      levels.forEach(level => {
        const opt = document.createElement('option');
        opt.value = level;
        const count = counts.get(level);
        opt.textContent = count ? `${level} (${count})` : level;
        select.appendChild(opt);
      });
      select.value = defaultLevel;
      select.addEventListener('change', () => {
        mnlogEffectState.catLevels[info.name] = select.value;
        renderMnlogEffectChart();
      });
      label.appendChild(select);
      catContainer.appendChild(label);
    });
  }

  if (contContainer) {
    contContainer.innerHTML = '';
    contContainer.style.display = 'none';
    predictorInfo.forEach(info => {
      if (info.type !== 'continuous' || info.name === focal.name) return;
      const stats = predictorStats?.[info.name] || {};
      contContainer.style.display = '';
      const options = [
        { key: 'mean', label: `Mean (${Number.isFinite(stats.mean) ? stats.mean.toFixed(3) : 'n/a'})`, value: stats.mean },
        { key: 'median', label: `Median (${Number.isFinite(stats.median) ? stats.median.toFixed(3) : 'n/a'})`, value: stats.median },
        { key: 'plus1', label: `+1 SD (${Number.isFinite(stats.mean) && Number.isFinite(stats.sd) ? (stats.mean + stats.sd).toFixed(3) : 'n/a'})`, value: Number.isFinite(stats.mean) && Number.isFinite(stats.sd) ? stats.mean + stats.sd : NaN },
        { key: 'minus1', label: `-1 SD (${Number.isFinite(stats.mean) && Number.isFinite(stats.sd) ? (stats.mean - stats.sd).toFixed(3) : 'n/a'})`, value: Number.isFinite(stats.mean) && Number.isFinite(stats.sd) ? stats.mean - stats.sd : NaN },
      ];
      const label = document.createElement('label');
      label.textContent = `${info.name}:`;
      const select = document.createElement('select');
      options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.label;
        select.appendChild(optionEl);
      });
      const current = mnlogEffectState.continuousOverrides[info.name];
      if (Number.isFinite(current)) {
        select.value = current;
      } else if (Number.isFinite(stats.mean)) {
        select.value = stats.mean;
        mnlogEffectState.continuousOverrides[info.name] = stats.mean;
      }
      select.addEventListener('change', () => {
        const val = parseFloat(select.value);
        if (Number.isFinite(val)) {
          mnlogEffectState.continuousOverrides[info.name] = val;
          renderMnlogEffectChart();
        }
      });
      label.appendChild(select);
      contContainer.appendChild(label);
    });
  }
}

function populateEffectChartCategorySelect() {
  const select = document.getElementById('effect-chart-category-select');
  if (!select || !mnlogLastDesign) return;

  const { classLabels, referenceIndex } = mnlogLastDesign;
  
  while (select.options.length > 1) {
    select.remove(1);
  }

  for (let i = 0; i < classLabels.length; i++) {
    if (i === referenceIndex) continue;
    const option = document.createElement('option');
    option.value = i;
    option.textContent = classLabels[i];
    select.appendChild(option);
  }
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
    mode = DataEntryModes.RAW;
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
      const { headers, rows } = parseMixedDelimitedText(text, MNLOG_UPLOAD_LIMIT);
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

function inferMnlogPredictorMeta(headers, rows, outcomeName) {
  if (
    !Array.isArray(headers) ||
    !headers.length ||
    !Array.isArray(rows) ||
    !rows.length ||
    !window.PredictorUtils ||
    typeof window.PredictorUtils.inferPredictorMeta !== 'function'
  ) {
    return [];
  }

  const meta = window.PredictorUtils.inferPredictorMeta(headers, rows, {
    outcomeName,
    sampleSize: 200,
    minContinuousDistinct: 10
  });

  // For this app we only need a subset of fields and keep the previous
  // property names for compatibility.
  return meta.map(entry => ({
    name: entry.name,
    colIndex: entry.colIndex,
    uniqueCount: entry.uniqueCount,
    isText: entry.isText,
    canTreatAsContinuous: entry.canContinuous,
    looksLikeId: entry.looksLikeId
  }));
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

  const metaList = inferMnlogPredictorMeta(headers, rows, mnlogSelectedOutcome);

  metaList.forEach(meta => {
    const { name, uniqueCount, isText, canTreatAsContinuous, looksLikeId } = meta;

    const wrapper = document.createElement('div');
    wrapper.className = 'predictor-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'predictor-toggle';
    checkbox.value = name;
    checkbox.checked = false; // default: user must opt in

    const label = document.createElement('span');
    label.className = 'predictor-label';

    if (isText || uniqueCount > 1) {
      label.textContent = `${name} (${uniqueCount} distinct value${uniqueCount === 1 ? '' : 's'})`;
    } else {
      label.textContent = name;
    }
    if (looksLikeId) {
      label.textContent += ' (treated as ID; not used as predictor)';
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
      // Text, or numeric with very few distinct values: categorical only
      typeSelect.appendChild(optCat);
      typeSelect.value = 'categorical';
    } else {
      // Numeric with many distinct values: allow both, default continuous
      typeSelect.appendChild(optCont);
      typeSelect.appendChild(optCat);
      typeSelect.value = 'continuous';
    }

    // Initially disable the dropdown until the box is checked (and disable entirely for ID-like columns)
    if (looksLikeId) {
      checkbox.disabled = true;
      typeSelect.disabled = true;
    } else {
      typeSelect.disabled = !checkbox.checked;
    }

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    wrapper.appendChild(typeSelect);
    container.appendChild(wrapper);

    // Track settings only when included
    if (checkbox.checked && !looksLikeId) {
      mnlogSelectedPredictors.push(name);
      mnlogPredictorSettings[name] = { type: typeSelect.value };
    }

    checkbox.addEventListener('change', () => {
      const predictorName = checkbox.value;
      if (looksLikeId) return;
      typeSelect.disabled = !checkbox.checked;
      if (checkbox.checked) {
        if (!mnlogSelectedPredictors.includes(predictorName)) {
          mnlogSelectedPredictors.push(predictorName);
        }
        mnlogPredictorSettings[predictorName] = { type: typeSelect.value };
      } else {
        mnlogSelectedPredictors = mnlogSelectedPredictors.filter(p => p !== predictorName);
      }
    });

    typeSelect.addEventListener('change', () => {
      const predictorName = checkbox.value;
      if (!checkbox.checked || looksLikeId) return;
      mnlogPredictorSettings[predictorName] = mnlogPredictorSettings[predictorName] || {};
      mnlogPredictorSettings[predictorName].type = typeSelect.value;
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
  const predictorStats = {};
  predictorInfo.forEach(info => {
    predictorStats[info.name] =
      info.type === 'continuous'
        ? { values: [] }
        : { counts: new Map() };
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const yRaw = row[outcomeIndex];
    if (yRaw === null || yRaw === undefined) continue;
    const yVal = String(yRaw).trim();
    if (!classIndexMap.has(yVal)) continue;
    const yi = classIndexMap.get(yVal);

    const xRow = [1]; // intercept
    let valid = true;
    const rowValues = [];

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
        rowValues.push({ name: info.name, type: 'continuous', value: num });
      } else {
        const value = String(raw).trim();
        rowValues.push({ name: info.name, type: 'categorical', value });
        info.levels.forEach(level => {
          if (level === info.refLevel) return;
          xRow.push(value === level ? 1 : 0);
        });
      }
    });

    if (!valid) continue;
    rowValues.forEach(entry => {
      const stats = predictorStats[entry.name];
      if (!stats) return;
      if (entry.type === 'continuous') {
        stats.values.push(entry.value);
      } else if (entry.type === 'categorical') {
        const key = entry.value || '';
        stats.counts.set(key, (stats.counts.get(key) || 0) + 1);
      }
    });
    X.push(xRow);
    y.push(yi);
    rowIndices.push(i);
  }

  if (!X.length || !y.length) return null;

  const standardizeInput = document.getElementById('mnlog-standardize-continuous');
  const standardize = !!(standardizeInput && standardizeInput.checked);

  // Optionally standardize continuous predictor columns (mean 0, SD 1)
  if (standardize) {
    const contCols = [];
    let colIndex = 1;
    (predictorInfo || []).forEach(info => {
      if (info.type === 'continuous') {
        contCols.push(colIndex);
        colIndex += 1;
      } else if (info.type === 'categorical') {
        const levels = info.levels || [];
        colIndex += Math.max(0, levels.length - 1);
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

  const computedStats = {};
  predictorInfo.forEach(info => {
    if (info.type === 'continuous') {
      const values = predictorStats[info.name]?.values || [];
      const n = values.length;
      const mean = n ? values.reduce((acc, v) => acc + v, 0) / n : NaN;
      const sorted = values.slice().sort((a, b) => a - b);
      const median = n
        ? (n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2)
        : NaN;
      const variance =
        n > 1
          ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)
          : NaN;
      computedStats[info.name] = {
        mean,
        median,
        sd: Number.isFinite(variance) ? Math.sqrt(Math.max(variance, 0)) : NaN,
        min: n ? sorted[0] : NaN,
        max: n ? sorted[n - 1] : NaN
      };
    } else {
      const counts = predictorStats[info.name]?.counts || new Map();
      let mode = info.refLevel || null;
      let bestCount = -Infinity;
      counts.forEach((count, level) => {
        if (count > bestCount) {
          bestCount = count;
          mode = level;
        }
      });
      computedStats[info.name] = { mode };
    }
  });

  return { X, y, classLabels, referenceIndex, predictorInfo, colMeans, rowIndices, predictorStats: computedStats };
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

  const alphaInput = document.getElementById('alpha');
  const alphaValue = alphaInput ? parseFloat(alphaInput.value) : NaN;
  const confidenceLevel =
    Number.isFinite(alphaValue) && alphaValue > 0 && alphaValue < 1
      ? 1 - alphaValue
      : 0.95;

  const maxIterInput = document.getElementById('mnlog-max-iter');
  const stepSizeInput = document.getElementById('mnlog-step-size');
  const momentumInput = document.getElementById('mnlog-use-momentum');
  const maxIterValue = maxIterInput ? parseInt(maxIterInput.value, 10) : NaN;
  const stepSizeValue = stepSizeInput ? parseFloat(stepSizeInput.value) : NaN;
  const maxIter =
    Number.isInteger(maxIterValue) && maxIterValue > 0
      ? Math.min(maxIterValue, 50000)
      : 200;
  const stepSize =
    Number.isFinite(stepSizeValue) && stepSizeValue > 0 && stepSizeValue <= 1
      ? stepSizeValue
      : 0.2;
  const momentum = momentumInput && momentumInput.checked ? 0.8 : 0;

  showMnlogLoading();

  // Defer heavy fitting work to allow the UI (button state, overlay)
  // to paint before MNLogit.fit runs synchronously.
  setTimeout(() => {
    try {
      const fitResult = MNLogit.fit({
        X: design.X,
        y: design.y,
        classLabels: design.classLabels,
        referenceIndex: design.referenceIndex,
        maxIter,
        stepSize,
        l2: 1e-4,
        tol: 1e-4,
        confidenceLevel,
        momentum
      });

      mnlogLastModel = fitResult;
      mnlogLastDesign = design;
      mnlogEffectState = { focal: null, catLevels: {}, continuousOverrides: {} };
      mnlogEffectFocal = null;
      populateEffectChartCategorySelect();
      populateEffectFocalSelect();
      renderMnlogEffectControls();
      if (statusEl) {
        statusEl.textContent = `Fitted multinomial model on ${design.X.length} observation(s) with ${design.classLabels.length} outcome categories.`;
      }
      updateMnlogResultsPanels(design, fitResult);
      updateMnlogDiagnostics(design);
      renderMnlogEffectChart();
    } catch (error) {
      if (statusEl) statusEl.textContent = error.message || 'Unable to fit multinomial model.';
    } finally {
      hideMnlogLoading();
    }
  }, 0);
}

function renderMnlogEffectChart() {
  const container = document.getElementById('chart-a');
  if (!container || !window.Plotly || !mnlogLastModel || !mnlogLastDesign) return;

  const { X, classLabels, referenceIndex, predictorInfo } = mnlogLastDesign;
  const { coefficients, covarianceMatrix } = mnlogLastModel;
  const note = document.getElementById('mnlog-effect-note');
  const chosenFocal = mnlogEffectFocal;
  const focal = predictorInfo.find(info => info.name === chosenFocal)
    || predictorInfo.find(info => info.type === 'continuous');
  if (!mnlogEffectFocal && focal) {
    mnlogEffectFocal = focal.name;
    const focalSelect = document.getElementById('mnlog-focal-select');
    if (focalSelect) focalSelect.value = mnlogEffectFocal;
  }
  if (!focal) {
    container.innerHTML = '<p class="chart-note">Include at least one predictor to see effect plots.</p>';
    if (note) note.textContent = 'Select predictors and run the model to view effect plots.';
    return;
  }

  const holdValues = computeHoldValuesForEffect(mnlogLastDesign, focal.name);
  const alpha = parseFloat(document.getElementById('alpha').value) || 0.05;
  const confidenceLevel = 1 - alpha;

  const select = document.getElementById('effect-chart-category-select');
  const selectedCategory = select ? select.value : 'all';

  if (focal.type === 'continuous') {
    let colIndex = 1;
    for (const info of predictorInfo) {
      if (info.name === focal.name) break;
      colIndex += (info.type === 'continuous' ? 1 : Math.max(0, (info.levels || []).length - 1));
    }

    const focalValues = X.map(row => row[colIndex]);
    let minVal = Math.min.apply(null, focalValues);
    let maxVal = Math.max.apply(null, focalValues);
    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal) || minVal === maxVal) {
      container.innerHTML = '<p class="chart-note">Unable to determine a range for the focal predictor.</p>';
      return;
    }
    if (mnlogRangeMode === 'sd') {
      const stats = (mnlogLastDesign.predictorStats && mnlogLastDesign.predictorStats[focal.name]) || {};
      if (Number.isFinite(stats.mean) && Number.isFinite(stats.sd)) {
        minVal = stats.mean - 2 * stats.sd;
        maxVal = stats.mean + 2 * stats.sd;
      }
    } else if (mnlogRangeMode === 'custom' && Number.isFinite(mnlogCustomRange.min) && Number.isFinite(mnlogCustomRange.max) && mnlogCustomRange.max > mnlogCustomRange.min) {
      minVal = mnlogCustomRange.min;
      maxVal = mnlogCustomRange.max;
    }

    const gridSize = 40;
    const grid = Array.from({ length: gridSize }, (_, i) => minVal + (i / (gridSize - 1)) * (maxVal - minVal));

    const designGrid = grid.map(value =>
      buildEffectDesignRow(mnlogLastDesign, focal, value, holdValues)
    );

    const predictions = MNLogit.predictWithIntervals({
      X: designGrid,
      coefficients,
      covarianceMatrix,
      referenceIndex,
      confidenceLevel
    });

    container.classList.remove('chart-placeholder');
    container.style.minHeight = '320px';

    const traces = [];
    const colors = Plotly.d3.scale.category10();
    let traceCounter = 0;

    for (let k = 0; k < classLabels.length; k++) {
      if (k === referenceIndex) continue;
      if (selectedCategory !== 'all' && String(k) !== selectedCategory) continue;

      const color = colors(traceCounter);
      traceCounter++;

      const lowerSeries = predictions.map(p => {
        const low = Math.min(p.lower[k], p.upper[k]);
        const withCenter = Math.min(low, p.probs[k]);
        return withCenter;
      });
      const upperSeries = predictions.map(p => {
        const high = Math.max(p.lower[k], p.upper[k]);
        const withCenter = Math.max(high, p.probs[k]);
        return withCenter;
      });

      traces.push({
        x: grid.concat(grid.slice().reverse()),
        y: upperSeries.concat(lowerSeries.slice().reverse()),
        fill: 'tozeroy',
        fillcolor: `rgba(${Plotly.d3.rgb(color).r}, ${Plotly.d3.rgb(color).g}, ${Plotly.d3.rgb(color).b}, 0.2)`,
        line: { color: 'transparent' },
        name: `${classLabels[k]} CI`,
        showlegend: false,
        hoverinfo: 'none',
        type: 'scatter',
      });

      traces.push({
        x: grid,
        y: predictions.map(p => p.probs[k]),
        mode: 'lines',
        line: { color: color },
        name: classLabels[k],
        type: 'scatter',
        hovertemplate: `${classLabels[k]}<br>${focal.name} = %{x:.4g}<br>p = %{y:.4f}<extra></extra>`
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
      const holds = [];
      (predictorInfo || []).forEach(info => {
        if (info.name === focal.name) return;
        const held = holdValues[info.name];
        if (held === undefined) return;
        holds.push(info.type === 'categorical'
          ? `${info.name} = ${held}`
          : `${info.name} = ${Number.isFinite(held) ? held.toFixed(3) : held}`);
      });
      const holdText = holds.length ? ` Other predictors held at: ${holds.join(', ')}.` : '';
      note.textContent =
        `Each line shows the predicted probability of an outcome category (relative to reference "${mnlogReferenceLevel}") ` +
        `as ${focal.name} varies. Shaded areas represent ${Math.round(confidenceLevel * 100)}% confidence intervals.` +
        holdText;
    }
    return;
  }

  // Categorical focal: bar chart per level
  const levels = focal.levels || [];
  if (!levels.length) {
    container.innerHTML = '<p class="chart-note">No levels found for the focal categorical predictor.</p>';
    return;
  }

  const designRows = levels.map(level =>
    buildEffectDesignRow(mnlogLastDesign, focal, level, holdValues)
  );

  const predictions = MNLogit.predictWithIntervals({
    X: designRows,
    coefficients,
    covarianceMatrix,
    referenceIndex,
    confidenceLevel
  });

  container.classList.remove('chart-placeholder');
  container.style.minHeight = '320px';

  const traces = [];
  const colors = Plotly.d3.scale.category10();
  let traceCounter = 0;

  const classIndexes = [];
  if (selectedCategory === 'all') {
    for (let k = 0; k < classLabels.length; k++) {
      if (k === referenceIndex) continue;
      classIndexes.push(k);
    }
  } else {
    const idx = parseInt(selectedCategory, 10);
    if (Number.isInteger(idx) && idx >= 0 && idx < classLabels.length) {
      classIndexes.push(idx);
    }
  }

  classIndexes.forEach(k => {
    const color = colors(traceCounter);
    traceCounter++;
    const y = predictions.map(p => p.probs[k]);
    const upper = predictions.map(p => p.upper[k]);
    const lower = predictions.map(p => p.lower[k]);
    const errorPlus = upper.map((u, i) => Math.max(0, u - y[i]));
    const errorMinus = lower.map((l, i) => Math.max(0, y[i] - l));

    traces.push({
      x: levels,
      y,
      type: 'bar',
      name: classLabels[k],
      marker: { color },
      error_y: {
        type: 'data',
        array: errorPlus,
        arrayminus: errorMinus,
        visible: true
      },
      hovertemplate: `${focal.name} = %{x}<br>${classLabels[k]}: %{y:.2%}<extra></extra>`
    });
  });

  const layout = {
    barmode: 'group',
    margin: { t: 30, r: 10, b: 50, l: 60 },
    xaxis: { title: focal.name },
    yaxis: { title: 'Predicted probability', range: [0, 1] },
    legend: { orientation: 'h', x: 0, y: 1.1 }
  };

  Plotly.newPlot(container, traces, layout, { responsive: true, displaylogo: false });

  if (note) {
    const holds = [];
    (predictorInfo || []).forEach(info => {
      if (info.name === focal.name) return;
      const held = holdValues[info.name];
      if (held === undefined) return;
      holds.push(info.type === 'categorical'
        ? `${info.name} = ${held}`
        : `${info.name} = ${Number.isFinite(held) ? held.toFixed(3) : held}`);
    });
    const holdText = holds.length ? ` Other predictors held at: ${holds.join(', ')}.` : '';
    const classText = classIndexes.length === 1
      ? `Showing ${classLabels[classIndexes[0]]} vs reference "${mnlogReferenceLevel}".`
      : `Bars grouped by outcome (reference: "${mnlogReferenceLevel}").`;
    note.textContent =
      `Bars show predicted probabilities by ${focal.name} level. Error bars are ${Math.round(confidenceLevel * 100)}% intervals. ` +
      classText +
      holdText;
  }
}

// Summarize fitted effects (continuous and categorical) so multiple
// narratives (APA, managerial, interpretation aids) can share logic.
function summarizeMnlogEffects(design, fitResult) {
  const { classLabels, referenceIndex, predictorInfo } = design || {};
  const { coefficients: beta, stdErrors: seMat, pValues: pMat, confidenceIntervals: ciMat } =
    fitResult || {};

  if (
    !design ||
    !fitResult ||
    !Array.isArray(classLabels) ||
    !Array.isArray(beta) ||
    !Array.isArray(seMat) ||
    !Array.isArray(pMat)
  ) {
    return { effects: [], bestContinuous: null, bestCategorical: null };
  }

  const K = classLabels.length;

  // Build metadata for columns
  const termMeta = [{ type: 'intercept' }];
  (predictorInfo || []).forEach(info => {
    if (info.type === 'continuous') {
      termMeta.push({ type: 'continuous', name: info.name });
    } else if (info.type === 'categorical') {
      (info.levels || []).forEach(level => {
        if (level === info.refLevel) return;
        termMeta.push({
          type: 'categorical',
          name: info.name,
          level,
          refLevel: info.refLevel
        });
      });
    }
  });

  const effects = [];
  for (let kIdx = 0; kIdx < K; kIdx++) {
    if (kIdx === referenceIndex) continue;
    const rowB = beta[kIdx] || [];
    const rowSE = seMat[kIdx] || [];
    const rowP = pMat[kIdx] || [];
    for (let j = 1; j < rowB.length && j < termMeta.length; j++) {
      const meta = termMeta[j];
      if (!meta || meta.type === 'intercept') continue;
      const b = rowB[j];
      const se = rowSE[j];
      const p = rowP[j];
      if (!Number.isFinite(b) || !Number.isFinite(se) || !Number.isFinite(p)) continue;
      const z = b / (se || 1);
      const ci = ciMat && ciMat[kIdx] ? ciMat[kIdx][j] : null;
      effects.push({ outcomeIndex: kIdx, meta, b, se, p, z, ci });
    }
  }

  effects.sort((a, b) => (a.p || 1) - (b.p || 1));

  let bestContinuous = null;
  let bestCategorical = null;
  for (const eff of effects) {
    if (!bestContinuous && eff.meta.type === 'continuous') {
      bestContinuous = eff;
    }
    if (!bestCategorical && eff.meta.type === 'categorical') {
      bestCategorical = eff;
    }
    if (bestContinuous && bestCategorical) break;
  }

  return { effects, bestContinuous, bestCategorical };
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

  const hasInferential =
    fitResult &&
    Array.isArray(fitResult.coefficients) &&
    Array.isArray(fitResult.stdErrors) &&
    Array.isArray(fitResult.pValues);
  const effectSummary = hasInferential ? summarizeMnlogEffects(design, fitResult) : null;

  // -------- APA-style narrative --------
  if (apaEl) {
    let text =
      `A baseline-category multinomial logistic regression was fitted predicting ${outcomeName} from ` +
      `${mnlogSelectedPredictors.length} predictor(s) (N = ${n}, K = ${K} outcome categories). ` +
      `Model log-likelihood was ${logLik.toFixed(2)}, McFadden pseudo-R\u00b2 = ${Number.isFinite(pseudoR2) ? pseudoR2.toFixed(3) : 'n/a'}. `;

    if (hasInferential) {
      const { coefficients: beta, stdErrors: seMat, pValues: pMat, confidenceIntervals: ciMat } = fitResult;

      // Build metadata for columns
      const termMeta = [{ type: 'intercept' }];
      (design.predictorInfo || []).forEach(info => {
        if (info.type === 'continuous') {
          termMeta.push({ type: 'continuous', name: info.name });
        } else if (info.type === 'categorical') {
          (info.levels || []).forEach(level => {
            if (level === info.refLevel) return;
            termMeta.push({
              type: 'categorical',
              name: info.name,
              level,
              refLevel: info.refLevel
            });
          });
        }
      });

      const effects = [];
      for (let kIdx = 0; kIdx < K; kIdx++) {
        if (kIdx === design.referenceIndex) continue;
        const rowB = beta[kIdx] || [];
        const rowSE = seMat[kIdx] || [];
        const rowP = pMat[kIdx] || [];
        for (let j = 1; j < rowB.length && j < termMeta.length; j++) {
          const meta = termMeta[j];
          if (!meta || meta.type === 'intercept') continue;
          const b = rowB[j];
          const se = rowSE[j];
          const p = rowP[j];
          if (!Number.isFinite(b) || !Number.isFinite(se) || !Number.isFinite(p)) continue;
          const z = b / (se || 1);
          const ci = ciMat && ciMat[kIdx] ? ciMat[kIdx][j] : null;
          effects.push({ outcomeIndex: kIdx, meta, b, se, p, z, ci });
        }
      }

      effects.sort((a, b) => (a.p || 1) - (b.p || 1));
      const fmt = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : 'n/a');

      const bestCont = effects.find(e => e.meta.type === 'continuous');
      const bestCat = effects.find(e => e.meta.type === 'categorical');

      if (bestCont) {
        const { outcomeIndex, meta, b, se, p, z, ci } = bestCont;
        const or = Math.exp(b);
        const outLab = classLabels[outcomeIndex] ?? `Outcome ${outcomeIndex}`;
        const refLab = classLabels[design.referenceIndex] ?? 'reference';
        const ciLo = ci && Number.isFinite(ci[0]) ? Math.exp(ci[0]) : null;
        const ciHi = ci && Number.isFinite(ci[1]) ? Math.exp(ci[1]) : null;
        text +=
          ` The strongest continuous effect was ${meta.name} for the contrast ${outLab} vs ${refLab} ` +
          `(β = ${fmt(b)}, SE = ${fmt(se)}, z = ${fmt(z, 2)}, p = ${p < 0.001 ? '< .001' : fmt(p, 3)}, ` +
          `OR ≈ ${fmt(or)}${ciLo && ciHi ? `, 95% CI OR [${fmt(ciLo)}, ${fmt(ciHi)}]` : ''}).`;
      }

      if (bestCat) {
        const { outcomeIndex, meta, b, se, p, z, ci } = bestCat;
        const or = Math.exp(b);
        const outLab = classLabels[outcomeIndex] ?? `Outcome ${outcomeIndex}`;
        const refLab = classLabels[design.referenceIndex] ?? 'reference';
        const ciLo = ci && Number.isFinite(ci[0]) ? Math.exp(ci[0]) : null;
        const ciHi = ci && Number.isFinite(ci[1]) ? Math.exp(ci[1]) : null;
        text +=
          ` The strongest categorical contrast was ${meta.name} = ${meta.level} versus ${meta.refLevel || 'reference'} ` +
          `for ${outLab} vs ${refLab} (β = ${fmt(b)}, SE = ${fmt(se)}, z = ${fmt(z, 2)}, ` +
          `p = ${p < 0.001 ? '< .001' : fmt(p, 3)}, OR ≈ ${fmt(or)}${ciLo && ciHi ? `, 95% CI OR [${fmt(ciLo)}, ${fmt(ciHi)}]` : ''}).`;
      }
    }

    apaEl.innerHTML = text;
  }

  // -------- Managerial narrative --------
  if (mgrEl) {
    const refOutcome = mnlogReferenceLevel || (classLabels[design.referenceIndex] ?? '');
    let mgrText =
      `This model estimates how the predictors (${predictorsDesc}) shift the probability of each outcome category ` +
      `relative to the reference outcome "${refOutcome}". `;

    if (hasInferential && effectSummary) {
      const effects = effectSummary.effects || [];
      if (effects.length) {
        const top = effects[0];
        const or = Math.exp(top.b);
        const outLab = classLabels[top.outcomeIndex] ?? `Outcome ${top.outcomeIndex}`;
        const refLab = classLabels[design.referenceIndex] ?? 'reference';

        const describeOR = () => {
          if (!Number.isFinite(or)) return '';
          if (or > 1.05) return `about ${or.toFixed(2)} times higher`;
          if (or < 0.95) return `about ${(1 / or).toFixed(2)} times lower`;
          return 'roughly similar';
        };

        if (top.meta.type === 'continuous') {
          mgrText +=
            `For a one-unit increase in ${top.meta.name}, the odds of "${outLab}" versus "${refLab}" are ` +
            `${describeOR()}, holding other predictors constant. `;
        } else if (top.meta.type === 'categorical') {
          mgrText +=
            `Cases with ${top.meta.name} = "${top.meta.level}" have ${describeOR()} odds of ` +
            `"${outLab}" versus "${refLab}" compared to those at the reference level ` +
            `"${top.meta.refLevel || 'reference'}", holding other predictors constant. `;
        }
      }
    }

    const catPredictors = (design.predictorInfo || []).filter(info => info.type === 'categorical');
    const refDetails = catPredictors.length
      ? ' For categorical predictors, the following reference levels were used: ' +
        catPredictors
          .map(info => `${info.name} = "${info.refLevel}"`)
          .join('; ') +
        '.'
      : '';

    mgrEl.innerHTML = mgrText + refDetails;
  }


  renderMnlogEquation(design, fitResult);
  renderMnlogSummaryStats(design);
  renderMnlogCoefficientTable(design, fitResult);
  renderMnlogCoefInterpretation(design, fitResult);
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

  let minCount = Infinity;
  let minLabel = null;
  const rowsHtml = Array.from(classCounts.entries())
    .map(([label, count]) => {
      const pct = usedRows ? ((count / usedRows) * 100).toFixed(1) : '0.0';
      if (count < minCount) {
        minCount = count;
        minLabel = label;
      }
      return `<li>${label}: ${count} (${pct}% of modeled observations)</li>`;
    })
    .join('');

  const droppedHtml =
    dropped > 0
      ? `<p><strong>Row screening:</strong> ${dropped} of ${totalRows} uploaded row(s) were excluded because of missing or invalid values in the outcome or selected predictors.</p>`
      : `<p><strong>Row screening:</strong> All ${usedRows} uploaded row(s) were used in the model.</p>`;

  const rareNote =
    Number.isFinite(minCount) && usedRows
      ? `<p><strong>Smallest outcome category:</strong> "${escapeHtml(minLabel)}" with ${minCount} case(s). Very small categories can make estimates unstable; consider combining or dropping extremely rare outcomes when appropriate.</p>`
      : '';

  // Simple sparsity check for categorical predictors
  const sparsityNotes = [];
  (design.predictorInfo || []).forEach(info => {
    if (info.type !== 'categorical') return;
    const colIdx = (mnlogDataset.headers || []).indexOf(info.name);
    if (colIdx < 0) return;
    const counts = new Map();
    (mnlogDataset.rows || []).forEach(row => {
      const val = row[colIdx] || '(missing)';
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    const total = mnlogDataset.rows?.length || 1;
    const rareLevels = Array.from(counts.entries())
      .filter(([_, c]) => c / total < 0.05)
      .map(([level, c]) => `"${escapeHtml(level)}" (${c})`);
    if (rareLevels.length) {
      sparsityNotes.push(
        `<li>${escapeHtml(info.name)}: rare levels ${rareLevels.join(', ')}; consider collapsing levels if estimates look unstable.</li>`
      );
    }
  });

  const sparsityHtml = sparsityNotes.length
    ? `<p><strong>Rare predictor levels:</strong></p><ul>${sparsityNotes.join('')}</ul>`
    : '';

  const fit = mnlogLastModel || {};
let iterNote = '';

    if (window.StatsUtils && typeof window.StatsUtils.buildEstimationDetailsHtml === 'function') {
      const coreHtml = window.StatsUtils.buildEstimationDetailsHtml({
        engine: 'gradient_ascent',
        iterations: fit.iterations,
        maxIter: fit.maxIter,
        stepSize: fit.stepSize,
        tol: fit.tol,
        momentum: fit.momentum,
        lastMaxChange: fit.lastMaxChange,
        logLikChanges: fit.logLikChanges
      });
      if (coreHtml) {
        const prefix =
          '<p><strong>Estimator:</strong> Baseline-category multinomial logistic regression fitted via gradient ascent on the penalized log-likelihood with L2 (ridge) regularization on non-intercept terms.</p>';
        iterNote = prefix + coreHtml;
      }
    }


  diagContainer.innerHTML =
    droppedHtml +
    `<p><strong>Outcome balance (modeled data only):</strong></p>` +
    `<ul>${rowsHtml}</ul>` +
    rareNote +
    sparsityHtml +
    iterNote;
}

function renderMnlogCoefficientTable(design, fitResult) {
  const tableBody =
    document.querySelector('.summary-table-card .summary-table tbody');
  if (!tableBody || !design || !fitResult) return;

  const { classLabels, referenceIndex, predictorInfo } = design;
  const { coefficients, stdErrors, pValues, confidenceIntervals } = fitResult;

  if (!Array.isArray(classLabels) || !Array.isArray(coefficients)) return;

  const K = classLabels.length;
  const beta = coefficients;
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
    tableBody.innerHTML =
      '<tr><td colspan="6">Unable to map coefficients to predictor terms. Please re-run the model or contact the tool maintainer.</td></tr>';
    return;
  }

  let rowsHtml = '';
  for (let k = 0; k < K; k++) {
    if (k === referenceIndex) continue;
    const outcomeLabel = `${classLabels[k]} vs ${classLabels[referenceIndex] ?? 'reference'}`;
    const rowCoeffs = beta[k] || [];
    const rowStdErrors = stdErrors ? stdErrors[k] || [] : [];
    const rowPValues = pValues ? pValues[k] || [] : [];
    const rowCIs = confidenceIntervals ? confidenceIntervals[k] || [] : [];

    for (let j = 0; j < p; j++) {
      const coef = rowCoeffs[j];
      const se = rowStdErrors[j];
      const pval = rowPValues[j];
      const ci = rowCIs[j];

      const coefDisplay = Number.isFinite(coef) ? coef.toFixed(3) : 'n/a';
      const seDisplay = Number.isFinite(se) ? se.toFixed(3) : 'n/a';
      const pvalDisplay = Number.isFinite(pval) ? (pval < 0.001 ? '< 0.001' : pval.toFixed(3)) : 'n/a';
      const ciDisplay = Array.isArray(ci) && Number.isFinite(ci[0]) && Number.isFinite(ci[1]) ? `[${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}]` : 'n/a';

      rowsHtml +=
        `<tr>` +
        `<td>${outcomeLabel}</td>` +
        `<td>${termLabels[j]}</td>` +
        `<td>${coefDisplay}</td>` +
        `<td>${seDisplay}</td>` +
        `<td>${pvalDisplay}</td>` +
        `<td>${ciDisplay}</td>` +
        `</tr>`;
    }
  }

  if (!rowsHtml) {
    tableBody.innerHTML =
      '<tr><td colspan="6">No coefficients available to display.</td></tr>';
  } else {
    tableBody.innerHTML = rowsHtml;
  }
}

function renderMnlogCoefInterpretation(design, fitResult) {
  const container = document.getElementById('mnlog-coef-interpretation');
  if (!container || !design || !fitResult) return;

  const { classLabels, referenceIndex, predictorInfo } = design;
  const { coefficients, stdErrors, pValues, confidenceIntervals } = fitResult;
  if (!coefficients || !coefficients.length || !Array.isArray(pValues)) {
    container.textContent = 'Run the model to see example interpretations of key coefficients.';
    return;
  }

  const p = coefficients[0]?.length || 0;
  if (!p || !Array.isArray(predictorInfo)) {
    container.textContent = 'Run the model to see example interpretations of key coefficients.';
    return;
  }

  // Build metadata for each coefficient column to know which predictor/level it represents.
  const termsMeta = [];
  termsMeta.push({ type: 'intercept' });
  (predictorInfo || []).forEach(info => {
    if (info.type === 'continuous') {
      termsMeta.push({ type: 'continuous', name: info.name });
    } else if (info.type === 'categorical') {
      const levels = info.levels || [];
      levels.forEach(level => {
        if (level === info.refLevel) return;
        termsMeta.push({
          type: 'categorical',
          name: info.name,
          level,
          refLevel: info.refLevel
        });
      });
    }
  });

  const effects = [];
  for (let k = 0; k < classLabels.length; k++) {
    if (k === referenceIndex) continue;
    const betaRow = coefficients[k] || [];
    const seRow = stdErrors ? stdErrors[k] || [] : [];
    const pRow = pValues ? pValues[k] || [] : [];
    for (let j = 1; j < p && j < termsMeta.length; j++) {
      const meta = termsMeta[j];
      if (!meta || meta.type === 'intercept') continue;
      const b = betaRow[j];
      const se = seRow[j];
      const pval = pRow[j];
      if (!Number.isFinite(b) || !Number.isFinite(se) || !Number.isFinite(pval)) continue;
      const z = b / (se || 1);
      effects.push({
        outcomeIndex: k,
        termIndex: j,
        meta,
        b,
        se,
        p: pval,
        z: z,
        ci: confidenceIntervals && confidenceIntervals[k] ? confidenceIntervals[k][j] : null
      });
    }
  }

  if (!effects.length) {
    container.textContent = 'Run the model to see example interpretations of key coefficients.';
    return;
  }

  // Sort by smallest p-value (strongest signal).
  effects.sort((a, b) => (a.p || 1) - (b.p || 1));

  const examples = [];

  const pickExample = (type) =>
    effects.find(e => e.meta.type === type && Number.isFinite(e.p));

  const bestCont = pickExample('continuous');
  const bestCat = pickExample('categorical');

  const fmtNum = (v, d = 3) =>
    Number.isFinite(v) ? v.toFixed(d) : 'n/a';

  if (bestCont) {
    const { outcomeIndex, meta, b, se, p, ci } = bestCont;
    const or = Math.exp(b);
    const outcome = classLabels[outcomeIndex] ?? `Outcome ${outcomeIndex}`;
    const refOutcome = classLabels[referenceIndex] ?? 'reference';
    const ciLo = ci && Number.isFinite(ci[0]) ? Math.exp(ci[0]) : null;
    const ciHi = ci && Number.isFinite(ci[1]) ? Math.exp(ci[1]) : null;
    examples.push(
      `Continuous example: For the contrast <strong>${escapeHtml(outcome)} vs ${escapeHtml(refOutcome)}</strong>, a one-unit increase in <strong>${escapeHtml(meta.name)}</strong> changes the log-odds by ${fmtNum(b)} (SE = ${fmtNum(se)}), p = ${p < 0.001 ? '&lt; 0.001' : fmtNum(p, 3)}. This corresponds to an odds ratio of approximately ${fmtNum(or, 3)} for ${escapeHtml(outcome)} vs ${escapeHtml(refOutcome)}, holding other predictors constant${ciLo && ciHi ? ` (95% CI for the odds ratio ≈ [${fmtNum(ciLo, 3)}, ${fmtNum(ciHi, 3)}])` : ''}.`
    );
  }

  if (bestCat) {
    const { outcomeIndex, meta, b, se, p, ci } = bestCat;
    const or = Math.exp(b);
    const outcome = classLabels[outcomeIndex] ?? `Outcome ${outcomeIndex}`;
    const refOutcome = classLabels[referenceIndex] ?? 'reference';
    const ciLo = ci && Number.isFinite(ci[0]) ? Math.exp(ci[0]) : null;
    const ciHi = ci && Number.isFinite(ci[1]) ? Math.exp(ci[1]) : null;
    examples.push(
      `Categorical example: For <strong>${escapeHtml(meta.name)}</strong>, being in level <strong>${escapeHtml(meta.level)}</strong> (vs. the reference level <strong>${escapeHtml(meta.refLevel || 'ref')}</strong>) changes the log-odds of <strong>${escapeHtml(outcome)} vs ${escapeHtml(refOutcome)}</strong> by ${fmtNum(b)} (SE = ${fmtNum(se)}), p = ${p < 0.001 ? '&lt; 0.001' : fmtNum(p, 3)}. This corresponds to an odds ratio of approximately ${fmtNum(or, 3)}, meaning the odds of ${escapeHtml(outcome)} vs ${escapeHtml(refOutcome)} are multiplied by about ${fmtNum(or, 3)} for that level${ciLo && ciHi ? ` (95% CI for the odds ratio ≈ [${fmtNum(ciLo, 3)}, ${fmtNum(ciHi, 3)}])` : ''}, holding other predictors constant.`
    );
  }

  if (!examples.length) {
    container.textContent = 'Run the model to see example interpretations of key coefficients.';
    return;
  }

  container.innerHTML = examples
    .map(text => `<p>${text}</p>`)
    .join('');
}

function renderMnlogEquation(design, fitResult) {
  const equationEl = document.getElementById('mnlog-regression-equation');
  if (!equationEl || !design || !fitResult) return;
  const { classLabels, referenceIndex, predictorInfo } = design;
  const { coefficients } = fitResult;
  if (!coefficients || !coefficients.length) {
    equationEl.textContent = 'Run the model to view the fitted equations.';
    return;
  }

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

  const lines = [];
  for (let k = 0; k < classLabels.length; k++) {
    if (k === referenceIndex) continue;
    const beta = coefficients[k];
    if (!beta || !beta.length) continue;
    const parts = beta.map((b, idx) => {
      const label = termLabels[idx] || `x${idx}`;
      const sign = b >= 0 ? '+ ' : '- ';
      const absVal = Math.abs(b).toFixed(3);
      if (idx === 0) return `${b.toFixed(3)}`;
      return `${sign}${absVal}·(${label})`;
    });
    lines.push(
      `<strong>logit(P(${escapeHtml(classLabels[k])} / ${escapeHtml(classLabels[referenceIndex] || 'ref')}))</strong> = ${parts.join(' ')}`
    );
  }
  equationEl.innerHTML = lines.length ? lines.join('<br>') : 'Equations unavailable.';
}

function renderMnlogSummaryStats(design) {
  const numBody = document.getElementById('mnlog-numeric-summary-body');
  const catBody = document.getElementById('mnlog-categorical-summary-body');
  const datasetRows = mnlogDataset?.rows || [];
  if (!datasetRows.length || !design) {
    if (numBody) numBody.innerHTML = `<tr><td colspan="6">${mnlogSummaryMessage}</td></tr>`;
    if (catBody) catBody.innerHTML = `<tr><td colspan="3">${mnlogSummaryMessage}</td></tr>`;
    return;
  }

  const numericVars = [];
  if (mnlogSelectedOutcome) numericVars.push(mnlogSelectedOutcome);
  (design.predictorInfo || [])
    .filter(info => info.type === 'continuous')
    .forEach(info => {
      if (!numericVars.includes(info.name)) numericVars.push(info.name);
    });

  if (numBody) {
    const rowsOut = [];
    numericVars.forEach(varName => {
      const idx = mnlogDataset.headers.indexOf(varName);
      if (idx < 0) return;
      const values = datasetRows
        .map(r => parseFloat(r[idx]))
        .filter(v => Number.isFinite(v));
      if (!values.length) return;
      const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
      const sorted = values.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      const variance = values.length > 1
        ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1)
        : 0;
      const sd = Math.sqrt(Math.max(variance, 0));
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      rowsOut.push(`<tr>
        <td>${escapeHtml(varName)}</td>
        <td>${mean.toFixed(3)}</td>
        <td>${median.toFixed(3)}</td>
        <td>${sd.toFixed(3)}</td>
        <td>${min.toFixed(3)}</td>
        <td>${max.toFixed(3)}</td>
      </tr>`);
    });
    numBody.innerHTML = rowsOut.length ? rowsOut.join('') : `<tr><td colspan="6">${mnlogSummaryMessage}</td></tr>`;
  }

  if (catBody) {
    const rowsOut = [];
    // include outcome distribution
    const outcomeIdx = mnlogDataset.headers.indexOf(mnlogSelectedOutcome);
    if (outcomeIdx >= 0) {
      const counts = new Map();
      datasetRows.forEach(r => {
        const lvl = r[outcomeIdx] || '(missing)';
        counts.set(lvl, (counts.get(lvl) || 0) + 1);
      });
      const total = datasetRows.length || 1;
      counts.forEach((count, level) => {
        rowsOut.push(`<tr>
          <td>${escapeHtml(mnlogSelectedOutcome || 'Outcome')}</td>
          <td>${escapeHtml(level)}</td>
          <td>${((count / total) * 100).toFixed(2)}%</td>
        </tr>`);
      });
    }

    (design.predictorInfo || []).forEach(info => {
      if (info.type !== 'categorical') return;
      const idx = mnlogDataset.headers.indexOf(info.name);
      if (idx < 0) return;
      const counts = new Map();
      datasetRows.forEach(r => {
        const lvl = r[idx] || '(missing)';
        counts.set(lvl, (counts.get(lvl) || 0) + 1);
      });
      const total = datasetRows.length || 1;
      counts.forEach((count, level) => {
        rowsOut.push(`<tr>
          <td>${escapeHtml(info.name)}</td>
          <td>${escapeHtml(level)}</td>
          <td>${((count / total) * 100).toFixed(2)}%</td>
        </tr>`);
      });
    });

    catBody.innerHTML = rowsOut.length ? rowsOut.join('') : `<tr><td colspan="3">${mnlogSummaryMessage}</td></tr>`;
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
      alert('Upload a CSV in the raw data panel before downloading results.');
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
  const limit = typeof maxRows === 'number' && maxRows > 0 ? maxRows : MNLOG_UPLOAD_LIMIT;

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
  // Deprecated placeholder; kept as a no-op to preserve API shape if referenced.
  return;
}

function renderPlaceholderStackedChart() {
  // Deprecated placeholder; kept as a no-op to preserve API shape if referenced.
  return;
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
  const predCounts = new Array(K).fill(0);
  probs.forEach(row => {
    let bestIdx = 0;
    let bestProb = row[0] ?? -Infinity;
    for (let k = 1; k < row.length; k++) {
      if (row[k] > bestProb) {
        bestProb = row[k];
        bestIdx = k;
      }
    }
    predCounts[bestIdx] += 1;
  });

  const toggle = document.getElementById('toggle-chart-mode');
  const showPredicted = !toggle || toggle.checked;

  const select = document.getElementById('visual-mode');
  const modeValue = select ? select.value : 'rows';
  const useProportion = modeValue === 'columns' || modeValue === 'proportion';

  const obsValues = useProportion
    ? obsCounts.map(c => (n ? c / n : 0))
    : obsCounts.slice();
  const predValues = useProportion
    ? predCounts.map(c => (n ? c / n : 0))
    : predCounts.slice();

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
