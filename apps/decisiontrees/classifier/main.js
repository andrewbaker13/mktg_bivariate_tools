/**
 * Decision Tree Classifier - Main Controller
 * Orchestrates all components and handles UI interactions
 */

// Tool identifier for tracking
const TOOL_SLUG = 'decision-tree-classifier';

// --- Seeded Random Generator (Mulberry32) ---
// Allows train/test split to be deterministic if a seed is provided
class SeededRNG {
    constructor(seed) {
        if (seed === undefined || seed === null || seed === '') {
            this.seed = Math.floor(Math.random() * 2147483647);
        } else {
            // Hash string or use number
            if (typeof seed === 'string') {
                let h = 2166136261 >>> 0;
                for (let i = 0; i < seed.length; i++) {
                    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
                }
                this.seed = h >>> 0;
            } else {
                this.seed = seed >>> 0;
            }
        }
    }

    // Get a float (0 to 1)
    next() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Global PRNG instance
let prng = null;

// Global state
let currentTreeScenario = null;
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

// Expose treeBuilt globally for Professor Mode (initialize as false)
window.treeBuilt = false;

// Settings
let settings = {
    maxDepth: 3,
    minSamplesLeaf: 10,
    criterion: 'gini',
    trainSplit: 0.7,
    randomSeed: null,
    targetClass: null  // The "positive" class for metrics
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
    
    // Initialize random seed
    initializeSeed();
    
    console.log('Decision Tree Classifier initialized');
}

/**
 * Initialize the random seed
 */
function initializeSeed() {
    // Don't auto-generate - let it stay blank until build time
    const seedInput = document.getElementById('random-seed');
    settings.randomSeed = seedInput.value || null;
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
    const templateBtn = document.getElementById('template-download');
    
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
    
    // Template download
    if (templateBtn) {
        templateBtn.addEventListener('click', downloadSampleTemplate);
    }
    
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
    
    // Random seed
    const seedInput = document.getElementById('random-seed');
    
    if (seedInput) {
        seedInput.addEventListener('change', (e) => {
            settings.randomSeed = e.target.value || null;
        });
    }
    
    // Build/Reset/Finish buttons
    document.getElementById('build-btn').addEventListener('click', buildTree);
    document.getElementById('reset-btn').addEventListener('click', resetTree);
    document.getElementById('finish-building-btn').addEventListener('click', finishManualBuilding);
    
    // Target class selector
    document.getElementById('target-class-select').addEventListener('change', (e) => {
        settings.targetClass = e.target.value;
        // Recalculate metrics with new target class
        if (treeBuilt && classifier) {
            displayResults();
        }
    });
    
    // Export buttons
    document.getElementById('export-rules-btn').addEventListener('click', exportRules);
    document.getElementById('export-predictions-btn').addEventListener('click', exportPredictions);
    
    // Node details modal close handlers
    const nodeModal = document.getElementById('node-details-modal');
    const closeNodeBtn = document.getElementById('close-node-details');
    
    if (closeNodeBtn) {
        closeNodeBtn.addEventListener('click', closeNodeDetails);
    }
    
    if (nodeModal) {
        // Close modal when clicking outside
        nodeModal.addEventListener('click', (e) => {
            if (e.target === nodeModal) {
                closeNodeDetails();
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nodeModal && !nodeModal.classList.contains('hidden')) {
            closeNodeDetails();
        }
    });
}

/**
 * Download sample template CSV
 */
function downloadSampleTemplate() {
    const link = document.createElement('a');
    link.href = 'sample_template.csv';
    link.download = 'decision_tree_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        currentTreeScenario = null;
        return;
    }
    
    currentTreeScenario = getScenarioById(scenarioId);
    
    // Update description
    document.getElementById('scenario-description').innerHTML = currentTreeScenario.description();
    document.getElementById('scenario-download').disabled = false;
    
    // Load fixed CSV data for the scenario
    loadScenarioFromCSV(currentTreeScenario);
    
    // Enable build button
    document.getElementById('build-btn').disabled = false;
    document.getElementById('reset-btn').disabled = false;
    
    // Reset tree
    resetTree();
    
    // Hide variable assignment (not needed for preset scenarios)
    document.getElementById('variable-assignment').classList.add('hidden');
}

/**
 * Load scenario data from fixed CSV file
 */
async function loadScenarioFromCSV(scenario) {
    try {
        const response = await fetch(scenario.dataset);
        if (!response.ok) {
            throw new Error(`Failed to load ${scenario.dataset}`);
        }
        const csvText = await response.text();
        const rawData = parseCSV(csvText);
        
        if (rawData.length < 10) {
            throw new Error('CSV file must have at least 10 rows of data.');
        }
        
        loadScenarioData(rawData, scenario);
    } catch (error) {
        console.error('Error loading scenario CSV:', error);
        alert(`Error loading scenario data: ${error.message}\n\nPlease make sure the CSV file exists at ${scenario.dataset}`);
        // Fall back to generated data if CSV not found
        console.log('Falling back to generated data...');
        const rng = new SeededRNG(42); // Use fixed seed for fallback
        const rawData = generateScenarioData(scenario.id, rng);
        loadScenarioData(rawData, scenario);
    }
}

/**
 * Load scenario data into global state
 */
function loadScenarioData(rawData, scenario) {
    featureNames = scenario.predictors;
    featureTypes = scenario.featureTypes;
    classes = scenario.outcomeClasses;
    
    // Populate target class selector
    populateTargetClassSelector();
    
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
 * Populate the target class selector dropdown
 */
function populateTargetClassSelector() {
    const select = document.getElementById('target-class-select');
    select.innerHTML = '';
    
    classes.forEach((cls, idx) => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls;
        // Default to first class (or try to pick a sensible default like "Churned", "Yes", "1")
        if (idx === 0 || ['Churned', 'Converted', 'Yes', '1', 'True'].includes(cls)) {
            option.selected = true;
            settings.targetClass = cls;
        }
        select.appendChild(option);
    });
    
    select.disabled = false;
}

/**
 * Split data into train/test sets
 * Uses seeded RNG for reproducibility when seed is set
 */
function splitData() {
    const n = currentData.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    // Get current seed from input
    const seedInput = document.getElementById('random-seed');
    const seed = seedInput ? seedInput.value : null;
    
    // Create seeded RNG
    prng = new SeededRNG(seed);
    
    // Shuffle using seeded RNG (Fisher-Yates)
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(prng.next() * (i + 1));
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
            currentTreeScenario = null;
            
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
    
    // Detect feature types using shared utility if available, else fallback
    featureNames = predictors;
    featureTypes = {};
    
    // Store metadata for toggle capability
    window.predictorMeta = {};
    
    predictors.forEach(p => {
        const values = data.map(row => row[p]);
        const uniqueValues = [...new Set(values)];
        const isNumeric = values.every(v => v !== '' && v !== null && !isNaN(parseFloat(v)));
        
        // Store metadata
        window.predictorMeta[p] = {
            isNumeric: isNumeric,
            uniqueCount: uniqueValues.length,
            canToggle: isNumeric // Only numeric columns can toggle between types
        };
        
        // Default: numeric with >10 unique values = continuous, else categorical
        featureTypes[p] = (isNumeric && uniqueValues.length > 10) ? 'continuous' : 'categorical';
    });
    
    // Get classes
    classes = [...new Set(data.map(row => row[outcomeVar]))].sort();
    
    // Populate target class selector
    populateTargetClassSelector();
    
    // Store outcome variable
    window.selectedOutcome = outcomeVar;
    
    // Rebuild data and UI
    rebuildDataFromTypes();
    renderPredictorChips();
    
    // Split data
    splitData();
    
    // Enable build
    document.getElementById('build-btn').disabled = false;
    document.getElementById('reset-btn').disabled = false;
    
    resetTree();
}

/**
 * Rebuild currentData based on current featureTypes
 */
function rebuildDataFromTypes() {
    if (!window.uploadedData) return;
    
    currentData = window.uploadedData.map(row => 
        featureNames.map(f => {
            const val = row[f];
            return featureTypes[f] === 'continuous' ? parseFloat(val) : val;
        })
    );
    currentLabels = window.uploadedData.map(row => row[window.selectedOutcome]);
}

/**
 * Render predictor chips with toggle capability
 */
function renderPredictorChips() {
    const predictorList = document.getElementById('predictor-list');
    predictorList.innerHTML = '<p style="margin-bottom: 0.5rem;"><strong>Predictors:</strong></p>';
    
    featureNames.forEach(f => {
        const meta = window.predictorMeta[f] || {};
        const chip = document.createElement('span');
        chip.className = `predictor-chip ${meta.canToggle ? 'toggleable' : ''}`;
        chip.dataset.feature = f;
        chip.innerHTML = `${f} <span class="type-badge">${featureTypes[f]}</span>`;
        
        // Add click handler for toggleable chips
        if (meta.canToggle) {
            chip.title = 'Click to toggle between categorical and continuous';
            chip.addEventListener('click', () => toggleFeatureType(f));
        }
        
        predictorList.appendChild(chip);
    });
}

/**
 * Toggle a feature between categorical and continuous
 */
function toggleFeatureType(featureName) {
    const meta = window.predictorMeta[featureName];
    if (!meta || !meta.canToggle) return;
    
    // Toggle type
    featureTypes[featureName] = featureTypes[featureName] === 'continuous' ? 'categorical' : 'continuous';
    
    // Rebuild data with new types
    rebuildDataFromTypes();
    
    // Re-render chips
    renderPredictorChips();
    
    // Re-split data
    splitData();
    
    // Reset tree if already built
    if (treeBuilt) {
        resetTree();
    }
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
    if (!currentTreeScenario || !currentData) return;
    
    // Reconstruct the full dataset from current data and labels
    const data = currentData.map((row, idx) => {
        const obj = {};
        featureNames.forEach((name, i) => {
            obj[name] = row[i];
        });
        obj[currentTreeScenario.outcomeVariable] = currentLabels[idx];
        return obj;
    });
    
    const csv = dataToCSV(data);
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTreeScenario.id}_data.csv`;
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
    window.treeBuilt = true;  // Expose for Professor Mode
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
    
    // Display all results
    displayResults();
    
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
    
    // Show manual mode UI elements
    document.getElementById('finish-building-btn').classList.remove('hidden');
    document.getElementById('manual-mode-instructions').classList.remove('hidden');
    
    // Clear metrics (will update as tree is built)
    clearMetrics();
}

/**
 * Finish manual tree building - mark all undecided nodes as leaves and evaluate
 */
function finishManualBuilding() {
    if (!manualBuilder) return;
    
    // Mark all undecided nodes as leaves
    manualBuilder.finalizeTree();
    
    // Create a classifier-like object from manual tree for evaluation
    const treeData = manualBuilder.exportTree();
    
    // Create temporary classifier with manual tree structure
    classifier = {
        root: treeData.root,
        classes: treeData.classes,
        featureNames: featureNames,
        featureTypes: featureTypes,
        predict: function(data) {
            return data.map(row => this.predictOne(row));
        },
        predictOne: function(row) {
            let node = this.root;
            while (node && !node.isLeaf && node.left && node.right && node.split) {
                const featureIdx = this.featureNames.indexOf(node.split.feature);
                const value = row[featureIdx];
                
                if (node.split.type === 'continuous') {
                    node = value <= node.split.threshold ? node.left : node.right;
                } else {
                    node = node.split.leftCategories.includes(value) ? node.left : node.right;
                }
            }
            // Return object matching auto classifier format
            return {
                prediction: node ? node.prediction : treeData.classes[0],
                confidence: node ? node.confidence : 0,
                distribution: node ? node.distribution : {},
                nodeId: node ? node.id : 'root'
            };
        },
        predictProba: function(data) {
            return data.map(row => this.predictProbaOne(row));
        },
        predictProbaOne: function(row) {
            let node = this.root;
            while (node && !node.isLeaf && node.left && node.right && node.split) {
                const featureIdx = this.featureNames.indexOf(node.split.feature);
                const value = row[featureIdx];
                
                if (node.split.type === 'continuous') {
                    node = value <= node.split.threshold ? node.left : node.right;
                } else {
                    node = node.split.leftCategories.includes(value) ? node.left : node.right;
                }
            }
            // Return probability distribution from node
            const proba = {};
            this.classes.forEach(cls => {
                proba[cls] = node ? (node.distribution[cls] || 0) / node.n : 1 / this.classes.length;
            });
            return proba;
        },
        getFeatureImportance: function() {
            // Calculate simple feature importance based on splits used
            const importance = {};
            featureNames.forEach(f => importance[f] = 0);
            
            const countSplits = (node) => {
                if (!node || node.isLeaf || !node.split) return;
                importance[node.split.feature] += node.n;
                countSplits(node.left);
                countSplits(node.right);
            };
            countSplits(this.root);
            
            // Normalize
            const total = Object.values(importance).reduce((a, b) => a + b, 0);
            if (total > 0) {
                for (const f in importance) importance[f] /= total;
            }
            return importance;
        },
        getRules: function(node = this.root, path = []) {
            const rules = [];
            
            if (!node) return rules;
            
            if (node.isLeaf || !node.split) {
                const conditions = path.length > 0 ? path.join(' AND ') : 'Always';
                rules.push({
                    conditions: conditions,
                    prediction: node.prediction,
                    confidence: node.confidence,
                    n: node.n
                });
                return rules;
            }
            
            // Left branch
            let leftCondition;
            if (node.split.type === 'continuous') {
                leftCondition = `${node.split.feature} ≤ ${node.split.threshold.toFixed(2)}`;
            } else {
                leftCondition = `${node.split.feature} ∈ {${node.split.leftCategories.join(', ')}}`;
            }
            if (node.left) {
                rules.push(...this.getRules(node.left, [...path, leftCondition]));
            }
            
            // Right branch
            let rightCondition;
            if (node.split.type === 'continuous') {
                rightCondition = `${node.split.feature} > ${node.split.threshold.toFixed(2)}`;
            } else {
                rightCondition = `${node.split.feature} ∈ {${node.split.rightCategories.join(', ')}}`;
            }
            if (node.right) {
                rules.push(...this.getRules(node.right, [...path, rightCondition]));
            }
            
            return rules;
        },
        getTreeStats: function() {
            let nodeCount = 0;
            let leafCount = 0;
            let maxDepth = 0;
            
            const traverse = (node) => {
                if (!node) return;
                nodeCount++;
                maxDepth = Math.max(maxDepth, node.depth || 0);
                
                if (node.isLeaf || !node.split) {
                    leafCount++;
                } else {
                    traverse(node.left);
                    traverse(node.right);
                }
            };
            
            traverse(this.root);
            
            return {
                nodeCount,
                leafCount,
                maxDepth,
                classes: this.classes,
                features: this.featureNames
            };
        },
        exportRules: function() {
            const rules = [];
            const traverse = (node, conditions) => {
                if (!node) return;
                if (node.isLeaf || (!node.left && !node.right)) {
                    rules.push({
                        conditions: [...conditions],
                        prediction: node.prediction,
                        confidence: node.confidence,
                        samples: node.n
                    });
                    return;
                }
                if (node.left && node.split) {
                    const leftCond = node.split.type === 'continuous'
                        ? `${node.split.feature} <= ${node.split.threshold.toFixed(2)}`
                        : `${node.split.feature} in [${node.split.leftCategories.join(', ')}]`;
                    traverse(node.left, [...conditions, leftCond]);
                }
                if (node.right && node.split) {
                    const rightCond = node.split.type === 'continuous'
                        ? `${node.split.feature} > ${node.split.threshold.toFixed(2)}`
                        : `${node.split.feature} in [${node.split.rightCategories.join(', ')}]`;
                    traverse(node.right, [...conditions, rightCond]);
                }
            };
            traverse(this.root, []);
            return rules;
        }
    };
    
    // Re-render final tree
    visualizer.render(treeData);
    
    // Evaluate on test set
    displayResults();
    
    // Hide manual mode UI elements
    document.getElementById('finish-building-btn').classList.add('hidden');
    document.getElementById('manual-mode-instructions').classList.add('hidden');
    
    // Enable exports
    document.getElementById('export-rules-btn').disabled = false;
    document.getElementById('export-predictions-btn').disabled = false;
}

/**
 * Display all results (metrics, confusion matrix, ROC, etc.)
 */
function displayResults() {
    if (!classifier || !testData || !testLabels) return;
    
    const predictions = classifier.predict(testData);
    const metrics = calculateMetrics(testLabels, predictions, classes, settings.targetClass);
    const importance = classifier.getFeatureImportance();
    
    // Compute train accuracy for overfitting comparison
    const trainPredictions = classifier.predict(trainData);
    const trainMetrics = calculateMetrics(trainLabels, trainPredictions, classes, settings.targetClass);
    
    // Convert importance object to sorted array
    const importanceArray = Object.entries(importance).map(([feature, imp]) => ({
        feature: feature,
        importance: imp
    })).sort((a, b) => b.importance - a.importance);
    
    displayMetrics(metrics, trainMetrics);
    displayConfusionMatrix(metrics);
    displayROCOrPerClass(metrics);
    displayFeatureImportance(importance);
    displayInterpretation(classifier);
    
    // Expose state for Professor Mode dynamic quizzes
    const treeData = classifier.exportForVisualization ? classifier.exportForVisualization() : { root: classifier.root };
    const rootNode = treeData.root;
    
    window.lastTreeState = {
        // Test metrics (what's displayed)
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1: metrics.f1,
        confusionMatrix: metrics.confusionMatrix,
        
        // Train metrics (for overfitting comparison)
        trainAccuracy: trainMetrics.accuracy,
        trainPrecision: trainMetrics.precision,
        trainRecall: trainMetrics.recall,
        trainF1: trainMetrics.f1,
        
        // Tree structure info
        rootFeature: rootNode?.split?.feature || null,
        rootThreshold: rootNode?.split?.threshold || null,
        rootType: rootNode?.split?.type || null,
        maxDepth: settings.maxDepth,
        minSamplesLeaf: settings.minSamplesLeaf,
        criterion: settings.criterion,
        
        // Feature importance (already sorted as array)
        importances: importanceArray,
        
        // Classes and target
        classes: classes,
        targetClass: settings.targetClass,
        
        // Sample sizes
        trainSize: trainData.length,
        testSize: testData.length
    };
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
        const importance = tempClassifier.getFeatureImportance();
        
        // Compute train metrics
        const trainPredictions = tempClassifier.predict(trainData);
        const trainMetrics = calculateMetrics(trainLabels, trainPredictions, classes, settings.targetClass);
        
        // Convert importance object to sorted array
        const importanceArray = Object.entries(importance).map(([feature, imp]) => ({
            feature: feature,
            importance: imp
        })).sort((a, b) => b.importance - a.importance);
        
        displayMetrics(metrics, trainMetrics);
        displayConfusionMatrix(metrics);
        displayROCOrPerClass(metrics);
        displayFeatureImportance(importance);
        displayInterpretation(tempClassifier);
        
        document.getElementById('export-rules-btn').disabled = false;
        document.getElementById('export-predictions-btn').disabled = false;
        
        // Store for exports
        classifier = tempClassifier;
        
        // Expose state for Professor Mode dynamic quizzes (manual mode)
        const rootNode = treeData.root;
        
        window.lastTreeState = {
            accuracy: metrics.accuracy,
            precision: metrics.precision,
            recall: metrics.recall,
            f1: metrics.f1,
            confusionMatrix: metrics.confusionMatrix,
            trainAccuracy: trainMetrics.accuracy,
            trainPrecision: trainMetrics.precision,
            trainRecall: trainMetrics.recall,
            trainF1: trainMetrics.f1,
            rootFeature: rootNode?.split?.feature || null,
            rootThreshold: rootNode?.split?.threshold || null,
            rootType: rootNode?.split?.type || null,
            maxDepth: settings.maxDepth,
            minSamplesLeaf: settings.minSamplesLeaf,
            criterion: settings.criterion,
            importances: importanceArray,
            classes: classes,
            targetClass: settings.targetClass,
            trainSize: trainData.length,
            testSize: testData.length
        };
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
    const modal = document.getElementById('node-details-modal');
    const content = document.getElementById('node-details-content');
    const title = document.getElementById('node-details-title');
    
    // Determine node type
    const isLeaf = node.isLeaf || (!node.left && !node.right);
    title.textContent = isLeaf ? '🍃 Leaf Node' : '🔀 Split Node';
    
    // Build compact content
    let html = '';
    
    // Samples count
    const pctOfData = trainData ? ((node.n / trainData.length) * 100).toFixed(1) : '100';
    html += `<div class="node-detail-row"><span class="detail-label">Samples:</span> <strong>${node.n.toLocaleString()}</strong> (${pctOfData}% of data)</div>`;
    
    // Split rule (for decision nodes)
    if (node.split && !isLeaf) {
        let ruleText = '';
        if (node.split.type === 'continuous') {
            ruleText = `${node.split.feature} ≤ ${node.split.threshold.toFixed(2)}`;
        } else {
            ruleText = `${node.split.feature} ∈ {${node.split.leftCategories.join(', ')}}`;
        }
        html += `<div class="node-detail-row"><span class="detail-label">Split:</span> ${ruleText}</div>`;
    }
    
    // Prediction with confidence
    html += `<div class="node-detail-row"><span class="detail-label">${isLeaf ? 'Prediction:' : 'Majority:'}</span> <span class="node-prediction-badge ${isLeaf ? 'leaf' : 'split'}">${node.prediction}</span> <span class="confidence-text">(${(node.confidence * 100).toFixed(1)}%)</span></div>`;
    
    // Impurity
    if (node.impurity !== undefined) {
        html += `<div class="node-detail-row"><span class="detail-label">Gini:</span> ${node.impurity.toFixed(4)}</div>`;
    }
    
    // Depth
    html += `<div class="node-detail-row"><span class="detail-label">Depth:</span> Level ${node.depth !== undefined ? node.depth : 0}</div>`;
    
    // Class distribution - compact inline
    html += `<div class="node-detail-section" style="margin-top: 0.75rem;"><span class="detail-label">Distribution:</span></div>`;
    
    // Visual distribution bar only
    const colors = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#a855f7'];
    html += '<div class="distribution-bar-container" style="margin-top: 0.5rem;">';
    let colorIdx = 0;
    for (const cls in node.distribution) {
        const count = node.distribution[cls];
        const pct = (count / node.n) * 100;
        if (pct > 0) {
            html += `<div class="distribution-bar-segment" style="width: ${pct}%; background: ${colors[colorIdx % colors.length]};" title="${cls}: ${count} (${pct.toFixed(1)}%)">${pct >= 15 ? cls : ''}</div>`;
        }
        colorIdx++;
    }
    html += '</div>';
    
    // Legend
    html += '<div class="distribution-legend">';
    colorIdx = 0;
    for (const cls in node.distribution) {
        const count = node.distribution[cls];
        const pct = ((count / node.n) * 100).toFixed(1);
        html += `<span class="legend-item"><span class="legend-dot" style="background: ${colors[colorIdx % colors.length]};"></span>${cls}: ${pct}%</span>`;
        colorIdx++;
    }
    html += '</div>';
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

/**
 * Close node details modal
 */
function closeNodeDetails() {
    document.getElementById('node-details-modal').classList.add('hidden');
}

/**
 * Reset the tree
 */
function resetTree() {
    treeBuilt = false;
    window.treeBuilt = false;
    classifier = null;
    manualBuilder = null;
    
    // Clear tree visualization
    document.getElementById('tree-container').innerHTML = `
        <div class="tree-placeholder">
            <p>🌱 Select a scenario and click "Build Tree" to grow your decision tree.</p>
        </div>
    `;
    
    // Hide manual mode UI elements
    document.getElementById('finish-building-btn').classList.add('hidden');
    document.getElementById('manual-mode-instructions').classList.add('hidden');
    
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
function displayMetrics(metrics, trainMetrics = null) {
    const formatPct = (val) => (val * 100).toFixed(1) + '%';
    
    const accEl = document.getElementById('metric-accuracy');
    accEl.textContent = formatPct(metrics.accuracy);
    accEl.className = `metric-value ${metrics.accuracy > 0.8 ? 'good' : metrics.accuracy > 0.6 ? 'moderate' : 'poor'}`;
    
    // Display training accuracy if provided
    const trainAccEl = document.getElementById('metric-train-accuracy');
    if (trainAccEl && trainMetrics) {
        trainAccEl.textContent = formatPct(trainMetrics.accuracy);
        // Color based on gap with test accuracy (overfitting indicator)
        const gap = trainMetrics.accuracy - metrics.accuracy;
        trainAccEl.className = `metric-value ${gap > 0.1 ? 'poor' : gap > 0.05 ? 'moderate' : 'good'}`;
    } else if (trainAccEl) {
        trainAccEl.textContent = '--';
    }
    
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
    
    // Clear any placeholder text
    container.innerHTML = '';
    
    if (classes.length === 2) {
        // Binary: show ROC curve
        const positiveClass = settings.targetClass || classes[0];
        titleEl.textContent = `ROC Curve (Target: ${positiveClass})`;
        
        // Get probabilities
        const yProbas = classifier.predictProba(testData);
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
            const isTarget = cls === settings.targetClass;
            html += `<tr class="${isTarget ? 'target-class-row' : ''}">
                <td>${cls}${isTarget ? ' ⭐' : ''}</td>
                <td>${(pc.precision * 100).toFixed(1)}%</td>
                <td>${(pc.recall * 100).toFixed(1)}%</td>
                <td>${(pc.f1 * 100).toFixed(1)}%</td>
            </tr>`;
        });
        
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
    
    // Find most important rule for each class (highest confidence with reasonable n)
    const bestRules = {};
    rules.forEach(rule => {
        if (!bestRules[rule.prediction] || 
            (rule.confidence > bestRules[rule.prediction].confidence && rule.n >= 5)) {
            bestRules[rule.prediction] = rule;
        }
    });
    
    // Find largest segment for each class
    const largestSegments = {};
    rules.forEach(rule => {
        if (!largestSegments[rule.prediction] || rule.n > largestSegments[rule.prediction].n) {
            largestSegments[rule.prediction] = rule;
        }
    });
    
    // Get target class info
    const targetClass = settings.targetClass || classes[0];
    const targetRule = bestRules[targetClass];
    
    // Calculate some summary stats
    const totalRules = rules.length;
    const avgConfidence = rules.reduce((sum, r) => sum + r.confidence, 0) / totalRules;
    
    let html = `
        <div class="interpretation-summary">
            <h5>📊 Model Overview</h5>
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-value">${stats.nodeCount}</span>
                    <span class="stat-label">Total Nodes</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.leafCount}</span>
                    <span class="stat-label">Segments (Leaves)</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.maxDepth}</span>
                    <span class="stat-label">Max Depth</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${(avgConfidence * 100).toFixed(0)}%</span>
                    <span class="stat-label">Avg Confidence</span>
                </div>
            </div>
        </div>
        
        <div class="interpretation-rules">
            <h5>🎯 Key Business Rules</h5>
    `;
    
    // Highlight the target class rule first
    if (targetRule) {
        html += `
            <div class="rule-highlight target-rule">
                <div class="rule-header">
                    <span class="rule-badge">Target: ${targetClass}</span>
                    <span class="rule-confidence">${(targetRule.confidence * 100).toFixed(0)}% confidence</span>
                </div>
                <p class="rule-condition"><strong>IF</strong> ${targetRule.conditions}</p>
                <p class="rule-outcome"><strong>THEN</strong> predict <strong>${targetRule.prediction}</strong></p>
                <p class="rule-sample">Based on ${targetRule.n} training cases</p>
            </div>
        `;
    }
    
    // Show other class rules
    for (const cls in bestRules) {
        if (cls === targetClass) continue;
        const rule = bestRules[cls];
        html += `
            <div class="rule-highlight">
                <div class="rule-header">
                    <span class="rule-badge secondary">${cls}</span>
                    <span class="rule-confidence">${(rule.confidence * 100).toFixed(0)}% confidence</span>
                </div>
                <p class="rule-condition"><strong>IF</strong> ${rule.conditions}</p>
                <p class="rule-outcome"><strong>THEN</strong> predict <strong>${rule.prediction}</strong></p>
                <p class="rule-sample">Based on ${rule.n} training cases</p>
            </div>
        `;
    }
    
    html += `</div>`;
    
    // Marketing Action Recommendations
    html += `
        <div class="interpretation-actions">
            <h5>💼 Suggested Marketing Actions</h5>
            <ul>
    `;
    
    // Generate context-aware recommendations based on target class
    const targetWords = targetClass.toLowerCase();
    if (targetWords.includes('churn') || targetWords.includes('cancel') || targetWords.includes('left')) {
        html += `
                <li><strong>Retention focus:</strong> Target customers matching "${targetClass}" rules with proactive retention offers before they reach high-risk criteria.</li>
                <li><strong>Early warning system:</strong> Set up automated alerts when customers approach the threshold values in your rules.</li>
                <li><strong>Root cause analysis:</strong> Investigate why the top split variable is so predictive—is there an operational fix?</li>
        `;
    } else if (targetWords.includes('convert') || targetWords.includes('buy') || targetWords.includes('purchase') || targetWords.includes('yes')) {
        html += `
                <li><strong>Lead scoring:</strong> Prioritize leads matching "${targetClass}" rules for sales outreach.</li>
                <li><strong>Lookalike audiences:</strong> Build ad audiences matching the high-confidence conversion profile.</li>
                <li><strong>Content personalization:</strong> Tailor messaging based on which segment path visitors fall into.</li>
        `;
    } else if (targetWords.includes('high') || targetWords.includes('premium') || targetWords.includes('vip')) {
        html += `
                <li><strong>Upsell opportunities:</strong> Customers near the boundary of "${targetClass}" are prime upsell candidates.</li>
                <li><strong>Loyalty program tiers:</strong> Align program tiers with the segments discovered by the tree.</li>
                <li><strong>Personalized pricing:</strong> Consider value-based pricing tiers matching these segments.</li>
        `;
    } else {
        html += `
                <li><strong>Segmented campaigns:</strong> Create distinct campaigns for each leaf segment with tailored messaging.</li>
                <li><strong>Resource allocation:</strong> Prioritize marketing spend on segments with highest confidence for "${targetClass}".</li>
                <li><strong>A/B testing:</strong> Test different offers across the identified segments to optimize response.</li>
        `;
    }
    
    html += `
            </ul>
        </div>
        
        <div class="interpretation-caveats">
            <h5>⚠️ Important Caveats</h5>
            <ul>
                <li><strong>Correlation ≠ Causation:</strong> These rules identify patterns, not causes. A variable might be predictive because it's correlated with the true driver.</li>
                <li><strong>Sample size matters:</strong> Rules based on small samples (n < 30) should be treated as hypotheses to test, not facts.</li>
                <li><strong>Temporal validity:</strong> Customer behavior changes. Revisit and retrain your model quarterly at minimum.</li>
                <li><strong>Test set performance:</strong> Always evaluate on held-out data. Training accuracy can be misleading.</li>
            </ul>
        </div>
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
