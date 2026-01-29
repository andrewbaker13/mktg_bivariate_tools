/**
 * Neural Network Playground - Main Controller
 * Marketing Analytics Edition
 */

// API_BASE is already defined in auth_tracking.js
const TOOL_SLUG = 'neural-network';

// Engagement tracking state
let hasLoggedSuccess = false;

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

// Global stats for feature scaling
let dataStats = {
    minX: 0, maxX: 8,
    minY: 0, maxY: 8
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

// Scenario descriptions
const scenarioDescriptions = {
    churn: {
        text: "This scenario challenges you to predict <strong>Customer Churn</strong>. We are analyzing two key variables: <strong>Months Subscribed</strong> (customer tenure) and <strong>Support Tickets</strong> (number of help requests). The goal is to draw a boundary that separates customers who are <strong style='color: var(--app-accent);'>Likely to Stay (Blue)</strong> from those who are <strong style='color: var(--app-danger);'>Likely to Churn (Red)</strong>. Notice how new customers (low tenure) with many support tickets are in the 'danger zone'."
    },
    segment: {
        text: "In this scenario, we are identifying distinct <strong>Market Segments</strong> based on <strong>Annual Income</strong> and <strong>Brand Loyalty Score</strong>. Marketing often involves finding 'clusters' of similar people. Here, we want to classify customers into the <strong style='color: var(--app-accent);'>Premium Segment (Blue)</strong> versus the <strong style='color: var(--app-danger);'>Budget Segment (Red)</strong>. This helps us target the right ads to the right people."
    },
    abtest: {
        text: "This scenario simulates an <strong>A/B Test Analysis</strong>. We are looking at the relationship between <strong>Ad Spend</strong> and <strong>Email Frequency</strong> to predict conversion rates. The model needs to learn which combination of marketing pressure leads to a <strong style='color: var(--app-accent);'>Conversion (Blue)</strong> versus a <strong style='color: var(--app-danger);'>Bounce (Red)</strong>. Too much email might annoy users, while too little ad spend might result in low visibility."
    },
    affinity: {
        text: "Here we are predicting <strong>Product Affinity</strong>. We track user behavior metrics: <strong>Page Views</strong> and <strong>Time on Site</strong>. The neural network must determine if a visitor has <strong style='color: var(--app-accent);'>High Affinity (Blue)</strong> and is ready to buy, or <strong style='color: var(--app-danger);'>Low Affinity (Red)</strong> and needs more nurturing. This is crucial for real-time personalization engines."
    }
};

// Update scenario description
function updateScenarioDescription() {
    const desc = scenarioDescriptions[config.dataset];
    const el = document.getElementById('scenarioDescription');
    if (el && desc) {
        el.innerHTML = desc.text;
    }
}

// Update feature labels in UI
function updateFeatureLabels() {
    if (!trainData || trainData.length === 0) return;
    const xLabel = trainData[0].xLabel || 'Variable X';
    const yLabel = trainData[0].yLabel || 'Variable Y';
    
    const labelX = document.getElementById('label-x');
    const labelY = document.getElementById('label-y');
    const labelX2 = document.getElementById('label-x2');
    const labelY2 = document.getElementById('label-y2');
    const labelXY = document.getElementById('label-xy');
    const labelLogX = document.getElementById('label-logx');
    const labelLogY = document.getElementById('label-logy');

    if (labelX) labelX.textContent = `${xLabel} (X)`;
    if (labelY) labelY.textContent = `${yLabel} (Y)`;
    if (labelX2) labelX2.textContent = `${xLabel}² (X²)`;
    if (labelY2) labelY2.textContent = `${yLabel}² (Y²)`;
    if (labelXY) labelXY.textContent = `${xLabel} × ${yLabel} (X×Y)`;
    if (labelLogX) labelLogX.textContent = `ln(${xLabel}) (ln X)`;
    if (labelLogY) labelLogY.textContent = `ln(${yLabel}) (ln Y)`;
}

// Feature transformations
function transformFeatures(input) {
    const [x, y] = input;
    const features = [];

    // Scale inputs to roughly [-1, 1] range to prevent saturation
    const rangeX = (dataStats.maxX - dataStats.minX) || 1;
    const rangeY = (dataStats.maxY - dataStats.minY) || 1;
    const midX = (dataStats.maxX + dataStats.minX) / 2;
    const midY = (dataStats.maxY + dataStats.minY) / 2;

    const scaledX = (x - midX) / (rangeX / 2);
    const scaledY = (y - midY) / (rangeY / 2);

    if (config.features.includes('price')) features.push(scaledX);
    if (config.features.includes('quality')) features.push(scaledY);
    
    // x^2 is 0..64. Scale to -1..1: (x^2 - 32) / 32
    // For dynamic data, we'll just square the scaled value (which is -1..1) -> 0..1
    // Then scale 0..1 to -1..1 -> (sq * 2) - 1
    if (config.features.includes('priceSquared')) features.push((scaledX * scaledX * 2) - 1);
    if (config.features.includes('qualitySquared')) features.push((scaledY * scaledY * 2) - 1);
    
    // x*y is -1..1 * -1..1 = -1..1
    if (config.features.includes('interaction')) features.push(scaledX * scaledY);
    
    // log(x) is roughly -2.3 to 2.1. This is fine for tanh.
    if (config.features.includes('logX')) features.push(Math.log(Math.max(0.1, x)));
    if (config.features.includes('logY')) features.push(Math.log(Math.max(0.1, y)));

    return features;
}

// Generate dataset
function generateData() {
    // If using custom uploaded data, don't regenerate
    if (config.dataset === 'upload') return;

    // Reset stats for generated data
    dataStats = { minX: 0, maxX: 8, minY: 0, maxY: 8 };

    const generator = {
        'churn': DataGenerator.customerChurn,
        'segment': DataGenerator.marketSegment,
        'abtest': DataGenerator.abTest,
        'affinity': DataGenerator.productAffinity
    }[config.dataset];

    const allData = generator(500, config.noise);

    // Shuffle
    for (let i = allData.length - 1; i > 0; i--) {
        const rand = window.getRand ? window.getRand() : Math.random();
        const j = Math.floor(rand * (i + 1));
        [allData[i], allData[j]] = [allData[j], allData[i]];
    }

    // Split train/test
    const splitIndex = Math.floor(allData.length * config.trainSplit);
    trainData = allData.slice(0, splitIndex).map(d => ({
        rawInput: d.input,
        input: transformFeatures(d.input),
        output: d.output,
        xLabel: d.xLabel,
        yLabel: d.yLabel
    }));
    testData = allData.slice(splitIndex).map(d => ({
        rawInput: d.input,
        input: transformFeatures(d.input),
        output: d.output,
        xLabel: d.xLabel,
        yLabel: d.yLabel
    }));

    // Draw dataset previews
    drawDatasetPreviews(allData);
    
    // Update labels based on new data
    updateFeatureLabels();
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
        drawNetwork();
    }
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
    const trainAcc = network.calculateAccuracy(
        trainData.map(d => d.input),
        trainData.map(d => d.output)
    );
    const accuracy = network.calculateAccuracy(
        testData.map(d => d.input),
        testData.map(d => d.output)
    );

    document.getElementById('trainLoss').textContent = trainLoss.toFixed(4);
    document.getElementById('testLoss').textContent = testLoss.toFixed(4);
    document.getElementById('iterations').textContent = iteration;
    document.getElementById('trainAccuracy').textContent = trainAcc.toFixed(1) + '%';
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
    } else if (diff <= 5 && testAcc > 75) {
        statusMsg = `✅ <strong>Good fit!</strong> Train accuracy: ${trainAcc.toFixed(1)}%, Test accuracy: ${testAcc.toFixed(1)}%. Model generalizes well to unseen data.`;
        bgColor = '#d4edda';
    } else if (trainAcc > testAcc + 10) {
        statusMsg = `⚠️ <strong>Possible overfitting.</strong> Train accuracy (${trainAcc.toFixed(1)}%) is significantly higher than test accuracy (${testAcc.toFixed(1)}%). Model may be memorizing noise. Try: reduce layers/neurons, add regularization, or increase training data.`;
        bgColor = '#fff3cd';
    } else if (trainAcc < 65) {
        statusMsg = `⚠️ <strong>Underfitting.</strong> Training accuracy is only ${trainAcc.toFixed(1)}%. Model isn't learning the pattern well. Try: add more layers/neurons, train longer, or add feature engineering.`;
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
        const [x, y] = d.rawInput || d.input;
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

    // Fill background with light grey (uncertainty color)
    ctx.fillStyle = '#ecf0f1'; // Light grey
    ctx.fillRect(padding, padding, width - 2 * padding, height - 2 * padding);

    // Draw decision boundary as colored background
    const resolution = 5;
    for (let px = padding; px < width - padding; px += resolution) {
        for (let py = padding; py < height - padding; py += resolution) {
            const x = unscaleX(px);
            const y = unscaleY(py);
            
            const features = transformFeatures([x, y]);
            const prediction = network.forward(features);
            
            // Color based on prediction
            // Use higher opacity for deeper colors
            // prediction is roughly -1 to 1 (tanh)
            const intensity = Math.min(Math.abs(prediction), 1);
            
            if (prediction > 0) {
                // Blue
                ctx.fillStyle = `rgba(52, 152, 219, ${intensity * 0.7})`;
            } else {
                // Red
                ctx.fillStyle = `rgba(231, 76, 60, ${intensity * 0.7})`;
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

    // Draw TEST data points (validation data) - SQUARES
    testData.forEach(d => {
        const [x, y] = d.rawInput || d.input;
        const cx = scaleX(x);
        const cy = scaleY(y);
        const size = 10; // Size of the square
        
        ctx.fillStyle = d.output > 0 ? '#3498db' : '#e74c3c';
        
        // Draw square centered at cx, cy
        ctx.fillRect(cx - size/2, cy - size/2, size, size);
        
        // White border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - size/2, cy - size/2, size, size);
        
        // Dark outline
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - size/2, cy - size/2, size, size);
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
    const padding = 100; // Increased padding for labels
    const layerSpacing = (canvas.width - padding * 2) / (layers.length - 1);
    const nodeRadius = 15;

    // Prepare input labels
    const shortX = 'X';
    const shortY = 'Y';

    const inputLabels = [];
    if (config.features.includes('price')) inputLabels.push(shortX);
    if (config.features.includes('quality')) inputLabels.push(shortY);
    if (config.features.includes('priceSquared')) inputLabels.push(`${shortX}²`);
    if (config.features.includes('qualitySquared')) inputLabels.push(`${shortY}²`);
    if (config.features.includes('interaction')) inputLabels.push(`${shortX}×${shortY}`);
    if (config.features.includes('logX')) inputLabels.push(`ln(${shortX})`);
    if (config.features.includes('logY')) inputLabels.push(`ln(${shortY})`);

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

            // Draw input labels
            if (i === 0 && j < inputLabels.length) {
                ctx.fillStyle = '#2c3e50';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(inputLabels[j], x - nodeRadius - 8, y);
            }
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
            // Scale 0-8 range to 0-60 canvas
            const x = (d.input[0] / 8) * 60;
            const y = 60 - (d.input[1] / 8) * 60; // Flip Y for canvas coordinates

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
            trainingInterval = setInterval(trainStep, 10);
            
            // Track training start
            if (typeof markRunAttempted === 'function') {
                markRunAttempted();
            }
        } else {
            btn.innerHTML = '<span id="playPauseIcon">▶</span> Resume Training';
            clearInterval(trainingInterval);
            
            // Track successful training when paused (user completed a training session)
            if (iteration > 50 && !hasLoggedSuccess && typeof markRunSuccessful === 'function') {
                const testAcc = network ? network.calculateAccuracy(
                    testData.map(d => d.input), 
                    testData.map(d => d.output)
                ) : 0;
                markRunSuccessful({
                    dataset: config.dataset,
                    hidden_layers: config.hiddenLayers,
                    neurons: config.neuronsPerLayer,
                    activation: config.activation,
                    iterations: iteration,
                    test_accuracy: testAcc.toFixed(1)
                }, `Trained ${iteration} iterations, ${testAcc.toFixed(1)}% accuracy`);
                hasLoggedSuccess = true;
            }
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

    // Dataset selector
    document.querySelectorAll('.dataset-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // If upload card, trigger file input
            if (card.id === 'uploadCard') {
                // Prevent infinite loop from bubbling click event
                if (e.target.id === 'csvUpload') return;
                if (e.target.id === 'downloadTemplateBtn') return;
                
                document.getElementById('csvUpload').click();
                return;
            }

            document.querySelectorAll('.dataset-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            config.dataset = card.dataset.dataset;
            
            // Track scenario selection
            if (typeof markScenarioLoaded === 'function') {
                const scenarioNames = {
                    'churn': 'Customer Churn',
                    'segment': 'Market Segmentation',
                    'abtest': 'A/B Test Analysis',
                    'affinity': 'Product Affinity'
                };
                markScenarioLoaded(scenarioNames[config.dataset] || config.dataset);
            }
            
            updateScenarioDescription();
            generateData();
            initializeNetwork();
            drawNetwork();
            drawDecisionBoundary();
            updateValidationStatus();
        });
    });

    // File Upload Handler
    const fileInput = document.getElementById('csvUpload');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Download Template Button
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop card click
            e.preventDefault();
            downloadSampleTemplate();
        });
    }

    // Drag and drop support for upload card
    const uploadCard = document.getElementById('uploadCard');
    if (uploadCard) {
        uploadCard.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadCard.style.borderColor = '#2196F3';
            uploadCard.style.backgroundColor = '#e3f2fd';
        });

        uploadCard.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadCard.style.borderColor = '';
            uploadCard.style.backgroundColor = '';
        });

        uploadCard.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadCard.style.borderColor = '';
            uploadCard.style.backgroundColor = '';
            
            if (e.dataTransfer.files.length > 0) {
                const fileInput = document.getElementById('csvUpload');
                fileInput.files = e.dataTransfer.files;
                // Trigger change event manually
                const event = new Event('change');
                fileInput.dispatchEvent(event);
            }
        });
    }

    // Download Predictions
    const downloadBtn = document.getElementById('downloadPredictionsBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPredictions);
    }

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

    // View Predictions Button
    const viewPredBtn = document.getElementById('viewPredictionsBtn');
    if (viewPredBtn) {
        viewPredBtn.addEventListener('click', showPredictionDetails);
    }

    // View Weights Button
    const viewWeightsBtn = document.getElementById('viewWeightsBtn');
    if (viewWeightsBtn) {
        viewWeightsBtn.addEventListener('click', showModelWeights);
    }
}

// Show model weights modal
function showModelWeights() {
    const modal = document.getElementById('dataModal');
    const content = document.getElementById('dataPreviewContent');
    const title = modal.querySelector('h2');
    
    title.textContent = '🧠 Model Weights & Visualization';
    
    if (!network) {
        content.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No model trained yet. Start training to see weights.</p>';
        modal.style.display = 'block';
        return;
    }

    let html = `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 5px solid #2ecc71;">
            <h3 style="margin-top: 0; color: #27ae60; font-size: 1.1em;">🔍 What am I looking at?</h3>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.5; font-size: 0.9em; color: #2c3e50;">
                <li style="margin-bottom: 8px;"><strong>First Layer Neurons:</strong> Usually learn simple boundaries. If you use raw inputs (X, Y), these are straight lines. If you add non-linear features (like X² or Interaction), these can be curves!</li>
                <li style="margin-bottom: 8px;"><strong>Deeper Layers:</strong> These neurons combine the shapes from previous layers to create complex, non-linear patterns and "islands" of classification.</li>
                <li><strong>Visualization:</strong> Shows the neuron's activation across the whole grid. <strong style="color: #3498db;">Blue</strong> = Active (Positive), <strong style="color: #e74c3c;">Red</strong> = Inactive (Negative).</li>
            </ul>
        </div>
    `;

    const state = network.getState();
    
    state.layers.forEach((layer, i) => {
        if (i === 0) return; // Skip input layer (no weights)
        
        const layerName = i === state.layers.length - 1 ? 'Output Layer' : `Hidden Layer ${i}`;
        
        html += `
            <div style="margin-bottom: 25px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
                    ${layerName}
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
        `;

        // Determine labels for incoming weights
        let inputLabels = [];
        if (i === 1) {
            // Previous layer is Input Layer
            const shortX = 'X';
            const shortY = 'Y';
            if (config.features.includes('price')) inputLabels.push(shortX);
            if (config.features.includes('quality')) inputLabels.push(shortY);
            if (config.features.includes('priceSquared')) inputLabels.push(`${shortX}²`);
            if (config.features.includes('qualitySquared')) inputLabels.push(`${shortY}²`);
            if (config.features.includes('interaction')) inputLabels.push(`${shortX}×${shortY}`);
            if (config.features.includes('logX')) inputLabels.push(`ln(${shortX})`);
            if (config.features.includes('logY')) inputLabels.push(`ln(${shortY})`);
        } else {
            // Previous layer is a Hidden Layer
            const prevLayerSize = state.layers[i-1].neurons.length;
            for(let k=0; k<prevLayerSize; k++) {
                inputLabels.push(`Neuron ${k+1}`);
            }
        }

        layer.neurons.forEach((neuron, j) => {
            const canvasId = `neuron-viz-${i}-${j}`;
            html += `
                <div style="background: white; padding: 15px; border: 1px solid #eee; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; gap: 15px;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #3498db; margin-bottom: 5px;">Neuron ${j + 1}</div>
                        <div style="font-size: 0.9em; color: #555;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                <span>Bias:</span>
                                <span style="font-family: monospace; font-weight: bold;">${neuron.bias.toFixed(3)}</span>
                            </div>
                            <div style="margin-top: 8px; font-size: 0.85em; color: #7f8c8d;">Incoming Weights:</div>
                            <ul style="margin: 0; padding-left: 0; list-style: none; font-family: monospace; font-size: 0.85em;">
                                ${neuron.weights.map((w, idx) => `
                                    <li style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 2px 0;">
                                        <span style="color: #95a5a6;">${inputLabels[idx] || 'Input ' + (idx+1)}:</span>
                                        <span style="font-weight: bold; color: ${w > 0 ? '#2980b9' : '#c0392b'};">${w.toFixed(3)}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                    <div style="width: 100px; display: flex; flex-direction: column; align-items: center;">
                        <canvas id="${canvasId}" width="100" height="100" style="border: 1px solid #ddd; border-radius: 4px; background: #eee;"></canvas>
                        <span style="font-size: 0.75em; color: #95a5a6; margin-top: 5px;">Activation Map</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    content.innerHTML = html;
    modal.style.display = 'block';

    // Draw visualizations after modal is visible
    setTimeout(() => {
        drawNeuronVisualizations(state);
    }, 50);
}

// Draw activation maps for all neurons in the modal
function drawNeuronVisualizations(state) {
    // Calculate bounds (same as decision boundary)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    [...trainData, ...testData].forEach(d => {
        const [x, y] = d.rawInput || d.input;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    minX -= rangeX * 0.1;
    maxX += rangeX * 0.1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    state.layers.forEach((layer, i) => {
        if (i === 0) return;

        layer.neurons.forEach((neuron, j) => {
            const canvas = document.getElementById(`neuron-viz-${i}-${j}`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            // Scale functions for this small canvas
            const unscaleX = (px) => minX + (px / width) * (maxX - minX);
            const unscaleY = (py) => maxY - (py / height) * (maxY - minY);

            // Draw activation map
            const resolution = 4; // Coarser resolution for performance
            for (let px = 0; px < width; px += resolution) {
                for (let py = 0; py < height; py += resolution) {
                    const x = unscaleX(px);
                    const y = unscaleY(py);
                    
                    // We need to run a forward pass to get the activation of THIS specific neuron
                    // This is expensive but necessary
                    const features = transformFeatures([x, y]);
                    
                    // Custom forward pass up to this layer/neuron
                    // We can't use network.forward() because it returns the final output
                    // We need the intermediate activation
                    
                    // 1. Set input layer
                    const inputLayer = network.layers[0];
                    for (let k = 0; k < features.length; k++) {
                        inputLayer.neurons[k].output = features[k];
                    }

                    // 2. Propagate to target layer
                    for (let l = 1; l <= i; l++) {
                        const currentLayer = network.layers[l];
                        const prevLayer = network.layers[l - 1];

                        for (let n = 0; n < currentLayer.neurons.length; n++) {
                            const currNeuron = currentLayer.neurons[n];
                            let sum = currNeuron.bias;
                            for (let w = 0; w < prevLayer.neurons.length; w++) {
                                sum += prevLayer.neurons[w].output * currNeuron.weights[w];
                            }
                            // Apply activation (linear for output layer)
                            if (l === network.layers.length - 1) {
                                currNeuron.output = sum;
                            } else {
                                currNeuron.output = network.activate(sum);
                            }
                        }
                    }

                    // 3. Get output of target neuron
                    const activation = network.layers[i].neurons[j].output;
                    
                    // Color
                    const intensity = Math.min(Math.abs(activation), 1);
                    if (activation > 0) {
                        ctx.fillStyle = `rgba(52, 152, 219, ${intensity})`;
                    } else {
                        ctx.fillStyle = `rgba(231, 76, 60, ${intensity})`;
                    }
                    ctx.fillRect(px, py, resolution, resolution);
                }
            }
        });
    });

    // Restore network state to avoid visual glitches in main graph
    if (trainData && trainData.length > 0) {
        network.forward(trainData[0].input);
    }
}

// Show prediction details modal
function showPredictionDetails() {
    const modal = document.getElementById('dataModal');
    const content = document.getElementById('dataPreviewContent');
    const title = modal.querySelector('h2');
    
    title.textContent = '🤖 Model Predictions (Test Data)';
    
    let html = `
        <p style="margin-bottom: 15px; color: #666;">
            Comparing model predictions against actual outcomes for a sample of the test data.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #eee;">
                    <th style="padding: 10px; text-align: left;">Input Features</th>
                    <th style="padding: 10px; text-align: center;">Prediction</th>
                    <th style="padding: 10px; text-align: center;">Confidence</th>
                    <th style="padding: 10px; text-align: center;">Actual</th>
                    <th style="padding: 10px; text-align: center;">Result</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Take first 15 test items
    const sample = testData.slice(0, 15);
    
    sample.forEach(d => {
        const rawOutput = network.forward(d.input);
        const prediction = rawOutput > 0 ? 1 : -1;
        const confidence = Math.abs(Math.tanh(rawOutput)); // Tanh output is -1 to 1
        const isCorrect = prediction === d.output;
        
        // Format inputs
        const inputsToDisplay = d.rawInput || d.input.slice(0, 2);
        const inputStr = inputsToDisplay.map(v => v.toFixed(2)).join(', ');
        
        // Determine labels based on dataset
        const posLabel = getPositiveLabel(config.dataset);
        const negLabel = getNegativeLabel(config.dataset);
        
        const predLabel = prediction > 0 ? posLabel : negLabel;
        const actualLabel = d.output > 0 ? posLabel : negLabel;
        
        const predColor = prediction > 0 ? '#3498db' : '#e74c3c';
        const actualColor = d.output > 0 ? '#3498db' : '#e74c3c';
        
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${inputStr}</td>
                <td style="padding: 10px; text-align: center; color: ${predColor}; font-weight: bold;">
                    ${predLabel}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${(confidence * 100).toFixed(1)}%
                </td>
                <td style="padding: 10px; text-align: center; color: ${actualColor};">
                    ${actualLabel}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${isCorrect ? '✅' : '❌'}
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    content.innerHTML = html;
    modal.style.display = 'block';
}

// Helper to get labels
function getPositiveLabel(dataset) {
    const map = {
        'churn': 'Stay',
        'segment': 'Premium',
        'abtest': 'Convert',
        'affinity': 'High'
    };
    return map[dataset] || 'Positive';
}

function getNegativeLabel(dataset) {
    const map = {
        'churn': 'Churn',
        'segment': 'Budget',
        'abtest': 'Bounce',
        'affinity': 'Low'
    };
    return map[dataset] || 'Negative';
}

// Show data preview modal with scatter plot
function showDataPreview() {
    const modal = document.getElementById('dataModal');
    const content = document.getElementById('dataPreviewContent');
    const title = modal.querySelector('h2');
    title.textContent = '📊 Sample Data Preview';
    
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
        const [x, y] = (d.rawInput || d.input).slice(0, 2);
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
    
    // Find data bounds using raw inputs
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    data.forEach(d => {
        const [x, y] = d.rawInput || d.input; // Fallback for legacy/preview data
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
    // Force square aspect ratio for the plot area to avoid squishing
    const plotSize = Math.min(width - 2 * padding, height - 2 * padding);
    const xOffset = (width - plotSize) / 2;
    const yOffset = (height - plotSize) / 2;

    const scaleX = (x) => xOffset + ((x - minX) / (maxX - minX)) * plotSize;
    const scaleY = (y) => height - yOffset - ((y - minY) / (maxY - minY)) * plotSize;
    
    // Draw axes
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xOffset, height - yOffset);
    ctx.lineTo(width - xOffset, height - yOffset);
    ctx.moveTo(xOffset, height - yOffset);
    ctx.lineTo(xOffset, yOffset);
    ctx.stroke();
    
    // Draw data points
    data.forEach(d => {
        const [x, y] = d.rawInput || d.input;
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

// Note: Using standard engagement tracking from auth_tracking.js
// Old logToolRun function removed - now uses markScenarioLoaded, markDataUploaded, 
// markRunAttempted, markRunSuccessful from auth_tracking.js

// Handle File Upload
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Track file upload
    if (typeof markDataUploaded === 'function') {
        markDataUploaded(file.name);
    }

    try {
        const text = await file.text();
        
        // Custom parsing to allow string IDs
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('File must have a header and data rows.');
        
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        
        const data = [];
        for(let i=1; i<lines.length; i++) {
            const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
            if (parts.length === headers.length) {
                const row = {};
                headers.forEach((h, idx) => row[h] = parts[idx]);
                data.push(row);
            }
        }

        if (data.length === 0) throw new Error('No valid data rows found.');

        // Detect ID column
        let idCol = null;
        if (typeof detectIdLikeColumns === 'function') {
            const candidates = detectIdLikeColumns(headers, data);
            if (candidates.length > 0) idCol = candidates[0].header;
        }

        // Identify numeric columns (excluding ID if found)
        const potentialFeatures = headers.filter(h => h !== idCol);
        const numericCols = potentialFeatures.filter(col => {
            // Check first 100 rows
            return data.slice(0, 100).every(row => {
                const val = parseFloat(row[col]);
                return !isNaN(val) && isFinite(val);
            });
        });

        if (numericCols.length < 3) {
            alert('Dataset must have at least 2 feature columns and 1 outcome column (all numeric).');
            return;
        }

        // Assume last numeric column is outcome, first two are features
        const outcomeCol = numericCols[numericCols.length - 1];
        const xCol = numericCols[0];
        const yCol = numericCols[1];

        // Calculate stats for scaling
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        const parsedData = [];
        
        data.forEach(row => {
            const x = parseFloat(row[xCol]);
            const y = parseFloat(row[yCol]);
            const out = parseFloat(row[outcomeCol]);
            
            if (isNaN(x) || isNaN(y) || isNaN(out)) return;

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            parsedData.push({
                input: [x, y],
                output: [out], 
                id: idCol ? row[idCol] : null,
                xLabel: xCol,
                yLabel: yCol
            });
        });

        if (parsedData.length === 0) throw new Error('No valid numeric data found.');

        // Update global stats
        dataStats = { minX, maxX, minY, maxY };

        // Shuffle
        for (let i = parsedData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [parsedData[i], parsedData[j]] = [parsedData[j], parsedData[i]];
        }

        // Split 50/50
        const splitIndex = Math.floor(parsedData.length * 0.5);
        
        trainData = parsedData.slice(0, splitIndex).map(d => ({
            ...d,
            rawInput: d.input,
            input: transformFeatures(d.input),
            output: d.output[0]
        }));
        
        testData = parsedData.slice(splitIndex).map(d => ({
            ...d,
            rawInput: d.input,
            input: transformFeatures(d.input),
            output: d.output[0]
        }));

        // Activate Upload Card UI
        document.querySelectorAll('.dataset-card').forEach(c => c.classList.remove('active'));
        document.getElementById('uploadCard').classList.add('active');
        config.dataset = 'upload';

        // Update UI
        updateFeatureLabels();
        initializeNetwork();
        drawNetwork();
        drawDecisionBoundary();
        updateValidationStatus();
        
        // Update scenario text
        const el = document.getElementById('scenarioDescription');
        if (el) {
            el.innerHTML = `<strong>Custom Dataset Loaded</strong><br>
            Features: <strong>${xCol}</strong>, <strong>${yCol}</strong><br>
            Target: <strong>${outcomeCol}</strong><br>
            Records: ${parsedData.length} (Split 50/50)`;
        }

    } catch (err) {
        console.error(err);
        alert('Error processing file: ' + err.message);
    } finally {
        // Clear input so the same file can be selected again if needed
        e.target.value = '';
    }
}

// Download Predictions
function downloadPredictions(e) {
    if (e) e.preventDefault();
    console.log('Download requested');
    
    if (!testData || testData.length === 0) {
        alert('No validation data available. Please upload data or select a scenario first.');
        return;
    }
    if (!network) {
        alert('Network not initialized. Please reset or reload.');
        return;
    }

    // Header
    let csv = 'ID,Feature_X,Feature_Y,Actual_Outcome,Predicted_Probability,Prediction\n';

    testData.forEach(d => {
        const [x, y] = d.rawInput;
        const actual = d.output;
        
        // Get prediction
        const output = network.forward(d.input);
        const prob = (Math.tanh(output) + 1) / 2; // Convert tanh -1..1 to 0..1 probability
        const pred = prob > 0.5 ? 1 : 0;
        
        const id = d.id || '';
        
        csv += `${id},${x},${y},${actual},${prob.toFixed(4)},${pred}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'prediction_performance_testdata.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Download Sample Template
function downloadSampleTemplate() {
    const csvContent = "ID,Feature_1,Feature_2,Outcome\n" +
        "1,2.5,3.1,0\n" +
        "2,5.1,4.2,1\n" +
        "3,1.2,1.8,0\n" +
        "4,6.8,5.5,1\n" +
        "5,3.3,2.9,0";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'neural_net_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Initialize on load
window.addEventListener('load', () => {
    console.log('🚀 Neural Network Playground Loading...');
    
    try {
        setupEventListeners();
        console.log('✓ Event listeners set up');
        
        updateScenarioDescription();
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
        
        // Initialize standard engagement tracking
        if (typeof initEngagementTracking === 'function') {
            initEngagementTracking(TOOL_SLUG);
            console.log('✓ Engagement tracking initialized');
        }
        
        console.log('🎉 Neural Network Playground Ready!');
    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }
});

// Note: Old setTimeout(logToolRun, 30000) and beforeunload removed
// Now using milestone-based tracking via auth_tracking.js
