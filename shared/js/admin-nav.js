/**
 * Admin Navigation Loader
 * Loads the shared admin navigation bar and highlights the current page.
 * 
 * Usage: Add this to any admin page:
 *   <div id="admin-nav-container"></div>
 *   <script src="../shared/js/admin-nav.js"></script>
 */

(function() {
    // Determine current page and depth
    const pathParts = window.location.pathname.split('/');
    const currentPage = pathParts.pop().replace('.html', '') || 'index';
    const isGamePage = pathParts.includes('games');
    
    // Determine path to shared component
    const sharedPath = isGamePage ? '../../shared/components/admin-nav.html' : '../shared/components/admin-nav.html';
    
    // Load the nav HTML
    fetch(sharedPath)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load admin nav');
            return response.text();
        })
        .then(html => {
            const container = document.getElementById('admin-nav-container');
            if (container) {
                container.innerHTML = html;
                
                // Fix links if we are in games/ subdirectory
                if (isGamePage) {
                    const links = container.querySelectorAll('a');
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && !href.startsWith('http') && !href.startsWith('#')) {
                            if (href.startsWith('games/')) {
                                // Link to another game page: games/game-host.html -> game-host.html
                                link.setAttribute('href', href.replace('games/', ''));
                            } else {
                                // Link to a root admin page: admin-dashboard.html -> ../admin-dashboard.html
                                link.setAttribute('href', '../' + href);
                            }
                        }
                    });
                }
                
                // Highlight current page
                const activeLink = container.querySelector(`[data-page="${currentPage}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        })
        .catch(err => {
            console.error('Error loading admin nav:', err);
        });
})();

/**
 * Logout handler - should be available globally
 */
function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_staff');
    localStorage.removeItem('is_superuser');
    sessionStorage.clear();
    
    const isGamePage = window.location.pathname.includes('/games/');
    window.location.href = isGamePage ? '../login.html' : 'login.html';
}
