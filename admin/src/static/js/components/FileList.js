/**
 * File List rendering functions
 * Pure rendering - receives container element, no direct DOM access
 */

import { escapeHtml } from "../utils.js";

export function renderFileList(container, files, onDelete, onView) {
  if (!container) return;

  container.innerHTML = "";
  if (!files || files.length === 0) {
    container.innerHTML = '<div class="empty">No files found.</div>';
    return;
  }

  files.forEach((file) => {
    const row = document.createElement("div");
    row.className = "file-row";
    const displayName = file.display_name.trim();

    // Build metadata display if available
    let metadataHtml = "";
    if (file.custom_metadata && Object.keys(file.custom_metadata).length > 0) {
      const metadataItems = Object.entries(file.custom_metadata)
        .map(
          ([key, value]) =>
            `<span class="metadata-tag"><span class="metadata-key">${escapeHtml(
              key
            )}</span>:&nbsp;<span class="metadata-value">${escapeHtml(
              String(value)
            )}</span></span>`
        )
        .join("");
      metadataHtml = `<div class="file-metadata-display">${metadataItems}</div>`;
    }

    // Format creation timestamp in local time
    const createTime = file.create_time
      ? new Date(file.create_time).toLocaleString()
      : "N/A";

    row.innerHTML = `
      <div class="file-info">
        <span class="file-name">${escapeHtml(displayName)}</span>
        <span class="file-id">${escapeHtml(file.name)}</span>
        <div class="file-times">
          <span class="file-time">Created: ${createTime}</span>
        </div>
        ${metadataHtml}
      </div>
      <div class="file-actions">
        <button class="view-btn" data-file-name="${escapeHtml(
          file.name
        )}" data-file-display="${escapeHtml(displayName)}" title="View file">View</button>
        <button class="danger-btn" data-file-name="${escapeHtml(
          file.name
        )}">Delete</button>
      </div>
    `;

    // Add view handler
    const viewBtn = row.querySelector(".view-btn");
    if (viewBtn && onView) {
      viewBtn.addEventListener("click", () => {
        onView(file.name, displayName, viewBtn);
      });
    }

    // Add delete handler
    const deleteBtn = row.querySelector(".danger-btn");
    deleteBtn.addEventListener("click", () => {
      onDelete(file.name, deleteBtn);
    });

    container.appendChild(row);
  });
}

export function showFileListLoading(container) {
  if (container) {
    container.innerHTML = '<div class="loading">Loading files...</div>';
  }
}

export function showFileListError(container, message) {
  if (container) {
    container.innerHTML = `<div class="error">Error loading files: ${escapeHtml(
      message
    )}</div>`;
  }
}

export function removeFileFromList(container, docName) {
  if (!container) return;

  const rows = container.querySelectorAll(".file-row");
  for (const row of rows) {
    const fileId = row.querySelector(".file-id");
    if (fileId && fileId.textContent === docName) {
      row.remove();
      break;
    }
  }

  // If no files left, show empty state
  if (container.querySelectorAll(".file-row").length === 0) {
    container.innerHTML = '<div class="empty">No files found.</div>';
  }
}
