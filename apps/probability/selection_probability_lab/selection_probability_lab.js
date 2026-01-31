// Selection Probability Lab

const TOOL_SLUG = 'selection-probability';
const SELECTION_LAB_CREATED_DATE = '2025-11-25';
let selectionLabModifiedDate = new Date().toLocaleDateString();

const SelectionScenarios = [
  {
    id: 'vip-panel',
    label: 'VIP customers in a loyalty survey sample',
    description: `
      <p>
        You are supporting a loyalty team that wants feedback from their most profitable customers before changing the benefits
        structure. The CRM contains a small, cleaned list of <strong>N = 200</strong> loyalty members, of whom
        <strong>r = 10</strong> are tagged as <em>VIPs</em> based on spend and engagement.
      </p>
      <p>
        Your manager wants to invite only <strong>n = 40</strong> members to a short survey with an upgraded incentive, drawing
        the list <strong>without replacement</strong>. Before locking in the sample, they ask: “What is the probability that
        at least one VIP ends up in that invited group?” This matters, because if no VIPs are included you may miss the reaction
        of the customers who drive most of the margin.
      </p>
      <p>
        In this preset, the “special” outcome corresponds to “is a VIP customer.” The lab shows the exact probability of
        including at least one VIP in the survey sample, and how that probability changes as you adjust the total panel size,
        the number of VIPs, or the survey sample size. This is the same logic you would use when checking whether a sampling
        plan is likely to capture an important segment.
      </p>
    `,
    settings: {
      populationSize: 200,
      sampleSize: 40,
      specialCount: 10,
      successCount: 1,
      samplingMode: 'without_replacement',
      probabilityMode: 'at_least_one',
      simulations: 3000,
      specialLabel: 'is a VIP customer'
    }
  },
  {
    id: 'lead-ads',
    label: 'High-value leads in a retargeting burst',
    description: `
      <p>
        You are running a short retargeting burst to people who abandoned their cart last week. Your warm audience list has
        <strong>N = 100</strong> users, but only <strong>r = 5</strong> of them have been scored by sales as
        <em>high-value prospects</em> based on predicted lifetime value.
      </p>
      <p>
        Over the next few days you expect around <strong>n = 50</strong> paid impressions from this audience. Each impression
        effectively targets one person at random from the list, <strong>with replacement</strong>, because the same user can
        be shown your ad multiple times. Your stakeholder asks: “What is the probability that at least one of those impressions
        reaches a high-value prospect?”
      </p>
      <p>
        In this preset, the “special” outcome is “is a high-value prospect.” The binomial-style model treats each impression
        as an independent trial with probability <strong>p = r/N</strong> of landing on a high-value person. The tool shows
        how the probability of at least one “valuable” impression grows as you increase the number of impressions or improve
        the quality of the audience, which is exactly the trade-off you face when planning small, targeted campaigns.
      </p>
    `,
    settings: {
      populationSize: 100,
      sampleSize: 50,
      specialCount: 5,
      successCount: 1,
      samplingMode: 'with_replacement',
      probabilityMode: 'at_least_one',
      simulations: 3000,
      specialLabel: 'is a high-value prospect'
    }
  },
  {
    id: 'qc-defects',
    label: 'Quality control on a campaign asset batch',
    description: `
      <p>
        Your team is about to launch a multi-variant email campaign. Before scheduling the send, a QA analyst pulls a batch of
        <strong>N = 120</strong> prepared email versions (subject-line and creative combinations) and suspects that about
        <strong>r = 8</strong> may contain a visible defect, such as a broken personalization tag or off-brand headline.
      </p>
      <p>
        Because of time pressure, the analyst can manually inspect only <strong>n = 20</strong> emails, sampled
        <strong>without replacement</strong> from the batch. They ask: “What is the probability that this spot check will
        uncover <em>exactly</em> <strong>k = 2</strong> defective emails?” If too few defects are likely to be caught by
        checking 20, the team may decide to increase the QA sample or delay the send.
      </p>
      <p>
        In this preset, the “special” outcome is “contains a formatting defect.” The lab uses the hypergeometric distribution
        to compute the exact probability of seeing 0, 1, 2, … defects in the checked sample, and compares those probabilities
        to Monte Carlo simulations. This mirrors the kind of reasoning you use whenever you rely on spot checks to control
        quality for creative assets, landing pages, or product listings.
      </p>
    `,
    settings: {
      populationSize: 120,
      sampleSize: 20,
      specialCount: 8,
      successCount: 2,
      samplingMode: 'without_replacement',
      probabilityMode: 'exact_k',
      simulations: 4000,
      specialLabel: 'has a formatting defect'
    }
  },
  {
    id: 'player-homeruns',
    label: 'Projecting home runs in upcoming at-bats',
    description: `
      <p>
        Imagine you are helping a sponsorship team that wants to build a social promotion around a popular hitter. Over the
        current season they have tracked <strong>N = 200</strong> plate appearances for the player and recorded
        <strong>r = 5</strong> home runs. They would like to use this historical rate as a simple guide for what might happen
        in the next few games.
      </p>
      <p>
        For the promotion, the team is interested in the player’s next <strong>n = 10</strong> at-bats. They ask: “What is the
        distribution of the number of home runs we might see in those 10 at-bats, assuming the per-at-bat home-run probability
        stays roughly the same?” This is naturally modeled as repeated, independent trials with probability
        \(p \approx r/N = 5/200\) of a home run in any given at-bat.
      </p>
      <p>
        In this preset, the “special” outcome is “hits a home run,” and the model uses the binomial (with-replacement) setting
        to approximate future performance. You can explore the probability of seeing exactly \(k\) home runs, or at least one
        home run, in the next 10 at-bats, and see how sensitive those probabilities are to the assumed underlying rate.
      </p>
    `,
    settings: {
      populationSize: 200,
      sampleSize: 10,
      specialCount: 5,
      successCount: 1,
      samplingMode: 'with_replacement',
      probabilityMode: 'exact_k',
      simulations: 4000,
      specialLabel: 'hits a home run'
    }
  }
];

let currentPopulation = []; // { id, isSpecial }
let currentSampleIds = [];
let currentSampleCounts = {}; // id -> count in last sample
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

  let N = clamp(parseInt(NInput.value || '100', 10) || 100, 1, 5000);
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
  currentSampleCounts = {};
  simCounts = [];
  renderPopulationGrid();
  renderDistribution();
  updateMathPanels();
  updateMetrics();
}

function getSpecialLabel() {
  const input = document.getElementById('special-label-input');
  const raw = input && typeof input.value === 'string' ? input.value.trim() : '';
  return raw || 'special';
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
    const count = currentSampleCounts[person.id] || 0;
    if (count > 0 || currentSampleIds.includes(person.id)) {
      div.classList.add('sampled');
    }
    div.textContent = (person.id + 1).toString();

    if (count > 1) {
      const badge = document.createElement('span');
      badge.className = 'person-multi-badge';
      badge.textContent = `x ${count}`;
      div.appendChild(badge);
    }
    container.appendChild(div);
  });

  const summaryEl = document.getElementById('population-summary');
  if (summaryEl) {
    const specialCount = currentPopulation.filter(p => p.isSpecial).length;
    const label = getSpecialLabel();
    summaryEl.textContent = `Population of N = ${N} items. Items where the outcome "${label}" is true are highlighted (r = ${specialCount}). The current sample outlines the n drawn items (if any).`;
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
  currentSampleCounts = {};
  ids.forEach(id => {
    currentSampleCounts[id] = (currentSampleCounts[id] || 0) + 1;
  });
  const warningEl = document.getElementById('sampling-warning');
  if (warningEl) warningEl.textContent = '';
  renderPopulationGrid();
  updateMetrics();
  
  // Track successful run
  const specialCount = ids.reduce((acc, id) => (currentPopulation[id]?.isSpecial ? acc + 1 : acc), 0);
  if (typeof markRunSuccessful === 'function') {
    markRunSuccessful(TOOL_SLUG, {
      populationSize: N,
      sampleSize: n,
      samplingMode: mode,
      specialCount: specialCount
    });
  }
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
  currentSampleCounts = {};

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
      currentSampleCounts = {};
      ids.forEach(id => {
        currentSampleCounts[id] = (currentSampleCounts[id] || 0) + 1;
      });
    }
  }

  renderPopulationGrid();
  renderDistribution();
  updateMathPanels();
  updateMetrics();
  
  // Track successful batch run
  if (typeof markRunSuccessful === 'function') {
    markRunSuccessful(TOOL_SLUG, {
      populationSize: N,
      sampleSize: n,
      samplingMode: mode,
      specialCount: r,
      numSimulations: sims,
      simCounts: simCounts
    });
  }
}

function clearSimulationLab() {
  simCounts = [];
  currentSampleIds = [];
  currentSampleCounts = {};
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
  const label = getSpecialLabel();

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
      xaxis: { title: `k (number of "${label}" outcomes in sample)` },
      yaxis: { title: 'Probability', rangemode: 'tozero' },
      legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.15 }
    },
    { responsive: true }
  );

  renderDistributionTable(xs, probs, simFreqs);

  const noteEl = document.getElementById('distribution-note');
  if (noteEl) {
    if (simsTotal > 0) {
      noteEl.textContent = `The distribution of K, the number of draws in which the outcome "${label}" occurs, in a sample of size n = ${n} from a population with N = ${N} and r = ${r} such cases in the population. The orange bars reflect ${simsTotal.toLocaleString()} simulated samples.`;
    } else {
      noteEl.textContent = `The distribution of K, the number of draws in which the outcome "${label}" occurs, in a sample of size n = ${n} from a population with N = ${N} and r = ${r} such cases in the population. Run simulations to add the orange empirical bars.`;
    }
  }
}

function renderDistributionTable(xs, exactProbs, simFreqs) {
  const tbody = document.querySelector('#distribution-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const totalSim = simFreqs.reduce((a, b) => a + b, 0);
  let cum = 0;

  const maxRows = 40;
  const step = xs.length > maxRows ? Math.ceil(xs.length / maxRows) : 1;

   let exampleIdx = 0;
   let bestProb = -1;
   for (let i = 0; i < xs.length; i++) {
     const p = exactProbs[i] || 0;
     if (p > bestProb) {
       bestProb = p;
       exampleIdx = i;
     }
   }

   let exampleK = null;
   let exampleExact = null;
   let exampleFreq = null;
   let exampleSimProb = null;
   let exampleCum = null;

  xs.forEach((k, idx) => {
    const exact = exactProbs[idx] || 0;
    cum += exact;
    const freq = simFreqs[idx] || 0;
    const simProb = totalSim > 0 ? freq / totalSim : 0;

    if (idx === exampleIdx) {
      exampleK = k;
      exampleExact = exact;
      exampleFreq = freq;
      exampleSimProb = totalSim > 0 ? simProb : null;
      exampleCum = cum;
    }

    if (step > 1 && idx % step !== 0 && idx !== 0 && idx !== xs.length - 1) {
      return;
    }

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

   const setExampleText = (id, value) => {
     const el = document.getElementById(id);
     if (el) {
       el.textContent = value;
     }
   };

   if (exampleK !== null) {
     setExampleText('table-example-k', String(exampleK));
     setExampleText('table-example-theoretical', exampleExact != null ? exampleExact.toFixed(4) : '–');
     setExampleText(
       'table-example-frequency',
       exampleFreq != null && totalSim > 0 ? exampleFreq.toString() : totalSim > 0 ? '0' : '–'
     );
     setExampleText('table-example-total', totalSim > 0 ? totalSim.toLocaleString() : '0');
     setExampleText(
       'table-example-simprob',
       exampleSimProb != null && totalSim > 0 ? exampleSimProb.toFixed(4) : '–'
     );
     setExampleText('table-example-cum', exampleCum != null ? exampleCum.toFixed(4) : '–');
   }
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
      const label = getSpecialLabel();
      warningEl.textContent = `Number of "${label}" cases r cannot exceed N.`;
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
        if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
          window.UIUtils.renderScenarioDescription({
            containerId: 'selection-scenario-description',
            defaultHtml:
              '<p>Use these presets to explore selection case studies, or leave this on Manual to configure your own population and event of interest.</p>'
          });
        } else {
          const desc = document.getElementById('selection-scenario-description');
          if (desc) {
            desc.innerHTML =
              '<p>Use these presets to explore selection case studies, or leave this on Manual to configure your own population and event of interest.</p>';
          }
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
    'special-label-input',
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
  });

  const simOnceBtn = document.getElementById('simulate-once-btn');
  if (simOnceBtn) {
    simOnceBtn.addEventListener('click', event => {
      event.preventDefault();
      if (typeof markRunAttempted === 'function') {
        markRunAttempted(TOOL_SLUG);
      }
      drawSampleOnceLab();
    });
  }

  const simManyBtn = document.getElementById('simulate-many-btn');
  if (simManyBtn) {
    simManyBtn.addEventListener('click', event => {
      event.preventDefault();
      if (typeof markRunAttempted === 'function') {
        markRunAttempted(TOOL_SLUG);
      }
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
  
  // Initialize engagement tracking
  if (typeof initEngagementTracking === 'function') {
    initEngagementTracking(TOOL_SLUG);
  }
});

function applySelectionScenario(id) {
  const scenario = SelectionScenarios.find(s => s.id === id);
  const descEl = document.getElementById('selection-scenario-description');
  if (!scenario) {
    if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
      window.UIUtils.renderScenarioDescription({
        containerId: 'selection-scenario-description',
        defaultHtml:
          '<p>Use these presets to explore selection case studies, or leave this on Manual to configure your own population and event of interest.</p>'
      });
    } else if (descEl) {
      descEl.innerHTML =
        '<p>Use these presets to explore selection case studies, or leave this on Manual to configure your own population and event of interest.</p>';
    }
    return;
  }
  
  // Track scenario loaded
  if (typeof markScenarioLoaded === 'function') {
    markScenarioLoaded(TOOL_SLUG, id, scenario.label);
  }

  if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
    window.UIUtils.renderScenarioDescription({
      containerId: 'selection-scenario-description',
      title: scenario.label,
      description: scenario.description,
      defaultHtml:
        '<p>Use these presets to explore selection case studies, or leave this on Manual to configure your own population and event of interest.</p>'
    });
  } else if (descEl) {
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
  const specialLabelInput = document.getElementById('special-label-input');

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
  if (specialLabelInput && typeof cfg.specialLabel === 'string') {
    specialLabelInput.value = cfg.specialLabel;
  }

  initPopulationForLab();
}
