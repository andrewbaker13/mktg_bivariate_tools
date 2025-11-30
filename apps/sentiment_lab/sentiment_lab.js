// Sentiment Analysis Lab JS

const SENTIMENT_LAB_CREATED_DATE = '2025-11-25';
let sentimentLabModifiedDate = new Date().toLocaleDateString();

// Scenario state
let scenarioManifest = [];
let activeScenarioDataset = null;

// Sentiment data
let sentimentRows = [];

// Usage tracking variables
let pageLoadTime = Date.now();
let hasSuccessfulRun = false;

// Usage tracking function
function checkAndTrackUsage() {
  const timeOnPage = (Date.now() - pageLoadTime) / 1000 / 60;
  if (timeOnPage < 0.167) return; // 10 seconds for testing (change back to 3 for production)
  if (!hasSuccessfulRun) return;
  if (typeof isAuthenticated !== 'function' || !isAuthenticated()) return;
  
  const today = new Date().toISOString().split('T')[0];
  const storageKey = `tool-tracked-sentiment-lab-${today}`;
  if (localStorage.getItem(storageKey)) return;
  
  if (typeof logToolUsage === 'function') {
    logToolUsage('sentiment-lab', {}, `Sentiment analysis completed`);
    localStorage.setItem(storageKey, 'true');
    console.log('Usage tracked for Sentiment Lab');
  }
}

let sentimentRows = []; // { index, text, scores, label }

const SentimentScenarios = [
  {
    id: 'enrollment-reddit',
    label: 'Reddit posts about an online enrollment system',
    description: `
      <p>
        Simulated Reddit-style posts reacting to a new online course enrollment system at a Southern California university.
        Some students are impressed by the speed and clarity of the new interface; others are frustrated by bugs, timeouts,
        and confusing waitlist rules.
      </p>
      <p>
        Use this case to practice reading sentiment labels in the context of student experience research. Imagine you are
        summarizing overall sentiment for stakeholders deciding whether the rollout was a success or needs urgent fixes.
      </p>
    `,
    lines: [
      "The new enrollment system is honestly awesome compared to the old nightmare portal; it actually feels very modern now and I’m not constantly worried it will crash mid-click.",
      "I tried to add one class and the site froze three times in a row; it isn't just slow, it’s genuinely terrible when you’re already stressed about getting the last open seat.",
      "It worked fine for me on Chrome, but my roommate keeps getting weird error messages on Safari, so I’m kind of unsure whether the system is really stable for everyone.",
      "Love how I can finally see my waitlist position in real time; that tiny change is very reassuring when you’re desperately hoping the class opens up before the add/drop deadline.",
      "The interface looks pretty and is definitely cleaner, but it’s still confusing where to drop a class without messing up my whole schedule, so I’m not totally confident using it yet.",
      "Honestly, I’m neutral about it right now; it feels different, not necessarily better or worse, and I’m still very unsure if it will handle peak traffic without major issues.",
      "Why would they push this live during peak enrollment week? The timing is awful and it kind of feels like they didn’t fully test it before throwing thousands of students at it.",
      "Super smooth this morning: I logged in, clicked a few times, and I was completely done in five minutes, which is very impressive compared to the chaotic mess we had last semester.",
      "I hate that it logs you out so quickly; I stepped away for a second to check my degree plan and came back to find everything gone, which is really frustrating and not very user-friendly.",
      "The search filters are actually helpful now; I can filter by time and campus without losing my mind, and it’s very nice not to scroll endlessly through irrelevant course options.",
      "It took forever to load on my phone, so I just gave up and used the old desktop lab; for something that’s supposed to be convenient, it’s not great on mobile at all.",
      "Not sure if it's the system or the Wi‑Fi, but pages keep timing out during checkout; it’s really not cool when you’re scared you’ll lose your spot every time you click submit.",
      "The new layout is clean and easy to read, and I actually kind of enjoy browsing classes now; it’s a big improvement over that 90s-looking screen we had before, which was just awful.",
      "I was on the waitlist for two classes and the notifications were totally unclear about what happened; it’s very confusing to get an email that kind of hints at a change but doesn’t say it plainly.",
      "This update feels rushed; there are so many small glitches that make it really frustrating to use, and I’m not convinced they fully thought through the student experience.",
      "Once I figured out the steps, it was actually pretty straightforward; the tutorial video was very helpful, and now I don’t feel nearly as nervous navigating the process.",
      "No more random crashes so far, which is great, but I still don’t quite trust it on the day enrollment opens because the stakes are so high and the old system was so horribly unreliable.",
      "Customer support was super responsive in chat when I couldn’t drop a class; they were very friendly and walked me through the steps, which made the whole situation feel much less stressful.",
      "The color-coding for conflicts is nice and kind of clever, but the warning messages are still way too vague, so you have to guess what went wrong instead of clearly understanding the issue.",
      "Overall it’s a mixed bag: better design and some very thoughtful features, but the underlying reliability still needs serious work before students will fully trust it."
    ]
  },
  {
    id: 'influencer-swimwear',
    label: 'Influencer swimwear brand: detailed guest reviews',
    description: `
      <p>
        Long-form, simulated reviews of a new swimwear brand launched by a popular online influencer. Overall sentiment is
        strongly positive about the look, colors, and design, but many reviews also raise nuanced concerns about fit and
        sizing for different body types.
      </p>
      <p>
        Use this case to explore how sentiment can be positive in aggregate while still surfacing specific, actionable pain
        points. Imagine you are preparing a summary for the influencer’s team, highlighting both strong brand love and
        recurring feedback about comfort and sizing consistency.
      </p>
    `,
    lines: [
      "I genuinely love the overall vibe of this influencer’s swimwear collection; the colors are bright without being childish, and the prints are very on trend for the summer. The top I ordered looks amazing on camera and in person, and I feel kind of extra when I wear it to the pool because several people have already complimented it. That said, the bottoms run a bit smaller than I expected, and the high-cut style isn’t super forgiving if you’re between sizes. It’s not a deal-breaker, but I wish the fit matched the pictures a little more closely.",
      "This might be one of the prettiest bikinis I’ve ever bought, and I’m honestly not exaggerating. The fabric feels thick and expensive, and the color is a deep, rich blue that looks fantastic against my skin tone. I also appreciate that the influencer didn’t just slap her name on something cheap; the quality seems genuinely good. However, the sizing chart wasn’t very clear for curvier body types, so the top is slightly too tight while the bottoms are a little loose. I still kept it because the look is gorgeous, but the fit could definitely be refined.",
      "I was pleasantly surprised by how confident this swimsuit makes me feel. The cut is flattering and the pattern is stylish without being too loud, which is not easy to pull off. The packaging, the little thank-you note, and the overall branding are extremely polished and make the whole purchase feel special. On the downside, the straps aren’t very adjustable, so if your torso is longer or shorter than average, the fit is just okay instead of perfect. Overall, I’m very happy with the look, but I’m not completely satisfied with the way it sits when I move around.",
      "The marketing for this swimwear line is absolutely gorgeous, and I’m happy to say the suit I received mostly lives up to the hype. The colors are accurate to the photos and the fabric has a nice, smooth finish that feels great on the skin. I also liked how the design balances sexy and classy; it’s revealing, but not in a way that makes me uncomfortable. My only real issue is that the top doesn’t offer much support if you have a larger bust, so it feels a bit risky for active beach days. For lounging and photos, though, it’s pretty much perfect.",
      "I bought this swimsuit because I’ve followed the influencer for years and really trust her taste, and visually it did not disappoint. The details on the straps and the subtle shine in the fabric look amazing in natural light, and I felt very chic wearing it on vacation. Still, I have to admit that the bottoms dig in slightly at the hips, even though I followed the sizing guide exactly. It’s comfortable enough for short wear, but I’m not sure I’d want to wear it all day at a resort. The look is a solid win, but the fit could be a little kinder to real bodies.",
      "From a style perspective, this swimwear line absolutely nails it; the color palette, the cuts, and the overall aesthetic are exactly what I hoped they’d be when I saw the launch photos. When I put the suit on, I felt very put-together and confident, and it photographs incredibly well. That said, the material is slightly less stretchy than I expected, so the top doesn’t mold to my shape as comfortably as some other brands I own. I wouldn’t call it uncomfortable, but it isn’t quite as relaxed as I’d like for long pool days. Still, I’m glad I bought it.",
      "This is one of the few influencer products that really feels thoughtfully designed. The swimsuit looks beautiful on a variety of friends who tried it, and the color blocking is clever in how it draws attention to the right places. I also appreciate that the brand messaging emphasizes body positivity and feeling good in your own skin. My only hesitation is that the fit seems to favor one body type more than others; if you are between sizes, you might find the top slightly too loose or the bottoms just a bit tight. It’s a great look, but not perfectly inclusive in fit yet.",
      "I’ve been wearing this new bikini for a few weekends now, and I’m still very impressed by how well it holds up in real life. The seams are sturdy, the fabric hasn’t faded, and it still looks almost brand new after several dips in the pool. The influencer clearly didn’t cheap out on materials, which I really respect. At the same time, I wish the bottoms offered just a tiny bit more coverage in the back; they fit, but they do ride up more than I’d like when I’m walking around. Overall, it looks amazing, but the fit is a bit more daring than I personally prefer.",
      "The unboxing experience was lovely, and the swimsuit inside looked exactly like the photos: very sleek, very polished, and surprisingly luxurious for an influencer-branded line. When I tried it on, the top fit almost perfectly and gave a nice lift without feeling too tight. The bottoms, however, were just slightly off; they hit at an awkward spot on my waist, which makes me tug at them more than I’d like. I still feel great in the suit and I’ve gotten several compliments, but I’m not completely at ease in it. It’s beautiful, but the fit needs a few small tweaks.",
      "Overall, I’m really happy with this purchase and I do feel very confident recommending the swimwear to friends who care about style. The designs are fresh, the branding is strong, and the suits look amazing in photos, which is exactly what drew me in. At the same time, the line isn’t perfect yet; the sizing runs a touch inconsistent between styles, and the fit around the hips can be a little unpredictable. For me, the gorgeous look outweighs the minor comfort issues, but I hope future drops refine the fit so it feels as good as it looks."
    ]
  }
  }
}

function classifyCompound(compound) {
  if (compound >= 0.05) return 'positive';
  if (compound <= -0.05) return 'negative';
  return 'neutral';
}

function parseDelimitedText(content) {
  const delimiter = content.indexOf('\t') !== -1 ? '\t' : ',';
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const headers = lines[0].split(delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(delimiter));
  return { headers, rows };
}

function getTextData() {
  const manual = document.getElementById('manual-textarea');
  if (manual && manual.value.trim()) {
    const lines = manual.value
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
    return {
      mode: 'manual',
      rows: lines.map((text, i) => ({ index: i + 1, text }))
    };
  }

  if (!window._sentimentFileData) {
    return { mode: 'none', rows: [] };
  }

  const { headers, rows } = window._sentimentFileData;
  const select = document.getElementById('text-column-select');
  const colName = select ? select.value : '';
  const colIndex = headers.indexOf(colName);
  if (colIndex === -1) {
    return { mode: 'file', rows: [] };
  }

  const mapped = rows
    .map((cols, i) => (cols[colIndex] != null ? String(cols[colIndex]).trim() : ''))
    .map((text, i) => ({ index: i + 1, text }))
    .filter(r => r.text.length > 0);

  return { mode: 'file', rows: mapped };
}

function runSentimentAnalysis() {
  const status = document.getElementById('sentiment-status');
  if (status) status.textContent = '';

  const data = getTextData();
  if (!data.rows.length) {
    if (status) status.textContent = 'Provide text via file upload or pasted lines before running the analysis.';
    return;
  }

  if (!window.VaderAnalyzer || typeof window.VaderAnalyzer.polarityScores !== 'function') {
    if (status) status.textContent = 'Sentiment analyzer is not available. Please ensure vader_analyzer.js is loaded.';
    return;
  }

  sentimentRows = data.rows.map(row => {
    const scores = window.VaderAnalyzer.polarityScores(row.text);
    const label = classifyCompound(scores.compound);
    return { index: row.index, text: row.text, scores, label };
  });

  renderSentimentSummary();
  renderSentimentTable();
  renderSentimentLabelChart();
  renderSentimentExampleTwo();

  hasSuccessfulRun = true;
  checkAndTrackUsage();

  if (status) status.textContent = `Analyzed ${sentimentRows.length} text record(s).`;
}

function renderSentimentSummary() {
  const avgEl = document.getElementById('sentiment-avg-compound');
  const posEl = document.getElementById('sentiment-count-positive');
  const neuEl = document.getElementById('sentiment-count-neutral');
  const negEl = document.getElementById('sentiment-count-negative');
  const note = document.getElementById('sentiment-summary-note');

  if (!sentimentRows.length) {
    if (avgEl) avgEl.textContent = '–';
    if (posEl) posEl.textContent = '–';
    if (neuEl) neuEl.textContent = '–';
    if (negEl) negEl.textContent = '–';
    if (note) note.textContent = 'Run the analysis to see overall sentiment across your text records.';
    return;
  }

  let sumCompound = 0;
  let posCount = 0;
  let neuCount = 0;
  let negCount = 0;

  sentimentRows.forEach(row => {
    sumCompound += row.scores.compound;
    if (row.label === 'positive') posCount += 1;
    else if (row.label === 'neutral') neuCount += 1;
    else if (row.label === 'negative') negCount += 1;
  });

  const n = sentimentRows.length;

  if (avgEl) avgEl.textContent = (sumCompound / n).toFixed(4);
  if (posEl) posEl.textContent = `${posCount} (${((posCount / n) * 100).toFixed(1)}%)`;
  if (neuEl) neuEl.textContent = `${neuCount} (${((neuCount / n) * 100).toFixed(1)}%)`;
  if (negEl) negEl.textContent = `${negCount} (${((negCount / n) * 100).toFixed(1)}%)`;
  if (note) {
    note.textContent = `Sentiment labels use standard VADER-style thresholds on the compound score (positive ≥ 0.05, negative ≤ -0.05, and neutral in between).`;
  }
}

function renderSentimentTable() {
  const tbody = document.querySelector('#sentiment-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!sentimentRows.length) return;

  sentimentRows.forEach(row => {
    const tr = document.createElement('tr');

    const tdIdx = document.createElement('td');
    tdIdx.textContent = String(row.index);
    tr.appendChild(tdIdx);

    const tdText = document.createElement('td');
    tdText.textContent = row.text;
    tr.appendChild(tdText);

    const tdCompound = document.createElement('td');
    tdCompound.textContent = row.scores.compound.toFixed(4);
    tr.appendChild(tdCompound);

    const tdPos = document.createElement('td');
    tdPos.textContent = row.scores.pos.toFixed(4);
    tr.appendChild(tdPos);

    const tdNeu = document.createElement('td');
    tdNeu.textContent = row.scores.neu.toFixed(4);
    tr.appendChild(tdNeu);

    const tdNeg = document.createElement('td');
    tdNeg.textContent = row.scores.neg.toFixed(4);
    tr.appendChild(tdNeg);

    const tdLabel = document.createElement('td');
    tdLabel.textContent = row.label;
    if (row.label === 'positive') tdLabel.className = 'sentiment-label-positive';
    else if (row.label === 'neutral') tdLabel.className = 'sentiment-label-neutral';
    else if (row.label === 'negative') tdLabel.className = 'sentiment-label-negative';
    tr.appendChild(tdLabel);

    tbody.appendChild(tr);
  });
}

function renderSentimentLabelChart() {
  const container = document.getElementById('sentiment-label-chart');
  if (!container || typeof Plotly === 'undefined') return;

  if (!sentimentRows.length) {
    Plotly.purge(container);
    return;
  }

  let posCount = 0;
  let neuCount = 0;
  let negCount = 0;

  sentimentRows.forEach(row => {
    if (row.label === 'positive') posCount += 1;
    else if (row.label === 'neutral') neuCount += 1;
    else if (row.label === 'negative') negCount += 1;
  });

  const x = ['Positive', 'Neutral', 'Negative'];
  const y = [posCount, neuCount, negCount];

  const trace = {
    x,
    y,
    type: 'bar',
    marker: { color: ['#16a34a', '#6b7280', '#dc2626'] }
  };

  Plotly.newPlot(
    container,
    [trace],
    {
      margin: { t: 20, r: 10, b: 40, l: 40 },
      xaxis: { title: 'Sentiment label' },
      yaxis: { title: 'Count', rangemode: 'tozero' }
    },
    { responsive: true }
  );
}

function renderSentimentExampleTwo() {
  const textPos = document.getElementById('sentiment-example-text-positive');
  const textNeg = document.getElementById('sentiment-example-text-negative');
  const linePos = document.getElementById('sentiment-example-line-positive');
  const lineNeg = document.getElementById('sentiment-example-line-negative');
  const summaryPos = document.getElementById('sentiment-example-summary-positive');
  const summaryNeg = document.getElementById('sentiment-example-summary-negative');

  if (!textPos || !textNeg || !linePos || !lineNeg || !summaryPos || !summaryNeg) return;

  linePos.innerHTML = '';
  lineNeg.innerHTML = '';
  summaryPos.textContent = '';
  summaryNeg.textContent = '';

  if (!sentimentRows.length || !window.VaderAnalyzer || typeof window.VaderAnalyzer.explain !== 'function') {
    textPos.textContent =
      'Run the analysis to see a token-by-token breakdown for a relatively positive record.';
    textNeg.textContent =
      'Run the analysis to see a token-by-token breakdown for a relatively negative record.';
    return;
  }

  const positives = sentimentRows.filter(r => r.scores.compound >= 0.05);
  const negatives = sentimentRows.filter(r => r.scores.compound <= -0.05);

  const pickRandom = rows => {
    if (!rows.length) return null;
    const idx = Math.floor(Math.random() * rows.length);
    return rows[idx];
  };

  let positiveRow = pickRandom(positives);
  let negativeRow = pickRandom(negatives);

  if (!positiveRow) {
    positiveRow = pickRandom(sentimentRows);
  }
  if (!negativeRow) {
    negativeRow = pickRandom(sentimentRows);
  }

  const fillExample = (row, textEl, lineEl, summaryEl, label) => {
    if (!row) {
      textEl.textContent = `No ${label} example could be identified from the current data.`;
      summaryEl.textContent = '';
      return;
    }

    const explanation = window.VaderAnalyzer.explain(row.text);
    textEl.textContent = `Example #${row.index}: "${row.text}"`;

    // Build an inline sequence: token | token | ...
    lineEl.innerHTML = '';

    const appendToken = (contentEl, isFirst) => {
      if (!isFirst) {
        lineEl.appendChild(document.createTextNode(' | '));
      }
      lineEl.appendChild(contentEl);
    };

    explanation.tokens.forEach((tokenInfo, idx) => {
      const span = document.createElement('span');
      let cls = 'sentiment-token-neutral';
      if (tokenInfo.finalValence > 0) cls = 'sentiment-token-positive';
      else if (tokenInfo.finalValence < 0) cls = 'sentiment-token-negative';
      span.className = cls;

      let text = tokenInfo.token;
      if (tokenInfo.finalValence !== 0) {
        const valStr = tokenInfo.finalValence.toFixed(2);
        const valDisplay = tokenInfo.finalValence > 0 ? `+${valStr}` : valStr;
        const modsText =
          tokenInfo.modifiers && tokenInfo.modifiers.length
            ? `; ${tokenInfo.modifiers.join(', ')}`
            : '';
        text += ` (val=${valDisplay}${modsText})`;
      }

      span.textContent = text;
      appendToken(span, idx === 0);
    });

    summaryEl.textContent =
      `Summed token valence after adjustments is ${explanation.sumValenceAmplified.toFixed(
        3
      )}, which normalizes to a compound score of ${explanation.compound.toFixed(4)}. ` +
      `Positive, neutral, and negative proportions are ${explanation.pos.toFixed(4)}, ` +
      `${explanation.neu.toFixed(4)}, and ${explanation.neg.toFixed(4)}, respectively.`;
  };

  fillExample(positiveRow, textPos, linePos, summaryPos, 'relatively positive');
  fillExample(negativeRow, textNeg, lineNeg, summaryNeg, 'relatively negative');
}
function renderSentimentExample() {
  const exampleTextEl = document.getElementById('sentiment-example-text');
  const exampleTableBody = document.querySelector('#sentiment-example-table tbody');
  const exampleSummaryEl = document.getElementById('sentiment-example-summary');

  if (!exampleTextEl || !exampleTableBody || !exampleSummaryEl) return;

  exampleTableBody.innerHTML = '';

  if (!sentimentRows.length || !window.VaderAnalyzer || typeof window.VaderAnalyzer.explain !== 'function') {
    exampleTextEl.textContent =
      'Run the analysis to see a token-by-token breakdown for one randomly chosen record.';
    exampleSummaryEl.textContent = '';
    return;
  }

  const idx = Math.floor(Math.random() * sentimentRows.length);
  const row = sentimentRows[idx];
  const explanation = window.VaderAnalyzer.explain(row.text);

  exampleTextEl.textContent = `Example #${row.index}: "${row.text}"`;

  explanation.tokens.forEach(tokenInfo => {
    const tr = document.createElement('tr');

    const tdToken = document.createElement('td');
    tdToken.textContent = tokenInfo.token;
    if (tokenInfo.finalValence > 0) tdToken.className = 'sentiment-token-positive';
    else if (tokenInfo.finalValence < 0) tdToken.className = 'sentiment-token-negative';
    tr.appendChild(tdToken);

    const tdBase = document.createElement('td');
    tdBase.textContent = tokenInfo.baseValence.toFixed(3);
    tr.appendChild(tdBase);

    const tdMods = document.createElement('td');
    tdMods.textContent =
      tokenInfo.modifiers && tokenInfo.modifiers.length ? tokenInfo.modifiers.join('; ') : '—';
    tr.appendChild(tdMods);

    const tdFinal = document.createElement('td');
    tdFinal.textContent = tokenInfo.finalValence.toFixed(3);
    tr.appendChild(tdFinal);

    exampleTableBody.appendChild(tr);
  });

  exampleSummaryEl.textContent =
    `Summed token valence after adjustments is ${explanation.sumValenceAmplified.toFixed(
      3
    )}, which normalizes to a compound score of ${explanation.compound.toFixed(4)}. ` +
    `Positive, neutral, and negative proportions are ${explanation.pos.toFixed(4)}, ` +
    `${explanation.neu.toFixed(4)}, and ${explanation.neg.toFixed(4)}, respectively.`;
}

document.addEventListener('DOMContentLoaded', () => {
  const createdLabel = document.getElementById('created-date');
  const modifiedLabel = document.getElementById('modified-date');
  if (createdLabel) createdLabel.textContent = SENTIMENT_LAB_CREATED_DATE;
  if (modifiedLabel) modifiedLabel.textContent = sentimentLabModifiedDate;

  const dropConfig = {
    dropzoneId: 'sentiment-dropzone',
    inputId: 'sentiment-file-input',
    browseId: 'sentiment-browse-btn',
    accept: '.csv,.tsv,.txt',
    onFile: file => {
      const status = document.getElementById('sentiment-status');
      if (status) status.textContent = `Loading ${file.name}...`;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result != null ? String(reader.result) : '';
        const parsed = parseDelimitedText(text);
        window._sentimentFileData = parsed;

        const select = document.getElementById('text-column-select');
        if (select) {
          select.innerHTML = '';
          if (!parsed.headers.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '(No headers found)';
            select.appendChild(opt);
          } else {
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = 'Choose a text column';
            select.appendChild(defaultOpt);
            parsed.headers.forEach(name => {
              const opt = document.createElement('option');
              opt.value = name;
              opt.textContent = name;
              select.appendChild(opt);
            });
          }
        }

        if (status) status.textContent = `Loaded ${parsed.rows.length} row(s) from ${file.name}. Choose a text column and click "Run sentiment analysis".`;
      };
      reader.onerror = () => {
        const status = document.getElementById('sentiment-status');
        if (status) status.textContent = 'There was an error reading the file.';
      };
      reader.readAsText(file);
    }
  };

  if (window.UIUtils && typeof window.UIUtils.initDropzone === 'function') {
    window.UIUtils.initDropzone(dropConfig);
  }

  const runBtn = document.getElementById('run-sentiment-btn');
  if (runBtn) {
    runBtn.addEventListener('click', event => {
      event.preventDefault();
      runSentimentAnalysis();
    });
  }

  const scenarioSelect = document.getElementById('sentiment-scenario-select');
  const downloadBtn = document.getElementById('scenario-download');
  
  // Fetch scenario index
  async function fetchScenarioIndex() {
    try {
      const resp = await fetch('scenarios/scenario-index.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`Unable to load scenario index (${resp.status})`);
      const data = await resp.json();
      scenarioManifest = Array.isArray(data) ? data : [];
      populateScenarioSelect();
    } catch (err) {
      console.error('Error loading scenario index:', err);
      scenarioManifest = [];
    }
  }

  function populateScenarioSelect() {
    if (!scenarioSelect) return;
    scenarioSelect.innerHTML = '<option value="">Manual settings (no preset)</option>';
    scenarioManifest.forEach(entry => {
      const opt = document.createElement('option');
      opt.value = entry.id;
      opt.textContent = entry.label || entry.id;
      scenarioSelect.appendChild(opt);
    });
  }

  async function loadScenario(id) {
    const scenario = scenarioManifest.find(s => s.id === id);
    if (!scenario) return;

    // Handle download button
    if (downloadBtn) {
      activeScenarioDataset = scenario.dataset || null;
      downloadBtn.classList.toggle('hidden', !scenario.dataset);
      downloadBtn.disabled = !scenario.dataset;
    }

    // Load description
    const descEl = document.getElementById('sentiment-scenario-description');
    if (scenario.file) {
      try {
        const resp = await fetch(scenario.file, { cache: 'no-cache' });
        if (resp.ok) {
          const text = await resp.text();
          if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
            window.UIUtils.renderScenarioDescription({
              containerId: 'sentiment-scenario-description',
              description: `<p>${text.split('\n\n').join('</p><p>')}</p>`,
              defaultHtml: ''
            });
          } else if (descEl) {
            descEl.innerHTML = `<p>${text.split('\n\n').join('</p><p>')}</p>`;
          }
        }
      } catch (err) {
        console.error('Error loading scenario description:', err);
      }
    }

    // Load dataset into textarea
    const manual = document.getElementById('manual-textarea');
    const status = document.getElementById('sentiment-status');
    
    if (scenario.dataset && manual) {
      try {
        const resp = await fetch(scenario.dataset, { cache: 'no-cache' });
        if (resp.ok) {
          const csv = await resp.text();
          // Parse CSV to get just the text column values
          const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
          // Skip header row and extract text (handle quoted values)
          const textLines = lines.slice(1).map(line => {
            // Simple CSV parsing: if starts with quote, extract quoted value
            if (line.startsWith('"')) {
              const match = line.match(/^"((?:[^"]|"")*)"/);
              return match ? match[1].replace(/""/g, '"') : line;
            }
            return line;
          });
          
          manual.value = textLines.join('\n');
          
          if (status) {
            status.textContent = `Loaded ${textLines.length} preset text record(s) into the paste area. Click "Run sentiment analysis" to score them.`;
          }
        }
      } catch (err) {
        console.error('Error loading scenario dataset:', err);
        if (status) {
          status.textContent = 'Error loading scenario data.';
        }
      }
    }
  }
  
  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', () => {
      const id = scenarioSelect.value;
      const descEl = document.getElementById('sentiment-scenario-description');

      if (!id) {
        activeScenarioDataset = null;
        if (downloadBtn) {
          downloadBtn.classList.add('hidden');
          downloadBtn.disabled = true;
        }
        
        if (window.UIUtils && typeof window.UIUtils.renderScenarioDescription === 'function') {
          window.UIUtils.renderScenarioDescription({
            containerId: 'sentiment-scenario-description',
            defaultHtml:
              '<p>Use these case studies to practice reading sentiment outputs before uploading your own data. Presets include simulated Reddit-style posts and detailed reviews of a new influencer swimwear brand.</p>'
          });
        } else if (descEl) {
          descEl.innerHTML =
            '<p>Use these case studies to practice reading sentiment outputs before uploading your own data. Presets include simulated Reddit-style posts and detailed reviews of a new influencer swimwear brand.</p>';
        }
        return;
      }

      loadScenario(id);
    });
    
    // Load scenarios on init
    fetchScenarioIndex();
  }

  // Download button handler
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!activeScenarioDataset) return;
      
      // Download the actual CSV file
      const a = document.createElement('a');
      a.href = activeScenarioDataset;
      a.download = activeScenarioDataset.split('/').pop() || 'sentiment_data.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
});
