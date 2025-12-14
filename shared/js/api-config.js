// Environment Configuration
// Automatically detects if running on localhost or production

(function() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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