// Compound Event Probability Calculator

const COMPOUND_LAB_CREATED_DATE = '2025-11-28';
let compoundLabModifiedDate = new Date().toLocaleDateString();

const EventScenarios = [
  {
    id: 'dice-rolls',
    label: 'Rolling dice: probability of multiple ones',
    description: `
      <p>
        You are rolling <strong>n = 23</strong> standard six-sided dice. On each die, the probability of rolling a 1 is
        <strong>p = 1/6 ≈ 0.1667</strong>. You want to know: what is the probability that <strong>at least 7</strong>
        of those dice show a 1?
      </p>
      <p>
        This is a classic application of the binomial distribution: each die roll is an independent trial with the same
        probability of success. The calculator shows the exact probability using the binomial formula, and compares it
        to Monte Carlo simulations where we actually "roll" 23 dice thousands of times and count how often we see 7 or
        more ones.
      </p>
      <p>
        You can adjust the number of dice, the target face value, or the threshold to explore how these probabilities
        change. This same logic applies to any repeated independent event with a known success probability.
      </p>
    `,
    settings: {
      eventLabel: 'die shows 1',
      eventProbability: 0.1667,
      numTrials: 23,
      targetSuccesses: 7,
      comparisonMode: 'at_least',
      approximationMode: 'exact',
      simulations: 3000
    }
  },
  {
    id: 'd20-criticals',
    label: 'D20 critical hits in a gaming session',
    description: `
      <p>
        In a tabletop RPG session, you expect to make about <strong>n = 50</strong> attack rolls using a 20-sided die
        (d20). A critical hit occurs when you roll a natural 20, which has probability <strong>p = 1/20 = 0.05</strong>.
      </p>
      <p>
        Your question: what is the probability of seeing <strong>exactly 3</strong> critical hits during this session?
        The binomial model treats each attack roll as independent and calculates \(P(X = 3)\) directly.
      </p>
      <p>
        This scenario demonstrates how the binomial distribution applies to gaming probabilities, helping you understand
        the likelihood of streaks, droughts, or specific counts of rare events over many rolls.
      </p>
    `,
    settings: {
      eventLabel: 'rolls a natural 20 (critical hit)',
      eventProbability: 0.05,
      numTrials: 50,
      targetSuccesses: 3,
      comparisonMode: 'exact',
      approximationMode: 'exact',
      simulations: 3000
    }
  },
  {
    id: 'email-conversions',
    label: 'Email campaign: expected conversions',
    description: `
      <p>
        You are sending <strong>n = 1000</strong> marketing emails. Based on historical data, each recipient has a
        <strong>p = 3% = 0.03</strong> chance of converting (making a purchase). You want to forecast the probability
        of seeing <strong>between 25 and 35</strong> conversions.
      </p>
      <p>
        The binomial distribution models each email recipient's decision as an independent trial. The calculator sums
        the probabilities \(P(X = 25) + P(X = 26) + \dots + P(X = 35)\) to give you the probability of landing in
        that conversion range.
      </p>
      <p>
        Because \(n\) is large and both \(np = 30\) and \(n(1-p) = 970\) are well above 10, the normal approximation
        also works well here, which you can verify by switching the approximation mode.
      </p>
    `,
    settings: {
      eventLabel: 'customer converts',
      eventProbability: 0.03,
      numTrials: 1000,
      targetSuccesses: 25,
      comparisonMode: 'between',
      approximationMode: 'exact',
      simulations: 2000,
      rangeLower: 25,
      rangeUpper: 35
    }
  },
  {
    id: 'quality-control',
    label: 'Quality control: defect detection',
    description: `
      <p>
        Your production line produces items with a <strong>p = 2% = 0.02</strong> defect rate. You inspect a batch of
        <strong>n = 200</strong> units. You want to know: what is the probability of finding <strong>at most 5</strong>
        defective items?
      </p>
      <p>
        This is a typical quality control question. The binomial model assumes each item's defect status is independent,
        and the calculator computes \(P(X \le 5)\) by summing \(P(X = 0) + P(X = 1) + \dots + P(X = 5)\).
      </p>
      <p>
        With \(n = 200\) and \(p = 0.02\), we have \(np = 4\), which is on the edge where the Poisson approximation
        starts to work well. You can compare the exact binomial result to the Poisson approximation to see how close
        they are.
      </p>
    `,
    settings: {
      eventLabel: 'item is defective',
      eventProbability: 0.02,
      numTrials: 200,
      targetSuccesses: 5,
      comparisonMode: 'at_most',
      approximationMode: 'exact',
      simulations: 3000
    }
  },
  {
    id: 'ad-clicks',
    label: 'Ad campaign: click-through expectations',
    description: `
      <p>
        You are running a display ad campaign with <strong>n = 5000</strong> impressions. Your historical click-through
        rate is <strong>p = 0.8% = 0.008</strong>. You want to estimate the probability of getting <strong>at least 50</strong>
        clicks.
      </p>
      <p>
        With \(n\) large and \(p\) small, this is a good candidate for the Poisson approximation. The expected number
        of clicks is \(np = 40\), and you're asking about seeing 50 or more, which is a bit above the mean.
      </p>
      <p>
        The calculator lets you compare the exact binomial probability to both the normal and Poisson approximations,
        illustrating when each approximation is appropriate and how accurate they are for your specific parameters.
      </p>
    `,
    settings: {
      eventLabel: 'ad is clicked',
      eventProbability: 0.008,
      numTrials: 5000,
      targetSuccesses: 50,
      comparisonMode: 'at_least',
      approximationMode: 'exact',
      simulations: 2000
    }
  },
  {
    id: 'website-signups',
    label: 'Website signups: conversion probability',
    description: `
      <p>
        Your landing page receives <strong>n = 500</strong> visitors per day. Based on A/B test results, each visitor
        has a <strong>p = 5% = 0.05</strong> chance of signing up. You want to know the probability of seeing
        <strong>exactly 25</strong> signups on a given day.
      </p>
      <p>
        The binomial model treats each visitor's decision as independent. The expected number of signups is
        \(np = 25\), so asking for exactly 25 is asking about the mode (most likely single value) of the distribution.
      </p>
      <p>
        This scenario demonstrates how the binomial distribution helps you set realistic expectations for daily
        conversion counts and understand the natural variability in your metrics.
      </p>
    `,
    settings: {
      eventLabel: 'visitor signs up',
      eventProbability: 0.05,
      numTrials: 500,
      targetSuccesses: 25,
      comparisonMode: 'exact',
      approximationMode: 'exact',
      simulations: 3000
    }
  }
];

// Populate scenarios
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('event-scenario-select');
  EventScenarios.forEach(scenario => {
    const option = document.createElement('option');
    option.value = scenario.id;
    option.textContent = scenario.label;
    select.appendChild(option);
  });
});

// Load scenario
document.getElementById('event-scenario-select').addEventListener('change', (e) => {
  const scenarioId = e.target.value;
  const descDiv = document.getElementById('event-scenario-description');
  
  if (!scenarioId) {
    descDiv.innerHTML = '<p>Use these presets to explore realistic probability questions: conversion rates in marketing campaigns, quality control in production, dice rolling in games, email open rates, and more. Each scenario demonstrates how the binomial model applies to real-world repeated-event problems.</p>';
    return;
  }
  
  const scenario = EventScenarios.find(s => s.id === scenarioId);
  if (!scenario) return;
  
  descDiv.innerHTML = scenario.description;
  
  // Apply settings
  document.getElementById('event-label-input').value = scenario.settings.eventLabel;
  document.getElementById('event-probability-input').value = scenario.settings.eventProbability;
  document.getElementById('num-trials-input').value = scenario.settings.numTrials;
  document.getElementById('target-successes-input').value = scenario.settings.targetSuccesses;
  document.getElementById('comparison-mode-select').value = scenario.settings.comparisonMode;
  document.getElementById('approximation-mode-select').value = scenario.settings.approximationMode;
  document.getElementById('num-simulations-input').value = scenario.settings.simulations;
  
  if (scenario.settings.comparisonMode === 'between') {
    document.getElementById('range-inputs-container').style.display = 'block';
    document.getElementById('range-lower-input').value = scenario.settings.rangeLower || 0;
    document.getElementById('range-upper-input').value = scenario.settings.rangeUpper || 10;
  } else {
    document.getElementById('range-inputs-container').style.display = 'none';
  }
  
  // Clear simulation history when loading a new scenario
  simulationHistory = [];
  updateCalculations();
});

// Show/hide range inputs based on comparison mode
document.getElementById('comparison-mode-select').addEventListener('change', (e) => {
  const rangeContainer = document.getElementById('range-inputs-container');
  rangeContainer.style.display = e.target.value === 'between' ? 'block' : 'none';
  updateCalculations();
});

// State management
let simulationHistory = [];

// Update all calculations when inputs change
['event-label-input', 'event-probability-input', 'num-trials-input', 'target-successes-input',
 'comparison-mode-select', 'approximation-mode-select', 'range-lower-input', 'range-upper-input'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateCalculations);
  document.getElementById(id).addEventListener('change', updateCalculations);
});

// Button event listeners
document.getElementById('simulate-once-btn').addEventListener('click', simulateOnce);
document.getElementById('simulate-many-btn').addEventListener('click', simulateMany);
document.getElementById('clear-sim-btn').addEventListener('click', clearSimulations);

function updateCalculations() {
  const eventLabel = document.getElementById('event-label-input').value || 'success';
  const p = parseFloat(document.getElementById('event-probability-input').value);
  const n = parseInt(document.getElementById('num-trials-input').value);
  const k = parseInt(document.getElementById('target-successes-input').value);
  const mode = document.getElementById('comparison-mode-select').value;
  const approxMode = document.getElementById('approximation-mode-select').value;
  
  // Validation
  const warningEl = document.getElementById('event-warning');
  if (p < 0 || p > 1) {
    warningEl.textContent = '⚠️ Probability must be between 0 and 1';
    warningEl.style.color = '#dc2626';
    return;
  }
  if (k > n) {
    warningEl.textContent = '⚠️ Target successes cannot exceed number of trials';
    warningEl.style.color = '#dc2626';
    return;
  }
  
  // Check approximation validity
  if (approxMode === 'normal') {
    const np = n * p;
    const nq = n * (1 - p);
    if (np < 10 || nq < 10) {
      warningEl.textContent = `ℹ️ Normal approximation works best when np ≥ 10 and n(1-p) ≥ 10. Current: np = ${np.toFixed(1)}, n(1-p) = ${nq.toFixed(1)}`;
      warningEl.style.color = '#f59e0b';
    } else {
      warningEl.textContent = '';
    }
  } else if (approxMode === 'poisson') {
    const lambda = n * p;
    if (lambda > 10) {
      warningEl.textContent = `ℹ️ Poisson approximation works best when np < 10. Current: np = ${lambda.toFixed(1)}`;
      warningEl.style.color = '#f59e0b';
    } else {
      warningEl.textContent = '';
    }
  } else {
    warningEl.textContent = '';
  }
  
  // Calculate probabilities
  const pmf = calculatePMF(n, p, approxMode);
  const targetProb = calculateTargetProbability(pmf, n, k, mode);
  
  // Update metrics
  document.getElementById('metric-target-prob').textContent = targetProb.toFixed(6);
  document.getElementById('metric-expected-x').textContent = (n * p).toFixed(2);
  document.getElementById('metric-std-dev').textContent = Math.sqrt(n * p * (1 - p)).toFixed(2);
  
  // Calculate simulated probability
  if (simulationHistory.length > 0) {
    const simProb = calculateSimulatedProbability(simulationHistory, n, k, mode);
    document.getElementById('metric-sim-prob').textContent = simProb.toFixed(6);
  } else {
    document.getElementById('metric-sim-prob').textContent = '—';
  }
  
  // Update charts
  updatePMFChart(pmf, n, k, mode, eventLabel);
  updateCDFChart(pmf, n, eventLabel);
  
  // Update equations
  updateEquations(n, p, k, mode, approxMode, eventLabel);
  
  // Update distribution table
  updateDistributionTable(pmf, n);
}

function calculatePMF(n, p, approxMode) {
  const pmf = [];
  
  if (approxMode === 'exact') {
    // Exact binomial
    for (let k = 0; k <= n; k++) {
      pmf.push(binomialPMF(n, k, p));
    }
  } else if (approxMode === 'normal') {
    // Normal approximation with continuity correction
    const mu = n * p;
    const sigma = Math.sqrt(n * p * (1 - p));
    for (let k = 0; k <= n; k++) {
      const prob = normalCDF(k + 0.5, mu, sigma) - normalCDF(k - 0.5, mu, sigma);
      pmf.push(Math.max(0, prob));
    }
  } else if (approxMode === 'poisson') {
    // Poisson approximation
    const lambda = n * p;
    for (let k = 0; k <= n; k++) {
      pmf.push(poissonPMF(k, lambda));
    }
  }
  
  // Normalize to ensure sum = 1
  const sum = pmf.reduce((a, b) => a + b, 0);
  return pmf.map(p => p / sum);
}

function binomialPMF(n, k, p) {
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return binomialCoefficient(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function binomialCoefficient(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  
  // Use logarithms for numerical stability
  let result = 0;
  for (let i = 0; i < k; i++) {
    result += Math.log(n - i) - Math.log(i + 1);
  }
  return Math.exp(result);
}

function poissonPMF(k, lambda) {
  if (lambda === 0) return k === 0 ? 1 : 0;
  // Use logarithms for numerical stability
  return Math.exp(k * Math.log(lambda) - lambda - logFactorial(k));
}

function logFactorial(n) {
  if (n <= 1) return 0;
  let result = 0;
  for (let i = 2; i <= n; i++) {
    result += Math.log(i);
  }
  return result;
}

function normalCDF(x, mu, sigma) {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2))));
}

function erf(x) {
  // Approximation of error function
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
}

function calculateTargetProbability(pmf, n, k, mode) {
  if (mode === 'exact') {
    return pmf[k] || 0;
  } else if (mode === 'at_least') {
    let sum = 0;
    for (let i = k; i <= n; i++) {
      sum += pmf[i] || 0;
    }
    return sum;
  } else if (mode === 'at_most') {
    let sum = 0;
    for (let i = 0; i <= k; i++) {
      sum += pmf[i] || 0;
    }
    return sum;
  } else if (mode === 'between') {
    const k1 = parseInt(document.getElementById('range-lower-input').value);
    const k2 = parseInt(document.getElementById('range-upper-input').value);
    let sum = 0;
    for (let i = Math.max(0, k1); i <= Math.min(n, k2); i++) {
      sum += pmf[i] || 0;
    }
    return sum;
  }
  return 0;
}

function calculateSimulatedProbability(history, n, k, mode) {
  if (history.length === 0) return 0;
  
  let count = 0;
  if (mode === 'exact') {
    count = history.filter(x => x === k).length;
  } else if (mode === 'at_least') {
    count = history.filter(x => x >= k).length;
  } else if (mode === 'at_most') {
    count = history.filter(x => x <= k).length;
  } else if (mode === 'between') {
    const k1 = parseInt(document.getElementById('range-lower-input').value);
    const k2 = parseInt(document.getElementById('range-upper-input').value);
    count = history.filter(x => x >= k1 && x <= k2).length;
  }
  
  return count / history.length;
}

function simulateOnce() {
  const p = parseFloat(document.getElementById('event-probability-input').value);
  const n = parseInt(document.getElementById('num-trials-input').value);
  
  let successes = 0;
  for (let i = 0; i < n; i++) {
    if (Math.random() < p) successes++;
  }
  
  simulationHistory.push(successes);
  updateCalculations();
}

function simulateMany() {
  const p = parseFloat(document.getElementById('event-probability-input').value);
  const n = parseInt(document.getElementById('num-trials-input').value);
  const numSims = parseInt(document.getElementById('num-simulations-input').value);
  
  for (let sim = 0; sim < numSims; sim++) {
    let successes = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < p) successes++;
    }
    simulationHistory.push(successes);
  }
  
  updateCalculations();
}

function clearSimulations() {
  simulationHistory = [];
  updateCalculations();
}

function updatePMFChart(pmf, n, k, mode, eventLabel) {
  const highlightIndices = getHighlightIndices(n, k, mode);
  
  const theoreticalTrace = {
    x: Array.from({length: pmf.length}, (_, i) => i),
    y: pmf,
    type: 'bar',
    name: 'Theoretical',
    marker: {
      color: pmf.map((_, i) => highlightIndices.includes(i) ? '#3b82f6' : '#93c5fd'),
      line: {
        color: '#1e40af',
        width: 1
      }
    }
  };
  
  const traces = [theoreticalTrace];
  
  // Add simulated trace if we have data
  if (simulationHistory.length > 0) {
    const simCounts = new Array(n + 1).fill(0);
    simulationHistory.forEach(x => {
      if (x >= 0 && x <= n) simCounts[x]++;
    });
    const simPMF = simCounts.map(c => c / simulationHistory.length);
    
    const simulatedTrace = {
      x: Array.from({length: simPMF.length}, (_, i) => i),
      y: simPMF,
      type: 'bar',
      name: 'Simulated',
      marker: {
        color: simPMF.map((_, i) => highlightIndices.includes(i) ? '#f97316' : '#fdba74'),
        line: {
          color: '#c2410c',
          width: 1
        }
      },
      opacity: 0.7
    };
    
    traces.push(simulatedTrace);
  }
  
  const layout = {
    title: '',
    xaxis: {
      title: `Number of times "${eventLabel}" occurs`,
      dtick: Math.ceil(n / 20)
    },
    yaxis: {
      title: 'Probability',
      range: [0, Math.max(...pmf) * 1.1]
    },
    barmode: 'overlay',
    showlegend: true,
    legend: {
      x: 0.7,
      y: 0.98
    },
    margin: {l: 60, r: 30, t: 30, b: 60}
  };
  
  Plotly.newPlot('pmf-chart', traces, layout, {responsive: true, displayModeBar: false});
}

function updateCDFChart(pmf, n, eventLabel) {
  const cdf = [];
  let cumSum = 0;
  pmf.forEach(p => {
    cumSum += p;
    cdf.push(cumSum);
  });
  
  const trace = {
    x: Array.from({length: cdf.length}, (_, i) => i),
    y: cdf,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'CDF',
    line: {
      color: '#3b82f6',
      width: 2,
      shape: 'hv'
    },
    marker: {
      color: '#1e40af',
      size: 4
    }
  };
  
  const layout = {
    title: '',
    xaxis: {
      title: `Number of times "${eventLabel}" occurs`,
      dtick: Math.ceil(n / 20)
    },
    yaxis: {
      title: 'Cumulative Probability',
      range: [0, 1.05]
    },
    showlegend: false,
    margin: {l: 60, r: 30, t: 30, b: 60}
  };
  
  Plotly.newPlot('cdf-chart', [trace], layout, {responsive: true, displayModeBar: false});
}

function getHighlightIndices(n, k, mode) {
  const indices = [];
  
  if (mode === 'exact') {
    indices.push(k);
  } else if (mode === 'at_least') {
    for (let i = k; i <= n; i++) indices.push(i);
  } else if (mode === 'at_most') {
    for (let i = 0; i <= k; i++) indices.push(i);
  } else if (mode === 'between') {
    const k1 = parseInt(document.getElementById('range-lower-input').value);
    const k2 = parseInt(document.getElementById('range-upper-input').value);
    for (let i = Math.max(0, k1); i <= Math.min(n, k2); i++) indices.push(i);
  }
  
  return indices;
}

function updateEquations(n, p, k, mode, approxMode, eventLabel) {
  const generalDiv = document.getElementById('equations-general');
  const workedDiv = document.getElementById('equations-worked');
  
  let generalHTML = '<h4>Binomial probability mass function</h4>';
  generalHTML += '<p>The probability of exactly \\(k\\) successes in \\(n\\) independent trials, each with success probability \\(p\\):</p>';
  generalHTML += '<p>\\[P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}\\]</p>';
  
  if (mode === 'at_least') {
    generalHTML += '<h4>At least \\(k\\) successes</h4>';
    generalHTML += '<p>\\[P(X \\ge k) = \\sum_{i=k}^{n} \\binom{n}{i} p^i (1-p)^{n-i}\\]</p>';
    generalHTML += '<p>Or using the complement: \\[P(X \\ge k) = 1 - P(X < k) = 1 - P(X \\le k-1)\\]</p>';
  } else if (mode === 'at_most') {
    generalHTML += '<h4>At most \\(k\\) successes</h4>';
    generalHTML += '<p>\\[P(X \\le k) = \\sum_{i=0}^{k} \\binom{n}{i} p^i (1-p)^{n-i}\\]</p>';
  } else if (mode === 'between') {
    generalHTML += '<h4>Between \\(k_1\\) and \\(k_2\\) successes</h4>';
    generalHTML += '<p>\\[P(k_1 \\le X \\le k_2) = \\sum_{i=k_1}^{k_2} \\binom{n}{i} p^i (1-p)^{n-i}\\]</p>';
  }
  
  generalHTML += '<h4>Expected value and standard deviation</h4>';
  generalHTML += '<p>\\[E[X] = np\\]</p>';
  generalHTML += '<p>\\[\\sigma_X = \\sqrt{np(1-p)}\\]</p>';
  
  if (approxMode === 'normal') {
    generalHTML += '<h4>Normal approximation</h4>';
    generalHTML += '<p>When \\(n\\) is large and both \\(np \\ge 10\\) and \\(n(1-p) \\ge 10\\), the binomial can be approximated by:</p>';
    generalHTML += '<p>\\[X \\sim \\mathcal{N}(\\mu = np, \\sigma^2 = np(1-p))\\]</p>';
    generalHTML += '<p>With continuity correction: \\[P(X = k) \\approx P(k - 0.5 < X < k + 0.5)\\]</p>';
  } else if (approxMode === 'poisson') {
    generalHTML += '<h4>Poisson approximation</h4>';
    generalHTML += '<p>When \\(n\\) is large and \\(p\\) is small (typically \\(np < 10\\)), the binomial can be approximated by:</p>';
    generalHTML += '<p>\\[P(X = k) \\approx \\frac{\\lambda^k e^{-\\lambda}}{k!}\\]</p>';
    generalHTML += '<p>where \\(\\lambda = np\\)</p>';
  }
  
  generalDiv.innerHTML = generalHTML;
  
  // Worked equations
  let workedHTML = '<h4>Your specific case</h4>';
  workedHTML += `<p>Event: "${eventLabel}"</p>`;
  workedHTML += `<p>Probability per trial: \\(p = ${p.toFixed(4)}\\)</p>`;
  workedHTML += `<p>Number of trials: \\(n = ${n}\\)</p>`;
  
  if (mode === 'exact') {
    workedHTML += `<p>Target: exactly \\(k = ${k}\\) successes</p>`;
    workedHTML += `<p>\\[P(X = ${k}) = \\binom{${n}}{${k}} (${p.toFixed(4)})^{${k}} (${(1-p).toFixed(4)})^{${n-k}}\\]</p>`;
  } else if (mode === 'at_least') {
    workedHTML += `<p>Target: at least \\(k = ${k}\\) successes</p>`;
    workedHTML += `<p>\\[P(X \\ge ${k}) = \\sum_{i=${k}}^{${n}} \\binom{${n}}{i} (${p.toFixed(4)})^i (${(1-p).toFixed(4)})^{${n}-i}\\]</p>`;
  } else if (mode === 'at_most') {
    workedHTML += `<p>Target: at most \\(k = ${k}\\) successes</p>`;
    workedHTML += `<p>\\[P(X \\le ${k}) = \\sum_{i=0}^{${k}} \\binom{${n}}{i} (${p.toFixed(4)})^i (${(1-p).toFixed(4)})^{${n}-i}\\]</p>`;
  } else if (mode === 'between') {
    const k1 = parseInt(document.getElementById('range-lower-input').value);
    const k2 = parseInt(document.getElementById('range-upper-input').value);
    workedHTML += `<p>Target: between \\(k_1 = ${k1}\\) and \\(k_2 = ${k2}\\) successes</p>`;
    workedHTML += `<p>\\[P(${k1} \\le X \\le ${k2}) = \\sum_{i=${k1}}^{${k2}} \\binom{${n}}{i} (${p.toFixed(4)})^i (${(1-p).toFixed(4)})^{${n}-i}\\]</p>`;
  }
  
  const expectedValue = n * p;
  const stdDev = Math.sqrt(n * p * (1 - p));
  workedHTML += `<p>Expected successes: \\(E[X] = ${n} \\times ${p.toFixed(4)} = ${expectedValue.toFixed(2)}\\)</p>`;
  workedHTML += `<p>Standard deviation: \\(\\sigma_X = \\sqrt{${n} \\times ${p.toFixed(4)} \\times ${(1-p).toFixed(4)}} = ${stdDev.toFixed(2)}\\)</p>`;
  
  workedDiv.innerHTML = workedHTML;
  
  // Typeset MathJax
  if (window.MathJax) {
    MathJax.typesetPromise([generalDiv, workedDiv]).catch(err => console.error('MathJax error:', err));
  }
}

function updateDistributionTable(pmf, n) {
  const tbody = document.querySelector('#distribution-table tbody');
  tbody.innerHTML = '';
  
  const mode = document.getElementById('comparison-mode-select').value;
  const k = parseInt(document.getElementById('target-successes-input').value);
  const highlightIndices = getHighlightIndices(n, k, mode);
  
  // Calculate cumulative probabilities
  const cdf = [];
  let cumSum = 0;
  pmf.forEach(p => {
    cumSum += p;
    cdf.push(cumSum);
  });
  
  // Calculate simulated frequencies
  const simCounts = new Array(n + 1).fill(0);
  simulationHistory.forEach(x => {
    if (x >= 0 && x <= n) simCounts[x]++;
  });
  
  const totalSims = simulationHistory.length;
  
  // Only show rows with non-negligible probability (> 0.0001) or that have simulated occurrences
  for (let i = 0; i <= n; i++) {
    if (pmf[i] < 0.0001 && simCounts[i] === 0) continue;
    
    const row = document.createElement('tr');
    if (highlightIndices.includes(i)) {
      row.classList.add('highlighted');
    }
    
    row.innerHTML = `
      <td>${i}</td>
      <td>${pmf[i].toFixed(6)}</td>
      <td>${simCounts[i]}</td>
      <td>${totalSims > 0 ? (simCounts[i] / totalSims).toFixed(6) : '—'}</td>
      <td>${cdf[i].toFixed(6)}</td>
    `;
    
    tbody.appendChild(row);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('created-date').textContent = COMPOUND_LAB_CREATED_DATE;
  document.getElementById('modified-date').textContent = compoundLabModifiedDate;
  
  updateCalculations();
});
