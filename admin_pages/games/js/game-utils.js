/**
 * Game Utilities
 * Shared helper functions for the game client
 */

// Fetch with timeout helper (optional timeout)
function fetchWithTimeout(url, options = {}, timeout = null) {
    if (!timeout) {
        return fetch(url, options);
    }
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// Timing instrumentation for diagnostics
const timingData = {
    pageLoadStart: Date.now(),
    dnsLookup: null,
    tcpConnection: null,
    sslHandshake: null,
    firstByteTime: null,
    wsConnectionStart: null,
    wsConnectionComplete: null,
    apiRequestStart: null,
    apiResponseComplete: null
};

function logTiming(label, value) {
    console.log(`[TIMING] ${label}: ${value}ms`);
}

function displayTimingData() {
    const timingDisplay = document.createElement('div');
    timingDisplay.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: #0f0; padding: 10px; font-family: monospace; font-size: 11px; border-radius: 4px; max-width: 300px; z-index: 9999;';
    
    let html = '<strong>Connection Timing:</strong><br>';
    if (timingData.dnsLookup) html += `DNS: ${timingData.dnsLookup}ms<br>`;
    if (timingData.tcpConnection) html += `TCP: ${timingData.tcpConnection}ms<br>`;
    if (timingData.sslHandshake) html += `SSL: ${timingData.sslHandshake}ms<br>`;
    if (timingData.firstByteTime) html += `First Byte: ${timingData.firstByteTime}ms<br>`;
    if (timingData.apiRequestStart && timingData.apiResponseComplete) {
        html += `API Call: ${timingData.apiResponseComplete - timingData.apiRequestStart}ms<br>`;
    }
    if (timingData.wsConnectionStart && timingData.wsConnectionComplete) {
        html += `WebSocket: ${timingData.wsConnectionComplete - timingData.wsConnectionStart}ms<br>`;
    }
    html += `<br>Total: ${Date.now() - timingData.pageLoadStart}ms`;
    
    timingDisplay.innerHTML = html;
    document.body.appendChild(timingDisplay);
}

// Universal input lockout function - called when timer expires
function disableAllInputs() {
    // Speed Tap buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    // Closest Guess inputs and button
    const guessMin = document.getElementById('guessMin');
    const guessMax = document.getElementById('guessMax');
    const guessSubmitBtn = document.querySelector('.submit-guess-btn');
    
    if (guessMin) {
        guessMin.disabled = true;
        guessMin.style.opacity = '0.5';
    }
    if (guessMax) {
        guessMax.disabled = true;
        guessMax.style.opacity = '0.5';
    }
    if (guessSubmitBtn) {
        guessSubmitBtn.disabled = true;
        guessSubmitBtn.style.opacity = '0.5';
    }

    // Push Range buttons
    const pushButtons = document.querySelectorAll('.push-btn');
    if (pushButtons.length > 0) {
        pushButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }

    // Crowd Wisdom buttons
    document.querySelectorAll('.crowd-wisdom-btn').forEach(btn => {
        btn.disabled = true;
    });

    // Word Guess input
    const wordInput = document.getElementById('wordGuessInput');
    const wordSubmitBtn = document.querySelector('.submit-word-btn');
    if (wordInput) wordInput.disabled = true;
    if (wordSubmitBtn) wordSubmitBtn.disabled = true;
}

// Generic timer function
function startTimer(seconds, startTime) {
    console.log('startTimer called for gameType:', gameType, 'seconds:', seconds);
    
    // Clear any existing timer first
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const timerEl = document.getElementById('timer');
    const endTime = startTime + (seconds * 1000);
    
    function updateTimer() {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        if (timerEl) {
            timerEl.textContent = remaining;
            
            if (remaining <= 5) {
                timerEl.style.color = '#ef4444';
                timerEl.style.animation = 'pulse 0.5s infinite';
            }
        }
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
            console.log('Timer hit zero! gameType:', gameType, 'wsState:', websocket?.readyState);
            
            // Disable all inputs universally
            disableAllInputs();
            
            // Trigger results calculation for closest_guess game
            if (gameType === 'closest_guess' && websocket && websocket.readyState === WebSocket.OPEN) {
                console.log('Closest Guess timer expired - sending timer_expired action');
                websocket.send(JSON.stringify({
                    action: 'timer_expired',
                    data: {
                        player_session_id: playerSession.id
                    }
                }));
            } else {
                console.log('Timer expired but not sending:', { gameType, wsReady: websocket?.readyState });
            }
        }
    }
    
    // Initial update
    updateTimer();
    
    // Update every 100ms for smooth countdown
    timerInterval = setInterval(updateTimer, 100);
}
