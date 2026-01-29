// main_markov.js

// Reusing same channel defs as Shapley for consistency
const CHANNELS = ['search', 'social', 'displayA', 'displayB', 'email'];
const CHANNEL_NAMES = {
    'search': 'Paid Search',
    'social': 'Social',
    'displayA': 'Display A',
    'displayB': 'Display B',
    'email': 'Email',
    '(start)': 'Start',
    '(conversion)': 'Converted',
    '(null)': 'Lost / Null'
};
const COLORS = {
    'search': '#3b82f6',
    'social': '#ec4899',
    'displayA': '#f59e0b',
    'displayB': '#d97706',
    'email': '#10b981',
    '(start)': '#94a3b8',
    '(conversion)': '#22c55e',
    '(null)': '#ef4444'
};

// Simplified Scenarios (Duplicated from Shapley for standalone functioning)
const SCENARIOS = {
    'linear': {
        baseWeights: { 'search': 5, 'social': 3, 'displayA': 0.6, 'displayB': 0.4, 'email': 2 },
        synergyFactor: 1.0, 
        maxPathLength: 3
    },
    'synergy': {
        baseWeights: { 'search': 3, 'social': 4, 'displayA': 1, 'displayB': 1, 'email': 3 },
        synergyFactor: 1.5,
        maxPathLength: 6
    },
    'overlap': {
        baseWeights: { 'search': 8, 'social': 6, 'displayA': 3, 'displayB': 3, 'email': 6 },
        synergyFactor: 0.6,
        maxPathLength: 5
    }
};

let appState = {
    model: new MarkovAttribution(CHANNELS),
    rawPaths: []
};

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    loadScenario('synergy');
});

function initUI() {
    document.getElementById('scenario-select').addEventListener('change', (e) => {
        loadScenario(e.target.value);
    });

    document.querySelectorAll('.channel-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ch = btn.dataset.remove;
            runRemovalExperiment(ch);
        });
    });
}

function loadScenario(key) {
    const config = SCENARIOS[key];
    appState.rawPaths = generateSyntheticData(config, 12000);
    
    // Train Model
    appState.model.train(appState.rawPaths);
    
    // Render
    renderPathTable(appState.rawPaths);
    renderSankey();
    renderHeatmap();
    renderAttribution();
    
    // Reset removal box
    document.getElementById('removal-result-box').style.display = 'none';
}

/**
 * Run the specific experiment of Removing one channel
 */
function runRemovalExperiment(channel) {
    const res = appState.model.calculateAttributionProportional();
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
    
    analysis.innerHTML = `
        If we lose <strong>${CHANNEL_NAMES[channel]}</strong>, our conversion rate drops by 
        <span style="color:#ef4444; font-weight:bold;">${dropPct}%</span>.
        <br><br>
        In the Markov model, "Attribution Value" is exactly equal to this "Removal Effect".
        Therefore, we award ${CHANNEL_NAMES[channel]} <strong>${dropPct}% of the credit</strong>.
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
        if(prob > 0.001) { // Threshold for relevance
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
                <span style="color:#ef4444;">${pct}% &rarr; 🗑️ Lost</span>
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

    // Increase threshold to hide noise strings (e.g. 0.05 = 5%)
    const THRESHOLD = 0.02; 

    for(let r=0; r<matrix.length; r++) {
        for(let c=0; c<matrix[r].length; c++) {
            const val = matrix[r][c];
            if (val > THRESHOLD) {
                 source.push(r);
                 target.push(c);
                 value.push(val * 100); 
            }
        }
    }

    const data = {
        type: "sankey",
        orientation: "h",
        node: {
          pad: 20,
          thickness: 30,
          line: { color: "white", width: 1 },
          label: labels,
          color: colors,
          hovertemplate: 'State: %{label}<extra></extra>'
        },
        link: {
          source: source,
          target: target,
          value: value,
          color: 'rgba(200,200,200, 0.3)',
          // Improve hover explanation
          hovertemplate: `
            <b>Flow Detail</b><br>
            From: %{source.label}<br>
            To: %{target.label}<br>
            Volume: %{value:.1f}% of starting traffic<extra></extra>
          `
        }
    };

    const layout = {
        margin: { t: 20, b: 20, l:20, r:20 },
        font: { size: 13 }
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
        hoverinfo: 'x+y+z'
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


// --- Data Gen (Simplified port from Shapley) ---
function generateSyntheticData(config, count) {
    const paths = [];
    const maxLen = config.maxPathLength || 3;

    for(let i=0; i<count; i++) {
        // Skew slightly towards shorter paths
        const roll = Math.random();
        let pathLen = 1;
        if (roll > 0.3) pathLen = Math.ceil(Math.random() * maxLen);
        
        const pathChannels = [];
        for(let s=0; s<pathLen; s++) {
            pathChannels.push(pickWeightedChannel(config.baseWeights));
        }
        
        // Simple conversion probability based on synergy/length
        // (Just dummy logic to get some conversions)
        let rate = 5; // Base 5%
        if (pathChannels.includes('search')) rate += 10;
        if (pathChannels.length > 1) rate *= config.synergyFactor;
        
        const converted = (Math.random() * 100) < rate;
        
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
    let r = Math.random() * totalW;
    for (const ch of CHANNELS) {
        r -= weights[ch];
        if (r <= 0) return ch;
    }
    return CHANNELS[CHANNELS.length-1];
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
