/**
 * Manual Tree Builder
 * Handles the interactive node editing experience
 */

class ManualTreeBuilder {
    constructor(options = {}) {
        this.tree = null;
        this.currentNode = null;
        this.data = null;
        this.labels = null;
        this.featureNames = [];
        this.featureTypes = {};
        this.classes = [];
        this.maxDepth = options.maxDepth || 3;
        this.minSamplesLeaf = options.minSamplesLeaf || 10;
        this.criterion = options.criterion || 'gini';
        
        this.onTreeUpdate = options.onTreeUpdate || null;
        
        // Editor elements
        this.editorEl = document.getElementById('node-editor');
        this.editorContent = document.getElementById('node-editor-content');
        
        this.setupEditorEvents();
    }

    /**
     * Setup event listeners for the editor
     */
    setupEditorEvents() {
        document.getElementById('close-editor')?.addEventListener('click', () => this.closeEditor());
        document.getElementById('cancel-split-btn')?.addEventListener('click', () => this.closeEditor());
        document.getElementById('apply-split-btn')?.addEventListener('click', () => this.applySplit());
        document.getElementById('make-leaf-btn')?.addEventListener('click', () => this.makeLeaf());
    }

    /**
     * Initialize with data
     */
    initialize(data, labels, featureNames, featureTypes, classes) {
        this.data = data;
        this.labels = labels;
        this.featureNames = featureNames;
        this.featureTypes = featureTypes;
        this.classes = classes;
        
        // Create root node
        this.tree = this.createNode(
            data.map((_, i) => i),
            'root',
            0
        );
        
        return this.tree;
    }

    /**
     * Create a new node
     */
    createNode(indices, id, depth) {
        const nodeLabels = indices.map(i => this.labels[i]);
        const distribution = this.getDistribution(nodeLabels);
        const impurity = this.calculateImpurity(nodeLabels);
        const majorityClass = this.getMajorityClass(distribution);
        const confidence = distribution[majorityClass] / indices.length;
        
        return {
            id: id,
            indices: indices,
            n: indices.length,
            distribution: distribution,
            impurity: impurity,
            prediction: majorityClass,
            confidence: confidence,
            depth: depth,
            isLeaf: false, // Will be determined later
            split: null,
            left: null,
            right: null,
            // For manual mode, track if user has made a decision
            isDecided: false
        };
    }

    /**
     * Get class distribution
     */
    getDistribution(labels) {
        const dist = {};
        this.classes.forEach(cls => dist[cls] = 0);
        labels.forEach(label => dist[label]++);
        return dist;
    }

    /**
     * Calculate impurity (Gini or Entropy)
     */
    calculateImpurity(labels) {
        if (labels.length === 0) return 0;
        
        const counts = {};
        labels.forEach(label => {
            counts[label] = (counts[label] || 0) + 1;
        });
        
        if (this.criterion === 'gini') {
            let impurity = 1;
            for (const label in counts) {
                const prob = counts[label] / labels.length;
                impurity -= prob * prob;
            }
            return impurity;
        } else {
            let entropy = 0;
            for (const label in counts) {
                const prob = counts[label] / labels.length;
                if (prob > 0) entropy -= prob * Math.log2(prob);
            }
            return entropy;
        }
    }

    /**
     * Get majority class
     */
    getMajorityClass(distribution) {
        let maxCount = 0;
        let majorityClass = null;
        for (const cls in distribution) {
            if (distribution[cls] > maxCount) {
                maxCount = distribution[cls];
                majorityClass = cls;
            }
        }
        return majorityClass;
    }

    /**
     * Open editor for a node
     */
    openEditor(node) {
        this.currentNode = node;
        
        // Check if node can be split
        if (node.depth >= this.maxDepth || node.n < this.minSamplesLeaf * 2 || node.impurity === 0) {
            alert('This node cannot be split (max depth reached, too few samples, or already pure).');
            return;
        }
        
        // Build editor content
        this.buildEditorContent(node);
        
        // Show editor
        this.editorEl.classList.remove('hidden');
    }

    /**
     * Close the editor
     */
    closeEditor() {
        this.editorEl.classList.add('hidden');
        this.currentNode = null;
    }

    /**
     * Build the editor content based on node
     */
    buildEditorContent(node) {
        const nodeData = node.indices.map(i => this.data[i]);
        const nodeLabels = node.indices.map(i => this.labels[i]);
        
        // Default to first feature
        const defaultFeature = this.featureNames[0];
        const featureType = this.featureTypes[defaultFeature];
        
        let html = `
            <div class="editor-section">
                <label>Select Feature:</label>
                <div class="feature-pills">
                    ${this.featureNames.map((name, idx) => `
                        <button type="button" class="feature-pill ${idx === 0 ? 'active' : ''}" 
                                data-feature="${name}" data-index="${idx}">
                            ${name}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div id="split-controls">
                ${this.buildSplitControls(defaultFeature, 0, nodeData, nodeLabels)}
            </div>
        `;
        
        this.editorContent.innerHTML = html;
        
        // Setup feature pill clicks
        this.editorContent.querySelectorAll('.feature-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                // Update active state
                this.editorContent.querySelectorAll('.feature-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                
                // Rebuild split controls
                const featureName = pill.dataset.feature;
                const featureIndex = parseInt(pill.dataset.index);
                document.getElementById('split-controls').innerHTML = 
                    this.buildSplitControls(featureName, featureIndex, nodeData, nodeLabels);
                this.setupSplitControlEvents(nodeData, nodeLabels);
            });
        });
        
        this.setupSplitControlEvents(nodeData, nodeLabels);
    }

    /**
     * Build split controls for a specific feature
     */
    buildSplitControls(featureName, featureIndex, data, labels) {
        const featureType = this.featureTypes[featureName];
        const values = data.map(row => row[featureIndex]);
        
        if (featureType === 'categorical') {
            return this.buildCategoricalControls(featureName, featureIndex, values, labels);
        } else {
            return this.buildContinuousControls(featureName, featureIndex, values, labels);
        }
    }

    /**
     * Build controls for continuous feature
     */
    buildContinuousControls(featureName, featureIndex, values, labels) {
        const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        const median = this.calculateMedian(numericValues);
        
        // Calculate initial split stats at median
        const initialStats = this.calculateContinuousSplitStats(values, labels, median);
        
        return `
            <div class="split-slider-container">
                <label>Split Point for <strong>${featureName}</strong>:</label>
                <input type="range" class="split-slider" id="split-slider"
                       min="${min}" max="${max}" value="${median}" step="${(max - min) / 100}"
                       data-feature="${featureName}" data-index="${featureIndex}">
                <div class="split-value-display">
                    <span>${min.toFixed(1)}</span>
                    <span class="current" id="split-value">${median.toFixed(2)}</span>
                    <span>${max.toFixed(1)}</span>
                </div>
                <div style="text-align: center; margin-top: 0.5rem; color: var(--app-muted); font-size: 0.85rem;">
                    Median: ${median.toFixed(2)}
                </div>
            </div>
            
            <div class="split-preview" id="split-preview">
                <div class="split-preview-side left">
                    <div class="split-preview-label">🔵 LEFT (≤ ${median.toFixed(2)})</div>
                    <div class="split-preview-stat">n = <span id="left-n">${initialStats.leftN}</span></div>
                    <div class="split-preview-stat"><span id="left-majority">${initialStats.leftMajority}</span>: <span id="left-pct">${initialStats.leftPct}</span>%</div>
                </div>
                <div class="split-preview-side right">
                    <div class="split-preview-label">🟠 RIGHT (> ${median.toFixed(2)})</div>
                    <div class="split-preview-stat">n = <span id="right-n">${initialStats.rightN}</span></div>
                    <div class="split-preview-stat"><span id="right-majority">${initialStats.rightMajority}</span>: <span id="right-pct">${initialStats.rightPct}</span>%</div>
                </div>
            </div>
            
            <div class="split-metrics" id="split-metrics">
                <div class="split-metric">
                    <span class="split-metric-label">Info Gain</span>
                    <span class="split-metric-value" id="info-gain">${initialStats.infoGain.toFixed(4)}</span>
                </div>
                <div class="split-metric">
                    <span class="split-metric-label">Gini Reduction</span>
                    <span class="split-metric-value" id="gini-reduction">${initialStats.giniReduction.toFixed(4)}</span>
                </div>
            </div>
        `;
    }

    /**
     * Build controls for categorical feature
     */
    buildCategoricalControls(featureName, featureIndex, values, labels) {
        const categories = [...new Set(values)].filter(v => v !== null && v !== undefined);
        
        // Default: try to balance 50/50
        const { leftCats, rightCats } = this.autoBalanceCategories(values, labels, categories);
        const initialStats = this.calculateCategoricalSplitStats(values, labels, leftCats, rightCats);
        
        return `
            <div class="category-controls" data-feature="${featureName}" data-index="${featureIndex}">
                <label>Assign categories to groups:</label>
                <p style="font-size: 0.85rem; color: var(--app-muted); margin: 0.5rem 0;">
                    Click a category to move it to the other group.
                </p>
                
                <div class="category-groups">
                    <div class="category-group left" id="left-group">
                        <div class="category-group-header">🔵 LEFT GROUP</div>
                        <div class="category-items" id="left-items">
                            ${leftCats.map(cat => `
                                <span class="category-item" data-category="${cat}">${cat}</span>
                            `).join('')}
                        </div>
                        <div class="category-group-stats">
                            n = <span id="cat-left-n">${initialStats.leftN}</span> 
                            (<span id="cat-left-pct">${initialStats.leftPctTotal}</span>%)
                        </div>
                    </div>
                    <div class="category-group right" id="right-group">
                        <div class="category-group-header">🟠 RIGHT GROUP</div>
                        <div class="category-items" id="right-items">
                            ${rightCats.map(cat => `
                                <span class="category-item" data-category="${cat}">${cat}</span>
                            `).join('')}
                        </div>
                        <div class="category-group-stats">
                            n = <span id="cat-right-n">${initialStats.rightN}</span>
                            (<span id="cat-right-pct">${initialStats.rightPctTotal}</span>%)
                        </div>
                    </div>
                </div>
                
                <button type="button" class="auto-balance-btn" id="auto-balance-btn">
                    ⚖️ Auto-Balance 50/50
                </button>
                
                <div class="split-preview" id="split-preview">
                    <div class="split-preview-side left">
                        <div class="split-preview-label">🔵 LEFT</div>
                        <div class="split-preview-stat"><span id="left-majority">${initialStats.leftMajority}</span>: <span id="left-pct">${initialStats.leftPct}</span>%</div>
                    </div>
                    <div class="split-preview-side right">
                        <div class="split-preview-label">🟠 RIGHT</div>
                        <div class="split-preview-stat"><span id="right-majority">${initialStats.rightMajority}</span>: <span id="right-pct">${initialStats.rightPct}</span>%</div>
                    </div>
                </div>
                
                <div class="split-metrics" id="split-metrics">
                    <div class="split-metric">
                        <span class="split-metric-label">Info Gain</span>
                        <span class="split-metric-value" id="info-gain">${initialStats.infoGain.toFixed(4)}</span>
                    </div>
                    <div class="split-metric">
                        <span class="split-metric-label">Gini Reduction</span>
                        <span class="split-metric-value" id="gini-reduction">${initialStats.giniReduction.toFixed(4)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for split controls
     */
    setupSplitControlEvents(data, labels) {
        // Continuous slider
        const slider = document.getElementById('split-slider');
        if (slider) {
            slider.addEventListener('input', () => {
                const threshold = parseFloat(slider.value);
                const featureIndex = parseInt(slider.dataset.index);
                const values = data.map(row => row[featureIndex]);
                
                document.getElementById('split-value').textContent = threshold.toFixed(2);
                
                const stats = this.calculateContinuousSplitStats(values, labels, threshold);
                this.updateSplitPreview(stats, threshold);
            });
        }
        
        // Categorical items
        const categoryItems = this.editorContent.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const category = item.dataset.category;
                const currentGroup = item.closest('.category-group');
                const targetGroup = currentGroup.classList.contains('left') 
                    ? document.getElementById('right-items')
                    : document.getElementById('left-items');
                
                // Move item
                targetGroup.appendChild(item);
                
                // Update stats
                this.updateCategoricalStats(data, labels);
            });
        });
        
        // Auto-balance button
        const autoBalanceBtn = document.getElementById('auto-balance-btn');
        if (autoBalanceBtn) {
            autoBalanceBtn.addEventListener('click', () => {
                const featureIndex = parseInt(this.editorContent.querySelector('.category-controls').dataset.index);
                const values = data.map(row => row[featureIndex]);
                const categories = [...new Set(values)];
                
                const { leftCats, rightCats } = this.autoBalanceCategories(values, labels, categories);
                
                // Redistribute items
                const leftItems = document.getElementById('left-items');
                const rightItems = document.getElementById('right-items');
                leftItems.innerHTML = '';
                rightItems.innerHTML = '';
                
                leftCats.forEach(cat => {
                    const item = document.createElement('span');
                    item.className = 'category-item';
                    item.dataset.category = cat;
                    item.textContent = cat;
                    item.addEventListener('click', () => {
                        const targetGroup = item.closest('.category-group').classList.contains('left')
                            ? rightItems : leftItems;
                        targetGroup.appendChild(item);
                        this.updateCategoricalStats(data, labels);
                    });
                    leftItems.appendChild(item);
                });
                
                rightCats.forEach(cat => {
                    const item = document.createElement('span');
                    item.className = 'category-item';
                    item.dataset.category = cat;
                    item.textContent = cat;
                    item.addEventListener('click', () => {
                        const targetGroup = item.closest('.category-group').classList.contains('left')
                            ? rightItems : leftItems;
                        targetGroup.appendChild(item);
                        this.updateCategoricalStats(data, labels);
                    });
                    rightItems.appendChild(item);
                });
                
                this.updateCategoricalStats(data, labels);
            });
        }
    }

    /**
     * Calculate stats for continuous split
     */
    calculateContinuousSplitStats(values, labels, threshold) {
        const leftIndices = [];
        const rightIndices = [];
        
        values.forEach((v, i) => {
            if (parseFloat(v) <= threshold) {
                leftIndices.push(i);
            } else {
                rightIndices.push(i);
            }
        });
        
        const leftLabels = leftIndices.map(i => labels[i]);
        const rightLabels = rightIndices.map(i => labels[i]);
        
        const leftDist = this.getDistribution(leftLabels);
        const rightDist = this.getDistribution(rightLabels);
        
        const leftMajority = this.getMajorityClass(leftDist);
        const rightMajority = this.getMajorityClass(rightDist);
        
        const leftPct = leftLabels.length > 0 ? (leftDist[leftMajority] / leftLabels.length * 100).toFixed(0) : 0;
        const rightPct = rightLabels.length > 0 ? (rightDist[rightMajority] / rightLabels.length * 100).toFixed(0) : 0;
        
        // Calculate gains
        const parentImpurity = this.calculateImpurity(labels);
        const n = labels.length;
        const nLeft = leftLabels.length;
        const nRight = rightLabels.length;
        
        let infoGain = 0, giniReduction = 0;
        if (nLeft > 0 && nRight > 0) {
            // Using entropy for info gain
            const parentEntropy = this.calculateEntropyFromLabels(labels);
            const leftEntropy = this.calculateEntropyFromLabels(leftLabels);
            const rightEntropy = this.calculateEntropyFromLabels(rightLabels);
            infoGain = parentEntropy - (nLeft/n * leftEntropy + nRight/n * rightEntropy);
            
            // Gini reduction
            const parentGini = this.calculateGiniFromLabels(labels);
            const leftGini = this.calculateGiniFromLabels(leftLabels);
            const rightGini = this.calculateGiniFromLabels(rightLabels);
            giniReduction = parentGini - (nLeft/n * leftGini + nRight/n * rightGini);
        }
        
        return {
            leftN: nLeft,
            rightN: nRight,
            leftMajority,
            rightMajority,
            leftPct,
            rightPct,
            infoGain,
            giniReduction,
            leftIndices,
            rightIndices
        };
    }

    /**
     * Calculate stats for categorical split
     */
    calculateCategoricalSplitStats(values, labels, leftCats, rightCats) {
        const leftIndices = [];
        const rightIndices = [];
        
        values.forEach((v, i) => {
            if (leftCats.includes(v)) {
                leftIndices.push(i);
            } else {
                rightIndices.push(i);
            }
        });
        
        const leftLabels = leftIndices.map(i => labels[i]);
        const rightLabels = rightIndices.map(i => labels[i]);
        
        const leftDist = this.getDistribution(leftLabels);
        const rightDist = this.getDistribution(rightLabels);
        
        const leftMajority = this.getMajorityClass(leftDist);
        const rightMajority = this.getMajorityClass(rightDist);
        
        const leftPct = leftLabels.length > 0 ? (leftDist[leftMajority] / leftLabels.length * 100).toFixed(0) : 0;
        const rightPct = rightLabels.length > 0 ? (rightDist[rightMajority] / rightLabels.length * 100).toFixed(0) : 0;
        
        const leftPctTotal = (leftLabels.length / labels.length * 100).toFixed(0);
        const rightPctTotal = (rightLabels.length / labels.length * 100).toFixed(0);
        
        // Calculate gains
        const n = labels.length;
        const nLeft = leftLabels.length;
        const nRight = rightLabels.length;
        
        let infoGain = 0, giniReduction = 0;
        if (nLeft > 0 && nRight > 0) {
            const parentEntropy = this.calculateEntropyFromLabels(labels);
            const leftEntropy = this.calculateEntropyFromLabels(leftLabels);
            const rightEntropy = this.calculateEntropyFromLabels(rightLabels);
            infoGain = parentEntropy - (nLeft/n * leftEntropy + nRight/n * rightEntropy);
            
            const parentGini = this.calculateGiniFromLabels(labels);
            const leftGini = this.calculateGiniFromLabels(leftLabels);
            const rightGini = this.calculateGiniFromLabels(rightLabels);
            giniReduction = parentGini - (nLeft/n * leftGini + nRight/n * rightGini);
        }
        
        return {
            leftN: nLeft,
            rightN: nRight,
            leftMajority,
            rightMajority,
            leftPct,
            rightPct,
            leftPctTotal,
            rightPctTotal,
            infoGain,
            giniReduction,
            leftIndices,
            rightIndices
        };
    }

    calculateEntropyFromLabels(labels) {
        if (labels.length === 0) return 0;
        const counts = {};
        labels.forEach(l => counts[l] = (counts[l] || 0) + 1);
        let entropy = 0;
        for (const l in counts) {
            const p = counts[l] / labels.length;
            if (p > 0) entropy -= p * Math.log2(p);
        }
        return entropy;
    }

    calculateGiniFromLabels(labels) {
        if (labels.length === 0) return 0;
        const counts = {};
        labels.forEach(l => counts[l] = (counts[l] || 0) + 1);
        let gini = 1;
        for (const l in counts) {
            const p = counts[l] / labels.length;
            gini -= p * p;
        }
        return gini;
    }

    /**
     * Update split preview display
     */
    updateSplitPreview(stats, threshold) {
        document.getElementById('left-n').textContent = stats.leftN;
        document.getElementById('right-n').textContent = stats.rightN;
        document.getElementById('left-majority').textContent = stats.leftMajority || '-';
        document.getElementById('right-majority').textContent = stats.rightMajority || '-';
        document.getElementById('left-pct').textContent = stats.leftPct;
        document.getElementById('right-pct').textContent = stats.rightPct;
        document.getElementById('info-gain').textContent = stats.infoGain.toFixed(4);
        document.getElementById('gini-reduction').textContent = stats.giniReduction.toFixed(4);
        
        // Update labels
        const leftLabel = document.querySelector('.split-preview-side.left .split-preview-label');
        const rightLabel = document.querySelector('.split-preview-side.right .split-preview-label');
        if (leftLabel && threshold !== undefined) {
            leftLabel.textContent = `🔵 LEFT (≤ ${threshold.toFixed(2)})`;
            rightLabel.textContent = `🟠 RIGHT (> ${threshold.toFixed(2)})`;
        }
    }

    /**
     * Update categorical stats
     */
    updateCategoricalStats(data, labels) {
        const featureIndex = parseInt(this.editorContent.querySelector('.category-controls').dataset.index);
        const values = data.map(row => row[featureIndex]);
        
        const leftCats = Array.from(document.querySelectorAll('#left-items .category-item')).map(el => el.dataset.category);
        const rightCats = Array.from(document.querySelectorAll('#right-items .category-item')).map(el => el.dataset.category);
        
        const stats = this.calculateCategoricalSplitStats(values, labels, leftCats, rightCats);
        
        document.getElementById('cat-left-n').textContent = stats.leftN;
        document.getElementById('cat-right-n').textContent = stats.rightN;
        document.getElementById('cat-left-pct').textContent = stats.leftPctTotal;
        document.getElementById('cat-right-pct').textContent = stats.rightPctTotal;
        document.getElementById('left-majority').textContent = stats.leftMajority || '-';
        document.getElementById('right-majority').textContent = stats.rightMajority || '-';
        document.getElementById('left-pct').textContent = stats.leftPct;
        document.getElementById('right-pct').textContent = stats.rightPct;
        document.getElementById('info-gain').textContent = stats.infoGain.toFixed(4);
        document.getElementById('gini-reduction').textContent = stats.giniReduction.toFixed(4);
    }

    /**
     * Auto-balance categories for ~50/50 split
     */
    autoBalanceCategories(values, labels, categories) {
        // Count samples per category
        const catCounts = {};
        categories.forEach(cat => catCounts[cat] = 0);
        values.forEach(v => catCounts[v]++);
        
        // Sort by count descending
        const sortedCats = categories.sort((a, b) => catCounts[b] - catCounts[a]);
        
        // Greedy assignment to balance
        let leftCount = 0, rightCount = 0;
        const leftCats = [], rightCats = [];
        
        sortedCats.forEach(cat => {
            if (leftCount <= rightCount) {
                leftCats.push(cat);
                leftCount += catCounts[cat];
            } else {
                rightCats.push(cat);
                rightCount += catCounts[cat];
            }
        });
        
        return { leftCats, rightCats };
    }

    /**
     * Calculate median
     */
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /**
     * Apply the current split
     */
    applySplit() {
        if (!this.currentNode) return;
        
        const node = this.currentNode;
        const nodeData = node.indices.map(i => this.data[i]);
        const nodeLabels = node.indices.map(i => this.labels[i]);
        
        // Get active feature
        const activeFeature = this.editorContent.querySelector('.feature-pill.active');
        const featureName = activeFeature.dataset.feature;
        const featureIndex = parseInt(activeFeature.dataset.index);
        const featureType = this.featureTypes[featureName];
        
        let split, leftIndices, rightIndices;
        
        if (featureType === 'categorical') {
            const leftCats = Array.from(document.querySelectorAll('#left-items .category-item')).map(el => el.dataset.category);
            const rightCats = Array.from(document.querySelectorAll('#right-items .category-item')).map(el => el.dataset.category);
            
            if (leftCats.length === 0 || rightCats.length === 0) {
                alert('Both groups must have at least one category.');
                return;
            }
            
            leftIndices = [];
            rightIndices = [];
            nodeData.forEach((row, i) => {
                if (leftCats.includes(row[featureIndex])) {
                    leftIndices.push(node.indices[i]);
                } else {
                    rightIndices.push(node.indices[i]);
                }
            });
            
            split = {
                type: 'categorical',
                feature: featureName,
                featureIndex: featureIndex,
                leftCategories: leftCats,
                rightCategories: rightCats
            };
        } else {
            const threshold = parseFloat(document.getElementById('split-slider').value);
            
            leftIndices = [];
            rightIndices = [];
            nodeData.forEach((row, i) => {
                if (parseFloat(row[featureIndex]) <= threshold) {
                    leftIndices.push(node.indices[i]);
                } else {
                    rightIndices.push(node.indices[i]);
                }
            });
            
            split = {
                type: 'continuous',
                feature: featureName,
                featureIndex: featureIndex,
                threshold: threshold
            };
        }
        
        // Check min samples
        if (leftIndices.length < this.minSamplesLeaf || rightIndices.length < this.minSamplesLeaf) {
            alert(`Each branch must have at least ${this.minSamplesLeaf} samples.`);
            return;
        }
        
        // Apply split to node
        node.split = split;
        node.isLeaf = false;
        node.isDecided = true;
        
        // Create child nodes
        node.left = this.createNode(leftIndices, `${node.id}-L`, node.depth + 1);
        node.right = this.createNode(rightIndices, `${node.id}-R`, node.depth + 1);
        
        // Close editor
        this.closeEditor();
        
        // Trigger update
        if (this.onTreeUpdate) {
            this.onTreeUpdate(this.tree);
        }
    }

    /**
     * Make current node a leaf
     */
    makeLeaf() {
        if (!this.currentNode) return;
        
        this.currentNode.isLeaf = true;
        this.currentNode.isDecided = true;
        
        this.closeEditor();
        
        if (this.onTreeUpdate) {
            this.onTreeUpdate(this.tree);
        }
    }

    /**
     * Get the current tree
     */
    getTree() {
        return this.tree;
    }

    /**
     * Export tree for classifier compatibility
     */
    exportTree() {
        return {
            root: this.tree,
            classes: this.classes,
            featureNames: this.featureNames,
            featureTypes: this.featureTypes,
            criterion: this.criterion
        };
    }
}

// Export
window.ManualTreeBuilder = ManualTreeBuilder;
