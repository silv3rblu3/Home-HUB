/**
 * StateManager - Structured Local Persistence Engine
 * Manages atomic IndexedDB read/write routines and system backups.
 */
const StateManager = (() => {
    const DB_NAME = 'HomeHubEcosystemDB';
    const DB_VERSION = 1;
    let dbInstance = null;

    /**
     * Initializes the connection to IndexedDB and verifies object stores exist.
     * @returns {Promise<IDBDatabase>}
     */
    const initDatabase = () => {
        return new Promise((resolve, reject) => {
            if (dbInstance) return resolve(dbInstance);

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const DB_VERSION = 2; // Incremented to trigger database upgrade
    
    // ... (Keep the initDatabase wrapper the same, just update the inner block)

    /**
     * Initializes the connection to IndexedDB and verifies object stores exist.
     * @returns {Promise<IDBDatabase>}
     */
    const initDatabase = () => {
        return new Promise((resolve, reject) => {
            if (dbInstance) return resolve(dbInstance);

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Core layout and global environment configuration properties
                if (!db.objectStoreNames.contains('system_settings')) {
                    db.createObjectStore('system_settings', { keyPath: 'key' });
                }
                // Isolated operational storage units for modules
                if (!db.objectStoreNames.contains('module_dashboard')) {
                    db.createObjectStore('module_dashboard', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('module_projects')) {
                    db.createObjectStore('module_projects', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('module_shopping')) {
                    db.createObjectStore('module_shopping', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('module_vehicles')) {
                    db.createObjectStore('module_vehicles', { keyPath: 'id' });
                }
                // NEW: UPC Memory Bank for offline barcode scanning
                if (!db.objectStoreNames.contains('module_upc_map')) {
                    db.createObjectStore('module_upc_map', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onerror = (event) => {
                console.error('Database critical initialization failure:', event.target.error);
                reject(event.target.error);
            };
        });
    };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onerror = (event) => {
                console.error('Database critical initialization failure:', event.target.error);
                reject(event.target.error);
            };
        });
    };

    /**
     * Safely targets an object store and executes an explicit transaction mode.
     * @param {string} storeName - target table
     * @param {string} mode - 'readonly' or 'readwrite'
     */
    const getStore = async (storeName, mode) => {
        const db = await initDatabase();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    };

    return {
        /**
         * Fetches all records from an isolated module data store.
         * @param {string} moduleId 
         * @returns {Promise<Array>}
         */
        getModuleData: async (moduleId) => {
            return new Promise(async (resolve) => {
                try {
                    const store = await getStore(`module_${moduleId}`, 'readonly');
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => resolve([]);
                } catch (err) {
                    console.error(`Failed to read data for module: ${moduleId}`, err);
                    resolve([]);
                }
            });
        },

        /**
         * Commits an absolute record snapshot to a specific module data store.
         * @param {string} moduleId 
         * @param {Object} dataObject - Record payload containing a unique 'id' key path
         */
        setModuleRecord: async (moduleId, dataObject) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const store = await getStore(`module_${moduleId}`, 'readwrite');
                    const request = store.put(dataObject);
                    request.onsuccess = () => {
                        UIBridge.updateSyncIndicator(true);
                        resolve(true);
                    };
                    request.onerror = () => {
                        UIBridge.updateSyncIndicator(false);
                        reject(request.error);
                    };
                } catch (err) {
                    UIBridge.updateSyncIndicator(false);
                    reject(err);
                }
            });
        },

        /**
         * Purges a targeted record matching a key index from a module dataset.
         * @param {string} moduleId 
         * @param {string} recordId 
         */
        deleteModuleRecord: async (moduleId, recordId) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const store = await getStore(`module_${moduleId}`, 'readwrite');
                    const request = store.delete(recordId);
                    request.onsuccess = () => resolve(true);
                    request.onerror = () => reject(request.error);
                } catch (err) {
                    reject(err);
                }
            });
        },

        /**
         * Retrieves global configuration variables from the system namespace.
         * @param {string} key 
         * @returns {Promise<any>}
         */
        getSystemSetting: async (key) => {
            return new Promise(async (resolve) => {
                try {
                    const store = await getStore('system_settings', 'readonly');
                    const request = store.get(key);
                    request.onsuccess = () => resolve(request.result ? request.result.value : null);
                    request.onerror = () => resolve(null);
                } catch (err) {
                    resolve(null);
                }
            });
        },

        /**
         * Saves a specific environment setting key-value pair.
         * @param {string} key 
         * @param {any} value 
         */
        setSystemSetting: async (key, value) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const store = await getStore('system_settings', 'readwrite');
                    const request = store.put({ key, value });
                    request.onsuccess = () => resolve(true);
                    request.onerror = () => reject(request.error);
                } catch (err) {
                    reject(err);
                }
            });
        },

        /**
         * Pulls data from every object store and compiles a single system export string.
         * @returns {Promise<string>} JSON string package
         */
        exportMasterBackup: async () => {
            const db = await initDatabase();
            const backupPayload = {
                timestamp: new Date().toISOString(),
                version: DB_VERSION,
                stores: {}
            };

            const storeNames = Array.from(db.objectStoreNames);
            for (const name of storeNames) {
                backupPayload.stores[name] = await new Promise((resolve) => {
                    const tx = db.transaction(name, 'readonly');
                    const store = tx.objectStore(name);
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });
            }
            return JSON.stringify(backupPayload, null, 2);
        },

        /**
         * Accepts a master backup file string and runs an absolute transactional rewrite.
         * @param {string} jsonStringString 
         * @returns {Promise<boolean>}
         */
        importMasterBackup: async (jsonStringString) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const backup = JSON.parse(jsonStringString);
                    if (!backup.stores || !backup.version) {
                        throw new Error('Malformed backup object hierarchy missing target stores.');
                    }

                    const db = await initDatabase();
                    for (const storeName in backup.stores) {
                        if (db.objectStoreNames.contains(storeName)) {
                            const tx = db.transaction(storeName, 'readwrite');
                            const store = tx.objectStore(storeName);
                            
                            // Clear existing metrics before writing archive indices
                            store.clear();
                            for (const item of backup.stores[storeName]) {
                                store.put(item);
                            }
                        }
                    }
                    resolve(true);
                } catch (err) {
                    console.error('Master database restore crash routine initialized:', err);
                    reject(err);
                }
            });
        }
    };
})();