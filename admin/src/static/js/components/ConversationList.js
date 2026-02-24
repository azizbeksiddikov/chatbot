/**
 * Conversation List rendering functions
 * Pure rendering - receives container element, no direct DOM access
 */

import { escapeHtml } from '../utils.js';

export function renderConversationList(
  container,
  conversations,
  onView,
  onDownload,
  onDelete
) {
  if (!container) return;

  container.innerHTML = '';

  if (conversations.length === 0) {
    container.innerHTML = `
      <div class="conversation-empty-state">
        <div class="conversation-empty-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p class="conversation-empty-title">No conversations yet</p>
        <p class="conversation-empty-subtitle">Saved Q&A conversations from the chatbot will appear here.</p>
      </div>
    `;
    return;
  }

  // Create table structure
  const table = document.createElement('table');
  table.className = 'conversation-table';

  // Table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Filename</th>
      <th>Size</th>
      <th>Modified</th>
      <th>Actions</th>
    </tr>
  `;
  table.appendChild(thead);

  // Table body
  const tbody = document.createElement('tbody');
  conversations.forEach((conv) => {
    const row = document.createElement('tr');
    row.className = 'conversation-row';

    // Format file size
    const sizeStr = formatFileSize(conv.size);

    // Format modified date
    const modifiedDate = new Date(conv.modified * 1000);
    const modifiedStr = formatDate(modifiedDate);

    row.innerHTML = `
      <td class="conversation-filename">${escapeHtml(conv.filename)}</td>
      <td class="conversation-size">${escapeHtml(sizeStr)}</td>
      <td class="conversation-modified">${escapeHtml(modifiedStr)}</td>
      <td class="conversation-actions">
        <button class="action-btn view-conversation-btn" data-filename="${escapeHtml(
          conv.filename
        )}" title="View conversation">
          View
        </button>
        <button class="action-btn download-conversation-btn" data-filename="${escapeHtml(
          conv.filename
        )}" title="Download conversation">
          Download
        </button>
        <button class="action-btn danger-btn delete-conversation-btn" data-filename="${escapeHtml(
          conv.filename
        )}" title="Delete conversation">
          Delete
        </button>
      </td>
    `;

    // Add event listeners
    const viewBtn = row.querySelector('.view-conversation-btn');
    const downloadBtn = row.querySelector('.download-conversation-btn');
    const deleteBtn = row.querySelector('.delete-conversation-btn');

    if (viewBtn && onView) {
      viewBtn.addEventListener('click', () => onView(conv.filename));
    }

    if (downloadBtn && onDownload) {
      downloadBtn.addEventListener('click', () => onDownload(conv.filename));
    }

    if (deleteBtn && onDelete) {
      deleteBtn.addEventListener('click', () => onDelete(conv.filename));
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

export function showConversationListLoading(container) {
  if (container) {
    container.innerHTML = '<div class="loading">Loading conversations...</div>';
  }
}

export function showConversationListError(container, message) {
  if (container) {
    container.innerHTML = `<div class="error">Error: ${escapeHtml(
      message
    )}</div>`;
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  // Format as date
  return (
    date.toLocaleDateString() +
    ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}
