/**
 * File Uploader rendering functions
 * Pure rendering - receives container elements, no direct DOM access
 */

import {
  formatFileSize,
  getFileExtension,
  getBaseFileName,
  escapeHtml,
} from "../utils.js";

export function renderSelectedFiles(
  container,
  area,
  files,
  callbacks,
  validationChecker = null
) {
  if (!container || !area) return;

  // Preserve loading overlay
  const overlay = container.querySelector("#selected-files-loading-overlay");
  container.innerHTML = "";

  if (files.length === 0) {
    area.style.display = "none";
    return;
  }

  area.style.display = "block";

  files.forEach((fileObj, index) => {
    const fileItem = document.createElement("div");
    const isValid = validationChecker ? validationChecker(fileObj) : true;
    fileItem.className = isValid
      ? "selected-file-item"
      : "selected-file-item invalid-metadata";

    const metadataCount = Object.keys(fileObj.metadata).length;
    const fileSize = formatFileSize(fileObj.file.size);
    const originalExtension = getFileExtension(fileObj.file.name);
    const baseName = getBaseFileName(fileObj.custom_name);

    fileItem.innerHTML = `
      <div class="selected-file-info">
        <div class="selected-file-name-wrapper">
          <input 
            type="text" 
            class="selected-file-name-input" 
            value="${escapeHtml(baseName)}"
            data-file-index="${index}"
            placeholder="File name"
          />
          <span class="file-extension">${escapeHtml(originalExtension)}</span>
        </div>
        <span class="selected-file-size">${fileSize}</span>
      </div>
      <div class="selected-file-actions">
        <span class="metadata-badge">${metadataCount} metadata</span>
        <button class="action-btn" data-file-index="${index}" data-action="edit">Edit Metadata</button>
        <button class="primary-btn" data-file-index="${index}" data-action="upload">Upload</button>
        <button class="danger-btn" data-file-index="${index}" data-action="remove">×</button>
      </div>
    `;

    // Add event listeners
    const nameInput = fileItem.querySelector(".selected-file-name-input");
    nameInput.addEventListener("change", (e) => {
      callbacks.onFileNameChange(index, e.target.value);
    });

    fileItem.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        const idx = parseInt(btn.dataset.fileIndex);
        if (action === "edit") {
          callbacks.onEditMetadata(idx);
        } else if (action === "upload") {
          callbacks.onUpload(idx, btn);
        } else if (action === "remove") {
          callbacks.onRemove(idx);
        }
      });
    });

    container.appendChild(fileItem);
  });

  // Re-append overlay if it existed
  if (overlay) {
    container.appendChild(overlay);
  }
}

export function showUploadLoading(container) {
  if (!container) return;

  let overlay = container.querySelector("#selected-files-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "selected-files-loading-overlay";
    overlay.className = "selected-files-loading-overlay";
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Uploading files...</div>
    `;
    container.appendChild(overlay);
  }
  overlay.style.display = "flex";
  container.style.opacity = "0.4";
  container.style.pointerEvents = "none";
}

export function hideUploadLoading(container) {
  if (!container) return;

  const overlay = container.querySelector("#selected-files-loading-overlay");
  if (overlay) {
    overlay.style.display = "none";
  }
  container.style.opacity = "1";
  container.style.pointerEvents = "auto";
}
