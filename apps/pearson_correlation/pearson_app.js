const CREATED_DATE = new Date('2025-11-06').toLocaleDateString();
let modifiedDate = new Date().toLocaleDateString();

const InputModes = Object.freeze({
    MANUAL: 'manual',
    PAIRED: 'paired',
    MATRIX: 'matrix'
});

const CorrelationMethods = Object.freeze({
    PEARSON: 'pearson',
    SPEARMAN: 'spearman'
});

const SYMBOLS = Object.freeze({
    alpha: 'α',
    spearman: 'ρ',
    nullHypothesis: 'H₀'
});

const MODE_LABELS = {
    [InputModes.MANUAL]: 'Manual entry',
    [InputModes.PAIRED]: 'Paired upload',
    [InputModes.MATRIX]: 'Correlation matrix upload'
};

const DEFAULT_MANUAL_ROWS = 8;
const MAX_MANUAL_ROWS = 50;

let activeMode = InputModes.PAIRED;
let selectedConfidenceLevel = 0.95;
let manualRowCount = DEFAULT_MANUAL_ROWS;
let scenarioManifest = [];
let defaultScenarioDescription = '';
let activeScenarioDataset = null;
let uploadedPairedData = null;
let uploadedMatrixData = null;
let scatterPairs = [];
let activeScatterPair = null;
let selectedCorrelationMethod = CorrelationMethods.PEARSON;
const scatterVisualSettings = {
    showTrendline: true,
    showConfidenceBand: true
};
let heatmapScaleChoice = 'diverging';
let latestMatrixStats = null;

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

function formatAlphaValue(value) {
    if (!isFinite(value)) return '0.050';
    const safe = clamp(value, 0.0005, 0.5);
    if (safe >= 0.1) return safe.toFixed(2);
    if (safe >= 0.01) return safe.toFixed(3);
    return safe.toFixed(4);
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

function computeSkewness(values) {
    if (!Array.isArray(values) || values.length < 3) return NaN;
    const m = mean(values);
    const sd = standardDeviation(values);
    if (!sd || !isFinite(sd)) return NaN;
    const n = values.length;
    const adjusted = values.reduce((sum, value) => sum + Math.pow((value - m) / sd, 3), 0);
    return (n / ((n - 1) * (n - 2))) * adjusted;
}

function rankValues(values = []) {
    const entries = values.map((value, index) => ({ value, index }));
    entries.sort((a, b) => a.value - b.value);
    const ranks = new Array(values.length);
    let i = 0;
    while (i < entries.length) {
        let j = i + 1;
        while (j < entries.length && entries[j].value === entries[i].value) {
            j++;
        }
        const avgRank = (i + j - 1) / 2 + 1;
        for (let k = i; k < j; k++) {
            ranks[entries[k].index] = avgRank;
        }
        i = j;
    }
    return ranks;
}

function describeCorrelationMethod(method = selectedCorrelationMethod, { short = false } = {}) {
    const target = method || CorrelationMethods.PEARSON;
    if (short) {
        return target === CorrelationMethods.SPEARMAN ? 'Spearman' : 'Pearson';
    }
    return target === CorrelationMethods.SPEARMAN ? 'Spearman rank correlation' : 'Pearson correlation';
}

function getCoefficientSymbol(method = selectedCorrelationMethod) {
    return method === CorrelationMethods.SPEARMAN ? SYMBOLS.spearman : 'r';
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

function normInv(probability) {
    if (probability <= 0 || probability >= 1) return NaN;
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
    if (probability < pLow) {
        q = Math.sqrt(-2 * Math.log(probability));
        return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
    if (probability <= pHigh) {
        q = probability - 0.5;
        const r = q * q;
        return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
            (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    }
    q = Math.sqrt(-2 * Math.log(1 - probability));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
}

function formatPValue(p) {
    if (!isFinite(p)) return 'p = --';
    if (p < 0.001) return 'p < .001';
    return `p = ${p.toFixed(3).replace(/^0/, '')}`;
}

function calculateCorrelationCoefficient(xValues, yValues) {
    if (!Array.isArray(xValues) || !Array.isArray(yValues)) return NaN;
    const n = Math.min(xValues.length, yValues.length);
    if (!Number.isInteger(n) || n < 3) return NaN;
    const meanX = mean(xValues);
    const meanY = mean(yValues);
    const sdX = standardDeviation(xValues);
    const sdY = standardDeviation(yValues);
    const denominator = sdX * sdY;
    if (!denominator || !isFinite(denominator)) return NaN;
    const numerator = xValues.reduce((sum, value, index) => {
        const centeredX = value - meanX;
        const centeredY = yValues[index] - meanY;
        return sum + centeredX * centeredY;
    }, 0);
    return numerator / ((n - 1) * denominator);
}

function calculateSpearmanCoefficient(xValues, yValues) {
    if (!Array.isArray(xValues) || !Array.isArray(yValues)) return NaN;
    const n = Math.min(xValues.length, yValues.length);
    if (!Number.isInteger(n) || n < 3) return NaN;
    const trimmedX = xValues.slice(0, n);
    const trimmedY = yValues.slice(0, n);
    const rankedX = rankValues(trimmedX);
    const rankedY = rankValues(trimmedY);
    return calculateCorrelationCoefficient(rankedX, rankedY);
}

function getScatterSelect() {
    return document.getElementById('scatterpair-select');
}

function setScatterPairs(pairs = []) {
    scatterPairs = Array.isArray(pairs) ? pairs : [];
    const select = getScatterSelect();
    if (!select) {
        activeScatterPair = scatterPairs[0] || null;
        renderScatterPlot(activeScatterPair);
        return;
    }
    select.innerHTML = '';
    if (!scatterPairs.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No pairs available';
        select.appendChild(option);
        select.disabled = true;
        activeScatterPair = null;
        renderScatterPlot(null);
        return;
    }
    scatterPairs.forEach((pair, index) => {
        const option = document.createElement('option');
        option.value = pair.id;
        option.textContent = pair.label;
        select.appendChild(option);
        if (index === 0) {
            select.value = pair.id;
        }
    });
    select.disabled = scatterPairs.length === 1;
    activeScatterPair = scatterPairs[0];
    renderScatterPlot(activeScatterPair);
}

function handleScatterSelectChange() {
    const select = getScatterSelect();
    if (!select) return;
    const pair = scatterPairs.find(item => item.id === select.value);
    if (!pair) return;
    activeScatterPair = pair;
    renderScatterPlot(pair);
}

function toggleSingleOutputs(show) {
    document.querySelectorAll('.single-only').forEach(element => {
        element.classList.toggle('hidden', !show);
    });
}

function toggleMatrixOutputs(show) {
    document.querySelectorAll('.matrix-only').forEach(element => {
        element.classList.toggle('hidden', !show);
    });
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

function setManualRowCount(value, { preserveValues = true } = {}) {
    const parsed = Number.isInteger(value) ? value : parseInt(value, 10);
    const clamped = clamp(isFinite(parsed) ? parsed : DEFAULT_MANUAL_ROWS, 2, MAX_MANUAL_ROWS);
    const pairedValues = preserveValues ? snapshotManualPairedValues() : [];
    manualRowCount = clamped;
    const input = document.getElementById('manual-row-count');
    if (input && parseInt(input.value, 10) !== clamped) {
        input.value = clamped;
    }
    renderPairedRows(pairedValues);
}

function setupManualControls() {
    const rowCountInput = document.getElementById('manual-row-count');
    if (rowCountInput) {
        rowCountInput.addEventListener('change', () => {
            const value = parseInt(rowCountInput.value, 10);
            setManualRowCount(value);
            updateResults();
        });
    }
    setManualRowCount(manualRowCount, { preserveValues: false });
}

function collectPairedRows() {
    const rows = [];
    const beforeValues = [];
    const afterValues = [];
    const partialRows = [];
    const tbody = document.getElementById('paired-table-body');
    if (!tbody) {
        return { rows, beforeValues, afterValues, partialRows };
    }
    tbody.querySelectorAll('tr').forEach((row, index) => {
        const beforeInput = row.querySelector('.paired-before');
        const afterInput = row.querySelector('.paired-after');
        const before = beforeInput && beforeInput.value !== '' ? parseFloat(beforeInput.value) : NaN;
        const after = afterInput && afterInput.value !== '' ? parseFloat(afterInput.value) : NaN;
        const hasBefore = isFinite(before);
        const hasAfter = isFinite(after);
        if (hasBefore && hasAfter) {
            rows.push({ before, after });
            beforeValues.push(before);
            afterValues.push(after);
        } else if (hasBefore || hasAfter) {
            partialRows.push(`Row ${index + 1}`);
        }
    });
    return { rows, beforeValues, afterValues, partialRows };
}

function gatherInput() {
    const alphaInput = document.getElementById('alpha');
    const alpha = alphaInput ? parseFloat(alphaInput.value) : 0.05;
    if (!isFinite(alpha) || alpha <= 0 || alpha >= 1) {
        return { valid: false, message: 'Alpha must be between 0 and 1.' };
    }

    if (activeMode === InputModes.MANUAL) {
        const { beforeValues, afterValues, partialRows } = collectPairedRows();
        if (partialRows.length) {
            return { valid: false, message: `Complete both X and Y values for ${partialRows.join(', ')}.` };
        }
        if (beforeValues.length < 3) {
            return { valid: false, message: 'Provide at least three paired observations.' };
        }
        return {
            valid: true,
            data: {
                mode: InputModes.MANUAL,
                alpha,
                confidence: selectedConfidenceLevel,
                xValues: beforeValues,
                yValues: afterValues,
                labels: { x: 'Variable X', y: 'Variable Y' }
            }
        };
    }

    if (activeMode === InputModes.PAIRED) {
        if (!uploadedPairedData || !Array.isArray(uploadedPairedData.xValues) || uploadedPairedData.xValues.length < 3) {
            return { valid: false, message: 'Upload at least three paired observations.' };
        }
        return {
            valid: true,
            data: {
                mode: InputModes.PAIRED,
                alpha,
                confidence: selectedConfidenceLevel,
                xValues: uploadedPairedData.xValues,
                yValues: uploadedPairedData.yValues,
                labels: {
                    x: uploadedPairedData.xLabel || 'Variable X',
                    y: uploadedPairedData.yLabel || 'Variable Y'
                }
            }
        };
    }

    if (activeMode === InputModes.MATRIX) {
        if (!uploadedMatrixData || !Array.isArray(uploadedMatrixData.variables) || uploadedMatrixData.variables.length < 2) {
            return { valid: false, message: 'Upload at least two named columns to build a correlation matrix.' };
        }
        return {
            valid: true,
            data: {
                mode: InputModes.MATRIX,
                alpha,
                confidence: selectedConfidenceLevel,
                matrix: uploadedMatrixData
            }
        };
    }

    return { valid: false, message: 'Unsupported mode.' };
}

function computeCorrelationStats(data, { method = CorrelationMethods.PEARSON } = {}) {
    const alpha = clamp(data.alpha, 1e-6, 0.5);
    const xValues = data.xValues || [];
    const yValues = data.yValues || [];
    const n = Math.min(xValues.length, yValues.length);
    if (!Number.isInteger(n) || n < 3) {
        return null;
    }
    const trimmedX = xValues.slice(0, n);
    const trimmedY = yValues.slice(0, n);
    const meanX = mean(trimmedX);
    const meanY = mean(trimmedY);
    const sdX = standardDeviation(trimmedX);
    const sdY = standardDeviation(trimmedY);
    if (!sdX || !sdY || !isFinite(sdX) || !isFinite(sdY)) {
        return null;
    }
    const analysisX = method === CorrelationMethods.SPEARMAN ? rankValues(trimmedX) : trimmedX;
    const analysisY = method === CorrelationMethods.SPEARMAN ? rankValues(trimmedY) : trimmedY;
    const r = calculateCorrelationCoefficient(analysisX, analysisY);
    if (!isFinite(r)) {
        return null;
    }
    const df = n - 2;
    const rSquared = r * r;
    const tStatistic = Math.sqrt((df) * rSquared / Math.max(1 - rSquared, 1e-12)) * Math.sign(r);
    const pValue = isFinite(tStatistic) ? 2 * (1 - tCdf(Math.abs(tStatistic), df)) : NaN;
    let ciLower = NaN;
    let ciUpper = NaN;
    let standardErrorZ = NaN;
    if (n > 3) {
        const safeR = clamp(r, -0.999999, 0.999999);
        const fisherZ = 0.5 * Math.log((1 + safeR) / (1 - safeR));
        standardErrorZ = 1 / Math.sqrt(n - 3);
        const zCritical = normInv(1 - alpha / 2);
        if (isFinite(zCritical)) {
            const lowerZ = fisherZ - zCritical * standardErrorZ;
            const upperZ = fisherZ + zCritical * standardErrorZ;
            ciLower = Math.tanh(lowerZ);
            ciUpper = Math.tanh(upperZ);
        }
    }
    return {
        n,
        df,
        alpha,
        r,
        rSquared,
        tStatistic,
        pValue,
        ciLower,
        ciUpper,
        ciLevel: 1 - alpha,
        meanX,
        meanY,
        sdX,
        sdY,
        standardErrorZ,
        method,
        pearsonR: calculateCorrelationCoefficient(trimmedX, trimmedY),
        spearmanR: calculateSpearmanCoefficient(trimmedX, trimmedY),
        xLabel: data.labels?.x || 'Variable X',
        yLabel: data.labels?.y || 'Variable Y'
    };
}

function computeMatrixCorrelations(data, { method = CorrelationMethods.PEARSON } = {}) {
    if (!data || !data.matrix) return null;
    const alpha = clamp(data.alpha, 1e-6, 0.5);
    const matrix = data.matrix;
    const variables = matrix.variables || [];
    if (variables.length < 2) return null;
    const columns = matrix.columns || {};
    const n = matrix.rowCount || 0;
    if (!Number.isInteger(n) || n < 3) return null;
    const means = {};
    const sds = {};
    const workingColumns = {};
    variables.forEach(name => {
        const values = (columns[name] || []).slice(0, n);
        means[name] = mean(values);
        sds[name] = standardDeviation(values);
        workingColumns[name] = method === CorrelationMethods.SPEARMAN ? rankValues(values) : values;
    });
    const correlations = variables.map(() => Array(variables.length).fill(NaN));
    const pairStats = [];
    const df = n - 2;
    const zCritical = normInv(1 - alpha / 2);
    for (let i = 0; i < variables.length; i++) {
        correlations[i][i] = 1;
        for (let j = i + 1; j < variables.length; j++) {
            const valuesA = workingColumns[variables[i]];
            const valuesB = workingColumns[variables[j]];
            const r = calculateCorrelationCoefficient(valuesA, valuesB);
            correlations[j][i] = r;
            correlations[i][j] = r;
            const safeR = clamp(r, -0.999999, 0.999999);
            const tStatistic = isFinite(safeR)
                ? Math.sqrt(df * safeR * safeR / Math.max(1 - safeR * safeR, 1e-12)) * Math.sign(safeR)
                : NaN;
            const pValue = isFinite(tStatistic) ? 2 * (1 - tCdf(Math.abs(tStatistic), df)) : NaN;
            let ciLower = NaN;
            let ciUpper = NaN;
            if (n > 3 && isFinite(safeR) && Math.abs(safeR) < 1 && isFinite(zCritical)) {
                const fisherZ = 0.5 * Math.log((1 + safeR) / (1 - safeR));
                const se = 1 / Math.sqrt(n - 3);
                ciLower = Math.tanh(fisherZ - zCritical * se);
                ciUpper = Math.tanh(fisherZ + zCritical * se);
            }
            pairStats.push({
                xName: variables[i],
                yName: variables[j],
                r,
                ciLower,
                ciUpper,
                pValue,
                tStatistic,
                n
            });
        }
    }
    return {
        alpha,
        n,
        variables,
        means,
        sds,
        correlations,
        columns,
        pairStats,
        method
    };
}

function buildMatrixScatterPairs(stats) {
    if (!stats || !Array.isArray(stats.variables)) return [];
    const pairs = [];
    const pairStatMap = new Map();
    if (Array.isArray(stats.pairStats)) {
        stats.pairStats.forEach(pair => {
            const forwardKey = `${pair.xName}__${pair.yName}`;
            const reverseKey = `${pair.yName}__${pair.xName}`;
            pairStatMap.set(forwardKey, pair);
            pairStatMap.set(reverseKey, { ...pair, xName: pair.yName, yName: pair.xName });
        });
    }
    for (let i = 0; i < stats.variables.length; i++) {
        for (let j = i + 1; j < stats.variables.length; j++) {
            const xName = stats.variables[i];
            const yName = stats.variables[j];
            const xValues = stats.columns[xName] || [];
            const yValues = stats.columns[yName] || [];
            const pairKey = `${xName}__${yName}`;
            pairs.push({
                id: `${xName}__${yName}`,
                label: `${yName} vs ${xName}`,
                x: { name: xName, values: xValues },
                y: { name: yName, values: yValues },
                meta: {
                    alpha: stats.alpha,
                    method: stats.method,
                    n: stats.n,
                    pairStats: pairStatMap.get(pairKey) || null
                }
            });
        }
    }
    return pairs;
}

function describeModeLabel(data) {
    if (data && data.mode === InputModes.MANUAL) {
        return `${MODE_LABELS[InputModes.MANUAL]} (paired values)`;
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
    const heading = document.getElementById('correlation-heading');
    const method = stats?.method || selectedCorrelationMethod;
    const methodLabel = describeCorrelationMethod(method);
    const coefficientSymbol = getCoefficientSymbol(method);
    if (heading) {
        heading.textContent = methodLabel;
    }

    if (!stats) {
        testStat.textContent = `${coefficientSymbol} = --`;
        pValue.textContent = 'p = --';
        ciSummary.textContent = 'CI: [--, --]';
        effectSize.textContent = 't(--)=--';
        hedges.textContent = 'R^2 = --';
        meanDiff.textContent = 'Means: --';
        if (data && data.mode === InputModes.MATRIX && data.matrix && Number.isInteger(data.matrix.rowCount)) {
            sampleSummary.textContent = `n = ${data.matrix.rowCount} rows`;
        } else {
            sampleSummary.textContent = 'n = -- pairs';
        }
        modeSummary.textContent = `Mode: ${describeModeLabel({ mode: activeMode })}`;
        return;
    }

    testStat.textContent = `${coefficientSymbol} = ${formatNumber(stats.r, 3)}`;
    pValue.textContent = formatPValue(stats.pValue);
    ciSummary.textContent = `${Math.round((1 - stats.alpha) * 100)}% CI: [${formatNumber(stats.ciLower)}, ${formatNumber(stats.ciUpper)}]`;
    effectSize.textContent = `t(${stats.df}) = ${formatNumber(stats.tStatistic, 3)}`;
    hedges.textContent = `R^2 = ${formatNumber(stats.rSquared, 3)}`;
    if (isFinite(stats.meanX) && isFinite(stats.meanY)) {
        const xLabel = stats.xLabel || 'Variable X';
        const yLabel = stats.yLabel || 'Variable Y';
        meanDiff.textContent = `Means: ${xLabel} = ${formatNumber(stats.meanX)}, ${yLabel} = ${formatNumber(stats.meanY)}`;
    } else {
        meanDiff.textContent = 'Means: --';
    }
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
            note.textContent = 'Provide data to summarize the correlation estimate and confidence interval.';
        }
        return;
    }
    const method = stats.method || selectedCorrelationMethod;
    const coefficientSymbol = getCoefficientSymbol(method);
    const axisLabel = method === CorrelationMethods.SPEARMAN ? 'Rank correlation (ρ)' : 'Correlation (r)';
    if (Array.isArray(stats.pairStats)) {
        const pairs = stats.pairStats;
        if (!pairs.length) {
            Plotly.purge(container);
            if (note) {
                note.textContent = 'Upload multi-column data to summarize confidence intervals.';
            }
            return;
        }
        const yLabels = pairs.map(pair => `${pair.yName} vs ${pair.xName}`);
        const xValues = pairs.map(pair => pair.r);
        const errorPlus = pairs.map(pair => isFinite(pair.ciUpper) ? pair.ciUpper - pair.r : 0);
        const errorMinus = pairs.map(pair => isFinite(pair.ciLower) ? pair.r - pair.ciLower : 0);
        const trace = {
            x: xValues,
            y: yLabels,
            type: 'scatter',
            mode: 'markers',
            marker: {
                color: 'rgba(42, 125, 225, 0.9)',
                size: 10,
                line: { color: '#fff', width: 1 }
            },
            error_x: {
                type: 'data',
                symmetric: false,
                array: errorPlus,
                arrayminus: errorMinus,
                color: '#1f2a37',
                thickness: 1.5
            },
            hovertemplate: `${coefficientSymbol} = %{x:.3f}<br>%{y}<extra></extra>`
        };
        const layout = {
            margin: { l: 120, r: 40, t: 30, b: 50 },
            xaxis: {
                zeroline: true,
                zerolinecolor: '#c6d0e0',
                title: axisLabel,
                range: [-1, 1],
                gridcolor: '#eef2fb'
            },
            yaxis: {
                automargin: true
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            height: Math.max(320, pairs.length * 28 + 120)
        };
        Plotly.react(container, [trace], layout, { responsive: true, displayModeBar: false });
        if (note) {
            const missing = pairs.filter(pair => !isFinite(pair.ciLower) || !isFinite(pair.ciUpper)).length;
            const ciLabel = `${Math.round((1 - stats.alpha) * 100)}% CI`;
            note.textContent = missing
                ? `${ciLabel} shown for each variable pair (rows with n < 4 omit CI bars).`
                : `${ciLabel} shown for every variable pair.`;
        }
        return;
    }
    const hasCI = isFinite(stats.ciLower) && isFinite(stats.ciUpper);
    const hoverTemplate = hasCI
        ? `${coefficientSymbol} = ${formatNumber(stats.r, 3)}<br>${Math.round((1 - stats.alpha) * 100)}% CI: [${formatNumber(stats.ciLower)}, ${formatNumber(stats.ciUpper)}]<extra></extra>`
        : `${coefficientSymbol} = ${formatNumber(stats.r, 3)}<br>CI requires at least 4 pairs.<extra></extra>`;
    const trace = {
        x: [stats.r],
        y: ['Correlation'],
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: 'rgba(42, 125, 225, 0.9)',
            size: 14,
            line: { color: '#fff', width: 2 }
        },
        hovertemplate: hoverTemplate
    };
    if (hasCI) {
        trace.error_x = {
            type: 'data',
            symmetric: false,
            array: [stats.ciUpper - stats.r],
            arrayminus: [stats.r - stats.ciLower],
            color: '#1f2a37',
            thickness: 2
        };
    }
    const layout = {
        margin: { l: 80, r: 40, t: 20, b: 50 },
        xaxis: {
            zeroline: true,
            zerolinecolor: '#c6d0e0',
            title: axisLabel,
            range: [-1, 1],
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
        if (hasCI) {
            const ciLabel = `${Math.round((1 - stats.alpha) * 100)}% CI`;
            note.textContent = `${coefficientSymbol} = ${formatNumber(stats.r, 3)}; ${ciLabel}: [${formatNumber(stats.ciLower)}, ${formatNumber(stats.ciUpper)}]`;
        } else {
            note.textContent = 'Need at least 4 paired observations to compute the Fisher z confidence interval.';
        }
    }
}

function renderScatterPlot(pair) {
    const container = document.getElementById('difference-chart');
    const note = document.getElementById('difference-chart-note');
    if (!container || !note) return;
    if (!window.Plotly) return;

    if (!pair || !Array.isArray(pair.x.values) || !Array.isArray(pair.y.values) || pair.x.values.length < 2 || pair.y.values.length < 2) {
        Plotly.purge(container);
        note.textContent = 'Add paired raw data to explore the scatterplot.';
        return;
    }
    const xValues = pair.x.values;
    const yValues = pair.y.values;
    const slopeIntercept = (() => {
        const r = calculateCorrelationCoefficient(xValues, yValues);
        if (!isFinite(r)) return null;
        const meanX = mean(xValues);
        const meanY = mean(yValues);
        const sdX = standardDeviation(xValues);
        const sdY = standardDeviation(yValues);
        if (!sdX || !isFinite(sdY) || !sdY) return null;
        const slope = r * (sdY / sdX);
        const intercept = meanY - slope * meanX;
        return { slope, intercept, r };
    })();

    const pointTrace = {
        x: xValues,
        y: yValues,
        mode: 'markers',
        type: 'scatter',
        marker: {
            color: 'rgba(42, 125, 225, 0.8)',
            size: 9,
            line: { color: '#fff', width: 1 }
        },
        hovertemplate: `${pair.x.name} = %{x:.3f}<br>${pair.y.name} = %{y:.3f}<extra></extra>`
    };
    const traces = [pointTrace];
    let ciBandTrace = null;
    let ciLabelText = '';
    const allowBand = selectedCorrelationMethod === CorrelationMethods.PEARSON;
    const showBand = scatterVisualSettings.showConfidenceBand && allowBand;
    const showTrendline = scatterVisualSettings.showTrendline;
    if (slopeIntercept && allowBand) {
        const n = Math.min(xValues.length, yValues.length);
        const meanX = mean(xValues);
        const sxx = xValues.reduce((sum, value) => sum + Math.pow(value - meanX, 2), 0);
        const residualSS = xValues.reduce((sum, value, index) => {
            const predicted = slopeIntercept.intercept + slopeIntercept.slope * value;
            const residual = yValues[index] - predicted;
            return sum + residual * residual;
        }, 0);
        const df = n - 2;
        const alpha = typeof pair.meta?.alpha === 'number' ? pair.meta.alpha : (1 - selectedConfidenceLevel);
        const ciLevel = 1 - alpha;
        if (df > 0 && sxx > 0 && residualSS > 0) {
            const residualStd = Math.sqrt(residualSS / df);
            const tCrit = tCritical(1 - alpha / 2, df);
            if (isFinite(residualStd) && isFinite(tCrit)) {
                const minX = Math.min(...xValues);
                const maxX = Math.max(...xValues);
                if (isFinite(minX) && isFinite(maxX) && maxX > minX) {
                    const points = Math.min(Math.max(n, 20), 80);
                    const gridX = Array.from({ length: points }, (_, idx) => {
                        const fraction = idx / (points - 1);
                        return minX + fraction * (maxX - minX);
                    });
                    const upper = [];
                    const lower = [];
                    gridX.forEach(value => {
                        const predicted = slopeIntercept.intercept + slopeIntercept.slope * value;
                        const meanSE = residualStd * Math.sqrt((1 / n) + Math.pow(value - meanX, 2) / sxx);
                        const delta = tCrit * meanSE;
                        upper.push(predicted + delta);
                        lower.push(predicted - delta);
                    });
                    ciBandTrace = {
                        x: [...gridX, ...gridX.slice().reverse()],
                        y: [...upper, ...lower.slice().reverse()],
                        mode: 'lines',
                        type: 'scatter',
                        fill: 'toself',
                        fillcolor: 'rgba(42, 125, 225, 0.12)',
                        line: { color: 'rgba(42, 125, 225, 0)' },
                        hoverinfo: 'skip',
                        showlegend: false
                    };
                    ciLabelText = `${Math.round(ciLevel * 100)}% confidence band`;
                }
            }
        }
    }
    if (ciBandTrace && showBand) {
        traces.unshift(ciBandTrace);
    }
    if (slopeIntercept && showTrendline) {
        const sortedX = [...xValues].sort((a, b) => a - b);
        const minX = sortedX[0];
        const maxX = sortedX[sortedX.length - 1];
        const lineX = [minX, maxX];
        const lineY = lineX.map(value => slopeIntercept.intercept + slopeIntercept.slope * value);
        traces.push({
            x: lineX,
            y: lineY,
            mode: 'lines',
            line: { color: '#d64747', width: 2 },
            hoverinfo: 'skip',
            showlegend: false
        });
    }

    const layout = {
        margin: { l: 60, r: 20, t: 40, b: 50 },
        xaxis: {
            title: pair.x.name,
            zeroline: false,
            gridcolor: '#eef2fb'
        },
        yaxis: {
            title: pair.y.name,
            gridcolor: '#eef2fb'
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: 320
    };

    Plotly.react(container, traces, layout, { responsive: true, displayModeBar: false });
    const methodLabelShort = describeCorrelationMethod(selectedCorrelationMethod, { short: true });
    const coefficientSymbol = getCoefficientSymbol(selectedCorrelationMethod);
    const correlationValue = selectedCorrelationMethod === CorrelationMethods.SPEARMAN
        ? calculateSpearmanCoefficient(xValues, yValues)
        : slopeIntercept && isFinite(slopeIntercept.r)
            ? slopeIntercept.r
            : calculateCorrelationCoefficient(xValues, yValues);
    const lineNote = slopeIntercept && showTrendline ? '; line depicts the least-squares fit' : '';
    const methodNote = isFinite(correlationValue)
        ? `; ${methodLabelShort} estimate (${coefficientSymbol} = ${formatNumber(correlationValue, 3)})`
        : '';
    let bandNote = '';
    if (ciLabelText) {
        bandNote = showBand ? `; ${ciLabelText} shown only for Pearson mode` : '; confidence band hidden via settings';
    }
    note.textContent = `Points show paired observations for ${pair.y.name} vs ${pair.x.name}${lineNote}${methodNote}${bandNote}.`;
}

function getHeatmapColorscale() {
    switch (heatmapScaleChoice) {
        case 'rdBu':
            return 'RdBu';
        case 'viridis':
            return 'Viridis';
        default:
            return [
                [0, '#2d6f93'],
                [0.5, '#f8f8f8'],
                [1, '#c0392b']
            ];
    }
}

function renderCorrelationHeatmap(stats) {
    const container = document.getElementById('matrix-heatmap');
    const note = document.getElementById('matrix-heatmap-note');
    if (!container || !window.Plotly) return;
    if (!stats || !Array.isArray(stats.variables) || stats.variables.length < 2) {
        Plotly.purge(container);
        if (note) {
            note.textContent = 'Upload multi-column data to view the correlation heatmap.';
        }
        latestMatrixStats = null;
        return;
    }
    latestMatrixStats = stats;
    const method = stats.method || selectedCorrelationMethod;
    const coefficientSymbol = getCoefficientSymbol(method);
    const variables = stats.variables;
    const pairMap = new Map();
    if (Array.isArray(stats.pairStats)) {
        stats.pairStats.forEach(pair => {
            pairMap.set(`${pair.xName}__${pair.yName}`, pair);
            pairMap.set(`${pair.yName}__${pair.xName}`, pair);
        });
    }
    const z = variables.map((_, row) => variables.map((_, col) => (row > col ? stats.correlations[row][col] : null)));
    const text = variables.map((_, row) => variables.map((_, col) => {
        if (row > col) {
            return formatNumber(stats.correlations[row][col], 2);
        }
        return '';
    }));
    const hoverTexts = variables.map((yName, row) => variables.map((xName, col) => {
        if (row <= col) return '';
        const pair = pairMap.get(`${xName}__${yName}`);
        if (!pair) {
            return `${yName} vs ${xName}<br>${coefficientSymbol} = ${formatNumber(stats.correlations[row][col], 3)}<br>CI unavailable`;
        }
        const ciText = (isFinite(pair.ciLower) && isFinite(pair.ciUpper))
            ? `${Math.round((1 - stats.alpha) * 100)}% CI: [${formatNumber(pair.ciLower)}, ${formatNumber(pair.ciUpper)}]`
            : 'CI unavailable';
        return `${yName} vs ${xName}<br>${coefficientSymbol} = ${formatNumber(pair.r, 3)}<br>${ciText}`;
    }));
    const heatmap = {
        type: 'heatmap',
        z,
        x: variables,
        y: variables,
        colorscale: getHeatmapColorscale(),
        zmin: -1,
        zmax: 1,
        colorbar: {
            title: coefficientSymbol,
            titleside: 'right'
        },
        text,
        hoverinfo: 'text',
        hovertext: hoverTexts
    };
    const layout = {
        margin: { l: 80, r: 20, t: 40, b: 40 },
        xaxis: { side: 'top' },
        yaxis: { autorange: 'reversed' },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: 420
    };
    const annotations = [];
    variables.forEach((yName, row) => {
        variables.forEach((xName, col) => {
            if (row > col) {
                annotations.push({
                    x: xName,
                    y: yName,
                    text: formatNumber(stats.correlations[row][col], 2),
                    showarrow: false,
                    font: { color: '#1f2a37', size: 12 },
                    bgcolor: 'rgba(255,255,255,0.4)',
                    borderpad: 2
                });
            }
        });
    });
    layout.annotations = annotations;
    Plotly.react(container, [heatmap], layout, { responsive: true, displayModeBar: false });
    if (note) {
        note.textContent = `${describeCorrelationMethod(method)} values populate the heatmap; hover any lower-left cell for exact coefficients and confidence intervals.`;
    }
}

function renderVariableStatsTable(stats) {
    const container = document.getElementById('variable-stats');
    if (!container) return;
    if (!stats || !Array.isArray(stats.variables) || !stats.variables.length) {
        container.innerHTML = '<p>Upload multi-column data to see variable summaries.</p>';
        return;
    }
    const rows = stats.variables.map(name => `
        <tr>
            <td>${escapeHtml(name)}</td>
            <td>${formatNumber(stats.means[name])}</td>
            <td>${formatNumber(stats.sds[name])}</td>
        </tr>
    `).join('');
    container.innerHTML = `
        <table class="variable-stats-table">
            <thead>
                <tr>
                    <th>Variable</th>
                    <th>Mean</th>
                    <th>SD</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function updateNarratives(stats, data) {
    const apa = document.getElementById('apa-report');
    const managerial = document.getElementById('managerial-report');
    if (!apa || !managerial) return;
    if (!stats) {
        apa.textContent = 'Summary will appear after analysis.';
        managerial.textContent = 'Summary will appear after analysis.';
        return;
    }
    const method = stats.method || selectedCorrelationMethod;
    const methodLabel = describeCorrelationMethod(method);
    const coefficientSymbol = getCoefficientSymbol(method);
    if (data && data.mode === InputModes.MATRIX) {
        if (!Array.isArray(stats.pairStats) || !stats.pairStats.length) {
            apa.textContent = 'Upload multi-column data to summarize correlations.';
            managerial.textContent = 'Upload multi-column data to receive managerial guidance.';
            return;
        }
        const alphaLabel = `${SYMBOLS.alpha} = ${formatAlphaValue(stats.alpha)}`;
        const significantPairs = stats.pairStats
            .filter(pair => isFinite(pair.r) && isFinite(pair.pValue) && pair.pValue < stats.alpha)
            .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
        const describePair = (pair) => {
            const ciText = isFinite(pair.ciLower) && isFinite(pair.ciUpper)
                ? `CI [${formatNumber(pair.ciLower)}, ${formatNumber(pair.ciUpper)}]`
                : 'CI unavailable';
            return `${pair.yName} vs ${pair.xName} (${coefficientSymbol} = ${formatNumber(pair.r, 3)}, ${ciText})`;
        };
        if (significantPairs.length) {
            const strongest = significantPairs.slice(0, Math.min(3, significantPairs.length));
            apa.textContent = `${methodLabel} matrix across ${stats.variables.length} variables (n = ${stats.n}) yielded ${significantPairs.length} significant pairwise relationships at ${alphaLabel}. Strongest effects: ${strongest.map(describePair).join('; ')}.`;
            const strengths = strongest.map(pair => `${pair.yName} vs ${pair.xName}`);
            managerial.textContent = `Significant links suggest shared drivers across the funnel. Prioritize the strongest pairs (${strengths.join(', ')}) when coordinating planning, and monitor the heatmap for emerging dependencies.`;
        } else {
            apa.textContent = `${methodLabel} matrix across ${stats.variables.length} variables (n = ${stats.n}) did not produce significant pairwise relationships at ${alphaLabel}.`;
            managerial.textContent = 'Treat observed relationships as directional; expand the dataset or use targeted experiments before reallocating resources.';
        }
        return;
    }

    const pText = formatPValue(stats.pValue);
    const ciText = `${Math.round((1 - stats.alpha) * 100)}% CI [${formatNumber(stats.ciLower)}, ${formatNumber(stats.ciUpper)}]`;
    const dfLabel = `${stats.df}`;
    const apaSentence = `${methodLabel} found ${stats.r > 0 ? 'a positive' : stats.r < 0 ? 'a negative' : 'no monotonic'} relationship, ${coefficientSymbol}(${dfLabel}) = ${formatNumber(stats.r, 3)}, t(${dfLabel}) = ${formatNumber(stats.tStatistic, 3)}, ${pText}, ${ciText}.`;
    apa.textContent = apaSentence;
    const strength = Math.abs(stats.r);
    let descriptor = 'a weak';
    if (strength >= 0.7) {
        descriptor = 'a very strong';
    } else if (strength >= 0.5) {
        descriptor = 'a strong';
    } else if (strength >= 0.3) {
        descriptor = 'a moderate';
    } else if (strength >= 0.15) {
        descriptor = 'a modest';
    }
    const direction = stats.r > 0 ? 'positive' : stats.r < 0 ? 'negative' : 'neutral';
    const varianceExplained = isFinite(stats.rSquared) ? `${Math.round(stats.rSquared * 100)}% of the variance` : 'a portion of the variance';
    const decisionCue = stats.pValue < stats.alpha
        ? `Because the correlation is statistically significant, treat ${descriptor} ${direction} relationship seriously in your planning.`
        : `Because the correlation is not statistically significant, treat the ${direction} pattern as directional until you collect more data.`;
    managerial.textContent = `The data suggest ${descriptor} ${direction} relationship where roughly ${varianceExplained} in Y aligns with X. ${decisionCue}`;
}

function updateDiagnostics(stats, data) {
    const container = document.getElementById('diagnostics-content');
    if (!container) return;
    if (data && data.mode === InputModes.MATRIX) {
        container.innerHTML = '<p>For matrix uploads, lean on the heatmap plus the pair-level confidence intervals; toggle the Pearson/Spearman selector above to see how each assumption shifts before interpreting any KPI pair.</p>';
        return;
    }
    if (!stats) {
        container.innerHTML = '<p>Provide data to review assumption checks.</p>';
        return;
    }
    const diagnostics = [];
    let recommendation = null;
    const method = stats.method || selectedCorrelationMethod;
    const methodLabel = describeCorrelationMethod(method);
    const coefficientSymbol = getCoefficientSymbol(method);
    const xValues = Array.isArray(data?.xValues) ? data.xValues : [];
    const yValues = Array.isArray(data?.yValues) ? data.yValues : [];
    const pearsonR = stats.pearsonR;
    const spearmanR = stats.spearmanR;
    const n = stats.n;

    let sampleStatus = 'good';
    let sampleMessage = `n = ${n} pairs keeps ${methodLabel.toLowerCase()} reasonably stable.`;
    if (n < 10) {
        sampleStatus = 'alert';
        sampleMessage = 'Fewer than 10 pairs leaves any correlation extremely sensitive to single points. Add more observations if possible.';
    } else if (n < 20) {
        sampleStatus = 'caution';
        sampleMessage = 'Sample size is modest. Document the limitation and lean on visuals to show how single points could sway the estimate.';
    }
    diagnostics.push({ title: 'Sample size', status: sampleStatus, message: sampleMessage });

    let hasSpread = false;
    if (isFinite(stats.sdX) && stats.sdX > 0 && isFinite(stats.sdY) && stats.sdY > 0) {
        hasSpread = true;
        diagnostics.push({
            title: 'Variable spread',
            status: 'good',
            message: 'Both variables show usable variance, so the correlation estimate is identifiable.'
        });
    } else {
        diagnostics.push({
            title: 'Variable spread',
            status: 'alert',
            message: 'One variable has almost no spread. Neither Pearson nor Spearman can summarize constant metrics; collect additional variation.'
        });
    }

    if (xValues.length >= 3 && yValues.length >= 3) {
        const skewX = computeSkewness(xValues);
        const skewY = computeSkewness(yValues);
        if (isFinite(skewX) && isFinite(skewY)) {
            const worstSkew = Math.max(Math.abs(skewX), Math.abs(skewY));
            let skewStatus = 'good';
            let skewMessage = `Skewness (${formatNumber(skewX, 2)}, ${formatNumber(skewY, 2)}) is within +/-1, supporting the mild-normality assumption.`;
            if (worstSkew >= 1 && worstSkew < 2) {
                skewStatus = 'caution';
                skewMessage = `Skewness (${formatNumber(skewX, 2)}, ${formatNumber(skewY, 2)}) is noticeable. Consider reporting Spearman or transforming metrics before relying on Pearson intervals.`;
            } else if (worstSkew >= 2) {
                skewStatus = 'alert';
                skewMessage = `Severe skew (${formatNumber(skewX, 2)}, ${formatNumber(skewY, 2)}) threatens parametric inferences. Prefer rank-based estimates or transform the data.`;
            }
            if (method === CorrelationMethods.SPEARMAN && worstSkew >= 1) {
                skewMessage += ' Spearman already down-weights skew, but document why you chose it.';
            }
            diagnostics.push({ title: 'Skew / normality', status: skewStatus, message: skewMessage });
            recommendation = recommendation || (worstSkew >= 1 ? CorrelationMethods.SPEARMAN : null);
        } else {
            diagnostics.push({
                title: 'Skew / normality',
                status: 'caution',
                message: 'Unable to compute skewness because one metric lacks variation. Restore spread before trusting distributional assumptions.'
            });
        }
    } else {
        diagnostics.push({
            title: 'Skew / normality',
            status: 'caution',
            message: 'Provide paired numeric data to evaluate skewness and justify Pearson vs. Spearman.'
        });
    }

    if (xValues.length && yValues.length) {
        let outlierStatus = 'good';
        let outlierMessage = 'No |z| > 3.5 detected in either metric.';
        if (isFinite(stats.sdX) && stats.sdX > 0 && isFinite(stats.sdY) && stats.sdY > 0) {
            const hasOutliers = xValues.some(value => Math.abs((value - stats.meanX) / stats.sdX) > 3.5) ||
                yValues.some(value => Math.abs((value - stats.meanY) / stats.sdY) > 3.5);
            if (hasOutliers) {
                outlierStatus = method === CorrelationMethods.SPEARMAN ? 'caution' : 'alert';
                outlierMessage = method === CorrelationMethods.SPEARMAN
                    ? 'Extreme z-scores detected. Spearman is resilient, but inspect the scatterplot and note any trimming rules.'
                    : 'Extreme z-scores detected. Pearson can swing dramatically; inspect the scatterplot or switch to Spearman.';
                recommendation = recommendation || CorrelationMethods.SPEARMAN;
            }
        } else {
            outlierStatus = 'caution';
            outlierMessage = 'Unable to compute z-scores because one variable lacks spread.';
        }
        diagnostics.push({ title: 'Outliers/leverage', status: outlierStatus, message: outlierMessage });
    } else {
        diagnostics.push({
            title: 'Outliers/leverage',
            status: 'caution',
            message: 'Provide raw paired data to screen for leverage points.'
        });
    }

    if (isFinite(pearsonR) && isFinite(spearmanR)) {
        const diff = Math.abs(pearsonR - spearmanR);
        let alignStatus = 'good';
        let alignMessage = `Pearson r = ${formatNumber(pearsonR, 3)} and Spearman ρ = ${formatNumber(spearmanR, 3)} (difference ${formatNumber(diff, 3)}). Either estimator tells a similar story.`;
        if (diff >= 0.1 && diff < 0.2) {
            alignStatus = 'caution';
            alignMessage = `Pearson r = ${formatNumber(pearsonR, 3)} vs. Spearman ρ = ${formatNumber(spearmanR, 3)} (difference ${formatNumber(diff, 3)}). Document why you favor ${methodLabel.toLowerCase()}.`;
        } else if (diff >= 0.2) {
            alignStatus = 'alert';
            alignMessage = `Pearson r = ${formatNumber(pearsonR, 3)} vs. Spearman ρ = ${formatNumber(spearmanR, 3)} diverge sharply (difference ${formatNumber(diff, 3)}). Inspect the scatterplot; method choice materially changes the conclusion.`;
            recommendation = CorrelationMethods.SPEARMAN;
        } else if (diff < 0.05 && recommendation !== CorrelationMethods.SPEARMAN) {
            recommendation = CorrelationMethods.PEARSON;
        }
        diagnostics.push({ title: 'Method alignment', status: alignStatus, message: alignMessage });
    }

    const relationshipTitle = method === CorrelationMethods.SPEARMAN ? 'Monotonicity check' : 'Linearity check';
    let relationshipStatus = 'good';
    let relationshipMessage = '';
    if (method === CorrelationMethods.SPEARMAN) {
        const monotonic = Math.abs(stats.r);
        if (monotonic < 0.15) {
            relationshipStatus = 'alert';
            relationshipMessage = `Rank correlation is very weak (${coefficientSymbol} = ${formatNumber(stats.r, 3)}). Confirm a monotonic pattern before leaning on Spearman.`;
        } else if (monotonic < 0.3) {
            relationshipStatus = 'caution';
            relationshipMessage = `Rank correlation is modest (${coefficientSymbol} = ${formatNumber(stats.r, 3)}). Inspect the scatterplot for curvature or segmented relationships.`;
        } else {
            relationshipMessage = `Rank correlation (${coefficientSymbol} = ${formatNumber(stats.r, 3)}) indicates a clear monotonic trend.`;
        }
    } else {
        const explained = Math.round(stats.rSquared * 100);
        if (stats.rSquared < 0.05) {
            relationshipStatus = 'caution';
            relationshipMessage = `Linear fit explains only ${explained}% of the variance. Inspect for curvature or switch to Spearman if the relationship looks monotonic but curved.`;
            recommendation = recommendation || CorrelationMethods.SPEARMAN;
        } else {
            relationshipMessage = `Linear fit explains about ${explained}% of the variance, supporting Pearson's linearity requirement.`;
            recommendation = recommendation || CorrelationMethods.PEARSON;
        }
    }
    diagnostics.push({ title: relationshipTitle, status: relationshipStatus, message: relationshipMessage });
    if (!hasSpread) {
        recommendation = null;
    }
    if (recommendation) {
        const recommendedLabel = describeCorrelationMethod(recommendation, { short: true });
        diagnostics.push({
            title: 'Recommended estimator',
            status: recommendation === CorrelationMethods.SPEARMAN ? 'caution' : 'good',
            message: recommendation === CorrelationMethods.SPEARMAN
                ? `Skew/outlier cues point toward ${recommendedLabel}. Switch the method toggle above or document why Pearson remains acceptable.`
                : `${recommendedLabel} assumptions look satisfied. Stick with Pearson unless you need a rank-based story.`
        });
    }
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
        Plotly.purge('matrix-heatmap');
    }
    latestMatrixStats = null;
    const meanNote = document.getElementById('mean-diff-chart-note');
    if (meanNote) {
        meanNote.textContent = 'Provide data to summarize the correlation estimate and confidence interval.';
    }
    const diffNote = document.getElementById('difference-chart-note');
    if (diffNote) {
        diffNote.textContent = 'Provide paired raw data to explore the scatterplot.';
    }
    setScatterPairs([]);
    const matrixNote = document.getElementById('matrix-heatmap-note');
    if (matrixNote) {
        matrixNote.textContent = 'Upload multi-column data to view the correlation heatmap.';
    }
    renderVariableStatsTable(null);
    updateResultCards(null, { mode: activeMode });
    updateNarratives(null, null);
    updateDiagnostics(null, null);
}

function updateResults() {
    const { valid, message, data } = gatherInput();
    if (!valid) {
        updateStatus(message, true);
        clearVisuals();
        toggleMatrixOutputs(activeMode === InputModes.MATRIX);
        toggleSingleOutputs(activeMode !== InputModes.MATRIX);
        return;
    }
    if (data.mode === InputModes.MATRIX) {
        const matrixStats = computeMatrixCorrelations(data, { method: selectedCorrelationMethod });
        if (!matrixStats) {
            updateStatus('Unable to compute correlation matrix. Double-check your file.', true);
            clearVisuals();
            toggleMatrixOutputs(true);
            toggleSingleOutputs(false);
            return;
        }
        updateStatus('Matrix analysis complete. Explore the heatmap, intervals, and scatter dropdown below.');
        toggleSingleOutputs(false);
        toggleMatrixOutputs(true);
        updateResultCards(null, data);
        renderMeanDifferenceChart(matrixStats);
        renderCorrelationHeatmap(matrixStats);
        renderVariableStatsTable(matrixStats);
        const pairs = buildMatrixScatterPairs(matrixStats);
        setScatterPairs(pairs);
        updateNarratives(matrixStats, data);
        updateDiagnostics(null, { mode: InputModes.MATRIX });
        modifiedDate = new Date().toLocaleDateString();
        const modifiedLabel = document.getElementById('modified-date');
        if (modifiedLabel) {
            modifiedLabel.textContent = modifiedDate;
        }
        return;
    }
    const stats = computeCorrelationStats(data, { method: selectedCorrelationMethod });
    if (!stats) {
        updateStatus('Unable to compute test statistics. Double-check your inputs.', true);
        clearVisuals();
        toggleSingleOutputs(true);
        toggleMatrixOutputs(false);
        return;
    }
    updateStatus('Analysis complete. Interpret the cards, charts, and diagnostics below.');
    toggleSingleOutputs(true);
    toggleMatrixOutputs(false);
    updateResultCards(stats, data);
    renderMeanDifferenceChart(stats);
    const labels = data.labels || { x: stats.xLabel || 'Variable X', y: stats.yLabel || 'Variable Y' };
    setScatterPairs([{
        id: `${labels.x}__${labels.y}`,
        label: `${labels.y} vs ${labels.x}`,
        x: { name: labels.x, values: data.xValues || [] },
        y: { name: labels.y, values: data.yValues || [] },
        meta: {
            alpha: stats.alpha,
            method: stats.method,
            n: stats.n
        }
    }]);
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
        importTools.classList.toggle('hidden', mode === InputModes.MANUAL);
    }
    const instructions = document.getElementById('dropzone-instructions');
    if (instructions) {
        if (mode === InputModes.MATRIX) {
            instructions.textContent = 'Provide two or more named columns (comma or tab separated). Each column becomes a variable in the correlation matrix.';
        } else {
            instructions.textContent = 'Provide two named columns (e.g., x,y). Each row becomes one paired observation.';
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

function setupMethodControls() {
    const radios = document.querySelectorAll('input[name="correlation-method"]');
    if (!radios.length) return;
    radios.forEach(radio => {
        radio.checked = radio.value === selectedCorrelationMethod;
        radio.addEventListener('change', () => {
            if (!radio.checked) return;
            selectedCorrelationMethod = radio.value === CorrelationMethods.SPEARMAN
                ? CorrelationMethods.SPEARMAN
                : CorrelationMethods.PEARSON;
            refreshVisualSettingsAvailability();
            updateResults();
        });
    });
    refreshVisualSettingsAvailability();
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

function setupVisualSettingsControls() {
    const trendToggle = document.getElementById('toggle-trendline');
    if (trendToggle) {
        trendToggle.checked = scatterVisualSettings.showTrendline;
        trendToggle.addEventListener('change', () => {
            scatterVisualSettings.showTrendline = trendToggle.checked;
            renderScatterPlot(activeScatterPair);
        });
    }
    const bandToggle = document.getElementById('toggle-confidence-band');
    if (bandToggle) {
        bandToggle.checked = scatterVisualSettings.showConfidenceBand;
        bandToggle.addEventListener('change', () => {
            scatterVisualSettings.showConfidenceBand = bandToggle.checked;
            renderScatterPlot(activeScatterPair);
        });
    }
    const heatmapSelect = document.getElementById('heatmap-scale');
    if (heatmapSelect) {
        heatmapSelect.value = heatmapScaleChoice;
        heatmapSelect.addEventListener('change', () => {
            heatmapScaleChoice = heatmapSelect.value || 'diverging';
            renderCorrelationHeatmap(latestMatrixStats);
        });
    }
    refreshVisualSettingsAvailability();
}

function refreshVisualSettingsAvailability() {
    const bandToggle = document.getElementById('toggle-confidence-band');
    if (!bandToggle) return;
    const isPearson = selectedCorrelationMethod === CorrelationMethods.PEARSON;
    bandToggle.disabled = !isPearson;
    const wrapper = bandToggle.closest('.switch-option');
    if (wrapper) {
        wrapper.classList.toggle('disabled', !isPearson);
    }
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
    } else if (mode === InputModes.MATRIX) {
        targetId = 'matrix-upload-status';
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
          const totalRows = rows.length + (Array.isArray(errors) ? errors.length : 0);
          if (typeof maybeConfirmDroppedRows === 'function') {
              const proceed = maybeConfirmDroppedRows({
                  totalRows,
                  keptRows: rows.length,
                  contextLabel: 'paired observations'
              });
              if (!proceed) {
                  uploadedPairedData = null;
                  updateUploadStatus(InputModes.PAIRED, 'Upload cancelled because some rows had missing or invalid values.', 'error');
                  setFileFeedback('Upload cancelled because some rows had missing or invalid values.', 'error');
                  return;
              }
          }
          uploadedPairedData = {
            xValues: rows.map(values => values[0]),
            yValues: rows.map(values => values[1]),
            xLabel: headers[0] || 'Variable X',
              yLabel: headers[1] || 'Variable Y',
              rowCount: rows.length
          };
          const skippedNote = errors.length ? ` Skipped ${errors.length} observations due to missing or invalid values.` : '';
          const headerNote = headers.join(', ');
          let statusNote = '';
          if (totalRows > rows.length) {
              statusNote = ` Using ${rows.length} of ${totalRows} paired observations.`;
          }
          setFileFeedback(`Loaded ${rows.length} pairs from ${headerNote}.${skippedNote}${statusNote}`, 'success');
          updateUploadStatus(InputModes.PAIRED, `${rows.length} paired observation(s) ready.${skippedNote}${statusNote}`, 'success');
        updateResults();
    } catch (error) {
        uploadedPairedData = null;
        updateUploadStatus(InputModes.PAIRED, error.message, 'error');
        setFileFeedback(error.message, 'error');
        throw error;
    }
}

  function importMatrixData(text) {
      try {
          let { headers, rows, errors } = parseDelimitedText(text, null, { maxRows: MAX_UPLOAD_ROWS });
          const totalRows = rows.length + (Array.isArray(errors) ? errors.length : 0);
          if (headers.length < 2) {
              throw new Error('Matrix upload requires at least two columns.');
          }
          if (typeof maybeConfirmDroppedRows === 'function') {
              const proceed = maybeConfirmDroppedRows({
                  totalRows,
                  keptRows: rows.length,
                  contextLabel: 'observations'
              });
              if (!proceed) {
                  uploadedMatrixData = null;
                  updateUploadStatus(InputModes.MATRIX, 'Upload cancelled because some rows had missing or invalid values.', 'error');
                  setFileFeedback('Upload cancelled because some rows had missing or invalid values.', 'error');
                  return;
              }
          }
          if (typeof detectIdLikeColumns === 'function') {
              const idCandidates = detectIdLikeColumns(headers, rows);
              if (Array.isArray(idCandidates) && idCandidates.length) {
                  const names = idCandidates.map(c => `"${headers[c.index]}"`).join(', ');
                  const message = idCandidates.length === 1
                      ? `The column ${names} has a unique value for every row and may be an observation ID column. Ignore this column for correlation analysis? (Cancel = keep it as a regular variable).`
                      : `The columns ${names} each have a unique value for every row and may be observation ID columns. Ignore these column(s) for correlation analysis? (Cancel = keep them as regular variables).`;
                  if (window.confirm(message)) {
                      const toDrop = new Set(idCandidates.map(c => c.index));
                      const keptIndices = headers.map((_, idx) => idx).filter(idx => !toDrop.has(idx));
                      const keptHeaders = keptIndices.map(idx => headers[idx]);
                      const newRows = rows.map(values => keptIndices.map(idx => values[idx]));
                      headers = keptHeaders;
                      rows = newRows;
                  }
              }
          }
          const seen = new Set();
          const variableNames = headers.map((header, index) => {
              const base = header || `Var ${index + 1}`;
              let candidate = base;
              let suffix = 2;
            while (seen.has(candidate)) {
                candidate = `${base}_${suffix++}`;
            }
            seen.add(candidate);
            return candidate;
        });
        const columnStore = {};
        variableNames.forEach((name, index) => {
            columnStore[name] = rows.map(values => values[index]);
        });
          uploadedMatrixData = {
              variables: variableNames,
              columns: columnStore,
              rowCount: rows.length,
              errors
          };
          const skippedNote = errors.length ? ` Skipped ${errors.length} observations due to missing or invalid values.` : '';
          let statusNote = '';
          if (totalRows > rows.length) {
              statusNote = ` Using ${rows.length} of ${totalRows} observations.`;
          }
          setFileFeedback(`Loaded ${rows.length} observations across ${headers.length} variables.${skippedNote}${statusNote}`, 'success');
          updateUploadStatus(InputModes.MATRIX, `${rows.length} observation(s) ready with ${headers.length} columns.${skippedNote}${statusNote}`, 'success');
        updateResults();
    } catch (error) {
        uploadedMatrixData = null;
        updateUploadStatus(InputModes.MATRIX, error.message, 'error');
        setFileFeedback(error.message, 'error');
        throw error;
    }
}

function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
        if (activeMode !== InputModes.PAIRED) {
            if (activeMode === InputModes.MATRIX) {
                try {
                    importMatrixData(event.target.result);
                } catch {
                    // errors handled above
                }
            } else {
                setFileFeedback('Switch to paired upload mode to import files.', 'error');
            }
            return;
        }
        try {
            importPairedData(event.target.result);
        } catch {
            // Errors already surfaced via status text.
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

    if (!window.UIUtils || typeof window.UIUtils.initDropzone !== 'function') {
        setFileFeedback('Upload helper not available. Please refresh the page.', 'error');
        return;
    }

    window.UIUtils.initDropzone({
        dropzoneId: 'file-dropzone',
        inputId: 'file-input',
        browseId: 'browse-files',
        accept: '.csv,.tsv,.txt',
        onFile: handleFile,
        onError: message => {
            if (message) setFileFeedback(message, 'error');
        }
    });

    setFileFeedback('No file uploaded.', '');
}


function setupTemplateDownloads() {
    const pairedButton = document.getElementById('download-paired-template');
    const matrixButton = document.getElementById('download-matrix-template');
    if (pairedButton) {
        pairedButton.addEventListener('click', () => {
            const content = 'label,x,y\nSample 1,4.2,5.1\nSample 2,3.7,4.9\nSample 3,5.0,6.4\n';
            downloadTextFile('correlation_template.csv', content);
        });
    }
    if (matrixButton) {
        matrixButton.addEventListener('click', () => {
            const content = 'spend,signups,retention\n42,360,78\n50,395,81\n55,425,84\n60,452,87\n65,480,89\n';
            downloadTextFile('correlation_matrix_template.csv', content);
        });
    }
}

function refreshScenarioDownloadVisibility() {
    const button = document.getElementById('scenario-download');
    if (!button) return;
    const shouldShow = Boolean(activeScenarioDataset) && activeMode !== InputModes.MANUAL;
    button.classList.toggle('hidden', !shouldShow);
    button.disabled = !shouldShow;
}

function resetScenarioDownload() {
    activeScenarioDataset = null;
    const button = document.getElementById('scenario-download');
    if (button) {
        button.disabled = true;
        button.textContent = 'Download scenario dataset';
    }
    refreshScenarioDownloadVisibility();
}

function enableScenarioDownload(datasetInfo) {
    if (!datasetInfo || !datasetInfo.content) {
        resetScenarioDownload();
        return;
    }
    activeScenarioDataset = {
        filename: datasetInfo.filename || 'scenario_dataset.csv',
        content: datasetInfo.content,
        mimeType: datasetInfo.mimeType || 'text/csv'
    };
    const button = document.getElementById('scenario-download');
    if (button) {
        button.disabled = false;
        button.textContent = 'Download scenario dataset';
    }
    refreshScenarioDownloadVisibility();
}

function setupScenarioDownloadButton() {
    const button = document.getElementById('scenario-download');
    if (!button) return;
    button.addEventListener('click', () => {
        if (!activeScenarioDataset) return;
        downloadTextFile(
            activeScenarioDataset.filename,
            activeScenarioDataset.content,
            { mimeType: activeScenarioDataset.mimeType || 'text/csv' }
        );
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
        rawFile: ''
    };
    let currentSection = '';
    const lines = text.split(/\r?\n/);
    const descriptionLines = [];
    const pairedLines = [];
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
    return result;
}

function applyScenarioData(parsed) {
    if (parsed.mode === 'paired' && parsed.pairedData) {
        switchMode(InputModes.PAIRED, { suppressUpdate: true });
        importPairedData(parsed.pairedData);
    } else if (parsed.mode === 'matrix' && parsed.pairedData) {
        switchMode(InputModes.MATRIX, { suppressUpdate: true });
        importMatrixData(parsed.pairedData);
    } else {
        updateResults();
    }
}

function buildScenarioDatasetFromParsed(parsed, scenarioId) {
    if (!parsed || !parsed.pairedData) return null;
    const content = parsed.pairedData.trim();
    if (!content) return null;
    const safeId = (scenarioId || 'scenario').replace(/\s+/g, '_').toLowerCase();
    const suffix = parsed.mode === 'matrix' ? 'matrix' : 'paired';
    return {
        filename: `${safeId}_${suffix}_data.csv`,
        content,
        mimeType: 'text/csv'
    };
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
        const datasetInfo = buildScenarioDatasetFromParsed(parsed, scenario.id);
        enableScenarioDownload(datasetInfo);
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
    setupMethodControls();
    setupAlphaControl();
    setupConfidenceButtons();
    setupDropzone();
    setupTemplateDownloads();
    setupScenarioSelector();
    setupScenarioDownloadButton();
    setupVisualSettingsControls();
    const scatterSelect = document.getElementById('scatterpair-select');
    if (scatterSelect) {
        scatterSelect.addEventListener('change', handleScatterSelectChange);
    }
    renderVariableStatsTable(null);
    switchMode(activeMode, { suppressUpdate: true });
    refreshScenarioDownloadVisibility();
});
