// Constants and utility functions
const CREATED_DATE = new Date('2025-11-06').toLocaleDateString();
let modifiedDate = new Date().toLocaleDateString();

let selectedConfidenceLevel = 0.95;
const scenarioState = {
    manifest: [],
    defaultDescription: ''
};

const DataEntryModes = Object.freeze({
    MANUAL: 'manual',
    SUMMARY: 'summary-upload',
    RAW: 'raw-upload'
});

const SUMMARY_TEMPLATE_CSV = [
    'group,mean,sd,n,delta0,alpha',
    'Group 1,45,8.2,120,5,0.05',
    'Group 2,39,7.6,118,5,0.05'
].join('\n');

const RAW_TEMPLATE_CSV = [
    'group,value',
    'Group 1,42.1',
    'Group 1,39.8',
    'Group 1,45.0',
    'Group 2,37.5',
    'Group 2,40.2',
    'Group 2,38.9'
].join('\n');

let activeDataEntryMode = DataEntryModes.MANUAL;
let activeScenarioDataset = null;

function setUploadStatus(id, message, state) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('success', 'error');
    if (state) {
        el.classList.add(state);
    }
}

function formatAlpha(value) {
    if (!isFinite(value)) return '0.050';
    const clamped = Math.min(0.25, Math.max(0.0005, value));
    if (clamped >= 0.1) return clamped.toFixed(2);
    if (clamped >= 0.01) return clamped.toFixed(3);
    return clamped.toFixed(4);
}

function calculateMean(values = []) {
    if (!values.length) return NaN;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateSd(values = []) {
    if (values.length < 2) return NaN;
    const mean = calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
}

function findHeaderIndex(headers = [], candidates = []) {
    const normalized = headers.map(header => header.toLowerCase());
    for (const candidate of candidates) {
        const index = normalized.indexOf(candidate.toLowerCase());
        if (index !== -1) {
            return index;
        }
    }
    return -1;
}

function setAlphaValue(alphaValue, { updateResults: shouldUpdate = false } = {}) {
    if (!isFinite(alphaValue)) return;
    const alphaInput = document.getElementById('alpha');
    if (alphaInput) {
        alphaInput.value = formatAlpha(alphaValue);
    }
    const level = 1 - parseFloat(alphaInput ? alphaInput.value : alphaValue);
    if (isFinite(level)) {
        setConfidenceLevel(level, { skipAlphaUpdate: true });
    }
    if (shouldUpdate) {
        updateResults();
    }
}

function setDataEntryMode(mode) {
    if (!Object.values(DataEntryModes).includes(mode)) {
        mode = DataEntryModes.MANUAL;
    }
    activeDataEntryMode = mode;
    document.querySelectorAll('.mode-button').forEach(button => {
        const isActive = button.dataset.mode === mode;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    document.querySelectorAll('.mode-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.mode === mode);
    });
}

function setupDataEntryModeToggle() {
    const toggle = document.querySelector('.mode-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', event => {
        const button = event.target.closest('.mode-button');
        if (!button) return;
        event.preventDefault();
        const mode = button.dataset.mode;
        setDataEntryMode(mode);
    });
    setDataEntryMode(activeDataEntryMode);
}

function parseSummaryUpload(text = '') {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('File is empty.');
    }
    const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length);
    if (lines.length < 3) {
        throw new Error('Provide a header row and at least two group rows.');
    }
    const delimiter = detectDelimiter ? detectDelimiter(lines[0]) : ',';
    const headers = lines[0].split(delimiter).map(header => header.trim().toLowerCase());
    const nameIdx = findHeaderIndex(headers, ['group', 'name', 'label']);
    const meanIdx = findHeaderIndex(headers, ['mean', 'avg', 'mu']);
    const sdIdx = findHeaderIndex(headers, ['sd', 'std', 'std_dev', 'stdev', 'sigma']);
    const nIdx = findHeaderIndex(headers, ['n', 'sample', 'size', 'count']);
    const deltaIdx = findHeaderIndex(headers, ['delta0', 'delta', 'hypothesized_difference']);
    const alphaIdx = findHeaderIndex(headers, ['alpha', 'significance', 'sig_level']);
    if ([nameIdx, meanIdx, sdIdx, nIdx].some(idx => idx === -1)) {
        throw new Error('Headers must include group, mean, sd, and n columns.');
    }
    const entries = [];
    let deltaValue = null;
    let alphaValue = null;
    lines.slice(1).forEach(line => {
        const parts = line.split(delimiter).map(part => part.trim());
        if (parts.length < headers.length) return;
        const mean = parseFloat(parts[meanIdx]);
        const sd = parseFloat(parts[sdIdx]);
        const n = parseFloat(parts[nIdx]);
        if (!isFinite(mean) || !isFinite(sd) || !isFinite(n)) return;
        entries.push({
            name: parts[nameIdx] || '',
            mean,
            sd,
            n: Math.max(2, Math.round(n))
        });
        if (deltaIdx !== -1 && deltaValue === null) {
            const deltaCandidate = parseFloat(parts[deltaIdx]);
            if (isFinite(deltaCandidate)) {
                deltaValue = deltaCandidate;
            }
        }
        if (alphaIdx !== -1 && alphaValue === null) {
            const alphaCandidate = parseFloat(parts[alphaIdx]);
            if (isFinite(alphaCandidate)) {
                alphaValue = alphaCandidate;
            }
        }
    });
    if (entries.length < 2) {
        throw new Error('Need at least two valid group rows.');
    }
    return {
        groups: entries.slice(0, 2),
        delta: deltaValue,
        alpha: alphaValue
    };
}

function parseRawUpload(text = '') {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('File is empty.');
    const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length);
    if (lines.length < 3) throw new Error('Provide a header row and at least two observations.');
    const delimiter = detectDelimiter ? detectDelimiter(lines[0]) : ',';
    const headers = lines[0].split(delimiter).map(header => header.trim().toLowerCase());
    const groupIdx = findHeaderIndex(headers, ['group', 'label', 'segment']);
    const valueIdx = findHeaderIndex(headers, ['value', 'metric', 'measurement', 'score']);
    if (groupIdx === -1 || valueIdx === -1) {
        throw new Error('Headers must include group and value columns.');
    }
    const groups = new Map();
    lines.slice(1).forEach(line => {
        const parts = line.split(delimiter).map(part => part.trim());
        if (parts.length < headers.length) return;
        const group = parts[groupIdx];
        const value = parseFloat(parts[valueIdx]);
        if (!group || !isFinite(value)) return;
        if (!groups.has(group)) {
            groups.set(group, []);
        }
        groups.get(group).push(value);
    });
    if (groups.size < 2) {
        throw new Error('Need at least two unique group labels.');
    }
    const summaries = Array.from(groups.entries()).map(([name, values]) => ({
        name,
        mean: calculateMean(values),
        sd: calculateSd(values),
        n: values.length
    })).filter(entry => entry.n >= 2 && isFinite(entry.mean) && isFinite(entry.sd));
    if (summaries.length < 2) {
        throw new Error('Unable to compute statistics for two groups.');
    }
    return summaries.slice(0, 2);
}

function applyGroupStats(payload, options = {}) {
    const entries = Array.isArray(payload?.groups) ? payload.groups : payload;
    if (!Array.isArray(entries) || entries.length < 2) return;
    const [first, second] = entries;
    document.getElementById('group1-name').value = first.name || 'Group 1';
    document.getElementById('mean1').value = first.mean;
    document.getElementById('sd1').value = Math.max(0, first.sd);
    document.getElementById('n1').value = Math.max(2, Math.round(first.n));

    document.getElementById('group2-name').value = second.name || 'Group 2';
    document.getElementById('mean2').value = second.mean;
    document.getElementById('sd2').value = Math.max(0, second.sd);
    document.getElementById('n2').value = Math.max(2, Math.round(second.n));

    if (payload && isFinite(payload.delta)) {
        document.getElementById('delta0').value = payload.delta;
    }
    if (payload && isFinite(payload.alpha)) {
        setAlphaValue(payload.alpha);
    }

    const targetMode = options.mode || DataEntryModes.MANUAL;
    setDataEntryMode(targetMode);
    if (options.update !== false) {
        updateResults();
    }
}

function setupSummaryUpload() {
    const dropzoneId = 'summary-dropzone';
    const inputId = 'summary-input';
    const browseId = 'summary-browse';
    const statusId = 'summary-upload-status';
    const templateButton = document.getElementById('summary-template-download');

    if (templateButton && SUMMARY_TEMPLATE_CSV) {
        templateButton.addEventListener('click', event => {
            event.preventDefault();
            downloadTextFile('ttest_summary_template.csv', SUMMARY_TEMPLATE_CSV);
        });
    }

    if (!window.UIUtils || typeof window.UIUtils.initDropzone !== 'function') {
        setUploadStatus(statusId, 'Upload helper not available. Please refresh the page.', 'error');
        return;
    }

    const handleFile = file => {
        if (!file) return;
        setUploadStatus(statusId, `Loading ${file.name}...`);
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const text = event.target.result;
                const payload = parseSummaryUpload(text);
                applyGroupStats(payload, { mode: DataEntryModes.SUMMARY });
                const groups = payload.groups || [];
                const label = groups.length >= 2
                    ? `${groups[0].name || 'Group 1'} and ${groups[1].name || 'Group 2'}`
                    : 'both groups';
                setUploadStatus(statusId, `Loaded summary stats for ${label}.`, 'success');
            } catch (error) {
                console.error(error);
                setUploadStatus(statusId, error.message || 'Unable to parse file.', 'error');
            }
        };
        reader.onerror = () => {
            setUploadStatus(statusId, 'Unable to read file.', 'error');
        };
        reader.readAsText(file);
    };

    window.UIUtils.initDropzone({
        dropzoneId,
        inputId,
        browseId,
        onFile: handleFile,
        onError: message => {
            if (message) {
                setUploadStatus(statusId, message, 'error');
            }
        }
    });

    setUploadStatus(statusId, 'No summary file uploaded.', '');
}

function setupRawUpload() {
    const dropzoneId = 'raw-dropzone';
    const inputId = 'raw-input';
    const browseId = 'raw-browse';
    const statusId = 'raw-upload-status';
    const templateButton = document.getElementById('raw-template-download');

    if (templateButton && RAW_TEMPLATE_CSV) {
        templateButton.addEventListener('click', event => {
            event.preventDefault();
            downloadTextFile('ttest_raw_template.csv', RAW_TEMPLATE_CSV);
        });
    }

    if (!window.UIUtils || typeof window.UIUtils.initDropzone !== 'function') {
        setUploadStatus(statusId, 'Upload helper not available. Please refresh the page.', 'error');
        return;
    }

    const handleFile = file => {
        if (!file) return;
        setUploadStatus(statusId, `Loading ${file.name}...`);
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const text = event.target.result;
                const entries = parseRawUpload(text);
                applyGroupStats({ groups: entries }, { mode: DataEntryModes.RAW });
                setUploadStatus(statusId, `Computed stats for ${entries[0].name || 'Group 1'} and ${entries[1].name || 'Group 2'}.`, 'success');
            } catch (error) {
                console.error(error);
                setUploadStatus(statusId, error.message || 'Unable to parse file.', 'error');
            }
        };
        reader.onerror = () => {
            setUploadStatus(statusId, 'Unable to read file.', 'error');
        };
        reader.readAsText(file);
    };

    window.UIUtils.initDropzone({
        dropzoneId,
        inputId,
        browseId,
        onFile: handleFile,
        onError: message => {
            if (message) {
                setUploadStatus(statusId, message, 'error');
            }
        }
    });

    setUploadStatus(statusId, 'No raw file uploaded.', '');
}

function buildScenarioDatasetFromGroups(groups = [], scenarioId = '', options = {}) {
    if (!Array.isArray(groups) || groups.length < 2) return null;
    const safeId = (scenarioId || 'scenario').replace(/\s+/g, '_').toLowerCase();
    const lines = ['group,mean,sd,n,delta0,alpha'];
    const deltaValue = options.delta0;
    const alphaValue = options.alpha;
    groups.slice(0, 2).forEach(group => {
        lines.push([
            escapeCsv(group.name || ''),
            isFinite(group.mean) ? group.mean : '',
            isFinite(group.sd) ? group.sd : '',
            Number.isFinite(group.n) ? group.n : '',
            typeof deltaValue !== 'undefined' && deltaValue !== null ? deltaValue : '',
            typeof alphaValue !== 'undefined' && alphaValue !== null ? alphaValue : ''
        ].join(','));
    });
    return {
        filename: `${safeId}_summary_inputs.csv`,
        content: lines.join('\n'),
        mimeType: 'text/csv'
    };
}

function buildScenarioDatasetFromRaw(rawText = '', scenarioId = '') {
    const trimmed = rawText.trim();
    if (!trimmed) return null;
    const safeId = (scenarioId || 'scenario').replace(/\s+/g, '_').toLowerCase();
    return {
        filename: `${safeId}_raw_data.csv`,
        content: trimmed,
        mimeType: 'text/csv'
    };
}

function escapeCsv(value) {
    if (value == null) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function enableScenarioDownload(dataset) {
    const button = document.getElementById('scenario-download');
    if (!button) return;
    activeScenarioDataset = dataset || null;
    if (dataset) {
        button.classList.remove('hidden');
        button.disabled = false;
    } else {
        button.classList.add('hidden');
        button.disabled = true;
    }
}

function getGroupNames() {
    const defaultNames = ['Group 1', 'Group 2'];
    return ['group1-name', 'group2-name'].map((id, index) => {
        const input = document.getElementById(id);
        if (!input) {
            return defaultNames[index];
        }
        const value = input.value.trim();
        return value || defaultNames[index];
    });
}

function applyGroupNames(group1Name, group2Name) {
    const heading1 = document.getElementById('group1-heading');
    const heading2 = document.getElementById('group2-heading');
    const scenario1 = document.getElementById('scenario-group1');
    const scenario2 = document.getElementById('scenario-group2');

    if (heading1) heading1.textContent = group1Name;
    if (heading2) heading2.textContent = group2Name;
    if (scenario1) scenario1.textContent = group1Name;
    if (scenario2) scenario2.textContent = group2Name;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}

function normCdf(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function normInv(p) {
    if (p <= 0 || p >= 1) {
        throw new Error('Probability must be between 0 and 1');
    }

    // Abramowitz and Stegun approximation
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

    let q, r;
    if (p < pLow) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }

    if (p <= pHigh) {
        q = p - 0.5;
        r = q * q;
        return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
            (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    }

    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
}

function tCriticalApprox(prob, df) {
    const z = normInv(prob);
    if (!isFinite(df) || df <= 0) {
        return z;
    }
    const z2 = z * z;
    const z3 = z2 * z;
    const z5 = z3 * z2;

    return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df * df);
}

function calculateCohensD(mean1, sd1, n1, mean2, sd2, n2) {
    const pooledSD = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
    return Math.abs(mean1 - mean2) / pooledSD;
}

function calculatePower(d, n1, n2, alpha = 0.05) {
    const ncp = d * Math.sqrt((n1 * n2) / (n1 + n2));
    const criticalZ = Math.abs(normInv(alpha / 2));
    return 1 - normCdf(criticalZ - ncp) + normCdf(-criticalZ - ncp);
}

function getEffectSizeInterpretation(d) {
    if (d < 0.2) return 'Very small effect size';
    if (d < 0.5) return 'Small effect size';
    if (d < 0.8) return 'Medium effect size';
    return 'Large effect size';
}

function formatPValueAPA(p) {
    if (p < 0.001) {
        return 'p < .001';
    }
    const formatted = p.toFixed(3);
    if (formatted === '1.000') {
        return 'p = 1.000';
    }
    return `p = ${formatted.replace(/^0/, '')}`;
}

function calculateWelchTTest(mean1, sd1, n1, mean2, sd2, n2, delta0 = 0) {
    const se1 = (sd1 * sd1) / n1;
    const se2 = (sd2 * sd2) / n2;
    const se = Math.sqrt(se1 + se2);

    const diff = mean1 - mean2 - delta0;
    const t = diff / se;

    const dfNumerator = Math.pow(se1 + se2, 2);
    const dfDenominator = (Math.pow(se1, 2) / (n1 - 1)) + (Math.pow(se2, 2) / (n2 - 1));
    const df = dfNumerator / dfDenominator;

    const cohensD = calculateCohensD(mean1, sd1, n1, mean2, sd2, n2);
    const alpha = 1 - selectedConfidenceLevel;
    const power = calculatePower(cohensD, n1, n2, alpha);

    return { t, df, se, cohensD, power };
}

function ensureRange(rangeMin, rangeMax, minWidth = 1) {
    if (!isFinite(rangeMin) || !isFinite(rangeMax)) {
        return [-1, 1];
    }
    if (rangeMin === rangeMax) {
        return [rangeMin - minWidth / 2, rangeMax + minWidth / 2];
    }
    let width = rangeMax - rangeMin;
    if (width < minWidth) {
        const pad = (minWidth - width) / 2;
        rangeMin -= pad;
        rangeMax += pad;
        width = minWidth;
    }
    const padding = width * 0.1;
    return [rangeMin - padding, rangeMax + padding];
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function renderMeansFanChart(groups, intervals, axisRange, confidenceLevels) {
    const yPositions = new Map();
    groups.forEach((group, index) => {
        yPositions.set(group.id, groups.length - index);
    });
    const topLevel = confidenceLevels[confidenceLevels.length - 1];
    const fanHeights = { 0.5: 0.16, 0.8: 0.22 };
    fanHeights[topLevel] = Math.max(fanHeights[topLevel] || 0, 0.28);

    const colors = {
        0.5: 'rgba(111, 140, 255, 0.45)',
        0.8: 'rgba(147, 177, 255, 0.35)'
    };
    colors[topLevel] = 'rgba(216, 226, 255, 0.25)';

    const shapes = [];
    const annotations = [];
    groups.forEach(group => {
        const y = yPositions.get(group.id);
        annotations.push({
            x: group.mean,
            y: y - 0.55,
            xref: 'x',
            yref: 'y',
            text: group.mean.toFixed(2),
            showarrow: false,
            font: { size: 12, color: '#2c3e50' }
        });

        confidenceLevels.slice().reverse().forEach(level => {
            const band = intervals[group.id][level];
            const height = fanHeights[level] || 0.25;
            shapes.push({
                type: 'rect',
                xref: 'x',
                yref: 'y',
                x0: band.lower,
                x1: band.upper,
                y0: y - height,
                y1: y + height,
                fillcolor: colors[level] || 'rgba(216, 226, 255, 0.25)',
                line: { width: 0 },
                layer: 'below'
            });

            if (Math.abs(level - topLevel) < 1e-6) {
                const labelY = y;
                annotations.push({
                    x: band.lower,
                    y: labelY,
                    xref: 'x',
                    yref: 'y',
                    text: band.lower.toFixed(2),
                    showarrow: false,
                    font: { size: 11 },
                    align: 'right',
                    xanchor: 'right'
                }, {
                    x: band.upper,
                    y: labelY,
                    xref: 'x',
                    yref: 'y',
                    text: band.upper.toFixed(2),
                    showarrow: false,
                    font: { size: 11 },
                    align: 'left',
                    xanchor: 'left'
                });
            }
        });
    });

    const trace = {
        x: groups.map(g => g.mean),
        y: groups.map(g => yPositions.get(g.id)),
        mode: 'markers',
        type: 'scatter',
        marker: {
            color: '#c8102e',
            size: 20,
            symbol: 'circle',
            line: { color: '#c8102e', width: 2 }
        },
        text: groups.map(g => `${g.name}: ${g.mean.toFixed(3)}`),
        hoverinfo: 'text'
    };

    const tickVals = groups.map((_, index) => groups.length - index);
    const tickTexts = groups.map(group => `${group.name} (n=${group.n})`);

    const layout = {
        title: `${groups[0].name} vs ${groups[1].name} means (${confidenceLevels.map(l => Math.round(l * 100)).join('% / ')}%)`,
        margin: { l: 60, r: 40, t: 60, b: 60 },
        shapes,
        annotations,
        xaxis: {
            title: 'Observed mean',
            range: axisRange,
            zeroline: true,
            zerolinecolor: '#b0bec5',
            gridcolor: '#eceff1'
        },
        yaxis: {
            range: [0.4, 2.6],
            tickvals: tickVals,
            ticktext: tickTexts,
            showgrid: false
        },
        height: 420,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        showlegend: false
    };

    Plotly.react('means-chart', [trace], layout, { responsive: true });
}

function renderDifferenceFanChart(diffStats, intervals, axisRange, confidenceLevels, delta0) {
    const y = 1;
    const topLevel = confidenceLevels[confidenceLevels.length - 1];
    const fanHeights = { 0.5: 0.18, 0.8: 0.23 };
    fanHeights[topLevel] = Math.max(fanHeights[topLevel] || 0, 0.3);

    const colors = {
        0.5: 'rgba(111, 140, 255, 0.45)',
        0.8: 'rgba(147, 177, 255, 0.35)'
    };
    colors[topLevel] = 'rgba(216, 226, 255, 0.25)';

    const shapes = [];
    const annotations = [];

    confidenceLevels.slice().reverse().forEach(level => {
        const band = intervals[level];
        const height = fanHeights[level] || 0.25;
        shapes.push({
            type: 'rect',
            xref: 'x',
            yref: 'y',
            x0: band.lower,
            x1: band.upper,
            y0: y - height,
            y1: y + height,
                fillcolor: colors[level] || 'rgba(216, 226, 255, 0.25)',
                line: { width: 0 },
            layer: 'below'
        });

        if (Math.abs(level - topLevel) < 1e-6) {
        const labelY = y;
        annotations.push({
            x: band.lower,
                y: labelY,
                xref: 'x',
                yref: 'y',
                text: band.lower.toFixed(2),
                showarrow: false,
                font: { size: 11 },
                align: 'right',
                xanchor: 'right'
            }, {
                x: band.upper,
                y: labelY,
                xref: 'x',
                yref: 'y',
                text: band.upper.toFixed(2),
                showarrow: false,
                font: { size: 11 },
                align: 'left',
                xanchor: 'left'
            });
        }
    });

    annotations.push({
        x: clamp(diffStats.meanDifference, axisRange[0], axisRange[1]),
        y: y - 0.45,
        xref: 'x',
        yref: 'y',
        text: diffStats.meanDifference.toFixed(2),
        showarrow: false,
        font: { size: 12, color: '#2c3e50' }
    });

    const differenceTrace = {
        x: [diffStats.meanDifference],
        y: [y],
        mode: 'markers',
        type: 'scatter',
        marker: {
            color: '#c8102e',
            size: 20,
            symbol: 'circle',
            line: { color: '#c8102e', width: 2 }
        },
        hoverinfo: 'text',
        text: [`Difference: ${diffStats.meanDifference.toFixed(3)}`]
    };

    const safeGroup1 = escapeHtml(diffStats.group1Name);
    const safeGroup2 = escapeHtml(diffStats.group2Name);
    const tickLabel = `Difference (${safeGroup1} n=${diffStats.group1N}, ${safeGroup2} n=${diffStats.group2N})`;

    const layout = {
        title: `Difference fan chart (${safeGroup1} âˆ’ ${safeGroup2}) with ${confidenceLevels.map(l => Math.round(l * 100)).join('% / ')}% intervals`,
        margin: { l: 60, r: 40, t: 60, b: 60 },
        shapes,
        annotations,
        xaxis: {
            title: `Difference in means (${safeGroup1} - ${safeGroup2})`,
            range: axisRange,
            zeroline: true,
            zerolinecolor: '#90a4ae',
            gridcolor: '#eceff1',
            tickformat: '.2f'
        },
        yaxis: {
            range: [0.4, 1.6],
            tickvals: [1],
            ticktext: [tickLabel],
            showgrid: false,
            fixedrange: true
        },
        height: 360,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        showlegend: false
    };

    const referenceLine = {
        x: [delta0, delta0],
        y: [0.4, 1.6],
        mode: 'lines',
        name: 'Î”â‚€ reference',
        line: {
            color: '#455a64',
            dash: 'dot',
            width: 2
        },
        hoverinfo: 'skip'
    };

    Plotly.react('difference-chart', [referenceLine, differenceTrace], layout, { responsive: true });
}

function updateMeansNarrative(groups, intervals, selectedLevel) {
    const narrative = document.getElementById('means-narrative');
    const lines = groups.map(group => {
        const ci = intervals[group.id][selectedLevel];
        const safeName = escapeHtml(group.name);
        return `<strong>${safeName}</strong> has an observed mean of ${group.mean.toFixed(2)} with a ${Math.round(selectedLevel * 100)}% confidence interval from ${ci.lower.toFixed(2)} to ${ci.upper.toFixed(2)}.`;
    });

    const firstId = groups[0].id;
    const secondId = groups[1].id;
    const overlap = intervals[firstId][selectedLevel].upper >= intervals[secondId][selectedLevel].lower &&
        intervals[secondId][selectedLevel].upper >= intervals[firstId][selectedLevel].lower;

    const overlapLine = overlap
        ? 'The fan bands overlap, suggesting the mean difference may not be practically distinct at this confidence level.'
        : 'The fan bands do not overlap, highlighting a clear separation between the group means at this confidence level.';

    narrative.innerHTML = `<p>${lines.join(' ')}</p><p>${overlapLine}</p>`;
}

function updateDifferenceNarrative(diffStats, intervals, selectedLevel, delta0, pValue, alpha) {
    const narrative = document.getElementById('difference-narrative');
    const ci = intervals[selectedLevel];
    const coversNull = ci.lower <= delta0 && ci.upper >= delta0;
    const decision = pValue < alpha
        ? `The ${Math.round(selectedLevel * 100)}% confidence interval excludes Î”â‚€ = ${delta0.toFixed(2)}, aligning with the rejection of the null.`
        : `The ${Math.round(selectedLevel * 100)}% confidence interval includes Î”â‚€ = ${delta0.toFixed(2)}, consistent with failing to reject the null.`;

    const safeGroup1 = escapeHtml(diffStats.group1Name);
    const safeGroup2 = escapeHtml(diffStats.group2Name);

    narrative.innerHTML = `
        <p>The observed difference in means between <strong>${safeGroup1}</strong> and <strong>${safeGroup2}</strong> is ${diffStats.meanDifference.toFixed(2)} with a ${Math.round(selectedLevel * 100)}% confidence interval from ${ci.lower.toFixed(2)} to ${ci.upper.toFixed(2)}.</p>
        <p>This interval ${coversNull ? 'includes' : 'excludes'} Î”â‚€ = ${delta0.toFixed(2)}. ${decision} It corresponds to a standard error of ${diffStats.standardError.toFixed(3)} and a t-statistic of ${diffStats.tStatistic.toFixed(3)}.</p>
    `;
}

function updateInterpretation(t, df, pValue, ciLower, ciUpper, delta0, alpha, cohensD, power, mean1, sd1, n1, mean2, sd2, n2, diffMean, group1Name, group2Name) {
    const interpretation = document.getElementById('interpretation');
    if (!interpretation) return;

    const roundedT = t.toFixed(3);
    const roundedDf = df.toFixed(1);
    const roundedP = pValue.toFixed(4);
    const roundedCiLower = ciLower.toFixed(3);
    const roundedCiUpper = ciUpper.toFixed(3);
    const roundedD = cohensD.toFixed(3);
    const roundedPower = (power * 100).toFixed(1);
    const roundedDiffMean = diffMean.toFixed(3);

    const levelLabel = Math.round(selectedConfidenceLevel * 100);
    const alphaPercent = (alpha * 100).toFixed(1).replace(/\.0$/, '');

    const safeGroup1 = escapeHtml(group1Name);
    const safeGroup2 = escapeHtml(group2Name);
    const mean1Text = mean1.toFixed(2);
    const mean2Text = mean2.toFixed(2);
    const sd1Text = sd1.toFixed(2);
    const sd2Text = sd2.toFixed(2);
    const deltaText = delta0.toFixed(3);
    const apaP = formatPValueAPA(pValue);
    const effectDescriptor = getEffectSizeInterpretation(cohensD).toLowerCase();

    const apaReport = `Welch's t-test comparing ${safeGroup1} (M = ${mean1Text}, SD = ${sd1Text}, n = ${n1}) and ${safeGroup2} (M = ${mean2Text}, SD = ${sd2Text}, n = ${n2}) ${pValue < alpha ? 'yielded a significant difference' : 'did not yield a significant difference'}, t(${roundedDf}) = ${roundedT}, ${apaP}, ${levelLabel}% CI [${roundedCiLower}, ${roundedCiUpper}], Cohen's d = ${roundedD}. The observed mean difference was ${roundedDiffMean}, evaluated against Δ₀ = ${deltaText}.`;

    const diffDirection = diffMean > 0
        ? `${safeGroup1} exceeded ${safeGroup2}`
        : diffMean < 0
            ? `${safeGroup1} trailed ${safeGroup2}`
            : `${safeGroup1} matched ${safeGroup2}`;
    const absDiff = Math.abs(diffMean).toFixed(2);
    const managerialReport = `${diffDirection} by ${absDiff} units on average. The ${levelLabel}% confidence interval from ${roundedCiLower} to ${roundedCiUpper} ${ciLower <= delta0 && ciUpper >= delta0 ? 'still contains' : 'excludes'} the benchmark Δ₀ = ${deltaText}, so the statistical test ${pValue < alpha ? 'rejects' : 'does not reject'} the null hypothesis. This ${effectDescriptor} effect (Cohen's d = ${roundedD}) with ${roundedPower}% power suggests ${pValue < alpha ? 'actionable evidence of a difference' : 'caution before claiming a clear difference'}, especially when weighed against practical considerations.`;

    const apaNode = document.getElementById('apa-report');
    if (apaNode) apaNode.textContent = apaReport;
    const mgrNode = document.getElementById('managerial-report');
    if (mgrNode) mgrNode.textContent = managerialReport;

    let text = `
        <h3>Statistical Results (${levelLabel}% confidence)</h3>
        <div class="results-grid">
            <div class="result-item">
                <h4>Primary Test Statistics</h4>
                <p><strong>Test Statistic:</strong> t = ${roundedT} (df = ${roundedDf})</p>
                <p><strong>P-value:</strong> ${roundedP}</p>
                <p><strong>${levelLabel}% Confidence Interval:</strong> (${roundedCiLower}, ${roundedCiUpper})</p>
            </div>

            <div class="result-item">
                <h4>Effect Size Analysis</h4>
                <p><strong>Cohen's d:</strong> ${roundedD}</p>
                <p><strong>Interpretation:</strong> ${getEffectSizeInterpretation(cohensD)}</p>
                <p><strong>Statistical Power:</strong> ${roundedPower}%</p>
            </div>
        </div>

        <h3>Detailed Interpretation</h3>
        <div class="interpretation-details">
            <h4>Statistical Significance</h4>
            <p>${pValue < alpha ? `We reject the null hypothesis that the true difference equals ${delta0}.` : `We fail to reject the null hypothesis that the true difference equals ${delta0}.`}</p>
            <p>The data ${pValue < alpha ? 'provides' : 'does not provide'} sufficient evidence of a difference from the hypothesized value at the ${alphaPercent}% significance level.</p>

            <h4>Practical Significance</h4>
            <p>The effect size (Cohen's d = ${roundedD}) indicates ${getEffectSizeInterpretation(cohensD).toLowerCase()}. This means the difference between the groups is ${cohensD < 0.2 ? 'very small and might not be practically meaningful' : cohensD < 0.5 ? 'small but might be meaningful in some contexts' : cohensD < 0.8 ? 'moderate and likely practically meaningful' : 'large and practically significant'}.</p>

            <h4>Statistical Power</h4>
            <p>The test has ${roundedPower}% power to detect the observed effect size. ${power < 0.8 ? 'This is below the conventional 80% threshold, suggesting the test might be underpowered. Consider increasing sample sizes.' : 'This exceeds the conventional 80% threshold, indicating adequate power to detect the observed effect.'}</p>

            <div class="educational-note">
                <h4>dy's Learning Note</h4>
                <p>Remember that statistical significance (p-value) and practical significance (effect size) tell different stories:</p>
                <ul>
                    <li>P-value describes how compatible the observed data are with the null hypothesis.</li>
                    <li>Effect size reflects the magnitude of the difference regardless of sample size.</li>
                    <li>Power quantifies the chance of detecting true differences with the current design.</li>
                </ul>
            </div>
        </div>
    `;

    interpretation.innerHTML = text;
}

function clearSummaryTable() {
    const tableBody = document.getElementById('summary-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
    }
    const lowerHeader = document.getElementById('summary-ci-lower-header');
    const upperHeader = document.getElementById('summary-ci-upper-header');
    if (lowerHeader) {
        lowerHeader.textContent = 'Lower Bound';
    }
    if (upperHeader) {
        upperHeader.textContent = 'Upper Bound';
    }
}

function updateDiagnosticsPanel(stats) {
    const container = document.getElementById('diagnostics-content');
    if (!container) return;
    if (!stats) {
        container.innerHTML = '<p class="muted">Provide group summaries to review sample size balance, variance ratios, power, and interval diagnostics.</p>';
        return;
    }

    const { n1, n2, sd1, sd2, cohensD, power, df, ciLower, ciUpper, delta0 } = stats;
    const minN = Math.min(n1, n2);
    const sizeStatus = minN >= 40 ? 'good' : minN >= 20 ? 'caution' : 'alert';
    const sizeMessage = `Smallest arm: ${minN.toLocaleString()} observations. ${sizeStatus === 'good' ? 'Plenty of data for Welch approximations.' : sizeStatus === 'caution' ? 'More data would tighten the interval.' : 'Consider collecting more data before final recommendations.'}`;

    const balanceRatio = Math.min(n1, n2) / Math.max(n1, n2);
    const balanceStatus = balanceRatio >= 0.7 ? 'good' : balanceRatio >= 0.5 ? 'caution' : 'alert';
    const balanceMessage = balanceStatus === 'good'
        ? `Sample sizes are balanced (${n1} vs ${n2}).`
        : `Sample sizes differ (${n1} vs ${n2}); keep precision differences in mind.`;

    const varianceRatio = (sd1 > sd2 ? sd1 / sd2 : sd2 / sd1) || 0;
    const varianceStatus = varianceRatio <= 1.5 ? 'good' : varianceRatio <= 2.5 ? 'caution' : 'alert';
    const varianceMessage = `Variance ratio ≈ ${varianceRatio.toFixed(2)}. ${varianceStatus === 'good' ? 'Spread is similar across groups.' : varianceStatus === 'caution' ? 'Unequal variances make Welch adjustments important.' : 'Large variance gap—ensure the higher-variance group has enough participants.'}`;

    const powerPct = (power * 100).toFixed(1);
    const powerStatus = power >= 0.8 ? 'good' : power >= 0.6 ? 'caution' : 'alert';
    const powerMessage = `Estimated power ≈ ${powerPct}%. ${powerStatus === 'good' ? 'Adequate sensitivity.' : 'Consider increasing sample size to reduce Type II risk.'}`;

    const effectStatus = Math.abs(cohensD) >= 0.8 ? 'good' : Math.abs(cohensD) >= 0.3 ? 'caution' : 'alert';
    const effectMessage = `Cohen's d = ${cohensD.toFixed(3)} (${getEffectSizeInterpretation(cohensD).toLowerCase()}).`;

    const ciIncludesNull = ciLower <= delta0 && ciUpper >= delta0;
    const ciStatus = ciIncludesNull ? 'caution' : 'good';
    const ciMessage = ciIncludesNull
        ? `The ${Math.round(selectedConfidenceLevel * 100)}% CI still includes Δ₀ = ${delta0.toFixed(2)}.`
        : `The ${Math.round(selectedConfidenceLevel * 100)}% CI excludes Δ₀ = ${delta0.toFixed(2)}.`;

    const dfStatus = df >= 60 ? 'good' : df >= 20 ? 'caution' : 'alert';
    const dfMessage = `Welch degrees of freedom ≈ ${df.toFixed(1)}.`;

    const diagnostics = [
        { title: 'Per-group sample size', status: sizeStatus, message: sizeMessage },
        { title: 'Sample balance', status: balanceStatus, message: balanceMessage },
        { title: 'Variance ratio', status: varianceStatus, message: varianceMessage },
        { title: 'Statistical power', status: powerStatus, message: powerMessage },
        { title: 'Effect magnitude', status: effectStatus, message: effectMessage },
        { title: 'Confidence interval vs Δ₀', status: ciStatus, message: ciMessage },
        { title: 'Welch df', status: dfStatus, message: dfMessage }
    ];

    const items = diagnostics.map(item => `
        <div class="diagnostic-item ${item.status}">
            <strong>${item.title}</strong>
            <p>${item.message}</p>
        </div>
    `).join('');

    container.innerHTML = `
        <p>Diagnostics summarize whether Welch assumptions (enough data, manageable variances, and useful power) are satisfied.</p>
        ${items}
    `;
}

function updateSummaryTable(groups, groupIntervals, diffStats, diffIntervals, selectedLevel) {
    const tableBody = document.getElementById('summary-table-body');
    if (!tableBody) {
        return;
    }

    const lowerHeader = document.getElementById('summary-ci-lower-header');
    const upperHeader = document.getElementById('summary-ci-upper-header');
    const levelText = `${Math.round(selectedLevel * 100)}%`;
    if (lowerHeader) {
        lowerHeader.textContent = `${levelText} Lower Bound`;
    }
    if (upperHeader) {
        upperHeader.textContent = `${levelText} Upper Bound`;
    }

    const rows = groups.map(group => {
        const ci = groupIntervals[group.id][selectedLevel];
        const safeName = escapeHtml(group.name);
        return `
            <tr>
                <td>${safeName}</td>
                <td>${group.mean.toFixed(3)}</td>
                <td>${group.standardError.toFixed(3)}</td>
                <td>${ci.lower.toFixed(3)}</td>
                <td>${ci.upper.toFixed(3)}</td>
            </tr>
        `;
    });

    const diffCi = diffIntervals[selectedLevel];
    const diffLabel = `${diffStats.group1Name} âˆ’ ${diffStats.group2Name}`;
    const safeDiffLabel = escapeHtml(diffLabel);
    rows.push(`
        <tr>
            <td>${safeDiffLabel}</td>
            <td>${diffStats.meanDifference.toFixed(3)}</td>
            <td>${diffStats.standardError.toFixed(3)}</td>
            <td>${diffCi.lower.toFixed(3)}</td>
            <td>${diffCi.upper.toFixed(3)}</td>
        </tr>
    `);

    tableBody.innerHTML = rows.join('');
}

function getMeansAxisRange(autoRange) {
    const lock = document.getElementById('means-axis-lock');
    const minInput = document.getElementById('means-axis-min');
    const maxInput = document.getElementById('means-axis-max');

    if (lock.checked) {
        const minValue = parseFloat(minInput.value);
        const maxValue = parseFloat(maxInput.value);
        if (!isNaN(minValue) && !isNaN(maxValue) && maxValue > minValue) {
            return [minValue, maxValue];
        }
    }
    return autoRange;
}

function getDifferenceAxisRange(autoRange) {
    const radios = document.querySelectorAll('input[name="diff-axis-mode"]');
    const symmetricInput = document.getElementById('diff-axis-symmetric');
    const minInput = document.getElementById('diff-axis-min');
    const maxInput = document.getElementById('diff-axis-max');

    let selected = 'auto';
    radios.forEach(radio => {
        if (radio.checked) {
            selected = radio.value;
        }
    });

    if (selected === 'symmetric') {
        const bound = parseFloat(symmetricInput.value);
        if (!isNaN(bound) && bound > 0) {
            return [-Math.abs(bound), Math.abs(bound)];
        }
    }

    if (selected === 'custom') {
        const minValue = parseFloat(minInput.value);
        const maxValue = parseFloat(maxInput.value);
        if (!isNaN(minValue) && !isNaN(maxValue) && maxValue > minValue) {
            return [minValue, maxValue];
        }
    }

    return autoRange;
}

function resetAxisControls() {
    document.getElementById('means-axis-lock').checked = false;
    document.getElementById('means-axis-min').value = '';
    document.getElementById('means-axis-max').value = '';
    document.querySelectorAll('input[name="diff-axis-mode"]').forEach(radio => {
        radio.checked = radio.value === 'auto';
    });
    document.getElementById('diff-axis-symmetric').value = '';
    document.getElementById('diff-axis-min').value = '';
    document.getElementById('diff-axis-max').value = '';
    updateResults();
}

function updateResults() {
    const [group1Name, group2Name] = getGroupNames();
    applyGroupNames(group1Name, group2Name);

    const mean1 = parseFloat(document.getElementById('mean1').value);
    const sd1 = parseFloat(document.getElementById('sd1').value);
    const n1 = parseInt(document.getElementById('n1').value, 10);
    const mean2 = parseFloat(document.getElementById('mean2').value);
    const sd2 = parseFloat(document.getElementById('sd2').value);
    const n2 = parseInt(document.getElementById('n2').value, 10);
    const delta0 = parseFloat(document.getElementById('delta0').value) || 0;

    if ([mean1, sd1, n1, mean2, sd2, n2].some(value => isNaN(value)) || sd1 <= 0 || sd2 <= 0 || n1 < 2 || n2 < 2) {
        const message = 'Please enter valid values. Standard deviations must be positive and sample sizes must be at least 2.';
        document.getElementById('means-narrative').textContent = message;
        document.getElementById('difference-narrative').textContent = '';
        document.getElementById('interpretation').textContent = message;
        if (window.Plotly) {
            Plotly.purge('means-chart');
            Plotly.purge('difference-chart');
        }
        clearSummaryTable();
        updateDiagnosticsPanel(null);
        return;
    }

    const { t, df, se, cohensD, power } = calculateWelchTTest(mean1, sd1, n1, mean2, sd2, n2, delta0);
    const alpha = 1 - selectedConfidenceLevel;
    const criticalT = tCriticalApprox(1 - alpha / 2, df);
    const pValue = 2 * (1 - normCdf(Math.abs(t)));

    const diffMean = mean1 - mean2;
    const ciLower = diffMean - criticalT * se;
    const ciUpper = diffMean + criticalT * se;

    const levels = [0.5, 0.8, selectedConfidenceLevel];
    const sortedLevels = [...new Set(levels)].sort((a, b) => a - b);

    const groupIntervals = {
        group1: {},
        group2: {}
    };

    const se1 = sd1 / Math.sqrt(n1);
    const se2 = sd2 / Math.sqrt(n2);

    sortedLevels.forEach(level => {
        const levelAlpha = 1 - level;
        const crit = tCriticalApprox(1 - levelAlpha / 2, df);
        groupIntervals.group1[level] = {
            lower: mean1 - crit * se1,
            upper: mean1 + crit * se1
        };
        groupIntervals.group2[level] = {
            lower: mean2 - crit * se2,
            upper: mean2 + crit * se2
        };
    });

    const diffIntervals = {};
    sortedLevels.forEach(level => {
        const levelAlpha = 1 - level;
        const crit = tCriticalApprox(1 - levelAlpha / 2, df);
        diffIntervals[level] = {
            lower: diffMean - crit * se,
            upper: diffMean + crit * se
        };
    });

    const groups = [
        { id: 'group1', name: group1Name, mean: mean1, n: n1, standardError: se1 },
        { id: 'group2', name: group2Name, mean: mean2, n: n2, standardError: se2 }
    ];

    const autoMeansRange = ensureRange(
        Math.min(...sortedLevels.map(level => Math.min(...groups.map(group => groupIntervals[group.id][level].lower)))),
        Math.max(...sortedLevels.map(level => Math.max(...groups.map(group => groupIntervals[group.id][level].upper)))),
        0.5
    );

    const autoDiffRange = ensureRange(
        Math.min(...sortedLevels.map(level => diffIntervals[level].lower)),
        Math.max(...sortedLevels.map(level => diffIntervals[level].upper)),
        0.5
    );

    const meansRange = getMeansAxisRange(autoMeansRange);
    const diffRange = getDifferenceAxisRange(autoDiffRange);

    renderMeansFanChart(groups, groupIntervals, meansRange, sortedLevels);

    const diffStats = {
        meanDifference: diffMean,
        standardError: se,
        tStatistic: t,
        group1Name,
        group2Name,
        group1N: n1,
        group2N: n2
    };

    renderDifferenceFanChart(diffStats, diffIntervals, diffRange, sortedLevels, delta0);

    const intervalLabel = sortedLevels.map(l => `${Math.round(l * 100)}%`).join(', ');
    document.getElementById('means-chart').setAttribute(
        'aria-label',
        `Fan chart comparing ${groups[0].name} and ${groups[1].name} means with ${intervalLabel} confidence bands.`
    );
    document.getElementById('difference-chart').setAttribute(
        'aria-label',
        `Fan chart for the difference in means between ${group1Name} and ${group2Name} with ${intervalLabel} confidence bands and reference line at delta ${delta0.toFixed(2)}.`
    );

    updateMeansNarrative(groups, groupIntervals, sortedLevels[sortedLevels.length - 1]);
    updateDifferenceNarrative(diffStats, diffIntervals, sortedLevels[sortedLevels.length - 1], delta0, pValue, alpha);
    updateInterpretation(
        t,
        df,
        pValue,
        ciLower,
        ciUpper,
        delta0,
        alpha,
        cohensD,
        power,
        mean1,
        sd1,
        n1,
        mean2,
        sd2,
        n2,
        diffMean,
        group1Name,
        group2Name
    );

    updateSummaryTable(groups, groupIntervals, diffStats, diffIntervals, sortedLevels[sortedLevels.length - 1]);
    updateDiagnosticsPanel({
        mean1,
        mean2,
        sd1,
        sd2,
        n1,
        n2,
        df,
        cohensD,
        power,
        ciLower,
        ciUpper,
        delta0
    });

    document.getElementById('means-chart-title').textContent = `${group1Name} vs ${group2Name} Means Fan Chart (${sortedLevels.map(l => Math.round(l * 100)).join('% / ')}% intervals)`;
    document.getElementById('diff-chart-title').textContent = `Difference Fan Chart (${group1Name} âˆ’ ${group2Name}; ${sortedLevels.map(l => Math.round(l * 100)).join('% / ')}% intervals)`;

    modifiedDate = new Date().toLocaleDateString();
    document.getElementById('modified-date').textContent = modifiedDate;
}

function setConfidenceLevel(level, { skipAlphaUpdate = false } = {}) {
    if (!isFinite(level) || level <= 0 || level >= 1) return;
    selectedConfidenceLevel = level;
    const alphaInput = document.getElementById('alpha');
    if (alphaInput && !skipAlphaUpdate) {
        alphaInput.value = formatAlpha(1 - level);
    }
    document.querySelectorAll('.confidence-button').forEach(button => {
        const buttonLevel = parseFloat(button.dataset.level);
        const isActive = Math.abs(buttonLevel - level) < 1e-6;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function setupConfidenceButtons() {
    const buttons = document.querySelectorAll('.confidence-button');
    buttons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            const level = parseFloat(button.dataset.level);
            setConfidenceLevel(level);
            updateResults();
        });
    });
    setConfidenceLevel(selectedConfidenceLevel);
}

function setupAlphaInput() {
    const alphaInput = document.getElementById('alpha');
    if (!alphaInput) return;
    alphaInput.value = formatAlpha(1 - selectedConfidenceLevel);
    alphaInput.addEventListener('change', () => {
        const value = parseFloat(alphaInput.value);
        if (!isFinite(value)) return;
        setAlphaValue(value, { updateResults: true });
    });
}

function setupAxisControls() {
    document.getElementById('means-axis-lock').addEventListener('change', updateResults);
    document.getElementById('means-axis-min').addEventListener('input', updateResults);
    document.getElementById('means-axis-max').addEventListener('input', updateResults);
    document.getElementById('diff-axis-symmetric').addEventListener('input', () => {
        document.querySelector('input[name="diff-axis-mode"][value="symmetric"]').checked = true;
        updateResults();
    });
    document.getElementById('diff-axis-min').addEventListener('input', () => {
        document.querySelector('input[name="diff-axis-mode"][value="custom"]').checked = true;
        updateResults();
    });
    document.getElementById('diff-axis-max').addEventListener('input', () => {
        document.querySelector('input[name="diff-axis-mode"][value="custom"]').checked = true;
        updateResults();
    });
    document.querySelectorAll('input[name="diff-axis-mode"]').forEach(radio => {
        radio.addEventListener('change', updateResults);
    });
    document.getElementById('reset-axis').addEventListener('click', resetAxisControls);
}

async function fetchScenarioIndex() {
    try {
        const response = await fetch('scenarios/scenario-index.json', { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Unable to load scenario index (${response.status})`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            scenarioState.manifest = data;
        }
    } catch (error) {
        console.error('Scenario index error:', error);
        scenarioState.manifest = [];
    }
    populateScenarioOptions();
}

function populateScenarioOptions() {
    const select = document.getElementById('scenario-select');
    if (!select) {
        return;
    }
    const current = select.value;
    select.innerHTML = '<option value="">Manual inputs (no preset)</option>';
    scenarioState.manifest.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = entry.label || entry.id;
        select.appendChild(option);
    });
    if (current) {
        select.value = current;
    }
}

function renderScenarioDescription(title, description) {
    const container = document.getElementById('scenario-description');
    if (!container) {
        return;
    }
    if (!Array.isArray(description) || !description.length) {
        container.innerHTML = scenarioState.defaultDescription || '';
        return;
    }
    const paragraphs = description.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('');
    const titleMarkup = title ? `<h3>${escapeHtml(title)}</h3>` : '';
    container.innerHTML = `${titleMarkup}${paragraphs}`;
}

function parseScenarioText(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const result = {
        title: '',
        description: [],
        alpha: null,
        groups: [],
        settings: {},
        rawData: []
    };
    let section = '';
    const descriptionLines = [];

    lines.forEach(rawLine => {
        const trimmed = rawLine.trim();
        if (!trimmed) {
            if (section === 'description') {
                descriptionLines.push('');
            }
            return;
        }
        if (trimmed.startsWith('#')) {
            section = trimmed.slice(1).trim().toLowerCase();
            return;
        }
        switch (section) {
            case 'title':
                if (!result.title) {
                    result.title = trimmed;
                }
                break;
            case 'description':
                descriptionLines.push(trimmed);
                break;
            case 'alpha':
                const alphaValue = parseFloat(trimmed);
                if (!Number.isNaN(alphaValue)) {
                    result.alpha = alphaValue;
                }
                break;
            case 'groups':
                const parts = trimmed.split('|').map(part => part.trim());
                if (parts.length >= 4) {
                    const name = parts[0];
                    const mean = parseFloat(parts[1]);
                    const sd = parseFloat(parts[2]);
                    const n = parseInt(parts[3], 10);
                    if (!Number.isNaN(mean) && !Number.isNaN(sd) && Number.isFinite(n)) {
                        result.groups.push({ name, mean, sd, n });
                    }
                }
                break;
            case 'additional inputs':
            case 'settings':
                const [key, ...rest] = trimmed.split('=');
                const value = rest.join('=').trim();
                if (key) {
                    result.settings[key.trim().toLowerCase()] = value;
                }
                break;
            case 'raw data':
                result.rawData.push(trimmed);
                break;
        }
    });

    const paragraphs = [];
    let buffer = [];
    descriptionLines.forEach(line => {
        if (!line) {
            if (buffer.length) {
                paragraphs.push(buffer.join(' '));
                buffer = [];
            }
            return;
        }
        buffer.push(line);
    });
    if (buffer.length) {
        paragraphs.push(buffer.join(' '));
    }
    result.description = paragraphs;
    return result;
}

function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (!input) {
        return;
    }
    if (value === null || typeof value === 'undefined') {
        return;
    }
    input.value = value;
}

function applyScenarioPreset(preset, entry) {
    if (!preset) {
        return;
    }
    setUploadStatus('summary-upload-status', 'No summary file uploaded.', '');
    setUploadStatus('raw-upload-status', 'No raw file uploaded.', '');

    const checkboxLock = document.getElementById('means-axis-lock');
    let scenarioDelta = null;
    let scenarioAlpha = null;
    const settings = preset.settings || {};
    Object.entries(settings).forEach(([key, value]) => {
        if (!value) return;
        if (key === 'axis-lock' || key === 'means-axis-lock') {
            if (checkboxLock) checkboxLock.checked = value.toLowerCase() === 'true';
            return;
        }
        if (key === 'diff-axis-mode') {
            const radio = document.querySelector(`input[name="diff-axis-mode"][value="${value}"]`);
            if (radio) radio.checked = true;
            return;
        }
        const element = document.getElementById(key);
        if (element) element.value = value;
    });

    if (typeof settings.delta0 !== 'undefined' && settings.delta0 !== '') {
        setInputValue('delta0', settings.delta0);
        const parsedDelta = parseFloat(settings.delta0);
        if (isFinite(parsedDelta)) scenarioDelta = parsedDelta;
    }

    if (Number.isFinite(preset.alpha)) {
        setAlphaValue(preset.alpha, { updateResults: false });
        scenarioAlpha = preset.alpha;
    } else if (typeof settings.alpha !== 'undefined' && settings.alpha !== '') {
        const parsedAlpha = parseFloat(settings.alpha);
        if (isFinite(parsedAlpha)) {
            setAlphaValue(parsedAlpha, { updateResults: false });
            scenarioAlpha = parsedAlpha;
        }
    }

    let datasetInfo = null;
    const rawDataText = Array.isArray(preset.rawData) && preset.rawData.length
        ? preset.rawData.join('\n').trim()
        : '';

    if (rawDataText) {
        try {
            const rawGroups = parseRawUpload(rawDataText);
            applyGroupStats({ groups: rawGroups, delta: scenarioDelta ?? undefined, alpha: scenarioAlpha ?? undefined }, { mode: DataEntryModes.RAW, update: false });
            setUploadStatus('raw-upload-status', `Loaded scenario data for ${rawGroups[0].name || 'Group 1'} and ${rawGroups[1].name || 'Group 2'}.`, 'success');
            datasetInfo = buildScenarioDatasetFromRaw(rawDataText, entry?.id || '');
        } catch (error) {
            console.error('Scenario raw data error:', error);
            setUploadStatus('raw-upload-status', error.message || 'Unable to parse scenario raw data.', 'error');
        }
    } else if (Array.isArray(preset.groups) && preset.groups.length >= 2) {
        applyGroupStats({ groups: preset.groups, delta: scenarioDelta ?? undefined, alpha: scenarioAlpha ?? undefined }, { mode: DataEntryModes.SUMMARY, update: false });
        const label = `${preset.groups[0].name || 'Group 1'} and ${preset.groups[1].name || 'Group 2'}`;
        setUploadStatus('summary-upload-status', `Loaded scenario stats for ${label}.`, 'success');
        const deltaFallback = scenarioDelta !== null ? scenarioDelta : parseFloat(document.getElementById('delta0')?.value);
        const alphaFallback = scenarioAlpha !== null ? scenarioAlpha : parseFloat(document.getElementById('alpha')?.value);
        datasetInfo = buildScenarioDatasetFromGroups(preset.groups, entry?.id || '', {
            delta0: isFinite(deltaFallback) ? deltaFallback : undefined,
            alpha: isFinite(alphaFallback) ? alphaFallback : undefined
        });
    } else {
        setDataEntryMode(DataEntryModes.MANUAL);
    }

    enableScenarioDownload(datasetInfo);
    updateResults();
}

async function loadScenarioById(id) {
    const scenario = scenarioState.manifest.find(entry => entry.id === id);
    if (!scenario) {
        renderScenarioDescription('', []);
        enableScenarioDownload(null);
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
        applyScenarioPreset(parsed, scenario);
    } catch (error) {
        console.error('Scenario load error:', error);
        enableScenarioDownload(null);
    }
}

function setupScenarioSelector() {
    const select = document.getElementById('scenario-select');
    if (!select) {
        return;
    }
    select.addEventListener('change', () => {
        const value = select.value;
        if (!value) {
            renderScenarioDescription('', []);
            setUploadStatus('summary-upload-status', 'No summary file uploaded.', '');
            setUploadStatus('raw-upload-status', 'No raw file uploaded.', '');
            enableScenarioDownload(null);
            return;
        }
        loadScenarioById(value);
    });
    const downloadButton = document.getElementById('scenario-download');
    if (downloadButton) {
        downloadButton.addEventListener('click', () => {
            if (!activeScenarioDataset) return;
            downloadTextFile(
                activeScenarioDataset.filename,
                activeScenarioDataset.content,
                { mimeType: activeScenarioDataset.mimeType || 'text/csv' }
            );
        });
        downloadButton.classList.add('hidden');
        downloadButton.disabled = true;
    }
}

function initializeScenarios() {
    const description = document.getElementById('scenario-description');
    if (description) {
        scenarioState.defaultDescription = description.innerHTML;
    }
    setupScenarioSelector();
    fetchScenarioIndex();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('created-date').textContent = CREATED_DATE;
    document.getElementById('modified-date').textContent = modifiedDate;

    const inputs = [
        'group1-name', 'mean1', 'sd1', 'n1',
        'group2-name', 'mean2', 'sd2', 'n2',
        'delta0'
    ];

    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateResults);
    });

    setupDataEntryModeToggle();
    setupSummaryUpload();
    setupRawUpload();
    setupAlphaInput();
    setupConfidenceButtons();
    setupAxisControls();
    initializeScenarios();
    updateResults();
});
