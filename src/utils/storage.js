
// LocalStorage Keys
const STORAGE_KEY_PARAMS = 'comp_v2_params';
const STORAGE_KEY_APP_STATE = 'comp_v2_app_state';

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
