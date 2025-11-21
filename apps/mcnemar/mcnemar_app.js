const CREATED_DATE = new Date('2025-11-06').toLocaleDateString();
let modifiedDate = new Date().toLocaleDateString();

let selectedConfidenceLevel = 0.95;
let scenarioManifest = [];
let defaultScenarioDescription = '';

const REQUIRED_COUNT_KEYS = ['a_yes_b_yes', 'a_yes_b_no', 'a_no_b_yes', 'a_no_b_no'];
const defaultLabels = {
    conditionA: 'Condition A',
    conditionB: 'Condition B',
    positive: 'Positive',
    negative: 'Negative'
};

const DataEntryModes = Object.freeze({
    MANUAL: 'manual',
    SUMMARY: 'summary-upload',
    RAW: 'raw-upload'
});

const SUMMARY_TEMPLATE_CSV = [
    'condition_a_label,condition_b_label,positive_label,negative_label,a_positive_b_positive,a_positive_b_negative,a_negative_b_positive,a_negative_b_negative,alpha,analysis_method',
    'Condition A,Condition B,Converted,Did not convert,120,35,42,298,0.05,chi2_cc'
].join('\r\n');

const RAW_TEMPLATE_CSV = [
    'Condition A,Condition B',
    'Converted,Converted',
    'Converted,Not converted',
    'Not converted,Converted',
    'Not converted,Not converted'
].join('\r\n');

let activeDataEntryMode = DataEntryModes.MANUAL;
let activeScenarioDataset = null;

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

function getEditableText(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return el.textContent.replace(/\s+/g, ' ').trim();
}

function setEditableText(id, value) {
    const el = document.getElementById(id);
    if (el && typeof value !== 'undefined') {
        el.textContent = value;
    }
}

function setUploadStatus(id, message, state) {
    const target = document.getElementById(id);
    if (!target) return;
    target.textContent = message;
    target.classList.remove('success', 'error');
    if (state) {
        target.classList.add(state);
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
        setDataEntryMode(button.dataset.mode);
    });
    setDataEntryMode(activeDataEntryMode);
}

function setLabelInputs(labels = {}) {
    const conditionA = labels.conditionA ?? defaultLabels.conditionA;
    const conditionB = labels.conditionB ?? defaultLabels.conditionB;
    const positive = labels.positive ?? defaultLabels.positive;
    const negative = labels.negative ?? defaultLabels.negative;

    setEditableText('condition-a-label', conditionA);
    setEditableText('condition-b-label', conditionB);
    setEditableText('positive-label', positive);
    setEditableText('negative-label', negative);
    const rowPositive = document.getElementById('row-positive-label');
    if (rowPositive) {
        rowPositive.textContent = positive;
    }
    const rowNegative = document.getElementById('row-negative-label');
    if (rowNegative) {
        rowNegative.textContent = negative;
    }
}

function setCountInputs(counts = {}) {
    const mapping = {
        aPosBPos: 'cell-a-pos-b-pos',
        aPosBNeg: 'cell-a-pos-b-neg',
        aNegBPos: 'cell-a-neg-b-pos',
        aNegBNeg: 'cell-a-neg-b-neg'
    };
    Object.entries(mapping).forEach(([key, id]) => {
        const input = document.getElementById(id);
        if (input && Object.prototype.hasOwnProperty.call(counts, key)) {
            input.value = counts[key];
        }
    });
}

function applyAlphaSetting(alphaValue, { skipUpdate = true } = {}) {
    if (!isFinite(alphaValue)) {
        return false;
    }
    const alphaInput = document.getElementById('alpha');
    if (alphaInput) {
        alphaInput.value = alphaValue.toFixed(3);
    }
    syncConfidenceButtonsToAlpha(alphaValue, { skipUpdate });
    return true;
}

function applyMethodSetting(methodValue) {
    if (!methodValue) return false;
    const methodInput = document.getElementById('analysis-method');
    if (!methodInput) return false;
    methodInput.value = methodValue;
    return true;
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

function logCombination(n, k) {
    if (k < 0 || k > n) {
        return -Infinity;
    }
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

function binomialProbability(k, n, p) {
    if (p <= 0) {
        return k === 0 ? 1 : 0;
    }
    if (p >= 1) {
        return k === n ? 1 : 0;
    }
    const logProb = logCombination(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
    return Math.exp(logProb);
}

function exactBinomialPValue(b, c) {
    const discordant = b + c;
    if (discordant === 0) {
        return NaN;
    }
    const smaller = Math.min(b, c);
    let cumulative = 0;
    for (let i = 0; i <= smaller; i++) {
        cumulative += binomialProbability(i, discordant, 0.5);
    }
    return Math.min(1, 2 * cumulative);
}

function formatPValue(p) {
    if (!isFinite(p)) return 'p = --';
    if (p < 0.001) return 'p < .001';
    return `p = ${p.toFixed(3).replace(/^0/, '')}`;
}

function formatPercent(value) {
    if (!isFinite(value)) {
        return '--';
    }
    return `${(value * 100).toFixed(1)}%`;
}

function updateContingencyLabels(labels) {
    if (!labels) {
        return;
    }
    const rowPositive = document.getElementById('row-positive-label');
    const rowNegative = document.getElementById('row-negative-label');
    const totalPosLabel = document.getElementById('total-a-positive-label');
    const totalNegLabel = document.getElementById('total-a-negative-label');

    if (rowPositive) {
        rowPositive.textContent = labels.positive;
    }
    if (rowNegative) {
        rowNegative.textContent = labels.negative;
    }
    if (totalPosLabel) {
        totalPosLabel.textContent = `Total ${labels.conditionA} ${labels.positive}:`;
    }
    if (totalNegLabel) {
        totalNegLabel.textContent = `Total ${labels.conditionA} ${labels.negative}:`;
    }
}

function updateTotalsDisplay(totals) {
    const totalAPos = document.getElementById('total-a-positive');
    const totalANeg = document.getElementById('total-a-negative');
    const totalPairs = document.getElementById('total-pairs');
    if (totalAPos) totalAPos.textContent = totals.aPositive.toLocaleString();
    if (totalANeg) totalANeg.textContent = totals.aNegative.toLocaleString();
    if (totalPairs) totalPairs.textContent = totals.total.toLocaleString();
}

function collectTableData() {
    const labels = {
        conditionA: getEditableText('condition-a-label') || defaultLabels.conditionA,
        conditionB: getEditableText('condition-b-label') || defaultLabels.conditionB,
        positive: getEditableText('positive-label') || defaultLabels.positive,
        negative: getEditableText('negative-label') || defaultLabels.negative
    };
    updateContingencyLabels(labels);

    const cells = {
        aPosBPos: parseInt(document.getElementById('cell-a-pos-b-pos')?.value, 10),
        aPosBNeg: parseInt(document.getElementById('cell-a-pos-b-neg')?.value, 10),
        aNegBPos: parseInt(document.getElementById('cell-a-neg-b-pos')?.value, 10),
        aNegBNeg: parseInt(document.getElementById('cell-a-neg-b-neg')?.value, 10)
    };

    for (const key of Object.keys(cells)) {
        if (!Number.isInteger(cells[key]) || cells[key] < 0) {
            return { valid: false, message: 'All table cells must be non-negative integers.', labels };
        }
    }

    const totals = {
        aPositive: cells.aPosBPos + cells.aPosBNeg,
        aNegative: cells.aNegBPos + cells.aNegBNeg,
        bPositive: cells.aPosBPos + cells.aNegBPos,
        bNegative: cells.aPosBNeg + cells.aNegBNeg
    };
    totals.total = totals.aPositive + totals.aNegative;

    if (totals.total === 0) {
        return { valid: false, message: 'Enter counts above zero to run McNemar’s test.', labels };
    }

    updateTotalsDisplay(totals);

    return {
        valid: true,
        cells,
        totals,
        labels
    };
}

function computeMcNemarStats(data, alpha, method) {
    const { cells, totals } = data;
    const discordantA = cells.aPosBNeg;
    const discordantB = cells.aNegBPos;
    const discordantTotal = discordantA + discordantB;
    const netDifference = discordantB - discordantA;
    const netShare = totals.total > 0 ? netDifference / totals.total : NaN;
    const discordantShare = totals.total > 0 ? discordantTotal / totals.total : NaN;

    const chiSquareNoCc = discordantTotal ? Math.pow(discordantA - discordantB, 2) / discordantTotal : NaN;
    const chiSquareCc = discordantTotal ? Math.pow(Math.abs(discordantA - discordantB) - 1, 2) / discordantTotal : NaN;
    const chiPNoCc = Number.isFinite(chiSquareNoCc) ? 1 - erf(Math.sqrt(chiSquareNoCc / 2)) : NaN;
    const chiPCc = Number.isFinite(chiSquareCc) ? 1 - erf(Math.sqrt(chiSquareCc / 2)) : NaN;
    const exactP = exactBinomialPValue(discordantA, discordantB);

    const ciProb = 0.5 + selectedConfidenceLevel / 2;
    const critical = normInv(ciProb);
    const adjustedA = discordantA === 0 ? 0.5 : discordantA;
    const adjustedB = discordantB === 0 ? 0.5 : discordantB;
    const logOR = Math.log(adjustedB / adjustedA);
    const seLogOR = Math.sqrt(1 / adjustedA + 1 / adjustedB);
    const margin = critical * seLogOR;
    const orPoint = Math.exp(logOR);
    const orLower = Math.exp(logOR - margin);
    const orUpper = Math.exp(logOR + margin);

    let primaryStat = chiSquareCc;
    let primaryP = chiPCc;
    let statLabel = 'Chi-square (corrected)';
    if (method === 'chi2_nocc') {
        primaryStat = chiSquareNoCc;
        primaryP = chiPNoCc;
        statLabel = 'Chi-square (no correction)';
    } else if (method === 'exact') {
        primaryStat = exactP;
        primaryP = exactP;
        statLabel = 'Exact binomial';
    }

    const significance = primaryP < alpha;

    return {
        discordantA,
        discordantB,
        discordantTotal,
        discordantShare,
        netDifference,
        netShare,
        chiSquareCc,
        chiSquareNoCc,
        chiPCc,
        chiPNoCc,
        exactP,
        oddsRatio: {
            point: orPoint,
            lower: orLower,
            upper: orUpper
        },
        primary: {
            stat: primaryStat,
            pValue: primaryP,
            label: statLabel,
            method
        },
        totals,
        alpha,
        significant: significance
    };
}

function renderMatrixChart(data, stats) {
    if (!window.Plotly) {
        return;
    }
    const { labels, cells } = data;
    const totalPairs = stats.totals.total || 0;
    const formatCell = value => {
        if (!totalPairs) {
            return `${value.toLocaleString()}`;
        }
        const pct = (value / totalPairs) * 100;
        return `${value.toLocaleString()} (${pct.toFixed(1)}%)`;
    };
    const zValues = [
        [cells.aPosBPos, cells.aPosBNeg],
        [cells.aNegBPos, cells.aNegBNeg]
    ];
    const textValues = [
        [formatCell(cells.aPosBPos), formatCell(cells.aPosBNeg)],
        [formatCell(cells.aNegBPos), formatCell(cells.aNegBNeg)]
    ];
    const hovertext = [
        [
            `${labels.conditionA} ${labels.positive} & ${labels.conditionB} ${labels.positive}: ${cells.aPosBPos}`,
            `${labels.conditionA} ${labels.positive} & ${labels.conditionB} ${labels.negative}: ${cells.aPosBNeg}`
        ],
        [
            `${labels.conditionA} ${labels.negative} & ${labels.conditionB} ${labels.positive}: ${cells.aNegBPos}`,
            `${labels.conditionA} ${labels.negative} & ${labels.conditionB} ${labels.negative}: ${cells.aNegBNeg}`
        ]
    ];

    const trace = {
        z: zValues,
        x: [`${labels.conditionB} ${labels.positive}`, `${labels.conditionB} ${labels.negative}`],
        y: [`${labels.conditionA} ${labels.positive}`, `${labels.conditionA} ${labels.negative}`],
        type: 'heatmap',
        hoverinfo: 'text',
        hovertext,
        colorscale: [
            [0, '#e3f2fd'],
            [0.35, '#90caf9'],
            [0.7, '#42a5f5'],
            [1, '#1565c0']
        ],
        colorbar: {
            title: 'Count'
        }
    };

    const maxCellValue = Math.max(...zValues.flat());
    const annotations = [];
    textValues.forEach((row, rowIndex) => {
        row.forEach((text, colIndex) => {
            const value = zValues[rowIndex][colIndex];
            const color = value >= maxCellValue * 0.45 ? '#ffffff' : '#0d1b2a';
            annotations.push({
                x: trace.x[colIndex],
                y: trace.y[rowIndex],
                text,
                font: {
                    color,
                    size: 13,
                    family: 'Segoe UI, sans-serif'
                },
                showarrow: false
            });
        });
    });

    const layout = {
        margin: { l: 80, r: 40, t: 20, b: 60 },
        annotations,
        xaxis: {
            automargin: true
        },
        yaxis: {
            automargin: true
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    Plotly.react('matrix-chart', [trace], layout, { responsive: true });

    const caption = document.getElementById('matrix-caption');
    if (caption) {
        caption.textContent = `One-sided wins: ${stats.discordantB.toLocaleString()} favor ${labels.conditionB}, ` +
            `${stats.discordantA.toLocaleString()} favor ${labels.conditionA}. Switcher share = ${formatPercent(stats.discordantShare)}.`;
    }
}

function renderStats(data, stats) {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) {
        return;
    }
    const oddsRatioEnabled = document.getElementById('show-odds-ratio')?.checked;
    const pText = stats.primary.method === 'exact'
        ? formatPValue(stats.primary.pValue)
        : `${formatPValue(stats.primary.pValue)} (${stats.primary.label})`;
    const statValue = stats.primary.method === 'exact'
        ? stats.primary.stat.toFixed(3)
        : stats.primary.stat.toFixed(3);

    let oddsBlock = '';
    if (oddsRatioEnabled) {
        const orPoint = isFinite(stats.oddsRatio.point) ? stats.oddsRatio.point.toFixed(2) : '--';
        const orLower = isFinite(stats.oddsRatio.lower) ? stats.oddsRatio.lower.toFixed(2) : '--';
        const orUpper = isFinite(stats.oddsRatio.upper) ? stats.oddsRatio.upper.toFixed(2) : '--';
        oddsBlock = `
            <div class="stat-pill">
                <h4>Odds ratio (${Math.round(selectedConfidenceLevel * 100)}% CI)</h4>
                <p>${orPoint}</p>
                <p class="helper-text">CI: [${orLower}, ${orUpper}]</p>
            </div>
        `;
    }

    statsGrid.innerHTML = `
        <div class="stat-pill">
            <h4>Switcher share</h4>
            <p>${formatPercent(stats.discordantShare)}</p>
            <p class="helper-text">${stats.discordantTotal.toLocaleString()} of ${stats.totals.total.toLocaleString()} pairs</p>
        </div>
        <div class="stat-pill">
            <h4>${stats.primary.label}</h4>
            <p>${statValue}</p>
            <p class="helper-text">${pText}</p>
        </div>
        <div class="stat-pill">
            <h4>Net shift</h4>
            <p>${stats.netDifference >= 0 ? '+' : ''}${stats.netDifference.toLocaleString()}</p>
            <p class="helper-text">${stats.netDifference >= 0 ? escapeHtml(data.labels.conditionB) : escapeHtml(data.labels.conditionA)} leads by ${formatPercent(Math.abs(stats.netShare))}</p>
        </div>
        ${oddsBlock}
    `;

    const statsExplainer = document.getElementById('stats-explainer');
    if (statsExplainer) {
        const safeA = escapeHtml(data.labels.conditionA);
        const safeB = escapeHtml(data.labels.conditionB);
        const switcherSentence = `${formatPercent(stats.discordantShare)} of the matched audience (${stats.discordantTotal.toLocaleString()} of ${stats.totals.total.toLocaleString()}) switched outcomes between ${safeA} and ${safeB}.`;
        let netSentence;
        if (stats.netDifference === 0) {
            netSentence = 'Switcher wins split evenly between the two experiences.';
        } else {
            const leader = stats.netDifference > 0 ? safeB : safeA;
            const trailer = stats.netDifference > 0 ? safeA : safeB;
            netSentence = `${leader} generated ${Math.abs(stats.netDifference).toLocaleString()} more unique wins (~${formatPercent(Math.abs(stats.netShare))}) than ${trailer}.`;
        }
        let oddsSentence = '';
        if (isFinite(stats.oddsRatio.point) && isFinite(stats.oddsRatio.lower) && isFinite(stats.oddsRatio.upper)) {
            const orPoint = stats.oddsRatio.point;
            const confidence = Math.round(selectedConfidenceLevel * 100);
            const directionSentence = orPoint === 1
                ? 'Unique wins were evenly matched between both conditions.'
                : orPoint > 1
                    ? `${safeB}-only wins were ${orPoint.toFixed(2)}x as likely as ${safeA}-only wins.`
                    : `${safeA}-only wins were ${(1 / orPoint).toFixed(2)}x as likely as ${safeB}-only wins.`;
            oddsSentence = `Odds ratio = ${orPoint.toFixed(2)} (${confidence}% CI [${stats.oddsRatio.lower.toFixed(2)}, ${stats.oddsRatio.upper.toFixed(2)}]). ${directionSentence}`;
        }
        statsExplainer.innerHTML = `
            <p>${switcherSentence}</p>
            <p>${netSentence}</p>
            ${oddsSentence ? `<p>${oddsSentence}</p>` : ''}
        `;
    }

    const methodEl = document.getElementById('metric-method');
    if (methodEl) {
        methodEl.textContent = stats.primary.label;
    }
    const statEl = document.getElementById('metric-statistic');
    if (statEl) {
        statEl.textContent = stats.primary.method === 'exact'
            ? 'Exact binomial (see p-value)'
            : stats.primary.stat.toFixed(3);
    }
    const dfRow = document.getElementById('metric-df-row');
    const dfValue = document.getElementById('metric-df');
    if (dfRow) {
        dfRow.style.display = stats.primary.method === 'exact' ? 'none' : '';
    }
    if (dfValue) {
        dfValue.textContent = stats.primary.method === 'exact' ? '—' : '1';
    }
    const pValueEl = document.getElementById('metric-pvalue');
    if (pValueEl) {
        pValueEl.textContent = formatPValue(stats.primary.pValue);
    }
    const oddsEl = document.getElementById('metric-odds');
    if (oddsEl) {
        const orPoint = isFinite(stats.oddsRatio.point) ? stats.oddsRatio.point.toFixed(2) : '--';
        const orLower = isFinite(stats.oddsRatio.lower) ? stats.oddsRatio.lower.toFixed(2) : '--';
        const orUpper = isFinite(stats.oddsRatio.upper) ? stats.oddsRatio.upper.toFixed(2) : '--';
        const ciLabel = Math.round(selectedConfidenceLevel * 100);
        oddsEl.textContent = `${orPoint} (${ciLabel}% CI [${orLower}, ${orUpper}])`;
    }
    const decisionEl = document.getElementById('metric-decision');
    if (decisionEl) {
        decisionEl.textContent = stats.significant
            ? `Reject H₀ at α = ${stats.alpha.toFixed(3)}`
            : `Fail to reject H₀ at α = ${stats.alpha.toFixed(3)}`;
    }
    const interpretationEl = document.getElementById('metric-interpretation');
    if (interpretationEl) {
        if (stats.netDifference === 0) {
            interpretationEl.textContent = 'Switcher wins split evenly between the two experiences.';
        } else {
            const leader = stats.netDifference > 0 ? escapeHtml(data.labels.conditionB) : escapeHtml(data.labels.conditionA);
            interpretationEl.textContent = `${leader} leads by ${formatPercent(Math.abs(stats.netShare))} of matched pairs.`;
        }
    }
}

function updateNarratives(data, stats) {
    const switcherEl = document.getElementById('switcher-narrative');
    const apaReport = document.getElementById('apa-report');
    const managerialReport = document.getElementById('managerial-report');
    if (!switcherEl || !apaReport || !managerialReport) {
        return;
    }
    const { labels } = data;
    const direction = stats.netDifference > 0
        ? `${escapeHtml(labels.conditionB)} gains`
        : stats.netDifference < 0
            ? `${escapeHtml(labels.conditionA)} gains`
            : 'No net change';
    const differenceText = stats.netDifference === 0
        ? 'One-sided wins are perfectly balanced.'
        : `${direction} outnumber the counterpart by ${Math.abs(stats.netDifference).toLocaleString()} pairs (${formatPercent(Math.abs(stats.netShare))}).`;
    switcherEl.innerHTML = `
        <p>${differenceText}</p>
        <p>${escapeHtml(labels.conditionA)} only wins: ${stats.discordantA.toLocaleString()} &mdash; ${escapeHtml(labels.conditionB)} only wins: ${stats.discordantB.toLocaleString()}.</p>
        <p>Switcher share sits at ${formatPercent(stats.discordantShare)}, which ${stats.discordantShare < 0.1 ? 'limits power a bit' : 'drives a precise estimate'}.</p>
    `;

    const chiDescription = stats.primary.method === 'exact'
        ? `exact binomial p-value of ${stats.primary.pValue.toFixed(3)}`
        : `${stats.primary.label} = ${stats.primary.stat.toFixed(3)}, ${formatPValue(stats.primary.pValue)}`;
    const switcherApa = `Switcher share = ${formatPercent(stats.discordantShare)} (${stats.discordantTotal}/${stats.totals.total}).`;
    let oddsApa = '';
    if (isFinite(stats.oddsRatio.point) && isFinite(stats.oddsRatio.lower) && isFinite(stats.oddsRatio.upper)) {
        const confidence = Math.round(selectedConfidenceLevel * 100);
        oddsApa = `Odds ratio = ${stats.oddsRatio.point.toFixed(2)}, ${confidence}% CI [${stats.oddsRatio.lower.toFixed(2)}, ${stats.oddsRatio.upper.toFixed(2)}].`;
    }
    const apa = `McNemar's test (${chiDescription}) ${stats.significant ? 'was significant' : 'was not significant'} at alpha = ${stats.alpha.toFixed(3)}. ${switcherApa} ${oddsApa}`.trim();
    apaReport.textContent = apa;

    const managerial = stats.significant
        ? `${escapeHtml(labels.conditionB)} shows a reliable lift versus ${escapeHtml(labels.conditionA)}, with ${formatPercent(Math.abs(stats.netShare))} of the audience shifting in its favor.`
        : `The matched test does not flag a reliable advantage; treat the observed ${direction.toLowerCase()} as directional until more switcher evidence accumulates.`;
    managerialReport.textContent = managerial;
}

function updateDiagnostics(data, stats) {
    const container = document.getElementById('diagnostics-content');
    if (!container) {
        return;
    }
    const discordant = stats.discordantTotal;
    const total = stats.totals.total;
    const discordantStatus = discordant < 10 ? 'alert' : discordant < 25 ? 'caution' : 'good';
    const discordantMessage = discordantStatus === 'alert'
        ? 'Fewer than 10 switchers makes any McNemar result unstable. Prefer the exact method and plan to collect more data.'
        : discordantStatus === 'caution'
            ? 'Switchers fall below 25. Lean on continuity corrections or exact p-values.'
            : 'Plenty of switchers keep the chi-square approximation in its comfort zone.';

    const balanceRatio = total > 0 ? Math.max(stats.totals.aPositive, stats.totals.aNegative) / Math.max(1, Math.min(stats.totals.aPositive, stats.totals.aNegative)) : NaN;
    const balanceStatus = balanceRatio > 3 ? 'caution' : 'good';
    const balanceMessage = balanceStatus === 'caution'
        ? 'One outcome dominates. Investigate sample recruitment or stratify by subsegment.'
        : 'Positive/negative outcomes stay in comparable ranges.';

    let methodStatus = 'good';
    const method = stats.primary.method;
    let methodMessage = '';
    if (method === 'exact') {
        methodMessage = 'Exact binomial doubles the smaller tail and stays reliable when switchers are scarce.';
        if (discordant >= 40) {
            methodStatus = 'caution';
            methodMessage += ' With this many switchers you can switch to chi-square for faster approximations.';
        }
    } else if (method === 'chi2_cc') {
        methodMessage = 'Continuity-corrected chi-square protects Type I error when switchers are modest.';
        if (discordant < 10) {
            methodStatus = 'alert';
            methodMessage = 'Fewer than 10 switchers makes the chi-square approximation fragile—prefer the exact binomial test.';
        } else if (discordant < 25) {
            methodStatus = 'caution';
            methodMessage = 'Switchers fall below ~25; keep the correction or move to the exact method for safety.';
        } else if (discordant >= 40) {
            methodMessage += ' With abundant switchers you could drop the correction to gain a bit more power.';
        }
    } else if (method === 'chi2_nocc') {
        methodMessage = 'Uncorrected chi-square uses the raw switcher imbalance and needs ample discordant pairs.';
        if (discordant < 25) {
            methodStatus = 'caution';
            methodMessage = 'Uncorrected chi-square expects roughly 25+ switchers. Consider the corrected or exact statistic.';
        }
    }
    if (!methodMessage) {
        methodMessage = 'Selected method aligns with the current switcher volume.';
    }

    container.innerHTML = `
        <div class="diagnostic-section">
            <p class="diagnostic-status ${discordantStatus}">Switcher volume</p>
            <ul>
                <li>${discordant.toLocaleString()} switcher pairs out of ${total.toLocaleString()} total.</li>
                <li>${discordantMessage}</li>
            </ul>
        </div>
        <div class="diagnostic-section">
            <p class="diagnostic-status ${balanceStatus}">Outcome balance</p>
            <ul>
                <li>${escapeHtml(data.labels.positive)} count: ${stats.totals.aPositive.toLocaleString()} vs ${escapeHtml(data.labels.negative)} count: ${stats.totals.aNegative.toLocaleString()}.</li>
                <li>${balanceMessage}</li>
            </ul>
        </div>
        <div class="diagnostic-section">
            <p class="diagnostic-status ${methodStatus}">Method fit</p>
            <ul>
                <li>Primary method: ${escapeHtml(stats.primary.label)}</li>
                <li>${methodMessage}</li>
            </ul>
        </div>
        <div class="diagnostic-section">
            <p class="diagnostic-status good">Independence reminder</p>
            <ul>
                <li>Each pair must represent the same person or entity measured twice. Without matched sampling McNemar's guarantee does not hold.</li>
            </ul>
        </div>
    `;
}

function updateSummaryTable(data) {
    const body = document.getElementById('summary-table-body');
    if (!body) {
        return;
    }
    const { cells, totals, labels } = data;
    const rows = [
        {
            label: `${labels.conditionA} ${labels.positive} & ${labels.conditionB} ${labels.positive}`,
            count: cells.aPosBPos,
            share: totals.total > 0 ? cells.aPosBPos / totals.total : NaN,
            note: 'Both conditions succeed together'
        },
        {
            label: `${labels.conditionA} ${labels.positive} & ${labels.conditionB} ${labels.negative}`,
            count: cells.aPosBNeg,
            share: totals.total > 0 ? cells.aPosBNeg / totals.total : NaN,
            note: `${labels.conditionA} only wins`
        },
        {
            label: `${labels.conditionA} ${labels.negative} & ${labels.conditionB} ${labels.positive}`,
            count: cells.aNegBPos,
            share: totals.total > 0 ? cells.aNegBPos / totals.total : NaN,
            note: `${labels.conditionB} only wins`
        },
        {
            label: `${labels.conditionA} ${labels.negative} & ${labels.conditionB} ${labels.negative}`,
            count: cells.aNegBNeg,
            share: totals.total > 0 ? cells.aNegBNeg / totals.total : NaN,
            note: 'Both conditions fail'
        }
    ];
    body.innerHTML = rows.map(row => `
        <tr>
            <td>${escapeHtml(row.label)}</td>
            <td>${row.count.toLocaleString()}</td>
            <td>${formatPercent(row.share)}</td>
            <td>${escapeHtml(row.note)}</td>
        </tr>
    `).join('');
}

function clearOutputs(message) {
    const statsGrid = document.getElementById('stats-grid');
    const statsExplainer = document.getElementById('stats-explainer');
    const matrixCaption = document.getElementById('matrix-caption');
    const chart = document.getElementById('matrix-chart');
    const narrative = document.getElementById('switcher-narrative');
    const apa = document.getElementById('apa-report');
    const managerial = document.getElementById('managerial-report');
    const diagnostics = document.getElementById('diagnostics-content');
    const summaryBody = document.getElementById('summary-table-body');

    if (window.Plotly && chart) {
        Plotly.purge(chart);
    }
    if (matrixCaption) {
        matrixCaption.textContent = '';
    }
    if (statsGrid) {
        statsGrid.innerHTML = `<p>${escapeHtml(message)}</p>`;
    }
    if (statsExplainer) {
        statsExplainer.textContent = '';
    }
    if (narrative) narrative.textContent = '';
    if (apa) apa.textContent = '';
    if (managerial) managerial.textContent = '';
    if (diagnostics) diagnostics.innerHTML = '<p>Enter counts to evaluate diagnostics.</p>';
    if (summaryBody) summaryBody.innerHTML = `<tr><td colspan="4">${escapeHtml(message)}</td></tr>`;
}

function updateResults() {
    const alphaInput = document.getElementById('alpha');
    const alphaValue = alphaInput ? parseFloat(alphaInput.value) : NaN;
    const alpha = isFinite(alphaValue) && alphaValue > 0 && alphaValue < 1 ? alphaValue : 0.05;
    if (alphaInput && (alphaValue < 0.001 || alphaValue >= 1)) {
        alphaInput.value = alpha.toFixed(3);
    }
    const method = document.getElementById('analysis-method')?.value || 'chi2_cc';

    const data = collectTableData();
    if (!data.valid) {
        clearOutputs(data.message);
        return;
    }

    const stats = computeMcNemarStats(data, alpha, method);
    renderMatrixChart(data, stats);
    renderStats(data, stats);
    updateNarratives(data, stats);
    updateDiagnostics(data, stats);
    updateSummaryTable(data);

    modifiedDate = new Date().toLocaleDateString();
    const modifiedLabel = document.getElementById('modified-date');
    if (modifiedLabel) {
        modifiedLabel.textContent = modifiedDate;
    }
}

function applyConfidenceSelection(level, { syncAlpha = true, skipUpdate = false } = {}) {
    if (!isFinite(level)) {
        return;
    }
    selectedConfidenceLevel = level;
    document.querySelectorAll('.conf-level-btn').forEach(button => {
        const buttonLevel = parseFloat(button.dataset.level);
        button.classList.toggle('selected', Math.abs(buttonLevel - level) < 1e-6);
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
    const buttons = document.querySelectorAll('.conf-level-btn');
    let matched = false;
    if (isFinite(alpha) && alpha > 0 && alpha < 1) {
        buttons.forEach(button => {
            const level = parseFloat(button.dataset.level);
            const expectedAlpha = +(1 - level).toFixed(3);
            const match = Math.abs(alpha - expectedAlpha) < 1e-4;
            button.classList.toggle('selected', match);
            if (match) {
                selectedConfidenceLevel = level;
                matched = true;
            }
        });
        if (!matched) {
            selectedConfidenceLevel = clamp(1 - alpha, 0.5, 0.999);
        }
    } else {
        buttons.forEach(button => button.classList.remove('selected'));
    }
    if (!skipUpdate) {
        updateResults();
    }
}

function parseSummaryUpload(text) {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('Summary file is empty.');
    }
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
        throw new Error('Summary file requires a header row and at least one data row.');
    }
    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(header => header.trim().toLowerCase());
    const values = lines[1].split(delimiter).map(value => value.trim());
    if (values.length !== headers.length) {
        throw new Error('Summary file row count does not match the header column count.');
    }
    const record = {};
    headers.forEach((header, index) => {
        record[header] = values[index];
    });
    const requiredColumns = [
        'condition_a_label',
        'condition_b_label',
        'positive_label',
        'negative_label',
        'a_positive_b_positive',
        'a_positive_b_negative',
        'a_negative_b_positive',
        'a_negative_b_negative'
    ];
    requiredColumns.forEach(column => {
        if (!Object.prototype.hasOwnProperty.call(record, column)) {
            throw new Error(`Summary file is missing the "${column}" column.`);
        }
    });
    const counts = {
        aPosBPos: parseInt(record.a_positive_b_positive, 10),
        aPosBNeg: parseInt(record.a_positive_b_negative, 10),
        aNegBPos: parseInt(record.a_negative_b_positive, 10),
        aNegBNeg: parseInt(record.a_negative_b_negative, 10)
    };
    Object.entries(counts).forEach(([key, value]) => {
        if (!Number.isInteger(value) || value < 0) {
            throw new Error(`Summary file column "${key}" must be a non-negative integer.`);
        }
    });
    const labels = {
        conditionA: record.condition_a_label || defaultLabels.conditionA,
        conditionB: record.condition_b_label || defaultLabels.conditionB,
        positive: record.positive_label || defaultLabels.positive,
        negative: record.negative_label || defaultLabels.negative
    };
    const alphaValue = parseFloat(record.alpha);
    const methodValue = record.analysis_method || '';
    return {
        labels,
        counts,
        alpha: isFinite(alphaValue) ? alphaValue : null,
        method: methodValue
    };
}

function parseRawUpload(text) {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('Raw file is empty.');
    }
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
        throw new Error('Raw file requires a header row plus at least one data row.');
    }
    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(header => header.trim());
    if (headers.length !== 2) {
        throw new Error('Raw file must contain exactly two columns (Condition A, Condition B).');
    }
    const labelA = headers[0] || defaultLabels.conditionA;
    const labelB = headers[1] || defaultLabels.conditionB;

    const rows = lines.slice(1);
    const valuesA = [];
    const valuesB = [];
    const uniqueA = new Set();
    const uniqueB = new Set();

    rows.forEach((line, index) => {
        const parts = line.split(delimiter).map(part => part.trim());
        if (parts.length !== 2) {
            throw new Error(`Row ${index + 2} must include exactly two columns.`);
        }
        const [valueA, valueB] = parts;
        if (!valueA || !valueB) {
            throw new Error(`Row ${index + 2} is missing a value for Condition A or Condition B.`);
        }
        valuesA.push(valueA);
        valuesB.push(valueB);
        uniqueA.add(valueA);
        uniqueB.add(valueB);
    });

    if (!valuesA.length) {
        throw new Error('Raw file must include at least one data row.');
    }
    if (uniqueA.size !== 2 || uniqueB.size !== 2) {
        throw new Error('Raw file must contain exactly two distinct outcomes per column.');
    }
    const categoriesA = Array.from(uniqueA);
    const categoriesB = Array.from(uniqueB);
    const categorySetA = new Set(categoriesA);
    const categorySetB = new Set(categoriesB);
    const sameCategories = categoriesB.every(value => categorySetA.has(value)) && categoriesA.every(value => categorySetB.has(value));
    if (!sameCategories) {
        throw new Error('Condition A and Condition B must share the same outcome labels.');
    }
    const [positiveValue, negativeValue] = categoriesA;
    const mapOutcome = value => {
        if (value === positiveValue) return 'positive';
        if (value === negativeValue) return 'negative';
        throw new Error(`Unexpected outcome value "${value}".`);
    };
    const counts = {
        aPosBPos: 0,
        aPosBNeg: 0,
        aNegBPos: 0,
        aNegBNeg: 0
    };
    for (let i = 0; i < valuesA.length; i++) {
        const aClass = mapOutcome(valuesA[i]);
        const bClass = mapOutcome(valuesB[i]);
        if (aClass === 'positive' && bClass === 'positive') counts.aPosBPos += 1;
        else if (aClass === 'positive' && bClass === 'negative') counts.aPosBNeg += 1;
        else if (aClass === 'negative' && bClass === 'positive') counts.aNegBPos += 1;
        else counts.aNegBNeg += 1;
    }
    return {
        labels: {
            conditionA: labelA,
            conditionB: labelB,
            positive: positiveValue,
            negative: negativeValue
        },
        counts,
        rowCount: valuesA.length
    };
}

function applySummaryDataset(dataset, { mode = DataEntryModes.SUMMARY, update = true } = {}) {
    setDataEntryMode(mode);
    setLabelInputs(dataset.labels || {});
    setCountInputs(dataset.counts || {});
    const alphaApplied = applyAlphaSetting(dataset.alpha, { skipUpdate: true });
    const methodApplied = applyMethodSetting(dataset.method);
    if (update) {
        updateResults();
    }
    return { alphaApplied, methodApplied };
}

function applyRawDataset(payload, options = {}) {
    return applySummaryDataset({
        labels: payload.labels,
        counts: payload.counts
    }, { mode: DataEntryModes.RAW, ...options });
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
            downloadTextFile('mcnemar_summary_template.csv', SUMMARY_TEMPLATE_CSV, { mimeType: 'text/csv' });
        });
    }

    if (!window.UIUtils || typeof window.UIUtils.initDropzone !== 'function') {
        setUploadStatus(statusId, 'Upload helper not available. Please refresh the page.', 'error');
        return;
    }

    const handleFile = file => {
        if (!file) return;
        setUploadStatus(statusId, `Loading ${file.name}...`, '');
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const text = event.target.result;
                const payload = parseSummaryUpload(text);
                applySummaryDataset(payload);
                setUploadStatus(statusId, `Loaded summary counts for ${payload.labels.conditionA} vs ${payload.labels.conditionB}.`, 'success');
                setUploadStatus('raw-upload-status', 'No raw file uploaded.', '');
                enableScenarioDownload(null);
            } catch (error) {
                console.error('Summary upload error:', error);
                setUploadStatus(statusId, error.message || 'Unable to parse summary file.', 'error');
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
        accept: '.csv,.tsv,.txt',
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
            downloadTextFile('mcnemar_raw_template.csv', RAW_TEMPLATE_CSV, { mimeType: 'text/csv' });
        });
    }

    if (!window.UIUtils || typeof window.UIUtils.initDropzone !== 'function') {
        setUploadStatus(statusId, 'Upload helper not available. Please refresh the page.', 'error');
        return;
    }

    const handleFile = file => {
        if (!file) return;
        setUploadStatus(statusId, `Loading ${file.name}...`, '');
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const text = event.target.result;
                const payload = parseRawUpload(text);
                applyRawDataset(payload);
                setUploadStatus(statusId, `Loaded ${payload.rowCount} paired observations.`, 'success');
                setUploadStatus('summary-upload-status', 'No summary file uploaded.', '');
                enableScenarioDownload(null);
            } catch (error) {
                console.error('Raw upload error:', error);
                setUploadStatus(statusId, error.message || 'Unable to parse raw file.', 'error');
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
        accept: '.csv,.tsv,.txt',
        onFile: handleFile,
        onError: message => {
            if (message) {
                setUploadStatus(statusId, message, 'error');
            }
        }
    });

    setUploadStatus(statusId, 'No raw file uploaded.', '');
}

function enableScenarioDownload(datasetInfo) {
    const button = document.getElementById('scenario-download');
    if (!button) return;
    if (datasetInfo) {
        activeScenarioDataset = datasetInfo;
        button.classList.remove('hidden');
        button.disabled = false;
    } else {
        activeScenarioDataset = null;
        button.classList.add('hidden');
        button.disabled = true;
    }
}

async function loadScenarioDatasetResource(entry) {
    if (!entry.dataset) {
        return { dataset: null, alphaApplied: false, methodApplied: false };
    }
    const response = await fetch(entry.dataset, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Unable to load scenario dataset (${response.status})`);
    }
    const text = await response.text();
    const filename = entry.dataset.split('/').pop() || 'scenario_dataset.csv';
    try {
        const payload = parseSummaryUpload(text);
        const result = applySummaryDataset(payload, { mode: DataEntryModes.SUMMARY, update: false });
        setUploadStatus('summary-upload-status', `Loaded summary counts for ${payload.labels.conditionA} vs ${payload.labels.conditionB}.`, 'success');
        setUploadStatus('raw-upload-status', 'No raw file uploaded.', '');
        return {
            dataset: {
                filename,
                content: text,
                mimeType: 'text/csv'
            },
            alphaApplied: result.alphaApplied,
            methodApplied: result.methodApplied
        };
    } catch (summaryError) {
        try {
            const payload = parseRawUpload(text);
            const result = applyRawDataset(payload, { update: false });
            setUploadStatus('raw-upload-status', `Loaded ${payload.rowCount} paired observations.`, 'success');
            setUploadStatus('summary-upload-status', 'No summary file uploaded.', '');
            return {
                dataset: {
                    filename,
                    content: text,
                    mimeType: 'text/csv'
                },
                alphaApplied: result.alphaApplied,
                methodApplied: result.methodApplied
            };
        } catch (rawError) {
            console.error('Scenario dataset parse error:', summaryError, rawError);
            throw new Error('Scenario dataset is not in a supported format.');
        }
    }
}

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
        alpha: null,
        counts: {},
        labels: {},
        additionalInputs: {}
    };
    let section = '';
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            return;
        }
        if (trimmed.startsWith('#')) {
            section = trimmed.replace(/^#\s*/, '').toLowerCase();
            return;
        }
        if (!section) {
            return;
        }
        if (section === 'title') {
            result.title = trimmed;
        } else if (section === 'description') {
            result.description.push(line);
        } else if (section === 'alpha') {
            const value = parseFloat(trimmed);
            if (isFinite(value)) {
                result.alpha = value;
            }
        } else if (section === 'counts') {
            const [key, valueStr] = trimmed.split('=');
            if (!key || !valueStr) return;
            const normalizedKey = key.trim().toLowerCase();
            if (!REQUIRED_COUNT_KEYS.includes(normalizedKey)) {
                return;
            }
            const value = parseInt(valueStr.trim(), 10);
            if (Number.isInteger(value) && value >= 0) {
                result.counts[normalizedKey] = value;
            }
        } else if (section === 'labels' || section === 'additional inputs') {
            const [rawKey, ...rest] = trimmed.split('=');
            const key = rawKey.trim();
            const value = rest.join('=').trim();
            if (!key || !value) return;
            if (section === 'labels') {
                result.labels[key.toLowerCase()] = value;
            } else {
                result.additionalInputs[key.toLowerCase()] = value;
            }
        }
    });
    result.description = result.description.join('\n').trim();
    return result;
}

function renderScenarioDescription(title, description) {
    const container = document.getElementById('scenario-description');
    if (!container) return;
    if (!description) {
        container.innerHTML = defaultScenarioDescription;
        return;
    }
    const paragraphs = description.split(/\n{2,}/).map(paragraph => paragraph.trim()).filter(Boolean);
    const content = paragraphs.length
        ? paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')
        : `<p>${escapeHtml(description)}</p>`;
    const heading = title ? `<p><strong>${escapeHtml(title)}</strong></p>` : '';
    container.innerHTML = `${heading}${content}`;
}

function applyScenarioData(parsed) {
    const labels = {
        conditionA: parsed.labels.condition_a || defaultLabels.conditionA,
        conditionB: parsed.labels.condition_b || defaultLabels.conditionB,
        positive: parsed.labels.positive_label || defaultLabels.positive,
        negative: parsed.labels.negative_label || defaultLabels.negative
    };
    const counts = {
        aPosBPos: parsed.counts.a_yes_b_yes ?? 0,
        aPosBNeg: parsed.counts.a_yes_b_no ?? 0,
        aNegBPos: parsed.counts.a_no_b_yes ?? 0,
        aNegBNeg: parsed.counts.a_no_b_no ?? 0
    };
    applySummaryDataset({
        labels,
        counts,
        alpha: parsed.alpha,
        method: parsed.additionalInputs.analysis_method || ''
    }, { mode: DataEntryModes.MANUAL, update: false });
}

async function loadScenarioById(id) {
    const scenario = scenarioManifest.find(entry => entry.id === id);
    if (!scenario) {
        renderScenarioDescription('', '');
        enableScenarioDownload(null);
        return;
    }
    setUploadStatus('summary-upload-status', 'No summary file uploaded.', '');
    setUploadStatus('raw-upload-status', 'No raw file uploaded.', '');
    try {
        const response = await fetch(scenario.file, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Unable to load scenario file (${response.status})`);
        }
        const text = await response.text();
        const parsed = parseScenarioText(text);
        renderScenarioDescription(parsed.title || scenario.label, parsed.description);
        let datasetInfo = null;
        let meta = { alphaApplied: false, methodApplied: false };
        if (scenario.dataset) {
            try {
                meta = await loadScenarioDatasetResource(scenario);
                if (meta.dataset) {
                    datasetInfo = meta.dataset;
                }
            } catch (datasetError) {
                console.error('Scenario dataset load error:', datasetError);
                applyScenarioData(parsed);
            }
        } else {
            applyScenarioData(parsed);
        }
        if (!meta.alphaApplied && isFinite(parsed.alpha)) {
            applyAlphaSetting(parsed.alpha, { skipUpdate: true });
        }
        if (!meta.methodApplied && parsed.additionalInputs.analysis_method) {
            applyMethodSetting(parsed.additionalInputs.analysis_method);
        }
        enableScenarioDownload(datasetInfo);
        updateResults();
    } catch (error) {
        console.error('Scenario load error:', error);
        enableScenarioDownload(null);
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
    enableScenarioDownload(null);
    select.addEventListener('change', () => {
        const { value } = select;
        if (!value) {
            renderScenarioDescription('', '');
            setUploadStatus('summary-upload-status', 'No summary file uploaded.', '');
            setUploadStatus('raw-upload-status', 'No raw file uploaded.', '');
            setDataEntryMode(DataEntryModes.MANUAL);
            enableScenarioDownload(null);
            updateResults();
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
    }
}

function attachInputListeners() {
    const inputs = document.querySelectorAll('.contingency-table input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            updateResults();
        });
    });

    const editableLabels = document.querySelectorAll('.editable-label');
    editableLabels.forEach(label => {
        label.addEventListener('input', () => updateResults());
        label.addEventListener('blur', () => updateResults());
    });

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
    }

    const methodSelect = document.getElementById('analysis-method');
    if (methodSelect) {
        methodSelect.addEventListener('change', updateResults);
    }

    const oddsCheckbox = document.getElementById('show-odds-ratio');
    if (oddsCheckbox) {
        oddsCheckbox.addEventListener('change', updateResults);
    }
}

function setupConfidenceButtons() {
    document.querySelectorAll('.conf-level-btn').forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            const level = parseFloat(button.dataset.level);
            applyConfidenceSelection(level);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const createdLabel = document.getElementById('created-date');
    const modifiedLabel = document.getElementById('modified-date');
    if (createdLabel) createdLabel.textContent = CREATED_DATE;
    if (modifiedLabel) modifiedLabel.textContent = modifiedDate;
    const scenarioContainer = document.getElementById('scenario-description');
    if (scenarioContainer) {
        defaultScenarioDescription = scenarioContainer.innerHTML;
    }

    setupConfidenceButtons();
    setupDataEntryModeToggle();
    setupSummaryUpload();
    setupRawUpload();
    setUploadStatus('summary-upload-status', 'No summary file uploaded.', '');
    setUploadStatus('raw-upload-status', 'No raw file uploaded.', '');
    attachInputListeners();
    setupScenarioSelector();
    applyConfidenceSelection(selectedConfidenceLevel, { syncAlpha: true, skipUpdate: true });
    updateResults();
});


