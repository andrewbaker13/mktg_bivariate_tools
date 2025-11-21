    // timestamps
    (function(){
      const CREATED_DATE = '2025-11-01';
      const ts = new Date();
      const pad = n => String(n).padStart(2,'0');
      const s = `${ts.getFullYear()}-${pad(ts.getMonth()+1)}-${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}:${pad(ts.getSeconds())}`;
      const createdEl = document.getElementById('ab-created-date');
      if(createdEl) createdEl.textContent = CREATED_DATE;
      const updatedEl = document.getElementById('ab-last-updated');
      if(updatedEl) updatedEl.textContent = s;
    })();

    // helpers
    const q = (id)=>document.getElementById(id);

    function clampValue(value, min, max){
      if(!isFinite(value)) return value;
      if(value < min) return min;
      if(value > max) return max;
      return value;
    }

    const DataEntryModes = {
      MANUAL: 'manual',
      SUMMARY: 'summary-upload',
      RAW: 'raw-upload'
    };
    let activeDataEntryMode = DataEntryModes.MANUAL;
    let currentScenarioDataset = null;

    const CI_METHODS = {
      WALD: 'wald',
      WILSON: 'wilson'
    };
    let currentCIMethod = CI_METHODS.WALD;

    const SUMMARY_TEMPLATE_CSV = [
      'group,conversions,sample_size',
      'Control,152,1200',
      'Variant,181,1185'
    ].join('\r\n');

    const RAW_TEMPLATE_CSV = [
      'Group,Outcome',
      'Team A,1',
      'Team A,1',
      'Team A,0',
      'Team B,1',
      'Team B,0'
    ].join('\r\n');

    const normalizeHeader = label => (label || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const flexibleDelimiter = line => line.includes('|') ? '|' : detectDelimiter(line);

    function setUploadStatus(id, message, status = ''){
      const el = q(id);
      if(!el) return;
      el.textContent = message || '';
      el.classList.remove('success','error');
      if(status){
        el.classList.add(status);
      }
    }

    function setDataEntryMode(mode){
      if(!Object.values(DataEntryModes).includes(mode)){
        mode = DataEntryModes.MANUAL;
      }
      activeDataEntryMode = mode;
      document.querySelectorAll('.data-entry-card .mode-button').forEach(button => {
        const isActive = button.dataset.mode === mode;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      document.querySelectorAll('.data-entry-card .mode-panel').forEach(panel => {
        const isActive = panel.dataset.mode === mode;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
    }

    function setupDataEntryMode(){
      document.querySelectorAll('.data-entry-card .mode-button').forEach(button => {
        button.addEventListener('click', event => {
          event.preventDefault();
          setDataEntryMode(button.dataset.mode);
        });
      });
      setDataEntryMode(activeDataEntryMode);
    }

    function handleUploadFile(file, handler, statusId) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          handler(reader.result);
        } catch (error) {
          console.error('Upload parse error:', error);
          setUploadStatus(statusId, error.message || 'Unable to parse file.', 'error');
        }
      };
      reader.onerror = () => setUploadStatus(statusId, 'Unable to read the file.', 'error');
      reader.readAsText(file);
    }

    function installDropzone({ dropzoneId, inputId, browseId, templateId, templateContent, onParse, statusId, downloadName }){
      const dropzone = q(dropzoneId);
      const input = q(inputId);
      const browse = q(browseId);
      const templateBtn = q(templateId);
      if(templateBtn && templateContent){
        templateBtn.addEventListener('click', event => {
          event.preventDefault();
          downloadTextFile(downloadName, templateContent);
        });
      }
      if(!dropzone || !input) return;
      if (!window.UIUtils || typeof window.UIUtils.initDropzone !== 'function') {
        if (statusId) {
          setUploadStatus(statusId, 'Upload helper not available. Please refresh the page.', 'error');
        }
        return;
      }
      window.UIUtils.initDropzone({
        dropzoneId,
        inputId,
        browseId,
        onFile: file => handleUploadFile(file, onParse, statusId),
        onError: message => {
          if (statusId && message) {
            setUploadStatus(statusId, message, 'error');
          }
        }
      });
    }

    function findHeaderIndex(normalizedHeaders, candidates){
      return normalizedHeaders.findIndex(header => candidates.some(candidate => header.includes(candidate)));
    }

    function parseSummaryUpload(text){
      const trimmed = (text || '').trim();
      if(!trimmed) throw new Error('Summary file is empty.');
      const lines = trimmed.split(/\r\n|\n|\r/).filter(line => line.trim().length);
      if(lines.length < 2) throw new Error('Summary file needs a header row plus at least one data row.');
      const delimiter = flexibleDelimiter(lines[0]);
      const headers = lines[0].split(delimiter).map(h => h.trim());
      const normalized = headers.map(normalizeHeader);
      const nameIdx = findHeaderIndex(normalized, ['group','variant','arm','label','name']);
      const convIdx = findHeaderIndex(normalized, ['conversion','conversions','success','successes','wins']);
      const sampleIdx = findHeaderIndex(normalized, ['sample','samples','n','size','visitors','traffic','total']);
      if([nameIdx, convIdx, sampleIdx].some(idx => idx === -1)){
        throw new Error('Summary uploads require columns for group, conversions, and sample size.');
      }
      const rows = [];
      lines.slice(1).forEach(line => {
        const parts = line.split(delimiter).map(part => part.trim());
        if(parts.length !== headers.length) return;
        const label = parts[nameIdx];
        const conversions = parseFloat(parts[convIdx]);
        const sample = parseFloat(parts[sampleIdx]);
        if(!label || !isFinite(conversions) || !isFinite(sample) || sample <= 0) return;
        rows.push({
          name: label,
          conversions: Math.max(0, Math.round(conversions)),
          sample: Math.max(1, Math.round(sample))
        });
      });
      if(rows.length < 2) throw new Error('Provide at least two rows with numeric conversions and sample size.');
      return rows.slice(0, 2);
    }

    function parseRawUpload(text){
      const trimmed = (text || '').trim();
      if(!trimmed) throw new Error('Raw file is empty.');
      const lines = trimmed.split(/\r\n|\n|\r/).filter(line => line.trim().length);
      if(lines.length < 2) throw new Error('Raw file requires a header row plus data.');
      const delimiter = flexibleDelimiter(lines[0]);
      const headers = lines[0].split(delimiter).map(h => h.trim());
      const normalized = headers.map(normalizeHeader);
      const nameIdx = findHeaderIndex(normalized, ['group','variant','arm','label','name']);
      const valueIdx = findHeaderIndex(normalized, ['conversion','converted','response','result','value','outcome']);
      if(nameIdx === -1 || valueIdx === -1){
        throw new Error('Raw uploads require group and conversion columns.');
      }
      const stats = new Map();
      lines.slice(1).forEach(line => {
        const parts = line.split(delimiter);
        if(parts.length !== headers.length) return;
        const label = (parts[nameIdx] || '').trim();
        const value = parseFloat(parts[valueIdx]);
        if(!label || !isFinite(value)) return;
        if(!stats.has(label)){
          stats.set(label, { name: label, conversions: 0, sample: 0 });
        }
        const entry = stats.get(label);
        entry.sample += 1;
        entry.conversions += value >= 1 ? 1 : (value <= 0 ? 0 : value);
      });
      const groups = Array.from(stats.values());
      if(groups.length < 2) throw new Error('Provide raw rows for at least two groups.');
      groups.forEach(group => {
        group.conversions = Math.round(group.conversions);
      });
      return groups.slice(0, 2);
    }

    function applyParsedGroups(groups){
      const [first, second] = groups;
      const normalizeGroup = group => {
        const sample = Math.max(1, group.sample);
        const wins = Math.max(0, Math.min(sample, group.conversions));
        return {
          name: group.name,
          proportion: wins / sample,
          n: sample
        };
      };
      const control = normalizeGroup(first);
      const variant = normalizeGroup(second);
      if(q('g1name')){
        q('g1name').value = control.name;
        q('g1name').dispatchEvent(new Event('input', { bubbles: true }));
      }
      if(q('g2name')){
        q('g2name').value = variant.name;
        q('g2name').dispatchEvent(new Event('input', { bubbles: true }));
      }
      assignScenarioValues(control.proportion, ['p1','p1num']);
      assignScenarioValues(control.n, ['n1','n1num']);
      assignScenarioValues(variant.proportion, ['p2','p2num']);
      assignScenarioValues(variant.n, ['n2','n2num']);
      render();
    }

    function handleSummaryText(text){
      const groups = parseSummaryUpload(text);
      applyParsedGroups(groups);
      const msg = `Loaded ${groups.length} group summary row(s).`;
      setUploadStatus('summary-upload-status', msg, 'success');
    }

    function handleRawText(text){
      const groups = parseRawUpload(text);
      applyParsedGroups(groups);
      const msg = `Loaded raw outcomes for ${groups.length} group(s).`;
      setUploadStatus('raw-upload-status', msg, 'success');
    }

    function setupUploadPanels(){
      installDropzone({
        dropzoneId: 'summary-dropzone',
        inputId: 'summary-upload-input',
        browseId: 'summary-upload-browse',
        templateId: 'summary-template-download',
        templateContent: SUMMARY_TEMPLATE_CSV,
        downloadName: 'ab_summary_template.csv',
        onParse: handleSummaryText,
        statusId: 'summary-upload-status'
      });
      installDropzone({
        dropzoneId: 'raw-dropzone',
        inputId: 'raw-upload-input',
        browseId: 'raw-upload-browse',
        templateId: 'raw-template-download',
        templateContent: RAW_TEMPLATE_CSV,
        downloadName: 'ab_raw_template.csv',
        onParse: handleRawText,
        statusId: 'raw-upload-status'
      });
    }

    function pct(x,d=1){ return (x*100).toFixed(d)+"%"; }
    function ppLabel(x,d=1){ return (x>=0?"+":"")+(x*100).toFixed(d)+" pct.pts"; }
    function fmt(x,n=3){ return Number(x).toFixed(n); }

    function erf(x){
      const sign=Math.sign(x)||1;
      const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
      const t=1/(1+p*Math.abs(x));
      const y=1-(((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t)*Math.exp(-x*x);
      return sign*y;
    }
    function normCdf(x){ return 0.5*(1+erf(x/Math.SQRT2)); }
    function invNorm(p){
      const a1=-39.6968302866538,a2=220.946098424521,a3=-275.928510446969,a4=138.357751867269,a5=-30.6647980661472,a6=2.50662827745924;
      const b1=-54.4760987982241,b2=161.585836858041,b3=-155.698979859887,b4=66.8013118877197,b5=-13.2806815528857;
      const c1=-0.00778489400243029,c2=-0.322396458041136,c3=-2.40075827716184,c4=-2.54973253934373,c5=4.37466414146497,c6=2.93816398269878;
      const d1=0.00778469570904146,d2=0.32246712907004,d3=2.445134137143,d4=3.75440866190742;
      if(p<=0||p>=1) return NaN; let qv,rv;
      if(p<0.02425){ qv=Math.sqrt(-2*Math.log(p)); return -(((((c1*qv+c2)*qv+c3)*qv+c4)*qv+c5)*qv+c6)/((((d1*qv+d2)*qv+d3)*qv+d4)*qv+1); }
      if(p>1-0.02425){ qv=Math.sqrt(-2*Math.log(1-p)); return (((((c1*qv+c2)*qv+c3)*qv+c4)*qv+c5)*qv+c6)/((((d1*qv+d2)*qv+d3)*qv+d4)*qv+1); }
      qv=p-0.5; rv=qv*qv;
      return (((((a1*rv+a2)*rv+a3)*rv+a4)*rv+a5)*rv+a6)*qv/(((((b1*rv+b2)*rv+b3)*rv+b4)*rv+b5)*rv+1);
    }

    // CIs
    function ciProp(p,n,z, method = currentCIMethod){
      if(!isFinite(n) || n <= 0 || !isFinite(z)) return { lo: NaN, hi: NaN, se: NaN };
      const se = Math.sqrt(Math.max(0, p*(1-p)/n));
      if(method === CI_METHODS.WILSON){
        const z2 = z * z;
        const denom = 1 + (z2 / n);
        const center = (p + z2 / (2 * n)) / denom;
        const margin = (z * Math.sqrt(((p*(1-p)) + (z2 / (4*n))) / n)) / denom;
        return { lo: center - margin, hi: center + margin, se };
      }
      return { lo:p - z*se, hi:p + z*se, se };
    }
    function ciDiff(p1,n1,p2,n2,z){
      const se = Math.sqrt(Math.max(0, p1*(1-p1)/n1 + p2*(1-p2)/n2));
      const d = p2 - p1;
      return { d, lo: d - z*se, hi: d + z*se, se };
    }

    // test (allow hypothesized difference delta0; use unpooled/Wald SE)
    function zTestTwoProp(p1,n1,p2,n2, delta0 = 0){
      const x1 = p1 * n1, x2 = p2 * n2;
      const pPool = (x1 + x2) / (n1 + n2);
      // use unpooled (Wald) standard error for testing against non-zero delta
      const se = Math.sqrt(Math.max(0, p1*(1-p1)/n1 + p2*(1-p2)/n2));
      if(se === 0) return { z: NaN, p: NaN, pPool, se };
      const z = (p2 - p1 - delta0) / se;
      const pval = 2 * (1 - normCdf(Math.abs(z)));
      return { z, p: pval, pPool, se };
    }

    // names
    function getNames(){
      let g1=q("g1name").value.trim() || "Control";
      let g2=q("g2name").value.trim() || "Variant";
      g1=g1.replace(/\s+/g," ").slice(0,40);
      g2=g2.replace(/\s+/g," ").slice(0,40);
      return { g1, g2 };
    }
    function updateNameSpans(){
      const { g1, g2 } = getNames();
      q("g1label_p").textContent = g1;
      q("g1label_n").textContent = g1;
      q("g2label_p").textContent = g2;
      q("g2label_n").textContent = g2;
    }

    // ---- Marketing scenarios ----
    const scenarioState = { manifest: [], defaultDescription: '' };

    async function fetchScenarioIndex(){
      try{
        const response = await fetch('scenarios/scenario-index.json', { cache: 'no-cache' });
        if(!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        if(Array.isArray(data)) scenarioState.manifest = data;
      }catch(err){
        console.error('Scenario index error:', err);
        scenarioState.manifest = [];
      }
    }

    function populateScenarioOptions(){
      const select = q("scenario-select");
      if(!select) return;
      const current = select.value;
      select.innerHTML = '<option value=\"\">Manual inputs (no preset)</option>';
      scenarioState.manifest.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = entry.label || entry.id;
        if(entry.id === current){
          option.selected = true;
        }
        select.appendChild(option);
      });
    }

    function formatScenarioMarkup(text){
      return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    }

    function renderScenarioDescription(title, description){
      const container = q('scenario-description');
      if(!container) return;
      if(!description){
        container.innerHTML = scenarioState.defaultDescription;
        return;
      }
      const heading = title ? `<p><strong>${title}</strong></p>` : '';
      const paragraphs = description
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean)
        .map(text => `<p>${formatScenarioMarkup(text)}</p>`)
        .join('');
      container.innerHTML = heading + (paragraphs || `<p>${formatScenarioMarkup(description)}</p>`);
    }

    function parseScenarioText(text){
      const lines = text.replace(/\r/g,'').split('\n');
      const result = { title:'', description:[], control:null, variant:null, settings:{}, rawData:[] };
      let section = '';
      lines.forEach(line => {
        const trimmed = line.trim();
        if(trimmed.startsWith('# ')){
          section = trimmed.slice(2).toLowerCase();
          return;
        }
        if(!section) return;
        if(section === 'title' && trimmed){
          result.title = trimmed;
        }else if(section === 'description'){
          result.description.push(line);
        }else if(section === 'control' || section === 'variant'){
          const parts = trimmed.split('|').map(part => part.trim());
          if(parts.length >= 3){
            const [name, pStr, nStr] = parts;
            const proportion = parseFloat(pStr);
            const n = parseInt(nStr, 10);
            if(name && isFinite(proportion) && Number.isInteger(n)){
              result[section] = { name, proportion, n };
            }
          }
        }else if(section === 'raw data'){
          if(!trimmed) return;
          const parts = trimmed.split('|').map(part => part.trim());
          if(parts.length >= 2){
            const [groupLabel, valueStr] = parts;
            const value = parseFloat(valueStr);
            if(groupLabel && isFinite(value)){
              result.rawData.push({ group: groupLabel, value });
            }
          }
        }else if(section === 'settings' && trimmed.includes('=')){
          const [key, ...rest] = trimmed.split('=');
          result.settings[key.trim().toLowerCase()] = rest.join('=').trim();
        }
      });
      result.description = result.description.join('\n').trim();
      return result;
    }

    function parseDatasetRawEntries(text){
      const trimmed = (text || '').trim();
      if(!trimmed) return [];
      const lines = trimmed.split(/\r\n|\n|\r/).filter(line => line.trim().length);
      if(lines.length < 2) return [];
      const delimiter = flexibleDelimiter(lines[0]);
      const headers = lines[0].split(delimiter).map(h => h.trim());
      const normalized = headers.map(normalizeHeader);
      const groupIdx = findHeaderIndex(normalized, ['group','variant','arm','label','name']);
      const valueIdx = findHeaderIndex(normalized, ['conversion','converted','outcome','result','value']);
      if(groupIdx === -1 || valueIdx === -1) return [];
      const entries = [];
      lines.slice(1).forEach(line => {
        const parts = line.split(delimiter);
        if(parts.length !== headers.length) return;
        const label = (parts[groupIdx] || '').trim();
        const value = parseFloat(parts[valueIdx]);
        if(!label || !(value === 0 || value === 1)) return;
        entries.push({ group: label, value });
      });
      return entries;
    }


    function summarizeRawEntries(entries){
      if(!Array.isArray(entries) || !entries.length) return [];
      const stats = new Map();
      entries.forEach(entry => {
        if(!entry || !entry.group || !isFinite(entry.value)) return;
        const label = entry.group.trim();
        if(!stats.has(label)){
          stats.set(label, { name: label, conversions: 0, sample: 0 });
        }
        const item = stats.get(label);
        item.sample += 1;
        item.conversions += entry.value >= 1 ? 1 : (entry.value <= 0 ? 0 : entry.value);
      });
      return Array.from(stats.values()).map(item => {
        const sample = Math.max(1, item.sample);
        const wins = Math.max(0, Math.min(sample, Math.round(item.conversions)));
        return { name: item.name, proportion: wins / sample, n: sample };
      });
    }

    function assignScenarioValues(value, ids = []){
      if(!isFinite(value)) return;
      ids.forEach(id => {
        const el = q(id);
        if(!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    function buildScenarioDataset(preset, scenarioId, datasetOverride){
      if(datasetOverride){
        return {
          type: 'file',
          path: datasetOverride,
          filename: datasetOverride.split('/').pop() || 'scenario.csv'
        };
      }
      const safeId = (scenarioId || 'scenario').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if(preset.rawData && preset.rawData.length){
        const lines = ['group,conversion'];
        preset.rawData.forEach(entry => {
          if(entry.group && isFinite(entry.value)){
            const val = entry.value >= 1 ? 1 : (entry.value <= 0 ? 0 : entry.value);
            lines.push(`${entry.group},${val}`);
          }
        });
        if(lines.length > 1){
          return { type: 'inline', filename: `${safeId}_raw_data.csv`, content: lines.join('\n') };
        }
      }
      if(preset.control && preset.variant){
        const rows = ['group,conversions,sample_size,proportion'];
        [preset.control, preset.variant].forEach(group => {
          if(!group) return;
          const wins = Math.max(0, Math.min(group.n || 0, Math.round((group.proportion || 0) * (group.n || 0))));
          rows.push(`${group.name || 'Group'},${wins},${group.n},${(group.proportion || 0).toFixed(4)}`);
        });
        if(rows.length > 1){
          return { type: 'inline', filename: `${safeId}_summary_inputs.csv`, content: rows.join('\n') };
        }
      }
      return null;
    }

    function updateScenarioDownloadButton(datasetInfo){
      currentScenarioDataset = datasetInfo;
      const button = q('scenario-download');
      if(!button) return;
      if(datasetInfo){
        button.classList.remove('hidden');
        button.disabled = false;
      }else{
        button.classList.add('hidden');
        button.disabled = true;
      }
    }

    function applyScenarioPreset(preset, entry){
      if(!preset) return;
      if((!preset.control || !preset.variant) && preset.rawData && preset.rawData.length){
        const derived = summarizeRawEntries(preset.rawData);
        if(derived[0] && !preset.control){
          preset.control = { name: derived[0].name, proportion: derived[0].proportion, n: derived[0].n };
        }
        if(derived[1] && !preset.variant){
          preset.variant = { name: derived[1].name, proportion: derived[1].proportion, n: derived[1].n };
        }
      }
      if(preset.control){
        const { name, proportion, n } = preset.control;
        if(q('g1name')){
          q('g1name').value = name || 'Control';
          q('g1name').dispatchEvent(new Event('input', { bubbles: true }));
        }
        assignScenarioValues(proportion, ['p1','p1num']);
        assignScenarioValues(n, ['n1','n1num']);
      }
      if(preset.variant){
        const { name, proportion, n } = preset.variant;
        if(q('g2name')){
          q('g2name').value = name || 'Variant';
          q('g2name').dispatchEvent(new Event('input', { bubbles: true }));
        }
        assignScenarioValues(proportion, ['p2','p2num']);
        assignScenarioValues(n, ['n2','n2num']);
      }
      if(preset.settings){
        if(preset.settings.delta0){
          assignScenarioValues(parseFloat(preset.settings.delta0), ['delta','deltanum']);
        }
        if(preset.settings.alpha){
          const alphaVal = parseFloat(preset.settings.alpha);
          if(isFinite(alphaVal)){
            const ciTarget = parseFloat((1 - alphaVal).toFixed(2));
            setConfidenceLevel(ciTarget);
          }
        }
      }
      renderScenarioDescription(preset.title || entry?.label, preset.description);
      const datasetInfo = buildScenarioDataset(preset, entry?.id, entry?.dataset);
      updateScenarioDownloadButton(datasetInfo);
      render();
    }

    async function loadScenarioById(id){
      const scenario = scenarioState.manifest.find(entry => entry.id === id);
      if(!scenario){
        renderScenarioDescription('', '');
        updateScenarioDownloadButton(null);
        return;
      }
      try{
        const response = await fetch(scenario.file, { cache: 'no-cache' });
        if(!response.ok) throw new Error(response.statusText);
        const text = await response.text();
        const parsed = parseScenarioText(text);
        if(scenario.dataset){
          try{
            const datasetResponse = await fetch(scenario.dataset, { cache: 'no-cache' });
            if(datasetResponse.ok){
              const datasetText = await datasetResponse.text();
              const datasetEntries = parseDatasetRawEntries(datasetText);
              if(datasetEntries.length){
                parsed.rawData = datasetEntries.map(entry => ({
                  group: entry.group,
                  value: entry.value
                }));
                parsed.control = null;
                parsed.variant = null;
              }
            }
          }catch(datasetErr){
            console.error('Dataset fetch error:', datasetErr);
          }
        }
        applyScenarioPreset(parsed, scenario);
      }catch(err){
        console.error('Scenario load error:', err);
      }
    }

    function clampInterval(ci, { min = 0, max = 1 } = {}, flagRef){
      const next = { ...ci };
      if(Object.prototype.hasOwnProperty.call(next, 'lo')){
        const clampedLo = clampValue(next.lo, min, max);
        const clampedHi = clampValue(next.hi, min, max);
        if(clampedLo !== next.lo || clampedHi !== next.hi){
          next.lo = clampedLo;
          next.hi = clampedHi;
          if(flagRef) flagRef.clamped = true;
        }
      }
      if(Object.prototype.hasOwnProperty.call(next, 'lower')){
        const clampedLower = clampValue(next.lower, min, max);
        const clampedUpper = clampValue(next.upper, min, max);
        if(clampedLower !== next.lower || clampedUpper !== next.upper){
          next.lower = clampedLower;
          next.upper = clampedUpper;
          if(flagRef) flagRef.clamped = true;
        }
      }
      return next;
    }

    function setupScenarioSelector(){
      const select = q('scenario-select');
      if(!select) return;
      select.addEventListener('change', () => {
        const value = select.value;
        if(!value){
          renderScenarioDescription('', '');
          updateScenarioDownloadButton(null);
          return;
        }
        loadScenarioById(value);
      });
      const downloadButton = q('scenario-download');
      if(downloadButton){
        downloadButton.addEventListener('click', async () => {
          if(!currentScenarioDataset) return;
          if(currentScenarioDataset.type === 'file' && currentScenarioDataset.path){
            try{
              const response = await fetch(currentScenarioDataset.path, { cache: 'no-cache' });
              if(!response.ok) throw new Error(response.statusText);
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = currentScenarioDataset.filename || 'scenario.csv';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }catch(err){
              console.error('Scenario download error:', err);
            }
            return;
          }
          downloadTextFile(
            currentScenarioDataset.filename || 'scenario.csv',
            currentScenarioDataset.content || '',
            { mimeType: 'text/csv' }
          );
        });
      }
    }

    async function initializeScenarios(){
      const description = q('scenario-description');
      if(description){
        scenarioState.defaultDescription = description.innerHTML;
      }
      await fetchScenarioIndex();
      populateScenarioOptions();
      setupScenarioSelector();
    }

    // CI level
    function currentAlpha(){
      const active = document.querySelector('#ciLevelButtons .confidence-button.active');
      const level = active ? parseFloat(active.dataset.level) : 0.95;
      return 1 - (isFinite(level) ? level : 0.95);
    }

    function setConfidenceLevel(level){
      const buttons = document.querySelectorAll('#ciLevelButtons .confidence-button');
      if(!buttons.length || !isFinite(level)) return;
      buttons.forEach(button => {
        const buttonLevel = parseFloat(button.dataset.level);
        const isActive = Math.abs(buttonLevel - level) < 1e-6;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function setupConfidenceButtons(){
      const container = document.getElementById('ciLevelButtons');
      if(!container) return;
      container.addEventListener('click', event => {
        const button = event.target.closest('.confidence-button');
        if(!button) return;
        event.preventDefault();
        const level = parseFloat(button.dataset.level);
        if(!isFinite(level)) return;
        setConfidenceLevel(level);
        render();
      });
      container.querySelectorAll('.confidence-button').forEach(button => {
        button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
      });
      if(!container.querySelector('.confidence-button.active')){
        setConfidenceLevel(0.95);
      }
    }

    // write-ups
    function buildWriteups({g1,g2}, p1, n1, p2, n2, alpha, z, p, cd, levelPct){
      // look up current hypothesized difference Δ0 from the UI (if set)
      const delta0 = Number.isFinite(parseFloat(q("delta")?.value)) ? parseFloat(q("delta").value) : 0;
      const p1s = pct(p1,1), p2s = pct(p2,1);
      const dsPP  = ppLabel(cd.d,1);
      const loPP  = ppLabel(cd.lo,1);
      const hiPP  = ppLabel(cd.hi,1);

      const significant = Number.isFinite(p) && p < alpha;
      const decisionClause = significant ? "Therefore, we reject the null hypothesis." : "Therefore, we fail to reject the null hypothesis.";

      const apa =
        `A two-proportion z test (two-tailed) compared ${g2} (p = ${p2s}, n = ${n2}) with ` +
        `${g1} (p = ${p1s}, n = ${n1}) at the ${levelPct}% confidence level (α = ${alpha.toFixed(2)}). ` +
        `The difference in proportions was Δ = ${dsPP}, ${levelPct}% CI [${loPP}, ${hiPP}], ` +
        `z = ${fmt(z,3)}, p = ${Number.isFinite(p) ? (p < 0.001 ? "< .001" : fmt(p,3)) : "—"}. ` +
        `Null hypothesis: H₀: Δ = ${ppLabel(delta0,1)}. ${decisionClause}`;

      const decision = significant ? "statistically reliable" : "not statistically reliable";
      const mgr =
        `The proportion for ${g2} is ${p2s} and for ${g1} is ${p1s}. The simple difference is ${dsPP} ` +
        `with a ${levelPct}% confidence interval of [${loPP}, ${hiPP}]. At this confidence level, ` +
        `the difference is ${decision} (two-tailed test).`;

      return { apa, mgr };
    }

    function updateDiagnostics(p1, n1, p2, n2, cd, delta0, alpha, levelPct){
      const container = q("diagnostics-content");
      if(!container) return;
      const labels = [
        q("g1label_p").textContent || "Control",
        q("g2label_p").textContent || "Variant"
      ];
      const arms = [
        { label: labels[0], success: p1 * n1, failure: (1 - p1) * n1 },
        { label: labels[1], success: p2 * n2, failure: (1 - p2) * n2 }
      ];
      const minArmSize = Math.min(n1, n2);
      const sizeStatus = minArmSize >= 400 ? "good" : minArmSize >= 200 ? "caution" : "alert";
      const sizeMessage = `Smallest arm currently has ${minArmSize.toLocaleString()} observations. ${sizeStatus === "good" ? "Plenty of data for stable estimates." : sizeStatus === "caution" ? "More data would tighten the estimates." : "Add traffic before making a final decision."}`;

      const marginalArms = arms.filter(arm => arm.success < 5 || arm.failure < 5);
      const approxStatus = marginalArms.length ? (marginalArms.some(arm => arm.success < 3 || arm.failure < 3) ? "alert" : "caution") : "good";
      const approxMessage = marginalArms.length
        ? `${marginalArms.map(arm => arm.label).join(" & ")} have fewer than five expected successes or failures. Treat z-based CIs and p-values as rough guides.`
        : "Large-sample conditions look reasonable (np >= 5 and n(1-p) >= 5 for both groups).";

      const balanceRatio = Math.min(n1, n2) / Math.max(n1, n2 || 1);
      const balanceStatus = balanceRatio >= 0.7 ? "good" : balanceRatio >= 0.5 ? "caution" : "alert";
      const balanceMessage = balanceStatus === "good"
        ? `Sample sizes are balanced (${n1.toLocaleString()} vs ${n2.toLocaleString()}).`
        : `Sample sizes differ (${n1.toLocaleString()} vs ${n2.toLocaleString()}); this can influence precision.`;

      const ciWidthPct = Math.abs((cd.hi - cd.lo) * 100);
      const precisionStatus = ciWidthPct <= 10 ? "good" : ciWidthPct <= 20 ? "caution" : "alert";
      const effectiveLevel = Number.isFinite(levelPct) ? levelPct : Math.round((1 - (alpha ?? 0.05)) * 100);
      const precisionMessage = `The ${effectiveLevel}% CI spans ${ciWidthPct.toFixed(1)} percentage points around the hypothesized difference of ${(delta0*100).toFixed(1)} pct pts.`;

      const includesNull = cd.lo <= delta0 && cd.hi >= delta0;
      const effectStatus = includesNull ? "caution" : "good";
      const effectMessage = includesNull
        ? `The confidence interval still includes the hypothesized difference (${(delta0*100).toFixed(1)} pct pts). More data may be needed to rule out the null.`
        : `The confidence interval excludes the hypothesized difference (${(delta0*100).toFixed(1)} pct pts), indicating a practical lift.`;

      const diagnostics = [
        { title: "Per-arm sample size", status: sizeStatus, message: sizeMessage },
        { title: "Normal approximation", status: approxStatus, message: approxMessage },
        { title: "Sample balance", status: balanceStatus, message: balanceMessage },
        { title: "CI precision", status: precisionStatus, message: precisionMessage },
        { title: "Lift vs. null", status: effectStatus, message: effectMessage }
      ];

      const items = diagnostics.map(item => `
        <div class="diagnostic-item ${item.status}">
          <strong>${item.title}</strong>
          <p>${item.message}</p>
        </div>
      `).join("");

      container.innerHTML = `
        <p>Diagnostics summarize whether the Wald z-test assumptions are reasonably met for this A/B comparison.</p>
        ${items}
      `;
    }

    function renderTable({g1,g2}, p1, n1, c1, p2, n2, c2, cd, levelPct, clampState){
      const rows = [
        { measure: "Proportion", label: g1, val: pct(p1,1), lo: pct(c1.lo,1), hi: pct(c1.hi,1), n: n1.toLocaleString() },
        { measure: "Proportion", label: g2, val: pct(p2,1), lo: pct(c2.lo,1), hi: pct(c2.hi,1), n: n2.toLocaleString() },
        { measure: "Difference (pct.pts)", label: `${g2} - ${g1}`, val: ppLabel(cd.d,1), lo: ppLabel(cd.lo,1), hi: ppLabel(cd.hi,1), n: `${n2.toLocaleString()} vs ${n1.toLocaleString()}` }
      ];
      q("ciLowerHeader").textContent = `CI Lower (${levelPct}%)`;
      q("ciUpperHeader").textContent = `CI Upper (${levelPct}%)`;
      q("summaryBody").innerHTML = rows.map(r => `
        <tr>
          <td>${r.measure}</td>
          <td>${r.label}</td>
          <td >${r.val}</td>
          <td >${r.lo}</td>
          <td >${r.hi}</td>
          <td >${r.n}</td>
        </tr>
      `).join("");

      const warningEl = q("summary-warning");
      if(warningEl){
        if(clampState && clampState.clamped){
          warningEl.textContent = "*Confidence interval bounds were truncated to stay within valid ranges (0–100% for proportions, ±100 pct pts for differences).";
          warningEl.classList.remove("hidden");
        } else {
          warningEl.textContent = "";
          warningEl.classList.add("hidden");
        }
      }
    }

    function setupAdvancedSettings(){
      const select = q('ci-method-select');
      if(!select) return;
      select.value = currentCIMethod;
      select.addEventListener('change', () => {
        const method = select.value;
        if(Object.values(CI_METHODS).includes(method)){
          currentCIMethod = method;
          render();
        }
      });
    }

    // axis helpers
    function getLockedPropRange(){
      const locked = q("lockPropAxis").checked;
      if(!locked) return null;
      let minPct = parseFloat(q("propMin").value);
      let maxPct = parseFloat(q("propMax").value);
      if(!isFinite(minPct) || !isFinite(maxPct)) return null;
      if(maxPct < minPct){ const t = minPct; minPct = maxPct; maxPct = t; }
      return [minPct/100, maxPct/100];
    }
    function getLockedDiffRange(){
      const locked = q("lockDiffAxis").checked;
      if(!locked) return null;
      let minPP = parseFloat(q("diffMin").value);
      let maxPP = parseFloat(q("diffMax").value);
      if(!isFinite(minPP) || !isFinite(maxPP)) return null;
      if(maxPP < minPP){ const t = minPP; minPP = maxPP; maxPP = t; }
      return [minPP/100, maxPP/100];
    }

    // fan shapes
    function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

    function render(){
      updateNameSpans();
      const names = getNames();
      const { g1, g2 } = names;

      const p1Field = q('p1num') || q('p1');
      const p2Field = q('p2num') || q('p2');
      const n1Field = q('n1num') || q('n1');
      const n2Field = q('n2num') || q('n2');
      const deltaField = q('deltanum') || q('delta');

      const p1 = parseFloat(p1Field?.value);
      const p2 = parseFloat(p2Field?.value);
      const n1 = parseInt(n1Field?.value, 10);
      const n2 = parseInt(n2Field?.value, 10);
      const alpha = currentAlpha();
      const selectedConfidenceLevel = 1 - alpha;
      const delta0 = Number.isFinite(parseFloat(deltaField?.value)) ? parseFloat(deltaField.value) : 0;
      if ([p1,p2,n1,n2,alpha].some(v=>isNaN(v))) return;

      // z for 50/80/selected
      const z50 = invNorm(1 - (1-0.50)/2);
      const z80 = invNorm(1 - (1-0.80)/2);
      const zSel = invNorm(1 - alpha/2);
      const levelPct = Math.round((1 - alpha) * 100);

      // CIs
      const clampState = { clamped: false };
      const c1_50 = clampInterval(ciProp(p1, n1, z50), { min: 0, max: 1 }, clampState);
      const c1_80 = clampInterval(ciProp(p1, n1, z80), { min: 0, max: 1 }, clampState);
      const c1 = clampInterval(ciProp(p1, n1, zSel), { min: 0, max: 1 }, clampState);
      const c2_50 = clampInterval(ciProp(p2, n2, z50), { min: 0, max: 1 }, clampState);
      const c2_80 = clampInterval(ciProp(p2, n2, z80), { min: 0, max: 1 }, clampState);
      const c2 = clampInterval(ciProp(p2, n2, zSel), { min: 0, max: 1 }, clampState);
      const cd_50 = clampInterval(ciDiff(p1, n1, p2, n2, z50), { min: -1, max: 1 }, clampState);
      const cd_80 = clampInterval(ciDiff(p1, n1, p2, n2, z80), { min: -1, max: 1 }, clampState);
      const cd = clampInterval(ciDiff(p1, n1, p2, n2, zSel), { min: -1, max: 1 }, clampState);

      // ---------- Proportions chart ----------
      const confidenceLevels = [0.5, 0.8, selectedConfidenceLevel];
      const uniqueLevels = [...new Set(confidenceLevels)].sort((a, b) => a - b);

      let minLo = Math.min(c1.lo, c2.lo);
      let maxHi = Math.max(c1.hi, c2.hi);
      let span  = Math.max(0.02, maxHi - minLo);
      let pad   = Math.max(0.02, span * 0.18);
      let xmin  = Math.max(0, minLo - pad);
      let xmax  = Math.min(1, maxHi + pad);
      if (xmax - xmin < 0.12) { const mid=(xmin+xmax)/2; xmin=Math.max(0, mid-0.06); xmax=Math.min(1, mid+0.06); }
      const propRange = getLockedPropRange() || [xmin, xmax];

      const propIntervals = {
        group1: {
          0.5: { lower: c1_50.lo, upper: c1_50.hi },
          0.8: { lower: c1_80.lo, upper: c1_80.hi },
          [selectedConfidenceLevel]: { lower: c1.lo, upper: c1.hi }
        },
        group2: {
          0.5: { lower: c2_50.lo, upper: c2_50.hi },
          0.8: { lower: c2_80.lo, upper: c2_80.hi },
          [selectedConfidenceLevel]: { lower: c2.lo, upper: c2.hi }
        }
      };


      FanChartUtils.renderHorizontalFanChart({
        containerId: 'propChart',
        groups: [
          { id: 'group1', value: p1, label: g1, tickLabel: `${g1} (n=${n1.toLocaleString()})` },
          { id: 'group2', value: p2, label: g2, tickLabel: `${g2} (n=${n2.toLocaleString()})` }
        ],
        intervals: propIntervals,
        confidenceLevels: uniqueLevels,
        axisRange: propRange,
        title: `Estimated Proportions for ${g1} and ${g2} with Fan Bands (50%, 80%, ${levelPct}%)`,
        xTitle: 'Proportion',
        valueFormatter: value => pct(value, 1),
        pointLabelOffset: 0.6,
        ariaLabel: `Fan chart comparing ${g1} and ${g2} proportions with ${uniqueLevels.map(l => Math.round(l * 100)).join('% / ')} percent intervals.`
      });
      q("propTitle").textContent = `Proportions for ${g1} and ${g2} • Fan Chart (50/80/${levelPct}%)`;

      // ---------- Difference chart ----------
      let dMin = cd.lo, dMax = cd.hi;
      let dSpan = Math.max(0.02, dMax - dMin);
      let dPad  = Math.max(0.01, dSpan * 0.22);
      let dxmin = dMin - dPad, dxmax = dMax + dPad;
      if (dxmax - dxmin < 0.12) { const mid=(dxmin+dxmax)/2; dxmin=mid-0.06; dxmax=mid+0.06; }
      const diffRange = getLockedDiffRange() || [dxmin, dxmax];

      const diffIntervals = { difference: {
        0.5: { lower: cd_50.lo, upper: cd_50.hi },
        0.8: { lower: cd_80.lo, upper: cd_80.hi },
        [selectedConfidenceLevel]: { lower: cd.lo, upper: cd.hi }
      }};

      FanChartUtils.renderHorizontalFanChart({
        containerId: 'diffChart',
        groups: [{
          id: 'difference',
          value: cd.d,
          label: `${g2} − ${g1}`,
          tickLabel: `Δ = ${g2} (n=${n2.toLocaleString()}) − ${g1} (n=${n1.toLocaleString()})`
        }],
        intervals: diffIntervals,
        confidenceLevels: uniqueLevels,
        axisRange: diffRange,
        title: `Difference in Proportions (${g2} − ${g1}) with Fan Bands (50%, 80%, ${levelPct}%)`,
        xTitle: 'Difference in proportion',
        referenceLine: isFinite(delta0) ? {
          value: delta0,
          label: 'Δ₀ reference',
          style: { color: '#777', dash: 'dot', width: 1 }
        } : null,
        valueFormatter: value => pct(value, 1),
        pointLabelOffset: 0.5,
        ariaLabel: `Fan chart summarizing the proportion difference between ${g2} and ${g1} with ${uniqueLevels.map(l => Math.round(l * 100)).join('% / ')} percent intervals.`
      });
      q("diffTitle").textContent = `Difference in Proportions (${g2} − ${g1}) • Fan Chart (50/80/${levelPct}%)`;

      // write-ups + table
      const { z, p } = zTestTwoProp(p1, n1, p2, n2, delta0);
      const { apa, mgr } = buildWriteups({g1,g2}, p1, n1, p2, n2, alpha, z, p, cd, levelPct);
      q("apaWriteup").textContent = apa;
        q("mgrWriteup").textContent = mgr;
        renderTable({g1,g2}, p1, n1, c1, p2, n2, c2, cd, levelPct, clampState);
      updateDiagnostics(p1, n1, p2, n2, cd, delta0, alpha, levelPct);

      // -------------------- Interpretation text for Proportions chart --------------------
      try{
        const p1s = pct(p1,1), p2s = pct(p2,1);
        const c1lo = pct(c1.lo,1), c1hi = pct(c1.hi,1);
        const c2lo = pct(c2.lo,1), c2hi = pct(c2.hi,1);
        const se1 = (c1.se).toFixed(4), se2 = (c2.se).toFixed(4);
        const propMsg = `<strong>${g1}:</strong> estimate = ${p1s} (n=${n1.toLocaleString()}), ${levelPct}% CI [${c1lo}, ${c1hi}], SE=${se1}. `+
                        `<strong>${g2}:</strong> estimate = ${p2s} (n=${n2.toLocaleString()}), ${levelPct}% CI [${c2lo}, ${c2hi}], SE=${se2}. `+
                        `Fan bands show the 50% (inner), 80% (middle), and ${levelPct}% (outer) intervals—wider bands indicate more uncertainty. `+
                        `If the bands/intervals for the two groups overlap substantially, the evidence for a true difference is weak.`;
        q('propInterpret').innerHTML = propMsg;
      }catch(e){ q('propInterpret').textContent = ''; }

      // -------------------- Interpretation text for Difference chart --------------------
      try{
        const dObs = ppLabel(cd.d,1);
        const dlo = ppLabel(cd.lo,1), dhi = ppLabel(cd.hi,1);
        const pvalText = Number.isFinite(p) ? (p < 0.001 ? '< .001' : fmt(p,3)) : '—';
        const zText = Number.isFinite(z) ? fmt(z,3) : '—';
        const includesDelta0 = (cd.lo <= delta0 && cd.hi >= delta0);
        const includeText = includesDelta0 ? 'includes' : 'does not include';
        const sig = Number.isFinite(p) && p < alpha;
        const decision = sig ? 'statistically significant at the selected +' : 'not statistically significant at the selected +';
        const diffMsg = `Observed difference + = ${dObs} with ${levelPct}% CI [${dlo}, ${dhi}]. `+
                        `Test vs H₀: Δ₀ = ${ppLabel(delta0,1)} — z = ${zText}, p = ${pvalText} (${decision}). `+
                        `The ${levelPct}% CI ${includeText} the hypothesized Δ₀, so the visual estimate ${includeText} that value.`; 
        q('diffInterpret').innerHTML = diffMsg;
      }catch(e){ q('diffInterpret').textContent = ''; }

      // (Optional) also update preserved metrics panel if you use it
      if (q("sample_size")) q("sample_size").textContent = "";
      if (q("p2_rate")) q("p2_rate").textContent = "";
    }

    // bind controls
    const link = (s, n) => {
      s.addEventListener("input", () => { n.value = s.value; render(); });
      n.addEventListener("input", () => { s.value = n.value; render(); });
    };
    link(q("p1"), q("p1num"));
    link(q("p2"), q("p2num"));
    link(q("n1"), q("n1num"));
    link(q("n2"), q("n2num"));
    // link hypothesized difference control
    if (q("delta") && q("deltanum")) link(q("delta"), q("deltanum"));
    [q("g1name"), q("g2name")].forEach(el => el.addEventListener("input", render));
    setupConfidenceButtons();
    setupAdvancedSettings();
    [q("lockPropAxis"), q("propMin"), q("propMax"),
     q("lockDiffAxis"), q("diffMin"), q("diffMax")].forEach(el => el.addEventListener("input", render));
    q("resetAxes").addEventListener("click", () => {
      q("lockPropAxis").checked = false;
      q("lockDiffAxis").checked = false;
      render();
    });

    // initial draw + scenario setup
    setupDataEntryMode();
    setupUploadPanels();
    updateScenarioDownloadButton(null);
    initializeScenarios();
    render();
