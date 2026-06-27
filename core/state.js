/**
 * StateManager - Structured Local Persistence Engine
 * Manages atomic IndexedDB read/write routines and system backups.
 */
const StateManager = (() => {
    const DB_NAME = 'HomeHubEcosystemDB';
    const DB_VERSION = 2; // Incremented to ensure correct store initialization
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
                const db = event.target.result;
                const stores = [
                    'system_settings', 
                    'module_dashboard', 
                    'module_projects', 
                    'module_shopping', 
                    'module_vehicles', 
                    'module_upc_map'
                ];
                
                stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'id' });
                    }
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
     */
    const getStore = async (storeName, mode) => {
        const db = await initDatabase();
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    };

    return {
        // --- Core Module Data Access ---
        getModuleData: async (moduleId) => {
            try {
                const store = await getStore(`module_${moduleId}`, 'readonly');
                return new Promise((resolve) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => {
                        console.error(`Read Error in ${moduleId}:`, req.error);
                        resolve([]);
                    };
                });
            } catch (err) { 
                console.error(`Get Error in ${moduleId}:`, err); 
                return []; 
            }
        },

        setModuleRecord: async (moduleId, dataObject) => {
            try {
                const store = await getStore(`module_${moduleId}`, 'readwrite');
                return new Promise((resolve, reject) => {
                    const req = store.put(dataObject);
                    req.onsuccess = () => {
                        UIBridge.updateSyncIndicator(true);
                        resolve(true);
                    };
                    req.onerror = () => {
                        console.error(`Save Error in ${moduleId}:`, req.error);
                        UIBridge.updateSyncIndicator(false);
                        reject(req.error);
                    };
                });
            } catch (err) { 
                console.error(`Transaction Error in ${moduleId}:`, err); 
                UIBridge.updateSyncIndicator(false);
                throw err; 
            }
        },

        deleteModuleRecord: async (moduleId, recordId) => {
            try {
                const store = await getStore(`module_${moduleId}`, 'readwrite');
                store.delete(recordId);
            } catch (err) {
                console.error(`Delete Error in ${moduleId}:`, err);
            }
        },

        // --- Compatibility Aliases ---
        // These ensure different naming conventions across modules still function
        getAppData: async (moduleId) => await StateManager.getModuleData(moduleId),
        setAppData: async (moduleId, data) => {
            if (Array.isArray(data)) {
                for(let item of data) await StateManager.setModuleRecord(moduleId, item);
            } else {
                await StateManager.setModuleRecord(moduleId, data);
            }
        },

        // --- System Settings ---
        getSystemSetting: async (key) => {
            try {
                const store = await getStore('system_settings', 'readonly');
                return new Promise((resolve) => {
                    const req = store.get(key);
                    req.onsuccess = () => resolve(req.result ? req.result.value : null);
                    req.onerror = () => resolve(null);
                });
            } catch (err) { return null; }
        },

        setSystemSetting: async (key, value) => {
            try {
                const store = await getStore('system_settings', 'readwrite');
                store.put({ id: key, key: key, value: value });
            } catch (err) { console.error('Settings Save Error:', err); }
        },

        // --- Master DB Management ---
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

        importMasterBackup: async (jsonString) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const backup = JSON.parse(jsonString);
                    const db = await initDatabase();
                    for (const storeName in backup.stores) {
                        if (db.objectStoreNames.contains(storeName)) {
                            const tx = db.transaction(storeName, 'readwrite');
                            const store = tx.objectStore(storeName);
                            store.clear();
                            for (const item of backup.stores[storeName]) {
                                store.put(item);
                            }
                        }
                    }
                    resolve(true);
                } catch (err) {
                    console.error('Master database restore failed:', err);
                    reject(err);
                }
            });
        }
    };
})();