// Sample Size Planner — Multi-arm A/B Tests

const MULTI_CREATED_DATE = '2025-11-24';
let multiModifiedDate = new Date().toLocaleDateString();

const MultiOutcomeModes = {
  PROPORTION: 'proportion',
  MEAN: 'mean'
};

const MultiGoals = {
  LIFT: 'lift',
  OMNIBUS: 'omnibus'
};

const MultiState = {
  mode: MultiOutcomeModes.PROPORTION,
  goal: MultiGoals.LIFT,
  alpha: 0.05,
  sidedness: 'two',
  power: 0.8,
  sigma: 15,
  armsProportion: [
    { label: 'Control', p: 0.2 },
    { label: 'Variant B', p: 0.23 },
    { label: 'Variant C', p: 0.235 },
    { label: 'Variant D', p: 0.24 }
  ],
  armsMean: [
    { label: 'Control', mean: 50 },
    { label: 'Variant B', mean: 53 },
    { label: 'Variant C', mean: 54 },
    { label: 'Variant D', mean: 55 }
  ],
  nPerArm: null,
  nTotal: null
};

const MultiScenarios = [
  {
    id: 'subject-lines',
    label: 'Email subject lines (3 variants)',
    description:
      'Compare three new subject lines against a proven control. Baseline open rate is around 20%; marketing only cares about variants that lift opens to 23–24%.',
    settings: {
      mode: MultiOutcomeModes.PROPORTION,
      goal: MultiGoals.LIFT,
      alpha: 0.05,
      power: 0.8,
      sidedness: 'two',
      armsProportion: [
        { label: 'Control', p: 0.20 },
        { label: 'New line B', p: 0.23 },
        { label: 'New line C', p: 0.235 },
        { label: 'New line D', p: 0.24 }
      ]
    }
  },
  {
    id: 'hero-images',
    label: 'Landing page hero images (4 variants)',
    description:
      'Test four new hero images against the current hero on a landing page. Baseline click-through is 5%; you would only act on variants that improve to 6–7%.',
    settings: {
      mode: MultiOutcomeModes.PROPORTION,
      goal: MultiGoals.OMNIBUS,
      alpha: 0.05,
      power: 0.8,
      sidedness: 'two',
      armsProportion: [
        { label: 'Control hero', p: 0.05 },
        { label: 'Hero B', p: 0.06 },
        { label: 'Hero C', p: 0.065 },
        { label: 'Hero D', p: 0.07 }
      ]
    }
  },
  {
    id: 'order-value',
    label: 'Average order value (3 offers)',
    description:
      'Compare two upsell offers against the current checkout flow. Baseline average order value is $50; product management is interested in upsells that move this to $53–$55.',
    settings: {
      mode: MultiOutcomeModes.MEAN,
      goal: MultiGoals.LIFT,
      alpha: 0.05,
      power: 0.8,
      sidedness: 'two',
      sigma: 15,
      armsMean: [
        { label: 'Control', mean: 50 },
        { label: 'Upsell B', mean: 53 },
        { label: 'Upsell C', mean: 55 },
        { label: 'Upsell D', mean: 55 }
      ]
    }
  }
];

function getZQuantileMulti(p) {
  if (window.StatsUtils && typeof window.StatsUtils.normInv === 'function') {
    return window.StatsUtils.normInv(p);
  }
  if (Math.abs(p - 0.80) < 1e-3) return 0.8416;
  if (Math.abs(p - 0.90) < 1e-3) return 1.2816;
  if (Math.abs(p - 0.95) < 1e-3) return 1.6449;
  if (Math.abs(p - 0.975) < 1e-3) return 1.96;
  if (Math.abs(p - 0.99) < 1e-3) return 2.3263;
  return 1.96;
}

function getZAlphaMulti(alpha, sidedness) {
  const a = typeof alpha === 'number' && isFinite(alpha) && alpha > 0 && alpha < 1 ? alpha : 0.05;
  const twoSided = sidedness !== 'one';
  const p = twoSided ? 1 - a / 2 : 1 - a;
  return getZQuantileMulti(p);
}

function getZBetaMulti(power) {
  const pow = typeof power === 'number' && isFinite(power) && power > 0 && power < 1 ? power : 0.8;
  return getZQuantileMulti(pow);
}

function computeNMeansEqualVarianceMulti({ meanControl, meanVariant, sigma, alpha, power, sidedness }) {
  const delta = meanVariant - meanControl;
  const absDelta = Math.abs(delta);
  const s = Math.max(0, sigma);
  if (!absDelta || !s) return null;
  const zAlpha = getZAlphaMulti(alpha, sidedness);
  const zBeta = getZBetaMulti(power);
  const base = ((zAlpha + zBeta) * s) / absDelta;
  return Math.ceil(base * base);
}

function computeNProportionsMulti({ pControl, pVariant, alpha, power, sidedness }) {
  const p1 = Math.min(0.999, Math.max(0.001, pControl));
  const p2 = Math.min(0.999, Math.max(0.001, pVariant));
  const delta = p2 - p1;
  const absDelta = Math.abs(delta);
  if (!absDelta) return null;
  const zAlpha = getZAlphaMulti(alpha, sidedness);
  const zBeta = getZBetaMulti(power);
  const pbar = 0.5 * (p1 + p2);
  const varH0 = 2 * pbar * (1 - pbar);
  const varAlt = p1 * (1 - p1) + p2 * (1 - p2);
  const base = (zAlpha * Math.sqrt(varH0) + zBeta * Math.sqrt(varAlt)) / absDelta;
  return Math.ceil(base * base);
}

function clampMulti(value, min, max) {
  if (!isFinite(value)) return value;
  return Math.max(min, Math.min(max, value));
}

function setModeMulti(mode) {
  const next = mode === MultiOutcomeModes.MEAN ? MultiOutcomeModes.MEAN : MultiOutcomeModes.PROPORTION;
  MultiState.mode = next;
  document.querySelectorAll('.mode-button').forEach(button => {
    const active = button.dataset.mode === next;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.querySelectorAll('.mode-panel').forEach(panel => {
    const active = panel.dataset.mode === next;
    panel.classList.toggle('active', active);
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
  updateMultiDesign();
}

function setGoalMulti(goal) {
  const next = goal === MultiGoals.OMNIBUS ? MultiGoals.OMNIBUS : MultiGoals.LIFT;
  MultiState.goal = next;
  document.querySelectorAll('.goal-button').forEach(button => {
    const active = button.dataset.goal === next;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  updateMultiDesign();
}

function reflectConfidenceButtonsMulti() {
  const alphaInput = document.getElementById('alpha');
  if (!alphaInput) return;
  const alphaVal = parseFloat(alphaInput.value);
  const conf = isFinite(alphaVal) ? 1 - alphaVal : 0.95;
  document.querySelectorAll('.confidence-button').forEach(btn => {
    const level = parseFloat(btn.dataset.level);
    const isActive = isFinite(level) && Math.abs(level - conf) < 1e-6;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function clearMultiOutputs(message) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('metric-n-per-arm', '—');
  set('metric-n-total', '—');
  set('metric-outcome', '—');
  set('metric-goal', '—');
  set('metric-alpha', '—');
  set('metric-power', '—');
  const apa = document.getElementById('apa-report');
  const mgr = document.getElementById('managerial-report');
  if (apa) apa.textContent = message || 'Provide design inputs to see the required per-arm and total sample size.';
  if (mgr) {
    mgr.textContent =
      'Once you specify control and variant targets and your confidence/power, this panel will summarize how many observations per arm you need and how the design behaves across many hypothetical repetitions.';
  }
  const armSummary = document.getElementById('arm-summary-table');
  if (armSummary) {
    armSummary.innerHTML =
      '<p class="muted">Enter control and variant targets above to see a summary of lifts and required n per arm.</p>';
  }
  const effectChart = document.getElementById('chart-effect');
  const powerChart = document.getElementById('chart-power');
  if (effectChart && window.Plotly) Plotly.purge(effectChart);
  if (powerChart && window.Plotly) Plotly.purge(powerChart);
}

function applyMultiScenario(id) {
  const scenario = MultiScenarios.find(s => s.id === id);
  const desc = document.getElementById('scenario-description');
  if (!scenario) {
    if (desc) {
      desc.innerHTML =
        '<p>Use presets to explore multi-arm planning questions, or leave this on Manual to configure your own design.</p>';
    }
    return;
  }
  if (desc) {
    desc.innerHTML = `<p>${scenario.description}</p>`;
  }
  const s = scenario.settings || {};
  MultiState.mode = s.mode || MultiState.mode;
  MultiState.goal = s.goal || MultiState.goal;
  MultiState.alpha = typeof s.alpha === 'number' ? s.alpha : MultiState.alpha;
  MultiState.power = typeof s.power === 'number' ? s.power : MultiState.power;
  MultiState.sidedness = s.sidedness === 'one' ? 'one' : 'two';
  if (Array.isArray(s.armsProportion)) MultiState.armsProportion = s.armsProportion;
  if (Array.isArray(s.armsMean)) MultiState.armsMean = s.armsMean;
  if (typeof s.sigma === 'number') MultiState.sigma = s.sigma;

  // Reflect into inputs
  const alphaInput = document.getElementById('alpha');
  const powerInput = document.getElementById('power');
  const sidednessSelect = document.getElementById('sidedness');
  if (alphaInput) alphaInput.value = MultiState.alpha.toFixed(3);
  if (powerInput) powerInput.value = MultiState.power.toFixed(2);
  if (sidednessSelect) sidednessSelect.value = MultiState.sidedness;

  const armsP = MultiState.armsProportion || [];
  const armsM = MultiState.armsMean || [];
  for (let i = 0; i < 4; i++) {
    const ap = armsP[i];
    const am = armsM[i];
    const labelP = document.getElementById(`arm-label-${i}`);
    const rateInput = document.getElementById(`arm-rate-${i}`);
    const labelM = document.getElementById(`arm-mean-label-${i}`);
    const meanInput = document.getElementById(`arm-mean-${i}`);
    if (ap) {
      if (labelP) labelP.value = ap.label;
      if (rateInput) rateInput.value = ap.p.toFixed(3);
    }
    if (am) {
      if (labelM) labelM.value = am.label;
      if (meanInput) meanInput.value = am.mean.toFixed(2);
    }
  }
  const sigmaInput = document.getElementById('sigma');
  if (sigmaInput) sigmaInput.value = MultiState.sigma.toFixed(2);

  setModeMulti(MultiState.mode);
  setGoalMulti(MultiState.goal);
  reflectConfidenceButtonsMulti();
  updateMultiDesign();
}

function updateMultiDesign() {
  const alphaInput = document.getElementById('alpha');
  const powerInput = document.getElementById('power');
  const sidednessSelect = document.getElementById('sidedness');

  if (alphaInput) MultiState.alpha = clampMulti(parseFloat(alphaInput.value), 0.0005, 0.25) || 0.05;
  if (powerInput) MultiState.power = clampMulti(parseFloat(powerInput.value), 0.5, 0.99) || 0.8;
  if (sidednessSelect) MultiState.sidedness = sidednessSelect.value === 'one' ? 'one' : 'two';

  // Read arms
  const armsP = [];
  const armsM = [];
  for (let i = 0; i < 4; i++) {
    const labelP = document.getElementById(`arm-label-${i}`);
    const rateInput = document.getElementById(`arm-rate-${i}`);
    if (labelP && rateInput) {
      const p = parseFloat(rateInput.value);
      armsP.push({
        label: labelP.value || (i === 0 ? 'Control' : `Variant ${String.fromCharCode(65 + i)}`),
        p: clampMulti(p, 0.001, 0.999)
      });
    }
    const labelM = document.getElementById(`arm-mean-label-${i}`);
    const meanInput = document.getElementById(`arm-mean-${i}`);
    if (labelM && meanInput) {
      const m = parseFloat(meanInput.value);
      armsM.push({
        label: labelM.value || (i === 0 ? 'Control' : `Variant ${String.fromCharCode(65 + i)}`),
        mean: m
      });
    }
  }
  if (armsP.length >= 2) MultiState.armsProportion = armsP;
  if (armsM.length >= 2) MultiState.armsMean = armsM;

  const sigmaInput = document.getElementById('sigma');
  if (sigmaInput) {
    const s = parseFloat(sigmaInput.value);
    MultiState.sigma = isFinite(s) && s > 0 ? s : MultiState.sigma;
  }

  const arms = MultiState.mode === MultiOutcomeModes.MEAN ? MultiState.armsMean : MultiState.armsProportion;
  if (!arms || arms.length < 2) {
    clearMultiOutputs('Specify at least one control and one variant arm to compute a design.');
    return;
  }

  const control = arms[0];
  const variants = arms.slice(1);
  const m = variants.length;

  let baseAlpha = MultiState.alpha;
  if (MultiState.goal === MultiGoals.LIFT && m > 0) {
    baseAlpha = MultiState.alpha / m;
  }

  const nCandidates = [];
  variants.forEach(v => {
    let n = null;
    if (MultiState.mode === MultiOutcomeModes.MEAN) {
      n = computeNMeansEqualVarianceMulti({
        meanControl: control.mean,
        meanVariant: v.mean,
        sigma: MultiState.sigma,
        alpha: baseAlpha,
        power: MultiState.power,
        sidedness: MultiState.sidedness
      });
    } else {
      n = computeNProportionsMulti({
        pControl: control.p,
        pVariant: v.p,
        alpha: baseAlpha,
        power: MultiState.power,
        sidedness: MultiState.sidedness
      });
    }
    if (n && isFinite(n)) nCandidates.push(n);
  });

  if (!nCandidates.length) {
    clearMultiOutputs('Unable to compute a sample size for the current effect pattern. Check that at least one variant differs from control.');
    return;
  }

  const nPerArm = Math.max(...nCandidates);
  const nTotal = nPerArm * arms.length;
  MultiState.nPerArm = nPerArm;
  MultiState.nTotal = nTotal;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const confPct = (100 * (1 - MultiState.alpha)).toFixed(1);
  const alphaPct = (100 * MultiState.alpha).toFixed(1);
  const powerPct = (100 * MultiState.power).toFixed(1);

  set('metric-n-per-arm', nPerArm.toString());
  set('metric-n-total', nTotal.toString());
  set('metric-outcome', MultiState.mode === MultiOutcomeModes.MEAN ? 'Means (averages)' : 'Proportions (rates)');
  set('metric-goal', MultiState.goal === MultiGoals.LIFT ? 'Minimum lift vs. control' : 'Any difference across arms (omnibus)');
  set('metric-alpha', `${confPct}% conf. (alpha = ${alphaPct}%)`);
  set('metric-power', `${powerPct}% power`);

  const apa = document.getElementById('apa-report');
  const mgr = document.getElementById('managerial-report');

  if (apa) {
    const outcomeLabel =
      MultiState.mode === MultiOutcomeModes.MEAN ? 'mean outcome' : 'conversion / response rate';
    const goalLabel =
      MultiState.goal === MultiGoals.LIFT
        ? 'a minimum lift vs. control for each variant, adjusting for multiple arms'
        : 'that at least one variant differs meaningfully from control (omnibus effect)';

    apa.textContent =
      `Assuming equal allocation across ${arms.length} arms, a per-arm sample size of n = ${nPerArm} (N total = ${nTotal}) ` +
      `provides about ${powerPct}% power at ${confPct}% confidence (alpha = ${alphaPct}%) to detect ${goalLabel} on the ${outcomeLabel}.`;
  }

  if (mgr) {
    mgr.textContent =
      `With this design, you would plan for about ${nPerArm} observations per arm (roughly ${nTotal} total). ` +
      `If one or more variants truly achieve the lifts you have specified relative to the control arm, a test of this size would successfully flag those differences as statistically reliable in roughly ${powerPct} out of 100 similar experiments, ` +
      `and would look inconclusive in the remaining runs simply because of random noise. Larger targeted lifts or lower power requirements would reduce the required per-arm n; smaller lifts or higher power requirements would increase it.`;
  }

  const armSummary = document.getElementById('arm-summary-table');
  if (armSummary) {
    const rows = [];
    rows.push(
      '<div class="arm-row arm-header"><span>Arm</span><span>Target</span><span>Lift vs. control</span></div>'
    );
    const controlVal = MultiState.mode === MultiOutcomeModes.MEAN ? control.mean : control.p;
    variants.forEach(v => {
      const vVal = MultiState.mode === MultiOutcomeModes.MEAN ? v.mean : v.p;
      const diff = vVal - controlVal;
      const lift =
        MultiState.mode === MultiOutcomeModes.MEAN
          ? `${diff.toFixed(2)} units`
          : `${(diff * 100).toFixed(1)} pts`;
      const target =
        MultiState.mode === MultiOutcomeModes.MEAN
          ? vVal.toFixed(2)
          : `${(vVal * 100).toFixed(1)}%`;
      rows.push(
        `<div class="arm-row"><span>${v.label}</span><span>${target}</span><span>${lift}</span></div>`
      );
    });
    armSummary.innerHTML = rows.join('');
  }

  renderMultiEffectChart();
  renderMultiPowerChart();

  const modifiedLabel = document.getElementById('modified-date');
  if (modifiedLabel) modifiedLabel.textContent = new Date().toLocaleDateString();
}

function buildMultiEffectCurve() {
  const points = [];
  const arms = MultiState.mode === MultiOutcomeModes.MEAN ? MultiState.armsMean : MultiState.armsProportion;
  if (!arms || arms.length < 2) return points;
  const control = arms[0];
  const variants = arms.slice(1);
  const controlVal = MultiState.mode === MultiOutcomeModes.MEAN ? control.mean : control.p;

  const deltas = variants.map(v => {
    const vVal = MultiState.mode === MultiOutcomeModes.MEAN ? v.mean : v.p;
    return Math.abs(vVal - controlVal);
  });
  const baseDelta = deltas.length ? Math.max(...deltas) : 0.01;
  const steps = 25;
  const minDelta = Math.max(baseDelta * 0.25, MultiState.mode === MultiOutcomeModes.MEAN ? 0.1 : 0.005);
  const maxDelta = Math.min(baseDelta * 2, MultiState.mode === MultiOutcomeModes.MEAN ? baseDelta * 4 : 0.4);

  for (let i = 0; i <= steps; i++) {
    const d = minDelta + (i * (maxDelta - minDelta)) / steps;
    let n = null;
    if (MultiState.mode === MultiOutcomeModes.MEAN) {
      n = computeNMeansEqualVarianceMulti({
        meanControl: controlVal,
        meanVariant: controlVal + d,
        sigma: MultiState.sigma,
        alpha: MultiState.alpha,
        power: MultiState.power,
        sidedness: MultiState.sidedness
      });
    } else {
      const p2 = clampMulti(controlVal + d, 0.001, 0.999);
      n = computeNProportionsMulti({
        pControl: controlVal,
        pVariant: p2,
        alpha: MultiState.alpha,
        power: MultiState.power,
        sidedness: MultiState.sidedness
      });
    }
    if (n && isFinite(n)) points.push({ x: d, n });
  }
  return points;
}

function buildMultiPowerCurve() {
  const points = [];
  const arms = MultiState.mode === MultiOutcomeModes.MEAN ? MultiState.armsMean : MultiState.armsProportion;
  if (!arms || arms.length < 2) return points;
  const control = arms[0];
  const variants = arms.slice(1);
  if (!variants.length) return points;

  const controlVal = MultiState.mode === MultiOutcomeModes.MEAN ? control.mean : control.p;
  const vVal = MultiState.mode === MultiOutcomeModes.MEAN ? variants[0].mean : variants[0].p;

  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const pow = 0.5 + (i * (0.99 - 0.5)) / steps;
    let n = null;
    if (MultiState.mode === MultiOutcomeModes.MEAN) {
      n = computeNMeansEqualVarianceMulti({
        meanControl: controlVal,
        meanVariant: vVal,
        sigma: MultiState.sigma,
        alpha: MultiState.alpha,
        power: pow,
        sidedness: MultiState.sidedness
      });
    } else {
      n = computeNProportionsMulti({
        pControl: controlVal,
        pVariant: vVal,
        alpha: MultiState.alpha,
        power: pow,
        sidedness: MultiState.sidedness
      });
    }
    if (n && isFinite(n)) points.push({ x: pow, n });
  }
  return points;
}

function renderMultiEffectChart() {
  const container = document.getElementById('chart-effect');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildMultiEffectCurve();
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
    showlegend: false,
    hovertemplate:
      MultiState.mode === MultiOutcomeModes.MEAN
        ? 'Difference in means: %{x:.2f}<br>Per-arm n: %{y:.0f}<extra></extra>'
        : 'Difference in rates: %{x:.3f}<br>Per-arm n: %{y:.0f}<extra></extra>'
  };
  const data = [trace];

  // Add marker for each variant at its current lift vs control
  const arms = MultiState.mode === MultiOutcomeModes.MEAN ? MultiState.armsMean : MultiState.armsProportion;
  if (arms && arms.length > 1) {
    const control = arms[0];
    const variants = arms.slice(1);
    const controlVal = MultiState.mode === MultiOutcomeModes.MEAN ? control.mean : control.p;
    const colors = ['#dc2626', '#059669', '#7c3aed', '#f59e0b'];
    variants.forEach((v, idx) => {
      const vVal = MultiState.mode === MultiOutcomeModes.MEAN ? v.mean : v.p;
      const d = Math.abs(vVal - controlVal);
      let n = null;
      if (MultiState.mode === MultiOutcomeModes.MEAN) {
        n = computeNMeansEqualVarianceMulti({
          meanControl: controlVal,
          meanVariant: vVal,
          sigma: MultiState.sigma,
          alpha: MultiState.alpha,
          power: MultiState.power,
          sidedness: MultiState.sidedness
        });
      } else {
        n = computeNProportionsMulti({
          pControl: controlVal,
          pVariant: vVal,
          alpha: MultiState.alpha,
          power: MultiState.power,
          sidedness: MultiState.sidedness
        });
      }
      if (!n || !isFinite(n)) return;
      data.push({
        x: [d],
        y: [n],
        type: 'scatter',
        mode: 'markers',
        marker: { color: colors[idx % colors.length], size: 10 },
        name: v.label,
        hovertemplate:
          `${v.label}<br>` +
          (MultiState.mode === MultiOutcomeModes.MEAN
            ? 'Difference in means: %{x:.2f}'
            : 'Difference in rates: %{x:.3f}') +
          '<br>Per-arm n: %{y:.0f}<extra></extra>'
      });
    });
  }

  Plotly.newPlot(
    container,
    data,
    {
      margin: { t: 20, r: 20, b: 60, l: 70 },
      xaxis: {
        title:
          MultiState.mode === MultiOutcomeModes.MEAN
            ? 'Difference in means (variant − control)'
            : 'Difference in rates (variant − control)',
        rangemode: 'tozero'
      },
      yaxis: { title: 'Required per-arm sample size n', rangemode: 'tozero' },
      showlegend: true
    },
    { responsive: true }
  );
}

function renderMultiPowerChart() {
  const container = document.getElementById('chart-power');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildMultiPowerCurve();
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
    hovertemplate: 'Power: %{x:.3f}<br>Per-arm n: %{y:.0f}<extra></extra>'
  };
  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 20, r: 20, b: 60, l: 70 },
      xaxis: { title: 'Desired power', tickformat: '.2f', rangemode: 'tozero' },
      yaxis: { title: 'Required per-arm sample size n', rangemode: 'tozero' },
      showlegend: false
    },
    { responsive: true }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const createdLabel = document.getElementById('created-date');
  const modifiedLabel = document.getElementById('modified-date');
  if (createdLabel) createdLabel.textContent = MULTI_CREATED_DATE;
  if (modifiedLabel) modifiedLabel.textContent = multiModifiedDate;

  document.querySelectorAll('.mode-button').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      setModeMulti(button.dataset.mode);
    });
  });
  setModeMulti(MultiState.mode);

  document.querySelectorAll('.goal-button').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      setGoalMulti(button.dataset.goal);
    });
  });
  setGoalMulti(MultiState.goal);

  document.querySelectorAll('.confidence-button').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      const level = parseFloat(btn.dataset.level);
      if (!isFinite(level) || level <= 0 || level >= 1) return;
      const alpha = 1 - level;
      const alphaInput = document.getElementById('alpha');
      MultiState.alpha = alpha;
      if (alphaInput) alphaInput.value = alpha.toFixed(3);
      reflectConfidenceButtonsMulti();
      updateMultiDesign();
    });
  });

  const alphaInput = document.getElementById('alpha');
  if (alphaInput) {
    alphaInput.addEventListener('input', () => {
      const val = parseFloat(alphaInput.value);
      if (isFinite(val) && val > 0 && val < 1) {
        MultiState.alpha = val;
      }
      reflectConfidenceButtonsMulti();
      updateMultiDesign();
    });
  }

  const powerInput = document.getElementById('power');
  if (powerInput) {
    powerInput.addEventListener('input', () => {
      const val = parseFloat(powerInput.value);
      if (isFinite(val) && val > 0.5 && val < 0.99) {
        MultiState.power = val;
        updateMultiDesign();
      }
    });
  }

  const sidednessSelect = document.getElementById('sidedness');
  if (sidednessSelect) {
    sidednessSelect.addEventListener('change', () => {
      MultiState.sidedness = sidednessSelect.value === 'one' ? 'one' : 'two';
      updateMultiDesign();
    });
  }

  // Arm inputs
  for (let i = 0; i < 4; i++) {
    const rateInput = document.getElementById(`arm-rate-${i}`);
    const meanInput = document.getElementById(`arm-mean-${i}`);
    const labelP = document.getElementById(`arm-label-${i}`);
    const labelM = document.getElementById(`arm-mean-label-${i}`);
    if (rateInput) rateInput.addEventListener('input', updateMultiDesign);
    if (meanInput) meanInput.addEventListener('input', updateMultiDesign);
    if (labelP) labelP.addEventListener('input', updateMultiDesign);
    if (labelM) labelM.addEventListener('input', updateMultiDesign);
  }

  const sigmaInput = document.getElementById('sigma');
  if (sigmaInput) sigmaInput.addEventListener('input', updateMultiDesign);

  const scenarioSelect = document.getElementById('scenario-select');
  if (scenarioSelect) {
    scenarioSelect.innerHTML = '<option value="">Manual inputs (no preset)</option>';
    MultiScenarios.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      scenarioSelect.appendChild(opt);
    });
    scenarioSelect.addEventListener('change', () => {
      const id = scenarioSelect.value;
      if (!id) {
        const desc = document.getElementById('scenario-description');
        if (desc) {
          desc.innerHTML =
            '<p>Use presets to explore multi-arm planning questions, or leave this on Manual to configure your own design.</p>';
        }
        return;
      }
      applyMultiScenario(id);
    });
  }

  reflectConfidenceButtonsMulti();
  updateMultiDesign();
});
