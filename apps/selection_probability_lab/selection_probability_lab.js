// Selection Probability Lab

const SELECTION_LAB_CREATED_DATE = '2025-11-25';
let selectionLabModifiedDate = new Date().toLocaleDateString();

const SelectionScenarios = [
  {
    id: 'vip-panel',
    label: 'VIP customers in a one-off panel sample',
    description:
      'A panel of N = 200 customers includes r = 10 VIPs. Marketing draws a one-off sample of n = 40 without replacement and wants to know the chance at least one VIP appears in the sample.',
    settings: {
      populationSize: 200,
      sampleSize: 40,
      specialCount: 10,
      successCount: 1,
      samplingMode: 'without_replacement',
      probabilityMode: 'at_least_one',
      simulations: 3000
    }
  },
  {
    id: 'lead-ads',
    label: 'High-value leads in repeated ad impressions',
    description:
      'Each ad impression independently reaches one user out of N = 100 in a retargeting pool, with r = 5 of them being high-value prospects. You are interested in the chance of reaching at least one high-value prospect after n = 50 impressions (with replacement).',
    settings: {
      populationSize: 100,
      sampleSize: 50,
      specialCount: 5,
      successCount: 1,
      samplingMode: 'with_replacement',
      probabilityMode: 'at_least_one',
      simulations: 3000
    }
  },
  {
    id: 'qc-defects',
    label: 'Quality control: exactly k defects in a batch',
    description:
      'A batch of N = 120 emails has r = 8 with a formatting defect. A QA analyst checks n = 20 emails without replacement and wants the probability of finding exactly k = 2 defective emails in the checked sample.',
    settings: {
      populationSize: 120,
      sampleSize: 20,
      specialCount: 8,
      successCount: 2,
      samplingMode: 'without_replacement',
      probabilityMode: 'exact_k',
      simulations: 4000
    }
  }
];

let currentPopulation = []; // { id, isSpecial }
let currentSampleIds = [];
let simCounts = []; // counts of K over many simulations

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function syncInputsBounds() {
  const NInput = document.getElementById('population-size-input');
  const nInput = document.getElementById('sample-size-input');
  const rInput = document.getElementById('special-count-input');
  const kInput = document.getElementById('success-count-input');
  if (!NInput || !nInput || !rInput || !kInput) return;

  let N = clamp(parseInt(NInput.value || '100', 10) || 100, 1, 500);
  NInput.value = N;
  let n = clamp(parseInt(nInput.value || '20', 10) || 20, 1, 200);
  n = clamp(n, 1, N);
  nInput.value = n;
  let r = clamp(parseInt(rInput.value || '5', 10) || 5, 1, N);
  rInput.value = r;
  let k = clamp(parseInt(kInput.value || '1', 10) || 1, 0, Math.min(r, n));
  kInput.value = k;
}

function initPopulationForLab() {
  syncInputsBounds();
  const N = parseInt(document.getElementById('population-size-input').value, 10);
  const r = parseInt(document.getElementById('special-count-input').value, 10);

  currentPopulation = [];
  for (let i = 0; i < N; i++) {
    currentPopulation.push({ id: i, isSpecial: i < r });
  }
  currentSampleIds = [];
  simCounts = [];
  renderPopulationGrid();
  renderDistribution();
  updateMathPanels();
  updateMetrics();
}

function renderPopulationGrid() {
  const container = document.getElementById('population-grid');
  if (!container) return;
  container.innerHTML = '';

  const N = currentPopulation.length;
  if (!N) return;

  const cols = Math.ceil(Math.sqrt(N));
  container.style.display = 'grid';
  container.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  container.style.gap = '2px';

  currentPopulation.forEach(person => {
    const div = document.createElement('div');
    div.className = 'person';
    if (person.isSpecial) {
      div.classList.add('special');
    }
    if (currentSampleIds.includes(person.id)) {
      div.classList.add('sampled');
    }
    div.textContent = (person.id + 1).toString();
    container.appendChild(div);
  });

  const summaryEl = document.getElementById('population-summary');
  if (summaryEl) {
    const specialCount = currentPopulation.filter(p => p.isSpecial).length;
    summaryEl.textContent = `Population of N = ${N} items. Special items (highlighted): r = ${specialCount}. The current sample outlines the n drawn items (if any).`;
  }
}

function drawSampleOnceLab() {
  syncInputsBounds();
  const modeSel = document.getElementById('sampling-mode-select');
  const mode = modeSel ? modeSel.value : 'without_replacement';
  const N = currentPopulation.length;
  if (!N) return;
  const n = clamp(parseInt(document.getElementById('sample-size-input').value || '20', 10) || 20, 1, N);

  let ids = [];
  if (mode === 'without_replacement') {
    const pool = Array.from({ length: N }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    ids = pool.slice(0, n);
  } else {
    for (let i = 0; i < n; i++) {
      ids.push(Math.floor(Math.random() * N));
    }
  }

  currentSampleIds = ids;
  const warningEl = document.getElementById('sampling-warning');
  if (warningEl) warningEl.textContent = '';
  renderPopulationGrid();
  updateMetrics();
}

function simulateManySamplesLab() {
  syncInputsBounds();
  const modeSel = document.getElementById('sampling-mode-select');
  const mode = modeSel ? modeSel.value : 'without_replacement';
  const N = currentPopulation.length;
  if (!N) return;

  const n = clamp(parseInt(document.getElementById('sample-size-input').value || '20', 10) || 20, 1, N);
  const sims = clamp(parseInt(document.getElementById('num-simulations-input').value || '2000', 10) || 2000, 100, 5000);

  const specials = currentPopulation.filter(p => p.isSpecial).map(p => p.id);
  const r = specials.length;
  const maxK = Math.min(r, n);
  simCounts = new Array(maxK + 1).fill(0);
  currentSampleIds = [];

  for (let s = 0; s < sims; s++) {
    let ids = [];
    if (mode === 'without_replacement') {
      const pool = Array.from({ length: N }, (_, i) => i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      ids = pool.slice(0, n);
    } else {
      for (let i = 0; i < n; i++) {
        ids.push(Math.floor(Math.random() * N));
      }
    }
    const k = ids.reduce((acc, id) => (currentPopulation[id]?.isSpecial ? acc + 1 : acc), 0);
    if (k <= maxK) {
      simCounts[k] += 1;
    }
    if (s === sims - 1) {
      currentSampleIds = ids;
    }
  }

  renderPopulationGrid();
  renderDistribution();
  updateMathPanels();
  updateMetrics();
}

function clearSimulationLab() {
  simCounts = [];
  currentSampleIds = [];
  renderPopulationGrid();
  renderDistribution();
  updateMetrics();
}

function computeExactDistribution() {
  syncInputsBounds();
  const modeSel = document.getElementById('sampling-mode-select');
  const mode = modeSel ? modeSel.value : 'without_replacement';
  const N = currentPopulation.length;
  if (!N) return { probs: [], maxK: 0 };

  const n = clamp(parseInt(document.getElementById('sample-size-input').value || '20', 10) || 20, 1, N);
  const r = clamp(parseInt(document.getElementById('special-count-input').value || '5', 10) || 5, 1, N);
  const maxK = Math.min(r, n);
  const probs = new Array(maxK + 1).fill(0);

  if (mode === 'without_replacement') {
    const denom = comb(N, n);
    for (let k = 0; k <= maxK; k++) {
      const ways = comb(r, k) * comb(N - r, n - k);
      probs[k] = denom > 0 ? ways / denom : 0;
    }
  } else {
    const p = r / N;
    for (let k = 0; k <= maxK; k++) {
      probs[k] = binomialProb(n, k, p);
    }
  }

  const total = probs.reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (let i = 0; i < probs.length; i++) {
      probs[i] /= total;
    }
  }

  return { probs, maxK };
}

function comb(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n - k + i);
    result /= i;
  }
  return result;
}

function binomialProb(n, k, p) {
  if (p < 0 || p > 1) return 0;
  const coef = comb(n, k);
  return coef * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function renderDistribution() {
  const container = document.getElementById('distribution-chart');
  if (!container || typeof Plotly === 'undefined') return;

  const { probs, maxK } = computeExactDistribution();
  if (!probs.length) {
    Plotly.purge(container);
    return;
  }

  const N = currentPopulation.length;
  const n = clamp(parseInt(document.getElementById('sample-size-input').value || '20', 10) || 20, 1, N);
  const r = clamp(parseInt(document.getElementById('special-count-input').value || '5', 10) || 5, 1, N);

  const xs = [];
  const exactYs = [];
  const simYs = [];
  const simFreqs = [];

  const simsTotal = simCounts.reduce((a, b) => a + b, 0);

  for (let k = 0; k <= maxK; k++) {
    xs.push(k);
    exactYs.push(probs[k]);
    const count = simCounts[k] || 0;
    simFreqs.push(count);
    simYs.push(simsTotal > 0 ? count / simsTotal : 0);
  }

  const traceExact = {
    x: xs,
    y: exactYs,
    type: 'bar',
    name: 'Exact P(K = k)',
    marker: { color: '#2563eb', opacity: 0.8 }
  };

  const traceSim = {
    x: xs,
    y: simYs,
    type: 'bar',
    name: 'Simulated P(K = k)',
    marker: { color: '#f97316', opacity: 0.6 }
  };

  Plotly.newPlot(
    container,
    [traceExact, traceSim],
    {
      barmode: 'group',
      margin: { t: 30, r: 20, b: 50, l: 60 },
      xaxis: { title: 'k (number of special items in sample)' },
      yaxis: { title: 'Probability', rangemode: 'tozero' },
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.15 }
    },
    { responsive: true }
  );

  renderDistributionTable(xs, probs, simFreqs);

  const noteEl = document.getElementById('distribution-note');
  if (noteEl) {
    noteEl.textContent = `The distribution of K, the number of special items in a sample of size n = ${n} from a population with N = ${N} and r = ${r} special items.`;
  }
}

function renderDistributionTable(xs, exactProbs, simFreqs) {
  const tbody = document.querySelector('#distribution-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const totalSim = simFreqs.reduce((a, b) => a + b, 0);
  let cum = 0;

  xs.forEach((k, idx) => {
    const exact = exactProbs[idx] || 0;
    cum += exact;
    const freq = simFreqs[idx] || 0;
    const simProb = totalSim > 0 ? freq / totalSim : 0;

    const tr = document.createElement('tr');
    const tdK = document.createElement('td');
    tdK.textContent = k.toString();
    tr.appendChild(tdK);

    const tdExact = document.createElement('td');
    tdExact.textContent = exact.toFixed(4);
    tr.appendChild(tdExact);

    const tdFreq = document.createElement('td');
    tdFreq.textContent = totalSim ? freq.toString() : '—';
    tr.appendChild(tdFreq);

    const tdSimProb = document.createElement('td');
    tdSimProb.textContent = totalSim ? simProb.toFixed(4) : '—';
    tr.appendChild(tdSimProb);

    const tdCum = document.createElement('td');
    tdCum.textContent = cum.toFixed(4);
    tr.appendChild(tdCum);

    tbody.appendChild(tr);
  });
}

function updateMetrics() {
  const N = currentPopulation.length;
  if (!N) return;
  const n = clamp(parseInt(document.getElementById('sample-size-input').value || '20', 10) || 20, 1, N);
  const r = clamp(parseInt(document.getElementById('special-count-input').value || '5', 10) || 5, 1, N);
  const modeSel = document.getElementById('sampling-mode-select');
  const mode = modeSel ? modeSel.value : 'without_replacement';
  const probModeSel = document.getElementById('probability-mode-select');
  const probMode = probModeSel ? probModeSel.value : 'exact_k';
  const kInput = document.getElementById('success-count-input');
  const k = clamp(parseInt(kInput.value || '1', 10) || 1, 0, Math.min(r, n));

  const { probs, maxK } = computeExactDistribution();
  let exactProb = 0;
  if (probs.length) {
    if (probMode === 'exact_k') {
      exactProb = k <= maxK ? probs[k] : 0;
    } else {
      const p0 = probs[0] || 0;
      exactProb = 1 - p0;
    }
  }

  let simProb = NaN;
  const simsTotal = simCounts.reduce((a, b) => a + b, 0);
  if (simsTotal > 0) {
    if (probMode === 'exact_k') {
      const count = k <= maxK ? simCounts[k] || 0 : 0;
      simProb = count / simsTotal;
    } else {
      const count0 = simCounts[0] || 0;
      simProb = 1 - count0 / simsTotal;
    }
  }

  let expectedK = 0;
  if (probs.length) {
    for (let i = 0; i < probs.length; i++) {
      expectedK += i * probs[i];
    }
  }

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set('metric-exact-prob', probs.length ? exactProb.toFixed(4) : '—');
  set('metric-sim-prob', Number.isFinite(simProb) ? simProb.toFixed(4) : '—');
  set('metric-expected-k', probs.length ? expectedK.toFixed(3) : '—');

  const warningEl = document.getElementById('sampling-warning');
  if (warningEl) {
    if (mode === 'without_replacement' && n > N) {
      warningEl.textContent = 'Sample size n cannot exceed population size N when sampling without replacement.';
    } else if (r > N) {
      warningEl.textContent = 'Number of special items r cannot exceed N.';
    } else {
      warningEl.textContent = '';
    }
  }
}

function updateMathPanels() {
  const N = currentPopulation.length;
  if (!N) return;
  const n = clamp(parseInt(document.getElementById('sample-size-input').value || '20', 10) || 20, 1, N);
  const r = clamp(parseInt(document.getElementById('special-count-input').value || '5', 10) || 5, 1, N);
  const kInput = document.getElementById('success-count-input');
  const k = clamp(parseInt(kInput.value || '1', 10) || 1, 0, Math.min(r, n));
  const modeSel = document.getElementById('sampling-mode-select');
  const mode = modeSel ? modeSel.value : 'without_replacement';
  const probModeSel = document.getElementById('probability-mode-select');
  const probMode = probModeSel ? probModeSel.value : 'exact_k';

  const generalEl = document.getElementById('equations-general');
  const workedEl = document.getElementById('equations-worked');
  if (!generalEl || !workedEl) return;

  let generalHtml = '';
  let workedHtml = '';

  const { probs, maxK } = computeExactDistribution();
  let numericProb = null;
  let numericP0 = null;
  if (probs && probs.length) {
    if (probMode === 'exact_k') {
      numericProb = k <= maxK ? probs[k] : 0;
    } else {
      numericP0 = probs[0] || 0;
      numericProb = 1 - numericP0;
    }
  }

  if (mode === 'without_replacement') {
    generalHtml += `
      <p><strong>Hypergeometric model (sampling without replacement)</strong></p>
      <p>
        If a population has \(N\) items with \(r\) special items and you draw \(n\) items without replacement, then
        the number of specials \(K\) in the sample follows a hypergeometric distribution:
      </p>
      <p>
        Here \(\\binom{r}{k}\\) counts ways to choose which specials are in the sample, \(\\binom{N - r}{n - k}\\) counts ways to fill the rest of the sample with non-specials,
        and \(\\binom{N}{n}\\) counts all equally likely samples of size \(n\) from the population.
      </p>
      <p class="equation">
        \\[ P(K = k) = \\frac{\\binom{r}{k}\\binom{N - r}{n - k}}{\\binom{N}{n}}, \\quad k = 0,1,\\dots,\\min(r,n). \\]
      </p>
      <p>
        The probability of at least one special item is computed using the complement:
      </p>
      <p class="equation">
        \\[ P(K \\ge 1) = 1 - P(K = 0) = 1 - \\frac{\\binom{r}{0}\\binom{N - r}{n}}{\\binom{N}{n}}. \\]
      </p>
      <p>
        This uses the idea that it is often easier to compute the probability of <em>no</em> specials and subtract from 1 than to sum over all possible positive values of \(K\).
      </p>
    `;

    workedHtml += `
      <p><strong>Your inputs:</strong> \(N = ${N}\), \(n = ${n}\), \(r = ${r}\).</p>
    `;
    if (probMode === 'exact_k') {
      workedHtml += `
        <p>For \(k = ${k}\) specials in the sample:</p>
        <p class="equation">
          \\[ P(K = ${k}) = \\frac{\\binom{${r}}{${k}}\\binom{${N - r}}{${n - k}}}{\\binom{${N}}{${n}}}. \\]
        </p>
        ${numericProb !== null ? `<p>Numerically, this works out to approximately \\(P(K = ${k}) \\approx ${numericProb.toFixed(4)}\\).</p>` : ''}
      `;
    } else {
      workedHtml += `
        <p>Probability of seeing at least one special item:</p>
        <p class="equation">
          \\[ P(K \\ge 1) = 1 - P(K = 0) = 1 - \\frac{\\binom{${r}}{0}\\binom{${N - r}}{${n}}}{\\binom{${N}}{${n}}}. \\]
        </p>
        ${
          numericProb !== null && numericP0 !== null
            ? `<p>Here \\(P(K = 0) \\approx ${numericP0.toFixed(4)}\\), so \\(P(K \\ge 1) \\approx 1 - ${numericP0.toFixed(
                4
              )} = ${numericProb.toFixed(4)}\\).</p>`
            : ''
        }
      `;
    }
  } else {
    generalHtml += `
      <p><strong>Binomial model (sampling with replacement)</strong></p>
      <p>
        If each draw selects one item independently with probability \\(p = r/N\\) of being special, and you make \\(n\\)
        draws with replacement, then the number of specials \\(K\\) follows a binomial distribution:
      </p>
      <p>
        The term \\(\\binom{n}{k}\\) counts which of the \(n\) draws are special, \\(p^k\\) is the probability all those draws hit specials,
        and \\((1 - p)^{n-k}\\) is the probability the remaining draws hit non-specials.
      </p>
      <p class="equation">
        \\[ P(K = k) = \\binom{n}{k} p^k (1 - p)^{n-k}, \\quad k = 0,1,\\dots,n. \\]
      </p>
      <p>
        The probability of at least one special item is:
      </p>
      <p class="equation">
        \\[ P(K \\ge 1) = 1 - P(K = 0) = 1 - (1 - p)^n. \\]
      </p>
      <p>
        Again this is a complement: instead of summing \\(P(K = 1) + P(K = 2) + \\dots\\), we compute the easier \\(P(K = 0)\\) and subtract from 1.
      </p>
    `;

    const p = r / N;
    workedHtml += `
      <p><strong>Your inputs:</strong> \(N = ${N}\), \(n = ${n}\), \(r = ${r}\), so \(p = r/N = ${p.toFixed(4)}\).</p>
    `;
    if (probMode === 'exact_k') {
      workedHtml += `
        <p>For \(k = ${k}\) specials in the sample:</p>
        <p class="equation">
          \\[ P(K = ${k}) = \\binom{${n}}{${k}} (${p.toFixed(4)})^{${k}} (1 - ${p.toFixed(4)})^{${n - k}}. \\]
        </p>
        ${
          numericProb !== null
            ? `<p>Numerically, this gives \\(P(K = ${k}) \\approx ${numericProb.toFixed(4)}\\).</p>`
            : ''
        }
      `;
    } else {
      workedHtml += `
        <p>Probability of seeing at least one special item:</p>
        <p class="equation">
          \\[ P(K \\ge 1) = 1 - (1 - ${p.toFixed(4)})^{${n}}. \\]
        </p>
        ${
          numericProb !== null
            ? `<p>So the probability of at least one special item in ${n} draws is approximately \\(${numericProb.toFixed(
                4
              )}\\).</p>`
            : ''
        }
      `;
    }
  }

  generalEl.innerHTML = generalHtml;
  workedEl.innerHTML = workedHtml;

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([generalEl, workedEl]).catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const createdLabel = document.getElementById('created-date');
  const modifiedLabel = document.getElementById('modified-date');
  if (createdLabel) createdLabel.textContent = SELECTION_LAB_CREATED_DATE;
  if (modifiedLabel) modifiedLabel.textContent = selectionLabModifiedDate;

  initPopulationForLab();

  const scenarioSelect = document.getElementById('selection-scenario-select');
  if (scenarioSelect) {
    scenarioSelect.innerHTML = '<option value="">Manual settings (no preset)</option>';
    SelectionScenarios.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      scenarioSelect.appendChild(opt);
    });
    scenarioSelect.addEventListener('change', () => {
      const id = scenarioSelect.value;
      if (!id) {
        const desc = document.getElementById('selection-scenario-description');
        if (desc) {
          desc.innerHTML =
            '<p>Use these presets to explore selection case studies, or leave this on Manual to configure your own population and event of interest.</p>';
        }
        return;
      }
      applySelectionScenario(id);
    });
  }

  const inputs = [
    'population-size-input',
    'sample-size-input',
    'special-count-input',
    'success-count-input',
    'sampling-mode-select',
    'probability-mode-select'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      initPopulationForLab();
    });
    if (el.tagName === 'INPUT' && el.type === 'number') {
      el.addEventListener('input', () => {
        initPopulationForLab();
      });
    }
  });

  const simOnceBtn = document.getElementById('simulate-once-btn');
  if (simOnceBtn) {
    simOnceBtn.addEventListener('click', event => {
      event.preventDefault();
      drawSampleOnceLab();
    });
  }

  const simManyBtn = document.getElementById('simulate-many-btn');
  if (simManyBtn) {
    simManyBtn.addEventListener('click', event => {
      event.preventDefault();
      simulateManySamplesLab();
    });
  }

  const clearBtn = document.getElementById('clear-sim-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', event => {
      event.preventDefault();
      clearSimulationLab();
    });
  }
});

function applySelectionScenario(id) {
  const scenario = SelectionScenarios.find(s => s.id === id);
  const descEl = document.getElementById('selection-scenario-description');
  if (!scenario) {
    if (descEl) {
      descEl.innerHTML =
        '<p>Use these presets to explore selection case studies, or leave this on Manual to configure your own population and event of interest.</p>';
    }
    return;
  }

  if (descEl) {
    descEl.innerHTML = `<p>${scenario.description}</p>`;
  }

  const cfg = scenario.settings || {};
  const NInput = document.getElementById('population-size-input');
  const nInput = document.getElementById('sample-size-input');
  const rInput = document.getElementById('special-count-input');
  const kInput = document.getElementById('success-count-input');
  const samplingModeSelect = document.getElementById('sampling-mode-select');
  const probModeSelect = document.getElementById('probability-mode-select');
  const simsInput = document.getElementById('num-simulations-input');

  if (NInput && typeof cfg.populationSize === 'number') {
    NInput.value = String(cfg.populationSize);
  }
  if (nInput && typeof cfg.sampleSize === 'number') {
    nInput.value = String(cfg.sampleSize);
  }
  if (rInput && typeof cfg.specialCount === 'number') {
    rInput.value = String(cfg.specialCount);
  }
  if (kInput && typeof cfg.successCount === 'number') {
    kInput.value = String(cfg.successCount);
  }
  if (samplingModeSelect && cfg.samplingMode) {
    samplingModeSelect.value = cfg.samplingMode;
  }
  if (probModeSelect && cfg.probabilityMode) {
    probModeSelect.value = cfg.probabilityMode;
  }
  if (simsInput && typeof cfg.simulations === 'number') {
    simsInput.value = String(cfg.simulations);
  }

  initPopulationForLab();
}
