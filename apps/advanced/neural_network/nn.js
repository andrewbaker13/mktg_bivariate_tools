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
const DataGenerator = {
    // Customer Churn: High-value customers (retain) vs likely churners
    customerChurn(numSamples, noise = 0) {
        const data = [];
        const noiseLevel = noise / 100;

        for (let i = 0; i < numSamples; i++) {
            // Realistic distribution: Most customers are average, some outliers
            // Using Box-Muller transform for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            
            // Months: Skewed slightly positive (more new customers)
            // Range approx -5 to 5
            const monthsSubscribed = (z1 * 2.5); 
            
            // Tickets: Poisson-like but continuous
            // Range approx -5 to 5
            const supportTickets = (z2 * 2.5);

            // Decision boundary: 
            // Churn if (Tickets > Months + 1) OR (Tickets > 3)
            // This means even long-term customers churn if tickets get too high
            // And new customers churn easily with few tickets
            let label = (supportTickets > monthsSubscribed + 1 || supportTickets > 3) ? -1 : 1;

            // Add realistic noise (misclassification)
            // 10% of customers behave irrationally regardless of noise setting
            if (Math.random() < 0.1 + (noiseLevel * 0.4)) {
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
            
            // 60% Budget, 40% Premium
            if (Math.random() > 0.4) {
                // Budget Segment (Lower Income, Lower Loyalty)
                // Centered at (-2, -2) with spread
                input = [
                    -2 + (Math.random() + Math.random() - 1) * 2.5,
                    -2 + (Math.random() + Math.random() - 1) * 2.5
                ];
                label = -1;
            } else {
                // Premium Segment (High Income, High Loyalty)
                // Centered at (2, 2) with spread
                input = [
                    2 + (Math.random() + Math.random() - 1) * 2.5,
                    2 + (Math.random() + Math.random() - 1) * 2.5
                ];
                label = 1;
            }

            // Add noise/overlap
            if (Math.random() < noiseLevel) {
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
            // Uniform distribution for ad spend and email freq
            // Marketing campaigns often test full ranges
            const adSpend = Math.random() * 10 - 5;
            const emailFreq = Math.random() * 10 - 5;

            // XOR pattern with a "sweet spot" twist
            // Convert if (High Ad Spend AND Low Email) OR (Low Ad Spend AND High Email)
            // But if BOTH are high -> Annoyed customer (No convert)
            // If BOTH are low -> Unaware customer (No convert)
            let label = (adSpend * emailFreq < -1) ? 1 : -1;

            // Add noise
            if (Math.random() < noiseLevel) {
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
            // Gaussian distribution centered at 0
            const u1 = Math.random();
            const u2 = Math.random();
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            
            const pageViews = z1 * 2.5;
            const timeOnSite = z2 * 2.5;

            // Circular decision boundary: moderate engagement = high affinity
            // "Goldilocks zone" - not too little, not too much (browsers)
            const distance = Math.sqrt(pageViews * pageViews + timeOnSite * timeOnSite);
            
            // Sweet spot is between 1.5 and 4.0 distance from origin
            // Too close = bounced
            // Too far = lost/confused/bot
            let label = (distance > 1.5 && distance < 4.0) ? 1 : -1;

            // Add noise
            if (Math.random() < noiseLevel) {
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
