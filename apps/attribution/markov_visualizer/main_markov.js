// main_markov.js

// Shared constants (CHANNELS, SCENARIOS) are now loaded from assignment_data.js
// We use them directly here.

const TOOL_SLUG = 'markov-attribution';

let appState = {
    model: new MarkovAttribution(CHANNELS),
    rawPaths: []
};

// Expose for Professor Mode tutorial
window.appState = appState;

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    // Initialize Seed from UI
    handleSeedInit();
    loadScenario('synergy');
    
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
            // Re-run with SAME seed (proving determinism)
            const currentScen = document.getElementById('scenario-select').value;
            loadScenario(currentScen);
            
            // Visual feedback
            const originalText = rerollBtn.querySelector('strong').textContent;
            rerollBtn.querySelector('strong').textContent = "Regenerating...";
            setTimeout(() => {
                rerollBtn.querySelector('strong').textContent = originalText;
            }, 600);
        });
    }

    document.getElementById('scenario-select').addEventListener('change', (e) => {
        loadScenario(e.target.value);
    });
    
    // Seed "Set" Button
    const applySeedBtn = document.getElementById('apply-seed-btn');
    if(applySeedBtn) {
        applySeedBtn.addEventListener('click', () => {
             // 1. Lock seed
             handleSeedInit();

             // 2. Run immediately
             const currentScen = document.getElementById('scenario-select').value;
             loadScenario(currentScen);

             // 3. Visual feedback
             const originalText = applySeedBtn.textContent;
             applySeedBtn.textContent = "Running...";
             setTimeout(() => {
                 applySeedBtn.textContent = "Set";
             }, 800);
        });
    }

    document.querySelectorAll('.channel-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ch = btn.dataset.remove;
            runRemovalExperiment(ch);
        });
    });
}

function loadScenario(key) {
    const config = SCENARIOS[key];
    
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
    
    // Update Removal Button Labels
    document.querySelectorAll('.channel-toggle').forEach(btn => {
        const ch = btn.dataset.remove;
        if (CHANNEL_NAMES[ch]) {
            // Keep the icon if we can find it, or just use text?
            // Existing text: "Remove Search 🔍". Let's try to preserve the icon char if it's at the end.
            const oldText = btn.textContent; // "Remove Search 🔍"
            // Simple approach: Extract the last char if it's non-alpha (emoji)
            const lastChar = oldText.trim().slice(-2); // Grab last 2 chars to be safe for surrogate pairs
            // Check if it looks like an emoji/icon (crudely)
            const hasIcon = /[\u{1F300}-\u{1F9FF}]/u.test(lastChar);
            
            // If we detect an icon, keep it. Otherwise default logic.
            // Actually, simpler: just rewrite "Remove [Name]" and don't worry about icon for B2B?
            // Or assume the icon is always the last token?
            // Let's just create a new string: "Remove " + Name
            btn.textContent = `Remove ${CHANNEL_NAMES[ch]}`;
        }
    });

    // Use config sampleSize if available, otherwise default to 12000
    const sampleSize = config.sampleSize || 12000;
    
    // Update Dynamic Texts
    const countStr = sampleSize.toLocaleString();
    const simStatusText = document.getElementById('sim-status-text');
    if (simStatusText) simStatusText.textContent = `Generating ${countStr} User Journeys...`;
    
    const pathCountDisplay = document.getElementById('path-count-display');
    if (pathCountDisplay) pathCountDisplay.textContent = `Showing first 15 of ${countStr} paths`;

    const sankeyIntroText = document.getElementById('sankey-intro-text');
    if (sankeyIntroText) sankeyIntroText.innerHTML = `The table above is hard to read. A <strong>Sankey Diagram</strong> aggregates all those ${countStr} paths into a single "River of Traffic".`;

    appState.rawPaths = generateSyntheticData(config, sampleSize, key);
    
    // Train Model - this properly handles conversion vs. abandonment from path outcomes
    appState.model.train(appState.rawPaths);
    
    // Inject scenario description
    const descEl = document.getElementById('scenario-description');
    if (descEl && config.description) {
        descEl.innerHTML = config.description;
    }
    
    // Track scenario load and successful run
    if (typeof markScenarioLoaded === 'function') {
        markScenarioLoaded(config.name || key);
    }
    if (typeof markRunAttempted === 'function') {
        markRunAttempted();
    }
    if (typeof markRunSuccessful === 'function') {
        const convCount = appState.rawPaths.filter(p => p.converted).length;
        markRunSuccessful({
            scenario: key,
            sample_size: sampleSize,
            channels: CHANNELS.length,
            conversion_rate: (convCount / sampleSize * 100).toFixed(1)
        }, `Markov model: ${sampleSize} paths, ${(convCount / sampleSize * 100).toFixed(1)}% conversion`);
    }
    
    // Render
    renderPathTable(appState.rawPaths);
    renderGlobalStats(appState.rawPaths); // NEW: Update stats bar
    renderSankey();
    renderHeatmap();
    renderNetworkGraph();       // NEW: Force Directed Graph
    renderGlobalRemovalChart(); // NEW: Global Removal Overview
    renderAttribution();
    renderComparison(); // Add comparison chart
    
    // Reset removal box
    document.getElementById('removal-result-box').style.display = 'none';
}

/**
 * Run the specific experiment of Removing one channel
 */
function runRemovalExperiment(channel) {
    const res = appState.model.calculateAttributionProportional();
    
    // Debug logging
    console.log('=== Removal Experiment Debug ===');
    console.log('Selected channel:', channel);
    console.log('Base conversion rate:', res.baseConversionRate);
    console.log('All removal effects:', res.removalEffects);
    console.log('All attributions:', res.attribution);
    
    const impact = res.removalEffects[channel];
    const base = res.baseConversionRate;
    
    // Calculate what the NEW rate would be
    // Impact = 1 - (New / Base) -> New = Base * (1 - Impact)
    const newRate = base * (1 - impact);

    // Update UI
    const box = document.getElementById('removal-result-box');
    const nameSpan = document.getElementById('removed-channel-name');
    const baseBar = document.getElementById('viz-bar-base');
    const newBar = document.getElementById('viz-bar-new');
    const baseVal = document.getElementById('viz-val-base');
    const newVal = document.getElementById('viz-val-new');
    const analysis = document.getElementById('removal-analysis-text');

    box.style.display = 'block';
    nameSpan.textContent = CHANNEL_NAMES[channel];

    // Calc Heights (Max height = base rate + buffer)
    const maxH = 150; // px
    
    // Set text
    baseVal.textContent = (base * 100).toFixed(2) + '%';
    newVal.textContent = (newRate * 100).toFixed(2) + '%';
    
    // Animate bars
    baseBar.style.height = '0px'; 
    newBar.style.height = '0px';

    setTimeout(() => {
        baseBar.style.height = '140px'; // Nearly full relative to container
        // if base is 140px, then new is proportional
        const relativeH = (newRate / base) * 140;
        newBar.style.height = `${Math.max(0, relativeH)}px`;
    }, 50);

    const dropPct = (impact * 100).toFixed(1);
    const finalShare = (res.attribution[channel] * 100).toFixed(1);
    
    analysis.innerHTML = `
        If we lose <strong>${CHANNEL_NAMES[channel]}</strong>, our conversion rate drops by 
        <span style="color:#ef4444; font-weight:bold;">${dropPct}%</span> (Removal Effect).
        <br><br>
        Because multiple channels can be critical, the sum of valid "Removal Effects" often exceeds 100%. 
        <br>
        After <em>normalizing</em> these effects, ${CHANNEL_NAMES[channel]} receives 
        <strong>${finalShare}% of the final credit</strong>.
    `;
    
    // --- Update Matrix Surgery Details ---
    document.getElementById('removed-viz-name').textContent = CHANNEL_NAMES[channel];
    
    const matrix = appState.model.matrix;
    const states = appState.model.states;
    const chIdx = appState.model.stateIndex[channel];
    const listContainer = document.getElementById('broken-links-list');
    listContainer.innerHTML = ''; // clear previous
    
    // Find all sources that send traffic to this channel
    let impacts = [];
    matrix.forEach((row, rIdx) => {
        const prob = row[chIdx];
        if(prob > 0.000001) { // Lowered threshold to catch rare paths in small samples
            impacts.push({
                source: states[rIdx],
                prob: prob
            });
        }
    });
    
    if(impacts.length === 0) {
        listContainer.innerHTML = '<div style="color:#64748b; font-style:italic;">No significant traffic flowed into this channel.</div>';
    } else {
        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';
        
        impacts.sort((a,b) => b.prob - a.prob).forEach(item => {
            const li = document.createElement('li');
            li.style.padding = '4px 0';
            li.style.borderBottom = '1px solid #e2e8f0';
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            
            const srcName = CHANNEL_NAMES[item.source] || item.source;
            const pct = (item.prob * 100).toFixed(1);
            
            li.innerHTML = `
                <span>From <strong>${srcName}</strong></span>
                <span style="color:#3b82f6;">${pct}% → Redistributed</span>
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    }
}


// --- Visualization Rendering ---

function renderSankey() {
    const matrix = appState.model.matrix;
    const labels = appState.model.states.map(s => CHANNEL_NAMES[s] || s);
    const colors = appState.model.states.map(s => COLORS[s] || '#ccc');

    const source = [];
    const target = [];
    const value = [];
    const linkColors = []; // Color links by source channel

    // Threshold to hide small flows (adjust for clarity)
    const THRESHOLD = 0.02; 

    for(let r=0; r<matrix.length; r++) {
        for(let c=0; c<matrix[r].length; c++) {
            const val = matrix[r][c];
            if (val > THRESHOLD) {
                 source.push(r);
                 target.push(c);
                 // Flow volume: probability (0-1) × 100 = percentage of starting traffic
                 const flowPercent = val * 100;
                 // Exaggerate differences: use power function to make large flows more prominent
                 // Store actual value for display, but use exaggerated value for visual width
                 const visualWidth = Math.pow(flowPercent, 1.3); // Exaggerate by 30%
                 value.push(visualWidth); 
                 
                 // Color the link based on source channel (with transparency)
                 const sourceColor = colors[r] || '#94a3b8';
                 // Convert hex to rgba with 40% opacity
                 const rgb = sourceColor.match(/\w\w/g).map(x => parseInt(x, 16));
                 linkColors.push(`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`);
            }
        }
    }
    
    // Define explicit node positions for better layout (0 = left, 1 = right)
    // Start at far left, channels in middle columns, outcomes at far right
    const nodeX = [];
    const nodeY = [];
    const stateCount = appState.model.states.length;
    
    appState.model.states.forEach((state, idx) => {
        if (state === '(start)') {
            nodeX.push(0.01);  // Far left
            nodeY.push(0.5);   // Vertically centered
        } else if (state === '(conversion)') {
            nodeX.push(0.99);  // Far right
            nodeY.push(0.3);   // Upper right
        } else if (state === '(null)') {
            nodeX.push(0.99);  // Far right
            nodeY.push(0.7);   // Lower right
        } else {
            // Marketing channels: spread vertically in middle columns
            const channelIdx = CHANNELS.indexOf(state);
            if (channelIdx !== -1) {
                nodeX.push(0.35 + (channelIdx % 2) * 0.3); // Alternate between 35% and 65%
                nodeY.push(0.2 + (channelIdx * 0.15));      // Spread vertically
            } else {
                nodeX.push(0.5);
                nodeY.push(0.5);
            }
        }
    });

    const data = {
        type: "sankey",
        orientation: "h",
        arrangement: "snap",  // Snap nodes to positions for cleaner layout
        node: {
          pad: 25,           // More spacing between nodes
          thickness: 35,     // Wider nodes for better visibility
          line: { color: "white", width: 2 },
          label: labels,
          color: colors,
          x: nodeX,          // Explicit horizontal positions
          y: nodeY,          // Explicit vertical positions
          // Clarified hover: sum of transitions can exceed 100% due to loops
          hovertemplate: '<b>%{label}</b><br>Cumulative Transitions: %{value:.1f}%<br><span style="font-size:0.9em; color:#64748b;">(Can exceed 100% if users revisit)</span><extra></extra>'
        },
        link: {
          source: source,
          target: target,
          value: value,
          color: linkColors,  // Color by source channel
          // Enhanced hover - need to recalculate actual percentage from exaggerated width
          customdata: source.map((s, i) => {
              // Reverse the exaggeration to show true percentage
              const actualPercent = Math.pow(value[i], 1/1.3);
              return actualPercent;
          }),
          hovertemplate: `
            <b>Journey Step</b><br>
            %{source.label} → %{target.label}<br>
            <b>%{customdata:.1f}%</b> of users take this path
            <extra></extra>
          `
        }
    };

    const layout = {
        title: {
          text: 'Customer Journey Flow Map<br><sub style="font-size:0.85em; color:#64748b;">Width = % of users (exaggerated) | Colors = Channel source</sub>',
          font: { size: 15 }
        },
        margin: { t: 60, b: 30, l: 40, r: 40 },
        font: { size: 14, family: 'Inter, sans-serif' }
    };

    Plotly.newPlot('sankey-diagram', [data], layout);
}

function renderHeatmap() {
    const matrix = appState.model.matrix;
    const labels = appState.model.states.map(s => CHANNEL_NAMES[s] || s);

    // Custom Colorscale: White -> Light Blue -> Dark Blue
    // This helps distinguish true 0 from small values
    const niceBlues = [
        [0, '#ffffff'], 
        [0.001, '#e0f2fe'], 
        [1, '#0369a1']
    ];

    const data = [{
        z: matrix,
        x: labels,
        y: labels,
        type: 'heatmap',
        colorscale: niceBlues,
        // Show % on the squares
        texttemplate: "%{z:.0%}", 
        hovertemplate: `
            <b>Transition Probability</b><br>
            From: <b>%{y}</b><br>
            To: <b>%{x}</b><br>
            Probability: <b>%{z:.1%}</b><br>
            <span style="font-size:0.9em; color:#64748b;">If a user is at %{y}, they have a %{z:.1%} chance of moving to %{x} next</span>
            <extra></extra>
        `
    }];
    
    const layout = {
        // yaxis: { autorange: 'reversed', title: 'Start State' },
        // Actually, let's keep standard orientation but clear labels
        yaxis: { autorange: 'reversed', title: 'Start State (From)' }, 
        xaxis: { title: 'Next State (To)', side: 'top' },
        margin: { t: 100, l: 100 }
    };
    
    Plotly.newPlot('heatmap-container', data, layout);
}

function renderAttribution() {
    const res = appState.model.calculateAttributionProportional();
    const attrShares = res.attribution; // These sum to 1.0
    const totalCR = res.baseConversionRate * 100; // e.g. 5.2%

    const x = CHANNELS.map(c => CHANNEL_NAMES[c]);
    
    // Y Axis = Absolute Contribution to Conv Rate (e.g. 1.2%)
    // This matches Shapley's "Marginal Contribution" concept
    const yAbs = CHANNELS.map(c => (attrShares[c] * totalCR));
    
    // For Label: Share of Credit (e.g. 20%)
    const yRel = CHANNELS.map(c => (attrShares[c] * 100));
    
    const c = CHANNELS.map(c => COLORS[c]);

    const data = [{
        x: x,
        y: yAbs,
        type: 'bar',
        marker: { color: c },
        // Text shows: "+1.2% (20%)" to match Shapley
        text: yAbs.map((v, i) => `+${v.toFixed(2)}%<br>(${yRel[i].toFixed(0)}%)`),
        textposition: 'auto',
        hovertemplate: 
            '<b>%{x}</b><br>' +
            'Attributed Impact: %{y:.2f}%<br>' +
            'Share of Credit: %{customdata:.1f}%<extra></extra>',
        customdata: yRel
    }];

    const layout = {
        title: {
            text: `Total Conversion Rate Explained: ${totalCR.toFixed(2)}%`,
            font: { size: 14 }
        },
        yaxis: { 
            title: 'Marginal Conversion Impact (%)',
            range: [0, Math.max(...yAbs) * 1.25] // mild buffer
        },
        margin: { t: 40, b:40, l:40, r:10 },
        showlegend: false
    };

    Plotly.newPlot('markov-bar-chart', data, layout, {displayModeBar: false});
}

function renderComparison() {
    // Calculate Markov attribution (already done)
    const markovRes = appState.model.calculateAttributionProportional();
    const markovShares = markovRes.attribution;
    const totalCR = markovRes.baseConversionRate * 100;
    
    // Calculate Shapley attribution from same paths
    const shapleyCalc = new ShapleyCalculator(CHANNELS);
    
    // Aggregate paths to get coalition values
    const coalitionStats = {};
    const totalSubsets = 1 << CHANNELS.length;
    for (let i = 0; i < totalSubsets; i++) {
        const coalition = [];
        for (let j = 0; j < CHANNELS.length; j++) {
            if ((i & (1 << j)) !== 0) coalition.push(CHANNELS[j]);
        }
        coalitionStats[coalition.sort().join(',')] = { users: 0, conv: 0 };
    }
    
    // Tally paths
    appState.rawPaths.forEach(p => {
        const uniqueChannels = [...new Set(p.path)].sort().join(',');
        if (coalitionStats[uniqueChannels]) {
            coalitionStats[uniqueChannels].users++;
            if (p.converted) coalitionStats[uniqueChannels].conv++;
        }
    });
    
    // Set coalition values (conversion rates)
    for (const key in coalitionStats) {
        const data = coalitionStats[key];
        const rate = data.users > 0 ? (data.conv / data.users) * 100 : 0;
        const coalition = key ? key.split(',') : [];
        shapleyCalc.setCoalitionValue(coalition, rate);
    }
    
    // Calculate Shapley values
    const shapleyValues = shapleyCalc.calculate();
    
    // Prepare data for grouped bar chart
    const x = CHANNELS.map(c => CHANNEL_NAMES[c]);
    
    // Shapley: absolute contribution
    const shapleyAbs = CHANNELS.map(c => shapleyValues[c]);
    
    // Markov: absolute contribution (share × total CR)
    const markovAbs = CHANNELS.map(c => markovShares[c] * totalCR);
    
    const traceShapley = {
        x: x,
        y: shapleyAbs,
        name: 'Shapley Value',
        type: 'bar',
        marker: { color: '#3b82f6' },
        hovertemplate: '<b>%{x}</b><br>Shapley: %{y:.2f}%<extra></extra>'
    };
    
    const traceMarkov = {
        x: x,
        y: markovAbs,
        name: 'Markov Chain',
        type: 'bar',
        marker: { color: '#8b5cf6' },
        hovertemplate: '<b>%{x}</b><br>Markov: %{y:.2f}%<extra></extra>'
    };
    
    const layout = {
        title: {
            text: `Attribution Comparison: Shapley vs. Markov<br><sub style="font-size:0.85em;">Both methods applied to same ${appState.rawPaths.length.toLocaleString()} user journeys</sub>`,
            font: { size: 15 }
        },
        barmode: 'group',
        yaxis: { 
            title: 'Marginal Conversion Impact (%)',
            range: [0, Math.max(...shapleyAbs, ...markovAbs) * 1.2]
        },
        margin: { t: 70, b: 50, l: 50, r: 20 },
        legend: {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: -0.15
        }
    };
    
    Plotly.newPlot('comparison-chart', [traceShapley, traceMarkov], layout, {displayModeBar: false});
}


// --- Data Gen (Transition-Based) ---
function generateSyntheticData(config, count, scenarioKey) {
    const paths = [];
    const maxLen = config.maxPathLength || 5; // Allow longer paths for true Markov behavior
    
    // Define realistic transition probabilities based on scenario
    const transitions = getTransitionProbabilities(config, scenarioKey);

    for(let i=0; i<count; i++) {
        const pathChannels = [];
        let currentState = '(start)';
        let converted = false;
        
        // Follow transition probabilities to build path
        for(let step=0; step<maxLen; step++) {
            const nextState = pickWeightedTransition(transitions[currentState] || {});
            
            // Pure Markov Outcome Determination
            if (nextState === '(end)') {
                converted = true;
                break; // Path successfully connected
            }
            else if (nextState === '(null)' || !nextState) {
                converted = false;
                break; // Path abandoned (Lost)
            }
            else {
                pathChannels.push(nextState);
                currentState = nextState;
            }
        }
        
        // If loop finished without hitting (end) or (null), it's a dropout (max steps reached)
        // This implicitly acts as the "(null)" state for long wandering paths
        
        // Ensure at least one channel (fallback for edge cases where start->end immediately)
        if (pathChannels.length === 0) {
            // Retry this iteration or force a single step
            // For simplicity, force a weighted start channel and fail
            pathChannels.push(pickWeightedChannel(config.baseWeights));
            converted = false; 
        }

        paths.push({
            id: i,
            path: pathChannels,
            converted: converted
        });
    }
    return paths;
}

function getTransitionProbabilities(config, scenarioKey) {
    // Pure Markov Setup: Probabilities determine structure AND outcome
    
    function buildTransitions(entryWeights, transitionBoosts, exitBoosts, selfLoopBoosts) {
        const trans = {};
        
        // Default probabilities
        // TUNED: Lowered Exit rate to simulate realistic ~4-8% total CR
        // Increased Null rate to simulate realistic bounce/loss
        const DEFAULT_CHANNEL_TO_CHANNEL = 0.12; 
        const DEFAULT_EXIT = 0.02;      
        const DEFAULT_NULL = 0.15;      
        const DEFAULT_SELF_LOOP = 0.15; 
        
        // Start state - entry weights
        trans['(start)'] = {...entryWeights};
        
        // Build each channel's transitions
        CHANNELS.forEach(fromCh => {
            trans[fromCh] = {};
            
            // 1. Transitions to other channels
            CHANNELS.forEach(toCh => {
                if (fromCh !== toCh) {
                    const boost = transitionBoosts?.[fromCh]?.[toCh] || 1.0;
                    trans[fromCh][toCh] = DEFAULT_CHANNEL_TO_CHANNEL * boost;
                }
            });
            
            // 2. Self Loop
            const selfBoost = selfLoopBoosts?.[fromCh] || 1.0;
            trans[fromCh][fromCh] = DEFAULT_SELF_LOOP * selfBoost;
            
            // 3. Conversion (Exit)
            const exitBoost = exitBoosts?.[fromCh] || 1.0;
            trans[fromCh]['(end)'] = DEFAULT_EXIT * exitBoost;
            
            // 4. Abandonment (Null)
            // We adding explicit null/lost probability to make the matrix complete
            trans[fromCh]['(null)'] = DEFAULT_NULL; 
            
            // Normalize to sum to 1.0
            const total = Object.values(trans[fromCh]).reduce((a,b) => a+b, 0);
            Object.keys(trans[fromCh]).forEach(k => {
                trans[fromCh][k] /= total;
            });
        });
        
        return trans;
    }
    
    const scenarios = {
        'linear': buildTransitions(
            // Entry weights
            { 'search': 0.5, 'social': 0.25, 'email': 0.15, 'displayA': 0.05, 'displayB': 0.05 },
            // Transition boosts (multiply defaults) - slight preference for linear flow
            {
                'social': { 'search': 1.3, 'email': 1.2 },
                'email': { 'search': 1.4 },
                'displayA': { 'search': 1.3 },
                'displayB': { 'search': 1.3 }
            },
            // Exit boosts - search converts better
            { 'search': 1.8, 'email': 1.3, 'social': 1.0, 'displayA': 0.8, 'displayB': 0.8 },
            // Self-loop boosts - moderate retargeting
            { 'search': 1.2, 'email': 1.0, 'social': 0.9, 'displayA': 0.8, 'displayB': 0.8 }
        ),
        
        'synergy': buildTransitions(
            // Entry weights - social and awareness first
            { 'social': 0.4, 'search': 0.25, 'displayA': 0.15, 'displayB': 0.12, 'email': 0.08 },
            // Transition boosts - emphasize synergistic paths
            {
                'social': { 'email': 1.6, 'displayA': 1.4, 'search': 1.3 },
                'displayA': { 'email': 1.5, 'search': 1.4 },
                'displayB': { 'email': 1.5, 'search': 1.4 },
                'email': { 'search': 1.7 }
            },
            // Exit boosts - more balanced conversion
            { 'search': 1.5, 'email': 1.4, 'social': 0.9, 'displayA': 1.0, 'displayB': 1.0 },
            // Self-loop boosts - moderate everywhere
            { 'search': 1.3, 'email': 1.2, 'social': 1.1, 'displayA': 1.0, 'displayB': 1.0 }
        ),
        
        'overlap': buildTransitions(
            // Entry weights - balanced
            { 'search': 0.3, 'social': 0.28, 'email': 0.18, 'displayA': 0.13, 'displayB': 0.11 },
            // Transition boosts - all channels interact freely (no strong patterns)
            {
                'search': { 'social': 1.2, 'email': 1.2 },
                'social': { 'search': 1.2, 'email': 1.1 },
                'email': { 'search': 1.2, 'social': 1.1 }
            },
            // Exit boosts - very similar conversion rates (overlap)
            { 'search': 1.2, 'social': 1.1, 'email': 1.3, 'displayA': 1.0, 'displayB': 1.0 },
            // Self-loop boosts - HIGH retargeting creates overlap
            { 'search': 1.6, 'social': 1.8, 'email': 1.4, 'displayA': 2.0, 'displayB': 2.0 }
        ),
        
        'dominance': buildTransitions(
            // Entry weights - search dominant but not extreme
            { 'search': 0.5, 'social': 0.2, 'email': 0.13, 'displayA': 0.1, 'displayB': 0.07 },
            // Transition boosts - all roads lead to search (moderate boost)
            {
                'social': { 'search': 1.8 },
                'email': { 'search': 2.0 },
                'displayA': { 'search': 1.9 },
                'displayB': { 'search': 1.9 }
            },
            // Exit boosts - search converts much better
            { 'search': 2.2, 'social': 0.8, 'email': 1.0, 'displayA': 0.7, 'displayB': 0.7 },
            // Self-loop boosts - search high (people search multiple times)
            { 'search': 2.0, 'social': 0.7, 'email': 0.7, 'displayA': 0.6, 'displayB': 0.6 }
        )
    };
    
    return scenarios[scenarioKey] || scenarios['synergy'];
}

function pickWeightedTransition(transitions) {
    const totalW = Object.values(transitions).reduce((a,b)=>a+b, 0);
    if (totalW === 0) return '(end)';
    
    let r = prng.next() * totalW; // Use SeededRNG
    for (const state in transitions) {
        r -= transitions[state];
        if (r <= 0) return state;
    }
    return '(end)';
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

function exportToCSV() {
    let csv = 'Path_ID,Channel_Sequence,Converted\n';
    
    appState.rawPaths.forEach(p => {
        const pathSeq = p.path.join(' -> ');
        const conv = p.converted ? '1' : '0';
        csv += `${p.id},"${pathSeq}",${conv}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markov_paths_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function renderPathTable(paths) {
    const listContainer = document.getElementById('path-list-display');
    if(!listContainer) return;
    listContainer.innerHTML = '';

    // --- Aggregation Logic (Ported from Shapley) ---
    const pathGroups = {};
    
    // 1. Group by unique path signature
    paths.forEach(p => {
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

    // 2. Create Header
    const headerRow = document.createElement('div');
    headerRow.className = 'path-row';
    headerRow.style.fontWeight = 'bold';
    headerRow.style.background = '#f1f5f9';
    headerRow.style.borderBottom = '2px solid #cbd5e1';
    headerRow.style.padding = '10px';
    headerRow.style.display = 'flex';
    headerRow.style.alignItems = 'center';
    headerRow.style.position = 'sticky';
    headerRow.style.top = '0'; // Sticky Header
    headerRow.style.zIndex = '10';

    headerRow.innerHTML = `
        <div style="flex:2; font-size:0.85rem; text-transform:uppercase; color:#64748b;">Unique User Journey</div>
        <div style="width:60px; text-align:center; font-size:0.85rem; color:#64748b;">Count</div>
        <div style="width:60px; text-align:center; font-size:0.85rem; color:#64748b;">Won</div>
        <div style="width:60px; text-align:center; font-size:0.85rem; color:#64748b;">Lost</div>
        <div style="width:70px; text-align:right; font-size:0.85rem; color:#64748b;">Conv. Rate</div>
    `;
    listContainer.appendChild(headerRow);

    // 3. Sort by volume (Most common paths first)
    const sortedGroups = Object.values(pathGroups).sort((a,b) => b.total - a.total);
    
    // 4. Render Rows
    sortedGroups.forEach(group => {
        const row = document.createElement('div');
        row.className = 'path-row';
        // Ensure flex layout matches header
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.padding = '8px 10px';
        row.style.borderBottom = '1px solid #f1f5f9';
        
        // steps visual
        const stepsHtml = group.path.map((ch, idx) => {
            const isLast = idx === group.path.length - 1;
            const arrow = isLast ? '' : '<span class="path-arrow" style="margin:0 4px; color:#cbd5e1;">→</span>';
            const color = COLORS[ch] || '#94a3b8';
            
            // Inline style fallback if CSS missing
            return `
                <span style="border-left: 3px solid ${color}; padding-left:4px; font-weight:500;">
                    ${CHANNEL_NAMES[ch]}
                </span> ${arrow}
            `;
        }).join('');
        
        // Stats for this row
        const groupRate = ((group.converted / group.total) * 100).toFixed(1);
        
        // Color coding for rate
        let rateColor = '#64748b';
        if(groupRate > 20) rateColor = '#22c55e'; // Good
        if(groupRate < 5) rateColor = '#ef4444';  // Bad

        row.innerHTML = `
            <div style="flex:2; font-size:0.9rem;">${stepsHtml}</div>
            <div style="width:60px; text-align:center; font-weight:bold;">${group.total}</div>
            <div style="width:60px; text-align:center; color:#22c55e;">${group.converted}</div>
            <div style="width:60px; text-align:center; color:#ef4444;">${group.notConverted}</div>
            <div style="width:70px; text-align:right; font-weight:bold; color:${rateColor};">${groupRate}%</div>
        `;
        listContainer.appendChild(row);
    });
}

function renderGlobalStats(paths) {
    const total = paths.length;
    const converted = paths.filter(p => p.converted).length;
    const rate = total > 0 ? ((converted / total) * 100).toFixed(2) : "0.00";

    const elTotal = document.getElementById('stat-total-paths');
    const elConv = document.getElementById('stat-total-conv');
    const elRate = document.getElementById('stat-conv-rate');

    if(elTotal) elTotal.textContent = total.toLocaleString();
    if(elConv) elConv.textContent = converted.toLocaleString();
    if(elRate) elRate.textContent = rate + "%";
}

// --- NEW VISUALIZATIONS ---

function renderNetworkGraph() {
    // 0. Get Visit Data for Sizing
    // Fallback to 1 to avoid div-by-zero if empty
    const visits = appState.model.stateVisits || {};
    const maxVisits = Math.max(...Object.values(visits), 1);
    
    // Helper: Non-linear scaling for Node Size
    // We use Math.pow(pct, 0.5) (Square Root) to ensure even mid-traffic nodes have visible presence
    const getNodeSize = (id) => {
        const count = visits[id] || 0;
        const pct = count / maxVisits; 
        
        // Floor of 25px, max of 80px
        return 25 + (Math.sqrt(pct) * 55); 
    };

    // 1. Prepare Nodes (Start, Conversion, Null, + Channels)
    // NOTE: ID must match 'this.states' in markov_math.js for edges to map correctly
    const nodes = [
        { id: '(start)', x: 0, y: 0.5, label: 'Start', color: '#334155', size: getNodeSize('(start)') },
        { id: '(conversion)', x: 1, y: 0.8, label: 'Conv.', color: '#22c55e', size: getNodeSize('(conversion)') },
        { id: '(null)', x: 1, y: 0.2, label: 'Lost', color: '#94a3b8', size: getNodeSize('(null)') }
    ];
    
    // Arrange Channels in a circle/column in the middle
    // For 5 channels, let's stack them vertically or circle
    // Vertical stack (x=0.5) allows clear left-to-right flow visualization
    const chCount = CHANNELS.length;
    CHANNELS.forEach((ch, i) => {
        nodes.push({
            id: ch,
            x: 0.5,
            y: 0.8 - (i * (0.6 / (chCount-1))), // Spread between 0.8 and 0.2
            label: CHANNEL_NAMES[ch],
            color: COLORS[ch],
            size: getNodeSize(ch)
        });
    });

    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    // 2. Prepare Edges (Scatter traces for lines)
    const edgeTraces = [];
    const matrix = appState.model.matrix;
    const states = appState.model.states;
    
    // Threshold to show edge (Very low to catch signal)
    const THRESHOLD = 0.001; 

    // Helper to add edge
    const addEdge = (fromId, toId, prob) => {
        if (prob < THRESHOLD) return;
        const from = nodeMap[fromId];
        const to = nodeMap[toId];
        if (!from || !to) return; // safety
        
        // Non-Linear Width Scaling
        // Floor = 2px (Always visible)
        // Scaler = Math.pow(prob, 0.5) -> Boosts small probabilities to be visible
        // e.g. 0.05 -> 0.22 * 20 = +4px
        // e.g. 0.50 -> 0.70 * 20 = +14px
        const width = 2 + (Math.pow(prob, 0.5) * 20); 
        
        // Uniform styling for ALL lines (even rules)
        edgeTraces.push({
            x: [from.x, to.x],
            y: [from.y, to.y],
            mode: 'lines',
            line: { width: width, color: '#94a3b8' }, // Uniform Slate 400
            hoverinfo: 'none', 
            showlegend: false,
            opacity: 0.5
        });
    };

    // Iterate matrix to find edges
    for(let r=0; r<matrix.length; r++) {
        for(let c=0; c<matrix[r].length; c++) {
            const fromCh = states[r];
            const toCh = states[c];
            addEdge(fromCh, toCh, matrix[r][c]);
        }
    }

    // 3. Node Trace (Scatter)
    const nodeTrace = {
        x: nodes.map(n => n.x),
        y: nodes.map(n => n.y),
        mode: 'markers+text',
        marker: {
            size: nodes.map(n => n.size),
            color: nodes.map(n => n.color),
            line: { width: 2, color: '#fff' }
        },
        text: nodes.map(n => n.label),
        textposition: 'top center',
        hoverinfo: 'text',
        name: 'Nodes'
    };

    // Combine
    const data = [...edgeTraces, nodeTrace];

    const layout = {
        title: 'Network Flow (Gravity Map)',
        showlegend: false,
        xaxis: { showgrid: false, zeroline: false, showticklabels: false, range: [-0.1, 1.1] },
        yaxis: { showgrid: false, zeroline: false, showticklabels: false, range: [0, 1] },
        height: 500,
        margin: {t:40, b:20, l:20, r:20},
        annotations: [
            {
                x: 0, y: 0.1, xref: 'x', yref: 'y',
                text: 'Flow starts left, moves usually right, but channels can loop back (Vertical stack represents the "Ecosystem")',
                showarrow: false,
                font: { size: 10, color: '#64748b' }
            }
        ]
    };

    Plotly.newPlot('network-graph', data, layout, {displayModeBar: false});
}

function renderGlobalRemovalChart() {
    // Calculate removal effect for ALL channels
    // The model already returns removalEffects dictionary { 'search': 0.15, ... }
    const res = appState.model.calculateAttributionProportional(); 
    const effects = [];

    CHANNELS.forEach(ch => {
        const drop = res.removalEffects[ch] || 0;
        effects.push({
            channel: ch,
            name: CHANNEL_NAMES[ch],
            drop: drop,
            color: COLORS[ch]
        });
    });

    // Sort by Impact (Highest first)
    effects.sort((a,b) => b.drop - a.drop);

    // Render Bar Chart
    const data = [{
        x: effects.map(e => e.name),
        y: effects.map(e => e.drop * 100), // %
        type: 'bar',
        marker: {
            color: effects.map(e => e.drop > 0.15 ? '#ef4444' : '#3b82f6'), // Red if >15% impact
            opacity: 0.8
        },
        text: effects.map(e => `-${(e.drop*100).toFixed(1)}%`),
        textposition: 'auto',
        hovertemplate: `<b>%{x}</b><br>Removal Impact: -%{y:.1f}%<br><span style="color:#64748b; font-size:0.9em;">(Conversion Rate would drop by this much)</span><extra></extra>`
    }];

    const layout = {
        title: { text: '' }, 
        yaxis: { title: '% Drop in Conversions' },
        margin: { t: 20, b:40, l:50, r:20 }
    };

    Plotly.newPlot('global-removal-chart', data, layout, {displayModeBar: false});
}
