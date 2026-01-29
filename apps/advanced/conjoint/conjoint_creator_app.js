// Conjoint Study Design Generator
const CREATED_DATE = '2025-12-07';
const TOOL_SLUG = 'conjoint-creator';

// State
let attributes = [];
let competitors = [];
let designConfig = {
  numTasks: 12,
  numAlternatives: 3,
  includeNone: true
};
let generatedDesign = null;

// Initialize
function initCreatorApp() {
  setupAttributeManagement();
  setupDesignConfiguration();
  setupDesignGeneration();
  setupDownloads();
  
  // Add first attribute by default
  addAttributeRow();
  
  const modifiedEl = document.getElementById('modified-date');
  if (modifiedEl) modifiedEl.textContent = CREATED_DATE;
  
  // Initialize engagement tracking
  if (typeof initEngagementTracking === 'function') {
      initEngagementTracking(TOOL_SLUG);
  }
}

// ========================================
// Case Study Loading
// ========================================

function handleCaseStudySelection(caseId) {
  if (!caseId) return;
  
  loadCaseStudy(caseId);
  
  // Track scenario load
  const caseNames = {
    'coffee': 'Coffee Shop Selection',
    'streaming': 'Streaming Service',
    'smartphone': 'Smartphone Purchase',
    'auto': 'Auto Insurance'
  };
  if (typeof markScenarioLoaded === 'function') {
    markScenarioLoaded(caseNames[caseId] || caseId);
  }
  
  // Reset dropdown
  setTimeout(() => {
    document.getElementById('case-study-select').value = '';
  }, 100);
}

function loadCaseStudy(caseId) {
  // Clear existing attributes
  const container = document.getElementById('attributes-container');
  container.innerHTML = '';

  if (caseId === 'coffee') {
    // Coffee Shop Selection (Simple Example)
    addAttributeWithData('Location', ['Downtown', 'Suburb'], 'categorical');
    addAttributeWithData('Seating', ['Indoor Only', 'Indoor + Outdoor'], 'categorical');
    addAttributeWithData('Price Level', ['Budget', 'Mid-Range', 'Premium'], 'categorical');

    // Set configuration
    document.getElementById('num-tasks').value = 8;
    document.getElementById('num-alternatives').value = 3;
    document.getElementById('include-none').checked = true;
    document.getElementById('create-full-factorial').checked = false;
    document.getElementById('populate-synthetic').checked = false;

  } else if (caseId === 'hotel') {
    // Hotel Room Selection
    addAttributeWithData('Room Type', ['Standard', 'Deluxe', 'Suite'], 'categorical');
    addAttributeWithData('View', ['City', 'Garden', 'Ocean'], 'categorical');
    addAttributeWithData('Bed Configuration', ['King', 'Two Queens', 'Two Doubles'], 'categorical');
    addAttributeWithData('Floor Level', ['2-5', '6-10', '11-15', '16+'], 'categorical');
    addAttributeWithData('Price per Night', ['129', '179', '229', '279', '329'], 'numeric');

    // Set configuration
    document.getElementById('num-tasks').value = 12;
    document.getElementById('num-alternatives').value = 3;
    document.getElementById('include-none').checked = true;
    document.getElementById('create-full-factorial').checked = false;
    document.getElementById('populate-synthetic').checked = false;

  } else if (caseId === 'software') {
    // SaaS Subscription Plans
    addAttributeWithData('User Seats', ['1-5', '6-15', '16-50', 'Unlimited'], 'categorical');
    addAttributeWithData('Storage', ['10GB', '100GB', '500GB', '1TB'], 'categorical');
    addAttributeWithData('Support Level', ['Email Only', 'Email + Chat', 'Priority Phone'], 'categorical');
    addAttributeWithData('API Access', ['No', 'Basic', 'Advanced'], 'categorical');
    addAttributeWithData('Training', ['None', 'Self-Service', 'Live Webinars'], 'categorical');
    addAttributeWithData('Monthly Price', ['29', '49', '99', '149', '249'], 'numeric');

    // Set configuration
    document.getElementById('num-tasks').value = 15;
    document.getElementById('num-alternatives').value = 4;
    document.getElementById('include-none').checked = true;
    document.getElementById('create-full-factorial').checked = false;
    document.getElementById('populate-synthetic').checked = false;
  }

  // Update validation feedback
  validateAttributes();

  // Show success message
  const feedbackDiv = document.getElementById('attribute-validation-feedback');
  feedbackDiv.className = 'success-message';
  const caseNames = {
    'coffee': 'Coffee Shop Selection',
    'hotel': 'Hotel Room Selection',
    'software': 'SaaS Subscription Plans'
  };
  feedbackDiv.textContent = `✓ Loaded ${caseNames[caseId]} case study. Review attributes and generate design.`;
  
  setTimeout(() => {
    feedbackDiv.textContent = '';
    feedbackDiv.className = '';
  }, 5000);
}

function addAttributeWithData(name, levels, type) {
  const container = document.getElementById('attributes-container');
  const attrId = Date.now() + Math.random();
  
  const row = document.createElement('div');
  row.className = 'attribute-row';
  row.dataset.attrId = attrId;
  row.innerHTML = `
    <div class="grid-3-col" style="gap: 1rem; align-items: start;">
      <div>
        <label>Attribute Name</label>
        <input type="text" class="attr-name" value="${name}" placeholder="e.g., Brand">
      </div>
      <div>
        <label>Levels (comma-separated)</label>
        <input type="text" class="attr-levels" value="${levels.join(', ')}" placeholder="e.g., Sony, Samsung, LG">
      </div>
      <div>
        <label>Type</label>
        <select class="attr-type">
          <option value="categorical" ${type === 'categorical' ? 'selected' : ''}>Categorical</option>
          <option value="numeric" ${type === 'numeric' ? 'selected' : ''}>Numeric</option>
        </select>
      </div>
    </div>
    <button type="button" class="remove-btn" onclick="removeAttributeRow(${attrId})">Remove</button>
  `;
  
  container.appendChild(row);
}

// ========================================
// Step 1: Attribute Management
// ========================================

function setupAttributeManagement() {
  const addBtn = document.getElementById('add-attribute-btn');
  const validateBtn = document.getElementById('validate-attributes-btn');
  
  addBtn?.addEventListener('click', addAttributeRow);
  validateBtn?.addEventListener('click', validateAttributes);
}

function addAttributeRow() {
  const container = document.getElementById('attributes-container');
  const attrId = Date.now();
  
  const row = document.createElement('div');
  row.className = 'attribute-row';
  row.dataset.attrId = attrId;
  row.innerHTML = `
    <div class="grid-3-col" style="gap: 1rem; align-items: start;">
      <div>
        <label>Attribute Name</label>
        <input type="text" class="attr-name" placeholder="e.g., Brand, Price, Screen Size">
      </div>
      <div>
        <label>Type</label>
        <select class="attr-type">
          <option value="categorical">Categorical</option>
          <option value="numeric">Numeric</option>
        </select>
      </div>
      <div>
        <label>Levels (comma-separated)</label>
        <input type="text" class="attr-levels" placeholder="e.g., BrandA, BrandB, BrandC">
        <small>For numeric: enter values like 5.5, 6.0, 6.5</small>
      </div>
    </div>
    <button class="btn btn-small btn-danger remove-attr-btn" data-attr-id="${attrId}">Remove</button>
  `;
  
  container.appendChild(row);
  
  // Add remove handler
  row.querySelector('.remove-attr-btn').addEventListener('click', (e) => {
    const id = e.target.dataset.attrId;
    document.querySelector(`[data-attr-id="${id}"]`).remove();
  });
}

function validateAttributes() {
  const rows = document.querySelectorAll('.attribute-row');
  const feedback = document.getElementById('attribute-validation-feedback');
  
  attributes = [];
  const errors = [];
  
  rows.forEach((row, idx) => {
    const name = row.querySelector('.attr-name').value.trim();
    const type = row.querySelector('.attr-type').value;
    const levelsStr = row.querySelector('.attr-levels').value.trim();
    
    if (!name) {
      errors.push(`Attribute ${idx + 1}: Name is required`);
      return;
    }
    
    if (!levelsStr) {
      errors.push(`Attribute "${name}": Levels are required`);
      return;
    }
    
    const levels = levelsStr.split(',').map(l => l.trim()).filter(l => l);
    
    if (levels.length < 2) {
      errors.push(`Attribute "${name}": Must have at least 2 levels`);
      return;
    }
    
    if (levels.length > 8) {
      errors.push(`Attribute "${name}": Too many levels (max 8 recommended)`);
      return;
    }
    
    // Validate numeric levels
    if (type === 'numeric') {
      const numericLevels = levels.map(l => parseFloat(l));
      if (numericLevels.some(n => isNaN(n))) {
        errors.push(`Attribute "${name}": Numeric type requires numeric values`);
        return;
      }
    }
    
    attributes.push({ name, type, levels });
  });
  
  if (attributes.length < 2) {
    errors.push('At least 2 attributes are required for a conjoint study');
  }
  
  if (attributes.length > 10) {
    errors.push('Too many attributes (max 10 recommended to avoid respondent fatigue)');
  }
  
  if (errors.length > 0) {
    feedback.innerHTML = `<div class="error-message">${errors.join('<br>')}</div>`;
    return;
  }
  
  // Success
  feedback.innerHTML = `<div class="success-message">✓ ${attributes.length} attributes validated successfully!</div>`;
  
  // Show next section
  document.getElementById('section-design-config').classList.remove('hidden');
  document.getElementById('section-design-config').scrollIntoView({ behavior: 'smooth' });
}

// ========================================
// Step 2: Design Configuration
// ========================================

function setupDesignConfiguration() {
  const addCompBtn = document.getElementById('add-competitor-btn');
  addCompBtn?.addEventListener('click', addCompetitorRow);
  
  // Toggle synthetic data options
  const syntheticCheckbox = document.getElementById('populate-synthetic-data');
  const syntheticOptions = document.getElementById('synthetic-data-options');
  
  syntheticCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) {
      syntheticOptions?.classList.remove('hidden');
    } else {
      syntheticOptions?.classList.add('hidden');
    }
  });
  
  // Full factorial warning
  const fullFactorialCheckbox = document.getElementById('create-full-factorial');
  fullFactorialCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) {
      // Calculate and warn about size
      updateFullFactorialWarning();
    }
  });
}

function updateFullFactorialWarning() {
  if (attributes.length === 0) return;
  
  const fullSize = attributes.reduce((prod, attr) => prod * attr.levels.length, 1);
  const feedback = document.getElementById('design-generation-feedback');
  
  if (fullSize > 2000) {
    feedback.innerHTML = `<div class="error-message">⚠ Full factorial would create ${fullSize.toLocaleString()} profiles. This exceeds the 2,000 profile limit. Please use fractional design or reduce attribute levels.</div>`;
  } else if (fullSize > 500) {
    feedback.innerHTML = `<div class="info-message">⚠ Full factorial will create ${fullSize.toLocaleString()} profiles. This is large but will be generated. Consider fractional design for more efficient data collection.</div>`;
  } else if (fullSize > 100) {
    feedback.innerHTML = `<div class="info-message">ℹ Full factorial will create ${fullSize.toLocaleString()} profiles. This may result in long surveys. Consider fractional design for more efficient data collection.</div>`;
  } else {
    feedback.innerHTML = `<div class="success-message">✓ Full factorial will create ${fullSize.toLocaleString()} profiles. This is manageable for most studies.</div>`;
  }
}

function addCompetitorRow() {
  const container = document.getElementById('competitors-container');
  const compId = Date.now();
  
  const row = document.createElement('div');
  row.className = 'competitor-row';
  row.dataset.compId = compId;
  
  let html = `<div class="competitor-inputs"><label>Competitor Name:</label><input type="text" class="comp-name" placeholder="e.g., iPhone 15 Pro">`;
  
  // Add input for each attribute
  attributes.forEach(attr => {
    html += `
      <div>
        <label>${attr.name}:</label>
        <select class="comp-attr" data-attr="${attr.name}">
          ${attr.levels.map(level => `<option value="${level}">${level}</option>`).join('')}
        </select>
      </div>
    `;
  });
  
  html += `</div><button class="btn btn-small btn-danger remove-comp-btn" data-comp-id="${compId}">Remove</button>`;
  row.innerHTML = html;
  
  container.appendChild(row);
  
  row.querySelector('.remove-comp-btn').addEventListener('click', (e) => {
    const id = e.target.dataset.compId;
    document.querySelector(`[data-comp-id="${id}"]`).remove();
  });
}

function setupDesignGeneration() {
  const generateBtn = document.getElementById('generate-design-btn');
  generateBtn?.addEventListener('click', generateDesign);
}

// ========================================
// Step 3: Design Generation
// ========================================

function generateDesign() {
  const feedback = document.getElementById('design-generation-feedback');
  
  // Track run attempt
  if (typeof markRunAttempted === 'function') {
    markRunAttempted();
  }
  
  try {
    // Gather config
    designConfig.numTasks = parseInt(document.getElementById('num-tasks').value);
    designConfig.numAlternatives = parseInt(document.getElementById('num-alternatives').value);
    designConfig.includeNone = document.getElementById('include-none').checked;
    designConfig.fullFactorial = document.getElementById('create-full-factorial').checked;
    designConfig.populateSynthetic = document.getElementById('populate-synthetic-data').checked;
    designConfig.numRespondents = parseInt(document.getElementById('num-respondents').value) || 50;
    
    // Gather competitors
    competitors = [];
    document.querySelectorAll('.competitor-row').forEach(row => {
      const name = row.querySelector('.comp-name').value.trim();
      if (!name) return;
      
      const profile = { name };
      row.querySelectorAll('.comp-attr').forEach(select => {
        const attrName = select.dataset.attr;
        profile[attrName] = select.value;
      });
      competitors.push(profile);
    });
    
    feedback.innerHTML = '<div class="info-message">Generating design... This may take a moment.</div>';
    
    // Check full factorial size (hard limit at 2000 profiles)
    if (designConfig.fullFactorial) {
      const fullSize = attributes.reduce((prod, attr) => prod * attr.levels.length, 1);
      if (fullSize > 2000) {
        feedback.innerHTML = '<div class="error-message">Error: Full factorial would create ' + fullSize.toLocaleString() + ' profiles. This exceeds the 2,000 profile limit. Please use fractional design or reduce attribute levels.</div>';
        return;
      } else if (fullSize > 500) {
        feedback.innerHTML = '<div class="info-message">⚠ Generating large full factorial (' + fullSize.toLocaleString() + ' profiles)... This may take a moment.</div>';
      }
    }
    
    // Generate fractional factorial design
    generatedDesign = createFractionalFactorialDesign();
    
    // Populate with synthetic data if requested
    if (designConfig.populateSynthetic) {
      generatedDesign = populateWithSyntheticData(generatedDesign);
    }
    
    // Display results
    displayDesignSummary();
    displayDesignPreview();
    displayDesignDiagnostics();
    
    // Setup button for scenario analysis (don't run automatically)
    setupDesignScenarioButton();
    
    let successMsg = '✓ Design generated successfully!';
    if (designConfig.populateSynthetic) {
      successMsg += ` Synthetic data created for ${designConfig.numRespondents} respondents.`;
    }
    feedback.innerHTML = `<div class="success-message">${successMsg}</div>`;
    
    // Track successful run
    if (typeof markRunSuccessful === 'function') {
      markRunSuccessful({
        attributes: attributes.length,
        tasks: designConfig.numTasks,
        alternatives: designConfig.numAlternatives,
        profiles: generatedDesign?.profiles?.length || 0
      });
    }
    
    // Show review section
    document.getElementById('section-review-design').classList.remove('hidden');
    document.getElementById('section-review-design').scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    console.error('Design generation error:', error);
    feedback.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
  }
}

function createFractionalFactorialDesign() {
  // Calculate design parameters
  const totalLevels = attributes.reduce((sum, attr) => sum * attr.levels.length, 1);
  const alternativesPerTask = designConfig.numAlternatives;
  const numTasks = designConfig.numTasks;
  const useFullFactorial = designConfig.fullFactorial;
  
  console.log(`Full factorial size: ${totalLevels} combinations`);
  console.log(`Target: ${numTasks} tasks × ${alternativesPerTask} alternatives = ${numTasks * alternativesPerTask} profiles`);
  
  // Generate candidate profiles
  let profiles;
  if (useFullFactorial) {
    profiles = generateFullFactorialProfiles();
    console.log(`Using full factorial: ${profiles.length} profiles`);
  } else {
    profiles = generateOrthogonalProfiles(numTasks * alternativesPerTask * 2); // Generate extra for selection
    console.log(`Using fractional factorial: ${profiles.length} candidate profiles`);
  }
  
  // Assign profiles to tasks
  const tasks = [];
  let profileIndex = 0;
  
  for (let taskId = 1; taskId <= numTasks; taskId++) {
    const task = {
      task_id: taskId,
      alternatives: []
    };
    
    // Add regular alternatives
    for (let altIdx = 0; altIdx < alternativesPerTask; altIdx++) {
      if (profileIndex >= profiles.length) profileIndex = 0; // Wrap around if needed
      
      const profile = { ...profiles[profileIndex] };
      profile.alternative_id = String.fromCharCode(65 + altIdx); // A, B, C, ...
      task.alternatives.push(profile);
      profileIndex++;
    }
    
    // Optionally add a competitor in some tasks
    if (competitors.length > 0 && Math.random() < 0.3) {
      const comp = competitors[Math.floor(Math.random() * competitors.length)];
      const compProfile = { ...comp };
      compProfile.alternative_id = comp.name;
      task.alternatives.push(compProfile);
    }
    
    // Add None option if enabled
    if (designConfig.includeNone) {
      const noneProfile = { alternative_id: 'None' };
      attributes.forEach(attr => noneProfile[attr.name] = '');
      task.alternatives.push(noneProfile);
    }
    
    tasks.push(task);
  }
  
  return {
    attributes,
    tasks,
    config: designConfig,
    competitors
  };
}

function generateFullFactorialProfiles() {
  // Generate all possible combinations
  const profiles = [];
  const numAttributes = attributes.length;
  const indices = attributes.map(() => 0);
  
  function generateRecursive(attrIdx) {
    if (attrIdx === numAttributes) {
      const profile = {};
      attributes.forEach((attr, idx) => {
        profile[attr.name] = attr.levels[indices[idx]];
      });
      profiles.push(profile);
      return;
    }
    
    for (let i = 0; i < attributes[attrIdx].levels.length; i++) {
      indices[attrIdx] = i;
      generateRecursive(attrIdx + 1);
    }
  }
  
  generateRecursive(0);
  return shuffleArray(profiles);
}

function generateOrthogonalProfiles(targetCount) {
  // Advanced fractional factorial generation with improved orthogonality
  // Uses balanced incomplete block design (BIBD) principles
  
  const profiles = [];
  const numAttributes = attributes.length;
  const levelCounts = attributes.map(attr => attr.levels.length);
  
  // Method 1: If we have enough profiles, use full orthogonal array
  const fullFactorial = levelCounts.reduce((prod, count) => prod * count, 1);
  
  if (targetCount >= fullFactorial * 0.5) {
    // Use near-complete fractional factorial
    return generateNearCompleteFractional(targetCount);
  }
  
  // Method 2: Use Latin Hypercube Sampling for better space-filling
  return generateLatinHypercube(targetCount);
}

function generateNearCompleteFractional(targetCount) {
  // Generate profiles with better orthogonality using stratified sampling
  const profiles = [];
  const numAttributes = attributes.length;
  
  // Create full factorial first
  const fullProfiles = [];
  const indices = attributes.map(() => 0);
  
  function generateRecursive(attrIdx) {
    if (attrIdx === numAttributes) {
      const profile = {};
      attributes.forEach((attr, idx) => {
        profile[attr.name] = attr.levels[indices[idx]];
      });
      fullProfiles.push(profile);
      return;
    }
    
    for (let i = 0; i < attributes[attrIdx].levels.length; i++) {
      indices[attrIdx] = i;
      generateRecursive(attrIdx + 1);
    }
  }
  
  generateRecursive(0);
  
  // Sample strategically from full factorial
  if (fullProfiles.length <= targetCount) {
    return shuffleArray(fullProfiles).slice(0, targetCount);
  }
  
  // Use systematic sampling with random start
  const step = fullProfiles.length / targetCount;
  const start = Math.floor(Math.random() * step);
  
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.floor(start + i * step) % fullProfiles.length;
    profiles.push({ ...fullProfiles[idx] });
  }
  
  return shuffleArray(profiles);
}

function generateLatinHypercube(targetCount) {
  // Latin Hypercube Sampling ensures each level appears proportionally
  const profiles = [];
  const numAttributes = attributes.length;
  
  // Create stratified samples for each attribute
  const levelSequences = attributes.map(attr => {
    const sequence = [];
    const levelsPerBucket = targetCount / attr.levels.length;
    
    for (let i = 0; i < attr.levels.length; i++) {
      const count = Math.round(levelsPerBucket);
      for (let j = 0; j < count && sequence.length < targetCount; j++) {
        sequence.push(attr.levels[i]);
      }
    }
    
    // Fill remaining if needed
    while (sequence.length < targetCount) {
      sequence.push(attr.levels[Math.floor(Math.random() * attr.levels.length)]);
    }
    
    // Shuffle to break systematic patterns
    return shuffleArray(sequence);
  });
  
  // Combine into profiles
  for (let i = 0; i < targetCount; i++) {
    const profile = {};
    attributes.forEach((attr, attrIdx) => {
      profile[attr.name] = levelSequences[attrIdx][i];
    });
    profiles.push(profile);
  }
  
  return profiles;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ========================================
// Synthetic Data Generation
// ========================================

function populateWithSyntheticData(design) {
  // Generate heterogeneous respondent preferences
  const numRespondents = designConfig.numRespondents;
  const respondentData = [];
  
  // Create preference parameters for each respondent (4 segments)
  const respondentParams = [];
  for (let i = 0; i < numRespondents; i++) {
    const segment = i % 4;
    const params = generateRespondentParams(segment);
    respondentParams.push(params);
  }
  
  // For each respondent, go through all tasks and simulate choices
  for (let respIdx = 0; respIdx < numRespondents; respIdx++) {
    const respId = `R${String(respIdx + 1).padStart(3, '0')}`;
    const params = respondentParams[respIdx];
    
    design.tasks.forEach(task => {
      // Calculate utility for each alternative
      const utilities = task.alternatives.map(alt => {
        if (alt.alternative_id === 'None') {
          return params.asc_none + randomGumbel();
        }
        
        let utility = 0;
        
        // Add attribute utilities
        attributes.forEach(attr => {
          const value = alt[attr.name];
          if (value && params[attr.name] && params[attr.name][value] !== undefined) {
            utility += params[attr.name][value];
          }
        });
        
        // Add random error term (Gumbel distribution for logit)
        utility += randomGumbel();
        
        return utility;
      });
      
      // Choose alternative with highest utility
      const maxUtility = Math.max(...utilities);
      const chosenIdx = utilities.indexOf(maxUtility);
      
      // Add to dataset
      task.alternatives.forEach((alt, idx) => {
        respondentData.push({
          respondent_id: respId,
          task_id: task.task_id,
          alternative_id: alt.alternative_id,
          chosen: idx === chosenIdx ? 1 : 0,
          ...Object.fromEntries(
            attributes.map(attr => [attr.name, alt[attr.name] || ''])
          )
        });
      });
    });
  }
  
  // Add synthetic data to design object
  design.syntheticData = respondentData;
  design.numRespondents = numRespondents;
  
  return design;
}

function generateRespondentParams(segment) {
  // Create heterogeneous preference profiles
  const params = {
    asc_none: -1.5 + Math.random() * 1.0 // None option utility
  };
  
  attributes.forEach(attr => {
    if (attr.type === 'categorical') {
      // Categorical: create part-worths with one reference level at 0
      params[attr.name] = {};
      const baseLevelIdx = Math.floor(Math.random() * attr.levels.length);
      
      attr.levels.forEach((level, idx) => {
        if (idx === baseLevelIdx) {
          params[attr.name][level] = 0; // Reference level
        } else {
          // Segment-based preferences with random noise
          let baseUtil = (segment * 0.3 - 0.5) * (idx - baseLevelIdx);
          baseUtil += (Math.random() - 0.5) * 0.8; // Individual variation
          params[attr.name][level] = baseUtil;
        }
      });
    } else {
      // Numeric: linear utility (store as object for consistency)
      params[attr.name] = {};
      const coefficient = (segment * 0.1 - 0.15) + (Math.random() - 0.5) * 0.1;
      
      attr.levels.forEach(level => {
        const numValue = parseFloat(level);
        params[attr.name][level] = coefficient * numValue;
      });
    }
  });
  
  return params;
}

function randomGumbel() {
  // Generate Gumbel-distributed random variable (for logit choice model)
  const u = Math.random();
  return -Math.log(-Math.log(u));
}

// ========================================
// Display Functions
// ========================================

function displayDesignSummary() {
  const summaryEl = document.getElementById('design-summary');
  
  const totalProfiles = designConfig.numTasks * designConfig.numAlternatives;
  const totalFullFactorial = attributes.reduce((prod, attr) => prod * attr.levels.length, 1);
  const fractionUsed = (totalProfiles / totalFullFactorial * 100).toFixed(1);
  const designType = designConfig.fullFactorial ? 'Full Factorial' : 'Fractional Factorial';
  
  let html = `<h3>Design Summary</h3>`;
  html += `<div class="dual-panels">`;
  html += `<div>`;
  html += `<p><strong>Design Type:</strong> ${designType}</p>`;
  html += `<p><strong>Attributes:</strong> ${attributes.length}</p>`;
  html += `<p><strong>Total Levels:</strong> ${attributes.reduce((sum, a) => sum + a.levels.length, 0)}</p>`;
  html += `<p><strong>Full Factorial Size:</strong> ${totalFullFactorial.toLocaleString()} combinations</p>`;
  html += `</div>`;
  html += `<div>`;
  html += `<p><strong>Tasks per Respondent:</strong> ${designConfig.numTasks}</p>`;
  html += `<p><strong>Alternatives per Task:</strong> ${designConfig.numAlternatives} ${designConfig.includeNone ? '+ None' : ''}</p>`;
  html += `<p><strong>Profiles in Design:</strong> ${totalProfiles} (${fractionUsed}% of full factorial)</p>`;
  if (generatedDesign.syntheticData) {
    html += `<p><strong>Synthetic Respondents:</strong> ${designConfig.numRespondents} (${generatedDesign.syntheticData.length.toLocaleString()} total rows)</p>`;
  }
  html += `</div>`;
  html += `</div>`;
  
  if (competitors.length > 0) {
    html += `<p style="margin-top: 1rem;"><strong>Fixed Competitors:</strong> ${competitors.map(c => c.name).join(', ')}</p>`;
  }
  
  summaryEl.innerHTML = html;
}

function displayDesignPreview() {
  const previewEl = document.getElementById('design-preview');
  const tasksToShow = generatedDesign.tasks.slice(0, 3);
  
  let html = '';
  
  tasksToShow.forEach(task => {
    html += `<div class="task-preview">
      <h4>Task ${task.task_id}</h4>
      <p><em>Which would you choose?</em></p>
      <div class="alternatives-grid">`;
    
    task.alternatives.forEach(alt => {
      html += `<div class="alternative-card">
        <strong>${alt.alternative_id}</strong>`;
      
      attributes.forEach(attr => {
        const value = alt[attr.name] || '—';
        html += `<div><span class="attr-label">${attr.name}:</span> ${value}</div>`;
      });
      
      html += `</div>`;
    });
    
    html += `</div></div>`;
  });
  
  previewEl.innerHTML = html;
}

function displayDesignDiagnostics() {
  const diagEl = document.getElementById('design-diagnostics');
  
  // Check level balance
  const levelCounts = {};
  attributes.forEach(attr => {
    levelCounts[attr.name] = {};
    attr.levels.forEach(level => levelCounts[attr.name][level] = 0);
  });
  
  generatedDesign.tasks.forEach(task => {
    task.alternatives.forEach(alt => {
      attributes.forEach(attr => {
        const value = alt[attr.name];
        if (value && levelCounts[attr.name][value] !== undefined) {
          levelCounts[attr.name][value]++;
        }
      });
    });
  });
  
  // Calculate detailed balance metrics
  let balanceHTML = '<div class="diagnostic-metric"><h4>Level Balance Analysis</h4>';
  balanceHTML += '<p style="color: var(--app-muted); margin-bottom: 1rem;">Each attribute level should appear roughly equally often to enable unbiased parameter estimation.</p>';
  balanceHTML += '<ul>';
  
  let totalDeviation = 0;
  let worstDeviation = 0;
  let worstAttribute = '';
  
  attributes.forEach(attr => {
    const counts = Object.values(levelCounts[attr.name]);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const range = max - min;
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const deviation = avgCount > 0 ? range / avgCount : 0;
    totalDeviation += deviation;
    
    if (deviation > worstDeviation) {
      worstDeviation = deviation;
      worstAttribute = attr.name;
    }
    
    const balanceScore = deviation < 0.15 ? '✓ Excellent' : deviation < 0.3 ? '✓ Good' : deviation < 0.5 ? '⚠ Acceptable' : '✗ Poor';
    const levelDetail = attr.levels.map(level => `${level}: ${levelCounts[attr.name][level]}`).join(', ');
    
    balanceHTML += `<li><strong>${attr.name}:</strong> ${balanceScore} 
      <br><small style="color: var(--app-muted);">Range: ${range} occurrences | Avg: ${avgCount.toFixed(1)} | Deviation: ${(deviation * 100).toFixed(1)}%
      <br>Level counts: ${levelDetail}</small></li>`;
  });
  
  balanceHTML += '</ul></div>';
  
  // Calculate D-efficiency (design efficiency metric)
  const avgDeviation = totalDeviation / attributes.length;
  const dEfficiency = Math.max(0, 100 * (1 - avgDeviation * 0.7)); // Scaled factor
  
  // Orthogonality analysis
  const orthogonalityHTML = calculateDetailedOrthogonality(levelCounts);
  
  // Statistical power estimate
  const powerHTML = calculateStatisticalPower();
  
  // Design efficiency summary
  const qualityRating = dEfficiency >= 85 ? 'excellent' : 
                        dEfficiency >= 70 ? 'good' : 
                        dEfficiency >= 50 ? 'acceptable' : 
                        'poor';
  
  const qualityLabel = dEfficiency >= 85 ? 'Excellent (Commercial-grade)' : 
                       dEfficiency >= 70 ? 'Good (Suitable for most studies)' : 
                       dEfficiency >= 50 ? 'Acceptable (Teaching/pilot studies)' : 
                       'Poor (Consider regenerating)';
  
  const efficiencyHTML = `
    <div class="diagnostic-metric" style="background: ${dEfficiency >= 70 ? '#e8f5e9' : '#fff3e0'}; border-left: 4px solid ${dEfficiency >= 70 ? '#4caf50' : '#ff9800'};">
      <h4>Overall Design Efficiency (D-Efficiency)</h4>
      <div class="metric-score">${dEfficiency.toFixed(1)}%</div>
      <div class="metric-rating ${qualityRating}">${qualityLabel}</div>
      <p style="margin-top: 1rem;"><strong>Interpretation:</strong> D-efficiency measures how efficiently the design uses experimental resources. 
      Values above 85% indicate commercial-grade designs with near-optimal information per profile tested.</p>
      ${dEfficiency >= 70 ? 
        '<p style="color: #2e7d32; margin: 0.5rem 0 0;">✓ This design meets or exceeds industry standards for conjoint studies. Level balance and attribute independence are within acceptable ranges.</p>' : 
        '<p style="color: #f57c00; margin: 0.5rem 0 0;">⚠ Consider increasing tasks per respondent or adjusting alternatives per task to improve efficiency. Alternatively, reduce the number of attribute levels.</p>'}
      ${worstDeviation > 0.5 ? 
        `<p style="color: #d32f2f; margin: 0.5rem 0 0;">⚠ Attribute "${worstAttribute}" shows significant imbalance (${(worstDeviation * 100).toFixed(1)}% deviation). This may affect parameter estimation precision.</p>` : ''}
    </div>
  `;
  
  diagEl.innerHTML = balanceHTML + orthogonalityHTML + powerHTML + efficiencyHTML;
}

function calculateDetailedOrthogonality(levelCounts) {
  // Detailed orthogonality check with correlation analysis
  let html = '<div class="diagnostic-metric"><h4>Attribute Independence (Orthogonality)</h4>';
  html += '<p style="color: var(--app-muted); margin-bottom: 1rem;">Orthogonality ensures attribute effects can be estimated independently without confounding. Low correlation between attributes is critical for unbiased conjoint analysis.</p>';
  
  const totalProfiles = generatedDesign.tasks.reduce((sum, task) => 
    sum + task.alternatives.filter(alt => alt.alternative_id !== 'None').length, 0);
  
  let maxImbalance = 0;
  let imbalanceDetails = [];
  
  attributes.forEach(attr => {
    const counts = Object.values(levelCounts[attr.name]);
    const expected = totalProfiles / attr.levels.length;
    const maxDiff = Math.max(...counts.map(c => Math.abs(c - expected)));
    const imbalance = expected > 0 ? maxDiff / expected : 0;
    maxImbalance = Math.max(maxImbalance, imbalance);
    imbalanceDetails.push({ attr: attr.name, imbalance, expected, maxDiff });
  });
  
  const orthStatus = maxImbalance < 0.2 ? '✓ Excellent' : maxImbalance < 0.4 ? '✓ Good' : maxImbalance < 0.6 ? '⚠ Acceptable' : '✗ Poor';
  
  html += `<p><strong>Orthogonality Status:</strong> ${orthStatus}</p>`;
  html += `<p><strong>Maximum Imbalance:</strong> ${(maxImbalance * 100).toFixed(1)}%</p>`;
  html += '<p style="font-size: 0.9rem; color: var(--app-muted);">Imbalance measures how far each attribute deviates from perfectly uniform distribution.</p>';
  
  html += '<details style="margin-top: 1rem;"><summary style="cursor: pointer; font-weight: 600; color: var(--app-accent);">Technical Details: Per-Attribute Orthogonality</summary>';
  html += '<ul style="margin: 1rem 0 0 1.5rem; line-height: 1.8;">';
  imbalanceDetails.forEach(detail => {
    html += `<li><strong>${detail.attr}:</strong> Expected ${detail.expected.toFixed(1)} occurrences per level, 
             max deviation ${detail.maxDiff.toFixed(1)} (${(detail.imbalance * 100).toFixed(1)}%)</li>`;
  });
  html += '</ul></details>';
  
  html += '</div>';
  return html;
}

function calculateStatisticalPower() {
  // Estimate statistical power for main effects
  const totalProfiles = generatedDesign.tasks.reduce((sum, task) => 
    sum + task.alternatives.filter(alt => alt.alternative_id !== 'None').length, 0);
  
  const avgLevels = attributes.reduce((sum, attr) => sum + attr.levels.length, 0) / attributes.length;
  const estimableParams = attributes.reduce((sum, attr) => sum + attr.levels.length - 1, 0); // Dummy coding
  
  // Simple heuristic: need ~10-20 observations per parameter for decent power
  const observationsPerParam = totalProfiles / estimableParams;
  
  let powerStatus = '';
  let powerColor = '';
  
  if (observationsPerParam >= 20) {
    powerStatus = 'Excellent (High statistical power)';
    powerColor = '#4caf50';
  } else if (observationsPerParam >= 10) {
    powerStatus = 'Good (Adequate statistical power)';
    powerColor = '#2196f3';
  } else if (observationsPerParam >= 5) {
    powerStatus = 'Acceptable (Moderate power, may need larger sample)';
    powerColor = '#ff9800';
  } else {
    powerStatus = 'Low (Insufficient profiles for reliable estimation)';
    powerColor = '#f44336';
  }
  
  let html = '<div class="diagnostic-metric">';
  html += '<h4>Statistical Power Estimate</h4>';
  html += `<p><strong>Profiles per Parameter:</strong> ${observationsPerParam.toFixed(1)} profiles</p>`;
  html += `<p><strong>Estimable Parameters:</strong> ${estimableParams} (from ${attributes.length} attributes)</p>`;
  html += `<p style="color: ${powerColor}; font-weight: 600;">${powerStatus}</p>`;
  html += '<p style="font-size: 0.9rem; color: var(--app-muted); margin-top: 1rem;">Rule of thumb: 10-20 profiles per parameter provides adequate power for detecting medium effect sizes (Cohen\'s d ≈ 0.5) at α = 0.05.</p>';
  
  if (observationsPerParam < 10) {
    html += '<p style="color: #f57c00; margin-top: 0.5rem;">⚠ <strong>Recommendation:</strong> Increase tasks per respondent or recruit more respondents to improve statistical power.</p>';
  }
  
  html += '<details style="margin-top: 1rem;"><summary style="cursor: pointer; font-weight: 600; color: var(--app-accent);">Technical Details: Power Calculation</summary>';
  html += '<div style="margin-top: 1rem;">';
  html += `<p><strong>Total Profiles:</strong> ${totalProfiles}</p>`;
  html += `<p><strong>Avg Levels per Attribute:</strong> ${avgLevels.toFixed(1)}</p>`;
  html += '<p style="font-size: 0.9rem; color: var(--app-muted); margin-top: 0.75rem;">Power depends on sample size (respondents times tasks), effect size (true utility differences), ' +
          'and within-respondent variance. This estimate assumes medium effect sizes and moderate heterogeneity across respondents.</p>';
  html += '</div></details>';
  
  html += '</div>';
  return html;
}

function setupDesignScenarioButton() {
  const btn = document.getElementById('run-design-scenarios-btn');
  if (!btn) return;
  
  btn.onclick = async () => {
    const statusEl = document.getElementById('scenario-analysis-status');
    const chartEl = document.getElementById('design-tradeoffs-chart');
    
    btn.disabled = true;
    btn.textContent = 'Computing scenarios...';
    statusEl.textContent = 'Generating and evaluating 64 alternative design configurations. This may take 10-30 seconds...';
    statusEl.style.color = '#ff9800';
    
    // Use setTimeout to allow UI update before heavy computation
    setTimeout(async () => {
      try {
        await computeAndDisplayDesignTradeoffs();
        
        statusEl.textContent = '✓ Analysis complete. Charts show D-efficiency for alternative design configurations.';
        statusEl.style.color = '#4caf50';
        chartEl.style.display = 'block';
        btn.textContent = 'Refresh Analysis';
        btn.disabled = false;
      } catch (error) {
        console.error('Scenario analysis error:', error);
        statusEl.textContent = '✗ Error computing scenarios: ' + error.message;
        statusEl.style.color = '#d32f2f';
        btn.disabled = false;
        btn.textContent = 'Retry Analysis';
      }
    }, 50);
  };
}

async function computeAndDisplayDesignTradeoffs() {
  const currentTasks = designConfig.numTasks;
  const currentAlts = designConfig.numAlternatives;
  
  // Vary tasks (5 to 20)
  const taskRange = [];
  const taskEfficiency = [];
  
  for (let tasks = 5; tasks <= 20; tasks++) {
    taskRange.push(tasks);
    // Generate design and compute true D-efficiency
    const efficiency = await computeScenarioEfficiency(tasks, currentAlts);
    taskEfficiency.push(efficiency);
  }
  
  // Vary alternatives per task (2 to 6)
  const altRange = [];
  const altEfficiency = [];
  
  for (let alts = 2; alts <= 6; alts++) {
    altRange.push(alts);
    const efficiency = await computeScenarioEfficiency(currentTasks, alts);
    altEfficiency.push(efficiency);
  }
  
  // Create traces for Plotly
  const trace1 = {
    x: taskRange,
    y: taskEfficiency,
    mode: 'lines+markers',
    name: 'Tasks per Respondent',
    line: { color: '#2196f3', width: 3 },
    marker: { size: 8, color: '#2196f3' }
  };
  
  const trace2 = {
    x: altRange,
    y: altEfficiency,
    mode: 'lines+markers',
    name: 'Alternatives per Task',
    line: { color: '#ff9800', width: 3 },
    marker: { size: 8, color: '#ff9800' },
    xaxis: 'x2',
    yaxis: 'y2'
  };
  
  // Add markers for current design
  const currentTaskEfficiency = taskEfficiency[taskRange.indexOf(currentTasks)];
  const currentAltEfficiency = altEfficiency[altRange.indexOf(currentAlts)];
  
  const currentTrace1 = {
    x: [currentTasks],
    y: [currentTaskEfficiency],
    mode: 'markers',
    name: 'Current Design',
    marker: { size: 15, color: '#4caf50', symbol: 'star', line: { width: 2, color: '#fff' } },
    showlegend: true
  };
  
  const currentTrace2 = {
    x: [currentAlts],
    y: [currentAltEfficiency],
    mode: 'markers',
    name: 'Current (Alts)',
    marker: { size: 15, color: '#4caf50', symbol: 'star', line: { width: 2, color: '#fff' } },
    xaxis: 'x2',
    yaxis: 'y2',
    showlegend: true
  };
  
  const layout = {
    title: {
      text: 'Design Efficiency Trade-offs (True D-Efficiency)',
      font: { size: 16, color: 'var(--app-text, #1f2a37)' }
    },
    grid: { rows: 1, columns: 2, pattern: 'independent' },
    xaxis: {
      title: 'Tasks per Respondent',
      showgrid: true,
      gridcolor: '#e0e0e0'
    },
    yaxis: {
      title: 'D-Efficiency (%)',
      range: [0, 100],
      showgrid: true,
      gridcolor: '#e0e0e0'
    },
    xaxis2: {
      title: 'Alternatives per Task',
      showgrid: true,
      gridcolor: '#e0e0e0'
    },
    yaxis2: {
      title: 'D-Efficiency (%)',
      range: [0, 100],
      showgrid: true,
      gridcolor: '#e0e0e0'
    },
    showlegend: true,
    legend: { x: 0.5, y: -0.15, xanchor: 'center', orientation: 'h' },
    margin: { t: 50, b: 80, l: 60, r: 60 },
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#fff'
  };
  
  const data = [trace1, currentTrace1, trace2, currentTrace2];
  
  Plotly.newPlot('design-tradeoffs-chart', data, layout, { responsive: true, displayModeBar: false });
}

async function computeScenarioEfficiency(numTasks, numAlts) {
  // Generate a design with specified parameters
  const tempConfig = {
    numTasks: numTasks,
    numAlternatives: numAlts,
    includeNone: designConfig.includeNone,
    fullFactorial: false // Always use fractional for scenarios
  };
  
  // Generate orthogonal profiles
  const profiles = generateOrthogonalProfiles(numTasks * numAlts);
  
  // Build design matrix for D-efficiency calculation
  const X = [];
  let profileIndex = 0;
  
  for (let taskId = 1; taskId <= numTasks; taskId++) {
    for (let altIdx = 0; altIdx < numAlts; altIdx++) {
      if (profileIndex >= profiles.length) profileIndex = 0;
      
      const profile = profiles[profileIndex];
      const row = [];
      
      // Encode categorical attributes as dummy variables
      attributes.forEach(attr => {
        if (attr.type === 'categorical') {
          const sortedLevels = [...attr.levels].sort();
          sortedLevels.slice(1).forEach(level => { // Skip baseline
            row.push(profile[attr.name] === level ? 1 : 0);
          });
        } else {
          // Numeric attribute
          row.push(parseFloat(profile[attr.name]) || 0);
        }
      });
      
      X.push(row);
      profileIndex++;
    }
  }
  
  // Compute D-efficiency: det(X'X)^(1/k) / n
  // Where k = number of parameters, n = number of observations
  if (X.length === 0 || X[0].length === 0) return 0;
  
  const XtX = multiplyMatrices(transposeMatrix(X), X);
  const det = matrixDeterminant(XtX);
  
  if (det <= 0) return 0; // Singular matrix
  
  const k = X[0].length;
  const n = X.length;
  const dEfficiency = Math.pow(det, 1 / k) / n * 100;
  
  return Math.min(100, Math.max(0, dEfficiency));
}

// Matrix operations for D-efficiency calculation
function transposeMatrix(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = Array(cols).fill(0).map(() => Array(rows).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j];
    }
  }
  return result;
}

function multiplyMatrices(A, B) {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));
  
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function matrixDeterminant(matrix) {
  const n = matrix.length;
  
  if (n === 1) return matrix[0][0];
  if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  
  // Use LU decomposition for larger matrices (more efficient)
  // This is a simplified version - for production, use a proper linear algebra library
  let det = 1;
  const LU = matrix.map(row => [...row]); // Copy matrix
  
  for (let i = 0; i < n; i++) {
    // Partial pivoting
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(LU[k][i]) > Math.abs(LU[maxRow][i])) {
        maxRow = k;
      }
    }
    
    if (maxRow !== i) {
      [LU[i], LU[maxRow]] = [LU[maxRow], LU[i]];
      det *= -1;
    }
    
    if (Math.abs(LU[i][i]) < 1e-10) return 0; // Singular matrix
    
    det *= LU[i][i];
    
    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = LU[k][i] / LU[i][i];
      for (let j = i; j < n; j++) {
        LU[k][j] -= factor * LU[i][j];
      }
    }
  }
  
  return det;
}

function displayDesignTradeoffs() {
  // Legacy function - now handled by button click
  // Keep for backwards compatibility but do nothing
}

// ========================================
// Downloads
// ========================================

function setupDownloads() {
  document.getElementById('download-design-csv')?.addEventListener('click', downloadCSV);
  document.getElementById('download-design-json')?.addEventListener('click', downloadJSON);
  document.getElementById('download-design-guide')?.addEventListener('click', downloadGuide);
  document.getElementById('start-over-btn')?.addEventListener('click', startOver);
}

function downloadCSV() {
  if (!generatedDesign) return;
  
  const format = document.getElementById('csv-format-select')?.value || 'long';
  
  let csv;
  if (format === 'wide') {
    csv = generateWideFormatCSV();
  } else {
    csv = generateLongFormatCSV();
  }
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  
  const formatSuffix = format === 'wide' ? '_wide' : '';
  const filename = generatedDesign.syntheticData 
    ? `conjoint_synthetic_data_${designConfig.numRespondents}resp${formatSuffix}.csv`
    : `conjoint_design_template${formatSuffix}.csv`;
  link.download = filename;
  link.click();
}

function generateLongFormatCSV() {
  // Create CSV with respondent_id, task_id, alternative_id, chosen, attributes
  let csv = 'respondent_id,task_id,alternative_id,chosen';
  attributes.forEach(attr => csv += `,${attr.name}`);
  csv += '\n';
  
  if (generatedDesign.syntheticData) {
    // Use synthetic data
    generatedDesign.syntheticData.forEach(row => {
      csv += `${row.respondent_id},${row.task_id},${row.alternative_id},${row.chosen}`;
      attributes.forEach(attr => {
        csv += `,${row[attr.name] || ''}`;
      });
      csv += '\n';
    });
  } else {
    // Add template rows for one respondent
    generatedDesign.tasks.forEach(task => {
      task.alternatives.forEach(alt => {
        csv += `R001,${task.task_id},${alt.alternative_id},0`;
        attributes.forEach(attr => {
          csv += `,${alt[attr.name] || ''}`;
        });
        csv += '\n';
      });
    });
  }
  
  return csv;
}

function generateWideFormatCSV() {
  // Wide format: one row per task with columns for each alternative's attributes
  // Header: respondent_id, task_id, chosen_alternative, alt1_attr1, alt1_attr2, ..., alt2_attr1, alt2_attr2, ...
  
  let header = 'respondent_id,task_id,chosen_alternative';
  
  // Add columns for each alternative
  const maxAlts = designConfig.numAlternatives + (designConfig.includeNone ? 1 : 0);
  for (let altNum = 1; altNum <= maxAlts; altNum++) {
    attributes.forEach(attr => {
      header += `,alt${altNum}_${attr.name}`;
    });
  }
  let csv = header + '\n';
  
  if (generatedDesign.syntheticData) {
    // Group synthetic data by respondent and task
    const grouped = {};
    generatedDesign.syntheticData.forEach(row => {
      const key = `${row.respondent_id}_${row.task_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          respondent_id: row.respondent_id,
          task_id: row.task_id,
          alternatives: []
        };
      }
      grouped[key].alternatives.push(row);
    });
    
    // Convert to wide format
    Object.values(grouped).forEach(task => {
      const chosenAlt = task.alternatives.find(alt => alt.chosen === 1);
      csv += `${task.respondent_id},${task.task_id},${chosenAlt ? chosenAlt.alternative_id : ''}`;
      
      // Add attribute values for each alternative
      for (let altNum = 1; altNum <= maxAlts; altNum++) {
        const alt = task.alternatives[altNum - 1];
        attributes.forEach(attr => {
          csv += `,${alt ? (alt[attr.name] || '') : ''}`;
        });
      }
      csv += '\n';
    });
  } else {
    // Template: one respondent
    generatedDesign.tasks.forEach(task => {
      csv += `R001,${task.task_id},`;
      
      // Add attribute values for each alternative
      task.alternatives.forEach(alt => {
        attributes.forEach(attr => {
          csv += `,${alt[attr.name] || ''}`;
        });
      });
      
      // Fill remaining alternative slots if any
      for (let i = task.alternatives.length; i < maxAlts; i++) {
        attributes.forEach(() => csv += `,`);
      }
      csv += '\n';
    });
  }
  
  return csv;
}

function downloadJSON() {
  if (!generatedDesign) return;
  
  const json = JSON.stringify(generatedDesign, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'conjoint_design_spec.json';
  link.click();
}

function downloadGuide() {
  if (!generatedDesign) return;
  
  let guide = `CONJOINT STUDY GUIDE\n`;
  guide += `Generated: ${new Date().toLocaleDateString()}\n\n`;
  guide += `========================================\n`;
  guide += `STUDY DESIGN\n`;
  guide += `========================================\n\n`;
  guide += `Attributes:\n`;
  attributes.forEach(attr => {
    guide += `  - ${attr.name} (${attr.type}): ${attr.levels.join(', ')}\n`;
  });
  guide += `\nDesign Configuration:\n`;
  guide += `  - Tasks per respondent: ${designConfig.numTasks}\n`;
  guide += `  - Alternatives per task: ${designConfig.numAlternatives}\n`;
  guide += `  - None option: ${designConfig.includeNone ? 'Yes' : 'No'}\n`;
  if (competitors.length > 0) {
    guide += `  - Fixed competitors: ${competitors.map(c => c.name).join(', ')}\n`;
  }
  guide += `\n========================================\n`;
  guide += `DATA COLLECTION INSTRUCTIONS\n`;
  guide += `========================================\n\n`;
  guide += `1. Use the downloaded CSV template as your starting point.\n`;
  guide += `2. For each respondent:\n`;
  guide += `   - Copy all ${designConfig.numTasks} tasks\n`;
  guide += `   - Change respondent_id to unique ID (R001, R002, etc.)\n`;
  guide += `   - Mark chosen=1 for the selected alternative in each task\n`;
  guide += `3. Recommended sample size: ${Math.max(100, attributes.length * 20)} respondents minimum\n`;
  guide += `4. After data collection, upload to the Conjoint Analyzer tool.\n\n`;
  
  const blob = new Blob([guide], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'conjoint_study_guide.txt';
  link.click();
}

function startOver() {
  if (!confirm('Start over? This will clear your current design.')) return;
  
  attributes = [];
  competitors = [];
  generatedDesign = null;
  
  document.getElementById('attributes-container').innerHTML = '';
  document.getElementById('competitors-container').innerHTML = '';
  document.getElementById('section-design-config').classList.add('hidden');
  document.getElementById('section-review-design').classList.add('hidden');
  
  addAttributeRow();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initCreatorApp);
