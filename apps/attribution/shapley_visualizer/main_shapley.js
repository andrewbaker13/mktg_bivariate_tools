// main_shapley.js

// Shared constants (CHANNELS, SCENARIOS) are now loaded from assignment_data.js

const TOOL_SLUG = 'shapley-attribution';

// Global State
let appState = {
    currentScenario: null,  // Start with no scenario selected
    activeChannels: new Set(['search']), // Currently toggled in UI
    calc: new ShapleyCalculator(CHANNELS),
    rawPaths: [], // { path: ['search', 'social'], converted: true }
    aggregatedStats: {} // New: stores the counts { "search,social": {users: 10, conv: 2} }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    // Initialize Seed from UI or Generate Random
    handleSeedInit();
    
    // Don't auto-load - wait for user to select a scenario
    showWaitingState();

    // PROFESSOR MODE: Expose state for tutorial
    window.appState = appState;
    
    // Initialize engagement tracking
    if (typeof initEngagementTracking === 'function') {
        initEngagementTracking(TOOL_SLUG);
    }
});

function handleSeedInit() {
    const seedInput = document.getElementById('random-seed');
    const rerollText = document.getElementById('reroll-btn-text');
    
    // If input is empty, generate one
    if (seedInput && !seedInput.value) {
        const randomSeed = Math.floor(Math.random() * 100000);
        seedInput.value = randomSeed;
    }
    // Update PRNG
    if(seedInput) {
        prng = new SeededRNG(seedInput.value);
        if(rerollText) {
            rerollText.textContent = `Generate New Data (Using Seed: ${seedInput.value})`;
        }
    }
}

function initUI() {
    // Reroll Button
    const rerollBtn = document.getElementById('reroll-btn');
    if(rerollBtn) {
        rerollBtn.addEventListener('click', () => {
            // Should we generate a NEW random seed if they click this button?
            // If they manually set a seed, clicking "Generate New Data" with the SAME seed 
            // will result in the same data. 
            // To be helpful, let's assume if they click the big button they want NEW randomness generally,
            // UNLESS they just explicitly set a seed. 
            // BUT, to keep it simple and consistent:
            // "Generate" with a locked seed = Re-run deterministic simulation (useful if they changed other params? or just to confirm)
            // Actually, for "Professor Mode", we want them to see that the seed CONTROLS the data.
            // So if they click it 10 times with Seed 123, they get the same data 10 times. That's the lesson.
            
            // Just re-run:
            loadScenario(appState.currentScenario);
            
            // Optional: visual feedback
            const originalText = rerollBtn.querySelector('strong').textContent;
            rerollBtn.querySelector('strong').textContent = "Regenerating...";
            setTimeout(() => {
                rerollBtn.querySelector('strong').textContent = originalText;
            }, 600);
        });
    }

    // Channel Toggles
    document.querySelectorAll('.channel-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const channel = btn.dataset.channel;
            toggleChannel(channel);
        });
    });

    // Scenario Select
    const scenarioSelect = document.getElementById('scenario-select');
    scenarioSelect.addEventListener('change', (e) => {
        loadScenario(e.target.value);
    });

    // Detail Inspect Select
    const detailSelect = document.getElementById('detail-channel-select');
    detailSelect.addEventListener('change', (e) => {
        updateCalculationDetails(e.target.value);
    });

    // Slider for modifying current mix value manually
    const slider = document.getElementById('team-value-slider');
    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        updateCurrentCoalitionValue(val);
    });

    // Seed "Set" Button
    const applySeedBtn = document.getElementById('apply-seed-btn');
    if(applySeedBtn) {
        applySeedBtn.addEventListener('click', () => {
             // 1. Lock in the seed (updates the PRNG object)
             handleSeedInit();
             
             // 2. Run the simulation immediately (only if scenario selected)
             if (appState.currentScenario) {
                 loadScenario(appState.currentScenario);
             }
             
             // 3. Visual feedback 
             const originalText = applySeedBtn.textContent;
             applySeedBtn.textContent = appState.currentScenario ? "Running..." : "Seed Set!";
             setTimeout(() => {
                 applySeedBtn.textContent = "Set";
             }, 800);
        });
    }
}

// --- Logic ---

function toggleChannel(channel) {
    const wasActive = appState.activeChannels.has(channel);
    
    // 1. Calculate Value BEFORE change
    const oldTeam = Array.from(appState.activeChannels);
    const oldVal = appState.calc.getCoalitionValue(oldTeam);

    if (wasActive) {
        appState.activeChannels.delete(channel);
    } else {
        appState.activeChannels.add(channel);
    }
    
    // 2. Calculate Value AFTER change
    const newTeam = Array.from(appState.activeChannels);
    const newVal = appState.calc.getCoalitionValue(newTeam);
    
    // 3. Update Marginal Display
    updateMarginalDisplay(channel, !wasActive, oldVal, newVal);

    updateChannelToggles();
    updateUI();
}


function updateMarginalDisplay(channelId, isAdding, oldVal, newVal) {
    const box = document.getElementById('marginal-value-display');
    const deltaSpan = document.getElementById('marginal-delta');
    const delta = newVal - oldVal;
    
    const channelName = CHANNEL_NAMES[channelId];
    const actionText = isAdding ? "Adding" : "Removing";
    const sign = delta >= 0 ? "+" : ""; // Negative numbers have own sign
    
    box.innerHTML = `
        <div>${actionText} <strong>${channelName}</strong> changed the mix's conversion rate by:</div>
        <div style="font-size: 1.5rem; color: ${delta >= 0 ? 'var(--app-success)' : 'var(--app-danger)'};">
            ${sign}${delta.toFixed(1)}%
        </div>
        <div class="text-sm muted">(That's its marginal contribution to <em>this specific mix</em>)</div>
    `;
    
    box.classList.remove('hidden');
    box.style.borderLeft = `4px solid ${COLORS[channelId]}`;
    box.style.background = '#f8fafc';
    box.style.padding = '1rem';
    box.style.marginBottom = '1rem';
    box.style.borderRadius = '8px';
}

/**
 * Shows a waiting state prompting the user to select a scenario
 */
function showWaitingState() {
    // Show placeholder in scenario description
    const descEl = document.getElementById('scenario-description');
    if (descEl) {
        descEl.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #64748b;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👆</div>
                <h3 style="margin: 0 0 0.5rem 0; color: #1e40af;">Select a Business Scenario Above</h3>
                <p style="margin: 0;">Choose a case to generate customer journey data and begin the analysis.</p>
            </div>
        `;
    }
    
    // Show placeholder message in stats panel
    const statsContainer = document.getElementById('raw-data-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: #94a3b8; font-style: italic;">
                Waiting for scenario selection...
            </div>
        `;
    }
    
    // Clear charts with waiting message
    const chartIds = ['synergy-heatmap', 'shapley-values-chart', 'comparison-chart'];
    chartIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 200px; color: #94a3b8; font-style: italic;">
                    Select a scenario to see visualization
                </div>
            `;
        }
    });
    
    // Clear raw journeys list
    const listEl = document.getElementById('raw-data-list');
    if (listEl) {
        listEl.innerHTML = '';
    }
}

/**
 * Loads a scenario:
 * 1. Defines the probabilistic rules.
 * 2. Generates ~200 synthetic user journeys based on those rules.
 * 3. Aggregates the journeys to fill the Shapley Calculator with REAL derived rates.
 */
function loadScenario(scenarioKey) {
    appState.currentScenario = scenarioKey;
    const config = SCENARIOS[scenarioKey];
    
    // -- Handle Custom Channel Labels (B2B Case) --
    const DEFAULT_NAMES = {
        'search': 'Paid Search', 'social': 'Social', 'displayA': 'Display (Ad A)',
        'displayB': 'Display (Ad B)', 'email': 'Email',
        '(start)': 'Start', '(conversion)': 'Converted', '(null)': 'Lost / Null'
    };
    // Reset first
    Object.assign(CHANNEL_NAMES, DEFAULT_NAMES);
    // Override if config has labels
    if(config.channelLabels) {
        Object.assign(CHANNEL_NAMES, config.channelLabels);
    }
    
    // Update Button Labels in UI
    document.querySelectorAll('.channel-toggle').forEach(btn => {
        const ch = btn.dataset.channel;
        if (CHANNEL_NAMES[ch]) {
            // Shapley buttons have <span class="icon">...</span> TEXT
            const icon = btn.querySelector('.icon');
            if (icon) {
                 btn.innerHTML = '';
                 btn.appendChild(icon);
                 btn.appendChild(document.createTextNode(' ' + CHANNEL_NAMES[ch]));
            } else {
                btn.textContent = CHANNEL_NAMES[ch];
            }
        }
    });

    // Step 1: Generate Synthetic Data
    // Use config sampleSize if available, otherwise default to 4000
    const sampleSize = config.sampleSize || 4000;
    
    // Update Dynamic Texts
    const countStr = sampleSize.toLocaleString();
    ['sim-note-count', 'sim-sub-count', 'stat-total-paths'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = countStr;
    });

    appState.rawPaths = generateSyntheticData(config, sampleSize);

    // Step 2: Aggregate Data to get Coalition Values (Conversion Rates)
    const aggregatedValues = {}; // key: "sorted,ids" -> { users: n, conv: k }
    
    // Initialize all potential subsets with 0
    const totalSubsets = 1 << CHANNELS.length;
    for (let i = 0; i < totalSubsets; i++) {
        const coalition = [];
        for (let j = 0; j < CHANNELS.length; j++) {
            if ((i & (1 << j)) !== 0) coalition.push(CHANNELS[j]);
        }
        aggregatedValues[coalition.sort().join(',')] = { users: 0, conv: 0, coalition };
    }

    // Tally up the paths
    appState.rawPaths.forEach(p => {
        // Unique set of channels in this path
        const uniqueChannels = [...new Set(p.path)].sort().join(',');
        
        if (aggregatedValues[uniqueChannels]) {
            aggregatedValues[uniqueChannels].users++;
            if (p.converted) aggregatedValues[uniqueChannels].conv++;
        }
    });

    // Store for UI access
    appState.aggregatedStats = aggregatedValues;

    // Check for sparse data
    let hasSparseData = false;
    for (const key in aggregatedValues) {
        if (aggregatedValues[key].coalition.length > 0 && aggregatedValues[key].users === 0) {
            hasSparseData = true;
            break;
        }
    }
    
    // Show warning if sparse
    const warningEl = document.getElementById('sparse-data-warning');
    if (warningEl) {
        warningEl.style.display = hasSparseData ? 'block' : 'none';
    }

    // UPDATE DESCRIPTION TEXT
    const descEl = document.getElementById('scenario-description');
    if(descEl) descEl.innerHTML = config.description || "";

    // Calculate Rates and push to Shapley Calculator
    for (const key in aggregatedValues) {
        const data = aggregatedValues[key];
        
        // Handle Sparse Data: 
        // If users=0, use the theoretical model from config to fallback, 
        // ensuring the math doesn't break with "NaN" or "0" where it shouldn't be.
        // But for "Raw Data" mode, 0 is 0. 
        // Let's smooth it slightly for the "Empty" case or very low N.
        
        let rate = 0;
        if (data.users > 0) {
            rate = (data.conv / data.users) * 100;
        } else {
            // Fallback for empty buckets to keep the visualization looking "complete"
            // (Simulate a theoretical prior)
            rate = getTheoreticalRate(data.coalition, config);
        }
        
        appState.calc.setCoalitionValue(data.coalition, rate);
    }
    
    // Track scenario load and successful run
    if (typeof markScenarioLoaded === 'function') {
        markScenarioLoaded(config.name || scenarioKey);
    }
    if (typeof markRunAttempted === 'function') {
        markRunAttempted();
    }
    if (typeof markRunSuccessful === 'function') {
        const convCount = appState.rawPaths.filter(p => p.converted).length;
        markRunSuccessful({
            scenario: scenarioKey,
            sample_size: sampleSize,
            channels: CHANNELS.length,
            conversion_rate: (convCount / sampleSize * 100).toFixed(1)
        }, `Shapley model: ${sampleSize} paths, ${(convCount / sampleSize * 100).toFixed(1)}% conversion`);
    }
    
    renderPathStats();
    updateChannelToggles();
    updateUI();
    renderSynergyMatrix(); // NEW
}

/**
 * Helper: Generate 200 paths based on scenario rules
 */
function generateSyntheticData(config, count) {
    const paths = [];
    
    // Determine complexity based on config.maxPathLength
    const maxLen = config.maxPathLength || 3;

    for(let i=0; i<count; i++) {
        // 1. Determine Path Length (Seed controlled)
        // Skew slightly towards shorter paths
        const roll = prng.next(); // Use SeededRNG
        let pathLen = 1;
        if (roll > 0.3) pathLen = Math.ceil(prng.next() * maxLen);
        
        // 2. Pick Channels
        const pathChannels = [];
        for(let s=0; s<pathLen; s++) {
            pathChannels.push(pickWeightedChannel(config.baseWeights));
        }
        
        // 3. Determine Conversion
        // Calculate theoretical probability for this exact path
        const uniqueSet = [...new Set(pathChannels)];
        const theoreticalRate = getTheoreticalRate(uniqueSet, config);
        
        // Random roll
        const converted = (prng.next() * 100) < theoreticalRate;
        
        paths.push({
            id: i,
            path: pathChannels,
            converted: converted
        });
    }
    return paths;
}

function pickWeightedChannel(weights) {
    const totalW = Object.values(weights).reduce((a,b)=>a+b, 0);
    let r = prng.next() * totalW; // Use SeededRNG
    for (const ch of CHANNELS) {
        r -= weights[ch];
        if (r <= 0) return ch;
    }
    return CHANNELS[CHANNELS.length-1];
}

function getTheoreticalRate(coalition, config) {
    if (coalition.length === 0) return 0;
    
    let linearSum = 0;
    coalition.forEach(ch => linearSum += config.baseWeights[ch]);
    
    let finalValue = linearSum;
    if (coalition.length > 1) {
        finalValue = linearSum * config.synergyFactor;
        if (appState.currentScenario === 'dominance' && coalition.includes('search')) {
            finalValue += 5; 
        }
    }
    
    // Global Suppression for Realism (Target ~5-8% overall rate instead of 20%+)
    finalValue = finalValue * 0.45;

    // Cap
    return Math.min(finalValue, 80);
}

// Rendering Path Stats
function exportToCSV() {
    let csv = 'Path_ID,Channel_Sequence,Unique_Channels,Converted\n';
    
    appState.rawPaths.forEach(p => {
        const pathSeq = p.path.join(' -> ');
        const uniqueSet = [...new Set(p.path)].sort().join('+');
        const conv = p.converted ? '1' : '0';
        csv += `${p.id},"${pathSeq}","${uniqueSet}",${conv}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shapley_paths_${appState.currentScenario}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function renderPathStats() {
    const listContainer = document.getElementById('path-list-display');
    const totalConvDisplay = document.getElementById('total-conv-display');
    const totalRateDisplay = document.getElementById('total-rate-display');
    
    // Stats
    const totalConv = appState.rawPaths.filter(p => p.converted).length;
    const rate = (totalConv / appState.rawPaths.length * 100).toFixed(1);
    
    totalConvDisplay.textContent = totalConv;
    totalRateDisplay.textContent = rate + '%';
    
    // --- New Aggregated Logic ---
    const pathGroups = {};
    
    // 1. Group by unique path signature
    appState.rawPaths.forEach(p => {
        const key = p.path.join('|'); // strict sequence match
        if (!pathGroups[key]) {
            pathGroups[key] = {
                path: p.path,
                total: 0,
                converted: 0,
                notConverted: 0
            };
        }
        pathGroups[key].total++;
        if (p.converted) {
            pathGroups[key].converted++;
        } else {
            pathGroups[key].notConverted++;
        }
    });

    listContainer.innerHTML = '';

    // 2. Create Header
    const headerRow = document.createElement('div');
    headerRow.className = 'path-row';
    headerRow.style.fontWeight = 'bold';
    headerRow.style.background = '#f1f5f9';
    headerRow.style.borderBottom = '2px solid #cbd5e1';
    headerRow.style.padding = '10px';
    headerRow.innerHTML = `
        <div style="flex:2; font-size:0.85rem; text-transform:uppercase; color:#64748b;">Unique User Journey</div>
        <div style="width:60px; text-align:center; font-size:0.85rem; color:#64748b;">Total</div>
        <div style="width:60px; text-align:center; font-size:0.85rem; color:#64748b;">Bought</div>
        <div style="width:60px; text-align:center; font-size:0.85rem; color:#64748b;">No Buy</div>
        <div style="width:70px; text-align:right; font-size:0.85rem; color:#64748b;">Rate %</div>
    `;
    listContainer.appendChild(headerRow);

    // 3. Sort by volume (Most common paths first)
    const sortedGroups = Object.values(pathGroups).sort((a,b) => b.total - a.total);
    
    // 4. Render Rows
    sortedGroups.forEach(group => {
        const row = document.createElement('div');
        row.className = 'path-row';
        
        // steps visual
        const stepsHtml = group.path.map((ch, idx) => {
            const isLast = idx === group.path.length - 1;
            const arrow = isLast ? '' : '<span class="path-arrow">→</span>';
            const color = COLORS[ch];
            return `
                <span class="path-step" style="border-left: 3px solid ${color}">
                    ${CHANNEL_NAMES[ch]}
                </span> ${arrow}
            `;
        }).join('');
        
        // Stats for this row
        const groupRate = ((group.converted / group.total) * 100).toFixed(1);
        const rateColor = groupRate > 30 ? 'var(--app-success)' : '#64748b'; 

        row.innerHTML = `
            <div style="flex:2;">${stepsHtml}</div>
            <div style="width:60px; text-align:center; font-weight:bold;">${group.total}</div>
            <div style="width:60px; text-align:center; color:var(--app-success);">${group.converted}</div>
            <div style="width:60px; text-align:center; color:#94a3b8;">${group.notConverted}</div>
            <div style="width:70px; text-align:right; font-weight:bold; color:${rateColor};">${groupRate}%</div>
        `;
        listContainer.appendChild(row);
    });
}

function updateCurrentCoalitionValue(newVal) {
    const currentTeam = Array.from(appState.activeChannels);
    appState.calc.setCoalitionValue(currentTeam, newVal);
    updateUI(true); // skip slider update to avoid loop
}

// --- Rendering ---

function updateChannelToggles() {
    document.querySelectorAll('.channel-toggle').forEach(btn => {
        const ch = btn.dataset.channel;
        const isActive = appState.activeChannels.has(ch);
        btn.setAttribute('aria-pressed', isActive);
    });
}

function updateUI(skipSlider = false) {
    const currentTeam = Array.from(appState.activeChannels);
    
    // 1. Get Value of Current Mix
    const val = appState.calc.getCoalitionValue(currentTeam);
    
    // Update Number Display
    document.getElementById('team-cv-display').textContent = val.toFixed(1) + '%';
    
    // Update Slider (if not dragging it right now)
    if (!skipSlider) {
        document.getElementById('team-value-slider').value = val;
    }

    // NEW: Synergy/Lift logic for the "Mix Lab"
    // Calculate sum of individual parts (Linear expectation)
    let sumParts = 0;
    currentTeam.forEach(ch => {
        // Base weight from scenario config serves as proxy for "stand-alone" strength in this simplified visualization
        // Or better: Use the Calc's value for the singleton set {ch}
        sumParts += appState.calc.getCoalitionValue([ch]);
    });
    
    const synergyContainer = document.getElementById('synergy-badge');
    if (currentTeam.length > 1) {
        const diff = val - sumParts;
        synergyContainer.style.display = 'block';
        if (diff > 0.5) {
            synergyContainer.innerHTML = `🚀 Positive Synergy (+${diff.toFixed(1)}%)`;
            synergyContainer.style.background = '#dcfce7';
            synergyContainer.style.color = '#166534';
            synergyContainer.title = "This combination performs better than the sum of its individual parts (Positive Synergy).";
        } else if (diff < -0.5) {
            synergyContainer.innerHTML = `📉 Saturation (${diff.toFixed(1)}%)`;
            synergyContainer.style.background = '#fee2e2';
            synergyContainer.style.color = '#991b1b';
            synergyContainer.title = "This combination performs worse than the sum of its parts (Cannibalization/Diminishing Returns).";
        } else {
            synergyContainer.innerHTML = `⚖️ Neutral`;
            synergyContainer.style.background = '#f1f5f9';
            synergyContainer.style.color = '#64748b';
        }
    } else {
        synergyContainer.style.display = 'none';
    }

    // 2. Recalculate Shapley (Global)
    const attribution = appState.calc.calculate();
    renderCharts(attribution);
    
    // 3. Update Detail Table (for currently selected detail channel)
    const detailSelect = document.getElementById('detail-channel-select');
    updateCalculationDetails(detailSelect.value);
}

function updateCalculationDetails(channelId) {
    if (!channelId) return;

    // Update table column headers with channel name
    const channelName = CHANNEL_NAMES[channelId];
    const thWithout = document.getElementById('th-without-channel');
    const thWith = document.getElementById('th-with-channel');
    const thLift = document.getElementById('th-lift-channel');
    if (thWithout) thWithout.textContent = `(Rate WITHOUT ${channelName})`;
    if (thWith) thWith.textContent = `(Rate WITH ${channelName})`;
    if (thLift) thLift.textContent = `(Lift from ${channelName})`;

    const details = appState.calc.getDetailedCalculation(channelId);
    const tbody = document.getElementById('calc-table-body');
    tbody.innerHTML = '';
    
    let totalShapley = 0;

    details.forEach(row => {
        const tr = document.createElement('tr');
        
        // 1. Get readable names for the "Base Mix"
        let teamNames = row.coalition.map(c => CHANNEL_NAMES[c]).join(' + ');
        if (row.coalition.length === 0) teamNames = '(Empty / No Marketing)';

        // 2. Lookup actual stats from appState.aggregatedStats
        const keyWithout = row.coalition.sort().join(',');
        const keyWith = [...row.coalition, channelId].sort().join(',');
        
        const statsWithout = appState.aggregatedStats[keyWithout] || { users: 0, conv: 0 };
        const statsWith = appState.aggregatedStats[keyWith] || { users: 0, conv: 0 };

        // Helper to format: "5.0% (2/40)"
        const formatStat = (rate, stats) => {
            if (stats.users === 0) return `<span class="muted" title="Estimated from theoretical model">${rate.toFixed(1)}% *</span>`;
            return `<strong>${rate.toFixed(1)}%</strong> <span class="text-sm muted">(${stats.conv}/${stats.users})</span>`;
        };
        
        tr.innerHTML = `
            <td>
                <div style="font-weight:600;">${teamNames}</div>
            </td>
            <td>
                ${formatStat(row.val_without, statsWithout)}
            </td>
            <td style="background:#f0fdfa;">
                ${formatStat(row.val_with, statsWith)}
            </td>
            <td style="color:${row.marginal >= 0 ? 'var(--app-success)' : 'var(--app-danger)'}; font-weight:bold;">
                ${row.marginal > 0 ? '+' : ''}${row.marginal.toFixed(1)}%
            </td>
        `;
        tbody.appendChild(tr);

        totalShapley += (row.marginal * row.weight);
    });

    const finalDisplay = document.getElementById('calc-final-value');
    finalDisplay.textContent = totalShapley.toFixed(2);
    finalDisplay.style.color = 'var(--app-accent)';
}

function renderCharts(attribution) {
    // --- Chart 1: Attribution Results (Dual Axis or Annotated) ---
    const sortedChannels = CHANNELS; // Order matters? keep fixed
    
    // 1. Calculate Total Shapley Value (Total Impact)
    const totalImpact = Object.values(attribution).reduce((a,b) => a+b, 0);

    const xValues = sortedChannels.map(c => CHANNEL_NAMES[c]);
    
    // Absolute Values (Conversion % contribution)
    const yValuesAbs = sortedChannels.map(c => attribution[c]);
    
    // Relative Values (Share of Credit %) - Sums to 100%
    const yValuesRel = sortedChannels.map(c => (attribution[c] / totalImpact * 100));

    const colors = sortedChannels.map(c => COLORS[c]);
    
    // We will use a Bar chart but with custom hover text showing BOTH
    const traceShapley = {
        x: xValues,
        y: yValuesAbs,
        type: 'bar',
        marker: { color: colors },
        // Text on the bar shows the Absolute contribution (e.g., "+5.2%")
        text: yValuesAbs.map((v, i) => `${v.toFixed(1)}% <br>(${yValuesRel[i].toFixed(0)}%)`),
        textposition: 'auto',
        hovertemplate: 
            '<b>%{x}</b><br>' +
            'Marginal Contribution: %{y:.2f}%<br>' +
            'Share of Credit: %{customdata:.1f}%<extra></extra>',
        customdata: yValuesRel
    };

    const layoutShapley = {
        margin: { t: 30, b: 30, l: 40, r: 10 },
        yaxis: { 
            title: 'Marginal Conversion Impact (%)',
            range: [0, Math.max(...yValuesAbs) * 1.2] 
        },
        title: {
            text: `Total Conversion Rate Explained: ${totalImpact.toFixed(1)}%`,
            font: { size: 14 }
        },
        showlegend: false
    };

    Plotly.newPlot('plotly-waterfall', [traceShapley], layoutShapley, {displayModeBar: false});

    // --- Chart 2: Comparison (Shapley vs Linear vs Last Touch) ---
    // Let's fake/approximate Last Touch & Linear based on our Scenario config
    // In a real app we'd calc these from raw paths, but here we estimate from weights
    
    let linearVals = [];
    let lastClickVals = [];
    
    // Retrieve base weights for simulation context
    // This is "demo logic" - normally we'd have paths
    const config = SCENARIOS[appState.currentScenario];
    
    if (appState.currentScenario === 'linear') {
         // Linear is basically Base Weights normalized to Total Shapley
         const total = Object.values(attribution).reduce((a,b)=>a+b,0);
         const baseTotal = Object.values(config.baseWeights).reduce((a,b)=>a+b,0);
         sortedChannels.forEach(c => {
             linearVals.push( (config.baseWeights[c] / baseTotal) * total );
             lastClickVals.push( (config.baseWeights[c] / baseTotal) * total ); // same for linear scen
         });
    } else {
        // Synergy/Overlap scens:
        const total = Object.values(attribution).reduce((a,b)=>a+b,0);
        
        // Linear: Equal Credit - divides credit equally among all channels that touched
        // Use sortedChannels.length to handle any number of channels dynamically
        const avgVal = total / sortedChannels.length;
        linearVals = sortedChannels.map(() => avgVal);

        // Last Touch: Usually favors Search/Direct heavily
        // We'll hardcode a "Last Touch Bias" map
        const ltBias = { 'search': 0.5, 'social': 0.1, 'displayA': 0.05, 'displayB': 0.05, 'email': 0.3 };
        lastClickVals = sortedChannels.map(c => total * ltBias[c]);
    }
    
    const traceCompShapley = {
        x: xValues,
        y: yValuesAbs,
        name: 'Shapley',
        type: 'bar',
        marker: { color: colors }
    };
    
    const traceCompLinear = {
        x: xValues,
        y: linearVals,
        name: 'Linear (Equal)',
        type: 'bar',
        marker: { color: '#e2e8f0' }, // Very Light Grey (Slate 200)
        opacity: 0.8
    };

    const traceCompLast = {
        x: xValues,
        y: lastClickVals,
        name: 'Last Touch',
        type: 'bar',
        marker: { color: '#94a3b8' }, // Medium Light Grey (Slate 400)
        opacity: 0.6
    };

    const layoutComp = {
        barmode: 'group',
        yaxis: { title: 'Contribution to CR (%)' },
        margin: { t: 10, b: 30, l: 60, r: 10 },
        legend: { orientation: 'h', y: -0.2 }
    };

    Plotly.newPlot('plotly-comparison', [traceCompShapley, traceCompLinear, traceCompLast], layoutComp, {displayModeBar: false});

    // PROFESSOR MODE: Store comparison data for tutorial
    appState.comparisonData = {
        channels: sortedChannels,
        shapleyVals: yValuesAbs,
        lastTouchVals: lastClickVals,
        linearVals: linearVals
    };

    generateAnalystVerdict(sortedChannels, yValuesAbs, lastClickVals);
}

function generateAnalystVerdict(channels, shapleyVals, lastTouchVals) {
    const verdictBox = document.getElementById('analyst-verdict-box');
    const textEl = document.getElementById('analyst-verdict-text');
    
    // Find biggest discrepancy
    let maxDiff = 0;
    let worstChannel = ''; // Channel where LT > Shap (Over-credited)
    let bestChannel = '';  // Channel where Shap > LT (Under-credited)
    let biggestGapVal = 0;

    for (let i=0; i<channels.length; i++) {
        const diff = lastTouchVals[i] - shapleyVals[i]; // + means Last Touch is Higher
        if (Math.abs(diff) > maxDiff) {
            maxDiff = Math.abs(diff);
        }
        
        if (diff > 1.0 && diff > biggestGapVal) { // LT is much bigger
             worstChannel = CHANNEL_NAMES[channels[i]];
             biggestGapVal = diff;
        }
        
        if (diff < -1.0 && Math.abs(diff) > biggestGapVal) { // Shapley is much bigger
             bestChannel = CHANNEL_NAMES[channels[i]];
        }
    }
    
    verdictBox.style.display = 'block';
    
    if (worstChannel) {
        textEl.innerHTML = `
            <strong>Observation:</strong> The "Last Touch" model is dangerous here. It is over-crediting <strong>${worstChannel}</strong> by roughly <strong>+${biggestGapVal.toFixed(1)}%</strong> compared to reality.
            <br>
            <strong>Insight:</strong> This suggests ${worstChannel} is merely "harvesting" demand that was actually created by other channels earlier in the journey. Shapley successfully re-distributes that credit back to the "assisting" channels.
        `;
        verdictBox.style.borderLeft = '5px solid #ef4444';
        verdictBox.style.background = '#fef2f2';
    } else if (bestChannel) {
         textEl.innerHTML = `
            <strong>Observation:</strong> "Last Touch" is failing to see the value of <strong>${bestChannel}</strong>. 
            <br>
            <strong>Insight:</strong> Shapley math proves this channel is a critical "Team Player" that increases conversion rates when present, even if it doesn't get the final click.
        `;
        verdictBox.style.borderLeft = '5px solid #10b981';
        verdictBox.style.background = '#f0fdf4';
    } else {
        textEl.innerHTML = `
            <strong>Observation:</strong> In this specific scenario, the simple models (Last Touch) are actually quite close to the complex math (Shapley).
            <br>
            <strong>Insight:</strong> This happens when channels operate independently (Case A). If you see this in real life, you don't need a complex attribution tool—you can just trust your dashboard numbers!
        `;
        verdictBox.style.borderLeft = '5px solid #cbd5e1';
        verdictBox.style.background = '#f8fafc';
    }
}

// --- NEW VISUALIZATION ---

function renderSynergyMatrix() {
    // 1. Calculate Pairwise Synergies (Lower Triangle Only - matrix is symmetric)
    const axis = CHANNELS; // ['search', 'social', ...]
    const labels = axis.map(c => CHANNEL_NAMES[c]);
    
    // zValues[row][col] represents Synergy(Row, Col)
    // Only show lower triangle (where row > col) since matrix is symmetric
    const zValues = [];
    const textValues = [];

    // Find min/max for symmetrical color scale
    let maxAbs = 0.5; // default floor to avoid range collapse

    axis.forEach((rowCh, r) => {
        const row = [];
        const txtRow = [];
        axis.forEach((colCh, c) => {
            if (r <= c) {
                // Upper triangle + diagonal: leave blank (null)
                row.push(null); 
                txtRow.push("");
            } else {
                // Lower triangle: calculate synergy
                // v({A})
                const vA = appState.calc.getCoalitionValue([rowCh]);
                // v({B})
                const vB = appState.calc.getCoalitionValue([colCh]);
                // v({A,B})
                const vAB = appState.calc.getCoalitionValue([rowCh, colCh]);
                
                // Synergy = v({A,B}) - (vA + vB)
                let syn = vAB - (vA + vB);
                row.push(syn);
                txtRow.push((syn > 0 ? "+" : "") + syn.toFixed(1) + "%");
                
                if (Math.abs(syn) > maxAbs) maxAbs = Math.abs(syn);
            }
        });
        zValues.push(row);
        textValues.push(txtRow);
    });
    
    // 2. Plot Heatmap
    // We want Green for Positive, White for 0, Red for Negative
    
    const data = [{
        z: zValues,
        x: labels,
        y: labels,
        type: 'heatmap',
        colorscale: [
            [0, '#ef4444'],    // -Max (Red)
            [0.5, '#ffffff'],  // 0 (White)
            [1, '#22c55e']     // +Max (Green)
        ],
        zmin: -maxAbs,
        zmax: maxAbs,
        text: textValues, // Display formatted value
        texttemplate: "%{text}", 
        hovertemplate: `
            <b>%{x} + %{y}</b><br>
            Synergy: <b>%{text}</b><br>
            <span style="font-size:0.9em; color:#64748b;">
                Impact on Conversion Rate vs. Sum of Parts
            </span>
            <extra></extra>
        `
    }];
    
    const layout = {
        title: { text: '' }, 
        margin: { t: 20, b:40, l:100, r:20 },
        height: 400,
        xaxis: { side: 'bottom' },
        yaxis: { autorange: 'reversed' }
    };

    Plotly.newPlot('synergy-heatmap', data, layout, {displayModeBar: false});
    
    // PROFESSOR MODE: Store synergy data for tutorial
    appState.synergyData = {
        zValues: zValues,
        labels: labels,
        axis: axis
    };
}

