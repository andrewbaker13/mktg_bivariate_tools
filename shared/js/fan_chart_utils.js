(function (global) {
  const DEFAULT_COLORS = {
    0.5: 'rgba(111, 140, 255, 0.45)',
    0.8: 'rgba(147, 177, 255, 0.35)'
  };
  const DEFAULT_TOP_COLOR = 'rgba(216, 226, 255, 0.25)';
  const DEFAULT_HEIGHTS = {
    0.5: 0.16,
    0.8: 0.22
  };

  function ensureRange(minValue, maxValue, minWidth = 0.5) {
    if (!isFinite(minValue) || !isFinite(maxValue)) {
      return [-1, 1];
    }
    if (minValue === maxValue) {
      minValue -= minWidth / 2;
      maxValue += minWidth / 2;
    }
    let width = maxValue - minValue;
    if (width < minWidth) {
      const pad = (minWidth - width) / 2;
      minValue -= pad;
      maxValue += pad;
      width = minWidth;
    }
    const padding = width * 0.1;
    return [minValue - padding, maxValue + padding];
  }

  function computeRange(groups, intervals, confidenceLevels, fallbackWidth = 0.5) {
    let minValue = Infinity;
    let maxValue = -Infinity;
    const levels = confidenceLevels && confidenceLevels.length
      ? confidenceLevels
      : [0.5];
    levels.forEach(level => {
      groups.forEach(group => {
        const band = intervals[group.id]?.[level];
        if (band) {
          minValue = Math.min(minValue, band.lower);
          maxValue = Math.max(maxValue, band.upper);
        }
      });
    });
    if (!isFinite(minValue) || !isFinite(maxValue)) {
      const values = groups.map(group => group.value);
      minValue = Math.min(...values);
      maxValue = Math.max(...values);
    }
    return ensureRange(minValue, maxValue, fallbackWidth);
  }

  function renderHorizontalFanChart(config = {}) {
    const {
      containerId,
      groups = [],
      intervals = {},
      confidenceLevels = [],
      axisRange,
      title = '',
      xTitle = '',
      tickLabels,
      referenceLine,
      additionalShapes = [],
      additionalAnnotations = [],
      valueFormatter = (value) => value.toFixed(2),
      pointLabelOffset = 0.5,
      ariaLabel
    } = config;

    if (!global.Plotly) return;
    const container = document.getElementById(containerId);
    if (!container || !groups.length) return;

    const sortedLevels = [...new Set(confidenceLevels)].sort((a, b) => a - b);
    const topLevel = sortedLevels[sortedLevels.length - 1] ?? 0.95;
    const rangeToUse = axisRange || computeRange(groups, intervals, sortedLevels);

    const yPositions = new Map();
    groups.forEach((group, index) => {
      yPositions.set(group.id, groups.length - index);
    });

    const shapes = [];
    const annotations = [];

    groups.forEach(group => {
      const y = yPositions.get(group.id);
      const displayValue = isFinite(group.value) ? group.value : 0;
      annotations.push({
        x: displayValue,
        y: y - pointLabelOffset,
        xref: 'x',
        yref: 'y',
        text: valueFormatter(displayValue),
        showarrow: false,
        font: { size: 12, color: '#2c3e50' }
      });

      sortedLevels.slice().reverse().forEach(level => {
        const band = intervals[group.id]?.[level];
        if (!band) return;
        const height = DEFAULT_HEIGHTS[level] || (level === topLevel ? 0.28 : 0.22);
        shapes.push({
          type: 'rect',
          xref: 'x',
          yref: 'y',
          layer: 'below',
          x0: band.lower,
          x1: band.upper,
          y0: y - height,
          y1: y + height,
          fillcolor: DEFAULT_COLORS[level] || DEFAULT_TOP_COLOR,
          line: { width: 0 }
        });
        if (Math.abs(level - topLevel) < 1e-6) {
          const labelY = y;
          annotations.push({
            x: band.lower,
            y: labelY,
            xref: 'x',
            yref: 'y',
            text: valueFormatter(band.lower),
            showarrow: false,
            font: { size: 11, color: '#37474f' },
            align: 'right',
            xanchor: 'right'
          }, {
            x: band.upper,
            y: labelY,
            xref: 'x',
            yref: 'y',
            text: valueFormatter(band.upper),
            showarrow: false,
            font: { size: 11, color: '#37474f' },
            align: 'left',
            xanchor: 'left'
          });
        }
      });
    });

    if (referenceLine && isFinite(referenceLine.value)) {
      shapes.push({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: referenceLine.value,
        x1: referenceLine.value,
        y0: 0,
        y1: 1,
        line: referenceLine.style || { color: '#c0392b', dash: 'dot', width: 2 }
      });
      if (referenceLine.label) {
        annotations.push({
          x: referenceLine.value,
          y: groups.length + 0.4,
          xref: 'x',
          yref: 'y',
          text: `${referenceLine.label}: ${valueFormatter(referenceLine.value)}`,
          showarrow: false,
          font: { size: 12, color: referenceLine.style?.color || '#c0392b' },
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: referenceLine.style?.color || '#c0392b',
          borderwidth: 1,
          borderpad: 4
        });
      }
    }

    const trace = {
      x: groups.map(group => group.value),
      y: groups.map(group => yPositions.get(group.id)),
      mode: 'markers',
      type: 'scatter',
      marker: {
        color: '#c8102e',
        size: 20,
        symbol: 'circle',
        line: { color: '#c8102e', width: 2 }
      },
      hoverinfo: 'text',
      text: groups.map(group => `${group.label || group.name || ''}: ${valueFormatter(group.value)}`)
    };

    const layout = {
      title,
      margin: { l: 130, r: 40, t: 60, b: 60 },
      shapes: shapes.concat(additionalShapes || []),
      annotations: annotations.concat(additionalAnnotations || []),
      xaxis: {
        title: xTitle,
        range: rangeToUse,
        zeroline: true,
        zerolinecolor: '#b0bec5',
        gridcolor: '#eceff1'
      },
      yaxis: {
        tickvals: groups.map(group => yPositions.get(group.id)),
        ticktext: tickLabels || groups.map(group => group.tickLabel || group.label || group.name || ''),
        showgrid: false,
        fixedrange: true
      },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      showlegend: false,
      height: Math.max(320, groups.length * 120)
    };

    Plotly.react(containerId, [trace], layout, {
      displayModeBar: false,
      responsive: true,
      ordering: 'traces first'
    });

    if (ariaLabel) {
      container.setAttribute('aria-label', ariaLabel);
    }
  }

  global.FanChartUtils = {
    renderHorizontalFanChart
  };
})(window);
