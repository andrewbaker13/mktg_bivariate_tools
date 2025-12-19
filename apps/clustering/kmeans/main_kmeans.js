// k-Means Clustering Explorer – interactive behavior

const TOOL_SLUG = 'kmeans-clustering';
const CREATED_DATE = '2025-11-21';
let modifiedDate = new Date().toLocaleDateString();

const DataSourceModes = {
  UPLOAD: 'upload',
  DEMO: 'demo'
};

let activeDataSourceMode = DataSourceModes.UPLOAD;

// In-memory dataset
let currentHeaders = [];
let currentRows = []; // numeric matrix [n][p]
let currentFeatureNames = [];
let selectedFeatureNames = [];

// Scenario state
let activeScenario = null;
let activeScenarioCsv = null;
let lastClusteringState = null;

// Cluster visualization
const CLUSTER_COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf'
];

const MAX_SILHOUETTE_POINTS = 400;

const ScaleModes = {
  NONE: 'none',
  ZSCORE: 'zscore',
  MINMAX: 'minmax'
};

// -------------------- Bootstrapping --------------------

document.addEventListener('DOMContentLoaded', () => {
  hydrateTimestamps();
  setupScenarioSelect();
  setupScenarioDownload();
  setupDataSourceModeToggle();
  setupUpload();
  setupDemoLoader();
  setupRunButton();
  setupDownloadResultsButton();
  
  // Initialize engagement tracking
  if (typeof initEngagementTracking === 'function') {
    initEngagementTracking(TOOL_SLUG);
  }
});

function hydrateTimestamps() {
  const created = document.getElementById('created-date');
  const modified = document.getElementById('modified-date');
  if (created) created.textContent = new Date(CREATED_DATE).toLocaleDateString();
  if (modified) modified.textContent = modifiedDate;
}

function stampModified() {
  modifiedDate = new Date().toLocaleDateString();
  hydrateTimestamps();
}

// -------------------- Scenarios --------------------

const KMEANS_SCENARIOS = [
  {
    id: 'customer-value-engagement',
    label: 'Customer value & engagement (3 segments)',
    description:
      'Synthetic dataset with three customer segments varying on annual spend, visits per month, and email open rate.',
    generate: generateDemoCustomerData
  }
];

function setupScenarioSelect() {
  const select = document.getElementById('scenario-select');
  if (!select) return;

  KMEANS_SCENARIOS.forEach(entry => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.label;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const selected = KMEANS_SCENARIOS.find(s => s.id === select.value);
    if (!selected) {
      activeScenario = null;
      activeScenarioCsv = null;
      if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
        window.UIUtils.renderScenarioDescription({
          containerId: 'scenario-description',
          title: '',
          description: '',
          defaultHtml:
            '<p>Use presets to load example segmentation datasets, then adjust the number of clusters and variables.</p>'
        });
      }
      updateScenarioDownloadButton();
      return;
    }

    const data = selected.generate();
    activeScenario = selected;
    activeScenarioCsv = data.csvText || null;
    loadDataset(data.headers, data.rows, { sourceLabel: 'scenario' });

    if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
      window.UIUtils.renderScenarioDescription({
        containerId: 'scenario-description',
        title: selected.label,
        description: selected.description
      });
    }
    updateScenarioDownloadButton();
    
    // Track scenario loading
    if (typeof markScenarioLoaded === 'function') {
      markScenarioLoaded(selected.label);
    }
  });
}

function setupScenarioDownload() {
  const button = document.getElementById('scenario-download');
  if (!button) return;

  button.addEventListener('click', event => {
    event.preventDefault();
    if (!activeScenario || !activeScenarioCsv) return;
    const filename = `${activeScenario.id || 'kmeans_scenario'}.csv`;
    downloadTextFile(filename, activeScenarioCsv, { mimeType: 'text/csv' });
  });

  updateScenarioDownloadButton();
}

function updateScenarioDownloadButton() {
  const button = document.getElementById('scenario-download');
  if (!button) return;
  const enabled = !!(activeScenario && activeScenarioCsv);
  button.disabled = !enabled;
  button.classList.toggle('hidden', !enabled);
}

function generateDemoCustomerData() {
  const headers = ['annual_spend', 'visits_per_month', 'email_open_rate'];
  const rows = [];
  const nPerCluster = 150;

  const addCluster = (n, means, sds) => {
    for (let i = 0; i < n; i++) {
      rows.push(means.map((m, idx) => m + randomNormal(0, sds[idx])));
    }
  };

  // Low value / low engagement
  addCluster(nPerCluster, [250, 1.2, 0.10], [40, 0.3, 0.02]);
  // Mid value / mid engagement
  addCluster(nPerCluster, [650, 2.5, 0.22], [60, 0.4, 0.03]);
  // High value / high engagement
  addCluster(nPerCluster, [1500, 4.5, 0.38], [120, 0.6, 0.04]);

  const csvLines = [headers.join(',')].concat(
    rows.map(row => row.map(v => v.toFixed(3)).join(','))
  );

  return { headers, rows, csvText: csvLines.join('\n') };
}

// -------------------- Data source toggle & loading --------------------

function setupDataSourceModeToggle() {
  const buttons = document.querySelectorAll('.mode-toggle .mode-button');
  const panels = document.querySelectorAll('.mode-panels .mode-panel');
  if (!buttons.length || !panels.length) return;

  const setMode = mode => {
    activeDataSourceMode = mode;
    buttons.forEach(btn => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    panels.forEach(panel => {
      const isActive = panel.dataset.mode === mode;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });
  };

  buttons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const mode = button.dataset.mode;
      if (mode && mode !== activeDataSourceMode) setMode(mode);
    });
  });

  setMode(activeDataSourceMode);
}

function setupUpload() {
  const feedback = document.getElementById('kmeans-raw-feedback');

  const setFeedback = (message, status) => {
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (status) feedback.classList.add(status);
  };

  const handleFile = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const { headers, rows } = parseDelimitedText(text, null, { maxRows: MAX_UPLOAD_ROWS });
        loadDataset(headers, rows, { sourceLabel: 'upload' });
        setFeedback(
          `Loaded ${rows.length} row(s) with ${headers.length} column(s). All columns are treated as numeric features.`,
          'success'
        );
        
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

  if (window.UIUtils && typeof window.UIUtils.initDropzone === 'function') {
    window.UIUtils.initDropzone({
      dropzoneId: 'kmeans-raw-dropzone',
      inputId: 'kmeans-raw-input',
      browseId: 'kmeans-raw-browse',
      onFile: handleFile,
      onError: message => setFeedback(message, 'error')
    });
  }
}

function setupDemoLoader() {
  const button = document.getElementById('kmeans-load-demo');
  const feedback = document.getElementById('kmeans-demo-feedback');
  if (!button) return;

  const setFeedback = (message, status) => {
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (status) feedback.classList.add(status);
  };

  button.addEventListener('click', event => {
    event.preventDefault();
    const demo = generateDemoCustomerData();
    activeScenario = KMEANS_SCENARIOS[0];
    activeScenarioCsv = demo.csvText;
    loadDataset(demo.headers, demo.rows, { sourceLabel: 'demo' });
    setFeedback(
      `Loaded demo dataset with ${demo.rows.length} customers and ${demo.headers.length} features.`,
      'success'
    );
    updateScenarioDownloadButton();
  });
}

function loadDataset(headers, rows, { sourceLabel } = {}) {
  if (!Array.isArray(headers) || !Array.isArray(rows) || !rows.length) return;
  currentHeaders = headers.slice();
  currentRows = rows.slice();
  currentFeatureNames = headers.slice();
  selectedFeatureNames = headers.slice();

  populateFeatureControls();

  const label = sourceLabel || 'data';
  updateDiagnosticsText(
    `Loaded ${rows.length} observation(s) with ${headers.length} numeric feature(s) from ${label}.`
  );
  stampModified();
}

// -------------------- Feature & axis controls --------------------

function populateFeatureControls() {
  const container = document.getElementById('kmeans-feature-checkboxes');
  const xSelect = document.getElementById('kmeans-x-var');
  const ySelect = document.getElementById('kmeans-y-var');
  const zSelect = document.getElementById('kmeans-z-var');
  if (!container || !xSelect || !ySelect) return;

  container.innerHTML = '';
  xSelect.innerHTML = '';
  ySelect.innerHTML = '';

  if (!currentFeatureNames.length) {
    container.innerHTML = '<p class="hint">Upload data or load a demo dataset to select features.</p>';
    return;
  }

  currentFeatureNames.forEach((name, index) => {
    const id = `kmeans-feature-${index}`;
    const label = document.createElement('label');
    label.className = 'checkbox-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.value = name;
    checkbox.checked = selectedFeatureNames.includes(name);

    const span = document.createElement('span');
    span.textContent = name;

    label.appendChild(checkbox);
    label.appendChild(span);
    container.appendChild(label);

    checkbox.addEventListener('change', updateSelectedFeaturesFromCheckboxes);
  });

  updateSelectedFeaturesFromCheckboxes();
}

function updateSelectedFeaturesFromCheckboxes() {
  const container = document.getElementById('kmeans-feature-checkboxes');
  const xSelect = document.getElementById('kmeans-x-var');
  const ySelect = document.getElementById('kmeans-y-var');
  const zSelect = document.getElementById('kmeans-z-var');
  if (!container || !xSelect || !ySelect) return;

  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  const selected = [];
  checkboxes.forEach(cb => {
    if (cb.checked) selected.push(cb.value);
  });

  selectedFeatureNames = selected.length ? selected : currentFeatureNames.slice();

  xSelect.innerHTML = '';
  ySelect.innerHTML = '';
  if (zSelect) {
    zSelect.innerHTML = '';
  }
  selectedFeatureNames.forEach(name => {
    const optX = document.createElement('option');
    optX.value = name;
    optX.textContent = name;
    xSelect.appendChild(optX);

    const optY = document.createElement('option');
    optY.value = name;
    optY.textContent = name;
    ySelect.appendChild(optY);

    if (zSelect) {
      const optZ = document.createElement('option');
      optZ.value = name;
      optZ.textContent = name;
      zSelect.appendChild(optZ);
    }
  });

  if (selectedFeatureNames.length >= 2) {
    xSelect.value = selectedFeatureNames[0];
    ySelect.value = selectedFeatureNames[1];
  } else if (selectedFeatureNames.length === 1) {
    xSelect.value = selectedFeatureNames[0];
    ySelect.value = selectedFeatureNames[0];
  }

  if (zSelect) {
    if (selectedFeatureNames.length >= 3) {
      zSelect.value = selectedFeatureNames[2];
    } else if (selectedFeatureNames.length >= 1) {
      zSelect.value = selectedFeatureNames[selectedFeatureNames.length - 1];
    }
  }
}

function getAxisSelection() {
  const xSelect = document.getElementById('kmeans-x-var');
  const ySelect = document.getElementById('kmeans-y-var');
  const zSelect = document.getElementById('kmeans-z-var');
  const modeInput = document.querySelector('input[name="kmeans-dim-mode"]:checked');
  const dimMode = modeInput && modeInput.value === '3d' ? '3d' : '2d';
  const xVar = xSelect?.value || selectedFeatureNames[0];
  const yVar = ySelect?.value || selectedFeatureNames[Math.min(1, selectedFeatureNames.length - 1)];
  const zVar = zSelect?.value || null;
  return { xVar, yVar, zVar, dimMode };
}

// -------------------- Clustering & diagnostics --------------------

function setupRunButton() {
  const button = document.getElementById('kmeans-run');
  if (!button) return;
  button.addEventListener('click', event => {
    event.preventDefault();
    runClustering();
  });
}

function runClustering() {
  // Track button click
  if (typeof markRunAttempted === 'function') {
    markRunAttempted();
  }
  
  if (!currentRows.length || !currentHeaders.length) {
    updateDiagnosticsText('Load a dataset first (upload a CSV or use the demo dataset).');
    return;
  }

  if (selectedFeatureNames.length < 2) {
    updateDiagnosticsText('Select at least two features for clustering and plotting.');
    return;
  }

  const n = currentRows.length;
  const kInput = document.getElementById('kmeans-k');
  const kMinInput = document.getElementById('kmeans-k-min');
  const kMaxInput = document.getElementById('kmeans-k-max');
  const scaleSelect = document.getElementById('kmeans-scale-mode');

  let k = parseInt(kInput?.value, 10);
  let kMin = parseInt(kMinInput?.value, 10);
  let kMax = parseInt(kMaxInput?.value, 10);

  if (!Number.isFinite(k) || k < 2) k = 2;
  if (!Number.isFinite(kMin) || kMin < 2) kMin = 2;
  if (!Number.isFinite(kMax) || kMax < kMin) kMax = Math.max(kMin, 3);

  const maxReasonableK = Math.max(2, Math.min(12, n - 1));
  k = Math.min(k, maxReasonableK);
  kMax = Math.min(kMax, maxReasonableK);

  if (kInput) kInput.value = k;
  if (kMinInput) kMinInput.value = kMin;
  if (kMaxInput) kMaxInput.value = kMax;

  if (k < 2 || k > n - 1) {
    updateDiagnosticsText('Choose k between 2 and one less than the number of observations.');
    return;
  }

  const featureMatrix = buildFeatureMatrix(currentRows, currentHeaders, selectedFeatureNames);
  if (!featureMatrix.length) {
    updateDiagnosticsText('Unable to build a feature matrix from the selected variables.');
    return;
  }

  const scaleMode = (scaleSelect && scaleSelect.value) || ScaleModes.ZSCORE;
  const standardization = buildStandardizedMatrix(featureMatrix, scaleMode, selectedFeatureNames.length);

  const { points } = standardization;

  // Elbow diagnostics over [kMin, kMax]
  const elbowKValues = [];
  const elbowWCSS = [];
  let solutionForK = null;

  for (let kk = kMin; kk <= kMax; kk++) {
    const solution = runKMeans(points, kk);
    elbowKValues.push(kk);
    elbowWCSS.push(solution.wcss);
    if (kk === k) solutionForK = solution;
  }

  if (!solutionForK) {
    solutionForK = runKMeans(points, k);
  }

  // Silhouette diagnostics: evaluate k in a local window around the chosen value
  const silKValues = [];
  const silValues = [];
  const silMin = Math.max(2, k - 2);
  const silMax = Math.min(maxReasonableK, k + 2);

  for (let kk = silMin; kk <= silMax; kk++) {
    const sol =
      kk === k ? solutionForK : runKMeans(points, kk);
    const sil = computeAverageSilhouette(points, sol.assignments);
    silKValues.push(kk);
    silValues.push(sil);
  }

  const currentSilIndex = silKValues.indexOf(k);
  const avgSilhouette =
    currentSilIndex >= 0 && Number.isFinite(silValues[currentSilIndex])
      ? silValues[currentSilIndex]
      : computeAverageSilhouette(points, solutionForK.assignments);

  const axisSelection = getAxisSelection();

  renderScatterChart(solutionForK, featureMatrix, selectedFeatureNames, axisSelection, standardization);
  renderElbowChart(elbowKValues, elbowWCSS, k);
  renderSilhouetteChart(silKValues, silValues, k);
  updateSummary(solutionForK, featureMatrix, selectedFeatureNames, avgSilhouette);

  // Track successful run
  if (typeof markRunSuccessful === 'function') {
    markRunSuccessful(
      {
        k: k,
        n_features: selectedFeatureNames.length,
        n_obs: currentRows.length,
        scale_mode: scaleSelect?.value || 'none'
      },
      `k=${k}, silhouette=${avgSilhouette?.toFixed(3)}, wcss=${solutionForK.wcss?.toFixed(2)}, n=${currentRows.length}`
    );
  }

  // Store state for downloads
  lastClusteringState = {
    headers: currentHeaders.slice(),
    rows: currentRows.slice(),
    featureMatrix,
    featureNames: selectedFeatureNames.slice(),
    assignments: solutionForK.assignments.slice()
  };

  stampModified();
}

function buildFeatureMatrix(rows, headers, featureNames) {
  const index = {};
  headers.forEach((h, i) => {
    index[h] = i;
  });
  const cols = featureNames
    .map(name => index[name])
    .filter(i => typeof i === 'number' && i >= 0);
  if (!cols.length) return [];
  return rows.map(row => cols.map(c => row[c]));
}

function standardizeMatrix(matrix) {
  // Deprecated in favor of buildStandardizedMatrix but kept for clarity if needed.
  const n = matrix.length;
  const p = matrix[0].length;
  const means = new Array(p).fill(0);
  const stds = new Array(p).fill(0);

  for (let j = 0; j < p; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += matrix[i][j];
    means[j] = sum / n;
  }

  for (let j = 0; j < p; j++) {
    let sq = 0;
    for (let i = 0; i < n; i++) {
      const d = matrix[i][j] - means[j];
      sq += d * d;
    }
    const variance = n > 1 ? sq / (n - 1) : 0;
    stds[j] = variance > 0 ? Math.sqrt(variance) : 1;
  }

  const points = matrix.map(row =>
    row.map((v, j) => (v - means[j]) / (stds[j] || 1))
  );

  return { points, means, stds };
}

function buildStandardizedMatrix(matrix, scaleMode, featureCount) {
  const n = matrix.length;
  const p = featureCount || (matrix[0] ? matrix[0].length : 0);

  if (!n || !p) {
    return { points: matrix, means: [], stds: [] };
  }

  if (scaleMode === ScaleModes.NONE) {
    return {
      points: matrix,
      means: new Array(p).fill(0),
      stds: new Array(p).fill(1)
    };
  }

  if (scaleMode === ScaleModes.MINMAX) {
    const mins = new Array(p).fill(Infinity);
    const maxs = new Array(p).fill(-Infinity);
    for (let i = 0; i < n; i++) {
      const row = matrix[i];
      for (let j = 0; j < p; j++) {
        const v = row[j];
        if (v < mins[j]) mins[j] = v;
        if (v > maxs[j]) maxs[j] = v;
      }
    }

    const means = new Array(p);
    const stds = new Array(p);
    for (let j = 0; j < p; j++) {
      const range = maxs[j] - mins[j];
      if (range > 0) {
        means[j] = mins[j];
        stds[j] = range / 100; // so z = (x - min) / (range/100) = 0–100
      } else {
        means[j] = mins[j] || 0;
        stds[j] = 1;
      }
    }

    const points = matrix.map(row =>
      row.map((v, j) => (v - means[j]) / (stds[j] || 1))
    );

    return { points, means, stds };
  }

  // Default: z-score standardization (mean 0, sd 1)
  return standardizeMatrix(matrix);
}

function runKMeans(points, k, { maxIter = 100, nInit = 5 } = {}) {
  const n = points.length;
  if (!n || k < 1) {
    return { assignments: [], centroids: [], wcss: NaN, clusterSizes: [] };
  }

  let bestWCSS = Infinity;
  let bestAssignments = null;
  let bestCentroids = null;
  let bestSizes = null;

  for (let init = 0; init < nInit; init++) {
    let centroids = initializeCentroids(points, k);
    let assignments = new Array(n).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;

      // Assignment step
      for (let i = 0; i < n; i++) {
        const x = points[i];
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let j = 0; j < k; j++) {
          const d = squaredDistance(x, centroids[j]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = j;
          }
        }
        if (assignments[i] !== bestIdx) {
          assignments[i] = bestIdx;
          changed = true;
        }
      }

      // Update step
      const newCentroids = new Array(k);
      const counts = new Array(k).fill(0);
      for (let j = 0; j < k; j++) {
        newCentroids[j] = new Array(points[0].length).fill(0);
      }

      for (let i = 0; i < n; i++) {
        const c = assignments[i];
        const x = points[i];
        counts[c]++;
        for (let d = 0; d < x.length; d++) {
          newCentroids[c][d] += x[d];
        }
      }

      for (let j = 0; j < k; j++) {
        if (counts[j] === 0) {
          // Reinitialize empty cluster to a random point
          newCentroids[j] = points[Math.floor(Math.random() * n)].slice();
          counts[j] = 1;
        } else {
          for (let d = 0; d < newCentroids[j].length; d++) {
            newCentroids[j][d] /= counts[j];
          }
        }
      }

      centroids = newCentroids;
      if (!changed) break;
    }

    const { wcss, clusterSizes } = computeWCSS(points, centroids, assignments);
    if (wcss < bestWCSS) {
      bestWCSS = wcss;
      bestAssignments = assignments.slice();
      bestCentroids = centroids.map(c => c.slice());
      bestSizes = clusterSizes.slice();
    }
  }

  return {
    assignments: bestAssignments || [],
    centroids: bestCentroids || [],
    wcss: bestWCSS,
    clusterSizes: bestSizes || []
  };
}

function initializeCentroids(points, k) {
  const n = points.length;
  const centroids = [];

  // k-means++ style initialization
  centroids.push(points[Math.floor(Math.random() * n)].slice());

  while (centroids.length < k) {
    const distances = [];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const x = points[i];
      let minDist = Infinity;
      for (let j = 0; j < centroids.length; j++) {
        const d = squaredDistance(x, centroids[j]);
        if (d < minDist) minDist = d;
      }
      distances[i] = minDist;
      total += minDist;
    }

    if (total === 0) {
      while (centroids.length < k) {
        centroids.push(centroids[0].slice());
      }
      break;
    }

    let r = Math.random() * total;
    let cumulative = 0;
    let chosenIndex = 0;
    for (let i = 0; i < n; i++) {
      cumulative += distances[i];
      if (r <= cumulative) {
        chosenIndex = i;
        break;
      }
    }
    centroids.push(points[chosenIndex].slice());
  }

  return centroids;
}

function computeWCSS(points, centroids, assignments) {
  const n = points.length;
  const clusterSizes = new Array(centroids.length).fill(0);
  let wcss = 0;
  for (let i = 0; i < n; i++) {
    const c = assignments[i];
    clusterSizes[c]++;
    wcss += squaredDistance(points[i], centroids[c]);
  }
  return { wcss, clusterSizes };
}

function squaredDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum;
}

function computeAverageSilhouette(points, assignments, maxPoints = MAX_SILHOUETTE_POINTS) {
  const n = points.length;
  if (!n) return NaN;

  const clusters = {};
  for (let i = 0; i < n; i++) {
    const c = assignments[i];
    if (!clusters[c]) clusters[c] = [];
    clusters[c].push(i);
  }
  const clusterIds = Object.keys(clusters).map(id => parseInt(id, 10));
  if (clusterIds.length < 2) return 0;

  const indices = sampleIndices(n, maxPoints);
  let total = 0;
  let count = 0;

  for (const i of indices) {
    const xi = points[i];
    const ci = assignments[i];
    const same = clusters[ci];

    // a(i): average distance to same-cluster points
    let aSum = 0;
    let aCount = 0;
    for (const j of same) {
      if (j === i) continue;
      aSum += Math.sqrt(squaredDistance(xi, points[j]));
      aCount++;
    }
    const a = aCount > 0 ? aSum / aCount : 0;

    // b(i): minimal average distance to other clusters
    let b = Infinity;
    for (const cj of clusterIds) {
      if (cj === ci) continue;
      const members = clusters[cj];
      if (!members || !members.length) continue;
      let sum = 0;
      for (const j of members) {
        sum += Math.sqrt(squaredDistance(xi, points[j]));
      }
      const avg = sum / members.length;
      if (avg < b) b = avg;
    }

    if (!Number.isFinite(b)) continue;
    const maxab = Math.max(a, b);
    const s = maxab > 0 ? (b - a) / maxab : 0;
    total += s;
    count++;
  }

  return count ? total / count : 0;
}

function sampleIndices(n, maxPoints) {
  if (n <= maxPoints) {
    return Array.from({ length: n }, (_, i) => i);
  }
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, maxPoints);
}

// -------------------- Rendering --------------------

function renderScatterChart(solution, featureMatrix, featureNames, axisSelection, standardization) {
  const container = document.getElementById('kmeans-scatter');
  if (!container || !window.Plotly) return;

  container.classList.remove('chart-placeholder');
  container.style.minHeight = '340px';

  const { assignments, centroids } = solution;
  const n = featureMatrix.length;
  if (!n || !assignments || !assignments.length) {
    container.innerHTML = '<p class="chart-note">Run k-means to see the cluster map.</p>';
    return;
  }

  const { xVar, yVar, zVar, dimMode } = axisSelection;
  const xIndex = featureNames.indexOf(xVar);
  const yIndex = featureNames.indexOf(yVar);
  if (xIndex < 0 || yIndex < 0) {
    container.innerHTML = '<p class="chart-note">Select valid variables for the x and y axes.</p>';
    return;
  }

  const { means, stds } = standardization;

  // Optional subsampling for visualization
  const sampleSelect = document.getElementById('kmeans-sample-fraction');
  let sampleFraction = parseFloat(sampleSelect && sampleSelect.value);
  if (!Number.isFinite(sampleFraction) || sampleFraction <= 0 || sampleFraction > 1) {
    sampleFraction = 1;
  }
  let indicesToShow = null;
  if (sampleFraction < 1) {
    const target = Math.max(10, Math.round(sampleFraction * n));
    const sampled = sampleIndices(n, target);
    indicesToShow = new Set(sampled);
  }

  if (dimMode === '3d' && zVar) {
    const zIndex = featureNames.indexOf(zVar);
    if (zIndex < 0) {
      container.innerHTML =
        '<p class="chart-note">Select a valid variable for the Z-axis or switch back to 2D view.</p>';
      return;
    }

    const traces3d = [];
    const k = centroids.length;
    for (let c = 0; c < k; c++) {
      const xs = [];
      const ys = [];
      const zs = [];
      const text = [];
      for (let i = 0; i < n; i++) {
        if (indicesToShow && !indicesToShow.has(i)) continue;
        if (assignments[i] !== c) continue;
        xs.push(featureMatrix[i][xIndex]);
        ys.push(featureMatrix[i][yIndex]);
        zs.push(featureMatrix[i][zIndex]);
        text.push(
          `Row ${i + 1}<br>${xVar}: ${featureMatrix[i][xIndex].toFixed(2)}<br>${yVar}: ${featureMatrix[i][yIndex].toFixed(
            2
          )}<br>${zVar}: ${featureMatrix[i][zIndex].toFixed(2)}`
        );
      }
      if (!xs.length) continue;
      traces3d.push({
        x: xs,
        y: ys,
        z: zs,
        mode: 'markers',
        type: 'scatter3d',
        name: `Cluster ${c + 1}`,
        marker: {
          size: 5,
          opacity: 0.8,
          color: CLUSTER_COLORS[c % CLUSTER_COLORS.length]
        },
        text
      });
    }

    const centroidXs = [];
    const centroidYs = [];
    const centroidZs = [];
    const centroidText = [];
    for (let c = 0; c < centroids.length; c++) {
      const centroidStd = centroids[c];
      const original = centroidStd.map((zScore, j) => zScore * (stds[j] || 1) + means[j]);
      centroidXs.push(original[xIndex]);
      centroidYs.push(original[yIndex]);
      centroidZs.push(original[zIndex]);
      centroidText.push(`Cluster ${c + 1} centroid`);
    }

    traces3d.push({
      x: centroidXs,
      y: centroidYs,
      z: centroidZs,
      mode: 'markers+text',
      type: 'scatter3d',
      name: 'Centroids',
      marker: {
        size: 10,
        symbol: 'x',
        color: '#d62728'
      },
      text: centroidText,
      textposition: 'top center',
      hoverinfo: 'text'
    });

    const layout3d = {
      margin: { t: 30, r: 10, b: 40, l: 50 },
      scene: {
        xaxis: { title: xVar },
        yaxis: { title: yVar },
        zaxis: { title: zVar }
      },
      legend: { orientation: 'h', x: 0, y: 1.1 }
    };

    Plotly.newPlot(container, traces3d, layout3d, { responsive: true, displaylogo: false });
    return;
  }

  // Default 2D view
  const traces2d = [];
  const k2 = centroids.length;
  for (let c = 0; c < k2; c++) {
    const xs = [];
    const ys = [];
    const text = [];
    for (let i = 0; i < n; i++) {
      if (indicesToShow && !indicesToShow.has(i)) continue;
      if (assignments[i] !== c) continue;
      xs.push(featureMatrix[i][xIndex]);
      ys.push(featureMatrix[i][yIndex]);
      text.push(
        `Row ${i + 1}<br>${xVar}: ${featureMatrix[i][xIndex].toFixed(2)}<br>${yVar}: ${featureMatrix[i][yIndex].toFixed(
          2
        )}`
      );
    }
    if (!xs.length) continue;
    traces2d.push({
      x: xs,
      y: ys,
      mode: 'markers',
      type: 'scatter',
      name: `Cluster ${c + 1}`,
      marker: {
        size: 7,
        opacity: 0.8,
        color: CLUSTER_COLORS[c % CLUSTER_COLORS.length],
        line: { width: 0.5, color: '#ffffff' }
      },
      text
    });
  }

  const centroidXs2d = [];
  const centroidYs2d = [];
  const centroidText2d = [];
  for (let c = 0; c < centroids.length; c++) {
    const centroidStd = centroids[c];
    const original = centroidStd.map((zScore, j) => zScore * (stds[j] || 1) + means[j]);
    centroidXs2d.push(original[xIndex]);
    centroidYs2d.push(original[yIndex]);
    centroidText2d.push(`Cluster ${c + 1} centroid`);
  }

  traces2d.push({
    x: centroidXs2d,
    y: centroidYs2d,
    mode: 'markers+text',
    type: 'scatter',
    name: 'Centroids',
    marker: {
      size: 14,
      symbol: 'x',
      color: '#d62728',
      line: { width: 2, color: '#ffffff' }
    },
    text: centroidText2d,
    textposition: 'top center',
    hoverinfo: 'text'
  });

  const layout2d = {
    margin: { t: 30, r: 10, b: 40, l: 50 },
    xaxis: { title: xVar },
    yaxis: { title: yVar },
    legend: { orientation: 'h', x: 0, y: 1.1 },
    hovermode: 'closest'
  };

  Plotly.newPlot(container, traces2d, layout2d, { responsive: true, displaylogo: false });
}

function renderElbowChart(kValues, wcssValues, currentK) {
  const container = document.getElementById('kmeans-elbow');
  if (!container || !window.Plotly) return;

  container.classList.remove('chart-placeholder');
  container.style.minHeight = '260px';

  if (!kValues.length || !wcssValues.length) {
    container.innerHTML = '<p class="chart-note">Run k-means to see elbow diagnostics.</p>';
    return;
  }

  const baseTrace = {
    x: kValues,
    y: wcssValues,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'WCSS vs k',
    line: { color: '#1f77b4' },
    marker: { size: 8 }
  };

  const currentIndex = kValues.indexOf(currentK);
  const highlightTrace =
    currentIndex >= 0
      ? {
          x: [kValues[currentIndex]],
          y: [wcssValues[currentIndex]],
          type: 'scatter',
          mode: 'markers',
          name: 'Current k',
          marker: { size: 14, color: '#d62728', symbol: 'circle' },
          hoverinfo: 'x+y'
        }
      : null;

  const layout = {
    margin: { t: 30, r: 10, b: 40, l: 60 },
    xaxis: { title: 'Number of clusters (k)', dtick: 1 },
    yaxis: { title: 'Total within-cluster sum of squares (WCSS)', rangemode: 'tozero' },
    showlegend: true,
    legend: { orientation: 'h', x: 0, y: 1.1 }
  };

  const data = highlightTrace ? [baseTrace, highlightTrace] : [baseTrace];
  Plotly.newPlot(container, data, layout, { responsive: true, displaylogo: false });
}

function renderSilhouetteChart(kValues, silhouetteValues, currentK) {
  const container = document.getElementById('kmeans-silhouette');
  if (!container || !window.Plotly) return;

  container.classList.remove('chart-placeholder');
  container.style.minHeight = '260px';

  if (!Array.isArray(kValues) || !kValues.length || !Array.isArray(silhouetteValues) || !silhouetteValues.length) {
    container.innerHTML = '<p class="chart-note">Run k-means to see silhouette diagnostics.</p>';
    return;
  }

  const barsTrace = {
    x: kValues,
    y: silhouetteValues,
    type: 'bar',
    name: 'Average silhouette'
  };

  const currentIndex = kValues.indexOf(currentK);
  let currentSil = NaN;
  let highlightTrace = null;

  if (currentIndex >= 0 && Number.isFinite(silhouetteValues[currentIndex])) {
    currentSil = silhouetteValues[currentIndex];
    highlightTrace = {
      x: [kValues[currentIndex]],
      y: [silhouetteValues[currentIndex]],
      type: 'scatter',
      mode: 'markers',
      name: 'Selected k',
      marker: { size: 14, color: '#d62728', symbol: 'circle' },
      hoverinfo: 'x+y'
    };
  }

  const layout = {
    margin: { t: 30, r: 10, b: 40, l: 60 },
    xaxis: { title: 'Number of clusters (k)', dtick: 1 },
    yaxis: { title: 'Average silhouette coefficient', range: [-0.1, 1.0] },
    showlegend: !!highlightTrace
  };

  const data = highlightTrace ? [barsTrace, highlightTrace] : [barsTrace];
  Plotly.newPlot(container, data, layout, { responsive: true, displaylogo: false });

  // Update textual interpretation beneath the chart
  const note = document.getElementById('kmeans-silhouette-note');
  if (note && Number.isFinite(currentSil)) {
    let quality;
    if (currentSil >= 0.5) {
      quality = 'This suggests well-separated, clearly defined segments.';
    } else if (currentSil >= 0.25) {
      quality =
        'This suggests a moderate level of separation; segments are useful but may overlap on some features.';
    } else if (currentSil >= 0) {
      quality =
        'This suggests weak separation; segments may be noisy or overlapping, so consider fewer clusters or different variables.';
    } else {
      quality =
        'A negative silhouette indicates some observations may be assigned to the wrong cluster; reconsider the number of clusters or inputs.';
    }

    const baseText =
      'Silhouette values range from -1 to 1, where higher values mean observations are much closer to their own cluster than to others.';

    note.textContent = `For k = ${currentK}, the average silhouette score is ${currentSil.toFixed(
      3
    )}. ${quality} ${baseText}`.trim();
  }
}

// -------------------- Summary & diagnostics text --------------------

function updateSummary(solution, featureMatrix, featureNames, avgSilhouette) {
  const kSpan = document.getElementById('kmeans-metric-k');
  const wcssSpan = document.getElementById('kmeans-metric-wcss');
  const silSpan = document.getElementById('kmeans-metric-silhouette');
  const maxClusterSpan = document.getElementById('kmeans-metric-max-cluster');

  const n = featureMatrix.length;
  const p = featureNames.length;

  const k = solution.centroids.length;
  const wcss = solution.wcss;
  const clusterSizes = solution.clusterSizes || [];

  if (kSpan) kSpan.textContent = String(k);
  if (wcssSpan) wcssSpan.textContent = Number.isFinite(wcss) ? wcss.toFixed(1) : '–';
  if (silSpan) silSpan.textContent = Number.isFinite(avgSilhouette) ? avgSilhouette.toFixed(3) : '–';
  if (maxClusterSpan) {
    const maxSize = clusterSizes.length ? Math.max(...clusterSizes) : NaN;
    maxClusterSpan.textContent = Number.isFinite(maxSize) ? String(maxSize) : '–';
  }

  const apa = document.getElementById('apa-report');
  const managerial = document.getElementById('managerial-report');

  if (apa) {
    const featureList =
      p === 1
        ? `1 feature (${featureNames[0]})`
        : `${p} features (${featureNames.slice(0, 3).join(', ')}${p > 3 ? ', …' : ''})`;
    const silText = Number.isFinite(avgSilhouette)
      ? ` and an average silhouette coefficient of ${avgSilhouette.toFixed(3)}`
      : '';
    apa.textContent =
      `k-means clustering with k = ${k} was applied to N = ${n} observations using ${featureList}. ` +
      `The solution yielded a total within-cluster sum of squares (WCSS) of ${wcss.toFixed(1)}${silText}.`;
  }

  if (managerial) {
    const sizeSnippet =
      clusterSizes && clusterSizes.length
        ? ` Segment sizes ranged from ${Math.min(...clusterSizes)} to ${Math.max(
            ...clusterSizes
          )} observations.`
        : '';
    let silInterpretation = '';
    if (Number.isFinite(avgSilhouette)) {
      if (avgSilhouette >= 0.5) {
        silInterpretation = ' The silhouette score suggests the segments are well separated and interpretable.';
      } else if (avgSilhouette >= 0.25) {
        silInterpretation =
          ' The silhouette score suggests a moderate level of separation; segments may overlap but are still useful.';
      } else {
        silInterpretation =
          ' The low silhouette score suggests segments may be noisy or overlapping; consider fewer clusters or different variables.';
      }
    }
    managerial.textContent =
      `This configuration finds ${k} segment(s) based on the selected metrics.` +
      sizeSnippet +
      silInterpretation;
  }

  renderClusterTable(solution, featureMatrix, featureNames);

  hasSuccessfulRun = true;
  checkAndTrackUsage();
}

function renderClusterTable(solution, featureMatrix, featureNames) {
  const tbody = document.getElementById('kmeans-cluster-table-body');
  if (!tbody) return;

  const { assignments } = solution;
  const n = featureMatrix.length;
  const p = featureNames.length;
  const k = solution.centroids.length;

  if (!n || !assignments || !assignments.length || !k) {
    tbody.innerHTML =
      '<tr><td colspan="5">Run clustering to see cluster profiles here.</td></tr>';
    return;
  }

  const sums = Array.from({ length: k }, () => new Array(p).fill(0));
  const counts = new Array(k).fill(0);

  for (let i = 0; i < n; i++) {
    const c = assignments[i];
    const row = featureMatrix[i];
    counts[c]++;
    for (let j = 0; j < p; j++) sums[c][j] += row[j];
  }

  // Compute means and average distance to centroid in original feature space
  const meansByCluster = sums.map((sumArr, c) =>
    counts[c] ? sumArr.map(v => v / counts[c]) : new Array(p).fill(0)
  );

  // Compute within-cluster standard deviations for each feature
  const sqDiffSums = Array.from({ length: k }, () => new Array(p).fill(0));
  const distanceSums = new Array(k).fill(0);

  for (let i = 0; i < n; i++) {
    const c = assignments[i];
    const row = featureMatrix[i];
    const means = meansByCluster[c];

    let d2 = 0;
    for (let j = 0; j < p; j++) {
      const diff = row[j] - means[j];
      sqDiffSums[c][j] += diff * diff;
      d2 += diff * diff;
    }
    distanceSums[c] += Math.sqrt(d2);
  }

  tbody.innerHTML = '';

  for (let c = 0; c < k; c++) {
    const size = counts[c];
    if (!size) continue;
    const means = meansByCluster[c];
    const sds = sqDiffSums[c].map(sumSq => {
      if (size <= 1) return 0;
      const variance = sumSq / (size - 1);
      return variance > 0 ? Math.sqrt(variance) : 0;
    });
    const avgDistance = distanceSums[c] / size;

    const tr = document.createElement('tr');

    const tdCluster = document.createElement('td');
    tdCluster.textContent = `Cluster ${c + 1}`;
    tr.appendChild(tdCluster);

    const tdSize = document.createElement('td');
    tdSize.textContent = String(size);
    tr.appendChild(tdSize);

    const tdMeans = document.createElement('td');
    tdMeans.innerHTML = featureNames
      .map((name, idx) => `<strong>${escapeHtml(name)}:</strong> ${means[idx].toFixed(2)}`)
      .join('<br>');
    tr.appendChild(tdMeans);

    const tdSds = document.createElement('td');
    tdSds.innerHTML = featureNames
      .map((name, idx) => `<strong>${escapeHtml(name)}:</strong> ${sds[idx].toFixed(2)}`)
      .join('<br>');
    tr.appendChild(tdSds);

    const tdDistance = document.createElement('td');
    tdDistance.textContent = Number.isFinite(avgDistance) ? avgDistance.toFixed(2) : '–';
    tr.appendChild(tdDistance);

    tbody.appendChild(tr);
  }
}

function updateDiagnosticsText(message) {
  const container = document.getElementById('diagnostics-content');
  if (!container) return;
  container.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function setupDownloadResultsButton() {
  const button = document.getElementById('kmeans-download-results');
  if (!button) return;

  button.addEventListener('click', event => {
    event.preventDefault();
    if (!lastClusteringState) {
      updateDiagnosticsText('Run k-means clustering before downloading the clustered dataset.');
      return;
    }

    const { headers, rows, featureMatrix, featureNames, assignments } = lastClusteringState;
    const n = rows.length;
    const p = featureNames.length;
    if (!n || !p || !assignments || assignments.length !== n) {
      updateDiagnosticsText('Unable to prepare download: clustering state is incomplete.');
      return;
    }

    const k = assignments.reduce((max, c) => (c > max ? c : max), 0) + 1;
    const sums = Array.from({ length: k }, () => new Array(p).fill(0));
    const counts = new Array(k).fill(0);

    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      const row = featureMatrix[i];
      counts[c]++;
      for (let j = 0; j < p; j++) {
        sums[c][j] += row[j];
      }
    }

    const meansByCluster = sums.map((sumArr, c) =>
      counts[c] ? sumArr.map(v => v / counts[c]) : new Array(p).fill(0)
    );

    const distances = new Array(n);
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      const row = featureMatrix[i];
      const means = meansByCluster[c];
      let d2 = 0;
      for (let j = 0; j < p; j++) {
        const diff = row[j] - means[j];
        d2 += diff * diff;
      }
      distances[i] = Math.sqrt(d2);
    }

    const outHeaders = headers.concat(['cluster_id', 'distance_to_centroid']);
    const lines = [outHeaders.join(',')];

    for (let i = 0; i < n; i++) {
      const baseRow = rows[i].map(value =>
        Number.isFinite(value) ? String(value) : (value == null ? '' : String(value))
      );
      const clusterId = assignments[i] + 1;
      const dist = distances[i];
      baseRow.push(String(clusterId));
      baseRow.push(Number.isFinite(dist) ? dist.toFixed(4) : '');
      lines.push(baseRow.join(','));
    }

    const filename = 'kmeans_clustered_results.csv';
    downloadTextFile(filename, lines.join('\n'), { mimeType: 'text/csv' });
  });
}

// -------------------- Utility helpers --------------------

function randomNormal(mean = 0, sd = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + sd * num;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
