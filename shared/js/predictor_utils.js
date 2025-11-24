// Shared predictor utilities for regression-style tools
// Provides a generic way to infer basic metadata about columns so
// individual apps can build consistent predictor UIs.

/**
 * Infer basic metadata for each column in a dataset.
 *
 * @param {string[]} headers - Column names.
 * @param {string[][]} rows - Raw data rows (strings).
 * @param {Object} [options]
 * @param {string|null} [options.outcomeName=null] - Column to treat as outcome (excluded from predictors).
 * @param {number} [options.sampleSize=200] - Maximum number of rows to inspect.
 * @param {number} [options.minContinuousDistinct=10] - Distinct-count threshold to prefer "continuous".
 * @returns {Array<Object>} Array of metadata objects per non-outcome column.
 */
function inferPredictorMeta(headers, rows, options) {
  const opts = options || {};
  const outcomeName = opts.outcomeName || null;
  const rowCount = Array.isArray(rows) ? rows.length : 0;
  const sampleSize = Math.min(
    rowCount,
    typeof opts.sampleSize === 'number' && opts.sampleSize > 0 ? opts.sampleSize : 200
  );
  const minContinuousDistinct =
    typeof opts.minContinuousDistinct === 'number' && opts.minContinuousDistinct > 0
      ? opts.minContinuousDistinct
      : 10;

  if (!Array.isArray(headers) || !headers.length || !Array.isArray(rows) || !rows.length) {
    return [];
  }

  const firstRow = rows[0] || null;
  const rowsAreArrays = Array.isArray(firstRow);

  const result = [];

  headers.forEach((header, colIndex) => {
    if (header === outcomeName) return;

    const seenValues = new Set();
    let numericCandidate = true;
    let integerCandidate = true;

      for (let i = 0; i < sampleSize; i++) {
        const row = rows[i];
        const raw = rowsAreArrays ? (row && row[colIndex]) : (row && row[header]);
      if (raw === null || raw === undefined || String(raw).trim() === '') continue;
      const value = String(raw).trim();
      seenValues.add(value);
      const num = parseFloat(value);
      if (!Number.isFinite(num)) {
        numericCandidate = false;
        integerCandidate = false;
      } else if (!Number.isInteger(num)) {
        integerCandidate = false;
      }
    }

    const uniqueCount = seenValues.size;
    const isText = !numericCandidate;
    const canContinuous = numericCandidate && uniqueCount > minContinuousDistinct;
    const canCategorical = true;
    const looksLikeId =
      numericCandidate && integerCandidate && uniqueCount === sampleSize && rows.length >= 10;

    result.push({
      name: header,
      colIndex,
      uniqueCount,
      isText,
      isNumeric: numericCandidate,
      canContinuous,
      canCategorical,
      looksLikeId
    });
  });

  return result;
}

// Expose on a namespaced global for browser apps.
if (typeof window !== 'undefined') {
  window.PredictorUtils = window.PredictorUtils || {};
  window.PredictorUtils.inferPredictorMeta = inferPredictorMeta;
}
