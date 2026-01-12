# Professor Mode: Specification & Implementation Guide
**Date:** December 11, 2025
**Version:** 1.0

## 1. Overview & Philosophy
"Professor Mode" is a guided, interactive tutorial system designed to overlay existing web application tools. Unlike static help text, it actively engages the user in a "Learn by Doing" workflow.

### Core Principles
1.  **Guided Doing:** Users must interact with the tool (e.g., "Set Hidden Layers to 2") to proceed.
2.  **Dual Validation:** Progress requires two checks:
    *   **Task Completion:** Programmatic verification that the user performed the required action in the app.
    *   **Concept Check:** A multiple-choice quiz to ensure they understand *why* they did it.
3.  **Deterministic Experience:** For tools involving randomness (simulations, data generation), the tutorial must force a **seeded random state** to ensure consistent results for every user.
4.  **Visual Focus:** Use a "Spotlight" overlay to dim the interface and highlight only the relevant controls for the current step.

---

## 2. User Interface Specifications

### 2.1 The Sidebar
*   **Position:** Fixed right side, slides in/out.
*   **Width:** 350px (responsive).
*   **Styling:**
    *   Background: White.
    *   Border-left: 5px solid `var(--app-accent)`.
    *   Shadow: Deep shadow to separate from content.
*   **Content:**
    *   **Step Badge:** Pill-shaped, `var(--app-accent)`.
    *   **Title:** Clear, action-oriented.
    *   **Body:** Instructional text with a distinct "Task" box (Green/Success border).
    *   **Quiz Section:** Interactive radio buttons.
    *   **Progress Bar:** Visual indicators for "Task Complete" and "Quiz Complete".
    *   **Navigation:** "Next Step" button (disabled until requirements met).

### 2.2 The Spotlight (Overlay)
*   **Behavior:** Dims the entire screen (`rgba(0,0,0,0.7)`).
*   **Highlight:** The target element (e.g., a button or chart) is elevated (`z-index: 1001`) with a white background and a pulsing glow border (`var(--app-accent)`).
*   **Interaction:** Users can interact *only* with the highlighted element or the tutorial sidebar.

---

## 3. Universal Codebase
To implement Professor Mode on a new tool (e.g., Logistic Regression), use these standardized assets.

### 3.1 Shared CSS (`tutorial.css`)
*Add this to the shared CSS folder or include in the tool's CSS.*

```css
/* Professor Mode Sidebar */
#tutorial-sidebar {
    position: fixed;
    top: 0;
    right: -400px;
    width: 350px;
    height: 100vh;
    background: white;
    box-shadow: -5px 0 15px rgba(0,0,0,0.1);
    z-index: 2000;
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
    border-left: 5px solid var(--app-accent);
}

#tutorial-sidebar.active {
    right: 0;
}

/* Task Box */
.tutorial-body .task {
    background: #f0fdf4; /* Light green */
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid var(--app-success);
    font-weight: 500;
    margin-top: 15px;
}

/* Quiz Styling */
.tutorial-quiz {
    background: #fff7ed; /* Light orange */
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 20px;
    border-left: 4px solid var(--app-warning);
}

.tutorial-quiz.passed {
    background: #f0fdf4;
    border-left-color: var(--app-success);
}

/* Spotlight Overlay */
#tutorial-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 1000;
    display: none;
}

.tutorial-highlight {
    position: relative;
    z-index: 1001 !important;
    background: white;
    box-shadow: 0 0 0 5px var(--app-accent), 0 0 20px rgba(0,0,0,0.5);
    animation: pulse-border 2s infinite;
}

@keyframes pulse-border {
    0% { box-shadow: 0 0 0 0px rgba(42, 125, 225, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(42, 125, 225, 0); }
    100% { box-shadow: 0 0 0 0px rgba(42, 125, 225, 0); }
}
```

### 3.2 JavaScript Engine Skeleton (`tutorial_engine.js`)
*This is the reusable logic. The specific steps are injected via configuration.*

```javascript
const TutorialEngine = {
    isActive: false,
    currentStep: 0,
    steps: [], // Populated by specific app
    
    init(steps) {
        this.steps = steps;
        this.renderSidebar();
        this.renderOverlay();
        this.attachListeners();
    },

    start() {
        this.isActive = true;
        this.currentStep = 0;
        document.getElementById('tutorial-sidebar').classList.add('active');
        this.updateView();
        // Hook for app-specific setup (e.g., seeding RNG)
        if (this.onStart) this.onStart();
    },

    stop() {
        this.isActive = false;
        document.getElementById('tutorial-sidebar').classList.remove('active');
        this.hideOverlay();
        if (this.onStop) this.onStop();
    },

    updateView() {
        const step = this.steps[this.currentStep];
        // ... (Render logic from Neural Network tutorial.js) ...
        // 1. Render Content
        // 2. Render Quizzes
        // 3. Check Progress (Task + Quiz)
        // 4. Update Spotlight
    },

    // ... (Helper methods: highlightElement, checkQuiz, etc.) ...
};
```

---

## 4. Implementation Steps for New Apps

To add Professor Mode to a tool like **Logistic Regression**:

### Step 1: Define the "Happy Path"
Determine the ideal sequence of actions for a student.
*Example for Log Regression:*
1.  **Intro:** Explain the concept (Binary Outcome).
2.  **Data Loading:** Highlight the "Load Scenario" dropdown (force them to pick a specific preset like 'Campaign Exposure').
3.  **Variable Selection:** Highlight the Variable Panel. Task: Select 'Outcome' and 'Predictors'.
4.  **Model Fit:** Highlight the "Regression Equation" card. Quiz: "What does a positive coefficient mean?"
5.  **Diagnostics:** Highlight the "Residuals" chart.

### Step 2: Instrument the App Code
Ensure the app exposes the necessary state for the `check()` functions.
*   **Global State Access:** The tutorial needs to know if a file is loaded, what variables are selected, etc.
    *   *Requirement:* Ensure `log_reg_app.js` exposes a state object (e.g., `window.AppState` or similar) or that DOM elements can be queried reliably.
*   **Deterministic Data:** If the tool uses random sampling (e.g., for bootstrapping or jittering points), add a `useSeededRandom` flag.

### Step 3: Create the Step Configuration
Create a `tutorial_config.js` file for the specific tool.

```javascript
const LogRegTutorialSteps = [
    {
        id: 'load_data',
        title: "Step 1: Load Data",
        targetId: 'scenario-select', // Highlights the dropdown
        content: "<p>Let's analyze a marketing campaign. Select <strong>'Campaign Exposure'</strong> from the presets.</p>",
        check: () => {
            const sel = document.getElementById('scenario-select');
            return sel.value === 'campaign_exposure';
        }
    },
    {
        id: 'interpret_coef',
        title: "Step 2: Interpret Effects",
        targetId: 'coef-table-body', // Highlights the results table
        content: "<p>Look at the <strong>Odds Ratio</strong> for 'Previous Spend'.</p>",
        quizzes: [
            {
                question: "If the Odds Ratio is > 1, what does that mean?",
                options: ["Positive effect", "Negative effect", "No effect"],
                answer: 0,
                feedback: "Correct! >1 means the event is more likely to happen."
            }
        ]
    }
];
```

### Step 4: Integration
1.  Include `tutorial.css` and `tutorial_engine.js`.
2.  Include `tutorial_config.js`.
3.  Add the "Professor Mode" toggle switch to the HTML header.
4.  Initialize: `TutorialEngine.init(LogRegTutorialSteps)`.

---

## 5. Future-Proofing Rules (For LLMs)

When asking an AI to build a Professor Mode for a new tool, provide these instructions:

1.  **"Read the App State":** Always look for how the app stores data (variables, results). If it's hidden in closures, refactor the app to expose a `getState()` method.
2.  **"Spotlight Strategy":** Identify the specific HTML ID of the container for each step. If the container is too big, wrap the specific control (like a button or a single chart) in a `<div>` with a specific ID just for the tutorial to highlight.
3.  **"Content Tone":** Write tutorial text in the persona of a helpful, encouraging Professor. Use emojis (📊, 🧠, ✅) and clear formatting.
4.  **"Quiz Design":** Every major analytical step needs a quiz. Don't just ask them to click buttons; ask them to *interpret* the result they just generated.
