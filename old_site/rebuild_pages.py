#!/usr/bin/env python3
"""Rebuild old_site pages with clean semantic HTML using main.css styling."""

from pathlib import Path

# Page templates
pages = {
    "Home.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dr. Baker's Marketing Research - Statistical Analysis Tools</title>
  <link rel="stylesheet" href="../shared/css/main.css">
  <style>
    .bio-section {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    .bio-content {
      line-height: 1.6;
    }
    .disclaimer {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      font-size: 0.95rem;
    }
    .nav-section {
      margin-top: 2rem;
    }
    .nav-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .nav-card {
      background: var(--app-card-bg);
      padding: 1rem;
      border-radius: 12px;
      border: 1px solid var(--app-border);
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .nav-card:hover {
      border-color: var(--app-accent);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }
    .nav-card a {
      display: block;
      color: var(--app-accent);
      text-decoration: none;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .nav-card a:hover {
      text-decoration: underline;
    }
    .nav-card p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--app-muted);
    }
  </style>
</head>
<body>
  <main class="app-main">
    <header class="intro hero-header">
      <div class="hero-header__top">
        <h1>Dr. Baker's Marketing Research</h1>
      </div>
      <p class="hero-header__lede">
        Welcome to a collection of interactive statistical analysis tools and educational resources.
      </p>
    </header>

    <section class="card bio-section">
      <div class="bio-content">
        <h2>About This Site</h2>
        <p>
          Hi there, adventurous marketer! I don't use this page for much beyond providing useful links to practice data sets that correspond to my various YouTube tutorials. My tutorials and examples are almost always about one of three things: craft beer, nerd/geek culture stuff, or sports.
        </p>
        <p>
          If you find detailed examples regarding the high fashion industry, luxury cars, financial services, or the like, please contact me—someone probably hacked my site!
        </p>
        <div class="disclaimer">
          <strong>A Note on Design:</strong> Despite being a marketing academic, my creative skills are some arbitrarily small number approaching zero. For the sake of your career as an advertising creative, DO NOT borrow any of my attempts at advertising. 😊
        </div>
      </div>
    </section>

    <section class="nav-section">
      <h2>Explore Resources</h2>
      <div class="nav-grid">
        <div class="nav-card">
          <a href="Statistical Testing Online Helpers.html">Statistical Tools</a>
          <p>21 interactive web-based statistical analysis tools</p>
        </div>
        <div class="nav-card">
          <a href="Practice Datasets.html">Practice Datasets</a>
          <p>CSV, SPSS, and Excel files for learning and experimentation</p>
        </div>
        <div class="nav-card">
          <a href="Previous Student Projects.html">Student Projects</a>
          <p>Real research datasets with full codebooks and analysis</p>
        </div>
        <div class="nav-card">
          <a href="Excel Sheets.html">Excel Tools</a>
          <p>Educational spreadsheet templates for statistical concepts</p>
        </div>
      </div>
    </section>

  </main>

  <footer class="app-footer">
    <p>&copy; 2025 Dr. Andrew Baker. All rights reserved.</p>
  </footer>
</body>
</html>""",

    "Statistical Testing Online Helpers.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Statistical Testing Tools</title>
  <link rel="stylesheet" href="../shared/css/main.css">
  <style>
    .tool-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .tool-card {
      background: var(--app-card-bg);
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid var(--app-border);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: box-shadow 0.2s ease;
    }
    .tool-card:hover {
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    }
    .tool-card h3 {
      margin: 0;
      font-size: 1.1rem;
    }
    .tool-card p {
      margin: 0;
      font-size: 0.95rem;
      color: var(--app-muted);
      flex-grow: 1;
    }
    .tool-card a {
      display: inline-block;
      color: var(--app-accent);
      text-decoration: none;
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .tool-card a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <main class="app-main">
    <header class="intro hero-header">
      <div class="hero-header__top">
        <h1>Statistical Testing Tools</h1>
      </div>
      <p class="hero-header__lede">
        A collection of 21 interactive web-based tools for statistical analysis, hypothesis testing, and sample size planning.
      </p>
    </header>

    <section class="tool-grid">
      <div class="tool-card">
        <h3>A/B Testing: Proportions</h3>
        <p>Test differences between two independent proportions (e.g., Click-Through Rates, Conversion Rates)</p>
        <a href="../apps/ab_proportion/main_ab_proportion.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>A/B Testing: Means</h3>
        <p>Test differences between two independent means (e.g., Average Sales, Mean Customer Satisfaction)</p>
        <a href="../apps/ind_ttest/main_ind_ttest.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Chi-Square Test</h3>
        <p>Test associations between two categorical (nominal) variables</p>
        <a href="../apps/chisquare/main_chisquare.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Pearson Correlation</h3>
        <p>Measure linear relationships between two continuous variables</p>
        <a href="../apps/pearson_correlation/main_pearson.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Bivariate Regression</h3>
        <p>Simple linear regression with one predictor variable</p>
        <a href="../apps/bivariate_regression/bivariate_app.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Multiple Linear Regression</h3>
        <p>Linear regression with multiple predictor variables</p>
        <a href="../apps/ml_regression/mlr_app.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Logistic Regression</h3>
        <p>Regression for binary outcome variables</p>
        <a href="../apps/log_regression/log_reg_app.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Multinomial Logistic Regression</h3>
        <p>Logistic regression for multi-category outcomes</p>
        <a href="../apps/mn_log_regression/main_mn_log_regression.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>K-Means Clustering</h3>
        <p>Unsupervised clustering algorithm for grouping observations</p>
        <a href="../apps/kmeans/main_kmeans.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Paired T-Test</h3>
        <p>Test differences within paired/matched observations</p>
        <a href="../apps/paired_ttest/main_paired_ttest.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>One-Way ANOVA</h3>
        <p>Compare means across three or more independent groups</p>
        <a href="../apps/onewayanova/main_onewayanova.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>McNemar Test</h3>
        <p>Test symmetry in paired dichotomous outcomes</p>
        <a href="../apps/mcnemar/main_mcnemar.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Propensity Score Matching</h3>
        <p>Reduce bias in causal inference by matching treatment groups</p>
        <a href="../apps/ps_matching/log_regression.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Sample Size: Single Outcome</h3>
        <p>Calculate required sample size for continuous or binary outcomes</p>
        <a href="../apps/sample_size_calculator/sample_size_calculator.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Sample Size: A/B Testing</h3>
        <p>Sample size planning for two-group comparison studies</p>
        <a href="../apps/sample_size_AB_calculator/sample_size_calculator.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Sample Size: Correlation/Regression</h3>
        <p>Sample size planning for correlation and regression analyses</p>
        <a href="../apps/sample_size_corr_regression/sample_size_calculator.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Sample Size: Multi-Arm Studies</h3>
        <p>Sample size calculation for studies with 3+ comparison groups</p>
        <a href="../apps/sample_size_multiarm_ab/sample_size_calculator.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Sampling Visualizer</h3>
        <p>Explore sampling distributions and central limit theorem concepts</p>
        <a href="../apps/sampling_visualizer/index.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Selection Probability Lab</h3>
        <p>Understand probability and selection mechanisms interactively</p>
        <a href="../apps/selection_probability_lab/index.html">Open Tool →</a>
      </div>

      <div class="tool-card">
        <h3>Sentiment Analysis Lab</h3>
        <p>Analyze text sentiment using dictionary-based methods</p>
        <a href="../apps/sentiment_lab/index.html">Open Tool →</a>
      </div>
    </section>

  </main>

  <footer class="app-footer">
    <p>&copy; 2025 Dr. Andrew Baker. All rights reserved.</p>
  </footer>
</body>
</html>""",

    "Practice Datasets.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Practice Datasets</title>
  <link rel="stylesheet" href="../shared/css/main.css">
  <style>
    .dataset-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    .dataset-card {
      background: var(--app-card-bg);
      padding: 1.5rem;
      border-radius: 12px;
      border-left: 4px solid var(--app-accent);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }
    .dataset-card h3 {
      margin-top: 0;
      color: #1e40af;
    }
    .dataset-card p {
      margin: 0.75rem 0;
      line-height: 1.5;
    }
    .dataset-meta {
      font-size: 0.9rem;
      color: var(--app-muted);
      margin-top: 1rem;
    }
    .file-list {
      background: #f8f9fb;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      font-family: monospace;
      font-size: 0.9rem;
    }
    .file-list ul {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }
    .file-list li {
      margin: 0.35rem 0;
    }
  </style>
</head>
<body>
  <main class="app-main">
    <header class="intro hero-header">
      <div class="hero-header__top">
        <h1>Practice Datasets</h1>
      </div>
      <p class="hero-header__lede">
        Download datasets, analysis files, and tutorials to practice statistical analysis and data visualization techniques.
      </p>
    </header>

    <section class="dataset-grid">

      <div class="dataset-card">
        <h3>RapidMiner Tutorial: Meal Kit Case Study</h3>
        <p>
          Part of the <strong>Intro to Predictive Model Training and Validation</strong> video series. This tutorial guides you through building, validating, and scoring prediction models using a meal kit subscription dataset.
        </p>
        <div class="file-list">
          <strong>Data Files (CSV):</strong>
          <ul>
            <li>PredictionTutorial_TrainingData.csv (n=1,000)</li>
            <li>PredictionTutorial_TestData.csv (n=500)</li>
            <li>Scoring Dataset (n=775)</li>
          </ul>
          <strong>RapidMiner Process Files (*.rmp):</strong>
          <ul>
            <li>Step 1 - Reading Training & Prediction Performance</li>
            <li>Step 2 - Building the Prediction Models</li>
            <li>Step 3 - Validating the Prediction Models</li>
            <li>Step 4 - Scoring with the Final Model</li>
            <li>Full Process Model (Complete Build)</li>
          </ul>
          <strong>Presentation:</strong>
          <ul>
            <li>PowerPoint Slides (walks through the tutorial)</li>
          </ul>
        </div>
        <div class="dataset-meta">
          <strong>Format:</strong> CSV, RapidMiner, PowerPoint | <strong>Focus:</strong> Predictive modeling, train/test validation
        </div>
      </div>

      <div class="dataset-card">
        <h3>Practice Craft Beer Dataset (SPSS)</h3>
        <p>
          A professional-grade dataset used throughout many SPSS tutorial videos on the DrBakerSDSU YouTube channel. Includes 200 observations of craft beer characteristics and consumer preferences.
        </p>
        <div class="file-list">
          <strong>File:</strong> Craft_Beer_Practice.sav (SPSS format)
        </div>
        <div class="dataset-meta">
          <strong>Format:</strong> SPSS (.sav) | <strong>Observations:</strong> 200 | <strong>Focus:</strong> Bivariate analysis, hypothesis testing
        </div>
      </div>

      <div class="dataset-card">
        <h3>Practice Craft Beer Dataset (Excel)</h3>
        <p>
          An Excel version of craft beer data (note: different dataset than the SPSS version with 230 observations) used for Excel tutorials covering bivariate analysis and statistical testing.
        </p>
        <div class="file-list">
          <strong>File:</strong> Craft_Beer_Practice.xlsx (Excel format)
        </div>
        <div class="dataset-meta">
          <strong>Format:</strong> Excel (.xlsx) | <strong>Observations:</strong> 230 | <strong>Focus:</strong> Bivariate analysis, data visualization
        </div>
      </div>

    </section>

  </main>

  <footer class="app-footer">
    <p>&copy; 2025 Dr. Andrew Baker. All rights reserved.</p>
  </footer>
</body>
</html>""",

    "Excel Sheets.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Excel Teaching Tools</title>
  <link rel="stylesheet" href="../shared/css/main.css">
  <style>
    .tool-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .excel-card {
      background: var(--app-card-bg);
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid var(--app-border);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }
    .excel-card h3 {
      margin-top: 0;
      color: #1e40af;
    }
    .excel-card p {
      margin: 0.75rem 0;
      font-size: 0.95rem;
      color: var(--app-muted);
    }
    .concept-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #1e40af;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
  </style>
</head>
<body>
  <main class="app-main">
    <header class="intro hero-header">
      <div class="hero-header__top">
        <h1>Excel Teaching Tools</h1>
      </div>
      <p class="hero-header__lede">
        Interactive Excel spreadsheets designed to help students build intuition for statistical concepts and business analytics applications.
      </p>
    </header>

    <section class="tool-grid">

      <div class="excel-card">
        <h3>Odds O'Matic</h3>
        <p>Practice the differences between probability, odds, odds ratio, and relative risk. Interactive cells let you explore how these metrics relate to each other.</p>
        <div class="concept-badge">Probability</div>
        <div class="concept-badge">Odds Ratios</div>
      </div>

      <div class="excel-card">
        <h3>Learning Logistic Regression</h3>
        <p>Explore how changing Beta parameters in a logistic regression model impacts the shape of the prediction curve. Build intuition for coefficient interpretation.</p>
        <div class="concept-badge">Logistic Regression</div>
        <div class="concept-badge">Coefficients</div>
      </div>

      <div class="excel-card">
        <h3>Confusion Matrix Metrics</h3>
        <p>Calculate key classification metrics (sensitivity, specificity, precision, recall, F1-score) from a prediction model's confusion matrix. Includes automated interpretation.</p>
        <div class="concept-badge">Classification</div>
        <div class="concept-badge">Model Evaluation</div>
      </div>

      <div class="excel-card">
        <h3>Conjoint Analysis: Cooler Case Study</h3>
        <p>First two tabs contain data from the cooler simulation. Design your own preference study following the video tutorial, or use pre-populated examples.</p>
        <div class="concept-badge">Conjoint</div>
        <div class="concept-badge">Choice Modeling</div>
      </div>

      <div class="excel-card">
        <h3>Applying Choice Rules</h3>
        <p>Demonstrates first-choice, share-of-preference, logit, and alpha choice rules for conjoint analysis. Corresponds to the "Applying Choice Rules" video.</p>
        <div class="concept-badge">Choice Rules</div>
        <div class="concept-badge">Preference</div>
      </div>

      <div class="excel-card">
        <h3>Preference Simulator</h3>
        <p>Annotated Enginius partsworth results with an interactive preference simulator. Explore how attribute changes affect predicted preference shares.</p>
        <div class="concept-badge">Partworth</div>
        <div class="concept-badge">Simulation</div>
      </div>

      <div class="excel-card">
        <h3>Price Bundling Optimization</h3>
        <p>Determine optimal price mix for maximizing profits across multiple products (computer chair, desk, monitor stand). Includes scenario analysis.</p>
        <div class="concept-badge">Pricing</div>
        <div class="concept-badge">Optimization</div>
      </div>

      <div class="excel-card">
        <h3>Gabor-Granger Pricing Method</h3>
        <p>Basic and advanced applications of the Gabor-Granger pricing technique for estimating optimal price points and price elasticity.</p>
        <div class="concept-badge">Pricing</div>
        <div class="concept-badge">Demand Curve</div>
      </div>

      <div class="excel-card">
        <h3>Purchase Intentions to Probabilities</h3>
        <p>Convert survey purchase intent ratings (5-point Likert scales) into predicted purchase probabilities using empirical calibration.</p>
        <div class="concept-badge">Forecasting</div>
        <div class="concept-badge">Calibration</div>
      </div>

      <div class="excel-card">
        <h3>Predictive Model Performance</h3>
        <p>Companion to RapidMiner tutorials. Track training/validation performance metrics and compare model accuracy across different algorithms.</p>
        <div class="concept-badge">Prediction</div>
        <div class="concept-badge">Validation</div>
      </div>

    </section>

  </main>

  <footer class="app-footer">
    <p>&copy; 2025 Dr. Andrew Baker. All rights reserved.</p>
  </footer>
</body>
</html>""",

    "Previous Student Projects.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Student Research Projects</title>
  <link rel="stylesheet" href="../shared/css/main.css">
  <style>
    .warning-banner {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 1rem 1.25rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .warning-banner p {
      margin: 0;
      font-size: 0.95rem;
    }
    .project-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    .project-card {
      background: var(--app-card-bg);
      padding: 1.5rem;
      border-radius: 12px;
      border-left: 5px solid var(--app-accent);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }
    .project-card h3 {
      margin-top: 0;
      color: #1e40af;
    }
    .project-meta {
      display: flex;
      gap: 1rem;
      margin: 0.75rem 0;
      font-size: 0.9rem;
      color: var(--app-muted);
      flex-wrap: wrap;
    }
    .meta-item {
      display: flex;
      gap: 0.35rem;
    }
    .meta-item strong {
      color: var(--app-text);
    }
    .project-description {
      margin: 1rem 0;
      line-height: 1.6;
    }
    .files-section {
      background: #f8f9fb;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }
    .files-section h4 {
      margin-top: 0;
      color: #1e40af;
    }
    .file-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #1e40af;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
  </style>
</head>
<body>
  <main class="app-main">
    <header class="intro hero-header">
      <div class="hero-header__top">
        <h1>Student Research Projects</h1>
      </div>
      <p class="hero-header__lede">
        Real research datasets from student projects at San Diego State University, complete with codebooks and analysis files.
      </p>
    </header>

    <div class="warning-banner">
      <p>
        <strong>⚠️ Important Note:</strong> Most of these datasets come from non-probabilistic sampling methods (convenience sampling of students and peers). Findings should be used for instructional purposes only—do not generalize to broader populations. <em>Caveat emptor.</em>
      </p>
    </div>

    <section class="project-grid">

      <div class="project-card">
        <h3>Social Media Influencers & Parasocial Relationships</h3>
        <div class="project-meta">
          <div class="meta-item"><strong>N =</strong> 1,342</div>
          <div class="meta-item"><strong>Collected:</strong> November 2025</div>
          <div class="meta-item"><strong>Quality:</strong> High (attention checks, timing validation)</div>
        </div>
        <div class="project-description">
          Survey of young consumers examining recognition, following behavior, and parasocial relationships with social media influencers. Includes measures of influencer sponsorship awareness, platform usage (Instagram, YouTube, Twitch, TikTok, Facebook, Reddit), and purchase behaviors.
        </div>
        <div class="files-section">
          <h4>Available Files</h4>
          <div class="file-badge">Excel (labeled data)</div>
          <div class="file-badge">Excel (raw data)</div>
          <div class="file-badge">SPSS</div>
          <div class="file-badge">Codebook</div>
          <div class="file-badge">Sentiment analysis (included)</div>
        </div>
      </div>

      <div class="project-card">
        <h3>Sustainable & Fast Fashion Clothing</h3>
        <div class="project-meta">
          <div class="meta-item"><strong>N =</strong> 683</div>
          <div class="meta-item"><strong>Collected:</strong> Summer 2024</div>
        </div>
        <div class="project-description">
          Study of clothing shopping behaviors, priorities, and brand engagement. Respondents reported retail spending, online vs. in-store preference, and brand selection from both fast-fashion (Shein, H&M, Zara) and sustainable retailers (Patagonia, thrift stores, thredUP). Includes sustainability values assessment.
        </div>
        <div class="files-section">
          <h4>Available Files</h4>
          <div class="file-badge">SPSS</div>
          <div class="file-badge">Codebook (PDF)</div>
        </div>
      </div>

      <div class="project-card">
        <h3>San Diego Coffeeshops: Brand Perception Study</h3>
        <div class="project-meta">
          <div class="meta-item"><strong>N =</strong> 970</div>
          <div class="meta-item"><strong>Collected:</strong> October 2023</div>
        </div>
        <div class="project-description">
          Brand perception and evaluation study of three San Diego-area coffeeshops: Dark Horse, Better Buzz, and Starbucks. Includes coffee consumption habits, spending patterns, and comparative brand perceptions.
        </div>
        <div class="files-section">
          <h4>Available Files</h4>
          <div class="file-badge">Excel</div>
          <div class="file-badge">SPSS</div>
          <div class="file-badge">Survey Codebook (PDF)</div>
        </div>
      </div>

      <div class="project-card">
        <h3>Coffee & Generative AI Sentiment</h3>
        <div class="project-meta">
          <div class="meta-item"><strong>N =</strong> 493</div>
          <div class="meta-item"><strong>Collected:</strong> June 2023</div>
        </div>
        <div class="project-description">
          A/B experiment manipulating whether coffee shop concepts were labeled as created by humans or generated with AI (4 levels of AI reliance). Includes open-ended and closed-ended sentiment toward the concept, plus demographics and technology attitudes.
        </div>
        <div class="files-section">
          <h4>Available Files</h4>
          <div class="file-badge">Excel</div>
          <div class="file-badge">SPSS</div>
          <div class="file-badge">Qualtrics Survey (preview)</div>
          <div class="file-badge">Sentiment analysis</div>
        </div>
      </div>

      <div class="project-card">
        <h3>Plant-Based Food Alternatives</h3>
        <div class="project-meta">
          <div class="meta-item"><strong>N =</strong> 397</div>
          <div class="meta-item"><strong>Collected:</strong> Summer 2022</div>
        </div>
        <div class="project-description">
          Survey of 18+ adults exploring reasons for eating plant-based alternatives, brand recognition, spending and consumption frequency, plus an A/B experiment testing impact of prominent vegan logos on packaging.
        </div>
        <div class="files-section">
          <h4>Available Files</h4>
          <div class="file-badge">Excel</div>
          <div class="file-badge">Survey (PDF)</div>
        </div>
      </div>

      <div class="project-card">
        <h3>Brand Gender Perceptions: Alcohol Brands</h3>
        <div class="project-meta">
          <div class="meta-item"><strong>Collected:</strong> Summer 2021</div>
          <div class="meta-item"><strong>Focus:</strong> 21+ adults</div>
        </div>
        <div class="project-description">
          Study of alcohol brand perceptions (focusing on hard seltzer brands), with emphasis on gendered brand identity assessment. Includes measures of brand personality and gender-fluid perceptions. Respondents assessed whether brands were perceived as male, female, or gender-neutral.
        </div>
        <div class="files-section">
          <h4>Available Files</h4>
          <div class="file-badge">Excel</div>
        </div>
      </div>

      <div class="project-card">
        <h3>Black Lives Matter, COVID-19, & Branding</h3>
        <div class="project-meta">
          <div class="meta-item"><strong>N =</strong> 401</div>
          <div class="meta-item"><strong>Collected:</strong> Summer 2020</div>
        </div>
        <div class="project-description">
          Survey exploring consumer sentiment and brand attitudes during the COVID-19 pandemic and Black Lives Matter movement. Includes emotional health measures, spending patterns across product categories, and brand engagement with social causes.
        </div>
        <div class="files-section">
          <h4>Available Files</h4>
          <div class="file-badge">Multiple file formats available</div>
        </div>
      </div>

    </section>

  </main>

  <footer class="app-footer">
    <p>&copy; 2025 Dr. Andrew Baker. All rights reserved.</p>
  </footer>
</body>
</html>"""
}

# Write all pages
output_dir = Path(__file__).parent
for filename, content in pages.items():
    filepath = output_dir / filename
    filepath.write_text(content, encoding='utf-8')
    print(f"✓ Created: {filename}")

print("\n✅ All pages rebuilt successfully!")
print(f"📁 Location: {output_dir}")
print("\nSize comparison:")
print("  Old HTML files: ~2 MB each")
print("  New HTML files: ~15-25 KB each")
print("  Reduction: ~99%")
