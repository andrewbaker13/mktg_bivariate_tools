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

// Scenario descriptions
const scenarioInfo = {
    churn: {
        title: "Customer Churn Prediction",
        description: "Your company tracks pricing and service quality for each customer. The challenge: predict which customers will churn (leave) vs stay loyal. <strong style='color: #3498db;'>Blue customers</strong> are likely to stay, <strong style='color: #e74c3c;'>red customers</strong> are likely to churn. The network learns patterns like: high quality + reasonable price = retention.",
        realWorld: "Used by subscription services (Netflix, Spotify) to identify at-risk customers before they cancel."
    },
    segment: {
        title: "Market Segmentation",
        description: "You have customer data on pricing preferences and quality expectations. Goal: identify two distinct market segments (customer groups). <strong style='color: #3498db;'>Blue = premium segment</strong> (willing to pay more for quality), <strong style='color: #e74c3c;'>red = budget segment</strong> (price-conscious). The network finds the boundary between these groups.",
        realWorld: "Used by companies like Amazon and Target to personalize marketing campaigns for different customer types."
    },
    abtest: {
        title: "A/B Test Conversion Prediction",
        description: "You're testing two website versions with different pricing and quality messaging. The pattern is complex (XOR-like): conversions happen when price and quality messages <em>mismatch</em> in specific ways. <strong style='color: #3498db;'>Blue = converts</strong>, <strong style='color: #e74c3c;'>red = bounces</strong>. This requires multiple layers to learn.",
        realWorld: "Used by e-commerce sites and SaaS companies to predict which version will convert better for different customer types."
    },
    affinity: {
        title: "Product Affinity Analysis",
        description: "Based on customer price sensitivity and quality preferences, predict product affinity (likelihood to purchase related products). The boundary is <em>circular</em>: customers in the middle range show highest affinity. <strong style='color: #3498db;'>Blue = high affinity</strong>, <strong style='color: #e74c3c;'>red = low affinity</strong>.",
        realWorld: "Used by Amazon for 'frequently bought together' recommendations and by grocery stores for cross-selling."
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
        drawLossChart();
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
        });
    });

    // Hidden layers slider
    document.getElementById('hiddenLayers').addEventListener('input', (e) => {
        config.hiddenLayers = parseInt(e.target.value);
        document.getElementById('layersValue').textContent = config.hiddenLayers;
        initializeNetwork();
        drawNetwork();
    });

    // Neurons per layer slider
    document.getElementById('neuronsPerLayer').addEventListener('input', (e) => {
        config.neuronsPerLayer = parseInt(e.target.value);
        document.getElementById('neuronsValue').textContent = config.neuronsPerLayer;
        initializeNetwork();
        drawNetwork();
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
    });

    // Regularization
    document.getElementById('regularization').addEventListener('change', (e) => {
        config.regularization = e.target.value;
        initializeNetwork();
        drawNetwork();
    });

    // Noise slider
    document.getElementById('noise').addEventListener('input', (e) => {
        config.noise = parseInt(e.target.value);
        document.getElementById('noiseValue').textContent = config.noise + '%';
        generateData();
        initializeNetwork();
        drawNetwork();
    });

    // Train split slider
    document.getElementById('trainSplit').addEventListener('input', (e) => {
        config.trainSplit = parseInt(e.target.value) / 100;
        document.getElementById('trainSplitValue').textContent = parseInt(e.target.value) + '%';
        generateData();
        initializeNetwork();
        drawNetwork();
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

// Show data preview modal
function showDataPreview() {
    const modal = document.getElementById('dataModal');
    const content = document.getElementById('dataPreviewContent');
    
    // Get sample of 20 data points
    const sampleData = [...trainData.slice(0, 15), ...testData.slice(0, 5)];
    
    let html = `
        <p style="color: #7f8c8d; margin-bottom: 15px;">
            Showing 20 of ${trainData.length + testData.length} total data points. 
            Each row represents one customer/observation.
        </p>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead>
                    <tr style="background: #34495e; color: white;">
                        <th style="padding: 10px; text-align: left;">#</th>
                        <th style="padding: 10px; text-align: right;">Price</th>
                        <th style="padding: 10px; text-align: right;">Quality</th>
                        <th style="padding: 10px; text-align: center;">Outcome</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sampleData.forEach((d, i) => {
        const [price, quality] = d.input.slice(0, 2); // First two features
        const outcome = d.output > 0 ? 'Positive ✓' : 'Negative ✗';
        const outcomeColor = d.output > 0 ? '#3498db' : '#e74c3c';
        const rowBg = i % 2 === 0 ? '#f8f9fa' : 'white';
        
        html += `
            <tr style="background: ${rowBg};">
                <td style="padding: 8px;">${i + 1}</td>
                <td style="padding: 8px; text-align: right;">${price.toFixed(2)}</td>
                <td style="padding: 8px; text-align: right;">${quality.toFixed(2)}</td>
                <td style="padding: 8px; text-align: center; color: ${outcomeColor}; font-weight: bold;">
                    ${outcome}
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <p style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 6px; font-size: 0.9em;">
            <strong>Understanding the data:</strong><br>
            • Price and Quality are the <strong>inputs</strong> (what we know)<br>
            • Outcome is the <strong>target</strong> (what we want to predict)<br>
            • The network learns the pattern connecting inputs to outcomes
        </p>
    `;
    
    content.innerHTML = html;
    modal.style.display = 'block';
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
