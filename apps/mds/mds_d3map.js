// ==================== D3.js Positioning Map ====================
// A draggable, interactive perceptual positioning map using D3.js

const PositioningMap = (function() {
  'use strict';
  
  // Private state
  let svg = null;
  let width = 800;
  let height = 600;
  let margin = { top: 40, right: 40, bottom: 60, left: 70 };
  let xScale = null;
  let yScale = null;
  let currentDimX = 0;
  let currentDimY = 1;
  let currentNumDimensions = 2;  // Full dimensionality of the solution
  
  // Callbacks
  let onBrandDrag = null;
  let onBrandClick = null;
  let onBrandDragEnd = null;
  
  // Cached entry opportunities (for external access)
  let cachedEntryOpportunities = [];
  
  // Helper function to safely get coordinate value (returns 0 if undefined/NaN)
  const safeCoord = (coords, dimIndex) => {
    const val = coords && coords[dimIndex];
    return (val !== undefined && !isNaN(val)) ? val : 0;
  };
  
  // Colors
  const colors = {
    brand: '#2563eb',
    brandHover: '#1d4ed8',
    brandDrag: '#7c3aed',
    attribute: '#64748b',
    voronoi: 'rgba(37, 99, 235, 0.08)',
    voronoiStroke: 'rgba(37, 99, 235, 0.2)',
    opportunity: '#22c55e',
    segment: ['#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e'],
    grid: '#e2e8f0',
    axis: '#94a3b8',
    text: '#1f2937'
  };
  
  // ==================== INITIALIZATION ====================
  function init(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('PositioningMap: Container not found:', containerId);
      return;
    }
    
    // Purge any existing Plotly chart (when switching from 3D to 2D)
    if (typeof Plotly !== 'undefined') {
      try { Plotly.purge(container); } catch (e) { /* ignore */ }
    }
    
    // Clear existing
    container.innerHTML = '';
    
    // Get dimensions
    const rect = container.getBoundingClientRect();
    width = options.width || rect.width || 800;
    height = options.height || Math.min(width * 0.75, 600);
    
    // Create SVG
    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'positioning-map-svg')
      .style('background', '#fafbfc')
      .style('border-radius', '12px');
    
    // Add defs for filters/gradients
    const defs = svg.append('defs');
    
    // Drop shadow filter for brands
    const filter = defs.append('filter')
      .attr('id', 'brand-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 2)
      .attr('stdDeviation', 3)
      .attr('flood-color', 'rgba(0,0,0,0.15)');
    
    // Create layer groups (order matters for z-index)
    svg.append('g').attr('class', 'grid-layer');
    svg.append('g').attr('class', 'voronoi-layer');
    svg.append('g').attr('class', 'opportunity-layer');
    svg.append('g').attr('class', 'customer-layer');  // Individual customers (behind segments)
    svg.append('g').attr('class', 'attribute-layer');
    svg.append('g').attr('class', 'segment-layer');
    svg.append('g').attr('class', 'brand-layer');
    svg.append('g').attr('class', 'axis-layer');
    svg.append('g').attr('class', 'label-layer');
    
    // Set callbacks
    if (options.onBrandDrag) onBrandDrag = options.onBrandDrag;
    if (options.onBrandClick) onBrandClick = options.onBrandClick;
    if (options.onBrandDragEnd) onBrandDragEnd = options.onBrandDragEnd;
    
    return this;
  }
  
  // ==================== RENDER ====================
  function render(data, options = {}) {
    if (!svg || !data) return;
    
    currentDimX = options.dimX !== undefined ? options.dimX : 0;
    currentDimY = options.dimY !== undefined ? options.dimY : 1;
    currentNumDimensions = data.numDimensions || 2;  // Get full dimensionality from data
    
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Helper function to safely get coordinate value (returns 0 if undefined/NaN)
    const safeCoord = (coords, dimIndex) => {
      const val = coords && coords[dimIndex];
      return (val !== undefined && !isNaN(val)) ? val : 0;
    };
    
    // Calculate data bounds from brands, segments, and customers
    const brands = Object.keys(data.brandCoords);
    const xs = brands.map(b => safeCoord(data.brandCoords[b], currentDimX));
    const ys = brands.map(b => safeCoord(data.brandCoords[b], currentDimY));
    
    // Also include segment points if shown
    if (data.segmentIdealPoints) {
      data.segmentIdealPoints.forEach(seg => {
        xs.push(safeCoord(seg.coords, currentDimX));
        ys.push(safeCoord(seg.coords, currentDimY));
      });
    }
    
    // Also include customer points if shown (sample to keep calculation fast)
    if (data.customerPoints && data.customerPoints.length > 0) {
      const sampleSize = Math.min(50, data.customerPoints.length);
      for (let i = 0; i < sampleSize; i++) {
        const idx = Math.floor(i * data.customerPoints.length / sampleSize);
        xs.push(safeCoord(data.customerPoints[idx].coords, currentDimX));
        ys.push(safeCoord(data.customerPoints[idx].coords, currentDimY));
      }
    }
    
    // Pre-calculate entry opportunities so we can include their projected positions in bounds
    let preCalculatedOpportunities = [];
    if (data.segmentIdealPoints && data.segmentIdealPoints.length > 0) {
      const preferenceData = {
        segments: data.segmentIdealPoints,
        totalCustomers: data.totalCustomers || 100,
        shareRule: data.shareRule || 'logit'
      };
      preCalculatedOpportunities = findEntryOpportunities(data.brandCoords, brands, preferenceData, 5);
      
      // Include opportunity projected positions in bounds calculation
      preCalculatedOpportunities.forEach(opp => {
        xs.push(safeCoord(opp.coords, currentDimX));
        ys.push(safeCoord(opp.coords, currentDimY));
      });
    }
    
    // Filter out any NaN values that slipped through
    const validXs = xs.filter(v => !isNaN(v) && v !== undefined);
    const validYs = ys.filter(v => !isNaN(v) && v !== undefined);
    
    // Calculate symmetric bounds around zero (keeps origin at center)
    const xExtent = validXs.length > 0 
      ? Math.max(Math.abs(Math.min(...validXs)), Math.abs(Math.max(...validXs)))
      : 1;
    const yExtent = validYs.length > 0 
      ? Math.max(Math.abs(Math.min(...validYs)), Math.abs(Math.max(...validYs)))
      : 1;
    
    // Add padding
    const xPadding = xExtent * 0.15 || 0.5;
    const yPadding = yExtent * 0.15 || 0.5;
    
    const xBound = xExtent + xPadding;
    const yBound = yExtent + yPadding;
    
    // Create symmetric scales (origin at center)
    xScale = d3.scaleLinear()
      .domain([-xBound, xBound])
      .range([margin.left, width - margin.right]);
    
    yScale = d3.scaleLinear()
      .domain([-yBound, yBound])
      .range([height - margin.bottom, margin.top]);
    
    // Render layers
    renderGrid(plotWidth, plotHeight);
    renderAxes(options.dimLabels || ['Dimension I', 'Dimension II']);
    
    if (options.showVoronoi) {
      renderVoronoi(data.brandCoords, brands);
    } else {
      svg.select('.voronoi-layer').selectAll('*').remove();
    }
    
    if (options.showOpportunities) {
      // Use pre-calculated opportunities
      cachedEntryOpportunities = preCalculatedOpportunities;
      renderOpportunitiesFromCache();
    } else {
      svg.select('.opportunity-layer').selectAll('*').remove();
      // Still cache for explainer panel
      cachedEntryOpportunities = preCalculatedOpportunities;
    }
    
    if (options.showAttributes && data.attrLoadings) {
      renderAttributes(data.attrLoadings, data.attributes, xs, ys);
    } else {
      svg.select('.attribute-layer').selectAll('*').remove();
    }
    
    if (options.showSegments && data.segmentIdealPoints) {
      renderSegments(data.segmentIdealPoints);
    } else {
      svg.select('.segment-layer').selectAll('*').remove();
    }
    
    // Individual customer points (demand cloud)
    if (options.showCustomers && data.customerPoints) {
      renderCustomers(data.customerPoints);
    } else {
      svg.select('.customer-layer').selectAll('*').remove();
    }
    
    if (options.showBrands !== false) {
      renderBrands(data.brandCoords, brands, options.draggable !== false);
    }
  }
  
  // ==================== GRID & AXES ====================
  function renderGrid(plotWidth, plotHeight) {
    const gridLayer = svg.select('.grid-layer');
    gridLayer.selectAll('*').remove();
    
    // Vertical grid lines
    const xTicks = xScale.ticks(10);
    gridLayer.selectAll('.grid-v')
      .data(xTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-v')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', colors.grid)
      .attr('stroke-width', 1);
    
    // Horizontal grid lines
    const yTicks = yScale.ticks(8);
    gridLayer.selectAll('.grid-h')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-h')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', colors.grid)
      .attr('stroke-width', 1);
    
    // Zero lines (stronger)
    if (xScale.domain()[0] < 0 && xScale.domain()[1] > 0) {
      gridLayer.append('line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 2);
    }
    
    if (yScale.domain()[0] < 0 && yScale.domain()[1] > 0) {
      gridLayer.append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 2);
    }
  }
  
  function renderAxes(dimLabels) {
    const axisLayer = svg.select('.axis-layer');
    axisLayer.selectAll('*').remove();
    
    // X axis
    const xAxis = d3.axisBottom(xScale).ticks(10).tickSize(0);
    axisLayer.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', colors.axis)
      .attr('font-size', '11px');
    
    // X axis label
    axisLayer.append('text')
      .attr('x', width / 2)
      .attr('y', height - 15)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-size', '13px')
      .attr('font-weight', '500')
      .text(dimLabels[0]);
    
    // Y axis
    const yAxis = d3.axisLeft(yScale).ticks(8).tickSize(0);
    axisLayer.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .selectAll('text')
      .attr('fill', colors.axis)
      .attr('font-size', '11px');
    
    // Y axis label
    axisLayer.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-size', '13px')
      .attr('font-weight', '500')
      .text(dimLabels[1]);
  }
  
  // ==================== VORONOI TERRITORIES ====================
  function renderVoronoi(coords, brands) {
    const voronoiLayer = svg.select('.voronoi-layer');
    voronoiLayer.selectAll('*').remove();
    
    // Create points array for Delaunay
    const points = brands.map(b => [
      xScale(coords[b][currentDimX]),
      yScale(coords[b][currentDimY])
    ]);
    
    // Create Delaunay triangulation and Voronoi diagram
    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi([
      margin.left, margin.top,
      width - margin.right, height - margin.bottom
    ]);
    
    // Render Voronoi cells
    voronoiLayer.selectAll('.voronoi-cell')
      .data(brands)
      .enter()
      .append('path')
      .attr('class', 'voronoi-cell')
      .attr('d', (d, i) => voronoi.renderCell(i))
      .attr('fill', colors.voronoi)
      .attr('stroke', colors.voronoiStroke)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')
      .style('pointer-events', 'none');
  }
  
  // ==================== OPPORTUNITY ZONES (PREFERENCE-BASED) ====================
  // Store preference data for opportunity calculations
  let currentPreferenceData = null;
  
  // Render opportunities from cache (called after scales are set)
  function renderOpportunitiesFromCache() {
    const oppLayer = svg.select('.opportunity-layer');
    oppLayer.selectAll('*').remove();
    
    const opportunities = cachedEntryOpportunities;
    
    if (opportunities.length === 0) {
      // No preference data - show message
      oppLayer.append('text')
        .attr('x', (width - margin.left - margin.right) / 2 + margin.left)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '12px')
        .text('Enable preference data for entry analysis');
      return;
    }
    
    // Render opportunity markers - PROJECT from N-D to current 2D view
    const oppGroups = oppLayer.selectAll('.opportunity')
      .data(opportunities)
      .enter()
      .append('g')
      .attr('class', 'opportunity')
      .attr('transform', d => `translate(${xScale(d.coords[currentDimX])}, ${yScale(d.coords[currentDimY])})`);
    
    // Diamond marker with size based on share captured
    oppGroups.append('path')
      .attr('d', d => d3.symbol().type(d3.symbolDiamond).size(300 + d.share * 3000)())
      .attr('fill', d => `rgba(34, 197, 94, ${0.2 + d.share * 0.5})`)
      .attr('stroke', colors.opportunity)
      .attr('stroke-width', 2);
    
    // Share percentage label
    oppGroups.append('text')
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#166534')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text(d => `${(d.share * 100).toFixed(1)}%`);
    
    // Rank label
    oppGroups.append('text')
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .attr('fill', '#15803d')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .text((d, i) => `#${i + 1}`);
    
    // Tooltip with full N-D position details
    oppGroups.append('title')
      .text((d, i) => {
        const posStr = currentNumDimensions === 3 
          ? `(${d.coords[0].toFixed(2)}, ${d.coords[1].toFixed(2)}, ${d.coords[2].toFixed(2)})`
          : `(${d.coords[0].toFixed(2)}, ${d.coords[1].toFixed(2)})`;
        return `Entry Opportunity #${i + 1}\nProjected Share: ${(d.share * 100).toFixed(1)}%\nFull ${currentNumDimensions}D Position: ${posStr}\nNearest competitor: ${d.nearestBrand} (${d.nearestDist.toFixed(2)} away)`;
      });
  }
  
  // Legacy function - now just calls findEntryOpportunities and caches
  function renderOpportunities(coords, brands, preferenceData) {
    const oppLayer = svg.select('.opportunity-layer');
    oppLayer.selectAll('*').remove();
    
    // Store for calculations
    currentPreferenceData = preferenceData;
    
    // Find best entry opportunities using preference model (in full N-D space)
    const opportunities = findEntryOpportunities(coords, brands, preferenceData, 5);
    
    // Cache for external access (e.g., explainer panel)
    cachedEntryOpportunities = opportunities;
    
    if (opportunities.length === 0) {
      // No preference data - show message
      oppLayer.append('text')
        .attr('x', (width - margin.left - margin.right) / 2 + margin.left)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '12px')
        .text('Enable preference data for entry analysis');
      return;
    }
    
    // Render opportunity markers - PROJECT from N-D to current 2D view
    const oppGroups = oppLayer.selectAll('.opportunity')
      .data(opportunities)
      .enter()
      .append('g')
      .attr('class', 'opportunity')
      .attr('transform', d => `translate(${xScale(d.coords[currentDimX])}, ${yScale(d.coords[currentDimY])})`);
    
    // Diamond marker with size based on share captured
    oppGroups.append('path')
      .attr('d', d => d3.symbol().type(d3.symbolDiamond).size(300 + d.share * 3000)())
      .attr('fill', d => `rgba(34, 197, 94, ${0.2 + d.share * 0.5})`)
      .attr('stroke', colors.opportunity)
      .attr('stroke-width', 2);
    
    // Share percentage label
    oppGroups.append('text')
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#166534')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text(d => `${(d.share * 100).toFixed(1)}%`);
    
    // Rank label
    oppGroups.append('text')
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .attr('fill', '#15803d')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .text((d, i) => `#${i + 1}`);
    
    // Tooltip with full N-D position details
    oppGroups.append('title')
      .text((d, i) => {
        const posStr = currentNumDimensions === 3 
          ? `(${d.coords[0].toFixed(2)}, ${d.coords[1].toFixed(2)}, ${d.coords[2].toFixed(2)})`
          : `(${d.coords[0].toFixed(2)}, ${d.coords[1].toFixed(2)})`;
        return `Entry Opportunity #${i + 1}\nProjected Share: ${(d.share * 100).toFixed(1)}%\nFull ${currentNumDimensions}D Position: ${posStr}\nNearest competitor: ${d.nearestBrand} (${d.nearestDist.toFixed(2)} away)`;
      });
  }
  
  function findEntryOpportunities(coords, brands, preferenceData, topN) {
    // If no preference data, return empty
    if (!preferenceData || !preferenceData.segments || preferenceData.segments.length === 0) {
      return [];  // Return empty to show the "enable preference data" message
    }
    
    const segments = preferenceData.segments;
    const totalCustomers = preferenceData.totalCustomers || segments.reduce((sum, s) => sum + s.size, 0);
    const shareRule = preferenceData.shareRule || 'logit';
    const numDims = currentNumDimensions;
    
    // Calculate bounds for EACH dimension from brand + segment positions
    const dimBounds = [];
    for (let d = 0; d < numDims; d++) {
      const allVals = [
        ...brands.map(b => coords[b][d]),
        ...segments.map(s => s.coords[d])
      ];
      const minVal = Math.min(...allVals);
      const maxVal = Math.max(...allVals);
      const padding = (maxVal - minVal) * 0.15 || 0.5;
      dimBounds.push({ min: minVal - padding, max: maxVal + padding });
    }
    
    // Grid search in full N-dimensional space
    // For 2D: 25x25 = 625 points
    // For 3D: 15x15x15 = 3375 points (reduced grid for performance)
    const gridSize = numDims === 2 ? 25 : 15;
    const steps = dimBounds.map(b => (b.max - b.min) / gridSize);
    
    const candidates = [];
    
    if (numDims === 2) {
      // 2D grid search
      for (let i = 1; i < gridSize; i++) {
        for (let j = 1; j < gridSize; j++) {
          const entryPoint = [
            dimBounds[0].min + i * steps[0],
            dimBounds[1].min + j * steps[1]
          ];
          const entryResult = simulateEntryND(entryPoint, coords, brands, segments, totalCustomers, shareRule, numDims);
          candidates.push({
            coords: entryPoint,  // Full N-D coordinates
            share: entryResult.entrantShare,
            nearestBrand: entryResult.nearestBrand,
            nearestDist: entryResult.nearestDist,
            segmentShares: entryResult.segmentShares
          });
        }
      }
    } else {
      // 3D grid search
      for (let i = 1; i < gridSize; i++) {
        for (let j = 1; j < gridSize; j++) {
          for (let k = 1; k < gridSize; k++) {
            const entryPoint = [
              dimBounds[0].min + i * steps[0],
              dimBounds[1].min + j * steps[1],
              dimBounds[2].min + k * steps[2]
            ];
            const entryResult = simulateEntryND(entryPoint, coords, brands, segments, totalCustomers, shareRule, numDims);
            candidates.push({
              coords: entryPoint,  // Full N-D coordinates
              share: entryResult.entrantShare,
              nearestBrand: entryResult.nearestBrand,
              nearestDist: entryResult.nearestDist,
              segmentShares: entryResult.segmentShares
            });
          }
        }
      }
    }
    
    // Sort by share captured (highest first)
    candidates.sort((a, b) => b.share - a.share);
    
    // Diversity constraint in full N-D space
    const minSep = Math.max(...steps) * 2.5;
    const opportunities = [];
    
    for (const c of candidates) {
      if (opportunities.length >= topN) break;
      
      let ok = true;
      for (const s of opportunities) {
        // Calculate N-D Euclidean distance
        let distSq = 0;
        for (let d = 0; d < numDims; d++) {
          distSq += (c.coords[d] - s.coords[d]) ** 2;
        }
        if (Math.sqrt(distSq) < minSep) {
          ok = false;
          break;
        }
      }
      if (ok) opportunities.push(c);
    }
    
    return opportunities;
  }
  
  // N-dimensional entry simulation (uses ALL dimensions for distance calculations)
  function simulateEntryND(entryPoint, coords, brands, segments, totalCustomers, shareRule, numDims) {
    // Find nearest existing brand in full N-D space
    let nearestDist = Infinity;
    let nearestBrand = brands[0];
    brands.forEach(brand => {
      let distSq = 0;
      for (let d = 0; d < numDims; d++) {
        distSq += (entryPoint[d] - coords[brand][d]) ** 2;
      }
      const dist = Math.sqrt(distSq);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBrand = brand;
      }
    });
    
    let entrantShare = 0;
    const segmentShares = [];
    
    segments.forEach(seg => {
      const segmentWeight = seg.size / totalCustomers;
      const segCoords = seg.coords;
      
      // N-D distance from entrant to this segment's ideal point
      let entrantDistSq = 0;
      for (let d = 0; d < numDims; d++) {
        entrantDistSq += (entryPoint[d] - segCoords[d]) ** 2;
      }
      const entrantDist = Math.sqrt(entrantDistSq);
      
      // N-D distances from all brands to this segment
      const brandDists = brands.map(b => {
        let distSq = 0;
        for (let d = 0; d < numDims; d++) {
          distSq += (coords[b][d] - segCoords[d]) ** 2;
        }
        return Math.sqrt(distSq);
      });
      
      let segShare = 0;
      
      if (shareRule === 'first-choice') {
        // First choice: entrant wins if closest
        const minBrandDist = Math.min(...brandDists);
        if (entrantDist < minBrandDist) {
          segShare = 1.0;
        }
      } else if (shareRule === 'preference') {
        // Distance-based share
        const allDists = [...brandDists, entrantDist];
        const totalInvDist = allDists.reduce((sum, d) => sum + 1 / (d + 0.001), 0);
        segShare = (1 / (entrantDist + 0.001)) / totalInvDist;
      } else {
        // Logit (default): exp(-beta * distance)
        const beta = 2.0;
        const allUtils = [...brandDists.map(d => Math.exp(-beta * d)), Math.exp(-beta * entrantDist)];
        const totalExp = allUtils.reduce((sum, u) => sum + u, 0);
        segShare = allUtils[allUtils.length - 1] / totalExp;
      }
      
      segmentShares.push({ segment: seg.segment, share: segShare });
      entrantShare += segmentWeight * segShare;
    });
    
    return {
      entrantShare,
      nearestBrand,
      nearestDist,
      segmentShares
    };
  }
  
  // Legacy 2D function (for compatibility, redirects to N-D)
  function simulateEntry(x, y, coords, brands, segments, totalCustomers, shareRule) {
    return simulateEntryND([x, y], coords, brands, segments, totalCustomers, shareRule, 2);
  }

  // ==================== ATTRIBUTES ====================
  function renderAttributes(loadings, attrs, brandXs, brandYs) {
    const attrLayer = svg.select('.attribute-layer');
    attrLayer.selectAll('*').remove();
    
    // Scale factor - make vectors reach edge of brand cloud
    const maxBrandDist = Math.max(
      Math.max(...brandXs.map(Math.abs)),
      Math.max(...brandYs.map(Math.abs))
    );
    const maxLoading = Math.max(...loadings.flat().map(Math.abs));
    const scale = (maxBrandDist / maxLoading) * 0.9;
    
    attrs.forEach((attr, i) => {
      const x = loadings[i][currentDimX] * scale;
      const y = loadings[i][currentDimY] * scale;
      
      // Vector line
      attrLayer.append('line')
        .attr('x1', xScale(0))
        .attr('y1', yScale(0))
        .attr('x2', xScale(x))
        .attr('y2', yScale(y))
        .attr('stroke', colors.attribute)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,2');
      
      // Arrowhead
      const angle = Math.atan2(yScale(y) - yScale(0), xScale(x) - xScale(0));
      const arrowSize = 8;
      attrLayer.append('polygon')
        .attr('points', `0,-${arrowSize/2} ${arrowSize},0 0,${arrowSize/2}`)
        .attr('fill', colors.attribute)
        .attr('transform', `translate(${xScale(x)}, ${yScale(y)}) rotate(${angle * 180 / Math.PI})`);
      
      // Label
      const labelX = xScale(x * 1.08);
      const labelY = yScale(y * 1.08);
      attrLayer.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', x >= 0 ? 'start' : 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#475569')
        .attr('font-size', '11px')
        .text(attr);
    });
  }
  
  // ==================== SEGMENTS ====================
  function renderSegments(segments) {
    const segLayer = svg.select('.segment-layer');
    segLayer.selectAll('*').remove();
    
    segments.forEach((seg, i) => {
      const x = xScale(seg.coords[currentDimX]);
      const y = yScale(seg.coords[currentDimY]);
      const color = colors.segment[i % colors.segment.length];
      
      // Use label if available (pre-defined segments), otherwise generic
      const segmentLabel = seg.label || `Seg ${seg.segment}`;
      
      // Star marker
      const star = segLayer.append('g')
        .attr('transform', `translate(${x}, ${y})`);
      
      star.append('path')
        .attr('d', d3.symbol().type(d3.symbolStar).size(300))
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
      
      // Label
      star.append('text')
        .attr('y', 22)
        .attr('text-anchor', 'middle')
        .attr('fill', color)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(segmentLabel);
    });
  }
  
  // ==================== INDIVIDUAL CUSTOMERS (Demand Cloud) ====================
  function renderCustomers(customerPoints) {
    const custLayer = svg.select('.customer-layer');
    custLayer.selectAll('*').remove();
    
    if (!customerPoints || customerPoints.length === 0) return;
    
    // Render each customer as a small translucent dot
    // Color-coded by segment if available
    const dots = custLayer.selectAll('.customer-dot')
      .data(customerPoints)
      .enter()
      .append('circle')
      .attr('class', 'customer-dot')
      .attr('cx', d => xScale(d.coords[currentDimX]))
      .attr('cy', d => yScale(d.coords[currentDimY]))
      .attr('r', 4)
      .attr('fill', d => {
        if (d.segment) {
          return colors.segment[(d.segment - 1) % colors.segment.length];
        }
        return '#94a3b8';
      })
      .attr('fill-opacity', 0.35)
      .attr('stroke', d => {
        if (d.segment) {
          return colors.segment[(d.segment - 1) % colors.segment.length];
        }
        return '#64748b';
      })
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.5);
    
    // Hover effect
    dots.on('mouseover', function(event, d) {
        d3.select(this)
          .attr('r', 6)
          .attr('fill-opacity', 0.7)
          .attr('stroke-width', 1.5);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('r', 4)
          .attr('fill-opacity', 0.35)
          .attr('stroke-width', 0.5);
      });
    
    // Tooltip
    dots.append('title')
      .text(d => `Customer #${d.id}${d.segment ? ` (Segment ${d.segment})` : ''}\nIdeal Position: (${d.coords[currentDimX].toFixed(2)}, ${d.coords[currentDimY].toFixed(2)})`);
    
    // Add legend/count
    const count = customerPoints.length;
    custLayer.append('text')
      .attr('x', margin.left + 10)
      .attr('y', height - margin.bottom - 10)
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .text(`👥 ${count} customer ideal points`);
  }

  // ==================== BRANDS (DRAGGABLE) ====================
  function renderBrands(coords, brands, draggable) {
    const brandLayer = svg.select('.brand-layer');
    const labelLayer = svg.select('.label-layer');
    brandLayer.selectAll('*').remove();
    labelLayer.selectAll('*').remove();
    
    // Create shadow layer for original positions (will be populated during drag)
    if (!svg.select('.shadow-layer').node()) {
      svg.insert('g', '.brand-layer')
        .attr('class', 'shadow-layer');
    }
    
    // Create brand groups
    const brandGroups = brandLayer.selectAll('.brand')
      .data(brands)
      .enter()
      .append('g')
      .attr('class', 'brand')
      .attr('transform', d => `translate(${xScale(coords[d][currentDimX])}, ${yScale(coords[d][currentDimY])})`)
      .style('cursor', draggable ? 'grab' : 'pointer');
    
    // Brand circle
    brandGroups.append('circle')
      .attr('r', 12)
      .attr('fill', colors.brand)
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .attr('filter', 'url(#brand-shadow)');
    
    // Brand labels (in separate layer for z-index)
    brands.forEach(brand => {
      labelLayer.append('text')
        .attr('class', 'brand-label')
        .attr('data-brand', brand)
        .attr('x', xScale(coords[brand][currentDimX]))
        .attr('y', yScale(coords[brand][currentDimY]) - 18)
        .attr('text-anchor', 'middle')
        .attr('fill', colors.text)
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .text(brand);
    });
    
    // Hover effects
    brandGroups
      .on('mouseenter', function(event, d) {
        d3.select(this).select('circle')
          .transition().duration(150)
          .attr('r', 15)
          .attr('fill', colors.brandHover);
      })
      .on('mouseleave', function(event, d) {
        if (!d3.select(this).classed('dragging')) {
          d3.select(this).select('circle')
            .transition().duration(150)
            .attr('r', 12)
            .attr('fill', colors.brand);
        }
      })
      .on('click', function(event, d) {
        // Don't trigger click if we just finished dragging
        if (d3.select(this).classed('just-dragged')) {
          d3.select(this).classed('just-dragged', false);
          return;
        }
        event.stopPropagation();
        if (onBrandClick) onBrandClick(d, coords[d]);
      });
    
    // Drag behavior
    if (draggable) {
      const drag = d3.drag()
        .on('start', function(event, d) {
          const startX = xScale(coords[d][currentDimX]);
          const startY = yScale(coords[d][currentDimY]);
          
          // Mark that we're dragging (to suppress click after drag)
          d3.select(this).classed('is-dragging', true);
          
          // Store original position
          d3.select(this).datum().originalPos = { x: startX, y: startY };
          
          // Clear any existing shadows for this brand
          const shadowLayer = svg.select('.shadow-layer');
          shadowLayer.select(`.brand-shadow-${d.replace(/[^a-zA-Z0-9]/g, '-')}`).remove();
          shadowLayer.select(`.movement-line-${d.replace(/[^a-zA-Z0-9]/g, '-')}`).remove();
          
          // Create shadow at original position
          const safeClassName = d.replace(/[^a-zA-Z0-9]/g, '-');
          shadowLayer.append('circle')
            .attr('class', `brand-shadow brand-shadow-${safeClassName}`)
            .attr('cx', startX)
            .attr('cy', startY)
            .attr('r', 12)
            .attr('fill', '#94a3b8')
            .attr('opacity', 0.4)
            .attr('stroke', '#64748b')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');
          
          // Create movement line
          shadowLayer.append('line')
            .attr('class', `movement-line movement-line-${safeClassName}`)
            .attr('x1', startX)
            .attr('y1', startY)
            .attr('x2', startX)
            .attr('y2', startY)
            .attr('stroke', '#64748b')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '6,4')
            .attr('opacity', 0.6);
          
          d3.select(this)
            .classed('dragging', true)
            .raise()
            .select('circle')
            .attr('fill', colors.brandDrag)
            .attr('r', 16);
          
          document.body.style.cursor = 'grabbing';
        })
        .on('drag', function(event, d) {
          // Update visual position
          d3.select(this)
            .attr('transform', `translate(${event.x}, ${event.y})`);
          
          // Update label position
          labelLayer.select(`text[data-brand="${d}"]`)
            .attr('x', event.x)
            .attr('y', event.y - 18);
          
          // Update movement line endpoint
          const safeClassName = d.replace(/[^a-zA-Z0-9]/g, '-');
          svg.select('.shadow-layer').select(`.movement-line-${safeClassName}`)
            .attr('x2', event.x)
            .attr('y2', event.y);
          
          // Convert to data coordinates
          const newX = xScale.invert(event.x);
          const newY = yScale.invert(event.y);
          
          if (onBrandDrag) {
            onBrandDrag(d, [newX, newY], currentDimX, currentDimY);
          }
        })
        .on('end', function(event, d) {
          // Keep shadow and movement line visible after drag
          // They show where the brand started
          
          const thisNode = d3.select(this);
          thisNode
            .classed('dragging', false)
            .classed('is-dragging', false)
            .classed('just-dragged', true)  // Suppress click event
            .select('circle')
            .transition().duration(200)
            .attr('fill', colors.brand)
            .attr('r', 12);
          
          // Remove just-dragged class after a delay so clicks work again later
          setTimeout(() => {
            thisNode.classed('just-dragged', false);
          }, 300);
          
          document.body.style.cursor = '';
          
          // Final coordinates
          const newX = xScale.invert(event.x);
          const newY = yScale.invert(event.y);
          
          if (onBrandDragEnd) {
            onBrandDragEnd(d, [newX, newY], currentDimX, currentDimY);
          }
        });
      
      brandGroups.call(drag);
    }
  }
  
  // ==================== UPDATE SINGLE BRAND ====================
  function updateBrandPosition(brand, newCoords) {
    const brandGroup = svg.select('.brand-layer')
      .selectAll('.brand')
      .filter((d) => d === brand);
    
    brandGroup
      .transition().duration(50)
      .attr('transform', `translate(${xScale(newCoords[currentDimX])}, ${yScale(newCoords[currentDimY])})`);
    
    svg.select('.label-layer')
      .select(`text[data-brand="${brand}"]`)
      .transition().duration(50)
      .attr('x', xScale(newCoords[currentDimX]))
      .attr('y', yScale(newCoords[currentDimY]) - 18);
  }
  
  // ==================== SET INTERACTION MODE ====================
  let currentMode = 'reposition';  // 'reposition', 'new-product', 'find-gap'
  
  function setMode(mode) {
    currentMode = mode;
    
    if (!svg) return;
    
    // Update visual feedback based on mode
    const brandGroups = svg.select('.brand-layer').selectAll('.brand');
    
    if (mode === 'reposition') {
      // Enable dragging on brands
      brandGroups.style('cursor', 'grab');
      svg.select('.opportunity-layer').style('opacity', 0.3);
    } else if (mode === 'new-product') {
      // Clicking places a new product
      brandGroups.style('cursor', 'default');
      svg.select('.opportunity-layer').style('opacity', 0.5);
    } else if (mode === 'find-gap') {
      // Highlight entry opportunities
      brandGroups.style('cursor', 'default');
      svg.select('.opportunity-layer').style('opacity', 1);
    }
  }
  
  function getMode() {
    return currentMode;
  }
  
  // ==================== PUBLIC API ====================
  return {
    init,
    render,
    updateBrandPosition,
    setMode,
    getMode,
    getScales: () => ({ x: xScale, y: yScale }),
    getDimensions: () => ({ dimX: currentDimX, dimY: currentDimY }),
    getEntryOpportunities: () => cachedEntryOpportunities
  };
})();
