/**
 * UI Controller - handles all DOM manipulation and view updates
 */

// DOM element references
let dbListEl = null;
let dbHeader = null;
let dbHeaderActions = null;
let selectedDbNameEl = null;
let selectedDbIdEl = null;
let fileSection = null;
let emptyState = null;
let fileListEl = null;
let selectedFilesArea = null;
let fileInput = null;
let uploadProgressDiv = null;
let uploadProgressText = null;
let mainContent = null;
let manualContentSection = null;
let conversationsSection = null;

// Component container references
let componentContainers = {};

/**
 * Initialize UI controller with DOM references
 */
export function initUI() {
  dbListEl = document.getElementById("db-list");
  dbHeader = document.getElementById("db-header");
  dbHeaderActions = document.getElementById("db-header-actions");
  selectedDbNameEl = document.getElementById("selected-db-name");
  selectedDbIdEl = document.getElementById("selected-db-id");
  fileSection = document.getElementById("file-section");
  emptyState = document.getElementById("empty-state");
  fileListEl = document.getElementById("file-list");
  selectedFilesArea = document.getElementById("selected-files-area");
  fileInput = document.getElementById("file-input");
  uploadProgressDiv = document.getElementById("upload-progress");
  uploadProgressText = uploadProgressDiv?.querySelector(".progress-text");
  mainContent = document.querySelector(".main-content");
  manualContentSection = document.getElementById("manual-content-section");
  conversationsSection = document.getElementById("conversations-section");
}

/**
 * Update main view based on current database state
 */
export function updateMainView(currentDb) {
  // Always hide manual content section when showing DB view
  if (manualContentSection) manualContentSection.style.display = "none";
  // Always hide conversations section when showing DB view
  if (conversationsSection) conversationsSection.style.display = "none";
  // Always show DB header when showing DB view
  if (dbHeader) dbHeader.style.display = "block";
  
  if (currentDb) {
    selectedDbNameEl.textContent = currentDb.display_name;
    selectedDbIdEl.textContent = currentDb.name;
    dbHeaderActions.style.display = "flex";
    fileSection.style.display = "block";
    emptyState.style.display = "none";
    fileListEl.innerHTML = "";
  } else {
    selectedDbNameEl.textContent = "Select a Database";
    dbHeaderActions.style.display = "none";
    fileSection.style.display = "none";
    emptyState.style.display = "block";
  }
}

/**
 * Show/hide selected files area
 */
export function showSelectedFilesArea() {
  if (selectedFilesArea) {
    selectedFilesArea.style.display = "block";
  }
}

export function hideSelectedFilesArea() {
  if (selectedFilesArea) {
    selectedFilesArea.style.display = "none";
  }
  if (fileInput) {
    fileInput.value = "";
  }
}

/**
 * Show/hide upload progress
 */
export function showUploadProgress(text) {
  if (uploadProgressDiv) {
    uploadProgressDiv.style.display = "block";
  }
  if (uploadProgressText && text) {
    uploadProgressText.textContent = text;
  }
}

export function hideUploadProgress() {
  if (uploadProgressDiv) {
    uploadProgressDiv.style.display = "none";
  }
}

/**
 * Update upload progress text
 */
export function updateUploadProgressText(text) {
  if (uploadProgressText) {
    uploadProgressText.textContent = text;
  }
}

/**
 * Get file input element
 */
export function getFileInput() {
  return fileInput;
}

/**
 * Set file row opacity (for deletion animation)
 */
export function setFileRowOpacity(row, opacity) {
  if (row) {
    row.style.opacity = opacity;
    row.style.transition = "opacity 0.2s";
  }
}

/**
 * Get element by ID (for cases where we need direct access)
 */
export function getElementById(id) {
  return document.getElementById(id);
}

/**
 * Get or cache component container element
 */
export function getContainer(containerId) {
  if (!componentContainers[containerId]) {
    componentContainers[containerId] = document.getElementById(containerId);
  }
  return componentContainers[containerId];
}

/**
 * Clear container cache (useful for testing or reset)
 */
export function clearContainerCache() {
  componentContainers = {};
}

/**
 * Show/hide modal
 */
export function showModal(modal) {
  if (modal) {
    modal.style.display = "flex";
  }
}

export function hideModal(modal) {
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * Show/hide main content loading overlay
 */
export function showMainContentLoading() {
  if (!mainContent) return;

  let overlay = mainContent.querySelector(".main-content-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "main-content-loading-overlay";
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading...</div>
    `;
    mainContent.appendChild(overlay);
  }
  overlay.style.display = "flex";
}

export function hideMainContentLoading() {
  if (!mainContent) return;

  const overlay = mainContent.querySelector(".main-content-loading-overlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

/**
 * Show/hide manual content section
 */
export function showManualContentSection() {
  // Hide all DB-related views
  if (dbHeader) dbHeader.style.display = "none";
  if (fileSection) fileSection.style.display = "none";
  if (emptyState) emptyState.style.display = "none";
  if (conversationsSection) conversationsSection.style.display = "none";
  // Show manual content section
  if (manualContentSection) manualContentSection.style.display = "block";
}

export function hideManualContentSection() {
  if (manualContentSection) manualContentSection.style.display = "none";
}

export function showConversationsSection() {
  // Hide all DB-related views
  if (dbHeader) dbHeader.style.display = "none";
  if (fileSection) fileSection.style.display = "none";
  if (emptyState) emptyState.style.display = "none";
  if (manualContentSection) manualContentSection.style.display = "none";
  // Show conversations section
  if (conversationsSection) conversationsSection.style.display = "block";
}

export function hideConversationsSection() {
  if (conversationsSection) conversationsSection.style.display = "none";
}

/**
 * Generate timestamp-based filename
 */
export function generateTimestampFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `manual-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.txt`;
}
