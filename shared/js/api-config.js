// Environment Configuration
// Automatically detects if running on localhost or production

(function() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 🚧 DEV MODE - UI-First Development System
    // Activates ONLY when: ?dev=1 in URL AND hostname is localhost
    // This allows rapid UI iteration without backend dependency
    // SAFE: Cannot activate on production due to hostname check
    const DEV_MODE = window.location.search.includes('dev=1') && isLocal;
    
    if (DEV_MODE) {
        console.warn(`
🚧🚧🚧 DEV MODE ACTIVE 🚧🚧🚧
UI-First Development Mode is enabled
This should ONLY appear on localhost
If you see this in production, something is wrong!
Hostname: ${window.location.hostname}
        `);
        
        // Extract state parameter for snapshot loading
        const urlParams = new URLSearchParams(window.location.search);
        const state = urlParams.get('state') || 'speed_tap_active';
        
        window.DEV_MODE = true;
        window.DEV_STATE = state;
        window.DEV_SNAPSHOT_PATH = `dev_data/snapshots/${state}.json`;
        
        console.log(`📸 Loading snapshot: ${state}.json`);
    }

    // Export to global scope
    window.API_BASE = isLocal 
        ? 'http://localhost:8000/api' 
        : 'https://drbaker-backend.onrender.com/api';

    window.WS_BASE = isLocal 
        ? 'ws://localhost:8000' 
        : 'wss://drbaker-backend.onrender.com';
        
    // For generating join links/QR codes
    // Assumes VS Code Live Server uses port 5500 by default
    window.JOIN_URL = isLocal
        ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/admin_pages/games/game-join.html`
        : 'https://drbakermarketing.com/admin_pages/games/game-join.html';

    console.log(`%c[Config] ${isLocal ? 'Local Development 🏠' : 'Production ☁️'}`, 'font-weight: bold; color: #3b82f6');
})();