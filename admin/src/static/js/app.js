/**
 * Main application
 */

import { ApiService } from './api.js';

// Authentication state
let isAuthenticated = false;
import * as state from './state.js';
import {
  renderDbList,
  showDbListLoading,
  showDbListError,
} from './components/DbList.js';
import {
  renderFileList,
  showFileListLoading,
  showFileListError,
  removeFileFromList,
} from './components/FileList.js';
import {
  renderSelectedFiles,
  showUploadLoading,
  hideUploadLoading,
} from './components/FileUploader.js';
import {
  renderConversationList,
  showConversationListLoading,
  showConversationListError,
} from './components/ConversationList.js';
import {
  getFileExtension,
  getBaseFileName,
  escapeHtml,
  setButtonLoading,
} from './utils.js';
import {
  initUI,
  updateMainView,
  showSelectedFilesArea,
  hideSelectedFilesArea,
  showUploadProgress,
  hideUploadProgress,
  updateUploadProgressText,
  getFileInput,
  setFileRowOpacity,
  getElementById,
  getContainer,
  showModal,
  hideModal,
  showMainContentLoading,
  hideMainContentLoading,
  showManualContentSection,
  hideManualContentSection,
  showConversationsSection,
  hideConversationsSection,
  generateTimestampFilename,
} from './ui.js';

let currentEditingFileIndex = null;
let isManualContentMode = false;
let manualContentMetadata = { visibility: false };

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI controller
  initUI();

  // Check authentication status on load
  await checkAuthAndInit();

  // Event listeners
  getElementById('refresh-dbs-btn')?.addEventListener('click', fetchDbs);
  getElementById('create-db-btn')?.addEventListener('click', createDb);
  getElementById('delete-db-btn')?.addEventListener('click', deleteCurrentDb);
  getFileInput()?.addEventListener('change', handleFileSelection);
  getElementById('upload-all-btn')?.addEventListener('click', uploadAllFiles);
  getElementById('refresh-files-btn')?.addEventListener('click', fetchFiles);
  getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Metadata modal buttons
  getElementById('save-metadata-btn')?.addEventListener('click', saveMetadata);
  getElementById('cancel-metadata-btn')?.addEventListener('click', () => {
    const modal = getContainer('metadata-modal');
    hideModal(modal);
    currentEditingFileIndex = null;
    isManualContentMode = false;
  });

  // Close button for metadata modal (also handle via event listener, not just onclick)
  const modal = getContainer('metadata-modal');
  if (modal) {
    const closeBtn = modal.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        hideModal(modal);
        currentEditingFileIndex = null;
        isManualContentMode = false;
      });
    }

    // Close modal when clicking outside (on the backdrop)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal);
        currentEditingFileIndex = null;
        isManualContentMode = false;
      }
    });
  }

  // File viewer modal handlers
  const viewerModal = getContainer('file-viewer-modal');
  const closeViewerBtn = getElementById('close-viewer-btn');
  const downloadFileBtn = getElementById('download-file-btn');

  if (closeViewerBtn) {
    closeViewerBtn.addEventListener('click', () => {
      if (viewerModal) hideModal(viewerModal);
    });
  }

  if (downloadFileBtn) {
    downloadFileBtn.addEventListener('click', () => {
      const currentFileUrl = downloadFileBtn.dataset.fileUrl;
      const currentFileName = downloadFileBtn.dataset.fileName;
      if (currentFileUrl && currentFileName) {
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = currentFileUrl + '&download=1';
        link.download = currentFileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  }

  if (viewerModal) {
    // Close modal when clicking outside (on the backdrop)
    viewerModal.addEventListener('click', (e) => {
      if (e.target === viewerModal) {
        hideModal(viewerModal);
      }
    });
  }

  // Login form handler
  const loginForm = getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Password toggle handler
  const togglePasswordBtn = getElementById('toggle-password-btn');
  const passwordInput = getElementById('login-password');
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type =
        passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.textContent = type === 'password' ? 'Show' : 'Hide';
    });
  }

  // Manual content handlers
  getElementById('manual-content-btn')?.addEventListener(
    'click',
    showManualContentView
  );
  getElementById('back-to-db-btn')?.addEventListener(
    'click',
    showDbManagementView
  );
  getElementById('edit-manual-metadata-btn')?.addEventListener(
    'click',
    openManualMetadataModal
  );
  getElementById('clear-manual-content-btn')?.addEventListener(
    'click',
    clearManualContent
  );
  getElementById('upload-manual-content-btn')?.addEventListener(
    'click',
    uploadManualContent
  );

  // Conversations handlers
  getElementById('conversations-btn')?.addEventListener(
    'click',
    showConversationsView
  );
  getElementById('back-from-conversations-btn')?.addEventListener(
    'click',
    showDbManagementView
  );
  getElementById('refresh-conversations-btn')?.addEventListener(
    'click',
    fetchConversations
  );

  // Conversation tab handlers
  getElementById('conversation-tab-dev')?.addEventListener('click', () => {
    switchConversationTab('dev');
  });
  getElementById('conversation-tab-prod')?.addEventListener('click', () => {
    switchConversationTab('prod');
  });

  // Conversation viewer modal handlers
  const conversationViewerModal = getContainer('conversation-viewer-modal');
  const closeConversationViewerBtn = getElementById(
    'close-conversation-viewer-btn'
  );
  const downloadConversationBtn = getElementById('download-conversation-btn');

  if (closeConversationViewerBtn) {
    closeConversationViewerBtn.addEventListener('click', () => {
      if (conversationViewerModal) hideModal(conversationViewerModal);
    });
  }

  if (downloadConversationBtn) {
    downloadConversationBtn.addEventListener('click', () => {
      const currentConversationUrl =
        downloadConversationBtn.dataset.conversationUrl;
      const currentConversationName =
        downloadConversationBtn.dataset.conversationName;
      if (currentConversationUrl && currentConversationName) {
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = currentConversationUrl + '&download=1';
        link.download = currentConversationName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  }

  if (conversationViewerModal) {
    // Close modal when clicking outside (on the backdrop)
    conversationViewerModal.addEventListener('click', (e) => {
      if (e.target === conversationViewerModal) {
        hideModal(conversationViewerModal);
      }
    });
  }
});

// ========== Authentication Functions ==========

async function checkAuthAndInit() {
  try {
    const authenticated = await ApiService.checkAuth();
    if (authenticated) {
      isAuthenticated = true;
      showApp();
      // Initial load
      fetchDbs();
    } else {
      isAuthenticated = false;
      showLogin();
    }
  } catch (err) {
    console.error('Error checking auth:', err);
    isAuthenticated = false;
    showLogin();
  }
}

function showLogin() {
  const loginModal = getContainer('login-modal');
  const appContainer = getElementById('app-container');
  if (loginModal) loginModal.style.display = 'flex';
  if (appContainer) appContainer.style.display = 'none';
}

function showApp() {
  const loginModal = getContainer('login-modal');
  const appContainer = getElementById('app-container');
  if (loginModal) loginModal.style.display = 'none';
  if (appContainer) appContainer.style.display = 'flex';
}

async function handleLogin(event) {
  event.preventDefault();
  const idInput = getElementById('login-id');
  const passwordInput = getElementById('login-password');
  const errorDiv = getElementById('login-error');
  const submitBtn = getElementById('login-submit-btn');

  if (!idInput || !passwordInput) return;

  const id = idInput.value.trim();
  const password = passwordInput.value;

  if (!id || !password) {
    if (errorDiv) {
      errorDiv.textContent = 'Please enter both ID and password';
      errorDiv.style.display = 'block';
    }
    return;
  }

  // Disable submit button
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
  }
  if (errorDiv) errorDiv.style.display = 'none';

  try {
    await ApiService.login(id, password);
    isAuthenticated = true;
    showApp();
    // Clear form
    idInput.value = '';
    passwordInput.value = '';
    // Initial load
    fetchDbs();
  } catch (err) {
    if (errorDiv) {
      errorDiv.textContent = err.message || 'Login failed. Please try again.';
      errorDiv.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  }
}

async function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;

  try {
    await ApiService.logout();
    isAuthenticated = false;
    showLogin();
    // Clear state
    state.setCurrentDb(null);
    state.setDbs([]);
    state.setSelectedFiles([]);
  } catch (err) {
    console.error('Logout error:', err);
    // Still show login even if logout API call fails
    isAuthenticated = false;
    showLogin();
  }
}

// Wrap API calls to handle 401 errors
function handleApiError(err) {
  if (err.message === 'UNAUTHORIZED' || err.message.includes('401')) {
    isAuthenticated = false;
    showLogin();
    return true; // Error was handled
  }
  return false; // Error was not handled
}

// Global function for closeMetadataModal (called from HTML onclick)
window.closeMetadataModal = function () {
  const modal = getContainer('metadata-modal');
  if (modal) {
    hideModal(modal);
    currentEditingFileIndex = null;
    isManualContentMode = false;
  }
};

// ========== Database Functions ==========

async function fetchDbs() {
  const container = getContainer('db-list');
  showDbListLoading(container);
  try {
    const dbs = await ApiService.fetchDbs();
    state.setDbs(dbs);
    renderDbList(container, dbs, state.current_db, selectDb);
    // Update manual content dropdown if in manual content view
    if (state.current_view === 'manual') {
      populateManualDbDropdown();
    }
  } catch (err) {
    if (!handleApiError(err)) {
      showDbListError(container, err.message);
    }
  }
}

async function createDb() {
  const input = getElementById('new-db-name');
  const name = input?.value.trim();
  if (!name) {
    alert('Please enter a DB name');
    return;
  }
  if (name.length > 100) {
    alert('DB name must be 100 characters or less');
    return;
  }

  const createBtn = getElementById('create-db-btn');
  setButtonLoading(createBtn, 'Creating...', true);

  try {
    await ApiService.createDb(name);
    if (input) input.value = '';
    fetchDbs();
  } catch (err) {
    if (!handleApiError(err)) {
      alert('Failed to create DB: ' + (err.message || 'Unknown error'));
    }
  } finally {
    setButtonLoading(createBtn, 'Creating...', false);
  }
}

async function deleteCurrentDb() {
  if (
    !state.current_db ||
    !confirm(`Delete ${state.current_db.display_name}? This cannot be undone.`)
  ) {
    return;
  }

  const deleteBtn = getElementById('delete-db-btn');
  setButtonLoading(deleteBtn, 'Deleting...', true);
  showMainContentLoading();

  try {
    await ApiService.deleteDb(state.current_db.name);
    state.setCurrentDb(null);
    updateMainView(null);
    fetchDbs();
  } catch (err) {
    if (!handleApiError(err)) {
      alert('Failed to delete DB');
    }
  } finally {
    setButtonLoading(deleteBtn, 'Deleting...', false);
    hideMainContentLoading();
  }
}

function selectDb(db) {
  state.setCurrentDb(db);
  state.setCurrentView('db');
  const container = getContainer('db-list');
  renderDbList(container, state.dbs, db, selectDb);
  updateMainView(db);
  fetchFiles();
}

// ========== Conversation Functions ==========

// Conversation tab state
let currentConversationTab = 'dev';

function showConversationsView() {
  state.setCurrentView('conversations');
  showConversationsSection();
  // Set initial tab to dev
  currentConversationTab = 'dev';
  updateConversationTabUI();
  fetchConversations();
}

function switchConversationTab(env) {
  currentConversationTab = env;
  updateConversationTabUI();
  fetchConversations();
}

function updateConversationTabUI() {
  const devTab = getElementById('conversation-tab-dev');
  const prodTab = getElementById('conversation-tab-prod');

  if (devTab) {
    if (currentConversationTab === 'dev') {
      devTab.classList.add('active');
    } else {
      devTab.classList.remove('active');
    }
  }

  if (prodTab) {
    if (currentConversationTab === 'prod') {
      prodTab.classList.add('active');
    } else {
      prodTab.classList.remove('active');
    }
  }
}

async function fetchConversations() {
  const container = getContainer('conversation-list');
  showConversationListLoading(container);
  try {
    const allConversations = await ApiService.fetchConversations();
    // Filter conversations by current tab environment
    const filteredConversations = allConversations.filter(
      (conv) => (conv.environment || 'dev') === currentConversationTab
    );
    renderConversationList(
      container,
      filteredConversations,
      viewConversation,
      downloadConversation,
      deleteConversation
    );
  } catch (err) {
    if (!handleApiError(err)) {
      showConversationListError(container, err.message);
    }
  }
}

async function deleteConversation(filename) {
  if (!confirm(`Delete conversation "${filename}"?`)) return;
  try {
    await ApiService.deleteConversation(filename, currentConversationTab);
    const viewerModal = getContainer('conversation-viewer-modal');
    if (viewerModal && viewerModal.style.display !== 'none') {
      const downloadBtn = getElementById('download-conversation-btn');
      if (downloadBtn?.dataset.conversationName === filename) {
        hideModal(viewerModal);
      }
    }
    fetchConversations();
  } catch (err) {
    if (!handleApiError(err)) {
      alert(err.message || 'Failed to delete conversation');
    }
  }
}

async function viewConversation(filename) {
  const viewerModal = getContainer('conversation-viewer-modal');
  const viewerFileName = getElementById('conversation-viewer-file-name');
  const viewerContent = getElementById('conversation-viewer-content');
  const viewerLoading = getElementById('conversation-viewer-loading');
  const viewerError = getElementById('conversation-viewer-error');
  const downloadConversationBtn = getElementById('download-conversation-btn');
  const errorText = viewerError?.querySelector('.error-text');

  if (!viewerModal) return;

  // Show modal
  if (viewerFileName) {
    viewerFileName.textContent = filename;
  }
  showModal(viewerModal);

  // Hide content and error, show loading
  if (viewerContent) viewerContent.style.display = 'none';
  if (viewerError) viewerError.style.display = 'none';
  if (viewerLoading) viewerLoading.style.display = 'flex';

  try {
    // Get conversation view URL
    const conversationUrl = ApiService.getConversationViewUrl(
      filename,
      currentConversationTab
    );

    // Store conversation info for download button
    if (downloadConversationBtn) {
      downloadConversationBtn.dataset.conversationUrl = conversationUrl;
      downloadConversationBtn.dataset.conversationName = filename;
    }

    // Fetch text content
    const response = await fetch(conversationUrl, {
      credentials: 'include',
    });

    if (!response.ok) {
      // Get error message from API
      let errorMessage = `Failed to load conversation (${response.status})`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        }
      } catch (parseError) {
        // Use status-based message
      }
      throw new Error(errorMessage);
    }

    const text = await response.text();

    if (viewerContent) {
      // Display conversation as formatted text
      viewerContent.innerHTML = `<pre class="text-content conversation-content">${escapeHtml(
        text
      )}</pre>`;
      viewerContent.style.display = 'block';
    }

    // Hide loading
    if (viewerLoading) viewerLoading.style.display = 'none';
  } catch (err) {
    console.error('Error viewing conversation:', err);
    if (viewerLoading) viewerLoading.style.display = 'none';
    if (viewerError && errorText) {
      errorText.textContent = err.message || 'Failed to load conversation';
      viewerError.style.display = 'flex';
    }
  }
}

function downloadConversation(filename) {
  const conversationUrl = ApiService.getConversationViewUrl(
    filename,
    currentConversationTab
  );
  const link = document.createElement('a');
  link.href = conversationUrl + '&download=1';
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ========== File Functions ==========

async function fetchFiles() {
  if (!state.current_db) return;
  const container = getContainer('file-list');
  showFileListLoading(container);
  try {
    const files = await ApiService.fetchFiles(state.current_db.name);
    renderFileList(container, files, deleteFile, viewFile);
  } catch (err) {
    if (!handleApiError(err)) {
      showFileListError(container, err.message);
    }
  }
}

function handleFileSelection(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) {
    hideSelectedFilesArea();
    return;
  }

  // Initialize with default metadata
  const fileObjects = files.map((file) => ({
    file: file,
    custom_name: file.name,
    metadata: { visibility: false },
  }));

  state.setSelectedFiles(fileObjects);
  renderSelectedFilesList();
}

function renderSelectedFilesList() {
  const container = getContainer('selected-files-list');
  const area = getContainer('selected-files-area');
  renderSelectedFiles(
    container,
    area,
    state.selected_files,
    {
      onFileNameChange: (index, newBaseName) => {
        if (state.selected_files[index]) {
          let baseName = newBaseName.trim();
          if (!baseName) return;
          const originalExtension = getFileExtension(
            state.selected_files[index].file.name
          );
          state.selected_files[
            index
          ].custom_name = `${baseName}${originalExtension}`;
          // Re-render to update validation status
          renderSelectedFilesList();
        }
      },
      onEditMetadata: (index) => openMetadataModal(index),
      onUpload: (index, button) => uploadSingleFile(index, button),
      onRemove: (index) => {
        state.selected_files.splice(index, 1);
        if (state.selected_files.length === 0) {
          hideSelectedFilesArea();
        } else {
          renderSelectedFilesList();
        }
      },
    },
    isFileMetadataValid
  );
}

function isFileMetadataValid(fileObj) {
  // Ensure visibility is present
  if (!fileObj.metadata.hasOwnProperty('visibility')) {
    return false;
  }

  // Convert string "true"/"false" to boolean if needed
  const visibility =
    fileObj.metadata.visibility === true ||
    fileObj.metadata.visibility === 'true' ||
    String(fileObj.metadata.visibility).toLowerCase() === 'true';

  // If visibility is true, link is required
  if (
    visibility &&
    (!fileObj.metadata.link || String(fileObj.metadata.link).trim() === '')
  ) {
    return false;
  }

  return true;
}

function validateFileMetadata(fileObj, fileName) {
  // Ensure visibility is present
  if (!fileObj.metadata.hasOwnProperty('visibility')) {
    throw new Error(`${fileName}: Visibility is required`);
  }

  // Convert string "true"/"false" to boolean if needed
  const visibility =
    fileObj.metadata.visibility === true ||
    fileObj.metadata.visibility === 'true' ||
    String(fileObj.metadata.visibility).toLowerCase() === 'true';

  // If visibility is true, link is required
  if (
    visibility &&
    (!fileObj.metadata.link || String(fileObj.metadata.link).trim() === '')
  ) {
    throw new Error(`${fileName}: Link is required when visibility is true`);
  }

  // Normalize visibility to boolean
  fileObj.metadata.visibility = visibility;
}

async function uploadSingleFile(index, button) {
  if (!state.current_db) {
    alert('Please select a database first');
    return;
  }

  const fileObj = state.selected_files[index];
  if (!fileObj) return;

  // Validate metadata before upload
  try {
    validateFileMetadata(fileObj, fileObj.custom_name);
  } catch (err) {
    alert('Validation failed: ' + err.message);
    return;
  }

  setButtonLoading(button, 'Uploading...', true);
  const container = getContainer('selected-files-list');
  showUploadLoading(container);

  try {
    await ApiService.uploadFile(
      state.current_db.name,
      fileObj.file,
      fileObj.custom_name,
      fileObj.metadata
    );
    state.selected_files.splice(index, 1);
    if (state.selected_files.length === 0) {
      hideSelectedFilesArea();
    } else {
      renderSelectedFilesList();
    }
    // Refresh file list to show the newly uploaded file
    fetchFiles();
  } catch (err) {
    if (!handleApiError(err)) {
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    }
  } finally {
    setButtonLoading(button, 'Uploading...', false);
    hideUploadLoading(container);
  }
}

async function uploadAllFiles() {
  if (!state.current_db) {
    alert('Please select a database first');
    return;
  }
  if (state.selected_files.length === 0) return;

  // Validate all files before starting upload
  const validationErrors = [];
  for (let i = 0; i < state.selected_files.length; i++) {
    const fileObj = state.selected_files[i];
    try {
      validateFileMetadata(fileObj, fileObj.custom_name);
    } catch (err) {
      validationErrors.push(err.message);
    }
  }

  if (validationErrors.length > 0) {
    alert('Validation failed:\n' + validationErrors.join('\n'));
    return;
  }

  const uploadAllBtn = getElementById('upload-all-btn');

  setButtonLoading(uploadAllBtn, 'Uploading...', true);
  showUploadProgress();
  const container = getContainer('selected-files-list');
  showUploadLoading(container);

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (let i = 0; i < state.selected_files.length; i++) {
    const fileObj = state.selected_files[i];
    updateUploadProgressText(
      `Uploading ${i + 1}/${state.selected_files.length}: ${
        fileObj.custom_name
      }...`
    );

    try {
      await ApiService.uploadFile(
        state.current_db.name,
        fileObj.file,
        fileObj.custom_name,
        fileObj.metadata
      );
      successCount++;
    } catch (err) {
      // If unauthorized, stop upload and show login
      if (err.message === 'UNAUTHORIZED' || err.message.includes('401')) {
        // Restore UI
        hideUploadProgress();
        setButtonLoading(uploadAllBtn, 'Uploading...', false);
        hideUploadLoading(container);
        handleApiError(err);
        return; // Exit early
      }
      failCount++;
      errors.push(`${fileObj.custom_name}: ${err.message}`);
    }
  }

  // Restore UI
  hideUploadProgress();
  setButtonLoading(uploadAllBtn, 'Uploading...', false);
  hideUploadLoading(container);

  // Clear selected files
  state.setSelectedFiles([]);
  hideSelectedFilesArea();

  // Refresh file list
  fetchFiles();

  // Show results
  if (failCount === 0) {
    alert(`Successfully uploaded ${successCount} file(s)`);
  } else if (successCount === 0) {
    alert(`Upload failed for all files:\n${errors.join('\n')}`);
  } else {
    alert(
      `Uploaded ${successCount} file(s) successfully.\nFailed ${failCount} file(s):\n${errors.join(
        '\n'
      )}`
    );
  }
}

async function viewFile(docName, displayName, button) {
  const viewerModal = getContainer('file-viewer-modal');
  const viewerFileName = getElementById('viewer-file-name');
  const viewerContent = getElementById('file-viewer-content');
  const viewerLoading = getElementById('file-viewer-loading');
  const viewerError = getElementById('file-viewer-error');
  const downloadFileBtn = getElementById('download-file-btn');
  const errorText = viewerError?.querySelector('.error-text');

  if (!viewerModal) return;

  // Get file extension
  const fileExt = getFileExtension(displayName).toLowerCase();
  const supportedTypes = ['.pdf', '.txt', '.md'];
  const isSupported = fileExt && supportedTypes.includes(fileExt);

  // Show modal
  if (viewerFileName) {
    viewerFileName.textContent = displayName;
  }
  showModal(viewerModal);

  // Hide content and error, show loading
  if (viewerContent) viewerContent.style.display = 'none';
  if (viewerError) viewerError.style.display = 'none';
  if (viewerLoading) viewerLoading.style.display = 'flex';

  // Check if file type is supported
  if (!isSupported) {
    if (viewerLoading) viewerLoading.style.display = 'none';
    if (viewerError && errorText) {
      errorText.textContent = `File type "${fileExt}" is not supported. Supported types: PDF, TXT, MD.`;
      viewerError.style.display = 'flex';
    }
    return;
  }

  try {
    // Get file view URL
    const fileUrl = ApiService.getFileViewUrl(docName);

    // Store file info for download button
    if (downloadFileBtn) {
      downloadFileBtn.dataset.fileUrl = fileUrl;
      downloadFileBtn.dataset.fileName = displayName;
    }

    if (fileExt === '.pdf') {
      // Check if file exists before loading in iframe
      const pdfCheckResponse = await fetch(fileUrl, {
        method: 'HEAD',
        credentials: 'include',
      });

      if (!pdfCheckResponse.ok) {
        // Get error message from API
        let errorMessage = `Failed to load file (${pdfCheckResponse.status})`;
        try {
          const getResponse = await fetch(fileUrl, {
            credentials: 'include',
          });
          const contentType = getResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await getResponse.json();
            errorMessage = errorData.error || errorMessage;
          }
        } catch (parseError) {
          // Use status-based message
        }
        throw new Error(errorMessage);
      }

      // Display PDF in iframe for preview
      if (viewerContent) {
        viewerContent.innerHTML = `<iframe src="${fileUrl}" type="application/pdf"></iframe>`;
        viewerContent.style.display = 'block';
      }
    } else if (fileExt === '.txt' || fileExt === '.md') {
      // Fetch text content
      const response = await fetch(fileUrl, {
        credentials: 'include',
      });

      if (!response.ok) {
        // Get error message from API
        let errorMessage = `Failed to load file (${response.status})`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          }
        } catch (parseError) {}
        throw new Error(errorMessage);
      }

      const text = await response.text();

      if (viewerContent) {
        if (fileExt === '.txt') {
          // Display plain text
          viewerContent.innerHTML = `<pre class="text-content">${escapeHtml(
            text
          )}</pre>`;
        } else if (fileExt === '.md') {
          // Display markdown using marked.js library
          if (typeof marked === 'undefined') {
            throw new Error('Marked.js library not loaded');
          }

          // Configure marked options
          marked.setOptions({
            breaks: true, // Convert line breaks to <br>
            gfm: true, // GitHub Flavored Markdown (tables, strikethrough, etc.)
          });

          // Render markdown to HTML
          const htmlContent = marked.parse(text);
          viewerContent.innerHTML = `<div class="markdown-content">${htmlContent}</div>`;
        }
        viewerContent.style.display = 'block';
      }
    }

    // Hide loading
    if (viewerLoading) viewerLoading.style.display = 'none';
  } catch (err) {
    console.error('Error viewing file:', err);
    if (viewerLoading) viewerLoading.style.display = 'none';
    if (viewerError && errorText) {
      errorText.textContent = err.message || 'Failed to load file';
      viewerError.style.display = 'flex';
    }
  }
}

async function deleteFile(docName, button) {
  if (!confirm('Start deletion for this file?')) return;

  // Find the file row element
  const fileRow = button.closest('.file-row');
  let rowOpacityRestored = false;

  // Reduce opacity of the entire file row
  setFileRowOpacity(fileRow, '0.5');

  setButtonLoading(button, 'Deleting...', true);

  try {
    await ApiService.deleteFile(docName);
    const container = getContainer('file-list');
    removeFileFromList(container, docName);
    // Row is removed on success, so no need to restore opacity
    rowOpacityRestored = true;
  } catch (err) {
    if (!handleApiError(err)) {
      alert('Delete failed: ' + (err.message || 'Unknown error'));
      fetchFiles();
    }
    // On error, restore opacity if row still exists
    if (fileRow && fileRow.parentNode) {
      setFileRowOpacity(fileRow, '1');
      rowOpacityRestored = true;
    }
  } finally {
    setButtonLoading(button, 'Deleting...', false);
    // Restore opacity if not already restored (fallback)
    if (!rowOpacityRestored && fileRow && fileRow.parentNode) {
      setFileRowOpacity(fileRow, '1');
    }
  }
}

// ========== Metadata Modal ==========

function openMetadataModal(index) {
  // Ensure any existing modal is closed first
  const existingModal = getContainer('metadata-modal');
  if (existingModal) {
    hideModal(existingModal);
  }

  currentEditingFileIndex = index;
  const fileObj = state.selected_files[index];
  if (!fileObj) return;

  const fileExtension = getFileExtension(fileObj.file.name);
  const baseFileName = getBaseFileName(fileObj.custom_name);

  const fileNameHtml = `
    <div class="current-file-label">
      <span class="file-name">${escapeHtml(baseFileName)}</span>
      <span class="file-extension">${escapeHtml(fileExtension)}</span>
    </div>
  `;

  // Ensure visibility is always present
  if (!fileObj.metadata.hasOwnProperty('visibility')) {
    fileObj.metadata.visibility = false;
  }

  let metadataInputsHtml = '';
  // Always render visibility first
  metadataInputsHtml += createMetadataPairHtml(
    'visibility',
    fileObj.metadata.visibility
  );

  // Then render other metadata (excluding visibility if it was already in the object)
  Object.entries(fileObj.metadata).forEach(([key, value]) => {
    if (key !== 'visibility') {
      metadataInputsHtml += createMetadataPairHtml(key, value);
    }
  });

  const container = getElementById('metadata-inputs');
  const nameElement = getElementById('current-file-name');
  if (nameElement) nameElement.innerHTML = fileNameHtml;
  if (container) container.innerHTML = metadataInputsHtml;

  // Setup event listeners using event delegation
  if (container) {
    if (!container.dataset.listenersAttached) {
      container.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-remove-pair]');
        if (removeBtn) {
          e.preventDefault();
          e.stopPropagation();
          const pairId = removeBtn.dataset.removePair;
          const pair = container.querySelector(`[data-pair-id="${pairId}"]`);
          if (pair) {
            pair.remove();
            updateLinkRequirement();
          }
        }
      });

      container.addEventListener('input', (e) => {
        if (e.target.matches('[data-key="link"] .metadata-value')) {
          updateLinkRequirement();
        }
      });

      container.addEventListener(
        'blur',
        (e) => {
          if (e.target.matches('[data-key="link"] .metadata-value')) {
            updateLinkRequirement();
          }
        },
        true
      );

      container.dataset.listenersAttached = 'true';
    }

    // Add event listener for visibility changes
    const visibilitySelect = container.querySelector(
      '[data-key="visibility"] .metadata-value'
    );
    if (visibilitySelect) {
      visibilitySelect.addEventListener('change', updateLinkRequirement);
      updateLinkRequirement();
    }
  }

  // Setup add metadata button listener (only attach once, check if already attached)
  const addBtn = getElementById('add-metadata-btn');
  if (addBtn) {
    // Remove old listener if exists, then add new one
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode?.replaceChild(newAddBtn, addBtn);
    newAddBtn.addEventListener('click', addMetadataPair);
  }

  const modal = getContainer('metadata-modal');
  if (modal) {
    // Ensure modal is properly hidden before showing (prevent duplicates)
    hideModal(modal);
    showModal(modal);
  }
}

function updateLinkRequirement() {
  const container = getElementById('metadata-inputs');
  if (!container) return;

  const visibilityPair = container.querySelector('[data-key="visibility"]');
  const visibilitySelect = visibilityPair?.querySelector('.metadata-value');
  const isVisible = visibilitySelect?.value === 'true';

  const linkPair = container.querySelector('[data-key="link"]');
  const linkInput = linkPair?.querySelector('.metadata-value');

  // Remove existing error message if any
  const existingError = container.querySelector('.metadata-error-message');
  if (existingError) {
    existingError.remove();
  }

  if (isVisible) {
    // If visibility is true, ensure link field exists
    if (!linkPair) {
      const linkHtml = createMetadataPairHtml('link', '');
      container.insertAdjacentHTML('beforeend', linkHtml);
    }
    // Make link required
    const linkInputField = container.querySelector(
      '[data-key="link"] .metadata-value'
    );
    if (linkInputField) {
      linkInputField.setAttribute('required', 'required');
      const linkValue = linkInputField.value.trim();

      // Show error if link is empty
      if (!linkValue) {
        linkInputField.style.borderColor = '#ef4444';
        const errorMessage = document.createElement('div');
        errorMessage.className = 'metadata-error-message';
        errorMessage.innerHTML = `
          <span class="error-icon">⚠</span>
          <span class="error-text">Complete metadata</span>
        `;
        container.insertAdjacentElement('beforeend', errorMessage);
      } else {
        linkInputField.style.borderColor = '';
      }
    }
  } else {
    // If visibility is false, remove required from link
    if (linkInput) {
      linkInput.removeAttribute('required');
      linkInput.style.borderColor = '';
    }
  }
}

function createMetadataPairHtml(key = '', value = '') {
  const pairId = Date.now() + Math.random();
  const isVisibility = key === 'visibility';
  const isLink = key === 'link';
  const isRequired = isVisibility || isLink;

  // For visibility, render a true/false dropdown
  let valueInput = '';
  if (isVisibility) {
    const boolValue =
      value === true ||
      value === 'true' ||
      String(value).toLowerCase() === 'true';
    valueInput = `
      <select class="metadata-value" ${isRequired ? 'required' : ''}>
        <option value="true" ${boolValue ? 'selected' : ''}>true</option>
        <option value="false" ${!boolValue ? 'selected' : ''}>false</option>
      </select>
    `;
  } else {
    valueInput = `
      <input 
        type="text" 
        class="metadata-value" 
        value="${escapeHtml(String(value))}" 
        placeholder="Value (e.g., manual)" 
        ${isRequired ? 'required' : ''}
      />
    `;
  }

  return `
    <div class="metadata-pair" data-pair-id="${pairId}" data-key="${escapeHtml(
    key
  )}">
      <input 
        type="text" 
        class="metadata-key" 
        value="${escapeHtml(key)}" 
        placeholder="Key (e.g., category)" 
        ${isVisibility ? 'readonly' : ''}
        ${isRequired ? 'required' : ''}
      />
      ${valueInput}
      <button 
        class="danger-btn" 
        data-remove-pair="${pairId}"
        ${isVisibility ? "style='display:none'" : ''}
      >×</button>
    </div>
  `;
}

function addMetadataPair() {
  const container = getElementById('metadata-inputs');
  if (!container) return;

  const pairHtml = createMetadataPairHtml();
  container.insertAdjacentHTML('beforeend', pairHtml);

  // Update link requirement in case a new key was added that might affect it
  updateLinkRequirement();
}

function saveMetadata() {
  // Allow saving if in manual content mode OR if editing a file
  if (currentEditingFileIndex === null && !isManualContentMode) return;

  const container = getElementById('metadata-inputs');
  if (!container) return;

  const pairs = container.querySelectorAll('.metadata-pair');
  const metadata = {};

  // First pass: collect all metadata
  pairs.forEach((pair) => {
    const key = pair.querySelector('.metadata-key').value.trim();
    let value;

    if (key === 'visibility') {
      // For visibility, get value from select dropdown
      const valueInput = pair.querySelector('.metadata-value');
      value = valueInput?.value === 'true';
    } else {
      const valueInput = pair.querySelector('.metadata-value');
      value = valueInput?.value.trim();
    }

    if (key && value !== '' && value !== null && value !== undefined) {
      metadata[key] = value;
    }
  });

  // Validation: visibility is required
  if (!metadata.hasOwnProperty('visibility')) {
    alert('Visibility is required. Please set visibility to true or false.');
    return;
  }

  // Validation: if visibility is true, link is required
  if (
    metadata.visibility === true &&
    (!metadata.link || metadata.link.trim() === '')
  ) {
    alert('Link is required when visibility is true. Please provide a link.');
    const linkPair = container.querySelector('[data-key="link"]');
    if (linkPair) {
      const linkInput = linkPair.querySelector('.metadata-value');
      if (linkInput) {
        linkInput.focus();
        linkInput.style.borderColor = 'red';
      }
    }
    return;
  }

  if (isManualContentMode) {
    // Save metadata for manual content
    manualContentMetadata = metadata;
    updateManualMetadataPreview();
  } else if (state.selected_files[currentEditingFileIndex]) {
    state.selected_files[currentEditingFileIndex].metadata = metadata;
    renderSelectedFilesList();
  }
  const modal = getContainer('metadata-modal');
  hideModal(modal);
  currentEditingFileIndex = null;
  isManualContentMode = false;
}

// ========== Manual Content Functions ==========

async function showManualContentView() {
  state.setCurrentView('manual');
  showManualContentSection();

  // Fetch DBs if not already loaded
  if (state.dbs.length === 0) {
    await fetchDbs();
  }
  populateManualDbDropdown();

  // Set default filename
  const filenameInput = getElementById('manual-filename');
  if (filenameInput && !filenameInput.value) {
    filenameInput.value = generateTimestampFilename();
  }

  // Reset content and metadata
  const textarea = getElementById('content-textarea');
  if (textarea) textarea.value = '';
  manualContentMetadata = { visibility: false };
  updateManualMetadataPreview();
}

function showDbManagementView() {
  state.setCurrentView('db');
  hideManualContentSection();
  hideConversationsSection();
  if (state.current_db) {
    updateMainView(state.current_db);
  } else {
    updateMainView(null);
  }
}

function populateManualDbDropdown() {
  const select = getElementById('manual-db-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- Select Database --</option>';
  state.dbs.forEach((db) => {
    const option = document.createElement('option');
    option.value = db.name;
    option.textContent = db.display_name;
    select.appendChild(option);
  });
}

function openManualMetadataModal() {
  isManualContentMode = true;
  currentEditingFileIndex = null;

  const filenameInput = getElementById('manual-filename');
  const filename = filenameInput?.value || 'manual-content.txt';
  const fileExtension = getFileExtension(filename);
  const baseFileName = getBaseFileName(filename);

  const fileNameHtml = `
    <div class="current-file-label">
      <span class="file-name">${escapeHtml(baseFileName)}</span>
      <span class="file-extension">${escapeHtml(fileExtension)}</span>
    </div>
  `;

  // Ensure visibility is always present
  if (!manualContentMetadata.hasOwnProperty('visibility')) {
    manualContentMetadata.visibility = false;
  }

  let metadataInputsHtml = '';
  // Always render visibility first
  metadataInputsHtml += createMetadataPairHtml(
    'visibility',
    manualContentMetadata.visibility
  );

  // Then render other metadata
  Object.entries(manualContentMetadata).forEach(([key, value]) => {
    if (key !== 'visibility') {
      metadataInputsHtml += createMetadataPairHtml(key, value);
    }
  });

  const container = getElementById('metadata-inputs');
  const nameElement = getElementById('current-file-name');
  if (nameElement) nameElement.innerHTML = fileNameHtml;
  if (container) container.innerHTML = metadataInputsHtml;

  // Setup event listeners (reuse existing logic)
  if (container) {
    if (!container.dataset.listenersAttached) {
      container.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-remove-pair]');
        if (removeBtn) {
          e.preventDefault();
          e.stopPropagation();
          const pairId = removeBtn.dataset.removePair;
          const pair = container.querySelector(`[data-pair-id="${pairId}"]`);
          if (pair) {
            pair.remove();
            updateLinkRequirement();
          }
        }
      });

      container.addEventListener('input', (e) => {
        if (e.target.matches('[data-key="link"] .metadata-value')) {
          updateLinkRequirement();
        }
      });

      container.addEventListener(
        'blur',
        (e) => {
          if (e.target.matches('[data-key="link"] .metadata-value')) {
            updateLinkRequirement();
          }
        },
        true
      );

      container.dataset.listenersAttached = 'true';
    }

    // Add event listener for visibility changes
    const visibilitySelect = container.querySelector(
      '[data-key="visibility"] .metadata-value'
    );
    if (visibilitySelect) {
      visibilitySelect.addEventListener('change', updateLinkRequirement);
      updateLinkRequirement();
    }
  }

  // Setup add metadata button listener
  const addBtn = getElementById('add-metadata-btn');
  if (addBtn) {
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode?.replaceChild(newAddBtn, addBtn);
    newAddBtn.addEventListener('click', addMetadataPair);
  }

  const modal = getContainer('metadata-modal');
  if (modal) {
    hideModal(modal);
    showModal(modal);
  }
}

function updateManualMetadataPreview() {
  const preview = getElementById('manual-metadata-preview');
  if (!preview) return;

  if (
    !manualContentMetadata ||
    Object.keys(manualContentMetadata).length === 0
  ) {
    preview.innerHTML =
      '<span class="metadata-placeholder">No metadata set</span>';
    return;
  }

  const metadataItems = Object.entries(manualContentMetadata)
    .map(([key, value]) => {
      const displayValue = typeof value === 'boolean' ? String(value) : value;
      return `<span class="metadata-tag"><strong>${escapeHtml(
        key
      )}</strong>: ${escapeHtml(String(displayValue))}</span>`;
    })
    .join(' ');

  preview.innerHTML =
    metadataItems ||
    '<span class="metadata-placeholder">No metadata set</span>';
}

function clearManualContent() {
  const textarea = getElementById('content-textarea');
  const filenameInput = getElementById('manual-filename');
  const dbSelect = getElementById('manual-db-select');

  if (textarea) textarea.value = '';
  if (filenameInput) filenameInput.value = generateTimestampFilename();
  if (dbSelect) dbSelect.value = '';
  manualContentMetadata = { visibility: false };
  updateManualMetadataPreview();
}

async function uploadManualContent() {
  const textarea = getElementById('content-textarea');
  const filenameInput = getElementById('manual-filename');
  const dbSelect = getElementById('manual-db-select');
  const uploadBtn = getElementById('upload-manual-content-btn');

  if (!textarea || !filenameInput || !dbSelect) return;

  const content = textarea.value.trim();
  const filename = filenameInput.value.trim();
  const storeName = dbSelect.value;

  // Validation
  if (!content) {
    alert('Please enter content');
    return;
  }

  if (!filename) {
    alert('Please enter a filename');
    return;
  }

  // Ensure filename has .txt extension
  let finalFilename = filename;
  if (!finalFilename.endsWith('.txt') && !finalFilename.endsWith('.md')) {
    finalFilename = finalFilename + '.txt';
  }

  if (!storeName) {
    alert('Please select a database');
    return;
  }

  // Validate metadata
  try {
    const tempFileObj = { metadata: manualContentMetadata };
    validateFileMetadata(tempFileObj, finalFilename);
  } catch (err) {
    alert('Validation failed: ' + err.message);
    return;
  }

  setButtonLoading(uploadBtn, 'Uploading...', true);

  try {
    await ApiService.uploadTextContent(
      storeName,
      content,
      finalFilename,
      manualContentMetadata
    );
    alert('Successfully uploaded to Vector DB!');
    clearManualContent();
  } catch (err) {
    if (!handleApiError(err)) {
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    }
  } finally {
    setButtonLoading(uploadBtn, 'Uploading...', false);
  }
}
