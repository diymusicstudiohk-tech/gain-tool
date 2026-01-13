import { StorageAdapter } from './StorageAdapter';
import { AUDIO_CONFIG } from '../config/audio';

/**
 * LocalStorage implementation of StorageAdapter
 * For storing simple key-value data (parameters, settings)
 */
export class LocalStorageAdapter extends StorageAdapter {
    constructor(prefix = '') {
        super();
        this.prefix = prefix;
    }

    getKey(key) {
        return this.prefix ? `${this.prefix}:${key}` : key;
    }

    async save(key, value) {
        try {
            const fullKey = this.getKey(key);
            const serialized = JSON.stringify(value);
            localStorage.setItem(fullKey, serialized);
        } catch (error) {
            console.error('LocalStorage save error:', error);
            throw error;
        }
    }

    async load(key) {
        try {
            const fullKey = this.getKey(key);
            const serialized = localStorage.getItem(fullKey);
            return serialized ? JSON.parse(serialized) : null;
        } catch (error) {
            console.error('LocalStorage load error:', error);
            return null;
        }
    }

    async remove(key) {
        try {
            const fullKey = this.getKey(key);
            localStorage.removeItem(fullKey);
        } catch (error) {
            console.error('LocalStorage remove error:', error);
            throw error;
        }
    }

    async clear() {
        try {
            if (this.prefix) {
                const keys = Object.keys(localStorage);
                const prefixedKeys = keys.filter(key => key.startsWith(`${this.prefix}:`));
                prefixedKeys.forEach(key => localStorage.removeItem(key));
            } else {
                localStorage.clear();
            }
        } catch (error) {
            console.error('LocalStorage clear error:', error);
            throw error;
        }
    }
}

export const paramsStorage = new LocalStorageAdapter(AUDIO_CONFIG.LOCALSTORAGE.PARAMS_KEY);
export const stateStorage = new LocalStorageAdapter(AUDIO_CONFIG.LOCALSTORAGE.STATE_KEY);
