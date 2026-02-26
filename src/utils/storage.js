
// LocalStorage Keys
const STORAGE_KEY_PARAMS = 'comp_v2_params';
const STORAGE_KEY_APP_STATE = 'comp_v2_app_state';
const SOURCE_PARAMS_PREFIX = 'comp_v2_src_';
const STORAGE_KEY_TOOLTIPS_OFF = 'comp_v2_tooltips_off';

// IndexedDB Config
const DB_NAME = 'CompVisualizerDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_files';
const AUDIO_KEY = 'user_upload_file';

// --- LocalStorage Helpers ---

export const saveParamsToStorage = (params) => {
    try {
        localStorage.setItem(STORAGE_KEY_PARAMS, JSON.stringify(params));
    } catch (e) {
        console.error("Failed to save params to storage", e);
    }
};

export const loadParamsFromStorage = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PARAMS);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error("Failed to load params from storage", e);
        return null;
    }
};

export const saveAppStateToStorage = (state) => {
    try {
        localStorage.setItem(STORAGE_KEY_APP_STATE, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save app state", e);
    }
};

export const loadAppStateFromStorage = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_APP_STATE);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
};

export const clearLocalStorage = () => {
    localStorage.removeItem(STORAGE_KEY_PARAMS);
    localStorage.removeItem(STORAGE_KEY_APP_STATE);
    localStorage.removeItem(STORAGE_KEY_TOOLTIPS_OFF);
    clearAllSourceParams();
};

export const saveTooltipsOff = (off) => {
    try {
        if (off) localStorage.setItem(STORAGE_KEY_TOOLTIPS_OFF, '1');
        else localStorage.removeItem(STORAGE_KEY_TOOLTIPS_OFF);
    } catch (_) {}
};

export const loadTooltipsOff = () => {
    try { return localStorage.getItem(STORAGE_KEY_TOOLTIPS_OFF) === '1'; }
    catch (_) { return false; }
};

// --- Per-Source Parameter Storage ---

export const saveParamsForSource = (sourceId, snapshot) => {
    if (!sourceId) return;
    try {
        localStorage.setItem(SOURCE_PARAMS_PREFIX + sourceId, JSON.stringify(snapshot));
    } catch (e) {
        console.error("Failed to save per-source params", e);
    }
};

export const loadParamsForSource = (sourceId) => {
    if (!sourceId) return null;
    try {
        const raw = localStorage.getItem(SOURCE_PARAMS_PREFIX + sourceId);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error("Failed to load per-source params", e);
        return null;
    }
};

export const clearAllSourceParams = () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(SOURCE_PARAMS_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
};

// --- IndexedDB Helpers ---

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

export const saveAudioFileToDB = async (fileBlob, fileName) => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            // We store an object with the file and metadata
            const request = store.put({ file: fileBlob, name: fileName }, AUDIO_KEY);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Save Error:", e);
        return false;
    }
};

export const loadAudioFileFromDB = async () => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(AUDIO_KEY);
            request.onsuccess = () => {
                if (request.result) resolve(request.result);
                else resolve(null);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Load Error:", e);
        return null;
    }
};

// [NEW] Generic File Storage for Caching
export const saveFileToDB = async (key, fileBlob) => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(fileBlob, key);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Cache Save Error:", e);
        return false;
    }
};

export const loadFileFromDB = async (key) => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => {
                if (request.result) resolve(request.result);
                else resolve(null);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Cache Load Error:", e);
        return null;
    }
};

export const clearAudioDB = async () => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.warn("Could not clear IndexedDB", e);
        return false;
    }
};

// --- Custom Practice Audio (multiple files) ---

const CUSTOM_AUDIO_INDEX_KEY = 'custom_audio_index';
const customAudioKey = (id) => `custom_audio_${id}`;

export const loadCustomAudioIndexFromDB = async () => {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(CUSTOM_AUDIO_INDEX_KEY);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    } catch (_) { return []; }
};

export const saveCustomAudioIndexToDB = async (index) => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const req = tx.objectStore(STORE_NAME).put(index, CUSTOM_AUDIO_INDEX_KEY);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    } catch (_) { return false; }
};

export const saveCustomAudioBlobToDB = async (id, blob) => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const req = tx.objectStore(STORE_NAME).put(blob, customAudioKey(id));
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    } catch (_) { return false; }
};

export const loadCustomAudioBlobFromDB = async (id) => {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(customAudioKey(id));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (_) { return null; }
};

export const deleteCustomAudioBlobFromDB = async (id) => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const req = tx.objectStore(STORE_NAME).delete(customAudioKey(id));
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    } catch (_) { return false; }
};

export const factoryReset = async () => {
    clearLocalStorage();
    await clearAudioDB();
    window.location.reload();
};

export const softReset = () => {
    // 1. Get current state to preserve simple ID strings
    const currentState = loadAppStateFromStorage();
    const preservedState = {};
    if (currentState) {
        if (currentState.currentSourceId) preservedState.currentSourceId = currentState.currentSourceId;
        if (currentState.lastPracticeSourceId) preservedState.lastPracticeSourceId = currentState.lastPracticeSourceId;
    }

    // 2. Clear all LocalStorage (Params & State)
    clearLocalStorage();

    // 3. Restore only the source IDs
    if (Object.keys(preservedState).length > 0) {
        saveAppStateToStorage(preservedState);
    }

    // 4. Do NOT clear IndexedDB (preserves uploaded audio)

    // 5. Reload to apply defaults to everything else
    window.location.reload();
};
