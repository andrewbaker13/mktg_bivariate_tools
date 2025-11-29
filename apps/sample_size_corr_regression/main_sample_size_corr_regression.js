// Sample Size Planner — Correlation / Simple Regression

const CREATED_DATE = '2025-11-24';
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
  const storageKey = `tool-tracked-sample-size-corr-regression-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('sample-size-corr-regression', {}, `Correlation/regression sample size calculation completed`);
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for Correlation/Regression Sample Size Calculator');
  }
}

const CorrRegModes = {
  CORRELATION: 'correlation',
  REGRESSION: 'regression'
};

const CorrRegState = {
  mode: CorrRegModes.CORRELATION,
  rho0: 0,
  rho1: 0.3,
  alpha: 0.05,
  power: 0.8,
  sidedness: 'two', // 'one' or 'two'
  requiredN: null
};

const CorrRegScenarios = [
  {
    id: 'spend-revenue',
    label: 'Ad spend vs. revenue (moderate correlation)',
    description:
      'You want enough data to detect a moderate positive correlation (around 0.30) between weekly ad spend and revenue, compared against a null of zero correlation, with 95% confidence and 80% power.',
    descriptionHtml:
      '<p><strong>Question:</strong> Is our media budget actually tied to revenue in a way that we can measure and act on?</p>' +
      '<p>You are tracking weekly <strong>ad spend</strong> and <strong>revenue</strong> over time and suspect a <em>moderate positive correlation</em> of about <strong>r = 0.30</strong>. Under the null hypothesis, there is <strong>no linear association</strong> (r<sub>0</sub> = 0.00) between spend and revenue.</p>' +
      '<p>This preset plans a study to detect that shift from <strong>0.00 to 0.30</strong> with <strong>95% confidence</strong> (alpha = 5%) and <strong>80% power</strong> using a two-sided test. The required sample size tells you roughly how many weekly observations you want before treating the correlation or simple regression slope as statistically reliable rather than just noise.</p>',
    settings: {
      mode: CorrRegModes.CORRELATION,
      rho0: 0,
      rho1: 0.30,
      alpha: 0.05,
      power: 0.80,
      sidedness: 'two'
    }
  },
  {
    id: 'engagement-nps',
    label: 'Engagement vs. NPS (small correlation)',
    description:
      'You want to detect a smaller association (around 0.20) between a digital engagement score and Net Promoter Score (NPS), relative to a null of zero correlation, using a two-sided test at 95% confidence and 90% power.',
    descriptionHtml:
      '<p><strong>Question:</strong> Do customers who engage more with our product actually rate us higher on NPS?</p>' +
      '<p>Here you are looking at a <strong>digital engagement score</strong> (logins, clicks, or feature usage) and <strong>Net Promoter Score</strong> for the same set of customers. Stakeholders believe the true association is modest, around <strong>r = 0.20</strong>, relative to a null of <strong>r<sub>0</sub> = 0.00</strong> (no linear relationship).</p>' +
      '<p>This preset targets that smaller effect with <strong>95% confidence</strong> (alpha = 5%) and a higher <strong>90% power</strong>, reflecting a desire to be very unlikely to miss a real correlation if it exists. The required sample size shows how many paired customer records you would want before using correlation or a simple regression to support a claim that engagement and NPS move together.</p>',
    settings: {
      mode: CorrRegModes.CORRELATION,
      rho0: 0,
      rho1: 0.20,
      alpha: 0.05,
      power: 0.90,
      sidedness: 'two'
    }
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fisherZ(r) {
  const clamped = clamp(r, -0.999, 0.999);
  return 0.5 * Math.log((1 + clamped) / (1 - clamped));
}

function getZAlpha(alpha, sidedness) {
  const a = typeof alpha === 'number' && isFinite(alpha) && alpha > 0 && alpha < 1 ? alpha : 0.05;
  const twoSided = sidedness !== 'one';
  const p = twoSided ? 1 - a / 2 : 1 - a;
  if (window.StatsUtils && typeof window.StatsUtils.normInv === 'function') {
    return window.StatsUtils.normInv(p);
  }
  // Fallback for common levels
  if (Math.abs(a - 0.10) < 1e-3) return twoSided ? 1.6449 : 1.2816;
  if (Math.abs(a - 0.05) < 1e-3) return twoSided ? 1.96 : 1.6449;
  if (Math.abs(a - 0.01) < 1e-3) return twoSided ? 2.5758 : 2.3263;
  return 1.96;
}

function getZBeta(power) {
  const pow = typeof power === 'number' && isFinite(power) && power > 0 && power < 1 ? power : 0.8;
  if (window.StatsUtils && typeof window.StatsUtils.normInv === 'function') {
    return window.StatsUtils.normInv(pow);
  }
  // Rough fallback: 80% -> 0.84, 90% -> 1.28
  if (Math.abs(pow - 0.80) < 1e-3) return 0.8416;
  if (Math.abs(pow - 0.90) < 1e-3) return 1.2816;
  return 0.84;
}

function computeNForCorrelation(r1, r0, alpha, power, sidedness) {
  const z1 = fisherZ(r1);
  const z0 = fisherZ(r0);
  const delta = Math.abs(z1 - z0);
  if (!delta || !isFinite(delta)) return null;
  const zAlpha = getZAlpha(alpha, sidedness);
  const zBeta = getZBeta(power);
  const n = 3 + Math.pow((zAlpha + zBeta) / delta, 2);
  if (!isFinite(n) || n <= 3) return null;
  return Math.ceil(n);
}

function formatPct(x, digits = 1) {
  if (!isFinite(x)) return '--';
  return (x * 100).toFixed(digits);
}

function syncRhoInputsFromState() {
  const rho0Val = CorrRegState.rho0.toFixed(2);
  const rho1Val = CorrRegState.rho1.toFixed(2);
  const rho0Input = document.getElementById('rho0-input');
  const rho1Input = document.getElementById('rho1-input');
  const rho0RegInput = document.getElementById('rho0-reg-input');
  const rho1RegInput = document.getElementById('rho1-reg-input');
  if (rho0Input) rho0Input.value = rho0Val;
  if (rho1Input) rho1Input.value = rho1Val;
  if (rho0RegInput) rho0RegInput.value = rho0Val;
  if (rho1RegInput) rho1RegInput.value = rho1Val;
}

function updateConfidenceExplainer() {
  const span = document.getElementById('confidence-explainer-text');
  if (!span) return;

  const alpha = CorrRegState.alpha;
  if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    span.textContent =
      'The confidence level describes how often, across many hypothetical repetitions of this design, the procedure would capture the true correlation. ' +
      'Alpha is the tolerated false-positive rate (Type I error): for example, alpha = 5% corresponds to 95% confidence in a two-sided test.';
    return;
  }

  const confPct = (100 * (1 - alpha)).toFixed(1);
  const alphaPct = (100 * alpha).toFixed(1);
  const sided = CorrRegState.sidedness === 'one' ? 'one-sided' : 'two-sided';

  span.textContent =
    `Using a ${confPct}% confidence level (alpha = ${alphaPct}%) with a ${sided} test means that, ` +
    `if you repeated this correlation or regression study many times with the same design, about ${confPct} out of 100 runs would produce results that are consistent ` +
    'with the true underlying association, while roughly ' +
    `${alphaPct} out of 100 runs would, just by chance, show a statistically significant association even if there were no real effect (a false positive).`;
}

function updatePowerExplainer() {
  const span = document.getElementById('power-explainer-text');
  if (!span) return;

  const power = CorrRegState.power;
  const r0 = CorrRegState.rho0;
  const r1 = CorrRegState.rho1;

  if (!isFinite(power) || power <= 0 || power >= 1 || !isFinite(r0) || !isFinite(r1) || r0 === r1) {
    span.textContent =
      'Power is the probability that your test will detect (reject the null hypothesis for) the effect you have specified if it is really present in the population. ' +
      'Higher power makes it less likely that random noise will hide a real association, but it requires more observations.';
    return;
  }

  const powerPct = (power * 100).toFixed(1);
  const r0Str = r0.toFixed(2);
  const r1Str = r1.toFixed(2);
  const delta = Math.abs(r1 - r0).toFixed(2);

  span.textContent =
    `With ${powerPct}% power, if the true correlation between your X and Y metrics really moves from ${r0Str} to ${r1Str} ` +
    `(a change of about ${delta} in correlation), a study of this size would detect (reject the null hypothesis for) that association in roughly ${powerPct} out of ` +
    '100 similar experiments. In the remaining runs, random noise would be large enough that the sample looks compatible with the null, even though the effect is real. ' +
    'Higher power makes it less likely to miss a real lift or drop in the relationship, but it requires more paired observations.';
}

function updateEffectExplainer() {
  const span = document.getElementById('effect-explainer-text');
  if (!span) return;

  const r0 = CorrRegState.rho0;
  const r1 = CorrRegState.rho1;
  if (!isFinite(r0) || !isFinite(r1) || r0 === r1) {
    span.textContent =
      'The null correlation r₀ represents the baseline you want to test against (often 0 for “no linear association”), and the expected correlation r₁ represents the strength of relationship you care about being able to detect. ' +
      'Larger gaps between r₀ and r₁ correspond to larger effect sizes and therefore smaller required sample sizes, holding confidence and power fixed.';
    return;
  }

  const delta = Math.abs(r1 - r0);
  const absR1 = Math.abs(r1);
  let magnitude;
  if (absR1 < 0.1) {
    magnitude = 'very small';
  } else if (absR1 < 0.3) {
    magnitude = 'small';
  } else if (absR1 < 0.5) {
    magnitude = 'moderate';
  } else {
    magnitude = 'large';
  }
  const direction = r1 >= 0 ? 'positive' : 'negative';

  span.textContent =
    `Here you are planning to detect a ${magnitude} ${direction} correlation, moving from r₀ = ${r0.toFixed(
      2
    )} to r₁ = ${r1.toFixed(2)} (a change of about ${delta.toFixed(2)}). ` +
    'In practical terms, this means that when X is above its typical value, Y tends to be above (for a positive correlation) or below (for a negative correlation) its typical value in a consistent way. ' +
    'Smaller targeted correlations require more observations to distinguish the pattern from random noise; larger targeted correlations can be detected with fewer observations.';
}

function updateSidednessExplainer() {
  const span = document.getElementById('sidedness-explainer-text');
  if (!span) return;

  const sided = CorrRegState.sidedness === 'one' ? 'one-sided' : 'two-sided';
  const r0 = CorrRegState.rho0;
  const r1 = CorrRegState.rho1;
  const direction = r1 >= r0 ? 'positive' : 'negative';

  if (sided === 'two-sided') {
    span.textContent =
      'A two-sided test asks whether the correlation is meaningfully different from the null value in either direction. ' +
      'This is the standard choice when you care about detecting either a positive or a negative association and want to guard against surprises in both directions. ' +
      'It is slightly more conservative than a one-sided test and therefore typically requires a bit more data for the same power.';
  } else {
    span.textContent =
      `A one-sided test focuses on detecting a ${direction} correlation relative to the null (for example, treating increases from r₀ = ${r0.toFixed(
        2
      )} to r₁ = ${r1.toFixed(2)} as the only outcome that matters). ` +
      'Because the critical region is concentrated in a single direction, you can achieve the same power with a somewhat smaller sample size than a two-sided test. ' +
      'However, a one-sided design will not flag strong evidence in the opposite direction as statistically significant, so it should only be used when an effect in the other direction would not change your decision.';
  }
}

function updateExplainers() {
  updateEffectExplainer();
  updateSidednessExplainer();
  updateConfidenceExplainer();
  updatePowerExplainer();
}

function syncModeButtons() {
  document.querySelectorAll('.mode-button').forEach(btn => {
    const isActive = btn.dataset.mode === CorrRegState.mode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.mode-panel').forEach(panel => {
    const isActive = panel.dataset.mode === CorrRegState.mode;
    panel.classList.toggle('active', isActive);
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
}

function applyConfidenceSelection(level, { syncAlpha = true, skipUpdate = false } = {}) {
  const clamped = clamp(level, 0.5, 0.999);
  document.querySelectorAll('.confidence-button').forEach(btn => {
    const v = parseFloat(btn.dataset.level);
    btn.classList.toggle('active', Math.abs(v - clamped) < 1e-6);
  });
  if (syncAlpha) {
    const alphaInput = document.getElementById('alpha');
    const alpha = 1 - clamped;
    if (alphaInput) alphaInput.value = alpha.toFixed(3);
    CorrRegState.alpha = alpha;
  }
  if (!skipUpdate) updateDesign();
}

function syncConfidenceButtonsToAlpha(alphaValue, { skipUpdate = false } = {}) {
  const alpha = parseFloat(alphaValue);
  let matched = false;
  if (isFinite(alpha) && alpha > 0 && alpha < 1) {
    document.querySelectorAll('.confidence-button').forEach(btn => {
      const level = parseFloat(btn.dataset.level);
      const expectedAlpha = +(1 - level).toFixed(3);
      const match = Math.abs(alpha - expectedAlpha) < 1e-4;
      btn.classList.toggle('active', match);
      if (match) {
        CorrRegState.alpha = alpha;
        matched = true;
      }
    });
  }
  if (!matched && isFinite(alpha)) {
    CorrRegState.alpha = alpha;
  }
  if (!skipUpdate) updateDesign();
}

function clearDesignOutputs(message = 'Provide inputs to see the required sample size.') {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('metric-n', '–');
  set('metric-r', '–');
  set('metric-alpha', '–');
  set('metric-power', '–');
  set('metric-test', '–');
  const apa = document.getElementById('apa-report');
  const mgr = document.getElementById('managerial-report');
  if (apa) apa.textContent = message;
  if (mgr) mgr.textContent =
    'Once you specify a null and expected correlation plus your confidence and power, this panel will summarize how many paired observations you need and why.';
  const effectChart = document.getElementById('chart-effect');
  const powerChart = document.getElementById('chart-power');
  if (effectChart && window.Plotly) Plotly.purge(effectChart);
  if (powerChart && window.Plotly) Plotly.purge(powerChart);
}

function updateDesign() {
  const rho0Input = document.getElementById('rho0-input');
  const rho1Input = document.getElementById('rho1-input');
  const alphaInput = document.getElementById('alpha');
  const powerInput = document.getElementById('power');
  const sidednessSelect = document.getElementById('sidedness');

  if (rho0Input) CorrRegState.rho0 = clamp(parseFloat(rho0Input.value), -0.99, 0.99) || 0;
  if (rho1Input) CorrRegState.rho1 = clamp(parseFloat(rho1Input.value), -0.99, 0.99) || 0.3;
  if (alphaInput) CorrRegState.alpha = clamp(parseFloat(alphaInput.value), 0.0005, 0.25) || 0.05;
  if (powerInput) CorrRegState.power = clamp(parseFloat(powerInput.value), 0.5, 0.99) || 0.8;
  if (sidednessSelect) CorrRegState.sidedness = sidednessSelect.value === 'one' ? 'one' : 'two';

  updateExplainers();

  const n = computeNForCorrelation(
    CorrRegState.rho1,
    CorrRegState.rho0,
    CorrRegState.alpha,
    CorrRegState.power,
    CorrRegState.sidedness
  );
  CorrRegState.requiredN = n;

  if (!n || !isFinite(n)) {
    clearDesignOutputs('Unable to compute sample size with the current settings. Check that the expected correlation differs from the null.');
    return;
  }

  // Update metrics
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('metric-n', n.toString());
  set('metric-r', `${CorrRegState.rho0.toFixed(2)} vs. ${CorrRegState.rho1.toFixed(2)}`);
  set('metric-alpha', `${formatPct(1 - CorrRegState.alpha, 1)}% conf. (alpha = ${(CorrRegState.alpha * 100).toFixed(1)}%)`);
  set('metric-power', `${formatPct(CorrRegState.power, 1)}% power`);
  set('metric-test', CorrRegState.sidedness === 'one' ? 'One-sided test' : 'Two-sided test');

  const apa = document.getElementById('apa-report');
  const mgr = document.getElementById('managerial-report');
  const confPct = formatPct(1 - CorrRegState.alpha, 1);
  const alphaPct = (CorrRegState.alpha * 100).toFixed(1);
  const powerPct = formatPct(CorrRegState.power, 1);
  const delta = Math.abs(CorrRegState.rho1 - CorrRegState.rho0).toFixed(2);
  const sided = CorrRegState.sidedness === 'one' ? 'one-sided' : 'two-sided';
  const modeLabel =
    CorrRegState.mode === CorrRegModes.REGRESSION
      ? 'slope in a simple regression (via the correlation between X and Y)'
      : 'correlation between X and Y';

  if (apa) {
    apa.textContent =
      `To detect a change of about ${delta} in the ${modeLabel} (from r0 = ${CorrRegState.rho0.toFixed(2)} to r1 = ${CorrRegState.rho1.toFixed(2)}) ` +
      `with ${confPct}% confidence (alpha = ${alphaPct}%) and ${powerPct}% power using a ${sided} test, ` +
      `you need approximately N = ${n} paired observations.`;
  }
  if (mgr) {
    mgr.textContent =
      `With this design, you would plan for about ${n} paired observations of your X and Y metrics. ` +
      `If the true correlation really moves from ${CorrRegState.rho0.toFixed(2)} to ${CorrRegState.rho1.toFixed(2)}, ` +
      `this sample size gives around ${powerPct}% power to flag that association as statistically reliable at ${confPct}% confidence. ` +
      `Smaller true effects or lower power requirements would reduce N; larger effects or higher power would increase it.`;
  }

  const sampleExplainer = document.getElementById('sample-size-explainer-text');
  if (sampleExplainer) {
    sampleExplainer.textContent =
      `With N ≈ ${n} paired observations, this design gives about ${powerPct}% power at ${confPct}% confidence to detect the planned change in correlation from r₀ = ${CorrRegState.rho0.toFixed(
        2
      )} to r₁ = ${CorrRegState.rho1.toFixed(2)}. ` +
      'In other words, if that true association really exists in the population, roughly ' +
      `${powerPct} out of 100 similar studies would detect (reject the null hypothesis for) it, while the rest would be too noisy to separate from the null. ` +
      'If each row in your dataset is one customer or campaign, N is the number of customers or campaigns you would want to include; if each row is one time period, N is the number of periods to plan for.';
  }

  renderEffectChart();
  renderPowerChart();
  highlightCurrentOnEffectChart();
  highlightCurrentOnPowerChart();
  refreshNarrativePanels();

  hasSuccessfulRun = true;
  checkAndTrackUsage();

  const modifiedLabel = document.getElementById('modified-date');
  if (modifiedLabel) modifiedLabel.textContent = new Date().toLocaleDateString();
}

function refreshNarrativePanels() {
  const n = CorrRegState.requiredN;
  if (!n || !isFinite(n)) return;

  const apa = document.getElementById('apa-report');
  const mgr = document.getElementById('managerial-report');
  const sampleExplainer = document.getElementById('sample-size-explainer-text');
  const confPct = formatPct(1 - CorrRegState.alpha, 1);
  const alphaPct = (CorrRegState.alpha * 100).toFixed(1);
  const powerPct = formatPct(CorrRegState.power, 1);
  const delta = Math.abs(CorrRegState.rho1 - CorrRegState.rho0).toFixed(2);
  const sided = CorrRegState.sidedness === 'one' ? 'one-sided' : 'two-sided';
  const modeLabel =
    CorrRegState.mode === CorrRegModes.REGRESSION
      ? 'slope in a simple regression (represented by the correlation between X and Y)'
      : 'correlation between X and Y';

  if (apa) {
    apa.textContent =
      `If the true ${modeLabel} in the population differs from the null value by about ${delta} (from r0 = ${CorrRegState.rho0.toFixed(
        2
      )} to r1 = ${CorrRegState.rho1.toFixed(
        2
      )}), then a study with N = ${n} paired observations would have about ${powerPct}% power at ${confPct}% confidence (alpha = ${alphaPct}%) ` +
      `to detect this difference (reject the null hypothesis using a ${sided} test).`;
  }

  if (mgr) {
    mgr.textContent =
      `This design answers a planning question: if the true association between your X and Y metrics is about r1 = ${CorrRegState.rho1.toFixed(
        2
      )} rather than r0 = ${CorrRegState.rho0.toFixed(
        2
      )}, how many paired observations do you need so that roughly ${powerPct}% of similar studies would flag that association as statistically reliable at ${confPct}% confidence? ` +
      `At around N = ${n} paired observations, you are balancing the risk of missing a real pattern (because power is less than 100%) against the cost of collecting more data; smaller targeted effects or higher desired power would increase N, while larger effects or lower power requirements would reduce it.`;
  }

  if (sampleExplainer) {
    sampleExplainer.textContent =
      `If the true correlation in the population is about r1 = ${CorrRegState.rho1.toFixed(
        2
      )} rather than r0 = ${CorrRegState.rho0.toFixed(
        2
      )}, then a study with approximately N = ${n} paired observations would have about ${powerPct}% power at ${confPct}% confidence to detect that difference (reject the null hypothesis that r = r0). ` +
      `Across many repetitions of this design, about ` +
      `${powerPct} out of 100 studies would successfully flag the association as statistically significant, while the rest would look compatible with the null just because of random noise. ` +
      `If each row in your dataset is one customer or campaign, N is the number of customers or campaigns you should plan to observe; if each row is one time period, N is the number of periods to include.`;
  }
}

function buildEffectCurve() {
  const points = [];
  const steps = 30;
  const baseDelta = Math.abs(CorrRegState.rho1 - CorrRegState.rho0) || 0.1;
  const minDelta = Math.max(baseDelta * 0.25, 0.05);
  const maxDelta = Math.min(baseDelta * 2, 0.9);
  for (let i = 0; i <= steps; i++) {
    const d = minDelta + (i * (maxDelta - minDelta)) / steps;
    const r0 = CorrRegState.rho0;
    const r1 = clamp(r0 >= 0 ? r0 + d : r0 - d, -0.99, 0.99);
    const n = computeNForCorrelation(r1, r0, CorrRegState.alpha, CorrRegState.power, CorrRegState.sidedness);
    if (n && isFinite(n)) points.push({ x: Math.abs(r1 - r0), n });
  }
  return points;
}

function buildPowerCurve() {
  const points = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const pow = 0.5 + (i * (0.99 - 0.5)) / steps;
    const n = computeNForCorrelation(
      CorrRegState.rho1,
      CorrRegState.rho0,
      CorrRegState.alpha,
      pow,
      CorrRegState.sidedness
    );
    if (n && isFinite(n)) points.push({ x: pow, n });
  }
  return points;
}

function renderEffectChart() {
  const container = document.getElementById('chart-effect');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildEffectCurve();
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
    line: { color: '#2563eb' },
    marker: { size: 6 },
    hovertemplate: '|r1 - r0|: %{x:.2f}<br>Total N: %{y:.0f}<extra></extra>'
  };
  Plotly.newPlot(container, [trace], {
    margin: { t: 20, r: 20, b: 60, l: 70 },
    xaxis: { title: '|r1 - r0| (absolute difference in correlation)', rangemode: 'tozero' },
    yaxis: { title: 'Required total sample size N', rangemode: 'tozero' },
    showlegend: false
  }, { responsive: true });
}

function renderPowerChart() {
  const container = document.getElementById('chart-power');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildPowerCurve();
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
    hovertemplate: 'Power: %{x:.3f}<br>Total N: %{y:.0f}<extra></extra>'
  };
  Plotly.newPlot(container, [trace], {
    margin: { t: 20, r: 20, b: 60, l: 70 },
    xaxis: { title: 'Desired power', tickformat: '.2f', rangemode: 'tozero' },
    yaxis: { title: 'Required total sample size N', rangemode: 'tozero' },
    showlegend: false
  }, { responsive: true });
}

// Highlight current settings on the effect-size chart
function highlightCurrentOnEffectChart() {
  const container = document.getElementById('chart-effect');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildEffectCurve();
  if (!points || !points.length) return;

  const currentDelta = Math.abs(CorrRegState.rho1 - CorrRegState.rho0);
  const currentIndex = points.reduce(
    (bestIdx, p, idx) =>
      Math.abs(p.x - currentDelta) < Math.abs(points[bestIdx].x - currentDelta) ? idx : bestIdx,
    0
  );
  const p = points[currentIndex];

  Plotly.addTraces(container, {
    x: [p.x],
    y: [p.n],
    type: 'scatter',
    mode: 'markers',
    marker: { color: '#dc2626', size: 14 },
    hovertemplate: 'Current design<br>|r1 - r0|: %{x:.2f}<br>Total N: %{y:.0f}<extra></extra>'
  });
}

// Highlight current settings on the power chart
function highlightCurrentOnPowerChart() {
  const container = document.getElementById('chart-power');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildPowerCurve();
  if (!points || !points.length) return;

  const currentPower = CorrRegState.power;
  const currentIndex = points.reduce(
    (bestIdx, p, idx) =>
      Math.abs(p.x - currentPower) < Math.abs(points[bestIdx].x - currentPower) ? idx : bestIdx,
    0
  );
  const p = points[currentIndex];

  Plotly.addTraces(container, {
    x: [p.x],
    y: [p.n],
    type: 'scatter',
    mode: 'markers',
    marker: { color: '#dc2626', size: 14 },
    hovertemplate: 'Current design<br>Power: %{x:.3f}<br>Total N: %{y:.0f}<extra></extra>'
  });
}

function populateScenarioSelect() {
  const select = document.getElementById('scenario-select');
  if (!select) return;
  select.innerHTML = '<option value="">Manual inputs (no preset)</option>';
  CorrRegScenarios.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    select.appendChild(opt);
  });
}

function applyScenario(id) {
  const scenario = CorrRegScenarios.find(s => s.id === id);
  const desc = document.getElementById('scenario-description');
  if (!scenario) {
    if (desc) {
      desc.innerHTML =
        '<p>Use presets to explore correlation / regression planning questions, or leave this on Manual to configure your own design.</p>';
    }
    return;
  }
  if (desc) {
    if (scenario.descriptionHtml) {
      desc.innerHTML = scenario.descriptionHtml;
    } else {
      desc.innerHTML = `<p>${scenario.description}</p>`;
    }
  }
  const s = scenario.settings || {};
  CorrRegState.mode = s.mode || CorrRegModes.CORRELATION;
  CorrRegState.rho0 = typeof s.rho0 === 'number' ? s.rho0 : CorrRegState.rho0;
  CorrRegState.rho1 = typeof s.rho1 === 'number' ? s.rho1 : CorrRegState.rho1;
  CorrRegState.alpha = typeof s.alpha === 'number' ? s.alpha : CorrRegState.alpha;
  CorrRegState.power = typeof s.power === 'number' ? s.power : CorrRegState.power;
  CorrRegState.sidedness = s.sidedness === 'one' ? 'one' : 'two';

  const rho0Input = document.getElementById('rho0-input');
  const rho1Input = document.getElementById('rho1-input');
  const alphaInput = document.getElementById('alpha');
  const powerInput = document.getElementById('power');
  const sidednessSelect = document.getElementById('sidedness');

  if (rho0Input) rho0Input.value = CorrRegState.rho0.toFixed(2);
  if (rho1Input) rho1Input.value = CorrRegState.rho1.toFixed(2);
  if (alphaInput) alphaInput.value = CorrRegState.alpha.toFixed(3);
  if (powerInput) powerInput.value = CorrRegState.power.toFixed(2);
  if (sidednessSelect) sidednessSelect.value = CorrRegState.sidedness;

  syncModeButtons();
  applyConfidenceSelection(1 - CorrRegState.alpha, { syncAlpha: true, skipUpdate: true });
  syncRhoInputsFromState();
  updateDesign();
}

document.addEventListener('DOMContentLoaded', () => {
  const createdLabel = document.getElementById('created-date');
  const modifiedLabel = document.getElementById('modified-date');
  if (createdLabel) createdLabel.textContent = CREATED_DATE;
  if (modifiedLabel) modifiedLabel.textContent = modifiedDate;

  // Mode buttons
  document.querySelectorAll('.mode-button').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      const mode = btn.dataset.mode === 'regression' ? CorrRegModes.REGRESSION : CorrRegModes.CORRELATION;
      CorrRegState.mode = mode;
      syncModeButtons();
      updateExplainers();
      refreshNarrativePanels();
    });
  });
  syncModeButtons();

  // Confidence level buttons
  document.querySelectorAll('.confidence-button').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      const level = parseFloat(btn.dataset.level);
      if (!isFinite(level) || level <= 0 || level >= 1) return;
      applyConfidenceSelection(level);
    });
  });

  const alphaInput = document.getElementById('alpha');
  if (alphaInput) {
    alphaInput.addEventListener('input', () => {
      const val = parseFloat(alphaInput.value);
      if (isFinite(val) && val > 0 && val < 1) {
        syncConfidenceButtonsToAlpha(val);
      }
    });
  }

  const rho0Input = document.getElementById('rho0-input');
  const rho1Input = document.getElementById('rho1-input');
  const powerInput = document.getElementById('power');
  const sidednessSelect = document.getElementById('sidedness');

  if (rho0Input) rho0Input.addEventListener('input', updateDesign);
  if (rho1Input) rho1Input.addEventListener('input', updateDesign);

  const rho0RegInput = document.getElementById('rho0-reg-input');
  const rho1RegInput = document.getElementById('rho1-reg-input');
  if (rho0RegInput) {
    rho0RegInput.addEventListener('input', () => {
      const val = clamp(parseFloat(rho0RegInput.value), -0.99, 0.99);
      CorrRegState.rho0 = isFinite(val) ? val : CorrRegState.rho0;
      syncRhoInputsFromState();
      updateDesign();
    });
  }
  if (rho1RegInput) {
    rho1RegInput.addEventListener('input', () => {
      const val = clamp(parseFloat(rho1RegInput.value), -0.99, 0.99);
      CorrRegState.rho1 = isFinite(val) ? val : CorrRegState.rho1;
      syncRhoInputsFromState();
      updateDesign();
    });
  }
  if (powerInput) powerInput.addEventListener('input', updateDesign);
  if (sidednessSelect) sidednessSelect.addEventListener('change', updateDesign);

  populateScenarioSelect();
  const scenarioSelect = document.getElementById('scenario-select');
  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', () => {
      const id = scenarioSelect.value;
      if (!id) {
        const desc = document.getElementById('scenario-description');
        if (desc) {
          desc.innerHTML =
            '<p>Use presets to explore correlation / regression planning questions, or leave this on Manual to configure your own design.</p>';
        }
        return;
      }
      applyScenario(id);
    });
  }

  const downloadBtn = document.getElementById('scenario-download');
  if (downloadBtn) {
    downloadBtn.classList.add('hidden');
    downloadBtn.disabled = true;
  }

  // Initialize with default state
  applyConfidenceSelection(0.95, { syncAlpha: true, skipUpdate: true });
  syncRhoInputsFromState();
  updateDesign();
});
