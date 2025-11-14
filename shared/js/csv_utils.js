// Shared CSV utilities for all tools

// How many rows any single upload is allowed to contain.
// Other apps can reuse this constant.
const MAX_UPLOAD_ROWS = 2000;

function detectDelimiter(line) {
    if (line.includes('\t')) return '\t';
    return ',';
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
