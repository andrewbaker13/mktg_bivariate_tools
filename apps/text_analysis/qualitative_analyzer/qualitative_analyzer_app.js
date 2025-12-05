/**
 * Qualitative Analyzer Application
 * For analyzing focus group transcripts and qualitative data
 */

// Global state
const state = {
  transcript: [], // Array of { lineNumber, speaker, timestamp, text, codes: {}, lineType: 'dialogue'|'section-header'|'activity-marker'|'stage-direction', sectionId: null }
  codes: [], // Array of { name, color }
  currentMode: 'structured',
  selectedLines: new Set(),
  searchResults: [], // Array of { lineIdx, lineNumber, matches: [{start, end}] }
  currentMatchIndex: 0,
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
  },
  stopWords: [], // Loaded from stop_words.json
  defaultStopWords: [], // Backup of defaults
  codingMode: false,
  activeCode: null,
  speakerRoles: {} // { speakerName: 'speaker' | 'marker' }
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  loadScenarios();
  setupEventListeners();
  loadStopWords();
});

/**
 * Initialize the application
 */
function initializeApp() {
  console.log('Qualitative Analyzer initialized');
  
  // Set timestamps
  document.getElementById('created-date').textContent = '2025-12-04';
  document.getElementById('modified-date').textContent = new Date().toISOString().split('T')[0];
  
  // No default codes - users add their own
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
  document.getElementById('prev-match')?.addEventListener('click', () => navigateMatches(-1));
  document.getElementById('next-match')?.addEventListener('click', () => navigateMatches(1));
  document.getElementById('select-all-matches')?.addEventListener('click', selectAllMatches);
  
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
  
  // Coding mode toggle
  document.getElementById('coding-mode-toggle')?.addEventListener('change', toggleCodingMode);
  document.getElementById('active-code-select')?.addEventListener('change', (e) => {
    state.activeCode = e.target.value;
    updateApplyButtonState();
  });
  document.getElementById('apply-code-btn')?.addEventListener('click', applyCodeToSelectedLines);
  document.getElementById('clear-selections-btn')?.addEventListener('click', clearLineSelections);
  
  // Word frequency
  document.getElementById('analyze-frequency')?.addEventListener('click', analyzeWordFrequency);
  document.getElementById('customize-stopwords')?.addEventListener('click', () => {
    document.getElementById('stopwords-panel').open = true;
  });
  document.getElementById('save-stopwords')?.addEventListener('click', saveCustomStopWords);
  document.getElementById('reset-stopwords')?.addEventListener('click', resetStopWords);
  document.getElementById('select-all-words')?.addEventListener('click', selectAllWords);
  document.getElementById('deselect-all-words')?.addEventListener('click', deselectAllWords);
  document.getElementById('frequency-select-all')?.addEventListener('change', toggleAllWordCheckboxes);
  document.getElementById('create-codes-from-words')?.addEventListener('click', createCodesFromSelectedWords);
  
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
          codes: {},
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
    let lineCounter = 0; // Track actual transcript line numbers (excluding blank lines)
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return; // Skip blank lines but don't increment lineCounter
      
      lineCounter++; // Increment for each non-blank line
      
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
          startLine: lineCounter,
          endLine: lineCounter,
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
          startLine: lineCounter,
          endLine: lineCounter,
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
        state.sections[state.sections.length - 1].endLine = lineCounter;
      }
      
      state.transcript.push({
        lineNumber: lineCounter,
        speaker,
        timestamp,
        text,
        codes: {},
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
  
  const html = filteredTranscript.map((item, filteredIdx) => {
    const isSelected = state.selectedLines.has(item.lineNumber);
    const searchResult = state.searchResults.find(r => r.lineNumber === item.lineNumber);
    
    // Check which codes are applied (value = 1)
    const appliedCodes = item.codes ? Object.keys(item.codes).filter(codeName => item.codes[codeName] === 1) : [];
    const hasCodes = appliedCodes.length > 0;
    
    const classes = ['transcript-line'];
    classes.push(item.lineType);
    if (isSelected) classes.push('selected');
    if (searchResult) classes.push('has-search-match');
    if (hasCodes) classes.push('coded');
    if (state.codingMode) classes.push('coding-mode');
    
    let lineHtml = `<div class="${classes.join(' ')}" data-index="${filteredIdx}" data-line="${item.lineNumber}" data-section="${item.sectionId || ''}" id="line-${item.lineNumber}">`;
    
    // Add checkbox if in coding mode
    if (state.codingMode) {
      lineHtml += `<input type="checkbox" class="line-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleLineSelection(${item.lineNumber})" />`;
      lineHtml += '<div class="line-content">';
    }
    
    if (showLineNumbers) {
      lineHtml += `<span class="line-number">${item.lineNumber}</span>`;
    }
    
    if (item.speaker && item.lineType === 'dialogue') {
      lineHtml += `<span class="speaker-label">${escapeHtml(item.speaker)}:</span>`;
    }
    
    if (showTimestamps && item.timestamp) {
      lineHtml += `<span class="timestamp">${escapeHtml(item.timestamp)}</span>`;
    }
    
    // Apply highlighting to text
    let displayText = applyHighlightingToText(item.text, searchResult, appliedCodes);
    
    if (showStageDirections && item.lineType === 'dialogue') {
      // Highlight inline parentheticals like (laughs), (points at herself)
      displayText = displayText.replace(/\(([^)]+)\)/g, '<span class="inline-direction">($1)</span>');
    }
    
    lineHtml += `<span class="line-text">${displayText}</span>`;
    
    if (hasCodes) {
      const codeLabels = appliedCodes.map(codeName => {
        const code = state.codes.find(c => c.name === codeName);
        return code ? `<span class="code-label" style="background-color: ${code.color}20; color: ${code.color};">${escapeHtml(code.name)}</span>` : '';
      }).join('');
      lineHtml += `<div class="line-codes">${codeLabels}</div>`;
    }
    
    if (state.codingMode) {
      lineHtml += '</div>'; // Close line-content
    }
    
    lineHtml += '</div>';
    return lineHtml;
  }).join('');
  
  container.innerHTML = html;
}

/**
 * Apply search and code highlighting to text
 */
function applyHighlightingToText(text, searchResult, codes) {
  let result = escapeHtml(text);
  
  // Apply search highlighting
  if (searchResult && searchResult.matches) {
    // Sort matches by position (descending) to apply from end to start
    const sortedMatches = [...searchResult.matches].sort((a, b) => b.start - a.start);
    
    sortedMatches.forEach((match, idx) => {
      const before = result.substring(0, match.start);
      const matchText = result.substring(match.start, match.end);
      const after = result.substring(match.end);
      
      const isCurrentMatch = idx === state.currentMatchIndex;
      const highlightClass = isCurrentMatch ? 'search-highlight current' : 'search-highlight';
      
      result = `${before}<span class="${highlightClass}">${matchText}</span>${after}`;
    });
  }
  
  // Apply code highlighting (would be more sophisticated with actual position tracking)
  if (codes && codes.length > 0) {
    const codeColors = codes.map(codeName => {
      const code = state.codes.find(c => c.name === codeName);
      return code ? code.color : '#3b82f6';
    });
    
    // Convert hex to rgba for gradient (hex + alpha like #ff000010 isn't well-supported)
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // For now, add a subtle background to coded lines
    // In a full implementation, you'd track exact positions of coded segments
    let colorStyle;
    if (codeColors.length === 1) {
      colorStyle = `border-left: 3px solid ${codeColors[0]};`;
    } else {
      const gradientColors = codeColors.map(c => hexToRgba(c, 0.1)).join(', ');
      colorStyle = `border-left: 3px solid ${codeColors[0]}; background: linear-gradient(90deg, ${gradientColors});`;
    }
    
    result = `<span style="${colorStyle} padding-left: 8px; display: inline-block; width: 100%;">${result}</span>`;
  }
  
  return result;
}

/**
 * Apply current filters and return filtered transcript
 */
function applyCurrentFilters() {
  return state.transcript.filter(item => {
    if (state.currentFilters.speaker && state.currentFilters.speaker !== '' && item.speaker !== state.currentFilters.speaker) {
      return false;
    }
    // Check if item has the filtered code applied (codes is an object with codeName: 0 or 1)
    if (state.currentFilters.code && state.currentFilters.code !== '') {
      const hasCode = item.codes && item.codes[state.currentFilters.code] === 1;
      if (!hasCode) return false;
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
    alert('Code with this name already exists!');
    return;
  }
  
  state.codes.push({ name, color });
  
  // Add this code as a binary column to all transcript lines
  state.transcript.forEach(line => {
    if (!line.codes) line.codes = {};
    line.codes[name] = 0; // Default to not coded (0)
  });
  
  if (updateUI) {
    renderCodeList();
    updateCodeFilter();
    updateActiveCodeDropdown();
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
/**
 * Render coded segments summary
 */
function renderCodedSegments() {
  const container = document.getElementById('coded-segments');
  if (!container) return;
  
  // Generate summary by code
  const summaryByCode = {};
  state.transcript.forEach(line => {
    if (!line.codes) return;
    Object.keys(line.codes).forEach(codeName => {
      if (line.codes[codeName] === 1) {
        if (!summaryByCode[codeName]) {
          summaryByCode[codeName] = [];
        }
        summaryByCode[codeName].push(line);
      }
    });
  });
  
  if (Object.keys(summaryByCode).length === 0) {
    container.innerHTML = '<p class="hint">📝 After creating codes, enable Coding Mode in the transcript to assign them</p>';
    return;
  }
  
  let html = '';
  Object.keys(summaryByCode).forEach(codeName => {
    const code = state.codes.find(c => c.name === codeName);
    const color = code?.color || '#3b82f6';
    const lines = summaryByCode[codeName];
    
    html += `
      <div class="coded-segment-group" style="border-left: 4px solid ${color}; margin-bottom: 1rem; padding-left: 0.75rem;">
        <div class="segment-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span class="segment-code" style="font-weight: 600; color: ${color};">${escapeHtml(codeName)}</span>
          <span class="segment-count" style="background: ${color}20; color: ${color}; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">${lines.length} line${lines.length === 1 ? '' : 's'}</span>
        </div>
        <div class="segment-lines" style="font-size: 0.9rem; color: #6b7280;">
          ${lines.slice(0, 3).map(line => `
            <div style="margin-bottom: 0.25rem;">
              <strong>Line ${line.lineNumber}:</strong> ${escapeHtml(line.speaker || '')}: ${escapeHtml(line.text.substring(0, 80))}${line.text.length > 80 ? '...' : ''}
            </div>
          `).join('')}
          ${lines.length > 3 ? `<div style="font-style: italic;">...and ${lines.length - 3} more</div>` : ''}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Perform search with wildcards and Boolean operators
 */
function performSearch() {
  const query = document.getElementById('search-input')?.value.trim();
  if (!query) {
    clearSearch();
    return;
  }
  
  const mode = document.getElementById('highlight-mode')?.value || 'case-insensitive';
  state.searchResults = [];
  state.currentMatchIndex = 0;
  
  // Check for Boolean operators
  const hasAND = query.toUpperCase().includes(' AND ');
  const hasOR = query.toUpperCase().includes(' OR ');
  
  if (hasAND || hasOR) {
    performBooleanSearch(query, hasAND, hasOR, mode);
  } else {
    performSimpleSearch(query, mode);
  }
  
  highlightSearchResults();
  updateMatchCount();
  updateNavigationButtons();
  updateSelectAllMatchesButton();
}

/**
 * Perform simple search with wildcard support
 */
function performSimpleSearch(query, mode) {
  // Convert wildcards to regex
  let pattern = query;
  if (query.includes('*')) {
    pattern = query.replace(/\*/g, '\\w*');
  } else {
    pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special chars
  }
  
  const flags = mode === 'exact' ? '' : 'gi';
  let regex;
  
  try {
    if (mode === 'regex') {
      regex = new RegExp(query, 'i');
    } else {
      regex = new RegExp(`\\b${pattern}\\b`, flags);
    }
  } catch (e) {
    console.error('Invalid search pattern:', e);
    alert('Invalid search pattern');
    return;
  }
  
  state.transcript.forEach((line, idx) => {
    const matches = [...line.text.matchAll(regex)];
    if (matches.length > 0) {
      state.searchResults.push({
        lineIdx: idx,
        lineNumber: line.lineNumber,
        matches: matches.map(m => ({ start: m.index, end: m.index + m[0].length, text: m[0] }))
      });
    }
  });
}

/**
 * Perform Boolean search (AND / OR)
 */
function performBooleanSearch(query, hasAND, hasOR, mode) {
  const operator = hasAND ? ' AND ' : ' OR ';
  const terms = query.split(new RegExp(operator, 'i')).map(t => t.trim());
  
  state.transcript.forEach((line, idx) => {
    const lineText = mode === 'exact' ? line.text : line.text.toLowerCase();
    const results = [];
    
    if (hasAND) {
      // All terms must match
      const allMatch = terms.every(term => {
        const searchTerm = mode === 'exact' ? term : term.toLowerCase();
        return lineText.includes(searchTerm);
      });
      
      if (allMatch) {
        // Find positions of all terms
        terms.forEach(term => {
          const searchTerm = mode === 'exact' ? term : term.toLowerCase();
          let pos = 0;
          while ((pos = lineText.indexOf(searchTerm, pos)) !== -1) {
            results.push({ start: pos, end: pos + term.length, text: line.text.substring(pos, pos + term.length) });
            pos += term.length;
          }
        });
      }
    } else {
      // Any term can match (OR)
      terms.forEach(term => {
        const searchTerm = mode === 'exact' ? term : term.toLowerCase();
        let pos = 0;
        while ((pos = lineText.indexOf(searchTerm, pos)) !== -1) {
          results.push({ start: pos, end: pos + term.length, text: line.text.substring(pos, pos + term.length) });
          pos += term.length;
        }
      });
    }
    
    if (results.length > 0) {
      state.searchResults.push({ lineIdx: idx, lineNumber: line.lineNumber, matches: results });
    }
  });
}

/**
 * Highlight search results in transcript text
 */
function highlightSearchResults() {
  // Re-render transcript to apply highlighting
  renderTranscript();
}

/**
 * Clear search
 */
function clearSearch() {
  document.getElementById('search-input').value = '';
  state.searchResults = [];
  state.currentMatchIndex = 0;
  renderTranscript();
  updateMatchCount();
  updateNavigationButtons();
  updateSelectAllMatchesButton();
}

/**
 * Update match count display
 */
function updateMatchCount() {
  const counter = document.getElementById('match-count');
  if (!counter) return;
  
  const totalMatches = state.searchResults.reduce((sum, r) => sum + r.matches.length, 0);
  
  if (totalMatches === 0 && document.getElementById('search-input')?.value.trim()) {
    counter.textContent = '0 matches found';
    counter.style.color = '#ef4444'; // Red for no matches
  } else if (totalMatches > 0) {
    counter.textContent = `${totalMatches} match${totalMatches === 1 ? '' : 'es'} found`;
    counter.style.color = '#10b981'; // Green for matches
  } else {
    counter.textContent = '';
  }
}

/**
 * Update navigation button states
 */
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-match');
  const nextBtn = document.getElementById('next-match');
  const hasMatches = state.searchResults.length > 0;
  
  if (prevBtn) prevBtn.disabled = !hasMatches;
  if (nextBtn) nextBtn.disabled = !hasMatches;
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
  
  // Speaker participation - horizontal bar chart
  const speakerChart = document.getElementById('speaker-chart');
  if (speakerChart && state.transcript.length > 0) {
    const speakerCounts = {};
    state.transcript.forEach(line => {
      if (line.speaker) {
        speakerCounts[line.speaker] = (speakerCounts[line.speaker] || 0) + 1;
      }
    });
    
    // Initialize speaker roles if not set
    Object.keys(speakerCounts).forEach(speaker => {
      if (!(speaker in state.speakerRoles)) {
        // Auto-detect: if it looks like a marker (all caps, contains numbers, etc.)
        const isLikelyMarker = /^(ITEM|ACTIVITY|PART|SECTION|Setting|Recorder|WARM|FOCUS|MAIN|SEGUE|CLOSING|MODERATOR)/i.test(speaker) ||
                              /^\d/.test(speaker) ||
                              /^[A-Z\s\-–]+$/.test(speaker);
        state.speakerRoles[speaker] = isLikelyMarker ? 'marker' : 'speaker';
      }
    });
    
    // Render speaker role manager
    renderSpeakerRoleManager(speakerCounts);
    
    // Filter to only speakers (not markers)
    const speakersOnly = Object.entries(speakerCounts)
      .filter(([speaker]) => state.speakerRoles[speaker] === 'speaker')
      .sort((a, b) => b[1] - a[1]);
    
    if (speakersOnly.length === 0) {
      speakerChart.innerHTML = '<p class="chart-note">No speakers found. Check speaker role assignments above.</p>';
    } else {
      const maxCount = Math.max(...speakersOnly.map(([, count]) => count));
      const totalSpeakerLines = speakersOnly.reduce((sum, [, count]) => sum + count, 0);
      
      let html = '<div class="speaker-bar-chart">';
      speakersOnly.forEach(([speaker, count]) => {
        const percentage = Math.round((count / totalSpeakerLines) * 100);
        const barWidth = Math.round((count / maxCount) * 100);
        html += `
          <div class="speaker-bar-row">
            <div class="speaker-bar-label">${escapeHtml(speaker)}</div>
            <div class="speaker-bar-container">
              <div class="speaker-bar" style="width: ${barWidth}%;"></div>
              <span class="speaker-bar-value">${count} (${percentage}%)</span>
            </div>
          </div>
        `;
      });
      html += '</div>';
      speakerChart.innerHTML = html;
    }
  }
}

/**
 * Render speaker role manager UI
 */
function renderSpeakerRoleManager(speakerCounts) {
  const container = document.getElementById('speaker-role-list');
  if (!container) return;
  
  const sorted = Object.entries(speakerCounts).sort((a, b) => b[1] - a[1]);
  
  let html = '<div class="speaker-roles-grid">';
  sorted.forEach(([speaker, count]) => {
    const role = state.speakerRoles[speaker] || 'speaker';
    html += `
      <div class="speaker-role-item">
        <span class="speaker-role-name">${escapeHtml(speaker)} (${count})</span>
        <select class="speaker-role-select" data-speaker="${escapeHtml(speaker)}" onchange="updateSpeakerRole(this)">
          <option value="speaker" ${role === 'speaker' ? 'selected' : ''}>👤 Speaker</option>
          <option value="marker" ${role === 'marker' ? 'selected' : ''}>📍 Marker</option>
        </select>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Update speaker role and refresh chart
 */
function updateSpeakerRole(selectElement) {
  const speaker = selectElement.dataset.speaker;
  const role = selectElement.value;
  state.speakerRoles[speaker] = role;
  updateCharts();
}

/**
 * Export full transcript with binary code columns
 */
function exportCodedSegments() {
  if (state.transcript.length === 0) {
    alert('No transcript to export');
    return;
  }
  
  // Build CSV header: speaker, timestamp, text, then all code columns
  let csv = 'LineNumber,Speaker,Timestamp,Text';
  state.codes.forEach(code => {
    csv += `,${code.name.replace(/,/g, '_')}`;
  });
  csv += '\n';
  
  // Add each transcript line
  state.transcript.forEach(line => {
    csv += `${line.lineNumber},"${(line.speaker || '').replace(/"/g, '""')}","${(line.timestamp || '').replace(/"/g, '""')}","${line.text.replace(/"/g, '""')}"`;
    
    // Add 0 or 1 for each code
    state.codes.forEach(code => {
      const value = line.codes && line.codes[code.name] ? line.codes[code.name] : 0;
      csv += `,${value}`;
    });
    csv += '\n';
  });
  
  const filename = `coded_transcript_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
  
  alert(`Exported ${state.transcript.length} lines with ${state.codes.length} code column(s). You can re-import this file to continue coding later!`);
}

/**
 * Export codebook
 */
function exportCodebook() {
  if (state.codes.length === 0) {
    alert('No codes to export');
    return;
  }
  
  let csv = 'Code Name,Color,Line Count\n';
  state.codes.forEach(code => {
    const count = state.transcript.filter(line => line.codes && line.codes[code.name] === 1).length;
    csv += `"${code.name}","${code.color}",${count}\n`;
  });
  
  downloadCSV(csv, 'codebook.csv');
}

/**
 * Export summary report
 */
function exportReport() {
  if (state.codes.length === 0) {
    alert('Create and apply codes first!');
    return;
  }
  
  let report = '=== CODE SUMMARY REPORT ===\n\n';
  report += `Total Lines: ${state.transcript.length}\n`;
  report += `Total Codes: ${state.codes.length}\n\n`;
  
  state.codes.forEach(code => {
    const codedLines = state.transcript.filter(line => line.codes && line.codes[code.name] === 1);
    const percentage = ((codedLines.length / state.transcript.length) * 100).toFixed(1);
    
    report += `\n--- ${code.name} ---\n`;
    report += `Lines Coded: ${codedLines.length} (${percentage}%)\n`;
    report += `Sample excerpts:\n`;
    
    codedLines.slice(0, 5).forEach(line => {
      report += `  Line ${line.lineNumber}: ${line.text.substring(0, 100)}${line.text.length > 100 ? '...' : ''}\n`;
    });
    
    if (codedLines.length > 5) {
      report += `  ...and ${codedLines.length - 5} more\n`;
    }
  });
  
  const blob = new Blob([report], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `code_summary_${new Date().toISOString().split('T')[0]}.txt`;
  link.click();
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
 * Load stop words from JSON file
 */
async function loadStopWords() {
  try {
    const response = await fetch('stop_words.json');
    const data = await response.json();
    state.stopWords = data.stop_words || [];
    state.defaultStopWords = [...state.stopWords];
    
    // Populate textarea
    const textarea = document.getElementById('stopwords-textarea');
    if (textarea) {
      textarea.value = state.stopWords.join(', ');
    }
  } catch (error) {
    console.error('Error loading stop words:', error);
    // Fallback stop words
    state.stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'uh', 'um', 'like', 'yeah', 'okay', 'ok'];
    state.defaultStopWords = [...state.stopWords];
  }
}

/**
 * Save custom stop words
 */
function saveCustomStopWords() {
  const textarea = document.getElementById('stopwords-textarea');
  if (!textarea) return;
  
  const text = textarea.value.trim();
  state.stopWords = text.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
  
  alert('Custom stop-words saved. Re-run word frequency analysis to see changes.');
}

/**
 * Reset stop words to defaults
 */
function resetStopWords() {
  state.stopWords = [...state.defaultStopWords];
  const textarea = document.getElementById('stopwords-textarea');
  if (textarea) {
    textarea.value = state.stopWords.join(', ');
  }
  alert('Stop-words reset to defaults.');
}

/**
 * Analyze word frequency
 */
function analyzeWordFrequency() {
  if (state.transcript.length === 0) {
    alert('Please upload a transcript first.');
    return;
  }
  
  // Combine all text
  const allText = state.transcript
    .map(line => line.text)
    .join(' ')
    .toLowerCase();
  
  // Tokenize (simple word extraction)
  const words = allText.match(/\b[a-z]+\b/g) || [];
  
  // Count frequencies, excluding stop words
  const frequency = {};
  words.forEach(word => {
    if (!state.stopWords.includes(word) && word.length > 2) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });
  
  // Sort by frequency
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  // Calculate total for percentages
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  
  // Render table
  const tbody = document.getElementById('frequency-tbody');
  if (!tbody) return;
  
  let html = '';
  sorted.forEach(([word, count], idx) => {
    const percentage = ((count / total) * 100).toFixed(1);
    html += `
      <tr>
        <td><input type="checkbox" class="word-checkbox" data-word="${escapeHtml(word)}" onchange="updateWordSelectionCount()"></td>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(word)}</strong></td>
        <td>${count}</td>
        <td>${percentage}%</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  document.getElementById('frequency-results').classList.remove('hidden');
  updateWordSelectionCount();
}

/**
 * Update word selection count and button state
 */
function updateWordSelectionCount() {
  const checkboxes = document.querySelectorAll('.word-checkbox:checked');
  const count = checkboxes.length;
  const countDisplay = document.getElementById('words-selected-count');
  const createBtn = document.getElementById('create-codes-from-words');
  
  if (countDisplay) {
    countDisplay.textContent = count > 0 ? `${count} word${count === 1 ? '' : 's'} selected` : '';
  }
  
  if (createBtn) {
    createBtn.disabled = count === 0;
  }
}

/**
 * Select all words in frequency table
 */
function selectAllWords() {
  document.querySelectorAll('.word-checkbox').forEach(cb => cb.checked = true);
  const headerCb = document.getElementById('frequency-select-all');
  if (headerCb) headerCb.checked = true;
  updateWordSelectionCount();
}

/**
 * Deselect all words in frequency table
 */
function deselectAllWords() {
  document.querySelectorAll('.word-checkbox').forEach(cb => cb.checked = false);
  const headerCb = document.getElementById('frequency-select-all');
  if (headerCb) headerCb.checked = false;
  updateWordSelectionCount();
}

/**
 * Toggle all word checkboxes via header checkbox
 */
function toggleAllWordCheckboxes(e) {
  const checked = e.target.checked;
  document.querySelectorAll('.word-checkbox').forEach(cb => cb.checked = checked);
  updateWordSelectionCount();
}

/**
 * Create codes from selected words in frequency table
 */
function createCodesFromSelectedWords() {
  const selectedCheckboxes = document.querySelectorAll('.word-checkbox:checked');
  if (selectedCheckboxes.length === 0) {
    alert('Please select at least one word.');
    return;
  }
  
  // Color palette for auto-generated codes
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];
  
  let codesCreated = 0;
  let codesSkipped = 0;
  
  selectedCheckboxes.forEach((cb, idx) => {
    const word = cb.dataset.word;
    
    // Check if code already exists
    if (state.codes.find(c => c.name.toLowerCase() === word.toLowerCase())) {
      codesSkipped++;
      return;
    }
    
    // Create new code
    const color = colors[(state.codes.length + idx) % colors.length];
    state.codes.push({
      name: word,
      color: color
    });
    
    // Initialize this code for all transcript lines
    state.transcript.forEach(line => {
      if (!line.codes) line.codes = {};
      line.codes[word] = 0;
    });
    
    codesCreated++;
  });
  
  // Update UI
  renderCodeList();
  updateCodeFilter();
  updateActiveCodeDropdown();
  
  // Deselect all words
  deselectAllWords();
  
  // Show feedback
  let message = `Created ${codesCreated} new code${codesCreated === 1 ? '' : 's'}`;
  if (codesSkipped > 0) {
    message += ` (${codesSkipped} already existed)`;
  }
  alert(message);
}

/**
 * Handle text selection in transcript
 */
function handleTextSelection(e) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (!selectedText || selectedText.length < 3) {
    return;
  }
  
  // Check if selection is within transcript
  const transcriptContainer = document.getElementById('transcript-content');
  if (!transcriptContainer || !transcriptContainer.contains(selection.anchorNode)) {
    return;
  }
  
  // Find which line was selected
  let lineElement = selection.anchorNode;
  while (lineElement && !lineElement.classList?.contains('transcript-line')) {
    lineElement = lineElement.parentElement;
  }
  
  if (!lineElement) return;
  
  const lineIdx = parseInt(lineElement.dataset.index);
  if (isNaN(lineIdx)) return;
  
  // Store selection state
  state.selectionState = {
    active: true,
    lineIdx,
    text: selectedText
  };
  
  // Show code assignment popup
  showCodePopup(e.pageX, e.pageY);
}

/**
 * Show code assignment popup
 */
function showCodePopup(x, y) {
  if (state.codes.length === 0) {
    alert('Please add at least one code first.');
    return;
  }
  
  const popup = document.getElementById('code-assignment-popup');
  if (!popup) return;
  
  // Position popup
  popup.style.left = `${x + 10}px`;
  popup.style.top = `${y + 10}px`;
  
  // Populate checkboxes
  const checkboxContainer = document.getElementById('code-checkboxes');
  if (!checkboxContainer) return;
  
  let html = '';
  state.codes.forEach((code, idx) => {
    html += `
      <label class="code-checkbox-item">
        <input type="checkbox" data-code-idx="${idx}" value="${escapeHtml(code.name)}">
        <div class="code-checkbox-color" style="background-color: ${code.color}"></div>
        <span class="code-checkbox-label">${escapeHtml(code.name)}</span>
      </label>
    `;
  });
  
  checkboxContainer.innerHTML = html;
  popup.classList.remove('hidden');
}

/**
 * Close code assignment popup
 */
function closeCodePopup() {
  const popup = document.getElementById('code-assignment-popup');
  if (popup) {
    popup.classList.add('hidden');
  }
  state.selectionState = {
    active: false,
    lineIdx: null,
    text: ''
  };
}

/**
 * Save code assignment
 */
function saveCodeAssignment() {
  if (!state.selectionState.active) return;
  
  const checkboxes = document.querySelectorAll('#code-checkboxes input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    alert('Please select at least one code.');
    return;
  }
  
  const selectedCodes = Array.from(checkboxes).map(cb => cb.value);
  const lineIdx = state.selectionState.lineIdx;
  const line = state.transcript[lineIdx];
  
  if (!line) return;
  
  // Add codes to the line
  if (!line.codes) line.codes = [];
  
  selectedCodes.forEach(codeName => {
    if (!line.codes.includes(codeName)) {
      line.codes.push(codeName);
      
      // Add to coded segments
      state.codedSegments.push({
        lineIdx,
        speaker: line.speaker,
        text: state.selectionState.text,
        code: codeName
      });
    }
  });
  
  // Update UI
  closeCodePopup();
  renderCodedSegments();
  renderTranscript();
  updateCodeCounts();
  updateCharts();
}

/**
 * Navigate search matches (prev/next)
 */
function navigateMatches(direction) {
  if (state.searchResults.length === 0) return;
  
  state.currentMatchIndex += direction;
  
  // Wrap around
  if (state.currentMatchIndex < 0) {
    state.currentMatchIndex = state.searchResults.length - 1;
  } else if (state.currentMatchIndex >= state.searchResults.length) {
    state.currentMatchIndex = 0;
  }
  
  highlightSearchResults();
  scrollToCurrentMatch();
  updateMatchCount();
}

/**
 * Scroll to current search match
 */
function scrollToCurrentMatch() {
  const highlights = document.querySelectorAll('.search-highlight');
  if (highlights.length === 0) return;
  
  // Remove 'current' class from all
  highlights.forEach(h => h.classList.remove('current'));
  
  // Add to current match
  if (highlights[state.currentMatchIndex]) {
    highlights[state.currentMatchIndex].classList.add('current');
    highlights[state.currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Toggle coding mode
 */
function toggleCodingMode(e) {
  state.codingMode = e.target.checked;
  const codingControls = document.getElementById('coding-controls');
  
  if (codingControls) {
    codingControls.style.display = state.codingMode ? 'flex' : 'none';
  }
  
  // Re-render transcript to show/hide checkboxes
  renderTranscript();
  
  if (state.codingMode) {
    updateActiveCodeDropdown();
  }
  
  updateSelectAllMatchesButton();
}

/**
 * Update active code dropdown
 */
function updateActiveCodeDropdown() {
  const select = document.getElementById('active-code-select');
  if (!select) return;
  
  if (state.codes.length === 0) {
    select.innerHTML = '<option value="">-- Create codes first! --</option>';
    select.disabled = true;
  } else {
    let html = '<option value="">-- Select a code --</option>';
    state.codes.forEach(code => {
      html += `<option value="${escapeHtml(code.name)}">${escapeHtml(code.name)}</option>`;
    });
    select.innerHTML = html;
    select.disabled = false;
  }
}

/**
 * Update apply button state
 */
function updateApplyButtonState() {
  const btn = document.getElementById('apply-code-btn');
  if (!btn) return;
  
  const hasSelection = state.selectedLines.size > 0;
  const hasActiveCode = state.activeCode && state.activeCode !== '';
  
  btn.disabled = !(hasSelection && hasActiveCode);
}

/**
 * Apply code to selected lines
 */
function applyCodeToSelectedLines() {
  if (!state.activeCode || state.selectedLines.size === 0) return;
  
  const codeName = state.activeCode;
  
  // Apply code (set to 1) for all selected lines
  state.selectedLines.forEach(lineNumber => {
    const line = state.transcript.find(l => l.lineNumber === lineNumber);
    if (line) {
      if (!line.codes) line.codes = {};
      line.codes[codeName] = 1;
    }
  });
  
  // Clear selections
  clearLineSelections();
  
  // Update UI
  renderTranscript();
  renderCodedSegments();
  updateCodeCounts();
  updateCharts();
  
  alert(`Applied "${codeName}" to ${state.selectedLines.size} line(s)`);
}

/**
 * Clear line selections
 */
function clearLineSelections() {
  state.selectedLines.clear();
  updateSelectionCount();
  updateApplyButtonState();
  renderTranscript();
}

/**
 * Toggle line selection
 */
function toggleLineSelection(lineNumber) {
  if (state.selectedLines.has(lineNumber)) {
    state.selectedLines.delete(lineNumber);
  } else {
    state.selectedLines.add(lineNumber);
  }
  updateSelectionCount();
  updateApplyButtonState();
}

/**
 * Update selection count display
 */
function updateSelectionCount() {
  const counter = document.getElementById('selection-count');
  if (!counter) return;
  
  const count = state.selectedLines.size;
  if (count > 0) {
    counter.textContent = `${count} line${count === 1 ? '' : 's'} selected`;
  } else {
    counter.textContent = '';
  }
}

/**
 * Update Select All Matches button visibility
 */
function updateSelectAllMatchesButton() {
  const button = document.getElementById('select-all-matches');
  if (!button) return;
  
  // Show button only when coding mode is active AND there are search results
  const hasMatches = state.searchResults.length > 0;
  button.style.display = (state.codingMode && hasMatches) ? 'inline-block' : 'none';
}

/**
 * Select all lines that match the current search
 */
function selectAllMatches() {
  if (!state.codingMode || state.searchResults.length === 0) return;
  
  // Clear existing selections
  state.selectedLines.clear();
  
  // Add all lines with search matches (using lineNumber)
  state.searchResults.forEach(result => {
    state.selectedLines.add(result.lineNumber);
  });
  
  // Update UI
  renderTranscript();
  updateSelectionCount();
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
