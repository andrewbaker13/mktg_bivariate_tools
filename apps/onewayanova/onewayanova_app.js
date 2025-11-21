const CREATED_DATE = new Date('2025-11-06').toLocaleDateString();
let modifiedDate = new Date().toLocaleDateString();

const MAX_GROUPS = 10;
const MIN_GROUPS = 2;
const DEFAULT_GROUPS = 3;
const MAX_COMPARISONS = 15;

let selectedConfidenceLevel = 0.95;
let groupCounter = 0;
let comparisonCounter = 0;
let scenarioManifest = [];
let defaultScenarioDescription = '';
let currentScenarioDataset = null;
const DataEntryModes = {
    MANUAL: 'manual',
    SUMMARY: 'summary-upload',
    RAW: 'raw-upload'
};
let activeDataEntryMode = DataEntryModes.MANUAL;

// Utility helpers
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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

function betaFunc(a, b) {
    return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
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
    if (x <= 0) {
        return 0;
    }
    if (x >= 1) {
        return 1;
    }
    const bt = Math.exp(
        logGamma(a + b) - logGamma(a) - logGamma(b) +
        a * Math.log(x) + b * Math.log(1 - x)
    );
    if (x < (a + 1) / (a + b + 2)) {
        return bt * betacf(x, a, b) / a;
    }
    return 1 - bt * betacf(1 - x, b, a) / b;
}

function fCdf(x, df1, df2) {
    if (!isFinite(x) || x <= 0 || df1 <= 0 || df2 <= 0) {
        return 0;
    }
    const a = df1 / 2;
    const b = df2 / 2;
    const z = (df1 * x) / (df1 * x + df2);
    return regularizedIncompleteBeta(z, a, b);
}

function fPdf(x, df1, df2) {
    if (!isFinite(x) || x <= 0 || df1 <= 0 || df2 <= 0) {
        return 0;
    }
    const safeX = Math.max(x, 1e-12);
    const a = df1 / 2;
    const b = df2 / 2;
    const numerator = Math.pow(df1 / df2, df1 / 2) * Math.pow(safeX, a - 1);
    const denominator = betaFunc(a, b) * Math.pow(1 + (df1 / df2) * safeX, a + b);
    return numerator / denominator;
}

function inverseFCdf(prob, df1, df2) {
    if (prob <= 0) return 0;
    if (prob >= 1) return Infinity;
    let low = 0;
    let high = 1;
    while (fCdf(high, df1, df2) < prob && high < 1e6) {
        high *= 2;
    }
    for (let i = 0; i < 120; i++) {
        const mid = (low + high) / 2;
        const cdf = fCdf(mid, df1, df2);
        if (Math.abs(cdf - prob) < 1e-6) {
            return mid;
        }
        if (cdf < prob) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return (low + high) / 2;
}

function approximateTukeyCritical(alpha, groupCount, dfWithin) {
    if (groupCount < 2 || !isFinite(dfWithin) || dfWithin <= 0) {
        return NaN;
    }
    const adjustedAlpha = alpha / (groupCount * (groupCount - 1));
    const tailProb = 1 - adjustedAlpha / 2;
    const tCrit = tCriticalApprox(tailProb, dfWithin);
    return tCrit * Math.SQRT2;
}

function formatPValue(p) {
    if (!isFinite(p)) return 'p = --';
    if (p < 0.001) return 'p < .001';
    return `p = ${p.toFixed(3).replace(/^0/, '')}`;
}

function formatEtaSquared(eta) {
    if (!isFinite(eta)) {
        return 'Effect size unavailable';
    }
    if (eta < 0.01) return 'Tiny effect (eta^2 < .01)';
    if (eta < 0.06) return 'Small effect (eta^2 around .01)';
    if (eta < 0.14) return 'Medium effect (eta^2 around .06)';
    return 'Large effect (eta^2 >= .14)';
}
// Group input management
function createGroupCard() {
    const container = document.getElementById('group-inputs');
    if (!container || container.children.length >= MAX_GROUPS) {
        return;
    }
    groupCounter += 1;
    const placeholderName = `Group ${groupCounter}`;
    const row = document.createElement('tr');
    row.className = 'group-row';
    row.dataset.groupId = `group-${groupCounter}`;
    row.innerHTML = `
        <th scope="row" class="group-label">${placeholderName}</th>
        <td>
            <input type="text" class="group-name" maxlength="40" placeholder="${placeholderName}">
        </td>
        <td>
            <input type="number" class="group-mean" step="any" placeholder="e.g., 42.7">
        </td>
        <td>
            <input type="number" class="group-sd" min="0" step="any" placeholder="e.g., 5.1">
        </td>
        <td>
            <input type="number" class="group-n" min="2" step="1" placeholder="e.g., 60">
        </td>
    `;
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            refreshComparisonOptions();
            updateResults();
        });
    });
    container.appendChild(row);
    updateGroupLabels();
    refreshComparisonOptions();
}

function updateGroupLabels() {
    const rows = document.querySelectorAll('.group-row');
    rows.forEach((row, index) => {
        const labelCell = row.querySelector('.group-label');
        if (labelCell) {
            labelCell.textContent = `Group ${index + 1}`;
        }
        const nameInput = row.querySelector('.group-name');
        if (nameInput && !nameInput.value.trim()) {
            nameInput.placeholder = `Group ${index + 1}`;
        }
    });
}

function setGroupCount(count, triggerUpdate = true) {
    const container = document.getElementById('group-inputs');
    if (!container) {
        return;
    }
    const target = clamp(Math.round(count), MIN_GROUPS, MAX_GROUPS);
    while (container.children.length < target) {
        createGroupCard();
    }
    while (container.children.length > target) {
        container.removeChild(container.lastElementChild);
    }
    updateGroupLabels();
    refreshComparisonOptions();
    if (triggerUpdate) {
        updateResults();
    }
}

function collectGroupData() {
    const cards = Array.from(document.querySelectorAll('.group-row'));
    return cards.map((card, index) => {
        const nameInput = card.querySelector('.group-name');
        const meanInput = card.querySelector('.group-mean');
        const sdInput = card.querySelector('.group-sd');
        const nInput = card.querySelector('.group-n');
        const name = nameInput.value.trim() || `Group ${index + 1}`;
        const mean = parseFloat(meanInput.value);
        const sd = parseFloat(sdInput.value);
        const n = parseInt(nInput.value, 10);
        const standardError = isFinite(sd) && isFinite(n) && n > 0 ? sd / Math.sqrt(n) : NaN;
        return {
            id: card.dataset.groupId,
            name,
            mean,
            sd,
            n,
            standardError
        };
    });
}

function validateGroups(groups) {
    if (groups.length < MIN_GROUPS) {
        return { valid: false, message: `Add at least ${MIN_GROUPS} groups to run ANOVA.` };
    }
    for (const group of groups) {
        if (!isFinite(group.mean)) {
            return { valid: false, message: `Enter a numeric mean for ${group.name}.` };
        }
        if (!isFinite(group.sd) || group.sd <= 0) {
            return { valid: false, message: `Standard deviation for ${group.name} must be positive.` };
        }
        if (!Number.isInteger(group.n) || group.n < 2) {
            return { valid: false, message: `Sample size for ${group.name} must be at least 2.` };
        }
    }
    return { valid: true };
}

function setUploadStatus(targetId, message, status = '') {
    const target = document.getElementById(targetId);
    if (!target) {
        return;
    }
    target.textContent = message;
    target.classList.remove('success', 'error');
    if (status) {
        target.classList.add(status);
    }
}

function applyGroupsToInputs(groups) {
    if (!Array.isArray(groups) || groups.length < MIN_GROUPS) {
        throw new Error(`At least ${MIN_GROUPS} groups are required after import.`);
    }
    if (groups.length > MAX_GROUPS) {
        throw new Error(`Reduce the dataset to ${MAX_GROUPS} groups or fewer before importing.`);
    }
    setGroupCount(groups.length, false);
    const groupSelect = document.getElementById('group-count');
    if (groupSelect) {
        groupSelect.value = String(groups.length);
    }
    const rows = document.querySelectorAll('.group-row');
    groups.forEach((group, index) => {
        const row = rows[index];
        if (!row) {
            return;
        }
        const nameInput = row.querySelector('.group-name');
        const meanInput = row.querySelector('.group-mean');
        const sdInput = row.querySelector('.group-sd');
        const nInput = row.querySelector('.group-n');
        if (nameInput) {
            nameInput.value = group.name;
        }
        if (meanInput && isFinite(group.mean)) {
            meanInput.value = group.mean;
        }
        if (sdInput && isFinite(group.sd)) {
            sdInput.value = group.sd;
        }
        if (nInput && Number.isFinite(group.n)) {
            nInput.value = group.n;
        }
    });
    refreshComparisonOptions();
    updateResults();
}

function parseRawLongFormatData(text) {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('Raw upload file is empty.');
    }
    const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length);
    if (lines.length < 2) {
        throw new Error('Include a header row plus at least one data row.');
    }
    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.trim());
    if (headers.length !== 2) {
        throw new Error('Raw uploads must contain exactly two columns: group label and numeric value.');
    }
    const groups = new Map();
    const errors = [];
    let processedRows = 0;
    lines.slice(1).forEach((line, index) => {
        if (processedRows >= MAX_UPLOAD_ROWS) {
            throw new Error(`Upload limit exceeded. Only ${MAX_UPLOAD_ROWS} rows are supported per file.`);
        }
        const rowNumber = index + 2;
        const parts = line.split(delimiter).map(part => part.trim());
        if (parts.every(part => part === '')) {
            return;
        }
        if (parts.length !== 2) {
            errors.push(`Row ${rowNumber}: expected exactly two columns.`);
            return;
        }
        const label = parts[0];
        if (!label) {
            errors.push(`Row ${rowNumber}: missing group label.`);
            return;
        }
        const value = parseFloat(parts[1]);
        if (!isFinite(value)) {
            errors.push(`Row ${rowNumber}: value must be numeric.`);
            return;
        }
        processedRows += 1;
        let entry = groups.get(label);
        if (!entry) {
            entry = { label, count: 0, mean: 0, m2: 0 };
            groups.set(label, entry);
        }
        entry.count += 1;
        const delta = value - entry.mean;
        entry.mean += delta / entry.count;
        const delta2 = value - entry.mean;
        entry.m2 += delta * delta2;
    });
    if (!groups.size) {
        throw new Error(errors[0] || 'No valid numeric rows were found.');
    }
    if (groups.size > MAX_GROUPS) {
        throw new Error(`Detected ${groups.size} groups. Limit imports to ${MAX_GROUPS} groups or fewer.`);
    }
    const parsedGroups = [];
    for (const entry of groups.values()) {
        if (entry.count < 2) {
            throw new Error(`Group "${entry.label}" has fewer than 2 observations. Add more rows before importing.`);
        }
        const variance = entry.count > 1 ? entry.m2 / (entry.count - 1) : 0;
        parsedGroups.push({
            name: entry.label,
            mean: entry.mean,
            sd: Math.sqrt(Math.max(variance, 0)),
            n: entry.count
        });
    }
    if (parsedGroups.length < MIN_GROUPS) {
        throw new Error(`At least ${MIN_GROUPS} groups are required after cleaning the raw file.`);
    }
    const totalRows = parsedGroups.reduce((sum, group) => sum + group.n, 0);
    return {
        groups: parsedGroups,
        processedRows: totalRows,
        skippedRows: errors.length
    };
}

function normalizeHeader(header) {
    return header.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseSummaryStatsFile(text) {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('Summary file is empty.');
    }
    const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length);
    if (lines.length < 2) {
        throw new Error('Include a header row plus at least one summary row.');
    }
    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const normalized = headers.map(normalizeHeader);
    const findColumn = candidates => normalized.findIndex(header => candidates.some(candidate => header.includes(candidate)));
    const nameIndex = findColumn(['group', 'segment', 'label', 'name', 'category']);
    const meanIndex = findColumn(['mean', 'average']);
    const sdIndex = findColumn(['sd', 'stdev', 'std', 'std dev', 'standard deviation']);
    const nIndex = findColumn(['n', 'size', 'count', 'sample']);
    if ([nameIndex, meanIndex, sdIndex, nIndex].some(index => index === -1)) {
        throw new Error('Summary uploads require columns for group, mean, sd, and n.');
    }
    const groups = [];
    const errors = [];
    lines.slice(1).forEach((line, index) => {
        const rowNumber = index + 2;
        const parts = line.split(delimiter).map(part => part.trim());
        if (parts.every(part => part === '')) {
            return;
        }
        const name = parts[nameIndex] || `Group ${groups.length + 1}`;
        const mean = parseFloat(parts[meanIndex]);
        const sd = parseFloat(parts[sdIndex]);
        const n = parseInt(parts[nIndex], 10);
        const invalid = !name || !isFinite(mean) || !isFinite(sd) || sd <= 0 || !Number.isFinite(n) || n < 2;
        if (invalid) {
            errors.push(`Row ${rowNumber}: unable to parse mean/SD/n for ${name || 'this group'}.`);
            return;
        }
        groups.push({ name, mean, sd, n });
    });
    if (!groups.length) {
        throw new Error(errors[0] || 'No valid summary rows were found.');
    }
    if (groups.length > MAX_GROUPS) {
        throw new Error(`Summary file includes ${groups.length} groups. Limit imports to ${MAX_GROUPS}.`);
    }
    if (groups.length < MIN_GROUPS) {
        throw new Error(`At least ${MIN_GROUPS} valid groups are required after importing the summary file.`);
    }
    return {
        groups,
        skippedRows: errors.length
    };
}

function handleRawDataText(text) {
    const { groups, processedRows, skippedRows } = parseRawLongFormatData(text);
    const totalRows = processedRows + (skippedRows || 0);
    if (typeof maybeConfirmDroppedRows === 'function' && (skippedRows || 0) > 0) {
        const proceed = maybeConfirmDroppedRows({
            totalRows,
            keptRows: processedRows,
            contextLabel: 'observations'
        });
        if (!proceed) {
            setUploadStatus('raw-upload-status', 'Upload cancelled because some rows had missing or invalid values.', 'error');
            return;
        }
    }
    applyGroupsToInputs(groups);
    const groupNote = groups.map(group => `${group.name} (n=${group.n})`).join('; ');
    const skippedNote = skippedRows ? ` Skipped ${skippedRows} observations due to formatting issues.` : '';
    let statusMessage = `Loaded ${processedRows} observations across ${groups.length} group(s): ${groupNote}.`;
    statusMessage += skippedNote;
    if (totalRows > processedRows) {
        statusMessage += ` Using ${processedRows} of ${totalRows} observations.`;
    }
    statusMessage += ' Variables: group (factor), value (numeric outcome).';
    setUploadStatus('raw-upload-status', statusMessage, 'success');
}

function handleSummaryText(text) {
    const { groups, skippedRows } = parseSummaryStatsFile(text);
    applyGroupsToInputs(groups);
    const skippedNote = skippedRows ? ` Skipped ${skippedRows} row(s) due to formatting issues.` : '';
    setUploadStatus(
        'summary-upload-status',
        `Applied ${groups.length} group summary row(s).${skippedNote}`,
        'success'
    );
}

function downloadRawTemplate() {
    const content = [
        'group,value',
        'Control,34.2',
        'Control,36.5',
        'Variant A,32.1',
        'Variant A,33.9',
        'Variant B,28.4',
        'Variant B,29.0'
    ].join('\n');
    downloadTextFile('anova_raw_template.csv', content);
}

function downloadSummaryTemplate() {
    const content = [
        'group,mean,sd,n',
        'Control,35.3,4.1,60',
        'Variant A,32.9,3.5,58',
        'Variant B,30.1,4.9,62'
    ].join('\n');
    downloadTextFile('anova_summary_template.csv', content);
}

function setupDataImportControls() {
    const rawDropzone = document.getElementById('anova-raw-dropzone');
    const rawInput = document.getElementById('anova-raw-input');
    const rawBrowse = document.getElementById('raw-upload-browse');
    const summaryDropzone = document.getElementById('summary-dropzone');
    const summaryInput = document.getElementById('summary-upload-input');
    const summaryBrowse = document.getElementById('summary-upload-browse');
    const rawTemplateButton = document.getElementById('download-raw-template');
    const summaryTemplateButton = document.getElementById('download-summary-template');

    if (!window.UIUtils || typeof window.UIUtils.initDropzone !== 'function') {
        setUploadStatus('raw-upload-status', 'Upload helper not available. Please refresh the page.', 'error');
        setUploadStatus('summary-upload-status', 'Upload helper not available. Please refresh the page.', 'error');
        return;
    }

    if (rawDropzone && rawInput) {
        const handleRawFile = file => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    handleRawDataText(event.target.result);
                } catch (error) {
                    setUploadStatus('raw-upload-status', error.message, 'error');
                }
            };
            reader.onerror = () => {
                setUploadStatus('raw-upload-status', 'Unable to read the selected file.', 'error');
            };
            reader.readAsText(file);
        };

        window.UIUtils.initDropzone({
            dropzoneId: rawDropzone.id,
            inputId: rawInput.id,
            browseId: rawBrowse ? rawBrowse.id : undefined,
            accept: '.csv,.tsv,.txt',
            onFile: handleRawFile,
            onError: message => setUploadStatus('raw-upload-status', message, 'error')
        });

        setUploadStatus('raw-upload-status', 'No raw file uploaded.', '');
    }

    if (summaryDropzone && summaryInput) {
        const handleSummaryFile = file => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    handleSummaryText(event.target.result);
                } catch (error) {
                    setUploadStatus('summary-upload-status', error.message, 'error');
                }
            };
            reader.onerror = () => {
                setUploadStatus('summary-upload-status', 'Unable to read the selected file.', 'error');
            };
            reader.readAsText(file);
        };

        window.UIUtils.initDropzone({
            dropzoneId: summaryDropzone.id,
            inputId: summaryInput.id,
            browseId: summaryBrowse ? summaryBrowse.id : undefined,
            accept: '.csv,.tsv,.txt',
            onFile: handleSummaryFile,
            onError: message => setUploadStatus('summary-upload-status', message, 'error')
        });

        setUploadStatus('summary-upload-status', 'No summary file uploaded.', '');
    }

    if (rawTemplateButton) {
        rawTemplateButton.addEventListener('click', event => {
            event.preventDefault();
            downloadRawTemplate();
        });
    }
    if (summaryTemplateButton) {
        summaryTemplateButton.addEventListener('click', event => {
            event.preventDefault();
            downloadSummaryTemplate();
        });
    }
}

function setDataEntryMode(mode) {
    const normalized = Object.values(DataEntryModes).includes(mode) ? mode : DataEntryModes.MANUAL;
    activeDataEntryMode = normalized;
    const buttons = document.querySelectorAll('.data-entry-card .mode-button');
    buttons.forEach(button => {
        const isActive = button.dataset.mode === normalized;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    const panels = document.querySelectorAll('.data-entry-card .mode-panel');
    panels.forEach(panel => {
        const isActive = panel.dataset.mode === normalized;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
}

function setupDataEntryModeControls() {
    const buttons = document.querySelectorAll('.data-entry-card .mode-button');
    if (!buttons.length) {
        return;
    }
    buttons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            setDataEntryMode(button.dataset.mode);
        });
    });
    setDataEntryMode(activeDataEntryMode);
}
// Planned comparison helpers
function togglePlannedPanel(enabled) {
    const panel = document.getElementById('planned-comparisons-panel');
    if (panel) {
        panel.classList.toggle('hidden', !enabled);
    }
    const addButton = document.getElementById('add-comparison');
    if (addButton) {
        addButton.disabled = !enabled;
    }
    const warningEl = document.getElementById('planned-warning');
    if (!enabled) {
        if (warningEl) {
            warningEl.classList.add('hidden');
            warningEl.textContent = '';
        }
    } else {
        updateComparisonWarnings();
    }
}

function refreshComparisonOptions() {
    const comparisonRows = document.querySelectorAll('.comparison-row');
    if (!comparisonRows.length) {
        return;
    }
    const groups = collectGroupData();
    const options = groups.map(group => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join('');
    comparisonRows.forEach(row => {
        const selects = row.querySelectorAll('select');
        selects.forEach(select => {
            const previous = select.value;
            select.innerHTML = options;
            const hasPrevious = Array.from(select.options).some(option => option.value === previous);
            if (hasPrevious) {
                select.value = previous;
            } else if (select.options.length > 0) {
                select.selectedIndex = 0;
            }
        });
    });
    updateComparisonWarnings();
}

function addComparisonRow(skipUpdate = false) {
    const enabled = document.getElementById('enable-planned-comparisons').checked;
    if (!enabled) {
        return;
    }
    const list = document.getElementById('planned-comparisons-list');
    const groups = collectGroupData();
    if (!list || groups.length < 2) {
        return;
    }
    if (list.children.length >= MAX_COMPARISONS) {
        return;
    }
    comparisonCounter += 1;
    const row = document.createElement('div');
    row.className = 'comparison-row';
    row.dataset.comparisonId = `comparison-${comparisonCounter}`;
    row.innerHTML = `
        <select class="comparison-select comparison-a" aria-label="First group in comparison"></select>
        <span class="vs-label">vs</span>
        <select class="comparison-select comparison-b" aria-label="Second group in comparison"></select>
        <button type="button" class="remove-comparison" aria-label="Remove comparison">&times;</button>
    `;
    list.appendChild(row);
    refreshComparisonOptions();
    updateComparisonButtonState();
    updateComparisonWarnings();
    if (!skipUpdate) {
        updateResults();
    }
}

function addComparisonRowWithSelections(groupIdA, groupIdB, suppressUpdate = false) {
    addComparisonRow(true);
    const list = document.getElementById('planned-comparisons-list');
    if (!list || !list.lastElementChild) {
        return;
    }
    const row = list.lastElementChild;
    const selectA = row.querySelector('.comparison-a');
    const selectB = row.querySelector('.comparison-b');
    if (selectA && groupIdA) {
        selectA.value = groupIdA;
    }
    if (selectB && groupIdB) {
        selectB.value = groupIdB;
    }
    updateComparisonWarnings();
    if (!suppressUpdate) {
        updateResults();
    }
}

function removeComparisonRow(button) {
    const row = button.closest('.comparison-row');
    if (row) {
        row.remove();
        updateComparisonButtonState();
        updateComparisonWarnings();
        updateResults();
    }
}

function updateComparisonButtonState() {
    const list = document.getElementById('planned-comparisons-list');
    const addButton = document.getElementById('add-comparison');
    if (list && addButton) {
        addButton.disabled = list.children.length >= MAX_COMPARISONS;
    }
}

function clearComparisonRows(suppressUpdate = false) {
    const list = document.getElementById('planned-comparisons-list');
    if (!list) {
        return;
    }
    list.innerHTML = '';
    updateComparisonButtonState();
    updateComparisonWarnings();
    if (!suppressUpdate) {
        updateResults();
    }
}

function getPlannedComparisons() {
    const rows = Array.from(document.querySelectorAll('.comparison-row'));
    return rows.map(row => {
        const selectA = row.querySelector('.comparison-a');
        const selectB = row.querySelector('.comparison-b');
        const groupA = selectA ? selectA.value : '';
        const groupB = selectB ? selectB.value : '';
        return {
            id: row.dataset.comparisonId,
            groupA,
            groupB
        };
    }).filter(entry => entry.groupA && entry.groupB && entry.groupA !== entry.groupB);
}

function calculatePlannedComparisons(groups, anovaStats, comparisons, alpha) {
    if (!comparisons.length || !anovaStats || !isFinite(anovaStats.msWithin) || anovaStats.msWithin <= 0) {
        return [];
    }
    const qCritical = approximateTukeyCritical(alpha, groups.length, anovaStats.dfWithin);
    return comparisons.map(comparison => {
        const groupA = groups.find(group => group.id === comparison.groupA);
        const groupB = groups.find(group => group.id === comparison.groupB);
        if (!groupA || !groupB) {
            return null;
        }
        const diff = groupA.mean - groupB.mean;
        const se = Math.sqrt((anovaStats.msWithin / 2) * (1 / groupA.n + 1 / groupB.n));
        const qStatistic = Math.abs(diff) / se;
        const margin = qCritical * se;
        return {
            id: comparison.id,
            label: `${groupA.name} vs ${groupB.name}`,
            difference: diff,
            standardError: se,
            qStatistic,
            qCritical,
            margin,
            significant: qStatistic > qCritical,
            groupA: groupA.name,
            groupB: groupB.name
        };
    }).filter(Boolean);
}

function getComparisonSelections() {
    const rows = Array.from(document.querySelectorAll('.comparison-row'));
    return rows.map((row, index) => {
        const selectA = row.querySelector('.comparison-a');
        const selectB = row.querySelector('.comparison-b');
        const groupA = selectA ? selectA.value : '';
        const groupB = selectB ? selectB.value : '';
        const groupAName = selectA && selectA.selectedOptions.length
            ? selectA.selectedOptions[0].textContent.trim()
            : '';
        const groupBName = selectB && selectB.selectedOptions.length
            ? selectB.selectedOptions[0].textContent.trim()
            : '';
        return {
            key: [groupA, groupB].sort().join('||'),
            groupA,
            groupB,
            groupAName,
            groupBName,
            label: `Comparison ${index + 1}`,
            complete: Boolean(groupA && groupB)
        };
    });
}

function updateComparisonWarnings() {
    const warningEl = document.getElementById('planned-warning');
    if (!warningEl) {
        return;
    }
    const selections = getComparisonSelections().filter(selection => selection.complete);
    const duplicateMap = new Map();
    selections.forEach(selection => {
        if (!selection.key) return;
        if (!duplicateMap.has(selection.key)) {
            duplicateMap.set(selection.key, []);
        }
        duplicateMap.get(selection.key).push(selection);
    });
    const duplicates = Array.from(duplicateMap.values()).filter(items => items.length > 1);
    if (!duplicates.length) {
        warningEl.classList.add('hidden');
        warningEl.innerHTML = '';
        return;
    }
    const messages = duplicates.map(group => {
        const name = group[0].groupAName && group[0].groupBName
            ? `${group[0].groupAName} vs ${group[0].groupBName}`
            : 'this pair of groups';
        const labels = group.map(item => item.label).join(', ');
        return `Comparison between ${name} already appears in ${labels}. Remove duplicates to avoid repeated Tukey tests.`;
    });
    warningEl.innerHTML = messages.map(message => `<p>${escapeHtml(message)}</p>`).join('');
    warningEl.classList.remove('hidden');
}

// ANOVA calculations
function calculateAnova(groups) {
    const totalN = groups.reduce((sum, group) => sum + group.n, 0);
    const grandMean = groups.reduce((sum, group) => sum + group.mean * group.n, 0) / totalN;
    const ssBetween = groups.reduce((sum, group) => sum + group.n * Math.pow(group.mean - grandMean, 2), 0);
    const ssWithin = groups.reduce((sum, group) => sum + (group.n - 1) * Math.pow(group.sd, 2), 0);
    const dfBetween = groups.length - 1;
    const dfWithin = groups.reduce((sum, group) => sum + (group.n - 1), 0);
    const msBetween = dfBetween > 0 ? ssBetween / dfBetween : NaN;
    const msWithin = dfWithin > 0 ? ssWithin / dfWithin : NaN;
    const fStatistic = msWithin > 0 ? msBetween / msWithin : NaN;
    const pValue = (isFinite(fStatistic) && dfBetween > 0 && dfWithin > 0) ? 1 - fCdf(fStatistic, dfBetween, dfWithin) : NaN;
    const ssTotal = ssBetween + ssWithin;
    const etaSquared = ssTotal > 0 ? ssBetween / ssTotal : NaN;
    const omegaSquared = ssTotal > 0 ? (ssBetween - dfBetween * msWithin) / (ssTotal + msWithin) : NaN;

    return {
        totalN,
        grandMean,
        ssBetween,
        ssWithin,
        ssTotal,
        dfBetween,
        dfWithin,
        msBetween,
        msWithin,
        fStatistic,
        pValue,
        etaSquared,
        omegaSquared,
        groupCount: groups.length
    };
}

// Visualization helpers
function renderMeansFanChart(groups, intervals, axisRange, confidenceLevels, referenceLine) {
    if (!window.FanChartUtils || !window.Plotly) {
        if (window.Plotly && Plotly.purge) {
            Plotly.purge('means-chart');
        }
        return;
    }

    const formattedGroups = groups.map(group => ({
        id: group.id,
        value: group.mean,
        label: group.name,
        tickLabel: `${group.name} (n=${Number(group.n).toLocaleString()})`
    }));

    const referenceConfig = referenceLine && isFinite(referenceLine.value)
        ? {
            value: referenceLine.value,
            label: referenceLine.label,
            style: referenceLine.style || { color: '#c0392b', dash: 'dot', width: 2 }
        }
        : null;

    FanChartUtils.renderHorizontalFanChart({
        containerId: 'means-chart',
        groups: formattedGroups,
        intervals,
        confidenceLevels,
        axisRange,
        xTitle: 'Observed mean',
        tickLabels: formattedGroups.map(group => group.tickLabel),
        referenceLine: referenceConfig,
        valueFormatter: value => value.toFixed(2),
        pointLabelOffset: 0.5
    });
}

function renderPlannedComparisonsChart(comparisons, anovaStats) {
    if (!window.Plotly) {
        return;
    }
    const containerId = 'planned-chart';
    if (!comparisons.length || !anovaStats || !isFinite(anovaStats.msWithin)) {
        Plotly.purge(containerId);
        return;
    }

    const labels = comparisons.map(result => result.label);
    const differences = comparisons.map(result => result.difference);
    const errorBars = comparisons.map(result => result.margin);
    const colors = comparisons.map(result => result.significant ? 'rgba(76, 175, 80, 0.85)' : 'rgba(192, 57, 43, 0.5)');

    const trace = {
        x: differences,
        y: labels,
        type: 'bar',
        orientation: 'h',
        marker: {
            color: colors,
            line: { color: '#ffffff', width: 1 }
        },
        error_x: {
            type: 'data',
            array: errorBars,
            symmetric: true,
            color: '#455a64',
            thickness: 1.5
        },
        hovertemplate: '%{y}<br>Mean difference = %{x:.2f}<extra></extra>'
    };

    const layout = {
        margin: { l: 150, r: 40, t: 40, b: 40 },
        barmode: 'overlay',
        xaxis: {
            zeroline: true,
            zerolinecolor: '#90a4ae',
            title: 'Mean difference',
            gridcolor: '#eceff1'
        },
        yaxis: {
            automargin: true
        },
        shapes: [{
            type: 'line',
            x0: 0,
            x1: 0,
            y0: -0.5,
            y1: labels.length - 0.5,
            line: {
                color: '#90a4ae',
                width: 2,
                dash: 'dot'
            }
        }],
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: Math.max(320, labels.length * 60),
        showlegend: false
    };

    Plotly.react(containerId, [trace], layout, { responsive: true });
}

// Narratives and reporting
function updateMeansNarrative(groups, intervals, selectedLevel) {
    const narrative = document.getElementById('means-narrative');
    if (!narrative) {
        return;
    }
    if (!groups.length) {
        narrative.textContent = '';
        return;
    }
    const sorted = [...groups].sort((a, b) => b.mean - a.mean);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const ciTop = intervals[top.id][selectedLevel];
    const ciBottom = intervals[bottom.id][selectedLevel];
    const levelText = `${Math.round(selectedLevel * 100)}%`;

    narrative.innerHTML = `
        <p><strong>${escapeHtml(top.name)}</strong> shows the highest mean at ${top.mean.toFixed(2)} with a ${levelText} interval of [${ciTop.lower.toFixed(2)}, ${ciTop.upper.toFixed(2)}].</p>
        <p><strong>${escapeHtml(bottom.name)}</strong> shows the lowest mean at ${bottom.mean.toFixed(2)} with a ${levelText} interval of [${ciBottom.lower.toFixed(2)}, ${ciBottom.upper.toFixed(2)}].</p>
        <p>Use the fan widths to gauge whether group intervals sit clearly above or below the grand mean before investing in planned comparisons.</p>
    `;
}

function updatePlannedNarrative(comparisons) {
    const narrative = document.getElementById('planned-narrative');
    if (!narrative) {
        return;
    }
    if (!comparisons.length) {
        narrative.textContent = 'Enable Tukey planned comparisons to visualize pairwise differences.';
        return;
    }
    const significant = comparisons.filter(result => result.significant);
    if (!significant.length) {
        narrative.innerHTML = '<p>Tukey HSD did not flag any pairwise differences as significant. Bars show the observed differences with Tukey confidence bands for context.</p>';
        return;
    }
    const topDifference = significant.reduce((max, current) =>
        Math.abs(current.difference) > Math.abs(max.difference) ? current : max
    );
    const direction = topDifference.difference > 0
        ? `${escapeHtml(topDifference.groupA)} exceeds ${escapeHtml(topDifference.groupB)}`
        : `${escapeHtml(topDifference.groupB)} exceeds ${escapeHtml(topDifference.groupA)}`;
    narrative.innerHTML = `
        <p>${significant.length} of ${comparisons.length} planned comparisons surpassed the Tukey HSD threshold.</p>
        <p>The largest gap appears between ${escapeHtml(topDifference.groupA)} and ${escapeHtml(topDifference.groupB)} (Delta = ${topDifference.difference.toFixed(2)}), indicating ${direction}.</p>
        <p>Bars in the chart include Tukey-adjusted error bands so overlaps with zero mark where differences fail to reach significance.</p>
    `;
}

function updateInterpretation(anovaStats, groups, comparisons, alpha) {
    const interpretation = document.getElementById('interpretation');
    if (!interpretation) {
        return;
    }
    if (!anovaStats || !isFinite(anovaStats.fStatistic)) {
        interpretation.textContent = 'Enter complete group summaries to generate the omnibus ANOVA and planned comparisons.';
        return;
    }
    const significant = anovaStats.pValue < alpha;
    const etaDescriptor = formatEtaSquared(anovaStats.etaSquared);
    const pValueText = formatPValue(anovaStats.pValue);
    let comparisonDetails = '';
    if (comparisons.length) {
        comparisonDetails = comparisons.map(result => {
            const status = result.significant ? 'Significant' : 'Not significant';
            return `<li><strong>${escapeHtml(result.label)}</strong>: Delta = ${result.difference.toFixed(2)}, q = ${result.qStatistic.toFixed(2)} vs q crit = ${result.qCritical.toFixed(2)} (${status}).</li>`;
        }).join('');
    }

    const alphaText = alpha.toFixed(3).replace(/\.?0+$/, '');
    const sortedGroups = [...groups].sort((a, b) => b.mean - a.mean);
    const topGroup = sortedGroups[0];
    const bottomGroup = sortedGroups[sortedGroups.length - 1];

    const significantComparisons = comparisons.filter(result => result.significant);
    const orderedComparisons = [...significantComparisons].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
    const labelLimit = 3;
    const labelList = orderedComparisons.slice(0, labelLimit).map(result => `${escapeHtml(result.groupA)} vs ${escapeHtml(result.groupB)}`);
    const additionalCount = Math.max(0, orderedComparisons.length - labelLimit);
    const labelSummary = labelList.length
        ? `${labelList.join(', ')}${additionalCount > 0 ? `, +${additionalCount} more` : ''}`
        : '';

    let apaComparisonSentence;
    let managerialComparisonSentence;
    if (!comparisons.length) {
        apaComparisonSentence = '';
        managerialComparisonSentence = '';
    } else if (!significantComparisons.length) {
        apaComparisonSentence = 'Tukey HSD follow-ups did not detect significant pairwise differences.';
        managerialComparisonSentence = 'Post-hoc checks did not flag any specific pairs as materially different.';
    } else {
        const leadComparison = orderedComparisons[0];
        const leadGap = Math.abs(leadComparison.difference).toFixed(2);
        const leadDirectionPositive = leadComparison.difference >= 0;
        const leadingName = leadDirectionPositive ? escapeHtml(leadComparison.groupA) : escapeHtml(leadComparison.groupB);
        const trailingName = leadDirectionPositive ? escapeHtml(leadComparison.groupB) : escapeHtml(leadComparison.groupA);
        const plainGapSentence = `${leadingName} is delivering roughly ${leadGap} more units on the tracked KPI than ${trailingName}`;
        apaComparisonSentence = `Tukey HSD follow-ups indicated significant differences for ${labelSummary}.`;
        managerialComparisonSentence = `${plainGapSentence}. Because Tukey flagged this gap as statistically reliable, treat it as a concrete lever when forecasting rollout or budget impact${additionalCount > 0 ? ', and review the other flagged pairs for similar opportunities.' : '.'}`;
    }

    const etaText = isFinite(anovaStats.etaSquared) ? anovaStats.etaSquared.toFixed(3) : '--';
    const omegaText = isFinite(anovaStats.omegaSquared) ? anovaStats.omegaSquared.toFixed(3) : '--';
    const effectSizePhrase = `\\(\\eta^2\\) = ${etaText}, \\(\\omega^2\\) = ${omegaText}`;
    const apaReport = `A one-way ANOVA comparing ${anovaStats.groupCount} groups ${significant ? 'was significant' : 'was not significant'}, F(${anovaStats.dfBetween}, ${anovaStats.dfWithin}) = ${anovaStats.fStatistic.toFixed(3)}, ${pValueText}, ${effectSizePhrase}. ${apaComparisonSentence ? apaComparisonSentence : ''}`.trim();
    const managerialReport = `At alpha = ${alphaText}, the omnibus test ${significant ? 'suggests at least one group mean departs from the grand mean' : 'does not show meaningful departures from the grand mean'}. ${escapeHtml(topGroup.name)} is currently highest (${topGroup.mean.toFixed(2)}) while ${escapeHtml(bottomGroup.name)} is lowest (${bottomGroup.mean.toFixed(2)}). ${managerialComparisonSentence ? managerialComparisonSentence + ' ' : ''}This pattern corresponds to ${etaDescriptor.toLowerCase()} (${effectSizePhrase}).`;

    const comparisonsBlock = comparisons.length ? `
        <div class="interpretation-details">
            <h3>Planned Comparisons (Tukey HSD)</h3>
            <ul class="comparison-list">${comparisonDetails}</ul>
        </div>
    ` : '';

    const apaElement = document.getElementById('anova-apa-report');
    if (apaElement) {
        apaElement.textContent = apaReport;
    }
    const managerialElement = document.getElementById('anova-managerial-report');
    if (managerialElement) {
        managerialElement.textContent = managerialReport;
    }

    interpretation.innerHTML = `
        <div class="results-grid">
            <article class="result-item">
                <h4>Omnibus Test</h4>
                <p>F(${anovaStats.dfBetween}, ${anovaStats.dfWithin}) = ${anovaStats.fStatistic.toFixed(3)}</p>
                <p>${pValueText} - ${significant ? 'Reject H0 of equal means.' : 'Fail to reject H0 of equal means.'}</p>
            </article>
            <article class="result-item">
                <h4>Effect Sizes</h4>
                <p>eta^2 = ${isFinite(anovaStats.etaSquared) ? anovaStats.etaSquared.toFixed(3) : '--'}</p>
                <p>omega^2 = ${isFinite(anovaStats.omegaSquared) ? anovaStats.omegaSquared.toFixed(3) : '--'}</p>
                <p>${etaDescriptor}</p>
            </article>
            <article class="result-item">
                <h4>Grand Mean</h4>
                <p>${anovaStats.grandMean.toFixed(3)} based on N = ${anovaStats.totalN}</p>
                <p>${groups.length} groups entered</p>
            </article>
        </div>
        ${comparisonsBlock}
    `;
}

function updateDiagnostics(anovaStats, groups) {
    const container = document.getElementById('diagnostics-content');
    if (!container) {
        return;
    }
    if (!anovaStats || !groups.length) {
        container.innerHTML = '<p>Run an analysis to populate the diagnostics summary.</p>';
        return;
    }

    const sds = groups.map(group => group.sd).filter(sd => isFinite(sd) && sd > 0);
    const ns = groups.map(group => group.n);
    const maxSd = Math.max(...sds);
    const minSd = Math.min(...sds);
    const varRatio = maxSd / minSd;
    let varianceStatus = 'good';
    let varianceMessage = 'Group variances appear similar, supporting the homogeneity assumption.';
    if (varRatio > 4) {
        varianceStatus = 'alert';
        varianceMessage = 'Variance ratio exceeds 4:1. Consider Welch-type adjustments, transforming the metric, or pairing with nonparametric tests.';
    } else if (varRatio > 2) {
        varianceStatus = 'caution';
        varianceMessage = 'Variance ratio is moderately high. Investigate data quality, outliers, or use robust techniques.';
    }

    const smallestN = Math.min(...ns);
    let normalityStatus = 'good';
    let normalityMessage = 'Sample sizes give the Central Limit Theorem plenty to work with.';
    if (smallestN < 10) {
        normalityStatus = 'alert';
        normalityMessage = 'Some groups have fewer than 10 observations. Inspect residual plots, add data if possible, or consider nonparametric alternatives.';
    } else if (smallestN < 20) {
        normalityStatus = 'caution';
        normalityMessage = 'Some groups have fewer than 20 observations; check histograms or Q-Q plots and temper claims about subtle effects.';
    }

    const largestN = Math.max(...ns);
    const balanceRatio = largestN / smallestN;
    let balanceStatus = 'good';
    let balanceMessage = 'Sample sizes are reasonably balanced.';
    if (balanceRatio > 3) {
        balanceStatus = 'alert';
        balanceMessage = 'Very unbalanced group sizes may inflate Type I error. Consider trimming extremes or using weighted models.';
    } else if (balanceRatio > 1.5) {
        balanceStatus = 'caution';
        balanceMessage = 'Noticeable imbalance between smallest and largest groups. Document the imbalance and interpret cautiously.';
    }

    const severityScore = status => (status === 'alert' ? 2 : status === 'caution' ? 1 : 0);
    const overallSeverity = Math.max(
        severityScore(varianceStatus),
        severityScore(normalityStatus),
        severityScore(balanceStatus)
    );
    let overallStatus = 'good';
    let overallMessage = 'Diagnostics are in line with the core ANOVA assumptions. Proceed with the omnibus test and planned comparisons.';
    if (overallSeverity === 1) {
        overallStatus = 'caution';
        overallMessage = 'One or more diagnostics raised yellow flags. Document the caveats and consider robustness checks before making high-stakes decisions.';
    } else if (overallSeverity === 2) {
        overallStatus = 'alert';
        overallMessage = 'Diagnostics fall outside typical ANOVA comfort zones. Treat the results as directional and explore alternative models or data improvements.';
    }

    const diagnostics = [
        {
            title: 'Variance homogeneity',
            status: varianceStatus,
            message: `Largest SD ÷ smallest SD = ${varRatio.toFixed(2)}. ${varianceMessage}`
        },
        {
            title: 'Approximate normality',
            status: normalityStatus,
            message: `Smallest group n = ${smallestN}. ${normalityMessage}`
        },
        {
            title: 'Sample balance',
            status: balanceStatus,
            message: `Largest n ÷ smallest n = ${balanceRatio.toFixed(2)}. ${balanceMessage}`
        },
        {
            title: 'Independence reminder',
            status: 'good',
            message: 'ANOVA assumes each observation is independent. Review the sampling plan and randomization before taking action.'
        },
        {
            title: 'Overall recommendation',
            status: overallStatus,
            message: overallMessage
        }
    ];

    container.innerHTML = diagnostics.map(item => `
        <div class="diagnostic-item ${item.status}">
            <strong>${item.title}</strong>
            <p>${item.message}</p>
        </div>
    `).join('');
}

// Summary table
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

function updateSummaryTable(groups, intervals, selectedLevel, anovaStats) {
    const tableBody = document.getElementById('summary-table-body');
    if (!tableBody) {
        return;
    }
    const levelText = `${Math.round(selectedLevel * 100)}%`;
    const lowerHeader = document.getElementById('summary-ci-lower-header');
    const upperHeader = document.getElementById('summary-ci-upper-header');
    if (lowerHeader) {
        lowerHeader.textContent = `${levelText} Lower Bound`;
    }
    if (upperHeader) {
        upperHeader.textContent = `${levelText} Upper Bound`;
    }
    const rows = groups.map(group => {
        const ci = intervals[group.id][selectedLevel];
        return `
            <tr>
                <td>${escapeHtml(group.name)}</td>
                <td>${group.mean.toFixed(3)}</td>
                <td>n = ${group.n}</td>
                <td>${ci.lower.toFixed(3)}</td>
                <td>${ci.upper.toFixed(3)}</td>
            </tr>
        `;
    });
    if (anovaStats) {
        rows.push(`
            <tr>
                <td>Between groups SS</td>
                <td>${anovaStats.ssBetween.toFixed(3)}</td>
                <td>df = ${anovaStats.dfBetween}</td>
                <td>MS = ${anovaStats.msBetween.toFixed(3)}</td>
                <td>F = ${isFinite(anovaStats.fStatistic) ? anovaStats.fStatistic.toFixed(3) : '--'}</td>
            </tr>
        `);
        rows.push(`
            <tr>
                <td>Within groups SS</td>
                <td>${anovaStats.ssWithin.toFixed(3)}</td>
                <td>df = ${anovaStats.dfWithin}</td>
                <td>MS = ${anovaStats.msWithin.toFixed(3)}</td>
                <td>p = ${isFinite(anovaStats.pValue) ? anovaStats.pValue.toFixed(4) : '--'}</td>
            </tr>
        `);
    }
    tableBody.innerHTML = rows.join('');
}

// Axis controls
async function fetchScenarioIndex() {
    try {
        const response = await fetch('scenarios/scenario-index.json', { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Unable to load scenario index (${response.status})`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            scenarioManifest = data;
        }
    } catch (error) {
        console.error('Scenario index error:', error);
        scenarioManifest = [];
    }
}

function parseScenarioText(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const result = {
        title: '',
        description: [],
        groups: [],
        alpha: null,
        plannedComparisons: [],
        additionalInputs: {},
        rawData: []
    };
    let section = '';
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) {
            section = trimmed.replace(/^#\s*/, '').toLowerCase();
            return;
        }
        if (!section) {
            return;
        }
        if (section === 'title') {
            if (trimmed) {
                result.title = trimmed;
            }
        } else if (section === 'description') {
            result.description.push(line);
        } else if (section === 'alpha') {
            const value = parseFloat(trimmed);
            if (isFinite(value)) {
                result.alpha = value;
            }
        } else if (section === 'planned comparisons') {
            if (!trimmed) return;
            const parts = trimmed.split('|').map(part => part.trim());
            if (parts.length < 2) return;
            const [groupA, groupB] = parts;
            if (groupA && groupB) {
                result.plannedComparisons.push({ groupA, groupB });
            }
        } else if (section === 'groups') {
            if (!trimmed) return;
            const parts = trimmed.split('|').map(part => part.trim());
            if (parts.length < 4) return;
            const [name, meanStr, sdStr, nStr] = parts;
            const mean = parseFloat(meanStr);
            const sd = parseFloat(sdStr);
            const n = parseInt(nStr, 10);
            if (!name || !isFinite(mean) || !isFinite(sd) || !Number.isInteger(n)) {
                return;
            }
            result.groups.push({
                name,
                mean,
                sd,
                n
            });
        } else if (section === 'raw data') {
            if (!trimmed) return;
            const parts = trimmed.split('|').map(part => part.trim());
            if (parts.length < 2) return;
            const [groupName, valueStr] = parts;
            const value = parseFloat(valueStr);
            if (!groupName || !isFinite(value)) {
                return;
            }
            result.rawData.push({ group: groupName, value });
        } else {
            if (!trimmed || !trimmed.includes('=')) {
                return;
            }
            const [rawKey, ...rest] = trimmed.split('=');
            const key = rawKey.trim();
            const value = rest.join('=').trim();
            if (!key || !value) {
                return;
            }
            if (!result.additionalInputs[section]) {
                result.additionalInputs[section] = {};
            }
            result.additionalInputs[section][key] = value;
        }
    });
    result.description = result.description.join('\n').trim();
    return result;
}

function renderScenarioDescription(title, description) {
        if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
            window.UIUtils.renderScenarioDescription({
                containerId: 'scenario-description',
                title,
                description,
                defaultHtml: defaultScenarioDescription
            });
            return;
        }
        const container = document.getElementById('scenario-description');
        if (!container) {
            return;
        }
        container.innerHTML = description || defaultScenarioDescription || '';
    }

function applyScenarioGroups(groups, suppressUpdate = false) {
    if (!Array.isArray(groups) || !groups.length) {
        return {};
    }
    const limited = groups.slice(0, MAX_GROUPS);
    const count = clamp(limited.length, MIN_GROUPS, MAX_GROUPS);
    const groupSelect = document.getElementById('group-count');
    if (groupSelect) {
        groupSelect.value = String(count);
    }
    setGroupCount(count, false);
    const cards = Array.from(document.querySelectorAll('.group-row'));
    const nameMap = {};
    limited.forEach((group, index) => {
        const card = cards[index];
        if (!card) return;
        const nameInput = card.querySelector('.group-name');
        const meanInput = card.querySelector('.group-mean');
        const sdInput = card.querySelector('.group-sd');
        const nInput = card.querySelector('.group-n');
        const nameValue = group.name || `Group ${index + 1}`;
        if (nameInput) {
            nameInput.value = nameValue;
            nameMap[nameValue.toLowerCase()] = card.dataset.groupId;
        }
        if (meanInput) meanInput.value = isFinite(group.mean) ? group.mean : '';
        if (sdInput) sdInput.value = isFinite(group.sd) ? group.sd : '';
        if (nInput) nInput.value = Number.isInteger(group.n) ? group.n : '';
    });
    refreshComparisonOptions();
    if (!suppressUpdate) {
        updateResults();
    }
    return nameMap;
}

function deriveGroupsFromRaw(rawData) {
    if (!Array.isArray(rawData) || !rawData.length) {
        return [];
    }
    const statsMap = new Map();
    rawData.forEach(entry => {
        const label = entry.group?.trim();
        const value = entry.value;
        if (!label || !isFinite(value)) {
            return;
        }
        if (!statsMap.has(label)) {
            statsMap.set(label, { label, count: 0, mean: 0, m2: 0 });
        }
        const stats = statsMap.get(label);
        stats.count += 1;
        const delta = value - stats.mean;
        stats.mean += delta / stats.count;
        const delta2 = value - stats.mean;
        stats.m2 += delta * delta2;
    });
    const groups = [];
    statsMap.forEach(stats => {
        if (stats.count < 2) {
            return;
        }
        const variance = stats.count > 1 ? stats.m2 / (stats.count - 1) : 0;
        groups.push({
            name: stats.label,
            mean: stats.mean,
            sd: Math.sqrt(Math.max(variance, 0)),
            n: stats.count
        });
    });
    return groups;
}

function escapeCsvValue(value) {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function buildScenarioDataset(parsed, scenarioId) {
    const safeId = (scenarioId || 'scenario').replace(/\s+/g, '_').toLowerCase();
    if (parsed.rawData && parsed.rawData.length) {
        const lines = ['group,value'];
        parsed.rawData.forEach(entry => {
            if (!entry.group || !isFinite(entry.value)) {
                return;
            }
            lines.push(`${escapeCsvValue(entry.group)},${entry.value}`);
        });
        if (lines.length > 1) {
            return {
                filename: `${safeId}_raw_data.csv`,
                content: lines.join('\n')
            };
        }
    }
    if (parsed.groups && parsed.groups.length) {
        const lines = ['group,mean,sd,n'];
        parsed.groups.forEach(group => {
            lines.push([
                escapeCsvValue(group.name),
                isFinite(group.mean) ? group.mean : '',
                isFinite(group.sd) ? group.sd : '',
                Number.isFinite(group.n) ? group.n : ''
            ].join(','));
        });
        if (lines.length > 1) {
            return {
                filename: `${safeId}_summary_inputs.csv`,
                content: lines.join('\n')
            };
        }
    }
    return null;
}

function updateScenarioDownloadButton(datasetInfo = null) {
    currentScenarioDataset = datasetInfo;
    const button = document.getElementById('scenario-download');
    if (!button) {
        return;
    }
    if (datasetInfo) {
        button.classList.remove('hidden');
        button.disabled = false;
    } else {
        button.classList.add('hidden');
        button.disabled = true;
    }
}

function setupScenarioDownloadButton() {
    const button = document.getElementById('scenario-download');
    if (!button) {
        return;
    }
    button.addEventListener('click', () => {
        if (!currentScenarioDataset) {
            return;
        }
        downloadTextFile(
            currentScenarioDataset.filename || 'scenario.csv',
            currentScenarioDataset.content,
            { mimeType: 'text/csv' }
        );
    });
}

async function loadScenarioById(id) {
    const scenario = scenarioManifest.find(entry => entry.id === id);
    if (!scenario) {
        renderScenarioDescription('', '');
        updateScenarioDownloadButton(null);
        return;
    }
    try {
        const response = await fetch(scenario.file, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Unable to load scenario file (${response.status})`);
        }
        const text = await response.text();
        const parsed = parseScenarioText(text);
        if ((!parsed.groups || !parsed.groups.length) && parsed.rawData.length) {
            const derived = deriveGroupsFromRaw(parsed.rawData);
            if (derived.length) {
                parsed.groups = derived;
            }
        }
        renderScenarioDescription(parsed.title || scenario.label, parsed.description);
        const nameMap = parsed.groups.length ? applyScenarioGroups(parsed.groups, true) : {};
        const alphaInput = document.getElementById('alpha');
        if (alphaInput && isFinite(parsed.alpha)) {
            alphaInput.value = parsed.alpha.toFixed(3);
            syncConfidenceButtonsToAlpha(parsed.alpha, { skipUpdate: true });
        }
        const plannedCheckbox = document.getElementById('enable-planned-comparisons');
        if (plannedCheckbox) {
            if (parsed.plannedComparisons.length) {
                plannedCheckbox.checked = true;
                togglePlannedPanel(true);
                clearComparisonRows(true);
                parsed.plannedComparisons.forEach(pair => {
                    const idA = nameMap[pair.groupA.toLowerCase()];
                    const idB = nameMap[pair.groupB.toLowerCase()];
                    if (idA && idB && idA !== idB) {
                        addComparisonRowWithSelections(idA, idB, true);
                    }
                });
            } else {
                plannedCheckbox.checked = false;
                togglePlannedPanel(false);
                clearComparisonRows(true);
            }
        }
        const datasetInfo = buildScenarioDataset(parsed, scenario.id);
        updateScenarioDownloadButton(datasetInfo);
        updateResults();
    } catch (error) {
        console.error('Scenario load error:', error);
        updateScenarioDownloadButton(null);
    }
}

async function setupScenarioSelector() {
    const select = document.getElementById('scenario-select');
    if (!select) {
        return;
    }
    await fetchScenarioIndex();
    scenarioManifest.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = entry.label;
        select.appendChild(option);
    });
    select.addEventListener('change', () => {
        const { value } = select;
        if (!value) {
            renderScenarioDescription('', '');
            updateScenarioDownloadButton(null);
            return;
        }
        loadScenarioById(value);
    });
}

function getMeansAxisRange(autoRange) {
    const lock = document.getElementById('means-axis-lock');
    const minInput = document.getElementById('means-axis-min');
    const maxInput = document.getElementById('means-axis-max');
    if (lock && lock.checked) {
        const minValue = parseFloat(minInput.value);
        const maxValue = parseFloat(maxInput.value);
        if (isFinite(minValue) && isFinite(maxValue) && maxValue > minValue) {
            return [minValue, maxValue];
        }
    }
    return autoRange;
}

function resetAxisControls() {
    const lock = document.getElementById('means-axis-lock');
    const minInput = document.getElementById('means-axis-min');
    const maxInput = document.getElementById('means-axis-max');
    if (lock) lock.checked = false;
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';
    updateResults();
}

function getMeanReferenceOptions(anovaStats, groups) {
    const checkbox = document.getElementById('show-overall-mean');
    if (!checkbox || !checkbox.checked || !anovaStats || !groups.length) {
        return null;
    }
    const selectedRadio = document.querySelector('input[name="mean-reference-type"]:checked');
    const selected = selectedRadio ? selectedRadio.value : 'grand';
    const equalWeightMean = groups.reduce((sum, group) => sum + group.mean, 0) / groups.length;
    const value = selected === 'weighted' ? equalWeightMean : anovaStats.grandMean;
    if (!isFinite(value)) {
        return null;
    }
    const label = selected === 'weighted' ? 'Equal-weight mean' : 'Grand mean';
    return { value, label, type: selected };
}

function setupAxisControls() {
    const lock = document.getElementById('means-axis-lock');
    const minInput = document.getElementById('means-axis-min');
    const maxInput = document.getElementById('means-axis-max');
    const resetButton = document.getElementById('reset-axis');
    if (lock) lock.addEventListener('change', updateResults);
    if (minInput) minInput.addEventListener('input', updateResults);
    if (maxInput) maxInput.addEventListener('input', updateResults);
    if (resetButton) resetButton.addEventListener('click', resetAxisControls);
}

// Confidence buttons
function applyConfidenceSelection(level, { syncAlpha = true, skipUpdate = false } = {}) {
    if (!isFinite(level)) {
        return;
    }
    selectedConfidenceLevel = level;
    const buttons = document.querySelectorAll('.confidence-button');
    buttons.forEach(button => {
        const buttonLevel = parseFloat(button.dataset.level);
        button.classList.toggle('active', Math.abs(buttonLevel - level) < 1e-6);
    });
    if (syncAlpha) {
        const alphaInput = document.getElementById('alpha');
        if (alphaInput) {
            alphaInput.value = (1 - level).toFixed(3);
        }
    }
    if (!skipUpdate) {
        updateResults();
    }
}

function syncConfidenceButtonsToAlpha(alphaValue, { skipUpdate = false } = {}) {
    const alpha = parseFloat(alphaValue);
    const buttons = document.querySelectorAll('.confidence-button');
    let matchedLevel = null;
    if (isFinite(alpha) && alpha > 0 && alpha < 1) {
        buttons.forEach(button => {
            const level = parseFloat(button.dataset.level);
            const expectedAlpha = +(1 - level).toFixed(3);
            const match = Math.abs(alpha - expectedAlpha) < 1e-4;
            button.classList.toggle('active', match);
            if (match) {
                matchedLevel = level;
            }
        });
        if (matchedLevel === null) {
            if (isFinite(alpha)) {
                selectedConfidenceLevel = clamp(1 - alpha, 0.5, 0.999);
            }
        } else {
            selectedConfidenceLevel = matchedLevel;
        }
    } else {
        buttons.forEach(button => button.classList.remove('active'));
    }
    if (!skipUpdate) {
        updateResults();
    }
}

function setupConfidenceButtons() {
    const buttons = document.querySelectorAll('.confidence-button');
    buttons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            const level = parseFloat(button.dataset.level);
            applyConfidenceSelection(level);
        });
    });
}

// Group controls
function setupGroupControls() {
    const groupSelect = document.getElementById('group-count');
    if (groupSelect) {
        groupSelect.addEventListener('change', () => {
            const selected = parseInt(groupSelect.value, 10);
            setGroupCount(isNaN(selected) ? DEFAULT_GROUPS : selected);
        });
    }
}

function setupPlannedComparisonControls() {
    const enableCheckbox = document.getElementById('enable-planned-comparisons');
    const addButton = document.getElementById('add-comparison');
    const list = document.getElementById('planned-comparisons-list');
    if (enableCheckbox) {
        enableCheckbox.addEventListener('change', () => {
            togglePlannedPanel(enableCheckbox.checked);
            updateResults();
        });
        togglePlannedPanel(enableCheckbox.checked);
    }
    if (addButton) {
        addButton.addEventListener('click', addComparisonRow);
    }
    if (list) {
        list.addEventListener('change', event => {
            if (event.target.matches('select')) {
                updateComparisonWarnings();
                updateResults();
            }
        });
        list.addEventListener('click', event => {
            if (event.target.classList.contains('remove-comparison')) {
                removeComparisonRow(event.target);
            }
        });
    }
}

function setupMeanReferenceControls() {
    const checkbox = document.getElementById('show-overall-mean');
    const radios = document.querySelectorAll('input[name="mean-reference-type"]');
    const syncDisabledState = () => {
        const disabled = !(checkbox && checkbox.checked);
        radios.forEach(radio => {
            radio.disabled = disabled;
        });
    };

    if (checkbox) {
        checkbox.addEventListener('change', () => {
            syncDisabledState();
            updateResults();
        });
        syncDisabledState();
    }

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (!checkbox || checkbox.checked) {
                updateResults();
            }
        });
    });
}

// Main computation flow
function updateResults() {
    const groups = collectGroupData();
    const validation = validateGroups(groups);
    const alphaInput = document.getElementById('alpha');
    const alphaValue = alphaInput ? parseFloat(alphaInput.value) : NaN;
    const alpha = isFinite(alphaValue) && alphaValue > 0 && alphaValue < 1 ? alphaValue : 0.05;

    if (!validation.valid) {
        if (window.Plotly) {
            Plotly.purge('means-chart');
        }
        const meansNarrative = document.getElementById('means-narrative');
        if (meansNarrative) meansNarrative.textContent = validation.message;
        const interpretation = document.getElementById('interpretation');
        if (interpretation) interpretation.textContent = validation.message;
        clearSummaryTable();
        return;
    }

    const anovaStats = calculateAnova(groups);
    const levels = [0.5, 0.8, selectedConfidenceLevel];
    const sortedLevels = [...new Set(levels)].sort((a, b) => a - b);
    const intervals = {};
    const dfWithin = anovaStats.dfWithin;

    sortedLevels.forEach(level => {
        const levelAlpha = 1 - level;
        const crit = tCriticalApprox(1 - levelAlpha / 2, dfWithin);
        groups.forEach(group => {
            intervals[group.id] = intervals[group.id] || {};
            const se = group.sd / Math.sqrt(group.n);
            const margin = crit * se;
            intervals[group.id][level] = {
                lower: group.mean - margin,
                upper: group.mean + margin
            };
        });
    });

    const autoRange = ensureRange(
        Math.min(...sortedLevels.map(level => Math.min(...groups.map(group => intervals[group.id][level].lower)))),
        Math.max(...sortedLevels.map(level => Math.max(...groups.map(group => intervals[group.id][level].upper)))),
        0.5
    );
    const meansRange = getMeansAxisRange(autoRange);

    const meanReference = getMeanReferenceOptions(anovaStats, groups);
    renderMeansFanChart(groups, intervals, meansRange, sortedLevels, meanReference);

    const plannedToggle = document.getElementById('enable-planned-comparisons');
    const enablePlanned = plannedToggle ? plannedToggle.checked : false;
    const plannedComparisons = enablePlanned ? getPlannedComparisons() : [];
    const comparisonResults = enablePlanned ? calculatePlannedComparisons(groups, anovaStats, plannedComparisons, alpha) : [];
    renderPlannedComparisonsChart(comparisonResults, anovaStats);

    const intervalLabel = sortedLevels.map(l => `${Math.round(l * 100)}%`).join(', ');
    const meansChart = document.getElementById('means-chart');
    if (meansChart) {
        let ariaLabel = `Fan chart comparing ${groups.length} group means with ${intervalLabel} confidence bands.`;
        if (meanReference) {
            ariaLabel += ` Includes dotted line for the ${meanReference.label} at ${meanReference.value.toFixed(2)}.`;
        }
        meansChart.setAttribute('aria-label', ariaLabel);
    }
    const plannedCard = document.getElementById('planned-chart-card');
    if (plannedCard) {
        plannedCard.classList.toggle('hidden', !enablePlanned || !comparisonResults.length);
    }
    const plannedChart = document.getElementById('planned-chart');
    if (plannedChart) {
        if (comparisonResults.length) {
            plannedChart.setAttribute(
                'aria-label',
                `Bar chart of ${comparisonResults.length} Tukey comparisons with differences and confidence bands.`
            );
        } else {
            plannedChart.setAttribute(
                'aria-label',
                'Tukey comparisons unavailable. Enable planned comparisons to view pairwise differences.'
            );
        }
    }
    const meansTitle = document.getElementById('means-chart-title');
    if (meansTitle) {
        meansTitle.textContent = `Group Means Fan Chart (${intervalLabel} intervals)`;
    }
    const plannedTitle = document.getElementById('planned-chart-title');
    if (plannedTitle) {
        plannedTitle.textContent = comparisonResults.length
            ? `Tukey Planned Comparisons (${comparisonResults.length} pairs)`
            : 'Tukey Planned Comparisons';
    }

    updateMeansNarrative(groups, intervals, sortedLevels[sortedLevels.length - 1]);
    updatePlannedNarrative(comparisonResults);
    updateInterpretation(anovaStats, groups, comparisonResults, alpha);
    updateDiagnostics(anovaStats, groups);
    updateSummaryTable(groups, intervals, sortedLevels[sortedLevels.length - 1], anovaStats);

    modifiedDate = new Date().toLocaleDateString();
    const modifiedLabel = document.getElementById('modified-date');
    if (modifiedLabel) {
        modifiedLabel.textContent = modifiedDate;
    }
}

function initializeGroupInputs() {
    const container = document.getElementById('group-inputs');
    if (!container) {
        return;
    }
    container.innerHTML = '';
    groupCounter = 0;
    const groupSelect = document.getElementById('group-count');
    const initialValue = groupSelect ? parseInt(groupSelect.value, 10) : DEFAULT_GROUPS;
    const target = clamp(isNaN(initialValue) ? DEFAULT_GROUPS : initialValue, MIN_GROUPS, MAX_GROUPS);
    for (let i = 0; i < target; i++) {
        createGroupCard();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const createdLabel = document.getElementById('created-date');
    const modifiedLabel = document.getElementById('modified-date');
    if (createdLabel) createdLabel.textContent = CREATED_DATE;
    if (modifiedLabel) modifiedLabel.textContent = modifiedDate;
    const scenarioContainer = document.getElementById('scenario-description');
    if (scenarioContainer) {
        defaultScenarioDescription = scenarioContainer.innerHTML;
    }

    initializeGroupInputs();
    setupConfidenceButtons();
    setupAxisControls();
    setupGroupControls();
    setupDataEntryModeControls();
    setupPlannedComparisonControls();
    setupMeanReferenceControls();
    setupScenarioSelector();
    setupScenarioDownloadButton();
    setupDataImportControls();

    const alphaInput = document.getElementById('alpha');
    if (alphaInput) {
        alphaInput.addEventListener('input', () => {
            const alphaValue = parseFloat(alphaInput.value);
            syncConfidenceButtonsToAlpha(alphaValue);
        });
        const initialAlpha = parseFloat(alphaInput.value);
        if (isFinite(initialAlpha)) {
            syncConfidenceButtonsToAlpha(initialAlpha, { skipUpdate: true });
        } else {
            applyConfidenceSelection(selectedConfidenceLevel, { syncAlpha: true, skipUpdate: true });
        }
    } else {
        applyConfidenceSelection(selectedConfidenceLevel, { syncAlpha: false, skipUpdate: true });
    }

    updateResults();
});

