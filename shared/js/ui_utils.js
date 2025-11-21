/**
 * Initialize a dropzone + browse button pair for CSV/TSV uploads.
 * Ensures consistent drag/drop, browse click handling, and file-change clearing.
 *
 * @param {object} config
 * @param {string} config.dropzoneId - Element id for the drop zone wrapper.
 * @param {string} config.inputId - Hidden file input id.
 * @param {string} config.browseId - Button that opens the file picker (can be null).
 * @param {string} [config.accept=".csv,.tsv,.txt"] - Accept attribute string.
 * @param {(file: File) => void} config.onFile - Callback once a file is selected.
 * @param {(message: string) => void} [config.onError] - Optional status handler.
 */
function initDropzone({
  dropzoneId,
  inputId,
  browseId,
  accept = '.csv,.tsv,.txt',
  onFile,
  onError
}) {
  const dropzone = document.getElementById(dropzoneId);
  const input = document.getElementById(inputId);
  const browse = browseId ? document.getElementById(browseId) : null;
  if (!dropzone || !input || typeof onFile !== 'function') {
    return;
  }

  input.accept = accept;
  const clearInput = () => {
    input.value = '';
  };

  const handleFile = file => {
    if (!file) return;
    onFile(file);
  };

  const handleDrop = event => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    handleFile(file);
  };

  const handleBrowse = () => {
    input.click();
  };

  dropzone.addEventListener('dragover', event => {
    event.preventDefault();
    dropzone.classList.add('drag-active');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-active');
  });
  dropzone.addEventListener('drop', event => {
    dropzone.classList.remove('drag-active');
    handleDrop(event);
  });
  dropzone.addEventListener('click', event => {
    if (browse && browse.contains(event.target)) {
      return;
    }
    handleBrowse();
  });
  dropzone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleBrowse();
    }
  });

  if (browse) {
    browse.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      handleBrowse();
    });
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    handleFile(file);
    clearInput();
  });
}

function escapeHtmlValue(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render a scenario description into a container, supporting sanitized HTML.
 *
 * If the description string contains HTML tags, it is assumed to be sanitized markup
 * and is injected directly (optionally preceded by a bold title). Otherwise, it is
 * treated as plain text and split into paragraphs.
 *
 * @param {object} params
 * @param {string} params.containerId - Element id where the description should be rendered.
 * @param {string} [params.title] - Optional scenario title.
 * @param {string} [params.description] - Scenario body text or HTML.
 * @param {string} [params.defaultHtml] - Default HTML to use when description is empty.
 */
function renderScenarioDescription({ containerId, title, description, defaultHtml }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!description) {
    if (defaultHtml != null) container.innerHTML = defaultHtml;
    return;
  }

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(description);
  const heading = title ? `<p><strong>${escapeHtmlValue(title)}</strong></p>` : '';

  if (hasHtml) {
    container.innerHTML = heading + description.trim();
    return;
  }

  const paragraphs = description
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  const content = paragraphs.length
    ? paragraphs.map(text => `<p>${escapeHtmlValue(text)}</p>`).join('')
    : `<p>${escapeHtmlValue(description)}</p>`;

  container.innerHTML = heading + content;
}

window.UIUtils = window.UIUtils || {};
window.UIUtils.initDropzone = initDropzone;
window.UIUtils.renderScenarioDescription = renderScenarioDescription;
