/**
 * Basic Conjoint Analysis Tool — Pure JavaScript
 * Categorical-only MNL estimation, market simulation, brute-force optimization.
 */

(function () {
    'use strict';

    // ════════════════════════════════════════════════════════════════════
    // STATE
    // ════════════════════════════════════════════════════════════════════
    const STATE = {
        rawRows: [],           // parsed CSV rows (array of objects)
        headers: [],           // CSV column headers
        mapping: null,         // {respondent, task, alternative, chosen}
        attributes: {},        // {attrName: [level1, level2, ...]}
        respondentCoefs: {},   // {respondentId: {attrName__level: coef, ...}}
        respondentR2: {},      // {respondentId: pseudoR2}
        aggregated: null,      // [{attribute, level, mean, sd, min, max}]
        importance: null,      // [{attribute, importance}]
        estimationDone: false,
        scenarioMeta: null
    };

    const TOOL_SLUG = 'conjoint-basic';

    // ════════════════════════════════════════════════════════════════════
    // SCENARIOS
    // ════════════════════════════════════════════════════════════════════
    const SCENARIOS = {
        coffee_shop: {
            file: 'scenarios/coffee_shop_cbc.csv',
            title: 'Campus Coffee Shop Redesign',
            description: `<p>A university campus coffee shop is redesigning its menu and wants to understand which product attributes drive student preferences. They surveyed <strong>80 students</strong>, each evaluating <strong>10 choice tasks</strong> with <strong>3 alternatives</strong> per task.</p>
            <p><strong>Attributes:</strong> Roast (Light, Medium, Dark), Size (Small, Medium, Large), Milk Option (No Milk, Oat Milk, Whole Milk), Origin (Colombia, Ethiopia, Brazil)</p>
            <p><strong>Key question:</strong> Which combination of roast, size, milk, and origin would maximize student preference?</p>`,
            mapping: {respondent: 'respondent_id', task: 'task_id', alternative: 'alternative_id', chosen: 'chosen'}
        },
        streaming: {
            file: 'scenarios/streaming_cbc.csv',
            title: 'Music Streaming Service Launch',
            description: `<p>A startup is planning a new music streaming service and wants to understand which features matter most to potential subscribers. They surveyed <strong>100 people</strong>, each evaluating <strong>8 choice tasks</strong> with <strong>3 alternatives</strong>.</p>
            <p><strong>Attributes:</strong> Music Library (50M songs, 80M songs, 100M+ songs), Audio Quality (Standard, High-Fi, Lossless), Podcast Access (None, Limited, Full Library), Social Features (None, Shared Playlists, Live Listening), Price Tier (Free w/ Ads, $5.99/mo, $11.99/mo)</p>
            <p><strong>Key question:</strong> Which features justify a premium price tier?</p>`,
            mapping: {respondent: 'respondent_id', task: 'task_id', alternative: 'alternative_id', chosen: 'chosen'}
        },
        tshirt: {
            file: 'scenarios/tshirt_cbc.csv',
            title: 'Event T-Shirt Design for Brand Activation',
            description: `<p>A sportswear brand is designing limited-edition event t-shirts for a music festival sponsorship. They surveyed <strong>60 festival attendees</strong> to determine the most appealing product configuration across <strong>8 choice tasks</strong> with <strong>3 alternatives</strong> each.</p>
            <p><strong>Attributes:</strong> Color (Black, White, Tie-Dye), Fit (Slim, Regular, Oversized), Material (100% Cotton, Tri-Blend, Performance Mesh), Design Placement (Small Logo, Full Front, Back Print)</p>
            <p><strong>Key question:</strong> What t-shirt configuration will sell the most at the festival?</p>`,
            mapping: {respondent: 'respondent_id', task: 'task_id', alternative: 'alternative_id', chosen: 'chosen'}
        }
    };

    // ════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ════════════════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
        initEngagementTracking(TOOL_SLUG);
        initDropzone({
            dropzoneId: 'conjoint-dropzone',
            inputId: 'conjoint-input',
            browseId: 'conjoint-browse',
            onFile: handleFileUpload
        });
        bindEvents();
        updateWorkflowStep(1);
    });

    function bindEvents() {
        document.getElementById('scenario-select').addEventListener('change', handleScenarioChange);
        document.getElementById('scenario-download').addEventListener('click', handleScenarioDownload);
        document.getElementById('conjoint-template-download').addEventListener('click', downloadTemplate);
        document.getElementById('conjoint-confirm-mapping').addEventListener('click', confirmMapping);
        document.getElementById('conjoint-estimate-model').addEventListener('click', runEstimation);
        document.getElementById('conjoint-add-product').addEventListener('click', addProductCard);
        document.getElementById('conjoint-clear-scenario').addEventListener('click', clearSimulation);
        document.getElementById('conjoint-run-simulation').addEventListener('click', runSimulation);
        document.getElementById('conjoint-run-optimization').addEventListener('click', runOptimization);
        document.getElementById('conjoint-download-utilities').addEventListener('click', downloadUtilities);
        document.getElementById('conjoint-download-simulation').addEventListener('click', downloadSimulationResults);
    }

    // ════════════════════════════════════════════════════════════════════
    // CSV PARSING (lightweight — mixed text + numeric columns)
    // ════════════════════════════════════════════════════════════════════
    function parseCSVText(text) {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) throw new Error('File must include a header row and at least one data row.');
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim());
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(delimiter).map(p => p.trim());
            if (parts.every(p => p === '')) continue;
            if (parts.length !== headers.length) continue;
            const row = {};
            headers.forEach((h, idx) => { row[h] = parts[idx]; });
            rows.push(row);
        }
        return { headers, rows };
    }

    // ════════════════════════════════════════════════════════════════════
    // FILE UPLOAD
    // ════════════════════════════════════════════════════════════════════
    function handleFileUpload(file) {
        const feedback = document.getElementById('conjoint-upload-feedback');
        feedback.textContent = 'Reading file...';
        feedback.className = 'upload-status';

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const { headers, rows } = parseCSVText(e.target.result);
                if (rows.length === 0) throw new Error('No data rows found.');
                STATE.headers = headers;
                STATE.rawRows = rows;
                feedback.textContent = `Loaded ${rows.length} rows, ${headers.length} columns.`;
                feedback.className = 'upload-status success';
                markDataUploaded(file.name);
                showColumnMapping();
            } catch (err) {
                feedback.textContent = err.message;
                feedback.className = 'upload-status error';
            }
        };
        reader.readAsText(file);
    }

    // ════════════════════════════════════════════════════════════════════
    // SCENARIOS
    // ════════════════════════════════════════════════════════════════════
    function handleScenarioChange() {
        const sel = document.getElementById('scenario-select');
        const btn = document.getElementById('scenario-download');
        const descEl = document.getElementById('scenario-description');
        const key = sel.value;

        if (!key) {
            btn.classList.add('hidden');
            btn.disabled = true;
            descEl.innerHTML = '<p>Select a preset to auto-load realistic CBC study data, or upload your own CSV below.</p>';
            return;
        }

        const sc = SCENARIOS[key];
        btn.classList.remove('hidden');
        btn.disabled = false;
        renderScenarioDescription({
            containerId: 'scenario-description',
            title: sc.title,
            description: sc.description
        });

        // Auto-load the scenario CSV
        const feedback = document.getElementById('conjoint-upload-feedback');
        feedback.textContent = 'Loading scenario data...';
        feedback.className = 'upload-status';

        fetch(sc.file)
            .then(r => { if (!r.ok) throw new Error('Failed to fetch scenario file.'); return r.text(); })
            .then(text => {
                const { headers, rows } = parseCSVText(text);
                STATE.headers = headers;
                STATE.rawRows = rows;
                STATE.scenarioMeta = sc;
                feedback.textContent = `Loaded "${sc.title}": ${rows.length} rows, ${headers.length} columns.`;
                feedback.className = 'upload-status success';
                markScenarioLoaded(sc.title);
                showColumnMapping();
                // Auto-apply known mapping
                if (sc.mapping) {
                    autoApplyMapping(sc.mapping);
                }
            })
            .catch(err => {
                feedback.textContent = err.message;
                feedback.className = 'upload-status error';
            });
    }

    function handleScenarioDownload() {
        const key = document.getElementById('scenario-select').value;
        if (!key || !SCENARIOS[key]) return;
        fetch(SCENARIOS[key].file)
            .then(r => r.text())
            .then(text => downloadTextFile(`${key}_cbc.csv`, text));
    }

    function autoApplyMapping(mapping) {
        const setSelect = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            for (const opt of el.options) {
                if (opt.value === val) { el.value = val; return; }
            }
        };
        setSelect('conjoint-respondent-col', mapping.respondent);
        setSelect('conjoint-task-col', mapping.task);
        setSelect('conjoint-alternative-col', mapping.alternative);
        setSelect('conjoint-chosen-col', mapping.chosen);
        // Auto-confirm
        confirmMapping();
    }

    // ════════════════════════════════════════════════════════════════════
    // COLUMN MAPPING
    // ════════════════════════════════════════════════════════════════════
    function showColumnMapping() {
        const container = document.getElementById('conjoint-column-mapping');
        container.style.display = '';
        const ids = ['conjoint-respondent-col', 'conjoint-task-col', 'conjoint-alternative-col', 'conjoint-chosen-col'];
        ids.forEach(id => {
            const sel = document.getElementById(id);
            sel.innerHTML = STATE.headers.map(h => `<option value="${h}">${h}</option>`).join('');
        });
        // Smart defaults
        const lower = STATE.headers.map(h => h.toLowerCase());
        const guesses = [
            { id: 'conjoint-respondent-col', patterns: ['respondent_id', 'respondent', 'resp_id', 'rid'] },
            { id: 'conjoint-task-col', patterns: ['task_id', 'task', 'question', 'choice_set'] },
            { id: 'conjoint-alternative-col', patterns: ['alternative_id', 'alt_id', 'alternative', 'option', 'concept'] },
            { id: 'conjoint-chosen-col', patterns: ['chosen', 'choice', 'selected', 'response'] }
        ];
        guesses.forEach(g => {
            for (const p of g.patterns) {
                const idx = lower.indexOf(p);
                if (idx !== -1) { document.getElementById(g.id).value = STATE.headers[idx]; break; }
            }
        });
        updateWorkflowStep(1);
    }

    function confirmMapping() {
        const respondent = document.getElementById('conjoint-respondent-col').value;
        const task = document.getElementById('conjoint-task-col').value;
        const alternative = document.getElementById('conjoint-alternative-col').value;
        const chosen = document.getElementById('conjoint-chosen-col').value;

        // Validate uniqueness
        const cols = [respondent, task, alternative, chosen];
        if (new Set(cols).size !== 4) {
            alert('Each mapping must use a different column. Please check your selections.');
            return;
        }

        STATE.mapping = { respondent, task, alternative, chosen };

        // Detect attributes = all columns not in mapping
        const reserved = new Set(cols);
        STATE.attributes = {};
        const attrCols = STATE.headers.filter(h => !reserved.has(h));
        attrCols.forEach(col => {
            const levels = [...new Set(STATE.rawRows.map(r => r[col]).filter(v => v !== '' && v != null))];
            levels.sort();
            STATE.attributes[col] = levels;
        });

        showAttributeConfirmation();
        updateWorkflowStep(2);
    }

    function showAttributeConfirmation() {
        const container = document.getElementById('conjoint-attribute-config');
        container.style.display = '';
        const list = document.getElementById('conjoint-attribute-list');
        list.innerHTML = '';

        for (const [attr, levels] of Object.entries(STATE.attributes)) {
            const item = document.createElement('div');
            item.className = 'attribute-confirm-item';
            item.innerHTML = `
                <h4>${attr} <span style="color:#6b7280; font-weight:400;">(${levels.length} levels)</span></h4>
                <ul class="attribute-levels-list">
                    ${levels.map((l, i) => `<li class="attribute-level-tag${i === 0 ? ' reference' : ''}">${l}${i === 0 ? ' (ref)' : ''}</li>`).join('')}
                </ul>
            `;
            list.appendChild(item);
        }

        // Show estimation controls
        document.getElementById('conjoint-estimation-controls').style.display = '';
    }

    // ════════════════════════════════════════════════════════════════════
    // MNL ESTIMATION ENGINE (Pure JavaScript)
    // ════════════════════════════════════════════════════════════════════

    /**
     * Build dummy-coded design matrix for one respondent's tasks.
     * Returns { X: 2D array, y: 1D array (chosen indices), taskSizes: [] }
     */
    function buildDesignMatrix(rows, attributes) {
        // Create coefficient name list: attr__level for all non-reference levels
        const coefNames = [];
        for (const [attr, levels] of Object.entries(attributes)) {
            for (let i = 1; i < levels.length; i++) {
                coefNames.push(`${attr}__${levels[i]}`);
            }
        }
        const nCoefs = coefNames.length;

        // Group rows by task
        const taskMap = {};
        rows.forEach(r => {
            const tid = r.__task;
            if (!taskMap[tid]) taskMap[tid] = [];
            taskMap[tid].push(r);
        });

        const X = [];
        const chosenIdx = [];
        const taskSizes = [];

        for (const tid of Object.keys(taskMap)) {
            const taskRows = taskMap[tid];
            const size = taskRows.length;
            taskSizes.push(size);
            let foundChosen = -1;
            taskRows.forEach((r, altIdx) => {
                const row = new Array(nCoefs).fill(0);
                for (const [attr, levels] of Object.entries(attributes)) {
                    const val = r[attr];
                    for (let i = 1; i < levels.length; i++) {
                        if (val === levels[i]) {
                            const coefIdx = coefNames.indexOf(`${attr}__${levels[i]}`);
                            row[coefIdx] = 1;
                        }
                    }
                }
                X.push(row);
                if (parseInt(r.__chosen) === 1) foundChosen = altIdx;
            });
            chosenIdx.push(foundChosen >= 0 ? foundChosen : 0);
        }

        return { X, chosenIdx, taskSizes, coefNames };
    }

    /**
     * Compute log-likelihood, gradient, and optionally Hessian for MNL.
     */
    function mnlLogLikGrad(beta, X, chosenIdx, taskSizes, lambda) {
        const nCoefs = beta.length;
        let ll = 0;
        const grad = new Array(nCoefs).fill(0);
        let rowPtr = 0;

        for (let t = 0; t < taskSizes.length; t++) {
            const size = taskSizes[t];
            const chosen = chosenIdx[t];

            // Compute utilities
            const utils = [];
            for (let j = 0; j < size; j++) {
                let u = 0;
                for (let k = 0; k < nCoefs; k++) {
                    u += beta[k] * X[rowPtr + j][k];
                }
                utils.push(u);
            }

            // Softmax
            const maxU = Math.max(...utils);
            const expU = utils.map(u => Math.exp(u - maxU));
            const sumExp = expU.reduce((a, b) => a + b, 0);
            const probs = expU.map(e => e / sumExp);

            // Log-likelihood
            ll += Math.log(Math.max(probs[chosen], 1e-300));

            // Gradient
            for (let j = 0; j < size; j++) {
                const indicator = j === chosen ? 1 : 0;
                const diff = indicator - probs[j];
                for (let k = 0; k < nCoefs; k++) {
                    grad[k] += diff * X[rowPtr + j][k];
                }
            }

            rowPtr += size;
        }

        // L2 regularization
        for (let k = 0; k < nCoefs; k++) {
            ll -= lambda * beta[k] * beta[k];
            grad[k] -= 2 * lambda * beta[k];
        }

        return { ll, grad };
    }

    /**
     * Null model log-likelihood (equal probability).
     */
    function nullLogLik(taskSizes) {
        let ll = 0;
        for (const size of taskSizes) {
            ll += Math.log(1 / size);
        }
        return ll;
    }

    /**
     * L-BFGS optimizer for MNL.
     * Minimizes -LL (we want to maximize LL).
     */
    function lbfgsOptimize(X, chosenIdx, taskSizes, lambda, nCoefs, maxIter = 200, m = 5) {
        let beta = new Array(nCoefs).fill(0);
        const sHistory = [];
        const yHistory = [];
        let prevGrad = null;

        for (let iter = 0; iter < maxIter; iter++) {
            const { ll, grad } = mnlLogLikGrad(beta, X, chosenIdx, taskSizes, lambda);

            // Negate for minimization
            const negGrad = grad.map(g => -g);

            // Check convergence
            const gradNorm = Math.sqrt(negGrad.reduce((s, g) => s + g * g, 0));
            if (gradNorm < 1e-6) break;

            // L-BFGS two-loop recursion
            let dir = negGrad.slice();

            if (sHistory.length > 0) {
                const alphas = [];
                for (let i = sHistory.length - 1; i >= 0; i--) {
                    const rho = 1.0 / dotProduct(yHistory[i], sHistory[i]);
                    const alpha = rho * dotProduct(sHistory[i], dir);
                    alphas.unshift(alpha);
                    for (let k = 0; k < nCoefs; k++) {
                        dir[k] -= alpha * yHistory[i][k];
                    }
                }

                // Scale
                const lastS = sHistory[sHistory.length - 1];
                const lastY = yHistory[yHistory.length - 1];
                const gamma = dotProduct(lastS, lastY) / dotProduct(lastY, lastY);
                for (let k = 0; k < nCoefs; k++) dir[k] *= gamma;

                for (let i = 0; i < sHistory.length; i++) {
                    const rho = 1.0 / dotProduct(yHistory[i], sHistory[i]);
                    const betaK = rho * dotProduct(yHistory[i], dir);
                    for (let k = 0; k < nCoefs; k++) {
                        dir[k] += (alphas[i] - betaK) * sHistory[i][k];
                    }
                }
            }

            // Negate direction (we want to go downhill in -LL)
            for (let k = 0; k < nCoefs; k++) dir[k] = -dir[k];

            // Line search (backtracking)
            let step = 1.0;
            const c1 = 1e-4;
            const dirDotGrad = dotProduct(dir, negGrad);

            for (let ls = 0; ls < 20; ls++) {
                const newBeta = beta.map((b, k) => b + step * dir[k]);
                const { ll: newLL } = mnlLogLikGrad(newBeta, X, chosenIdx, taskSizes, lambda);
                const newNegLL = -newLL;
                const curNegLL = -ll;
                if (newNegLL <= curNegLL + c1 * step * dirDotGrad) {
                    // Update s, y history
                    const s = newBeta.map((b, k) => b - beta[k]);
                    const { grad: newGrad } = mnlLogLikGrad(newBeta, X, chosenIdx, taskSizes, lambda);
                    const newNegGrad = newGrad.map(g => -g);
                    const y = newNegGrad.map((g, k) => g - negGrad[k]);

                    if (dotProduct(s, y) > 1e-10) {
                        sHistory.push(s);
                        yHistory.push(y);
                        if (sHistory.length > m) { sHistory.shift(); yHistory.shift(); }
                    }

                    beta = newBeta;
                    break;
                }
                step *= 0.5;
            }
        }

        return beta;
    }

    function dotProduct(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i++) s += a[i] * b[i];
        return s;
    }

    // ════════════════════════════════════════════════════════════════════
    // ESTIMATION RUNNER
    // ════════════════════════════════════════════════════════════════════
    function runEstimation() {
        if (!STATE.mapping || !STATE.rawRows.length) {
            alert('Please upload data and confirm column mapping first.');
            return;
        }

        markRunAttempted();
        const lambda = parseFloat(document.getElementById('conjoint-regularization').value) || 1.0;

        // Show loading
        const overlay = document.getElementById('conjoint-loading-overlay');
        overlay.setAttribute('aria-hidden', 'false');
        document.getElementById('loading-progress-text').textContent = 'Preparing data...';

        // Group rows by respondent
        const respondentMap = {};
        STATE.rawRows.forEach(r => {
            const rid = r[STATE.mapping.respondent];
            if (!respondentMap[rid]) respondentMap[rid] = [];
            respondentMap[rid].push({
                __task: r[STATE.mapping.task],
                __alt: r[STATE.mapping.alternative],
                __chosen: r[STATE.mapping.chosen],
                ...Object.fromEntries(Object.keys(STATE.attributes).map(a => [a, r[a]]))
            });
        });

        const respondentIds = Object.keys(respondentMap);
        const nRespondents = respondentIds.length;
        document.getElementById('loading-respondents').innerHTML = `Respondents: <strong>${nRespondents}</strong>`;

        // Use setTimeout to avoid blocking UI
        setTimeout(() => {
            const startTime = performance.now();
            STATE.respondentCoefs = {};
            STATE.respondentR2 = {};
            let totalTasks = 0;

            for (let ri = 0; ri < respondentIds.length; ri++) {
                const rid = respondentIds[ri];
                const rows = respondentMap[rid];
                const { X, chosenIdx, taskSizes, coefNames } = buildDesignMatrix(rows, STATE.attributes);

                totalTasks += taskSizes.length;

                if (ri % 10 === 0) {
                    document.getElementById('loading-progress-text').textContent =
                        `Estimating respondent ${ri + 1} of ${nRespondents}...`;
                }

                const beta = lbfgsOptimize(X, chosenIdx, taskSizes, lambda, coefNames.length);

                // Store coefficients
                const coefs = {};
                coefNames.forEach((name, idx) => { coefs[name] = beta[idx]; });
                STATE.respondentCoefs[rid] = coefs;

                // Pseudo-R²
                const { ll: modelLL } = mnlLogLikGrad(beta, X, chosenIdx, taskSizes, lambda);
                // Recalculate LL without penalty for R²
                const { ll: modelLLnoPen } = mnlLogLikGrad(beta, X, chosenIdx, taskSizes, 0);
                const nullLL = nullLogLik(taskSizes);
                const r2 = 1 - (modelLLnoPen / nullLL);
                STATE.respondentR2[rid] = r2;
            }

            const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
            STATE.estimationDone = true;

            // Aggregate results
            aggregateResults();

            // Update UI
            overlay.setAttribute('aria-hidden', 'true');
            document.getElementById('conjoint-n-respondents').textContent = nRespondents;
            document.getElementById('conjoint-mean-tasks').textContent = (totalTasks / nRespondents).toFixed(1);
            const r2vals = Object.values(STATE.respondentR2);
            const meanR2 = (r2vals.reduce((a, b) => a + b, 0) / r2vals.length);
            document.getElementById('conjoint-mean-r2').textContent = meanR2.toFixed(3);
            document.getElementById('conjoint-estimation-time').textContent = `${elapsed}s`;

            // Show results sections
            document.getElementById('tut-visual-output-section').style.display = '';
            document.getElementById('tut-model-results-section').style.display = '';
            document.getElementById('tut-simulation-section').style.display = '';
            document.getElementById('tut-optimization-section').style.display = '';

            renderResults();
            populateSimulationUI();
            populateOptimizationUI();
            updateWorkflowStep(3);

            // Reports
            generateReports(nRespondents, totalTasks / nRespondents, meanR2);

            // Tracking
            markRunSuccessful(
                { nRespondents, lambda, nAttributes: Object.keys(STATE.attributes).length },
                `Estimated ${nRespondents} respondents, pseudo-R²=${meanR2.toFixed(3)}`
            );

            logToolUsage(TOOL_SLUG, {
                n_respondents: nRespondents,
                n_attributes: Object.keys(STATE.attributes).length,
                lambda: lambda,
                mean_r2: meanR2.toFixed(3)
            }, `Estimation complete: ${nRespondents} respondents, R²=${meanR2.toFixed(3)}`, {
                scenario: STATE.scenarioMeta?.title || null,
                dataSource: STATE.scenarioMeta ? 'scenario' : 'upload'
            });

        }, 50);
    }

    // ════════════════════════════════════════════════════════════════════
    // AGGREGATE & IMPORTANCE
    // ════════════════════════════════════════════════════════════════════
    function aggregateResults() {
        const allCoefNames = [];
        for (const [attr, levels] of Object.entries(STATE.attributes)) {
            // Reference level
            allCoefNames.push({ attr, level: levels[0], key: null });
            for (let i = 1; i < levels.length; i++) {
                allCoefNames.push({ attr, level: levels[i], key: `${attr}__${levels[i]}` });
            }
        }

        const respondentIds = Object.keys(STATE.respondentCoefs);
        const aggregated = allCoefNames.map(({ attr, level, key }) => {
            const values = respondentIds.map(rid => key ? (STATE.respondentCoefs[rid][key] || 0) : 0);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
            return {
                attribute: attr, level, mean, sd,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });
        STATE.aggregated = aggregated;

        // Attribute importance
        const attrRanges = {};
        for (const attr of Object.keys(STATE.attributes)) {
            const means = aggregated.filter(a => a.attribute === attr).map(a => a.mean);
            attrRanges[attr] = Math.max(...means) - Math.min(...means);
        }
        const totalRange = Object.values(attrRanges).reduce((a, b) => a + b, 0);
        STATE.importance = Object.entries(attrRanges).map(([attr, range]) => ({
            attribute: attr,
            importance: totalRange > 0 ? (range / totalRange * 100) : 0
        })).sort((a, b) => b.importance - a.importance);
    }

    // ════════════════════════════════════════════════════════════════════
    // RENDER CHARTS & TABLES
    // ════════════════════════════════════════════════════════════════════
    function renderResults() {
        renderImportanceChart();
        renderPartWorthChart();
        renderUtilitiesTable();
    }

    function renderImportanceChart() {
        const imp = STATE.importance;
        const trace = {
            x: imp.map(i => i.attribute),
            y: imp.map(i => i.importance),
            type: 'bar',
            marker: { color: '#2a7de1' },
            text: imp.map(i => i.importance.toFixed(1) + '%'),
            textposition: 'outside'
        };
        Plotly.newPlot('chart-importance', [trace], {
            title: 'Attribute Importance (%)',
            yaxis: { title: 'Importance (%)', range: [0, Math.max(...imp.map(i => i.importance)) * 1.2] },
            xaxis: { title: '' },
            margin: { t: 50, b: 80 }
        }, { responsive: true });
    }

    function renderPartWorthChart() {
        const agg = STATE.aggregated;
        const attrs = Object.keys(STATE.attributes);
        const colors = ['#2a7de1', '#28a745', '#ff6b35', '#7c3aed', '#e74c3c', '#17a2b8', '#ffc107', '#6f42c1'];

        const traces = attrs.map((attr, idx) => {
            const items = agg.filter(a => a.attribute === attr);
            return {
                name: attr,
                x: items.map(i => `${i.level}`),
                y: items.map(i => i.mean),
                error_y: { type: 'data', array: items.map(i => i.sd), visible: true },
                type: 'bar',
                marker: { color: colors[idx % colors.length] }
            };
        });

        Plotly.newPlot('chart-partworths', traces, {
            title: 'Part-Worth Utilities by Attribute Level',
            yaxis: { title: 'Mean Utility', zeroline: true },
            xaxis: { title: '' },
            barmode: 'group',
            margin: { t: 50, b: 100 },
            legend: { orientation: 'h', y: -0.25 }
        }, { responsive: true });
    }

    function renderUtilitiesTable() {
        const tbody = document.getElementById('conjoint-utilities-table-body');
        tbody.innerHTML = '';
        let prevAttr = '';
        STATE.aggregated.forEach(row => {
            const tr = document.createElement('tr');
            const showAttr = row.attribute !== prevAttr;
            prevAttr = row.attribute;
            tr.innerHTML = `
                <td>${showAttr ? `<strong>${row.attribute}</strong>` : ''}</td>
                <td>${row.level}</td>
                <td class="mono">${row.mean.toFixed(3)}</td>
                <td class="mono">${row.sd.toFixed(3)}</td>
                <td class="mono">${row.min.toFixed(3)}</td>
                <td class="mono">${row.max.toFixed(3)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // REPORTS (APA + Managerial)
    // ════════════════════════════════════════════════════════════════════
    function generateReports(nResp, meanTasks, meanR2) {
        const topAttr = STATE.importance[0];
        const bottomAttr = STATE.importance[STATE.importance.length - 1];

        // Find best level per attribute
        const bestLevels = {};
        for (const attr of Object.keys(STATE.attributes)) {
            const items = STATE.aggregated.filter(a => a.attribute === attr);
            const best = items.reduce((a, b) => a.mean > b.mean ? a : b);
            bestLevels[attr] = best.level;
        }

        // APA Report
        const apa = document.getElementById('conjoint-apa-report');
        apa.innerHTML = `
            A choice-based conjoint analysis was conducted with <em>N</em> = ${nResp} respondents,
            each completing an average of ${meanTasks.toFixed(1)} choice tasks. Individual-level
            multinomial logit models with L2 regularization were estimated for all categorical attributes.
            The mean McFadden pseudo-<em>R</em><sup>2</sup> was ${meanR2.toFixed(3)}, indicating
            ${meanR2 > 0.3 ? 'good' : meanR2 > 0.2 ? 'acceptable' : 'modest'} model fit.
            <strong>${topAttr.attribute}</strong> was the most important attribute
            (${topAttr.importance.toFixed(1)}% relative importance), while
            <strong>${bottomAttr.attribute}</strong> was the least important
            (${bottomAttr.importance.toFixed(1)}%).
        `;

        // Managerial Report
        const mgmt = document.getElementById('conjoint-managerial-report');
        const bestConfig = Object.entries(bestLevels).map(([a, l]) => `${a}: <strong>${l}</strong>`).join(', ');
        mgmt.innerHTML = `
            <strong>What matters most to customers:</strong> ${topAttr.attribute} is the #1 driver of choice,
            accounting for ${topAttr.importance.toFixed(0)}% of what influences purchase decisions.
            ${bottomAttr.attribute} matters least (${bottomAttr.importance.toFixed(0)}%).<br><br>
            <strong>Optimal product configuration:</strong> Based on average preferences, the most appealing
            combination is: ${bestConfig}.<br><br>
            <strong>Recommendation:</strong> Focus product development and marketing messaging on
            ${topAttr.attribute} differentiation. Use the Market Simulation section below to test
            specific configurations against competitors and estimate market shares.
        `;
    }

    // ════════════════════════════════════════════════════════════════════
    // MARKET SIMULATION
    // ════════════════════════════════════════════════════════════════════
    let productCounter = 0;
    let lastSimResults = null;

    function populateSimulationUI() {
        document.getElementById('conjoint-products-list').innerHTML = '';
        productCounter = 0;
        addProductCard();
        addProductCard();
    }

    function addProductCard() {
        productCounter++;
        const container = document.getElementById('conjoint-products-list');
        const card = document.createElement('div');
        card.className = 'product-config-card';
        card.dataset.productId = productCounter;

        let bodyHTML = '';
        for (const [attr, levels] of Object.entries(STATE.attributes)) {
            bodyHTML += `
                <label>
                    <span style="font-weight:600;">${attr}</span>
                    <select class="prod-attr" data-attr="${attr}">
                        ${levels.map(l => `<option value="${l}">${l}</option>`).join('')}
                    </select>
                </label>
            `;
        }

        card.innerHTML = `
            <div class="product-config-header">
                <input type="text" class="prod-name" value="Product ${productCounter}" placeholder="Product name">
                <button type="button" class="remove-prod" title="Remove">&times;</button>
            </div>
            <div class="product-config-body">${bodyHTML}</div>
        `;

        card.querySelector('.remove-prod').addEventListener('click', () => card.remove());
        container.appendChild(card);
    }

    function clearSimulation() {
        document.getElementById('conjoint-products-list').innerHTML = '';
        document.getElementById('conjoint-simulation-results').style.display = 'none';
        productCounter = 0;
    }

    function getProductProfiles() {
        const cards = document.querySelectorAll('#conjoint-products-list .product-config-card');
        const products = [];
        cards.forEach(card => {
            const name = card.querySelector('.prod-name').value || 'Unnamed';
            const config = {};
            card.querySelectorAll('.prod-attr').forEach(sel => {
                config[sel.dataset.attr] = sel.value;
            });
            products.push({ name, config });
        });
        return products;
    }

    function computeUtility(coefs, config, attributes) {
        let u = 0;
        for (const [attr, levels] of Object.entries(attributes)) {
            const val = config[attr];
            for (let i = 1; i < levels.length; i++) {
                if (val === levels[i]) {
                    const key = `${attr}__${levels[i]}`;
                    u += coefs[key] || 0;
                }
            }
        }
        return u;
    }

    function runSimulation() {
        const products = getProductProfiles();
        if (products.length < 2) {
            document.getElementById('conjoint-simulation-status').textContent = 'Add at least 2 products to simulate.';
            document.getElementById('conjoint-simulation-status').className = 'upload-status error';
            return;
        }

        const marketSize = parseInt(document.getElementById('conjoint-market-size').value) || 10000;
        const respondentIds = Object.keys(STATE.respondentCoefs);

        // For each respondent, compute choice probabilities
        const shareAccum = new Array(products.length).fill(0);

        respondentIds.forEach(rid => {
            const coefs = STATE.respondentCoefs[rid];
            const utils = products.map(p => computeUtility(coefs, p.config, STATE.attributes));
            const maxU = Math.max(...utils);
            const expU = utils.map(u => Math.exp(u - maxU));
            const sumExp = expU.reduce((a, b) => a + b, 0);
            const probs = expU.map(e => e / sumExp);
            probs.forEach((p, i) => { shareAccum[i] += p; });
        });

        const shares = shareAccum.map(s => (s / respondentIds.length) * 100);
        lastSimResults = products.map((p, i) => ({
            name: p.name,
            share: shares[i],
            customers: Math.round(shares[i] / 100 * marketSize)
        }));

        // Render
        renderSimulationResults(lastSimResults, marketSize);
        document.getElementById('conjoint-simulation-results').style.display = '';
        document.getElementById('conjoint-simulation-status').textContent = '';
        updateWorkflowStep(4);

        logFeatureUsage(TOOL_SLUG, 'run_simulation', { nProducts: products.length });
    }

    function renderSimulationResults(results) {
        // Chart
        const trace = {
            x: results.map(r => r.name),
            y: results.map(r => r.share),
            type: 'bar',
            marker: { color: results.map((_, i) => ['#2a7de1', '#28a745', '#ff6b35', '#7c3aed', '#e74c3c', '#17a2b8'][i % 6]) },
            text: results.map(r => r.share.toFixed(1) + '%'),
            textposition: 'outside'
        };
        Plotly.newPlot('chart-sim-share', [trace], {
            title: 'Predicted Market Share (%)',
            yaxis: { title: 'Market Share (%)', range: [0, Math.max(...results.map(r => r.share)) * 1.3] },
            margin: { t: 50, b: 80 }
        }, { responsive: true });

        // Table
        const tbody = document.getElementById('conjoint-simulation-table-body');
        tbody.innerHTML = '';
        results.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${r.name}</strong></td>
                <td class="mono">${r.share.toFixed(1)}%</td>
                <td class="mono">${r.customers.toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // BRUTE-FORCE OPTIMIZATION
    // ════════════════════════════════════════════════════════════════════
    function populateOptimizationUI() {
        const container = document.getElementById('conjoint-optimize-attributes');
        container.innerHTML = '';
        for (const attr of Object.keys(STATE.attributes)) {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.5rem';
            label.innerHTML = `<input type="checkbox" value="${attr}" checked> ${attr} (${STATE.attributes[attr].length} levels)`;
            container.appendChild(label);
        }
    }

    function runOptimization() {
        const statusEl = document.getElementById('conjoint-optimization-status');

        // Get selected attributes
        const checkboxes = document.querySelectorAll('#conjoint-optimize-attributes input[type="checkbox"]:checked');
        const selectedAttrs = Array.from(checkboxes).map(cb => cb.value);

        if (selectedAttrs.length === 0) {
            statusEl.textContent = 'Select at least one attribute to optimize.';
            statusEl.className = 'upload-status error';
            return;
        }

        // Count total combinations
        let totalCombos = 1;
        selectedAttrs.forEach(attr => { totalCombos *= STATE.attributes[attr].length; });

        if (totalCombos > 100000) {
            statusEl.textContent = `Too many combinations (${totalCombos.toLocaleString()}). Deselect some attributes to reduce.`;
            statusEl.className = 'upload-status error';
            return;
        }

        statusEl.textContent = `Evaluating ${totalCombos.toLocaleString()} combinations...`;
        statusEl.className = 'upload-status';

        setTimeout(() => {
            // Generate all combinations
            const combos = generateCombinations(selectedAttrs);

            // Fixed attributes (use first level for non-selected)
            const fixedConfig = {};
            for (const [attr, levels] of Object.entries(STATE.attributes)) {
                if (!selectedAttrs.includes(attr)) {
                    fixedConfig[attr] = levels[0];
                }
            }

            // Evaluate each combo's share as a standalone product (vs. equal competitor)
            const respondentIds = Object.keys(STATE.respondentCoefs);
            const results = combos.map(combo => {
                const config = { ...fixedConfig, ...combo };

                // Compute average utility across respondents
                let avgUtil = 0;
                respondentIds.forEach(rid => {
                    const coefs = STATE.respondentCoefs[rid];
                    avgUtil += computeUtility(coefs, config, STATE.attributes);
                });
                avgUtil /= respondentIds.length;

                // Share = exp(avgUtil) / (exp(avgUtil) + exp(0)) as 1v1 against baseline
                const share = 100 * Math.exp(avgUtil) / (Math.exp(avgUtil) + 1);

                return { config: combo, fullConfig: config, share };
            });

            // Sort by share descending
            results.sort((a, b) => b.share - a.share);
            const top10 = results.slice(0, 10);

            // Render
            const tbody = document.getElementById('conjoint-optimization-table-body');
            tbody.innerHTML = '';
            top10.forEach((r, i) => {
                const configStr = Object.entries(r.config).map(([a, v]) => `${a}: ${v}`).join(', ');
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${i + 1}</td>
                    <td>${configStr}</td>
                    <td class="mono">${r.share.toFixed(1)}%</td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('conjoint-optimization-results').style.display = '';
            statusEl.textContent = `Evaluated ${totalCombos.toLocaleString()} combinations. Top 10 shown.`;
            statusEl.className = 'upload-status success';

            logFeatureUsage(TOOL_SLUG, 'run_optimization', {
                nAttributes: selectedAttrs.length,
                nCombinations: totalCombos
            });
        }, 50);
    }

    function generateCombinations(selectedAttrs) {
        const levels = selectedAttrs.map(a => STATE.attributes[a]);
        const combos = [];

        function recurse(depth, current) {
            if (depth === selectedAttrs.length) {
                combos.push({ ...current });
                return;
            }
            const attr = selectedAttrs[depth];
            for (const level of levels[depth]) {
                current[attr] = level;
                recurse(depth + 1, current);
            }
        }

        recurse(0, {});
        return combos;
    }

    // ════════════════════════════════════════════════════════════════════
    // DOWNLOADS
    // ════════════════════════════════════════════════════════════════════
    function downloadTemplate() {
        const csv = 'respondent_id,task_id,alternative_id,chosen,Attribute1,Attribute2,Attribute3\n' +
                    'R001,1,1,1,LevelA,LevelX,LevelP\n' +
                    'R001,1,2,0,LevelB,LevelY,LevelQ\n' +
                    'R001,1,3,0,LevelC,LevelX,LevelR\n';
        downloadTextFile('conjoint_basic_template.csv', csv);
    }

    function downloadUtilities() {
        if (!STATE.estimationDone) return;
        const respondentIds = Object.keys(STATE.respondentCoefs);
        const allKeys = new Set();
        respondentIds.forEach(rid => {
            Object.keys(STATE.respondentCoefs[rid]).forEach(k => allKeys.add(k));
        });
        const coefNames = [...allKeys].sort();
        const header = ['respondent_id', 'pseudo_r2', ...coefNames].join(',');
        const rows = respondentIds.map(rid => {
            const coefs = STATE.respondentCoefs[rid];
            const r2 = STATE.respondentR2[rid];
            return [rid, r2.toFixed(4), ...coefNames.map(k => (coefs[k] || 0).toFixed(4))].join(',');
        });
        downloadTextFile('individual_utilities.csv', [header, ...rows].join('\n'));
        logFeatureUsage(TOOL_SLUG, 'export_data', { type: 'individual_utilities' });
    }

    function downloadSimulationResults() {
        if (!lastSimResults) return;
        const header = 'Product,Market Share (%),Customer Count';
        const rows = lastSimResults.map(r => `${r.name},${r.share.toFixed(2)},${r.customers}`);
        downloadTextFile('simulation_results.csv', [header, ...rows].join('\n'));
        logFeatureUsage(TOOL_SLUG, 'export_data', { type: 'simulation_results' });
    }

    // ════════════════════════════════════════════════════════════════════
    // WORKFLOW STEPPER
    // ════════════════════════════════════════════════════════════════════
    function updateWorkflowStep(activeStep) {
        const steps = document.querySelectorAll('#conjoint-workflow-stepper .workflow-step');
        steps.forEach(step => {
            const n = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            if (n < activeStep) step.classList.add('completed');
            else if (n === activeStep) step.classList.add('active');
        });
    }

})();
