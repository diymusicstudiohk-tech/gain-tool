import { StorageAdapter } from './StorageAdapter';
import { AUDIO_CONFIG } from '../config/audio';

/**
 * IndexedDB implementation of StorageAdapter
 * For storing large binary data (audio files)
 */
export class IndexedDBAdapter extends StorageAdapter {
    constructor(dbName, storeName, version = 1) {
        super();
        this.dbName = dbName;
        this.storeName = storeName;
        this.version = version;
        this.db = null;
    }

    /**
     * Initialize IndexedDB connection
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    AUDIO_CONFIG.INDEXEDDB.INDEXES.forEach(index => {
                        store.createIndex(index.name, index.keyPath, { unique: index.unique });
                    });
                }
            };
        });
    }

    async getStore(mode = 'readonly') {
        const db = await this.init();
        const transaction = db.transaction([this.storeName], mode);
        return transaction.objectStore(this.storeName);
    }

    async save(key, value) {
        try {
            const store = await this.getStore('readwrite');
            const data = {
                id: key,
                ...value,
                timestamp: Date.now()
            };
            return new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('IndexedDB save error:', error);
            throw error;
        }
    }

    async load(key) {
        try {
            const store = await this.getStore('readonly');
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('IndexedDB load error:', error);
            return null;
        }
    }

    async remove(key) {
        try {
            const store = await this.getStore('readwrite');
            return new Promise((resolve, reject) => {
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('IndexedDB remove error:', error);
            throw error;
        }
    }

    async clear() {
        try {
            const store = await this.getStore('readwrite');
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('IndexedDB clear error:', error);
            throw error;
        }
    }

    /**
     * Get all keys in the store
     * @returns {Promise<Array>}
     */
    async getAllKeys() {
        try {
            const store = await this.getStore('readonly');
            return new Promise((resolve, reject) => {
                const request = store.getAllKeys();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('IndexedDB getAllKeys error:', error);
            return [];
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

export const audioFileStorage = new IndexedDBAdapter(
    AUDIO_CONFIG.INDEXEDDB.DATABASE_NAME,
    AUDIO_CONFIG.INDEXEDDB.STORE_NAME,
    AUDIO_CONFIG.INDEXEDDB.DATABASE_VERSION
);
