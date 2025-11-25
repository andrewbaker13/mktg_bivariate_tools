// Placeholder bundle for the ARIMA library.
//
// In production, replace the contents of this file with a browser-ready
// UMD build that attaches an ARIMA constructor to `window.Arima`, for example:
//
//   window.Arima = ...;
//
// The ARIMA forecaster app then uses `window.Arima` via `TimeSeriesUtils.fitArima`.

(function (global) {
  if (global.Arima) {
    // A real ARIMA implementation has already been loaded.
    return;
  }

  global.Arima = function () {
    throw new Error(
      'ARIMA library is not wired yet. Replace shared/js/arima_bundle.js with a real ARIMA UMD bundle that defines window.Arima.'
    );
  };
})(window);

