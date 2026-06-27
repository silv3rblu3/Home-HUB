// apps/dashboard/app.js

async function initDashboardLogic() {
    
    // --- 1. NLP Quick Add Routing ---
    const quickInput = document.getElementById('dash-quick-input');
    const quickSubmit = document.getElementById('dash-quick-submit');

    const handleQuickAdd = async () => {
        const val = quickInput.value.trim();
        if (!val) return;

        const parsedData = NLPParser.processCommand(val);
        
        if (parsedData.targetModule === 'unknown') {
            UIBridge.showToast("Couldn't determine module. Saving as draft.", 'warning');
            // We can route unassigned drafts to a generic notes table later
        } else {
            EventBroker.broadcast(`${parsedData.targetModule.toUpperCase()}:QUICK_ADD`, parsedData.payload);
            UIBridge.showToast(`Routed to ${parsedData.targetModule}`, 'success');
            
            // Refresh widgets in case we just added something critical
            setTimeout(() => {
                loadShoppingWidget();
                loadProjectsWidget();
            }, 500);
        }
        quickInput.value = '';
    };

    quickSubmit.addEventListener('click', handleQuickAdd);
    quickInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleQuickAdd();
    });

    // --- 2. Shopping Widget Integration ---
    const loadShoppingWidget = async () => {
        const container = document.getElementById('dash-shopping-content');
        try {
            const rawData = await StateManager.getModuleData('shopping');
            
            // Filter only Critical items
            const criticalItems = rawData.filter(item => item.priority === 'Critical');
            
            if (criticalItems.length === 0) {
                container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding-top: 40px;">No critical supplies needed. You're fully stocked.</div>`;
                return;
            }

            // Sort by date added (newest first) and limit to top 6
            criticalItems.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            const topItems = criticalItems.slice(0, 6);

            let html = '';
            topItems.forEach(item => {
                let bestStore = 'Any';
                let lowestPrice = Infinity;
                if (item.prices && item.prices.length > 0) {
                    item.prices.forEach(p => {
                        if (p.price < lowestPrice) {
                            lowestPrice = p.price;
                            bestStore = p.store;
                        }
                    });
                }

                const priceStr = lowestPrice !== Infinity ? `$${lowestPrice.toFixed(2)}` : 'TBD';

                html += `
                <div class="dash-list-item critical-border">
                    <div style="flex: 1; overflow: hidden;">
                        <div style="font-weight: bold; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${item.itemName}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">📍 ${bestStore}</div>
                    </div>
                    <div style="font-weight: bold; color: var(--success-color); padding-left: 10px;">
                        ${priceStr}
                    </div>
                </div>`;
            });
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = `<div style="color: var(--danger-color);">Error loading shopping data.</div>`;
        }
    };

    // --- 3. Projects Widget Integration ---
    const loadProjectsWidget = async () => {
        const container = document.getElementById('dash-projects-content');
        try {
            const rawData = await StateManager.getModuleData('projects');
            
            // Defensive parsing to handle different data structures
            let taskArray = [];
            
            // If the data is stored exactly as the user's uploaded structure [{ tasks: [...], recurring: [...] }]
            if (rawData.length > 0 && rawData[0].tasks) {
                taskArray = rawData[0].tasks;
            } else {
                // If it's stored flat
                taskArray = rawData;
            }

            // Filter Active and High Priority
            const activeHigh = taskArray.filter(t => t.status !== 'Completed' && t.priority === 'High');

            if (activeHigh.length === 0) {
                container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding-top: 40px;">No high-priority operations pending.</div>`;
                return;
            }

            // Sort by date created and limit to top 5
            activeHigh.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));
            const topTasks = activeHigh.slice(0, 5);

            let html = '';
            topTasks.forEach(task => {
                html += `
                <div class="dash-list-item high-border">
                    <div style="flex: 1; overflow: hidden;">
                        <div style="font-weight: bold; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${task.title}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">Created: ${new Date(task.dateCreated).toLocaleDateString()}</div>
                    </div>
                    <button class="btn-outline" style="padding: 4px 8px; font-size: 0.8rem;" onclick="HomeHub.loadModule('projects')">Go</button>
                </div>`;
            });
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = `<div style="color: var(--danger-color);">Error loading projects data.</div>`;
        }
    };

    // --- 4. Offline-First Weather Integration ---
    const loadWeatherWidget = async () => {
        const container = document.getElementById('dash-weather-content');
        
        // Check if we are offline. If so, don't try to fetch and hang the app.
        if (!navigator.onLine) {
            container.innerHTML = `<div style="text-align: center; color: var(--warning-color); padding-top: 20px;">Device is offline. Weather data unavailable.</div>`;
            return;
        }

        try {
            // Using Open-Meteo (Free, No API Key, No Tracking). 
            // Coordinates set for Winchester, Idaho area.
            const lat = 46.24;
            const lon = -116.62;
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&current_weather=true&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FLos_Angeles`;

            const response = await fetch(url);
            const data = await response.json();

            // Simple WMO weather code mapping to emojis
            const getWeatherIcon = (code) => {
                if (code <= 1) return '☀️'; // Clear/Mostly Clear
                if (code <= 3) return '⛅'; // Partly Cloudy
                if (code <= 49) return '🌫️'; // Fog
                if (code <= 59) return '🌧️'; // Drizzle
                if (code <= 69) return '☔'; // Rain
                if (code <= 79) return '❄️'; // Snow
                if (code <= 82) return '🌧️'; // Showers
                if (code <= 86) return '🌨️'; // Snow Showers
                if (code >= 95) return '⛈️'; // Thunderstorm
                return '☁️'; // Default
            };

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            let html = '<div class="weather-container">';

            // Loop through the next 5 days
            for (let i = 0; i < 5; i++) {
                const dateObj = new Date(data.daily.time[i]);
                // Open-Meteo returns YYYY-MM-DD which parses to UTC midnight. 
                // We compensate by getting the UTC day.
                const dayName = i === 0 ? 'Today' : days[dateObj.getUTCDay()]; 
                const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
                const minTemp = Math.round(data.daily.temperature_2m_min[i]);
                const icon = getWeatherIcon(data.daily.weathercode[i]);
                const precip = data.daily.precipitation_sum[i];
                
                const precipHtml = precip > 0.05 
                    ? `<div style="font-size: 0.75rem; color: var(--accent-primary); margin-top: 5px;">${precip}" precip</div>`
                    : `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 5px;">Dry</div>`;

                html += `
                <div class="weather-day">
                    <div style="font-weight: bold; font-size: 0.9rem;">${dayName}</div>
                    <div class="weather-icon">${icon}</div>
                    <div style="font-weight: bold;">${maxTemp}° <span style="color: var(--text-secondary); font-weight: normal;">${minTemp}°</span></div>
                    ${precipHtml}
                </div>`;
            }
            html += '</div>';

            container.innerHTML = html;
            
            const now = new Date();
            document.getElementById('weather-update-time').innerText = `Last updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

        } catch (err) {
            console.error('Weather fetch failed:', err);
            container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding-top: 20px;">Could not connect to weather service.</div>`;
        }
    };

    // --- Boot Sequence ---
    loadShoppingWidget();
    loadProjectsWidget();
    loadWeatherWidget();
}