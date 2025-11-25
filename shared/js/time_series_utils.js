// Time series utilities and ARIMA adapter

window.TimeSeriesUtils = window.TimeSeriesUtils || {};

(function (ns) {
  /**
   * Fit an ARIMA (or SARIMA) model using a JS ARIMA library exposed on `window.Arima`.
   * This is a thin adapter so individual apps do not depend on the library API directly.
   *
   * @param {number[]} series Ordered numeric series (after any transforms/differencing).
   * @param {Object} options
   * @param {number} options.p
   * @param {number} options.d
   * @param {number} options.q
   * @param {number} [options.P]
   * @param {number} [options.D]
   * @param {number} [options.Q]
   * @param {number} [options.s] Seasonal period (0 for non-seasonal).
   * @param {number} [options.h] Forecast horizon (steps ahead).
   * @returns {{ model: any, forecast: number[], fitted: number[], residuals: number[], aic?: number }}
   */
  ns.fitArima = function fitArima(series, options) {
    if (!Array.isArray(series) || series.length < 10) {
      throw new Error('ARIMA requires a numeric series with at least ~10 points.');
    }
    if (!window.Arima) {
      throw new Error('ARIMA library is not loaded (window.Arima is undefined).');
    }

    const {
      p,
      d,
      q,
      P = 0,
      D = 0,
      Q = 0,
      s = 0,
      h = 12
    } = options || {};

    // NOTE: Adjust this constructor/fit call to match the actual ARIMA library you include.
    // This is a placeholder API shape.
    const model = new window.Arima(series, p, d, q, P, D, Q, s);
    const fitResult = model.fit(h);

    const forecast = fitResult && Array.isArray(fitResult.forecast) ? fitResult.forecast : [];
    const fitted = fitResult && Array.isArray(fitResult.fitted) ? fitResult.fitted : [];
    const residuals = fitResult && Array.isArray(fitResult.residuals) ? fitResult.residuals : [];
    const aic = typeof fitResult.aic === 'number' ? fitResult.aic : undefined;

    return {
      model,
      forecast,
      fitted,
      residuals,
      aic
    };
  };
})(window.TimeSeriesUtils);

