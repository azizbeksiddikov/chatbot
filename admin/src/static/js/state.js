/**
 * Simple application state
 */

// Application state - simple variables
export let dbs = [];
export let current_db = null;
export let selected_files = [];
export let current_view = 'db'; // 'db' or 'manual'

export function setDbs(newDbs) {
  dbs = newDbs;
}

export function setCurrentDb(db) {
  current_db = db;
}

export function setSelectedFiles(files) {
  selected_files = files;
}

export function setCurrentView(view) {
  current_view = view;
}
