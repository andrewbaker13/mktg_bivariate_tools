// Conjoint Analysis & Simulation Tool Controller
// BROWSER TEST VERSION - Uses Pyodide for client-side Python execution
const TOOL_SLUG = 'conjoint-analysis';
const CREATED_DATE = '2025-12-07';

// Configuration - BROWSER MODE (no API calls for estimation)
const API_BASE_URL = 'https://drbaker-backend.onrender.com/api'; // Kept for potential other endpoints
const CONJOINT_UPLOAD_LIMIT = typeof window !== 'undefined' && typeof window.MAX_UPLOAD_ROWS === 'number'
  ? window.MAX_UPLOAD_ROWS
  : 5000;

// Pyodide state
let pyodide = null;
let pyodideReady = false;
let pyodideLoading = false;

// Application state
let conjointDataset = { headers: [], rows: [] };
let columnMapping = {
  respondent: null,
  task: null,
  alternative: null,
  chosen: null
};
let attributeColumns = [];
let attributeConfig = {}; // {attrName: {type: 'categorical'|'numeric_linear'|'numeric_quadratic'|'price', ...}}
let noneAlternative = null;
let competitorAlternatives = [];
let estimationResult = null;
let segmentationResult = null;
let modifiedDate = new Date().toLocaleDateString();

// Track current scenario
let currentScenarioName = null;
// Note: currentDataSource is defined in shared/js/auth_tracking.js

// ══════════════════════════════════════════════════════════════════════════════
// PYODIDE INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

async function initPyodide() {
  if (pyodideReady || pyodideLoading) return pyodide;
  
  pyodideLoading = true;
  console.log('🐍 Loading Pyodide...');
  const startTime = performance.now();
  
  try {
    pyodide = await loadPyodide();
    console.log(`✓ Pyodide loaded in ${((performance.now() - startTime) / 1000).toFixed(1)}s`);
    
    // Load required packages
    console.log('📦 Loading NumPy and SciPy...');
    await pyodide.loadPackage(['numpy', 'scipy', 'pandas']);
    console.log(`✓ Packages loaded in ${((performance.now() - startTime) / 1000).toFixed(1)}s total`);
    
    // Initialize the estimation code
    await pyodide.runPythonAsync(CONJOINT_PYTHON_CODE);
    console.log('✓ Conjoint estimation code initialized');
    
    pyodideReady = true;
    pyodideLoading = false;
    return pyodide;
  } catch (error) {
    console.error('Failed to initialize Pyodide:', error);
    pyodideLoading = false;
    throw error;
  }
}

// Python code for conjoint estimation (embedded)
const CONJOINT_PYTHON_CODE = `
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from collections import defaultdict
import json
import time

def safe_float(val):
    """Convert value to JSON-safe float."""
    if val is None or (isinstance(val, float) and (np.isnan(val) or np.isinf(val))):
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None

def build_design_matrix(data, attribute_metadata, respondent_id, none_alt_id, competitor_alt_ids):
    """Build design matrix for a single respondent's choice data."""
    resp_data = data[data['respondent_id'] == respondent_id].copy()
    
    if len(resp_data) == 0:
        raise ValueError(f"No data for respondent {respondent_id}")
    
    feature_names = []
    X_parts = []
    
    for attr_name, attr_config in attribute_metadata.items():
        attr_type = attr_config.get('type', 'categorical')
        
        if attr_name not in resp_data.columns:
            continue
        
        if attr_type == 'categorical':
            unique_levels = resp_data[attr_name].dropna().unique()
            unique_levels = [lvl for lvl in unique_levels if lvl != '']
            
            if len(unique_levels) <= 1:
                continue
            
            baseline_level = sorted(unique_levels)[0]
            
            for level in sorted(unique_levels):
                if level == baseline_level:
                    continue
                feature_names.append(f"{attr_name}_{level}")
                X_parts.append((resp_data[attr_name] == level).astype(float).values)
        
        elif attr_type in ['numeric_linear', 'price']:
            values = pd.to_numeric(resp_data[attr_name], errors='coerce').fillna(0).values
            feature_names.append(attr_name)
            X_parts.append(values)
        
        elif attr_type == 'numeric_quadratic':
            values = pd.to_numeric(resp_data[attr_name], errors='coerce').fillna(0).values
            feature_names.append(attr_name)
            X_parts.append(values)
            feature_names.append(f"{attr_name}_sq")
            X_parts.append(values ** 2)
    
    if none_alt_id:
        feature_names.append('ASC_None')
        X_parts.append((resp_data['alternative_id'] == none_alt_id).astype(float).values)
    
    for comp_id in competitor_alt_ids:
        feature_names.append(f'ASC_Competitor_{comp_id}')
        X_parts.append((resp_data['alternative_id'] == comp_id).astype(float).values)
    
    if len(X_parts) == 0:
        raise ValueError(f"No features extracted for respondent {respondent_id}")
    
    X = np.column_stack(X_parts)
    y = pd.to_numeric(resp_data['chosen'], errors='coerce').fillna(0).astype(int).values
    
    return X, y, feature_names, resp_data

def conditional_logit_ll(params, X, y, task_ids):
    """Compute negative log-likelihood for conditional logit."""
    ll = 0.0
    unique_tasks = np.unique(task_ids)
    
    for task in unique_tasks:
        mask = task_ids == task
        X_task = X[mask]
        y_task = y[mask]
        
        utilities = X_task @ params
        max_util = np.max(utilities)
        exp_utils = np.exp(utilities - max_util)
        probs = exp_utils / np.sum(exp_utils)
        
        chosen_idx = np.where(y_task == 1)[0]
        if len(chosen_idx) > 0:
            ll += np.log(probs[chosen_idx[0]] + 1e-10)
    
    return -ll

def estimate_respondent_mnl(X, y, resp_data, reg_strength=1.0, max_iter=100):
    """Estimate MNL model for a single respondent."""
    task_ids = resp_data['task_id'].values
    init_params = np.zeros(X.shape[1])
    
    result = minimize(
        conditional_logit_ll,
        init_params,
        args=(X, y, task_ids),
        method='BFGS',
        options={'maxiter': max_iter, 'disp': False}
    )
    
    method_used = 'BFGS'
    if not result.success:
        result = minimize(
            conditional_logit_ll,
            init_params,
            args=(X, y, task_ids),
            method='Nelder-Mead',
            options={'maxiter': max_iter, 'disp': False}
        )
        method_used = 'Nelder-Mead'
    
    coefficients = result.x
    ll = -result.fun
    
    ll_null = 0.0
    for task_id in resp_data['task_id'].unique():
        task_mask = resp_data['task_id'] == task_id
        n_alternatives = task_mask.sum()
        if n_alternatives > 0:
            ll_null += np.log(1.0 / n_alternatives)
    
    pseudo_r2 = 1 - (ll / ll_null) if ll_null != 0 else 0
    
    convergence = {
        'converged': bool(result.success),
        'method': method_used,
        'iterations': int(result.nit) if hasattr(result, 'nit') else None
    }
    
    return coefficients, pseudo_r2, ll, ll_null, convergence

def compute_attribute_importance(coefficients, feature_names, attribute_metadata):
    """Compute attribute importance as range / sum(ranges)."""
    attr_ranges = {}
    
    for attr_name in attribute_metadata.keys():
        attr_features = [fn for fn in feature_names if fn.startswith(attr_name + '_') or fn == attr_name]
        
        if len(attr_features) == 0:
            continue
        
        indices = [feature_names.index(fn) for fn in attr_features]
        coefs = [coefficients[idx] for idx in indices]
        coefs_with_baseline = coefs + [0.0]
        attr_range = max(coefs_with_baseline) - min(coefs_with_baseline)
        attr_ranges[attr_name] = attr_range
    
    total_range = sum(attr_ranges.values())
    
    if total_range > 0:
        importance = {attr: (rng / total_range) * 100 for attr, rng in attr_ranges.items()}
    else:
        importance = {attr: 0.0 for attr in attr_ranges.keys()}
    
    return importance

def run_conjoint_estimation(data_json, attribute_metadata_json, none_alt_id, competitor_alt_ids_json, reg_strength):
    """Main estimation function called from JavaScript."""
    start_time = time.time()
    
    data_raw = json.loads(data_json)
    attribute_metadata = json.loads(attribute_metadata_json)
    competitor_alt_ids = json.loads(competitor_alt_ids_json)
    
    data = pd.DataFrame(data_raw)
    respondent_ids = data['respondent_id'].unique()
    
    respondents_results = []
    failed_respondents = []
    
    for i, resp_id in enumerate(respondent_ids):
        try:
            X, y, feature_names, resp_data = build_design_matrix(
                data, attribute_metadata, resp_id, none_alt_id, competitor_alt_ids
            )
            
            coefficients, pseudo_r2, ll, ll_null, convergence = estimate_respondent_mnl(
                X, y, resp_data, reg_strength=reg_strength
            )
            
            coef_dict = {fn: safe_float(coefficients[i]) for i, fn in enumerate(feature_names)}
            importance = compute_attribute_importance(coefficients, feature_names, attribute_metadata)
            n_tasks = resp_data['task_id'].nunique()
            
            respondents_results.append({
                "respondent_id": str(resp_id),
                "coefficients": coef_dict,
                "attribute_importance": {k: safe_float(v) for k, v in importance.items()},
                "fit": {
                    "log_likelihood": safe_float(ll),
                    "null_log_likelihood": safe_float(ll_null),
                    "pseudo_r2": safe_float(pseudo_r2),
                    "n_tasks": int(n_tasks),
                    "n_observations": int(len(y))
                },
                "convergence": convergence
            })
        
        except Exception as e:
            failed_respondents.append({
                "respondent_id": str(resp_id),
                "error": str(e)
            })
            continue
    
    # Compute aggregates
    all_importances = defaultdict(list)
    all_utilities = defaultdict(lambda: defaultdict(list))
    all_pseudo_r2 = []
    all_tasks = []
    
    for resp in respondents_results:
        all_pseudo_r2.append(resp['fit']['pseudo_r2'])
        all_tasks.append(resp['fit']['n_tasks'])
        
        for attr, imp in resp['attribute_importance'].items():
            all_importances[attr].append(imp)
        
        for coef_name, coef_val in resp['coefficients'].items():
            if coef_val is not None:
                if '_' in coef_name and not coef_name.startswith('ASC_'):
                    parts = coef_name.split('_', 1)
                    if len(parts) == 2:
                        attr, level = parts
                        all_utilities[attr][level].append(coef_val)
                else:
                    all_utilities[coef_name]['_value'].append(coef_val)
    
    mean_attribute_importance = {
        attr: safe_float(np.mean(vals)) for attr, vals in all_importances.items()
    }
    
    mean_utilities = {}
    for attr, levels in all_utilities.items():
        mean_utilities[attr] = {}
        for level, vals in levels.items():
            mean_utilities[attr][level] = {
                "mean": safe_float(np.mean(vals)),
                "std": safe_float(np.std(vals)),
                "min": safe_float(np.min(vals)),
                "max": safe_float(np.max(vals))
            }
    
    estimation_time = time.time() - start_time
    
    result = {
        "success": True,
        "respondents": respondents_results,
        "failed_respondents": failed_respondents,
        "aggregate_summaries": {
            "mean_attribute_importance": mean_attribute_importance,
            "mean_utilities": mean_utilities
        },
        "mean_pseudo_r2": safe_float(np.mean(all_pseudo_r2)) if all_pseudo_r2 else 0,
        "mean_tasks_per_respondent": safe_float(np.mean(all_tasks)) if all_tasks else 0,
        "estimation_time_seconds": safe_float(estimation_time)
    }
    
    return json.dumps(result)
`;


// ========================================
// SCENARIO DEFINITIONS (Inline)
// ========================================
const CONJOINT_SCENARIOS = [
  {
    id: 'scenario-smartphone',
    label: '📱 Smartphone Choice',
    description: () => `<div class="scenario-card">
      <div class="scenario-header">
        <span class="scenario-icon">📱</span>
        <h3>Smartphone Purchase Decisions: Features, Brand, and Price</h3>
      </div>
      <div class="scenario-badge-row">
        <span class="badge badge-hypothesis">Choice-Based Conjoint</span>
        <span class="badge badge-context">Consumer Electronics</span>
        <span class="badge badge-sample">n = 100 respondents × 12 tasks</span>
      </div>
      <div class="scenario-body">
        <p><strong>Business Context:</strong> A smartphone manufacturer wants to understand which product attributes drive purchase intent. They're considering launching a new model and need data on customer preferences to optimize design and pricing strategy.</p>
        
        <p><strong>Study Design:</strong></p>
        <div class="context-grid">
          <div class="context-item">
            <div class="context-label">Respondents</div>
            <div class="context-value">100</div>
            <div class="context-subtext">Ages 18-55, smartphone owners</div>
          </div>
          <div class="context-item">
            <div class="context-label">Tasks Each</div>
            <div class="context-value">12</div>
            <div class="context-subtext">Choice scenarios</div>
          </div>
          <div class="context-item">
            <div class="context-label">Alternatives</div>
            <div class="context-value">3 + None</div>
            <div class="context-subtext">Plus competitor anchors</div>
          </div>
        </div>
        
        <p><strong>Attributes Tested:</strong></p>
        <ul>
          <li><strong>Brand:</strong> BrandX (new), BrandY (mid-tier), BrandZ (budget)</li>
          <li><strong>Screen size:</strong> 5.5", 6.0", 6.5"</li>
          <li><strong>Storage:</strong> 64GB, 128GB, 256GB</li>
          <li><strong>Battery life:</strong> 12, 18, 24 hours</li>
          <li><strong>Camera:</strong> Standard (12MP), Enhanced (24MP), Professional (48MP)</li>
          <li><strong>Price:</strong> $499, $599, $699, $799, $899</li>
        </ul>
        
        <div class="scenario-insights">
          <div class="insight-title">🎯 Research Questions</div>
          <ul>
            <li>Which attributes matter most to customers?</li>
            <li>What's willingness-to-pay for premium features?</li>
            <li>Can BrandX compete with established players?</li>
          </ul>
        </div>
      </div>
    </div>`,
    datasetPath: 'scenarios/smartphone_cbc.csv'
  },
  {
    id: 'scenario-streaming',
    label: '📺 Streaming Service',
    description: () => `<div class="scenario-card">
      <div class="scenario-header">
        <span class="scenario-icon">📺</span>
        <h3>Streaming Service Launch: Content, Features, and Pricing</h3>
      </div>
      <div class="scenario-badge-row">
        <span class="badge badge-hypothesis">Choice-Based Conjoint</span>
        <span class="badge badge-context">Media / Entertainment</span>
        <span class="badge badge-sample">n = 200 respondents × 10 tasks</span>
      </div>
      <div class="scenario-body">
        <p><strong>Business Context:</strong> A media company is planning to launch a new streaming platform and wants to understand what features, content offerings, and price points will drive subscriptions in a competitive market.</p>
        
        <p><strong>Study Design:</strong></p>
        <div class="context-grid">
          <div class="context-item">
            <div class="context-label">Respondents</div>
            <div class="context-value">200</div>
            <div class="context-subtext">Current streaming users</div>
          </div>
          <div class="context-item">
            <div class="context-label">Tasks Each</div>
            <div class="context-value">10</div>
            <div class="context-subtext">Choice scenarios</div>
          </div>
          <div class="context-item">
            <div class="context-label">Competitors</div>
            <div class="context-value">Netflix, Disney+</div>
            <div class="context-subtext">Fixed anchors</div>
          </div>
        </div>
        
        <p><strong>Attributes Tested:</strong></p>
        <ul>
          <li><strong>Content library:</strong> Small (5K), Medium (15K), Large (30K titles)</li>
          <li><strong>Originals:</strong> None, Moderate (5/month), Extensive (15/month)</li>
          <li><strong>Ad experience:</strong> With ads, Ad-free</li>
          <li><strong>Streams:</strong> 1, 2, or 4 simultaneous devices</li>
          <li><strong>Quality:</strong> HD, 4K Ultra HD</li>
          <li><strong>Price:</strong> $5.99, $9.99, $14.99, $19.99/month</li>
        </ul>
        
        <div class="scenario-insights">
          <div class="insight-title">🎯 Research Questions</div>
          <ul>
            <li>What drives choice: content quantity, quality, or price?</li>
            <li>How much will customers pay for ad-free?</li>
            <li>Can a new entrant compete on value vs. originals?</li>
          </ul>
        </div>
      </div>
    </div>`,
    datasetPath: 'scenarios/streaming_service_cbc.csv'
  },
  {
    id: 'scenario-course-design',
    label: '📚 Marketing Research Course Design',
    description: () => `<div class="scenario-card">
      <div class="scenario-header">
        <span class="scenario-icon">📚</span>
        <h3>Course Design Preferences: Format, Workload, and Assessment</h3>
      </div>
      <div class="scenario-badge-row">
        <span class="badge badge-hypothesis">Choice-Based Conjoint</span>
        <span class="badge badge-context">Education / Pedagogy</span>
        <span class="badge badge-sample">n = 50 students × 30 tasks</span>
      </div>
      <div class="scenario-body">
        <p><strong>Business Context:</strong> A business school is redesigning its Marketing Research course and wants to understand student preferences for different course formats, workload levels, and assessment methods.</p>
        
        <p><strong>Study Design:</strong></p>
        <div class="context-grid">
          <div class="context-item">
            <div class="context-label">Respondents</div>
            <div class="context-value">50</div>
            <div class="context-subtext">Graduate business students</div>
          </div>
          <div class="context-item">
            <div class="context-label">Tasks Each</div>
            <div class="context-value">30</div>
            <div class="context-subtext">Course design scenarios</div>
          </div>
          <div class="context-item">
            <div class="context-label">Alternatives</div>
            <div class="context-value">4 + None</div>
            <div class="context-subtext">Format options</div>
          </div>
        </div>
        
        <p><strong>Attributes Tested:</strong></p>
        <ul>
          <li><strong>Format:</strong> Traditional Lecture, Flipped Classroom, Project-Based, Hybrid Online</li>
          <li><strong>Weekly Hours:</strong> 2.5, 3.5, 4.5, 5.5, 6.5, 8.0 hours (linear)</li>
          <li><strong>Assessment:</strong> Exams, Projects, Mixed, Case Studies</li>
        </ul>
        
        <div class="scenario-insights">
          <div class="insight-title">🎓 Pedagogical Value</div>
          <p>Students analyze <em>their own</em> preferences, making results personally relevant. Reveals heterogeneity in learning style preferences.</p>
          <div class="insight-title" style="margin-top: 0.75rem;">👥 Four Preference Segments</div>
          <ul>
            <li>📖 Traditional Learners: Lectures, exams, less time</li>
            <li>🛠️ Project-Based: Hands-on, more time, project assessment</li>
            <li>💻 Flexible/Online: Hybrid, moderate time</li>
            <li>⏱️ Time-Constrained: Efficiency-focused</li>
          </ul>
        </div>
      </div>
    </div>`,
    datasetPath: 'scenarios/course_design_cbc.csv'
  }
];

// Template CSV
const TEMPLATE_CSV = `respondent_id,task_id,alternative_id,chosen,brand,screen_size,storage,price
R001,1,A,0,BrandX,5.5,64,599
R001,1,B,1,BrandY,6.0,128,699
R001,1,C,0,BrandZ,5.5,128,649
R001,2,A,1,BrandY,5.5,64,549
R001,2,B,0,BrandX,6.0,128,749
R001,2,C,0,BrandZ,6.0,64,599
R002,1,A,0,BrandX,5.5,64,599
R002,1,B,0,BrandY,6.0,128,699
R002,1,C,1,BrandZ,5.5,128,649`;

// Usage tracking
function checkAndTrackUsage() {
  const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
  if (timeOnPage < 0.167) return;
  if (!hasSuccessfulRun) return;
  if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `tool-tracked-conjoint-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('conjoint', {
      n_respondents: estimationResult?.respondents?.length || 0,
      n_attributes: attributeColumns.length
    }, `Conjoint analysis completed`, {
      scenario: currentScenarioName,
      dataSource: currentDataSource
    });
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for Conjoint');
  }
}

window.addEventListener('beforeunload', checkAndTrackUsage);

/**
 * Initialize the application
 */
function initConjointApp() {
  setupWorkflowStepper();
  setupDataTabs();
  setupExampleDatasets();
  setupFileUpload();
  setupScenarios();
  setupDownloadButtons();
  setupEstimationControls();
  setupSegmentationControls();
  setupSimulationControls();
  setupOptimizationControls();
  
  // Set modified date in footer
  const modifiedEl = document.getElementById('modified-date');
  if (modifiedEl) modifiedEl.textContent = CREATED_DATE;
}

/**
 * Setup workflow stepper
 */
function setupWorkflowStepper() {
  // Initial state: only step 1 is active
  updateWorkflowStep(1);
}

/**
 * Update workflow stepper to show progress
 */
function updateWorkflowStep(step) {
  const steps = document.querySelectorAll('.workflow-step');
  steps.forEach((stepEl, index) => {
    const stepNumber = index + 1;
    stepEl.classList.remove('active', 'completed');
    
    if (stepNumber < step) {
      stepEl.classList.add('completed');
    } else if (stepNumber === step) {
      stepEl.classList.add('active');
    }
  });
}

/**
 * Setup data tabs (Upload vs Examples)
 */
function setupDataTabs() {
  const tabButtons = document.querySelectorAll('.data-tab');
  const tabContents = document.querySelectorAll('.data-tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });
}

/**
 * Setup example dataset loading
 */
function setupExampleDatasets() {
  const exampleButtons = document.querySelectorAll('[data-load]');
  
  exampleButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const exampleName = button.dataset.load;
      await loadExampleDataset(exampleName);
    });
  });
}

/**
 * Load example dataset
 */
async function loadExampleDataset(exampleName) {
  const feedbackEl = document.getElementById('conjoint-upload-feedback');
  
  try {
    feedbackEl.textContent = `Loading ${exampleName} example dataset...`;
    
    // Map example names to files
    const fileMap = {
      'smartphone': 'smartphone_cbc.csv',
      'coffee': 'coffee_shop_cbc.csv',
      'hotel': 'hotel_features_cbc.csv'
    };
    
    const filename = fileMap[exampleName];
    if (!filename) {
      throw new Error('Example dataset not found');
    }
    
    const response = await fetch(`scenarios/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load example: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const parsed = parseCSV(csvText);
    
    conjointDataset = {
      headers: parsed.headers,
      rows: parsed.rows,
      filename: `${exampleName}_example.csv`
    };
    
    feedbackEl.textContent = `✓ Loaded ${exampleName} example (${parsed.rows.length} rows, ${parsed.headers.length} columns)`;
    
    // Show column mapping
    populateColumnMappingSelects(parsed.headers);
    document.getElementById('conjoint-column-mapping').style.display = 'block';
    
    // Update workflow stepper
    updateWorkflowStep(2);
    
    // Switch back to upload tab to show feedback
    document.querySelector('.data-tab[data-tab="upload"]').click();
    
  } catch (error) {
    console.error('Example load error:', error);
    feedbackEl.textContent = `Error loading example: ${error.message}`;
  }
}

/**
 * Setup file upload functionality
 */
function setupFileUpload() {
  const dropzone = document.getElementById('conjoint-dropzone');
  const fileInput = document.getElementById('conjoint-input');
  const browseBtn = document.getElementById('conjoint-browse');
  const feedbackEl = document.getElementById('conjoint-upload-feedback');

  if (typeof UIUtils !== 'undefined' && UIUtils.initDropzone) {
    UIUtils.initDropzone(dropzone, fileInput, browseBtn, handleFileUpload);
  } else {
    // Fallback
    browseBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });
  }

  const templateBtn = document.getElementById('conjoint-template-download');
  templateBtn?.addEventListener('click', downloadTemplate);
  
  const demoSmallBtn = document.getElementById('conjoint-load-demo-small');
  demoSmallBtn?.addEventListener('click', () => loadDemoDataset('small'));
  
  const demoFullBtn = document.getElementById('conjoint-load-demo-full');
  demoFullBtn?.addEventListener('click', () => loadDemoDataset('full'));
}

/**
 * Load demo dataset
 */
async function loadDemoDataset(size) {
  const feedbackEl = document.getElementById('conjoint-upload-feedback');
  try {
    feedbackEl.textContent = 'Loading demo dataset...';
    
    const filename = size === 'small' ? 'smartphone_cbc_small.csv' : 'smartphone_cbc.csv';
    const response = await fetch(`scenarios/${filename}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load demo dataset: ${response.statusText}`);
    }
    
    const text = await response.text();
    const parsed = typeof csvUtils !== 'undefined'
      ? csvUtils.parseDelimitedText(text)
      : parseCSV(text);
    
    if (!parsed.headers || parsed.headers.length === 0) {
      throw new Error('No headers found in demo dataset');
    }
    
    rawData = parsed.data;
    csvHeaders = parsed.headers;
    
    // Count actual respondents from data
    const uniqueResps = new Set(rawData.map(r => r.respondent_id)).size;
    feedbackEl.textContent = `✓ Loaded demo dataset (${uniqueResps} respondents, ${rawData.length} rows)`;
    
    document.getElementById('conjoint-column-mapping').style.display = 'block';
    populateColumnMappingSelects();
    
  } catch (error) {
    console.error('Demo load error:', error);
    feedbackEl.textContent = `Error: ${error.message}`;
  }
}

/**
 * Download CSV template
 */
function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'conjoint_template.csv';
  link.click();
}

/**
 * Handle file upload
 */
async function handleFileUpload(file) {
  const feedbackEl = document.getElementById('conjoint-upload-feedback');
  try {
    feedbackEl.textContent = 'Reading file...';
    
    const text = await file.text();
    const parsed = typeof csvUtils !== 'undefined'
      ? csvUtils.parseDelimitedText(text)
      : parseCSV(text);
    
    if (!parsed.headers || parsed.headers.length === 0) {
      throw new Error('No headers found in CSV file');
    }
    
    if (parsed.rows.length === 0) {
      throw new Error('No data rows found in CSV file');
    }
    
    if (parsed.rows.length > CONJOINT_UPLOAD_LIMIT) {
      throw new Error(`Dataset too large: ${parsed.rows.length} rows exceeds limit of ${CONJOINT_UPLOAD_LIMIT}`);
    }
    
    conjointDataset = parsed;
    currentDataSource = 'upload';
    currentScenarioName = null;
    
    feedbackEl.textContent = `✓ Loaded ${parsed.rows.length} rows with ${parsed.headers.length} columns.`;
    
    // Track file upload
    if (typeof markDataUploaded === 'function') {
      markDataUploaded(file.name || 'uploaded_file.csv');
    }
    
    // Show column mapping UI
    populateColumnMapping();
    document.getElementById('conjoint-column-mapping').style.display = 'block';
    
  } catch (error) {
    feedbackEl.textContent = `Error: ${error.message}`;
    console.error('Upload error:', error);
  }
}

/**
 * Fallback CSV parser
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    return line.split(',').map(cell => cell.trim());
  });
  return { headers, rows };
}

/**
 * Populate column mapping dropdowns
 */
function populateColumnMapping() {
  const { headers } = conjointDataset;
  const selects = [
    'conjoint-respondent-col',
    'conjoint-task-col',
    'conjoint-alternative-col',
    'conjoint-chosen-col'
  ];
  
  selects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">-- Select column --</option>';
    headers.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      select.appendChild(opt);
    });
  });
  
  // Auto-detect likely columns
  autoDetectColumns();
  
  const confirmBtn = document.getElementById('conjoint-confirm-mapping');
  confirmBtn?.addEventListener('click', confirmMapping, { once: true });
}

/**
 * Auto-detect column mappings
 */
function autoDetectColumns() {
  const { headers } = conjointDataset;
  const patterns = {
    respondent: /(respondent|resp|subject|participant|id)/i,
    task: /(task|trial|question|scenario|set)/i,
    alternative: /(alternative|alt|option|product|choice_id)/i,
    chosen: /(chosen|choice|selected|pick)/i
  };
  
  Object.keys(patterns).forEach(key => {
    const matchedHeader = headers.find(h => patterns[key].test(h));
    if (matchedHeader) {
      const select = document.getElementById(`conjoint-${key}-col`);
      if (select) select.value = matchedHeader;
    }
  });
}

/**
 * Confirm column mapping and proceed to attribute configuration
 */
function confirmMapping() {
  columnMapping.respondent = document.getElementById('conjoint-respondent-col').value;
  columnMapping.task = document.getElementById('conjoint-task-col').value;
  columnMapping.alternative = document.getElementById('conjoint-alternative-col').value;
  columnMapping.chosen = document.getElementById('conjoint-chosen-col').value;
  
  if (!columnMapping.respondent || !columnMapping.task || !columnMapping.alternative || !columnMapping.chosen) {
    alert('Please select all required columns.');
    return;
  }
  
  // Identify attribute columns (all columns except the 4 required ones)
  const requiredCols = [
    columnMapping.respondent,
    columnMapping.task,
    columnMapping.alternative,
    columnMapping.chosen
  ];
  attributeColumns = conjointDataset.headers.filter(h => !requiredCols.includes(h));
  
  // Validate data
  const validation = validateConjointData();
  if (!validation.valid) {
    alert(`Data validation failed:\n${validation.errors.join('\n')}`);
    return;
  }
  
  // Show attribute configuration
  populateAttributeConfiguration();
  document.getElementById('conjoint-attribute-config').style.display = 'block';
  document.getElementById('conjoint-estimation-controls').style.display = 'block';
  
  // Update workflow stepper to step 3
  updateWorkflowStep(3);
}

/**
 * Validate conjoint data structure
 */
function validateConjointData() {
  const errors = [];
  const { headers, rows } = conjointDataset;
  
  const respIdx = headers.indexOf(columnMapping.respondent);
  const taskIdx = headers.indexOf(columnMapping.task);
  const altIdx = headers.indexOf(columnMapping.alternative);
  const chosenIdx = headers.indexOf(columnMapping.chosen);
  
  // Check chosen values are 0/1
  const chosenValues = new Set(rows.map(r => r[chosenIdx]));
  if (!chosenValues.has('0') && !chosenValues.has('1')) {
    errors.push('Chosen column must contain 0 and 1 values.');
  }
  
  // Check each task has exactly one chosen alternative
  const taskMap = {};
  rows.forEach(row => {
    const key = `${row[respIdx]}_${row[taskIdx]}`;
    if (!taskMap[key]) taskMap[key] = { total: 0, chosen: 0 };
    taskMap[key].total++;
    if (row[chosenIdx] === '1') taskMap[key].chosen++;
  });
  
  const badTasks = Object.entries(taskMap).filter(([_, v]) => v.chosen !== 1);
  if (badTasks.length > 0) {
    errors.push(`${badTasks.length} tasks do not have exactly one chosen alternative.`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Populate attribute configuration UI
 */
function populateAttributeConfiguration() {
  const container = document.getElementById('conjoint-attribute-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  attributeColumns.forEach(attrName => {
    // Detect if numeric
    const values = getColumnValues(attrName);
    const isNumeric = values.every(v => v === '' || !isNaN(parseFloat(v)));
    
    const card = document.createElement('div');
    card.className = 'attribute-config-item';
    card.innerHTML = `
      <div class="attribute-config-header">
        <strong>${escapeHtml(attrName)}</strong>
      </div>
      <div class="attribute-config-controls">
        <label>Type:</label>
        <select class="attr-type-select" data-attr="${escapeHtml(attrName)}">
          <option value="categorical" ${!isNumeric ? 'selected' : ''}>Categorical</option>
          <option value="numeric_linear" ${isNumeric ? 'selected' : ''}>Numeric (linear)</option>
          <option value="numeric_quadratic">Numeric (quadratic)</option>
          <option value="price">Price (special)</option>
        </select>
      </div>
    `;
    container.appendChild(card);
    
    // Initialize config
    attributeConfig[attrName] = {
      type: isNumeric ? 'numeric_linear' : 'categorical'
    };
  });
  
  // Setup change listeners
  document.querySelectorAll('.attr-type-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const attrName = e.target.dataset.attr;
      attributeConfig[attrName].type = e.target.value;
    });
  });
  
  // Populate special alternatives
  populateSpecialAlternatives();
}

/**
 * Get unique values from a column
 */
function getColumnValues(columnName) {
  const { headers, rows } = conjointDataset;
  const idx = headers.indexOf(columnName);
  if (idx === -1) return [];
  return rows.map(r => r[idx]);
}

/**
 * Populate None and Competitor alternative selectors
 */
function populateSpecialAlternatives() {
  const { headers, rows } = conjointDataset;
  const altIdx = headers.indexOf(columnMapping.alternative);
  const uniqueAlts = [...new Set(rows.map(r => r[altIdx]))];
  
  // None alternative dropdown
  const noneSelect = document.getElementById('conjoint-none-alternative');
  if (noneSelect) {
    noneSelect.innerHTML = '<option value="">-- No "None" option --</option>';
    uniqueAlts.forEach(alt => {
      const opt = document.createElement('option');
      opt.value = alt;
      opt.textContent = alt;
      noneSelect.appendChild(opt);
    });
  }
  
  // Competitor checkboxes
  const compList = document.getElementById('conjoint-competitor-list');
  if (compList) {
    compList.innerHTML = '';
    uniqueAlts.forEach(alt => {
      const label = document.createElement('label');
      label.className = 'checkbox-label';
      label.innerHTML = `
        <input type="checkbox" class="comp-checkbox" value="${escapeHtml(alt)}">
        <span>${escapeHtml(alt)}</span>
      `;
      compList.appendChild(label);
    });
  }
}

/**
 * Setup estimation controls
 */
function setupEstimationControls() {
  const estimateBtn = document.getElementById('conjoint-estimate-model');
  estimateBtn?.addEventListener('click', runEstimation);
}

/**
 * Run model estimation - BROWSER VERSION using Pyodide
 */
async function runEstimation() {
  // Track button click
  if (typeof markRunAttempted === 'function') {
    markRunAttempted();
  }
  
  const statusEl = document.getElementById('conjoint-estimation-status');
  const estimateBtn = document.getElementById('conjoint-estimate-model');
  const loadingOverlay = document.getElementById('conjoint-loading-overlay');
  const loadingProgressText = document.getElementById('loading-progress-text');
  
  try {
    // Capture special alternatives
    noneAlternative = document.getElementById('conjoint-none-alternative')?.value || null;
    competitorAlternatives = Array.from(document.querySelectorAll('.comp-checkbox:checked')).map(cb => cb.value);
    
    statusEl.textContent = 'Initializing Python environment...';
    estimateBtn.disabled = true;
    
    // Show enhanced loading modal
    loadingOverlay.setAttribute('aria-hidden', 'false');
    loadingOverlay.style.display = 'flex';
    loadingProgressText.textContent = 'Loading Pyodide (Python in browser)...';
    
    // Initialize Pyodide if needed
    if (!pyodideReady) {
      await initPyodide();
    }
    
    loadingProgressText.textContent = 'Building estimation payload...';
    
    // Build request payload
    const payload = buildEstimationPayload();
    
    // Update loading modal with dataset info
    const uniqueRespondents = new Set(payload.data.map(d => d.respondent_id)).size;
    const uniqueTasks = new Set(payload.data.map(d => d.task_id)).size;
    document.getElementById('loading-respondents').innerHTML = `Respondents: <strong>${uniqueRespondents}</strong>`;
    document.getElementById('loading-tasks').innerHTML = `Tasks: <strong>${uniqueTasks}</strong>`;
    
    // Estimate time based on respondent count (~0.5-1 sec per respondent typical)
    const estimatedMinSec = Math.round(uniqueRespondents * 0.5);
    const estimatedMaxSec = Math.round(uniqueRespondents * 1.5);
    const estimatedMinStr = estimatedMinSec >= 60 
      ? `${Math.floor(estimatedMinSec/60)}m ${estimatedMinSec%60}s` 
      : `${estimatedMinSec}s`;
    const estimatedMaxStr = estimatedMaxSec >= 60 
      ? `${Math.floor(estimatedMaxSec/60)}m ${estimatedMaxSec%60}s` 
      : `${estimatedMaxSec}s`;
    
    statusEl.textContent = 'Estimating individual-level utilities (in browser)...';
    loadingProgressText.innerHTML = `
      <strong>Estimating utilities for ${uniqueRespondents} respondents...</strong><br>
      <span style="font-size: 0.9em; color: #6b7280;">
        ⏱️ Estimated time: ${estimatedMinStr} – ${estimatedMaxStr}<br>
        <em>Actual time varies by your CPU speed, browser, and other open applications.</em>
      </span>
    `;
    
    // Run estimation in Pyodide
    const startTime = performance.now();
    
    // Convert data to JSON strings for Python
    const dataJson = JSON.stringify(payload.data);
    const attrMetaJson = JSON.stringify(payload.attribute_metadata);
    const competitorsJson = JSON.stringify(payload.competitor_alternative_ids || []);
    const noneAltId = payload.none_alternative_id || '';
    const regStrength = payload.model_options?.reg_strength || 1.0;
    
    // Call Python function
    const resultJson = await pyodide.runPythonAsync(`
      run_conjoint_estimation(
        '''${dataJson.replace(/'/g, "\\'")}''',
        '''${attrMetaJson.replace(/'/g, "\\'")}''',
        '${noneAltId}' if '${noneAltId}' else None,
        '''${competitorsJson.replace(/'/g, "\\'")}''',
        ${regStrength}
      )
    `);
    
    const result = JSON.parse(resultJson);
    const browserTime = (performance.now() - startTime) / 1000;
    
    if (!result.success) {
      let errorMsg = result.detail || 'Estimation failed';
      if (result.failed_respondents && result.failed_respondents.length > 0) {
        errorMsg += `\\n\\nFailed respondents (${result.failed_respondents.length}):\\n`;
        result.failed_respondents.slice(0, 5).forEach(f => {
          errorMsg += `- ${f.respondent_id}: ${f.error}\\n`;
        });
        if (result.failed_respondents.length > 5) {
          errorMsg += `... and ${result.failed_respondents.length - 5} more`;
        }
      }
      throw new Error(errorMsg);
    }
    
    estimationResult = result;
    hasSuccessfulRun = true;
    
    // Hide loading modal
    loadingOverlay.setAttribute('aria-hidden', 'true');
    loadingOverlay.style.display = 'none';
    
    statusEl.textContent = `✓ Estimated utilities for ${result.respondents.length} respondents in ${browserTime.toFixed(1)}s (BROWSER-SIDE via Pyodide)`;
    
    // Track successful run
    if (typeof markRunSuccessful === 'function') {
      markRunSuccessful(
        {
          n_respondents: result.respondents.length,
          n_attributes: attributeColumns.length,
          mean_pseudo_r2: result.mean_pseudo_r2,
          estimation_time: browserTime,
          execution_mode: 'browser_pyodide'
        },
        `n_resp=${result.respondents.length}, n_attr=${attributeColumns.length}, mean_R²=${result.mean_pseudo_r2?.toFixed(3)}, time=${browserTime.toFixed(1)}s (BROWSER)`
      );
    }
    
    // Display results
    displayEstimationResults(result);
    
    // Show results sections
    document.getElementById('conjoint-results-section').style.display = 'block';
    document.getElementById('conjoint-test-results').style.display = 'block';
    document.getElementById('conjoint-diagnostics').style.display = 'block';
    document.getElementById('conjoint-segmentation').style.display = 'block';
    document.getElementById('conjoint-simulation').style.display = 'block';
    document.getElementById('conjoint-optimization').style.display = 'block';
    
    // Update workflow stepper to step 4 (Analyze Results)
    updateWorkflowStep(4);
    
  } catch (error) {
    console.error('Estimation error:', error);
    statusEl.textContent = `Error: ${error.message}`;
    
    // Hide loading modal
    loadingOverlay.setAttribute('aria-hidden', 'true');
    loadingOverlay.style.display = 'none';
  } finally {
    estimateBtn.disabled = false;
  }
}

/**
 * Build payload for estimation API
 */
function buildEstimationPayload() {
  const { headers, rows } = conjointDataset;
  const respIdx = headers.indexOf(columnMapping.respondent);
  const taskIdx = headers.indexOf(columnMapping.task);
  const altIdx = headers.indexOf(columnMapping.alternative);
  const chosenIdx = headers.indexOf(columnMapping.chosen);
  
  // Build data array
  const data = rows.map(row => {
    const obj = {
      respondent_id: row[respIdx],
      task_id: row[taskIdx],
      alternative_id: row[altIdx],
      chosen: parseInt(row[chosenIdx])
    };
    
    // Add attribute columns
    attributeColumns.forEach(attrName => {
      const idx = headers.indexOf(attrName);
      obj[attrName] = row[idx];
    });
    
    return obj;
  });
  
  // Build attribute metadata
  const attribute_metadata = {};
  Object.keys(attributeConfig).forEach(attrName => {
    attribute_metadata[attrName] = {
      type: attributeConfig[attrName].type
    };
  });
  
  const regStrength = parseFloat(document.getElementById('conjoint-regularization')?.value || 1.0);
  
  return {
    data,
    attribute_metadata,
    none_alternative_id: noneAlternative || null,
    competitor_alternative_ids: competitorAlternatives,
    model_options: {
      regularization: 'L2',
      reg_strength: regStrength
    }
  };
}

/**
 * Display estimation results
 */
function displayEstimationResults(result) {
  // Update metrics
  document.getElementById('conjoint-n-respondents').textContent = result.respondents.length;
  document.getElementById('conjoint-mean-tasks').textContent = result.mean_tasks_per_respondent?.toFixed(1) || '—';
  document.getElementById('conjoint-mean-r2').textContent = result.mean_pseudo_r2?.toFixed(3) || '—';
  document.getElementById('conjoint-estimation-time').textContent = `${result.estimation_time_seconds?.toFixed(1) || '?'}s`;
  
  // Render charts
  renderImportanceChart(result.aggregate_summaries.mean_attribute_importance);
  renderPartWorthChart(result.aggregate_summaries.mean_utilities);
  renderPriceDistributionChart(result);
  
  // Populate utilities table
  populateUtilitiesTable(result.aggregate_summaries.mean_utilities);
  
  // Generate reports
  generateAPAReport(result);
  generateManagerialReport(result);
  
  // Populate diagnostics
  populateDiagnostics(result);
  
  // Setup individual viewer
  setupIndividualViewer(result.respondents);
}

/**
 * Render attribute importance chart
 */
function renderImportanceChart(importance) {
  const data = [{
    x: Object.values(importance),
    y: Object.keys(importance),
    type: 'bar',
    orientation: 'h',
    marker: { color: '#4A90E2' }
  }];
  
  const layout = {
    title: '',
    xaxis: { title: 'Importance (%)', range: [0, 100] },
    yaxis: { title: '' },
    margin: { l: 120, r: 40, t: 20, b: 50 }
  };
  
  Plotly.newPlot('chart-importance', data, layout, { responsive: true });
}

/**
 * Render part-worth utilities chart
 */
function renderPartWorthChart(utilities) {
  const traces = [];
  
  Object.entries(utilities).forEach(([attr, levels]) => {
    if (typeof levels === 'object' && !Array.isArray(levels)) {
      // Filter out internal keys like '_value' for numeric attributes
      const levelNames = Object.keys(levels).filter(k => k !== '_value');
      const levelMeans = levelNames.map(k => {
        const val = levels[k];
        // The data structure is {mean, std, min, max} - we want the mean
        return typeof val === 'object' && val.mean !== undefined ? val.mean : val;
      });
      
      // Only add trace if we have actual level data
      if (levelNames.length > 0 && levelMeans.some(v => v !== null && v !== undefined)) {
        traces.push({
          x: levelMeans,
          y: levelNames,
          type: 'bar',
          orientation: 'h',
          name: attr
        });
      }
      
      // Handle numeric attributes with '_value' key
      if (levels['_value'] !== undefined) {
        const val = levels['_value'];
        const mean = typeof val === 'object' && val.mean !== undefined ? val.mean : val;
        if (mean !== null && mean !== undefined) {
          traces.push({
            x: [mean],
            y: [attr],
            type: 'bar',
            orientation: 'h',
            name: attr
          });
        }
      }
    }
  });
  
  const layout = {
    title: '',
    xaxis: { title: 'Mean Part-Worth Utility' },
    yaxis: { title: '' },
    barmode: 'group',
    margin: { l: 150, r: 40, t: 20, b: 50 }
  };
  
  Plotly.newPlot('chart-partworths', traces, layout, { responsive: true });
}

/**
 * Render price coefficient distribution
 */
function renderPriceDistributionChart(result) {
  const priceCoefs = result.respondents
    .map(r => r.coefficients.price)
    .filter(v => v !== undefined && v !== null);
  
  if (priceCoefs.length === 0) {
    document.getElementById('chart-price-dist').innerHTML = '<p class="muted">No price coefficient available.</p>';
    return;
  }
  
  const data = [{
    x: priceCoefs,
    type: 'histogram',
    marker: { color: '#E94B3C' },
    nbinsx: 20
  }];
  
  const layout = {
    title: '',
    xaxis: { title: 'Price Coefficient (more negative = more sensitive)' },
    yaxis: { title: 'Number of Respondents' },
    margin: { l: 60, r: 40, t: 20, b: 50 }
  };
  
  Plotly.newPlot('chart-price-dist', data, layout, { responsive: true });
}

/**
 * Populate utilities table
 */
function populateUtilitiesTable(meanUtilities) {
  const tbody = document.getElementById('conjoint-utilities-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  Object.entries(meanUtilities).forEach(([attr, levels]) => {
    if (typeof levels === 'object' && !Array.isArray(levels)) {
      Object.entries(levels).forEach(([level, stats]) => {
        const row = tbody.insertRow();
        row.innerHTML = `
          <td>${escapeHtml(attr)}</td>
          <td>${escapeHtml(level)}</td>
          <td>${stats.mean?.toFixed(3) || '—'}</td>
          <td>${stats.std?.toFixed(3) || '—'}</td>
          <td>${stats.min?.toFixed(3) || '—'}</td>
          <td>${stats.max?.toFixed(3) || '—'}</td>
        `;
      });
    }
  });
}

/**
 * Generate APA-style report
 */
function generateAPAReport(result) {
  const nResp = result.respondents.length;
  const meanR2 = result.mean_pseudo_r2?.toFixed(3) || '?';
  const meanTasks = result.mean_tasks_per_respondent?.toFixed(1) || '?';
  
  const topAttrs = Object.entries(result.aggregate_summaries.mean_attribute_importance)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([attr, imp]) => `${attr} (${imp.toFixed(1)}%)`)
    .join(', ');
  
  const report = `
    We estimated individual-level part-worth utilities for ${nResp} respondents using multinomial logit regression with L2 regularization. 
    Each respondent completed an average of ${meanTasks} choice tasks. The mean pseudo-R² (McFadden) was ${meanR2}, indicating ${parseFloat(meanR2) > 0.3 ? 'good' : 'moderate'} model fit. 
    Attribute importance analysis revealed that the most influential drivers of choice were: ${topAttrs}.
    ${result.aggregate_summaries.mean_utilities.price?.['_value']?.mean ? 
      `The mean price coefficient was ${result.aggregate_summaries.mean_utilities.price['_value'].mean.toFixed(4)}, suggesting ${Math.abs(result.aggregate_summaries.mean_utilities.price['_value'].mean) > 0.01 ? 'substantial' : 'moderate'} price sensitivity.` : ''}
  `.trim();
  
  document.getElementById('conjoint-apa-report').textContent = report;
}

/**
 * Generate managerial interpretation
 */
function generateManagerialReport(result) {
  const topAttr = Object.entries(result.aggregate_summaries.mean_attribute_importance)
    .sort((a, b) => b[1] - a[1])[0];
  
  const report = `
    Customers prioritize <strong>${topAttr[0]}</strong> (${topAttr[1].toFixed(1)}% importance) when making purchase decisions in this category. 
    This suggests marketing should emphasize ${topAttr[0]}-related messaging and product development should focus investment in this dimension.
    ${result.aggregate_summaries.mean_utilities.price?.['_value']?.mean ? 
      `Price sensitivity is ${Math.abs(result.aggregate_summaries.mean_utilities.price['_value'].mean) > 0.01 ? 'high' : 'moderate'}, indicating customers will trade off features for lower prices. Consider value-tier segmentation strategies.` : ''}
    Use the simulation tool below to test how different product configurations would perform in a competitive market scenario.
  `.trim();
  
  document.getElementById('conjoint-managerial-report').innerHTML = report;
}

/**
 * Populate diagnostics section
 */
function populateDiagnostics(result) {
  const container = document.getElementById('conjoint-data-quality');
  if (!container) return;
  
  const nResp = result.respondents.length;
  const meanTasks = result.mean_tasks_per_respondent;
  const meanR2 = result.mean_pseudo_r2;
  
  let html = '<h4>Data Quality Assessment</h4><ul>';
  
  if (nResp < 100) {
    html += `<li class="warning">⚠️ Sample size (${nResp}) is below recommended minimum (100+). Aggregate estimates may be unstable.</li>`;
  } else if (nResp < 200) {
    html += `<li class="info">ℹ️ Sample size (${nResp}) is adequate for aggregate analysis but small for robust segmentation.</li>`;
  } else {
    html += `<li class="success">✓ Sample size (${nResp}) is sufficient for aggregate and segmentation analysis.</li>`;
  }
  
  if (meanTasks < 8) {
    html += `<li class="warning">⚠️ Mean tasks per respondent (${meanTasks.toFixed(1)}) is below recommended minimum (8). Individual estimates may be unreliable.</li>`;
  } else {
    html += `<li class="success">✓ Mean tasks per respondent (${meanTasks.toFixed(1)}) is adequate for individual-level estimation.</li>`;
  }
  
  if (meanR2 < 0.15) {
    html += `<li class="warning">⚠️ Mean pseudo-R² (${meanR2.toFixed(3)}) is low, suggesting weak model fit. Check for data quality issues or consider adding interaction terms.</li>`;
  } else if (meanR2 < 0.30) {
    html += `<li class="info">ℹ️ Mean pseudo-R² (${meanR2.toFixed(3)}) indicates moderate fit, typical for CBC studies.</li>`;
  } else {
    html += `<li class="success">✓ Mean pseudo-R² (${meanR2.toFixed(3)}) indicates strong model fit.</li>`;
  }
  
  html += '</ul>';
  
  // Add convergence diagnostics
  const converged = result.respondents.filter(r => r.convergence?.converged).length;
  const totalResp = result.respondents.length;
  const convergenceRate = (converged / totalResp * 100).toFixed(1);
  
  const methodCounts = {};
  result.respondents.forEach(r => {
    const method = r.convergence?.method || 'Unknown';
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });
  
  const meanIterations = result.respondents
    .filter(r => r.convergence?.iterations != null)
    .reduce((sum, r) => sum + r.convergence.iterations, 0) / 
    result.respondents.filter(r => r.convergence?.iterations != null).length;
  
  html += '<h4>Optimization Convergence</h4><ul>';
  html += `<li><strong>Total estimation time:</strong> ${result.estimation_time_seconds?.toFixed(1) || '?'} seconds</li>`;
  html += `<li><strong>Convergence rate:</strong> ${converged}/${totalResp} (${convergenceRate}%) respondents converged successfully</li>`;
  html += `<li><strong>Mean iterations:</strong> ${meanIterations.toFixed(1)} (max: 200)</li>`;
  html += `<li><strong>Methods used:</strong> `;
  Object.entries(methodCounts).forEach(([method, count]) => {
    html += `${method}: ${count} (${(count/totalResp*100).toFixed(1)}%); `;
  });
  html += '</li>';
  
  if (convergenceRate < 95) {
    html += `<li class="warning">⚠️ ${100-parseFloat(convergenceRate)}% of respondents did not converge. This may indicate data quality issues or insufficient choice tasks.</li>`;
  } else {
    html += `<li class="success">✓ High convergence rate indicates reliable optimization.</li>`;
  }
  
  html += '</ul>';
  
  container.innerHTML = html;
}

/**
 * Setup individual respondent viewer
 */
function setupIndividualViewer(respondents) {
  const viewBtn = document.getElementById('conjoint-view-individual');
  const viewer = document.getElementById('conjoint-individual-viewer');
  const select = document.getElementById('conjoint-respondent-select');
  const details = document.getElementById('conjoint-individual-details');
  
  if (!viewBtn || !viewer || !select || !details) return;
  
  // Populate dropdown
  select.innerHTML = '<option value="">-- Choose a respondent --</option>';
  respondents.forEach(resp => {
    const option = document.createElement('option');
    option.value = resp.respondent_id;
    option.textContent = `${resp.respondent_id} (R²=${resp.fit.pseudo_r2?.toFixed(3) || '?'})`;
    select.appendChild(option);
  });
  
  // Toggle viewer visibility
  viewBtn.addEventListener('click', () => {
    const isHidden = viewer.style.display === 'none';
    viewer.style.display = isHidden ? 'block' : 'none';
    viewBtn.textContent = isHidden ? 'Hide individual viewer' : 'View individual respondent utilities';
  });
  
  // Handle selection changes
  select.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      details.innerHTML = '<p class="muted">Select a respondent to view their estimated utilities and model fit.</p>';
      return;
    }
    
    const resp = respondents.find(r => r.respondent_id === selectedId);
    if (!resp) return;
    
    let html = `
      <h4>Respondent ${escapeHtml(resp.respondent_id)}</h4>
      <div class="metric-output">Pseudo-R²: <strong>${resp.fit.pseudo_r2?.toFixed(3) || '—'}</strong></div>
      <div class="metric-output">Log-likelihood: <strong>${resp.fit.log_likelihood?.toFixed(2) || '—'}</strong></div>
      <div class="metric-output">Tasks completed: <strong>${resp.fit.n_tasks || '—'}</strong></div>
      <div class="metric-output">Observations: <strong>${resp.fit.n_observations || '—'}</strong></div>
      
      <h5 style="margin-top: 1.5rem;">Coefficients</h5>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Utility</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    Object.entries(resp.coefficients).forEach(([param, value]) => {
      html += `
        <tr>
          <td>${escapeHtml(param)}</td>
          <td>${value?.toFixed(4) || '—'}</td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
      
      <h5 style="margin-top: 1.5rem;">Attribute Importance</h5>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Importance (%)</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    Object.entries(resp.attribute_importance).forEach(([attr, imp]) => {
      html += `
        <tr>
          <td>${escapeHtml(attr)}</td>
          <td>${imp?.toFixed(1) || '—'}%</td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    details.innerHTML = html;
  });
}

/**
 * Setup segmentation controls
 */
function setupSegmentationControls() {
  const runBtn = document.getElementById('conjoint-run-segmentation');
  runBtn?.addEventListener('click', runSegmentation);
}

/**
 * Run k-means segmentation
 */
function runSegmentation() {
  const statusEl = document.getElementById('conjoint-segmentation-status');
  
  if (!estimationResult) {
    statusEl.textContent = 'Please estimate utilities first.';
    return;
  }
  
  try {
    const k = parseInt(document.getElementById('conjoint-n-clusters')?.value || 3);
    statusEl.textContent = `Running k-means with ${k} clusters...`;
    
    // Extract utility vectors (exclude ASCs for clustering)
    const utilityVectors = estimationResult.respondents.map(r => {
      const vec = [];
      Object.entries(r.coefficients).forEach(([key, val]) => {
        if (!key.startsWith('ASC_')) {
          vec.push(val || 0);
        }
      });
      return vec;
    });
    
    // Normalize
    const normalized = normalizeVectors(utilityVectors);
    
    // Run k-means
    const clusters = kMeans(normalized, k);
    
    // Assign to respondents
    estimationResult.respondents.forEach((r, i) => {
      r.segment = clusters[i];
    });
    
    // Compute segment profiles
    segmentationResult = computeSegmentProfiles(k);
    
    statusEl.textContent = `✓ Segmented into ${k} clusters.`;
    
    // Display results
    displaySegmentationResults(segmentationResult);
    document.getElementById('conjoint-segment-results').style.display = 'block';
    
  } catch (error) {
    console.error('Segmentation error:', error);
    statusEl.textContent = `Error: ${error.message}`;
  }
}

/**
 * Normalize vectors (z-score)
 */
function normalizeVectors(vectors) {
  const nFeatures = vectors[0].length;
  const means = [];
  const stds = [];
  
  for (let j = 0; j < nFeatures; j++) {
    const vals = vectors.map(v => v[j]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    const std = Math.sqrt(variance);
    means.push(mean);
    stds.push(std || 1);
  }
  
  return vectors.map(vec => 
    vec.map((val, j) => (val - means[j]) / stds[j])
  );
}

/**
 * Simple k-means clustering
 */
function kMeans(data, k, maxIter = 100) {
  const n = data.length;
  const dim = data[0].length;
  
  // Initialize centroids randomly
  let centroids = [];
  const indices = new Set();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * n);
    if (!indices.has(idx)) {
      centroids.push([...data[idx]]);
      indices.add(idx);
    }
  }
  
  let assignments = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    
    // Assign each point to nearest centroid
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = euclideanDist(data[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }
    
    if (!changed) break;
    
    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = data.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length > 0) {
        for (let d = 0; d < dim; d++) {
          centroids[c][d] = clusterPoints.reduce((sum, p) => sum + p[d], 0) / clusterPoints.length;
        }
      }
    }
  }
  
  return assignments;
}

function euclideanDist(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

/**
 * Compute segment profiles
 */
function computeSegmentProfiles(k) {
  const segments = [];
  
  for (let c = 0; c < k; c++) {
    const members = estimationResult.respondents.filter(r => r.segment === c);
    
    // Aggregate attribute importance
    const meanImportance = {};
    members.forEach(r => {
      Object.entries(r.attribute_importance).forEach(([attr, imp]) => {
        if (!meanImportance[attr]) meanImportance[attr] = [];
        meanImportance[attr].push(imp);
      });
    });
    
    Object.keys(meanImportance).forEach(attr => {
      meanImportance[attr] = meanImportance[attr].reduce((a, b) => a + b, 0) / meanImportance[attr].length;
    });
    
    // Aggregate utilities (coefficients)
    const meanUtilities = {};
    members.forEach(r => {
      Object.entries(r.coefficients).forEach(([coef, val]) => {
        if (val != null) {
          if (!meanUtilities[coef]) meanUtilities[coef] = [];
          meanUtilities[coef].push(val);
        }
      });
    });
    
    Object.keys(meanUtilities).forEach(coef => {
      const vals = meanUtilities[coef];
      meanUtilities[coef] = {
        mean: vals.reduce((a, b) => a + b, 0) / vals.length,
        std: Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - (vals.reduce((x, y) => x + y, 0) / vals.length), 2), 0) / vals.length),
        min: Math.min(...vals),
        max: Math.max(...vals)
      };
    });
    
    const topAttr = Object.entries(meanImportance).sort((a, b) => b[1] - a[1])[0];
    
    const priceCoefs = members.map(r => r.coefficients.price).filter(v => v != null);
    const meanPrice = priceCoefs.length > 0 
      ? priceCoefs.reduce((a, b) => a + b, 0) / priceCoefs.length 
      : null;
    
    segments.push({
      id: c,
      size: members.length,
      meanImportance,
      meanUtilities,
      topAttribute: topAttr ? topAttr[0] : 'N/A',
      meanPriceCoef: meanPrice
    });
  }
  
  return segments;
}

/**
 * Display segmentation results
 */
function displaySegmentationResults(segments) {
  // Segment sizes pie chart
  const pieData = [{
    labels: segments.map((s, i) => `Segment ${i + 1}`),
    values: segments.map(s => s.size),
    type: 'pie'
  }];
  
  Plotly.newPlot('chart-segment-sizes', pieData, { title: '' }, { responsive: true });
  
  // Importance comparison
  const attrs = Object.keys(segments[0].meanImportance);
  const traces = segments.map((seg, i) => ({
    x: attrs,
    y: attrs.map(a => seg.meanImportance[a]),
    type: 'bar',
    name: `Segment ${i + 1}`
  }));
  
  const layout = {
    title: '',
    xaxis: { title: 'Attribute' },
    yaxis: { title: 'Mean Importance (%)' },
    barmode: 'group'
  };
  
  Plotly.newPlot('chart-segment-importance', traces, layout, { responsive: true });
  
  // Summary table
  const tbody = document.getElementById('conjoint-segment-table-body');
  tbody.innerHTML = '';
  segments.forEach((seg, i) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>Segment ${i + 1}</td>
      <td>${seg.size}</td>
      <td>${seg.meanPriceCoef?.toFixed(4) || '—'}</td>
      <td>${seg.topAttribute}</td>
    `;
  });
  
  // Detailed utilities for each segment
  const detailsContainer = document.getElementById('conjoint-segment-details');
  if (detailsContainer) {
    let html = '<h3>Segment-Level Part-Worth Utilities</h3>';
    
    segments.forEach((seg, i) => {
      html += `
        <details class="segment-utilities-details" open>
          <summary><strong>Segment ${i + 1}</strong> (n=${seg.size}, top attribute: ${seg.topAttribute})</summary>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Mean</th>
                <th>Std. Dev.</th>
                <th>Min</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      Object.entries(seg.meanUtilities).forEach(([param, stats]) => {
        html += `
          <tr>
            <td>${escapeHtml(param)}</td>
            <td>${stats.mean?.toFixed(4) || '—'}</td>
            <td>${stats.std?.toFixed(4) || '—'}</td>
            <td>${stats.min?.toFixed(4) || '—'}</td>
            <td>${stats.max?.toFixed(4) || '—'}</td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </details>
      `;
    });
    
    detailsContainer.innerHTML = html;
  }
}

/**
 * Setup simulation controls
 */
function setupSimulationControls() {
  const addBtn = document.getElementById('conjoint-add-product');
  addBtn?.addEventListener('click', addProductToSimulation);
  
  const clearBtn = document.getElementById('conjoint-clear-scenario');
  clearBtn?.addEventListener('click', clearSimulationScenario);
  
  const runBtn = document.getElementById('conjoint-run-simulation');
  runBtn?.addEventListener('click', runSimulation);
  
  // Price mode selection
  const priceModeSelect = document.getElementById('conjoint-price-mode');
  priceModeSelect?.addEventListener('change', handlePriceModeChange);
  
  // Initialize price mode
  handlePriceModeChange();
  
  // Base cost input
  const baseCostInput = document.getElementById('conjoint-base-cost');
  baseCostInput?.addEventListener('change', () => {
    simulationConfig.baseCost = parseFloat(baseCostInput.value) || 0;
  });
  
  // Simulation option checkboxes
  const forceChoiceCheckbox = document.getElementById('conjoint-force-choice');
  forceChoiceCheckbox?.addEventListener('change', () => {
    simulationConfig.forceChoice = forceChoiceCheckbox.checked;
    updateAutoIncludedDisplay();
  });
  
  const ignoreCompetitorsCheckbox = document.getElementById('conjoint-ignore-competitors');
  ignoreCompetitorsCheckbox?.addEventListener('change', () => {
    simulationConfig.ignoreCompetitors = ignoreCompetitorsCheckbox.checked;
    updateAutoIncludedDisplay();
  });
  
  // Initialize auto-included display
  updateAutoIncludedDisplay();
}

/**
 * Update display of auto-included products (competitors and None)
 */
function updateAutoIncludedDisplay() {
  const container = document.getElementById('conjoint-auto-included-products');
  const list = document.getElementById('conjoint-auto-list');
  
  if (!container || !list) return;
  
  const autoIncluded = [];
  
  // Add None option if it exists and not being forced out
  if (noneAlternative && !simulationConfig.forceChoice) {
    autoIncluded.push('"None" / No Purchase option');
  }
  
  // Add competitors if they exist and not being ignored
  if (competitorAlternatives.length > 0 && !simulationConfig.ignoreCompetitors) {
    competitorAlternatives.forEach(compId => {
      autoIncluded.push(`Competitor: ${compId}`);
    });
  }
  
  if (autoIncluded.length > 0) {
    list.innerHTML = autoIncluded.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

let simulationProducts = [];
let simulationConfig = {
  priceMode: 'attribute', // 'attribute', 'fixed', 'none'
  baseCost: 0,
  incrementalCosts: {}, // { 'Brand_Sony': 50, 'Camera_12MP': -10, ... }
  showWTP: false,
  forceChoice: false, // If true, exclude "None" from simulation
  ignoreCompetitors: false // If true, exclude competitors from simulation
};

function handlePriceModeChange() {
  const mode = document.getElementById('conjoint-price-mode')?.value || 'attribute';
  simulationConfig.priceMode = mode;
  
  const wtpOptions = document.getElementById('price-wtp-options');
  const hintEl = document.getElementById('price-mode-hint');
  
  if (mode === 'attribute') {
    wtpOptions.style.display = 'block';
    hintEl.textContent = 'Price was included as an attribute in the conjoint design. Its estimated coefficient can be used to calculate willingness-to-pay (WTP) for other attributes.';
  } else if (mode === 'fixed') {
    wtpOptions.style.display = 'none';
    hintEl.textContent = 'Price was held constant in the conjoint design. You can manually set prices for simulation, but WTP cannot be calculated.';
  } else {
    wtpOptions.style.display = 'none';
    hintEl.textContent = 'No pricing involved (e.g., free products, course selection). Simulation will show market shares only.';
  }
  
  // Populate incremental costs UI
  populateIncrementalCostsUI();
}

function populateIncrementalCostsUI() {
  const container = document.getElementById('conjoint-cost-config-list');
  if (!container || !estimationResult) return;
  
  let html = '';
  
  attributeColumns.forEach(attr => {
    const config = attributeConfig[attr];
    
    // Skip price attribute for cost configuration
    if (attr.toLowerCase() === 'price') return;
    
    if (config.type === 'categorical') {
      const levels = [...new Set(getColumnValues(attr))].filter(v => v);
      const sortedLevels = levels.sort();
      const baseline = sortedLevels[0];
      
      html += `<div class="cost-attribute-group">
        <h5>${escapeHtml(attr)}</h5>
        <p class="hint-inline">Baseline: ${escapeHtml(baseline)} (cost = 0)</p>`;
      
      sortedLevels.slice(1).forEach(level => {
        const key = `${attr}_${level}`;
        const currentCost = simulationConfig.incrementalCosts[key] || 0;
        html += `
          <label>
            <span>${escapeHtml(level)}:</span>
            <input type="number" class="incr-cost" data-key="${escapeHtml(key)}" 
                   value="${currentCost}" step="0.01" placeholder="0">
            <span class="hint-inline">$/unit</span>
          </label>`;
      });
      
      html += `</div>`;
    } else {
      // For numeric attributes, show a single input for marginal cost per unit
      const currentCost = simulationConfig.incrementalCosts[attr] || 0;
      html += `<div class="cost-attribute-group">
        <h5>${escapeHtml(attr)}</h5>
        <label>
          <span>Marginal cost per unit:</span>
          <input type="number" class="incr-cost" data-key="${escapeHtml(attr)}" 
                 value="${currentCost}" step="0.01" placeholder="0">
          <span class="hint-inline">$/unit increase in ${escapeHtml(attr)}</span>
        </label>
      </div>`;
    }
  });
  
  container.innerHTML = html;
  
  // Attach listeners
  document.querySelectorAll('.incr-cost').forEach(input => {
    input.addEventListener('change', e => {
      const key = e.target.dataset.key;
      simulationConfig.incrementalCosts[key] = parseFloat(e.target.value) || 0;
    });
  });
}

/**
 * Add product to simulation
 */
function addProductToSimulation() {
  if (!estimationResult) {
    alert('Please estimate utilities first.');
    return;
  }
  
  const productId = `prod_${Date.now()}`;
  const product = {
    id: productId,
    name: `Product ${simulationProducts.length + 1}`,
    attributes: {},
    price: 0,
    cost: 0,
    type: 'our_product' // 'our_product', 'competitor', 'none'
  };
  
  simulationProducts.push(product);
  renderSimulationProducts();
}

/**
 * Clear simulation scenario
 */
function clearSimulationScenario() {
  simulationProducts = [];
  renderSimulationProducts();
  document.getElementById('conjoint-simulation-results').style.display = 'none';
}

/**
 * Render simulation product config cards
 */
function renderSimulationProducts() {
  const container = document.getElementById('conjoint-products-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  simulationProducts.forEach((prod, idx) => {
    const card = document.createElement('div');
    card.className = 'product-config-card';
    
    let attrsHtml = '';
    attributeColumns.forEach(attr => {
      const config = attributeConfig[attr];
      if (config.type === 'categorical') {
        const uniqueVals = [...new Set(getColumnValues(attr))].filter(v => v);
        const currentVal = prod.attributes[attr] || uniqueVals[0];
        attrsHtml += `
          <label>${escapeHtml(attr)}:
            <select class="prod-attr" data-prod="${prod.id}" data-attr="${escapeHtml(attr)}">
              ${uniqueVals.map(v => `<option value="${escapeHtml(v)}" ${v === currentVal ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}
            </select>
          </label>
        `;
      } else {
        // For numeric: calculate min, max, median from data
        const values = getColumnValues(attr).map(v => parseFloat(v)).filter(v => !isNaN(v));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const sorted = values.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const currentVal = prod.attributes[attr] !== undefined ? prod.attributes[attr] : median;
        
        attrsHtml += `
          <label>${escapeHtml(attr)}:
            <input type="number" class="prod-attr" data-prod="${prod.id}" data-attr="${escapeHtml(attr)}" 
                   value="${currentVal}" min="${min}" max="${max}" step="any">
            <span class="hint-inline">(${min}–${max})</span>
          </label>
        `;
      }
    });
    
    // Price input (only show if price mode requires manual entry)
    let priceInputHtml = '';
    
    if (simulationConfig.priceMode === 'fixed') {
      // Price was fixed in design - add manual price input
      const priceDefault = prod.price !== undefined ? prod.price : 500;
      priceInputHtml = `<label>Price ($): <input type="number" class="prod-price" data-prod="${prod.id}" value="${priceDefault}" min="0" step="0.01"></label>`;
    }
    // If priceMode === 'attribute', price comes from attributes
    // If priceMode === 'none', no price needed
    
    // Cost will be calculated automatically from base + incremental costs
    const calculatedCost = calculateProductCost(prod);
    
    card.innerHTML = `
      <div class="product-config-header">
        <input type="text" class="prod-name" data-prod="${prod.id}" value="${prod.name}" placeholder="Product name">
        <button class="remove-prod" data-prod="${prod.id}">×</button>
      </div>
      <div class="product-config-body">
        ${attrsHtml}
        ${priceInputHtml}
        <div class="cost-display">
          <strong>Calculated Cost:</strong> $${calculatedCost.toFixed(2)}
          <span class="hint-inline">(Base: $${simulationConfig.baseCost.toFixed(2)} + Incremental)</span>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  // Attach listeners
  document.querySelectorAll('.prod-name').forEach(input => {
    input.addEventListener('change', e => {
      const prod = simulationProducts.find(p => p.id === e.target.dataset.prod);
      if (prod) prod.name = e.target.value;
    });
  });
  
  document.querySelectorAll('.prod-attr').forEach(input => {
    input.addEventListener('change', e => {
      const prod = simulationProducts.find(p => p.id === e.target.dataset.prod);
      if (prod) prod.attributes[e.target.dataset.attr] = e.target.value;
    });
  });
  
  document.querySelectorAll('.prod-price').forEach(input => {
    input.addEventListener('change', e => {
      const prod = simulationProducts.find(p => p.id === e.target.dataset.prod);
      if (prod) prod.price = parseFloat(e.target.value);
    });
  });
  
  document.querySelectorAll('.remove-prod').forEach(btn => {
    btn.addEventListener('click', e => {
      simulationProducts = simulationProducts.filter(p => p.id !== e.target.dataset.prod);
      renderSimulationProducts();
    });
  });
}

/**
 * Calculate product cost based on base cost + incremental costs
 */
function calculateProductCost(product) {
  let cost = simulationConfig.baseCost;
  
  Object.entries(product.attributes).forEach(([attr, value]) => {
    const config = attributeConfig[attr];
    
    if (config.type === 'categorical') {
      const key = `${attr}_${value}`;
      cost += simulationConfig.incrementalCosts[key] || 0;
    } else {
      // Numeric attribute: marginal cost per unit
      const marginalCost = simulationConfig.incrementalCosts[attr] || 0;
      const numValue = parseFloat(value) || 0;
      cost += marginalCost * numValue;
    }
  });
  
  return cost;
}

/**
 * Get competitor attributes from original data
 */
function getCompetitorAttributesFromData(competitorId) {
  if (!conjointDataset || !conjointDataset.rows) return null;
  
  const { headers, rows } = conjointDataset;
  const altIdx = headers.indexOf(columnMapping.alternative);
  
  // Find a row with this competitor alternative
  const competitorRow = rows.find(row => row[altIdx] === competitorId);
  if (!competitorRow) return null;
  
  // Extract attributes
  const attributes = {};
  let price = 0;
  
  attributeColumns.forEach(attr => {
    const idx = headers.indexOf(attr);
    const value = competitorRow[idx];
    
    if (attr.toLowerCase() === 'price') {
      price = parseFloat(value) || 0;
    }
    attributes[attr] = value;
  });
  
  return { attributes, price };
}

/**
 * Run market simulation
 */
function runSimulation() {
  const statusEl = document.getElementById('conjoint-simulation-status');
  
  if (!estimationResult) {
    statusEl.textContent = 'Please estimate utilities first.';
    return;
  }
  
  if (simulationProducts.length === 0) {
    statusEl.textContent = 'Please add at least one product.';
    return;
  }
  
  try {
    statusEl.textContent = 'Running simulation...';
    
    const marketSize = parseInt(document.getElementById('conjoint-market-size')?.value || 10000);
    simulationConfig.showWTP = document.getElementById('conjoint-show-wtp')?.checked || false;
    simulationConfig.forceChoice = document.getElementById('conjoint-force-choice')?.checked || false;
    simulationConfig.ignoreCompetitors = document.getElementById('conjoint-ignore-competitors')?.checked || false;
    
    // Build complete choice set: user products + competitors + none (respecting filters)
    const allProducts = [...simulationProducts];
    
    // Add competitors to choice set (unless ignored)
    if (!simulationConfig.ignoreCompetitors && competitorAlternatives.length > 0) {
      competitorAlternatives.forEach(compId => {
        // Get competitor attributes from original data
        const compData = getCompetitorAttributesFromData(compId);
        if (compData) {
          allProducts.push({
            id: `competitor_${compId}`,
            name: `Competitor ${compId}`,
            attributes: compData.attributes,
            price: compData.price || 0,
            isCompetitor: true
          });
        }
      });
    }
    
    // Add None option to choice set (unless forced choice)
    let noneIndex = -1;
    if (!simulationConfig.forceChoice && noneAlternative) {
      noneIndex = allProducts.length;
      allProducts.push({
        id: 'none_option',
        name: 'None / No Purchase',
        attributes: {},
        price: 0,
        isNone: true
      });
    }
    
    // For each respondent, compute utilities for each product
    const shares = allProducts.map(() => 0);
    
    estimationResult.respondents.forEach(resp => {
      const utilities = allProducts.map(prod => {
        if (prod.isNone) {
          // None option uses ASC_None coefficient
          return resp.coefficients['ASC_None'] || 0;
        } else {
          return computeUtility(prod, resp.coefficients);
        }
      });
      const probs = softmax(utilities);
      probs.forEach((p, i) => shares[i] += p);
    });
    
    // Average shares
    const nResp = estimationResult.respondents.length;
    shares.forEach((_, i) => shares[i] /= nResp);
    
    // Compute profits
    const results = allProducts.map((prod, i) => {
      // Get price based on price mode
      let price = 0;
      if (prod.isNone) {
        price = 0; // None has no price
      } else if (simulationConfig.priceMode === 'attribute' && prod.attributes.price) {
        price = parseFloat(prod.attributes.price);
      } else if (simulationConfig.priceMode === 'fixed') {
        price = prod.price || 0;
      }
      // If priceMode === 'none', price stays 0
      
      // Calculate cost from base + incremental (0 for None option)
      const cost = prod.isNone ? 0 : calculateProductCost(prod);
      
      return {
        name: prod.name,
        share: shares[i] * 100,
        customers: Math.round(shares[i] * marketSize),
        price: price,
        cost: cost,
        margin: price - cost,
        profit: shares[i] * marketSize * (price - cost)
      };
    });
    
    // Calculate WTP if requested and price is an attribute
    let wtpData = null;
    if (simulationConfig.showWTP && simulationConfig.priceMode === 'attribute') {
      wtpData = calculateWTP();
    }
    
    // Display
    displaySimulationResults(results, wtpData);
    statusEl.textContent = '✓ Simulation complete.';
    document.getElementById('conjoint-simulation-results').style.display = 'block';
    
    // Update workflow stepper to step 5 (Simulate Markets)
    updateWorkflowStep(5);
    
  } catch (error) {
    console.error('Simulation error:', error);
    statusEl.textContent = `Error: ${error.message}`;
  }
}

/**
 * Calculate Willingness-to-Pay (WTP) for each attribute level
 */
function calculateWTP() {
  // Find price coefficient
  const priceAttr = attributeColumns.find(attr => attr.toLowerCase() === 'price');
  if (!priceAttr) return null;
  
  const wtpResults = [];
  
  // For each attribute (except price itself)
  attributeColumns.forEach(attr => {
    if (attr.toLowerCase() === 'price') return;
    
    const config = attributeConfig[attr];
    
    if (config.type === 'categorical') {
      const levels = [...new Set(getColumnValues(attr))].filter(v => v);
      const sortedLevels = levels.sort();
      const baseline = sortedLevels[0];
      
      sortedLevels.slice(1).forEach(level => {
        const key = `${attr}_${level}`;
        
        // Calculate WTP across all respondents
        const wtpValues = estimationResult.respondents.map(resp => {
          const utility = resp.coefficients[key] || 0;
          const priceCoef = resp.coefficients[priceAttr] || -0.01; // Default small negative value
          
          // WTP = -Δutility / price_coefficient
          // Negative sign because price coefficient is typically negative
          return -utility / priceCoef;
        }).filter(v => isFinite(v) && Math.abs(v) < 10000); // Filter out extreme values
        
        if (wtpValues.length > 0) {
          const mean = wtpValues.reduce((a, b) => a + b, 0) / wtpValues.length;
          const variance = wtpValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / wtpValues.length;
          const stdDev = Math.sqrt(variance);
          
          wtpResults.push({
            attribute: attr,
            level: level,
            meanWTP: mean,
            stdDevWTP: stdDev
          });
        }
      });
    }
    // For numeric attributes, WTP is the coefficient ratio
    else {
      const wtpValues = estimationResult.respondents.map(resp => {
        const utility = resp.coefficients[attr] || 0;
        const priceCoef = resp.coefficients[priceAttr] || -0.01;
        return -utility / priceCoef;
      }).filter(v => isFinite(v) && Math.abs(v) < 10000);
      
      if (wtpValues.length > 0) {
        const mean = wtpValues.reduce((a, b) => a + b, 0) / wtpValues.length;
        const variance = wtpValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / wtpValues.length;
        const stdDev = Math.sqrt(variance);
        
        wtpResults.push({
          attribute: attr,
          level: 'per unit',
          meanWTP: mean,
          stdDevWTP: stdDev
        });
      }
    }
  });
  
  return wtpResults;
}

/**
 * Compute utility for a product given respondent coefficients
 */
function computeUtility(product, coefficients) {
  let utility = 0;
  
  Object.entries(product.attributes).forEach(([attr, val]) => {
    const config = attributeConfig[attr];
    if (config.type === 'categorical') {
      const key = `${attr}_${val}`;
      utility += coefficients[key] || 0;
    } else {
      const numVal = parseFloat(val) || 0;
      utility += (coefficients[attr] || 0) * numVal;
      if (config.type === 'numeric_quadratic') {
        utility += (coefficients[`${attr}_sq`] || 0) * numVal * numVal;
      }
    }
  });
  
  // Price: only add if price is NOT already in attributes
  const hasPriceAttribute = attributeColumns.some(attr => attr.toLowerCase() === 'price');
  if (!hasPriceAttribute && product.price && coefficients.price) {
    utility += coefficients.price * product.price;
  }
  
  return utility;
}

/**
 * Softmax function
 */
function softmax(values) {
  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp(v - maxVal));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sumExp);
}

/**
 * Display simulation results
 */
function displaySimulationResults(results, wtpData = null) {
  // Share chart - color code competitors and None differently
  const colors = results.map(r => {
    if (r.name.startsWith('None')) return '#9E9E9E';
    if (r.name.startsWith('Competitor')) return '#FF9800';
    return '#4A90E2';
  });
  
  const shareData = [{
    x: results.map(r => r.name),
    y: results.map(r => r.share),
    type: 'bar',
    marker: { color: colors }
  }];
  
  Plotly.newPlot('chart-sim-share', shareData, {
    title: '',
    xaxis: { title: 'Product' },
    yaxis: { title: 'Market Share (%)' }
  }, { responsive: true });
  
  // Profit chart
  const profitData = [{
    x: results.map(r => r.name),
    y: results.map(r => r.profit),
    type: 'bar',
    marker: { color: colors }
  }];
  
  Plotly.newPlot('chart-sim-profit', profitData, {
    title: '',
    xaxis: { title: 'Product' },
    yaxis: { title: 'Total Profit ($)' }
  }, { responsive: true });
  
  // Table
  const tbody = document.getElementById('conjoint-simulation-table-body');
  tbody.innerHTML = '';
  results.forEach(r => {
    const row = tbody.insertRow();
    
    // Add visual styling for competitors and None
    let rowStyle = '';
    if (r.name.startsWith('None')) {
      rowStyle = ' style="background-color: #f5f5f5; font-style: italic;"';
    } else if (r.name.startsWith('Competitor')) {
      rowStyle = ' style="background-color: #fff3e0;"';
    }
    
    row.innerHTML = `
      <td${rowStyle}>${escapeHtml(r.name)}</td>
      <td${rowStyle}>${r.share.toFixed(2)}%</td>
      <td${rowStyle}>${r.customers.toLocaleString()}</td>
      <td${rowStyle}>$${r.price.toFixed(2)}</td>
      <td${rowStyle}>$${r.cost.toFixed(2)}</td>
      <td${rowStyle}>$${r.margin.toFixed(2)}</td>
      <td${rowStyle}>$${r.profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    `;
  });
  
  // WTP Details (if calculated)
  const wtpSection = document.getElementById('conjoint-wtp-details');
  if (wtpData && wtpData.length > 0) {
    wtpSection.style.display = 'block';
    
    const wtpTbody = document.getElementById('conjoint-wtp-table-body');
    wtpTbody.innerHTML = '';
    
    wtpData.forEach(wtp => {
      const row = wtpTbody.insertRow();
      row.innerHTML = `
        <td>${escapeHtml(wtp.attribute)}</td>
        <td>${escapeHtml(wtp.level)}</td>
        <td>$${wtp.meanWTP.toFixed(2)}</td>
        <td>$${wtp.stdDevWTP.toFixed(2)}</td>
      `;
    });
  } else {
    wtpSection.style.display = 'none';
  }
}

/**
 * Setup optimization controls
 */
function setupOptimizationControls() {
  // Placeholder - to be implemented
  const runBtn = document.getElementById('conjoint-run-optimization');
  runBtn?.addEventListener('click', () => {
    alert('Optimization feature coming soon!');
  });
}

/**
 * Setup scenarios
 */
function setupScenarios() {
  const select = document.getElementById('scenario-select');
  const downloadBtn = document.getElementById('scenario-download');
  
  if (!select) return;
  
  CONJOINT_SCENARIOS.forEach(scenario => {
    const opt = document.createElement('option');
    opt.value = scenario.id;
    opt.textContent = scenario.label;
    select.appendChild(opt);
  });
  
  select.addEventListener('change', loadScenario);
  downloadBtn?.addEventListener('click', downloadScenarioDataset);
}

/**
 * Load scenario
 */
async function loadScenario() {
  const select = document.getElementById('scenario-select');
  const descEl = document.getElementById('scenario-description');
  const downloadBtn = document.getElementById('scenario-download');
  
  const scenarioId = select.value;
  if (!scenarioId) {
    descEl.innerHTML = '<p class="muted">Select a scenario above to load a preset CBC study dataset with context.</p>';
    downloadBtn.classList.add('hidden');
    return;
  }
  
  const scenario = CONJOINT_SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) return;
  
  try {
    // Render inline description
    const html = typeof scenario.description === 'function' ? scenario.description() : scenario.description;
    descEl.innerHTML = html || '';
    
    // Load dataset
    const dataResp = await fetch(scenario.datasetPath);
    const dataText = await dataResp.text();
    const parsed = typeof csvUtils !== 'undefined'
      ? csvUtils.parseDelimitedText(dataText)
      : parseCSV(dataText);
    
    conjointDataset = parsed;
    currentDataSource = 'scenario';
    currentScenarioName = scenario.label;
    
    // Calculate actual respondents and tasks from raw data
    const respIdx = parsed.headers.findIndex(h => h.toLowerCase().includes('respondent'));
    const taskIdx = parsed.headers.findIndex(h => h.toLowerCase().includes('task'));
    
    let uniqueRespondents = 0;
    let uniqueTasks = 0;
    
    if (respIdx >= 0 && taskIdx >= 0) {
      uniqueRespondents = new Set(parsed.rows.map(r => r[respIdx])).size;
      uniqueTasks = new Set(parsed.rows.map(r => r[taskIdx])).size;
    }
    
    document.getElementById('conjoint-upload-feedback').textContent = 
      `✓ Loaded scenario: ${scenario.label} (${uniqueRespondents} respondents, ${uniqueTasks} tasks, ${parsed.rows.length} rows)`;
    
    // Track scenario loading
    if (typeof markScenarioLoaded === 'function') {
      markScenarioLoaded(scenario.label);
    }
    
    // Auto-proceed to mapping
    populateColumnMapping();
    document.getElementById('conjoint-column-mapping').style.display = 'block';
    
    downloadBtn.classList.remove('hidden');
    downloadBtn.disabled = false;
    
  } catch (error) {
    console.error('Scenario load error:', error);
    descEl.innerHTML = `<p class="error">Error loading scenario: ${error.message}</p>`;
  }
}

/**
 * Download scenario dataset
 */
function downloadScenarioDataset() {
  const select = document.getElementById('scenario-select');
  const scenarioId = select.value;
  const scenario = CONJOINT_SCENARIOS.find(s => s.id === scenarioId);
  
  if (!scenario) return;
  
  window.open(scenario.datasetPath, '_blank');
}

/**
 * Setup download buttons
 */
function setupDownloadButtons() {
  const utilBtn = document.getElementById('conjoint-download-utilities');
  utilBtn?.addEventListener('click', downloadUtilities);
  
  const simBtn = document.getElementById('conjoint-download-simulation');
  simBtn?.addEventListener('click', downloadSimulation);
}

/**
 * Download utilities CSV
 */
function downloadUtilities() {
  if (!estimationResult) return;
  
  let csv = 'respondent_id,';
  const firstResp = estimationResult.respondents[0];
  csv += Object.keys(firstResp.coefficients).join(',') + '\n';
  
  estimationResult.respondents.forEach(r => {
    csv += `${r.respondent_id},`;
    csv += Object.values(r.coefficients).join(',') + '\n';
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'conjoint_utilities.csv';
  link.click();
}

/**
 * Download simulation results
 */
function downloadSimulation() {
  // Placeholder
  alert('Download simulation results - coming soon!');
}

/**
 * Show loading overlay
 */
function showLoading() {
  const overlay = document.getElementById('conjoint-loading-overlay');
  if (overlay) overlay.setAttribute('aria-hidden', 'false');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  const overlay = document.getElementById('conjoint-loading-overlay');
  if (overlay) overlay.setAttribute('aria-hidden', 'true');
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initConjointApp();
  
  // Preload Pyodide in the background so it's ready when needed
  console.log('🚀 Preloading Pyodide in background...');
  initPyodide().then(() => {
    console.log('✅ Pyodide ready for estimation');
    // Add visual indicator
    const badge = document.querySelector('.hero-context .badge[style]');
    if (badge) {
      badge.textContent = '🐍 BROWSER READY (Pyodide loaded)';
    }
  }).catch(err => {
    console.warn('Pyodide preload failed (will retry on demand):', err);
  });
});

/**
 * Initialize engagement tracking after DOM loads
 */
if (typeof initEngagementTracking === 'function') {
  document.addEventListener('DOMContentLoaded', () => {
    initEngagementTracking(TOOL_SLUG);
  });
}
