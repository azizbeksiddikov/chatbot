/**
 * API service for backend communication
 */

const API_URL = '/api';

export class ApiService {
  /**
   * Check authentication status
   */
  static async checkAuth() {
    const res = await fetch(`${API_URL}/auth/check`);
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    return data.authenticated === true;
  }

  /**
   * Login with ID and password
   */
  static async login(id, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password }),
      credentials: 'include', // Include cookies for session
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Logout
   */
  static async logout() {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }
  /**
   * Fetch all file search stores
   */
  static async fetchDbs() {
    const res = await fetch(`${API_URL}/dbs`, {
      credentials: 'include', // Include cookies for session
    });
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  /**
   * Create a new file search store
   */
  static async createDb(display_name) {
    const res = await fetch(`${API_URL}/dbs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: display_name }),
      credentials: 'include',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Delete a file search store
   */
  static async deleteDb(name) {
    const res = await fetch(`${API_URL}/dbs?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Fetch files in a store
   */
  static async fetchFiles(storeName) {
    const res = await fetch(
      `${API_URL}/files?store_name=${encodeURIComponent(storeName)}`,
      {
        credentials: 'include',
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Upload a file to a store
   */
  static async uploadFile(store_name, file, custom_name, metadata) {
    const formData = new FormData();
    formData.append('store_name', store_name);

    // Preserve original filename if unchanged
    const fileToUpload =
      custom_name === file.name
        ? file // Use original file object
        : new File([file], custom_name, {
            type: file.type,
          });

    formData.append('file', fileToUpload);

    // Attach metadata as JSON string
    if (metadata && Object.keys(metadata).length > 0) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const res = await fetch(`${API_URL}/files`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  /**
   * Delete a file from a store
   */
  static async deleteFile(docName) {
    const res = await fetch(
      `${API_URL}/files?name=${encodeURIComponent(docName)}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Get file content URL for viewing
   */
  static getFileViewUrl(docName) {
    return `${API_URL}/files/view?name=${encodeURIComponent(docName)}`;
  }

  /**
   * Upload text content as a file to a store
   */
  static async uploadTextContent(store_name, content, filename, metadata) {
    const res = await fetch(`${API_URL}/files/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_name: store_name,
        content: content,
        filename: filename,
        metadata: metadata,
      }),
      credentials: 'include',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  /**
   * Fetch all conversations
   */
  static async fetchConversations() {
    const res = await fetch(`${API_URL}/conversations`, {
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Get conversation content URL for viewing
   */
  static getConversationViewUrl(filename, environment = 'dev') {
    return `${API_URL}/conversations/view?filename=${encodeURIComponent(
      filename
    )}&environment=${encodeURIComponent(environment)}`;
  }

  /**
   * Delete a conversation by filename
   */
  static async deleteConversation(filename, environment = 'dev') {
    const url = `${API_URL}/conversations/delete?filename=${encodeURIComponent(
      filename
    )}&environment=${encodeURIComponent(environment)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }
}
