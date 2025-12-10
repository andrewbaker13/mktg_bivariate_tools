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
            const price = Math.random() * 10 - 5; // -5 to 5
            const quality = Math.random() * 10 - 5;

            // High quality + low price = retain (1)
            // Low quality + high price = churn (-1)
            let label = (quality - price > 0) ? 1 : -1;

            // Add noise
            if (Math.random() < noiseLevel * 2) {
                label *= -1;
            }

            data.push({
                input: [
                    price + (Math.random() - 0.5) * noiseLevel,
                    quality + (Math.random() - 0.5) * noiseLevel
                ],
                output: label
            });
        }

        return data;
    },

    // Market Segmentation: Two distinct customer groups
    marketSegment(numSamples, noise = 0) {
        const data = [];
        const noiseLevel = noise / 100;

        for (let i = 0; i < numSamples / 2; i++) {
            // Segment 1: Premium customers (high price, high quality)
            data.push({
                input: [
                    3 + Math.random() * 2 + (Math.random() - 0.5) * noiseLevel * 2,
                    3 + Math.random() * 2 + (Math.random() - 0.5) * noiseLevel * 2
                ],
                output: 1
            });

            // Segment 2: Budget customers (low price, moderate quality)
            data.push({
                input: [
                    -3 - Math.random() * 2 + (Math.random() - 0.5) * noiseLevel * 2,
                    -3 - Math.random() * 2 + (Math.random() - 0.5) * noiseLevel * 2
                ],
                output: -1
            });
        }

        return data;
    },

    // A/B Test: Conversion vs no conversion (XOR-like pattern)
    abTest(numSamples, noise = 0) {
        const data = [];
        const noiseLevel = noise / 100;

        for (let i = 0; i < numSamples; i++) {
            const price = Math.random() * 10 - 5;
            const quality = Math.random() * 10 - 5;

            // XOR pattern: Convert when price*quality < 0
            let label = (price * quality < 0) ? 1 : -1;

            // Add noise
            if (Math.random() < noiseLevel * 2) {
                label *= -1;
            }

            data.push({
                input: [
                    price + (Math.random() - 0.5) * noiseLevel,
                    quality + (Math.random() - 0.5) * noiseLevel
                ],
                output: label
            });
        }

        return data;
    },

    // Product Affinity: Circular boundary
    productAffinity(numSamples, noise = 0) {
        const data = [];
        const noiseLevel = noise / 100;

        for (let i = 0; i < numSamples; i++) {
            const price = Math.random() * 10 - 5;
            const quality = Math.random() * 10 - 5;

            // Circular decision boundary
            const distance = Math.sqrt(price * price + quality * quality);
            let label = (distance < 3.5) ? 1 : -1;

            // Add noise
            if (Math.random() < noiseLevel * 2) {
                label *= -1;
            }

            data.push({
                input: [
                    price + (Math.random() - 0.5) * noiseLevel,
                    quality + (Math.random() - 0.5) * noiseLevel
                ],
                output: label
            });
        }

        return data;
    }
};
