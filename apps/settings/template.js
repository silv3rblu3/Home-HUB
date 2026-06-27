function renderSettingsApp() {
    return `
    <style>
        /* Scoped CSS for the Settings Tabs */
        .settings-tab-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 15px;
        }
        .settings-tab {
            flex: 1;
            padding: 10px;
            text-align: center;
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s;
        }
        .settings-tab.active {
            background: var(--accent-primary);
            color: var(--accent-text);
            border-color: var(--accent-primary);
        }
        .settings-section {
            display: none;
            animation: fadeIn 0.3s;
        }
        .settings-section.active {
            display: block;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>

    <div class="app-card" style="max-width: 800px; margin: 0 auto;">
        <h2 style="color: var(--accent-primary); margin-bottom: 20px;">⚙️ System Settings</h2>
        
        <div class="settings-tab-container">
            <button class="settings-tab active" data-tab="themes-tab">🎨 Appearance & Units</button>
            <button class="settings-tab" data-tab="database-tab">📦 Database & Sync</button>
        </div>
        
        <div id="themes-tab" class="settings-section active">
            
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 25px;">
                <h4 style="margin-bottom: 10px;">Theme Profile Profile</h4>
                <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <select id="theme-selector" class="app-input" style="flex: 2; min-width: 200px;"></select>
                    <button id="new-theme-btn" class="btn-outline" style="flex: 1; min-width: 120px;">➕ New Profile</button>
                    <button id="delete-theme-btn" class="btn-outline" style="flex: 1; min-width: 120px; color: var(--danger-color); border-color: var(--danger-color);">🗑️ Delete</button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Main Background</label>
                        <input type="color" id="color-bg-main" class="app-input" style="height: 40px; padding: 2px;">
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Surface (Cards & Headers)</label>
                        <input type="color" id="color-bg-surface" class="app-input" style="height: 40px; padding: 2px;">
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Primary Accent</label>
                        <input type="color" id="color-accent-primary" class="app-input" style="height: 40px; padding: 2px;">
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Hover Accent</label>
                        <input type="color" id="color-accent-hover" class="app-input" style="height: 40px; padding: 2px;">
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Primary Text</label>
                        <input type="color" id="color-text-main" class="app-input" style="height: 40px; padding: 2px;">
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 0.85rem; font-weight: bold;">Secondary Text</label>
                        <input type="color" id="color-text-secondary" class="app-input" style="height: 40px; padding: 2px;">
                    </div>
                </div>
                
                <button id="save-theme-btn" class="btn-primary" style="width: 100%;">💾 Save & Apply Current Theme</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 5px;">
                <h4 style="margin-bottom: 5px;">Measurement System</h4>
                <select id="setting-units" class="app-input" style="max-width: 300px;">
                    <option value="imperial">Imperial (Inches, Lbs, Miles)</option>
                    <option value="metric">Metric (mm, kg, km)</option>
                </select>
                <button id="save-units-btn" class="btn-outline" style="max-width: 300px; margin-top: 10px;">💾 Save Unit Preference</button>
            </div>
        </div>

        <div id="database-tab" class="settings-section">
            <h3 style="margin-bottom: 15px;">📦 Database Backup & Sync</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.9rem;">Since Home HUB runs entirely offline on this device, you are responsible for your own backups. Export this file and keep it safe.</p>
            
            <button id="export-master-db" class="btn-primary" style="width: 100%; margin-bottom: 15px;">⬇️ Export Full Master Backup (.json)</button>
            
            <input type="file" id="import-partial-db-file" accept=".json" style="display: none;">
            <button class="btn-outline" style="width: 100%; margin-bottom: 15px;" onclick="document.getElementById('import-partial-db-file').click()">📥 Restore Specific Module from Backup</button>
            
            <div style="border-top: 1px solid var(--border-color); margin-top: 20px; padding-top: 20px;">
                <input type="file" id="import-master-db-file" accept=".json" style="display: none;">
                <button class="btn-outline" style="width: 100%; border-color: var(--danger-color); color: var(--danger-color);" onclick="document.getElementById('import-master-db-file').click()">🚨 Danger: Restore Master Backup (Overwrites Current Data)</button>
            </div>
        </div>

    </div>
    `;
}