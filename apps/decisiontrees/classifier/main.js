/**
 * Decision Tree Classifier - Main Controller
 * Orchestrates all components and handles UI interactions
 */

// Tool identifier for tracking
const TOOL_SLUG = 'decision-tree-classifier';

// Global state
let currentScenario = null;
let currentData = null;
let currentLabels = null;
let featureNames = [];
let featureTypes = {};
let classes = [];
let trainData = null;
let testData = null;
let trainLabels = null;
let testLabels = null;
let classifier = null;
let visualizer = null;
let manualBuilder = null;
let buildMode = 'auto'; // 'auto' or 'manual'
let treeBuilt = false;

// Settings
let settings = {
    maxDepth: 3,
    minSamplesLeaf: 10,
    criterion: 'gini',
    trainSplit: 0.7
};

/**
 * Initialize the application
 */
function init() {
    // Populate scenario dropdown
    const select = document.getElementById('scenario-select');
    DECISION_TREE_SCENARIOS.forEach(scenario => {
        const option = document.createElement('option');
        option.value = scenario.id;
        option.textContent = scenario.label;
        select.appendChild(option);
    });
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize visualizer
    visualizer = new TreeVisualizer('tree-container', {
        onNodeClick: handleNodeClick
    });
    
    console.log('Decision Tree Classifier initialized');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Scenario selection
    document.getElementById('scenario-select').addEventListener('change', handleScenarioChange);
    document.getElementById('scenario-download').addEventListener('click', downloadScenarioData);
    
    // File upload
    const dropzone = document.getElementById('data-dropzone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // Outcome selection for custom data
    document.getElementById('outcome-select').addEventListener('change', handleOutcomeChange);
    
    // Build mode toggle
    document.getElementById('mode-auto').addEventListener('click', () => setBuildMode('auto'));
    document.getElementById('mode-manual').addEventListener('click', () => setBuildMode('manual'));
    
    // Settings sliders
    document.getElementById('max-depth').addEventListener('input', (e) => {
        settings.maxDepth = parseInt(e.target.value);
        document.getElementById('max-depth-val').textContent = settings.maxDepth;
    });
    
    document.getElementById('min-samples-leaf').addEventListener('input', (e) => {
        settings.minSamplesLeaf = parseInt(e.target.value);
        document.getElementById('min-samples-val').textContent = settings.minSamplesLeaf;
    });
    
    document.getElementById('split-criterion').addEventListener('change', (e) => {
        settings.criterion = e.target.value;
    });
    
    document.getElementById('train-split').addEventListener('input', (e) => {
        settings.trainSplit = parseInt(e.target.value) / 100;
        document.getElementById('train-split-val').textContent = e.target.value;
    });
    
    // Build/Reset buttons
    document.getElementById('build-btn').addEventListener('click', buildTree);
    document.getElementById('reset-btn').addEventListener('click', resetTree);
    
    // Export buttons
    document.getElementById('export-rules-btn').addEventListener('click', exportRules);
    document.getElementById('export-predictions-btn').addEventListener('click', exportPredictions);
}

/**
 * Handle scenario selection
 */
function handleScenarioChange(e) {
    const scenarioId = e.target.value;
    
    if (!scenarioId) {
        document.getElementById('scenario-description').innerHTML = `
            <p class="scenario-placeholder">
                Select a scenario above to see the business context and variables, or upload your own dataset below.
            </p>
        `;
        document.getElementById('scenario-download').disabled = true;
        document.getElementById('build-btn').disabled = true;
        currentScenario = null;
        return;
    }
    
    currentScenario = getScenarioById(scenarioId);
    
    // Update description
    document.getElementById('scenario-description').innerHTML = currentScenario.description();
    document.getElementById('scenario-download').disabled = false;
    
    // Generate data
    const rawData = generateScenarioData(scenarioId);
    loadScenarioData(rawData, currentScenario);
    
    // Enable build button
    document.getElementById('build-btn').disabled = false;
    document.getElementById('reset-btn').disabled = false;
    
    // Reset tree
    resetTree();
    
    // Hide variable assignment (not needed for preset scenarios)
    document.getElementById('variable-assignment').classList.add('hidden');
}

/**
 * Load scenario data into global state
 */
function loadScenarioData(rawData, scenario) {
    featureNames = scenario.predictors;
    featureTypes = scenario.featureTypes;
    classes = scenario.outcomeClasses;
    
    // Extract features and labels
    currentData = rawData.map(row => 
        featureNames.map(f => {
            const val = row[f];
            return featureTypes[f] === 'continuous' ? parseFloat(val) : val;
        })
    );
    
    currentLabels = rawData.map(row => row[scenario.outcomeVariable]);
    
    // Split train/test
    splitData();
}

/**
 * Split data into train/test sets
 */
function splitData() {
    const n = currentData.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    // Shuffle
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    const splitIdx = Math.floor(n * settings.trainSplit);
    const trainIndices = indices.slice(0, splitIdx);
    const testIndices = indices.slice(splitIdx);
    
    trainData = trainIndices.map(i => currentData[i]);
    trainLabels = trainIndices.map(i => currentLabels[i]);
    testData = testIndices.map(i => currentData[i]);
    testLabels = testIndices.map(i => currentLabels[i]);
}

/**
 * Handle file upload
 */
function handleFileUpload(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const parsed = parseCSV(content);
            
            if (parsed.length < 10) {
                showUploadError('File must have at least 10 rows of data.');
                return;
            }
            
            // Store raw data and show variable assignment
            window.uploadedData = parsed;
            
            // Populate outcome selector
            const outcomeSelect = document.getElementById('outcome-select');
            outcomeSelect.innerHTML = '<option value="">-- Select outcome variable --</option>';
            
            const headers = Object.keys(parsed[0]);
            headers.forEach(h => {
                const option = document.createElement('option');
                option.value = h;
                option.textContent = h;
                outcomeSelect.appendChild(option);
            });
            
            document.getElementById('variable-assignment').classList.remove('hidden');
            document.getElementById('upload-status').textContent = `Loaded ${parsed.length} rows, ${headers.length} columns.`;
            document.getElementById('upload-status').className = 'upload-status success';
            
            // Clear scenario selection
            document.getElementById('scenario-select').value = '';
            document.getElementById('scenario-description').innerHTML = `
                <p>Custom dataset loaded. Select your outcome variable below.</p>
            `;
            currentScenario = null;
            
        } catch (err) {
            showUploadError('Error parsing file: ' + err.message);
        }
    };
    
    reader.readAsText(file);
}

/**
 * Parse CSV content
 */
function parseCSV(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, i) => {
            row[h] = values[i];
        });
        return row;
    });
}

/**
 * Handle outcome variable selection
 */
function handleOutcomeChange(e) {
    const outcomeVar = e.target.value;
    if (!outcomeVar || !window.uploadedData) return;
    
    const data = window.uploadedData;
    const headers = Object.keys(data[0]);
    const predictors = headers.filter(h => h !== outcomeVar);
    
    // Detect feature types
    featureNames = predictors;
    featureTypes = {};
    
    predictors.forEach(p => {
        const values = data.map(row => row[p]);
        const uniqueValues = [...new Set(values)];
        const isNumeric = values.every(v => !isNaN(parseFloat(v)));
        featureTypes[p] = (isNumeric && uniqueValues.length > 10) ? 'continuous' : 'categorical';
    });
    
    // Get classes
    classes = [...new Set(data.map(row => row[outcomeVar]))].sort();
    
    // Extract features and labels
    currentData = data.map(row => 
        featureNames.map(f => {
            const val = row[f];
            return featureTypes[f] === 'continuous' ? parseFloat(val) : val;
        })
    );
    currentLabels = data.map(row => row[outcomeVar]);
    
    // Show predictors
    const predictorList = document.getElementById('predictor-list');
    predictorList.innerHTML = '<p style="margin-bottom: 0.5rem;"><strong>Predictors:</strong></p>';
    featureNames.forEach(f => {
        const chip = document.createElement('span');
        chip.className = 'predictor-chip';
        chip.textContent = `${f} (${featureTypes[f]})`;
        predictorList.appendChild(chip);
    });
    
    // Split data
    splitData();
    
    // Enable build
    document.getElementById('build-btn').disabled = false;
    document.getElementById('reset-btn').disabled = false;
    
    resetTree();
}

/**
 * Show upload error
 */
function showUploadError(message) {
    document.getElementById('upload-status').textContent = message;
    document.getElementById('upload-status').className = 'upload-status error';
}

/**
 * Download scenario data as CSV
 */
function downloadScenarioData() {
    if (!currentScenario) return;
    
    const data = generateScenarioData(currentScenario.id);
    const csv = dataToCSV(data);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentScenario.id}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Set build mode (auto/manual)
 */
function setBuildMode(mode) {
    buildMode = mode;
    
    document.getElementById('mode-auto').classList.toggle('active', mode === 'auto');
    document.getElementById('mode-manual').classList.toggle('active', mode === 'manual');
    
    const helpText = mode === 'auto' 
        ? 'Algorithm finds optimal splits automatically.'
        : 'Build the tree yourself by clicking nodes and choosing splits.';
    document.getElementById('mode-help').textContent = helpText;
    
    visualizer.setMode(mode);
    
    // Update button text
    document.getElementById('build-btn').textContent = mode === 'auto' ? 'Build Tree' : 'Start Building';
    
    // Reset if tree was already built
    if (treeBuilt) {
        resetTree();
    }
}

/**
 * Build the decision tree
 */
function buildTree() {
    if (!currentData || !currentLabels) {
        alert('Please load data first.');
        return;
    }
    
    // Re-split data with current settings
    splitData();
    
    if (buildMode === 'auto') {
        buildAutoTree();
    } else {
        initManualTree();
    }
    
    treeBuilt = true;
}

/**
 * Build tree automatically
 */
function buildAutoTree() {
    // Create and fit classifier
    classifier = new DecisionTreeClassifier({
        maxDepth: settings.maxDepth,
        minSamplesLeaf: settings.minSamplesLeaf,
        criterion: settings.criterion
    });
    
    classifier.fit(trainData, trainLabels, featureNames, featureTypes);
    
    // Render tree
    const treeData = classifier.exportForVisualization();
    visualizer.render(treeData);
    
    // Evaluate on test set
    const predictions = classifier.predict(testData);
    const metrics = calculateMetrics(testLabels, predictions, classes);
    
    displayMetrics(metrics);
    displayConfusionMatrix(metrics);
    displayROCOrPerClass(metrics);
    displayFeatureImportance(classifier.getFeatureImportance());
    displayInterpretation(classifier);
    
    // Enable exports
    document.getElementById('export-rules-btn').disabled = false;
    document.getElementById('export-predictions-btn').disabled = false;
}

/**
 * Initialize manual tree building
 */
function initManualTree() {
    // Initialize manual builder
    manualBuilder = new ManualTreeBuilder({
        maxDepth: settings.maxDepth,
        minSamplesLeaf: settings.minSamplesLeaf,
        criterion: settings.criterion,
        onTreeUpdate: handleManualTreeUpdate
    });
    
    const tree = manualBuilder.initialize(trainData, trainLabels, featureNames, featureTypes, classes);
    
    // Render initial tree (just root node)
    const treeData = manualBuilder.exportTree();
    visualizer.render(treeData);
    
    // Clear metrics (will update as tree is built)
    clearMetrics();
}

/**
 * Handle node click
 */
function handleNodeClick(node) {
    if (buildMode === 'manual' && !node.isLeaf && !node.split) {
        // Open editor for unsplit node
        manualBuilder.openEditor(node);
    } else if (buildMode === 'auto' || node.isLeaf || node.split) {
        // Show node details
        showNodeDetails(node);
    }
}

/**
 * Handle manual tree update
 */
function handleManualTreeUpdate(tree) {
    // Re-render tree
    const treeData = manualBuilder.exportTree();
    visualizer.render(treeData);
    
    // Evaluate current tree on test data
    evaluateManualTree(treeData);
}

/**
 * Evaluate manually built tree
 */
function evaluateManualTree(treeData) {
    // Create a temporary classifier with the manual tree
    const tempClassifier = new DecisionTreeClassifier({
        maxDepth: settings.maxDepth,
        minSamplesLeaf: settings.minSamplesLeaf,
        criterion: settings.criterion
    });
    
    tempClassifier.root = treeData.root;
    tempClassifier.classes = treeData.classes;
    tempClassifier.featureNames = treeData.featureNames;
    tempClassifier.featureTypes = treeData.featureTypes;
    
    // Only evaluate if all leaf nodes are decided
    const hasUndecidedNodes = hasUndecided(treeData.root);
    
    if (!hasUndecidedNodes) {
        const predictions = tempClassifier.predict(testData);
        const metrics = calculateMetrics(testLabels, predictions, classes);
        
        displayMetrics(metrics);
        displayConfusionMatrix(metrics);
        displayROCOrPerClass(metrics);
        displayFeatureImportance(tempClassifier.getFeatureImportance());
        displayInterpretation(tempClassifier);
        
        document.getElementById('export-rules-btn').disabled = false;
        document.getElementById('export-predictions-btn').disabled = false;
        
        // Store for exports
        classifier = tempClassifier;
    }
}

/**
 * Check if tree has undecided nodes
 */
function hasUndecided(node) {
    if (!node) return false;
    if (!node.isLeaf && !node.split) return true;
    if (node.left && hasUndecided(node.left)) return true;
    if (node.right && hasUndecided(node.right)) return true;
    return false;
}

/**
 * Show node details (for auto mode or completed nodes)
 */
function showNodeDetails(node) {
    // Could show a modal or tooltip with detailed node stats
    console.log('Node details:', node);
}

/**
 * Reset the tree
 */
function resetTree() {
    treeBuilt = false;
    classifier = null;
    manualBuilder = null;
    
    // Clear tree visualization
    document.getElementById('tree-container').innerHTML = `
        <div class="tree-placeholder">
            <p>🌱 Select a scenario and click "Build Tree" to grow your decision tree.</p>
        </div>
    `;
    
    // Clear metrics
    clearMetrics();
    
    // Disable exports
    document.getElementById('export-rules-btn').disabled = true;
    document.getElementById('export-predictions-btn').disabled = true;
}

/**
 * Clear all metrics displays
 */
function clearMetrics() {
    document.getElementById('metric-accuracy').textContent = '--';
    document.getElementById('metric-precision').textContent = '--';
    document.getElementById('metric-recall').textContent = '--';
    document.getElementById('metric-f1').textContent = '--';
    
    document.getElementById('confusion-matrix').innerHTML = '<p class="placeholder-text">Build a tree to see confusion matrix</p>';
    document.getElementById('roc-curve').innerHTML = '<p class="placeholder-text">Build a tree to see ROC curve</p>';
    document.getElementById('feature-importance').innerHTML = '<p class="placeholder-text">Build a tree to see feature importance</p>';
    document.getElementById('interpretation-content').innerHTML = '<p class="placeholder-text">Build a tree to see model interpretation...</p>';
}

/**
 * Display summary metrics
 */
function displayMetrics(metrics) {
    const formatPct = (val) => (val * 100).toFixed(1) + '%';
    
    const accEl = document.getElementById('metric-accuracy');
    accEl.textContent = formatPct(metrics.accuracy);
    accEl.className = `metric-value ${metrics.accuracy > 0.8 ? 'good' : metrics.accuracy > 0.6 ? 'moderate' : 'poor'}`;
    
    const precEl = document.getElementById('metric-precision');
    precEl.textContent = formatPct(metrics.precision);
    precEl.className = `metric-value ${metrics.precision > 0.8 ? 'good' : metrics.precision > 0.6 ? 'moderate' : 'poor'}`;
    
    const recEl = document.getElementById('metric-recall');
    recEl.textContent = formatPct(metrics.recall);
    recEl.className = `metric-value ${metrics.recall > 0.8 ? 'good' : metrics.recall > 0.6 ? 'moderate' : 'poor'}`;
    
    const f1El = document.getElementById('metric-f1');
    f1El.textContent = formatPct(metrics.f1);
    f1El.className = `metric-value ${metrics.f1 > 0.8 ? 'good' : metrics.f1 > 0.6 ? 'moderate' : 'poor'}`;
}

/**
 * Display confusion matrix
 */
function displayConfusionMatrix(metrics) {
    const container = document.getElementById('confusion-matrix');
    const matrix = metrics.confusionMatrix;
    const classes = metrics.classes;
    
    let html = '<table>';
    
    // Header row
    html += '<tr class="header-row"><th></th><th colspan="' + classes.length + '">Predicted</th></tr>';
    html += '<tr><th></th>';
    classes.forEach(cls => {
        html += `<th>${cls}</th>`;
    });
    html += '</tr>';
    
    // Data rows
    classes.forEach((actual, i) => {
        html += `<tr><td class="row-label">${i === 0 ? 'Actual: ' : ''}${actual}</td>`;
        classes.forEach(predicted => {
            const count = matrix[actual][predicted];
            const isDiagonal = actual === predicted;
            html += `<td class="${isDiagonal ? 'diagonal' : (count > 0 ? 'off-diagonal' : '')}">${count}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</table>';
    container.innerHTML = html;
}

/**
 * Display ROC curve (binary) or per-class metrics (multi-class)
 */
function displayROCOrPerClass(metrics) {
    const container = document.getElementById('roc-curve');
    const titleEl = document.getElementById('roc-panel-title');
    
    if (classes.length === 2) {
        // Binary: show ROC curve
        titleEl.textContent = 'ROC Curve';
        
        // Get probabilities
        const yProbas = classifier.predictProba(testData);
        const positiveClass = classes[1]; // Assume second class is positive
        const rocData = calculateROC(testLabels, yProbas, positiveClass);
        
        const trace = {
            x: rocData.fpr,
            y: rocData.tpr,
            type: 'scatter',
            mode: 'lines',
            name: `ROC (AUC = ${rocData.auc.toFixed(3)})`,
            line: { color: '#2563eb', width: 2 }
        };
        
        const diagonal = {
            x: [0, 1],
            y: [0, 1],
            type: 'scatter',
            mode: 'lines',
            name: 'Random',
            line: { color: '#94a3b8', width: 1, dash: 'dash' }
        };
        
        const layout = {
            xaxis: { title: 'False Positive Rate', range: [0, 1] },
            yaxis: { title: 'True Positive Rate', range: [0, 1] },
            margin: { t: 30, r: 30, b: 50, l: 50 },
            legend: { x: 0.6, y: 0.1 },
            height: 280
        };
        
        Plotly.newPlot(container, [trace, diagonal], layout, { responsive: true, displayModeBar: false });
        
    } else {
        // Multi-class: show per-class metrics table
        titleEl.textContent = 'Per-Class Metrics';
        
        let html = '<table class="per-class-metrics">';
        html += '<tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th></tr>';
        
        classes.forEach(cls => {
            const pc = metrics.perClass[cls];
            html += `<tr>
                <td>${cls}</td>
                <td>${(pc.precision * 100).toFixed(1)}%</td>
                <td>${(pc.recall * 100).toFixed(1)}%</td>
                <td>${(pc.f1 * 100).toFixed(1)}%</td>
            </tr>`;
        });
        
        html += `<tr>
            <td>Macro Avg</td>
            <td>${(metrics.precision * 100).toFixed(1)}%</td>
            <td>${(metrics.recall * 100).toFixed(1)}%</td>
            <td>${(metrics.f1 * 100).toFixed(1)}%</td>
        </tr>`;
        
        html += '</table>';
        container.innerHTML = html;
    }
}

/**
 * Display feature importance
 */
function displayFeatureImportance(importance) {
    const container = document.getElementById('feature-importance');
    
    // Sort by importance
    const sorted = Object.entries(importance).sort((a, b) => b[1] - a[1]);
    
    let html = '';
    sorted.forEach(([feature, imp]) => {
        const pct = (imp * 100).toFixed(1);
        html += `
            <div class="importance-bar-container">
                <div class="importance-label">
                    <span>${feature}</span>
                    <span>${pct}%</span>
                </div>
                <div class="importance-bar-bg">
                    <div class="importance-bar" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Display model interpretation
 */
function displayInterpretation(clf) {
    const container = document.getElementById('interpretation-content');
    const rules = clf.getRules();
    const stats = clf.getTreeStats();
    
    // Find most important rule for each class
    const bestRules = {};
    rules.forEach(rule => {
        if (!bestRules[rule.prediction] || rule.confidence > bestRules[rule.prediction].confidence) {
            bestRules[rule.prediction] = rule;
        }
    });
    
    let html = `
        <p><strong>Tree Structure:</strong> ${stats.nodeCount} nodes, ${stats.leafCount} leaves, max depth ${stats.maxDepth}</p>
        <p><strong>Key Decision Rules:</strong></p>
        <ul>
    `;
    
    for (const cls in bestRules) {
        const rule = bestRules[cls];
        html += `<li><strong>${cls}</strong> (${(rule.confidence * 100).toFixed(0)}% confidence, n=${rule.n}): ${rule.conditions}</li>`;
    }
    
    html += '</ul>';
    
    // Add interpretation tips
    html += `
        <p style="margin-top: 1rem;"><strong>💡 Interpretation Tips:</strong></p>
        <ul>
            <li>Rules with higher confidence are more reliable predictions.</li>
            <li>Features appearing higher in the tree have greater predictive power.</li>
            <li>Leaf nodes with small sample sizes may be overfitting to training data.</li>
        </ul>
    `;
    
    container.innerHTML = html;
}

/**
 * Export tree rules as text
 */
function exportRules() {
    if (!classifier) return;
    
    const rules = classifier.getRules();
    const stats = classifier.getTreeStats();
    
    let text = `Decision Tree Rules\n`;
    text += `==================\n\n`;
    text += `Tree Stats: ${stats.nodeCount} nodes, ${stats.leafCount} leaves, depth ${stats.maxDepth}\n`;
    text += `Classes: ${stats.classes.join(', ')}\n\n`;
    text += `Rules:\n`;
    text += `------\n\n`;
    
    rules.forEach((rule, i) => {
        text += `Rule ${i + 1}:\n`;
        text += `  IF ${rule.conditions}\n`;
        text += `  THEN predict ${rule.prediction}\n`;
        text += `  (Confidence: ${(rule.confidence * 100).toFixed(1)}%, n=${rule.n})\n\n`;
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decision_tree_rules.txt';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Export predictions as CSV
 */
function exportPredictions() {
    if (!classifier || !testData) return;
    
    const predictions = classifier.predict(testData);
    const probas = classifier.predictProba(testData);
    
    // Build CSV
    let csv = 'actual,predicted,confidence';
    classes.forEach(cls => {
        csv += `,prob_${cls}`;
    });
    csv += '\n';
    
    testLabels.forEach((actual, i) => {
        const pred = predictions[i];
        csv += `${actual},${pred.prediction},${pred.confidence.toFixed(3)}`;
        classes.forEach(cls => {
            csv += `,${probas[i][cls].toFixed(3)}`;
        });
        csv += '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decision_tree_predictions.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
