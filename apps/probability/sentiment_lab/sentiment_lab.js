// Sentiment Analysis Lab JS

const TOOL_SLUG = 'sentiment-lab';
const SENTIMENT_LAB_CREATED_DATE = '2025-11-25';
let sentimentLabModifiedDate = new Date().toLocaleDateString();

// ========================================
// SCENARIO DEFINITIONS (Inline)
// ========================================
const SENTIMENT_LAB_SCENARIOS = [
  {
    id: 'enrollment-reddit',
    label: 'Reddit posts about an online enrollment system',
    description: () => `<h4>Reddit Posts About an Online Enrollment System</h4><p>Simulated Reddit-style posts reacting to a <strong>new online course enrollment system</strong> at a Southern California university. Some students are impressed by the speed and clarity of the new interface; others are frustrated by bugs, timeouts, and confusing waitlist rules.</p><p><strong>Dataset details:</strong></p><ul><li><strong>Records:</strong> 30 Reddit-style posts</li><li><strong>Text column:</strong> <code>post</code></li><li><strong>No grouping column</strong></li></ul><p><strong>Your task:</strong> Imagine you are summarizing overall sentiment for stakeholders deciding whether the enrollment system rollout was a success or needs urgent fixes. Look for the balance of positive vs. negative feedback and identify specific pain points mentioned in negative posts.</p>`,
    dataset: 'scenarios/enrollment_reddit_posts.csv',
    textColumn: 'text'
  },
  {
    id: 'influencer-swimwear',
    label: 'Influencer swimwear brand: detailed guest reviews',
    description: () => `<h4>Influencer Swimwear Brand: Customer Reviews</h4><p>Long-form, simulated reviews of a <strong>new swimwear brand</strong> launched by a popular online influencer. Overall sentiment is strongly positive about the look, colors, and design, but many reviews also raise nuanced concerns about fit and sizing for different body types.</p><p><strong>Dataset details:</strong></p><ul><li><strong>Records:</strong> 25 detailed customer reviews</li><li><strong>Text column:</strong> <code>review</code></li><li><strong>No grouping column</strong></li></ul><p><strong>Your task:</strong> Explore how sentiment can be <em>positive in aggregate</em> while still surfacing specific, actionable pain points. Prepare a summary for the influencer's team highlighting both strong brand love and recurring feedback about comfort and sizing consistency.</p><p><strong>Key themes to look for:</strong> design aesthetics, color options, fit/sizing issues, fabric quality, value for price.</p>`,
    dataset: 'scenarios/influencer_swimwear_reviews.csv',
    textColumn: 'text'
  },
  {
    id: 'waterbottle-competitors',
    label: 'Water bottle brands: competitor sentiment analysis (grouped)',
    description: () => `<h4>Water Bottle Brand Competitor Analysis</h4><p>A consumer packaged goods company is launching a <strong>new premium reusable water bottle</strong> and wants to understand the competitive landscape. They surveyed 100 current users of three leading competitor brands asking each to provide a detailed review of their experience.</p><p><strong>Dataset details:</strong></p><ul><li><strong>Records:</strong> 100 customer reviews</li><li><strong>Text column:</strong> <code>review</code></li><li><strong>Grouping column:</strong> <code>brand</code> (HydroFlask, Yeti, Stanley)</li></ul><p><strong>Brands compared:</strong></p><ul><li><strong>HydroFlask</strong> — Known for colorful designs and insulation</li><li><strong>Yeti</strong> — Premium pricing, rugged durability positioning</li><li><strong>Stanley</strong> — Classic brand with recent social media resurgence</li></ul><p><strong>Your task:</strong> Practice <em>grouped sentiment analysis</em> by enabling the grouping feature with the <code>brand</code> column. Identify which competitor has the strongest positive perception, which has the most concerns, and what themes drive sentiment for each brand.</p><p><strong>Key themes to look for:</strong> insulation performance, build quality, price-value perception, design aesthetics, customer service.</p>`,
    dataset: 'scenarios/waterbottle_competitors.csv',
    textColumn: 'review',
    groupColumn: 'brand'
  }
];

// Sentiment data
let sentimentRows = [];

// Grouping state
let groupingEnabled = false;
let groupColumn = '';
let idColumn = '';
let uniqueGroups = [];

// Scenario state
let activeScenarioDataset = null;
let activeScenarioConfig = null; // Store scenario-specific column mappings

// Chart view state
let histogramViewMode = 'overall'; // 'overall' or 'by-group'
let boxplotViewMode = 'overall'; // 'overall' or 'by-group'
let lastStats = null; // Store stats for re-rendering charts

// Removed hardcoded SentimentScenarios array - now loads from scenarios/scenario-index.json

function classifyCompound(compound) {
  if (compound >= 0.05) return 'positive';
  if (compound <= -0.05) return 'negative';
  return 'neutral';
}

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return { values: result, unclosedQuote: inQuotes };
}

function parseDelimitedText(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [], errors: [] };
  
  const errors = [];
  
  // Check if it's TSV or CSV
  const isTab = lines[0].indexOf('\t') !== -1 && lines[0].indexOf(',') === -1;
  
  if (isTab) {
    const headers = lines[0].split('\t').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t').map(c => c.trim());
      if (cols.length !== headers.length) {
        errors.push({
          line: i + 1,
          issue: `Expected ${headers.length} columns but found ${cols.length}`,
          preview: lines[i].substring(0, 80) + (lines[i].length > 80 ? '...' : '')
        });
      }
      rows.push(cols);
    }
    return { headers, rows, errors };
  }
  
  // CSV with potential quoted fields
  const headerResult = parseCSVLine(lines[0]);
  const headers = headerResult.values;
  
  if (headerResult.unclosedQuote) {
    errors.push({
      line: 1,
      issue: 'Header row has an unclosed quote',
      preview: lines[0].substring(0, 80) + (lines[0].length > 80 ? '...' : '')
    });
  }
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const lineResult = parseCSVLine(lines[i]);
    
    if (lineResult.unclosedQuote) {
      errors.push({
        line: i + 1,
        issue: 'Unclosed quote (text contains unescaped quotes or line breaks)',
        preview: lines[i].substring(0, 80) + (lines[i].length > 80 ? '...' : '')
      });
    }
    
    if (lineResult.values.length !== headers.length && !lineResult.unclosedQuote) {
      errors.push({
        line: i + 1,
        issue: `Expected ${headers.length} columns but found ${lineResult.values.length}`,
        preview: lines[i].substring(0, 80) + (lines[i].length > 80 ? '...' : '')
      });
    }
    
    rows.push(lineResult.values);
  }
  
  return { headers, rows, errors };
}

function showUploadErrors(errors, fileName) {
  const errorContainer = document.getElementById('upload-error-details');
  if (!errorContainer) return;
  
  if (!errors || errors.length === 0) {
    errorContainer.classList.add('hidden');
    errorContainer.innerHTML = '';
    return;
  }
  
  // Show only first few errors to avoid overwhelming the user
  const maxErrors = 5;
  const displayErrors = errors.slice(0, maxErrors);
  const moreCount = errors.length - maxErrors;
  
  let html = `<h4>⚠️ CSV Parsing Issues Detected</h4>`;
  html += `<p>Found ${errors.length} potential issue${errors.length > 1 ? 's' : ''} in <strong>${fileName}</strong>:</p>`;
  html += '<ul>';
  
  displayErrors.forEach(err => {
    html += `<li><strong>Line ${err.line}:</strong> ${err.issue}`;
    if (err.preview) {
      html += `<br><code>${escapeHtml(err.preview)}</code>`;
    }
    html += '</li>';
  });
  
  if (moreCount > 0) {
    html += `<li><em>...and ${moreCount} more issue${moreCount > 1 ? 's' : ''}</em></li>`;
  }
  
  html += '</ul>';
  html += '<p style="margin-top:0.5rem;"><strong>Common fixes:</strong></p>';
  html += '<ul>';
  html += '<li>Ensure all quotes in text are <em>escaped</em> by doubling them: <code>"She said ""hello"""</code></li>';
  html += '<li>Text containing commas must be wrapped in quotes: <code>"Hello, world"</code></li>';
  html += '<li>Multi-line text should be in quotes and not split across CSV rows</li>';
  html += '<li>Check for stray quotation marks in text columns</li>';
  html += '<li>Try opening in Excel/Google Sheets and re-exporting as CSV</li>';
  html += '</ul>';
  
  errorContainer.innerHTML = html;
  errorContainer.classList.remove('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function clearUploadErrors() {
  const errorContainer = document.getElementById('upload-error-details');
  if (errorContainer) {
    errorContainer.classList.add('hidden');
    errorContainer.innerHTML = '';
  }
}

function setStatusMessage(message, type = 'neutral') {
  const status = document.getElementById('sentiment-status');
  if (!status) return;
  
  status.textContent = message;
  status.classList.remove('status-success', 'status-error');
  
  if (type === 'success') {
    status.classList.add('status-success');
  } else if (type === 'error') {
    status.classList.add('status-error');
  }
}

function getTextData() {
  const manual = document.getElementById('manual-textarea');
  if (manual && manual.value.trim()) {
    const lines = manual.value
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    return {
      mode: 'manual',
      rows: lines.map((text, i) => ({ index: i + 1, text, group: null, id: i + 1 }))
    };
  }

  if (!window._sentimentFileData) {
    return { mode: 'none', rows: [] };
  }

  const { headers, rows } = window._sentimentFileData;
  const select = document.getElementById('text-column-select');
  const colName = select ? select.value : '';
  const colIndex = headers.indexOf(colName);
  if (colIndex === -1) {
    return { mode: 'file', rows: [] };
  }
  
  // Get grouping column if enabled
  const useGrouping = document.getElementById('use-grouping-checkbox');
  const groupSelect = document.getElementById('group-column-select');
  const groupColName = (useGrouping && useGrouping.checked && groupSelect) ? groupSelect.value : '';
  const groupColIndex = groupColName ? headers.indexOf(groupColName) : -1;
  
  // Get ID column if selected
  const idSelect = document.getElementById('id-column-select');
  const idColName = idSelect ? idSelect.value : '';
  const idColIndex = idColName ? headers.indexOf(idColName) : -1;

  const mapped = rows
    .map((cols, i) => {
      const text = cols[colIndex] != null ? String(cols[colIndex]).trim() : '';
      const group = groupColIndex !== -1 && cols[groupColIndex] != null ? String(cols[groupColIndex]).trim() : null;
      const id = idColIndex !== -1 && cols[idColIndex] != null ? String(cols[idColIndex]).trim() : String(i + 1);
      return { index: i + 1, text, group, id };
    })
    .filter(r => r.text.length > 0);

  // Update global grouping state
  groupingEnabled = groupColIndex !== -1;
  groupColumn = groupColName;
  idColumn = idColName;
  
  // Extract unique groups
  if (groupingEnabled) {
    const groupSet = new Set(mapped.map(r => r.group).filter(Boolean));
    uniqueGroups = Array.from(groupSet).sort();
  } else {
    uniqueGroups = [];
  }

  return { mode: 'file', rows: mapped };
}

function runSentimentAnalysis() {
  setStatusMessage('');
  
  // Track run attempted
  if (typeof markRunAttempted === 'function') {
    markRunAttempted(TOOL_SLUG);
  }

  const data = getTextData();
  if (!data.rows.length) {
    setStatusMessage('Provide text via file upload or pasted lines before running the analysis.', 'error');
    return;
  }

  if (!window.VaderAnalyzer || typeof window.VaderAnalyzer.polarityScores !== 'function') {
    setStatusMessage('Sentiment analyzer is not available. Please ensure vader_analyzer.js is loaded.', 'error');
    return;
  }

  try {
    sentimentRows = data.rows.map(row => {
      const scores = window.VaderAnalyzer.polarityScores(row.text);
      const label = classifyCompound(scores.compound);
      return { 
        index: row.index, 
        text: row.text, 
        scores, 
        label,
        group: row.group || null,
        id: row.id || row.index
      };
    });

    renderSentimentSummary();
    updateDownloadButton();
    renderSentimentLabelChart();
    renderSentimentExampleTwo();
    renderAnalysisReport();
    updateChartToggleVisibility();

    // Calculate summary statistics for tracking
    let sumCompound = 0;
    let posCount = 0;
    let neuCount = 0;
    let negCount = 0;
    sentimentRows.forEach(row => {
      sumCompound += row.scores.compound;
      if (row.label === 'positive') posCount++;
      else if (row.label === 'neutral') neuCount++;
      else if (row.label === 'negative') negCount++;
    });
    
    // Track successful run
    if (typeof markRunSuccessful === 'function') {
      markRunSuccessful(TOOL_SLUG, {
        recordCount: sentimentRows.length,
        avgCompound: (sumCompound / sentimentRows.length).toFixed(4),
        positiveCount: posCount,
        neutralCount: neuCount,
        negativeCount: negCount,
        groupingEnabled: groupingEnabled,
        numGroups: groupingEnabled ? uniqueGroups.length : 0
      });
    }

    const groupNote = groupingEnabled ? ` across ${uniqueGroups.length} groups` : '';
    setStatusMessage(`✓ Analyzed ${sentimentRows.length} text record(s)${groupNote}.`, 'success');
  } catch (err) {
    console.error('Sentiment analysis error:', err);
    setStatusMessage(`Analysis failed: ${err.message || 'Unknown error occurred.'}`, 'error');
  }
}

function renderSentimentSummary() {
  const avgEl = document.getElementById('sentiment-avg-compound');
  const posEl = document.getElementById('sentiment-count-positive');
  const neuEl = document.getElementById('sentiment-count-neutral');
  const negEl = document.getElementById('sentiment-count-negative');
  const note = document.getElementById('sentiment-summary-note');

  if (!sentimentRows.length) {
    if (avgEl) avgEl.textContent = '–';
    if (posEl) posEl.textContent = '–';
    if (neuEl) neuEl.textContent = '–';
    if (negEl) negEl.textContent = '–';
    if (note) note.textContent = 'Run the analysis to see overall sentiment across your text records.';
    return;
  }

  let sumCompound = 0;
  let posCount = 0;
  let neuCount = 0;
  let negCount = 0;

  sentimentRows.forEach(row => {
    sumCompound += row.scores.compound;
    if (row.label === 'positive') posCount += 1;
    else if (row.label === 'neutral') neuCount += 1;
    else if (row.label === 'negative') negCount += 1;
  });

  const n = sentimentRows.length;

  if (avgEl) avgEl.textContent = (sumCompound / n).toFixed(4);
  if (posEl) posEl.textContent = `${posCount} (${((posCount / n) * 100).toFixed(1)}%)`;
  if (neuEl) neuEl.textContent = `${neuCount} (${((neuCount / n) * 100).toFixed(1)}%)`;
  if (negEl) negEl.textContent = `${negCount} (${((negCount / n) * 100).toFixed(1)}%)`;
  if (note) {
    note.textContent = `Sentiment labels use standard VADER-style thresholds on the compound score (positive ≥ 0.05, negative ≤ -0.05, and neutral in between).`;
  }
}

function updateDownloadButton() {
  const btn = document.getElementById('download-results-btn');
  const status = document.getElementById('download-results-status');
  
  if (btn) {
    btn.disabled = !sentimentRows.length;
  }
  if (status) {
    if (sentimentRows.length) {
      const groupNote = groupingEnabled ? ` across ${uniqueGroups.length} groups` : '';
      status.textContent = `${sentimentRows.length} records ready for export${groupNote}.`;
    } else {
      status.textContent = '';
    }
  }
}

function downloadResultsCSV() {
  if (!sentimentRows.length) return;
  
  // Build CSV header
  const headers = ['Record'];
  if (groupingEnabled) {
    headers.push('Group');
  }
  headers.push('compound', 'pos', 'neu', 'neg', 'label');
  
  // Build CSV rows
  const csvRows = [headers.join(',')];
  
  sentimentRows.forEach((row, idx) => {
    const values = [row.id || (idx + 1)];
    if (groupingEnabled) {
      // Escape group value if it contains commas or quotes
      const groupVal = row.group || '';
      values.push(groupVal.includes(',') || groupVal.includes('"') 
        ? `"${groupVal.replace(/"/g, '""')}"` 
        : groupVal);
    }
    values.push(
      row.scores.compound.toFixed(4),
      row.scores.pos.toFixed(4),
      row.scores.neu.toFixed(4),
      row.scores.neg.toFixed(4),
      row.label
    );
    csvRows.push(values.join(','));
  });
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sentiment_results.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderSentimentLabelChart() {
  const container = document.getElementById('sentiment-label-chart');
  if (!container || typeof Plotly === 'undefined') return;

  if (!sentimentRows.length) {
    Plotly.purge(container);
    return;
  }

  let posCount = 0;
  let neuCount = 0;
  let negCount = 0;

  sentimentRows.forEach(row => {
    if (row.label === 'positive') posCount += 1;
    else if (row.label === 'neutral') neuCount += 1;
    else if (row.label === 'negative') negCount += 1;
  });

  const x = ['Positive', 'Neutral', 'Negative'];
  const y = [posCount, neuCount, negCount];

  const trace = {
    x,
    y,
    type: 'bar',
    marker: { color: ['#16a34a', '#6b7280', '#dc2626'] }
  };

  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 20, r: 10, b: 40, l: 40 },
      xaxis: { title: 'Sentiment label' },
      yaxis: { title: 'Count', rangemode: 'tozero' }
    },
    { responsive: true }
  );
}

function renderSentimentExampleTwo() {
  const textPos = document.getElementById('sentiment-example-text-positive');
  const textNeg = document.getElementById('sentiment-example-text-negative');
  const linePos = document.getElementById('sentiment-example-line-positive');
  const lineNeg = document.getElementById('sentiment-example-line-negative');
  const summaryPos = document.getElementById('sentiment-example-summary-positive');
  const summaryNeg = document.getElementById('sentiment-example-summary-negative');

  if (!textPos || !textNeg || !linePos || !lineNeg || !summaryPos || !summaryNeg) return;

  linePos.innerHTML = '';
  lineNeg.innerHTML = '';
  summaryPos.textContent = '';
  summaryNeg.textContent = '';

  if (!sentimentRows.length || !window.VaderAnalyzer || typeof window.VaderAnalyzer.explain !== 'function') {
    textPos.textContent =
      'Run the analysis to see a token-by-token breakdown for a relatively positive record.';
    textNeg.textContent =
      'Run the analysis to see a token-by-token breakdown for a relatively negative record.';
    return;
  }

  const positives = sentimentRows.filter(r => r.scores.compound >= 0.05);
  const negatives = sentimentRows.filter(r => r.scores.compound <= -0.05);

  const pickRandom = rows => {
    if (!rows.length) return null;
    const idx = Math.floor(Math.random() * rows.length);
    return rows[idx];
  };

  let positiveRow = pickRandom(positives);
  let negativeRow = pickRandom(negatives);

  if (!positiveRow) {
    positiveRow = pickRandom(sentimentRows);
  }
  if (!negativeRow) {
    negativeRow = pickRandom(sentimentRows);
  }

  const fillExample = (row, textEl, lineEl, summaryEl, label) => {
    if (!row) {
      textEl.textContent = `No ${label} example could be identified from the current data.`;
      summaryEl.textContent = '';
      return;
    }

    const explanation = window.VaderAnalyzer.explain(row.text);
    textEl.textContent = `Example #${row.index}: "${row.text}"`;

    // Build an inline sequence: token | token | ...
    lineEl.innerHTML = '';

    const appendToken = (contentEl, isFirst) => {
      if (!isFirst) {
        lineEl.appendChild(document.createTextNode(' | '));
      }
      lineEl.appendChild(contentEl);
    };

    explanation.tokens.forEach((tokenInfo, idx) => {
      const span = document.createElement('span');
      let cls = 'sentiment-token-neutral';
      if (tokenInfo.finalValence > 0) cls = 'sentiment-token-positive';
      else if (tokenInfo.finalValence < 0) cls = 'sentiment-token-negative';
      span.className = cls;

      let text = tokenInfo.token;
      if (tokenInfo.finalValence !== 0) {
        const valStr = tokenInfo.finalValence.toFixed(2);
        const valDisplay = tokenInfo.finalValence > 0 ? `+${valStr}` : valStr;
        const modsText =
          tokenInfo.modifiers && tokenInfo.modifiers.length
            ? `; ${tokenInfo.modifiers.join(', ')}`
            : '';
        text += ` (val=${valDisplay}${modsText})`;
      }

      span.textContent = text;
      appendToken(span, idx === 0);
    });

    summaryEl.textContent =
      `Summed token valence after adjustments is ${explanation.sumValenceAmplified.toFixed(
        3
      )}, which normalizes to a compound score of ${explanation.compound.toFixed(4)}. ` +
      `Positive, neutral, and negative proportions are ${explanation.pos.toFixed(4)}, ` +
      `${explanation.neu.toFixed(4)}, and ${explanation.neg.toFixed(4)}, respectively.`;
  };

  fillExample(positiveRow, textPos, linePos, summaryPos, 'relatively positive');
  fillExample(negativeRow, textNeg, lineNeg, summaryNeg, 'relatively negative');
}
function renderSentimentExample() {
  const exampleTextEl = document.getElementById('sentiment-example-text');
  const exampleTableBody = document.querySelector('#sentiment-example-table tbody');
  const exampleSummaryEl = document.getElementById('sentiment-example-summary');

  if (!exampleTextEl || !exampleTableBody || !exampleSummaryEl) return;

  exampleTableBody.innerHTML = '';

  if (!sentimentRows.length || !window.VaderAnalyzer || typeof window.VaderAnalyzer.explain !== 'function') {
    exampleTextEl.textContent =
      'Run the analysis to see a token-by-token breakdown for one randomly chosen record.';
    exampleSummaryEl.textContent = '';
    return;
  }

  const idx = Math.floor(Math.random() * sentimentRows.length);
  const row = sentimentRows[idx];
  const explanation = window.VaderAnalyzer.explain(row.text);

  exampleTextEl.textContent = `Example #${row.index}: "${row.text}"`;

  explanation.tokens.forEach(tokenInfo => {
    const tr = document.createElement('tr');

    const tdToken = document.createElement('td');
    tdToken.textContent = tokenInfo.token;
    if (tokenInfo.finalValence > 0) tdToken.className = 'sentiment-token-positive';
    else if (tokenInfo.finalValence < 0) tdToken.className = 'sentiment-token-negative';
    tr.appendChild(tdToken);

    const tdBase = document.createElement('td');
    tdBase.textContent = tokenInfo.baseValence.toFixed(3);
    tr.appendChild(tdBase);

    const tdMods = document.createElement('td');
    tdMods.textContent =
      tokenInfo.modifiers && tokenInfo.modifiers.length ? tokenInfo.modifiers.join('; ') : '—';
    tr.appendChild(tdMods);

    const tdFinal = document.createElement('td');
    tdFinal.textContent = tokenInfo.finalValence.toFixed(3);
    tr.appendChild(tdFinal);

    exampleTableBody.appendChild(tr);
  });

  exampleSummaryEl.textContent =
    `Summed token valence after adjustments is ${explanation.sumValenceAmplified.toFixed(
      3
    )}, which normalizes to a compound score of ${explanation.compound.toFixed(4)}. ` +
    `Positive, neutral, and negative proportions are ${explanation.pos.toFixed(4)}, ` +
    `${explanation.neu.toFixed(4)}, and ${explanation.neg.toFixed(4)}, respectively.`;
}

// =====================================================================
// ANALYSIS REPORT - APA & MANAGERIAL REPORTING
// =====================================================================

function renderAnalysisReport() {
  if (!sentimentRows.length) {
    clearAnalysisReport();
    return;
  }

  const stats = computeSentimentStatistics();
  renderAPAReport(stats);
  renderManagerialReport(stats);
  renderGroupedSummaryTable(stats);
  renderSummaryTable(stats);
  renderDetailedMetrics(stats);
  renderDistributionCharts(stats);
}

function clearAnalysisReport() {
  const apa = document.getElementById('sentiment-apa-report');
  const mgr = document.getElementById('sentiment-managerial-report');
  if (apa) apa.textContent = 'Run the analysis to generate an APA-style report of your sentiment results.';
  if (mgr) mgr.textContent = 'Run the analysis to generate a managerial interpretation of your sentiment results.';
  
  const tbody = document.getElementById('sentiment-summary-table-body');
  if (tbody) tbody.innerHTML = '';
  
  // Clear grouped summary
  const groupedSection = document.getElementById('grouped-summary-section');
  if (groupedSection) groupedSection.classList.add('hidden');
  
  // Clear metrics
  const metricIds = ['metric-total-records', 'metric-polarity-index', 'metric-nps-style', 
                     'metric-subjectivity', 'metric-avg-pos', 'metric-avg-neg', 
                     'metric-avg-neu', 'metric-compound-std'];
  metricIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '–';
  });
  
  // Clear charts
  const histChart = document.getElementById('sentiment-histogram-chart');
  const boxChart = document.getElementById('sentiment-boxplot-chart');
  if (histChart && typeof Plotly !== 'undefined') Plotly.purge(histChart);
  if (boxChart && typeof Plotly !== 'undefined') Plotly.purge(boxChart);
}

function computeGroupStats(rows) {
  if (!rows.length) return null;
  
  const n = rows.length;
  const compounds = rows.map(r => r.scores.compound);
  
  let posCount = 0, neuCount = 0, negCount = 0;
  rows.forEach(r => {
    if (r.label === 'positive') posCount++;
    else if (r.label === 'neutral') neuCount++;
    else if (r.label === 'negative') negCount++;
  });
  
  const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const stdDev = arr => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const sqDiff = arr.map(x => (x - m) ** 2);
    return Math.sqrt(sqDiff.reduce((a, b) => a + b, 0) / (arr.length - 1));
  };
  
  const avgCompound = mean(compounds);
  const stdCompound = stdDev(compounds);
  const avgPos = mean(rows.map(r => r.scores.pos));
  const avgNeg = mean(rows.map(r => r.scores.neg));
  const avgNeu = mean(rows.map(r => r.scores.neu));
  
  const pctPositive = (posCount / n) * 100;
  const pctNeutral = (neuCount / n) * 100;
  const pctNegative = (negCount / n) * 100;
  const npsStyle = pctPositive - pctNegative;
  
  return {
    n,
    posCount, neuCount, negCount,
    pctPositive, pctNeutral, pctNegative,
    avgCompound, stdCompound,
    avgPos, avgNeg, avgNeu,
    npsStyle
  };
}

function computeSentimentStatistics() {
  const n = sentimentRows.length;
  
  // Extract score arrays
  const compounds = sentimentRows.map(r => r.scores.compound);
  const positives = sentimentRows.map(r => r.scores.pos);
  const negatives = sentimentRows.map(r => r.scores.neg);
  const neutrals = sentimentRows.map(r => r.scores.neu);
  
  // Count labels
  let posCount = 0, neuCount = 0, negCount = 0;
  sentimentRows.forEach(r => {
    if (r.label === 'positive') posCount++;
    else if (r.label === 'neutral') neuCount++;
    else if (r.label === 'negative') negCount++;
  });
  
  // Helper functions
  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = arr => {
    const m = mean(arr);
    const sqDiff = arr.map(x => (x - m) ** 2);
    return Math.sqrt(sqDiff.reduce((a, b) => a + b, 0) / (arr.length - 1));
  };
  const min = arr => Math.min(...arr);
  const max = arr => Math.max(...arr);
  const median = arr => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const percentile = (arr, p) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
  };
  
  // Compute statistics
  const avgCompound = mean(compounds);
  const stdCompound = n > 1 ? stdDev(compounds) : 0;
  const minCompound = min(compounds);
  const maxCompound = max(compounds);
  const medianCompound = median(compounds);
  const q1Compound = percentile(compounds, 25);
  const q3Compound = percentile(compounds, 75);
  const iqrCompound = q3Compound - q1Compound;
  
  const avgPos = mean(positives);
  const stdPos = n > 1 ? stdDev(positives) : 0;
  const avgNeg = mean(negatives);
  const stdNeg = n > 1 ? stdDev(negatives) : 0;
  const avgNeu = mean(neutrals);
  const stdNeu = n > 1 ? stdDev(neutrals) : 0;
  
  // Derived metrics
  const pctPositive = (posCount / n) * 100;
  const pctNeutral = (neuCount / n) * 100;
  const pctNegative = (negCount / n) * 100;
  const npsStyle = pctPositive - pctNegative; // Net Promoter-style score
  const subjectivityRatio = ((posCount + negCount) / n) * 100; // % non-neutral
  const polarityIndex = avgCompound; // Already in -1 to +1 range
  
  // Standard error of the mean for compound
  const semCompound = stdCompound / Math.sqrt(n);
  
  // 95% CI for mean compound
  const tCrit = n > 30 ? 1.96 : getTCritical(n - 1, 0.05);
  const ciLower = avgCompound - tCrit * semCompound;
  const ciUpper = avgCompound + tCrit * semCompound;
  
  // Compute group-level statistics if grouping is enabled
  let groupStats = {};
  if (groupingEnabled && uniqueGroups.length > 0) {
    uniqueGroups.forEach(group => {
      const groupRows = sentimentRows.filter(r => r.group === group);
      groupStats[group] = computeGroupStats(groupRows);
    });
  }
  
  return {
    n,
    posCount, neuCount, negCount,
    pctPositive, pctNeutral, pctNegative,
    avgCompound, stdCompound, semCompound, minCompound, maxCompound,
    medianCompound, q1Compound, q3Compound, iqrCompound,
    ciLower, ciUpper,
    avgPos, stdPos, avgNeg, stdNeg, avgNeu, stdNeu,
    npsStyle, subjectivityRatio, polarityIndex,
    compounds, // for charts
    groupStats // group-level stats
  };
}

function getTCritical(df, alpha) {
  // Approximate t-critical values for common df ranges
  if (df >= 120) return 1.98;
  if (df >= 60) return 2.00;
  if (df >= 30) return 2.04;
  if (df >= 20) return 2.09;
  if (df >= 15) return 2.13;
  if (df >= 10) return 2.23;
  if (df >= 5) return 2.57;
  return 2.78;
}

function renderAPAReport(stats) {
  const apa = document.getElementById('sentiment-apa-report');
  if (!apa) return;
  
  const n = stats.n;
  const avgText = stats.avgCompound.toFixed(3);
  const sdText = stats.stdCompound.toFixed(3);
  const ciText = `95% CI [${stats.ciLower.toFixed(3)}, ${stats.ciUpper.toFixed(3)}]`;
  
  // Determine overall sentiment direction
  let directionText = 'neutral';
  if (stats.avgCompound >= 0.05) directionText = 'positive';
  else if (stats.avgCompound <= -0.05) directionText = 'negative';
  
  // Effect size interpretation (treating avg compound as standardized effect)
  let effectMagnitude = 'negligible';
  const absAvg = Math.abs(stats.avgCompound);
  if (absAvg >= 0.5) effectMagnitude = 'large';
  else if (absAvg >= 0.3) effectMagnitude = 'moderate';
  else if (absAvg >= 0.1) effectMagnitude = 'small';
  
  let apaText = [
    `A VADER-based sentiment analysis was conducted on N = ${n} text records.`,
    `The mean compound sentiment score was M = ${avgText}, SD = ${sdText}, ${ciText}.`,
    `Overall sentiment valence was ${directionText}, with a ${effectMagnitude} average effect magnitude.`,
    `Categorical classification yielded ${stats.posCount} positive (${stats.pctPositive.toFixed(1)}%), ` +
    `${stats.neuCount} neutral (${stats.pctNeutral.toFixed(1)}%), and ${stats.negCount} negative (${stats.pctNegative.toFixed(1)}%) records.`,
    `The median compound score was Mdn = ${stats.medianCompound.toFixed(3)}, IQR = ${stats.iqrCompound.toFixed(3)}.`
  ].join(' ');
  
  // Add subgroup analysis if grouping is enabled
  const hasGroupStats = groupingEnabled && uniqueGroups.length > 0 && stats.groupStats && Object.keys(stats.groupStats).length > 0;
  
  if (hasGroupStats) {
    const groupSummaries = uniqueGroups.map(group => {
      const gs = stats.groupStats[group];
      if (!gs) return null;
      return { group, n: gs.n, avg: gs.avgCompound, sd: gs.stdCompound };
    }).filter(Boolean);
    
    if (groupSummaries.length > 1) {
      // Sort by mean compound (descending)
      groupSummaries.sort((a, b) => b.avg - a.avg);
      
      // Calculate effect size (Cohen's d) between best and worst groups
      const best = groupSummaries[0];
      const worst = groupSummaries[groupSummaries.length - 1];
      const pooledSD = Math.sqrt(((best.n - 1) * best.sd ** 2 + (worst.n - 1) * worst.sd ** 2) / (best.n + worst.n - 2));
      const cohensD = pooledSD > 0 ? (best.avg - worst.avg) / pooledSD : 0;
      
      let effectSizeLabel = 'negligible';
      if (Math.abs(cohensD) >= 0.8) effectSizeLabel = 'large';
      else if (Math.abs(cohensD) >= 0.5) effectSizeLabel = 'medium';
      else if (Math.abs(cohensD) >= 0.2) effectSizeLabel = 'small';
      
      const groupLabel = groupColumn || 'group';
      
      apaText += ` Subgroup analysis by ${groupLabel} revealed variation across ${groupSummaries.length} groups: `;
      apaText += groupSummaries.map(g => `${g.group} (n = ${g.n}, M = ${g.avg.toFixed(3)}, SD = ${g.sd.toFixed(3)})`).join('; ') + '.';
      apaText += ` The difference between the highest-scoring group (${best.group}) and lowest-scoring group (${worst.group}) ` +
                 `corresponded to a ${effectSizeLabel} effect size (Cohen's d = ${cohensD.toFixed(2)}).`;
    } else if (groupSummaries.length === 1) {
      const g = groupSummaries[0];
      const groupLabel = groupColumn || 'group';
      apaText += ` All records belonged to a single ${groupLabel} ("${g.group}", n = ${g.n}).`;
    }
  }
  
  apa.textContent = apaText;
}

function renderManagerialReport(stats) {
  const mgr = document.getElementById('sentiment-managerial-report');
  if (!mgr) return;
  
  // Determine predominant sentiment
  let dominant = 'neutral';
  let dominantPct = stats.pctNeutral;
  if (stats.pctPositive > stats.pctNeutral && stats.pctPositive > stats.pctNegative) {
    dominant = 'positive';
    dominantPct = stats.pctPositive;
  } else if (stats.pctNegative > stats.pctNeutral && stats.pctNegative > stats.pctPositive) {
    dominant = 'negative';
    dominantPct = stats.pctNegative;
  }
  
  // NPS-style interpretation
  let npsInterpretation;
  if (stats.npsStyle >= 50) npsInterpretation = 'excellent';
  else if (stats.npsStyle >= 20) npsInterpretation = 'good';
  else if (stats.npsStyle >= 0) npsInterpretation = 'moderate';
  else if (stats.npsStyle >= -20) npsInterpretation = 'concerning';
  else npsInterpretation = 'poor';
  
  // Consistency interpretation
  let consistencyNote;
  if (stats.stdCompound < 0.3) {
    consistencyNote = 'Sentiment is relatively consistent across records, suggesting uniform perceptions.';
  } else if (stats.stdCompound < 0.5) {
    consistencyNote = 'Moderate variation in sentiment suggests mixed experiences or opinions across the dataset.';
  } else {
    consistencyNote = 'High variability in sentiment indicates polarized opinions—some records are very positive while others are quite negative.';
  }
  
  // Actionability based on subjectivity
  let actionNote;
  if (stats.subjectivityRatio > 70) {
    actionNote = 'With most responses expressing clear sentiment (not neutral), this data provides strong directional signals for decision-making.';
  } else if (stats.subjectivityRatio > 40) {
    actionNote = 'A mix of neutral and opinionated records suggests some respondents have stronger views than others.';
  } else {
    actionNote = 'Most records are neutral, which may indicate factual content, lack of strong opinions, or topics that don\'t evoke emotional responses.';
  }
  
  let mgrText = [
    `Analyzing ${stats.n} text records, the predominant sentiment is ${dominant} (${dominantPct.toFixed(1)}% of records).`,
    `The Net Promoter-style sentiment score of ${stats.npsStyle.toFixed(1)} indicates ${npsInterpretation} overall sentiment.`,
    consistencyNote,
    actionNote,
    `Key takeaway: ${stats.avgCompound >= 0 ? 'On balance, sentiment leans positive' : 'On balance, sentiment leans negative'} ` +
    `(average compound = ${stats.avgCompound.toFixed(3)}). ` +
    `${stats.negCount > 0 ? `Review the ${stats.negCount} negative record${stats.negCount > 1 ? 's' : ''} for improvement opportunities.` : 'No clearly negative records were detected.'}`
  ].join(' ');
  
  // Add subgroup analysis if grouping is enabled
  const hasGroupStats = groupingEnabled && uniqueGroups.length > 0 && stats.groupStats && Object.keys(stats.groupStats).length > 0;
  
  if (hasGroupStats) {
    const groupSummaries = uniqueGroups.map(group => {
      const gs = stats.groupStats[group];
      if (!gs) return null;
      return { 
        group, 
        n: gs.n, 
        avg: gs.avgCompound, 
        nps: gs.npsStyle,
        pctPos: gs.pctPositive,
        pctNeg: gs.pctNegative
      };
    }).filter(Boolean);
    
    if (groupSummaries.length > 1) {
      // Sort by mean compound (descending)
      const sortedByAvg = [...groupSummaries].sort((a, b) => b.avg - a.avg);
      const best = sortedByAvg[0];
      const worst = sortedByAvg[sortedByAvg.length - 1];
      
      // Find most consistent (lowest std) and most polarized (highest std)
      const groupsWithStd = uniqueGroups.map(group => {
        const gs = stats.groupStats[group];
        return gs ? { group, std: gs.stdCompound } : null;
      }).filter(Boolean);
      
      const mostConsistent = groupsWithStd.reduce((a, b) => a.std < b.std ? a : b);
      const mostPolarized = groupsWithStd.reduce((a, b) => a.std > b.std ? a : b);
      
      // Calculate the gap
      const gap = best.avg - worst.avg;
      let gapInterpretation = '';
      if (gap >= 0.3) {
        gapInterpretation = 'This is a substantial gap that warrants investigation.';
      } else if (gap >= 0.15) {
        gapInterpretation = 'This is a meaningful difference worth monitoring.';
      } else {
        gapInterpretation = 'The groups are relatively similar in sentiment.';
      }
      
      // Use groupColumn if available, otherwise generic label
      const groupLabel = groupColumn || 'group';
      
      mgrText += ` SUBGROUP ANALYSIS: Breaking down by ${groupLabel}, "${best.group}" leads with the most positive sentiment ` +
                 `(avg = ${best.avg.toFixed(3)}, ${best.pctPos.toFixed(0)}% positive), ` +
                 `while "${worst.group}" trails with the lowest ` +
                 `(avg = ${worst.avg.toFixed(3)}, ${worst.pctNeg.toFixed(0)}% negative). ${gapInterpretation}`;
      
      // Add consistency insight if groups differ
      if (mostConsistent.group !== mostPolarized.group && mostPolarized.std - mostConsistent.std > 0.1) {
        mgrText += ` "${mostConsistent.group}" shows the most consistent sentiment, ` +
                   `while "${mostPolarized.group}" has the most mixed/polarized opinions.`;
      }
      
      // Recommendations based on worst group
      const worstGS = stats.groupStats[worst.group];
      if (worstGS && worstGS.pctNegative > 30) {
        mgrText += ` Recommendation: Focus improvement efforts on "${worst.group}" where ${worstGS.pctNegative.toFixed(0)}% of feedback is negative.`;
      } else if (worstGS && worstGS.avgCompound < 0) {
        mgrText += ` Recommendation: Investigate why "${worst.group}" generates below-neutral sentiment.`;
      }
    } else if (groupSummaries.length === 1) {
      // Single group case - just mention it
      const g = groupSummaries[0];
      const groupLabel = groupColumn || 'group';
      mgrText += ` Note: All ${g.n} records belong to a single ${groupLabel} ("${g.group}").`;
    }
  }
  
  mgr.textContent = mgrText;
}

function renderGroupedSummaryTable(stats) {
  const section = document.getElementById('grouped-summary-section');
  const thead = document.getElementById('grouped-summary-thead');
  const tbody = document.getElementById('grouped-summary-tbody');
  
  if (!section || !thead || !tbody) return;
  
  // Hide section if no grouping
  if (!groupingEnabled || !uniqueGroups.length || !stats.groupStats) {
    section.classList.add('hidden');
    return;
  }
  
  section.classList.remove('hidden');
  thead.innerHTML = '';
  tbody.innerHTML = '';
  
  // Build header row: Metric | Group1 | Group2 | ... | Overall
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th>Metric</th>';
  uniqueGroups.forEach(g => {
    const th = document.createElement('th');
    th.textContent = g;
    headerRow.appendChild(th);
  });
  const overallTh = document.createElement('th');
  overallTh.textContent = 'Overall';
  overallTh.style.backgroundColor = '#e2e8f0';
  headerRow.appendChild(overallTh);
  thead.appendChild(headerRow);
  
  // Define metrics to display
  const metrics = [
    { key: 'n', label: 'N (records)', format: v => v.toString(), higherBetter: null },
    { key: 'avgCompound', label: 'Avg Compound', format: v => v.toFixed(3), higherBetter: true },
    { key: 'stdCompound', label: 'Std Dev (Compound)', format: v => v.toFixed(3), higherBetter: null },
    { key: 'pctPositive', label: '% Positive', format: v => v.toFixed(1) + '%', higherBetter: true },
    { key: 'pctNeutral', label: '% Neutral', format: v => v.toFixed(1) + '%', higherBetter: null },
    { key: 'pctNegative', label: '% Negative', format: v => v.toFixed(1) + '%', higherBetter: false },
    { key: 'npsStyle', label: 'NPS-Style Score', format: v => (v >= 0 ? '+' : '') + v.toFixed(1), higherBetter: true },
    { key: 'avgPos', label: 'Avg Positive Score', format: v => v.toFixed(4), higherBetter: true },
    { key: 'avgNeg', label: 'Avg Negative Score', format: v => v.toFixed(4), higherBetter: false },
    { key: 'avgNeu', label: 'Avg Neutral Score', format: v => v.toFixed(4), higherBetter: null }
  ];
  
  metrics.forEach(metric => {
    const tr = document.createElement('tr');
    
    // Metric label
    const tdLabel = document.createElement('td');
    tdLabel.textContent = metric.label;
    tr.appendChild(tdLabel);
    
    // Collect values for comparison
    const groupValues = uniqueGroups.map(g => stats.groupStats[g] ? stats.groupStats[g][metric.key] : null);
    const validValues = groupValues.filter(v => v !== null && isFinite(v));
    
    let bestVal = null, worstVal = null;
    if (metric.higherBetter !== null && validValues.length > 1) {
      if (metric.higherBetter) {
        bestVal = Math.max(...validValues);
        worstVal = Math.min(...validValues);
      } else {
        bestVal = Math.min(...validValues);
        worstVal = Math.max(...validValues);
      }
    }
    
    // Group columns
    uniqueGroups.forEach((g, i) => {
      const td = document.createElement('td');
      const gStats = stats.groupStats[g];
      if (gStats && gStats[metric.key] !== undefined) {
        const val = gStats[metric.key];
        td.textContent = metric.format(val);
        
        // Highlight best/worst
        if (bestVal !== null && val === bestVal && bestVal !== worstVal) {
          td.classList.add('group-best');
        } else if (worstVal !== null && val === worstVal && bestVal !== worstVal) {
          td.classList.add('group-worst');
        }
      } else {
        td.textContent = '–';
      }
      tr.appendChild(td);
    });
    
    // Overall column
    const tdOverall = document.createElement('td');
    tdOverall.style.backgroundColor = '#f1f5f9';
    tdOverall.style.fontWeight = '600';
    if (stats[metric.key] !== undefined) {
      tdOverall.textContent = metric.format(stats[metric.key]);
    } else {
      tdOverall.textContent = '–';
    }
    tr.appendChild(tdOverall);
    
    tbody.appendChild(tr);
  });
}

function renderSummaryTable(stats) {
  const tbody = document.getElementById('sentiment-summary-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const rows = [
    { measure: 'Compound Score', est: stats.avgCompound, sd: stats.stdCompound, min: stats.minCompound, max: stats.maxCompound },
    { measure: 'Positive Proportion', est: stats.avgPos, sd: stats.stdPos, min: Math.min(...sentimentRows.map(r => r.scores.pos)), max: Math.max(...sentimentRows.map(r => r.scores.pos)) },
    { measure: 'Negative Proportion', est: stats.avgNeg, sd: stats.stdNeg, min: Math.min(...sentimentRows.map(r => r.scores.neg)), max: Math.max(...sentimentRows.map(r => r.scores.neg)) },
    { measure: 'Neutral Proportion', est: stats.avgNeu, sd: stats.stdNeu, min: Math.min(...sentimentRows.map(r => r.scores.neu)), max: Math.max(...sentimentRows.map(r => r.scores.neu)) }
  ];
  
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.measure}</td>
      <td>${row.est.toFixed(4)}</td>
      <td>${row.sd.toFixed(4)}</td>
      <td>${row.min.toFixed(4)}</td>
      <td>${row.max.toFixed(4)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDetailedMetrics(stats) {
  const setMetric = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  setMetric('metric-total-records', stats.n.toLocaleString());
  setMetric('metric-polarity-index', stats.polarityIndex.toFixed(3));
  setMetric('metric-nps-style', `${stats.npsStyle >= 0 ? '+' : ''}${stats.npsStyle.toFixed(1)}`);
  setMetric('metric-subjectivity', `${stats.subjectivityRatio.toFixed(1)}%`);
  setMetric('metric-avg-pos', stats.avgPos.toFixed(4));
  setMetric('metric-avg-neg', stats.avgNeg.toFixed(4));
  setMetric('metric-avg-neu', stats.avgNeu.toFixed(4));
  setMetric('metric-compound-std', stats.stdCompound.toFixed(4));
}

function renderDistributionCharts(stats) {
  lastStats = stats; // Store for re-rendering on toggle
  
  // Render histogram based on its view mode
  if (histogramViewMode === 'overall' || !groupingEnabled || !uniqueGroups.length) {
    renderHistogramChart(stats);
    renderHistogramInterpretation(stats, 'overall');
  } else {
    renderHistogramChartByGroup(stats);
    renderHistogramInterpretation(stats, 'by-group');
  }
  
  // Render boxplot based on its view mode
  if (boxplotViewMode === 'overall' || !groupingEnabled || !uniqueGroups.length) {
    renderBoxplotChart(stats);
    renderBoxplotInterpretation(stats, 'overall');
  } else {
    renderBoxplotChartByGroup(stats);
    renderBoxplotInterpretation(stats, 'by-group');
  }
}

function updateChartToggleVisibility() {
  const histogramToggle = document.getElementById('chart-view-toggle-histogram');
  const boxplotToggle = document.getElementById('chart-view-toggle-boxplot');
  
  const showToggle = groupingEnabled && uniqueGroups.length > 0;
  
  if (histogramToggle) {
    histogramToggle.classList.toggle('hidden', !showToggle);
    if (!showToggle) {
      histogramViewMode = 'overall';
      updateToggleButtons(histogramToggle, 'overall');
    }
  }
  
  if (boxplotToggle) {
    boxplotToggle.classList.toggle('hidden', !showToggle);
    if (!showToggle) {
      boxplotViewMode = 'overall';
      updateToggleButtons(boxplotToggle, 'overall');
    }
  }
}

function updateToggleButtons(container, activeView) {
  if (!container) return;
  const btns = container.querySelectorAll('.toggle-btn');
  btns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === activeView);
  });
}

function switchHistogramView(mode) {
  histogramViewMode = mode;
  updateToggleButtons(document.getElementById('chart-view-toggle-histogram'), mode);
  
  if (lastStats) {
    if (mode === 'overall' || !groupingEnabled) {
      renderHistogramChart(lastStats);
      renderHistogramInterpretation(lastStats, 'overall');
    } else {
      renderHistogramChartByGroup(lastStats);
      renderHistogramInterpretation(lastStats, 'by-group');
    }
  }
}

function switchBoxplotView(mode) {
  boxplotViewMode = mode;
  updateToggleButtons(document.getElementById('chart-view-toggle-boxplot'), mode);
  
  if (lastStats) {
    if (mode === 'overall' || !groupingEnabled) {
      renderBoxplotChart(lastStats);
      renderBoxplotInterpretation(lastStats, 'overall');
    } else {
      renderBoxplotChartByGroup(lastStats);
      renderBoxplotInterpretation(lastStats, 'by-group');
    }
  }
}

function renderHistogramInterpretation(stats, mode) {
  const container = document.getElementById('histogram-interpretation');
  if (!container) return;
  
  if (mode === 'overall') {
    // Overall interpretation
    const peakRegion = stats.avgCompound >= 0.05 ? 'positive' : (stats.avgCompound <= -0.05 ? 'negative' : 'neutral');
    const peakClass = peakRegion === 'positive' ? 'highlight-positive' : (peakRegion === 'negative' ? 'highlight-negative' : 'highlight-neutral');
    
    // Determine skewness
    let skewNote = '';
    const skewness = stats.medianCompound - stats.avgCompound;
    if (Math.abs(skewness) < 0.05) {
      skewNote = 'The distribution appears <strong>roughly symmetric</strong> around the center.';
    } else if (skewness > 0) {
      skewNote = 'The distribution is <strong>left-skewed</strong> (tail extends toward negative values), meaning a few very negative records pull the mean down.';
    } else {
      skewNote = 'The distribution is <strong>right-skewed</strong> (tail extends toward positive values), meaning a few very positive records pull the mean up.';
    }
    
    // Spread interpretation
    let spreadNote = '';
    if (stats.stdCompound < 0.25) {
      spreadNote = 'The tight clustering (SD = <span class="stat-value">' + stats.stdCompound.toFixed(3) + '</span>) indicates <strong>consistent sentiment</strong> across records.';
    } else if (stats.stdCompound < 0.45) {
      spreadNote = 'The moderate spread (SD = <span class="stat-value">' + stats.stdCompound.toFixed(3) + '</span>) suggests <strong>varied opinions</strong> in your dataset.';
    } else {
      spreadNote = 'The wide spread (SD = <span class="stat-value">' + stats.stdCompound.toFixed(3) + '</span>) indicates <strong>highly polarized sentiment</strong>—some records are very positive while others are very negative.';
    }
    
    container.innerHTML = `
      <p><strong>How to read this histogram:</strong> Each bar shows how many records fall within a compound score range. 
      The dashed blue line marks the mean (<span class="stat-value">${stats.avgCompound.toFixed(3)}</span>). 
      Bars are colored by sentiment: <span class="highlight-positive">green = positive</span>, 
      <span class="highlight-neutral">gray = neutral</span>, <span class="highlight-negative">red = negative</span>.</p>
      <p><strong>Your data:</strong> The bulk of records cluster in the <span class="${peakClass}">${peakRegion}</span> region. 
      ${skewNote}</p>
      <p>${spreadNote}</p>
    `;
  } else {
    // By-group interpretation using KDE
    const groupSummaries = uniqueGroups.map(group => {
      const gs = stats.groupStats[group];
      return { group, avg: gs.avgCompound, n: gs.n };
    });
    
    const bestGroup = groupSummaries.reduce((a, b) => a.avg > b.avg ? a : b);
    const worstGroup = groupSummaries.reduce((a, b) => a.avg < b.avg ? a : b);
    
    // Check for overlap
    const ranges = groupSummaries.map(g => {
      const gs = stats.groupStats[g.group];
      return { group: g.group, low: gs.avgCompound - gs.stdCompound, high: gs.avgCompound + gs.stdCompound };
    });
    
    let overlapNote = '';
    if (ranges.length > 1) {
      const allOverlap = ranges.every((r, i) => 
        ranges.some((r2, j) => i !== j && r.low < r2.high && r.high > r2.low)
      );
      if (allOverlap) {
        overlapNote = 'The curves overlap substantially, suggesting <strong>similar sentiment patterns</strong> across groups despite mean differences.';
      } else {
        overlapNote = 'The curves show <strong>distinct separation</strong>, indicating meaningfully different sentiment patterns between groups.';
      }
    }
    
    container.innerHTML = `
      <p><strong>How to read this chart:</strong> Each colored curve (KDE = kernel density estimate) shows the distribution shape for one group. 
      Taller peaks indicate where most records concentrate; wider curves mean more variability.</p>
      <p><strong>Group comparison:</strong></p>
      <ul>
        ${groupSummaries.map(g => `<li><strong>${g.group}</strong>: Mean = <span class="stat-value">${g.avg.toFixed(3)}</span> (n=${g.n})</li>`).join('')}
      </ul>
      <p><strong>${bestGroup.group}</strong> shows the <span class="highlight-positive">most positive</span> sentiment 
      (mean = <span class="stat-value">${bestGroup.avg.toFixed(3)}</span>), while 
      <strong>${worstGroup.group}</strong> shows the <span class="highlight-negative">least positive</span> 
      (mean = <span class="stat-value">${worstGroup.avg.toFixed(3)}</span>). 
      ${overlapNote}</p>
    `;
  }
}

function renderBoxplotInterpretation(stats, mode) {
  const container = document.getElementById('boxplot-interpretation');
  if (!container) return;
  
  if (mode === 'overall') {
    // Count outliers (using 1.5*IQR rule)
    const lowerFence = stats.q1Compound - 1.5 * stats.iqrCompound;
    const upperFence = stats.q3Compound + 1.5 * stats.iqrCompound;
    const outliers = stats.compounds.filter(c => c < lowerFence || c > upperFence);
    const outlierCount = outliers.length;
    
    let outlierNote = '';
    if (outlierCount === 0) {
      outlierNote = 'No outliers were detected, suggesting a <strong>consistent dataset</strong> without extreme opinions.';
    } else {
      const outlierPct = ((outlierCount / stats.n) * 100).toFixed(1);
      const extremePos = outliers.filter(o => o > upperFence).length;
      const extremeNeg = outliers.filter(o => o < lowerFence).length;
      outlierNote = `<strong>${outlierCount} outlier${outlierCount > 1 ? 's' : ''}</strong> (${outlierPct}% of data) were detected`;
      if (extremePos > 0 && extremeNeg > 0) {
        outlierNote += `: ${extremePos} extremely positive and ${extremeNeg} extremely negative.`;
      } else if (extremePos > 0) {
        outlierNote += `, all on the <span class="highlight-positive">positive extreme</span>.`;
      } else {
        outlierNote += `, all on the <span class="highlight-negative">negative extreme</span>.`;
      }
    }
    
    // Median position interpretation
    let medianNote = '';
    if (stats.medianCompound >= 0.05) {
      medianNote = `The median (<span class="stat-value">${stats.medianCompound.toFixed(3)}</span>) sits in <span class="highlight-positive">positive territory</span>—more than half your records lean positive.`;
    } else if (stats.medianCompound <= -0.05) {
      medianNote = `The median (<span class="stat-value">${stats.medianCompound.toFixed(3)}</span>) sits in <span class="highlight-negative">negative territory</span>—more than half your records lean negative.`;
    } else {
      medianNote = `The median (<span class="stat-value">${stats.medianCompound.toFixed(3)}</span>) sits in the <span class="highlight-neutral">neutral zone</span>—the typical record is neither strongly positive nor negative.`;
    }
    
    container.innerHTML = `
      <p><strong>How to read this box plot:</strong> The box spans from Q1 (<span class="stat-value">${stats.q1Compound.toFixed(3)}</span>) 
      to Q3 (<span class="stat-value">${stats.q3Compound.toFixed(3)}</span>), capturing the middle 50% of records. 
      The line inside is the median. Whiskers extend to the most extreme non-outlier values; dots beyond are outliers.</p>
      <p><strong>Central tendency:</strong> ${medianNote}</p>
      <p><strong>Spread:</strong> The interquartile range (IQR) of <span class="stat-value">${stats.iqrCompound.toFixed(3)}</span> 
      means the middle 50% of records span ${(stats.iqrCompound * 100).toFixed(0)} percentage points of the sentiment scale. 
      ${stats.iqrCompound < 0.3 ? 'This is relatively <strong>tight</strong>.' : (stats.iqrCompound < 0.5 ? 'This shows <strong>moderate variability</strong>.' : 'This indicates <strong>wide variability</strong> in sentiment.')}</p>
      <p><strong>Outliers:</strong> ${outlierNote}</p>
    `;
  } else {
    // By-group interpretation
    const groupSummaries = uniqueGroups.map(group => {
      const gs = stats.groupStats[group];
      const groupRows = sentimentRows.filter(r => r.group === group);
      const compounds = groupRows.map(r => r.scores.compound);
      
      // Compute quartiles for each group
      const sorted = [...compounds].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const median = sorted[Math.floor(sorted.length / 2)];
      
      return { group, median, q1, q3, iqr, avg: gs.avgCompound, std: gs.stdCompound, n: gs.n };
    });
    
    // Find most/least variable
    const mostVariable = groupSummaries.reduce((a, b) => a.iqr > b.iqr ? a : b);
    const leastVariable = groupSummaries.reduce((a, b) => a.iqr < b.iqr ? a : b);
    
    // Find highest/lowest median
    const highestMedian = groupSummaries.reduce((a, b) => a.median > b.median ? a : b);
    const lowestMedian = groupSummaries.reduce((a, b) => a.median < b.median ? a : b);
    
    container.innerHTML = `
      <p><strong>How to read grouped box plots:</strong> Each box represents one group. Compare box positions (higher = more positive sentiment), 
      box heights (taller = more variability), and median lines (center of typical values).</p>
      <p><strong>Group summaries:</strong></p>
      <ul>
        ${groupSummaries.map(g => `<li><strong>${g.group}</strong>: Median = <span class="stat-value">${g.median.toFixed(3)}</span>, IQR = <span class="stat-value">${g.iqr.toFixed(3)}</span></li>`).join('')}
      </ul>
      <p><strong>Key findings:</strong> <strong>${highestMedian.group}</strong> has the <span class="highlight-positive">highest median sentiment</span> 
      (<span class="stat-value">${highestMedian.median.toFixed(3)}</span>), while <strong>${lowestMedian.group}</strong> has the 
      <span class="highlight-negative">lowest</span> (<span class="stat-value">${lowestMedian.median.toFixed(3)}</span>). 
      ${mostVariable.group === leastVariable.group ? '' : 
        `<strong>${mostVariable.group}</strong> shows the most variability (IQR = <span class="stat-value">${mostVariable.iqr.toFixed(3)}</span>), 
        suggesting more diverse opinions, while <strong>${leastVariable.group}</strong> is most consistent (IQR = <span class="stat-value">${leastVariable.iqr.toFixed(3)}</span>).`}</p>
    `;
  }
}

function renderHistogramChart(stats) {
  const container = document.getElementById('sentiment-histogram-chart');
  if (!container || typeof Plotly === 'undefined') return;
  
  const trace = {
    x: stats.compounds,
    type: 'histogram',
    nbinsx: 20,
    marker: {
      color: stats.compounds.map(c => {
        if (c >= 0.05) return '#16a34a';
        if (c <= -0.05) return '#dc2626';
        return '#6b7280';
      }),
      line: { color: '#fff', width: 1 }
    },
    opacity: 0.85
  };
  
  // Add mean line
  const meanLine = {
    type: 'scatter',
    x: [stats.avgCompound, stats.avgCompound],
    y: [0, stats.n * 0.3],
    mode: 'lines',
    name: `Mean = ${stats.avgCompound.toFixed(3)}`,
    line: { color: '#1e40af', width: 2, dash: 'dash' }
  };
  
  Plotly.newPlot(
    container,
    [trace, meanLine],
    {
      margin: { t: 30, r: 20, b: 50, l: 50 },
      xaxis: { 
        title: 'Compound Score',
        range: [-1.1, 1.1],
        zeroline: true,
        zerolinecolor: '#9ca3af',
        zerolinewidth: 1
      },
      yaxis: { title: 'Frequency', rangemode: 'tozero' },
      showlegend: true,
      legend: { x: 0.02, y: 0.98 },
      bargap: 0.05
    },
    { responsive: true }
  );
}

function renderHistogramChartByGroup(stats) {
  const container = document.getElementById('sentiment-histogram-chart');
  if (!container || typeof Plotly === 'undefined' || !groupingEnabled) return;
  
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  
  // Use KDE (kernel density estimate) curves instead of histograms for cleaner overlay
  const traces = uniqueGroups.map((group, i) => {
    const groupRows = sentimentRows.filter(r => r.group === group);
    const compounds = groupRows.map(r => r.scores.compound);
    
    // Compute KDE using Gaussian kernel
    const kde = computeKDE(compounds, 100, 0.08); // 100 points, bandwidth 0.08
    
    return {
      x: kde.x,
      y: kde.y,
      type: 'scatter',
      mode: 'lines',
      name: `${group} (n=${compounds.length})`,
      fill: 'tozeroy',
      fillcolor: hexToRgba(colors[i % colors.length], 0.2),
      line: { 
        color: colors[i % colors.length], 
        width: 2.5,
        shape: 'spline'
      }
    };
  });
  
  Plotly.newPlot(
    container,
    traces,
    {
      margin: { t: 30, r: 20, b: 50, l: 50 },
      xaxis: { 
        title: 'Compound Score',
        range: [-1.1, 1.1],
        zeroline: true,
        zerolinecolor: '#9ca3af',
        zerolinewidth: 1
      },
      yaxis: { title: 'Density', rangemode: 'tozero' },
      showlegend: true,
      legend: { x: 1, xanchor: 'right', y: 1 },
      hovermode: 'x unified'
    },
    { responsive: true }
  );
}

// Compute Kernel Density Estimate using Gaussian kernel
function computeKDE(data, numPoints, bandwidth) {
  if (!data.length) return { x: [], y: [] };
  
  const min = -1;
  const max = 1;
  const step = (max - min) / (numPoints - 1);
  
  const x = [];
  const y = [];
  
  for (let i = 0; i < numPoints; i++) {
    const xi = min + i * step;
    x.push(xi);
    
    // Gaussian kernel density at point xi
    let density = 0;
    for (const d of data) {
      const u = (xi - d) / bandwidth;
      density += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    }
    density /= (data.length * bandwidth);
    y.push(density);
  }
  
  return { x, y };
}

// Convert hex color to rgba with alpha
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderBoxplotChart(stats) {
  const container = document.getElementById('sentiment-boxplot-chart');
  if (!container || typeof Plotly === 'undefined') return;
  
  const trace = {
    y: stats.compounds,
    type: 'box',
    name: 'Compound',
    boxpoints: 'outliers',
    marker: { color: '#3b82f6' },
    line: { color: '#1e40af' },
    fillcolor: '#93c5fd'
  };
  
  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 30, r: 20, b: 40, l: 50 },
      yaxis: { 
        title: 'Compound Score',
        range: [-1.1, 1.1],
        zeroline: true,
        zerolinecolor: '#dc2626',
        zerolinewidth: 1
      },
      xaxis: { title: '' }
    },
    { responsive: true }
  );
}

function renderBoxplotChartByGroup(stats) {
  const container = document.getElementById('sentiment-boxplot-chart');
  if (!container || typeof Plotly === 'undefined' || !groupingEnabled) return;
  
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  
  const traces = uniqueGroups.map((group, i) => {
    const groupRows = sentimentRows.filter(r => r.group === group);
    const compounds = groupRows.map(r => r.scores.compound);
    
    return {
      y: compounds,
      type: 'box',
      name: group,
      boxpoints: 'outliers',
      marker: { color: colors[i % colors.length] },
      line: { color: colors[i % colors.length] }
    };
  });
  
  Plotly.newPlot(
    container,
    traces,
    {
      margin: { t: 30, r: 20, b: 40, l: 50 },
      yaxis: { 
        title: 'Compound Score',
        range: [-1.1, 1.1],
        zeroline: true,
        zerolinecolor: '#dc2626',
        zerolinewidth: 1
      },
      xaxis: { title: 'Group' },
      showlegend: false
    },
    { responsive: true }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const createdLabel = document.getElementById('created-date');
  const modifiedLabel = document.getElementById('modified-date');
  if (createdLabel) createdLabel.textContent = SENTIMENT_LAB_CREATED_DATE;
  if (modifiedLabel) modifiedLabel.textContent = sentimentLabModifiedDate;

  // Grouping checkbox handler
  const useGroupingCheckbox = document.getElementById('use-grouping-checkbox');
  const groupColumnSelect = document.getElementById('group-column-select');
  
  if (useGroupingCheckbox && groupColumnSelect) {
    useGroupingCheckbox.addEventListener('change', () => {
      groupColumnSelect.disabled = !useGroupingCheckbox.checked;
      if (!useGroupingCheckbox.checked) {
        groupColumnSelect.value = '';
      }
    });
  }

  function populateColumnSelects(headers) {
    const textSelect = document.getElementById('text-column-select');
    const groupSelect = document.getElementById('group-column-select');
    const idSelect = document.getElementById('id-column-select');
    
    // Populate text column select
    if (textSelect) {
      textSelect.innerHTML = '';
      if (!headers.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '(No headers found)';
        textSelect.appendChild(opt);
      } else {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Choose a text column';
        textSelect.appendChild(defaultOpt);
        headers.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          textSelect.appendChild(opt);
        });
      }
    }
    
    // Populate group column select
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">(Select a grouping column)</option>';
      headers.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        groupSelect.appendChild(opt);
      });
    }
    
    // Populate ID column select
    if (idSelect) {
      idSelect.innerHTML = '<option value="">(None - use row numbers)</option>';
      headers.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        idSelect.appendChild(opt);
      });
    }
  }

  const dropConfig = {
    dropzoneId: 'sentiment-dropzone',
    inputId: 'sentiment-file-input',
    browseId: 'sentiment-browse-btn',
    accept: '.csv,.tsv,.txt',
    onFile: file => {
      clearUploadErrors();
      setStatusMessage(`Loading ${file.name}...`);
      
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = reader.result != null ? String(reader.result) : '';
          const parsed = parseDelimitedText(text);
          window._sentimentFileData = parsed;

          // Reset scenario config when manually uploading
          activeScenarioConfig = null;
          
          populateColumnSelects(parsed.headers);
          
          // Track data uploaded
          if (typeof markDataUploaded === 'function') {
            markDataUploaded(TOOL_SLUG, {
              fileName: file.name,
              rowCount: parsed.rows.length,
              columnCount: parsed.headers.length,
              hasErrors: parsed.errors && parsed.errors.length > 0
            });
          }

          // Show any parsing errors
          if (parsed.errors && parsed.errors.length > 0) {
            showUploadErrors(parsed.errors, file.name);
            setStatusMessage(`Loaded ${parsed.rows.length} row(s) from ${file.name} with ${parsed.errors.length} warning(s). Review the issues below.`, 'error');
          } else {
            setStatusMessage(`Loaded ${parsed.rows.length} row(s) from ${file.name}. Choose a text column and click "Run sentiment analysis".`, 'success');
          }
        } catch (err) {
          console.error('File parsing error:', err);
          showUploadErrors([{
            line: 'N/A',
            issue: `Failed to parse file: ${err.message}`,
            preview: ''
          }], file.name);
          setStatusMessage(`Failed to parse ${file.name}. See error details below.`, 'error');
        }
      };
      reader.onerror = () => {
        setStatusMessage(`Error reading file: ${file.name}. Please try again.`, 'error');
      };
      reader.readAsText(file);
    }
  };

  if (window.UIUtils && typeof window.UIUtils.initDropzone === 'function') {
    window.UIUtils.initDropzone(dropConfig);
  }

  const runBtn = document.getElementById('run-sentiment-btn');
  if (runBtn) {
    runBtn.addEventListener('click', event => {
      event.preventDefault();
      runSentimentAnalysis();
    });
  }

  // Download results CSV button
  const downloadResultsBtn = document.getElementById('download-results-btn');
  if (downloadResultsBtn) {
    downloadResultsBtn.addEventListener('click', () => {
      downloadResultsCSV();
    });
  }

  // Chart view toggle buttons - Histogram
  const histogramToggle = document.getElementById('chart-view-toggle-histogram');
  if (histogramToggle) {
    histogramToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (btn && btn.dataset.view) {
        switchHistogramView(btn.dataset.view);
      }
    });
  }
  
  // Chart view toggle buttons - Boxplot
  const boxplotToggle = document.getElementById('chart-view-toggle-boxplot');
  if (boxplotToggle) {
    boxplotToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (btn && btn.dataset.view) {
        switchBoxplotView(btn.dataset.view);
      }
    });
  }

  // =====================================================================
  // CASE STUDY / SCENARIO LOADING
  // =====================================================================
  
  const scenarioSelect = document.getElementById('sentiment-scenario-select');
  const downloadBtn = document.getElementById('scenario-download');

  function populateScenarioSelect() {
    if (!scenarioSelect) return;
    scenarioSelect.innerHTML = '<option value="">-- Select a case study --</option>';
    SENTIMENT_LAB_SCENARIOS.forEach(entry => {
      const opt = document.createElement('option');
      opt.value = entry.id;
      opt.textContent = entry.label || entry.id;
      scenarioSelect.appendChild(opt);
    });
  }

  async function loadScenario(id) {
    const scenario = SENTIMENT_LAB_SCENARIOS.find(s => s.id === id);
    if (!scenario) return;

    // Store scenario config for later
    activeScenarioConfig = scenario;

    // Handle download button visibility
    if (downloadBtn) {
      activeScenarioDataset = scenario.dataset || null;
      downloadBtn.classList.toggle('hidden', !scenario.dataset);
      downloadBtn.disabled = !scenario.dataset;
    }

    // Load description
    const descEl = document.getElementById('sentiment-scenario-description');
    if (descEl) {
      const html = typeof scenario.description === 'function' ? scenario.description() : scenario.description;
      descEl.innerHTML = html;
    }

    // Load dataset CSV and parse properly
    const manual = document.getElementById('manual-textarea');
    const textSelect = document.getElementById('text-column-select');
    const groupSelect = document.getElementById('group-column-select');
    const idSelect = document.getElementById('id-column-select');
    const useGroupingCheckbox = document.getElementById('use-grouping-checkbox');
    
    // Clear any upload errors when loading a scenario
    clearUploadErrors();
    
    if (scenario.dataset) {
      try {
        const resp = await fetch(`scenarios/${scenario.dataset}`, { cache: 'no-cache' });
        if (resp.ok) {
          const csv = await resp.text();
          const parsed = parseDelimitedText(csv);
          window._sentimentFileData = parsed;
          
          // Clear manual textarea so file data is used
          if (manual) manual.value = '';
          
          // Populate column selects
          populateColumnSelects(parsed.headers);
          
          // Auto-select text column if specified in scenario
          if (scenario.textColumn && textSelect) {
            textSelect.value = scenario.textColumn;
          } else if (textSelect && parsed.headers.length > 0) {
            // Try to find a likely text column
            const textColGuess = parsed.headers.find(h => 
              /text|review|comment|content|post|message/i.test(h)
            );
            if (textColGuess) textSelect.value = textColGuess;
          }
          
          // Auto-configure grouping if specified in scenario
          if (scenario.groupColumn && useGroupingCheckbox && groupSelect) {
            useGroupingCheckbox.checked = true;
            groupSelect.disabled = false;
            groupSelect.value = scenario.groupColumn;
          } else if (useGroupingCheckbox) {
            useGroupingCheckbox.checked = false;
            if (groupSelect) groupSelect.disabled = true;
          }
          
          // Auto-select ID column if there's one that looks like an ID
          if (idSelect && parsed.headers.length > 0) {
            const idColGuess = parsed.headers.find(h => 
              /^id$|_id$|^row|^index|^num/i.test(h)
            );
            if (idColGuess) idSelect.value = idColGuess;
          }
          
          const groupNote = scenario.groupColumn ? ` (grouped by "${scenario.groupColumn}")` : '';
          setStatusMessage(`Loaded ${parsed.rows.length} records${groupNote}. Click "Run sentiment analysis" to analyze.`, 'success');
          
          // Track scenario loaded
          if (typeof markScenarioLoaded === 'function') {
            markScenarioLoaded(TOOL_SLUG, scenario.id, scenario.label || scenario.id);
          }
        }
      } catch (err) {
        console.error('Error loading scenario dataset:', err);
        setStatusMessage('Error loading case study data.', 'error');
      }
    }
  }

  // Scenario select change handler
  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', () => {
      const id = scenarioSelect.value;
      const descEl = document.getElementById('sentiment-scenario-description');

      if (!id) {
        activeScenarioDataset = null;
        if (downloadBtn) {
          downloadBtn.classList.add('hidden');
          downloadBtn.disabled = true;
        }
        if (descEl) {
          descEl.innerHTML = '<p>Select a case study above to load sample data for sentiment analysis practice.</p>';
        }
        return;
      }

      loadScenario(id);
    });

    // Load scenario index on page init
    populateScenarioSelect();
  }

  // Download button handler
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!activeScenarioDataset) return;
      const a = document.createElement('a');
      a.href = activeScenarioDataset;
      a.download = activeScenarioDataset.split('/').pop() || 'sentiment_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
  
  // Initialize engagement tracking
  if (typeof InitEngagementTracking === 'function') {
    InitEngagementTracking(TOOL_SLUG);
  }
});
