/**
 * Univariate Statistics Analyzer
 * Analyzes single variables (univariate) with automatic data type detection
 */

const CREATED_DATE = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const MAX_ROWS = 5000;
const MAX_CATEGORIES_DISPLAY = 10;

// Usage tracking variables
let pageLoadTime = Date.now();
let hasSuccessfulRun = false;

// Usage tracking function
function checkAndTrackUsage() {
  const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
  if (timeOnPage < 0.167) return; // 10 seconds for testing (change back to 3 for production)
  if (!hasSuccessfulRun) return;
  if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `tool-tracked-univariate-analyzer-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('univariate-analyzer', {}, `Univariate analysis completed`);
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for Univariate Analyzer');
  }
}

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
let activeChartType = 'box'; // For continuous: 'box', 'histogram', 'violin', 'density'. For categorical: 'bar', 'pie', 'horizontal'
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
        <table>
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
        </table>
    `;
    
    // Update chart type selector for continuous
    const chartSelect = document.getElementById('chart-type-select');
    if (chartSelect) {
        chartSelect.innerHTML = `
            <option value="box" ${activeChartType === 'box' ? 'selected' : ''}>Box Plot</option>
            <option value="histogram" ${activeChartType === 'histogram' ? 'selected' : ''}>Histogram</option>
            <option value="violin" ${activeChartType === 'violin' ? 'selected' : ''}>Violin Plot</option>
            <option value="density" ${activeChartType === 'density' ? 'selected' : ''}>Density Curve</option>
        `;
    }
    
    // Hide categorical controls, show continuous chart selector
    document.getElementById('categorical-extra-info').classList.add('hidden');
    
    // Populate stats explanations
    const explanationContent = document.getElementById('explanation-content');
    if (explanationContent) {
        explanationContent.innerHTML = generateStatsExplanations(DataType.CONTINUOUS);
    }
    
    // Display visualization based on selected chart type
    displayContinuousVisualization(variableName, values);
}

function displayContinuousVisualization(variableName, values) {
    const numValues = values.filter(v => v !== null).map(tryParseNumber).filter(v => v !== null);
    
    switch(activeChartType) {
        case 'box':
            displayBoxPlot(variableName, numValues);
            break;
        case 'histogram':
            displayHistogram(variableName, numValues);
            break;
        case 'violin':
            displayViolinPlot(variableName, numValues);
            break;
        case 'density':
            displayDensityPlot(variableName, numValues);
            break;
        default:
            displayBoxPlot(variableName, numValues);
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
        x: values,
        name: variableName,
        type: 'box',
        boxmean: 'sd',
        marker: { color: 'rgba(54, 162, 235, 0.7)' },
        orientation: 'h'
    };
    
    const layout = {
        title: `Box Plot: ${variableName}`,
        xaxis: { title: variableName },
        margin: { l: 100, b: 80, t: 80, r: 60 },
        height: 500
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
        margin: { l: 80, b: 80, t: 80, r: 60 },
        height: 500
    };
    
    Plotly.newPlot('chart-container', [trace], layout, { responsive: true });
}

// ==================== New Visualization Functions ====================

function displayViolinPlot(variableName, values) {
    const trace = {
        x: values,
        name: variableName,
        type: 'violin',
        box: { visible: true },
        meanline: { visible: true },
        marker: { color: 'rgba(54, 162, 235, 0.7)' },
        orientation: 'h'
    };
    
    const layout = {
        title: `Violin Plot: ${variableName}`,
        xaxis: { title: variableName },
        margin: { l: 100, b: 80, t: 80, r: 60 },
        height: 500
    };
    
    Plotly.newPlot('chart-container', [trace], layout, { responsive: true });
}

function displayDensityPlot(variableName, values) {
    // Create a kernel density estimate using Plotly's built-in density
    const trace = {
        x: values,
        type: 'histogram',
        histnorm: 'probability density',
        marker: { color: 'rgba(54, 162, 235, 0.3)', line: { color: 'rgba(54, 162, 235, 1)', width: 2 } },
        name: 'Density'
    };
    
    const layout = {
        title: `Density Plot: ${variableName}`,
        xaxis: { title: variableName },
        yaxis: { title: 'Density' },
        margin: { l: 80, b: 80, t: 80, r: 60 },
        height: 500,
        showlegend: false
    };
    
    Plotly.newPlot('chart-container', [trace], layout, { responsive: true });
}

function displayPieChart(variableName, frequencyTable) {
    const trace = {
        labels: frequencyTable.map(item => item.value),
        values: frequencyTable.map(item => item.count),
        type: 'pie',
        textinfo: 'label+percent',
        textposition: 'outside',
        marker: {
            colors: [
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 99, 132, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)',
                'rgba(255, 159, 64, 0.8)',
                'rgba(199, 199, 199, 0.8)',
                'rgba(83, 102, 255, 0.8)',
                'rgba(255, 99, 255, 0.8)',
                'rgba(99, 255, 132, 0.8)'
            ]
        }
    };
    
    const layout = {
        title: `Pie Chart: ${variableName}`,
        height: 500,
        margin: { t: 60, b: 60, l: 60, r: 60 }
    };
    
    Plotly.newPlot('chart-container', [trace], layout, { responsive: true });
}

function displayHorizontalBarChart(variableName, frequencyTable) {
    const trace = {
        y: frequencyTable.map(item => item.value),
        x: frequencyTable.map(item => item.count),
        type: 'bar',
        orientation: 'h',
        marker: { color: 'rgba(255, 159, 64, 0.7)' }
    };
    
    const layout = {
        title: `Horizontal Bar Chart: ${variableName}`,
        xaxis: { title: 'Count' },
        yaxis: { title: 'Category' },
        margin: { l: 150, b: 60 },
        height: Math.max(300, frequencyTable.length * 30)
    };
    
    Plotly.newPlot('chart-container', [trace], layout, { responsive: true });
}

// ==================== Educational Content Generators ====================

function generateStatsExplanations(type) {
    if (type === DataType.CONTINUOUS) {
        return `
            <div class="explanation-grid">
                <div class="explanation-item">
                    <strong>Mean</strong>
                    <p><strong>Technical:</strong> The arithmetic average of all values. Sum all values and divide by count.</p>
                    <p><strong>Plain English:</strong> The "typical" value. If you picked a random customer, this is close to what you'd expect.</p>
                    <p><strong>⚠️ Watch out:</strong> Outliers (extreme values) can pull the mean way up or down, making it misleading.</p>
                </div>
                
                <div class="explanation-item">
                    <strong>Median</strong>
                    <p><strong>Technical:</strong> The middle value when all values are sorted. 50% of values are below, 50% above.</p>
                    <p><strong>Plain English:</strong> The "center" value. Unlike mean, it's not affected by extreme outliers.</p>
                    <p><strong>💡 When to use:</strong> If your mean and median are very different, use median—it's more reliable with skewed data.</p>
                </div>
                
                <div class="explanation-item">
                    <strong>Standard Deviation (SD)</strong>
                    <p><strong>Technical:</strong> Measures spread around the mean. Calculated as the square root of variance.</p>
                    <p><strong>Plain English:</strong> How much variation exists. Small SD = consistent data. Large SD = widely varying data.</p>
                    <p><strong>💡 Rule of thumb:</strong> ~68% of data falls within 1 SD of mean, ~95% within 2 SD.</p>
                </div>
                
                <div class="explanation-item">
                    <strong>IQR (Interquartile Range)</strong>
                    <p><strong>Technical:</strong> Q3 - Q1. The range containing the middle 50% of data.</p>
                    <p><strong>Plain English:</strong> Where most of your "typical" values live, ignoring the extreme highs and lows.</p>
                    <p><strong>💡 Use it for:</strong> Spotting outliers. Anything beyond 1.5 × IQR from Q1 or Q3 is unusual.</p>
                </div>
                
                <div class="explanation-item">
                    <strong>Skewness</strong>
                    <p><strong>Technical:</strong> Measures asymmetry. Positive = long right tail. Negative = long left tail. Zero = symmetric.</p>
                    <p><strong>Plain English:</strong> Does your data lean one way? Positive skew = most values are low with some high outliers (like income). Negative skew = most values are high with some low outliers.</p>
                    <p><strong>💡 Interpretation:</strong> |Skew| < 0.5 = fairly symmetric. |Skew| > 1 = highly skewed.</p>
                </div>
                
                <div class="explanation-item">
                    <strong>Kurtosis</strong>
                    <p><strong>Technical:</strong> Measures "tailedness" (how much data is in tails vs. peak). Excess kurtosis compares to normal distribution.</p>
                    <p><strong>Plain English:</strong> Does your data have lots of extreme values (outliers)? High kurtosis = heavy tails, more outliers. Low kurtosis = thin tails, fewer outliers.</p>
                    <p><strong>💡 Interpretation:</strong> Kurtosis > 1 = watch for outliers. Kurtosis < -1 = very flat distribution.</p>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="explanation-grid">
                <div class="explanation-item">
                    <strong>Frequency</strong>
                    <p><strong>Technical:</strong> Count of how many times each category appears in the dataset.</p>
                    <p><strong>Plain English:</strong> How popular is each option? Higher frequency = more common.</p>
                </div>
                
                <div class="explanation-item">
                    <strong>Percentage</strong>
                    <p><strong>Technical:</strong> (Category count ÷ Total count) × 100.</p>
                    <p><strong>Plain English:</strong> What share of your total does each category represent? Makes comparisons easier than raw counts.</p>
                </div>
                
                <div class="explanation-item">
                    <strong>Mode</strong>
                    <p><strong>Technical:</strong> The category with the highest frequency.</p>
                    <p><strong>Plain English:</strong> The most common answer. Your "winning" category.</p>
                    <p><strong>💡 Marketing insight:</strong> If mode has >50%, you have a clear winner. If <30%, preferences are spread out.</p>
                </div>
                
                <div class="explanation-item">
                    <strong>Unique Values</strong>
                    <p><strong>Technical:</strong> Count of distinct categories in the variable.</p>
                    <p><strong>Plain English:</strong> How many options do customers have? High count = diverse responses. Low count = concentrated preferences.</p>
                </div>
            </div>
        `;
    }
}

function generateDynamicInterpretation(variableName, type, values) {
    if (type === DataType.CONTINUOUS) {
        const mean = getMean(values);
        const median = getMedian(values);
        const sd = getStandardDeviation(values);
        const skew = getSkewness(values);
        const kurt = getKurtosis(values);
        const iqr = getIQR(values);
        const min = getMin(values);
        const max = getMax(values);
        
        let insights = [];
        
        // Mean vs Median comparison
        if (mean !== null && median !== null) {
            const diff = Math.abs(mean - median);
            const relativeDiff = sd !== null ? diff / sd : 0;
            if (relativeDiff < 0.1) {
                insights.push(`<p><strong>Symmetry:</strong> Mean (${formatNumber(mean, 2)}) and median (${formatNumber(median, 2)}) are very close, suggesting a fairly balanced, symmetric distribution. This is good—it means the average is representative.</p>`);
            } else if (mean > median) {
                insights.push(`<p><strong>Right Skew:</strong> Mean (${formatNumber(mean, 2)}) > median (${formatNumber(median, 2)}), indicating high-value outliers are pulling the average up. The median is more reliable here. Consider: Are there a few big spenders or high performers skewing the average?</p>`);
            } else {
                insights.push(`<p><strong>Left Skew:</strong> Mean (${formatNumber(mean, 2)}) < median (${formatNumber(median, 2)}), indicating low-value outliers are pulling the average down. Consider: Are there data quality issues or a segment performing poorly?</p>`);
            }
        }
        
        // Spread interpretation
        if (sd !== null && mean !== null && mean !== 0) {
            const cv = sd / Math.abs(mean);
            if (cv < 0.15) {
                insights.push(`<p><strong>Low Variability:</strong> Standard deviation is small relative to the mean (CV = ${formatNumber(cv, 3)}). Your data is consistent—customers behave similarly. This makes predictions easier.</p>`);
            } else if (cv > 0.5) {
                insights.push(`<p><strong>High Variability:</strong> Standard deviation is large relative to the mean (CV = ${formatNumber(cv, 3)}). Your data is all over the place. Consider segmenting customers—there might be distinct groups with different behaviors.</p>`);
            } else {
                insights.push(`<p><strong>Moderate Variability:</strong> There's meaningful spread in your data (CV = ${formatNumber(cv, 3)}), but it's not chaotic. This is normal for many marketing metrics.</p>`);
            }
        }
        
        // Skewness insight
        if (skew !== null) {
            const absSkew = Math.abs(skew);
            if (absSkew > 1) {
                insights.push(`<p><strong>Strong Skew:</strong> Skewness = ${formatNumber(skew, 3)}. Your distribution is highly asymmetric. ${skew > 0 ? 'Most customers are at the low end, with a few high-value outliers.' : 'Most customers are at the high end, with a few low-value outliers.'} For analysis, consider using median instead of mean, or log-transforming your data.</p>`);
            }
        }
        
        // Kurtosis insight
        if (kurt !== null && kurt > 3) {
            insights.push(`<p><strong>Heavy Tails:</strong> Kurtosis = ${formatNumber(kurt, 3)}. Your data has more extreme values (outliers) than a normal distribution would. Investigate these outliers—they might be errors, or they might be your most valuable customers.</p>`);
        }
        
        // Range insight
        if (min !== null && max !== null && iqr !== null) {
            const range = max - min;
            const rangeToIQR = range / iqr;
            if (rangeToIQR > 5) {
                insights.push(`<p><strong>Wide Range with Outliers:</strong> Your data spans from ${formatNumber(min, 2)} to ${formatNumber(max, 2)}, but the middle 50% only covers ${formatNumber(iqr, 2)} units. This suggests extreme outliers. Use box plots to identify them.</p>`);
            }
        }
        
        return insights.length > 0 ? insights.join('') : '<p>No specific concerns detected. Your data looks reasonably well-behaved.</p>';
        
    } else {
        // Categorical interpretation
        const freqTable = getFrequencyTable(values);
        const total = values.filter(v => v !== null && v !== undefined && v !== '').length;
        const uniqueCount = freqTable.length;
        
        let insights = [];
        
        if (freqTable.length > 0) {
            const topPct = (freqTable[0].count / total) * 100;
            const topCategory = freqTable[0].value;
            
            if (topPct > 70) {
                insights.push(`<p><strong>Clear Winner:</strong> "${escapeHtml(topCategory)}" dominates at ${formatNumber(topPct, 1)}%. You have a clear market leader. Focus marketing efforts here, or investigate why other options lag.</p>`);
            } else if (topPct > 40) {
                insights.push(`<p><strong>Leading Category:</strong> "${escapeHtml(topCategory)}" leads at ${formatNumber(topPct, 1)}%, but ${uniqueCount - 1} other categories have significant share. Consider a tiered marketing strategy targeting top 2-3 categories.</p>`);
            } else {
                insights.push(`<p><strong>Distributed Preferences:</strong> No single category dominates (top category at ${formatNumber(topPct, 1)}%). Your audience is diverse. Avoid one-size-fits-all messaging—segment by preference and personalize.</p>`);
            }
            
            if (uniqueCount > 20) {
                insights.push(`<p><strong>High Diversity:</strong> ${uniqueCount} unique categories is a lot. Consider grouping into broader segments for easier analysis and action.</p>`);
            }
            
            // Check for "Other" or long tail
            const top5Share = freqTable.slice(0, 5).reduce((sum, item) => sum + item.percentage, 0);
            if (top5Share < 70 && uniqueCount > 10) {
                insights.push(`<p><strong>Long Tail Effect:</strong> Top 5 categories only account for ${formatNumber(top5Share, 1)}%. You have a long tail of niche categories. Focus on the vital few (80/20 rule) unless serving niche markets is your strategy.</p>`);
            }
        }
        
        return insights.length > 0 ? insights.join('') : '<p>Review the frequency table to identify patterns in your categorical data.</p>';
    }
}

function updateChartNarrative(variableName, type, values) {
    const narrativeEl = document.getElementById('chart-narrative');
    const interpretationEl = document.getElementById('chart-interpretation');
    
    if (!narrativeEl || !interpretationEl) return;
    
    if (!variableName || !values) {
        narrativeEl.textContent = '';
        interpretationEl.innerHTML = '';
        return;
    }
    
    let narrativeText = '';
    
    if (type === DataType.CONTINUOUS) {
        const chartType = activeChartType;
        
        if (chartType === 'box') {
            const q1 = getPercentile(values, 25);
            const median = getMedian(values);
            const q3 = getPercentile(values, 75);
            const iqr = getIQR(values);
            const mean = getMean(values);
            
            narrativeText = `<strong>Box Plot Guide:</strong> The box shows where the middle 50% of your data lives (from Q1 = ${formatNumber(q1, 2)} to Q3 = ${formatNumber(q3, 2)}). The line inside is the median (${formatNumber(median, 2)}). The diamond shows the mean (${formatNumber(mean, 2)}). Whiskers extend to show typical range. Dots beyond whiskers are outliers—unusual values that deserve investigation. <strong>Quick check:</strong> If median and mean are close, your data is balanced. If they're far apart, you have skew.`;
            
        } else if (chartType === 'histogram') {
            const mean = getMean(values);
            const sd = getStandardDeviation(values);
            const skew = getSkewness(values);
            
            narrativeText = `<strong>Histogram Guide:</strong> Each bar shows how many values fall in that range. The shape tells the story: Bell-shaped = normal (most common in nature). Skewed left/right = asymmetric (common in business with outliers). Flat = evenly distributed. Bimodal (two peaks) = you might have two distinct customer groups. <strong>Your data:</strong> Mean = ${formatNumber(mean, 2)}, SD = ${formatNumber(sd, 2)}. ${Math.abs(skew) < 0.5 ? 'Shape looks fairly symmetric.' : skew > 0 ? 'Skewed right—most values are low.' : 'Skewed left—most values are high.'}`;
            
        } else if (chartType === 'violin') {
            const median = getMedian(values);
            
            narrativeText = `<strong>Violin Plot Guide:</strong> Combines box plot + density. The width shows how many values are at each level—wider means more data points. The box in the middle shows quartiles (just like a box plot). The white dot is the median (${formatNumber(median, 2)}). <strong>Use this to:</strong> See the full distribution shape at a glance. Spot bimodal patterns (two bulges = two groups). Identify where most customers cluster.`;
            
        } else if (chartType === 'density') {
            const mean = getMean(values);
            const sd = getStandardDeviation(values);
            
            narrativeText = `<strong>Density Plot Guide:</strong> A smoothed histogram showing probability density. Peaks = where values are most common. Tails = rare values. Area under curve = 1 (100% of data). <strong>Why use this:</strong> Easier to see overall shape than histogram (no binning artifacts). Compare to normal curve mentally—does it follow bell shape? <strong>Your data:</strong> Centered around ${formatNumber(mean, 2)} with spread of ±${formatNumber(sd, 2)}.`;
        }
        
    } else {
        // Categorical narratives
        const freqTable = getFrequencyTable(values);
        const chartType = activeChartType || 'bar';
        
        if (freqTable.length > 0) {
            const topCategory = freqTable[0].value;
            const topCount = freqTable[0].count;
            const topPct = freqTable[0].percentage;
            
            if (chartType === 'bar') {
                narrativeText = `<strong>Bar Chart Guide:</strong> Each bar's height shows frequency (count). Taller = more popular. <strong>Your leader:</strong> "${escapeHtml(topCategory)}" with ${topCount} responses (${formatNumber(topPct, 1)}%). Compare heights to see relative popularity. Use this to prioritize marketing focus on top categories.`;
                
            } else if (chartType === 'pie') {
                narrativeText = `<strong>Pie Chart Guide:</strong> Each slice shows proportion of the whole. Bigger slices = larger market share. <strong>Your leader:</strong> "${escapeHtml(topCategory)}" at ${formatNumber(topPct, 1)}%. <strong>When to use:</strong> Great for showing composition (how the whole breaks down). Less useful if you have many small categories (slices get hard to read).`;
                
            } else if (chartType === 'horizontal') {
                narrativeText = `<strong>Horizontal Bar Guide:</strong> Same as vertical bars but rotated. Easier to read when category names are long. Bars are sorted by frequency (longest = most popular). <strong>Your leader:</strong> "${escapeHtml(topCategory)}" with ${topCount} responses. <strong>Pro tip:</strong> Look for natural breaks—gaps between bars suggest distinct tiers (e.g., top 3 vs. everyone else).`;
            }
        }
    }
    
    narrativeEl.innerHTML = narrativeText;
    interpretationEl.innerHTML = generateDynamicInterpretation(variableName, type, values);
}

function displayCategoricalStats(variableName, values) {
    const frequencyTable = getFrequencyTable(values);
    const displayTable = showAllCategories ? frequencyTable : getTopCategories(frequencyTable);
    
    // Display stats table
    const statsTable = document.getElementById('stats-table');
    statsTable.innerHTML = `
        <table>
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
        </table>
    `;
    
    // Update chart type selector for categorical
    const chartSelect = document.getElementById('chart-type-select');
    if (chartSelect) {
        chartSelect.innerHTML = `
            <option value="bar" ${activeChartType === 'bar' ? 'selected' : ''}>Bar Chart</option>
            <option value="pie" ${activeChartType === 'pie' ? 'selected' : ''}>Pie Chart</option>
            <option value="horizontal" ${activeChartType === 'horizontal' ? 'selected' : ''}>Horizontal Bar</option>
        `;
    }
    
    // Show categorical controls
    document.getElementById('categorical-extra-info').classList.remove('hidden');
    
    // Populate stats explanations
    const explanationContent = document.getElementById('explanation-content');
    if (explanationContent) {
        explanationContent.innerHTML = generateStatsExplanations(DataType.CATEGORICAL);
    }
    
    // Display visualization based on selected chart type
    displayCategoricalVisualization(variableName, displayTable, values);
}

function displayCategoricalVisualization(variableName, frequencyTable, originalValues) {
    switch(activeChartType) {
        case 'bar':
            displayBarChart(variableName, frequencyTable);
            break;
        case 'pie':
            displayPieChart(variableName, frequencyTable);
            break;
        case 'horizontal':
            displayHorizontalBarChart(variableName, frequencyTable);
            break;
        default:
            displayBarChart(variableName, frequencyTable);
    }
    
    updateChartNarrative(variableName, DataType.CATEGORICAL, originalValues);
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
        margin: { l: 80, b: 120, t: 80, r: 60 },
        height: 500
    };
    
    Plotly.newPlot('chart-container', [trace], layout, { responsive: true });
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
                hasSuccessfulRun = true;
                checkAndTrackUsage();
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
    
    // Chart type selector
    document.getElementById('chart-type-select').addEventListener('change', (e) => {
        activeChartType = e.target.value;
        if (activeVariable) {
            const effectiveType = manualOverrides.has(activeVariable) ? manualOverrides.get(activeVariable) : dataTypes.get(activeVariable);
            const values = uploadedData.map(row => row[activeVariable]);
            if (effectiveType === DataType.CONTINUOUS) {
                displayContinuousVisualization(activeVariable, values);
            } else {
                const frequencyTable = getFrequencyTable(values);
                const displayTable = showAllCategories ? frequencyTable : getTopCategories(frequencyTable);
                displayCategoricalVisualization(activeVariable, displayTable, values);
            }
        }
    });
    
    // Stats help toggle
    const statsHelpToggle = document.getElementById('stats-help-toggle');
    const statsExplanations = document.getElementById('stats-explanations');
    if (statsHelpToggle && statsExplanations) {
        statsHelpToggle.addEventListener('click', () => {
            statsExplanations.classList.toggle('hidden');
            const isHidden = statsExplanations.classList.contains('hidden');
            statsHelpToggle.innerHTML = isHidden 
                ? '<span class="help-icon">ℹ️</span> Explain these'
                : '<span class="help-icon">✖</span> Hide explanations';
        });
    }

    // Manual type override buttons
    document.getElementById('type-continuous-btn').addEventListener('click', () => {
        if (!activeVariable) return;
        manualOverrides.set(activeVariable, DataType.CONTINUOUS);
        activeChartType = 'box'; // Reset to default for continuous
        displayVariableStats(activeVariable);
    });

    document.getElementById('type-categorical-btn').addEventListener('click', () => {
        if (!activeVariable) return;
        manualOverrides.set(activeVariable, DataType.CATEGORICAL);
        activeChartType = 'bar'; // Reset to default for categorical
        displayVariableStats(activeVariable);
    });
    
    // Toggle show all categories
    document.getElementById('show-all-categories').addEventListener('change', (e) => {
        showAllCategories = e.target.checked;
        const effectiveType = manualOverrides.has(activeVariable) ? manualOverrides.get(activeVariable) : dataTypes.get(activeVariable);
        if (activeVariable && effectiveType === DataType.CATEGORICAL) {
            displayVariableStats(activeVariable);
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
