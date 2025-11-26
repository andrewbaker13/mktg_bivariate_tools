/**
 * Univariate Statistics Analyzer
 * Analyzes single variables (univariate) with automatic data type detection
 */

const CREATED_DATE = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const MAX_ROWS = 5000;
const MAX_CATEGORIES_DISPLAY = 10;

const SCENARIOS = Object.freeze({
    INFLUENCER: 'influencer',
    SURVEY: 'survey',
    ECOMMERCE: 'ecommerce'
});

const DataType = Object.freeze({
    CONTINUOUS: 'continuous',
    CATEGORICAL: 'categorical'
});

// State management
let uploadedData = [];
let dataHeaders = [];
let dataTypes = new Map(); // maps column name to DataType
let manualOverrides = new Map(); // maps column name to manually overridden DataType
let selectedVariables = new Set();
let activeVariable = null;
let activeVisualization = 'chart'; // 'chart' or 'alternate' (histogram or bar chart)
let showAllCategories = false;
let activeScenarioDataset = null;

// ==================== Utility Functions ====================

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatNumber(value, decimals = 3) {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) {
        return value.toExponential(decimals);
    }
    return parseFloat(value.toFixed(decimals)).toString();
}

function tryParseNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
}

// ==================== Data Type Detection ====================

function detectDataType(values) {
    /**
     * Detect if a column is continuous (numeric) or categorical
     * Continuous: values can be parsed as numbers
     * Categorical: values contain strings or contain < 50% parseable numbers
     */
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNullValues.length === 0) return DataType.CATEGORICAL; // Default to categorical for empty

    let numericCount = 0;
    nonNullValues.forEach(v => {
        const parsed = tryParseNumber(v);
        if (parsed !== null) numericCount++;
    });

    const numericRatio = numericCount / nonNullValues.length;
    return numericRatio >= 0.5 ? DataType.CONTINUOUS : DataType.CATEGORICAL;
}

// ==================== Statistical Functions ====================

function getMean(values) {
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    if (numValues.length === 0) return null;
    return numValues.reduce((a, b) => a + b, 0) / numValues.length;
}

function getMedian(values) {
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    if (numValues.length === 0) return null;
    numValues.sort((a, b) => a - b);
    const mid = Math.floor(numValues.length / 2);
    return numValues.length % 2 !== 0 ? numValues[mid] : (numValues[mid - 1] + numValues[mid]) / 2;
}

function getMode(values) {
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    if (numValues.length === 0) return null;
    
    const freq = {};
    let maxFreq = 0;
    let mode = null;
    
    numValues.forEach(v => {
        freq[v] = (freq[v] || 0) + 1;
        if (freq[v] > maxFreq) {
            maxFreq = freq[v];
            mode = v;
        }
    });
    
    return maxFreq > 1 ? mode : null; // Return mode only if it appears more than once
}

function getStandardDeviation(values) {
    const mean = getMean(values);
    if (mean === null) return null;
    
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    if (numValues.length < 2) return null;
    
    const variance = numValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (numValues.length - 1);
    return Math.sqrt(variance);
}

function getVariance(values) {
    const sd = getStandardDeviation(values);
    return sd !== null ? Math.pow(sd, 2) : null;
}

function getMin(values) {
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    return numValues.length > 0 ? Math.min(...numValues) : null;
}

function getMax(values) {
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    return numValues.length > 0 ? Math.max(...numValues) : null;
}

function getPercentile(values, percentile) {
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    if (numValues.length === 0) return null;
    
    numValues.sort((a, b) => a - b);
    const index = (percentile / 100) * (numValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) return numValues[lower];
    return numValues[lower] + (numValues[upper] - numValues[lower]) * (index - lower);
}

function getIQR(values) {
    const q1 = getPercentile(values, 25);
    const q3 = getPercentile(values, 75);
    return (q1 !== null && q3 !== null) ? q3 - q1 : null;
}

function getSkewness(values) {
    const mean = getMean(values);
    const sd = getStandardDeviation(values);
    if (mean === null || sd === null || sd === 0) return null;
    
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    if (numValues.length < 3) return null;
    
    const n = numValues.length;
    const thirdMoment = numValues.reduce((sum, v) => sum + Math.pow((v - mean) / sd, 3), 0) / n;
    return thirdMoment;
}

function getKurtosis(values) {
    const mean = getMean(values);
    const sd = getStandardDeviation(values);
    if (mean === null || sd === null || sd === 0) return null;
    
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    if (numValues.length < 4) return null;
    
    const n = numValues.length;
    const fourthMoment = numValues.reduce((sum, v) => sum + Math.pow((v - mean) / sd, 4), 0) / n;
    return fourthMoment - 3; // Excess kurtosis
}

function getRange(values) {
    const min = getMin(values);
    const max = getMax(values);
    return (min !== null && max !== null) ? max - min : null;
}

function getMissingCount(values) {
    return values.filter(v => v === null || v === undefined || v === '').length;
}

// ==================== Categorical Analysis ====================

function getFrequencyTable(values) {
    const stringValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const freq = {};
    
    stringValues.forEach(v => {
        const key = String(v);
        freq[key] = (freq[key] || 0) + 1;
    });
    
    return Object.entries(freq)
        .map(([value, count]) => ({
            value,
            count,
            percentage: (count / stringValues.length) * 100
        }))
        .sort((a, b) => b.count - a.count);
}

function getTopCategories(frequencyTable, limit = MAX_CATEGORIES_DISPLAY) {
    if (frequencyTable.length <= limit) return frequencyTable;
    
    const top = frequencyTable.slice(0, limit);
    const others = frequencyTable.slice(limit);
    const otherCount = others.reduce((sum, item) => sum + item.count, 0);
    
    return [
        ...top,
        { value: 'Other', count: otherCount, percentage: (otherCount / (frequencyTable.reduce((sum, item) => sum + item.count, 0))) * 100 }
    ];
}

// ==================== File Upload & Parsing ====================

function parseCSVContent(content) {
    /**
     * Simple CSV parser that handles mixed data types
     * Supports both comma and tab delimiters
     */
    const lines = content.trim().split(/\r?\n/).filter(line => line.trim().length);
    
    if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row.');
    }
    
    // Detect delimiter (tab or comma)
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    
    // Parse headers
    const headers = lines[0].split(delimiter).map(h => h.trim());
    
    if (headers.length < 2) {
        throw new Error('CSV must have at least 2 columns.');
    }
    
    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        
        // Skip fully empty rows
        if (values.every(v => v === '')) {
            continue;
        }
        
        // Pad or trim values to match headers
        while (values.length < headers.length) {
            values.push('');
        }
        values.splice(headers.length);
        
        // Create row object
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        
        rows.push(row);
    }
    
    if (rows.length === 0) {
        throw new Error('No data rows found in CSV.');
    }
    
    return rows;
}

function handleFileUpload(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const content = e.target.result;
        try {
            uploadedData = parseCSVContent(content);
            
            if (uploadedData.length === 0) {
                showFileMessage('Error: CSV file is empty.', 'error');
                return;
            }
            
            // Cap at MAX_ROWS
            if (uploadedData.length > MAX_ROWS) {
                showFileMessage(`Dataset has ${uploadedData.length} rows. Capping at ${MAX_ROWS} rows.`, 'warning');
                uploadedData = uploadedData.slice(0, MAX_ROWS);
            }
            
            dataHeaders = Object.keys(uploadedData[0]);
            
            // Detect data types for each column
            dataTypes.clear();
            dataHeaders.forEach(header => {
                const columnValues = uploadedData.map(row => row[header]);
                dataTypes.set(header, detectDataType(columnValues));
            });
            
            // Initialize selected variables
            selectedVariables.clear();
            dataHeaders.forEach(header => selectedVariables.add(header));
            
            // Populate variable selector
            populateVariableSelector();
            
            showFileMessage(`Successfully loaded ${uploadedData.length} rows and ${dataHeaders.length} columns.`, 'success');
            document.getElementById('variable-selector').classList.remove('hidden');
            document.getElementById('results-section').classList.add('hidden');
        } catch (error) {
            showFileMessage(`Error parsing file: ${error.message}`, 'error');
        }
    };
    
    reader.readAsText(file);
}

function showFileMessage(message, type = 'info') {
    const feedbackEl = document.getElementById('file-feedback');
    feedbackEl.textContent = message;
    feedbackEl.className = `upload-status status-${type}`;
}

// ==================== UI Population ====================

function populateVariableSelector() {
    const variableList = document.getElementById('variable-list');
    variableList.innerHTML = '';
    
    dataHeaders.forEach(header => {
        const type = dataTypes.get(header);
        const typeLabel = type === DataType.CONTINUOUS ? 'Continuous' : 'Categorical';
        const typeClass = type === DataType.CONTINUOUS ? 'continuous' : 'categorical';
        
        const item = document.createElement('div');
        item.className = 'variable-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `var-${header}`;
        checkbox.checked = true;
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedVariables.add(header);
            } else {
                selectedVariables.delete(header);
            }
            updateDataSummary();
        });
        
        const label = document.createElement('label');
        label.htmlFor = `var-${header}`;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'variable-name';
        nameSpan.textContent = header;
        
        const typeSpan = document.createElement('span');
        typeSpan.className = `variable-type-label ${typeClass}`;
        typeSpan.textContent = typeLabel;
        
        label.appendChild(nameSpan);
        label.appendChild(typeSpan);
        
        item.appendChild(checkbox);
        item.appendChild(label);
        variableList.appendChild(item);
    });
    
    updateDataSummary();
}

function updateDataSummary() {
    const summaryText = document.getElementById('data-summary-text');
    const getEffectiveType = (varName) => manualOverrides.has(varName) ? manualOverrides.get(varName) : dataTypes.get(varName);
    
    const continuousCount = Array.from(selectedVariables).filter(v => getEffectiveType(v) === DataType.CONTINUOUS).length;
    const categoricalCount = Array.from(selectedVariables).filter(v => getEffectiveType(v) === DataType.CATEGORICAL).length;
    
    summaryText.textContent = `Selected: ${selectedVariables.size} variables (${continuousCount} continuous, ${categoricalCount} categorical)`;
}

// ==================== Results Display ====================

function displayResults() {
    const resultsSection = document.getElementById('results-section');
    resultsSection.classList.remove('hidden');
    
    // Populate variable dropdown
    const dropdown = document.getElementById('variable-dropdown');
    dropdown.innerHTML = '<option value="">-- Choose a variable --</option>';
    
    Array.from(selectedVariables).forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        dropdown.appendChild(option);
    });
    
    // Set first variable as active
    if (selectedVariables.size > 0) {
        activeVariable = Array.from(selectedVariables)[0];
        dropdown.value = activeVariable;
        displayVariableStats(activeVariable);
    }
    
    // Populate summary tables
    populateSummaryTables();
}

function displayVariableStats(variableName) {
    if (!variableName || !selectedVariables.has(variableName)) return;
    
    activeVariable = variableName;
    // Check for manual override first, then use detected type
    let type = manualOverrides.has(variableName) ? manualOverrides.get(variableName) : dataTypes.get(variableName);
    const values = uploadedData.map(row => row[variableName]);
    
    // Update header
    document.getElementById('variable-title').textContent = variableName;
    const badge = document.getElementById('variable-type-badge');
    badge.textContent = type === DataType.CONTINUOUS ? 'Continuous' : 'Categorical';
    badge.className = type === DataType.CONTINUOUS ? 'badge badge-accent' : 'badge badge-warning';
    
    // Update type override buttons
    updateTypeOverrideButtons(type);
    
    // Update narratives
    updateNarratives(variableName, type, values);
    
    if (type === DataType.CONTINUOUS) {
        displayContinuousStats(variableName, values);
    } else {
        displayCategoricalStats(variableName, values);
    }
    
    // Update missing data info
    displayMissingDataInfo(values);
}

function updateTypeOverrideButtons(currentType) {
    const continuousBtn = document.getElementById('type-continuous-btn');
    const categoricalBtn = document.getElementById('type-categorical-btn');
    
    if (!continuousBtn || !categoricalBtn) return;
    
    continuousBtn.classList.remove('active');
    categoricalBtn.classList.remove('active');
    
    if (currentType === DataType.CONTINUOUS) {
        continuousBtn.classList.add('active');
    } else {
        categoricalBtn.classList.add('active');
    }
}

function displayContinuousStats(variableName, values) {
    const stats = {
        'Mean': getMean(values),
        'Median': getMedian(values),
        'Mode': getMode(values),
        'Std Dev': getStandardDeviation(values),
        'Variance': getVariance(values),
        'Range': getRange(values),
        'IQR': getIQR(values),
        'Min': getMin(values),
        'Max': getMax(values),
        'Q1 (25%)': getPercentile(values, 25),
        'Q3 (75%)': getPercentile(values, 75),
        'Skewness': getSkewness(values),
        'Kurtosis': getKurtosis(values)
    };
    
    // Display stats table
    const statsTable = document.getElementById('stats-table');
    statsTable.innerHTML = `
        <thead>
            <tr>
                <th>Statistic</th>
                <th>Value</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(stats).map(([stat, value]) => `
                <tr>
                    <td>${stat}</td>
                    <td>${value !== null ? formatNumber(value) : 'N/A'}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    // Display visualizations
    document.getElementById('viz-toggle').classList.remove('hidden');
    document.getElementById('categorical-extra-info').classList.add('hidden');
    
    const vizButtons = document.querySelectorAll('.viz-button');
    vizButtons.forEach(btn => {
        btn.textContent = btn.dataset.viz === 'chart' ? 'Box Plot' : 'Histogram';
        btn.classList.toggle('active', btn.dataset.viz === 'chart');
    });
    
    activeVisualization = 'chart';
    displayContinuousVisualization(variableName, values);
}

function displayContinuousVisualization(variableName, values) {
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    
    if (activeVisualization === 'chart') {
        displayBoxPlot(variableName, numValues);
    } else {
        displayHistogram(variableName, numValues);
    }
    
    updateChartNarrative(variableName, DataType.CONTINUOUS, values);
}

function displayBoxPlot(variableName, values) {
    const q1 = getPercentile(values, 25);
    const median = getMedian(values);
    const q3 = getPercentile(values, 75);
    const min = getMin(values);
    const max = getMax(values);
    
    const trace = {
        y: values,
        name: variableName,
        type: 'box',
        boxmean: 'sd',
        marker: { color: 'rgba(54, 162, 235, 0.7)' }
    };
    
    const layout = {
        title: `Box Plot: ${variableName}`,
        yaxis: { title: variableName },
        margin: { b: 60 },
        height: 300
    };
    
    Plotly.newPlot('chart-container', [trace], layout, { responsive: true });
}

function displayHistogram(variableName, values) {
    const trace = {
        x: values,
        type: 'histogram',
        marker: { color: 'rgba(54, 162, 235, 0.7)' }
    };
    
    const layout = {
        title: `Histogram: ${variableName}`,
        xaxis: { title: variableName },
        yaxis: { title: 'Frequency' },
        margin: { b: 60 },
        height: 300
    };
    
    Plotly.newPlot('chart-container', [trace], layout, { responsive: true });
}

function displayCategoricalStats(variableName, values) {
    const frequencyTable = getFrequencyTable(values);
    const displayTable = getTopCategories(frequencyTable);
    
    // Display stats table
    const statsTable = document.getElementById('stats-table');
    statsTable.innerHTML = `
        <thead>
            <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Percentage</th>
            </tr>
        </thead>
        <tbody>
            ${displayTable.map(item => `
                <tr>
                    <td>${escapeHtml(item.value)}</td>
                    <td>${item.count}</td>
                    <td>${formatNumber(item.percentage, 2)}%</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    // Display visualizations
    document.getElementById('viz-toggle').classList.add('hidden');
    document.getElementById('categorical-extra-info').classList.remove('hidden');
    
    displayBarChart(variableName, displayTable);
}

function displayBarChart(variableName, frequencyTable) {
    const trace = {
        x: frequencyTable.map(item => item.value),
        y: frequencyTable.map(item => item.count),
        type: 'bar',
        marker: { color: 'rgba(255, 159, 64, 0.7)' }
    };
    
    const layout = {
        title: `Bar Chart: ${variableName}`,
        xaxis: { title: 'Category' },
        yaxis: { title: 'Count' },
        margin: { b: 100 },
        height: 300
    };
    
    Plotly.newPlot('chart-container', [trace], layout, { responsive: true });
    
    // Get the original values for narrative generation
    const dataIndex = data_parsed[0].indexOf(variableName);
    const values = data_parsed.slice(1).map(row => row[dataIndex]);
    updateChartNarrative(variableName, DataType.CATEGORICAL, values);
}

function displayMissingDataInfo(values) {
    const missingCount = getMissingCount(values);
    const missingPercent = (missingCount / values.length) * 100;
    
    const infoEl = document.getElementById('missing-data-text');
    if (missingCount > 0) {
        infoEl.textContent = `Missing data: ${missingCount} values (${formatNumber(missingPercent, 2)}%)`;
    } else {
        infoEl.textContent = 'No missing data detected.';
    }
}

function populateSummaryTables() {
    // Helper to get effective type (manual override or detected)
    const getEffectiveType = (varName) => manualOverrides.has(varName) ? manualOverrides.get(varName) : dataTypes.get(varName);
    
    // Continuous variables summary
    const continuousVars = Array.from(selectedVariables).filter(v => getEffectiveType(v) === DataType.CONTINUOUS);
    const continuousRows = continuousVars.map(varName => {
        const values = uploadedData.map(row => row[varName]);
        return {
            Variable: varName,
            Mean: getMean(values),
            Median: getMedian(values),
            'Std Dev': getStandardDeviation(values),
            Min: getMin(values),
            Max: getMax(values),
            'N': values.filter(v => v !== null && v !== undefined && v !== '').length
        };
    });
    
    displaySummaryTable('continuous-table-display', continuousRows, ['Variable', 'Mean', 'Median', 'Std Dev', 'Min', 'Max', 'N']);
    
    // Categorical variables summary
    const categoricalVars = Array.from(selectedVariables).filter(v => getEffectiveType(v) === DataType.CATEGORICAL);
    const categoricalRows = categoricalVars.map(varName => {
        const values = uploadedData.map(row => row[varName]);
        const freqTable = getFrequencyTable(values);
        const mode = freqTable.length > 0 ? freqTable[0].value : 'N/A';
        return {
            Variable: varName,
            'Unique Values': freqTable.length,
            'Mode': mode,
            'Mode Count': freqTable.length > 0 ? freqTable[0].count : 0,
            'N': values.filter(v => v !== null && v !== undefined && v !== '').length
        };
    });
    
    displaySummaryTable('categorical-table-display', categoricalRows, ['Variable', 'Unique Values', 'Mode', 'Mode Count', 'N']);
}

function displaySummaryTable(containerId, data, columns) {
    const container = document.getElementById(containerId);
    
    if (data.length === 0) {
        container.innerHTML = '<p>No variables of this type selected.</p>';
        return;
    }
    
    let html = '<table><thead><tr>';
    columns.forEach(col => {
        html += `<th>${escapeHtml(col)}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            const value = row[col];
            const displayValue = typeof value === 'number' ? formatNumber(value, 2) : String(value);
            html += `<td>${escapeHtml(displayValue)}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ==================== Interpretation & Narratives ====================

function getDistributionShape(skewness, kurtosis) {
    if (skewness === null) return 'unknown';
    const skewAbsolute = Math.abs(skewness);
    if (skewAbsolute < 0.5) return 'approximately symmetric';
    if (skewness > 0) return 'positively skewed (right-tailed)';
    return 'negatively skewed (left-tailed)';
}

function getSkewnessInterpretation(skewness) {
    if (skewness === null) return 'unable to determine';
    const abs = Math.abs(skewness);
    if (abs < 0.5) return 'approximately symmetric';
    if (abs < 1.0) return 'moderately skewed';
    return 'highly skewed';
}

function getKurtosisInterpretation(kurtosis) {
    if (kurtosis === null) return 'unable to determine';
    if (kurtosis < -0.5) return 'flatter than normal (platykurtic)';
    if (kurtosis > 0.5) return 'more peaked than normal (leptokurtic)';
    return 'approximately normal';
}

function generateContinuousNarrative(variableName, values) {
    const mean = getMean(values);
    const median = getMedian(values);
    const sd = getStandardDeviation(values);
    const min = getMin(values);
    const max = getMax(values);
    const range = getRange(values);
    const iqr = getIQR(values);
    const skew = getSkewness(values);
    const kurt = getKurtosis(values);
    const missing = getMissingCount(values);
    
    if (!mean || !sd) {
        return {
            apa: 'Insufficient data for analysis.',
            managerial: 'Unable to generate summary due to missing or invalid data.'
        };
    }
    
    const n = values.filter(v => v !== null).length;
    const pctMissing = ((missing / values.length) * 100).toFixed(1);
    
    // APA Report
    const apa = `${escapeHtml(variableName)} (n = ${n}${missing > 0 ? `, ${missing} missing (${pctMissing}%)` : ''}) was approximately ${getDistributionShape(skew, kurt)}, with M = ${formatNumber(mean, 2)}, SD = ${formatNumber(sd, 2)}, Mdn = ${formatNumber(median, 2)}, range = [${formatNumber(min, 2)}, ${formatNumber(max, 2)}], IQR = ${formatNumber(iqr, 2)}. Skewness = ${formatNumber(skew, 3)} (${getSkewnessInterpretation(skew)}) and excess kurtosis = ${formatNumber(kurt, 3)} (${getKurtosisInterpretation(kurt)}).`;
    
    // Managerial Report
    const centralTendency = Math.abs(mean - median) < sd * 0.1 ? 'is tightly centered around the mean' : 'is offset from the mean';
    const spreadDesc = sd < (range / 4) ? 'concentrated' : sd < (range / 3) ? 'moderately spread' : 'widely dispersed';
    const skewComment = Math.abs(skew) < 0.5 ? 'showing balanced distribution' : skew > 0 ? 'with concentration at lower values' : 'with concentration at higher values';
    
    const managerial = `${escapeHtml(variableName)} typically clusters around ${formatNumber(mean, 1)} (SD ≈ ${formatNumber(sd, 1)}), ${centralTendency}. The data spans from ${formatNumber(min, 1)} to ${formatNumber(max, 1)}, with half of all values falling within an ${formatNumber(iqr, 1)}-unit band. This metric is ${spreadDesc} ${skewComment}. ${missing > 0 ? `Note: ${pctMissing}% of responses are missing, which may affect reliability.` : ''} Use these patterns to identify typical customer behavior, segment outliers, or detect data quality issues.`;
    
    return { apa, managerial };
}

function generateCategoricalNarrative(variableName, values) {
    const freqTable = getFrequencyTable(values);
    const missing = getMissingCount(values);
    const n = values.filter(v => v !== null && v !== undefined && v !== '').length;
    const pctMissing = ((missing / values.length) * 100).toFixed(1);
    
    if (freqTable.length === 0) {
        return {
            apa: 'No valid categorical values for analysis.',
            managerial: 'Unable to generate summary due to missing data.'
        };
    }
    
    const uniqueCount = freqTable.length;
    const topCategory = freqTable[0].value;
    const topCount = freqTable[0].count;
    const topPct = freqTable[0].percentage.toFixed(1);
    const concentration = (topCount / n) * 100;
    
    // APA Report
    const categoryList = freqTable.slice(0, 5).map(item => `${escapeHtml(item.value)} (${item.count}, ${item.percentage.toFixed(1)}%)`).join('; ');
    const apa = `${escapeHtml(variableName)} (n = ${n}${missing > 0 ? `, ${missing} missing (${pctMissing}%)` : ''}) exhibited ${uniqueCount} unique categories. The modal category was "${escapeHtml(topCategory)}" accounting for ${topPct}% of responses (n = ${topCount}). Top categories: ${categoryList}.`;
    
    // Managerial Report
    const concentrationDesc = concentration > 50 ? 'highly concentrated' : concentration > 30 ? 'moderately concentrated' : 'evenly distributed';
    const diversityDesc = uniqueCount > 10 ? 'diverse' : uniqueCount > 5 ? 'moderately diverse' : 'limited';
    const managerial = `${escapeHtml(variableName)} shows ${concentrationDesc} responses, with "${escapeHtml(topCategory)}" dominating at ${topPct}%. The total ${diversityDesc} set includes ${uniqueCount} unique values. This pattern suggests ${concentration > 50 ? 'strong customer preference for one option' : concentration > 30 ? 'clear customer lean but with secondary preferences' : 'balanced preference across options'}. ${missing > 0 ? `Note: ${pctMissing}% missing values; investigate if meaningful.` : ''} Prioritize marketing strategies around ${concentration > 40 ? `the dominant "${escapeHtml(topCategory)}" category` : `a portfolio approach across top categories`}.`;
    
    return { apa, managerial };
}

function updateNarratives(variableName, type, values) {
    const apaEl = document.getElementById('apa-report');
    const mgrEl = document.getElementById('managerial-report');
    
    if (!apaEl || !mgrEl) return;
    
    if (!variableName || !values || values.length === 0) {
        apaEl.textContent = 'Summary will appear after analysis.';
        mgrEl.textContent = 'Business-facing insights will appear after analysis.';
        return;
    }
    
    let narrative;
    if (type === DataType.CONTINUOUS) {
        narrative = generateContinuousNarrative(variableName, values);
    } else {
        narrative = generateCategoricalNarrative(variableName, values);
    }
    
    apaEl.textContent = narrative.apa;
    mgrEl.textContent = narrative.managerial;
}

function updateChartNarrative(variableName, type, values) {
    const narrativeEl = document.getElementById('chart-narrative');
    if (!narrativeEl) return;
    
    if (!variableName || !values) {
        narrativeEl.textContent = '';
        return;
    }
    
    let text = '';
    
    if (type === DataType.CONTINUOUS) {
        if (activeVisualization === 'chart') {
            // Box plot explanation
            const q1 = getPercentile(values, 25);
            const median = getMedian(values);
            const q3 = getPercentile(values, 75);
            const iqr = getIQR(values);
            const mean = getMean(values);
            
            text = `<strong>Box Plot Guide:</strong> The box represents the middle 50% of data (interquartile range). The line inside shows the median. The whiskers extend to show data spread. The dotted diamond represents the mean. In this chart: median = ${formatNumber(median, 2)}, mean = ${formatNumber(mean, 2)}, Q1 = ${formatNumber(q1, 2)}, Q3 = ${formatNumber(q3, 2)}. If data points appear as circles, they may be outliers beyond the whisker range.`;
        } else {
            // Histogram explanation
            text = `<strong>Histogram Guide:</strong> Each bar shows how many values fall in that range. Taller bars mean more data points. The shape reveals the distribution: symmetric (normal-looking), skewed left (tail on left), or skewed right (tail on right). Use this to spot patterns and whether data clusters in certain ranges or spreads evenly.`;
        }
    } else {
        // Categorical bar chart explanation
        const freqTable = getFrequencyTable(values);
        const topCategory = freqTable.length > 0 ? freqTable[0].value : 'N/A';
        const topCount = freqTable.length > 0 ? freqTable[0].count : 0;
        
        text = `<strong>Bar Chart Guide:</strong> Each bar represents a category, with height showing frequency (count). Taller bars indicate more responses in that category. This chart shows "${escapeHtml(topCategory)}" is the most frequent (${topCount} responses). Use this to identify dominant categories and compare preference distribution across all options.`;
    }
    
    narrativeEl.innerHTML = text;
}

// ==================== Event Listeners ====================

document.addEventListener('DOMContentLoaded', () => {
    // Setup scenario selector
    setupScenarioSelector();
    
    // File upload
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-files');
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--app-accent)';
        dropzone.style.backgroundColor = 'rgba(54, 162, 235, 0.1)';
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '';
        dropzone.style.backgroundColor = '';
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        dropzone.style.backgroundColor = '';
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // Variable selector buttons
    document.getElementById('select-all-btn').addEventListener('click', () => {
        dataHeaders.forEach(header => {
            document.getElementById(`var-${header}`).checked = true;
            selectedVariables.add(header);
        });
        updateDataSummary();
    });
    
    document.getElementById('deselect-all-btn').addEventListener('click', () => {
        dataHeaders.forEach(header => {
            document.getElementById(`var-${header}`).checked = false;
        });
        selectedVariables.clear();
        updateDataSummary();
    });
    
    // Display results when variables are selected
    let selectionTimeout;
    const observer = new MutationObserver(() => {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(() => {
            if (selectedVariables.size > 0 && uploadedData.length > 0) {
                displayResults();
            }
        }, 300);
    });
    
    const variableSelector = document.getElementById('variable-selector');
    observer.observe(variableSelector, { childList: true, subtree: true, attributes: true });
    
    // Variable dropdown selection
    document.getElementById('variable-dropdown').addEventListener('change', (e) => {
        if (e.target.value) {
            displayVariableStats(e.target.value);
        }
    });
    
    // Visualization toggle for continuous variables
    document.querySelectorAll('.viz-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.viz-button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeVisualization = e.target.dataset.viz;
            const effectiveType = manualOverrides.has(activeVariable) ? manualOverrides.get(activeVariable) : dataTypes.get(activeVariable);
            if (activeVariable && effectiveType === DataType.CONTINUOUS) {
                const values = uploadedData.map(row => row[activeVariable]);
                displayContinuousVisualization(activeVariable, values);
            }
        });
    });

    // Manual type override buttons
    document.getElementById('type-continuous-btn').addEventListener('click', () => {
        if (!activeVariable) return;
        manualOverrides.set(activeVariable, DataType.CONTINUOUS);
        displayVariableStats(activeVariable);
    });

    document.getElementById('type-categorical-btn').addEventListener('click', () => {
        if (!activeVariable) return;
        manualOverrides.set(activeVariable, DataType.CATEGORICAL);
        displayVariableStats(activeVariable);
    });
    
    // Toggle show all categories
    document.getElementById('show-all-categories').addEventListener('change', (e) => {
        showAllCategories = e.target.checked;
        const effectiveType = manualOverrides.has(activeVariable) ? manualOverrides.get(activeVariable) : dataTypes.get(activeVariable);
        if (activeVariable && effectiveType === DataType.CATEGORICAL) {
            const values = uploadedData.map(row => row[activeVariable]);
            const frequencyTable = getFrequencyTable(values);
            const displayTable = showAllCategories ? frequencyTable : getTopCategories(frequencyTable);
            displayBarChart(activeVariable, displayTable);
        }
    });
    
    // Summary table tabs
    document.querySelectorAll('.summary-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.summary-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.summary-table-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            const tabName = e.target.dataset.tab;
            document.getElementById(`${tabName}-summary-table`).classList.add('active');
        });
    });
    
    // Export buttons
    document.getElementById('export-continuous-btn').addEventListener('click', () => {
        exportSummaryTable('continuous');
    });
    
    document.getElementById('export-categorical-btn').addEventListener('click', () => {
        exportSummaryTable('categorical');
    });
    
    // Update timestamps
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    document.getElementById('created-date').textContent = today;
    document.getElementById('modified-date').textContent = today;
});

function exportSummaryTable(type) {
    const isContiguous = type === 'continuous';
    const getEffectiveType = (varName) => manualOverrides.has(varName) ? manualOverrides.get(varName) : dataTypes.get(varName);
    const vars = Array.from(selectedVariables).filter(v => 
        isContiguous 
            ? getEffectiveType(v) === DataType.CONTINUOUS
            : getEffectiveType(v) === DataType.CATEGORICAL
    );
    
    let csv = '';
    
    if (isContiguous) {
        csv = 'Variable,Mean,Median,Std Dev,Min,Max,N\n';
        vars.forEach(varName => {
            const values = uploadedData.map(row => row[varName]);
            const mean = getMean(values);
            const median = getMedian(values);
            const sd = getStandardDeviation(values);
            const min = getMin(values);
            const max = getMax(values);
            const n = values.filter(v => v !== null && v !== undefined && v !== '').length;
            csv += `"${varName}",${mean || ''},${median || ''},${sd || ''},${min || ''},${max || ''},${n}\n`;
        });
    } else {
        csv = 'Variable,Unique Values,Mode,Mode Count,N\n';
        vars.forEach(varName => {
            const values = uploadedData.map(row => row[varName]);
            const freqTable = getFrequencyTable(values);
            const unique = freqTable.length;
            const mode = freqTable.length > 0 ? freqTable[0].value : '';
            const modeCount = freqTable.length > 0 ? freqTable[0].count : 0;
            const n = values.filter(v => v !== null && v !== undefined && v !== '').length;
            csv += `"${varName}",${unique},"${mode}",${modeCount},${n}\n`;
        });
    }
    
    downloadCSV(csv, `${type}_summary_${CREATED_DATE.replace(/\s/g, '_')}.csv`);
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==================== Scenario Support ====================

let scenarioManifest = [];
let defaultScenarioDescription = '';

function parseScenarioText(text) {
    /**
     * Parse scenario .txt file format
     * Sections: # Title, # Description, # Raw Data File
     */
    const parsed = {
        title: '',
        description: '',
        rawDataFile: ''
    };
    
    const lines = text.split('\n');
    let currentSection = '';
    let sectionContent = [];
    
    lines.forEach(line => {
        if (line.startsWith('# ')) {
            // Save previous section
            if (currentSection === 'Title') {
                parsed.title = sectionContent.join('\n').trim();
            } else if (currentSection === 'Description') {
                parsed.description = sectionContent.join('\n').trim();
            } else if (currentSection === 'Raw Data File') {
                const match = sectionContent.join('\n').match(/file=(.+)/);
                if (match) parsed.rawDataFile = match[1].trim();
            }
            
            // Start new section
            currentSection = line.slice(2).trim();
            sectionContent = [];
        } else if (currentSection) {
            sectionContent.push(line);
        }
    });
    
    // Save last section
    if (currentSection === 'Title') {
        parsed.title = sectionContent.join('\n').trim();
    } else if (currentSection === 'Description') {
        parsed.description = sectionContent.join('\n').trim();
    } else if (currentSection === 'Raw Data File') {
        const match = sectionContent.join('\n').match(/file=(.+)/);
        if (match) parsed.rawDataFile = match[1].trim();
    }
    
    return parsed;
}

function renderScenarioDescription(title, description) {
    const descEl = document.getElementById('scenario-description');
    if (!descEl) return;
    
    let html = '';
    if (title) {
        html += `<p><strong>${escapeHtml(title)}</strong></p>`;
    }
    if (description) {
        html += description;
    }
    
    descEl.innerHTML = html || defaultScenarioDescription;
}

function resetScenarioDownload() {
    const btn = document.getElementById('scenario-download');
    if (btn) {
        btn.classList.add('hidden');
        btn.disabled = true;
        btn.onclick = null;
    }
}

function enableScenarioDownload(csvFile) {
    const btn = document.getElementById('scenario-download');
    if (btn) {
        btn.classList.remove('hidden');
        btn.disabled = false;
        btn.onclick = () => downloadScenarioDataset(csvFile);
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
        // Load scenario metadata (.txt file)
        const response = await fetch(scenario.file, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Unable to load scenario file (${response.status})`);
        }
        
        const text = await response.text();
        const parsed = parseScenarioText(text);
        
        renderScenarioDescription(parsed.title || scenario.label, parsed.description);
        enableScenarioDownload(parsed.rawDataFile);
        
        // Now load the actual CSV data
        if (parsed.rawDataFile) {
            const csvResponse = await fetch(parsed.rawDataFile, { cache: 'no-cache' });
            if (!csvResponse.ok) {
                throw new Error(`Unable to load CSV data file (${csvResponse.status})`);
            }
            
            const csvContent = await csvResponse.text();
            uploadedData = parseCSVContent(csvContent);
            
            if (uploadedData.length === 0) {
                showFileMessage('Error: CSV file is empty.', 'error');
                return;
            }
            
            // Cap at MAX_ROWS
            if (uploadedData.length > MAX_ROWS) {
                showFileMessage(`Dataset has ${uploadedData.length} rows. Capping at ${MAX_ROWS} rows.`, 'warning');
                uploadedData = uploadedData.slice(0, MAX_ROWS);
            }
            
            dataHeaders = Object.keys(uploadedData[0]);
            
            // Detect data types for each column
            dataTypes.clear();
            dataHeaders.forEach(header => {
                const columnValues = uploadedData.map(row => row[header]);
                dataTypes.set(header, detectDataType(columnValues));
            });
            
            // Initialize selected variables
            selectedVariables.clear();
            dataHeaders.forEach(header => selectedVariables.add(header));
            
            // Populate variable selector
            populateVariableSelector();
            
            showFileMessage(`Successfully loaded ${uploadedData.length} rows and ${dataHeaders.length} columns from scenario.`, 'success');
            document.getElementById('variable-selector').classList.remove('hidden');
            document.getElementById('results-section').classList.add('hidden');
        }
        
        activeScenarioDataset = id;
    } catch (error) {
        renderScenarioDescription('', `Unable to load scenario: ${error.message}`);
        resetScenarioDownload();
        showFileMessage(`Error: ${error.message}`, 'error');
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
        showFileMessage(`Error loading scenarios: ${error.message}`, 'error');
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

function downloadScenarioDataset(csvFile) {
    if (!csvFile) {
        alert('No data file configured for this scenario.');
        return;
    }
    
    fetch(csvFile)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load scenario file');
            return response.text();
        })
        .then(content => {
            const filename = csvFile.split('/').pop();
            downloadCSV(content, filename);
        })
        .catch(error => {
            alert(`Error downloading scenario: ${error.message}`);
        });
}
