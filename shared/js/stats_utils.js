(function (global) {
  'use strict';

  /**
   * Calculates the mean of an array of numbers.
   * @param {number[]} values - Array of numbers.
   * @returns {number} The mean, or NaN if the array is empty.
   */
  function mean(values) {
    if (!values.length) return NaN;
    const sum = values.reduce((acc, v) => acc + v, 0);
    return sum / values.length;
  }

  /**
   * Calculates the sample variance of an array of numbers.
   * @param {number[]} values - Array of numbers.
   * @returns {number} The variance, or NaN if less than 2 values.
   */
  function variance(values) {
    if (values.length < 2) return NaN;
    const m = mean(values);
    const ss = values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0);
    return ss / (values.length - 1);
  }

  /**
   * Calculates the sample standard deviation.
   * @param {number[]} values - Array of numbers.
   * @returns {number} The standard deviation.
   */
  function standardDeviation(values) {
    const v = variance(values);
    return Number.isFinite(v) ? Math.sqrt(v) : NaN;
  }

  /**
   * Error function (erf) approximation.
   * @param {number} x - The input value.
   * @returns {number} The result of erf(x).
   */
  function erf(x) {
    // Abramowitz & Stegun approximation
    const sign = Math.sign(x);
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
    return sign * y;
  }

  /**
   * Cumulative distribution function for the standard normal distribution.
   * @param {number} z - The z-score.
   * @returns {number} The probability P(Z <= z).
   */
  function normCdf(z) {
    return 0.5 * (1 + erf(z / Math.SQRT2));
  }

  /**
   * Inverse of the standard normal cumulative distribution function (quantile function).
   * @param {number} p - The probability (must be between 0 and 1).
   * @returns {number} The z-score for the given probability.
   */
  function normInv(p) {
    // Approximate inverse normal CDF
    if (p <= 0 || p >= 1) return NaN;
    const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
    const a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
    const b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
    const b4 = 66.8013118877197, b5 = -13.2806815528857;
    const c1 = -0.00778489400243029, c2 = -0.322396458041136, c3 = -2.40075827716184;
    const c4 = -2.54973253934373, c5 = 4.37466414146497, c6 = 2.93816398269878;
    const d1 = 0.00778469570904146, d2 = 0.32246712907004, d3 = 2.445134137143, d4 = 3.75440866190742;
    const pLow = 0.02425, pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
    if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }

  /**
   * Build a short HTML snippet describing optimizer / estimation details.
   * The caller passes what it knows; fields may be omitted.
   *
   * @param {Object} info
   * @param {string} info.engine - e.g., 'gradient_ascent' or 'irls'.
   * @param {number} [info.iterations]
   * @param {number} [info.maxIter]
   * @param {number} [info.stepSize]
   * @param {number} [info.tol]
   * @param {number} [info.momentum]
   * @param {number} [info.lastMaxChange]
   * @param {number[]} [info.logLikChanges]
   * @returns {string} HTML string.
   */
  function buildEstimationDetailsHtml(info) {
    if (!info || typeof info !== 'object') {
      return '';
    }
    const engine = info.engine || 'optimizer';
    const iterations = Number.isFinite(info.iterations) ? info.iterations : null;
    const maxIter = Number.isFinite(info.maxIter) ? info.maxIter : null;
    const stepSize = Number.isFinite(info.stepSize) ? info.stepSize : null;
    const tol = Number.isFinite(info.tol) ? info.tol : null;
    const momentum = Number.isFinite(info.momentum) ? info.momentum : null;
    const lastMaxChange =
      typeof info.lastMaxChange === 'number' && Number.isFinite(info.lastMaxChange)
        ? info.lastMaxChange
        : null;

    const reachedMaxIter = iterations !== null && maxIter !== null && iterations >= maxIter;
    const flagNotFullyConverged =
      reachedMaxIter && (lastMaxChange === null || lastMaxChange > 0.01);

    let engineLabel = 'the optimization routine';
    if (engine === 'gradient_ascent') {
      engineLabel = 'simple gradient ascent on the penalized log-likelihood';
    } else if (engine === 'irls') {
      engineLabel = 'iteratively reweighted least squares (IRLS) for logistic regression';
    }

    let parts = [];
    parts.push(
      `<strong>Estimation details:</strong> Fitted using ${engineLabel}` +
        (momentum ? ` with momentum = ${momentum.toFixed(2)}` : '') +
        '.'
    );
    if (iterations !== null) {
      parts.push(
        ` Convergence ${flagNotFullyConverged ? 'may not have been fully achieved' : 'was effectively reached'}` +
          ` in ${iterations} iteration(s)` +
          (maxIter !== null ? ` (max ${maxIter})` : '') +
          (stepSize !== null ? `, step size = ${stepSize}` : '') +
          (tol !== null ? `, tolerance = ${tol}` : '') +
          '.'
      );
    }

    const changes = Array.isArray(info.logLikChanges) ? info.logLikChanges : null;
    let changesHtml = '';
    if (changes && changes.length) {
      changesHtml += `<p><strong>Last ${changes.length} log-likelihood changes before end/convergence:</strong></p><ul>`;
      changes.forEach((v, idx) => {
        const label = `ΔLL[${idx + 1}]`;
        const val = Number.isFinite(v) ? v.toExponential(3) : 'n/a';
        changesHtml += `<li>${label} = ${val}</li>`;
      });
      changesHtml += '</ul>';
    }

    return `<p>${parts.join(' ')}</p>${changesHtml}`;
  }

  // Expose the functions on a single global object
  global.StatsUtils = {
    mean,
    variance,
    standardDeviation,
    erf,
    normCdf,
    normInv,
    buildEstimationDetailsHtml
  };

})(window);
