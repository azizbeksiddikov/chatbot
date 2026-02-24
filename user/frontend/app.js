/**
 * Frontend application for Gemini AI Chatbot.
 *
 * Handles:
 * - User input and message display
 * - Real-time streaming responses via Server-Sent Events (SSE)
 * - Citation display and token tracking
 * - Chat history management
 */

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatHistory = document.getElementById("chat-history");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");
const modelSelect = document.getElementById("model-select");
const modeSelect = document.getElementById("mode-select");
const fileInput = document.getElementById("file-input");
const fileListEl = document.getElementById("file-list");
const fileListWrap = document.querySelector(".file-list-wrap");
const fileListEmptyEl = document.getElementById("file-list-empty");
const filesActiveHintEl = document.getElementById("files-active-hint");
const tabFilesCountEl = document.getElementById("tab-files-count");
const tabChatCountEl = document.getElementById("tab-chat-count");
const tabFiles = document.getElementById("tab-files");
const tabChat = document.getElementById("tab-chat");
const panelFiles = document.getElementById("files-panel");
const panelChat = document.getElementById("chat-panel");

// Model list (user frontend)
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];

// Populate model dropdown on load
if (modelSelect) {
  modelSelect.innerHTML = "";
  GEMINI_MODELS.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    modelSelect.appendChild(opt);
  });
}

// Citation relevance threshold
const CITATION_HIGH_THRESHOLD = 3;

// Session file list: { document_name, display_name }[] (only confirmed uploads; loading rows are not counted)
let sessionFiles = [];

/** Update tab badges and Chat "files in context" hint. Only counts confirmed files, not uploads in progress. */
function updateFileCounts() {
  const n = sessionFiles.length;
  if (tabFilesCountEl) {
    tabFilesCountEl.textContent = n > 0 ? n : "";
  }
  if (tabChatCountEl) {
    tabChatCountEl.textContent = n > 0 ? n : "";
  }
  if (filesActiveHintEl) {
    if (n === 0) {
      filesActiveHintEl.textContent = "No files in context. Add documents in the Files tab.";
      filesActiveHintEl.classList.remove("has-files");
    } else {
      filesActiveHintEl.textContent = n === 1 ? "1 file in context" : `${n} files in context`;
      filesActiveHintEl.classList.add("has-files");
    }
  }
  if (fileListWrap) {
    const hasAnyRows = fileListEl && fileListEl.querySelector(".file-row");
    fileListWrap.classList.toggle("has-files", !!hasAnyRows);
  }
}

// ============================================================================
// TABS
// ============================================================================

function showPanel(panel) {
  const isFiles = panel === "files";
  panelFiles.classList.toggle("active", isFiles);
  panelChat.classList.toggle("active", !isFiles);
  panelFiles.hidden = !isFiles;
  panelChat.hidden = isFiles;
  tabFiles.classList.toggle("active", isFiles);
  tabChat.classList.toggle("active", !isFiles);
  tabFiles.setAttribute("aria-selected", isFiles);
  tabChat.setAttribute("aria-selected", !isFiles);
  if (isFiles) refreshFileList();
  updateFileCounts();
}

if (tabFiles) tabFiles.addEventListener("click", () => showPanel("files"));
if (tabChat) tabChat.addEventListener("click", () => showPanel("chat"));

// ============================================================================
// FILES: list, upload (with loading), delete
// ============================================================================

async function refreshFileList() {
  try {
    const res = await fetch("/api/files");
    const data = await res.json().catch(() => ({}));
    sessionFiles = (data.files || []).slice();
    renderFileList();
    updateFileCounts();
  } catch (err) {
    console.error("Failed to load files:", err);
    renderFileList();
    updateFileCounts();
  }
}

function renderFileList() {
  if (!fileListEl) return;
  fileListEl.innerHTML = "";
  sessionFiles.forEach((f) => {
    const row = document.createElement("div");
    row.className = "file-row";
    row.dataset.documentName = f.name;
    row.innerHTML = `
      <span class="file-name">${escapeHtml(f.display_name)}</span>
      <button type="button" class="file-delete" aria-label="Delete">Delete</button>
    `;
    row.querySelector(".file-delete").addEventListener("click", () => deleteFile(f.name, row));
    fileListEl.appendChild(row);
  });
  updateFileCounts();
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function addLoadingRow(filename) {
  if (!fileListEl) return null;
  if (fileListWrap) fileListWrap.classList.add("has-files");
  const row = document.createElement("div");
  row.className = "file-row loading";
  row.dataset.loading = "1";
  row.innerHTML = `<span class="file-name">${escapeHtml(filename)}</span>`;
  fileListEl.appendChild(row);
  return row;
}

function removeLoadingRow(row) {
  if (row && row.parentNode) row.remove();
}

async function deleteFile(documentName, rowEl) {
  if (!rowEl) return;
  rowEl.querySelector(".file-delete").disabled = true;
  try {
    const res = await fetch("/api/files/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_name: documentName }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok) {
      sessionFiles = sessionFiles.filter((f) => f.name !== documentName);
      rowEl.remove();
      updateFileCounts();
    }
  } catch (err) {
    console.error("Delete failed:", err);
  }
  rowEl.querySelector(".file-delete").disabled = false;
}

if (fileInput) {
  fileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    for (const file of files) {
      const loadingRow = addLoadingRow(file.name);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        removeLoadingRow(loadingRow);
        if (data.ok) {
          const item = { name: data.document_name, display_name: data.filename || file.name };
          sessionFiles.push(item);
          const row = document.createElement("div");
          row.className = "file-row";
          row.dataset.documentName = item.name;
          row.innerHTML = `
            <span class="file-name">${escapeHtml(item.display_name)}</span>
            <button type="button" class="file-delete" aria-label="Delete">Delete</button>
          `;
          row.querySelector(".file-delete").addEventListener("click", () => deleteFile(item.name, row));
          fileListEl.appendChild(row);
          updateFileCounts();
        } else {
          const errRow = document.createElement("div");
          errRow.className = "file-row error";
          errRow.innerHTML = `<span class="file-name">${escapeHtml(file.name)}: ${escapeHtml(data.error || "Upload failed")}</span>`;
          fileListEl.appendChild(errRow);
          setTimeout(() => errRow.remove(), 4000);
        }
      } catch (err) {
        removeLoadingRow(loadingRow);
        console.error("Upload error:", err);
        const errRow = document.createElement("div");
        errRow.className = "file-row error";
        errRow.innerHTML = `<span class="file-name">${escapeHtml(file.name)}: Network error</span>`;
        fileListEl.appendChild(errRow);
        setTimeout(() => errRow.remove(), 4000);
      }
    }
  });
}

// Load file list once on load (Files tab is default)
refreshFileList();
updateFileCounts();

// ============================================================================
// EVENT LISTENERS (Chat)
// ============================================================================


/**
 * Clear chat history button handler.
 * Sends request to backend to clear history and resets UI.
 */
clearBtn.addEventListener("click", async () => {
  if (confirm("Are you sure you want to clear the chat history?")) {
    try {
      const response = await fetch("/api/chat/clear", { method: "POST" });
      const data = await response.json();
      if (data.status === "success") {
        chatHistory.innerHTML = "";
        addMessage("Chat history cleared. How can I help you now?", "ai");
      }
    } catch (err) {
      // Silently handle errors - user can retry if needed
      console.error("Error clearing history:", err);
    }
  }
});

/**
 * Auto-resize textarea as user types.
 * Expands vertically to fit content, up to a maximum height.
 */
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

/**
 * Handle Enter key for message submission.
 * - Enter: Submit message
 * - Shift+Enter: New line in textarea
 */
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

/**
 * Main form submission handler.
 *
 * Flow:
 * 1. Display user message
 * 2. Show "Thinking..." indicator
 * 3. Stream response from backend via SSE
 * 4. Convert "Thinking..." to actual message on first chunk
 * 5. Update message content as chunks arrive
 * 6. Display citations when available
 */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // Display user message and clear input
  addMessage(text, "user");
  userInput.value = "";
  userInput.style.height = "auto";
  setLoading(true);

  try {
    const modelId = modelSelect && modelSelect.value ? modelSelect.value : null;
    const instructionMode = modeSelect && modeSelect.value ? modeSelect.value : null;
    const response = await fetch("/api/chat/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        model_id: modelId || undefined,
        instruction_mode: instructionMode || undefined,
      }),
    });

    if (!response.ok) throw new Error("Failed to connect to server");

    // Set up SSE stream reader
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiMessageContent = null;
    let fullText = "";

    // Get reference to loading indicator for smooth transition
    const loadingDiv = document.getElementById("loading-indicator");
    let loadingContent = null;
    if (loadingDiv) {
      loadingContent = loadingDiv.querySelector(".content");
    }

    // Process stream chunks
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode chunk and split by newlines (SSE format)
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        // SSE format: "data: {json}\n\n"
        if (!line.startsWith("data: ")) continue;

        const dataStr = line.slice(6).trim();

        // Check for stream completion marker
        if (dataStr === "[DONE]") break;

        if (!dataStr) continue;

        // Parse JSON data
        let data;
        try {
          data = JSON.parse(dataStr);
        } catch (parseError) {
          // Skip malformed JSON lines
          continue;
        }

        // Handle errors from backend
        if (data.error) {
          setLoading(false);
          addMessage(`Error: ${data.error}`, "ai", true);
          break;
        }

        // Handle text chunks
        if (data.chunk) {
          if (!aiMessageContent) {
            // Convert loading indicator to actual message on first chunk
            // This prevents the message from disappearing/reappearing
            if (loadingDiv && loadingContent) {
              // Remove loading styling and ID
              loadingDiv.classList.remove("loading");
              loadingDiv.removeAttribute("id");
              aiMessageContent = loadingContent;
              aiMessageContent.innerHTML = "";
            } else {
              // Fallback: create new message if loading indicator not found
              aiMessageContent = addMessage("", "ai");
            }
          }

          // Accumulate text and render markdown
          fullText += data.chunk;
          aiMessageContent.innerHTML = marked.parse(fullText);

          // Auto-scroll to bottom as content arrives
          scrollToBottom();
        }

        // Handle metadata (citations) - sent at end of stream
        if (data.citations && data.citations.length > 0) {
          const citations = data.citations.map((c) =>
            typeof c === "string" ? { title: c, relevance_score: 1 } : c
          );
          const contentWrapper = aiMessageContent.parentElement;
          addCitationsToMessage(contentWrapper, citations);
        }
      }
    }
  } catch (err) {
    setLoading(false);
    const errorMsg = err.message || "Network error. Please try again.";
    addMessage(`System Error: ${errorMsg}`, "ai", true);
  } finally {
    // Final cleanup: remove loading indicator if it still exists
    const remainingLoader = document.getElementById("loading-indicator");
    if (remainingLoader) {
      remainingLoader.remove();
    }
  }
});

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

/**
 * Scroll chat container to bottom smoothly.
 * Ensures the latest messages are visible.
 * Uses requestAnimationFrame to ensure DOM is fully updated before scrolling.
 */
function scrollToBottom() {
  const chatContainer = chatHistory.parentElement;
  // Use requestAnimationFrame to ensure DOM is fully updated
  requestAnimationFrame(() => {
    // Scroll to maximum height to show the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

/**
 * Add a message bubble to the chat history.
 *
 * @param {string} text - Message text content
 * @param {string} sender - "user" or "ai"
 * @param {boolean} isError - Whether this is an error message
 * @param {Array} citations - Optional citations to display
 * @returns {HTMLElement} The content div element (for streaming updates)
 */
function addMessage(text, sender, isError = false, citations = []) {
  // Create message container
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", `${sender}-message`);
  if (isError) messageDiv.classList.add("error-message");

  // Create avatar
  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = sender === "user" ? "ME" : "AI";

  // Create content wrapper
  const contentWrapper = document.createElement("div");
  contentWrapper.classList.add("content-wrapper");

  // Create content div
  const content = document.createElement("div");
  content.classList.add("content");

  // Render content (markdown for AI, plain text for user)
  if (sender === "ai") {
    content.innerHTML = text ? marked.parse(text) : "";
  } else {
    content.textContent = text;
  }
  contentWrapper.appendChild(content);

  // Add citations if provided
  if (citations && citations.length > 0) {
    addCitationsToMessage(contentWrapper, citations);
  }

  // Assemble message structure
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentWrapper);
  chatHistory.appendChild(messageDiv);

  // Scroll to bottom to show new message
  scrollToBottom();

  // Return content div for streaming updates
  return content;
}

/**
 * Add citation list to a message.
 *
 * Citations are sorted by relevance score and displayed with visual
 * indicators (badges) showing their relevance level.
 *
 * @param {HTMLElement} wrapper - Content wrapper element to add citations to
 * @param {Array} citations - Array of citation objects with title, relevance_score, etc.
 */
function addCitationsToMessage(wrapper, citations) {
  // Remove existing citations if any (for updates)
  const existingCitations = wrapper.querySelector(".citations");
  if (existingCitations) {
    existingCitations.remove();
  }

  const citDiv = document.createElement("div");
  citDiv.classList.add("citations");

  // Sort citations by relevance score (descending)
  const sortedCitations = [...citations].sort((a, b) => {
    const scoreA = typeof a === "object" ? a.relevance_score || 0 : 0;
    const scoreB = typeof b === "object" ? b.relevance_score || 0 : 0;
    return scoreB - scoreA;
  });

  // Generate citation HTML
  citDiv.innerHTML = `<span class="citations-label">Sources:</span><ul>${sortedCitations
    .map((c) => {
      const title = typeof c === "object" ? c.title : c;
      const score = typeof c === "object" ? c.relevance_score || 0 : 0;

      // Determine relevance level: score >= 3 is "Highly relevant", otherwise "Relevant"
      let relevanceClass = "relevance-medium";
      let relevanceText = "Relevant";
      if (score >= CITATION_HIGH_THRESHOLD) {
        relevanceClass = "relevance-high";
        relevanceText = "Highly relevant";
      }

      // Generate citation item HTML
      return `<li class="citation-item ${relevanceClass}" data-title="${title}">
        <span class="citation-title">${title}</span>
        ${
          score > 0
            ? `<span class="relevance-badge ${relevanceClass}" title="${relevanceText} (${score} references)">${score}</span>`
            : ""
        }
      </li>`;
    })
    .join("")}</ul>`;

  wrapper.appendChild(citDiv);

  // Scroll to bottom after citations are added (they increase content height)
  scrollToBottom();
}

/**
 * Show or hide the "Thinking..." loading indicator.
 *
 * The loading indicator is created as a message bubble that will be
 * converted to the actual AI response when the first chunk arrives.
 * This provides a smooth transition without the message disappearing.
 *
 * @param {boolean} isLoading - Whether to show or hide the indicator
 */
function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  if (isLoading) {
    // Create loading indicator message
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loading-indicator";
    loadingDiv.classList.add("message", "ai-message", "loading");
    loadingDiv.innerHTML = `
            <div class="avatar">AI</div>
            <div class="content-wrapper">
                <div class="content">Thinking...</div>
            </div>
        `;
    chatHistory.appendChild(loadingDiv);
    scrollToBottom();
  } else {
    // Remove loading indicator (if not already converted to message)
    const loader = document.getElementById("loading-indicator");
    if (loader) loader.remove();
  }
}
