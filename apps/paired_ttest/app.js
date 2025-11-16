const CREATED_DATE = new Date('2025-11-06').toLocaleDateString();
let modifiedDate = new Date().toLocaleDateString();

const InputModes = Object.freeze({
    MANUAL: 'manual',
    PAIRED: 'paired',
    DIFFERENCE: 'difference',
    SUMMARY: 'summary'
});

const MODE_LABELS = {
    [InputModes.MANUAL]: 'Manual entry',
    [InputModes.PAIRED]: 'Paired upload',
    [InputModes.DIFFERENCE]: 'Difference upload',
    [InputModes.SUMMARY]: 'Summary stats'
};

const ManualStructures = Object.freeze({
    PAIRED: 'paired',
    DIFFERENCE: 'difference'
});

const DEFAULT_MANUAL_ROWS = 8;
const MAX_MANUAL_ROWS = 50;
const MAX_UPLOAD_ROWS = 2000;

let activeMode = InputModes.PAIRED;
let selectedConfidenceLevel = 0.95;
let manualStructure = ManualStructures.PAIRED;
let manualRowCount = DEFAULT_MANUAL_ROWS;
let scenarioManifest = [];
let defaultScenarioDescription = '';
let scenarioRawFile = '';
let uploadedPairedData = null;
let uploadedDifferenceData = null;

// Utility helpers
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatNumber(value, decimals = 3) {
    if (!isFinite(value)) return '--';
    return Number(value).toFixed(decimals);
}

function mean(values) {
    if (!values.length) return NaN;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values) {
    if (values.length < 2) return NaN;
    const m = mean(values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
}

function erf(x) {
    const sign = Math.sign(x);
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}

function normCdf(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function logGamma(z) {
    const cof = [
        76.18009172947146,
        -86.50532032941677,
        24.01409824083091,
        -1.231739572450155,
        0.1208650973866179e-2,
        -0.5395239384953e-5
    ];
    let x = z;
    let y = z;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < cof.length; j++) {
        ser += cof[j] / ++y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betacf(x, a, b) {
    const MAX_ITER = 200;
    const EPS = 3e-7;
    const FPMIN = 1e-30;
    let qab = a + b;
    let qap = a + 1;
    let qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1, m2 = 2; m <= MAX_ITER; m++, m2 += 2) {
        let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        h *= d * c;
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < EPS) {
            break;
        }
    }
    return h;
}

function regularizedIncompleteBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(
        logGamma(a + b) - logGamma(a) - logGamma(b) +
        a * Math.log(x) + b * Math.log(1 - x)
    );
    if (x < (a + 1) / (a + b + 2)) {
        return bt * betacf(x, a, b) / a;
    }
    return 1 - bt * betacf(1 - x, b, a) / b;
}

function tCdf(value, df) {
    if (!isFinite(value) || df <= 0) return NaN;
    const x = df / (df + value * value);
    const ibeta = regularizedIncompleteBeta(x, df / 2, 0.5);
    return value > 0 ? 1 - 0.5 * ibeta : 0.5 * ibeta;
}

function tCritical(probability, df) {
    if (probability <= 0 || probability >= 1) return NaN;
    if (df <= 0) return NaN;
    const a1 = -39.6968302866538;
    const a2 = 220.946098424521;
    const a3 = -275.928510446969;
    const a4 = 138.357751867269;
    const a5 = -30.6647980661472;
    const a6 = 2.50662827745924;

    const b1 = -54.4760987982241;
    const b2 = 161.585836858041;
    const b3 = -155.698979859887;
    const b4 = 66.8013118877197;
    const b5 = -13.2806815528857;

    const c1 = -0.00778489400243029;
    const c2 = -0.322396458041136;
    const c3 = -2.40075827716184;
    const c4 = -2.54973253934373;
    const c5 = 4.37466414146497;
    const c6 = 2.93816398269878;

    const d1 = 0.00778469570904146;
    const d2 = 0.32246712907004;
    const d3 = 2.445134137143;
    const d4 = 3.75440866190742;

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q;
    let r;
    let result;
    if (probability < pLow) {
        q = Math.sqrt(-2 * Math.log(probability));
        result = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (probability <= pHigh) {
        q = probability - 0.5;
        r = q * q;
        result = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
            (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
        q = Math.sqrt(-2 * Math.log(1 - probability));
        result = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
    const z = result;
    const z2 = z * z;
    const z3 = z2 * z;
    const z5 = z3 * z2;
    return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df * df);
}

function formatPValue(p) {
    if (!isFinite(p)) return 'p = --';
    if (p < 0.001) return 'p < .001';
    return `p = ${p.toFixed(3).replace(/^0/, '')}`;
}

function snapshotManualPairedValues() {
    const tbody = document.getElementById('paired-table-body');
    if (!tbody) return [];
    return Array.from(tbody.querySelectorAll('tr')).map(row => {
        const beforeInput = row.querySelector('.paired-before');
        const afterInput = row.querySelector('.paired-after');
        const before = beforeInput && beforeInput.value !== '' ? parseFloat(beforeInput.value) : NaN;
        const after = afterInput && afterInput.value !== '' ? parseFloat(afterInput.value) : NaN;
        return { before, after };
    });
}

function snapshotManualDifferenceValues() {
    const tbody = document.getElementById('difference-table-body');
    if (!tbody) return [];
    return Array.from(tbody.querySelectorAll('tr')).map(row => {
        const valueInput = row.querySelector('.diff-value');
        const diff = valueInput && valueInput.value !== '' ? parseFloat(valueInput.value) : NaN;
        return { diff };
    });
}

function renderPairedRows(existingValues = []) {
    const tbody = document.getElementById('paired-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (let i = 0; i < manualRowCount; i++) {
        const beforeValue = existingValues[i] && isFinite(existingValues[i].before) ? existingValues[i].before : '';
        const afterValue = existingValues[i] && isFinite(existingValues[i].after) ? existingValues[i].after : '';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="row-number">${i + 1}</span></td>
            <td><input type="number" class="paired-before" step="any" value="${beforeValue !== '' ? beforeValue : ''}"></td>
            <td><input type="number" class="paired-after" step="any" value="${afterValue !== '' ? afterValue : ''}"></td>
        `;
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => updateResults());
        });
        tbody.appendChild(row);
    }
}

function renderDifferenceRows(existingValues = []) {
    const tbody = document.getElementById('difference-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (let i = 0; i < manualRowCount; i++) {
        const diffValue = existingValues[i] && isFinite(existingValues[i].diff) ? existingValues[i].diff : '';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="row-number">${i + 1}</span></td>
            <td><input type="number" class="diff-value" step="any" value="${diffValue !== '' ? diffValue : ''}"></td>
        `;
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => updateResults());
        });
        tbody.appendChild(row);
    }
}

function setManualRowCount(value, { preserveValues = true } = {}) {
    const parsed = Number.isInteger(value) ? value : parseInt(value, 10);
    const clamped = clamp(isFinite(parsed) ? parsed : DEFAULT_MANUAL_ROWS, 2, MAX_MANUAL_ROWS);
    const pairedValues = preserveValues ? snapshotManualPairedValues() : [];
    const diffValues = preserveValues ? snapshotManualDifferenceValues() : [];
    manualRowCount = clamped;
    const input = document.getElementById('manual-row-count');
    if (input && parseInt(input.value, 10) !== clamped) {
        input.value = clamped;
    }
    renderPairedRows(pairedValues);
    renderDifferenceRows(diffValues);
}

function toggleManualStructureViews() {
    document.querySelectorAll('.manual-table').forEach(section => {
        const isActive = section.dataset.structure === manualStructure;
        section.classList.toggle('hidden', !isActive);
    });
    const select = document.getElementById('manual-entry-structure');
    if (select) {
        select.value = manualStructure;
    }
}

function setupManualControls() {
    const structureSelect = document.getElementById('manual-entry-structure');
    if (structureSelect) {
        structureSelect.addEventListener('change', () => {
            manualStructure = structureSelect.value === ManualStructures.DIFFERENCE
                ? ManualStructures.DIFFERENCE
                : ManualStructures.PAIRED;
            toggleManualStructureViews();
            updateResults();
        });
    }
    const rowCountInput = document.getElementById('manual-row-count');
    if (rowCountInput) {
        rowCountInput.addEventListener('change', () => {
            const value = parseInt(rowCountInput.value, 10);
            setManualRowCount(value);
            updateResults();
        });
    }
    setManualRowCount(manualRowCount, { preserveValues: false });
    toggleManualStructureViews();
}

function collectPairedRows() {
    const rows = [];
    const beforeValues = [];
    const afterValues = [];
    const differenceValues = [];
    const partialRows = [];
    const tbody = document.getElementById('paired-table-body');
    if (!tbody) {
        return { rows, beforeValues, afterValues, differenceValues, partialRows };
    }
    tbody.querySelectorAll('tr').forEach((row, index) => {
        const beforeInput = row.querySelector('.paired-before');
        const afterInput = row.querySelector('.paired-after');
        const before = beforeInput && beforeInput.value !== '' ? parseFloat(beforeInput.value) : NaN;
        const after = afterInput && afterInput.value !== '' ? parseFloat(afterInput.value) : NaN;
        const hasBefore = isFinite(before);
        const hasAfter = isFinite(after);
        if (hasBefore && hasAfter) {
            const diff = after - before;
            rows.push({ before, after, diff });
            beforeValues.push(before);
            afterValues.push(after);
            differenceValues.push(diff);
        } else if (hasBefore || hasAfter) {
            partialRows.push(`Row ${index + 1}`);
        }
    });
    return { rows, beforeValues, afterValues, differenceValues, partialRows };
}

function collectDifferenceRows() {
    const values = [];
    const tbody = document.getElementById('difference-table-body');
    if (!tbody) return values;
    tbody.querySelectorAll('tr').forEach((row) => {
        const valueInput = row.querySelector('.diff-value');
        const diff = valueInput && valueInput.value !== '' ? parseFloat(valueInput.value) : NaN;
        if (isFinite(diff)) {
            values.push(diff);
        }
    });
    return values;
}

function collectSummaryStats() {
    const meanInput = document.getElementById('summary-mean');
    const sdInput = document.getElementById('summary-sd');
    const nInput = document.getElementById('summary-n');
    const meanDiff = meanInput ? parseFloat(meanInput.value) : NaN;
    const sdDiff = sdInput ? parseFloat(sdInput.value) : NaN;
    const n = nInput ? parseInt(nInput.value, 10) : NaN;
    return { meanDiff, sdDiff, n };
}
function gatherInput() {
    const alphaInput = document.getElementById('alpha');
    const alpha = alphaInput ? parseFloat(alphaInput.value) : 0.05;
    if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) {
        return { valid: false, message: 'Alpha must be between 0 and 1.' };
    }

    if (activeMode === InputModes.MANUAL) {
        if (manualStructure === ManualStructures.PAIRED) {
            const { beforeValues, afterValues, differenceValues, partialRows } = collectPairedRows();
            if (partialRows.length) {
                return { valid: false, message: `Complete both before and after values for ${partialRows.join(', ')}.` };
            }
            if (differenceValues.length < 2) {
                return { valid: false, message: 'Provide at least two paired observations.' };
            }
            return {
                valid: true,
                data: {
                    mode: InputModes.MANUAL,
                    manualStructure,
                    alpha,
                    confidence: selectedConfidenceLevel,
                    differences: differenceValues,
                    beforeValues,
                    afterValues,
                    summaryOnly: false
                }
            };
        }
        const diffs = collectDifferenceRows();
        if (diffs.length < 2) {
            return { valid: false, message: 'Enter at least two difference scores.' };
        }
        return {
            valid: true,
            data: {
                mode: InputModes.MANUAL,
                manualStructure,
                alpha,
                confidence: selectedConfidenceLevel,
                differences: diffs,
                beforeValues: [],
                afterValues: [],
                summaryOnly: false
            }
        };
    }

    if (activeMode === InputModes.PAIRED) {
        if (!uploadedPairedData || !Array.isArray(uploadedPairedData.differences) || uploadedPairedData.differences.length < 2) {
            return { valid: false, message: 'Upload at least two paired observations.' };
        }
        return {
            valid: true,
            data: {
                mode: InputModes.PAIRED,
                alpha,
                confidence: selectedConfidenceLevel,
                differences: uploadedPairedData.differences,
                beforeValues: uploadedPairedData.beforeValues,
                afterValues: uploadedPairedData.afterValues,
                summaryOnly: false
            }
        };
    }

    if (activeMode === InputModes.DIFFERENCE) {
        if (!uploadedDifferenceData || !Array.isArray(uploadedDifferenceData.differences) || uploadedDifferenceData.differences.length < 2) {
            return { valid: false, message: 'Upload at least two difference scores.' };
        }
        return {
            valid: true,
            data: {
                mode: InputModes.DIFFERENCE,
                alpha,
                confidence: selectedConfidenceLevel,
                differences: uploadedDifferenceData.differences,
                beforeValues: [],
                afterValues: [],
                summaryOnly: false
            }
        };
    }

    if (activeMode === InputModes.SUMMARY) {
        const stats = collectSummaryStats();
        if (!isFinite(stats.meanDiff)) {
            return { valid: false, message: 'Enter a numeric mean difference.' };
        }
        if (!isFinite(stats.sdDiff) || stats.sdDiff <= 0) {
            return { valid: false, message: 'Standard deviation of differences must be positive.' };
        }
        if (!Number.isInteger(stats.n) || stats.n < 2) {
            return { valid: false, message: 'Sample size must be at least 2.' };
        }
        return {
            valid: true,
            data: {
                mode: InputModes.SUMMARY,
                alpha,
                confidence: selectedConfidenceLevel,
                pairs: [],
                differences: [],
                summaryStats: stats,
                summaryOnly: true
            }
        };
    }

    return { valid: false, message: 'Unsupported mode.' };
}

function computePairedTest(data) {
    const alpha = clamp(data.alpha, 1e-6, 0.5);
    let n;
    let meanDiff;
    let sdDiff;
    if (data.summaryOnly && data.summaryStats) {
        ({ n, meanDiff, sdDiff } = data.summaryStats);
    } else {
        const diffs = data.differences || [];
        n = diffs.length;
        meanDiff = mean(diffs);
        sdDiff = standardDeviation(diffs);
    }
    if (!Number.isInteger(n) || n < 2) {
        return null;
    }
    const df = n - 1;
    const standardError = sdDiff / Math.sqrt(n);
    const tStatistic = standardError > 0 ? meanDiff / standardError : NaN;
    const pValue = isFinite(tStatistic) ? 2 * (1 - tCdf(Math.abs(tStatistic), df)) : NaN;
    const ciCritical = tCritical(1 - alpha / 2, df);
    const ciHalfWidth = ciCritical * standardError;
    const ciLower = meanDiff - ciHalfWidth;
    const ciUpper = meanDiff + ciHalfWidth;
    const cohenDz = sdDiff > 0 ? meanDiff / sdDiff : NaN;
    const hedgesG = isFinite(cohenDz) && df > 1 ? cohenDz * (1 - (3 / (4 * df - 1))) : cohenDz;

    let beforeMean = NaN;
    let afterMean = NaN;
    if (data.beforeValues && data.afterValues && data.beforeValues.length > 0) {
        beforeMean = mean(data.beforeValues);
        afterMean = mean(data.afterValues);
    }

    return {
        n,
        df,
        alpha,
        meanDiff,
        sdDiff,
        standardError,
        tStatistic,
        pValue,
        ciLower,
        ciUpper,
        ciLevel: 1 - alpha,
        cohenDz,
        hedgesG,
        beforeMean,
        afterMean
    };
}

function describeModeLabel(data) {
    if (data && data.mode === InputModes.MANUAL) {
        const detail = data.manualStructure === ManualStructures.DIFFERENCE
            ? 'differences'
            : 'paired values';
        return `${MODE_LABELS[InputModes.MANUAL]} (${detail})`;
    }
    if (data && data.mode && MODE_LABELS[data.mode]) {
        return MODE_LABELS[data.mode];
    }
    if (MODE_LABELS[activeMode]) {
        return MODE_LABELS[activeMode];
    }
    return MODE_LABELS[InputModes.MANUAL];
}

function updateResultCards(stats, data) {
    const testStat = document.getElementById('test-statistic');
    const pValue = document.getElementById('p-value');
    const ciSummary = document.getElementById('ci-summary');
    const effectSize = document.getElementById('effect-size');
    const hedges = document.getElementById('hedges-g');
    const meanDiff = document.getElementById('mean-diff');
    const sampleSummary = document.getElementById('sample-summary');
    const modeSummary = document.getElementById('mode-summary');

    if (!stats) {
        testStat.textContent = 't(--)=--';
        pValue.textContent = 'p = --';
        ciSummary.textContent = 'CI: [--, --]';
        effectSize.textContent = 'Cohen\'s dz = --';
        hedges.textContent = 'Hedges\' g = --';
        meanDiff.textContent = 'Mean difference = --';
        sampleSummary.textContent = 'n = -- pairs';
        modeSummary.textContent = `Mode: ${describeModeLabel({ mode: activeMode, manualStructure })}`;
        return;
    }

    testStat.textContent = `t(${stats.df}) = ${formatNumber(stats.tStatistic, 3)}`;
    pValue.textContent = formatPValue(stats.pValue);
    ciSummary.textContent = `${Math.round((1 - stats.alpha) * 100)}% CI: [${formatNumber(stats.ciLower)}, ${formatNumber(stats.ciUpper)}]`;
    effectSize.textContent = `Cohen's dz = ${formatNumber(stats.cohenDz, 3)}`;
    hedges.textContent = `Hedges' g = ${formatNumber(stats.hedgesG, 3)}`;
    meanDiff.textContent = `Mean difference = ${formatNumber(stats.meanDiff, 3)}`;
    sampleSummary.textContent = `n = ${stats.n} pairs`;
    modeSummary.textContent = `Mode: ${describeModeLabel(data)}`;
}

function renderMeanDifferenceChart(stats) {
    if (!window.Plotly) return;
    const container = document.getElementById('mean-diff-chart');
    const note = document.getElementById('mean-diff-chart-note');
    if (!container) return;
    if (!stats) {
        Plotly.purge(container);
        if (note) {
            note.textContent = 'Provide data to summarize the mean difference and confidence interval.';
        }
        return;
    }
    const trace = {
        x: [stats.meanDiff],
        y: ['Mean difference'],
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: 'rgba(42, 125, 225, 0.9)',
            size: 14,
            line: { color: '#fff', width: 2 }
        },
        error_x: {
            type: 'data',
            symmetric: true,
            array: [stats.meanDiff - stats.ciLower],
            color: '#1f2a37',
            thickness: 2
        },
        hovertemplate: `Mean diff = ${formatNumber(stats.meanDiff, 3)}<br>${Math.round((1 - stats.alpha) * 100)}% CI: [${formatNumber(stats.ciLower)}, ${formatNumber(stats.ciUpper)}]<extra></extra>`
    };

    const layout = {
        margin: { l: 80, r: 40, t: 20, b: 50 },
        xaxis: {
            zeroline: true,
            zerolinecolor: '#c6d0e0',
            title: 'Difference (after - before)',
            gridcolor: '#eef2fb'
        },
        yaxis: {
            showticklabels: false
        },
        shapes: [{
            type: 'line',
            x0: 0,
            x1: 0,
            y0: -0.5,
            y1: 0.5,
            line: {
                color: '#b0b7c6',
                width: 2,
                dash: 'dot'
            }
        }],
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: 320
    };
    Plotly.react(container, [trace], layout, { responsive: true, displayModeBar: false });
    if (note) {
        const ciLabel = `${Math.round((1 - stats.alpha) * 100)}% CI`;
        note.textContent = `Mean diff = ${formatNumber(stats.meanDiff, 3)}; ${ciLabel}: [${formatNumber(stats.ciLower)}, ${formatNumber(stats.ciUpper)}]`;
    }
}

function renderDifferenceChart(data) {
    const container = document.getElementById('difference-chart');
    const note = document.getElementById('difference-chart-note');
    if (!container || !note) return;
    if (!window.Plotly) return;

    const diffs = Array.isArray(data.differences) ? data.differences : [];
    if (!diffs.length) {
        Plotly.purge(container);
        note.textContent = data.summaryOnly
            ? 'Add raw paired or difference data to visualize the distribution.'
            : 'Enter at least two difference scores to view the histogram.';
        return;
    }
    if (diffs.length < 3) {
        Plotly.purge(container);
        note.textContent = 'Need at least three difference scores to summarize a distribution.';
        return;
    }
    note.textContent = `Mean = ${formatNumber(mean(diffs))}, SD = ${formatNumber(standardDeviation(diffs))} (bars show % of total).`;

    const trace = {
        x: diffs,
        type: 'histogram',
        histnorm: 'percent',
        marker: {
            color: 'rgba(42, 125, 225, 0.4)',
            line: { color: 'rgba(42, 125, 225, 0.8)', width: 1 }
        },
        nbinsx: Math.min(30, Math.ceil(Math.sqrt(diffs.length))),
        hovertemplate: 'Percent: %{y:.1f}%<br>Difference: %{x:.2f}<extra></extra>'
    };

    const layout = {
        margin: { l: 60, r: 20, t: 20, b: 50 },
        bargap: 0.05,
        xaxis: {
            title: 'Difference (after - before)',
            zeroline: true,
            zerolinecolor: '#c6d0e0',
            gridcolor: '#eef2fb'
        },
        yaxis: {
            title: 'Percent of observations',
            gridcolor: '#eef2fb'
        },
        shapes: [{
            type: 'line',
            x0: 0,
            x1: 0,
            y0: 0,
            y1: 1,
            yref: 'paper',
            line: {
                color: '#d64747',
                width: 2,
                dash: 'dot'
            }
        }],
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: 320
    };

    Plotly.react(container, [trace], layout, { responsive: true, displayModeBar: false });
}

function updateNarratives(stats, data) {
    const apa = document.getElementById('apa-report');
    const managerial = document.getElementById('managerial-report');
    if (!stats || !apa || !managerial) {
        if (apa) apa.textContent = 'Summary will appear after analysis.';
        if (managerial) managerial.textContent = 'Summary will appear after analysis.';
        return;
    }

    const pText = formatPValue(stats.pValue);
    const ciText = `${Math.round((1 - stats.alpha) * 100)}% CI [${formatNumber(stats.ciLower)}, ${formatNumber(stats.ciUpper)}]`;
    let apaSentence = `A paired-samples t-test indicated that the mean difference (${formatNumber(stats.meanDiff)}) `;
    apaSentence += stats.pValue < stats.alpha
        ? `was statistically significant, t(${stats.df}) = ${formatNumber(stats.tStatistic, 3)}, ${pText}, ${ciText}.`
        : `did not differ significantly from zero, t(${stats.df}) = ${formatNumber(stats.tStatistic, 3)}, ${pText}, ${ciText}.`;
    if (isFinite(stats.beforeMean) && isFinite(stats.afterMean)) {
        apaSentence += ` The before mean was ${formatNumber(stats.beforeMean, 3)} and the after mean was ${formatNumber(stats.afterMean, 3)}.`;
    }
    apa.textContent = apaSentence;

    const liftDescription = stats.meanDiff > 0
        ? 'an increase relative to baseline'
        : stats.meanDiff < 0
            ? 'a decrease relative to baseline'
            : 'no directional change';
    const decisionCue = stats.pValue < stats.alpha
        ? 'Treat the shift as a reliable lift and prioritize rollout or scaling decisions accordingly.'
        : 'Treat the observed shift as directional only; gather more data or pair the test with qualitative signals before reallocating budget.';
    managerial.textContent = `The average paired difference of ${formatNumber(stats.meanDiff)} suggests ${liftDescription}. ${decisionCue}`;
}

function updateDiagnostics(stats, data) {
    const container = document.getElementById('diagnostics-content');
    if (!container) return;
    if (!stats) {
        container.innerHTML = '<p>Provide data to review assumption checks.</p>';
        return;
    }
    const diagnostics = [];
    const n = stats.n;
    let sampleStatus = 'good';
    let sampleMessage = 'Sample size comfortably supports the paired t-test.';
    if (n < 10) {
        sampleStatus = 'alert';
        sampleMessage = 'Fewer than 10 pairs leaves the test sensitive to outliers. Treat conclusions cautiously or add more observations.';
    } else if (n < 20) {
        sampleStatus = 'caution';
        sampleMessage = 'Sample size is modest. Review the histogram of differences and document the limitation.';
    }
    diagnostics.push({ title: 'Sample size', status: sampleStatus, message: sampleMessage });

    if (!data.summaryOnly && Array.isArray(data.differences) && data.differences.length >= 3) {
        const diffs = data.differences;
        const sd = standardDeviation(diffs);
        const m = mean(diffs);
        const skewNumerator = diffs.reduce((sum, diff) => sum + Math.pow(diff - m, 3), 0);
        const skew = sd > 0 ? skewNumerator / (diffs.length * Math.pow(sd, 3)) : 0;
        let skewStatus = 'good';
        let skewMessage = 'Difference scores are roughly symmetric.';
        if (Math.abs(skew) > 1) {
            skewStatus = 'alert';
            skewMessage = 'Differences appear heavily skewed. Consider a non-parametric alternative or transform the metric.';
        } else if (Math.abs(skew) > 0.5) {
            skewStatus = 'caution';
            skewMessage = 'Moderate skew detected. Inspect the histogram for influential cases.';
        }
        diagnostics.push({ title: 'Shape of differences', status: skewStatus, message: skewMessage });

        const maxDiff = Math.max(...diffs);
        const minDiff = Math.min(...diffs);
        let spreadStatus = 'good';
        let spreadMessage = 'Difference spread looks reasonable.';
        if (Math.abs(maxDiff - minDiff) > 6 * (sd || 1)) {
            spreadStatus = 'alert';
            spreadMessage = 'Very wide spread hints at outliers or inconsistent pairing. Audit the raw rows before acting.';
        }
        diagnostics.push({ title: 'Spread/outliers', status: spreadStatus, message: spreadMessage });
    } else {
        diagnostics.push({
            title: 'Shape of differences',
            status: 'caution',
            message: 'Provide raw differences to visualize skewness and potential outliers.'
        });
    }

    diagnostics.push({
        title: 'Independence check',
        status: 'good',
        message: 'Pairs should come from the same units (e.g., customers, regions) while each pair remains independent from the next. Confirm the sampling plan upholds this.'
    });

    const items = diagnostics.map(item => `
        <div class="diagnostic-item ${item.status}">
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.message)}</p>
        </div>
    `).join('');
    container.innerHTML = items;
}

function updateStatus(message, isError = false) {
    const status = document.getElementById('status-message');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
}

function clearVisuals() {
    if (window.Plotly) {
        Plotly.purge('mean-diff-chart');
        Plotly.purge('difference-chart');
    }
    const meanNote = document.getElementById('mean-diff-chart-note');
    if (meanNote) {
        meanNote.textContent = 'Provide data to summarize the mean difference and confidence interval.';
    }
    const diffNote = document.getElementById('difference-chart-note');
    if (diffNote) {
        diffNote.textContent = '';
    }
    updateResultCards(null, { mode: activeMode, manualStructure });
    updateNarratives(null, null);
    updateDiagnostics(null, null);
}

function updateResults() {
    const { valid, message, data } = gatherInput();
    if (!valid) {
        updateStatus(message, true);
        clearVisuals();
        return;
    }
    const stats = computePairedTest(data);
    if (!stats) {
        updateStatus('Unable to compute test statistics. Double-check your inputs.', true);
        clearVisuals();
        return;
    }
    updateStatus('Analysis complete. Interpret the cards, charts, and diagnostics below.');
    updateResultCards(stats, data);
    renderMeanDifferenceChart(stats);
    renderDifferenceChart(data);
    updateNarratives(stats, data);
    updateDiagnostics(stats, data);
    modifiedDate = new Date().toLocaleDateString();
    const modifiedLabel = document.getElementById('modified-date');
    if (modifiedLabel) {
        modifiedLabel.textContent = modifiedDate;
    }
}
function switchMode(mode, { suppressUpdate = false } = {}) {
    if (!Object.values(InputModes).includes(mode)) {
        return;
    }
    activeMode = mode;
    document.querySelectorAll('.mode-button').forEach(button => {
        button.classList.toggle('active', button.dataset.mode === mode);
    });
    document.querySelectorAll('.mode-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.mode === mode);
    });
    const importTools = document.getElementById('import-tools');
    if (importTools) {
        importTools.classList.toggle('hidden', mode === InputModes.SUMMARY || mode === InputModes.MANUAL);
    }
    const instructions = document.getElementById('dropzone-instructions');
    if (instructions) {
        if (mode === InputModes.PAIRED) {
            instructions.textContent = 'Provide two named columns such as before,after (up to 2,000 rows). Each row becomes a matched pair.';
        } else if (mode === InputModes.DIFFERENCE) {
            instructions.textContent = 'Provide a single column named diff with up to 2,000 rows of observed differences.';
        }
    }
    refreshScenarioDownloadVisibility();
    if (!suppressUpdate) {
        updateResults();
    }
}

function setupModeButtons() {
    document.querySelectorAll('.mode-button').forEach(button => {
        button.addEventListener('click', () => {
            switchMode(button.dataset.mode || InputModes.PAIRED);
        });
    });
}

function activateConfidenceButton(level) {
    document.querySelectorAll('.confidence-button').forEach(button => {
        const buttonLevel = parseFloat(button.dataset.level);
        const isActive = Math.abs(buttonLevel - level) < 1e-6;
        button.classList.toggle('active', isActive);
    });
}

function syncConfidenceToAlpha(alpha, { skipUpdate = false } = {}) {
    selectedConfidenceLevel = 1 - alpha;
    if ([0.9, 0.95, 0.99].some(level => Math.abs(level - selectedConfidenceLevel) < 1e-6)) {
        activateConfidenceButton(selectedConfidenceLevel);
    } else {
        activateConfidenceButton(-1);
    }
    if (!skipUpdate) {
        updateResults();
    }
}

function setupConfidenceButtons() {
    document.querySelectorAll('.confidence-button').forEach(button => {
        button.addEventListener('click', () => {
            const level = parseFloat(button.dataset.level);
            if (!isFinite(level)) return;
            selectedConfidenceLevel = level;
            const alphaInput = document.getElementById('alpha');
            if (alphaInput) {
                alphaInput.value = (1 - level).toFixed(3);
            }
            activateConfidenceButton(level);
            updateResults();
        });
    });
}

function setupAlphaControl() {
    const alphaInput = document.getElementById('alpha');
    if (!alphaInput) return;
    alphaInput.addEventListener('input', () => {
        const value = parseFloat(alphaInput.value);
        if (!isFinite(value) || value <= 0 || value >= 1) {
            return;
        }
        syncConfidenceToAlpha(value);
    });
    const initialAlpha = parseFloat(alphaInput.value);
    if (isFinite(initialAlpha)) {
        syncConfidenceToAlpha(initialAlpha, { skipUpdate: true });
    } else {
        alphaInput.value = (1 - selectedConfidenceLevel).toFixed(3);
    }
}

function detectDelimiter(line) {
    if (line.includes('\t')) return '\t';
    return ',';
}

function parseDelimitedText(text, expectedColumns, { maxRows = MAX_UPLOAD_ROWS } = {}) {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('File is empty.');
    }
    const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length);
    if (lines.length < 2) {
        throw new Error('File must include a header row and at least one data row.');
    }
    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.trim());
    if (headers.length !== expectedColumns) {
        throw new Error(`Expected ${expectedColumns} column(s) but found ${headers.length}.`);
    }
    const rows = [];
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map(part => part.trim());
        if (parts.every(part => part === '')) {
            continue;
        }
        if (parts.length !== headers.length) {
            errors.push(`Row ${i + 1}: wrong number of columns.`);
            continue;
        }
        const numericValues = parts.map(value => parseFloat(value));
        if (numericValues.some(value => !isFinite(value))) {
            errors.push(`Row ${i + 1}: non-numeric value detected.`);
            continue;
        }
        rows.push(numericValues);
        if (rows.length > maxRows) {
            throw new Error(`Upload limit exceeded: Only ${maxRows} row(s) are supported per file. Use a summary or split the dataset.`);
        }
    }
    if (!rows.length) {
        throw new Error(errors.length ? errors[0] : 'No numeric rows found.');
    }
    return { headers, rows, errors };
}

function setFileFeedback(message, type = '') {
    const feedback = document.getElementById('file-feedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove('success', 'error');
    if (type) {
        feedback.classList.add(type);
    }
}

function updateUploadStatus(mode, message, status = '') {
    let targetId = '';
    if (mode === InputModes.PAIRED) {
        targetId = 'paired-upload-status';
    } else if (mode === InputModes.DIFFERENCE) {
        targetId = 'difference-upload-status';
    }
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    target.textContent = message;
    target.classList.remove('success', 'error');
    if (status) {
        target.classList.add(status);
    }
}

function importPairedData(text) {
    try {
        const { headers, rows, errors } = parseDelimitedText(text, 2, { maxRows: MAX_UPLOAD_ROWS });
        uploadedPairedData = {
            beforeValues: rows.map(values => values[0]),
            afterValues: rows.map(values => values[1]),
            differences: rows.map(values => values[1] - values[0]),
            rowCount: rows.length
        };
        const skippedNote = errors.length ? ` Skipped ${errors.length} row(s).` : '';
        const headerNote = headers.join(', ');
        setFileFeedback(`Loaded ${rows.length} pairs from ${headerNote}.${skippedNote}`, 'success');
        updateUploadStatus(InputModes.PAIRED, `${rows.length} pair(s) ready.${skippedNote}`, 'success');
        updateResults();
    } catch (error) {
        uploadedPairedData = null;
        updateUploadStatus(InputModes.PAIRED, error.message, 'error');
        setFileFeedback(error.message, 'error');
        throw error;
    }
}

function importDifferenceData(text) {
    try {
        const { headers, rows, errors } = parseDelimitedText(text, 1, { maxRows: MAX_UPLOAD_ROWS });
        uploadedDifferenceData = {
            differences: rows.map(values => values[0]),
            rowCount: rows.length
        };
        const skippedNote = errors.length ? ` Skipped ${errors.length} row(s).` : '';
        const column = headers[0] || 'diff';
        setFileFeedback(`Loaded ${rows.length} differences from column "${column}".${skippedNote}`, 'success');
        updateUploadStatus(InputModes.DIFFERENCE, `${rows.length} difference(s) ready.${skippedNote}`, 'success');
        updateResults();
    } catch (error) {
        uploadedDifferenceData = null;
        updateUploadStatus(InputModes.DIFFERENCE, error.message, 'error');
        setFileFeedback(error.message, 'error');
        throw error;
    }
}

function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
        if (activeMode === InputModes.PAIRED) {
            try {
                importPairedData(event.target.result);
            } catch {
                // Errors already surfaced via status text.
            }
        } else if (activeMode === InputModes.DIFFERENCE) {
            try {
                importDifferenceData(event.target.result);
            } catch {
                // Errors already surfaced via status text.
            }
        } else {
            setFileFeedback('Switch to a paired or difference upload mode to import files.', 'error');
        }
    };
    reader.onerror = () => setFileFeedback('Unable to read the file.', 'error');
    reader.readAsText(file);
}

function setupDropzone() {
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('file-input');
    const browseButton = document.getElementById('browse-files');
    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.add('drag-active');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            if (event.type === 'drop') {
                const file = event.dataTransfer.files[0];
                handleFile(file);
            }
            dropzone.classList.remove('drag-active');
        });
    });
    dropzone.addEventListener('click', () => fileInput.click());
    if (browseButton) {
        browseButton.addEventListener('click', event => {
            event.stopPropagation();
            fileInput.click();
        });
    }
    fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
        fileInput.value = '';
    });
}

function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function setupTemplateDownloads() {
    const pairedButton = document.getElementById('download-paired-template');
    const diffButton = document.getElementById('download-diff-template');
    if (pairedButton) {
        pairedButton.addEventListener('click', () => {
            const content = 'label,before,after\nSample 1,45,52\nSample 2,38,47\nSample 3,55,63\n';
            downloadTextFile('paired_template.csv', content);
        });
    }
    if (diffButton) {
        diffButton.addEventListener('click', () => {
            const content = 'diff\n7\n9\n-2\n4\n';
            downloadTextFile('difference_template.csv', content);
        });
    }
}

function refreshScenarioDownloadVisibility() {
    const button = document.getElementById('scenario-download');
    if (!button) return;
    const shouldShow = Boolean(scenarioRawFile) && activeMode !== InputModes.MANUAL;
    button.classList.toggle('hidden', !shouldShow);
    button.disabled = !shouldShow;
}

function resetScenarioDownload() {
    const button = document.getElementById('scenario-download');
    scenarioRawFile = '';
    if (button) {
        button.disabled = true;
        button.removeAttribute('data-file');
        button.textContent = 'Download scenario dataset';
    }
    refreshScenarioDownloadVisibility();
}

function enableScenarioDownload(filePath) {
    const button = document.getElementById('scenario-download');
    if (!button) return;
    scenarioRawFile = filePath;
    if (filePath) {
        button.disabled = false;
        button.textContent = 'Download scenario dataset';
        button.setAttribute('data-file', filePath);
    } else {
        resetScenarioDownload();
        return;
    }
    refreshScenarioDownloadVisibility();
}

function setupScenarioDownloadButton() {
    const button = document.getElementById('scenario-download');
    if (!button) return;
    button.addEventListener('click', () => {
        if (!scenarioRawFile) return;
        const link = document.createElement('a');
        link.href = scenarioRawFile;
        link.download = scenarioRawFile.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
function renderScenarioDescription(title, description) {
    const container = document.getElementById('scenario-description');
    if (!container) return;
    if (!description) {
        container.innerHTML = defaultScenarioDescription;
        return;
    }
    const paragraphs = description.split(/\n{2,}/).map(text => text.trim()).filter(Boolean);
    const heading = title ? `<p><strong>${escapeHtml(title)}</strong></p>` : '';
    const content = paragraphs.length
        ? paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')
        : `<p>${escapeHtml(description)}</p>`;
    container.innerHTML = `${heading}${content}`;
}

function parseScenarioText(text) {
    const result = {
        title: '',
        description: '',
        alpha: NaN,
        mode: '',
        pairedData: '',
        differenceData: '',
        summaryStats: '',
        rawFile: ''
    };
    let currentSection = '';
    const lines = text.split(/\r?\n/);
    const descriptionLines = [];
    const pairedLines = [];
    const differenceLines = [];
    let summaryLine = '';
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            if (currentSection === 'description') {
                descriptionLines.push('');
            }
            return;
        }
        if (trimmed.startsWith('#')) {
            currentSection = trimmed.slice(1).trim().toLowerCase();
            return;
        }
        switch (currentSection) {
            case 'title':
                result.title = line.trim();
                break;
            case 'description':
                descriptionLines.push(line);
                break;
            case 'alpha':
                result.alpha = parseFloat(trimmed);
                break;
            case 'input mode':
                result.mode = trimmed.toLowerCase();
                break;
            case 'paired columns':
                pairedLines.push(line);
                break;
            case 'difference column':
                differenceLines.push(line);
                break;
            case 'summary stats':
                summaryLine = trimmed;
                break;
            case 'raw data file':
                if (trimmed.startsWith('file=')) {
                    result.rawFile = trimmed.split('=').slice(1).join('=').trim();
                }
                break;
            default:
                break;
        }
    });
    result.description = descriptionLines.join('\n').trim();
    result.pairedData = pairedLines.join('\n').trim();
    result.differenceData = differenceLines.join('\n').trim();
    result.summaryStats = summaryLine;
    return result;
}

function applyScenarioData(parsed) {
    if (parsed.mode === 'paired' && parsed.pairedData) {
        switchMode(InputModes.PAIRED, { suppressUpdate: true });
        importPairedData(parsed.pairedData);
    } else if (parsed.mode === 'difference' && parsed.differenceData) {
        switchMode(InputModes.DIFFERENCE, { suppressUpdate: true });
        importDifferenceData(parsed.differenceData);
    } else if (parsed.mode === 'summary' && parsed.summaryStats) {
        switchMode(InputModes.SUMMARY, { suppressUpdate: true });
        const [meanStr, sdStr, nStr] = parsed.summaryStats.split('|').map(part => part.trim());
        const meanInput = document.getElementById('summary-mean');
        const sdInput = document.getElementById('summary-sd');
        const nInput = document.getElementById('summary-n');
        if (meanInput) meanInput.value = meanStr || '';
        if (sdInput) sdInput.value = sdStr || '';
        if (nInput) nInput.value = nStr || '';
        updateResults();
    } else {
        updateResults();
    }
}

async function loadScenarioById(id) {
    const scenario = scenarioManifest.find(entry => entry.id === id);
    if (!scenario) {
        renderScenarioDescription('', '');
        resetScenarioDownload();
        return;
    }
    try {
        const response = await fetch(scenario.file, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Unable to load scenario file (${response.status})`);
        }
        const text = await response.text();
        const parsed = parseScenarioText(text);
        renderScenarioDescription(parsed.title || scenario.label, parsed.description);
        if (isFinite(parsed.alpha)) {
            const alphaInput = document.getElementById('alpha');
            if (alphaInput) {
                alphaInput.value = parsed.alpha.toFixed(3);
                syncConfidenceToAlpha(parsed.alpha, { skipUpdate: true });
            }
        }
        applyScenarioData(parsed);
        enableScenarioDownload(parsed.rawFile);
    } catch (error) {
        renderScenarioDescription('', `Unable to load scenario: ${error.message}`);
        resetScenarioDownload();
    }
}

async function setupScenarioSelector() {
    const select = document.getElementById('scenario-select');
    const description = document.getElementById('scenario-description');
    if (description) {
        defaultScenarioDescription = description.innerHTML;
    }
    if (!select) return;
    try {
        const response = await fetch('scenarios/scenario-index.json', { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error('Unable to load scenario manifest.');
        }
        scenarioManifest = await response.json();
        scenarioManifest.forEach(entry => {
            const option = document.createElement('option');
            option.value = entry.id;
            option.textContent = entry.label;
            select.appendChild(option);
        });
    } catch (error) {
        setFileFeedback(error.message, 'error');
    }
    select.addEventListener('change', () => {
        const id = select.value;
        if (!id) {
            renderScenarioDescription('', '');
            resetScenarioDownload();
            return;
        }
        loadScenarioById(id);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const createdLabel = document.getElementById('created-date');
    const modifiedLabel = document.getElementById('modified-date');
    if (createdLabel) createdLabel.textContent = CREATED_DATE;
    if (modifiedLabel) modifiedLabel.textContent = modifiedDate;

    setupManualControls();
    setupModeButtons();
    setupAlphaControl();
    setupConfidenceButtons();
    setupDropzone();
    setupTemplateDownloads();
    setupScenarioSelector();
    setupScenarioDownloadButton();
    switchMode(activeMode, { suppressUpdate: true });
    refreshScenarioDownloadVisibility();
});
