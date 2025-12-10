/**
 * Neural Network Playground - Main Controller
 * Marketing Analytics Edition
 */

// API_BASE is already defined in auth_tracking.js
const TOOL_SLUG = 'neural_network';

// Global state
let network = null;
let trainData = [];
let testData = [];
let isTraining = false;
let trainingInterval = null;
let iteration = 0;
let lossHistory = {
    train: [],
    test: []
};

// Configuration
const config = {
    dataset: 'churn',
    features: ['price', 'quality'],
    hiddenLayers: 1,
    neuronsPerLayer: 4,
    learningRate: 0.03,
    activation: 'tanh',
    regularization: 'none',
    noise: 0,
    trainSplit: 0.7
};

// Scenario descriptions with updated variable names
const scenarioInfo = {
    churn: {
        title: "Customer Churn Prediction",
        description: "Predict which subscription customers will churn based on <strong>Months Subscribed</strong> and <strong>Support Tickets</strong>. Longer subscriptions with fewer support issues indicate loyalty. <strong style='color: #3498db;'>Blue = Stay</strong>, <strong style='color: #e74c3c;'>Red = Churn</strong>. Pattern: More months + fewer tickets = retained customer.",
        realWorld: "Used by subscription services (Netflix, Spotify) to identify at-risk customers before they cancel."
    },
    segment: {
        title: "Market Segmentation",
        description: "Identify customer segments using <strong>Income Level</strong> and <strong>Brand Loyalty Score</strong>. Two distinct groups emerge: premium customers (high income, high loyalty) and budget-conscious customers (lower income, lower loyalty). <strong style='color: #3498db;'>Blue = Premium Segment</strong>, <strong style='color: #e74c3c;'>Red = Budget Segment</strong>.",
        realWorld: "Used by companies like Amazon and Target to personalize marketing campaigns for different customer types."
    },
    abtest: {
        title: "A/B Test Conversion Prediction",
        description: "Predict campaign conversions based on <strong>Ad Spend</strong> and <strong>Email Frequency</strong>. The pattern is complex (XOR-like): conversions happen when one factor is high and the other low. Too much or too little of both doesn't work. <strong style='color: #3498db;'>Blue = Converts</strong>, <strong style='color: #e74c3c;'>Red = Bounces</strong>. Requires multiple layers!",
        realWorld: "Used by e-commerce sites and SaaS companies to optimize marketing budget allocation."
    },
    affinity: {
        title: "Product Affinity Analysis",
        description: "Predict product purchase intent using <strong>Page Views</strong> and <strong>Time on Site</strong>. The boundary is <em>circular</em>: moderate engagement shows highest affinity. Too little engagement = not interested, too much = just browsing. <strong style='color: #3498db;'>Blue = High Affinity</strong>, <strong style='color: #e74c3c;'>Red = Low Affinity</strong>.",
        realWorld: "Used by Amazon for 'frequently bought together' recommendations and by retailers for cross-selling."
    }
};

// Feature transformations
function transformFeatures(input) {
    const [x, y] = input;
    const features = [];

    if (config.features.includes('price')) features.push(x);
    if (config.features.includes('quality')) features.push(y);
    if (config.features.includes('priceSquared')) features.push(x * x);
    if (config.features.includes('qualitySquared')) features.push(y * y);
    if (config.features.includes('interaction')) features.push(x * y);

    return features;
}

// Generate dataset
function generateData() {
    const generator = {
        'churn': DataGenerator.customerChurn,
        'segment': DataGenerator.marketSegment,
        'abtest': DataGenerator.abTest,
        'affinity': DataGenerator.productAffinity
    }[config.dataset];

    const allData = generator(500, config.noise);

    // Shuffle
    for (let i = allData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allData[i], allData[j]] = [allData[j], allData[i]];
    }

    // Split train/test
    const splitIndex = Math.floor(allData.length * config.trainSplit);
    trainData = allData.slice(0, splitIndex).map(d => ({
        input: transformFeatures(d.input),
        output: d.output
    }));
    testData = allData.slice(splitIndex).map(d => ({
        input: transformFeatures(d.input),
        output: d.output
    }));

    // Draw dataset previews
    drawDatasetPreviews(allData);
}

// Initialize network
function initializeNetwork() {
    const numInputs = config.features.length;
    const architecture = [numInputs];

    for (let i = 0; i < config.hiddenLayers; i++) {
        architecture.push(config.neuronsPerLayer);
    }

    architecture.push(1); // Output layer

    network = new NeuralNetwork(
        architecture,
        config.activation,
        config.regularization === 'none' ? null : config.regularization
    );

    iteration = 0;
    lossHistory = { train: [], test: [] };
    updateMetrics();
}

// Training step
function trainStep() {
    if (!network) return;

    // Train for one epoch
    network.train(
        trainData.map(d => d.input),
        trainData.map(d => d.output),
        config.learningRate,
        1
    );

    iteration++;

    // Calculate losses every 10 iterations
    if (iteration % 10 === 0) {
        const trainLoss = network.calculateLoss(
            trainData.map(d => d.input),
            trainData.map(d => d.output)
        );
        const testLoss = network.calculateLoss(
            testData.map(d => d.input),
            testData.map(d => d.output)
        );

        lossHistory.train.push(trainLoss);
        lossHistory.test.push(testLoss);

        // Keep last 100 points
        if (lossHistory.train.length > 100) {
            lossHistory.train.shift();
            lossHistory.test.shift();
        }

        updateMetrics();
        updateValidationStatus();
        drawLossChart();
        drawDecisionBoundary();
    }

    drawNetwork();
}

// Update metrics display
function updateMetrics() {
    if (!network) return;

    const trainLoss = network.calculateLoss(
        trainData.map(d => d.input),
        trainData.map(d => d.output)
    );
    const testLoss = network.calculateLoss(
        testData.map(d => d.input),
        testData.map(d => d.output)
    );
    const accuracy = network.calculateAccuracy(
        testData.map(d => d.input),
        testData.map(d => d.output)
    );

    document.getElementById('trainLoss').textContent = trainLoss.toFixed(4);
    document.getElementById('testLoss').textContent = testLoss.toFixed(4);
    document.getElementById('iterations').textContent = iteration;
    document.getElementById('accuracy').textContent = accuracy.toFixed(1) + '%';
}

// Update validation status message
function updateValidationStatus() {
    if (!network) return;

    const trainLoss = network.calculateLoss(
        trainData.map(d => d.input),
        trainData.map(d => d.output)
    );
    const testLoss = network.calculateLoss(
        testData.map(d => d.input),
        testData.map(d => d.output)
    );
    const trainAcc = network.calculateAccuracy(
        trainData.map(d => d.input),
        trainData.map(d => d.output)
    );
    const testAcc = network.calculateAccuracy(
        testData.map(d => d.input),
        testData.map(d => d.output)
    );

    const statusEl = document.getElementById('validationStatus');
    const diff = Math.abs(trainAcc - testAcc);

    let statusMsg = '';
    let bgColor = '';

    if (iteration === 0) {
        statusMsg = 'Train your model to see validation results...';
        bgColor = '#e8f5e9';
    } else if (diff < 5 && testAcc > 80) {
        statusMsg = `✅ <strong>Good fit!</strong> Train accuracy: ${trainAcc.toFixed(1)}%, Test accuracy: ${testAcc.toFixed(1)}%. Model generalizes well to unseen data.`;
        bgColor = '#d4edda';
    } else if (diff > 15) {
        statusMsg = `⚠️ <strong>Possible overfitting.</strong> Train accuracy (${trainAcc.toFixed(1)}%) is much higher than test accuracy (${testAcc.toFixed(1)}%). Model may have memorized training data. Try: reduce layers/neurons, add regularization, or increase training data.`;
        bgColor = '#fff3cd';
    } else if (testAcc < 60) {
        statusMsg = `⚠️ <strong>Underfitting.</strong> Test accuracy is only ${testAcc.toFixed(1)}%. Model is too simple. Try: add more layers/neurons, train longer, or add feature engineering.`;
        bgColor = '#f8d7da';
    } else {
        statusMsg = `📊 <strong>Training in progress.</strong> Train: ${trainAcc.toFixed(1)}%, Test: ${testAcc.toFixed(1)}%. Keep training to see if model improves.`;
        bgColor = '#e3f2fd';
    }

    statusEl.innerHTML = statusMsg;
    document.getElementById('validationInsight').style.backgroundColor = bgColor;
}

// Draw decision boundary visualization
function drawDecisionBoundary() {
    const canvas = document.getElementById('boundaryCanvas');
    if (!canvas || !network) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.width; // Square canvas
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    ctx.clearRect(0, 0, width, height);

    // Get data bounds from first two features only
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    [...trainData, ...testData].forEach(d => {
        const [x, y] = d.input.slice(0, 2);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });

    // Add padding to bounds
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    minX -= rangeX * 0.1;
    maxX += rangeX * 0.1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    // Scale functions
    const scaleX = (x) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
    const scaleY = (y) => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);
    const unscaleX = (px) => minX + ((px - padding) / (width - 2 * padding)) * (maxX - minX);
    const unscaleY = (py) => maxY - ((py - padding) / (height - 2 * padding)) * (maxY - minY);

    // Draw decision boundary as colored background
    const resolution = 5;
    for (let px = padding; px < width - padding; px += resolution) {
        for (let py = padding; py < height - padding; py += resolution) {
            const x = unscaleX(px);
            const y = unscaleY(py);
            
            const features = transformFeatures([x, y]);
            const prediction = network.forward(features);
            
            // Color based on prediction
            const intensity = Math.min(Math.abs(prediction) / 2, 1);
            if (prediction > 0) {
                ctx.fillStyle = `rgba(52, 152, 219, ${intensity * 0.3})`;
            } else {
                ctx.fillStyle = `rgba(231, 76, 60, ${intensity * 0.3})`;
            }
            
            ctx.fillRect(px, py, resolution, resolution);
        }
    }

    // Draw axes
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();

    // Draw TEST data points (validation data)
    testData.forEach(d => {
        const [x, y] = d.input.slice(0, 2);
        const cx = scaleX(x);
        const cy = scaleY(y);
        
        // Larger circles with white border for visibility
        ctx.fillStyle = d.output > 0 ? '#3498db' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Draw axis labels
    const xLabel = trainData[0].xLabel || 'Variable X';
    const yLabel = trainData[0].yLabel || 'Variable Y';
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
}

// Draw network visualization
function drawNetwork() {
    const canvas = document.getElementById('networkCanvas');
    if (!canvas) {
        console.error('❌ Canvas element not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('❌ Could not get 2D context!');
        return;
    }

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    console.log('Canvas size:', canvas.width, 'x', canvas.height);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!network) {
        console.log('⚠️ Network not initialized yet');
        return;
    }

    const state = network.getState();
    const layers = state.layers;
    const padding = 50;
    const layerSpacing = (canvas.width - padding * 2) / (layers.length - 1);
    const nodeRadius = 15;

    // Draw connections
    for (let i = 1; i < layers.length; i++) {
        const prevLayer = layers[i - 1];
        const currentLayer = layers[i];
        const prevX = padding + (i - 1) * layerSpacing;
        const currX = padding + i * layerSpacing;

        for (let j = 0; j < currentLayer.neurons.length; j++) {
            const neuron = currentLayer.neurons[j];
            const currY = canvas.height / 2 + (j - currentLayer.size / 2 + 0.5) * 40;

            for (let k = 0; k < neuron.weights.length; k++) {
                const weight = neuron.weights[k];
                const prevY = canvas.height / 2 + (k - prevLayer.size / 2 + 0.5) * 40;

                // Color based on weight
                const absWeight = Math.abs(weight);
                const alpha = Math.min(absWeight * 2, 1);
                ctx.strokeStyle = weight > 0 
                    ? `rgba(52, 152, 219, ${alpha})`
                    : `rgba(231, 76, 60, ${alpha})`;
                ctx.lineWidth = Math.min(absWeight * 3, 3);

                ctx.beginPath();
                ctx.moveTo(prevX, prevY);
                ctx.lineTo(currX, currY);
                ctx.stroke();
            }
        }
    }

    // Draw nodes
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const x = padding + i * layerSpacing;

        for (let j = 0; j < layer.neurons.length; j++) {
            const neuron = layer.neurons[j];
            const y = canvas.height / 2 + (j - layer.size / 2 + 0.5) * 40;

            // Color based on activation
            const activation = Math.tanh(neuron.output);
            const color = activation > 0
                ? `hsl(210, 100%, ${50 + activation * 30}%)`
                : `hsl(0, 100%, ${50 - activation * 30}%)`;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI);
            ctx.fill();

            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Layer labels
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        const label = i === 0 ? 'Input' : i === layers.length - 1 ? 'Output' : `Hidden ${i}`;
        ctx.fillText(label, x, 20);
    }
}

// Draw loss chart
function drawLossChart() {
    const canvas = document.getElementById('lossChart');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (lossHistory.train.length === 0) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Find max loss for scaling
    const maxLoss = Math.max(
        ...lossHistory.train,
        ...lossHistory.test,
        0.1
    );

    const xScale = chartWidth / (lossHistory.train.length - 1 || 1);
    const yScale = chartHeight / maxLoss;

    // Draw axes
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw train loss
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    lossHistory.train.forEach((loss, i) => {
        const x = padding + i * xScale;
        const y = canvas.height - padding - loss * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw test loss
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    lossHistory.test.forEach((loss, i) => {
        const x = padding + i * xScale;
        const y = canvas.height - padding - loss * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Legend
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#3498db';
    ctx.fillText('Training Loss', padding + 10, 30);
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('Test Loss', padding + 120, 30);
}

// Draw dataset previews
function drawDatasetPreviews(data) {
    const datasets = ['churn', 'segment', 'abtest', 'affinity'];

    datasets.forEach(dataset => {
        const canvas = document.getElementById(`preview-${dataset}`);
        const ctx = canvas.getContext('2d');
        canvas.width = 60;
        canvas.height = 60;

        // Generate preview data
        const generator = {
            'churn': DataGenerator.customerChurn,
            'segment': DataGenerator.marketSegment,
            'abtest': DataGenerator.abTest,
            'affinity': DataGenerator.productAffinity
        }[dataset];

        const previewData = generator(50, 0);

        ctx.clearRect(0, 0, 60, 60);

        previewData.forEach(d => {
            const x = (d.input[0] + 5) / 10 * 60;
            const y = (d.input[1] + 5) / 10 * 60;

            ctx.fillStyle = d.output > 0 ? '#3498db' : '#e74c3c';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fill();
        });
    });
}

// Event handlers
function setupEventListeners() {
    // Play/Pause button
    document.getElementById('playPauseBtn').addEventListener('click', () => {
        isTraining = !isTraining;
        const btn = document.getElementById('playPauseBtn');
        const icon = document.getElementById('playPauseIcon');

        if (isTraining) {
            btn.innerHTML = '<span id="playPauseIcon">⏸</span> Pause Training';
            trainingInterval = setInterval(trainStep, 50);
        } else {
            btn.innerHTML = '<span id="playPauseIcon">▶</span> Resume Training';
            clearInterval(trainingInterval);
        }
    });

    // Step button
    document.getElementById('stepBtn').addEventListener('click', trainStep);

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        isTraining = false;
        clearInterval(trainingInterval);
        document.getElementById('playPauseBtn').innerHTML = '<span id="playPauseIcon">▶</span> Start Training';
        initializeNetwork();
        drawNetwork();
        drawLossChart();
        drawDecisionBoundary();
        updateValidationStatus();
    });

    // Dataset selection
    document.querySelectorAll('.dataset-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.dataset-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            config.dataset = card.dataset.dataset;
            updateScenarioDescription();
            generateData();
            initializeNetwork();
            drawNetwork();
            drawDecisionBoundary();
            updateValidationStatus();
        });
    });

    // View data button
    document.getElementById('viewDataBtn').addEventListener('click', showDataPreview);

    // Close modal
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('dataModal').style.display = 'none';
    });

    // Feature checkboxes
    document.querySelectorAll('input[name="feature"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            config.features = Array.from(document.querySelectorAll('input[name="feature"]:checked'))
                .map(cb => cb.value);
            generateData();
            initializeNetwork();
            drawNetwork();
            drawDecisionBoundary();
            updateValidationStatus();
        });
    });

    // Hidden layers slider
    document.getElementById('hiddenLayers').addEventListener('input', (e) => {
        config.hiddenLayers = parseInt(e.target.value);
        document.getElementById('layersValue').textContent = config.hiddenLayers;
        initializeNetwork();
        drawNetwork();
        drawDecisionBoundary();
        updateValidationStatus();
    });

    // Neurons per layer slider
    document.getElementById('neuronsPerLayer').addEventListener('input', (e) => {
        config.neuronsPerLayer = parseInt(e.target.value);
        document.getElementById('neuronsValue').textContent = config.neuronsPerLayer;
        initializeNetwork();
        drawNetwork();
        drawDecisionBoundary();
        updateValidationStatus();
    });

    // Learning rate slider
    document.getElementById('learningRate').addEventListener('input', (e) => {
        config.learningRate = parseFloat(e.target.value);
        document.getElementById('learningRateValue').textContent = config.learningRate.toFixed(3);
    });

    // Activation function
    document.getElementById('activation').addEventListener('change', (e) => {
        config.activation = e.target.value;
        initializeNetwork();
        drawNetwork();
        drawDecisionBoundary();
        updateValidationStatus();
    });

    // Regularization
    document.getElementById('regularization').addEventListener('change', (e) => {
        config.regularization = e.target.value;
        initializeNetwork();
        drawNetwork();
        drawDecisionBoundary();
        updateValidationStatus();
    });

    // Noise slider
    document.getElementById('noise').addEventListener('input', (e) => {
        config.noise = parseInt(e.target.value);
        document.getElementById('noiseValue').textContent = config.noise + '%';
        generateData();
        initializeNetwork();
        drawNetwork();
        drawDecisionBoundary();
        updateValidationStatus();
    });

    // Train split slider
    document.getElementById('trainSplit').addEventListener('input', (e) => {
        config.trainSplit = parseInt(e.target.value) / 100;
        document.getElementById('trainSplitValue').textContent = parseInt(e.target.value) + '%';
        generateData();
        initializeNetwork();
        drawNetwork();
        drawDecisionBoundary();
        updateValidationStatus();
    });

    // Guided mode toggle
    document.getElementById('guidedMode').addEventListener('change', (e) => {
        const advanced = document.querySelectorAll('.advanced-controls');
        advanced.forEach(el => {
            el.style.display = e.target.checked ? 'none' : 'block';
        });
    });
}

// Update scenario description
function updateScenarioDescription() {
    const info = scenarioInfo[config.dataset];
    const descEl = document.getElementById('scenarioDescription');
    descEl.innerHTML = `
        <strong>${info.title}</strong><br><br>
        ${info.description}<br><br>
        <em style="color: #7f8c8d;">💡 Real-world use: ${info.realWorld}</em>
    `;
}

// Show data preview modal with scatter plot
function showDataPreview() {
    const modal = document.getElementById('dataModal');
    const content = document.getElementById('dataPreviewContent');
    
    // Get sample of 20 data points
    const sampleData = [...trainData.slice(0, 15), ...testData.slice(0, 5)];
    
    // Get variable labels from first data point
    const xLabel = trainData[0].xLabel || 'Variable X';
    const yLabel = trainData[0].yLabel || 'Variable Y';
    
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
                <h3 style="margin-top: 0; font-size: 1.1em;">📊 Data Visualization</h3>
                <canvas id="scatterCanvas" width="350" height="350" style="border: 1px solid #ecf0f1; border-radius: 6px; background: white;"></canvas>
                <p style="font-size: 0.85em; color: #7f8c8d; margin-top: 10px; text-align: center;">
                    <strong style="color: #3498db;">●</strong> Positive Outcome | 
                    <strong style="color: #e74c3c;">●</strong> Negative Outcome
                </p>
            </div>
            <div>
                <h3 style="margin-top: 0; font-size: 1.1em;">📋 Sample Data Table</h3>
                <p style="color: #7f8c8d; margin-bottom: 10px; font-size: 0.85em;">
                    Showing 20 of ${trainData.length + testData.length} total data points.
                </p>
                <div style="overflow-y: auto; max-height: 350px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                        <thead style="position: sticky; top: 0; background: #34495e; color: white;">
                            <tr>
                                <th style="padding: 8px; text-align: left;">#</th>
                                <th style="padding: 8px; text-align: right;">${xLabel}</th>
                                <th style="padding: 8px; text-align: right;">${yLabel}</th>
                                <th style="padding: 8px; text-align: center;">Outcome</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    sampleData.forEach((d, i) => {
        const [x, y] = d.input.slice(0, 2);
        const outcome = d.output > 0 ? 'Positive ✓' : 'Negative ✗';
        const outcomeColor = d.output > 0 ? '#3498db' : '#e74c3c';
        const rowBg = i % 2 === 0 ? '#f8f9fa' : 'white';
        
        html += `
            <tr style="background: ${rowBg};">
                <td style="padding: 6px;">${i + 1}</td>
                <td style="padding: 6px; text-align: right;">${x.toFixed(2)}</td>
                <td style="padding: 6px; text-align: right;">${y.toFixed(2)}</td>
                <td style="padding: 6px; text-align: center; color: ${outcomeColor}; font-weight: bold;">
                    ${outcome}
                </td>
            </tr>
        `;
    });
    
    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div style="padding: 15px; background: #e3f2fd; border-radius: 6px; font-size: 0.9em;">
            <strong>🧠 Understanding the data:</strong><br>
            • <strong>${xLabel}</strong> and <strong>${yLabel}</strong> are the <strong>inputs</strong> (what we measure)<br>
            • <strong>Outcome</strong> is the <strong>target</strong> (what we want to predict)<br>
            • The scatter plot shows the relationship between inputs and outcomes<br>
            • The neural network learns to draw a decision boundary separating the two colors
        </div>
    `;
    
    content.innerHTML = html;
    modal.style.display = 'block';
    
    // Draw scatter plot after modal is visible
    setTimeout(() => {
        const canvas = document.getElementById('scatterCanvas');
        if (canvas) {
            drawScatterPlot(canvas, [...trainData, ...testData]);
        }
    }, 50);
}

// Draw scatter plot of data
function drawScatterPlot(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    ctx.clearRect(0, 0, width, height);
    
    // Find data bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    data.forEach(d => {
        const [x, y] = d.input;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });
    
    // Add padding to bounds
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    minX -= rangeX * 0.1;
    maxX += rangeX * 0.1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;
    
    // Scale functions
    const scaleX = (x) => padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
    const scaleY = (y) => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);
    
    // Draw axes
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();
    
    // Draw data points
    data.forEach(d => {
        const [x, y] = d.input;
        const cx = scaleX(x);
        const cy = scaleY(y);
        
        ctx.fillStyle = d.output > 0 ? '#3498db' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
    
    // Draw axis labels
    const xLabel = data[0].xLabel || 'X';
    const yLabel = data[0].yLabel || 'Y';
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
}

// Log tool usage
async function logToolRun() {
    const token = localStorage.getItem('authToken');

    const data = {
        tool_slug: TOOL_SLUG,
        page_url: window.location.href,
        params_json: {
            dataset: config.dataset,
            features: config.features.length,
            hidden_layers: config.hiddenLayers,
            neurons: config.neuronsPerLayer,
            activation: config.activation,
            iterations: iteration
        },
        result_summary: `Trained ${iteration} iterations, Test accuracy: ${network ? network.calculateAccuracy(testData.map(d => d.input), testData.map(d => d.output)).toFixed(1) : 0}%`,
        data_source: 'interactive'
    };

    try {
        await fetch(`${API_BASE}/tool-run/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Token ${token}` : ''
            },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.log('Tool tracking failed:', error);
    }
}

// Initialize on load
window.addEventListener('load', () => {
    console.log('🚀 Neural Network Playground Loading...');
    
    try {
        setupEventListeners();
        console.log('✓ Event listeners set up');
        
        updateScenarioDescription();
        console.log('✓ Scenario description set');
        
        generateData();
        console.log('✓ Data generated:', trainData.length, 'train,', testData.length, 'test');
        
        initializeNetwork();
        console.log('✓ Network initialized:', network.architecture);
        
        drawNetwork();
        console.log('✓ Network drawn');
        
        drawLossChart();
        console.log('✓ Loss chart drawn');
        
        drawDecisionBoundary();
        console.log('✓ Decision boundary drawn');
        
        updateValidationStatus();
        console.log('✓ Validation status updated');
        
        // Hide advanced controls in guided mode by default
        const advanced = document.querySelectorAll('.advanced-controls');
        advanced.forEach(el => {
            el.style.display = 'none';
        });
        console.log('✓ Guided mode enabled');
        
        console.log('🎉 Neural Network Playground Ready!');
    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }

    // Log usage after 30 seconds
    setTimeout(logToolRun, 30000);
});

// Log usage when leaving page
window.addEventListener('beforeunload', logToolRun);
