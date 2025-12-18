/**
 * Line Fit Game Module
 * Scatter plot regression line drawing game
 */

// Game state management
let lineFitState = {
    mode: 'waiting', // waiting | placing_first | placing_second | proposed | confirmed
    scatterData: null,
    point1: null,
    point2: null,
    proposedLine: null,
    otherLines: [], // Lines from other players
    config: null,
    canvas: null,
    ctx: null,
    canvasMargins: { top: 40, right: 40, bottom: 60, left: 60 }
};

/**
 * Initialize and display the Line Fit game
 */
function showLineFitGame(message, timeLimit) {
    console.log('[LINE FIT] Initializing game:', message);
    
    // Parse game config
    let gameConfig = message.game_config;
    if (typeof gameConfig === 'string') {
        try {
            gameConfig = JSON.parse(gameConfig);
        } catch (e) {
            console.error('Failed to parse game_config:', e);
            gameConfig = {};
        }
    }
    
    lineFitState.config = gameConfig;
    lineFitState.mode = 'waiting';
    lineFitState.point1 = null;
    lineFitState.point2 = null;
    lineFitState.proposedLine = null;
    lineFitState.otherLines = [];
    
    // Create game UI
    const imageHTML = message.image_url ? 
        `<img src="${message.image_url}" alt="Question image" style="max-width: 100%; max-height: 20vh; margin: 0.5rem auto; border-radius: 8px; display: block; object-fit: contain;">` : '';
    
    // Projector mode: show large scatter plot with submission tracking
    if (window.isProjectorMode) {
        // Get player count from message.players or window.latestPlayers
        const playerCount = message.players?.length || window.latestPlayers?.length || 0;
        
        document.getElementById('gameArea').innerHTML = `
            <div class="line-fit-area">
                <div class="question-display" style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: nowrap; margin: 20px 0;">
                    <div class="timer" id="timer" style="font-size: 80px; font-weight: 800; color: #ef4444; text-align: center; background: white; border-radius: 16px; padding: 20px 40px; flex-shrink: 0; min-width: 120px;">${timeLimit}</div>
                    <div class="question-text" style="font-size: 48px; font-weight: 700; text-align: center; background: white; border-radius: 16px; padding: 30px 50px; color: #1e293b; flex: 1; max-width: 70%;">${message.question_text}</div>
                </div>
                ${imageHTML}
                
                <div class="line-fit-container" style="max-width: 1200px; margin: 0 auto;">
                    <canvas id="scatterCanvas" width="900" height="700" style="width: 100%; height: auto;"></canvas>
                    <div id="canvasInstructions" class="canvas-instructions" style="font-size: 32px; margin-top: 20px;">
                        Waiting for scatter data...
                    </div>
                </div>
                
                <div id="lineFitParticipation" style="margin-top: 40px; text-align: center; background: #f8fafc; padding: 30px; border-radius: 16px;">
                    <div style="font-size: 48px; font-weight: 700; color: #64748b; margin: 20px 0;">
                        <span id="submissionCount">0</span> / <span id="totalPlayers">${playerCount}</span> Players Submitted
                    </div>
                    <div style="font-size: 64px; font-weight: 800; color: #1e293b;">
                        <span id="submissionPercent">0</span>%
                    </div>
                </div>
            </div>
        `;
        
        // Initialize submission tracking
        if (!window.lineFitParticipation) {
            window.lineFitParticipation = {
                totalPlayers: playerCount,
                submittedPlayers: new Set()
            };
        }
        
        // Wait for DOM and initialize canvas
        setTimeout(() => {
            lineFitState.canvas = document.getElementById('scatterCanvas');
            if (lineFitState.canvas) {
                lineFitState.ctx = lineFitState.canvas.getContext('2d');
                lineFitState.canvas.style.background = '#ffffff';
                lineFitState.canvas.style.borderRadius = '8px';
                lineFitState.canvas.style.border = '2px solid #d1d5db';
                
                if (lineFitState.scatterData) {
                    processScatterData();
                }
            }
        }, 0);
        return;
    }
    
    // Player mode: show interactive canvas with controls
    document.getElementById('gameArea').innerHTML = `
        <div class="line-fit-area">
            <div class="question-display">
                <div class="question-text">${message.question_text}</div>
                ${imageHTML}
                <div class="timer" id="timer">${timeLimit}</div>
            </div>
            
            <div class="line-fit-container">
                <div id="lineStats" class="line-stats" style="display: none; text-align: center; margin-bottom: 1rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 2px solid #3b82f6;">
                    <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">Your Predicted Line</div>
                    <div id="lineEquation" style="font-size: 20px; font-weight: 700; color: #3b82f6; margin-bottom: 0.25rem;"></div>
                    <div id="lineCorrelation" style="font-size: 18px; font-weight: 600; color: #8b5cf6;"></div>
                </div>
                <canvas id="scatterCanvas" width="600" height="500"></canvas>
                <div id="canvasInstructions" class="canvas-instructions">
                    Waiting for scatter data...
                </div>
            </div>
            
            <div class="line-fit-controls" id="lineFitControls" style="display: none;">
                <button class="line-fit-btn confirm-btn" id="confirmBtn" onclick="confirmLineFit()" disabled>
                    Confirm Line
                </button>
                <button class="line-fit-btn redraw-btn" id="redrawBtn" onclick="redrawLineFit()" disabled>
                    Redraw
                </button>
            </div>
            
            <div id="feedback"></div>
        </div>
    `;
    
    // Wait for DOM to update, then initialize canvas
    setTimeout(() => {
        lineFitState.canvas = document.getElementById('scatterCanvas');
        if (lineFitState.canvas) {
            lineFitState.ctx = lineFitState.canvas.getContext('2d');
            
            // Set up canvas click handler
            lineFitState.canvas.addEventListener('click', handleCanvasClick);
            
            // Style the canvas
            lineFitState.canvas.style.background = '#ffffff';
            lineFitState.canvas.style.borderRadius = '8px';
            lineFitState.canvas.style.cursor = 'crosshair';
            lineFitState.canvas.style.border = '2px solid #d1d5db';
            
            console.log('[LINE FIT] Canvas initialized, checking for stored data...');
            
            // If data arrived before UI was ready, process it now
            if (lineFitState.scatterData) {
                console.log('[LINE FIT] Processing stored scatter data');
                processScatterData();
            }
        } else {
            console.error('[LINE FIT] Canvas element not found!');
        }
    }, 0);
}

/**
 * Handle incoming scatter data from server
 */
function handleLineFitData(message) {
    console.log('[LINE FIT] Received scatter data:', message);
    
    // Convert points from [[x,y], [x,y]] arrays to [{x,y}, {x,y}] objects
    if (message.points && Array.isArray(message.points)) {
        message.points = message.points.map(p => ({ x: p[0], y: p[1] }));
    }
    
    // Store the entire message (has points, bounds, axis_labels)
    lineFitState.scatterData = message;
    
    // Check if UI is ready (canvas exists)
    if (!lineFitState.canvas || !lineFitState.ctx) {
        console.log('[LINE FIT] Data received but UI not ready yet, waiting...');
        // UI will call processScatterData() when ready
        return;
    }
    
    // UI is ready, process immediately
    processScatterData();
}

/**
 * Process scatter data after UI is ready
 */
function processScatterData() {
    if (!lineFitState.scatterData) {
        console.warn('[LINE FIT] No scatter data to process');
        return;
    }
    
    lineFitState.mode = 'placing_first';
    
    // Update instructions (hide in projector mode)
    const instructions = document.getElementById('canvasInstructions');
    if (instructions) {
        if (window.isProjectorMode) {
            instructions.style.display = 'none';
        } else {
            instructions.innerHTML = '🎯 Click to place your FIRST point';
            instructions.style.color = '#06b6d4'; // Cyan
        }
    }
    
    // Show controls (only in player mode)
    const controls = document.getElementById('lineFitControls');
    if (controls && !window.isProjectorMode) {
        controls.style.display = 'flex';
    }
    
    // Draw scatter plot
    drawScatterPlot();
}

/**
 * Handle canvas click events
 */
function handleCanvasClick(event) {
    if (lineFitState.mode === 'confirmed' || lineFitState.mode === 'waiting') {
        return; // Ignore clicks when confirmed or waiting
    }
    
    const rect = lineFitState.canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    // Convert canvas coordinates to data coordinates
    const dataCoords = canvasToData(canvasX, canvasY);
    
    if (lineFitState.mode === 'placing_first') {
        // Place first point
        lineFitState.point1 = dataCoords;
        lineFitState.mode = 'placing_second';
        
        const instructions = document.getElementById('canvasInstructions');
        if (instructions) {
            instructions.innerHTML = '🎯 Click to place your SECOND point';
        }
        
        // Redraw with first point
        drawScatterPlot();
        
    } else if (lineFitState.mode === 'placing_second') {
        // Place second point
        const proposedPoint2 = dataCoords;
        
        // Validate minimum distance (5% of axis range)
        if (!validateMinimumDistance(lineFitState.point1, proposedPoint2)) {
            showFeedback('⚠️ Points must be at least 5% of axis range apart', 'warning');
            return;
        }
        
        lineFitState.point2 = proposedPoint2;
        
        // Calculate line from two points
        calculateLineFromPoints();
        
        // Send proposal to server
        sendLineProposal();
        
        lineFitState.mode = 'proposed';
        
        const instructions = document.getElementById('canvasInstructions');
        if (instructions) {
            instructions.innerHTML = '✅ Line proposed! Confirm or redraw';
            instructions.style.color = '#10b981'; // Green
        }
        
        // Enable buttons
        document.getElementById('confirmBtn').disabled = false;
        document.getElementById('redrawBtn').disabled = false;
        
        // Redraw with full line
        drawScatterPlot();
        
    } else if (lineFitState.mode === 'proposed') {
        // Already have a line, ignore clicks (must redraw first)
        return;
    }
}

/**
 * Validate minimum distance between two points (5% rule)
 */
function validateMinimumDistance(p1, p2) {
    const config = lineFitState.config;
    const xRange = config.x_max - config.x_min;
    const yRange = config.y_max - config.y_min;
    
    const minXDistance = xRange * 0.05;
    const minYDistance = yRange * 0.05;
    
    const xDistance = Math.abs(p2.x - p1.x);
    const yDistance = Math.abs(p2.y - p1.y);
    
    // Must satisfy EITHER x or y minimum distance
    return (xDistance >= minXDistance || yDistance >= minYDistance);
}

/**
 * Calculate line (slope and intercept) from two points
 */
function calculateLineFromPoints() {
    const p1 = lineFitState.point1;
    const p2 = lineFitState.point2;
    
    let slope, intercept;
    
    // Handle near-vertical lines (nudge to prevent division by zero)
    if (Math.abs(p2.x - p1.x) < 0.0001) {
        // Nudge x slightly
        const nudgedX2 = p1.x + 0.001;
        slope = (p2.y - p1.y) / (nudgedX2 - p1.x);
        intercept = p1.y - slope * p1.x;
    } else {
        slope = (p2.y - p1.y) / (p2.x - p1.x);
        intercept = p1.y - slope * p1.x;
    }
    
    lineFitState.proposedLine = { slope, intercept };
    
    console.log('[LINE FIT] Calculated line:', lineFitState.proposedLine);
    
    // Calculate and display predicted correlation
    updateLineStats();
}

/**
 * Calculate correlation coefficient (r) for the proposed line
 * Uses R² (coefficient of determination) approach
 */
function calculatePredictedCorrelation() {
    if (!lineFitState.proposedLine || !lineFitState.scatterData) {
        return null;
    }
    
    const points = lineFitState.scatterData.points;
    const { slope, intercept } = lineFitState.proposedLine;
    
    // Calculate actual Y values and their mean
    const actualY = points.map(p => p.y);
    const meanActualY = actualY.reduce((sum, y) => sum + y, 0) / actualY.length;
    
    // Calculate predicted Y values from the player's line
    const predictedY = points.map(p => slope * p.x + intercept);
    
    // Calculate R² (coefficient of determination)
    // R² = 1 - (SS_res / SS_tot)
    // SS_res = sum of squared residuals (actual - predicted)²
    // SS_tot = total sum of squares (actual - mean)²
    
    let ssRes = 0;  // Sum of squared residuals
    let ssTot = 0;  // Total sum of squares
    
    for (let i = 0; i < actualY.length; i++) {
        const residual = actualY[i] - predictedY[i];
        const deviation = actualY[i] - meanActualY;
        
        ssRes += residual * residual;
        ssTot += deviation * deviation;
    }
    
    if (ssTot === 0) {
        return 0;
    }
    
    const rSquared = 1 - (ssRes / ssTot);
    
    // R² can be negative if the line is worse than just using the mean
    // For display purposes, clamp to 0 (r = 0 means no linear relationship)
    // Preserve sign based on slope direction
    const clampedRSquared = Math.max(0, rSquared);
    const r = Math.sqrt(clampedRSquared) * (slope >= 0 ? 1 : -1);
    
    return r;
}

/**
 * Update the line statistics display
 */
function updateLineStats() {
    const lineStatsDiv = document.getElementById('lineStats');
    const lineEquationDiv = document.getElementById('lineEquation');
    const lineCorrelationDiv = document.getElementById('lineCorrelation');
    
    if (!lineStatsDiv || !lineEquationDiv || !lineCorrelationDiv) {
        return;
    }
    
    if (!lineFitState.proposedLine) {
        lineStatsDiv.style.display = 'none';
        return;
    }
    
    const { slope, intercept } = lineFitState.proposedLine;
    const r = calculatePredictedCorrelation();
    
    // Format equation
    const slopeStr = slope.toFixed(2);
    const interceptStr = intercept >= 0 ? `+ ${intercept.toFixed(2)}` : `- ${Math.abs(intercept).toFixed(2)}`;
    lineEquationDiv.textContent = `Predicted fit line: y = ${slopeStr}x ${interceptStr}`;
    
    // Format correlation
    if (r !== null) {
        lineCorrelationDiv.textContent = `Predicted r = ${r.toFixed(3)}`;
    } else {
        lineCorrelationDiv.textContent = '';
    }
    
    lineStatsDiv.style.display = 'block';
}

/**
 * Send line proposal to server
 */
function sendLineProposal() {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.error('[LINE FIT] WebSocket not open');
        return;
    }
    
    const message = {
        action: 'line_fit_propose',
        data: {
            player_session_id: playerSession.id,
            x1: lineFitState.point1.x,
            y1: lineFitState.point1.y,
            x2: lineFitState.point2.x,
            y2: lineFitState.point2.y,
            timestamp: Date.now() / 1000
        }
    };
    
    console.log('[LINE FIT] Sending proposal:', message);
    websocket.send(JSON.stringify(message));
}

/**
 * Confirm line submission
 */
function confirmLineFit() {
    if (lineFitState.mode !== 'proposed') {
        return;
    }
    
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.error('[LINE FIT] WebSocket not open');
        return;
    }
    
    const message = {
        action: 'line_fit_confirm',
        data: {
            player_session_id: playerSession.id,
            timestamp: Date.now() / 1000
        }
    };
    
    console.log('[LINE FIT] Confirming line:', message);
    websocket.send(JSON.stringify(message));
    
    lineFitState.mode = 'confirmed';
    
    // Disable buttons
    document.getElementById('confirmBtn').disabled = true;
    document.getElementById('redrawBtn').disabled = true;
    
    // Update instructions
    const instructions = document.getElementById('canvasInstructions');
    if (instructions) {
        instructions.innerHTML = '✅ Line confirmed! Waiting for others...';
        instructions.style.color = '#10b981'; // Green
    }
    
    // Update canvas cursor
    lineFitState.canvas.style.cursor = 'default';
    
    showFeedback('✅ Line confirmed!', 'success');
}

/**
 * Redraw line (clear and start over)
 */
function redrawLineFit() {
    if (lineFitState.mode !== 'proposed') {
        return;
    }
    
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.error('[LINE FIT] WebSocket not open');
        return;
    }
    
    const message = {
        action: 'line_fit_redraw',
        data: {
            player_session_id: playerSession.id,
            timestamp: Date.now() / 1000
        }
    };
    
    console.log('[LINE FIT] Redrawing line');
    websocket.send(JSON.stringify(message));
    
    // Reset state
    lineFitState.point1 = null;
    lineFitState.point2 = null;
    lineFitState.proposedLine = null;
    lineFitState.mode = 'placing_first';
    
    // Hide line stats
    const lineStatsDiv = document.getElementById('lineStats');
    if (lineStatsDiv) {
        lineStatsDiv.style.display = 'none';
    }
    
    // Disable buttons
    document.getElementById('confirmBtn').disabled = true;
    document.getElementById('redrawBtn').disabled = true;
    
    // Update instructions
    const instructions = document.getElementById('canvasInstructions');
    if (instructions) {
        instructions.innerHTML = '🎯 Click to place your FIRST point';
        instructions.style.color = '#06b6d4'; // Cyan
    }
    
    // Redraw scatter plot
    drawScatterPlot();
    
    showFeedback('🔄 Line cleared. Place new points.', 'info');
}

/**
 * Handle submission from other players
 */
function handleLineFitSubmission(message) {
    console.log('[LINE FIT] Player submitted:', message);
    
    // Track submission in projector mode
    if (window.isProjectorMode && window.lineFitParticipation && message.player_id) {
        window.lineFitParticipation.submittedPlayers.add(message.player_id);
        updateLineFitParticipation();
    }
    
    // Don't show own submission (already have it)
    if (message.player_id === playerSession.id) {
        return;
    }
    
    // Add to other lines (anonymous)
    lineFitState.otherLines.push({
        slope: message.slope,
        intercept: message.intercept
    });
    
    // Redraw to show new line
    drawScatterPlot();
}

/**
 * Update projector mode participation display
 */
function updateLineFitParticipation() {
    if (!window.isProjectorMode || !window.lineFitParticipation) return;
    
    const submissionCount = window.lineFitParticipation.submittedPlayers.size;
    const totalPlayers = window.lineFitParticipation.totalPlayers;
    const percent = totalPlayers > 0 ? Math.round((submissionCount / totalPlayers) * 100) : 0;
    
    const countEl = document.getElementById('submissionCount');
    const totalEl = document.getElementById('totalPlayers');
    const percentEl = document.getElementById('submissionPercent');
    
    if (countEl) countEl.textContent = submissionCount;
    if (totalEl) totalEl.textContent = totalPlayers;
    if (percentEl) percentEl.textContent = percent;
}

/**
 * Handle timeout (auto-submit)
 */
function handleLineFitTimeout() {
    console.log('[LINE FIT] Timeout - auto-submitting');
    
    if (lineFitState.mode === 'proposed') {
        // Auto-confirm if line is proposed
        confirmLineFit();
    } else if (lineFitState.mode === 'placing_first' || lineFitState.mode === 'placing_second') {
        // Failed to submit in time
        lineFitState.mode = 'confirmed';
        
        const instructions = document.getElementById('canvasInstructions');
        if (instructions) {
            instructions.innerHTML = '⏱️ Time expired - no line submitted';
            instructions.style.color = '#ef4444'; // Red
        }
        
        lineFitState.canvas.style.cursor = 'default';
        
        showFeedback('⏱️ Time expired - incomplete submission', 'error');
    }
}

/**
 * Convert canvas coordinates to data coordinates
 */
function canvasToData(canvasX, canvasY) {
    const config = lineFitState.config;
    const margins = lineFitState.canvasMargins;
    const canvas = lineFitState.canvas;
    
    const plotWidth = canvas.width - margins.left - margins.right;
    const plotHeight = canvas.height - margins.top - margins.bottom;
    
    // Canvas X to data X (left to right)
    const dataX = config.x_min + ((canvasX - margins.left) / plotWidth) * (config.x_max - config.x_min);
    
    // Canvas Y to data Y (top to bottom, inverted)
    const dataY = config.y_max - ((canvasY - margins.top) / plotHeight) * (config.y_max - config.y_min);
    
    return { x: dataX, y: dataY };
}

/**
 * Convert data coordinates to canvas coordinates
 */
function dataToCanvas(dataX, dataY) {
    const config = lineFitState.config;
    const margins = lineFitState.canvasMargins;
    const canvas = lineFitState.canvas;
    
    const plotWidth = canvas.width - margins.left - margins.right;
    const plotHeight = canvas.height - margins.top - margins.bottom;
    
    // Data X to canvas X
    const canvasX = margins.left + ((dataX - config.x_min) / (config.x_max - config.x_min)) * plotWidth;
    
    // Data Y to canvas Y (inverted)
    const canvasY = margins.top + ((config.y_max - dataY) / (config.y_max - config.y_min)) * plotHeight;
    
    return { x: canvasX, y: canvasY };
}

/**
 * Main drawing function - renders scatter plot and all elements
 */
function drawScatterPlot() {
    const ctx = lineFitState.ctx;
    const canvas = lineFitState.canvas;
    const config = lineFitState.config;
    const margins = lineFitState.canvasMargins;
    
    // Safety check - canvas might not be ready yet
    if (!ctx || !canvas || !config) {
        console.warn('[LINE FIT] Canvas not ready, retrying in 100ms...');
        setTimeout(drawScatterPlot, 100);
        return;
    }
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const plotWidth = canvas.width - margins.left - margins.right;
    const plotHeight = canvas.height - margins.top - margins.bottom;
    const plotLeft = margins.left;
    const plotTop = margins.top;
    
    // Draw axes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // X-axis
    ctx.moveTo(plotLeft, plotTop + plotHeight);
    ctx.lineTo(plotLeft + plotWidth, plotTop + plotHeight);
    // Y-axis
    ctx.moveTo(plotLeft, plotTop);
    ctx.lineTo(plotLeft, plotTop + plotHeight);
    ctx.stroke();
    
    // Draw axis labels
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    
    // X-axis label
    ctx.fillText(config.x_label || 'X', plotLeft + plotWidth / 2, canvas.height - 10);
    
    // Y-axis label (rotated)
    ctx.save();
    ctx.translate(15, plotTop + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(config.y_label || 'Y', 0, 0);
    ctx.restore();
    
    // Draw tick labels
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#000000';
    
    // X-axis ticks (min, middle, max)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xMid = (config.x_min + config.x_max) / 2;
    ctx.fillText(config.x_min.toFixed(1), plotLeft, plotTop + plotHeight + 5);
    ctx.fillText(xMid.toFixed(1), plotLeft + plotWidth / 2, plotTop + plotHeight + 5);
    ctx.fillText(config.x_max.toFixed(1), plotLeft + plotWidth, plotTop + plotHeight + 5);
    
    // Y-axis ticks (min, middle, max)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yMid = (config.y_min + config.y_max) / 2;
    ctx.fillText(config.y_max.toFixed(1), plotLeft - 5, plotTop);
    ctx.fillText(yMid.toFixed(1), plotLeft - 5, plotTop + plotHeight / 2);
    ctx.fillText(config.y_min.toFixed(1), plotLeft - 5, plotTop + plotHeight);
    
    // Draw scatter points (hollow black circles)
    if (lineFitState.scatterData && lineFitState.scatterData.points) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        lineFitState.scatterData.points.forEach(point => {
            const canvasCoords = dataToCanvas(point.x, point.y);
            ctx.beginPath();
            ctx.arc(canvasCoords.x, canvasCoords.y, 5, 0, 2 * Math.PI);
            ctx.stroke();
        });
    }
    
    // Draw other players' lines (gray, semi-transparent)
    ctx.lineWidth = 2;
    lineFitState.otherLines.forEach(line => {
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)'; // Gray with 50% opacity
        drawLine(line.slope, line.intercept);
    });
    
    // Draw player's proposed line (cyan, bright)
    if (lineFitState.proposedLine) {
        ctx.strokeStyle = '#06b6d4'; // Cyan
        ctx.lineWidth = 3;
        drawLine(lineFitState.proposedLine.slope, lineFitState.proposedLine.intercept);
    }
    
    // Draw placement points (if in progress)
    if (lineFitState.point1 && lineFitState.mode === 'placing_second') {
        const p1Canvas = dataToCanvas(lineFitState.point1.x, lineFitState.point1.y);
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(p1Canvas.x, p1Canvas.y, 6, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    if (lineFitState.point1 && lineFitState.point2 && lineFitState.mode === 'proposed') {
        // Draw both placement points for proposed line
        const p1Canvas = dataToCanvas(lineFitState.point1.x, lineFitState.point1.y);
        const p2Canvas = dataToCanvas(lineFitState.point2.x, lineFitState.point2.y);
        
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(p1Canvas.x, p1Canvas.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(p2Canvas.x, p2Canvas.y, 6, 0, 2 * Math.PI);
        ctx.fill();
    }
}

/**
 * Draw a line given slope and intercept
 */
function drawLine(slope, intercept) {
    const ctx = lineFitState.ctx;
    const config = lineFitState.config;
    
    // Calculate y values at x_min and x_max
    const x1 = config.x_min;
    const y1 = slope * x1 + intercept;
    const x2 = config.x_max;
    const y2 = slope * x2 + intercept;
    
    const p1 = dataToCanvas(x1, y1);
    const p2 = dataToCanvas(x2, y2);
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
}

/**
 * Show feedback message
 */
function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    if (!feedback) return;
    
    let className = 'alert';
    if (type === 'success') className += ' alert-success';
    else if (type === 'error') className += ' alert-error';
    else if (type === 'warning') className += ' alert-warning';
    else className += ' alert-info';
    
    feedback.innerHTML = `<div class="${className}">${message}</div>`;
}

/**
 * Start timer for Line Fit game
 */
function startLineFitTimer(seconds, startTime) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const timerEl = document.getElementById('timer');
    const endTime = startTime + (seconds * 1000);
    
    function updateTimer() {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        
        if (timerEl) {
            timerEl.textContent = remaining;
            
            if (remaining <= 5) {
                timerEl.style.color = '#ef4444';
                timerEl.style.animation = 'pulse 0.5s infinite';
            }
        }
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
            handleLineFitTimeout();
            
            // Send timeout to server
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    action: 'line_fit_timeout',
                    data: {
                        player_session_id: playerSession.id
                    }
                }));
            }
        }
    }
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 100);
}

/**
 * Display Line Fit results with scatter plot visualization
 * Shows true regression line, top 3 lines, and all submissions
 */
function showLineFitResults(gameSpecific) {
    if (!gameSpecific || !gameSpecific.scatter_data) {
        return '<div style="color: rgba(255,255,255,0.7); padding: 20px;">Results visualization unavailable</div>';
    }
    
    const gs = gameSpecific;
    const canvasId = 'lineFitResultsCanvas';
    const isProjector = window.isProjectorMode;
    
    // Adjust sizes for projector mode
    const titleSize = isProjector ? '24px' : '14px';
    const equationSize = isProjector ? '48px' : '20px';
    const statsSize = isProjector ? '32px' : '14px';
    const canvasSize = isProjector ? 'width="1200" height="900"' : 'width="600" height="600"';
    const legendSize = isProjector ? '24px' : '14px';
    const legendPadding = isProjector ? '12px 24px' : '8px 16px';
    
    // Calculate player's predicted r from their line (if available)
    let playerPredictedR = null;
    if (gs.your_line && gs.scatter_data) {
        const points = gs.scatter_data.points.map(p => 
            Array.isArray(p) ? { x: p[0], y: p[1] } : p
        );
        const actualY = points.map(p => p.y);
        const meanActualY = actualY.reduce((sum, y) => sum + y, 0) / actualY.length;
        const predictedY = points.map(p => gs.your_line.slope * p.x + gs.your_line.intercept);
        
        let ssRes = 0;
        let ssTot = 0;
        for (let i = 0; i < actualY.length; i++) {
            ssRes += Math.pow(actualY[i] - predictedY[i], 2);
            ssTot += Math.pow(actualY[i] - meanActualY, 2);
        }
        const rSquared = 1 - (ssRes / ssTot);
        playerPredictedR = Math.sqrt(Math.max(0, rSquared)) * (gs.your_line.slope >= 0 ? 1 : -1);
    }
    
    // Create canvas HTML with side-by-side comparison (only show player's line in player mode)
    const headerSize = isProjector ? '32px' : '20px';
    let html = `
        <div style="margin: 20px 0; text-align: center;">
            <div style="display: ${!isProjector && gs.your_line ? 'grid' : 'block'}; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div style="background: rgba(255,215,0,0.15); padding: ${isProjector ? '30px' : '15px'}; border-radius: 8px; border: 2px solid rgba(255,215,0,0.5);">
                    <div style="font-size: ${headerSize}; color: #ffffff; font-weight: 700; margin-bottom: ${isProjector ? '10px' : '5px'};">📈 True Regression Line</div>
                    <div style="font-size: ${equationSize}; font-weight: 700; color: #ffffff;">y = ${gs.true_line.slope.toFixed(3)}x + ${gs.true_line.intercept.toFixed(2)}</div>
                    <div style="font-size: ${statsSize}; color: rgba(255,255,255,0.9); margin-top: ${isProjector ? '10px' : '5px'};">
                        r = ${gs.correlation?.toFixed(3) || '?'} | R² = ${gs.r_squared?.toFixed(3) || '?'}
                    </div>
                </div>
                ${!isProjector && gs.your_line ? `
                <div style="background: rgba(59,130,246,0.15); padding: 15px; border-radius: 8px; border: 2px solid rgba(59,130,246,0.5);">
                    <div style="font-size: ${headerSize}; color: #ffffff; font-weight: 700; margin-bottom: 5px;">📊 Your Prediction Guess</div>
                    <div style="font-size: ${equationSize}; font-weight: 700; color: #ffffff;">y = ${gs.your_line.slope.toFixed(3)}x ${gs.your_line.intercept >= 0 ? '+' : '-'} ${Math.abs(gs.your_line.intercept).toFixed(2)}</div>
                    <div style="font-size: ${statsSize}; color: rgba(255,255,255,0.9); margin-top: 5px;">
                        ${playerPredictedR !== null ? `Predicted r = ${playerPredictedR.toFixed(3)}` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
            <canvas id="${canvasId}" ${canvasSize} style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); background: #1e1e1e;"></canvas>
            <div style="display: flex; gap: ${isProjector ? '25px' : '15px'}; justify-content: center; margin-top: ${isProjector ? '25px' : '15px'}; flex-wrap: wrap;">
                <span style="background: rgba(255,215,0,0.3); padding: ${legendPadding}; border-radius: 20px; font-size: ${legendSize};">🥇 True Line (Gold)</span>
                <span style="background: rgba(16,185,129,0.3); padding: ${legendPadding}; border-radius: 20px; font-size: ${legendSize};">🏆 Top 3 (Green)</span>
                <span style="background: rgba(148,163,184,0.3); padding: ${legendPadding}; border-radius: 20px; font-size: ${legendSize};">📊 All Others (Gray)</span>
            </div>
            ${gs.average_sse !== undefined ? `
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 10px;">
                <span style="background: rgba(99,102,241,0.3); padding: 8px 16px; border-radius: 20px;">📊 Avg SSE: ${gs.average_sse.toFixed(2)}</span>
                <span style="background: rgba(16,185,129,0.3); padding: 8px 16px; border-radius: 20px;">✅ ${gs.submission_count || 0} submissions</span>
            </div>
            ` : ''}
        </div>
    `;
    
    // Defer canvas drawing until DOM is ready
    setTimeout(() => {
        drawLineFitResultsCanvas(canvasId, gs);
    }, 100);
    
    return html;
}

/**
 * Draw the results canvas with scatter plot and all lines
 */
function drawLineFitResultsCanvas(canvasId, gameSpecific) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn('[LINE FIT] Results canvas not found:', canvasId);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const gs = gameSpecific;
    const margins = { top: 40, right: 40, bottom: 60, left: 60 };
    
    // Convert scatter data points from arrays to objects if needed
    const points = gs.scatter_data.points.map(p => 
        Array.isArray(p) ? { x: p[0], y: p[1] } : p
    );
    
    const bounds = gs.scatter_data.bounds || {
        x_min: Math.min(...points.map(p => p.x)),
        x_max: Math.max(...points.map(p => p.x)),
        y_min: Math.min(...points.map(p => p.y)),
        y_max: Math.max(...points.map(p => p.y))
    };
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const plotWidth = canvas.width - margins.left - margins.right;
    const plotHeight = canvas.height - margins.top - margins.bottom;
    const plotLeft = margins.left;
    const plotTop = margins.top;
    
    // Helper function to convert data coordinates to canvas coordinates
    function dataToCanvas(dataX, dataY) {
        const canvasX = plotLeft + ((dataX - bounds.x_min) / (bounds.x_max - bounds.x_min)) * plotWidth;
        const canvasY = plotTop + ((bounds.y_max - dataY) / (bounds.y_max - bounds.y_min)) * plotHeight;
        return { x: canvasX, y: canvasY };
    }
    
    // Helper function to draw a line
    function drawLine(slope, intercept, color, lineWidth, dashed = false) {
        const x1 = bounds.x_min;
        const y1 = slope * x1 + intercept;
        const x2 = bounds.x_max;
        const y2 = slope * x2 + intercept;
        
        const p1 = dataToCanvas(x1, y1);
        const p2 = dataToCanvas(x2, y2);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        
        // Set line dash pattern if requested
        if (dashed) {
            ctx.setLineDash([10, 5]); // 10px dash, 5px gap
        } else {
            ctx.setLineDash([]); // Solid line
        }
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        
        // Reset line dash
        ctx.setLineDash([]);
    }
    
    // Draw axes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // X-axis
    ctx.moveTo(plotLeft, plotTop + plotHeight);
    ctx.lineTo(plotLeft + plotWidth, plotTop + plotHeight);
    // Y-axis
    ctx.moveTo(plotLeft, plotTop);
    ctx.lineTo(plotLeft, plotTop + plotHeight);
    ctx.stroke();
    
    // Draw axis labels
    const axisLabels = gs.scatter_data.axis_labels || { x: 'X', y: 'Y' };
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(axisLabels.x, plotLeft + plotWidth / 2, canvas.height - 10);
    
    // Y-axis label (rotated)
    ctx.save();
    ctx.translate(15, plotTop + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(axisLabels.y, 0, 0);
    ctx.restore();
    
    // Draw tick labels
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#000000';
    
    // X-axis ticks (min, middle, max)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xMid = (bounds.x_min + bounds.x_max) / 2;
    ctx.fillText(bounds.x_min.toFixed(1), plotLeft, plotTop + plotHeight + 5);
    ctx.fillText(xMid.toFixed(1), plotLeft + plotWidth / 2, plotTop + plotHeight + 5);
    ctx.fillText(bounds.x_max.toFixed(1), plotLeft + plotWidth, plotTop + plotHeight + 5);
    
    // Y-axis ticks (min, middle, max)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yMid = (bounds.y_min + bounds.y_max) / 2;
    ctx.fillText(bounds.y_max.toFixed(1), plotLeft - 5, plotTop);
    ctx.fillText(yMid.toFixed(1), plotLeft - 5, plotTop + plotHeight / 2);
    ctx.fillText(bounds.y_min.toFixed(1), plotLeft - 5, plotTop + plotHeight);
    
    // Draw scatter points (hollow black circles)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    points.forEach(point => {
        const canvasCoords = dataToCanvas(point.x, point.y);
        ctx.beginPath();
        ctx.arc(canvasCoords.x, canvasCoords.y, 5, 0, 2 * Math.PI);
        ctx.stroke();
    });
    
    // Debug logging
    console.log('[LINE FIT RESULTS] all_submissions:', gs.all_submissions);
    console.log('[LINE FIT RESULTS] Number of submissions:', gs.all_submissions?.length || 0);
    
    // Find player's submission and their rank
    let playerSubmission = null;
    let playerRank = null;
    if (gs.all_submissions && gs.your_line) {
        playerSubmission = gs.all_submissions.find(sub => 
            sub.player_id === playerSession.id || 
            (Math.abs(sub.slope - gs.your_line.slope) < 0.001 && 
             Math.abs(sub.intercept - gs.your_line.intercept) < 0.001)
        );
        if (playerSubmission) {
            playerRank = playerSubmission.rank;
        }
    }
    
    // Draw all other submissions (gray, thin, semi-transparent) - excluding player's line
    if (gs.all_submissions && gs.all_submissions.length > 3) {
        console.log('[LINE FIT RESULTS] Drawing', gs.all_submissions.length - 3, 'gray lines');
        gs.all_submissions.slice(3).forEach((submission, idx) => {
            // Skip player's line - will draw it separately
            if (submission.player_id === playerSession.id) return;
            
            console.log(`[LINE FIT RESULTS] Gray line ${idx + 4}: slope=${submission.slope}, intercept=${submission.intercept}`);
            drawLine(submission.slope, submission.intercept, 'rgba(156, 163, 175, 0.5)', 2);
        });
    }
    
    // Draw top 3 lines (green, medium thickness) - excluding player's line
    if (gs.all_submissions && gs.all_submissions.length > 0) {
        const top3 = gs.all_submissions.slice(0, Math.min(3, gs.all_submissions.length));
        console.log('[LINE FIT RESULTS] Drawing', top3.length, 'green lines (top 3)');
        top3.forEach((submission, idx) => {
            // Skip player's line - will draw it separately
            if (submission.player_id === playerSession.id) return;
            
            console.log(`[LINE FIT RESULTS] Green line ${idx + 1}: slope=${submission.slope}, intercept=${submission.intercept}`);
            drawLine(submission.slope, submission.intercept, 'rgba(16, 185, 129, 0.5)', 3);
        });
    }
    
    // Draw true regression line (gold, thick, prominent)
    if (gs.true_line) {
        drawLine(gs.true_line.slope, gs.true_line.intercept, '#FFD700', 5);
    }
    
    // Draw player's line last (on top) - thicker and dotted
    // Color depends on ranking: green if top 3, gray otherwise
    if (gs.your_line && !window.isProjectorMode) {
        const playerColor = (playerRank && playerRank <= 3) 
            ? 'rgba(16, 185, 129, 0.9)'  // Green for top 3
            : 'rgba(156, 163, 175, 0.9)'; // Gray for others
        drawLine(gs.your_line.slope, gs.your_line.intercept, playerColor, 4, true);
        console.log(`[LINE FIT RESULTS] Drew player's line (rank: ${playerRank}, color: ${playerColor})`);
    }
}
