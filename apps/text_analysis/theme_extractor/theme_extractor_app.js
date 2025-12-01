/**
 * Theme Extractor App
 * Handles text input, API calls, and visualization of discovered themes
 */

// API Configuration - use THEME_API_BASE to avoid conflict with auth_tracking.js
const THEME_API_BASE = window.location.hostname === 'localhost' || window.location.protocol === 'file:'
    ? 'http://localhost:8001/api'
    : 'https://drbaker-backend.onrender.com/api';

// State
let currentResults = null;
let uploadedData = null;

// Scenario state
let scenarioManifest = [];
let activeScenarioConfig = null;
let activeScenarioDataset = null;

// Grouping state
let groupingEnabled = false;
let groupColumn = null;
let uniqueGroups = [];

// Theme colors for visualization
const THEME_COLORS = [
    '#4f46e5', '#7c3aed', '#2563eb', '#0891b2', 
    '#059669', '#65a30d', '#ca8a04', '#ea580c',
    '#dc2626', '#db2777'
];

// DOM Elements - initialized in DOMContentLoaded
let elements = {};

// Chart instance
let distributionChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM element references
    elements = {
        // Scenario elements
        scenarioSelect: document.getElementById('scenario-select'),
        scenarioDownload: document.getElementById('scenario-download'),
        scenarioDescription: document.getElementById('scenario-description'),
        
        // Input elements
        textInput: document.getElementById('text-input'),
        fileInput: document.getElementById('file-input'),
        uploadDropzone: document.getElementById('upload-dropzone'),
        browseBtn: document.getElementById('browse-btn'),
        uploadFeedback: document.getElementById('upload-feedback'),
        columnSelector: document.getElementById('column-selector'),
        textColumnSelect: document.getElementById('text-column'),
        columnPreview: document.getElementById('column-preview'),
        
        // Grouping elements
        useGroupingCheckbox: document.getElementById('use-grouping-checkbox'),
        groupColumnSelect: document.getElementById('group-column-select'),
        
        // Settings
        numThemes: document.getElementById('num-themes'),
        wordsPerTheme: document.getElementById('words-per-theme'),
        
        // Buttons
        runBtn: document.getElementById('run-btn'),
        downloadTemplate: document.getElementById('download-template'),
        exportThemes: document.getElementById('export-themes'),
        exportAssignments: document.getElementById('export-assignments'),
        
        // Stats
        lineCount: document.getElementById('line-count'),
        charCount: document.getElementById('char-count'),
        
        // Results
        resultsSection: document.getElementById('results-section'),
        themesContainer: document.getElementById('themes-container'),
        statDocuments: document.getElementById('stat-documents'),
        statThemes: document.getElementById('stat-themes'),
        statVocab: document.getElementById('stat-vocab'),
        statTokens: document.getElementById('stat-tokens'),
        statAvgLength: document.getElementById('stat-avg-length'),
        statAvgConfidence: document.getElementById('stat-avg-confidence'),
        statAuto: document.getElementById('stat-auto'),
        
        // Sample comments
        samplesContainer: document.getElementById('samples-container'),
        sampleCount: document.getElementById('sample-count'),
        
        // Scoring examples
        examplesContainer: document.getElementById('examples-container'),
        
        // Error
        errorToast: document.getElementById('error-toast'),
        errorMessage: document.getElementById('error-message'),
        errorClose: document.getElementById('error-close')
    };
    
    initModeToggle();
    initTextInput();
    initFileUpload();
    initGroupingControls();
    initRunButton();
    initExportButtons();
    initErrorHandling();
    initScenarios();
    
    // Track tool usage
    if (typeof trackToolRun === 'function') {
        trackToolRun('theme_extractor', 'page_load');
    }
});

// =====================================================================
// SCENARIO / CASE STUDY LOADING
// =====================================================================

async function initScenarios() {
    try {
        const resp = await fetch('scenarios/scenario-index.json', { cache: 'no-cache' });
        if (!resp.ok) throw new Error(`Unable to load scenario index (${resp.status})`);
        const data = await resp.json();
        scenarioManifest = Array.isArray(data) ? data : [];
        populateScenarioSelect();
    } catch (err) {
        console.error('Error loading scenario index:', err);
        scenarioManifest = [];
    }
}

function populateScenarioSelect() {
    if (!elements.scenarioSelect) return;
    elements.scenarioSelect.innerHTML = '<option value="">-- Choose a case study --</option>';
    scenarioManifest.forEach(entry => {
        const opt = document.createElement('option');
        opt.value = entry.id;
        opt.textContent = entry.label || entry.id;
        elements.scenarioSelect.appendChild(opt);
    });
    
    // Add event listeners
    elements.scenarioSelect.addEventListener('change', () => {
        const id = elements.scenarioSelect.value;
        if (id) {
            loadScenario(id);
        } else {
            clearScenario();
        }
    });
    
    if (elements.scenarioDownload) {
        elements.scenarioDownload.addEventListener('click', downloadScenarioDataset);
    }
}

async function loadScenario(id) {
    const scenario = scenarioManifest.find(s => s.id === id);
    if (!scenario) return;
    
    activeScenarioConfig = scenario;
    
    // Handle download button visibility
    if (elements.scenarioDownload) {
        activeScenarioDataset = scenario.dataset ? `scenarios/${scenario.dataset}` : null;
        elements.scenarioDownload.classList.toggle('hidden', !scenario.dataset);
    }
    
    // Load description from .txt file
    if (scenario.file && elements.scenarioDescription) {
        try {
            const resp = await fetch(`scenarios/${scenario.file}`, { cache: 'no-cache' });
            if (resp.ok) {
                const text = await resp.text();
                elements.scenarioDescription.innerHTML = text;
                elements.scenarioDescription.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Error loading scenario description:', err);
        }
    }
    
    // Load dataset and switch to upload mode
    if (scenario.dataset) {
        try {
            const resp = await fetch(`scenarios/${scenario.dataset}`, { cache: 'no-cache' });
            if (resp.ok) {
                const csv = await resp.text();
                const rows = parseCSV(csv);
                
                if (rows.length >= 2) {
                    const headers = rows[0];
                    uploadedData = {
                        headers,
                        rows: rows.slice(1)
                    };
                    
                    // Switch to upload mode
                    activateMode('upload');
                    
                    // Populate column selector
                    elements.textColumnSelect.innerHTML = headers.map((h, i) => 
                        `<option value="${i}">${h}</option>`
                    ).join('');
                    
                    // Auto-select text column from scenario config
                    if (scenario.textColumn) {
                        const colIndex = headers.findIndex(h => h === scenario.textColumn);
                        if (colIndex >= 0) {
                            elements.textColumnSelect.value = colIndex;
                        }
                    }
                    
                    elements.columnSelector.classList.remove('hidden');
                    updateColumnPreview();
                    updateGroupColumnSelector();
                    
                    elements.uploadFeedback.textContent = `✓ Loaded ${uploadedData.rows.length} documents from "${scenario.label}"`;
                    elements.uploadFeedback.style.color = 'green';
                    
                    updateRunButtonState();
                }
            }
        } catch (err) {
            console.error('Error loading scenario dataset:', err);
            showError('Failed to load case study data: ' + err.message);
        }
    }
}

function clearScenario() {
    activeScenarioConfig = null;
    activeScenarioDataset = null;
    
    if (elements.scenarioDescription) {
        elements.scenarioDescription.innerHTML = '';
        elements.scenarioDescription.classList.add('hidden');
    }
    
    if (elements.scenarioDownload) {
        elements.scenarioDownload.classList.add('hidden');
    }
}

function downloadScenarioDataset() {
    if (!activeScenarioDataset) return;
    
    const link = document.createElement('a');
    link.href = activeScenarioDataset;
    link.download = activeScenarioConfig?.dataset || 'dataset.csv';
    link.click();
}

function activateMode(mode) {
    const modeButtons = document.querySelectorAll('.mode-button');
    const modePanels = document.querySelectorAll('.mode-panel');
    
    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    modePanels.forEach(panel => {
        panel.classList.toggle('active', panel.dataset.mode === mode);
    });
}

// Mode toggle (Paste vs Upload)
function initModeToggle() {
    const modeButtons = document.querySelectorAll('.mode-button');
    const modePanels = document.querySelectorAll('.mode-panel');
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            modePanels.forEach(panel => {
                panel.classList.toggle('active', panel.dataset.mode === mode);
            });
            
            updateRunButtonState();
        });
    });
}

// Text input handling
function initTextInput() {
    elements.textInput.addEventListener('input', () => {
        updateTextStats();
        updateRunButtonState();
    });
}

function updateTextStats() {
    const text = elements.textInput.value;
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const chars = text.length;
    
    elements.lineCount.textContent = `${lines.length} document${lines.length !== 1 ? 's' : ''}`;
    elements.charCount.textContent = `${chars.toLocaleString()} characters`;
}

// File upload handling
function initFileUpload() {
    // Dropzone click
    elements.uploadDropzone.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    elements.browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.fileInput.click();
    });
    
    // File input change
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    elements.uploadDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadDropzone.classList.add('dragover');
    });
    
    elements.uploadDropzone.addEventListener('dragleave', () => {
        elements.uploadDropzone.classList.remove('dragover');
    });
    
    elements.uploadDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadDropzone.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    });
    
    // Column selection
    elements.textColumnSelect.addEventListener('change', () => {
        updateColumnPreview();
        updateGroupColumnSelector();
        updateRunButtonState();
    });
    
    // Template download
    elements.downloadTemplate.addEventListener('click', downloadSampleTemplate);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const rows = parseCSV(content);
            
            if (rows.length < 2) {
                showError('File must contain at least one header row and one data row.');
                return;
            }
            
            const headers = rows[0];
            uploadedData = {
                headers,
                rows: rows.slice(1)
            };
            
            // Populate column selector
            elements.textColumnSelect.innerHTML = headers.map((h, i) => 
                `<option value="${i}">${h}</option>`
            ).join('');
            
            // Try to auto-detect text column
            const textColIndex = headers.findIndex(h => 
                /text|review|comment|feedback|response|content|message/i.test(h)
            );
            if (textColIndex >= 0) {
                elements.textColumnSelect.value = textColIndex;
            }
            
            elements.columnSelector.classList.remove('hidden');
            updateColumnPreview();
            updateGroupColumnSelector();
            
            elements.uploadFeedback.textContent = `✓ Loaded ${uploadedData.rows.length} rows from "${file.name}"`;
            elements.uploadFeedback.style.color = 'green';
            
            updateRunButtonState();
        } catch (err) {
            showError('Failed to parse file: ' + err.message);
        }
    };
    
    reader.onerror = () => {
        showError('Failed to read file.');
    };
    
    reader.readAsText(file);
}

function parseCSV(content) {
    // Simple CSV parser - handles basic cases
    const lines = content.split(/\r?\n/);
    const rows = [];
    
    for (const line of lines) {
        if (line.trim()) {
            // Handle quoted fields
            const row = [];
            let inQuotes = false;
            let field = '';
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if ((char === ',' || char === '\t') && !inQuotes) {
                    row.push(field.trim());
                    field = '';
                } else {
                    field += char;
                }
            }
            row.push(field.trim());
            rows.push(row);
        }
    }
    
    return rows;
}

function updateColumnPreview() {
    if (!uploadedData) return;
    
    const colIndex = parseInt(elements.textColumnSelect.value);
    const samples = uploadedData.rows.slice(0, 3).map(row => {
        const text = row[colIndex] || '';
        return text.length > 60 ? text.substring(0, 60) + '...' : text;
    });
    
    elements.columnPreview.textContent = 'Preview: ' + samples.join(' | ');
}

function updateGroupColumnSelector() {
    if (!uploadedData) return;
    
    const textColIndex = parseInt(elements.textColumnSelect.value);
    const headers = uploadedData.headers;
    
    // Populate group column select with all columns except the text column
    elements.groupColumnSelect.innerHTML = '<option value="">(Select a grouping column)</option>';
    headers.forEach((h, i) => {
        if (i !== textColIndex) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = h;
            elements.groupColumnSelect.appendChild(opt);
        }
    });
}

function initGroupingControls() {
    if (!elements.useGroupingCheckbox || !elements.groupColumnSelect) return;
    
    elements.useGroupingCheckbox.addEventListener('change', () => {
        groupingEnabled = elements.useGroupingCheckbox.checked;
        elements.groupColumnSelect.disabled = !groupingEnabled;
        
        if (!groupingEnabled) {
            elements.groupColumnSelect.value = '';
            groupColumn = null;
            uniqueGroups = [];
        }
    });
    
    elements.groupColumnSelect.addEventListener('change', () => {
        const colIndex = elements.groupColumnSelect.value;
        if (colIndex !== '') {
            groupColumn = parseInt(colIndex);
            // Get unique groups
            uniqueGroups = [...new Set(uploadedData.rows.map(row => row[groupColumn] || '(empty)'))];
        } else {
            groupColumn = null;
            uniqueGroups = [];
        }
    });
}

function downloadSampleTemplate() {
    const template = `text,category,date
"Great product! The quality exceeded my expectations.",positive,2024-01-15
"Shipping was slow but the item arrived in good condition.",mixed,2024-01-16
"Not worth the price. Very disappointed with the purchase.",negative,2024-01-17
"Customer service was helpful when I had questions.",positive,2024-01-18
"The color was different from the photos online.",negative,2024-01-19`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme_extractor_template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Run button
function initRunButton() {
    elements.runBtn.addEventListener('click', runAnalysis);
}

function updateRunButtonState() {
    const activeMode = document.querySelector('.mode-button.active').dataset.mode;
    let hasData = false;
    
    if (activeMode === 'paste') {
        const lines = elements.textInput.value.split('\n').filter(l => l.trim());
        hasData = lines.length >= 5;
    } else if (activeMode === 'upload') {
        hasData = uploadedData && uploadedData.rows.length >= 5;
    }
    
    elements.runBtn.disabled = !hasData;
}

async function runAnalysis() {
    const activeMode = document.querySelector('.mode-button.active').dataset.mode;
    let documents = [];
    let groups = null;
    
    // Gather documents
    if (activeMode === 'paste') {
        documents = elements.textInput.value
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    } else if (activeMode === 'upload') {
        const colIndex = parseInt(elements.textColumnSelect.value);
        documents = uploadedData.rows
            .map(row => (row[colIndex] || '').trim())
            .filter(text => text.length > 0);
        
        // Collect group labels if grouping is enabled
        if (groupingEnabled && groupColumn !== null) {
            groups = uploadedData.rows.map(row => row[groupColumn] || '(empty)');
        }
    }
    
    if (documents.length < 5) {
        showError('Need at least 5 documents to extract themes.');
        return;
    }
    
    if (documents.length > 500) {
        showError('Maximum 500 documents allowed. Please reduce your dataset.');
        return;
    }
    
    // Get settings
    const numThemesValue = elements.numThemes.value;
    const wordsPerTheme = parseInt(elements.wordsPerTheme.value);
    
    // Show loading state
    setLoading(true);
    
    try {
        const requestBody = {
            documents,
            num_themes: numThemesValue === 'auto' ? null : parseInt(numThemesValue),
            words_per_theme: wordsPerTheme
        };
        
        // Include groups if grouping is enabled
        if (groups) {
            requestBody.groups = groups;
        }
        
        const response = await fetch(`${THEME_API_BASE}/analyze/themes/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        currentResults = data;
        displayResults(data);
        
        // Track successful analysis
        if (typeof trackToolRun === 'function') {
            trackToolRun('theme_extractor', 'analysis_complete', {
                documents: documents.length,
                themes: data.stats.num_themes
            });
        }
        
    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
}

function setLoading(loading) {
    elements.runBtn.disabled = loading;
    elements.runBtn.querySelector('.btn-text').classList.toggle('hidden', loading);
    elements.runBtn.querySelector('.btn-loading').classList.toggle('hidden', !loading);
}

// Display results
function displayResults(data) {
    elements.resultsSection.classList.remove('hidden');
    
    // Update stats
    elements.statDocuments.textContent = data.stats.processed_documents;
    elements.statThemes.textContent = data.stats.num_themes;
    elements.statVocab.textContent = data.stats.vocabulary_size.toLocaleString();
    
    // Calculate additional stats
    const totalTokens = data.stats.total_tokens || 
        data.document_themes.reduce((sum, d) => sum + (d.original_text.split(/\s+/).length), 0);
    elements.statTokens.textContent = totalTokens.toLocaleString();
    
    const avgLength = data.stats.avg_doc_length || 
        Math.round(totalTokens / data.stats.processed_documents);
    elements.statAvgLength.textContent = avgLength + ' words';
    
    const avgConfidence = data.document_themes.reduce((sum, d) => 
        sum + Math.max(...d.theme_weights), 0) / data.document_themes.length;
    elements.statAvgConfidence.textContent = (avgConfidence * 100).toFixed(0) + '%';
    
    elements.statAuto.classList.toggle('hidden', !data.auto_detected);
    
    // Render theme cards
    renderThemeCards(data.themes);
    
    // Render distribution chart (bar chart)
    renderDistributionChart(data.themes, data.group_stats);
    
    // Render sample comments (top N per theme)
    const sampleCount = parseInt(elements.sampleCount.value) || 3;
    renderSampleComments(data.themes, data.document_themes, sampleCount);
    
    // Add listener for sample count changes
    elements.sampleCount.onchange = () => {
        const count = parseInt(elements.sampleCount.value) || 3;
        renderSampleComments(data.themes, data.document_themes, count);
    };
    
    // Render scoring examples (2 documents showing how weights work)
    renderScoringExamples(data.themes, data.document_themes);
    
    // Scroll to results
    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function renderThemeCards(themes) {
    elements.themesContainer.innerHTML = themes.map((theme, index) => {
        const colorIndex = index % THEME_COLORS.length;
        const topWords = theme.words.slice(0, 3);
        const otherWords = theme.words.slice(3);
        
        return `
            <div class="theme-card" style="border-left: 4px solid ${THEME_COLORS[colorIndex]}">
                <div class="theme-header">
                    <span class="theme-number" style="color: ${THEME_COLORS[colorIndex]}">
                        Theme ${theme.id}
                    </span>
                    <span class="theme-weight">${(theme.weight * 100).toFixed(1)}% of corpus</span>
                </div>
                <div class="theme-words">
                    ${topWords.map(w => `<span class="theme-word top-word" style="background: ${THEME_COLORS[colorIndex]}">${w}</span>`).join('')}
                    ${otherWords.map(w => `<span class="theme-word">${w}</span>`).join('')}
                </div>
                <div class="theme-docs">
                    ${theme.top_documents.length} representative documents
                </div>
            </div>
        `;
    }).join('');
}

function renderDistributionChart(themes, groupStats) {
    const ctx = document.getElementById('theme-distribution-chart').getContext('2d');
    
    if (distributionChart) {
        distributionChart.destroy();
    }
    
    // If grouping is enabled and we have group stats, show grouped bar chart
    if (groupingEnabled && groupStats && Object.keys(groupStats).length > 0) {
        // Create datasets for each group
        const datasets = Object.entries(groupStats).map(([groupName, themeWeights], i) => ({
            label: groupName,
            data: themes.map(t => (themeWeights[t.id] || 0) * 100),
            backgroundColor: THEME_COLORS[i % THEME_COLORS.length] + '99',
            borderColor: THEME_COLORS[i % THEME_COLORS.length],
            borderWidth: 1
        }));
        
        distributionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: themes.map(t => `Theme ${t.id}`),
                datasets
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: '% of Documents'
                        },
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Theme'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const theme = themes[context.dataIndex];
                                return [
                                    `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`,
                                    `Keywords: ${theme.words.slice(0, 3).join(', ')}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Single bar chart showing overall theme distribution
        distributionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: themes.map(t => `Theme ${t.id}`),
                datasets: [{
                    label: '% of Documents',
                    data: themes.map(t => t.weight * 100),
                    backgroundColor: themes.map((_, i) => THEME_COLORS[i % THEME_COLORS.length] + '99'),
                    borderColor: themes.map((_, i) => THEME_COLORS[i % THEME_COLORS.length]),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: '% of Documents'
                        },
                        ticks: {
                            callback: (value) => value + '%'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Theme'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const theme = themes[context.dataIndex];
                                return [
                                    `${context.parsed.y.toFixed(1)}% of documents`,
                                    `Keywords: ${theme.words.slice(0, 3).join(', ')}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }
}

// Sample Comments - Top N per theme
function renderSampleComments(themes, documentThemes, count = 3) {
    if (!elements.samplesContainer) return;
    
    const samplesHtml = themes.map((theme, index) => {
        const colorIndex = index % THEME_COLORS.length;
        
        // Get documents assigned to this theme, sorted by confidence
        const themeDocsWithConfidence = documentThemes
            .filter(d => d.primary_theme === theme.id)
            .map(d => ({
                text: d.original_text,
                confidence: Math.max(...d.theme_weights)
            }))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, count);
        
        return `
            <div class="sample-theme-card" style="border-left: 4px solid ${THEME_COLORS[colorIndex]}">
                <div class="sample-theme-header">
                    <span class="theme-badge" style="background: ${THEME_COLORS[colorIndex]}20; color: ${THEME_COLORS[colorIndex]}">
                        Theme ${theme.id}
                    </span>
                    <span class="theme-keywords">${theme.words.slice(0, 4).join(', ')}</span>
                    <span class="theme-doc-count">${documentThemes.filter(d => d.primary_theme === theme.id).length} docs</span>
                </div>
                <div class="sample-comments-list">
                    ${themeDocsWithConfidence.map((doc, i) => `
                        <div class="sample-comment">
                            <span class="sample-rank">#${i + 1}</span>
                            <span class="sample-text">"${escapeHtml(doc.text.length > 200 ? doc.text.substring(0, 200) + '...' : doc.text)}"</span>
                            <span class="sample-confidence">${(doc.confidence * 100).toFixed(0)}%</span>
                        </div>
                    `).join('')}
                    ${themeDocsWithConfidence.length === 0 ? '<p class="no-samples">No documents strongly assigned to this theme.</p>' : ''}
                </div>
            </div>
        `;
    }).join('');
    
    elements.samplesContainer.innerHTML = samplesHtml;
}

// How Scoring Works - Show 2 example documents with token-level breakdown
function renderScoringExamples(themes, documentThemes) {
    if (!elements.examplesContainer || documentThemes.length < 2) return;
    
    // Common stopwords that would be filtered
    const stopwords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'it', 'its',
        'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
        'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
        'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all',
        'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
        'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
        'now', 'here', 'there', 'then', 'once', 'if', 'because', 'until', 'while',
        'about', 'against', 'between', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
        'again', 'further', 'am', 'being', 'get', 'got', 'really', 'much', 'even'
    ]);
    
    // Build a word-to-theme mapping from theme words
    const wordThemeMap = {};
    themes.forEach((theme, idx) => {
        theme.words.forEach((word, wordIdx) => {
            const normalizedWord = word.toLowerCase();
            // Weight decreases by position in theme word list
            const weight = 1 - (wordIdx * 0.08);
            if (!wordThemeMap[normalizedWord] || wordThemeMap[normalizedWord].weight < weight) {
                wordThemeMap[normalizedWord] = {
                    themeId: theme.id,
                    themeIdx: idx,
                    weight: weight,
                    rank: wordIdx + 1
                };
            }
        });
    });
    
    // Select 2 diverse examples
    const sortedByConfidence = [...documentThemes].sort((a, b) => 
        Math.max(...b.theme_weights) - Math.max(...a.theme_weights)
    );
    
    const highConfidenceDoc = sortedByConfidence[0];
    const midIndex = Math.floor(sortedByConfidence.length / 2);
    const mixedDoc = sortedByConfidence[midIndex];
    
    const examples = [
        { doc: highConfidenceDoc, label: 'Clear Theme Assignment', description: 'This document has strong keyword matches for a single theme.' },
        { doc: mixedDoc, label: 'Mixed Theme Assignment', description: 'This document has keywords from multiple themes.' }
    ];
    
    const examplesHtml = examples.map(({ doc, label, description }) => {
        // Tokenize the original text
        const originalText = doc.original_text.replace(/\.{3}$/, ''); // Remove trailing ...
        const tokens = originalText.split(/(\s+|[.,!?;:'"()\[\]{}])/);
        
        // Process each token
        const processedTokens = tokens.map(token => {
            const trimmed = token.trim();
            if (!trimmed || /^\s+$/.test(token)) {
                return { type: 'space', display: token };
            }
            if (/^[.,!?;:'"()\[\]{}]+$/.test(trimmed)) {
                return { type: 'punct', display: token };
            }
            
            const normalized = trimmed.toLowerCase().replace(/[^a-z]/g, '');
            
            if (!normalized || normalized.length <= 2) {
                return { type: 'short', display: token, word: trimmed };
            }
            
            if (stopwords.has(normalized)) {
                return { type: 'stopword', display: token, word: trimmed };
            }
            
            // Check if word matches any theme
            const themeMatch = wordThemeMap[normalized];
            if (themeMatch) {
                return {
                    type: 'theme-match',
                    display: token,
                    word: trimmed,
                    themeId: themeMatch.themeId,
                    themeIdx: themeMatch.themeIdx,
                    weight: themeMatch.weight,
                    rank: themeMatch.rank
                };
            }
            
            return { type: 'neutral', display: token, word: trimmed };
        });
        
        // Build the token display HTML
        const tokenHtml = processedTokens.map(t => {
            if (t.type === 'space') return t.display;
            if (t.type === 'punct') return `<span class="token-punct">${t.display}</span>`;
            if (t.type === 'short') return `<span class="token-short" title="Too short">${t.display}</span>`;
            if (t.type === 'stopword') {
                return `<span class="token-stopword" title="Filtered: common word">${t.word}</span><span class="token-label">(filtered)</span>`;
            }
            if (t.type === 'theme-match') {
                const color = THEME_COLORS[t.themeIdx % THEME_COLORS.length];
                const strength = t.weight > 0.7 ? 'strong' : t.weight > 0.4 ? 'medium' : 'weak';
                return `<span class="token-theme token-${strength}" style="background: ${color}20; color: ${color}; border-color: ${color}" title="Theme ${t.themeId}, rank #${t.rank}">${t.word}</span><span class="token-label" style="color: ${color}">(T${t.themeId})</span>`;
            }
            return `<span class="token-neutral" title="No strong theme match">${t.word}</span><span class="token-label token-label-weak">(weak)</span>`;
        }).join('');
        
        // Calculate theme weights display
        const sortedWeights = themes.map((theme, i) => ({
            themeId: theme.id,
            weight: doc.theme_weights[i],
            keywords: theme.words.slice(0, 3),
            colorIndex: i % THEME_COLORS.length
        })).sort((a, b) => b.weight - a.weight);
        
        // Count matches per theme
        const themeMatchCounts = {};
        processedTokens.forEach(t => {
            if (t.type === 'theme-match') {
                themeMatchCounts[t.themeId] = (themeMatchCounts[t.themeId] || 0) + 1;
            }
        });
        
        return `
            <div class="scoring-example-card">
                <div class="example-header">
                    <span class="example-label">${label}</span>
                    <span class="example-desc">${description}</span>
                </div>
                
                <div class="example-token-breakdown">
                    <span class="token-breakdown-label">Token-by-token analysis:</span>
                    <div class="token-sentence">
                        ${tokenHtml}
                    </div>
                </div>
                
                <div class="example-weights">
                    <span class="weights-label">Final Theme Scores:</span>
                    <div class="weights-bars">
                        ${sortedWeights.map(w => `
                            <div class="weight-row">
                                <span class="weight-theme" style="color: ${THEME_COLORS[w.colorIndex]}">
                                    Theme ${w.themeId}
                                </span>
                                <span class="weight-matches">${themeMatchCounts[w.themeId] || 0} matches</span>
                                <div class="weight-bar-container">
                                    <div class="weight-bar" style="width: ${w.weight * 100}%; background: ${THEME_COLORS[w.colorIndex]}"></div>
                                </div>
                                <span class="weight-value">${(w.weight * 100).toFixed(1)}%</span>
                            </div>
                        `).join('')}
                    </div>
                    <p class="weights-explanation">
                        <strong>Result:</strong> Assigned to 
                        <span style="color: ${THEME_COLORS[sortedWeights[0].colorIndex]}; font-weight: bold;">Theme ${sortedWeights[0].themeId}</span>
                        (${sortedWeights[0].keywords.join(', ')}) with ${(sortedWeights[0].weight * 100).toFixed(0)}% confidence.
                        ${sortedWeights[1].weight > 0.2 ? 
                            `Secondary match: Theme ${sortedWeights[1].themeId} at ${(sortedWeights[1].weight * 100).toFixed(0)}%.` : 
                            ''}
                    </p>
                </div>
            </div>
        `;
    }).join('');
    
    elements.examplesContainer.innerHTML = examplesHtml;
}

// Export functions
function initExportButtons() {
    elements.exportThemes.addEventListener('click', exportThemesSummary);
    elements.exportAssignments.addEventListener('click', exportDocumentAssignments);
}

function exportThemesSummary() {
    if (!currentResults) return;
    
    const rows = [['Theme ID', 'Weight (%)', 'Top Words']];
    currentResults.themes.forEach(theme => {
        rows.push([
            theme.id,
            (theme.weight * 100).toFixed(2),
            theme.words.join(', ')
        ]);
    });
    
    downloadCSV(rows, 'theme_summary.csv');
}

function exportDocumentAssignments() {
    if (!currentResults) return;
    
    const numThemes = currentResults.stats.num_themes;
    const headers = ['Document Index', 'Text', 'Primary Theme', ...Array.from({length: numThemes}, (_, i) => `Theme ${i+1} Weight`)];
    
    const rows = [headers];
    currentResults.document_themes.forEach(doc => {
        rows.push([
            doc.doc_index + 1,
            `"${doc.original_text.replace(/"/g, '""')}"`,
            doc.primary_theme,
            ...doc.theme_weights.map(w => w.toFixed(4))
        ]);
    });
    
    downloadCSV(rows, 'document_assignments.csv');
}

function downloadCSV(rows, filename) {
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Error handling
function initErrorHandling() {
    elements.errorClose.addEventListener('click', hideError);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorToast.classList.remove('hidden');
    
    // Auto-hide after 8 seconds
    setTimeout(hideError, 8000);
}

function hideError() {
    elements.errorToast.classList.add('hidden');
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}
