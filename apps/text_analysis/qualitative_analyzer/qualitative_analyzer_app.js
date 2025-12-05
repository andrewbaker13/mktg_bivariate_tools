/**
 * Qualitative Analyzer Application
 * For analyzing focus group transcripts and qualitative data
 */

// Global state
const state = {
  transcript: [], // Array of { lineNumber, speaker, timestamp, text, coded: [], lineType: 'dialogue'|'section-header'|'activity-marker'|'stage-direction', sectionId: null }
  codes: [], // Array of { id, name, color }
  codedSegments: [], // Array of { lineNumber, speaker, text, codes: [] }
  currentMode: 'structured',
  selectedLines: new Set(),
  searchResults: [],
  currentFilters: {
    speaker: '',
    code: '',
    section: 'all'
  },
  sections: [], // Array of { id, title, startLine, endLine, type: 'section'|'activity' }
  statistics: {
    totalLines: 0,
    speakers: 0,
    sections: 0,
    activities: 0
  }
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  loadScenarios();
  setupEventListeners();
});

/**
 * Initialize the application
 */
function initializeApp() {
  console.log('Qualitative Analyzer initialized');
  
  // Set timestamps
  document.getElementById('created-date').textContent = '2025-12-04';
  document.getElementById('modified-date').textContent = new Date().toISOString().split('T')[0];
  
  // Initialize default codes
  addDefaultCodes();
}

/**
 * Add some default codes to get started
 */
function addDefaultCodes() {
  const defaultCodes = [
    { name: 'Positive Sentiment', color: '#10b981' },
    { name: 'Negative Sentiment', color: '#ef4444' },
    { name: 'Product Feature', color: '#3b82f6' },
    { name: 'Price Concern', color: '#f59e0b' },
    { name: 'Competitor Mention', color: '#8b5cf6' }
  ];
  
  defaultCodes.forEach(code => {
    addCode(code.name, code.color, false);
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Mode toggle
  document.querySelectorAll('.mode-button').forEach(button => {
    button.addEventListener('click', () => switchMode(button.dataset.mode));
  });
  
  // Upload handlers
  setupDropzone('structured');
  setupDropzone('plain');
  
  // Manual entry
  document.getElementById('manual-load')?.addEventListener('click', loadManualText);
  
  // Search
  document.getElementById('search-btn')?.addEventListener('click', performSearch);
  document.getElementById('search-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });
  document.getElementById('clear-search')?.addEventListener('click', clearSearch);
  
  // Filters
  document.getElementById('speaker-filter')?.addEventListener('change', applyFilters);
  document.getElementById('code-filter')?.addEventListener('change', applyFilters);
  document.getElementById('section-filter')?.addEventListener('change', applyFilters);
  
  // Coding
  document.getElementById('add-code')?.addEventListener('click', () => {
    const name = document.getElementById('new-code-name').value.trim();
    const color = document.getElementById('new-code-color').value;
    if (name) {
      addCode(name, color);
      document.getElementById('new-code-name').value = '';
    }
  });
  
  // Export
  document.getElementById('export-coded')?.addEventListener('click', exportCodedSegments);
  document.getElementById('export-codebook')?.addEventListener('click', exportCodebook);
  document.getElementById('export-report')?.addEventListener('click', exportReport);
  
  // Template downloads
  document.getElementById('structured-download')?.addEventListener('click', downloadStructuredTemplate);
}

/**
 * Setup dropzone for file uploads
 */
function setupDropzone(mode) {
  const dropzoneId = `${mode}-dropzone`;
  const inputId = `${mode}-input`;
  const browseId = `${mode}-browse`;
  const feedbackId = `${mode}-feedback`;
  
  initDropzone({
    dropzoneId,
    inputId,
    browseId,
    onFile: (file) => handleFileUpload(file, mode),
    onError: (message) => {
      const feedback = document.getElementById(feedbackId);
      if (feedback) feedback.textContent = message;
    }
  });
}

/**
 * Handle file upload
 */
function handleFileUpload(file, mode) {
  const feedbackId = `${mode}-feedback`;
  const feedback = document.getElementById(feedbackId);
  
  if (!file) return;
  
  feedback.textContent = `Loading ${file.name}...`;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    parseTranscript(content, mode);
    feedback.textContent = `Loaded: ${file.name} (${state.transcript.length} lines)`;
  };
  reader.onerror = () => {
    feedback.textContent = 'Error reading file';
  };
  reader.readAsText(file);
}

/**
 * Parse transcript based on mode
 */
function parseTranscript(content, mode) {
  state.transcript = [];
  state.sections = [];
  
  const detectSections = document.getElementById('detect-sections')?.checked;
  const detectActivities = document.getElementById('detect-activities')?.checked;
  const showStageDirections = document.getElementById('show-stage-directions')?.checked;
  
  if (mode === 'structured') {
    // Parse CSV/TSV with speaker,timestamp,text or speaker,text
    const rows = parseCSV(content);
    const headers = rows[0].map(h => h.toLowerCase());
    
    const speakerIdx = headers.indexOf('speaker');
    const textIdx = headers.indexOf('text');
    const timestampIdx = headers.indexOf('timestamp');
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[textIdx]?.trim()) {
        state.transcript.push({
          lineNumber: i,
          speaker: row[speakerIdx] || 'Unknown',
          timestamp: row[timestampIdx] || '',
          text: row[textIdx].trim(),
          codes: [],
          lineType: 'dialogue',
          sectionId: null
        });
      }
    }
  } else if (mode === 'plain') {
    // Parse plain text with format detection
    const lines = content.split('\n');
    const autoDetect = document.getElementById('auto-detect-speakers')?.checked;
    let currentSectionId = null;
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      let lineType = 'dialogue';
      let speaker = 'Unknown';
      let text = trimmed;
      let timestamp = '';
      
      // Detect section headers [LIKE THIS]
      if (detectSections && /^\[.+\]$/.test(trimmed)) {
        lineType = 'section-header';
        text = trimmed.slice(1, -1); // Remove brackets
        speaker = '';
        currentSectionId = `section-${state.sections.length}`;
        state.sections.push({
          id: currentSectionId,
          title: text,
          startLine: idx + 1,
          endLine: idx + 1,
          type: 'section'
        });
      }
      // Detect activity markers
      else if (detectActivities && /^ACTIVITY\s+\d+/i.test(trimmed)) {
        lineType = 'activity-marker';
        speaker = '';
        // Extract timestamp if present
        const timeMatch = trimmed.match(/\(~Minutes\s+(\d+)[-–](\d+)\)/);
        if (timeMatch) {
          timestamp = `${timeMatch[1]}-${timeMatch[2]} min`;
        }
        currentSectionId = `activity-${state.sections.length}`;
        state.sections.push({
          id: currentSectionId,
          title: trimmed,
          startLine: idx + 1,
          endLine: idx + 1,
          type: 'activity'
        });
      }
      // Detect stage directions (entire line in parentheses)
      else if (showStageDirections && /^\(.+\)$/.test(trimmed)) {
        lineType = 'stage-direction';
        text = trimmed.slice(1, -1); // Remove parentheses
        speaker = '';
      }
      // Regular dialogue with speaker detection
      else if (autoDetect) {
        const match = trimmed.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          speaker = match[1].trim();
          text = match[2].trim();
        }
      }
      
      // Update section end line
      if (currentSectionId && state.sections.length > 0) {
        state.sections[state.sections.length - 1].endLine = idx + 1;
      }
      
      state.transcript.push({
        lineNumber: idx + 1,
        speaker,
        timestamp,
        text,
        codes: [],
        lineType,
        sectionId: currentSectionId
      });
    });
  }
  
  calculateStatistics();
  renderSectionNav();
  renderTranscript();
  updateSpeakerFilter();
  updateCharts();
}

/**
 * Load manual text entry
 */
function loadManualText() {
  const textarea = document.getElementById('manual-text-input');
  const content = textarea?.value;
  
  if (!content?.trim()) {
    document.getElementById('manual-feedback').textContent = 'Please enter some text';
    return;
  }
  
  parseTranscript(content, 'plain');
  document.getElementById('manual-feedback').textContent = `Loaded ${state.transcript.length} lines`;
}

/**
 * Calculate statistics for the transcript
 */
function calculateStatistics() {
  state.statistics.totalLines = state.transcript.length;
  
  const uniqueSpeakers = new Set();
  state.transcript.forEach(item => {
    if (item.speaker && item.speaker !== 'Unknown') {
      uniqueSpeakers.add(item.speaker);
    }
  });
  state.statistics.speakers = uniqueSpeakers.size;
  
  state.statistics.sections = state.sections.filter(s => s.type === 'section').length;
  state.statistics.activities = state.sections.filter(s => s.type === 'activity').length;
  
  // Update UI
  document.getElementById('stat-lines').textContent = state.statistics.totalLines;
  document.getElementById('stat-speakers').textContent = state.statistics.speakers;
  document.getElementById('stat-sections').textContent = state.statistics.sections;
  document.getElementById('stat-activities').textContent = state.statistics.activities;
}

/**
 * Render section navigation sidebar
 */
function renderSectionNav() {
  const navList = document.getElementById('section-nav-list');
  const sectionFilter = document.getElementById('section-filter');
  
  if (!navList) return;
  
  if (state.sections.length === 0) {
    navList.innerHTML = '<div style="padding: 1rem; color: #9ca3af; font-size: 0.875rem;">No sections detected</div>';
    if (sectionFilter) {
      sectionFilter.innerHTML = '<option value="all">All sections</option>';
    }
    return;
  }
  
  const navHtml = state.sections.map(section => {
    const className = section.type === 'activity' ? 'section-nav-item activity' : 'section-nav-item';
    const icon = section.type === 'activity' ? '⚡' : '📑';
    return `
      <div class="${className}" data-section="${section.id}">
        <span>${icon} ${escapeHtml(section.title)}</span>
        <span style="font-size: 0.75rem; color: #9ca3af;">${section.endLine - section.startLine + 1} lines</span>
      </div>
    `;
  }).join('');
  
  navList.innerHTML = navHtml;
  
  // Add click handlers to navigate to sections
  navList.querySelectorAll('.section-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.dataset.section;
      jumpToSection(sectionId);
    });
  });
  
  // Update section filter dropdown
  if (sectionFilter) {
    const filterHtml = '<option value="all">All sections</option>' + 
      state.sections.map(section => {
        return `<option value="${section.id}">${escapeHtml(section.title)}</option>`;
      }).join('');
    sectionFilter.innerHTML = filterHtml;
  }
}

/**
 * Jump to a specific section in the transcript
 */
function jumpToSection(sectionId) {
  const section = state.sections.find(s => s.id === sectionId);
  if (!section) return;
  
  const lineElement = document.getElementById(`line-${section.startLine}`);
  if (lineElement) {
    lineElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Briefly highlight the section
    const sectionLines = document.querySelectorAll(`[data-section="${sectionId}"]`);
    sectionLines.forEach(line => {
      line.style.backgroundColor = '#fef3c7';
      setTimeout(() => {
        line.style.backgroundColor = '';
      }, 2000);
    });
  }
}


/**
 * Render transcript to viewer
 */
function renderTranscript() {
  const container = document.getElementById('transcript-content');
  if (!container) return;
  
  if (state.transcript.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Upload or paste a transcript to begin analysis</p></div>';
    return;
  }
  
  const showLineNumbers = document.getElementById('show-line-numbers')?.checked;
  const showTimestamps = document.getElementById('enable-timestamps')?.checked;
  const showStageDirections = document.getElementById('show-stage-directions')?.checked;
  
  const filteredTranscript = applyCurrentFilters();
  
  const html = filteredTranscript.map(item => {
    const isSelected = state.selectedLines.has(item.lineNumber);
    const isHighlighted = state.searchResults.includes(item.lineNumber);
    const hasCodes = item.codes && item.codes.length > 0;
    
    const classes = ['transcript-line'];
    classes.push(item.lineType);
    if (isSelected) classes.push('selected');
    if (isHighlighted) classes.push('highlighted');
    if (hasCodes) classes.push('coded');
    
    let lineHtml = `<div class="${classes.join(' ')}" data-line="${item.lineNumber}" data-section="${item.sectionId || ''}" id="line-${item.lineNumber}">`;
    
    if (showLineNumbers) {
      lineHtml += `<span class="line-number">${item.lineNumber}</span>`;
    }
    
    if (item.speaker && item.lineType === 'dialogue') {
      lineHtml += `<span class="speaker-label">${escapeHtml(item.speaker)}:</span>`;
    }
    
    if (showTimestamps && item.timestamp) {
      lineHtml += `<span class="timestamp">${escapeHtml(item.timestamp)}</span>`;
    }
    
    // Process text for inline stage directions
    let displayText = escapeHtml(item.text);
    if (showStageDirections && item.lineType === 'dialogue') {
      // Highlight inline parentheticals like (laughs), (points at herself)
      displayText = displayText.replace(/\(([^)]+)\)/g, '<span class="inline-direction">($1)</span>');
    }
    
    lineHtml += `<span class="line-text">${displayText}</span>`;
    
    if (hasCodes) {
      const codeLabels = item.codes.map(codeId => {
        const code = state.codes.find(c => c.id === codeId);
        return code ? `<span class="code-label" style="background-color: ${code.color}20; color: ${code.color};">${escapeHtml(code.name)}</span>` : '';
      }).join('');
      lineHtml += `<div class="line-codes">${codeLabels}</div>`;
    }
    
    lineHtml += '</div>';
    return lineHtml;
  }).join('');
  
  container.innerHTML = html;
  
  // Add event listeners
  container.querySelectorAll('.transcript-line').forEach(line => {
    line.addEventListener('click', () => selectLine(parseInt(line.dataset.line)));
    line.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, parseInt(line.dataset.line));
    });
  });
}

/**
 * Apply current filters and return filtered transcript
 */
function applyCurrentFilters() {
  return state.transcript.filter(item => {
    if (state.currentFilters.speaker && state.currentFilters.speaker !== '' && item.speaker !== state.currentFilters.speaker) {
      return false;
    }
    if (state.currentFilters.code && state.currentFilters.code !== '' && !item.codes.includes(state.currentFilters.code)) {
      return false;
    }
    if (state.currentFilters.section && state.currentFilters.section !== 'all' && item.sectionId !== state.currentFilters.section) {
      return false;
    }
    return true;
  });
}

/**
 * Select a line for coding
 */
function selectLine(lineNumber) {
  if (state.selectedLines.has(lineNumber)) {
    state.selectedLines.delete(lineNumber);
  } else {
    state.selectedLines.add(lineNumber);
  }
  renderTranscript();
}

/**
 * Show context menu for coding
 */
function showContextMenu(event, lineNumber) {
  event.preventDefault();
  
  // Remove any existing context menu
  document.querySelector('.context-menu')?.remove();
  
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = event.pageX + 'px';
  menu.style.top = event.pageY + 'px';
  
  let html = '<div style="padding: 0.5rem 1rem; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Assign Code</div>';
  
  state.codes.forEach(code => {
    html += `
      <div class="context-menu-item" data-code-id="${code.id}">
        <div class="context-menu-color" style="background-color: ${code.color}"></div>
        <span>${escapeHtml(code.name)}</span>
      </div>
    `;
  });
  
  menu.innerHTML = html;
  document.body.appendChild(menu);
  
  // Add click handlers
  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const codeId = item.dataset.codeId;
      assignCode(lineNumber, codeId);
      menu.remove();
    });
  });
  
  // Close menu on outside click
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
  }, 100);
}

/**
 * Assign code to line(s)
 */
function assignCode(lineNumber, codeId) {
  const line = state.transcript.find(l => l.lineNumber === lineNumber);
  if (!line) return;
  
  if (!line.codes.includes(codeId)) {
    line.codes.push(codeId);
    
    // Add to coded segments
    const code = state.codes.find(c => c.id === codeId);
    state.codedSegments.push({
      lineNumber,
      code: code.name,
      codeColor: code.color,
      speaker: line.speaker,
      text: line.text,
      timestamp: line.timestamp
    });
  }
  
  renderTranscript();
  renderCodedSegments();
  updateCodeCounts();
  updateCharts();
}

/**
 * Add a new code
 */
function addCode(name, color, updateUI = true) {
  if (state.codes.some(c => c.name === name)) {
    return; // Code already exists
  }
  
  state.codes.push({ name, color, count: 0 });
  
  if (updateUI) {
    renderCodeList();
    updateCodeFilter();
  }
}

/**
 * Render code list
 */
function renderCodeList() {
  const container = document.getElementById('code-list');
  if (!container) return;
  
  if (state.codes.length === 0) {
    container.innerHTML = '<p class="hint">Add codes to categorize transcript segments</p>';
    return;
  }
  
  let html = '';
  state.codes.forEach((code, idx) => {
    html += `
      <div class="code-item" style="border-left-color: ${code.color}">
        <div class="code-color" style="background-color: ${code.color}"></div>
        <span class="code-name">${escapeHtml(code.name)}</span>
        <span class="code-count">${code.count} segments</span>
        <div class="code-actions">
          <button onclick="deleteCode(${idx})" class="delete">Delete</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Delete a code
 */
function deleteCode(idx) {
  const code = state.codes[idx];
  if (!confirm(`Delete code "${code.name}"? This will remove it from all segments.`)) return;
  
  // Remove from transcript
  state.transcript.forEach(line => {
    line.codes = line.codes.filter(c => c !== code.name);
  });
  
  // Remove from coded segments
  state.codedSegments = state.codedSegments.filter(s => s.code !== code.name);
  
  // Remove code
  state.codes.splice(idx, 1);
  
  renderCodeList();
  renderCodedSegments();
  renderTranscript();
  updateCodeFilter();
  updateCharts();
}

/**
 * Render coded segments
 */
function renderCodedSegments() {
  const container = document.getElementById('coded-segments');
  if (!container) return;
  
  if (state.codedSegments.length === 0) {
    container.innerHTML = '<p class="hint">Select text in the transcript and assign codes</p>';
    return;
  }
  
  let html = '';
  state.codedSegments.forEach((segment, idx) => {
    const code = state.codes.find(c => c.name === segment.code);
    const color = code?.color || '#999';
    
    html += `
      <div class="coded-segment" style="border-left-color: ${color}">
        <div class="segment-header">
          <span class="segment-code">${escapeHtml(segment.code)}</span>
          <span class="segment-location">Line ${segment.lineIdx + 1}</span>
        </div>
        <div class="segment-text">
          <span class="segment-speaker">${escapeHtml(segment.speaker)}:</span>
          "${escapeHtml(segment.text)}"
        </div>
        <div class="segment-actions">
          <button onclick="removeSegmentCode(${idx})">Remove Code</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Remove code from segment
 */
function removeSegmentCode(segmentIdx) {
  const segment = state.codedSegments[segmentIdx];
  if (!segment) return;
  
  // Remove from transcript
  const line = state.transcript[segment.lineIdx];
  if (line) {
    line.codes = line.codes.filter(c => c !== segment.code);
  }
  
  // Remove segment
  state.codedSegments.splice(segmentIdx, 1);
  
  renderCodedSegments();
  renderTranscript();
  updateCodeCounts();
  updateCharts();
}

/**
 * Update code counts
 */
function updateCodeCounts() {
  state.codes.forEach(code => {
    code.count = state.codedSegments.filter(s => s.code === code.name).length;
  });
  renderCodeList();
}

/**
 * Perform search
 */
function performSearch() {
  const query = document.getElementById('search-input')?.value.trim();
  if (!query) return;
  
  const mode = document.getElementById('highlight-mode')?.value || 'case-insensitive';
  state.searchResults = [];
  
  state.transcript.forEach((line, idx) => {
    let matches = false;
    
    if (mode === 'exact') {
      matches = line.text.includes(query);
    } else if (mode === 'case-insensitive') {
      matches = line.text.toLowerCase().includes(query.toLowerCase());
    } else if (mode === 'regex') {
      try {
        const regex = new RegExp(query, 'i');
        matches = regex.test(line.text);
      } catch (e) {
        console.error('Invalid regex:', e);
      }
    }
    
    if (matches) {
      state.searchResults.push(idx);
    }
  });
  
  highlightSearchResults();
  updateMatchCount();
}

/**
 * Highlight search results
 */
function highlightSearchResults() {
  const lines = document.querySelectorAll('.transcript-line');
  lines.forEach(line => {
    const idx = parseInt(line.dataset.index);
    if (state.searchResults.includes(idx)) {
      line.classList.add('highlighted');
    } else {
      line.classList.remove('highlighted');
    }
  });
}

/**
 * Clear search
 */
function clearSearch() {
  document.getElementById('search-input').value = '';
  state.searchResults = [];
  document.querySelectorAll('.transcript-line').forEach(line => {
    line.classList.remove('highlighted');
  });
  updateMatchCount();
}

/**
 * Update match count display
 */
function updateMatchCount() {
  const counter = document.getElementById('match-count');
  if (!counter) return;
  
  if (state.searchResults.length > 0) {
    counter.textContent = `${state.searchResults.length} matches`;
  } else {
    counter.textContent = '';
  }
}

/**
 * Apply filters
 */
function applyFilters() {
  state.currentFilters.speaker = document.getElementById('speaker-filter')?.value || '';
  state.currentFilters.code = document.getElementById('code-filter')?.value || '';
  state.currentFilters.section = document.getElementById('section-filter')?.value || 'all';
  renderTranscript();
}

/**
 * Update speaker filter dropdown
 */
function updateSpeakerFilter() {
  const select = document.getElementById('speaker-filter');
  if (!select) return;
  
  const speakers = [...new Set(state.transcript.map(t => t.speaker))].sort();
  
  let html = '<option value="">All speakers</option>';
  speakers.forEach(speaker => {
    html += `<option value="${escapeHtml(speaker)}">${escapeHtml(speaker)}</option>`;
  });
  
  select.innerHTML = html;
}

/**
 * Update code filter dropdown
 */
function updateCodeFilter() {
  const select = document.getElementById('code-filter');
  if (!select) return;
  
  let html = '<option value="">All codes</option>';
  state.codes.forEach(code => {
    html += `<option value="${escapeHtml(code.name)}">${escapeHtml(code.name)}</option>`;
  });
  
  select.innerHTML = html;
}

/**
 * Update charts (placeholder)
 */
function updateCharts() {
  // Theme distribution
  const themeChart = document.getElementById('theme-chart');
  if (themeChart && state.codes.length > 0) {
    let html = '<div style="padding: 1rem;">';
    state.codes.forEach(code => {
      const percentage = state.transcript.length > 0 
        ? Math.round((code.count / state.transcript.length) * 100)
        : 0;
      html += `
        <div style="margin-bottom: 0.5rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span>${escapeHtml(code.name)}</span>
            <span>${code.count} (${percentage}%)</span>
          </div>
          <div style="background: #e5e7eb; height: 20px; border-radius: 4px; overflow: hidden;">
            <div style="background: ${code.color}; height: 100%; width: ${percentage}%;"></div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    themeChart.innerHTML = html;
  }
  
  // Speaker participation
  const speakerChart = document.getElementById('speaker-chart');
  if (speakerChart && state.transcript.length > 0) {
    const speakerCounts = {};
    state.transcript.forEach(line => {
      speakerCounts[line.speaker] = (speakerCounts[line.speaker] || 0) + 1;
    });
    
    let html = '<div style="padding: 1rem;">';
    Object.entries(speakerCounts).sort((a, b) => b[1] - a[1]).forEach(([speaker, count]) => {
      const percentage = Math.round((count / state.transcript.length) * 100);
      html += `
        <div style="margin-bottom: 0.5rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span>${escapeHtml(speaker)}</span>
            <span>${count} (${percentage}%)</span>
          </div>
          <div style="background: #e5e7eb; height: 20px; border-radius: 4px; overflow: hidden;">
            <div style="background: #3b82f6; height: 100%; width: ${percentage}%;"></div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    speakerChart.innerHTML = html;
  }
}

/**
 * Export coded segments
 */
function exportCodedSegments() {
  if (state.codedSegments.length === 0) {
    alert('No coded segments to export');
    return;
  }
  
  const includeContext = document.getElementById('include-context')?.checked;
  const includeTimestamps = document.getElementById('include-timestamps')?.checked;
  const includeSpeaker = document.getElementById('include-speaker')?.checked;
  
  let csv = 'Code,Line,';
  if (includeSpeaker) csv += 'Speaker,';
  if (includeTimestamps) csv += 'Timestamp,';
  csv += 'Text\n';
  
  state.codedSegments.forEach(segment => {
    csv += `"${segment.code}",${segment.lineIdx + 1},`;
    if (includeSpeaker) csv += `"${segment.speaker}",`;
    if (includeTimestamps) csv += `"${segment.timestamp}",`;
    csv += `"${segment.text}"\n`;
  });
  
  downloadCSV(csv, 'coded_segments.csv');
}

/**
 * Export codebook
 */
function exportCodebook() {
  if (state.codes.length === 0) {
    alert('No codes to export');
    return;
  }
  
  let csv = 'Code Name,Color,Count\n';
  state.codes.forEach(code => {
    csv += `"${code.name}","${code.color}",${code.count}\n`;
  });
  
  downloadCSV(csv, 'codebook.csv');
}

/**
 * Export report (placeholder)
 */
function exportReport() {
  alert('Report generation coming soon!');
}

/**
 * Download structured template
 */
function downloadStructuredTemplate() {
  const csv = 'speaker,timestamp,text\nModerator,00:00:00,"Welcome everyone to today\'s focus group."\nParticipant 1,00:00:15,"Thank you for having us."\nParticipant 2,00:00:20,"Happy to be here."';
  downloadCSV(csv, 'transcript_template.csv');
}

/**
 * Switch mode
 */
function switchMode(mode) {
  state.currentMode = mode;
  
  // Update buttons
  document.querySelectorAll('.mode-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Update panels
  document.querySelectorAll('.mode-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.mode === mode);
  });
}

/**
 * Load scenarios
 */
function loadScenarios() {
  const scenarios = [
    {
      id: 'sdsu-sustainability',
      name: 'SDSU Sustainability Focus Group',
      description: 'Focus group discussion about sustainability items with SDSU students',
      file: 'scenarios/sdsu_sustainability_focus_group.txt'
    }
  ];
  
  const select = document.getElementById('scenario-select');
  if (!select) return;
  
  let html = '<option value="">Choose a sample transcript...</option>';
  scenarios.forEach(scenario => {
    html += `<option value="${scenario.file}">${scenario.name}</option>`;
  });
  
  select.innerHTML = html;
  
  select.addEventListener('change', async (e) => {
    const file = e.target.value;
    if (!file) return;
    
    try {
      const response = await fetch(file);
      const content = await response.text();
      parseTranscript(content, 'plain');
      document.getElementById('scenario-feedback').textContent = `Loaded: ${scenarios.find(s => s.file === file)?.name}`;
    } catch (error) {
      document.getElementById('scenario-feedback').textContent = 'Error loading scenario';
      console.error('Error loading scenario:', error);
    }
  });
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Helper: Download CSV
 */
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Make functions global for onclick handlers
window.deleteCode = deleteCode;
window.removeSegmentCode = removeSegmentCode;
