/**
 * Simple Neural Network Implementation
 * For educational purposes - Marketing Analytics focus
 */

class NeuralNetwork {
    constructor(architecture, activationFn = 'tanh', regularization = null) {
        this.architecture = architecture; // e.g., [2, 4, 4, 1]
        this.activationFn = activationFn;
        this.regularization = regularization;
        this.layers = [];
        this.initialize();
    }

    initialize() {
        this.layers = [];
        for (let i = 0; i < this.architecture.length; i++) {
            const layer = {
                size: this.architecture[i],
                neurons: []
            };

            for (let j = 0; j < this.architecture[i]; j++) {
                const neuron = {
                    weights: [],
                    bias: Math.random() * 0.2 - 0.1,
                    output: 0,
                    delta: 0
                };

                // Initialize weights for connections to previous layer
                if (i > 0) {
                    for (let k = 0; k < this.architecture[i - 1]; k++) {
                        neuron.weights.push(Math.random() * 0.2 - 0.1);
                    }
                }

                layer.neurons.push(neuron);
            }

            this.layers.push(layer);
        }
    }

    // Activation functions
    activate(x, derivative = false) {
        switch (this.activationFn) {
            case 'relu':
                return derivative ? (x > 0 ? 1 : 0) : Math.max(0, x);
            case 'sigmoid':
                const sig = 1 / (1 + Math.exp(-x));
                return derivative ? sig * (1 - sig) : sig;
            case 'tanh':
            default:
                return derivative ? (1 - Math.tanh(x) ** 2) : Math.tanh(x);
        }
    }

    // Forward propagation
    forward(inputs) {
        // Set input layer
        for (let i = 0; i < inputs.length; i++) {
            this.layers[0].neurons[i].output = inputs[i];
        }

        // Propagate through hidden and output layers
        for (let i = 1; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const prevLayer = this.layers[i - 1];

            for (let j = 0; j < layer.neurons.length; j++) {
                const neuron = layer.neurons[j];
                let sum = neuron.bias;

                for (let k = 0; k < prevLayer.neurons.length; k++) {
                    sum += prevLayer.neurons[k].output * neuron.weights[k];
                }

                // Apply activation (linear for output layer in regression)
                if (i === this.layers.length - 1) {
                    neuron.output = sum; // Linear output
                } else {
                    neuron.output = this.activate(sum);
                }
            }
        }

        return this.layers[this.layers.length - 1].neurons[0].output;
    }

    // Backward propagation
    backward(target, learningRate) {
        // Calculate output layer error
        const outputLayer = this.layers[this.layers.length - 1];
        const output = outputLayer.neurons[0].output;
        const error = target - output;
        outputLayer.neurons[0].delta = error; // Linear activation derivative = 1

        // Backpropagate error through hidden layers
        for (let i = this.layers.length - 2; i > 0; i--) {
            const layer = this.layers[i];
            const nextLayer = this.layers[i + 1];

            for (let j = 0; j < layer.neurons.length; j++) {
                const neuron = layer.neurons[j];
                let error = 0;

                for (let k = 0; k < nextLayer.neurons.length; k++) {
                    error += nextLayer.neurons[k].delta * nextLayer.neurons[k].weights[j];
                }

                neuron.delta = error * this.activate(neuron.output, true);
            }
        }

        // Update weights and biases
        for (let i = 1; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const prevLayer = this.layers[i - 1];

            for (let j = 0; j < layer.neurons.length; j++) {
                const neuron = layer.neurons[j];

                // Update weights
                for (let k = 0; k < neuron.weights.length; k++) {
                    let weightUpdate = learningRate * neuron.delta * prevLayer.neurons[k].output;

                    // Apply regularization
                    if (this.regularization === 'L1') {
                        weightUpdate -= learningRate * 0.001 * Math.sign(neuron.weights[k]);
                    } else if (this.regularization === 'L2') {
                        weightUpdate -= learningRate * 0.001 * neuron.weights[k];
                    }

                    neuron.weights[k] += weightUpdate;
                }

                // Update bias
                neuron.bias += learningRate * neuron.delta;
            }
        }
    }

    // Train on a batch of data
    train(inputs, targets, learningRate, epochs = 1) {
        for (let epoch = 0; epoch < epochs; epoch++) {
            for (let i = 0; i < inputs.length; i++) {
                this.forward(inputs[i]);
                this.backward(targets[i], learningRate);
            }
        }
    }

    // Calculate loss (MSE)
    calculateLoss(inputs, targets) {
        let totalLoss = 0;

        for (let i = 0; i < inputs.length; i++) {
            const output = this.forward(inputs[i]);
            const error = targets[i] - output;
            totalLoss += error * error;
        }

        return totalLoss / inputs.length;
    }

    // Calculate accuracy (for classification)
    calculateAccuracy(inputs, targets) {
        let correct = 0;

        for (let i = 0; i < inputs.length; i++) {
            const output = this.forward(inputs[i]);
            const predicted = output > 0 ? 1 : -1;
            if (predicted === targets[i]) {
                correct++;
            }
        }

        return (correct / inputs.length) * 100;
    }

    // Get network state for visualization
    getState() {
        return {
            layers: this.layers.map(layer => ({
                size: layer.size,
                neurons: layer.neurons.map(n => ({
                    output: n.output,
                    bias: n.bias,
                    weights: [...n.weights]
                }))
            }))
        };
    }
}

// Dataset generators for marketing scenarios
// Simple seeded random for tutorial consistency
let _seed = 12345;
function seededRandom() {
    const x = Math.sin(_seed++) * 10000;
    return x - Math.floor(x);
}

window.getRand = function() {
    if (window.useSeededRandom) {
        return seededRandom();
    }
    return Math.random();
}

const DataGenerator = {
    // Customer Churn: High-value customers (retain) vs likely churners
    customerChurn(numSamples, noise = 0) {
        // Reset seed if using seeded random to ensure same dataset every time
        if (window.useSeededRandom) _seed = 12345;

        const data = [];
        const noiseLevel = noise / 100;

        for (let i = 0; i < numSamples; i++) {
            // Realistic distribution: Most customers are average, some outliers
            // Using Box-Muller transform for normal distribution
            const u1 = window.getRand();
            const u2 = window.getRand();
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            
            // Months: Positive values only (0 to ~6 scaled)
            // Shifted Gaussian to ensure positivity
            const monthsSubscribed = Math.max(0.1, Math.abs(z1 * 1.5 + 2)); 
            
            // Tickets: Positive values only
            const supportTickets = Math.max(0.1, Math.abs(z2 * 1.5 + 2));

            // Decision boundary: 
            // Churn if Tickets are high relative to Months
            // Diagonal split in positive quadrant
            let label = (supportTickets > monthsSubscribed + 0.5) ? -1 : 1;

            // Add realistic noise (misclassification)
            // 5% of customers behave irrationally regardless of noise setting (reduced from 25% to make 80% acc achievable)
            if (window.getRand() < 0.05 + (noiseLevel * 0.4)) {
                label *= -1;
            }

            data.push({
                input: [
                    monthsSubscribed,
                    supportTickets
                ],
                output: label,
                xLabel: 'Months Subscribed',
                yLabel: 'Support Tickets'
            });
        }

        return data;
    },

    // Market Segmentation: Two distinct customer groups with some overlap
    marketSegment(numSamples, noise = 0) {
        const data = [];
        const noiseLevel = noise / 100;

        for (let i = 0; i < numSamples; i++) {
            let input, label;
            
            // Box-Muller for Gaussian distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

            // 60% Budget, 40% Premium
            if (Math.random() > 0.4) {
                // Budget Segment (Lower Income, Lower Loyalty)
                // Centered at (1.5, 1.5)
                input = [
                    Math.max(0.1, 1.5 + z1 * 0.8),
                    Math.max(0.1, 1.5 + z2 * 0.8)
                ];
                label = -1;
            } else {
                // Premium Segment (High Income, High Loyalty)
                // Centered at (4.5, 4.5)
                input = [
                    Math.max(0.1, 4.5 + z1 * 0.8),
                    Math.max(0.1, 4.5 + z2 * 0.8)
                ];
                label = 1;
            }

            // Add noise/overlap
            // 20% base noise + user setting
            if (Math.random() < 0.2 + (noiseLevel * 0.6)) {
                label *= -1;
            }

            data.push({
                input: input,
                output: label,
                xLabel: 'Income Level',
                yLabel: 'Brand Loyalty Score'
            });
        }

        return data;
    },

    // A/B Test: Conversion vs no conversion (XOR-like pattern)
    abTest(numSamples, noise = 0) {
        const data = [];
        const noiseLevel = noise / 100;

        for (let i = 0; i < numSamples; i++) {
            // Gaussian distribution centered at 3.0 (range 0-6)
            const u1 = Math.random();
            const u2 = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

            const adSpend = Math.max(0.1, 3.0 + z1 * 1.5);
            const emailFreq = Math.max(0.1, 3.0 + z2 * 1.5);

            // XOR pattern shifted to center (3,3)
            // Convert if (High Ad Spend AND Low Email) OR (Low Ad Spend AND High Email)
            // (x-3)*(y-3) < -1 creates a similar hyperbolic boundary
            let label = ((adSpend - 3) * (emailFreq - 3) < -1) ? 1 : -1;

            // Add noise
            // 20% base noise + user setting
            if (Math.random() < 0.2 + (noiseLevel * 0.6)) {
                label *= -1;
            }

            data.push({
                input: [
                    adSpend,
                    emailFreq
                ],
                output: label,
                xLabel: 'Ad Spend ($100s)',
                yLabel: 'Email Frequency (per week)'
            });
        }

        return data;
    },

    // Product Affinity: Circular boundary with realistic spread
    productAffinity(numSamples, noise = 0) {
        const data = [];
        const noiseLevel = noise / 100;

        for (let i = 0; i < numSamples; i++) {
            // Gaussian distribution centered at 3.0
            const u1 = Math.random();
            const u2 = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            
            const pageViews = Math.max(0.1, 3.0 + z1 * 1.5);
            const timeOnSite = Math.max(0.1, 3.0 + z2 * 1.5);

            // Circular decision boundary centered at (3,3)
            const dx = pageViews - 3.0;
            const dy = timeOnSite - 3.0;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Ring between 1.0 and 2.5
            let label = (distance > 1.0 && distance < 2.5) ? 1 : -1;

            // Add noise
            // 20% base noise + user setting
            if (Math.random() < 0.2 + (noiseLevel * 0.6)) {
                label *= -1;
            }

            data.push({
                input: [
                    pageViews,
                    timeOnSite
                ],
                output: label,
                xLabel: 'Page Views',
                yLabel: 'Time on Site (min)'
            });
        }

        return data;
    }
};
