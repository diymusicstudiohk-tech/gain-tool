import { paramsStorage, stateStorage } from '../storage/LocalStorageAdapter';
import { audioFileStorage } from '../storage/IndexedDBAdapter';

export const saveParamsToStorage = async (params) => {
    try {
        await paramsStorage.save('params', params);
    } catch (e) {
        console.error('Failed to save params:', e);
    }
};

export const loadParamsFromStorage = async () => {
    try {
        return await paramsStorage.load('params');
    } catch (e) {
        console.error('Failed to load params:', e);
        return null;
    }
};

export const saveAppStateToStorage = async (state) => {
    try {
        await stateStorage.save('state', state);
    } catch (e) {
        console.error('Failed to save app state:', e);
    }
};

export const loadAppStateFromStorage = async () => {
    try {
        return await stateStorage.load('state');
    } catch (e) {
        console.error('Failed to load app state:', e);
        return null;
    }
};

export const saveAudioFileToDB = async (fileBlob, fileName) => {
    try {
        if (!fileBlob) {
            await audioFileStorage.remove('userUpload');
            return;
        }
        await audioFileStorage.save('userUpload', { file: fileBlob, name: fileName });
    } catch (e) {
        console.error('Failed to save audio file:', e);
    }
};

export const loadAudioFileFromDB = async () => {
    try {
        return await audioFileStorage.load('userUpload');
    } catch (e) {
        console.error('Failed to load audio file:', e);
        return null;
    }
};

export const saveFileToDB = async (key, fileBlob) => {
    try {
        await audioFileStorage.save(key, { file: fileBlob });
    } catch (e) {
        console.error('Failed to save file:', e);
    }
};

export const loadFileFromDB = async (key) => {
    try {
        return await audioFileStorage.load(key);
    } catch (e) {
        console.error('Failed to load file:', e);
        return null;
    }
};

export const factoryReset = async () => {
    try {
        await paramsStorage.clear();
        await stateStorage.clear();
        await audioFileStorage.clear();
        audioFileStorage.close();
        indexedDB.deleteDatabase('CompVisualizerDB');
        window.location.reload();
    } catch (e) {
        console.error('Factory reset failed:', e);
    }
};

export const softReset = async () => {
    try {
        const currentState = await loadAppStateFromStorage();
        const preservedState = {};
        if (currentState) {
            if (currentState.currentSourceId) preservedState.currentSourceId = currentState.currentSourceId;
            if (currentState.lastPracticeSourceId) preservedState.lastPracticeSourceId = currentState.lastPracticeSourceId;
        }

        await paramsStorage.clear();
        await stateStorage.clear();

        if (Object.keys(preservedState).length > 0) {
            await saveAppStateToStorage(preservedState);
        }

        window.location.reload();
    } catch (e) {
        console.error('Soft reset failed:', e);
    }
};
