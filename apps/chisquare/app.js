// Minimal, stable chi-square app logic (no chart/features)
(function () {
  var rowsInput = document.getElementById('rows');
  var colsInput = document.getElementById('cols');
  var alphaSelect = document.getElementById('alpha');
  var yatesInput = document.getElementById('yates');
  var buildBtn = document.getElementById('buildTable');
  var clearBtn = document.getElementById('clearTable');
  var sampleBtn = document.getElementById('sampleData');
  var tableContainer = document.getElementById('tableContainer');
  var expectedContainer = document.getElementById('expectedContainer');
  // Chart elements
  var chartContainer = document.getElementById('stackedChart');
  var chartLegend = document.getElementById('chartLegend');
  var chartTooltip = document.getElementById('chartTooltip');
  var chartCaption = document.getElementById('chartCaption');
  var chartXAxisSelect = document.getElementById('chartXAxis');
  var cellLabelModeSelect = document.getElementById('cellLabelMode');
  var flipStacksBtn = document.getElementById('flipStackOrder');
  var confidenceButtonsContainer = document.getElementById('chi-confidence-buttons');
  var scenarioState = { manifest: [], defaultDescription: '' };
  var activeScenarioDownload = null;
  var scenarioDownloadBtn = document.getElementById('scenario-download');
  var crosstabDropzone = document.getElementById('crosstab-dropzone');
  var crosstabFileInput = document.getElementById('crosstab-file-input');
  var inputsDownloadBtn = document.getElementById('download-inputs');
  var summaryBrowseBtn = document.getElementById('summary-browse');
  var summaryStatusEl = document.getElementById('summary-upload-status');
  var summaryTemplateBtn = document.getElementById('summary-template-download');
  var rawDropzone = document.getElementById('raw-dropzone');
  var rawFileInput = document.getElementById('raw-file-input');
  var rawBrowseBtn = document.getElementById('raw-browse');
  var rawStatusEl = document.getElementById('raw-upload-status');
  var rawTemplateBtn = document.getElementById('raw-template-download');
  // Optional labels for rows/cols
  var rowLabelsInput = document.getElementById('rowLabelsInput');
  var colLabelsInput = document.getElementById('colLabelsInput');
  // Edit panel elements
  var toggleEditBtn = document.getElementById('toggleEditLabels');
  var editPanel = document.getElementById('editPanel');
  var editRowVar = document.getElementById('editRowVar');
  var editColVar = document.getElementById('editColVar');
  var editRowLabels = document.getElementById('editRowLabels');
  var editColLabels = document.getElementById('editColLabels');
  var applyEditBtn = document.getElementById('applyEditLabels');
  var cancelEditBtn = document.getElementById('cancelEditLabels');

  var chi2El = document.getElementById('chi2');
  var dfEl = document.getElementById('df');
  var pValEl = document.getElementById('pValue');
  var cramerVEl = document.getElementById('cramerV');
  var decisionEl = document.getElementById('decision');
  var interpEl = document.getElementById('interpretation');
  var mgrEl = document.getElementById('managerInterpretation');
  var apaEl = document.getElementById('apaReport');

  var R = clamp(parseInt(getValue(rowsInput), 10) || 2, 2, 10);
  var C = clamp(parseInt(getValue(colsInput), 10) || 2, 2, 10);
  var rowVarName = 'Rows';
  var colVarName = 'Columns';
  var rowLabels = [];
  var colLabels = [];
  var editLabelsMode = false;
  var stackFlipOrder = false;
  var stackFlipOrder = false;

  var DataEntryModes = {
    MANUAL: 'manual',
    SUMMARY: 'summary-upload',
    RAW: 'raw-upload'
  };
  var activeDataEntryMode = DataEntryModes.MANUAL;

  function getSummaryTemplateContent() {
    var rowLabel = 'Channel';
    var colLabel = 'Segment';
    return [
      '# row_var=' + rowLabel,
      '# col_var=' + colLabel,
      '# alpha=0.05',
      '# yates=false',
      ',' + colLabel + ' A,' + colLabel + ' B,' + colLabel + ' C,' + colLabel + ' D',
      rowLabel + ' 1,25,18,12,10',
      rowLabel + ' 2,30,22,15,14',
      rowLabel + ' 3,20,17,11,9'
    ].join('\r\n');
  }

  var RAW_TEMPLATE_CSV = [
    'Audience Segment,Channel',
    'Existing Customers,Email',
    'Existing Customers,Email',
    'Existing Customers,Social',
    'Prospects,Email',
    'Prospects,Display',
    'Prospects,Social'
  ].join('\r\n');

  setValue(rowsInput, String(R));
  setValue(colsInput, String(C));

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function getValue(el) { return el ? el.value : ''; }
  function setValue(el, v) { if (el) el.value = v; }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

  function formatAlphaValue(alphaValue) {
    if (!isFinite(alphaValue)) return '';
    if (alphaValue >= 0.1) return alphaValue.toFixed(2);
    if (alphaValue >= 0.01) return alphaValue.toFixed(3);
    return alphaValue.toFixed(4);
  }

  function applyAlphaValue(alphaValue) {
    if (!alphaSelect || !isFinite(alphaValue)) return;
    var clamped = Math.min(0.25, Math.max(0.0005, alphaValue));
    alphaSelect.value = formatAlphaValue(clamped);
    refreshConfidenceButtons();
  }

  function refreshConfidenceButtons() {
    if (!confidenceButtonsContainer) return;
    var alphaValue = alphaSelect ? parseFloat(alphaSelect.value) : NaN;
    var targetLevel = isFinite(alphaValue) ? (1 - alphaValue) : NaN;
    var buttons = confidenceButtonsContainer.querySelectorAll('.confidence-button');
    buttons.forEach(function (btn) {
      var level = parseFloat(btn.dataset.level);
      var isActive = isFinite(level) && isFinite(targetLevel) && Math.abs(level - targetLevel) < 1e-6;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function setConfidenceLevel(level) {
    if (!alphaSelect || !isFinite(level)) return;
    var alphaValue = 1 - level;
    applyAlphaValue(alphaValue);
    recompute();
  }

  function setupConfidenceButtons() {
    if (!confidenceButtonsContainer) return;
    confidenceButtonsContainer.addEventListener('click', function (event) {
      var button = event.target.closest('.confidence-button');
      if (!button) return;
      event.preventDefault();
      var level = parseFloat(button.dataset.level);
      if (!isFinite(level)) return;
      setConfidenceLevel(level);
    });
    refreshConfidenceButtons();
  }

  function setUploadStatus(el, message, state) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('success', 'error');
    if (state === 'success') el.classList.add('success');
    else if (state === 'error') el.classList.add('error');
  }

  function reportSummaryStatus(message, state) {
    setUploadStatus(summaryStatusEl, message, state);
  }

  function reportRawStatus(message, state) {
    setUploadStatus(rawStatusEl, message, state);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    if (children && children.length) children.forEach(function (c) { node.appendChild(c); });
    return node;
  }
  function elNS(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    attrs = attrs || {};
    for (var k in attrs) { node.setAttribute(k, attrs[k]); }
    return node;
  }

  function setDataEntryMode(mode) {
    if (!mode) return;
    activeDataEntryMode = mode;
    var buttons = document.querySelectorAll('.mode-button');
    buttons.forEach(function (button) {
      var isActive = button.getAttribute('data-mode') === mode;
      button.classList.toggle('active', isActive);
      if (button.hasAttribute('aria-pressed')) {
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    });
    var panels = document.querySelectorAll('.mode-panel');
    panels.forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-mode') === mode);
    });
  }

  function setupDataEntryMode() {
    var toggle = document.querySelector('.mode-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function (event) {
      var button = event.target.closest('.mode-button');
      if (!button) return;
      event.preventDefault();
      var mode = button.getAttribute('data-mode');
      if (mode && mode !== activeDataEntryMode) {
        setDataEntryMode(mode);
      }
    });
    setDataEntryMode(activeDataEntryMode);
  }

  function syncNamesFromWindow() {
    if (typeof window !== 'undefined') {
      if (typeof window.rowVarName === 'string' && window.rowVarName.trim()) rowVarName = window.rowVarName.trim();
      if (typeof window.colVarName === 'string' && window.colVarName.trim()) colVarName = window.colVarName.trim();
    }
  }

  function buildObservedTable(rows, cols) {
    if (!tableContainer) return;
    syncNamesFromWindow();
    var table = el('table', { class: 'grid-table' });
    var thead = el('thead');
    // Header row 1: variable names (view-only)
    var headRow1 = el('tr');
    var rowVarTh = el('th', { id: 'rowVarNameCell' });
    rowVarTh.textContent = rowVarName;
    headRow1.appendChild(rowVarTh);
    var colVarTh = el('th', { id: 'colVarNameCell' });
    colVarTh.colSpan = cols;
    colVarTh.textContent = colVarName;
    headRow1.appendChild(colVarTh);
    headRow1.appendChild(el('th', { text: 'Row total' }));
    thead.appendChild(headRow1);
    // Header row 2: column labels (view-only)
    var headRow2 = el('tr');
    headRow2.appendChild(el('th', { text: '' }));
    for (var j = 0; j < cols; j++) {
      var th = el('th', { 'data-j': String(j) });
      th.textContent = (colLabels[j] || ('Col ' + (j + 1)));
      headRow2.appendChild(th);
    }
    headRow2.appendChild(el('th', { text: '' }));
    thead.appendChild(headRow2);
    table.appendChild(thead);

    var tbody = el('tbody');
    for (var i = 0; i < rows; i++) {
      var tr = el('tr');
      var rowTh = el('th', { 'data-i': String(i) });
      rowTh.textContent = (rowLabels[i] || ('Row ' + (i + 1)));
      tr.appendChild(rowTh);
      for (var jj = 0; jj < cols; jj++) {
        var td = el('td');
        var inp = el('input', { type: 'number', min: '0', step: '1', value: '0', 'data-i': String(i), 'data-j': String(jj) });
        on(inp, 'input', recompute);
        on(inp, 'change', recompute);
        on(inp, 'keyup', recompute);
        td.appendChild(inp);
        td.appendChild(el('span', { class: 'cell-label', text: '' }));
        tr.appendChild(td);
      }
      var totalCell = el('td', { class: 'total', text: '0' });
      tr.appendChild(totalCell);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    var tfoot = el('tfoot');
    var footRow = el('tr');
    footRow.appendChild(el('td', { class: 'total', text: 'Col total' }));
    for (var k = 0; k < cols; k++) footRow.appendChild(el('td', { class: 'total', text: '0' }));
    footRow.appendChild(el('td', { class: 'total', text: 'Grand total: 0' }));
    tfoot.appendChild(footRow);
    table.appendChild(tfoot);

    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
  }

  function getObserved() {
    var table = tableContainer ? tableContainer.querySelector('table') : null;
    if (!table) return null;
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    if (rows.length === 0) return null;
    var values = rows.map(function (tr) {
      var inputs = Array.prototype.slice.call(tr.querySelectorAll('input[type="number"]'));
      return inputs.map(function (inp) {
        var v = typeof inp.valueAsNumber === 'number' && !isNaN(inp.valueAsNumber) ? inp.valueAsNumber : parseFloat(inp.value);
        return !isFinite(v) || v < 0 ? 0 : v;
      });
    });
    R = values.length;
    C = values[0] ? values[0].length : 0;
    return values;
  }

  function recompute() {
    var table = tableContainer ? tableContainer.querySelector('table') : null;
    if (!table) return;
    var obs = getObserved();
    if (!obs) return;

    var totals = computeTotals(obs);
    var rowTotals = totals.rowTotals, colTotals = totals.colTotals, grand = totals.grand;

    // Update UI totals
    var rowTotalCells = table.querySelectorAll('tbody tr td.total');
    for (var i = 0; i < rowTotals.length; i++) if (rowTotalCells[i]) rowTotalCells[i].textContent = fmt(rowTotals[i]);
    var footCells = table.querySelectorAll('tfoot td');
    for (var j = 0; j < colTotals.length; j++) if (footCells[j + 1]) footCells[j + 1].textContent = fmt(colTotals[j]);
    if (footCells[colTotals.length + 1]) footCells[colTotals.length + 1].textContent = 'Grand total: ' + fmt(grand);

    // Expected counts
    var E = computeExpected(rowTotals, colTotals, grand);
    renderExpected(E);

    // Chi-square
    var useYates = (yatesInput && yatesInput.checked && R === 2 && C === 2);
    var res = chiSquare(obs, E, grand, useYates);
    displayResults(res);
    // Chart with current labels
    ensureLabelArrays();
    renderChart(obs, rowLabels.slice(), colLabels.slice());
    // Narrative outputs
    updateNarratives(grand, res, useYates);
    // Cell labels
    updateCellLabels(obs, E, rowTotals, colTotals, grand);
    // Diagnostics panel
    updateDiagnosticsPanel(obs, E, rowTotals, colTotals, grand, res);
  }

  function computeTotals(obs) {
    var rN = obs.length;
    var cN = obs[0] ? obs[0].length : 0;
    var rowTotals = obs.map(function (row) { return row.reduce(function (a, b) { return a + b; }, 0); });
    var colTotals = new Array(cN);
    for (var j = 0; j < cN; j++) {
      var s = 0; for (var i = 0; i < rN; i++) s += obs[i][j];
      colTotals[j] = s;
    }
    var grand = rowTotals.reduce(function (a, b) { return a + b; }, 0);
    return { rowTotals: rowTotals, colTotals: colTotals, grand: grand };
  }

  function computeExpected(rowTotals, colTotals, grand) {
    var rN = rowTotals.length;
    var cN = colTotals.length;
    var E = new Array(rN);
    for (var i = 0; i < rN; i++) {
      E[i] = new Array(cN);
      for (var j = 0; j < cN; j++) E[i][j] = grand > 0 ? (rowTotals[i] * colTotals[j]) / grand : 0;
    }
    return E;
  }

  function updateCellLabels(obs, E, rowTotals, colTotals, grand) {
    if (!tableContainer) return;
    var mode = cellLabelModeSelect ? cellLabelModeSelect.value : 'none';
    var table = tableContainer.querySelector('table');
    if (!table) return;
    var rows = table.querySelectorAll('tbody tr');
    for (var i = 0; i < obs.length && i < rows.length; i++) {
      var tds = rows[i].querySelectorAll('td');
      for (var j = 0; j < obs[i].length && j < tds.length - 1; j++) {
        var td = tds[j];
        var span = td.querySelector('span.cell-label');
        if (!span) continue;
        if (mode === 'none') { span.style.display = 'none'; span.textContent = ''; continue; }
        span.style.display = 'block';
        var txt = '';
        if (mode === 'observed') { txt = fmt(obs[i][j], 0); }
        else if (mode === 'expected') { txt = fixed(E[i][j], 2); }
        else if (mode === 'row_pct') { txt = (rowTotals[i] > 0) ? ( (obs[i][j] / rowTotals[i] * 100).toFixed(1) + '%' ) : '-'; }
        else if (mode === 'col_pct') { txt = (colTotals[j] > 0) ? ( (obs[i][j] / colTotals[j] * 100).toFixed(1) + '%' ) : '-'; }
        else if (mode === 'table_pct') { txt = (grand > 0) ? ( (obs[i][j] / grand * 100).toFixed(1) + '%' ) : '-'; }
        span.textContent = txt;
      }
    }
  }

  function renderExpected(E) {
    if (!expectedContainer) return;
    var rN = E.length;
    var cN = E[0] ? E[0].length : 0;
    var table = el('table', { class: 'summary-table' });
    // header
    var head = el('tr');
    head.appendChild(el('td', { text: '' }));
    for (var j = 0; j < cN; j++) head.appendChild(el('td', { text: (colLabels[j] || ('Col ' + (j + 1))) }));
    table.appendChild(head);
    // rows
    for (var i = 0; i < rN; i++) {
      var tr = el('tr');
      tr.appendChild(el('td', { text: (rowLabels[i] || ('Row ' + (i + 1))) }));
      for (var j2 = 0; j2 < cN; j2++) tr.appendChild(el('td', { text: fixed(E[i][j2], 3) }));
      table.appendChild(tr);
    }
    expectedContainer.innerHTML = '';
    expectedContainer.appendChild(table);
  }

  function updateHeaderTexts() {
    var table = tableContainer ? tableContainer.querySelector('table') : null;
    if (!table) return;
    var headRows = table.querySelectorAll('thead tr');
    if (headRows.length >= 2) {
      var rowVarTh = headRows[0].querySelector('#rowVarNameCell');
      var colVarTh = headRows[0].querySelector('#colVarNameCell');
      if (rowVarTh) rowVarTh.textContent = rowVarName;
      if (colVarTh) colVarTh.textContent = colVarName;
      var ths = headRows[1].querySelectorAll('th[data-j]');
      for (var j = 0; j < ths.length; j++) ths[j].textContent = (colLabels[j] || ('Col ' + (j + 1)));
    }
    var rowHeads = table.querySelectorAll('tbody tr th[data-i]');
    for (var i = 0; i < rowHeads.length; i++) rowHeads[i].textContent = (rowLabels[i] || ('Row ' + (i + 1)));
  }

  function updateDiagnosticsPanel(obs, exp, rowTotals, colTotals, grand, res) {
    var container = document.getElementById('diagnostics-content');
    if (!container) return;
    var hasData = Array.isArray(obs) && obs.length && Array.isArray(exp) && exp.length && grand > 0;
    if (!hasData) {
      container.innerHTML = '<p class="muted">Enter observed counts to check chi-square assumptions and diagnostics.</p>';
      return;
    }
    var rN = obs.length;
    var cN = obs[0] ? obs[0].length : 0;
    var cellCount = rN * cN;
    var minExpected = Infinity;
    var lowExpected = 0;
    var tinyExpected = 0;
    var maxResidual = 0;
    var leverageCell = '';
    for (var i = 0; i < rN; i++) {
      for (var j = 0; j < cN; j++) {
        var E = exp[i][j];
        if (E < minExpected) minExpected = E;
        if (E < 5) lowExpected++;
        if (E < 1) tinyExpected++;
        if (E > 0) {
          var resid = Math.abs(obs[i][j] - E) / Math.sqrt(E);
          if (resid > maxResidual) {
            maxResidual = resid;
            var rLabel = rowLabels[i] || ('Row ' + (i + 1));
            var cLabel = colLabels[j] || ('Col ' + (j + 1));
            leverageCell = rLabel + ' × ' + cLabel;
          }
        }
      }
    }

    var sampleStatus = grand >= 500 ? 'good' : grand >= 200 ? 'caution' : 'alert';
    var sampleMessage = 'Grand total: ' + grand.toLocaleString() + ' observations. ' + (
      sampleStatus === 'good'
        ? 'Plenty of data to support the asymptotic chi-square approximation.'
        : sampleStatus === 'caution'
          ? 'Add more observations if possible to stabilize the statistic.'
          : 'Results are fragile with this few observations; consider aggregating levels or collecting more data.'
    );

    var expectedStatus = tinyExpected ? 'alert' : lowExpected ? 'caution' : 'good';
    var expectedMessage = expectedStatus === 'good'
      ? 'Every expected count exceeds 5.'
      : expectedStatus === 'caution'
        ? lowExpected + ' of ' + cellCount + ' expected counts fall below 5; chi-square p-values are approximate.'
        : tinyExpected + ' expected counts fall below 1; consider combining sparse categories.';

    var filteredRowTotals = rowTotals.filter(function(x){ return x > 0; });
    var filteredColTotals = colTotals.filter(function(x){ return x > 0; });
    var rowRatio = filteredRowTotals.length > 1 ? Math.min.apply(null, filteredRowTotals) / Math.max.apply(null, filteredRowTotals) : 1;
    var colRatio = filteredColTotals.length > 1 ? Math.min.apply(null, filteredColTotals) / Math.max.apply(null, filteredColTotals) : 1;
    var balanceRatio = Math.min(rowRatio || 1, colRatio || 1);
    var balanceStatus = balanceRatio >= 0.4 ? 'good' : balanceRatio >= 0.2 ? 'caution' : 'alert';
    var balanceMessage = balanceStatus === 'good'
      ? 'Row and column totals are reasonably balanced.'
      : 'One or more rows/columns dominate the totals; sparse categories may weaken the signal.';

    var residualStatus = maxResidual < 2 ? 'good' : maxResidual < 3 ? 'caution' : 'alert';
    var residualMessage = maxResidual
      ? ('Largest standardized residual ≈ ' + maxResidual.toFixed(2) + (leverageCell ? ' at ' + leverageCell : '') + '.')
      : 'No leverage points detected.';

    var effect = res && res.V;
    var effectStatus = !isFinite(effect) ? 'caution' : effect >= 0.3 ? 'alert' : effect >= 0.15 ? 'caution' : 'good';
    var effectMessage = isFinite(effect)
      ? ('Cramér’s V = ' + effect.toFixed(3) + (effectStatus === 'good' ? ' (small association).' : effectStatus === 'caution' ? ' (moderate association).' : ' (large association).'))
      : 'Effect size unavailable (insufficient df).';

    var diagnostics = [
      { title: 'Total sample size', status: sampleStatus, message: sampleMessage },
      { title: 'Expected counts', status: expectedStatus, message: expectedMessage },
      { title: 'Balance across rows/cols', status: balanceStatus, message: balanceMessage },
      { title: 'Leverage cells', status: residualStatus, message: residualMessage },
      { title: 'Effect size (Cramér’s V)', status: effectStatus, message: effectMessage }
    ];

    var items = diagnostics.map(function(item){
      return '<div class="diagnostic-item ' + item.status + '"><strong>' + item.title + '</strong><p>' + item.message + '</p></div>';
    }).join('');

    container.innerHTML = '<p>Diagnostics summarize whether chi-square assumptions (sufficient volume, expected counts, and leverage) are satisfied.</p>' + items;
  }

  function chiSquare(obs, exp, n, yates) {
    var rN = obs.length; var cN = obs[0] ? obs[0].length : 0;
    var sum = 0;
    for (var i = 0; i < rN; i++) {
      for (var j = 0; j < cN; j++) {
        var O = obs[i][j];
        var E = exp[i][j];
        if (E <= 0) continue;
        var diff = O - E;
        if (yates) {
          var sign = diff >= 0 ? 1 : -1;
          var mag = Math.max(0, Math.abs(diff) - 0.5);
          diff = sign * mag;
        }
        sum += (diff * diff) / E;
      }
    }
    var df = (rN - 1) * (cN - 1);
    var p = chiSquarePValue(sum, df);
    var k = Math.min(rN - 1, cN - 1);
    var V = (k > 0 && n > 0) ? Math.sqrt(sum / (n * k)) : NaN;
    return { chi2: sum, df: df, p: p, V: V };
  }

  // Numerical utils (Lanczos + incomplete gamma)
  function gammaln(z) {
    var cof = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
    var x = z, y = z, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
    var ser = 1.000000000190015;
    for (var j = 0; j < cof.length; j++) { y += 1; ser += cof[j] / y; }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function gammaincLowerRegularized(s, x) {
    if (x < 0 || s <= 0) return NaN; if (x === 0) return 0;
    if (x < s + 1) {
      var sum = 1 / s, term = sum;
      for (var n = 1; n < 1000; n++) {
        term *= x / (s + n); sum += term;
        if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
      }
      return sum * Math.exp(-x + s * Math.log(x) - gammaln(s));
    } else { return 1 - gammaincUpperRegularized(s, x); }
  }
  function gammaincUpperRegularized(s, x) {
    if (x < 0 || s <= 0) return NaN; if (x === 0) return 1;
    if (x < s + 1) { var P = gammaincLowerRegularized(s, x); return 1 - P; }
    var eps = 1e-14, maxIter = 10000;
    var b = x + 1 - s, c = 1 / 1e-30, d = 1 / b, h = d;
    for (var i = 1; i <= maxIter; i++) {
      var an = -i * (i - s); b += 2; d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; var del = d * c; h *= del; if (Math.abs(del - 1) < eps) break;
    }
    var pre = Math.exp(-x + s * Math.log(x) - gammaln(s));
    return h * pre;
  }
  function chiSquarePValue(chi2, df) {
    if (!isFinite(chi2) || !isFinite(df) || chi2 < 0 || df <= 0) return NaN;
    var s = df / 2; var x = chi2 / 2; return gammaincUpperRegularized(s, x);
  }

  function displayResults(res) {
    if (!chi2El || !dfEl || !pValEl) return;
    if (!res) {
      chi2El.textContent = '-'; dfEl.textContent = '-'; pValEl.textContent = '-'; if (cramerVEl) cramerVEl.textContent = '-'; if (decisionEl) decisionEl.textContent = '-'; if (interpEl) interpEl.textContent = '-'; return;
    }
    chi2El.textContent = fixed(res.chi2, 3);
    dfEl.textContent = String(res.df);
    pValEl.textContent = fixed(res.p, 3);
    if (cramerVEl) cramerVEl.textContent = isFinite(res.V) ? fixed(res.V, 4) : '-';
    var alpha = alphaSelect ? parseFloat(alphaSelect.value) : 0.05;
    if (!isFinite(alpha)) alpha = 0.05;
    var reject = isFinite(res.p) && res.p < alpha;
    if (decisionEl) decisionEl.textContent = (reject ? 'Reject H0 at alpha=' : 'Fail to reject H0 at alpha=') + alpha;
    if (interpEl) interpEl.textContent = buildInterpretation(reject, res.p, res.df);
  }

  function updateNarratives(N, res, usedYates) {
    if (!res || !isFinite(N)) {
      if (mgrEl) mgrEl.textContent = '';
      if (apaEl) apaEl.textContent = '';
      return;
    }
    // Pick up current variable names from headers if edited inline
    var rowVarTh = document.getElementById('rowVarNameCell');
    var colVarTh = document.getElementById('colVarNameCell');
    var rVar = rowVarTh && rowVarTh.textContent ? rowVarTh.textContent.trim() : rowVarName;
    var cVar = colVarTh && colVarTh.textContent ? colVarTh.textContent.trim() : colVarName;

    var alpha = alphaSelect ? parseFloat(alphaSelect.value) : 0.05;
    if (!isFinite(alpha)) alpha = 0.05;
    var reject = isFinite(res.p) && res.p < alpha;
    var Vdesc = describeEffect(res.V);

    if (mgrEl) {
      var base = 'We tested whether ' + rVar + ' and ' + cVar + ' are associated using a chi-square test of independence.';
      var sig = reject
        ? ' The test is statistically significant at alpha = ' + alpha + ' (p = ' + prettyP(res.p) + '), indicating that the distribution of ' + cVar + ' differs across levels of ' + rVar + '.'
        : ' The test is not statistically significant at alpha = ' + alpha + ' (p = ' + prettyP(res.p) + '), so we do not have sufficient evidence that the distribution of ' + cVar + ' differs across levels of ' + rVar + '.';
      var es = '';
      if (isFinite(res.V)) {
        var assocWord = Vdesc ? (' a ' + Vdesc + ' association ') : ' an association ';
        es = ' Effect size (Cramer\'s V) is ' + fixed(res.V, 3) + (Vdesc ? ' (' + Vdesc + ')' : '') + ', indicating' + assocWord + 'between ' + rVar + ' and ' + cVar + '.';
      }
      var note = (usedYates && res.df === 1) ? ' Yates\' continuity correction was applied (2x2 table).' : '';
      mgrEl.textContent = base + sig + es + note;
    }

    if (apaEl) {
      apaEl.textContent = buildApa(rVar, cVar, N, res, usedYates);
    }
  }

  function prettyP(p) {
    if (!isFinite(p)) return 'NA';
    if (p < 0.001) return '< .001';
    var v = Number(p).toFixed(3);
    return v;
  }

  function describeEffect(V) {
    if (!isFinite(V)) return '';
    // Cohen-style rough guidelines for Cramer's V
    if (V >= 0.5) return 'large';
    if (V >= 0.3) return 'medium';
    if (V >= 0.1) return 'small';
    return 'very small';
  }

  function buildApa(rVar, cVar, N, res, usedYates) {
    var stat = 'X^2(' + res.df + ', N = ' + fmt(N, 0) + ') = ' + fixed(res.chi2, 2) + ', p ' + (res.p < 0.001 ? '< .001' : '= ' + prettyP(res.p));
    var corr = (usedYates && res.df === 1) ? ' with Yates\' continuity correction' : '';
    var eff = isFinite(res.V) ? (', Cramer\'s V = ' + fixed(res.V, 3)) : '';
    return 'Association between ' + rVar + ' and ' + cVar + ': ' + stat + corr + eff + '.';
  }

  function fmt(x, digits) {
    digits = digits || 4;
    if (!isFinite(x)) return '-';
    return Number(x).toFixed(digits).replace(/\.0+$/, '');
  }
  function fixed(x, n) { return (!isFinite(x) ? '-' : Number(x).toFixed(n)); }

  function buildInterpretation(reject, p, df) {
    var pText = isFinite(p) ? ('p = ' + Number(p).toPrecision(3)) : 'p = NA';
    return reject ? ('There is a statistically significant association (' + pText + ', df = ' + df + ').') : ('There is not sufficient evidence of association (' + pText + ', df = ' + df + ').');
  }

  function parseLabels(val, n, prefix) {
    var parts = (val || '').split(',');
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = (parts[i] || '').trim();
      out.push(t ? t : (prefix + (i + 1)));
    }
    return out;
  }

  function ensureLabelArrays() {
    syncNamesFromWindow();
    var winRows = (typeof window !== 'undefined' && Array.isArray(window.rowLabels) && window.rowLabels.length) ? window.rowLabels : null;
    var winCols = (typeof window !== 'undefined' && Array.isArray(window.colLabels) && window.colLabels.length) ? window.colLabels : null;
    if (winRows) {
      rowLabels = winRows.slice(0, R);
    } else if (!rowLabels.length && rowLabelsInput) {
      rowLabels = parseLabels(getValue(rowLabelsInput), R, 'Row ');
    }
    if (winCols) {
      colLabels = winCols.slice(0, C);
    } else if (!colLabels.length && colLabelsInput) {
      colLabels = parseLabels(getValue(colLabelsInput), C, 'Col ');
    }
    rowLabels = rowLabels.slice(0, R); while (rowLabels.length < R) rowLabels.push('Row ' + (rowLabels.length + 1));
    colLabels = colLabels.slice(0, C); while (colLabels.length < C) colLabels.push('Col ' + (colLabels.length + 1));
  }

  // 100% stacked bar chart
  function renderChart(obs, rowLbls, colLbls) {
    if (!chartContainer || !chartLegend) return;
    var rN = obs.length; var cN = obs[0] ? obs[0].length : 0;
    if (rN === 0 || cN === 0) return;
    var xAxis = chartXAxisSelect ? chartXAxisSelect.value : 'rows';

    var bars = [];
    var stackLabels = [];
    if (xAxis === 'rows') {
      for (var i = 0; i < rN; i++) {
        bars.push({ label: rowLbls[i] || ('Row ' + (i + 1)), segments: obs[i].slice() });
      }
      stackLabels = colLbls.slice();
    } else {
      for (var j = 0; j < cN; j++) {
        var col = [];
        for (var i2 = 0; i2 < rN; i2++) col.push(obs[i2][j]);
        bars.push({ label: colLbls[j] || ('Col ' + (j + 1)), segments: col });
      }
      stackLabels = rowLbls.slice();
    }

    StackedChartUtils.renderStacked100Chart({
      container: chartContainer,
      legend: chartLegend,
      tooltip: chartTooltip,
      caption: chartCaption,
      bars: bars,
      stackLabels: stackLabels,
      flipStacks: stackFlipOrder,
      palette: ['#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a','#172554'],
      axisLabels: {
        bars: (xAxis === 'rows') ? 'Rows' : 'Columns',
        stacks: (xAxis === 'rows') ? 'Columns' : 'Rows'
      }
    });
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]);}); }

  function renderScenarioDescription(title, description) {
    var container = document.getElementById('scenario-description');
    if (!container) return;
    if (!description) {
      container.innerHTML = scenarioState.defaultDescription;
      return;
    }
    var paragraphs = description.split(/\n{2,}/).map(function (text) { return text.trim(); }).filter(Boolean);
    var heading = title ? '<p><strong>' + escapeHtml(title) + '</strong></p>' : '';
    var body = paragraphs.length ? paragraphs.map(function (text) { return '<p>' + escapeHtml(text) + '</p>'; }).join('') : '<p>' + escapeHtml(description) + '</p>';
    container.innerHTML = heading + body;
  }

  function getScenarioDownloadInfo(entry) {
    if (!entry) return null;
    var relativePath = entry.dataset;
    if (!relativePath) return null;
    var absolutePath;
    try {
      absolutePath = /^https?:/i.test(relativePath)
        ? relativePath
        : new URL(relativePath, window.location.href).href;
    } catch (err) {
      absolutePath = relativePath;
    }
    var filename = relativePath.split('/').pop() || 'scenario';
    var mime = /\.csv$/i.test(filename) ? 'text/csv' : 'text/plain';
    return { path: absolutePath, filename: filename, mime: mime };
  }

  function updateScenarioDownload(entry, datasetText) {
    if (!scenarioDownloadBtn) return;
    var info = getScenarioDownloadInfo(entry);
    if (info) {
      scenarioDownloadBtn.classList.remove('hidden');
      scenarioDownloadBtn.disabled = false;
      scenarioDownloadBtn.dataset.file = info.path;
      scenarioDownloadBtn.dataset.filename = info.filename;
      scenarioDownloadBtn.dataset.mime = info.mime;
      activeScenarioDownload = datasetText ? {
        type: 'inline',
        filename: info.filename,
        mime: info.mime,
        content: datasetText
      } : {
        type: 'remote',
        path: info.path,
        filename: info.filename,
        mime: info.mime
      };
    } else {
      scenarioDownloadBtn.classList.add('hidden');
      scenarioDownloadBtn.disabled = true;
      scenarioDownloadBtn.dataset.file = '';
      delete scenarioDownloadBtn.dataset.filename;
      delete scenarioDownloadBtn.dataset.mime;
      activeScenarioDownload = null;
    }
  }

  function parseScenarioText(text) {
    var lines = (text || '').replace(/\r/g, '').split('\n');
    var result = { title: '', description: [], alpha: null, rows: [], columns: [], matrix: [], settings: {} };
    var section = '';
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        section = trimmed.replace(/^#\s*/, '').toLowerCase();
        return;
      }
      if (!section) return;
      if (!trimmed && section !== 'description') return;
      if (section === 'title') {
        if (trimmed) result.title = trimmed;
      } else if (section === 'description') {
        result.description.push(line);
      } else if (section === 'alpha') {
        var alphaValue = parseFloat(trimmed);
        if (isFinite(alphaValue)) result.alpha = alphaValue;
      } else if (section === 'rows') {
        if (trimmed) result.rows.push(trimmed);
      } else if (section === 'columns') {
        if (trimmed) result.columns.push(trimmed);
      } else if (section === 'matrix') {
        if (!trimmed) return;
        var values = trimmed.split('|').map(function (cell) {
          var num = parseFloat(cell.trim());
          return isFinite(num) ? num : null;
        });
        if (values.length) result.matrix.push(values);
      } else if (section === 'additional inputs') {
        if (trimmed.indexOf('=') < 0) return;
        var parts = trimmed.split('=');
        var key = parts.shift().trim().toLowerCase();
        var value = parts.join('=').trim();
        if (key) result.settings[key] = value;
      }
    });
    result.description = result.description.join('\n').trim();
    return result;
  }

  function populateScenarioOptions() {
    var select = document.getElementById('scenario-select');
    if (!select) return;
    var current = select.value;
    select.innerHTML = '<option value="">Manual inputs (no preset)</option>';
    scenarioState.manifest.forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.label || entry.id;
      if (entry.id === current) option.selected = true;
      select.appendChild(option);
    });
  }

  function fetchScenarioIndex() {
    fetch('scenarios/scenario-index.json', { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('Unable to load scenario index (' + response.status + ')');
        return response.json();
      })
      .then(function (data) {
        if (Array.isArray(data)) scenarioState.manifest = data;
      })
      .catch(function (error) {
        console.error('Scenario index error:', error);
        scenarioState.manifest = [];
      })
      .then(populateScenarioOptions);
  }

  function setupScenarioDownload() {
    if (!scenarioDownloadBtn) return;
    scenarioDownloadBtn.addEventListener('click', function () {
      var info = activeScenarioDownload;
      if (!info) return;
      if (info.type === 'inline') {
        downloadTextFile(info.filename, info.content, { mimeType: info.mime });
        return;
      }
      fetch(info.path, { cache: 'no-cache' })
        .then(function (response) {
          if (!response.ok) throw new Error('Unable to fetch scenario data (' + response.status + ')');
          return response.text();
        })
        .then(function (text) {
          downloadTextFile(info.filename, text, { mimeType: info.mime });
        })
        .catch(function (error) {
          console.error('Scenario download error:', error);
          alert('Unable to download scenario data. Please try again.');
        });
    });
  }

  function escapeCsvValue(value) {
    var str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function downloadCurrentInputs() {
    var table = tableContainer ? tableContainer.querySelector('table') : null;
    if (!table) return;
    var lines = [];
    var headers = [''].concat(colLabels.slice(0, C));
    lines.push(headers.map(escapeCsvValue).join(','));
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function (tr, idx) {
      var inputs = tr.querySelectorAll('input[type="number"]');
      var values = Array.from(inputs).map(function (inp) {
        var num = parseFloat(inp.value);
        return isFinite(num) ? num : 0;
      });
      var rowLabel = rowLabels[idx] || ('Row ' + (idx + 1));
      var rowData = [rowLabel].concat(values);
      lines.push(rowData.map(escapeCsvValue).join(','));
    });
    downloadTextFile('chi-square-crosstab.csv', lines.join('\n'), { mimeType: 'text/csv' });
  }

  function parseCrosstabText(text) {
    var trimmed = (text || '').trim();
    if (!trimmed) {
      throw new Error('File is empty.');
    }
    var rawLines = trimmed.split(/\r?\n/);
    var meta = { rowVarName: '', colVarName: '', alpha: null, yates: null };
    var tableLines = [];
    rawLines.forEach(function (rawLine) {
      var line = rawLine.replace(/\ufeff/g, '').trim();
      if (!line) return;
      if (line.charAt(0) === '#') {
        var metaLine = line.replace(/^#+\s*/, '');
        var eqIndex = metaLine.indexOf('=');
        if (eqIndex >= 0) {
          var key = metaLine.slice(0, eqIndex).trim().toLowerCase();
          var value = metaLine.slice(eqIndex + 1).trim();
          if (key === 'row_var' || key === 'rowvar' || key === 'rowname') {
            meta.rowVarName = value;
          } else if (key === 'col_var' || key === 'colvar' || key === 'colname') {
            meta.colVarName = value;
          } else if (key === 'alpha') {
            var alphaValue = parseFloat(value);
            if (isFinite(alphaValue)) meta.alpha = alphaValue;
          } else if (key === 'yates' || key === 'correction') {
            if (/^(true|false)$/i.test(value)) {
              meta.yates = /^true$/i.test(value);
            }
          }
        }
        return;
      }
      tableLines.push(line);
    });
    if (tableLines.length < 2) {
      throw new Error('Provide a header row and at least one data row.');
    }
    var delimiter = detectDelimiter(tableLines[0]);
    var headers = tableLines[0].split(delimiter).map(function (cell) { return cell.trim(); });
    if (headers.length < 2) {
      throw new Error('Expect at least one column header and one label column.');
    }
    var rowHeaderTitle = headers[0] || '';
    var colHeaders = headers.slice(1).map(function (label, idx) { return label || ('Column ' + (idx + 1)); });
    if (colHeaders.length > 10) {
      throw new Error('Only up to 10 columns are supported.');
    }
    var rowNames = [];
    var matrix = [];
    var maxRows = 10;
    tableLines.slice(1).forEach(function (line, index) {
      var parts = line.split(delimiter).map(function (cell) { return cell.trim(); });
      if (parts.length !== headers.length) {
        throw new Error('Row ' + (index + 2) + ' has ' + parts.length + ' columns but expected ' + headers.length + '.');
      }
      var rowName = parts[0] || ('Row ' + (index + 1));
      if (rowNames.length >= maxRows) {
        throw new Error('Only up to 10 rows are supported.');
      }
      rowNames.push(rowName);
      var values = parts.slice(1).map(function (value, idx) {
        var num = parseFloat(value);
        if (!isFinite(num)) {
          throw new Error('Row ' + (index + 2) + ', column ' + (idx + 2) + ' must be numeric.');
        }
        return num;
      });
      matrix.push(values);
    });
    if (!matrix.length) {
      throw new Error('No numeric rows found.');
    }
    return {
      rows: rowNames,
      columns: colHeaders,
      matrix: matrix,
      rowVarName: meta.rowVarName || rowHeaderTitle,
      colVarName: meta.colVarName || '',
      alpha: meta.alpha,
      yates: meta.yates
    };
  }

  function parseRawDataset(text) {
    var trimmed = (text || '').trim();
    if (!trimmed) {
      throw new Error('File is empty.');
    }
    var lines = trimmed.split(/\r?\n/).filter(function (line) { return line.trim().length; });
    if (lines.length < 2) {
      throw new Error('File must include a header row and at least one observation.');
    }
    var delimiter = typeof detectDelimiter === 'function'
      ? detectDelimiter(lines[0])
      : (lines[0].includes('\t') ? '\t' : ',');
    var headers = lines[0].split(delimiter).map(function (h) { return h.trim(); });
    if (headers.length !== 2) {
      throw new Error('Provide exactly two columns (e.g., Segment,Channel).');
    }
    var maxRowsAllowed = typeof MAX_UPLOAD_ROWS === 'number' ? MAX_UPLOAD_ROWS : 2000;
    var records = [];
    for (var i = 1; i < lines.length; i++) {
      var parts = lines[i].split(delimiter).map(function (cell) { return cell.trim(); });
      if (parts.every(function (cell) { return cell === ''; })) continue;
      if (parts.length < 2) {
        throw new Error('Row ' + (i + 1) + ' must include two columns.');
      }
      var rowLabel = parts[0];
      var colLabel = parts[1];
      if (!rowLabel || !colLabel) {
        throw new Error('Row ' + (i + 1) + ' is missing a category label.');
      }
      records.push({ row: rowLabel, col: colLabel });
      if (records.length > maxRowsAllowed) {
        throw new Error('Upload limit exceeded: only ' + maxRowsAllowed + ' rows are supported.');
      }
    }
    if (!records.length) {
      throw new Error('No data rows found.');
    }
    var rowValues = [];
    var colValues = [];
    var addUnique = function (value, list) {
      if (list.indexOf(value) === -1) list.push(value);
    };
    records.forEach(function (entry) {
      addUnique(entry.row, rowValues);
      addUnique(entry.col, colValues);
    });
    if (rowValues.length > 10 || colValues.length > 10) {
      throw new Error('Raw data produced a ' + rowValues.length + 'x' + colValues.length + ' table. Limit to 10 categories per variable.');
    }
    var matrix = rowValues.map(function () {
      return colValues.map(function () { return 0; });
    });
    records.forEach(function (entry) {
      var rIndex = rowValues.indexOf(entry.row);
      var cIndex = colValues.indexOf(entry.col);
      matrix[rIndex][cIndex] += 1;
    });
    var rawRowName = headers[0] || rowVarName;
    var rawColName = headers[1] || colVarName;
    return {
      rows: rowValues,
      columns: colValues,
      matrix: matrix,
      rowVarName: rawRowName,
      colVarName: rawColName
    };
  }

  function applyCrosstabMatrix(parsed, metadata) {
    if (!parsed) return;
    metadata = metadata || {};
    var retainScenario = Boolean(metadata.retainScenario);
    var providedRowVar = metadata.rowVarName || parsed.rowVarName;
    var providedColVar = metadata.colVarName || parsed.colVarName;
    if (providedRowVar && providedRowVar.trim()) rowVarName = providedRowVar.trim();
    if (providedColVar && providedColVar.trim()) colVarName = providedColVar.trim();
    rowLabels = parsed.rows.slice();
    colLabels = parsed.columns.slice();
    var targetRows = Math.max(2, rowLabels.length, parsed.matrix.length || 0);
    var targetCols = Math.max(2, colLabels.length, (parsed.matrix[0] ? parsed.matrix[0].length : 0) || 0);
    if (targetRows > 10 || targetCols > 10) {
      alert('Uploaded table exceeds the 10x10 limit.');
      return;
    }
    R = targetRows;
    C = targetCols;
    setValue(rowsInput, String(R));
    setValue(colsInput, String(C));
    if (rowLabelsInput) rowLabelsInput.value = rowLabels.slice(0, R).join(', ');
    if (colLabelsInput) colLabelsInput.value = colLabels.slice(0, C).join(', ');
    ensureLabelArrays();
    buildObservedTable(R, C);
    fillTableFromMatrix(parsed.matrix);
    if (metadata.alpha != null) {
      applyAlphaValue(metadata.alpha);
    }
    if (typeof metadata.yates === 'boolean' && yatesInput) {
      yatesInput.checked = metadata.yates;
    }
    if (!retainScenario) {
      renderScenarioDescription('', '');
      var select = document.getElementById('scenario-select');
      if (select) select.value = '';
      updateScenarioDownload(null);
    }
    if (typeof setDataEntryMode === 'function') {
      setDataEntryMode(DataEntryModes.MANUAL);
    }
    recompute();
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Unable to read file.')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  function handleCrosstabFile(file) {
    if (!file) return;
    reportSummaryStatus('Processing ' + file.name + '...', null);
    readFileAsText(file)
      .then(function (text) {
        var parsed = parseCrosstabText(text);
        applyCrosstabMatrix(parsed, {
          rowVarName: parsed.rowVarName,
          colVarName: parsed.colVarName,
          alpha: parsed.alpha,
          yates: parsed.yates
        });
        reportSummaryStatus('Loaded ' + parsed.rows.length + 'x' + parsed.columns.length + ' table from ' + file.name + '.', 'success');
      })
      .catch(function (error) {
        var message = (error && error.message) ? error.message : 'Unknown error.';
        reportSummaryStatus(message, 'error');
        alert('Upload error: ' + message);
      });
  }

  function handleRawFile(file) {
    if (!file) return;
    reportRawStatus('Processing ' + file.name + '...', null);
    readFileAsText(file)
      .then(function (text) {
        var parsed = parseRawDataset(text);
        applyCrosstabMatrix(parsed, {
          rowVarName: parsed.rowVarName,
          colVarName: parsed.colVarName
        });
        reportRawStatus('Converted ' + file.name + ' into a ' + parsed.rows.length + 'x' + parsed.columns.length + ' table.', 'success');
      })
      .catch(function (error) {
        var message = (error && error.message) ? error.message : 'Unknown error.';
        reportRawStatus(message, 'error');
        alert('Raw upload error: ' + message);
      });
  }

  function bindCrosstabDropzone() {
    if (!crosstabDropzone) return;
    var prevent = function (event) { event.preventDefault(); event.stopPropagation(); };
    ['dragenter', 'dragover'].forEach(function (name) {
      crosstabDropzone.addEventListener(name, function (event) {
        prevent(event);
        crosstabDropzone.classList.add('drag-active');
      });
    });
    ['dragleave', 'drop', 'dragend'].forEach(function (name) {
      crosstabDropzone.addEventListener(name, function (event) {
        prevent(event);
        crosstabDropzone.classList.remove('drag-active');
      });
    });
    crosstabDropzone.addEventListener('drop', function (event) {
      prevent(event);
      var files = event.dataTransfer ? event.dataTransfer.files : [];
      if (files && files.length) {
        handleCrosstabFile(files[0]);
      }
    });
    crosstabDropzone.addEventListener('click', function () {
      if (crosstabFileInput) crosstabFileInput.click();
    });
    if (summaryBrowseBtn) {
      summaryBrowseBtn.addEventListener('click', function () {
        if (crosstabFileInput) crosstabFileInput.click();
      });
    }
    crosstabDropzone.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (crosstabFileInput) crosstabFileInput.click();
      }
    });
    if (crosstabFileInput) {
      crosstabFileInput.addEventListener('change', function (event) {
        var files = event.target.files;
        if (files && files.length) {
          handleCrosstabFile(files[0]);
        }
        event.target.value = '';
      });
    }
  }

  function bindRawDropzone() {
    if (!rawDropzone) return;
    var prevent = function (event) { event.preventDefault(); event.stopPropagation(); };
    ['dragenter', 'dragover'].forEach(function (name) {
      rawDropzone.addEventListener(name, function (event) {
        prevent(event);
        rawDropzone.classList.add('drag-active');
      });
    });
    ['dragleave', 'drop', 'dragend'].forEach(function (name) {
      rawDropzone.addEventListener(name, function (event) {
        prevent(event);
        rawDropzone.classList.remove('drag-active');
      });
    });
    rawDropzone.addEventListener('drop', function (event) {
      prevent(event);
      var files = event.dataTransfer ? event.dataTransfer.files : [];
      if (files && files.length) {
        handleRawFile(files[0]);
      }
    });
    rawDropzone.addEventListener('click', function () {
      if (rawFileInput) rawFileInput.click();
    });
    if (rawBrowseBtn) {
      rawBrowseBtn.addEventListener('click', function () {
        if (rawFileInput) rawFileInput.click();
      });
    }
    rawDropzone.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (rawFileInput) rawFileInput.click();
      }
    });
    if (rawFileInput) {
      rawFileInput.addEventListener('change', function (event) {
        var files = event.target.files;
        if (files && files.length) {
          handleRawFile(files[0]);
        }
        event.target.value = '';
      });
    }
  }

  function downloadRawTemplate() {
    if (typeof downloadTextFile === 'function') {
      downloadTextFile('chi_raw_template.csv', RAW_TEMPLATE_CSV, { mimeType: 'text/csv' });
    }
  }

  function downloadSummaryTemplate() {
    if (typeof downloadTextFile === 'function') {
      var content = getSummaryTemplateContent();
      downloadTextFile('chi_contingency_template.csv', content, { mimeType: 'text/csv' });
    }
  }

  function setupScenarioSelector() {
    var select = document.getElementById('scenario-select');
    if (!select) return;
    select.addEventListener('change', function () {
      var value = select.value;
      if (!value) {
        renderScenarioDescription('', '');
        updateScenarioDownload(null);
        return;
      }
      loadScenarioById(value);
    });
  }

  function initializeScenarios() {
    var description = document.getElementById('scenario-description');
    if (description) {
      scenarioState.defaultDescription = description.innerHTML;
    }
    setupScenarioDownload();
    setupScenarioSelector();
    fetchScenarioIndex();
  }

  function initializeUploads() {
  bindCrosstabDropzone();
  bindRawDropzone();
  if (inputsDownloadBtn) {
    inputsDownloadBtn.addEventListener('click', downloadCurrentInputs);
  }
  if (rawTemplateBtn) {
    rawTemplateBtn.addEventListener('click', downloadRawTemplate);
  }
  if (summaryTemplateBtn) {
    summaryTemplateBtn.addEventListener('click', downloadSummaryTemplate);
  }
  setupDataEntryMode();
  setupConfidenceButtons();
  }

  function fillTableFromMatrix(matrix) {
    if (!tableContainer) return;
    var table = tableContainer.querySelector('table');
    if (!table) return;
    var rows = table.querySelectorAll('tbody tr');
    for (var i = 0; i < rows.length; i++) {
      var inputs = rows[i].querySelectorAll('input[type="number"]');
      var rowValues = (matrix && matrix[i]) ? matrix[i] : [];
      for (var j = 0; j < inputs.length; j++) {
        var value = Number(rowValues[j]);
        if (!isFinite(value)) value = 0;
        inputs[j].value = String(value);
      }
    }
  }

  function applyScenarioPreset(parsed, entry, dataset, datasetText) {
    if (!parsed && !dataset) return;
    var tableSource = dataset || (parsed ? { rows: parsed.rows || [], columns: parsed.columns || [], matrix: parsed.matrix || [] } : null);
    if (!tableSource || !tableSource.matrix || !tableSource.matrix.length) return;
    var metadata = {};
    if (dataset) {
      metadata.rowVarName = dataset.rowVarName || (parsed && parsed.settings && parsed.settings.rowvarname) || null;
      metadata.colVarName = dataset.colVarName || (parsed && parsed.settings && parsed.settings.colvarname) || null;
      metadata.alpha = dataset.alpha != null ? dataset.alpha : (parsed && isFinite(parsed.alpha) ? parsed.alpha : null);
      if (typeof dataset.yates === 'boolean') {
        metadata.yates = dataset.yates;
      } else if (parsed && parsed.settings && typeof parsed.settings.yates !== 'undefined') {
        metadata.yates = parsed.settings.yates.toLowerCase() === 'true';
      }
    } else if (parsed) {
      if (parsed.settings) {
        if (parsed.settings.rowvarname) metadata.rowVarName = parsed.settings.rowvarname;
        if (parsed.settings.colvarname) metadata.colVarName = parsed.settings.colvarname;
        if (typeof parsed.settings.yates !== 'undefined') metadata.yates = parsed.settings.yates.toLowerCase() === 'true';
      }
      if (isFinite(parsed.alpha)) metadata.alpha = parsed.alpha;
    }
    metadata.retainScenario = true;
    applyCrosstabMatrix({
      rows: Array.isArray(tableSource.rows) ? tableSource.rows.slice() : [],
      columns: Array.isArray(tableSource.columns) ? tableSource.columns.slice() : [],
      matrix: Array.isArray(tableSource.matrix)
        ? tableSource.matrix.map(function (row) { return Array.isArray(row) ? row.slice() : []; })
        : []
    }, metadata);
    if (parsed && parsed.settings) {
      var settings = parsed.settings;
      if (settings.chartxaxis && chartXAxisSelect) {
        var axisVal = settings.chartxaxis.toLowerCase();
        if (axisVal === 'rows' || axisVal === 'columns') {
          chartXAxisSelect.value = axisVal;
        }
      }
      if (settings.celllabelmode && cellLabelModeSelect) {
        var modeVal = settings.celllabelmode.toLowerCase();
        for (var m = 0; m < cellLabelModeSelect.options.length; m++) {
          if (cellLabelModeSelect.options[m].value === modeVal) {
            cellLabelModeSelect.value = modeVal;
            break;
          }
        }
      }
      if (settings.yates && yatesInput && metadata.yates == null) {
        yatesInput.checked = settings.yates.toLowerCase() === 'true';
      }
    }
    renderScenarioDescription((parsed && parsed.title) || (entry && entry.label), parsed && parsed.description ? parsed.description : '');
    updateScenarioDownload(entry, datasetText || null);
    recompute();
  }

  function loadScenarioById(id) {
    var scenario = scenarioState.manifest.find(function (entry) { return entry.id === id; });
    if (!scenario) {
      renderScenarioDescription('', '');
      updateScenarioDownload(null);
      return;
    }
    var scenarioTextPromise = fetch(scenario.file, { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('Unable to load scenario file (' + response.status + ')');
        return response.text();
      })
      .catch(function (error) {
        console.error('Scenario copy error:', error);
        return null;
      });
    var datasetPromise = scenario.dataset
      ? fetch(scenario.dataset, { cache: 'no-cache' })
          .then(function (response) {
            if (!response.ok) throw new Error('Unable to load scenario dataset (' + response.status + ')');
            return response.text();
          })
          .catch(function (error) {
            console.error('Scenario dataset error:', error);
            return null;
          })
      : Promise.resolve(null);
    Promise.all([scenarioTextPromise, datasetPromise])
      .then(function (results) {
        var parsedScenario = results[0] ? parseScenarioText(results[0]) : null;
        var parsedDataset = null;
        if (results[1]) {
          if (scenario.dataType && scenario.dataType.toLowerCase() === 'raw') {
            parsedDataset = parseRawDataset(results[1]);
          } else {
            parsedDataset = parseCrosstabText(results[1]);
          }
        }
        if (!parsedScenario && !parsedDataset) {
          throw new Error('Scenario data unavailable.');
        }
        var datasetText = results[1] || null;
        applyScenarioPreset(parsedScenario, scenario, parsedDataset, datasetText);
      })
      .catch(function (error) {
        console.error('Scenario load error:', error);
        renderScenarioDescription('', 'Unable to load scenario: ' + (error && error.message ? error.message : 'unknown error'));
        updateScenarioDownload(null);
      });
  }


  function clearTable() {
    var inputs = tableContainer ? tableContainer.querySelectorAll('tbody input') : [];
    inputs.forEach(function (inp) { inp.value = '0'; });
    recompute();
  }
  function sampleData() {
    var table = tableContainer ? tableContainer.querySelector('table') : null;
    if (!table) return;
    var inputs = table.querySelectorAll('tbody input');
    inputs.forEach(function (inp) {
      var v = Math.floor(Math.random() * (25 - 8 + 1)) + 8; // 8..25 inclusive
      inp.value = String(v);
    });
    recompute();
  }

  function rebuild() {
    R = clamp(parseInt(getValue(rowsInput), 10) || 2, 2, 10);
    C = clamp(parseInt(getValue(colsInput), 10) || 2, 2, 10);
    setValue(rowsInput, String(R)); setValue(colsInput, String(C));
    ensureLabelArrays();
    buildObservedTable(R, C);
    recompute();
  }

  // Wire events
  on(buildBtn, 'click', rebuild);
  on(clearBtn, 'click', clearTable);
  on(sampleBtn, 'click', sampleData);
  on(rowsInput, 'change', rebuild);
  on(colsInput, 'change', rebuild);
  on(yatesInput, 'change', recompute);
  on(alphaSelect, 'change', function () {
    refreshConfidenceButtons();
    recompute();
  });
  on(chartXAxisSelect, 'change', recompute);
  on(cellLabelModeSelect, 'change', recompute);
  window.addEventListener('resize', function(){ var obs = getObserved(); if (obs) { renderChart(obs, rowLabels.slice(), colLabels.slice()); } });
  on(toggleEditBtn, 'click', openEditPanel);
  on(applyEditBtn, 'click', applyEditNames);
  on(cancelEditBtn, 'click', closeEditPanel);
  on(toggleEditBtn, 'click', function(){
    editLabelsMode = !editLabelsMode;
    // Toggle contentEditable on headers
    var rowVarTh = document.getElementById('rowVarNameCell');
    var colVarTh = document.getElementById('colVarNameCell');
    if (rowVarTh) rowVarTh.contentEditable = editLabelsMode ? 'true' : 'false';
    if (colVarTh) colVarTh.contentEditable = editLabelsMode ? 'true' : 'false';
    var headRows = tableContainer ? tableContainer.querySelectorAll('thead tr') : [];
    if (headRows.length >= 2) {
      var ths = headRows[1].querySelectorAll('th[data-j]');
      ths.forEach(function(th){ th.contentEditable = editLabelsMode ? 'true' : 'false'; });
    }
    var rowHeads = tableContainer ? tableContainer.querySelectorAll('tbody tr th[data-i]') : [];
    rowHeads.forEach(function(th){ th.contentEditable = editLabelsMode ? 'true' : 'false'; });
    if (toggleEditBtn) toggleEditBtn.textContent = editLabelsMode ? 'Done Editing Names' : 'Edit Row/Column Names';
    if (!editLabelsMode) recompute();
  });
  if (flipStacksBtn) {
    flipStacksBtn.addEventListener('click', function () {
      stackFlipOrder = !stackFlipOrder;
      flipStacksBtn.textContent = stackFlipOrder ? 'Restore stack order' : 'Flip stack order';
      recompute();
    });
  }

  // Initial
  initializeScenarios();
  initializeUploads();
  rebuild();
})();

// Panel helpers
function openEditPanel(){
  var panel = document.getElementById('editPanel'); if (!panel) return;
  // Pull current values
  var rv = window.rowVarName || 'Rows';
  var cv = window.colVarName || 'Columns';
  var rl = (window.rowLabels && window.rowLabels.length) ? window.rowLabels.join(', ') : '';
  var cl = (window.colLabels && window.colLabels.length) ? window.colLabels.join(', ') : '';
  var editRowVar = document.getElementById('editRowVar');
  var editColVar = document.getElementById('editColVar');
  var editRowLabels = document.getElementById('editRowLabels');
  var editColLabels = document.getElementById('editColLabels');
  if (editRowVar) editRowVar.value = rv;
  if (editColVar) editColVar.value = cv;
  if (editRowLabels) editRowLabels.value = rl;
  if (editColLabels) editColLabels.value = cl;
  panel.style.display = 'flex';
}
function closeEditPanel(){ var panel = document.getElementById('editPanel'); if (panel) panel.style.display = 'none'; }
function applyEditNames(){
  var editRowVar = document.getElementById('editRowVar');
  var editColVar = document.getElementById('editColVar');
  var editRowLabels = document.getElementById('editRowLabels');
  var editColLabels = document.getElementById('editColLabels');
  window.rowVarName = (editRowVar && editRowVar.value.trim()) ? editRowVar.value.trim() : 'Rows';
  window.colVarName = (editColVar && editColVar.value.trim()) ? editColVar.value.trim() : 'Columns';
  var R = (document.getElementById('rows') && parseInt(document.getElementById('rows').value,10)) || 2;
  var C = (document.getElementById('cols') && parseInt(document.getElementById('cols').value,10)) || 2;
  var rls = (editRowLabels && editRowLabels.value) ? editRowLabels.value.split(',') : [];
  var cls = (editColLabels && editColLabels.value) ? editColLabels.value.split(',') : [];
  window.rowLabels = [];
  for (var i=0;i<R;i++){ var t=(rls[i]||'').trim(); window.rowLabels.push(t? t : ('Row '+(i+1))); }
  window.colLabels = [];
  for (var j=0;j<C;j++){ var tt=(cls[j]||'').trim(); window.colLabels.push(tt? tt : ('Col '+(j+1))); }
  // also update the control inputs for transparency
  var rInput = document.getElementById('rowLabelsInput'); if (rInput) rInput.value = window.rowLabels.join(', ');
  var cInput = document.getElementById('colLabelsInput'); if (cInput) cInput.value = window.colLabels.join(', ');
  // refresh header texts and outputs
  if (typeof updateHeaderTexts === 'function') updateHeaderTexts();
  var obs = (function(){ var tc=document.getElementById('tableContainer'); var t=tc?tc.querySelector('table'):null; if(!t) return null; var rows=Array.prototype.slice.call(t.querySelectorAll('tbody tr')); if(rows.length===0) return null; return rows.map(function(tr){ return Array.prototype.slice.call(tr.querySelectorAll('input[type="number"]')).map(function(inp){ var v=typeof inp.valueAsNumber==='number'&&!isNaN(inp.valueAsNumber)?inp.valueAsNumber:parseFloat(inp.value); return !isFinite(v)||v<0?0:v;});}); })();
  if (obs) {
    var app = window;
    // Recompute totals/expected/chart via existing recompute
    var evt=new Event('change'); var rowsEl=document.getElementById('rows'); if(rowsEl) rowsEl.dispatchEvent(evt); // trigger safe path
  }
  closeEditPanel();
}
