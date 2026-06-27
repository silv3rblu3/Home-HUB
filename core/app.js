/**
 * HomeHub Master Bootloader & Application Router
 * Initializes state, handles routing, and binds global UI listeners.
 */
const HomeHub = (() => {
    let moduleRegistry = [];
    let currentModuleId = null;

    // --- DOM Elements ---
    const sidebar = document.getElementById('sidebar');
    const navList = document.getElementById('module-nav-list');
    const appStage = document.getElementById('app-stage');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const omniSearch = document.getElementById('omni-search');
    const quickAddBtn = document.getElementById('global-quick-add-btn');

    const loadRegistry = async () => {
        try {
            const response = await fetch('./apps/modules.json');
            moduleRegistry = await response.json();
            
            navList.innerHTML = '';
            
            moduleRegistry.forEach(mod => {
                const btn = document.createElement('button');
                btn.className = 'nav-btn';
                btn.setAttribute('data-target', mod.id);
                btn.innerHTML = `<span style="font-size: 1.2rem;">${mod.icon}</span> ${mod.name}`;
                
                btn.addEventListener('click', () => {
                    if (window.innerWidth <= 768) sidebar.classList.remove('open');
                    loadModule(mod.id);
                });
                
                navList.appendChild(btn);
            });
        } catch (err) {
            UIBridge.showToast('Failed to load system modules', 'error');
        }
    };

    const loadModule = async (moduleId) => {
        if (currentModuleId === moduleId) return; 
        
        const moduleConfig = moduleRegistry.find(m => m.id === moduleId);
        if (!moduleConfig && moduleId !== 'settings') {
            UIBridge.showToast('Module not found', 'error');
            return;
        }

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-target') === moduleId) btn.classList.add('active');
        });

        appStage.innerHTML = '<div style="text-align:center; margin-top: 50px; color: var(--text-secondary);">Loading module...</div>';
        currentModuleId = moduleId;

        const modPath = moduleId === 'settings' ? './apps/settings/' : moduleConfig.path;

        try {
            await dynamicallyLoadScript(`${modPath}template.js`);
            await dynamicallyLoadScript(`${modPath}app.js`);
            
            const renderFuncName = `render${capitalizeFirstLetter(moduleId)}App`;
            if (typeof window[renderFuncName] === 'function') {
                appStage.innerHTML = window[renderFuncName]();
            }

            const initFuncName = `init${capitalizeFirstLetter(moduleId)}Logic`;
            if (typeof window[initFuncName] === 'function') {
                window[initFuncName]();
            }

        } catch (err) {
            console.error(err);
            appStage.innerHTML = `<div class="app-card" style="border-color: var(--danger-color); color: var(--danger-color);">
                <h3>System Error</h3>
                <p>Failed to mount the ${moduleId} module environment. Check console for script errors.</p>
            </div>`;
        }
    };

    const dynamicallyLoadScript = (src) => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to route script: ${src}`));
            document.body.appendChild(script);
        });
    };

    const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);

    /**
     * NEW: Binds the global search bar to query across all module databases.
     */
    const bindOmniSearch = () => {
        let searchTimeout;
        const searchDropdown = document.createElement('div');
        searchDropdown.id = 'omni-search-results';
        searchDropdown.style.cssText = 'position:absolute; top:55px; left:20px; right:20px; max-height:400px; overflow-y:auto; background:var(--bg-surface-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); box-shadow:var(--shadow-md); display:none; z-index:2000; padding:10px; flex-direction:column; gap:8px;';
        
        // Append right under the header
        document.getElementById('global-header').appendChild(searchDropdown);

        omniSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const term = e.target.value.toLowerCase().trim();
            
            if (!term) {
                searchDropdown.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                searchDropdown.innerHTML = '<div style="color:var(--text-secondary); text-align:center;">Searching...</div>';
                searchDropdown.style.display = 'flex';

                let resultsHTML = '';
                let matchCount = 0;

                // Query multiple stores concurrently
                const [projects, vehicles, shopping] = await Promise.all([
                    StateManager.getModuleData('projects'),
                    StateManager.getModuleData('vehicles'),
                    StateManager.getModuleData('shopping')
                ]);

                // Filter logic
                const processMatches = (arr, tag, moduleName, searchKey) => {
                    arr.forEach(item => {
                        const targetText = (item[searchKey] || '').toLowerCase();
                        if (targetText.includes(term)) {
                            resultsHTML += `<div onclick="HomeHub.loadModule('${moduleName}')" style="padding:10px; background:var(--bg-main); border-radius:var(--radius-sm); cursor:pointer; border:1px solid var(--border-color);">
                                <span style="color:var(--accent-primary); font-weight:bold;">[${tag}]</span> ${item[searchKey]}
                            </div>`;
                            matchCount++;
                        }
                    });
                };

                processMatches(projects, 'Project', 'projects', 'title');
                processMatches(vehicles, 'Vehicle', 'vehicles', 'make');
                processMatches(shopping, 'Shopping', 'shopping', 'itemName');

                searchDropdown.innerHTML = matchCount === 0 
                    ? '<div style="color:var(--text-secondary); text-align:center;">No matches found.</div>' 
                    : resultsHTML;
            }, 350);
        });

        // Close dropdown when clicking away
        document.addEventListener('click', (e) => {
            if (e.target !== omniSearch && !searchDropdown.contains(e.target)) {
                searchDropdown.style.display = 'none';
            }
        });
        
        // Expose public navigation method so the dynamically generated HTML can click-through
        HomeHub.loadModule = loadModule;
    };

    const bindGlobalEvents = () => {
        mobileMenuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

        const settingsBtn = document.querySelector('.nav-btn[data-module="settings"]');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                if (window.innerWidth <= 768) sidebar.classList.remove('open');
                loadModule('settings');
            });
        }

        quickAddBtn.addEventListener('click', async () => {
            const rawInput = await UIBridge.prompt('Quick Add Item', 'e.g., "buy brake fluid for Tahoe"');
            if (!rawInput) return;

            const parsedData = NLPParser.processCommand(rawInput);
            
            if (parsedData.targetModule === 'unknown') {
                UIBridge.showToast('Added as unassigned draft.', 'success');
            } else {
                EventBroker.broadcast(`${parsedData.targetModule.toUpperCase()}:QUICK_ADD`, parsedData.payload);
                UIBridge.showToast(`Routed to ${parsedData.targetModule} module`, 'success');
            }
        });

        window.addEventListener('online', () => UIBridge.showToast('Connection Restored', 'success'));
        window.addEventListener('offline', () => UIBridge.showToast('Running Offline Mode', 'warning'));
        
        bindOmniSearch();
    };

    return {
        boot: async () => {
            await loadRegistry();
            bindGlobalEvents();
            loadModule('dashboard');
        },
        loadModule // Exported for the Omni-Search onclick handlers
    };
})();

document.addEventListener('DOMContentLoaded', () => HomeHub.boot());