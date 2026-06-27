// apps/dashboard/template.js

function renderDashboardApp() {
    return `
    <style>
        .dash-container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* Hero Quick-Add Section */
        .dash-hero {
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 30px 20px;
            text-align: center;
            box-shadow: var(--shadow-sm);
        }

        .dash-hero h2 {
            margin-top: 0;
            color: var(--accent-primary);
            margin-bottom: 20px;
        }

        .hero-input-wrapper {
            max-width: 600px;
            margin: 0 auto;
            display: flex;
            gap: 10px;
        }

        .hero-input-wrapper input {
            padding: 15px;
            font-size: 1.1rem;
            border-radius: var(--radius-lg);
        }

        /* Grid Layout for Widgets */
        .dash-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
        }

        .dash-widget {
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 20px;
            box-shadow: var(--shadow-sm);
            display: flex;
            flex-direction: column;
            min-height: 300px;
        }

        .dash-widget-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 15px;
            margin-bottom: 15px;
        }

        .dash-widget-header h3 {
            margin: 0;
            color: var(--text-main);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .widget-content {
            flex: 1;
            overflow-y: auto;
        }

        /* List Items Styling */
        .dash-list-item {
            background: var(--bg-main);
            border: 1px solid var(--border-color);
            padding: 12px 15px;
            border-radius: var(--radius-md);
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: transform 0.1s;
        }

        .dash-list-item:hover {
            transform: translateX(5px);
            border-color: var(--border-color-focus);
        }

        .critical-border { border-left: 4px solid var(--danger-color); }
        .high-border { border-left: 4px solid var(--warning-color); }

        .weather-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            text-align: center;
        }
        
        .weather-day {
            background: var(--bg-main);
            padding: 15px 10px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
        }
        
        .weather-icon {
            font-size: 2rem;
            margin: 10px 0;
        }
    </style>

    <div class="dash-container">
        
        <div class="dash-hero">
            <h2>Command Center</h2>
            <div class="hero-input-wrapper">
                <input type="text" id="dash-quick-input" class="app-input" placeholder="e.g., 'Buy brake cleaner for Tahoe' or 'Fix trailer plumbing'" autocomplete="off">
                <button id="dash-quick-submit" class="btn-primary" style="padding: 0 25px;">Route It</button>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 15px; margin-bottom: 0;">
                Type a command and the local parser will route it to the correct module.
            </p>
        </div>

        <div class="dash-grid">
            
            <div class="dash-widget">
                <div class="dash-widget-header">
                    <h3>🛒 Critical Supplies</h3>
                    <button class="btn-outline" style="padding: 5px 10px; font-size: 0.8rem;" onclick="HomeHub.loadModule('shopping')">View All</button>
                </div>
                <div class="widget-content" id="dash-shopping-content">
                    <div style="text-align: center; color: var(--text-secondary); padding-top: 20px;">Loading data...</div>
                </div>
            </div>

            <div class="dash-widget">
                <div class="dash-widget-header">
                    <h3>📋 Priority Operations</h3>
                    <button class="btn-outline" style="padding: 5px 10px; font-size: 0.8rem;" onclick="HomeHub.loadModule('projects')">View All</button>
                </div>
                <div class="widget-content" id="dash-projects-content">
                    <div style="text-align: center; color: var(--text-secondary); padding-top: 20px;">Loading data...</div>
                </div>
            </div>

        </div>

        <div class="dash-widget">
            <div class="dash-widget-header">
                <h3>🌤️ Local Logistics Forecast</h3>
                <span id="weather-update-time" style="font-size: 0.8rem; color: var(--text-secondary);">Updating...</span>
            </div>
            <div class="widget-content" id="dash-weather-content">
                <div style="text-align: center; color: var(--text-secondary); padding-top: 20px;">Fetching meteorological data...</div>
            </div>
        </div>

    </div>
    `;
}