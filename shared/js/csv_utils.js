// Shared CSV utilities for all tools

// How many data rows (observations) any single upload is allowed to contain.
// Other apps can reuse this constant.
const MAX_UPLOAD_ROWS = 5000;

function detectDelimiter(line) {
    if (line.includes('\t')) return '\t';
    return ',';
}

/**
 * Detect columns that look like row/record identifiers (every non-missing value is unique).
 *
 * @param {string[]} headers - Column headers.
 * @param {Array<object|Array>} rows - Parsed rows; either objects keyed by header or arrays aligned with headers.
 * @param {object} [options]
 * @param {number} [options.maxSampleRows=MAX_UPLOAD_ROWS] - Max rows to scan when checking uniqueness.
 * @returns {{header: string, index: number}[]} candidate ID-like columns.
 */
function detectIdLikeColumns(headers, rows, { maxSampleRows = MAX_UPLOAD_ROWS } = {}) {
    if (!Array.isArray(headers) || !Array.isArray(rows) || !rows.length) {
        return [];
    }
    const sampleSize = Math.min(rows.length, maxSampleRows);
    const valueSets = headers.map(() => new Set());
    const nonMissingCounts = headers.map(() => 0);

    for (let i = 0; i < sampleSize; i++) {
        const row = rows[i];
        for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            let value;
            if (Array.isArray(row)) {
                value = row[j];
            } else if (row && Object.prototype.hasOwnProperty.call(row, header)) {
                value = row[header];
            } else {
                value = undefined;
            }
            if (value === null || value === undefined || value === '') continue;
            nonMissingCounts[j]++;
            valueSets[j].add(String(value));
        }
    }

    const candidates = [];
    headers.forEach((header, index) => {
        if (nonMissingCounts[index] > 0 && valueSets[index].size === nonMissingCounts[index]) {
            candidates.push({ header, index });
        }
    });
    return candidates;
}

/**
 * Prompt the user if some rows will be dropped because of missing or invalid values.
 *
 * @param {object} params
 * @param {number} params.totalRows - Total number of non-empty rows read from the file.
 * @param {number} params.keptRows - Number of rows that will be used in the analysis.
 * @param {string} [params.contextLabel='observations'] - Label for the unit being counted (for messaging only).
 * @returns {boolean} true if the user chose to proceed (or no rows were dropped), false if they cancelled.
 */
function maybeConfirmDroppedRows({ totalRows, keptRows, contextLabel = 'observations' }) {
    const total = Number(totalRows) || 0;
    const kept = Number(keptRows) || 0;
    const dropped = total - kept;
    if (!total || dropped <= 0) {
        return true;
    }
    const message =
        `Detected ${dropped} ${contextLabel} with missing or invalid values. ` +
        `If you proceed, the analysis will use ${kept} of ${total} ${contextLabel}. ` +
        `Do you want to continue using only the complete observations?`;
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        return window.confirm(message);
    }
    return true;
}

/**
 * Parse a delimited text file (CSV or TSV) into headers + numeric rows.
 *
 * @param {string} text              Raw file contents.
 * @param {number|null} expectedColumns  If non-null, enforce this exact column count.
 * @param {object} options
 * @param {number} options.maxRows   Maximum number of rows to keep.
 *
 * @returns {{headers: string[], rows: number[][], errors: string[]}}
 * @throws Error with a user-facing message if parsing fails badly.
 */
function parseDelimitedText(text, expectedColumns = null, { maxRows = MAX_UPLOAD_ROWS } = {}) {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('File is empty.');
    }

    const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length);
    if (lines.length < 2) {
        throw new Error('File must include a header row and at least one data row.');
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.trim());

    if (expectedColumns !== null && headers.length !== expectedColumns) {
        throw new Error(`Expected ${expectedColumns} column(s) but found ${headers.length}.`);
    }
    if (expectedColumns === null && headers.length < 2) {
        throw new Error('Provide at least two columns with headers.');
    }

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map(part => part.trim());

        // Skip fully empty rows
        if (parts.every(part => part === '')) {
            continue;
        }

        if (parts.length !== headers.length) {
            errors.push(`Row ${i + 1}: wrong number of columns.`);
            continue;
        }

        const numericValues = parts.map(value => parseFloat(value));
        if (numericValues.some(value => !isFinite(value))) {
            errors.push(`Row ${i + 1}: non-numeric value detected.`);
            continue;
        }

        rows.push(numericValues);

        if (rows.length > maxRows) {
            throw new Error(
                `Upload limit exceeded: Only ${maxRows} row(s) are supported per file. ` +
                `Split the dataset before re-uploading.`
            );
        }
    }

    if (!rows.length) {
        throw new Error(errors.length ? errors[0] : 'No numeric rows found.');
    }

    return { headers, rows, errors };
}

/**
 * Trigger a download of a text/CSV file from the browser.
 *
 * @param {string} filename
 * @param {string} content
 * @param {object} options
 * @param {string} options.mimeType
 */
function downloadTextFile(filename, content, { mimeType = 'text/csv' } = {}) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
