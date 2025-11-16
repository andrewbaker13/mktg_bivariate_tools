// Minimal placeholder logic so designers can preview interactivity before wiring real stats.
const CREATED_DATE = '2025-11-15';
let modifiedDate = new Date().toLocaleDateString();

const PLACEHOLDER_SCENARIOS = [
  {
    id: 'scenario-1',
    label: 'Awareness vs consideration lift',
    description: 'Demonstrates how the template can auto-fill paired metrics (e.g., aided awareness vs brand consideration) for a correlation or mean-difference test.'
  },
  {
    id: 'scenario-2',
    label: 'Campaign response by audience',
    description: 'Shows how categorical inputs (e.g., Chi-square) could pre-populate counts to test whether audiences behave differently across creatives.'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  hydrateTimestamps();
  setupScenarioSelect();
  setupConfidenceButtons();
  setupAlphaInput();
  setupVisualSettings();
  setupFileUpload();
  renderPlaceholderFanChart();
  renderPlaceholderStackedChart();
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
  const downloadBtn = document.getElementById('scenario-download');
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
      description.innerHTML = '<p>Introduce how presets work (auto-loading text, inputs, and visual descriptions).</p>';
      if (downloadBtn) {
        downloadBtn.classList.add('hidden');
        downloadBtn.disabled = true;
      }
      return;
    }
    description.innerHTML = `<p>${selected.description}</p>`;
    if (downloadBtn) {
      downloadBtn.classList.remove('hidden');
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Download scenario text';
    }
  });
}

function setupConfidenceButtons() {
  document.querySelectorAll('.confidence-button').forEach(button => {
    button.addEventListener('click', () => {
      const level = parseFloat(button.dataset.level);
      if (!isFinite(level)) return;
      document.querySelectorAll('.confidence-button').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const alphaInput = document.getElementById('alpha');
      if (alphaInput) {
        alphaInput.value = (1 - level).toFixed(3);
      }
      modifiedDate = new Date().toLocaleDateString();
      hydrateTimestamps();
    });
  });
}

function setupAlphaInput() {
  const alphaInput = document.getElementById('alpha');
  if (!alphaInput) return;
  alphaInput.addEventListener('change', () => {
    const value = parseFloat(alphaInput.value);
    if (!isFinite(value)) return;
    const targetLevel = 1 - value;
    document.querySelectorAll('.confidence-button').forEach(btn => {
      const level = parseFloat(btn.dataset.level);
      btn.classList.toggle('active', Math.abs(level - targetLevel) < 1e-6);
    });
  });
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

function setupFileUpload() {
  const dropzone = document.getElementById('template-dropzone');
  const browseButton = document.getElementById('template-browse');
  const fileInput = document.getElementById('template-file-input');
  const feedback = document.getElementById('template-file-feedback');
  if (!dropzone || !fileInput) return;

  const showFeedback = (message, status = 'success') => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove('error');
    if (status === 'error') {
      feedback.classList.add('error');
    }
  };

  const clearFeedback = () => {
    if (feedback) feedback.textContent = '';
  };

  const handleFiles = files => {
    const [file] = files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const { headers, rows } = parseDelimitedText(text, null, { maxRows: MAX_UPLOAD_ROWS });
        showFeedback(`Loaded ${rows.length} row(s) with ${headers.length} column(s). Replace this logic with tool-specific parsing.`);
      } catch (error) {
        showFeedback(error.message || 'Unable to parse file.', 'error');
      }
    };
    reader.onerror = () => showFeedback('Unable to read file.', 'error');
    reader.readAsText(file);
  };

  dropzone.addEventListener('dragover', event => {
    event.preventDefault();
    dropzone.classList.add('drag-active');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
  dropzone.addEventListener('drop', event => {
    event.preventDefault();
    dropzone.classList.remove('drag-active');
    handleFiles(event.dataTransfer.files);
  });
  dropzone.addEventListener('click', () => fileInput.click());
  if (browseButton) {
    browseButton.addEventListener('click', event => {
      event.preventDefault();
      fileInput.click();
    });
  }
  fileInput.addEventListener('change', () => {
    clearFeedback();
    handleFiles(fileInput.files);
    fileInput.value = '';
  });
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
