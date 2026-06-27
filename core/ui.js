/**
 * UIBridge - Manages global DOM overlays, native APIs, and system notifications.
 */
const UIBridge = (() => {
    return {
        showToast: (message, type = 'success') => {
            const container = document.getElementById('notification-container');
            if (!container) return;
            
            const toast = document.createElement('div');
            toast.className = `toast-msg toast-${type}`;
            toast.innerText = message;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },
        
        confirm: (title, message) => {
            return new Promise((resolve) => {
                const dialog = document.getElementById('global-dialog');
                dialog.innerHTML = `
                    <h3 style="margin-top:0; color:var(--accent-primary);">${title}</h3>
                    <p style="margin-bottom:20px; line-height: 1.5;">${message}</p>
                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button id="dialog-cancel" class="btn-outline">Cancel</button>
                        <button id="dialog-confirm" class="btn-primary">Confirm</button>
                    </div>
                `;
                
                dialog.showModal();
                
                document.getElementById('dialog-confirm').onclick = () => {
                    dialog.close();
                    resolve(true);
                };
                
                document.getElementById('dialog-cancel').onclick = () => {
                    dialog.close();
                    resolve(false);
                };
            });
        },

        /**
         * NEW: Custom styled input prompt replacing the ugly browser default.
         * @param {string} title 
         * @param {string} placeholder 
         * @returns {Promise<string|null>} Resolves with text, or null if canceled
         */
        prompt: (title, placeholder = '') => {
            return new Promise((resolve) => {
                const dialog = document.getElementById('global-dialog');
                dialog.innerHTML = `
                    <h3 style="margin-top:0; color:var(--accent-primary); margin-bottom: 15px;">${title}</h3>
                    <input type="text" id="dialog-input" class="app-input" placeholder="${placeholder}" autocomplete="off" style="margin-bottom: 20px;">
                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button id="dialog-cancel" class="btn-outline">Cancel</button>
                        <button id="dialog-submit" class="btn-primary">Submit</button>
                    </div>
                `;
                
                dialog.showModal();
                const inputField = document.getElementById('dialog-input');
                inputField.focus(); // Auto-focus so you can start typing immediately
                
                // Allow hitting "Enter" to submit
                inputField.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('dialog-submit').click();
                    }
                });
                
                document.getElementById('dialog-submit').onclick = () => {
                    const val = inputField.value.trim();
                    dialog.close();
                    resolve(val !== '' ? val : null);
                };
                
                document.getElementById('dialog-cancel').onclick = () => {
                    dialog.close();
                    resolve(null);
                };
            });
        },
        
        updateSyncIndicator: (isSynced) => {
            const indicator = document.getElementById('db-status-indicator');
            if (!indicator) return;
            
            if (isSynced) {
                indicator.className = 'status-dot status-green';
                indicator.title = "Database Synced";
            } else {
                indicator.className = 'status-dot status-yellow';
                indicator.title = "Offline Changes Pending";
            }
        }
    };
})();