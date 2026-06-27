// apps/shopping/app.js

async function initShoppingLogic() {
    let shoppingData = [];
    let customTags = [];
    let currentView = 'store'; 
    let editingItemId = null;
    let stream = null; 
    let isSettingsOpen = false;

    // --- DOM Elements ---
    const stage = document.getElementById('shopping-list-stage');
    const settingsStage = document.getElementById('shopping-settings-stage');
    const modal = document.getElementById('shop-item-modal');
    const form = document.getElementById('shop-item-form');
    const btnViewStore = document.getElementById('btn-view-store');
    const btnViewProject = document.getElementById('btn-view-project');
    const searchFilter = document.getElementById('shop-filter');
    const priceTrackerContainer = document.getElementById('price-tracker-container');
    const scannerModal = document.getElementById('scanner-modal');
    const deleteBtn = document.getElementById('btn-delete-item');
    const projectDatalist = document.getElementById('project-datalist');
    const shopSettingsBtn = document.getElementById('shop-settings-btn');
    const toggles = document.getElementById('shop-view-toggles');
    const actionBar = document.getElementById('shop-action-bar');

    // --- 1. Settings & Tag Management ---
    const loadSettings = async () => {
        // Load custom tags (defaulting to a few basics if empty)
        customTags = await StateManager.getSystemSetting('shopping_custom_tags') || [
            'General Groceries', 'Tahoe Maintenance', 'Jeep Repairs', 'Trailer Upgrades', 'Custom Fabrication'
        ];
        
        // Load Inventory Toggle Pref
        const autoCheck = await StateManager.getSystemSetting('shopping_auto_inv_check');
        document.getElementById('setting-auto-inv-check').checked = autoCheck !== false; 
        
        renderTagSettings();
    };

    const renderTagSettings = () => {
        const container = document.getElementById('tag-list-container');
        container.innerHTML = '';
        customTags.forEach(tag => {
            const el = document.createElement('div');
            el.style.cssText = 'background: var(--bg-main); border: 1px solid var(--border-color); padding: 5px 12px; border-radius: 15px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;';
            el.innerHTML = `<span>${tag}</span> <span style="cursor: pointer; color: var(--danger-color); font-weight: bold;" title="Delete">x</span>`;
            
            el.querySelector('span:nth-child(2)').addEventListener('click', async () => {
                customTags = customTags.filter(t => t !== tag);
                await StateManager.setSystemSetting('shopping_custom_tags', customTags);
                renderTagSettings();
                loadDynamicProjects();
            });
            container.appendChild(el);
        });
    };

    document.getElementById('add-tag-btn').addEventListener('click', async () => {
        const input = document.getElementById('new-tag-input');
        const val = input.value.trim();
        if (val && !customTags.includes(val)) {
            customTags.push(val);
            await StateManager.setSystemSetting('shopping_custom_tags', customTags);
            input.value = '';
            renderTagSettings();
            loadDynamicProjects();
        }
    });

    document.getElementById('setting-auto-inv-check').addEventListener('change', async (e) => {
        await StateManager.setSystemSetting('shopping_auto_inv_check', e.target.checked);
    });

    // Toggle Settings Pane
    shopSettingsBtn.addEventListener('click', () => {
        isSettingsOpen = !isSettingsOpen;
        if (isSettingsOpen) {
            stage.style.display = 'none';
            toggles.style.display = 'none';
            actionBar.style.display = 'none';
            settingsStage.style.display = 'block';
            shopSettingsBtn.style.color = 'var(--accent-primary)';
        } else {
            settingsStage.style.display = 'none';
            stage.style.display = 'block';
            toggles.style.display = 'flex';
            actionBar.style.display = 'flex';
            shopSettingsBtn.style.color = 'var(--text-secondary)';
        }
    });


    // --- 2. Dynamic Datalist Injector ---
    const loadDynamicProjects = async () => {
        try {
            const activeProjects = await StateManager.getModuleData('projects');
            let html = '';
            
            // Add custom manual tags first
            customTags.forEach(tag => {
                html += `<option value="${tag}">`;
            });
            
            // Append active projects dynamically
            if (activeProjects && activeProjects.length > 0) {
                // If it's the uploaded structure [{tasks: []}] handle that
                let taskArray = activeProjects[0]?.tasks ? activeProjects[0].tasks : activeProjects;
                taskArray.forEach(proj => {
                    if (proj.status !== 'Completed' && !customTags.includes(proj.title)) {
                        html += `<option value="${proj.title}">`;
                    }
                });
            }
            projectDatalist.innerHTML = html;
        } catch (err) {
            console.warn("Could not load dynamic projects for datalist");
        }
    };

    // --- 3. Load Data & Core Rendering ---
    const loadData = async () => {
        shoppingData = await StateManager.getModuleData('shopping');
        renderList();
    };

    const renderList = (filterText = '') => {
        stage.innerHTML = '';
        
        let filteredData = shoppingData;
        if (filterText) {
            const lowerFilter = filterText.toLowerCase();
            filteredData = shoppingData.filter(item => 
                item.itemName.toLowerCase().includes(lowerFilter) || 
                (item.projectTag && item.projectTag.toLowerCase().includes(lowerFilter))
            );
        }

        if (filteredData.length === 0) {
            stage.innerHTML = `<div class="app-card" style="text-align: center; color: var(--text-secondary);">No items found. Click '➕ Add Item' to start.</div>`;
            return;
        }

        const groups = {};

        filteredData.forEach(item => {
            let groupKey = 'Unassigned';
            let bestStore = 'Any / Unknown';
            let lowestPrice = Infinity;
            
            if (item.prices && item.prices.length > 0) {
                item.prices.forEach(p => {
                    if (p.price < lowestPrice) {
                        lowestPrice = p.price;
                        bestStore = p.store;
                    }
                });
            }

            item._bestStore = bestStore;
            item._lowestPrice = lowestPrice === Infinity ? null : lowestPrice;

            if (currentView === 'store') groupKey = bestStore;
            else groupKey = item.projectTag || 'General Supplies';

            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
        });

        let html = '';
        for (const [groupName, items] of Object.entries(groups)) {
            items.sort((a, b) => {
                const ranks = { 'Critical': 3, 'Normal': 2, 'Wishlist': 1 };
                return ranks[b.priority] - ranks[a.priority];
            });

            html += `<h4 class="shop-group-header">${currentView === 'store' ? '🏪' : '📋'} ${groupName} <span style="font-size: 0.8rem; color: var(--text-secondary); float: right;">${items.length} items</span></h4>`;
            
            items.forEach(item => {
                const priceBadge = item._lowestPrice !== null 
                    ? `<span class="best-price-badge">Best: $${item._lowestPrice.toFixed(2)} @ ${item._bestStore}</span>` 
                    : '';
                
                const stashBadge = item.checkStash 
                    ? `<span class="stash-badge">🔍 Check Inventory First</span>` 
                    : '';

                html += `
                <div class="shop-item-card priority-${item.priority}" data-id="${item.id}">
                    <input type="checkbox" class="item-checkbox" data-id="${item.id}" title="Mark as bought">
                    <div class="item-details" style="cursor: pointer;" onclick="openItemEditor('${item.id}')">
                        <h5 class="item-title">${item.itemName}</h5>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            <strong>Priority:</strong> ${item.priority} | <strong>Tag:</strong> ${item.projectTag || 'None'}
                        </div>
                        ${priceBadge} ${stashBadge}
                    </div>
                </div>`;
            });
        }

        stage.innerHTML = html;

        document.querySelectorAll('.item-checkbox').forEach(box => {
            box.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    const id = e.target.getAttribute('data-id');
                    await StateManager.deleteModuleRecord('shopping', id);
                    UIBridge.showToast('Item checked off and removed', 'success');
                    loadData();
                }
            });
        });
    };

    const addPriceRow = (store = '', price = '') => {
        const row = document.createElement('div');
        row.className = 'price-row';
        row.innerHTML = `
            <input type="text" class="app-input price-store-input" placeholder="Store (e.g., WinCo)" value="${store}" required>
            <input type="number" class="app-input price-val-input" placeholder="0.00" step="0.01" min="0" value="${price}" required>
            <button type="button" class="btn-outline remove-price-btn" style="color: var(--danger-color); border-color: var(--danger-color); padding: 8px;">X</button>
        `;
        row.querySelector('.remove-price-btn').addEventListener('click', () => row.remove());
        priceTrackerContainer.appendChild(row);
    };

    window.openItemEditor = (id = null) => {
        editingItemId = id;
        priceTrackerContainer.innerHTML = ''; 
        
        if (id) {
            const item = shoppingData.find(i => i.id === id);
            if (!item) return;
            
            document.getElementById('shop-modal-title').innerText = 'Edit Supply';
            document.getElementById('item-id').value = item.id;
            document.getElementById('item-name').value = item.itemName;
            document.getElementById('item-priority').value = item.priority;
            document.getElementById('item-project').value = item.projectTag || '';
            document.getElementById('item-stash-check').checked = item.checkStash || false;
            
            if (item.prices && item.prices.length > 0) item.prices.forEach(p => addPriceRow(p.store, p.price));
            else addPriceRow();
            
            deleteBtn.style.display = 'block';
        } else {
            document.getElementById('shop-modal-title').innerText = 'Add Supply';
            document.getElementById('item-id').value = 'shop_' + Date.now();
            document.getElementById('item-name').value = '';
            document.getElementById('item-priority').value = 'Normal';
            document.getElementById('item-project').value = '';
            document.getElementById('item-stash-check').checked = false;
            
            addPriceRow();
            deleteBtn.style.display = 'none';
        }
        
        modal.showModal();
    };


    // --- 4. Event Listeners & Inventory Hook ---
    btnViewStore.addEventListener('click', () => {
        currentView = 'store';
        btnViewStore.classList.add('active');
        btnViewProject.classList.remove('active');
        renderList(searchFilter.value);
    });

    btnViewProject.addEventListener('click', () => {
        currentView = 'project';
        btnViewProject.classList.add('active');
        btnViewStore.classList.remove('active');
        renderList(searchFilter.value);
    });

    searchFilter.addEventListener('input', (e) => renderList(e.target.value));
    
    document.getElementById('add-item-btn').addEventListener('click', () => openItemEditor(null));
    document.getElementById('close-shop-modal').addEventListener('click', () => modal.close());
    document.getElementById('btn-add-price-row').addEventListener('click', () => addPriceRow());

    // FORM SUBMIT WITH INVENTORY PRE-CHECK
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const itemName = document.getElementById('item-name').value.trim();
        const autoCheck = document.getElementById('setting-auto-inv-check').checked;
        
        // The Future Inventory Link Check
        if (autoCheck && !editingItemId) {
            try {
                // Fails silently and continues if inventory module hasn't been built/initialized yet
                const invData = await StateManager.getModuleData('inventory').catch(() => []);
                const match = invData.find(i => i.itemName.toLowerCase() === itemName.toLowerCase());
                
                if (match) {
                    const proceed = await UIBridge.confirm("Inventory Alert", `The system shows you already have '${itemName}' logged in your inventory. Are you sure you want to add it to the shopping list?`);
                    if (!proceed) return; // Halt save if user cancels
                }
            } catch (e) { /* Inventory not ready, bypass */ }
        }

        const priceRows = document.querySelectorAll('.price-row');
        const prices = [];
        priceRows.forEach(row => {
            const s = row.querySelector('.price-store-input').value.trim();
            const p = parseFloat(row.querySelector('.price-val-input').value);
            if (s && !isNaN(p)) prices.push({ store: s, price: p });
        });

        const itemData = {
            id: document.getElementById('item-id').value,
            itemName: itemName,
            priority: document.getElementById('item-priority').value,
            projectTag: document.getElementById('item-project').value.trim(),
            checkStash: document.getElementById('item-stash-check').checked,
            prices: prices,
            dateAdded: new Date().toISOString()
        };

        try {
            await StateManager.setModuleRecord('shopping', itemData);
            UIBridge.showToast('Item Saved', 'success');
            modal.close();
            loadData();
        } catch (err) {
            UIBridge.showToast('Failed to save item', 'error');
        }
    });

    deleteBtn.addEventListener('click', async () => {
        if (!editingItemId) return;
        const confirmed = await UIBridge.confirm('Delete Item?', 'Remove this item from your list permanently?');
        if (confirmed) {
            await StateManager.deleteModuleRecord('shopping', editingItemId);
            UIBridge.showToast('Item Deleted', 'success');
            modal.close();
            loadData();
        }
    });

    // --- 5. Barcode Scanner ---
    const startScanner = async () => {
        if (!('BarcodeDetector' in window)) {
            UIBridge.showToast('Barcode scanning is not supported on this device.', 'error');
            return;
        }

        scannerModal.showModal();
        const container = document.getElementById('scanner-container');
        container.innerHTML = '<video id="scanner-video" autoplay playsinline></video>';
        const video = document.getElementById('scanner-video');

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            
            const barcodeDetector = new BarcodeDetector({ formats: ['qr_code', 'ean_13', 'upc_a', 'upc_e'] });
            
            const scanLoop = setInterval(async () => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    try {
                        const barcodes = await barcodeDetector.detect(video);
                        if (barcodes.length > 0) {
                            clearInterval(scanLoop);
                            stopScanner();
                            
                            const upc = barcodes[0].rawValue;
                            const upcMap = await StateManager.getModuleData('upc_map').catch(() => []);
                            const knownItem = upcMap.find(i => i.upc === upc);
                            
                            if (knownItem) {
                                document.getElementById('item-name').value = knownItem.itemName;
                                UIBridge.showToast('Product recognized!', 'success');
                            } else {
                                const customName = await UIBridge.prompt('Unknown Barcode', `Enter product name for ${upc}:`);
                                if (customName) {
                                    document.getElementById('item-name').value = customName;
                                    await StateManager.setModuleRecord('upc_map', { id: 'upc_' + upc, upc: upc, itemName: customName });
                                } else {
                                    document.getElementById('item-name').value = `UPC: ${upc}`;
                                }
                            }
                        }
                    } catch (err) { }
                }
            }, 500);

            document.getElementById('btn-close-scanner').onclick = () => {
                clearInterval(scanLoop);
                stopScanner();
            };
        } catch (err) {
            stopScanner();
            UIBridge.showToast('Camera access denied.', 'error');
        }
    };

    const stopScanner = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        document.getElementById('scanner-container').innerHTML = '';
        scannerModal.close();
    };

    document.getElementById('btn-scan-barcode').addEventListener('click', startScanner);

    // Boot Sequence
    await loadSettings();
    await loadDynamicProjects();
    loadData();
}