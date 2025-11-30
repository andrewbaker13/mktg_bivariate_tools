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

      try {
        const API_BASE = 'https://drbaker-backend.onrender.com/api';
        const profile = await fetch(`${API_BASE}/auth/profile/`, {
          headers: { 'Authorization': `Token ${token}` }
        }).then(r => r.json());
        isStaff = profile.is_staff || false;
      } catch (e) {
        console.error('Error checking staff status:', e);
      }

      authBarContent.innerHTML = `
        <span class="auth-bar__status">✓ Logged in as <strong>${username}</strong></span>
        <a href="${getRelativePathToRoot()}student-dashboard.html">My Dashboard</a>
        ${isStaff ? `<a href="${getRelativePathToRoot()}instructor-analytics.html">Course Analytics</a>` : ''}
        ${isStaff ? `<a href="${getRelativePathToRoot()}instructor.html">Manage Courses</a>` : ''}
        ${isStaff ? `<a href="${getRelativePathToRoot()}admin-dashboard.html">System Dashboard</a>` : ''}
        <button class="auth-bar__logout" onclick="handleAuthBarLogout()">Logout</button>
      `;
    } else {
      authBarContent.innerHTML = `
        <a href="${getRelativePathToRoot()}login.html">Login</a>
        <a href="${getRelativePathToRoot()}register.html">Create Account</a>
      `;
    }
  }

  // Determine relative path to root based on current location
  function getRelativePathToRoot() {
    const path = window.location.pathname;
    if (path.includes('/apps/')) {
      return '../../';
    } else if (path.includes('/old_site/')) {
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
