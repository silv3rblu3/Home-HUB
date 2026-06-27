// apps/shopping/template.js

function renderShoppingApp() {
    return `
    <style>
        /* Scoped Shopping CSS */
        .shop-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
            background: var(--bg-surface);
            padding: 15px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
        }

        .view-toggle {
            display: flex;
            background: var(--bg-main);
            border-radius: var(--radius-md);
            overflow: hidden;
            border: 1px solid var(--border-color);
        }

        .view-btn {
            background: transparent;
            color: var(--text-secondary);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            font-weight: bold;
            transition: 0.2s;
        }

        .view-btn.active {
            background: var(--accent-primary);
            color: var(--accent-text);
        }

        .shop-group-header {
            margin-top: 25px;
            margin-bottom: 15px;
            color: var(--accent-primary);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .shop-item-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 15px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
            box-shadow: var(--shadow-sm);
        }

        .priority-Critical { border-left: 4px solid var(--danger-color); }
        .priority-Normal { border-left: 4px solid var(--accent-primary); }
        .priority-Wishlist { border-left: 4px solid #95a5a6; opacity: 0.8; }

        .item-checkbox {
            width: 24px;
            height: 24px;
            cursor: pointer;
            accent-color: var(--success-color);
        }

        .item-details { flex: 1; }

        .item-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 4px 0;
            color: var(--text-main);
        }

        .best-price-badge, .stash-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-top: 5px;
        }
        
        .best-price-badge {
            background: rgba(46, 204, 113, 0.15);
            color: var(--success-color);
            border: 1px solid var(--success-color);
        }

        .stash-badge {
            background: rgba(243, 156, 18, 0.15);
            color: var(--warning-color);
            border: 1px solid var(--warning-color);
            margin-left: 5px;
        }

        .price-row {
            display: grid;
            grid-template-columns: 2fr 1fr auto;
            gap: 10px;
            margin-bottom: 8px;
            align-items: center;
        }

        /* Clean Settings Icon Button */
        #shop-settings-btn {
            background: transparent;
            border: none;
            font-size: 1.4rem;
            cursor: pointer;
            padding: 0 5px;
            transition: transform 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #shop-settings-btn:hover {
            transform: rotate(45deg);
        }

        /* Barcode Scanner Overlay */
        #scanner-container {
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
            position: relative;
            border-radius: var(--radius-md);
            overflow: hidden;
            border: 2px solid var(--accent-primary);
        }
        #interactive.viewport video { width: 100%; height: auto; display: block; }
    </style>

    <div style="max-width: 1000px; margin: 0 auto;">
        
        <div class="shop-toolbar">
            <h2 style="margin: 0; color: var(--accent-primary);">
                🛒 Logistics & Supplies
            </h2>
            
            <div class="view-toggle" id="shop-view-toggles">
                <button class="view-btn active" id="btn-view-store">By Store</button>
                <button class="view-btn" id="btn-view-project">By Project</button>
            </div>

            <div style="display: flex; gap: 12px; flex: 1; min-width: 250px; align-items: center;" id="shop-action-bar">
                <input type="text" id="shop-filter" class="app-input" placeholder="Filter items..." style="flex: 1;">
                <button id="add-item-btn" class="btn-primary" style="white-space: nowrap;">➕ Add Item</button>
                <button id="shop-settings-btn" title="Module Settings">⚙️</button>
            </div>
        </div>

        <div id="shopping-list-stage"></div>

        <div id="shopping-settings-stage" style="display: none; animation: fadeIn 0.3s;">
            <div class="app-card">
                <h3 style="margin-top: 0; color: var(--accent-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">Module Settings</h3>
                <button id="close-shopping-settings" class="btn-outline" style="padding: 5px 10px;">❌ Close</button>
                <h4 style="margin-bottom: 10px;">Custom Project Tags & Categories</h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">Manage the tags available in the drop-down when adding items. (Active projects from the Projects module are added automatically).</p>
                
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="new-tag-input" class="app-input" placeholder="New category (e.g., Office Build)">
                    <button id="add-tag-btn" class="btn-outline">Add Tag</button>
                </div>
                
                <div id="tag-list-container" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px;">
                    </div>
                
                <h4 style="margin-bottom: 10px;">Inventory Module Link</h4>
                <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; color: var(--text-main);">
                    <input type="checkbox" id="setting-auto-inv-check" style="width: 18px; height: 18px; accent-color: var(--accent-primary);">
                    Always warn if an item already exists in Inventory before adding to list.
                </label>
            </div>
        </div>

        <dialog id="shop-item-modal" style="width: 95%; max-width: 550px; padding: 0;">
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                    <h3 id="shop-modal-title" style="margin: 0; color: var(--accent-primary);">Add Supply</h3>
                    <button id="close-shop-modal" class="btn-outline" style="padding: 5px 10px; border: none; font-size: 1.2rem;">❌</button>
                </div>
                
                <form id="shop-item-form">
                    <input type="hidden" id="item-id">
                    
                    <div style="display: flex; gap: 10px; align-items: flex-end; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <label style="font-size: 0.85rem; font-weight: bold; margin-bottom: 5px; display: block;">Item Name / Specs</label>
                            <input type="text" id="item-name" class="app-input" required placeholder="e.g., Brake Rotors, Hickory Lumber">
                        </div>
                        <button type="button" id="btn-scan-barcode" class="btn-outline" style="height: 42px;" title="Scan Barcode">📷 Scan</button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="font-size: 0.85rem; font-weight: bold; margin-bottom: 5px; display: block;">Priority Level</label>
                            <select id="item-priority" class="app-input">
                                <option value="Critical">🔴 Critical (Need Today)</option>
                                <option value="Normal" selected>🔵 Normal (Next Trip)</option>
                                <option value="Wishlist">⚪ Wishlist (Wait for Sale)</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 0.85rem; font-weight: bold; margin-bottom: 5px; display: block;">Project / Tag</label>
                            <input type="text" id="item-project" class="app-input" list="project-datalist" placeholder="Select or type...">
                            <datalist id="project-datalist"></datalist>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: bold; color: var(--warning-color);">
                            <input type="checkbox" id="item-stash-check" style="width: 18px; height: 18px; accent-color: var(--warning-color);">
                            Verify Shop/Trailer Inventory First
                        </label>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 26px; margin-top: 5px;">Flags item in list to remind you to check your stash before buying.</p>
                    </div>

                    <div style="background: var(--bg-main); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 20px;">
                        <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 0.95rem;">Price Comparison Tracker</h4>
                        
                        <div id="price-tracker-container"></div>
                        
                        <button type="button" id="btn-add-price-row" class="btn-outline" style="width: 100%; margin-top: 10px; border-style: dashed;">+ Add Store/Price Option</button>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button type="submit" class="btn-primary" style="flex: 2;">💾 Save Item</button>
                        <button type="button" id="btn-delete-item" class="btn-danger" style="display: none; flex: 1;">🗑️ Delete</button>
                    </div>
                </form>
            </div>
        </dialog>

        <dialog id="scanner-modal" style="width: 95%; max-width: 450px;">
            <div style="text-align: center;">
                <h3 style="margin-top: 0; color: var(--accent-primary);">Scan UPC Barcode</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">Point camera at the product barcode.</p>
                <div id="scanner-container"></div>
                <button type="button" id="btn-close-scanner" class="btn-danger" style="width: 100%; margin-top: 15px;">Cancel Scan</button>
            </div>
        </dialog>

    </div>
    `;
}