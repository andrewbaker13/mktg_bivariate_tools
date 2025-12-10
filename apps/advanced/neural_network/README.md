# Neural Network Playground - Marketing Analytics Edition

**Location:** `apps/advanced/neural_network/`  
**Status:** ✅ Complete (Phase 1 & 2)  
**Tool Slug:** `neural_network`

---

## 🎯 What This Tool Does

An interactive, browser-based neural network visualization specifically designed for marketing students. Unlike generic neural network playgrounds, this version uses **marketing-focused scenarios** and **simplified terminology** to help students understand how neural networks learn patterns in marketing data.

---

## ✨ Key Features

### Phase 1 Completed ✓
- ✅ **Custom Implementation** - Built from scratch in vanilla JavaScript (no TypeScript build needed)
- ✅ **Marketing Branding** - Styled to match Dr. Baker site aesthetic
- ✅ **Auth Bar Integration** - Automatic authentication tracking
- ✅ **Backend Tracking** - Logs usage to Django backend for analytics

### Phase 2 Completed ✓
- ✅ **4 Marketing Scenarios** (replaced generic datasets):
  - **Customer Churn** - Predict retention vs churn based on price/quality
  - **Market Segmentation** - Identify distinct customer groups
  - **A/B Testing** - Predict conversion patterns (XOR-like)
  - **Product Affinity** - Circular decision boundary patterns

- ✅ **Marketing-Specific Features** (replaced X/Y coordinates):
  - Price
  - Quality
  - Price² (nonlinear effects)
  - Quality² (nonlinear effects)
  - Price × Quality (interaction effects)

- ✅ **Simplified Terminology**:
  - "Activation Function" → "Transformation Type"
  - "Regularization" → "Complexity Penalty"
  - "Learning Rate" → "Learning Speed"
  - Added beginner-friendly tooltips

- ✅ **Guided Mode**:
  - Toggle to hide advanced controls
  - Enabled by default for beginners
  - Focuses on essentials: dataset, architecture, training

---

## 📂 File Structure

```
apps/advanced/neural_network/
├── index.html          # Main UI (responsive, mobile-friendly)
├── nn.js              # Neural network engine (backprop, forward prop)
├── playground.js      # Main controller (event handlers, training loop)
└── README.md          # This file
```

---

## 🧠 How It Works

### Neural Network Engine (`nn.js`)
- **Class:** `NeuralNetwork(architecture, activationFn, regularization)`
- **Methods:**
  - `forward(inputs)` - Forward propagation
  - `backward(target, learningRate)` - Backpropagation with gradient descent
  - `train(inputs, targets, learningRate, epochs)` - Batch training
  - `calculateLoss(inputs, targets)` - Mean squared error
  - `calculateAccuracy(inputs, targets)` - Classification accuracy

### Dataset Generators
- `DataGenerator.customerChurn(numSamples, noise)`
- `DataGenerator.marketSegment(numSamples, noise)`
- `DataGenerator.abTest(numSamples, noise)`
- `DataGenerator.productAffinity(numSamples, noise)`

Each generates 500 samples with configurable noise level (0-50%).

### Visualization
- **Network Canvas** - Real-time visualization of layers, neurons, and weights
  - Node colors indicate activation strength
  - Edge colors/thickness show weight magnitude
  - Blue = positive weights, Red = negative weights

- **Loss Chart** - Training vs test loss over time
  - Monitors overfitting
  - Last 100 iterations shown

- **Metrics Panel**
  - Training Loss (MSE)
  - Test Loss (MSE)
  - Iterations
  - Test Accuracy (%)

---

## 🎮 User Controls

### Essentials (Always Visible)
- **Marketing Scenario** - Select dataset (4 options)
- **Input Features** - Choose features (5 checkboxes)
- **Hidden Layers** - 0-4 layers (slider)
- **Neurons per Layer** - 2-8 neurons (slider)
- **Play/Pause** - Start/stop training
- **Step** - Single training iteration
- **Reset** - Reinitialize network

### Advanced (Hidden in Guided Mode)
- **Learning Speed** - 0.001 to 0.1 (slider)
- **Transformation Type** - ReLU, Tanh, Sigmoid (dropdown)
- **Complexity Penalty** - None, L1, L2 (dropdown)
- **Noise Level** - 0-50% (slider)
- **Training Split** - 50-90% train/test (slider)

---

## 📊 Backend Integration

### Tool Tracking
Automatically logs usage after 30 seconds and on page exit:

```javascript
{
  tool_slug: 'neural_network',
  params_json: {
    dataset: 'churn',
    features: 5,
    hidden_layers: 1,
    neurons: 4,
    activation: 'tanh',
    iterations: 1250
  },
  result_summary: 'Trained 1250 iterations, Test accuracy: 87.5%'
}
```

### Django Model
```python
Tool.objects.get(slug='neural_network')
# name: 'Neural Network Playground'
# description: 'Interactive neural network visualization...'
```

---

## 🚀 Usage Instructions

### For Students
1. Navigate to `drbakermarketing.com/apps/advanced/neural_network/`
2. **Guided Mode** is on by default (simplifies controls)
3. Select a **Marketing Scenario** (e.g., Customer Churn)
4. Choose **Input Features** (start with Price + Quality)
5. Adjust **Network Structure** (try 1 hidden layer, 4 neurons)
6. Click **Start Training** and watch the network learn!
7. Observe:
   - Loss decreasing over time
   - Accuracy improving
   - Network weights adjusting

### For Instructors
- Toggle **Guided Mode OFF** to access advanced controls
- Experiment with different architectures
- Add noise to show overfitting
- Adjust train/test split to demonstrate generalization
- Use in lectures to explain:
  - Backpropagation visually
  - Overfitting (train loss << test loss)
  - Architecture choices (layers vs neurons)
  - Activation functions

---

## 🔧 Technical Details

### Architecture
- **Frontend:** Vanilla JavaScript (ES6+)
- **Backend:** Django REST API
- **Storage:** PostgreSQL (production), SQLite (local)
- **Deployment:** Netlify (frontend), Render (backend)

### Performance
- **Training Speed:** ~20 iterations/second
- **Canvas Rendering:** 60 FPS
- **Data Size:** 500 samples (350 train, 150 test)
- **Browser Support:** Chrome, Firefox, Safari, Edge

### Dependencies
- None! Pure vanilla JavaScript
- Uses Canvas API for visualization
- Fetch API for backend tracking

---

## 📝 Future Enhancements (Phase 3+)

### Potential Additions
- [ ] More marketing scenarios (email campaigns, social media engagement)
- [ ] Export trained model weights
- [ ] Compare multiple architectures side-by-side
- [ ] Add quiz questions about neural networks
- [ ] Integrate with course analytics dashboard
- [ ] Heatmap visualization of decision boundaries
- [ ] Animation speed control
- [ ] Save/load network states

---

## 🎓 Learning Objectives

Students will understand:
1. **Neural Network Basics** - Layers, neurons, weights, biases
2. **Training Process** - Forward prop, backprop, gradient descent
3. **Overfitting** - Train vs test loss divergence
4. **Architecture Choices** - Depth vs width tradeoffs
5. **Feature Engineering** - Linear vs nonlinear features
6. **Activation Functions** - How they introduce nonlinearity
7. **Regularization** - Preventing overfitting
8. **Marketing Applications** - Real-world pattern recognition

---

## 📞 Support

- **Issues:** GitHub Issues on `drbaker_backend` repo
- **Questions:** Contact Andre (andrewbaker13)
- **Documentation:** See `PROJECT_OVERVIEW.md` for system architecture

---

## ✅ Completion Status

**Phase 1 (Quick Win):** ✅ Complete (8 hours)
- Built tool structure
- Added branding/colors
- Integrated auth bar
- Added backend tracking

**Phase 2 (Marketing Focus):** ✅ Complete (15 hours)
- 4 marketing datasets
- Marketing-specific features
- Simplified terminology
- Guided mode implementation

**Total Time:** ~23 hours
**Lines of Code:** ~1,200 (index.html: 450, nn.js: 350, playground.js: 400)

---

**Last Updated:** December 9, 2025  
**Version:** 1.0  
**Status:** Production Ready 🚀
