/**
 * Decision Tree Classifier - Core CART Algorithm
 * Implements Classification and Regression Trees for binary and multi-class classification
 */

class DecisionTreeClassifier {
    constructor(options = {}) {
        this.maxDepth = options.maxDepth || 3;
        this.minSamplesLeaf = options.minSamplesLeaf || 10;
        this.criterion = options.criterion || 'gini'; // 'gini' or 'entropy'
        this.root = null;
        this.classes = [];
        this.featureNames = [];
        this.featureTypes = {}; // { featureName: 'continuous' | 'categorical' }
    }

    /**
     * Calculate Gini impurity for a set of labels
     */
    giniImpurity(labels) {
        if (labels.length === 0) return 0;
        
        const counts = {};
        labels.forEach(label => {
            counts[label] = (counts[label] || 0) + 1;
        });
        
        let impurity = 1;
        for (const label in counts) {
            const prob = counts[label] / labels.length;
            impurity -= prob * prob;
        }
        
        return impurity;
    }

    /**
     * Calculate entropy for a set of labels
     */
    entropy(labels) {
        if (labels.length === 0) return 0;
        
        const counts = {};
        labels.forEach(label => {
            counts[label] = (counts[label] || 0) + 1;
        });
        
        let ent = 0;
        for (const label in counts) {
            const prob = counts[label] / labels.length;
            if (prob > 0) {
                ent -= prob * Math.log2(prob);
            }
        }
        
        return ent;
    }

    /**
     * Calculate impurity based on selected criterion
     */
    calculateImpurity(labels) {
        return this.criterion === 'gini' 
            ? this.giniImpurity(labels) 
            : this.entropy(labels);
    }

    /**
     * Calculate information gain / impurity reduction for a split
     */
    calculateGain(parentLabels, leftLabels, rightLabels) {
        const parentImpurity = this.calculateImpurity(parentLabels);
        const n = parentLabels.length;
        const nLeft = leftLabels.length;
        const nRight = rightLabels.length;
        
        if (nLeft === 0 || nRight === 0) return 0;
        
        const weightedChildImpurity = 
            (nLeft / n) * this.calculateImpurity(leftLabels) +
            (nRight / n) * this.calculateImpurity(rightLabels);
        
        return parentImpurity - weightedChildImpurity;
    }

    /**
     * Find the best split for continuous feature
     */
    findBestContinuousSplit(data, labels, featureIndex, featureName) {
        // Get unique sorted values
        const values = data.map(row => row[featureIndex]).filter(v => v !== null && v !== undefined);
        const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
        
        if (uniqueValues.length < 2) return null;
        
        let bestGain = -Infinity;
        let bestThreshold = null;
        let bestLeftIndices = [];
        let bestRightIndices = [];
        
        // Try midpoints between consecutive values
        for (let i = 0; i < uniqueValues.length - 1; i++) {
            const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
            
            const leftIndices = [];
            const rightIndices = [];
            
            data.forEach((row, idx) => {
                if (row[featureIndex] <= threshold) {
                    leftIndices.push(idx);
                } else {
                    rightIndices.push(idx);
                }
            });
            
            // Check min samples constraint
            if (leftIndices.length < this.minSamplesLeaf || rightIndices.length < this.minSamplesLeaf) {
                continue;
            }
            
            const leftLabels = leftIndices.map(i => labels[i]);
            const rightLabels = rightIndices.map(i => labels[i]);
            
            const gain = this.calculateGain(labels, leftLabels, rightLabels);
            
            if (gain > bestGain) {
                bestGain = gain;
                bestThreshold = threshold;
                bestLeftIndices = leftIndices;
                bestRightIndices = rightIndices;
            }
        }
        
        if (bestThreshold === null) return null;
        
        return {
            type: 'continuous',
            feature: featureName,
            featureIndex: featureIndex,
            threshold: bestThreshold,
            gain: bestGain,
            leftIndices: bestLeftIndices,
            rightIndices: bestRightIndices
        };
    }

    /**
     * Find the best split for categorical feature
     */
    findBestCategoricalSplit(data, labels, featureIndex, featureName) {
        const categories = [...new Set(data.map(row => row[featureIndex]))].filter(v => v !== null && v !== undefined);
        
        if (categories.length < 2) return null;
        
        let bestGain = -Infinity;
        let bestLeftCategories = [];
        let bestRightCategories = [];
        let bestLeftIndices = [];
        let bestRightIndices = [];
        
        // For binary split: try all possible ways to divide categories into two groups
        // For efficiency, limit to 2^(n-1) - 1 combinations
        const numCombinations = Math.pow(2, categories.length - 1) - 1;
        
        for (let mask = 1; mask <= numCombinations; mask++) {
            const leftCats = [];
            const rightCats = [];
            
            categories.forEach((cat, i) => {
                if (mask & (1 << i)) {
                    leftCats.push(cat);
                } else {
                    rightCats.push(cat);
                }
            });
            
            if (leftCats.length === 0 || rightCats.length === 0) continue;
            
            const leftIndices = [];
            const rightIndices = [];
            
            data.forEach((row, idx) => {
                if (leftCats.includes(row[featureIndex])) {
                    leftIndices.push(idx);
                } else {
                    rightIndices.push(idx);
                }
            });
            
            // Check min samples constraint
            if (leftIndices.length < this.minSamplesLeaf || rightIndices.length < this.minSamplesLeaf) {
                continue;
            }
            
            const leftLabels = leftIndices.map(i => labels[i]);
            const rightLabels = rightIndices.map(i => labels[i]);
            
            const gain = this.calculateGain(labels, leftLabels, rightLabels);
            
            if (gain > bestGain) {
                bestGain = gain;
                bestLeftCategories = leftCats;
                bestRightCategories = rightCats;
                bestLeftIndices = leftIndices;
                bestRightIndices = rightIndices;
            }
        }
        
        if (bestLeftCategories.length === 0) return null;
        
        return {
            type: 'categorical',
            feature: featureName,
            featureIndex: featureIndex,
            leftCategories: bestLeftCategories,
            rightCategories: bestRightCategories,
            gain: bestGain,
            leftIndices: bestLeftIndices,
            rightIndices: bestRightIndices
        };
    }

    /**
     * Find the best split across all features
     */
    findBestSplit(data, labels) {
        let bestSplit = null;
        let bestGain = -Infinity;
        
        this.featureNames.forEach((featureName, featureIndex) => {
            let split;
            
            if (this.featureTypes[featureName] === 'categorical') {
                split = this.findBestCategoricalSplit(data, labels, featureIndex, featureName);
            } else {
                split = this.findBestContinuousSplit(data, labels, featureIndex, featureName);
            }
            
            if (split && split.gain > bestGain) {
                bestGain = split.gain;
                bestSplit = split;
            }
        });
        
        return bestSplit;
    }

    /**
     * Get class distribution from labels
     */
    getClassDistribution(labels) {
        const distribution = {};
        this.classes.forEach(cls => {
            distribution[cls] = 0;
        });
        
        labels.forEach(label => {
            distribution[label] = (distribution[label] || 0) + 1;
        });
        
        return distribution;
    }

    /**
     * Get majority class from labels
     */
    getMajorityClass(labels) {
        const counts = this.getClassDistribution(labels);
        let maxCount = 0;
        let majorityClass = null;
        
        for (const cls in counts) {
            if (counts[cls] > maxCount) {
                maxCount = counts[cls];
                majorityClass = cls;
            }
        }
        
        return majorityClass;
    }

    /**
     * Build tree recursively
     */
    buildTree(data, labels, depth = 0, nodeId = 'root') {
        const n = labels.length;
        const distribution = this.getClassDistribution(labels);
        const impurity = this.calculateImpurity(labels);
        const majorityClass = this.getMajorityClass(labels);
        
        // Calculate confidence (proportion of majority class)
        const confidence = distribution[majorityClass] / n;
        
        // Create node
        const node = {
            id: nodeId,
            n: n,
            distribution: distribution,
            impurity: impurity,
            prediction: majorityClass,
            confidence: confidence,
            depth: depth,
            isLeaf: true,
            split: null,
            left: null,
            right: null
        };
        
        // Check stopping conditions
        if (depth >= this.maxDepth) return node;
        if (n < this.minSamplesLeaf * 2) return node;
        if (impurity === 0) return node; // Pure node
        
        // Find best split
        const bestSplit = this.findBestSplit(data, labels);
        
        if (!bestSplit || bestSplit.gain <= 0) return node;
        
        // Apply split
        node.isLeaf = false;
        node.split = bestSplit;
        
        const leftData = bestSplit.leftIndices.map(i => data[i]);
        const leftLabels = bestSplit.leftIndices.map(i => labels[i]);
        const rightData = bestSplit.rightIndices.map(i => data[i]);
        const rightLabels = bestSplit.rightIndices.map(i => labels[i]);
        
        node.left = this.buildTree(leftData, leftLabels, depth + 1, `${nodeId}-L`);
        node.right = this.buildTree(rightData, rightLabels, depth + 1, `${nodeId}-R`);
        
        return node;
    }

    /**
     * Fit the model to training data
     */
    fit(X, y, featureNames, featureTypes = {}) {
        this.featureNames = featureNames;
        this.featureTypes = featureTypes;
        this.classes = [...new Set(y)].sort();
        
        // Auto-detect feature types if not provided
        featureNames.forEach((name, idx) => {
            if (!this.featureTypes[name]) {
                const values = X.map(row => row[idx]);
                const uniqueValues = [...new Set(values)];
                // If few unique values or non-numeric, treat as categorical
                const isNumeric = values.every(v => typeof v === 'number' || !isNaN(parseFloat(v)));
                this.featureTypes[name] = (uniqueValues.length <= 10 && !isNumeric) ? 'categorical' : 'continuous';
            }
        });
        
        this.root = this.buildTree(X, y);
        return this;
    }

    /**
     * Predict class for a single sample
     */
    predictOne(sample, node = this.root) {
        if (node.isLeaf) {
            return {
                prediction: node.prediction,
                confidence: node.confidence,
                distribution: node.distribution,
                nodeId: node.id
            };
        }
        
        const featureValue = sample[node.split.featureIndex];
        
        if (node.split.type === 'continuous') {
            if (featureValue <= node.split.threshold) {
                return this.predictOne(sample, node.left);
            } else {
                return this.predictOne(sample, node.right);
            }
        } else {
            // Categorical
            if (node.split.leftCategories.includes(featureValue)) {
                return this.predictOne(sample, node.left);
            } else {
                return this.predictOne(sample, node.right);
            }
        }
    }

    /**
     * Predict classes for multiple samples
     */
    predict(X) {
        return X.map(sample => this.predictOne(sample));
    }

    /**
     * Get class probabilities for a sample
     */
    predictProba(X) {
        return X.map(sample => {
            const result = this.predictOne(sample);
            const probs = {};
            const total = Object.values(result.distribution).reduce((a, b) => a + b, 0);
            
            this.classes.forEach(cls => {
                probs[cls] = (result.distribution[cls] || 0) / total;
            });
            
            return probs;
        });
    }

    /**
     * Calculate feature importance based on total impurity reduction
     */
    getFeatureImportance() {
        const importance = {};
        this.featureNames.forEach(name => {
            importance[name] = 0;
        });
        
        const traverse = (node) => {
            if (!node || node.isLeaf) return;
            
            // Weight gain by number of samples
            importance[node.split.feature] += node.split.gain * node.n;
            
            traverse(node.left);
            traverse(node.right);
        };
        
        traverse(this.root);
        
        // Normalize
        const total = Object.values(importance).reduce((a, b) => a + b, 0);
        if (total > 0) {
            for (const name in importance) {
                importance[name] /= total;
            }
        }
        
        return importance;
    }

    /**
     * Get tree rules as human-readable text
     */
    getRules(node = this.root, path = []) {
        const rules = [];
        
        if (node.isLeaf) {
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
        rules.push(...this.getRules(node.left, [...path, leftCondition]));
        
        // Right branch
        let rightCondition;
        if (node.split.type === 'continuous') {
            rightCondition = `${node.split.feature} > ${node.split.threshold.toFixed(2)}`;
        } else {
            rightCondition = `${node.split.feature} ∈ {${node.split.rightCategories.join(', ')}}`;
        }
        rules.push(...this.getRules(node.right, [...path, rightCondition]));
        
        return rules;
    }

    /**
     * Get tree statistics
     */
    getTreeStats() {
        let nodeCount = 0;
        let leafCount = 0;
        let maxDepth = 0;
        
        const traverse = (node) => {
            if (!node) return;
            nodeCount++;
            maxDepth = Math.max(maxDepth, node.depth);
            
            if (node.isLeaf) {
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
    }

    /**
     * Export tree structure for visualization
     */
    exportForVisualization() {
        return {
            root: this.root,
            classes: this.classes,
            featureNames: this.featureNames,
            featureTypes: this.featureTypes,
            criterion: this.criterion
        };
    }
}

/**
 * Calculate evaluation metrics
 * @param {Array} yTrue - True labels
 * @param {Array} yPred - Predicted labels (objects with .prediction property)
 * @param {Array} classes - List of classes
 * @param {string} targetClass - The "positive" class for binary metrics (optional)
 */
function calculateMetrics(yTrue, yPred, classes, targetClass = null) {
    const n = yTrue.length;
    
    // If no target class specified, use first class
    const positiveClass = targetClass || classes[0];
    
    // Build confusion matrix
    const matrix = {};
    classes.forEach(actual => {
        matrix[actual] = {};
        classes.forEach(predicted => {
            matrix[actual][predicted] = 0;
        });
    });
    
    yTrue.forEach((actual, i) => {
        const predicted = yPred[i].prediction;
        matrix[actual][predicted]++;
    });
    
    // Calculate accuracy
    let correct = 0;
    classes.forEach(cls => {
        correct += matrix[cls][cls];
    });
    const accuracy = correct / n;
    
    // Per-class metrics
    const perClass = {};
    classes.forEach(cls => {
        const tp = matrix[cls][cls];
        let fp = 0, fn = 0, tn = 0;
        
        classes.forEach(other => {
            if (other !== cls) {
                fp += matrix[other][cls];
                fn += matrix[cls][other];
            }
        });
        
        classes.forEach(actual => {
            classes.forEach(predicted => {
                if (actual !== cls && predicted !== cls) {
                    tn += matrix[actual][predicted];
                }
            });
        });
        
        const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
        const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
        const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
        
        perClass[cls] = { tp, fp, fn, tn, precision, recall, f1 };
    });
    
    // For binary classification, use target class metrics
    // For multi-class, use macro averages
    let precision, recall, f1;
    
    if (classes.length === 2 && positiveClass) {
        // Binary: use the target class metrics
        precision = perClass[positiveClass].precision;
        recall = perClass[positiveClass].recall;
        f1 = perClass[positiveClass].f1;
    } else {
        // Multi-class: macro averages
        precision = 0;
        recall = 0;
        f1 = 0;
        classes.forEach(cls => {
            precision += perClass[cls].precision;
            recall += perClass[cls].recall;
            f1 += perClass[cls].f1;
        });
        precision /= classes.length;
        recall /= classes.length;
        f1 /= classes.length;
    }
    
    return {
        accuracy,
        precision,
        recall,
        f1,
        perClass,
        confusionMatrix: matrix,
        classes,
        targetClass: positiveClass
    };
}

/**
 * Calculate ROC curve data (binary classification only)
 */
function calculateROC(yTrue, yProbas, positiveClass) {
    // Sort by probability descending
    const data = yTrue.map((actual, i) => ({
        actual: actual === positiveClass ? 1 : 0,
        prob: yProbas[i][positiveClass] || 0
    })).sort((a, b) => b.prob - a.prob);
    
    const totalPositive = data.filter(d => d.actual === 1).length;
    const totalNegative = data.length - totalPositive;
    
    if (totalPositive === 0 || totalNegative === 0) {
        return { fpr: [0, 1], tpr: [0, 1], auc: 0.5 };
    }
    
    const fpr = [0];
    const tpr = [0];
    let fp = 0, tp = 0;
    
    data.forEach(d => {
        if (d.actual === 1) {
            tp++;
        } else {
            fp++;
        }
        fpr.push(fp / totalNegative);
        tpr.push(tp / totalPositive);
    });
    
    // Calculate AUC using trapezoidal rule
    let auc = 0;
    for (let i = 1; i < fpr.length; i++) {
        auc += (fpr[i] - fpr[i-1]) * (tpr[i] + tpr[i-1]) / 2;
    }
    
    return { fpr, tpr, auc };
}

// Export for use
window.DecisionTreeClassifier = DecisionTreeClassifier;
window.calculateMetrics = calculateMetrics;
window.calculateROC = calculateROC;
