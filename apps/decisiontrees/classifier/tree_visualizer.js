/**
 * Decision Tree Visualizer
 * Renders the tree as SVG with compact nodes that expand on click
 */

class TreeVisualizer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            nodeWidth: 160,
            nodeHeight: 70,
            levelHeight: 120,
            siblingGap: 20,
            ...options
        };
        this.svg = null;
        this.treeData = null;
        this.selectedNodeId = null;
        this.onNodeClick = options.onNodeClick || null;
        this.mode = 'auto'; // 'auto' or 'manual'
    }

    /**
     * Set the build mode
     */
    setMode(mode) {
        this.mode = mode;
    }

    /**
     * Render the tree
     */
    render(treeData) {
        this.treeData = treeData;
        this.container.innerHTML = '';
        
        if (!treeData || !treeData.root) {
            this.container.innerHTML = '<div class="tree-placeholder"><p>🌱 No tree to display</p></div>';
            return;
        }
        
        // Calculate tree layout
        const layout = this.calculateLayout(treeData.root);
        
        // Create SVG
        const svgWidth = Math.max(800, layout.width + 100);
        const svgHeight = Math.max(400, layout.height + 100);
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('class', 'tree-svg');
        this.svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', svgHeight);
        
        // Create groups for edges and nodes (edges behind nodes)
        const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        edgesGroup.setAttribute('class', 'edges-group');
        
        const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodesGroup.setAttribute('class', 'nodes-group');
        
        // Render edges first
        this.renderEdges(treeData.root, layout.positions, edgesGroup);
        
        // Render nodes
        this.renderNodes(treeData.root, layout.positions, nodesGroup, treeData.classes);
        
        this.svg.appendChild(edgesGroup);
        this.svg.appendChild(nodesGroup);
        this.container.appendChild(this.svg);
    }

    /**
     * Calculate layout positions for all nodes
     */
    calculateLayout(root) {
        const positions = {};
        const { nodeWidth, nodeHeight, levelHeight, siblingGap } = this.options;
        
        // First pass: calculate subtree widths
        const getSubtreeWidth = (node) => {
            if (!node) return 0;
            if (node.isLeaf) return nodeWidth;
            
            const leftWidth = getSubtreeWidth(node.left);
            const rightWidth = getSubtreeWidth(node.right);
            
            return leftWidth + rightWidth + siblingGap;
        };
        
        // Second pass: assign positions
        const assignPositions = (node, x, y, availableWidth) => {
            if (!node) return;
            
            positions[node.id] = {
                x: x + availableWidth / 2,
                y: y,
                width: nodeWidth,
                height: nodeHeight
            };
            
            if (!node.isLeaf) {
                const leftWidth = getSubtreeWidth(node.left);
                const rightWidth = getSubtreeWidth(node.right);
                const totalWidth = leftWidth + rightWidth + siblingGap;
                
                const leftStart = x + (availableWidth - totalWidth) / 2;
                
                assignPositions(node.left, leftStart, y + levelHeight, leftWidth);
                assignPositions(node.right, leftStart + leftWidth + siblingGap, y + levelHeight, rightWidth);
            }
        };
        
        const totalWidth = getSubtreeWidth(root);
        assignPositions(root, 50, 50, totalWidth);
        
        // Calculate bounds
        let maxX = 0, maxY = 0;
        for (const id in positions) {
            const pos = positions[id];
            maxX = Math.max(maxX, pos.x + nodeWidth / 2);
            maxY = Math.max(maxY, pos.y + nodeHeight);
        }
        
        return {
            positions,
            width: maxX + 50,
            height: maxY + 50
        };
    }

    /**
     * Render edges between nodes
     */
    renderEdges(node, positions, group) {
        if (!node || node.isLeaf) return;
        
        const parentPos = positions[node.id];
        const parentX = parentPos.x;
        const parentY = parentPos.y + this.options.nodeHeight;
        
        // Draw edge to left child
        if (node.left) {
            const leftPos = positions[node.left.id];
            const leftX = leftPos.x;
            const leftY = leftPos.y;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midY = parentY + (leftY - parentY) / 2;
            path.setAttribute('d', `M${parentX},${parentY} C${parentX},${midY} ${leftX},${midY} ${leftX},${leftY}`);
            path.setAttribute('class', 'tree-edge');
            group.appendChild(path);
            
            // Edge label
            const labelText = this.getEdgeLabel(node, 'left');
            if (labelText) {
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', (parentX + leftX) / 2 - 20);
                label.setAttribute('y', midY - 5);
                label.setAttribute('class', 'edge-label');
                label.textContent = labelText;
                group.appendChild(label);
            }
            
            this.renderEdges(node.left, positions, group);
        }
        
        // Draw edge to right child
        if (node.right) {
            const rightPos = positions[node.right.id];
            const rightX = rightPos.x;
            const rightY = rightPos.y;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midY = parentY + (rightY - parentY) / 2;
            path.setAttribute('d', `M${parentX},${parentY} C${parentX},${midY} ${rightX},${midY} ${rightX},${rightY}`);
            path.setAttribute('class', 'tree-edge');
            group.appendChild(path);
            
            // Edge label
            const labelText = this.getEdgeLabel(node, 'right');
            if (labelText) {
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', (parentX + rightX) / 2 + 5);
                label.setAttribute('y', midY - 5);
                label.setAttribute('class', 'edge-label');
                label.textContent = labelText;
                group.appendChild(label);
            }
            
            this.renderEdges(node.right, positions, group);
        }
    }

    /**
     * Get edge label text
     */
    getEdgeLabel(node, direction) {
        if (!node.split) return '';
        
        if (node.split.type === 'continuous') {
            return direction === 'left' ? '≤' : '>';
        } else {
            return direction === 'left' ? 'Yes' : 'No';
        }
    }

    /**
     * Render all nodes
     */
    renderNodes(node, positions, group, classes) {
        if (!node) return;
        
        const pos = positions[node.id];
        this.renderNode(node, pos, group, classes);
        
        if (!node.isLeaf) {
            this.renderNodes(node.left, positions, group, classes);
            this.renderNodes(node.right, positions, group, classes);
        }
    }

    /**
     * Render a single node
     */
    renderNode(node, pos, group, classes) {
        const { nodeWidth, nodeHeight } = this.options;
        const x = pos.x - nodeWidth / 2;
        const y = pos.y;
        
        // Create node group
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.setAttribute('class', `tree-node ${node.isLeaf ? 'leaf' : ''} ${!node.split && !node.isLeaf ? 'unsplit' : ''}`);
        nodeGroup.setAttribute('data-node-id', node.id);
        
        // Node rectangle
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', nodeWidth);
        rect.setAttribute('height', nodeHeight);
        rect.setAttribute('class', 'node-rect');
        
        // Color leaf nodes by prediction
        if (node.isLeaf) {
            const colorIndex = classes.indexOf(node.prediction);
            const colors = ['#dcfce7', '#fee2e2', '#fef3c7', '#dbeafe', '#f3e8ff'];
            rect.style.fill = colors[colorIndex % colors.length];
        }
        
        nodeGroup.appendChild(rect);
        
        // Node content
        if (node.isLeaf) {
            this.renderLeafContent(node, x, y, nodeWidth, nodeHeight, nodeGroup);
        } else if (node.split) {
            this.renderSplitContent(node, x, y, nodeWidth, nodeHeight, nodeGroup);
        } else {
            this.renderUnsplitContent(node, x, y, nodeWidth, nodeHeight, nodeGroup);
        }
        
        // Click handler
        nodeGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleNodeClick(node);
        });
        
        group.appendChild(nodeGroup);
    }

    /**
     * Render content for a split (decision) node
     */
    renderSplitContent(node, x, y, width, height, group) {
        // Split rule
        let ruleText = '';
        if (node.split.type === 'continuous') {
            ruleText = `${node.split.feature} ≤ ${node.split.threshold.toFixed(1)}`;
        } else {
            const cats = node.split.leftCategories.length <= 2 
                ? node.split.leftCategories.join(', ')
                : `${node.split.leftCategories.length} categories`;
            ruleText = `${node.split.feature}: ${cats}`;
        }
        
        // Truncate if too long
        if (ruleText.length > 22) {
            ruleText = ruleText.substring(0, 20) + '...';
        }
        
        const ruleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        ruleLabel.setAttribute('x', x + width / 2);
        ruleLabel.setAttribute('y', y + 20);
        ruleLabel.setAttribute('text-anchor', 'middle');
        ruleLabel.setAttribute('class', 'node-text rule');
        ruleLabel.textContent = ruleText;
        group.appendChild(ruleLabel);
        
        // Sample count
        const countLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        countLabel.setAttribute('x', x + width / 2);
        countLabel.setAttribute('y', y + 35);
        countLabel.setAttribute('text-anchor', 'middle');
        countLabel.setAttribute('class', 'node-text count');
        countLabel.textContent = `n = ${node.n}`;
        group.appendChild(countLabel);
        
        // Distribution bar
        this.renderDistributionBar(node, x + 10, y + 45, width - 20, 15, group);
    }

    /**
     * Render content for a leaf node
     */
    renderLeafContent(node, x, y, width, height, group) {
        // Prediction with leaf icon
        const predLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        predLabel.setAttribute('x', x + width / 2);
        predLabel.setAttribute('y', y + 22);
        predLabel.setAttribute('text-anchor', 'middle');
        predLabel.setAttribute('class', 'node-text prediction');
        predLabel.textContent = `🍃 ${node.prediction}`;
        group.appendChild(predLabel);
        
        // Count and confidence
        const statsLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        statsLabel.setAttribute('x', x + width / 2);
        statsLabel.setAttribute('y', y + 38);
        statsLabel.setAttribute('text-anchor', 'middle');
        statsLabel.setAttribute('class', 'node-text count');
        statsLabel.textContent = `n = ${node.n}  •  ${(node.confidence * 100).toFixed(0)}%`;
        group.appendChild(statsLabel);
        
        // Distribution bar
        this.renderDistributionBar(node, x + 10, y + 48, width - 20, 12, group);
    }

    /**
     * Render content for an unsplit node (manual mode)
     */
    renderUnsplitContent(node, x, y, width, height, group) {
        // "Click to split" text
        const clickLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        clickLabel.setAttribute('x', x + width / 2);
        clickLabel.setAttribute('y', y + 20);
        clickLabel.setAttribute('text-anchor', 'middle');
        clickLabel.setAttribute('class', 'node-text rule');
        clickLabel.textContent = '❓ Click to Split';
        group.appendChild(clickLabel);
        
        // Sample count
        const countLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        countLabel.setAttribute('x', x + width / 2);
        countLabel.setAttribute('y', y + 35);
        countLabel.setAttribute('text-anchor', 'middle');
        countLabel.setAttribute('class', 'node-text count');
        countLabel.textContent = `n = ${node.n}`;
        group.appendChild(countLabel);
        
        // Distribution bar
        this.renderDistributionBar(node, x + 10, y + 45, width - 20, 15, group);
    }

    /**
     * Render class distribution bar
     */
    renderDistributionBar(node, x, y, width, height, group) {
        // Background
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', x);
        bgRect.setAttribute('y', y);
        bgRect.setAttribute('width', width);
        bgRect.setAttribute('height', height);
        bgRect.setAttribute('class', 'dist-bar-bg');
        group.appendChild(bgRect);
        
        // Stacked bars for each class
        const colors = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#a855f7'];
        let currentX = x;
        const total = node.n;
        
        let classIndex = 0;
        for (const cls in node.distribution) {
            const count = node.distribution[cls];
            if (count > 0) {
                const barWidth = (count / total) * width;
                
                const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                bar.setAttribute('x', currentX);
                bar.setAttribute('y', y);
                bar.setAttribute('width', barWidth);
                bar.setAttribute('height', height);
                bar.setAttribute('fill', colors[classIndex % colors.length]);
                bar.setAttribute('class', 'dist-bar-fill');
                group.appendChild(bar);
                
                currentX += barWidth;
            }
            classIndex++;
        }
        
        // Majority class percentage
        const majorityPct = (node.confidence * 100).toFixed(0);
        const pctLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        pctLabel.setAttribute('x', x + width + 5);
        pctLabel.setAttribute('y', y + height - 3);
        pctLabel.setAttribute('class', 'node-text count');
        pctLabel.setAttribute('font-size', '10');
        pctLabel.textContent = `${majorityPct}%`;
        group.appendChild(pctLabel);
    }

    /**
     * Handle node click
     */
    handleNodeClick(node) {
        // Update selection
        if (this.selectedNodeId) {
            const prevSelected = this.svg.querySelector(`[data-node-id="${this.selectedNodeId}"]`);
            if (prevSelected) {
                prevSelected.classList.remove('selected');
            }
        }
        
        this.selectedNodeId = node.id;
        const nodeEl = this.svg.querySelector(`[data-node-id="${node.id}"]`);
        if (nodeEl) {
            nodeEl.classList.add('selected');
        }
        
        // Callback
        if (this.onNodeClick) {
            this.onNodeClick(node);
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        if (this.selectedNodeId) {
            const prevSelected = this.svg.querySelector(`[data-node-id="${this.selectedNodeId}"]`);
            if (prevSelected) {
                prevSelected.classList.remove('selected');
            }
            this.selectedNodeId = null;
        }
    }
}

// Export
window.TreeVisualizer = TreeVisualizer;
