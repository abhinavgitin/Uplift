/**
 * UpLift - Chrome Storage Helpers
 * Wrapper for chrome.storage.local API
 */

const Storage = {
  /**
   * Get a value from storage
   */
  async get(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result[key]);
        }
      });
    });
  },

  /**
   * Get multiple values from storage
   */
  async getMultiple(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  },

  /**
   * Set a value in storage
   */
  async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Set multiple values in storage
   */
  async setMultiple(items) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Remove a value from storage
   */
  async remove(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  },

  /**
   * Clear all storage
   */
  async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  },

  // ─── Code Snapshots ───

  /**
   * Save code snapshot for a problem
   */
  async saveSnapshot(problemUrl, code) {
    const key = `snapshot_${problemUrl}`;
    const snapshot = {
      code,
      timestamp: Date.now()
    };
    await this.set(key, snapshot);
    return snapshot;
  },

  /**
   * Get code snapshot for a problem
   */
  async getSnapshot(problemUrl) {
    const key = `snapshot_${problemUrl}`;
    return await this.get(key);
  },

  // ─── Hint History ───

  /**
   * Save revealed hints for a problem
   */
  async saveHints(problemUrl, hints) {
    const key = `hints_${problemUrl}`;
    await this.set(key, hints);
  },

  /**
   * Get revealed hints for a problem
   */
  async getHints(problemUrl) {
    const key = `hints_${problemUrl}`;
    return await this.get(key) || { 1: null, 2: null, 3: null };
  },

  // ─── Settings ───

  /**
   * Get all settings
   */
  async getSettings() {
    const defaults = {
      autoAnalyze: false,
      darkMode: false,
      compactView: false
    };
    const saved = await this.get('settings') || {};
    return { ...defaults, ...saved };
  },

  /**
   * Update settings
   */
  async updateSettings(updates) {
    const current = await this.getSettings();
    const newSettings = { ...current, ...updates };
    await this.set('settings', newSettings);
    return newSettings;
  },

  // Future settings helpers can be added here.
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
