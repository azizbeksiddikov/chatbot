/**
 * Utility functions
 */

export function escapeHtml(text) {
  /** Escape HTML to prevent XSS attacks */
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function formatFileSize(bytes) {
  /** Format bytes to human-readable size (KB, MB, GB) */
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function getFileExtension(filename) {
  /** Extract file extension from filename */
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return "";
  return filename.substring(lastDot);
}

export function getBaseFileName(filename) {
  /** Get filename without extension */
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return filename.trim();
  return filename.substring(0, lastDot).trim();
}

export function setButtonLoading(button, loadingText, isLoading) {
  /** Set button loading state */
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    button.classList.add("loading");
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || loadingText;
    button.classList.remove("loading");
    delete button.dataset.originalText;
  }
}
