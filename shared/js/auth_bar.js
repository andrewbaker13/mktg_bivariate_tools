/**
 * Shared authentication bar component
 * Shows login/register links when logged out
 * Shows username, dashboard link, and logout when logged in
 */

(function() {
  'use strict';

  // Initialize auth bar on page load
  document.addEventListener('DOMContentLoaded', function() {
    initAuthBar();
  });

  async function initAuthBar() {
    const authBarContent = document.getElementById('auth-bar-content');
    if (!authBarContent) return;

    // Check if auth functions are available
    if (typeof isAuthenticated !== 'function' || typeof getAuthToken !== 'function') {
      console.warn('Auth functions not loaded yet');
      return;
    }

    if (isAuthenticated()) {
      const username = localStorage.getItem('username') || 'User';
      const token = getAuthToken();
      let isStaff = false;
      let userCourses = [];

      try {
        // Use global API_BASE if available, otherwise detect
        let apiBase = window.API_BASE;
        if (!apiBase) {
             const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
             apiBase = isLocal ? 'http://localhost:8000/api' : 'https://drbaker-backend.onrender.com/api';
        }

        // Fetch with timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const [profile, coursesResponse] = await Promise.all([
          fetch(`${apiBase}/auth/profile/`, {
            headers: { 'Authorization': `Token ${token}` },
            signal: controller.signal
          }).then(r => r.json()),
          fetch(`${apiBase}/student/courses/`, {
            headers: { 'Authorization': `Token ${token}` },
            signal: controller.signal
          }).then(r => r.json()).catch(() => ({ courses: [] }))
        ]);
        
        clearTimeout(timeoutId);
        isStaff = profile.is_staff || false;
        userCourses = coursesResponse.courses || [];
      } catch (e) {
        console.error('Error checking staff status:', e);
        // Continue with isStaff = false if API call fails
      }

      // Build courses dropdown HTML
      let coursesDropdownHTML = '';
      if (userCourses.length > 0) {
        const enabledCourses = userCourses.filter(c => c.homepage_enabled);
        if (enabledCourses.length > 0) {
          coursesDropdownHTML = `
            <div class="auth-bar__dropdown">
              <button class="auth-bar__dropdown-toggle">My Courses ▾</button>
              <div class="auth-bar__dropdown-menu">
                ${enabledCourses.map(course => `
                  <a href="${getRelativePathToRoot()}admin_pages/course-home.html?course_id=${course.id}">${course.name}</a>
                `).join('')}
              </div>
            </div>
          `;
        }
      }

      authBarContent.innerHTML = `
        <span class="auth-bar__status">✓ Logged in as <strong>${username}</strong></span>
        ${coursesDropdownHTML}
        <a href="${getRelativePathToRoot()}admin_pages/student-dashboard.html">My Dashboard</a>
        ${isStaff ? `<a href="${getRelativePathToRoot()}admin_pages/instructor-analytics.html">Course Analytics</a>` : ''}
        ${isStaff ? `<a href="${getRelativePathToRoot()}admin_pages/instructor.html">Manage Courses</a>` : ''}
        ${isStaff ? `<a href="${getRelativePathToRoot()}admin_pages/admin-dashboard.html">System Dashboard</a>` : ''}
        <button class="auth-bar__logout" onclick="handleAuthBarLogout()">Logout</button>
      `;

      // Initialize dropdown behavior
      initDropdowns();
    } else {
      authBarContent.innerHTML = `
        <a href="${getRelativePathToRoot()}admin_pages/login.html">Login</a>
        <a href="${getRelativePathToRoot()}admin_pages/register.html">Create Account</a>
      `;
    }
  }

  // Initialize dropdown behavior
  function initDropdowns() {
    const dropdowns = document.querySelectorAll('.auth-bar__dropdown');
    
    dropdowns.forEach(dropdown => {
      const toggle = dropdown.querySelector('.auth-bar__dropdown-toggle');
      const menu = dropdown.querySelector('.auth-bar__dropdown-menu');
      
      if (toggle && menu) {
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Close other dropdowns
          document.querySelectorAll('.auth-bar__dropdown-menu').forEach(m => {
            if (m !== menu) m.classList.remove('show');
          });
          
          menu.classList.toggle('show');
        });
      }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.auth-bar__dropdown-menu').forEach(m => {
        m.classList.remove('show');
      });
    });
  }

  // Determine relative path to root based on current location
  function getRelativePathToRoot() {
    const path = window.location.pathname;
    if (path.includes('/apps/')) {
      // Apps are now 3 levels deep: apps/category/tool/
      return '../../../';
    } else if (path.includes('/old_site/')) {
      return '../';
    } else if (path.includes('/admin_pages/')) {
      return '../';
    }
    return '';
  }

  // Global logout handler
  window.handleAuthBarLogout = async function() {
    if (typeof logout === 'function') {
      await logout();
      location.reload();
    } else {
      console.error('Logout function not available');
    }
  };

  // Re-initialize when auth state changes
  window.addEventListener('auth-state-changed', initAuthBar);
})();
