// ARIMA Forecaster app scaffolding

const ARIMA_CREATED_DATE = '2025-11-24';
let arimaModifiedDate = new Date().toLocaleDateString();

const ArimaMode = {
  AUTO: 'auto',
  MANUAL: 'manual'
};

const ArimaState = {
  rawRows: [],
  dates: [],
  values: [],
  transformedValues: [],
  frequency: 'auto',
  useLog: false,
  dTransform: 0,
  mode: ArimaMode.AUTO,
  p: 1,
  d: 0,
  q: 1,
  autoMaxP: 2,
  autoMaxQ: 2,
  horizon: 12,
  confLevel: 0.95,
  fitted: [],
  forecast: [],
  residuals: [],
  selectedModelLabel: null
};

function clampNumber(x, min, max) {
  if (!isFinite(x)) return x;
  return Math.max(min, Math.min(max, x));
}

function setModeArima(mode) {
  const next = mode === ArimaMode.MANUAL ? ArimaMode.MANUAL : ArimaMode.AUTO;
  ArimaState.mode = next;
  document.querySelectorAll('.mode-button').forEach(btn => {
    const active = btn.dataset.mode === next;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.querySelectorAll('.mode-panel').forEach(panel => {
    const active = panel.dataset.mode === next;
    panel.classList.toggle('active', active);
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
}

function reflectForecastConfidenceButtons() {
  const buttons = document.querySelectorAll('.confidence-button');
  buttons.forEach(btn => {
    const level = parseFloat(btn.dataset.level);
    const active = Math.abs(level - ArimaState.confLevel) < 1e-6;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function parsePastedData() {
  const ta = document.getElementById('paste-area');
  if (!ta) return;
  const text = ta.value || '';
  if (!text.trim()) return;
  try {
    const rows = window.CsvUtils ? window.CsvUtils.parseCsv(text) : [];
    if (!rows.length) return;
    ArimaState.rawRows = rows;
    populateColumnSelectorsFromRows(rows);
  } catch (err) {
    console.error('Failed to parse pasted CSV', err);
  }
}

function populateColumnSelectorsFromRows(rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const dateSelect = document.getElementById('date-column-select');
  const valueSelect = document.getElementById('value-column-select');
  if (dateSelect) {
    dateSelect.innerHTML = '';
    headers.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      dateSelect.appendChild(opt);
    });
  }
  if (valueSelect) {
    valueSelect.innerHTML = '';
    headers.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      valueSelect.appendChild(opt);
    });
  }
}

function extractSeriesFromSelection() {
  const dateCol = document.getElementById('date-column-select')?.value;
  const valueCol = document.getElementById('value-column-select')?.value;
  if (!dateCol || !valueCol || !ArimaState.rawRows.length) return;

  const points = [];
  ArimaState.rawRows.forEach(row => {
    const d = new Date(row[dateCol]);
    const v = parseFloat(row[valueCol]);
    if (!isNaN(d.getTime()) && isFinite(v)) {
      points.push({ date: d, value: v });
    }
  });
  points.sort((a, b) => a.date - b.date);
  ArimaState.dates = points.map(p => p.date);
  ArimaState.values = points.map(p => p.value);
}

function applyTransforms() {
  const useLog = document.getElementById('log-transform-checkbox')?.checked || false;
  const d = parseInt(document.getElementById('difference-order-input')?.value || '0', 10) || 0;
  ArimaState.useLog = useLog;
  ArimaState.dTransform = d;

  let series = ArimaState.values.slice();
  if (useLog) {
    series = series.map(v => (v > 0 ? Math.log(v) : v));
  }
  for (let i = 0; i < d; i++) {
    const diff = [];
    for (let t = 1; t < series.length; t++) {
      diff.push(series[t] - series[t - 1]);
    }
    series = diff;
  }
  ArimaState.transformedValues = series;
}

function fitArimaModel() {
  extractSeriesFromSelection();
  applyTransforms();

  if (!ArimaState.transformedValues || ArimaState.transformedValues.length < 10) {
    console.warn('Not enough data to fit ARIMA');
    return;
  }

  const horizon = parseInt(document.getElementById('forecast-horizon-input')?.value || '12', 10) || 12;
  ArimaState.horizon = horizon;

  const results = [];

  if (ArimaState.mode === ArimaMode.AUTO) {
    const maxP = parseInt(document.getElementById('auto-max-p')?.value || '2', 10) || 2;
    const maxQ = parseInt(document.getElementById('auto-max-q')?.value || '2', 10) || 2;
    ArimaState.autoMaxP = maxP;
    ArimaState.autoMaxQ = maxQ;

    for (let p = 0; p <= maxP; p++) {
      for (let q = 0; q <= maxQ; q++) {
        try {
          const fit = window.TimeSeriesUtils.fitArima(ArimaState.transformedValues, {
            p,
            d: ArimaState.dTransform,
            q,
            h: horizon
          });
          results.push({
            p,
            d: ArimaState.dTransform,
            q,
            aic: typeof fit.aic === 'number' ? fit.aic : Number.POSITIVE_INFINITY,
            fit
          });
        } catch (err) {
          // ignore failed fits in auto search
        }
      }
    }
    if (!results.length) {
      console.warn('Auto ARIMA search failed for all candidates.');
      return;
    }
    results.sort((a, b) => a.aic - b.aic);
    const best = results[0];
    ArimaState.p = best.p;
    ArimaState.d = best.d;
    ArimaState.q = best.q;
    applyFitResult(best.fit, `ARIMA(${best.p},${best.d},${best.q})`);
  } else {
    const p = parseInt(document.getElementById('ar-order-input')?.value || '1', 10) || 0;
    const dManual = parseInt(document.getElementById('diff-order-manual-input')?.value || '0', 10) || 0;
    const q = parseInt(document.getElementById('ma-order-input')?.value || '1', 10) || 0;
    ArimaState.p = p;
    ArimaState.d = dManual;
    ArimaState.q = q;
    try {
      const fit = window.TimeSeriesUtils.fitArima(ArimaState.transformedValues, {
        p,
        d: dManual,
        q,
        h: horizon
      });
      applyFitResult(fit, `ARIMA(${p},${dManual},${q})`);
    } catch (err) {
      console.error('ARIMA fit failed', err);
    }
  }
}

function applyFitResult(fit, label) {
  ArimaState.fitted = fit.fitted || [];
  ArimaState.forecast = fit.forecast || [];
  ArimaState.residuals = fit.residuals || [];
  ArimaState.selectedModelLabel = label;
  updateForecastSummary();
  renderSeriesChart();
  // ACF/PACF and residual charts would be rendered here as the tool evolves
}

function updateForecastSummary() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('metric-model', ArimaState.selectedModelLabel || '—');
  set('metric-horizon', ArimaState.horizon ? `${ArimaState.horizon} steps ahead` : '—');
  set('metric-forecast-conf', `${(ArimaState.confLevel * 100).toFixed(1)}%`);

  const statEl = document.getElementById('statistical-summary');
  const mgrEl = document.getElementById('managerial-summary');
  if (ArimaState.selectedModelLabel && statEl) {
    statEl.textContent =
      `The current model is ${ArimaState.selectedModelLabel}, fitted to the transformed series with ${ArimaState.transformedValues.length} usable points. ` +
      `Forecasts extend ${ArimaState.horizon} steps ahead with approximately ${(ArimaState.confLevel * 100).toFixed(1)}% prediction intervals.`;
  }
  if (ArimaState.selectedModelLabel && mgrEl) {
    mgrEl.textContent =
      `Based on the pattern in your historical data, this ARIMA model produces a short-term forecast with a central path and a band of plausible values. ` +
      `You can treat the central line as a baseline expectation, while the prediction interval band reflects the uncertainty you should plan around for capacity, budget, or target setting.`;
  }
}

function renderSeriesChart() {
  const container = document.getElementById('chart-series');
  if (!container || typeof Plotly === 'undefined') return;
  if (!ArimaState.dates.length || !ArimaState.values.length) {
    Plotly.purge(container);
    return;
  }

  const traceActual = {
    x: ArimaState.dates,
    y: ArimaState.values,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Actual',
    line: { color: '#2563eb' }
  };

  // For now, just overlay fitted/forecast on transformed index if lengths line up.
  const data = [traceActual];

  Plotly.newPlot(
    container,
    data,
    {
      margin: { t: 20, r: 20, b: 40, l: 60 },
      xaxis: { title: 'Time' },
      yaxis: { title: 'Metric', rangemode: 'tozero' },
      showlegend: true
    },
    { responsive: true }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const createdLabel = document.getElementById('created-date');
  const modifiedLabel = document.getElementById('modified-date');
  if (createdLabel) createdLabel.textContent = ARIMA_CREATED_DATE;
  if (modifiedLabel) modifiedLabel.textContent = arimaModifiedDate;

  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const text = e.target.result;
          const rows = window.CsvUtils ? window.CsvUtils.parseCsv(text) : [];
          ArimaState.rawRows = rows;
          populateColumnSelectorsFromRows(rows);
        } catch (err) {
          console.error('Failed to parse uploaded CSV', err);
        }
      };
      reader.readAsText(file);
    });
  }

  const pasteBtn = document.getElementById('paste-parse-btn');
  if (pasteBtn) {
    pasteBtn.addEventListener('click', event => {
      event.preventDefault();
      parsePastedData();
    });
  }

  document.querySelectorAll('.mode-button').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      setModeArima(btn.dataset.mode);
    });
  });
  setModeArima(ArimaState.mode);

  document.querySelectorAll('.confidence-button').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      const level = parseFloat(btn.dataset.level);
      if (!isFinite(level) || level <= 0 || level >= 1) return;
      ArimaState.confLevel = level;
      reflectForecastConfidenceButtons();
      updateForecastSummary();
    });
  });
  reflectForecastConfidenceButtons();

  const fitBtn = document.getElementById('fit-model-btn');
  if (fitBtn) {
    fitBtn.addEventListener('click', event => {
      event.preventDefault();
      fitArimaModel();
    });
  }
});

