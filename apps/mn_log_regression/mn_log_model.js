(function (global) {
  function softmaxScores(scores) {
    const maxScore = Math.max.apply(null, scores);
    const exps = scores.map(s => Math.exp(s - maxScore));
    const sumExp = exps.reduce((acc, v) => acc + v, 0);
    return exps.map(v => v / (sumExp || 1));
  }

  /**
   * Fit a baseline-category multinomial logistic regression using simple gradient ascent.
   *
   * @param {object} params
   * @param {number[][]} params.X - Design matrix (n x p), including intercept.
   * @param {number[]} params.y   - Class indices 0..K-1 for each row.
   * @param {string[]} params.classLabels - Labels for each class index.
   * @param {number} params.referenceIndex - Index of the reference (baseline) class.
   * @param {number} [params.maxIter=200]
   * @param {number} [params.stepSize=0.1]
   * @param {number} [params.l2=1e-4] - L2 penalty on non-intercept coefficients.
   * @param {number} [params.tol=1e-5] - Convergence tolerance on parameter change.
   * @returns {{coefficients: number[][], classLabels: string[], referenceIndex: number}}
   */
  function fit(params) {
    const X = params.X || [];
    const y = params.y || [];
    const classLabels = params.classLabels || [];
    const refIndex = typeof params.referenceIndex === 'number' ? params.referenceIndex : 0;
    const maxIter = params.maxIter || 200;
    const stepSize = params.stepSize || 0.1;
    const l2 = params.l2 != null ? params.l2 : 1e-4;
    const tol = params.tol || 1e-5;

    const n = X.length;
    const p = n ? X[0].length : 0;
    const K = classLabels.length || (Math.max.apply(null, y) + 1);
    if (!n || !p || !K) {
      return { coefficients: [], classLabels, referenceIndex: refIndex };
    }

    // Initialize coefficients: K x p, all zeros. Reference class remains zeros.
    const beta = Array.from({ length: K }, () => new Array(p).fill(0));

    for (let iter = 0; iter < maxIter; iter++) {
      // Gradient for each class k and parameter j
      const grad = Array.from({ length: K }, () => new Array(p).fill(0));

      for (let i = 0; i < n; i++) {
        const xi = X[i];
        const yi = y[i];
        if (!Array.isArray(xi) || xi.length !== p) continue;

        // Compute scores for each class
        const scores = [];
        for (let k = 0; k < K; k++) {
          let s = 0;
          if (k !== refIndex) {
            const bk = beta[k];
            for (let j = 0; j < p; j++) {
              s += bk[j] * xi[j];
            }
          }
          scores.push(s);
        }
        const probs = softmaxScores(scores);

        for (let k = 0; k < K; k++) {
          if (k === refIndex) continue; // baseline coefficients fixed at zero
          const indicator = yi === k ? 1 : 0;
          const diff = indicator - probs[k];
          const gk = grad[k];
          for (let j = 0; j < p; j++) {
            gk[j] += diff * xi[j];
          }
        }
      }

      // Apply L2 penalty (except intercept column j = 0)
      for (let k = 0; k < K; k++) {
        if (k === refIndex) continue;
        const bk = beta[k];
        const gk = grad[k];
        for (let j = 1; j < p; j++) {
          gk[j] -= 2 * l2 * bk[j];
        }
      }

      // Gradient ascent update
      let maxChange = 0;
      for (let k = 0; k < K; k++) {
        if (k === refIndex) continue;
        const bk = beta[k];
        const gk = grad[k];
        for (let j = 0; j < p; j++) {
          const delta = (stepSize / n) * gk[j];
          bk[j] += delta;
          const absDelta = Math.abs(delta);
          if (absDelta > maxChange) maxChange = absDelta;
        }
      }

      if (maxChange < tol) {
        break;
      }
    }

    return {
      coefficients: beta,
      classLabels,
      referenceIndex: refIndex
    };
  }

  /**
   * Predict class probabilities for new observations given fitted coefficients.
   *
   * @param {object} params
   * @param {number[][]} params.X - Design matrix (n x p).
   * @param {number[][]} params.coefficients - Coefficients (K x p).
   * @param {number} params.referenceIndex - Reference class index.
   * @returns {number[][]} Probabilities (n x K).
   */
  function predict(params) {
    const X = params.X || [];
    const beta = params.coefficients || [];
    const refIndex = typeof params.referenceIndex === 'number' ? params.referenceIndex : 0;
    const n = X.length;
    if (!n || !beta.length) return [];
    const p = X[0].length;
    const K = beta.length;

    const probs = [];

    for (let i = 0; i < n; i++) {
      const xi = X[i];
      if (!Array.isArray(xi) || xi.length !== p) {
        probs.push(new Array(K).fill(1 / K));
        continue;
      }
      const scores = [];
      for (let k = 0; k < K; k++) {
        let s = 0;
        if (k !== refIndex) {
          const bk = beta[k];
          for (let j = 0; j < p; j++) {
            s += bk[j] * xi[j];
          }
        }
        scores.push(s);
      }
      probs.push(softmaxScores(scores));
    }

    return probs;
  }

  global.MNLogit = {
    fit,
    predict
  };
})(window);

