(function (global) {
  const DEFAULT_PALETTE = [
    '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6',
    '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'
  ];

  function getNode(ref, fallbackId) {
    if (ref) return ref;
    if (fallbackId) return document.getElementById(fallbackId);
    return null;
  }

  function renderStacked100Chart(config) {
    if (!config) return;
    const container = getNode(config.container, config.containerId);
    if (!container) return;

    const legend = getNode(config.legend, config.legendId);
    const tooltip = getNode(config.tooltip, config.tooltipId);
    const caption = getNode(config.caption, config.captionId);

    container.innerHTML = '';
    if (legend) legend.innerHTML = '';
    if (tooltip) tooltip.style.display = 'none';

    const rawBars = Array.isArray(config.bars) ? config.bars : [];
    const stackLabels = Array.isArray(config.stackLabels) ? config.stackLabels : [];
    if (!rawBars.length || !stackLabels.length) return;

    const flip = !!config.flipStacks;
    const processedStackLabels = flip ? stackLabels.slice().reverse() : stackLabels.slice();
    const processedBars = rawBars.map(bar => {
      const segments = Array.isArray(bar.segments) ? bar.segments.slice() : [];
      return {
        label: bar.label || '',
        segments: flip ? segments.reverse() : segments
      };
    });

    const palette = (config.palette && config.palette.length ? config.palette : DEFAULT_PALETTE).slice();
    const colors = processedStackLabels.map((_, idx) => palette[idx % palette.length]);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 360;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerW = Math.max(120, width - margin.left - margin.right);
    const innerH = Math.max(140, height - margin.top - margin.bottom);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    const ticks = [0, 0.25, 0.5, 0.75, 1];
    ticks.forEach(tick => {
      const y = innerH * (1 - tick);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('x2', innerW);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#e5e7eb');
      g.appendChild(line);

      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', -10);
      lbl.setAttribute('y', y + 4);
      lbl.setAttribute('text-anchor', 'end');
      lbl.setAttribute('fill', '#6b7280');
      lbl.setAttribute('font-size', '12');
      lbl.textContent = Math.round(tick * 100) + '%';
      g.appendChild(lbl);
    });

    const barWidth = Math.max(12, innerW / (processedBars.length * 1.3));
    const gap = barWidth * 0.3;

    function showTooltip(evt, barName, stackName, count, pctText) {
      if (!tooltip) return;
      tooltip.style.display = 'block';
      tooltip.innerHTML = `<strong>${escapeHtml(barName)}</strong><br>${escapeHtml(stackName)}<br>Count: ${count.toLocaleString()}<br>Proportion: ${pctText}`;
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${evt.clientX - rect.left + 10}px`;
      tooltip.style.top = `${evt.clientY - rect.top + 10}px`;
    }

    function hideTooltip() {
      if (tooltip) tooltip.style.display = 'none';
    }

    processedBars.forEach((bar, barIdx) => {
      const total = bar.segments.reduce((sum, value) => sum + value, 0);
      let yOffset = innerH;
      bar.segments.forEach((value, segIdx) => {
        const proportion = total > 0 ? value / total : 0;
        const h = proportion * innerH;
        const x = barIdx * (barWidth + gap);
        const y = yOffset - h;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', barWidth);
        rect.setAttribute('height', h);
        rect.setAttribute('fill', colors[segIdx]);
        rect.addEventListener('mousemove', evt => {
          const pctText = total > 0 ? (proportion * 100).toFixed(1) + '%' : '-';
          showTooltip(evt, bar.label, processedStackLabels[segIdx], value, pctText);
        });
        rect.addEventListener('mouseleave', hideTooltip);
        g.appendChild(rect);

        if (h >= 18) {
          const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          lbl.setAttribute('x', x + barWidth / 2);
          lbl.setAttribute('y', y + h / 2 + 4);
          lbl.setAttribute('text-anchor', 'middle');
          lbl.setAttribute('fill', '#111827');
          lbl.setAttribute('font-size', '12');
          lbl.textContent = total > 0 ? (proportion * 100).toFixed(1) + '%' : '-';
          g.appendChild(lbl);
        }

        yOffset -= h;
      });

      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tick.setAttribute('x', barIdx * (barWidth + gap) + barWidth / 2);
      tick.setAttribute('y', innerH + 16);
      tick.setAttribute('text-anchor', 'middle');
      tick.setAttribute('fill', '#334155');
      tick.setAttribute('font-size', '12');
      tick.textContent = bar.label;
      g.appendChild(tick);
    });

    container.appendChild(svg);

    if (legend) {
      processedStackLabels.forEach((label, idx) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        const swatch = document.createElement('span');
        swatch.className = 'legend-swatch';
        swatch.style.background = colors[idx];
        const txt = document.createElement('span');
        txt.textContent = label;
        item.appendChild(swatch);
        item.appendChild(txt);
        legend.appendChild(item);
      });
    }

    if (caption) {
      const barAxis = (config.axisLabels && config.axisLabels.bars) || 'Bars';
      const stackAxis = (config.axisLabels && config.axisLabels.stacks) || 'Stacks';
      caption.textContent = `${barAxis} vs ${stackAxis} (100% stacked)`;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  global.StackedChartUtils = global.StackedChartUtils || {};
  global.StackedChartUtils.renderStacked100Chart = renderStacked100Chart;
})(window);
