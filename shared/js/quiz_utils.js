/**
 * Quiz Integration Module
 * 
 * Provides quiz button functionality for tool pages
 * Include this script on any tool page to add Skills Check button
 */

/**
 * Initialize quiz button for a tool
 * @param {string} toolSlug - The tool's slug identifier
 * @param {string} containerId - ID of container element for the button (optional)
 */
async function initQuizButton(toolSlug, containerId = 'quiz-button-container') {
    // Only show for authenticated users
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/quiz/tool/${toolSlug}/`, {
            headers: {
                'Authorization': `Token ${getAuthToken()}`
            }
        });

        if (!response.ok) return;

        const data = await response.json();
        
        if (data.quiz) {
            renderQuizButton(data.quiz, containerId);
        }
    } catch (error) {
        console.error('Error loading quiz info:', error);
    }
}

/**
 * Render the quiz button
 */
function renderQuizButton(quiz, containerId) {
    let container = document.getElementById(containerId);
    
    // If no container specified, create one in a sensible location
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 1000;';
        document.body.appendChild(container);
    }

    const hasScore = quiz.best_score !== null;
    const attemptsText = quiz.attempts_remaining === null 
        ? '' 
        : quiz.attempts_remaining === 0 
            ? '(No attempts left)' 
            : `(${quiz.attempts_remaining} attempt${quiz.attempts_remaining !== 1 ? 's' : ''} left)`;

    container.innerHTML = `
        <style>
            .quiz-btn-floating {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 50px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                text-decoration: none;
            }
            .quiz-btn-floating:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }
            .quiz-btn-floating:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            .quiz-btn-score {
                background: rgba(255,255,255,0.2);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }
            .quiz-btn-score.passed {
                background: rgba(16, 185, 129, 0.8);
            }
        </style>
        <a href="${getQuizUrl(quiz.id)}" 
           class="quiz-btn-floating" 
           ${quiz.attempts_remaining === 0 ? 'style="pointer-events: none; opacity: 0.6;"' : ''}>
            <i class="fas fa-clipboard-check"></i>
            Skills Check
            ${hasScore ? `<span class="quiz-btn-score ${quiz.best_score >= 70 ? 'passed' : ''}">${Math.round(quiz.best_score)}%</span>` : ''}
        </a>
        ${attemptsText ? `<div style="text-align: center; font-size: 11px; color: #6b7280; margin-top: 4px;">${attemptsText}</div>` : ''}
    `;
}

/**
 * Get the URL for the quiz page
 */
function getQuizUrl(quizId) {
    // Determine relative path to admin_pages based on current location
    const pathParts = window.location.pathname.split('/');
    const isInApps = pathParts.includes('apps');
    
    if (isInApps) {
        // We're in apps/category/tool/ - need to go up 3 levels
        return `../../../admin_pages/quiz/quiz.html?id=${quizId}`;
    } else {
        // We're at root or admin_pages level
        return `admin_pages/quiz/quiz.html?id=${quizId}`;
    }
}

/**
 * Check for active quiz session and load case studies
 * Call this when loading scenarios to include quiz case studies
 * @param {string} toolSlug - The tool's slug identifier
 * @returns {Promise<Array>} Array of case study objects to prepend to scenarios
 */
async function getQuizCaseStudies(toolSlug) {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) {
        return [];
    }

    try {
        const response = await fetch(`${API_BASE}/quiz/active-session/${toolSlug}/`, {
            headers: {
                'Authorization': `Token ${getAuthToken()}`
            }
        });

        if (!response.ok) return [];

        const data = await response.json();
        
        if (data.case_studies && data.case_studies.length > 0) {
            return data.case_studies.map(cs => ({
                id: cs.scenario_id,
                name: cs.display_name,
                description: cs.description,
                csvData: cs.dataset_csv,
                isQuizCaseStudy: true
            }));
        }
    } catch (error) {
        console.error('Error checking quiz session:', error);
    }

    return [];
}

/**
 * Inline quiz button for tool headers
 * Call this to add a smaller inline button instead of floating
 */
async function initInlineQuizButton(toolSlug, containerId) {
    if (typeof isAuthenticated !== 'function' || !isAuthenticated()) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/quiz/tool/${toolSlug}/`, {
            headers: {
                'Authorization': `Token ${getAuthToken()}`
            }
        });

        if (!response.ok) return;

        const data = await response.json();
        
        if (data.quiz) {
            renderInlineQuizButton(data.quiz, containerId);
        }
    } catch (error) {
        console.error('Error loading quiz info:', error);
    }
}

function renderInlineQuizButton(quiz, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const hasScore = quiz.best_score !== null;
    
    container.innerHTML = `
        <a href="${getQuizUrl(quiz.id)}" 
           class="quiz-btn-inline"
           ${quiz.attempts_remaining === 0 ? 'style="pointer-events: none; opacity: 0.6;"' : ''}>
            <i class="fas fa-clipboard-check"></i>
            Skills Check
            ${hasScore ? `<span class="score-badge ${quiz.best_score >= 70 ? 'passed' : ''}">${Math.round(quiz.best_score)}%</span>` : ''}
        </a>
    `;

    // Add styles if not already present
    if (!document.getElementById('quiz-inline-styles')) {
        const style = document.createElement('style');
        style.id = 'quiz-inline-styles';
        style.textContent = `
            .quiz-btn-inline {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                text-decoration: none;
                transition: all 0.2s;
            }
            .quiz-btn-inline:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            .quiz-btn-inline .score-badge {
                background: rgba(255,255,255,0.2);
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
            }
            .quiz-btn-inline .score-badge.passed {
                background: rgba(16, 185, 129, 0.8);
            }
        `;
        document.head.appendChild(style);
    }
}
