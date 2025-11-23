(function (global) {
  function softmaxScores(scores) {
    const maxScore = Math.max.apply(null, scores);
    const exps = scores.map(s => Math.exp(s - maxScore));
    const sumExp = exps.reduce((acc, v) => acc + v, 0);
    return exps.map(v => v / (sumExp || 1));
  }

  // Standard normal cumulative distribution function
  function normCdf(z) {
    return 0.5 * (1 + math.erf(z / Math.sqrt(2)));
  }

  function zForConfidenceLevel(confidenceLevel) {
    const clamped = Math.max(1e-6, Math.min(0.999999, confidenceLevel || 0.95));
    const target = 1 - (1 - clamped) / 2; // upper-tail quantile (e.g., 0.975 for 95%)
    let low = 0;
    let high = 10;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const cdf = normCdf(mid);
      if (cdf < target) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
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
   * @param {number} [params.tol=1e-4] - Convergence tolerance on parameter change.
   * @param {number} [params.confidenceLevel=0.95] - Confidence level for coefficient intervals.
   * @param {number} [params.momentum=0] - Momentum term (0 = none, 0.8–0.9 typical when enabled).
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
    const tol = params.tol || 1e-4;
    const confidenceLevel = typeof params.confidenceLevel === 'number'
      ? params.confidenceLevel
      : 0.95;
    const momentum = typeof params.momentum === 'number' && params.momentum > 0 && params.momentum < 1
      ? params.momentum
      : 0;

    const n = X.length;
    const p = n ? X[0].length : 0;
    const K = classLabels.length || (Math.max.apply(null, y) + 1);
    if (!n || !p || !K) {
      return {
        coefficients: [],
        classLabels,
        referenceIndex: refIndex
      };
    }

    // Initialize coefficients: K x p, all zeros. Reference class remains zeros.
    const beta = Array.from({
      length: K
    }, () => new Array(p).fill(0));

    // Momentum buffers (same shape as beta)
    const velocity = Array.from({
      length: K
    }, () => new Array(p).fill(0));

    let iterations = 0;
    let lastMaxChange = null;
    let lastLogLik = null;
    const logLikChanges = [];

    for (let iter = 0; iter < maxIter; iter++) {
      // Gradient for each class k and parameter j
      const grad = Array.from({
        length: K
      }, () => new Array(p).fill(0));
      let currentLogLik = 0;

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

        const py = probs[yi];
        if (py > 0 && isFinite(py)) {
          currentLogLik += Math.log(py);
        } else {
          currentLogLik += Math.log(1e-12);
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
        const vk = velocity[k];
        for (let j = 0; j < p; j++) {
          let effGrad = gk[j];
          if (momentum > 0) {
            const vPrev = vk[j];
            const vNew = momentum * vPrev + gk[j];
            vk[j] = vNew;
            effGrad = vNew;
          }
          const delta = (stepSize / n) * effGrad;
          bk[j] += delta;
          const absDelta = Math.abs(delta);
          if (absDelta > maxChange) maxChange = absDelta;
        }
      }

      iterations = iter + 1;
      lastMaxChange = maxChange;

      if (lastLogLik != null) {
        const delta = currentLogLik - lastLogLik;
        logLikChanges.push(delta);
        if (logLikChanges.length > 5) {
          logLikChanges.shift();
        }
      }
      lastLogLik = currentLogLik;

      if (maxChange < tol) {
        break;
      }
    }

    // Post-convergence: calculate Hessian and standard errors
    const nonRefClasses = Array.from({
      length: K
    }, (_, i) => i).filter(k => k !== refIndex);
    const M = nonRefClasses.length * p;
    const hessian = Array.from({
      length: M
    }, () => new Array(M).fill(0));

    // Re-compute final probabilities for all observations
    const allProbs = X.map(xi => {
      const scores = nonRefClasses.map(k => {
        let s = 0;
        for (let j = 0; j < p; j++) {
          s += beta[k][j] * xi[j];
        }
        return s;
      });
      // Add a zero score for the reference class to get full probability distribution
      const fullScores = new Array(K).fill(0);
      nonRefClasses.forEach((k, i) => fullScores[k] = scores[i]);
      return softmaxScores(fullScores);
    });

    // Construct the Hessian matrix
    for (let i = 0; i < n; i++) {
      const xi = X[i];
      const pi = allProbs[i];
      for (let kIdx = 0; kIdx < nonRefClasses.length; kIdx++) {
        for (let lIdx = 0; lIdx < nonRefClasses.length; lIdx++) {
          const k = nonRefClasses[kIdx];
          const l = nonRefClasses[lIdx];
          const isSameClass = k === l ? 1 : 0;
          const factor = -pi[k] * (isSameClass - pi[l]);
          for (let j = 0; j < p; j++) {
            for (let m = 0; m < p; m++) {
              const row = kIdx * p + j;
              const col = lIdx * p + m;
              hessian[row][col] -= xi[j] * xi[m] * factor;
            }
          }
        }
      }
    }

    // Add L2 penalty to Hessian diagonal (for non-intercepts)
    for (let kIdx = 0; kIdx < nonRefClasses.length; kIdx++) {
      for (let j = 1; j < p; j++) {
        const row = kIdx * p + j;
        hessian[row][row] += 2 * l2;
      }
    }
    let stdErrors = null;
    let pValues = null;
    let confidenceIntervals = null;
    let covMatrix = null;
    const zScore = zForConfidenceLevel(confidenceLevel);

    try {
      covMatrix = math.inv(hessian);
      const variances = math.diag(covMatrix);

      stdErrors = Array.from({
        length: K
      }, () => new Array(p).fill(0));
      pValues = Array.from({
        length: K
      }, () => new Array(p).fill(0));
      confidenceIntervals = Array.from({
        length: K
      }, () => new Array(p).fill(null));

      for (let kIdx = 0; kIdx < nonRefClasses.length; kIdx++) {
        const k = nonRefClasses[kIdx];
        for (let j = 0; j < p; j++) {
          const index = kIdx * p + j;
          const variance = variances[index];
          if (variance >= 0) {
            const se = Math.sqrt(variance);
            stdErrors[k][j] = se;
            const z = beta[k][j] / se;
            pValues[k][j] = 2 * (1 - normCdf(Math.abs(z)));
            const margin = zScore * se;
            confidenceIntervals[k][j] = [beta[k][j] - margin, beta[k][j] + margin];
          }
        }
      }
    } catch (e) {
      console.error("Could not invert Hessian matrix:", e);
    }


    return {
      coefficients: beta,
      classLabels,
      referenceIndex: refIndex,
      stdErrors,
      pValues,
      confidenceIntervals,
      covarianceMatrix: covMatrix,
      iterations,
      maxIter,
      stepSize,
      l2,
      tol,
      confidenceLevel,
      optimizer: 'gradient_ascent',
      momentum,
      lastMaxChange,
      logLikChanges,
      covarianceMethod: covMatrix ? 'inverse_observed_fisher' : null,
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

  /**
   * Predict class probabilities with confidence intervals for the log-odds.
   *
   * @param {object} params
   * @param {number[][]} params.X - Design matrix (n x p).
   * @param {number[][]} params.coefficients - Coefficients (K x p).
   * @param {number[][]} params.covarianceMatrix - Covariance matrix of coefficients ((K-1)p x (K-1)p).
   * @param {number} params.referenceIndex - Reference class index.
   * @param {number} params.confidenceLevel - The confidence level (e.g., 0.95).
   * @returns {object[]} Array of objects, each with `probs`, `lower`, `upper`.
   */
  function predictWithIntervals(params) {
    const X = params.X || [];
    const beta = params.coefficients || [];
    const covMatrix = params.covarianceMatrix;
    const refIndex = typeof params.referenceIndex === 'number' ? params.referenceIndex : 0;
    const confidenceLevel = params.confidenceLevel || 0.95;

    const n = X.length;
    if (!n || !beta.length || !covMatrix) return [];
    const p = X[0].length;
    const K = beta.length;

    const zScore = zForConfidenceLevel(confidenceLevel);
    const nonRefClasses = Array.from({ length: K }, (_, i) => i).filter(k => k !== refIndex);
    const M = nonRefClasses.length * p;

    const predictions = [];

    for (let i = 0; i < n; i++) {
      const xi = X[i];
      // Compute scores and probabilities
      const scores = [];
      for (let k = 0; k < K; k++) {
        let s = 0;
        if (k !== refIndex) {
          const bk = beta[k];
          for (let j = 0; j < p; j++) s += bk[j] * xi[j];
        }
        scores.push(s);
      }
      const probs = softmaxScores(scores);

      // Gradient of p_k w.r.t. all non-reference coefficients (flattened)
      const gradients = Array.from({ length: K }, () => new Array(M).fill(0));
      for (let cIdx = 0; cIdx < nonRefClasses.length; cIdx++) {
        const c = nonRefClasses[cIdx];
        for (let j = 0; j < p; j++) {
          const colIndex = cIdx * p + j;
          for (let k = 0; k < K; k++) {
            const indicator = k === c ? 1 : 0;
            gradients[k][colIndex] = probs[k] * (indicator - probs[c]) * xi[j];
          }
        }
      }

      const lowerProbs = new Array(K).fill(0);
      const upperProbs = new Array(K).fill(0);

      for (let k = 0; k < K; k++) {
        let variance = 0;
        const gk = gradients[k];
        for (let a = 0; a < M; a++) {
          const ga = gk[a];
          if (ga === 0) continue;
          for (let b = 0; b < M; b++) {
            const gb = gk[b];
            if (gb === 0) continue;
            variance += ga * covMatrix[a][b] * gb;
          }
        }
        const se = Math.sqrt(Math.max(0, variance));
        const margin = zScore * se;
        const lower = probs[k] - margin;
        const upper = probs[k] + margin;
        lowerProbs[k] = Math.max(0, Math.min(1, Math.min(lower, upper)));
        upperProbs[k] = Math.min(1, Math.max(lower, upper));
      }

      predictions.push({
        probs,
        lower: lowerProbs,
        upper: upperProbs,
      });
    }

    return predictions;
  }

  global.MNLogit = {
    fit,
    predict,
    predictWithIntervals,
  };
})(window);
