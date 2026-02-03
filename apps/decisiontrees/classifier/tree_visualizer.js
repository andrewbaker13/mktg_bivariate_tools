/**
 * Decision Tree Visualizer
 * Renders the tree as SVG with pan, zoom, and click-to-view functionality
 */

class TreeVisualizer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            nodeWidth: 240,
            nodeHeight: 110,
            levelHeight: 190,
            siblingGap: 60,
            ...options
        };
        this.svg = null;
        this.treeData = null;
        this.selectedNodeId = null;
        this.onNodeClick = options.onNodeClick || null;
        this.mode = 'auto'; // 'auto' or 'manual'
        
        // Pan and zoom state
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.startPanX = 0;
        this.startPanY = 0;
        this.minScale = 0.3;
        this.maxScale = 2.5;
        this.contentGroup = null;
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
        
        // Create SVG with larger viewBox for zoom headroom
        const svgWidth = Math.max(800, layout.width + 100);
        const svgHeight = Math.max(400, layout.height + 100);
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('class', 'tree-svg');
        this.svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', Math.max(500, svgHeight));
        this.svg.style.cursor = 'grab';
        
        // Create main content group for transforms (pan/zoom)
        this.contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.contentGroup.setAttribute('class', 'tree-content');
        
        // Create groups for edges and nodes (edges behind nodes)
        const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        edgesGroup.setAttribute('class', 'edges-group');
        
        const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodesGroup.setAttribute('class', 'nodes-group');
        
        // Store root sample count for proportional edge thickness
        this.rootSampleCount = treeData.root.n || 1;
        
        // Render edges first
        this.renderEdges(treeData.root, layout.positions, edgesGroup);
        
        // Render nodes
        this.renderNodes(treeData.root, layout.positions, nodesGroup, treeData.classes);
        
        this.contentGroup.appendChild(edgesGroup);
        this.contentGroup.appendChild(nodesGroup);
        this.svg.appendChild(this.contentGroup);
        
        // Create zoom controls
        const controls = this.createZoomControls();
        this.container.appendChild(controls);
        this.container.appendChild(this.svg);
        
        // Setup pan/zoom handlers
        this.setupPanZoom(svgWidth, svgHeight);
        
        // Reset to fit view
        this.resetView(svgWidth, svgHeight);
    }
    
    /**
     * Create zoom control buttons
     */
    createZoomControls() {
        const controls = document.createElement('div');
        controls.className = 'tree-zoom-controls';
        controls.innerHTML = `
            <button type="button" class="zoom-btn" id="zoom-in" title="Zoom In">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
            </button>
            <span class="zoom-level" id="zoom-level">100%</span>
            <button type="button" class="zoom-btn" id="zoom-out" title="Zoom Out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
            </button>
            <button type="button" class="zoom-btn" id="zoom-fit" title="Fit to View">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            </button>
        `;
        
        // Add event listeners
        controls.querySelector('#zoom-in').addEventListener('click', () => this.zoom(1.25));
        controls.querySelector('#zoom-out').addEventListener('click', () => this.zoom(0.8));
        controls.querySelector('#zoom-fit').addEventListener('click', () => this.resetView());
        
        return controls;
    }
    
    /**
     * Setup pan and zoom event handlers
     */
    setupPanZoom(svgWidth, svgHeight) {
        // Store viewBox dimensions for coordinate conversion
        this.svgWidth = svgWidth;
        this.svgHeight = svgHeight;
        
        // Helper to convert screen delta to SVG delta
        const screenToSvgDelta = (screenDeltaX, screenDeltaY) => {
            const rect = this.svg.getBoundingClientRect();
            const viewBox = this.svg.viewBox.baseVal;
            return {
                x: (screenDeltaX / rect.width) * viewBox.width,
                y: (screenDeltaY / rect.height) * viewBox.height
            };
        };
        
        // Mouse wheel zoom
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            
            // Get mouse position relative to SVG
            const rect = this.svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Convert to SVG coordinates
            const viewBox = this.svg.viewBox.baseVal;
            const svgX = (mouseX / rect.width) * viewBox.width;
            const svgY = (mouseY / rect.height) * viewBox.height;
            
            this.zoomAtPoint(zoomFactor, svgX, svgY);
        });
        
        // Pan with mouse drag
        let lastClientX = 0;
        let lastClientY = 0;
        
        this.svg.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.isPanning = true;
                lastClientX = e.clientX;
                lastClientY = e.clientY;
                this.svg.style.cursor = 'grabbing';
                e.preventDefault(); // Prevent text selection
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isPanning && this.svg) {
                const deltaScreen = {
                    x: e.clientX - lastClientX,
                    y: e.clientY - lastClientY
                };
                const deltaSvg = screenToSvgDelta(deltaScreen.x, deltaScreen.y);
                
                this.panX += deltaSvg.x;
                this.panY += deltaSvg.y;
                this.updateTransform();
                
                lastClientX = e.clientX;
                lastClientY = e.clientY;
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                if (this.svg) this.svg.style.cursor = 'grab';
            }
        });
        
        // Touch support for mobile
        let lastTouchX = 0;
        let lastTouchY = 0;
        let lastTouchDist = 0;
        
        this.svg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isPanning = true;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                lastTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        });
        
        this.svg.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this.isPanning) {
                const deltaScreen = {
                    x: e.touches[0].clientX - lastTouchX,
                    y: e.touches[0].clientY - lastTouchY
                };
                const deltaSvg = screenToSvgDelta(deltaScreen.x, deltaScreen.y);
                
                this.panX += deltaSvg.x;
                this.panY += deltaSvg.y;
                this.updateTransform();
                
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                if (lastTouchDist > 0) {
                    this.zoom(dist / lastTouchDist);
                }
                lastTouchDist = dist;
            }
        });
        
        this.svg.addEventListener('touchend', () => {
            this.isPanning = false;
            lastTouchDist = 0;
        });
    }
    
    /**
     * Zoom by a factor
     */
    zoom(factor) {
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
        if (newScale !== this.scale) {
            this.scale = newScale;
            this.updateTransform();
            this.updateZoomDisplay();
        }
    }
    
    /**
     * Zoom at a specific point (for mouse wheel zoom)
     */
    zoomAtPoint(factor, pointX, pointY) {
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
        if (newScale !== this.scale) {
            // Adjust pan to zoom toward mouse position
            const scaleChange = newScale / this.scale;
            this.panX = pointX - scaleChange * (pointX - this.panX);
            this.panY = pointY - scaleChange * (pointY - this.panY);
            this.scale = newScale;
            this.updateTransform();
            this.updateZoomDisplay();
        }
    }
    
    /**
     * Reset view to fit the tree
     */
    resetView(svgWidth, svgHeight) {
        // Get actual dimensions if not provided
        if (!svgWidth && this.svg) {
            const viewBox = this.svg.viewBox.baseVal;
            svgWidth = viewBox.width;
            svgHeight = viewBox.height;
        }
        
        // Reset to default scale that shows tree nicely
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.updateZoomDisplay();
    }
    
    /**
     * Update the SVG transform
     */
    updateTransform() {
        if (this.contentGroup) {
            this.contentGroup.setAttribute('transform', 
                `translate(${this.panX}, ${this.panY}) scale(${this.scale})`
            );
        }
    }
    
    /**
     * Update zoom level display
     */
    updateZoomDisplay() {
        const display = this.container.querySelector('#zoom-level');
        if (display) {
            display.textContent = `${Math.round(this.scale * 100)}%`;
        }
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
            // Treat node as leaf if it has no children (even if isLeaf is false - manual mode pending)
            if (!node.left && !node.right) return nodeWidth;
            
            const leftWidth = getSubtreeWidth(node.left);
            const rightWidth = getSubtreeWidth(node.right);
            
            // Ensure minimum width for each subtree
            const effectiveLeft = leftWidth || nodeWidth;
            const effectiveRight = rightWidth || nodeWidth;
            
            return effectiveLeft + effectiveRight + siblingGap;
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
            
            // Only process children if they exist
            if (node.left || node.right) {
                const leftWidth = getSubtreeWidth(node.left) || nodeWidth;
                const rightWidth = getSubtreeWidth(node.right) || nodeWidth;
                const totalWidth = leftWidth + rightWidth + siblingGap;
                
                const leftStart = x + (availableWidth - totalWidth) / 2;
                
                if (node.left) {
                    assignPositions(node.left, leftStart, y + levelHeight, leftWidth);
                }
                if (node.right) {
                    assignPositions(node.right, leftStart + leftWidth + siblingGap, y + levelHeight, rightWidth);
                }
            }
        };
        
        const totalWidth = getSubtreeWidth(root);
        // Center the tree by starting at a position that accounts for the total width
        const startX = Math.max(50, (800 - totalWidth) / 2);
        assignPositions(root, startX, 50, totalWidth);
        
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
     * Render edges between nodes with proportional thickness
     */
    renderEdges(node, positions, group) {
        if (!node || node.isLeaf) return;
        
        const parentPos = positions[node.id];
        const parentX = parentPos.x;
        const parentY = parentPos.y + this.options.nodeHeight;
        
        // Edge thickness settings
        const minStroke = 2;    // Minimum stroke width
        const maxStroke = 10;   // Maximum stroke width (5x the minimum)
        
        // Draw edge to left child
        if (node.left) {
            const leftPos = positions[node.left.id];
            const leftX = leftPos.x;
            const leftY = leftPos.y;
            
            // Calculate stroke width based on sample proportion
            const sampleRatio = (node.left.n || 0) / this.rootSampleCount;
            const strokeWidth = minStroke + (maxStroke - minStroke) * sampleRatio;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midY = parentY + (leftY - parentY) / 2;
            path.setAttribute('d', `M${parentX},${parentY} C${parentX},${midY} ${leftX},${midY} ${leftX},${leftY}`);
            path.setAttribute('class', 'tree-edge');
            path.setAttribute('stroke-width', strokeWidth);
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
            
            // Calculate stroke width based on sample proportion
            const sampleRatio = (node.right.n || 0) / this.rootSampleCount;
            const strokeWidth = minStroke + (maxStroke - minStroke) * sampleRatio;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midY = parentY + (rightY - parentY) / 2;
            path.setAttribute('d', `M${parentX},${parentY} C${parentX},${midY} ${rightX},${midY} ${rightX},${rightY}`);
            path.setAttribute('class', 'tree-edge');
            path.setAttribute('stroke-width', strokeWidth);
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
        
        // Distribution bar (positioned to leave room for % labels below)
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
        
        // Distribution bar (positioned to leave room for % labels below)
        this.renderDistributionBar(node, x + 10, y + 45, width - 20, 14, group);
    }

    /**
     * Render class distribution bar with percentages underneath
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
        
        // Collect bar info for labels
        const bars = [];
        let classIndex = 0;
        
        for (const cls in node.distribution) {
            const count = node.distribution[cls];
            const pct = (count / total) * 100;
            const barWidth = (pct / 100) * width;
            
            if (count > 0) {
                const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                bar.setAttribute('x', currentX);
                bar.setAttribute('y', y);
                bar.setAttribute('width', barWidth);
                bar.setAttribute('height', height);
                bar.setAttribute('fill', colors[classIndex % colors.length]);
                bar.setAttribute('class', 'dist-bar-fill');
                group.appendChild(bar);
                
                // Store bar info for percentage label
                bars.push({
                    centerX: currentX + barWidth / 2,
                    pct: pct,
                    color: colors[classIndex % colors.length],
                    width: barWidth
                });
                
                currentX += barWidth;
            }
            classIndex++;
        }
        
        // Add percentage labels centered underneath each bar segment
        bars.forEach(bar => {
            // Only show label if bar is wide enough (> 15% of total width)
            if (bar.width >= width * 0.15) {
                const pctLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                pctLabel.setAttribute('x', bar.centerX);
                pctLabel.setAttribute('y', y + height + 12);
                pctLabel.setAttribute('text-anchor', 'middle');
                pctLabel.setAttribute('class', 'node-text pct-label');
                pctLabel.setAttribute('fill', bar.color);
                pctLabel.textContent = `${bar.pct.toFixed(0)}%`;
                group.appendChild(pctLabel);
            }
        });
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
