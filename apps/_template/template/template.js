// Minimal placeholder logic so designers can preview interactivity before wiring real stats.
const CREATED_DATE = '2025-11-15';
let modifiedDate = new Date().toLocaleDateString();

const PLACEHOLDER_SUMMARY_TEMPLATE = [
  'group,conversions,sample_size,delta0,alpha,notes',
  'Control,182,1250,5,0.05,"Evergreen CTA from last quarter"',
  'Variant,211,1240,5,0.05,"New hero message emphasizing savings"'
].join('\n');

const PLACEHOLDER_RAW_TEMPLATE = [
  'group,value,channel,note',
  'Control,0,instagram,"Swipe dismissed"',
  'Control,1,instagram,"Swipe converted"',
  'Control,0,facebook,"Visitor bounced"',
  'Control,1,facebook,"Converted after reminder"',
  'Variant,1,instagram,"Converted within session"',
  'Variant,1,facebook,"Converted after retargeting"',
  'Variant,0,facebook,"Saw reminder, no conversion"',
  'Variant,1,email,"Converted immediately"',
  'Variant,0,email,"Clicked but no purchase"'
].join('\n');

const PLACEHOLDER_SCENARIOS = [
  {
    id: 'scenario-1',
    label: 'Awareness vs consideration lift',
    description: 'Demonstrates how the template can auto-fill paired metrics (e.g., aided awareness vs brand consideration) for a correlation or mean-difference test.',
    dataset: {
      filename: 'scenario-1_summary_inputs.csv',
      content: PLACEHOLDER_SUMMARY_TEMPLATE
    }
  },
  {
    id: 'scenario-2',
    label: 'Campaign response by audience',
    description: 'Shows how categorical inputs (e.g., Chi-square) could pre-populate counts to test whether audiences behave differently across creatives.',
    dataset: {
      filename: 'scenario-2_raw_data.csv',
      content: PLACEHOLDER_RAW_TEMPLATE
    }
  }
];

const DataEntryModes = {
  MANUAL: 'manual',
  SUMMARY: 'summary-upload',
  RAW: 'raw-upload'
};

let activeDataEntryMode = DataEntryModes.MANUAL;
let activeScenarioDataset = null;
let lastUploadedNumericDataset = null;
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
  setupVisualSettings();
  setupTemplateDownloadResults();
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
      if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
        window.UIUtils.renderScenarioDescription({
          containerId: 'scenario-description',
          title: '',
          description: '',
          defaultHtml: '<p>Introduce how presets work (auto-loading text, inputs, and visual descriptions).</p>'
        });
      } else {
        description.innerHTML = '<p>Introduce how presets work (auto-loading text, inputs, and visual descriptions).</p>';
      }
      updateScenarioDownload(null);
      return;
    }
    if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
      window.UIUtils.renderScenarioDescription({
        containerId: 'scenario-description',
        title: selected.label,
        description: selected.description,
        defaultHtml: '<p>Introduce how presets work (auto-loading text, inputs, and visual descriptions).</p>'
      });
    } else {
      description.innerHTML = `<p>${selected.description}</p>`;
    }
    updateScenarioDownload(selected.dataset || null);
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
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = reader.result;
          const { headers, rows } = parseDelimitedText(text, null, { maxRows: MAX_UPLOAD_ROWS });
          lastUploadedNumericDataset = { headers, rows };
          setFeedback(
            `Loaded ${rows.length} row(s) with ${headers.length} column(s). Replace with tool-specific ingestion.`,
            'success'
          );
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

function setupTemplateDownloadResults() {
  const button = document.getElementById('template-download-results');
  if (!button) return;

  button.addEventListener('click', event => {
    event.preventDefault();
    if (!lastUploadedNumericDataset || !Array.isArray(lastUploadedNumericDataset.rows) || !lastUploadedNumericDataset.rows.length) {
      alert('Upload a numeric CSV in the summary or raw panels before downloading the analysis-ready dataset.');
      return;
    }
    const { headers, rows } = lastUploadedNumericDataset;
    const lines = [headers.join(',')].concat(
      rows.map(row => row.map(value => (Number.isFinite(value) ? String(value) : '')).join(','))
    );
    downloadTextFile('template_analysis_dataset.csv', lines.join('\n'), { mimeType: 'text/csv' });
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
