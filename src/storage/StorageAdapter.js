/**
 * Base class for storage adapters
 * Defines the interface for different storage implementations
 */
export class StorageAdapter {
    /**
     * Save data to storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {Promise<void>}
     */
    async save(key, value) {
        throw new Error('save() must be implemented by subclass');
    }

    /**
     * Load data from storage
     * @param {string} key - Storage key
     * @returns {Promise<*>} Stored value or null
     */
    async load(key) {
        throw new Error('load() must be implemented by subclass');
    }

    /**
     * Remove data from storage
     * @param {string} key - Storage key
     * @returns {Promise<void>}
     */
    async remove(key) {
        throw new Error('remove() must be implemented by subclass');
    }

    /**
     * Clear all data from storage
     * @returns {Promise<void>}
     */
    async clear() {
        throw new Error('clear() must be implemented by subclass');
    }

    /**
     * Check if key exists in storage
     * @param {string} key - Storage key
     * @returns {Promise<boolean>}
     */
    async has(key) {
        const value = await this.load(key);
        return value !== null;
    }
}
