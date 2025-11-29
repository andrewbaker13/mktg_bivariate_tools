// Sample Size Planner – Single Mean / Proportion

const CREATED_DATE = '2025-11-21';
let modifiedDate = new Date().toLocaleDateString();

// Usage tracking variables
let pageLoadTime = Date.now();
let hasSuccessfulRun = false;

// Usage tracking function
function checkAndTrackUsage() {
  const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
  if (timeOnPage < 3) return;
  if (!hasSuccessfulRun) return;
  if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `tool-tracked-sample-size-calculator-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('sample-size-calculator', {}, `Sample size calculation completed`);
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for Sample Size Calculator');
  }
}

const Modes = {
  PROPORTION: 'proportion',
  MEAN: 'mean'
};

const SampleSizeState = {
  mode: Modes.PROPORTION,
  confidenceLevel: 0.95,
  alpha: 0.05,
  proportion: 0.2,
  marginOfErrorProp: 0.03,
  sigma: 10,
  marginOfErrorMean: 2,
  populationSize: null,
  requiredN: null,
  requiredNFinite: null
};

const PlanningScenarios = [
  {
    id: 'email-open-rate',
    label: 'Estimate an email open rate',
    mode: Modes.PROPORTION,
    description:
      'You want to estimate the open rate of a new email campaign. Using a prior open rate of 20%, tolerating ±3 percentage points of error at 95% confidence.',
    settings: {
      proportion: 0.2,
      marginOfErrorProp: 0.03,
      confidenceLevel: 0.95,
      alpha: 0.05,
      populationSize: null
    }
  },
  {
    id: 'average-order-value',
    label: 'Estimate average order value',
    mode: Modes.MEAN,
    description:
      'You want to estimate average order value (AOV). A prior campaign suggests a standard deviation of about $10, and you want ±$2 precision at 95% confidence.',
    settings: {
      sigma: 10,
      marginOfErrorMean: 2,
      confidenceLevel: 0.95,
      alpha: 0.05,
      populationSize: null
    }
  }
];

function getZFromAlpha(alpha) {
  const a = typeof alpha === 'number' && isFinite(alpha) && alpha > 0 && alpha < 1 ? alpha : 0.05;
  if (window.StatsUtils && typeof window.StatsUtils.normInv === 'function') {
    return window.StatsUtils.normInv(1 - a / 2);
  }
  // Fallback to common levels
  const key = +(1 - a).toFixed(3);
  if (Math.abs(key - 0.9) < 1e-3) return 1.6449;
  if (Math.abs(key - 0.95) < 1e-3) return 1.96;
  if (Math.abs(key - 0.99) < 1e-3) return 2.5758;
  return 1.96;
}

function computeNForProportion(p, E, alpha, populationSize) {
  const clampedP = Math.min(0.999, Math.max(0.001, p));
  const z = getZFromAlpha(alpha);
  const base = (z * z * clampedP * (1 - clampedP)) / (E * E);
  const n0 = Math.ceil(base);
  if (!populationSize || !isFinite(populationSize) || populationSize <= 0) {
    return { n: n0, nFinite: null };
  }
  const N = populationSize;
  const nFpc = Math.ceil((n0 * N) / (n0 + N - 1));
  return { n: n0, nFinite: nFpc };
}

function computeNForMean(sigma, E, alpha, populationSize) {
  const s = Math.max(0, sigma);
  const z = getZFromAlpha(alpha);
  if (!s || !E) {
    return { n: null, nFinite: null };
  }
  const base = (z * s) / E;
  const n0 = Math.ceil(base * base);
  if (!populationSize || !isFinite(populationSize) || populationSize <= 0) {
    return { n: n0, nFinite: null };
  }
  const N = populationSize;
  const nFpc = Math.ceil((n0 * N) / (n0 + N - 1));
  return { n: n0, nFinite: nFpc };
}

function hydrateTimestamps() {
  const created = document.getElementById('created-date');
  const modified = document.getElementById('modified-date');
  if (created) created.textContent = new Date(CREATED_DATE).toLocaleDateString();
  if (modified) modified.textContent = modifiedDate;
}

function setMode(mode) {
  const nextMode = mode === Modes.MEAN ? Modes.MEAN : Modes.PROPORTION;
  SampleSizeState.mode = nextMode;
  document.querySelectorAll('.mode-button').forEach(button => {
    const isActive = button.dataset.mode === nextMode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.mode-panel').forEach(panel => {
    const isActive = panel.dataset.mode === nextMode;
    panel.classList.toggle('active', isActive);
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
  updateDesign();
}

function setupModeToggle() {
  document.querySelectorAll('.mode-button').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      setMode(button.dataset.mode);
    });
  });
  setMode(SampleSizeState.mode);
}

function reflectConfidenceButtons() {
  const alphaInput = document.getElementById('alpha');
  if (!alphaInput) return;
  const alphaVal = parseFloat(alphaInput.value);
  const conf = isFinite(alphaVal) ? 1 - alphaVal : SampleSizeState.confidenceLevel;
  document.querySelectorAll('.confidence-button').forEach(btn => {
    const level = parseFloat(btn.dataset.level);
    const isActive = isFinite(level) && Math.abs(level - conf) < 1e-6;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function setupConfidenceControls() {
  const alphaInput = document.getElementById('alpha');
  document.querySelectorAll('.confidence-button').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      const level = parseFloat(btn.dataset.level);
      if (!isFinite(level) || level <= 0 || level >= 1) return;
      SampleSizeState.confidenceLevel = level;
      SampleSizeState.alpha = 1 - level;
      if (alphaInput) {
        alphaInput.value = SampleSizeState.alpha.toFixed(3);
      }
      reflectConfidenceButtons();
      updateDesign();
    });
  });

  if (alphaInput) {
    alphaInput.addEventListener('input', () => {
      const value = parseFloat(alphaInput.value);
      if (isFinite(value) && value > 0 && value < 1) {
        SampleSizeState.alpha = value;
        SampleSizeState.confidenceLevel = 1 - value;
      }
      reflectConfidenceButtons();
      updateDesign();
    });
  }

  reflectConfidenceButtons();
}

function setupInputs() {
  const pRange = document.getElementById('prop-p-range');
  const pInput = document.getElementById('prop-p-input');
  const eRange = document.getElementById('prop-e-range');
  const eInput = document.getElementById('prop-e-input');
  const sigmaInput = document.getElementById('mean-sigma-input');
  const eMeanInput = document.getElementById('mean-e-input');
  const popInput = document.getElementById('population-size');
  const rangeMinInput = document.getElementById('mean-range-min');
  const rangeMaxInput = document.getElementById('mean-range-max');
  const rangeBtn = document.getElementById('mean-range-estimate-btn');

  if (pRange && pInput) {
    const syncProp = source => {
      const val = parseFloat(source.value);
      const clamped = isFinite(val) ? Math.min(1, Math.max(0, val)) : 0.2;
      SampleSizeState.proportion = clamped;
      pRange.value = clamped.toString();
      pInput.value = clamped.toFixed(2);
      updateDesign();
    };
    pRange.addEventListener('input', () => syncProp(pRange));
    pInput.addEventListener('input', () => syncProp(pInput));
  }

  if (eRange && eInput) {
    const syncE = source => {
      const val = parseFloat(source.value);
      const clamped = isFinite(val) ? Math.min(0.5, Math.max(0.001, val)) : 0.03;
      SampleSizeState.marginOfErrorProp = clamped;
      eRange.value = clamped.toString();
      eInput.value = clamped.toFixed(3);
      updateDesign();
    };
    eRange.addEventListener('input', () => syncE(eRange));
    eInput.addEventListener('input', () => syncE(eInput));
  }

  if (sigmaInput) {
    sigmaInput.addEventListener('input', () => {
      const val = parseFloat(sigmaInput.value);
      SampleSizeState.sigma = isFinite(val) && val >= 0 ? val : 10;
      updateDesign();
    });
  }

  if (eMeanInput) {
    eMeanInput.addEventListener('input', () => {
      const val = parseFloat(eMeanInput.value);
      SampleSizeState.marginOfErrorMean = isFinite(val) && val > 0 ? val : 2;
      updateDesign();
    });
  }

  if (popInput) {
    popInput.addEventListener('input', () => {
      const val = parseInt(popInput.value, 10);
      SampleSizeState.populationSize = isFinite(val) && val > 0 ? val : null;
      updateDesign();
    });
  }

  if (rangeBtn && rangeMinInput && rangeMaxInput && sigmaInput) {
    rangeBtn.addEventListener('click', () => {
      const minVal = parseFloat(rangeMinInput.value);
      const maxVal = parseFloat(rangeMaxInput.value);
      if (!isFinite(minVal) || !isFinite(maxVal) || maxVal <= minVal) {
        return;
      }
      const estSigma = (maxVal - minVal) / 4;
      if (!isFinite(estSigma) || estSigma <= 0) return;
      SampleSizeState.sigma = estSigma;
      sigmaInput.value = estSigma.toFixed(3);
      updateDesign();
    });
  }
}

function formatNumber(value, digits = 0) {
  if (!isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function updateMetrics() {
  const nEl = document.getElementById('metric-n');
  const nFpcEl = document.getElementById('metric-n-fpc');
  const modeEl = document.getElementById('metric-mode');
  const confEl = document.getElementById('metric-confidence');
  const precEl = document.getElementById('metric-precision');

  if (nEl) nEl.textContent = SampleSizeState.requiredN ? formatNumber(SampleSizeState.requiredN, 0) : '—';
  if (nFpcEl) {
    if (SampleSizeState.requiredNFinite && SampleSizeState.requiredNFinite !== SampleSizeState.requiredN) {
      nFpcEl.textContent = formatNumber(SampleSizeState.requiredNFinite, 0);
    } else {
      nFpcEl.textContent = '—';
    }
  }
  if (modeEl) {
    modeEl.textContent =
      SampleSizeState.mode === Modes.MEAN ? 'Single mean (continuous outcome)' : 'Single proportion (rate or share)';
  }
  if (confEl) {
    const confPercent = (SampleSizeState.confidenceLevel * 100).toFixed(1);
    confEl.textContent = `${confPercent}% confidence (alpha = ${SampleSizeState.alpha.toFixed(3)})`;
  }
  if (precEl) {
    if (SampleSizeState.mode === Modes.MEAN) {
      precEl.textContent = `±${SampleSizeState.marginOfErrorMean}`;
    } else {
      precEl.textContent = `±${(SampleSizeState.marginOfErrorProp * 100).toFixed(1)} percentage points`;
    }
  }
}

function updateNarratives() {
  const apaEl = document.getElementById('apa-report');
  const mgrEl = document.getElementById('managerial-report');
  const n = SampleSizeState.requiredN;
  if (!n || !isFinite(n)) {
    if (apaEl) {
      apaEl.textContent =
        'Provide expected variability, margin of error, and confidence level above to generate a planning statement.';
    }
    if (mgrEl) {
      mgrEl.textContent =
        'Once you enter assumptions above, this panel will explain in plain language how large a sample you need and why.';
    }
    return;
  }

  const confPct = (SampleSizeState.confidenceLevel * 100).toFixed(1);
  const nLabel = formatNumber(n, 0);
  if (SampleSizeState.mode === Modes.MEAN) {
    const apaText =
      `To estimate a single mean with a margin of error of ±${SampleSizeState.marginOfErrorMean} units at ` +
      `${confPct}% confidence, assuming a population standard deviation of approximately ` +
      `${SampleSizeState.sigma}, a minimum sample size of n = ${nLabel} is required.`;
    if (apaEl) apaEl.textContent = apaText;
    const mgrText =
      `With these settings, you would need about ${nLabel} independent observations to report an estimate that is within ` +
      `${SampleSizeState.marginOfErrorMean} units of the true average, ${confPct}% of the time. If that sample size is ` +
      `too large for your budget or timeline, you can loosen the margin of error or accept a lower confidence level.`;
    if (mgrEl) mgrEl.textContent = mgrText;
  } else {
    const moePct = (SampleSizeState.marginOfErrorProp * 100).toFixed(1);
    const pPct = (SampleSizeState.proportion * 100).toFixed(1);
    const apaText =
      `To estimate a single proportion with a margin of error of ±${moePct} percentage points at ` +
      `${confPct}% confidence, assuming an underlying proportion of approximately ${pPct}%, a minimum sample size of ` +
      `n = ${nLabel} is required.`;
    if (apaEl) apaEl.textContent = apaText;
    const mgrText =
      `Under these assumptions, you would need about ${nLabel} observations (customers, sessions, or events) to pin down ` +
      `the true rate within ±${moePct} percentage points at ${confPct}% confidence. Tighter precision or a higher ` +
      `confidence level will push this required sample size up; looser precision will bring it down.`;
    if (mgrEl) mgrEl.textContent = mgrText;
  }
}

function buildMarginCurve() {
  const points = [];
  const alpha = SampleSizeState.alpha;
  const pop = SampleSizeState.populationSize;
  if (SampleSizeState.mode === Modes.MEAN) {
    const baseE = SampleSizeState.marginOfErrorMean || 1;
    const minE = Math.max(baseE / 3, baseE * 0.25);
    const maxE = baseE * 3;
    const steps = 25;
    for (let i = 0; i <= steps; i++) {
      const E = minE + (i * (maxE - minE)) / steps;
      const { n } = computeNForMean(SampleSizeState.sigma, E, alpha, pop);
      if (n && isFinite(n)) points.push({ E, n });
    }
  } else {
    const baseE = SampleSizeState.marginOfErrorProp || 0.03;
    const minE = Math.max(baseE / 3, 0.005);
    const maxE = Math.min(baseE * 3, 0.25);
    const steps = 25;
    for (let i = 0; i <= steps; i++) {
      const E = minE + (i * (maxE - minE)) / steps;
      const { n } = computeNForProportion(SampleSizeState.proportion, E, alpha, pop);
      if (n && isFinite(n)) points.push({ E, n });
    }
  }
  return points;
}

function buildOtherCurve() {
  const points = [];
  const pop = SampleSizeState.populationSize;
  if (SampleSizeState.mode === Modes.MEAN) {
    const baseSigma = SampleSizeState.sigma || 10;
    const minS = Math.max(baseSigma / 3, 0.01);
    const maxS = baseSigma * 3;
    const steps = 25;
    for (let i = 0; i <= steps; i++) {
      const s = minS + (i * (maxS - minS)) / steps;
      const { n } = computeNForMean(s, SampleSizeState.marginOfErrorMean, SampleSizeState.alpha, pop);
      if (n && isFinite(n)) points.push({ x: s, n });
    }
    return { label: 'Assumed standard deviation', points };
  }
  // Proportion mode: vary expected proportion p to see its impact on n
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const p = 0.05 + (i * (0.9)) / steps; // from 0.05 to 0.95
    const { n } = computeNForProportion(p, SampleSizeState.marginOfErrorProp, SampleSizeState.alpha, pop);
    if (n && isFinite(n)) points.push({ x: p, n });
  }
  return { label: 'Expected proportion', points };
}

function buildConfidenceCurve() {
  const points = [];
  const pop = SampleSizeState.populationSize;
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const conf = 0.80 + (i * (0.99 - 0.80)) / steps;
    const alpha = 1 - conf;
    let n;
    if (SampleSizeState.mode === Modes.MEAN) {
      n = computeNForMean(SampleSizeState.sigma, SampleSizeState.marginOfErrorMean, alpha, pop).n;
    } else {
      n = computeNForProportion(SampleSizeState.proportion, SampleSizeState.marginOfErrorProp, alpha, pop).n;
    }
    if (n && isFinite(n)) points.push({ x: conf, n });
  }
  return points;
}

function renderMarginChart() {
  const container = document.getElementById('chart-margin');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildMarginCurve();
  if (!points.length) {
    Plotly.purge(container);
    return;
  }
  const x = points.map(p => p.E);
  const y = points.map(p => p.n);
  let currentE;
  if (SampleSizeState.mode === Modes.MEAN) {
    currentE = SampleSizeState.marginOfErrorMean;
  } else {
    currentE = SampleSizeState.marginOfErrorProp;
  }
  const currentIndex = points.reduce(
    (bestIdx, p, idx) =>
      Math.abs(p.E - currentE) < Math.abs(points[bestIdx].E - currentE) ? idx : bestIdx,
    0
  );

  const traceLine = {
    x,
    y,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#2563eb' },
    marker: { size: 6 },
    hovertemplate: 'Margin of error: %{x:.4f}<br>Required n: %{y:.0f}<extra></extra>'
  };
    const tracePoint = {
      x: [points[currentIndex].E],
      y: [points[currentIndex].n],
      type: 'scatter',
      mode: 'markers',
      marker: { color: '#dc2626', size: 12 },
      hovertemplate: 'Current design<br>Margin of error: %{x:.4f}<br>Required n: %{y:.0f}<extra></extra>'
    };

  const xTitle =
    SampleSizeState.mode === Modes.MEAN
      ? 'Margin of error (outcome units)'
      : 'Margin of error (absolute proportion)';

  Plotly.newPlot(
    container,
    [traceLine, tracePoint],
    {
      margin: { t: 20, r: 20, b: 60, l: 70 },
      xaxis: { title: xTitle, tickformat: SampleSizeState.mode === Modes.MEAN ? '.2f' : '.3f' },
      yaxis: { title: 'Required sample size n', rangemode: 'tozero' },
      showlegend: false
    },
    { responsive: true }
  );
}

function renderOtherChart() {
  const container = document.getElementById('chart-other');
  if (!container || typeof Plotly === 'undefined') return;
  const { label, points } = buildOtherCurve();
  if (!points.length) {
    Plotly.purge(container);
    return;
  }
  const x = points.map(p => p.x);
  const y = points.map(p => p.n);

  const trace = {
    x,
    y,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#059669' },
    marker: { size: 6 },
    hovertemplate:
      SampleSizeState.mode === Modes.MEAN
        ? 'Assumed σ: %{x:.2f}<br>Required n: %{y:.0f}<extra></extra>'
        : 'Expected p: %{x:.2f}<br>Required n: %{y:.0f}<extra></extra>'
  };

  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 20, r: 20, b: 60, l: 70 },
      xaxis: {
        title: SampleSizeState.mode === Modes.MEAN ? 'Assumed standard deviation σ' : 'Expected proportion p',
        tickformat: '.2f'
      },
      yaxis: { title: 'Required sample size n', rangemode: 'tozero' },
      showlegend: false
    },
    { responsive: true }
  );
}

function renderConfidenceChart() {
  const container = document.getElementById('chart-confidence');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildConfidenceCurve();
  if (!points.length) {
    Plotly.purge(container);
    return;
  }
  const x = points.map(p => p.x);
  const y = points.map(p => p.n);

  const trace = {
    x,
    y,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#7c3aed' },
    marker: { size: 6 },
    hovertemplate: 'Confidence: %{x:.3f}<br>Required n: %{y:.0f}<extra></extra>'
  };

  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 20, r: 20, b: 60, l: 70 },
      xaxis: {
        title: 'Confidence level',
        tickformat: '.2f'
      },
      yaxis: { title: 'Required sample size n', rangemode: 'tozero' },
      showlegend: false
    },
    { responsive: true }
  );
}

// Add a highlighted point for the current variability setting
function highlightCurrentOnOtherChart() {
  const container = document.getElementById('chart-other');
  if (!container || typeof Plotly === 'undefined') return;
  const { points } = buildOtherCurve();
  if (!points || !points.length) return;

  let currentX;
  if (SampleSizeState.mode === Modes.MEAN) {
    currentX = SampleSizeState.sigma;
  } else {
    currentX = SampleSizeState.proportion;
  }
  const currentIndex = points.reduce(
    (bestIdx, p, idx) =>
      Math.abs(p.x - currentX) < Math.abs(points[bestIdx].x - currentX) ? idx : bestIdx,
    0
  );
  const p = points[currentIndex];
  const hovertemplate =
    SampleSizeState.mode === Modes.MEAN
      ? 'Current design<br>Assumed σ: %{x:.2f}<br>Required n: %{y:.0f}<extra></extra>'
      : 'Current design<br>Expected p: %{x:.2f}<br>Required n: %{y:.0f}<extra></extra>';

    Plotly.addTraces(container, {
      x: [p.x],
      y: [p.n],
      type: 'scatter',
      mode: 'markers',
      marker: { color: '#dc2626', size: 16 },
      hovertemplate
    });
}

// Add a highlighted point for the current confidence setting
function highlightCurrentOnConfidenceChart() {
  const container = document.getElementById('chart-confidence');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildConfidenceCurve();
  if (!points || !points.length) return;

  const currentConf = SampleSizeState.confidenceLevel;
  const currentIndex = points.reduce(
    (bestIdx, p, idx) =>
      Math.abs(p.x - currentConf) < Math.abs(points[bestIdx].x - currentConf) ? idx : bestIdx,
    0
  );
  const p = points[currentIndex];

  Plotly.addTraces(container, {
    x: [p.x],
    y: [p.n],
    type: 'scatter',
    mode: 'markers',
    marker: { color: '#dc2626', size: 16 },
    hovertemplate:
        'Current design<br>Confidence: %{x:.3f}<br>Required n: %{y:.0f}<extra></extra>'
  });
}

function updateDesign() {
  const pop = SampleSizeState.populationSize;
  if (SampleSizeState.mode === Modes.MEAN) {
    const { n, nFinite } = computeNForMean(
      SampleSizeState.sigma,
      SampleSizeState.marginOfErrorMean,
      SampleSizeState.alpha,
      pop
    );
    SampleSizeState.requiredN = n;
    SampleSizeState.requiredNFinite = nFinite;
  } else {
    const { n, nFinite } = computeNForProportion(
      SampleSizeState.proportion,
      SampleSizeState.marginOfErrorProp,
      SampleSizeState.alpha,
      pop
    );
    SampleSizeState.requiredN = n;
    SampleSizeState.requiredNFinite = nFinite;
  }
  updateMetrics();
  updateNarratives();
  renderMarginChart();
  renderOtherChart();
  highlightCurrentOnOtherChart();
  renderConfidenceChart();
  highlightCurrentOnConfidenceChart();

  hasSuccessfulRun = true;
  checkAndTrackUsage();
}

function updateScenarioDownload(dataset) {
  const btn = document.getElementById('scenario-download');
  if (!btn) return;
  if (!dataset) {
    btn.classList.add('hidden');
    btn.disabled = true;
    btn.dataset.filename = '';
    btn.dataset.content = '';
    return;
  }
  btn.classList.remove('hidden');
  btn.disabled = false;
  btn.dataset.filename = dataset.filename;
  btn.dataset.content = dataset.content;
}

function setupScenarioDownload() {
  const btn = document.getElementById('scenario-download');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const filename = btn.dataset.filename || 'scenario_notes.txt';
    const content =
      btn.dataset.content ||
      'This is a placeholder scenario notes file. You can attach more detailed planning notes or pilot summaries here.';
    if (typeof downloadTextFile === 'function') {
      downloadTextFile(filename, content, { mimeType: 'text/plain' });
    }
  });
}

function setupScenarioSelect() {
  const select = document.getElementById('scenario-select');
  const desc = document.getElementById('scenario-description');
  if (!select || !desc) return;

  PlanningScenarios.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    const scenario = PlanningScenarios.find(s => s.id === select.value);
    if (!scenario) {
      desc.innerHTML =
        '<p>Use presets to explore common marketing questions, or leave this on Manual to configure your own design.</p>';
      updateScenarioDownload(null);
      return;
    }
    if (scenario.mode === Modes.MEAN) {
      setMode(Modes.MEAN);
      if (typeof scenario.settings.sigma === 'number') {
        SampleSizeState.sigma = scenario.settings.sigma;
        const sigmaInput = document.getElementById('mean-sigma-input');
        if (sigmaInput) sigmaInput.value = scenario.settings.sigma;
      }
      if (typeof scenario.settings.marginOfErrorMean === 'number') {
        SampleSizeState.marginOfErrorMean = scenario.settings.marginOfErrorMean;
        const eMeanInput = document.getElementById('mean-e-input');
        if (eMeanInput) eMeanInput.value = scenario.settings.marginOfErrorMean;
      }
    } else {
      setMode(Modes.PROPORTION);
      if (typeof scenario.settings.proportion === 'number') {
        SampleSizeState.proportion = scenario.settings.proportion;
        const pRange = document.getElementById('prop-p-range');
        const pInput = document.getElementById('prop-p-input');
        if (pRange) pRange.value = scenario.settings.proportion.toString();
        if (pInput) pInput.value = scenario.settings.proportion.toFixed(2);
      }
      if (typeof scenario.settings.marginOfErrorProp === 'number') {
        SampleSizeState.marginOfErrorProp = scenario.settings.marginOfErrorProp;
        const eRange = document.getElementById('prop-e-range');
        const eInput = document.getElementById('prop-e-input');
        if (eRange) eRange.value = scenario.settings.marginOfErrorProp.toString();
        if (eInput) eInput.value = scenario.settings.marginOfErrorProp.toFixed(3);
      }
    }
    if (typeof scenario.settings.confidenceLevel === 'number') {
      SampleSizeState.confidenceLevel = scenario.settings.confidenceLevel;
      SampleSizeState.alpha = scenario.settings.alpha || 1 - scenario.settings.confidenceLevel;
      const alphaInput = document.getElementById('alpha');
      if (alphaInput) alphaInput.value = SampleSizeState.alpha.toFixed(3);
      reflectConfidenceButtons();
    }
    if (typeof scenario.settings.populationSize === 'number') {
      SampleSizeState.populationSize = scenario.settings.populationSize;
      const popInput = document.getElementById('population-size');
      if (popInput) popInput.value = scenario.settings.populationSize;
    } else {
      SampleSizeState.populationSize = null;
      const popInput = document.getElementById('population-size');
      if (popInput) popInput.value = '';
    }

    desc.innerHTML = `<p>${scenario.description}</p>`;
    updateScenarioDownload({
      filename: `${scenario.id}_notes.txt`,
      content: scenario.description
    });
    updateDesign();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  hydrateTimestamps();
  setupModeToggle();
  setupConfidenceControls();
  setupInputs();
  setupScenarioSelect();
  setupScenarioDownload();
  updateDesign();
});
