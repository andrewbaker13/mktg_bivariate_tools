// Sampling Designs Visualizer

const SAMPLING_CREATED_DATE = '2025-11-25';
let samplingModifiedDate = new Date().toLocaleDateString();

// Usage tracking variables
let pageLoadTime = Date.now();
let hasSuccessfulRun = false;

// Usage tracking function
function checkAndTrackUsage() {
  const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
  if (timeOnPage < 0.167) return; // 10 seconds for testing (change back to 3 for production)
  if (!hasSuccessfulRun) return;
  if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `tool-tracked-sampling-visualizer-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('sampling-visualizer', {}, `Sampling visualization completed`);
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for Sampling Visualizer');
  }
}

const POP_ROWS = 40;
const POP_COLS = 25;
const POP_SIZE = POP_ROWS * POP_COLS;

const groupPalette = ['#2563eb', '#10b981', '#f97316', '#ec4899', '#6b7280'];

const SamplingDesigns = {
  SRS: 'srs',
  STRATIFIED: 'stratified',
  CLUSTER: 'cluster',
  SYSTEMATIC: 'systematic',
  CONVENIENCE: 'convenience'
};

const SamplingScenarios = [
  {
    id: 'balanced-srs',
    label: 'Balanced segments under SRS',
    description:
      'Imagine an email panel with three equally sized customer segments (A, B, C) that you treat as a single population. Use simple random sampling to draw a moderate sample and see how, over repeated draws, each segment tends to appear in proportion to its size and the overall mean value stays close to the true population mean.',
    config: {
      numGroups: 3,
      populationScenario: 'balanced',
      design: SamplingDesigns.SRS,
      sampleSize: 80,
      showValues: false,
      statisticMode: 'overall',
      showTrueMean: true,
      showTrueSubgroupMeans: false
    }
  },
  {
    id: 'premium-oversample',
    label: 'Premium segment oversampled (stratified)',
    description:
      'Suppose you have two large standard segments and one much smaller premium segment (Group C) of high-value customers. Use stratified sampling with extra weight on Group C so that the sample contains many more premium customers than a purely random draw would; then compare how the subgroup means and proportions look in the sample versus in the full population to understand why oversampling small but important segments is common in marketing research.',
    config: {
      numGroups: 3,
      populationScenario: 'skewedB',
      design: SamplingDesigns.STRATIFIED,
      sampleSize: 120,
      showValues: true,
      strataWeights: [1, 1, 3],
      statisticMode: 'subgroups',
      subgroupDisplay: 2,
      showTrueMean: true,
      showTrueSubgroupMeans: true
    }
  },
  {
    id: 'regional-clusters',
    label: 'Regional clusters vs. convenience',
    description:
      'Think of a national customer base spread across four geographic regions. Start with a cluster sample that selects whole regions at a time, then switch to the convenience design that only samples from one visible corner of the grid to see how ignoring parts of the population can distort both group proportions and average values, even when the overall population looks well mixed.',
    config: {
      numGroups: 4,
      populationScenario: 'balanced',
      design: SamplingDesigns.CLUSTER,
      sampleSize: 80,
      showValues: false,
      statisticMode: 'overall',
      showTrueMean: true,
      showTrueSubgroupMeans: false
    }
  }
];

let population = []; // { id, row, col, group, value }
let currentSample = [];
let samplingHistory = []; // overall sample mean per draw
let samplingHistoryByGroup = []; // { mean, group } records for subgroup means
let distributionSampleCount = 0; // number of samples contributing to current sampling distribution

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function getCurrentNumGroups() {
  if (population && population.length) {
    const groups = new Set(population.map(p => p.group));
    return groups.size || 1;
  }
  const sel = document.getElementById('num-groups-select');
  return parseInt(sel?.value || '3', 10) || 3;
}

function updateStrataWeightVisibility() {
  const sel = document.getElementById('num-groups-select');
  const numGroups = parseInt(sel?.value || '3', 10) || 3;
  for (let g = 0; g < 5; g++) {
    const wrapper = document.getElementById(`strata-weight-wrapper-${g}`);
    if (wrapper) {
      wrapper.style.display = g < numGroups ? '' : 'none';
    }
  }

  const subgroupDisplaySelect = document.getElementById('subgroup-display-select');
  if (subgroupDisplaySelect) {
    let mustResetSelection = false;
    Array.from(subgroupDisplaySelect.options).forEach(opt => {
      if (opt.value === 'all') return;
      const g = parseInt(opt.value, 10);
      if (!Number.isFinite(g)) return;
      const shouldDisable = g >= numGroups;
      opt.disabled = shouldDisable;
      if (shouldDisable && subgroupDisplaySelect.value === opt.value) {
        mustResetSelection = true;
      }
    });
    if (mustResetSelection) {
      subgroupDisplaySelect.value = 'all';
    }
  }

  const designSelect = document.getElementById('sampling-design-select');
  if (designSelect) {
    const stratifiedOption = designSelect.querySelector('option[value="stratified"]');
    const shouldDisableStratified = numGroups <= 1;
    if (stratifiedOption) {
      stratifiedOption.disabled = shouldDisableStratified;
      if (shouldDisableStratified && designSelect.value === SamplingDesigns.STRATIFIED) {
        designSelect.value = SamplingDesigns.SRS;
        resetSamplingStatePreservePopulation();
      }
    }
  }
}

function initPopulation(numGroups, scenario) {
  population = [];
  const groupSizes = computeGroupSizes(numGroups, scenario);
  const ids = Array.from({ length: POP_SIZE }, (_, i) => i);

  // shuffle ids for random assignment
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  let idx = 0;
  const groupAssignments = [];
  groupSizes.forEach((size, g) => {
    for (let k = 0; k < size; k++) {
      groupAssignments.push(g);
    }
  });

  // if rounding left us short or long, trim
  while (groupAssignments.length > POP_SIZE) groupAssignments.pop();
  while (groupAssignments.length < POP_SIZE) groupAssignments.push(groupAssignments[groupAssignments.length - 1] || 0);

  for (let r = 0; r < POP_ROWS; r++) {
    for (let c = 0; c < POP_COLS; c++) {
      const id = r * POP_COLS + c;
      const group = groupAssignments[idx++] || 0;
      const value = generatePersonValue(c);
      population.push({ id, row: r, col: c, group, value });
    }
  }
  currentSample = [];
  samplingHistory = [];
  samplingHistoryByGroup = [];
  distributionSampleCount = 0;
  renderPopulation();
  updateSummary(null);
  renderSamplingDistribution();
}

function computeGroupSizes(numGroups, scenario) {
  const sizes = new Array(numGroups).fill(0);
  if (scenario === 'balanced') {
    const base = Math.floor(POP_SIZE / numGroups);
    for (let g = 0; g < numGroups; g++) sizes[g] = base;
    let remaining = POP_SIZE - base * numGroups;
    let g = 0;
    while (remaining > 0) {
      sizes[g++] += 1;
      remaining--;
      if (g >= numGroups) g = 0;
    }
  } else if (scenario === 'skewedA') {
    // group 0 majority
    const major = Math.floor(POP_SIZE * 0.6);
    sizes[0] = major;
    const rest = POP_SIZE - major;
    const others = numGroups - 1;
    const base = Math.floor(rest / others);
    for (let g = 1; g < numGroups; g++) sizes[g] = base;
    let remaining = POP_SIZE - sizes.reduce((a, b) => a + b, 0);
    let g = 1;
    while (remaining > 0 && g < numGroups) {
      sizes[g++] += 1;
      remaining--;
    }
  } else {
    // many small groups: slightly more even, but spread thin
    const base = Math.floor(POP_SIZE / numGroups);
    for (let g = 0; g < numGroups; g++) sizes[g] = base;
    let remaining = POP_SIZE - base * numGroups;
    let g = numGroups - 1;
    while (remaining > 0 && g >= 0) {
      sizes[g--] += 1;
      remaining--;
      if (g < 0) g = numGroups - 1;
    }
  }
  return sizes;
}

function applySamplingScenario(id) {
  const scenario = SamplingScenarios.find(s => s.id === id);
  const descEl = document.getElementById('sampling-scenario-description');
  if (!scenario) {
    if (descEl) {
      descEl.innerHTML =
        '<p>Use these presets to explore sampling case studies, or leave this on Manual to configure your own population and design.</p>';
    }
    return;
  }

  if (descEl) {
    descEl.innerHTML = `<p>${scenario.description}</p>`;
  }

  const cfg = scenario.config || {};
  const numGroupsSelect = document.getElementById('num-groups-select');
  const popScenarioSelect = document.getElementById('population-scenario-select');
  const designSelect = document.getElementById('sampling-design-select');
  const sampleSizeInput = document.getElementById('sample-size-input');
  const showValuesCheckbox = document.getElementById('show-values-checkbox');
  const statModeSelect = document.getElementById('statistic-mode-select');
  const subgroupDisplaySelect = document.getElementById('subgroup-display-select');
  const showTrueMeanCheckbox = document.getElementById('show-true-mean-checkbox');
  const showTrueSubCheckbox = document.getElementById('show-true-subgroup-means-checkbox');

  const numGroups = cfg.numGroups || 3;
  const scenarioKey = cfg.populationScenario || 'balanced';

  if (numGroupsSelect) numGroupsSelect.value = String(numGroups);
  if (popScenarioSelect) popScenarioSelect.value = scenarioKey;

  updateStrataWeightVisibility();
  initPopulation(numGroups, scenarioKey);

  if (designSelect && cfg.design) {
    designSelect.value = cfg.design;
  }
  if (sampleSizeInput && cfg.sampleSize) {
    sampleSizeInput.value = String(cfg.sampleSize);
  }
  if (showValuesCheckbox && typeof cfg.showValues === 'boolean') {
    showValuesCheckbox.checked = cfg.showValues;
  }

  if (Array.isArray(cfg.strataWeights)) {
    for (let g = 0; g < cfg.strataWeights.length; g++) {
      const wInput = document.getElementById(`strata-weight-${g}`);
      if (wInput && typeof cfg.strataWeights[g] === 'number') {
        wInput.value = String(cfg.strataWeights[g]);
      }
    }
  }

  if (statModeSelect && cfg.statisticMode) {
    statModeSelect.value = cfg.statisticMode;
  }
  if (subgroupDisplaySelect && typeof cfg.subgroupDisplay === 'number') {
    subgroupDisplaySelect.value = String(cfg.subgroupDisplay);
  } else if (subgroupDisplaySelect && cfg.subgroupDisplay === 'all') {
    subgroupDisplaySelect.value = 'all';
  }

  if (showTrueMeanCheckbox && typeof cfg.showTrueMean === 'boolean') {
    showTrueMeanCheckbox.checked = cfg.showTrueMean;
  }
  if (showTrueSubCheckbox && typeof cfg.showTrueSubgroupMeans === 'boolean') {
    showTrueSubCheckbox.checked = cfg.showTrueSubgroupMeans;
  }

  resetSamplingStatePreservePopulation();
  renderSamplingDistribution();
}

function renderPopulation() {
  const container = document.getElementById('population-grid');
  if (!container) return;
  container.innerHTML = '';
  const showValues = !!document.getElementById('show-values-checkbox')?.checked;
  const hasSample = currentSample && currentSample.length > 0;
  const design = document.getElementById('sampling-design-select')?.value || SamplingDesigns.SRS;
  const isCluster = design === SamplingDesigns.CLUSTER;
  const isConvenience = design === SamplingDesigns.CONVENIENCE;

  population.forEach(person => {
    const div = document.createElement('div');
    div.className = 'person';
    div.style.color = groupPalette[person.group % groupPalette.length];
    if (currentSample.includes(person.id)) {
      div.classList.add('sampled');
    } else if (hasSample) {
      div.classList.add('not-sampled');
    }
    if (showValues) {
      div.textContent = person.value.toString();
    } else {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'person-icon');
      svg.setAttribute('viewBox', '0 0 24 24');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#person-icon');
      svg.appendChild(use);
      div.appendChild(svg);
    }
    container.appendChild(div);
  });

  if (isCluster) {
    addClusterOverlay(container);
  } else if (isConvenience) {
    addConvenienceOverlay(container);
  }
}

function addClusterOverlay(container) {
  const persons = Array.from(container.getElementsByClassName('person'));
  if (!persons.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'cluster-overlay';

  const rowsPerCluster = Math.max(1, Math.floor(POP_ROWS / 4));
  const colsPerCluster = Math.max(1, Math.floor(POP_COLS / 4));

  // Vertical boundaries between column clusters
  const firstRow = persons.slice(0, POP_COLS);
  for (let colIndex = colsPerCluster; colIndex < POP_COLS; colIndex += colsPerCluster) {
    if (colIndex >= colsPerCluster * 4) break;
    const leftCell = firstRow[colIndex - 1];
    const rightCell = firstRow[colIndex];
    if (!leftCell || !rightCell) continue;
    const c1 = leftCell.offsetLeft + leftCell.offsetWidth / 2;
    const c2 = rightCell.offsetLeft + rightCell.offsetWidth / 2;
    const x = (c1 + c2) / 2;
    const line = document.createElement('div');
    line.className = 'cluster-line vertical';
    line.style.left = `${x}px`;
    overlay.appendChild(line);
  }

  // Horizontal boundaries between row clusters
  for (let rowIndex = rowsPerCluster; rowIndex < POP_ROWS; rowIndex += rowsPerCluster) {
    if (rowIndex >= rowsPerCluster * 4) break;
    const topCell = persons[(rowIndex - 1) * POP_COLS];
    const bottomCell = persons[rowIndex * POP_COLS];
    if (!topCell || !bottomCell) continue;
    const r1 = topCell.offsetTop + topCell.offsetHeight / 2;
    const r2 = bottomCell.offsetTop + bottomCell.offsetHeight / 2;
    const y = (r1 + r2) / 2;
    const line = document.createElement('div');
    line.className = 'cluster-line horizontal';
    line.style.top = `${y}px`;
    overlay.appendChild(line);
  }

  container.appendChild(overlay);
}

function addConvenienceOverlay(container) {
  const persons = Array.from(container.getElementsByClassName('person'));
  if (!persons.length) return;

  const frameRows = Math.floor(POP_ROWS / 2);
  const frameCols = Math.floor(POP_COLS / 2);
  if (frameRows < 1 || frameCols < 1) return;

  const topLeft = persons[0];
  const bottomRightIndex = (frameRows - 1) * POP_COLS + (frameCols - 1);
  const bottomRight = persons[bottomRightIndex];
  if (!topLeft || !bottomRight) return;

  const x = topLeft.offsetLeft;
  const y = topLeft.offsetTop;
  const width = bottomRight.offsetLeft + bottomRight.offsetWidth - x;
  const height = bottomRight.offsetTop + bottomRight.offsetHeight - y;

  const overlay = document.createElement('div');
  overlay.className = 'convenience-overlay';
  overlay.style.left = `${x}px`;
  overlay.style.top = `${y}px`;
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;

  container.appendChild(overlay);
}

function drawSampleOnce() {
  const design = document.getElementById('sampling-design-select')?.value || SamplingDesigns.SRS;
  const nInput = document.getElementById('sample-size-input');
  const requestedN = clamp(parseInt(nInput?.value || '80', 10) || 80, 10, POP_SIZE);
  let ids = [];
  if (design === SamplingDesigns.SRS) {
    ids = sampleSRS(requestedN);
  } else if (design === SamplingDesigns.STRATIFIED) {
    ids = sampleStratified(requestedN);
  } else if (design === SamplingDesigns.CLUSTER) {
    ids = sampleCluster(requestedN);
  } else if (design === SamplingDesigns.SYSTEMATIC) {
    ids = sampleSystematic(requestedN);
  } else {
    ids = sampleConvenience(requestedN);
  }
  const actualN = ids.length;
  if (design === SamplingDesigns.CONVENIENCE && actualN < requestedN) {
    setSamplingWarning(
      `Requested sample size ${requestedN} exceeds the number of individuals (${actualN}) in the convenience sampling frame. Using ${actualN} instead.`
    );
  } else {
    setSamplingWarning('');
  }
  currentSample = ids;
  const estProp = computeGroupAProp(ids);
  const estMean = computeSampleMeanValue(ids);
  samplingHistory.push(estMean);
  const groupMeans = computeSampleGroupMeans(ids);
  Object.keys(groupMeans).forEach(gKey => {
    const g = parseInt(gKey, 10);
    const m = groupMeans[gKey];
    if (Number.isFinite(m)) {
      samplingHistoryByGroup.push({ group: g, mean: m });
    }
  });
  distributionSampleCount += 1;
  renderPopulation();
  updateSummary({ n: actualN, design, estProp, estMean });
  renderSamplingDistribution();
  updateTotalSamplesDrawnDisplay();
}

function simulateManySamples() {
  const design = document.getElementById('sampling-design-select')?.value || SamplingDesigns.SRS;
  const nInput = document.getElementById('sample-size-input');
  const requestedN = clamp(parseInt(nInput?.value || '80', 10) || 80, 10, POP_SIZE);
  const numInput = document.getElementById('num-simulations-input');
  const iterations = clamp(parseInt(numInput?.value || '200', 10) || 200, 10, 1000);
  samplingHistory = [];
  samplingHistoryByGroup = [];
  distributionSampleCount = 0;
  let lastIds = [];
  for (let i = 0; i < iterations; i++) {
    let ids = [];
    if (design === SamplingDesigns.SRS) {
      ids = sampleSRS(requestedN);
    } else if (design === SamplingDesigns.STRATIFIED) {
      ids = sampleStratified(requestedN);
    } else if (design === SamplingDesigns.CLUSTER) {
      ids = sampleCluster(requestedN);
    } else if (design === SamplingDesigns.SYSTEMATIC) {
      ids = sampleSystematic(requestedN);
    } else {
      ids = sampleConvenience(requestedN);
    }
    const estMean = computeSampleMeanValue(ids);
    samplingHistory.push(estMean);
    const groupMeans = computeSampleGroupMeans(ids);
    Object.keys(groupMeans).forEach(gKey => {
      const g = parseInt(gKey, 10);
      const m = groupMeans[gKey];
      if (Number.isFinite(m)) {
        samplingHistoryByGroup.push({ group: g, mean: m });
      }
    });
    lastIds = ids;
  }
  distributionSampleCount = iterations;
  // Keep last sample (with chosen design) in grid for visual reference
  currentSample = lastIds;
  renderPopulation();
  const lastMean = samplingHistory[samplingHistory.length - 1];
  const lastProp = computeGroupAProp(currentSample);
  const actualN = currentSample.length;
  if (design === SamplingDesigns.CONVENIENCE && actualN < requestedN) {
    setSamplingWarning(
      `Requested sample size ${requestedN} exceeds the number of individuals (${actualN}) in the convenience sampling frame. Using ${actualN} in each simulated sample.`
    );
  } else {
    setSamplingWarning('');
  }
  updateSummary({ n: actualN, design, estProp: lastProp, estMean: lastMean });
  renderSamplingDistribution();
  updateTotalSamplesDrawnDisplay();
}

function sampleSRS(n) {
  const ids = Array.from({ length: POP_SIZE }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, n);
}

function sampleStratified(n) {
  const groups = {};
  population.forEach(person => {
    if (!groups[person.group]) groups[person.group] = [];
    groups[person.group].push(person.id);
  });
  const ids = [];
  const groupKeys = Object.keys(groups);

  // Read stratified weights (relative) if any
  const numGroups = getCurrentNumGroups();
  const weights = [];
  for (let g = 0; g < numGroups; g++) {
    const input = document.getElementById(`strata-weight-${g}`);
    if (input) {
      const w = parseFloat(input.value);
      weights[g] = Number.isFinite(w) && w > 0 ? w : 0;
    } else {
      weights[g] = 0;
    }
  }
  const weightSum = weights.reduce((a, b) => a + b, 0);

  groupKeys.forEach(gKey => {
    const g = parseInt(gKey, 10);
    const pool = groups[g];
    let nGroup;
    if (weightSum > 0 && Number.isFinite(weights[g]) && weights[g] > 0) {
      nGroup = Math.round((weights[g] / weightSum) * n);
    } else {
      nGroup = Math.round((pool.length / POP_SIZE) * n);
    }
    const poolCopy = pool.slice();
    for (let i = poolCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
    }
    ids.push(...poolCopy.slice(0, nGroup));
  });
  // Adjust to exact n
  if (ids.length > n) {
    return ids.slice(0, n);
  }
  if (ids.length < n) {
    const remaining = sampleSRS(n - ids.length).filter(id => !ids.includes(id));
    ids.push(...remaining);
  }
  return ids;
}

function sampleCluster(n) {
  // Divide grid into 4x4 clusters (row and column blocks)
  const rowsPerCluster = Math.max(1, Math.floor(POP_ROWS / 4));
  const colsPerCluster = Math.max(1, Math.floor(POP_COLS / 4));
  const clusters = {};
  population.forEach(person => {
    let clusterRow = Math.floor(person.row / rowsPerCluster);
    let clusterCol = Math.floor(person.col / colsPerCluster);
    if (clusterRow > 3) clusterRow = 3;
    if (clusterCol > 3) clusterCol = 3;
    const key = `${clusterRow}-${clusterCol}`;
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(person.id);
  });
  const clusterKeys = Object.keys(clusters);
  // shuffle clusters
  for (let i = clusterKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clusterKeys[i], clusterKeys[j]] = [clusterKeys[j], clusterKeys[i]];
  }
  const ids = [];
  for (const key of clusterKeys) {
    ids.push(...clusters[key]);
    if (ids.length >= n) break;
  }
  return ids.slice(0, n);
}

function sampleSystematic(n) {
  const k = Math.floor(POP_SIZE / n);
  const start = Math.floor(Math.random() * k);
  const ids = [];
  for (let i = start; i < POP_SIZE; i += k) {
    ids.push(i);
    if (ids.length >= n) break;
  }
  return ids;
}

function sampleConvenience(n) {
  // Convenience sample: only individuals in the upper-left region have a chance to be selected.
  const frameRows = Math.floor(POP_ROWS / 2);
  const frameCols = Math.floor(POP_COLS / 2);
  const frameIds = [];
  population.forEach(person => {
    if (person.row < frameRows && person.col < frameCols) {
      frameIds.push(person.id);
    }
  });
  if (!frameIds.length) return [];
  const targetN = Math.min(n, frameIds.length);
  const pool = frameIds.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, targetN);
}

function computeGroupAProp(sampleIds) {
  if (!sampleIds || !sampleIds.length) return NaN;
  const groupAIds = sampleIds.filter(id => {
    const person = population[id];
    return person && person.group === 0;
  });
  return groupAIds.length / sampleIds.length;
}

function computeSampleMeanValue(sampleIds) {
  if (!sampleIds || !sampleIds.length) return NaN;
  let sum = 0;
  sampleIds.forEach(id => {
    const person = population[id];
    if (person) sum += person.value;
  });
  return sum / sampleIds.length;
}

function computeTrueMeanValue() {
  if (!population.length) return NaN;
  let sum = 0;
  population.forEach(p => {
    sum += p.value;
  });
  return sum / population.length;
}

function computeTrueMeanValueForGroup(groupIndex) {
  if (!population.length) return NaN;
  let sum = 0;
  let count = 0;
  population.forEach(p => {
    if (p.group === groupIndex) {
      sum += p.value;
      count += 1;
    }
  });
  if (count === 0) return NaN;
  return sum / count;
}

function computeTrueGroupAProp() {
  const countA = population.filter(p => p.group === 0).length;
  return countA / POP_SIZE;
}

function computeSampleGroupMeans(sampleIds) {
  const sums = {};
  const counts = {};
  sampleIds.forEach(id => {
    const person = population[id];
    if (!person) return;
    const g = person.group;
    if (!sums[g]) {
      sums[g] = 0;
      counts[g] = 0;
    }
    sums[g] += person.value;
    counts[g] += 1;
  });
  const means = {};
  Object.keys(sums).forEach(gKey => {
    const g = parseInt(gKey, 10);
    if (counts[g] > 0) {
      means[gKey] = sums[g] / counts[g];
    }
  });
  return means;
}

function updateSummary(info) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const trueProp = computeTrueGroupAProp();
  const trueMean = computeTrueMeanValue();
  set('metric-true-prop', Number.isFinite(trueProp) ? (trueProp * 100).toFixed(1) + '%' : '—');
  set('metric-true-mean', Number.isFinite(trueMean) ? trueMean.toFixed(1) : '—');
  if (!info) {
    set('metric-sample-prop', '—');
    set('metric-sample-mean', '—');
    set('metric-design', '—');
    set('metric-n', '—');
    return;
  }
  const { n, design, estProp, estMean } = info;
  set('metric-sample-prop', Number.isFinite(estProp) ? (estProp * 100).toFixed(1) + '%' : '—');
  set('metric-sample-mean', Number.isFinite(estMean) ? estMean.toFixed(1) : '—');
  const designLabel = {
    [SamplingDesigns.SRS]: 'Simple random sampling',
    [SamplingDesigns.STRATIFIED]: 'Stratified sampling',
    [SamplingDesigns.CLUSTER]: 'Cluster sampling',
    [SamplingDesigns.SYSTEMATIC]: 'Systematic sampling',
    [SamplingDesigns.CONVENIENCE]: 'Convenience sampling'
  }[design] || design;
  set('metric-design', designLabel);
  set('metric-n', n.toString());
}

function renderSamplingDistribution() {
  const container = document.getElementById('sampling-distribution-chart');
  if (!container || typeof Plotly === 'undefined') return;
  const modeSel = document.getElementById('statistic-mode-select');
  const mode = modeSel ? modeSel.value : 'overall';
  const subgroupFilterSel = document.getElementById('subgroup-display-select');
  const subgroupFilter = subgroupFilterSel ? subgroupFilterSel.value : 'all';

  const useOverall = mode !== 'subgroups';
  const overallValues = samplingHistory.slice();
  const subgroupRecords = samplingHistoryByGroup.slice();

  if (useOverall && !overallValues.length) {
    Plotly.purge(container);
    return;
  }
  if (!useOverall && !subgroupRecords.length) {
    Plotly.purge(container);
    return;
  }

  hasSuccessfulRun = true;
  checkAndTrackUsage();

  // Compute axis ranges based on the overall mean distribution so that
  // subgroup views share the same X/Y scales as the overall view.
  const NUM_BINS = 15;
  let axisXMin = null;
  let axisXMax = null;
  let axisYMax = null;
  if (overallValues.length) {
    let minOverall = Math.min(...overallValues);
    let maxOverall = Math.max(...overallValues);
    let xMinOverall = minOverall;
    let xMaxOverall = maxOverall;
    if (xMinOverall === xMaxOverall) {
      xMinOverall = xMinOverall - 0.5;
      xMaxOverall = xMaxOverall + 0.5;
    }
    const binWidthOverall = (xMaxOverall - xMinOverall) / NUM_BINS;
    const countsOverall = new Array(NUM_BINS).fill(0);
    overallValues.forEach(v => {
      let idx = Math.floor((v - xMinOverall) / binWidthOverall);
      if (idx < 0) idx = 0;
      if (idx >= NUM_BINS) idx = NUM_BINS - 1;
      countsOverall[idx] += 1;
    });
    const maxCountOverall = countsOverall.reduce((a, b) => (b > a ? b : a), 0);
    axisXMin = xMinOverall;
    axisXMax = xMaxOverall;
    axisYMax = maxCountOverall || 1;
  }

  // Prepare records, with optional subgroup filter
  let records;
  if (useOverall) {
    records = overallValues.map(v => ({ mean: v, group: 0 }));
  } else {
    let baseRecords = subgroupRecords;
    if (subgroupFilter !== 'all') {
      const gFilter = parseInt(subgroupFilter, 10);
      if (Number.isFinite(gFilter)) {
        const filtered = baseRecords.filter(r => r.group === gFilter);
        baseRecords = filtered.length ? filtered : baseRecords;
      }
    }
    records = baseRecords;
  }

  if (!records.length) {
    Plotly.purge(container);
    return;
  }

  // Stacked dot plot: approximate histogram using dots
  const values = records.map(r => r.mean);
  let xMin = axisXMin;
  let xMax = axisXMax;
  if (xMin === null || xMax === null) {
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    xMin = minVal;
    xMax = maxVal;
    if (xMin === xMax) {
      xMin = xMin - 0.5;
      xMax = xMax + 0.5;
    }
  }
  const numBins = NUM_BINS;
  const binWidth = (xMax - xMin) / numBins;
  const counts = new Array(numBins).fill(0);
  const xPoints = [];
  const yPoints = [];
  const groupsForPoints = [];
  let yMaxLocal = 0;

  records.forEach(rec => {
    const v = rec.mean;
    let idx = Math.floor((v - xMin) / binWidth);
    if (idx < 0) idx = 0;
    if (idx >= numBins) idx = numBins - 1;
    counts[idx] += 1;
    if (counts[idx] > yMaxLocal) yMaxLocal = counts[idx];
    const center = xMin + (idx + 0.5) * binWidth;
    xPoints.push(center);
    yPoints.push(counts[idx]);
    groupsForPoints.push(rec.group || 0);
  });

  const trace = {
    x: xPoints,
    y: yPoints,
    type: 'scatter',
    mode: 'markers',
    marker: {
      size: 6,
      opacity: 0.8,
      color: useOverall
        ? '#2563eb'
        : groupsForPoints.map(g => groupPalette[g % groupPalette.length])
    },
    hovertemplate: 'Sample mean value: %{x:.1f}<extra></extra>'
  };
  const shapes = [];
  const annotations = [];
  if (useOverall) {
    const trueMean = computeTrueMeanValue();
    const showTrue = !!document.getElementById('show-true-mean-checkbox')?.checked;
    if (Number.isFinite(trueMean) && showTrue) {
      shapes.push({
        type: 'line',
        x0: trueMean,
        x1: trueMean,
        y0: 0,
        y1: 1,
        xref: 'x',
        yref: 'paper',
        line: { color: '#ef4444', width: 2, dash: 'dash' }
      });
      annotations.push({
        x: trueMean,
        y: 1.05,
        xref: 'x',
        yref: 'paper',
        text: 'True mean',
        showarrow: false,
        font: { size: 10, color: '#ef4444' }
      });
    }
  } else {
    const showTrueSub = !!document.getElementById('show-true-subgroup-means-checkbox')?.checked;
    if (showTrueSub) {
      const gFilter =
        subgroupFilter !== 'all' && Number.isFinite(parseInt(subgroupFilter, 10))
          ? parseInt(subgroupFilter, 10)
          : null;
      const numGroups = getCurrentNumGroups();
      for (let g = 0; g < numGroups; g++) {
        if (gFilter !== null && g !== gFilter) continue;
        const trueMeanG = computeTrueMeanValueForGroup(g);
        if (!Number.isFinite(trueMeanG)) continue;
        shapes.push({
          type: 'line',
          x0: trueMeanG,
          x1: trueMeanG,
          y0: 0,
          y1: 1,
          xref: 'x',
          yref: 'paper',
          line: { color: groupPalette[g % groupPalette.length], width: 2, dash: 'dot' }
        });
        annotations.push({
          x: trueMeanG,
          y: 1.05,
          xref: 'x',
          yref: 'paper',
          text: `Group ${String.fromCharCode(65 + g)}`,
          showarrow: false,
          font: { size: 9, color: groupPalette[g % groupPalette.length] }
        });
      }
    }
  }
  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 20, r: 20, b: 60, l: 60 },
      xaxis: {
        title: 'Sample mean value',
        range: [xMin, xMax]
      },
      yaxis: {
        title: '',
        showticklabels: false,
        range: [0, axisYMax || yMaxLocal || 1]
      },
      shapes,
      annotations,
      showlegend: false
    },
    { responsive: true }
  );

  const noteEl = document.getElementById('sampling-distribution-note');
  if (noteEl) {
    const countText =
      distributionSampleCount > 0
        ? ` Total samples contributing to this distribution (including single draws and simulations): ${distributionSampleCount}.`
        : '';
    noteEl.textContent =
      'This chart accumulates the sample mean of the value of interest in repeated samples of the same size under the selected design. ' +
      'Compare how tightly (or loosely) the sample means cluster around the true population mean and whether some designs are visibly biased.' +
      countText;
  }
}

function resetSamplingStatePreservePopulation() {
  currentSample = [];
  samplingHistory = [];
  samplingHistoryByGroup = [];
  distributionSampleCount = 0;
  renderPopulation();
  updateSummary(null);
  renderSamplingDistribution();
}

function updateTotalSamplesDrawnDisplay() {
  const el = document.getElementById('total-samples-count');
  if (el) {
    el.textContent = distributionSampleCount.toString();
  }
}

function setSamplingWarning(message) {
  const el = document.getElementById('sampling-warning');
  if (el) el.textContent = message || '';
}

document.addEventListener('DOMContentLoaded', () => {
  const createdLabel = document.getElementById('created-date');
  const modifiedLabel = document.getElementById('modified-date');
  if (createdLabel) createdLabel.textContent = SAMPLING_CREATED_DATE;
  if (modifiedLabel) modifiedLabel.textContent = samplingModifiedDate;

  const showValuesHint = document.querySelector('#show-values-checkbox')?.closest('div')?.querySelector('.hint');
  if (showValuesHint) {
    showValuesHint.textContent =
      'Values (roughly 10–500) represent the metric of interest (for example, monthly coffee spend). In practice you never see everyone’s value in the population; we reveal them here only as a teaching aid so you can visually compare the true population and any sample drawn from it.';
  }

  const numGroupsSelect = document.getElementById('num-groups-select');
  const popScenarioSelect = document.getElementById('population-scenario-select');
  if (numGroupsSelect && popScenarioSelect) {
    const regenerate = () => {
      const numGroups = parseInt(numGroupsSelect.value || '3', 10) || 3;
      const scenario = popScenarioSelect.value || 'balanced';
       updateStrataWeightVisibility();
      initPopulation(numGroups, scenario);
    };
    numGroupsSelect.addEventListener('change', regenerate);
    popScenarioSelect.addEventListener('change', regenerate);
    updateStrataWeightVisibility();
    regenerate();
  } else {
    initPopulation(3, 'balanced');
  }

  const samplingScenarioSelect = document.getElementById('sampling-scenario-select');
  if (samplingScenarioSelect) {
    samplingScenarioSelect.innerHTML = '<option value="">Manual settings (no preset)</option>';
    SamplingScenarios.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      samplingScenarioSelect.appendChild(opt);
    });
    samplingScenarioSelect.addEventListener('change', () => {
      const id = samplingScenarioSelect.value;
      if (!id) {
        applySamplingScenario(null);
      } else {
        applySamplingScenario(id);
      }
    });
  }

  const designSelect = document.getElementById('sampling-design-select');
  if (designSelect) {
    designSelect.addEventListener('change', () => {
      resetSamplingStatePreservePopulation();
    });
  }

  const sampleSizeInput = document.getElementById('sample-size-input');
  if (sampleSizeInput) {
    sampleSizeInput.addEventListener('input', () => {
      resetSamplingStatePreservePopulation();
    });
  }

  const showValuesCheckbox = document.getElementById('show-values-checkbox');
  if (showValuesCheckbox) {
    showValuesCheckbox.addEventListener('change', () => {
      resetSamplingStatePreservePopulation();
    });
  }

  const showTrueMeanCheckbox = document.getElementById('show-true-mean-checkbox');
  if (showTrueMeanCheckbox) {
    showTrueMeanCheckbox.addEventListener('change', () => {
      renderSamplingDistribution();
    });
  }

  const statModeSelect = document.getElementById('statistic-mode-select');
  const subgroupDisplaySelect = document.getElementById('subgroup-display-select');
  const subgroupDisplayContainer = document.getElementById('subgroup-display-container');
  if (statModeSelect) {
    const syncSubgroupControl = () => {
      const isSubgroupMode = statModeSelect.value === 'subgroups';
      if (subgroupDisplaySelect) {
        subgroupDisplaySelect.disabled = !isSubgroupMode;
      }
      if (subgroupDisplayContainer) {
        subgroupDisplayContainer.style.opacity = isSubgroupMode ? '' : '0.6';
      }
    };
    statModeSelect.addEventListener('change', () => {
      syncSubgroupControl();
      renderSamplingDistribution();
    });
    syncSubgroupControl();
  }

  if (subgroupDisplaySelect) {
    subgroupDisplaySelect.addEventListener('change', () => {
      renderSamplingDistribution();
    });
  }

  const showTrueSubCheckbox = document.getElementById('show-true-subgroup-means-checkbox');
  if (showTrueSubCheckbox) {
    showTrueSubCheckbox.addEventListener('change', () => {
      renderSamplingDistribution();
    });
  }

  for (let g = 0; g < 5; g++) {
    const wInput = document.getElementById(`strata-weight-${g}`);
    if (wInput) {
      wInput.addEventListener('input', () => {
        resetSamplingStatePreservePopulation();
      });
    }
  }

  const drawBtn = document.getElementById('draw-sample-btn');
  if (drawBtn) {
    drawBtn.addEventListener('click', event => {
      event.preventDefault();
      drawSampleOnce();
    });
  }
  const simulateBtn = document.getElementById('simulate-many-btn');
  if (simulateBtn) {
    simulateBtn.addEventListener('click', event => {
      event.preventDefault();
      simulateManySamples();
    });
  }
});
function generatePersonValue(col) {
  // Approximate normal with spatial drift: higher means on the left, lower on the right.
  // Base mean ranges roughly from 140 (left) down to 60 (right).
  const position = POP_COLS > 1 ? col / (POP_COLS - 1) : 0.5;
  const baseMean = 140 - 80 * position;
  const sd = 20;
  const u1 = Math.random() || 1e-6;
  const u2 = Math.random() || 1e-6;
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const val = baseMean + sd * z;
  const clipped = clamp(Math.round(val), 10, 500);
  return clipped;
}
