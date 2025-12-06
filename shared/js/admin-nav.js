/**
 * Admin Navigation Loader
 * Loads the shared admin navigation bar and highlights the current page.
 * 
 * Usage: Add this to any admin page:
 *   <div id="admin-nav-container"></div>
 *   <script src="../shared/js/admin-nav.js"></script>
 */

(function() {
    // Determine current page from URL
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    
    // Load the nav HTML
    fetch('../shared/components/admin-nav.html')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load admin nav');
            return response.text();
        })
        .then(html => {
            const container = document.getElementById('admin-nav-container');
            if (container) {
                container.innerHTML = html;
                
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
    window.location.href = 'login.html';
}
