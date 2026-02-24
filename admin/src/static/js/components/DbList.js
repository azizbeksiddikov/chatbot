/**
 * Database List rendering functions
 * Pure rendering - receives container element, no direct DOM access
 */

import { escapeHtml } from "../utils.js";

export function renderDbList(container, dbs, currentDb, onSelect) {
  if (!container) return;

  container.innerHTML = "";
  dbs.forEach((db) => {
    const div = document.createElement("div");
    div.className = `db-item ${
      currentDb && currentDb.name === db.name ? "active" : ""
    }`;
    div.onclick = () => onSelect(db);
    div.innerHTML = `
      <span class="db-name">${escapeHtml(db.display_name)}</span>
      <span class="db-id">${escapeHtml(db.name)}</span>
    `;
    container.appendChild(div);
  });
}

export function showDbListLoading(container) {
  if (container) {
    container.innerHTML = '<div class="loading">Loading...</div>';
  }
}

export function showDbListError(container, message) {
  if (container) {
    container.innerHTML = `<div class="error">Error: ${escapeHtml(
      message
    )}</div>`;
  }
}
