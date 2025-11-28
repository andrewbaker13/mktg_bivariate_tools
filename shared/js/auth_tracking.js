/**
 * Authentication and Usage Tracking Module
 * 
 * Handles user authentication and automatic tool usage tracking
 * for Dr. Baker Marketing Analytics Tools
 */

// Switch between local and production
const API_BASE = window.location.hostname === 'localhost' || window.location.protocol === 'file:'
    ? 'http://localhost:8000/api'
    : 'https://drbaker-backend.onrender.com/api';

// ========================================
// Authentication Functions
// ========================================

/**
 * Check if user is currently authenticated
 * @returns {boolean} True if user has a valid token
 */
function isAuthenticated() {
    const token = localStorage.getItem('auth_token');
    const username = localStorage.getItem('username');
    return !!(token && username);
}

/**
 * Get current username
 * @returns {string|null} Username or null if not authenticated
 */
function getCurrentUsername() {
    return localStorage.getItem('username');
}

/**
 * Get authentication token
 * @returns {string|null} Token or null if not authenticated
 */
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

/**
 * Login user and store credentials
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<object>} Response with user data
 */
async function login(username, password) {
    const response = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
    }
    
    const data = await response.json();
    
    // Store credentials
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('user_id', data.user_id);
    
    return data;
}

/**
 * Register new user with registration code
 * @param {string} username 
 * @param {string} email 
 * @param {string} password 
 * @param {string} registrationCode 
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {Promise<object>} Response with user data
 */
async function register(username, email, password, registrationCode, firstName = '', lastName = '') {
    const response = await fetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            email,
            password,
            registration_code: registrationCode,
            first_name: firstName,
            last_name: lastName
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
    }
    
    const data = await response.json();
    
    // Auto-login after registration
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('user_id', data.user_id);
    
    return data;
}

/**
 * Logout user and clear stored credentials
 * @returns {Promise<void>}
 */
async function logout() {
    const token = getAuthToken();
    
    if (token) {
        try {
            await fetch(`${API_BASE}/auth/logout/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`
                }
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        }
    }
    
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
}

/**
 * Get user profile information
 * @returns {Promise<object>} User profile data
 */
async function getUserProfile() {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/auth/profile/`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch profile');
    }
    
    return await response.json();
}

// ========================================
// Usage Tracking Functions
// ========================================

/**
 * Log tool usage to backend
 * @param {string} toolSlug - Unique identifier for the tool (e.g., 'pearson-correlation')
 * @param {object} params - Parameters used in the tool
 * @param {string} resultSummary - Brief description of what was generated
 * @returns {Promise<object>} Response from backend
 */
async function logToolUsage(toolSlug, params = {}, resultSummary = '') {
    const token = getAuthToken();
    
    // If not authenticated, don't track (or could track anonymously)
    if (!token) {
        console.log('User not authenticated, skipping usage tracking');
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE}/log-tool-run/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({
                tool_slug: toolSlug,
                page_url: window.location.href,
                params_json: params,
                result_summary: resultSummary
            })
        });
        
        if (!response.ok) {
            console.error('Usage tracking failed:', await response.text());
            return null;
        }
        
        const data = await response.json();
        console.log('Usage tracked:', data);
        return data;
    } catch (error) {
        console.error('Usage tracking error:', error);
        return null;
    }
}

// ========================================
// Analytics Functions
// ========================================

/**
 * Get user's own usage history
 * @returns {Promise<object>} Usage data
 */
async function getMyUsage() {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/analytics/my-usage/`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch usage data');
    }
    
    return await response.json();
}

/**
 * Get user's statistics
 * @returns {Promise<object>} Statistics data
 */
async function getMyStats() {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/analytics/my-stats/`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch statistics');
    }
    
    return await response.json();
}

/**
 * Get course analytics (if user is enrolled)
 * @returns {Promise<object>} Course analytics data
 */
async function getCourseAnalytics() {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/analytics/course/`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch course analytics');
    }
    
    return await response.json();
}

/**
 * Get detailed analytics for a specific tool
 * @param {string} toolSlug - Tool identifier
 * @returns {Promise<object>} Tool analytics data
 */
async function getToolDetails(toolSlug) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_BASE}/analytics/tool/${toolSlug}/`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch tool details');
    }
    
    return await response.json();
}

// ========================================
// UI Helper Functions
// ========================================

/**
 * Create auth status indicator in header
 * Call this on page load to show login status
 */
function initAuthUI() {
    // Find the hero header
    const heroHeader = document.querySelector('.hero-header__top') || document.querySelector('.hero-header');
    if (!heroHeader) return;
    
    // Create auth indicator
    const authDiv = document.createElement('div');
    authDiv.id = 'auth-status';
    authDiv.style.cssText = 'margin-top: 0.5rem; font-size: 0.9rem;';
    
    if (isAuthenticated()) {
        const username = getCurrentUsername();
        authDiv.innerHTML = `
            <span style="color: #10b981;">✓ Logged in as <strong>${username}</strong></span>
            <button id="logout-btn" style="margin-left: 1rem; padding: 0.25rem 0.75rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Logout</button>
        `;
        heroHeader.appendChild(authDiv);
        
        // Add logout handler
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await logout();
            location.reload();
        });
    } else {
        authDiv.innerHTML = `
            <span style="color: #f59e0b;">⚠ Not logged in - usage not being tracked</span>
            <a href="/login.html" style="margin-left: 1rem; color: #3b82f6; text-decoration: underline;">Login</a>
        `;
        heroHeader.appendChild(authDiv);
    }
}

// ========================================
// Auto-initialize on page load
// ========================================
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initAuthUI();
    });
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        getCurrentUsername,
        getAuthToken,
        login,
        register,
        logout,
        getUserProfile,
        logToolUsage,
        getMyUsage,
        getMyStats,
        getCourseAnalytics,
        getToolDetails,
        initAuthUI
    };
}
