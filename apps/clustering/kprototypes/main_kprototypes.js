// k-Prototypes Clustering Tool – interactive behavior

const TOOL_SLUG = 'kprototypes-clustering';
const CREATED_DATE = '2026-01-12';
let modifiedDate = new Date().toLocaleDateString();

const DataSourceModes = {
  UPLOAD: 'upload',
  DEMO: 'demo'
};

let activeDataSourceMode = DataSourceModes.UPLOAD;

// In-memory dataset
let currentHeaders = [];
let currentRows = []; // raw data
let currentVariableTypes = {}; // { colName: 'continuous' or 'categorical' }
let selectedVariables = []; // array of variable names to include

// Scenario state
let activeScenario = null;
let activeScenarioCsv = null;
let lastClusteringState = null;

// Cluster visualization
const CLUSTER_COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf'
];

const MAX_SILHOUETTE_POINTS = 400;
// MAX_UPLOAD_ROWS is defined in csv_utils.js

const ScaleModes = {
  NONE: 'none',
  ZSCORE: 'zscore',
  MINMAX: 'minmax'
};

// -------------------- Bootstrapping --------------------

document.addEventListener('DOMContentLoaded', () => {
  hydrateTimestamps();
  setupScenarioSelect();
  setupScenarioDownload();
  setupDataSourceModeToggle();
  setupUpload();
  setupDemoLoader();
  setupGammaControls();
  setupRunButton();
  setupDownloadResultsButton();
  
  // Initialize engagement tracking
  if (typeof initEngagementTracking === 'function') {
    initEngagementTracking(TOOL_SLUG);
  }
});

function hydrateTimestamps() {
  const created = document.getElementById('created-date');
  const modified = document.getElementById('modified-date');
  if (created) created.textContent = new Date(CREATED_DATE).toLocaleDateString();
  if (modified) modified.textContent = modifiedDate;
}

function stampModified() {
  modifiedDate = new Date().toLocaleDateString();
  hydrateTimestamps();
}

// -------------------- Scenarios --------------------

const KPROTO_SCENARIOS = [
  {
    id: 'customer-segment',
    label: 'Customer Segmentation',
    description: () => generateCustomerSegmentHtml(),
    generate: generateCustomerSegmentData
  },
  {
    id: 'product-portfolio',
    label: 'Product Portfolio Analysis',
    description: () => generateProductPortfolioHtml(),
    generate: generateProductPortfolioData
  },
  {
    id: 'lead-scoring',
    label: 'Lead Scoring Clusters',
    description: () => generateLeadScoringHtml(),
    generate: generateLeadScoringData
  }
];

function setupScenarioSelect() {
  const select = document.getElementById('scenario-select');
  if (!select) return;

  KPROTO_SCENARIOS.forEach(entry => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.label;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const selected = KPROTO_SCENARIOS.find(s => s.id === select.value);
    if (!selected) {
      activeScenario = null;
      activeScenarioCsv = null;
      const defaultHtml = `
        <p>Use presets to explore realistic segmentation scenarios with mixed data types, such as customer profiles 
        (spend + demographics), product portfolios (performance + attributes), or lead databases (engagement + 
        firmographics). Download and customize scenario data in Excel.</p>
      `;
      const descEl = document.getElementById('scenario-description');
      if (descEl) descEl.innerHTML = defaultHtml;
      updateScenarioDownloadButton();
      return;
    }

    const data = selected.generate();
    activeScenario = selected;
    activeScenarioCsv = data.csvText || null;
    loadDataset(data.headers, data.rows, data.variableTypes, { sourceLabel: 'scenario' });

    const descEl = document.getElementById('scenario-description');
    if (descEl) descEl.innerHTML = selected.description();
    updateScenarioDownloadButton();
    
    // Track scenario loading
    if (typeof markScenarioLoaded === 'function') {
      markScenarioLoaded(selected.label);
    }
  });
}

function setupScenarioDownload() {
  const button = document.getElementById('scenario-download');
  if (!button) return;

  button.addEventListener('click', event => {
    event.preventDefault();
    if (!activeScenario || !activeScenarioCsv) return;
    const filename = `${activeScenario.id || 'kproto_scenario'}.csv`;
    downloadTextFile(filename, activeScenarioCsv, { mimeType: 'text/csv' });
  });

  updateScenarioDownloadButton();
}

function updateScenarioDownloadButton() {
  const button = document.getElementById('scenario-download');
  if (!button) return;
  const enabled = !!(activeScenario && activeScenarioCsv);
  button.disabled = !enabled;
  button.classList.toggle('hidden', !enabled);
}

// -------------------- Scenario HTML Generators --------------------

function generateCustomerSegmentHtml() {
  return `
    <div class="scenario-description">
      <div class="scenario-header">
        <span class="scenario-icon">👥</span>
        <h4>Customer Segmentation with Mixed Attributes</h4>
        <span class="scenario-badge">500 Customers</span>
      </div>
      
      <p class="scenario-intro">
        You're a marketing analyst at a SaaS company. Leadership wants to segment the customer base using both 
        behavioral metrics (spend, engagement) and demographic attributes (region, tier, acquisition channel) to 
        tailor retention and upsell campaigns.
      </p>
      
      <div class="scenario-variables">
        <h5>📋 Variables</h5>
        <table class="scenario-var-table">
          <tr>
            <td><span class="var-tag predictor">annual_spend</span></td>
            <td>Annual revenue in thousands ($K) - continuous</td>
          </tr>
          <tr>
            <td><span class="var-tag predictor">login_frequency</span></td>
            <td>Logins per month - continuous</td>
          </tr>
          <tr>
            <td><span class="var-tag predictor">tenure_months</span></td>
            <td>Customer lifetime in months - continuous</td>
          </tr>
          <tr>
            <td><span class="var-tag categorical">region</span></td>
            <td>Geographic region (West, East, South, Central) - categorical</td>
          </tr>
          <tr>
            <td><span class="var-tag categorical">subscription_tier</span></td>
            <td>Plan level (Basic, Pro, Enterprise) - categorical</td>
          </tr>
          <tr>
            <td><span class="var-tag categorical">acquisition_channel</span></td>
            <td>How customer signed up (Organic, Paid, Referral, Partner) - categorical</td>
          </tr>
        </table>
      </div>
      
      <div class="scenario-context">
        <h5>🎯 Business Context</h5>
        <div class="context-grid">
          <div class="context-item">
            <strong>Industry</strong>
            <span>SaaS B2B</span>
          </div>
          <div class="context-item">
            <strong>Objective</strong>
            <span>Targeted Campaigns</span>
          </div>
          <div class="context-item">
            <strong>Time Window</strong>
            <span>12 Months</span>
          </div>
        </div>
      </div>
      
      <div class="scenario-insights">
        <h5>💡 What to Look For</h5>
        <ul>
          <li>High-value Enterprise customers in certain regions to prioritize for white-glove support</li>
          <li>Low-engagement Basic tier users (churn risk) vs. high-engagement Basic (upsell opportunity)</li>
          <li>Differences by acquisition channel—do Referrals behave differently than Paid customers?</li>
          <li>Regional patterns in spend and engagement that suggest localization needs</li>
        </ul>
      </div>
      
      <div class="scenario-tip">
        <strong>💡 Pro Tip:</strong> Try k=4 or k=5 clusters to capture distinct behavioral + demographic segments. 
        Check the parallel coordinates plot to see how clusters differ across both continuous and categorical dimensions.
      </div>
      
      <div class="scenario-questions">
        <h5>❓ Analysis Questions</h5>
        <ol>
          <li>Which cluster represents your highest-value customers to protect from churn?</li>
          <li>Are there low-spending Enterprise customers who might need intervention?</li>
          <li>Do certain acquisition channels correlate with higher long-term value?</li>
        </ol>
      </div>
    </div>
  `;
}

function generateProductPortfolioHtml() {
  return `
    <div class="scenario-description">
      <div class="scenario-header">
        <span class="scenario-icon">📦</span>
        <h4>Product Portfolio Analysis</h4>
        <span class="scenario-badge">300 SKUs</span>
      </div>
      
      <p class="scenario-intro">
        You're a product manager at an e-commerce retailer with hundreds of SKUs. The merchandising team wants to 
        rationalize the catalog by grouping products based on performance metrics (sales, ratings) and attributes 
        (category, brand, availability).
      </p>
      
      <div class="scenario-variables">
        <h5>📋 Variables</h5>
        <table class="scenario-var-table">
          <tr>
            <td><span class="var-tag predictor">price</span></td>
            <td>Retail price in dollars - continuous</td>
          </tr>
          <tr>
            <td><span class="var-tag predictor">monthly_sales</span></td>
            <td>Average monthly unit sales - continuous</td>
          </tr>
          <tr>
            <td><span class="var-tag predictor">avg_rating</span></td>
            <td>Customer rating (1-5 scale) - continuous</td>
          </tr>
          <tr>
            <td><span class="var-tag categorical">category</span></td>
            <td>Product category (Electronics, Apparel, Home, Sports) - categorical</td>
          </tr>
          <tr>
            <td><span class="var-tag categorical">brand_tier</span></td>
            <td>Brand positioning (Premium, Mid, Budget) - categorical</td>
          </tr>
          <tr>
            <td><span class="var-tag categorical">stock_status</span></td>
            <td>Inventory availability (In-Stock, Limited, Backorder) - categorical</td>
          </tr>
        </table>
      </div>
      
      <div class="scenario-context">
        <h5>🎯 Business Context</h5>
        <div class="context-grid">
          <div class="context-item">
            <strong>Industry</strong>
            <span>E-commerce</span>
          </div>
          <div class="context-item">
            <strong>Goal</strong>
            <span>SKU Rationalization</span>
          </div>
          <div class="context-item">
            <strong>Portfolio Size</strong>
            <span>300 Products</span>
          </div>
        </div>
      </div>
      
      <div class="scenario-insights">
        <h5>💡 What to Look For</h5>
        <ul>
          <li>Stars: high sales, high ratings, in-stock—protect and promote these winners</li>
          <li>Underperformers: low sales, low ratings—candidates for clearance or discontinuation</li>
          <li>Hidden gems: high ratings but low sales—may need better visibility or marketing</li>
          <li>Category and brand patterns—do certain categories or tiers cluster together?</li>
        </ul>
      </div>
      
      <div class="scenario-tip">
        <strong>💡 Pro Tip:</strong> Start with k=3 to separate winners, mixed performers, and losers. 
        Use standardization (Z-score) to ensure price, sales, and ratings get equal weight despite different scales.
      </div>
      
      <div class="scenario-questions">
        <h5>❓ Analysis Questions</h5>
        <ol>
          <li>Which cluster contains your star products that deserve more inventory and marketing spend?</li>
          <li>Are there products with high ratings but low sales that need better promotion?</li>
          <li>What percentage of SKUs fall into the underperforming cluster for potential discontinuation?</li>
        </ol>
      </div>
    </div>
  `;
}

function generateLeadScoringHtml() {
  return `
    <div class="scenario-description">
      <div class="scenario-header">
        <span class="scenario-icon">🎯</span>
        <h4>Lead Scoring Clusters</h4>
        <span class="scenario-badge">600 Leads</span>
      </div>
      
      <p class="scenario-intro">
        You're a marketing ops analyst at a B2B software company. The sales team wants to prioritize leads based on 
        both engagement scores (quantitative) and firmographic attributes (qualitative) to maximize conversion rates 
        and avoid wasting time on low-fit prospects.
      </p>
      
      <div class="scenario-variables">
        <h5>📋 Variables</h5>
        <table class="scenario-var-table">
          <tr>
            <td><span class="var-tag predictor">engagement_score</span></td>
            <td>Lead engagement score (0-100) - continuous</td>
          </tr>
          <tr>
            <td><span class="var-tag predictor">email_opens</span></td>
            <td>Total email opens in last 30 days - continuous</td>
          </tr>
          <tr>
            <td><span class="var-tag predictor">estimated_deal_size</span></td>
            <td>Predicted deal value in thousands ($K) - continuous</td>
          </tr>
          <tr>
            <td><span class="var-tag categorical">industry</span></td>
            <td>Industry vertical (Tech, Finance, Healthcare, Retail) - categorical</td>
          </tr>
          <tr>
            <td><span class="var-tag categorical">company_size</span></td>
            <td>Employee count tier (SMB, Mid-Market, Enterprise) - categorical</td>
          </tr>
          <tr>
            <td><span class="var-tag categorical">lead_source</span></td>
            <td>Acquisition source (Webinar, Content, Demo Request, Cold Outreach) - categorical</td>
          </tr>
        </table>
      </div>
      
      <div class="scenario-context">
        <h5>🎯 Business Context</h5>
        <div class="context-grid">
          <div class="context-item">
            <strong>Industry</strong>
            <span>B2B SaaS</span>
          </div>
          <div class="context-item">
            <strong>Objective</strong>
            <span>Lead Prioritization</span>
          </div>
          <div class="context-item">
            <strong>Sales Cycle</strong>
            <span>30-90 Days</span>
          </div>
        </div>
      </div>
      
      <div class="scenario-insights">
        <h5>💡 What to Look For</h5>
        <ul>
          <li>Hot leads: high engagement, high deal size, Enterprise prospects—immediate sales outreach</li>
          <li>Cold but qualified: low engagement but good fit (industry, size)—nurture campaign candidates</li>
          <li>Tire kickers: high engagement but low deal size or poor fit—marketing qualified, not sales ready</li>
          <li>Lead source patterns: do Demo Requests convert better than Cold Outreach?</li>
        </ul>
      </div>
      
      <div class="scenario-tip">
        <strong>💡 Pro Tip:</strong> Use k=4 to separate hot, warm, cold-but-qualified, and unqualified segments. 
        The parallel coordinates plot will show how engagement and firmographics combine to define priority tiers.
      </div>
      
      <div class="scenario-questions">
        <h5>❓ Analysis Questions</h5>
        <ol>
          <li>Which cluster represents your highest-priority leads for immediate sales follow-up?</li>
          <li>Are there low-engagement Enterprise leads that need a different nurture approach?</li>
          <li>Do certain lead sources (e.g., Demo Request) cluster with higher engagement and deal size?</li>
        </ol>
      </div>
    </div>
  `;
}

// -------------------- Data Generators --------------------

function generateCustomerSegmentData() {
  const headers = ['annual_spend', 'login_frequency', 'tenure_months', 'region', 'subscription_tier', 'acquisition_channel'];
  const rows = [];
  const nPerCluster = 125;

  const regions = ['West', 'East', 'South', 'Central'];
  const tiers = ['Basic', 'Pro', 'Enterprise'];
  const channels = ['Organic', 'Paid', 'Referral', 'Partner'];

  const addCluster = (n, contMeans, contSds, catProbs) => {
    for (let i = 0; i < n; i++) {
      const spend = Math.max(5, contMeans[0] + randomNormal(0, contSds[0]));
      const logins = Math.max(0, contMeans[1] + randomNormal(0, contSds[1]));
      const tenure = Math.max(1, contMeans[2] + randomNormal(0, contSds[2]));
      const region = sampleCategorical(regions, catProbs.region);
      const tier = sampleCategorical(tiers, catProbs.tier);
      const channel = sampleCategorical(channels, catProbs.channel);
      
      rows.push({
        'annual_spend': spend.toFixed(1),
        'login_frequency': logins.toFixed(1),
        'tenure_months': Math.round(tenure),
        'region': region,
        'subscription_tier': tier,
        'acquisition_channel': channel
      });
    }
  };

  // Cluster 1: High-value Enterprise West Coast
  addCluster(nPerCluster, [120, 45, 28], [30, 10, 8], {
    region: [0.6, 0.2, 0.1, 0.1],
    tier: [0.1, 0.2, 0.7],
    channel: [0.3, 0.2, 0.3, 0.2]
  });

  // Cluster 2: Mid-tier engaged customers
  addCluster(nPerCluster, [55, 25, 18], [15, 7, 6], {
    region: [0.25, 0.25, 0.25, 0.25],
    tier: [0.2, 0.6, 0.2],
    channel: [0.4, 0.3, 0.2, 0.1]
  });

  // Cluster 3: Low-engagement Basic users (churn risk)
  addCluster(nPerCluster, [20, 8, 9], [8, 3, 4], {
    region: [0.25, 0.25, 0.25, 0.25],
    tier: [0.7, 0.2, 0.1],
    channel: [0.2, 0.5, 0.2, 0.1]
  });

  // Cluster 4: Long-tenure loyal Pro customers
  addCluster(nPerCluster, [75, 35, 42], [20, 8, 10], {
    region: [0.2, 0.3, 0.3, 0.2],
    tier: [0.1, 0.7, 0.2],
    channel: [0.3, 0.1, 0.4, 0.2]
  });

  const csvLines = [headers.join(',')].concat(
    rows.map(row => headers.map(h => row[h]).join(','))
  );

  const variableTypes = {
    'annual_spend': 'continuous',
    'login_frequency': 'continuous',
    'tenure_months': 'continuous',
    'region': 'categorical',
    'subscription_tier': 'categorical',
    'acquisition_channel': 'categorical'
  };

  return { headers, rows, csvText: csvLines.join('\n'), variableTypes };
}

function generateProductPortfolioData() {
  const headers = ['price', 'monthly_sales', 'avg_rating', 'category', 'brand_tier', 'stock_status'];
  const rows = [];
  const nPerCluster = 100;

  const categories = ['Electronics', 'Apparel', 'Home', 'Sports'];
  const brandTiers = ['Premium', 'Mid', 'Budget'];
  const stockStatuses = ['In-Stock', 'Limited', 'Backorder'];

  const addCluster = (n, contMeans, contSds, catProbs) => {
    for (let i = 0; i < n; i++) {
      const price = Math.max(10, contMeans[0] + randomNormal(0, contSds[0]));
      const sales = Math.max(0, contMeans[1] + randomNormal(0, contSds[1]));
      const rating = Math.max(1, Math.min(5, contMeans[2] + randomNormal(0, contSds[2])));
      const category = sampleCategorical(categories, catProbs.category);
      const brand = sampleCategorical(brandTiers, catProbs.brand);
      const stock = sampleCategorical(stockStatuses, catProbs.stock);
      
      rows.push({
        'price': price.toFixed(2),
        'monthly_sales': Math.round(sales),
        'avg_rating': rating.toFixed(1),
        'category': category,
        'brand_tier': brand,
        'stock_status': stock
      });
    }
  };

  // Cluster 1: Star products (high sales, high ratings, in stock)
  addCluster(nPerCluster, [85, 450, 4.3], [25, 100, 0.4], {
    category: [0.3, 0.2, 0.3, 0.2],
    brand: [0.4, 0.4, 0.2],
    stock: [0.8, 0.15, 0.05]
  });

  // Cluster 2: Budget items (low price, moderate sales)
  addCluster(nPerCluster, [35, 180, 3.8], [12, 60, 0.5], {
    category: [0.2, 0.3, 0.3, 0.2],
    brand: [0.1, 0.3, 0.6],
    stock: [0.6, 0.3, 0.1]
  });

  // Cluster 3: Underperformers (low sales, mixed ratings)
  addCluster(nPerCluster, [55, 45, 3.2], [20, 25, 0.7], {
    category: [0.25, 0.25, 0.25, 0.25],
    brand: [0.3, 0.4, 0.3],
    stock: [0.4, 0.4, 0.2]
  });

  const csvLines = [headers.join(',')].concat(
    rows.map(row => headers.map(h => row[h]).join(','))
  );

  const variableTypes = {
    'price': 'continuous',
    'monthly_sales': 'continuous',
    'avg_rating': 'continuous',
    'category': 'categorical',
    'brand_tier': 'categorical',
    'stock_status': 'categorical'
  };

  return { headers, rows, csvText: csvLines.join('\n'), variableTypes };
}

function generateLeadScoringData() {
  const headers = ['engagement_score', 'email_opens', 'estimated_deal_size', 'industry', 'company_size', 'lead_source'];
  const rows = [];
  const nPerCluster = 150;

  const industries = ['Tech', 'Finance', 'Healthcare', 'Retail'];
  const companySizes = ['SMB', 'Mid-Market', 'Enterprise'];
  const leadSources = ['Webinar', 'Content', 'Demo Request', 'Cold Outreach'];

  const addCluster = (n, contMeans, contSds, catProbs) => {
    for (let i = 0; i < n; i++) {
      const engagement = Math.max(0, Math.min(100, contMeans[0] + randomNormal(0, contSds[0])));
      const opens = Math.max(0, contMeans[1] + randomNormal(0, contSds[1]));
      const dealSize = Math.max(5, contMeans[2] + randomNormal(0, contSds[2]));
      const industry = sampleCategorical(industries, catProbs.industry);
      const size = sampleCategorical(companySizes, catProbs.size);
      const source = sampleCategorical(leadSources, catProbs.source);
      
      rows.push({
        'engagement_score': Math.round(engagement),
        'email_opens': Math.round(opens),
        'estimated_deal_size': dealSize.toFixed(1),
        'industry': industry,
        'company_size': size,
        'lead_source': source
      });
    }
  };

  // Cluster 1: Hot leads (high engagement, Enterprise, large deals)
  addCluster(nPerCluster, [75, 18, 150], [12, 5, 40], {
    industry: [0.3, 0.3, 0.2, 0.2],
    size: [0.1, 0.3, 0.6],
    source: [0.3, 0.1, 0.5, 0.1]
  });

  // Cluster 2: Warm leads (moderate engagement, Mid-Market)
  addCluster(nPerCluster, [50, 10, 60], [15, 4, 20], {
    industry: [0.25, 0.25, 0.25, 0.25],
    size: [0.2, 0.6, 0.2],
    source: [0.3, 0.3, 0.2, 0.2]
  });

  // Cluster 3: Cold leads (low engagement, small deals)
  addCluster(nPerCluster, [22, 3, 20], [10, 2, 8], {
    industry: [0.25, 0.25, 0.25, 0.25],
    size: [0.6, 0.3, 0.1],
    source: [0.1, 0.2, 0.1, 0.6]
  });

  // Cluster 4: High engagement but small (tire kickers)
  addCluster(nPerCluster, [68, 15, 25], [12, 5, 10], {
    industry: [0.3, 0.2, 0.2, 0.3],
    size: [0.5, 0.4, 0.1],
    source: [0.2, 0.4, 0.2, 0.2]
  });

  const csvLines = [headers.join(',')].concat(
    rows.map(row => headers.map(h => row[h]).join(','))
  );

  const variableTypes = {
    'engagement_score': 'continuous',
    'email_opens': 'continuous',
    'estimated_deal_size': 'continuous',
    'industry': 'categorical',
    'company_size': 'categorical',
    'lead_source': 'categorical'
  };

  return { headers, rows, csvText: csvLines.join('\n'), variableTypes };
}

// -------------------- Data source toggle & loading --------------------

function setupDataSourceModeToggle() {
  const buttons = document.querySelectorAll('.mode-toggle .mode-button');
  const panels = document.querySelectorAll('.mode-panels .mode-panel');
  if (!buttons.length || !panels.length) return;

  const setMode = mode => {
    buttons.forEach(btn => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle('active', isActive);
    });
    panels.forEach(panel => {
      const isActive = panel.dataset.mode === mode;
      panel.classList.toggle('active', isActive);
    });
    activeDataSourceMode = mode;
  };

  buttons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const mode = button.dataset.mode;
      if (mode && mode !== activeDataSourceMode) setMode(mode);
    });
  });

  setMode(activeDataSourceMode);
}

function setupUpload() {
  const feedback = document.getElementById('kproto-raw-feedback');

  const setFeedback = (message, status) => {
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (status) feedback.classList.add(status);
  };

  const handleFile = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const parsed = parseDelimitedText(text, null, { maxRows: MAX_UPLOAD_ROWS });
        const variableTypes = inferVariableTypes(parsed.headers, parsed.rows);
        loadDataset(parsed.headers, parsed.rows, variableTypes, { sourceLabel: 'upload' });
        setFeedback(
          `✓ Loaded ${parsed.rows.length} row(s) with ${parsed.headers.length} column(s).`,
          'success'
        );
        
        // Track file upload
        if (typeof markDataUploaded === 'function') {
          markDataUploaded(file.name || 'uploaded_file.csv');
        }
      } catch (error) {
        setFeedback(error.message || 'Unable to parse file.', 'error');
      }
    };
    reader.onerror = () => setFeedback('Unable to read the file.', 'error');
    reader.readAsText(file);
  };

  if (window.UIUtils && typeof window.UIUtils.initDropzone === 'function') {
    window.UIUtils.initDropzone({
      dropzoneId: 'kproto-raw-dropzone',
      inputId: 'kproto-raw-input',
      browseId: 'kproto-raw-browse',
      onFile: handleFile,
      onError: message => setFeedback(message, 'error')
    });
  }
}

function setupDemoLoader() {
  const button = document.getElementById('kproto-load-demo');
  const feedback = document.getElementById('kproto-demo-feedback');
  if (!button) return;

  const setFeedback = (message, status) => {
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (status) feedback.classList.add(status);
  };

  button.addEventListener('click', event => {
    event.preventDefault();
    const demo = generateCustomerSegmentData();
    activeScenario = KPROTO_SCENARIOS[0];
    activeScenarioCsv = demo.csvText;
    loadDataset(demo.headers, demo.rows, demo.variableTypes, { sourceLabel: 'demo' });
    setFeedback(
      `Loaded demo dataset with ${demo.rows.length} customers and ${demo.headers.length} variables.`,
      'success'
    );
  });
}

function loadDataset(headers, rows, variableTypes, { sourceLabel } = {}) {
  currentHeaders = headers;
  currentRows = rows;
  currentVariableTypes = variableTypes;
  selectedVariables = headers.slice(); // Start with all variables selected
  
  populateVariableList();
  updateGammaDisplay();
  clearResults();
  
  const panel = document.getElementById('variable-assignment-panel');
  if (panel) panel.classList.remove('hidden');
}

function inferVariableTypes(headers, rows) {
  const types = {};
  headers.forEach(header => {
    const values = rows.map(r => r[header]);
    let numericCount = 0;
    let total = 0;
    
    values.forEach(v => {
      if (v === null || v === undefined || v === '') return;
      total++;
      const num = parseFloat(v);
      if (Number.isFinite(num)) numericCount++;
    });
    
    // If 80%+ are numeric, it's continuous; otherwise categorical
    types[header] = (numericCount / total >= 0.8) ? 'continuous' : 'categorical';
  });
  return types;
}

function populateVariableList() {
  const container = document.getElementById('kproto-variable-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  currentHeaders.forEach(header => {
    const row = document.createElement('div');
    row.className = 'variable-row';
    
    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `var-${header}`;
    checkbox.checked = selectedVariables.includes(header);
    checkbox.dataset.variable = header;
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!selectedVariables.includes(header)) {
          selectedVariables.push(header);
        }
      } else {
        selectedVariables = selectedVariables.filter(v => v !== header);
      }
      updateGammaDisplay();
    });
    
    // Label
    const label = document.createElement('label');
    label.htmlFor = `var-${header}`;
    label.textContent = header;
    
    // Type selector
    const typeSelect = document.createElement('select');
    typeSelect.className = 'variable-type-select';
    typeSelect.dataset.variable = header;
    
    const contOption = document.createElement('option');
    contOption.value = 'continuous';
    contOption.textContent = 'Continuous';
    typeSelect.appendChild(contOption);
    
    const catOption = document.createElement('option');
    catOption.value = 'categorical';
    catOption.textContent = 'Categorical';
    typeSelect.appendChild(catOption);
    
    typeSelect.value = currentVariableTypes[header] || 'continuous';
    
    typeSelect.addEventListener('change', () => {
      currentVariableTypes[header] = typeSelect.value;
      updateVariableBadge(badge, typeSelect.value);
      updateGammaDisplay();
    });
    
    // Badge
    const badge = document.createElement('span');
    badge.className = 'variable-badge';
    updateVariableBadge(badge, currentVariableTypes[header]);
    
    row.appendChild(checkbox);
    row.appendChild(label);
    row.appendChild(typeSelect);
    row.appendChild(badge);
    container.appendChild(row);
  });
}

function updateVariableBadge(badge, type) {
  badge.className = `variable-badge ${type}`;
  const distinctCount = getDistinctCount(badge.closest('.variable-row')?.querySelector('input[type="checkbox"]')?.dataset.variable);
  if (type === 'continuous') {
    badge.textContent = 'Numeric';
  } else {
    badge.textContent = distinctCount ? `${distinctCount} levels` : 'Categorical';
  }
}

function getDistinctCount(header) {
  if (!header || !currentRows.length) return 0;
  const values = currentRows.map(r => r[header]).filter(v => v != null && v !== '');
  return new Set(values).size;
}

function setupGammaControls() {
  const autoCheckbox = document.getElementById('kproto-gamma-auto');
  const manualDiv = document.getElementById('kproto-gamma-manual');
  
  if (!autoCheckbox) return;
  
  autoCheckbox.addEventListener('change', () => {
    if (manualDiv) {
      manualDiv.style.display = autoCheckbox.checked ? 'none' : 'block';
    }
    updateGammaDisplay();
  });
  
  const gammaInput = document.getElementById('kproto-gamma-value');
  if (gammaInput) {
    gammaInput.addEventListener('input', updateGammaDisplay);
  }
}

function updateGammaDisplay() {
  const display = document.getElementById('kproto-gamma-display');
  const autoCheckbox = document.getElementById('kproto-gamma-auto');
  if (!display) return;
  
  if (autoCheckbox && autoCheckbox.checked) {
    const gamma = calculateAutoGamma();
    display.textContent = gamma !== null 
      ? `Auto: γ = ${gamma.toFixed(2)}` 
      : 'Auto: γ = (will be calculated after selecting continuous variables)';
  } else {
    const gammaInput = document.getElementById('kproto-gamma-value');
    const value = gammaInput ? parseFloat(gammaInput.value) : 1.0;
    display.textContent = `Manual: γ = ${value.toFixed(2)}`;
  }
}

function calculateAutoGamma() {
  const continuousVars = selectedVariables.filter(v => currentVariableTypes[v] === 'continuous');
  if (continuousVars.length === 0) return null;
  
  const stdDevs = continuousVars.map(varName => {
    const values = currentRows
      .map(r => parseFloat(r[varName]))
      .filter(v => Number.isFinite(v));
    return calculateStdDev(values);
  });
  
  const avgStdDev = stdDevs.reduce((sum, sd) => sum + sd, 0) / stdDevs.length;
  return avgStdDev;
}

function calculateStdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function setupRunButton() {
  const button = document.getElementById('kproto-run');
  if (!button) return;
  
  button.addEventListener('click', () => {
    runClustering();
  });
}

function runClustering() {
  if (selectedVariables.length === 0) {
    alert('Please select at least one variable for clustering.');
    return;
  }
  
  // Track run attempt
  if (typeof markRunAttempted === 'function') {
    markRunAttempted();
  }
  
  const k = parseInt(document.getElementById('kproto-k')?.value) || 3;
  const kMin = parseInt(document.getElementById('kproto-k-min')?.value) || 2;
  const kMax = parseInt(document.getElementById('kproto-k-max')?.value) || 8;
  const scaleMode = document.getElementById('kproto-scale-mode')?.value || 'zscore';
  
  const autoGamma = document.getElementById('kproto-gamma-auto')?.checked;
  const gamma = autoGamma 
    ? (calculateAutoGamma() || 1.0)
    : (parseFloat(document.getElementById('kproto-gamma-value')?.value) || 1.0);
  
  // Build feature matrix
  const { continuousMatrix, categoricalMatrix, continuousNames, categoricalNames } = buildMixedFeatureMatrix();
  
  if (continuousMatrix[0].length === 0 && categoricalMatrix[0].length === 0) {
    alert('No valid data for selected variables.');
    return;
  }
  
  // Scale continuous features
  const { scaledMatrix, scalingInfo } = buildScaledMatrix(continuousMatrix, scaleMode);
  
  // Run k-prototypes for current k
  const solution = runKPrototypes(scaledMatrix, categoricalMatrix, k, gamma);
  
  // Run for range of k values for diagnostics
  const diagnostics = [];
  for (let testK = kMin; testK <= kMax; testK++) {
    const testSolution = runKPrototypes(scaledMatrix, categoricalMatrix, testK, gamma);
    const silhouette = computeAverageSilhouette(scaledMatrix, categoricalMatrix, testSolution.assignments, gamma);
    diagnostics.push({
      k: testK,
      cost: testSolution.cost,
      silhouette
    });
  }
  
  // Store state
  lastClusteringState = {
    solution,
    diagnostics,
    continuousMatrix: scaledMatrix,
    categoricalMatrix,
    continuousNames,
    categoricalNames,
    scalingInfo,
    gamma,
    k
  };
  
  // Render outputs
  renderParallelCoordinates();
  renderElbowPlot();
  renderSilhouettePlot();
  updateSummaryMetrics();
  
  // Track successful run
  if (typeof markRunSuccessful === 'function') {
    markRunSuccessful({
      k: k,
      variables: selectedVariables.length,
      rows: currentRows.length,
      silhouette: lastClusteringState?.diagnostics?.find(d => d.k === k)?.silhouette?.toFixed(3) || 'N/A'
    });
  }
  renderClusterTable();
  
  // Enable download
  const downloadBtn = document.getElementById('kproto-download-results');
  if (downloadBtn) downloadBtn.disabled = false;
  
  // Track clustering execution
  if (typeof markToolExecuted === 'function') {
    markToolExecuted(k, selectedVariables.length);
  }
  
  stampModified();
}

function buildMixedFeatureMatrix() {
  const continuousVars = selectedVariables.filter(v => currentVariableTypes[v] === 'continuous');
  const categoricalVars = selectedVariables.filter(v => currentVariableTypes[v] === 'categorical');
  
  const continuousMatrix = currentRows.map(row => 
    continuousVars.map(varName => {
      const val = parseFloat(row[varName]);
      return Number.isFinite(val) ? val : 0;
    })
  );
  
  const categoricalMatrix = currentRows.map(row =>
    categoricalVars.map(varName => String(row[varName] || ''))
  );
  
  return {
    continuousMatrix,
    categoricalMatrix,
    continuousNames: continuousVars,
    categoricalNames: categoricalVars
  };
}

function buildScaledMatrix(matrix, scaleMode) {
  if (matrix.length === 0 || matrix[0].length === 0) {
    return { scaledMatrix: matrix, scalingInfo: {} };
  }
  
  const n = matrix.length;
  const p = matrix[0].length;
  
  if (scaleMode === ScaleModes.NONE) {
    return { scaledMatrix: matrix, scalingInfo: { mode: 'none' } };
  }
  
  const scaledMatrix = matrix.map(row => row.slice());
  const scalingInfo = { mode: scaleMode, features: [] };
  
  for (let j = 0; j < p; j++) {
    const col = matrix.map(row => row[j]);
    
    if (scaleMode === ScaleModes.ZSCORE) {
      const mean = col.reduce((sum, v) => sum + v, 0) / n;
      const variance = col.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
      const sd = Math.sqrt(variance);
      
      if (sd > 0) {
        for (let i = 0; i < n; i++) {
          scaledMatrix[i][j] = (matrix[i][j] - mean) / sd;
        }
      }
      
      scalingInfo.features.push({ mean, sd });
    } else if (scaleMode === ScaleModes.MINMAX) {
      const min = Math.min(...col);
      const max = Math.max(...col);
      const range = max - min;
      
      if (range > 0) {
        for (let i = 0; i < n; i++) {
          scaledMatrix[i][j] = ((matrix[i][j] - min) / range) * 100;
        }
      }
      
      scalingInfo.features.push({ min, max, range });
    }
  }
  
  return { scaledMatrix, scalingInfo };
}

// -------------------- K-Prototypes Algorithm --------------------

function runKPrototypes(continuousMatrix, categoricalMatrix, k, gamma, { maxIter = 100, nInit = 5 } = {}) {
  let bestSolution = null;
  let bestCost = Infinity;
  
  for (let init = 0; init < nInit; init++) {
    const solution = runKPrototypesSingleInit(continuousMatrix, categoricalMatrix, k, gamma, maxIter);
    if (solution.cost < bestCost) {
      bestCost = solution.cost;
      bestSolution = solution;
    }
  }
  
  return bestSolution;
}

function runKPrototypesSingleInit(continuousMatrix, categoricalMatrix, k, gamma, maxIter) {
  const n = continuousMatrix.length;
  const pCont = continuousMatrix[0].length;
  const pCat = categoricalMatrix[0].length;
  
  // Initialize prototypes randomly
  let prototypes = initializePrototypes(continuousMatrix, categoricalMatrix, k);
  let assignments = new Array(n).fill(0);
  let oldAssignments = new Array(n).fill(-1);
  let iterations = 0;
  
  while (iterations < maxIter && !arraysEqual(assignments, oldAssignments)) {
    oldAssignments = assignments.slice();
    
    // Assignment step
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      
      for (let j = 0; j < k; j++) {
        const dist = calculateMixedDistance(
          continuousMatrix[i],
          categoricalMatrix[i],
          prototypes[j].continuous,
          prototypes[j].categorical,
          gamma
        );
        
        if (dist < minDist) {
          minDist = dist;
          bestCluster = j;
        }
      }
      
      assignments[i] = bestCluster;
    }
    
    // Update step
    for (let j = 0; j < k; j++) {
      const clusterPoints = [];
      const clusterCategorical = [];
      
      for (let i = 0; i < n; i++) {
        if (assignments[i] === j) {
          clusterPoints.push(continuousMatrix[i]);
          clusterCategorical.push(categoricalMatrix[i]);
        }
      }
      
      if (clusterPoints.length > 0) {
        // Update continuous prototype (mean)
        const newContinuous = new Array(pCont).fill(0);
        for (let p = 0; p < pCont; p++) {
          const sum = clusterPoints.reduce((s, point) => s + point[p], 0);
          newContinuous[p] = sum / clusterPoints.length;
        }
        prototypes[j].continuous = newContinuous;
        
        // Update categorical prototype (mode)
        const newCategorical = new Array(pCat).fill('');
        for (let p = 0; p < pCat; p++) {
          const freqMap = {};
          clusterCategorical.forEach(catVec => {
            const val = catVec[p];
            freqMap[val] = (freqMap[val] || 0) + 1;
          });
          
          let maxFreq = 0;
          let mode = '';
          for (const [val, freq] of Object.entries(freqMap)) {
            if (freq > maxFreq) {
              maxFreq = freq;
              mode = val;
            }
          }
          newCategorical[p] = mode;
        }
        prototypes[j].categorical = newCategorical;
      }
    }
    
    iterations++;
  }
  
  // Calculate total cost
  let totalCost = 0;
  for (let i = 0; i < n; i++) {
    const clusterIdx = assignments[i];
    const dist = calculateMixedDistance(
      continuousMatrix[i],
      categoricalMatrix[i],
      prototypes[clusterIdx].continuous,
      prototypes[clusterIdx].categorical,
      gamma
    );
    totalCost += dist;
  }
  
  return {
    prototypes,
    assignments,
    cost: totalCost,
    iterations
  };
}

function initializePrototypes(continuousMatrix, categoricalMatrix, k) {
  const n = continuousMatrix.length;
  const indices = [];
  for (let i = 0; i < n; i++) indices.push(i);
  
  // Shuffle and pick first k
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  const prototypes = [];
  for (let i = 0; i < k; i++) {
    const idx = indices[i];
    prototypes.push({
      continuous: continuousMatrix[idx].slice(),
      categorical: categoricalMatrix[idx].slice()
    });
  }
  
  return prototypes;
}

function calculateMixedDistance(contA, catA, contB, catB, gamma) {
  let contDist = 0;
  for (let i = 0; i < contA.length; i++) {
    contDist += Math.pow(contA[i] - contB[i], 2);
  }
  
  let catDist = 0;
  for (let i = 0; i < catA.length; i++) {
    if (catA[i] !== catB[i]) catDist++;
  }
  
  return contDist + gamma * catDist;
}

function computeAverageSilhouette(continuousMatrix, categoricalMatrix, assignments, gamma, maxPoints = MAX_SILHOUETTE_POINTS) {
  const n = continuousMatrix.length;
  const k = Math.max(...assignments) + 1;
  
  // Sample if too many points
  let indices = [];
  for (let i = 0; i < n; i++) indices.push(i);
  if (n > maxPoints) {
    indices = sampleIndices(n, maxPoints);
  }
  
  let totalSilhouette = 0;
  let count = 0;
  
  for (const i of indices) {
    const a = averageDistanceToCluster(i, assignments[i], continuousMatrix, categoricalMatrix, assignments, gamma);
    
    let minB = Infinity;
    for (let j = 0; j < k; j++) {
      if (j !== assignments[i]) {
        const b = averageDistanceToCluster(i, j, continuousMatrix, categoricalMatrix, assignments, gamma);
        if (b < minB) minB = b;
      }
    }
    
    const s = (minB - a) / Math.max(a, minB);
    if (Number.isFinite(s)) {
      totalSilhouette += s;
      count++;
    }
  }
  
  return count > 0 ? totalSilhouette / count : 0;
}

function averageDistanceToCluster(pointIdx, clusterIdx, continuousMatrix, categoricalMatrix, assignments, gamma) {
  const n = continuousMatrix.length;
  let sum = 0;
  let count = 0;
  
  for (let i = 0; i < n; i++) {
    if (assignments[i] === clusterIdx && i !== pointIdx) {
      const dist = calculateMixedDistance(
        continuousMatrix[pointIdx],
        categoricalMatrix[pointIdx],
        continuousMatrix[i],
        categoricalMatrix[i],
        gamma
      );
      sum += dist;
      count++;
    }
  }
  
  return count > 0 ? sum / count : 0;
}

function sampleIndices(n, maxPoints) {
  const indices = [];
  const step = n / maxPoints;
  for (let i = 0; i < maxPoints; i++) {
    indices.push(Math.floor(i * step));
  }
  return indices;
}

// -------------------- Visualization --------------------

function renderParallelCoordinates() {
  if (!lastClusteringState) return;
  
  const { solution, continuousMatrix, categoricalMatrix, continuousNames, categoricalNames } = lastClusteringState;
  const container = document.getElementById('plot-parallel-coords');
  if (!container) return;
  
  const allVarNames = [...continuousNames, ...categoricalNames];
  const n = solution.assignments.length;
  
  // Build dimensions for Plotly parallel coordinates
  const dimensions = [];
  
  // Add continuous dimensions
  continuousNames.forEach((name, idx) => {
    const values = continuousMatrix.map(row => row[idx]);
    dimensions.push({
      label: name,
      values: values,
      range: [Math.min(...values), Math.max(...values)]
    });
  });
  
  // Add categorical dimensions
  categoricalNames.forEach((name, idx) => {
    const values = categoricalMatrix.map(row => row[idx]);
    const uniqueVals = [...new Set(values)].sort();
    const valueToNum = {};
    uniqueVals.forEach((val, i) => { valueToNum[val] = i; });
    
    dimensions.push({
      label: name,
      values: values.map(v => valueToNum[v]),
      tickvals: uniqueVals.map((_, i) => i),
      ticktext: uniqueVals,
      range: [-0.5, uniqueVals.length - 0.5]
    });
  });
  
  // Prepare line colors based on cluster assignment
  const lineColors = solution.assignments.map(clusterIdx => clusterIdx);
  
  const trace = {
    type: 'parcoords',
    line: {
      color: lineColors,
      colorscale: CLUSTER_COLORS.slice(0, Math.max(...solution.assignments) + 1).map((color, i) => [i / Math.max(...solution.assignments), color]),
      showscale: true,
      cmin: 0,
      cmax: Math.max(...solution.assignments),
      colorbar: {
        title: 'Cluster',
        tickmode: 'linear',
        tick0: 0,
        dtick: 1
      }
    },
    dimensions: dimensions
  };
  
  const layout = {
    margin: { l: 150, r: 50, t: 50, b: 50 },
    paper_bgcolor: 'white',
    plot_bgcolor: '#f8f9fa',
    font: { size: 11 }
  };
  
  Plotly.newPlot(container, [trace], layout, { responsive: true });
  
  const caption = document.getElementById('plot-parallel-caption');
  if (caption) {
    caption.textContent = `Each line represents one observation (n=${n}), colored by cluster assignment. Variables shown: ${allVarNames.join(', ')}.`;
  }
}

function renderElbowPlot() {
  if (!lastClusteringState) return;
  
  const { diagnostics, k } = lastClusteringState;
  const container = document.getElementById('plot-elbow');
  if (!container) return;
  
  const kValues = diagnostics.map(d => d.k);
  const costs = diagnostics.map(d => d.cost);
  
  const trace = {
    x: kValues,
    y: costs,
    mode: 'lines+markers',
    type: 'scatter',
    name: 'Total cost',
    line: { color: '#1f77b4', width: 2 },
    marker: { size: 8 }
  };
  
  const currentTrace = {
    x: [k],
    y: [diagnostics.find(d => d.k === k)?.cost],
    mode: 'markers',
    type: 'scatter',
    name: `Current k=${k}`,
    marker: { size: 12, color: '#d62728', symbol: 'diamond' }
  };
  
  const layout = {
    xaxis: { title: 'Number of clusters (k)' },
    yaxis: { title: 'Total cost (continuous SS + γ × categorical mismatches)' },
    margin: { l: 60, r: 40, t: 40, b: 60 },
    showlegend: true,
    legend: { x: 0.7, y: 0.95 }
  };
  
  Plotly.newPlot(container, [trace, currentTrace], layout, { responsive: true });
  
  const caption = document.getElementById('plot-elbow-caption');
  if (caption) {
    caption.textContent = `Look for an "elbow" where the cost reduction slows. Current k=${k} has cost=${diagnostics.find(d => d.k === k)?.cost.toFixed(2)}.`;
  }
}

function renderSilhouettePlot() {
  if (!lastClusteringState) return;
  
  const { diagnostics, k } = lastClusteringState;
  const container = document.getElementById('plot-silhouette');
  if (!container) return;
  
  const kValues = diagnostics.map(d => d.k);
  const silhouettes = diagnostics.map(d => d.silhouette);
  
  const trace = {
    x: kValues,
    y: silhouettes,
    mode: 'lines+markers',
    type: 'scatter',
    name: 'Avg. silhouette',
    line: { color: '#2ca02c', width: 2 },
    marker: { size: 8 }
  };
  
  const currentTrace = {
    x: [k],
    y: [diagnostics.find(d => d.k === k)?.silhouette],
    mode: 'markers',
    type: 'scatter',
    name: `Current k=${k}`,
    marker: { size: 12, color: '#d62728', symbol: 'diamond' }
  };
  
  const layout = {
    xaxis: { title: 'Number of clusters (k)' },
    yaxis: { title: 'Average silhouette coefficient', range: [-1, 1] },
    margin: { l: 60, r: 40, t: 40, b: 60 },
    showlegend: true,
    legend: { x: 0.7, y: 0.95 },
    shapes: [{
      type: 'line',
      x0: Math.min(...kValues),
      x1: Math.max(...kValues),
      y0: 0,
      y1: 0,
      line: { color: 'gray', width: 1, dash: 'dash' }
    }]
  };
  
  Plotly.newPlot(container, [trace, currentTrace], layout, { responsive: true });
  
  const caption = document.getElementById('plot-silhouette-caption');
  if (caption) {
    const currentSil = diagnostics.find(d => d.k === k)?.silhouette;
    caption.textContent = `Higher silhouette indicates better-separated clusters. Current k=${k} has average silhouette=${currentSil?.toFixed(3)}.`;
  }
}

function updateSummaryMetrics() {
  if (!lastClusteringState) return;
  
  const { solution, k, gamma, continuousMatrix } = lastClusteringState;
  const n = solution.assignments.length;
  
  const currentSil = lastClusteringState.diagnostics.find(d => d.k === k)?.silhouette || 0;
  
  document.getElementById('metric-k').textContent = k;
  document.getElementById('metric-n').textContent = n;
  document.getElementById('metric-cost').textContent = solution.cost.toFixed(2);
  document.getElementById('metric-silhouette').textContent = currentSil.toFixed(3);
  document.getElementById('metric-gamma').textContent = gamma.toFixed(2);
}

function renderClusterTable() {
  if (!lastClusteringState) return;
  
  const { solution, continuousNames, categoricalNames, continuousMatrix, categoricalMatrix } = lastClusteringState;
  const thead = document.getElementById('cluster-table-head');
  const tbody = document.getElementById('cluster-table-body');
  
  if (!thead || !tbody) return;
  
  // Build header
  let headerHtml = '<tr><th>Cluster</th><th>Size</th>';
  continuousNames.forEach(name => {
    headerHtml += `<th>${escapeHtml(name)}<br><span class="muted" style="font-weight: normal; font-size: 0.85em;">(mean)</span></th>`;
  });
  categoricalNames.forEach(name => {
    headerHtml += `<th>${escapeHtml(name)}<br><span class="muted" style="font-weight: normal; font-size: 0.85em;">(mode)</span></th>`;
  });
  headerHtml += '</tr>';
  thead.innerHTML = headerHtml;
  
  // Build body
  const k = solution.prototypes.length;
  const clusterSizes = new Array(k).fill(0);
  solution.assignments.forEach(c => clusterSizes[c]++);
  
  let bodyHtml = '';
  for (let i = 0; i < k; i++) {
    bodyHtml += `<tr>`;
    bodyHtml += `<td class="cluster-name" style="color: ${CLUSTER_COLORS[i]};">Cluster ${i + 1}</td>`;
    bodyHtml += `<td class="cluster-size">${clusterSizes[i]}</td>`;
    
    // Continuous means
    solution.prototypes[i].continuous.forEach(val => {
      bodyHtml += `<td><span class="continuous-value">${val.toFixed(2)}</span></td>`;
    });
    
    // Categorical modes
    solution.prototypes[i].categorical.forEach(val => {
      bodyHtml += `<td><span class="categorical-value">${escapeHtml(val)}</span></td>`;
    });
    
    bodyHtml += `</tr>`;
  }
  
  tbody.innerHTML = bodyHtml;
}

function setupDownloadResultsButton() {
  const button = document.getElementById('kproto-download-results');
  if (!button) return;
  
  button.addEventListener('click', () => {
    if (!lastClusteringState) return;
    
    const { solution } = lastClusteringState;
    const lines = [['row_index', 'cluster', ...currentHeaders].join(',')];
    
    currentRows.forEach((row, i) => {
      const cluster = solution.assignments[i];
      const rowData = [i + 1, cluster + 1, ...currentHeaders.map(h => row[h])];
      lines.push(rowData.join(','));
    });
    
    downloadTextFile('kprototypes_cluster_assignments.csv', lines.join('\n'), { mimeType: 'text/csv' });
  });
}

function clearResults() {
  document.getElementById('metric-k').textContent = '--';
  document.getElementById('metric-n').textContent = '--';
  document.getElementById('metric-cost').textContent = '--';
  document.getElementById('metric-silhouette').textContent = '--';
  document.getElementById('metric-gamma').textContent = '--';
  
  const tbody = document.getElementById('cluster-table-body');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="2">Run clustering to see cluster profiles.</td></tr>';
  }
  
  ['plot-parallel-coords', 'plot-elbow', 'plot-silhouette'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });
  
  const downloadBtn = document.getElementById('kproto-download-results');
  if (downloadBtn) downloadBtn.disabled = true;
}

// -------------------- Utility helpers --------------------

function randomNormal(mean = 0, sd = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + sd * num;
}

function sampleCategorical(categories, probabilities) {
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < categories.length; i++) {
    cumulative += probabilities[i];
    if (rand < cumulative) return categories[i];
  }
  return categories[categories.length - 1];
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseDelimitedText(text, delimiter = null, { maxRows = 10000 } = {}) {
  const lines = text.trim().replace(/\r/g, '').split('\n');
  if (lines.length < 2) throw new Error('File must have at least a header row and one data row.');
  
  const headerLine = lines[0];
  if (!delimiter) {
    delimiter = headerLine.includes('\t') ? '\t' : ',';
  }
  
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length && rows.length < maxRows; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length !== headers.length) continue;
    
    const row = {};
    headers.forEach((h, idx) => { row[h] = parts[idx]; });
    rows.push(row);
  }
  
  return { headers, rows };
}

function downloadTextFile(filename, content, { mimeType = 'text/plain' } = {}) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

