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

window.UIUtils = window.UIUtils || {};
window.UIUtils.initDropzone = initDropzone;
