// A/B Sample Size Planner – Two Means / Two Proportions

const CREATED_DATE = '2025-11-21';
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
  const storageKey = `tool-tracked-sample-size-ab-calculator-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('sample-size-ab-calculator', {}, `A/B test sample size calculation completed`);
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for A/B Test Sample Size Calculator');
  }
}

const OutcomeModes = {
  PROPORTION: 'proportion',
  MEAN: 'mean'
};

const SampleSizeABState = {
  mode: OutcomeModes.PROPORTION,
  alpha: 0.05,
  sidedness: 'two', // 'one' or 'two'
  power: 0.8,
  allocationRatio: 1, // nB / nA
  p1: 0.2,
  p2: 0.25,
  mean1: 50,
  mean2: 55,
  sigma: 15,
  n1: null,
  n2: null,
  nTotal: null
};

const ABScenarios = [
  {
    id: 'email-open-rate',
    label: 'Email subject line A/B (open rate)',
    mode: OutcomeModes.PROPORTION,
    description:
      'Compare open rates between a control subject line (Group A) and a new subject line (Group B). Baseline ~20% with a meaningful lift to 25%, 95% confidence, and 80% power.',
    settings: {
      p1: 0.2,
      p2: 0.25,
      alpha: 0.05,
      sidedness: 'two',
      power: 0.8,
      allocationRatio: 1
    }
  },
  {
    id: 'landing-page-conversion',
    label: 'Landing page A/B (conversion rate)',
    mode: OutcomeModes.PROPORTION,
    description:
      'Test a new landing page (Group B) against the current page (Group A). Baseline conversion 5%; you care about detecting an increase to 6.5%, with 95% confidence and 80% power.',
    settings: {
      p1: 0.05,
      p2: 0.065,
      alpha: 0.05,
      sidedness: 'two',
      power: 0.8,
      allocationRatio: 1
    }
  },
  {
    id: 'average-order-value',
    label: 'Average order value shift',
    mode: OutcomeModes.MEAN,
    description:
      'Compare average order value between a control offer (Group A) and an upsell offer (Group B). Baseline mean $50 vs. target $55, common SD ≈ $15, 95% confidence, 80% power.',
    settings: {
      mean1: 50,
      mean2: 55,
      sigma: 15,
      alpha: 0.05,
      sidedness: 'two',
      power: 0.8,
      allocationRatio: 1
    }
  }
];

// Enrich scenario descriptions with more marketing context
ABScenarios.forEach(scenario => {
  if (scenario.id === 'email-open-rate') {
    scenario.description =
      'You are running a weekly newsletter and want to compare a proven control subject line (Group A) with a new creative (Group B). Historical open rate is around 20%, and marketing leadership would only care about rolling out the new line if it reliably lifts opens to about 25%. This preset shows how many sends you need to have 95% confidence and 80% power to detect that kind of lift.';
    scenario.descriptionHtml =
      '<p><strong>Question:</strong> Will a new subject line reliably beat our current control?</p>' +
      '<p>You are running a weekly newsletter and want to compare a proven control subject line (<strong>Group A</strong>) with a new creative (<strong>Group B</strong>). Historical open rate is around <strong>20%</strong>, and marketing leadership only cares about rolling out the new line if it reliably lifts opens to about <strong>25%</strong>.</p>' +
      '<p>This preset assumes that 5 percentage points is the <em>minimum meaningful lift</em> and shows how many sends you need at <strong>95% confidence</strong> and <strong>80% power</strong> to detect that improvement.</p>';
  } else if (scenario.id === 'landing-page-conversion') {
    scenario.description =
      'Paid media is sending traffic to your current landing page (Group A), which converts about 5% of visitors. Design has proposed a new layout (Group B) that should increase the add-to-cart or sign-up rate to roughly 6.5%. This scenario treats that 1.5 percentage-point lift as the minimum worth acting on and shows the sample size needed to detect it with 95% confidence and 80% power so you can budget impressions and test duration.';
    scenario.descriptionHtml =
      '<p><strong>Question:</strong> Does a redesigned landing page move the needle on conversion?</p>' +
      '<p>Paid media is sending traffic to your current landing page (<strong>Group A</strong>), which converts about <strong>5%</strong> of visitors. Design has proposed a new layout (<strong>Group B</strong>) that is expected to lift the add-to-cart or sign-up rate to roughly <strong>6.5%</strong>.</p>' +
      '<p>This preset treats that <strong>1.5 percentage-point lift</strong> as the minimum worth acting on and shows the sample size needed to detect it with <strong>95% confidence</strong> and <strong>80% power</strong>, so you can budget impressions and test duration.</p>';
  } else if (scenario.id === 'average-order-value') {
    scenario.description =
      'E-commerce wants to test a new upsell offer (Group B) against the current checkout flow (Group A). Today the average order value is about $50, with order-to-order variability of roughly $15. Product management is interested in rolling out the upsell if it increases the mean to around $55. This preset shows how many completed orders per arm you need to have 95% confidence and 80% power to detect that $5 shift in average order value.';
    scenario.descriptionHtml =
      '<p><strong>Question:</strong> Is a new upsell offer at checkout worth rolling out?</p>' +
      '<p>E‑commerce wants to test a new upsell offer (<strong>Group B</strong>) against the current checkout flow (<strong>Group A</strong>). Today the average order value is about <strong>$50</strong>, with order-to-order variability of roughly <strong>$15</strong>.</p>' +
      '<p>Product management is interested in rolling out the upsell if it increases the mean to around <strong>$55</strong>. This preset shows how many completed orders per arm you need to have <strong>95% confidence</strong> and <strong>80% power</strong> to detect that <strong>$5 shift</strong> in average order value.</p>';
  }
});

function hydrateTimestamps() {
  const created = document.getElementById('created-date');
  const modified = document.getElementById('modified-date');
  if (created) created.textContent = new Date(CREATED_DATE).toLocaleDateString();
  if (modified) modified.textContent = modifiedDate;
}

function getZQuantile(p) {
  if (window.StatsUtils && typeof window.StatsUtils.normInv === 'function') {
    return window.StatsUtils.normInv(p);
  }
  // Fallback: approximate a few common points
  if (Math.abs(p - 0.975) < 1e-3) return 1.96;
  if (Math.abs(p - 0.95) < 1e-3) return 1.645;
  if (Math.abs(p - 0.99) < 1e-3) return 2.326;
  return 1.96;
}

function getZAlpha(alpha, sidedness) {
  const a = typeof alpha === 'number' && isFinite(alpha) && alpha > 0 && alpha < 1 ? alpha : 0.05;
  const twoSided = sidedness !== 'one';
  const p = twoSided ? 1 - a / 2 : 1 - a;
  return getZQuantile(p);
}

function getZBeta(power) {
  const pow = typeof power === 'number' && isFinite(power) && power > 0 && power < 1 ? power : 0.8;
  return getZQuantile(pow);
}

function computeNMeansEqualVariance({
  mean1,
  mean2,
  sigma,
  alpha,
  power,
  sidedness,
  allocationRatio
}) {
  const delta = mean2 - mean1;
  const absDelta = Math.abs(delta);
  const s = Math.max(0, sigma);
  if (!absDelta || !s) return { n1: null, n2: null, nTotal: null };
  const zAlpha = getZAlpha(alpha, sidedness);
  const zBeta = getZBeta(power);
  const r = allocationRatio && isFinite(allocationRatio) && allocationRatio > 0 ? allocationRatio : 1;
  const factor = (1 + 1 / r); // variance scaling for unequal allocation
  const base = (zAlpha + zBeta) * s * Math.sqrt(factor) / absDelta;
  const n1 = Math.ceil(base * base);
  const n2 = Math.ceil(n1 * r);
  return { n1, n2, nTotal: n1 + n2 };
}

function computeNProportions({
  p1,
  p2,
  alpha,
  power,
  sidedness,
  allocationRatio
}) {
  const p1c = Math.min(0.999, Math.max(0.001, p1));
  const p2c = Math.min(0.999, Math.max(0.001, p2));
  const delta = p2c - p1c;
  const absDelta = Math.abs(delta);
  if (!absDelta) return { n1: null, n2: null, nTotal: null };
  const zAlpha = getZAlpha(alpha, sidedness);
  const zBeta = getZBeta(power);
  const r = allocationRatio && isFinite(allocationRatio) && allocationRatio > 0 ? allocationRatio : 1;

  const pbar = 0.5 * (p1c + p2c);
  const varH0 = 2 * pbar * (1 - pbar); // pooled under H0 for equal n
  const varAlt = p1c * (1 - p1c) + (p2c * (1 - p2c)) / r;
  const base = (zAlpha * Math.sqrt(varH0) + zBeta * Math.sqrt(varAlt)) / absDelta;
  const n1 = Math.ceil(base * base);
  const n2 = Math.ceil(n1 * r);
  return { n1, n2, nTotal: n1 + n2 };
}

function setMode(mode) {
  const nextMode = mode === OutcomeModes.MEAN ? OutcomeModes.MEAN : OutcomeModes.PROPORTION;
  SampleSizeABState.mode = nextMode;
  document.querySelectorAll('.mode-button').forEach(button => {
    const isActive = button.dataset.mode === nextMode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.mode-panel').forEach(panel => {
    const isActive = panel.dataset.mode === nextMode;
    panel.classList.toggle('active', isActive);
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
  updateDesign();
}

function setupModeToggle() {
  document.querySelectorAll('.mode-button').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      setMode(button.dataset.mode);
    });
  });
  setMode(SampleSizeABState.mode);
}

function reflectConfidenceButtons() {
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

function setupConfidenceAndPower() {
  const alphaInput = document.getElementById('alpha');
  const powerInput = document.getElementById('power');
  const sidednessSelect = document.getElementById('sidedness');

  document.querySelectorAll('.confidence-button').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      const level = parseFloat(btn.dataset.level);
      if (!isFinite(level) || level <= 0 || level >= 1) return;
      const alpha = 1 - level;
      SampleSizeABState.alpha = alpha;
      if (alphaInput) alphaInput.value = alpha.toFixed(3);
      reflectConfidenceButtons();
      updateDesign();
    });
  });

  if (alphaInput) {
    alphaInput.addEventListener('input', () => {
      const val = parseFloat(alphaInput.value);
      if (isFinite(val) && val > 0 && val < 1) {
        SampleSizeABState.alpha = val;
      }
      reflectConfidenceButtons();
      updateDesign();
    });
  }

  if (powerInput) {
    powerInput.addEventListener('input', () => {
      const val = parseFloat(powerInput.value);
      if (isFinite(val) && val > 0.5 && val < 0.99) {
        SampleSizeABState.power = val;
        updateDesign();
      }
    });
  }

  if (sidednessSelect) {
    sidednessSelect.addEventListener('change', () => {
      const value = sidednessSelect.value === 'one' ? 'one' : 'two';
      SampleSizeABState.sidedness = value;
      updateDesign();
    });
  }

  reflectConfidenceButtons();
}

function setupInputs() {
  const p1Range = document.getElementById('p1-range');
  const p1Input = document.getElementById('p1-input');
  const p2Range = document.getElementById('p2-range');
  const p2Input = document.getElementById('p2-input');
  const mean1Input = document.getElementById('mean1-input');
  const mean2Input = document.getElementById('mean2-input');
  const sigmaInput = document.getElementById('mean-sigma-input');
  const rangeMinInput = document.getElementById('mean-range-min');
  const rangeMaxInput = document.getElementById('mean-range-max');
  const rangeBtn = document.getElementById('mean-range-estimate-btn');
  const allocSelect = document.getElementById('allocation-ratio');

  if (p1Range && p1Input) {
    const sync = source => {
      const val = parseFloat(source.value);
      const clamped = isFinite(val) ? Math.min(1, Math.max(0, val)) : 0.2;
      SampleSizeABState.p1 = clamped;
      p1Range.value = clamped.toString();
      p1Input.value = clamped.toFixed(2);
      updateDesign();
    };
    p1Range.addEventListener('input', () => sync(p1Range));
    p1Input.addEventListener('input', () => sync(p1Input));
  }

  if (p2Range && p2Input) {
    const sync = source => {
      const val = parseFloat(source.value);
      const clamped = isFinite(val) ? Math.min(1, Math.max(0, val)) : 0.25;
      SampleSizeABState.p2 = clamped;
      p2Range.value = clamped.toString();
      p2Input.value = clamped.toFixed(2);
      updateDesign();
    };
    p2Range.addEventListener('input', () => sync(p2Range));
    p2Input.addEventListener('input', () => sync(p2Input));
  }

  if (mean1Input) {
    mean1Input.addEventListener('input', () => {
      const val = parseFloat(mean1Input.value);
      SampleSizeABState.mean1 = isFinite(val) ? val : 50;
      updateDesign();
    });
  }

  if (mean2Input) {
    mean2Input.addEventListener('input', () => {
      const val = parseFloat(mean2Input.value);
      SampleSizeABState.mean2 = isFinite(val) ? val : 55;
      updateDesign();
    });
  }

  if (sigmaInput) {
    sigmaInput.addEventListener('input', () => {
      const val = parseFloat(sigmaInput.value);
      SampleSizeABState.sigma = isFinite(val) && val >= 0 ? val : 15;
      updateDesign();
    });
  }

  if (rangeBtn && rangeMinInput && rangeMaxInput && sigmaInput) {
    rangeBtn.addEventListener('click', () => {
      const minVal = parseFloat(rangeMinInput.value);
      const maxVal = parseFloat(rangeMaxInput.value);
      if (!isFinite(minVal) || !isFinite(maxVal) || maxVal <= minVal) return;
      const estSigma = (maxVal - minVal) / 4;
      if (!isFinite(estSigma) || estSigma <= 0) return;
      SampleSizeABState.sigma = estSigma;
      sigmaInput.value = estSigma.toFixed(3);
      updateDesign();
    });
  }

  if (allocSelect) {
    allocSelect.addEventListener('change', () => {
      const r = parseFloat(allocSelect.value);
      SampleSizeABState.allocationRatio = isFinite(r) && r > 0 ? r : 1;
      updateDesign();
    });
  }
}

function formatNumber(value, digits = 0) {
  if (!isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function updateMetrics() {
  const n1El = document.getElementById('metric-n1');
  const n2El = document.getElementById('metric-n2');
  const nTotEl = document.getElementById('metric-ntotal');
  const modeEl = document.getElementById('metric-mode');
  const testEl = document.getElementById('metric-test');

  if (n1El) n1El.textContent = SampleSizeABState.n1 ? formatNumber(SampleSizeABState.n1, 0) : '—';
  if (n2El) n2El.textContent = SampleSizeABState.n2 ? formatNumber(SampleSizeABState.n2, 0) : '—';
  if (nTotEl) nTotEl.textContent = SampleSizeABState.nTotal ? formatNumber(SampleSizeABState.nTotal, 0) : '—';

  if (modeEl) {
    modeEl.textContent =
      SampleSizeABState.mode === OutcomeModes.MEAN
        ? 'Two means (independent samples t-test approximation)'
        : 'Two proportions (independent samples z-test approximation)';
  }

  if (testEl) {
    const confPct = (1 - SampleSizeABState.alpha) * 100;
    const powerPct = (SampleSizeABState.power * 100).toFixed(1);
    const sided = SampleSizeABState.sidedness === 'one' ? 'one-sided' : 'two-sided';
    testEl.textContent = `${confPct.toFixed(1)}% confidence, ${powerPct}% power, ${sided} test`;
  }
}

  function updateNarratives() {
  const apaEl = document.getElementById('apa-report');
  const mgrEl = document.getElementById('managerial-report');
  const { n1, n2, nTotal } = SampleSizeABState;
  if (!n1 || !n2 || !nTotal || !isFinite(n1) || !isFinite(n2)) {
    if (apaEl) {
      apaEl.textContent =
        'Provide baseline values, effect size, confidence, power, and allocation ratio to generate a planning statement.';
    }
    if (mgrEl) {
      mgrEl.textContent =
        'Once you specify both groups, their expected values, and the design settings, this panel will summarize how many observations you need in each arm and why.';
    }
    return;
  }

  const n1Label = formatNumber(n1, 0);
  const n2Label = formatNumber(n2, 0);
  const nTotalLabel = formatNumber(nTotal, 0);
  const confPct = ((SampleSizeABState.sidedness === 'two' ? 1 - SampleSizeABState.alpha : 1 - SampleSizeABState.alpha) *
    100
  ).toFixed(1);
  const powerPct = (SampleSizeABState.power * 100).toFixed(1);
  const sided = SampleSizeABState.sidedness === 'one' ? 'one-sided' : 'two-sided';

  if (SampleSizeABState.mode === OutcomeModes.MEAN) {
    const delta = SampleSizeABState.mean2 - SampleSizeABState.mean1;
    const absDelta = Math.abs(delta);
    const apaText =
      `To detect a mean difference of Δ = ${absDelta.toFixed(2)} (Group B vs. Group A) with ` +
      `${confPct}% confidence and ${powerPct}% power using a ${sided} independent-samples test, ` +
      `assuming a common standard deviation of σ = ${SampleSizeABState.sigma.toFixed(2)}, ` +
      `you need at least n = ${n1Label} observations in Group A and n = ${n2Label} in Group B (total N = ${nTotalLabel}).`;
    if (apaEl) apaEl.textContent = apaText;

    const mgrText =
      `Under these assumptions, you should plan for about ${n1Label} customers in your control group and ` +
      `${n2Label} in your treatment group, for a total of ${nTotalLabel}. This gives roughly ${powerPct}% power ` +
      `to detect a shift of about ${absDelta.toFixed(2)} units in the average outcome, at ${confPct}% confidence.`;
    if (mgrEl) mgrEl.textContent = mgrText;
    } else {
      const delta = SampleSizeABState.p2 - SampleSizeABState.p1;
    const absDeltaPct = (Math.abs(delta) * 100).toFixed(1);
    const p1Pct = (SampleSizeABState.p1 * 100).toFixed(1);
    const p2Pct = (SampleSizeABState.p2 * 100).toFixed(1);
    const apaText =
      `To detect a difference in proportions of about ${absDeltaPct} percentage points (from ${p1Pct}% to ${p2Pct}%) ` +
      `with ${confPct}% confidence and ${powerPct}% power using a ${sided} independent-samples test, ` +
      `you need at least n = ${n1Label} observations in Group A and n = ${n2Label} in Group B (total N = ${nTotalLabel}).`;
    if (apaEl) apaEl.textContent = apaText;

    const mgrText =
      `At these settings, you would plan for about ${n1Label} users in the control experience and ${n2Label} users ` +
      `in the variant, for a total of ${nTotalLabel}. This gives around ${powerPct}% power to pick up a ` +
      `${absDeltaPct} percentage-point lift from approximately ${p1Pct}% to ${p2Pct}% at ${confPct}% confidence.`;
      if (mgrEl) mgrEl.textContent = mgrText;
    }
  }

  function updateExplainers() {
    const confSpan = document.getElementById('confidence-explainer-text');
    const powerSpan = document.getElementById('power-explainer-text');

    const alpha = SampleSizeABState.alpha;
    const power = SampleSizeABState.power;
    const confLevel = 1 - alpha;
    const confPct = (confLevel * 100).toFixed(1);
    const alphaPct = (alpha * 100).toFixed(1);

    if (confSpan) {
      confSpan.textContent =
        `With a ${confPct}% confidence level (alpha = ${alphaPct}%), if you could repeat this same A/B test many times, about ${confPct}% of the confidence intervals built this way would contain the true effect. ` +
        `In the remaining ${alphaPct}% of cases you would see results that look like a win or loss purely from random noise.`;
    }

    if (powerSpan) {
      const powerPct = (power * 100).toFixed(1);
      if (SampleSizeABState.mode === OutcomeModes.MEAN) {
        const m1 = SampleSizeABState.mean1;
        const m2 = SampleSizeABState.mean2;
        if (isFinite(m1) && isFinite(m2)) {
          const diff = m2 - m1;
          const direction = diff >= 0 ? 'increase' : 'decrease';
          const absDiff = Math.abs(diff).toFixed(2);
          powerSpan.textContent =
            `At ${powerPct}% power, if the true average outcome really ${direction}s from ${m1.toFixed(
              2
            )} to ${m2.toFixed(2)} (a change of about ${absDiff} units), a study of this size would detect that shift (reject the null hypothesis) in roughly ${powerPct} out of 100 similar experiments. ` +
            `In the remaining ${(100 - powerPct).toFixed(1)} out of 100 runs, random noise would hide a real change even though it exists.`;
          return;
        }
      } else {
        const p1 = SampleSizeABState.p1;
        const p2 = SampleSizeABState.p2;
        if (isFinite(p1) && isFinite(p2)) {
          const diff = p2 - p1;
          const direction = diff >= 0 ? 'lift' : 'drop';
          const p1Pct = (p1 * 100).toFixed(1);
          const p2Pct = (p2 * 100).toFixed(1);
          const absDiffPct = (Math.abs(diff) * 100).toFixed(1);
          powerSpan.textContent =
            `At ${powerPct}% power, if the true conversion rate really moves from ${p1Pct}% to ${p2Pct}% (a ${absDiffPct} percentage-point ${direction}), a study of this size would detect that change (reject the null hypothesis) in roughly ${powerPct} out of 100 similar experiments. ` +
            `In the remaining ${(100 - powerPct).toFixed(1)} out of 100 runs, random noise would hide a real lift or drop even though it is there.`;
          return;
        }
      }

      powerSpan.textContent =
        'Power is the probability that your test will detect the effect you have entered above if it is really present in the population. Higher power reduces the risk of a false negative (missing a true effect) but requires more observations.';
    }
  }

function buildEffectCurve() {
  const points = [];
  const steps = 25;
  if (SampleSizeABState.mode === OutcomeModes.MEAN) {
    const baseDelta = Math.abs(SampleSizeABState.mean2 - SampleSizeABState.mean1) || 1;
    const minDelta = baseDelta * 0.25;
    const maxDelta = baseDelta * 2;
    for (let i = 0; i <= steps; i++) {
      const d = minDelta + (i * (maxDelta - minDelta)) / steps;
      const mean2 = SampleSizeABState.mean1 + d * Math.sign(SampleSizeABState.mean2 - SampleSizeABState.mean1 || 1);
      const { nTotal } = computeNMeansEqualVariance({
        mean1: SampleSizeABState.mean1,
        mean2,
        sigma: SampleSizeABState.sigma,
        alpha: SampleSizeABState.alpha,
        power: SampleSizeABState.power,
        sidedness: SampleSizeABState.sidedness,
        allocationRatio: SampleSizeABState.allocationRatio
      });
      if (nTotal && isFinite(nTotal)) points.push({ x: d, n: nTotal });
    }
  } else {
    const baseDelta = Math.abs(SampleSizeABState.p2 - SampleSizeABState.p1) || 0.05;
    const minDelta = Math.max(baseDelta * 0.25, 0.005);
    const maxDelta = Math.min(baseDelta * 2, 0.4);
    const sign = SampleSizeABState.p2 >= SampleSizeABState.p1 ? 1 : -1;
    for (let i = 0; i <= steps; i++) {
      const d = minDelta + (i * (maxDelta - minDelta)) / steps;
      const p2 = SampleSizeABState.p1 + sign * d;
      const { nTotal } = computeNProportions({
        p1: SampleSizeABState.p1,
        p2,
        alpha: SampleSizeABState.alpha,
        power: SampleSizeABState.power,
        sidedness: SampleSizeABState.sidedness,
        allocationRatio: SampleSizeABState.allocationRatio
      });
      if (nTotal && isFinite(nTotal)) points.push({ x: d, n: nTotal });
    }
  }

  function updatePowerExplainer() {
    const span = document.getElementById('power-explainer-text');
    if (!span) return;

    const powerPct = (SampleSizeABState.power * 100).toFixed(1);

    if (SampleSizeABState.mode === OutcomeModes.MEAN) {
      const m1 = SampleSizeABState.mean1;
      const m2 = SampleSizeABState.mean2;
      if (isFinite(m1) && isFinite(m2)) {
        const diff = m2 - m1;
        const direction = diff >= 0 ? 'increase' : 'decrease';
        const absDiff = Math.abs(diff).toFixed(2);
        span.textContent =
          `With ${powerPct}% power, if the true average really ${direction}s from ${m1.toFixed(2)} to ${m2.toFixed(
            2
          )} (a change of about ${absDiff} units), a study of this size would detect that shift in roughly ${powerPct} out of ` +
          `100 similar experiments; in the rest, random noise would hide it even though the effect is real. Higher power makes it ` +
          `less likely to miss a real change, but requires more observations.`;
        return;
      }
    } else {
      const p1 = SampleSizeABState.p1;
      const p2 = SampleSizeABState.p2;
      if (isFinite(p1) && isFinite(p2)) {
        const diff = p2 - p1;
        const direction = diff >= 0 ? 'lift' : 'drop';
        const p1Pct = (p1 * 100).toFixed(1);
        const p2Pct = (p2 * 100).toFixed(1);
        const absDiffPct = (Math.abs(diff) * 100).toFixed(1);
        span.textContent =
          `With ${powerPct}% power, if the true conversion rate really moves from ${p1Pct}% to ${p2Pct}% ` +
          `(a ${absDiffPct} percentage-point ${direction}), a study of this size would detect that change in roughly ${powerPct} ` +
          `out of 100 similar experiments; in the rest, random noise would hide it. Higher power makes it less likely to miss a real ` +
          `lift or drop, but requires more traffic.`;
        return;
      }
    }

    span.textContent =
      'Power is the probability that your test will detect the effect you have entered above if it is really present in the population. ' +
      'Higher power reduces the risk of a false negative (missing a true effect) but requires more observations.';
  }
  return points;
}

function buildVariabilityCurve() {
  const points = [];
  const steps = 25;
  if (SampleSizeABState.mode === OutcomeModes.MEAN) {
    const baseSigma = SampleSizeABState.sigma || 10;
    const minS = Math.max(baseSigma * 0.25, 0.01);
    const maxS = baseSigma * 2;
    for (let i = 0; i <= steps; i++) {
      const s = minS + (i * (maxS - minS)) / steps;
      const { nTotal } = computeNMeansEqualVariance({
        mean1: SampleSizeABState.mean1,
        mean2: SampleSizeABState.mean2,
        sigma: s,
        alpha: SampleSizeABState.alpha,
        power: SampleSizeABState.power,
        sidedness: SampleSizeABState.sidedness,
        allocationRatio: SampleSizeABState.allocationRatio
      });
      if (nTotal && isFinite(nTotal)) points.push({ x: s, n: nTotal });
    }
  } else {
    const baseDelta = SampleSizeABState.p2 - SampleSizeABState.p1;
    const absDelta = Math.abs(baseDelta) || 0.05;
    const stepsP = 25;
    for (let i = 0; i <= stepsP; i++) {
      const p1 = 0.02 + (i * (0.98 - 0.02)) / stepsP;
      const p2 = p1 + (baseDelta >= 0 ? absDelta : -absDelta);
      if (p2 <= 0 || p2 >= 1) continue;
      const { nTotal } = computeNProportions({
        p1,
        p2,
        alpha: SampleSizeABState.alpha,
        power: SampleSizeABState.power,
        sidedness: SampleSizeABState.sidedness,
        allocationRatio: SampleSizeABState.allocationRatio
      });
      if (nTotal && isFinite(nTotal)) points.push({ x: p1, n: nTotal });
    }
  }
  return points;
}

function buildPowerCurve() {
  const points = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const pow = 0.6 + (i * (0.99 - 0.6)) / steps;
    let nTotal;
    if (SampleSizeABState.mode === OutcomeModes.MEAN) {
      nTotal = computeNMeansEqualVariance({
        mean1: SampleSizeABState.mean1,
        mean2: SampleSizeABState.mean2,
        sigma: SampleSizeABState.sigma,
        alpha: SampleSizeABState.alpha,
        power: pow,
        sidedness: SampleSizeABState.sidedness,
        allocationRatio: SampleSizeABState.allocationRatio
      }).nTotal;
    } else {
      nTotal = computeNProportions({
        p1: SampleSizeABState.p1,
        p2: SampleSizeABState.p2,
        alpha: SampleSizeABState.alpha,
        power: pow,
        sidedness: SampleSizeABState.sidedness,
        allocationRatio: SampleSizeABState.allocationRatio
      }).nTotal;
    }
    if (nTotal && isFinite(nTotal)) points.push({ x: pow, n: nTotal });
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
    hovertemplate:
      SampleSizeABState.mode === OutcomeModes.MEAN
        ? '|Δ mean|: %{x:.2f}<br>Total N: %{y:.0f}<extra></extra>'
        : '|Δ proportion|: %{x:.3f}<br>Total N: %{y:.0f}<extra></extra>'
  };

  const xTitle =
    SampleSizeABState.mode === OutcomeModes.MEAN
      ? 'Absolute difference in means |μ₂ - μ₁|'
      : 'Absolute difference in proportions |p₂ - p₁|';

  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 20, r: 20, b: 60, l: 70 },
      xaxis: { title: xTitle },
      yaxis: { title: 'Required total sample size N', rangemode: 'tozero' },
      showlegend: false
    },
    { responsive: true }
  );
}

function renderVariabilityChart() {
  const container = document.getElementById('chart-variability');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildVariabilityCurve();
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
    line: { color: '#059669' },
    marker: { size: 6 },
    hovertemplate:
      SampleSizeABState.mode === OutcomeModes.MEAN
        ? 'Assumed σ: %{x:.2f}<br>Total N: %{y:.0f}<extra></extra>'
        : 'Baseline p₁: %{x:.2f}<br>Total N: %{y:.0f}<extra></extra>'
  };

  const xTitle =
    SampleSizeABState.mode === OutcomeModes.MEAN
      ? 'Assumed common standard deviation σ'
      : 'Baseline proportion p₁';

  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 20, r: 20, b: 60, l: 70 },
      xaxis: { title: xTitle },
      yaxis: { title: 'Required total sample size N', rangemode: 'tozero' },
      showlegend: false
    },
    { responsive: true }
  );
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

  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 20, r: 20, b: 60, l: 70 },
      xaxis: { title: 'Desired power', tickformat: '.2f' },
      yaxis: { title: 'Required total sample size N', rangemode: 'tozero' },
      showlegend: false
    },
    { responsive: true }
  );
}

// Highlight current settings on the effect-size chart
function highlightCurrentOnEffectChart() {
  const container = document.getElementById('chart-effect');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildEffectCurve();
  if (!points || !points.length) return;

  const currentDelta =
    SampleSizeABState.mode === OutcomeModes.MEAN
      ? Math.abs(SampleSizeABState.mean2 - SampleSizeABState.mean1)
      : Math.abs(SampleSizeABState.p2 - SampleSizeABState.p1);

  const currentIndex = points.reduce(
    (bestIdx, p, idx) =>
      Math.abs(p.x - currentDelta) < Math.abs(points[bestIdx].x - currentDelta) ? idx : bestIdx,
    0
  );
  const p = points[currentIndex];

  const hovertemplate =
    SampleSizeABState.mode === OutcomeModes.MEAN
      ? 'Current design<br>|Δ mean|: %{x:.2f}<br>Total N: %{y:.0f}<extra></extra>'
      : 'Current design<br>|Δ proportion|: %{x:.3f}<br>Total N: %{y:.0f}<extra></extra>';

  Plotly.addTraces(container, {
    x: [p.x],
    y: [p.n],
    type: 'scatter',
    mode: 'markers',
    marker: { color: '#dc2626', size: 14 },
    hovertemplate
  });
}

// Highlight current settings on the variability chart
function highlightCurrentOnVariabilityChart() {
  const container = document.getElementById('chart-variability');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildVariabilityCurve();
  if (!points || !points.length) return;

  const currentX =
    SampleSizeABState.mode === OutcomeModes.MEAN
      ? SampleSizeABState.sigma
      : SampleSizeABState.p1;

  const currentIndex = points.reduce(
    (bestIdx, p, idx) =>
      Math.abs(p.x - currentX) < Math.abs(points[bestIdx].x - currentX) ? idx : bestIdx,
    0
  );
  const p = points[currentIndex];

  const hovertemplate =
    SampleSizeABState.mode === OutcomeModes.MEAN
      ? 'Current design<br>Assumed σ: %{x:.2f}<br>Total N: %{y:.0f}<extra></extra>'
      : 'Current design<br>Baseline p₁: %{x:.2f}<br>Total N: %{y:.0f}<extra></extra>';

  Plotly.addTraces(container, {
    x: [p.x],
    y: [p.n],
    type: 'scatter',
    mode: 'markers',
    marker: { color: '#dc2626', size: 14 },
    hovertemplate
  });
}

// Highlight current settings on the power chart
function highlightCurrentOnPowerChart() {
  const container = document.getElementById('chart-power');
  if (!container || typeof Plotly === 'undefined') return;
  const points = buildPowerCurve();
  if (!points || !points.length) return;

  const currentPower = SampleSizeABState.power;
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

  function updateDesign() {
  let result;
  if (SampleSizeABState.mode === OutcomeModes.MEAN) {
    result = computeNMeansEqualVariance({
      mean1: SampleSizeABState.mean1,
      mean2: SampleSizeABState.mean2,
      sigma: SampleSizeABState.sigma,
      alpha: SampleSizeABState.alpha,
      power: SampleSizeABState.power,
      sidedness: SampleSizeABState.sidedness,
      allocationRatio: SampleSizeABState.allocationRatio
    });
  } else {
    result = computeNProportions({
      p1: SampleSizeABState.p1,
      p2: SampleSizeABState.p2,
      alpha: SampleSizeABState.alpha,
      power: SampleSizeABState.power,
      sidedness: SampleSizeABState.sidedness,
      allocationRatio: SampleSizeABState.allocationRatio
    });
  }
  SampleSizeABState.n1 = result.n1;
    SampleSizeABState.n2 = result.n2;
    SampleSizeABState.nTotal = result.nTotal;

    updateMetrics();
    updateNarratives();
    updateExplainers();
    renderEffectChart();
    renderVariabilityChart();
    renderPowerChart();
    highlightCurrentOnEffectChart();
    highlightCurrentOnVariabilityChart();
    highlightCurrentOnPowerChart();

    hasSuccessfulRun = true;
    checkAndTrackUsage();
  }

function updateScenarioDownload(dataset) {
  const btn = document.getElementById('scenario-download');
  if (!btn) return;
  if (!dataset) {
    btn.classList.add('hidden');
    btn.disabled = true;
    btn.dataset.filename = '';
    btn.dataset.content = '';
    return;
  }
  btn.classList.remove('hidden');
  btn.disabled = false;
  btn.dataset.filename = dataset.filename;
  btn.dataset.content = dataset.content;
}

function setupScenarioDownload() {
  const btn = document.getElementById('scenario-download');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const filename = btn.dataset.filename || 'scenario_notes.txt';
    const content =
      btn.dataset.content ||
      'This is a placeholder scenario notes file. You can attach more detailed planning notes or pilot summaries here.';
    if (typeof downloadTextFile === 'function') {
      downloadTextFile(filename, content, { mimeType: 'text/plain' });
    }
  });
}

function setupScenarioSelect() {
  const select = document.getElementById('scenario-select');
  const desc = document.getElementById('scenario-description');
  if (!select || !desc) return;

  ABScenarios.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
      const scenario = ABScenarios.find(s => s.id === select.value);
      if (!scenario) {
        desc.innerHTML =
          '<p>Use presets to explore common A/B questions, or leave this on Manual to configure your own design.</p>';
        updateScenarioDownload(null);
        return;
    }

    if (scenario.mode === OutcomeModes.MEAN) {
      setMode(OutcomeModes.MEAN);
      if (typeof scenario.settings.mean1 === 'number') {
        SampleSizeABState.mean1 = scenario.settings.mean1;
        const input = document.getElementById('mean1-input');
        if (input) input.value = scenario.settings.mean1;
      }
      if (typeof scenario.settings.mean2 === 'number') {
        SampleSizeABState.mean2 = scenario.settings.mean2;
        const input = document.getElementById('mean2-input');
        if (input) input.value = scenario.settings.mean2;
      }
      if (typeof scenario.settings.sigma === 'number') {
        SampleSizeABState.sigma = scenario.settings.sigma;
        const input = document.getElementById('mean-sigma-input');
        if (input) input.value = scenario.settings.sigma;
      }
    } else {
      setMode(OutcomeModes.PROPORTION);
      if (typeof scenario.settings.p1 === 'number') {
        SampleSizeABState.p1 = scenario.settings.p1;
        const r = document.getElementById('p1-range');
        const t = document.getElementById('p1-input');
        if (r) r.value = scenario.settings.p1.toString();
        if (t) t.value = scenario.settings.p1.toFixed(2);
      }
      if (typeof scenario.settings.p2 === 'number') {
        SampleSizeABState.p2 = scenario.settings.p2;
        const r = document.getElementById('p2-range');
        const t = document.getElementById('p2-input');
        if (r) r.value = scenario.settings.p2.toString();
        if (t) t.value = scenario.settings.p2.toFixed(2);
      }
    }

    if (typeof scenario.settings.alpha === 'number') {
      SampleSizeABState.alpha = scenario.settings.alpha;
      const alphaInput = document.getElementById('alpha');
      if (alphaInput) alphaInput.value = scenario.settings.alpha.toFixed(3);
    }
    if (typeof scenario.settings.power === 'number') {
      SampleSizeABState.power = scenario.settings.power;
      const powerInput = document.getElementById('power');
      if (powerInput) powerInput.value = scenario.settings.power.toFixed(2);
    }
    if (scenario.settings.sidedness === 'one' || scenario.settings.sidedness === 'two') {
      SampleSizeABState.sidedness = scenario.settings.sidedness;
      const sel = document.getElementById('sidedness');
      if (sel) sel.value = scenario.settings.sidedness;
    }
    if (typeof scenario.settings.allocationRatio === 'number') {
      SampleSizeABState.allocationRatio = scenario.settings.allocationRatio;
      const sel = document.getElementById('allocation-ratio');
      if (sel) sel.value = scenario.settings.allocationRatio.toString();
    }

    desc.innerHTML = scenario.descriptionHtml || `<p>${scenario.description}</p>`;
    updateScenarioDownload({
      filename: `${scenario.id}_notes.txt`,
      content: scenario.description
    });
    reflectConfidenceButtons();
    updateDesign();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  hydrateTimestamps();
  setupModeToggle();
  setupConfidenceAndPower();
  setupInputs();
  setupScenarioSelect();
  setupScenarioDownload();
  updateDesign();
});
