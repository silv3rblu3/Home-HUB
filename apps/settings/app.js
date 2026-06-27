async function initSettingsLogic() {
    
    // --- 1. TAB ROUTING LOGIC ---
    const tabs = document.querySelectorAll('.settings-tab');
    const sections = document.querySelectorAll('.settings-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and sections
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding section
            tab.classList.add('active');
            document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
        });
    });


    // --- 2. ADVANCED THEME ENGINE ---
    const defaultThemes = [
        {
            id: 'theme_default_dark',
            name: 'Standard Dark',
            colors: {
                '--bg-main': '#121212',
                '--bg-surface': '#1e1e1e',
                '--accent-primary': '#3498db',
                '--accent-hover': '#2980b9',
                '--text-main': '#ffffff',
                '--text-secondary': '#aaaaaa'
            },
            isSystem: true // System themes cannot be deleted
        },
        {
            id: 'theme_oled_black',
            name: 'OLED Black (Battery Saver)',
            colors: {
                '--bg-main': '#000000',
                '--bg-surface': '#111111',
                '--accent-primary': '#e74c3c',
                '--accent-hover': '#c0392b',
                '--text-main': '#e0e0e0',
                '--text-secondary': '#777777'
            },
            isSystem: true
        }
    ];

    const colorInputs = {
        '--bg-main': document.getElementById('color-bg-main'),
        '--bg-surface': document.getElementById('color-bg-surface'),
        '--accent-primary': document.getElementById('color-accent-primary'),
        '--accent-hover': document.getElementById('color-accent-hover'),
        '--text-main': document.getElementById('color-text-main'),
        '--text-secondary': document.getElementById('color-text-secondary')
    };

    const themeSelector = document.getElementById('theme-selector');
    
    // Load saved themes from DB, or use default array if empty
    let savedThemes = await StateManager.getSystemSetting('saved_themes');
    if (!savedThemes || savedThemes.length === 0) {
        savedThemes = [...defaultThemes];
        await StateManager.setSystemSetting('saved_themes', savedThemes);
    }

    // Load active theme ID, or default to the first one
    let activeThemeId = await StateManager.getSystemSetting('active_theme_id');
    if (!activeThemeId) activeThemeId = savedThemes[0].id;

    // Helper: Populates the dropdown menu
    const renderThemeDropdown = () => {
        themeSelector.innerHTML = '';
        savedThemes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.name;
            if (theme.id === activeThemeId) option.selected = true;
            themeSelector.appendChild(option);
        });
    };

    // Helper: Applies colors to the CSS root and updates the hex input boxes
    const applyColorsToUI = (themeObj) => {
        for (const [cssVar, input] of Object.entries(colorInputs)) {
            const hexValue = themeObj.colors[cssVar];
            if (hexValue) {
                input.value = hexValue;
                document.documentElement.style.setProperty(cssVar, hexValue);
            }
        }
    };

    // Initialize Dropdown and current colors
    renderThemeDropdown();
    let currentThemeObj = savedThemes.find(t => t.id === activeThemeId) || savedThemes[0];
    applyColorsToUI(currentThemeObj);

    // Live preview when moving sliders
    for (const [cssVar, input] of Object.entries(colorInputs)) {
        input.addEventListener('input', (e) => {
            document.documentElement.style.setProperty(cssVar, e.target.value);
        });
    }

    // Event: Select a different theme from the dropdown
    themeSelector.addEventListener('change', async (e) => {
        const selectedId = e.target.value;
        currentThemeObj = savedThemes.find(t => t.id === selectedId);
        applyColorsToUI(currentThemeObj);
        
        // Immediately save the active ID when switching so it persists on reload
        activeThemeId = selectedId;
        await StateManager.setSystemSetting('active_theme_id', activeThemeId);
    });

    // Event: Save modifications to the currently selected theme
    document.getElementById('save-theme-btn').addEventListener('click', async () => {
        // Collect current values from inputs
        const updatedColors = {};
        for (const [cssVar, input] of Object.entries(colorInputs)) {
            updatedColors[cssVar] = input.value;
        }

        // Update object in array
        const themeIndex = savedThemes.findIndex(t => t.id === currentThemeObj.id);
        if (themeIndex > -1) {
            savedThemes[themeIndex].colors = updatedColors;
            await StateManager.setSystemSetting('saved_themes', savedThemes);
            UIBridge.showToast(`Theme '${currentThemeObj.name}' Saved`, 'success');
        }
    });

    // Event: Create a brand new theme
    document.getElementById('new-theme-btn').addEventListener('click', async () => {
        const themeName = await UIBridge.prompt("New Theme Profile", "Enter name for new theme:");
        if (!themeName) return;

        // Clone current colors into new profile
        const newColors = {};
        for (const [cssVar, input] of Object.entries(colorInputs)) {
            newColors[cssVar] = input.value;
        }

        const newTheme = {
            id: 'theme_' + Date.now(),
            name: themeName,
            colors: newColors,
            isSystem: false
        };

        savedThemes.push(newTheme);
        await StateManager.setSystemSetting('saved_themes', savedThemes);
        
        activeThemeId = newTheme.id;
        currentThemeObj = newTheme;
        await StateManager.setSystemSetting('active_theme_id', activeThemeId);
        
        renderThemeDropdown();
        UIBridge.showToast('New Theme Created', 'success');
    });

    // Event: Delete custom theme
    document.getElementById('delete-theme-btn').addEventListener('click', async () => {
        if (currentThemeObj.isSystem) {
            UIBridge.showToast('Cannot delete system default themes.', 'error');
            return;
        }

        const confirmed = await UIBridge.confirm("Delete Theme?", `Are you sure you want to permanently delete the '${currentThemeObj.name}' theme?`);
        if (confirmed) {
            savedThemes = savedThemes.filter(t => t.id !== currentThemeObj.id);
            await StateManager.setSystemSetting('saved_themes', savedThemes);
            
            // Revert back to the first available theme
            activeThemeId = savedThemes[0].id;
            currentThemeObj = savedThemes[0];
            await StateManager.setSystemSetting('active_theme_id', activeThemeId);
            
            renderThemeDropdown();
            applyColorsToUI(currentThemeObj);
            UIBridge.showToast('Theme Deleted', 'success');
        }
    });


    // --- 3. UNITS CONFIGURATION ---
    const unitSelect = document.getElementById('setting-units');
    let savedUnits = await StateManager.getSystemSetting('unit_preference');
    if (savedUnits) unitSelect.value = savedUnits;

    document.getElementById('save-units-btn').addEventListener('click', async () => {
        await StateManager.setSystemSetting('unit_preference', unitSelect.value);
        UIBridge.showToast('Unit Preference Saved', 'success');
    });


    // --- 4. MASTER DATABASE EXPORT / IMPORT ---
    document.getElementById('export-master-db').addEventListener('click', async () => {
        try {
            const jsonString = await StateManager.exportMasterBackup();
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `HomeHUB_Master_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            
            UIBridge.showToast('Master Backup Exported', 'success');
        } catch (err) {
            UIBridge.showToast('Backup Failed', 'error');
        }
    });

    document.getElementById('import-partial-db-file').addEventListener('change', async (e) => {
        if(e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const backup = JSON.parse(event.target.result);
                    if (!backup.stores) throw new Error("Invalid format");
                    
                    const availableModules = Object.keys(backup.stores).filter(k => k.startsWith('module_')).map(k => k.replace('module_', ''));
                    
                    const targetModule = await UIBridge.prompt('Partial Restore', `Type module to restore (${availableModules.join(', ')}):`);
                    if (!targetModule || !availableModules.includes(targetModule.toLowerCase())) {
                        UIBridge.showToast('Restore canceled or invalid module name', 'error');
                        return;
                    }

                    const storeName = `module_${targetModule.toLowerCase()}`;
                    const confirmed = await UIBridge.confirm("Merge Module Data?", `This will merge the backup data into the ${targetModule} module. Existing matching records will be overwritten. Proceed?`);
                    
                    if (confirmed) {
                        for (const item of backup.stores[storeName]) {
                            await StateManager.setModuleRecord(targetModule.toLowerCase(), item);
                        }
                        UIBridge.showToast(`${targetModule} Module Restored!`, 'success');
                    }
                } catch (err) {
                    UIBridge.showToast('Failed to parse backup file', 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = ''; 
        }
    });

    document.getElementById('import-master-db-file').addEventListener('change', async (e) => {
        if(e.target.files.length > 0) {
            const file = e.target.files[0];
            const confirmed = await UIBridge.confirm("Restore Master Backup?", "This will PERMANENTLY ERASE your current database and replace it with this file. Proceed?");
            
            if (confirmed) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        await StateManager.importMasterBackup(event.target.result);
                        UIBridge.showToast('Database Restored. Reloading app...', 'success');
                        setTimeout(() => window.location.reload(), 1500);
                    } catch (err) {
                        UIBridge.showToast('Invalid Backup File', 'error');
                    }
                };
                reader.readAsText(file);
            }
            e.target.value = ''; 
        }
    });
}